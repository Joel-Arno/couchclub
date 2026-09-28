/* =====================================================================
   GRUNDLAGEN
   ===================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const root = document.documentElement;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const fmt = n => Math.floor(n).toLocaleString('de-DE');

/* ---------- Im Couchclub eingebettet ----------
   CC_MODE setzt der Build. Welches Spiel, welcher Spieler und die Einstellungen
   kommen aus der Adresse, z. B. spiele.html#g=kerker&p=p1&n=Joel&snd=1&vib=1&mot=1 */
const EMB = CC_MODE ? (() => {
  const q = new URLSearchParams(location.hash.slice(1));
  return {
    g: q.get('g') === 'licht' ? 'licht' : 'kerker',
    p: (q.get('p') || '').replace(/[^\w-]/g, '').slice(0, 24),
    name: (q.get('n') || '').slice(0, 14),
    sound: q.get('snd') !== '0', vibe: q.get('vib') !== '0', motion: q.get('mot') !== '0'
  };
})() : null;
function ccPost(msg){
  if (!EMB || parent === window) return;
  try { parent.postMessage(Object.assign({ cc: 'kerker-licht', g: EMB.g, p: EMB.p }, msg), '*'); } catch (e) {}
}
const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || !!(EMB && !EMB.motion);
const vr = Math.random;                                   // nur für Optik, nie für Spiellogik
const vri = (a, b) => a + Math.floor(vr() * (b - a + 1));
const plural = (n, one, many) => n === 1 ? one : many;
const DEBUG = /(^|#|&)test$/.test(location.hash);
const wait = ms => (DEBUG && window.__fast) ? 1 : ms;   // Testmodus: Banner und Pausen überspringen

function mulberry(a){
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hashStr(s){
  let h = 2166136261;
  for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function todayKey(d = new Date()){
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function dayDiff(a, b){ return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000); }

/* =====================================================================
   SPIELSTAND (nur auf diesem Gerät)
   ===================================================================== */
// Im Couchclub hat jeder Spieler seinen eigenen Spielstand
const SAVE_KEY = 'kerker-licht-v2' + (EMB && EMB.p ? '@' + EMB.p : ''), OLD_SAVE_KEY = 'kerker-licht-v1';
function freshSave(){
  return {
    v: 2, style: 'warm', sound: true, music: true, vibe: true,
    tips: {}, ach: {},
    stats: { kRuns: 0, kWins: 0, kKills: 0, kBosses: 0, kGold: 0, kBestStreak: 0, kRelics: 0, kSteps: 0, kRooms: 0, kElites: 0,
             lRuns: 0, lDist: 0, lSparks: 0, lFevers: 0, lPowers: 0, lBestMult: 1 },
    kerker: {
      bank: 0, best: 0, bestDepth: 0, bestFloor: 0, bestWorld: 0, ascMax: 0, rangedKills: 0, itemsUsed: 0,
      up: { hp: 0, armor: 0, wpn: 0, luck: 0, charge: 0, relic: 0, taschen: 0, vorrat: 0 },
      heroes: { ritter: true, schurkin: false, magierin: false, berserker: false, jaegerin: false, alchemist: false },
      hero: 'ritter', winsBy: {}, codex: {},
      daily: { key: '', best: 0, runs: 0, streak: 0, last: '' },
      run: null
    },
    licht: {
      bank: 0, best: 0, bestZone: 0,
      up: { shield: 0, magnet: 0, glow: 0, power: 0, fever: 0, revive: 0 },
      skins: { klassik: true }, skin: 'klassik',
      rank: 1, rankPts: 0, missions: [], missionsDone: 0, totalSparks: 0, totalRuns: 0
    }
  };
}
function merge(a, b){
  for (const k in b){
    const v = b[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) merge(a[k], v);
    else a[k] = v;
  }
  return a;
}
function loadSave(){
  const d = freshSave();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw){
      const m = merge(d, JSON.parse(raw));
      // Umstieg auf Kerker 2: Wer schon gewonnen hat, darf direkt Aufstieg 1 spielen
      if (!m.kerker.v2){
        m.kerker.v2 = 1;
        if (m.stats.kWins > 0) m.kerker.ascMax = Math.max(m.kerker.ascMax || 0, 1);
        m.kerker.bestWorld = Math.max(m.kerker.bestWorld || 0, Math.min(5, m.kerker.bestFloor || 0));
        if (m.kerker.run && m.kerker.run.v !== 2){ m.kerker.bank += m.kerker.run.gold || 0; m.kerker.run = null; }
      }
      return m;
    }
    const old = EMB ? null : localStorage.getItem(OLD_SAVE_KEY);
    if (old){
      // Fortschritt aus den ersten Entwürfen übernehmen
      const o = JSON.parse(old);
      ['style', 'sound', 'vibe'].forEach(k => { if (k in o) d[k] = o[k]; });
      d.ach = o.ach || {};
      if (o.kerker){
        d.kerker.bank = o.kerker.bank || 0; d.kerker.best = o.kerker.best || 0; d.kerker.bestDepth = o.kerker.bestDepth || 0;
        const u = o.kerker.up || {};
        d.kerker.up.hp = Math.min(u.hp || 0, 4); d.kerker.up.wpn = Math.min(u.wpn || 0, 3); d.kerker.up.luck = Math.min(u.luck || 0, 3);
      }
      if (o.licht){
        d.licht.bank = o.licht.bank || 0; d.licht.best = o.licht.best || 0;
        const u = o.licht.up || {};
        d.licht.up.shield = Math.min(u.shield || 0, 3); d.licht.up.magnet = Math.min(u.magnet || 0, 3); d.licht.up.glow = Math.min(u.glow || 0, 3);
      }
    }
  } catch (e) {}
  return d;
}
let D = loadSave();
if (EMB){ D.style = 'warm'; D.sound = EMB.sound; D.vibe = EMB.vibe; }
function save(){ try { localStorage.setItem(SAVE_KEY, JSON.stringify(D)); } catch (e) {} }
const isPaper = () => D.style === 'papier';
const musicOn = () => D.music && (!EMB || EMB.sound);

/* =====================================================================
   AUDIO: Soundeffekte und Musik, alles synthetisch erzeugt
   ===================================================================== */
let AC = null, SFX = null, MUS = null, NOISE = null;
function audio(){
  if (!D.sound && !musicOn()) return null;
  try {
    if (!AC){
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      AC = new C();
      const comp = AC.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      comp.connect(AC.destination);
      SFX = AC.createGain(); SFX.gain.value = .5; SFX.connect(comp);
      MUS = AC.createGain(); MUS.gain.value = 0; MUS.connect(comp);
    }
    if (AC.state === 'suspended' && !document.hidden) AC.resume();
    return AC;
  } catch (e) { return null; }
}
function tone(f, d = .1, type = 'square', v = .05, f2 = 0, delay = 0){
  if (!D.sound) return;
  const a = audio(); if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + .008);
  g.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(g); g.connect(SFX); o.start(t); o.stop(t + d + .03);
}
function noiseBuf(a){
  if (!NOISE){
    NOISE = a.createBuffer(1, Math.floor(a.sampleRate * .8), a.sampleRate);
    const ch = NOISE.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  }
  return NOISE;
}
function hiss(d = .15, v = .08, freq = 1200, q = .8, delay = 0, type = 'bandpass', bus){
  if (!bus && !D.sound) return;
  const a = audio(); if (!a) return;
  const t = a.currentTime + delay;
  const s = a.createBufferSource(); s.buffer = noiseBuf(a);
  const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = a.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  s.connect(f); f.connect(g); g.connect(bus || SFX); s.start(t); s.stop(t + d + .02);
}
const arp = (notes, step, type = 'triangle', v = .06, d = .12) => notes.forEach((f, i) => tone(f, d, type, v, 0, i * step));
const Sfx = {
  ui(){ tone(660, .035, 'triangle', .03); },
  step(){ isPaper() ? hiss(.07, .07, 3400, 1.2) : tone(190, .06, 'triangle', .05); },
  bump(){ tone(110, .08, 'square', .035); },
  lock(){ tone(180, .09, 'square', .04); tone(140, .12, 'square', .04, 0, .08); },
  hit(){ hiss(.16, .16, 700, .7); tone(150, .18, 'sawtooth', .06, 60); },
  armor(){ tone(1200, .05, 'square', .035, 800); hiss(.1, .07, 3000, 3); },
  clash(){ tone(880, .05, 'square', .05, 440); hiss(.12, .1, 2600, 2); },
  kill(){ tone(330, .07, 'square', .045); tone(494, .1, 'square', .045, 0, .06); },
  crit(){ tone(988, .06, 'square', .05); tone(1480, .16, 'square', .05, 0, .05); hiss(.08, .06, 5000, 2); },
  weapon(){ tone(520, .08, 'sawtooth', .04, 1300); hiss(.1, .06, 4000, 3, .02); },
  shield(){ tone(300, .1, 'square', .04, 600); tone(600, .12, 'triangle', .04, 0, .06); },
  potion(){ tone(392, .28, 'sine', .08, 880); },
  coin(){ tone(988, .06, 'square', .035); tone(1319, .14, 'square', .035, 0, .05); },
  chest(){ arp([523, 659, 784, 1047], .06); },
  reveal(){ tone(220, .12, 'sawtooth', .07, 110); hiss(.2, .12, 900, 1); },
  explode(){ hiss(.7, .3, 220, .5, 0, 'lowpass'); tone(90, .5, 'sawtooth', .09, 30); hiss(.25, .12, 1800, .7); },
  tick(){ tone(1400, .03, 'square', .03); },
  defuse(){ tone(700, .05, 'triangle', .05); tone(500, .08, 'triangle', .05, 0, .06); },
  trap(){ hiss(.1, .14, 3500, 4); tone(240, .12, 'sawtooth', .05, 120); },
  poison(){ tone(300, .15, 'sine', .05, 200); tone(260, .15, 'sine', .04, 170, .08); },
  relic(){ arp([392, 523, 659, 784, 1047], .07, 'sine', .06, .25); },
  shop(){ tone(1319, .05, 'square', .03); tone(1568, .05, 'square', .03, 0, .05); tone(1976, .1, 'square', .03, 0, .1); },
  boss(){ tone(98, .7, 'sawtooth', .08, 73); tone(147, .7, 'sawtooth', .05, 110, .05); hiss(.6, .08, 300, .5, 0, 'lowpass'); },
  floor(){ arp([392, 523, 659, 784, 1047], .08, 'triangle', .06, .16); },
  fire(){ hiss(.6, .2, 900, .4); tone(160, .5, 'sawtooth', .05, 80); },
  teleport(){ tone(300, .25, 'sine', .06, 1200); tone(1200, .25, 'sine', .04, 300, .12); },
  egg(){ tone(520, .06, 'sine', .05, 300); tone(420, .09, 'sine', .04, 250, .07); },
  regen(){ tone(330, .12, 'sine', .035, 440); },
  death(){ tone(330, .7, 'sawtooth', .07, 55); hiss(.5, .08, 400, .6); },
  phoenix(){ arp([392, 494, 587, 784, 988, 1175], .06, 'triangle', .07, .3); hiss(.5, .06, 3000, .6); },
  victory(){ arp([523, 659, 784, 1047, 784, 1047, 1319], .1, 'triangle', .08, .25); },
  streak(n){ tone(440 * Math.pow(1.12, Math.min(n, 10)), .12, 'square', .045); },
  ability(){ tone(200, .3, 'sawtooth', .06, 800); hiss(.3, .1, 1500, .8); },
  heart(){ tone(70, .09, 'sine', .14); tone(62, .12, 'sine', .11, 0, .16); },
  spark(n){ tone(620 * Math.pow(1.045, Math.min(n, 24)), .08, 'sine', .07); },
  near(){ hiss(.2, .09, 1800, .9); },
  shatter(){ hiss(.2, .16, 2500, .6); tone(700, .1, 'square', .04, 200); },
  power(){ arp([660, 880, 1320], .05, 'square', .05, .1); },
  fever(){ arp([523, 659, 784, 1047, 1319, 1568], .045, 'sawtooth', .05, .15); },
  zone(){ arp([294, 440, 587], .1, 'triangle', .06, .3); },
  revive(){ arp([262, 392, 523, 784], .08, 'sine', .08, .3); },
  mission(){ arp([784, 988, 1175, 1568], .07, 'triangle', .06, .2); },
  ach(){ arp([659, 784, 988, 1319], .07, 'triangle', .06, .14); }
};
const canVibe = typeof navigator.vibrate === 'function';
function buzz(p){ if (!D.vibe || !canVibe) return; try { navigator.vibrate(p); } catch (e) {} }

