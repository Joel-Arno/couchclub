/* =====================================================================
   ABLAUF: Spielstand, Erkunden, Kämpfe, Gespräche, Leuchtfeuer, Tod
   ===================================================================== */
LOOK.leer = Object.assign({}, LOOK.kron, { off: null });

/* ---------- Spielstand (pro Spieler im Couchclub) ---------- */
const SAVE_KEY = 'mondgelaeut-v2' + (EMB && EMB.p ? '@' + EMB.p : '');
function neuesSpiel(){
  return {
    v: 2, herk: null, lvl: 1, attr: { vit: 0, aus: 0, str: 0, ges: 0 }, glut: 0, drop: null,
    gebiet: START.gebiet, pos: null, feuer: null, feuerOrt: {}, lit: {},
    tot: {}, bosse: {}, genommen: {}, offen: {}, bruch: {}, ereignisse: {}, besucht: {}, gelesen: {}, merker: {},
    items: {}, waffen: {}, waffe: null, schild: null, schilde: {}, tals: {}, tal: [null, null], laden: {},
    flasksMax: 3, flasks: 3, hp: null, fp: null, ende: false,
    st: { tode: 0, paraden: 0, perfekt: 0, kaempfe: 0, ms: 0 }, t0: Date.now()
  };
}
let D = neuesSpiel();
function gespeichert(){
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!d || d.v !== 2 || !HERK[d.herk]) return null;
    const n = neuesSpiel();
    for (const k in n) if (d[k] === undefined) d[k] = n[k];
    d.st = Object.assign(n.st, d.st);
    if (!GEBIETE[d.gebiet]){ d.gebiet = START.gebiet; d.pos = null; }
    if (!WAFFEN[d.waffe]) d.waffe = HERK[d.herk].waffe;
    return d;
  } catch (e) { return null; }
}
let lastSave = 0;
function speichern(){
  if (!D.herk) return;
  lastSave = performance.now();
  if (modus === 'welt' && Erk.gebiet()){ D.gebiet = Erk.gebiet().id; D.pos = { x: Math.round(Erk.S.sicher[0]), y: Math.round(Erk.S.sicher[1]) }; }
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(D)); } catch (e) {}
  ccPost({ t: 'save', sum: ccSumme() });
}
function ccSumme(d = D){
  return { runs: d.herk ? 1 : 0, lvl: d.lvl, bosse: Object.keys(d.bosse).length, tode: d.st.tode, min: Math.floor(d.st.ms / 60000), akt: d.ende ? 1 : 0 };
}
function ccLeave(){ speichern(); ccPost({ t: 'leave', sum: ccSumme() }); }

/* ---------- Werte des Helden ---------- */
const lvlKosten = () => Math.round(110 * Math.pow(1.27, D.lvl - 1) / 10) * 10;
const anzahl = id => D.items[id] || 0;
function tals(){ return D.tal.filter(k => k && D.tals[k]).map(k => TALISMANE[k]); }
function profil(waffe = D.waffe, attr = D.attr){
  const h = HERK[D.herk], w = WAFFEN[waffe], T2 = tals(), stufe = D.waffen[waffe] || 0;
  const mul = k => T2.reduce((m, t) => m * (t[k] || 1), 1);
  const sh = w.klasse === 'klinge' && D.schild ? SCHILDE[D.schild] : null, kb = KLASSE_BLOCK[w.klasse];
  return {
    hpMax: Math.round((90 + attr.vit * 12) * mul('hp')), stMax: 80 + attr.aus * 8, fpMax: h.fp,
    flasksMax: D.flasksMax, heal: Math.max(.42, ...T2.map(t => t.heal || 0)),
    waffe: w, dmgMul: (1 + .1 * stufe) * (1 + attr.str * w.skal.str + attr.ges * w.skal.ges) * mul('dmg'),
    block: sh ? sh.block : kb.block, blockSt: (sh ? sh.st : kb.st) * mul('blockSt'), dodgeSt: w.dodgeSt || 22,
    stRegen: mul('stRegen'), pzMul: mul('pz'), parryFp: 10 * mul('parryFp')
  };
}
const hpJetzt = () => { const p = profil(); return D.hp == null ? p.hpMax : Math.min(p.hpMax, D.hp); };
function heldAufBuehne(){
  const P = Stage.hero(D.herk || 'kron', D.waffe || 'langschwert', D.schild);
  Stage.showP = true; P.alpha = 1; P.hideW = false; P.glow = 0; P.H = HELD_H;
  if (!D.herk){ P.look = LOOK.leer; P.hideW = true; }
  return P;
}
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
  if (g.glut){ D.glut += g.glut; out.push(fmt(g.glut) + ' Glut'); }
  return out;
}

