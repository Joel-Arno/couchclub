/* =====================================================================
   ABLAUF: Titel, Geschichte, Leuchtfeuer, Kämpfe, Anzeige
   ===================================================================== */
LOOK.leer = Object.assign({}, LOOK.kron, { off: null });
S.tut = S.tut || {};

function newGame(){
  return { herk: null, lvl: 1, vit: 0, aus: 0, str: 0, glut: 0, drop: null, feuer: 'strand', lit: {}, hp: null, fp: null,
    flasks: 3, flasksMax: 3, deaths: 0, won: {}, t0: Date.now(), parries: 0, perfect: 0, fights: 0, sys: {}, farm: false };
}
const G = newGame();
const lvlCost = () => Math.round(100 * Math.pow(1.32, G.lvl - 1) / 10) * 10;
const SYS_NAME = { echt: 'Reaktion', runde: 'Runden' };
const SYS_LONG = { echt: 'Reaktionskampf', runde: 'Rundenkampf' };

/* ---------- Bildschirme ---------- */
const SCREENS = ['title', 'story', 'fire', 'fight', 'bilanz'];
let cur = 'title';
function show(id){
  SCREENS.forEach(s => { $('#' + s).hidden = s !== id; }); cur = id;
  World.setCam(id === 'story' || id === 'fire' || id === 'bilanz' ? .15 : 0);
}
function el(tag, cls, html){ const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- Leinwand und Bildschleife ---------- */
const cv = $('#stage'), ctx = cv.getContext('2d');
let wt = 0, last = performance.now();
function resize(){
  const r = Math.min(2, window.devicePixelRatio || 1), b = $('#app').getBoundingClientRect();
  const w = Math.max(1, Math.round(b.width)), h = Math.max(1, Math.round(b.height));
  cv.width = Math.round(w * r); cv.height = Math.round(h * r);
  ctx.setTransform(r, 0, 0, r, 0, 0);
  World.resize(w, h, r); Stage.place();
}
function frame(now){
  const dt = Math.min(50, now - last); last = now; wt += dt;
  if (Fight.on()) Fight.update(dt);
  else {
    if (Stage.P) updateActor(Stage.P, dt);
    if (Stage.E && Stage.showE) updateActor(Stage.E, dt);
  }
  World.updateFx(dt);
  draw(dt);
  if (cur === 'fight' && Fight.pl()) hud(dt);
  requestAnimationFrame(frame);
}
function draw(dt){
  const [W, Hh] = World.size();
  ctx.clearRect(0, 0, W, Hh);
  ctx.save();
  const [sx, sy] = World.camShake(); ctx.translate(sx, sy - World.camY());
  World.drawBack(ctx, wt);
  // Verlorene Glut am Boden
  if (G.drop && Fight.on() && G.drop.at === Fight.key() && Stage.P){
    const x = Stage.P.x - Stage.P.H * .55, y = Stage.P.gy - 3, r = Stage.P.H * .22 * (1 + Math.sin(wt * .004) * .1);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,190,120,.8)'); g.addColorStop(1, 'rgba(227,120,50,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r, r * .45, 0, 0, TAU); ctx.fill(); ctx.restore();
  }
  World.drawGhosts(ctx);
  if (Stage.E && Stage.showE) drawActor(ctx, Stage.E);
  if (Stage.P && Stage.showP) drawActor(ctx, Stage.P);
  Fight.drawFx(ctx);
  World.drawFront(ctx, wt, dt);
  ctx.restore();
  World.drawOver(ctx);
}

/* ---------- Blatt, Banner, Hinweise ---------- */
let sheetClose = null, sheetOn = null;
function sheet(html, o = {}){
  const s = $('#sheet');
  s.innerHTML = html; $('#sheetBack').hidden = false;
  sheetClose = o.onClose || null; sheetOn = o.on || null;
  const f = s.querySelector('button'); if (f) setTimeout(() => f.focus({ preventScroll: true }), 30);
}
function closeSheet(run = true){
  $('#sheetBack').hidden = true;
  const f = sheetClose; sheetClose = null; sheetOn = null;
  if (run && f) f();
}
$('#sheetBack').addEventListener('click', e => {
  if (e.target === $('#sheetBack')) { Snd.play('ui'); closeSheet(); return; }
  const b = e.target.closest('[data-a]');
  if (b && !b.disabled && sheetOn){ Snd.play('ui'); sheetOn(b.dataset.a, b); }
});
function banner(text, cls, sub = '', ms = 3400){
  return new Promise(res => {
    const b = $('#banner');
    b.className = 'banner ' + cls; $('#bannerT').textContent = text; $('#bannerS').textContent = sub;
    b.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => b.classList.add('in')));
    setTimeout(() => { b.classList.remove('in'); setTimeout(() => { b.hidden = true; res(); }, 1100); }, ms);
  });
}
let toastT = 0;
function toast(t, ms = 1800){
  const e = $('#toast'); e.textContent = t; e.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { e.hidden = true; }, ms);
}
let wl = null;
async function wake(on){
  try {
    if (on && !wl && navigator.wakeLock) wl = await navigator.wakeLock.request('screen');
    else if (!on && wl){ const w = wl; wl = null; await w.release(); }
  } catch (e) { wl = null; }
}

