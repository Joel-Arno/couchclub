/**
 * Anprobe-Widget: Schmuck virtuell anprobieren, direkt auf der Produktseite.
 *
 * Ein Knopf auf der Produktseite oeffnet ein Fenster mit Live-Kamera. Die
 * Erkennung (MediaPipe) laeuft komplett im Browser: Hand fuer Ringe und
 * Armbaender, Gesicht fuer Ohrringe, Oberkoerper fuer Ketten. Das
 * Schmuckbild wird darauf gelegt und folgt jeder Bewegung. Kein Kamerabild
 * verlaesst das Geraet.
 *
 * Einbau: ein Element mit data-anprobe auf der Seite, darin die Bilder als
 * <span data-anprobe-bild data-url="..." data-name="Gold">, und dieses
 * Skript als Modul laden. Alles Weitere steht in der README.
 */

// ---------------------------------------------------------------------------
// Einstellungen
// ---------------------------------------------------------------------------

// Lassen sich vor dem Laden des Skripts ueber window.AnprobeKonfig aendern,
// z. B. um MediaPipe und die Modelle selbst zu hosten.
const MODELL_BASIS = 'https://storage.googleapis.com/mediapipe-models';
const KONFIG = (() => {
  const basis = {
    mediapipe: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0',
    modelle: {
      hand: `${MODELL_BASIS}/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
      gesicht: `${MODELL_BASIS}/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
      koerper: `${MODELL_BASIS}/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`
    },
    knopfText: 'Virtuell anprobieren'
  };
  const eigen = window.AnprobeKonfig || {};
  return { ...basis, ...eigen, modelle: { ...basis.modelle, ...(eigen.modelle || {}) } };
})();

const ARTEN = {
  ring: {
    name: 'Ring', modell: 'hand', kamera: 'environment',
    hinweis: 'Halte deine Hand mit gestreckten Fingern ins Bild',
    nichtGefunden: 'ist keine Hand zu erkennen'
  },
  armband: {
    name: 'Armband', modell: 'hand', kamera: 'environment',
    hinweis: 'Halte Hand und Handgelenk ins Bild',
    nichtGefunden: 'ist keine Hand zu erkennen'
  },
  kette: {
    name: 'Kette', modell: 'koerper', kamera: 'user',
    hinweis: 'Zeig Gesicht und beide Schultern',
    nichtGefunden: 'sind Gesicht und Schultern nicht zu erkennen'
  },
  ohrringe: {
    name: 'Ohrringe', modell: 'gesicht', kamera: 'user',
    hinweis: 'Schau gerade in die Kamera, Haare hinter die Ohren',
    nichtGefunden: 'ist kein Gesicht zu erkennen'
  }
};

const ART_NAMEN = {
  ring: 'ring', ringe: 'ring',
  armband: 'armband', armbaender: 'armband', 'armbänder': 'armband', armreif: 'armband', bracelet: 'armband',
  kette: 'kette', ketten: 'kette', halskette: 'kette', collier: 'kette', necklace: 'kette',
  ohrring: 'ohrringe', ohrringe: 'ohrringe', earring: 'ohrringe', earrings: 'ohrringe'
};

const FINGER = [
  { key: 'daumen', kurz: 'Daumen', name: 'Daumen', a: 2, b: 3, t: 0.5 },
  { key: 'zeige', kurz: 'Zeige', name: 'Zeigefinger', a: 5, b: 6, t: 0.45 },
  { key: 'mittel', kurz: 'Mittel', name: 'Mittelfinger', a: 9, b: 10, t: 0.45 },
  { key: 'ring', kurz: 'Ring', name: 'Ringfinger', a: 13, b: 14, t: 0.45 },
  { key: 'klein', kurz: 'Klein', name: 'Kleiner Finger', a: 17, b: 18, t: 0.45 }
];

// Durchschnittliche Gesichtsbreite auf Hoehe der Ohren, um Millimeter in
// Pixel umzurechnen.
const GESICHT_MM = 140;
const OHRRING_MM = 35;

// ---------------------------------------------------------------------------
// Produktdaten aus der Seite lesen
// ---------------------------------------------------------------------------

function artAusText(text) {
  const t = (text || '').toLowerCase();
  if (/ohrring|ohrstecker|ohrhänger|creole|earring/.test(t)) return 'ohrringe';
  if (/armband|armreif|armkette|armbänder|bracelet|bangle/.test(t)) return 'armband';
  if (/kette|collier|anhänger|choker|necklace|pendant/.test(t)) return 'kette';
  if (/ring/.test(t)) return 'ring';
  return null;
}

/**
 * Die Art des Schmuckstuecks: ausdruecklich per data-art, sonst ueber ein
 * Schlagwort "anprobe:ring", sonst geraten aus Produkttyp und Titel.
 * "anprobe:aus" (oder ein unbekannter Wert) schaltet den Knopf ab.
 */
function bestimmeArt(d) {
  const name = (w) => ART_NAMEN[w.trim().toLowerCase()] || null;
  if (d.art) return name(d.art);
  for (const tag of (d.tags || '').split(',')) {
    const m = /^\s*anprobe\s*:\s*(.+)$/i.exec(tag);
    if (m) return name(m[1]);
  }
  return artAusText(d.typ) || artAusText(d.titel);
}

function leseProdukt(el) {
  const d = el.dataset;
  const bilder = [...el.querySelectorAll('[data-anprobe-bild]')]
    .map((b) => ({ url: b.dataset.url, name: (b.dataset.name || '').trim(), ersatz: 'ersatz' in b.dataset }))
    .filter((b) => b.url);
  if (d.bild) bilder.push({ url: d.bild, name: '', ersatz: 'freistellen' in d });
  // Ein Produktfoto dient nur als Notloesung, wenn es kein Anprobe-Bild gibt.
  const eigene = bilder.filter((b) => !b.ersatz);
  return {
    titel: d.titel || document.title,
    art: bestimmeArt(d),
    mm: parseFloat(d.mm) || null,
    bilder: eigene.length ? eigene : bilder.slice(0, 1)
  };
}

// ---------------------------------------------------------------------------
// Schmuckbilder laden und vorbereiten
// ---------------------------------------------------------------------------

function ladeBild(url, cors) {
  return new Promise((ok, fehler) => {
    const img = new Image();
    if (cors) img.crossOrigin = 'anonymous';
    img.onload = () => ok(img);
    img.onerror = () => fehler(new Error(`Bild nicht ladbar: ${url}`));
    img.src = url;
  });
}

