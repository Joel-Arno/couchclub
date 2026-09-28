/* =====================================================================
   KERKER-WISCHER: ANZEIGE, EFFEKTE, ABLAUF
   ===================================================================== */
const board = $('#board'), nodes = new Map();
const kScreen = $('#kerker'), kWrap = $('#kBoardWrap'), kBannerEl = $('#kBanner'), kTipEl = $('#kTip'), kInfoEl = $('#kInfo');
const mapScreen = $('#kmap'), mapBannerEl = $('#kmapBanner');
let heartTimer = 0, flowNav = false;
const tipQ = [];

/* =====================================================================
   KARTEN AUF DEM FELD
   ===================================================================== */
function codexId(c){
  if (c.type === 'monster') return 'm_' + c.kind;
  if (c.type === 'boss') return 'b_' + c.boss;
  if (c.type === 'weapon') return 'w_' + c.wt;
  if (c.type === 'item') return 'i_' + c.it;
  if (c.type === 'hero') return '';
  return 'c_' + c.type;
}
function discover(id){
  if (!id || D.kerker.codex[id]) return;
  D.kerker.codex[id] = 1;
  tipFor(id);
  if (Object.keys(MONSTERS).every(m => D.kerker.codex['m_' + m])) unlock('k_codex');
}
function cardIcon(c){
  switch (c.type){
    case 'hero': return k.hero;
    case 'monster': return c.kind;
    case 'boss': return c.boss;
    case 'weapon': return WEAPONS[c.wt].ic;
    case 'item': return ITEMS[c.it].ic;
    case 'chest': return c.mimic && has('auge') ? 'mimic' : 'chest';
    default: return CARDS[c.type].ic;
  }
}
function trBadges(c){
  const out = c.elite ? ['<span class="badge b-elite">Elite</span>'] : [];
  for (const tr of c.tr || []){
    const T0 = TRAITS[tr];
    if (T0.cd && c.cd && c.cd[tr] != null) out.push(`<span class="badge b-cd ${c.cd[tr] <= 1 && !k.frozen && !c.stun ? 'hot' : ''}" title="${T0.name}">${icon(T0.ic)}${c.cd[tr]}</span>`);
  }
  if (c.loot) out.push(`<span class="badge b-elite">${icon('coin')}${c.loot}</span>`);
  for (const tr of c.tr || []){
    const T0 = TRAITS[tr];
    if (!T0.cd && tr !== 'dieb' && out.length < 2) out.push(`<span class="badge b-tr" title="${T0.name}">${icon(T0.ic)}</span>`);
  }
  return out.slice(0, 2).join('');
}
function cardInner(c){
  switch (c.type){
    case 'hero': {
      const foot = [];
      if (k.armor) foot.push(`<span class="badge b-armor">${icon('armor')}${k.armor}</span>`);
      if (k.poison) foot.push(`<span class="badge b-poison">${icon('drop')}${k.poison}</span>`);
      if (k.rage) foot.push(`<span class="badge b-rage">Wut ${k.rage}</span>`);
      if (k.elixir) foot.push(`<span class="badge b-rage">×2 ${k.elixir}</span>`);
      return `<div class="top"><span class="cv">${k.hp}</span>${k.wpn ? `<span class="badge b-wpn">${icon(WEAPONS[k.wpn.t].ic)}${k.wpn.v}</span>` : ''}</div>${icon(k.hero)}<div class="hero-foot">${foot.length ? foot.slice(0, 2).join('') : `<span class="cn">${HEROES[k.hero].name}</span>`}</div>`;
    }
    case 'monster': {
      const badges = trBadges(c);
      const name = c.stun ? `betäubt ${c.stun}` : c.leader ? 'Anführer' : (c.ename || MONSTERS[c.kind].name);
      return `<div class="top"><span class="cv">${c.val}</span><span class="badges">${badges}</span></div>${icon(c.kind)}<span class="cn">${name}</span>`;
    }
    case 'boss': {
      const B = BOSSES[c.boss];
      let badge = '';
      if (c.boss === 'waechter' && !c.p2) badge = `<span class="badge b-cd">${icon('shield')}4</span>`;
      else if (c.boss === 'knochen' && !c.p2) badge = `<span class="badge b-cd">${icon('heart')}+1</span>`;
      else badge = `<span class="badge b-cd ${c.cd <= 1 && !k.frozen ? 'hot' : ''}">${icon(B.badge)}${c.cd}</span>`;
      return `<div class="top"><span class="cv">${c.val}</span><span class="badges">${badge}</span></div>${icon(c.boss)}<span class="cn">${c.stun ? `betäubt ${c.stun}` : B.name}</span>`;
    }
    case 'chest': {
      const seen = c.mimic && has('auge');
      return `<div class="top"><span class="cv">?</span>${seen ? '<span class="badge b-elite">Mimic</span>' : ''}</div>${icon(cardIcon(c))}<span class="cn">Truhe</span>`;
    }
    case 'weapon': return `<div class="top"><span class="cv">${c.val}</span></div>${icon(WEAPONS[c.wt].ic)}<span class="cn">${WEAPONS[c.wt].name}</span>`;
    case 'item': return `<div class="top"><span class="cv">&nbsp;</span></div>${icon(ITEMS[c.it].ic)}<span class="cn">${ITEMS[c.it].name}</span>`;
    case 'shrine': case 'stairs': case 'key': case 'lockchest':
      return `<div class="top"><span class="cv">&nbsp;</span></div>${icon(CARDS[c.type].ic)}<span class="cn">${CARDS[c.type].name}</span>`;
    default: return `<div class="top"><span class="cv">${c.val}</span></div>${icon(CARDS[c.type].ic)}<span class="cn">${CARDS[c.type].name}</span>`;
  }
}
function cardLabel(c){
  switch (c.type){
    case 'hero': return `${HEROES[k.hero].name}, ${k.hp} Leben` + (k.wpn ? `, ${WEAPONS[k.wpn.t].name} ${k.wpn.v}` : '') + (k.armor ? `, Rüstung ${k.armor}` : '');
    case 'monster': return `${cardName(c)}, Stärke ${c.val}` + (c.elite ? ', Elite' : '');
    case 'boss': return `${BOSSES[c.boss].name}, ${c.val} Leben`;
    case 'weapon': return `${WEAPONS[c.wt].name}, Stärke ${c.val}`;
    case 'item': return ITEMS[c.it].name;
    case 'chest': case 'shrine': case 'stairs': case 'key': case 'lockchest': return CARDS[c.type].name;
    default: return `${cardName(c)} ${c.val}`;
  }
}
function hotCells(){
  const hot = new Set();
  if (k.frozen > 0) return hot;
  const line = i => { for (let j = 0; j < 9; j++) if (j !== i && inLine(i, j)) hot.add(j); };
  k.grid.forEach((c, i) => {
    if (c.type === 'bomb' && c.val <= 1){ hot.add(i); nbrs(i).forEach(j => hot.add(j)); }
    if (c.type === 'monster' && !c.stun && c.cd){
      if (c.cd.schuss === 1) line(i);
      if (c.cd.wucht === 1) nbrs(i).forEach(j => hot.add(j));
    }
    if (c.type === 'boss' && !c.stun && c.cd === 1){
      if (c.boss === 'drache' || (c.boss === 'namenlos' && (c.form || 0) % 4 === 2)) line(i);
      if (c.boss === 'waechter' && c.p2) nbrs(i).forEach(j => hot.add(j));
    }
  });
  return hot;
}
function render(initial = false){
  if (!k || !k.room) return;
  const hc = colOf(k.pos), hr = rowOf(k.pos), hot = hotCells(), shootOk = canShoot();
  kScreen.dataset.world = Math.min(6, tier());
  k.grid.forEach((c, i) => {
    let n = nodes.get(c.id);
    const fresh = !n;
    if (fresh){
      n = document.createElement('div');
      n.innerHTML = '<div class="ci"></div>';
      n.style.setProperty('--rot', c.rot);
      nodes.set(c.id, n);
      board.appendChild(n);
    }
    const col = colOf(i), row = rowOf(i);
    n.style.setProperty('--c', col);
    n.style.setProperty('--r', row);
    n.dataset.i = i;
    const cls = ['card', 't-' + c.type];
    if (c.kind) cls.push('k-' + c.kind);
    if (c.type !== 'hero' && Math.abs(col - hc) + Math.abs(row - hr) > 1 && !k.targeting) cls.push('far');
    if (fresh || n.classList.contains('spawn')) cls.push('spawn');
    if (c.elite) cls.push('elite');
    if (c.leader) cls.push('leader');
    if (c.p2) cls.push('p2');
    if (c.stun) cls.push('stunned');
    if (k.frozen > 0 && (c.type === 'monster' || c.type === 'boss' || c.type === 'bomb')) cls.push('frozen');
    if (c.type === 'chest' && c.mimic) cls.push('mimic-tell');
    if (hot.has(i)) cls.push('hot');
    if (k.targeting && isTarget(c, i)) cls.push('tgt');
    if (!k.targeting && shootOk && twoAway(i, k.pos) && (c.type === 'monster' || c.type === 'boss')) cls.push('shootable');
    n.className = cls.join(' ');
    if (fresh){
      if (initial) n.firstChild.style.animationDelay = (i * 35) + 'ms';
      setTimeout(() => { n.classList.remove('spawn'); n.firstChild.style.animationDelay = ''; }, initial ? 700 : 400);
    }
    const html = cardInner(c);
    if (n._html !== html){ n.firstChild.innerHTML = html; n._html = html; }
    n.setAttribute('aria-label', cardLabel(c));
    discover(codexId(c));
    if (c.elite){ D.kerker.codex['e_' + c.ename] = 1; tipFor('elite'); }
  });
  for (const [id, n] of nodes){ if (!k.grid.some(c => c.id === id)){ nodes.delete(id); n.remove(); } }
  board.classList.toggle('targeting', !!k.targeting);
}
function removeNode(c){
  const n = c && nodes.get(c.id);
  if (!n) return;
  nodes.delete(c.id);
  n.classList.add('gone');
  setTimeout(() => n.remove(), 260);
}
function teleportNode(c){
  const n = c && nodes.get(c.id);
  if (n){ n.classList.add('teleport'); setTimeout(() => n.classList.remove('teleport'), 60); }
}
function fxAt(i, text, kind){
  if (current !== 'kerker') return;
  const e = document.createElement('div');
  e.className = 'fx ' + kind;
  e.style.setProperty('--c', colOf(i)); e.style.setProperty('--r', rowOf(i));
  e.innerHTML = `<span>${text}</span>`;
  board.appendChild(e);
  setTimeout(() => e.remove(), 1050);
}
function anim(c, cls){
  const n = c && nodes.get(c.id);
  if (!n) return;
  const ci = n.firstChild;
  ci.classList.remove(cls); void ci.offsetWidth; ci.classList.add(cls);
  ci.addEventListener('animationend', () => ci.classList.remove(cls), { once: true });
}
function lunge(c, from, to){
  const n = c && nodes.get(c.id);
  if (!n || reduceMotion) return;
  const ci = n.firstChild;
  ci.style.setProperty('--lx', (colOf(to) - colOf(from)) * 22 + '%');
  ci.style.setProperty('--ly', (rowOf(to) - rowOf(from)) * 22 + '%');
  ci.classList.remove('lunge'); void ci.offsetWidth; ci.classList.add('lunge');
  ci.addEventListener('animationend', () => ci.classList.remove('lunge'), { once: true });
}
function quake(n){
  if (reduceMotion || current !== 'kerker') return;
  kWrap.classList.remove('quake1', 'quake2'); void kWrap.offsetWidth; kWrap.classList.add('quake' + n);
}
function log(html){ if (!k) return; k.lastLog = html; $('#kLog').innerHTML = html; }
function splatColors(c){
  const P = isPaper();
  if (c.kind === 'ghost') return P ? ['#8FA8CC', '#2B2B30'] : ['#CFDCE0', '#AEBEC4'];
  if (c.kind === 'spider') return P ? ['#2F8A55', '#2B2B30'] : ['#7A9A3A', '#1E3641'];
  if (c.kind === 'mimic') return P ? ['#9A6A43', '#E8C21C'] : ['#8A5A36', '#F2C14E'];
  if (c.kind === 'golem') return P ? ['#6C6B73', '#2B2B30'] : ['#8C8272', '#5A5246'];
  if (c.kind === 'wisp') return P ? ['#E0583A', '#E8C21C'] : ['#E0583A', '#F2C14E'];
  if (c.type === 'boss') return P ? ['#D2413A', '#E8C21C', '#2B2B30'] : ['#C4622D', '#F2C14E', '#1E3641'];
  return P ? ['#D2413A', '#A5302A'] : ['#C4622D', '#9C4B21'];
}

