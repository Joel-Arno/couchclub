# Mondgeläut

Ernstes Solo-Abenteuer für den Couchclub, in der Richtung von Elden Ring: eigene Welt, Bosse, mehrere Enden. Das ganze Konzept steht in `KONZEPT.md` (enthält Spoiler).

## Stand: Akt I

Akt I umfasst drei Gebiete mit 20 Orten:

- **Die Strandung:** Kiesstrand, Wrackfeld, Stille Bucht, Leuchtturm, Kettentor, Mole und der Strandvogt im Nebel
- **Die Salzmarsch:** Salzpfad, Schilfmeer, Pfahldorf, Totes Ufer, Nebelbrücke und die Salzhexe in der Salzgrube (Nebenboss)
- **Velmora:** Stadttor, überflutete Gassen, Brunnenplatz, Brautkapelle, Turmtreppe, die Wrackspinne im Hafen (Nebenboss) und Isolde, die Ertränkte Braut, im Glockenturm (Hauptboss)

Dazu gehören:

- drei Herkünfte mit Startwaffe und Attributen (Vitalität, Ausdauer, Stärke, Geschick)
- sechs Waffen mit eigener Waffenkunst, zwei davon aus dem Nachhall der Bosse gegossen, drei Schilde, sechs Talismane mit zwei Plätzen
- Reaktionskampf: Angriff, schwerer Angriff (halten lädt auf), Ausweichen, Blocken und Parieren im richtigen Moment, Ausdauer, Haltung und Todesstoß; Gegner mit Geschossen, Bosse mit zweiter Phase
- Leuchtfeuer zum Rasten, Aufsteigen und Reisen, Glut als Währung, die beim Tod liegen bleibt, Mondtau für mehr Phiolen, Amboss mit Glockenerz
- Karte mit Wegen zwischen den Orten: Weiter geht es erst, wenn die Gegner besiegt sind, zurück immer; beim Rasten stehen die Toten wieder auf
- drei Figuren mit Gesprächen und Entscheidungen: Enna, die Leuchtfeuerwärterin, Mira, die Taucherin (mit Laden und Suche nach ihrem Bruder), und Ser Kalden, der Eidlose
- Spielstand im Browser, im Couchclub pro Spieler

Grafik, Musik und Geräusche entstehen im Browser. Das Spiel läuft ohne Internet.

## Aufbau

- `src/shell.html`, `src/style.css`: Seite und Stil
- `src/core.js`: Hilfsfunktionen, Einstellungen, Einbettung in den Couchclub, Klang und Musik
- `src/figuren.js`: Skelett, Posen und Scherenschnitt-Figuren
- `src/wesen.js`: die Figuren von Akt I, dazu Krabbe und Wrackspinne mit eigenem Körperbau
- `src/welt.js`: Hintergründe aller Orte, Wetter, Flut und Effekte
- `src/daten-kampf.js`: Herkünfte, Waffen, Schilde, Talismane, Gegenstände und Gegner mit ihren Angriffen
- `src/daten-welt.js`: Gebiete, Orte und Wege, Figuren, Gespräche, Laden, Texte und Besetzung der Stimmen
- `src/stimme.js`: spielt Sprachaufnahmen ab, falls welche eingebaut sind
- `src/kampf.js`: Bühne und Kampfregeln
- `src/ablauf.js`: Titel, Orte, Karte, Leuchtfeuer, Gespräche, Menüs, Anzeige und Steuerung

## Bauen

```
python3 mond/build.py
```

Das erzeugt `mond/index.html` mit eingebetteten Schriften. Mit `--artifact PFAD` entsteht zusätzlich eine Variante ohne HTML-Grundgerüst, mit `--couchclub couchclub` die Fassung `couchclub/mond.html` für den Couchclub. Dort kommen Spieler, Ton und Vibration aus der Adresse (`mond.html#p=p1&n=Joel&snd=1&vib=1&mot=1`), der Spielstand liegt unter `mondgelaeut-v1@<Spieler-ID>`, und das Spiel meldet Stufe, Bosse, Tode und Spielzeit per `postMessage` zurück. Mit `#test` am Ende der Adresse stehen im Browser unter `window.__mg` Hilfen zum Testen bereit.

## Stimmen

Erzähler und Figuren sprechen mit freien deutschen Piper-Stimmen. Welche Zeilen es gibt, ergibt sich aus den Texten in `src/daten-welt.js` (`stimmZeilen`), wer mit welcher Stimme spricht, steht in `SPRECHER`. Die Aufnahmen erzeugt:

```
pip install piper-tts lameenc
python3 mond/stimme.py --modelle ORDNER_MIT_STIMMEN
python3 mond/build.py --stimmen
```

Die Stimmen (`.onnx` und `.onnx.json`) gibt es unter https://huggingface.co/rhasspy/piper-voices im Ordner `de/de_DE`. Das Skript spricht nur Zeilen neu, deren Text oder Stimme sich geändert hat, und legt sie als MP3 in `src/stimme/` ab.

**Im Moment ist das Spiel ohne Stimmen gebaut**, bis die passende Stimme ausgewählt ist. Die Aufnahmen in `src/stimme/` stammen noch aus der Kampf-Demo und passen nicht mehr zu allen Texten von Akt I; vor dem Einbauen `stimme.py` neu laufen lassen. Mit `python3 mond/build.py --stimmen` kommen sie ins Spiel, dann lassen sie sich im Titel, im Menü und in der Pause abschalten. Ohne Aufnahmen blendet das Spiel den Schalter aus.

In `stimmproben/` liegen 22 mögliche Stimmen für Erzähler und Strandvogt zum Anhören, mit genauen Einstellungen zum Übernehmen (siehe `stimmproben/README.md`).

Besetzung bisher: der Erzähler mit `de_DE-thorsten-high`, der Strandvogt mit `de_DE-thorsten_emotional-medium` (Tonfall „disgusted“, langsamer, tiefer und mit viel Hall). Alle Effekte (Tiefe, Flüsterschicht, Chorus, rauer Klang, weniger Höhen, Hall) rechnet `stimme.py` fest in die Aufnahme, eingestellt pro Figur in `SPRECHER`. Das Spiel spielt die Aufnahmen nur noch ab.

Mit `python3 mond/stimme.py --pruefen` schreibt die Spracherkennung Whisper (`pip install faster-whisper`) jede Aufnahme so ab, wie sie im Spiel klingt, und vergleicht mit dem Text. Wörter, die immer wieder falsch ankommen, bekommen in `stimme.py` unter `AUSSPRACHE` eine Lautschrift, zum Beispiel „Strand-Fohkt“ für Strandvogt. Der Text im Spiel bleibt dabei unverändert.

## Schriften

Cormorant Garamond und IBM Plex Sans stehen unter der SIL Open Font License 1.1 und sind als lateinische Teilmenge eingebettet (`src/fonts/`).
