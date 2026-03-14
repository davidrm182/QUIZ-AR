const SHEET_ID = "16L9GDzTaz04WeGMXCBzLlYans9Jm0Ys94txHpXz-uq8";
// --- PEGA AQUÍ TU URL DE GOOGLE APPS SCRIPT ---
const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbwADCAbaIihaToLRkOwfUTvVsNHmdyGY5uDcwQKRlP-pTvd1Hc1kNPDXlJLXK23xHj4Iw/exec"; 
const PIN_CORRECTO = "1989";

let preguntas = [];
let favoritosCloud = []; 
let indice = 0;
let aciertos = 0;
let fallos = 0;
let respondida = false;

// 1. LISTADO DE TEMAS COMPLETO (Sin recortes)
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

// 2. INICIO, LOGIN Y SINCRONIZACIÓN
async function validarPin(){
    const input = document.getElementById("pin-input").value;
    const error = document.getElementById("error-pin");
    if(input === PIN_CORRECTO){
        document.getElementById("pantalla-bloqueo").classList.add("oculto");
        document.getElementById("contingut-protegit").classList.remove("oculto");
        generarChecks();
        // Al entrar, descargamos las favoritas de la nube
        await cargarFavoritosDesdeCloud();
    }else{
        error.classList.remove("oculto");
    }
}

async function cargarFavoritosDesdeCloud(){
    try {
        const res = await fetch(URL_APPS_SCRIPT);
        favoritosCloud = await res.json();
        const contador = document.getElementById("count-favs");
        if(contador) contador.innerText = favoritosCloud.length;
    } catch (e) {
        console.error("Error sincronitzant preferides:", e);
    }
}

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

