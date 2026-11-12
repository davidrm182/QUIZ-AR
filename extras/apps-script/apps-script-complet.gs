const SHEET_NAME = "DatosUsuario";
const SRS_SHEET_NAME = "SRS_Datos";

function doGet(e) {
  return manejarPeticion(e);
}

function doPost(e) {
  return manejarPeticion(e);
}

function manejarPeticion(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  var srsSheet = ss.getSheetByName(SRS_SHEET_NAME);
  if (!srsSheet) {
    srsSheet = ss.insertSheet(SRS_SHEET_NAME);
    srsSheet.getRange(1, 1, 1, 6).setValues([["ID", "Racha", "Facilidad", "Intervalo", "ProximoRepaso", "FallosTotales"]]);
  }

  var params = e && e.parameter ? e.parameter : {};
  if (e && e.postData && e.postData.contents) {
    try {
      var bodyJson = JSON.parse(e.postData.contents);
      params = Object.assign({}, params, bodyJson);
    } catch (err) {
      // body no era JSON válido, seguimos solo con e.parameter
    }
  }

  // SI LA ACCIÓN ES GUARDAR SRS (ahora fila por fila, indexado por ID)
  if (params.action === "sync_srs" && params.data) {
    var dataSRS = typeof params.data === "string" ? JSON.parse(params.data) : params.data;
    actualizarSRS_Datos(srsSheet, dataSRS);

    var callbackSync = params.callback;
    if (callbackSync) {
      return ContentService.createTextOutput(callbackSync + '({"status":"ok"})').setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput("OK");
  }

  // SI LA ACCIÓN ES GUARDAR UN SIMULACRO OFICIAL (pestaña «Simulacres»)
  if (params.action === "guardar_simulacre" && params.data) {
    var dataSim = typeof params.data === "string" ? JSON.parse(params.data) : params.data;
    return guardarSimulacre_(dataSim);
  }

  // SI LA ACCIÓN ES GUARDAR FAVORITAS (sin cambios)
  if ((params.action === "add" || params.action === "remove") && params.pregunta) {
    var favsData = sheet.getRange("A2").getValue();
    var favs = favsData ? JSON.parse(favsData) : [];
    var pregObj = typeof params.pregunta === "string" ? JSON.parse(params.pregunta) : params.pregunta;

    if (params.action === "add") {
      var existe = favs.some(function(f){ return f.pregunta === pregObj.pregunta; });
      if(!existe) favs.push(pregObj);
    } else {
      favs = favs.filter(function(f) { return f.pregunta !== pregObj.pregunta; });
    }
    sheet.getRange("A2").setValue(JSON.stringify(favs));
    return ContentService.createTextOutput("OK");
  }

  // LECTURA NORMAL (al iniciar sesión con PIN)
  var favsData = sheet.getRange("A2").getValue();
  var result = {
    favoritos: favsData ? JSON.parse(favsData) : [],
    srs: leerSRS_Datos(srsSheet)
  };

  var callback = params.callback;
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + JSON.stringify(result) + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

// Actualiza o inserta filas en SRS_Datos según el ID de cada pregunta
function actualizarSRS_Datos(sheet, dataSRS) {
  var lastRow = sheet.getLastRow();
  var idToRow = {};

  if (lastRow >= 2) {
    var idsExistentes = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    idsExistentes.forEach(function(fila, idx) {
      if (fila[0]) idToRow[fila[0]] = idx + 2;
    });
  }

  var nuevasFilas = [];
  Object.keys(dataSRS).forEach(function(id) {
    var s = dataSRS[id];
    var filaValores = [id, s.racha || 0, s.facilidad || 2.5, s.intervalo || 0, s.proximoRepaso || 0, s.fallosTotales || 0];

    if (idToRow[id]) {
      sheet.getRange(idToRow[id], 1, 1, 6).setValues([filaValores]);
    } else {
      nuevasFilas.push(filaValores);
    }
  });

  if (nuevasFilas.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, nuevasFilas.length, 6).setValues(nuevasFilas);
  }
}

// Reconstruye el objeto cerebroSRS a partir de las filas de SRS_Datos
function leerSRS_Datos(sheet) {
  var lastRow = sheet.getLastRow();
  var result = {};
  if (lastRow < 2) return result;

  var filas = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  filas.forEach(function(f) {
    if (!f[0]) return;
    result[f[0]] = {
      racha: f[1],
      facilidad: f[2],
      intervalo: f[3],
      proximoRepaso: f[4],
      fallosTotales: f[5]
    };
  });
  return result;
}

// =====================================================================
// SIMULACRES OFICIALS · escriu a la pestanya «Simulacres» el que envia l'app (action = "guardar_simulacre")
//   - Idempotent: si l'app reenvia un simulacre, l'ID ja hi és i NO es duplica.
//   - La data i l'hora es guarden en hora de Madrid, sigui quina sigui la zona horària del Sheet.
//   - La columna «Nota» és una fórmula (no un número fix).
// =====================================================================
var HOJA_SIMULACRES_ = 'Simulacres';
var ZONA_HORARIA_ = 'Europe/Madrid';

function guardarSimulacre_(f) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000); // evita que dos enviaments alhora escriguin la mateixa fila
  try {
    // Validació: res que vingui de fora es dona per bo
    var id = String((f && f.id) || '').trim();
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
      for (var i = 0; i < ids.length; i++) {
        if (String(ids[i][0]).trim() === id) return resposta_({ ok: true, duplicat: true });
      }
    }

    // Data i hora = "rellotge de paret" de Madrid, escrita com a número de data de Sheets
    // (així no depèn de la zona horària del Sheet ni de la de l'script).
    var p = Utilities.formatDate(new Date(ts), ZONA_HORARIA_, 'yyyy-MM-dd-HH-mm-ss').split('-').map(Number);
    var serial = Date.UTC(p[0], p[1] - 1, p[2], p[3], p[4], p[5]) / 86400000 + 25569;

    var fila = ultima + 1;
    hoja.getRange(fila, 1, 1, 12).setValues([[
      id, serial, ts,
      String(f.tipus || 'oficial'), String(f.dificultat || 'tots'), f.cegues ? 'SI' : 'NO',
      n, ok, ko, bl, '',
      f.perTema ? JSON.stringify(f.perTema) : ''
    ]]);
    hoja.getRange(fila, 2).setNumberFormat('dd/MM/yyyy HH:mm');
    // Nota = (correctes − errors/4) / preguntes × 10. Fórmula SENSE comes, punts ni noms de funció (ni MAX): així
    // s'entén igual amb el Sheet en català, castellà o anglès. (L'app ja limita la nota a 0; aquí només seria negativa
    // en un cas absurd, amb gairebé tot erroni.)
    hoja.getRange(fila, 11).setFormula('=(H' + fila + '-I' + fila + '/4)/G' + fila + '*10').setNumberFormat('0.00');
    return resposta_({ ok: true, fila: fila });
  } finally {
    lock.releaseLock();
  }
}

