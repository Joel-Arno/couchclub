/* =====================================================================
   LICHTLÄUFER: Daten
   ===================================================================== */
const LW = 360, LR = 11;
const ZONES = [
  { name: 'Tunnel',    len: 9000, mix: [['wall', 5], ['wallMove', 2]],                                            warm: ['#1E3641', '#2B4C5C'], pen: '#2F5DA8' },
  { name: 'Laserfeld', len: 11000, mix: [['laser', 4], ['wall', 2], ['wallMove', 2]],                             warm: ['#271F2E', '#3B2D44'], pen: '#8A3A9C' },
  { name: 'Felssturz', len: 12000, mix: [['blocks', 3], ['spinner', 3], ['wall', 2]],                             warm: ['#1D2620', '#2F3D30'], pen: '#2F7A45' },
  { name: 'Rotorwerk', len: 13000, mix: [['spinner', 3], ['spinner2', 2], ['mines', 3], ['wallMove', 1]],          warm: ['#2B1D17', '#442D24'], pen: '#B5541C' },
  { name: 'Sturm',     len: 15000, mix: [['laser', 2], ['spinner2', 2], ['wallDouble', 2], ['mines', 2], ['blocks', 1], ['wallMove', 2]], warm: ['#171B2B', '#252D48'], pen: '#23467F' }
];
const zoneInfo = z => z < ZONES.length ? ZONES[z] : Object.assign({}, ZONES[4], { name: 'Kern ' + (z - 3), len: 16000 });
const POWERS = {
  shield: { name: 'Schild',   ic: 'shield', dur: 0,  path: 'M24 4l16 6v11c0 11-7 18.5-16 23C15 39.5 8 32 8 21V10z' },
  magnet: { name: 'Magnet',   ic: 'magnet', dur: 8,  path: 'M10 8h9v17a5 5 0 0 0 10 0V8h9v17a14 14 0 0 1-28 0z' },
  slow:   { name: 'Zeitlupe', ic: 'slow',   dur: 5,  path: 'M13 5h22v4c0 6-7 10-7 15s7 9 7 15v4H13v-4c0-6 7-10 7-15s-7-9-7-15z' },
  phase:  { name: 'Geist',    ic: 'phase',  dur: 4.5, path: 'M11 42V22c0-8 6-14 13-14s13 6 13 14v20l-4.3-4-4.4 4-4.3-4-4.3 4-4.4-4z' },
  double: { name: 'Doppelt',  ic: 'double', dur: 10, path: '' }
};
const POWER_IDS = Object.keys(POWERS);
const SKINS = {
  klassik:    { name: 'Klassik',      cost: 0,   core: '#F2C14E', hi: '#FFF4CF', halo: '242,193,78',  trail: 'dots',    paper: 'rgba(244,217,58,.85)' },
  glut:       { name: 'Glut',         cost: 120, core: '#E8703A', hi: '#FFD2A8', halo: '232,112,58',  trail: 'embers',  paper: 'rgba(240,140,70,.8)' },
  frost:      { name: 'Frost',        cost: 180, core: '#9FD8F0', hi: '#FFFFFF', halo: '159,216,240', trail: 'flakes',  paper: 'rgba(120,190,235,.75)' },
  komet:      { name: 'Komet',        cost: 250, core: '#F5F0E6', hi: '#FFFFFF', halo: '245,240,230', trail: 'tail',    paper: 'rgba(190,190,205,.75)' },
  gluehwurm:  { name: 'Glühwurm',     cost: 320, core: '#B6E36B', hi: '#F2FFD6', halo: '182,227,107', trail: 'pulse',   paper: 'rgba(160,220,90,.75)' },
  regenbogen: { name: 'Regenbogen',   cost: 450, core: 'hue',     hi: '#FFFFFF', halo: 'hue',         trail: 'rainbow', paper: 'hue' },
  sternstaub: { name: 'Sternenstaub', cost: 600, core: '#F7E7A1', hi: '#FFFFFF', halo: '247,231,161', trail: 'stars',   paper: 'rgba(244,217,58,.85)' },
  schatten:   { name: 'Schatten',     cost: 800, core: '#2B2B30', hi: '#F2C14E', halo: '242,193,78',  trail: 'smoke',   paper: 'rgba(43,43,48,.55)', ring: true }
};
const MISSIONS = {
  sparks:  { txt: n => `Sammle ${n} Funken in einem Lauf`,         tiers: [25, 40, 60, 90, 130],      run: 'sparks' },
  score:   { txt: n => `Erreiche ${fmt(n)} Punkte in einem Lauf`,  tiers: [800, 1500, 3000, 5000, 8000], run: 'score' },
  near:    { txt: n => `Weiche in einem Lauf ${n}-mal knapp aus`,   tiers: [3, 6, 10, 15, 20],         run: 'near' },
  zone:    { txt: n => `Erreiche Zone ${n}`,                        tiers: [2, 3, 4, 5, 6],            run: 'zoneNo' },
  fever:   { txt: n => n > 1 ? `Löse in einem Lauf ${n}-mal die Überladung aus` : 'Löse die Überladung aus', tiers: [1, 1, 2, 2, 3], run: 'fevers' },
  power:   { txt: n => `Sammle ${n} Power-ups in einem Lauf`,       tiers: [2, 3, 4, 6, 8],            run: 'powers' },
  shatter: { txt: n => `Zertrümmere ${n} Hindernisse in einem Lauf`, tiers: [2, 4, 7, 10, 15],         run: 'shatter' },
  mult:    { txt: n => `Erreiche den Multiplikator ×${n}`,          tiers: [3, 4, 5, 6, 8],            run: 'maxMult' },
  laser:   { txt: n => `Passiere ${n} Laser in einem Lauf`,         tiers: [3, 5, 8, 12, 16],          run: 'lasers' },
  phase:   { txt: n => `Gleite als Geist durch ${n} ${plural(n, 'Hindernis', 'Hindernisse')}`, tiers: [1, 2, 4, 6, 8], run: 'phased' },
  total:   { txt: n => `Sammle insgesamt ${n} Funken`,              tiers: [80, 150, 250, 400, 600],   sum: 'sparks' },
  runs:    { txt: n => `Spiele ${n} Läufe`,                         tiers: [3, 5, 6, 8, 10],           sum: 'runs' }
};
const rankMul = () => 1 + (D.licht.rank - 1) * .05;
const missionReward = () => 15 + D.licht.rank * 5;

/* =====================================================================
   MISSIONEN UND RÄNGE
   ===================================================================== */
function ensureMissions(){
  const L = D.licht, tier = Math.min(4, Math.floor((L.rank - 1) / 2));
  L.missions = L.missions.filter(m => MISSIONS[m.id] && !m.done);
  let guard = 0;
  while (L.missions.length < 3 && guard++ < 50){
    const ids = Object.keys(MISSIONS).filter(id => !L.missions.some(m => m.id === id));
    const id = ids[Math.floor(vr() * ids.length)];
    const target = MISSIONS[id].tiers[tier];
    if (id === 'zone' && target <= 1) continue;
    L.missions.push({ id, target, prog: 0, done: false });
  }
  save();
}
function completeMission(m){
  if (m.done) return;
  m.done = true; m.prog = m.target;
  const L = D.licht, reward = missionReward();
  L.bank += reward; L.missionsDone++; L.rankPts++;
  toast(MISSIONS[m.id].txt(m.target), `Mission erfüllt · +${reward} Funken`, 'spark', 'mission');
  if (L.rankPts >= 3){
    L.rankPts = 0; L.rank++;
    toast(`Rang ${L.rank}`, `Aufgestiegen · Punkte ×${rankMul().toFixed(2).replace('.', ',')}`, 'bolt', 'fever');
    if (L.rank >= 10) unlock('l_rank');
  }
  save();
}
function checkRunMissions(final){
  if (!st) return;
  const vals = { sparks: st.sparks, score: Math.floor(st.score), near: st.near, zoneNo: st.zone + 1, fevers: st.fevers,
                 powers: st.powers, shatter: st.shatter, maxMult: st.maxMult, lasers: st.lasers, phased: st.phased };
  for (const m of D.licht.missions){
    const def = MISSIONS[m.id];
    if (m.done || !def) continue;
    if (def.run){
      m.prog = Math.max(m.prog, Math.min(m.target, vals[def.run]));
      if (vals[def.run] >= m.target) completeMission(m);
    } else if (final){
      m.prog = Math.min(m.target, m.prog + (def.sum === 'sparks' ? st.sparks : 1));
      if (m.prog >= m.target) completeMission(m);
    }
  }
}
function missionsHTML(showDone = true){
  const L = D.licht;
  return `<h4><span>Missionen · Rang ${L.rank}</span><span class="rank-pips" aria-label="${L.rankPts} von 3 zum nächsten Rang">${[0, 1, 2].map(i => `<i class="${i < L.rankPts ? 'on' : ''}"></i>`).join('')}</span></h4>
    ${L.missions.filter(m => showDone || !m.done).map(m => {
      const def = MISSIONS[m.id], p = Math.min(1, m.prog / m.target);
      return `<div class="mission ${m.done ? 'done' : ''}"><p>${m.done ? '✓ ' : ''}${def.txt(m.target)}</p>
        <span class="reward">${icon('spark')}${missionReward()}</span>
        <span class="mbar"><i style="width:${p * 100}%"></i></span>
        ${def.sum ? `<span class="mprog">${fmt(m.prog)} / ${fmt(m.target)}</span>` : ''}</div>`;
    }).join('')}`;
}

