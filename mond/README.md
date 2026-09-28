# Mondgeläut

Ernstes Solo-Abenteuer für den Couchclub, in der Richtung von Elden Ring: eigene Welt, Bosse, mehrere Enden. Das ganze Konzept steht in `KONZEPT.md` (enthält Spoiler).

## Stand: Kampf-Demo

Die Demo spielt in der Strandung und enthält:

- drei Herkünfte mit eigener Waffe und Waffenkunst: Kronwächter (Kronhieb), Harpunierin (Widerhaken), Glockenmönch (Grabgeläut)
- zwei normale Gegner (Ertrunkener, Kettenknecht) und den ersten Boss, den Strandvogt, mit zweiter Phase
- zwei Leuchtfeuer zum Rasten und Aufsteigen, Glut als Währung, die beim Tod liegen bleibt
- beide Kampfsysteme zum Vergleichen, jederzeit umschaltbar:
  - **Reaktion:** Angriff, schwerer Angriff, Ausweichen, Blocken und Parieren im richtigen Moment, Ausdauer, Haltung und Todesstoß
  - **Runden:** 4 Ausdauerpunkte pro Runde, sichtbare Absichten des Gegners, Blocken, Parade und Ausweichen als geplante Abwehr

Grafik, Musik und Geräusche entstehen im Browser. Die Demo läuft ohne Internet.

## Aufbau

- `src/shell.html`, `src/style.css`: Seite und Stil
- `src/core.js`: Hilfsfunktionen, Einstellungen, Klang und Musik
- `src/figuren.js`: Skelett, Posen und Scherenschnitt-Figuren
- `src/welt.js`: Hintergründe, Wetter, Flut und Effekte
- `src/daten.js`: Herkünfte, Gegner mit ihren Angriffen, Texte der Szenen, Besetzung der Stimmen
- `src/stimme.js`: spielt die Sprachaufnahmen ab, mit eigener Tonhöhe und eigenem Hall pro Figur
- `src/kampf.js`: Kampfregeln für beide Systeme
- `src/ablauf.js`: Titel, Geschichte, Leuchtfeuer, Anzeige und Steuerung

## Bauen

```
python3 mond/build.py
```

Das erzeugt `mond/index.html` mit eingebetteten Schriften. Mit `--artifact PFAD` entsteht zusätzlich eine Variante ohne HTML-Grundgerüst. Mit `#test` am Ende der Adresse stehen im Browser unter `window.__mg` Hilfen zum Testen bereit.

## Stimmen

Erzähler und Figuren sprechen mit freien deutschen Piper-Stimmen. Welche Zeilen es gibt, ergibt sich aus den Texten in `src/daten.js` (`stimmZeilen`), wer mit welcher Stimme spricht, steht in `SPRECHER`. Die Aufnahmen erzeugt:

```
pip install piper-tts lameenc
python3 mond/stimme.py --modelle ORDNER_MIT_STIMMEN
python3 mond/build.py
```

Die Stimmen (`.onnx` und `.onnx.json`) gibt es unter https://huggingface.co/rhasspy/piper-voices im Ordner `de/de_DE`. Das Skript spricht nur Zeilen neu, deren Text oder Stimme sich geändert hat, und legt sie als MP3 in `src/stimme/` ab. Fehlen Aufnahmen, läuft das Spiel einfach ohne Stimme. Im Spiel lassen sich die Stimmen im Titel und im Pausenmenü abschalten.

## Schriften

Cormorant Garamond und IBM Plex Sans stehen unter der SIL Open Font License 1.1 und sind als lateinische Teilmenge eingebettet (`src/fonts/`).
