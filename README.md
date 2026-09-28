# Couchclub

Spieleabend auf einem Handy: Vier gewinnt, Mega Tic Tac Toe, Punkteboxen und Memory gegen die KI oder zu zweit, dazu die Solo-Abenteuer Kerker-Wischer, Lichtläufer und Mondgeläut. Jeder Spieler hat ein eigenes Profil mit Statistik und eigenem Spielstand.

**Spielen:** https://joel-arno.github.io/couchclub/

Aufs Handy: Seite öffnen und „Zum Home-Bildschirm“ wählen (iPhone: Teilen-Menü in Safari, Android: „App installieren“). Die App läuft danach auch ohne Internet und holt sich Neuerungen beim nächsten Öffnen von selbst.

## Aufbau

- `couchclub/`: die App (Profile, Spielauswahl, Spiele, Manifest, Service Worker, Symbole), Details in `couchclub/README.md`
- `spiel/`: Quellcode von Kerker-Wischer und Lichtläufer, Details in `spiel/README.md`
- `mond/`: Quellcode von Mondgeläut, einem düsteren Abenteuer mit Bossen und Reaktionskampf (Akt I fertig, weitere Akte folgen), Details in `mond/README.md`
- `.github/workflows/pages.yml`: baut bei jeder Änderung auf `main` die App und veröffentlicht sie auf GitHub Pages

Selbst bauen: `python3 couchclub/build.py --out _site`
