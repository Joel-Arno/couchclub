/* Couchclub — Sudoku */
(() => {
  'use strict';
  const ROW = [], COL = [], BOX = [], PEERS = [];
  for (let i = 0; i < 81; i++) { ROW[i] = (i / 9) | 0; COL[i] = i % 9; BOX[i] = ((ROW[i] / 3) | 0) * 3 + ((COL[i] / 3) | 0); }
  for (let i = 0; i < 81; i++) {
    const s = new Set();
    for (let j = 0; j < 81; j++) if (j !== i && (ROW[j] === ROW[i] || COL[j] === COL[i] || BOX[j] === BOX[i])) s.add(j);
    PEERS[i] = [...s];
  }
  const LEVELS = {
    leicht: { clues: 38, label: 'Leicht' },
    mittel: { clues: 30, label: 'Mittel' },
    schwer: { clues: 24, label: 'Schwer' },
  };
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const bit = (d) => 1 << d;
  const popc = (m) => { let n = 0; while (m) { m &= m - 1; n++; } return n; };

  /* Löser mit Bitmasken: zählt Lösungen bis limit */
  function solve(g, limit = 2, out = null) {
    const rows = new Int32Array(9), cols = new Int32Array(9), boxes = new Int32Array(9);
    for (let i = 0; i < 81; i++) if (g[i]) { const b = bit(g[i]); rows[ROW[i]] |= b; cols[COL[i]] |= b; boxes[BOX[i]] |= b; }
    const a = Int8Array.from(g);
    let count = 0;
    function rec() {
      let best = -1, bestMask = 0, bestN = 10;
      for (let i = 0; i < 81; i++) {
        if (a[i]) continue;
        const m = ~(rows[ROW[i]] | cols[COL[i]] | boxes[BOX[i]]) & 0x3fe;
        const n = popc(m);
        if (n < bestN) { bestN = n; best = i; bestMask = m; if (n <= 1) break; }
      }
      if (best < 0) { count++; if (out && count === 1) out.set(a); return count >= limit; }
      if (!bestN) return false;
      for (let d = 1; d <= 9; d++) {
        if (!(bestMask & bit(d))) continue;
        const b = bit(d);
        a[best] = d; rows[ROW[best]] |= b; cols[COL[best]] |= b; boxes[BOX[best]] |= b;
        const stop = rec();
        a[best] = 0; rows[ROW[best]] &= ~b; cols[COL[best]] &= ~b; boxes[BOX[best]] &= ~b;
        if (stop) return true;
      }
      return false;
    }
    rec();
    return count;
  }
  function fullGrid() {
    const g = new Int8Array(81);
    const rec = (i) => {
      if (i === 81) return true;
      const used = new Set(PEERS[i].map((j) => g[j]));
      for (const d of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
        if (used.has(d)) continue;
        g[i] = d;
        if (rec(i + 1)) return true;
      }
      g[i] = 0;
      return false;
    };
    rec(0);
    return g;
  }
  /* Nur mit „einzige Möglichkeit“ lösbar? (für Leicht) */
  function singlesOnly(g) {
    const a = Int8Array.from(g);
    for (let changed = true; changed;) {
      changed = false;
      for (let i = 0; i < 81; i++) {
        if (a[i]) continue;
        const used = new Set(PEERS[i].map((j) => a[j]));
        const c = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => !used.has(d));
        if (c.length === 1) { a[i] = c[0]; changed = true; }
      }
    }
    return a.every((x) => x);
  }
  function makePuzzle(level) {
    const target = LEVELS[level].clues;
    for (let attempt = 0; attempt < 6; attempt++) {
      const sol = fullGrid();
      const g = Int8Array.from(sol);
      let clues = 81;
      for (const i of shuffle([...Array(81).keys()])) {
        if (clues <= target) break;
        const v = g[i];
        g[i] = 0;
        if (solve(g, 2) !== 1 || (level === 'leicht' && !singlesOnly(g))) g[i] = v;
        else clues--;
      }
      if (clues <= target + 3 || attempt === 5) return { puzzle: g, solution: sol };
    }
  }

  CC.css(`
    .sd { width: min(100cqw, 100cqh - 150px, 560px); max-width: 100%; display: grid; gap: 10px; }
    .sd-grid { aspect-ratio: 1; display: grid; grid-template-columns: repeat(9, minmax(0, 1fr)); grid-template-rows: repeat(9, minmax(0, 1fr)); background: var(--ink); gap: 1px; padding: 2px; border-radius: 10px; overflow: hidden; box-shadow: var(--lift); }
    .sd-c { position: relative; background: var(--surface); display: grid; place-items: center; font: 650 clamp(15px, 5.2cqw, 28px)/1 var(--font-body); color: var(--velvet); font-variant-numeric: tabular-nums; }
    .sd-c.given { color: var(--ink); font-weight: 760; }
    .sd-c:nth-child(9n+3), .sd-c:nth-child(9n+6) { margin-right: 2px; }
    .sd-c:nth-child(n+19):nth-child(-n+27), .sd-c:nth-child(n+46):nth-child(-n+54) { margin-bottom: 2px; }
    .sd-c.zone { background: color-mix(in srgb, var(--velvet) 8%, var(--surface)); }
    .sd-c.same { background: color-mix(in srgb, var(--velvet) 22%, var(--surface)); }
    .sd-c.sel { background: color-mix(in srgb, var(--velvet) 34%, var(--surface)); }
    .sd-c.bad { color: var(--p-coral); }
    .sd-c.clash::after { content: ""; position: absolute; inset: 0; box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--p-coral) 60%, transparent); }
    .sd-c.pop { animation: sdpop .3s ease-out; }
    @keyframes sdpop { 50% { transform: scale(1.15); } }
    .sd-notes { position: absolute; inset: 6%; display: grid; grid-template: repeat(3, 1fr) / repeat(3, 1fr); font: 600 clamp(7px, 1.9cqw, 11px)/1 var(--font-body); color: var(--ink-2); }
    .sd-notes span { display: grid; place-items: center; }
    .sd-pad { display: grid; grid-template-columns: repeat(9, 1fr); gap: 5px; }
    .sd-pad button { min-height: 48px; border-radius: 10px; background: var(--surface); box-shadow: var(--lift); font: 700 clamp(18px, 5cqw, 24px)/1 var(--font-body); display: grid; place-items: center; gap: 1px; padding: 4px 0; }
    .sd-pad button small { font-size: 10px; color: var(--ink-3); font-weight: 600; }
    .sd-pad button:disabled { opacity: .3; }
    .sd-tools { display: flex; gap: 6px; justify-content: center; }
    .sd-tools .btn { flex: 1; padding: 0 8px; }
    .sd-tools .btn[aria-pressed="true"] { background: var(--ink); color: var(--ground); }
  `);

  function thumb() {
    const nums = { 0: 5, 4: 3, 8: 7, 10: 1, 12: 9, 20: 6, 22: 4, 24: 8, 29: 2, 32: 5, 34: 1 };
    let s = '<svg viewBox="0 0 60 60" aria-hidden="true"><rect x="6" y="6" width="48" height="48" rx="6" fill="var(--surface)" stroke="var(--ink)" stroke-width="2"/>';
    s += '<path d="M22 6v48M38 6v48M6 22h48M6 38h48" stroke="var(--ink)" stroke-width="1.6"/>';
    s += '<path d="M11.3 6v48M16.6 6v48M27.3 6v48M32.6 6v48M43.3 6v48M48.6 6v48M6 11.3h48M6 16.6h48M6 27.3h48M6 32.6h48M6 43.3h48M6 48.6h48" stroke="var(--ink-3)" stroke-width=".5" opacity=".7"/>';
    Object.entries(nums).forEach(([i, d]) => { i = +i; const x = 6 + (i % 6) * 8 + 4 + (i % 6 > 1 ? 1 : 0), y = 6 + ((i / 6) | 0) * 8 + 5.6; s += `<text x="${x}" y="${y}" font-size="6.5" font-weight="700" text-anchor="middle" fill="${i % 3 ? 'var(--ink)' : 'var(--velvet)'}" font-family="sans-serif">${d}</text>`; });
    return s + '</svg>';
  }
  const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  function create(root, api) {
    const level = api.opts.level || 'mittel';
    const showErr = api.opts.errors !== false;
    const { puzzle, solution } = makePuzzle(level);
    const given = Int8Array.from(puzzle);
    const val = Int8Array.from(puzzle);
    const notes = new Int16Array(81);
    const history = [];
    let sel = -1, noteMode = false, over = false, t0 = performance.now(), mistakes = 0, hints = 0;

    root.innerHTML = `<div class="sd">
      <div class="sd-grid">${Array.from({ length: 81 }, (_, i) => `<button class="sd-c" data-i="${i}" aria-label="Zeile ${ROW[i] + 1}, Spalte ${COL[i] + 1}"></button>`).join('')}</div>
      <div class="sd-tools">
        <button class="btn small ghost" data-sd="notes" aria-pressed="false">Notizen</button>
        <button class="btn small ghost" data-sd="erase">Löschen</button>
        <button class="btn small ghost" data-sd="undo">Zurück</button>
        <button class="btn small ghost" data-sd="hint">Tipp</button>
      </div>
      <div class="sd-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<button data-d="${d}">${d}<small></small></button>`).join('')}</div>
    </div>`;
    const wrap = root.firstElementChild;
    const cells = [...wrap.querySelectorAll('.sd-c')];
    const pad = [...wrap.querySelectorAll('[data-d]')];
    const bNotes = wrap.querySelector('[data-sd="notes"]');

    function paint(pop = -1) {
      const sv = sel >= 0 ? val[sel] : 0;
      for (let i = 0; i < 81; i++) {
        const el = cells[i], v = val[i];
        if (v) el.textContent = v;
        else if (notes[i]) el.innerHTML = `<span class="sd-notes">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<span>${notes[i] & bit(d) ? d : ''}</span>`).join('')}</span>`;
        else el.textContent = '';
        el.classList.toggle('given', !!given[i]);
        el.classList.toggle('sel', i === sel);
        el.classList.toggle('zone', sel >= 0 && i !== sel && (ROW[i] === ROW[sel] || COL[i] === COL[sel] || BOX[i] === BOX[sel]));
        el.classList.toggle('same', !!sv && v === sv && i !== sel);
        el.classList.toggle('bad', showErr && !!v && !given[i] && v !== solution[i]);
        el.classList.toggle('clash', !!v && PEERS[i].some((j) => val[j] === v));
        if (i === pop) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
      }
      const cnt = new Array(10).fill(0);
      for (let i = 0; i < 81; i++) if (val[i] && val[i] === solution[i]) cnt[val[i]]++;
      pad.forEach((b, k) => { const left = 9 - cnt[k + 1]; b.querySelector('small').textContent = left || ''; b.disabled = !left; });
      bNotes.setAttribute('aria-pressed', String(noteMode));
    }

    function setVal(i, d) {
      if (given[i] || over) return;
      history.push({ i, v: val[i], n: notes[i] });
      if (noteMode && d) {
        if (val[i]) return;
        notes[i] ^= bit(d);
        api.sfx('tap');
        paint();
        return;
      }
      val[i] = val[i] === d ? 0 : d;
      notes[i] = 0;
      if (d && val[i]) {
        PEERS[i].forEach((j) => { if (notes[j] & bit(d)) notes[j] &= ~bit(d); });
        if (d !== solution[i]) { mistakes++; api.sfx('miss'); api.buzz(40); } else { api.sfx('place'); api.buzz(8); }
      }
      paint(i);
      check();
    }
    function check() {
      for (let i = 0; i < 81; i++) if (val[i] !== solution[i]) return;
      over = true;
      sel = -1;
      paint();
      const secs = Math.round((performance.now() - t0) / 1000);
      api.status(`Gelöst in ${clock(secs)}`);
      const extra = [mistakes ? `${mistakes} ${mistakes === 1 ? 'Fehler' : 'Fehler'}` : 'ohne Fehler', hints ? `${hints} ${hints === 1 ? 'Tipp' : 'Tipps'}` : ''].filter(Boolean).join(', ');
      api.finish({ winner: 0, detail: `${LEVELS[level].label} in ${clock(secs)} Min., ${extra}.`, best: hints ? null : { key: level, value: secs }, delay: 900 });
    }

    wrap.addEventListener('click', (e) => {
      if (over) return;
      const c = e.target.closest('.sd-c');
      if (c) { sel = +c.dataset.i; api.sfx('tap'); paint(); return; }
      const d = e.target.closest('[data-d]');
      if (d) { if (sel >= 0) setVal(sel, +d.dataset.d); else api.sfx('miss'); return; }
      const t = e.target.closest('[data-sd]');
      if (!t) return;
      const k = t.dataset.sd;
      if (k === 'notes') { noteMode = !noteMode; api.sfx('tap'); paint(); }
      else if (k === 'erase' && sel >= 0 && !given[sel]) { history.push({ i: sel, v: val[sel], n: notes[sel] }); val[sel] = 0; notes[sel] = 0; api.sfx('flip'); paint(); }
      else if (k === 'undo') { const h = history.pop(); if (!h) { api.sfx('miss'); return; } val[h.i] = h.v; notes[h.i] = h.n; sel = h.i; api.sfx('flip'); paint(); }
      else if (k === 'hint') {
        let i = sel >= 0 && !given[sel] && val[sel] !== solution[sel] ? sel : -1;
        if (i < 0) { const open = [...Array(81).keys()].filter((j) => val[j] !== solution[j]); i = open[(Math.random() * open.length) | 0]; }
        if (i == null) return;
        hints++;
        history.push({ i, v: val[i], n: notes[i] });
        val[i] = solution[i]; notes[i] = 0; sel = i;
        api.sfx('point');
        paint(i);
        check();
      }
    });
    const onKey = (e) => {
      if (over || document.querySelector('#play').hidden) return;
      if (/^[1-9]$/.test(e.key) && sel >= 0) setVal(sel, +e.key);
      else if ((e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') && sel >= 0 && !given[sel]) { val[sel] = 0; notes[sel] = 0; paint(); }
      else if (e.key.startsWith('Arrow')) {
        if (sel < 0) sel = 40;
        else sel = { ArrowUp: sel - 9, ArrowDown: sel + 9, ArrowLeft: sel - 1, ArrowRight: sel + 1 }[e.key];
        sel = (sel + 81) % 81;
        paint();
        e.preventDefault();
      } else if (e.key === 'n') { noteMode = !noteMode; paint(); }
    };
    document.addEventListener('keydown', onKey);

    function tick() {
      if (over) return;
      api.status(`${LEVELS[level].label} · ${clock(Math.floor((performance.now() - t0) / 1000))}${mistakes ? ` · ${mistakes} Fehler` : ''}`);
      api.later(tick, 1000);
    }
    const filled = () => val.reduce((n, x, i) => n + (x && x === solution[i] ? 1 : 0), 0);
    api.score(0, 81 - given.reduce((n, x) => n + (x ? 1 : 0), 0), 'Felder offen');
    const scoreTick = () => { if (over) return; api.score(0, 81 - filled(), 'Felder offen'); api.later(scoreTick, 500); };
    paint();
    tick();
    scoreTick();
    return { destroy() { over = true; document.removeEventListener('keydown', onKey); } };
  }

  CC.register({
    id: 'sudoku',
    name: 'Sudoku',
    tagline: 'Neun mal neun, jede Zahl nur einmal.',
    color: 'teal',
    minutes: '5–30',
    shelf: 'puzzle',
    modes: ['solo'],
    options: [
      { id: 'level', label: 'Schwierigkeit', default: 'mittel', choices: [{ v: 'leicht', l: 'Leicht' }, { v: 'mittel', l: 'Mittel' }, { v: 'schwer', l: 'Schwer' }] },
      { id: 'errors', label: 'Fehler', default: true, choices: [{ v: true, l: 'Sofort zeigen' }, { v: false, l: 'Nicht zeigen' }] },
    ],
    optionLabel: (o) => LEVELS[o.level || 'mittel'].label,
    thumb: thumb(),
    rules: [
      'Jede Zeile, jede Spalte und jedes Neunerkästchen enthält die Zahlen 1 bis 9 genau einmal.',
      'Tippe ein Feld an und dann eine Zahl. Mit „Notizen“ merkst du dir mögliche Zahlen.',
      'Jedes Rätsel hat genau eine Lösung. Gelöst ohne Tipp zählt die Zeit als Rekord.',
    ],
    bestText: (b) => ['leicht', 'mittel', 'schwer'].filter((k) => b[k] != null).map((k) => `${LEVELS[k].label} ${clock(b[k])}`).join(' · '),
    create,
  });
})();
