# Couchclub

Spieleabend-App für ein Handy: Spielerprofile, Statistiken und Spiele gegen die KI oder zu zweit, dazu drei Solo-Abenteuer.

- `index.html`, `styles.css`, `core.js`: App-Kern mit Profilen, Spielauswahl und Spielrahmen
- `g-*.js`: je ein Spiel, das sich mit `CC.register(...)` anmeldet
- `g-abenteuer.js`: die Solo-Abenteuer. Kerker-Wischer und Lichtläufer laufen im Vollbild aus `spiele.html`, Mondgeläut aus `mond.html`. Jeder Spieler hat einen eigenen Spielstand im Browser-Speicher (`kerker-licht-v2@<Spieler-ID>` und `mondgelaeut-v1@<Spieler-ID>`), der mit dem Spieler gelöscht wird. Den Spielstand von Mondgeläut kann man außerdem unter Spieler → Bearbeiten → Spielstände einzeln löschen und neu beginnen (Spiele mit `frame.save` in `g-abenteuer.js`). Die Spiele melden Start, Fortschritt und Rückweg per `postMessage` an den Couchclub.

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