function alsCanvas(quelle, maxSeite) {
  const w = quelle.naturalWidth || quelle.width, h = quelle.naturalHeight || quelle.height;
  const s = Math.min(1, maxSeite / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * s));
  c.height = Math.max(1, Math.round(h * s));
  c.getContext('2d').drawImage(quelle, 0, 0, c.width, c.height);
  return c;
}

function ausschnitt(c, x, y, w, h) {
  const n = document.createElement('canvas');
  n.width = Math.max(1, Math.round(w));
  n.height = Math.max(1, Math.round(h));
  n.getContext('2d').drawImage(c, x, y, w, h, 0, 0, n.width, n.height);
  return n;
}

/** Durchsichtige Raender abschneiden, damit die Groesse am Schmuck haengt. */
function beschneide(c) {
  const { width: w, height: h } = c;
  const px = c.getContext('2d').getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] > 12) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return c;
  return ausschnitt(c, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
}

/**
 * Einfarbigen Hintergrund eines Produktfotos entfernen: Von den Raendern
 * aus wird alles weggenommen, was der Randfarbe aehnelt. Bei unruhigem
 * Hintergrund bleibt das Bild, wie es ist.
 */
function freistellen(c) {
  const { width: w, height: h } = c;
  const ctx = c.getContext('2d');
  const bild = ctx.getImageData(0, 0, w, h);
  const px = bild.data;

  const rand = [];
  for (let x = 0; x < w; x++) rand.push(x, (h - 1) * w + x);
  for (let y = 1; y < h - 1; y++) rand.push(y * w, y * w + w - 1);
  const median = (k) => {
    const werte = rand.map((i) => px[i * 4 + k]).sort((a, b) => a - b);
    return werte[werte.length >> 1];
  };
  const hg = [median(0), median(1), median(2)];
  const abw = (i) => Math.max(Math.abs(px[i * 4] - hg[0]), Math.abs(px[i * 4 + 1] - hg[1]), Math.abs(px[i * 4 + 2] - hg[2]));

  const TOL = 26, WEICH = 64;
  const randPasst = rand.filter((i) => abw(i) < TOL).length / rand.length;
  if (randPasst < 0.8) return c;

  const weg = new Uint8Array(w * h);
  const schlange = new Int32Array(w * h);
  let kopf = 0, ende = 0;
  for (const i of rand) {
    if (!weg[i] && abw(i) < TOL) { weg[i] = 1; schlange[ende++] = i; }
  }
  while (kopf < ende) {
    const i = schlange[kopf++];
    const x = i % w, y = (i / w) | 0;
    const nachbarn = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
    for (const n of nachbarn) {
      if (n >= 0 && !weg[n] && abw(n) < TOL) { weg[n] = 1; schlange[ende++] = n; }
    }
  }
  // Eingeschlossene Flaechen in Hintergrundfarbe (das Loch im Ring) auch
  // entfernen, wenn sie gross genug sind -- kleine Glanzlichter bleiben.
  const mindestens = w * h * 0.01;
  for (let start = 0; start < w * h; start++) {
    if (weg[start] || abw(start) >= TOL) continue;
    kopf = 0; ende = 0;
    weg[start] = 2; schlange[ende++] = start;
    while (kopf < ende) {
      const i = schlange[kopf++];
      const x = i % w, y = (i / w) | 0;
      const nachbarn = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
      for (const n of nachbarn) {
        if (n >= 0 && !weg[n] && abw(n) < TOL) { weg[n] = 2; schlange[ende++] = n; }
      }
    }
    // Zu klein: wieder hergeben, aber als besucht markieren
    const behalten = ende < mindestens ? 3 : 1;
    for (let k = 0; k < ende; k++) weg[schlange[k]] = behalten;
  }
  for (let i = 0; i < w * h; i++) weg[i] = weg[i] === 1 ? 1 : 0;

  for (let i = 0; i < w * h; i++) {
    if (weg[i]) { px[i * 4 + 3] = 0; continue; }
    // Kante weich auslaufen lassen, damit kein heller Saum bleibt
    const x = i % w, y = (i / w) | 0;
    const amRand = (x > 0 && weg[i - 1]) || (x < w - 1 && weg[i + 1]) || (y > 0 && weg[i - w]) || (y < h - 1 && weg[i + w]);
    if (amRand) {
      const a = abw(i);
      if (a < WEICH) px[i * 4 + 3] = Math.round(255 * (a - TOL) / (WEICH - TOL));
    }
  }
  ctx.putImageData(bild, 0, 0);
  return c;
}

/** Bei einem Ohrring-Paar auf einem Foto nur den linken Ohrring nehmen. */
function linkesStueck(c) {
  const { width: w, height: h } = c;
  const px = c.getContext('2d').getImageData(0, 0, w, h).data;
  const belegt = (x) => {
    for (let y = 0; y < h; y++) if (px[(y * w + x) * 4 + 3] > 12) return true;
    return false;
  };
  let lueckeStart = -1;
  for (let x = Math.round(w * 0.2); x < w * 0.8; x++) {
    if (!belegt(x)) {
      if (lueckeStart < 0) lueckeStart = x;
    } else if (lueckeStart >= 0) {
      if (x - lueckeStart >= w * 0.02) return beschneide(ausschnitt(c, 0, 0, lueckeStart, h));
      lueckeStart = -1;
    }
  }
  return c;
}

/**
 * Ein normales Produktfoto zeigt den Schmuck nicht so, wie man ihn
 * getragen von oben sieht. Ein brauchbarer Notbehelf: Hintergrund weg und
 * je nach Art den passenden Teil behalten.
 */
function bereiteProduktfotoVor(c, art) {
  c = beschneide(freistellen(c));
  if (art === 'ring') return beschneide(ausschnitt(c, 0, 0, c.width, c.height * 0.38));
  if (art === 'armband') return beschneide(ausschnitt(c, 0, c.height * 0.55, c.width, c.height * 0.45));
  if (art === 'ohrringe') return linkesStueck(c);
  return c;
}

const bildSpeicher = new Map();

function ladeSchmuck(eintrag, art) {
  const schluessel = `${art}|${eintrag.ersatz ? 'ersatz' : ''}|${eintrag.url}`;
  if (!bildSpeicher.has(schluessel)) {
    const p = (async () => {
      let img, lesbar = true;
      try {
        img = await ladeBild(eintrag.url, true);
      } catch {
        // Ohne CORS laesst sich das Bild zeigen, aber nicht auslesen.
        img = await ladeBild(eintrag.url, false);
        lesbar = false;
      }
      let c = alsCanvas(img, 1000);
      if (lesbar) {
        try {
          c = eintrag.ersatz ? bereiteProduktfotoVor(c, art) : beschneide(c);
        } catch {
          lesbar = false;
        }
      }
      c.lesbar = lesbar;
      return c;
    })();
    p.catch(() => bildSpeicher.delete(schluessel));
    bildSpeicher.set(schluessel, p);
  }
  return bildSpeicher.get(schluessel);
}

