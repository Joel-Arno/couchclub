/* =====================================================================
   ABLAUF: Titel, Orte, Karte, Leuchtfeuer, Gespräche, Kämpfe, Menüs
   ===================================================================== */
LOOK.leer = Object.assign({}, LOOK.kron, { off: null });

/* ---------- Spielstand (pro Spieler im Couchclub) ---------- */
const SAVE_KEY = 'mondgelaeut-v1' + (EMB && EMB.p ? '@' + EMB.p : '');
function neuesSpiel(){
  return {
    v: 1, herk: null, lvl: 1, attr: { vit: 0, aus: 0, str: 0, ges: 0 }, glut: 0, drop: null,
    ort: 'kiesstrand', von: null, feuer: 'kiesstrand', lit: {}, geraeumt: {}, bosse: {}, besucht: {}, aktionen: {}, merker: {},
    items: {}, waffen: {}, waffe: null, schild: null, schilde: {}, tals: {}, tal: [null, null], laden: {},
    flasksMax: 3, flasks: 3, hp: null, fp: null, ende: false,
    st: { tode: 0, paraden: 0, perfekt: 0, kaempfe: 0, ms: 0 }, t0: Date.now()
  };
}
let D = neuesSpiel();
function gespeichert(){
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!d || d.v !== 1 || !HERK[d.herk]) return null;
    const n = neuesSpiel();
    for (const k in n) if (d[k] === undefined) d[k] = n[k];
    d.st = Object.assign(n.st, d.st);
    if (!ORTE[d.ort]) d.ort = 'kiesstrand';
    if (!ORTE[d.feuer]) d.feuer = 'kiesstrand';
    if (!WAFFEN[d.waffe]) d.waffe = HERK[d.herk].waffe;
    return d;
  } catch (e) { return null; }
}
let lastSave = 0;
function speichern(){
  if (!D.herk) return;
  lastSave = performance.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(D)); } catch (e) {}
  ccPost({ t: 'save', sum: ccSumme() });
}
function ccSumme(){
  return { runs: D.herk ? 1 : 0, lvl: D.lvl, bosse: Object.keys(D.bosse).length, tode: D.st.tode, min: Math.floor(D.st.ms / 60000), akt: D.ende ? 1 : 0 };
}
function ccLeave(){
  speichern();
  ccPost({ t: 'leave', sum: ccSumme() });
}

/* ---------- Werte des Helden ---------- */
const lvlKosten = () => Math.round(90 * Math.pow(1.25, D.lvl - 1) / 10) * 10;
const anzahl = id => D.items[id] || 0;
function tals(){ return D.tal.filter(k => k && D.tals[k]).map(k => TALISMANE[k]); }
function profil(waffe = D.waffe, attr = D.attr){
  const h = HERK[D.herk], w = WAFFEN[waffe], T = tals(), stufe = D.waffen[waffe] || 0;
  const mul = k => T.reduce((m, t) => m * (t[k] || 1), 1);
  const sh = w.klasse === 'klinge' && D.schild ? SCHILDE[D.schild] : null, kb = KLASSE_BLOCK[w.klasse];
  return {
    hpMax: Math.round((90 + attr.vit * 12) * mul('hp')), stMax: 80 + attr.aus * 8, fpMax: h.fp,
    flasksMax: D.flasksMax, heal: Math.max(.45, ...T.map(t => t.heal || 0)),
    waffe: w, dmgMul: (1 + .1 * stufe) * (1 + attr.str * w.skal.str + attr.ges * w.skal.ges) * mul('dmg'),
    block: sh ? sh.block : kb.block, blockSt: sh ? sh.st : kb.st, dodgeSt: w.dodgeSt || 22,
    stRegen: mul('stRegen'), pzMul: mul('pz'), parryFp: 10 * mul('parryFp')
  };
}
const hpJetzt = () => { const p = profil(); return D.hp == null ? p.hpMax : Math.min(p.hpMax, D.hp); };
function heldAufBuehne(){
  const P = Stage.hero(D.herk, D.waffe, D.schild);
  Stage.showP = true; P.alpha = 1; P.hideW = false; P.glow = 0;
  return P;
}
// Gegenstände verteilen; gibt die Namen für die Anzeige zurück
function geben(g){
  const out = [];
  const add = (id, n = 1) => { D.items[id] = anzahl(id) + n; out.push(GEGENSTAENDE[id].name + (n > 1 ? ' ×' + n : '')); };
  if (g.item){
    const L = Array.isArray(g.item) ? (Array.isArray(g.item[0]) ? g.item : [g.item]) : [[g.item, 1]];
    L.forEach(([id, n]) => add(id, n));
  }
  if (g.tal && TALISMANE[g.tal]){
    D.tals[g.tal] = true;
    const frei = D.tal.indexOf(null);
    if (frei >= 0 && !D.tal.includes(g.tal)){ D.tal[frei] = g.tal; out.push(TALISMANE[g.tal].name + ' (angelegt)'); }
    else out.push(TALISMANE[g.tal].name);
  }
  if (g.schild && SCHILDE[g.schild]){ D.schilde[g.schild] = true; out.push(SCHILDE[g.schild].name); }
  if (g.waffe && WAFFEN[g.waffe]){ if (!(g.waffe in D.waffen)) D.waffen[g.waffe] = 0; out.push(WAFFEN[g.waffe].name); }
  return out;
}

/* ---------- Orte und Wege ---------- */
const O = () => ORTE[D.ort];
// Liegt hier noch ein Kampf an?
function offen(id){ const o = ORTE[id]; return o.boss ? !D.bosse[o.boss] : o.kampf ? !D.geraeumt[id] : false; }
function nachbarn(id){
  return { vor: ORTE[id].nach.slice(), zurueck: Object.keys(ORTE).filter(k => ORTE[k].nach.includes(id)) };
}
function gesperrt(id){ const s = ORTE[id].sperre; return s && !s.wenn(D) ? s.text : null; }
function npcsHier(){ return offen(D.ort) ? [] : (O().npc || []).filter(n => n.wenn(D)).map(n => n.id); }
function feindListe(o){
  const n = {}; o.kampf.forEach(k => { n[k] = (n[k] || 0) + 1; });
  return Object.entries(n).map(([k, c]) => FEINDE[k].name + (c > 1 ? ' ×' + c : '')).join(', ');
}
function wegInfo(id){
  const o = ORTE[id];
  if (o.region !== O().region && !D.besucht[id]) return REGIONEN[o.region].name;
  if (!D.besucht[id]) return 'Unerforscht';
  const t = [];
  if (o.feuer && D.lit[id]) t.push('Leuchtfeuer');
  if (o.boss) t.push(D.bosse[o.boss] ? FEINDE[o.boss].name + ', besiegt' : FEINDE[o.boss].name);
  else if (offen(id)) t.push('Gegner');
  if (D.drop && D.drop.ort === id) t.push('deine Glut');
  return t.join(' · ');
}
function wegNach(id){
  const c = D.ort;
  if (id === c) return { ok: false, grund: 'Du bist hier.' };
  if (ORTE[id].nach.includes(c)) return { ok: true, art: 'gehen' };
  if (ORTE[c].nach.includes(id)){
    if (offen(c)) return { ok: false, grund: 'Die Gegner hier lassen dich nicht vorbei. Nur der Rückweg ist frei.' };
    const s = gesperrt(id); if (s) return { ok: false, grund: s };
    return { ok: true, art: 'gehen' };
  }
  if (ORTE[id].feuer && D.lit[id]){
    if (offen(c)) return { ok: false, grund: 'Die Gegner hier lassen dich nicht gehen. Nur der Rückweg ist frei.' };
    return { ok: true, art: 'reisen' };
  }
  return { ok: false, grund: D.besucht[id] ? 'Zu weit. Reisen kannst du nur zu entfachten Leuchtfeuern.' : 'Noch unerforscht. Du erreichst es nur von einem Nachbarort.' };
}

