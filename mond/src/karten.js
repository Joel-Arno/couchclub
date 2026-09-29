/* =====================================================================
   KARTEN: die Gebiete von Akt I
   Das Gelände steht in karten-bild.js (erzeugt von werkzeug/karten.py),
   hier steht, was darin ist. Jeder Buchstabe unter „o“ ist ein Anker der Karte.
   links: wohin man am linken oder rechten Rand weitergeht ('gebiet:anker').
   hinten: Rückwände in Kacheln [x0, y0, x1, y1], für Innenräume und Häuser.
   staerke: wie viel mehr Leben und Schaden normale Gegner hier haben.
   kartenPos: Lage auf der Karte der Region [x, y, breite, höhe].
   ===================================================================== */
const START = { gebiet: 'kiesstrand', anker: 's' };
const TITEL = { gebiet: 'leuchtturm', x: 46 * 24, y: 18 * 24 };

const GEBIETE = {
  /* ---------------------------------------------------------------- Die Strandung */
  kiesstrand: {
    name: 'Kiesstrand', region: 'strandung', thema: 'strand', horizont: 18 * T - 24, staerke: 1, musik: 'amb',
    kartenPos: [0, 6, 3, 1], links: { r: 'wrackfeld:a' }, betreten: 'kiesstrand_betreten',
    hinten: [[72, 14, 100, 17], [94, 4, 99, 7]],
    beschreibung: 'Wo die Flut dich ausgespuckt hat. Ein Gang führt unter der Felsnase hindurch.',
    o: {
      s: { t: 'start', richtung: 1 },
      b: { t: 'gegenstand', id: 'flasche', lore: 'brief_strandgut' },
      j: { t: 'ereignis', skript: 'h_springen', breite: 2 },
      m: { t: 'deko', art: 'mast', h: 7, neigung: -.35 },
      h: { t: 'ereignis', skript: 'h_hinterhalt', breite: 2 },
      e: { t: 'feind', g: 'ertrunkener', liegt: true, blick: 1 },
      B: { t: 'deko', art: 'boot' },
      k: { t: 'deko', art: 'kiste' },
      l: { t: 'ereignis', skript: 'h_leiter', breite: 2 },
      q: { t: 'schrift', art: 'grab', lore: 'grab_fischer' },
      w: { t: 'ereignis', skript: 'h_wand', breite: 2 },
      g: { t: 'gegenstand', id: 'erz_kiesstrand', gibt: { item: 'glockenerz' }, text: 'In der Höhle liegt ein Klumpen grünlichen Metalls. Glockenerz. An einem Amboss wird damit eine Waffe besser.' },
      c: { t: 'feind', g: 'krabbe', lauert: 2.5, von: 'oben', blick: -1 },
      p: { t: 'feind', g: 'ertrunkener', patrouille: [4, 4], blick: -1 },
      u: { t: 'feind', g: 'ertrunkener', lauert: 3, von: 'wasser', blick: -1 },
      z: { t: 'eingang', richtung: -1 }
    }
  },
  wrackfeld: {
    name: 'Wrackfeld', region: 'strandung', thema: 'strand', horizont: 24 * T - 30, staerke: 1, musik: 'amb',
    kartenPos: [3, 5, 3, 2], links: { l: 'kiesstrand:z', r: 'leuchtturm:a' }, betreten: 'wrack_betreten',
    hinten: [[57, 15, 99, 23], [142, 20, 147, 23]],
    beschreibung: 'Ein Friedhof aus Schiffen. Im Bauch der Seraphine brennt ein schwaches Licht.',
    o: {
      a: { t: 'eingang', richtung: 1 },
      e: { t: 'ereignis', skript: 'h_schleichen', breite: 2 },
      1: { t: 'feind', g: 'ertrunkener', patrouille: [2, 2], blick: 1 },
      2: { t: 'feind', g: 'ertrunkener', liegt: true, blick: -1 },
      t: { t: 'leiche', id: 'treibholz', gibt: { schild: 'treibholz' }, text: 'Unter einer Planke klemmt ein Schild aus Treibholz, mit Eisen beschlagen. Schwer, aber besser als nichts.' },
      k: { t: 'deko', art: 'kiste' },
      3: { t: 'feind', g: 'ertrunkener', liegt: true, blick: 1 },
      l: { t: 'schrift', art: 'buch', lore: 'logbuch_seraphine' },
      L: { t: 'licht', r: 120, farbe: 'rgba(255,190,120,.8)', a: .35, hoehe: 1 },
      o: { t: 'npc', id: 'oswin', sitzt: true, blick: -1, wenn: D => !D.bosse.vogt },
      p: { t: 'leiche', id: 'oswin_ende', lore: 'brief_oswin', sitzt: true, blick: -1, wenn: D => D.bosse.vogt },
      m: { t: 'deko', art: 'mast', h: 12, neigung: .12 },
      4: { t: 'feind', g: 'ertrunkener', patrouille: [4, 4], gruppe: 'deck', blick: 1 },
      f: { t: 'feind', g: 'fischer', gruppe: 'deck', blick: -1 },
      5: { t: 'feind', g: 'krabbe', gruppe: 'krabben', blick: -1 },
      6: { t: 'feind', g: 'krabbe', gruppe: 'krabben', blick: -1 },
      w: { t: 'ereignis', skript: 'h_wand', breite: 2, wenn: D => D.merker.oswin_bucht },
      y: { t: 'eingang', richtung: -1 },
      b: { t: 'ausgang', ziel: 'bucht:a', breite: 1, hoch: 3 },
      z: { t: 'eingang', richtung: -1 }
    }
  },
  bucht: {
    name: 'Stille Bucht', region: 'strandung', thema: 'grotte', horizont: 20 * T, staerke: 1.1, musik: 'hoehle',
    kartenPos: [6, 7, 2, 1], links: { l: 'wrackfeld:y' },
    beschreibung: 'Eine Grotte hinter dem hohlen Fels. Am Grund glimmt etwas Bläuliches.',
    o: {
      a: { t: 'eingang', richtung: 1 },
      e: { t: 'ereignis', skript: 'bucht_ankunft', breite: 2 },
      1: { t: 'feind', g: 'krabbe', gruppe: 'k', blick: -1 },
      2: { t: 'feind', g: 'krabbe', gruppe: 'k', blick: -1 },
      l: { t: 'licht', r: 180, farbe: 'rgba(120,220,230,.9)', a: .35, hoehe: 1 },
      g: { t: 'gegenstand', id: 'erz_bucht', gibt: { item: 'glockenerz' }, text: 'In einer Spalte steckt Glockenerz, rund gewaschen vom Wasser.' },
      r: { t: 'feind', g: 'ritter', blick: -1, sicht: 10 },
      s: { t: 'leiche', id: 'aldric', gibt: { tal: 'wachsiegel' }, lore: 'schild_ritter', sitzt: true, blick: -1 },
      m: { t: 'gegenstand', id: 'mondtau_bucht', gibt: { item: 'mondtau' }, text: 'Auf dem Sims liegt ein Kristall, kalt wie Mondlicht. Mondtau. Am Leuchtfeuer wird daraus eine weitere Phiole.' }
    }
  },
  leuchtturm: {
    name: 'Leuchtturm', region: 'strandung', thema: 'leuchtturm', horizont: 18 * T - 20, staerke: 1, musik: 'amb',
    kartenPos: [6, 4, 3, 2], links: { l: 'wrackfeld:z', r: 'klippenpfad:a' },
    beschreibung: 'Ein Leuchtturm ohne Licht. An seinem Fuß brennt das erste Leuchtfeuer.',
    o: {
      a: { t: 'eingang', richtung: 1 },
      e: { t: 'ereignis', skript: 'leuchtturm_ankunft', breite: 2 },
      f: { t: 'feuer', id: 'feuer_leuchtturm', name: 'Leuchtfeuer am Leuchtturm' },
      n: { t: 'npc', id: 'enna', sitzt: true, blick: -1, wenn: D => !D.merker.velmora },
      L: { t: 'deko', art: 'laternenpfahl' },
      T: { t: 'deko', art: 'leuchtturm', h: 16, an: D => D.offen['leuchtturm_innen:lampe'] },
      t: { t: 'tuer', ziel: 'leuchtturm_innen:t', label: 'Den Leuchtturm betreten' },
      g: { t: 'deko', art: 'kiste' },
      b: { t: 'deko', art: 'baum', h: 5, blick: 1 },
      r: { t: 'ereignis', skript: 'h_glut', breite: 2 },
      k: { t: 'tuer', ziel: 'klippenpfad:k', einweg: true, label: 'Tür im Fels', zuText: 'Eine eiserne Tür im Fels. Sie ist von der anderen Seite verriegelt.' },
      1: { t: 'feind', g: 'ertrunkener', patrouille: [2, 2], blick: -1 },
      z: { t: 'eingang', richtung: -1 }
    }
  },
  leuchtturm_innen: {
    name: 'Im Leuchtturm', region: 'strandung', thema: 'turm', horizont: 30 * T, staerke: 1.05, musik: 'turm',
    kartenPos: [7, 2, 1, 2], hinten: [[4, 4, 29, 59]],
    beschreibung: 'Fünf Stockwerke, eine Leiter nach der anderen. Oben der Raum mit der Lampe.',
    o: {
      t: { t: 'tuer', ziel: 'leuchtturm:t', label: 'Hinaus' },
      b: { t: 'schrift', art: 'buch', lore: 'lampenbuch' },
      k: { t: 'deko', art: 'kerzen' },
      6: { t: 'deko', art: 'fenster', hoehe: 8 },
      1: { t: 'feind', g: 'ertrunkener', liegt: true, blick: 1 },
      7: { t: 'deko', art: 'fenster', hoehe: 8 },
      2: { t: 'feind', g: 'ertrunkener', gruppe: 'g3', blick: -1 },
      3: { t: 'feind', g: 'kultist', gruppe: 'g3', blick: -1 },
      c: { t: 'truhe', id: 'truhe_turm', gibt: { item: 'glockenerz' } },
      4: { t: 'feind', g: 'ertrunkener', lauert: 3, von: 'oben', blick: -1 },
      8: { t: 'deko', art: 'fenster', hoehe: 8 },
      h: { t: 'hebel', id: 'lampe', oeffnet: 'q', zu: 'waerterschluessel', zuText: 'Ein Gitter versperrt den Raum mit der Lampe. Der Hebel dafür ist mit einem schweren Wärterschloss gesichert.', text: 'Das Schloss springt auf. Das Gitter hebt sich knirschend.' },
      w: { t: 'schrift', art: 'buch', lore: 'tagebuch_waerter' },
      m: { t: 'gegenstand', id: 'mondtau_turm', gibt: { item: 'mondtau' }, text: 'Wo die Lampe stand, liegt ein Kristall aus Mondtau. Der Wärter hat ihn aufbewahrt, für schlechte Zeiten.' },
      9: { t: 'deko', art: 'fenster', hoehe: 7 }
    }
  },
  klippenpfad: {
    name: 'Klippenpfad', region: 'strandung', thema: 'klippe', horizont: 26 * T, staerke: 1.05, musik: 'amb',
    kartenPos: [9, 3, 3, 2], links: { l: 'leuchtturm:z', r: 'mole:a' },
    hinten: [[5, 32, 105, 37], [105, 21, 105, 31], [139, 2, 144, 5]],
    beschreibung: 'Der Pfad windet sich die Klippe hinauf zum Kettentor. Unter ihm führt ein Gang zurück.',
    o: {
      a: { t: 'eingang', richtung: 1 },
      3: { t: 'deko', art: 'baum', h: 4, blick: 1 },
      h: { t: 'ereignis', skript: 'h_schleichen', breite: 2 },
      f: { t: 'feind', g: 'fischer', blick: -1 },
      e: { t: 'feind', g: 'ertrunkener', patrouille: [3, 3], blick: -1 },
      4: { t: 'deko', art: 'baum', h: 5, blick: -1 },
      o: { t: 'feind', g: 'ertrunkener', lauert: 3, von: 'oben', blick: -1 },
      w: { t: 'leiche', id: 'kletterer', gibt: { glut: 200 }, text: 'Ein Kletterer, der den Halt verloren hat. In seinem Beutel ist noch Glut.' },
      K: { t: 'feind', g: 'knecht', blick: -1, sicht: 9 },
      m: { t: 'deko', art: 'kette', h: 5 },
      n: { t: 'deko', art: 'kette', h: 5 },
      c: { t: 'truhe', id: 'truhe_klippe', gibt: { item: ['glockenerz', 2] } },
      k: { t: 'tuer', ziel: 'leuchtturm:k', riegel: true, paar: 'leuchtturm:k', label: 'Zum Leuchtturm' },
      l: { t: 'leiche', id: 'erz_gang', gibt: { item: 'glockenerz' } },
      1: { t: 'feind', g: 'krabbe', gruppe: 'gang', blick: -1 },
      2: { t: 'feind', g: 'krabbe', gruppe: 'gang', blick: -1 },
      z: { t: 'eingang', richtung: -1 }
    }
  },
  mole: {
    name: 'Mole', region: 'strandung', thema: 'mole', horizont: 18 * T - 10, staerke: 1.1, musik: 'amb',
    kartenPos: [12, 2, 3, 1], links: { l: 'klippenpfad:z', r: 'nebel:a' },
    beschreibung: 'Eine steinerne Mole weit hinaus ins Meer. Am Ende steht der Nebel.',
    o: {
      a: { t: 'eingang', richtung: 1 },
      L: { t: 'deko', art: 'laternenpfahl' },
      f: { t: 'feuer', id: 'feuer_mole', name: 'Leuchtfeuer an der Mole', amboss: 'r' },
      s: { t: 'schrift', art: 'grab', lore: 'mole_stein' },
      4: { t: 'feind', g: 'ertrunkener', lauert: 2.5, von: 'wasser', blick: -1 },
      1: { t: 'feind', g: 'ertrunkener', patrouille: [4, 4], blick: -1 },
      2: { t: 'feind', g: 'fischer', gruppe: 'm2', blick: -1 },
      3: { t: 'feind', g: 'ertrunkener', gruppe: 'm2', blick: -1 },
      M: { t: 'deko', art: 'laternenpfahl' },
      c: { t: 'truhe', id: 'truhe_mole', gibt: { item: 'glockenerz', glut: 300 } },
      v: { t: 'ereignis', skript: 'vogt_silhouette', breite: 2, hoch: 5 },
      5: { t: 'feind', g: 'ertrunkener', liegt: true, blick: -1 },
      z: { t: 'eingang', richtung: -1 }
    }
  },
  nebel: {
    name: 'Ende der Mole', region: 'strandung', thema: 'nebel', horizont: 18 * T - 10, staerke: 1.1, musik: 'amb',
    kartenPos: [15, 1, 2, 1], links: { l: 'mole:z', r: 'salzpfad:a' },
    beschreibung: 'Wo der Nebel stand wie eine Wand. Hier wartete der Strandvogt.',
    o: {
      a: { t: 'eingang', richtung: 1 },
      e: { t: 'ereignis', skript: 'nebel_ankunft', breite: 2 },
      g: { t: 'nebeltor', boss: 'vogt', seite: 1 },
      v: { t: 'boss', boss: 'vogt', blick: -1, beute: { item: [['nachhall_vogt', 1], ['waerterschluessel', 1]] } },
      b: { t: 'leiche', id: 'verzeichnis', lore: 'liste_vogt', text: 'Neben der Laterne des Vogts liegt ein Buch in Wachstuch.', wenn: D => D.bosse.vogt },
      z: { t: 'eingang', richtung: -1 }
    }
  },

  /* ---------------------------------------------------------------- Die Salzmarsch */
  salzpfad: {
    name: 'Salzpfad', region: 'marsch', thema: 'marsch', horizont: 18 * T - 10, staerke: 1.2, musik: 'marsch',
    kartenPos: [0, 4, 4, 1], links: { l: 'nebel:z', r: 'pfahldorf:a' },
    beschreibung: 'Ein Pfad aus weißem Salz durch die Marsch. Unten, hinter dem Steg, geht es ins Schilf.',
    o: {
      a: { t: 'eingang', richtung: 1 },
      s: { t: 'schrift', art: 'schild', lore: 'warnschild_salz' },
      e: { t: 'ereignis', skript: 'salzpfad_ankunft', breite: 2 },
      B: { t: 'deko', art: 'baum', h: 6, blick: 1 },
      w: { t: 'ereignis', skript: 'h_wasser', breite: 2 },
      1: { t: 'feind', g: 'pfahl', patrouille: [4, 4], blick: -1 },
      b: { t: 'deko', art: 'baum', h: 7, blick: -1 },
      2: { t: 'feind', g: 'ertrunkener', gruppe: 'p2', blick: -1 },
      3: { t: 'feind', g: 'pfahl', gruppe: 'p2', blick: -1 },
      4: { t: 'feind', g: 'moorleiche', lauert: 3, von: 'wasser', blick: -1 },
      c: { t: 'deko', art: 'baum', h: 5, blick: 1 },
      d: { t: 'ereignis', skript: 'h_steg', breite: 2 },
      5: { t: 'feind', g: 'pfahl', patrouille: [3, 3], blick: -1 },
      7: { t: 'feind', g: 'krabbe', gruppe: 'unten', blick: -1 },
      8: { t: 'feind', g: 'krabbe', gruppe: 'unten', blick: -1 },
      g: { t: 'leiche', id: 'salzsammler', gibt: { item: 'glockenerz', glut: 150 }, text: 'Ein Salzsammler, der unter den Steg gekrochen ist, um zu sterben. Er hat seinen Fund fest im Arm.' },
      y: { t: 'eingang', richtung: -1 },
      x: { t: 'ausgang', ziel: 'schilf:a', breite: 1, hoch: 3 },
      z: { t: 'eingang', richtung: -1 }
    }
  },
  schilf: {
    name: 'Schilfmeer', region: 'marsch', thema: 'marsch', horizont: 20 * T - 20, staerke: 1.25, musik: 'marsch',
    kartenPos: [2, 6, 3, 1], links: { l: 'salzpfad:y' },
    beschreibung: 'Das Schilf steht höher als du. Es raschelt, obwohl kein Wind geht.',
    o: {
      a: { t: 'eingang', richtung: 1 },
      p: { t: 'deko', art: 'schilf', vorn: true },
      q: { t: 'deko', art: 'schilf', vorn: true },
      1: { t: 'feind', g: 'krabbe', gruppe: 'k', blick: -1 },
      2: { t: 'feind', g: 'krabbe', gruppe: 'k', blick: -1 },
      3: { t: 'feind', g: 'krabbe', gruppe: 'k', blick: -1 },
      g: { t: 'untersuchen', id: 'erz_schilf', label: 'Im Schlamm graben', gibt: { item: 'glockenerz' }, text: 'Unter dem Schlamm liegt ein Klumpen Glockenerz, rund gewaschen vom Wasser.' },
      m: { t: 'feind', g: 'moorleiche', liegt: true, blick: 1 },
      r: { t: 'deko', art: 'schilf' },
      b: { t: 'deko', art: 'baum', h: 6, blick: -1 },
      h: { t: 'untersuchen', id: 'reiher', label: 'Den Reiher untersuchen', gibt: { tal: 'salzamulett' }, text: 'Ein toter Reiher, das Gefieder weiß vor Salz. Um seinen Hals hängt ein Amulett aus Salzkristall. Jemand hat es ihm umgebunden, vor langer Zeit.' }
    }
  },
  pfahldorf: {
    name: 'Pfahlwyk', region: 'marsch', thema: 'pfahldorf', horizont: 24 * T - 10, staerke: 1.2, musik: 'marsch',
    kartenPos: [4, 3, 4, 2], links: { l: 'salzpfad:z', r: 'ufer:a' },
    hinten: [[50, 17, 62, 23], [74, 17, 86, 23], [90, 15, 97, 23]],
    beschreibung: 'Ein Dorf auf Pfählen, halb im Wasser. Hinter den Häusern geht es hinab in die Salzgrube.',
    o: {
      a: { t: 'eingang', richtung: 1 },
      e: { t: 'ereignis', skript: 'pfahldorf_ankunft', breite: 2 },
      f: { t: 'feuer', id: 'feuer_pfahldorf', name: 'Leuchtfeuer in Pfahlwyk' },
      m: { t: 'npc', id: 'mira', sitzt: true, blick: -1, wenn: D => !D.merker.velmora || !D.merker.mira1 },
      N: { t: 'deko', art: 'netz', w: 3, h: 3 },
      L: { t: 'deko', art: 'laterne' },
      l: { t: 'licht', r: 140, farbe: 'rgba(255,190,120,.8)', a: .3, hoehe: 1 },
      r: { t: 'npc', id: 'greta', sitzt: true, blick: -1 },
      c: { t: 'truhe', id: 'truhe_dach', gibt: { item: 'glockenerz' } },
      t: { t: 'tuer', ziel: 'heilerhaus:t', label: 'Wendas Haus betreten', warm: true },
      d: { t: 'truhe', id: 'truhe_dach2', gibt: { glut: 350 } },
      s: { t: 'feind', g: 'salzleiche', patrouille: [4, 4], blick: -1 },
      R: { t: 'deko', art: 'rad' },
      g: { t: 'tuer', art: 'schacht', ziel: 'salzgrube:a', label: 'In die Salzgrube hinabsteigen' },
      z: { t: 'eingang', richtung: -1 }
    }
  },
  heilerhaus: {
    name: 'Wendas Haus', region: 'marsch', thema: 'haus', horizont: 10 * T, staerke: 1.2, musik: 'hoehle',
    kartenPos: [6, 1, 1, 1], hinten: [[3, 4, 36, 13]],
    beschreibung: 'Das Haus der Heilerin. Es riecht nach Salz und kalten Kerzen.',
    o: {
      t: { t: 'tuer', ziel: 'pfahldorf:t', label: 'Hinaus' },
      k: { t: 'deko', art: 'kerzen' },
      w: { t: 'schrift', art: 'buch', lore: 'tagebuch_wenda' },
      b: { t: 'deko', art: 'sarg' },
      B: { t: 'deko', art: 'sarg' },
      l: { t: 'feind', g: 'salzleiche', liegt: true, blick: -1 },
      c: { t: 'truhe', id: 'truhe_wenda', gibt: { item: 'glockenerz', glut: 200 } },
      L: { t: 'licht', r: 120, farbe: 'rgba(255,200,140,.8)', a: .3, hoehe: 1 }
    }
  },
  salzgrube: {
    name: 'Salzgrube', region: 'marsch', thema: 'grube', horizont: 40 * T, staerke: 1.3, musik: 'hoehle', betreten: null,
    kartenPos: [8, 3, 2, 4],
    beschreibung: 'Ein Schacht aus weißem Kristall, tief hinab. Ganz unten singt jemand.',
    o: {
      t: { t: 'tuer', art: 'schacht', ziel: 'pfahldorf:g', label: 'Hinaufsteigen' },
      a: { t: 'eingang', richtung: 1 },
      e: { t: 'ereignis', skript: 'grube_ankunft', breite: 2 },
      1: { t: 'feind', g: 'salzleiche', liegt: true, blick: -1 },
      2: { t: 'feind', g: 'salzleiche', patrouille: [3, 3], blick: -1 },
      3: { t: 'feind', g: 'kultist', gruppe: 'g3', blick: -1 },
      4: { t: 'feind', g: 'salzleiche', gruppe: 'g3', blick: -1 },
      5: { t: 'feind', g: 'salzleiche', lauert: 3, von: 'oben', blick: 1 },
      c: { t: 'truhe', id: 'truhe_grube', gibt: { item: ['glockenerz', 2] } },
      h: { t: 'leiche', id: 'hark', gibt: { item: 'nadel' }, lore: 'brief_hark', sitzt: true, blick: 1, text: 'Ein Mann sitzt an den Fels gelehnt, weiß vom Salz bis zur Brust. In seiner Hand eine Nadel aus Walknochen und ein Zettel.' },
      i: { t: 'schrift', art: 'grab', lore: 'grube_inschrift' },
      6: { t: 'feind', g: 'salzleiche', liegt: true, blick: 1 },
      7: { t: 'feind', g: 'salzleiche', blick: -1 },
      8: { t: 'feind', g: 'kultist', gruppe: 'g6', blick: 1 },
      9: { t: 'feind', g: 'salzleiche', gruppe: 'g6', blick: 1 },
      L: { t: 'hebel', oeffnet: 'q', text: 'Das Gitter hebt sich. Dahinter führt eine Leiter hinauf, bis ganz nach oben.' },
      g: { t: 'nebeltor', boss: 'hexe', seite: 1 },
      x: { t: 'boss', boss: 'hexe', blick: -1, beute: { tal: 'traenenperle', item: ['glockenerz', 2] } }
    }
  },
  ufer: {
    name: 'Totes Ufer', region: 'marsch', thema: 'marsch', horizont: 20 * T - 10, staerke: 1.25, musik: 'marsch',
    kartenPos: [8, 1, 3, 1], links: { l: 'pfahldorf:z', r: 'bruecke:a' },
    hinten: [[100, 12, 112, 19]],
    beschreibung: 'Boote liegen kieloben am Ufer wie Tiere, die sich zum Sterben hingelegt haben.',
    o: {
      a: { t: 'eingang', richtung: 1 },
      S: { t: 'deko', art: 'schilf', vorn: true },
      B: { t: 'deko', art: 'boot' },
      1: { t: 'feind', g: 'pfahl', patrouille: [4, 4], blick: -1 },
      C: { t: 'deko', art: 'boot' },
      2: { t: 'feind', g: 'pfahl', gruppe: 'u2', blick: -1 },
      3: { t: 'feind', g: 'pfahl', gruppe: 'u2', blick: -1 },
      D: { t: 'deko', art: 'boot' },
      b: { t: 'leiche', id: 'entermesser', gibt: { waffe: 'entermesser' }, text: 'Unter dem größten Boot liegt ein Seemann, der schon lange nicht mehr atmet. In seiner Hand ein Entermesser, krumm und scharf. Er braucht es nicht mehr.' },
      5: { t: 'feind', g: 'fischer', blick: -1 },
      l: { t: 'untersuchen', id: 'mondtau_ufer', label: 'Die Laterne ansehen', gibt: { item: 'mondtau' }, text: 'In der Laterne brennt keine Kerze. Darin liegt ein Kristall aus Mondtau, als hätte ihn jemand hier aufbewahrt, für schlechte Zeiten.' },
      L: { t: 'deko', art: 'laterne' },
      k: { t: 'deko', art: 'kiste' },
      4: { t: 'feind', g: 'moorleiche', liegt: true, blick: -1 },
      T: { t: 'deko', art: 'baum', h: 6, blick: -1 },
      z: { t: 'eingang', richtung: -1 }
    }
  },
  bruecke: {
    name: 'Nebelbrücke', region: 'marsch', thema: 'bruecke', horizont: 14 * T + 40, staerke: 1.3, musik: 'marsch',
    kartenPos: [11, 0, 4, 2], links: { l: 'ufer:z', r: 'stadttor:a' },
    hinten: [[40, 17, 43, 37], [70, 17, 73, 37], [125, 17, 128, 37], [150, 17, 153, 37]],
    beschreibung: 'Eine alte Brücke nach Velmora. Seit sie eingestürzt ist, führt der Weg unten durchs Flussbett.',
    o: {
      a: { t: 'eingang', richtung: 1 },
      b: { t: 'ereignis', skript: 'bruecke_ankunft', breite: 2 },
      k: { t: 'npc', id: 'kalden', blick: -1, wenn: D => !D.merker.kalden1 },
      p: { t: 'schrift', art: 'grab', lore: 'kalden_bruecke' },
      1: { t: 'feind', g: 'pfahl', patrouille: [4, 4], blick: -1 },
      2: { t: 'feind', g: 'knecht', blick: -1, sicht: 9 },
      e: { t: 'ereignis', skript: 'bruecke_einsturz', breite: 4, von: 95, bis: 104 },
      l: { t: 'leiche', id: 'flusstoter', gibt: { glut: 500 }, text: 'Ein Wanderer, der vor dir von der Brücke gefallen ist. Er hatte Glut bei sich.' },
      g: { t: 'gegenstand', id: 'erz_fluss', gibt: { item: 'glockenerz' } },
      3: { t: 'feind', g: 'moorleiche', lauert: 3, von: 'wasser', blick: -1 },
      4: { t: 'feind', g: 'ertrunkener', patrouille: [3, 3], blick: -1 },
      5: { t: 'feind', g: 'pfahl', blick: -1 },
      6: { t: 'feind', g: 'moorleiche', liegt: true, blick: -1 },
      z: { t: 'eingang', richtung: -1 }
    }
  },

  /* ---------------------------------------------------------------- Velmora */
  stadttor: {
    name: 'Stadttor', region: 'velmora', thema: 'velmora', horizont: 20 * T - 10, staerke: 1.35, musik: 'stadt',
    kartenPos: [0, 6, 3, 1], links: { l: 'bruecke:z', r: 'gassen:a' },
    hinten: [[55, 16, 75, 19]],
    beschreibung: 'Das Tor von Velmora steht halb unter Wasser. Oben auf der Mauer sieht man weit.',
    o: {
      a: { t: 'eingang', richtung: 1 },
      e: { t: 'ereignis', skript: 'velmora_ankunft', breite: 2 },
      w: { t: 'feind', g: 'waechter', blick: -1, sicht: 9 },
      i: { t: 'schrift', art: 'grab', lore: 'inschrift_tor' },
      c: { t: 'truhe', id: 'truhe_mauer', gibt: { item: 'glockenerz', glut: 400 } },
      G: { t: 'deko', art: 'glocke', hoehe: 3.2, breite: 46 },
      L: { t: 'deko', art: 'laternenpfahl' },
      k: { t: 'tuer', ziel: 'brunnenplatz:k', einweg: true, label: 'Seitentür', zuText: 'Verriegelt. Dahinter hörst du Wasser plätschern, wie aus einem Brunnen.' },
      1: { t: 'feind', g: 'jungfer', patrouille: [4, 4], blick: -1 },
      z: { t: 'eingang', richtung: -1 }
    }
  },
  gassen: {
    name: 'Überflutete Gassen', region: 'velmora', thema: 'velmora', horizont: 30 * T - 10, staerke: 1.4, musik: 'stadt',
    kartenPos: [3, 5, 4, 2], links: { l: 'stadttor:z', r: 'brunnenplatz:a' },
    hinten: [[20, 18, 32, 29], [40, 14, 52, 29], [60, 16, 74, 29], [92, 20, 104, 29], [110, 12, 126, 29], [135, 15, 150, 29], [158, 12, 172, 29]],
    beschreibung: 'Knietiefe Gassen und Dächer, über die man weiterkommt. Ein Haus hat ein blaues Tor.',
    o: {
      a: { t: 'eingang', richtung: 1 },
      1: { t: 'feind', g: 'jungfer', patrouille: [3, 3], blick: -1 },
      c: { t: 'truhe', id: 'truhe_gasse', gibt: { item: 'glockenerz' } },
      L: { t: 'deko', art: 'laternenpfahl' },
      4: { t: 'feind', g: 'jungfer', blick: -1 },
      2: { t: 'feind', g: 'jungfer', gruppe: 'g2', blick: -1 },
      3: { t: 'feind', g: 'ertrunkener', gruppe: 'g2', blick: -1 },
      b: { t: 'tuer', ziel: 'blaueshaus:t', label: 'Das blaue Haus betreten', farbe: '#0f2140', warm: true },
      5: { t: 'feind', g: 'jungfer', patrouille: [3, 3], blick: -1 },
      M: { t: 'deko', art: 'laternenpfahl' },
      w: { t: 'leiche', id: 'glockenschild', gibt: { schild: 'glockenschild' }, text: 'Auf dem Dach liegt ein Glockenwächter, der seinen letzten Kampf verloren hat. Sein Schild ist aus Glockenbronze und dröhnt leise, als du ihn aufhebst.' },
      6: { t: 'feind', g: 'ertrunkener', patrouille: [3, 3], blick: -1 },
      h: { t: 'ereignis', skript: 'h_gitter_gasse', breite: 2, wenn: D => !D.offen['gassen:o'] },
      o: { t: 'hebel', oeffnet: 'q', text: 'Unten in der Gasse hebt sich ein Gitter.' },
      z: { t: 'eingang', richtung: -1 }
    }
  },
  blaueshaus: {
    name: 'Das blaue Haus', region: 'velmora', thema: 'haus', horizont: 10 * T, staerke: 1.4, musik: 'hoehle',
    kartenPos: [5, 3, 1, 1], hinten: [[3, 4, 32, 13]],
    beschreibung: 'Zwei Gläser auf dem Tisch, eines umgefallen.',
    o: {
      t: { t: 'tuer', ziel: 'gassen:b', label: 'Hinaus' },
      k: { t: 'deko', art: 'kerzen' },
      z: { t: 'schrift', art: 'buch', lore: 'blaues_haus' },
      L: { t: 'licht', r: 120, farbe: 'rgba(170,190,255,.8)', a: .25, hoehe: 1 },
      f: { t: 'deko', art: 'fenster', hoehe: 7 }
    }
  },
  brunnenplatz: {
    name: 'Brunnenplatz', region: 'velmora', thema: 'velmora', horizont: 22 * T - 10, staerke: 1.4, musik: 'stadt',
    kartenPos: [7, 4, 3, 1], links: { l: 'gassen:z', r: 'hafen:a' },
    hinten: [[60, 4, 72, 15]],
    beschreibung: 'Der Platz mit dem Brunnen, in dem Glut unter dem Wasser glimmt. Oben die Brautkapelle.',
    o: {
      a: { t: 'eingang', richtung: 1 },
      k: { t: 'tuer', ziel: 'stadttor:k', riegel: true, paar: 'stadttor:k', label: 'Zum Stadttor' },
      L: { t: 'deko', art: 'laternenpfahl' },
      K: { t: 'npc', id: 'kalden', blick: 1, wenn: D => D.bosse.isolde && !D.merker.kalden_fort },
      f: { t: 'feuer', id: 'feuer_brunnen', name: 'Leuchtfeuer am Brunnen', brunnen: true, amboss: 'r' },
      m: { t: 'npc', id: 'mira', sitzt: true, blick: -1, wenn: D => D.merker.velmora && D.merker.mira1 },
      M: { t: 'deko', art: 'laternenpfahl' },
      t: { t: 'tuer', ziel: 'kapelle:t', label: 'Die Kapelle betreten' },
      s: { t: 'deko', art: 'statue', blick: -1 },
      z: { t: 'eingang', richtung: -1 }
    }
  },
  hafen: {
    name: 'Hafen', region: 'velmora', thema: 'hafen', horizont: 24 * T - 10, staerke: 1.4, musik: 'stadt',
    kartenPos: [10, 4, 4, 2], links: { l: 'brunnenplatz:z' },
    beschreibung: 'Schiffe übereinander, Taue wie Netze. Im Bauch eines Schiffes geht es hinab ins Hafenbecken.',
    o: {
      a: { t: 'eingang', richtung: 1 },
      e: { t: 'ereignis', skript: 'hafen_ankunft', breite: 2 },
      i: { t: 'schrift', art: 'schild', lore: 'hafen_tafel' },
      L: { t: 'deko', art: 'laternenpfahl' },
      1: { t: 'feind', g: 'fischer', patrouille: [3, 3], blick: -1 },
      2: { t: 'feind', g: 'ertrunkener', blick: -1 },
      m: { t: 'deko', art: 'mast', h: 14, neigung: -.06 },
      3: { t: 'feind', g: 'krabbe', gruppe: 'deckA', blick: -1 },
      4: { t: 'feind', g: 'krabbe', gruppe: 'deckA', blick: -1 },
      7: { t: 'feind', g: 'fischer', blick: -1 },
      6: { t: 'feind', g: 'ertrunkener', gruppe: 'deckB', blick: -1 },
      5: { t: 'feind', g: 'kultist', gruppe: 'deckB', blick: -1 },
      j: { t: 'gegenstand', id: 'jontes_beutel', lore: 'brief_jonte', text: 'In den Tauen hängt ein wasserfester Beutel. Auf dem Leder steht ein Name: Jonte.' },
      d: { t: 'tuer', art: 'loch', ziel: 'hafenbecken:t', label: 'In das Hafenbecken hinab' },
      M: { t: 'deko', art: 'laternenpfahl' },
      g: { t: 'nebeltor', boss: 'spinne', seite: 1 },
      x: { t: 'boss', boss: 'spinne', blick: -1, beute: { item: ['glockenerz', 2] } }
    }
  },
  hafenbecken: {
    name: 'Hafenbecken', region: 'velmora', thema: 'becken', horizont: 16 * T, staerke: 1.4, musik: 'hoehle',
    kartenPos: [11, 7, 2, 1], hinten: [[3, 4, 66, 21]],
    beschreibung: 'Leergelaufen. Unten führen Stufen noch tiefer, ins Wasser.',
    o: {
      t: { t: 'tuer', art: 'loch', ziel: 'hafen:d', label: 'Hinaufsteigen' },
      e: { t: 'ereignis', skript: 'becken_ankunft', breite: 2 },
      g: { t: 'nebeltor', boss: 'taucher', seite: 1 },
      k: { t: 'deko', art: 'kette', h: 12 },
      x: { t: 'boss', boss: 'taucher', blick: -1, beute: { item: 'helm' } },
      K: { t: 'deko', art: 'kette', h: 14 },
      u: { t: 'untersuchen', id: 'stufen', label: 'Die Stufen ansehen', text: 'Breite Stufen führen hinab, aus demselben Stein wie der Glockenturm. Nach ein paar Schritten steht das Wasser bis zur Decke. Von unten, ganz leise, kommt ein Läuten, das du in den Zähnen spürst.' }
    }
  },
  kapelle: {
    name: 'Brautkapelle', region: 'velmora', thema: 'kapelle', horizont: 12 * T, staerke: 1.5, musik: 'hoehle', betreten: 'kapelle_ankunft',
    kartenPos: [7, 1, 3, 2], hinten: [[3, 6, 96, 23]],
    beschreibung: 'Geschmückt für eine Hochzeit, die nie stattfand. Eine Tür führt zur Gruft, eine zum Turm.',
    o: {
      t: { t: 'tuer', ziel: 'brunnenplatz:t', label: 'Hinaus' },
      B: { t: 'deko', art: 'bank' }, C: { t: 'deko', art: 'bank' }, D: { t: 'deko', art: 'bank' }, E: { t: 'deko', art: 'bank' }, F: { t: 'deko', art: 'bank' },
      1: { t: 'feind', g: 'jungfer', gruppe: 'j', blick: -1 },
      2: { t: 'feind', g: 'jungfer', gruppe: 'j', blick: -1 },
      f: { t: 'deko', art: 'fenster', hoehe: 8 },
      Y: { t: 'deko', art: 'fenster', hoehe: 12 },
      Z: { t: 'deko', art: 'fenster', hoehe: 12 },
      c: { t: 'truhe', id: 'truhe_empore', gibt: { item: 'glockenerz', glut: 500 } },
      3: { t: 'feind', g: 'kultist', blick: -1 },
      g: { t: 'schrift', art: 'buch', lore: 'gaestebuch' },
      w: { t: 'feind', g: 'waechter', blick: -1, sicht: 9 },
      p: { t: 'leiche', id: 'priester', gibt: { item: 'gruftschluessel' }, text: 'Ein Priester in einem Gewand, das einmal weiß war. An seinem Gürtel hängt ein kleiner Schlüssel mit einer Glocke als Bart.' },
      b: { t: 'schrift', art: 'buch', lore: 'brief_isolde' },
      A: { t: 'deko', art: 'altar' },
      z: { t: 'untersuchen', id: 'glockenzunge', label: 'Unter der Altarglocke nachsehen', gibt: { tal: 'glockenzunge' }, text: 'Die Glocke über dem Altar hat keinen Klöppel mehr. Er liegt darunter, als hätte ihn jemand herausgerissen, damit sie nie wieder läutet. Du nimmst ihn mit.' },
      k: { t: 'deko', art: 'kerzen' },
      K: { t: 'deko', art: 'kerzen' },
      d: { t: 'tuer', ziel: 'gruft:t', zu: 'gruftschluessel', label: 'Zur Gruft hinab', zuText: 'Eine schwere Tür mit einem kleinen Schloss. Der Bart des Schlüssels müsste wie eine Glocke aussehen.', aufText: 'Der kleine Schlüssel passt. Die Tür zur Gruft schwingt auf.' },
      u: { t: 'tuer', ziel: 'turmtreppe:t', label: 'Zum Glockenturm' }
    }
  },
  gruft: {
    name: 'Gruft', region: 'velmora', thema: 'gruft', horizont: 10 * T, staerke: 1.5, musik: 'hoehle',
    kartenPos: [7, 3, 2, 1], hinten: [[3, 5, 56, 14]],
    beschreibung: 'Unter der Kapelle liegen die, die auf die Hochzeit warteten.',
    o: {
      t: { t: 'tuer', ziel: 'kapelle:d', label: 'Hinaufsteigen' },
      S: { t: 'deko', art: 'sarg' }, T: { t: 'deko', art: 'sarg' }, U: { t: 'deko', art: 'sarg' },
      1: { t: 'feind', g: 'jungfer', liegt: true, gruppe: 'gr', blick: -1 },
      2: { t: 'feind', g: 'jungfer', liegt: true, gruppe: 'gr', blick: -1 },
      k: { t: 'deko', art: 'kerzen' },
      b: { t: 'schrift', art: 'bild', lore: 'portrait_gruft' },
      c: { t: 'truhe', id: 'truhe_gruft', gibt: { item: ['glockenerz', 2] } },
      L: { t: 'licht', r: 100, farbe: 'rgba(255,200,140,.8)', a: .25, hoehe: 1 }
    }
  },
  turmtreppe: {
    name: 'Turmtreppe', region: 'velmora', thema: 'turm', horizont: 40 * T, staerke: 1.5, musik: 'turm', betreten: 'turm_ankunft',
    kartenPos: [10, 1, 1, 3], hinten: [[4, 3, 31, 67]],
    beschreibung: 'Dreihundert Stufen, eine für jedes Jahr. Oben hängt die Glocke.',
    o: {
      t: { t: 'tuer', ziel: 'kapelle:u', label: 'Hinaus' },
      i: { t: 'schrift', art: 'grab', lore: 'treppe_inschrift' },
      f: { t: 'feuer', id: 'feuer_treppe', name: 'Leuchtfeuer an der Turmtreppe' },
      n: { t: 'npc', id: 'enna', blick: -1, wenn: D => D.merker.velmora && !D.merker.enna_ende },
      k: { t: 'npc', id: 'kalden', blick: -1, wenn: D => D.merker.kalden1 && !D.merker.kalden2 && !D.bosse.isolde },
      1: { t: 'feind', g: 'jungfer', patrouille: [3, 3], blick: -1 },
      F: { t: 'deko', art: 'fenster', hoehe: 9 },
      2: { t: 'feind', g: 'jungfer', gruppe: 't3', blick: 1 },
      3: { t: 'feind', g: 'ertrunkener', gruppe: 't3', blick: 1 },
      4: { t: 'feind', g: 'waechter', blick: 1, sicht: 9 },
      G: { t: 'deko', art: 'fenster', hoehe: 9 },
      5: { t: 'feind', g: 'jungfer', lauert: 3, von: 'oben', blick: -1 },
      c: { t: 'truhe', id: 'truhe_treppe', gibt: { item: 'glockenerz', glut: 600 } },
      o: { t: 'tuer', ziel: 'glockenturm:t', label: 'Hinauf zur Glocke' }
    }
  },
  glockenturm: {
    name: 'Glockenturm', region: 'velmora', thema: 'turmspitze', horizont: 18 * T + 60, staerke: 1.5, musik: 'turm',
    kartenPos: [9, 0, 3, 1],
    hinten: [[0, 4, 1, 17], [20, 4, 21, 17], [42, 4, 43, 17], [62, 4, 63, 17]],
    beschreibung: 'Oben im Turm, unter der großen Glocke. Weit draußen steigt das Meer.',
    o: {
      t: { t: 'tuer', ziel: 'turmtreppe:o', label: 'Hinab' },
      a: { t: 'eingang', richtung: 1 },
      k: { t: 'npc', id: 'kalden', blick: 1, wenn: D => D.bosse.isolde && !D.merker.kalden_turm },
      g: { t: 'nebeltor', boss: 'isolde', seite: 1 },
      b: { t: 'deko', art: 'glocke', hoehe: 13.5, breite: 190 },
      x: { t: 'boss', boss: 'isolde', blick: -1, beute: { item: [['splitter_isolde', 1], ['nachhall_isolde', 1]] } }
    }
  }
};
for (const k in GEBIETE) GEBIETE[k].karte = KARTEN_BILD[k];
