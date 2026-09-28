/* Couchclub — Vier gewinnt */
(() => {
  'use strict';
  const COLS = 7, ROWS = 6;
  const ORDER = [3, 2, 4, 1, 5, 0, 6];
  const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];

  const WINDOWS = [];
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      for (const [dc, dr] of DIRS) {
        const ec = c + dc * 3, er = r + dr * 3;
        if (ec < 0 || ec >= COLS || er < 0 || er >= ROWS) continue;
        WINDOWS.push([0, 1, 2, 3].map((k) => (c + dc * k) * ROWS + (r + dr * k)));
      }
    }
  }

  CC.css(`
    .c4 {
      width: min(100cqw, 100cqh * 7 / 6.25, 660px);
      aspect-ratio: 7 / 6.25;
      max-width: 100%;
      background: var(--board);
      border-radius: clamp(16px, 4cqw, 28px);
      padding: 2%;
      overflow: hidden;
      box-shadow: var(--lift);
    }
    .c4-grid { display: grid; grid-template-columns: repeat(7, 1fr); height: 100%; }
    .c4-col { display: grid; grid-template-rows: repeat(6, 1fr); border-radius: 999px; transition: background .15s; }
    .c4-col:focus-visible { outline: 3px solid var(--velvet); outline-offset: -3px; }
    .c4.can .c4-col:hover { background: rgba(255, 255, 255, .08); }
    .c4-cell { position: relative; }
    .c4-cell::before, .disc {
      content: ""; position: absolute; left: 10%; top: 50%;
      width: 80%; aspect-ratio: 1; margin-top: -40%;
      border-radius: 50%;
    }
    .c4-cell::before { background: var(--hole); box-shadow: inset 0 3px 0 rgba(0, 0, 0, .22); }
    .disc {
      background: var(--c0);
      box-shadow: inset 0 -5px 0 rgba(0, 0, 0, .2), inset 0 3px 0 rgba(255, 255, 255, .25);
      animation: c4drop .44s cubic-bezier(.4, 0, .3, 1.18) both;
    }
    .disc.d1 { background: var(--c1); }
    .c4.over .disc:not(.win) { opacity: .38; transition: opacity .4s .2s; }
    .disc.win { animation: c4drop .44s cubic-bezier(.4, 0, .3, 1.18) both, c4win 1s .45s ease-in-out infinite alternate; }
    @keyframes c4drop { from { transform: translateY(calc(var(--fall) * -125%)); } }
    @keyframes c4win { to { box-shadow: inset 0 -5px 0 rgba(0, 0, 0, .2), 0 0 0 4px var(--hole); } }
  `);

  function thumb() {
    const discs = { '3,5': 0, '3,4': 1, '2,5': 1, '4,5': 0, '4,4': 0, '4,3': 1, '5,5': 1, '2,4': 0, '3,3': 0 };
    let s = '<svg viewBox="0 0 70 62" aria-hidden="true"><rect width="70" height="62" rx="9" fill="var(--board)"/>';
    for (let c = 0; c < 7; c++) for (let r = 0; r < 6; r++) {
      const k = discs[`${c},${r}`];
      const fill = k === 0 ? 'var(--p-coral)' : k === 1 ? 'var(--p-blue)' : 'var(--hole)';
      s += `<circle cx="${6.5 + c * 9.5}" cy="${7 + r * 9.6}" r="3.7" fill="${fill}"/>`;
    }
    return s + '</svg>';
  }

  function create(root, api) {
    const P = api.players;
    const board = new Int8Array(COLS * ROWS);
    const h = new Int8Array(COLS);
    let cur = 0, moves = 0, over = false, lock = false;

    root.innerHTML = `<div class="c4" style="--c0:var(--p-${P[0].color});--c1:var(--p-${P[1].color})">
      <div class="c4-grid">${Array.from({ length: COLS }, (_, c) => `<button class="c4-col" data-col="${c}" aria-label="Spalte ${c + 1}">${'<span class="c4-cell"></span>'.repeat(ROWS)}</button>`).join('')}</div>
    </div>`;
    const wrap = root.firstElementChild;
    const cols = [...wrap.querySelectorAll('.c4-col')];
    const cell = (c, r) => cols[c].children[ROWS - 1 - r];

    function lineAt(c, r, p) {
      for (const [dc, dr] of DIRS) {
        const cells = [[c, r]];
        for (const s of [1, -1]) {
          for (let k = 1; k < 4; k++) {
            const cc = c + dc * k * s, rr = r + dr * k * s;
            if (cc < 0 || cc >= COLS || rr < 0 || rr >= ROWS || board[cc * ROWS + rr] !== p) break;
            cells.push([cc, rr]);
          }
        }
        if (cells.length >= 4) return cells;
      }
      return null;
    }
    function fours(c, r, p) {
      for (const [dc, dr] of DIRS) {
        let n = 1;
        for (const s of [1, -1]) {
          for (let k = 1; k < 4; k++) {
            const cc = c + dc * k * s, rr = r + dr * k * s;
            if (cc < 0 || cc >= COLS || rr < 0 || rr >= ROWS || board[cc * ROWS + rr] !== p) break;
            n++;
          }
        }
        if (n >= 4) return true;
      }
      return false;
    }
    function canWin(c, p) {
      if (h[c] >= ROWS) return false;
      const i = c * ROWS + h[c];
      board[i] = p;
      const w = fours(c, h[c], p);
      board[i] = 0;
      return w;
    }

    /* KI */
    function evaluate(p) {
      const o = 3 - p;
      let s = 0;
      for (let r = 0; r < ROWS; r++) {
        const v = board[3 * ROWS + r];
        if (v === p) s += 3; else if (v === o) s -= 3;
      }
      for (const w of WINDOWS) {
        let mp = 0, op = 0;
        for (const i of w) { const v = board[i]; if (v === p) mp++; else if (v === o) op++; }
        if (mp && op) continue;
        if (mp === 3) s += 6; else if (mp === 2) s += 2;
        if (op === 3) s -= 5; else if (op === 2) s -= 2;
      }
      return s;
    }
    function negamax(depth, alpha, beta, p) {
      let any = false;
      for (const c of ORDER) {
        if (h[c] < ROWS) { any = true; if (canWin(c, p)) return 100000 + depth; }
      }
      if (!any) return 0;
      if (depth === 0) return evaluate(p);
      let best = -Infinity;
      for (const c of ORDER) {
        if (h[c] >= ROWS) continue;
        const i = c * ROWS + h[c];
        board[i] = p; h[c]++;
        const v = -negamax(depth - 1, -beta, -alpha, 3 - p);
        h[c]--; board[i] = 0;
        if (v > best) { best = v; if (v > alpha) { alpha = v; if (alpha >= beta) break; } }
      }
      return best;
    }
    function aiMove(level) {
      const me = cur + 1, op = 3 - me;
      const legal = ORDER.filter((c) => h[c] < ROWS);
      if (level === 1) {
        const win = legal.find((c) => canWin(c, me));
        if (win != null && Math.random() < 0.85) return win;
        const block = legal.find((c) => canWin(c, op));
        if (block != null && Math.random() < 0.5) return block;
        const weights = legal.map((c) => 4 - Math.abs(3 - c));
        let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
        for (let k = 0; k < legal.length; k++) { roll -= weights[k]; if (roll <= 0) return legal[k]; }
        return legal[0];
      }
      const win = legal.find((c) => canWin(c, me));
      if (win != null) return win;
      const depth = level === 2 ? 4 : 7;
      let best = legal[0], bestV = -Infinity, alpha = -Infinity;
      for (const c of legal) {
        const i = c * ROWS + h[c];
        board[i] = me; h[c]++;
        let v = -negamax(depth - 1, -Infinity, -alpha, op);
        h[c]--; board[i] = 0;
        if (level === 2) v += Math.random() * 10 - 5;
        if (v > bestV) { bestV = v; best = c; }
        if (v > alpha) alpha = v;
      }
      return best;
    }

    /* Spielablauf */
    function drop(c) {
      const r = h[c];
      board[c * ROWS + r] = cur + 1;
      h[c]++;
      moves++;
      const d = document.createElement('i');
      d.className = `disc d${cur}`;
      d.style.setProperty('--fall', ROWS - r);
      cell(c, r).append(d);
      api.sfx('drop');
      api.buzz(12);
      const line = lineAt(c, r, cur + 1);
      if (line) {
        over = true;
        wrap.classList.add('over');
        line.forEach(([cc, rr]) => cell(cc, rr).firstElementChild?.classList.add('win'));
        const p = P[cur];
        api.status(p.ai ? 'Die KI hat vier in einer Reihe.' : `${p.name} hat vier in einer Reihe!`);
        api.finish({ winner: cur, detail: `Vier in einer Reihe nach ${moves} Steinen.`, delay: 1300 });
        return;
      }
      if (moves === COLS * ROWS) {
        over = true;
        api.status('Das Brett ist voll.');
        api.finish({ winner: null, detail: 'Das Brett ist voll, niemand hat vier in einer Reihe.' });
        return;
      }
      cur = 1 - cur;
      next();
    }
    function next() {
      const p = P[cur];
      api.turn(cur);
      wrap.classList.toggle('can', !p.ai);
      if (p.ai) {
        api.status('Die KI überlegt …');
        lock = true;
        api.later(() => {
          const c = aiMove(p.level);
          lock = false;
          if (!over) drop(c);
        }, 480 + Math.random() * 280);
      } else {
        api.status(`${p.name} ist am Zug`);
      }
    }

    wrap.addEventListener('click', (e) => {
      const col = e.target.closest('.c4-col');
      if (!col || over || lock || P[cur].ai) return;
      const c = +col.dataset.col;
      if (h[c] >= ROWS) { api.sfx('miss'); return; }
      lock = true;
      api.later(() => (lock = false), 240);
      drop(c);
    });

    next();
    return { destroy() { over = true; } };
  }

  CC.register({
    id: 'connect4',
    name: 'Vier gewinnt',
    tagline: 'Vier in einer Reihe. Ganz einfach, oder?',
    color: 'coral',
    minutes: '3–8',
    modes: ['ai', 'duo'],
    thumb: thumb(),
    rules: [
      'Werft abwechselnd Steine in eine Spalte.',
      'Vier eigene Steine in einer Reihe gewinnen: waagrecht, senkrecht oder diagonal.',
      'Bei der Revanche beginnt der andere.',
    ],
    create,
  });
})();