/* ---------- Titel ---------- */
function titleScreen(){
  Fight.stop(); wake(false); Voice.stop();
  show('title'); World.set('strand'); World.reset();
  Stage.showE = false; Stage.showP = false;
  syncSys(); syncSound();
  if (Snd.ac()) Music.play('amb');
}
function syncSys(){ ['echt', 'runde'].forEach(k => $('#sys' + (k === 'echt' ? 'Echt' : 'Runde')).setAttribute('aria-checked', String(S.sys === k))); }
const hasVoices = () => Object.keys(STIMMEN).length > 0;
function syncSound(){
  $('#btnSound').textContent = 'Ton: ' + (S.sound ? 'an' : 'aus');
  $('#btnVoice').textContent = 'Stimme: ' + (S.voice ? 'an' : 'aus'); $('#btnVoice').hidden = !hasVoices();
}
$$('.sys').forEach(b => b.addEventListener('click', () => { Snd.init(); Snd.play('ui'); S.sys = b.dataset.sys; saveSettings(); syncSys(); }));
$('#btnSound').addEventListener('click', () => {
  Snd.init(); S.sound = !S.sound; saveSettings(); Snd.setOn(S.sound); syncSound(); if (!S.sound) Voice.stop();
  if (S.sound && !Music.mode()) Music.play('amb');
});
$('#btnVoice').addEventListener('click', () => {
  Snd.init(); S.voice = !S.voice; saveSettings(); syncSound(); if (!S.voice) Voice.stop();
});
$('#btnStart').addEventListener('click', () => {
  Snd.init(); Snd.play('choice');
  Object.assign(G, newGame());
  Stage.hero('kron'); Stage.P.look = LOOK.leer; Stage.P.hideW = true;
  scene('erwachen');
});
$('#btnBoss').addEventListener('click', () => {
  Snd.init(); Snd.play('ui');
  sheet(`<h3>Wer bist du?</h3><p>Für den direkten Weg bekommst du drei Stufen geschenkt.</p>
    ${Object.entries(HERK).map(([k, h]) => `<button type="button" class="row" data-a="${k}"><span><b>${h.name}</b><small>${h.weapon}. ${h.blurb}</small></span></button>`).join('')}
    <button type="button" class="btn ghost" data-a="x">Zurück</button>`, {
    on(a){
      if (a === 'x') return closeSheet();
      Object.assign(G, newGame());
      Object.assign(G, { herk: a, lvl: 4, vit: 1, aus: 1, str: 1, won: { ertrunkener: true, knecht: true }, lit: { strand: true } });
      Stage.hero(a);
      closeSheet();
      bonfire('mole', 'visit');
    }
  });
});