// 3. CARGA DE DATOS (Mejora: Fila 2)
async function cargarPreguntas(temaId){
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${temaId}`;
    try {
        const res = await fetch(url);
        const text = await res.text();
        const inicio = text.indexOf('{');
        const fin = text.lastIndexOf('}');
        const jsonText = text.substring(inicio, fin + 1);
        const json = JSON.parse(jsonText);
        
        // Saltamos la fila 1 (cabeceras)
        const rows = json.table.rows.slice(1);
        
        return rows
            .filter(r => r.c && r.c[0] && r.c[0].v !== null)
            .map(r => ({
                tema: getNombreTema(temaId),
                pregunta: r.c[0]?.v || "",
                a: r.c[1]?.v || "",
                b: r.c[2]?.v || "",
                c: r.c[3]?.v || "",
                d: r.c[4]?.v || "",
                correcta: (r.c[5]?.v || "").toString().toLowerCase().trim(),
                extra: r.c[6]?.v || ""
            }));
    } catch (e) {
        return [];
    }
}

// 4. PREPARACIÓN DEL QUIZ
async function prepararQuiz(){
    const checks = document.querySelectorAll(".tema-check:checked");
    const temasSeleccionados = [...checks].map(t=>t.value);
    
    if(temasSeleccionados.length === 0){ alert("Selecciona almenys un tema"); return; }
    
    const btn = document.querySelector("button[onclick='prepararQuiz()']");
    const originalText = btn.innerText;
    btn.innerText = "Carregant dades...";
    btn.disabled = true;

    preguntas = [];
    for(let id of temasSeleccionados){
        const lista = await cargarPreguntas(id);
        preguntas = preguntas.concat(lista);
    }

    if(preguntas.length === 0){ 
        alert("Error de càrrega"); 
        btn.innerText = originalText;
        btn.disabled = false;
        return; 
    }

    mezclar(preguntas);
    const cantidad = parseInt(document.getElementById("num-preguntas").value);
    preguntas = preguntas.slice(0, cantidad);
    
    iniciarTest();
}

async function prepararQuizFavs(){
    if(favoritosCloud.length === 0){ alert("No tens preguntes guardades a la núvol"); return; }
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

function mezclar(array){
    for(let i=array.length-1;i>0;i--){
        const j=Math.floor(Math.random()*(i+1));
        [array[i],array[j]]=[array[j],array[i]];
    }
}

// 5. DINÁMICA DEL TEST (Nota Base 10 + Contadores)
function mostrarPregunta(){
    const q = preguntas[indice];
    respondida = false;
    
    // Nota Base 10
    const notaNum = ((aciertos - (fallos * 0.25)) / preguntas.length) * 10;
    const nota = Math.max(0, notaNum).toFixed(2).replace(".",",");
    
    document.getElementById("pregunta").innerHTML = `
        <div style="font-size:12px; color:#ffcc00; margin-bottom:5px; text-align:center; opacity:0.8;">${q.tema}</div>
        <div style="font-size:14px; margin-bottom:15px; text-align:center; letter-spacing:1px;">
            PREGUNTA ${indice + 1}/${preguntas.length} | <span style="color:#4CAF50">✅ ${aciertos}</span> | <span style="color:#f44336">❌ ${fallos}</span> | NOTA: ${nota}
        </div>
        <div style="text-align:center; font-size:18px; line-height:1.4;">${q.pregunta}</div>
    `;

    let opciones = [
        {letra:"a", texto:q.a}, {letra:"b", texto:q.b},
        {letra:"c", texto:q.c}, {letra:"d", texto:q.d}
    ].filter(o => o.texto !== "");

    let html = "";
    opciones.forEach(o=>{
        html += `
            <button id="btn-${o.letra}" onclick="responder('${o.letra}')" 
                style="width:100%; margin:8px 0; padding:18px; font-size:15px; text-align:left; background:#3e3123; color:white; border-radius:12px; border:1px solid #5d4037; display:flex; justify-content:space-between; align-items:center;">
                <span style="max-width:85%">${o.texto}</span>
                <span id="icon-${o.letra}" style="font-size:20px;"></span>
            </button>`;
    });
    document.getElementById("opciones").innerHTML = html;

    document.getElementById("contenedor-controles").innerHTML = `
        <div style="display:flex; justify-content:space-between; gap:12px; margin-top:25px;">
            <button onclick="anterior()" style="flex:1; background:#5d4037; padding:14px; border-radius:10px;">⬅️</button>
            <button id="btn-fav" onclick="toggleFavoritoCloud()" style="flex:1; background:#4a4a4a; padding:14px; border-radius:10px;">⭐ Guardar</button>
            <button id="btn-extra" onclick="mostrarExtra()" disabled style="flex:1; background:#5d4037; padding:14px; border-radius:10px;">🔍 Info</button>
            <button onclick="siguiente()" style="flex:1; background:#ff9800; color:black; padding:14px; border-radius:10px;">Següent ➡️</button>
        </div>
    `;
    actualizarEstadoBotonFav();
}

function responder(resp){
    if(respondida) return;
    respondida = true;
    const q = preguntas[indice];
    const correcta = q.correcta;
    
    const btnElegido = document.getElementById(`btn-${resp}`);
    const btnCorrecto = document.getElementById(`btn-${correcta}`);

    if(resp === correcta){ 
        aciertos++; 
        btnElegido.style.backgroundColor = "#2e7d32";
        document.getElementById(`icon-${resp}`).innerHTML = "✅";
    } else {
        fallos++;
        btnElegido.style.backgroundColor = "#c62828";
        document.getElementById(`icon-${resp}`).innerHTML = "❌";
        if(btnCorrecto) {
            btnCorrecto.style.backgroundColor = "#2e7d32";
            document.getElementById(`icon-${correcta}`).innerHTML = "✅";
        }
    }
    document.getElementById("btn-extra").disabled = false;
}

// 6. FAVORITOS EN LA NUBE (Sincronizados)
async function toggleFavoritoCloud(){
    const q = preguntas[indice];
    const btn = document.getElementById("btn-fav");
    const existe = favoritosCloud.some(f => f.pregunta === q.pregunta);
    const action = existe ? "remove" : "add";
    
    btn.innerText = "⏳...";
    btn.disabled = true;

    try {
        await fetch(URL_APPS_SCRIPT, {
            method: "POST",
            mode: "no-cors", // Necesario para evitar bloqueos CORS en Apps Script
            body: JSON.stringify({ action: action, pregunta: q })
        });
        
        // Pequeña pausa para que a Google le dé tiempo a escribir antes de recargar
        setTimeout(async () => {
            await cargarFavoritosDesdeCloud();
            actualizarEstadoBotonFav();
            btn.disabled = false;
        }, 1000);

    } catch (e) {
        alert("Error de connexió");
        btn.disabled = false;
    }
}

function actualizarEstadoBotonFav(){
    const btn = document.getElementById("btn-fav");
    if(!btn) return;
    const existe = favoritosCloud.some(f => f.pregunta === preguntas[indice].pregunta);
    btn.innerText = existe ? "⭐ Treure" : "⭐ Guardar";
    btn.style.border = existe ? "2px solid #ffcc00" : "none";
}

function mostrarExtra(){
    alert(preguntas[indice].extra || "No hi ha informació addicional.");
}

function anterior(){
    if(indice > 0) { indice--; mostrarPregunta(); }
}

function siguiente(){
    if(!respondida){ alert("Respon la pregunta primer."); return; }
    indice++;
    if(indice >= preguntas.length) final();
    else mostrarPregunta();
}

function final(){
    document.getElementById("pantalla-quiz").classList.add("oculto");
    document.getElementById("pantalla-final").classList.remove("oculto");
    const notaNum = ((aciertos - (fallos * 0.25)) / preguntas.length) * 10;
    const nota = Math.max(0, notaNum).toFixed(2).replace(".",",");
    document.getElementById("resultado").innerHTML = `
        <h2 style="color:#ff9800; font-size:28px;">Resultats</h2>
        <div style="font-size:18px; line-height:2; margin:20px 0;">
            ✅ Encerts: <span style="color:#4CAF50">${aciertos}</span><br>
            ❌ Errors: <span style="color:#f44336">${fallos}</span><br><br>
            <div style="background:#3e3123; padding:25px; border-radius:15px; border:2px solid #ff9800;">
                <span style="font-size:14px; text-transform:uppercase; opacity:0.7;">Nota Final (Base 10)</span><br>
                <span style="font-size:45px; font-weight:bold; color:#ff9800;">${nota}</span>
            </div>
        </div>`;
}

window.onload = () => { generarChecks(); };
