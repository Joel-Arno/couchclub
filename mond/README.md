# Mondgeläut

Ernstes Solo-Abenteuer für den Couchclub, in der Richtung von Elden Ring: eigene Welt, Bosse, mehrere Enden. Das ganze Konzept steht in `KONZEPT.md` (enthält Spoiler).

## Stand: Akt I (Version 2)

Akt I ist eine begehbare Welt aus 25 Gebieten in drei Regionen. Man läuft, springt, klettert Leitern, fällt durch Stege, watet durch Wasser und schlägt brüchige Wände ein:

- **Die Strandung:** Kiesstrand, Wrackfeld mit der Seraphine, die Stille Bucht hinter dem hohlen Fels (Ertrunkener Ritter), Leuchtturm mit seinem Inneren, Klippenpfad mit Kettentor und Gang zurück, Mole und der Strandvogt am Ende der Mole
- **Die Salzmarsch:** Salzpfad, Schilfmeer, Pfahlwyk mit Wendas Haus, die Salzgrube tief hinab zur Salzhexe (mit Schacht als Abkürzung), Totes Ufer und die Nebelbrücke, die unter einem einstürzt
- **Velmora:** Stadttor mit Mauer, überflutete Gassen mit Dächern und dem blauen Haus, Brunnenplatz, Hafen mit der Wrackspinne, das Hafenbecken mit Jonte, Brautkapelle, Gruft, Turmtreppe und Isolde im Glockenturm

Dazu gehören:

- ein Prolog in fünf Bildern, dann drei Herkünfte mit Startwaffe und Attributen
- Gegner stehen in der Welt, patrouillieren, liegen im Wasser oder lauern oben; sie sehen nach vorn, wer sich von hinten anschleicht, beginnt mit einem Hinterhalt
- Kampf an Ort und Stelle: Angriff, schwerer Angriff, Ausweichen, Blocken und Parieren im richtigen Moment; Gegner mit Finten, verzögerten Schlägen, Mischangriffen, Schild, Panzer, Konter und Fernkämpfern in zweiter Reihe; Bosse mit mehreren Phasen
- Leuchtfeuer zum Rasten, Aufsteigen und Reisen, Glut, die beim Tod liegen bleibt, Mondtau, Amboss, acht Talismane
- Hebel, Gitter, Riegeltüren als Abkürzungen, verschlossene Türen mit Schlüsseln, verborgene Gänge
- Figuren mit Gesprächen und Entscheidungen: Enna, Oswin, Mira (Laden, Suche nach ihrem Bruder, Wahrheit oder Lüge), Greta (Harks Nadel) und Ser Kalden, dessen Geheimnis man in der Gruft findet; am Ende die Wahl, wer Isoldes Splitter behält
- Briefe, Inschriften und Erinnerungen der Bosse, gesammelt in der Chronik
- eigene Klangwelt je Region, Spielstand im Browser, im Couchclub pro Spieler

Grafik, Musik und Geräusche entstehen im Browser. Das Spiel läuft ohne Internet.

## Aufbau

- `src/shell.html`, `src/style.css`: Seite und Stil
- `src/core.js`: Hilfsfunktionen, Einstellungen, Einbettung in den Couchclub, Klang und Musik
- `src/figuren.js`, `src/wesen.js`: Skelett, Posen und Scherenschnitt-Figuren, dazu Krabbe und Wrackspinne
- `src/level.js`: Gebiete aus Textkarten, Kollision und Geländeformen
- `src/themen.js`: Himmel, Hintergrundebenen und Farben jeder Gegend
- `src/szene.js`: Kamera, Zeichnen von Gelände, Wasser, Licht, Wetter und Effekten
- `src/eingabe.js`: Stick und Knöpfe auf dem Bildschirm, Tastatur
- `src/erkundung.js`: Laufen, Springen, Klettern, Gegner in der Welt, alles, womit man handeln kann
- `src/kampf.js`: Kampfregeln, der Kampf findet mitten in der Welt statt
- `src/daten-kampf.js`: Herkünfte, Waffen, Schilde, Talismane, Gegenstände und Gegner mit ihren Angriffen
- `src/daten-welt.js`: Regionen, Figuren, Gespräche, Laden und Texte
- `src/lore.js`: Briefe, Inschriften, Erinnerungen, Figuren in der Chronik
- `src/karten-bild.js`: das Gelände aller Gebiete (erzeugt, siehe unten)
- `src/karten.js`: was in jedem Gebiet steht: Gegner, Figuren, Feuer, Türen, Hebel, Geheimnisse
- `src/skripte.js`: Hinweise, Ereignisse und Zwischenszenen, vor und nach jedem Boss
- `src/prolog.js`, `src/menues.js`: Prolog, Menüs, Aufsteigen, Amboss, Laden, Chronik
- `src/stimme.js`: spielt Sprachaufnahmen ab, falls welche eingebaut sind
- `src/ablauf.js`: Spielstand, Titel, Erkunden, Gespräche, Leuchtfeuer, Kämpfe, Tod, Karte

## Karten

Das Gelände wird mit `werkzeug/karten.py` beschrieben (Boden, Fels, Leitern, Wasser, Anker für Objekte) und als Textkarte nach `src/karten-bild.js` geschrieben:

```
python3 mond/werkzeug/karten.py
node mond/werkzeug/pruefe-karten.js
```

Der Prüfer simuliert mit der echten Sprung- und Kletterphysik von jedem Standplatz aus Laufen, Springen, Fallen, Stege und Leitern, öffnet Hebel, Riegel, brüchige Wände und Schlösser, sobald man sie erreicht, und meldet, was nicht erreichbar ist oder wo man festsitzen könnte. Mit `--zeige GEBIET` zeigt er die Karte mit allen erreichten Plätzen.

## Bauen

```
python3 mond/build.py
```

Das erzeugt `mond/index.html` mit eingebetteten Schriften. Mit `--artifact PFAD` entsteht zusätzlich eine Variante ohne HTML-Grundgerüst, mit `--couchclub couchclub` die Fassung `couchclub/mond.html` für den Couchclub. Dort kommen Spieler, Ton und Vibration aus der Adresse (`mond.html#p=p1&n=Joel&snd=1&vib=1&mot=1`), der Spielstand liegt unter `mondgelaeut-v2@<Spieler-ID>`, und das Spiel meldet Stufe, Bosse, Tode und Spielzeit per `postMessage` zurück. Mit `#test` am Ende der Adresse stehen im Browser unter `window.__mg` Hilfen zum Testen bereit.

## Stimmen

Erzähler und Figuren sprechen mit freien deutschen Piper-Stimmen. Welche Zeilen es gibt, ergibt sich aus den Texten in `src/daten-welt.js` (`stimmZeilen`: Erwachen, Herkünfte, Leuchtfeuer und die Sätze der Gegner), wer mit welcher Stimme spricht, steht in `SPRECHER`. Die Aufnahmen erzeugt:

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
