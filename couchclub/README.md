# Couchclub

Spieleabend-App fürs Handy: Spielerprofile, Statistiken und Spiele gegen die KI, zu zweit, in der Runde oder mit mehreren Handys, dazu drei Solo-Abenteuer.

- `index.html`, `styles.css`, `core.js`: App-Kern mit Profilen, Spielauswahl und Spielrahmen
- `g-*.js`: je ein Spiel, das sich mit `CC.register(...)` anmeldet
- `net.js`, `qrcode.js`: Räume für mehrere Handys (siehe unten) und der QR-Code zum Beitreten (qrcode-generator von Kazuhiko Arase, MIT-Lizenz)

## Spiele und Modi

Jedes Spiel nennt bei `CC.register` seine Modi:

- `ai`: ein Spieler gegen die KI (Leicht, Mittel, Schwer)
- `duo`: zwei Spieler an einem Handy. Schiffe versenken verdeckt den Bildschirm, wenn das Handy weitergegeben wird (`api.handoff`).
- `group`: mehrere Spieler an einem Handy (`group: [min, max]`), zum Beispiel Kniffel
- `solo`: alleine, mit Rekorden (`best`, bei Kniffel `best.high` für „mehr ist besser“)
- `lead`: ein Handy mit Spielleitung, eigene Namen im Spiel (Werwolf)
- `online`: mehrere Handys (`online: [min, max]`)

`shelf` ordnet ein Spiel ins Regal ein (`duel`, `party`, `puzzle`), `bare` blendet die Punkteleiste aus, `noRestart` den Neustart-Knopf.

| Spiel | Modi |
| --- | --- |
| Vier gewinnt, Mega Tic Tac Toe, Punkteboxen, Mühle, Reversi, Dame, Quoridor | KI, zu zweit |
| Memory | KI, zu zweit, alleine |
| Schiffe versenken | KI, zu zweit, mehrere Handys |
| Kniffel | 2 bis 6 an einem Handy, KI, alleine, mehrere Handys (2 bis 8) |
| Werwolf | mehrere Handys (4 bis 18), ein Handy mit Spielleitung (4 bis 20) |
| Sudoku, Minensuche | alleine |

## Mehrere Handys

Der Couchclub hat keinen eigenen Server. Die Handys finden sich über öffentliche MQTT-Vermittler, die jeder ohne Konto nutzen kann (`broker.emqx.io`, `broker.hivemq.com`, `test.mosquitto.org`, alle über verschlüsselte WebSockets). `net.js` verbindet sich mit allen gleichzeitig und schickt jede Nachricht über jeden erreichbaren Vermittler, doppelte Nachrichten werden aussortiert. Fällt ein Vermittler aus, läuft das Spiel über die anderen weiter.

- Der Raumcode hat fünf Zeichen. Daraus entstehen das Thema (ein Hash) und der Schlüssel (PBKDF2), mit dem jede Nachricht per AES-GCM verschlüsselt wird. Wer den Code nicht kennt, kann nicht mitlesen.
- Das Handy, das den Raum eröffnet, ist Gastgeber und führt das Spiel. Die anderen schicken ihre Züge und bekommen den öffentlichen Stand sowie ihre privaten Daten (eigene Flotte, Werwolf-Rolle).
- Herzschläge alle vier Sekunden zeigen, wer verbunden ist. Wer kurz weg ist (Bildschirm aus, Funkloch), bekommt beim Wiederverbinden den aktuellen Stand. Ein Gast, dessen Seite neu lädt, kommt automatisch zurück in den Raum.
- Beitreten: „Raum beitreten“ auf der Startseite, oder den QR-Code scannen (Link mit `#raum=CODE`).
- Zum Testen mit eigenem Vermittler: `localStorage['couchclub.brokers'] = '["ws://localhost:8888"]'`.

Spiele bekommen im Modus `online` ein `api.online` mit `host`, `me`, `send(aktion)`, `onAction`, `publish(stand)`, `tell(spieler, daten)`, `onState`, `onPrivate`, `isOn`, `onPresence` und `onLeft`. Der Gastgeber verarbeitet Aktionen und veröffentlicht den Stand, alle Handys zeichnen nur, was sie bekommen.

## Werwolf

13 Rollen, einzeln an- und abwählbar: Werwolf, Weißer Werwolf, Dorfbewohner, Seherin, Hexe, Jäger, Amor, Beschützer, Mädchen, Dorfältester, Dorfdepp, Rabe und Wildes Kind. „Vorschlag“ stellt passend zur Spielerzahl zusammen, die letzte Auswahl wird gespeichert (`couchclub.werwolf`).

- **Mehrere Handys:** Die App ist der Erzähler, das Gastgeber-Handy liest die Ansagen vor (abschaltbar). Nachts tippen alle gleichzeitig etwas an. Wer keine Rolle mit Aufgabe hat, nennt einen Verdacht, damit niemand an Bewegungen erkennt, wer wer ist. Tote sehen alle Rollen. Ist jemand nicht verbunden, kann der Gastgeber nach 25 Sekunden ohne ihn weitermachen.
- **Ein Handy:** Die Rollen werden reihum verdeckt verteilt. Danach hält eine Spielleitung das Handy und bekommt Schritt für Schritt den Text zum Vorlesen, tippt die Entscheidungen ein und sieht alle Rollen.
- `g-abenteuer.js`: die Solo-Abenteuer. Kerker-Wischer und Lichtläufer laufen im Vollbild aus `spiele.html`, Mondgeläut aus `mond.html`. Jeder Spieler hat einen eigenen Spielstand im Browser-Speicher (`kerker-licht-v2@<Spieler-ID>` und `mondgelaeut-v2@<Spieler-ID>`), der mit dem Spieler gelöscht wird. Den Spielstand von Mondgeläut kann man außerdem unter Spieler → Bearbeiten → Spielstände einzeln löschen und neu beginnen (Spiele mit `frame.save` in `g-abenteuer.js`). Die Spiele melden Start, Fortschritt und Rückweg per `postMessage` an den Couchclub.

`spiele.html` und `mond.html` werden gebaut, bitte nicht von Hand bearbeiten:

```
python3 spiel/build.py --couchclub couchclub
python3 mond/build.py --couchclub couchclub
```

`index.html` enthält nur den Seiteninhalt. Das Grundgerüst mit doctype, head und body ergänzt die Veröffentlichung als Artifact.

## Als App aufs Handy (GitHub Pages)

Bei jeder Änderung auf `main` baut `.github/workflows/pages.yml` die App mit

```
python3 couchclub/build.py --out _site
```

und veröffentlicht sie unter https://joel-arno.github.io/couchclub/. Der Service Worker (`sw.js`) holt online immer den neuesten Stand und speichert ihn für unterwegs, so läuft die App auch ohne Internet. Installieren: Seite im Handy-Browser öffnen, dann „Zum Home-Bildschirm“ (iPhone: Teilen-Menü in Safari) oder „App installieren“ (Android).

Einmalig im Repository einstellen: Settings → Pages → Build and deployment → Source: „GitHub Actions“.