/* ---------- Bildschirme ---------- */
const SCREENS = ['title', 'prolog', 'welt', 'fight', 'dialog', 'lesen', 'feuer', 'karte', 'ende'];
let modus = 'titel', pause = false;
function show(id){ SCREENS.forEach(s => { $('#' + s).hidden = s !== id; }); }
function pausiere(v){ pause = v; if (v) Eingabe.loslassen(); }
function blende(fn, ms = 380){
  const f = $('#fade');
  return new Promise(res => {
    f.classList.add('on');
    setTimeout(() => { fn && fn(); requestAnimationFrame(() => requestAnimationFrame(() => { f.classList.remove('on'); res(); })); }, reduceMotion ? 0 : ms);
  });
}
const warte = ms => new Promise(r => setTimeout(r, ms));
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
function toast(t, ms = 1900){
  const e = $('#toast'); e.textContent = t; e.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { e.hidden = true; }, ms);
}
let hinweisT = 0;
function hinweis(t, ms = 3800){
  const e = $('#wHinweis'); e.textContent = t; e.hidden = false;
  requestAnimationFrame(() => e.classList.add('in'));
  clearTimeout(hinweisT); hinweisT = setTimeout(() => { e.classList.remove('in'); setTimeout(() => { e.hidden = true; }, 500); }, ms);
}
let ortT = 0;
function ortName(name, sub){
  const e = $('#wOrt'); e.innerHTML = esc(name) + (sub ? `<small>${esc(sub)}</small>` : '');
  e.classList.add('in'); clearTimeout(ortT); ortT = setTimeout(() => e.classList.remove('in'), 2600);
}
let wl = null;
async function wake(on){
  try {
    if (on && !wl && navigator.wakeLock) wl = await navigator.wakeLock.request('screen');
    else if (!on && wl){ const w = wl; wl = null; await w.release(); }
  } catch (e) { wl = null; }
}
function el(tag, cls, html){ const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

/* ---------- Leinwand und Bildschleife ---------- */
const cv = $('#stage'), ctx = cv.getContext('2d');
let wt = 0, last = performance.now();
function resize(){
  const r = Math.min(2, window.devicePixelRatio || 1), b = $('#app').getBoundingClientRect();
  const w = Math.max(1, Math.round(b.width)), h = Math.max(1, Math.round(b.height));
  cv.width = Math.round(w * r); cv.height = Math.round(h * r);
  ctx.setTransform(r, 0, 0, r, 0, 0);
  World.resize(w, h, r); Stage.place();
  if (modus === 'karte') renderKarte();
  if (modus === 'kampf') kampfKamera();
}
function frame(now){
  const dt = Math.min(50, now - last); last = now; wt += dt;
  if (!pause){
    if (modus === 'kampf'){ Fight.update(dt); Erk.update(dt, D, true); }
    else if (modus === 'prolog') Prolog.update(dt);
    else if (Erk.gebiet()) Erk.update(dt, D);
    if (modus === 'welt') weltSchritt(dt);
    if (modus === 'titel') titelKamera(dt);
    World.updateFx(dt);
  }
  if (modus !== 'titel' && modus !== 'prolog' && D.herk && !document.hidden && !pause){
    D.st.ms += dt;
    if (now - lastSave > 30000 && modus === 'welt') speichern();
  }
  if (modus === 'prolog') Prolog.draw(ctx, wt, dt);
  else World.draw(ctx, wt, dt, {
    hinten: c => { Erk.zeichneHinten(c, D); zeichneDrop(c); },
    figuren: c => { Erk.figuren(c); if (Fight.on()) Fight.drawActors(c); },
    kampf: c => Fight.drawFx(c),
    spiegel: c => Erk.figuren(c, true),
    vorn: c => { Erk.zeichneVorn(c, D); if (modus === 'welt') zeichneMarke(c); }
  });
  if (modus === 'welt') hudWelt(dt);
  if (modus === 'kampf' && Fight.pl()) hud(dt);
  requestAnimationFrame(frame);
}

/* ---------- Titel ---------- */
let titelT = 0;
function titel(){
  Fight.stop(); wake(false); Voice.stop(); modus = 'titel'; pausiere(false);
  show('title');
  D = neuesSpiel();
  heldAufBuehne();
  Erk.betrete(TITEL.gebiet, { x: TITEL.x, y: TITEL.y }, D);
  Stage.showP = false; Erk.setAus(true);
  World.focus(TITEL.x, TITEL.y - 120, .9, .002); World.letterbox(0);
  const s = gespeichert(), box = $('#tActions');
  const btn = (cls, t, sub, fn) => {
    const b = el('button', 'btn ' + cls, `<span>${esc(t)}</span>${sub ? `<small>${esc(sub)}</small>` : ''}`);
    b.type = 'button'; b.addEventListener('click', () => { Snd.init(); Snd.play('choice'); fn(); }); box.appendChild(b);
  };
  box.innerHTML = '';
  if (s){
    btn('primary', 'Fortsetzen', `${HERK[s.herk].name} · Stufe ${s.lvl} · ${GEBIETE[s.gebiet].name}`, () => fortsetzen(s));
    btn('ghost', 'Neues Spiel', '', () => sheet(`<h3>Neues Spiel?</h3><p>Dein Spielstand (${esc(HERK[s.herk].name)}, Stufe ${s.lvl}) wird überschrieben. Das lässt sich nicht rückgängig machen.</p>
      <button type="button" class="btn primary" data-a="neu">Neu beginnen</button><button type="button" class="btn ghost" data-a="x">Abbrechen</button>`, {
      on(a){ closeSheet(false); if (a === 'neu') neuesAbenteuer(); }
    }));
  } else btn('primary', 'Erwachen', '', neuesAbenteuer);
  $('#btnLeave').hidden = !EMB; $('#tHint').hidden = !!EMB;
  syncSound();
  if (Snd.ac()) Music.play('amb');
}
function titelKamera(dt){ titelT += dt; World.focus(TITEL.x + Math.sin(titelT * .00007) * 260, TITEL.y - 130, .92, .002); }
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
  blende(() => { heldAufBuehne(); betrete(D.gebiet, D.pos || START.anker, { still: true }); });
}
function neuesAbenteuer(){
  D = neuesSpiel();
  blende(() => { modus = 'prolog'; show('prolog'); Music.play('amb'); Prolog.start(() => blende(erwachen, 900)); }, 700);
}

/* ---------- Erwachen und Herkunft ---------- */
async function erwachen(){
  modus = 'szene'; show('dialog');
  heldAufBuehne();
  Erk.betrete(START.gebiet, START.anker, D);
  Erk.setAus(true);
  const P = Stage.P; P.poseFn = null; P.stance = 'lie'; P.pose = mkPose({}, SETS[P.set].lie); P.anim = null;
  World.focus(Erk.S.x + 30, Erk.S.y - 70, 1.3, .003); World.letterbox(1);
  for (let i = 0; i < ANFANG.erwachen.length; i++){ if (i === 2) Snd.play('heart'); await zeile('', ANFANG.erwachen[i], { voice: 'erwachen.' + i }); }
  playAnim(P, [[0, SETS[P.set].lie], [900, SETS[P.set].kneel, EASE.io]], true); P.stance = 'kneel'; Snd.play('rise');
  const k = await wahl('', ANFANG.herkunft[0], Object.entries(HERK).map(([id, h]) => ({ t: h.item, sub: `${h.name}. ${h.blurb}`, v: id })));
  const h = HERK[k];
  Object.assign(D, { herk: k, attr: Object.assign({}, h.attr), waffe: h.waffe, waffen: { [h.waffe]: 0 }, schild: h.schild, schilde: h.schild ? { [h.schild]: true } : {}, t0: Date.now() });
  const old = Stage.P, P2 = heldAufBuehne();
  P2.pose = old.pose; P2.t = old.t; P2.stance = null; P2.poseFn = null;
  playAnim(P2, [[0, SETS[P2.set].kneel], [300, SETS[P2.set].kneel], [1100, SETS[P2.set].idle, EASE.io]]);
  Snd.play('rise');
  await zeile('', h.rise, { voice: 'herk.' + k });
  D.besucht[START.gebiet] = true;
  P2.poseFn = bewegungsPose; P2.anim = null;
  Erk.setAus(false);
  welt();
  speichern();
  ortName(GEBIETE[START.gebiet].name, REGIONEN[GEBIETE[START.gebiet].region].name);
  setTimeout(() => { if (modus === 'welt') hinweis('Tippe links auf den Bildschirm und ziehe, um zu laufen.', 5500); }, 2800);
}

