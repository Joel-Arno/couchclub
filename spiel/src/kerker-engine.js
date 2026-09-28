/* =====================================================================
   KERKER-WISCHER: REGELN
   Alles hier arbeitet auf dem Laufzustand `k`, der komplett gespeichert
   wird. Anzeige und Effekte liegen in kerker-ui.js.
   ===================================================================== */
let k = null;          // laufender Lauf
let T = null;          // Daten der aktuellen Aktion
let kBusy = false;     // Eingabe gesperrt (Animationen, Banner)
let kFlow = false;     // Belohnungen und Dialoge laufen gerade
let flowToken = 0;

/* ---------- Zufall mit gespeichertem Zustand ---------- */
function R(){
  const a = k.rs = (k.rs + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
function pickW(list){
  let sum = 0; for (const [, w] of list) sum += Math.max(0, w);
  let r = R() * sum;
  for (const [t, w] of list){ if ((r -= Math.max(0, w)) < 0) return t; }
  return list[0][0];
}
const pickObj = obj => pickW(Object.entries(obj));
const pickOne = arr => arr[Math.floor(R() * arr.length)];
function sampleR(arr, n){
  const pool = arr.slice(), out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(R() * pool.length), 1)[0]);
  return out;
}

/* ---------- Feld-Geometrie ---------- */
const colOf = i => i % 3, rowOf = i => (i / 3) | 0;
const adjacent = (a, b) => Math.abs(colOf(a) - colOf(b)) + Math.abs(rowOf(a) - rowOf(b)) === 1;
const inLine = (a, b) => a !== b && (colOf(a) === colOf(b) || rowOf(a) === rowOf(b));
const twoAway = (a, b) => inLine(a, b) && Math.abs(colOf(a) - colOf(b)) + Math.abs(rowOf(a) - rowOf(b)) === 2;
function nbrs(i){
  const out = [];
  if (rowOf(i) > 0) out.push(i - 3);
  if (rowOf(i) < 2) out.push(i + 3);
  if (colOf(i) > 0) out.push(i - 1);
  if (colOf(i) < 2) out.push(i + 1);
  return out;
}

/* ---------- Abgeleitete Werte ---------- */
const has = id => k.relics.includes(id);
const perk = id => k.perks[id] || 0;
const hasTr = (c, tr) => !!(c.tr && c.tr.includes(tr));
const isAdv = () => k.mode !== 'end';
const heroCard = () => k.grid[k.pos];
const say = m => { if (m && T) T.msg.push(m); };
function chargeMax(){ return Math.max(2, HEROES[k.hero].charge - perk('taktik')); }
function slotsMax(){ return HEROES[k.hero].slots + perk('taschen') + (has('beutel') ? 2 : 0) + (D.kerker.up.taschen || 0); }
function seeN(){ return 1 + perk('voraus') + (has('kugel') ? 2 : 0); }
function critChance(){
  let c = .1 + perk('praez') * .08 + (has('glueck') ? .15 : 0);
  if (k.wpn && k.wpn.t === 'dolch') c *= 3;
  return Math.min(.75, c);
}
function goldMul(){
  return (1 + (k.hero === 'schurkin' ? .5 : 0) + perk('gier') * .2 + (has('krone') ? .6 : 0)) * (k.asc >= 9 ? .8 : 1);
}
function potionBonus(){ return perk('kraut') * 2 + (has('kraeuter') ? 3 : 0) + (k.hero === 'magierin' ? 2 : 0); }
function weaponBonus(wt){
  return perk('meister') + (has('schleif') ? 2 : 0) + (has('kanone') ? 4 : 0) + (k.mod === 'glaskanone' ? 3 : 0)
    + (k.hero === 'jaegerin' && wt === 'bogen' ? 2 : 0);
}
const xpNeed = lvl => 10 + lvl * 7;
const canShoot = () => k.wpn && (k.wpn.t === 'bogen' || has('sehne'));
function roomDepth(){
  if (k.mode === 'end') return k.rooms + 1;
  return (k.world - 1) * 7 + (k.at ? k.at.r : 0) + 1;
}
const tier = () => k.mode === 'end' ? Math.min(6, 1 + Math.floor(k.rooms / 6)) : k.world;
function cardName(c){
  if (c.type === 'boss') return BOSSES[c.boss].name;
  if (c.type === 'monster') return c.ename || MONSTERS[c.kind].name;
  if (c.type === 'weapon') return WEAPONS[c.wt].name;
  if (c.type === 'item') return ITEMS[c.it].name;
  return CARDS[c.type] ? CARDS[c.type].name : '';
}
function cardArt(c){
  if (c.type === 'boss') return BOSSES[c.boss].art;
  if (c.type === 'monster') return c.eart || c.ename || MONSTERS[c.kind].art;
  return cardName(c);
}
function mk(type, val = 0, extra = {}){
  return Object.assign({ id: k.uid++, type, val, rot: (vr() * 4 - 2).toFixed(2) + 'deg' }, extra);
}
function initCds(c){
  c.cd = {};
  for (const tr of c.tr || []) if (TRAITS[tr] && TRAITS[tr].cd) c.cd[tr] = cdStart(tr);
}
function cdStart(tr){ return Math.max(1, TRAITS[tr].cd + (has('uhrwerk') ? 1 : 0) - (k.asc >= 7 ? 1 : 0)); }

/* =====================================================================
   NEUER LAUF
   ===================================================================== */
const dailyHero = (key = todayKey()) => HERO_IDS[hashStr('held-' + key) % HERO_IDS.length];
const dailyMod = (key = todayKey()) => MOD_IDS[hashStr('mod-' + key) % MOD_IDS.length];
function newRun(mode, asc = 0){
  const hero = mode === 'daily' ? dailyHero() : D.kerker.hero;
  const H = HEROES[hero], up = D.kerker.up;
  const seed = mode === 'daily' ? hashStr('gruft2-' + todayKey()) : (Date.now() ^ Math.floor(vr() * 0x7fffffff)) >>> 0;
  k = {
    v: 2, mode, hero, asc: mode === 'adv' ? asc : 0, mod: mode === 'daily' ? dailyMod() : null, rs: seed | 0, uid: 1,
    maxHp: H.hp + up.hp * 2 - (asc >= 5 ? 3 : 0), hp: 0, armor: H.armor + up.armor * 2, wpn: null, gold: 0, poison: 0,
    xp: 0, lvl: 1, charge: 0, rage: 0, elixir: 0, frozen: 0, keys: 0,
    items: [], perks: {}, relics: [], phoenixUsed: false, sigils: [],
    world: 1, map: null, at: null, room: null, grid: [], pos: 4, queue: [],
    steps: 0, kills: 0, bosses: 0, elites: 0, rooms: 0, crits: 0, streak: 0, bestStreak: 0, itemsUsed: 0, rangedKills: 0,
    bloodCount: 0, shrineCd: 10, pq: [], targeting: null, lastLog: '', intro: true,
    over: false, won: false, dead: false, killer: ''
  };
  if (k.mod === 'glaskanone') k.maxHp = Math.ceil(k.maxHp / 2);
  k.hp = k.maxHp;
  k.charge = Math.min(up.charge, chargeMax() - 1);
  if (H.weapon) k.wpn = { t: H.weapon[0], v: H.weapon[1] + [0, 1, 2, 3][up.wpn] + weaponBonus(H.weapon[0]) };
  else if (up.wpn) k.wpn = { t: 'dolch', v: 1 + up.wpn * 2 };
  H.items.forEach(id => k.items.push({ id }));
  if (up.vorrat) k.items.push({ id: 'trank' });
  if (k.mode === 'end') k.map = null;
  else k.map = genMap(1);
  if (up.relic) k.pq.push({ t: 'relic', src: 'start' });
}
function startRun(mode, asc = 0){
  const kd = D.kerker;
  if (mode !== 'daily' && !kd.heroes[kd.hero]){ Sfx.lock(); return; }
  if (kd.run && !kd.run.over) settleAbandon(kd.run);
  newRun(mode, asc);
  D.stats.kRuns++;
  if (mode === 'daily'){
    const today = todayKey(), dd = kd.daily;
    if (dd.key !== today){
      dd.streak = dd.last && dayDiff(dd.last, today) === 1 ? dd.streak + 1 : 1;
      dd.last = today; dd.key = today; dd.best = 0; dd.runs = 0;
    }
    dd.runs++;
    unlock('k_daily');
  }
  kd.run = k; save();
  if (k.mode === 'end'){ enterRoom(endlessRoomType()); }
  else go('kmap');
}
function settleAbandon(run){
  if (!run || !run.gold) { D.kerker.run = null; return; }
  D.kerker.bank += run.gold;
  D.kerker.best = Math.max(D.kerker.best, run.gold);
  D.kerker.run = null;
}
function saveRun(){ if (k && !k.over){ D.kerker.run = k; save(); } }

/* =====================================================================
   KARTE EINER WELT
   ===================================================================== */
function genMap(world){
  const nRows = world === 6 ? 4 : 6, rows = [];
  for (let r = 0; r < nRows; r++){
    const n = r === 0 ? 3 : r === nRows - 1 ? ri(2, 3) : ri(2, 4);
    const row = [];
    for (let i = 0; i < n; i++) row.push({ r, i, x: (i + .5) / n, type: 'kampf', next: [], done: false });
    rows.push(row);
  }
  rows.push([{ r: nRows, i: 0, x: .5, type: 'boss', next: [], done: false }]);
  for (let r = 0; r < rows.length - 1; r++){
    const a = rows[r], b = rows[r + 1];
    let i = 0, j = 0;
    for (;;){
      if (!a[i].next.includes(j)) a[i].next.push(j);
      if (i === a.length - 1 && j === b.length - 1) break;
      if (i === a.length - 1) j++;
      else if (j === b.length - 1) i++;
      else { const x = R(); if (x < .34) i++; else if (x < .68) j++; else { i++; j++; } }
    }
  }
  for (let r = 1; r < nRows - 1; r++){
    for (const n of rows[r]){
      n.type = pickW([['kampf', 44], ['ereignis', 20], ['elite', r >= 2 ? 16 : 0], ['schatz', 9], ['haendler', 10]]);
    }
  }
  rows[nRows - 1].forEach(n => { n.type = 'rast'; });
  const mid = rows.slice(2, nRows - 1).flat();
  if (!mid.some(n => n.type === 'haendler')) pickOne(mid).type = 'haendler';
  if (!mid.some(n => n.type === 'elite')){ const c = mid.filter(n => n.type !== 'haendler'); if (c.length) pickOne(c).type = 'elite'; }
  // In der ersten Welt ist die zweite Reihe gemischt, aber ohne Elite
  return { world, rows };
}
function reachable(){
  if (!k.map) return [];
  const rows = k.map.rows;
  if (!k.at) return rows[0].map(n => [0, n.i]);
  const cur = rows[k.at.r][k.at.i];
  if (!cur.done || k.at.r >= rows.length - 1) return [];
  return cur.next.map(j => [k.at.r + 1, j]);
}
function enterNode(r, i){
  if (!k || k.over || kBusy || kFlow || k.pq.length) return;
  if (!reachable().some(([a, b]) => a === r && b === i)) return;
  k.at = { r, i };
  const node = k.map.rows[r][i];
  Sfx.ui();
  if (node.type === 'haendler'){ k.pq.push({ t: 'shop' }, { t: 'nodedone' }); saveRun(); return flow(); }
  if (node.type === 'rast'){ k.pq.push({ t: 'rest' }, { t: 'nodedone' }); saveRun(); return flow(); }
  if (node.type === 'ereignis'){ k.pq.push({ t: 'event', id: pickEvent() }, { t: 'nodedone' }); saveRun(); return flow(); }
  enterRoom(node.type);
}
function endlessRoomType(){
  const n = k.rooms;
  if (n % 10 === 9) return 'boss';
  if (n % 5 === 4) return 'elite';
  if (n % 7 === 6) return 'schatz';
  return 'kampf';
}

