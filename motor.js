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
let esSimulacroLargo = false; // simulacres i exàmens oficials: es poden deixar preguntes en blanc (i es compta "en blanc")
let modoCiegas = false; // simulacre "a cegues": sense correcció ni comptadors d'encerts/errors fins al final (només es veu el d'en blanc; només si s'activa a l'inici)

// --- INTERFÍCIE: opcions d'estudi, tema i icones (res d'això toca el SRS) ---
const MOSTRAR_LETRAS = true; // lletres A–D davant de cada opció (true/false)
const CLAVE_TEMA = 'cerebroTema';           // 'light' | 'dark'
const CLAVE_OPCION = 'cerebroOpc_';         // + infoSRS | cegues  ('1' / '0')
const OPCIONES_DEFECTO = { infoSRS: true, cegues: false };

const ICONOS = {
    check:    '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    x:        '<path d="M6 6l12 12M18 6 6 18"/>',
    circulo:  '<circle cx="12" cy="12" r="7"/>',
    racha:    '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 .3 1.3 1 2 2 2-1-3 0-5 1-8z"/>',
    reloj:    '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    nova:     '<path d="M12 4v4M12 16v4M4 12h4M16 12h4M7 7l2.5 2.5M14.5 14.5 17 17M17 7l-2.5 2.5M9.5 14.5 7 17"/>',
    aviso:    '<path d="M12 4 3 19.5h18z"/><path d="M12 10v4.5M12 17.5v.01"/>',
    atras:    '<path d="M19 12H5m6-6-6 6 6 6"/>',
    adelante: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    diana:    '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    floc:     '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5"/>',
    estrella: '<path d="m12 3.5 2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3.3 9.9l6-.9z"/>',
    lupa:     '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    ojo:      '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    ojoOff:   '<path d="M3 3l18 18"/><path d="M10.6 5.7A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3.2 3.9M6.6 6.9A16 16 0 0 0 2.5 12S6 18.5 12 18.5a9.5 9.5 0 0 0 4.2-1"/><path d="M9.9 10A2.8 2.8 0 0 0 14 14"/>',
    nube:     '<path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 10.5 3.75 3.75 0 0 1 17.25 18z"/><path d="m9.5 13.5 2 2 3.5-3.5"/>'
};
function ico(nombre) {
    return `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONOS[nombre] || ''}</svg>`;
}

function leerOpcion(nombre) {
    try {
        const v = localStorage.getItem(CLAVE_OPCION + nombre);
        if (v === '1') return true;
        if (v === '0') return false;
    } catch (e) {}
    return OPCIONES_DEFECTO[nombre];
}
function guardarOpcion(nombre, valor) {
    try { localStorage.setItem(CLAVE_OPCION + nombre, valor ? '1' : '0'); } catch (e) {}
    const caja = document.getElementById(nombre === 'infoSRS' ? 'opt-info-srs' : 'opt-cegues');
    if (caja) caja.checked = !!valor; // manté sincronitzat l'interruptor de l'inici
}
function iniciarOpciones() {
    const info = document.getElementById('opt-info-srs');
    const cegues = document.getElementById('opt-cegues');
    if (info) info.checked = leerOpcion('infoSRS');
    if (cegues) cegues.checked = leerOpcion('cegues');
    const sel = document.getElementById('selector-tipus');
    if (sel) sel.value = leerTipusTriat();
    const selP = document.getElementById('selector-prob');
    if (selP) selP.value = leerProbTriada();
}

// --- FILTRE PER TIPUS DE PREGUNTA (columna J «TipusPregunta» del Sheet) ---
// Només afecta el Repàs Intel·ligent i el test ràpid; els simulacres i els exàmens oficials no es filtren mai.
// El valor pot ser un tipus ("Xifres") o diversos separats per comes ("Xifres,Terminis"). Buit = tots.
const CLAVE_TIPUS = CLAVE_OPCION + 'tipus';
function leerTipusTriat() {
    try { return localStorage.getItem(CLAVE_TIPUS) || ''; } catch (e) { return ''; }
}
function guardarTipusTriat(valor) {
    try { localStorage.setItem(CLAVE_TIPUS, valor || ''); } catch (e) {}
}
function filtrarPorTipus(lista) {
    const triat = leerTipusTriat();
    if (!triat) return lista;
    const set = new Set(triat.split(',').map(t => t.trim().toLowerCase()).filter(Boolean));
    return lista.filter(q => set.has(String(q.tipusPregunta || '').toLowerCase()));
}
// --- FILTRE PER PROBABILITAT (columna K «Probabilitat» del Sheet) ---
// '' = totes · 'calentes' = només les que s'assemblen a preguntes d'examen oficial · 'sensefredes' = treu les improbables
const CLAVE_PROB = CLAVE_OPCION + 'prob';
function leerProbTriada() {
    try { return localStorage.getItem(CLAVE_PROB) || ''; } catch (e) { return ''; }
}
function guardarProbTriada(valor) {
    try { localStorage.setItem(CLAVE_PROB, valor || ''); } catch (e) {}
}
function nivelProb(q) { return String((q && q.probabilitat) || '').toLowerCase(); }
function filtrarPorProb(lista) {
    const triada = leerProbTriada();
    if (triada === 'calentes') return lista.filter(q => nivelProb(q) === 'calenta');
    if (triada === 'sensefredes') return lista.filter(q => nivelProb(q) !== 'freda');
    return lista;
}
// Tipus + probabilitat junts (és el que fan servir el repàs i el test ràpid)
function filtrarEstudio(lista) { return filtrarPorProb(filtrarPorTipus(lista)); }
function hayFiltroEstudio() { return !!leerTipusTriat() || !!leerProbTriada(); }
function nomFiltreEstudi() {
    const parts = [];
    if (leerTipusTriat()) parts.push(nomTipusTriat());
    const sel = document.getElementById('selector-prob');
    if (leerProbTriada() && sel && sel.selectedIndex >= 0) parts.push(sel.options[sel.selectedIndex].text);
    return parts.join(' + ');
}
// Marca de probabilitat a la targeta: 🎯 calenta (amb on ha sortit) · ❄ freda (improbable). Probable no porta res.
function marcaProbHTML(q) {
    const n = nivelProb(q);
    if (n === 'calenta') {
        const on = q.haSortit ? `ha sortit ${q.haSortit.replace(/,\s*/g, ' · ')}` : 'calenta';
        return `<div class="bocata c-calenta" aria-label="Pregunta calenta">` +
               `<span class="it">${ico('diana')}${on}</span></div>`;
    }
    if (n === 'freda') {
        return `<div class="bocata c-freda" aria-label="Pregunta freda"><span class="it">${ico('floc')}improbable</span></div>`;
    }
    return '';
}

function nomTipusTriat() {
    const sel = document.getElementById('selector-tipus');
    return sel && sel.selectedIndex >= 0 ? sel.options[sel.selectedIndex].text : leerTipusTriat();
}

function alternarTema() {
    const arrel = document.documentElement;
    const aClaro = arrel.getAttribute('data-theme') !== 'light';
    if (aClaro) arrel.setAttribute('data-theme', 'light'); else arrel.removeAttribute('data-theme');
    try { localStorage.setItem(CLAVE_TEMA, aClaro ? 'light' : 'dark'); } catch (e) {}
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', aClaro ? '#F6F7F3' : '#1E3A2B'); // color de la barra del navegador al mòbil
}

// Info SRS (ratxa, fallades, interval): visible, o amagada fins que es respon. Mai en mode a cegues.
function aplicarVisibilidadInfoSRS() {
    const verInfo = leerOpcion('infoSRS');
    const caja = document.getElementById('info-srs');
    if (caja) caja.classList.toggle('srs-oculta', !verInfo && !respondida);
    const ojo = document.getElementById('btn-ojo');
    if (ojo) {
        ojo.setAttribute('aria-pressed', verInfo ? 'true' : 'false');
        ojo.title = verInfo ? 'Amagar la info SRS fins a respondre' : 'Mostrar la info SRS abans de respondre';
        ojo.innerHTML = ico(verInfo ? 'ojo' : 'ojoOff');
    }
}
function alternarInfoSRS() {
    guardarOpcion('infoSRS', !leerOpcion('infoSRS'));
    aplicarVisibilidadInfoSRS();
}

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

// Lectura segura del núvol: abans d'ENVIAR res, el local s'ha de poder fusionar amb el núvol (guanya el repàs més recent).
// Si no, un dispositiu desactualitzat triaria preguntes amb ratxes velles i les tornaria a pujar.
let nubeFusionada = false;        // true quan en aquesta sessió s'ha llegit el núvol i fusionat amb el local
let ultimaLecturaNube = 0;        // ms de l'última lectura correcta
let sesionIniciada = false;       // true un cop entrat amb el PIN
let lecturaNubeEnCurso = null;    // promesa de la lectura en marxa (així mai n'hi ha dues alhora)
let LECTURA_NUBE_RAPIDA_MS = 5000;   // en entrar: com fins ara, sense fer esperar més
let LECTURA_NUBE_LENTA_MS = 15000;   // reintents en segon pla i abans d'enviar: més marge
let REINTENTOS_LECTURA_MS = [3000, 30000, 90000]; // esperes entre reintents en segon pla (després, en tornar la connexió o l'app)
let REFRESCO_AL_VOLVER_MS = 30 * 60 * 1000; // en tornar a l'app després de tant de temps, es llegeix el núvol de nou

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

