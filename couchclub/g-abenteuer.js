/* Couchclub — Solo-Abenteuer: Kerker-Wischer, Lichtläufer und Mondgeläut
   Kerker-Wischer und Lichtläufer liegen fertig gebaut in spiele.html (aus spiel/ im Repo),
   Mondgeläut in mond.html (aus mond/). Alle laufen im Vollbild-Rahmen, jeder Spieler hat
   dort seinen eigenen Spielstand. */
(() => {
  'use strict';
  const num = (n) => Math.floor(n).toLocaleString('de-DE');
  const runs = (n) => `${num(n)} ${n === 1 ? 'Lauf' : 'Läufe'}`;
  const dauer = (min) => (min >= 60 ? `${Math.floor(min / 60)} Std. ${min % 60} Min.` : `${min} Min.`);

  function kerkerThumb() {
    const pos = (i) => [4 + (i % 3) * 18, 4 + ((i / 3) | 0) * 18];
    const card = (i, fill = 'var(--surface)') => { const [x, y] = pos(i); return `<rect x="${x}" y="${y}" width="16" height="16" rx="3.5" fill="${fill}"/>`; };
    let s = '<svg viewBox="0 0 60 60" aria-hidden="true">';
    for (let i = 0; i < 9; i++) s += card(i, i === 4 ? 'var(--p-plum)' : 'var(--surface)');
    // Schädel oben links und unten rechts
    [0, 8].forEach((i) => {
      const [x, y] = pos(i);
      s += `<circle cx="${x + 8}" cy="${y + 7.4}" r="4.6" fill="var(--p-coral)"/><rect x="${x + 5.6}" y="${y + 9.6}" width="4.8" height="3.6" rx="1" fill="var(--p-coral)"/>`
        + `<circle cx="${x + 6.3}" cy="${y + 7.4}" r="1.3" fill="var(--board)"/><circle cx="${x + 9.7}" cy="${y + 7.4}" r="1.3" fill="var(--board)"/>`;
    });
    // Gold oben rechts und unten in der Mitte
    [2, 7].forEach((i) => {
      const [x, y] = pos(i);
      s += `<circle cx="${x + 8}" cy="${y + 8}" r="4.6" fill="var(--p-saffron)"/><circle cx="${x + 8}" cy="${y + 8}" r="2.4" fill="none" stroke="var(--surface)" stroke-width="1"/>`;
    });
    s += '<path d="M26 17h3v-3h3v-3h3v-3h3" fill="none" stroke="var(--ink-3)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>';   // Treppe
    s += '<path d="M9 35l8-8M10.6 30.6l3.8 3.8" stroke="var(--ink-2)" stroke-width="1.9" stroke-linecap="round"/>';                                   // Schwert
    s += '<circle cx="30" cy="27.4" r="2.9" fill="#fff"/><path d="M25.4 35.6c.4-3.2 2.2-4.8 4.6-4.8s4.2 1.6 4.6 4.8z" fill="#fff"/>';              // Held
    s += '<path d="M48 35.4s-5-2.9-5-6.4a2.6 2.6 0 0 1 5-1.1 2.6 2.6 0 0 1 5 1.1c0 3.5-5 6.4-5 6.4z" fill="var(--p-rose)"/>';                        // Herz
    s += '<path d="M10.6 43.6h2.8v3.2l2.6 4a2.4 2.4 0 0 1-2 3.6h-4a2.4 2.4 0 0 1-2-3.6l2.6-4z" fill="var(--p-teal)"/>';                              // Trank
    return s + '</svg>';
  }

  function lichtThumb() {
    return `<svg viewBox="0 0 60 60" aria-hidden="true">
      <rect width="60" height="60" rx="9" fill="var(--board)"/>
      <rect x="6" y="14" width="20" height="4" rx="2" fill="var(--p-coral)"/>
      <rect x="36" y="14" width="18" height="4" rx="2" fill="var(--p-coral)"/>
      <g transform="rotate(-20 38 36)"><rect x="27" y="34" width="22" height="3.6" rx="1.8" fill="var(--p-blue)"/></g>
      <circle cx="16" cy="32" r="1.6" fill="var(--p-saffron)"/><circle cx="21" cy="24" r="1.6" fill="var(--p-saffron)"/>
      <path d="M30 58c-3-6-10-10-9-18s8-12 9-22" fill="none" stroke="var(--p-rose)" stroke-width="3" stroke-linecap="round" opacity=".45"/>
      <circle cx="30" cy="20" r="5.5" fill="var(--p-rose)" opacity=".35"/>
      <circle cx="30" cy="20" r="3.2" fill="#fff"/>
    </svg>`;
  }

  function mondThumb() {
    return `<svg viewBox="0 0 60 60" aria-hidden="true">
      <rect width="60" height="60" rx="9" fill="var(--board)"/>
      <path d="M9 17a25 25 0 0 1 42 0" fill="none" stroke="var(--ink-3)" stroke-width="1.4" stroke-linecap="round"/>
      <rect x="28.7" y="12.5" width="2.6" height="4.5" rx="1.1" fill="var(--p-teal)"/>
      <path d="M30 16.5c-5.2 0-7.4 4-7.4 9.2v5.6c0 2.2-2 4.2-4.2 5.2h23.2c-2.2-1-4.2-3-4.2-5.2v-5.6c0-5.2-2.2-9.2-7.4-9.2z" fill="var(--p-teal)"/>
      <circle cx="30" cy="39.6" r="2.3" fill="var(--p-teal)"/>
      <circle cx="46.5" cy="28" r="2.1" fill="var(--p-saffron)"/>
      <path d="M6 48.5c4 0 4-2.6 8-2.6s4 2.6 8 2.6 4-2.6 8-2.6 4 2.6 8 2.6 4-2.6 8-2.6 4 2.6 8 2.6" fill="none" stroke="var(--p-blue)" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`;
  }

  CC.register({
    id: 'mond',
    name: 'Mondgeläut',
    tagline: 'Düsteres Abenteuer mit Bossen und Reaktionskampf.',
    color: 'teal',
    minutes: '20–60',
    modes: ['solo'],
    frame: { src: 'mond.html', g: 'mond', bg: '#0A0D12' },
    thumb: mondThumb(),
    rules: [
      'Die Flut hat dich an einen fremden Strand gespült. Wähle deine Herkunft und finde heraus, warum nur du die Glocke hörst.',
      'Im Kampf zählt der Moment: ausweichen, blocken oder parieren. Ein Aufblitzen an der Waffe verrät jeden Angriff.',
      'Akt I mit Leuchtfeuern, Glut, Waffen, Talismanen und vier Bossen. Jeder Spieler hat seinen eigenen Spielstand.',
    ],
    statText(x) {
      const parts = [];
      if (x.akt) parts.push('Akt I geschafft');
      parts.push(`Stufe ${num(x.lvl || 1)}`, `${num(x.bosse || 0)} von 4 Bossen`);
      if (x.min) parts.push(dauer(x.min));
      return parts.join(' · ');
    },
  });

  CC.register({
    id: 'kerker',
    name: 'Kerker-Wischer',
    tagline: 'Roguelike auf neun Feldern. Jeder Zug zählt.',
    color: 'plum',
    minutes: '20–40',
    modes: ['solo'],
    frame: { src: 'spiele.html', g: 'kerker', bg: '#EDE6D6' },
    thumb: kerkerThumb(),
    rules: [
      'Wische deinen Helden über neun Karten. Monster kosten Leben, eine Waffe fängt den Schaden ab.',
      'Auf der Karte wählst du deinen Weg: Kämpfe, Elite-Gegner, Händler, Schätze und Rastplätze.',
      'Fünf Welten mit Bossen, sechs Helden, Relikte, Talente und Aufstiegsstufen.',
    ],
    statText(x) {
      const parts = [runs(x.runs || 0)];
      if (x.wins) parts.push(`${num(x.wins)} ${x.wins === 1 ? 'Sieg' : 'Siege'}`);
      if (x.world) parts.push(`beste Welt ${x.world}`);
      if (x.asc) parts.push(`Aufstieg ${x.asc}`);
      return parts.join(' · ');
    },
  });

  CC.register({
    id: 'licht',
    name: 'Lichtläufer',
    tagline: 'Ein Finger, ein Licht, immer schneller.',
    color: 'rose',
    minutes: '2–5',
    modes: ['solo'],
    frame: { src: 'spiele.html', g: 'licht', bg: '#EDE6D6' },
    thumb: lichtThumb(),
    rules: [
      'Zieh dein Licht nach links und rechts, vorbei an Lasern, Rotoren und Minen.',
      'Funken in Folge treiben den Multiplikator hoch und laden die Überladung.',
      'Mit Funken kaufst du Upgrades und Skins. Missionen bringen neue Ränge.',
    ],
    statText(x) {
      const parts = [runs(x.runs || 0)];
      if (x.best) parts.push(`Rekord ${num(x.best)}`);
      if (x.rank) parts.push(`Rang ${x.rank}`);
      return parts.join(' · ');
    },
  });
})();
