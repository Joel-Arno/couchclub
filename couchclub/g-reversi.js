/* Couchclub — Reversi */
(() => {
  'use strict';
  const N = 8, NN = 64;
  const DR = [-1, -1, -1, 0, 0, 1, 1, 1], DC = [-1, 0, 1, -1, 1, -1, 0, 1];
  const W = [
    100, -20, 10, 5, 5, 10, -20, 100,
    -20, -50, -2, -2, -2, -2, -50, -20,
    10, -2, 1, 1, 1, 1, -2, 10,
    5, -2, 1, 0, 0, 1, -2, 5,
    5, -2, 1, 0, 0, 1, -2, 5,
    10, -2, 1, 1, 1, 1, -2, 10,
    -20, -50, -2, -2, -2, -2, -50, -20,
    100, -20, 10, 5, 5, 10, -20, 100,
  ];
  const CORNERS = [[0, 1, 8, 9], [7, 6, 15, 14], [56, 57, 48, 49], [63, 62, 55, 54]];

  /* Steine, die ein Zug von p auf i umdreht */
  function flips(b, i, p) {
    if (b[i]) return null;
    const o = 3 - p, r0 = (i / N) | 0, c0 = i % N, out = [];
    for (let d = 0; d < 8; d++) {
      let r = r0 + DR[d], c = c0 + DC[d];
      const line = [];
      while (r >= 0 && r < N && c >= 0 && c < N && b[r * N + c] === o) { line.push(r * N + c); r += DR[d]; c += DC[d]; }
      if (line.length && r >= 0 && r < N && c >= 0 && c < N && b[r * N + c] === p) out.push(...line);
    }
    return out.length ? out : null;
  }
  function canFlip(b, i, p) {
    if (b[i]) return false;
    const o = 3 - p, r0 = (i / N) | 0, c0 = i % N;
    for (let d = 0; d < 8; d++) {
      let r = r0 + DR[d], c = c0 + DC[d], n = 0;
      while (r >= 0 && r < N && c >= 0 && c < N && b[r * N + c] === o) { n++; r += DR[d]; c += DC[d]; }
      if (n && r >= 0 && r < N && c >= 0 && c < N && b[r * N + c] === p) return true;
    }
    return false;
  }
  function moves(b, p) { const m = []; for (let i = 0; i < NN; i++) if (canFlip(b, i, p)) m.push(i); return m; }
  function count(b) { let a = 0, z = 0; for (let i = 0; i < NN; i++) { if (b[i] === 1) a++; else if (b[i] === 2) z++; } return [a, z]; }

  /* ---------- KI ---------- */
  function evaluate(b, p, full) {
    const o = 3 - p;
    let s = 0;
    for (let i = 0; i < NN; i++) { if (b[i] === p) s += W[i]; else if (b[i] === o) s -= W[i]; }
    // Ist eine Ecke besetzt, sind die Felder daneben nicht mehr gefährlich
    for (const [cn, ...near] of CORNERS) {
      if (!b[cn]) continue;
      for (const k of near) { if (b[k] === p) s -= W[k]; else if (b[k] === o) s += W[k]; }
    }
    if (full) {
      const mp = moves(b, p).length, mo = moves(b, o).length;
      s += 6 * (mp - mo);
      if (!mp && !mo) { const [x, y] = count(b); const d = (p === 1 ? x - y : y - x); return d > 0 ? 100000 + d : d < 0 ? -100000 + d : 0; }
    }
    return s;
  }
  function search(b, p, depth, alpha, beta, ctx, passed) {
    if (++ctx.nodes % 2048 === 0 && performance.now() > ctx.until) ctx.stop = true;
    if (ctx.stop) return 0;
    const ms = moves(b, p);
    if (!ms.length) {
      if (passed) { const [x, y] = count(b); const d = p === 1 ? x - y : y - x; return d > 0 ? 100000 + d : d < 0 ? -100000 + d : 0; }
      return -search(b, 3 - p, depth, -beta, -alpha, ctx, true);
    }
    if (depth <= 0) return evaluate(b, p, ctx.full);
    ms.sort((x, y) => W[y] - W[x]);
    let best = -Infinity;
    for (const i of ms) {
      const f = flips(b, i, p);
      b[i] = p; for (const k of f) b[k] = p;
      const v = -search(b, 3 - p, depth - 1, -beta, -alpha, ctx, false);
      b[i] = 0; for (const k of f) b[k] = 3 - p;
      if (ctx.stop) return 0;
      if (v > best) { best = v; if (v > alpha) { alpha = v; if (alpha >= beta) break; } }
    }
    return best;
  }
  function aiMove(board, p, level) {
    const ms = moves(board, p);
    if (ms.length === 1) return ms[0];
    if (level === 1) {
      if (Math.random() < 0.3) return ms[(Math.random() * ms.length) | 0];
      let best = ms[0], bv = -Infinity;
      for (const i of ms) { const v = flips(board, i, p).length + Math.random() * 3 + (W[i] > 50 ? 4 : 0); if (v > bv) { bv = v; best = i; } }
      return best;
    }
    const b = Int8Array.from(board);
    const empty = b.reduce((n, x) => n + (x ? 0 : 1), 0);
    const ctx = { nodes: 0, stop: false, until: performance.now() + (level === 2 ? 250 : 900), full: level === 3 };
    let maxDepth = level === 2 ? 3 : (empty <= 12 ? empty : 9);
    let bestMove = ms[0];
    for (let depth = 1; depth <= maxDepth; depth++) {
      let best = null, bv = -Infinity, alpha = -Infinity;
      const order = [bestMove, ...ms.filter((x) => x !== bestMove)];
      for (const i of order) {
        const f = flips(b, i, p);
        b[i] = p; for (const k of f) b[k] = p;
        let v = -search(b, 3 - p, depth - 1, -Infinity, -alpha, ctx, false);
        b[i] = 0; for (const k of f) b[k] = 3 - p;
        if (ctx.stop) break;
        if (level === 2) v += Math.random() * 8;
        if (v > bv) { bv = v; best = i; }
        if (v > alpha) alpha = v;
      }
      if (ctx.stop) break;
      if (best != null) bestMove = best;
    }
    return bestMove;
  }

  /* ---------- Darstellung ---------- */
  CC.css(`
    .rv { width: min(100cqw, 100cqh, 620px); aspect-ratio: 1; max-width: 100%; padding: 2.4%; border-radius: clamp(14px, 3.5cqw, 24px); background: color-mix(in srgb, var(--p-teal) 70%, #0b2a26); box-shadow: var(--lift); }
    .rv-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; height: 100%; }
    .rv-cell { position: relative; border-radius: 4px; background: rgba(255, 255, 255, .07); perspective: 400px; }
    .rv.can .rv-cell.ok { cursor: pointer; }
    .rv.can .rv-cell.ok::before { content: ""; position: absolute; inset: 38%; border-radius: 50%; background: rgba(255, 255, 255, .28); }
    .rv.can .rv-cell.ok:hover::before { inset: 14%; background: color-mix(in srgb, var(--turn) 45%, transparent); }
    .rv-disc { position: absolute; inset: 9%; border-radius: 50%; transform-style: preserve-3d; transition: transform .42s cubic-bezier(.3, .7, .3, 1.2); }
    .rv-disc::before, .rv-disc::after { content: ""; position: absolute; inset: 0; border-radius: 50%; backface-visibility: hidden; -webkit-backface-visibility: hidden; box-shadow: inset 0 -3px 0 rgba(0, 0, 0, .22), inset 0 2px 0 rgba(255, 255, 255, .22); }
    .rv-disc::before { background: var(--c0); }
    .rv-disc::after { background: var(--c1); transform: rotateY(180deg); }
    .rv-disc.d2 { transform: rotateY(180deg); }
    .rv-disc.new { animation: rvpop .3s cubic-bezier(.2, .9, .3, 1.4); }
    .rv-cell.last::after { content: ""; position: absolute; left: 50%; top: 50%; width: 12%; height: 12%; margin: -6% 0 0 -6%; border-radius: 50%; background: rgba(255, 255, 255, .8); z-index: 2; }
    @keyframes rvpop { from { scale: .3; } }
    .rv.still .rv-disc { transition: none; }
  `);

  function thumb() {
    const b = { 27: 2, 28: 1, 35: 1, 36: 2, 19: 1, 20: 1, 44: 2, 37: 1 };
    let s = '<svg viewBox="0 0 60 60" aria-hidden="true"><rect x="4" y="4" width="52" height="52" rx="8" fill="color-mix(in srgb, var(--p-teal) 70%, #0b2a26)"/>';
    for (let i = 0; i < 64; i++) {
      const x = 6.5 + (i % 8) * 6, y = 6.5 + ((i / 8) | 0) * 6;
      s += b[i] ? `<circle cx="${x + 2.6}" cy="${y + 2.6}" r="2.5" fill="${b[i] === 1 ? 'var(--p-saffron)' : 'var(--surface)'}"/>` : `<rect x="${x}" y="${y}" width="5.2" height="5.2" rx="1" fill="#fff" opacity=".08"/>`;
    }
    return s + '</svg>';
  }

  function create(root, api) {
    const P = api.players;
    const b = new Int8Array(NN);
    b[27] = 2; b[36] = 2; b[28] = 1; b[35] = 1;
    let cur = 0, over = false, lock = false, last = -1, passes = 0;

    root.innerHTML = `<div class="rv ${api.motion ? '' : 'still'}" style="--c0:var(--p-${P[0].color});--c1:var(--p-${P[1].color})">
      <div class="rv-grid">${Array.from({ length: NN }, (_, i) => `<button class="rv-cell" data-i="${i}" aria-label="Feld ${'ABCDEFGH'[i % 8]}${((i / 8) | 0) + 1}"></button>`).join('')}</div>
    </div>`;
    const wrap = root.firstElementChild;
    const cells = [...wrap.querySelectorAll('.rv-cell')];

    function paint(fresh = [], placed = -1) {
      for (let i = 0; i < NN; i++) {
        const el = cells[i];
        let d = el.firstElementChild;
        if (b[i] && !d) { d = document.createElement('i'); d.className = 'rv-disc'; el.append(d); }
        if (d) {
          d.classList.toggle('d2', b[i] === 2);
          if (i === placed) { d.classList.remove('new'); void d.offsetWidth; d.classList.add('new'); }
        }
        el.classList.toggle('last', i === last);
      }
      const [x, y] = count(b);
      api.score(0, x, 'Steine'); api.score(1, y, 'Steine');
    }
    function hints() {
      const ok = P[cur].ai || over ? [] : moves(b, cur + 1);
      cells.forEach((el, i) => el.classList.toggle('ok', ok.includes(i)));
      wrap.classList.toggle('can', !P[cur].ai && !over);
      wrap.style.setProperty('--turn', `var(--c${cur})`);
    }

    function play(i) {
      const f = flips(b, i, cur + 1);
      if (!f) return false;
      b[i] = cur + 1;
      f.forEach((k) => (b[k] = cur + 1));
      last = i;
      paint(f, i);
      api.sfx('place');
      api.later(() => api.sfx('flip'), 140);
      api.buzz(10);
      cur = 1 - cur;
      passes = 0;
      api.later(next, f.length > 6 ? 320 : 220);
      lock = true;
      return true;
    }

    function next() {
      lock = false;
      if (over) return;
      const ms = moves(b, cur + 1);
      if (!ms.length) {
        if (!moves(b, 2 - cur).length || passes) return end();
        passes++;
        const p = P[cur];
        api.status(p.ai ? 'Die KI kann nicht setzen und muss passen.' : `${p.name} kann nicht setzen und muss passen.`);
        api.sfx('miss');
        cur = 1 - cur;
        lock = true;
        api.later(() => { lock = false; turn(); }, 1300);
        hints();
        return;
      }
      turn();
    }
    function turn() {
      const p = P[cur];
      api.turn(cur);
      hints();
      if (p.ai) {
        api.status('Die KI überlegt …');
        lock = true;
        api.later(() => {
          if (over) return;
          const m = aiMove(b, cur + 1, p.level);
          lock = false;
          play(m);
        }, 380 + Math.random() * 300);
      } else api.status(`${p.name} ist am Zug`);
    }
    function end() {
      over = true;
      hints();
      const [x, y] = count(b);
      const w = x === y ? null : x > y ? 0 : 1;
      api.status(w == null ? 'Gleich viele Steine.' : `${P[w].ai ? 'Die KI' : P[w].name} hat mehr Steine.`);
      api.finish({ winner: w, detail: `${Math.max(x, y)} zu ${Math.min(x, y)} Steine.`, delay: 1200 });
    }

    wrap.addEventListener('click', (e) => {
      const el = e.target.closest('.rv-cell');
      if (!el || over || lock || P[cur].ai) return;
      if (!play(+el.dataset.i)) { api.sfx('miss'); }
    });

    paint();
    turn();
    return { destroy() { over = true; } };
  }

  CC.register({
    id: 'reversi',
    name: 'Reversi',
    tagline: 'Einkesseln, umdrehen, Ecken holen.',
    color: 'saffron',
    minutes: '8–15',
    modes: ['ai', 'duo'],
    thumb: thumb(),
    rules: [
      'Setze einen Stein so, dass du gegnerische Steine zwischen zwei eigenen einschließt, waagrecht, senkrecht oder diagonal.',
      'Alle eingeschlossenen Steine wechseln die Farbe. Wer nicht setzen kann, muss passen.',
      'Wenn niemand mehr setzen kann, gewinnt, wer mehr Steine hat. Tipp: Ecken kann man nie verlieren.',
    ],
    create,
  });
})();