/* =====================================================================
   RÄUME
   ===================================================================== */
function enterRoom(type){
  setupRoom(type);
  saveRun();
  if (current === 'kerker') SCREENS.kerker.enter(); else go('kerker');
}
function setupRoom(type){
  const depth = roomDepth(), row = k.at ? k.at.r : (k.rooms % 7);
  k.room = { type, depth, turns: 0, kills: 0, gold: 0, unrest: 0, exit: false, keyAt: 0, keyOut: false, intro: true, hurt: 0 };
  k.queue = [];
  k.targeting = null;
  k.grid = new Array(9).fill(null);
  k.pos = type === 'boss' ? 7 : 4;
  k.grid[k.pos] = mk('hero');
  let goal;
  if (type === 'kampf'){
    const kind = pickW([['kill', 38], ['gold', 16], ['survive', 14], ['key', 16], ['hunt', 16]]);
    goal = { kind, prog: 0 };
    if (kind === 'kill') goal.n = 4 + Math.floor(row / 2) + (tier() >= 3 ? 1 : 0);
    if (kind === 'gold') goal.n = 12 + depth * 2;
    if (kind === 'survive') goal.n = 9 + Math.floor(row / 2);
    if (kind === 'key') k.room.keyAt = ri(5, 8);
  } else if (type === 'elite') goal = { kind: 'elite', prog: 0 };
  else if (type === 'schatz'){ goal = { kind: 'treasure', prog: 0 }; k.room.keyAt = ri(3, 5); }
  else goal = { kind: 'boss', prog: 0 };
  k.room.goal = goal;
  const corners = [0, 2, 6, 8].filter(i => i !== k.pos && !adjacent(i, k.pos));
  for (let i = 0; i < 9; i++) if (!k.grid[i]) k.grid[i] = genCard(true);
  if (type === 'elite'){ const c = pickOne(corners); k.grid[c] = makeElite(); goal.name = k.grid[c].ename; }
  if (type === 'schatz'){ const c = pickOne(corners); k.grid[c] = mk('lockchest'); }
  if (type === 'boss'){ k.grid[1] = makeBoss(); goal.name = BOSSES[k.grid[1].boss].name; }
  if (goal.kind === 'hunt'){
    const c = pickOne(corners);
    const m = makeMonster(tier(), depth, false);
    m.val += 3; m.orig = m.val; m.leader = true;
    k.grid[c] = m;
  }
  k.grid.forEach(c => { if (c) c.fresh = false; });
  refillQueue();
  // Effekte zu Raumbeginn
  let arm = (k.hero === 'ritter' ? 1 : 0) + perk('wall');
  if (arm) k.armor = Math.min(30, k.armor + arm);
}
function refillQueue(){ while (k.queue.length < 3) k.queue.push(genCard(false)); }
function nextCard(){
  const c = k.queue.shift();
  refillQueue();
  if (c.type === 'monster' || c.type === 'bomb' || c.type === 'boss') c.fresh = true;
  return c;
}
function goalText(){
  const g = k.room.goal;
  return g.kind === 'elite' || g.kind === 'boss' ? GOALS[g.kind](g.name) : GOALS[g.kind](g.n);
}
function goalProgress(){
  const g = k.room && k.room.goal;
  if (!g || g.done) return;
  if (g.kind === 'kill') g.prog = k.room.kills;
  if (g.kind === 'gold') g.prog = k.room.gold;
  if (g.kind === 'survive') g.prog = k.room.turns;
  if (g.n && g.prog >= g.n) goalDone();
  // Sicherheitsnetz: Ist das Ziel-Monster auf anderem Weg verschwunden, darf der Raum nicht hängen bleiben
  if ((g.kind === 'hunt' || g.kind === 'elite') && !g.done && !k.grid.some(c => c && !c.dead && (g.kind === 'hunt' ? c.leader : c.elite))) goalDone();
}
function goalDone(){
  const g = k.room.goal;
  if (g.done) return;
  g.done = true;
  if (g.n) g.prog = g.n;
  k.queue.unshift(mk('stairs'));
  say('<b>Ziel erreicht!</b> Die Treppe kommt als nächste Karte.');
  if (T) T.goal = true;
  Sfx.floor(); buzz([20, 30, 20]);
}

/* =====================================================================
   KARTEN ERZEUGEN
   ===================================================================== */
function scaleOf(depth){
  return Math.floor((depth - 1) * .22) + (k.asc >= 1 ? 1 : 0) + (has('krone') ? 1 : 0) + (k.mod === 'blutmond' ? 1 : 0) + (k.room ? k.room.unrest : 0);
}
function genCard(initial){
  const r = k.room, F = tier(), d = r.depth, luck = D.kerker.up.luck, m = k.mod;
  const onBoard = t => k.grid.some(c => c && c.type === t) || k.queue.some(c => c.type === t);
  const t = pickW([
    ['monster', (initial ? 30 : 42) + (r.goal && r.goal.kind === 'survive' ? 12 : 0) + (r.type === 'schatz' ? -12 : 0) + r.unrest * 3],
    ['weapon', 11],
    ['potion', 11 + luck * 2 - (k.asc >= 8 ? 4 : 0)],
    ['gold', 15 + (r.type === 'schatz' ? 14 : 0) + (m === 'goldrausch' ? 4 : 0)],
    ['chest', 4 + luck * 2 + (r.type === 'schatz' ? 8 : 0) + (m === 'markttag' ? 3 : 0)],
    ['armor', 6],
    ['item', 3.5],
    ['bomb', initial ? 0 : m === 'pulverfass' ? 11 : F >= 2 ? 4 : 1.5],
    ['trap', initial ? 0 : F >= 2 ? 3 : 1.5],
    ['shrine', initial || onBoard('shrine') || k.shrineCd > 0 ? 0 : (m === 'schreine' ? 3 : .8)]
  ]);
  switch (t){
    case 'monster': return makeMonster(F, d, initial);
    case 'weapon':  return makeWeapon(d);
    case 'potion':  return mk('potion', ri(3, 5) + Math.floor(d * .2));
    case 'gold':    return mk('gold', ri(1, 4) + Math.floor(d * .35));
    case 'chest':   return mk('chest', 0, { mimic: !has('klee') && F >= 2 && R() < (F >= 3 ? .2 : .12) });
    case 'armor':   return mk('armor', ri(2, 3) + Math.floor(d * .12));
    case 'item':    return mk('item', 0, { it: pickItemId() });
    case 'bomb':    return mk('bomb', ri(3, 5));
    case 'trap':    return mk('trap', 2 + Math.floor(d * .15) + ri(0, 1));
    default:        k.shrineCd = 25; return mk('shrine');
  }
}
function pickItemId(){
  return pickW([['trank', 20], ['bombe', 16], ['feuer', 12], ['teleport', 10], ['frost', 8], ['wetz', 12], ['rauch', 5], ['elixier', 8], ['gegengift', 7]]);
}
function makeWeapon(d, bonus = 0){
  const wt = pickW([['schwert', 30], ['dolch', 18], ['axt', 18], ['hammer', 16], ['bogen', 16]]);
  return mk('weapon', Math.max(2, ri(3, 5) + Math.floor(d * .33) + WEAPONS[wt].mod + bonus), { wt });
}
function makeMonster(F, d, initial, kind){
  kind = kind || pickObj(MONSTER_POOL[Math.min(6, F)]);
  const M = MONSTERS[kind];
  let v = ri(M.v[0], M.v[1]) + scaleOf(d);
  if (initial) v = Math.max(1, Math.round(v * .7));
  const tr = M.tr.slice();
  if (kind === 'skull' && F === 1) tr.length = 0;
  const c = mk('monster', v, { kind, tr, orig: v });
  initCds(c);
  return c;
}
function makeElite(){
  const E = pickOne(ELITES[Math.min(6, tier())]);
  let v = ri(E.v[0], E.v[1]) + Math.floor(scaleOf(k.room.depth) * .4) + (k.mode === 'end' ? Math.floor(k.rooms / 3) : 0);
  if (k.asc >= 2) v = Math.round(v * 1.25);
  const c = mk('monster', v, { kind: E.kind, tr: E.tr.slice(), orig: v, elite: true, ename: E.name, eart: E.art });
  initCds(c);
  return c;
}
function makeBoss(){
  let id, hp;
  if (k.mode === 'end'){
    id = pickOne(BOSS_IDS.filter(b => b !== 'namenlos' || tier() >= 6));
    hp = Math.round(16 + k.rooms * 1.5);
  } else { id = WORLDS[k.world - 1].boss; hp = BOSSES[id].hp; }
  if (k.asc >= 4) hp = Math.round(hp * 1.2);
  return mk('boss', hp, { boss: id, max: hp, cd: BOSSES[id].every, form: 0, tr: [] });
}

/* =====================================================================
   SPIELZUG
   ===================================================================== */
function canAct(){ return k && !k.over && !kBusy && !kFlow && !k.pq.length && current === 'kerker' && !sheetOpen() && k.room && !k.room.exit; }
function beginTurn(){ T = { kills: 0, msg: [], hurt: 0, goal: false, phase: null }; }

function move(dir){
  if (!canAct()) return;
  if (k.targeting) setTargeting(null);
  const [dx, dy] = DIRS[dir];
  const c = colOf(k.pos) + dx, r = rowOf(k.pos) + dy;
  if (c < 0 || c > 2 || r < 0 || r > 2){ Sfx.bump(); anim(heroCard(), 'shake'); return; }
  const ti = r * 3 + c, t = k.grid[ti];
  if (t.type === 'lockchest' && !k.keys){
    Sfx.lock(); anim(t, 'shake');
    log('Verschlossen. Du brauchst den <b>Schlüssel</b> dieses Raums.');
    return;
  }
  beginTurn();
  const moveIn = interact(ti);
  if (!k.dead && moveIn) shift(ti, dx, dy);
  endTurn();
}
function shoot(ti){
  if (!canAct() || !canShoot()) return;
  const t = k.grid[ti];
  if (!twoAway(ti, k.pos) || (t.type !== 'monster' && t.type !== 'boss')) return;
  if (k.targeting) setTargeting(null);
  beginTurn();
  FX.arrow(k.pos, ti, true);
  Sfx.weapon();
  const name = cardName(t);
  if (hasTr(t, 'geist')){ say(`Der Pfeil fliegt durch ${name} hindurch.`); endTurn(); return; }
  const res = weaponHit(t, ti, true);
  if (res === 'dead'){ clearKilled(ti, t); say(`Treffer aus der Ferne! ${name} fällt.`); }
  else if (res === 'rose') say(`${name} erhebt sich wieder!`);
  else say(`Treffer aus der Ferne! ${name} hat noch <b>${t.val}</b>.`);
  endTurn();
}
function shift(ti, dx, dy){
  const t = k.grid[ti], hero = heroCard();
  if (t !== hero) removeNode(t);
  let cc = colOf(k.pos), cr = rowOf(k.pos);
  k.grid[ti] = hero;
  for (;;){
    const bc = cc - dx, br = cr - dy;
    if (bc < 0 || bc > 2 || br < 0 || br > 2) break;
    k.grid[cr * 3 + cc] = k.grid[br * 3 + bc];
    cc = bc; cr = br;
  }
  k.pos = ti;
  k.grid[cr * 3 + cc] = nextCard();
  Sfx.step();
}

