// =====================================================================
// DETALL DELS SIMULACRES OFICIALS · pestanya «SimulacresDetall» (1 fila = 1 pregunta)
// Rep el que envia l'app (action = "guardar_detall_simulacre") en acabar cada Simulacre Oficial.
//   - Idempotent: si l'app reenvia el detall d'un simulacre que ja hi és, NO es duplica.
//   - Tot es guarda com a TEXT PLA (així el gviz no es menja respostes que són números, com "3" o "1.000",
//     i res que comenci per "=" es converteix en fórmula).
//
// COM INSTAL·LAR-HO (un sol cop):
//   1) Enganxa TOT aquest bloc al final del codi de l'Apps Script del Sheet (Extensions → Apps Script).
//   2) Dins de manejarPeticion, just a sota del bloc de «guardar_simulacre», afegeix aquestes 4 línies:
//
//        if (params.action === "guardar_detall_simulacre" && params.data) {
//          var dataDet = typeof params.data === "string" ? JSON.parse(params.data) : params.data;
//          return guardarDetallSimulacre_(dataDet);
//        }
//
//   3) Desa, i Implementa → Gestiona les implementacions → ✏️ → Versió: «Versió nova» → Implementa
//      (així l'enllaç /exec és el mateix i l'app no s'ha de tocar).
//   4) (Opcional) Executa provaGuardarDetall i mira «Registre d'execució»: ha de sortir RESULTAT: OK.
//   5) A la pestanya Config, posa sync_detall = 1.
// =====================================================================
var HOJA_DETALL_ = 'SimulacresDetall';
var CAP_DETALL_ = ['Simulacre', 'Data i hora', 'Núm', 'ID pregunta', 'Tema', 'Tipus pregunta', 'Resultat',
                   'Marcada', 'Correcta', 'Ordre vist', 'Enunciat', 'Text marcada', 'Text correcta'];
var RESULTAT_DETALL_ = { ok: 'OK', ko: 'ERROR', bl: 'EN BLANC' };

function guardarDetallSimulacre_(d) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sim = String((d && d.sim) || '').trim();
    var ts = Number(d && d.ts);
    var files = d && d.files;
    if (!/^[A-Za-z0-9_-]{3,40}$/.test(sim) || !isFinite(ts) || !Array.isArray(files) || !files.length || files.length > 500) {
      return resposta_({ ok: false, error: 'dades no vàlides' });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var hoja = ss.getSheetByName(HOJA_DETALL_);
    if (!hoja) {
      hoja = ss.insertSheet(HOJA_DETALL_);
      hoja.getRange(1, 1, 1, CAP_DETALL_.length).setValues([CAP_DETALL_]).setFontWeight('bold');
      hoja.setFrozenRows(1);
    }

    // Idempotent: si el simulacre ja hi és, no es torna a escriure
    var ultima = hoja.getLastRow();
    if (ultima >= 2) {
      var ids = hoja.getRange(2, 1, ultima - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) {
        if (String(ids[i][0]).trim() === sim) return resposta_({ ok: true, duplicat: true });
      }
    }

    // Data i hora en hora de Madrid (igual que a «Simulacres»)
    var p = Utilities.formatDate(new Date(ts), ZONA_HORARIA_, 'yyyy-MM-dd-HH-mm-ss').split('-').map(Number);
    var serial = Date.UTC(p[0], p[1] - 1, p[2], p[3], p[4], p[5]) / 86400000 + 25569;

    var txt = function (v) {
      v = v == null ? '' : String(v);
      if (v.length > 5000) v = v.slice(0, 5000);
      return v.charAt(0) === '=' ? "'" + v : v;
    };
    var valores = files.map(function (f) {
      f = Array.isArray(f) ? f : [];
      return [sim, serial, String(Number(f[0]) || 0), txt(f[1]), txt(f[2]), txt(f[3]),
              RESULTAT_DETALL_[String(f[4])] || 'EN BLANC', txt(f[5]), txt(f[6]), txt(f[7]),
              txt(f[8]), txt(f[9]), txt(f[10])];
    });

    var fila = ultima + 1;
    var rango = hoja.getRange(fila, 1, valores.length, CAP_DETALL_.length);
    rango.setNumberFormat('@'); // text pla
    hoja.getRange(fila, 2, valores.length, 1).setNumberFormat('dd/MM/yyyy HH:mm');
    rango.setValues(valores);
    return resposta_({ ok: true, fila: fila, files: valores.length });
  } finally {
    lock.releaseLock();
  }
}

// PROVA des de l'editor: escriu un detall de prova, comprova que no es duplica i l'esborra.
function provaGuardarDetall() {
  var sim = 'prova-' + Date.now();
  var dades = { sim: sim, ts: Date.now(), files: [
    [1, 'te5-001', 'te5', 'Xifres', 'ok', 'b', 'b', 'cabd', 'Enunciat de prova', '3', '3'],
    [2, 'te9-002', 'te9', 'Terminis', 'ko', 'a', 'c', 'abcd', '=no ha de ser una fórmula', '1.000', '15 dies'],
    [3, 'tg1-003', 'tg1', '', 'bl', '', 'd', 'dcba', 'Una en blanc', '', 'Resposta']
  ] };
  var primera = JSON.parse(guardarDetallSimulacre_(dades).getContent());
  var segona = JSON.parse(guardarDetallSimulacre_(dades).getContent());
  var dolenta = JSON.parse(guardarDetallSimulacre_({ sim: 'x', ts: Date.now(), files: [] }).getContent());
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_DETALL_);
  var vist = [];
  if (primera.ok && primera.fila) {
    vist = hoja.getRange(primera.fila, 1, 3, CAP_DETALL_.length).getDisplayValues();
    hoja.deleteRows(primera.fila, 3); // les files de prova no es queden
  }
  var textOk = vist.length === 3 && vist[0][11] === '3' && vist[1][11] === '1.000' && vist[1][6] === 'ERROR' && vist[2][6] === 'EN BLANC' && vist[1][10].indexOf('no ha de ser') >= 0;
  var tot = primera.ok === true && !primera.duplicat && segona.duplicat === true && dolenta.ok === false && textOk;
  Logger.log(tot ? 'RESULTAT: OK ✅ (escriu, no duplica, rebutja dades dolentes, text pla correcte i les files de prova ja s\'han esborrat)'
                 : 'RESULTAT: FALLA ❌ ' + JSON.stringify([primera, segona, dolenta, vist]));
}