/* ---------- Geschichte ---------- */
let sceneTok = 0, sceneT = 0;
function scene(key){
  const sc = SZENEN[key], tok = ++sceneTok;
  Fight.stop(); wake(false);
  show('story'); World.set(sc.welt); Music.play('amb');
  if (sc.welt !== 'arena' && sc.welt !== 'ende') World.reset();
  if (sc.welt === 'ende'){ World.setFlood(.6); World.setTint(0); }
  const P = Stage.P;
  Stage.showP = true; P.alpha = 1;
  if (sc.held){
    P.stance = sc.held;
    if (key === 'erwachen'){ P.pose = mkPose({}, SETS[P.set].lie); P.anim = null; }
  } else if (P.stance === 'kneel' || P.stance === 'lie' || P.stance === 'dead'){
    const from = SETS[P.set][P.stance]; P.stance = null;
    playAnim(P, [[0, from], [500, SETS[P.set].kneel], [1100, SETS[P.set].idle]]);
  } else P.stance = null;
  if (sc.feind){
    const E = Stage.foe(sc.feind);
    if (sc.feindPose){ E.stance = sc.feindPose; E.pose = mkPose({}, SETS[E.set][sc.feindPose]); }
  } else Stage.showE = false;

  $('#stPlace').textContent = sc.ort;
  const box = $('#stText'), ch = $('#stChoices');
  box.innerHTML = ''; ch.innerHTML = '';
  const paras = sc.text.map(t => { const p = el('p'); p.textContent = t; box.appendChild(p); return p; });
  Voice.warm(sc.text.map((t, j) => key + '.' + j));
  let i = 0, done = false;
  // Mit Stimme erscheint der nächste Absatz, wenn der vorige gesprochen ist
  const reveal = () => {
    if (tok !== sceneTok || done) return;
    if (i < paras.length){
      const id = key + '.' + i;
      paras[i].classList.add('in'); onPara(key, i); i++;
      if (Voice.ok(id)) Voice.say(id).then(() => { if (tok === sceneTok && !done) sceneT = setTimeout(reveal, 450); });
      else sceneT = setTimeout(reveal, 1500);
    } else { done = true; choices(key, sc); }
  };
  clearTimeout(sceneT); sceneT = setTimeout(reveal, 450);
  $('#stPanel').onpointerdown = () => {
    if (done || tok !== sceneTok) return;
    clearTimeout(sceneT); Voice.stop();
    while (i < paras.length){ paras[i].classList.add('in'); onPara(key, i); i++; }
    done = true; choices(key, sc);
  };
}
function onPara(key, i){
  if (key === 'erwachen' && i === 2) Snd.play('heart');
  if (key === 'wrack' && i === 1 && Stage.E){
    const E = Stage.E, S2 = SETS[E.set];
    E.stance = null; playAnim(E, [[0, S2.lie], [700, S2.kneel, EASE.io], [1500, S2.idle, EASE.io]]);
    Snd.play('rise');
  }
}
function choices(key, sc){
  const ch = $('#stChoices');
  const list = sc.wahl === 'herkunft'
    ? Object.entries(HERK).map(([k, h]) => ({ t: h.item, sub: `${h.name}. ${h.blurb}`, herk: k }))
    : sc.wahl;
  list.forEach((w, j) => {
    const b = el('button', 'choice' + (j === 0 ? ' main' : ''), `<b>${esc(w.t)}</b>${w.sub ? `<small>${esc(w.sub)}</small>` : ''}`);
    b.type = 'button';
    b.addEventListener('click', () => choose(w));
    ch.appendChild(b);
    setTimeout(() => b.classList.add('in'), 60 + j * 140);
  });
}
function choose(w){
  Snd.play('choice'); Voice.stop();
  if (w.herk){
    G.herk = w.herk;
    const old = Stage.P, P = Stage.hero(w.herk);
    P.pose = old.pose; P.t = old.t;
    playAnim(P, [[0, SETS[P.set].kneel], [300, SETS[P.set].kneel], [1100, SETS[P.set].idle, EASE.io]]);
    Snd.play('rise');
    $('#stChoices').innerHTML = '';
    const p = el('p', 'in'); p.textContent = HERK[w.herk].rise;
    $('#stText').appendChild(p);
    const tok = sceneTok, t0 = performance.now();
    Voice.say('herk.' + w.herk).then(() => {
      setTimeout(() => { if (tok === sceneTok) scene('wrack'); }, Math.max(500, 2400 - (performance.now() - t0)));
    });
    return;
  }
  if (w.go === 'herkunft'){
    const P = Stage.P;
    playAnim(P, [[0, SETS[P.set].lie], [900, SETS[P.set].kneel, EASE.io]]);
    P.stance = 'kneel'; Snd.play('rise');
    setTimeout(() => scene('herkunft'), 700);
    return;
  }
  if (w.go === 'bilanz') return bilanz();
  if (w.go) return scene(w.go);
  if (w.kampf) return fight(w.kampf);
  if (w.feuer) return bonfire(w.feuer);
}