function interact(ti){
  const t = k.grid[ti];
  switch (t.type){
    case 'monster': case 'boss': return fight(t, ti);
    case 'weapon': {
      const v = t.val + weaponBonus(t.wt), old = k.wpn;
      k.wpn = { t: t.wt, v };
      fxAt(ti, `${WEAPONS[t.wt].name} ${v}`, 'muted');
      say(`${WEAPONS[t.wt].name} aufgenommen: Stärke <b>${v}</b>.` + (old ? ` Dein ${WEAPONS[old.t].name} (${old.v}) bleibt zurück.` : ''));
      Sfx.weapon();
      tipFor('w_' + t.wt);
      return true;
    }
    case 'armor':
      k.armor = Math.min(30, k.armor + t.val);
      fxAt(ti, '+' + t.val, 'armor');
      say(`Rüstung <b>+${t.val}</b>.`);
      Sfx.shield();
      return true;
    case 'potion': {
      const heal0 = t.val + potionBonus();
      if (k.hp >= k.maxHp && k.items.length < slotsMax()){
        k.items.push({ id: 'trank', v: t.val });
        fxAt(ti, 'eingesteckt', 'muted');
        say('Du bist voll bei Kräften und steckst den Trank ein.');
        Sfx.ui();
        return true;
      }
      const g = heal(heal0);
      if (has('traene')) k.armor = Math.min(30, k.armor + 3);
      fxAt(ti, '+' + g, 'good');
      say(g ? `Trank getrunken: <b>+${g}</b> Leben.` : 'Trank getrunken, aber du warst schon voll.');
      Sfx.potion();
      return true;
    }
    case 'gold': {
      const g = Math.round(t.val * (has('midas') ? 1.5 : 1) * (k.mod === 'goldrausch' ? 2 : 1) * goldMul());
      gainGold(g, ti, true);
      say(`<b>+${g}</b> Gold.`);
      Sfx.coin();
      return true;
    }
    case 'chest': return openChest(t, ti);
    case 'bomb': {
      const g = perk('spreng') ? 8 : 3;
      gainGold(g, ti, true);
      say(`Bombe entschärft: <b>+${g}</b> Gold.`);
      Sfx.defuse();
      return true;
    }
    case 'trap':
      if (has('stiefel') || perk('giftfest')){ say('Die Falle schnappt ins Leere. Dir passiert nichts.'); Sfx.defuse(); return true; }
      Sfx.trap();
      hurt(t.val, 'trap', 'Eine Stachelfalle');
      say(`Stachelfalle! <b>−${t.val}</b>.`);
      return true;
    case 'shrine':
      pqPush({ t: 'relic', src: 'shrine' });
      say('Ein Schrein leuchtet auf.');
      Sfx.relic();
      return true;
    case 'item':
      addItem(t.it);
      fxAt(ti, ITEMS[t.it].name, 'muted');
      say(`<b>${ITEMS[t.it].name}</b> gefunden.`);
      Sfx.chest();
      return true;
    case 'key':
      k.keys++;
      fxAt(ti, 'Schlüssel!', 'gold');
      Sfx.chest();
      if (k.room.goal.kind === 'key') goalDone();
      else say('Du hast den <b>Schlüssel</b>. Jetzt zur Schatztruhe!');
      return true;
    case 'lockchest': {
      k.keys--;
      const d = k.room.depth;
      gainGold(20 + d * 2, ti);
      addItem(pickItemId());
      if (R() < (has('klee') ? .6 : .35)) pqPush({ t: 'relic', src: 'chest' });
      Sfx.victory(); FX.sparkle(ti);
      say('<b>Die Schatztruhe springt auf!</b>');
      if (k.room.goal.kind === 'treasure') goalDone();
      return true;
    }
    case 'stairs':
      k.room.exit = true;
      Sfx.floor();
      return true;
  }
  return true;
}

