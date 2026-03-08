const SHEET_ID = "16L9GDzTaz04WeGMXCBzLlYans9Jm0Ys94txHpXz-uq8";
const PIN_CORRECTO = "1989";

let preguntas = [];
let indice = 0;
let aciertos = 0;



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



function generarChecks(){

const gen = document.getElementById("lista-general");
const esp = document.getElementById("lista-especifico");

TEMAS_GENERAL.forEach(t=>{
gen.innerHTML += `
<label>
<input type="checkbox" class="tema-check gen" value="${t.id}">
${t.nombre}
</label>`;
});

TEMAS_ESPECIFICO.forEach(t=>{
esp.innerHTML += `
<label>
<input type="checkbox" class="tema-check esp" value="${t.id}">
${t.nombre}
</label>`;
});

}



function seleccionar(estado,clase){

document.querySelectorAll(".tema-check."+clase)
.forEach(cb=>cb.checked=estado);

}



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



async function prepararQuiz(){

const temasSeleccionados=[
...document.querySelectorAll(".tema-check:checked")
].map(t=>t.value);

if(temasSeleccionados.length===0){
alert("Selecciona almenys un tema");
return;
}

preguntas=[];

for(let tema of temasSeleccionados){

try{

const p = await cargarPreguntas(tema);
preguntas = preguntas.concat(p);

}catch(e){

console.error("Error cargando:",tema);

}

}

if(preguntas.length===0){

alert("No s'han pogut carregar preguntes.");
return;

}

mezclar(preguntas);

let cantidad=parseInt(
document.getElementById("num-preguntas").value
);

preguntas=preguntas.slice(0,cantidad);

indice=0;
aciertos=0;

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

let q=preguntas[indice];

document.getElementById("pregunta").innerText=q.pregunta;

let html="";

["a","b","c","d"].forEach(letra=>{

html+=`
<button onclick="responder('${letra}')">
${q[letra]}
</button>`;

});

document.getElementById("opciones").innerHTML=html;

}



function responder(resp){

if(resp===preguntas[indice].correcta){
aciertos++;
}

indice++;

if(indice>=preguntas.length){
final();
}else{
mostrarPregunta();
}

}



function final(){

document.getElementById("pantalla-quiz").classList.add("oculto");
document.getElementById("pantalla-final").classList.remove("oculto");

document.getElementById("resultado").innerHTML=
`Encerts: ${aciertos} / ${preguntas.length}`;

}



window.onload=generarChecks;