/* ---------- Leuchtfeuer ---------- */
function bonfire(key, how = 'visit', lost = null){
  const F = FEUER[key];
  Fight.stop(); wake(false); clearTimeout(sceneT); sceneTok++;
  G.feuer = key;
  show('fire'); World.set(F.welt); World.reset(); Music.play('amb');
  Stage.showE = false; Stage.showP = true;
  const P = Stage.P; P.alpha = 1; P.hideW = false; P.glow = 0;
  if (how === 'death'){ P.stance = null; P.pose = mkPose({}, SETS[P.set].lie); playAnim(P, [[0, SETS[P.set].lie], [900, SETS[P.set].lie], [1700, SETS[P.set].kneel, EASE.io], [2500, SETS[P.set].idle, EASE.io]]); }
  else { P.stance = null; }
  const first = !G.lit[key];
  G.lit[key] = true;
  // Rasten füllt alles auf
  G.hp = null; G.fp = null; G.flasks = G.flasksMax;
  const lines = [];
  let voice = '';
  if (how === 'death'){
    lines.push(SAETZE['feuer.tod']); voice = 'feuer.tod';
    if (lost) lines.push(`Die Glut, die noch am Boden lag (${fmt(lost.n)}), ist erloschen.`);
    if (G.drop) lines.push(`Deine Glut (${fmt(G.drop.n)}) liegt noch dort, wo du gefallen bist. Hol sie dir zurück, bevor du noch einmal stirbst.`);
  } else if (first){
    lines.push(F.erst); voice = 'feuer.' + key;
    lines.push({ note: 'Am Leuchtfeuer rastest du: Leben, Fokus und Phiolen füllen sich wieder. Dafür stehen auch die Toten wieder auf.' });
    Snd.play('fire');
    banner('Leuchtfeuer entfacht', 'fire', '', 2400);
  } else {
    lines.push(SAETZE['feuer.rast']); voice = 'feuer.rast';
  }
  $('#fPlace').textContent = F.name;
  const box = $('#fText'); box.innerHTML = '';
  lines.forEach((l, i) => {
    const p = el('p', typeof l === 'object' ? 'note' : ''); p.textContent = typeof l === 'object' ? l.note : l;
    box.appendChild(p); setTimeout(() => p.classList.add('in'), 200 + i * 500);
  });
  renderFire();
  Voice.stop();
  if (voice) setTimeout(() => { if (cur === 'fire' && G.feuer === key) Voice.say(voice); }, how === 'death' ? 1400 : 600);
}
function renderFire(){
  const F = FEUER[G.feuer], h = HERK[G.herk];
  $('#fStats').innerHTML = [
    ['Stufe', G.lvl], ['Glut', fmt(G.glut)], ['Leben', h.hp + G.vit * 12], ['Phiolen', G.flasks]
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  const cost = lvlCost();
  const weiter = G.feuer === 'strand' && G.won.knecht ? { t: 'Zur Mole gehen', feuer: 'mole' } : F.weiter;
  const list = [
    { t: weiter.t, sub: '', fn: () => weiter.feuer ? bonfire(weiter.feuer) : scene(weiter.go), main: true },
    { t: 'Aufsteigen', sub: `Stufe ${G.lvl + 1} kostet ${fmt(cost)} Glut`, fn: levelSheet, off: G.glut < cost },
    { t: `Kampfsystem: ${SYS_NAME[S.sys]}`, sub: `Wechseln zu ${SYS_NAME[S.sys === 'echt' ? 'runde' : 'echt']}`, fn: () => { S.sys = S.sys === 'echt' ? 'runde' : 'echt'; saveSettings(); toast('Kampfsystem: ' + SYS_NAME[S.sys]); renderFire(); } }
  ];
  if (G.feuer === 'strand' && G.won.ertrunkener) list.push({ t: 'Den Strand absuchen', sub: 'Ein Ertrunkener, für mehr Glut', fn: () => { G.farm = true; fight('ertrunkener'); } });
  const ch = $('#fChoices'); ch.innerHTML = '';
  list.forEach((w, j) => {
    const b = el('button', 'choice in' + (w.main ? ' main' : ''), `<b>${esc(w.t)}</b>${w.sub ? `<small>${esc(w.sub)}</small>` : ''}`);
    b.type = 'button'; b.disabled = !!w.off;
    b.addEventListener('click', () => { Snd.play('choice'); w.fn(); });
    ch.appendChild(b);
  });
}
function levelSheet(){
  const cost = lvlCost();
  const rows = [
    ['vit', 'Vitalität', '+12 Leben'],
    ['aus', 'Ausdauer', '+10 Ausdauer, im Rundenkampf +2 Schutz pro Blocken'],
    ['str', 'Stärke', '+8 % Schaden mit jeder Waffe']
  ];
  sheet(`<h3>Aufsteigen</h3><p>Stufe ${G.lvl} auf ${G.lvl + 1} kostet ${fmt(cost)} Glut. Du trägst ${fmt(G.glut)} bei dir.</p>
    ${rows.map(([k, n, d]) => `<button type="button" class="row" data-a="${k}"${G.glut < cost ? ' disabled' : ''}><span><b>${n}</b><small>${d}</small></span><span class="val">${G[k]}</span></button>`).join('')}
    <button type="button" class="btn ghost" data-a="x">Zurück</button>`, {
    on(a){
      if (a === 'x') return closeSheet();
      if (G.glut < cost) return;
      G.glut -= cost; G.lvl++; G[a]++;
      Snd.play('fire'); World.burst(Stage.P.x, Stage.P.gy - Stage.P.H * .6, 'ember', 30);
      closeSheet(); renderFire(); toast(`Stufe ${G.lvl}`);
    }
  });
}

/* ---------- Kampf ---------- */
const ICON = {
  atk: '<path d="M5 19l3.2-3.2M6.8 13.8l3.4 3.4M9.3 14.7L19 5V4h-1L8.3 13.7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
  dodge: '<path d="M12 6l-6 6 6 6M19 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  block: '<path d="M12 3l7 3v5.2c0 4.6-3.2 7.9-7 9.8-3.8-1.9-7-5.2-7-9.8V6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  art: '<path d="M12 3v5M12 16v5M3 12h5M16 12h5M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M17.7 6.3l-2.5 2.5M8.8 15.2l-2.5 2.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  eye: '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/>',
  clock: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  crit: '<path d="M12 3v12M8.5 11.5L12 15l3.5-3.5M6 20h12" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>'
};
const ico = k => `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">${ICON[k]}</svg>`;

function tutorial(mode, then){
  const R = mode === 'echt' ? [
    ['atk', '<b>Angriff</b> antippen, mehrmals für eine Folge. <b>Schwer</b> halten und loslassen. Lange halten lädt den Schlag auf.'],
    ['dodge', '<b>Ausweichen</b> macht dich kurz unverwundbar. Direkt vor dem Treffer ist es perfekt und bremst die Zeit.'],
    ['block', '<b>Blocken</b> halten fängt Schaden ab und kostet Ausdauer. Kurz vor dem Treffer drücken heißt <b>parieren</b>: kein Schaden, und der Gegner verliert Haltung.'],
    ['eye', 'Das Aufblitzen an der Waffe verrät den Angriff: <b class="k-p">Gold</b> lässt sich parieren, <b class="k-b">Weiß</b> nur blocken, <b class="k-u">Rot</b> nur ausweichen.'],
    ['clock', 'Der <b>Zeitring</b> schrumpft bis zum Moment des Treffers. Du kannst ihn im Pausenmenü abschalten.'],
    ['crit', 'Ist die goldene <b>Haltung</b> leer, taumelt der Gegner. Dann trifft ein <b>Todesstoß</b> mit Angriff besonders hart.']
  ] : [
    ['eye', 'Über dem Gegner steht seine <b>Absicht</b> für die nächste Runde, mit Schaden pro Treffer.'],
    ['atk', 'Jede Runde hast du <b>4 Ausdauerpunkte</b>. Angriff kostet 1, Schwer kostet 2 und bricht mehr Haltung.'],
    ['block', '<b>Blocken</b> (1) gibt Schutz gegen <b class="k-p">goldene</b> und <b class="k-b">weiße</b> Treffer. <b>Parade</b> (2) fängt den ersten goldenen Treffer ganz ab und kostet den Gegner Haltung. <b>Ausweichen</b> (2) entgeht einem Treffer, auch einem <b class="k-u">roten</b>.'],
    ['clock', 'Mit <b>Zug beenden</b> führt der Gegner seine Absicht aus. Danach bist du wieder dran.'],
    ['crit', 'Ist die goldene <b>Haltung</b> leer, taumelt er eine Runde. Dann trifft der <b>Todesstoß</b> besonders hart.']
  ];
  const keys = mode === 'echt' ? '<p class="keys">Tastatur: Leertaste Angriff, H Schwer, K Ausweichen, L Blocken, U Kunst, E Phiole, Esc Pause. Auf dem Bild: tippen greift an, wischen weicht aus.</p>' : '<p class="keys">Tastatur: Eingabetaste beendet den Zug.</p>';
  S.tut[mode] = true; saveSettings();
  sheet(`<h3>${mode === 'echt' ? 'Reaktionskampf' : 'Rundenkampf'}</h3>
    <ul class="rules">${R.map(([i, t]) => `<li><i>${ico(i)}</i><span>${t}</span></li>`).join('')}</ul>${keys}
    <button type="button" class="btn primary" data-a="go">Verstanden</button>`, { onClose: then, on: () => closeSheet() });
}

let fightKey = '';
function fight(key){
  const mode = S.sys;
  const go = () => {
    fightKey = key; Voice.stop();
    clearTimeout(sceneT); sceneTok++;
    show('fight'); setupHud(key, mode);
    World.set(key === 'vogt' ? 'arena' : key === 'knecht' ? 'tor' : 'strand'); World.reset();
    Music.play(FEINDE[key].boss ? 'boss' : 'kampf');
    Stage.showP = true; Stage.P.alpha = 1;
    Fight.start({ foe: key, mode, herk: G.herk, stats: G, onEnd: (r, o) => fightEnd(key, r, o) });
    G.fights++; G.sys[mode] = true;
    wake(true);
    if (FEINDE[key].boss){
      Fight.en().next = 3600;
      Voice.warm([key + '.intro', key + '.line2']);
      banner(FEINDE[key].name, 'boss', FEINDE[key].title, 2200).then(() => { if (fightKey === key && Fight.on()) Fight.hook.line(FEINDE[key].intro, 4200, key + '.intro'); });
    }
    if (G.drop && G.drop.at === key) toast(`Deine Glut liegt hier: ${fmt(G.drop.n)}`, 2600);
  };
  if (!S.tut[mode]) tutorial(mode, go); else go();
}
function fightEnd(key, r, o){
  G.hp = o.hp; G.fp = o.fp; G.flasks = o.flasks;
  G.parries += o.stats.parries; G.perfect += o.stats.perfect;
  wake(false);
  const E = Stage.E;
  if (r === 'dead'){
    G.deaths++;
    const lost = G.drop;
    G.drop = G.glut > 0 ? { at: key, n: G.glut } : null;
    G.glut = 0; G.farm = false;
    Fight.stop(); Music.stop(2.5);
    banner('Ertrunken', 'dead', '', 3000).then(() => bonfire(G.feuer, 'death', lost));
    return;
  }
  const gain = FEINDE[key].glut;
  let back = 0;
  G.glut += gain;
  if (G.drop && G.drop.at === key){ back = G.drop.n; G.glut += back; G.drop = null; }
  G.won[key] = true;
  fadeOut(E, 1400);
  if (FEINDE[key].boss){
    Fight.stop(); Music.stop(3);
    banner('Bezwungen', 'win', 'Nachhall des Strandvogts erhalten', 4200).then(() => scene('ende'));
    return;
  }
  Fight.stop();
  toast(`+${fmt(gain)} Glut` + (back ? ` · ${fmt(back)} zurückgeholt` : ''), 2200);
  $('#glutN').textContent = fmt(G.glut);
  setTimeout(() => {
    if (G.farm){ G.farm = false; bonfire(G.feuer, 'visit'); }
    else scene(key === 'ertrunkener' ? 'nachwrack' : 'nachtor');
  }, 1300);
}
function fadeOut(a, ms){
  const t0 = performance.now();
  const step = now => { const k = Math.min(1, (now - t0) / ms); a.alpha = 1 - k; if (k < 1) requestAnimationFrame(step); };
  setTimeout(() => requestAnimationFrame(step), 1100);
}

/* ---------- Anzeige im Kampf ---------- */
const hudEl = {};
let lagFoe = 1, lagP = 1, lastHpN = '', lastFlask = -1;
function setupHud(key, mode){
  const d = FEINDE[key], h = HERK[G.herk];
  $('#foeName').textContent = d.name; $('#foeTitle').textContent = d.title || '';
  $('#rtc').hidden = mode !== 'echt'; $('#tbc').hidden = mode !== 'runde'; $('#pStRow').hidden = mode !== 'echt';
  $('#fTouch').hidden = mode !== 'echt'; $('#apPips').hidden = mode !== 'runde';
  $('#intent').hidden = true;
  $('#artLbl').textContent = h.art.name;
  $('#glutN').textContent = fmt(G.glut);
  ['foeHp', 'foeLag', 'foePz', 'pHp', 'pLag', 'pSt', 'pFp', 'pHpN', 'flaskN', 'stance', 'intent', 'atkLbl', 'apPips'].forEach(k => { hudEl[k] = $('#' + k); });
  hudEl.cb = {}; $$('#rtc .cb').forEach(b => { hudEl.cb[b.dataset.k] = b; });
  lagFoe = 1; lagP = 1; lastHpN = ''; lastFlask = -1;
  if (mode === 'runde') buildTb();
}
const TBB = [
  ['atk', 'Angriff'], ['heavy', 'Schwer'], ['art', ''],
  ['block', 'Blocken'], ['parry', 'Parade'], ['dodge', 'Ausweichen'],
  ['flask', 'Phiole'], ['crit', 'Todesstoß']
];
function buildTb(){
  const g = $('#tbGrid'); g.innerHTML = '';
  hudEl.tb = {};
  TBB.forEach(([k, n]) => {
    const b = el('button', 'tb' + (k === 'crit' ? ' crit' : ''));
    b.type = 'button'; b.dataset.tb = k;
    b.innerHTML = `<b>${esc(n || HERK[G.herk].art.name)}</b><span class="c">${'<i></i>'.repeat(Fight.COST[k])}</span><small></small>`;
    b.addEventListener('click', () => { Snd.init(); if (Fight.tbAct(k)) Snd.play('ui'); else nope(b); });
    g.appendChild(b); hudEl.tb[k] = b;
  });
  const end = el('button', 'tb end', '<b>Zug beenden</b>');
  end.type = 'button'; end.id = 'btnEnd';
  end.addEventListener('click', () => { Snd.play('ui'); Fight.tbEnd(); });
  g.appendChild(end);
  Fight.hook.turn();
}
function tbInfo(k){
  const h = HERK[G.herk], pl = Fight.pl(), mul = pl ? pl.dmgMul : 1;
  switch (k){
    case 'atk': return `${Math.round(h.light[0].d * mul)} Schaden`;
    case 'heavy': return `${Math.round(h.heavy.d * mul)} Schaden`;
    case 'art': return `${h.art.fp} Fokus`;
    case 'crit': return Fight.tb() && Fight.tb().broken ? `${Math.round(h.heavy.d * 2.4 * mul)} Schaden` : 'wenn er taumelt';
    case 'block': return `+${pl ? pl.tbBlock : h.tbBlock} Schutz`;
    case 'parry': return 'goldener Treffer';
    case 'dodge': return 'ein Treffer';
    case 'flask': return `${pl ? pl.flasks : 0} übrig`;
  }
  return '';
}
function nope(b){ b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); }
Fight.hook.turn = () => {
  const tb = Fight.tb(); if (!tb || !hudEl.tb) return;
  hudEl.apPips.innerHTML = Array.from({ length: tb.apMax }, (_, i) => `<i class="${i < tb.ap ? 'full' : ''}"></i>`).join('') + '<small>Ausdauer</small>';
  TBB.forEach(([k]) => { const b = hudEl.tb[k]; b.disabled = !Fight.tbCan(k); b.querySelector('small').textContent = tbInfo(k); });
  const eb = $('#btnEnd'); if (eb) eb.disabled = tb.busy || tb.lock;
  // Absicht des Gegners
  const it = tb.intent, e = hudEl.intent, en = Fight.en();
  if (!it || tb.enemyTurn){ e.hidden = true; }
  else {
    if (it.move){
      const hits = it.move.hits, kinds = [...new Set(hits.map(Fight.tbKind))];
      const late = hits.some(h => h.k === 'p' && Fight.tbKind(h) === 'b');
      e.innerHTML = `<b>${esc(it.move.name)}</b><div class="dmg">${hits.map(h => `<span class="k-${Fight.tbKind(h)}">${Math.round(h.d * en.dmgMul * en.buff)}</span>`).join('')}</div><div class="tags">${kinds.map(k => `<em class="k-${k}">${ART_LABEL[k]}</em>`).join('')}</div>${late ? '<small>verzögert, eine Parade käme zu früh</small>' : ''}`;
    } else e.innerHTML = `<b>${esc(it.special.name)}</b><small>${esc(it.special.text)}</small>`;
    e.hidden = false;
  }
  // Haltung des Spielers
  const ch = [];
  if (tb.block) ch.push(`Schutz ${tb.block}`);
  if (tb.parry) ch.push('Parade bereit');
  if (tb.dodge) ch.push(`Ausweichen ×${tb.dodge}`);
  hudEl.stance.innerHTML = ch.map(c => `<em>${c}</em>`).join('');
};
Fight.hook.toast = what => {
  if (what === 'st'){ const r = $('#pStRow'); r.classList.add('warn'); setTimeout(() => r.classList.remove('warn'), 400); }
  if (what === 'fp' && hudEl.cb) { nope(hudEl.cb.art); toast('Nicht genug Fokus', 1000); }
  if (what === 'flask' && hudEl.cb) { nope(hudEl.cb.flask); toast('Keine Phiole mehr', 1000); }
};
let lineT = 0;
Fight.hook.line = async (text, ms, id) => {
  const l = $('#fLine'); l.textContent = '„' + text + '“'; l.hidden = false;
  requestAnimationFrame(() => l.classList.add('in'));
  clearTimeout(lineT);
  // Mit Stimme bleibt der Untertitel so lange stehen, wie gesprochen wird
  if (id && Voice.ok(id)){ Voice.say(id); ms = Math.max(ms, (await Voice.length(id)) * 1000 + 700); }
  clearTimeout(lineT); lineT = setTimeout(() => { l.classList.remove('in'); setTimeout(() => { l.hidden = true; }, 900); }, ms);
};
function hud(dt){
  const pl = Fight.pl(), en = Fight.en(), mode = Fight.mode();
  const f = Math.max(0, en.hp / en.hpMax), p = Math.max(0, pl.hp / pl.hpMax);
  lagFoe = f >= lagFoe ? f : Math.max(f, lagFoe - dt * .00035);
  lagP = p >= lagP ? p : Math.max(p, lagP - dt * .00035);
  hudEl.foeHp.style.transform = `scaleX(${f})`; hudEl.foeLag.style.transform = `scaleX(${lagFoe})`;
  hudEl.foePz.style.transform = `scaleX(${Math.max(0, en.pz / en.pzMax)})`;
  hudEl.pHp.style.transform = `scaleX(${p})`; hudEl.pLag.style.transform = `scaleX(${lagP})`;
  hudEl.pSt.style.transform = `scaleX(${pl.st / pl.stMax})`;
  hudEl.pFp.style.transform = `scaleX(${pl.fp / pl.fpMax})`;
  const n = `${Math.max(0, Math.ceil(pl.hp))} / ${pl.hpMax}`;
  if (n !== lastHpN){ hudEl.pHpN.textContent = n; lastHpN = n; }
  if (mode === 'echt'){
    if (pl.flasks !== lastFlask){ hudEl.flaskN.textContent = pl.flasks; lastFlask = pl.flasks; }
    const cb = hudEl.cb, h = HERK[G.herk];
    cb.flask.classList.toggle('off', pl.flasks <= 0);
    cb.art.classList.toggle('off', pl.fp < h.art.fp);
    const crit = Fight.critReady();
    cb.atk.classList.toggle('crit', crit);
    hudEl.atkLbl.textContent = crit ? 'Todesstoß' : 'Angriff';
    const low = pl.st < 12;
    cb.dodge.classList.toggle('off', low); cb.heavy.classList.toggle('off', low);
  } else {
    const tb = Fight.tb(), e = hudEl.intent;
    if (tb && !e.hidden && Stage.E && Stage.E.sk){
      const [W] = World.size(), hp = headPt(Stage.E);
      e.style.left = clamp(hp[0], 80, W - 80) + 'px';
      e.style.top = Math.max(70, hp[1] - Stage.E.H * .2) + 'px';
    }
    if (tb && tb.broken && hudEl.tb && hudEl.tb.crit.disabled === !Fight.tbCan('crit')) {}
  }
}

