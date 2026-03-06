const SHEET_ID = '16L9GDzTaz04WeGMXCBzLlYans9Jm0Ys94txHpXz-uq8';

// --- CONFIGURACIÓN DE TEMAS ---
// El "id" debe ser el nombre de la pestaña en Excel.
const TEMAS_GENERAL = [
    { id: 'tg1', nombre: '1. Constitució i Estatut d\'Autonomia' },
    { id: 'tg2', nombre: '2. Organització de l\'Administració catalana' },
    { id: 'tg3', nombre: '3. El procediment administratiu' },
    { id: 'tg4', nombre: '4. Funcio Pública' }
];

const TEMAS_ESPECIFICO = [
    { id: 'te1', nombre: '1. El Departament d\'Interior i Seguretat Pública' },
    { id: 'te2', nombre: '2. Agents Rurals com a Policia Judicial' },
    { id: 'te5', nombre: '5. Pesca Continental' },
    // Añade aquí del 5 al 21 siguiendo el mismo formato
];

// --- GENERADOR DE INTERFAZ ---
function generarChecks() {
    const genDiv = document.getElementById('lista-general');
    const espDiv = document.getElementById('lista-especifico');
    
    TEMAS_GENERAL.forEach(t => {
        genDiv.innerHTML += `<label><input type="checkbox" class="tema-check gen" value="${t.id}"> ${t.nombre}</label>`;
    });
    
    TEMAS_ESPECIFICO.forEach(t => {
        espDiv.innerHTML += `<label><input type="checkbox" class="tema-check esp" value="${t.id}"> ${t.nombre}</label>`;
    });
}
generarChecks();

function seleccionar(estado, clase) {
    document.querySelectorAll('.' + clase).forEach(cb => cb.checked = estado);
}

// --- LÓGICA DEL TEST ---
let preguntasTotales = [], indicePregunta = 0, aciertos = 0, fallos = 0, blancos = 0;
let tiempoRestante, intervalo;

async function prepararQuiz() {
    const checks = document.querySelectorAll('.tema-check:checked');
    const cantidad = parseInt(document.getElementById('num-preguntas').value);
    const minutos = parseInt(document.getElementById('tiempo-test').value);
    
    if (checks.length === 0) return alert("selecciona temes primero");

    document.getElementById('pantalla-inicio').innerHTML = "<h2>carregant preguntes...</h2>";
    
    for (let check of checks) {
        const URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${check.value}`;
        try {
            const res = await fetch(URL);
            const texto = await res.text();
            const json = JSON.parse(texto.substring(texto.indexOf('{'), texto.lastIndexOf('}') + 1));
            const filas = json.table.rows.slice(1).map(row => ({
                pregunta: row.c[0]?.v || '', a: row.c[1]?.v || '', b: row.c[2]?.v || '',
                c: row.c[3]?.v || '', d: row.c[4]?.v || '',
                correcta: row.c[5]?.v?.toString().toLowerCase().trim() || ''
            }));
            preguntasTotales = preguntasTotales.concat(filas);
        } catch (e) { console.error("Error en tema: " + check.value); }
    }

    preguntasTotales.sort(() => Math.random() - 0.5);
    preguntasTotales = preguntasTotales.slice(0, cantidad);
    tiempoRestante = minutos * 60;
    iniciarCronometro();
    document.getElementById('pantalla-inicio').classList.add('oculto');
    document.getElementById('pantalla-quiz').classList.remove('oculto');
    mostrarPregunta();
}

function iniciarCronometro() {
    intervalo = setInterval(() => {
        tiempoRestante--;
        let m = Math.floor(tiempoRestante / 60);
        let s = tiempoRestante % 60;
        document.getElementById('timer').innerText = `${m}:${s < 10 ? '0'+s : s}`;
        if (tiempoRestante <= 0) { clearInterval(intervalo); mostrarFinal(); }
    }, 1000);
}

function mostrarPregunta() {
    if (indicePregunta >= preguntasTotales.length) { clearInterval(intervalo); mostrarFinal(); return; }
    document.getElementById('btn-siguiente').classList.add('oculto');
    document.getElementById('btn-blanco').classList.remove('oculto');
    let p = preguntasTotales[indicePregunta];
    document.getElementById('contador').innerText = `pregunta ${indicePregunta + 1} de ${preguntasTotales.length}`;
    document.getElementById('pregunta').innerText = p.pregunta;
    document.getElementById('opciones').innerHTML = `
        <button onclick="verificar('a', this)">${p.a}</button>
        <button onclick="verificar('b', this)">${p.b}</button>
        <button onclick="verificar('c', this)">${p.c}</button>
        <button onclick="verificar('d', this)">${p.d}</button>
    `;
}

function verificar(resp, boton) {
    let correcta = preguntasTotales[indicePregunta].correcta;
    let botones = document.getElementById('opciones').getElementsByTagName('button');
    const mapeo = { 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
    clearInterval(intervalo); 
    for (let b of botones) b.disabled = true;
    
    if(botones[mapeo[correcta]]) {
        botones[mapeo[correcta]].style.background = "#2e7d32";
        botones[mapeo[correcta]].innerText = "✅ " + botones[mapeo[correcta]].innerText;
    }

    if (resp === correcta) {
        aciertos++;
    } else {
        boton.style.background = "#c62828";
        boton.innerText = "❌ " + boton.innerText;
        fallos++;
    }
    document.getElementById('btn-blanco').classList.add('oculto');
    document.getElementById('btn-siguiente').classList.remove('oculto');
    iniciarCronometro();
}

function dejarEnBlanco() { blancos++; indicePregunta++; mostrarPregunta(); }
function siguiente() { indicePregunta++; mostrarPregunta(); }

function mostrarFinal() {
    clearInterval(intervalo);
    document.getElementById('pantalla-quiz').classList.add('oculto');
    document.getElementById('pantalla-final').classList.remove('oculto');
    let nota = aciertos - (fallos * 0.25);
    document.getElementById('resultado').innerHTML = `
        <h1 style="color:#ff9800">simulacre finalitzat</h1>
        <p style="font-size:24px; text-align:center;">nota: <strong>${nota.toFixed(2)}</strong></p>
        <hr>
        <p>encerts: <strong style="color:#4CAF50">${aciertos}</strong></p>
        <p>errades: <strong style="color:#f44336">${fallos}</strong></p>
        <p>en blanc: <strong>${blancos}</strong></p>
    `;
}
