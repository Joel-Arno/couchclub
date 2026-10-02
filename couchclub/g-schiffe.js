/* Couchclub — Schiffe versenken */
(() => {
  'use strict';
  const N = 10, NN = N * N;
  const FLEET = [
    { len: 5, name: 'Flugzeugträger' },
    { len: 4, name: 'Schlachtschiff' },
    { len: 3, name: 'Kreuzer' },
    { len: 3, name: 'U-Boot' },
    { len: 2, name: 'Zerstörer' },
  ];
  const TOTAL = FLEET.reduce((a, s) => a + s.len, 0);
  const rc = (i) => [(i / N) | 0, i % N];
  const at = (r, c) => (r < 0 || c < 0 || r >= N || c >= N ? -1 : r * N + c);
  const around = (i) => { const [r, c] = rc(i), out = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const j = at(r + dr, c + dc); if (j >= 0 && j !== i) out.push(j); } return out; };
  const cross = (i) => { const [r, c] = rc(i); return [at(r - 1, c), at(r + 1, c), at(r, c - 1), at(r, c + 1)].filter((j) => j >= 0); };
  const rnd = (n) => (Math.random() * n) | 0;
  const pick = (a) => a[rnd(a.length)];

  /* Ein Schiff: Startfeld, Länge, waagrecht? → Felder (oder null, wenn es nicht aufs Brett passt) */
  function cellsOf(start, len, hor) {
    const [r, c] = rc(start);
    if (hor ? c + len > N : r + len > N) return null;
    return Array.from({ length: len }, (_, k) => (hor ? at(r, c + k) : at(r + k, c)));
  }
  /* Schiffe dürfen sich nicht berühren, auch nicht über Eck */
  function fits(cells, others) {
    if (!cells) return false;
    const block = new Set();
    others.forEach((s) => s.forEach((i) => { block.add(i); around(i).forEach((j) => block.add(j)); }));
    return cells.every((i) => !block.has(i));
  }
  function randomFleet() {
    for (let tries = 0; tries < 200; tries++) {
      const ships = [];
      let ok = true;
      for (const f of FLEET) {
        let placed = null;
        for (let k = 0; k < 300 && !placed; k++) {
          const cells = cellsOf(rnd(NN), f.len, Math.random() < 0.5);
          if (fits(cells, ships)) placed = cells;
        }
        if (!placed) { ok = false; break; }
        ships.push(placed);
      }
      if (ok) return ships;
    }
    return null;
  }
  function validFleet(ships) {
    if (!Array.isArray(ships) || ships.length !== FLEET.length) return false;
    const done = [];
    for (let k = 0; k < FLEET.length; k++) {
      const s = ships[k];
      if (!Array.isArray(s) || s.length !== FLEET[k].len || !s.every((i) => Number.isInteger(i) && i >= 0 && i < NN)) return false;
      const sorted = [...s].sort((a, b) => a - b);
      const hor = sorted.length < 2 || sorted[1] - sorted[0] === 1;
      const want = cellsOf(sorted[0], s.length, hor);
      if (!want || want.some((x, j) => x !== sorted[j]) || !fits(sorted, done)) return false;
      done.push(sorted);
    }
    return true;
  }

  /* ---------- Spielregeln (läuft lokal oder beim Gastgeber) ---------- */
  function newGame(again) {
    return {
      phase: 'place', again, cur: 0, winner: null, turns: 0,
      ships: [null, null],
      ready: [false, false],
      shots: [new Array(NN).fill(0), new Array(NN).fill(0)],   // shots[p]: was Spieler p beim Gegner weiß. 0 offen, 1 Wasser, 2 Treffer, 3 versenkt
      sunk: [[], []],                                          // sunk[p]: Schiffe, die p beim Gegner versenkt hat (Felder)
      hits: [0, 0],
      fired: [0, 0],
      last: null,
    };
  }
  function place(G, p, ships) {
    if (G.phase !== 'place' || G.ready[p] || !validFleet(ships)) return false;
    G.ships[p] = ships.map((s) => [...s].sort((a, b) => a - b));
    G.ready[p] = true;
    if (G.ready[0] && G.ready[1]) G.phase = 'battle';
    return true;
  }
  /* Schuss von p auf Feld i → 'miss' | 'hit' | 'sunk' | null */
  function fire(G, p, i) {
    if (G.phase !== 'battle' || G.cur !== p || !(i >= 0 && i < NN) || G.shots[p][i]) return null;
    const o = 1 - p, sh = G.shots[p];
    const ship = G.ships[o].find((s) => s.includes(i));
    G.turns++;
    G.fired[p]++;
    let res;
    if (!ship) { sh[i] = 1; res = 'miss'; }
    else {
      sh[i] = 2; G.hits[p]++;
      if (ship.every((j) => sh[j] >= 2)) {
        ship.forEach((j) => { sh[j] = 3; around(j).forEach((k) => { if (!sh[k]) sh[k] = 1; }); });
        G.sunk[p].push(ship);
        res = 'sunk';
      } else res = 'hit';
    }
    G.last = { by: p, i, res, len: ship ? ship.length : 0 };
    if (G.hits[p] === TOTAL) { G.phase = 'over'; G.winner = p; }
    else if (res === 'miss' || !G.again) G.cur = o;
    return res;
  }

  /* ---------- KI ---------- */
  function aiShot(G, p, level) {
    const sh = G.shots[p];
    const open = [];
    for (let i = 0; i < NN; i++) if (!sh[i]) open.push(i);
    const hits = open.length ? [...Array(NN).keys()].filter((i) => sh[i] === 2) : [];
    if (level === 1) {
      if (hits.length && Math.random() < 0.6) {
        const near = hits.flatMap(cross).filter((j) => !sh[j]);
        if (near.length) return pick(near);
      }
      return pick(open);
    }
    if (level === 2) {
      if (hits.length) {
        // Treffer in einer Reihe verlängern, sonst Nachbarn probieren
        const line = [];
        for (const h of hits) {
          const [r, c] = rc(h);
          for (const [dr, dc] of [[0, 1], [1, 0]]) {
            if (hits.includes(at(r + dr, c + dc))) {
              let a = h; while (sh[at(rc(a)[0] - dr, rc(a)[1] - dc)] === 2) a = at(rc(a)[0] - dr, rc(a)[1] - dc);
              let b = h; while (sh[at(rc(b)[0] + dr, rc(b)[1] + dc)] === 2) b = at(rc(b)[0] + dr, rc(b)[1] + dc);
              [at(rc(a)[0] - dr, rc(a)[1] - dc), at(rc(b)[0] + dr, rc(b)[1] + dc)].forEach((j) => { if (j >= 0 && !sh[j]) line.push(j); });
            }
          }
        }
        if (line.length) return pick(line);
        const near = hits.flatMap(cross).filter((j) => !sh[j]);
        if (near.length) return pick(near);
      }
      const even = open.filter((i) => (rc(i)[0] + rc(i)[1]) % 2 === 0);
      return pick(even.length ? even : open);
    }
    // Stufe 3: Wahrscheinlichkeit, dass ein noch schwimmendes Schiff auf dem Feld liegt
    const left = FLEET.map((f) => f.len);
    G.sunk[p].forEach((s) => { const k = left.indexOf(s.length); if (k >= 0) left.splice(k, 1); });
    const heat = new Float64Array(NN);
    for (const len of left) {
      for (let s = 0; s < NN; s++) for (const hor of [true, false]) {
        const cells = cellsOf(s, len, hor);
        if (!cells || cells.some((i) => sh[i] === 1 || sh[i] === 3)) continue;
        const covered = cells.filter((i) => sh[i] === 2).length;
        const w = covered ? 1 + covered * 40 : 1;
        cells.forEach((i) => { if (!sh[i]) heat[i] += w; });
      }
    }
    let best = -1, bestV = -1;
    for (const i of open) {
      const v = heat[i] + Math.random() * 0.5;
      if (v > bestV) { bestV = v; best = i; }
    }
    return best >= 0 ? best : pick(open);
  }

  /* ---------- Darstellung ---------- */
  CC.css(`
    .sv { width: 100cqw; height: 100cqh; display: grid; gap: 8px; grid-template-rows: minmax(0, 1.7fr) minmax(0, 1fr); }
    .sv.placing { grid-template-rows: minmax(0, 1fr) auto; }
    @container (min-aspect-ratio: 5/4) { .sv:not(.placing) { grid-template-rows: none; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); } }
    .sv-part { container-type: size; min-height: 0; min-width: 0; display: grid; justify-items: center; align-content: center; gap: 4px; }
    .sv-label { font: 650 12px/1 var(--font-body); letter-spacing: .08em; text-transform: uppercase; color: var(--ink-2); display: flex; gap: 8px; align-items: center; }
    .sv-label b { color: var(--ink); letter-spacing: .02em; text-transform: none; font-size: 13px; }
    .sv-board {
      --s: min(100cqw, 100cqh - 18px);
      width: var(--s); height: var(--s);
      display: grid; grid-template-columns: repeat(10, 1fr); gap: 2px; padding: 3px;
      border-radius: 12px;
      background: color-mix(in srgb, var(--p-blue) 22%, var(--sunk));
      touch-action: manipulation;
    }
    .sv-board.target { cursor: crosshair; box-shadow: 0 0 0 3px color-mix(in srgb, var(--pc, var(--p-blue)) 60%, transparent); }
    .sv-board.idle { opacity: .72; }
    .sv-cell {
      position: relative; border-radius: 3px;
      background: color-mix(in srgb, var(--p-blue) 9%, var(--surface));
      display: grid; place-items: center;
    }
    .sv-board.target .sv-cell.o:hover { background: color-mix(in srgb, var(--pc, var(--p-blue)) 28%, var(--surface)); }
    .sv-cell.ship { background: color-mix(in srgb, var(--sc, var(--ink)) 72%, var(--surface)); }
    .sv-cell.ship.sel { background: var(--sc, var(--ink)); box-shadow: 0 0 0 2px var(--ink); z-index: 1; }
    .sv-cell.m::after { content: ""; width: 26%; aspect-ratio: 1; border-radius: 50%; background: color-mix(in srgb, var(--p-blue) 55%, var(--ink-3)); }
    .sv-cell.h { background: color-mix(in srgb, var(--p-coral) 26%, var(--surface)); }
    .sv-cell.h::after, .sv-cell.k::after {
      content: ""; width: 58%; aspect-ratio: 1;
      background: linear-gradient(45deg, transparent 40%, var(--p-coral) 40% 60%, transparent 60%), linear-gradient(-45deg, transparent 40%, var(--p-coral) 40% 60%, transparent 60%);
    }
    .sv-cell.k { background: color-mix(in srgb, var(--ink) 78%, var(--p-coral)); }
    .sv-cell.k::after { background: linear-gradient(45deg, transparent 40%, #fff 40% 60%, transparent 60%), linear-gradient(-45deg, transparent 40%, #fff 40% 60%, transparent 60%); opacity: .8; }
    .sv-cell.ship.h { background: color-mix(in srgb, var(--p-coral) 45%, var(--sc, var(--ink))); }
    .sv-cell.reveal { box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--ink) 60%, transparent); }
    .sv-cell.new { animation: svpop .45s cubic-bezier(.2, .9, .3, 1.4); }
    @keyframes svpop { from { transform: scale(.3); } }
    .sv-fleet { display: flex; flex-wrap: wrap; gap: 4px 10px; justify-content: center; }
    .sv-fleet span { display: inline-flex; gap: 2px; align-items: center; }
    .sv-fleet i { width: 7px; height: 7px; border-radius: 2px; background: var(--ink-2); }
    .sv-fleet span.down i { background: var(--p-coral); opacity: .45; }
    .sv-dock { display: grid; gap: 10px; justify-items: center; padding-bottom: 2px; }
    .sv-dock .sv-hint { font-size: 14px; color: var(--ink-2); text-align: center; max-width: 36ch; }
    .sv-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
    .sv-wait { font-weight: 650; color: var(--ink-2); text-align: center; }
  `);

  function thumb() {
    let s = '<svg viewBox="0 0 60 60" aria-hidden="true"><rect x="4" y="4" width="52" height="52" rx="8" fill="color-mix(in srgb, var(--p-blue) 22%, var(--surface))"/>';
    for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) s += `<rect x="${7.5 + c * 7.6}" y="${7.5 + r * 7.6}" width="6.4" height="6.4" rx="1.4" fill="var(--surface)" opacity=".75"/>`;
    s += '<rect x="7.5" y="15.1" width="29.2" height="6.4" rx="2" fill="var(--ink)"/>';
    s += '<rect x="45.5" y="22.7" width="6.4" height="21.6" rx="2" fill="var(--ink)"/>';
    s += '<path d="M23 31l6 6M29 31l-6 6" stroke="var(--p-coral)" stroke-width="2.4" stroke-linecap="round"/>';
    s += '<path d="M15 46l6 6M21 46l-6 6" stroke="var(--p-coral)" stroke-width="2.4" stroke-linecap="round"/>';
    s += '<circle cx="41.6" cy="49.4" r="1.6" fill="var(--p-blue)"/><circle cx="34" cy="41.8" r="1.6" fill="var(--p-blue)"/>';
    return s + '</svg>';
  }

  function create(root, api) {
    const P = api.players;
    const online = api.online;
    const isHost = !online || online.host;
    const again = api.opts.again !== false;
    let G = isHost ? newGame(again) : null;      // vollständiger Stand (lokal oder Gastgeber)
    let V = null;                                 // was dieses Handy anzeigt
    let myShips = null;                           // Gast: eigene Flotte
    let over = false, busy = false;
    let viewer = online ? online.me : P.findIndex((p) => !p.ai);
    if (viewer < 0) viewer = 0;
    const hasAI = P.some((p) => p.ai);
    const duo = !online && !hasAI;

    // Aufstellen
    let draft = null, sel = -1;

    root.innerHTML = '<div class="sv"></div>';
    const wrap = root.firstElementChild;

    function boardHTML(kind, cells, color) {
      return `<div class="sv-board ${kind}" style="--pc:var(--p-${color})">${cells.map((cls, i) => `<button class="sv-cell ${cls}" data-i="${i}" tabindex="-1"></button>`).join('')}</div>`;
    }
    function fleetHTML(sunkLens) {
      const left = [...sunkLens];
      return `<div class="sv-fleet">${FLEET.map((f) => { const k = left.indexOf(f.len); const down = k >= 0; if (down) left.splice(k, 1); return `<span class="${down ? 'down' : ''}" title="${f.name}">${'<i></i>'.repeat(f.len)}</span>`; }).join('')}</div>`;
    }

    /* Sicht für ein Handy: eigene Flotte, eigene Schüsse, Schüsse des Gegners */
    function viewFor(p) {
      const o = 1 - p;
      return {
        phase: G.phase, cur: G.cur, winner: G.winner, ready: G.ready.slice(), turns: G.turns, fired: [G.fired[p], G.fired[o]],
        mine: G.shots[p].slice(), theirs: G.shots[o].slice(),
        sunkByMe: G.sunk[p].map((s) => s.length), sunkByThem: G.sunk[o].map((s) => s.length),
        enemy: G.phase === 'over' ? G.ships[o] : G.sunk[p],
        last: G.last,
      };
    }

    function render() {
      if (!V) { wrap.className = 'sv placing'; wrap.innerHTML = '<p class="sv-wait">Verbinde mit dem Spiel …</p>'; return; }
      const me = P[viewer], foe = P[1 - viewer];
      const ships = online ? myShips : G.ships[viewer];
      if (V.phase === 'place' && !V.ready[viewer]) return renderPlace();
      if (V.phase === 'place') {
        wrap.className = 'sv placing';
        wrap.innerHTML = `<div class="sv-part">${boardHTML('idle', shipClasses(ships, V.theirs), me.color)}</div><div class="sv-dock"><p class="sv-wait">Deine Flotte steht. Warte auf ${api.esc(foe.ai ? 'die KI' : foe.name)} …</p></div>`;
        paintShips(wrap.querySelector('.sv-board'), ships, me.color);
        return;
      }
      wrap.className = 'sv';
      const enemyCells = V.mine.map((v) => (v === 1 ? 'm' : v === 2 ? 'h' : v === 3 ? 'k' : 'o'));
      if (V.phase === 'over' && V.enemy) V.enemy.forEach((s) => s.forEach((i) => { if (!V.mine[i]) enemyCells[i] += ' ship reveal'; }));
      const myTurn = V.phase === 'battle' && V.cur === viewer && !busy;
      wrap.innerHTML = `
        <div class="sv-part">
          <span class="sv-label">Meer von <b>${api.esc(foe.ai ? 'KI' : foe.name)}</b></span>
          ${boardHTML(myTurn ? 'target' : 'idle', enemyCells, me.color)}
        </div>
        <div class="sv-part">
          <span class="sv-label">Deine Flotte</span>
          ${boardHTML('own', shipClasses(ships, V.theirs), me.color)}
        </div>`;
      paintShips(wrap.querySelectorAll('.sv-board')[1], ships, me.color);
      if (V.phase === 'over') {
        const b = wrap.querySelectorAll('.sv-board')[0];
        b.querySelectorAll('.ship').forEach((el) => el.style.setProperty('--sc', `var(--p-${foe.color})`));
      }
      if (V.last && !V.lastSeen) {
        V.lastSeen = true;
        const b = wrap.querySelectorAll('.sv-board')[V.last.by === viewer ? 0 : 1];
        b.children[V.last.i]?.classList.add('new');
      }
    }
    function shipClasses(ships, theirs) {
      const cls = new Array(NN).fill('');
      (ships || []).forEach((s) => s.forEach((i) => (cls[i] = 'ship')));
      theirs.forEach((v, i) => { if (v === 1) cls[i] += ' m'; else if (v >= 2) cls[i] += ' h'; });
      return cls;
    }
    function paintShips(board, ships, color) {
      if (!board) return;
      board.querySelectorAll('.ship').forEach((el) => el.style.setProperty('--sc', `var(--p-${color})`));
    }

    function renderPlace() {
      if (!draft) draft = randomFleet();
      const me = P[viewer];
      wrap.className = 'sv placing';
      const cls = new Array(NN).fill('');
      draft.forEach((s, k) => s.forEach((i) => (cls[i] = 'ship' + (k === sel ? ' sel' : ''))));
      wrap.innerHTML = `
        <div class="sv-part"><span class="sv-label">Flotte aufstellen${duo ? ` · <b>${api.esc(me.name)}</b>` : ''}</span>${boardHTML('place', cls, me.color)}</div>
        <div class="sv-dock">
          <p class="sv-hint">${sel >= 0 ? `${FLEET[sel].name} (${FLEET[sel].len}): Tippe auf ein freies Feld, um es dorthin zu legen, oder dreh es.` : 'Tippe auf ein Schiff, um es zu verschieben oder zu drehen. Schiffe dürfen sich nicht berühren.'}</p>
          <div class="sv-actions">
            <button class="btn small ghost" data-sv="turn" ${sel >= 0 ? '' : 'disabled'}>Drehen</button>
            <button class="btn small ghost" data-sv="shuffle">Zufall</button>
            <button class="btn small primary" data-sv="done">Fertig</button>
          </div>
        </div>`;
      paintShips(wrap.querySelector('.sv-board'), draft, me.color);
      wrap.querySelectorAll('.sv-cell.sel').forEach((el) => el.style.setProperty('--sc', `var(--p-${me.color})`));
      api.status(duo ? `${me.name} stellt die Flotte auf` : 'Stell deine Flotte auf');
    }
    function moveSel(start, hor) {
      const len = FLEET[sel].len;
      const others = draft.filter((_, k) => k !== sel);
      const [r, c] = rc(start);
      const s0 = hor ? at(r, Math.min(c, N - len)) : at(Math.min(r, N - len), c);
      const cells = cellsOf(s0, len, hor);
      if (!fits(cells, others)) return false;
      draft[sel] = cells;
      return true;
    }
    const isHor = (s) => s.length < 2 || s[1] - s[0] === 1;

    /* ---------- Ablauf ---------- */
    function sync() {
      if (online) {
        online.publish({ v: [viewFor(0), viewFor(1)] });
        return;
      }
      V = viewFor(viewer);
      render();
      status();
    }
    function status() {
      if (!V) return;
      const me = P[viewer], foe = P[1 - viewer];
      if (V.phase === 'place') return;
      api.turn(V.cur);
      api.score(0, hitsOf(0), 'Treffer');
      api.score(1, hitsOf(1), 'Treffer');
      if (V.phase === 'over') return;
      const L = V.last;
      const said = !L ? '' : L.res === 'miss' ? 'Wasser.' : L.res === 'hit' ? 'Treffer!' : `Versenkt, ein Schiff mit ${L.len} Feldern!`;
      const who = P[V.cur];
      if (V.cur === viewer) api.status(`${said ? said + ' ' : ''}${duo ? `${me.name}, du` : 'Du'} bist dran.`.trim());
      else api.status(`${said ? said + ' ' : ''}${who.ai ? 'Die KI zielt …' : `${foe.name} ist dran.`}`.trim());
    }
    function hitsOf(i) { return V ? (i === viewer ? V.mine : V.theirs).filter((x) => x >= 2).length : 0; }

    function checkEnd() {
      if (!V || V.phase !== 'over' || over) return;
      over = true;
      const w = V.winner;
      const shots = V.fired[w === viewer ? 0 : 1];
      const p = P[w];
      api.status(p.ai ? 'Die KI hat deine Flotte versenkt.' : `${p.name} hat alle Schiffe versenkt!`);
      api.finish({ winner: w, detail: `Alle ${FLEET.length} Schiffe versenkt nach ${shots} Schüssen.`, delay: 1600 });
    }

    function act(p, a) {
      if (!G || G.phase === 'over') return;
      if (a.t === 'place') { if (place(G, p, a.ships)) afterChange(p, null); }
      else if (a.t === 'shot') { const r = fire(G, p, a.i); if (r) afterChange(p, r); }
    }
    function afterChange(p, res) {
      if (online) {
        if (res === null && G.ships[p]) online.tell(p, { ships: G.ships[p] });
        sync();
        return;
      }
      if (duo) return duoFlow(p, res);
      V = viewFor(viewer);
      render(); status();
      if (G.phase === 'over') return checkEnd();
      if (res) { api.sfx(res === 'miss' ? 'miss' : res === 'hit' ? 'place' : 'point'); if (res !== 'miss') api.buzz(res === 'sunk' ? [20, 40, 20] : 15); }
      if (G.phase === 'battle' && P[G.cur].ai) aiTurn();
    }

    function aiTurn() {
      busy = true;
      api.later(() => {
        if (over || !G) return;
        const p = G.cur;
        const i = aiShot(G, p, P[p].level);
        busy = false;
        const r = fire(G, p, i);
        if (r) afterChange(p, r);
      }, 650 + Math.random() * 400);
    }

    /* Zu zweit an einem Handy: Bildschirm verdecken, wenn das Handy wechselt */
    async function duoFlow(p, res) {
      if (G.phase === 'place') {
        viewer = 1 - p; draft = null; sel = -1;
        V = null; render();
        await api.handoff(P[viewer], 'Gleich stellst du deine Flotte auf. Die anderen schauen bitte weg.');
        if (over) return;
        V = viewFor(viewer); render(); return;
      }
      if (res === null) {   // beide aufgestellt
        viewer = G.cur;
        V = null; render();
        await api.handoff(P[viewer], 'Die Schlacht beginnt. Du schießt zuerst.');
        if (over) return;
        V = viewFor(viewer); render(); status(); return;
      }
      V = viewFor(viewer);
      render(); status();
      api.sfx(res === 'miss' ? 'miss' : res === 'hit' ? 'place' : 'point');
      if (res !== 'miss') api.buzz(res === 'sunk' ? [20, 40, 20] : 15);
      if (G.phase === 'over') return checkEnd();
      if (G.cur !== viewer) {
        busy = true; render();
        api.later(async () => {
          if (over) return;
          viewer = G.cur;
          V = null; render();
          await api.handoff(P[viewer], `${P[1 - viewer].name} hat ${res === 'miss' ? 'ins Wasser geschossen' : 'getroffen'}. Jetzt bist du dran.`);
          if (over) return;
          busy = false;
          V = viewFor(viewer); render(); status();
        }, 1100);
      }
    }

    /* Eingaben */
    wrap.addEventListener('click', (e) => {
      if (over) return;
      const btn = e.target.closest('[data-sv]');
      if (btn) {
        const k = btn.dataset.sv;
        if (k === 'shuffle') { draft = randomFleet(); sel = -1; api.sfx('flip'); render(); }
        else if (k === 'turn' && sel >= 0) {
          const s = draft[sel];
          if (moveSel(s[0], !isHor(s))) { api.sfx('tap'); render(); } else { api.sfx('miss'); api.buzz(30); }
        } else if (k === 'done') {
          const ships = draft;
          sel = -1;
          api.sfx('place');
          if (online) { myShips = ships; online.send({ t: 'place', ships }); V = { ...V, ready: V.ready.map((x, i) => x || i === viewer) }; render(); }
          else act(viewer, { t: 'place', ships });
          if (!online && hasAI && G.phase === 'place') {
            const ai = P.findIndex((p) => p.ai);
            place(G, ai, randomFleet());
            afterChange(ai, null);
          }
        }
        return;
      }
      const cell = e.target.closest('.sv-cell');
      if (!cell || !V) return;
      const i = +cell.dataset.i;
      const board = cell.parentElement;
      if (board.classList.contains('place')) {
        const k = draft.findIndex((s) => s.includes(i));
        if (k >= 0) {
          if (k === sel) { if (moveSel(draft[k][0], !isHor(draft[k]))) api.sfx('tap'); else api.sfx('miss'); }
          else { sel = k; api.sfx('tap'); }
          render(); return;
        }
        if (sel >= 0) {
          if (moveSel(i, isHor(draft[sel]))) { api.sfx('place'); render(); } else { api.sfx('miss'); api.buzz(30); }
        }
        return;
      }
      if (!board.classList.contains('target') || busy) return;
      if (V.mine[i]) { api.sfx('miss'); return; }
      if (online) {
        busy = true;
        api.later(() => { if (busy) { busy = false; render(); } }, 2500);
        online.send({ t: 'shot', i });
        cell.classList.add('new');
        render();
      } else act(viewer, { t: 'shot', i });
    });

    /* Mehrere Handys */
    if (online) {
      if (isHost) {
        online.onAction((p, a) => act(p, a));
        online.onLeft((p) => {
          if (over || !G || G.phase === 'over') return;
          G.phase = 'over'; G.winner = 1 - p;
          sync();
        });
        sync();
      }
      online.onPrivate((d) => {
        if (d && validFleet(d.ships)) { myShips = d.ships; if (V) render(); }
      });
      online.onState((st) => {
        const prev = V;
        V = st.v[viewer];
        if (isHost) myShips = G.ships[viewer];
        if (prev && V.last && (!prev.last || prev.turns !== V.turns)) {
          const r = V.last.res;
          api.sfx(r === 'miss' ? 'miss' : r === 'hit' ? 'place' : 'point');
          if (r !== 'miss') api.buzz(r === 'sunk' ? [20, 40, 20] : 15);
        } else if (prev) V.lastSeen = prev.lastSeen;
        busy = false;
        render(); status(); checkEnd();
      });
    } else if (duo) {
      V = null; render();
      api.handoff(P[0], 'Gleich stellst du deine Flotte auf. Die anderen schauen bitte weg.').then(() => { if (!over) { V = viewFor(viewer); render(); } });
    } else {
      V = viewFor(viewer); render();
    }

    return { destroy() { over = true; G = null; } };
  }

  CC.register({
    id: 'schiffe',
    name: 'Schiffe versenken',
    tagline: 'Fünf Schiffe, hundert Felder, ein Volltreffer.',
    color: 'blue',
    minutes: '8–15',
    modes: ['ai', 'duo', 'online'],
    online: [2, 2],
    options: [{ id: 'again', label: 'Nach einem Treffer', default: true, choices: [{ v: true, l: 'Nochmal schießen' }, { v: false, l: 'Abwechselnd' }] }],
    optionLabel: (o) => (o.again === false ? 'abwechselnd' : 'Treffer = nochmal'),
    thumb: thumb(),
    rules: [
      'Stellt eure fünf Schiffe verdeckt auf. Sie dürfen sich nicht berühren, auch nicht über Eck.',
      'Schießt abwechselnd auf das Meer des anderen. Nach einem Treffer darfst du nochmal.',
      'Zu zweit an einem Handy wird der Bildschirm zwischen den Zügen verdeckt. Mit zwei Handys sieht jeder nur sein eigenes Meer.',
      'Wer zuerst alle gegnerischen Schiffe versenkt, gewinnt.',
    ],
    create,
  });
})();