// 1b. EXÀMENS OFICIALS (convocatòries anteriors, Model A: tots els models tenen les mateixes preguntes)
// Cada examen és una pestanya del Sheet (ex0124, ex0123, ex0422, ex0120) amb les columnes de sempre + Id, Microtema, Origen, Tipus.
// Tipus: "puntuable" | "substitueix" (reserva que entra en lloc d'una anul·lada: compta) | "reserva" (opcional: NO compta).
// Les anul·lades ja no hi són. Ids "exCCCC-NNN" amb el número original de pregunta (per això hi ha forats).
// IMPORTANT: NO són a TEMAS_GENERAL / TEMAS_ESPECIFICO a propòsit: així el Repàs Intel·ligent, els simulacres
// i el test ràpid no les carreguen mai, i actualizarSRS ignora els seus ids (l'examen no toca el progrés).
const EXAMENES_OFICIALES = [
    { id: "ex0124", nombre: "Convocatòria 01/24", detalle: "Model A · 8 reserves opcionals", pastilla: "80 preg." },
    { id: "ex0123", nombre: "Convocatòria 01/23", detalle: "Model A · 5 anul·lades · 3 reserves opcionals", pastilla: "80 preg." },
    { id: "ex0422", nombre: "Convocatòria 04/22", detalle: "Model A · 8 reserves opcionals", pastilla: "80 preg." },
    { id: "ex0120", nombre: "Convocatòria 01/20", detalle: "Lliure accés · 1 anul·lada · 7 reserves opcionals", pastilla: "80 preg." }
];
// null fora dels exàmens oficials. Dins: { id, nombre, reservas: [...opcionals], enReservas: bool }
let modoExamen = null;
const ES_ID_EXAMEN = /^ex\d{4}-\d+$/;

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
        cargarEnlaces(); // llista d'eines (Psicotècnics / Estudi); en segon pla, no frena l'entrada
        iniciarEstadisticas(); // estadístiques dels simulacres oficials (còpia local primer, Sheet en segon pla)
        sesionIniciada = true;
        actualizarAvisoNube();
        // Si en entrar no s'ha pogut llegir el núvol, es reintenta en segon pla (sense fer esperar l'entrada)
        if (!nubeFusionada) reintentarLecturaEnSegundoPlano();
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

// Retorna true si s'ha pogut llegir el núvol (i fusionar el SRS), false si no (sense connexió, error o temps esgotat).
async function cargarFavoritosDesdeCloud(timeoutMs = LECTURA_NUBE_RAPIDA_MS) {
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
        return false;
    }

    const data = await pedirDatosNube(timeoutMs);
    if (data === null) return false; // sense núvol: es treballa amb el que hi ha en local (i es reintentarà)

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

    nubeFusionada = true;
    ultimaLecturaNube = Date.now();
    actualizarAvisoNube();
    return true;
}

// Una sola lectura alhora: si ja n'hi ha una en marxa, tothom espera aquesta.
function asegurarLecturaNube(timeoutMs = LECTURA_NUBE_LENTA_MS) {
    if (nubeFusionada) return Promise.resolve(true);
    if (lecturaNubeEnCurso) return lecturaNubeEnCurso;
    lecturaNubeEnCurso = (async () => {
        try { return await cargarFavoritosDesdeCloud(timeoutMs); }
        catch (e) { console.warn("Error llegint el núvol", e); return false; }
        finally { lecturaNubeEnCurso = null; }
    })();
    return lecturaNubeEnCurso;
}

// En segon pla, amb més marge de temps; quan aconsegueix llegir-lo, puja el que hi hagi pendent.
let reintentandoLectura = false;
async function reintentarLecturaEnSegundoPlano() {
    if (reintentandoLectura) return;
    reintentandoLectura = true;
    try {
        for (const espera of REINTENTOS_LECTURA_MS) {
            if (nubeFusionada) return;
            await esperar(espera);
            if (nubeFusionada) return;
            if (await asegurarLecturaNube(LECTURA_NUBE_LENTA_MS)) { alPonerseAlDiaConLaNube(); return; }
        }
    } finally { reintentandoLectura = false; }
}

function alPonerseAlDiaConLaNube() {
    actualizarAvisoNube();
    if (haySyncPendiente()) sincronizarSRSCloud({ verificar: true });
}

// Avís a l'inici mentre el dispositiu no s'ha pogut posar al dia amb el núvol.
function actualizarAvisoNube() {
    const el = document.getElementById("aviso-nube");
    if (!el) return;
    if (!sesionIniciada || nubeFusionada) { el.classList.add("oculto"); return; }
    el.classList.remove("oculto");
    el.innerHTML = ico('aviso') + "<span>" + (navigator.onLine
        ? "No s'ha pogut llegir el núvol: les ratxes poden estar desactualitzades. Es torna a provar sol."
        : "Sense connexió: vas amb les ratxes guardades en aquest dispositiu. En tornar la connexió es posaran al dia soles.") + "</span>";
}

// En tornar la connexió, si encara no s'ha pogut llegir el núvol, es llegeix ara.
window.addEventListener('online', () => {
    if (!sesionIniciada) return;
    actualizarAvisoNube();
    if (!nubeFusionada) asegurarLecturaNube(LECTURA_NUBE_LENTA_MS).then(ok => { if (ok) alPonerseAlDiaConLaNube(); });
});
window.addEventListener('offline', () => actualizarAvisoNube());

// 3. GENERACIÓN DE INTERFAZ
function generarChecks(){
    const gen = document.getElementById("lista-general");
    const esp = document.getElementById("lista-especifico");
    if(!gen || !esp) return;
    gen.innerHTML = ""; esp.innerHTML = "";
    TEMAS_GENERAL.forEach(t=>{
        gen.innerHTML += `<label class="fila-tema"><input type="checkbox" class="tema-check gen" value="${t.id}"><span>${t.nombre}</span></label>`;
    });
    TEMAS_ESPECIFICO.forEach(t=>{
        esp.innerHTML += `<label class="fila-tema"><input type="checkbox" class="tema-check esp" value="${t.id}"><span>${t.nombre}</span></label>`;
    });
    actualizarContadoresTemas();
}

function seleccionar(estado,clase){
    document.querySelectorAll(".tema-check."+clase).forEach(cb=>cb.checked=estado);
    actualizarContadoresTemas();
}

// Els temaris van plegats: el comptador de cada capçalera (p. ex. "3/12") diu quants temes hi ha triats
function actualizarContadoresTemas() {
    for (const [clase, id] of [['gen', 'cont-sel-gen'], ['esp', 'cont-sel-esp']]) {
        const el = document.getElementById(id);
        if (!el) continue;
        const checks = document.querySelectorAll('.tema-check.' + clase);
        const triats = [...checks].filter(c => c.checked).length;
        el.textContent = `${triats}/${checks.length}`;
        el.classList.toggle('on', triats > 0);
    }
}
document.addEventListener('change', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('tema-check')) actualizarContadoresTemas();
});

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
                        extra: r.c[6] ? String(r.c[6].v || "") : "",
                        tipusPregunta: r.c[9] ? String(r.c[9].v || "").trim() : "", // columna J «TipusPregunta»
                        probabilitat: r.c[10] ? String(r.c[10].v || "").trim() : "", // columna K «Probabilitat» (Calenta/Probable/Freda)
                        haSortit: r.c[11] ? String(r.c[11].v || "").trim() : ""      // columna L «HaSortit» (01/23, 01/24…)
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