/* ---------- Musik: kleiner Sequenzer mit vier Stücken ---------- */
const Music = (() => {
  let track = null, timer = 0, nextT = 0, step = 0, tempoMul = 1, energy = 0, fever = false;
  const mtof = n => 440 * Math.pow(2, (n - 69) / 12);
  const MINOR = [0, 2, 3, 5, 7, 8, 10];
  const chord = (root, deg) => [0, 2, 4].map(i => { const d = deg + i; return root + MINOR[d % 7] + 12 * Math.floor(d / 7); });
  function note(type, n, t, dur, vol, cutoff = 2400, det = 0){
    const o = AC.createOscillator(), g = AC.createGain(), f = AC.createBiquadFilter();
    o.type = type; o.frequency.value = mtof(n); o.detune.value = det;
    f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = .8;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(MUS); o.start(t); o.stop(t + dur + .05);
  }
  function kick(t, v = .5){
    const o = AC.createOscillator(), g = AC.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + .16);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + .2);
    o.connect(g); g.connect(MUS); o.start(t); o.stop(t + .22);
  }
  const hat = (t, v = .06) => hiss(.04, v, 8000, 1, t - AC.currentTime, 'highpass', MUS);
  const snare = (t, v = .12) => { hiss(.14, v, 1800, .7, t - AC.currentTime, 'bandpass', MUS); };
  const lead = () => isPaper() ? 'triangle' : 'square';
  const TRACKS = {
    menu: { tempo: 84, root: 48, prog: [0, 5, 3, 4], play(s, t){
      const bar = (s >> 4) & 3, st = s & 15, ch = chord(this.root, this.prog[bar]);
      if (st === 0){ ch.forEach((n, i) => note('triangle', n, t, 2.9, .045, 900, i * 4)); note('sine', ch[0] - 12, t, 2.9, .09, 400); }
      if (st % 4 === 2) note('sine', ch[(st >> 2) % 3] + 12, t, .6, .03, 3000);
    }},
    gruft: { tempo: 76, root: 45, prog: [0, 5, 3, 4], play(s, t){
      const bar = (s >> 4) & 3, st = s & 15, ch = chord(this.root, this.prog[bar]);
      if (st === 0) note('triangle', ch[0] - 12, t, 2.8, .2, 500);
      if (st === 8) note('triangle', ch[2] - 12, t, 1.3, .12, 500);
      if (st % 4 === 2) note(isPaper() ? 'sine' : 'triangle', [ch[0], ch[1], ch[2], ch[1] + 12][st >> 2] + 12, t, .55, .045, 1800);
      if (st === 14 && bar === 3) note('sine', ch[2] + 24, t, .3, .03, 4000);
      if (energy > .5 && st % 8 === 4) note('sine', ch[0] - 24, t, .3, .12, 300);
    }},
    boss: { tempo: 128, root: 45, prog: [0, 0, 5, 4], play(s, t){
      const bar = (s >> 4) & 3, st = s & 15, ch = chord(this.root, this.prog[bar]);
      if (st % 2 === 0) note('sawtooth', ch[0] - 12 + (st % 8 === 6 ? 12 : 0), t, .17, .15, 650);
      if (st % 4 === 0) kick(t, .42);
      if (st === 4 || st === 12) snare(t, .11);
      if (st % 2 === 1) hat(t, .035);
      note(lead(), [ch[0], ch[1], ch[2], ch[1]][st % 4] + 12, t, .11, .035, 2400);
    }},
    lauf: { tempo: 116, root: 50, prog: [0, 5, 2, 6], play(s, t){
      const bar = (s >> 4) & 3, st = s & 15, ch = chord(this.root, this.prog[bar]);
      if (st % 2 === 0) note('sawtooth', ch[0] - 12, t, .15, .13, 450 + energy * 1400);
      if (st % 4 === 0) kick(t, .4);
      if (st % 4 === 2 || (energy > .45 && st % 2 === 1)) hat(t, .04);
      if (energy > .25 && (st === 4 || st === 12)) snare(t, .09);
      note(lead(), [ch[0], ch[1], ch[2], ch[0] + 12][st % 4] + 12, t, .09, .03 + energy * .015, 2000 + energy * 1500);
      if (fever && st % 2 === 0) note('square', [ch[2], ch[1], ch[0], ch[1]][(st >> 1) % 4] + 24, t, .12, .03, 3800);
    }}
  };
  function tick(){
    if (!AC || !track || !musicOn() || AC.state !== 'running') return;
    const tr = TRACKS[track];
    if (nextT < AC.currentTime) nextT = AC.currentTime + .05;
    while (nextT < AC.currentTime + .15){
      tr.play(step % 64, nextT);
      nextT += 60 / (tr.tempo * tempoMul) / 4;
      step++;
    }
  }
  return {
    play(name){
      if (track === name) return;
      track = name; step = 0; tempoMul = 1; energy = 0; fever = false;
      if (AC) nextT = AC.currentTime + .1;
      this.refresh();
    },
    stop(){ track = null; },
    refresh(){
      if (!AC || !MUS) return;
      MUS.gain.setTargetAtTime(musicOn() && track ? .17 : 0, AC.currentTime, .25);
      if (!timer) timer = setInterval(tick, 25);
    },
    set(opts){ if ('tempo' in opts) tempoMul = opts.tempo; if ('energy' in opts) energy = opts.energy; if ('fever' in opts) fever = opts.fever; }
  };
})();
function unlockAudio(){ if (audio()) Music.refresh(); }
document.addEventListener('pointerdown', unlockAudio, true);
document.addEventListener('keydown', unlockAudio, true);
document.addEventListener('visibilitychange', () => {
  if (!AC) return;
  try { document.hidden ? AC.suspend() : AC.resume(); } catch (e) {}
});