/* ---------- Gespräch und Zwischenszene ---------- */
let zeileWeiter = null;
function zeile(wer, text, o = {}){
  return new Promise(res => {
    show('dialog');
    $('#dWer').textContent = wer || '';
    const t = $('#dText'); t.textContent = o.rede ? '„' + text + '“' : text; t.classList.toggle('rede', !!o.rede);
    $('#dWahl').innerHTML = ''; $('#dWeiter').hidden = false;
    t.style.transition = 'none'; t.style.opacity = 0;
    requestAnimationFrame(() => requestAnimationFrame(() => { t.style.transition = 'opacity .6s'; t.style.opacity = 1; }));
    let fertig = false;
    const start = performance.now();
    zeileWeiter = () => { if (fertig || performance.now() - start < 250) return; fertig = true; zeileWeiter = null; Voice.stop(); res(); };
    if (o.voice && Voice.ok(o.voice)) Voice.say(o.voice);
  });
}
function wahl(wer, text, optionen, o = {}){
  return new Promise(res => {
    show('dialog');
    $('#dWer').textContent = wer || '';
    const t = $('#dText'); t.textContent = o.rede ? '„' + text + '“' : text; t.classList.toggle('rede', !!o.rede);
    t.style.transition = 'none'; t.style.opacity = 0;
    requestAnimationFrame(() => requestAnimationFrame(() => { t.style.transition = 'opacity .5s'; t.style.opacity = 1; }));
    $('#dWeiter').hidden = true; zeileWeiter = null;
    const box = $('#dWahl'); box.innerHTML = '';
    optionen.forEach(w => {
      const b = el('button', 'choice' + (w.cls ? ' ' + w.cls : ''), `<b>${esc(w.t)}</b>${w.sub ? `<small>${esc(w.sub)}</small>` : ''}`);
      b.type = 'button'; b.addEventListener('click', () => { Snd.play('choice'); box.innerHTML = ''; res(w.v); });
      box.appendChild(b);
    });
  });
}
$('#dialog').addEventListener('pointerdown', e => { if (zeileWeiter && !e.target.closest('.choice')){ Snd.play('ui'); zeileWeiter(); } });
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && zeileWeiter && modus !== 'kampf' && modus !== 'welt'){ e.preventDefault(); zeileWeiter(); } });
// Zwischenszene: Zeilen nacheinander, Kinobalken, Kamera fest
async function szene(zeilen, o = {}){
  const vorher = modus;
  modus = 'szene'; Erk.setAus(true); World.letterbox(1);
  if (o.kamera) World.focus(o.kamera[0], o.kamera[1], o.kamera[2] || 1.2, .003);
  for (const z of zeilen){
    if (typeof z === 'function'){ await z(); continue; }
    const [wer, text, opt] = Array.isArray(z) ? z : ['', z];
    await zeile(wer, text, Object.assign({ rede: !!wer }, opt));
  }
  World.letterbox(0); World.release();
  if (!o.bleiben){ Erk.setAus(false); if (vorher !== 'szene') welt(); }
}

// Gespräch mit einer Figur in der Welt
async function gespraech(ent){
  const npc = ent.def.id, key = gespraechFuer(npc, D, Erk.gebiet().id), G = GESPRAECHE[key];
  if (!G) return;
  modus = 'dialog'; Erk.setAus(true);
  const P = Stage.P, A = ent.actor;
  A.face = Math.sign(P.x - A.x) || A.face;
  World.focus((P.x + A.x) / 2, P.gy - 70, 1.35, .004); World.letterbox(1);
  if (G.setze) D.merker[G.setze] = true;
  D.gelesen['npc_' + npc] = D.gelesen['npc_' + npc] || Date.now();
  let k = G.start;
  const wer = NPC[G.wer];
  while (k){
    const n = G.k[k];
    if (n.setze) D.merker[n.setze] = true;
    let gab = [];
    if (n.nimmt && anzahl(n.nimmt)){ D.items[n.nimmt]--; gab.push('Abgegeben: ' + GEGENSTAENDE[n.nimmt].name); }
    if (n.gibt) gab = gab.concat(geben(n.gibt).map(g => 'Erhalten: ' + g));
    if (gab.length){ toast(gab.join(' · '), 2800); Snd.play('glut'); }
    const antworten = (n.a || []).filter(a => !a.wenn || a.wenn(D));
    const opts = antworten.map((a, i) => ({ t: a.t, sub: a.sub, v: i, cls: a.laden ? 'fire' : '' }));
    if (!opts.length) opts.push({ t: 'Gehen', v: -1 });
    const i = await wahl(`${wer.name} · ${wer.titel}`, typeof n.text === 'function' ? n.text(D) : n.text, opts, { rede: true });
    const a = antworten[i];
    if (!a) break;
    if (a.setze) D.merker[a.setze] = true;
    if (a.laden){ await new Promise(r => handel(G.wer, r)); continue; }
    k = a.go || null;
  }
  speichern();
  World.letterbox(0); World.release();
  Erk.setAus(false);
  welt();
  if (ent.def.wenn && !ent.def.wenn(D)) Erk.entAus(ent);
}

/* ---------- Lesen: Briefe, Inschriften, Erinnerungen ---------- */
let lesenZu = null;
function zeigeLore(id, danach){
  const L = LORE[id]; if (!L){ danach && danach(); return; }
  const erst = !D.gelesen[id];
  D.gelesen[id] = D.gelesen[id] || Date.now();
  pausiere(true);
  $('#lArt').textContent = L.art; $('#lTitel').textContent = L.titel;
  $('#lText').innerHTML = (typeof L.text === 'function' ? L.text(D) : L.text).map(p => `<p class="${p.startsWith('~') ? 'kursiv' : ''}">${esc(p.replace(/^~/, ''))}</p>`).join('');
  $('#lesen').hidden = false; $('#lesen .l-blatt').scrollTop = 0;
  Snd.play('ui');
  lesenZu = () => {
    $('#lesen').hidden = true; lesenZu = null; pausiere(false);
    if (erst && L.gibt){ const g = geben(L.gibt); toast('Erhalten: ' + g.join(', '), 2600); }
    if (erst && L.merker) D.merker[L.merker] = true;
    speichern(); danach && danach();
  };
}
$('#lZu').addEventListener('click', () => { Snd.play('ui'); lesenZu && lesenZu(); });

