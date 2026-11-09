# Eier-Timer

Ein möglichst genauer Timer zum Eierkochen, gebaut fürs iPhone (Safari, auch als App auf dem Home-Bildschirm). Reines HTML, CSS und JavaScript ohne Build-Schritt.

**Öffnen:** https://joel-arno.github.io/couchclub/eier/

Aufs iPhone: Seite in Safari öffnen, Teilen-Menü, „Zum Home-Bildschirm“. Danach läuft der Timer auch ohne Internet. Nur der Luftdruck braucht eine Verbindung.

## Dateien

| Datei | Inhalt |
| --- | --- |
| `config.js` | **alle Konstanten** zum Feinjustieren: Gewichte, Zieltemperaturen, Topfgrößen, Herdleistung, Stoffwerte |
| `physik.js` | das Rechenmodell, ohne Bedienung (läuft auch in Node) |
| `app.js` | Bedienung, Timer, Ton, Wake Lock, Standort, Speichern |
| `index.html`, `styles.css` | Seite und Aussehen (Mobile first, Dark Mode) |
| `manifest.webmanifest`, `sw.js`, `icons/` | Web-App fürs Home-Bildschirm und Offline-Speicher |
| `test/physik-test.js` | prüft das Modell und zeigt eine Tabelle der Kochzeiten (`node eier/test/physik-test.js`) |

## So wird gerechnet

1. **Siedepunkt aus dem Luftdruck.** Die App holt den Standort, fragt bei Open-Meteo den aktuellen Luftdruck am Boden ab (`surface_pressure`) und rechnet daraus mit der Antoine-Gleichung den Siedepunkt. Ohne Standort: Höhe eingeben (Standardatmosphäre) oder 1013 hPa. Auf 1000 m kocht Wasser bei etwa 96,7 °C.
2. **Das Ei als Kugel (Charles Williams).** Aus dem Gewicht der Größenklasse (S 49 g, M 58 g, L 68 g, XL 77 g) wird eine Kugel aus Eimasse. Wärme wandert per Wärmeleitung von außen nach innen. Williams' Formel `t = 0,451 · M^(2/3) · ln(0,76 · (T_Ei − T_Wasser) / (T_Eigelb − T_Wasser))` ist das erste Glied der exakten Lösung. Die App rechnet die ganze Reihe (40 Glieder), weil das erste Glied allein beim kalten Aufsetzen bis zu einer knappen Minute danebenliegt.
3. **Wasser und Herd.** Sekunde für Sekunde wird mitgerechnet, wie viel Wärme die Eier dem Wasser entziehen und wie viel der Herd nachliefert (`HERD_WATT`). Viele kalte Eier in wenig Wasser lassen es kurz unter den Siedepunkt fallen. Beim kalten Aufsetzen heizen Wasser und Eier gemeinsam auf. Die App misst die echte Aufheizzeit (Start bis „Wasser kocht jetzt“), leitet daraus die Herdleistung ab und rechnet die restliche Zeit damit.
4. **Nachgaren.** Fertig ist das Ei, wenn der Rand des Eigelbs die Zieltemperatur der Garstufe erreicht: weich 64,5 °C, wachsweich 69 °C, mittel 73,5 °C, hart 78,5 °C. Gemeint ist die höchste Temperatur dort, also einschließlich der Wärme, die nach dem Herausnehmen noch nach innen wandert. Gerechnet wird das mit Wärmeübergang an kaltes Wasser (abgeschreckt) oder an die Luft (nicht abgeschreckt). Ohne Abschrecken ist die Kochzeit deshalb kürzer, bei Größe M um 35 bis 45 Sekunden.
5. **Praxisfaktor.** Echte Eier garen etwas langsamer als die ideale Kugel (Schale, Luftblase, Eiform). `PRAXISFAKTOR` = 1,25 ist so gewählt, dass ein Ei der Größe M aus dem Kühlschrank auf Meereshöhe die bewährten Zeiten ergibt: weich 6:02, wachsweich 7:04, mittel 8:18, hart 10:00.

Geprüft wurde das Modell gegen eine unabhängige Finite-Differenzen-Rechnung der Wärmeleitung in der Kugel (Abweichung unter 0,4 °C, siehe `test/physik-test.js`).

Gut zu wissen: Solange der Herd auf hoher Stufe bleibt, kühlen auch viele Eier das Wasser nur kurz um einige Grad ab, und die Zeit verlängert sich kaum (12 XL-Eier im kleinen Topf: Wasser kurz 95 °C, 2 Sekunden länger). Die Eier nehmen die meiste Wärme in den ersten Sekunden auf, und der Herd gleicht das schnell aus. Spürbar wird es mit schwachem Herd: bei 600 W statt 1500 W sind es für 12 Eier etwa 15 Sekunden. Wer so einen Herd hat, senkt `HERD_WATT`.

### Feinjustieren

Alles steht in `config.js`. Sind alle Eier zu weich oder zu hart, zuerst `PRAXISFAKTOR` ändern (größer = länger). Passt nur eine Garstufe nicht, deren Zieltemperatur (1 °C ändert die Zeit um etwa 15 bis 20 Sekunden). Danach zeigt `node eier/test/physik-test.js` die neue Tabelle. Die Kalibrierungsprüfung dort schlägt dann fehl, das ist gewollt; die Sollwerte stehen im Test.

## Timer und iPhone

- Der Timer rechnet mit Zeitstempeln und speichert seinen Stand. Nach einem App-Wechsel oder sogar nach dem Neuladen läuft er richtig weiter.
- Die Wake Lock API hält den Bildschirm an, solange der Timer läuft. Wo das nicht geht (ältere iOS-Versionen), zeigt die App einen Hinweis.
- Der Ton wird beim Tippen auf Start freigeschaltet (iOS erlaubt Ton nur nach einer Berührung). Ist das iPhone gesperrt, kann eine Web-App keinen Ton abspielen. Der Alarm kommt dann beim Entsperren, und die App zeigt, seit wann die Eier fertig sind.
- Vibration gibt es nur, wo der Browser sie anbietet (Android). Safari auf dem iPhone kann es nicht.
- „Ton testen“ unter „So rechnet die App“ prüft die Lautstärke.
- Die letzten Einstellungen und der zuletzt abgerufene Luftdruck bleiben im `localStorage`. Meldet der Browser, dass der Standort freigegeben ist, holt die App den Luftdruck beim Öffnen selbst, wenn der letzte Wert älter als eine Stunde ist. Sonst reicht ein Tipp auf „Luftdruck aktualisieren“.

## Veröffentlichen

Der Timer liegt im Couchclub-Repository und wird mit ihm veröffentlicht: `.github/workflows/pages.yml` ruft bei jeder Änderung auf `main` `couchclub/build.py` auf, und das kopiert den Ordner `eier/` nach `_site/eier/` (ohne README und Test). Damit läuft er unter https://joel-arno.github.io/couchclub/eier/ mit eigenem Manifest, Symbol und Service Worker, getrennt vom Couchclub.

Einmalig nötig, falls noch nicht geschehen: Settings, Pages, Build and deployment, Source: „GitHub Actions“.

Woanders hosten geht auch: Der Ordner `eier/` ist für sich vollständig. Ihn einfach auf einen beliebigen statischen Webserver legen, zum Beispiel als eigenes Repository mit GitHub Pages aus dem Hauptordner. HTTPS ist nötig, sonst gibt es weder Standort noch Wake Lock noch Service Worker.

Lokal ausprobieren: `python3 -m http.server -d eier 8000`, dann http://localhost:8000 öffnen.