/* ---------- Kampf ---------- */
function weaponHit(t, ti, ranged){
  const W = k.wpn, wt = W.t, boss = t.type === 'boss';
  const elix = k.elixir > 0; if (elix) k.elixir--;
  const rage = k.rage > 0; if (rage) k.rage--;
  let cap = Infinity;
  if (wt !== 'hammer'){
    if (hasTr(t, 'panzer')) cap = 3;
    if (boss && t.boss === 'waechter') cap = 4;
  }
  const crit = R() < critChance();
  const power = W.v * (elix ? 2 : 1) * (crit ? 2 : 1);
  const dealt = Math.min(power, cap, t.val);
  t.val -= dealt;
  if (!crit && !rage) W.v = Math.max(0, W.v - (elix ? Math.ceil(dealt / 2) : dealt));
  if (crit){
    k.crits++; fxAt(ti, 'Kritisch!', 'crit'); Sfx.crit(); buzz([20, 20, 40]);
    if (k.crits >= 5) unlock('k_crit');
  }
  if (wt === 'axt') cleave(ti);
  if (W.v <= 0){ k.wpn = null; say(`Dein ${WEAPONS[wt].name} ist zerbrochen.`); }
  if (cap < Infinity && power > cap) say(`Der Panzer lässt nur ${cap} Schaden durch.`);
  if (t.val <= 0) return defeat(t, ti, ranged ? 'ranged' : 'weapon') ? 'dead' : 'rose';
  fxAt(ti, '−' + dealt, 'bad'); anim(t, 'flash'); FX.hit(ti);
  if (wt === 'hammer'){ t.stun = 2; fxAt(ti, 'betäubt', 'muted'); }
  if (!crit) Sfx.clash();
  buzz(25);
  return 'hit';
}
function cleave(ti){
  for (const j of nbrs(ti)){
    const n = k.grid[j];
    if (j === k.pos || (n.type !== 'monster' && n.type !== 'boss')) continue;
    n.val -= 2;
    if (n.val <= 0){ if (defeat(n, j, 'weapon')) clearKilled(j, n); }
    else { fxAt(j, '−2', 'bad'); anim(n, 'flash'); }
  }
}
function fight(t, ti){
  const name = cardName(t), boss = t.type === 'boss';
  if (k.wpn && !hasTr(t, 'geist')){
    const wpnName = WEAPONS[k.wpn.t].name;
    const res = weaponHit(t, ti, false);
    if (res === 'dead'){
      say(`${name} besiegt.` + (k.wpn ? ` ${WEAPONS[k.wpn.t].name} hält noch <b>${k.wpn.v}</b>.` : ''));
      return true;
    }
    lunge(heroCard(), k.pos, ti);
    if (res === 'rose'){ say(`${name} fällt, erhebt sich aber wieder!`); return false; }
    say(k.wpn ? `Treffer! ${name} hat noch <b>${t.val}</b>, ${wpnName} noch <b>${k.wpn.v}</b>.` : `${name} hat noch <b>${t.val}</b>.`);
    return false;
  }
  const rage = k.rage > 0; if (rage) k.rage--;
  const dmg = rage ? Math.floor(t.val / 2) : t.val;
  hurt(dmg, 'fight', cardArt(t));
  if (k.dead) return false;
  if (hasTr(t, 'gift') || (boss && t.boss === 'koenigin')) poison(3);
  let extra = '';
  if (k.hero === 'berserker'){ const g = heal(2); if (g) extra = ` Blutdurst: <b>+${g}</b>.`; }
  const dead = defeat(t, ti, 'hand');
  if (!dead){ say(`${name} fällt, erhebt sich aber wieder! <b>−${dmg}</b> Leben.`); lunge(heroCard(), k.pos, ti); return false; }
  say(`${name} ohne Waffe besiegt: <b>−${dmg}</b> Leben.${extra}` + (hasTr(t, 'geist') && k.wpn ? ' (Waffen gleiten durch Geister.)' : '') + (rage ? ' Die Raserei halbiert den Schaden.' : ''));
  return true;
}
function defeat(t, ti, how){
  if (hasTr(t, 'wieder') && !t.risen && how !== 'fire' && how !== 'bomb' && !has('laterne')){
    t.risen = true;
    t.val = Math.max(1, Math.ceil((t.orig || 2) / 2));
    fxAt(ti, 'erhebt sich!', 'bad'); anim(t, 'flash'); Sfx.reveal();
    return false;
  }
  killed(t, ti, how);
  return true;
}
function clearKilled(ti, t){
  if (k.grid[ti] !== t) return;
  removeNode(t);
  k.grid[ti] = t.type === 'boss' ? mk('gold', 5 + k.world * 3) : mk('gold', Math.max(1, Math.ceil((t.orig || 2) / 2)));
}
function killed(t, ti, how){
  if (t.dead) return;
  t.dead = true;
  k.kills++; T.kills++; D.stats.kKills++;
  if (k.room) k.room.kills++;
  if (how === 'ranged'){ k.rangedKills++; D.kerker.rangedKills = (D.kerker.rangedKills || 0) + 1; }
  const xp = (Math.ceil((t.orig || t.val || 2) / 2) + 1) * (t.elite ? 3 : 1) * (t.type === 'boss' ? 4 : 1);
  gainXP(Math.round(xp * (has('schaedel') ? 1.5 : 1) * (k.mod === 'blutmond' ? 2 : 1)));
  if (how !== 'ability') addCharge(has('horn') ? 2 : 1);
  if (has('vampir')) heal(1);
  if (perk('blut')){ k.bloodCount++; if (k.bloodCount % 3 === 0) heal(2 * perk('blut')); }
  if (t.loot) gainGold(Math.round(t.loot * 2 * (perk('pluender') ? 1.5 : 1)), ti, true);
  if (t.kind === 'mimic') gainGold((t.orig || 5) * 2, ti);
  if (t.elite){
    k.elites++; D.stats.kElites = (D.stats.kElites || 0) + 1;
    if (D.stats.kElites >= 10) unlock('k_elite');
    D.kerker.codex['e_' + t.ename] = 1;
    if (k.mode !== 'end' && k.world >= 2 && k.world <= 4 && !k.sigils.includes(k.world)){
      k.sigils.push(k.world);
      say(`<b>Ein Siegelsplitter!</b> (${k.sigils.length} von 3)`);
      toast('Siegelsplitter', `${k.sigils.length} von 3 gefunden`, 'sigil', 'relic');
      if (k.sigils.length >= 3) unlock('k_sigil');
    }
    if (k.room.goal.kind === 'elite') goalDone();
  }
  if (t.leader && k.room.goal.kind === 'hunt') goalDone();
  Sfx.kill(); buzz(15);
  FX.splat(ti, splatColors(t));
  unlock('k_first');
  if (t.type === 'boss') bossDown(t, ti);
  if (hasTr(t, 'explo')) monsterBlast(ti);
  goalProgress();
}
function monsterBlast(ti){
  FX.explosion(ti); Sfx.explode(); quake(1); buzz([40, 20, 60]);
  say('<b>Explosion!</b>');
  for (const j of nbrs(ti)){
    const n = k.grid[j];
    if (!n) continue;
    if (j === k.pos){ if (!has('feuerfest') && !perk('spreng')) hurt(3, 'blast', 'Eine Explosion'); continue; }
    if ((n.type === 'monster' || n.type === 'boss') && !n.dead){
      n.val -= 4;
      if (n.val <= 0){ if (defeat(n, j, 'bomb')) clearKilled(j, n); }
      else { fxAt(j, '−4', 'bad'); anim(n, 'flash'); }
    } else if (n.type === 'bomb') n.val = Math.min(n.val, 1);
  }
}
function bossDown(t, ti){
  k.bosses++; D.stats.kBosses++;
  unlock('k_boss');
  if (!k.room.hurt) unlock('k_nohit');
  if (k.room.goal.kind === 'boss') goalDone();
  quake(2); buzz([60, 40, 100]);
  T.bossDown = t.boss;
}
function addCharge(n){
  const max = chargeMax(), before = k.charge;
  k.charge = Math.min(max, k.charge + n);
  if (before < max && k.charge >= max){ say(`<b>${ABILITIES[HEROES[k.hero].ability].name}</b> ist bereit!`); tone(880, .12, 'triangle', .05); }
}
function hurt(n, src, who){
  if (n <= 0 || k.dead) return 0;
  if (src !== 'poison' && k.armor > 0){
    const a = Math.min(k.armor, n);
    k.armor -= a; n -= a;
    fxAt(k.pos, '−' + a, 'armor');
    Sfx.armor();
  }
  if (n > 0){
    k.hp -= n;
    if (T) T.hurt += n;
    if (k.room) k.room.hurt += n;
    fxAt(k.pos, '−' + n, src === 'poison' ? 'poison' : 'bad');
    anim(heroCard(), 'shake');
    if (src === 'poison') Sfx.poison();
    else { Sfx.hit(); buzz(n >= 5 ? [60, 30, 60] : 50); FX.hurt(k.pos); }
    if (n >= 5) quake(n >= 9 ? 2 : 1);
  }
  if (k.hp <= 0){
    if (has('phoenix') && !k.phoenixUsed){
      k.phoenixUsed = true; k.hp = Math.min(8, k.maxHp); k.poison = 0;
      FX.phoenix(k.pos); Sfx.phoenix(); buzz([40, 30, 40, 30, 120]); unlock('k_phoenix');
      say('<b>Die Phönixfeder verbrennt</b> und du stehst wieder auf!');
    } else { k.hp = 0; k.dead = true; k.killer = who || 'Etwas'; }
  }
  return n;
}
function hurtSafe(n){
  // Schaden aus Ereignissen: nie tödlich
  const a = Math.min(k.armor, n); k.armor -= a; n -= a;
  k.hp = Math.max(1, k.hp - n);
  return n;
}
function heal(n){
  const g = Math.max(0, Math.min(n, k.maxHp - k.hp));
  k.hp += g;
  if (g) anim(heroCard(), 'heal');
  return g;
}
function poison(n){
  if (has('stiefel') || perk('giftfest')) return;
  k.poison = Math.min(9, k.poison + n);
  say('<b>Vergiftet!</b>');
  Sfx.poison();
}
function gainGold(g, ti, raw){
  if (!raw) g = Math.round(g * goldMul());
  if (g <= 0) return 0;
  k.gold += g; D.stats.kGold += g;
  if (k.room) k.room.gold += g;
  if (ti != null && k.room){ fxAt(ti, '+' + g, 'gold'); FX.coins(ti, Math.min(8, 2 + Math.floor(g / 4))); }
  if (k.gold >= 300) unlock('k_rich');
  return g;
}
function gainXP(n){
  k.xp += n;
  while (k.xp >= xpNeed(k.lvl)){
    k.xp -= xpNeed(k.lvl);
    k.lvl++;
    pqPush({ t: 'perk', lvl: k.lvl });
    if (has('kelch') || perk('zweit')) k.hp = k.maxHp; else heal(3);
    if (k.lvl >= 10) unlock('k_level10');
    tipFor('levelup');
    if (T) T.level = true;
  }
}
function openChest(t, ti){
  if (t.mimic){
    t.type = 'monster'; t.kind = 'mimic'; t.mimic = false; t.tr = [];
    t.val = t.orig = ri(5, 6 + k.world * 2) + scaleOf(k.room.depth);
    initCds(t);
    Sfx.reveal(); buzz([40, 20, 80]); quake(1); anim(t, 'flash');
    unlock('k_mimic');
    hurt(2, 'bite', 'Ein Mimic');
    say(`<b>Die Truhe beißt!</b> Ein Mimic mit Stärke ${t.val}.`);
    return false;
  }
  const d = k.room.depth, r = R(), plus = perk('pluender') ? 1.5 : 1;
  if (r < .38){
    const g = Math.round((ri(6, 10) + d * 1.5) * (has('auge') ? 1.5 : 1) * plus);
    gainGold(g, ti); say('Truhe geöffnet: Gold!');
  } else if (r < .54){
    const g = heal(6 + Math.floor(d / 4)); fxAt(ti, '+' + g, 'good');
    say(g ? `Truhe geöffnet: ein Heiltrank, <b>+${g}</b> Leben.` : 'Truhe geöffnet: ein Heiltrank, aber du warst schon voll.');
  } else if (r < .68){
    const w = makeWeapon(d, 1), v = w.val + weaponBonus(w.wt);
    if (!k.wpn || v > k.wpn.v){ k.wpn = { t: w.wt, v }; fxAt(ti, `${WEAPONS[w.wt].name} ${v}`, 'muted'); say(`Truhe geöffnet: ${WEAPONS[w.wt].name} mit Stärke <b>${v}</b>.`); }
    else { gainGold(6, ti); say('Truhe geöffnet: eine schwächere Waffe. Du verkaufst sie.'); }
  } else if (r < .8){
    const a = 3 + Math.floor(d / 8); k.armor = Math.min(30, k.armor + a); fxAt(ti, '+' + a, 'armor');
    say(`Truhe geöffnet: Rüstung <b>+${a}</b>.`);
  } else if (r < (has('klee') ? .88 : .94)){
    const id = pickItemId(); addItem(id);
    say(`Truhe geöffnet: <b>${ITEMS[id].name}</b>.`);
  } else {
    pqPush({ t: 'relic', src: 'chest' });
    say('<b>In der Truhe liegt ein Relikt!</b>');
  }
  Sfx.chest();
  return true;
}
function addItem(id, v){
  if (k.items.length < slotsMax()){ k.items.push(v ? { id, v } : { id }); return true; }
  pqPush({ t: 'itemfull', item: v ? { id, v } : { id } });
  return false;
}
const hasItem = id => k.items.some(it => it.id === id);
function removeItem(id){ const i = k.items.findIndex(it => it.id === id); if (i >= 0) k.items.splice(i, 1); }

