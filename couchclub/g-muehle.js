/* Couchclub — Mühle */
(() => {
  'use strict';
  const XY = [[0, 0], [3, 0], [6, 0], [1, 1], [3, 1], [5, 1], [2, 2], [3, 2], [4, 2], [0, 3], [1, 3], [2, 3], [4, 3], [5, 3], [6, 3], [2, 4], [3, 4], [4, 4], [1, 5], [3, 5], [5, 5], [0, 6], [3, 6], [6, 6]];
  const ADJ = [[1, 9], [0, 2, 4], [1, 14], [4, 10], [1, 3, 5, 7], [4, 13], [7, 11], [4, 6, 8], [7, 12], [0, 10, 21], [3, 9, 11, 18], [6, 10, 15], [8, 13, 17], [5, 12, 14, 20], [2, 13, 23], [11, 16], [15, 17, 19], [12, 16], [10, 19], [16, 18, 20, 22], [13, 19], [9, 22], [19, 21, 23], [14, 22]];
  const MILLS = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10, 11], [12, 13, 14], [15, 16, 17], [18, 19, 20], [21, 22, 23], [0, 9, 21], [3, 10, 18], [6, 11, 15], [1, 4, 7], [16, 19, 22], [8, 12, 17], [5, 13, 20], [2, 14, 23]];
  const MILLS_AT = XY.map((_, i) => MILLS.filter((m) => m.includes(i)));
  const STONES = 9, DRAW_PLIES = 60;

  /* Stand: b[24] (0 leer, 1/2), hand[2], cur (0/1), quiet (Züge ohne Mühle in der Zugphase), fly (Springen erlaubt) */
  const inMill = (b, i) => b[i] && MILLS_AT[i].some((m) => m.every((k) => b[k] === b[i]));
  const onBoard = (b, p) => { let n = 0; for (let i = 0; i < 24; i++) if (b[i] === p) n++; return n; };
  function removable(b, p) {   // Steine von p, die genommen werden dürfen
    const all = [], free = [];
    for (let i = 0; i < 24; i++) if (b[i] === p) { all.push(i); if (!inMill(b, i)) free.push(i); }
    return free.length ? free : all;
  }
  function stepTargets(S, from) {
    const p = S.cur + 1;
    if (S.fly && onBoard(S.b, p) === 3) { const t = []; for (let i = 0; i < 24; i++) if (!S.b[i]) t.push(i); return t; }
    return ADJ[from].filter((k) => !S.b[k]);
  }
  /* Alle Züge als { from, to, rem } (from -1 beim Setzen, rem -1 ohne Mühle) */
  function allMoves(S) {
    const p = S.cur + 1, o = 3 - p, out = [];
    const pairs = [];
    if (S.hand[S.cur] > 0) { for (let i = 0; i < 24; i++) if (!S.b[i]) pairs.push([-1, i]); }
    else for (let i = 0; i < 24; i++) if (S.b[i] === p) for (const t of stepTargets(S, i)) pairs.push([i, t]);
    for (const [f, t] of pairs) {
      if (f >= 0) S.b[f] = 0;
      S.b[t] = p;
      if (inMill(S.b, t)) for (const r of removable(S.b, o)) out.push({ from: f, to: t, rem: r });
      else out.push({ from: f, to: t, rem: -1 });
      S.b[t] = 0;
      if (f >= 0) S.b[f] = p;
    }
    return out;
  }
  function apply(S, m) {
    const p = S.cur + 1;
    const undo = { m, quiet: S.quiet };
    if (m.from >= 0) S.b[m.from] = 0; else S.hand[S.cur]--;
    S.b[m.to] = p;
    if (m.rem >= 0) { S.b[m.rem] = 0; S.quiet = 0; }
    else if (m.from >= 0) S.quiet++;
    S.cur = 1 - S.cur;
    return undo;
  }
  function undo(S, u) {
    S.cur = 1 - S.cur;
    const p = S.cur + 1, m = u.m;
    if (m.rem >= 0) S.b[m.rem] = 3 - p;
    S.b[m.to] = 0;
    if (m.from >= 0) S.b[m.from] = p; else S.hand[S.cur]++;
    S.quiet = u.quiet;
  }
  /* Ergebnis für den Spieler am Zug: -1 verloren, 0 remis, null offen */
  function outcome(S) {
    const p = S.cur + 1;
    if (onBoard(S.b, p) + S.hand[S.cur] < 3) return -1;
    if (S.quiet >= DRAW_PLIES) return 0;
    if (!S.hand[S.cur]) {
      let any = false;
      for (let i = 0; i < 24 && !any; i++) if (S.b[i] === p && stepTargets(S, i).length) any = true;
      if (!any) return -1;
    }
    return null;
  }

  /* ---------- KI ---------- */
  function evaluate(S) {
    const p = S.cur + 1, o = 3 - p;
    const mine = onBoard(S.b, p) + S.hand[S.cur], theirs = onBoard(S.b, o) + S.hand[1 - S.cur];
    let s = (mine - theirs) * 100;
    for (const m of MILLS) {
      let a = 0, z = 0, e = 0;
      for (const k of m) { if (S.b[k] === p) a++; else if (S.b[k] === o) z++; else e++; }
      if (a === 2 && e === 1) s += 14; else if (z === 2 && e === 1) s -= 16;
      if (a === 3) s += 8; else if (z === 3) s -= 8;
    }
    let mobP = 0, mobO = 0;
    for (let i = 0; i < 24; i++) {
      if (S.b[i] === p) mobP += ADJ[i].filter((k) => !S.b[k]).length;
      else if (S.b[i] === o) mobO += ADJ[i].filter((k) => !S.b[k]).length;
    }
    return s + (mobP - mobO) * 3;
  }
  function search(S, depth, alpha, beta, ctx) {
    if (++ctx.nodes % 1024 === 0 && performance.now() > ctx.until) ctx.stop = true;
    if (ctx.stop) return 0;
    const r = outcome(S);
    if (r === -1) return -10000 - depth;
    if (r === 0) return 0;
    if (depth <= 0) return evaluate(S);
    const ms = allMoves(S);
    ms.sort((a, b) => (b.rem >= 0) - (a.rem >= 0));
    let best = -Infinity;
    for (const m of ms) {
      const u = apply(S, m);
      const v = -search(S, depth - 1, -beta, -alpha, ctx);
      undo(S, u);
      if (ctx.stop) return 0;
      if (v > best) { best = v; if (v > alpha) { alpha = v; if (alpha >= beta) break; } }
    }
    return best;
  }
  function aiMove(S0, level) {
    const S = { b: Int8Array.from(S0.b), hand: S0.hand.slice(), cur: S0.cur, quiet: S0.quiet, fly: S0.fly };
    const ms = allMoves(S);
    if (ms.length === 1) return ms[0];
    if (level === 1 && Math.random() < 0.45) return ms[(Math.random() * ms.length) | 0];
    const ctx = { nodes: 0, stop: false, until: performance.now() + [0, 150, 350, 1000][level] };
    const maxDepth = [0, 1, 3, 8][level];
    let bestMove = ms[0];
    for (let depth = 1; depth <= maxDepth; depth++) {
      let best = null, bv = -Infinity, alpha = -Infinity;
      for (const m of [bestMove, ...ms.filter((x) => x !== bestMove)]) {
        const u = apply(S, m);
        let v = -search(S, depth - 1, -Infinity, -alpha, ctx);
        undo(S, u);
        if (ctx.stop) break;
        if (level < 3) v += Math.random() * (level === 1 ? 60 : 12);
        if (v > bv) { bv = v; best = m; }
        if (v > alpha) alpha = v;
      }
      if (ctx.stop) break;
      if (best) bestMove = best;
    }
    return bestMove;
  }

  /* ---------- Darstellung ---------- */
  const U = 100, PAD = 50;
  const px = (i) => PAD + XY[i][0] * U, py = (i) => PAD + XY[i][1] * U;
  CC.css(`
    .mu { width: min(100cqw, 100cqh - 64px, 620px); max-width: 100%; display: grid; gap: 10px; }
    .mu svg { width: 100%; aspect-ratio: 1; display: block; border-radius: clamp(14px, 3.5cqw, 24px); background: color-mix(in srgb, var(--p-saffron) 14%, var(--surface)); box-shadow: var(--lift); touch-action: manipulation; }
    .mu-line { stroke: var(--ink); stroke-width: 7; fill: none; stroke-linecap: round; opacity: .8; }
    .mu-pt { fill: var(--ink); }
    .mu-hit { fill: transparent; cursor: pointer; }
    .mu-target { fill: color-mix(in srgb, var(--turn) 45%, transparent); pointer-events: none; animation: mupulse 1s ease-in-out infinite alternate; }
    @keyframes mupulse { to { opacity: .5; } }
    .mu-stone { pointer-events: none; transition: transform .28s cubic-bezier(.3, .8, .3, 1.15); }
    .mu-stone circle:first-child { stroke: rgba(0, 0, 0, .25); stroke-width: 3; }
    .mu-stone .ring { fill: none; stroke: rgba(255, 255, 255, .45); stroke-width: 3; }
    .mu-stone.sel circle:first-child { stroke: var(--ink); stroke-width: 7; }
    .mu-stone.kill circle:first-child { stroke: var(--p-coral); stroke-width: 7; stroke-dasharray: 10 7; }
    .mu-stone.new { animation: mupop .3s cubic-bezier(.2, .9, .3, 1.4); }
    .mu-stone.mill circle:first-child { stroke: #fff; stroke-width: 5; }
    @keyframes mupop { from { scale: .3; } }
    .mu-hand { display: flex; justify-content: space-between; gap: 10px; }
    .mu-hand div { display: flex; gap: 3px; flex-wrap: wrap; align-items: center; min-height: 16px; }
    .mu-hand div:last-child { justify-content: flex-end; }
    .mu-hand i { width: 13px; height: 13px; border-radius: 50%; background: var(--pc); box-shadow: inset 0 -2px 0 rgba(0, 0, 0, .2); }
    .mu.still .mu-stone { transition: none; }
  `);

  function thumb() {
    let s = '<svg viewBox="0 0 60 60" aria-hidden="true"><rect x="4" y="4" width="52" height="52" rx="8" fill="color-mix(in srgb, var(--p-saffron) 18%, var(--surface))"/>';
    s += '<g fill="none" stroke="var(--ink)" stroke-width="1.6" opacity=".8"><rect x="10" y="10" width="40" height="40"/><rect x="17" y="17" width="26" height="26"/><rect x="24" y="24" width="12" height="12"/><path d="M30 10v14M30 36v14M10 30h14M36 30h14"/></g>';
    const st = [[10, 10, 'coral'], [30, 10, 'coral'], [50, 10, 'coral'], [17, 43, 'blue'], [36, 30, 'blue'], [43, 43, 'blue'], [24, 24, 'coral']];
    st.forEach(([x, y, c]) => (s += `<circle cx="${x}" cy="${y}" r="4.4" fill="var(--p-${c})"/>`));
    return s + '</svg>';
  }

  function create(root, api) {
    const P = api.players;
    const S = { b: new Int8Array(24), hand: [STONES, STONES], cur: 0, quiet: 0, fly: api.opts.fly !== false };
    let over = false, lock = false, sel = -1, removing = false, last = -1, mills = 0;

    let lines = '';
    [[0, 6], [1, 5], [2, 4]].forEach(([a, b]) => { lines += `<rect class="mu-line" x="${PAD + a * U}" y="${PAD + a * U}" width="${(b - a) * U}" height="${(b - a) * U}"/>`; });
    lines += `<path class="mu-line" d="M${PAD + 3 * U} ${PAD}V${PAD + 2 * U}M${PAD + 3 * U} ${PAD + 4 * U}V${PAD + 6 * U}M${PAD} ${PAD + 3 * U}H${PAD + 2 * U}M${PAD + 4 * U} ${PAD + 3 * U}H${PAD + 6 * U}"/>`;
    root.innerHTML = `<div class="mu ${api.motion ? '' : 'still'}" style="--c0:var(--p-${P[0].color});--c1:var(--p-${P[1].color})">
      <div class="mu-hand"><div style="--pc:var(--c0)"></div><div style="--pc:var(--c1)"></div></div>
      <svg viewBox="0 0 ${6 * U + PAD * 2} ${6 * U + PAD * 2}" role="img" aria-label="Mühlebrett">
        ${lines}
        ${XY.map((_, i) => `<circle class="mu-pt" cx="${px(i)}" cy="${py(i)}" r="11"/>`).join('')}
        <g class="mu-targets"></g><g class="mu-stones"></g>
        ${XY.map((_, i) => `<circle class="mu-hit" data-i="${i}" cx="${px(i)}" cy="${py(i)}" r="46"/>`).join('')}
      </svg>
    </div>`;
    const wrap = root.firstElementChild;
    const svg = wrap.querySelector('svg');
    const gStones = svg.querySelector('.mu-stones');
    const gTargets = svg.querySelector('.mu-targets');
    const hands = wrap.querySelectorAll('.mu-hand div');

    function paint(fresh = -1) {
      const kills = removing ? removable(S.b, 2 - S.cur) : [];
      let s = '';
      for (let i = 0; i < 24; i++) {
        if (!S.b[i]) continue;
        const cls = ['mu-stone', i === sel ? 'sel' : '', kills.includes(i) ? 'kill' : '', i === fresh ? 'new' : '', inMill(S.b, i) ? 'mill' : ''].join(' ');
        s += `<g class="${cls}" style="transform-origin:${px(i)}px ${py(i)}px"><circle cx="${px(i)}" cy="${py(i)}" r="34" fill="var(--c${S.b[i] - 1})"/><circle class="ring" cx="${px(i)}" cy="${py(i)}" r="20"/></g>`;
      }
      gStones.innerHTML = s;
      let t = '';
      if (!removing && !P[S.cur].ai && !over) {
        const targets = sel >= 0 ? stepTargets(S, sel) : S.hand[S.cur] > 0 ? [...Array(24).keys()].filter((i) => !S.b[i]) : [];
        if (sel >= 0 || S.hand[S.cur] > 0) targets.forEach((i) => (t += `<circle class="mu-target" cx="${px(i)}" cy="${py(i)}" r="${sel >= 0 ? 22 : 16}"/>`));
      }
      gTargets.innerHTML = t;
      wrap.style.setProperty('--turn', `var(--c${S.cur})`);
      hands.forEach((el, k) => { el.innerHTML = '<i></i>'.repeat(S.hand[k]); });
      [0, 1].forEach((k) => { const n = onBoard(S.b, k + 1); api.score(k, S.hand[k] ? S.hand[k] + n : n, S.hand[k] ? 'Steine' : n === 3 && S.fly ? 'springt' : 'auf dem Brett'); });
    }

    function phaseText(p) {
      const k = S.cur;
      if (S.hand[k]) return `${p.name} setzt einen Stein`;
      if (S.fly && onBoard(S.b, k + 1) === 3) return `${p.name} darf springen`;
      return `${p.name} zieht`;
    }

    function doMove(m) {
      const p = S.cur;
      apply(S, m);
      last = m.to;
      sel = -1;
      api.sfx(m.rem >= 0 ? 'point' : 'place');
      api.buzz(m.rem >= 0 ? [20, 30, 20] : 10);
      if (m.rem >= 0) mills++;
      paint(m.to);
      if (m.rem >= 0) api.status(`Mühle! ${P[p].ai ? 'Die KI' : P[p].name} nimmt einen Stein.`);
      api.later(next, m.rem >= 0 ? 700 : 200);
      lock = true;
    }

    /* Menschlicher Zug in Schritten: setzen/ziehen, dann bei Mühle einen Stein nehmen */
    let pending = null;
    function humanTo(t) {
      const m = { from: S.hand[S.cur] > 0 ? -1 : sel, to: t, rem: -1 };
      const pl = S.cur + 1;
      if (m.from >= 0) S.b[m.from] = 0;
      S.b[t] = pl;
      const mill = inMill(S.b, t);
      S.b[t] = 0;
      if (m.from >= 0) S.b[m.from] = pl;
      if (!mill) { doMove(m); return; }
      // Stein schon hinstellen, dann nehmen lassen
      pending = m;
      if (m.from >= 0) S.b[m.from] = 0; else S.hand[S.cur]--;
      S.b[t] = pl;
      sel = -1;
      removing = true;
      api.sfx('point');
      api.buzz([20, 30, 20]);
      paint(t);
      const o = P[1 - S.cur];
      api.status(`Mühle! Nimm einen Stein von ${o.ai ? 'der KI' : o.name}.`);
    }
    function humanRemove(r) {
      if (!removable(S.b, 2 - S.cur).includes(r)) { api.sfx('miss'); return; }
      const m = pending;
      pending = null; removing = false;
      // vorläufig gesetzten Stein zurücknehmen und den ganzen Zug regulär ausführen
      const pl = S.cur + 1;
      S.b[m.to] = 0;
      if (m.from >= 0) S.b[m.from] = pl; else S.hand[S.cur]++;
      m.rem = r;
      apply(S, m);
      last = m.to; sel = -1; mills++;
      api.sfx('drop'); api.buzz(25);
      paint();
      lock = true;
      api.later(next, 300);
    }

    function next() {
      lock = false;
      if (over) return;
      const r = outcome(S);
      if (r !== null) return end(r);
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
      } else api.status(phaseText(p));
    }
    function end(r) {
      over = true;
      paint();
      if (r === 0) {
        api.status('Lange keine Mühle mehr.');
        api.finish({ winner: null, detail: `${DRAW_PLIES / 2} Züge pro Seite ohne Mühle, das Spiel endet unentschieden.` });
        return;
      }
      const loser = S.cur, w = 1 - loser;
      const few = onBoard(S.b, loser + 1) + S.hand[loser] < 3;
      const lp = P[loser];
      const lname = lp.ai ? 'Die KI' : lp.name;
      api.status(few ? `${lname} hat nur noch zwei Steine.` : `${lname} kann nicht mehr ziehen.`);
      api.finish({ winner: w, detail: few ? `${lname} hat nur noch zwei Steine. ${mills} Mühlen im ganzen Spiel.` : `${lname} ist eingesperrt und kann nicht mehr ziehen.`, delay: 1200 });
    }

    svg.addEventListener('click', (e) => {
      const hit = e.target.closest('.mu-hit');
      if (!hit || over || lock || P[S.cur].ai) return;
      const i = +hit.dataset.i;
      const me = S.cur + 1;
      if (removing) { humanRemove(i); return; }
      if (S.hand[S.cur] > 0) {
        if (S.b[i]) { api.sfx('miss'); return; }
        humanTo(i);
        return;
      }
      if (S.b[i] === me) {
        sel = stepTargets(S, i).length ? (sel === i ? -1 : i) : -1;
        api.sfx(sel >= 0 ? 'tap' : 'miss');
        paint();
        return;
      }
      if (sel >= 0 && !S.b[i] && stepTargets(S, sel).includes(i)) { humanTo(i); return; }
      api.sfx('miss');
    });

    next();
    return { destroy() { over = true; } };
  }

  CC.register({
    id: 'muehle',
    name: 'Mühle',
    tagline: 'Drei in einer Reihe, und weg ist ein Stein.',
    color: 'saffron',
    minutes: '10–20',
    modes: ['ai', 'duo'],
    options: [{ id: 'fly', label: 'Mit drei Steinen', default: true, choices: [{ v: true, l: 'Springen' }, { v: false, l: 'Normal ziehen' }] }],
    optionLabel: (o) => (o.fly === false ? 'ohne Springen' : 'mit Springen'),
    thumb: thumb(),
    rules: [
      'Jeder hat neun Steine. Erst setzt ihr abwechselnd, dann zieht ihr auf ein freies Nachbarfeld.',
      'Drei eigene Steine auf einer Linie sind eine Mühle: Nimm dem anderen einen Stein, aber keinen aus einer Mühle, solange es andere gibt.',
      'Mit nur noch drei Steinen darfst du auf jedes freie Feld springen.',
      'Wer nur noch zwei Steine hat oder nicht mehr ziehen kann, verliert.',
    ],
    create,
  });
})();