// Carrega UN examen oficial MANTENINT l'ordre de les files del Sheet (l'original de l'examen). Sempre en mode estricte:
// si falla, llança l'error (un examen carregat a mitges no serveix).
async function cargarExamen(examId) {
    if (!navigator.onLine) throw new Error("offline");
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&headers=1&sheet=${examId}&t=` + Date.now();
    let ultimoError = null;

    for (let n = 1; n <= 2; n++) {
        try {
            const text = await fetchTextoConTimeout(url);
            const jsonText = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
            const json = JSON.parse(jsonText);
            if (json.status === 'error' || !json.table || !Array.isArray(json.table.rows)) {
                throw new Error("Resposta no vàlida per a " + examId);
            }
            const celda = (r, i) => (r.c[i] && r.c[i].v != null) ? String(r.c[i].v) : "";

            // Es filtra pel format de l'Id (no per la posició): serveix tant si el gviz s'ha menjat la capçalera com si no
            return json.table.rows
                .filter(r => r && r.c)
                .map(r => {
                    const tipus = celda(r, 10).trim().toLowerCase() || "puntuable";
                    const origen = celda(r, 9).trim();
                    const sufijo = tipus === 'reserva' ? ' · reserva' : (tipus === 'substitueix' ? ' · reserva que entra' : '');
                    return {
                        tema: (origen || examId) + sufijo, // és el que es veu a dalt de cada pregunta
                        id: celda(r, 7).trim(),
                        pregunta: celda(r, 0),
                        a: celda(r, 1),
                        b: celda(r, 2),
                        c: celda(r, 3),
                        d: celda(r, 4),
                        correcta: celda(r, 5).toLowerCase().trim(),
                        extra: celda(r, 6),
                        tipus: tipus
                    };
                })
                .filter(q => ES_ID_EXAMEN.test(q.id) && q.pregunta.length > 2);
        } catch (e) {
            ultimoError = e;
            if (n < 2) await esperar(600);
        }
    }
    throw ultimoError;
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
    esSimulacroLargo = true; // tots els simulacres (Oficial, Light i Ultra) es poden deixar en blanc, com un examen real
    modoCiegas = leerOpcion('cegues'); // només els simulacres (i els exàmens oficials) poden anar a cegues
    modoExamen = null;
    simulacroActual = { tipus: tipo, dificultat: dificultad }; // si és l'Oficial, en acabar es registra a les estadístiques

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
    modoCiegas = false;
    modoExamen = null;
    simulacroActual = null;
    const checks = document.querySelectorAll(".tema-check:checked");
    const temasSeleccionados = [...checks].map(t=>t.value);
    if(temasSeleccionados.length === 0){
        // els temaris van plegats: s'obren perquè es vegi on triar
        ["det-general", "det-especifico"].forEach(id => { const d = document.getElementById(id); if (d) d.open = true; });
        alert("Tria algun tema");
        return;
    }
    
    const btn = document.querySelector("button[onclick='prepararQuiz()']");
    btn.innerText = "Carregant..."; btn.disabled = true;

    preguntas = [];
    for(let id of temasSeleccionados){
        const lista = await cargarPreguntas(id);
        preguntas = preguntas.concat(lista);
    }
    
    if(preguntas.length === 0){ alert("Error al carregar"); location.reload(); return; }

    preguntas = filtrarEstudio(preguntas);
    if(preguntas.length === 0){
        alert(`Als temes triats no hi ha cap pregunta de «${nomFiltreEstudi()}».`);
        btn.innerText = "comencem test ràpid"; btn.disabled = false;
        return;
    }
    
    mezclar(preguntas);
    const cantidad = parseInt(document.getElementById("num-preguntas").value);
    preguntas = preguntas.slice(0, cantidad);
    iniciarTest();
}

function prepararQuizFavs(){
    esSimulacroLargo = false;
    modoCiegas = false;
    modoExamen = null;
    simulacroActual = null;
    if(favoritosCloud.length === 0){ alert("No tens preferides desades"); return; }
    preguntas = [...favoritosCloud];
    mezclar(preguntas);
    iniciarTest();
}

// --- EXÀMENS OFICIALS: pantalla de selecció, càrrega i reserves ---
function generarExamenes() {
    // Comptador del botó "Exàmens oficials" de l'inici: surt de la llista, així no queda desfasat quan s'afegeix un examen
    const contador = document.querySelector("#btn-examens .contador");
    if (contador) contador.textContent = EXAMENES_OFICIALES.length;
    const cont = document.getElementById("lista-examenes");
    if (!cont) return;
    const iconoDoc = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/></svg>';
    cont.innerHTML = EXAMENES_OFICIALES.map(ex => `
        <button class="btn btn-moss btn-examen" onclick="prepararExamen('${ex.id}', this)">
            <span class="btn-izq">${iconoDoc}<span class="nom-examen">${ex.nombre}<small>${ex.detalle}</small></span></span>
            <span class="pastilla">${ex.pastilla}</span>
        </button>`).join("");
}

function abrirExamenes() {
    document.getElementById("pantalla-inicio").classList.add("oculto");
    document.getElementById("pantalla-examens").classList.remove("oculto");
    window.scrollTo(0, 0);
}

function cerrarExamenes() {
    document.getElementById("pantalla-examens").classList.add("oculto");
    document.getElementById("pantalla-inicio").classList.remove("oculto");
    window.scrollTo(0, 0);
}

// --- EINES INTERACTIVES (Psicotècnics / Estudi) ---
// La llista surt de la pestanya "Enllaços" del Sheet: una fila = una eina. Afegir-ne, treure'n (Actiu = NO) o
// reordenar-ne (Ordre) es fa al Sheet, sense tocar el codi. No toca res del SRS ni de la sincronització.
// Columnes: Pantalla | Secció | Emoji | Títol | Nota | Link | Ordre | Actiu | Destacat
const HOJA_ENLACES = 'Enllaços';
const CLAVE_ENLACES = 'cerebroEnlaces_v1';
const UMBRAL_DESPLEGAT = 12; // fins a aquest nombre d'eines a una pantalla, totes les seccions surten obertes
const ICONO_ENLACE = '<svg class="ar" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';
const ICONO_CHEVRON = '<svg class="ch" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
let enlaces = [];            // eines ja filtrades i ordenades
let enlacesCargados = false; // true quan hi ha dades (còpia local o Sheet)
let enlacesError = false;    // true si no hi ha dades ni s'han pogut baixar

function escapeHTML(t) {
    return String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// "Psicotècnics" / "psicotecnics" -> 'psico'; "Estudi" -> 'estudi'; qualsevol altra cosa -> null (s'ignora)
function clavePantallaEnlace(txt) {
    const t = String(txt || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    if (t.startsWith('psico')) return 'psico';
    if (t.startsWith('estud')) return 'estudi';
    return null;
}

// filas = files "crues" del gviz. Es queden només les actives amb pantalla coneguda, títol i link http(s).
function normalizarEnlaces(filas) {
    const celda = (r, i) => (r.c && r.c[i] && r.c[i].v != null) ? String(r.c[i].v).trim() : '';
    const NO = /^(no|n|false|0|x|-)$/i;
    const SI = /^(si|sí|s|yes|y|true|1)$/i;
    return filas
        .filter(r => r && r.c)
        .map((r, pos) => {
            const orden = parseFloat(celda(r, 6).replace(',', '.'));
            return {
                clave: clavePantallaEnlace(celda(r, 0)),
                seccion: celda(r, 1), emoji: celda(r, 2), titulo: celda(r, 3), nota: celda(r, 4), url: celda(r, 5),
                orden: isNaN(orden) ? Infinity : orden,
                activo: !NO.test(celda(r, 7)),
                destacada: SI.test(celda(r, 8)),
                pos: pos
            };
        })
        .filter(e => e.clave && e.titulo && /^https?:\/\//i.test(e.url) && e.activo)
        .sort((a, b) => (a.orden === b.orden ? a.pos - b.pos : a.orden - b.orden));
}

function leerEnlacesLocal() {
    try {
        const j = JSON.parse(localStorage.getItem(CLAVE_ENLACES));
        return (j && Array.isArray(j.enlaces)) ? j.enlaces : null;
    } catch (e) { return null; }
}
function guardarEnlacesLocal(lista) {
    try { localStorage.setItem(CLAVE_ENLACES, JSON.stringify({ ts: Date.now(), enlaces: lista })); } catch (e) { /* sense espai: no passa res */ }
}

async function pedirEnlaces() {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&headers=1&sheet=${encodeURIComponent(HOJA_ENLACES)}&t=` + Date.now();
    const text = await fetchTextoConTimeout(url);
    const json = JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));
    if (json.status === 'error' || !json.table || !Array.isArray(json.table.rows)) {
        throw new Error("Resposta no vàlida per a " + HOJA_ENLACES);
    }
    return normalizarEnlaces(json.table.rows);
}

// Primer pinta la còpia guardada (surt a l'instant i també sense cobertura) i després la refresca des del Sheet.
// Si el Sheet falla, es queda l'última còpia bona: mai es buida la llista per un error de xarxa.
async function cargarEnlaces() {
    enlacesError = false;
    const local = leerEnlacesLocal();
    if (local) { enlaces = local; enlacesCargados = true; }
    pintarEnlaces();
    if (!navigator.onLine) { enlacesError = !enlacesCargados; pintarEnlaces(); return; }
    try {
        enlaces = await pedirEnlaces();
        enlacesCargados = true;
        guardarEnlacesLocal(enlaces);
    } catch (e) {
        console.warn("No s'han pogut carregar les eines", e);
        enlacesError = !enlacesCargados; // només es mostra l'error si no tenim cap còpia
    }
    pintarEnlaces();
}

function htmlEina(e, destacada) {
    const nota = e.nota ? `<small>${escapeHTML(e.nota)}</small>` : '';
    return `<a class="hb-item${destacada ? ' top' : ''}" href="${escapeHTML(e.url)}" target="_blank" rel="noopener noreferrer">` +
        `<span class="em">${escapeHTML(e.emoji || '🔗')}</span><span class="tx">${escapeHTML(e.titulo)}${nota}</span>${ICONO_ENLACE}</a>`;
}

function pintarEnlaces() {
    for (const clave of ['psico', 'estudi']) {
        const cont = document.getElementById('lista-' + clave);
        const contador = document.getElementById('cont-' + clave);
        const nota = document.getElementById('nota-' + clave);
        const lista = enlaces.filter(e => e.clave === clave);
        const cuantas = lista.length === 1 ? '1 eina' : `${lista.length} eines`;
        if (contador) contador.textContent = enlacesCargados ? cuantas : '';
        if (nota) nota.textContent = enlacesCargados ? `${cuantas} · s’obren en una pestanya nova` : '';
        if (!cont) continue;

        if (!enlacesCargados) {
            cont.innerHTML = enlacesError
                ? `<p class="hb-nota">No s’ha pogut carregar la llista d’eines. ` +
                  `<button type="button" class="btn-mini" onclick="cargarEnlaces()">Torna-ho a provar</button></p>`
                : '<p class="hb-nota">Carregant eines…</p>';
            continue;
        }
        if (!lista.length) {
            cont.innerHTML = '<p class="hb-nota">Encara no hi ha cap eina aquí. Afegeix files a la pestanya «Enllaços» del Sheet.</p>';
            continue;
        }

        // destacades a dalt (sense secció); la resta, per seccions en l'ordre en què apareixen
        const destacades = lista.filter(e => e.destacada);
        const secciones = [];
        for (const e of lista.filter(e => !e.destacada)) {
            const nombre = e.seccion || 'Altres';
            let sec = secciones.find(s => s.nombre === nombre);
            if (!sec) { sec = { nombre: nombre, items: [] }; secciones.push(sec); }
            sec.items.push(e);
        }
        const desplegarTodas = lista.length <= UMBRAL_DESPLEGAT;
        let html = '';
        if (destacades.length) html += `<div class="hb-list">${destacades.map(e => htmlEina(e, true)).join('')}</div>`;
        secciones.forEach((sec, i) => {
            html += `<details class="hb-det"${(desplegarTodas || i === 0) ? ' open' : ''}>` +
                `<summary>${escapeHTML(sec.nombre)}<span class="n">${sec.items.length}</span>${ICONO_CHEVRON}</summary>` +
                `<div class="hb-list">${sec.items.map(e => htmlEina(e, false)).join('')}</div></details>`;
        });
        cont.innerHTML = html;
    }
}

function abrirEines(clave) {
    document.getElementById("pantalla-inicio").classList.add("oculto");
    document.getElementById("pantalla-eines-" + clave).classList.remove("oculto");
    window.scrollTo(0, 0);
}

function cerrarEines() {
    document.querySelectorAll('[id^="pantalla-eines-"]').forEach(p => p.classList.add("oculto"));
    document.getElementById("pantalla-inicio").classList.remove("oculto");
    window.scrollTo(0, 0);
}

// Replica l'examen tal com va ser: ordre original de les preguntes (cap mezclar) i opcions en l'ordre original
// (obtenerRespuestasMezcladas no les barreja si modoExamen). Es poden deixar en blanc (com esSimulacroLargo) i,
// si tens activat "Simulacres a cegues", també van sense correcció fins al final.
async function prepararExamen(examId, botonClicado) {
    const ex = EXAMENES_OFICIALES.find(e => e.id === examId);
    if (!ex) return;
    if (!navigator.onLine) return alert("Necessites internet per descarregar l'examen.");

    const botones = document.querySelectorAll("#pantalla-examens button");
    const htmlOriginal = botonClicado ? botonClicado.innerHTML : "";
    botones.forEach(b => b.disabled = true);
    if (botonClicado) botonClicado.innerText = "⏳ Carregant...";
    const restaurar = () => {
        if (botonClicado) botonClicado.innerHTML = htmlOriginal;
        botones.forEach(b => b.disabled = false);
    };

    try {
        const filas = await cargarExamen(examId);
        const principales = filas.filter(q => q.tipus !== 'reserva');  // puntuables + reserves que entren (compten)
        const reservas = filas.filter(q => q.tipus === 'reserva');     // opcionals: es veuen a part i no compten
        if (principales.length === 0) throw new Error("Examen buit");

        preguntas = principales;
        modoExamen = { id: ex.id, nombre: ex.nombre, reservas: reservas, enReservas: false };
        esSimulacroLargo = true;
        modoCiegas = leerOpcion('cegues');
        simulacroActual = null;
        restaurar();
        iniciarTest();
    } catch (e) {
        console.error("Error carregant l'examen", examId, e);
        alert("No he pogut carregar l'examen. Comprova la connexió i torna-ho a provar.");
        restaurar();
    }
}