/* =====================================================================
   HUD, ZIEL, VORSCHAU, LEISTE
   ===================================================================== */
function hud(){
  if (!k || !k.room) return;
  const low = k.hp <= Math.max(3, Math.floor(k.maxHp * .3));
  $('#kHp').textContent = `${k.hp}/${k.maxHp}`;
  $('#kHpBar').style.width = clamp(k.hp / k.maxHp * 100, 0, 100) + '%';
  $('#kHpBox').classList.toggle('low', low);
  $('#kWpnLbl').textContent = k.wpn ? WEAPONS[k.wpn.t].name : 'Waffe';
  $('#kWpnIc').innerHTML = icon(k.wpn ? WEAPONS[k.wpn.t].ic : 'sword');
  $('#kWpn').textContent = k.wpn ? k.wpn.v : '–';
  $('#kGold').textContent = k.gold;
  $('#kLvl').textContent = k.lvl;
  $('#kXpBar').style.width = clamp(k.xp / xpNeed(k.lvl) * 100, 0, 100) + '%';
  const r = k.room;
  $('#kRoomName').textContent = r.type === 'boss' ? BOSSES[(k.grid.find(c => c.type === 'boss') || {}).boss || WORLDS[k.world - 1].boss].name : ROOMS[r.type].name;
  $('#kSub').textContent = k.mode === 'end' ? `Endlose Gruft · Raum ${k.rooms + 1}` : `Welt ${k.world} · ${WORLDS[k.world - 1].name}`;
  const tag = $('#kModeTag');
  tag.textContent = k.mode === 'daily' ? MODS[k.mod].name : k.asc ? `Aufstieg ${k.asc}` : MODE_NAME[k.mode];
  tag.className = 'tb-mode' + (k.mode === 'daily' ? ' daily' : '');
  // Ziel
  const g = r.goal, goalEl = $('#kGoal');
  let gtxt = goalText(), prog = '', pct = 0;
  const bossC = k.grid.find(c => c.type === 'boss');
  if (g.kind === 'boss' && bossC){ prog = `${bossC.val}/${bossC.max}`; pct = bossC.val / bossC.max; }
  else if (g.n){ prog = `${Math.min(g.prog, g.n)}/${g.n}`; pct = g.prog / g.n; }
  if (g.done){ gtxt = r.unrest ? `Treppe offen · Unruhe ${r.unrest}` : 'Ziel erreicht · zur Treppe!'; prog = ''; pct = 1; }
  goalEl.className = 'goal' + (g.done ? ' done' : '') + (g.kind === 'boss' && !g.done ? ' boss' : '') + (bossC && bossC.p2 ? ' p2' : '');
  goalEl.innerHTML = `<span class="g-ic">${icon(g.done ? 'stairs' : g.kind === 'boss' ? (bossC ? bossC.boss : 'waechter') : g.kind === 'elite' ? 'knochen' : g.kind === 'treasure' ? 'lockchest' : g.kind === 'key' ? 'key' : g.kind === 'gold' ? 'coin' : g.kind === 'survive' ? 'clock' : 'sword')}</span>
    <span class="g-txt"><b>${gtxt}</b>${prog ? `<small>${prog}</small>` : ''}</span><span class="g-bar"><i style="width:${clamp(pct * 100, 0, 100)}%"></i></span>`;
  // Vorschau
  const n = Math.min(3, seeN());
  $('#kNext').innerHTML = `<span class="nq-lbl">Als Nächstes</span><span class="nq-cards">${k.queue.slice(0, n).map((c, i) =>
    `<button type="button" class="nq t-${c.type} ${c.kind ? 'k-' + c.kind : ''}" data-q="${i}" aria-label="${cardLabel(c)}">${icon(cardIcon(c))}<b>${['shrine', 'stairs', 'key', 'item', 'chest'].includes(c.type) ? '' : c.type === 'lockchest' ? '' : c.val}</b></button>`).join('')}</span>`;
  // Gefahr
  const danger = low && !k.over;
  kScreen.classList.toggle('danger', danger);
  if (danger && !heartTimer) heartTimer = setInterval(() => { if (current === 'kerker' && !sheetOpen()) Sfx.heart(); }, 1150);
  if (!danger && heartTimer){ clearInterval(heartTimer); heartTimer = 0; }
  // Fähigkeit
  const H = HEROES[k.hero], A = ABILITIES[H.ability], max = chargeMax(), ready = k.charge >= max;
  const ab = $('#kAbility'), abT = k.targeting && k.targeting.kind === 'ability';
  ab.className = 'ability' + (ready && !abT ? ' ready' : '') + (abT ? ' active' : '');
  ab.innerHTML = `<span class="ab-ring" style="--p:${Math.min(1, k.charge / max)}"><span>${icon(k.hero)}</span></span>
    <span class="ab-text"><b>${A.name}</b><small>${abT ? 'Ziel antippen' : ready ? 'Bereit!' : `${k.charge}/${max}`}</small></span>`;
  ab.setAttribute('aria-label', `${A.name}: ${ready ? 'bereit' : `${k.charge} von ${max} Siegen geladen`}`);
  // Tasche
  const slots = slotsMax();
  $('#kItems').dataset.n = slots;
  $('#kItems').innerHTML = Array.from({ length: slots }, (_, i) => {
    const it = k.items[i];
    if (!it) return '<span class="slot empty" aria-hidden="true"></span>';
    const act = k.targeting && k.targeting.kind === 'item' && k.targeting.idx === i;
    D.kerker.codex['i_' + it.id] = 1;
    return `<button type="button" class="slot ${act ? 'active' : ''}" data-item="${i}" aria-label="${ITEMS[it.id].name} benutzen">${icon(ITEMS[it.id].ic)}</button>`;
  }).join('');
  // Relikte
  const rb = $('#kRelics');
  rb.innerHTML = `${icon(k.relics.length ? 'r_' + k.relics[k.relics.length - 1] : 'r_kugel', k.relics.length ? 'r-' + k.relics[k.relics.length - 1] : 'unknown')}<b>${k.relics.length}</b>${k.streak >= 2 ? `<small>×${k.streak}</small>` : ''}`;
}

/* =====================================================================
   EFFEKTE
   ===================================================================== */