/* =====================================================================
   ICONS: ein SVG-Satz, gestylt per CSS je nach Stil
   ===================================================================== */
const P_SKULL = '<path class="f1" d="M11 22c0-9 5.5-14.5 13-14.5S37 13 37 22c0 5-3 7.5-4.5 9.5V35h-17v-3.5C14 29.5 11 27 11 22z"/><rect class="f1" x="17" y="34" width="14" height="7" rx="2.5"/><circle class="dk" cx="18.8" cy="22.5" r="4"/><circle class="dk" cx="29.2" cy="22.5" r="4"/><path class="dk" d="M24 27.5l-2.3 4h4.6z"/><path class="ln" d="M21 35v5.5M24 35v5.5M27 35v5.5"/>';
const P_DEMON = '<path class="f2" d="M14 19C8.5 13.5 8 7 11 2.5c1.5 6 5 9 9 10.5zM34 19c5.5-5.5 6-12 3-16.5-1.5 6-5 9-9 10.5z"/><path class="f1" d="M11 25c0-9 5.5-13.5 13-13.5S37 16 37 25c0 10-6 18-13 18S11 35 11 25z"/><path class="gl" d="M15.5 22.5l7 3-6.5 1.8zM32.5 22.5l-7 3 6.5 1.8z"/><path class="ln" d="M18 34q6 4 12 0M20.5 35.3l1 2.7M27.5 35.3l-1 2.7"/>';
const P_SPIDER = '<path class="ln" d="M18 25l-8-6-5 4M17 29l-9-1-4 5M18 32l-7 4-2 6M30 25l8-6 5 4M31 29l9-1 4 5M30 32l7 4 2 6"/><ellipse class="f1" cx="24" cy="29" rx="8.5" ry="8"/><circle class="f1" cx="24" cy="18.5" r="5.5"/><path class="f2" d="M24 25l2.2 3.2L24 31.5l-2.2-3.3z"/><circle class="gl" cx="21.8" cy="17.5" r="1.4"/><circle class="gl" cx="26.2" cy="17.5" r="1.4"/><circle class="gl" cx="23" cy="20.5" r=".9"/><circle class="gl" cx="25" cy="20.5" r=".9"/>';
const P_CROWN = '<path class="gl" d="M15.5 12.5l1.8-7 4 3.6L24 3.5l2.7 5.6 4-3.6 1.8 7z"/>';
const P_HERO = '<path class="f1" d="M13 43c0-10 4.5-15 11-15s11 5 11 15z"/><path class="f2" d="M15 21c0-8 4-12.5 9-12.5S33 13 33 21v4H15z"/><rect class="dk" x="18" y="16.5" width="12" height="3.2" rx="1.6"/><path class="ln" d="M24 8.5c0-3.5 3-5 6-4.5"/>';
const P_SHIELD = '<path class="f1" d="M24 4l16 6v11c0 11-7 18.5-16 23C15 39.5 8 32 8 21V10z"/>';
const P_FLAME = '<path class="f1" d="M24 6c6 6 9 11 9 15.5a9 9 0 0 1-18 0c0-3 1.5-6 3.5-8 .5 3 2 4.5 3.5 5 0-4.5.5-8.5 2-12.5z"/><path class="gl" d="M24 17c3 3 4.5 5.5 4.5 8a4.5 4.5 0 0 1-9 0c0-2.5 1.5-5 4.5-8z"/>';
const ICON = {
  // Helden
  ritter:   P_HERO,
  schurkin: '<path class="f1" d="M9 44c1-12 5-21 10-25l5-8 5 8c5 4 9 13 10 25z"/><path class="dk" d="M17.5 26c0-5 3-9.5 6.5-9.5s6.5 4.5 6.5 9.5c0 3.2-2.8 5.5-6.5 5.5s-6.5-2.3-6.5-5.5z"/><circle class="gl" cx="21.4" cy="24.8" r="1.5"/><circle class="gl" cx="26.6" cy="24.8" r="1.5"/><path class="f2" d="M15.5 33c5.5 3 11.5 3 17 0l1.3 4.4c-6.5 3.2-13 3.2-19.6 0z"/>',
  magierin: '<path class="f1" d="M12 45c1-5.5 5.5-8.5 12-8.5s11 3 12 8.5z"/><path class="sk" d="M17 27c0 6.5 3 10.5 7 10.5s7-4 7-10.5z"/><circle class="dk" cx="21.3" cy="30.5" r="1.3"/><circle class="dk" cx="26.7" cy="30.5" r="1.3"/><path class="f1" d="M24 2l11.5 22.5h-23z"/><path class="f1" d="M7 26.5c5-3.5 29-3.5 34 0-5 3-29 3-34 0z"/><path class="gl" d="M24 11.5l1.3 2.8 3 .3-2.3 2 .7 3-2.7-1.6-2.7 1.6.7-3-2.3-2 3-.3z"/>',
  berserker:'<path class="bn" d="M13.5 21C8 20 5 15.5 5 9c3 4 6 5 9.5 5zM34.5 21c5.5-1 8.5-5.5 8.5-12-3 4-6 5-9.5 5z"/><path class="f2" d="M13 24c0-8 5-13.5 11-13.5S35 16 35 24z"/><rect class="sk" x="15.5" y="23.5" width="17" height="6.5" rx="2"/><circle class="dk" cx="20.5" cy="26.6" r="1.5"/><circle class="dk" cx="27.5" cy="26.6" r="1.5"/><path class="f1" d="M13.5 29c3 2.3 18 2.3 21 0 0 8.5-4 14.5-10.5 16-6.5-1.5-10.5-7.5-10.5-16z"/>',
  // Monster
  slime:  '<path class="f1" d="M7 41c0-14 6.5-24 17-24s17 10 17 24z"/><ellipse class="hl" cx="16" cy="27" rx="3" ry="4.5"/><circle class="dk" cx="19" cy="31" r="2.6"/><circle class="dk" cx="29" cy="31" r="2.6"/><path class="ln" d="M20 36.5q4 2.5 8 0"/>',
  bat:    '<path class="f2" d="M24 23C18 14 8 14 3 20c4.5 0 7 3.5 7 8.5 3-3 7-2.5 8.5.5zM24 23c6-9 16-9 21-3-4.5 0-7 3.5-7 8.5-3-3-7-2.5-8.5.5z"/><path class="f1" d="M18 21l1-8 4 6h2l4-6 1 8c1.5 2 2 4 2 6 0 5.5-3.5 9-8 9s-8-3.5-8-9c0-2 .5-4 2-6z"/><circle class="gl" cx="21" cy="25" r="1.9"/><circle class="gl" cx="27" cy="25" r="1.9"/><path class="ln" d="M21.5 31l1.2 2.8 1.3-2.8 1.3 2.8 1.2-2.8"/>',
  skull:  P_SKULL,
  demon:  P_DEMON,
  ogre:   '<path class="f2" d="M9.5 23c-3.5-1-5.5 1.5-4.5 4.5 1 2 3 2.3 4.5 1.3zM38.5 23c3.5-1 5.5 1.5 4.5 4.5-1 2-3 2.3-4.5 1.3z"/><path class="f1" d="M9 25c0-10 6.5-17 15-17s15 7 15 17c0 9.5-6.5 17-15 17S9 34.5 9 25z"/><path class="bd" d="M13.5 20.5c3-2 7-2.5 10.5-1 3.5-1.5 7.5-1 10.5 1l-1 2.5c-3-1.5-6.5-1.5-9.5 0-3-1.5-6.5-1.5-9.5 0z"/><circle class="gl" cx="18.5" cy="24.5" r="2"/><circle class="gl" cx="29.5" cy="24.5" r="2"/><path class="ln" d="M17 34q7 3.5 14 0"/><path class="bn" d="M17.5 34.5l1-5.5 2.3 5.8zM30.5 34.5l-1-5.5-2.3 5.8z"/>',
  spider: P_SPIDER,
  ghost:  '<path class="f1" d="M11 42V22c0-8 6-14 13-14s13 6 13 14v20l-4.3-4-4.4 4-4.3-4-4.3 4-4.4-4z"/><ellipse class="dk" cx="19" cy="22" rx="2.2" ry="3"/><ellipse class="dk" cx="29" cy="22" rx="2.2" ry="3"/><ellipse class="dk" cx="24" cy="31" rx="2.4" ry="3.4"/>',
  mimic:  '<path class="f1" d="M6 27h36v12a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3z"/><path class="f2" d="M6 21c0-6 4-10.5 9-10.5h18c5 0 9 4.5 9 10.5v1H6z"/><rect class="dk" x="6" y="22" width="36" height="5.5"/><path class="bn" d="M8 22l2 4.5 2-4.5zM14.5 22l2 4.5 2-4.5zM21 22l2 4.5 2-4.5zM27.5 22l2 4.5 2-4.5zM34 22l2 4.5 2-4.5zM11 27.5l2-3.5 2 3.5zM18 27.5l2-3.5 2 3.5zM25 27.5l2-3.5 2 3.5zM32 27.5l2-3.5 2 3.5z"/><circle class="gl" cx="24" cy="15.5" r="3.4"/><circle class="dk" cx="24" cy="15.5" r="1.5"/>',
  // Bosse
  waechter: '<path class="f1" d="M10 42V22c0-9 6-15.5 14-15.5S38 13 38 22v20z"/><path class="f2" d="M20 7.5c1-4 4-6 8.5-6-2 2-2.2 4.5-1.2 7z"/><rect class="dk" x="13.5" y="21" width="21" height="5.5" rx="1.5"/><circle class="gl" cx="19" cy="23.8" r="1.8"/><circle class="gl" cx="29" cy="23.8" r="1.8"/><circle class="dk" cx="18.5" cy="33" r="1.3"/><circle class="dk" cx="24" cy="33" r="1.3"/><circle class="dk" cx="29.5" cy="33" r="1.3"/><path class="ln" d="M24 8v12"/>',
  koenigin: P_SPIDER + P_CROWN,
  knochen:  P_SKULL + P_CROWN,
  schatten: '<path class="f2" d="M13 15l-3-9 7 5zM35 15l3-9-7 5z"/><path class="f1" d="M8 45c0-16 6-30 16-37 10 7 16 21 16 37-5-3-10.5-4.5-16-4.5S13 42 8 45z"/><ellipse class="dk" cx="24" cy="24" rx="7.5" ry="8.5"/><path class="gl" d="M18.5 22.5l4.5 1.8-4.5 1zM29.5 22.5l-4.5 1.8 4.5 1z"/>',
  drache:   '<path class="f2" d="M14 13L8.5 2l9.5 7.5zM34 13l5.5-11L30 9.5z"/><path class="f2" d="M11.5 23l-7 2.5 7 3zM36.5 23l7 2.5-7 3z"/><path class="f1" d="M12 21c0-7.5 5.5-12.5 12-12.5S36 13.5 36 21v8c0 8-5 14-12 14s-12-6-12-14z"/><path class="f2" d="M16.5 31c0-3.5 3.3-5.5 7.5-5.5s7.5 2 7.5 5.5v3.5c0 3.5-3.3 5.5-7.5 5.5s-7.5-2-7.5-5.5z"/><circle class="dk" cx="21.5" cy="31.5" r="1.1"/><circle class="dk" cx="26.5" cy="31.5" r="1.1"/><path class="gl" d="M15 19.5l6.5 2.2-5.5 2zM33 19.5l-6.5 2.2 5.5 2z"/><path class="bn" d="M20 39.5l1.2 3.3 1.3-3.3zM25.5 39.5l1.3 3.3 1.2-3.3z"/>',
  // Gegenstände und Felder
  sword:  '<g transform="rotate(45 24 24)"><path class="f2" d="M24 3l4 5.5V30h-8V8.5z"/><path class="ln" d="M24 9v18"/><rect class="f1" x="14" y="29" width="20" height="4.5" rx="2.2"/><rect class="f1" x="22" y="33" width="4" height="8"/><circle class="f1" cx="24" cy="43" r="3"/></g>',
  armor:  P_SHIELD.replace('f1', 'f1') + '<path class="f2" d="M24 10l10 3.5v8c0 8-5 13.5-10 16.5-5-3-10-8.5-10-16.5v-8z"/><circle class="gl" cx="24" cy="22" r="3.2"/>',
  potion: '<path class="f2" d="M20 9h8v8.5c5.5 2 9.5 6.5 9.5 13 0 7.5-6 13-13.5 13S10.5 38 10.5 30.5c0-6.5 4-11 9.5-13z"/><path class="f1" d="M11.2 29c4.3-2.2 8.5 2 12.8 0s8.5-2.2 12.8 0c.2.5.2 1 .2 1.5 0 7-5.8 12-13 12s-13-5-13-12c0-.5 0-1 .2-1.5z"/><rect class="ck" x="19" y="4" width="10" height="6" rx="1.5"/><path class="ln hl" d="M15.5 27c.5-3 2.5-5 5-6"/>',
  coin:   '<circle class="f2" cx="29" cy="30" r="12"/><circle class="f1" cx="21" cy="23" r="13"/><circle class="rg" cx="21" cy="23" r="8.5"/><path class="f2" d="M21 16.5l1.8 4.7 4.7 1.8-4.7 1.8-1.8 4.7-1.8-4.7-4.7-1.8 4.7-1.8z"/>',
  chest:  '<rect class="f1" x="6" y="22" width="36" height="19" rx="2.5"/><path class="f2" d="M6 23v-6c0-5.5 4-9 9-9h18c5 0 9 3.5 9 9v6z"/><path class="bd" d="M6 21h36v3.5H6zM12.5 8.5h3.5V41h-3.5zM32 8.5h3.5V41H32z"/><rect class="gl" x="20.5" y="19" width="7" height="9" rx="1.5"/><circle class="dk" cx="24" cy="23.5" r="1.3"/>',
  bomb:   '<circle class="f1" cx="22" cy="29" r="13"/><ellipse class="hl" cx="16.5" cy="23.5" rx="3" ry="4.5"/><path class="f2" d="M26.5 12.8l6.3 2.3-2.2 6.2-6.3-2.3z"/><path class="ln" d="M31.8 14c2.5-4 6-5.2 9-3.2"/><path class="gl" d="M41.5 5.5l1.3 3.2 3.2 1.3-3.2 1.3-1.3 3.2-1.3-3.2-3.2-1.3 3.2-1.3z"/>',
  trap:   '<rect class="f2" x="5" y="36" width="38" height="6" rx="2"/><path class="f1" d="M7 36l4.5-15 4.5 15zM16 36l4-19 4 19zM24 36l4-17 4 17zM32 36l4.5-14 4.5 14z"/>',
  shrine: P_FLAME + '<path class="f2" d="M15 36h18V29H15zM11 42h26v-6H11z"/><path class="bd" d="M15 31.5h18v1.5H15z"/>',
  merchant:'<path class="f2" d="M16 13h16l-3 6H19z"/><path class="f1" d="M14.5 18.5c-4 5-6.5 11-6.5 16 0 6 7 8.5 16 8.5s16-2.5 16-8.5c0-5-2.5-11-6.5-16z"/><circle class="gl" cx="24" cy="31" r="6"/><path class="ln lt" d="M24 27.5v7M22 29.2h3a1.4 1.4 0 0 1 0 2.8h-2a1.4 1.4 0 0 0 0 2.8h3"/>',
  // Oberfläche
  heart:  '<path class="f1" d="M24 42C10 32 5 25 5 17.5 5 11.5 9.5 7 15 7c4 0 7 2 9 5 2-3 5-5 9-5 5.5 0 10 4.5 10 10.5C43 25 38 32 24 42z"/>',
  shield: P_SHIELD,
  spark:  '<path class="f1" d="M24 3l4.6 14.4L43 24l-14.4 4.6L24 45l-4.6-16.4L5 24l14.4-6.6z"/>',
  drop:   '<path class="f1" d="M24 5c7.5 10 11.5 17 11.5 23a11.5 11.5 0 0 1-23 0C12.5 22 16.5 15 24 5z"/><ellipse class="hl" cx="19.5" cy="27" rx="2.2" ry="3.5"/>',
  flame:  P_FLAME,
  lock:   '<path class="ln" d="M16 21v-5a8 8 0 0 1 16 0v5"/><rect class="f1" x="11" y="21" width="26" height="21" rx="4"/><circle class="dk" cx="24" cy="30.5" r="2.6"/><path class="dk" d="M22.8 31h2.4l.8 6h-4z"/>',
  bolt:   '<path class="f1" d="M28 3L11 27h11l-4 18 19-25H26z"/>',
  clock:  '<circle class="f1" cx="24" cy="25" r="17"/><circle class="f2" cx="24" cy="25" r="13"/><path class="ln" d="M24 16v9l6 4"/>',
  egg:    '<path class="f1" d="M24 6c7 0 13 11 13 20a13 13 0 0 1-26 0c0-9 6-20 13-20z"/><path class="f2" d="M17 25l3 3 4-4 4 4 3-3"/>',
  magnet: '<path class="f1" d="M10 8h9v17a5 5 0 0 0 10 0V8h9v17a14 14 0 0 1-28 0z"/><path class="f2" d="M10 8h9v6h-9zM29 8h9v6h-9z"/>',
  slow:   '<path class="f1" d="M13 5h22v4c0 6-7 10-7 15s7 9 7 15v4H13v-4c0-6 7-10 7-15s-7-9-7-15z"/><path class="f2" d="M17 38c2-3 5-5 7-5s5 2 7 5z"/>',
  phase:  '<path class="f1" d="M11 42V22c0-8 6-14 13-14s13 6 13 14v20l-4.3-4-4.4 4-4.3-4-4.3 4-4.4-4z" opacity=".75"/><circle class="dk" cx="19.5" cy="23" r="2.2"/><circle class="dk" cx="28.5" cy="23" r="2.2"/>',
  double: '<circle class="f1" cx="24" cy="24" r="19"/><path class="f2" d="M12.5 17l6.5 7-6.5 7h4.5l4.3-4.6L25.6 31H30l-6.5-7 6.5-7h-4.4l-4.3 4.6L17 17zM31 31.5c0-3 5-4.5 5-7 0-1-1-1.8-2.2-1.8-1.2 0-2.1.7-2.5 1.7l-2-1c.8-2 2.6-3 4.6-3 2.7 0 4.5 1.6 4.5 3.9 0 3.4-4.4 4.6-5 6.3h5V33h-7.4z"/>',
  // Relikte
  r_vampir:   '<path class="bn" d="M15 7h18c0 12-3.5 25.5-9 33.5C18.5 32.5 15 19 15 7z"/><path class="ln lt" d="M20 12c.3 7 1.5 14 4 20"/><path class="fr" d="M24 37.5c2 3 3 4.2 3 5.8a3 3 0 0 1-6 0c0-1.6 1-2.8 3-5.8z"/>',
  r_phoenix:  '<path class="f1" d="M38 5C23 7 12 19 11.5 35L8 44l6-5.5C29 37.5 40 25 38 5z"/><path class="f2" d="M33 10c-9 3-15 10-17 22 8-2.5 14-9.5 17-22z"/><path class="ln" d="M12 38L31 13M18 30.5h6M21.5 25.5h6.5M25.5 20l5.5-1"/>',
  r_schleif:  '<path class="f2" d="M6 28l21-12 15 6-21 12z"/><path class="f1" d="M6 28v6l15 7v-7zM21 34v7l21-12v-7z"/><path class="gl" d="M36 6l1.2 3 3 1.2-3 1.2L36 14.5l-1.2-3.1-3-1.2 3-1.2z"/>',
  r_kraeuter: '<path class="gd" d="M24 16c-4-7-10.5-9-15-7 2 5.5 8 8.5 15 7zM24 16c4-7.5 10.5-10 15-8-2 6-8 9-15 8z"/><path class="f1" d="M14 20h20c3.5 5 4.5 10 4.5 14 0 6-6.5 9-14.5 9s-14.5-3-14.5-9c0-4 1-9 4.5-14z"/><path class="ln" d="M16 22.5h16"/>',
  r_eisen:    '<path class="f1" d="M24 42C10 32 5 25 5 17.5 5 11.5 9.5 7 15 7c4 0 7 2 9 5 2-3 5-5 9-5 5.5 0 10 4.5 10 10.5C43 25 38 32 24 42z"/><path class="ln lt" d="M11 17h26M9 24h30M24 12v28"/><circle class="dk" cx="14" cy="13" r="1.2"/><circle class="dk" cx="34" cy="13" r="1.2"/>',
  r_dornen:   '<path class="f2" d="M24 0l3 6h-6zM44 11l-2 6.5-4.5-4zM4 11l2 6.5 4.5-4zM44 27l-5 4.5-.5-6zM4 27l5 4.5.5-6z"/>' + P_SHIELD + '<path class="f2" d="M24 12l9 3v6.5c0 7-4.5 12-9 14.5-4.5-2.5-9-7.5-9-14.5V15z"/>',
  r_midas:    '<path class="f1" fill-rule="evenodd" d="M24 17a13 13 0 1 1 0 26 13 13 0 1 1 0-26zm0 5a8 8 0 1 0 0 16 8 8 0 1 0 0-16z"/><path class="f2" d="M24 5l6.5 7-6.5 6.5-6.5-6.5z"/><path class="hl" d="M24 7.5l3 3.5-3 3z"/>',
  r_horn:     '<path class="bn" d="M5 12c4-3 10-2.5 14 1 7 6 11.5 14 13 22l7-1 3 7H26c-.5-9-5.5-17.5-12-22.5-3-2.3-6-4-9-6.5z"/><path class="f1" d="M13.5 14.5l2.5-3.5 3 2.2-2.4 3.6zM21 21l3-3 2.8 2.5-3 3.2zM26.5 29l3.3-2 2 3.3-3.4 2z"/><path class="f1" d="M32 34l7-1 3 7H30z"/>',
  r_stiefel:  '<path class="f1" d="M14 5h13v22l11.5 5.5c3 1.4 4.5 4 4.5 7V41H14z"/><rect class="dk" x="14" y="40.5" width="29" height="4" rx="1"/><path class="gd" d="M9 20c2 3 3 4.5 3 6a3 3 0 0 1-6 0c0-1.5 1-3 3-6zM8 32c1.5 2.2 2.2 3.3 2.2 4.4a2.2 2.2 0 0 1-4.4 0c0-1.1.7-2.2 2.2-4.4z"/><path class="ln lt" d="M14 12h13M14 18h13"/>',
  r_glueck:   '<circle class="f1" cx="24" cy="24" r="19"/><circle class="rg" cx="24" cy="24" r="15"/><circle class="gd" cx="24" cy="17.5" r="5"/><circle class="gd" cx="30.5" cy="24" r="5"/><circle class="gd" cx="24" cy="30.5" r="5"/><circle class="gd" cx="17.5" cy="24" r="5"/><path class="ln lt" d="M24 24l5 8"/>',
  r_auge:     '<path class="f2" d="M3 24c6.5-9.5 13.5-14 21-14s14.5 4.5 21 14c-6.5 9.5-13.5 14-21 14S9.5 33.5 3 24z"/><circle class="f1" cx="24" cy="24" r="8"/><circle class="dk" cx="24" cy="24" r="3.5"/><circle class="hl" cx="21.5" cy="21.5" r="2"/>',
  r_kanone:   '<path class="f2" d="M7 22.5l29-10 4.5 12-29 10z"/><path class="ln lt" d="M17 22l3 7 4-5 3 6"/><circle class="f1" cx="15" cy="35" r="8"/><circle class="dk" cx="15" cy="35" r="2.4"/><circle class="gl" cx="41" cy="16" r="3"/>',
  r_feuerfest:P_SHIELD.replace('f1', 'f2') + '<path class="f1" d="M24 13c4.5 4.5 7 8.5 7 12a7 7 0 0 1-14 0c0-2.5 1-4.5 2.8-6.2.4 2.2 1.5 3.5 2.7 4 0-3.5.3-6.5 1.5-9.8z"/>',
  r_feilscher:'<path class="ln" d="M24 7v31M9 13h30M9 13l-6 12M9 13l6 12M39 13l-6 12M39 13l6 12"/><path class="f1" d="M2 25a7 7 0 0 0 14 0zM32 25a7 7 0 0 0 14 0z"/><rect class="f2" x="15" y="38" width="18" height="5" rx="1.5"/><circle class="gl" cx="24" cy="7" r="3"/>',
  r_titan:    '<path class="f1" d="M24 44C9 33.5 4 26 4 18.5 4 12 8.5 7.5 14.5 7.5c4.2 0 7.5 2.2 9.5 5.2 2-3 5.3-5.2 9.5-5.2C39.5 7.5 44 12 44 18.5 44 26 39 33.5 24 44z"/><path class="bd" d="M24 13v31L12 29zM24 13l12 16-12 15z" opacity=".35"/>' + P_CROWN.replace('d="M15.5 12.5l1.8-7 4 3.6L24 3.5l2.7 5.6 4-3.6 1.8 7z"', 'd="M17 11l1.4-6 3.4 3L24 3l2.2 5 3.4-3 1.4 6z"')
};
const icon = (n, cls = '') => `<svg class="ic i-${n} ${cls}" viewBox="0 0 48 48" aria-hidden="true">${ICON[n] || ICON.spark}</svg>`;

