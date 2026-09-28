/* =====================================================================
   DATEN: Herkünfte, Gegner, Szenen
   Zeiten in Millisekunden ab Beginn des Angriffs.
   Trefferarten: p = parierbar, b = nur blocken oder ausweichen, u = nur ausweichen
   ===================================================================== */
const HERK = {
  kron: {
    name: 'Kronwächter', item: 'Ein Langschwert und ein zerbeulter Schild',
    blurb: 'Hält viel aus. Der Schild fängt fast jeden Schlag ab.', weapon: 'Langschwert und Schild',
    hp: 125, st: 100, fp: 40,
    light: [
      { pose: 'l1', d: 11, pz: 10, st: 16, hit: 190, dur: 440 },
      { pose: 'l2', d: 11, pz: 10, st: 16, hit: 170, dur: 420 },
      { pose: 'l3', d: 15, pz: 15, st: 19, hit: 200, dur: 520 }
    ],
    heavy: { d: 27, pz: 30, st: 30, dur: 560 },
    block: .88, blockSt: .9, tbBlock: 14, dodgeSt: 22,
    art: { id: 'kronhieb', name: 'Kronhieb', fp: 18, d: 30, pz: 60, hit: 560, dur: 900, text: 'Sprunghieb, der die Haltung bricht.' }
  },
  harp: {
    name: 'Harpunierin', item: 'Eine Harpune mit Widerhaken',
    blurb: 'Schnell und beweglich. Ihr Wurf unterbricht Angriffe.', weapon: 'Harpune',
    hp: 105, st: 125, fp: 42,
    light: [
      { pose: 'l1', d: 9, pz: 8, st: 13, hit: 150, dur: 370 },
      { pose: 'l2', d: 9, pz: 8, st: 13, hit: 140, dur: 360 },
      { pose: 'l3', d: 12, pz: 12, st: 15, hit: 170, dur: 440 }
    ],
    heavy: { d: 23, pz: 25, st: 26, dur: 520 },
    block: .6, blockSt: 1.15, tbBlock: 9, dodgeSt: 16,
    art: { id: 'widerhaken', name: 'Widerhaken', fp: 14, d: 16, pz: 34, hit: 300, dur: 640, text: 'Wurf, der einen Gegner beim Ausholen unterbricht.' }
  },
  moench: {
    name: 'Glockenmönch', item: 'Ein Hammer, an dem eine Glocke hängt',
    blurb: 'Langsam und wuchtig. Sein Geläut verletzt und heilt.', weapon: 'Glockenhammer',
    hp: 115, st: 95, fp: 75,
    light: [
      { pose: 'l1', d: 14, pz: 14, st: 19, hit: 250, dur: 560 },
      { pose: 'l2', d: 14, pz: 14, st: 19, hit: 240, dur: 540 },
      { pose: 'l3', d: 18, pz: 20, st: 22, hit: 280, dur: 640 }
    ],
    heavy: { d: 33, pz: 38, st: 34, dur: 640 },
    block: .66, blockSt: 1.0, tbBlock: 11, dodgeSt: 22,
    art: { id: 'grabgelaeut', name: 'Grabgeläut', fp: 25, d: 24, pz: 22, heal: 22, hit: 520, dur: 1000, text: 'Glockenschlag, der den Gegner verletzt und dich heilt.' }
  }
};