/* ---------- Zugende ---------- */
function endTurn(){
  k.steps++; D.stats.kSteps++;
  k.room.turns++;
  if (!k.dead){
    if (T.kills > 0){
      k.streak++;
      k.bestStreak = Math.max(k.bestStreak, k.streak);
      D.stats.kBestStreak = Math.max(D.stats.kBestStreak, k.streak);
      if (k.streak >= 3){
        const b = Math.min(10, k.streak);
        gainGold(b, k.pos);
        say(`Serie ×${k.streak}: <b>+${Math.round(b * goldMul())}</b> Gold!`);
        Sfx.streak(k.streak);
        if (has('sporn')) k.armor = Math.min(30, k.armor + 1);
      }
      if (k.streak >= 5) unlock('k_streak');
    } else k.streak = 0;
    if (k.poison > 0){ k.poison--; hurt(1, 'poison', 'Das Gift'); }
    if (!k.dead && k.mod === 'giftnebel' && k.steps % 8 === 0) poison(2);
    if (!k.dead) monsterTicks();
    if (!k.dead) bombTicks();
    if (!k.dead) bossTicks();
  }
  k.grid.forEach(c => { if (c) c.fresh = false; });
  if (k.frozen > 0) k.frozen--;
  if (k.shrineCd > 0) k.shrineCd--;
  const r = k.room;
  if (r.goal.done && !r.exit){
    r.calm = (r.calm || 0) + 1;
    if (r.calm % (k.asc >= 10 ? 3 : 5) === 0){ r.unrest++; say(`<b>Die Gruft wird unruhig.</b> Neue Monster sind ${r.unrest} stärker.`); }
  }
  if (r.keyAt && !r.keyOut && r.turns >= r.keyAt){ r.keyOut = true; k.queue.unshift(mk('key')); say('Irgendwo klimpert ein <b>Schlüssel</b>.'); }
  goalProgress();
  finishTurn();
}
function monsterTicks(){
  for (const c of k.grid.slice()){
    if (k.dead) return;
    if (c.type !== 'monster' || c.fresh || c.dead) continue;
    if (k.frozen > 0) continue;
    if (c.stun > 0){ c.stun--; continue; }
    for (const tr of (c.tr || []).slice()){
      if (k.dead) return;
      const i = k.grid.indexOf(c);
      if (i < 0 || c.dead) break;
      traitTick(c, i, tr);
    }
  }
}
function tickCd(c, tr){
  c.cd = c.cd || {};
  if (c.cd[tr] == null) c.cd[tr] = cdStart(tr);
  c.cd[tr]--;
  if (c.cd[tr] <= 0){ c.cd[tr] = cdStart(tr); return true; }
  return false;
}
function traitTick(c, i, tr){
  const adj = adjacent(i, k.pos), art = cardArt(c);
  switch (tr){
    case 'wut':
      if (adj && c.val < (c.orig || c.val) + 8){ c.val++; fxAt(i, '+1', 'bad'); }
      break;
    case 'stark':
      for (const j of nbrs(i)){
        const t = k.grid[j];
        if (t.type === 'monster' && !t.dead && t.val < (t.orig || t.val) + 6){ t.val++; fxAt(j, '+1', 'bad'); }
      }
      break;
    case 'regen':
      if (c.val < (c.orig || c.val)){ c.val++; fxAt(i, '+1', 'poison'); }
      break;
    case 'geist':
      if (c.elite || c.leader) break;
      c.val -= has('laterne') ? 2 : 1;
      if (c.val <= 0){ removeNode(c); k.grid[i] = mk('gold', 1); fxAt(i, 'verblasst', 'muted'); }
      break;
    case 'dieb':
      if (c.loot > 0){
        if (c.elite || c.leader) break;   // Anführer fliehen nicht, sie horten
        c.flee--;
        if (c.flee <= 0){
          removeNode(c); k.grid[i] = nextCard();
          fxAt(i, 'entkommen!', 'muted');
          say(`${c.ename || 'Der Kobold'} entkommt mit <b>${c.loot}</b> Gold!`);
        }
      } else if (adj && k.gold > 0 && k.hero !== 'schurkin'){
        const s = Math.min(k.gold, 4 + k.world * 2);
        k.gold -= s; c.loot = s; c.flee = 3;
        lunge(c, i, k.pos);
        fxAt(k.pos, '−' + s + ' Gold', 'gold');
        say(c.elite || c.leader ? `${art} stiehlt dir <b>${s}</b> Gold! Besiege ihn, dann gibt es das Doppelte zurück.` : `${art} stiehlt dir <b>${s}</b> Gold! Erwische ihn in 3 Zügen.`);
        Sfx.coin();
      }
      break;
    case 'schuss':
      if (tickCd(c, tr) && inLine(i, k.pos)){
        FX.arrow(i, k.pos, false); Sfx.weapon();
        monsterHits(c, i, 2 + Math.floor(tier() / 2), art + 's Pfeil');
        say(`${art} schießt!`);
      }
      break;
    case 'wucht':
      if (tickCd(c, tr) && adj){
        lunge(c, i, k.pos);
        const d = Math.max(2, Math.ceil(c.val / 3));
        monsterHits(c, i, d, art);
        say(`${art} schlägt mit voller Wucht zu!`);
      }
      break;
    case 'ruf': if (tickCd(c, tr)) summon(c, i, 'skull'); break;
    case 'brut': if (tickCd(c, tr)) summon(c, i, 'spider'); break;
  }
}
function monsterHits(c, i, n, who){
  if (c.type === 'boss' && c.boss === 'namenlos' && c.p2 && k.armor > 0){ const a = Math.min(3, k.armor); k.armor -= a; fxAt(k.pos, `Rüstung −${a}`, 'armor'); }
  hurt(n, 'monster', who);
  if (k.dead) return;
  const back = (has('dornhaut') ? 4 : 0) + perk('konter') * 2;
  if (back && !c.dead){
    c.val -= back; fxAt(i, '−' + back, 'bad'); anim(c, 'flash');
    if (c.val <= 0){ if (defeat(c, i, 'thorns')) clearKilled(i, c); }
  }
}
function summon(c, i, kind){
  const loot = ['gold', 'potion', 'weapon', 'armor', 'chest', 'trap', 'item'];
  const cand = [];
  for (let j = 0; j < 9; j++) if (j !== i && j !== k.pos && loot.includes(k.grid[j].type)) cand.push(j);
  if (!cand.length) return;
  const near = cand.filter(j => adjacent(j, i)), pool = near.length ? near : cand;
  const j = pickOne(pool);
  removeNode(k.grid[j]);
  const m = makeMonster(tier(), k.room.depth, false, kind);
  m.val = m.orig = Math.max(2, Math.round(m.val * .75));
  m.fresh = true;
  k.grid[j] = m;
  FX.poof(j); Sfx.egg();
  fxAt(j, kind === 'spider' ? 'geschlüpft!' : 'erhebt sich!', 'bad');
  say(kind === 'spider' ? `${cardArt(c)} lässt eine Giftspinne schlüpfen!` : `${cardArt(c)} ruft ein Skelett!`);
}
function bombTicks(){
  if (k.frozen > 0) return;
  const booms = [];
  for (const c of k.grid){
    if (c.type !== 'bomb' || c.fresh) continue;
    c.val--;
    if (c.val <= 0) booms.push(c); else if (c.val === 1) Sfx.tick();
  }
  while (booms.length && !k.dead){
    const b = booms.shift(), i = k.grid.indexOf(b);
    if (i >= 0) explodeBomb(i, booms);
  }
}
function explodeBomb(i, queue){
  const bomb = k.grid[i];
  Sfx.explode(); buzz([70, 30, 110]); quake(2); FX.explosion(i);
  removeNode(bomb);
  k.grid[i] = nextCard();
  let kills = 0;
  for (const j of nbrs(i)){
    const t = k.grid[j];
    if (j === k.pos){
      if (has('feuerfest') || perk('spreng')) fxAt(j, 'geschützt', 'muted');
      else hurt(5, 'bomb', 'Eine Explosion');
    } else if ((t.type === 'monster' || t.type === 'boss') && !t.dead){
      t.val -= 6;
      if (t.val <= 0){ if (defeat(t, j, 'bomb')){ kills++; clearKilled(j, t); } }
      else { fxAt(j, '−6', 'bad'); anim(t, 'flash'); }
    } else if (t.type === 'bomb'){
      if (!queue.includes(t)) queue.push(t);
    } else if (!['shrine', 'stairs', 'key', 'lockchest'].includes(t.type)){
      removeNode(t);
      k.grid[j] = nextCard();
      fxAt(j, 'zerstört', 'muted');
    }
    if (k.dead) break;
  }
  say(kills ? `Explosion! <b>${kills}</b> ${plural(kills, 'Monster wird', 'Monster werden')} zu Gold.` : 'Eine Bombe explodiert!');
  if (kills >= 2) unlock('k_bomb');
}

/* ---------- Bosse ---------- */
function tickBoss(c, every){
  c.cd = (typeof c.cd === 'number' ? c.cd : every) - 1;
  if (c.cd <= 0){ c.cd = every; return true; }
  return false;
}
function bossEvery(c){
  const B = BOSSES[c.boss];
  if (c.boss === 'waechter') return 3;
  if (c.boss === 'koenigin') return c.p2 ? 3 : 4;
  if (c.boss === 'knochen') return 4;
  if (c.boss === 'schatten') return c.p2 ? 2 : 3;
  if (c.boss === 'drache') return c.p2 ? 3 : 4;
  return B.every;
}
function bossTicks(){
  const i = k.grid.findIndex(c => c.type === 'boss' && !c.dead);
  if (i < 0) return;
  const c = k.grid[i];
  if (!c.p2 && c.val <= c.max / 2){
    c.p2 = true; c.cd = bossEvery(c);
    T.phase = c.boss;
    Sfx.boss(); quake(2); buzz([50, 30, 50]);
  }
  if (c.fresh || k.frozen > 0) return;
  if (c.stun > 0){ c.stun--; return; }
  const art = BOSSES[c.boss].art;
  switch (c.boss){
    case 'waechter':
      if (c.p2 && tickBoss(c, 3)){
        if (adjacent(i, k.pos)){ lunge(c, i, k.pos); monsterHits(c, i, 4, art); say('Der Kerkerwächter rammt dich mit dem Schild!'); }
        else say('Der Kerkerwächter schlägt ins Leere.');
      }
      break;
    case 'koenigin': if (tickBoss(c, bossEvery(c))) summon(c, i, 'spider'); break;
    case 'knochen':
      if (c.val < c.max){ c.val = Math.min(c.max, c.val + (c.p2 ? 2 : 1)); fxAt(i, '+' + (c.p2 ? 2 : 1), 'poison'); Sfx.regen(); }
      if (c.p2 && tickBoss(c, 4)) summon(c, i, 'skull');
      break;
    case 'schatten':
      if (tickBoss(c, bossEvery(c))){
        const j = bossJump(c, i);
        if (c.p2 && adjacent(j, k.pos)){ monsterHits(c, j, 4, art); say('Der Schattenfürst taucht neben dir auf und schlägt zu!'); }
      }
      break;
    case 'drache': if (tickBoss(c, bossEvery(c))) breathe(c, i); break;
    case 'namenlos':
      if (tickBoss(c, 3)){
        const form = (c.form || 0) % 4;
        c.form = form + 1;
        if (form === 0) summon(c, i, 'spider');
        else if (form === 1){ const j = bossJump(c, i); if (adjacent(j, k.pos)) monsterHits(c, j, 5, art); }
        else if (form === 2) breathe(c, i);
        else { c.val = Math.min(c.max, c.val + 6); fxAt(i, '+6', 'poison'); Sfx.regen(); say('Der Namenlose saugt Kraft aus der Leere.'); }
      }
      break;
  }
}
function bossJump(c, i){
  const cand = [];
  for (let j = 0; j < 9; j++) if (j !== i && j !== k.pos && !['stairs', 'key', 'lockchest'].includes(k.grid[j].type)) cand.push(j);
  const j = pickOne(cand);
  [k.grid[i], k.grid[j]] = [k.grid[j], k.grid[i]];
  [c, k.grid[i]].forEach(x => teleportNode(x));
  FX.poof(i); FX.poof(j); Sfx.teleport();
  say(`${BOSSES[c.boss].art} springt an einen anderen Platz!`);
  return j;
}
function breathe(c, i){
  const cells = [];
  for (let j = 0; j < 9; j++) if (j !== i && (rowOf(j) === rowOf(i) || colOf(j) === colOf(i))) cells.push(j);
  cells.forEach(j => { FX.burn(j); anim(k.grid[j], 'burn'); });
  Sfx.fire(); quake(1); buzz(80);
  const dmg = 5 + (k.asc >= 4 ? 1 : 0);
  if (cells.includes(k.pos)){
    if (has('feuerfest')) say('Feueratem! Aber du bist <b>feuerfest</b>.');
    else { monsterHits(c, i, dmg, BOSSES[c.boss].art === 'Der Namenlose' ? 'Die Flammen der Leere' : 'Das Drachenfeuer'); say(`<b>Feueratem!</b> Die Flammen treffen dich.`); }
  } else say('Feueratem! Du stehst außerhalb der Flammen.');
  if (c.p2 && c.boss === 'drache'){
    const spots = cells.filter(j => j !== k.pos && ['gold', 'potion', 'armor', 'trap', 'weapon'].includes(k.grid[j].type));
    if (spots.length){
      const j = pickOne(spots);
      removeNode(k.grid[j]);
      k.grid[j] = makeMonster(tier(), k.room.depth, false, 'wisp');
      k.grid[j].fresh = true;
      fxAt(j, 'Irrlicht!', 'bad');
    }
  }
}

/* ---------- Abschluss einer Aktion ---------- */
function finishTurn(){
  if (T.phase){
    const B = BOSSES[T.phase];
    pqFront({ t: 'banner', kind: 'boss', ic: T.phase, eyebrow: 'Phase 2', title: `${B.name} wird wütend!`, sub: B.p2 });
  }
  if (k.room && k.room.exit && !k.dead) completeRoom();
  render(); hud();
  log(T.msg.join(' '));
  checkHeroUnlocks();
  if (k.relics.length >= 6) unlock('k_relics');
  if (k.dead) return die();
  saveRun();
  if (k.pq.length) flow(); else showTips();
}

/* =====================================================================
   FÄHIGKEITEN UND GEGENSTÄNDE
   ===================================================================== */