/* ---------- Erkunden ---------- */
function welt(){
  modus = 'welt'; show('welt'); pausiere(false);
  Eingabe.leeren();
  World.release(); World.letterbox(0);
}
function betrete(gebiet, wo, o = {}){
  const alt = Erk.gebiet(), altRegion = alt && GEBIETE[alt.id] && GEBIETE[alt.id].region;
  heldAufBuehne();
  Erk.betrete(gebiet, wo, D);
  const erst = !D.besucht[gebiet];
  D.besucht[gebiet] = true; D.gebiet = gebiet;
  const G = GEBIETE[gebiet];
  if (G.region === 'velmora') D.merker.velmora = true;
  welt();
  Music.play(G.musik || 'amb');
  if (!o.still || erst) ortName(G.name, (!altRegion || altRegion !== G.region) ? REGIONEN[G.region].name : '');
  speichern();
  if (G.betreten && SKRIPTE[G.betreten]) SKRIPTE[G.betreten](erst);
}
Erk.hook.ausgang = ziel => { const [g, a] = ziel.split(':'); Snd.play('tuer'); blende(() => betrete(g, a)); };
Erk.hook.tuer = e => { const [g, a] = e.def.ziel.split(':'); Snd.play('tuer'); blende(() => betrete(g, a)); };
Erk.hook.laut = n => Snd.play(n);
Erk.hook.hinweis = t => hinweis(t);
Erk.hook.merke = (art, key) => { if (art === 'bruch') D.bruch[key] = true; if (art === 'offen') D.offen[key] = true; speichern(); };
Erk.hook.dialog = e => gespraech(e);
Erk.hook.lesen = e => zeigeLore(e.def.lore);
Erk.hook.feuer = e => feuer(e);
Erk.hook.ereignis = e => { D.ereignisse[Erk.key(e.id)] = true; const f = SKRIPTE[e.def.skript]; if (f) f(e); };
Erk.hook.beute = e => {
  const d = e.def;
  D.genommen[Erk.key(e.id)] = true;
  const g = d.gibt ? geben(d.gibt) : [];
  Snd.play('glut');
  if (d.text) hinweis(d.text, 5600);
  if (g.length) toast('Erhalten: ' + g.join(', '), 3000);
  else if (!d.text && !d.lore) toast('Nichts mehr zu finden.');
  if (d.lore) setTimeout(() => zeigeLore(d.lore), d.text ? 900 : 300);
  if (d.skript && SKRIPTE[d.skript]) SKRIPTE[d.skript](e);
  speichern();
};
// Gefahren: Stacheln, tiefes Wasser, Abgründe
Erk.hook.schaden = (anteil, grund, zurueck) => {
  const p = profil(), d = Math.max(1, Math.round(p.hpMax * anteil));
  D.hp = hpJetzt() - d;
  World.flash('rgba(160,30,24,1)', .25); Snd.play('hurt'); buzz(40);
  World.pop(Erk.S.x, Erk.S.y - 100, String(d), '#ff8c7a', 18);
  if (D.hp <= 0){ D.hp = 0; sterben(grund === 'wasser' ? 'Ertrunken' : 'Gefallen'); return; }
  if (zurueck){
    const txt = grund === 'wasser' ? 'Die Flut zieht dich hinab und spuckt dich wieder aus.' : grund === 'sturz' ? 'Du stürzt in die Tiefe.' : '';
    blende(() => { zurueck(); if (txt) hinweis(txt, 2600); }, 500);
  }
};
function hudWelt(dt){
  const p = profil(), hp = hpJetzt();
  $('#wHp').style.transform = `scaleX(${hp / p.hpMax})`;
  $('#wLag').style.transform = `scaleX(${hp / p.hpMax})`;
  const bw = Math.min(230, 110 + p.hpMax * .6) + 'px'; if ($('#wHpBar').style.width !== bw) $('#wHpBar').style.width = bw;
  const ph = D.flasks + '/' + D.flasksMax;
  if ($('#wPhiolen').dataset.v !== ph){ $('#wPhiolen').dataset.v = ph; $('#wPhiolen').innerHTML = Array.from({ length: D.flasksMax }, (_, i) => `<i class="${i < D.flasks ? '' : 'leer'}"></i>`).join(''); }
  const g = fmt(D.glut); if ($('#wGlut').textContent !== g) $('#wGlut').textContent = g;
  const inter = Erk.inter(), b = $('#wAktion');
  if (inter){ if (b.hidden || $('#wAktionT').textContent !== inter.label){ $('#wAktionT').textContent = inter.label; b.hidden = false; } }
  else if (!b.hidden) b.hidden = true;
}
function weltSchritt(dt){
  if (Eingabe.neu('karte')) karte();
  if (Eingabe.neu('menue')) menue();
  // Liegengebliebene Glut aufheben
  const d = D.drop, G = Erk.gebiet();
  if (d && G && d.gebiet === G.id && Math.abs(Erk.S.x - d.x) < 30 && Math.abs(Erk.S.y - d.y) < 50){
    D.glut += d.n; D.drop = null;
    World.glutFlow([d.x, d.y - 10], () => chestPt(Stage.P), 40); Snd.play('glut');
    toast(`Deine Glut ist wieder bei dir: ${fmt(d.n)}`, 2600); speichern();
  }
}
function zeichneDrop(c){
  const d = D.drop, G = Erk.gebiet();
  if (!d || !G || d.gebiet !== G.id) return;
  const r = 24 * (1 + Math.sin(wt * .004) * .12);
  c.save(); c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(d.x, d.y - 8, 0, d.x, d.y - 8, r * 2);
  g.addColorStop(0, 'rgba(255,200,130,.85)'); g.addColorStop(.35, 'rgba(240,140,60,.35)'); g.addColorStop(1, 'rgba(227,120,50,0)');
  c.fillStyle = g; c.fillRect(d.x - r * 2, d.y - 8 - r * 2, r * 4, r * 4);
  c.restore();
  if (rnd() < .2) World.burst(d.x + (rnd() - .5) * 16, d.y - 6, 'ember', 1);
}
// Kleines Zeichen über dem, womit man gerade handeln kann
function zeichneMarke(c){
  const i = Erk.inter(); if (!i) return;
  const e = i.e, y = e.y - (e.actor ? e.actor.H * 1.12 : 50) - Math.sin(wt * .005) * 3;
  c.save(); c.globalAlpha = .9; c.fillStyle = 'rgba(244,192,138,.95)';
  c.beginPath(); c.moveTo(e.x, y); c.lineTo(e.x + 5, y - 5); c.lineTo(e.x, y - 10); c.lineTo(e.x - 5, y - 5); c.closePath(); c.fill();
  c.restore();
}
Eingabe.stickSetup($('#wStick'), $('#wRing'), $('#wKnopf'));
$$('.w-knoepfe .cb').forEach(b => Eingabe.knopfSetup(b, b.dataset.w));
Eingabe.knopfSetup($('#wAktion'), 'aktion');
$('#wStick').addEventListener('pointerdown', () => $('#wStickHilfe').classList.add('weg'), { once: true });
$('#btnKarte').addEventListener('click', () => { Snd.init(); Snd.play('ui'); karte(); });
$('#btnMenue').addEventListener('click', () => { Snd.init(); Snd.play('ui'); menue(); });

