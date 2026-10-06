# Anprobe-Widget

Schmuck virtuell anprobieren, direkt auf der Produktseite eines Shops.
Ein Knopf „Virtuell anprobieren“ öffnet die Kamera, der Schmuck wird live
auf Hand, Hals oder Ohren gelegt und folgt jeder Bewegung. Die Erkennung
läuft komplett im Browser, kein Kamerabild verlässt das Gerät.

Gebaut für Shopify, läuft aber auf jeder Seite, in die man ein Stück HTML
einfügen kann.

## Was es kann

| Schmuck   | Erkennung       | Kamera am Handy | Besonderheiten |
|-----------|-----------------|-----------------|----------------|
| Ring      | Hand            | hinten          | Finger wählbar: Daumen bis kleiner Finger; Breite passt sich dem Finger an |
| Armband   | Hand            | hinten          | sitzt knapp über dem Handgelenk, quer zum Unterarm |
| Kette     | Oberkörper      | vorn            | liegt am Halsansatz, dreht mit den Schultern |
| Ohrringe  | Gesicht         | vorn            | beide Ohrläppchen, pendeln bei Kopfbewegung; ein verdecktes Ohr bekommt keinen Ohrring |

* Live-Kamera, Wechsel zwischen vorderer und hinterer Kamera
* Alternativ ein eigenes Foto wählen, etwa wenn die Kamera nicht erlaubt ist
* Schmuck mit dem Finger verschieben, Größe per Regler, Zwei-Finger-Geste oder Mausrad
* Varianten (Gold, Silber …) direkt im Fenster umschalten
* Foto aufnehmen und über das Teilen-Menü verschicken oder speichern
* Ohne eigenes Anprobe-Bild wird das Produktfoto automatisch freigestellt (Notlösung)

## Ausprobieren

`demo/index.html` ist eine Beispiel-Produktseite mit fünf Schmuckstücken.
Die Kamera funktioniert nur über `https://` oder `localhost`, also z. B.:

```
npx serve .
```

und dann `http://localhost:3000/demo/` öffnen. Am Handy geht es am
einfachsten über GitHub Pages: Im Repo unter *Settings → Pages* den Branch
`main` freigeben, dann liegt die Demo unter
`https://<name>.github.io/<repo>/demo/`.

## Einbau in Shopify

Das dauert etwa zehn Minuten und braucht keine App.

**1. Skript hochladen**

*Onlineshop → Themes → … → Code bearbeiten*. Links unter **Assets** auf
„Neues Asset hinzufügen“ klicken und `anprobe.js` hochladen.

**2. Knopf auf die Produktseite setzen**

*Onlineshop → Themes → Anpassen*, oben die Vorlage **Produkte** wählen. Im
Abschnitt mit den Produktinfos einen Block **„Benutzerdefiniertes Liquid“**
hinzufügen, den kompletten Inhalt von `shopify/anprobe.liquid`
hineinkopieren und den Block unter den „In den Warenkorb“-Knopf ziehen.
Speichern.

Der Knopf erscheint nur bei Produkten, die als Schmuck erkannt werden (siehe
unten). Alle anderen Produkte bleiben unverändert.

**3. Anprobe-Bilder hinterlegen** (empfohlen)

Einmalig ein Metafeld anlegen: *Einstellungen → Benutzerdefinierte Daten →
Produkte → Definition hinzufügen*

* Name: `Anprobe-Bilder`, Namespace und Schlüssel: `anprobe.bilder`
* Typ: **Datei**, „Liste von Dateien“, nur Bilder

Danach steht bei jedem Produkt unten das Feld „Anprobe-Bilder“. Dort die
Bilder hochladen. Der **Alt-Text** jedes Bilds wird zum Namen der Variante
im Fenster (z. B. „Gold“, „Silber“). Diese Bilder tauchen nicht in der
Produktgalerie auf.

Ohne Metafeld geht es auch: Produktbilder, deren Alt-Text mit `anprobe`
beginnt (z. B. `anprobe: Gold`), werden verwendet. Die sind dann aber auch
in der Galerie zu sehen.

## Welche Produkte einen Knopf bekommen

Die Art des Schmucks wird so bestimmt, das Erste, was passt, gilt:

1. Metafeld `anprobe.art` (einzeiliger Text): `ring`, `armband`, `kette` oder `ohrringe`
2. Ein Produkt-Tag wie `anprobe:ring`. Mit dem Tag **`anprobe:aus`** bekommt ein Produkt keinen Knopf
3. Produkttyp, dann Titel: enthält er „Ohrring“, „Creole“ → Ohrringe; „Armband“, „Armreif“ → Armband;
   „Kette“, „Collier“, „Anhänger“ → Kette; „Ring“ → Ring