/* ---------- Bildschirme ---------- */
const SCREENS = ['title', 'ort', 'karte', 'fight', 'ende'];
let cur = 'title';
function show(id){
  SCREENS.forEach(s => { $('#' + s).hidden = s !== id; }); cur = id;
  World.setCam(id === 'ort' || id === 'ende' ? .15 : id === 'karte' ? .08 : 0);
}
function el(tag, cls, html){ const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function blende(fn){
  const f = $('#fade');
  if (reduceMotion){ fn(); return; }
  f.classList.add('on');
  setTimeout(() => { fn(); requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('on'))); }, 360);
}

/* ---------- Leinwand und Bildschleife ---------- */
const cv = $('#stage'), ctx = cv.getContext('2d');
let wt = 0, last = performance.now();
function resize(){
  const r = Math.min(2, window.devicePixelRatio || 1), b = $('#app').getBoundingClientRect();
  const w = Math.max(1, Math.round(b.width)), h = Math.max(1, Math.round(b.height));
  cv.width = Math.round(w * r); cv.height = Math.round(h * r);
  ctx.setTransform(r, 0, 0, r, 0, 0);
  World.resize(w, h, r); Stage.place();
  if (cur === 'karte') renderKarte();
}
function frame(now){
  const dt = Math.min(50, now - last); last = now; wt += dt;
  if (Fight.on()) Fight.update(dt);
  else {
    if (Stage.P) updateActor(Stage.P, dt);
    if (Stage.E && Stage.showE) updateActor(Stage.E, dt);
    if (Stage.N && Stage.showN) updateActor(Stage.N, dt);
  }
  if (cur !== 'title' && D.herk && !document.hidden){
    D.st.ms += dt;
    if (now - lastSave > 30000 && !Fight.on()) speichern();
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
  if (D.drop && D.drop.ort === D.ort && (cur === 'ort' || cur === 'fight') && Stage.P && Stage.showP){
    const x = Stage.P.x - Stage.P.H * .55, y = Stage.P.gy - 3, r = Stage.P.H * .22 * (1 + Math.sin(wt * .004) * .1);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,190,120,.8)'); g.addColorStop(1, 'rgba(227,120,50,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r, r * .45, 0, 0, TAU); ctx.fill(); ctx.restore();
  }
  World.drawGhosts(ctx);
  if (Stage.N && Stage.showN) drawActor(ctx, Stage.N);
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
  if (!o.keepScroll) s.scrollTop = 0;
  const f = s.querySelector('button:not([disabled])'); if (f && !o.keepScroll) setTimeout(() => f.focus({ preventScroll: true }), 30);
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
const row = (a, name, sub = '', val = '', o = {}) =>
  `<button type="button" class="row${o.on ? ' on' : ''}" data-a="${a}"${o.off ? ' disabled' : ''}><span><b>${esc(name)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span><span class="val">${val}</span></button>`;
const dl = (list, cls = 'stats') => `<dl class="${cls}">${list.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`;

/* ---------- Erzähltafel: Absätze nacheinander, dann die Wahl ---------- */
let panelTok = 0, panelT = 0;
function panel(o){
  const tok = ++panelTok; clearTimeout(panelT); Voice.stop();
  show('ort');
  $('#stPlace').textContent = o.place;
  obar();
  const box = $('#stText'), ch = $('#stChoices'), st = $('#stStats');
  box.innerHTML = ''; ch.innerHTML = '';
  st.hidden = !o.stats; if (o.stats) st.innerHTML = o.stats;
  const paras = o.texte.map(x => { const p = el('p', x.cls || ''); p.textContent = x.t; box.appendChild(p); return p; });
  Voice.warm(o.texte.map(x => x.voice).filter(Boolean));
  let i = 0, done = false;
  const fertig = () => { done = true; waehlen(o.choices || []); };
  const reveal = () => {
    if (tok !== panelTok || done) return;
    if (i < paras.length){
      const x = o.texte[i];
      paras[i].classList.add('in'); if (o.onPara) o.onPara(i); i++;
      if (x.voice && Voice.ok(x.voice)) Voice.say(x.voice).then(() => { if (tok === panelTok && !done) panelT = setTimeout(reveal, 450); });
      else panelT = setTimeout(reveal, o.sofort || x.cls === 'gabe' || x.cls === 'note' ? 120 : 1400);
    } else fertig();
  };
  panelT = setTimeout(reveal, o.sofort ? 0 : 300);
  $('#stPanel').onpointerdown = () => {
    if (done || tok !== panelTok) return;
    clearTimeout(panelT); Voice.stop();
    while (i < paras.length){ paras[i].classList.add('in'); if (o.onPara) o.onPara(i); i++; }
    fertig();
  };
  $('#stPanel').scrollTop = 0;
}
function waehlen(list){
  const ch = $('#stChoices'); ch.innerHTML = '';
  list.forEach((w, j) => {
    const b = el('button', 'choice' + (w.cls ? ' ' + w.cls : ''), `<b>${esc(w.t)}</b>${w.sub ? `<small>${esc(w.sub)}</small>` : ''}`);
    b.type = 'button'; b.disabled = !!w.off;
    b.addEventListener('click', () => { if (b.disabled) return; Snd.play('choice'); w.fn(); });
    ch.appendChild(b);
    setTimeout(() => b.classList.add('in'), 40 + j * 80);
  });
}
function obar(){
  const o = O(), p = D.herk ? profil() : null;
  $('#oGlut').textContent = fmt(D.glut);
  $('#oWhere').innerHTML = D.herk ? `${esc(REGIONEN[o.region].name)}<small>Leben ${hpJetzt()} / ${p.hpMax} · Phiolen ${D.flasks} / ${D.flasksMax}</small>` : '';
}

/* ---------- Titel ---------- */
function titel(){
  Fight.stop(); wake(false); Voice.stop(); clearTimeout(panelT); panelTok++;
  show('title'); World.set('strand'); World.reset();
  Stage.showE = false; Stage.showP = false; Stage.showN = false;
  const s = gespeichert(), box = $('#tActions');
  const btn = (cls, t, sub, fn) => {
    const b = el('button', 'btn ' + cls, `<span>${esc(t)}</span>${sub ? `<small>${esc(sub)}</small>` : ''}`);
    b.type = 'button'; b.addEventListener('click', () => { Snd.init(); Snd.play('choice'); fn(); }); box.appendChild(b);
  };
  box.innerHTML = '';
  if (s){
    btn('primary', 'Fortsetzen', `${HERK[s.herk].name} · Stufe ${s.lvl} · ${ORTE[s.ort].name}`, () => fortsetzen(s));
    btn('ghost', 'Neues Spiel', '', () => sheet(`<h3>Neues Spiel?</h3><p>Dein Spielstand (${esc(HERK[s.herk].name)}, Stufe ${s.lvl}) wird überschrieben. Das lässt sich nicht rückgängig machen.</p>
      <button type="button" class="btn primary" data-a="neu">Neu beginnen</button><button type="button" class="btn ghost" data-a="x">Abbrechen</button>`, {
      on(a){ closeSheet(false); if (a === 'neu') intro(); }
    }));
  } else btn('primary', 'Erwachen', '', intro);
  $('#btnLeave').hidden = !EMB; $('#tHint').hidden = !!EMB;
  syncSound();
  if (Snd.ac()) Music.play('amb');
}
const hasVoices = () => Object.keys(STIMMEN).length > 0;
function syncSound(){
  $('#btnSound').textContent = 'Ton: ' + (S.sound ? 'an' : 'aus');
  $('#btnVoice').textContent = 'Stimme: ' + (S.voice ? 'an' : 'aus'); $('#btnVoice').hidden = !hasVoices();
}
$('#btnSound').addEventListener('click', () => {
  Snd.init(); S.sound = !S.sound; saveSettings(); Snd.setOn(S.sound); syncSound(); if (!S.sound) Voice.stop();
  if (S.sound && !Music.mode()) Music.play('amb');
});
$('#btnVoice').addEventListener('click', () => { Snd.init(); S.voice = !S.voice; saveSettings(); syncSound(); if (!S.voice) Voice.stop(); });
$('#btnLeave').addEventListener('click', () => { Snd.play('ui'); ccLeave(); });
function fortsetzen(s){
  D = s;
  blende(() => { heldAufBuehne(); zeigeOrt(); });
}

/* ---------- Anfang: Erwachen und Herkunft ---------- */
function intro(){
  D = neuesSpiel();
  blende(() => {
    World.set('strand'); World.reset(); Music.play('amb');
    const P = Stage.hero('kron', 'langschwert', null);
    P.look = LOOK.leer; P.hideW = true; P.alpha = 1; Stage.showP = true;
    Stage.E = null; Stage.N = null; Stage.showE = false; Stage.showN = false;
    P.stance = 'lie'; P.pose = mkPose({}, SETS[P.set].lie); P.anim = null;
    $('#ort').classList.add('intro');
    panel({ place: 'Kiesstrand', texte: ANFANG.erwachen.map((t, i) => ({ t, voice: 'erwachen.' + i })),
      onPara: i => { if (i === 2) Snd.play('heart'); },
      choices: [{ t: 'Aufstehen', cls: 'main', fn: herkunftWahl }] });
  });
}
function herkunftWahl(){
  const P = Stage.P;
  playAnim(P, [[0, SETS[P.set].lie], [900, SETS[P.set].kneel, EASE.io]]);
  P.stance = 'kneel'; Snd.play('rise');
  panel({ place: 'Kiesstrand', texte: ANFANG.herkunft.map((t, i) => ({ t, voice: 'herkunft.' + i })),
    choices: Object.entries(HERK).map(([k, h]) => ({ t: h.item, sub: `${h.name}. ${h.blurb}`, fn: () => herkunft(k) })) });
}
function herkunft(k){
  const h = HERK[k];
  Object.assign(D, { herk: k, attr: Object.assign({}, h.attr), waffe: h.waffe, waffen: { [h.waffe]: 0 }, schild: h.schild, schilde: h.schild ? { [h.schild]: true } : {}, t0: Date.now() });
  D.besucht.kiesstrand = true;
  const old = Stage.P, P = heldAufBuehne();
  P.pose = old.pose; P.t = old.t; P.stance = null;
  playAnim(P, [[0, SETS[P.set].kneel], [300, SETS[P.set].kneel], [1100, SETS[P.set].idle, EASE.io]]);
  Snd.play('rise');
  speichern();
  panel({ place: 'Kiesstrand', texte: [{ t: h.rise, voice: 'herk.' + k }],
    choices: [{ t: 'Weiter', cls: 'main', fn: () => { $('#ort').classList.remove('intro'); zeigeOrt(); } }] });
}

/* ---------- An einem Ort ---------- */
function ortBuehne(){
  const o = O();
  // Nach dem Boss sieht der Ort aus wie im Kampf, beim Strandvogt ohne Nebelwand
  World.set(o.boss && D.bosse[o.boss] && o.arena ? o.arena : o.welt); World.reset();
  const P = Stage.P; Stage.showP = true; P.alpha = 1; P.hideW = false; P.glow = 0; P.stance = null;
  Stage.E = null; Stage.showE = false; Stage.N = null; Stage.showN = false;
  if (offen(D.ort)){
    // Der Strandvogt wartet unsichtbar im Nebel
    if (o.welt !== 'nebel'){
      const E = Stage.foe(o.boss || o.kampf[0]);
      if (o.liegend){ E.stance = 'lie'; E.pose = mkPose({}, SETS[E.set].lie); E.anim = null; }
    }
  } else {
    const n = npcsHier()[0];
    if (n){ Stage.npc(n); Stage.N.key = n; }
  }
  Stage.place();
}
function ortTexte(id, erst){
  const o = ORTE[id];
  if (offen(id)){
    if (o.boss || erst || !o.wieder) return (o.text || []).map((t, i) => ({ t, voice: id + '.' + i }));
    return [{ t: o.wieder }];
  }
  if (erst && o.text) return o.text.map((t, i) => ({ t, voice: id + '.' + i }));
  return [{ t: o.leer }];
}
// Aufstehende Gegner: Wer im Wrackfeld liegt, erhebt sich beim letzten Satz
function erheben(i, n){
  const E = Stage.E;
  if (!E || E.stance !== 'lie' || i !== n - 1) return;
  const S2 = SETS[E.set];
  E.stance = null; playAnim(E, [[0, S2.lie], [700, S2.kneel, EASE.io], [1500, S2.idle, EASE.io]]);
  Snd.play('rise');
}
function zeigeOrt(x = {}){
  const id = D.ort, o = ORTE[id];
  if (!x.behalten) ortBuehne();
  Music.play('amb');
  const texte = x.texte || ortTexte(id, false);
  panel({ place: o.name, texte, sofort: !x.texte, choices: x.choices || ortWahl(),
    onPara: i => erheben(i, texte.length) });
}
function ortWahl(){
  const id = D.ort, o = ORTE[id], L = [], nb = nachbarn(id);
  if (offen(id)){
    const boss = o.boss && FEINDE[o.boss];
    L.push({ t: boss ? (id === 'nebel' ? 'In den Nebel treten' : 'Sich stellen') : 'Kämpfen', sub: boss ? `${boss.name}, ${boss.title}` : feindListe(o), cls: 'main fight', fn: kampf });
  } else {
    if (o.feuer) L.push({ t: 'Am Leuchtfeuer rasten', sub: 'Leben und Phiolen füllen sich. Die Toten stehen wieder auf.', cls: 'fire', fn: rasten });
    npcsHier().forEach(n => L.push({ t: `Mit ${NPC[n].name} sprechen`, sub: NPC[n].titel, cls: 'talk', fn: () => gespraech(n, 'ort') }));
    (o.aktionen || []).forEach(a => { if (!D.aktionen[a.id] || a.wiederholbar) L.push({ t: a.t, fn: () => aktion(a) }); });
    nb.vor.forEach(n => {
      const s = gesperrt(n);
      L.push({ t: 'Weiter: ' + ORTE[n].name, sub: s || wegInfo(n), off: !!s, cls: !D.besucht[n] && !s ? 'main' : '', fn: () => reise(n) });
    });
  }
  nb.zurueck.forEach(n => L.push({ t: 'Zurück: ' + ORTE[n].name, sub: wegInfo(n), fn: () => reise(n) }));
  if (o.ende && D.ende) L.push({ t: 'Rückblick auf Akt I', fn: akt1Ende });
  return L;
}
function reise(id){ blende(() => geheZu(id)); }
function geheZu(id, how = 'weg'){
  const alt = O();
  D.von = how === 'weg' ? D.ort : null;
  D.ort = id;
  const o = ORTE[id], erst = !D.besucht[id], neueRegion = !Object.keys(D.besucht).some(k => ORTE[k].region === o.region);
  D.besucht[id] = true;
  if (o.region === 'velmora') D.merker.velmora = true;
  const noten = [];
  let neuFeuer = false;
  if (o.feuer && !D.lit[id]){ D.lit[id] = true; D.feuer = id; neuFeuer = true; }
  if (D.drop && D.drop.ort === id && !offen(id)) noten.push(glutAufheben());
  speichern();
  zeigeOrt({ texte: ortTexte(id, erst).concat(noten) });
  if (neuFeuer){ Snd.play('fire'); banner('Leuchtfeuer entfacht', 'fire', o.feuer, 2600); }
  else if (neueRegion && alt.region !== o.region){ Snd.play('heart'); banner(REGIONEN[o.region].name, 'region', '', 2600); }
}
function glutAufheben(){
  const n = D.drop.n; D.glut += n; D.drop = null;
  setTimeout(() => {
    const P = Stage.P; if (!P) return;
    World.glutFlow([P.x - P.H * .55, P.gy - 4], chestPt(P), 30); Snd.play('glut');
  }, 600);
  return { t: `Du findest deine Glut wieder: ${fmt(n)}.`, cls: 'gabe' };
}
function aktion(a){
  const texte = [{ t: a.text }];
  if (!D.aktionen[a.id]){
    D.aktionen[a.id] = true;
    if (a.gibt){ geben(a.gibt).forEach(g => texte.push({ t: 'Erhalten: ' + g, cls: 'gabe' })); Snd.play('glut'); }
  }
  speichern();
  panel({ place: O().name, texte, choices: ortWahl() });
}

/* ---------- Leuchtfeuer ---------- */
function rasten(){
  D.hp = null; D.fp = null; D.flasks = D.flasksMax; D.geraeumt = {}; D.feuer = D.ort;
  speichern();
  const P = Stage.P;
  playAnim(P, [[0, SETS[P.set].idle], [700, SETS[P.set].kneel, EASE.io]]); P.stance = 'kneel';
  Snd.play('fire');
  const [fx, fy] = World.firePos(); World.burst(fx, fy - 20, 'ember', 24);
  feuerPanel('rast');
}
function feuerStats(){
  const p = profil();
  return [['Stufe', D.lvl], ['Glut', fmt(D.glut)], ['Leben', p.hpMax], ['Phiolen', D.flasksMax]].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
}
function feuerWahl(){
  const L = [], k = lvlKosten(), o = O();
  L.push({ t: 'Aufsteigen', sub: `Stufe ${D.lvl + 1} kostet ${fmt(k)} Glut`, fn: aufsteigen });
  if (anzahl('mondtau')) L.push({ t: 'Mondtau einsetzen', sub: `Eine Phiole mehr: ${D.flasksMax} → ${D.flasksMax + 1}`, fn: mondtau });
  if (o.amboss) L.push({ t: 'Am Amboss arbeiten', sub: 'Waffen schärfen, Nachhall zu Waffen gießen', fn: amboss });
  if (Object.keys(D.lit).length > 1) L.push({ t: 'Zu einem anderen Leuchtfeuer reisen', fn: karte });
  npcsHier().forEach(n => L.push({ t: `Mit ${NPC[n].name} sprechen`, sub: NPC[n].titel, cls: 'talk', fn: () => gespraech(n, 'feuer') }));
  L.push({ t: 'Aufbrechen', cls: 'main', fn: aufbrechen });
  return L;
}
function feuerPanel(how, extra = []){
  const o = O();
  const texte = (how === 'tod' ? [{ t: SAETZE['feuer.tod'], voice: 'feuer.tod' }] : how === 'rast' ? [{ t: SAETZE['feuer.rast'], voice: 'feuer.rast' }] : []).concat(extra);
  panel({ place: o.feuer, texte: texte.length ? texte : [{ t: o.leer }], sofort: how === 'menu', stats: feuerStats(), choices: feuerWahl() });
}
function feuerAktuell(){
  if (cur !== 'ort' || $('#stStats').hidden) return;
  $('#stStats').innerHTML = feuerStats(); waehlen(feuerWahl()); obar();
}
function aufbrechen(){
  const P = Stage.P;
  P.stance = null; playAnim(P, [[0, SETS[P.set].kneel], [800, SETS[P.set].idle, EASE.io]]);
  zeigeOrt({ behalten: true });
}
function mondtau(){
  if (!anzahl('mondtau')) return;
  D.items.mondtau--; D.flasksMax++; D.flasks = D.flasksMax;
  speichern(); Snd.play('heal');
  const P = Stage.P; World.burst(P.x, P.gy - P.H * .6, 'heal', 26);
  toast(`Du hast jetzt ${D.flasksMax} Phiolen`, 2000);
  feuerAktuell();
}
function aufsteigen(){
  const k = lvlKosten(), p = profil(), kann = D.glut >= k;
  const vor = (attr, f) => { const a = Object.assign({}, D.attr, { [attr]: D.attr[attr] + 1 }); return f(profil(D.waffe, a)); };
  const pct = attr => Math.round((vor(attr, q => q.dmgMul) / p.dmgMul - 1) * 1000) / 10;
  const rows = [
    ['vit', `Leben ${p.hpMax} → ${vor('vit', q => q.hpMax)}`],
    ['aus', `Ausdauer ${p.stMax} → ${vor('aus', q => q.stMax)}`],
    ['str', `Schaden mit ${WAFFEN[D.waffe].name} +${String(pct('str')).replace('.', ',')} %`],
    ['ges', `Schaden mit ${WAFFEN[D.waffe].name} +${String(pct('ges')).replace('.', ',')} %`]
  ];
  sheet(`<h3>Aufsteigen</h3><p>Stufe ${D.lvl} auf ${D.lvl + 1} kostet ${fmt(k)} Glut. Du trägst ${fmt(D.glut)} bei dir.</p>
    ${rows.map(([a, t]) => row(a, ATTR[a].name, t, D.attr[a], { off: !kann })).join('')}
    <button type="button" class="btn ghost" data-a="x">Fertig</button>`, {
    keepScroll: true, onClose: feuerAktuell,
    on(a){
      if (a === 'x') return closeSheet();
      if (D.glut < k || !ATTR[a]) return;
      D.glut -= k; D.lvl++; D.attr[a]++;
      speichern(); Snd.play('fire');
      const P = Stage.P; World.burst(P.x, P.gy - P.H * .6, 'ember', 30);
      toast(`Stufe ${D.lvl}`); aufsteigen();
    }
  });
}
function amboss(){
  const rows = [], forge = [];
  Object.keys(D.waffen).forEach(k => {
    const w = WAFFEN[k], lv = D.waffen[k], c = upgradeKosten(lv), max = lv >= MAX_STUFE;
    const ok = !max && anzahl('glockenerz') >= c.erz && D.glut >= c.glut;
    rows.push(row('up:' + k, `${w.name} +${lv}`, max ? 'Voll geschärft' : `Auf +${lv + 1}: ${c.erz} Glockenerz, ${fmt(c.glut)} Glut`, max ? '' : 'Schärfen', { off: !ok, on: k === D.waffe }));
  });
  Object.keys(WAFFEN).forEach(k => {
    const w = WAFFEN[k], nh = 'nachhall_' + w.nachhall;
    if (!w.nachhall || k in D.waffen || !anzahl(nh)) return;
    forge.push(row('forge:' + k, `${w.name} gießen`, `${GEGENSTAENDE[nh].name} und 500 Glut. ${w.text}`, 'Gießen', { off: D.glut < 500 }));
  });
  sheet(`<h3>Amboss</h3><p>Glockenerz ${anzahl('glockenerz')} · Glut ${fmt(D.glut)}. Jede Stufe macht eine Waffe um 10 % stärker, höchstens +${MAX_STUFE}.</p>
    ${rows.join('')}${forge.length ? '<p class="sec">Nachhall</p>' + forge.join('') : ''}
    <button type="button" class="btn ghost" data-a="x">Fertig</button>`, {
    keepScroll: true, onClose: feuerAktuell,
    on(a){
      if (a === 'x') return closeSheet();
      const [what, k] = a.split(':');
      if (what === 'up'){
        const lv = D.waffen[k], c = upgradeKosten(lv);
        if (lv >= MAX_STUFE || anzahl('glockenerz') < c.erz || D.glut < c.glut) return;
        D.items.glockenerz -= c.erz; D.glut -= c.glut; D.waffen[k]++;
        Snd.play('block'); setTimeout(() => Snd.play('parry'), 120);
        toast(`${WAFFEN[k].name} +${D.waffen[k]}`);
      }
      if (what === 'forge'){
        const nh = 'nachhall_' + WAFFEN[k].nachhall;
        if (D.glut < 500 || !anzahl(nh)) return;
        D.items[nh]--; D.glut -= 500; D.waffen[k] = 0;
        Snd.play('geleut'); toast(`${WAFFEN[k].name} gegossen. Anlegen im Menü.`, 2600);
      }
      speichern(); amboss();
    }
  });
}

/* ---------- Gespräche und Handel ---------- */
let gZurueck = 'ort';
function gespraech(npc, zurueck){
  const key = gespraechFuer(npc, D, D.ort), G = GESPRAECHE[key];
  if (!G) return;
  gZurueck = zurueck;
  if (G.setze) D.merker[G.setze] = true;
  if (!Stage.N || Stage.N.key !== npc){ Stage.npc(npc); Stage.N.key = npc; }
  knoten(G, G.start);
}
function knoten(G, k){
  const n = G.k[k], wer = NPC[G.wer], texte = [{ t: '„' + n.text + '“', cls: 'rede' }];
  if (n.setze) D.merker[n.setze] = true;
  if (n.nimmt && anzahl(n.nimmt)){ D.items[n.nimmt]--; texte.push({ t: 'Abgegeben: ' + GEGENSTAENDE[n.nimmt].name, cls: 'gabe' }); }
  if (n.gibt) geben(n.gibt).forEach(g => texte.push({ t: 'Erhalten: ' + g, cls: 'gabe' }));
  speichern();
  const choices = (n.a || []).map(a => ({ t: a.t, cls: a.laden ? 'fire' : '', fn: () => {
    if (a.setze) D.merker[a.setze] = true;
    if (a.laden) return handel(G.wer, () => knoten(G, k));
    if (a.go) return knoten(G, a.go);
    gespraechEnde();
  } }));
  if (!choices.length) choices.push({ t: 'Gehen', fn: gespraechEnde });
  panel({ place: `${wer.name} · ${wer.titel}`, texte, sofort: true, choices });
}
function gespraechEnde(){
  speichern();
  if (gZurueck === 'feuer' && O().feuer) feuerPanel('menu');
  else zeigeOrt();
}
function handel(wer, zurueck){
  const L = LADEN[wer], gek = D.laden[wer] = D.laden[wer] || {};
  const rows = L.map(e => {
    const def = e.art === 'tal' ? TALISMANE[e.id] : GEGENSTAENDE[e.id], rest = e.vorrat - (gek[e.id] || 0);
    return row('buy:' + e.id, def.name, def.text + (rest > 0 ? ` Noch ${rest}.` : ''), rest > 0 ? fmt(e.preis) + ' Glut' : 'ausverkauft', { off: rest <= 0 || D.glut < e.preis });
  });
  sheet(`<h3>${esc(NPC[wer].name)}s Ware</h3><p>Du trägst ${fmt(D.glut)} Glut bei dir.</p>${rows.join('')}
    <button type="button" class="btn ghost" data-a="x">Fertig</button>`, {
    keepScroll: true, onClose: zurueck,
    on(a){
      if (a === 'x') return closeSheet();
      const e = L.find(x => 'buy:' + x.id === a); if (!e) return;
      if (D.glut < e.preis || (gek[e.id] || 0) >= e.vorrat) return;
      D.glut -= e.preis; gek[e.id] = (gek[e.id] || 0) + 1;
      const g = geben({ [e.art]: e.id });
      speichern(); Snd.play('glut'); toast('Gekauft: ' + g[0]); obar();
      handel(wer, zurueck);
    }
  });
}

/* ---------- Karte ---------- */
let kRegion = 'strandung', kSel = null;
function karte(){
  if (Fight.on() || !D.herk) return;
  kRegion = O().region; kSel = null;
  show('karte'); renderKarte();
}
function sichtbar(id){
  if (D.besucht[id]) return true;
  const nb = nachbarn(id);
  return nb.vor.concat(nb.zurueck).some(n => D.besucht[n]);
}
function ortStatus(k){
  const o = ORTE[k], t = [];
  if (k === D.ort) t.push('Du bist hier');
  if (!D.besucht[k]) t.push('Unerforscht');
  if (o.feuer && D.lit[k]) t.push('Leuchtfeuer');
  if (o.boss && D.besucht[k]) t.push(D.bosse[o.boss] ? `${FEINDE[o.boss].name}, besiegt` : FEINDE[o.boss].name);
  else if (D.besucht[k] && offen(k)) t.push('Gegner');
  if (D.drop && D.drop.ort === k) t.push(`Deine Glut liegt hier (${fmt(D.drop.n)})`);
  return t.join(' · ');
}
function renderKarte(){
  const regs = Object.keys(REGIONEN).filter(r => Object.keys(ORTE).some(k => ORTE[k].region === r && D.besucht[k]));
  $('#kTabs').innerHTML = regs.map(r => `<button type="button" role="tab" data-r="${r}" aria-selected="${r === kRegion}">${esc(REGIONEN[r].name)}</button>`).join('');
  const box = $('#kMap'), Wd = Math.max(200, box.clientWidth), Hd = Math.max(200, box.clientHeight);
  // Auf breiten Bildschirmen bleibt die Karte in der Mitte und so hoch wie breit genug
  const mw = Math.min(Wd, 560), mh = Math.min(Hd, 780), ox = (Wd - mw) / 2, oy = (Hd - mh) / 2;
  const px = p => [Math.round(ox + 34 + p[0] * (mw - 68)), Math.round(oy + 44 + p[1] * (mh - 80))];
  const ids = Object.keys(ORTE).filter(k => ORTE[k].region === kRegion && sichtbar(k));
  let edges = '', nodes = '', exits = '';
  ids.forEach(a => ORTE[a].nach.forEach(b => {
    const [x1, y1] = px(ORTE[a].pos);
    if (ORTE[b].region !== kRegion){
      if (!D.besucht[a] || offen(a)) return;
      exits += `<g class="exit" data-r="${ORTE[b].region}"><path class="edge" d="M${x1} ${y1}L${x1} ${Math.max(10, y1 - 34)}"/><text x="${x1 + 8}" y="${Math.max(14, y1 - 30)}">${esc(REGIONEN[ORTE[b].region].name)} ↑</text></g>`;
      return;
    }
    if (!ids.includes(b)) return;
    const [x2, y2] = px(ORTE[b].pos);
    edges += `<path class="edge${D.besucht[a] && D.besucht[b] ? ' known' : ''}" d="M${x1} ${y1}L${x2} ${y2}"/>`;
  }));
  ids.forEach(k => {
    const o = ORTE[k];
    Object.keys(ORTE).filter(b => ORTE[b].nach.includes(k) && ORTE[b].region !== kRegion).forEach(b => {
      const [x, y] = px(o.pos);
      exits += `<g class="exit" data-r="${ORTE[b].region}"><path class="edge" d="M${x} ${y}L${x} ${Math.min(Hd - 8, y + 30)}"/><text x="${x + 8}" y="${Math.min(Hd - 4, y + 30)}">↓ ${esc(REGIONEN[ORTE[b].region].name)}</text></g>`;
    });
  });
  ids.forEach(k => {
    const o = ORTE[k], [x, y] = px(o.pos), cls = ['node'];
    if (!D.besucht[k]) cls.push('unbekannt');
    if (o.feuer && D.lit[k]) cls.push('feuer');
    if (o.boss && D.besucht[k]){ cls.push('boss'); if (D.bosse[o.boss]) cls.push('besiegt'); }
    if (k === kSel) cls.push('sel');
    const left = o.pos[0] > .62;
    let g = `<g class="${cls.join(' ')}" data-o="${k}" transform="translate(${x} ${y})"><circle r="22" fill="transparent"/>`;
    if (k === D.ort) g += '<circle class="here" r="11"/>';
    g += '<circle class="dot" r="7"/>';
    if (o.feuer && D.lit[k]) g += '<path class="flame" d="M0 -4.6c2.2 2 3 3.6 3 5.2a3 3 0 0 1-6 0c0-1.2.7-2 1.4-2.8.2 1 .8 1.5 1.3 1.5 0-1.5-.4-2.6.3-3.9z"/>';
    else if (o.boss && D.besucht[k] && !D.bosse[o.boss]) g += '<path class="foe" d="M0 -3.6L3.6 0 0 3.6-3.6 0z"/>';
    else if (D.besucht[k] && offen(k)) g += '<circle class="foe" r="2.4"/>';
    g += `<text x="${left ? -13 : 13}" y="4" text-anchor="${left ? 'end' : 'start'}">${esc(D.besucht[k] ? o.name : o.name + ' ?')}</text></g>`;
    nodes += g;
  });
  box.innerHTML = `<svg viewBox="0 0 ${Wd} ${Hd}" role="img" aria-label="Karte: ${esc(REGIONEN[kRegion].name)}">${edges}${exits}${nodes}</svg>`;
  kInfo();
}
function kInfo(){
  const box = $('#kInfo');
  if (!kSel){
    box.innerHTML = `<h3>${esc(REGIONEN[kRegion].name)}</h3><p>Tippe auf einen Ort. Gehen kannst du zu benachbarten Orten, reisen zu jedem entfachten Leuchtfeuer.</p>`;
    return;
  }
  const o = ORTE[kSel], w = wegNach(kSel);
  box.innerHTML = `<h3>${esc(o.name)}</h3><p>${esc(ortStatus(kSel) || REGIONEN[o.region].name)}</p>` +
    (w.ok ? `<button type="button" class="btn primary" id="kGo">${w.art === 'reisen' ? 'Hierher reisen' : 'Hierher gehen'}</button>` : `<p>${esc(w.grund)}</p>`);
  if (w.ok) $('#kGo').addEventListener('click', () => { Snd.play('choice'); const ziel = kSel; blende(() => geheZu(ziel, w.art === 'reisen' ? 'reise' : 'weg')); });
}
$('#kTabs').addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (!b) return; Snd.play('ui'); kRegion = b.dataset.r; kSel = null; renderKarte(); });
$('#kMap').addEventListener('click', e => {
  const x = e.target.closest('.exit'); if (x){ Snd.play('ui'); kRegion = x.dataset.r; kSel = null; renderKarte(); return; }
  const n = e.target.closest('.node'); if (!n) return;
  Snd.play('ui'); kSel = n.dataset.o; renderKarte();
});
$('#btnKarte').addEventListener('click', () => { Snd.init(); Snd.play('ui'); karte(); });
$('#btnKarteZu').addEventListener('click', () => { Snd.play('ui'); show('ort'); });

