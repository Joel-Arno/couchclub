/* =====================================================================
   MONDGELÄUT – GRUNDLAGEN
   ===================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;
const EASE = {
  lin: t => t,
  in: t => t * t,
  in3: t => t * t * t,
  out: t => 1 - (1 - t) * (1 - t),
  out3: t => 1 - Math.pow(1 - t, 3),
  io: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
};
const rnd = Math.random;
const rr = (a, b) => a + rnd() * (b - a);
const fmt = n => Math.floor(n).toLocaleString('de-DE');
/* ---------- Im Couchclub eingebettet ----------
   CC_MODE setzt der Build. Spieler und Einstellungen kommen aus der Adresse,
   z. B. mond.html#p=p1&n=Joel&snd=1&vib=1&mot=1 */
const EMB = CC_MODE ? (() => {
  const q = new URLSearchParams(location.hash.slice(1));
  return {
    p: (q.get('p') || '').replace(/[^\w-]/g, '').slice(0, 24),
    name: (q.get('n') || '').slice(0, 14),
    sound: q.get('snd') !== '0', vibe: q.get('vib') !== '0', motion: q.get('mot') !== '0'
  };
})() : null;
function ccPost(msg){
  if (!EMB || parent === window) return;
  try { parent.postMessage(Object.assign({ cc: 'mondgelaeut', p: EMB.p }, msg), '*'); } catch (e) {}
}
const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || !!(EMB && !EMB.motion);
const DEBUG = /(^|#|&)test$/.test(location.hash);

/* ---------- Einstellungen (nur auf diesem Gerät) ---------- */
const SET_KEY = 'mondgelaeut-einstellungen-v2';
const S = (() => {
  const d = { sound: true, voice: true, ring: false, vib: true, tut: false };
  try { Object.assign(d, JSON.parse(localStorage.getItem(SET_KEY) || '{}')); } catch (e) {}
  // Im Couchclub gelten Ton und Vibration von dort
  if (EMB){ d.sound = EMB.sound; d.vib = EMB.vibe; }
  return d;
})();
function saveSettings(){ try { localStorage.setItem(SET_KEY, JSON.stringify(S)); } catch (e) {} }
function buzz(p){ if (!S.vib) return; try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }

/* =====================================================================
   KLANG: alles wird im Browser erzeugt
   ===================================================================== */
const Snd = (() => {
  let ac = null, master = null, send = null, noiseBuf = null;

  function init(){
    try {
      if (!ac){
        const C = window.AudioContext || window.webkitAudioContext;
        if (!C) return;
        ac = new C();
        master = ac.createGain(); master.gain.value = S.sound ? 1 : 0;
        const comp = ac.createDynamicsCompressor();
        comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = .004; comp.release.value = .2;
        master.connect(comp); comp.connect(ac.destination);
        const verb = ac.createConvolver(); verb.buffer = impulse(3.4, 2.3);
        send = ac.createGain(); send.connect(verb);
        const wet = ac.createGain(); wet.gain.value = .34; verb.connect(wet); wet.connect(master);
        noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1;
      }
      if (ac.state === 'suspended') ac.resume();
    } catch (e) { ac = null; }
  }
  function impulse(sec, decay){
    const len = Math.floor(ac.sampleRate * sec), b = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++){
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }
  function setOn(on){ if (master) master.gain.setTargetAtTime(on ? 1 : 0, ac.currentTime, .05); }
  // Anschluss an den Ausgang, mit Anteil im Hall
  function out(node, wet = .2){
    node.connect(master);
    if (wet > 0){ const g = ac.createGain(); g.gain.value = wet; node.connect(g); g.connect(send); }
  }
  function env(g, t, a, peak, d){
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, .0002), t + a);
    g.gain.exponentialRampToValueAtTime(.0001, t + a + d);
  }
  function tone(type, f, t, a, d, vol, wet = .15, f2 = 0){
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d);
    env(g, t, a, vol, d); o.connect(g); out(g, wet);
    o.start(t); o.stop(t + a + d + .05);
  }
  function noise(t, dur, type, f, q, vol, wet = .1, f2 = 0, a = .004){
    const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; s.loop = true;
    fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + a + dur);
    env(g, t, a, vol, dur); s.connect(fl); fl.connect(g); out(g, wet);
    s.start(t, rnd() * 1.5); s.stop(t + a + dur + .05);
  }
  // Glocke: unharmonische Teiltöne wie bei einer gegossenen Glocke
  const BELL = [[.5, 1, 1.15], [1, .9, .9], [1.19, .5, .62], [1.5, .34, .5], [2, .42, .45], [2.51, .2, .3], [2.66, .17, .28], [3.01, .14, .22], [4.1, .07, .14]];
  function bell(f, vol = .2, dur = 3, wet = .5, t){
    if (!ac) return;
    if (t == null) t = ac.currentTime;
    for (const [r, v, dk] of BELL) tone('sine', f * r * (1 + (rnd() - .5) * .003), t, .003, dur * dk, vol * v * .5, wet);
  }
  const now = () => ac.currentTime;

  const P = {
    ui(){ tone('triangle', 740, now(), .003, .07, .05, .08); },
    choice(){ bell(1318, .045, 1.4, .5); },
    swing(){ const t = now(); noise(t, .13, 'bandpass', 700, 1.1, .2, .05, 2600); },
    heavySwing(){ const t = now(); noise(t, .26, 'bandpass', 420, 1, .28, .08, 1800, .03); tone('sine', 95, t, .02, .22, .08, 0, 60); },
    hit(){ const t = now(); tone('sine', 160, t, .002, .16, .42, .06, 52); noise(t, .09, 'lowpass', 2400, .7, .3, .08); },
    hitHeavy(){ const t = now(); tone('sine', 130, t, .002, .28, .55, .1, 40); noise(t, .16, 'lowpass', 1600, .7, .4, .12); noise(t + .01, .05, 'highpass', 3000, .7, .08, .05); },
    hurt(){ const t = now(); tone('sine', 120, t, .002, .3, .5, .06, 38); noise(t, .22, 'lowpass', 900, .8, .36, .08); tone('sawtooth', 70, t, .01, .16, .05, 0, 50); },
    block(){ const t = now(); noise(t, .12, 'bandpass', 2600, 6, .32, .15); [1250, 1830, 2710].forEach((f, i) => tone('triangle', f, t, .001, .16 - i * .03, .05, .2)); tone('sine', 140, t, .002, .1, .2, 0, 70); },
    parry(){ const t = now(); bell(740, .24, 2.6, .6); noise(t, .08, 'highpass', 3200, .7, .16, .2); tone('sine', 1480, t, .002, .5, .05, .5); },
    dodge(){ const t = now(); noise(t, .17, 'bandpass', 650, 1.2, .16, .04, 260); noise(t + .08, .05, 'highpass', 4200, .8, .05, 0); },
    perfect(){ bell(1480, .07, 1.3, .7); const t = now(); noise(t, .35, 'bandpass', 3000, 3, .05, .6, 800, .15); },
    heal(){ const t = now(); [523, 659, 784, 1046].forEach((f, i) => tone('sine', f, t + i * .06, .02, .55, .06, .6)); },
    glut(){ const t = now(); for (let i = 0; i < 7; i++) noise(t + rnd() * .35, .02, 'bandpass', 2600 + rnd() * 1800, 2, .06, .1); tone('triangle', 220, t, .12, .5, .05, .3, 330); },
    tell(){ tone('sine', 2350, now(), .002, .12, .035, .3); },
    danger(){ const t = now(); tone('sawtooth', 190, t, .02, .34, .07, .2, 120); noise(t, .3, 'bandpass', 300, 4, .08, .2); },
    art(){ const t = now(); noise(t, .4, 'bandpass', 900, 2, .15, .3, 3000, .08); tone('sine', 330, t, .05, .5, .08, .5, 660); },
    geleut(){ bell(392, .3, 3.5, .7); bell(587, .12, 2.5, .7); },
    enemyDie(){ const t = now(); noise(t, .9, 'lowpass', 900, .7, .26, .3, 160, .02); tone('sine', 82, t, .01, .7, .2, .2, 38); },
    bossDie(){ bell(98, .38, 7, .85); bell(146.8, .2, 6, .85); const t = now(); noise(t, 2.6, 'lowpass', 300, .7, .3, .6, 1200, .5); },
    death(){ const t = now(); tone('sine', 55, t, .6, 3, .26, .4); noise(t, 2.6, 'lowpass', 420, .8, .26, .5, 110, .7); bell(73.4, .28, 7, .9, t + .2); },
    phase(){ bell(87.3, .42, 6, .85); const t = now(); tone('sine', 62, t, .01, 1.3, .5, .2, 28); noise(t, 2.2, 'lowpass', 280, .8, .32, .5, 900, .9); },
    wave(){ const t = now(); noise(t, 1.1, 'lowpass', 180, .8, .34, .4, 1300, .55); },
    chain(){ const t = now(); for (let i = 0; i < 6; i++) tone('square', 1700 + rnd() * 700, t + i * .045, .001, .03, .025, .1); },
    heart(){ const t = now(); bell(98, .11, 2.4, .6, t); bell(98, .075, 2, .6, t + .3); },
    fire(){ const t = now(); noise(t, 1.4, 'bandpass', 420, .8, .16, .3, 900, .35); bell(392, .1, 3, .7, t + .15); },
    rise(){ const t = now(); noise(t, 1.4, 'lowpass', 200, .7, .12, .4, 700, .6); },
    lure(){ tone('sine', 196, now(), .3, 1.4, .05, .7, 147); },
    // Erkunden
    schritt(){ const t = now(); noise(t, .045, 'lowpass', 700 + rnd() * 500, .8, .045, .02); },
    platsch(){ const t = now(); noise(t, .14, 'bandpass', 900 + rnd() * 500, 1.2, .06, .08, 2200); },
    sprung(){ const t = now(); noise(t, .09, 'bandpass', 480, 1, .05, .02, 900); },
    landen(){ const t = now(); tone('sine', 95, t, .002, .12, .12, 0, 50); noise(t, .1, 'lowpass', 700, .7, .1, .04); },
    bemerkt(){ const t = now(); tone('triangle', 880, t, .002, .09, .05, .2); tone('triangle', 1175, t + .08, .002, .14, .05, .3); tone('sawtooth', 110, t, .02, .3, .04, .2, 80); },
    tuer(){ const t = now(); tone('sawtooth', 120, t, .08, .45, .025, .2, 84); noise(t + .1, .35, 'bandpass', 380, 3, .06, .3); tone('sine', 70, t + .45, .002, .2, .12, .2, 45); },
    hebel(){ const t = now(); tone('square', 190, t, .002, .06, .05, .1, 120); noise(t, .12, 'bandpass', 1500, 4, .12, .15); tone('sine', 85, t + .05, .002, .18, .12, .1, 50); },
    gitter(){ const t = now(); for (let i = 0; i < 14; i++) tone('square', 1300 + rnd() * 900, t + i * .07, .001, .03, .02, .15); noise(t, 1.2, 'lowpass', 220, .8, .2, .3, 120, .2); },
    bruch(){ const t = now(); noise(t, 1.1, 'lowpass', 900, .7, .4, .3, 140, .01); tone('sine', 62, t, .005, .7, .35, .2, 32); for (let i = 0; i < 6; i++) noise(t + .1 + rnd() * .6, .05, 'bandpass', 1400 + rnd() * 1500, 2, .07, .1); },
    thunder(){ const t = now(); noise(t, 3.2, 'lowpass', 160, .7, .38, .5, 60, .08); noise(t, .25, 'lowpass', 1200, .7, .18, .3, 300, .01); }
  };
  function play(name, ...args){
    if (!ac || !S.sound || !P[name]) return;
    try { P[name](...args); } catch (e) {}
  }
  return { init, play, setOn, bell, tone, noise, out, env, ac: () => ac, master: () => master, send: () => send, noiseBuf: () => noiseBuf };
})();