const FEINDE = {
  ertrunkener: {
    name: 'Ertrunkener', set: 'ertrunken', hp: 72, pz: 44, glut: 60, gap: [850, 1500], pzRegen: 10,
    moves: {
      hieb:    { name: 'Hieb', dur: 1500, hits: [{ t: 780, s: 'over', d: 14, k: 'p' }] },
      doppel:  { name: 'Doppelhieb', dur: 1900, hits: [{ t: 680, s: 'side', d: 9, k: 'p' }, { t: 1100, s: 'over', d: 11, k: 'p' }] },
      klammer: { name: 'Umklammern', dur: 2050, hits: [{ t: 1000, s: 'grab', d: 20, k: 'u' }] }
    },
    p1: [['hieb', 3], ['doppel', 2], ['klammer', 1.1]],
    tb1: [['hieb', 3], ['doppel', 2], ['klammer', 1.2], ['lauern', 1]]
  },
  knecht: {
    name: 'Kettenknecht', set: 'kette', hp: 150, pz: 70, glut: 180, gap: [800, 1400], pzRegen: 12, punish: 'schwung',
    moves: {
      schwung: { name: 'Kettenschwung', dur: 1650, hits: [{ t: 840, s: 'side', d: 18, k: 'p' }] },
      wirbel:  { name: 'Wirbel', dur: 2300, hits: [{ t: 700, s: 'side', d: 8, k: 'p' }, { t: 1060, s: 'over', d: 8, k: 'p' }, { t: 1420, s: 'side', d: 10, k: 'p' }] },
      stampf:  { name: 'Niederschlag', dur: 2400, hits: [{ t: 1550, s: 'over', d: 27, k: 'b', hold: 520 }] },
      wurf:    { name: 'Kettenwurf', dur: 2100, hits: [{ t: 1050, s: 'thrust', d: 22, k: 'u' }] }
    },
    p1: [['schwung', 3], ['wirbel', 2], ['stampf', 1.4], ['wurf', 1.2]],
    tb1: [['schwung', 3], ['wirbel', 2], ['stampf', 1.4], ['wurf', 1.2], ['panzer', 1]]
  },
  vogt: {
    name: 'Der Strandvogt', title: 'Sammler der Ertrunkenen', set: 'vogt', boss: true,
    hp: 580, pz: 170, glut: 1500, gap: [650, 1250], gap2: [420, 950], pzRegen: 16, punish: 'laterne',
    intro: 'Wieder eines. Die Flut spuckt sie aus, und ich sammle sie ein.',
    line2: 'Du hörst sie also auch, die Glocke. Dann bist du kein gewöhnliches Strandgut.',
    moves: {
      haken:      { name: 'Hakenschlag', dur: 1900, hits: [{ t: 960, s: 'over', d: 26, k: 'p' }] },
      zug:        { name: 'Zug und Schlag', dur: 2500, hits: [{ t: 820, s: 'thrust', d: 14, k: 'p' }, { t: 1560, s: 'over', d: 22, k: 'p', hold: 260 }] },
      laterne:    { name: 'Laternenschlag', dur: 1350, hits: [{ t: 640, s: 'side', d: 18, k: 'p' }] },
      ramm:       { name: 'Rammstoß', dur: 2200, hits: [{ t: 1120, s: 'lunge', d: 32, k: 'u' }] },
      flut:       { name: 'Flutwelle', dur: 2700, hits: [{ t: 1750, s: 'slam', d: 30, k: 'u', wave: 520 }] },
      wirbel:     { name: 'Hakenwirbel', dur: 2900, hits: [{ t: 640, s: 'side', d: 11, k: 'p' }, { t: 980, s: 'side', d: 11, k: 'p' }, { t: 1340, s: 'over', d: 14, k: 'p' }, { t: 2000, s: 'thrust', d: 18, k: 'b', hold: 300 }] },
      verzoegert: { name: 'Lauernder Hieb', dur: 2600, hits: [{ t: 1750, s: 'over', d: 30, k: 'p', hold: 820 }] },
      anker:      { name: 'Griff in die Tiefe', dur: 2500, hits: [{ t: 1180, s: 'grab', d: 34, k: 'u' }] }
    },
    p1: [['haken', 3], ['zug', 2], ['laterne', 2], ['ramm', 1.2]],
    p2: [['haken', 2], ['laterne', 2], ['flut', 1.3], ['wirbel', 1.6], ['verzoegert', 1.4], ['anker', 1.1]],
    tb1: [['haken', 3], ['zug', 2], ['laterne', 2], ['ramm', 1.2], ['sammeln', .8]],
    tb2: [['haken', 2], ['laterne', 1.5], ['flutsammeln', 1.2], ['wirbel', 1.6], ['verzoegert', 1.2], ['anker', 1.1]]
  }
};

// Absichten im Rundenkampf, die kein Angriff sind
const SPEZIAL = {
  lauern:      { name: 'Lauert', text: 'Nächster Angriff +50 %' },
  panzer:      { name: 'Rüstet sich', text: 'Fängt 12 Schaden ab' },
  sammeln:     { name: 'Sammelt sich', text: 'Haltung erholt sich' },
  flutsammeln: { name: 'Die Flut steigt', text: 'Nächste Runde: Flutwelle' },
  taumelt:     { name: 'Taumelt', text: 'Haltung gebrochen, kein Angriff' },
  gestoert:    { name: 'Unterbrochen', text: 'Kein Angriff in dieser Runde' }
};
const ART_LABEL = { p: 'parierbar', b: 'nicht parierbar', u: 'nur ausweichen' };

