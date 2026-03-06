const SHEET_ID = '16L9GDzTaz04WeGMXCBzLlYans9Jm0Ys94txHpXz-uq8'; 
let preguntasTotales = [], indicePregunta = 0, aciertos = 0, fallos = 0, blancos = 0;
let tiempoRestante, intervalo;

async function prepararQuiz() {
    const checks = document.querySelectorAll('.tema-check:checked');
    const cantidad = parseInt(document.getElementById('num-preguntas').value);
    const minutos = parseInt(document.getElementById('tiempo-test').value);
    
    if (checks.length === 0) return alert("Por favor, selecciona al menos un tema.");

    document.getElementById('pantalla-inicio').innerHTML = "<h2>Generando simulacro forestal...</h2>";
    
    for (let check of checks) {
        const URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${check.value}`;
        try {
            const res = await fetch(URL);
            const texto = await res.text();
            const json = JSON.parse(texto.substring(texto.indexOf('{'), texto.lastIndexOf('}') + 1));
            const filas = json.table.rows.slice(1).map(row => ({
                pregunta: row.c[0]?.v || '', a: row.c[1]?.v || '', b: row.c[2]?.v || '',
                c: row.c[3]?.v || '', d: row.c[4]?.v || '',
                correcta: row.c[5]?.v.toString().toLowerCase().trim() || ''
            }));
            preguntasTotales = preguntasTotales.concat(filas);
        } catch (e) { console.error(e); }
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
    document.getElementById('contador').innerText = `PREGUNTA ${indicePregunta + 1} DE ${preguntasTotales.length}`;
    document.getElementById('pregunta').innerText = p.pregunta;
    document.getElementById('opciones').innerHTML = `
        <button onclick="verificar('a', this)">A) ${p.a}</button>
        <button onclick="verificar('b', this)">B) ${p.b}</button>
        <button onclick="verificar('c', this)">C) ${p.c}</button>
        <button onclick="verificar('d', this)">D) ${p.d}</button>
    `;
}

function verificar(resp, boton) {
    let correcta = preguntasTotales[indicePregunta].correcta;
    let botones = document.getElementById('opciones').getElementsByTagName('button');
    clearInterval(intervalo); 
    
    for (let b of botones) {
        b.disabled = true;
        // SOLUCIÓN AL PROBLEMA: Buscar la correcta y ponerla VERDE ENTERA
        if (b.innerText.toLowerCase().trim().startsWith(correcta)) {
            b.style.background = "#2e7d32"; // Verde fuerte completo
            b.style.color = "white";
            b.style.fontWeight = "bold";
            if (resp !== correcta) b.innerText = "✅ " + b.innerText; // Añadir check visual
        }
    }

    document.getElementById('btn-blanco').classList.add('oculto');

    if (resp === correcta) {
        aciertos++;
    } else {
        boton.style.background = "#c62828"; // Rojo fuerte completo para tu fallo
        boton.style.color = "white";
        boton.innerText = "❌ " + boton.innerText; // Añadir aspa visual
        fallos++;
    }
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
        <h1 style="color:#ff9800">Simulacro Finalizado</h1>
        <p style="font-size:24px; text-align:center;">Nota Neta: <strong>${nota.toFixed(2)}</strong></p>
        <hr>
        <div style="font-size:18px; line-height:2;">
            <p>✅ Encrtos: <strong style="color:#4CAF50">${aciertos}</strong></p>
            <p>❌ Errades: <strong style="color:#f44336">${fallos}</strong> (-${(fallos*0.25).toFixed(2)})</p>
            <p>⚪ En blanc: <strong>${blancos}</strong></p>
        </div>
    `;
}
