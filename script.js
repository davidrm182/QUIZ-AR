const SHEET_ID = "16L9GDzTaz04WeGMXCBzLlYans9Jm0Ys94txHpXz-uq8";
const PIN_CORRECTO = "1989";

let preguntas = [];
let indice = 0;
let aciertos = 0;
let fallos = 0;
let respondida = false;

// LISTADO DE TEMAS
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

// LOGIN
function validarPin(){
    const input = document.getElementById("pin-input").value;
    if(input === PIN_CORRECTO){
        document.getElementById("pantalla-bloqueo").classList.add("oculto");
        document.getElementById("contingut-protegit").classList.remove("oculto");
        generarChecks();
        actualizarContadorFavs();
    }else{
        document.getElementById("error-pin").classList.remove("oculto");
    }
}

function generarChecks(){
    const gen = document.getElementById("lista-general");
    const esp = document.getElementById("lista-especifico");
    if(!gen || !esp) return;
    gen.innerHTML = ""; esp.innerHTML = "";
    TEMAS_GENERAL.forEach(t=> gen.innerHTML += `<label><input type="checkbox" class="tema-check gen" value="${t.id}">${t.nombre}</label>`);
    TEMAS_ESPECIFICO.forEach(t=> esp.innerHTML += `<label><input type="checkbox" class="tema-check esp" value="${t.id}">${t.nombre}</label>`);
}

function seleccionar(estado,clase){
    document.querySelectorAll(".tema-check."+clase).forEach(cb=>cb.checked=estado);
}

// CARGA DE DATOS (MEJORA 3: Siempre empieza en Fila 2)
async function cargarPreguntas(temaId){
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${temaId}`;
    try {
        const res = await fetch(url);
        const text = await res.text();
        const jsonText = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        const json = JSON.parse(jsonText);
        
        // .slice(1) asegura que ignoramos la primera fila de cabeceras
        const rows = json.table.rows.slice(1);
        
        return rows
            .filter(r => r.c && r.c[0] && r.c[0].v !== null)
            .map(r => ({
                idUnico: btoa(encodeURIComponent(r.c[0]?.v || "")).substring(0,20), // ID para favoritos
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

// PREPARACIÓN DEL QUIZ
async function prepararQuiz(){
    const checks = document.querySelectorAll(".tema-check:checked");
    const temasSeleccionados = [...checks].map(t=>t.value);
    if(temasSeleccionados.length === 0){ alert("Selecciona almenys un tema"); return; }
    
    const btn = document.querySelector("button[onclick='prepararQuiz()']");
    btn.innerText = "Carregant..."; btn.disabled = true;

    preguntas = [];
    for(let id of temasSeleccionados){
        const lista = await cargarPreguntas(id);
        preguntas = preguntas.concat(lista);
    }

    if(preguntas.length === 0){ alert("Error llegint dades"); location.reload(); return; }

    mezclar(preguntas);
    const cantidad = parseInt(document.getElementById("num-preguntas").value);
    preguntas = preguntas.slice(0, cantidad);
    
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

// DINÁMICA DEL TEST (MEJORA 1 Y 2: Nota Base 10 y Contadores)
function mostrarPregunta(){
    const q = preguntas[indice];
    respondida = false;
    
    // Fórmula Nota Base 10: ((Aciertos - (Fallos*0.25)) / Total) * 10
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
                style="width:100%; margin:8px 0; padding:18px; font-size:15px; text-align:left; background:#3e3123; color:white; border-radius:12px; border:1px solid #5d4037; display:flex; justify-content:space-between; align-items:center; transition: 0.3s;">
                <span style="max-width:85%">${o.texto}</span>
                <span id="icon-${o.letra}" style="font-size:20px;"></span>
            </button>`;
    });
    document.getElementById("opciones").innerHTML = html;

    document.getElementById("contenedor-controles").innerHTML = `
        <div style="display:flex; justify-content:space-between; gap:12px; margin-top:25px;">
            <button onclick="anterior()" style="flex:1; background:#5d4037; padding:14px; border-radius:10px;">⬅️</button>
            <button id="btn-fav" onclick="toggleFavorito()" style="flex:1; background:#4a4a4a; padding:14px; border-radius:10px;">⭐ Guardar</button>
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

function mostrarExtra(){ alert(preguntas[indice].extra || "Sense info."); }
function anterior(){ if(indice > 0) { indice--; mostrarPregunta(); } }
function siguiente(){
    if(!respondida){ alert("Respon primer"); return; }
    indice++;
    if(indice >= preguntas.length) final();
    else mostrarPregunta();
}

// MEJORA 4: SISTEMA DE FAVORITOS
function toggleFavorito(){
    let favs = JSON.parse(localStorage.getItem("favs_rural") || "[]");
    const q = preguntas[indice];
    const exists = favs.findIndex(f => f.pregunta === q.pregunta);
    
    if(exists > -1){
        favs.splice(exists, 1);
        alert("Eliminada de preferides");
    } else {
        favs.push(q);
        alert("Guardada a preferides");
    }
    localStorage.setItem("favs_rural", JSON.stringify(favs));
    actualizarEstadoBotonFav();
    actualizarContadorFavs();
}

function actualizarEstadoBotonFav(){
    const favs = JSON.parse(localStorage.getItem("favs_rural") || "[]");
    const btn = document.getElementById("btn-fav");
    const isFav = favs.some(f => f.pregunta === preguntas[indice].pregunta);
    if(btn) btn.style.border = isFav ? "2px solid #ffcc00" : "none";
}

function actualizarContadorFavs(){
    const favs = JSON.parse(localStorage.getItem("favs_rural") || "[]");
    document.getElementById("count-favs").innerText = favs.length;
}

function prepararQuizFavs(){
    const favs = JSON.parse(localStorage.getItem("favs_rural") || "[]");
    if(favs.length === 0){ alert("No tens preguntes guardades"); return; }
    preguntas = [...favs];
    mezclar(preguntas);
    iniciarTest();
}

function final(){
    document.getElementById("pantalla-quiz").classList.add("oculto");
    document.getElementById("pantalla-final").classList.remove("oculto");
    const notaNum = ((aciertos - (fallos * 0.25)) / preguntas.length) * 10;
    const nota = Math.max(0, notaNum).toFixed(2).replace(".",",");
    document.getElementById("resultado").innerHTML = `
        <h2 style="color:#ff9800; font-size:28px;">Resultats</h2>
        <div style="font-size:18px; margin:20px 0;">
            ✅ Encerts: <span style="color:#4CAF50">${aciertos}</span><br>
            ❌ Errors: <span style="color:#f44336">${fallos}</span><br><br>
            <div style="background:#3e3123; padding:25px; border-radius:15px; border:2px solid #ff9800;">
                <span style="font-size:14px; text-transform:uppercase; opacity:0.7;">Nota Final (Base 10)</span><br>
                <span style="font-size:45px; font-weight:bold; color:#ff9800;">${nota}</span>
            </div>
        </div>`;
}

window.onload = () => { generarChecks(); actualizarContadorFavs(); };