function makeFx(canvas, host){
  const cx = canvas.getContext('2d');
  let parts = [], raf = 0, W = 0, H = 0, dpr = 1, last = 0;
  const WARM = { red: '#C4622D', deep: '#9C4B21', gold: '#F2C14E', cream: '#F5F0E6', petrol: '#2B4C5C', green: '#5E8C61', smoke: '#8C8272', fire: '#E0583A', ice: '#9FD8F0' };
  const PAPER = { red: '#D2413A', deep: '#A5302A', gold: '#E8C21C', cream: '#2B2B30', petrol: '#2F5DA8', green: '#2F8A55', smoke: '#6C6B73', fire: '#E0583A', ice: '#2F5DA8' };
  const pal = () => isPaper() ? PAPER : WARM;
  function resize(){
    const r = host.getBoundingClientRect();
    if (!r.width) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    W = r.width; H = r.height;
  }
  function center(i){
    const s = host.getBoundingClientRect(), b = board.getBoundingClientRect(), g = 10;
    const cw = (b.width - 2 * g) / 3, ch = (b.height - 2 * g) / 3;
    return { x: b.left - s.left + colOf(i) * (cw + g) + cw / 2, y: b.top - s.top + rowOf(i) * (ch + g) + ch / 2, w: cw, h: ch };
  }
  function elCenter(el){
    const s = host.getBoundingClientRect(), b = el.getBoundingClientRect();
    return { x: b.left - s.left + b.width / 2, y: b.top - s.top + b.height / 2 };
  }
  function add(p){
    if (reduceMotion && p.kind !== 'coin' && p.kind !== 'ball') return;
    if (!W) resize();
    parts.push(p);
    if (!raf){ last = performance.now(); raf = requestAnimationFrame(loop); }
  }
  function burst(x, y, n, colors, o = {}){
    for (let j = 0; j < n; j++){
      const a = (o.dir != null ? o.dir + (vr() - .5) * (o.spread || 1) : vr() * 6.283), v = (o.v || 160) * (.4 + vr() * .8);
      add({ kind: o.kind || 'p', x: x + (o.jx ? (vr() - .5) * o.jx : 0), y: y + (o.jy ? (vr() - .5) * o.jy : 0), vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: o.g ?? 320,
            life: (o.life || .6) * (.6 + vr() * .6), max: o.life || .6, size: (o.size || 4) * (.6 + vr() * .8), col: colors[j % colors.length], rot: vr() * 6.28, vr: (vr() - .5) * 10, grow: o.grow || 0, delay: o.delay ? vr() * o.delay : 0 });
    }
  }
  function loop(ts){
    const dt = Math.min(.05, (ts - last) / 1000); last = ts;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, W, H);
    const paper = isPaper();
    for (const p of parts){
      if (p.delay > 0){ p.delay -= dt; continue; }
      p.life -= dt;
      if (p.kind === 'coin' || p.kind === 'ball' || p.kind === 'arrow'){
        p.t = Math.min(1, p.t + dt / p.dur);
        const u = 1 - p.t;
        if (p.kind === 'coin'){ p.x = u * u * p.x0 + 2 * u * p.t * p.cx + p.t * p.t * p.x1; p.y = u * u * p.y0 + 2 * u * p.t * p.cy + p.t * p.t * p.y1; }
        else { p.x = lerp(p.x0, p.x1, p.t); p.y = lerp(p.y0, p.y1, p.t) - (p.kind === 'ball' ? Math.sin(p.t * Math.PI) * 30 : 0); }
        if (p.kind === 'ball' && vr() < .7) burst(p.x, p.y, 1, [pal().fire, pal().gold], { v: 40, life: .35, size: 5, g: -60 });
        if (p.t >= 1){ p.life = 0; if (p.onArrive) p.onArrive(); }
      } else if (p.kind === 'ring' || p.kind === 'flash'){
        p.r += p.vr * dt;
      } else {
        p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .985; p.rot += p.vr * dt; p.size += p.grow * dt;
      }
      cx.globalAlpha = ['coin', 'ball', 'arrow'].includes(p.kind) ? 1 : clamp(p.life / p.max, 0, 1);
      draw(p, paper);
    }
    cx.globalAlpha = 1;
    parts = parts.filter(p => p.life > 0);
    raf = parts.length ? requestAnimationFrame(loop) : 0;
    if (!raf) cx.clearRect(0, 0, W, H);
  }
  function draw(p, paper){
    const c = cx;
    if (p.kind === 'coin'){
      c.beginPath(); c.arc(p.x, p.y, 7, 0, 7);
      c.fillStyle = paper ? 'rgba(244,217,58,.9)' : '#F2C14E'; c.fill();
      c.lineWidth = paper ? 1.6 : 2; c.strokeStyle = paper ? '#2B2B30' : '#D69E2E'; c.stroke();
      return;
    }
    if (p.kind === 'ball'){
      c.beginPath(); c.arc(p.x, p.y, 10, 0, 7); c.fillStyle = pal().fire; c.fill();
      c.beginPath(); c.arc(p.x, p.y, 5, 0, 7); c.fillStyle = pal().gold; c.fill();
      return;
    }
    if (p.kind === 'arrow'){
      const a = Math.atan2(p.y1 - p.y0, p.x1 - p.x0);
      c.save(); c.translate(p.x, p.y); c.rotate(a);
      c.strokeStyle = paper ? '#2B2B30' : (p.good ? '#F5F0E6' : '#9C4B21'); c.lineWidth = 3; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-22, 0); c.lineTo(6, 0); c.stroke();
      c.fillStyle = paper ? '#2B2B30' : (p.good ? '#F2C14E' : '#C4622D');
      c.beginPath(); c.moveTo(12, 0); c.lineTo(3, -5); c.lineTo(3, 5); c.closePath(); c.fill();
      c.restore();
      return;
    }
    if (p.kind === 'ring'){
      c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.lineWidth = p.w || 4; c.strokeStyle = p.col;
      if (paper) c.setLineDash([6, 5]);
      c.stroke(); c.setLineDash([]);
      return;
    }
    if (p.kind === 'flash'){ c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fillStyle = p.col; c.fill(); return; }
    if (p.kind === 'smoke'){
      c.beginPath(); c.arc(p.x, p.y, p.size, 0, 7);
      if (paper){ c.lineWidth = 1.4; c.strokeStyle = p.col; c.stroke(); } else { c.fillStyle = p.col; c.fill(); }
      return;
    }
    if (p.kind === 'conf' || p.kind === 'flake'){
      c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
      if (p.kind === 'flake'){ c.strokeStyle = p.col; c.lineWidth = 1.6; c.beginPath(); for (let a = 0; a < 3; a++){ c.moveTo(-5, 0); c.lineTo(5, 0); c.rotate(Math.PI / 3); } c.stroke(); }
      else if (paper){ c.strokeStyle = p.col; c.lineWidth = 2.2; c.beginPath(); c.moveTo(-5, 0); c.lineTo(5, 0); c.stroke(); }
      else { c.fillStyle = p.col; c.fillRect(-4, -2.5, 8, 5); }
      c.restore();
      return;
    }
    if (p.kind === 'star'){
      c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.col; c.beginPath();
      for (let i = 0; i <= 10; i++){ const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? p.size * .45 : p.size; i ? c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      c.closePath(); c.fill(); c.restore();
      return;
    }
    if (paper){
      c.strokeStyle = p.col; c.lineWidth = 1.8; c.lineCap = 'round';
      c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * .03, p.y - p.vy * .03); c.stroke();
    } else { c.fillStyle = p.col; c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
  }
  const api = {
    resize, clear(){ parts = []; },
    splat(i, cols){ const c = center(i); burst(c.x, c.y, 14, cols, { v: 190, life: .55, size: 5 }); },
    hurt(i){ const c = center(i); burst(c.x, c.y, 10, [pal().red, pal().deep], { v: 150, life: .5, size: 4 }); },
    hit(i){ const c = center(i); burst(c.x, c.y, 8, [pal().cream, pal().gold], { v: 220, life: .35, size: 3, g: 0 }); },
    coins(i, n){
      const box = $('#kGoldBox'); if (!box || current !== 'kerker') return;
      const from = center(i), to = elCenter(box);
      for (let j = 0; j < n; j++){
        add({ kind: 'coin', x0: from.x + (vr() - .5) * 30, y0: from.y + (vr() - .5) * 30, x1: to.x, y1: to.y,
              cx: from.x + (vr() - .5) * 160, cy: Math.min(from.y, to.y) - 40 - vr() * 60, x: from.x, y: from.y,
              t: 0, dur: .5 + vr() * .25, delay: j * .05, life: 5, max: 5,
              onArrive: j === n - 1 ? () => { box.classList.remove('pulse'); void box.offsetWidth; box.classList.add('pulse'); } : null });
      }
    },
    arrow(from, to, good){
      const a = center(from), b = center(to);
      add({ kind: 'arrow', x0: a.x, y0: a.y, x1: b.x, y1: b.y, x: a.x, y: a.y, t: 0, dur: .22, life: 2, max: 2, good,
            onArrive: () => burst(b.x, b.y, 8, [pal().cream, pal().red], { v: 160, life: .35, size: 3, g: 0 }) });
    },
    explosion(i){
      const c = center(i), P = pal();
      add({ kind: 'flash', x: c.x, y: c.y, r: 10, vr: 260, life: .22, max: .22, col: isPaper() ? 'rgba(224,88,58,.35)' : 'rgba(242,193,78,.8)' });
      add({ kind: 'ring', x: c.x, y: c.y, r: 12, vr: 420, w: 6, life: .4, max: .4, col: P.fire });
      burst(c.x, c.y, 34, [P.fire, P.gold, P.red, P.deep], { v: 380, life: .7, size: 6 });
      burst(c.x, c.y, 10, [isPaper() ? P.smoke : 'rgba(80,72,60,.55)'], { kind: 'smoke', v: 70, life: 1.1, size: 12, g: -40, grow: 26 });
    },
    explosionSmall(i){ const c = center(i), P = pal(); burst(c.x, c.y, 22, [P.fire, P.gold, P.red], { v: 260, life: .55, size: 5 }); },
    whirl(i){
      const c = center(i), P = pal();
      add({ kind: 'ring', x: c.x, y: c.y, r: 20, vr: 300, w: 8, life: .45, max: .45, col: P.gold });
      add({ kind: 'ring', x: c.x, y: c.y, r: 10, vr: 220, w: 4, life: .5, max: .5, col: P.cream });
      burst(c.x, c.y, 18, [P.gold, P.cream], { v: 280, life: .5, size: 4, g: 0 });
    },
    fireball(from, to, done){
      if (reduceMotion){ done(); return; }
      const a = center(from), b = center(to);
      add({ kind: 'ball', x0: a.x, y0: a.y, x1: b.x, y1: b.y, x: a.x, y: a.y, t: 0, dur: .35, life: 2, max: 2, onArrive: () => { api.explosionSmall(to); done(); } });
    },
    poof(i){ const c = center(i), P = pal(); burst(c.x, c.y, 12, [isPaper() ? P.petrol : 'rgba(40,36,60,.6)', P.smoke], { kind: 'smoke', v: 90, life: .7, size: 9, g: -30, grow: 18 }); },
    phoenix(i){ const c = center(i), P = pal(); burst(c.x, c.y + 20, 40, [P.fire, P.gold, P.red], { dir: -Math.PI / 2, spread: 1.4, v: 320, life: 1, size: 5, g: 120 }); add({ kind: 'ring', x: c.x, y: c.y, r: 20, vr: 360, w: 6, life: .5, max: .5, col: P.gold }); },
    sparkle(i){ const c = center(i), P = pal(); burst(c.x, c.y, 24, [P.gold, P.cream, P.petrol], { kind: 'star', v: 200, life: .8, size: 5, g: -40 }); },
    rage(i){ const c = center(i), P = pal(); add({ kind: 'ring', x: c.x, y: c.y, r: 15, vr: 260, w: 7, life: .5, max: .5, col: P.red }); burst(c.x, c.y, 16, [P.red, P.deep], { v: 220, life: .5, size: 5, g: 0 }); },
    burn(i){ const c = center(i), P = pal(); burst(c.x, c.y + c.h / 3, 14, [P.fire, P.gold, P.red], { dir: -Math.PI / 2, spread: 1, v: 200, life: .6, size: 6, g: -60 }); },
    death(i){ const c = center(i), P = pal(); burst(c.x, c.y, 40, [P.red, P.deep, P.cream], { v: 300, life: 1, size: 6 }); },
    rain(){
      const b = board.getBoundingClientRect(), s = host.getBoundingClientRect(), P = pal();
      for (let j = 0; j < 26; j++){
        const x = b.left - s.left + vr() * b.width, y = b.top - s.top + vr() * b.height;
        add({ kind: 'arrow', x0: x - 40, y0: y - 120, x1: x, y1: y, x, y, t: 0, dur: .25 + vr() * .2, delay: vr() * .3, life: 2, max: 2, good: true,
              onArrive: () => burst(x, y, 3, [P.cream, P.gold], { v: 90, life: .3, size: 3, g: 0 }) });
      }
    },
    frost(){
      const P = pal();
      for (let j = 0; j < 50; j++) add({ kind: 'flake', x: vr() * W, y: -20 - vr() * H * .3, vx: (vr() - .5) * 40, vy: 80 + vr() * 90, g: 40, life: 2.2, max: 2.2, size: 5, col: P.ice, rot: vr() * 6, vr: (vr() - .5) * 4, grow: 0 });
    },
    levelup(i){
      const c = center(i), P = pal();
      add({ kind: 'ring', x: c.x, y: c.y, r: 20, vr: 380, w: 6, life: .55, max: .55, col: P.gold });
      burst(c.x, c.y, 30, [P.gold, P.cream], { kind: 'star', dir: -Math.PI / 2, spread: 2.4, v: 320, life: 1, size: 6, g: 160 });
    },
    confetti(){
      const P = pal(), cols = [P.gold, P.red, P.petrol, P.green, P.fire];
      for (let j = 0; j < 90; j++) add({ kind: 'conf', x: vr() * W, y: -20 - vr() * H * .4, vx: (vr() - .5) * 80, vy: 60 + vr() * 120, g: 90, life: 3, max: 3, size: 5, col: cols[j % cols.length], rot: vr() * 6, vr: (vr() - .5) * 12, grow: 0 });
    }
  };
  return api;
}
const FX = makeFx($('#kFx'), kScreen);
const MFX = makeFx($('#kmapFx'), mapScreen);

