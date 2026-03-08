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

// Obtener nombre completo por id
function getNombreTema(id){
    const g = TEMAS_GENERAL.find(t=>t.id===id);
    if(g) return g.nombre;
    const e = TEMAS_ESPECIFICO.find(t=>t.id===id);
    if(e) return e.nombre;
    return id;
}

// PIN
function validarPin(){
    const input = document.getElementById("pin-input").value;
    const error = document.getElementById("error-pin");
    if(input === PIN_CORRECTO){
        document.getElementById("pantalla-bloqueo").classList.add("oculto");
        document.getElementById("contingut-protegit").classList.remove("oculto");
    }else{
        error.classList.remove("oculto");
    }
}

// Generar checks
function generarChecks(){
    const gen = document.getElementById("lista-general");
    const esp = document.getElementById("lista-especifico");
    TEMAS_GENERAL.forEach(t=>{
        gen.innerHTML += `<label><input type="checkbox" class="tema-check gen" value="${t.id}">${t.nombre}</label>`;
    });
    TEMAS_ESPECIFICO.forEach(t=>{
        esp.innerHTML += `<label><input type="checkbox" class="tema-check esp" value="${t.id}">${t.nombre}</label>`;
    });
}

// Seleccionar todos o ninguno
function seleccionar(estado,clase){
    document.querySelectorAll(".tema-check."+clase).forEach(cb=>cb.checked=estado);
}

// Cargar preguntas de Google Sheet
async function cargarPreguntas(tema){
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${tema}`;
    const res = await fetch(url);
    let text = await res.text();
    text = text.substring(47).slice(0,-2);
    const json = JSON.parse(text);
    const rows = json.table.rows;
    let lista = [];
    rows.forEach(r=>{
        if(!r.c[0]) return;
        lista.push({
            tema: getNombreTema(tema), // Nombre completo
            pregunta: r.c[0]?.v || "",
            a: r.c[1]?.v || "",
            b: r.c[2]?.v || "",
            c: r.c[3]?.v || "",
            d: r.c[4]?.v || "",
            correcta: (r.c[5]?.v || "").toLowerCase(),
            extra: r.c[6]?.v || ""
        });
    });
    return lista;
}

// Preparar quiz
async function prepararQuiz(){
    const temasSeleccionados=[...document.querySelectorAll(".tema-check:checked")].map(t=>t.value);
    if(temasSeleccionados.length===0){ alert("Selecciona almenys un tema"); return; }
    preguntas=[];
    indice=0;
    aciertos=0;
    fallos=0;
    respondida=false;

    for(let tema of temasSeleccionados){
        try{
            const p = await cargarPreguntas(tema);
            preguntas = preguntas.concat(p);
        }catch(e){
            console.error("Error cargando:",tema);
        }
    }
    if(preguntas.length===0){ alert("No s'han pogut carregar preguntes."); return; }
    mezclar(preguntas);
    const cantidad=parseInt(document.getElementById("num-preguntas").value);
    preguntas=preguntas.slice(0,cantidad);
    document.getElementById("pantalla-inicio").classList.add("oculto");
    document.getElementById("pantalla-quiz").classList.remove("oculto");
    mostrarPregunta();
}

// Mezclar array
function mezclar(array){
    for(let i=array.length-1;i>0;i--){
        const j=Math.floor(Math.random()*(i+1));
        [array[i],array[j]]=[array[j],array[i]];
    }
}

// Mostrar pregunta
function mostrarPregunta(){
    const q = preguntas[indice];
    respondida=false;

    // MARCADOR + TEMA ARRIBA
    const nota = Math.max(0,(aciertos - fallos*0.25)).toFixed(2).replace(".",",");
    document.getElementById("pregunta").innerHTML = `
        <div style="margin-bottom:5px;font-size:14px;color:#ffcc00;">Tema: ${q.tema}</div>
        <div style="margin-bottom:10px;">Encerts: ${aciertos} | Errors: ${fallos} | Nota: ${nota}</div>
        ${q.pregunta}
    `;

    // SHUFFLE RESPUESTAS
    let opciones = [
        {letra:"a", texto:q.a},
        {letra:"b", texto:q.b},
        {letra:"c", texto:q.c},
        {letra:"d", texto:q.d}
    ];
    mezclar(opciones);

    let html = "";
    opciones.forEach(o=>{
        html += `<button id="btn-${o.letra}" onclick="responder('${o.letra}')" style="margin:4px;width:48%;padding:12px;font-size:16px;">${o.texto}</button>`;
    });
    document.getElementById("opciones").innerHTML = html;

    // BOTONES ATRÁS, EXTRA, SIGUIENTE
    const cont = document.getElementById("contenedor-controles");
    cont.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-top:10px;">
            <button onclick="anterior()" style="width:30%;padding:12px;font-size:16px;background:#ffcc00;color:#1a1a1a;border-radius:8px;">⬅️ Enrere</button>
            <button id="btn-extra" onclick="mostrarExtra()" disabled style="width:30%;padding:12px;font-size:16px;background:#ffcc00;color:#1a1a1a;border-radius:8px;">🔍 Extra</button>
            <button onclick="siguiente()" style="width:30%;padding:12px;font-size:16px;background:#ffcc00;color:#1a1a1a;border-radius:8px;">Següent ➡️</button>
        </div>
    `;
}

// Responder
function responder(resp){
    if(respondida) return;
    respondida=true;
    const q = preguntas[indice];
    const correcta = q.correcta;
    if(resp===correcta){ 
        aciertos++; 
        document.getElementById(`btn-${resp}`).style.backgroundColor="#4CAF50";
    }else{
        fallos++;
        document.getElementById(`btn-${resp}`).style.backgroundColor="#f44336";
        if(correcta) document.getElementById(`btn-${correcta}`).style.backgroundColor="#4CAF50";
    }
    document.getElementById("btn-extra").disabled=false;
    actualizarMarcador();
}

// Mostrar extra
function mostrarExtra(){
    const q = preguntas[indice];
    alert(q.extra || "Sense informació addicional");
}

// Botones Atrás y Siguiente
function anterior(){
    if(indice>0){
        indice--;
        mostrarPregunta();
    }
}
function siguiente(){
    if(!respondida){
        alert("Has de respondre abans de passar a la següent pregunta");
        return;
    }
    indice++;
    if(indice>=preguntas.length){
        final();
    }else{
        mostrarPregunta();
    }
}

// Actualizar marcador (arriba)
function actualizarMarcador(){
    const nota = Math.max(0,(aciertos - fallos*0.25)).toFixed(2).replace(".",",");
    const preguntaDiv = document.getElementById("pregunta");
    const textoPregunta = preguntas[indice].pregunta;
    preguntaDiv.innerHTML = `<div style="margin-bottom:5px;font-size:14px;color:#ffcc00;">Tema: ${preguntas[indice].tema}</div>
        <div style="margin-bottom:10px;">Encerts: ${aciertos} | Errors: ${fallos} | Nota: ${nota}</div>
        ${textoPregunta}`;
}

// Pantalla final
function final(){
    document.getElementById("pantalla-quiz").classList.add("oculto");
    document.getElementById("pantalla-final").classList.remove("oculto");
    const nota = Math.max(0,(aciertos - fallos*0.25)).toFixed(2).replace(".",",");
    document.getElementById("resultado").innerHTML = `Encerts: ${aciertos} / ${preguntas.length} <br> Errors: ${fallos} <br> Nota final: <strong>${nota}</strong>`;
}

window.onload = generarChecks;