// ---------------------------------------------------------------------------
// Erkennung (MediaPipe)
// ---------------------------------------------------------------------------

let vision = null;
const erkenner = {};

function ladeVision() {
  if (!vision) {
    vision = (async () => {
      const mp = await import(/* webpackIgnore: true */ `${KONFIG.mediapipe}/vision_bundle.mjs`);
      const dateien = await mp.FilesetResolver.forVisionTasks(`${KONFIG.mediapipe}/wasm`);
      return { mp, dateien };
    })();
    vision.catch(() => { vision = null; });
  }
  return vision;
}

async function baueErkenner(modell) {
  const { mp, dateien } = await ladeVision();
  const Klasse = { hand: mp.HandLandmarker, gesicht: mp.FaceLandmarker, koerper: mp.PoseLandmarker }[modell];
  const optionen = (delegate) => ({
    baseOptions: { modelAssetPath: KONFIG.modelle[modell], delegate },
    runningMode: 'VIDEO',
    numHands: 1,
    numFaces: 1,
    numPoses: 1
  });
  let task;
  try {
    task = await Klasse.createFromOptions(dateien, optionen('GPU'));
  } catch {
    task = await Klasse.createFromOptions(dateien, optionen('CPU'));
  }
  return { modell, task, modus: 'VIDEO' };
}

function holeErkenner(modell) {
  if (!erkenner[modell]) {
    erkenner[modell] = baueErkenner(modell);
    erkenner[modell].catch(() => { delete erkenner[modell]; });
  }
  return erkenner[modell];
}

async function setzeModus(e, modus) {
  if (e.modus !== modus) {
    await e.task.setOptions({ runningMode: modus });
    e.modus = modus;
  }
}

function punkteAus(e, ergebnis) {
  if (!ergebnis) return null;
  const liste = e.modell === 'gesicht' ? ergebnis.faceLandmarks : ergebnis.landmarks;
  return liste && liste[0] && liste[0].length ? liste[0] : null;
}

// ---------------------------------------------------------------------------
// Platzierung: aus Koerperpunkten Lage, Drehung und Groesse des Schmucks
// ---------------------------------------------------------------------------

const abst = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const mitte = (a, b, t = 0.5) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const einheit = (v) => {
  const l = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / l, y: v.y / l };
};
const klemme = (v, a, b) => Math.min(b, Math.max(a, v));

/** Normierte Punkte in Pixel umrechnen, bei Frontkamera gespiegelt. */
function inPixel(lm, w, h, spiegel) {
  return (i) => ({ x: (spiegel ? 1 - lm[i].x : lm[i].x) * w, y: lm[i].y * h, v: lm[i].visibility });
}

/**
 * Breite eines Fingers am Grundglied. Quer gemessen ueber den Abstand der
 * Knoechel, laengs ueber die Laenge des Glieds -- das zweite traegt, wenn
 * die Hand seitlich zur Kamera steht und die Knoechel zusammenruecken.
 */
function fingerBreite(P, f) {
  const z = abst(P(5), P(9)), m = abst(P(9), P(13)), r = abst(P(13), P(17));
  const quer = { daumen: z * 1.1, zeige: z * 0.92, mittel: (z + m) / 2 * 0.92, ring: (m + r) / 2 * 0.86, klein: r * 0.78 }[f.key];
  const laengs = abst(P(f.a), P(f.b)) * (f.key === 'daumen' ? 0.62 : 0.4);
  return Math.max(quer, laengs);
}

function platziereRing(P, fingerKey) {
  const f = FINGER.find((x) => x.key === fingerKey) || FINGER[3];
  const a = P(f.a), b = P(f.b);
  const p = mitte(a, b, f.t);
  return [{
    key: 'ring', x: p.x, y: p.y,
    winkel: Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2,
    breite: fingerBreite(P, f) * 1.12, ax: 0.5, ay: 0.5
  }];
}

function platziereArmband(P) {
  const gelenk = P(0), mittelhand = P(9);
  const d = { x: mittelhand.x - gelenk.x, y: mittelhand.y - gelenk.y };
  const handLaenge = Math.hypot(d.x, d.y);
  // Ein Stueck vom Handgelenk Richtung Unterarm
  const p = { x: gelenk.x - d.x * 0.15, y: gelenk.y - d.y * 0.15 };
  return [{
    key: 'armband', x: p.x, y: p.y,
    winkel: Math.atan2(d.y, d.x) + Math.PI / 2,
    breite: Math.max(abst(P(5), P(17)) * 1.05, handLaenge * 0.6), ax: 0.5, ay: 0.5
  }];
}

function platziereOhrringe(P, mm) {
  const links = P(234), rechts = P(454), nase = P(1);
  const gesicht = abst(links, rechts);
  const pxProMm = gesicht / GESICHT_MM;
  const hoehe = (mm || OHRRING_MM) * pxProMm;
  const teile = [];
  // Kontur auf Hoehe des Ohrs, Kontur weiter unten am Kiefer, Gegenseite
  for (const [oben, unten, gegen] of [[234, 132, 454], [454, 361, 234]]) {
    const o = P(oben), u = P(unten), g = P(gegen);
    const anteil = abst(nase, o) / (abst(nase, o) + abst(nase, g));
    // Ist der Kopf weggedreht, liegt diese Seite nah an der Nase: Ohr verdeckt
    if (anteil < 0.3) continue;
    const aussen = einheit({ x: o.x - g.x, y: o.y - g.y });
    const p = mitte(o, u, 0.55);
    teile.push({
      key: aussen.x < 0 ? 'ohrL' : 'ohrR',
      x: p.x + aussen.x * gesicht * 0.035, y: p.y + aussen.y * gesicht * 0.035,
      winkel: 0, hoehe, ax: 0.5, ay: 0, seite: aussen.x < 0 ? -1 : 1, pxProMm
    });
  }
  return teile;
}

