# Apps Script (còpia de seguretat)

`apps-script-complet.gs` és el codi de l'Apps Script del Sheet (favorites, repàs espaiat SRS i **simulacres oficials**).
No conté cap clau ni PIN. Serveix de còpia de seguretat: el que està en marxa és el del Sheet (Extensions → Apps Script).
⚠️ El codi en marxa ja té més coses que aquesta còpia (p. ex. les columnes de temps dels psicotècnics a «Simulacres»):
no l'enganxis per sobre del que hi ha al Sheet.

La part nova és l'acció `guardar_simulacre` (dins `manejarPeticion`) i el bloc «SIMULACRES OFICIALS» del final: escriu cada simulacre
a la pestanya **Simulacres** (idempotent per ID, data i hora en hora de Madrid, nota com a fórmula).

L'app només envia simulacres si a la pestanya **Config** la fila `sync_simulacres` és `1`.

## Detall dels simulacres (v7.2)

`detall-simulacres.gs` afegeix l'acció `guardar_detall_simulacre`: en acabar cada Simulacre Oficial, l'app envia
les 80 preguntes (una fila per pregunta) a la pestanya **SimulacresDetall**, per poder revisar-lo des de l'historial.
Les instruccions d'instal·lació són a dalt del fitxer (enganxar el bloc + 4 línies dins `manejarPeticion` + nova versió).

L'app només envia el detall si a **Config** la fila `sync_detall` és `1`. Mentrestant, el detall queda guardat al mòbil
(i ja es pot revisar des d'aquell mateix dispositiu).
