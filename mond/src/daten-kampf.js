/* =====================================================================
   DATEN: Herkünfte, Waffen, Schilde, Talismane, Gegenstände, Gegner
   Zeiten in Millisekunden ab Beginn des Angriffs.
   Trefferarten: p = parierbar, b = nur blocken oder ausweichen, u = nur ausweichen
   ===================================================================== */

/* ---------- Herkünfte: Start-Ausrüstung und Attribute ---------- */
const HERK = {
  kron: {
    name: 'Kronwächter', item: 'Ein Langschwert und ein zerbeulter Schild',
    blurb: 'Hält viel aus. Der Schild fängt fast jeden Schlag ab.',
    rise: 'Du stehst auf. Das Schwert liegt dir in der Hand, der Schild an deinem Arm, als wäre es nie anders gewesen.',
    waffe: 'langschwert', schild: 'rundschild', fp: 40,
    attr: { vit: 3, aus: 2, str: 3, ges: 2 }
  },
  harp: {
    name: 'Harpunierin', item: 'Eine Harpune mit Widerhaken',
    blurb: 'Schnell und beweglich. Ihr Wurf unterbricht Angriffe.',
    rise: 'Du stehst auf. Die Harpune liegt dir in der Hand, als wäre es nie anders gewesen.',
    waffe: 'harpune', schild: null, fp: 42,
    attr: { vit: 2, aus: 4, str: 1, ges: 4 }
  },
  moench: {
    name: 'Glockenmönch', item: 'Ein Hammer, an dem eine Glocke hängt',
    blurb: 'Langsam und wuchtig. Sein Geläut verletzt und heilt.',
    rise: 'Du stehst auf. Der Hammer liegt dir schwer in der Hand. Die kleine Glocke daran schweigt, als wartete sie.',
    waffe: 'glockenhammer', schild: null, fp: 75,
    attr: { vit: 3, aus: 1, str: 4, ges: 1 }
  }
};
const ATTR = {
  vit: { name: 'Vitalität', text: '+12 Leben' },
  aus: { name: 'Ausdauer', text: '+8 Ausdauer' },
  str: { name: 'Stärke', text: 'Mehr Schaden mit schweren Waffen' },
  ges: { name: 'Geschick', text: 'Mehr Schaden mit schnellen Waffen' }
};

/* ---------- Waffen ----------
   klasse: klinge (einhändig, Schild möglich), speer, wucht (beidhändig)
   skal:   Schadensanteil pro Punkt Stärke und Geschick
   heavy.wind: Mindestdauer des Ausholens, bevor der schwere Schlag kommt */