// Bloc de reserves opcionals (les que NO han entrat): mateixes regles, però sense nota
function iniciarReservasExamen() {
    if (!modoExamen || modoExamen.reservas.length === 0) return;
    preguntas = modoExamen.reservas;
    modoExamen.enReservas = true;
    document.getElementById("pantalla-final").classList.add("oculto");
    iniciarTest();
}

function iniciarTest(){
    indice = 0; aciertos = 0; fallos = 0; blancas = 0; respondida = false;
    respuestasDadas = []; ordenOpciones = []; opcionesActuales = [];
    document.getElementById("pantalla-inicio").classList.add("oculto");
    const pantallaExamens = document.getElementById("pantalla-examens");
    if (pantallaExamens) pantallaExamens.classList.add("oculto");
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
    if (!modoExamen) mezclar(opciones); // exàmens oficials: opcions en l'ordre original A-B-C-D
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
    // En revelar acert/error, la resta d'opcions s'apaguen perquè el resultat es vegi d'un cop d'ull (a cegues no es revela res)
    const contenedor = document.getElementById("opciones");
    if (contenedor) contenedor.classList.toggle('revelado', !modoCiegas);
    opcionesActuales.forEach((o, i) => {
        const btn = document.getElementById(`btn-opcion-${i}`);
        if (!btn) return;
        const icono = document.getElementById(`icon-opcion-${i}`);
        btn.classList.remove('ok', 'ko', 'elegida');
        if (icono) icono.innerHTML = "";
        // A cegues no es revela res: només es marca quina has triat
        if (modoCiegas) {
            if (o.id === idElegido) btn.classList.add('elegida');
            return;
        }
        if (o.id === idCorrecto) { btn.classList.add('ok'); if (icono) icono.innerHTML = ico('check'); }
        else if (o.id === idElegido) { btn.classList.add('ko'); if (icono) icono.innerHTML = ico('x'); }
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

    // Comptadors i nota: a cegues no es mostren fins al final
    let contadoresHTML, notaHTML = "";
    if (modoCiegas) {
        // L'únic comptador visible a cegues és el d'en blanc: només diu quantes n'has deixat, no revela cap encert ni error
        const enBlanc = esSimulacroLargo ? `<span class="it" aria-label="En blanc">${ico('circulo')}${blancas}</span>` : "";
        contadoresHTML = `<div class="bocata c-info"><span class="it">${ico('ojoOff')}a cegues</span>${enBlanc}</div>`;
    } else {
        let its = `<span class="it c-ok" aria-label="Encerts">${ico('check')}${aciertos}</span><span class="it c-ko" aria-label="Errors">${ico('x')}${fallos}</span>`;
        if (esSimulacroLargo) its += `<span class="it c-neutro" aria-label="En blanc">${ico('circulo')}${blancas}</span>`;
        contadoresHTML = `<div class="bocata">${its}</div>`;
        // Reserves opcionals d'un examen: no compten a la nota
        notaHTML = (modoExamen && modoExamen.enReservas)
            ? `<span class="q-nota">no compta</span>`
            : `<span class="q-nota">nota <b>${nota}</b></span>`;
    }

    // Info del SRS (ratxa, fallades, interval): es pot amagar fins a respondre; a cegues no hi és.
    // Als exàmens oficials tampoc: no toquen el SRS, així que no hi ha res a mostrar.
    let infoSRSHTML = "";
    if (!modoCiegas && !modoExamen) {
        const statsPregunta = cerebroSRS[q.id];
        if (!statsPregunta) {
            infoSRSHTML = `<div id="info-srs" class="bocata c-info"><span class="it">${ico('nova')}pregunta nova</span></div>`;
        } else {
            const rachaIt = statsPregunta.racha > 0
                ? `<span class="it c-racha" aria-label="Ratxa">${ico('racha')}${statsPregunta.racha}</span>`
                : `<span class="it c-ko" aria-label="Sense ratxa">${ico('aviso')}</span>`;
            const fallosIt = statsPregunta.fallosTotales > 0
                ? `<span class="it c-ko" aria-label="Fallades">${ico('x')}${statsPregunta.fallosTotales}</span>` : ``;
            const intervaloIt = `<span class="it c-dies" aria-label="Pròxim repàs">${ico('reloj')}+${statsPregunta.intervalo}</span>`;
            infoSRSHTML = `<div id="info-srs" class="bocata">${rachaIt}${fallosIt}${intervaloIt}</div>`;
        }
    }

    // Probabilitat (no és SRS: no s'amaga amb l'ull). A cegues i als exàmens oficials no es mostra.
    const marcaProb = (modoCiegas || modoExamen) ? '' : marcaProbHTML(q);
    const claseProb = marcaProb ? (nivelProb(q) === 'calenta' ? 'q-calenta' : 'q-freda') : '';
    const cajaPregunta = document.getElementById("pregunta");
    cajaPregunta.classList.remove('q-calenta', 'q-freda');
    if (claseProb) cajaPregunta.classList.add(claseProb);

    const botoOjo = (modoCiegas || modoExamen) ? `<span></span>` : `<button id="btn-ojo" class="ojo" onclick="alternarInfoSRS()" aria-pressed="true"></button>`;
    const progreso = Math.round(((indice + 1) / preguntas.length) * 100);

    document.getElementById("pregunta").innerHTML = `
        <div class="q-top"><span></span><span class="q-tema">${q.tema}</span>${botoOjo}</div>
        <div class="q-prog"><span class="q-num">${indice + 1}<span> / ${preguntas.length}</span></span>${notaHTML}</div>
        <div class="barra"><div style="width:${progreso}%"></div></div>
        <div class="marcadors">${contadoresHTML}${infoSRSHTML}</div>
        ${marcaProb ? `<div class="marca-prob">${marcaProb}</div>` : ''}
        <p class="q-texto">${q.pregunta}</p>`;

    // El botó rep l'ÍNDEX de l'opció (abans rebia el text escapat dins de l'HTML i es trencava amb certs caràcters)
    let html = "";
    opcionesActuales.forEach((o, i) => {
        const letra = MOSTRAR_LETRAS ? `<span class="letra">${"ABCD"[i] || ""}</span>` : "";
        html += `<button id="btn-opcion-${i}" class="opcion" onclick="verificarRespuesta(${i})">${letra}<span class="texto-opcion op-texto">${o.texto}</span><span id="icon-opcion-${i}" class="op-icono"></span></button>`;
    });
    document.getElementById("opciones").innerHTML = html;
    document.getElementById("opciones").classList.remove('revelado');

    document.getElementById("contenedor-controles").innerHTML = `
        <div class="controles">
            <button class="ctl" onclick="anterior()" aria-label="Anterior">${ico('atras')}</button>
            <button id="btn-fav" class="ctl" onclick="toggleFavoritoCloud()" aria-label="Preferida">${ico('estrella')}</button>
            <button id="btn-extra" class="ctl" onclick="mostrarInfoExtra()" disabled aria-label="Informació extra">${ico('lupa')}</button>
            <button class="ctl p" onclick="siguiente()" aria-label="Següent">${ico('adelante')}</button>
        </div>`;
    actualizarBotonFav();
    aplicarVisibilidadInfoSRS();

    if (respondida) {
        pintarResultado(previa.elegida, q.correcta);
        // A cegues la lupa (que revelaria la resposta) queda bloquejada durant tot el simulacre
        if (!modoCiegas) {
            const extra = document.getElementById("btn-extra");
            extra.disabled = false;
            if (!previa.acierto) extra.classList.add('enfasis'); // fallada: la lupa es ressalta
        }
    }
}

function verificarRespuesta(indiceBoton) {
    const q = preguntas[indice];
    const opcion = opcionesActuales[indiceBoton];
    if (!opcion) return;

    if (respondida) {
        // Amb correcció la resposta queda bloquejada. A cegues (com un examen en paper, sense veure si l'has encertat)
        // es pot canviar de resposta o desmarcar-la tocant la que ja tens triada: la pregunta torna a quedar en blanc.
        if (!modoCiegas) return;
        const previa = respuestasDadas[indice];
        if (previa && previa.elegida === opcion.id) {
            delete respuestasDadas[indice];
            respondida = false;
            recalcularContadores();
            pintarResultado(null, q.correcta);
            return;
        }
    }
    respondida = true;

    const acierto = opcion.id === q.correcta;
    respuestasDadas[indice] = { elegida: opcion.id, acierto: acierto };
    recalcularContadores();
    pintarResultado(opcion.id, q.correcta);

    // Amb correcció, només es registra al SRS la 1a resposta (després la pregunta queda bloquejada).
    // A cegues la resposta encara es pot canviar: el SRS es registra al final, amb la resposta definitiva (vegeu final()).
    if (!modoCiegas) actualizarSRS(q.id, acierto);
    aplicarVisibilidadInfoSRS(); // si la info estava amagada fins a respondre, ara es mostra
    if (!modoCiegas) {
        const extra = document.getElementById("btn-extra");
        extra.disabled = false;
        if (!acierto) extra.classList.add('enfasis', 'pulso'); // fallada: la lupa es ressalta (i polseja 3 cops)
    }
}

// 6. FAVORITOS CLOUD
async function toggleFavoritoCloud(){
    const q = preguntas[indice];
    const btn = document.getElementById("btn-fav");
    const existe = favoritosCloud.some(f => f.pregunta === q.pregunta);
    const action = existe ? "remove" : "add";
    
    btn.classList.add('cargando'); btn.disabled = true;

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
        btn.classList.remove('cargando');
        btn.disabled = false;
    }, 500); 
}

