# Apps Script · Simulacres

`simulacres.gs` és el trosc que cal afegir a l'Apps Script del Sheet perquè els simulacres oficials es desin a la pestanya **Simulacres**.
Les instruccions (5 minuts, des del PC) són a la capçalera del propi fitxer.

Mentre no s'hagi fet això, l'app guarda els simulacres al mòbil i no envia res (la fila `sync_simulacres` de la pestanya **Config** és `NO`).
Quan l'Apps Script ja està desplegat, es canvia `sync_simulacres` a `SI` i els pendents pugen sols.