/* =====================================================================
   HINWEISE UND KARTENINFO
   ===================================================================== */
function tipFor(id){ if (TIPS[id] && !D.tips[id] && !tipQ.includes(id)) tipQ.push(id); }
function showTips(){
  if (!k || kBusy || kFlow || sheetOpen() || !kTipEl.hidden || current !== 'kerker') return;
  while (tipQ.length && D.tips[tipQ[0]]) tipQ.shift();
  if (!tipQ.length) return;
  const id = tipQ.shift(), [title, text] = TIPS[id];
  D.tips[id] = 1; save();
  let ic = 'spark', cls = '';
  if (id.startsWith('m_')){ ic = id.slice(2); cls = 't-monster k-' + id.slice(2); }
  else if (id.startsWith('c_')){ ic = CARDS[id.slice(2)].ic; cls = 't-' + id.slice(2); }
  else if (id.startsWith('w_')){ ic = WEAPONS[id.slice(2)].ic; cls = 't-weapon'; }
  else ic = { goal: 'sword', next: 'r_kugel', elite: 'knochen', levelup: 'star' }[id] || 'spark';
  kTipEl.className = 'tipnote ' + cls;
  kTipEl.innerHTML = `${icon(ic)}<span><b>${title}</b><span>${text}</span><small>Antippen zum Schließen</small></span>`;
  kTipEl.hidden = false;
}
function hideTip(){ kTipEl.hidden = true; }
kTipEl.addEventListener('click', () => { Sfx.ui(); hideTip(); setTimeout(showTips, 150); });

function describe(c){
  let title = cardName(c), lines = [];
  switch (c.type){
    case 'hero': {
      const H = HEROES[k.hero];
      title = H.name;
      lines.push(`${k.hp}/${k.maxHp} Leben, ${k.armor} Rüstung${k.wpn ? `, ${WEAPONS[k.wpn.t].name} ${k.wpn.v}` : ', keine Waffe'}.`);
      lines.push(H.passive);
      if (k.wpn) lines.push(`<b>${WEAPONS[k.wpn.t].name}:</b> ${WEAPONS[k.wpn.t].desc}`);
      lines.push(`Kritische Treffer: ${Math.round(critChance() * 100)} %.`);
      break;
    }
    case 'monster':
      lines.push(`Stärke <b>${c.val}</b>: So viel Schaden richtet es an, wenn du es ohne Waffe bekämpfst.`);
      if (c.elite) lines.push('<b>Elite-Gegner.</b> Besiegst du ihn, gibt es ein Relikt.');
      if (c.leader) lines.push('<b>Anführer.</b> Sein Tod erfüllt das Raumziel.');
      if (c.kind === 'mimic') lines.push(MONSTERS.mimic.desc);
      for (const tr of c.tr || []) lines.push(`<b>${TRAITS[tr].name}${c.cd && c.cd[tr] != null ? ` (in ${c.cd[tr]})` : ''}:</b> ${TRAITS[tr].desc}`);
      if (c.loot) lines.push(c.elite || c.leader ? `Hortet <b>${c.loot}</b> gestohlenes Gold. Besiegt gibt er das Doppelte zurück.` : `Trägt <b>${c.loot}</b> gestohlenes Gold und flieht in ${c.flee} ${plural(c.flee, 'Zug', 'Zügen')}.`);
      if (c.stun) lines.push(`Betäubt für ${c.stun} ${plural(c.stun, 'Zug', 'Züge')}.`);
      if (!(c.tr || []).length && c.kind !== 'mimic') lines.push(MONSTERS[c.kind].desc);
      break;
    case 'boss': {
      const B = BOSSES[c.boss];
      lines.push(`<b>${c.val}</b> von ${c.max} Leben.`);
      lines.push(B.mech);
      if (c.p2) lines.push(`<b>${B.p2}</b>`);
      else lines.push('Unter halber Kraft wird er wütend.');
      break;
    }
    case 'weapon': lines.push(`Stärke <b>${c.val + weaponBonus(c.wt)}</b> in deiner Hand.`, WEAPONS[c.wt].desc, 'Ersetzt deine aktuelle Waffe.'); break;
    case 'item': lines.push(ITEMS[c.it].desc, 'Wandert in deine Tasche.'); break;
    case 'potion': lines.push(`Heilt ${c.val + potionBonus()} Leben. Bist du voll, steckst du ihn ein.`); break;
    case 'gold': lines.push(`${Math.round(c.val * (has('midas') ? 1.5 : 1) * (k.mod === 'goldrausch' ? 2 : 1) * goldMul())} Gold.`); break;
    case 'armor': lines.push(`+${c.val} Rüstung. ${CARDS.armor.desc}`); break;
    case 'bomb': lines.push(`Explodiert in <b>${c.val}</b> ${plural(c.val, 'Zug', 'Zügen')} und trifft alle Nachbarfelder: 6 Schaden an Monstern, 5 an dir. Drauftreten entschärft sie.`); break;
    case 'trap': lines.push(`Kostet <b>${c.val}</b> Leben beim Drauftreten.`); break;
    default: lines.push(CARDS[c.type] ? CARDS[c.type].desc : '');
  }
  return { title, lines };
}
function showInfo(c){
  if (!c) return;
  const d = describe(c);
  kInfoEl.className = 'cardinfo t-' + c.type + (c.kind ? ' k-' + c.kind : '');
  kInfoEl.innerHTML = `${icon(cardIcon(c))}<div><b>${d.title}</b>${d.lines.map(l => `<p>${l}</p>`).join('')}</div>`;
  kInfoEl.hidden = false;
  Sfx.ui();
}
function hideInfo(){ kInfoEl.hidden = true; }
kInfoEl.addEventListener('click', hideInfo);

/* =====================================================================
   ABLAUF: Belohnungen, Dialoge, Übergänge
   ===================================================================== */