/* ---------- Ausrüstung und Einstellungen ---------- */
function menue(){
  const p = profil(), w = WAFFEN[D.waffe], a = D.attr;
  const talName = i => D.tal[i] ? TALISMANE[D.tal[i]].name : 'leer';
  sheet(`<h3>${esc(HERK[D.herk].name)}${EMB && EMB.name ? ` <small style="font:italic 500 16px var(--serif);color:var(--mist)">${esc(EMB.name)}</small>` : ''}</h3>
    ${dl([['Stufe', D.lvl], ['Glut', fmt(D.glut)], ['Phiolen', D.flasksMax], ['Leben', p.hpMax], ['Ausdauer', p.stMax], ['Fokus', p.fpMax]])}
    ${dl([[ATTR.vit.name, a.vit], [ATTR.aus.name, a.aus], [ATTR.str.name, a.str], [ATTR.ges.name, a.ges]], 'stats four')}
    <p class="sec">Ausrüstung</p>
    ${row('waffe', 'Waffe', `${w.name} +${D.waffen[D.waffe] || 0} · Kunst: ${w.art.name}`, '›')}
    ${row('schild', 'Schild', w.klasse === 'klinge' ? (D.schild ? SCHILDE[D.schild].name : 'keiner') : 'Nur mit einhändigen Klingen', '›', { off: w.klasse !== 'klinge' })}
    ${row('tal0', 'Talisman', talName(0), '›')}
    ${row('tal1', 'Talisman', talName(1), '›')}
    ${row('items', 'Gegenstände', Object.keys(D.items).filter(k => D.items[k] > 0).map(k => GEGENSTAENDE[k].name).join(', ') || 'keine', '›')}
    <p class="sec">Einstellungen</p>
    ${row('sound', 'Ton', '', S.sound ? 'an' : 'aus')}
    ${hasVoices() ? row('voice', 'Stimmen', 'Erzähler und Figuren sprechen', S.voice ? 'an' : 'aus') : ''}
    ${row('ring', 'Zeitring', 'Zeigt im Kampf, wann der nächste Treffer kommt', S.ring ? 'an' : 'aus')}
    ${EMB ? '' : row('vib', 'Vibration', '', S.vib ? 'an' : 'aus')}
    ${row('help', 'Steuerung im Kampf', 'Die Regeln noch einmal')}
    ${row('title', EMB ? 'Zurück zum Couchclub' : 'Zum Titel', 'Das Spiel ist gespeichert')}
    <button type="button" class="btn ghost" data-a="x">Schließen</button>`, {
    keepScroll: true,
    on(k, b){
      const flip = (key, lbl) => { S[key] = !S[key]; saveSettings(); b.querySelector('.val').textContent = S[key] ? 'an' : 'aus'; };
      switch (k){
        case 'x': return closeSheet();
        case 'waffe': return waffenWahl();
        case 'schild': return schildWahl();
        case 'tal0': case 'tal1': return talWahl(+k.slice(3));
        case 'items': return gegenstaende();
        case 'sound': flip('sound'); Snd.setOn(S.sound); if (!S.sound) Voice.stop(); else if (!Music.mode()) Music.play('amb'); return;
        case 'voice': flip('voice'); if (!S.voice) Voice.stop(); return;
        case 'ring': return flip('ring');
        case 'vib': return flip('vib');
        case 'help': closeSheet(false); return tutorial(menue);
        case 'title': closeSheet(false); speichern(); return EMB ? ccLeave() : titel();
      }
    }
  });
}
function nachWechsel(){
  const P = heldAufBuehne();
  playAnim(P, [[0, SETS[P.set].idle]]);
  const p = profil(); if (D.hp != null) D.hp = Math.min(D.hp, p.hpMax);
  speichern(); obar(); if (!$('#stStats').hidden) $('#stStats').innerHTML = feuerStats();
}
function waffenWahl(){
  const rows = Object.keys(D.waffen).map(k => {
    const w = WAFFEN[k], d = Math.round(w.light[0].d * profil(k).dmgMul);
    return row(k, `${w.name} +${D.waffen[k]}`, `${w.text} Kunst: ${w.art.name}, ${w.art.text}`, `${d}<small> Schaden</small>`, { on: k === D.waffe });
  });
  sheet(`<h3>Waffe</h3><p>Der Schaden gilt für den ersten leichten Schlag, mit deinen Attributen.</p>${rows.join('')}<button type="button" class="btn ghost" data-a="x">Zurück</button>`, {
    onClose: menue,
    on(k){ if (k !== 'x' && WAFFEN[k]){ D.waffe = k; nachWechsel(); Snd.play('block'); } closeSheet(); }
  });
}
function schildWahl(){
  const rows = Object.keys(D.schilde).map(k => row(k, SCHILDE[k].name, `${SCHILDE[k].text} Fängt ${Math.round(SCHILDE[k].block * 100)} % ab.`, '', { on: k === D.schild }));
  sheet(`<h3>Schild</h3>${rows.join('')}${row('none', 'Ohne Schild', 'Blocken mit der Waffe', '', { on: !D.schild })}<button type="button" class="btn ghost" data-a="x">Zurück</button>`, {
    onClose: menue,
    on(k){ if (k === 'none'){ D.schild = null; nachWechsel(); } else if (SCHILDE[k]){ D.schild = k; nachWechsel(); Snd.play('block'); } closeSheet(); }
  });
}
function talWahl(slot){
  const other = D.tal[1 - slot];
  const rows = Object.keys(D.tals).filter(k => k !== other).map(k => row(k, TALISMANE[k].name, TALISMANE[k].text, '', { on: D.tal[slot] === k }));
  sheet(`<h3>Talisman</h3>${rows.length ? rows.join('') : '<p>Du hast noch keine Talismane gefunden. Sieh dich an den Orten genau um.</p>'}${D.tal[slot] ? row('none', 'Ablegen', '') : ''}<button type="button" class="btn ghost" data-a="x">Zurück</button>`, {
    onClose: menue,
    on(k){ if (k === 'none') D.tal[slot] = null; else if (TALISMANE[k]) D.tal[slot] = k; if (k !== 'x'){ nachWechsel(); Snd.play('ui'); } closeSheet(); }
  });
}
function gegenstaende(){
  const ids = Object.keys(D.items).filter(k => D.items[k] > 0);
  const rows = ids.map(k => `<div class="row"><span><b>${esc(GEGENSTAENDE[k].name)}</b><small>${esc(GEGENSTAENDE[k].text)}</small></span><span class="val">${D.items[k] > 1 ? '×' + D.items[k] : ''}</span></div>`);
  sheet(`<h3>Gegenstände</h3>${rows.length ? rows.join('') : '<p>Noch nichts gefunden.</p>'}<button type="button" class="btn ghost" data-a="x">Zurück</button>`, { onClose: menue, on(){ closeSheet(); } });
}
$('#btnMenue').addEventListener('click', () => { Snd.init(); Snd.play('ui'); if (D.herk) menue(); });