/* =====================================================================
   ZUSTAND
   ===================================================================== */
const lcv = $('#lichtCanvas'), lcx = lcv.getContext('2d');
let LH = 640, LSC = 1, LDPR = 1;
let st = null, lRunning = false, lRaf = 0, lLast = 0, lid = 1;
const keys = { l: false, r: false };
const PATHS = {};
function path(d){ if (!PATHS[d]) PATHS[d] = new Path2D(d); return PATHS[d]; }
function circRect(px, py, r, x, y, w, h){
  const nx = clamp(px, x, x + w), ny = clamp(py, y, y + h);
  return Math.hypot(px - nx, py - ny) - r;
}
function segDist(px, py, x1, y1, x2, y2){
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1;
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
function pickMix(list){
  let s = 0; for (const [, w] of list) s += w;
  let r = vr() * s;
  for (const [t, w] of list){ if ((r -= w) < 0) return t; }
  return list[0][0];
}
function lResize(){
  const b = lcv.getBoundingClientRect();
  if (!b.width || !b.height) return;
  LDPR = Math.min(2, window.devicePixelRatio || 1);
  lcv.width = Math.round(b.width * LDPR); lcv.height = Math.round(b.height * LDPR);
  LSC = b.width / LW; LH = b.height / LSC;
  if (st) st.py = LH * .76;
}
function lNew(){
  const up = D.licht.up;
  st = {
    t: 0, clock: 0, dist: 0, speed: 230, score: 0, sparks: 0, combo: 0, comboT: 0, mult: 1, maxMult: 1, near: 0,
    shields: up.shield, inv: 0, px: LW / 2, tx: LW / 2, py: LH * .76,
    obs: [], sp: [], pws: [], parts: [], pops: [], trail: [],
    next: 70, nextPower: 2600 + vr() * 1200, first: true, grace: 0,
    zone: 0, zoneStart: 0, zoneBanner: 0,
    fever: 0, feverT: 0, fevers: 0, shatter: 0, powers: 0, lasers: 0, phased: 0,
    pw: { magnet: 0, slow: 0, phase: 0, double: 0 },
    dead: false, deadT: 0, ended: false, revives: 0, freeRevive: up.revive > 0,
    magnetBase: [0, 45, 75, 110][up.magnet], comboTime: 2.2 + up.glow * .8,
    powerMul: 1 + up.power * .25, feverFill: 1 + up.fever * .2, feverDur: 5 + up.fever,
    hint: !D.tips.lhint, missionT: 0
  };
}

/* =====================================================================
   HINDERNISSE, FUNKEN, POWER-UPS
   ===================================================================== */
function addSparksLine(x, y, n, wall){
  for (let i = 0; i < n; i++) st.sp.push({ x, y: y - i * 26, id: lid++, wall, off: wall ? x - wall.base : 0 });
}
function addSparkPattern(y){
  const kind = vr(), n = vri(3, 5), x0 = 50 + vr() * (LW - 100);
  for (let i = 0; i < n; i++){
    let x = x0;
    if (kind < .35) x = x0 + Math.sin(i * .9) * 40;
    else if (kind < .7) x = x0 + (i % 2 ? 22 : -22);
    st.sp.push({ x: clamp(x, 24, LW - 24), y: y - i * 24, id: lid++ });
  }
}
function spawnRow(){
  const s = st, t = s.t, Z = zoneInfo(s.zone);
  const kind = s.first ? 'wall' : pickMix(Z.mix);
  const gw = Math.max(62, 130 - t * .9 - s.zone * 3);
  const y = -40;
  let extra = 0;
  if (kind === 'wall' || kind === 'wallMove'){
    let base = s.first ? LW / 2 - gw / 2 + (vr() - .5) * 40 : 14 + vr() * (LW - 28 - gw), amp = 0;
    if (kind === 'wallMove'){
      amp = Math.min(40 + vr() * 60, base - 12, LW - 12 - gw - base);
      if (amp < 25){ base = LW / 2 - gw / 2; amp = Math.min(70, LW / 2 - gw / 2 - 12); }
    }
    s.first = false;
    const o = { kind: 'wall', id: lid++, y, h: 22, gw, base, amp, w: 1 + vr() * 1.1 + t * .008, ph: vr() * 6.28, clr: 99 };
    s.obs.push(o);
    addSparksLine(base + gw / 2, y - 34, vri(1, 3), amp ? o : null);
  } else if (kind === 'wallDouble'){
    const g = Math.max(58, gw * .82);
    const a = 14 + vr() * (LW / 2 - 28 - g), b = LW / 2 + 14 + vr() * (LW / 2 - 28 - g);
    s.obs.push({ kind: 'wall', id: lid++, y, h: 22, gw: g, base: a, base2: b, amp: 0, clr: 99 });
    addSparksLine((vr() < .5 ? a : b) + g / 2, y - 34, 2, null);
  } else if (kind === 'laser'){
    const g = Math.max(70, gw);
    const a = 16 + vr() * (LW / 2 - 24 - g), b = LW / 2 + 8 + vr() * (LW / 2 - 24 - g);
    s.obs.push({ kind: 'laser', id: lid++, y, h: 7, gw: g, pos: [a, b], per: Math.max(.8, 1.35 - t * .004), ph: vr(), clr: 99 });
  } else if (kind === 'blocks'){
    const w1 = vri(70, 100), w2 = vri(70, 100), sp = 50 + t * 1.1;
    s.obs.push({ kind: 'block', id: lid++, y, h: 24, x: vri(8, LW / 2 - w1), w: w1, vx: sp, clr: 99 });
    s.obs.push({ kind: 'block', id: lid++, y: y - 70, h: 24, x: vri(LW / 2, LW - 8 - w2), w: w2, vx: -sp, clr: 99 });
    extra = 70;
  } else if (kind === 'spinner'){
    const len = 56 + vr() * 18;
    s.obs.push({ kind: 'spin', id: lid++, y: y - len, x: 80 + vr() * (LW - 160), len, ang: vr() * 6.28, w: (vr() < .5 ? -1 : 1) * (1.5 + t * .01 + vr() * .7), clr: 99 });
    extra = len * 2;
  } else if (kind === 'spinner2'){
    const len = 46, w = 1.6 + t * .01;
    s.obs.push({ kind: 'spin', id: lid++, y: y - len, x: LW * .27, len, ang: vr() * 6.28, w, clr: 99 });
    s.obs.push({ kind: 'spin', id: lid++, y: y - len, x: LW * .73, len, ang: vr() * 6.28, w: -w, clr: 99 });
    extra = len * 2;
  } else if (kind === 'mines'){
    const n = vri(2, 3), mines = [];
    for (let i = 0; i < n; i++) mines.push({ base: (i + .5) * LW / n, amp: 30 + vr() * 25, w: 1.2 + vr() * 1.4, ph: vr() * 6.28, r: 12, x: 0 });
    s.obs.push({ kind: 'mines', id: lid++, y: y - 12, mines, clr: 99 });
    extra = 24;
  }
  s.next = Math.max(150, 240 - t * 1.2 - s.zone * 4) + vr() * 60 + extra;
  if (vr() < .38) addSparkPattern(y - extra - s.next * .45);
}
function spawnPower(){
  const s = st;
  const w = [['shield', s.shields >= 3 ? 0 : 22], ['magnet', 22], ['slow', 18], ['phase', 18], ['double', 20]];
  const type = pickMix(w);
  s.pws.push({ type, x: 40 + vr() * (LW - 80), y: -40 - s.next * .5, id: lid++ });
  s.nextPower = 3600 + vr() * 1800;
}

/* ---------- Geometrie je Hindernis ---------- */
function wallGaps(o){
  if (o.kind === 'laser'){
    const ph = st.clock / o.per + o.ph, cur = Math.floor(ph) % 2;
    return [[o.pos[cur], o.gw]];
  }
  if (o.base2 != null) return [[o.base, o.gw], [o.base2, o.gw]];
  const gx = o.amp ? o.base + Math.sin(st.clock * o.w + o.ph) * o.amp : o.base;
  return [[gx, o.gw]];
}
function solids(o){
  const gaps = wallGaps(o), out = [];
  let x = -20;
  for (const [gx, gw] of gaps){ out.push([x, gx - x]); x = gx + gw; }
  out.push([x, LW + 20 - x]);
  return out;
}
function obsSpan(o){
  if (o.kind === 'spin') return [o.y - o.len, o.y + o.len];
  if (o.kind === 'mines') return [o.y - 14, o.y + 14];
  return [o.y, o.y + o.h];
}
function spinEnds(o){
  const c = Math.cos(o.ang) * o.len, s = Math.sin(o.ang) * o.len;
  return [o.x - c, o.y - s, o.x + c, o.y + s];
}
function clearance(o, px, py){
  // Abstand zwischen Lichtrand und Hindernis (negativ = Treffer)
  if (o.kind === 'wall' || o.kind === 'laser'){
    const th = o.kind === 'laser' ? 2 : 0;
    let d = 999;
    for (const [x, w] of solids(o)) d = Math.min(d, circRect(px, py, LR, x, o.y - th, w, o.h + th * 2));
    return d;
  }
  if (o.kind === 'block') return circRect(px, py, LR, o.x, o.y, o.w, o.h);
  if (o.kind === 'spin'){
    const [x1, y1, x2, y2] = spinEnds(o);
    return Math.min(segDist(px, py, x1, y1, x2, y2) - 4, Math.hypot(px - o.x, py - o.y) - 8) - LR;
  }
  if (o.kind === 'mines'){
    let d = 999;
    for (const m of o.mines) d = Math.min(d, Math.hypot(px - m.x, py - o.y) - m.r * .85 - LR);
    return d;
  }
  return 999;
}

/* =====================================================================
   SPIELLOGIK
   ===================================================================== */
function gain(x){ st.score += x * (st.pw.double > 0 ? 2 : 1) * rankMul(); }
function addFever(x){
  const s = st;
  if (s.feverT > 0 || s.dead) return;
  s.fever = Math.min(1, s.fever + x * s.feverFill);
  if (s.fever >= 1){
    s.feverT = s.feverDur; s.fevers++; D.stats.lFevers++;
    Sfx.fever(); buzz([30, 30, 30, 30, 90]);
    pop(LW / 2, s.py - 90, 'ÜBERLADUNG!', 'big');
    unlock('l_fever');
    Music.set({ fever: true });
  }
}
function burstL(x, y, n, kind, o = {}){
  for (let i = 0; i < n; i++){
    const a = o.dir != null ? o.dir + (vr() - .5) * (o.spread || 1) : vr() * 6.283, v = (o.v || 60) + vr() * (o.vr || 200);
    st.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: (o.life || .5) + vr() * .4, max: (o.life || .5) + .4, sz: 2 + vr() * (o.sz || 3), kind, alt: vr() < .5, drift: o.drift || 0 });
  }
}
function pop(x, y, text, kind = ''){ st.pops.push({ x: clamp(x, 60, LW - 60), y, text, life: kind === 'big' ? 1.4 : .9, kind }); }
function collect(p){
  const s = st, before = s.mult;
  s.combo++; s.comboT = s.comboTime; s.sparks++; D.stats.lSparks++;
  s.mult = Math.min(8, 1 + Math.floor(s.combo / 4));
  s.maxMult = Math.max(s.maxMult, s.mult);
  D.stats.lBestMult = Math.max(D.stats.lBestMult, s.mult);
  const pts = 10 * s.mult * (s.feverT > 0 ? 2 : 1);
  gain(pts);
  pop(p.x, p.y - 8, '+' + Math.round(pts * (s.pw.double > 0 ? 2 : 1)));
  burstL(p.x, p.y, 6, 'spark');
  Sfx.spark(s.combo);
  addFever(.016);
  if (s.mult > before){ buzz(15); if (s.mult >= 3) pop(LW / 2, s.py - 60, `×${s.mult}`, 'mult'); }
  if (s.mult >= 5) unlock('l_combo');
  if (s.mult >= 8) unlock('l_combo8');
}
function takePower(p){
  const s = st, P = POWERS[p.type];
  s.powers++; D.stats.lPowers++;
  if (p.type === 'shield') s.shields = Math.min(3, s.shields + 1);
  else s.pw[p.type] = P.dur * s.powerMul;
  pop(p.x, p.y - 20, P.name + '!', 'near');
  burstL(p.x, p.y, 14, 'spark', { v: 80 });
  Sfx.power(); buzz(25);
  addFever(.06);
  if (s.powers >= 5) unlock('l_power');
}
function nearMiss(){
  const s = st;
  s.near++; gain(25);
  pop(s.px, s.py - 30, 'knapp! +25', 'near');
  Sfx.near(); buzz(12);
  addFever(.06);
  if (s.near >= 10) unlock('l_near');
}
function crash(o){
  const s = st;
  if (s.feverT > 0){
    o.broken = true; o.fade = 1; s.shatter++;
    gain(50); pop(s.px, s.py - 40, 'Zertrümmert! +50', 'near');
    burstL(s.px, s.py - 10, 18, 'wall', { v: 120, vr: 260 });
    Sfx.shatter(); buzz(20);
    return;
  }
  if (s.pw.phase > 0){
    if (!o.phased){ o.phased = true; s.phased++; }
    return;
  }
  if (s.inv > 0) return;
  if (s.shields > 0){
    s.shields--; s.inv = 1.1; o.broken = true; o.fade = 1;
    burstL(s.px, s.py, 16, 'wall', { v: 100 });
    pop(s.px, s.py - 32, 'Schild!', 'near');
    Sfx.shield(); buzz(60);
    return;
  }
  s.dead = true; s.deadT = 0;
  burstL(s.px, s.py, 34, 'orb', { v: 80, vr: 260, life: .7 });
  Sfx.death(); buzz([80, 40, 140]);
  Music.set({ energy: 0, fever: false });
}