function platziereKette(P) {
  const sa = P(11), sb = P(12);
  if ((sa.v ?? 1) < 0.5 || (sb.v ?? 1) < 0.5) return [];
  const schulter = mitte(sa, sb), sw = abst(sa, sb);
  const nase = P(0), mund = mitte(P(9), P(10));
  let oben = einheit({ x: -(sb.y - sa.y), y: sb.x - sa.x });
  if ((nase.x - schulter.x) * oben.x + (nase.y - schulter.y) * oben.y < 0) oben = { x: -oben.x, y: -oben.y };
  const kinn = { x: mund.x + (mund.x - nase.x) * 1.3, y: mund.y + (mund.y - nase.y) * 1.3 };
  const hals = klemme((kinn.x - schulter.x) * oben.x + (kinn.y - schulter.y) * oben.y, sw * 0.1, sw * 0.6);
  // Die oberen Enden der Kette liegen seitlich am Hals
  const p = { x: schulter.x + oben.x * hals * 0.62, y: schulter.y + oben.y * hals * 0.62 };
  return [{
    key: 'kette', x: p.x, y: p.y,
    winkel: Math.atan2(oben.x, -oben.y),
    breite: sw * 0.3, ax: 0.5, ay: 0
  }];
}

// ---------------------------------------------------------------------------
// Darstellung
// ---------------------------------------------------------------------------