/* ---------- Eingaben im Kampf ---------- */
$$('#rtc .cb').forEach(b => {
  const k = b.dataset.k;
  let down = false;
  b.addEventListener('pointerdown', e => {
    e.preventDefault(); Snd.init();
    try { b.setPointerCapture(e.pointerId); } catch (err) {}
    down = true; b.classList.add('on'); Fight.press(k);
  });
  const up = () => { if (!down) return; down = false; b.classList.remove('on'); Fight.release(k); };
  b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
  b.addEventListener('contextmenu', e => e.preventDefault());
});
(() => {
  const t = $('#fTouch'); let sx = 0, sy = 0, st = 0, id = null;
  t.addEventListener('pointerdown', e => { id = e.pointerId; sx = e.clientX; sy = e.clientY; st = performance.now(); Snd.init(); });
  t.addEventListener('pointerup', e => {
    if (e.pointerId !== id) return; id = null;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.hypot(dx, dy) > 36){ Fight.press('dodge'); Fight.release('dodge'); }
    else if (performance.now() - st < 350){ Fight.press('atk'); Fight.release('atk'); }
  });
})();
$('#btnPause').addEventListener('click', () => { Snd.play('ui'); pauseSheet(); });
const KEYS = { ' ': 'atk', j: 'atk', h: 'heavy', k: 'dodge', Shift: 'dodge', l: 'block', b: 'block', u: 'art', e: 'flask', f: 'flask' };
document.addEventListener('keydown', e => {
  if (!$('#sheetBack').hidden){ if (e.key === 'Escape') closeSheet(); return; }
  if (cur !== 'fight') return;
  if (e.key === 'Escape'){ pauseSheet(); return; }
  if (Fight.mode() === 'runde'){ if (e.key === 'Enter') Fight.tbEnd(); return; }
  const k = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
  if (!k || e.repeat) return;
  e.preventDefault(); Fight.press(k);
});
document.addEventListener('keyup', e => {
  const k = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
  if (k && cur === 'fight') Fight.release(k);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && cur === 'fight' && Fight.on() && !Fight.paused() && $('#sheetBack').hidden) pauseSheet();
});

