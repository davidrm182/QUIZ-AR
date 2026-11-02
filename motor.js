const SHEET_ID = "16L9GDzTaz04WeGMXCBzLlYans9Jm0Ys94txHpXz-uq8";
const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbymXsfKvSVAJtCtwfJYhZR_5LIgzbIdZCN4TvZsPx3TDVfccIcllsS-Jk_9qvwnBNkpYQ/exec"; 
const PIN_CORRECTO = "1989";

// --- CONFIGURACIÓ DEL SIMULACRO OFICIAL (Editable) ---
const PESOS_SIMULACRO = {
    "tg1": 4, "tg2": 3, "tg3": 4, "tg4": 3,
    "te1": 4, "te2": 4, "te3": 4, "te4": 3, "te5": 4,
    "te6": 2, "te7": 3, "te8": 3, "te9": 3, "te10": 4,
    "te11": 4, "te12": 3, "te13": 3, "te14": 3, "te15": 3,
    "te16": 3, "te17": 3, "te18": 3, "te19": 2, "te20": 2,
    "te21": 3
};

let preguntas = [];
let favoritosCloud = []; 
let cerebroSRS = JSON.parse(localStorage.getItem('cerebroSRS_Opos')) || {}; 
let indice = 0;
let aciertos = 0;
let fallos = 0;
let blancas = 0; 
let respondida = false;
let esSimulacroLargo = false; 

// --- CONSTANTS I ESTAT DEL SRS ---
const DIA = 24 * 60 * 60 * 1000;
const FACILIDAD_INICIAL = 2.5;
const FACILIDAD_MINIMA = 1.3;
const RECUPERACION_FACILIDAD = 0.05; // +0,05 per encert (a partir del 2n seguit) fins a tornar a 2,5

// Data de l'examen "AAAA-MM-DD" (PROVISIONAL: 9 de gener de 2027; canvia-la quan sigui oficial).
// Cap repàs s'ajorna més d'1/3 del temps que queda fins a l'examen. Amb null no hi ha topall.
const FECHA_EXAMEN = "2027-01-09";

const CLAVE_SRS = 'cerebroSRS_Opos';
const CLAVE_SRS_BACKUP = 'cerebroSRS_Opos_backup'; // còpia local abans de qualsevol purga
const CLAVE_PENDIENTE = 'cerebroSRS_pendiente_sync'; // '1' = hi ha repassos locals sense confirmar al núvol
const CLAVE_ULTIMO_SYNC = 'cerebroSRS_ultimo_sync'; // ms: tot el que hi havia en local abans d'aquest moment ja era al núvol
const MAX_PURGA_PCT = 0.25; // si una purga esborraria més d'aquest % del SRS (mínim 20), es cancel·la
let SYNC_ESPERA_MS = 15000; // com a màxim una sincronització cada 15 s mentre vas responent
let VERIFICACION_ESPERAS = [3000, 6000, 10000]; // quan es llegeix la núvol per confirmar el desat

let respuestasDadas = []; // índex de pregunta -> { elegida, acierto } | { blanca: true }
let ordenOpciones = [];   // índex de pregunta -> opcions ja barrejades
let opcionesActuales = [];
let versionSRS = 0;       // puja a cada canvi local del SRS
let syncEnCurso = false;
let timerSync = null;

// 1. LISTADO DE TEMAS COMPLETO
const TEMAS_GENERAL = [
    {id:"tg1",nombre:"1. Constitució i Estatut d'Autonomia"},
    {id:"tg2",nombre:"2. Organització Administració catalana"},
    {id:"tg3",nombre:"3. Procediment administratiu"},
    {id:"tg4",nombre:"4. Personal administracions públiques"}
];

const TEMAS_ESPECIFICO = [
    {id:"te1",nombre:"1. Departament d'Interior"},
    {id:"te2",nombre:"2. Agents Rurals policia judicial"},
    {id:"te3",nombre:"3. Activitat cinegètica"},
    {id:"te4",nombre:"4. Reglament d'armes"},
    {id:"te5",nombre:"5. Activitat piscícola"},
    {id:"te6",nombre:"6. Protecció animals"},
    {id:"te7",nombre:"7. Protecció fauna"},
    {id:"te8",nombre:"8. Espècies invasores"},
    {id:"te9",nombre:"9. Incendis forestals"},
    {id:"te10",nombre:"10. Infraestructures medi natural"},
    {id:"te11",nombre:"11. Gestió forestal"},
    {id:"te12",nombre:"12. Flora protegida"},
    {id:"te13",nombre:"13. Biodiversitat"},
    {id:"te14",nombre:"14. Espais naturals"},
    {id:"te15",nombre:"15. Ús recreatiu"},
    {id:"te16",nombre:"16. Patrimoni cultural"},
    {id:"te17",nombre:"17. Aigües"},
    {id:"te18",nombre:"18. Residus"},
    {id:"te19",nombre:"19. Activitats extractives"},
    {id:"te20",nombre:"20. Protecció civil"},
    {id:"te21",nombre:"21. Geografia Catalunya"}
];

function getNombreTema(id){
    const all = [...TEMAS_GENERAL, ...TEMAS_ESPECIFICO];
    const t = all.find(item => item.id === id);
    return t ? t.nombre : id;
}