function lUpdate(rdt){
  const s = st;
  s.clock += rdt;
  const slow = s.pw.slow > 0 ? .55 : 1;
  const dt = rdt * slow;
  if (s.dead){ s.deadT += rdt; s.speed *= Math.pow(.02, rdt); }
  else {
    s.t += dt;
    s.speed = Math.min(660, 230 + s.t * 6 + s.zone * 10) * (s.feverT > 0 ? 1.3 : 1);
  }
  const dy = s.speed * dt;
  s.dist += dy;
  if (!s.dead){
    D.stats.lDist += dy;
    gain(dy * .05);
    if (keys.l) s.tx -= 380 * rdt;
    if (keys.r) s.tx += 380 * rdt;
    s.tx = clamp(s.tx, LR + 2, LW - LR - 2);
    s.px += (s.tx - s.px) * Math.min(1, rdt * 20);
    s.trail.push({ x: s.px, y: s.py });
    if (s.trail.length > 22) s.trail.shift();
    trailFx(rdt);
    for (const k2 in s.pw) if (s.pw[k2] > 0) s.pw[k2] = Math.max(0, s.pw[k2] - rdt);
    if (s.inv > 0) s.inv -= rdt;
    if (s.feverT > 0){
      s.feverT -= rdt; s.fever = Math.max(0, s.feverT / s.feverDur);
      if (s.feverT <= 0){ s.feverT = 0; s.fever = 0; s.inv = 1; Music.set({ fever: false }); }
    }
    if (s.hint && s.t > 4){ s.hint = false; D.tips.lhint = 1; save(); }
  }
  for (const p of s.trail) p.y += dy;

  // Zonen
  if (!s.dead && s.dist - s.zoneStart > zoneInfo(s.zone).len){
    s.zone++; s.zoneStart = s.dist; s.zoneBanner = 2.2; s.grace = 1.3;
    D.licht.bestZone = Math.max(D.licht.bestZone, s.zone + 1);
    Sfx.zone(); buzz([20, 40, 20]);
    addFever(.1);
    if (s.zone >= 4) unlock('l_zone5');
    $('#rZone').textContent = `Zone ${s.zone + 1} · ${zoneInfo(s.zone).name}`;
  }
  if (s.zoneBanner > 0) s.zoneBanner -= rdt;
  if (s.grace > 0) s.grace -= dt;

  // Nachschub
  s.next -= dy;
  if (s.next <= 0 && !s.dead){ if (s.grace > 0) s.next = 40; else spawnRow(); }
  s.nextPower -= dy;
  if (s.nextPower <= 0 && !s.dead) spawnPower();

  // Hindernisse bewegen und prüfen
  for (const o of s.obs){
    o.y += dy;
    if (o.kind === 'block'){ o.x += o.vx * dt; if (o.x < 4){ o.x = 4; o.vx = -o.vx; } if (o.x + o.w > LW - 4){ o.x = LW - 4 - o.w; o.vx = -o.vx; } }
    if (o.kind === 'spin') o.ang += o.w * dt;
    if (o.kind === 'mines') for (const m of o.mines) m.x = m.base + Math.sin(s.clock * m.w * slow + m.ph) * m.amp;
    if (o.broken){ o.fade -= rdt * 3; continue; }
    if (s.dead) continue;
    const [top, bot] = obsSpan(o);
    if (bot > s.py - LR - 8 && top < s.py + LR + 8){
      const d = clearance(o, s.px, s.py);
      if (d < 0) crash(o);
      else if (!o.phased) o.clr = Math.min(o.clr, d);
      if (s.dead) continue;
    }
    if (!o.done && top > s.py + LR){
      o.done = true;
      if (!o.broken && !o.phased && o.clr >= 0 && o.clr < 7) nearMiss();
      if (o.kind === 'laser' && !o.broken) s.lasers++;
    }
  }
  s.obs = s.obs.filter(o => obsSpan(o)[0] < LH + 60 && !(o.broken && o.fade <= 0));

  // Funken
  const magnet = s.feverT > 0 ? 120 : s.pw.magnet > 0 ? 150 : s.magnetBase;
  for (const p of s.sp){
    if (p.wall && !p.free) p.x = wallGaps(p.wall)[0][0] + p.off;
    p.y += dy;
    if (s.dead) continue;
    const ddx = s.px - p.x, ddy = s.py - p.y, d = Math.hypot(ddx, ddy) || 1;
    if (magnet && d < magnet){
      p.free = true;
      const pull = Math.min(d, ((1 - d / magnet) * 560 + 80) * rdt);
      p.x += ddx / d * pull; p.y += ddy / d * pull;
    }
    if (d < LR + 9){ p.got = true; collect(p); }
  }
  s.sp = s.sp.filter(p => !p.got && p.y < LH + 30);

  // Power-ups
  for (const p of s.pws){
    p.y += dy;
    if (!s.dead && Math.hypot(s.px - p.x, s.py - p.y) < LR + 16){ p.got = true; takePower(p); }
  }
  s.pws = s.pws.filter(p => !p.got && p.y < LH + 40);

  if (s.combo > 0){ s.comboT -= dt; if (s.comboT <= 0){ s.combo = 0; s.mult = 1; } }

  for (const q of s.parts){ q.x += q.vx * rdt; q.y += q.vy * rdt + (q.drift ? dy : 0); q.vx *= .95; q.vy *= .95; q.life -= rdt; }
  s.parts = s.parts.filter(q => q.life > 0);
  for (const q of s.pops){ q.y -= 40 * rdt; q.life -= rdt; }
  s.pops = s.pops.filter(q => q.life > 0);

  if (s.score >= 1000) unlock('l_1k');
  if (s.score >= 5000) unlock('l_5k');
  if (s.score >= 20000) unlock('l_20k');
  s.missionT -= rdt;
  if (s.missionT <= 0){ s.missionT = .5; checkRunMissions(false); }
  Music.set({ tempo: 1 + Math.min(.28, s.t / 300), energy: clamp(s.t / 90, 0, 1) });
  if (s.dead && s.deadT > .9 && !s.ended){ s.ended = true; lDeathChoice(); }
}
function trailFx(dt){
  const s = st, sk = SKINS[D.licht.skin] || SKINS.klassik;
  const k2 = { embers: 'ember', flakes: 'flake', stars: 'star', smoke: 'smoke' }[sk.trail];
  if (!k2 || reduceMotion) return;
  if (vr() < dt * 40){
    s.parts.push({ x: s.px + (vr() - .5) * 8, y: s.py + 6, vx: (vr() - .5) * 30, vy: 20 + vr() * 40, life: .6 + vr() * .4, max: 1, sz: 2 + vr() * 3, kind: k2, alt: vr() < .5, drift: 1 });
  }
}

