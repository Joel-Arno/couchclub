/* Couchclub — Mega Tic Tac Toe (Ultimate Tic Tac Toe)
   Begriffe im Spiel: das Spielfeld besteht aus 9 kleinen Feldern, jedes Feld aus 9 Kästchen. */
(() => {
  'use strict';
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const POS = [3, 2, 3, 2, 4, 2, 3, 2, 3];
  const PLACE = ['oben links', 'oben in der Mitte', 'oben rechts', 'links in der Mitte', 'in der Mitte', 'rechts in der Mitte', 'unten links', 'unten in der Mitte', 'unten rechts'];

  CC.css(`
    .ut {
      width: min(100cqw, 100cqh, 680px); aspect-ratio: 1; max-width: 100%;
      display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); grid-template-rows: repeat(3, minmax(0, 1fr));
      gap: 2.2%;
    }
    .ut.turn0 { --turn: var(--c0); }
    .ut.turn1 { --turn: var(--c1); }
    .ut-sub {
      position: relative; min-width: 0; min-height: 0;
      display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); grid-template-rows: repeat(3, minmax(0, 1fr));
      padding: 4%; border-radius: clamp(10px, 2.6cqw, 18px);
      background: var(--surface); box-shadow: var(--lift);
      transition: opacity .25s, box-shadow .25s;
    }
    .ut-sub.live { box-shadow: var(--lift), inset 0 0 0 3px var(--turn); }
    .ut.focus .ut-sub:not(.live):not(.won) { opacity: .42; }
    .ut-sub.nudge { animation: utnudge .35s ease-in-out; }
    @keyframes utnudge { 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }
    .ut-cell { position: relative; min-width: 0; min-height: 0; overflow: hidden; }
    .ut-cell:nth-child(3n+1), .ut-cell:nth-child(3n+2) { border-right: 1.5px solid var(--line); }
    .ut-cell:nth-child(-n+6) { border-bottom: 1.5px solid var(--line); }
    .ut-cell.last { background: color-mix(in srgb, var(--lastc) 18%, transparent); }
    .ut-cell svg { position: absolute; inset: 0; margin: auto; width: 66%; height: 66%; overflow: visible; pointer-events: none; }
    .ut-mark { fill: none; stroke-width: 3.4; stroke-linecap: round; stroke-dasharray: 1; animation: utdraw .28s ease-out both; }
    @keyframes utdraw { from { stroke-dashoffset: 1; } }
    .ut-won {
      position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
      background: color-mix(in srgb, var(--wc) 22%, var(--surface));
      animation: fade .3s ease-out;
    }
    .ut-won svg { position: absolute; inset: 0; margin: auto; width: 74%; height: 74%; overflow: visible; }
    .ut-won .ut-mark { stroke-width: 2.6; animation-duration: .45s; }
    .ut-sub.drawn .ut-cell { opacity: .3; }
    .ut-sub.winline { box-shadow: var(--lift), inset 0 0 0 3px var(--wc); }
  `);

  const markSvg = (p) => p === 1
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="ut-mark" pathLength="1" d="M6 6L18 18M18 6L6 18" stroke="var(--c0)"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><circle class="ut-mark" pathLength="1" cx="12" cy="12" r="6.6" stroke="var(--c1)" transform="rotate(-90 12 12)"/></svg>';

  function thumb() {
    let s = '<svg viewBox="0 0 60 60" aria-hidden="true">';
    const won = { 1: 'var(--p-coral)', 6: 'var(--p-blue)' };
    const marks = { 0: [[0, 'x'], [4, 'o']], 2: [[2, 'x'], [6, 'o'], [4, 'x']], 3: [[1, 'o']], 4: [[4, 'x'], [8, 'o']], 5: [[0, 'o'], [5, 'x']], 7: [[3, 'x']], 8: [[4, 'o'], [8, 'x']] };
    for (let b = 0; b < 9; b++) {
      const x = (b % 3) * 21, y = ((b / 3) | 0) * 21;
      s += `<rect x="${x}" y="${y}" width="18" height="18" rx="3.5" fill="${won[b] || 'var(--surface)'}"/>`;
      if (won[b]) {
        s += b === 1
          ? `<path d="M${x + 5} ${y + 5}l8 8m0-8l-8 8" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`
          : `<circle cx="${x + 9}" cy="${y + 9}" r="4.6" fill="none" stroke="#fff" stroke-width="2.4"/>`;
        continue;
      }
      for (const [i, m] of marks[b] || []) {
        const cx = x + 3 + (i % 3) * 6, cy = y + 3 + ((i / 3) | 0) * 6;
        s += m === 'x'
          ? `<path d="M${cx - 1.6} ${cy - 1.6}l3.2 3.2m0-3.2l-3.2 3.2" stroke="var(--p-coral)" stroke-width="1.3" stroke-linecap="round"/>`
          : `<circle cx="${cx}" cy="${cy}" r="1.8" fill="none" stroke="var(--p-blue)" stroke-width="1.3"/>`;
      }
    }
    return s + '</svg>';
  }

  /* ---------- Regeln (ohne DOM, auch für die KI) ---------- */
  // big[b]: 0 = offen, 1/2 = gewonnen von Spieler 1/2, 3 = voll ohne Sieger
  function smallResult(cells, b) {
    const o = b * 9;
    for (const [x, y, z] of LINES) {
      const v = cells[o + x];
      if (v && v === cells[o + y] && v === cells[o + z]) return v;
    }
    for (let i = 0; i < 9; i++) if (!cells[o + i]) return 0;
    return 3;
  }
  function bigLine(big) {
    for (const l of LINES) {
      const v = big[l[0]];
      if ((v === 1 || v === 2) && v === big[l[1]] && v === big[l[2]]) return l;
    }
    return null;
  }
  // 0 = läuft, 1/2 = Sieger, 3 = unentschieden
  function bigResult(big) {
    const l = bigLine(big);
    if (l) return big[l[0]];
    for (let b = 0; b < 9; b++) if (!big[b]) return 0;
    let a = 0, c = 0;
    for (let b = 0; b < 9; b++) { if (big[b] === 1) a++; else if (big[b] === 2) c++; }
    return a > c ? 1 : c > a ? 2 : 3;
  }
  const isFree = (st) => st.next < 0 || st.big[st.next] !== 0;
  function legal(st) {
    const out = [];
    const free = isFree(st);
    for (let b = 0; b < 9; b++) {
      if (st.big[b] || (!free && b !== st.next)) continue;
      for (let i = 0; i < 9; i++) if (!st.cells[b * 9 + i]) out.push(b * 9 + i);
    }
    return out;
  }
  function apply(st, m, p) {
    st.cells[m] = p;
    const b = (m / 9) | 0, i = m % 9;
    if (!st.big[b]) { const r = smallResult(st.cells, b); if (r) st.big[b] = r; }
    st.next = st.big[i] ? -1 : i;
    return bigResult(st.big);
  }
  const clone = (st) => ({ cells: st.cells.slice(), big: st.big.slice(), next: st.next });
  function canWinSmall(cells, b, p) {
    for (let i = 0; i < 9; i++) {
      const m = b * 9 + i;
      if (cells[m]) continue;
      cells[m] = p;
      const r = smallResult(cells, b);
      cells[m] = 0;
      if (r === p) return true;
    }
    return false;
  }

  /* ---------- KI ---------- */
  function heuristic(st, m, me) {
    const op = 3 - me;
    const b = (m / 9) | 0, i = m % 9;
    const sim = clone(st);
    const res = apply(sim, m, me);
    if (res === me) return 1e6;
    let s = POS[i];
    if (sim.big[b] === me && !st.big[b]) s += 90 + POS[b] * 8;
    const probe = st.cells.slice();
    probe[m] = op;
    if (smallResult(probe, b) === op) s += 60 + POS[b] * 6;
    if (isFree(sim)) {
      s -= 35;
      for (let k = 0; k < 9; k++) if (!sim.big[k] && canWinSmall(sim.cells, k, op)) { s -= 40; break; }
    } else if (canWinSmall(sim.cells, sim.next, op)) {
      s -= 65;
    }
    return s + Math.random() * 6;
  }

  function mcts(root, me, budget, later, done) {
    const top = { m: -1, p: 3 - me, parent: null, kids: [], untried: legal(root), n: 0, w: 0 };
    const t0 = performance.now();
    function iterate() {
      const st = clone(root);
      let node = top, toMove = me, res = 0;
      while (!node.untried.length && node.kids.length) {
        const logN = Math.log(node.n);
        let best = null, bv = -Infinity;
        for (const k of node.kids) {
          const v = k.w / k.n + 1.25 * Math.sqrt(logN / k.n);
          if (v > bv) { bv = v; best = k; }
        }
        node = best;
        res = apply(st, node.m, node.p);
        toMove = 3 - node.p;
      }
      if (!res && node.untried.length) {
        const k = (Math.random() * node.untried.length) | 0;
        const m = node.untried[k];
        node.untried[k] = node.untried[node.untried.length - 1];
        node.untried.pop();
        res = apply(st, m, toMove);
        const child = { m, p: toMove, parent: node, kids: [], untried: res ? [] : legal(st), n: 0, w: 0 };
        node.kids.push(child);
        node = child;
        toMove = 3 - toMove;
      }
      while (!res) {
        const moves = legal(st);
        if (!moves.length) { res = 3; break; }
        res = apply(st, moves[(Math.random() * moves.length) | 0], toMove);
        toMove = 3 - toMove;
      }
      for (let n = node; n; n = n.parent) {
        n.n++;
        if (res === n.p) n.w += 1;
        else if (res === 3) n.w += 0.5;
      }
    }
    function slice() {
      const end = performance.now() + 14;
      while (performance.now() < end) for (let k = 0; k < 20; k++) iterate();
      if (performance.now() - t0 < budget) later(slice, 0);
      else {
        let best = top.kids[0];
        for (const k of top.kids) if (k.n > best.n) best = k;
        done(best ? best.m : top.untried[0]);
      }
    }
    slice();
  }

  /* ---------- Spiel ---------- */
  function create(root, api) {
    const P = api.players;
    const st = { cells: new Int8Array(81), big: new Int8Array(9), next: -1 };
    let cur = 0, over = false, lock = false, lastEl = null;
    const who = (k) => (P[k].ai ? 'Die KI' : P[k].name);
    const sign = (k) => (k === 0 ? 'X' : 'O');

    root.innerHTML = `<div class="ut" style="--c0:var(--p-${P[0].color});--c1:var(--p-${P[1].color})">
      ${Array.from({ length: 9 }, (_, b) => `<div class="ut-sub" role="group" aria-label="Feld ${PLACE[b]}">${Array.from({ length: 9 }, (_, i) => `<button class="ut-cell" data-m="${b * 9 + i}" aria-label="Kästchen ${PLACE[i]}, frei"></button>`).join('')}</div>`).join('')}
    </div>`;
    const wrap = root.firstElementChild;
    const subs = [...wrap.querySelectorAll('.ut-sub')];
    const cellEls = [...wrap.querySelectorAll('.ut-cell')];

    function paint() {
      const free = isFree(st);
      wrap.classList.toggle('turn0', cur === 0);
      wrap.classList.toggle('turn1', cur === 1);
      wrap.classList.toggle('focus', !over && !free);
      subs.forEach((el, b) => el.classList.toggle('live', !over && !st.big[b] && (free || b === st.next)));
    }

    function turnText() {
      const p = P[cur];
      if (p.ai) return 'Die KI überlegt …';
      return isFree(st)
        ? `${p.name} (${sign(cur)}) darf in jedes offene Feld setzen`
        : `${p.name} (${sign(cur)}) setzt im Feld ${PLACE[st.next]}`;
    }

    function place(m) {
      const b = (m / 9) | 0, i = m % 9;
      const wasOpen = !st.big[b];
      const res = apply(st, m, cur + 1);
      const el = cellEls[m];
      el.innerHTML = markSvg(cur + 1);
      el.setAttribute('aria-label', `Kästchen ${PLACE[i]}, ${sign(cur)} von ${who(cur)}`);
      lastEl?.classList.remove('last');
      el.classList.add('last');
      el.style.setProperty('--lastc', `var(--c${cur})`);
      lastEl = el;
      api.sfx('place');
      api.buzz(10);

      if (wasOpen && st.big[b]) {
        const v = st.big[b];
        if (v === 3) {
          subs[b].classList.add('drawn');
        } else {
          subs[b].classList.add('won');
          subs[b].style.setProperty('--wc', `var(--c${v - 1})`);
          subs[b].insertAdjacentHTML('beforeend', `<div class="ut-won">${markSvg(v)}</div>`);
          api.sfx('point');
        }
      }

      if (res) return end(res);
      cur = 1 - cur;
      next();
    }

    function end(res) {
      over = true;
      paint();
      const line = bigLine(st.big);
      const count = (v) => st.big.filter((x) => x === v).length;
      if (line) {
        line.forEach((k) => subs[k].classList.add('winline'));
        api.status(`${who(res - 1)} hat drei Felder in einer Reihe!`);
        api.finish({ winner: res - 1, detail: 'Drei gewonnene Felder in einer Reihe.', delay: 1300 });
      } else if (res === 3) {
        api.status('Alle Felder sind entschieden.');
        api.finish({ winner: null, detail: `Keine Dreierreihe und gleich viele gewonnene Felder: ${count(1)} zu ${count(2)}.` });
      } else {
        api.status('Alle Felder sind entschieden.');
        api.finish({ winner: res - 1, detail: `Keine Dreierreihe, aber mehr gewonnene Felder: ${count(res)} zu ${count(3 - res)}.`, delay: 1100 });
      }
    }

    function next() {
      paint();
      api.turn(cur);
      api.status(turnText());
      const p = P[cur];
      if (!p.ai) return;
      lock = true;
      const moves = legal(st);
      const go = (m) => { lock = false; if (!over) place(m); };
      if (p.level === 1) {
        const me = cur + 1;
        const wins = moves.filter((m) => { const s = clone(st); apply(s, m, me); return s.big[(m / 9) | 0] === me; });
        const pool = wins.length && Math.random() < 0.5 ? wins : moves;
        api.later(() => go(pool[(Math.random() * pool.length) | 0]), 550);
      } else if (p.level === 2) {
        let best = moves[0], bv = -Infinity;
        for (const m of moves) { const v = heuristic(st, m, cur + 1); if (v > bv) { bv = v; best = m; } }
        api.later(() => go(best), 600);
      } else {
        api.later(() => mcts(st, cur + 1, 1100, api.later, go), 60);
      }
    }

    let hintTimer = null;
    function hint(text, b) {
      api.status(text);
      api.sfx('miss');
      api.buzz(30);
      if (b != null && api.motion) {
        subs[b].classList.remove('nudge');
        void subs[b].offsetWidth;
        subs[b].classList.add('nudge');
      }
      clearTimeout(hintTimer);
      hintTimer = api.later(() => { if (!over) api.status(turnText()); }, 1800);
    }

    wrap.addEventListener('click', (e) => {
      const el = e.target.closest('.ut-cell');
      if (!el || over || lock || P[cur].ai) return;
      const m = +el.dataset.m;
      const b = (m / 9) | 0;
      if (st.cells[m]) return hint('Dieses Kästchen ist schon belegt.');
      if (st.big[b]) return hint('Dieses Feld ist schon entschieden.');
      if (!isFree(st) && b !== st.next) return hint(`Hier nicht. Du musst im Feld ${PLACE[st.next]} setzen.`, st.next);
      lock = true;
      api.later(() => (lock = false), 200);
      place(m);
    });

    next();
    return { destroy() { over = true; } };
  }

  CC.register({
    id: 'ultimate',
    name: 'Mega Tic Tac Toe',
    tagline: 'Tic Tac Toe im Tic Tac Toe.',
    color: 'blue',
    minutes: '10–20',
    modes: ['ai', 'duo'],
    thumb: thumb(),
    rules: [
      'Das Spielfeld besteht aus 9 kleinen Feldern mit je 9 Kästchen. Drei in einer Reihe gewinnen ein Feld.',
      'Dein Kästchen bestimmt das nächste Feld: Setzt du oben rechts, muss der andere im Feld oben rechts weiterspielen.',
      'Ist dieses Feld schon gewonnen oder voll, darf man in jedes offene Feld setzen.',
      'Drei gewonnene Felder in einer Reihe gewinnen. Ohne Dreierreihe gewinnt am Ende, wer mehr Felder hat.',
    ],
    create,
  });
})();