// 2. LOGIN Y CARGA DE FAVORITOS / SRS DESDE LA NUBE
async function validarPin(){
    const input = document.getElementById("pin-input").value;
    const btn = document.querySelector("button[onclick='validarPin()']");
    if(input === PIN_CORRECTO){
        btn.innerText = "Sincronitzant...";
        btn.disabled = true;
        await cargarFavoritosDesdeCloud();
        purgarIdsDeTemasDesconocidos();
        document.getElementById("pantalla-bloqueo").classList.add("oculto");
        document.getElementById("contingut-protegit").classList.remove("oculto");
        generarChecks();
        // Si l'última sessió va quedar sense confirmar al núvol, es reintenta ara (en segon pla)
        if (haySyncPendiente()) sincronizarSRSCloud({ verificar: true });
    }else{
        document.getElementById("error-pin").classList.remove("oculto");
    }
}

// --- UTILITATS SRS ---
function guardarSRSLocal() { localStorage.setItem(CLAVE_SRS, JSON.stringify(cerebroSRS)); }
function haySyncPendiente() { return localStorage.getItem(CLAVE_PENDIENTE) === '1'; }
function marcarPendienteSync() { localStorage.setItem(CLAVE_PENDIENTE, '1'); }
function limpiarPendienteSync() { localStorage.removeItem(CLAVE_PENDIENTE); }
function leerUltimoSync() { const n = Number(localStorage.getItem(CLAVE_ULTIMO_SYNC)); return isNaN(n) ? 0 : n; }
function guardarUltimoSync(ms) { localStorage.setItem(CLAVE_ULTIMO_SYNC, String(ms)); }
function redondear2(n) { return Math.round(n * 100) / 100; }
function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

// Moment (ms) del darrer repàs d'una pregunta, deduït dels camps que ja es guarden:
// proximoRepaso = moment_del_repàs + intervalo·dies. Així no cal cap camp nou a l'Apps Script.
function ultimaActividad(stats) {
    if (!stats || !stats.proximoRepaso) return 0;
    return stats.proximoRepaso - (stats.intervalo || 0) * DIA;
}

function normalizarStats(s) {
    const num = (v, def) => { const n = Number(String(v).replace(',', '.')); return isNaN(n) ? def : n; };
    return {
        racha: num(s.racha, 0),
        facilidad: num(s.facilidad, FACILIDAD_INICIAL),
        intervalo: num(s.intervalo, 0),
        proximoRepaso: num(s.proximoRepaso, 0),
        fallosTotales: num(s.fallosTotales, 0)
    };
}

// Fusiona el SRS local amb el del núvol: per a cada pregunta guanya el repàs MÉS RECENT.
// Una entrada que només és en local pot ser (a) feina nova encara sense pujar, o (b) una entrada que ja
// s'havia pujat i després s'ha esborrat del núvol (pregunta eliminada, fila esborrada a mà...).
// Es distingeixen amb ultimoSync: si el seu darrer repàs és anterior a l'última sincronització confirmada,
// ja havia arribat al núvol, i que ara no hi sigui vol dir que s'ha esborrat → no es ressuscita.
// (Sense això, un equip desfasat tornava a pujar les files esborrades cada cop que entrava.)
function fusionarSRS(local, nube, ultimoSync = 0) {
    const resultado = {};
    const esborrades = [];
    let localGana = 0;
    const ids = new Set([...Object.keys(local || {}), ...Object.keys(nube || {})]);
    ids.forEach(id => {
        const l = local && local[id];
        const n = nube && nube[id] ? normalizarStats(nube[id]) : null;
        if (l && !n) {
            if (ultimoSync > 0 && ultimaActividad(l) <= ultimoSync) esborrades.push(id);
            else { resultado[id] = l; localGana++; }
        }
        else if (n && !l) { resultado[id] = n; }
        else if (ultimaActividad(l) > ultimaActividad(n)) { resultado[id] = l; localGana++; }
        else { resultado[id] = n; } // empat: mana el núvol, com abans
    });

    // Salvaguarda: si "esborraria" massa (p. ex. el núvol ha tornat dades parcials), es conserva tot
    const total = Object.keys(local || {}).length;
    let descartadas = esborrades.length;
    if (descartadas > Math.max(20, total * MAX_PURGA_PCT)) {
        console.warn(`Fusió: ${descartadas} de ${total} entrades locals semblen esborrades del núvol; per seguretat es conserven.`);
        esborrades.forEach(id => { resultado[id] = local[id]; localGana++; });
        descartadas = 0;
    }
    return { srs: resultado, localGana: localGana, descartadas: descartadas };
}

// Demana les dades a Apps Script (JSONP). Retorna les dades, o null si no hi ha connexió / error / timeout.
function pedirDatosNube(timeoutMs = 5000) {
    return new Promise((resolve) => {
        if (!navigator.onLine) { resolve(null); return; }

        const nombreFuncionCallback = 'callback_google_' + Math.floor(Math.random() * 1000000);
        const idScript = 'temp-script-' + nombreFuncionCallback;
        let timer = null;

        const limpiar = () => {
            clearTimeout(timer);
            delete window[nombreFuncionCallback];
            document.getElementById(idScript)?.remove();
        };

        timer = setTimeout(() => { limpiar(); resolve(null); }, timeoutMs);

        window[nombreFuncionCallback] = function(data) {
            limpiar();
            resolve(data === undefined ? null : data);
        };

        const script = document.createElement('script');
        script.id = idScript;
        script.src = URL_APPS_SCRIPT + "?callback=" + nombreFuncionCallback + "&t=" + Date.now();
        script.onerror = () => { limpiar(); resolve(null); };
        document.body.appendChild(script);
    });
}