const WAFFEN = {
  langschwert: {
    name: 'Langschwert', klasse: 'klinge', look: 'schwert',
    text: 'Eine gerade Klinge der Kronwacht. Ausgewogen, verzeiht viel.',
    light: [
      { pose: 'l1', d: 11, pz: 10, st: 16, hit: 190, dur: 440 },
      { pose: 'l2', d: 11, pz: 10, st: 16, hit: 170, dur: 420 },
      { pose: 'l3', d: 15, pz: 15, st: 19, hit: 200, dur: 520 }
    ],
    heavy: { d: 29, pz: 33, st: 30, wind: 420, hit: 170, dur: 560 },
    skal: { str: .035, ges: .02 },
    art: { id: 'kronhieb', name: 'Kronhieb', fp: 18, hits: [{ t: 560, d: 30, pz: 60 }], dur: 900, hyper: [120, 560], anim: 'sprung', text: 'Sprunghieb, der die Haltung bricht. Im Sprung unerschütterlich.' }
  },
  entermesser: {
    name: 'Entermesser', klasse: 'klinge', look: 'entermesser',
    text: 'Kurz, krumm, schnell. Von einem Seemann, der es nicht mehr braucht.',
    light: [
      { pose: 'l1', d: 8, pz: 7, st: 12, hit: 150, dur: 360 },
      { pose: 'l2', d: 8, pz: 7, st: 12, hit: 140, dur: 350 },
      { pose: 'l3', d: 11, pz: 10, st: 14, hit: 160, dur: 420 }
    ],
    heavy: { d: 20, pz: 22, st: 24, wind: 300, hit: 140, dur: 460 },
    skal: { str: .015, ges: .05 }, dodgeSt: 18,
    art: { id: 'wirbelhieb', name: 'Wirbelhieb', fp: 14, hits: [{ t: 240, d: 12, pz: 10 }, { t: 480, d: 14, pz: 14 }], dur: 780, anim: 'wirbel', text: 'Zwei schnelle Hiebe hintereinander.' }
  },
  harpune: {
    name: 'Harpune', klasse: 'speer', look: 'harpune',
    text: 'Eine Walfängerharpune mit Widerhaken und Seil. Lang und schnell.',
    light: [
      { pose: 'l1', d: 9, pz: 8, st: 13, hit: 150, dur: 370 },
      { pose: 'l2', d: 9, pz: 8, st: 13, hit: 140, dur: 360 },
      { pose: 'l3', d: 12, pz: 12, st: 15, hit: 170, dur: 440 }
    ],
    heavy: { d: 23, pz: 25, st: 26, wind: 330, hit: 150, dur: 520 },
    skal: { str: .02, ges: .045 }, dodgeSt: 18,
    art: { id: 'widerhaken', name: 'Widerhaken', fp: 14, hits: [{ t: 300, d: 16, pz: 34 }], dur: 640, interrupt: true, anim: 'wurf', text: 'Wurf, der einen Gegner beim Ausholen unterbricht.' }
  },
  glockenhammer: {
    name: 'Glockenhammer', klasse: 'wucht', look: 'hammer',
    text: 'Ein Hammer der Glockengießer. Die kleine Glocke daran läutet bei jedem Schlag.',
    light: [
      { pose: 'l1', d: 14, pz: 14, st: 19, hit: 250, dur: 560 },
      { pose: 'l2', d: 14, pz: 14, st: 19, hit: 240, dur: 540 },
      { pose: 'l3', d: 18, pz: 20, st: 22, hit: 280, dur: 640 }
    ],
    heavy: { d: 34, pz: 38, st: 34, wind: 520, hit: 190, dur: 640 },
    skal: { str: .045, ges: .01 },
    art: { id: 'grabgelaeut', name: 'Grabgeläut', fp: 25, hits: [{ t: 520, d: 24, pz: 22 }], heal: 22, ring: true, dur: 1000, text: 'Glockenschlag, der den Gegner verletzt und dich heilt.' }
  },
  vogtshaken: {
    name: 'Haken des Vogts', klasse: 'speer', look: 'haken', nachhall: 'vogt',
    text: 'Aus dem Nachhall des Strandvogts gegossen. Er zieht, was er trifft, zu sich heran.',
    light: [
      { pose: 'l1', d: 12, pz: 12, st: 15, hit: 180, dur: 430 },
      { pose: 'l2', d: 12, pz: 12, st: 15, hit: 170, dur: 420 },
      { pose: 'l3', d: 16, pz: 16, st: 18, hit: 200, dur: 500 }
    ],
    heavy: { d: 30, pz: 36, st: 30, wind: 440, hit: 170, dur: 580 },
    skal: { str: .03, ges: .03 },
    art: { id: 'hakenzug', name: 'Hakenzug', fp: 16, hits: [{ t: 340, d: 20, pz: 46 }], dur: 720, interrupt: true, text: 'Reißt den Gegner aus dem Ausholen und bricht Haltung.' }
  },
  glockenstab: {
    name: 'Glocke der Braut', klasse: 'wucht', look: 'glockenstab', nachhall: 'isolde',
    text: 'Aus Isoldes Nachhall. Die Glocke läutet bei jedem Schlag, leise, als riefe sie jemanden.',
    light: [
      { pose: 'l1', d: 15, pz: 15, st: 19, hit: 250, dur: 560 },
      { pose: 'l2', d: 15, pz: 15, st: 19, hit: 240, dur: 540 },
      { pose: 'l3', d: 20, pz: 22, st: 22, hit: 280, dur: 640 }
    ],
    heavy: { d: 37, pz: 40, st: 34, wind: 540, hit: 190, dur: 660 },
    skal: { str: .035, ges: .02 },
    art: { id: 'totengelaeut', name: 'Totengeläut', fp: 28, hits: [{ t: 620, d: 40, pz: 42 }], ring: 'gross', dur: 1100, text: 'Ein Glockenschlag, der alles in der Nähe erschüttert.' }
  }
};
// Blocken ohne Schild, nach Waffenklasse
const KLASSE_BLOCK = { klinge: { block: .5, st: 1.25 }, speer: { block: .6, st: 1.15 }, wucht: { block: .66, st: 1.0 } };
const MAX_STUFE = 5;
const upgradeKosten = lvl => ({ erz: lvl + 1, glut: 200 * (lvl + 1) });

const SCHILDE = {
  rundschild: { name: 'Zerbeulter Rundschild', block: .88, st: .9, text: 'Schild der Kronwacht. Fängt fast jeden Schlag ab.' },
  treibholz: { name: 'Treibholzschild', block: .76, st: 1.0, text: 'Planken aus einem Wrack, mit Eisen beschlagen. Schwer, aber besser als nichts.' },
  glockenschild: { name: 'Glockenschild', block: .92, st: .85, text: 'Aus Glockenbronze gegossen. Er dröhnt, wenn er getroffen wird.' }
};