function isTarget(c, i){
  const tg = k.targeting;
  if (!tg || i === k.pos) return false;
  const kind = tg.kind === 'ability' ? ABILITIES[HEROES[k.hero].ability].target : ITEMS[k.items[tg.idx].id].target;
  const monsterish = c.type === 'monster' || c.type === 'boss';
  if (kind === 'monster') return monsterish;
  if (kind === 'trans') return !['boss', 'stairs', 'key', 'lockchest'].includes(c.type) && !c.elite && !c.leader;
  return true;
}
function setTargeting(tg){ k.targeting = tg; render(); hud(); }
function abilityPress(){
  if (!k || k.over || kBusy || kFlow || k.pq.length || sheetOpen() || current !== 'kerker' || !k.room || k.room.exit) return;
  const H = HEROES[k.hero], A = ABILITIES[H.ability], max = chargeMax();
  if (k.targeting){ setTargeting(null); log('Abgebrochen.'); return; }
  if (k.charge < max){
    const n = max - k.charge;
    Sfx.lock(); log(`Noch <b>${n}</b> ${plural(n, 'Sieg', 'Siege')} bis ${A.name}.`);
    return;
  }
  if (A.target){
    Sfx.ui(); setTargeting({ kind: 'ability' });
    log(A.target === 'monster' ? 'Tippe auf das Monster, das du treffen willst.' : A.target === 'trans' ? 'Tippe auf die Karte, die du verwandeln willst.' : 'Tippe auf die Karte, mit der du den Platz tauschen willst.');
    return;
  }
  useAbility(-1);
}
function damageAt(j, n, how){
  const t = k.grid[j];
  if (!t || (t.type !== 'monster' && t.type !== 'boss') || t.dead) return false;
  t.val -= n;
  if (t.val <= 0){ if (defeat(t, j, how)){ clearKilled(j, t); return true; } return false; }
  fxAt(j, '−' + n, 'bad'); anim(t, 'flash');
  return false;
}
function useAbility(ti){
  const H = HEROES[k.hero];
  k.targeting = null;
  beginTurn();
  k.charge = has('echo') ? Math.floor(chargeMax() / 2) : 0;
  Sfx.ability(); buzz([30, 20, 60]);
  switch (H.ability){
    case 'wirbel': {
      FX.whirl(k.pos); quake(1);
      let n = 0;
      for (const j of nbrs(k.pos)) if (damageAt(j, 5, 'ability')) n++;
      say('<b>Wirbelschlag!</b> ' + (n ? `${n} ${plural(n, 'Monster fällt', 'Monster fallen')}.` : 'Alle Nachbarn getroffen.'));
      return finishTurn();
    }
    case 'feuer': {
      kBusy = true;
      FX.fireball(k.pos, ti, () => {
        kBusy = false;
        Sfx.explode(); quake(1);
        const main = 8 + (k.hero === 'magierin' ? 3 : 0);
        const killedMain = damageAt(ti, main, 'fire');
        for (const j of nbrs(ti)) if (j !== k.pos) damageAt(j, 3, 'fire');
        say(`<b>Feuerball!</b> ${killedMain ? 'Das Ziel verbrennt zu Gold.' : 'Volltreffer.'}`);
        finishTurn();
      });
      return;
    }
    case 'schatten': {
      const a = k.pos;
      [k.grid[a], k.grid[ti]] = [k.grid[ti], k.grid[a]];
      k.pos = ti;
      FX.poof(a); FX.poof(ti); Sfx.teleport();
      say('<b>Schattenschritt!</b> Du tauschst lautlos den Platz.');
      return finishTurn();
    }
    case 'rage':
      k.rage = 3; FX.rage(k.pos);
      say('<b>Raserei!</b> 3 Kämpfe lang halber Schaden ohne Waffe, und Waffen nutzen sich nicht ab.');
      return finishTurn();
    case 'hagel': {
      FX.rain(); quake(1);
      let n = 0;
      for (let j = 0; j < 9; j++) if (j !== k.pos && damageAt(j, 3, 'ability')) n++;
      say('<b>Pfeilhagel!</b> ' + (n ? `${n} ${plural(n, 'Monster fällt', 'Monster fallen')}.` : 'Jedes Monster wird getroffen.'));
      return finishTurn();
    }
    case 'trans': {
      const t = k.grid[ti];
      removeNode(t);
      if (t.type === 'monster'){ k.grid[ti] = mk('gold', Math.max(2, t.val)); say(`<b>Verwandlung!</b> ${cardName(t)} wird zu ${t.val} Gold.`); }
      else { k.grid[ti] = mk('potion', 6 + Math.floor(k.room.depth * .2)); say('<b>Verwandlung!</b> Daraus wird ein Heiltrank.'); }
      FX.sparkle(ti); Sfx.relic();
      return finishTurn();
    }
  }
}
function itemPress(idx){
  if (!k || k.over || kBusy || kFlow || k.pq.length || sheetOpen() || current !== 'kerker' || !k.room || k.room.exit) return;
  const it = k.items[idx];
  if (!it) return;
  if (k.targeting && k.targeting.kind === 'item' && k.targeting.idx === idx){ setTargeting(null); log('Abgebrochen.'); return; }
  const I = ITEMS[it.id];
  if (I.target){
    Sfx.ui(); setTargeting({ kind: 'item', idx });
    log(`<b>${I.name}:</b> ${I.target === 'monster' ? 'Tippe auf ein Monster.' : 'Tippe auf eine Karte.'}`);
    return;
  }
  applyItem(idx, -1);
}
function applyItem(idx, ti){
  const it = k.items[idx], I = ITEMS[it.id], alc = k.hero === 'alchemist';
  k.targeting = null;
  beginTurn();
  k.items.splice(idx, 1);
  k.itemsUsed++; D.kerker.itemsUsed = (D.kerker.itemsUsed || 0) + 1;
  if (D.kerker.itemsUsed >= 50) unlock('k_items');
  Sfx.power();
  switch (it.id){
    case 'trank': {
      const g = heal((it.v || 8) + potionBonus() + (alc ? 4 : 0));
      if (has('traene')) k.armor = Math.min(30, k.armor + 3);
      fxAt(k.pos, '+' + g, 'good'); say(`Heiltrank: <b>+${g}</b> Leben.`); Sfx.potion();
      break;
    }
    case 'bombe': {
      const dmg = 6 + (alc ? 3 : 0);
      FX.explosion(ti); Sfx.explode(); quake(2);
      let n = 0;
      for (const j of [ti].concat(nbrs(ti))){
        if (j === k.pos){ if (!has('feuerfest') && !perk('spreng')) hurt(3, 'bomb', 'Deine eigene Bombe'); continue; }
        const t = k.grid[j];
        if (t.type === 'bomb'){ t.val = Math.min(t.val, 1); continue; }
        if (damageAt(j, dmg, 'bomb')) n++;
      }
      say(`<b>Wurfbombe!</b>` + (n ? ` ${n} ${plural(n, 'Monster fällt', 'Monster fallen')}.` : ''));
      break;
    }
    case 'feuer': {
      const dmg = 10 + (alc ? 4 : 0) + (k.hero === 'magierin' ? 3 : 0);
      FX.explosionSmall(ti); Sfx.fire();
      const dead = damageAt(ti, dmg, 'fire');
      say(`<b>Feuerrolle!</b> ${dead ? 'Das Ziel verbrennt.' : `${dmg} Schaden.`}`);
      break;
    }
    case 'teleport': {
      const a = k.pos;
      [k.grid[a], k.grid[ti]] = [k.grid[ti], k.grid[a]];
      k.pos = ti; FX.poof(a); FX.poof(ti); Sfx.teleport();
      say('<b>Versetzt!</b>');
      break;
    }
    case 'frost':
      k.frozen = 3 + (alc ? 1 : 0); FX.frost(); Sfx.shield();
      say(`<b>Frost!</b> Monster und Bomben erstarren ${k.frozen} Züge lang.`);
      break;
    case 'wetz':
      if (k.wpn) k.wpn.v += 4 + (alc ? 2 : 0); else k.wpn = { t: 'dolch', v: 4 + (alc ? 2 : 0) };
      say(`Geschärft: ${WEAPONS[k.wpn.t].name} <b>${k.wpn.v}</b>.`); Sfx.weapon();
      break;
    case 'rauch':
      for (let j = 0; j < 9; j++){
        const t = k.grid[j];
        if (j === k.pos || ['boss', 'stairs', 'lockchest', 'key'].includes(t.type) || t.elite || t.leader) continue;
        removeNode(t); k.grid[j] = genCard(false);
      }
      FX.poof(k.pos); Sfx.teleport();
      say('<b>Rauch!</b> Als er sich lichtet, sieht alles anders aus.');
      break;
    case 'elixier':
      k.elixir = 3; FX.rage(k.pos);
      say('<b>Kraftelixier!</b> 3 Kämpfe lang doppelter Waffenschaden.');
      break;
    case 'gegengift':
      k.poison = 0; k.armor = Math.min(30, k.armor + 4 + (alc ? 2 : 0));
      say('<b>Gegengift!</b> Das Gift ist weg, und du fühlst dich gepanzert.');
      break;
  }
  finishTurn();
}

/* =====================================================================
   BELOHNUNGEN, RÄUME, WELTEN
   ===================================================================== */