/* ---------- Leuchtfeuer ---------- */
let feuerEnt = null;
function feuer(e){
  const d = e.def, erst = !D.lit[d.id];
  modus = 'feuer'; Erk.setAus(true); feuerEnt = e;
  const P = Stage.P; P.poseFn = null;
  playAnim(P, [[0, SETS[P.set].idle], [700, SETS[P.set].kneel, EASE.io]], true);
  if (erst){
    D.lit[d.id] = true;
    Snd.play('fire'); World.burst(e.x, e.y - 30, 'ember', 40); World.flash('rgba(255,180,110,1)', .15);
    if (e.licht) e.licht.a = .38;
    banner('Leuchtfeuer entfacht', 'fire', d.name, 2600);
  } else Snd.play('fire');
  rasten(e, erst ? 'erst' : 'rast');
}
// Rasten: alles füllt sich, die Toten stehen wieder auf
function rasten(e, how, extra = []){
  const d = e.def;
  D.hp = null; D.fp = null; D.flasks = D.flasksMax; D.tot = {};
  D.feuer = d.id; D.feuerOrt[d.id] = [Erk.gebiet().id, e.x, e.y];
  feuerEnt = e;
  speichern();
  World.focus(e.x - 10, e.y - 60, 1.3, .004);
  show('feuer'); modus = 'feuer'; Erk.setAus(true);
  $('#fOrt').textContent = d.name;
  $('#fSatz').textContent = [how === 'tod' ? SAETZE['feuer.tod'] : SAETZE['feuer.rast']].concat(extra).join(' ');
  feuerMenue(e);
}
function feuerMenue(e){
  const d = e.def, p = profil(), k = lvlKosten();
  $('#fStats').innerHTML = [['Stufe', D.lvl], ['Glut', fmt(D.glut)], ['Leben', p.hpMax], ['Phiolen', D.flasksMax]].map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
  const L = [];
  L.push({ t: 'Aufsteigen', sub: `Stufe ${D.lvl + 1} kostet ${fmt(k)} Glut`, fn: () => aufsteigen(() => feuerMenue(e)) });
  if (anzahl('mondtau')) L.push({ t: 'Mondtau einsetzen', sub: `Eine Phiole mehr: ${D.flasksMax} → ${D.flasksMax + 1}`, fn: () => { D.items.mondtau--; D.flasksMax++; D.flasks = D.flasksMax; speichern(); Snd.play('heal'); World.burst(Stage.P.x, Stage.P.gy - 50, 'heal', 26); toast(`Du hast jetzt ${D.flasksMax} Phiolen`); feuerMenue(e); } });
  if (d.amboss) L.push({ t: 'Am Amboss arbeiten', sub: 'Waffen schärfen, Nachhall zu Waffen gießen', fn: () => amboss(() => feuerMenue(e)) });
  if (Object.keys(D.lit).length > 1) L.push({ t: 'Zu einem anderen Leuchtfeuer reisen', fn: () => karte(true) });
  L.push({ t: 'Aufbrechen', cls: 'main', fn: () => aufbrechen(e) });
  const ch = $('#fWahl'); ch.innerHTML = '';
  L.forEach(w => {
    const b = el('button', 'choice in' + (w.cls ? ' ' + w.cls : ''), `<b>${esc(w.t)}</b>${w.sub ? `<small>${esc(w.sub)}</small>` : ''}`);
    b.type = 'button'; b.addEventListener('click', () => { Snd.play('choice'); w.fn(); });
    ch.appendChild(b);
  });
}
function aufbrechen(e){
  // Das Gebiet neu betreten, damit die Toten wieder dort stehen, wo sie hingehören
  const x = e.x + 34, y = e.y;
  blende(() => { betrete(Erk.gebiet().id, { x, y }, { still: true }); }, 450);
}

/* ---------- Kampf ---------- */
let kampfGruppe = null, kampfBoss = null;
function kampf(gruppe, vorteil){
  if (!S.tut){ pausiere(true); kampfRegeln(() => { pausiere(false); kampfStart(gruppe, vorteil); }); return; }
  kampfStart(gruppe, vorteil);
}
function kampfStart(gruppe, vorteil, boss){
  kampfGruppe = gruppe; kampfBoss = boss || null;
  modus = 'kampf'; show('fight');
  const P = heldAufBuehne(), S0 = Erk.S;
  const dir = Math.sign(gruppe[0].x - S0.x) || S0.face;
  Stage.duel = { x: S0.x, gy: S0.y, dir };
  P.x = S0.x; P.gy = S0.y; P.face = dir; P.poseFn = null; P.anim = null;
  Fight.start({
    foes: gruppe.map(e => e.key), actors: gruppe.map(e => e.actor), profil: profil(),
    zustand: { hp: D.hp, fp: D.fp, flasks: D.flasks }, scale: (GEBIETE[Erk.gebiet().id].staerke || 1), onEnd: kampfEnde,
    vorteil: vorteil || (boss ? null : 'bemerkt')
  });
  setupHud(); kampfKamera(); wake(true);
  Music.play(boss ? 'boss' : 'kampf');
  if (vorteil === 'hinterhalt') setTimeout(() => toast('Hinterhalt!', 1400), 200);
}
function kampfKamera(){
  const d = Stage.duel, E = Stage.E; if (!d || !E) return;
  const dist = Stage.abstand(E), [W, H] = World.size(), zb = World.zoomBase();
  const z = clamp(Math.min((W * .8) / (dist + E.H * .9 + 80) / zb, (H * .42) / (E.H * 1.35) / zb), .9, 1.7);
  const portrait = H > W * 1.15;
  World.focus(d.x + d.dir * dist * .5, d.gy - (portrait ? 30 + H * .1 / (zb * z) : 60), z, .005);
}
Fight.hook.besiegt = i => { if (kampfGruppe && kampfGruppe[i]) kampfGruppe[i].besiegt = true; };
Fight.hook.foe = (def, idx, n) => {
  if (!hudEl.foeName) return;
  hudEl.foeName.textContent = def.name;
  hudEl.foeTitle.textContent = def.title || (n > 1 ? `${idx + 1} von ${n}` : '');
  lagFoe = 1;
  setTimeout(kampfKamera, 60);
};
function kampfEnde(r, x){
  D.hp = x.hp; D.fp = x.fp; D.flasks = x.flasks;
  D.st.paraden += x.stats.parries; D.st.perfekt += x.stats.perfect; D.st.kaempfe++;
  wake(false); Fight.stop();
  const gruppe = kampfGruppe || [];
  if (r === 'dead'){ Music.stop(2.5); sterben('Ertrunken', { x: Stage.duel.x, y: Stage.duel.gy }); return; }
  D.glut += x.glut;
  if (kampfBoss){ bossSieg(kampfBoss, x); return; }
  Erk.kampfEnde(gruppe, 'sieg', D);
  toast(`+${fmt(x.glut)} Glut`, 2000);
  Stage.duel = null; Stage.E = null; Stage.E2 = null;
  speichern();
  welt();
  Music.play(GEBIETE[Erk.gebiet().id].musik || 'amb');
}
function fliehen(){
  const pl = Fight.pl();
  if (pl){ D.hp = pl.hp; D.fp = pl.fp; D.flasks = pl.flasks; }
  Fight.stop(); wake(false);
  const gruppe = kampfGruppe || [], d = Stage.duel;
  if (kampfBoss){ kampfBoss.imKampf = false; kampfBoss.zustand = 'wartet'; }
  else Erk.kampfEnde(gruppe, 'flucht', D);
  Stage.duel = null; Stage.E = null; Stage.E2 = null;
  const boss = kampfBoss; kampfBoss = null; kampfGruppe = null;
  blende(() => {
    const G = Erk.gebiet(), S0 = Erk.S, dir = d ? d.dir : S0.face;
    let x = S0.x - dir * T * (boss ? 7 : 4);
    x = clamp(x, T, G.W - T);
    Erk.setzeSpieler(x, bodenUnter(G, x, S0.y - T * 3), -dir);
    Erk.setAus(false);
    welt(); Music.play(GEBIETE[G.id].musik || 'amb');
  });
}

