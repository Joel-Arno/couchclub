/* Eier-Timer – alle Stellschrauben an einem Ort.
 *
 * Hier kannst du feinjustieren. Die Rechnung selbst steht in physik.js,
 * die Bedienung in app.js. Nach einer Änderung einfach die Seite neu laden.
 *
 * Kalibrierung: Mit den Werten unten ergibt ein Ei der Größe M aus dem
 * Kühlschrank, ins sprudelnde Wasser auf Meereshöhe gelegt und danach
 * abgeschreckt, etwa: weich 6:00, wachsweich 7:00, mittel 8:15, hart 10:00.
 * Sind dir alle Eier zu weich oder zu hart, ändere zuerst PRAXISFAKTOR,
 * passt nur eine Garstufe nicht, deren Zieltemperatur.
 */
const EIER_CONFIG = {
  // Gewicht mit Schale in Gramm, typische Mitte der EU-Gewichtsklassen
  GROESSEN: {
    S:  { gramm: 49, info: 'unter 53 g' },
    M:  { gramm: 58, info: '53–63 g' },
    L:  { gramm: 68, info: '63–73 g' },
    XL: { gramm: 77, info: 'ab 73 g' },
  },

  // Temperatur der Eier vor dem Kochen in °C
  STARTTEMPERATUR: {
    kuehlschrank: { grad: 5,  name: 'Kühlschrank' },
    zimmer:       { grad: 20, name: 'Zimmertemperatur' },
  },

  // Zieltemperatur am Rand des Eigelbs in °C (dort, wo Eiweiß und Eigelb sich
  // treffen; so ist Williams' Formel gemeint). Gemeint ist die höchste
  // Temperatur, die dort erreicht wird, also inklusive Nachgaren.
  GARSTUFEN: {
    weich:      { ziel: 64.5, name: 'Weich',      info: 'Eigelb flüssig, Eiweiß gerade fest' },
    wachsweich: { ziel: 69,   name: 'Wachsweich', info: 'Eigelb cremig, Rand schon fest' },
    mittel:     { ziel: 73.5, name: 'Mittel',     info: 'Eigelb fast fest, Mitte noch saftig' },
    hart:       { ziel: 78.5, name: 'Hart',       info: 'Eigelb durchgehend fest' },
  },

  // Williams' Konstante in Minuten pro Gramm^(2/3). Sie steckt in seiner Formel
  // t = 0,451 · M^(2/3) · ln(0,76 · (T_Ei − T_Wasser) / (T_Eigelb − T_Wasser))
  // und folgt aus Dichte, Wärmekapazität und Wärmeleitfähigkeit des Eis.
  WILLIAMS_K: 0.451,

  // Echte Eier garen etwas langsamer als die ideale Kugel aus Williams' Modell
  // (Schale, Luftblase, Grenzschicht im Wasser, Eiform). 1,0 = reine Theorie.
  PRAXISFAKTOR: 1.25,

  // Position des Eigelbrands als Anteil vom Radius. Passt zu Williams' 0,76.
  EIGELB_RAND: 0.69,

  // Wasser im Topf in Litern und wie viele Eier gut hineinpassen
  TOEPFE: {
    klein:  { liter: 1.2, maxEier: 4,  name: 'Klein' },
    mittel: { liter: 2.0, maxEier: 8,  name: 'Mittel' },
    gross:  { liter: 3.5, maxEier: 14, name: 'Groß' },
  },
  MAX_EIER: 20,

  // Wärme, die der Herd auf hoher Stufe tatsächlich ins Wasser bringt, in Watt.
  // Bestimmt, wie stark viele kalte Eier das kochende Wasser abkühlen und wie
  // lange es beim kalten Aufsetzen bis zum Kochen dauert (Schätzung; beim
  // kalten Aufsetzen misst die App die echte Aufheizzeit und rechnet damit).
  HERD_WATT: 1500,

  LEITUNGSWASSER: 15,      // °C, Wasser beim kalten Aufsetzen
  ABSCHRECKWASSER: 12,     // °C, kaltes Wasser zum Abschrecken
  RAUMTEMPERATUR: 22,      // °C, Luft, wenn nicht abgeschreckt wird

  // Wärmeübergang an der Schale in W/(m²·K) nach dem Herausnehmen
  WAERMEUEBERGANG_ABSCHRECKEN: 500,
  WAERMEUEBERGANG_LUFT: 15,

  // Stoffwerte
  EI_DICHTE: 1.038,            // g/cm³
  EI_WAERMEKAPAZITAET: 3.7,    // J/(g·K)
  EI_WAERMELEITUNG: 0.54,      // W/(m·K)
  WASSER_WAERMEKAPAZITAET: 4.18, // J/(g·K)

  // Luftdruck
  NORMALDRUCK: 1013.25,    // hPa, wenn weder Standort noch Höhe bekannt sind
  // Antoine-Gleichung für Wasser (Druck in mmHg, Temperatur in °C)
  ANTOINE: { A: 8.07131, B: 1730.63, C: 233.426 },

  // Open-Meteo: aktueller Luftdruck am Boden, kostenlos und ohne Schlüssel
  OPEN_METEO_URL: 'https://api.open-meteo.com/v1/forecast',
  DRUCK_GUELTIG_MIN: 60,   // so lange wird ein abgerufener Luftdruck weiterverwendet

  // Rechengenauigkeit
  MODEN: 40,               // Glieder der Reihenentwicklung
  ZEITSCHRITT: 1,          // Sekunden
  MAX_KOCHZEIT_MIN: 60,
  NACHLAUF_MIN: 10,        // so lange wird das Nachgaren nach dem Herausnehmen verfolgt

  // Alarm
  ALARM_WIEDERHOLEN_S: 120, // so lange klingelt es, wenn niemand reagiert
};

if (typeof module !== 'undefined') module.exports = EIER_CONFIG;
