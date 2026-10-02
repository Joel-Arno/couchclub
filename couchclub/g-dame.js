/* Couchclub — Dame */
(() => {
  'use strict';
  const N = 8, NN = 64;
  const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const DRAW_PLIES = 50;
  const on = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
  /* Felder: 0 leer, 1/2 Stein von Spieler 0/1, 3/4 Dame von Spieler 0/1. Spieler 0 spielt nach oben. */
  const owner = (v) => (v ? ((v - 1) & 1) : -1);
  const isKing = (v) => v >= 3;
  const fwd = (p) => (p === 0 ? -1 : 1);

  /* Alle Züge für p als { path: [Felder], caps: [Felder], promo } – Schlagen ist Pflicht */
  function allMoves(b, p, rules) {
    const caps = [], quiet = [];
    for (let i = 0; i < NN; i++) {
      if (owner(b[i]) !== p) continue;
      jumps(b, p, i, rules, [i], [], caps);
    }
    if (caps.length) return caps;
    for (let i = 0; i < NN; i++) {
      if (owner(b[i]) !== p) continue;
      const r = (i / N) | 0, c = i % N, king = isKing(b[i]);
      for (const [dr, dc] of DIAG) {
        if (!king && dr !== fwd(p)) continue;
        let rr = r + dr, cc = c + dc;
        while (on(rr, cc) && !b[rr * N + cc]) {
          const t = rr * N + cc;
          quiet.push({ path: [i, t], caps: [], promo: !king && rr === (p === 0 ? 0 : N - 1) });
          if (!king || !rules.fly) break;
          rr += dr; cc += dc;
        }
      }
    }
    return quiet;
  }
  function jumps(b, p, start, rules, path, taken, out) {
    const at = path[path.length - 1];
    const piece = b[start];
    const king = isKing(piece);
    const r = (at / N) | 0, c = at % N;
    let more = false;
    for (const [dr, dc] of DIAG) {
      if (!king && !rules.back && dr !== fwd(p)) continue;
      let rr = r + dr, cc = c + dc;
      if (king && rules.fly) while (on(rr, cc) && (!b[rr * N + cc] || rr * N + cc === start)) { rr += dr; cc += dc; }
      if (!on(rr, cc)) continue;
      const mid = rr * N + cc;
      if (owner(b[mid]) !== 1 - p || taken.includes(mid)) continue;
      let lr = rr + dr, lc = cc + dc;
      while (on(lr, lc) && (!b[lr * N + lc] || lr * N + lc === start)) {
        const land = lr * N + lc;
        more = true;
        const promo = !king && lr === (p === 0 ? 0 : N - 1);
        const np = [...path, land], nt = [...taken, mid];
        if (promo) out.push({ path: np, caps: nt, promo: true });
        else jumps(b, p, start, rules, np, nt, out);
        if (!king || !rules.fly) break;
        lr += dr; lc += dc;
      }
    }
    if (!more && taken.length) out.push({ path: path.slice(), caps: taken.slice(), promo: false });
  }
  function apply(b, m) {
    const from = m.path[0], to = m.path[m.path.length - 1];
    const v = b[from];
    const u = { m, v, capd: m.caps.map((k) => b[k]) };
    b[from] = 0;
    m.caps.forEach((k) => (b[k] = 0));
    b[to] = m.promo ? v + 2 : v;
    return u;
  }
  function undo(b, u) {
    const m = u.m, from = m.path[0], to = m.path[m.path.length - 1];
    b[to] = 0;
    m.caps.forEach((k, j) => (b[k] = u.capd[j]));
    b[from] = u.v;
  }

  /* ---------- KI ---------- */
  function evaluate(b, p) {
    let s = 0;
    for (let i = 0; i < NN; i++) {
      const v = b[i];
      if (!v) continue;
      const o = owner(v), r = (i / N) | 0, c = i % N;
      let x = isKing(v) ? 290 : 100;
      if (!isKing(v)) {
        x += (o === 0 ? N - 1 - r : r) * 5;
        if ((o === 0 && r === N - 1) || (o === 1 && r === 0)) x += 8;
      }
      if (c >= 2 && c <= 5 && r >= 2 && r <= 5) x += 6;
      if (c === 0 || c === N - 1) x -= 4;
      s += o === p ? x : -x;
    }
    return s;
  }
  function search(b, p, depth, alpha, beta, ctx, rules) {
    if (++ctx.nodes % 1024 === 0 && performance.now() > ctx.until) ctx.stop = true;
    if (ctx.stop) return 0;
    const ms = allMoves(b, p, rules);
    if (!ms.length) return -10000 - depth;
    if (depth <= 0 && !ms[0].caps.length) return evaluate(b, p);
    if (depth <= -4) return evaluate(b, p);
    ms.sort((x, y) => y.caps.length - x.caps.length);
    let best = -Infinity;
    for (const m of ms) {
      const u = apply(b, m);
      const v = -search(b, 1 - p, depth - 1, -beta, -alpha, ctx, rules);
      undo(b, u);
      if (ctx.stop) return 0;
      if (v > best) { best = v; if (v > alpha) { alpha = v; if (alpha >= beta) break; } }
    }
    return best;
  }
  function aiMove(board, p, level, rules) {
    const b = Int8Array.from(board);
    const ms = allMoves(b, p, rules);
    if (ms.length === 1) return ms[0];
    if (level === 1 && Math.random() < 0.4) return ms[(Math.random() * ms.length) | 0];
    const ctx = { nodes: 0, stop: false, until: performance.now() + [0, 120, 300, 1000][level] };
    const maxDepth = [0, 1, 4, 12][level];
    let bestMove = ms[0];
    for (let depth = 1; depth <= maxDepth; depth++) {
      let best = null, bv = -Infinity, alpha = -Infinity;
      for (const m of [bestMove, ...ms.filter((x) => x !== bestMove)]) {
        const u = apply(b, m);
        let v = -search(b, 1 - p, depth - 1, -Infinity, -alpha, ctx, rules);
        undo(b, u);
        if (ctx.stop) break;
        if (level < 3) v += Math.random() * (level === 1 ? 50 : 10);
        if (v > bv) { bv = v; best = m; }
        if (v > alpha) alpha = v;
      }
      if (ctx.stop) break;
      if (best) bestMove = best;
    }
    return bestMove;
  }

  /* ---------- Darstellung ---------- */
  CC.css(`
    .dm { width: min(100cqw, 100cqh, 620px); aspect-ratio: 1; max-width: 100%; padding: 2.2%; border-radius: clamp(14px, 3.5cqw, 24px); background: var(--board); box-shadow: var(--lift); }
    .dm-grid { display: grid; grid-template-columns: repeat(8, 1fr); height: 100%; border-radius: 8px; overflow: hidden; }
    .dm-cell { position: relative; background: color-mix(in srgb, var(--p-saffron) 22%, var(--surface)); }
    .dm-cell.dark { background: color-mix(in srgb, var(--p-saffron) 30%, #4a3a33); }
    .dm-cell.from { box-shadow: inset 0 0 0 3px color-mix(in srgb, #fff 55%, transparent); }
    .dm-cell.go::before { content: ""; position: absolute; inset: 34%; border-radius: 50%; background: color-mix(in srgb, var(--turn) 70%, #fff); opacity: .75; animation: dmpulse 1s ease-in-out infinite alternate; }
    @keyframes dmpulse { to { opacity: .35; } }
    .dm-pc { position: absolute; inset: 11%; border-radius: 50%; background: var(--pc); box-shadow: inset 0 -4px 0 rgba(0, 0, 0, .25), inset 0 2px 0 rgba(255, 255, 255, .25), 0 2px 4px rgba(0, 0, 0, .3); display: grid; place-items: center; pointer-events: none; transition: transform .2s; }
    .dm-pc::after { content: ""; width: 48%; height: 48%; border-radius: 50%; box-shadow: inset 0 0 0 2px rgba(255, 255, 255, .35); }
    .dm-pc.king::after { width: 56%; height: 56%; box-shadow: none; background: no-repeat center/100% url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M3 18h18l-1.5-10-4.5 4.5L12 5l-3 7.5L4.5 8z' fill='%23fff' opacity='.92'/%3E%3C/svg%3E"); }
    .dm-cell.sel .dm-pc { transform: scale(1.1); box-shadow: inset 0 -4px 0 rgba(0, 0, 0, .25), 0 0 0 3px #fff, 0 6px 12px rgba(0, 0, 0, .35); }
    .dm-cell.can .dm-pc { box-shadow: inset 0 -4px 0 rgba(0, 0, 0, .25), inset 0 2px 0 rgba(255, 255, 255, .25), 0 0 0 2px color-mix(in srgb, #fff 70%, transparent); }
    .dm-cell.gone .dm-pc { opacity: .35; }
    .dm-cell.last { box-shadow: inset 0 0 0 3px color-mix(in srgb, var(--ink-3) 70%, transparent); }
  `);

  function thumb() {
    let s = '<svg viewBox="0 0 60 60" aria-hidden="true"><rect x="4" y="4" width="52" height="52" rx="8" fill="var(--board)"/>';
    for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) s += `<rect x="${7 + c * 7.7}" y="${7 + r * 7.7}" width="7.7" height="7.7" fill="${(r + c) % 2 ? 'color-mix(in srgb, var(--p-saffron) 30%, #4a3a33)' : 'color-mix(in srgb, var(--p-saffron) 22%, var(--surface))'}"/>`;
    const pc = [[1, 0, 'plum'], [3, 0, 'plum'], [0, 1, 'plum'], [4, 3, 'plum'], [2, 5, 'coral'], [0, 5, 'coral'], [3, 4, 'coral'], [1, 4, 'coral']];
    pc.forEach(([c, r, col]) => (s += `<circle cx="${10.85 + c * 7.7}" cy="${10.85 + r * 7.7}" r="3" fill="var(--p-${col})"/>`));
    return s + '</svg>';
  }

  function create(root, api) {
    const P = api.players;
    const rules = { fly: api.opts.king !== 'short', back: api.opts.back !== false };
    const b = new Int8Array(NN);
    for (let r = 0; r < 3; r++) for (let c = 0; c < N; c++) if ((r + c) % 2) b[r * N + c] = 2;
    for (let r = N - 3; r < N; r++) for (let c = 0; c < N; c++) if ((r + c) % 2) b[r * N + c] = 1;
    let cur = 0, over = false, lock = false, quiet = 0, legal = [], path = [], lastPath = [];
    const flip = P[0].ai && !P[1].ai;   // Brett so drehen, dass der Mensch unten sitzt

    root.innerHTML = `<div class="dm" style="--c0:var(--p-${P[0].color});--c1:var(--p-${P[1].color})"><div class="dm-grid"></div></div>`;
    const wrap = root.firstElementChild;
    const grid = wrap.firstElementChild;
    const order = [...Array(NN).keys()];
    if (flip) order.reverse();
    grid.innerHTML = order.map((i) => `<button class="dm-cell ${((i / N) | 0) + (i % N) & 1 ? 'dark' : ''}" data-i="${i}" tabindex="-1"></button>`).join('');
    const cells = [];
    grid.querySelectorAll('.dm-cell').forEach((el) => (cells[+el.dataset.i] = el));

    function paint() {
      const human = !P[cur].ai && !over;
      const movers = human ? new Set(legal.map((m) => m.path[0])) : new Set();
      const cand = path.length ? legal.filter((m) => path.every((x, k) => m.path[k] === x)) : [];
      const go = new Set(cand.map((m) => m.path[path.length]).filter((x) => x != null));
      const gone = new Set();
      cand.forEach((m) => m.caps.slice(0, path.length - 1).forEach((k) => gone.add(k)));
      for (let i = 0; i < NN; i++) {
        const el = cells[i], v = b[i];
        const shown = path.length && i === path[0] ? 0 : v;
        const here = path.length && i === path[path.length - 1] ? b[path[0]] : shown;
        el.innerHTML = here ? `<i class="dm-pc ${isKing(here) ? 'king' : ''}" style="--pc:var(--c${owner(here)})"></i>` : '';
        el.classList.toggle('sel', path.length > 0 && i === path[path.length - 1]);
        el.classList.toggle('from', path.length > 1 && i === path[0]);
        el.classList.toggle('can', !path.length && movers.has(i));
        el.classList.toggle('go', go.has(i));
        el.classList.toggle('gone', gone.has(i));
        el.classList.toggle('last', !path.length && lastPath.includes(i));
      }
      wrap.style.setProperty('--turn', `var(--c${cur})`);
      let a = 0, z = 0;
      for (let i = 0; i < NN; i++) { if (owner(b[i]) === 0) a++; else if (owner(b[i]) === 1) z++; }
      api.score(0, a, 'Steine'); api.score(1, z, 'Steine');
    }

    function doMove(m) {
      const u = apply(b, m);
      lastPath = m.path;
      path = [];
      if (m.caps.length || !isKing(u.v)) quiet = 0; else quiet++;
      api.sfx(m.caps.length ? 'point' : 'place');
      if (m.promo) api.later(() => api.sfx('win'), 180);
      api.buzz(m.caps.length ? [15, 30, 15] : 10);
      cur = 1 - cur;
      lock = true;
      paint();
      api.later(next, m.caps.length ? 420 : 220);
    }

    function next() {
      lock = false;
      if (over) return;
      legal = allMoves(b, cur, rules);
      if (!legal.length) return end(1 - cur, 'kann nicht mehr ziehen');
      if (quiet >= DRAW_PLIES) return end(null);
      const p = P[cur];
      api.turn(cur);
      paint();
      if (p.ai) {
        api.status('Die KI überlegt …');
        lock = true;
        api.later(() => {
          if (over) return;
          const m = aiMove(b, cur, p.level, rules);
          lock = false;
          doMove(m);
        }, 420 + Math.random() * 300);
      } else api.status(legal[0].caps.length ? `${p.name} muss schlagen` : `${p.name} ist am Zug`);
    }
    function end(w, why) {
      over = true;
      paint();
      if (w == null) {
        api.status('Lange nichts passiert.');
        api.finish({ winner: null, detail: `${DRAW_PLIES / 2} Züge pro Seite nur mit Damen und ohne Schlagen: unentschieden.` });
        return;
      }
      const l = P[1 - w], lname = l.ai ? 'Die KI' : l.name;
      let left = 0;
      for (let i = 0; i < NN; i++) if (owner(b[i]) === 1 - w) left++;
      api.status(left ? `${lname} ${why}.` : `${lname} hat keine Steine mehr.`);
      api.finish({ winner: w, detail: left ? `${lname} ist eingesperrt und kann nicht mehr ziehen.` : `Alle Steine von ${lname === 'Die KI' ? 'der KI' : lname} sind geschlagen.`, delay: 1200 });
    }

    grid.addEventListener('click', (e) => {
      const el = e.target.closest('.dm-cell');
      if (!el || over || lock || P[cur].ai) return;
      const i = +el.dataset.i;
      // Eigenen Stein wählen (oder wechseln, solange noch nicht gesprungen)
      if (path.length <= 1 && legal.some((m) => m.path[0] === i)) {
        path = path[0] === i ? [] : [i];
        api.sfx('tap'); paint(); return;
      }
      if (!path.length) { api.sfx('miss'); return; }
      const np = [...path, i];
      const cand = legal.filter((m) => np.every((x, k) => m.path[k] === x));
      if (!cand.length) { api.sfx('miss'); return; }
      const done = cand.find((m) => m.path.length === np.length);
      if (done && cand.length === 1) { doMove(done); return; }
      if (done && cand.every((m) => m.path.length === np.length)) { doMove(done); return; }
      path = np;
      api.sfx('flip');
      paint();
    });

    next();
    return { destroy() { over = true; } };
  }

  CC.register({
    id: 'dame',
    name: 'Dame',
    tagline: 'Schräg ziehen, überspringen, Dame werden.',
    color: 'plum',
    minutes: '10–25',
    modes: ['ai', 'duo'],
    options: [
      { id: 'king', label: 'Damen ziehen', default: 'fly', choices: [{ v: 'fly', l: 'Beliebig weit' }, { v: 'short', l: 'Ein Feld' }] },
      { id: 'back', label: 'Steine schlagen', default: true, choices: [{ v: true, l: 'Auch rückwärts' }, { v: false, l: 'Nur vorwärts' }] },
    ],
    optionLabel: (o) => (o.king === 'short' ? 'kurze Damen' : 'weite Damen'),
    thumb: thumb(),
    rules: [
      'Steine ziehen schräg ein Feld nach vorn. Ein gegnerischer Stein wird übersprungen und geschlagen, mehrmals hintereinander, wenn es geht.',
      'Schlagen ist Pflicht. Welche Schlagfolge du nimmst, darfst du dir aussuchen.',
      'Wer die letzte Reihe erreicht, wird zur Dame und darf auch rückwärts ziehen.',
      'Wer keine Steine mehr hat oder nicht mehr ziehen kann, verliert.',
    ],
    create,
  });
})();