function actualizarBotonFav(){
    const btn = document.getElementById("btn-fav");
    if(!btn || !preguntas[indice]) return;
    const existe = favoritosCloud.some(f => f.pregunta === preguntas[indice].pregunta);
    btn.classList.toggle('fav-on', existe);
    btn.setAttribute('aria-pressed', existe ? 'true' : 'false');
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

    // A cegues les respostes es podien canviar fins al final: ara es registren al SRS una sola vegada, les definitives.
    // Les en blanc no toquen el SRS (igual que abans). Els exàmens oficials no hi entren mai (actualizarSRS ho filtra).
    if (modoCiegas) {
        preguntas.forEach((q, i) => {
            const r = respuestasDadas[i];
            if (r && !r.blanca) actualizarSRS(q.id, r.acierto);
        });
    }

    // Simulacre Oficial: queda registrat amb data i hora (estadístiques). Només el d'80 fet de principi a fi.
    const filaSim = registrarSimulacroOficial();

    const nota = Math.max(0, ((aciertos - (fallos * 0.25)) / preguntas.length) * 10).toFixed(2).replace(".", ",");
    const enReservas = !!(modoExamen && modoExamen.enReservas);
    const statBlanc = esSimulacroLargo
        ? `<div class="stat"><span class="c-neutro">${ico('circulo')}en blanc</span><b>${blancas}</b></div>` : "";
    const etiquetaCiegas = modoCiegas
        ? `<div class="chips centrado"><span class="chip c-info">${ico('ojoOff')}simulacre a cegues</span></div>` : "";
    // Examen oficial: quin és i, si són les reserves opcionals, que no compten (en lloc de nota, encerts sobre el total)
    const etiquetaExamen = modoExamen
        ? `<div class="chips centrado"><span class="chip ${enReservas ? 'c-neutro' : 'c-info'}">${ico(enReservas ? 'aviso' : 'check')}${modoExamen.nombre}${enReservas ? ' · reserves opcionals: no compten' : ''}</span></div>` : "";
    const valorGran = enReservas ? `${aciertos}/${preguntas.length}` : nota;
    // A cegues no has vist les correccions: al final es poden revisar totes les respostes (encerts, errors i en blanc)
    const botonRevision = modoCiegas
        ? `<button class="btn btn-outline" onclick="mostrarRevision()">${ico('lupa')}${textoBotonRevision()}</button>` : "";
    // Acabat l'examen: les reserves que no han entrat es poden fer a part
    const botonReservas = (modoExamen && !enReservas && modoExamen.reservas.length > 0)
        ? `<button class="btn btn-outline" onclick="iniciarReservasExamen()">${ico('adelante')}Reserves opcionals (${modoExamen.reservas.length}) · no compten</button>` : "";
    // Els exàmens oficials no toquen el SRS: no hi ha res a sincronitzar
    const pieSync = modoExamen ? ""
        : `<p id="msg-sync" class="sync-msg">${ico('reloj')}<span>Sincronitzant cervell amb el núvol...</span></p>`;

    document.getElementById("resultado").innerHTML = `
        <div class="sec-label">resultat</div>
        <div class="res-nota">${valorGran}</div>
        ${etiquetaExamen}
        ${etiquetaCiegas}
        <div class="res-stats">
            <div class="stat"><span class="c-ok">${ico('check')}correctes</span><b>${aciertos}</b></div>
            <div class="stat"><span class="c-ko">${ico('x')}errors</span><b>${fallos}</b></div>
            ${statBlanc}
        </div>
        ${htmlBloqueResultadoSim(filaSim)}
        ${botonRevision}
        ${botonReservas}
        ${pieSync}`;
    if (filaSim) refrescarEstadisticas().then(() => enviarPendientesSimulacros()); // en segon pla: el simulacre ja és al mòbil

    if (modoExamen) return;

    // Missatge REAL: només diu "guardat" si la núvol ha confirmat els últims repassos
    const ok = await sincronizarSRSCloud({ verificar: true });
    const msg = document.getElementById("msg-sync");
    if (!msg) return;
    if (ok) {
        msg.className = "sync-msg ok";
        msg.innerHTML = ico('nube') + "<span>Progrés guardat i verificat al núvol!</span>";
    } else if (!navigator.onLine) {
        msg.className = "sync-msg aviso";
        msg.innerHTML = ico('aviso') + "<span>Sense connexió: el progrés queda guardat al mòbil i es sincronitzarà en tornar a entrar amb connexió.</span>";
    } else {
        msg.className = "sync-msg aviso";
        msg.innerHTML = ico('aviso') + "<span>No he pogut confirmar el desat al núvol. El progrés queda guardat al mòbil i es reintentarà en entrar.</span>";
    }
}

// --- REVISIÓ DE RESPOSTES (només després d'un simulacre a cegues): totes, amb filtre per errors / correctes ---
function textoBotonRevision() {
    return `Revisar respostes (${preguntas.length})`;
}

function mostrarRevision() {
    const items = preguntas.map((q, i) => ({ q: q, i: i, r: respuestasDadas[i] }));
    const esAcierto = (r) => !!(r && !r.blanca && r.acierto);
    const nOk = items.filter(x => esAcierto(x.r)).length;
    const nKo = items.filter(x => x.r && !x.r.blanca && !x.r.acierto).length;
    const nBlanc = items.length - nOk - nKo;

    const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
    document.getElementById("resum-revision").textContent =
        `${plural(nOk, 'correcta', 'correctes')} · ${plural(nKo, 'error', 'errors')} · ${nBlanc} en blanc`;
    document.getElementById("rev-n-tot").textContent = items.length;
    document.getElementById("rev-n-err").textContent = nKo + nBlanc;
    document.getElementById("rev-n-ok").textContent = nOk;
    document.getElementById("lista-revision").innerHTML = items.map(({ q, i, r }) => {
        const elegida = r && !r.blanca ? r.elegida : null;
        const estat = esAcierto(r) ? 'ok' : (elegida ? 'ko' : 'blanc');
        const orden = ordenOpciones[i] || obtenerRespuestasMezcladas(q).opciones; // l'ordre que vas veure al test
        const opciones = orden.map((o, k) => {
            let clases = "opcion estatica", icono = "";
            if (o.id === q.correcta) { clases += " ok"; icono = ico('check'); }
            else if (o.id === elegida) { clases += " ko"; icono = ico('x'); }
            const letra = MOSTRAR_LETRAS ? `<span class="letra">${"ABCD"[k] || ""}</span>` : "";
            return `<div class="${clases}">${letra}<span class="op-texto">${o.texto}</span><span class="op-icono">${icono}</span></div>`;
        }).join("");
        const estado = estat === 'ok'
            ? `<span class="chip c-ok">${ico('check')}correcta</span>`
            : estat === 'ko'
                ? `<span class="chip c-ko">${ico('x')}error</span>`
                : `<span class="chip c-neutro">${ico('circulo')}en blanc</span>`;
        const extra = prepararContenidoExtra(q);
        const extraHTML = extra
            ? `<details class="rev-extra"><summary>${ico('lupa')}Informació extra</summary><div class="contenido">${extra}</div></details>` : "";
        return `<article class="rev-card" data-estat="${estat}">
            <div class="rev-cab"><span class="q-tema">${q.tema}</span>${estado}<span class="rev-num">#${i + 1}</span></div>
            <p class="q-texto">${q.pregunta}</p>
            <div class="rev-ops">${opciones}</div>
            ${extraHTML}
        </article>`;
    }).join("");

    filtrarRevision('tot');
    document.getElementById("pantalla-final").classList.add("oculto");
    document.getElementById("pantalla-revision").classList.remove("oculto");
    window.scrollTo(0, 0);
}

// Filtre de la revisió: 'tot' (per defecte), 'errors' (errors + en blanc) o 'ok' (correctes). Només amaga/mostra fitxes.
function filtrarRevision(filtro) {
    document.getElementById("lista-revision").dataset.filtre = filtro;
    document.querySelectorAll("#filtres-revision [data-filtre]").forEach(b =>
        b.setAttribute("aria-pressed", b.dataset.filtre === filtro ? "true" : "false"));
    // Si el filtre no deixa cap fitxa (p. ex. cap error), s'explica en comptes de deixar la pantalla buida
    const n = document.querySelectorAll(
        filtro === 'ok' ? '#lista-revision .rev-card[data-estat="ok"]'
        : filtro === 'errors' ? '#lista-revision .rev-card:not([data-estat="ok"])'
        : '#lista-revision .rev-card').length;
    const buit = document.getElementById("rev-buit");
    buit.textContent = filtro === 'ok' ? "Cap pregunta correcta." : "Cap error ni pregunta en blanc. Molt bé!";
    buit.classList.toggle("oculto", n > 0);
}

function cerrarRevision() {
    document.getElementById("pantalla-revision").classList.add("oculto");
    document.getElementById("pantalla-final").classList.remove("oculto");
    window.scrollTo(0, 0);
}

// =====================================================================
// ESTADÍSTIQUES DELS SIMULACRES OFICIALS
// Cada Simulacre Oficial (80) queda registrat amb data i hora. Font de veritat: pestanya «Simulacres» del Sheet;
// mentrestant (o sense cobertura) es guarda al mòbil i s'hi envia quan la sincronització està activada
// (pestanya «Config», fila sync_simulacres = SI). El tall i l'objectiu setmanal també surten de «Config».
// =====================================================================
const HOJA_SIMULACROS = "Simulacres";
const HOJA_CONFIG = "Config";
const CLAVE_SIM_LOCAL = "cerebroSimulacres_v1";       // pendents d'arribar al Sheet
const CLAVE_SIM_NUBE = "cerebroSimulacresNube_v1";    // còpia de l'últim estat llegit del Sheet
const CLAVE_CONFIG_SIM = "cerebroConfigSim_v1";
const CLAVE_FILTRO_SIM = "cerebroFiltroSim";
const PENALIZACION_ERROR = 0.25;
const TALL_PER_DEFECTE = 7.25;
const OBJECTIU_SETMANAL_MINIM = 3;
const MIN_SIMULACROS_TEMA = 5;
const MAX_FILES_HISTORIAL = 30;
const N_SIMULACRO_OFICIAL = Object.values(PESOS_SIMULACRO).reduce((a, b) => a + b, 0);