/* ---------- Kampf ---------- */
const ICON = {
  atk: '<path d="M5 19l3.2-3.2M6.8 13.8l3.4 3.4M9.3 14.7L19 5V4h-1L8.3 13.7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
  dodge: '<path d="M12 6l-6 6 6 6M19 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  block: '<path d="M12 3l7 3v5.2c0 4.6-3.2 7.9-7 9.8-3.8-1.9-7-5.2-7-9.8V6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  eye: '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/>',
  clock: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  crit: '<path d="M12 3v12M8.5 11.5L12 15l3.5-3.5M6 20h12" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
  flask: '<path d="M9.5 3h5M10.3 3v5.2L6.4 15.5a3.4 3.4 0 0 0 3 5h5.2a3.4 3.4 0 0 0 3-5l-3.9-7.3V3M8 15h8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
};
const ico = k => `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">${ICON[k]}</svg>`;
function tutorial(then){
  const R = [
    ['atk', '<b>Angriff</b> antippen, mehrmals für eine Folge. <b>Schwer</b> halten und loslassen. Lange halten lädt den Schlag auf.'],
    ['dodge', '<b>Ausweichen</b> macht dich kurz unverwundbar. Direkt vor dem Treffer ist es perfekt und bremst die Zeit.'],
    ['block', '<b>Blocken</b> halten fängt Schaden ab und kostet Ausdauer. Kurz vor dem Treffer drücken heißt <b>parieren</b>: kein Schaden, und der Gegner verliert Haltung.'],
    ['eye', 'Das Aufblitzen an der Waffe verrät den Angriff: <b class="k-p">Gold</b> lässt sich parieren, <b class="k-b">Weiß</b> nur blocken, <b class="k-u">Rot</b> nur ausweichen.'],
    ['clock', 'Der <b>Zeitring</b> schrumpft bis zum Moment des Treffers. Du kannst ihn im Menü abschalten.'],
    ['crit', 'Ist die goldene <b>Haltung</b> leer, taumelt der Gegner. Dann trifft ein <b>Todesstoß</b> mit Angriff besonders hart.'],
    ['flask', 'Die <b>Phiole</b> heilt, aber manche Gegner nutzen den Moment. Leben und Phiolen füllen sich erst am Leuchtfeuer wieder.']
  ];
  S.tut = true; saveSettings();
  sheet(`<h3>Reaktionskampf</h3>
    <ul class="rules">${R.map(([i, t]) => `<li><i>${ico(i)}</i><span>${t}</span></li>`).join('')}</ul>
    <p class="keys">Tastatur: Leertaste Angriff, H Schwer, K Ausweichen, L Blocken, U Kunst, E Phiole, Esc Pause. Auf dem Bild: tippen greift an, wischen weicht aus.</p>
    <button type="button" class="btn primary" data-a="go">Verstanden</button>`, { onClose: then, on: () => closeSheet() });
}
let fightOrt = null;
function kampf(){
  const go = () => {
    const id = D.ort, o = ORTE[id], foes = o.boss ? [o.boss] : o.kampf.slice();
    fightOrt = id; clearTimeout(panelT); panelTok++; Voice.stop();
    show('fight'); World.set(o.arena || o.welt); World.reset();
    Stage.N = null; Stage.showN = false;
    const P = heldAufBuehne(); P.stance = null;
    Music.play(o.boss ? 'boss' : 'kampf');
    Fight.start({ foes, profil: profil(), zustand: { hp: D.hp, fp: D.fp, flasks: D.flasks }, scale: o.scale || 1, onEnd: kampfEnde });
    setupHud(); wake(true);
    const d = FEINDE[foes[0]];
    if (d.boss){
      Voice.warm([foes[0] + '.intro', foes[0] + '.line2']);
      banner(d.name, 'boss', d.title, 2200).then(() => { if (fightOrt === id && Fight.on() && d.intro) Fight.hook.line(d.intro, 4200, foes[0] + '.intro'); });
    }
    if (D.drop && D.drop.ort === id) toast(`Deine Glut liegt hier: ${fmt(D.drop.n)}`, 2600);
  };
  if (!S.tut) tutorial(() => blende(go)); else blende(go);
}
function kampfEnde(r, x){
  const id = fightOrt, o = ORTE[id];
  D.hp = x.hp; D.fp = x.fp; D.flasks = x.flasks;
  D.st.paraden += x.stats.parries; D.st.perfekt += x.stats.perfect; D.st.kaempfe++;
  wake(false); Fight.stop();
  if (r === 'dead'){ Music.stop(2.5); banner('Ertrunken', 'dead', '', 3000).then(tod); return; }
  D.glut += x.glut;
  const noten = [];
  if (D.drop && D.drop.ort === id) noten.push(glutAufheben());
  if (o.boss){
    D.bosse[o.boss] = true; D.merker[o.boss] = true;
    const gab = o.beute ? geben(o.beute) : [];
    speichern(); Music.stop(3);
    banner('Bezwungen', 'win', FEINDE[o.boss].name, 4000).then(() => {
      const texte = (o.nachBoss || [o.leer]).map((t, i) => ({ t, voice: id + '.nach' + i }))
        .concat(gab.map(g => ({ t: 'Erhalten: ' + g, cls: 'gabe' })), noten, [{ t: `+${fmt(x.glut)} Glut`, cls: 'gabe' }]);
      zeigeOrt({ texte, choices: o.ende ? [{ t: 'Weiter', cls: 'main', fn: akt1Ende }] : null });
    });
    return;
  }
  D.geraeumt[id] = true;
  speichern();
  toast(`+${fmt(x.glut)} Glut`, 2200);
  setTimeout(() => { if (cur === 'fight' && !Fight.on()) blende(() => zeigeOrt({ texte: [{ t: o.leer }].concat(noten) })); }, 1300);
}
function tod(){
  D.st.tode++;
  const verloren = D.drop;
  D.drop = D.glut > 0 ? { ort: fightOrt || D.ort, n: D.glut } : null; D.glut = 0;
  D.hp = null; D.fp = null; D.flasks = D.flasksMax; D.geraeumt = {};
  D.von = null; D.ort = D.feuer;
  speichern();
  const extra = [];
  if (verloren) extra.push({ t: `Die Glut, die noch am Boden lag (${fmt(verloren.n)}), ist erloschen.`, cls: 'note' });
  if (D.drop) extra.push({ t: `Deine Glut (${fmt(D.drop.n)}) liegt noch am Ort „${ORTE[D.drop.ort].name}“. Hol sie dir, bevor du noch einmal stirbst.`, cls: 'note' });
  blende(() => {
    ortBuehne();
    const P = Stage.P, S2 = SETS[P.set];
    P.pose = mkPose({}, S2.lie); playAnim(P, [[0, S2.lie], [900, S2.lie], [1700, S2.kneel, EASE.io], [2500, S2.idle, EASE.io]]);
    if (O().feuer) feuerPanel('tod', extra);
    else zeigeOrt({ behalten: true, texte: [{ t: SAETZE['feuer.tod'], voice: 'feuer.tod' }].concat(extra) });
  });
}
function fliehen(){
  const pl = Fight.pl();
  if (pl){ D.hp = pl.hp; D.fp = pl.fp; D.flasks = pl.flasks; }
  Fight.stop(); wake(false);
  const nb = nachbarn(D.ort).zurueck, ziel = D.von && ORTE[D.von] ? D.von : nb[0];
  blende(() => ziel ? geheZu(ziel, 'flucht') : zeigeOrt());
}

