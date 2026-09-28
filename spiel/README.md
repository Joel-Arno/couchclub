# Kerker & Licht

Zwei Offline-Handyspiele in einer einzigen HTML-Datei (`index.html`), ohne Internet, ohne Werbung.

- **Kerker-Wischer**: Roguelike auf neun Feldern. 6 Helden mit eigenen Fähigkeiten, 5 Welten plus eine geheime sechste, jede mit einer Karte aus Kämpfen, Elite-Gegnern, Schatzkammern, Händlern, Ereignissen und Rastplätzen. Raumziele, Vorschau auf die nächsten Karten, 14 Monsterarten mit Eigenschaften, 5 Waffenarten, Gegenstände, Stufen mit Talenten, 30 Relikte, 6 Bosse mit zweiter Phase, 10 Aufstiegsstufen, Endlose Gruft und Tagesgruft.
- **Lichtläufer**: Arcade für einen Finger. Zonen mit Lasern, Rotoren und Minen, Power-ups, Überladung, Missionen mit Rängen und Skins.

Beide Spiele gibt es in zwei Grafikstilen (Warm & flach, Papier). Soundeffekte und Musik werden im Browser erzeugt, Spielstände bleiben auf dem Gerät.

## Aufs Handy bringen

- **Als Web-App (empfohlen):** Den Ordner `spiel/` über HTTPS ausliefern, zum Beispiel mit GitHub Pages. Seite im Handy-Browser öffnen und „Zum Startbildschirm hinzufügen“ wählen. Der Service Worker (`sw.js`) speichert alles für den Offline-Betrieb.
- **Als Datei:** `index.html` aufs Handy kopieren und im Browser öffnen. Die Datei enthält Schriften, Grafiken und Code vollständig.

## Bauen

Der Quellcode liegt in `src/`. Nach Änderungen:

```
python3 spiel/build.py
```

Das erzeugt `spiel/index.html` mit eingebetteten Schriften. Mit `--artifact PFAD` entsteht zusätzlich eine Variante ohne Manifest und Service Worker.

Mit `--couchclub couchclub` entsteht `couchclub/spiele.html`, die Fassung für den Couchclub: ohne Papier-Stil, mit einem Spielstand pro Couchclub-Spieler.

## Schriften

Fraunces, IBM Plex Sans, IBM Plex Mono, Caveat und Patrick Hand stehen unter der SIL Open Font License 1.1 und sind als lateinische Teilmenge eingebettet (`src/fonts/`).