let simulacroActual = null;    // { tipus, dificultat } mentre es fa un simulacre; null en qualsevol altre test
let simulacrosNube = [];       // llegits del Sheet
let simulacrosLocal = [];      // pendents d'arribar al Sheet
let configSim = { tall: TALL_PER_DEFECTE, objectiu: OBJECTIU_SETMANAL_MINIM, sync: false };
let filtroSim = 'comparables'; // 'comparables' (Mixt · a cegues) | 'tots'
let ultimoIntentoEnvioSim = 0;
let ESPERA_ESCRITURA_SIM_MS = 2500; // el Sheet triga un moment a escriure abans de poder verificar-ho

function leerJSONSim(clave, porDefecto) {
    try { const j = JSON.parse(localStorage.getItem(clave)); return j == null ? porDefecto : j; } catch (e) { return porDefecto; }
}
function guardarJSONSim(clave, valor) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* sense espai: no passa res */ }
}
function numSim(v) { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isNaN(n) ? NaN : n; }
function r2(x) { return Math.round(x * 100) / 100; }
function fmtNota(x) { return x.toFixed(2).replace('.', ','); }
function fmtDelta(d) { const v = r2(d); return (v > 0 ? '+' : v < 0 ? '−' : '') + fmtNota(Math.abs(v)); }

function notaSimulacro(r) { return r.n > 0 ? Math.max(0, (r.ok - r.ko * PENALIZACION_ERROR) / r.n * 10) : 0; }
function esComparable(r) { return r.tipus === 'oficial' && r.dificultat === 'tots' && !!r.cegues; }
function pasaTall(nota) { return r2(nota) >= r2(configSim.tall); }

function sanearConfigSim(c) {
    c = c || {};
    const tall = numSim(c.tall), obj = Math.round(numSim(c.objectiu));
    return {
        tall: (!isNaN(tall) && tall > 0 && tall <= 10) ? tall : TALL_PER_DEFECTE,
        objectiu: isNaN(obj) ? OBJECTIU_SETMANAL_MINIM : Math.max(OBJECTIU_SETMANAL_MINIM, obj),
        sync: c.sync === true
    };
}

function normalizarConfigSim(filas) {
    const cfg = { tall: TALL_PER_DEFECTE, objectiu: OBJECTIU_SETMANAL_MINIM, sync: false };
    (filas || []).forEach(r => {
        if (!r || !r.c || !r.c[0] || r.c[0].v == null) return;
        const clave = String(r.c[0].v).trim().toLowerCase();
        const valor = (r.c[1] && r.c[1].v != null) ? r.c[1].v : '';
        if (clave === 'nota_tall') cfg.tall = valor;
        else if (clave === 'objectiu_setmanal') cfg.objectiu = valor;
        else if (clave === 'sync_simulacres') cfg.sync = /^(si|sí|s|yes|y|true|1)$/i.test(String(valor).trim());
    });
    return sanearConfigSim(cfg);
}

// Llegeix la pestanya «Simulacres». Si la pestanya no existeix, gviz pot tornar-ne una altra: per això es comprova la capçalera.
function normalizarSimulacros(json) {
    const cols = (json.table && json.table.cols) || [];
    const rows = (json.table && json.table.rows) || [];
    const etiqueta = String((cols[0] && cols[0].label) || '').trim().toLowerCase();
    const primera = String((rows[0] && rows[0].c && rows[0].c[0] && rows[0].c[0].v) || '').trim().toLowerCase();
    if (etiqueta !== 'id' && primera !== 'id') throw new Error("La pestanya Simulacres no té el format esperat");
    const SI = /^(si|sí|s|yes|y|true|1)$/i;
    return rows.filter(r => r && r.c).map(r => {
        const celda = i => (r.c[i] && r.c[i].v != null) ? r.c[i].v : '';
        const id = String(celda(0)).trim();
        const ts = numSim(celda(2)), n = numSim(celda(6)), ok = numSim(celda(7)), ko = numSim(celda(8)), bl = numSim(celda(9));
        if (!id || isNaN(ts) || isNaN(n) || n <= 0 || isNaN(ok) || isNaN(ko)) return null; // també descarta la fila de capçalera
        let perTema = null;
        try { const t = JSON.parse(String(celda(11))); if (t && typeof t === 'object') perTema = t; } catch (e) { /* sense detall per tema */ }
        return {
            id: id, ts: ts,
            tipus: String(celda(3)).trim().toLowerCase() || 'oficial',
            dificultat: String(celda(4)).trim().toLowerCase() || 'tots',
            cegues: SI.test(String(celda(5)).trim()),
            n: n, ok: ok, ko: ko, bl: isNaN(bl) ? Math.max(0, n - ok - ko) : bl,
            perTema: perTema, origen: 'sheet'
        };
    }).filter(Boolean);
}