/* ---------- Ende von Akt I ---------- */
function akt1Ende(){
  const erst = !D.ende; D.ende = true; speichern();
  clearTimeout(panelT); panelTok++; Voice.stop();
  show('ende'); Stage.showE = false; Stage.showN = false;
  Music.play('amb');
  if (erst){ Snd.bell(98, .3, 6, .85); setTimeout(() => Snd.bell(98, .2, 5, .85), 600); }
  const min = Math.max(1, Math.floor(D.st.ms / 60000)), zeit = min >= 60 ? `${Math.floor(min / 60)} Std. ${min % 60} Min.` : `${min} Min.`;
  $('#eText').textContent = 'Im Osten glüht Grauhall, die Schmiedefeste. Dort läutet die nächste Glocke. Und hinter dir steigt das Wasser.';
  $('#eStats').innerHTML = [
    ['Spielzeit', zeit], ['Stufe', D.lvl], ['Bosse', `${Object.keys(D.bosse).length} von 4`], ['Tode', D.st.tode],
    ['Paraden', D.st.paraden], ['Talismane', `${Object.keys(D.tals).length} von ${Object.keys(TALISMANE).length}`]
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  const ch = $('#eChoices'); ch.innerHTML = '';
  [{ t: 'Weiter erkunden', sub: 'Was du noch nicht gefunden hast, wartet', fn: () => blende(() => zeigeOrt()), main: true },
   { t: EMB ? 'Zurück zum Couchclub' : 'Zum Titel', fn: () => EMB ? ccLeave() : titel() }].forEach(w => {
    const b = el('button', 'choice in' + (w.main ? ' main' : ''), `<b>${esc(w.t)}</b>${w.sub ? `<small>${esc(w.sub)}</small>` : ''}`);
    b.type = 'button'; b.addEventListener('click', () => { Snd.play('choice'); w.fn(); });
    ch.appendChild(b);
  });
}

/* ---------- Anzeige im Kampf ---------- */
const hudEl = {};
let lagFoe = 1, lagP = 1, lastHpN = '', lastFlask = -1, lastGlut = -1;
function setupHud(){
  ['foeName', 'foeTitle', 'foeHp', 'foeLag', 'foePz', 'pHp', 'pLag', 'pSt', 'pFp', 'pHpN', 'flaskN', 'atkLbl', 'glutN'].forEach(k => { hudEl[k] = $('#' + k); });
  hudEl.cb = {}; $$('#rtc .cb').forEach(b => { hudEl.cb[b.dataset.k] = b; });
  $('#artLbl').textContent = WAFFEN[D.waffe].art.name;
  lagFoe = 1; lagP = 1; lastHpN = ''; lastFlask = -1; lastGlut = -1;
  Fight.hook.foe(Fight.def(), ...Fight.count());
}
Fight.hook.foe = (def, idx, n) => {
  if (!hudEl.foeName) return;
  hudEl.foeName.textContent = def.name;
  hudEl.foeTitle.textContent = def.title || (n > 1 ? `${idx + 1} von ${n}` : '');
  lagFoe = 1;
};
function nope(b){ b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); }
Fight.hook.toast = what => {
  if (what === 'st'){ const r = $('#pStRow'); r.classList.add('warn'); setTimeout(() => r.classList.remove('warn'), 400); }
  if (what === 'fp' && hudEl.cb){ nope(hudEl.cb.art); toast('Nicht genug Fokus', 1000); }
  if (what === 'flask' && hudEl.cb){ nope(hudEl.cb.flask); toast('Keine Phiole mehr', 1000); }
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
  const pl = Fight.pl(), en = Fight.en();
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
  if (pl.flasks !== lastFlask){ hudEl.flaskN.textContent = pl.flasks; lastFlask = pl.flasks; }
  const g = D.glut + Fight.glut();
  if (g !== lastGlut){ hudEl.glutN.textContent = fmt(g); lastGlut = g; }
  const cb = hudEl.cb;
  cb.flask.classList.toggle('off', pl.flasks <= 0);
  cb.art.classList.toggle('off', pl.fp < pl.waffe.art.fp);
  const crit = Fight.critReady();
  cb.atk.classList.toggle('crit', crit);
  hudEl.atkLbl.textContent = crit ? 'Todesstoß' : 'Angriff';
  const low = pl.st < 12;
  cb.dodge.classList.toggle('off', low); cb.heavy.classList.toggle('off', low);
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
  if (cur === 'karte' && e.key === 'Escape'){ show('ort'); return; }
  if (cur === 'title' && e.key === 'Escape' && EMB){ ccLeave(); return; }
  if (cur !== 'fight') return;
  if (e.key === 'Escape'){ pauseSheet(); return; }
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
  if (document.hidden && !Fight.on()) speichern();
});
window.addEventListener('pagehide', () => { if (!Fight.on()) speichern(); });

