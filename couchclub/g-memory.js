/* Couchclub — Memory */
(() => {
  'use strict';
  const PAL = ['coral', 'blue', 'saffron', 'teal', 'plum', 'rose'];
  const GLYPHS = [
    '<circle cx="24" cy="24" r="14"/>',
    '<rect x="11" y="11" width="26" height="26" rx="4"/>',
    '<path d="M24 8L41 38H7z"/>',
    '<path d="M24 6l18 18-18 18L6 24z"/>',
    '<circle cx="24" cy="24" r="12" fill="none" stroke="currentColor" stroke-width="7"/>',
    '<path d="M19 7h10v12h12v10H29v12H19V29H7V19h12z"/>',
    '<path d="M19 7h10v12h12v10H29v12H19V29H7V19h12z" transform="rotate(45 24 24)"/>',
    '<path d="M24 5l5.6 11.6 12.7 1.7-9.3 8.8 2.4 12.6L24 33.6l-11.4 6.1 2.4-12.6-9.3-8.8 12.7-1.7z"/>',
    '<path d="M24 6l16 9v18l-16 9-16-9V15z"/>',
    '<path d="M7 30a17 17 0 0 1 34 0z"/>',
    '<path d="M24 41S7 31 7 18.5A9 9 0 0 1 24 14a9 9 0 0 1 17 4.5C41 31 24 41 24 41z"/>',
    '<path d="M24 5s-13 16-13 25a13 13 0 0 0 26 0C37 21 24 5 24 5z"/>',
    '<path d="M28 4L10 27h12l-4 17 20-24H26z"/>',
    '<path d="M31 7a17 17 0 1 0 11 28A14 14 0 0 1 31 7z"/>',
    '<circle cx="11" cy="24" r="5.5"/><circle cx="24" cy="24" r="5.5"/><circle cx="37" cy="24" r="5.5"/>',
    '<rect x="8" y="9" width="32" height="7" rx="3.5"/><rect x="8" y="20.5" width="32" height="7" rx="3.5"/><rect x="8" y="32" width="32" height="7" rx="3.5"/>',
    '<path d="M24 6l16 17h-10v19H18V23H8z"/>',
    '<circle cx="16.5" cy="16.5" r="8"/><circle cx="31.5" cy="16.5" r="8"/><circle cx="16.5" cy="31.5" r="8"/><circle cx="31.5" cy="31.5" r="8"/>',
  ];
  const glyph = (k) => `<svg viewBox="0 0 48 48" aria-hidden="true" style="color:var(--p-${PAL[k % PAL.length]})" fill="currentColor">${GLYPHS[k]}</svg>`;

  CC.css(`
    .mm { display: grid; gap: var(--gap); perspective: 1200px; }
    .mm-card { position: relative; width: var(--s); height: var(--s); border-radius: clamp(8px, calc(var(--s) * .16), 16px); }
    .mm-inner {
      position: absolute; inset: 0; border-radius: inherit;
      transform-style: preserve-3d; -webkit-transform-style: preserve-3d;
      transition: transform .38s cubic-bezier(.3, .7, .3, 1);
    }
    .mm-card.up .mm-inner { transform: rotateY(180deg); }
    .mm-back, .mm-face {
      position: absolute; inset: 0; border-radius: inherit;
      backface-visibility: hidden; -webkit-backface-visibility: hidden;
      display: grid; place-items: center;
    }
    .mm-back {
      background: repeating-linear-gradient(135deg, rgba(255, 255, 255, .05) 0 5px, transparent 5px 11px), var(--board);
      box-shadow: var(--lift), inset 0 0 0 1px rgba(255, 255, 255, .06);
    }
    .mm-back::after {
      content: ""; width: 26%; aspect-ratio: 1; border-radius: 30%;
      box-shadow: inset 0 0 0 2px rgba(255, 255, 255, .16);
    }
    .mm-card:hover:not(.up) .mm-back { box-shadow: var(--lift), inset 0 0 0 2px var(--turn, rgba(255, 255, 255, .25)); }
    .mm-face { transform: rotateY(180deg); background: var(--surface); box-shadow: var(--lift); }
    .mm-face svg { width: 58%; height: 58%; }
    .mm-card.done .mm-face { box-shadow: inset 0 0 0 3px var(--oc); background: color-mix(in srgb, var(--oc) 12%, var(--surface)); }
    .mm-card.done { animation: mmmatch .45s ease-out; }
    .mm-card.done.old .mm-face { opacity: .55; }
    @keyframes mmmatch { 40% { transform: scale(1.07); } }
    .mm.still .mm-inner { transition: none; }
    .mm.still .mm-back { backface-visibility: visible; }
    .mm.still .mm-card.up .mm-back { visibility: hidden; }
  `);

  function thumb() {
    return `<svg viewBox="0 0 60 60" aria-hidden="true">
      <rect x="6" y="6" width="22" height="22" rx="5" fill="var(--board)"/>
      <rect x="32" y="6" width="22" height="22" rx="5" fill="var(--surface)"/>
      <path d="M43 10.5l7.5 7.5-7.5 7.5-7.5-7.5z" fill="var(--p-teal)"/>
      <rect x="6" y="32" width="22" height="22" rx="5" fill="var(--surface)"/>
      <path d="M17 36.5l7.5 7.5-7.5 7.5-7.5-7.5z" fill="var(--p-teal)"/>
      <rect x="32" y="32" width="22" height="22" rx="5" fill="var(--board)"/>
    </svg>`;
  }

  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const rnd = (a) => a[(Math.random() * a.length) | 0];
  const clock = (ms) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

  function create(root, api) {
    const P = api.players;
    const solo = api.mode === 'solo';
    const n = api.opts.cards || 16;
    const pairs = n / 2;
    const symbols = shuffle([...Array(GLYPHS.length).keys()]).slice(0, pairs);
    const deck = shuffle(symbols.flatMap((k) => [k, k]));
    const matched = new Int8Array(n);
    const mem = new Map();
    const retain = [0, 0.3, 0.65, 0.95];
    const score = [0, 0];
    let up = [], cur = 0, busy = false, over = false, moves = 0, t0 = 0;

    root.innerHTML = `<div class="mm ${api.motion ? '' : 'still'}" style="--c0:var(--p-${P[0].color});${P[1] ? `--c1:var(--p-${P[1].color})` : ''}">
      ${deck.map((k, i) => `<button class="mm-card" data-i="${i}" aria-label="Karte ${i + 1}, verdeckt"><span class="mm-inner"><span class="mm-back"></span><span class="mm-face">${glyph(k)}</span></span></button>`).join('')}
    </div>`;
    const grid = root.firstElementChild;
    const cards = [...grid.children];

    function layout() {
      const w = root.clientWidth, h = root.clientHeight;
      if (!w || !h) return;
      const gap = w < 500 ? 8 : 12;
      let best = { s: 0, c: 4 };
      for (let c = 2; c <= n; c++) {
        if (n % c) continue;
        const r = n / c;
        const s = Math.min((w - gap * (c - 1)) / c, (h - gap * (r - 1)) / r, 150);
        if (s > best.s) best = { s, c };
      }
      grid.style.setProperty('--gap', gap + 'px');
      grid.style.setProperty('--s', Math.floor(best.s) + 'px');
      grid.style.gridTemplateColumns = `repeat(${best.c}, var(--s))`;
    }
    const ro = new ResizeObserver(layout);
    ro.observe(root);
    layout();

    function remember(i) {
      const ai = P.find((p) => p.ai);
      if (ai && Math.random() < retain[ai.level]) mem.set(i, deck[i]);
    }

    function reveal(i) {
      const el = cards[i];
      el.classList.add('up');
      el.setAttribute('aria-label', `Karte ${i + 1}, aufgedeckt`);
      up.push(i);
      remember(i);
      api.sfx('flip');
      if (!t0) t0 = performance.now();
      if (up.length < 2) return;
      busy = true;
      moves++;
      const [a, b] = up;
      if (solo) api.score(0, moves, 'Züge');
      if (deck[a] === deck[b]) {
        api.later(() => {
          const owner = solo ? 'var(--velvet)' : `var(--c${cur})`;
          [a, b].forEach((k) => {
            matched[k] = cur + 1;
            mem.delete(k);
            cards[k].classList.add('done');
            cards[k].style.setProperty('--oc', owner);
            cards[k].setAttribute('aria-label', `Karte ${k + 1}, Paar gefunden`);
          });
          up = [];
          api.sfx('point');
          api.buzz([15, 30, 15]);
          if (!solo) { score[cur]++; api.score(cur, score[cur]); }
          busy = false;
          if (matched.every((x) => x)) return end();
          next(true);
        }, 420);
      } else {
        api.later(() => {
          [a, b].forEach((k) => { cards[k].classList.remove('up'); cards[k].setAttribute('aria-label', `Karte ${k + 1}, verdeckt`); });
          up = [];
          busy = false;
          if (!solo) cur = 1 - cur;
          next(false);
        }, 1000);
      }
    }

    function end() {
      over = true;
      if (solo) {
        const ms = performance.now() - t0;
        api.status(`Alle Paare in ${moves} Zügen.`);
        api.finish({ winner: 0, detail: `${pairs} Paare in ${moves} Zügen · ${clock(ms)} Min.`, best: { key: `m${n}`, value: moves } });
        return;
      }
      const w = score[0] === score[1] ? null : score[0] > score[1] ? 0 : 1;
      api.status('Alle Paare sind gefunden.');
      api.finish({ winner: w, detail: w == null ? `Gleichstand: ${score[0]} zu ${score[1]} Paare.` : `${Math.max(...score)} zu ${Math.min(...score)} Paare.` });
    }

    function aiTurn(level) {
      const open = (i) => !matched[i];
      const bySym = new Map();
      for (const [i, s] of mem) if (open(i)) bySym.set(s, [...(bySym.get(s) || []), i]);
      const known = [...bySym.values()].find((l) => l.length >= 2);
      const unknownFrom = (except) => {
        const u = cards.map((_, i) => i).filter((i) => open(i) && !mem.has(i) && i !== except);
        return u.length ? u : cards.map((_, i) => i).filter((i) => open(i) && i !== except);
      };
      const first = known ? known[0] : rnd(unknownFrom(-1));
      api.later(() => {
        if (over) return;
        reveal(first);
        api.later(() => {
          if (over) return;
          let second = known ? known[1] : null;
          if (second == null) {
            const hit = [...mem].find(([i, s]) => i !== first && open(i) && s === deck[first]);
            second = hit ? hit[0] : rnd(unknownFrom(first));
          }
          reveal(second);
        }, 650);
      }, 520);
    }

    function next(again) {
      const p = P[cur];
      grid.style.setProperty('--turn', `var(--c${cur})`);
      if (solo) return;
      api.turn(cur);
      if (p.ai) {
        busy = true;
        api.status(again ? 'Paar! Die KI ist nochmal dran.' : 'Die KI ist dran …');
        aiTurn(p.level);
      } else {
        api.status(again ? `Paar! ${p.name} ist nochmal dran.` : `${p.name} ist am Zug`);
      }
    }

    function tick() {
      if (over) return;
      api.status(t0 ? `${moves} Züge · ${clock(performance.now() - t0)}` : 'Deck zwei Karten auf. Die Zeit startet mit der ersten Karte.');
      api.later(tick, 1000);
    }

    grid.addEventListener('click', (e) => {
      const el = e.target.closest('.mm-card');
      if (!el || over || busy || P[cur].ai) return;
      const i = +el.dataset.i;
      if (matched[i] || up.includes(i)) return;
      reveal(i);
    });

    if (solo) { api.score(0, 0, 'Züge'); tick(); }
    else { api.score(0, 0); api.score(1, 0); }
    next(false);
    return { destroy() { over = true; ro.disconnect(); } };
  }

  CC.register({
    id: 'memory',
    name: 'Memory',
    tagline: 'Merk dir, wo was liegt.',
    color: 'teal',
    minutes: '3–10',
    modes: ['ai', 'duo', 'solo'],
    options: [{ id: 'cards', label: 'Karten', default: 16, choices: [{ v: 16, l: '16' }, { v: 24, l: '24' }, { v: 36, l: '36' }] }],
    optionLabel: (o) => `${o.cards} Karten`,
    thumb: thumb(),
    rules: [
      'Deckt pro Zug zwei Karten auf. Gleiche Symbole sind ein Paar.',
      'Wer ein Paar findet, behält es und ist nochmal dran.',
      'Alleine zählt jeder Zug. Weniger Züge sind ein neuer Rekord.',
    ],
    create,
  });
})();
