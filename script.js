const SHEET_ID = "16L9GDzTaz04WeGMXCBzLlYans9Jm0Ys94txHpXz-uq8";
const PIN_CORRECTO = "1989";

let preguntas = [];
let indice = 0;
let aciertos = 0;
let fallos = 0;
let respondida = false;

// Map de nombres completos
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
    const g = TEMAS_GENERAL.find(t=>t.id===id);
    if(g) return g.nombre;
    const e = TEMAS_ESPECIFICO.find(t=>t.id===id);
    if(e) return e.nombre;
    return id;
}

function validarPin(){
    const input = document.getElementById("pin-input").value;
    const error = document.getElementById("error-pin");
    if(input === PIN_CORRECTO){
        document.getElementById("pantalla-bloqueo").classList.add("oculto");
        document.getElementById("contingut-protegit").classList.remove("oculto");
        generarChecks();
    }else{
        error.classList.remove("oculto");
    }
}

function generarChecks(){
    const gen = document.getElementById("lista-general");
    const esp = document.getElementById("lista-especifico"); // ID CORREGIDO
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

async function cargarPreguntas(temaId){
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${temaId}`;
    try {
        const res = await fetch(url);
        const text = await res.text();
        // Limpiamos el JSON de Google
        const jsonText = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
        const json = JSON.parse(jsonText);
        const rows = json.table.rows;
        
        return rows.filter(r => r.c && r.c[0] && r.c[0].v).map(r => ({
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
        console.error("Error cargando tema " + temaId, e);
        return [];
    }
}

async function prepararQuiz(){
    const temasSeleccionados = [...document.querySelectorAll(".tema-check:checked")].map(t=>t.value);
    if(temasSeleccionados.length === 0){ alert("Selecciona almenys un tema"); return; }
    
    // Feedback visual de carga
    const pantallaInicio = document.getElementById("pantalla-inicio");
    const originalHTML = pantallaInicio.innerHTML;
    pantallaInicio.innerHTML = `<div class="card"><h3>📦 Carregant preguntes...</h3><p>Això pot tardar uns segons.</p></div>`;

    preguntas = []; indice = 0; aciertos = 0; fallos = 0; respondida = false;

    for(let id of temasSeleccionados){
        const lista = await cargarPreguntas(id);
        preguntas = preguntas.concat(lista);
    }

    if(preguntas.length === 0){ 
        alert("No s'han trobat preguntes en aquests fulls de càlcul."); 
        pantallaInicio.innerHTML = originalHTML;
        generarChecks();
        return; 
    }

    mezclar(preguntas);
    const cantidad = parseInt(document.getElementById("num-preguntas").value);
    preguntas = preguntas.slice(0, cantidad);
    
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

function mostrarPregunta(){
    const q = preguntas[indice];
    respondida = false;
    const nota = Math.max(0,(aciertos - fallos*0.25)).toFixed(2).replace(".",",");
    
    document.getElementById("pregunta").innerHTML = `
        <div style="font-size:13px; color:#ffcc00; margin-bottom:5px; text-align:center;">${q.tema}</div>
        <div style="font-size:14px; margin-bottom:15px; text-align:center;">Pregunta ${indice + 1}/${preguntas.length} | Nota: ${nota}</div>
        <div style="text-align:center; font-weight:bold;">${q.pregunta}</div>
    `;

    let opciones = [
        {letra:"a", texto:q.a}, {letra:"b", texto:q.b},
        {letra:"c", texto:q.c}, {letra:"d", texto:q.d}
    ];
    mezclar(opciones);

    let html = "";
    opciones.forEach(o=>{
        html += `<button id="btn-${o.letra}" onclick="responder('${o.letra}')" 
                 style="width:100%; margin:8px 0; padding:15px; font-size:15px; text-align:left; background:#3e3123; color:white; border-radius:10px; border:1px solid #5d4037; display:flex; justify-content:space-between; align-items:center;">
                 <span style="max-width:90%">${o.texto}</span>
                 <span id="icon-${o.letra}" style="font-size:20px;"></span>
                 </button>`;
    });
    document.getElementById("opciones").innerHTML = html;

    document.getElementById("contenedor-controles").innerHTML = `
        <div style="display:flex; justify-content:space-between; gap:10px; margin-top:20px;">
            <button onclick="anterior()" style="flex:1; background:#5d4037; padding:12px;">⬅️</button>
            <button id="btn-extra" onclick="mostrarExtra()" disabled style="flex:1; background:#5d4037; padding:12px;">🔍 Info</button>
            <button onclick="siguiente()" style="flex:1; background:#ff9800; color:black; padding:12px;">Següent ➡️</button>
        </div>
    `;
}

function responder(resp){
    if(respondida) return;
    respondida = true;
    const q = preguntas[indice];
    const correcta = q.correcta;
    
    if(resp === correcta){ 
        aciertos++; 
        const btn = document.getElementById(`btn-${resp}`);
        btn.style.backgroundColor = "#2e7d32";
        btn.style.borderColor = "#4CAF50";
        document.getElementById(`icon-${resp}`).innerHTML = "✅";
    } else {
        fallos++;
        const btnFallo = document.getElementById(`btn-${resp}`);
        btnFallo.style.backgroundColor = "#c62828";
        btnFallo.style.borderColor = "#f44336";
        document.getElementById(`icon-${resp}`).innerHTML = "❌";
        
        const btnCorrecto = document.getElementById(`btn-${correcta}`);
        if(btnCorrecto) {
            btnCorrecto.style.backgroundColor = "#2e7d32";
            document.getElementById(`icon-${correcta}`).innerHTML = "✅";
        }
    }
    document.getElementById("btn-extra").disabled = false;
}

function mostrarExtra(){
    alert(preguntas[indice].extra || "Sense informació addicional");
}

function anterior(){
    if(indice > 0) { indice--; mostrarPregunta(); }
}

function siguiente(){
    if(!respondida){ alert("Respon primer!"); return; }
    indice++;
    if(indice >= preguntas.length) final();
    else mostrarPregunta();
}

function final(){
    document.getElementById("pantalla-quiz").classList.add("oculto");
    document.getElementById("pantalla-final").classList.remove("oculto");
    const nota = Math.max(0,(aciertos - fallos*0.25)).toFixed(2).replace(".",",");
    document.getElementById("resultado").innerHTML = `
        <h2 style="color:#ff9800">Test Finalitzat</h2>
        <div style="font-size:20px; line-height:2;">
            Encerts: ${aciertos}<br>
            Errors: ${fallos}<br><br>
            <div style="background:#3e3123; padding:20px; border-radius:10px;">
                Nota Final: <span style="font-size:35px; color:#ff9800;">${nota}</span>
            </div>
        </div>`;
}

window.onload = generarChecks;