const TALISMANE = {
  muschel: { name: 'Stille Muschel', text: 'Ausdauer erholt sich 25 % schneller.', stRegen: 1.25 },
  salzamulett: { name: 'Salzamulett', text: '+20 % Haltungsschaden.', pz: 1.2 },
  traenenperle: { name: 'Tränenperle', text: 'Phiolen heilen 60 % statt 45 % des Lebens.', heal: .6 },
  ehering: { name: 'Rostiger Ehering', text: '+10 % Schaden. Die Gravur ist kaum zu lesen: „für immer“.', dmg: 1.1 },
  glockenzunge: { name: 'Glockenzunge', text: 'Paraden geben doppelt so viel Fokus.', parryFp: 2 },
  taucherstein: { name: 'Taucherstein', text: '+15 % Leben. Ein glatter Stein mit einem Loch, an einer Lederschnur.', hp: 1.15 },
  wachsiegel: { name: 'Siegel der Kronwacht', text: 'Blocken kostet 25 % weniger Ausdauer. Schwarzes Wachs, das das Meer nicht anrühren wollte.', blockSt: .75 },
  brautring: { name: 'Kaldens Ring', text: '+8 % Schaden, +12 % Haltungsschaden. Dreihundert Jahre an der falschen Hand.', dmg: 1.08, pz: 1.12 }
};

const GEGENSTAENDE = {
  glockenerz: { name: 'Glockenerz', text: 'Grünliches Metall. Am Amboss wird damit eine Waffe besser.' },
  mondtau: { name: 'Mondtaukristall', text: 'Kalt wie Mondlicht. Am Leuchtfeuer wird daraus eine weitere Phiole.' },
  helm: { name: 'Taucherhelm', text: 'Verbeultes Messing. In den Rand ist ein Name geritzt: Jonte.' },
  nachhall_vogt: { name: 'Nachhall des Strandvogts', text: 'Ein Echo, das nicht verklingt. Am Amboss lässt sich daraus eine Waffe gießen.' },
  nachhall_isolde: { name: 'Nachhall der Braut', text: 'Ein leises Läuten, das nicht aufhört. Am Amboss lässt sich daraus eine Waffe gießen.' },
  splitter_isolde: { name: 'Kronsplitter', text: 'Hell wie Mondlicht und warm. Wenn du ihn hältst, schlägt die Glocke, die nur du hörst, ein wenig schneller.' },
  nadel: { name: 'Harks Nadel', text: 'Eine Netznadel aus Walknochen, glatt vom vielen Gebrauch. Greta wartet darauf.' },
  waerterschluessel: { name: 'Schlüssel des Wärters', text: 'Schwer und schwarz vom Ruß. Er passt zu einem Schloss oben im Leuchtturm.' },
  gruftschluessel: { name: 'Schlüssel zur Gruft', text: 'Ein kleiner Schlüssel mit einer Glocke als Bart. Er gehört zur Gruft unter der Brautkapelle.' }
};

/* ---------- Gegner ----------
   Jeder Angriff: dur (Gesamtdauer), hits: Zeitpunkt t, Schlagart s (Pose), Schaden d, Art k.
   hold: der Gegner verharrt vor dem Schlag. mix: welche Art er wird, entscheidet sich spät.
   flug: Geschoss, das so lange fliegt. finte: holt aus und schlägt nicht zu.
   offen: danach ist er so lange ohne Deckung. armor: lässt sich nicht unterbrechen.
   guard: blockt leichte Schläge. panzer: leichte Schläge richten wenig aus.
   konter: nach so vielen Treffern hintereinander schlägt er sofort zurück.
   weiter: Wahrscheinlichkeit, ohne Pause den nächsten Angriff anzuhängen.
   fern: greift aus der zweiten Reihe an, während ein anderer vorn kämpft. */