async function flow(){
  if (!k || kFlow) return;
  kFlow = true;
  const tok = ++flowToken;
  hideTip(); hideInfo();
  try {
    while (k && k.pq.length && !k.over){
      const p = k.pq[0];
      pqIns = 1;
      await showPending(p);
      if (tok !== flowToken || !k) return;
      k.pq.shift();
      saveRun();
    }
  } finally {
    if (tok === flowToken) kFlow = false;
  }
  if (!k || k.over) return;
  if (current === 'kerker'){ render(); hud(); showTips(); }
  if (current === 'kmap') renderMap();
}
function flowGo(id){ flowNav = true; go(id); flowNav = false; }
function bannerEl(){ return current === 'kmap' ? mapBannerEl : kBannerEl; }
function sheetPromise(build){
  return new Promise(res => build(res));
}
function showPending(p){
  switch (p.t){
    case 'banner':
      return banner(bannerEl(), p, 2300);
    case 'perk': return perkSheet(p);
    case 'relic': return relicSheet(p);
    case 'loot': return lootSheet(p);
    case 'itemfull': return itemFullSheet(p);
    case 'shop': return shopSheet(p);
    case 'rest': return restSheet(p);
    case 'event': return eventSheet(p);
    case 'endchoice': return endChoiceSheet(p);
    case 'roomdone':
      afterRoomDone(p);
      closeSheet();
      if (k.mode !== 'end') flowGo('kmap');
      return Promise.resolve();
    case 'nodedone':
      markNodeDone();
      if (current === 'kmap') renderMap();
      return Promise.resolve();
    case 'nextroom':
      closeSheet();
      flowNav = true; setupRoom(endlessRoomType()); saveRun();
      if (current === 'kerker') SCREENS.kerker.enter(); else go('kerker');
      flowNav = false;
      return Promise.resolve();
    case 'worlddone': return worldDoneFlow();
  }
  return Promise.resolve();
}
function perkSheet(p){
  if (!p.offer) p.offer = perkOffer();
  if (!p.offer.length) return Promise.resolve();
  if (current === 'kerker') FX.levelup(k.pos);
  Sfx.victory(); buzz([30, 30, 60]);
  return sheetPromise(res => sheet(`<div class="lvlhead">${icon('star')}<div><span class="new">Stufe ${p.lvl || k.lvl}</span><h2>Stufenaufstieg!</h2></div></div>
    <p>Wähle ein Talent. Es wirkt bis zum Ende des Laufs.</p>
    <div class="offers">${p.offer.map(id => `<button type="button" class="offer" data-act="take" data-id="${id}">${icon(PERKS[id].ic)}
      <span class="info"><b>${PERKS[id].name}${perk(id) ? ` <small>Stufe ${perk(id) + 1}</small>` : ''}</b><span>${PERKS[id].desc}</span></span></button>`).join('')}</div>`,
    { take: b => { takePerk(b.dataset.id); closeSheet(); if (current === 'kerker'){ render(); hud(); } res(); } }));
}
function relicSheet(p){
  if (!p.offer) p.offer = relicOffer(3);
  if (!p.offer.length){ gainGold(25, null, true); return Promise.resolve(); }
  const titles = { start: ['Reliquienjäger', 'Dein Lauf beginnt mit einem Relikt deiner Wahl.'],
                   shrine: ['Ein Schrein', 'Wähle ein Relikt. Es wirkt bis zum Ende dieses Laufs.'],
                   elite: ['Beute des Elite-Gegners', 'Wähle ein Relikt.'],
                   boss: ['Beute des Wächters', 'Der Boss hinterlässt drei Relikte. Eines darfst du mitnehmen.'],
                   chest: ['Ein Relikt!', 'Wähle eines der drei Relikte.'],
                   gift: ['Ein Geschenk', 'Wähle ein Relikt.'],
                   altar: ['Dein Lohn', 'Wähle ein Relikt.'] };
  const [title, sub] = titles[p.src] || titles.shrine;
  return sheetPromise(res => sheet(`<h2>${title}</h2><p>${sub}</p>
    <div class="offers">${p.offer.map(id => `<button type="button" class="offer" data-act="take" data-id="${id}">${icon('r_' + id, 'r-' + id)}<span class="info"><b>${RELICS[id].name}</b><span>${RELICS[id].desc}</span></span></button>`).join('')}</div>
    <button type="button" class="btn ghost" data-act="skip">Keins nehmen (+15 Gold)</button>`,
    {
      take: b => { takeRelic(b.dataset.id); if (current === 'kerker') FX.sparkle(k.pos); closeSheet(); if (current === 'kerker'){ render(); hud(); } res(); },
      skip: () => { k.gold += 15; closeSheet(); res(); }
    }));
}
function lootLabel(o){
  switch (o.t){
    case 'item': return [ITEMS[o.id].ic, ITEMS[o.id].name, ITEMS[o.id].desc, ''];
    case 'weapon': return [WEAPONS[o.wt].ic, `${WEAPONS[o.wt].name} (Stärke ${o.v})`, WEAPONS[o.wt].desc + (k.wpn ? ` Jetzt: ${WEAPONS[k.wpn.t].name} ${k.wpn.v}.` : ''), 't-weapon'];
    case 'armor': return ['armor', `Rüstung +${o.v}`, 'Schluckt Schaden, bevor du Leben verlierst.', 't-armor'];
    case 'maxhp': return ['heart', `+${o.v} maximale Leben`, 'Dauerhaft für diesen Lauf, sofort geheilt.', 't-monster'];
    case 'gold': return ['coin', `${o.v} Gold`, 'Für Händler und deinen Schatz.', 't-gold'];
    case 'relic': return ['r_' + o.id, RELICS[o.id].name, RELICS[o.id].desc, ''];
  }
  return ['spark', '', '', ''];
}
function lootSheet(p){
  if (!p.offer) p.offer = lootOffer();
  const r = k.pq.find(x => x.t === 'roomdone');
  return sheetPromise(res => sheet(`<h2>Raum geschafft!</h2>
    <p>${r ? `<b>+${r.gold}</b> Gold. ` : ''}Wähle deine Beute.</p>
    <div class="offers">${p.offer.map((o, n) => { const [ic, name, desc, cls] = lootLabel(o);
      return `<button type="button" class="offer ${cls}" data-act="take" data-n="${n}">${icon(ic, o.t === 'relic' ? 'r-' + o.id : '')}<span class="info"><b>${name}</b><span>${desc}</span></span></button>`; }).join('')}</div>
    <button type="button" class="btn ghost" data-act="skip">Nichts nehmen (+8 Gold)</button>`,
    {
      take: b => { takeLoot(p.offer[+b.dataset.n]); closeSheet(); res(); },
      skip: () => { k.gold += 8; closeSheet(); res(); }
    }));
}
function itemFullSheet(p){
  const it = p.item;
  return sheetPromise(res => sheet(`<h2>Tasche voll</h2><p>Du findest <b>${ITEMS[it.id].name}</b>. Was wirfst du dafür weg?</p>
    <div class="offers">${k.items.map((x, n) => `<button type="button" class="offer" data-act="swap" data-n="${n}">${icon(ITEMS[x.id].ic)}<span class="info"><b>${ITEMS[x.id].name} wegwerfen</b><span>${ITEMS[x.id].desc}</span></span></button>`).join('')}</div>
    <button type="button" class="btn sec" data-act="keep">${ITEMS[it.id].name} liegen lassen</button>`,
    {
      swap: b => { k.items[+b.dataset.n] = it; closeSheet(); if (current === 'kerker') hud(); res(); },
      keep: () => { closeSheet(); res(); }
    }));
}
function stockLabel(s){
  switch (s.k){
    case 'item': return [ITEMS[s.id].ic, ITEMS[s.id].name, ITEMS[s.id].desc, ''];
    case 'weapon': return [WEAPONS[s.wt].ic, `${WEAPONS[s.wt].name} ${s.v}`, WEAPONS[s.wt].desc, 't-weapon'];
    case 'relic': return ['r_' + s.id, RELICS[s.id].name, RELICS[s.id].desc, ''];
    case 'heal': return ['potion', 'Volle Heilung', k.hp >= k.maxHp ? 'Du bist schon voll bei Kräften.' : `Heilt dich auf ${k.maxHp} Leben (jetzt ${k.hp}).`, 't-potion'];
    case 'sharpen': return ['r_schleif', 'Waffe schärfen', k.wpn ? `${WEAPONS[k.wpn.t].name} ${k.wpn.v} → ${k.wpn.v + 4}` : 'Du bekommst ein Schwert.', ''];
    case 'armor': return ['armor', `Rüstung +${s.v}`, 'Schluckt Schaden, bevor du Leben verlierst.', 't-armor'];
  }
  return ['spark', '', '', ''];
}
function shopSheet(p){
  if (!p.stock) p.stock = shopStock();
  return sheetPromise(res => {
    const draw = () => sheet(`<h2>Der Händler</h2><p class="bank">${icon('coin', 'cur-kerker')} Dein Gold: <b>${k.gold}</b></p>
      <div class="offers">${p.stock.map((s, n) => { const [ic, name, desc, cls] = stockLabel(s);
        return `<div class="shop-item ${cls} ${s.sold ? 'sold' : ''}">${icon(ic, s.k === 'relic' ? 'r-' + s.id : '')}<span class="info"><b>${name}</b><span>${desc}</span></span>
          ${s.sold ? '<span class="maxed">Gekauft</span>' : `<button type="button" class="btn small" data-act="buy" data-n="${n}" ${k.gold < s.cost || (s.k === 'heal' && k.hp >= k.maxHp) ? 'disabled' : ''}>${s.cost}</button>`}</div>`; }).join('')}</div>
      <p class="fine">Was du hier ausgibst, fehlt am Ende im Schatz.</p>
      <button type="button" class="btn sec" data-act="leave">Weiterziehen</button>`,
      {
        buy: b => { if (buyStock(p.stock[+b.dataset.n])){ saveRun(); if (current === 'kmap') renderMapHud(); draw(); } },
        leave: () => { closeSheet(); res(); }
      });
    draw();
  });
}
function restSheet(p){
  if (p.left == null) p.left = has('amboss') ? 2 : 1;
  const pct = k.asc >= 3 ? .3 : .4, healAmt = Math.ceil(k.maxHp * pct);
  return sheetPromise(res => {
    const draw = () => sheet(`<div class="lvlhead">${icon('campfire')}<div><h2>Rastplatz</h2></div></div>
      <p>Das Feuer knistert. ${p.left > 1 ? 'Dein Taschenamboss erlaubt dir heute zwei Dinge.' : 'Du hast Zeit für eine Sache.'}</p>
      <div class="offers">
        <button type="button" class="offer t-potion" data-act="rest">${icon('heart')}<span class="info"><b>Ausruhen</b><span>Heilt ${healAmt} Leben (${k.hp}/${k.maxHp}).</span></span></button>
        <button type="button" class="offer t-weapon" data-act="forge">${icon('r_amboss')}<span class="info"><b>Schmieden</b><span>${k.wpn ? `${WEAPONS[k.wpn.t].name} ${k.wpn.v} → ${k.wpn.v + 5}` : `Du schmiedest ein Schwert (Stärke ${5 + tier() * 2}).`}</span></span></button>
        <button type="button" class="offer" data-act="train">${icon('star')}<span class="info"><b>Trainieren</b><span>+${20 + tier() * 5} Erfahrung und Heldenfähigkeit voll geladen.</span></span></button>
      </div>`,
      {
        rest: () => done(() => { heal(healAmt); Sfx.potion(); }),
        forge: () => done(() => { if (k.wpn) k.wpn.v += 5; else k.wpn = { t: 'schwert', v: 5 + tier() * 2 }; Sfx.weapon(); }),
        train: () => done(() => { k.charge = chargeMax(); gainXP(20 + tier() * 5); })
      });
    const done = fn => {
      fn(); p.left--; saveRun(); renderMapHud();
      if (p.left > 0) draw(); else { closeSheet(); res(); }
    };
    draw();
  });
}
function eventSheet(p){
  const ev = EVENTS.find(e => e.id === p.id) || EVENTS[0];
  if (p.result) return eventResult(ev, p.result);
  return sheetPromise(res => sheet(`<div class="lvlhead">${icon(ev.ic)}<div><span class="new">Ereignis</span><h2>${ev.title}</h2></div></div>
    <p>${ev.text}</p>
    <div class="offers">${ev.opts.map((o, n) => { const ok = !o.cond || o.cond();
      return `<button type="button" class="offer" data-act="pick" data-n="${n}" ${ok ? '' : 'disabled'}><span class="info"><b>${o.label}</b>${o.sub ? `<span>${typeof o.sub === 'function' ? o.sub() : o.sub}</span>` : ''}</span></button>`; }).join('')}</div>`,
    {
      pick: b => {
        const o = ev.opts[+b.dataset.n];
        if (o.cond && !o.cond()) return;
        p.result = o.run() || '';
        saveRun(); renderMapHud();
        eventResult(ev, p.result).then(res);
      }
    }));
}
function eventResult(ev, text){
  return sheetPromise(res => sheet(`<h2>${ev.title}</h2><p>${text}</p><button type="button" class="btn" data-act="ok">Weiter</button>`,
    { ok: () => { closeSheet(); res(); } }));
}
function endChoiceSheet(p){
  return sheetPromise(res => sheet(`<h2>Verschnaufpause</h2><p>${k.rooms} Räume geschafft. Was jetzt?</p>
    <div class="offers">
      <button type="button" class="offer" data-act="rest">${icon('campfire')}<span class="info"><b>Rastplatz</b><span>Ausruhen, schmieden oder trainieren.</span></span></button>
      <button type="button" class="offer" data-act="shop">${icon('merchant')}<span class="info"><b>Händler</b><span>Gegenstände, Waffen, Relikte.</span></span></button>
      <button type="button" class="offer" data-act="event">${icon('quest')}<span class="info"><b>Ereignis</b><span>Wer weiß, was dich erwartet.</span></span></button>
    </div>`,
    {
      rest: () => { pqNext({ t: 'rest' }); closeSheet(); res(); },
      shop: () => { pqNext({ t: 'shop' }); closeSheet(); res(); },
      event: () => { pqNext({ t: 'event', id: pickEvent() }); closeSheet(); res(); }
    }));
}
async function worldDoneFlow(){
  const res = worldDone(), W = WORLDS[k.world - 1];
  Sfx.victory(); MFX.confetti();
  if (res === 'win'){ k.won = true; return win(); }
  await banner(mapBannerEl, { kind: 'win', ic: W.boss, eyebrow: `Welt ${k.world} bezwungen`, title: W.name, sub: res === 'abyss' ? 'Die drei Siegelsplitter glühen. Ein Tor öffnet sich …' : 'Weiter in die Tiefe.' }, 2200);
  nextWorld();
  saveRun();
  renderMap();
  return showWorldIntro();
}
function showWorldIntro(){
  k.mapIntro = k.world;
  const W = WORLDS[k.world - 1];
  Music.play('gruft');
  return banner(mapBannerEl, { kind: k.world === 6 ? 'boss' : '', ic: W.boss, eyebrow: k.mode === 'daily' ? `Tagesgruft · Welt ${k.world}` : `Welt ${k.world}`, title: W.name, sub: W.sub }, 2300);
}