async function cargarFavoritosDesdeCloud() {
    const datosLocalesFavs = localStorage.getItem('misFavoritosOpos');
    if (datosLocalesFavs) {
        try {
            favoritosCloud = JSON.parse(datosLocalesFavs);
            const contador = document.getElementById("count-favs");
            if (contador) contador.innerText = favoritosCloud.length;
        } catch(e) { console.error("Error llegint caché de favorits"); }
    }

    if (!navigator.onLine) {
        console.log("Modo avión detectado. Usando datos guardados localmente.");
        return;
    }

    const data = await pedirDatosNube(5000);
    if (data === null) return; // sense núvol: es treballa amb el que hi ha en local

    if (data && data.favoritos !== undefined) {
        favoritosCloud = data.favoritos;
        if (data.srs && Object.keys(data.srs).length > 0) {
            const antes = cerebroSRS;
            const fusion = fusionarSRS(antes, data.srs, leerUltimoSync());
            cerebroSRS = fusion.srs;
            if (fusion.descartadas > 0) {
                // còpia de seguretat de l'estat local anterior, per si de cas
                localStorage.setItem(CLAVE_SRS_BACKUP, JSON.stringify({ fecha: Date.now(), data: antes }));
                console.log(`Fusió: ${fusion.descartadas} entrades locals ja no existeixen al núvol i s'han descartat.`);
            }
            if (fusion.localGana > 0) marcarPendienteSync(); // el local té repassos que el núvol no té
            else guardarUltimoSync(Date.now());              // res de nou en local: en sincronia amb el núvol
        }
    } else {
        favoritosCloud = data || [];
    }

    localStorage.setItem('misFavoritosOpos', JSON.stringify(favoritosCloud));
    guardarSRSLocal();

    const contador = document.getElementById("count-favs");
    if (contador) contador.innerText = favoritosCloud.length;
}

// 3. GENERACIÓN DE INTERFAZ
function generarChecks(){
    const gen = document.getElementById("lista-general");
    const esp = document.getElementById("lista-especifico");
    if(!gen || !esp) return;
    gen.innerHTML = ""; esp.innerHTML = "";
    TEMAS_GENERAL.forEach(t=>{
        gen.innerHTML += `<label><input type="checkbox" class="tema-check gen" value="${t.id}">${t.nombre}</label>`;
    });
    TEMAS_ESPECIFICO.forEach(t=>{
        esp.innerHTML += `<label><input type="checkbox" class="tema-check esp" value="${t.id}">${t.nombre}</label>`;
    });
}

function seleccionar(estado,clase){
    document.querySelectorAll(".tema-check."+clase).forEach(cb=>cb.checked=estado);
}

// 4. CARGA DE PREGUNTAS Y CLUSTERIZACIÓN POR DIFICULTAD
async function fetchTextoConTimeout(url, ms = 12000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error("HTTP " + res.status);
        return await res.text();
    } finally {
        clearTimeout(t);
    }
}