const FEINDE = {
  ertrunkener: {
    name: 'Ertrunkener', set: 'ertrunken', hp: 115, pz: 44, glut: 45, gap: [700, 1250], pzRegen: 10, schaden: 1.4, weiter: 0.3,
    moves: {
      hieb:    { dur: 1450, hits: [{ t: 760, s: 'over', d: 15, k: 'p' }] },
      doppel:  { dur: 1850, hits: [{ t: 660, s: 'side', d: 10, k: 'p' }, { t: 1060, s: 'over', d: 12, k: 'p' }] },
      klammer: { dur: 2000, hits: [{ t: 980, s: 'grab', d: 22, k: 'u' }] },
      zoegern: { dur: 1800, hits: [{ t: 1250, s: 'over', d: 17, k: 'p', hold: 520 }] },
      finte:   { dur: 900, finte: 'over', hits: [] }
    },
    p1: [['hieb', 3], ['doppel', 2], ['klammer', 1.2], ['zoegern', 1], ['finte', .6]]
  },
  moorleiche: {
    name: 'Moorleiche', set: 'ertrunken', look: 'moorleiche', hp: 200, pz: 70, glut: 110, gap: [900, 1500], pzRegen: 12, schaden: 1.45, weiter: .2, blut: 'drop',
    moves: {
      wuchten: { dur: 1900, hits: [{ t: 1050, s: 'over', d: 22, k: 'p' }], armor: true },
      doppel:  { dur: 2100, hits: [{ t: 800, s: 'side', d: 14, k: 'p' }, { t: 1250, s: 'side', d: 16, k: 'b' }] },
      klammer: { dur: 2100, hits: [{ t: 1050, s: 'grab', d: 30, k: 'u' }] },
      spucken: { dur: 1900, hits: [{ t: 1250, s: 'cast', d: 16, k: 'b', flug: 420, proj: 'salz' }] }
    },
    p1: [['wuchten', 3], ['doppel', 2], ['klammer', 1.4], ['spucken', 1.2]]
  },
  fischer: {
    name: 'Ertrunkener Fischer', set: 'speer', look: 'fischer', hp: 130, pz: 50, glut: 70, gap: [800, 1350], pzRegen: 10, schaden: 1.4, weiter: .28,
    moves: {
      stoss:  { dur: 1300, hits: [{ t: 640, s: 'thrust', d: 15, k: 'p' }] },
      zug:    { dur: 1900, hits: [{ t: 600, s: 'thrust', d: 11, k: 'p' }, { t: 1080, s: 'over', d: 17, k: 'p', mix: ['p', 'b'] }] },
      haken:  { dur: 2050, hits: [{ t: 1050, s: 'lunge', d: 26, k: 'u' }] },
      fegen:  { dur: 1700, hits: [{ t: 880, s: 'side', d: 18, k: 'b', hold: 200 }] },
      wurf:   { dur: 1700, hits: [{ t: 1100, s: 'thrust', d: 16, k: 'b', flug: 380, proj: 'salz' }] },
      finte:  { dur: 800, finte: 'thrust', hits: [] }
    },
    p1: [['stoss', 3], ['zug', 2], ['haken', 1.2], ['fegen', 1.3], ['finte', .7]],
    fern: { moves: ['wurf'], gap: [2600, 4200] }
  },
  krabbe: {
    name: 'Salzkrabbe', set: 'krabbe', hp: 110, pz: 34, glut: 35, gap: [450, 850], pzRegen: 12, blut: 'spark', schaden: 1.35, panzer: .65, weiter: 0.45,
    moves: {
      kneif:  { dur: 1000, hits: [{ t: 500, s: 'side', d: 11, k: 'p' }] },
      doppel: { dur: 1350, hits: [{ t: 460, s: 'side', d: 8, k: 'p' }, { t: 760, s: 'over', d: 9, k: 'p' }] },
      sprung: { dur: 1600, hits: [{ t: 820, s: 'lunge', d: 18, k: 'u' }], offen: 1100 }
    },
    p1: [['kneif', 3], ['doppel', 2], ['sprung', 1.6]]
  },
  knecht: {
    name: 'Kettenknecht', set: 'kette', hp: 240, pz: 80, glut: 150, gap: [750, 1300], pzRegen: 12, punish: 'schwung', klang: 'kette', blut: 'spark', schaden: 1.45, weiter: .3,
    konter: { nach: 4, move: 'stoss' },
    moves: {
      schwung: { dur: 1600, hits: [{ t: 820, s: 'side', d: 20, k: 'p' }] },
      wirbel:  { dur: 2250, hits: [{ t: 680, s: 'side', d: 9, k: 'p' }, { t: 1030, s: 'over', d: 9, k: 'p' }, { t: 1380, s: 'side', d: 12, k: 'p', mix: ['p', 'b'] }] },
      stampf:  { dur: 2350, hits: [{ t: 1520, s: 'over', d: 30, k: 'b', hold: 520 }], offen: 700 },
      wurf:    { dur: 2050, hits: [{ t: 1020, s: 'thrust', d: 24, k: 'u' }] },
      stoss:   { dur: 900, hits: [{ t: 360, s: 'thrust', d: 12, k: 'p' }], armor: true },
      finte:   { dur: 1000, finte: 'over', hits: [] }
    },
    p1: [['schwung', 3], ['wirbel', 2], ['stampf', 1.4], ['wurf', 1.2], ['finte', .6]]
  },
  pfahl: {
    name: 'Pfahlgänger', set: 'speer', look: 'pfahl', hp: 150, pz: 52, glut: 75, gap: [750, 1300], pzRegen: 10, punish: 'stoss', schaden: 1.4, weiter: .3,
    moves: {
      stoss:       { dur: 1350, hits: [{ t: 680, s: 'thrust', d: 16, k: 'p' }] },
      doppelstoss: { dur: 1750, hits: [{ t: 600, s: 'thrust', d: 11, k: 'p' }, { t: 980, s: 'thrust', d: 13, k: 'p', mix: ['p', 'u'] }] },
      fegen:       { dur: 1800, hits: [{ t: 930, s: 'side', d: 18, k: 'b', hold: 250 }] },
      aufspiessen: { dur: 2100, hits: [{ t: 1100, s: 'lunge', d: 26, k: 'u' }], offen: 600 },
      finte:       { dur: 850, finte: 'thrust', hits: [] }
    },
    p1: [['stoss', 3], ['doppelstoss', 2], ['fegen', 1.3], ['aufspiessen', 1.1], ['finte', .8]]
  },
  salzleiche: {
    name: 'Salzgeborener', set: 'ertrunken', look: 'salzleiche', hp: 175, pz: 70, glut: 110, gap: [850, 1400], pzRegen: 12, schaden: 1.4, panzer: .5, blut: 'salz', weiter: .2,
    moves: {
      hieb:     { dur: 1600, hits: [{ t: 850, s: 'over', d: 20, k: 'p' }] },
      splitter: { dur: 1800, hits: [{ t: 1150, s: 'cast', d: 15, k: 'b', flug: 400, proj: 'salz' }] },
      kruste:   { dur: 2200, hits: [{ t: 1300, s: 'grab', d: 28, k: 'u' }], offen: 900 },
      doppel:   { dur: 1900, hits: [{ t: 700, s: 'side', d: 12, k: 'p' }, { t: 1150, s: 'over', d: 16, k: 'p' }] }
    },
    p1: [['hieb', 3], ['splitter', 1.5], ['kruste', 1.2], ['doppel', 2]]
  },
  kultist: {
    name: 'Laternenträgerin', set: 'hexe', look: 'kultist', hp: 105, pz: 38, glut: 80, gap: [900, 1500], pzRegen: 10, schaden: 1.35, blut: 'drop',
    moves: {
      stab:    { dur: 1400, hits: [{ t: 700, s: 'over', d: 14, k: 'p' }] },
      laterne: { dur: 1700, hits: [{ t: 1100, s: 'cast', d: 18, k: 'b', flug: 460, proj: 'feuer' }] },
      glocke:  { dur: 2000, hits: [{ t: 1250, s: 'slam', d: 20, k: 'u' }] }
    },
    p1: [['stab', 3], ['laterne', 2], ['glocke', 1.2]],
    fern: { moves: ['laterne'], gap: [2400, 3800] }
  },
  jungfer: {
    name: 'Brautjungfer', set: 'jungfer', hp: 165, pz: 48, glut: 120, gap: [600, 1100], pzRegen: 12, punish: 'schnitt', schaden: 1.4, weiter: .42,
    moves: {
      schnitt:     { dur: 1050, hits: [{ t: 500, s: 'side', d: 13, k: 'p' }] },
      reigen:      { dur: 1700, hits: [{ t: 480, s: 'side', d: 9, k: 'p' }, { t: 740, s: 'over', d: 9, k: 'p' }, { t: 1000, s: 'side', d: 12, k: 'p', mix: ['p', 'b'] }] },
      schleier:    { dur: 1900, hits: [{ t: 960, s: 'grab', d: 22, k: 'u' }] },
      verzoegert:  { dur: 2000, hits: [{ t: 1300, s: 'over', d: 20, k: 'p', hold: 620 }] },
      verschwinden:{ dur: 1900, weg: true, hits: [{ t: 1400, s: 'over', d: 22, k: 'p', mix: ['p', 'u'] }] },
      finte:       { dur: 800, finte: 'side', hits: [] }
    },
    p1: [['schnitt', 3], ['reigen', 2], ['schleier', 1.1], ['verzoegert', 1.3], ['verschwinden', 1], ['finte', .7]]
  },
  waechter: {
    name: 'Glockenwächter', set: 'kette', look: 'waechter', hp: 320, pz: 120, glut: 280, gap: [850, 1400], pzRegen: 14, blut: 'spark', schaden: 1.45, weiter: .25,
    guard: { block: .88 }, konter: { nach: 3, move: 'schildstoss' },
    moves: {
      kolben:        { dur: 1750, hits: [{ t: 920, s: 'over', d: 26, k: 'p' }] },
      schildstoss:   { dur: 1100, hits: [{ t: 420, s: 'thrust', d: 16, k: 'b' }], armor: true },
      doppel:        { dur: 2200, hits: [{ t: 800, s: 'side', d: 16, k: 'p' }, { t: 1250, s: 'over', d: 22, k: 'p', mix: ['p', 'u'] }] },
      glockenschlag: { dur: 2600, hits: [{ t: 1480, s: 'over', d: 36, k: 'u', hold: 420 }], offen: 1300 },
      finte:         { dur: 1000, finte: 'over', hits: [] }
    },
    p1: [['kolben', 3], ['schildstoss', 1.5], ['doppel', 2], ['glockenschlag', 1.2], ['finte', .5]]
  },
  ritter: {
    name: 'Ertrunkener Ritter', title: 'Er wacht noch immer', set: 'ritter', look: 'ritter', elite: true, hp: 360, pz: 140, glut: 700, gap: [600, 1100], pzRegen: 16, blut: 'spark', schaden: 1.4, weiter: .4,
    guard: { block: .85 }, konter: { nach: 3, move: 'riposte' },
    moves: {
      hieb:     { dur: 1300, hits: [{ t: 620, s: 'over', d: 20, k: 'p' }] },
      kombo:    { dur: 2100, hits: [{ t: 520, s: 'side', d: 13, k: 'p' }, { t: 880, s: 'over', d: 15, k: 'p' }, { t: 1300, s: 'thrust', d: 18, k: 'p', mix: ['p', 'u'] }] },
      sturm:    { dur: 1900, hits: [{ t: 1000, s: 'lunge', d: 28, k: 'u' }], offen: 800 },
      zoegern:  { dur: 1900, hits: [{ t: 1350, s: 'over', d: 26, k: 'p', hold: 700 }] },
      riposte:  { dur: 900, hits: [{ t: 330, s: 'thrust', d: 16, k: 'p' }], armor: true },
      finte:    { dur: 850, finte: 'over', hits: [] }
    },
    p1: [['hieb', 3], ['kombo', 2.2], ['sturm', 1.2], ['zoegern', 1.3], ['finte', .9]]
  },
  taucher: {
    name: 'Jonte', title: 'Der Taucher im Hafenbecken', set: 'kette', look: 'taucher', boss: true, neben: true, hp: 720, pz: 150, glut: 1100, gap: [550, 950], pzRegen: 14, blut: 'drop', schaden: 1.4, weiter: 0.38, klang: 'kette',
    intro: '… Mira? … Nein. Du bist nicht Mira. Du bist aus dem Wasser.',
    moves: {
      anker:   { dur: 1800, hits: [{ t: 950, s: 'over', d: 28, k: 'p' }] },
      zug:     { dur: 2300, hits: [{ t: 1150, s: 'thrust', d: 26, k: 'u' }] },
      kreis:   { dur: 2400, hits: [{ t: 700, s: 'side', d: 14, k: 'p' }, { t: 1100, s: 'side', d: 14, k: 'p' }, { t: 1550, s: 'over', d: 22, k: 'b', hold: 300 }] },
      stampf:  { dur: 2400, hits: [{ t: 1500, s: 'over', d: 34, k: 'u', hold: 450 }], offen: 1000 },
      finte:   { dur: 1000, finte: 'over', hits: [] }
    },
    p1: [['anker', 3], ['zug', 1.3], ['kreis', 1.8], ['stampf', 1.2], ['finte', .6]],
    phasen: [{ at: .5, fx: 'flut', tempo: .88, gap: [500, 950], p: [['anker', 2], ['zug', 1.6], ['kreis', 2], ['stampf', 1.5]],
      line: 'Es ist so kalt hier unten. Sag ihr … sag ihr nicht, wie ich aussehe.' }]
  },
  hexe: {
    name: 'Die Salzhexe', title: 'Hüterin der Salzgrube', set: 'hexe', boss: true, neben: true,
    hp: 700, pz: 140, glut: 1400, gap: [650, 1150], pzRegen: 14, punish: 'stab', blut: 'salz', schaden: 1.35, weiter: .3,
    intro: 'Noch einer, der das Salz nicht schmecken will. Du wirst es lernen.',
    moves: {
      stab:      { dur: 1500, hits: [{ t: 760, s: 'over', d: 24, k: 'p' }] },
      splitter:  { dur: 1800, hits: [{ t: 1100, s: 'cast', d: 18, k: 'b', flug: 420, proj: 'salz' }] },
      dreifach:  { dur: 2300, hits: [{ t: 900, s: 'cast', d: 12, k: 'b', flug: 380, proj: 'salz' }, { t: 1240, s: 'cast', d: 12, k: 'b', flug: 380, proj: 'salz' }, { t: 1580, s: 'cast', d: 12, k: 'b', flug: 380, proj: 'salz' }] },
      kristall:  { dur: 2300, hits: [{ t: 1350, s: 'slam', d: 30, k: 'u' }], offen: 900 },
      sturm:     { dur: 2400, hits: [{ t: 650, s: 'side', d: 16, k: 'p' }, { t: 1100, s: 'cast', d: 15, k: 'b', flug: 330, proj: 'salz' }, { t: 1600, s: 'slam', d: 26, k: 'u' }] },
      entgleiten:{ dur: 2000, weg: true, hits: [{ t: 1450, s: 'over', d: 26, k: 'p', mix: ['p', 'u'] }] },
      finte:     { dur: 900, finte: 'over', hits: [] }
    },
    p1: [['stab', 3], ['splitter', 2], ['dreifach', 1.5], ['kristall', 1.2], ['finte', .6]],
    phasen: [
      { at: .6, fx: 'salz', tempo: .9, gap: [500, 950], p: [['stab', 2], ['splitter', 1.5], ['dreifach', 1.5], ['kristall', 1.2], ['sturm', 2], ['entgleiten', 1.4]],
        line: 'Du schmeckst es jetzt, nicht wahr? Salz. Alles hier wird Salz, am Ende.' },
      { at: .25, fx: 'wut', tempo: .82, gap: [380, 800], p: [['stab', 1.5], ['sturm', 2.5], ['entgleiten', 2], ['kristall', 1.5], ['dreifach', 1.2]],
        line: 'Ich habe sie doch nur bewahrt. Alle. Damit das Wasser sie nicht holt.' }
    ]
  },
  spinne: {
    name: 'Die Wrackspinne', title: 'Was im Hafen lauert', set: 'spinne', boss: true, neben: true,
    hp: 1250, pz: 170, glut: 1800, gap: [520, 950], pzRegen: 16, punish: 'stich', blut: 'spark', schaden: 1.45, panzer: .35, weiter: 0.42,
    moves: {
      stich:      { dur: 1350, hits: [{ t: 660, s: 'thrust', d: 24, k: 'p' }] },
      doppelstich:{ dur: 1750, hits: [{ t: 580, s: 'thrust', d: 15, k: 'p' }, { t: 940, s: 'over', d: 18, k: 'p', mix: ['p', 'b'] }] },
      netz:       { dur: 2050, hits: [{ t: 1200, s: 'cast', d: 20, k: 'u', flug: 520, proj: 'netz' }] },
      sprung:     { dur: 2150, hits: [{ t: 1120, s: 'lunge', d: 34, k: 'u' }], offen: 1100 },
      fegen:      { dur: 1950, hits: [{ t: 1000, s: 'side', d: 26, k: 'b', hold: 300 }] },
      finte:      { dur: 900, finte: 'thrust', hits: [] }
    },
    p1: [['stich', 3], ['doppelstich', 2], ['netz', 1.3], ['sprung', 1.2], ['fegen', 1.3], ['finte', .6]],
    phasen: [{ at: .45, fx: 'wut', tempo: .84, gap: [420, 850], p: [['stich', 2], ['doppelstich', 2.2], ['netz', 1.3], ['sprung', 1.6], ['fegen', 1.5]] }]
  },
  vogt: {
    name: 'Der Strandvogt', title: 'Sammler der Ertrunkenen', set: 'vogt', boss: true,
    hp: 950, pz: 190, glut: 2000, gap: [600, 1150], pzRegen: 16, punish: 'laterne', schaden: 1.35, weiter: .3,
    intro: 'Wieder eines. Die Flut spuckt sie aus, und ich sammle sie ein.',
    moves: {
      haken:      { dur: 1850, hits: [{ t: 940, s: 'over', d: 28, k: 'p' }] },
      zug:        { dur: 2450, hits: [{ t: 800, s: 'thrust', d: 16, k: 'p' }, { t: 1520, s: 'over', d: 24, k: 'p', hold: 260, mix: ['p', 'u'] }] },
      laterne:    { dur: 1300, hits: [{ t: 620, s: 'side', d: 20, k: 'p' }] },
      ramm:       { dur: 2150, hits: [{ t: 1100, s: 'lunge', d: 34, k: 'u' }], offen: 800 },
      flut:       { dur: 2650, hits: [{ t: 1700, s: 'slam', d: 32, k: 'u', flug: 520, proj: 'welle' }] },
      wirbel:     { dur: 2850, hits: [{ t: 620, s: 'side', d: 12, k: 'p' }, { t: 960, s: 'side', d: 12, k: 'p' }, { t: 1320, s: 'over', d: 16, k: 'p' }, { t: 1950, s: 'thrust', d: 20, k: 'b', hold: 300 }] },
      verzoegert: { dur: 2550, hits: [{ t: 1720, s: 'over', d: 32, k: 'p', hold: 820 }] },
      anker:      { dur: 2450, hits: [{ t: 1150, s: 'grab', d: 38, k: 'u' }] },
      finte:      { dur: 1100, finte: 'over', hits: [] }
    },
    p1: [['haken', 3], ['zug', 2], ['laterne', 2], ['ramm', 1.2], ['finte', .7]],
    phasen: [{ at: .55, fx: 'flut', tempo: .88, gap: [420, 900], p: [['haken', 2], ['laterne', 2], ['flut', 1.3], ['wirbel', 1.6], ['verzoegert', 1.4], ['anker', 1.1], ['finte', .6]],
      line: 'Du hörst sie also auch, die Glocke. Dann bist du kein gewöhnliches Strandgut.' }]
  },
  isolde: {
    name: 'Isolde', title: 'Die Ertränkte Braut', set: 'isolde', boss: true, haupt: true,
    hp: 1150, pz: 230, glut: 4200, gap: [650, 1150], pzRegen: 18, punish: 'schleier', klang: 'kette', schaden: 1.3, weiter: .35,
    intro: 'Bist du es? Nach all den Jahren? … Nein. Du riechst nach Salz, nicht nach Rosen.',
    moves: {
      schwung:    { dur: 1800, hits: [{ t: 900, s: 'side', d: 28, k: 'p' }] },
      sturz:      { dur: 2350, hits: [{ t: 1300, s: 'over', d: 36, k: 'b', hold: 320 }], offen: 700 },
      schleier:   { dur: 1650, hits: [{ t: 540, s: 'thrust', d: 14, k: 'p' }, { t: 900, s: 'thrust', d: 14, k: 'p', mix: ['p', 'b'] }] },
      traenen:    { dur: 2500, hits: [{ t: 1520, s: 'slam', d: 32, k: 'u', flug: 560, proj: 'welle' }] },
      walzer:     { dur: 2800, hits: [{ t: 630, s: 'side', d: 12, k: 'p' }, { t: 1000, s: 'side', d: 12, k: 'p' }, { t: 1370, s: 'over', d: 16, k: 'p' }, { t: 1950, s: 'side', d: 22, k: 'b', hold: 250, mix: ['b', 'u'] }] },
      gelaeut:    { dur: 2700, hits: [{ t: 1230, s: 'slam', d: 30, k: 'u', flug: 420, proj: 'klang' }, { t: 1930, s: 'slam', d: 30, k: 'u', flug: 420, proj: 'klang' }] },
      haende:     { dur: 2400, hits: [{ t: 1230, s: 'grab', d: 40, k: 'u' }] },
      verzoegert: { dur: 2650, hits: [{ t: 1820, s: 'over', d: 36, k: 'p', hold: 900 }] },
      totengelaeut: { dur: 4200, armor: true, hits: [900, 1600, 2300, 3000, 3700].map((t, i) => ({ t, s: i % 2 ? 'side' : 'slam', d: 26, k: 'u', flug: 300, proj: 'klang' })) },
      finte:      { dur: 1000, finte: 'side', hits: [] }
    },
    p1: [['schwung', 3], ['sturz', 1.6], ['schleier', 2], ['traenen', 1.2], ['walzer', 1.4], ['finte', .6]],
    phasen: [
      { at: .66, fx: 'glocke', tempo: .9, gap: [450, 950], p: [['schwung', 2], ['sturz', 1.3], ['schleier', 1.6], ['walzer', 1.4], ['gelaeut', 1.6], ['haende', 1.2], ['verzoegert', 1.4], ['finte', .6]],
        line: 'Er hat versprochen zu kommen, wenn die Glocke läutet. Also läute ich. Ich läute, bis das Meer ihn mir bringt.' },
      { at: .3, fx: 'glocke', tempo: .84, gap: [380, 820], p: [['walzer', 1.6], ['gelaeut', 1.4], ['haende', 1.4], ['totengelaeut', 1.3], ['schleier', 1.4], ['verzoegert', 1.2]],
        line: 'Hörst du sie? Die ganze Stadt läutet mit. Tanz mit mir, bis sie verstummt.' }
    ]
  }
};