/* =====================================================================
   KARTE
   ===================================================================== */
function renderMapHud(){
  if (!k) return;
  $('#kmapHud').innerHTML = `
    <span class="mh">${icon('heart', 'hi-heart')}<b>${k.hp}/${k.maxHp}</b></span>
    <span class="mh">${icon(k.wpn ? WEAPONS[k.wpn.t].ic : 'sword', 'hi-sword')}<b>${k.wpn ? k.wpn.v : '–'}</b></span>
    <span class="mh">${icon('armor', 'hi-shield')}<b>${k.armor}</b></span>
    <span class="mh">${icon('coin', 'hi-coin')}<b>${k.gold}</b></span>
    <span class="mh">${icon('star', 'hi-star')}<b>${k.lvl}</b></span>
    <span class="mh">${icon('r_kugel', 'r-kugel')}<b>${k.relics.length}</b></span>
    ${k.world >= 2 && k.world <= 5 || k.sigils.length ? `<span class="mh">${icon('sigil', 'hi-sigil')}<b>${k.sigils.length}/3</b></span>` : ''}`;
}
function renderMap(){
  if (!k || !k.map) return;
  const rows = k.map.rows, reach = reachable(), W = WORLDS[k.world - 1];
  mapScreen.dataset.world = k.world;
  $('#kmapTitle').textContent = W.name;
  $('#kmapSub').textContent = `Welt ${k.world}` + (reach.length ? ' · Wähle deinen Weg' : '');
  const tag = $('#kmapMode');
  tag.textContent = k.mode === 'daily' ? MODS[k.mod].name : k.asc ? `Aufstieg ${k.asc}` : MODE_NAME[k.mode];
  tag.className = 'tb-mode' + (k.mode === 'daily' ? ' daily' : '');
  renderMapHud();
  const rowH = 92, pad = 50, n = rows.length, h = pad * 2 + (n - 1) * rowH;
  const inner = $('#kmapInner');
  inner.style.height = h + 'px';
  const pos = (r, i) => ({ x: rows[r][i].x * 100, y: h - pad - r * rowH });
  let lines = '';
  rows.forEach((row, r) => row.forEach(nd => nd.next.forEach(j => {
    const a = pos(r, nd.i), b = pos(r + 1, j);
    const taken = nd.done && k.at && ((k.at.r === r + 1 && k.at.i === j) || rows[r + 1][j].done);
    const open = k.at && k.at.r === r && k.at.i === nd.i && nd.done;
    lines += `<line x1="${a.x}%" y1="${a.y}" x2="${b.x}%" y2="${b.y}" class="${taken ? 'taken' : open ? 'open' : ''}"/>`;
  })));
  const isReach = (r, i) => reach.some(([a, b]) => a === r && b === i);
  let btns = '';
  rows.forEach((row, r) => row.forEach(nd => {
    const p = pos(r, nd.i), R0 = ROOMS[nd.type];
    const cur = k.at && k.at.r === r && k.at.i === nd.i;
    const st = nd.done ? 'done' : isReach(r, nd.i) ? 'reach' : cur ? 'cur' : 'locked';
    const ic = nd.type === 'boss' ? W.boss : R0.ic;
    btns += `<button type="button" class="mnode n-${nd.type} ${st} ${cur ? 'here' : ''}" style="left:${p.x}%;top:${p.y}px" data-r="${r}" data-i="${nd.i}" ${st === 'reach' ? '' : 'tabindex="-1"'} aria-label="${nd.type === 'boss' ? BOSSES[W.boss].name : R0.name}${st === 'reach' ? ', wählbar' : ''}">
      <span class="mn-ic">${icon(ic)}</span><span class="mn-lbl">${nd.type === 'boss' ? 'Boss' : R0.name}</span></button>`;
  }));
  inner.innerHTML = `<svg class="map-lines" width="100%" height="${h}" aria-hidden="true">${lines}</svg>${btns}`;
  // Zur aktuellen Reihe scrollen
  const sc = $('#kmapScroll'), targetR = k.at ? k.at.r : 0;
  requestAnimationFrame(() => { sc.scrollTop = Math.max(0, h - pad - targetR * rowH - sc.clientHeight * .65); });
}
$('#kmapInner').addEventListener('click', e => {
  const b = e.target.closest('.mnode');
  if (!b) return;
  if (!b.classList.contains('reach')){
    const nd = k.map.rows[+b.dataset.r][+b.dataset.i];
    if (!nd.done) toast(nd.type === 'boss' ? BOSSES[WORLDS[k.world - 1].boss].name : ROOMS[nd.type].name, 'Noch nicht erreichbar', ROOMS[nd.type].ic, 'lock');
    return;
  }
  enterNode(+b.dataset.r, +b.dataset.i);
});

/* =====================================================================
   ENDE, PAUSE, LISTEN
   ===================================================================== */
function die(){
  k.over = true;
  render(); hud();
  log(T.msg.concat(`<b>${k.killer}</b> hat dich erwischt.`).join(' '));
  Sfx.death(); buzz([90, 50, 160]); quake(2); FX.death(k.pos);
  Music.stop();
  const res = settle(), run = k;
  kBusy = true;
  setTimeout(() => { if (k === run) kBusy = false; endSheet(res, run); }, wait(1300));
}
function win(){
  k.over = true; k.won = true;
  Sfx.victory(); FX.confetti(); MFX.confetti(); buzz([60, 40, 60, 40, 200]);
  Music.play('menu');
  const res = settle(), run = k;
  const abyss = k.world === 6;
  return banner(bannerEl(), { kind: 'win', ic: abyss ? 'namenlos' : k.hero, eyebrow: MODE_NAME[k.mode] + (k.asc ? ` · Aufstieg ${k.asc}` : '') + ' geschafft',
    title: abyss ? 'Der Namenlose ist besiegt!' : 'Der Drache ist besiegt!', sub: abyss ? 'Du hast die wahre Tiefe bezwungen.' : `${HEROES[k.hero].name} hat alle fünf Welten bezwungen.` }, 3000)
    .then(() => endSheet(res, run));
}
function endSheet(res, run){
  // Nur zeigen, wenn noch derselbe Lauf aktiv ist
  if ((run && k !== run) || (current !== 'kerker' && current !== 'kmap')) return;
  const won = k.won;
  const where = k.mode === 'end' ? `${k.rooms} Räume` : won ? (k.world === 6 ? 'Abgrund' : 'alle 5') : `Welt ${k.world}`;
  const tags = [];
  if (res.newBest && k.gold > 0) tags.push('Neuer Gold-Rekord');
  if (res.newDepth) tags.push('Neuer Tiefen-Rekord');
  if (res.daily && res.daily.newBest && res.daily.score > 0) tags.push('Tagesrekord');
  const text = won ? `${HEROES[k.hero].name} hat den Kerker bezwungen.`
    : k.quit ? 'Du hast den Lauf beendet.'
    : `${k.killer} hat dich erwischt.`;
  const bank = Math.round(k.gold * (1 + k.asc * .1));
  sheet(`${tags.map(t => `<span class="new">${t}</span>`).join('')}
    <h2>${won ? 'Sieg!' : k.quit ? 'Lauf beendet' : 'Gefallen'}</h2>
    <p>${text} <b>${bank}</b> Gold wandern in deinen Schatz${k.asc ? ` (inklusive ${k.asc * 10} % Aufstiegsbonus)` : ''}.</p>
    <div class="stats">
      <div class="stat"><span>Gold</span><b>${k.gold}</b></div>
      <div class="stat"><span>Erreicht</span><b>${where}</b></div>
      <div class="stat"><span>Stufe</span><b>${k.lvl}</b></div>
      <div class="stat"><span>Siege</span><b>${k.kills}</b></div>
      <div class="stat"><span>Räume</span><b>${k.rooms}</b></div>
      <div class="stat"><span>Relikte</span><b>${k.relics.length}</b></div>
    </div>
    ${res.daily ? `<p class="fine">Tagesgruft: <b>${res.daily.score}</b> Punkte (Gold, 10 pro Raum, 50 pro Boss, 200 für den Sieg). Heute bestes Ergebnis: <b>${D.kerker.daily.best}</b>.</p>` : ''}
    ${res.ascUp ? `<div class="unlock-line">${icon('star')}<span><b>Aufstieg ${D.kerker.ascMax} freigeschaltet!</b> ${ASC[D.kerker.ascMax]}</span></div>` : ''}
    ${(res.unlocked || []).map(id => `<div class="unlock-line">${icon(id)}<span><b>Neuer Held: ${HEROES[id].name}.</b> Wähle ${HERO_SHE[id] ? 'sie' : 'ihn'} im Menü.</span></div>`).join('')}
    <div class="row">
      <button type="button" class="btn" data-act="again">Nochmal</button>
      <button type="button" class="btn sec" data-act="menu">Zum Menü</button>
    </div>`,
    { again: () => { const m = k.mode, a = k.asc; startRun(m, a); }, menu: () => go('kmenu') });
}
function runListSheet(back){
  const perks = Object.keys(k.perks);
  sheet(`<h2>Dein Held</h2>
    <p>${HEROES[k.hero].name} · Stufe ${k.lvl} · ${k.kills} Siege · ${k.sigils.length}/3 Siegelsplitter</p>
    <h3>Relikte (${k.relics.length})</h3>
    ${k.relics.length ? `<ul class="list">${k.relics.map(id => `<li>${icon('r_' + id, 'r-' + id)}<div class="info"><b>${RELICS[id].name}${id === 'phoenix' && k.phoenixUsed ? ' (verbraucht)' : ''}</b><span>${RELICS[id].desc}</span></div></li>`).join('')}</ul>`
      : '<p class="fine">Noch keine. Relikte gibt es bei Elite-Gegnern, Bossen, Schreinen, Händlern und manchmal in Truhen.</p>'}
    <h3>Talente (${perks.length})</h3>
    ${perks.length ? `<ul class="list">${perks.map(id => `<li>${icon(PERKS[id].ic)}<div class="info"><b>${PERKS[id].name}${k.perks[id] > 1 ? ` ×${k.perks[id]}` : ''}</b><span>${PERKS[id].desc}</span></div></li>`).join('')}</ul>`
      : '<p class="fine">Noch keine. Bei jeder neuen Stufe wählst du eines.</p>'}
    <button type="button" class="btn sec" data-act="close">Schließen</button>`, { close: back || closeSheet }, back || closeSheet);
}
function pauseSheet(){
  if (!k || k.over) return;
  const where = k.mode === 'end' ? `Raum ${k.rooms + 1}` : `Welt ${k.world}`;
  sheet(`<h2>Pause</h2><p>${HEROES[k.hero].name} · ${MODE_NAME[k.mode]}${k.asc ? ` · Aufstieg ${k.asc}` : ''} · ${where} · <b>${k.gold}</b> Gold</p>
    <button type="button" class="btn" data-act="resume">Weiterspielen</button>
    <div class="row">
      <button type="button" class="btn sec" data-act="list">Relikte &amp; Talente</button>
      <button type="button" class="btn sec" data-act="howto">So geht’s</button>
    </div>
    <div class="row">
      <button type="button" class="btn sec" data-act="menu">Zum Menü</button>
      <button type="button" class="btn ghost" data-act="quit">Lauf beenden</button>
    </div>
    <p class="fine">Im Menü bleibt dein Lauf gespeichert. Beim Beenden kommt dein Gold in den Schatz.</p>`,
    {
      resume: closeSheet,
      list: () => runListSheet(pauseSheet),
      howto: () => howtoSheet(pauseSheet),
      menu: () => go('kmenu'),
      quit: () => sheet(`<h2>Lauf beenden?</h2><p>Du bekommst <b>${k.gold}</b> Gold für deinen Schatz. Der Lauf ist danach vorbei.</p>
          <div class="row"><button type="button" class="btn" data-act="yes">Beenden</button><button type="button" class="btn sec" data-act="no">Zurück</button></div>`,
          { yes: () => { k.quit = true; k.over = true; const res = settle(); Music.play('menu'); endSheet(res, k); }, no: pauseSheet }, pauseSheet)
    }, closeSheet);
}
function howtoSheet(then){
  const close = () => { closeSheet(); if (then) then(); };
  sheet(`<h2>So geht’s</h2>
    <div class="howto"><ol>
      <li>${icon('quest')}<p><b>Die Karte</b>Jede Welt ist ein Netz aus Räumen. Du wählst deinen Weg: Kämpfe, Elite-Gegner, Schatzkammern, Händler, Ereignisse und Rastplätze. Oben wartet der Boss.</p></li>
      <li>${icon('ritter')}<p><b>Wischen oder tippen</b>Dein Held zieht auf ein Nachbarfeld. Die Karten dahinter rücken nach, und am Ende kommt die Karte aus der Vorschau oben rechts herein. Plane damit voraus.</p></li>
      <li>${icon('skull')}<p><b>Monster</b>Die Zahl ist der Schaden. Mit einer Waffe fängt die Waffe ihn ab. Abzeichen zeigen Eigenschaften und Countdowns. Rot schraffierte Felder werden im nächsten Zug getroffen.</p></li>
      <li>${icon('sword')}<p><b>Waffen</b>Schwert, Dolch, Axt, Hammer und Bogen spielen sich unterschiedlich. Mit dem Bogen tippst du Monster zwei Felder entfernt an.</p></li>
      <li>${icon('stairs')}<p><b>Raumziel und Treppe</b>Erfüll das Ziel oben, dann kommt die Treppe. Bleibst du länger, wird die Gruft unruhig.</p></li>
      <li>${icon('bag')}<p><b>Tasche und Fähigkeit</b>Gegenstände und deine Heldenfähigkeit kosten keinen Zug. Tippe eine Karte lange an, um alles über sie zu erfahren.</p></li>
      <li>${icon('star')}<p><b>Stufen, Talente, Relikte</b>Siege geben Erfahrung. Jede Stufe bringt ein Talent, Bosse und Elite-Gegner bringen Relikte.</p></li>
      <li>${icon('sigil')}<p><b>Ein Geheimnis</b>In den Welten 2 bis 4 trägt der erste Elite-Gegner einen Siegelsplitter. Wer alle drei hat, findet hinter dem Drachen noch etwas.</p></li>
    </ol></div>
    <button type="button" class="btn" data-act="ok">Verstanden</button>`, { ok: close }, close);
}

