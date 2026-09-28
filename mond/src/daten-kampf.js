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
  taucherstein: { name: 'Taucherstein', text: '+15 % Leben. Ein glatter Stein mit einem Loch, an einer Lederschnur.', hp: 1.15 }
};

const GEGENSTAENDE = {
  glockenerz: { name: 'Glockenerz', text: 'Grünliches Metall. Am Amboss wird damit eine Waffe besser.' },
  mondtau: { name: 'Mondtaukristall', text: 'Kalt wie Mondlicht. Am Leuchtfeuer wird daraus eine weitere Phiole.' },
  helm: { name: 'Taucherhelm', text: 'Verbeultes Messing. In den Rand ist ein Name geritzt: Jonte.' },
  nachhall_vogt: { name: 'Nachhall des Strandvogts', text: 'Ein Echo, das nicht verklingt. Am Amboss lässt sich daraus eine Waffe gießen.' },
  nachhall_isolde: { name: 'Nachhall der Braut', text: 'Ein leises Läuten, das nicht aufhört. Am Amboss lässt sich daraus eine Waffe gießen.' },
  splitter_isolde: { name: 'Kronsplitter', text: 'Hell wie Mondlicht und warm. Wenn du ihn hältst, schlägt die Glocke, die nur du hörst, ein wenig schneller.' }
};

