const SHEET_ID = "16L9GDzTaz04WeGMXCBzLlYans9Jm0Ys94txHpXz-uq8";
const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbymXsfKvSVAJtCtwfJYhZR_5LIgzbIdZCN4TvZsPx3TDVfccIcllsS-Jk_9qvwnBNkpYQ/exec"; 
const PIN_CORRECTO = "1989";

let preguntas = [];
let favoritosCloud = []; 
let indice = 0;
let aciertos = 0;
let fallos = 0;
let respondida = false;
let respuestaCorrectaActual = ""; // Para el nuevo sistema de respuestas mezcladas

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

// 2. LOGIN Y CARGA DE FAVORITOS (JSONP)
async function validarPin(){
    const input = document.getElementById("pin-input").value;
    const btn = document.querySelector("button[onclick='validarPin()']");
    if(input === PIN_CORRECTO){
        btn.innerText = "Sincronitzant...";
        btn.disabled = true;
        await cargarFavoritosDesdeCloud();
        document.getElementById("pantalla-bloqueo").classList.add("oculto");
        document.getElementById("contingut-protegit").classList.remove("oculto");
        generarChecks();
    }else{
        document.getElementById("error-pin").classList.remove("oculto");
    }
}

function cargarFavoritosDesdeCloud() {
    return new Promise((resolve) => {
        const nombreFuncionCallback = 'callback_google_' + Math.floor(Math.random() * 1000000);
        window[nombreFuncionCallback] = function(data) {
            favoritosCloud = data || [];
            const contador = document.getElementById("count-favs");
            if (contador) contador.innerText = favoritosCloud.length;
            delete window[nombreFuncionCallback];
            document.getElementById('temp-script-google')?.remove();
            resolve();
        };
        const script = document.createElement('script');
        script.id = 'temp-script-google';
        script.src = URL_APPS_SCRIPT + "?callback=" + nombreFuncionCallback + "&t=" + Date.now();
        script.onerror = () => { resolve(); };
        document.body.appendChild(script);
    });
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

// 4. CARGA DE PREGUNTAS (SISTEMA ROBUSTO TEXTO)
async function cargarPreguntas(temaId){
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&headers=1&sheet=${temaId}&t=` + Date.now();
    try {
        const res = await fetch(url);
        const text = await res.text();
        const jsonText = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        const json = JSON.parse(jsonText);
        const rows = json.table.rows; 
        const startIdx = (rows[0] && rows[0].c && rows[0].c[0] && rows[0].c[0].v === "Pregunta") ? 1 : 0;
        const dataRows = rows.slice(startIdx);

        return dataRows
            .map(r => {
                if (!r || !r.c) return null;
                return {
                    tema: getNombreTema(temaId),
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
    } catch (e) { return []; }
}

async function prepararQuiz(){
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
    
    mezclar(preguntas); // Mezcla aleatoria real
    const cantidad = parseInt(document.getElementById("num-preguntas").value);
    preguntas = preguntas.slice(0, cantidad);
    iniciarTest();
}

function prepararQuizFavs(){
    if(favoritosCloud.length === 0){ alert("No tens preferides"); return; }
    preguntas = [...favoritosCloud];
    mezclar(preguntas);
    iniciarTest();
}

function iniciarTest(){
    indice = 0; aciertos = 0; fallos = 0; respondida = false;
    document.getElementById("pantalla-inicio").classList.add("oculto");
    document.getElementById("pantalla-quiz").classList.remove("oculto");
    mostrarPregunta();
}

// ALGORITMO FISHER-YATES
function mezclar(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

// 5. DINÁMICA DEL TEST CON RESPUESTAS MEZCLADAS
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

function mostrarPregunta(){
    const q = preguntas[indice];
    respondida = false;
    const notaNum = ((aciertos - (fallos * 0.25)) / preguntas.length) * 10;
    const nota = Math.max(0, notaNum).toFixed(2).replace(".",",");
    
    document.getElementById("pregunta").innerHTML = `
        <div style="font-size:12px; color:#ffcc00; text-align:center; opacity:0.8; margin-bottom:5px;">${q.tema}</div>
        <div style="font-size:14px; margin-bottom:15px; text-align:center;">
            ${indice + 1}/${preguntas.length} | <span style="color:#4CAF50">✅ ${aciertos}</span> | <span style="color:#f44336">❌ ${fallos}</span> | NOTA: ${nota}
        </div>
        <div style="text-align:center; font-size:18px; line-height:1.4;">${q.pregunta}</div>`;

    const { opciones, textoCorr } = obtenerRespuestasMezcladas(q);
    respuestaCorrectaActual = textoCorr;

    let html = "";
    opciones.forEach((o, i) => {
        html += `<button id="btn-opcion-${i}" onclick="verificarRespuesta('${o.texto.replace(/'/g, "\\'")}', ${i})" style="width:100%; margin:8px 0; padding:18px; background:#3e3123; color:white; border-radius:12px; border:1px solid #5d4037; text-align:left; display:flex; justify-content:space-between; align-items:center;">
            <span style="max-width:85%">${o.texto}</span><span id="icon-opcion-${i}"></span></button>`;
    });
    document.getElementById("opciones").innerHTML = html;

    document.getElementById("contenedor-controles").innerHTML = `
        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin-top:25px;">
            <button onclick="anterior()" style="padding:15px 0; background:#5d4037; border-radius:10px; font-size:20px;">⬅️</button>
            <button id="btn-fav" onclick="toggleFavoritoCloud()" style="padding:15px 0; background:#4a4a4a; border-radius:10px; font-size:20px; border:2px solid transparent;">⭐</button>
            <button id="btn-extra" onclick="alert('${q.extra.replace(/'/g, "\\'") || 'Sense informació'}')" disabled style="padding:15px 0; background:#5d4037; border-radius:10px; font-size:20px;">🔍</button>
            <button onclick="siguiente()" style="padding:15px 0; background:#ff9800; border-radius:10px; font-size:20px;">➡️</button>
        </div>`;
    actualizarBotonFav();
}

function verificarRespuesta(textoSeleccionado, indiceBoton) {
    if (respondida) return;
    respondida = true;
    const botones = document.getElementById("opciones").getElementsByTagName("button");
    if (textoSeleccionado === respuestaCorrectaActual) {
        aciertos++;
        document.getElementById(`btn-opcion-${indiceBoton}`).style.background = "#2e7d32";
    } else {
        fallos++;
        document.getElementById(`btn-opcion-${indiceBoton}`).style.background = "#c62828";
        for (let i = 0; i < botones.length; i++) {
            if (botones[i].innerText.includes(respuestaCorrectaActual)) {
                botones[i].style.background = "#2e7d32";
            }
        }
    }
    document.getElementById("btn-extra").disabled = false;
}

// 6. FAVORITOS CLOUD
async function toggleFavoritoCloud(){
    const q = preguntas[indice];
    const btn = document.getElementById("btn-fav");
    const existe = favoritosCloud.some(f => f.pregunta === q.pregunta);
    const action = existe ? "remove" : "add";
    btn.innerText = "⏳"; btn.disabled = true;
    try {
        fetch(URL_APPS_SCRIPT, {
            method: "POST",
            mode: "no-cors",
            body: JSON.stringify({ action: action, pregunta: q })
        });
        if (action === "add") favoritosCloud.push(q);
        else favoritosCloud = favoritosCloud.filter(f => f.pregunta !== q.pregunta);
        setTimeout(() => {
            actualizarBotonFav();
            const contador = document.getElementById("count-favs");
            if(contador) contador.innerText = favoritosCloud.length;
            btn.disabled = false;
        }, 1000);
    } catch (e) { btn.disabled = false; }
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
    if(!respondida) return alert("Respon primer");
    indice++;
    if(indice >= preguntas.length) final();
    else mostrarPregunta();
}

function final(){
    const nota = Math.max(0, ((aciertos - (fallos * 0.25)) / preguntas.length) * 10).toFixed(2).replace(".", ",");
    document.getElementById("pantalla-quiz").classList.add("oculto");
    document.getElementById("pantalla-final").classList.remove("oculto");
    document.getElementById("resultado").innerHTML = `
        <h2 style="color:#ff9800;">Resultat: ${nota}</h2>
        <p>✅ ${aciertos} correctas | ❌ ${fallos} errors</p>`;
}

window.onload = () => { generarChecks(); };
