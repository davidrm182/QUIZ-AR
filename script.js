const PIN_CORRECTO="1989";

function validarPin(){

const input=document.getElementById("pin-input").value;
const error=document.getElementById("error-pin");

if(input===PIN_CORRECTO){

document.getElementById("pantalla-bloqueo").classList.add("oculto");
document.getElementById("contingut-protegit").classList.remove("oculto");

}else{

error.classList.remove("oculto");

}

}



const TEMAS_GENERAL=[

{ id:"tg1", nombre:"1. Constitució i Estatut d'Autonomia" },
{ id:"tg2", nombre:"2. Organització de l'Administració catalana" },
{ id:"tg3", nombre:"3. Procediment administratiu" },
{ id:"tg4", nombre:"4. Personal de les administracions públiques" }

];



const TEMAS_ESPECIFICO=[

{ id:"te1", nombre:"1. Departament d'Interior" },
{ id:"te2", nombre:"2. Agents Rurals policia judicial" },
{ id:"te3", nombre:"3. Activitat cinegètica" },
{ id:"te4", nombre:"4. Reglament d'armes" },
{ id:"te5", nombre:"5. Activitat piscícola" },
{ id:"te6", nombre:"6. Protecció d'animals" }

];



function generarChecks(){

const gen=document.getElementById("lista-general");
const esp=document.getElementById("lista-especifico");

TEMAS_GENERAL.forEach(t=>{

gen.innerHTML+=`

<label>
<input type="checkbox" class="tema-check gen">
${t.nombre}
</label>

`;

});

TEMAS_ESPECIFICO.forEach(t=>{

esp.innerHTML+=`

<label>
<input type="checkbox" class="tema-check esp">
${t.nombre}
</label>

`;

});

}



function seleccionar(estado,clase){

document.querySelectorAll(".tema-check."+clase)
.forEach(cb=>cb.checked=estado);

}



let preguntas=[
{
p:"Quina és la capital de Catalunya?",
o:["Girona","Barcelona","Tarragona","Lleida"],
c:1
},
{
p:"Quants parcs naturals hi ha aproximadament a Catalunya?",
o:["5","10","15","20"],
c:1
}
];



let indice=0;
let aciertos=0;



function prepararQuiz(){

document.getElementById("pantalla-inicio").classList.add("oculto");
document.getElementById("pantalla-quiz").classList.remove("oculto");

mostrarPregunta();

}



function mostrarPregunta(){

let q=preguntas[indice];

document.getElementById("pregunta").innerText=q.p;

let html="";

q.o.forEach((op,i)=>{

html+=`<button onclick="responder(${i})">${op}</button>`;

});

document.getElementById("opciones").innerHTML=html;

}



function responder(i){

if(i===preguntas[indice].c){
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