function pauseSheet(){
  if (!Fight.on()) return;
  Fight.setPaused(true);
  $$('#rtc .cb').forEach(b => b.classList.remove('on'));
  const echt = Fight.mode() === 'echt', other = echt ? 'runde' : 'echt';
  sheet(`<h3>Pause</h3>
    <button type="button" class="row" data-a="resume"><span><b>Weiterkämpfen</b></span></button>
    <button type="button" class="row" data-a="switch"><span><b>Kampfsystem wechseln</b><small>Beginnt diesen Kampf neu im ${SYS_LONG[other]}</small></span></button>
    ${echt ? `<button type="button" class="row" data-a="ring"><span><b>Zeitring</b><small>Zeigt, wann der nächste Treffer kommt</small></span><span class="val">${S.ring ? 'an' : 'aus'}</span></button>` : ''}
    <button type="button" class="row" data-a="sound"><span><b>Ton</b></span><span class="val">${S.sound ? 'an' : 'aus'}</span></button>
    ${hasVoices() ? `<button type="button" class="row" data-a="voice"><span><b>Stimmen</b><small>Erzähler und Figuren sprechen</small></span><span class="val">${S.voice ? 'an' : 'aus'}</span></button>` : ''}
    <button type="button" class="row" data-a="help"><span><b>Steuerung</b><small>Die Regeln noch einmal</small></span></button>
    <button type="button" class="row" data-a="flee"><span><b>Zum Leuchtfeuer fliehen</b><small>Der Kampf endet, deine Glut bleibt bei dir</small></span></button>`, {
    onClose: () => Fight.setPaused(false),
    on(a, b){
      if (a === 'resume') return closeSheet();
      if (a === 'ring'){ S.ring = !S.ring; saveSettings(); b.querySelector('.val').textContent = S.ring ? 'an' : 'aus'; return; }
      if (a === 'sound'){ S.sound = !S.sound; saveSettings(); Snd.setOn(S.sound); b.querySelector('.val').textContent = S.sound ? 'an' : 'aus'; if (S.sound) Music.play(FEINDE[fightKey].boss ? 'boss' : 'kampf'); return; }
      if (a === 'voice'){ S.voice = !S.voice; saveSettings(); b.querySelector('.val').textContent = S.voice ? 'an' : 'aus'; if (!S.voice) Voice.stop(); return; }
      if (a === 'help'){ closeSheet(false); tutorial(Fight.mode(), () => Fight.setPaused(false)); return; }
      if (a === 'switch'){ closeSheet(false); Fight.stop(); S.sys = other; saveSettings(); fight(fightKey); return; }
      if (a === 'flee'){ closeSheet(false); Fight.stop(); G.farm = false; bonfire(G.feuer, 'visit'); }
    }
  });
}