async function pedirJSONSheet(hoja) {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&headers=1&sheet=${encodeURIComponent(hoja)}&t=` + Date.now();
    const text = await fetchTextoConTimeout(url);
    const json = JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));
    if (json.status === 'error' || !json.table || !Array.isArray(json.table.rows)) {
        throw new Error("Resposta no vàlida per a " + hoja);
    }
    return json;
}

// Historial = el que ja és al Sheet + el que només és al mòbil (pendent). Un mateix ID mai surt dues vegades.
function todosSimulacros() {
    const mapa = new Map();
    simulacrosNube.forEach(r => mapa.set(r.id, Object.assign({}, r, { pendiente: false })));
    simulacrosLocal.forEach(r => { if (!mapa.has(r.id)) mapa.set(r.id, Object.assign({}, r, { pendiente: true })); });
    return [...mapa.values()].sort((a, b) => a.ts - b.ts);
}

function nuevoIdSimulacro() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function guardarFilaLocalSim(fila) {
    simulacrosLocal = leerJSONSim(CLAVE_SIM_LOCAL, []);          // llegir abans d'escriure: mai trepitja el que ja hi havia
    if (!simulacrosLocal.some(r => r.id === fila.id)) simulacrosLocal.push(fila);
    guardarJSONSim(CLAVE_SIM_LOCAL, simulacrosLocal);
}

// Es crida des de final(): registra el simulacre oficial acabat (només si s'ha fet de principi a fi).
function registrarSimulacroOficial() {
    if (!simulacroActual || simulacroActual.tipus !== 'oficial' || modoExamen) return null;
    const perTema = {};
    preguntas.forEach((q, i) => {
        const tema = String(q.id || '').split('-')[0];
        if (!tema) return;
        const r = respuestasDadas[i];
        const k = (r && !r.blanca) ? (r.acierto ? 0 : 1) : 2;
        (perTema[tema] = perTema[tema] || [0, 0, 0])[k]++;
    });
    const fila = {
        id: 's' + nuevoIdSimulacro(), ts: Date.now(), tipus: 'oficial', dificultat: simulacroActual.dificultat || 'tots',
        cegues: !!modoCiegas, n: preguntas.length, ok: aciertos, ko: fallos, bl: blancas, perTema: perTema, origen: 'app'
    };
    simulacroActual = null;                                       // un simulacre només es registra una vegada
    guardarFilaLocalSim(fila);
    return fila;
}

function inicioSemana(ts) { // dilluns a les 00:00 (hora local) de la setmana de ts
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.getTime();
}
function contarSemana(todos) {
    const desde = inicioSemana(Date.now());
    return todos.filter(r => r.tipus === 'oficial' && r.ts >= desde).length;
}

function mediaUltimas(serie, k) {
    if (serie.length < k) return null;
    const ult = serie.slice(-k).map(notaSimulacro);
    return ult.reduce((a, b) => a + b, 0) / k;
}

function estadisticasPorTema(serie) {
    const conTema = serie.filter(r => r.perTema);
    const acum = {};
    conTema.forEach(r => Object.entries(r.perTema).forEach(([id, v]) => {
        if (!Array.isArray(v)) return;
        const a = acum[id] = acum[id] || [0, 0, 0];
        a[0] += +v[0] || 0; a[1] += +v[1] || 0; a[2] += +v[2] || 0;
    }));
    const lista = Object.entries(acum)
        .map(([id, a]) => ({ id: id, total: a[0] + a[1] + a[2], pct: Math.round(a[0] / (a[0] + a[1] + a[2] || 1) * 100) }))
        .filter(t => t.total > 0)
        .sort((x, y) => x.pct - y.pct || y.total - x.total);
    return { sims: conTema.length, lista: lista };
}

// --- Lectura del Sheet (amb còpia local) i enviament de pendents ---
async function refrescarEstadisticas() {
    if (!navigator.onLine) return false;
    let ok = false;
    try {
        configSim = normalizarConfigSim((await pedirJSONSheet(HOJA_CONFIG)).table.rows);
        guardarJSONSim(CLAVE_CONFIG_SIM, configSim);
    } catch (e) { console.warn("No s'ha pogut llegir la pestanya Config", e); }
    try {
        simulacrosNube = normalizarSimulacros(await pedirJSONSheet(HOJA_SIMULACROS));
        guardarJSONSim(CLAVE_SIM_NUBE, simulacrosNube);
        // el que ja és al Sheet surt de la cua local
        const ids = new Set(simulacrosNube.map(r => r.id));
        simulacrosLocal = leerJSONSim(CLAVE_SIM_LOCAL, []).filter(r => !ids.has(r.id));
        guardarJSONSim(CLAVE_SIM_LOCAL, simulacrosLocal);
        ok = true;
    } catch (e) { console.warn("No s'ha pogut llegir la pestanya Simulacres", e); }
    pintarEstadisticas();
    return ok;
}

// Només s'envia si «Config» té sync_simulacres = SI (és a dir, l'Apps Script ja sap rebre'ls). Amb NO no surt res del mòbil.
// El POST no-cors no confirma res: es dona per bo quan el simulacre apareix al Sheet (refrescarEstadisticas el treu de la cua).
async function enviarPendientesSimulacros() {
    if (!configSim.sync || !navigator.onLine) return;
    const ahora = Date.now();
    if (ahora - ultimoIntentoEnvioSim < 30000) return;
    const pendientes = leerJSONSim(CLAVE_SIM_LOCAL, []);
    if (!pendientes.length) return;
    ultimoIntentoEnvioSim = ahora;
    for (const fila of pendientes) {
        try {
            await fetch(URL_APPS_SCRIPT, {
                method: "POST",
                mode: "no-cors",
                body: JSON.stringify({ action: "guardar_simulacre", data: JSON.stringify(fila) })
            });
        } catch (e) { console.error("Error enviant el simulacre", e); return; }
    }
    await esperar(ESPERA_ESCRITURA_SIM_MS);
    await refrescarEstadisticas();
}

function iniciarEstadisticas() {
    configSim = sanearConfigSim(leerJSONSim(CLAVE_CONFIG_SIM, {}));
    simulacrosNube = leerJSONSim(CLAVE_SIM_NUBE, []);
    simulacrosLocal = leerJSONSim(CLAVE_SIM_LOCAL, []);
    try { filtroSim = localStorage.getItem(CLAVE_FILTRO_SIM) === 'tots' ? 'tots' : 'comparables'; } catch (e) { /* res */ }
    pintarEstadisticas();
    refrescarEstadisticas().then(() => enviarPendientesSimulacros());
}

// --- Navegació ---
function abrirStats() {
    document.getElementById("pantalla-inicio").classList.add("oculto");
    document.getElementById("pantalla-stats").classList.remove("oculto");
    const q = document.getElementById("man-quan");
    if (q && !q.value) q.value = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    pintarEstadisticas();
    window.scrollTo(0, 0);
    refrescarEstadisticas().then(() => enviarPendientesSimulacros());
}
function cerrarStats() {
    document.getElementById("pantalla-stats").classList.add("oculto");
    document.getElementById("pantalla-inicio").classList.remove("oculto");
    window.scrollTo(0, 0);
}
function cambiarFiltroSim(f) {
    filtroSim = f === 'tots' ? 'tots' : 'comparables';
    try { localStorage.setItem(CLAVE_FILTRO_SIM, filtroSim); } catch (e) { /* res */ }
    pintarEstadisticas();
}

// --- Afegir a mà (p. ex. un simulacre fet abans de tenir això, o fora de l'app) ---
function anadirSimulacroManual() {
    const val = id => document.getElementById(id).value;
    const msg = document.getElementById("man-msg");
    const error = t => { msg.textContent = t; msg.className = 'st-peu st-err'; };
    const quan = val('man-quan');
    const ts = quan ? new Date(quan).getTime() : NaN; // datetime-local = hora local del dispositiu
    const ok = parseInt(val('man-ok'), 10), ko = parseInt(val('man-ko'), 10), bl = parseInt(val('man-bl'), 10);
    if (isNaN(ts)) return error("Posa la data i l'hora.");
    if (ts > Date.now() + 10 * 60000) return error("Aquesta data i hora són del futur.");
    if ([ok, ko, bl].some(x => isNaN(x) || x < 0)) return error("Posa les correctes, els errors i els en blanc (0 o més).");
    const n = ok + ko + bl;
    if (n !== N_SIMULACRO_OFICIAL) return error(`Han de sumar ${N_SIMULACRO_OFICIAL} preguntes (ara en sumen ${n}).`);
    const repetit = todosSimulacros().some(r => r.ts === ts && r.ok === ok && r.ko === ko && r.bl === bl);
    if (repetit) return error("Aquest simulacre ja hi és.");
    guardarFilaLocalSim({ id: 'm' + nuevoIdSimulacro(), ts: ts, tipus: 'oficial', dificultat: 'tots', cegues: true, n: n, ok: ok, ko: ko, bl: bl, perTema: null, origen: 'manual' });
    ['man-ok', 'man-ko', 'man-bl'].forEach(id => { document.getElementById(id).value = ''; });
    msg.textContent = `Afegit: ${fmtNota(notaSimulacro({ n: n, ok: ok, ko: ko }))}.`;
    msg.className = 'st-peu st-okmsg';
    pintarEstadisticas();
    enviarPendientesSimulacros();
}

// --- Pintar ---
function fechaCorta(ts) {
    const d = new Date(ts), z = n => String(n).padStart(2, '0');
    return `${z(d.getDate())}/${z(d.getMonth() + 1)}`;
}
function horaCorta(ts) {
    const d = new Date(ts), z = n => String(n).padStart(2, '0');
    return `${z(d.getHours())}:${z(d.getMinutes())}`;
}

function svgGraficoSim(serie) {
    const notas = serie.map(notaSimulacro), n = serie.length, tall = configSim.tall;
    let lo = Math.max(0, Math.floor(Math.min(...notas, tall) - 0.5));
    let hi = Math.min(10, Math.ceil(Math.max(...notas, tall) + 0.5));
    if (hi - lo < 2) { lo = Math.max(0, hi - 2); if (hi - lo < 2) hi = lo + 2; }
    const W = 342, H = 210, pl = 30, pr = 12, pt = 14, pb = 28;
    const y = v => pt + (hi - v) / (hi - lo) * (H - pt - pb);
    const x = i => n === 1 ? pl + (W - pl - pr) / 2 : pl + i * (W - pl - pr) / (n - 1);
    let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Nota de cada simulacre, de ${fmtNota(Math.min(...notas))} a ${fmtNota(Math.max(...notas))}, amb el tall a ${fmtNota(tall)}" style="display:block">`;
    for (let v = lo; v <= hi; v++) {
        s += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" style="stroke:var(--text);opacity:.12"/>` +
             `<text x="${pl - 6}" y="${y(v) + 4}" text-anchor="end" style="fill:var(--muted);font:500 10px Inter,sans-serif">${v}</text>`;
    }
    s += `<line x1="${pl}" x2="${W - pr}" y1="${y(tall)}" y2="${y(tall)}" stroke-dasharray="5 4" style="stroke:var(--cta);stroke-width:1.6"/>` +
         `<text x="${pl + 4}" y="${y(tall) - 6}" style="fill:var(--cta);font:700 10px Inter,sans-serif">tall ${fmtNota(tall)}</text>`;
    if (n > 1) s += `<polyline fill="none" style="stroke:var(--text);opacity:.45;stroke-width:1.5" points="${notas.map((v, i) => x(i) + ',' + y(v)).join(' ')}"/>`;
    if (n >= 3) {
        const med = notas.map((_, i) => { const a = notas.slice(Math.max(0, i - 2), i + 1); return a.reduce((t, q) => t + q, 0) / a.length; });
        s += `<polyline fill="none" stroke-dasharray="2 3" style="stroke:var(--info);stroke-width:2.2" points="${med.map((v, i) => x(i) + ',' + y(v)).join(' ')}"/>`;
    }
    notas.forEach((v, i) => { s += `<circle cx="${x(i)}" cy="${y(v)}" r="5" style="fill:${pasaTall(v) ? 'var(--ok-badge)' : 'var(--ko-badge)'};stroke:var(--bg);stroke-width:2"/>`; });
    const marcas = n <= 3 ? serie.map((_, i) => i) : [0, Math.floor((n - 1) / 2), n - 1];
    marcas.forEach(i => {
        const ancla = n > 1 && i === 0 ? 'start' : (n > 1 && i === n - 1 ? 'end' : 'middle');
        s += `<text x="${x(i)}" y="${H - 8}" text-anchor="${ancla}" style="fill:var(--muted);font:500 10px Inter,sans-serif">${fechaCorta(serie[i].ts)}</text>`;
    });
    return s + '</svg>';
}

function htmlStats() {
    const todos = todosSimulacros();
    const oficials = todos.filter(r => r.tipus === 'oficial');
    const comparables = oficials.filter(esComparable);
    const serie = filtroSim === 'tots' ? oficials : comparables;
    const n = serie.length, tall = configSim.tall, obj = configSim.objectiu;
    const semana = contarSemana(todos);

    const filtros = `<div class="st-filtres" role="group" aria-label="Quins simulacres es compten">` +
        `<button type="button" class="filtre-rev" aria-pressed="${filtroSim === 'comparables'}" onclick="cambiarFiltroSim('comparables')">Mixt · a cegues <b>${comparables.length}</b></button>` +
        `<button type="button" class="filtre-rev" aria-pressed="${filtroSim === 'tots'}" onclick="cambiarFiltroSim('tots')">Tots els oficials <b>${oficials.length}</b></button></div>`;

    const dots = `<div class="st-dots">${Array.from({ length: obj }, (_, k) => `<i class="${k < semana ? 'on' : ''}"></i>`).join('')}` +
        `<span>${semana}/${obj}${semana >= obj ? ' · objectiu complert' : ''}</span></div>`;
    const tarjetaSetmana = `<div class="st-card"><h3>aquesta setmana · objectiu mínim ${OBJECTIU_SETMANAL_MINIM}</h3>${dots}` +
        `<p class="st-peu">de dilluns a diumenge · l'objectiu es canvia a la pestanya Config del Sheet</p></div>`;

    if (!n) {
        return filtros + `<div class="st-card"><h3>encara no hi ha dades</h3><p class="st-peu">` +
            (oficials.length ? `Cap simulacre Mixt · a cegues encara. Mira «Tots els oficials» per veure els altres.` :
                `Fes un Simulacre Oficial i quedarà registrat aquí amb la data i l'hora. També pots afegir-ne un a mà, més avall.`) +
            `</p></div>` + tarjetaSetmana;
    }

    const notas = serie.map(notaSimulacro);
    const ultima = notas[n - 1], mejor = Math.max(...notas), m3 = mediaUltimas(serie, 3);
    const clase = d => d >= 0 ? 'st-up' : 'st-dn';
    const hero = m3 === null
        ? `<div class="st-kpi hero"><small>mitjana de les últimes 3</small><b>—</b><em>cal tenir 3 simulacres (en tens ${n}) · tall ${fmtNota(tall)}</em></div>`
        : `<div class="st-kpi hero"><small>mitjana de les últimes 3</small><b>${fmtNota(m3)}</b><em class="${clase(r2(m3) - r2(tall))}">${fmtDelta(m3 - tall)} ${m3 >= tall ? 'per sobre' : 'per sota'} del tall ${fmtNota(tall)}</em></div>`;

    const filas = [...serie].reverse().slice(0, MAX_FILES_HISTORIAL).map((r, i) => {
        const nota = notaSimulacro(r);
        const etiq = esComparable(r) ? '' : ` · ${r.dificultat !== 'tots' ? r.dificultat : ''}${r.dificultat !== 'tots' && !r.cegues ? ' · ' : ''}${!r.cegues ? 'amb correcció' : ''}`;
        return `<div class="st-fila${i === 0 ? ' primera' : ''}"><span class="d">${fechaCorta(r.ts)} · ${horaCorta(r.ts)}${etiq}${r.pendiente ? ' ·&nbsp;📱' : ''}</span>` +
            `<b>${fmtNota(nota)}</b><span class="m ${pasaTall(nota) ? 'si' : 'no'}">${pasaTall(nota) ? '≥ tall' : '< tall'}</span>` +
            `<span class="n">✓${r.ok} ✗${r.ko} ○${r.bl}</span></div>`;
    }).join('');
    const mas = n > MAX_FILES_HISTORIAL ? `<p class="st-peu">i ${n - MAX_FILES_HISTORIAL} més, a la pestanya Simulacres del Sheet</p>` : '';
    const pend = serie.filter(r => r.pendiente).length;
    const peuPend = pend ? `<p class="st-peu">📱 ${pend === 1 ? '1 simulacre només és' : pend + ' simulacres només són'} al mòbil (encara no al Sheet). ${configSim.sync ? 'S’enviaran en breu.' : 'S’enviaran quan s’activi la sincronització.'}</p>` : '';

    const tema = estadisticasPorTema(comparables);
    let htmlTema;
    if (tema.sims < MIN_SIMULACROS_TEMA) {
        htmlTema = `<div class="st-lock"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>` +
            `<span>Es desbloqueja amb ${MIN_SIMULACROS_TEMA} simulacres amb detall per tema (en tens ${tema.sims}). Cada simulacre només té 2-4 preguntes per tema: amb menys, no és fiable.</span></div>`;
    } else {
        htmlTema = `<div class="st-feble">${tema.lista.slice(0, 5).map(t =>
            `<span class="t">${escapeHTML(getNombreTema(t.id))}</span><span class="p">${t.pct}%</span><span class="b"><i style="width:${t.pct}%"></i></span>`).join('')}</div>` +
            `<p class="st-peu">encerts acumulats a cada tema · ${tema.sims} simulacres</p>`;
    }

    return filtros + `<div class="st-grid">${hero}` +
        `<div class="st-kpi"><small>última</small><b>${fmtNota(ultima)}</b><em class="${clase(r2(ultima) - r2(tall))}">${fmtDelta(ultima - tall)} vs tall</em></div>` +
        `<div class="st-kpi"><small>millor</small><b>${fmtNota(mejor)}</b><em>${n} ${n === 1 ? 'simulacre' : 'simulacres'}</em></div></div>` +
        tarjetaSetmana +
        `<div class="st-card"><h3>nota per simulacre</h3>${svgGraficoSim(serie)}` +
        `<p class="st-peu">${n >= 3 ? 'línia de punts blava = mitjana mòbil de 3 · ' : ''}punt verd = per sobre del tall</p></div>` +
        `<div class="st-card"><h3>historial</h3>${filas}${mas}${peuPend}</div>` +
        `<div class="st-card"><h3>on perds punts (per tema)</h3>${htmlTema}</div>`;
}