const SYMBOL = {
  funkeln: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6zM19 14l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9zM5 15l.6 1.7 1.7.6-1.7.6L5 19.6l-.6-1.7-1.7-.6 1.7-.6z" fill="currentColor"/></svg>',
  zu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  bild: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="10" r="1.8" fill="currentColor"/><path d="M4 17l5-5 4 4 3-3 4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  wechseln: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9a8 8 0 0114-3l2 2M20 15a8 8 0 01-14 3l-2-2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M20 4v4h-4M4 20v-4h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  kamera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-2.5h6L17 8h3v11H4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  teilen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 13v7h14v-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  zurueck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};

const KNOPF_CSS = `
  :host { display: block; margin: 12px 0; }
  button {
    display: flex; align-items: center; justify-content: center; gap: .55em;
    width: 100%; min-height: 46px; padding: .7em 1.2em; box-sizing: border-box;
    font: inherit; letter-spacing: .03em; cursor: pointer;
    color: var(--anprobe-farbe, currentColor); background: transparent;
    border: 1px solid currentColor; border-radius: var(--anprobe-radius, 0);
    transition: background .15s;
  }
  button:hover { background: color-mix(in srgb, currentColor 7%, transparent); }
  :host([data-voll]) button { background: var(--anprobe-farbe, #111); color: #fff; border-color: var(--anprobe-farbe, #111); }
  :host([data-voll]) button:hover { filter: brightness(1.12); }
  svg { width: 1.15em; height: 1.15em; flex: none; }
`;

const FENSTER_CSS = `
  :host { all: initial; font-family: inherit; }
  * { box-sizing: border-box; }
  .hintergrund {
    position: fixed; inset: 0; z-index: 2147483000; display: flex;
    align-items: center; justify-content: center; background: rgba(10, 10, 12, .62);
    font-family: inherit; color: #1b1b1f;
  }
  .hintergrund[hidden] { display: none; }
  .fenster {
    display: flex; flex-direction: column; width: min(760px, 100vw); height: min(940px, 100dvh);
    background: #fff; overflow: hidden; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,.35);
  }
  @media (max-width: 760px), (max-height: 700px) { .fenster { border-radius: 0; width: 100vw; height: 100dvh; } }
  .kopf { display: flex; align-items: center; gap: 12px; padding: 12px 14px 12px 18px; border-bottom: 1px solid #eee; }
  .titel { flex: 1; min-width: 0; }
  .titel b { display: block; font-size: 16px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .titel span { font-size: 13px; color: #6b6b73; }
  button { font: inherit; color: inherit; cursor: pointer; }
  .rund {
    display: grid; place-items: center; width: 40px; height: 40px; flex: none;
    border: 0; border-radius: 50%; background: #f2f2f4;
  }
  .rund:hover { background: #e7e7ea; }
  svg { width: 22px; height: 22px; }
  .buehne { position: relative; flex: 1; min-height: 0; background: #111; touch-action: none; user-select: none; }
  canvas, .standbild { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
  canvas { cursor: grab; }
  canvas:active { cursor: grabbing; }
  /* Nicht display:none -- sonst liefert Safari auf dem iPhone keine Bilder */
  video { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
  .standbild[hidden] { display: none; }
  .status {
    position: absolute; left: 50%; bottom: 18px; transform: translateX(-50%);
    max-width: calc(100% - 32px); padding: 10px 16px; border-radius: 999px;
    background: rgba(0,0,0,.62); color: #fff; font-size: 14px; text-align: center;
    display: flex; align-items: center; gap: 10px; pointer-events: none;
  }
  .status[hidden] { display: none; }
  .status.mitte { top: 50%; bottom: auto; transform: translate(-50%, -50%); border-radius: 14px; }
  .kreisel {
    width: 18px; height: 18px; flex: none; border-radius: 50%;
    border: 2px solid rgba(255,255,255,.35); border-top-color: #fff; animation: dreh 0.8s linear infinite;
  }
  .kreisel[hidden] { display: none; }
  @keyframes dreh { to { transform: rotate(360deg); } }
  .leiste { padding: 12px 16px 14px; display: flex; flex-direction: column; gap: 12px; border-top: 1px solid #eee; }
  .chips { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; }
  .chips[hidden] { display: none; }
  .chips::-webkit-scrollbar { display: none; }
  .chip {
    flex: none; display: flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 999px;
    border: 1px solid #d9d9de; background: #fff; font-size: 14px; white-space: nowrap;
  }
  .chip img { width: 22px; height: 22px; object-fit: contain; }
  .beschriftung { flex: none; align-self: center; font-size: 14px; color: #55555c; margin-right: 4px; }
  .leiste.ergebnis .chips { display: none; }
  @media (max-width: 420px) {
    .chips { gap: 6px; }
    .chip { padding: 6px 10px; font-size: 13px; }
    .finger .beschriftung { display: none; }
  }
  .chip[aria-pressed="true"] { border-color: var(--akzent); background: var(--akzent); color: #fff; }
  .groesse { display: flex; align-items: center; gap: 12px; font-size: 14px; color: #55555c; }
  .groesse[hidden] { display: none; }
  .groesse input { flex: 1; accent-color: var(--akzent); }
  .groesse button { border: 0; background: none; font-size: 13px; color: #6b6b73; text-decoration: underline; padding: 4px; }
  .knoepfe { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; }
  .knoepfe > :first-child { justify-self: start; }
  .knoepfe > :last-child { justify-self: end; }
  .text {
    display: inline-flex; align-items: center; gap: 7px; padding: 9px 12px; border: 0;
    border-radius: 10px; background: none; font-size: 14px; white-space: nowrap;
  }
  .text:hover { background: #f2f2f4; }
  .text[hidden] { visibility: hidden; display: inline-flex; }
  .text svg { width: 20px; height: 20px; }
  .ausloeser {
    width: 66px; height: 66px; border-radius: 50%; border: 4px solid var(--akzent);
    background: #fff; padding: 0; position: relative;
  }
  .ausloeser::after { content: ""; position: absolute; inset: 5px; border-radius: 50%; background: var(--akzent); }
  .ausloeser:disabled { opacity: .35; cursor: default; }
  .haupt {
    display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px; border: 0;
    border-radius: 999px; background: var(--akzent); color: #fff; font-size: 15px;
  }
  .klein { margin: 0; font-size: 12px; color: #8a8a92; text-align: center; }
  :focus-visible { outline: 2px solid var(--akzent); outline-offset: 2px; }
`;

function element(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

const maskiere = (s) => String(s).replace(/[&<>"']/g, (z) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[z]));

// ---------------------------------------------------------------------------
// Das Anprobe-Fenster
// ---------------------------------------------------------------------------

class Anprobe {
  constructor() {
    this.host = document.createElement('div');
    this.host.setAttribute('data-anprobe-fenster', '');
    const wurzel = this.host.attachShadow({ mode: 'open' });
    wurzel.innerHTML = `
      <style>${FENSTER_CSS}</style>
      <div class="hintergrund" hidden>
        <div class="fenster" role="dialog" aria-modal="true" aria-labelledby="titel">
          <div class="kopf">
            <div class="titel"><b id="titel"></b><span class="untertitel"></span></div>
            <button class="rund zu" aria-label="Schließen">${SYMBOL.zu}</button>
          </div>
          <div class="buehne">
            <video playsinline muted></video>
            <canvas></canvas>
            <img class="standbild" alt="Dein Anprobe-Foto" hidden>
            <div class="status mitte"><div class="kreisel"></div><span></span></div>
          </div>
          <div class="leiste">
            <div class="chips varianten" role="group" aria-label="Variante"></div>
            <div class="chips finger" role="group" aria-label="Finger"><span class="beschriftung">Finger</span></div>
            <label class="groesse">Größe <input type="range" min="0.6" max="1.6" step="0.01" value="1"><button type="button" class="zuruecksetzen">Zurücksetzen</button></label>
            <div class="knoepfe"></div>
            <p class="klein">Zum Verschieben ziehen. Die Kamera wird nur auf deinem Gerät ausgewertet, es wird nichts hochgeladen.</p>
          </div>
        </div>
      </div>
      <input type="file" accept="image/*" hidden>`;
    const $ = (s) => wurzel.querySelector(s);
    this.el = {
      hg: $('.hintergrund'), titel: $('#titel'), untertitel: $('.untertitel'), zu: $('.zu'),
      buehne: $('.buehne'), video: $('video'), canvas: $('canvas'), standbild: $('.standbild'),
      status: $('.status'), statusText: $('.status span'), kreisel: $('.kreisel'),
      varianten: $('.varianten'), finger: $('.finger'), groesse: $('.groesse'),
      regler: $('.groesse input'), leiste: $('.leiste'), zuruecksetzen: $('.zuruecksetzen'), knoepfe: $('.knoepfe'),
      datei: $('input[type=file]')
    };
    this.ctx = this.el.canvas.getContext('2d');
    this.foto = null;
    this.stream = null;
    this.raf = 0;
    this.zeiger = new Map();
    this.zuletzt = [];

    this.el.zu.addEventListener('click', () => this.schliesse());
    this.el.hg.addEventListener('click', (e) => { if (e.target === this.el.hg) this.schliesse(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.schliesse(); });
    this.el.regler.addEventListener('input', () => { this.skala = +this.el.regler.value; this.neuZeichnen(); });
    this.el.zuruecksetzen.addEventListener('click', () => this.setzeZurueck());
    this.el.datei.addEventListener('change', () => {
      const f = this.el.datei.files[0];
      this.el.datei.value = '';
      if (f) this.zeigeFoto(f);
    });
    this.el.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.setzeSkala(this.skala * Math.exp(-e.deltaY * 0.0015));
    }, { passive: false });
    this.bindeZiehen();
    this.schleife = this.schleife.bind(this);
  }

  // --- Oeffnen und Schliessen ---------------------------------------------

  async oeffne(produkt, ausloeser) {
    if (!this.host.isConnected) document.body.appendChild(this.host);
    const art = ARTEN[produkt.art];
    this.produkt = produkt;
    this.art = art;
    this.ausloeser = ausloeser;
    this.sitzung = (this.sitzung || 0) + 1;
    const sitzung = this.sitzung;
    this.finger = 'ring';
    this.facing = art.kamera;
    this.setzeZurueck(false);
    this.glatt = {};
    this.pendel = {};
    this.punkte = null;
    this.erk = null;
    this.zuletzt = [];
    this.bildIndex = 0;
    this.bild = null;

    this.host.style.setProperty('--akzent', produkt.farbe || '#1b1b1f');
    this.el.titel.textContent = produkt.titel;
    this.el.untertitel.textContent = `${art.name} virtuell anprobieren`;
    this.baueChips();
    this.el.hg.hidden = false;
    this.alterUeberlauf = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    this.el.zu.focus();
    this.setzeModus('laden');
    this.zeigeStatus('Anprobe wird vorbereitet …', true);

    try {
      const [erk] = await Promise.all([
        holeErkenner(art.modell),
        this.waehleBild(0),
        this.starteKamera()
      ]);
      if (sitzung !== this.sitzung) return;
      this.erk = erk;
      this.starteLive();
    } catch (fehler) {
      if (sitzung !== this.sitzung) return;
      console.error('[Anprobe]', fehler);
      this.setzeModus('fehler');
      this.zeigeStatus('Die Anprobe konnte nicht geladen werden. Bitte prüfe deine Internetverbindung und versuch es noch einmal.');
    }
  }

  schliesse() {
    if (this.el.hg.hidden) return;
    this.sitzung++;
    this.stoppeKamera();
    this.el.hg.hidden = true;
    this.el.standbild.hidden = true;
    document.documentElement.style.overflow = this.alterUeberlauf || '';
    if (this.ausloeser) this.ausloeser.focus();
  }

  // --- Kamera --------------------------------------------------------------

  async starteKamera() {
    this.stoppeKamera();
    if (!navigator.mediaDevices?.getUserMedia) {
      this.kameraFehler = 'Dieser Browser gibt die Kamera nicht frei.';
      return;
    }
    const sitzung = this.sitzung;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: this.facing }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      // Inzwischen geschlossen oder auf ein Foto gewechselt: Kamera gleich wieder aus
      if (sitzung !== this.sitzung) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.stream = stream;
      const v = this.el.video;
      v.srcObject = this.stream;
      await v.play();
      const facing = this.stream.getVideoTracks()[0].getSettings().facingMode;
      // Laptop-Kameras melden oft nichts -- die zeigen aufs Gesicht
      this.spiegel = facing ? facing !== 'environment' : true;
      this.kameraFehler = null;
      const geraete = await navigator.mediaDevices.enumerateDevices();
      this.mehrereKameras = geraete.filter((g) => g.kind === 'videoinput').length > 1;
    } catch (fehler) {
      this.stream = null;
      this.kameraFehler = fehler.name === 'NotAllowedError'
        ? 'Du hast den Zugriff auf die Kamera nicht erlaubt.'
        : 'Es wurde keine Kamera gefunden.';
    }
  }

  stoppeKamera() {
    cancelAnimationFrame(this.raf);
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.el.video.srcObject = null;
  }

  async wechsleKamera() {
    this.facing = this.facing === 'user' ? 'environment' : 'user';
    const sitzung = this.sitzung;
    this.zeigeStatus('Kamera wird gewechselt …', true);
    await this.starteKamera();
    if (sitzung === this.sitzung) this.starteLive();
  }

  async starteLive() {
    if (!this.stream) {
      if (this.modus !== 'laden') await this.starteKamera();
      if (!this.stream) {
        this.setzeModus('fehler');
        this.zeigeStatus(`${this.kameraFehler} Du kannst stattdessen ein Foto von dir wählen.`);
        return;
      }
    }
    this.erk = this.erk || await holeErkenner(this.art.modell);
    await setzeModus(this.erk, 'VIDEO');
    this.glatt = {};
    this.pendel = {};
    this.punkte = null;
    this.letzteZeit = -1;
    this.letzterStempel = 0;
    this.verloren = performance.now();
    this.el.standbild.hidden = true;
    this.zeigeStatus(null);
    this.setzeModus('live');
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.schleife);
  }

  schleife(jetzt) {
    if (this.modus !== 'live') return;
    this.raf = requestAnimationFrame(this.schleife);
    const v = this.el.video;
    if (v.readyState < 2 || v.currentTime === this.letzteZeit) return;
    this.letzteZeit = v.currentTime;
    let stempel = performance.now();
    if (stempel <= this.letzterStempel) stempel = this.letzterStempel + 1;
    this.letzterStempel = stempel;
    try {
      this.punkte = punkteAus(this.erk, this.erk.task.detectForVideo(v, stempel));
    } catch (fehler) {
      console.warn('[Anprobe]', fehler);
      this.punkte = null;
    }
    this.zeichne(v, v.videoWidth, v.videoHeight, true, jetzt);
  }

  // --- Eigenes Foto ---------------------------------------------------------

  async zeigeFoto(datei) {
    // Neue Sitzung: ein noch laufender Kamerastart wird verworfen
    const sitzung = ++this.sitzung;
    this.stoppeKamera();
    this.setzeModus('laden');
    this.zeigeStatus('Foto wird ausgewertet …', true);
    try {
      const url = URL.createObjectURL(datei);
      // Ein <img> beachtet die Drehung aus den EXIF-Daten von Handyfotos
      const img = await ladeBild(url, false);
      URL.revokeObjectURL(url);
      this.foto = alsCanvas(img, 1600);
      this.erk = await holeErkenner(this.art.modell);
      await setzeModus(this.erk, 'IMAGE');
      if (sitzung !== this.sitzung) return;
      this.punkte = punkteAus(this.erk, this.erk.task.detect(this.foto));
      this.spiegel = false;
      this.glatt = {};
      this.el.standbild.hidden = true;
      this.setzeModus('foto');
      this.neuZeichnen();
      this.zeigeStatus(this.zuletzt.length ? null : `Auf dem Foto ${this.art.nichtGefunden}. Versuch ein anderes Foto.`);
    } catch (fehler) {
      console.error('[Anprobe]', fehler);
      this.setzeModus('fehler');
      this.zeigeStatus('Das Foto konnte nicht geöffnet werden.');
    }
  }

  // --- Zeichnen ---------------------------------------------------------------

  neuZeichnen() {
    if (this.modus === 'foto' && this.foto) this.zeichne(this.foto, this.foto.width, this.foto.height, false);
  }

  zeichne(quelle, w, h, live, jetzt = performance.now()) {
    const c = this.el.canvas;
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const ctx = this.ctx;
    ctx.save();
    if (this.spiegel) { ctx.translate(w, 0); ctx.scale(-1, 1); }
    ctx.drawImage(quelle, 0, 0, w, h);
    ctx.restore();

    const teile = this.punkte && this.bild ? this.platziere(inPixel(this.punkte, w, h, this.spiegel)) : [];
    const dt = this.letzterLauf ? (jetzt - this.letzterLauf) / 1000 : 0;
    this.letzterLauf = jetzt;

    for (const t of teile) {
      const seitenverh = this.bild.width / this.bild.height;
      if (t.hoehe) t.breite = t.hoehe * seitenverh;
      if (live) this.glaette(t);
      t.breite *= this.skala;
      if (t.seite) {
        t.x += t.seite * this.versatz.x * t.breite;
        t.y += this.versatz.y * t.breite;
      } else {
        const cos = Math.cos(t.winkel), sin = Math.sin(t.winkel);
        t.x += (this.versatz.x * cos - this.versatz.y * sin) * t.breite;
        t.y += (this.versatz.x * sin + this.versatz.y * cos) * t.breite;
      }
      const winkel = live && t.pxProMm ? t.winkel + this.schwinge(t, dt, seitenverh) : t.winkel;
      const bh = t.breite / seitenverh;
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(winkel);
      ctx.shadowColor = 'rgba(0, 0, 0, .35)';
      ctx.shadowBlur = Math.max(2, t.breite * 0.04);
      ctx.shadowOffsetY = Math.max(1, t.breite * 0.015);
      ctx.drawImage(this.bild, -t.breite * t.ax, -bh * t.ay, t.breite, bh);
      ctx.restore();
    }
    this.zuletzt = teile;

    if (live) {
      if (teile.length) this.verloren = jetzt;
      const suchen = jetzt - this.verloren > 700;
      if (suchen !== this.suchHinweis) {
        this.suchHinweis = suchen;
        this.zeigeStatus(suchen ? this.art.hinweis : null);
      }
    }
  }

  platziere(P) {
    switch (this.produkt.art) {
      case 'ring': return platziereRing(P, this.finger);
      case 'armband': return platziereArmband(P);
      case 'ohrringe': return platziereOhrringe(P, this.produkt.mm);
      case 'kette': return platziereKette(P);
      default: return [];
    }
  }

  /** Zittern daempfen; je groesser die Bewegung, desto direkter folgt der Schmuck. */
  glaette(t) {
    const alt = this.glatt[t.key];
    if (alt) {
      const weg = Math.hypot(t.x - alt.x, t.y - alt.y) / (alt.breite || 1);
      const a = klemme(0.3 + weg * 0.9, 0.3, 0.92);
      t.x = alt.x + (t.x - alt.x) * a;
      t.y = alt.y + (t.y - alt.y) * a;
      t.breite = alt.breite + (t.breite - alt.breite) * a;
      const dw = Math.atan2(Math.sin(t.winkel - alt.winkel), Math.cos(t.winkel - alt.winkel));
      t.winkel = alt.winkel + dw * a;
    }
    this.glatt[t.key] = { x: t.x, y: t.y, breite: t.breite, winkel: t.winkel };
  }

  /**
   * Ohrringe pendeln: Ein gedaempftes Pendel, angestossen von der seitlichen
   * Beschleunigung des Ohrlaeppchens.
   */
  schwinge(t, dt, seitenverh) {
    const s = this.pendel[t.key] || (this.pendel[t.key] = { phi: 0, om: 0, x: t.x, vx: 0 });
    if (dt <= 0 || dt > 0.12) {
      s.x = t.x;
      s.vx = 0;
      return s.phi;
    }
    const vx = s.vx + ((t.x - s.x) / dt - s.vx) * 0.5;
    const ax = klemme((vx - s.vx) / dt, -20000, 20000) * 0.7;
    const laenge = Math.max(4, (t.breite / seitenverh) * 0.6);
    const g = 9810 * t.pxProMm;
    const schritte = 4, h = dt / schritte;
    for (let i = 0; i < schritte; i++) {
      const beschl = -(g / laenge) * Math.sin(s.phi) + (ax / laenge) * Math.cos(s.phi) - 6 * s.om;
      s.om += beschl * h;
      s.phi = klemme(s.phi + s.om * h, -0.7, 0.7);
    }
    s.x = t.x;
    s.vx = vx;
    return s.phi;
  }

  // --- Verschieben und Groesse ------------------------------------------------

  bindeZiehen() {
    const c = this.el.canvas;
    const imCanvas = (e) => {
      const r = c.getBoundingClientRect();
      const s = Math.min(r.width / c.width, r.height / c.height);
      return {
        x: (e.clientX - r.left - (r.width - c.width * s) / 2) / s,
        y: (e.clientY - r.top - (r.height - c.height * s) / 2) / s
      };
    };
    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId);
      this.zeiger.set(e.pointerId, imCanvas(e));
      if (this.zeiger.size === 2) {
        const [a, b] = [...this.zeiger.values()];
        this.zwick = { abstand: abst(a, b), skala: this.skala };
      }
    });
    c.addEventListener('pointermove', (e) => {
      if (!this.zeiger.has(e.pointerId)) return;
      const vorher = this.zeiger.get(e.pointerId);
      const jetzt = imCanvas(e);
      this.zeiger.set(e.pointerId, jetzt);
      if (this.zeiger.size === 1) {
        this.verschiebe(jetzt.x - vorher.x, jetzt.y - vorher.y, jetzt);
      } else if (this.zeiger.size === 2 && this.zwick) {
        const [a, b] = [...this.zeiger.values()];
        this.setzeSkala(this.zwick.skala * abst(a, b) / (this.zwick.abstand || 1));
      }
    });
    const los = (e) => {
      this.zeiger.delete(e.pointerId);
      if (this.zeiger.size < 2) this.zwick = null;
    };
    c.addEventListener('pointerup', los);
    c.addEventListener('pointercancel', los);
  }

  verschiebe(dx, dy, bei) {
    if (!this.zuletzt.length) return;
    let t = this.zuletzt[0];
    for (const u of this.zuletzt) if (abst(u, bei) < abst(t, bei)) t = u;
    if (t.seite) {
      this.versatz.x += t.seite * dx / t.breite;
      this.versatz.y += dy / t.breite;
    } else {
      const cos = Math.cos(t.winkel), sin = Math.sin(t.winkel);
      this.versatz.x += (dx * cos + dy * sin) / t.breite;
      this.versatz.y += (-dx * sin + dy * cos) / t.breite;
    }
    this.versatz.x = klemme(this.versatz.x, -3, 3);
    this.versatz.y = klemme(this.versatz.y, -3, 3);
    this.neuZeichnen();
  }

  setzeSkala(s) {
    this.skala = klemme(s, 0.6, 1.6);
    this.el.regler.value = this.skala;
    this.neuZeichnen();
  }

  setzeZurueck(zeichnen = true) {
    this.skala = 1;
    this.versatz = { x: 0, y: 0 };
    this.el.regler.value = 1;
    if (zeichnen) this.neuZeichnen();
  }

  // --- Varianten und Finger ---------------------------------------------------

  async waehleBild(i) {
    this.bildIndex = i;
    const eintrag = this.produkt.bilder[i];
    const bild = await ladeSchmuck(eintrag, this.produkt.art);
    if (this.bildIndex === i) {
      this.bild = bild;
      this.neuZeichnen();
    }
    this.markiere(this.el.varianten, i);
  }

  baueChips() {
    const { varianten, finger } = this.el;
    const bilder = this.produkt.bilder;
    varianten.hidden = bilder.length < 2;
    varianten.innerHTML = bilder.map((b, i) =>
      `<button class="chip" data-i="${i}" aria-pressed="${i === 0}"><img src="${maskiere(b.url)}" alt="">${maskiere(b.name || `Variante ${i + 1}`)}</button>`
    ).join('');
    varianten.onclick = (e) => {
      const b = e.target.closest('[data-i]');
      if (b) this.waehleBild(+b.dataset.i).catch((f) => console.error('[Anprobe]', f));
    };

    finger.hidden = this.produkt.art !== 'ring';
    finger.innerHTML = '<span class="beschriftung">Finger</span>' + FINGER.map((f) =>
      `<button class="chip" data-f="${f.key}" aria-pressed="${f.key === this.finger}" aria-label="${f.name}" title="${f.name}">${f.kurz}</button>`
    ).join('');
    finger.onclick = (e) => {
      const b = e.target.closest('[data-f]');
      if (!b) return;
      this.finger = b.dataset.f;
      finger.querySelectorAll('[data-f]').forEach((k) => k.setAttribute('aria-pressed', k === b));
      this.neuZeichnen();
    };
  }

  markiere(gruppe, i) {
    [...gruppe.children].forEach((k, j) => k.setAttribute('aria-pressed', j === i));
  }

  // --- Knoepfe je Zustand -----------------------------------------------------

  setzeModus(modus) {
    this.modus = modus;
    const k = this.el.knoepfe;
    const knopf = (klasse, symbol, text, aktion, verbergen = false) => {
      const b = element(`<button class="${klasse}">${symbol}<span>${text}</span></button>`);
      b.hidden = verbergen;
      b.addEventListener('click', aktion);
      return b;
    };
    const fotoWaehlen = (text = 'Foto wählen') => knopf('text', SYMBOL.bild, text, () => this.el.datei.click());
    const ausloeser = element('<button class="ausloeser" aria-label="Foto machen"></button>');
    ausloeser.addEventListener('click', () => this.nimmAuf());
    ausloeser.disabled = modus === 'laden' || modus === 'fehler';
    this.el.groesse.hidden = !(modus === 'live' || modus === 'foto');
    this.el.leiste.classList.toggle('ergebnis', modus === 'ergebnis');
    k.replaceChildren();

    if (modus === 'live' || modus === 'laden') {
      k.append(fotoWaehlen(), ausloeser,
        knopf('text', SYMBOL.wechseln, 'Kamera', () => this.wechsleKamera(), !this.mehrereKameras));
    } else if (modus === 'foto') {
      k.append(fotoWaehlen('Anderes Foto'), ausloeser,
        knopf('text', SYMBOL.kamera, 'Live', () => this.starteLive()));
    } else if (modus === 'ergebnis') {
      k.append(knopf('text', SYMBOL.zurueck, 'Zurück', () => this.zurueckVomErgebnis()),
        knopf('haupt', SYMBOL.teilen, 'Speichern / Teilen', () => this.teile()),
        element('<span></span>'));
    } else {
      k.append(element('<span></span>'), knopf('haupt', SYMBOL.bild, 'Foto wählen', () => this.el.datei.click()), element('<span></span>'));
    }
  }

  zeigeStatus(text, laden = false) {
    const s = this.el.status;
    s.hidden = !text;
    if (!text) return;
    this.el.statusText.textContent = text;
    this.el.kreisel.hidden = !laden;
    s.classList.toggle('mitte', laden || this.modus === 'fehler');
  }

  // --- Aufnehmen und Teilen ---------------------------------------------------

  async nimmAuf() {
    const quelle = this.el.canvas;
    const c = alsCanvas(quelle, 2000);
    const ctx = c.getContext('2d');
    const schrift = Math.round(c.width * 0.028);
    ctx.font = `600 ${schrift}px system-ui, sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,.6)';
    ctx.shadowBlur = schrift * 0.4;
    ctx.fillText(this.produkt.titel, schrift, c.height - schrift);
    try {
      this.ergebnis = await new Promise((ok, fehler) =>
        c.toBlob((b) => (b ? ok(b) : fehler(new Error('leer'))), 'image/jpeg', 0.92));
    } catch (fehler) {
      console.error('[Anprobe]', fehler);
      this.zeigeStatus('Das Foto lässt sich mit diesem Schmuckbild leider nicht speichern.');
      return;
    }
    this.vorErgebnis = this.modus;
    if (this.modus === 'live') cancelAnimationFrame(this.raf);
    if (this.ergebnisUrl) URL.revokeObjectURL(this.ergebnisUrl);
    this.ergebnisUrl = URL.createObjectURL(this.ergebnis);
    this.el.standbild.src = this.ergebnisUrl;
    this.el.standbild.hidden = false;
    this.zeigeStatus(null);
    this.setzeModus('ergebnis');
  }

  zurueckVomErgebnis() {
    this.el.standbild.hidden = true;
    if (this.vorErgebnis === 'foto') {
      this.setzeModus('foto');
      this.neuZeichnen();
    } else {
      this.setzeModus('live');
      this.raf = requestAnimationFrame(this.schleife);
    }
  }

  async teile() {
    // Umlaute umschreiben: Chrome verwirft Dateinamen mit Sonderzeichen
    const kurz = this.produkt.titel.toLowerCase()
      .replace(/[äöüß]/g, (z) => ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' }[z]))
      .normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const name = `anprobe-${kurz || 'schmuck'}.jpg`;
    const datei = new File([this.ergebnis], name, { type: 'image/jpeg' });
    if (navigator.canShare?.({ files: [datei] })) {
      try {
        await navigator.share({ files: [datei], title: this.produkt.titel });
        return;
      } catch (fehler) {
        if (fehler.name === 'AbortError') return;
      }
    }
    const a = document.createElement('a');
    a.href = this.ergebnisUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

// ---------------------------------------------------------------------------
// Knoepfe auf der Seite
// ---------------------------------------------------------------------------

let fenster = null;

function oeffne(produkt, ausloeser) {
  if (!ARTEN[produkt.art]) throw new Error(`Unbekannte Schmuckart: ${produkt.art}`);
  if (!produkt.bilder?.length) throw new Error('Kein Schmuckbild angegeben');
  fenster = fenster || new Anprobe();
  return fenster.oeffne(produkt, ausloeser);
}

function init(wurzel = document) {
  const elemente = wurzel.matches?.('[data-anprobe]') ? [wurzel] : wurzel.querySelectorAll('[data-anprobe]');
  for (const el of elemente) {
    if (el.hasAttribute('data-anprobe-bereit')) continue;
    el.setAttribute('data-anprobe-bereit', '');
    const produkt = leseProdukt(el);
    if (!produkt.art || !produkt.bilder.length) {
      if (!produkt.art) console.info('[Anprobe] Keine Schmuckart erkannt, Knopf ausgeblendet:', produkt.titel);
      continue;
    }
    if (el.dataset.farbe) {
      el.style.setProperty('--anprobe-farbe', el.dataset.farbe);
      produkt.farbe = el.dataset.farbe;
    }
    const wurzelKnopf = el.shadowRoot || el.attachShadow({ mode: 'open' });
    wurzelKnopf.innerHTML = `<style>${KNOPF_CSS}</style><button type="button" part="knopf">${SYMBOL.funkeln}<span>${maskiere(el.dataset.text || KONFIG.knopfText)}</span></button>`;
    const knopf = wurzelKnopf.querySelector('button');
    knopf.addEventListener('click', () => oeffne(produkt, knopf));
    // Erkennung schon vorladen, wenn jemand in die Naehe des Knopfs kommt
    knopf.addEventListener('pointerenter', () => holeErkenner(ARTEN[produkt.art].modell).catch(() => {}), { once: true });
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init());
else init();
// Shopify-Themeeditor laedt Abschnitte nach
document.addEventListener('shopify:section:load', (e) => init(e.target));

window.Anprobe = { init, oeffne, KONFIG };
export { init, oeffne, bestimmeArt, freistellen, KONFIG };