/* ---------- Bosse ---------- */
Erk.hook.boss = e => bossAuftritt(e);
async function bossAuftritt(e){
  modus = 'szene'; Erk.setAus(true);
  const def = FEINDE[e.key];
  show('dialog'); $('#dWer').textContent = ''; $('#dText').textContent = ''; $('#dWahl').innerHTML = ''; $('#dWeiter').hidden = true;
  World.letterbox(1); World.focus(e.x, e.y - e.actor.H * .6, 1.05, .003);
  Music.stop(1.5); Snd.play('phase');
  if (SKRIPTE['vor_' + e.key]) await SKRIPTE['vor_' + e.key](e);
  else await warte(1300);
  const S2 = SETS[e.actor.set];
  playAnim(e.actor, [[0, S2.idle], [500, S2.W_over || S2.idle, EASE.io], [1100, S2.idle, EASE.io]]);
  await banner(def.name, 'boss', def.title, 2400);
  World.letterbox(0);
  kampfStart([e], null, e);
  if (def.intro) setTimeout(() => { if (Fight.on()) Fight.hook.line(def.intro, 4200, e.key + '.intro'); }, 600);
}
async function bossSieg(e, x){
  const key = e.key, def = FEINDE[key];
  D.bosse[key] = true; D.merker[key] = true;
  const bd = (GEBIETE[Erk.gebiet().id].o || {})[e.a] || {};
  const gab = bd.beute ? geben(bd.beute) : [];
  speichern();
  Music.stop(3);
  modus = 'szene'; show('dialog'); $('#dText').textContent = ''; $('#dWer').textContent = ''; $('#dWahl').innerHTML = ''; $('#dWeiter').hidden = true;
  await banner('Bezwungen', 'win', def.name, 3400);
  Erk.kampfEnde([e], 'sieg', D);
  Erk.bossWeg(key);
  Stage.duel = null; Stage.E = null; Stage.E2 = null; kampfBoss = null; kampfGruppe = null;
  const nach = SKRIPTE['nach_' + key];
  if (nach) await nach(e, gab, x);
  else if (gab.length) toast('Erhalten: ' + gab.join(', '), 3000);
  if (modus !== 'ende'){ Erk.setAus(false); welt(); Music.play(GEBIETE[Erk.gebiet().id].musik || 'amb'); }
  speichern();
}