/* =====================================================================
   ZEICHNEN
   ===================================================================== */
const LPAL = {
  warm: { wall: '#C4622D', wallDk: '#9C4B21', block: '#EDE6D6', blockDk: '#C2B597', spark: '#F5F0E6', core: '#F2C14E', text: '#F5F0E6', laser: '#E0583A', spin: '#EDE6D6', mine: '#C4622D' },
  papier: { bg: '#FBF8F0', grid: '#D5E1EE', margin: 'rgba(210,65,58,.28)', ink: '#2B2B30', red: '#D2413A', blue: '#2F5DA8' }
};
function skinCore(sk, t){ return sk.core === 'hue' ? `hsl(${(t * 140) % 360}, 85%, 62%)` : sk.core; }
function skinHalo(sk, t, a){ return sk.halo === 'hue' ? `hsla(${(t * 140) % 360}, 85%, 62%, ${a})` : `rgba(${sk.halo},${a})`; }
function skinPaper(sk, t){ return sk.paper === 'hue' ? `hsla(${(t * 140) % 360}, 80%, 60%, .8)` : sk.paper; }
function rrect(c, x, y, w, h, r){
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function slab(c, x, y, w, h, top, dk){
  if (w <= 0) return;
  c.fillStyle = dk; rrect(c, x, y, w, h, 5); c.fill();
  c.fillStyle = top; rrect(c, x, y, w, h - 5, 5); c.fill();
}
function rLine(c, x1, y1, x2, y2, Rn, a){
  const j = () => (Rn() - .5) * 2 * a;
  c.moveTo(x1 + j(), y1 + j());
  c.quadraticCurveTo((x1 + x2) / 2 + j() * 1.5, (y1 + y2) / 2 + j() * 1.5, x2 + j(), y2 + j());
}
function sketchBox(c, x, y, w, h, Rn, col, hatch = true){
  if (w <= 0) return;
  if (hatch){
    c.save();
    c.beginPath(); c.rect(x, y, w, h); c.clip();
    c.strokeStyle = col; c.globalAlpha *= .5; c.lineWidth = 1.2;
    c.beginPath();
    for (let d = -h; d < w + h; d += 6) rLine(c, x + d, y + h + 2, x + d + h + 4, y - 2, Rn, .9);
    c.stroke();
    c.restore();
  }
  c.strokeStyle = col; c.lineWidth = 2;
  c.beginPath();
  for (let p = 0; p < 2; p++){
    rLine(c, x, y, x + w, y, Rn, 1.3); rLine(c, x + w, y, x + w, y + h, Rn, 1.3);
    rLine(c, x + w, y + h, x, y + h, Rn, 1.3); rLine(c, x, y + h, x, y, Rn, 1.3);
  }
  c.stroke();
}
function roughCircle(c, x, y, r, Rn){
  c.beginPath();
  const a0 = Rn() * 6.283, over = .5 + Rn() * .4, n = 20;
  for (let i = 0; i <= n; i++){
    const a = a0 + i / n * (6.283 + over), rr = r + (Rn() - .5) * 1.8;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.stroke();
}
function starPath(c, x, y, r, Rn){
  for (let i = 0; i <= 10; i++){
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = (i % 2 ? r * .45 : r) + (Rn ? (Rn() - .5) * 1.4 : 0);
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  }
}
function drawPowerGlyph(c, type, x, y, size, paper, col){
  c.save();
  c.translate(x - size / 2, y - size / 2); c.scale(size / 48, size / 48);
  if (type === 'double'){
    c.fillStyle = col; c.font = `700 30px ${paper ? 'Caveat, cursive' : '"IBM Plex Mono", monospace'}`;
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('×2', 24, 26);
  } else {
    const p = path(POWERS[type].path);
    if (paper){ c.strokeStyle = col; c.lineWidth = 3; c.stroke(p); } else { c.fillStyle = col; c.fill(p); }
  }
  c.restore();
}

function drawWarm(c, s, w, h){
  const P = LPAL.warm, Z = zoneInfo(s.zone), sk = SKINS[D.licht.skin] || SKINS.klassik;
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, Z.warm[0]); g.addColorStop(1, Z.warm[1]);
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  if (s.feverT > 0){ c.fillStyle = `rgba(242,193,78,${.08 + Math.sin(s.clock * 12) * .04})`; c.fillRect(0, 0, w, h); }
  if (s.pw.slow > 0){ c.fillStyle = 'rgba(159,216,240,.07)'; c.fillRect(0, 0, w, h); }

  c.fillStyle = 'rgba(245,240,230,.09)';
  for (let y = (s.dist % 64) - 64; y < h; y += 64){ c.fillRect(6, y, 3, 30); c.fillRect(w - 9, y, 3, 30); }

  for (const p of s.sp){
    c.save(); c.translate(p.x, p.y); c.rotate(s.clock * 2 + p.id);
    c.fillStyle = P.spark; c.beginPath();
    c.moveTo(0, -7); c.lineTo(5, 0); c.lineTo(0, 7); c.lineTo(-5, 0); c.closePath(); c.fill();
    c.restore();
    c.fillStyle = P.core; c.beginPath(); c.arc(p.x, p.y, 2, 0, 7); c.fill();
  }
  for (const p of s.pws){
    const bob = Math.sin(s.clock * 4 + p.id) * 3;
    c.fillStyle = 'rgba(245,240,230,.14)'; c.beginPath(); c.arc(p.x, p.y + bob, 17, 0, 7); c.fill();
    c.strokeStyle = '#F2C14E'; c.lineWidth = 2; c.beginPath(); c.arc(p.x, p.y + bob, 17, 0, 7); c.stroke();
    drawPowerGlyph(c, p.type, p.x, p.y + bob, 20, false, '#F5F0E6');
  }

  for (const o of s.obs){
    c.globalAlpha = o.broken ? Math.max(0, o.fade) : o.phased && s.pw.phase > 0 ? .45 : 1;
    if (o.kind === 'wall'){
      for (const [x, ww] of solids(o)) slab(c, x, o.y, ww, o.h, P.wall, P.wallDk);
    } else if (o.kind === 'laser'){
      const ph = s.clock / o.per + o.ph, cur = Math.floor(ph) % 2, frac = ph - Math.floor(ph);
      if (frac > .7){
        const [nx, nw] = [o.pos[1 - cur], o.gw];
        c.strokeStyle = 'rgba(245,240,230,.55)'; c.lineWidth = 2; c.setLineDash([5, 5]);
        c.strokeRect(nx, o.y - 6, nw, o.h + 12); c.setLineDash([]);
      }
      c.shadowColor = P.laser; c.shadowBlur = 12;
      c.fillStyle = P.laser;
      for (const [x, ww] of solids(o)) if (ww > 0) c.fillRect(x, o.y, ww, o.h);
      c.shadowBlur = 0;
      c.fillStyle = '#FFF4CF';
      for (const [x, ww] of solids(o)) if (ww > 0) c.fillRect(x, o.y + 2.5, ww, 2);
      c.fillStyle = P.wallDk; c.fillRect(0, o.y - 5, 8, o.h + 10); c.fillRect(w - 8, o.y - 5, 8, o.h + 10);
    } else if (o.kind === 'block') slab(c, o.x, o.y, o.w, o.h, P.block, P.blockDk);
    else if (o.kind === 'spin'){
      const [x1, y1, x2, y2] = spinEnds(o);
      c.strokeStyle = P.spin; c.lineWidth = 9; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
      c.fillStyle = P.core; c.beginPath(); c.arc(o.x, o.y, 9, 0, 7); c.fill();
      c.fillStyle = P.wallDk; c.beginPath(); c.arc(o.x, o.y, 3.5, 0, 7); c.fill();
    } else if (o.kind === 'mines'){
      for (const m of o.mines){
        c.save(); c.translate(m.x, o.y); c.rotate(s.clock * 2);
        c.fillStyle = P.wallDk;
        for (let i = 0; i < 8; i++){ c.rotate(Math.PI / 4); c.beginPath(); c.moveTo(-3.5, -m.r + 2); c.lineTo(0, -m.r - 6); c.lineTo(3.5, -m.r + 2); c.fill(); }
        c.fillStyle = P.mine; c.beginPath(); c.arc(0, 0, m.r, 0, 7); c.fill();
        c.fillStyle = '#F2C14E'; c.beginPath(); c.arc(0, 0, 3, 0, 7); c.fill();
        c.restore();
      }
    }
  }
  c.globalAlpha = 1;

  // Spur je nach Skin
  const n = s.trail.length;
  if (sk.trail === 'tail' && n > 2){
    for (let i = 1; i < n; i++){
      c.strokeStyle = skinHalo(sk, s.clock, (i / n) * .7); c.lineWidth = LR * 1.6 * (i / n); c.lineCap = 'round';
      c.beginPath(); c.moveTo(s.trail[i - 1].x, s.trail[i - 1].y); c.lineTo(s.trail[i].x, s.trail[i].y); c.stroke();
    }
  } else {
    s.trail.forEach((p, i) => {
      const f = i / n, pulse = sk.trail === 'pulse' ? 1 + Math.sin(s.clock * 10 - i) * .35 : 1;
      c.globalAlpha = f * .4;
      c.fillStyle = sk.trail === 'rainbow' ? `hsl(${(s.clock * 140 + i * 18) % 360}, 85%, 62%)` : skinCore(sk, s.clock);
      c.beginPath(); c.arc(p.x, p.y, LR * f * .9 * pulse, 0, 7); c.fill();
    });
    c.globalAlpha = 1;
  }

  if (!s.dead && !(s.inv > 0 && s.feverT <= 0 && Math.floor(s.inv * 12) % 2)){
    const ghost = s.pw.phase > 0;
    const big = s.feverT > 0 ? 1.25 : 1;
    const halo = c.createRadialGradient(s.px, s.py, 2, s.px, s.py, LR * 3.4 * big);
    halo.addColorStop(0, skinHalo(sk, s.clock, s.feverT > 0 ? .7 : .45)); halo.addColorStop(1, skinHalo(sk, s.clock, 0));
    c.fillStyle = halo; c.beginPath(); c.arc(s.px, s.py, LR * 3.4 * big, 0, 7); c.fill();
    c.globalAlpha = ghost ? .45 + Math.sin(s.clock * 14) * .15 : 1;
    c.fillStyle = skinCore(sk, s.clock); c.beginPath(); c.arc(s.px, s.py, LR * big, 0, 7); c.fill();
    if (sk.ring){ c.strokeStyle = sk.hi; c.lineWidth = 2; c.beginPath(); c.arc(s.px, s.py, LR * big - 1, 0, 7); c.stroke(); }
    c.fillStyle = sk.hi; c.beginPath(); c.arc(s.px - 3, s.py - 3, LR * .38, 0, 7); c.fill();
    c.globalAlpha = 1;
    if (s.shields > 0){
      c.strokeStyle = 'rgba(245,240,230,.6)'; c.lineWidth = 1.5;
      for (let i = 0; i < s.shields; i++){ c.beginPath(); c.arc(s.px, s.py, LR + 6 + i * 4, 0, 7); c.stroke(); }
    }
    if (s.pw.magnet > 0){
      c.strokeStyle = `rgba(242,193,78,${.25 + Math.sin(s.clock * 8) * .1})`; c.lineWidth = 1.5; c.setLineDash([3, 6]);
      c.beginPath(); c.arc(s.px, s.py, 60 + (s.clock * 40) % 30, 0, 7); c.stroke(); c.setLineDash([]);
    }
  }

  for (const q of s.parts){
    c.globalAlpha = Math.min(1, q.life / q.max * 1.6);
    const col = partColor(q, false, sk, s.clock);
    c.fillStyle = col;
    if (q.kind === 'smoke'){ c.beginPath(); c.arc(q.x, q.y, q.sz * 2, 0, 7); c.fill(); }
    else if (q.kind === 'star' || q.kind === 'flake'){ c.beginPath(); starPath(c, q.x, q.y, q.sz + 1.5, null); c.fill(); }
    else c.fillRect(q.x - q.sz / 2, q.y - q.sz / 2, q.sz, q.sz);
  }
  c.globalAlpha = 1;

  c.textAlign = 'center';
  for (const q of s.pops){
    c.globalAlpha = Math.min(1, q.life * 2);
    c.fillStyle = q.kind ? P.core : P.text;
    c.font = q.kind === 'big' ? '700 30px Fraunces, Georgia, serif' : q.kind === 'mult' ? '600 22px "IBM Plex Mono", monospace' : '600 15px "IBM Plex Mono", ui-monospace, monospace';
    c.fillText(q.text, q.x, q.y);
  }
  c.globalAlpha = 1;
  drawOverlayText(c, s, w, h, false);
}

function drawPaper(c, s, w, h){
  const P = LPAL.papier, Z = zoneInfo(s.zone), sk = SKINS[D.licht.skin] || SKINS.klassik;
  const boil = reduceMotion ? 0 : Math.floor(s.clock * 8);
  c.fillStyle = P.bg; c.fillRect(0, 0, w, h);
  c.strokeStyle = P.grid; c.lineWidth = 1;
  c.beginPath();
  for (let y = (s.dist % 24) - 24; y < h; y += 24){ c.moveTo(0, y); c.lineTo(w, y); }
  for (let x = 12; x < w; x += 24){ c.moveTo(x, 0); c.lineTo(x, h); }
  c.stroke();
  c.strokeStyle = P.margin; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(30, 0); c.lineTo(30, h); c.stroke();
  if (s.feverT > 0){
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(244,217,58,.25)'); gr.addColorStop(.5, 'rgba(244,217,58,0)'); gr.addColorStop(1, 'rgba(240,140,70,.25)');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
  }

  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = P.blue; c.lineWidth = 1.6;
  for (const p of s.sp){ const Rn = mulberry(p.id * 131 + boil); c.beginPath(); starPath(c, p.x, p.y, 7.5, Rn); c.stroke(); }
  for (const p of s.pws){
    const bob = Math.sin(s.clock * 4 + p.id) * 3, Rn = mulberry(p.id * 71 + boil);
    c.fillStyle = 'rgba(244,217,58,.45)'; c.beginPath(); c.arc(p.x + 1, p.y + bob + 1, 16, 0, 7); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 1.8; roughCircle(c, p.x, p.y + bob, 17, Rn);
    drawPowerGlyph(c, p.type, p.x, p.y + bob, 20, true, P.ink);
  }

  for (const o of s.obs){
    c.globalAlpha = o.broken ? Math.max(0, o.fade) : o.phased && s.pw.phase > 0 ? .4 : 1;
    const Rn = mulberry(o.id * 977 + boil);
    if (o.kind === 'wall'){
      for (const [x, ww] of solids(o)) sketchBox(c, x, o.y, ww, o.h, Rn, P.ink);
    } else if (o.kind === 'laser'){
      const ph = s.clock / o.per + o.ph, cur = Math.floor(ph) % 2, frac = ph - Math.floor(ph);
      if (frac > .7){ c.strokeStyle = P.ink; c.lineWidth = 1.4; c.setLineDash([4, 4]); c.strokeRect(o.pos[1 - cur], o.y - 6, o.gw, o.h + 12); c.setLineDash([]); }
      c.strokeStyle = Z.pen; c.lineWidth = 2.4;
      for (const [x, ww] of solids(o)){
        if (ww <= 0) continue;
        c.beginPath();
        for (let xx = Math.max(x, 0), i = 0; xx <= Math.min(x + ww, w); xx += 7, i++){ const yy = o.y + o.h / 2 + (i % 2 ? -3 : 3) + (Rn() - .5); i ? c.lineTo(xx, yy) : c.moveTo(xx, yy); }
        c.stroke();
      }
      c.fillStyle = P.ink; c.fillRect(0, o.y - 4, 6, o.h + 8); c.fillRect(w - 6, o.y - 4, 6, o.h + 8);
    } else if (o.kind === 'block') sketchBox(c, o.x, o.y, o.w, o.h, Rn, P.red);
    else if (o.kind === 'spin'){
      const [x1, y1, x2, y2] = spinEnds(o);
      c.strokeStyle = P.ink; c.lineWidth = 2.2;
      c.beginPath(); rLine(c, x1, y1, x2, y2, Rn, 1.2); c.stroke();
      const nx = -Math.sin(o.ang) * 4, ny = Math.cos(o.ang) * 4;
      c.beginPath(); rLine(c, x1 + nx, y1 + ny, x2 + nx, y2 + ny, Rn, 1); rLine(c, x1 - nx, y1 - ny, x2 - nx, y2 - ny, Rn, 1); c.stroke();
      c.fillStyle = 'rgba(244,217,58,.8)'; c.beginPath(); c.arc(o.x, o.y, 8, 0, 7); c.fill();
      roughCircle(c, o.x, o.y, 8, Rn);
    } else if (o.kind === 'mines'){
      for (const m of o.mines){
        c.strokeStyle = P.red; c.lineWidth = 1.8;
        roughCircle(c, m.x, o.y, m.r, Rn);
        c.beginPath();
        for (let i = 0; i < 8; i++){ const a = i * Math.PI / 4 + s.clock * 2; c.moveTo(m.x + Math.cos(a) * m.r, o.y + Math.sin(a) * m.r); c.lineTo(m.x + Math.cos(a) * (m.r + 6), o.y + Math.sin(a) * (m.r + 6)); }
        c.stroke();
      }
    }
  }
  c.globalAlpha = 1;

  if (s.trail.length > 2){
    c.strokeStyle = sk.trail === 'rainbow' ? skinPaper(sk, s.clock) : 'rgba(43,43,48,.35)'; c.lineWidth = 1.4; c.setLineDash([3, 4]);
    c.beginPath();
    s.trail.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y));
    c.stroke(); c.setLineDash([]);
  }
  if (!s.dead && !(s.inv > 0 && s.feverT <= 0 && Math.floor(s.inv * 12) % 2)){
    const Rn = mulberry(7 + boil), big = s.feverT > 0 ? 1.25 : 1;
    c.globalAlpha = s.pw.phase > 0 ? .45 : 1;
    c.fillStyle = skinPaper(sk, s.clock); c.beginPath(); c.arc(s.px + 1.5, s.py + 1, (LR + 1) * big, 0, 7); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 2; roughCircle(c, s.px, s.py, LR * big, Rn);
    c.globalAlpha = 1;
    if (s.shields > 0){
      c.strokeStyle = P.blue; c.lineWidth = 1.4; c.setLineDash([4, 4]);
      for (let i = 0; i < s.shields; i++){ c.beginPath(); c.arc(s.px, s.py, LR + 7 + i * 4, 0, 7); c.stroke(); }
      c.setLineDash([]);
    }
    if (s.feverT > 0){ c.strokeStyle = P.red; c.lineWidth = 1.6; roughCircle(c, s.px, s.py, LR + 12 + Math.sin(s.clock * 12) * 3, Rn); }
  }
  c.lineWidth = 1.6;
  for (const q of s.parts){
    c.globalAlpha = Math.min(1, q.life / q.max * 1.6);
    c.strokeStyle = partColor(q, true, sk, s.clock);
    c.beginPath();
    if (q.kind === 'star' || q.kind === 'flake') starPath(c, q.x, q.y, q.sz + 1.5, null);
    else if (q.kind === 'smoke') c.arc(q.x, q.y, q.sz * 2, 0, 7);
    else { c.moveTo(q.x, q.y); c.lineTo(q.x - q.vx * .04, q.y - q.vy * .04); }
    c.stroke();
  }
  c.globalAlpha = 1;
  c.textAlign = 'center';
  for (const q of s.pops){
    c.globalAlpha = Math.min(1, q.life * 2);
    c.fillStyle = q.kind ? P.red : P.blue;
    c.font = q.kind === 'big' ? '700 40px Caveat, cursive' : q.kind === 'mult' ? '700 32px Caveat, cursive' : '700 24px Caveat, "Segoe Print", cursive';
    c.fillText(q.text, q.x, q.y);
  }
  c.globalAlpha = 1;
  drawOverlayText(c, s, w, h, true);
}
function partColor(q, paper, sk, t){
  if (paper){
    if (q.kind === 'spark') return LPAL.papier.blue;
    if (q.kind === 'orb') return q.alt ? LPAL.papier.red : LPAL.papier.ink;
    if (q.kind === 'ember') return '#E0583A';
    if (q.kind === 'flake') return LPAL.papier.blue;
    if (q.kind === 'star') return '#C9A227';
    return LPAL.papier.ink;
  }
  if (q.kind === 'spark') return q.alt ? LPAL.warm.spark : LPAL.warm.core;
  if (q.kind === 'orb') return q.alt ? skinCore(sk, t) : sk.hi;
  if (q.kind === 'ember') return q.alt ? '#E8703A' : '#F2C14E';
  if (q.kind === 'flake') return q.alt ? '#FFFFFF' : '#9FD8F0';
  if (q.kind === 'star') return q.alt ? '#F7E7A1' : '#FFFFFF';
  if (q.kind === 'smoke') return 'rgba(20,20,26,.35)';
  return LPAL.warm.wall;
}
function drawOverlayText(c, s, w, h, paper){
  if (s.zoneBanner > 0){
    const a = Math.min(1, s.zoneBanner * 2, (2.2 - s.zoneBanner) * 4);
    c.globalAlpha = clamp(a, 0, 1);
    c.textAlign = 'center';
    c.fillStyle = paper ? LPAL.papier.red : '#F2C14E';
    c.font = paper ? '400 22px "Patrick Hand", cursive' : '600 13px "IBM Plex Mono", monospace';
    c.fillText(paper ? `Zone ${s.zone + 1}` : `ZONE ${s.zone + 1}`, w / 2, h * .3);
    c.fillStyle = paper ? LPAL.papier.ink : '#F5F0E6';
    c.font = paper ? '700 54px Caveat, cursive' : '700 40px Fraunces, Georgia, serif';
    c.fillText(zoneInfo(s.zone).name, w / 2, h * .3 + (paper ? 46 : 42));
    c.globalAlpha = 1;
  }
  if (s.hint && !s.dead){
    const a = clamp(4 - s.t, 0, 1);
    c.globalAlpha = a;
    c.textAlign = 'center';
    c.fillStyle = paper ? LPAL.papier.ink : '#F5F0E6';
    c.font = paper ? '700 30px Caveat, cursive' : '600 16px "IBM Plex Sans", sans-serif';
    c.fillText('Zieh nach links und rechts', w / 2, s.py + 64);
    const off = Math.sin(s.clock * 5) * 26;
    c.strokeStyle = c.fillStyle; c.lineWidth = 2.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(w / 2 - 40 + off, s.py + 88); c.lineTo(w / 2 + 40 + off, s.py + 88);
    c.moveTo(w / 2 + 30 + off, s.py + 81); c.lineTo(w / 2 + 40 + off, s.py + 88); c.lineTo(w / 2 + 30 + off, s.py + 95);
    c.moveTo(w / 2 - 30 + off, s.py + 81); c.lineTo(w / 2 - 40 + off, s.py + 88); c.lineTo(w / 2 - 30 + off, s.py + 95);
    c.stroke();
    c.globalAlpha = 1;
  }
}
function lDraw(){
  lcx.setTransform(LSC * LDPR, 0, 0, LSC * LDPR, 0, 0);
  isPaper() ? drawPaper(lcx, st, LW, LH) : drawWarm(lcx, st, LW, LH);
}