function pintarEstadisticas() {
    const resum = document.getElementById("stats-resum");
    if (resum) {
        const todos = todosSimulacros();
        const comp = todos.filter(r => r.tipus === 'oficial' && esComparable(r));
        const semana = `setmana ${contarSemana(todos)}/${configSim.objectiu}`;
        resum.textContent = comp.length
            ? `última ${fmtNota(notaSimulacro(comp[comp.length - 1]))} · ${semana} · tall ${fmtNota(configSim.tall)}`
            : `encara cap simulacre · ${semana} · tall ${fmtNota(configSim.tall)}`;
    }
    const cont = document.getElementById("stats-contingut");
    if (cont) cont.innerHTML = htmlStats();
}

// Bloc del resultat d'un simulacre oficial: nota vs tall, comparació amb l'anterior, mitjana de 3 i objectiu setmanal.
function htmlBloqueResultadoSim(fila) {
    if (!fila) return '';
    if (!esComparable(fila)) {
        return `<p class="st-aviso">${ico('aviso')}<span>Registrat, però no compta a les estadístiques principals (només Mixt · a cegues). El trobaràs a «Tots els oficials».</span></p>`;
    }
    const todos = todosSimulacros();
    const comp = todos.filter(r => r.tipus === 'oficial' && esComparable(r));
    const idx = comp.findIndex(r => r.id === fila.id);
    const nota = notaSimulacro(fila), tall = configSim.tall;
    const prev = idx > 0 ? comp[idx - 1] : null;
    const m3 = idx >= 2 ? comp.slice(idx - 2, idx + 1).map(notaSimulacro).reduce((a, b) => a + b, 0) / 3 : null;
    const record = idx > 0 && r2(nota) > Math.max(...comp.slice(0, idx).map(r => r2(notaSimulacro(r))));
    const dif = r2(nota) - r2(tall), pasa = dif >= 0;
    const pct = v => Math.max(0, Math.min(100, (v - 5) / 5 * 100));
    const semana = contarSemana(todos), obj = configSim.objectiu;
    const caja = (peu, valor, sub, cls) => `<div><small>${peu}</small><b${cls ? ` class="${cls}"` : ''}>${valor}</b><em>${sub}</em></div>`;
    const dPrev = prev ? nota - notaSimulacro(prev) : null;
    return `<div class="st-tall${pasa ? '' : ' no'}"><div class="cap"><span>nota de tall ${fmtNota(tall)}</span>` +
        `<b class="${pasa ? 'st-up' : 'st-dn'}">${fmtDelta(dif)} · ${pasa ? 'per sobre' : 'per sota'}</b></div>` +
        `<div class="st-bar" role="img" aria-label="Nota ${fmtNota(nota)} sobre una escala de 5 a 10; el tall és ${fmtNota(tall)}"><i class="marca" style="left:${pct(tall)}%"></i><i class="punt" style="left:${pct(nota)}%"></i></div>` +
        `<div class="st-escala"><span>5</span><span>10</span></div></div>` +
        (record ? `<div class="chips centrado st-record"><span class="chip c-ok">${ico('check')}nova millor nota</span></div>` : '') +
        `<div class="st-comp">` +
        (prev ? caja('vs anterior', fmtDelta(dPrev), fmtNota(notaSimulacro(prev)), r2(dPrev) > 0 ? 'st-up' : r2(dPrev) < 0 ? 'st-dn' : '') : caja('vs anterior', '—', 'primer registrat')) +
        (m3 !== null ? caja('mitjana 3', fmtNota(m3), `${fmtDelta(m3 - tall)} vs tall`, r2(m3) >= r2(tall) ? 'st-up' : 'st-dn') : caja('mitjana 3', '—', `${Math.min(idx + 1, 3)} de 3`)) +
        caja('setmana', `${semana}/${obj}`, semana >= obj ? 'objectiu complert' : `objectiu mínim ${obj}`) +
        `</div>`;
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
    // Les preguntes dels exàmens oficials (ids "exCCCC-NNN") no entren mai al SRS, ni des de l'examen ni des de les preferides
    if (ES_ID_EXAMEN.test(String(idPregunta))) return;

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
    const contenidoOriginal = btn ? btn.innerHTML : "";
    if(btn) { btn.innerText = "⏳ Analitzant 25 temes..."; btn.disabled = true; }
    const restaurarBoto = () => { if(btn) { btn.innerHTML = contenidoOriginal; btn.disabled = false; } };

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

        // El filtre de tipus s'aplica DESPRÉS de purgar: la purga ha de veure totes les preguntes
        const candidatas = filtrarEstudio(todasLasPreguntas);
        const hayFiltroTipus = hayFiltroEstudio();

        const ara = Date.now();
        let pendientes = [];
        let nuevas = [];

        candidatas.forEach(q => {
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
            alert(hayFiltroTipus
                ? `No tens res pendent de «${nomFiltreEstudi()}» per avui. Prova traient el filtre.`
                : "No tens res pendent per avui! Descansa una mica.");
            restaurarBoto();
            return;
        }

        esSimulacroLargo = false;
        modoCiegas = false;
        modoExamen = null;
        simulacroActual = null;
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

    // MAI s'envia sense haver fusionat abans amb el núvol: si no s'ha pogut llegir, el que hi ha en local pot ser
    // vell i trepitjaria repassos més recents fets des d'un altre dispositiu. Queda pendent i es reintenta.
    if (!nubeFusionada) {
        const leida = await asegurarLecturaNube(LECTURA_NUBE_LENTA_MS);
        if (!leida) { marcarPendienteSync(); return false; }
        actualizarAvisoNube();
    }

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
    // En tornar a l'app després d'una estona (p. ex. una pestanya oberta des de fa dies), es posa al dia amb el núvol
    if (!document.hidden && sesionIniciada && !lecturaNubeEnCurso && Date.now() - ultimaLecturaNube > REFRESCO_AL_VOLVER_MS) {
        lecturaNubeEnCurso = (async () => {
            try { return await cargarFavoritosDesdeCloud(LECTURA_NUBE_LENTA_MS); }
            catch (e) { return false; }
            finally { lecturaNubeEnCurso = null; }
        })();
        lecturaNubeEnCurso.then(ok => { if (ok) alPonerseAlDiaConLaNube(); });
    }
});

// HTML de l'extra d'una pregunta (buit si no en té). El fa servir la lupa i la revisió d'errors.
function prepararContenidoExtra(q) {
    let contenido = q.extra ? q.extra : '';
    contenido = contenido.replace(/\n/g, '<br>');
    // Celdes del Sheet amb cometes dobles (style=""...""): el navegador ignora l'estil i la imatge
    // surt a mida natural. Només es toquen valors d'atribut sense '=' ni cometes a dins.
    contenido = contenido.replace(/=""([^"<>=]*)""/g, '="$1"');
    return contenido;
}

function mostrarInfoExtra() {
    const q = preguntas[indice];
    const contenido = prepararContenidoExtra(q) || 'Sense informació extra per a aquesta pregunta.';

    let modal = document.getElementById('modal-extra');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-extra';
        document.body.appendChild(modal);
    }

    // L'aspecte del modal (i l'ajust de les imatges a la finestra) és al CSS de l'index.html
    modal.innerHTML = `
        <div class="modal-caja">
            <div class="modal-contenido">
                ${contenido}
            </div>
            <button class="modal-cerrar" onclick="document.getElementById('modal-extra').remove()">Tancar ${ico('x')}</button>
        </div>
    `;
}
window.onload = () => { generarChecks(); generarExamenes(); iniciarOpciones(); };