/* =====================================================================
   KERKER-MENÜ
   ===================================================================== */
let ascSel = null;
function codexSheet(back){
  const cx = D.kerker.codex;
  const tile = (id, ic, name, desc, cls, icCls = '') => cx[id]
    ? `<div class="codex-tile ${cls}">${icon(ic, icCls)}<b>${name}</b><span>${desc}</span></div>`
    : `<div class="codex-tile">${icon(ic, 'unknown')}<b>???</b><span>Noch nicht entdeckt</span></div>`;
  const elites = Object.values(ELITES).flat();
  const cardIds = Object.keys(CARDS).filter(c => c !== 'weapon' && c !== 'item');
  const total = Object.keys(MONSTERS).length + elites.length + BOSS_IDS.length + WEAPON_IDS.length + cardIds.length + ITEM_IDS.length + RELIC_IDS.length;
  const ids = [...Object.keys(MONSTERS).map(m => 'm_' + m), ...elites.map(e => 'e_' + e.name), ...BOSS_IDS.map(b => 'b_' + b), ...WEAPON_IDS.map(w => 'w_' + w), ...cardIds.map(c => 'c_' + c), ...ITEM_IDS.map(i => 'i_' + i), ...RELIC_IDS.map(r => 'r_' + r)];
  const found = ids.filter(id => cx[id]).length;
  sheet(`<h2>Kompendium</h2><p>${found} von ${total} entdeckt.</p>
    <h3>Monster</h3><div class="codex">${Object.entries(MONSTERS).map(([id, m]) => tile('m_' + id, id, m.name, m.desc + (m.tr.length ? ' ' + m.tr.map(t => TRAITS[t].name).join(', ') + '.' : ''), 't-monster k-' + id)).join('')}</div>
    <h3>Elite-Gegner</h3><div class="codex">${elites.map(e => tile('e_' + e.name, e.kind, e.name, e.tr.map(t => TRAITS[t].name).join(' und ') + '.', 't-monster elite k-' + e.kind)).join('')}</div>
    <h3>Bosse</h3><div class="codex">${BOSS_IDS.map(id => tile('b_' + id, id, BOSSES[id].name, BOSSES[id].mech, 't-boss')).join('')}</div>
    <h3>Waffen</h3><div class="codex">${WEAPON_IDS.map(id => tile('w_' + id, WEAPONS[id].ic, WEAPONS[id].name, WEAPONS[id].desc, 't-weapon')).join('')}</div>
    <h3>Karten</h3><div class="codex">${cardIds.map(id => tile('c_' + id, CARDS[id].ic, CARDS[id].name, CARDS[id].desc, 't-' + id)).join('')}</div>
    <h3>Gegenstände</h3><div class="codex">${ITEM_IDS.map(id => tile('i_' + id, ITEMS[id].ic, ITEMS[id].name, ITEMS[id].desc, '')).join('')}</div>
    <h3>Relikte</h3><div class="codex">${RELIC_IDS.map(id => tile('r_' + id, 'r_' + id, RELICS[id].name, RELICS[id].desc, '', 'r-' + id)).join('')}</div>
    <button type="button" class="btn sec" data-act="back">Zurück</button>`, { back }, back);
}
function renderKMenu(){
  const kd = D.kerker;
  $('#kmSub').textContent = (EMB && EMB.name ? EMB.name + ' · ' : '') + `Schatz ${fmt(kd.bank)} Gold`;
  const run = kd.run, res = $('#kResume');
  if (run && !run.over && run.v === 2){
    const where = run.mode === 'end' ? `Raum ${run.rooms + 1}` : `Welt ${run.world}`;
    res.innerHTML = `<b>Lauf fortsetzen</b><span>${HEROES[run.hero].name} · ${MODE_NAME[run.mode]}${run.asc ? ` · Aufstieg ${run.asc}` : ''} · ${where} · Stufe ${run.lvl} · ${run.gold} Gold</span>`;
    res.hidden = false;
  } else res.hidden = true;
  $('#kHeroes').innerHTML = HERO_IDS.map(id => {
    const H = HEROES[id], locked = !kd.heroes[id];
    return `<button type="button" class="hero-tile ${locked ? 'locked' : ''}" role="radio" aria-checked="${kd.hero === id}" data-hero="${id}" aria-label="${H.name}${locked ? ', gesperrt' : ''}">
      <span class="portrait">${icon(id)}</span><b>${H.name}</b><small>${H.hp} Leben</small>${locked ? icon('lock', 'lock') : ''}</button>`;
  }).join('');
  const H = HEROES[kd.hero], A = ABILITIES[H.ability], locked = !kd.heroes[kd.hero];
  const wins = kd.winsBy[kd.hero] || 0;
  $('#kHeroInfo').innerHTML = `<p><b>${H.name}</b> · ${H.hp} Leben${H.armor ? `, ${H.armor} Rüstung` : ''}${H.weapon ? `, ${WEAPONS[H.weapon[0]].name} ${H.weapon[1]}` : ', ohne Waffe'}${wins ? ` · ${wins} ${plural(wins, 'Sieg', 'Siege')}` : ''}</p>
    <p><b>Passiv:</b> ${H.passive}</p>
    <p><b>${A.name}</b> (lädt in ${H.charge} Siegen): ${A.desc}</p>
    ${H.items.length ? `<p><b>Startet mit:</b> ${H.items.map(i => ITEMS[i].name).join(', ')}.</p>` : ''}
    ${locked ? `<p class="lockline">Freischalten: ${H.unlock}</p>` : ''}`;
  const today = todayKey(), dd = kd.daily, played = dd.key === today;
  const dh = HEROES[dailyHero()], dm = MODS[dailyMod()];
  const max = kd.ascMax || 0;
  if (ascSel == null) ascSel = max;
  ascSel = clamp(ascSel, 0, max);
  const bw = kd.bestWorld || 0;
  const advTxt = D.stats.kWins ? `${D.stats.kWins} ${plural(D.stats.kWins, 'Sieg', 'Siege')}.` : bw ? `Bisher bis Welt ${bw}.` : 'Dein erster Abstieg wartet.';
  $('#kModes').innerHTML = `
    <div class="mode-wrap">
      <button type="button" class="mode" data-mode="adv" ${locked ? 'aria-disabled="true"' : ''}><b>Abenteuer</b><span>5 Welten mit Karte, Bossen und Geheimnissen. ${advTxt}</span></button>
      ${max ? `<div class="asc">
        <button type="button" class="icon-btn" data-asc="-1" aria-label="Aufstieg senken" ${ascSel <= 0 ? 'disabled' : ''}>−</button>
        <div class="asc-txt"><b>${ascSel ? `Aufstieg ${ascSel}` : 'Normal'}</b><span>${ascSel ? `${ASC[ascSel]}` + (ascSel > 1 ? ` Dazu ${ascSel === 2 ? 'Stufe 1' : `die Stufen 1–${ascSel - 1}`}.` : '') + ` Schatz +${ascSel * 10} %.` : 'Ohne Aufstiegsstufe.'}</span></div>
        <button type="button" class="icon-btn" data-asc="1" aria-label="Aufstieg erhöhen" ${ascSel >= max ? 'disabled' : ''}>+</button>
      </div>` : ''}
    </div>
    <button type="button" class="mode alt" data-mode="end" ${locked ? 'aria-disabled="true"' : ''}><b>Endlose Gruft</b><span>Raum auf Raum, alle 10 ein Boss. Rekord: ${kd.bestDepth || 0} Räume.</span></button>
    <button type="button" class="mode daily" data-mode="daily">${played ? '' : '<span class="new-dot">Heute neu</span>'}<b>Tagesgruft</b>
      <span>Heute mit ${dh.name} · ${dm.name}: ${dm.desc}${played ? ` Dein Tagesrekord: ${dd.best}.` : ''}${dd.streak > 1 ? ` Serie: ${dd.streak} Tage.` : ''}</span></button>`;
}
$('#kHeroes').addEventListener('click', e => {
  const b = e.target.closest('[data-hero]');
  if (!b) return;
  const id = b.dataset.hero;
  if (!D.kerker.heroes[id]) Sfx.lock(); else Sfx.ui();
  D.kerker.hero = id; save();
  renderKMenu();
});
$('#kModes').addEventListener('click', e => {
  const a = e.target.closest('[data-asc]');
  if (a){ ascSel = clamp((ascSel || 0) + +a.dataset.asc, 0, D.kerker.ascMax || 0); Sfx.ui(); renderKMenu(); return; }
  const b = e.target.closest('[data-mode]');
  if (!b) return;
  const mode = b.dataset.mode;
  if (mode !== 'daily' && !D.kerker.heroes[D.kerker.hero]){
    Sfx.lock();
    toast(`${HEROES[D.kerker.hero].name} ist noch gesperrt`, HEROES[D.kerker.hero].unlock, 'lock', null);
    return;
  }
  Sfx.ui();
  const run = D.kerker.run, asc = mode === 'adv' ? (ascSel || 0) : 0;
  if (run && !run.over){
    sheet(`<h2>Neuen Lauf starten?</h2><p>Dein aktueller Lauf endet dann. Seine <b>${run.gold}</b> Gold kommen in den Schatz.</p>
      <div class="row"><button type="button" class="btn" data-act="yes">Neu starten</button><button type="button" class="btn sec" data-act="no">Abbrechen</button></div>`,
      { yes: () => startRun(mode, asc), no: closeSheet }, closeSheet);
    return;
  }
  startRun(mode, asc);
});
$('#kResume').addEventListener('click', () => {
  Sfx.ui();
  k = D.kerker.run;
  if (!k) return;
  if (k.room) go('kerker'); else go('kmap');
});
$('#kmUpgrades').addEventListener('click', () => { Sfx.ui(); openShop('kerker', () => { closeSheet(); renderKMenu(); }); });
$('#kmCodex').addEventListener('click', () => { Sfx.ui(); codexSheet(closeSheet); });
$('#kmHelp').addEventListener('click', () => { Sfx.ui(); howtoSheet(null); });