// estricto = true: si la càrrega falla, LLANÇA l'error en lloc de tornar [] (ho usa el repàs intel·ligent,
// perquè "no s'ha pogut carregar" no es confongui amb "el tema no té preguntes" i s'esborri progrés).
async function cargarPreguntas(temaId, estricto = false){
    if (!navigator.onLine) {
        if (estricto) throw new Error("offline");
        alert("Necessites internet per descarregar temes nous. Les preferides sí que funcionen.");
        return [];
    }

    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&headers=1&sheet=${temaId}&t=` + Date.now();
    const intentos = estricto ? 2 : 1;
    let ultimoError = null;

    for (let n = 1; n <= intentos; n++) {
        try {
            const text = await fetchTextoConTimeout(url);
            const jsonText = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
            const json = JSON.parse(jsonText);
            if (json.status === 'error' || !json.table || !Array.isArray(json.table.rows)) {
                throw new Error("Resposta no vàlida per a " + temaId);
            }
            const rows = json.table.rows;
            const startIdx = (rows[0] && rows[0].c && rows[0].c[0] && rows[0].c[0].v === "Pregunta") ? 1 : 0;
            const dataRows = rows.slice(startIdx);

            return dataRows
                .map(r => {
                    if (!r || !r.c) return null;
                    return {
                        tema: getNombreTema(temaId),
                        id: r.c[7] ? String(r.c[7].v || "").trim() : "",
                        pregunta: r.c[0] ? String(r.c[0].v || "") : "",
                        a: r.c[1] ? String(r.c[1].v || "") : "",
                        b: r.c[2] ? String(r.c[2].v || "") : "",
                        c: r.c[3] ? String(r.c[3].v || "") : "",
                        d: r.c[4] ? String(r.c[4].v || "") : "",
                        correcta: r.c[5] ? String(r.c[5].v || "").toLowerCase().trim() : "",
                        extra: r.c[6] ? String(r.c[6].v || "") : ""
                    };
                })
                .filter(q => q && q.pregunta.length > 2);
        } catch (e) {
            ultimoError = e;
            if (n < intentos) await esperar(600);
        }
    }
    if (estricto) throw ultimoError;
    return [];
}

function obtenerDificultadPregunta(idPregunta) {
    const stats = cerebroSRS[idPregunta];
    if (!stats) return 'mitja';

    const fallos = stats.fallosTotales || 0;
    const racha = stats.racha || 0;
    const facilidad = stats.facilidad || FACILIDAD_INICIAL;

    // Acabada de fallar: sempre difícil
    if (racha === 0 && fallos > 0) return 'dificil';
    // Consolidada: 4+ encerts seguits perdonen l'historial de fallades (abans, 2 fallades = "difícil" per sempre)
    if (racha >= 4) return 'facil';
    if (racha >= 3 && fallos <= 1 && facilidad >= 2.2) return 'facil';
    // Reincident i encara sense consolidar
    if (racha <= 1 && fallos >= 2) return 'dificil';
    if (facilidad < 2.0 && racha < 3) return 'dificil';
    return 'mitja';
}

function filtrarPreguntasPorDificultad(listaTema, cantidad, nivel) {
    if (nivel === 'tots') {
        mezclar(listaTema);
        return listaTema.slice(0, cantidad);
    }

    let dificils = [];
    let facilsMitjanes = [];

    listaTema.forEach(q => {
        if (obtenerDificultadPregunta(q.id) === 'dificil') {
            dificils.push(q);
        } else {
            facilsMitjanes.push(q);
        }
    });

    mezclar(dificils);
    mezclar(facilsMitjanes);

    let quotaDificils = 0;

    if (nivel === 'dificil') {
        quotaDificils = Math.round(cantidad * 0.7);
        if (cantidad <= 2 && dificils.length > 0) quotaDificils = 1;
    } else if (nivel === 'mitja') {
        quotaDificils = Math.round(cantidad * 0.5);
    } else if (nivel === 'facil') {
        quotaDificils = Math.round(cantidad * 0.2);
    }

    let quotaFacils = cantidad - quotaDificils;

    let seleccioDificils = dificils.slice(0, quotaDificils);
    let seleccioFacils = facilsMitjanes.slice(0, quotaFacils);

    let seleccionadas = [...seleccioDificils, ...seleccioFacils];

    if (seleccionadas.length < cantidad) {
        let restants = listaTema.filter(q => !seleccionadas.includes(q));
        mezclar(restants);
        seleccionadas = [...seleccionadas, ...restants.slice(0, cantidad - seleccionadas.length)];
    }

    mezclar(seleccionadas);
    return seleccionadas.slice(0, cantidad);
}

async function prepararSimulacro(tipo, botonClicado, dificultad = 'tots') {
    esSimulacroLargo = (tipo === 'oficial'); 

    if (botonClicado) {
        botonClicado.innerText = "⏳ Carregant...";
    }

    const botones = document.querySelectorAll("#pantalla-inicio button");
    botones.forEach(b => b.disabled = true);

    preguntas = [];
    
    for (const [idTema, cantidadOriginal] of Object.entries(PESOS_SIMULACRO)) {
        let cantidad = cantidadOriginal;
        
        if (tipo === 'light') {
            cantidad = Math.ceil(cantidadOriginal / 2); 
        } else if (tipo === 'ultra') {
            cantidad = 1; 
        }

        if (cantidad > 0) {
            let listaTema = await cargarPreguntas(idTema); 
            if (listaTema.length > 0) {
                let seleccionadas = filtrarPreguntasPorDificultad(listaTema, cantidad, dificultad);
                preguntas = preguntas.concat(seleccionadas); 
            }
        }
    }
    
    if(preguntas.length === 0){ alert("Error al carregar"); location.reload(); return; }
    
    mezclar(preguntas);
    iniciarTest();
}

async function prepararQuiz(){
    esSimulacroLargo = false;
    const checks = document.querySelectorAll(".tema-check:checked");
    const temasSeleccionados = [...checks].map(t=>t.value);
    if(temasSeleccionados.length === 0){ alert("Tria algun tema"); return; }
    
    const btn = document.querySelector("button[onclick='prepararQuiz()']");
    btn.innerText = "Carregant..."; btn.disabled = true;

    preguntas = [];
    for(let id of temasSeleccionados){
        const lista = await cargarPreguntas(id);
        preguntas = preguntas.concat(lista);
    }
    
    if(preguntas.length === 0){ alert("Error al carregar"); location.reload(); return; }
    
    mezclar(preguntas);
    const cantidad = parseInt(document.getElementById("num-preguntas").value);
    preguntas = preguntas.slice(0, cantidad);
    iniciarTest();
}

function prepararQuizFavs(){
    esSimulacroLargo = false;
    if(favoritosCloud.length === 0){ alert("No tens preferides desades"); return; }
    preguntas = [...favoritosCloud];
    mezclar(preguntas);
    iniciarTest();
}

function iniciarTest(){
    indice = 0; aciertos = 0; fallos = 0; blancas = 0; respondida = false;
    respuestasDadas = []; ordenOpciones = []; opcionesActuales = [];
    document.getElementById("pantalla-inicio").classList.add("oculto");
    document.getElementById("pantalla-quiz").classList.remove("oculto");
    mostrarPregunta();
}

function mezclar(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

// 5. DINÁMICA DEL TEST Y ESTADÍSTICAS SRS VISUALES
function obtenerRespuestasMezcladas(q) {
    let opciones = [
        { texto: q.a, id: 'a' },
        { texto: q.b, id: 'b' },
        { texto: q.c, id: 'c' },
        { texto: q.d, id: 'd' }
    ].filter(o => o.texto);
    const idCorr = q.correcta;
    const textoCorr = q[idCorr];
    mezclar(opciones);
    return { opciones, textoCorr };
}

// Els comptadors es DERIVEN de les respostes donades
// (abans eren "++" i tornar enrere amb ⬅️ i recontestar duplicava encerts, errors i el repàs SRS).
function recalcularContadores() {
    aciertos = 0; fallos = 0; blancas = 0;
    respuestasDadas.forEach(r => {
        if (!r) return;
        if (r.blanca) blancas++;
        else if (r.acierto) aciertos++;
        else fallos++;
    });
}

function pintarResultado(idElegido, idCorrecto) {
    opcionesActuales.forEach((o, i) => {
        const btn = document.getElementById(`btn-opcion-${i}`);
        if (!btn) return;
        if (o.id === idCorrecto) btn.style.background = "#2e7d32";
        else if (o.id === idElegido) btn.style.background = "#c62828";
    });
}

function mostrarPregunta(){
    const q = preguntas[indice];

    // Les opcions es barregen només la 1a vegada: si tornes enrere, la pregunta es veu tal com la vas deixar
    if (!ordenOpciones[indice]) ordenOpciones[indice] = obtenerRespuestasMezcladas(q).opciones;
    opcionesActuales = ordenOpciones[indice];

    const previa = respuestasDadas[indice];
    respondida = !!(previa && !previa.blanca); // una pregunta ja contestada queda bloquejada

    recalcularContadores();
    const notaNum = ((aciertos - (fallos * 0.25)) / preguntas.length) * 10;
    const nota = Math.max(0, notaNum).toFixed(2).replace(".",",");

    let contadoresHTML = `<span style="color:#4CAF50">✅ ${aciertos}</span> | <span style="color:#f44336">❌ ${fallos}</span>`;
    if (esSimulacroLargo) {
        contadoresHTML += ` | <span style="color:#9e9e9e">⚪ ${blancas}</span>`;
    }

    let statsPregunta = cerebroSRS[q.id];
    let infoSRSHTML = "";

    if (!statsPregunta) {
        infoSRSHTML = `<div style="font-size:12px; color:#64b5f6; text-align:center; margin-bottom:10px; font-weight:bold; letter-spacing: 1px;">🆕 PREGUNTA NOVA</div>`;
    } else {
        let rachaTxt = statsPregunta.racha > 0 ? `🔥 ${statsPregunta.racha}` : `⚠️`;
        let fallosTxt = statsPregunta.fallosTotales > 0 ? ` | ❌ ${statsPregunta.fallosTotales} veg.` : ``;
        let intervaloTxt = ` | ⏳ +${statsPregunta.intervalo} dies`;

        infoSRSHTML = `<div style="font-size:11.5px; color:#b0bec5; text-align:center; margin-bottom:10px; font-weight:500;">
            ${rachaTxt}${fallosTxt}${intervaloTxt}
        </div>`;
    }

    document.getElementById("pregunta").innerHTML = `
        <div style="font-size:12px; color:#ffcc00; text-align:center; opacity:0.8; margin-bottom:5px;">${q.tema}</div>
        ${infoSRSHTML}
        <div style="font-size:14px; margin-bottom:15px; text-align:center;">
            ${indice + 1}/${preguntas.length} | ${contadoresHTML} | NOTA: ${nota}
        </div>
        <div style="text-align:center; font-size:18px; line-height:1.4;">${q.pregunta}</div>`;

    // El botó rep l'ÍNDEX de l'opció (abans rebia el text escapat dins de l'HTML i es trencava amb certs caràcters)
    let html = "";
    opcionesActuales.forEach((o, i) => {
        html += `<button id="btn-opcion-${i}" onclick="verificarRespuesta(${i})" style="width:100%; margin:8px 0; padding:18px; background:#3e3123; color:white; border-radius:12px; border:1px solid #5d4037; text-align:left; display:flex; justify-content:space-between; align-items:center;">
            <span class="texto-opcion" style="max-width:85%">${o.texto}</span><span id="icon-opcion-${i}"></span></button>`;
    });
    document.getElementById("opciones").innerHTML = html;

    document.getElementById("contenedor-controles").innerHTML = `
        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin-top:25px;">
            <button onclick="anterior()" style="padding:15px 0; background:#5d4037; border-radius:10px; font-size:20px;">⬅️</button>
            <button id="btn-fav" onclick="toggleFavoritoCloud()" style="padding:15px 0; background:#4a4a4a; border-radius:10px; font-size:20px; border:2px solid transparent;">⭐</button>
            <button id="btn-extra" onclick="mostrarInfoExtra()" disabled style="padding:15px 0; background:#5d4037; border-radius:10px; font-size:20px;">🔍</button>
            <button onclick="siguiente()" style="padding:15px 0; background:#ff9800; border-radius:10px; font-size:20px;">➡️</button>
        </div>`;
    actualizarBotonFav();

    if (respondida) {
        pintarResultado(previa.elegida, q.correcta);
        document.getElementById("btn-extra").disabled = false;
    }
}

function verificarRespuesta(indiceBoton) {
    if (respondida) return;
    const q = preguntas[indice];
    const opcion = opcionesActuales[indiceBoton];
    if (!opcion) return;
    respondida = true;

    const acierto = opcion.id === q.correcta;
    respuestasDadas[indice] = { elegida: opcion.id, acierto: acierto };
    recalcularContadores();
    pintarResultado(opcion.id, q.correcta);

    // Només es registra al SRS la 1a resposta: després la pregunta queda bloquejada
    actualizarSRS(q.id, acierto);
    document.getElementById("btn-extra").disabled = false;
}

// 6. FAVORITOS CLOUD
async function toggleFavoritoCloud(){
    const q = preguntas[indice];
    const btn = document.getElementById("btn-fav");
    const existe = favoritosCloud.some(f => f.pregunta === q.pregunta);
    const action = existe ? "remove" : "add";
    
    btn.innerText = "⏳"; btn.disabled = true;

    if (action === "add") favoritosCloud.push(q);
    else favoritosCloud = favoritosCloud.filter(f => f.pregunta !== q.pregunta);

    localStorage.setItem('misFavoritosOpos', JSON.stringify(favoritosCloud));

    if (navigator.onLine) {
        try {
            fetch(URL_APPS_SCRIPT, {
                method: "POST",
                mode: "no-cors",
                body: JSON.stringify({ action: action, pregunta: q })
            });
        } catch (e) { console.error("Error sincronitzant preferides", e); }
    }

    setTimeout(() => {
        actualizarBotonFav();
        const contador = document.getElementById("count-favs");
        if(contador) contador.innerText = favoritosCloud.length;
        btn.disabled = false;
    }, 500); 
}

function actualizarBotonFav(){
    const btn = document.getElementById("btn-fav");
    if(!btn || !preguntas[indice]) return;
    const existe = favoritosCloud.some(f => f.pregunta === preguntas[indice].pregunta);
    if (existe) {
        btn.style.border = "2px solid #ffcc00"; 
        btn.style.background = "#5d5d5d"; 
    } else {
        btn.style.border = "2px solid transparent";
        btn.style.background = "#4a4a4a";
    }
    btn.innerText = "⭐";
}

function anterior(){ if(indice > 0){ indice--; mostrarPregunta(); } }

function siguiente(){
    if(!respondida) {
        if (esSimulacroLargo) {
            if (!respuestasDadas[indice]) respuestasDadas[indice] = { blanca: true };
            recalcularContadores();
        } else {
            return alert("Respon primer");
        }
    }
    indice++;
    if(indice >= preguntas.length) final();
    else mostrarPregunta();
}

async function final(){
    document.getElementById("pantalla-quiz").classList.add("oculto");
    document.getElementById("pantalla-final").classList.remove("oculto");
    recalcularContadores();

    const nota = Math.max(0, ((aciertos - (fallos * 0.25)) / preguntas.length) * 10).toFixed(2).replace(".", ",");
    let extraHTML = "";
    if (esSimulacroLargo) extraHTML = ` | ⚪ ${blancas} en blanc`;

    document.getElementById("resultado").innerHTML = `
        <h2 style="color:#ff9800;">Resultat: ${nota}</h2>
        <p>✅ ${aciertos} correctes | ❌ ${fallos} errors${extraHTML}</p>
        <p id="msg-sync" style="font-size:13px; color:#64b5f6; margin-top:20px; font-weight:bold;">
            ⏳ Sincronitzant cervell amb el núvol...
        </p>`;

    // Missatge REAL: només diu "guardat" si la núvol ha confirmat els últims repassos
    const ok = await sincronizarSRSCloud({ verificar: true });
    const msg = document.getElementById("msg-sync");
    if (!msg) return;
    if (ok) {
        msg.innerHTML = "☁️ Progrés guardat i verificat al núvol!";
    } else if (!navigator.onLine) {
        msg.style.color = "#ffb74d";
        msg.innerHTML = "📴 Sense connexió: el progrés queda guardat al mòbil i es sincronitzarà en tornar a entrar amb connexió.";
    } else {
        msg.style.color = "#ffb74d";
        msg.innerHTML = "⚠️ No he pogut confirmar el desat al núvol. El progrés queda guardat al mòbil i es reintentarà en entrar.";
    }
}

// 7. --- ALGORITMO DE MEMORIA ESPACIADA (SRS) ---

// Topall d'interval segons la data de l'examen (si FECHA_EXAMEN està informada):
// cap repàs s'ajorna més d'1/3 del temps que queda, així cada pregunta es veu ~3 cops més abans de l'examen.
function intervaloMaximo(ara = Date.now()) {
    if (!FECHA_EXAMEN) return Infinity;
    const fin = new Date(FECHA_EXAMEN + "T09:00:00").getTime();
    const dias = Math.ceil((fin - ara) / DIA);
    if (isNaN(dias) || dias <= 0) return Infinity;
    return Math.max(1, Math.floor(dias / 3));
}

// Data efectiva del proper repàs aplicant el topall (sense modificar el que hi ha guardat:
// així també afecta els repassos que ja estaven programats a 95 o 238 dies).
function proximoEfectivo(stats, ara = Date.now()) {
    const tope = intervaloMaximo(ara);
    if (tope === Infinity || !stats.proximoRepaso) return stats.proximoRepaso;
    return Math.min(stats.proximoRepaso, ultimaActividad(stats) + tope * DIA);
}

// Quant de "tard" va un repàs respecte a l'interval que tenia (1 = ja ha passat un interval sencer de retard)
function urgenciaRepaso(stats, ara) {
    const retraso = ara - proximoEfectivo(stats, ara);
    return retraso / (Math.max(1, stats.intervalo || 1) * DIA);
}

function actualizarSRS(idPregunta, acertada) {
    if (!idPregunta) { console.warn("Pregunta sense ID, no es guarda al SRS."); return; }

    let stats = cerebroSRS[idPregunta] || { racha: 0, facilidad: FACILIDAD_INICIAL, intervalo: 0, proximoRepaso: 0, fallosTotales: 0 };

    if (acertada) {
        stats.racha++;
        if (stats.racha === 1) stats.intervalo = 1;
        else if (stats.racha === 2) stats.intervalo = 6;
        else stats.intervalo = Math.ceil(stats.intervalo * stats.facilidad);
        // La facilitat ara es RECUPERA a poc a poc (abans només baixava i quedava curta per sempre)
        if (stats.racha >= 2) stats.facilidad = Math.min(FACILIDAD_INICIAL, redondear2(stats.facilidad + RECUPERACION_FACILIDAD));
    } else {
        stats.racha = 0;
        stats.intervalo = 1;
        stats.facilidad = Math.max(FACILIDAD_MINIMA, redondear2(stats.facilidad - 0.2));
        stats.fallosTotales = (stats.fallosTotales || 0) + 1;
    }

    stats.intervalo = Math.min(stats.intervalo, intervaloMaximo());
    stats.proximoRepaso = Date.now() + (stats.intervalo * DIA);

    cerebroSRS[idPregunta] = stats;
    versionSRS++;
    guardarSRSLocal();
    marcarPendienteSync();
    programarSyncSRS();
}

// 8. --- CARGA DEL REPASO INTELIGENTE GLOBAL CON PURGA SEGURA ---

// Esborra del SRS només les preguntes que ja no existeixen en temes que s'han carregat BÉ.
// (Abans, un tema que fallava en carregar-se feia que tot el seu progrés es donés per "orfe" i s'esborrés també al núvol.)
function purgarHuerfanas(todasLasPreguntas, temasVerificados) {
    const idsValidos = new Set(todasLasPreguntas.map(q => q.id));
    const huerfanas = Object.keys(cerebroSRS).filter(id => {
        const tema = id.split('-')[0];
        return id && temasVerificados.has(tema) && !idsValidos.has(id);
    });
    if (huerfanas.length === 0) return;

    const total = Object.keys(cerebroSRS).length;
    if (huerfanas.length > Math.max(20, total * MAX_PURGA_PCT)) {
        console.warn(`Purga cancel·lada: s'esborrarien ${huerfanas.length} de ${total} entrades del SRS. Revisa el Sheet (IDs canviats?).`);
        return;
    }

    // Còpia de seguretat local abans d'esborrar res
    localStorage.setItem(CLAVE_SRS_BACKUP, JSON.stringify({ fecha: Date.now(), data: cerebroSRS }));
    huerfanas.forEach(id => delete cerebroSRS[id]);
    versionSRS++;
    guardarSRSLocal();
    marcarPendienteSync();
    sincronizarSRSCloud();
}