function resposta_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// PROVA des de l'editor (botó ▶ Executa amb aquesta funció triada). Escriu una fila de prova,
// comprova que reenviar-la no la duplica i l'esborra ella mateixa. Mira el resultat a «Registre d'execució».
function provaGuardarSimulacre() {
  var id = 'prova-' + Date.now();
  var dades = { id: id, ts: Date.now(), tipus: 'oficial', dificultat: 'tots', cegues: true, n: 80, ok: 60, ko: 12, bl: 8, perTema: { tg1: [3, 1, 0] } };
  var primera = JSON.parse(guardarSimulacre_(dades).getContent());
  var segona = JSON.parse(guardarSimulacre_(dades).getContent());
  var dolenta = JSON.parse(guardarSimulacre_({ id: id + 'x', ts: Date.now(), n: 80, ok: 60, ko: 12, bl: 9 }).getContent());
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_SIMULACRES_);
  var vist = '';
  if (primera.ok && primera.fila) {
    var v = hoja.getRange(primera.fila, 1, 1, 12).getDisplayValues()[0];
    vist = ' | fila ' + primera.fila + ': ' + v[0] + ' · ' + v[1] + ' · nota ' + v[10];
    hoja.deleteRow(primera.fila); // la fila de prova no es queda
  }
  var notaOk = /^7[.,]1[23]$/.test(vist.split('nota ')[1] || ''); // 60 ✓ i 12 ✗ sobre 80 → 7,125 → "7,13" (o "7.13")
  var tot = primera.ok === true && !primera.duplicat && segona.ok === true && segona.duplicat === true && dolenta.ok === false && notaOk;
  Logger.log((tot ? 'RESULTAT: OK ✅ (escriu, la nota es calcula, no duplica, rebutja dades dolentes, i la fila de prova ja s\'ha esborrat)'
                  : 'RESULTAT: FALLA ❌ ' + JSON.stringify([primera, segona, dolenta]) + ' nota ok? ' + notaOk) + vist);
}