/* ---------- Tod ---------- */
async function sterben(text, wo){
  modus = 'tot'; Erk.setAus(true); pausiere(false);
  D.st.tode++;
  const G = Erk.gebiet(), S0 = Erk.S;
  const verloren = D.drop, n = D.glut;
  D.drop = n > 0 ? { gebiet: G.id, x: Math.round(wo ? wo.x : S0.sicher[0]), y: Math.round(wo ? wo.y : S0.sicher[1]), n } : null;
  D.glut = 0;
  speichern();
  show('none');
  await banner(text, 'dead', '', 3000);
  const extra = [];
  if (verloren) extra.push(`Die Glut, die noch am Boden lag (${fmt(verloren.n)}), ist erloschen.`);
  if (D.drop) extra.push(`Deine Glut (${fmt(D.drop.n)}) liegt noch dort, wo du gefallen bist.`);
  await blende(() => {
    Stage.duel = null; Stage.E = null; Stage.E2 = null; kampfGruppe = null; kampfBoss = null;
    const f = D.feuer && D.feuerOrt[D.feuer];
    D.hp = null; D.fp = null; D.flasks = D.flasksMax; D.tot = {};
    if (f){
      heldAufBuehne();
      Erk.betrete(f[0], { x: f[1] + 34, y: f[2] }, D);
      D.gebiet = f[0];
      const e = Erk.ents().find(x => x.typ === 'feuer' && x.def.id === D.feuer);
      const P = Stage.P, S2 = SETS[P.set];
      P.poseFn = null; P.pose = mkPose({}, S2.lie); playAnim(P, [[0, S2.lie], [900, S2.lie], [1700, S2.kneel, EASE.io]], true);
      Music.play('amb');
      if (e) rasten(e, 'tod', extra); else betrete(f[0], { x: f[1], y: f[2] });
    } else {
      betrete(START.gebiet, START.anker);
      hinweis([SAETZE['feuer.tod']].concat(extra).join(' '), 6000);
    }
  }, 900);
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
  if (sheetOffen()){ if (e.key === 'Escape') closeSheet(); return; }
  if (lesenZu && (e.key === 'Escape' || e.key === 'Enter')){ lesenZu(); return; }
  if (modus === 'karte' && e.key === 'Escape'){ karteZu(); return; }
  if (modus === 'titel' && e.key === 'Escape' && EMB){ ccLeave(); return; }
  if (modus !== 'kampf') return;
  if (e.key === 'Escape'){ pauseSheet(); return; }
  const k = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
  if (!k || e.repeat) return;
  e.preventDefault(); Fight.press(k);
});
document.addEventListener('keyup', e => {
  const k = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
  if (k && modus === 'kampf') Fight.release(k);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && modus === 'kampf' && Fight.on() && !Fight.paused() && !sheetOffen()) pauseSheet();
  if (document.hidden && modus === 'welt') speichern();
});
window.addEventListener('pagehide', () => { if (modus === 'welt') speichern(); });
function pauseSheet(){
  if (!Fight.on()) return;
  Fight.setPaused(true);
  $$('#rtc .cb').forEach(b => b.classList.remove('on'));
  const boss = !!kampfBoss;
  sheet(`<h3>Pause</h3>
    ${row('resume', 'Weiterkämpfen')}
    ${row('ring', 'Hilfe: Zeitring', 'Zeigt, wann ein Treffer kommt. Macht es deutlich leichter.', S.ring ? 'an' : 'aus')}
    ${row('sound', 'Ton', '', S.sound ? 'an' : 'aus')}
    ${hasVoices() ? row('voice', 'Stimmen', '', S.voice ? 'an' : 'aus') : ''}
    ${row('help', 'Steuerung', 'Die Regeln noch einmal')}
    ${row('flee', 'Zurückweichen', boss ? 'Du gehst zurück. Der Boss wartet, sein Leben füllt sich wieder.' : 'Du gehst ein Stück zurück. Die Gegner erholen sich.')}`, {
    onClose: () => Fight.setPaused(false),
    on(a, b){
      if (a === 'resume') return closeSheet();
      if (a === 'ring'){ S.ring = !S.ring; saveSettings(); b.querySelector('.val').textContent = S.ring ? 'an' : 'aus'; return; }
      if (a === 'sound'){ S.sound = !S.sound; saveSettings(); Snd.setOn(S.sound); b.querySelector('.val').textContent = S.sound ? 'an' : 'aus'; return; }
      if (a === 'voice'){ S.voice = !S.voice; saveSettings(); b.querySelector('.val').textContent = S.voice ? 'an' : 'aus'; if (!S.voice) Voice.stop(); return; }
      if (a === 'help'){ closeSheet(false); kampfRegeln(() => Fight.setPaused(false)); return; }
      if (a === 'flee'){ closeSheet(false); fliehen(); }
    }
  });
}

/* ---------- Karte ---------- */
let kRegion = 'strandung', kSel = null, kReise = false, kVorher = 'welt';
function karte(reise = false){
  if (!D.herk || modus === 'kampf' || modus === 'karte') return;
  kVorher = modus; kReise = reise || modus === 'feuer'; modus = 'karte'; pausiere(true);
  kRegion = GEBIETE[Erk.gebiet().id].region; kSel = null;
  show('karte'); renderKarte();
}
function karteZu(){ pausiere(false); if (kVorher === 'feuer'){ modus = 'feuer'; show('feuer'); } else welt(); }
$('#btnKarteZu').addEventListener('click', () => { Snd.play('ui'); karteZu(); });
function renderKarte(){
  const regs = Object.keys(REGIONEN).filter(r => Object.keys(GEBIETE).some(k => GEBIETE[k].region === r && D.besucht[k]));
  $('#kTabs').innerHTML = regs.map(r => `<button type="button" role="tab" data-r="${r}" aria-selected="${r === kRegion}">${esc(REGIONEN[r].name)}</button>`).join('');
  const box = $('#kMap'), Wd = Math.max(200, box.clientWidth), Hd = Math.max(200, box.clientHeight);
  const ids = Object.keys(GEBIETE).filter(k => GEBIETE[k].region === kRegion && (D.besucht[k] || nachbarBesucht(k)));
  if (!ids.length){ box.innerHTML = ''; kInfo(); return; }
  const all = ids.map(k => GEBIETE[k].kartenPos);
  const minX = Math.min(...all.map(p => p[0])), maxX = Math.max(...all.map(p => p[0] + p[2])), minY = Math.min(...all.map(p => p[1])), maxY = Math.max(...all.map(p => p[1] + p[3]));
  const sc = Math.min((Wd - 30) / Math.max(1, maxX - minX), (Hd - 30) / Math.max(1, maxY - minY), 70);
  const ox = (Wd - (maxX - minX) * sc) / 2 - minX * sc, oy = (Hd - (maxY - minY) * sc) / 2 - minY * sc;
  const R = k => { const p = GEBIETE[k].kartenPos; return [ox + p[0] * sc, oy + p[1] * sc, p[2] * sc, p[3] * sc]; };
  let svg = '';
  ids.forEach(a => verbindungen(a).forEach(b => {
    if (!ids.includes(b) || b < a) return;
    const [x1, y1, w1, h1] = R(a), [x2, y2, w2, h2] = R(b);
    svg += `<path class="edge${D.besucht[a] && D.besucht[b] ? ' known' : ''}" d="M${x1 + w1 / 2} ${y1 + h1 / 2}L${x2 + w2 / 2} ${y2 + h2 / 2}"/>`;
  }));
  const cur = Erk.gebiet().id;
  ids.forEach(k => {
    const [x, y, w, h] = R(k), G = GEBIETE[k], bekannt = D.besucht[k];
    const feuer = Object.entries(D.feuerOrt).filter(([id, f]) => f[0] === k && D.lit[id]);
    svg += `<g class="node gebiet${bekannt ? '' : ' unbekannt'}${k === kSel ? ' sel' : ''}${feuer.length ? ' feuer' : ''}" data-o="${k}"><rect class="dot" x="${x}" y="${y}" width="${w}" height="${h}" rx="4"/>`;
    svg += `<text x="${x + w / 2}" y="${y + h / 2 + 4}" text-anchor="middle">${esc(bekannt ? G.name : '?')}</text>`;
    feuer.forEach(([id], i) => { svg += `<path class="flame" transform="translate(${x + w - 10 - i * 12} ${y + 11})" d="M0 -5c2.4 2.2 3.3 4 3.3 5.7a3.3 3.3 0 0 1-6.6 0c0-1.3.8-2.2 1.5-3 .2 1.1.9 1.6 1.4 1.6 0-1.6-.4-2.8.4-4.3z"/>`; });
    if (bekannt && Object.values(G.o || {}).some(o => o.t === 'boss' && !D.bosse[o.boss])) svg += `<path class="foe" transform="translate(${x + 10} ${y + 11})" d="M0 -4L4 0 0 4-4 0z"/>`;
    if (D.drop && D.drop.gebiet === k) svg += `<circle class="glutpunkt" cx="${x + w / 2}" cy="${y + h - 8}" r="4"/>`;
    if (k === cur){ const G2 = Erk.gebiet(), px = x + clamp(Erk.S.x / G2.W, .04, .96) * w, py = y + clamp(Erk.S.y / G2.Hh, .15, .85) * h; svg += `<circle class="here" cx="${px}" cy="${py}" r="7"/><circle class="hierpunkt" cx="${px}" cy="${py}" r="3"/>`; }
    svg += '</g>';
  });
  box.innerHTML = `<svg viewBox="0 0 ${Wd} ${Hd}" role="img" aria-label="Karte: ${esc(REGIONEN[kRegion].name)}">${svg}</svg>`;
  kInfo();
}
function verbindungen(k){
  const G = GEBIETE[k], out = Object.values(G.links || {}).map(z => z.split(':')[0]);
  Object.values(G.o || {}).forEach(o => { if ((o.t === 'tuer' || o.t === 'ausgang') && o.ziel) out.push((o.ziel || '').split(':')[0]); });
  return out;
}
function nachbarBesucht(k){ return Object.keys(GEBIETE).some(a => D.besucht[a] && verbindungen(a).includes(k)); }
function kInfo(){
  const box = $('#kInfo');
  if (!kSel){ box.innerHTML = `<h3>${esc(REGIONEN[kRegion].name)}</h3><p>${kReise ? 'Tippe auf ein Gebiet mit Leuchtfeuer, um dorthin zu reisen.' : 'Reisen kannst du, wenn du an einem Leuchtfeuer rastest.'}</p>`; return; }
  const G = GEBIETE[kSel], feuer = Object.entries(D.feuerOrt).filter(([id, f]) => f[0] === kSel && D.lit[id]);
  let html = `<h3>${esc(D.besucht[kSel] ? G.name : 'Unerforscht')}</h3><p>${esc(D.besucht[kSel] ? (G.beschreibung || REGIONEN[G.region].name) : 'Hier warst du noch nicht.')}</p>`;
  if (kReise) feuer.forEach(([id]) => { if (id !== D.feuer) html += `<button type="button" class="btn primary" data-reise="${id}">Reisen: ${esc(FEUERNAME(id))}</button>`; });
  box.innerHTML = html;
  box.querySelectorAll('[data-reise]').forEach(b => b.addEventListener('click', () => { Snd.play('choice'); reisen(b.dataset.reise); }));
}
function FEUERNAME(id){ for (const g of Object.values(GEBIETE)) for (const o of Object.values(g.o || {})) if (o.t === 'feuer' && o.id === id) return o.name; return 'Leuchtfeuer'; }
function reisen(id){
  const f = D.feuerOrt[id]; if (!f) return;
  pausiere(false);
  blende(() => {
    heldAufBuehne();
    Erk.betrete(f[0], { x: f[1] + 34, y: f[2] }, D);
    D.besucht[f[0]] = true; D.gebiet = f[0];
    const e = Erk.ents().find(x => x.typ === 'feuer' && x.def.id === id);
    Music.play(GEBIETE[f[0]].musik || 'amb');
    if (e){ Stage.P.poseFn = null; playAnim(Stage.P, [[0, SETS[Stage.P.set].kneel]], true); rasten(e, 'rast'); }
    else welt();
  }, 600);
}
$('#kTabs').addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (!b) return; Snd.play('ui'); kRegion = b.dataset.r; kSel = null; renderKarte(); });
$('#kMap').addEventListener('click', e => { const n = e.target.closest('.node'); if (!n) return; Snd.play('ui'); kSel = n.dataset.o; renderKarte(); });