// Entrades del SRS que no pertanyen a cap dels 25 temes (p. ex. restes de "taav" d'una versió antiga amb
// tests aptitudinals): no poden ser mai preguntes del repàs, així que s'esborren en entrar, sense haver de
// descarregar res. Retorna quantes n'ha esborrat.
function purgarIdsDeTemasDesconocidos() {
    const validos = new Set([...TEMAS_GENERAL, ...TEMAS_ESPECIFICO].map(t => t.id));
    const sobrantes = Object.keys(cerebroSRS).filter(id => !validos.has(String(id).split('-')[0]));
    if (sobrantes.length === 0) return 0;

    const total = Object.keys(cerebroSRS).length;
    if (sobrantes.length > Math.max(20, total * MAX_PURGA_PCT)) {
        console.warn(`Neteja cancel·lada: s'esborrarien ${sobrantes.length} de ${total} entrades del SRS.`);
        return 0;
    }
    localStorage.setItem(CLAVE_SRS_BACKUP, JSON.stringify({ fecha: Date.now(), data: cerebroSRS }));
    sobrantes.forEach(id => delete cerebroSRS[id]);
    versionSRS++;
    guardarSRSLocal();
    marcarPendienteSync(); // així en entrar es puja ja neta al núvol
    return sobrantes.length;
}

