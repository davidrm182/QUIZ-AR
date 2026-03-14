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

// 1. LISTADO DE TEMAS COMPLETO (SÍN RECORTES)
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

// 2. LOGIN Y SINCRONIZACIÓN (CON ANTI-CACHÉ)
async function validarPin(){
    const input = document.getElementById("pin-input").value;
    const btn = document.querySelector("button[onclick='validarPin()']");
    if(input === PIN_CORRECTO){
        btn.innerText = "Sincronitzant...";
        btn.disabled = true;
        
        // Cargamos favoritos antes de entrar
        await cargarFavoritosDesdeCloud();

        document.getElementById("pantalla-bloqueo").classList.add("oculto");
        document.getElementById("contingut-protegit").classList.remove("oculto");
        generarChecks();
    }else{
        document.getElementById("error-pin").classList.remove("oculto");
    }
}

async function cargarFavoritosDesdeCloud(){
    try {
        // Añadimos la hora actual para que el PC nunca use una versión guardada
        const resp = await fetch(URL_APPS_SCRIPT + "?t=" + Date.now());
        const data = await resp.json();
        favoritosCloud = data || [];
        const contador = document.getElementById("count-favs");
        if(contador) contador.innerText = favoritosCloud.length;
    } catch (e) {
        console.error("Error sincronizando favoritos:", e);
    }
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

// 4. CARGA DE PREGUNTAS (FILA 2 + ANTI-CACHÉ)
async function cargarPreguntas(temaId){
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${temaId}&t=` + Date.now();
    try {
        const res = await fetch(url);
        const text = await res.text();
        const jsonText = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        const json = JSON.parse(jsonText);
        const rows = json.table.rows.slice(1); // Empezar siempre en fila 2
        
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
    
    mezclar(preguntas);
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

function mezclar(arr){ arr.sort(() => Math.random() - 0.5); }

// 5. DINÁMICA DEL TEST (NOTA BASE 10 + CONTADORES)
function mostrarPregunta(){
    const q = preguntas[indice];
    respondida = false;
    const notaNum = ((aciertos - (fallos * 0.25)) / preguntas.length) * 10;
    const nota = Math.max(0, notaNum).toFixed(2).replace(".",",");
    
    document.getElementById("pregunta").innerHTML = `
        <div style="font-size:12px; color:#ffcc00; text-align:center;">${q.tema}</div>
        <div style="font-size:14px; margin-bottom:10px; text-align:center;">
            ${indice + 1}/${preguntas.length} | ✅ ${aciertos} | ❌ ${fallos} | NOTA: ${nota}
        </div>
        <div style="text-align:center; font-size:18px; line-height:1.4;">${q.pregunta}</div>`;

    let html = "";
    [{l:"a",t:q.a},{l:"b",t:q.b},{l:"c",t:q.c},{l:"d",t:q.d}].filter(o=>o.t).forEach(o=>{
        html += `<button id="btn-${o.l}" onclick="responder('${o.l}')" style="width:100%; margin:8px 0; padding:18px; background:#3e3123; color:white; border-radius:12px; border:1px solid #5d4037; text-align:left; display:flex; justify-content:space-between; align-items:center;">
            <span>${o.t}</span><span id="icon-${o.l}"></span></button>`;
    });
    document.getElementById("opciones").innerHTML = html;

    document.getElementById("contenedor-controles").innerHTML = `
        <div style="display:flex; gap:10px; margin-top:20px;">
            <button onclick="anterior()" style="flex:1;">⬅️</button>
            <button id="btn-fav" onclick="toggleFavoritoCloud()" style="flex:2; background:#4a4a4a;">⭐ Guardar</button>
            <button id="btn-extra" onclick="alert('${q.extra || 'Sense info'}')" disabled style="flex:1;">🔍</button>
            <button onclick="siguiente()" style="flex:2; background:#ff9800; color:black;">Següent ➡️</button>
        </div>`;
    actualizarBotonFav();
}

function responder(resp){
    if(respondida) return;
    respondida = true;
    const q = preguntas[indice];
    const bE = document.getElementById(`btn-${resp}`);
    const bC = document.getElementById(`btn-${q.correcta}`);
    if(resp === q.correcta){ aciertos++; bE.style.background = "#2e7d32"; }
    else { fallos++; bE.style.background = "#c62828"; if(bC) bC.style.background = "#2e7d32"; }
    document.getElementById("btn-extra").disabled = false;
}

// 6. FAVORITOS CLOUD (ESTABLE Y RÁPIDO)
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
        
        // Actualizamos localmente para respuesta instantánea
        if (action === "add") favoritosCloud.push(q);
        else favoritosCloud = favoritosCloud.filter(f => f.pregunta !== q.pregunta);
        
        setTimeout(() => {
            actualizarBotonFav();
            document.getElementById("count-favs").innerText = favoritosCloud.length;
            btn.disabled = false;
        }, 1000);
    } catch (e) { btn.disabled = false; }
}

function actualizarBotonFav(){
    const btn = document.getElementById("btn-fav");
    if(!btn || !preguntas[indice]) return;
    const existe = favoritosCloud.some(f => f.pregunta === preguntas[indice].pregunta);
    btn.innerText = existe ? "⭐ Treure" : "⭐ Guardar";
    btn.style.border = existe ? "2px solid #ffcc00" : "none";
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
    document.getElementById("resultado").innerHTML = `<h2>Resultat: ${nota}</h2><p>✅ ${aciertos} | ❌ ${fallos}</p><button onclick="location.reload()" class="btn-check">Tornar</button>`;
}

window.onload = () => { generarChecks(); };