/* =====================================================================
   OBERFLÄCHE: Toasts, Sheets, Bildschirme
   ===================================================================== */
const toastEl = $('#toast'), toastQ = [];
let toastBusy = false;
function toast(title, sub, ic = 'spark', sound = 'ach'){
  toastQ.push({ title, sub, ic, sound });
  nextToast();
}
function nextToast(){
  if (toastBusy || !toastQ.length) return;
  toastBusy = true;
  const t = toastQ.shift();
  toastEl.innerHTML = `${icon(t.ic)}<div><small>${t.sub}</small><b>${t.title}</b></div>`;
  toastEl.hidden = false;
  if (t.sound && Sfx[t.sound]) Sfx[t.sound]();
  buzz([25, 40, 25]);
  setTimeout(() => { toastEl.hidden = true; toastBusy = false; nextToast(); }, 2600);
}

const sheetBack = $('#sheetBack'), sheetEl = $('#sheet');
let sheetActs = {}, sheetDismiss = null;
function sheet(html, acts = {}, dismiss = null){
  sheetEl.innerHTML = html;
  sheetActs = acts;
  sheetDismiss = dismiss;
  sheetBack.hidden = false;
  sheetEl.scrollTop = 0;
}
function closeSheet(){ sheetBack.hidden = true; sheetActs = {}; sheetDismiss = null; }
const sheetOpen = () => !sheetBack.hidden;
sheetEl.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b || b.disabled) return;
  const act = b.dataset.act;
  if (!act) return;
  Sfx.ui();
  const fn = sheetActs[act];
  if (fn) fn(b);
});
sheetBack.addEventListener('click', e => { if (e.target === sheetBack && sheetDismiss){ Sfx.ui(); sheetDismiss(); } });

