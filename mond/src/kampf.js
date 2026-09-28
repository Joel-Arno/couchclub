/* =====================================================================
   BÜHNE: die Figuren und ihre Plätze
   ===================================================================== */
const Stage = {
  P: null, E: null, N: null, showP: true, showE: false, showN: false, enterT: 0,
  place(){
    const [W, Hh] = World.size(), A = World.arenaW(), gy = World.groundY();
    const H = Math.min(Hh * .2, A * .42);
    if (this.P){ this.P.x = W / 2 - A * .22; this.P.gy = gy; this.P.H = H; }
    [this.E, this.N].forEach(a => {
      if (!a) return;
      const L = a.look, big = (L.scale || 1) > 1.3;
      // Breite Wesen wie die Spinne stehen näher an der Mitte, damit sie ganz ins Bild passen
      a.baseX = W / 2 + A * (L.breit ? .15 : big ? .26 : .2); a.gy = gy; a.H = H * (L.scale || 1);
      a.x = a.baseX + (a.enter || 0) * W * .5;
    });
  },
  // Spielfigur mit Herkunft und Ausrüstung
  hero(herk, waffe, schild){
    const w = WAFFEN[waffe] || WAFFEN.langschwert;
    const look = Object.assign({}, LOOK[herk] || LOOK.kron, { weapon: w.look, off: w.klasse === 'klinge' && schild ? (schild === 'glockenschild' ? 'glockenschild' : 'schild') : null, twoHand: w.klasse === 'speer' ? -.2 : w.klasse === 'wucht' ? .15 : 0 });
    const P = makeActor({ set: KLASSE_SET[w.klasse], look, face: 1 });
    if (this.P){ P.pose = this.P.pose; P.t = this.P.t; }
    this.P = P; this.place(); return P;
  },
  foe(key, enter = false){
    const d = FEINDE[key];
    this.E = makeActor({ set: d.set, look: LOOK[d.look || d.set], face: -1, enter: enter ? 1 : 0 });
    this.showE = true; this.place(); return this.E;
  },
  npc(key){
    const n = NPC[key];
    this.N = makeActor({ set: n.set || 'npc', look: LOOK[n.look], face: -1 });
    this.showN = true; this.place(); return this.N;
  },
  update(dt){
    [this.E, this.N].forEach(a => {
      if (!a || !a.enter) return;
      a.enter = Math.max(0, a.enter - dt / 700);
      const [W] = World.size(); a.x = a.baseX + EASE.out(a.enter) * W * .5;
    });
  }
};
const KLASSE_SET = { klinge: 'kron', speer: 'harp', wucht: 'moench' };

/* =====================================================================
   KAMPF: Reaktion. Gegner holen sichtbar aus, der Spieler weicht aus,
   blockt oder pariert im richtigen Moment.
   ===================================================================== */
const PARRY_WIN = 210, PARRY_CD = 480, DODGE = { dur: 500, i0: 30, i1: 380, perfect: 200 }, BUF = 320;