/* ---------- Bilanz ---------- */
function bilanz(){
  Fight.stop(); wake(false); Voice.stop();
  show('bilanz'); World.set('ende'); Stage.showE = false; Music.play('amb');
  const min = Math.max(1, Math.round((Date.now() - G.t0) / 60000));
  const used = Object.keys(G.sys).map(k => SYS_NAME[k]).join(' und ') || SYS_NAME[S.sys];
  $('#bStats').innerHTML = [
    ['Kampfsystem', used], ['Spielzeit', `${min} Min.`], ['Tode', G.deaths], ['Paraden', G.parries],
    ['Perfekt ausgewichen', G.perfect], ['Stufe', G.lvl]
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  const other = S.sys === 'echt' ? 'runde' : 'echt';
  const list = [
    { t: `Boss noch einmal im ${SYS_LONG[other]}`, fn: () => { S.sys = other; saveSettings(); G.won.vogt = false; bonfire('mole', 'visit'); }, main: true },
    { t: `Boss noch einmal im ${SYS_LONG[S.sys]}`, fn: () => { G.won.vogt = false; bonfire('mole', 'visit'); } },
    { t: 'Zum Titel', fn: titleScreen }
  ];
  const ch = $('#bChoices'); ch.innerHTML = '';
  list.forEach(w => {
    const b = el('button', 'choice in' + (w.main ? ' main' : ''), `<b>${esc(w.t)}</b>`);
    b.type = 'button'; b.addEventListener('click', () => { Snd.play('choice'); w.fn(); });
    ch.appendChild(b);
  });
}

/* ---------- Start ---------- */
function init(){
  resize();
  window.addEventListener('resize', resize);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
  titleScreen();
  requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
  if (DEBUG) window.__mg = { G, S, Fight, Stage, World, Voice, scene, fight, bonfire, bilanz, titleScreen, draw, drawActor, makeActor, SETS, LOOK, mkPose, skeleton };
}
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(init);
else init();