const SCREENS = {};
let current = 'hub';
function go(id){
  closeSheet();
  const prev = SCREENS[current];
  if (prev && prev.leave && current !== id) prev.leave();
  $$('.screen').forEach(s => { s.hidden = s.id !== id; });
  current = id;
  const next = SCREENS[id];
  if (next && next.enter) next.enter();
}

/* ---------- Banner (Boss, Etage, Sieg) ---------- */
function banner(el, { kind = '', ic = '', eyebrow = '', title = '', sub = '' }, ms = 1900){
  return new Promise(res => {
    el.className = 'banner ' + kind;
    el.innerHTML = `<div class="bn-card">${ic ? icon(ic) : ''}<span class="bn-eyebrow">${eyebrow}</span><span class="bn-title">${title}</span>${sub ? `<span class="bn-sub">${sub}</span>` : ''}</div>`;
    el.hidden = false;
    const done = () => { el.classList.add('out'); setTimeout(() => { el.hidden = true; res(); }, wait(340)); };
    const t = setTimeout(done, wait(reduceMotion ? 900 : ms));
    el.onclick = () => { clearTimeout(t); done(); };
  });
}

/* =====================================================================
   UPGRADES (für beide Spiele)
   ===================================================================== */
const UPS = {
  kerker: { cur: 'Gold', ic: 'coin', items: [
    { id: 'hp',     name: 'Zähe Haut',      desc: '+2 maximale Leben pro Stufe', costs: [30, 70, 140, 260] },
    { id: 'armor',  name: 'Kettenhemd',     desc: 'Jeder Lauf startet mit +2 Rüstung pro Stufe', costs: [25, 60, 120] },
    { id: 'wpn',    name: 'Waffenpflege',   desc: 'Die Startwaffe hat +1 Stärke pro Stufe. Helden ohne Waffe bekommen einen Dolch.', costs: [30, 75, 150] },
    { id: 'luck',   name: 'Glücksklee',     desc: 'Mehr Tränke und Truhen im Kerker', costs: [20, 50, 100] },
    { id: 'charge', name: 'Kampfgeist',     desc: 'Die Heldenfähigkeit startet mit +1 Ladung pro Stufe', costs: [40, 90, 180] },
    { id: 'vorrat', name: 'Vorratskiste',   desc: 'Jeder Lauf beginnt mit einem Heiltrank in der Tasche', costs: [80] },
    { id: 'taschen',name: 'Größerer Rucksack', desc: '+1 Taschenplatz in jedem Lauf', costs: [160] },
    { id: 'relic',  name: 'Reliquienjäger', desc: 'Jeder Lauf beginnt mit einer Relikt-Wahl', costs: [220] }
  ]},
  licht: { cur: 'Funken', ic: 'spark', items: [
    { id: 'shield', name: 'Startschild',  desc: 'Jeder Lauf startet mit einem Schild mehr', costs: [30, 80, 160] },
    { id: 'magnet', name: 'Funkenmagnet', desc: 'Zieht Funken aus größerer Entfernung an', costs: [25, 60, 130] },
    { id: 'glow',   name: 'Nachglühen',   desc: 'Die Funkenkette reißt später ab', costs: [20, 50, 110] },
    { id: 'power',  name: 'Kraftquelle',  desc: 'Power-ups halten 25 % länger pro Stufe', costs: [30, 70, 150] },
    { id: 'fever',  name: 'Überladung',   desc: 'Die Überladung lädt schneller und hält länger', costs: [40, 90, 180] },
    { id: 'revive', name: 'Wiedergeburt', desc: 'Einmal pro Lauf kostenlos weiterspielen', costs: [250] }
  ]}
};
function openShop(game, back){
  const g = D[game], U = UPS[game];
  sheet(`<h2>Upgrades</h2>
    <p class="bank">${icon(U.ic, 'cur-' + game)} Schatz: <b>${fmt(g.bank)}</b> ${U.cur}</p>
    <ul class="list">${U.items.map(it => {
      const lv = g.up[it.id] || 0, cost = it.costs[lv];
      return `<li><div class="info"><b>${it.name}</b><span>${it.desc}</span>
        <span class="pips">${it.costs.map((_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</span></div>
        ${cost == null ? '<span class="maxed">Voll</span>'
          : `<button type="button" class="btn small" data-act="buy" data-id="${it.id}" ${g.bank < cost ? 'disabled' : ''} aria-label="${it.name} für ${cost} ${U.cur} kaufen">${fmt(cost)}</button>`}</li>`;
    }).join('')}</ul>
    <button type="button" class="btn sec" data-act="back">Zurück</button>`,
    {
      back,
      buy: b => {
        const id = b.dataset.id, it = U.items.find(x => x.id === id), cost = it.costs[g.up[id] || 0];
        if (cost == null || g.bank < cost) return;
        g.bank -= cost; g.up[id] = (g.up[id] || 0) + 1; save();
        Sfx.chest(); buzz(20);
        openShop(game, back);
      }
    }, back);
}

/* =====================================================================
   ERFOLGE
   ===================================================================== */
const ACH = [
  { id: 'k_first',   g: 'k', name: 'Erste Beute',        desc: 'Besiege dein erstes Monster.' },
  { id: 'k_boss',    g: 'k', name: 'Wächter gefallen',   desc: 'Besiege einen Boss.' },
  { id: 'k_floor3',  g: 'k', name: 'Knochenbrecher',     desc: 'Erreiche Welt 3 im Abenteuer.' },
  { id: 'k_win',     g: 'k', name: 'Drachentöter',       desc: 'Besiege den Uralten Drachen.' },
  { id: 'k_deep',    g: 'k', name: 'Bodenlos',           desc: 'Schaffe 20 Räume in der Endlosen Gruft.' },
  { id: 'k_deep2',   g: 'k', name: 'Abgrundtief',        desc: 'Schaffe 40 Räume in der Endlosen Gruft.' },
  { id: 'k_streak',  g: 'k', name: 'Blutrausch',         desc: 'Erreiche eine Serie von 5 Siegen in Folge.' },
  { id: 'k_crit',    g: 'k', name: 'Glückspilz',         desc: 'Lande 5 kritische Treffer in einem Lauf.' },
  { id: 'k_rich',    g: 'k', name: 'Goldgräber',         desc: 'Habe 300 Gold auf einmal.' },
  { id: 'k_relics',  g: 'k', name: 'Reliquienjäger',     desc: 'Besitze 6 Relikte gleichzeitig.' },
  { id: 'k_bomb',    g: 'k', name: 'Sprengmeister',      desc: 'Besiege 2 Monster mit einer Explosion.' },
  { id: 'k_mimic',   g: 'k', name: 'Reingefallen',       desc: 'Lass dich von einem Mimic beißen.' },
  { id: 'k_phoenix', g: 'k', name: 'Wiedergeboren',      desc: 'Werde von der Phönixfeder gerettet.' },
  { id: 'k_heroes',  g: 'k', name: 'Heldenrat',          desc: 'Schalte alle sechs Helden frei.' },
  { id: 'k_daily',   g: 'k', name: 'Tagwerk',            desc: 'Spiele eine Tagesgruft.' },
  { id: 'k_codex',   g: 'k', name: 'Forscher',           desc: 'Entdecke alle Monster im Kompendium.' },
  { id: 'k_allwin',  g: 'k', name: 'Legende',            desc: 'Gewinne das Abenteuer mit allen sechs Helden.' },
  { id: 'k_level10', g: 'k', name: 'Veteranin des Kerkers', desc: 'Erreiche Stufe 10 in einem Lauf.' },
  { id: 'k_elite',   g: 'k', name: 'Elitejäger',         desc: 'Besiege insgesamt 10 Elite-Gegner.' },
  { id: 'k_nohit',   g: 'k', name: 'Unberührbar',        desc: 'Besiege einen Boss, ohne im Bosskampf Leben zu verlieren.' },
  { id: 'k_items',   g: 'k', name: 'Taschenspieler',     desc: 'Benutze insgesamt 50 Gegenstände.' },
  { id: 'k_sigil',   g: 'k', name: 'Siegelbrecher',      desc: 'Finde alle drei Siegelsplitter in einem Lauf.' },
  { id: 'k_abyss',   g: 'k', name: 'Der wahre Grund',    desc: 'Besiege den Namenlosen im Abgrund.' },
  { id: 'k_asc1',    g: 'k', name: 'Aufgestiegen',       desc: 'Gewinne auf Aufstieg 1 oder höher.' },
  { id: 'k_asc5',    g: 'k', name: 'Gipfelstürmer',      desc: 'Gewinne auf Aufstieg 5 oder höher.' },
  { id: 'k_asc10',   g: 'k', name: 'Unsterblich',        desc: 'Gewinne auf Aufstieg 10.' },
  { id: 'l_1k',      g: 'l', name: 'Erste Strecke',      desc: 'Erreiche 1.000 Punkte.' },
  { id: 'l_5k',      g: 'l', name: 'Lichtgeschwindigkeit', desc: 'Erreiche 5.000 Punkte.' },
  { id: 'l_20k',     g: 'l', name: 'Lichtjahr',          desc: 'Erreiche 20.000 Punkte.' },
  { id: 'l_combo',   g: 'l', name: 'Kettenreaktion',     desc: 'Bring den Multiplikator auf ×5.' },
  { id: 'l_combo8',  g: 'l', name: 'Supernova',          desc: 'Bring den Multiplikator auf ×8.' },
  { id: 'l_near',    g: 'l', name: 'Haarscharf',         desc: 'Weiche in einem Lauf 10-mal knapp aus.' },
  { id: 'l_fever',   g: 'l', name: 'Überladen',          desc: 'Löse die Überladung aus.' },
  { id: 'l_zone5',   g: 'l', name: 'Sturmjäger',         desc: 'Erreiche Zone 5.' },
  { id: 'l_power',   g: 'l', name: 'Werkzeugkasten',     desc: 'Sammle 5 Power-ups in einem Lauf.' },
  { id: 'l_rank',    g: 'l', name: 'Veteran',            desc: 'Erreiche Läufer-Rang 10.' },
  { id: 'l_skin',    g: 'l', name: 'Neues Leuchten',     desc: 'Kaufe einen Skin.' }
];
function unlock(id){
  if (D.ach[id]) return;
  const a = ACH.find(x => x.id === id);
  if (!a) return;
  D.ach[id] = Date.now(); save();
  toast(a.name, 'Erfolg freigeschaltet', 'spark', 'ach');
}
function achSheet(){
  if (EMB) return achSheetOne(EMB.g === 'licht' ? 'l' : 'k');
  const n = ACH.filter(a => D.ach[a.id]).length;
  const group = (g, title) => {
    const list = ACH.filter(a => a.g === g), got = list.filter(a => D.ach[a.id]).length;
    return `<div class="ach-group"><h3>${title}</h3><h3>${got}/${list.length}</h3></div>
      <ul class="list ach">${list.map(a => `<li class="${D.ach[a.id] ? '' : 'locked'}">
        <span class="medal">${D.ach[a.id] ? icon('spark') : '?'}</span>
        <div class="info"><b>${a.name}</b><span>${a.desc}</span></div></li>`).join('')}</ul>`;
  };
  sheet(`<h2>Erfolge</h2><p>${n} von ${ACH.length} freigeschaltet.</p>
    ${group('k', 'Kerker-Wischer')}${group('l', 'Lichtläufer')}
    <button type="button" class="btn sec" data-act="close">Schließen</button>`, { close: closeSheet }, closeSheet);
}

function achSheetOne(g){
  const list = ACH.filter(a => a.g === g), got = list.filter(a => D.ach[a.id]).length;
  sheet(`<h2>Erfolge</h2><p>${got} von ${list.length} freigeschaltet.</p>
    <ul class="list ach">${list.map(a => `<li class="${D.ach[a.id] ? '' : 'locked'}">
      <span class="medal">${D.ach[a.id] ? icon('spark') : '?'}</span>
      <div class="info"><b>${a.name}</b><span>${a.desc}</span></div></li>`).join('')}</ul>
    <h2>Statistik</h2>${g === 'k' ? kStatsHTML() : lStatsHTML()}
    <button type="button" class="btn sec" data-act="close">Schließen</button>`, { close: closeSheet }, closeSheet);
}

/* =====================================================================
   STARTSEITE, EINSTELLUNGEN, STATISTIK
   ===================================================================== */
function kStatsHTML(){
  const s = D.stats;
  return `<dl class="statlist">
      <dt>Läufe</dt><dd>${fmt(s.kRuns)}</dd>
      <dt>Siege im Abenteuer</dt><dd>${fmt(s.kWins)}</dd>
      <dt>Höchster Aufstieg</dt><dd>${fmt(D.kerker.ascMax || 0)}</dd>
      <dt>Räume geschafft</dt><dd>${fmt(s.kRooms || 0)}</dd>
      <dt>Monster besiegt</dt><dd>${fmt(s.kKills)}</dd>
      <dt>Elite-Gegner besiegt</dt><dd>${fmt(s.kElites || 0)}</dd>
      <dt>Bosse besiegt</dt><dd>${fmt(s.kBosses)}</dd>
      <dt>Gold gesammelt</dt><dd>${fmt(s.kGold)}</dd>
      <dt>Relikte gefunden</dt><dd>${fmt(s.kRelics)}</dd>
      <dt>Längste Serie</dt><dd>${fmt(s.kBestStreak)}</dd>
      <dt>Endlose Gruft (Räume)</dt><dd>${fmt(D.kerker.bestDepth || 0)}</dd>
      <dt>Gegenstände benutzt</dt><dd>${fmt(D.kerker.itemsUsed || 0)}</dd>
    </dl>`;
}
function lStatsHTML(){
  const s = D.stats;
  return `<dl class="statlist">
      <dt>Läufe</dt><dd>${fmt(s.lRuns)}</dd>
      <dt>Rekord</dt><dd>${fmt(D.licht.best)}</dd>
      <dt>Strecke gesamt</dt><dd>${fmt(s.lDist / 10)} m</dd>
      <dt>Funken gesammelt</dt><dd>${fmt(s.lSparks)}</dd>
      <dt>Überladungen</dt><dd>${fmt(s.lFevers)}</dd>
      <dt>Power-ups</dt><dd>${fmt(s.lPowers)}</dd>
      <dt>Bester Multiplikator</dt><dd>×${s.lBestMult}</dd>
      <dt>Rang</dt><dd>${D.licht.rank}</dd>
    </dl>`;
}
function statsSheet(){
  sheet(`<h2>Statistik</h2>
    <h3>Kerker-Wischer</h3>${kStatsHTML()}
    <h3>Lichtläufer</h3>${lStatsHTML()}
    <button type="button" class="btn sec" data-act="close">Schließen</button>`, { close: closeSheet }, closeSheet);
}
function settingsSheet(confirmReset = false){
  if (confirmReset){
    sheet(`<h2>Alles löschen?</h2>
      <p>${EMB && EMB.name ? `Der Spielstand von <b>${EMB.name.replace(/[<&]/g, '')}</b> für Kerker-Wischer und Lichtläufer wird gelöscht: ` : ''}Rekorde, Schatz, Upgrades, Helden, Skins und Erfolge. Das lässt sich nicht rückgängig machen.</p>
      <div class="row"><button type="button" class="btn" data-act="wipe">Endgültig löschen</button>
      <button type="button" class="btn sec" data-act="back">Abbrechen</button></div>`,
      { wipe: () => {
          const style = D.style, snd = D.sound, vib = D.vibe;
          D = freshSave(); D.style = style;
          if (EMB){ D.sound = snd; D.vibe = vib; }
          save(); closeSheet();
          if (EMB){ ccPost({ t: 'wipe' }); go(EMB.g === 'licht' ? 'lmenu' : 'kmenu'); } else refreshHub();
          toast('Spielstand gelöscht', 'Neuanfang', 'spark', 'ui');
        },
        back: () => settingsSheet() }, () => settingsSheet());
    return;
  }
  const tg = (id, title, sub, on, dis = false) => `<button type="button" class="toggle" role="switch" data-act="${id}" aria-checked="${on}" ${dis ? 'disabled' : ''}>
      <span class="t-text"><b>${title}</b><span>${sub}</span></span><span class="switch"></span></button>`;
  if (EMB){
    sheet(`<h2>Einstellungen</h2>
      <div class="toggles">
        ${tg('music', 'Musik', EMB.sound ? 'Eigene Stücke für Kerker, Bosse und Lauf' : 'Der Ton ist im Couchclub ausgeschaltet', musicOn(), !EMB.sound)}
      </div>
      <p class="fine">Soundeffekte, Vibration und Animationen stellst du in den Couchclub-Einstellungen ein.</p>
      <div class="row"><button type="button" class="btn sec" data-act="close">Fertig</button>
      <button type="button" class="btn ghost" data-act="reset">Spielstand löschen</button></div>`,
      {
        music: () => { D.music = !D.music; save(); audio(); Music.refresh(); settingsSheet(); },
        reset: () => settingsSheet(true),
        close: closeSheet
      }, closeSheet);
    return;
  }
  sheet(`<h2>Einstellungen</h2>
    <div class="toggles">
      ${tg('sound', 'Soundeffekte', 'Treffer, Münzen, Explosionen', D.sound)}
      ${tg('music', 'Musik', 'Eigene Stücke für Kerker, Bosse und Lauf', D.music)}
      ${tg('vibe', 'Vibration', canVibe ? 'Kurzes Rütteln bei Treffern' : 'Auf diesem Gerät nicht verfügbar', D.vibe && canVibe, !canVibe)}
    </div>
    <h3>Als App auf dem Handy</h3>
    <p class="fine">Android: Im Browser-Menü „Zum Startbildschirm hinzufügen“ wählen. iPhone: In Safari auf „Teilen“ und dann „Zum Home-Bildschirm“ tippen. Danach startet das Spiel wie eine App und läuft ohne Internet.</p>
    <div class="row"><button type="button" class="btn sec" data-act="close">Fertig</button>
    <button type="button" class="btn ghost" data-act="reset">Spielstand löschen</button></div>`,
    {
      sound: () => { D.sound = !D.sound; save(); settingsSheet(); },
      music: () => { D.music = !D.music; save(); audio(); Music.refresh(); settingsSheet(); },
      vibe: () => { D.vibe = !D.vibe; save(); buzz(30); settingsSheet(); },
      reset: () => settingsSheet(true),
      close: closeSheet
    }, closeSheet);
}

function setStyle(s){
  if (EMB) s = 'warm';
  D.style = s; save();
  root.dataset.style = s;
  $$('[data-style-btn]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.styleBtn === s)));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', s === 'papier' ? '#FBF8F0' : '#EDE6D6');
  const scr = SCREENS[current];
  if (scr && scr.restyle) scr.restyle();
}

let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; const b = $('#btnInstall'); if (b) b.hidden = false; });

const MINI = [['monster', 3, 'archer'], ['stairs', 0, 'stairs'], ['monster', 2, 'kobold'], ['weapon', 5, 'axe'], ['hero', 10, 'ritter'], ['bomb', 3, 'bomb'], ['item', 0, 'scroll_fire'], ['monster', 8, 'skull'], ['monster', 12, 'golem']];
function refreshHub(){
  $('#miniBoard').innerHTML = MINI.map(([t, , ic]) => `<div class="mcard t-${t} k-${ic}"><div class="ci">${icon(ic)}</div></div>`).join('');
  const kd = D.kerker, today = todayKey();
  $('#kHubStats').innerHTML = `<span>Siege <b>${fmt(D.stats.kWins)}</b></span><span>Beste Welt <b>${kd.bestWorld || '–'}</b></span>${kd.ascMax ? `<span>Aufstieg <b>${kd.ascMax}</b></span>` : ''}<span>Schatz <b>${fmt(kd.bank)}</b></span>`;
  $('#kDailyChip').hidden = kd.daily.key === today;
  const ld = D.licht, open = ld.missions.filter(m => m.prog < m.target).length;
  $('#lHubStats').innerHTML = `<span>Rekord <b>${fmt(ld.best)}</b></span><span>Rang <b>${ld.rank}</b></span><span>Funken <b>${fmt(ld.bank)}</b></span>` + (ld.missions.length ? `<span>Missionen offen <b>${open}</b></span>` : '');
  const n = ACH.filter(a => D.ach[a.id]).length;
  $('#btnAch').innerHTML = `${icon('spark')}Erfolge ${n}/${ACH.length}`;
  if (window.drawLichtPreview) window.drawLichtPreview();
}
SCREENS.hub = {
  enter(){ refreshHub(); Music.play('menu'); },
  restyle(){ refreshHub(); }
};
