# Apps Script (còpia de seguretat)

`apps-script-complet.gs` és el codi complet de l'Apps Script del Sheet (favorites, repàs espaiat SRS i **simulacres oficials**).
No conté cap clau ni PIN. Serveix de còpia de seguretat: el que està en marxa és el del Sheet (Extensions → Apps Script).

La part nova és l'acció `guardar_simulacre` (dins `manejarPeticion`) i el bloc «SIMULACRES OFICIALS» del final: escriu cada simulacre
a la pestanya **Simulacres** (idempotent per ID, data i hora en hora de Madrid, nota com a fórmula).

L'app només envia simulacres si a la pestanya **Config** la fila `sync_simulacres` és `SI`.