/* =====================================================================
   HUD UND ABLAUF
   ===================================================================== */
const rScore = $('#rScore'), rMult = $('#rMult'), rShields = $('#rShields'), rPowers = $('#rPowers'), rFever = $('#rFever');
let hudKey = '';
function lHud(){
  const s = st, sc = Math.floor(s.score), m = s.combo ? `×${s.mult} · Kette ${s.combo}` : '';
  const pws = POWER_IDS.filter(id => s.pw[id] > 0);
  const key = sc + '|' + m + '|' + s.shields + '|' + pws.join();
  if (key !== hudKey){
    hudKey = key;
    rScore.textContent = fmt(sc);
    rMult.textContent = m;
    rShields.innerHTML = Array.from({ length: s.shields }, () => icon('shield')).join('');
    rPowers.innerHTML = pws.map(id => `<span class="pw-chip" data-pw="${id}">${icon(POWERS[id].ic)}</span>`).join('');
  }
  for (const el of rPowers.children){ const id = el.dataset.pw; el.style.setProperty('--p', (s.pw[id] / (POWERS[id].dur * s.powerMul)).toFixed(3)); }
  rFever.style.setProperty('--f', s.fever.toFixed(3));
  rFever.classList.toggle('full', s.feverT > 0);
}
function lLoop(now){
  if (!lRunning) return;
  const dt = Math.min(.034, Math.max(0, (now - lLast) / 1000));
  lLast = now;
  lUpdate(dt); lDraw(); lHud();
  if (lRunning) lRaf = requestAnimationFrame(lLoop);
}
function lStart(){
  closeSheet();
  lResize(); lNew(); hudKey = '';
  $('#rZone').textContent = `Zone 1 · ${ZONES[0].name}`;
  D.stats.lRuns++; D.licht.totalRuns++; save();
  lRunning = true; lLast = performance.now();
  cancelAnimationFrame(lRaf);
  lRaf = requestAnimationFrame(lLoop);
  Music.play('lauf');
}
function lStop(){ lRunning = false; cancelAnimationFrame(lRaf); lDrag = null; keys.l = keys.r = false; }
function lPause(){
  if (!lRunning || !st || st.dead) return;
  lStop();
  sheet(`<h2>Pause</h2><p><b>${fmt(st.score)}</b> Punkte · ${st.sparks} Funken · Zone ${st.zone + 1}</p>
    <button type="button" class="btn" data-act="resume">Weiter</button>
    <button type="button" class="btn ghost" data-act="quit">Lauf beenden</button>`,
    { resume: lResume, quit: () => { st.dead = true; st.ended = true; lEnd(); } }, lResume);
}
function lResume(){
  closeSheet();
  if (!st || st.dead) return;
  lRunning = true; lLast = performance.now();
  lRaf = requestAnimationFrame(lLoop);
}
function lDeathChoice(){
  lStop();
  const L = D.licht, s = st;
  const cost = 30 * Math.pow(2, s.paid || 0);
  const canFree = s.freeRevive;
  const canPay = s.revives < 2 && L.bank >= cost;
  if (!canFree && !canPay) return lEnd();
  let left = 5, timer = 0;
  const decline = () => { clearInterval(timer); lEnd(); };
  sheet(`<h2>Weiterspielen?</h2>
    <p><b>${fmt(s.score)}</b> Punkte bisher. Du startest an derselben Stelle, und kurz sind alle Hindernisse harmlos.</p>
    ${canFree ? `<button type="button" class="btn gold" data-act="free">Kostenlos weiter (Wiedergeburt)</button>`
      : `<button type="button" class="btn gold" data-act="pay">Weiter für ${cost} Funken</button>`}
    <button type="button" class="btn ghost" data-act="no">Nein, Lauf beenden (<span id="revLeft">${left}</span>)</button>`,
    {
      free: () => { clearInterval(timer); s.freeRevive = false; lRevive(); },
      pay: () => { clearInterval(timer); L.bank -= cost; s.paid = (s.paid || 0) + 1; save(); lRevive(); },
      no: decline
    });
  timer = setInterval(() => {
    left--;
    const el = $('#revLeft');
    if (el) el.textContent = left;
    if (left <= 0 || !sheetOpen()) { clearInterval(timer); if (left <= 0 && sheetOpen()) decline(); }
  }, 1000);
}
function lRevive(){
  closeSheet();
  const s = st;
  s.dead = false; s.ended = false; s.deadT = 0; s.revives++;
  s.inv = 2.2; s.speed = Math.min(660, 230 + s.t * 6 + s.zone * 10);
  for (const o of s.obs){ const [top, bot] = obsSpan(o); if (bot > s.py - 320 && top < s.py + 60){ o.broken = true; o.fade = 1; } }
  burstL(s.px, s.py, 30, 'spark', { v: 100, vr: 260 });
  pop(LW / 2, s.py - 80, 'Weiter!', 'big');
  Sfx.revive(); buzz([30, 30, 90]);
  hudKey = '';
  lRunning = true; lLast = performance.now();
  lRaf = requestAnimationFrame(lLoop);
}
function lEnd(){
  lStop();
  const s = st, L = D.licht, sc = Math.floor(s.score), newBest = sc > L.best;
  L.best = Math.max(L.best, sc);
  L.bank += s.sparks; L.totalSparks += s.sparks;
  L.bestZone = Math.max(L.bestZone, s.zone + 1);
  checkRunMissions(true);
  const doneNow = L.missions.filter(m => m.done);
  save();
  ccPost({ t: 'run', score: sc, sum: ccSummary() });
  Music.play('menu');
  setTimeout(() => {
    if (current !== 'licht') return;
    sheet(`${newBest && sc > 0 ? '<span class="new">Neuer Rekord</span>' : ''}
      <h2>Erloschen</h2>
      <p>${s.sparks ? `${s.sparks} ${plural(s.sparks, 'Funke wandert', 'Funken wandern')} in deinen Vorrat.` : 'Diesmal keine Funken. Sammle sie für Upgrades und Skins.'}</p>
      <div class="stats">
        <div class="stat"><span>Punkte</span><b>${fmt(sc)}</b></div>
        <div class="stat"><span>Funken</span><b>${s.sparks}</b></div>
        <div class="stat"><span>Rekord</span><b>${fmt(L.best)}</b></div>
      </div>
      <p class="fine">Zone ${s.zone + 1} · Multiplikator bis ×${s.maxMult} · ${s.near}× knapp · ${s.fevers}× Überladung · ${Math.round(s.t)} s</p>
      ${doneNow.length ? `<div class="missions">${missionsHTML(true)}</div>` : ''}
      <div class="row">
        <button type="button" class="btn" data-act="again">Nochmal</button>
        <button type="button" class="btn sec" data-act="menu">Menü</button>
      </div>`,
      { again: () => { ensureMissions(); lStart(); }, menu: () => { ensureMissions(); go('lmenu'); } });
  }, 150);
}