async function prepararRepasoInteligente() {
    if (!navigator.onLine) {
        return alert("Necessites internet per descarregar tot el temari i analitzar-lo.");
    }

    const btn = document.getElementById("btn-srs");
    if(btn) { btn.innerText = "⏳ Analitzant 25 temes..."; btn.disabled = true; }
    const restaurarBoto = () => { if(btn) { btn.innerText = "🧠 Repàs Intel·ligent"; btn.disabled = false; } };

    const todosLosTemas = [...TEMAS_GENERAL, ...TEMAS_ESPECIFICO].map(t => t.id);

    try {
        // Mode estricte: un tema que falla ja no es confon amb un tema sense preguntes
        const resultados = await Promise.allSettled(todosLosTemas.map(id => cargarPreguntas(id, true)));

        let todasLasPreguntas = [];
        const temasVerificados = new Set();
        const temasFallidos = [];
        resultados.forEach((r, i) => {
            if (r.status === 'fulfilled' && r.value.length > 0) {
                temasVerificados.add(todosLosTemas[i]);
                todasLasPreguntas = todasLasPreguntas.concat(r.value);
            } else {
                temasFallidos.push(todosLosTemas[i]);
            }
        });

        if (temasVerificados.size === 0) throw new Error("Cap tema carregat");

        purgarHuerfanas(todasLasPreguntas, temasVerificados);

        const ara = Date.now();
        let pendientes = [];
        let nuevas = [];

        todasLasPreguntas.forEach(q => {
            const stats = cerebroSRS[q.id];
            if (!stats) {
                nuevas.push(q);
            } else if (proximoEfectivo(stats, ara) <= ara) {
                pendientes.push({ q: q, urgencia: urgenciaRepaso(stats, ara) });
            }
        });

        // Les 30 MÉS URGENTS (abans eren 30 a l'atzar de totes les pendents)
        pendientes.sort((a, b) => b.urgencia - a.urgencia);
        mezclar(nuevas);

        preguntas = [...pendientes.slice(0, 30).map(p => p.q), ...nuevas.slice(0, 10)];
        mezclar(preguntas);

        if (temasFallidos.length > 0) {
            alert(`⚠️ No s'han pogut carregar ${temasFallidos.length} temes (${temasFallidos.join(", ")}). El repàs va amb la resta i no s'ha esborrat res del teu progrés.`);
        }

        if (preguntas.length === 0) {
            alert("No tens res pendent per avui! Descansa una mica.");
            restaurarBoto();
            return;
        }

        esSimulacroLargo = false;
        iniciarTest();

    } catch (e) {
        alert("Error de connexió al carregar tot el temari.");
        restaurarBoto();
    }
}