/* ---------- Gegner ---------- */
const FEINDE = {
  ertrunkener: {
    name: 'Ertrunkener', set: 'ertrunken', hp: 72, pz: 44, glut: 60, gap: [850, 1500], pzRegen: 10,
    moves: {
      hieb:    { dur: 1500, hits: [{ t: 780, s: 'over', d: 14, k: 'p' }] },
      doppel:  { dur: 1900, hits: [{ t: 680, s: 'side', d: 9, k: 'p' }, { t: 1100, s: 'over', d: 11, k: 'p' }] },
      klammer: { dur: 2050, hits: [{ t: 1000, s: 'grab', d: 20, k: 'u' }] }
    },
    p1: [['hieb', 3], ['doppel', 2], ['klammer', 1.1]]
  },
  krabbe: {
    name: 'Salzkrabbe', set: 'krabbe', hp: 48, pz: 30, glut: 45, gap: [650, 1150], pzRegen: 12, blut: 'spark',
    moves: {
      kneif:  { dur: 1050, hits: [{ t: 520, s: 'side', d: 9, k: 'p' }] },
      doppel: { dur: 1400, hits: [{ t: 480, s: 'side', d: 7, k: 'p' }, { t: 780, s: 'over', d: 8, k: 'p' }] },
      sprung: { dur: 1650, hits: [{ t: 850, s: 'lunge', d: 15, k: 'u' }] }
    },
    p1: [['kneif', 3], ['doppel', 2], ['sprung', 1.2]]
  },
  knecht: {
    name: 'Kettenknecht', set: 'kette', hp: 150, pz: 70, glut: 180, gap: [800, 1400], pzRegen: 12, punish: 'schwung', klang: 'kette', blut: 'spark',
    moves: {
      schwung: { dur: 1650, hits: [{ t: 840, s: 'side', d: 18, k: 'p' }] },
      wirbel:  { dur: 2300, hits: [{ t: 700, s: 'side', d: 8, k: 'p' }, { t: 1060, s: 'over', d: 8, k: 'p' }, { t: 1420, s: 'side', d: 10, k: 'p' }] },
      stampf:  { dur: 2400, hits: [{ t: 1550, s: 'over', d: 27, k: 'b', hold: 520 }] },
      wurf:    { dur: 2100, hits: [{ t: 1050, s: 'thrust', d: 22, k: 'u' }] }
    },
    p1: [['schwung', 3], ['wirbel', 2], ['stampf', 1.4], ['wurf', 1.2]]
  },
  pfahl: {
    name: 'Pfahlgänger', set: 'speer', look: 'pfahl', hp: 95, pz: 50, glut: 90, gap: [800, 1400], pzRegen: 10, punish: 'stoss',
    moves: {
      stoss:       { dur: 1400, hits: [{ t: 700, s: 'thrust', d: 15, k: 'p' }] },
      doppelstoss: { dur: 1800, hits: [{ t: 620, s: 'thrust', d: 10, k: 'p' }, { t: 1000, s: 'thrust', d: 12, k: 'p' }] },
      fegen:       { dur: 1850, hits: [{ t: 950, s: 'side', d: 17, k: 'b', hold: 250 }] },
      aufspiessen: { dur: 2150, hits: [{ t: 1120, s: 'lunge', d: 24, k: 'u' }] }
    },
    p1: [['stoss', 3], ['doppelstoss', 2], ['fegen', 1.3], ['aufspiessen', 1.1]]
  },
  jungfer: {
    name: 'Brautjungfer', set: 'jungfer', hp: 110, pz: 45, glut: 140, gap: [650, 1200], pzRegen: 12, punish: 'schnitt',
    moves: {
      schnitt:    { dur: 1100, hits: [{ t: 520, s: 'side', d: 13, k: 'p' }] },
      reigen:     { dur: 1750, hits: [{ t: 500, s: 'side', d: 9, k: 'p' }, { t: 760, s: 'over', d: 9, k: 'p' }, { t: 1020, s: 'side', d: 11, k: 'p' }] },
      schleier:   { dur: 1950, hits: [{ t: 980, s: 'grab', d: 20, k: 'u' }] },
      verzoegert: { dur: 2050, hits: [{ t: 1320, s: 'over', d: 19, k: 'p', hold: 600 }] }
    },
    p1: [['schnitt', 3], ['reigen', 2], ['schleier', 1.1], ['verzoegert', 1.3]]
  },
  waechter: {
    name: 'Glockenwächter', set: 'kette', look: 'waechter', hp: 220, pz: 110, glut: 320, gap: [900, 1500], pzRegen: 14, blut: 'spark',
    moves: {
      kolben:       { dur: 1800, hits: [{ t: 950, s: 'over', d: 26, k: 'p' }] },
      schildstoss:  { dur: 1500, hits: [{ t: 720, s: 'thrust', d: 18, k: 'b' }] },
      doppel:       { dur: 2250, hits: [{ t: 820, s: 'side', d: 16, k: 'p' }, { t: 1280, s: 'over', d: 22, k: 'p' }] },
      glockenschlag:{ dur: 2600, hits: [{ t: 1500, s: 'over', d: 32, k: 'u', hold: 400 }] }
    },
    p1: [['kolben', 3], ['schildstoss', 2], ['doppel', 2], ['glockenschlag', 1.2]]
  },
  hexe: {
    name: 'Die Salzhexe', title: 'Hüterin der Salzgrube', set: 'hexe', boss: true, neben: true,
    hp: 430, pz: 120, glut: 900, gap: [700, 1300], pzRegen: 14, punish: 'stab', blut: 'spark',
    intro: 'Noch einer, der das Salz nicht schmecken will. Du wirst es lernen.',
    moves: {
      stab:      { dur: 1600, hits: [{ t: 800, s: 'over', d: 22, k: 'p' }] },
      splitter:  { dur: 1900, hits: [{ t: 1150, s: 'cast', d: 16, k: 'b', flug: 450, proj: 'salz' }] },
      dreifach:  { dur: 2400, hits: [{ t: 950, s: 'cast', d: 10, k: 'b', flug: 400, proj: 'salz' }, { t: 1300, s: 'cast', d: 10, k: 'b', flug: 400, proj: 'salz' }, { t: 1650, s: 'cast', d: 10, k: 'b', flug: 400, proj: 'salz' }] },
      kristall:  { dur: 2400, hits: [{ t: 1400, s: 'slam', d: 28, k: 'u' }] },
      sturm:     { dur: 2500, hits: [{ t: 700, s: 'side', d: 14, k: 'p' }, { t: 1150, s: 'cast', d: 14, k: 'b', flug: 350, proj: 'salz' }, { t: 1650, s: 'slam', d: 22, k: 'u' }] }
    },
    p1: [['stab', 3], ['splitter', 2], ['dreifach', 1.5], ['kristall', 1.2]],
    phase2: { at: .5, fx: 'wut', tempo: .88, gap: [500, 1000], p2: [['stab', 2], ['splitter', 1.5], ['dreifach', 1.5], ['kristall', 1.2], ['sturm', 2]],
      line: 'Du schmeckst es jetzt, nicht wahr? Salz. Alles hier wird Salz, am Ende.' }
  },
  spinne: {
    name: 'Die Wrackspinne', title: 'Was im Hafen lauert', set: 'spinne', boss: true, neben: true,
    hp: 580, pz: 150, glut: 1300, gap: [650, 1200], pzRegen: 16, punish: 'stich', blut: 'spark',
    moves: {
      stich:      { dur: 1400, hits: [{ t: 700, s: 'thrust', d: 22, k: 'p' }] },
      doppelstich:{ dur: 1800, hits: [{ t: 600, s: 'thrust', d: 14, k: 'p' }, { t: 960, s: 'over', d: 16, k: 'p' }] },
      netz:       { dur: 2100, hits: [{ t: 1250, s: 'cast', d: 18, k: 'u', flug: 520, proj: 'netz' }] },
      sprung:     { dur: 2200, hits: [{ t: 1150, s: 'lunge', d: 30, k: 'u' }] },
      fegen:      { dur: 2000, hits: [{ t: 1020, s: 'side', d: 24, k: 'b', hold: 300 }] }
    },
    p1: [['stich', 3], ['doppelstich', 2], ['netz', 1.3], ['sprung', 1.2], ['fegen', 1.3]],
    phase2: { at: .4, fx: 'wut', tempo: .85, gap: [450, 900], p2: [['stich', 2], ['doppelstich', 2], ['netz', 1.3], ['sprung', 1.5], ['fegen', 1.5]] }
  },
  vogt: {
    name: 'Der Strandvogt', title: 'Sammler der Ertrunkenen', set: 'vogt', boss: true,
    hp: 580, pz: 170, glut: 1500, gap: [650, 1250], pzRegen: 16, punish: 'laterne',
    intro: 'Wieder eines. Die Flut spuckt sie aus, und ich sammle sie ein.',
    moves: {
      haken:      { dur: 1900, hits: [{ t: 960, s: 'over', d: 26, k: 'p' }] },
      zug:        { dur: 2500, hits: [{ t: 820, s: 'thrust', d: 14, k: 'p' }, { t: 1560, s: 'over', d: 22, k: 'p', hold: 260 }] },
      laterne:    { dur: 1350, hits: [{ t: 640, s: 'side', d: 18, k: 'p' }] },
      ramm:       { dur: 2200, hits: [{ t: 1120, s: 'lunge', d: 32, k: 'u' }] },
      flut:       { dur: 2700, hits: [{ t: 1750, s: 'slam', d: 30, k: 'u', flug: 520, proj: 'welle' }] },
      wirbel:     { dur: 2900, hits: [{ t: 640, s: 'side', d: 11, k: 'p' }, { t: 980, s: 'side', d: 11, k: 'p' }, { t: 1340, s: 'over', d: 14, k: 'p' }, { t: 2000, s: 'thrust', d: 18, k: 'b', hold: 300 }] },
      verzoegert: { dur: 2600, hits: [{ t: 1750, s: 'over', d: 30, k: 'p', hold: 820 }] },
      anker:      { dur: 2500, hits: [{ t: 1180, s: 'grab', d: 34, k: 'u' }] }
    },
    p1: [['haken', 3], ['zug', 2], ['laterne', 2], ['ramm', 1.2]],
    phase2: { at: .5, fx: 'flut', tempo: .9, gap: [420, 950], p2: [['haken', 2], ['laterne', 2], ['flut', 1.3], ['wirbel', 1.6], ['verzoegert', 1.4], ['anker', 1.1]],
      line: 'Du hörst sie also auch, die Glocke. Dann bist du kein gewöhnliches Strandgut.' }
  },
  isolde: {
    name: 'Isolde', title: 'Die Ertränkte Braut', set: 'isolde', boss: true, haupt: true,
    hp: 950, pz: 210, glut: 3200, gap: [700, 1250], pzRegen: 18, punish: 'schleier', klang: 'kette',
    intro: 'Bist du es? Nach all den Jahren? … Nein. Du riechst nach Salz, nicht nach Rosen.',
    moves: {
      schwung:    { dur: 1850, hits: [{ t: 920, s: 'side', d: 26, k: 'p' }] },
      sturz:      { dur: 2400, hits: [{ t: 1320, s: 'over', d: 34, k: 'b', hold: 320 }] },
      schleier:   { dur: 1700, hits: [{ t: 560, s: 'thrust', d: 16, k: 'p' }, { t: 900, s: 'thrust', d: 16, k: 'p' }] },
      traenen:    { dur: 2550, hits: [{ t: 1550, s: 'slam', d: 30, k: 'u', flug: 560, proj: 'welle' }] },
      walzer:     { dur: 2850, hits: [{ t: 650, s: 'side', d: 14, k: 'p' }, { t: 1000, s: 'side', d: 14, k: 'p' }, { t: 1350, s: 'over', d: 18, k: 'p' }, { t: 1950, s: 'side', d: 22, k: 'b', hold: 250 }] },
      gelaeut:    { dur: 2750, hits: [{ t: 1250, s: 'slam', d: 28, k: 'u', flug: 420, proj: 'klang' }, { t: 1950, s: 'slam', d: 28, k: 'u', flug: 420, proj: 'klang' }] },
      haende:     { dur: 2450, hits: [{ t: 1250, s: 'grab', d: 36, k: 'u' }] },
      verzoegert: { dur: 2700, hits: [{ t: 1850, s: 'over', d: 34, k: 'p', hold: 900 }] }
    },
    p1: [['schwung', 3], ['sturz', 1.6], ['schleier', 2], ['traenen', 1.2], ['walzer', 1.4]],
    phase2: { at: .5, fx: 'glocke', tempo: .9, gap: [450, 950], p2: [['schwung', 2], ['sturz', 1.3], ['schleier', 1.6], ['walzer', 1.4], ['gelaeut', 1.6], ['haende', 1.2], ['verzoegert', 1.4]],
      line: 'Er hat versprochen zu kommen, wenn die Glocke läutet. Also läute ich. Ich läute, bis das Meer ihn mir bringt.' }
  }
};
