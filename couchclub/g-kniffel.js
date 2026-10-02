/* Couchclub — Kniffel */
(() => {
  'use strict';
  const CATS = [
    { n: 'Einser', s: 'Nur Einsen zählen' }, { n: 'Zweier', s: 'Nur Zweien zählen' }, { n: 'Dreier', s: 'Nur Dreien zählen' },
    { n: 'Vierer', s: 'Nur Vieren zählen' }, { n: 'Fünfer', s: 'Nur Fünfen zählen' }, { n: 'Sechser', s: 'Nur Sechsen zählen' },
    { n: 'Dreierpasch', s: 'Drei gleiche: alle Augen' }, { n: 'Viererpasch', s: 'Vier gleiche: alle Augen' },
    { n: 'Full House', s: 'Drei und zwei gleiche: 25' }, { n: 'Kleine Straße', s: 'Vier in Folge: 30' },
    { n: 'Große Straße', s: 'Fünf in Folge: 40' }, { n: 'Kniffel', s: 'Fünf gleiche: 50' }, { n: 'Chance', s: 'Alle Augen' },
  ];
  const BONUS_AT = 63, BONUS = 35;

  function scoreOf(cat, d) {
    const c = [0, 0, 0, 0, 0, 0, 0];
    let sum = 0;
    for (const x of d) { c[x]++; sum += x; }
    if (cat < 6) return c[cat + 1] * (cat + 1);
    const most = Math.max(...c);
    const has = (a) => a.every((x) => c[x]);
    switch (cat) {
      case 6: return most >= 3 ? sum : 0;
      case 7: return most >= 4 ? sum : 0;
      case 8: return c.includes(3) && c.includes(2) ? 25 : 0;
      case 9: return has([1, 2, 3, 4]) || has([2, 3, 4, 5]) || has([3, 4, 5, 6]) ? 30 : 0;
      case 10: return has([1, 2, 3, 4, 5]) || has([2, 3, 4, 5, 6]) ? 40 : 0;
      case 11: return most === 5 ? 50 : 0;
      default: return sum;
    }
  }
  const upperSum = (card) => card.slice(0, 6).reduce((a, x) => a + (x || 0), 0);
  const total = (card) => { const u = upperSum(card); return u + (u >= BONUS_AT ? BONUS : 0) + card.slice(6).reduce((a, x) => a + (x || 0), 0); };

  /* ---------- KI: Erwartungswert über alle Würfelkombinationen ---------- */
  // Würfel als sortierte Mehrfachmenge, Schlüssel zur Basis 7
  const keyOf = (d) => d.slice().sort().reduce((k, x) => k * 7 + x, 0);
  const MULTI = [];        // MULTI[k]: alle Würfe mit k Würfeln als [Würfel, Wahrscheinlichkeit]
  (function build() {
    for (let k = 0; k <= 5; k++) {
      const map = new Map();
      const total6 = 6 ** k;
      const rec = (arr) => {
        if (arr.length === k) { const s = arr.slice().sort(); const key = s.join(''); const e = map.get(key); if (e) e[1]++; else map.set(key, [s, 1]); return; }
        for (let f = 1; f <= 6; f++) { arr.push(f); rec(arr); arr.pop(); }
      };
      rec([]);
      MULTI[k] = [...map.values()].map(([s, n]) => [s, n / total6]);
    }
  })();
  const ALL5 = MULTI[5].map(([s]) => s);
  function keeps(d) {   // alle unterschiedlichen Teilmengen zum Behalten
    const seen = new Map();
    for (let m = 0; m < 32; m++) {
      const k = [];
      for (let i = 0; i < 5; i++) if (m & (1 << i)) k.push(d[i]);
      k.sort();
      const key = k.join('');
      if (!seen.has(key)) seen.set(key, { keep: k, mask: m });
    }
    return [...seen.values()];
  }
  const COST = [2, 5, 8, 11, 14, 17, 15, 9, 18, 22, 25, 12, 22];
  function valueFn(card, weight) {
    const open = CATS.map((_, i) => i).filter((i) => card[i] == null);
    const up = upperSum(card);
    return (d) => {
      let best = -Infinity, cat = open[0];
      for (const i of open) {
        const sc = scoreOf(i, d);
        let v = sc - weight * COST[i];
        if (i < 6) {
          if (up < BONUS_AT) { v += (sc - 3 * (i + 1)) * 1.2; if (up + sc >= BONUS_AT) v += BONUS * 0.8; }
        }
        if (v > best) { best = v; cat = i; }
      }
      return [best, cat];
    };
  }
  function planner(card, weight) {
    const val = valueFn(card, weight);
    const V0 = new Map(), memo = [V0, new Map(), new Map()];
    for (const d of ALL5) V0.set(keyOf(d), val(d)[0]);
    const V = (r, d) => {
      const key = keyOf(d), m = memo[r];
      if (m.has(key)) return m.get(key);
      let best = -Infinity;
      for (const { keep } of keeps(d)) {
        let e = 0;
        for (const [o, pr] of MULTI[5 - keep.length]) e += pr * V(r - 1, keep.concat(o));
        if (e > best) best = e;
      }
      m.set(key, best);
      return best;
    };
    return { val, V };
  }
  const plans = new Map();
  /* Entscheidung für den Zug: { hold: [bool×5] } oder { cat } */
  function aiDecide(G, level) {
    const p = G.cur, card = G.cards[p], d = G.dice, left = 3 - G.roll;
    if (level === 1) {
      const val = valueFn(card, 0);
      if (left > 0) {
        const c = [0, 0, 0, 0, 0, 0, 0];
        d.forEach((x) => c[x]++);
        let face = 6;
        for (let f = 6; f >= 1; f--) if (c[f] > c[face]) face = f;
        const [, cat] = val(d);
        if (scoreOf(cat, d) >= 25 && Math.random() < 0.8) return { cat };
        return { hold: d.map((x) => x === face) };
      }
      const open = CATS.map((_, i) => i).filter((i) => card[i] == null);
      let best = open[0], bv = -1;
      for (const i of open) { const v = scoreOf(i, d) + Math.random() * 4; if (v > bv) { bv = v; best = i; } }
      return { cat: best };
    }
    const pkey = card.join(',') + '|' + level;
    if (!plans.has(pkey)) { plans.clear(); plans.set(pkey, planner(card, level === 2 ? 0.45 : 0.75)); }
    const { val, V } = plans.get(pkey);
    if (left > 0) {
      let best = null, bv = -Infinity;
      for (const { keep, mask } of keeps(d)) {
        let e = 0;
        if (keep.length === 5) e = val(keep)[0];
        else for (const [o, pr] of MULTI[5 - keep.length]) e += pr * V(level === 2 ? 0 : left - 1, keep.concat(o));   // Stufe 2 denkt nur einen Wurf voraus
        if (level === 2) e += Math.random() * 1.5;
        if (e > bv + 1e-9) { bv = e; best = { keep, mask }; }
      }
      if (best.keep.length === 5) return { cat: val(d)[1] };
      return { hold: d.map((_, i) => !!(best.mask & (1 << i))) };
    }
    return { cat: val(d)[1] };
  }

  /* ---------- Regeln (lokal oder beim Gastgeber) ---------- */
  const rollDie = () => 1 + ((Math.random() * 6) | 0);
  function newGame(n) {
    return { n, cur: 0, roll: 0, dice: [1, 2, 3, 4, 5], held: [false, false, false, false, false], cards: Array.from({ length: n }, () => Array(13).fill(null)), gone: Array(n).fill(false), over: false, last: null, rolls: 0 };
  }
  function act(G, p, a) {
    if (G.over || p !== G.cur || !a) return false;
    if (a.t === 'roll') {
      if (G.roll >= 3) return false;
      G.dice = G.dice.map((x, i) => (G.roll && G.held[i] ? x : rollDie()));
      if (!G.roll) G.held = [false, false, false, false, false];
      G.roll++; G.rolls++;
      return true;
    }
    if (a.t === 'hold') {
      if (!G.roll || G.roll >= 3 || !(a.i >= 0 && a.i < 5)) return false;
      G.held[a.i] = !G.held[a.i];
      return true;
    }
    if (a.t === 'holds') {
      if (!G.roll || G.roll >= 3 || !Array.isArray(a.h)) return false;
      G.held = a.h.slice(0, 5).map(Boolean);
      return true;
    }
    if (a.t === 'score') {
      const cat = a.cat;
      if (!G.roll || !(cat >= 0 && cat < 13) || G.cards[p][cat] != null) return false;
      const pts = scoreOf(cat, G.dice);
      G.cards[p][cat] = pts;
      G.last = { p, cat, pts };
      advance(G);
      return true;
    }
    return false;
  }
  function advance(G) {
    G.roll = 0;
    G.held = [false, false, false, false, false];
    for (let k = 1; k <= G.n; k++) {
      const q = (G.cur + k) % G.n;
      if (!G.gone[q] && G.cards[q].some((x) => x == null)) { G.cur = q; return; }
    }
    G.over = true;
  }

  /* ---------- Darstellung ---------- */
  CC.css(`
    .kn { width: min(100cqw, 560px); height: 100cqh; display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 10px; }
    .kn-top { display: grid; gap: 8px; justify-items: center; }
    .kn-dice { display: flex; gap: clamp(6px, 2.4cqw, 12px); justify-content: center; }
    .kn-die {
      --sz: min(15cqw, 64px);
      width: var(--sz); height: var(--sz); border-radius: 22%;
      background: var(--surface); box-shadow: var(--lift), inset 0 -3px 0 rgba(0, 0, 0, .08);
      display: grid; grid-template: repeat(3, 1fr) / repeat(3, 1fr); padding: calc(var(--sz) * .14);
      transition: transform .18s, box-shadow .18s, background .18s;
    }
    .kn-die i { width: 74%; aspect-ratio: 1; border-radius: 50%; background: var(--ink); place-self: center; visibility: hidden; }
    .kn-die.held { transform: translateY(-5px); background: color-mix(in srgb, var(--pc) 16%, var(--surface)); box-shadow: 0 0 0 3px var(--pc), var(--lift); }
    .kn-die.held i { background: var(--pc); }
    .kn-die.blank i { visibility: hidden !important; }
    .kn-die.blank { opacity: .45; }
    .kn-die.roll { animation: knroll .5s cubic-bezier(.3, .8, .3, 1); }
    @keyframes knroll { 0% { transform: rotate(-30deg) scale(.7); } 60% { transform: rotate(12deg) scale(1.06); } }
    .kn-row { display: flex; gap: 8px; align-items: center; justify-content: center; flex-wrap: wrap; }
    .kn-roll { min-width: 190px; }
    .kn-pips { display: flex; gap: 4px; }
    .kn-pips b { width: 8px; height: 8px; border-radius: 50%; background: var(--ink-3); opacity: .3; }
    .kn-pips b.on { opacity: 1; background: var(--pc); }
    .kn-card { overflow: auto; border-radius: var(--r-md); background: var(--surface); box-shadow: var(--lift); overscroll-behavior: contain; }
    .kn-card table { width: 100%; border-collapse: collapse; font-size: 14px; font-variant-numeric: tabular-nums; }
    .kn-card th, .kn-card td { padding: 0 4px; height: 30px; text-align: center; border-top: 1px solid var(--line); }
    .kn-card thead th { position: sticky; top: 0; background: var(--surface); z-index: 1; border-top: 0; height: 40px; }
    .kn-card thead .av { width: 26px; height: 26px; font-size: 12px; margin: 0 auto; }
    .kn-card th:first-child { text-align: left; padding-left: 12px; font-weight: 600; white-space: nowrap; }
    .kn-card th small { display: block; font-size: 10.5px; color: var(--ink-3); font-weight: 500; line-height: 1; }
    .kn-card td.me { background: color-mix(in srgb, var(--pc) 9%, transparent); }
    .kn-card td.opt { color: var(--ink-3); font-style: italic; cursor: pointer; }
    .kn-card td.opt.good { color: var(--pc); font-weight: 700; font-style: normal; }
    .kn-card td.ghost { color: var(--ink-3); font-style: italic; opacity: .7; }
    .kn-card td.opt:hover { background: color-mix(in srgb, var(--pc) 20%, transparent); }
    .kn-card td.zero { color: var(--ink-3); }
    .kn-card td.new { animation: knnew .8s ease-out; }
    @keyframes knnew { from { background: color-mix(in srgb, var(--pc) 45%, transparent); } }
    .kn-card tr.sum th, .kn-card tr.sum td { font-weight: 750; background: var(--sunk); }
    .kn-card tr.total th, .kn-card tr.total td { font: 780 17px var(--font-display); height: 38px; }
    .kn-card .gone { opacity: .4; }
    .kn-help { font-size: 13px; color: var(--ink-2); text-align: center; min-height: 18px; }
  `);

  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const dieHTML = (v) => Array.from({ length: 9 }, (_, k) => `<i style="${PIPS[v].includes(k) ? 'visibility:visible' : ''}"></i>`).join('');

  function thumb() {
    const die = (x, y, v, c = 'var(--surface)', pc = 'var(--ink)', rot = 0) => {
      const pos = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]];
      let s = `<g transform="rotate(${rot} ${x + 10} ${y + 10})"><rect x="${x}" y="${y}" width="20" height="20" rx="5" fill="${c}"/>`;
      PIPS[v].forEach((k) => (s += `<circle cx="${x + 4.5 + pos[k][0] * 5.5}" cy="${y + 4.5 + pos[k][1] * 5.5}" r="1.9" fill="${pc}"/>`));
      return s + '</g>';
    };
    return `<svg viewBox="0 0 60 60" aria-hidden="true">${die(6, 8, 6, 'var(--surface)', 'var(--ink)', -8)}${die(32, 6, 6, 'var(--surface)', 'var(--ink)', 6)}${die(19, 32, 6, 'var(--p-rose)', '#fff', -3)}</svg>`;
  }

  function create(root, api) {
    const P = api.players;
    const online = api.online;
    const isHost = !online || online.host;
    const solo = api.mode === 'solo';
    let G = isHost ? newGame(P.length) : null;
    let V = G;
    let over = false, lock = false, rollAnim = false, seenRolls = 0, seenLast = null, scoredKey = null;
    const me = online ? online.me : -1;

    root.innerHTML = `<div class="kn">
      <div class="kn-top">
        <div class="kn-dice">${[0, 1, 2, 3, 4].map((i) => `<button class="kn-die" data-die="${i}" aria-label="Würfel ${i + 1}"></button>`).join('')}</div>
        <div class="kn-row"><button class="btn primary kn-roll" data-kn="roll">Würfeln</button><span class="kn-pips"><b></b><b></b><b></b></span></div>
        <p class="kn-help"></p>
      </div>
      <div class="kn-card"></div>
    </div>`;
    const wrap = root.firstElementChild;
    const dice = [...wrap.querySelectorAll('.kn-die')];
    const rollBtn = wrap.querySelector('[data-kn="roll"]');
    const pips = [...wrap.querySelectorAll('.kn-pips b')];
    const help = wrap.querySelector('.kn-help');
    const card = wrap.querySelector('.kn-card');

    const mine = () => V && !V.over && (online ? V.cur === me : !P[V.cur].ai);
    const name = (i) => (P[i].ai ? 'Die KI' : P[i].name);

    function paint() {
      if (!V) { help.textContent = 'Verbinde mit dem Spiel …'; return; }
      const cur = V.cur, pc = `var(--p-${P[cur].color})`;
      wrap.style.setProperty('--pc', pc);
      const can = mine() && !lock;
      dice.forEach((el, i) => {
        el.innerHTML = dieHTML(V.dice[i]);
        el.classList.toggle('held', !!(V.roll && V.held[i]));
        el.classList.toggle('blank', !V.roll);
        el.disabled = !(can && V.roll > 0 && V.roll < 3);
        if (rollAnim && !(V.held[i] && V.roll > 1)) { el.classList.remove('roll'); void el.offsetWidth; el.classList.add('roll'); }
      });
      rollAnim = false;
      rollBtn.disabled = !(can && V.roll < 3);
      rollBtn.textContent = V.roll === 0 ? 'Würfeln' : V.roll < 3 ? `Nochmal würfeln (${3 - V.roll})` : 'Eintragen';
      pips.forEach((b, k) => b.classList.toggle('on', k < V.roll));
      help.textContent = V.over ? '' : !mine() ? `${name(cur)} ${P[cur].ai ? 'würfelt' : 'ist dran'} …`
        : V.roll === 0 ? `${online ? 'Du bist' : `${P[cur].name}, du bist`} dran. Würfeln!`
        : V.roll < 3 ? 'Tippe Würfel zum Behalten an oder trag ein Feld ein.' : 'Trag dein Ergebnis in ein freies Feld ein.';
      // Block
      const show = (i, cat) => V.cards[i][cat];
      const head = `<thead><tr><th></th>${P.map((p, i) => `<th class="${V.gone?.[i] ? 'gone' : ''}" style="--pc:var(--p-${p.color})" title="${api.esc(p.name)}">${api.avatar(p)}</th>`).join('')}</tr></thead>`;
      const row = (cat) => `<tr><th scope="row">${CATS[cat].n}<small>${CATS[cat].s}</small></th>${P.map((p, i) => {
        const v = show(i, cat);
        const isNew = V.last && V.last.p === i && V.last.cat === cat && seenLast !== lastKey();
        if (v != null) return `<td class="${i === cur && !V.over ? 'me' : ''} ${v === 0 ? 'zero' : ''} ${isNew ? 'new' : ''}" style="--pc:var(--p-${p.color})">${v === 0 ? '–' : v}</td>`;
        if (i === cur && V.roll > 0 && !V.over) {
          const sc = scoreOf(cat, V.dice);
          return `<td class="me ${mine() ? 'opt' : 'ghost'} ${sc >= [3, 6, 9, 12, 15, 18][cat] || (cat >= 6 && sc) ? 'good' : ''}" ${mine() ? `data-cat="${cat}"` : ''} style="--pc:var(--p-${p.color})">${sc}</td>`;
        }
        return `<td class="${i === cur && !V.over ? 'me' : ''}" style="--pc:var(--p-${p.color})"></td>`;
      }).join('')}</tr>`;
      const sumRow = (label, fn, cls = 'sum') => `<tr class="${cls}"><th scope="row">${label}</th>${P.map((p, i) => `<td>${fn(V.cards[i])}</td>`).join('')}</tr>`;
      card.innerHTML = `<table>${head}<tbody>
        ${[0, 1, 2, 3, 4, 5].map(row).join('')}
        ${sumRow(`Bonus<small>ab ${BONUS_AT} oben: +${BONUS}</small>`, (c) => { const u = upperSum(c); return u >= BONUS_AT ? `+${BONUS}` : `<small style="color:var(--ink-3)">${u}/${BONUS_AT}</small>`; })}
        ${[6, 7, 8, 9, 10, 11, 12].map(row).join('')}
        ${sumRow('Gesamt', total, 'sum total')}
      </tbody></table>`;
      seenLast = lastKey();
      P.forEach((p, i) => api.score(i, total(V.cards[i]), 'Punkte'));
      api.turn(V.over ? -1 : cur);
    }
    const lastKey = () => (V && V.last ? `${V.last.p}:${V.last.cat}:${V.rolls}` : null);

    function changed() {
      if (V.rolls !== seenRolls && V.roll > 0) { rollAnim = api.motion; api.sfx('drop'); api.later(() => api.sfx('flip'), 120); api.buzz(12); }
      seenRolls = V.rolls;
      const lk = V.last ? `${V.last.p}:${V.last.cat}` : null;
      if (lk && lk !== scoredKey) { api.sfx(V.last.pts ? 'point' : 'miss'); api.buzz(V.last.pts ? [15, 30, 15] : 30); }
      scoredKey = lk;
      paint();
      if (V.over) return end();
      if (isHost && !online) aiMaybe();
    }

    /* Lokal oder Gastgeber: Aktion ausführen */
    function doAct(p, a) {
      if (!act(G, p, a)) return false;
      if (online) { online.publish(G); hostAI(); return true; }
      V = G;
      changed();
      return true;
    }

    function aiMaybe() {
      if (over || !P[G.cur].ai || G.over) return;
      lock = true;
      paint();
      const p = G.cur, level = P[p].level;
      api.later(() => {
        if (over || G.cur !== p) return;
        lock = false;
        if (G.roll === 0) { doAct(p, { t: 'roll' }); return; }
        const d = aiDecide(G, level);
        if (d.cat != null) { doAct(p, { t: 'score', cat: d.cat }); return; }
        G.held = d.hold;
        V = G; paint();
        lock = true;
        api.later(() => { lock = false; if (!over && G.cur === p) doAct(p, { t: 'roll' }); }, 650);
      }, G.roll === 0 ? 700 : 900);
    }

    /* Gastgeber spielt für Mitspieler, die weg sind */
    let standIn = null, standing = -1;
    function hostAI() {
      if (!online || !online.host || G.over) return;
      clearTimeout(standIn);
      const p = G.cur;
      if (p === me || (online.isOn(p) && !G.gone[p])) { standing = -1; return; }
      standIn = setTimeout(() => {
        if (over || G.cur !== p || G.over || (online.isOn(p) && !G.gone[p])) return;
        standing = p;
        const d = G.roll === 0 ? { roll: true } : aiDecide(G, 2);
        if (d.roll) act(G, p, { t: 'roll' });
        else if (d.cat != null) act(G, p, { t: 'score', cat: d.cat });
        else { G.held = d.hold; act(G, p, { t: 'roll' }); }
        online.publish(G);
        hostAI();
      }, G.gone[p] || standing === p ? 900 : 20000);
    }

    function end() {
      if (over) return;
      over = true;
      const totals = P.map((_, i) => total(V.cards[i]));
      if (solo) {
        const t = totals[0];
        api.status(`${t} Punkte`);
        api.finish({ winner: 0, title: `${t} Punkte`, detail: t >= 250 ? 'Starke Runde!' : 'Alle 13 Felder sind ausgefüllt.', best: { key: 'punkte', value: t, high: true }, delay: 1100 });
        return;
      }
      const alive = totals.map((t, i) => (V.gone?.[i] ? -1 : t));
      const top = Math.max(...alive);
      const winners = alive.map((t, i) => (t === top ? i : -1)).filter((i) => i >= 0);
      const ranking = P.map((p, i) => ({ p, t: totals[i] })).sort((a, b) => b.t - a.t).map(({ p, t }) => `${api.esc(p.ai ? 'KI' : p.name)} ${t}`).join(' · ');
      api.status(winners.length > 1 ? 'Gleichstand an der Spitze!' : `${name(winners[0])} gewinnt mit ${top} Punkten.`);
      api.finish({ winners: winners.length === P.length ? [] : winners, detail: ranking, delay: 1200 });
    }

    wrap.addEventListener('click', (e) => {
      if (over || lock || !mine()) return;
      const die = e.target.closest('[data-die]');
      const send = (a) => { if (online) online.send(a); else doAct(V.cur, a); };
      if (die) {
        if (!(V.roll > 0 && V.roll < 3)) return;
        const i = +die.dataset.die;
        if (online) { V.held[i] = !V.held[i]; paint(); }
        send({ t: 'hold', i });
        api.sfx('tap');
        return;
      }
      if (e.target.closest('[data-kn="roll"]')) {
        if (V.roll >= 3) return;
        if (online) lock = true, api.later(() => { lock = false; paint(); }, 1500);
        send({ t: 'roll' });
        return;
      }
      const td = e.target.closest('[data-cat]');
      if (td) {
        if (online) lock = true, api.later(() => { lock = false; paint(); }, 1500);
        send({ t: 'score', cat: +td.dataset.cat });
      }
    });

    if (online) {
      online.onState((st) => {
        V = isHost ? G : st;
        lock = false;
        changed();
      });
      if (isHost) {
        online.onAction((p, a) => doAct(p, a));
        online.onLeft((p) => { if (G.over) return; G.gone[p] = true; if (G.cur === p) advance(G); online.publish(G); hostAI(); });
        online.onPresence(() => hostAI());
        online.publish(G);
      }
    } else {
      changed();
    }
    paint();

    return { destroy() { over = true; clearTimeout(standIn); } };
  }

  CC.register({
    id: 'kniffel',
    name: 'Kniffel',
    tagline: 'Fünf Würfel, drei Würfe, dreizehn Felder.',
    color: 'rose',
    minutes: '15–30',
    shelf: 'party',
    modes: ['group', 'ai', 'solo', 'online'],
    group: [2, 6],
    online: [2, 8],
    thumb: thumb(),
    rules: [
      'Du hast pro Zug bis zu drei Würfe. Tippe Würfel an, um sie zu behalten.',
      'Danach trägst du das Ergebnis in ein freies Feld ein, notfalls mit null Punkten.',
      `Oben zählt jede Zahl für sich. Wer dort ${BONUS_AT} Punkte schafft, bekommt ${BONUS} Bonus.`,
      'Nach 13 Runden gewinnt, wer die meisten Punkte hat. Alleine jagst du deinen Rekord.',
    ],
    bestText: (b) => (b.punkte ? `Rekord ${b.punkte} Punkte` : ''),
    create,
  });
})();