// 9. --- SINCRONIZACIÓN EN LA NUBE DEL CEREBRO SRS ---

// Com a màxim una sincronització cada SYNC_ESPERA_MS mentre vas responent
// (abans només es feia en acabar el test: si el tancaves a mig camí, es perdia).
function programarSyncSRS() {
    if (timerSync) return;
    timerSync = setTimeout(() => { timerSync = null; sincronizarSRSCloud(); }, SYNC_ESPERA_MS);
}

// El POST "no-cors" no permet llegir la resposta; per saber si s'ha desat de debò,
// es llegeixen de la núvol els últims repassos i es comprova que hi són.
async function verificarSyncEnNube(instantanea) {
    const muestra = Object.keys(instantanea)
        .sort((a, b) => ultimaActividad(instantanea[b]) - ultimaActividad(instantanea[a]))
        .slice(0, 5);
    if (muestra.length === 0) return true;

    for (const espera of VERIFICACION_ESPERAS) {
        await esperar(espera);
        const data = await pedirDatosNube(6000);
        const srsNube = data && data.srs;
        if (srsNube && muestra.every(id => srsNube[id] && Math.abs(Number(srsNube[id].proximoRepaso) - instantanea[id].proximoRepaso) < 1000)) {
            return true;
        }
    }
    return false;
}

