# Super Thombo

Ein Browser-Jump-and-Run durch acht Computerwelten, ohne Build-Schritt oder externe Laufzeit-Abhängigkeiten.

## Starten

`index.html` im Browser öffnen oder den Ordner mit einem statischen Webserver bereitstellen. Alle Pfade sind relativ, damit das Spiel auch unter GitHub Pages in `/super-thombo/` funktioniert.

## Steuerung

- Pfeiltasten / A und D: laufen
- Pfeil hoch / W / Leertaste: springen, nochmals drücken für Doppelsprung
- Pfeil runter / S: auf einer Röhre in die Bonuswelt; am goldenen Ziel zur nächsten Welt
- Escape: zurück zum Menü
- Auf dem Handy: die Bildschirmtasten; die Weltkarten unten im Titelbild lassen sich horizontal wischen

Eine Weltkarte öffnet die Auswahl. „Welt spielen“ startet die markierte Welt. „Spiel starten“ im Hauptmenü startet ebenfalls die zuletzt ausgewählte Welt.

## Acht unterschiedliche Welten

| Welt | Gestaltung | Hindernisse |
| --- | --- | --- |
| Mainboard City | Cyanfarbene Schaltkreis-Stadt | Kurzschlüsse und Kabelgräben |
| GPU Skyline | Magentafarbene Grafikkarten-Hochhäuser | Laser und bewegliche RGB-Plattformen |
| RAM Forest | Grüner Speicherwald | Dornen, breite Astplattformen und Gräben |
| CPU Core | Kupfer, Prozessoren und Feuer | Feuerfontänen mit Pausen |
| Virus-Labor | Violette Tanks und grünes Gift | Giftbecken und schwebende Viren |
| WLAN Wolken | Antennen und Wolkeninseln | Wind, Wolkenlifte und Gewitter |
| Firewall Festung | Rote Server-Burg | Scan-Barrieren und Feuergräben |
| Quantum Kern | Violetter Reaktor im All | Bewegte Energiekugeln und zerfallende Plattformen |

Die acht neu generierten Bilder liegen unter `assets/worlds/`. Sie werden als platzsparende WebP-Dateien in der Auswahl und als Hintergrund im Spiel verwendet. Bildprompts: [ARTWORK.md](assets/worlds/ARTWORK.md).

## Reparaturen

Die Weltauswahl verwendet echte, anklickbare Buttons und liegt unabhängig vom Titelposter über dem gesamten Bildschirm. Die bisherigen, sich widersprechenden CSS-Regeln und die veraltete Koordinaten-Klicksteuerung wurden ersetzt.

Bonuswelten erhalten beim Verlassen die bereits gesammelten Münzen, besiegten Gegner und Checkpoints der Hauptwelt. Alle Belohnungen zählen zum Highscore. Bewegungsbefehle werden bei Fokusverlust zurückgesetzt, Ton lässt sich ausschalten und die Simulation läuft unabhängig von der Bildschirmfrequenz mit 60 Schritten pro Sekunde. Das Spiel startet auch bei gesperrtem Local Storage.

## Prüfung

```sh
node --check game.js
node --test tests/game.test.cjs
```

Die automatisierten Tests prüfen Weltauswahl und Start aller acht Welten, Bilddateien, Abgründe, Doppelsprung, Bonus-Rückkehr, Highscore, Eingaben, Ton, Speichersperren, 60/120-Hz-Zeitverhalten, Weltwechsel und Spielende. Sie verwenden einen kleinen DOM-/Canvas-Testadapter. Sie ersetzen keinen echten Browser- oder Gerätetest.

Vor Veröffentlichung auf echten Geräten prüfen: Titelmenü und Bildleiste in Hoch-/Querformat, alle Karten inklusive Welt 8, gleichzeitiges Laufen/Springen per Touch, Audio nach erster Berührung und Lesbarkeit der Hindernisse. Ein Browser war in der Bearbeitungsumgebung nicht verfügbar; ein Downloadversuch schlug fehl.