/* ---------- Eingabe: relatives Ziehen, damit der Finger das Licht nicht verdeckt ---------- */
let lDrag = null;
lcv.addEventListener('pointerdown', e => {
  if (!lRunning) return;
  lDrag = { x: e.clientX, id: e.pointerId };
  try { lcv.setPointerCapture(e.pointerId); } catch (_) {}
});
lcv.addEventListener('pointermove', e => {
  if (!lDrag || e.pointerId !== lDrag.id || !st) return;
  st.tx = clamp(st.tx + (e.clientX - lDrag.x) / LSC * 1.3, LR + 2, LW - LR - 2);
  lDrag.x = e.clientX;
});
const lEndDrag = e => { if (lDrag && e.pointerId === lDrag.id) lDrag = null; };
lcv.addEventListener('pointerup', lEndDrag);
lcv.addEventListener('pointercancel', lEndDrag);
$('#lPause').addEventListener('click', () => { Sfx.ui(); if (lRunning && st && !st.dead) lPause(); else if (!lRunning && !sheetOpen()) go('lmenu'); });

/* =====================================================================
   VORSCHAUEN (Startseite und Menü)
   ===================================================================== */
function demoState(w, h, big){
  const clock = performance.now() / 1000, bx = t => w * .5 + Math.sin(t * 1.3) * 60;
  const py = h * (big ? .62 : .8), px = big ? bx(clock) : 116, trail = [];
  for (let i = 0; i < 16; i++) trail.push(big ? { x: bx(clock - (15 - i) * .04), y: py + (15 - i) * 4 } : { x: px - (15 - i) * 2.6, y: py + (15 - i) * 6 });
  const s = { t: 3, clock, dist: 30, dead: false, inv: 0, shields: 1, px, py, trail, zone: 0, zoneBanner: 0, hint: false,
    feverT: 0, pw: { magnet: 0, slow: 0, phase: 0, double: 0 }, parts: [], pops: [], pws: [], sp: [], obs: [] };
  if (big){
    s.sp = [{ x: w * .5 + 60, y: py - 20, id: 1 }, { x: w * .5 + 90, y: py - 50, id: 2 }, { x: w * .5 - 80, y: py - 30, id: 3 }];
    s.pws = [{ type: 'magnet', x: w - 50, y: py - 60, id: 9 }];
    s.obs = [{ kind: 'spin', id: 31, x: 60, y: 40, len: 44, ang: s.clock * 1.5, w: 1 }];
  } else {
    s.sp = [{ x: 128, y: h * .47, id: 1 }, { x: 128, y: h * .47 - 22, id: 2 }, { x: 56, y: h * .1, id: 3 }];
    s.obs = [{ kind: 'wall', id: 21, y: h * .55, h: 18, gw: 64, base: 96, amp: 0 },
             { kind: 'laser', id: 22, y: h * .28, h: 7, gw: 70, pos: [24, 24], per: 1, ph: 0 },
             { kind: 'mines', id: 23, y: h * .07, mines: [{ x: 60, r: 10 }, { x: 150, r: 10 }] }];
    s.pops = [{ x: 128, y: h * .4, text: '+20', life: 1, kind: '' }];
  }
  return s;
}
function drawDemo(canvas, big){
  const b = canvas.getBoundingClientRect();
  if (!b.width || !b.height) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (canvas.width !== Math.round(b.width * dpr)){ canvas.width = Math.round(b.width * dpr); canvas.height = Math.round(b.height * dpr); }
  const w = big ? b.width / 1.05 : 200, sc = b.width / w, h = b.height / sc, c = canvas.getContext('2d');
  c.setTransform(sc * dpr, 0, 0, sc * dpr, 0, 0);
  const prev = st;
  st = demoState(w, h, big);
  isPaper() ? drawPaper(c, st, w, h) : drawWarm(c, st, w, h);
  st = prev;
}
window.drawLichtPreview = () => { if (current === 'hub') drawDemo($('#lichtPreview'), false); };
let lmRaf = 0;
function lmLoop(){
  if (current !== 'lmenu'){ lmRaf = 0; return; }
  drawDemo($('#lmCanvas'), true);
  lmRaf = requestAnimationFrame(lmLoop);
}