// Retorna true si el desat s'ha confirmat (verificar:true) o s'ha enviat (verificar:false).
async function sincronizarSRSCloud({ verificar = false } = {}) {
    if (!navigator.onLine) return false;

    if (syncEnCurso) {
        if (!verificar) { programarSyncSRS(); return false; }
        for (let i = 0; i < 100 && syncEnCurso; i++) await esperar(300);
        if (syncEnCurso) return false;
    }
    syncEnCurso = true;

    const versionEnviada = versionSRS;
    const instantanea = JSON.parse(JSON.stringify(cerebroSRS));
    const inicioSync = Date.now();

    try {
        await fetch(URL_APPS_SCRIPT, {
            method: "POST",
            mode: "no-cors",
            body: JSON.stringify({
                action: "sync_srs",
                data: JSON.stringify(instantanea)
            })
        });
        const confirmado = verificar ? await verificarSyncEnNube(instantanea) : true;
        if (verificar && confirmado) guardarUltimoSync(inicioSync); // tot el que és anterior a inicioSync ja és al núvol
        if (versionEnviada !== versionSRS) {
            programarSyncSRS(); // hi ha hagut repassos nous mentre s'enviava
        } else if (verificar && confirmado) {
            limpiarPendienteSync();
        }
        return confirmado;
    } catch (e) {
        console.error("Error sincronitzant SRS al núvol", e);
        return false;
    } finally {
        syncEnCurso = false;
    }
}

// En amagar la pestanya o canviar d'app, intenta enviar el que quedi pendent
document.addEventListener('visibilitychange', () => {
    if (document.hidden && haySyncPendiente() && !syncEnCurso) {
        clearTimeout(timerSync); timerSync = null;
        sincronizarSRSCloud();
    }
});

function mostrarInfoExtra() {
    const q = preguntas[indice];
    let contenido = q.extra ? q.extra : 'Sense informació extra per a aquesta pregunta.';
    contenido = contenido.replace(/\n/g, '<br>');
    // Celdes del Sheet amb cometes dobles (style=""...""): el navegador ignora l'estil i la imatge
    // surt a mida natural. Només es toquen valors d'atribut sense '=' ni cometes a dins.
    contenido = contenido.replace(/=""([^"<>=]*)""/g, '="$1"');

    let modal = document.getElementById('modal-extra');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-extra';
        modal.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:flex; justify-content:center; align-items:center; z-index:1000; padding:10px; box-sizing:border-box;";
        document.body.appendChild(modal);
    }

    // Les imatges sempre s'ajusten a la finestra (ample i alt), sense scroll i amb el botó Tancar visible.
    // !important perquè mani sobre qualsevol style inline de la cel·la.
    modal.innerHTML = `
        <style>
            #modal-extra img {
                display: block; margin: 0 auto;
                width: auto !important; height: auto !important;
                max-width: min(100%, calc(100vw - 52px)) !important;
                max-height: calc(100vh - 130px) !important;
                max-height: calc(100dvh - 130px) !important;
                object-fit: contain;
                border-radius: 6px; border: 1px solid #795548;
            }
        </style>
        <div style="box-sizing:border-box; display:flex; flex-direction:column; background:#2d241e; border:1px solid #5d4037; border-radius:14px; width:100%; min-width:0; max-width:600px; max-height:100%; padding:12px; color:white; box-shadow: 0 8px 25px rgba(0,0,0,0.6);">
            <div style="flex:1 1 auto; min-height:0; min-width:0; overflow:auto; -webkit-overflow-scrolling:touch; font-size:16px; line-height:1.6; margin-bottom:12px;">
                ${contenido}
            </div>
            <button onclick="document.getElementById('modal-extra').remove()" style="flex:none; margin:0; background:#ff9800; border:none; padding:14px 25px; border-radius:10px; color:white; font-weight:bold; cursor:pointer; width:100%; font-size:16px;">Tancar ✖️</button>
        </div>
    `;
}
window.onload = () => { generarChecks(); };