const Fight = (() => {
  let on = false, def = null, key = '', T = 0, hitStop = 0, slowUntil = 0, paused = false;
  let pl = null, en = null, W = null, P = null, E = null, onEnd = null, ended = false;
  let queue = [], idx = 0, glut = 0, dmgScale = 1;
  const tells = [], projs = [], eprojs = [];
  let stats = { parries: 0, perfect: 0, hits: 0, taken: 0 };
  const hook = { toast: () => {}, line: () => {}, foe: () => {} };

  /* ---------- Start ---------- */
  // o: { foes: [key, ...], profil, zustand: { hp, fp, flasks }, onEnd }
  function start(o){
    queue = o.foes.slice(); idx = 0; glut = 0; onEnd = o.onEnd; dmgScale = o.scale || 1;
    const pr = o.profil;
    W = pr.waffe;
    P = Stage.P;
    P.stance = null; P.anim = null; P.hideW = false; P.glow = 0;
    T = 0; hitStop = 0; slowUntil = 0; paused = false; ended = false;
    tells.length = 0; projs.length = 0; eprojs.length = 0;
    const z = o.zustand || {};
    pl = Object.assign({}, pr, {
      act: null, blockHeld: false, heavyHeld: false, blockPress: -1e9, lastParryTry: -1e9, lastSpend: -1e9,
      combo: 0, comboUntil: 0, buf: null
    });
    pl.hp = Math.min(pl.hpMax, z.hp == null ? pl.hpMax : z.hp);
    pl.fp = Math.min(pl.fpMax, z.fp == null ? pl.fpMax : z.fp);
    pl.flasks = z.flasks == null ? pl.flasksMax : z.flasks;
    pl.st = pl.stMax;
    stats = { parries: 0, perfect: 0, hits: 0, taken: 0 };
    World.setFlood(o.flood != null ? o.flood : World.sceneFlood()); World.setTint(0); World.setSlow(false);
    on = true;
    setupFoe(false);
  }
  function setupFoe(enter){
    key = queue[idx]; def = FEINDE[key];
    E = Stage.foe(key, enter);
    E.torn = false; E.glow = 0;
    const s = def.boss ? 1 : dmgScale;
    en = {
      hp: Math.round(def.hp * s), hpMax: Math.round(def.hp * s), pz: def.pz, pzMax: def.pz, st: 'idle', t0: 0,
      next: T + (enter ? 1500 : def.boss ? 3600 : 1300), move: null, hi: 0, told: [], trailed: [],
      phase: 1, lastPz: -1e9, hist: [], moves: def.moves, dmgMul: s, until: 0
    };
    tells.length = 0; eprojs.length = 0;
    hook.foe(def, idx, queue.length);
  }
  function stop(){ on = false; pl && (pl.blockHeld = false); World.setSlow(false); }
  function finish(result){
    if (ended) return;
    ended = true;
    setTimeout(() => {
      on = false;
      onEnd && onEnd(result, { hp: pl.hp, fp: pl.fp, flasks: pl.flasks, stats, glut, boss: def.boss ? key : null, idx });
    }, result === 'win' ? 1900 : 1800);
  }

  /* ---------- Spieler: Aktionen ---------- */
  const P_SET = () => SETS[P.set];
  function spend(c){ pl.st = Math.max(0, pl.st - c); pl.lastSpend = T; }
  function hasSt(c){ if (pl.st >= c * .5 && pl.st > 1) return true; hook.toast('st'); return false; }
  function act(k, o = {}){ pl.act = Object.assign({ k, t0: T, done: false }, o); }

  function startLight(){
    const i = T < pl.comboUntil ? (pl.combo + 1) % W.light.length : 0, L = W.light[i];
    if (!hasSt(L.st)) return true;
    spend(L.st); pl.combo = i; pl.comboUntil = T + L.dur + 260;
    act('light', { hit: L.hit, dur: L.dur, L });
    const S = P_SET();
    playAnim(P, [[0, S[L.pose + 'W']], [L.hit - 55, S[L.pose + 'W']], [L.hit, S[L.pose + 'S'], EASE.in], [L.hit + 90, S[L.pose + 'S']], [L.dur, S.idle]]);
    P.trailUntil = P.t + L.hit + 60;
    setTimeout(() => Snd.play('swing'), Math.max(0, L.hit - 80));
    return true;
  }
  // Schwerer Angriff: gedrückt ausholen, loslassen schlägt zu. Jede Waffe hat ihr eigenes Mindestausholen.
  function startHeavy(){
    if (!hasSt(W.heavy.st)) return true;
    spend(W.heavy.st);
    act('heavyW');
    playAnim(P, [[0, P_SET().hW]], true);
    return true;
  }
  function releaseHeavy(){
    const a = pl.act; if (!a || a.k !== 'heavyW') return;
    const H = W.heavy, held = T - a.t0, extra = Math.max(0, H.wind - held), charged = held >= H.wind + 420;
    const hit = H.hit + extra, dur = hit + H.dur;
    act('heavyS', { hit, dur, mult: charged ? 1.35 : 1 });
    const S = P_SET();
    playAnim(P, [[0, S.hW], [hit - 70, S.hW], [hit, S.hS, EASE.in], [hit + 140, S.hS], [dur, S.idle]]);
    P.trailUntil = P.t + hit + 80;
    if (charged){ P.glow = 1; World.pop(P.x, P.gy - P.H * 1.15, 'Aufgeladen', '#f4c08a', 13); }
    setTimeout(() => Snd.play('heavySwing'), Math.max(0, hit - 120));
  }
  function startDodge(){
    if (!hasSt(pl.dodgeSt)) return true;
    spend(pl.dodgeSt);
    act('dodge', { dur: DODGE.dur });
    const S = P_SET();
    playAnim(P, [[0, S.dodge], [300, S.dodge], [DODGE.dur, S.idle]]);
    Snd.play('dodge');
    World.ghost(P); setTimeout(() => on && World.ghost(P), 70); setTimeout(() => on && World.ghost(P), 150);
    return true;
  }
  function startParry(){
    const S = P_SET();
    if (T - pl.lastParryTry >= PARRY_CD){ pl.blockPress = T; pl.lastParryTry = T; }
    act('parry', { dur: 230 });
    playAnim(P, [[0, S.parry], [120, S.parry], [230, pl.blockHeld ? S.block : S.idle]]);
    return true;
  }
  function startHeal(){
    if (pl.flasks <= 0){ hook.toast('flask'); return true; }
    act('heal', { dur: 1000 });
    const S = P_SET();
    playAnim(P, [[0, S.heal], [800, S.heal], [1000, S.idle]]);
    return true;
  }
  function startArt(){
    const A = W.art;
    if (pl.fp < A.fp){ hook.toast('fp'); return true; }
    pl.fp -= A.fp;
    const hit = A.hits[0].t;
    act('art', { dur: A.dur, art: A, hitsDone: 0 });
    const S = P_SET();
    Snd.play('art');
    if (A.anim === 'sprung'){
      playAnim(P, [[0, S.artW], [200, S.artW], [380, S.artA, EASE.out], [hit, S.artS, EASE.in], [hit + 160, S.artS], [A.dur, S.idle]]);
    } else if (A.anim === 'wurf'){
      playAnim(P, [[0, S.artW], [200, S.artW], [260, S.artS, EASE.in], [460, S.artS], [A.dur, S.idle]]);
      setTimeout(() => { if (!on) return; P.hideW = true; projs.push({ t0: T, hit: hit - 240, back: 360, look: P.look.weapon }); }, 240);
    } else if (A.anim === 'wirbel'){
      const h2 = A.hits[1].t;
      playAnim(P, [[0, S.l2W], [hit - 60, S.l2W], [hit, S.l2S, EASE.in], [h2 - 70, S.l1W, EASE.io], [h2, S.l1S, EASE.in], [h2 + 120, S.l1S], [A.dur, S.idle]]);
    } else {
      playAnim(P, [[0, S.artW], [300, S.artA], [hit, S.artS, EASE.in], [hit + 220, S.artS], [A.dur, S.idle]]);
    }
    P.trailUntil = P.t + A.hits[A.hits.length - 1].t + 60;
    P.glow = 1;
    return true;
  }
  function startCrit(){
    act('crit', { hit: 380, dur: 820 });
    const S = P_SET();
    playAnim(P, [[0, S.l3W], [260, S.l3W], [380, S.crit, EASE.in], [560, S.crit], [820, S.idle]]);
    P.trailUntil = P.t + 440;
    return true;
  }

  function tryAct(k){
    const a = pl.act, t = a ? T - a.t0 : 0;
    if (pl.hp <= 0 || en.st === 'dead' || en.st === 'enter') return true;
    let free = !a || a.k === 'block';
    if (a && (a.k === 'light' || a.k === 'heavyS' || a.k === 'crit') && t >= a.hit + 70 && k !== 'flask' && k !== 'art') free = true;
    if (a && a.k === 'parry' && k === 'dodge') free = true;
    if (!free) return false;
    switch (k){
      case 'atk': return en.st === 'broken' ? startCrit() : startLight();
      case 'heavy': return startHeavy();
      case 'dodge': return startDodge();
      case 'block': return startParry();
      case 'art': return startArt();
      case 'flask': return startHeal();
    }
    return true;
  }
  function endAct(){
    const a = pl.act;
    pl.act = null;
    if (a && (a.k === 'art' || a.k === 'heavyS')) P.glow = 0;
    if (pl.blockHeld){ act('block'); P.stance = 'block'; } else P.stance = null;
    const b = pl.buf; pl.buf = null;
    if (b && T - b.t < BUF) tryAct(b.k);
  }

  /* ---------- Eingaben ---------- */
  function press(k){
    if (!on || paused || ended) return;
    if (k === 'block') pl.blockHeld = true;
    if (k === 'heavy') pl.heavyHeld = true;
    if (!tryAct(k)) pl.buf = { k, t: T };
  }
  function release(k){
    if (!on) return;
    if (k === 'block'){
      pl.blockHeld = false;
      if (pl.act && pl.act.k === 'block'){ pl.act = null; P.stance = null; }
    }
    if (k === 'heavy'){ pl.heavyHeld = false; if (pl.act && pl.act.k === 'heavyW') releaseHeavy(); }
  }

  /* ---------- Spieler: Ablauf pro Bild ---------- */
  function stepPlayer(){
    const a = pl.act; if (!a) return;
    const t = T - a.t0;
    if (a.k === 'heavyW' && (t >= W.heavy.wind + 900 || !pl.heavyHeld)) { releaseHeavy(); return; }
    if (a.hit != null && !a.done && t >= a.hit){ a.done = true; playerHits(a); }
    if (a.k === 'art'){
      const hs = a.art.hits;
      while (a.hitsDone < hs.length && t >= hs[a.hitsDone].t){ artHit(a.art, hs[a.hitsDone], a.hitsDone); a.hitsDone++; }
    }
    if (a.k === 'heal' && !a.healed && t >= 620){
      a.healed = true; pl.flasks--; const h = Math.round(pl.hpMax * pl.heal);
      pl.hp = Math.min(pl.hpMax, pl.hp + h);
      Snd.play('heal'); const c = chestPt(P); World.burst(c[0], c[1], 'heal', 18); World.pop(P.x, P.gy - P.H * 1.1, '+' + h, '#cfe3ff', 16);
    }
    if (a.dur && t >= a.dur) endAct();
  }
  function playerHits(a){
    if (a.k === 'light') return hitEnemy(a.L.d, a.L.pz, {});
    if (a.k === 'heavyS') return hitEnemy(W.heavy.d * a.mult, W.heavy.pz * a.mult, { heavy: true });
    if (a.k === 'crit') return hitEnemy(W.heavy.d * 2.4, 0, { crit: true, heavy: true });
  }
  function artHit(A, h, i){
    const c = chestPt(E);
    if (A.ring){
      Snd.play('geleut');
      const g = [P.x + P.H * .5, P.gy - P.H * .1], big = A.ring === 'gross';
      World.ring(g[0], g[1], 10, P.H * (big ? 2.4 : 1.6), 'rgba(230,220,190,.9)', big ? 900 : 700, 3);
      World.ring(g[0], g[1], 10, P.H * (big ? 1.7 : 1.1), 'rgba(200,225,255,.7)', 520, 2);
      World.shake(big ? 14 : 8);
    }
    if (A.heal && i === 0){ pl.hp = Math.min(pl.hpMax, pl.hp + A.heal); World.pop(P.x, P.gy - P.H * 1.1, '+' + A.heal, '#cfe3ff', 16); }
    if (A.anim === 'sprung'){ World.shake(12); World.burst(P.x + P.H * .5, P.gy, 'spark', 16); }
    const interrupted = A.interrupt && interrupt();
    hitEnemy(h.d, h.pz, { heavy: true, art: true });
    if (interrupted) World.pop(c[0], c[1] - E.H * .45, 'Unterbrochen', '#f4c08a', 15);
  }
  // Harpune und Haken reißen den Gegner aus dem Ausholen, aber nicht bei roten Angriffen
  function interrupt(){
    if (en.st !== 'move') return false;
    const nh = en.move.hits[en.hi];
    if (!nh || nh.t - (T - en.t0) < 140 || en.move.hits.some(h => h.k === 'u') && def.boss) return false;
    en.st = 'flinch'; en.until = T + 850; en.move = null; tells.length = 0; eprojs.length = 0; E.glow = 0;
    const S = SETS[E.set];
    playAnim(E, [[0, S.stagger], [500, S.stagger], [850, S.idle]]);
    return true;
  }

  /* ---------- Treffer am Gegner ---------- */
  function hitEnemy(d, pz, o){
    if (en.st === 'dead' || en.st === 'trans' || en.st === 'enter') return;
    const dmg = Math.max(1, Math.round(d * pl.dmgMul));
    en.hp = Math.max(0, en.hp - dmg);
    en.pz -= pz * pl.pzMul; en.lastPz = T; stats.hits++;
    const c = chestPt(E);
    World.pop(c[0] + (rnd() - .5) * 20, c[1] - 10, String(dmg), o.crit ? '#f4d27a' : '#eef1f5', o.crit ? 26 : o.heavy ? 21 : 18);
    World.burst(c[0], c[1], def.blut || 'drop', o.heavy ? 16 : 9, Math.PI);
    Snd.play(o.heavy ? 'hitHeavy' : 'hit');
    hitStop = o.crit ? 140 : o.heavy ? 85 : 55;
    E.shake = 140; World.shake(o.crit ? 16 : o.heavy ? 8 : 4);
    buzz(o.heavy ? 25 : 12);
    if (o.crit){ World.flash('#fff', .35); slowUntil = T + 260; World.burst(c[0], c[1], 'gold', 26); }
    if (en.hp <= 0) return enemyDie();
    if (def.phase2 && en.phase === 1 && en.hp <= en.hpMax * def.phase2.at) return phaseChange();
    if (o.crit){
      en.st = 'idle'; en.pz = en.pzMax; en.next = T + 1000; E.stance = null;
      playAnim(E, [[0, SETS[E.set].hurt], [300, SETS[E.set].stagger], [900, SETS[E.set].idle]]);
      return;
    }
    if (en.pz <= 0 && en.st !== 'broken') return breakPoise();
    if (en.st === 'idle' && !def.boss){
      en.next = Math.max(en.next, T + 280);
      playAnim(E, [[0, SETS[E.set].hurt], [240, SETS[E.set].idle]]);
    }
  }
  function breakPoise(){
    en.pz = 0; en.move = null; tells.length = 0; eprojs.length = 0; E.glow = en.phase === 2 ? .8 : 0; E.trailUntil = 0;
    Snd.play('hitHeavy'); World.flash('rgba(240,205,120,1)', .12);
    const c = chestPt(E); World.pop(c[0], c[1] - E.H * .5, 'Haltung gebrochen', '#f0cd78', 15);
    E.stance = 'stagger'; playAnim(E, [[0, SETS[E.set].stagger]]);
    en.st = 'broken'; en.until = T + 2700;
  }
  // Zweite Phase: jeder Boss hat seinen eigenen Auftritt
  function phaseChange(){
    const ph = def.phase2;
    en.phase = 2; en.st = 'trans'; en.until = T + 2800; en.move = null; tells.length = 0; eprojs.length = 0;
    en.moves = scaleMoves(def.moves, ph.tempo || .9); en.pz = en.pzMax; E.stance = null;
    const S = SETS[E.set], big = S.W_slam ? ['W_slam', 'S_slam'] : ['W_over', 'S_over'];
    playAnim(E, [[0, S.stagger], [700, S.stagger], [1300, S[big[0]], EASE.io], [1600, S[big[1]], EASE.in], [2200, S[big[1]]], [2800, S.idle]]);
    setTimeout(() => {
      if (!on) return;
      E.torn = true; E.glow = 1; World.shake(22);
      if (ph.fx === 'flut'){ World.setFlood(1.2); World.setTint(1); World.flash('rgba(190,240,236,1)', .25); World.burst(E.x, E.gy, 'drop', 40); Snd.play('wave'); }
      if (ph.fx === 'glocke'){ World.bell(1); World.setFlood(1.6); World.setTint(1); World.flash('rgba(210,220,255,1)', .3); Snd.bell(65.4, .5, 7, .9); }
      if (ph.fx === 'wut'){ World.flash('rgba(200,60,40,1)', .22); Snd.play('danger'); }
      World.ring(E.x, E.gy - E.H * .3, 20, E.H * 1.6, ph.fx === 'wut' ? 'rgba(235,110,90,.8)' : 'rgba(190,240,236,.8)', 900, 3);
      if (def.boss) Music.setLevel(1);
    }, 1600);
    if (ph.line) hook.line(ph.line, 5200, key + '.line2');
  }
  function enemyDie(){
    en.st = 'dead'; en.deadT = T; en.move = null; tells.length = 0; eprojs.length = 0; E.glow = 0;
    glut += Math.round(def.glut * (def.boss ? 1 : dmgScale));
    const S = SETS[E.set];
    playAnim(E, [[0, S.stagger], [400, S.kneel, EASE.out], [1100, S.dead, EASE.io]], true);
    Snd.play(def.boss ? 'bossDie' : 'enemyDie');
    slowUntil = T + (def.boss ? 900 : 400); World.setSlow(true); setTimeout(() => World.setSlow(false), 900);
    setTimeout(() => { if (!E) return; const c = chestPt(E); World.burst(c[0], c[1], 'mist', 16); World.glutFlow(c, chestPt(P), def.boss ? 60 : 24); Snd.play('glut'); }, 900);
    if (idx < queue.length - 1){
      // Der nächste Gegner tritt aus dem Nebel
      const dying = E;
      setTimeout(() => {
        if (!on || ended || pl.hp <= 0) return;
        idx++; setupFoe(true);
        en.st = 'enter'; en.until = T + 900;
      }, 2000);
      return;
    }
    finish('win');
  }

  /* ---------- Gegner: Ablauf ---------- */
  function scaleMoves(ms, f){
    const o = {};
    for (const k in ms){
      const m = ms[k];
      o[k] = Object.assign({}, m, { dur: m.dur * f, hits: m.hits.map(h => Object.assign({}, h, { t: h.t * f, hold: (h.hold || 0) * f })) });
    }
    return o;
  }
  function wpick(list){
    const cand = list.filter(([id]) => !(en.hist[0] === id && en.hist[1] === id));
    let tot = 0; cand.forEach(c => tot += c[1]);
    let r = rnd() * tot;
    for (const [id, w] of cand){ r -= w; if (r <= 0) return id; }
    return cand[0][0];
  }
  function chooseMove(){
    let id = wpick(en.phase === 2 ? def.phase2.p2 : def.p1);
    if (en.forceFast && def.punish){ id = def.punish; en.forceFast = false; }
    en.hist.unshift(id); en.hist.length = 3;
    return en.moves[id];
  }
  const strikeAt = h => h.t - (h.flug || 0);
  function moveTrack(set, m){
    const S = SETS[set], tr = [[0, S.idle]];
    let t = 0;
    m.hits.forEach(h => {
      const ts = strikeAt(h), lead = h.s === 'lunge' ? 180 : h.s === 'grab' ? 150 : 115;
      const Wp = S['W_' + h.s], Sp = S['S_' + h.s];
      const wT = ts - lead, reach = Math.max(t + 90, wT - (h.hold || 0) - 40);
      tr.push([reach, Wp, EASE.io]);
      if (wT > reach + 1) tr.push([wT, mkPose({ lean: Wp.lean - .03 }, Wp), EASE.lin]);
      tr.push([ts, Sp, EASE.in]);
      tr.push([ts + 120, Sp, EASE.lin]);
      t = ts + 120;
    });
    const end = Math.max(m.dur, t + 240);
    tr.push([t + (end - t) * .45, S.recover, EASE.out]);
    tr.push([end, S.idle, EASE.io]);
    return tr;
  }
  function beginMove(m){
    en.move = m; en.st = 'move'; en.t0 = T; en.hi = 0; en.told = []; en.trailed = []; en.shot = [];
    playAnim(E, moveTrack(E.set, m));
    if (m.hits.some(h => h.k === 'u')){ E.glow = Math.max(E.glow, .6); Snd.play('danger'); }
  }
  const tellLead = h => h.k === 'u' ? 480 : 320;
  function gap(){ const g = en.phase === 2 && def.phase2.gap ? def.phase2.gap : def.gap; return rr(g[0], g[1]); }

  function stepEnemy(dt){
    if (en.st === 'dead') return;
    if (en.st !== 'broken' && T - en.lastPz > 1600) en.pz = Math.min(en.pzMax, en.pz + def.pzRegen * dt / 1000);
    switch (en.st){
      case 'enter':
        if (T >= en.until){ en.st = 'idle'; en.next = T + 700; }
        break;
      case 'idle':
        if (pl.hp <= 0) break;
        if (def.punish && pl.act && pl.act.k === 'heal' && en.next - T > 260){ en.next = T + 180; en.forceFast = true; }
        if (T >= en.next) beginMove(chooseMove());
        break;
      case 'move': {
        const m = en.move, t = T - en.t0;
        m.hits.forEach((h, i) => {
          if (!en.told[i] && t >= h.t - tellLead(h)){
            en.told[i] = true;
            tells.push({ at: en.t0 + h.t, from: T, k: h.k, i });
            if (h.k !== 'u') Snd.play('tell');
          }
          const ts = strikeAt(h);
          if (!en.trailed[i] && t >= ts - 130){
            // Bei Geschossen zieht die Waffe keine Spur, sonst wirkt ein langer Stab wie eine Fahne
            en.trailed[i] = true; if (!h.flug) E.trailUntil = E.t + 200;
            if (h.s === 'lunge' || h.s === 'grab') Snd.play('heavySwing');
            else if (!h.flug) Snd.play(def.klang === 'kette' ? 'chain' : 'swing');
          }
          // Geschoss abfeuern
          if (h.flug && !en.shot[i] && t >= ts){
            en.shot[i] = true;
            launch(h);
          }
        });
        if (en.hi < m.hits.length && t >= m.hits[en.hi].t){
          const h = m.hits[en.hi]; en.hi++;
          resolveHit(h);
          if (en.hi >= m.hits.length) E.glow = en.phase === 2 ? 1 : 0;
        }
        if (en.st === 'move' && t >= m.dur){
          en.st = 'idle'; en.move = null; en.next = T + gap();
        }
        break;
      }
      case 'broken':
        if (T >= en.until){ en.st = 'idle'; en.pz = en.pzMax; en.next = T + 450; E.stance = null; }
        break;
      case 'flinch':
        if (T >= en.until){ en.st = 'idle'; en.next = T + 250; }
        break;
      case 'trans':
        if (T >= en.until){ en.st = 'idle'; en.next = T + 500; E.glow = 1; }
        break;
    }
  }
  function launch(h){
    const from = weaponTip(E), sfx = { welle: 'wave', salz: 'danger', netz: 'heavySwing', klang: 'geleut' }[h.proj];
    if (h.proj === 'welle'){ World.wave(E.x - E.H * .3, P.x + P.H * .1, h.flug); World.shake(10); World.burst(E.x - E.H * .3, E.gy, 'drop', 20); }
    else eprojs.push({ kind: h.proj, t0: T, t1: T + h.flug, from, k: h.k });
    if (sfx) Snd.play(sfx);
  }

  /* ---------- Treffer am Spieler ---------- */
  function resolveHit(h){
    if (pl.hp <= 0) return;
    const d = Math.round(h.d * en.dmgMul), a = pl.act, t = a ? T - a.t0 : 0;
    if (a && a.k === 'dodge' && t >= DODGE.i0 && t <= DODGE.i1){
      if (t <= DODGE.perfect && !a.perfect){ a.perfect = true; perfectDodge(); }
      else World.pop(P.x, P.gy - P.H * 1.1, 'Ausgewichen', '#aab4c2', 12);
      return;
    }
    const defending = !a || a.k === 'parry' || a.k === 'block';
    if (h.k === 'p' && defending && T - pl.blockPress <= PARRY_WIN) return parried(h);
    if (h.k !== 'u' && a && (a.k === 'block' || a.k === 'parry') && (pl.blockHeld || a.k === 'parry')){
      const cost = d * pl.blockSt * 1.15;
      if (pl.st >= cost * .5){ spend(cost); blocked(Math.round(d * (1 - pl.block))); return; }
      World.pop(P.x, P.gy - P.H * 1.15, 'Deckung gebrochen', '#e08a7e', 13);
      damagePlayer(Math.round(d * .7), 700);
      return;
    }
    damagePlayer(d, d >= 25 ? 650 : 380);
  }
  function blocked(taken){
    const s = P.sk ? toWorld(P, P.look.off === 'schild' ? P.sk.handB : P.sk.handA) : chestPt(P);
    Snd.play('block'); World.burst(s[0] + 6, s[1], 'spark', 12, 0); hitStop = 45; World.shake(4); P.shake = 90;
    playAnim(P, [[0, mkPose({ x: -.06 }, P_SET().block)], [200, P_SET().block]]);
    if (taken > 0){ pl.hp -= taken; stats.taken += taken; World.pop(P.x, P.gy - P.H * 1.1, String(taken), '#e0a39b', 14); if (pl.hp <= 0) die(); }
  }
  function parried(h){
    stats.parries++;
    pl.fp = Math.min(pl.fpMax, pl.fp + pl.parryFp);
    const s = P.sk ? toWorld(P, P.look.off === 'schild' ? P.sk.handB : P.sk.handA) : chestPt(P);
    Snd.play('parry'); World.burst(s[0] + 8, s[1], 'gold', 22, 0); World.ring(s[0] + 8, s[1], 6, P.H * .7, 'rgba(240,205,120,.95)', 380, 2.5);
    World.flash('rgba(240,205,120,1)', .1); World.pop(P.x, P.gy - P.H * 1.15, 'Pariert', '#f0cd78', 16);
    hitStop = 95; World.shake(6); E.shake = 220; buzz(20);
    playAnim(P, [[0, P_SET().parry], [180, P_SET().parry], [320, pl.blockHeld ? P_SET().block : P_SET().idle]]);
    en.pz -= (def.boss ? 30 : 22) * pl.pzMul; en.lastPz = T;
    if (en.pz <= 0) return breakPoise();
    // Wer den letzten Schlag pariert, bekommt eine Lücke
    if (en.move && en.hi >= en.move.hits.length){
      en.st = 'flinch'; en.until = T + 700; en.move = null; tells.length = 0;
      playAnim(E, [[0, SETS[E.set].hurt], [300, SETS[E.set].hurt], [700, SETS[E.set].idle]]);
    }
  }
  function perfectDodge(){
    stats.perfect++; pl.fp = Math.min(pl.fpMax, pl.fp + 6);
    Snd.play('perfect'); World.pop(P.x, P.gy - P.H * 1.15, 'Perfekt', '#bcd3f5', 15);
    slowUntil = T + 380; World.setSlow(true); setTimeout(() => World.setSlow(false), 700);
    const c = chestPt(P); World.ring(c[0], c[1], 8, P.H * .8, 'rgba(188,211,245,.8)', 460, 2);
  }
  function damagePlayer(d, stun){
    pl.hp -= d; stats.taken += d;
    World.pop(P.x, P.gy - P.H * 1.12, String(d), '#ff8c7a', d >= 25 ? 22 : 18);
    const c = chestPt(P); World.burst(c[0], c[1], 'drop', 10, Math.PI + (rnd() - .5));
    Snd.play('hurt'); World.shake(d >= 25 ? 14 : 8); World.flash('rgba(160,30,24,1)', .22); buzz(d >= 25 ? [40, 30, 40] : 35);
    hitStop = 70; P.shake = 160;
    if (pl.hp <= 0) return die();
    const a = pl.act;
    if (a && a.k === 'art' && a.art.hyper && T - a.t0 > a.art.hyper[0] && T - a.t0 < a.art.hyper[1]) return;   // unerschütterlich
    pl.act = null; pl.buf = null; P.glow = 0; P.hideW = false;
    act('hurt', { dur: stun });
    playAnim(P, [[0, P_SET().hurt], [stun * .6, P_SET().hurt], [stun, P_SET().idle]]);
  }
  function die(){
    pl.hp = 0; pl.act = { k: 'dead', t0: T }; pl.buf = null; P.glow = 0; P.hideW = false;
    const S = P_SET();
    playAnim(P, [[0, S.hurt], [500, S.kneel, EASE.out], [1300, S.dead, EASE.io]], true);
    en.move = null; tells.length = 0; eprojs.length = 0;
    if (en.st !== 'dead') en.st = 'idle';
    en.next = 1e12;
    slowUntil = T + 700; World.setSlow(true);
    Snd.play('death');
    finish('dead');
  }

  /* ---------- Pro Bild ---------- */
  function update(dtReal){
    if (!on || paused) return;
    let dt = dtReal;
    if (hitStop > 0){ hitStop -= dtReal; dt = 0; }
    else if (T < slowUntil) dt *= .35;
    T += dt;
    if (pl.hp > 0) stepPlayer();
    stepEnemy(dt);
    if (pl.hp > 0){
      const busy = pl.act && pl.act.k !== 'block' && pl.act.k !== 'parry' && pl.act.k !== 'hurt';
      const blocking = pl.act && (pl.act.k === 'block' || pl.act.k === 'parry');
      if (!busy && T - pl.lastSpend > 520) pl.st = Math.min(pl.stMax, pl.st + (blocking ? 20 : 55) * pl.stRegen * dt / 1000);
    }
    if (E.torn) E.glow = Math.max(E.glow, .8);
    // Besiegte Gegner lösen sich langsam auf
    if (en.st === 'dead') E.alpha = clamp(1 - (T - en.deadT - 1300) / 700, 0, 1);
    Stage.update(dt);
    updateActor(P, dt); updateActor(E, dt);
    for (let i = tells.length - 1; i >= 0; i--) if (T > tells[i].at + 200) tells.splice(i, 1);
    for (let i = eprojs.length - 1; i >= 0; i--) if (T > eprojs[i].t1 + 120) eprojs.splice(i, 1);
  }

  /* ---------- Zeichnen: Warnzeichen und Geschosse ---------- */
  const TELL_COL = { p: '240,205,120', b: '225,232,240', u: '235,90,70' };
  function drawFx(ctx){
    if (!on) return;
    if (en.st === 'move' && en.move && en.move.hits.slice(en.hi).some(h => h.k === 'u')){
      const c = chestPt(E), r = E.H * .75, pulse = .5 + .5 * Math.sin(T * .02);
      const g = ctx.createRadialGradient(c[0], c[1], r * .2, c[0], c[1], r);
      g.addColorStop(0, `rgba(200,50,40,${.18 + pulse * .12})`); g.addColorStop(1, 'rgba(200,50,40,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c[0], c[1], r, 0, TAU); ctx.fill();
    }
    drawTrail(ctx, P, 'rgba(214,224,238,1)');
    drawTrail(ctx, E, en.phase === 2 ? 'rgba(170,235,228,1)' : 'rgba(214,224,238,1)');
    for (const tl of tells){
      const left = tl.at - T, col = TELL_COL[tl.k];
      if (left < 320 && left > 80){
        const tip = weaponTip(E), k = 1 - (left - 80) / 240, s = Math.min(E.H, P.H * 1.1) * (.04 + .08 * Math.sin(k * Math.PI));
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.sin(k * Math.PI);
        ctx.fillStyle = `rgb(${col})`;
        ctx.beginPath(); ctx.moveTo(tip[0], tip[1] - s * 2); ctx.lineTo(tip[0] + s * .3, tip[1] - s * .3); ctx.lineTo(tip[0] + s * 2, tip[1]); ctx.lineTo(tip[0] + s * .3, tip[1] + s * .3);
        ctx.lineTo(tip[0], tip[1] + s * 2); ctx.lineTo(tip[0] - s * .3, tip[1] + s * .3); ctx.lineTo(tip[0] - s * 2, tip[1]); ctx.lineTo(tip[0] - s * .3, tip[1] - s * .3); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      if (S.ring && left > 0 && left < 700){
        const c = chestPt(P), k = 1 - left / 700, r0 = P.H * .38, r = r0 + (1 - k) * P.H * .9;
        ctx.save();
        ctx.strokeStyle = `rgba(${col},${.15 + k * .55})`; ctx.lineWidth = 1.5 + k * 1.5;
        ctx.beginPath(); ctx.arc(c[0], c[1], r, 0, TAU); ctx.stroke();
        ctx.strokeStyle = `rgba(${col},.18)`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(c[0], c[1], r0, 0, TAU); ctx.stroke();
        ctx.restore();
      }
    }
    // Geschosse der Gegner
    for (const g of eprojs){
      const k = clamp((T - g.t0) / (g.t1 - g.t0), 0, 1), to = chestPt(P);
      const x = lerp(g.from[0], to[0], k), y = lerp(g.from[1], to[1], k) - Math.sin(k * Math.PI) * P.H * .25;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      if (g.kind === 'salz'){
        for (let i = 0; i < 4; i++){
          const ox = Math.cos(T * .02 + i * 1.6) * 7, oy = Math.sin(T * .025 + i * 1.6) * 5;
          ctx.fillStyle = 'rgba(235,245,255,.85)';
          ctx.beginPath(); ctx.moveTo(x + ox, y + oy - 6); ctx.lineTo(x + ox + 3, y + oy); ctx.lineTo(x + ox, y + oy + 6); ctx.lineTo(x + ox - 3, y + oy); ctx.fill();
        }
        if (rnd() < .5) World.burst(x, y, 'spark', 1);
      } else if (g.kind === 'netz'){
        ctx.strokeStyle = 'rgba(210,220,225,.7)'; ctx.lineWidth = 1;
        const r = P.H * (.08 + .14 * k);
        for (let i = 0; i < 6; i++){ const an = i / 6 * TAU + T * .003; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(x, y, r * .6, 0, TAU); ctx.stroke();
      } else if (g.kind === 'klang'){
        ctx.strokeStyle = `rgba(200,225,255,${.8 - k * .3})`; ctx.lineWidth = 3;
        const r = P.H * (.2 + .5 * k);
        ctx.beginPath(); ctx.arc(x, y, r, Math.PI * .6, Math.PI * 1.4); ctx.stroke();
        ctx.beginPath(); ctx.arc(x + 14, y, r * .8, Math.PI * .6, Math.PI * 1.4); ctx.stroke();
      }
      ctx.restore();
    }
    // Harpune im Flug
    for (let i = projs.length - 1; i >= 0; i--){
      const pr = projs[i], t = T - pr.t0, total = pr.hit + 160 + pr.back;
      if (t > total){ projs.splice(i, 1); P.hideW = false; continue; }
      const hand = P.sk ? toWorld(P, P.sk.handA) : [P.x, P.gy - P.H * .6], tgt = chestPt(E);
      const k = t < pr.hit ? EASE.out(t / pr.hit) : t < pr.hit + 160 ? 1 : 1 - EASE.in((t - pr.hit - 160) / pr.back);
      const x = lerp(hand[0], tgt[0], k), y = lerp(hand[1], tgt[1], k);
      ctx.save(); ctx.strokeStyle = 'rgba(180,196,212,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hand[0], hand[1]);
      ctx.quadraticCurveTo((hand[0] + x) / 2, Math.max(hand[1], y) + 20 * (1 - k), x, y); ctx.stroke();
      ctx.translate(x, y); ctx.rotate(Math.atan2(tgt[1] - hand[1], tgt[0] - hand[0]));
      ctx.fillStyle = INK; ctx.strokeStyle = RIM; ctx.lineWidth = P.H * .016;
      ctx.beginPath(); ctx.moveTo(-P.H * .5, 0); ctx.lineTo(0, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -P.H * .03); ctx.lineTo(P.H * .12, 0); ctx.lineTo(0, P.H * .03); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  return {
    start, stop, update, drawFx, press, release, hook,
    on: () => on, def: () => def, pl: () => pl, en: () => en, key: () => key,
    count: () => [idx, queue.length], glut: () => glut,
    setPaused(v){ paused = v; if (v && pl){ pl.blockHeld = false; pl.heavyHeld = false; } },
    paused: () => paused,
    critReady: () => on && en && en.st === 'broken',
    debug: () => ({ T, pl, en, tells, W })
  };
})();
