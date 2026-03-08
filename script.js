const SHEET_ID = '16L9GDzTaz04WeGMXCBzLlYans9Jm0Ys94txHpXz-uq8';
const PIN_CORRECTO = "1989";
const URL_LOGS = "";

function registrarLog(accion, pin, resultado) {
fetch(URL_LOGS, {
method: 'POST',
mode: 'no-cors',
body: JSON.stringify({ accion: accion, pin: pin, resultado: resultado })
});
}

function validarPin() {
const input = document.getElementById('pin-input').value;
const errorMsg = document.getElementById('error-pin');
if (input === PIN_CORRECTO) {
registrarLog("Login", "*****", "✅ ACCÉS CORRECTE");
document.getElementById('pantalla-bloqueo').classList.add('oculto');
document.getElementById('contingut-protegit').classList.remove('oculto');
generarChecks();
} else {
registrarLog("Login", input, "❌ PIN INCORRECTE");
errorMsg.classList.remove('oculto');
document.getElementById('pin-input').value = "";
}
}

const TEMAS_GENERAL = [
{ id: 'tg1', nombre: '1. Constitució i Estatut d'Autonomia' },
{ id: 'tg2', nombre: '2. Organització de l'Administració catalana' },
{ id: 'tg3', nombre: '3. El procediment administratiu' },
{ id: 'tg4', nombre: '4. El personal al servei de les adminitracions públiques' }
];

const TEMAS_ESPECIFICO = [
{ id: 'te1', nombre: '1. El Departament d'Interior' },
{ id: 'te2', nombre: '2. Els Agents Rurals com a policia judicial' },
{ id: 'te3', nombre: '3. L'activitat cinegètica a Catalunya' },
{ id: 'te4', nombre: '4. El Reglament d'armes' },
{ id: 'te5', nombre: '5. L'activitat piscícola a Catalunya' },
{ id: 'te6', nombre: '6. Protecció d'animals' },
{ id: 'te7', nombre: '7. Protecció de la fauna salvatge' },
{ id: 'te8', nombre: '8. Espècies exòtiques invasores' },
{ id: 'te9', nombre: '9. Prevenció d'incendis forestals' },
{ id: 'te10', nombre: '10. Regulació d'infraestructures i activitats' },
{ id: 'te11', nombre: '11. Protecció i gestió de les forests' },
{ id: 'te12', nombre: '12. Normativa bàsica de la flora protegida' },
{ id: 'te13', nombre: '13. Conservació del patrimoni natural i de la biodiversitat' },
{ id: 'te14', nombre: '14. Protecció dels espais naturals terrestres i marítims' },
{ id: 'te15', nombre: '15. Regulació de l'ús recreatiu dels espais naturals' },
{ id: 'te16', nombre: '16. Protecció del patrimoni cultural en el medi natural' },
{ id: 'te17', nombre: '17. Legislació en matèria d'aigües a Catalunya' },
{ id: 'te18', nombre: '18. Gestió de residus' },
{ id: 'te19', nombre: '19. Les activitats extractives' },
{ id: 'te20', nombre: '20. Els plans de protecció civil a Catalunya' },
{ id: 'te21', nombre: '21. Geografia física i política de Catalunya' }
];

function generarChecks() {
const genDiv = document.getElementById('lista-general');
const espDiv = document.getElementById('lista-especifico');
if (genDiv && espDiv) {
genDiv.innerHTML = ""; espDiv.innerHTML = "";
TEMAS_GENERAL.forEach(t => { genDiv.innerHTML += <label><input type="checkbox" class="tema-check gen" value="${t.id}"> ${t.nombre}</label>; });
TEMAS_ESPECIFICO.forEach(t => { espDiv.innerHTML += <label><input type="checkbox" class="tema-check esp" value="${t.id}"> ${t.nombre}</label>; });
}
}

function seleccionar(estado, clase) {
document.querySelectorAll('.tema-check.' + clase).forEach(cb => cb.checked = estado);
}

let preguntasTotales = [], indicePregunta = 0, aciertos = 0, fallos = 0, blancos = 0;
let tiempoRestante, intervalo;

async function prepararQuiz() {
const checks = document.querySelectorAll('.tema-check:checked');
const cantidad = parseInt(document.getElementById('num-preguntas').value);
const minutos = parseInt(document.getElementById('tiempo-test').value);
if (checks.length === 0) return alert("selecciona temes primer");
preguntasTotales = [];
indicePregunta = 0; aciertos = 0; fallos = 0; blancos = 0;
document.getElementById('pantalla-inicio').innerHTML = "<h2>carregant preguntes...</h2>";
for (let check of checks) {
const URL = https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${check.value};
try {
const res = await fetch(URL);
const texto = await res.text();
const json = JSON.parse(texto.substring(texto.indexOf('{'), texto.lastIndexOf('}') + 1));
const filas = json.table.rows.slice(1).map(row => {
let pObj = {
pregunta: row.c[0]?.v || '',
a: row.c[1]?.v || '', b: row.c[2]?.v || '', c: row.c[3]?.v || '', d: row.c[4]?.v || '',
correcta: row.c[5]?.v?.toString().toLowerCase().trim() || '',
extra: row.c[6]?.v || 'No hi ha informació extra disponible.',
estado: null,
respuestaUsuario: null,
opcionesMezcladas: []
};
let opts = [{id:'a', t:pObj.a}, {id:'b', t:pObj.b}, {id:'c', t:pObj.c}, {id:'d', t:pObj.d}];
pObj.opcionesMezcladas = opts.sort(() => Math.random() - 0.5);
return pObj;
});
preguntasTotales = preguntasTotales.concat(filas);
} catch (e) { console.error("Error en tema: " + check.value); }
}
if (preguntasTotales.length === 0) {
alert("No s'han trobat preguntes.");
location.reload();
return;
}
preguntasTotales.sort(() => Math.random() - 0.5);
preguntasTotales = preguntasTotales.slice(0, cantidad);
if (minutos > 0) {
tiempoRestante = minutos * 60;
iniciarCronometro();
} else {
document.getElementById('timer').innerText = "∞";
}
document.getElementById('pantalla-inicio').classList.add('oculto');
document.getElementById('pantalla-quiz').classList.remove('oculto');
mostrarPregunta();
}

function actualizarMarcador() {
let notaActual = aciertos - (fallos * 0.25);
document.getElementById('contador').innerHTML = Pregunta ${indicePregunta + 1} de ${preguntasTotales.length}<br><span style="color:#4CAF50">✅ ${aciertos}</span> | <span style="color:#f44336">❌ ${fallos}</span> | <span>Nota: <strong>${Math.max(0, notaActual).toFixed(2)}</strong></span>;
}

function iniciarCronometro() {
if(intervalo) clearInterval(intervalo);
intervalo = setInterval(() => {
tiempoRestante--;
let m = Math.floor(tiempoRestante / 60);
let s = tiempoRestante % 60;
document.getElementById('timer').innerText = ${m}:${s < 10 ? '0'+s : s};
if (tiempoRestante <= 0) { clearInterval(intervalo); mostrarFinal(); }
}, 1000);
}

function mostrarPregunta() {
if (indicePregunta >= preguntasTotales.length) { clearInterval(intervalo); mostrarFinal(); return; }
let p = preguntasTotales[indicePregunta];
document.getElementById('pregunta').innerText = p.pregunta;
actualizarMarcador();
let htmlOpts = "";
p.opcionesMezcladas.forEach(opt => {
let color = "#3e3123";
let extraEstilo = "";
if (p.estado) {
extraEstilo = "disabled";
if (opt.id === p.correcta) color = "#2e7d32";
else if (opt.id === p.respuestaUsuario) color = "#c62828";
}
htmlOpts += <button ${extraEstilo} onclick="verificar('${opt.id}', this)" style="background:${color}; margin: 5px 0;">${opt.t}</button>;
});
document.getElementById('opciones').innerHTML = htmlOpts;
document.getElementById('contenedor-controles').innerHTML = <div style="display:flex; gap:10px; margin-top:10px;"><button onclick="anterior()" style="background:#444; flex:1">⬅</button><button id="btn-lupa" onclick="mostrarExtra()" style="background:#ff9800; color:#000; flex:0.5; display:${p.estado ? 'block' : 'none'}">🔍</button><button onclick="gestionarSiguiente()" style="background:var(--accent); color:#1a1a1a; flex:1">➡</button></div>;
}

function verificar(resp, boton) {
let p = preguntasTotales[indicePregunta];
if (p.estado) return;
p.respuestaUsuario = resp;
if (resp === p.correcta) { p.estado = 'correcte'; aciertos++; }
else { p.estado = 'incorrecte'; fallos++; }
mostrarPregunta();
}

function mostrarExtra() {
let p = preguntasTotales[indicePregunta];
alert("INFORMACIÓ EXTRA:\n\n" + p.extra);
}

function anterior() {
if (indicePregunta > 0) { indicePregunta--; mostrarPregunta(); }
}

function gestionarSiguiente() {
let p = preguntasTotales[indicePregunta];
if (!p.estado) blancos++;
indicePregunta++;
mostrarPregunta();
}

function mostrarFinal() {
if (intervalo) clearInterval(intervalo);
document.getElementById('pantalla-quiz').classList.add('oculto');
document.getElementById('pantalla-final').classList.remove('oculto');
let nota = aciertos - (fallos * 0.25);
if (nota < 0) nota = 0;
registrarLog("Final Test", "-", Nota: ${nota.toFixed(2)} (A:${aciertos} F:${fallos}));
document.getElementById('resultado').innerHTML = <h1 style="color:#ff9800">resultat final</h1><p style="font-size:32px; text-align:center;"><strong>${nota.toFixed(2)}</strong></p><hr><div style="font-size:18px; line-height:2;"><p>✅ encerts: <strong style="color:#4CAF50">${aciertos}</strong></p><p>❌ errades: <strong style="color:#f44336">${fallos}</strong></p><p>⚪ en blanc: <strong>${preguntasTotales.length - (aciertos + fallos)}</strong></p></div>;
}