Wer seine Produkttypen ohnehin „Ringe“, „Ketten“ usw. nennt, muss also nichts tun.

**Ohrringlänge:** Ohrringe werden über die Gesichtsbreite auf ihre echte
Größe gebracht. Standard sind 35 mm Länge. Für genaue Größen ein Metafeld
`anprobe.mm` (Dezimalzahl) anlegen und die Länge in Millimetern eintragen.
Ringe, Armbänder und Ketten passen sich dem Körper an und brauchen keine
Angabe.

## So sollen die Anprobe-Bilder aussehen

PNG mit **durchsichtigem Hintergrund**, etwa 1000 px breit. Ränder werden
automatisch abgeschnitten. Wichtig ist die Ansicht:

* **Ring:** von oben, so wie man ihn am Finger sieht. Die Schiene läuft
  **waagerecht** durchs Bild, der Stein liegt in der Mitte. Die Bildbreite
  entspricht der Fingerbreite.
* **Armband:** ebenfalls von oben und waagerecht, als Band quer über das Handgelenk.
* **Kette:** von vorn, wie getragen. Die beiden **oberen Bildecken** sind die
  Stellen, an denen die Kette seitlich am Hals verschwindet.
* **Ohrringe:** **ein einzelner** Ohrring, senkrecht hängend. Der
  Aufhängepunkt ist **oben in der Mitte**. Er wird für beide Ohren verwendet.

In `demo/schmuck/` liegt für jede Art ein Beispiel.

Ein normales Produktfoto auf weißem Grund geht als Notlösung: Der
Hintergrund wird entfernt. Beim Ring bleibt nur der obere Teil, beim
Ohrring-Paar nur der linke Ohrring. Gut aussehen wird es mit eigenen
Anprobe-Bildern.

## Knopf anpassen

Im Liquid-Block können am `<div data-anprobe …>` Attribute ergänzt werden:

| Attribut | Wirkung |
|----------|---------|
| `data-text="Jetzt anprobieren"` | eigene Beschriftung |
| `data-farbe="#7a5a2b"` | Farbe von Knopf und Fenster |
| `data-voll` | gefüllter statt umrandeter Knopf |

Im Theme-CSS lässt sich der Knopf über `[data-anprobe]::part(knopf)` gestalten.

## Datenschutz

Die Kamera wird nur im Browser ausgewertet. Es werden keine Bilder
hochgeladen oder gespeichert, und es gibt keinen eigenen Server.

Zum Start lädt der Browser die Erkennungssoftware (MediaPipe) von
`cdn.jsdelivr.net` und die Modelle von `storage.googleapis.com`. Dabei
sehen diese Anbieter wie bei jedem eingebundenen Skript die IP-Adresse.
Das gehört in die Datenschutzerklärung, oder man hostet beides selbst:

```html
<script>
  window.AnprobeKonfig = {
    mediapipe: 'https://mein-shop.de/anprobe/tasks-vision',   // Inhalt des npm-Pakets @mediapipe/tasks-vision
    modelle: {
      hand: 'https://mein-shop.de/anprobe/hand_landmarker.task',
      gesicht: 'https://mein-shop.de/anprobe/face_landmarker.task',
      koerper: 'https://mein-shop.de/anprobe/pose_landmarker_lite.task'
    }
  };
</script>
```

Dieses Stück muss **vor** dem `<script type="module" …>` stehen.

## Grenzen

* Die Erkennung liefert Gelenk- und Gesichtspunkte, keine Ohrläppchen oder
  Halsränder. Lage und Größe sind daraus geschätzt. Bei ungewöhnlicher
  Haltung lässt sich der Schmuck von Hand nachschieben.
* Der Schmuck liegt immer über dem Bild. Ein Ring wird nicht von anderen
  Fingern verdeckt, ein Ohrring nicht von Haaren.
* Braucht einen aktuellen Browser mit WebAssembly. Die Kamera gibt es nur
  über HTTPS, bei Shopify ist das immer der Fall.

## Aufbau

```
anprobe.js            das ganze Widget, ein ES-Modul ohne Abhängigkeiten
shopify/anprobe.liquid  Block für die Shopify-Produktseite
demo/                 Beispiel-Produktseite und Beispielschmuck
```

Für eigene Seiten ohne Shopify reicht:

```html
<div data-anprobe data-titel="Herzkette Mira" data-art="kette">
  <span hidden data-anprobe-bild data-url="/bilder/herzkette.png"></span>
</div>
<script type="module" src="/anprobe.js"></script>
```
