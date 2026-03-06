const SHEET_ID = '16L9GDzTaz04WeGMXCBzLlYans9Jm0Ys94txHpXz-uq8'; 
let preguntasTotales = [];
let indicePregunta = 0;
let aciertos = 0;
let fallos = 0;
let blancos = 0;
const PENALIZACION = 0.25; 

async function prepararQuiz() {
    const checks = document.querySelectorAll('.tema-check:checked');
    const cantidad = parseInt(document.getElementById('num-preguntas').value);
    
    if (checks.length === 0) {
        alert("Selecciona al menos un tema");
        return;
    }

    aciertos = 0; fallos = 0; blancos = 0; indicePregunta = 0;
    document.getElementById('pantalla-inicio').innerHTML = "<h2>Cargando temas...</h2>";
    preguntasTotales = [];

    for (let check of checks) {
        const nombreTema = check.value;
        const URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${nombreTema}`;
        try {
            const res = await fetch(URL);
            const texto = await res.text();
            const json = JSON.parse(texto.substring(texto.indexOf('{'), texto.lastIndexOf('}') + 1));
            const filas = json.table.rows.slice(1).map(row => ({
                pregunta: row.c[0]?.v || '',
                a: row.c[1]?.v || '',
                b: row.c[2]?.v || '',
                c: row.c[3]?.v || '',
                d: row.c[4]?.v || '',
                correcta: row.c[5]?.v.toString().toLowerCase().trim() || ''
            }));
            preguntasTotales = preguntasTotales.concat(filas);
        } catch (e) { console.error(e); }
    }

    preguntasTotales.sort(() => Math.random() - 0.5);
    preguntasTotales = preguntasTotales.slice(0, cantidad);

    document.getElementById('pantalla-inicio').classList.add('oculto');
    document.getElementById('pantalla-quiz').classList.remove('oculto');
    mostrarPregunta();
}

function mostrarPregunta() {
    if (indicePregunta >= preguntasTotales.length) {
        mostrarFinal();
        return;
    }
    document.getElementById('btn-siguiente').classList.add('oculto');
    document.getElementById('btn-blanco').classList.remove('oculto');
    let p = preguntasTotales[indicePregunta];
    document.getElementById('contador').innerText = `Pregunta ${indicePregunta + 1} de ${preguntasTotales.length}`;
    document.getElementById('pregunta').innerText = p.pregunta;
    document.getElementById('opciones').innerHTML = `
        <button onclick="verificar('a', this)">${p.a}</button>
        <button onclick="verificar('b', this)">${p.b}</button>
        <button onclick="verificar('c', this)">${p.c}</button>
        <button onclick="verificar('d', this)">${p.d}</button>
    `;
}

function verificar(respuestaUsuario, boton) {
    let correcta = preguntasTotales[indicePregunta].correcta;
    let botones = document.getElementById('opciones').getElementsByTagName('button');
    for (let b of botones) { b.disabled = true; }
    document.getElementById('btn-blanco').classList.add('oculto');
    if (respuestaUsuario === correcta) {
        boton.style.backgroundColor = "#4CAF50"; 
        boton.style.color = "white";
        aciertos++;
    } else {
        boton.style.backgroundColor = "#f44336"; 
        boton.style.color = "white";
        fallos++;
        for (let b of botones) {
            if (b.innerText.toLowerCase().trim().startsWith(correcta)) {
                b.style.border = "3px solid #4CAF50";
            }
        }
    }
    document.getElementById('btn-siguiente').classList.remove('oculto');
}

function dejarEnBlanco() {
    blancos++;
    siguiente();
}

function siguiente() {
    indicePregunta++;
    mostrarPregunta();
}

function mostrarFinal() {
    document.getElementById('pantalla-quiz').classList.add('oculto');
    document.getElementById('pantalla-final').classList.remove('oculto');
    let notaFinal = aciertos - (fallos * PENALIZACION);
    if (notaFinal < 0) notaFinal = 0;
    document.getElementById('resultado').innerHTML = `
        <h2>Resultados</h2>
        <p>✅ Enciertos: <strong>${aciertos}</strong></p>
        <p>❌ Errades: <strong>${fallos}</strong> (-${(fallos * PENALIZACION).toFixed(2)})</p>
        <p>⚪ En blanc: <strong>${blancos}</strong></p>
        <hr>
        <h1 style="color: #2196F3;">NOTA: ${notaFinal.toFixed(2)}</h1>
    `;
}
