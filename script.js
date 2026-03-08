const SHEET_ID = "16L9GDzTaz04WeGMXCBzLlYans9Jm0Ys94txHpXz-uq8";
const PIN_CORRECTO = "1989";
const URL_LOGS = "";

function registrarLog(accion, pin, resultado) {
fetch(URL_LOGS, {
method: "POST",
mode: "no-cors",
body: JSON.stringify({ accion: accion, pin: pin, resultado: resultado })
});
}

function validarPin() {
const input = document.getElementById("pin-input").value;
const errorMsg = document.getElementById("error-pin");

if(input === PIN_CORRECTO){
document.getElementById("pantalla-pin").classList.add("oculto");
document.getElementById("pantalla-config").classList.remove("oculto");
registrarLog("login", input, "correcto");
}else{
errorMsg.innerText = "PIN incorrecte";
registrarLog("login", input, "incorrecto");
}
}

const TEMAS_GENERAL = [
{ id: "tg1", nombre: "1. Constitució i Estatut d'Autonomia" },
{ id: "tg2", nombre: "2. Organització de l'Administració catalana" },
{ id: "tg3", nombre: "3. El procediment administratiu" },
{ id: "tg4", nombre: "4. El personal al servei de les administracions públiques" }
];

const TEMAS_ESPECIFICO = [
{ id: "te1", nombre: "1. El Departament d'Interior" },
{ id: "te2", nombre: "2. Els Agents Rurals com a policia judicial" },
{ id: "te3", nombre: "3. L'activitat cinegètica a Catalunya" },
{ id: "te4", nombre: "4. El Reglament d'armes" },
{ id: "te5", nombre: "5. L'activitat piscícola a Catalunya" },
{ id: "te6", nombre: "6. Protecció d'animals" },
{ id: "te7", nombre: "7. Protecció de la fauna salvatge" },
{ id: "te8", nombre: "8. Espècies exòtiques invasores" },
{ id: "te9", nombre: "9. Prevenció d'incendis forestals" },
{ id: "te10", nombre: "10. Regulació d'infraestructures i activitats" },
{ id: "te11", nombre: "11. Protecció i gestió de les forests" },
{ id: "te12", nombre: "12. Normativa bàsica de la flora protegida" },
{ id: "te13", nombre: "13. Conservació del patrimoni natural i de la biodiversitat" },
{ id: "te14", nombre: "14. Protecció dels espais naturals terrestres i marítims" },
{ id: "te15", nombre: "15. Regulació de l'ús recreatiu dels espais naturals" },
{ id: "te16", nombre: "16. Protecció del patrimoni cultural en el medi natural" },
{ id: "te17", nombre: "17. Legislació en matèria d'aigües a Catalunya" },
{ id: "te18", nombre: "18. Gestió de residus" },
{ id: "te19", nombre: "19. Les activitats extractives" },
{ id: "te20", nombre: "20. Els plans de protecció civil a Catalunya" },
{ id: "te21", nombre: "21. Geografia física i política de Catalunya" }
];

function generarChecks() {

const genDiv = document.getElementById("lista-general");
const espDiv = document.getElementById("lista-especifico");

if (!genDiv || !espDiv) return;

TEMAS_GENERAL.forEach(t=>{
genDiv.innerHTML += `
<label>
<input type="checkbox" class="tema-check general" value="${t.id}">
${t.nombre}
</label><br>`;
});

TEMAS_ESPECIFICO.forEach(t=>{
espDiv.innerHTML += `
<label>
<input type="checkbox" class="tema-check especifico" value="${t.id}">
${t.nombre}
</label><br>`;
});

}

function seleccionar(estado, clase) {
document.querySelectorAll(".tema-check." + clase).forEach(cb => cb.checked = estado);
}

let preguntasTotales = [];
let indicePregunta = 0;
let aciertos = 0;
let fallos = 0;
let blancos = 0;
let tiempoRestante;
let intervalo;

async function prepararQuiz() {

const checks = document.querySelectorAll(".tema-check:checked");
const cantidad = parseInt(document.getElementById("num-preguntas").value);
const minutos = parseInt(document.getElementById("tiempo-test").value);

if(checks.length === 0){
alert("Selecciona almenys un tema");
return;
}

tiempoRestante = minutos * 60;

document.getElementById("pantalla-config").classList.add("oculto");
document.getElementById("pantalla-quiz").classList.remove("oculto");

iniciarCronometro();

}

function actualizarMarcador() {

let notaActual = aciertos - (fallos * 0.25);

document.getElementById("contador").innerHTML =
`Pregunta ${indicePregunta + 1} de ${preguntasTotales.length}<br>
<span style="color:#4CAF50">✅ ${aciertos}</span> |
<span style="color:#f44336">❌ ${fallos}</span> |
<span>Nota: <strong>${Math.max(0, notaActual).toFixed(2)}</strong></span>`;

}

function iniciarCronometro() {

if(intervalo) clearInterval(intervalo);

intervalo = setInterval(()=>{

tiempoRestante--;

let m = Math.floor(tiempoRestante / 60);
let s = tiempoRestante % 60;

document.getElementById("timer").innerText =
`${m}:${s < 10 ? "0"+s : s}`;

if(tiempoRestante <= 0){

clearInterval(intervalo);
mostrarFinal();

}

},1000);

}

function mostrarPregunta(){

if(indicePregunta >= preguntasTotales.length){

clearInterval(intervalo);
mostrarFinal();
return;

}

}

function verificar(resp, boton){

let p = preguntasTotales[indicePregunta];

if(p.estado) return;

if(resp === p.correcta){

aciertos++;
boton.style.background = "#4CAF50";

}else{

fallos++;
boton.style.background = "#f44336";

}

p.estado = true;

actualizarMarcador();

}

function mostrarExtra(){

let p = preguntasTotales[indicePregunta];

alert("INFORMACIÓ EXTRA:\n\n" + p.extra);

}

function anterior(){

if(indicePregunta > 0){

indicePregunta--;
mostrarPregunta();

}

}

function gestionarSiguiente(){

let p = preguntasTotales[indicePregunta];

if(!p.estado) blancos++;

indicePregunta++;
mostrarPregunta();

}

function mostrarFinal(){

if(intervalo) clearInterval(intervalo);

document.getElementById("pantalla-quiz").classList.add("oculto");
document.getElementById("pantalla-final").classList.remove("oculto");

let nota = aciertos - (fallos * 0.25);

if(nota < 0) nota = 0;

document.getElementById("resultado-final").innerHTML =
`Aciertos: ${aciertos}<br>
Fallos: ${fallos}<br>
En blanco: ${blancos}<br>
Nota final: <strong>${nota.toFixed(2)}</strong>`;

}

window.onload = generarChecks;

}
