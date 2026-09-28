/* Couchclub — Punkteboxen (Käsekästchen) */
(() => {
  'use strict';
  const U = 100, PAD = 22;

  CC.css(`
    .bx { width: min(100cqw, 100cqh, 660px); aspect-ratio: 1; max-width: 100%; }
    .bx svg { width: 100%; height: 100%; touch-action: manipulation; cursor: pointer; }
    .bx-guide { stroke: var(--line); stroke-width: 3; stroke-linecap: round; }
    .bx-edge { stroke-width: 10; stroke-linecap: round; stroke-dasharray: 1; animation: bxdraw .22s ease-out both; }
    .bx-ghost { stroke-width: 10; stroke-linecap: round; opacity: .35; pointer-events: none; }
    .bx-dot { fill: var(--ink); }
    .bx-box { animation: bxpop .35s cubic-bezier(.2, .9, .3, 1.3) both; transform-box: fill-box; transform-origin: center; }
    .bx-box text { font: 800 38px var(--font-display); font-stretch: 85%; text-anchor: middle; dominant-baseline: central; }
    @keyframes bxdraw { from { stroke-dashoffset: 1; } }
    @keyframes bxpop { from { transform: scale(.4); opacity: 0; } }
  `);

  function thumb() {
    const g = 14, o = 9;
    let s = '<svg viewBox="0 0 60 60" aria-hidden="true">';
    s += `<rect x="${o + 2}" y="${o + 2}" width="${g - 4}" height="${g - 4}" rx="2" fill="var(--p-coral)" opacity=".35"/>`;
    s += `<rect x="${o + g + 2}" y="${o + 2 * g + 2}" width="${g - 4}" height="${g - 4}" rx="2" fill="var(--p-blue)" opacity=".35"/>`;
    const lines = [[0, 0, 1, 0, 'coral'], [0, 1, 1, 1, 'coral'], [0, 0, 0, 1, 'coral'], [1, 0, 1, 1, 'blue'], [1, 2, 2, 2, 'blue'], [1, 3, 2, 3, 'coral'], [1, 2, 1, 3, 'blue'], [2, 2, 2, 3, 'blue'], [2, 0, 3, 0, 'blue'], [3, 1, 3, 2, 'coral'], [0, 2, 0, 3, 'blue']];
    for (const [a, b, c, d, col] of lines) s += `<line x1="${o + a * g}" y1="${o + b * g}" x2="${o + c * g}" y2="${o + d * g}" stroke="var(--p-${col})" stroke-width="2.6" stroke-linecap="round"/>`;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) s += `<circle cx="${o + x * g}" cy="${o + y * g}" r="2.3" fill="var(--ink)"/>`;
    return s + '</svg>';
  }

  function create(root, api) {
    const P = api.players;
    const N = api.opts.size || 4;
    const R = N, C = N;
    const HN = (R + 1) * C;
    const E = HN + R * (C + 1);
    const B = R * C;

    const edgeGeom = [];
    const edgeBoxes = [];
    const boxEdges = [];
    for (let r = 0; r <= R; r++) for (let c = 0; c < C; c++) {
      edgeGeom.push([c, r, c + 1, r]);
      edgeBoxes.push([r > 0 ? (r - 1) * C + c : -1, r < R ? r * C + c : -1].filter((x) => x >= 0));
    }
    for (let r = 0; r < R; r++) for (let c = 0; c <= C; c++) {
      edgeGeom.push([c, r, c, r + 1]);
      edgeBoxes.push([c > 0 ? r * C + c - 1 : -1, c < C ? r * C + c : -1].filter((x) => x >= 0));
    }
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      boxEdges.push([r * C + c, (r + 1) * C + c, HN + r * (C + 1) + c, HN + r * (C + 1) + c + 1]);
    }

    const taken = new Uint8Array(E);
    const owner = new Int8Array(B);
    const score = [0, 0];
    let cur = 0, over = false, lock = false;

    const size = C * U + PAD * 2;
    const pt = (v) => PAD + v * U;
    let guides = '', dots = '';
    edgeGeom.forEach(([a, b, c, d]) => { guides += `<line class="bx-guide" x1="${pt(a)}" y1="${pt(b)}" x2="${pt(c)}" y2="${pt(d)}"/>`; });
    for (let r = 0; r <= R; r++) for (let c = 0; c <= C; c++) dots += `<circle class="bx-dot" cx="${pt(c)}" cy="${pt(r)}" r="${N > 5 ? 8 : 9.5}"/>`;
    root.innerHTML = `<div class="bx" style="--c0:var(--p-${P[0].color});--c1:var(--p-${P[1].color})">
      <svg viewBox="0 0 ${size} ${size}" role="img" aria-label="Punktefeld ${N} mal ${N}">
        <g>${guides}</g><g class="bx-boxes"></g><g class="bx-edges"></g>
        <line class="bx-ghost" x1="0" y1="0" x2="0" y2="0" visibility="hidden"/>
        <g>${dots}</g>
      </svg>
    </div>`;
    const svg = root.querySelector('svg');
    const gBoxes = svg.querySelector('.bx-boxes');
    const gEdges = svg.querySelector('.bx-edges');
    const ghost = svg.querySelector('.bx-ghost');
    const NS = 'http://www.w3.org/2000/svg';

    /* Regeln */
    const sides = (tk, b) => boxEdges[b].reduce((n, e) => n + (tk[e] ? 1 : 0), 0);
    function capturing(tk) {
      for (let e = 0; e < E; e++) if (!tk[e] && edgeBoxes[e].some((b) => sides(tk, b) === 3)) return e;
      return -1;
    }
    function captureList(tk) {
      const out = [];
      for (let e = 0; e < E; e++) if (!tk[e] && edgeBoxes[e].some((b) => sides(tk, b) === 3)) out.push(e);
      return out;
    }
    function safeList(tk) {
      const out = [];
      for (let e = 0; e < E; e++) if (!tk[e] && edgeBoxes[e].every((b) => sides(tk, b) < 2)) out.push(e);
      return out;
    }
    function freeList(tk) {
      const out = [];
      for (let e = 0; e < E; e++) if (!tk[e]) out.push(e);
      return out;
    }
    function giveaway(e) {
      const t = taken.slice();
      t[e] = 9;
      let n = 0;
      for (let guard = 0; guard < E; guard++) {
        const c = capturing(t);
        if (c < 0) break;
        n += edgeBoxes[c].filter((b) => sides(t, b) === 3).length;
        t[c] = 9;
      }
      return n;
    }
    const rnd = (a) => a[(Math.random() * a.length) | 0];
    function aiMove(level) {
      const caps = captureList(taken);
      const safe = safeList(taken);
      if (level === 1) {
        if (caps.length && Math.random() < 0.65) return rnd(caps);
        return safe.length && Math.random() < 0.5 ? rnd(safe) : rnd(freeList(taken));
      }
      if (caps.length) return caps[0];
      if (safe.length) return rnd(safe);
      const free = freeList(taken);
      if (level === 2) return rnd(free);
      let best = free[0], bv = Infinity;
      for (const e of free) {
        const v = giveaway(e) + Math.random() * 0.1;
        if (v < bv) { bv = v; best = e; }
      }
      return best;
    }

    /* Darstellung */
    function drawEdge(e, p) {
      const [a, b, c, d] = edgeGeom[e];
      const l = document.createElementNS(NS, 'line');
      l.setAttribute('class', 'bx-edge');
      l.setAttribute('pathLength', '1');
      l.setAttribute('x1', pt(a)); l.setAttribute('y1', pt(b));
      l.setAttribute('x2', pt(c)); l.setAttribute('y2', pt(d));
      l.setAttribute('stroke', `var(--c${p})`);
      gEdges.append(l);
    }
    function drawBox(bi, p) {
      const r = (bi / C) | 0, c = bi % C;
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'bx-box');
      const inset = 12;
      g.innerHTML = `<rect x="${pt(c) + inset}" y="${pt(r) + inset}" width="${U - inset * 2}" height="${U - inset * 2}" rx="10" fill="var(--c${p})" opacity=".22"/>
        <text x="${pt(c) + U / 2}" y="${pt(r) + U / 2}" fill="var(--c${p})">${api.esc(P[p].ai ? 'KI' : (P[p].name.trim()[0] || '?').toUpperCase())}</text>`;
      if (P[p].ai) g.querySelector('text').style.fontSize = '30px';
      gBoxes.append(g);
    }

    function take(e) {
      taken[e] = cur + 1;
      drawEdge(e, cur);
      let got = 0;
      for (const b of edgeBoxes[e]) {
        if (!owner[b] && sides(taken, b) === 4) { owner[b] = cur + 1; got++; drawBox(b, cur); }
      }
      if (got) {
        score[cur] += got;
        api.score(cur, score[cur]);
        api.sfx('point');
        api.buzz([15, 30, 15]);
      } else {
        api.sfx('tap');
      }
      if (score[0] + score[1] === B) {
        over = true;
        ghost.setAttribute('visibility', 'hidden');
        const w = score[0] === score[1] ? null : score[0] > score[1] ? 0 : 1;
        api.status('Alle Kästchen sind vergeben.');
        api.finish({ winner: w, detail: w == null ? `Gleichstand: ${score[0]} zu ${score[1]} Kästchen.` : `${Math.max(...score)} zu ${Math.min(...score)} Kästchen.`, delay: 1000 });
        return;
      }
      if (!got) cur = 1 - cur;
      next(got > 0);
    }

    function next(again) {
      api.turn(cur);
      const p = P[cur];
      if (p.ai) {
        api.status(again ? 'Kästchen! Die KI ist nochmal dran.' : 'Die KI überlegt …');
        lock = true;
        ghost.setAttribute('visibility', 'hidden');
        api.later(() => { lock = false; if (!over) take(aiMove(p.level)); }, again ? 420 : 620);
      } else {
        api.status(again ? `Kästchen! ${p.name} ist nochmal dran.` : `${p.name} ist am Zug`);
      }
    }

    function edgeAt(evt) {
      const m = svg.getScreenCTM();
      if (!m) return -1;
      const q = new DOMPoint(evt.clientX, evt.clientY).matrixTransform(m.inverse());
      const gx = (q.x - PAD) / U, gy = (q.y - PAD) / U;
      let best = -1, bd = 0.42;
      const hr = Math.round(gy), hc = Math.floor(gx);
      if (hr >= 0 && hr <= R && hc >= 0 && hc < C) {
        const dist = Math.abs(gy - hr);
        if (dist < bd) { bd = dist; best = hr * C + hc; }
      }
      const vc = Math.round(gx), vr = Math.floor(gy);
      if (vc >= 0 && vc <= C && vr >= 0 && vr < R) {
        const dist = Math.abs(gx - vc);
        if (dist < bd) { bd = dist; best = HN + vr * (C + 1) + vc; }
      }
      return best;
    }

    svg.addEventListener('click', (evt) => {
      if (over || lock || P[cur].ai) return;
      const e = edgeAt(evt);
      if (e < 0 || taken[e]) return;
      lock = true;
      api.later(() => (lock = false), 180);
      ghost.setAttribute('visibility', 'hidden');
      take(e);
    });
    svg.addEventListener('pointermove', (evt) => {
      if (evt.pointerType !== 'mouse' || over || lock || P[cur].ai) return;
      const e = edgeAt(evt);
      if (e < 0 || taken[e]) { ghost.setAttribute('visibility', 'hidden'); return; }
      const [a, b, c, d] = edgeGeom[e];
      ghost.setAttribute('x1', pt(a)); ghost.setAttribute('y1', pt(b));
      ghost.setAttribute('x2', pt(c)); ghost.setAttribute('y2', pt(d));
      ghost.setAttribute('stroke', `var(--c${cur})`);
      ghost.setAttribute('visibility', 'visible');
    });
    svg.addEventListener('pointerleave', () => ghost.setAttribute('visibility', 'hidden'));

    api.score(0, 0);
    api.score(1, 0);
    next(false);
    return { destroy() { over = true; } };
  }

  CC.register({
    id: 'boxes',
    name: 'Punkteboxen',
    tagline: 'Linie für Linie zum eigenen Kästchen.',
    color: 'saffron',
    minutes: '5–12',
    modes: ['ai', 'duo'],
    options: [{ id: 'size', label: 'Spielfeld', default: 4, choices: [{ v: 3, l: '3 × 3' }, { v: 4, l: '4 × 4' }, { v: 6, l: '6 × 6' }] }],
    optionLabel: (o) => `${o.size} × ${o.size}`,
    thumb: thumb(),
    rules: [
      'Zieht abwechselnd eine Linie zwischen zwei benachbarten Punkten.',
      'Wer die vierte Seite eines Kästchens schließt, bekommt es und ist sofort nochmal dran.',
      'Sind alle Kästchen vergeben, gewinnt, wer mehr hat.',
    ],
    create,
  });
})();