function pqPush(item){
  // Während ein Eintrag angezeigt wird (Index 0), nie davor einfügen
  const start = kFlow ? 1 : 0;
  const i = k.pq.findIndex((p, n) => n >= start && ['roomdone', 'nodedone', 'worlddone', 'nextroom'].includes(p.t));
  if (i < 0) k.pq.push(item); else k.pq.splice(i, 0, item);
}
function pqFront(item){ k.pq.unshift(item); }
function completeRoom(){
  const r = k.room;
  if (r.completed) return;
  r.completed = true;
  k.rooms++; D.stats.kRooms = (D.stats.kRooms || 0) + 1;
  let gold = 6 + tier() * 3 + (has('karte') ? 8 : 0);
  if (r.type === 'elite'){ gold += 10 + tier() * 4; pqPush({ t: 'relic', src: 'elite' }); }
  else if (r.type === 'schatz'){ gold += 12; pqPush({ t: 'loot' }); }
  else if (r.type === 'boss'){
    gold += 20 + tier() * 8;
    heal(Math.ceil(k.maxHp * .5));
    if (has('titan')){ k.maxHp += 4; k.hp = k.maxHp; }
    pqPush({ t: 'relic', src: 'boss' });
  } else pqPush({ t: 'loot' });
  gainGold(gold, null);
  r.rewardGold = Math.round(gold * goldMul());
  k.pq.push({ t: 'roomdone', gold: r.rewardGold, type: r.type });
  say(`<b>Raum geschafft!</b> +${r.rewardGold} Gold.`);
}
function lootOffer(){
  const d = roomDepth(), out = [], used = new Set();
  const opts = [['item', 30], ['weapon', 24], ['armor', 14], ['maxhp', 12], ['gold', 10], ['relic', 4]];
  let guard = 0;
  while (out.length < 3 && guard++ < 30){
    const t = pickW(opts);
    if (used.has(t) && t !== 'item') continue;
    used.add(t);
    if (t === 'item'){ const id = pickItemId(); if (out.some(o => o.t === 'item' && o.id === id)) continue; out.push({ t, id }); }
    if (t === 'weapon'){ const w = makeWeapon(d, 1); out.push({ t, wt: w.wt, v: w.val + weaponBonus(w.wt) }); }
    if (t === 'armor') out.push({ t, v: 4 + tier() });
    if (t === 'maxhp') out.push({ t, v: 3 });
    if (t === 'gold') out.push({ t, v: Math.round((15 + d * 2) * goldMul()) });
    if (t === 'relic'){ const rel = relicOffer(1)[0]; if (rel) out.push({ t, id: rel }); }
  }
  return out;
}
function takeLoot(o){
  if (o.t === 'item') addItem(o.id);
  if (o.t === 'weapon'){ k.wpn = { t: o.wt, v: o.v }; tipFor('w_' + o.wt); }
  if (o.t === 'armor') k.armor = Math.min(30, k.armor + o.v);
  if (o.t === 'maxhp'){ k.maxHp += o.v; k.hp += o.v; }
  if (o.t === 'gold'){ k.gold += o.v; D.stats.kGold += o.v; }
  if (o.t === 'relic') takeRelic(o.id);
}
function relicOffer(n = 3){
  const pool = RELIC_IDS.filter(id => !k.relics.includes(id));
  return sampleR(pool, n);
}
function takeRelic(id){
  k.relics.push(id);
  D.stats.kRelics++;
  D.kerker.codex['r_' + id] = 1;
  if (id === 'eisen'){ k.maxHp += 5; k.hp += 5; }
  if (id === 'dornen') k.armor = Math.min(30, k.armor + 6);
  if (id === 'kanone'){ k.maxHp = Math.max(1, k.maxHp - 4); k.hp = Math.min(k.hp, k.maxHp); if (k.wpn) k.wpn.v += 4; }
  if (id === 'schleif' && k.wpn) k.wpn.v += 2;
  Sfx.relic();
  if (k.relics.length >= 6) unlock('k_relics');
}
function perkOffer(){
  const pool = PERK_IDS.filter(id => perk(id) < PERKS[id].max && !(id === 'zweit' && has('kelch')));
  return sampleR(pool, 3);
}
function takePerk(id){
  k.perks[id] = perk(id) + 1;
  if (id === 'zaeh'){ k.maxHp += 3; k.hp += 3; }
  if (id === 'wall') k.armor = Math.min(30, k.armor + 2);
  if (id === 'meister' && k.wpn) k.wpn.v += 1;
  Sfx.relic();
}
function markNodeDone(){
  if (k.mode === 'end' || !k.at) return;
  k.map.rows[k.at.r][k.at.i].done = true;
}
function afterRoomDone(p){
  // Nach Beute und Relikten: zurück zur Karte oder weiter
  const wasBoss = p.type === 'boss';
  k.room = null;
  if (k.mode === 'end'){
    if (D.kerker.bestDepth < k.rooms){ D.kerker.bestDepth = k.rooms; }
    if (k.rooms >= 20) unlock('k_deep');
    if (k.rooms >= 40) unlock('k_deep2');
    if (k.rooms % 3 === 0){ pqPush({ t: 'endchoice' }); pqPush({ t: 'nextroom' }); }
    else pqPush({ t: 'nextroom' });
    return;
  }
  markNodeDone();
  if (wasBoss) pqPush({ t: 'worlddone' });
}
function worldDone(){
  // liefert: 'next' | 'abyss' | 'win'
  if (k.world === 6) return 'win';
  if (k.world === 5) return k.sigils.length >= 3 ? 'abyss' : 'win';
  return 'next';
}
function nextWorld(){
  k.world++;
  k.map = genMap(k.world);
  k.at = null;
  if (has('dornen')) k.armor = Math.min(30, k.armor + 6);
  D.kerker.bestWorld = Math.max(D.kerker.bestWorld || 0, k.world);
  if (k.world >= 3 && k.mode === 'adv') unlock('k_floor3');
  checkHeroUnlocks();
}

