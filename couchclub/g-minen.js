/* Couchclub — Minensuche */
(() => {
  'use strict';
  const SIZES = {
    klein: { w: 8, h: 10, mines: 10, label: 'Klein' },
    mittel: { w: 10, h: 14, mines: 24, label: 'Mittel' },
    gross: { w: 12, h: 18, mines: 45, label: 'Groß' },
  };
  const NUM = ['', 'var(--p-blue)', 'var(--p-teal)', 'var(--p-coral)', 'var(--p-plum)', 'var(--p-rose)', 'var(--p-saffron)', 'var(--ink)', 'var(--ink-2)'];

  CC.css(`
    .ms { --cols: 8; --rows: 10; width: min(100cqw, (100cqh - 70px) * var(--cols) / var(--rows), 560px); max-width: 100%; display: grid; gap: 10px; }
    .ms-grid { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: 2px; padding: 3px; border-radius: 12px; background: var(--sunk); box-shadow: var(--lift); touch-action: manipulation; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
    .ms-c { aspect-ratio: 1; border-radius: 4px; background: color-mix(in srgb, var(--p-plum) 30%, var(--surface)); box-shadow: inset 0 -2px 0 rgba(0, 0, 0, .12); display: grid; place-items: center; font: 800 clamp(11px, calc(68cqw / var(--cols)), 22px)/1 var(--font-display); font-stretch: 90%; transition: background .12s; }
    .ms-c.open { background: var(--surface); box-shadow: none; }
    .ms-c.flag::after { content: ""; width: 54%; height: 54%; background: no-repeat center/100% url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M6 21V3' stroke='%23241C27' stroke-width='2.4' stroke-linecap='round'/%3E%3Cpath d='M7 3.5l12 4.5-12 4.5z' fill='%23DD533B'/%3E%3C/svg%3E"); }
    .ms-c.mine { background: color-mix(in srgb, var(--ink) 12%, var(--surface)); }
    .ms-c.mine::after { content: ""; width: 52%; height: 52%; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #fff6 0 18%, transparent 20%), var(--ink); box-shadow: 0 0 0 2px color-mix(in srgb, var(--ink) 30%, transparent); }
    .ms-c.boom { background: var(--p-coral); }
    .ms-c.wrong { background: color-mix(in srgb, var(--p-coral) 25%, var(--surface)); }
    .ms-c.pop { animation: mspop .25s ease-out; }
    @keyframes mspop { from { transform: scale(.7); } }
    .ms-bar { display: flex; gap: 8px; justify-content: center; }
    .ms-bar .btn[aria-pressed="true"] { background: var(--p-coral); color: #fff; box-shadow: none; }
  `);

  function thumb() {
    let s = '<svg viewBox="0 0 60 60" aria-hidden="true">';
    const open = new Set([5, 6, 7, 9, 10, 11, 13, 14, 15]);
    const num = { 5: [1, 'blue'], 6: [2, 'teal'], 9: [1, 'blue'], 10: [3, 'coral'], 13: [1, 'blue'] };
    for (let i = 0; i < 16; i++) {
      const x = 6 + (i % 4) * 12.4, y = 6 + ((i / 4) | 0) * 12.4;
      s += `<rect x="${x}" y="${y}" width="11" height="11" rx="2.4" fill="${open.has(i) ? 'var(--surface)' : 'color-mix(in srgb, var(--p-plum) 30%, var(--surface))'}"/>`;
      if (num[i]) s += `<text x="${x + 5.5}" y="${y + 8.4}" font-size="8" font-weight="800" text-anchor="middle" fill="var(--p-${num[i][1]})" font-family="sans-serif">${num[i][0]}</text>`;
    }
    s += '<path d="M23.4 21v-8" stroke="var(--ink)" stroke-width="1.3" stroke-linecap="round"/><path d="M24 13l5 2-5 2z" fill="var(--p-coral)"/>';
    s += '<circle cx="48.1" cy="23.5" r="3.4" fill="var(--ink)"/>';
    return s + '</svg>';
  }
  const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  function create(root, api) {
    const size = api.opts.size || 'klein';
    const { w, h, mines } = SIZES[size];
    const n = w * h;
    const mine = new Uint8Array(n), near = new Uint8Array(n), open = new Uint8Array(n), flag = new Uint8Array(n);
    let started = false, over = false, flagMode = false, t0 = 0, opened = 0;
    const nb = (i) => { const r = (i / w) | 0, c = i % w, out = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < h && cc >= 0 && cc < w) out.push(rr * w + cc); } return out; };

    root.innerHTML = `<div class="ms" style="--cols:${w};--rows:${h}">
      <div class="ms-grid">${Array.from({ length: n }, (_, i) => `<button class="ms-c" data-i="${i}" aria-label="Feld ${i + 1}"></button>`).join('')}</div>
      <div class="ms-bar"><button class="btn small ghost" data-ms="flag" aria-pressed="false">Fahne setzen</button></div>
    </div>`;
    const wrap = root.firstElementChild;
    const cells = [...wrap.querySelectorAll('.ms-c')];
    const bFlag = wrap.querySelector('[data-ms="flag"]');

    function lay(safe) {
      const keep = new Set([safe, ...nb(safe)]);
      const pool = [...Array(n).keys()].filter((i) => !keep.has(i));
      for (let k = 0; k < mines; k++) { const j = k + ((Math.random() * (pool.length - k)) | 0); [pool[k], pool[j]] = [pool[j], pool[k]]; mine[pool[k]] = 1; }
      for (let i = 0; i < n; i++) near[i] = nb(i).reduce((a, j) => a + mine[j], 0);
      started = true;
      t0 = performance.now();
      tick();
    }
    function paintCell(i, pop) {
      const el = cells[i];
      el.className = 'ms-c' + (open[i] ? ' open' : '') + (flag[i] && !open[i] ? ' flag' : '') + (pop ? ' pop' : '');
      el.textContent = open[i] && !mine[i] && near[i] ? near[i] : '';
      el.style.color = open[i] ? NUM[near[i]] : '';
    }
    function reveal(i) {
      if (open[i] || flag[i]) return;
      const stack = [i];
      let k = 0;
      while (stack.length) {
        const j = stack.pop();
        if (open[j] || flag[j]) continue;
        open[j] = 1; opened++;
        paintCell(j, api.motion && k++ < 60);
        if (!near[j] && !mine[j]) nb(j).forEach((x) => { if (!open[x]) stack.push(x); });
      }
    }
    function tap(i) {
      if (over) return;
      if (!started) lay(i);
      if (open[i]) {
        // Zahl antippen: passen die Fahnen drumherum, decke den Rest auf
        const around = nb(i);
        if (near[i] && around.filter((j) => flag[j]).length === near[i]) {
          const todo = around.filter((j) => !open[j] && !flag[j]);
          if (!todo.length) return;
          if (todo.some((j) => mine[j])) return boom(todo.find((j) => mine[j]));
          todo.forEach(reveal);
          api.sfx('flip');
          return won();
        }
        return;
      }
      if (flag[i]) return;
      if (mine[i]) return boom(i);
      reveal(i);
      api.sfx(near[i] ? 'tap' : 'flip');
      won();
    }
    function toggleFlag(i) {
      if (over || open[i]) return;
      flag[i] ^= 1;
      paintCell(i, api.motion);
      api.sfx('place');
      api.buzz(15);
      api.score(0, mines - flag.reduce((a, x) => a + x, 0), 'Minen');
    }
    function boom(i) {
      over = true;
      for (let j = 0; j < n; j++) {
        if (mine[j] && !flag[j]) { cells[j].className = 'ms-c open mine' + (j === i ? ' boom' : ''); cells[j].textContent = ''; }
        else if (flag[j] && !mine[j]) cells[j].classList.add('wrong');
      }
      api.buzz([60, 40, 120]);
      const secs = Math.round((performance.now() - t0) / 1000);
      api.status('Boom!');
      api.finish({ fail: true, title: 'Boom!', detail: `Auf eine Mine getreten. ${Math.round((opened / (n - mines)) * 100)} % des Feldes waren schon frei (${clock(secs)} Min.).`, delay: 1300 });
    }
    function won() {
      if (opened < n - mines) return;
      over = true;
      for (let j = 0; j < n; j++) if (mine[j]) { flag[j] = 1; paintCell(j); }
      api.score(0, 0, 'Minen');
      const secs = Math.round((performance.now() - t0) / 1000);
      api.status(`Alle Minen gefunden in ${clock(secs)}`);
      api.finish({ winner: 0, detail: `${SIZES[size].label}: ${mines} Minen in ${clock(secs)} Min.`, best: { key: size, value: secs }, delay: 900 });
    }
    function tick() {
      if (over) return;
      api.status(started ? `${SIZES[size].label} · ${clock(Math.floor((performance.now() - t0) / 1000))}` : 'Tippe ein Feld an. Der erste Tipp ist immer sicher.');
      api.later(tick, 1000);
    }

    // Lang drücken setzt eine Fahne
    let press = null;
    const grid = wrap.querySelector('.ms-grid');
    grid.addEventListener('pointerdown', (e) => {
      const c = e.target.closest('.ms-c');
      if (!c || over) return;
      const i = +c.dataset.i;
      press = { i, done: false, x: e.clientX, y: e.clientY, t: setTimeout(() => { if (press && press.i === i) { press.done = true; toggleFlag(i); } }, 420) };
    });
    const cancel = () => { if (press) clearTimeout(press.t); };
    grid.addEventListener('pointermove', (e) => { if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 12) { cancel(); press = null; } });
    grid.addEventListener('pointercancel', () => { cancel(); press = null; });
    grid.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const c = e.target.closest('.ms-c');
      if (c && !(press && press.done)) toggleFlag(+c.dataset.i);
      if (press) { cancel(); press.done = true; }
    });
    grid.addEventListener('click', (e) => {
      const c = e.target.closest('.ms-c');
      if (!c) return;
      const i = +c.dataset.i;
      const longDone = press && press.done && press.i === i;
      cancel(); press = null;
      if (longDone || over) return;
      if (flagMode && !open[i]) toggleFlag(i);
      else tap(i);
    });
    bFlag.addEventListener('click', () => { flagMode = !flagMode; bFlag.setAttribute('aria-pressed', String(flagMode)); api.sfx('tap'); });

    api.score(0, mines, 'Minen');
    tick();
    return { destroy() { over = true; cancel(); } };
  }

  CC.register({
    id: 'minen',
    name: 'Minensuche',
    tagline: 'Zahlen lesen, Fahnen setzen, nicht explodieren.',
    color: 'plum',
    minutes: '2–10',
    shelf: 'puzzle',
    modes: ['solo'],
    options: [{ id: 'size', label: 'Feld', default: 'klein', choices: Object.entries(SIZES).map(([v, s]) => ({ v, l: `${s.label} · ${s.mines}` })) }],
    optionLabel: (o) => `${SIZES[o.size || 'klein'].label}`,
    thumb: thumb(),
    rules: [
      'Decke alle Felder ohne Mine auf. Eine Zahl sagt, wie viele Minen um das Feld herum liegen.',
      'Lang drücken (oder „Fahne setzen“) markiert eine Mine. Tippst du eine Zahl an, deren Fahnen stimmen, öffnet sich der Rest drumherum.',
      'Der erste Tipp ist immer sicher. Die Zeit zählt als Rekord.',
    ],
    bestText: (b) => Object.keys(SIZES).filter((k) => b[k] != null).map((k) => `${SIZES[k].label} ${clock(b[k])}`).join(' · '),
    create,
  });
})();
