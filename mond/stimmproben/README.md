# Stimmproben

Mögliche Stimmen für Erzähler und Strandvogt, zum Anhören und Auswählen. Sie sind **nicht im Spiel**. Das Spiel wird ohne Stimmen gebaut, solange keine ausgewählt ist.

- `index.html`: alle Proben zum Anhören (im Browser öffnen, die MP3-Dateien liegen daneben)
- `proben.json`: pro Probe Name, Beschreibung, Datei, Verständlichkeit und die genaue Einstellung
- Verständlichkeit: Anteil der Wörter, die die Spracherkennung Whisper richtig abschreibt (1 ist perfekt)

## Eine Probe ins Spiel übernehmen

1. Die `einstellung` der gewählten Probe aus `proben.json` als Eintrag in `SPRECHER` in `src/daten-welt.js` eintragen (für den Erzähler unter `erzaehler`, für den Boss unter `vogt`).
2. Aufnahmen erzeugen: `python3 mond/stimme.py --modelle ORDNER_MIT_STIMMEN`
3. Mit Stimmen bauen: `python3 mond/build.py --stimmen`

Genutzte Stimmen: `de_DE-thorsten-high`, `de_DE-thorsten_emotional-medium` (Tonfälle neutral, sleepy, disgusted, angry, whisper), `de_DE-karlsson-low`, `de_DE-pavoque-low`, `de_DE-kerstin-low`, alle von https://huggingface.co/rhasspy/piper-voices. Die 236 Hörbuch-Sprecher aus `de_DE-mls-medium` wurden getestet und verworfen: Bei längeren Sätzen brabbeln sie oder wiederholen Wörter.

| Gruppe | Buchstabe | Name | Verständlichkeit | Datei |
|---|---|---|---|---|
| erzaehler | A | Bisher | 0.92 | `erzaehler-A-bisher.mp3` |
| erzaehler | B | Alt und dunkel | 0.94 | `erzaehler-B-alt-und-dunkel.mp3` |
| erzaehler | C | Geisterhaft | 0.96 | `erzaehler-C-geisterhaft.mp3` |
| erzaehler | D | Flüsternd | 0.81 | `erzaehler-D-fluesternd.mp3` |
| erzaehler | E | Andere Männerstimme | 0.88 | `erzaehler-E-andere-maennerstimme.mp3` |
| erzaehler | F | Erzählerin | 0.84 | `erzaehler-F-erzaehlerin.mp3` |
| erzaehler | G | Pavoque | 0.90 | `erzaehler-G-pavoque.mp3` |
| erzaehler | H | Müder Erzähler | 0.92 | `erzaehler-H-mueder-erzaehler.mp3` |
| erzaehler | I | Ruhiger Erzähler | 0.90 | `erzaehler-I-ruhiger-erzaehler.mp3` |
| erzaehler | J | Pavoque, geisterhaft | 0.90 | `erzaehler-J-pavoque-geisterhaft.mp3` |
| erzaehler | K | Müder Erzähler, geisterhaft | 0.79 | `erzaehler-K-mueder-erzaehler-geisterhaft.mp3` |
| erzaehler | L | Karlsson, alt und dunkel | 0.82 | `erzaehler-L-karlsson-alt-und-dunkel.mp3` |
| erzaehler | M | Pavoque, alt und dunkel | 0.96 | `erzaehler-M-pavoque-alt-und-dunkel.mp3` |
| erzaehler | N | Verbitterter Erzähler | 0.90 | `erzaehler-N-verbitterter-erzaehler.mp3` |
| strandvogt | A | Bisher | 1.00 | `strandvogt-A-bisher.mp3` |
| strandvogt | B | Ungeheuer | 0.82 | `strandvogt-B-ungeheuer.mp3` |
| strandvogt | C | Flüsternder Sammler | 0.90 | `strandvogt-C-fluesternder-sammler.mp3` |
| strandvogt | D | Alter Seemann | 0.96 | `strandvogt-D-alter-seemann.mp3` |
| strandvogt | E | Pavoque | 1.00 | `strandvogt-E-pavoque.mp3` |
| strandvogt | F | Pavoque, Ungeheuer | 0.96 | `strandvogt-F-pavoque-ungeheuer.mp3` |
| strandvogt | G | Müder Sammler | 0.92 | `strandvogt-G-mueder-sammler.mp3` |
| strandvogt | H | Karlsson, Ungeheuer | 0.92 | `strandvogt-H-karlsson-ungeheuer.mp3` |