/* =====================================================================
   BILDSCHIRME
   ===================================================================== */
function leaveRun(){
  if (!flowNav){ flowToken++; kFlow = false; }
  kBusy = false;
  if (k && !k.over) saveRun();
}
SCREENS.kmenu = {
  enter(){
    const run = D.kerker.run;
    if (run && run.v !== 2 && !run.over){ settleAbandon(run); save(); }
    if (k && k.over) k = null;
    renderKMenu(); Music.play('menu');
  },
  restyle(){ renderKMenu(); }
};
SCREENS.kmap = {
  enter(){
    if (!k) k = D.kerker.run;
    if (!k || !k.map){ setTimeout(() => go('kmenu'), 0); return; }
    renderMap();
    requestAnimationFrame(() => MFX.resize());
    if (!flowNav) Music.play('gruft');
    if (k.mapIntro !== k.world && !kFlow){
      kBusy = true;
      showWorldIntro().then(() => {
        kBusy = false;
        if (!D.tips.map){ D.tips.map = 1; save(); howtoSheet(() => { if (k.pq.length) flow(); }); }
        else if (k.pq.length) flow();
      });
    } else if (k.pq.length && !kFlow) flow();
  },
  leave(){ leaveRun(); },
  restyle(){ renderMap(); }
};
SCREENS.kerker = {
  enter(){
    if (!k) k = D.kerker.run;
    if (!k || !k.room){ setTimeout(() => go(k && k.map ? 'kmap' : 'kmenu'), 0); return; }
    k.targeting = null;
    board.innerHTML = ''; nodes.clear();
    hideTip(); hideInfo(); kBannerEl.hidden = true;
    T = { kills: 0, msg: [], hurt: 0 };
    render(true); hud();
    $('#kLog').innerHTML = k.lastLog || '';
    requestAnimationFrame(() => FX.resize());
    Music.play(k.room.type === 'boss' ? 'boss' : 'gruft');
    if (k.room.intro){
      k.room.intro = false; saveRun();
      kBusy = true;
      const r = k.room, bossC = k.grid.find(c => c.type === 'boss');
      const opts = r.type === 'boss'
        ? { kind: 'boss', ic: bossC.boss, eyebrow: k.mode === 'end' ? `Raum ${k.rooms + 1} · Boss` : `Welt ${k.world} · Boss`, title: BOSSES[bossC.boss].name, sub: BOSSES[bossC.boss].mech }
        : { ic: ROOMS[r.type].ic, eyebrow: k.mode === 'end' ? `Endlose Gruft · Raum ${k.rooms + 1}` : ROOMS[r.type].name, title: r.type === 'elite' ? r.goal.name : goalText(), sub: r.type === 'elite' ? 'Stark, mit zwei Eigenschaften. Lohn: ein Relikt.' : r.type === 'schatz' ? 'Irgendwo ist der Schlüssel. Pass auf die Truhen auf.' : 'Danach erscheint die Treppe.' };
      if (r.type === 'boss'){ Sfx.boss(); buzz([80, 40, 80]); }
      banner(kBannerEl, opts, r.type === 'boss' ? 2400 : 1500).then(() => {
        kBusy = false;
        tipFor('goal'); tipFor('next');
        if (k.pq.length) flow(); else showTips();
      });
    } else if (k.pq.length) flow();
    else showTips();
  },
  leave(){
    leaveRun();
    if (k) k.targeting = null;
    hideTip(); hideInfo(); FX.clear();
    if (heartTimer){ clearInterval(heartTimer); heartTimer = 0; }
    kScreen.classList.remove('danger');
  },
  restyle(){ if (k && k.room){ render(); hud(); } }
};

/* =====================================================================
   EINGABE
   ===================================================================== */
let swipe = null;
board.addEventListener('pointerdown', e => {
  swipe = { x: e.clientX, y: e.clientY, id: e.pointerId, target: e.target, long: false };
  const s = swipe;
  s.timer = setTimeout(() => {
    const el = s.target.closest && s.target.closest('.card');
    if (!el || !k || swipe !== s) return;
    s.long = true;
    showInfo(k.grid[+el.dataset.i]);
    buzz(10);
  }, 450);
});
board.addEventListener('pointermove', e => {
  if (swipe && e.pointerId === swipe.id && Math.hypot(e.clientX - swipe.x, e.clientY - swipe.y) > 12) clearTimeout(swipe.timer);
});
window.addEventListener('pointerup', e => {
  if (!swipe || e.pointerId !== swipe.id) return;
  const s = swipe;
  swipe = null;
  clearTimeout(s.timer);
  if (s.long || !k || current !== 'kerker' || kBusy || kFlow || sheetOpen() || !k.room) return;
  const dx = e.clientX - s.x, dy = e.clientY - s.y;
  hideInfo();
  if (Math.hypot(dx, dy) > 24 && !k.targeting){
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    return;
  }
  const el = s.target.closest && s.target.closest('.card');
  if (!el || el.classList.contains('gone')) return;
  const i = +el.dataset.i, c = k.grid[i];
  if (k.targeting){
    if (i === k.pos){ setTargeting(null); log('Abgebrochen.'); return; }
    if (!isTarget(c, i)){ Sfx.bump(); return; }
    if (k.targeting.kind === 'ability') useAbility(i); else applyItem(k.targeting.idx, i);
    return;
  }
  if (i === k.pos){ showInfo(c); return; }
  if (adjacent(i, k.pos)){
    const hc = colOf(k.pos), hr = rowOf(k.pos);
    move(colOf(i) > hc ? 'right' : colOf(i) < hc ? 'left' : rowOf(i) > hr ? 'down' : 'up');
    return;
  }
  if (canShoot() && twoAway(i, k.pos) && (c.type === 'monster' || c.type === 'boss')){ shoot(i); return; }
  showInfo(c);
});
window.addEventListener('pointercancel', () => { if (swipe) clearTimeout(swipe.timer); swipe = null; });
$('#kAbility').addEventListener('click', () => { hideInfo(); abilityPress(); });
$('#kItems').addEventListener('click', e => { const b = e.target.closest('[data-item]'); if (!b) return; hideInfo(); itemPress(+b.dataset.item); });
$('#kItems').addEventListener('contextmenu', e => e.preventDefault());
$('#kNext').addEventListener('click', e => { const b = e.target.closest('[data-q]'); if (!b || !k) return; showInfo(k.queue[+b.dataset.q]); });
$('#kRelics').addEventListener('click', () => { if (!k || k.over || kBusy || kFlow) return; Sfx.ui(); runListSheet(); });
$('#kPause').addEventListener('click', () => { if (!k || kBusy || kFlow) return; Sfx.ui(); pauseSheet(); });
$('#kmapPause').addEventListener('click', () => { if (!k || kBusy || kFlow) return; Sfx.ui(); pauseSheet(); });
window.addEventListener('resize', () => { if (current === 'kerker') FX.resize(); if (current === 'kmap') MFX.resize(); });