/* =====================================================================
   LICHT-MENÜ
   ===================================================================== */
function renderLMenu(){
  const L = D.licht;
  ensureMissions();
  $('#lmSub').textContent = (EMB && EMB.name ? EMB.name + ' · ' : '') + `Rang ${L.rank} · Punkte ×${rankMul().toFixed(2).replace('.', ',')}`;
  $('#lmStats').innerHTML = `<div class="stat"><span>Rekord</span><b>${fmt(L.best)}</b></div>
    <div class="stat"><span>Funken</span><b>${fmt(L.bank)}</b></div>
    <div class="stat"><span>Beste Zone</span><b>${L.bestZone || '–'}</b></div>`;
  $('#lmMissions').innerHTML = missionsHTML(true);
}
function skinsSheet(){
  const L = D.licht;
  sheet(`<h2>Skins</h2><p class="bank">${icon('spark', 'cur-licht')} Vorrat: <b>${fmt(L.bank)}</b> Funken</p>
    <div class="skins">${Object.entries(SKINS).map(([id, s]) => {
      const owned = L.skins[id], active = L.skin === id;
      const orb = s.core === 'hue' ? 'conic-gradient(#F2C14E, #E0583A, #8A3A9C, #2F5DA8, #5E8C61, #F2C14E)' : s.core;
      const halo = s.halo === 'hue' ? 'rgba(242,193,78,.35)' : `rgba(${s.halo},.35)`;
      return `<button type="button" class="skin ${owned ? '' : 'locked'}" data-act="skin" data-id="${id}" aria-pressed="${active}" style="--orb:${orb};--halo:${halo}">
        <span class="orb"></span><b>${s.name}</b><span>${active ? 'Aktiv' : owned ? 'Auswählen' : `${icon('spark')}${s.cost}`}</span></button>`;
    }).join('')}</div>
    <button type="button" class="btn sec" data-act="back">Zurück</button>`,
    {
      skin: b => {
        const id = b.dataset.id, s = SKINS[id];
        if (!L.skins[id]){
          if (L.bank < s.cost){ Sfx.lock(); toast(`Noch ${s.cost - L.bank} Funken`, `${s.name} kostet ${s.cost}`, 'spark', null); return; }
          L.bank -= s.cost; L.skins[id] = true; unlock('l_skin'); Sfx.chest();
        }
        L.skin = id; save(); renderLMenu(); skinsSheet();
      },
      back: () => { closeSheet(); renderLMenu(); }
    }, () => { closeSheet(); renderLMenu(); });
}
function lHowto(){
  sheet(`<h2>So geht’s</h2>
    <div class="howto"><ol>
      <li>${icon('spark')}<p><b>Ziehen</b>Zieh irgendwo auf dem Bildschirm nach links oder rechts. Das Licht folgt deinem Finger, ohne dass du es verdeckst.</p></li>
      <li>${icon('bolt')}<p><b>Funkenketten</b>Alle vier Funken in Folge steigt der Multiplikator, bis ×8. Lässt du dir zu viel Zeit, reißt die Kette.</p></li>
      <li>${icon('flame')}<p><b>Überladung</b>Funken, knappe Manöver und Power-ups füllen die Leiste unten. Voll bist du kurz unverwundbar und zertrümmerst alles.</p></li>
      <li>${icon('magnet')}<p><b>Power-ups</b>Schild, Magnet, Zeitlupe, Geist und doppelte Punkte schweben in Blasen durchs Bild.</p></li>
      <li>${icon('clock')}<p><b>Zonen</b>Alle paar hundert Meter wechselt die Zone: Laser mit wandernder Lücke, Rotoren, Minen. Gestrichelte Umrisse zeigen, wohin die Laserlücke springt.</p></li>
    </ol></div>
    <button type="button" class="btn" data-act="ok">Verstanden</button>`, { ok: closeSheet }, closeSheet);
}
$('#lmStart').addEventListener('click', () => { Sfx.ui(); go('licht'); });
$('#lmUpgrades').addEventListener('click', () => { Sfx.ui(); openShop('licht', () => { closeSheet(); renderLMenu(); }); });
$('#lmSkins').addEventListener('click', () => { Sfx.ui(); skinsSheet(); });
$('#lmHelp').addEventListener('click', () => { Sfx.ui(); lHowto(); });

SCREENS.lmenu = {
  enter(){ renderLMenu(); Music.play('menu'); if (!lmRaf) lmRaf = requestAnimationFrame(lmLoop); },
  restyle(){ renderLMenu(); }
};
SCREENS.licht = {
  enter(){ lStart(); },
  leave(){ lStop(); if (st && !st.ended && !st.dead && st.t > 0){ st.dead = true; st.ended = true; lSettleQuiet(); } },
  restyle(){ if (st && !lRunning) lDraw(); }
};
function lSettleQuiet(){
  // Verlassen mitten im Lauf: Funken trotzdem gutschreiben
  const L = D.licht;
  L.best = Math.max(L.best, Math.floor(st.score));
  L.bank += st.sparks; L.totalSparks += st.sparks;
  checkRunMissions(true);
  ensureMissions();
  save();
}
window.addEventListener('resize', () => {
  if (current === 'licht'){ lResize(); if (!lRunning && st) lDraw(); }
  if (current === 'hub') window.drawLichtPreview();
});
