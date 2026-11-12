/**
 * SIMULACRES OFICIALS · codi per afegir a l'Apps Script del QUIZ-AR
 * ----------------------------------------------------------------
 * Què fa: quan l'app envia un simulacre oficial acabat (action = "guardar_simulacre"),
 * l'escriu com una fila nova a la pestanya «Simulacres» del Sheet.
 *   - És idempotent: si l'app el reenvia, l'ID ja hi és i NO es duplica.
 *   - La data/hora es guarda en hora de Madrid (el Sheet està en una altra zona horària).
 *   - La columna «Nota» és una fórmula (mateixa que la de la fila 2), no un número fix.
 *
 * Com s'instal·la (5 minuts, des del PC):
 *   1. Obre el Sheet → Extensions → Apps Script.
 *   2. Enganxa TOT aquest fitxer en un fitxer nou (botó «+» → Script → nom «simulacres»).
 *   3. Al teu doPost(e) que ja existeix, afegeix aquestes 3 línies JUST DESPRÉS d'haver llegit
 *      el cos de la petició (on ja comproves action === 'sync_srs'):
 *
 *        if (accio === 'guardar_simulacre') {
 *          return guardarSimulacre_(JSON.parse(cos.data));
 *        }
 *
 *      (`accio` = la variable on ja tens l'action; `cos` = l'objecte JSON.parse(e.postData.contents).
 *       Si els teus noms són uns altres, fes servir els teus.)
 *   4. Desa → Implementar → Gestionar implementacions → ✏️ (editar) → Versió: «Nova versió» → Implementar.
 *      (Important: «Nova versió» sobre la MATEIXA implementació, perquè l'URL no canviï.)
 *   5. Al Sheet, pestanya «Config», canvia  sync_simulacres  de NO a SI.
 *
 * Prova ràpida sense l'app: a l'editor, executa  provaGuardarSimulacre()  → ha d'aparèixer una fila
 * nova a «Simulacres» (esborra-la després), i si la tornes a executar NO se'n crea una segona.
 */

var HOJA_SIMULACRES_ = 'Simulacres';
var ZONA_HORARIA_ = 'Europe/Madrid';

function guardarSimulacre_(f) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000); // evita que dos enviaments alhora escriguin la mateixa fila
  try {
    // Validació: res de la xarxa es dona per bo
    var id = String(f && f.id || '').trim();
    var ts = Number(f && f.ts), n = Number(f && f.n), ok = Number(f && f.ok), ko = Number(f && f.ko), bl = Number(f && f.bl);
    if (!/^[A-Za-z0-9_-]{3,40}$/.test(id) || !isFinite(ts) || !(n > 0) || n > 500 ||
        !isFinite(ok) || !isFinite(ko) || !isFinite(bl) || ok < 0 || ko < 0 || bl < 0 || ok + ko + bl !== n) {
      return resposta_({ ok: false, error: 'dades no vàlides' });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var hoja = ss.getSheetByName(HOJA_SIMULACRES_);
    if (!hoja) return resposta_({ ok: false, error: 'falta la pestanya ' + HOJA_SIMULACRES_ });

    // Idempotent: si l'ID ja hi és, no fem res
    var ultima = hoja.getLastRow();
    if (ultima >= 2) {
      var ids = hoja.getRange(2, 1, ultima - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) if (String(ids[i][0]).trim() === id) return resposta_({ ok: true, duplicat: true });
    }

    // Data i hora com a "rellotge de paret de Madrid" (el Sheet té una altra zona horària)
    var d = new Date(ts);
    var madrid = Utilities.formatDate(d, ZONA_HORARIA_, 'yyyy-MM-dd HH:mm:ss').split(/[- :]/).map(Number);
    var quan = new Date(madrid[0], madrid[1] - 1, madrid[2], madrid[3], madrid[4], madrid[5]);

    var fila = ultima + 1;
    hoja.getRange(fila, 1, 1, 12).setValues([[
      id, quan, ts,
      String(f.tipus || 'oficial'), String(f.dificultat || 'tots'), f.cegues ? 'SI' : 'NO',
      n, ok, ko, bl, '',
      f.perTema ? JSON.stringify(f.perTema) : ''
    ]]);
    hoja.getRange(fila, 2).setNumberFormat('dd/MM/yyyy HH:mm');
    // Nota (sintaxi US dins d'Apps Script, encara que el Sheet estigui en català)
    hoja.getRange(fila, 11).setFormula('=MAX(0,(H' + fila + '-I' + fila + '*0.25)/G' + fila + '*10)').setNumberFormat('0.00');
    return resposta_({ ok: true, fila: fila });
  } finally {
    lock.releaseLock();
  }
}

function resposta_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Només per provar des de l'editor d'Apps Script (esborra la fila de prova després)
function provaGuardarSimulacre() {
  var r = guardarSimulacre_({ id: 'prova-' + Math.floor(Date.now() / 60000), ts: Date.now(), tipus: 'oficial', dificultat: 'tots', cegues: true, n: 80, ok: 60, ko: 12, bl: 8, perTema: { tg1: [3, 1, 0] } });
  Logger.log(r.getContent());
}
