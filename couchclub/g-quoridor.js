/* Couchclub — Quoridor */
(() => {
  'use strict';
  const N = 9, W = 8;   // 9×9 Felder, 8×8 Mauerplätze
  const WALLS = 10;
  /* Mauern: h[r*W+c] liegt unter den Feldern (r,c) und (r,c+1), v[r*W+c] rechts von (r,c) und (r+1,c) */
  const goalRow = (p) => (p === 0 ? 0 : N - 1);

  function blocked(S, r, c, dr, dc) {
    if (dr === 1) return (c < W && S.h[r * W + c]) || (c > 0 && S.h[r * W + c - 1]);
    if (dr === -1) return blocked(S, r - 1, c, 1, 0);
    if (dc === 1) return (r < W && S.v[r * W + c]) || (r > 0 && S.v[(r - 1) * W + c]);
    return blocked(S, r, c - 1, 0, 1);
  }
  const STEPS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  function canStep(S, r, c, dr, dc) {
    const rr = r + dr, cc = c + dc;
    return rr >= 0 && rr < N && cc >= 0 && cc < N && !blocked(S, r, c, dr, dc);
  }
  /* Kürzester Weg zum Ziel (Gegner werden ignoriert) */
  function dist(S, p, from = S.pos[p]) {
    const goal = goalRow(p);
    const d = new Int8Array(N * N).fill(-1);
    const q = [from];
    d[from] = 0;
    for (let k = 0; k < q.length; k++) {
      const i = q[k], r = (i / N) | 0, c = i % N;
      if (r === goal) return d[i];
      for (const [dr, dc] of STEPS) {
        if (!canStep(S, r, c, dr, dc)) continue;
        const j = (r + dr) * N + c + dc;
        if (d[j] < 0) { d[j] = d[i] + 1; q.push(j); }
      }
    }
    return 99;
  }
  function pathCells(S, p) {
    const goal = goalRow(p), from = S.pos[p];
    const prev = new Int16Array(N * N).fill(-2);
    const q = [from]; prev[from] = -1;
    for (let k = 0; k < q.length; k++) {
      const i = q[k], r = (i / N) | 0, c = i % N;
      if (r === goal) { const out = []; for (let x = i; x >= 0; x = prev[x]) out.push(x); return out; }
      for (const [dr, dc] of STEPS) {
        if (!canStep(S, r, c, dr, dc)) continue;
        const j = (r + dr) * N + c + dc;
        if (prev[j] === -2) { prev[j] = i; q.push(j); }
      }
    }
    return [];
  }
  /* Ziehbare Felder mit Springen über den Gegner */
  function pawnMoves(S, p) {
    const me = S.pos[p], op = S.pos[1 - p];
    const r = (me / N) | 0, c = me % N, out = [];
    for (const [dr, dc] of STEPS) {
      if (!canStep(S, r, c, dr, dc)) continue;
      const j = (r + dr) * N + c + dc;
      if (j !== op) { out.push(j); continue; }
      const r2 = r + dr, c2 = c + dc;
      if (canStep(S, r2, c2, dr, dc)) { out.push((r2 + dr) * N + c2 + dc); continue; }
      for (const [er, ec] of dr ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]]) if (canStep(S, r2, c2, er, ec)) out.push((r2 + er) * N + c2 + ec);
    }
    return out;
  }
  function wallFree(S, k, hor) {
    const r = (k / W) | 0, c = k % W;
    if (S.h[k] || S.v[k]) return false;
    if (hor) return !((c > 0 && S.h[k - 1]) || (c < W - 1 && S.h[k + 1]));
    return !((r > 0 && S.v[k - W]) || (r < W - 1 && S.v[k + W]));
  }
  function wallOk(S, k, hor) {
    if (!S.left[S.cur] || !wallFree(S, k, hor)) return false;
    const arr = hor ? S.h : S.v;
    arr[k] = 1;
    const ok = dist(S, 0) < 99 && dist(S, 1) < 99;
    arr[k] = 0;
    return ok;
  }
  function apply(S, m) {
    if (m.t === 'move') S.pos[S.cur] = m.i;
    else { (m.hor ? S.h : S.v)[m.k] = 1; S.left[S.cur]--; }
    S.cur = 1 - S.cur;
  }
  function clone(S) { return { pos: S.pos.slice(), h: Uint8Array.from(S.h), v: Uint8Array.from(S.v), left: S.left.slice(), cur: S.cur }; }
  const won = (S, p) => ((S.pos[p] / N) | 0) === goalRow(p);

  /* ---------- KI ---------- */
  function wallCandidates(S, p) {
    // Mauern nahe am Weg des Gegners und rund um die Figuren
    const set = new Set();
    const near = [...pathCells(S, 1 - p).slice(0, 6), S.pos[1 - p], S.pos[p]];
    for (const i of near) {
      const r = (i / N) | 0, c = i % N;
      for (let dr = -1; dr <= 0; dr++) for (let dc = -1; dc <= 0; dc++) {
        const wr = r + dr, wc = c + dc;
        if (wr >= 0 && wr < W && wc >= 0 && wc < W) { set.add(wr * W + wc); }
      }
    }
    const out = [];
    for (const k of set) for (const hor of [true, false]) if (wallFree(S, k, hor)) out.push({ t: 'wall', k, hor });
    return out;
  }
  function score(S, p) {
    if (won(S, p)) return 1000;
    if (won(S, 1 - p)) return -1000;
    const dm = dist(S, p), dop = dist(S, 1 - p);
    return (dop - dm) * 10 + (S.left[p] - S.left[1 - p]) * 2 + (S.cur === p ? 3 : 0);
  }
  function options(S, p, walls) {
    const ms = pawnMoves(S, p).map((i) => ({ t: 'move', i }));
    if (walls && S.left[p]) for (const w of wallCandidates(S, p)) { const T = clone(S); T.cur = p; if (wallOk(T, w.k, w.hor)) ms.push(w); }
    return ms;
  }
  function aiMove(S0, level) {
    const p = S0.cur;
    const path = pathCells(S0, p);
    const stepOn = () => {
      const pm = pawnMoves(S0, p);
      let best = pm[0], bd = 99;
      for (const i of pm) { const d = dist(S0, p, i); if (d < bd || (d === bd && Math.random() < 0.5)) { bd = d; best = i; } }
      return { t: 'move', i: best };
    };
    if (level === 1) {
      if (S0.left[p] && Math.random() < 0.22) {
        const ws = options(S0, p, true).filter((m) => m.t === 'wall');
        if (ws.length) return ws[(Math.random() * ws.length) | 0];
      }
      return path.length > 1 && pawnMoves(S0, p).includes(path[path.length - 2]) ? { t: 'move', i: path[path.length - 2] } : stepOn();
    }
    const ms = options(S0, p, true);
    const until = performance.now() + (level === 2 ? 200 : 900);
    let best = ms[0], bv = -Infinity;
    for (const m of ms) {
      const S = clone(S0);
      apply(S, m);
      let v;
      if (won(S, p)) v = 2000;
      else if (level === 2 || performance.now() > until) v = score(S, p) + Math.random() * (level === 2 ? 6 : 1);
      else {
        // Stufe 3: beste Antwort des Gegners abziehen
        let worst = Infinity;
        for (const r of options(S, 1 - p, true)) {
          const T = clone(S);
          apply(T, r);
          const x = won(T, 1 - p) ? -2000 : score(T, p);
          if (x < worst) worst = x;
          if (worst <= -2000) break;
        }
        v = worst + Math.random();
      }
      if (m.t === 'move') v += 0.5;   // bei Gleichstand lieber laufen als Mauern verschwenden
      if (v > bv) { bv = v; best = m; }
    }
    return best;
  }

  /* ---------- Darstellung ---------- */
  const CELL = 60, GAP = 14, STEP = CELL + GAP, PAD = 10;
  const SIZE = N * CELL + (N - 1) * GAP + PAD * 2;
  const cx = (i) => PAD + (i % N) * STEP + CELL / 2, cy = (i) => PAD + ((i / N) | 0) * STEP + CELL / 2;
  function wallRect(k, hor) {
    const r = (k / W) | 0, c = k % W;
    if (hor) return { x: PAD + c * STEP, y: PAD + r * STEP + CELL + 1, w: 2 * CELL + GAP, h: GAP - 2 };
    return { x: PAD + c * STEP + CELL + 1, y: PAD + r * STEP, w: GAP - 2, h: 2 * CELL + GAP };
  }

  CC.css(`
    .qd { width: min(100cqw, 100cqh - 64px, 600px); max-width: 100%; display: grid; gap: 10px; }
    .qd svg { width: 100%; aspect-ratio: 1; display: block; border-radius: clamp(14px, 3.5cqw, 22px); background: color-mix(in srgb, #6b4a35 75%, var(--board)); box-shadow: var(--lift); touch-action: manipulation; }
    .qd-cell { fill: color-mix(in srgb, #e7cfa8 80%, var(--surface)); }
    .qd-goal0 { fill: color-mix(in srgb, var(--c0) 30%, #e7cfa8); }
    .qd-goal1 { fill: color-mix(in srgb, var(--c1) 30%, #e7cfa8); }
    .qd-go { fill: color-mix(in srgb, var(--turn) 55%, #fff); opacity: .85; pointer-events: none; animation: qdpulse 1s ease-in-out infinite alternate; }
    @keyframes qdpulse { to { opacity: .45; } }
    .qd-wall { fill: #f4e6cc; stroke: rgba(0, 0, 0, .25); stroke-width: 1.5; }
    .qd-wall.w0 { fill: color-mix(in srgb, var(--c0) 35%, #f4e6cc); }
    .qd-wall.w1 { fill: color-mix(in srgb, var(--c1) 35%, #f4e6cc); }
    .qd-wall.new { animation: qdpop .3s ease-out; }
    @keyframes qdpop { from { opacity: 0; } }
    .qd-ghost { fill: color-mix(in srgb, var(--turn) 70%, #fff); opacity: .85; pointer-events: none; }
    .qd-ghost.bad { fill: var(--p-coral); opacity: .55; }
    .qd-pawn { pointer-events: none; transition: transform .25s cubic-bezier(.3, .8, .3, 1.2); }
    .qd-bar { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
    .qd-left { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; font-weight: 650; color: var(--ink-2); }
    .qd-left span { display: flex; gap: 3px; align-items: center; }
    .qd-left i { width: 5px; height: 15px; border-radius: 2px; background: var(--pc); }
    .qd-left i.used { opacity: .18; }
    .qd.still .qd-pawn { transition: none; }
  `);

  function thumb() {
    let s = '<svg viewBox="0 0 60 60" aria-hidden="true"><rect x="4" y="4" width="52" height="52" rx="8" fill="color-mix(in srgb, #6b4a35 75%, var(--board))"/>';
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) s += `<rect x="${7.5 + c * 9.4}" y="${7.5 + r * 9.4}" width="7.8" height="7.8" rx="1.2" fill="#e7cfa8"/>`;
    s += '<rect x="7.5" y="24.1" width="17.2" height="1.6" fill="var(--p-coral)"/><rect x="34.2" y="33.5" width="17.2" height="1.6" fill="var(--p-blue)"/><rect x="33.4" y="7.5" width="1.6" height="17.2" fill="var(--p-blue)"/>';
    s += '<circle cx="30" cy="48.4" r="3.2" fill="var(--p-coral)"/><circle cx="20.6" cy="11.4" r="3.2" fill="var(--p-blue)"/>';
    return s + '</svg>';
  }

  function create(root, api) {
    const P = api.players;
    const S = { pos: [(N - 1) * N + 4, 4], h: new Uint8Array(W * W), v: new Uint8Array(W * W), left: [WALLS, WALLS], cur: 0 };
    let over = false, lock = false, mode = 'move', ghost = null, moves = 0;
    const flip = P[0].ai && !P[1].ai;

    root.innerHTML = `<div class="qd ${api.motion ? '' : 'still'}" style="--c0:var(--p-${P[0].color});--c1:var(--p-${P[1].color})">
      <div class="qd-left"><span style="--pc:var(--c${flip ? 1 : 0})"></span><span style="--pc:var(--c${flip ? 0 : 1})"></span></div>
      <svg viewBox="0 0 ${SIZE} ${SIZE}" role="img" aria-label="Quoridor-Brett" ${flip ? 'style="transform:rotate(180deg)"' : ''}>
        ${Array.from({ length: N * N }, (_, i) => `<rect class="qd-cell ${((i / N) | 0) === 0 ? 'qd-goal0' : ((i / N) | 0) === N - 1 ? 'qd-goal1' : ''}" x="${cx(i) - CELL / 2}" y="${cy(i) - CELL / 2}" width="${CELL}" height="${CELL}" rx="7"/>`).join('')}
        <g class="qd-gos"></g><g class="qd-walls"></g><g class="qd-ghosts"></g>
        ${[0, 1].map((p) => `<g class="qd-pawn" data-p="${p}"><circle r="22" fill="var(--c${p})" stroke="rgba(0,0,0,.3)" stroke-width="3"/><circle r="9" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="3"/></g>`).join('')}
      </svg>
      <div class="qd-bar">
        <button class="btn small ghost" data-qd="mode">Mauer setzen</button>
        <button class="btn small ghost" data-qd="turn" hidden>Drehen</button>
        <button class="btn small primary" data-qd="place" hidden>Setzen</button>
      </div>
    </div>`;
    const wrap = root.firstElementChild;
    const svg = wrap.querySelector('svg');
    const gGo = svg.querySelector('.qd-gos'), gWalls = svg.querySelector('.qd-walls'), gGhost = svg.querySelector('.qd-ghosts');
    const pawns = [...svg.querySelectorAll('.qd-pawn')];
    const bMode = wrap.querySelector('[data-qd="mode"]'), bTurn = wrap.querySelector('[data-qd="turn"]'), bPlace = wrap.querySelector('[data-qd="place"]');
    const lefts = wrap.querySelectorAll('.qd-left span');
    const owners = { h: new Int8Array(W * W).fill(-1), v: new Int8Array(W * W).fill(-1) };
    let fresh = null;

    function paint() {
      pawns.forEach((g, p) => g.setAttribute('transform', `translate(${cx(S.pos[p])} ${cy(S.pos[p])})`));
      let w = '';
      for (let k = 0; k < W * W; k++) for (const hor of [true, false]) {
        if (!(hor ? S.h : S.v)[k]) continue;
        const R = wallRect(k, hor), o = (hor ? owners.h : owners.v)[k];
        w += `<rect class="qd-wall w${o} ${fresh && fresh.k === k && fresh.hor === hor ? 'new' : ''}" x="${R.x}" y="${R.y}" width="${R.w}" height="${R.h}" rx="4"/>`;
      }
      gWalls.innerHTML = w;
      const human = !P[S.cur].ai && !over;
      gGo.innerHTML = human && mode === 'move' ? pawnMoves(S, S.cur).map((i) => `<circle class="qd-go" cx="${cx(i)}" cy="${cy(i)}" r="13"/>`).join('') : '';
      if (ghost) {
        const R = wallRect(ghost.k, ghost.hor);
        gGhost.innerHTML = `<rect class="qd-ghost ${wallOk(S, ghost.k, ghost.hor) ? '' : 'bad'}" x="${R.x}" y="${R.y}" width="${R.w}" height="${R.h}" rx="4"/>`;
      } else gGhost.innerHTML = '';
      wrap.style.setProperty('--turn', `var(--c${S.cur})`);
      const order = flip ? [1, 0] : [0, 1];
      order.forEach((p, k) => { lefts[k].innerHTML = Array.from({ length: WALLS }, (_, j) => `<i class="${j < S.left[p] ? '' : 'used'}"></i>`).join(''); });
      bMode.hidden = !human;
      bMode.textContent = mode === 'wall' ? 'Abbrechen' : 'Mauer setzen';
      bMode.disabled = mode === 'move' && !S.left[S.cur];
      bTurn.hidden = bPlace.hidden = !(human && mode === 'wall');
      bTurn.disabled = !ghost;
      bPlace.disabled = !(ghost && wallOk(S, ghost.k, ghost.hor));
      [0, 1].forEach((p) => api.score(p, dist(S, p), 'Schritte'));
    }

    function doMove(m) {
      const p = S.cur;
      if (m.t === 'wall') { (m.hor ? owners.h : owners.v)[m.k] = p; fresh = m; } else fresh = null;
      apply(S, m);
      moves++;
      mode = 'move'; ghost = null;
      api.sfx(m.t === 'wall' ? 'drop' : 'place');
      api.buzz(m.t === 'wall' ? 18 : 10);
      lock = true;
      paint();
      if (won(S, p)) {
        over = true;
        paint();
        const w = P[p];
        api.status(`${w.ai ? 'Die KI' : w.name} ist auf der anderen Seite!`);
        api.finish({ winner: p, detail: `Ziel erreicht nach ${Math.ceil(moves / 2)} Zügen.`, delay: 1100 });
        return;
      }
      api.later(next, 260);
    }
    function next() {
      lock = false;
      if (over) return;
      const p = P[S.cur];
      api.turn(S.cur);
      paint();
      if (p.ai) {
        api.status('Die KI überlegt …');
        lock = true;
        api.later(() => {
          if (over) return;
          const m = aiMove(S, p.level);
          lock = false;
          doMove(m);
        }, 420 + Math.random() * 300);
      } else api.status(`${p.name}: ziehen oder eine Mauer setzen (${S.left[S.cur]} übrig)`);
    }

    function svgPoint(e) {
      const R = svg.getBoundingClientRect();
      let x = (e.clientX - R.left) / R.width, y = (e.clientY - R.top) / R.height;
      if (flip) { x = 1 - x; y = 1 - y; }
      return [x * SIZE, y * SIZE];
    }
    svg.addEventListener('click', (e) => {
      if (over || lock || P[S.cur].ai) return;
      const [x, y] = svgPoint(e);
      if (mode === 'wall') {
        // nächster Kreuzungspunkt zwischen vier Feldern
        const wc = Math.round((x - PAD - CELL - GAP / 2) / STEP), wr = Math.round((y - PAD - CELL - GAP / 2) / STEP);
        const k = Math.max(0, Math.min(W - 1, wr)) * W + Math.max(0, Math.min(W - 1, wc));
        const hor = ghost ? ghost.hor : true;
        if (ghost && ghost.k === k) ghost = { k, hor: !hor };
        else ghost = { k, hor };
        api.sfx('tap');
        paint();
        return;
      }
      const c = Math.floor((x - PAD + GAP / 2) / STEP), r = Math.floor((y - PAD + GAP / 2) / STEP);
      if (r < 0 || r >= N || c < 0 || c >= N) return;
      const i = r * N + c;
      if (pawnMoves(S, S.cur).includes(i)) doMove({ t: 'move', i });
      else api.sfx('miss');
    });
    wrap.querySelector('.qd-bar').addEventListener('click', (e) => {
      const b = e.target.closest('[data-qd]');
      if (!b || over || lock || P[S.cur].ai) return;
      const k = b.dataset.qd;
      if (k === 'mode') {
        mode = mode === 'wall' ? 'move' : 'wall';
        ghost = null;
        api.status(mode === 'wall' ? 'Tippe zwischen die Felder, wo die Mauer hin soll. Nochmal tippen dreht sie.' : `${P[S.cur].name}: ziehen oder eine Mauer setzen (${S.left[S.cur]} übrig)`);
      } else if (k === 'turn' && ghost) ghost = { k: ghost.k, hor: !ghost.hor };
      else if (k === 'place' && ghost) {
        if (wallOk(S, ghost.k, ghost.hor)) { doMove({ t: 'wall', k: ghost.k, hor: ghost.hor }); return; }
        api.sfx('miss');
        api.status('Hier geht keine Mauer: Sie kreuzt eine andere oder versperrt den letzten Weg.');
      }
      api.sfx('tap');
      paint();
    });

    next();
    return { destroy() { over = true; } };
  }

  CC.register({
    id: 'quoridor',
    name: 'Quoridor',
    tagline: 'Lauf ans Ziel und mauere den anderen ein.',
    color: 'coral',
    minutes: '10–20',
    modes: ['ai', 'duo'],
    thumb: thumb(),
    rules: [
      'Bring deine Figur auf die gegenüberliegende Seite. Pro Zug ziehst du ein Feld oder setzt eine Mauer.',
      'Jede Mauer ist zwei Felder lang. Du hast zehn davon. Ein Weg zum Ziel muss für beide immer offen bleiben.',
      'Steht der andere direkt vor dir, springst du über ihn. Ist dahinter eine Mauer, springst du schräg daneben.',
    ],
    create,
  });
})();