/* =====================================================================
   MUSIK: Strand, Kampf und Bosskampf, ebenfalls erzeugt
   ===================================================================== */
const Music = (() => {
  let mode = null, bus = null, timer = null, nextT = 0, step = 0, held = [], level = 0, duckG = null, ducked = false;
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  // d-Moll, B-Dur, g-Moll, A-Dur
  const CHORDS = [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]];

  const RUHIG = ['amb', 'marsch', 'stadt', 'hoehle', 'turm'];
  function stepDur(){
    if (RUHIG.includes(mode)) return .5;
    if (mode === 'kampf') return 60 / 86 / 2;
    return 60 / (level ? 94 : 76) / 2;
  }
  function stop(fade = 1.4){
    clearInterval(timer); timer = null;
    const ac = Snd.ac();
    if (ac && bus){
      const b = bus, h = held;
      b.gain.cancelScheduledValues(ac.currentTime);
      b.gain.setTargetAtTime(.0001, ac.currentTime, fade / 4);
      setTimeout(() => { h.forEach(n => { try { n.stop(); } catch (e) {} }); try { b.disconnect(); } catch (e) {} }, fade * 1000 + 300);
    }
    bus = null; held = []; mode = null;
  }
  function play(m){
    if (mode === m && bus) return;
    stop();
    mode = m; level = 0;
    const ac = Snd.ac();
    if (!ac || !m) return;
    bus = ac.createGain(); bus.gain.value = .0001;
    bus.gain.exponentialRampToValueAtTime(RUHIG.includes(m) ? .8 : .7, ac.currentTime + 2.5);
    bus.connect(duckNode());
    if (m === 'amb') { sea(.16); drone([38, 45], .045, 380); }
    // Jede Gegend klingt anders: Marsch mit Wind und Wiegenlied, Stadt mit fernen Glocken,
    // Höhlen und Häuser ohne Meer, dafür Tropfen, im Turm die große Glocke
    if (m === 'marsch') { sea(.05); wind(.05); drone([40, 47], .04, 300); }
    if (m === 'stadt') { sea(.08); wind(.03); drone([36, 43], .045, 320); }
    if (m === 'hoehle') { drone([33, 40], .05, 220); }
    if (m === 'turm') { wind(.07); drone([31, 38], .05, 260); }
    if (m === 'kampf') { sea(.08); drone([38, 50], .05, 260); }
    if (m === 'boss') { sea(.06); drone([26, 38], .1, 190); }
    nextT = ac.currentTime + .15; step = 0;
    timer = setInterval(tick, 80); tick();
  }
  // Leiser, solange jemand spricht. Eigener Knoten, damit Ein- und Ausblenden der Musik unberührt bleiben.
  function duckNode(){
    if (!duckG){
      const ac = Snd.ac();
      duckG = ac.createGain(); duckG.gain.value = ducked ? .28 : 1; duckG.connect(Snd.master());
      const s = ac.createGain(); s.gain.value = .35; duckG.connect(s); s.connect(Snd.send());
    }
    return duckG;
  }
  function duck(on){
    ducked = on;
    const ac = Snd.ac(); if (!ac) return;
    const g = duckNode().gain;
    g.cancelScheduledValues(ac.currentTime);
    g.setTargetAtTime(on ? .28 : 1, ac.currentTime, on ? .12 : .7);
  }
  function setLevel(l){
    level = l;
    if (l && bus){ const ac = Snd.ac(); drone([50, 57], .035, 900); Snd.play('phase'); bus.gain.setTargetAtTime(.8, ac.currentTime, 1); }
  }
  // Meeresrauschen mit langsamen Wellen
  function sea(vol){
    const ac = Snd.ac(), s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    const lfo = ac.createOscillator(), lg = ac.createGain();
    s.buffer = Snd.noiseBuf(); s.loop = true; f.type = 'lowpass'; f.frequency.value = 520; f.Q.value = .4;
    g.gain.value = vol * .6; lfo.frequency.value = .085; lg.gain.value = vol * .5;
    lfo.connect(lg); lg.connect(g.gain);
    s.connect(f); f.connect(g); g.connect(bus);
    s.start(); lfo.start(); held.push(s, lfo);
  }
  function wind(vol){
    const ac = Snd.ac(), s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    const lfo = ac.createOscillator(), lg = ac.createGain();
    s.buffer = Snd.noiseBuf(); s.loop = true; f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = .8;
    g.gain.value = vol * .6; lfo.frequency.value = .05; lg.gain.value = 380; lfo.connect(lg); lg.connect(f.frequency);
    s.connect(f); f.connect(g); g.connect(bus);
    s.start(); lfo.start(); held.push(s, lfo);
  }
  function drone(notes, vol, cut){
    const ac = Snd.ac(), f = ac.createBiquadFilter(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
    f.type = 'lowpass'; f.frequency.value = cut; f.Q.value = 1.2;
    lfo.frequency.value = .06; lg.gain.value = cut * .35; lfo.connect(lg); lg.connect(f.frequency);
    g.gain.value = vol; f.connect(g); g.connect(bus);
    notes.forEach((n, i) => {
      [-4, 4].forEach(det => {
        const o = ac.createOscillator(); o.type = i ? 'triangle' : 'sawtooth';
        o.frequency.value = hz(n); o.detune.value = det; o.connect(f); o.start(); held.push(o);
      });
    });
    lfo.start(); held.push(lfo);
  }
  function tick(){
    const ac = Snd.ac();
    if (!ac || !bus) return;
    while (nextT < ac.currentTime + .3){ sched(step, nextT); nextT += stepDur(); step++; }
  }
  function timp(t, vol){
    const ac = Snd.ac(), o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(82, t); o.frequency.exponentialRampToValueAtTime(40, t + .5);
    Snd.env(g, t, .004, vol, .6); o.connect(g); g.connect(bus); o.start(t); o.stop(t + .7);
  }
  function pad(t, chord, len, vol){
    const ac = Snd.ac(), f = ac.createBiquadFilter(), g = ac.createGain();
    f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = .6;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + len * .35);
    g.gain.exponentialRampToValueAtTime(.0001, t + len + .4);
    f.connect(g); g.connect(bus);
    chord.forEach(n => [-7, 6].forEach(det => {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(n); o.detune.value = det;
      o.connect(f); o.start(t); o.stop(t + len + .5);
    }));
  }
  function pluck(t, n, vol){
    const ac = Snd.ac(), o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sawtooth'; o.frequency.value = hz(n); f.type = 'bandpass'; f.frequency.value = hz(n) * 2; f.Q.value = 2;
    Snd.env(g, t, .004, vol, .16); o.connect(f); f.connect(g); g.connect(bus); o.start(t); o.stop(t + .25);
  }
  function sched(i, t){
    if (!S.sound) return;
    if (mode === 'amb'){
      if (i % 14 === 0) { Snd.bell(98, .07, 2.4, .7, t); Snd.bell(98, .05, 2, .7, t + .3); }
      if (i % 29 === 11) Snd.bell(hz(pickNote([74, 77, 81, 69])), .018, 3.5, .9, t);
      return;
    }
    if (mode === 'marsch'){
      if (i % 18 === 0) { Snd.bell(98, .045, 2.2, .7, t); Snd.bell(98, .03, 2, .7, t + .3); }
      // Wendas Wiegenlied, ganz leise aus der Ferne
      const w = i % 48; if (w >= 20 && w < 27) Snd.bell(hz([69, 72, 71, 67, 69, 64, 67][w - 20] + 12), .012, 2.6, .95, t);
      return;
    }
    if (mode === 'stadt'){
      if (i % 14 === 0) { Snd.bell(98, .05, 2.2, .7, t); Snd.bell(98, .035, 2, .7, t + .3); }
      if (i % 23 === 5) Snd.bell(pickNote([65.4, 73.4, 82.4, 110]), .045, 5, .92, t);
      return;
    }
    if (mode === 'hoehle'){
      if (i % 16 === 0) { Snd.bell(98, .04, 2, .6, t); Snd.bell(98, .028, 1.8, .6, t + .3); }
      if (rnd() < .09) Snd.tone('sine', 1600 + rnd() * 1600, t + rnd() * .4, .001, .09, .018, .7, 900);
      return;
    }
    if (mode === 'turm'){
      if (i % 24 === 0) Snd.bell(73.4, .09, 7, .9, t);
      if (i % 24 === 12) { Snd.bell(98, .04, 2, .7, t); Snd.bell(98, .028, 1.8, .7, t + .3); }
      return;
    }
    if (mode === 'kampf'){
      const b = i % 16;
      if (b === 0 || b === 6 || b === 8) timp(t, b === 0 ? .32 : .2);
      if (b === 12) Snd.bell(146.8, .03, 1.8, .6, t);
      if (i % 64 === 32) Snd.bell(293.7, .04, 3, .8, t);
      return;
    }
    // Boss
    const bar = Math.floor(i / 8), b = i % 8, ch = CHORDS[bar % 4];
    if (b === 0) { pad(t, ch, stepDur() * 8, level ? .05 : .04); Snd.bell(hz(ch[0] + 24), .05, 3, .7, t); }
    if (b === 0 || b === 3 || b === 4) timp(t, b === 0 ? .42 : .26);
    if (level){
      if (b === 6 || b === 7) timp(t, .22);
      pluck(t, ch[i % 3] + 12, .05);
      if (b === 4) Snd.bell(hz(ch[1] + 24), .03, 2, .7, t);
    }
  }
  const pickNote = a => a[Math.floor(rnd() * a.length)];
  return { play, stop, setLevel, duck, mode: () => mode };
})();