/* ---------- Ende von Akt I ---------- */
function akt1Ende(){
  const erst = !D.ende; D.ende = true; speichern();
  modus = 'ende'; Erk.setAus(true); Voice.stop();
  show('ende');
  World.focus(Erk.S.x, Erk.S.y - 160, .9, .002); World.letterbox(0);
  Music.play('amb');
  if (erst){ Snd.bell(98, .3, 6, .85); setTimeout(() => Snd.bell(98, .2, 5, .85), 600); }
  const min = Math.max(1, Math.floor(D.st.ms / 60000)), zeit = min >= 60 ? `${Math.floor(min / 60)} Std. ${min % 60} Min.` : `${min} Min.`;
  $('#eText').textContent = 'Im Osten glüht Grauhall, die Schmiedefeste. Dort läutet die nächste Glocke. Und hinter dir steigt das Wasser.';
  const bosse = Object.keys(FEINDE).filter(k => FEINDE[k].boss);
  $('#eStats').innerHTML = [
    ['Spielzeit', zeit], ['Stufe', D.lvl], ['Bosse', `${bosse.filter(k => D.bosse[k]).length} von ${bosse.length}`], ['Tode', D.st.tode],
    ['Paraden', D.st.paraden], ['Geheimnisse', `${Object.keys(D.gelesen).filter(k => LORE[k]).length} von ${Object.keys(LORE).length}`]
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  const ch = $('#eChoices'); ch.innerHTML = '';
  [{ t: 'Weiter erkunden', sub: 'Was du noch nicht gefunden hast, wartet', fn: () => { Erk.setAus(false); welt(); }, main: true },
   { t: EMB ? 'Zurück zum Couchclub' : 'Zum Titel', fn: () => EMB ? ccLeave() : titel() }].forEach(w => {
    const b = el('button', 'choice in' + (w.main ? ' main' : ''), `<b>${esc(w.t)}</b>${w.sub ? `<small>${esc(w.sub)}</small>` : ''}`);
    b.type = 'button'; b.addEventListener('click', () => { Snd.play('choice'); w.fn(); });
    ch.appendChild(b);
  });
}

/* ---------- Erkundung meldet Kämpfe ---------- */
Erk.hook.kampf = (gruppe, vorteil) => kampf(gruppe, vorteil);

/* ---------- Start ---------- */
function init(){
  resize();
  window.addEventListener('resize', resize);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
  titel();
  requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
  const s = gespeichert();
  ccPost({ t: 'ready', sum: s ? ccSumme(s) : { runs: 0 } });
  if (DEBUG) window.__mg = {
    D: () => D, setD: d => { D = d; }, neuesSpiel, S, Fight, Stage, World, Erk, Eingabe, profil, betrete, kampfStart, feuer, karte, menue, gespraech,
    akt1Ende, titel, speichern, gespeichert, sterben, heldAufBuehne, modus: () => modus, welt, zeigeLore, bossAuftritt, szene, SKRIPTE, erwachen, GEBIETE, LORE
  };
}
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(init);
else init();