function pauseSheet(){
  if (!Fight.on()) return;
  Fight.setPaused(true);
  $$('#rtc .cb').forEach(b => b.classList.remove('on'));
  const boss = Fight.def() && Fight.def().boss;
  sheet(`<h3>Pause</h3>
    ${row('resume', 'Weiterkämpfen')}
    ${row('ring', 'Zeitring', 'Zeigt, wann der nächste Treffer kommt', S.ring ? 'an' : 'aus')}
    ${row('sound', 'Ton', '', S.sound ? 'an' : 'aus')}
    ${hasVoices() ? row('voice', 'Stimmen', 'Erzähler und Figuren sprechen', S.voice ? 'an' : 'aus') : ''}
    ${row('help', 'Steuerung', 'Die Regeln noch einmal')}
    ${row('flee', 'Zurückweichen', boss ? 'Du gehst zurück. Der Boss wartet, sein Leben füllt sich wieder.' : 'Du gehst zurück. Die Gegner bleiben hier.')}`, {
    onClose: () => Fight.setPaused(false),
    on(a, b){
      if (a === 'resume') return closeSheet();
      if (a === 'ring'){ S.ring = !S.ring; saveSettings(); b.querySelector('.val').textContent = S.ring ? 'an' : 'aus'; return; }
      if (a === 'sound'){ S.sound = !S.sound; saveSettings(); Snd.setOn(S.sound); b.querySelector('.val').textContent = S.sound ? 'an' : 'aus'; if (S.sound && !Music.mode()) Music.play(boss ? 'boss' : 'kampf'); return; }
      if (a === 'voice'){ S.voice = !S.voice; saveSettings(); b.querySelector('.val').textContent = S.voice ? 'an' : 'aus'; if (!S.voice) Voice.stop(); return; }
      if (a === 'help'){ closeSheet(false); tutorial(() => Fight.setPaused(false)); return; }
      if (a === 'flee'){ closeSheet(false); fliehen(); }
    }
  });
}

/* ---------- Start ---------- */
function init(){
  resize();
  window.addEventListener('resize', resize);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
  titel();
  requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
  const s = gespeichert();
  ccPost({ t: 'ready', sum: s ? { runs: 1, lvl: s.lvl, bosse: Object.keys(s.bosse).length, tode: s.st.tode, min: Math.floor(s.st.ms / 60000), akt: s.ende ? 1 : 0 } : { runs: 0 } });
  if (DEBUG) window.__mg = {
    D: () => D, setD: d => { D = d; }, neuesSpiel, S, Fight, Stage, World, Voice, profil, geheZu, zeigeOrt, kampf, rasten, karte, menue,
    gespraech, akt1Ende, titel, intro, speichern, gespeichert, offen, wegNach, aufsteigen, amboss, handel, feuerPanel, heldAufBuehne, cur: () => cur
  };
}
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(init);
else init();