/* ---------- Szenen der Demo ---------- */
const SZENEN = {
  erwachen: {
    ort: 'Die Strandung', welt: 'strand', held: 'lie',
    text: [
      'Salz im Mund. Kies unter den Händen.',
      'Das Meer hat dich ausgespuckt, zwischen die Rippen eines Schiffes, dessen Namen du nicht kennst. Deinen eigenen kennst du auch nicht mehr.',
      'Irgendwo läutet eine Glocke. Leise und gleichmäßig, wie ein Herzschlag.'
    ],
    wahl: [{ t: 'Aufstehen', go: 'herkunft' }]
  },
  herkunft: {
    ort: 'Die Strandung', welt: 'strand', held: 'kneel',
    text: ['Neben dir im Kies liegt, was dir geblieben ist. Deine Hand greift danach, als wüsste sie besser als du, wer du warst.'],
    wahl: 'herkunft'
  },
  wrack: {
    ort: 'Das Wrackfeld', welt: 'strand', feind: 'ertrunkener', feindPose: 'lie',
    text: [
      'Zwischen den Wrackteilen bewegt sich etwas. Ein Mensch, oder was die Flut von einem übrig gelassen hat.',
      'Wasser läuft ihm aus dem Mund, als es sich zu dir dreht.'
    ],
    wahl: [{ t: 'Kämpfen', kampf: 'ertrunkener' }]
  },
  nachwrack: {
    ort: 'Das Wrackfeld', welt: 'strand',
    text: [
      'Es sinkt zurück in den Kies, als hätte es nur darauf gewartet. Etwas Warmes löst sich aus ihm und fließt zu dir herüber.',
      'Glut. Sie macht dich stärker, solange du sie nicht verlierst.',
      'Am Ende des Strandes steht ein Leuchtturm ohne Licht.'
    ],
    wahl: [{ t: 'Zum Leuchtturm gehen', feuer: 'strand' }]
  },
  tor: {
    ort: 'Das Kettentor', welt: 'tor', feind: 'knecht',
    text: [
      'Der Pfad führt die Klippe hinauf zu einem Tor aus rostigen Ketten.',
      'Davor steht ein Wächter mit einem Helm wie ein Eimer. In seiner Faust hängt eine eiserne Kugel an einer Kette. Er sagt nichts. Er wartet.'
    ],
    wahl: [{ t: 'Kämpfen', kampf: 'knecht' }, { t: 'Zum Leuchtfeuer zurück', feuer: 'strand' }]
  },
  nachtor: {
    ort: 'Das Kettentor', welt: 'tor',
    text: [
      'Der Wächter fällt schwer auf die Knie und dann zur Seite. Die Ketten des Tores klirren, als hätten sie ihren Herrn verloren.',
      'Dahinter führt eine steinerne Mole hinaus aufs Meer. Am Weg steht eine zweite Feuerschale.'
    ],
    wahl: [{ t: 'Das Feuer entfachen', feuer: 'mole' }]
  },
  nebel: {
    ort: 'Die Mole', welt: 'nebel',
    text: [
      'Am Ende der Mole steht der Nebel wie eine Wand.',
      'Das Läuten ist hier lauter. Und dahinter hörst du noch etwas anderes: Eisen, das über Stein schleift.'
    ],
    wahl: [{ t: 'Durch den Nebel gehen', kampf: 'vogt' }, { t: 'Zum Leuchtfeuer zurück', feuer: 'mole' }]
  },
  ende: {
    ort: 'Die Mole', welt: 'ende',
    text: [
      'Der Strandvogt sinkt ins flache Wasser. Seine Laterne erlischt als Letztes.',
      'Der Nebel zieht ab. Weit draußen stehen Türme im Dunst über dem schwarzen Wasser. Aus einem von ihnen weht ein tiefer Glockenschlag herüber.',
      'Die Glocke, die nur du hörst, antwortet.'
    ],
    wahl: [{ t: 'Ende der Demo', go: 'bilanz' }]
  }
};

const FEUER = {
  strand: { name: 'Leuchtfeuer am Strand', welt: 'feuer', weiter: { t: 'Den Pfad zur Klippe nehmen', go: 'tor' },
    erst: 'Unten am Leuchtturm glimmt in einer eisernen Schale noch Glut. Als du näher kommst, schlägt die Flamme hoch, als hätte sie auf dich gewartet.' },
  mole: { name: 'Leuchtfeuer an der Mole', welt: 'mole', weiter: { t: 'Zum Ende der Mole gehen', go: 'nebel' },
    erst: 'Die Schale ist voller Asche. Du hältst die Hand darüber, und die Asche beginnt zu glühen.' }
};