/* ---------- Händler, Rast, Ereignisse ---------- */
function priceMul(){ return (has('feilscher') ? .6 : 1) * (k.mod === 'markttag' ? .7 : 1) * (k.asc >= 6 ? 1.25 : 1); }
function shopStock(){
  const W = tier(), d = roomDepth(), pm = priceMul(), P = v => Math.max(1, Math.round(v * pm));
  const stock = [];
  sampleR(ITEM_IDS, 3).forEach(id => stock.push({ k: 'item', id, cost: P(10 + W * 3) }));
  const w = makeWeapon(d, 2), wv = w.val + weaponBonus(w.wt);
  stock.push({ k: 'weapon', wt: w.wt, v: wv, cost: P(6 + wv * 2) });
  const rel = relicOffer(1)[0];
  if (rel) stock.push({ k: 'relic', id: rel, cost: P(45 + W * 12) });
  stock.push({ k: 'heal', cost: P(12 + W * 5) });
  stock.push({ k: 'sharpen', cost: P(10 + W * 4) });
  stock.push({ k: 'armor', v: 5 + W, cost: P(10 + W * 4) });
  return stock;
}
function buyStock(s){
  if (s.sold || k.gold < s.cost) return false;
  k.gold -= s.cost; s.sold = true;
  if (s.k === 'item') addItem(s.id);
  if (s.k === 'weapon'){ k.wpn = { t: s.wt, v: s.v }; tipFor('w_' + s.wt); }
  if (s.k === 'relic') takeRelic(s.id);
  if (s.k === 'heal') k.hp = k.maxHp;
  if (s.k === 'sharpen'){ if (k.wpn) k.wpn.v += 4; else k.wpn = { t: 'schwert', v: 4 + tier() }; }
  if (s.k === 'armor') k.armor = Math.min(30, k.armor + s.v);
  Sfx.shop();
  return true;
}
const EVENTS = [
  { id: 'abenteurer', title: 'Der verwundete Abenteurer', ic: 'ritter', w: [1, 6],
    text: 'An der Wand lehnt ein Abenteurer, blass und blutend. „Hast du einen Trank für mich? Ich kann dich belohnen.“',
    opts: [
      { label: 'Einen Heiltrank geben', sub: 'Du verlierst einen Heiltrank. Er gibt dir ein Relikt.', cond: () => hasItem('trank'),
        run: () => { removeItem('trank'); pqNext({ t: 'relic', src: 'gift' }); return 'Er trinkt gierig und drückt dir zum Dank ein Relikt in die Hand.'; } },
      { label: 'Seine Börse nehmen', sub: '+35 Gold, aber −3 maximale Leben.',
        run: () => { gainGold(35, null, true); k.maxHp = Math.max(1, k.maxHp - 3); k.hp = Math.min(k.hp, k.maxHp); return 'Du nimmst das Gold. Leicht fühlt es sich nicht an.'; } },
      { label: 'Weitergehen', run: () => 'Du lässt ihn zurück.' }
    ] },
  { id: 'blutaltar', title: 'Der Blutaltar', ic: 'r_kelch', w: [1, 6],
    text: 'Ein Altar, rot von alten Opfern. Eine Stimme flüstert: „Gib mir, was dich am Leben hält.“',
    opts: [
      { label: 'Opfere 8 Leben', sub: 'Du erhältst eine Relikt-Wahl.', cond: () => k.hp > 8,
        run: () => { hurtSafe(8); pqNext({ t: 'relic', src: 'altar' }); return 'Der Altar trinkt dein Blut und glüht auf.'; } },
      { label: 'Opfere 25 Gold', sub: '+3 maximale Leben und 6 Heilung.', cond: () => k.gold >= 25,
        run: () => { k.gold -= 25; k.maxHp += 3; heal(9); return 'Wärme strömt durch deine Adern.'; } },
      { label: 'Weitergehen', run: () => 'Du hältst Abstand.' }
    ] },
  { id: 'becher', title: 'Das Becherspiel', ic: 'kobold', w: [1, 4],
    text: 'Ein Kobold schiebt drei Becher über einen Stein. „Finde die Münze, verdopple dein Gold!“',
    opts: [
      { label: 'Setze 20 Gold', sub: 'Halbe Chance auf +40 Gold.', cond: () => k.gold >= 20,
        run: () => { if (R() < .5){ gainGold(40, null, true); Sfx.coin(); return 'Gewonnen! Der Kobold flucht.'; } k.gold -= 20; return 'Daneben. Der Kobold kichert.'; } },
      { label: 'Den Kobold packen', sub: 'Ein Kampf auf die Schnelle: −4 Leben, dafür sein Beutel.',
        run: () => { hurtSafe(4); gainGold(25, null, true); return 'Er beißt, aber der Beutel gehört dir.'; } },
      { label: 'Ablehnen', run: () => 'Du gehst weiter.' }
    ] },
  { id: 'schmiede', title: 'Die verlassene Schmiede', ic: 'r_amboss', w: [1, 6],
    text: 'Die Esse glüht noch. Werkzeug liegt bereit, als hätte der Schmied nur kurz Pause gemacht.',
    opts: [
      { label: 'Waffe schärfen', sub: 'Deine Waffe +5.', cond: () => !!k.wpn,
        run: () => { k.wpn.v += 5; Sfx.weapon(); return `${WEAPONS[k.wpn.t].name} glänzt: Stärke ${k.wpn.v}.`; } },
      { label: 'Einen Hammer schmieden', sub: () => `Ein Hammer mit Stärke ${5 + Math.floor(roomDepth() * .35) + weaponBonus('hammer')}. Ersetzt deine Waffe.`,
        run: () => { const v = 5 + Math.floor(roomDepth() * .35) + weaponBonus('hammer'); k.wpn = { t: 'hammer', v }; Sfx.weapon(); return `Ein schwerer Hammer, Stärke ${v}.`; } },
      { label: 'Rüstung ausbessern', sub: '+6 Rüstung.',
        run: () => { k.armor = Math.min(30, k.armor + 6); Sfx.shield(); return 'Die Nieten sitzen wieder fest.'; } }
    ] },
  { id: 'brunnen', title: 'Der schimmernde Brunnen', ic: 'r_traene', w: [1, 6],
    text: 'Das Wasser leuchtet bläulich. Es riecht nach Minze und ein wenig nach Schwefel.',
    opts: [
      { label: 'Trinken', sub: 'Meist heilsam. Manchmal nicht.',
        run: () => { if (R() < .7){ const g = heal(Math.ceil(k.maxHp * .5)); Sfx.potion(); return `Erfrischend! +${g} Leben.`; } hurtSafe(3); k.poison = Math.min(9, k.poison + 4); return 'Bäh. Das war Schwefel. −3 Leben und vergiftet.'; } },
      { label: 'Münze hineinwerfen', sub: '10 Gold für einen zufälligen Gegenstand.', cond: () => k.gold >= 10,
        run: () => { k.gold -= 10; const id = pickItemId(); addItem(id); return `Der Brunnen spuckt etwas aus: ${ITEMS[id].name}.`; } },
      { label: 'Weitergehen', run: () => 'Du bleibst durstig.' }
    ] },
  { id: 'bibliothek', title: 'Die staubige Bibliothek', ic: 'scroll', w: [2, 6],
    text: 'Regale bis zur Decke. Zwischen den Büchern liegen versiegelte Schriftrollen.',
    opts: [
      { label: 'Studieren', sub: '+30 Erfahrung.',
        run: () => { gainXP(30); return 'Du lernst alte Kampftechniken.'; } },
      { label: 'Eine Rolle einstecken', sub: 'Eine zufällige Schriftrolle.',
        run: () => { const id = pickOne(['feuer', 'teleport', 'frost']); addItem(id); return `Du nimmst eine ${ITEMS[id].name} mit.`; } },
      { label: 'Weitergehen', run: () => 'Zu viel Staub.' }
    ] },
  { id: 'pilze', title: 'Der Pilzring', ic: 'r_klee', w: [2, 3],
    text: 'Im Kreis wachsen leuchtende Pilze. Sie duften verlockend.',
    opts: [
      { label: 'Einen Pilz essen', sub: 'Halbe Chance: +4 maximale Leben. Sonst Gift.',
        run: () => { if (R() < .5){ k.maxHp += 4; heal(4); return 'Köstlich! Du fühlst dich stärker.'; } k.poison = Math.min(9, k.poison + 5); return 'Dir wird übel. Vergiftet!'; } },
      { label: 'Kräuter sammeln', sub: 'Ein Heiltrank für die Tasche.',
        run: () => { addItem('trank'); return 'Zwischen den Pilzen wachsen Heilkräuter.'; } }
    ] },
  { id: 'kiste', title: 'Die geheimnisvolle Kiste', ic: 'chest', w: [2, 6],
    text: 'Ein vermummter Händler klopft auf eine Kiste. „Dreißig Gold. Was drin ist, weiß ich selbst nicht.“',
    opts: [
      { label: 'Kaufen (30 Gold)', sub: 'Meist ein Relikt. Manchmal beißt sie.', cond: () => k.gold >= 30,
        run: () => { k.gold -= 30; if (R() < .65){ pqNext({ t: 'relic', src: 'chest' }); return 'Die Kiste klickt auf. Darin: ein Relikt!'; } hurtSafe(6); gainGold(20, null, true); unlock('k_mimic'); return 'Ein Mimic! Du prügelst ihn weg und findest 20 Gold in seinem Maul.'; } },
      { label: 'Ablehnen', run: () => 'Der Händler zuckt mit den Schultern.' }
    ] },
  { id: 'soeldner', title: 'Der müde Söldner', ic: 'armor', w: [1, 6],
    text: 'Ein Söldner sitzt am Feuer. „Meine Rüstung? Brauch ich nicht mehr. Für ein paar Münzen gehört sie dir.“',
    opts: [
      { label: 'Kaufen (20 Gold)', sub: '+8 Rüstung.', cond: () => k.gold >= 20,
        run: () => { k.gold -= 20; k.armor = Math.min(30, k.armor + 8); Sfx.shield(); return 'Schwer, aber gut.'; } },
      { label: 'Um Rat fragen', sub: '+15 Erfahrung.',
        run: () => { gainXP(15); return '„Schütz dich vor Schützen. Und Schamanen zuerst.“'; } }
    ] },
  { id: 'waage', title: 'Die goldene Waage', ic: 'r_feilscher', w: [3, 6],
    text: 'Eine Waage schwebt in der Luft. Auf einer Schale liegt ein Relikt, die andere ist leer.',
    opts: [
      { label: '5 maximale Leben auflegen', sub: 'Du erhältst eine Relikt-Wahl.', cond: () => k.maxHp > 10,
        run: () => { k.maxHp -= 5; k.hp = Math.min(k.hp, k.maxHp); pqNext({ t: 'relic', src: 'altar' }); return 'Die Waage neigt sich. Das Relikt gehört dir.'; } },
      { label: 'Ein Relikt auflegen', sub: '+80 Gold.', cond: () => k.relics.length > 0,
        run: () => { const id = k.relics.splice(Math.floor(R() * k.relics.length), 1)[0]; gainGold(80, null, true); return `${RELICS[id].name} verschwindet. Gold klimpert.`; } },
      { label: 'Weitergehen', run: () => 'Die Waage schwingt leise nach.' }
    ] },
  { id: 'geisterhaendler', title: 'Der Geisterhändler', ic: 'ghost', w: [3, 6],
    text: 'Ein durchscheinender Händler flüstert: „Tausch? Ich nehme einen, du bekommst zwei.“',
    opts: [
      { label: 'Einen Gegenstand tauschen', sub: 'Gib einen, bekomm zwei zufällige.', cond: () => k.items.length > 0,
        run: () => { k.items.splice(Math.floor(R() * k.items.length), 1); const a = pickItemId(), b = pickItemId(); addItem(a); addItem(b); return `Du bekommst ${ITEMS[a].name} und ${ITEMS[b].name}.`; } },
      { label: 'Wissen kaufen (20 Gold)', sub: '+35 Erfahrung.', cond: () => k.gold >= 20,
        run: () => { k.gold -= 20; gainXP(35); return 'Er flüstert Geheimnisse, die du nie vergisst.'; } },
      { label: 'Weitergehen', run: () => 'Er löst sich in Nebel auf.' }
    ] },
  { id: 'schatten', title: 'Dein Schatten', ic: 'schatten', w: [4, 6],
    text: 'Dein Schatten löst sich von der Wand und grinst. Er will kämpfen.',
    opts: [
      { label: 'Kämpfen', sub: 'Kostet etwa ein Drittel deiner Leben. Beute: ein Relikt und 30 Gold.',
        run: () => { const d = hurtSafe(Math.ceil(k.maxHp * .33)); pqNext({ t: 'relic', src: 'altar' }); gainGold(30, null, true); return `Du besiegst dich selbst. Es kostet ${d} Leben.`; } },
      { label: 'Wegrennen', run: () => 'Er lacht dir hinterher.' }
    ] },
  { id: 'drachengold', title: 'Der schlafende Drache', ic: 'drache', w: [5, 6],
    text: 'Ein junger Drache schläft auf einem Berg aus Gold.',
    opts: [
      { label: 'Vorsichtig nehmen', sub: 'Meist +60 Gold. Wacht er auf, kostet es 8 Leben.',
        run: () => { if (R() < .6){ gainGold(60, null, true); return 'Er schnarcht weiter. +60 Gold.'; } hurtSafe(8); gainGold(20, null, true); return 'Er blinzelt, faucht und du rennst mit 20 Gold davon.'; } },
      { label: 'Weitergehen', run: () => 'Schlafende Drachen soll man nicht wecken.' }
    ] },
  { id: 'heiligtum', title: 'Das stille Heiligtum', ic: 'shrine', w: [1, 6],
    text: 'Kerzen, Stille, ein Gefühl von Sicherheit.',
    opts: [
      { label: 'Beten', sub: 'Heilt 40 % und entfernt Gift.',
        run: () => { const g = heal(Math.ceil(k.maxHp * .4)); k.poison = 0; Sfx.potion(); return `Frieden. +${g} Leben.`; } },
      { label: 'Meditieren', sub: 'Heldenfähigkeit voll, +2 maximale Leben.',
        run: () => { k.charge = chargeMax(); k.maxHp += 2; k.hp += 2; return 'Dein Geist ist klar.'; } }
    ] },
  { id: 'fallengang', title: 'Der Gang der Druckplatten', ic: 'trap', w: [1, 4],
    text: 'Der Boden ist voller Platten. Am anderen Ende glitzert etwas.',
    opts: [
      { label: 'Rennen', sub: 'Halbe Chance auf +30 Gold, sonst −6 Leben.',
        run: () => { if (R() < .5){ gainGold(30, null, true); return 'Keine Platte berührt. +30 Gold!'; } hurtSafe(6); return 'Klick. Aua.'; } },
      { label: 'Vorsichtig tasten', sub: '−2 Leben, +12 Gold.',
        run: () => { hurtSafe(2); gainGold(12, null, true); return 'Langsam, aber sicher.'; } }
    ] },
  { id: 'siegelwaechter', title: 'Der Siegelwächter', ic: 'sigil', w: [2, 4],
    text: 'Eine steinerne Statue hält eine leuchtende Scherbe. „Blut für das Siegel“, dröhnt es.',
    opts: [
      { label: 'Mit 12 Leben bezahlen', sub: 'Du erhältst den Siegelsplitter dieser Welt.', cond: () => k.hp > 12 && !k.sigils.includes(k.world),
        run: () => { hurtSafe(12); k.sigils.push(k.world); toast('Siegelsplitter', `${k.sigils.length} von 3 gefunden`, 'sigil', 'relic'); if (k.sigils.length >= 3) unlock('k_sigil'); return `Die Scherbe wird warm in deiner Hand. (${k.sigils.length} von 3)`; } },
      { label: 'Weitergehen', run: () => 'Die Statue schweigt.' }
    ] }
];
function pickEvent(){
  const pool = EVENTS.filter(e => tier() >= e.w[0] && tier() <= e.w[1]);
  return pickOne(pool).id;
}
let pqIns = 1;
function pqNext(item){ k.pq.splice(pqIns++, 0, item); }

/* =====================================================================
   ENDE EINES LAUFS
   ===================================================================== */
function checkHeroUnlocks(){
  const h = D.kerker.heroes, got = [];
  const cond = {
    schurkin: () => D.stats.kBosses >= 1,
    magierin: () => (D.kerker.bestWorld || 0) >= 3,
    berserker: () => D.stats.kKills >= 200,
    jaegerin: () => (D.kerker.rangedKills || 0) >= 25,
    alchemist: () => (D.kerker.itemsUsed || 0) >= 30
  };
  for (const id in cond) if (!h[id] && cond[id]()){ h[id] = true; got.push(id); }
  if (got.length){
    save();
    got.forEach(id => toast(HEROES[id].name, 'Neuer Held freigeschaltet', id, 'relic'));
    if (HERO_IDS.every(id => h[id])) unlock('k_heroes');
  }
  return got;
}
function dailyScore(){ return k.gold + k.rooms * 10 + k.bosses * 50 + (k.won ? 200 : 0); }
function settle(){
  const kd = D.kerker;
  kd.run = null;
  const res = { newBest: k.gold > kd.best, newDepth: false, daily: null, ascUp: false };
  kd.best = Math.max(kd.best, k.gold);
  kd.bank += Math.round(k.gold * (1 + k.asc * .1));
  if (k.mode === 'end'){ res.newDepth = k.rooms > (kd.bestDepth || 0); kd.bestDepth = Math.max(kd.bestDepth || 0, k.rooms); }
  else kd.bestWorld = Math.max(kd.bestWorld || 0, k.world);
  if (k.won){
    D.stats.kWins++;
    kd.winsBy[k.hero] = (kd.winsBy[k.hero] || 0) + 1;
    unlock('k_win');
    if (k.world === 6) unlock('k_abyss');
    if (HERO_IDS.every(id => kd.winsBy[id])) unlock('k_allwin');
    if (k.mode === 'adv'){
      if (k.asc >= 1) unlock('k_asc1');
      if (k.asc >= 5) unlock('k_asc5');
      if (k.asc >= 10) unlock('k_asc10');
      if (k.asc >= (kd.ascMax || 0) && (kd.ascMax || 0) < 10){ kd.ascMax = k.asc + 1; res.ascUp = true; }
    }
  }
  if (k.mode === 'daily'){
    const score = dailyScore(), dd = kd.daily;
    res.daily = { score, newBest: score > dd.best };
    dd.best = Math.max(dd.best, score);
  }
  res.unlocked = checkHeroUnlocks();
  save();
  ccPost({ t: 'run', won: !!k.won, sum: ccSummary() });
  return res;
}
