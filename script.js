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
// --- CONFIGURACIÓ DE TEMES COMPLETA (Segons la teva imatge) ---
const TEMAS_GENERAL = [
    { id: 'tg1', nombre: '1. Constitució i Estatut d\'Autonomia' },
    { id: 'tg2', nombre: '2. Organització de l\'Administració catalana' },
    { id: 'tg3', nombre: '3. El procediment administratiu' },
    { id: 'tg4', nombre: '4. El personal al servei de les adminitracions públiques' }
];

const TEMAS_ESPECIFICO = [
    { id: 'te1', nombre: '1. El Departament d\'Interior' },
    { id: 'te2', nombre: '2. Els Agents Rurals com a policia judicial' },
    { id: 'te3', nombre: '3. L\'activitat cinegètica a Catalunya' },
    { id: 'te4', nombre: '4. El Reglament d\'armes' },
    { id: 'te5', nombre: '5. L\'activitat piscícola a Catalunya' },
    { id: 'te6', nombre: '6. Protecció d\'animals' },
    { id: 'te7', nombre: '7. Protecció de la fauna salvatge' },
    { id: 'te8', nombre: '8. Espècies exòtiques invasores' },
    { id: 'te9', nombre: '9. Prevenció d\'incendis forestals' },
    { id: 'te10', nombre: '10. Regulació d\'infraestructures i activitats' },
    { id: 'te11', nombre: '11. Protecció i gestió de les forests' },
    { id: 'te12', nombre: '12. Normativa bàsica de la flora protegida' },
    { id: 'te13', nombre: '13. Conservació del patrimoni natural i de la biodiversitat' },
    { id: 'te14', nombre: '14. Protecció dels espais naturals terrestres i marítims' },
    { id: 'te15', nombre: '15. Regulació de l\'ús recreatiu dels espais naturals' },
    { id: 'te16', nombre: '16. Protecció del patrimoni cultural en el medi natural' },
    { id: 'te17', nombre: '17. Legislació en matèria d\'aigües a Catalunya' },
    { id: 'te18', nombre: '18. Gestió de residus' },
    { id: 'te19', nombre: '19. Les activitats extractives' },
    { id: 'te20', nombre: '20. Els plans de protecció civil a Catalunya' },
    { id: 'te21', nombre: '21. Geografia física i política de Catalunya' }
];

// --- GENERADOR D'INTERFAZ (NETEJA ABANS DE DIBUIXAR) ---
function generarChecks() {
    const genDiv = document.getElementById('lista-general');
    const espDiv = document.getElementById('lista-especifico');
    
    // IMPORTANT: Netejem el contingut actual per evitar duplicats
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
