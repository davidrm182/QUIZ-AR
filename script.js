const SHEET_ID = '16L9GDzTaz04WeGMXCBzLlYans9Jm0Ys94txHpXz-uq8';
const PIN_CORRECTO = "1989"; // CAMBIA TU PIN AQUÍ

// Función para desbloquear
function validarPin() {
    const input = document.getElementById('pin-input').value;
    if (input === PIN_CORRECTO) {
        document.getElementById('pantalla-bloqueo').classList.add('oculto');
        document.getElementById('contingut-protegit').classList.remove('oculto');
        generarChecks(); 
    } else {
        document.getElementById('error-pin').classList.remove('oculto');
        document.getElementById('pin-input').value = "";
    }
}
// --- CONFIGURACIÓ DE TEMES COMPLETA ---
const TEMAS_GENERAL = [
    { id: 'tema1', nombre: '1. constitució i estatut d\'autonomia' },
    { id: 'tema2', nombre: '2. organització de l\'administració catalana' },
    { id: 'tema3', nombre: '3. el procediment administratiu' },
    { id: 'tema4', nombre: '4. el personal al servei de les administracions públiques' }
];

const TEMAS_ESPECIFICO = [
    { id: 'tema5', nombre: '1. el departament d\'interior' },
    { id: 'tema6', nombre: '2. els agents rurals com a policia judicial' },
    { id: 'tema7', nombre: '3. l\'activitat cinegètica a catalunya' },
    { id: 'tema8', nombre: '4. el reglament d\'armes' },
    { id: 'tema9', nombre: '5. l\'activitat piscícola a catalunya' },
    { id: 'tema10', nombre: '6. protecció d\'animals' },
    { id: 'tema11', nombre: '7. protecció de la fauna salvatge' },
    { id: 'tema12', nombre: '8. espècies exòtiques invasores' },
    { id: 'tema13', nombre: '9. prevenció d\'incendis forestals' },
    { id: 'tema14', nombre: '10. regulació d\'infraestructures i activitats' },
    { id: 'tema15', nombre: '11. protecció i gestió de les forests' },
    { id: 'tema16', nombre: '12. normativa bàsica de la flora protegida' },
    { id: 'tema17', nombre: '13. conservació del patrimoni natural i biodiversitat' },
    { id: 'tema18', nombre: '14. protecció d\'espais naturals terrestres i marítims' },
    { id: 'tema19', nombre: '15. regulació de l\'ús recreatiu dels espais naturals' },
    { id: 'tema20', nombre: '16. protecció del patrimoni cultural en el medi natural' },
    { id: 'tema21', nombre: '17. legislació en matèria d\'aigües a catalunya' },
    { id: 'tema22', nombre: '18. gestió de residus' },
    { id: 'tema23', nombre: '19. les activitats extractives' },
    { id: 'tema24', nombre: '20. els plans de protecció civil a catalunya' },
    { id: 'tema25', nombre: '21. geografia física i política de catalunya' }
];

// --- GENERADOR D'INTERFAZ (SENSE DUPLICATS) ---
function generarChecks() {
    const genDiv = document.getElementById('lista-general');
    const espDiv = document.getElementById('lista-especifico');
    
    // NETEJEM primer per evitar duplicats si es clica entrar dues vegades
    genDiv.innerHTML = "";
    espDiv.innerHTML = "";
    
    TEMAS_GENERAL.forEach(t => {
        genDiv.innerHTML += `<label><input type="checkbox" class="tema-check gen" value="${t.id}"> ${t.nombre}</label>`;
    });
    
    TEMAS_ESPECIFICO.forEach(t => {
        espDiv.innerHTML += `<label><input type="checkbox" class="tema-check esp" value="${t.id}"> ${t.nombre}</label>`;
    });
}

function seleccionar(estado, clase) {
    document.querySelectorAll('.' + clase).forEach(cb => cb.checked = estado);
}

// --- LÒGICA DEL TEST ---
let preguntasTotales = [], indicePregunta = 0, aciertos = 0, fallos = 0, blancos = 0;
let tiempoRestante, intervalo;
let respondida = false; // Control per saber si l'usuari ha clicat una opció

async function prepararQuiz() {
    const checks = document.querySelectorAll('.tema-check:checked');
    const cantidad = parseInt(document.getElementById('num-preguntas').value);
    const minutos = parseInt(document.getElementById('tiempo-test').value);
    
    if (checks.length === 0) return alert("selecciona temes primer");

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
    
    respondida = false; 
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
    if(respondida) return; 
    
    let correcta = preguntasTotales[indicePregunta].correcta;
    let botones = document.getElementById('opciones').getElementsByTagName('button');
    const mapeo = { 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
    
    respondida = true;
    clearInterval(intervalo); 
    
    for (let b of botones) b.disabled = true;
    
    let indexCorrecta = mapeo[correcta];
    if(botones[indexCorrecta]) {
        botones[indexCorrecta].style.background = "#2e7d32";
        botones[indexCorrecta].style.fontWeight = "bold";
        botones[indexCorrecta].innerText = "✅ " + botones[indexCorrecta].innerText;
    }

    if (resp === correcta) {
        aciertos++;
    } else {
        boton.style.background = "#c62828";
        boton.style.fontWeight = "bold";
        boton.innerText = "❌ " + boton.innerText;
        fallos++;
    }
    iniciarCronometro();
}

function gestionarSiguiente() {
    if (!respondida) {
        blancos++; 
    }
    indicePregunta++;
    mostrarPregunta();
}

function mostrarFinal() {
    clearInterval(intervalo);
    document.getElementById('pantalla-quiz').classList.add('oculto');
    document.getElementById('pantalla-final').classList.remove('oculto');
    let nota = aciertos - (fallos * 0.25);
    if (nota < 0) nota = 0;
    
    document.getElementById('resultado').innerHTML = `
        <h1 style="color:#ff9800">simulacre finalitzat</h1>
        <p style="font-size:24px; text-align:center;">nota neta: <strong>${nota.toFixed(2)}</strong></p>
        <hr>
        <div style="font-size:18px; line-height:2;">
            <p>✅ encerts: <strong style="color:#4CAF50">${aciertos}</strong></p>
            <p>❌ errades: <strong style="color:#f44336">${fallos}</strong></p>
            <p>⚪ en blanc: <strong>${blancos}</strong></p>
        </div>
    `;
}
