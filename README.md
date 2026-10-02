# Couchclub

Spieleabend auf dem Handy:

- **Duelle** gegen die KI (drei Stufen) oder zu zweit: Vier gewinnt, Mega Tic Tac Toe, Punkteboxen, Memory, Schiffe versenken, Mühle, Reversi, Dame und Quoridor
- **Für die ganze Runde:** Kniffel (alleine, gegen die KI oder mit bis zu sechs Spielern) und Werwolf mit 13 Rollen
- **Knobeln:** Sudoku und Minensuche
- **Solo-Abenteuer:** Kerker-Wischer, Lichtläufer und Mondgeläut

Schiffe versenken, Kniffel und Werwolf gehen auch mit mehreren Handys: Einer eröffnet einen Raum, die anderen treten mit dem Code oder per QR-Code bei. Jeder Spieler hat ein eigenes Profil mit Statistik und eigenem Spielstand.

**Spielen:** https://joel-arno.github.io/couchclub/

Aufs Handy: Seite öffnen und „Zum Home-Bildschirm“ wählen (iPhone: Teilen-Menü in Safari, Android: „App installieren“). Die App läuft danach auch ohne Internet und holt sich Neuerungen beim nächsten Öffnen von selbst.

## Aufbau

- `couchclub/`: die App (Profile, Spielauswahl, Spiele, Räume für mehrere Handys, Manifest, Service Worker, Symbole), Details in `couchclub/README.md`
- `spiel/`: Quellcode von Kerker-Wischer und Lichtläufer, Details in `spiel/README.md`
- `mond/`: Quellcode von Mondgeläut, einem düsteren Abenteuer mit Bossen und Reaktionskampf (Akt I fertig, weitere Akte folgen), Details in `mond/README.md`
- `.github/workflows/pages.yml`: baut bei jeder Änderung auf `main` die App und veröffentlicht sie auf GitHub Pages

Selbst bauen: `python3 couchclub/build.py --out _site`
