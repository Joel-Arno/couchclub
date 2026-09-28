/* =====================================================================
   BÜHNE: die beiden Figuren und ihre Plätze
   ===================================================================== */
const Stage = {
  P: null, E: null, showP: true, showE: false,
  place(){
    const [W, Hh] = World.size(), A = World.arenaW(), gy = World.groundY();
    const H = Math.min(Hh * .2, A * .42);
    if (this.P){ this.P.x = W / 2 - A * .22; this.P.gy = gy; this.P.H = H; }
    if (this.E){
      const L = this.E.look;
      this.E.x = W / 2 + A * (L.scale > 1.3 ? .26 : .2); this.E.gy = gy; this.E.H = H * (L.scale || 1);
    }
  },
  hero(herk){ this.P = makeActor({ set: herk, look: LOOK[herk], face: 1 }); this.place(); return this.P; },
  foe(key){
    const d = FEINDE[key];
    this.E = makeActor({ set: d.set, look: LOOK[d.set], face: -1 });
    this.showE = true; this.place(); return this.E;
  }
};

/* =====================================================================
   KAMPF: gemeinsame Regeln für Reaktion und Runden
   ===================================================================== */
const PARRY_WIN = 210, PARRY_CD = 480, DODGE = { dur: 500, i0: 30, i1: 380, perfect: 200 }, BUF = 320;

const Fight = (() => {
  let on = false, mode = 'echt', def = null, key = '', T = 0, hitStop = 0, slowUntil = 0, paused = false;
  let pl = null, en = null, herk = null, P = null, E = null, onEnd = null, ended = false;
  const tells = [], projs = [];
  let stats = { parries: 0, perfect: 0, hits: 0, taken: 0 };
  let tb = null;
  const hook = { toast: () => {}, line: () => {}, turn: () => {} };

  /* ---------- Start ---------- */
  function start(o){
    key = o.foe; def = FEINDE[key]; mode = o.mode; herk = HERK[o.herk]; onEnd = o.onEnd;
    P = Stage.P; E = Stage.foe(key);
    P.stance = null; P.anim = null; P.hideW = false; P.glow = 0; E.torn = false; E.glow = 0;
    T = 0; hitStop = 0; slowUntil = 0; paused = false; ended = false; tells.length = 0; projs.length = 0;
    const g = o.stats;
    pl = {
      hpMax: herk.hp + g.vit * 12, stMax: herk.st + g.aus * 10, fpMax: herk.fp, dmgMul: 1 + g.str * .08,
      block: herk.block, blockSt: herk.blockSt, tbBlock: herk.tbBlock + g.aus * 2,
      flasks: g.flasks, flasksMax: g.flasksMax,
      act: null, blockHeld: false, heavyHeld: false, blockPress: -1e9, lastParryTry: -1e9, lastSpend: -1e9,
      combo: 0, comboUntil: 0, buf: null
    };
    pl.hp = Math.min(pl.hpMax, g.hp == null ? pl.hpMax : g.hp); pl.st = pl.stMax; pl.fp = g.fp == null ? pl.fpMax : g.fp;
    const hpMul = mode === 'runde' ? .85 : 1;
    en = {
      hp: Math.round(def.hp * hpMul), hpMax: Math.round(def.hp * hpMul), pz: def.pz, pzMax: def.pz, st: 'idle', t0: 0, next: 1300, move: null, hi: 0, told: [],
      phase: 1, lastPz: -1e9, hist: [], moves: def.moves, dmgMul: mode === 'runde' ? 1.15 : 1, buff: 1, armor: 0, until: 0, trailed: []
    };
    stats = { parries: 0, perfect: 0, hits: 0, taken: 0 };
    World.setFlood(0); World.setTint(0); World.setSlow(false);
    on = true;
    if (mode === 'runde') tbStart();
  }
  function stop(){ on = false; pl && (pl.blockHeld = false); World.setSlow(false); }
  function finish(result){
    if (ended) return;
    ended = true;
    setTimeout(() => { on = false; onEnd && onEnd(result, { hp: pl.hp, fp: pl.fp, flasks: pl.flasks, stats }); }, result === 'win' ? 1900 : 1800);
  }

  /* ---------- Spieler: Aktionen ---------- */
  const P_SET = () => SETS[P.set];
  function spend(c){ pl.st = Math.max(0, pl.st - c); pl.lastSpend = T; }
  function hasSt(c){ if (mode === 'runde') return true; if (pl.st >= c * .5 && pl.st > 1) return true; hook.toast('st'); return false; }
  function act(k, o = {}){ pl.act = Object.assign({ k, t0: T, done: false }, o); }
  function trailAt(hit, len = 150){ P.trailUntil = P.t + hit + 70; P.trailFrom = P.t + hit - len; }

  function startLight(){
    const i = T < pl.comboUntil ? (pl.combo + 1) % 3 : 0, L = herk.light[i];
    if (!hasSt(L.st)) return true;
    spend(L.st); pl.combo = i; pl.comboUntil = T + L.dur + 260;
    act('light', { hit: L.hit, dur: L.dur, L });
    const S = P_SET();
    playAnim(P, [[0, S[L.pose + 'W']], [L.hit - 55, S[L.pose + 'W']], [L.hit, S[L.pose + 'S'], EASE.in], [L.hit + 90, S[L.pose + 'S']], [L.dur, S.idle]]);
    P.trailUntil = P.t + L.hit + 60;
    setTimeout(() => Snd.play('swing'), Math.max(0, L.hit - 80));
    return true;
  }
  function startHeavy(){
    if (!hasSt(herk.heavy.st)) return true;
    spend(herk.heavy.st);
    act('heavyW');
    const S = P_SET();
    playAnim(P, [[0, S.hW]], true);
    return true;
  }
  function releaseHeavy(){
    const a = pl.act; if (!a || a.k !== 'heavyW') return;
    const held = T - a.t0, extra = Math.max(0, 180 - held), charged = held >= 520 && mode === 'echt';
    const hit = 130 + extra, dur = hit + herk.heavy.dur - 130;
    act('heavyS', { hit, dur, mult: charged ? 1.35 : 1 });
    const S = P_SET();
    playAnim(P, [[0, S.hW], [hit - 60, S.hW], [hit, S.hS, EASE.in], [hit + 120, S.hS], [dur, S.idle]]);
    P.trailUntil = P.t + hit + 70;
    if (charged){ P.glow = 1; World.pop(P.x, P.gy - P.H * 1.15, 'Aufgeladen', '#f4c08a', 13); }
    setTimeout(() => Snd.play('heavySwing'), Math.max(0, hit - 110));
  }
  function startDodge(){
    const c = herk.dodgeSt;
    if (!hasSt(c)) return true;
    spend(c);
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
    const A = herk.art;
    if (pl.fp < A.fp){ hook.toast('fp'); return true; }
    pl.fp -= A.fp;
    act('art', { hit: A.hit, dur: A.dur, art: A });
    const S = P_SET();
    Snd.play('art');
    if (A.id === 'kronhieb'){
      playAnim(P, [[0, S.artW], [200, S.artW], [380, S.artA, EASE.out], [A.hit, S.artS, EASE.in], [A.hit + 160, S.artS], [A.dur, S.idle]]);
      P.trailUntil = P.t + A.hit + 60;
    } else if (A.id === 'widerhaken'){
      playAnim(P, [[0, S.artW], [200, S.artW], [260, S.artS, EASE.in], [460, S.artS], [A.dur, S.idle]]);
      setTimeout(() => { if (!on) return; P.hideW = true; projs.push({ t0: T, hit: A.hit - 240, back: 360 }); }, 240);
    } else {
      playAnim(P, [[0, S.artW], [300, S.artA], [A.hit, S.artS, EASE.in], [A.hit + 220, S.artS], [A.dur, S.idle]]);
      P.trailUntil = P.t + A.hit + 60;
    }
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
    if (pl.hp <= 0 || en.st === 'dead') return true;
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
    if (a && a.k === 'art') P.glow = 0;
    if (a && a.k === 'heavyS') P.glow = 0;
    if (mode === 'echt' && pl.blockHeld){ act('block'); P.stance = 'block'; }
    else P.stance = mode === 'runde' && tb && (tb.block || tb.parry || tb.dodge) ? 'block' : null;
    if (mode === 'runde'){ tb.busy = false; hook.turn(); return; }
    const b = pl.buf; pl.buf = null;
    if (b && T - b.t < BUF) tryAct(b.k);
  }

  /* ---------- Eingaben ---------- */
  function press(k){
    if (!on || paused || mode !== 'echt' || ended) return;
    if (k === 'block') pl.blockHeld = true;
    if (k === 'heavy') pl.heavyHeld = true;
    if (!tryAct(k)) pl.buf = { k, t: T };
  }
  function release(k){
    if (!on || mode !== 'echt') return;
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
    if (a.k === 'heavyW' && (t >= 760 || (!pl.heavyHeld && mode === 'echt'))) { releaseHeavy(); return; }
    if (a.hit != null && !a.done && t >= a.hit){ a.done = true; playerHits(a); }
    if (a.k === 'heal' && !a.healed && t >= 620){
      a.healed = true; pl.flasks--; const h = Math.round(pl.hpMax * .45);
      pl.hp = Math.min(pl.hpMax, pl.hp + h);
      Snd.play('heal'); const c = chestPt(P); World.burst(c[0], c[1], 'heal', 18); World.pop(P.x, P.gy - P.H * 1.1, '+' + h, '#cfe3ff', 16);
    }
    if (a.dur && t >= a.dur) endAct();
  }
  function playerHits(a){
    if (a.k === 'light') return hitEnemy(a.L.d, a.L.pz, {});
    if (a.k === 'heavyS') return hitEnemy(herk.heavy.d * a.mult, herk.heavy.pz * a.mult, { heavy: true });
    if (a.k === 'crit') return hitEnemy(herk.heavy.d * 2.4, 0, { crit: true, heavy: true });
    if (a.k === 'art'){
      const A = a.art, c = chestPt(E);
      if (A.id === 'grabgelaeut'){
        Snd.play('geleut');
        const g = [P.x + P.H * .5, P.gy - P.H * .1];
        World.ring(g[0], g[1], 10, P.H * 1.6, 'rgba(230,220,190,.9)', 700, 3); World.ring(g[0], g[1], 10, P.H * 1.1, 'rgba(200,225,255,.7)', 520, 2);
        const h = A.heal; pl.hp = Math.min(pl.hpMax, pl.hp + h); World.pop(P.x, P.gy - P.H * 1.1, '+' + h, '#cfe3ff', 16);
        World.shake(8);
      }
      if (A.id === 'kronhieb'){ World.shake(12); World.burst(P.x + P.H * .5, P.gy, 'spark', 16); }
      const interrupted = A.id === 'widerhaken' && interrupt();
      hitEnemy(A.d, A.pz, { heavy: true, art: true });
      if (interrupted){ World.pop(c[0], c[1] - E.H * .45, 'Unterbrochen', '#f4c08a', 15); }
    }
  }
  // Widerhaken: reißt den Gegner aus dem Ausholen
  function interrupt(){
    if (mode === 'runde'){
      if (tb.intent && tb.intent.move && !tb.intent.move.hits.some(h => h.k === 'u')){
        tb.intent = { id: 'gestoert', special: SPEZIAL.gestoert }; hook.turn(); return true;
      }
      return false;
    }
    if (en.st !== 'move') return false;
    const nh = en.move.hits[en.hi];
    if (!nh || nh.t - (T - en.t0) < 140) return false;
    en.st = 'flinch'; en.until = T + 850; en.move = null; tells.length = 0; E.glow = 0;
    playAnim(E, [[0, SETS[E.set].stagger], [500, SETS[E.set].stagger], [850, SETS[E.set].idle]]);
    return true;
  }

  /* ---------- Treffer am Gegner ---------- */
  function hitEnemy(d, pz, o){
    if (en.st === 'dead' || en.st === 'trans') return;
    let dmg = Math.round(d * pl.dmgMul);
    if (mode === 'runde' && en.armor > 0){ const ab = Math.min(en.armor, dmg); en.armor -= ab; dmg -= ab; if (ab) World.pop(E.x, E.gy - E.H * 1.05, '−' + ab + ' Panzer', '#aab4c2', 13); }
    en.hp = Math.max(0, en.hp - dmg);
    en.pz -= pz; en.lastPz = T; stats.hits++;
    const c = chestPt(E);
    World.pop(c[0] + (rnd() - .5) * 20, c[1] - 10, String(dmg), o.crit ? '#f4d27a' : '#eef1f5', o.crit ? 26 : o.heavy ? 21 : 18);
    World.burst(c[0], c[1], def.set === 'kette' ? 'spark' : 'drop', o.heavy ? 16 : 9, Math.PI);
    Snd.play(o.heavy ? 'hitHeavy' : 'hit');
    hitStop = o.crit ? 140 : o.heavy ? 85 : 55;
    E.shake = 140; World.shake(o.crit ? 16 : o.heavy ? 8 : 4);
    buzz(o.heavy ? 25 : 12);
    if (o.crit){ World.flash('#fff', .35); slowUntil = T + 260; World.burst(c[0], c[1], 'gold', 26); }
    if (en.hp <= 0) return enemyDie();
    if (def.boss && en.phase === 1 && en.hp <= en.hpMax * .5) return phaseChange();
    if (o.crit){
      en.st = 'idle'; en.pz = en.pzMax; en.next = T + 1000; E.stance = null;
      if (mode === 'runde'){ tb.broken = false; }
      playAnim(E, [[0, SETS[E.set].hurt], [300, SETS[E.set].stagger], [900, SETS[E.set].idle]]);
      return;
    }
    if (en.pz <= 0 && en.st !== 'broken') return breakPoise();
    if (mode === 'echt' && en.st === 'idle' && !def.boss){
      en.next = Math.max(en.next, T + 280);
      playAnim(E, [[0, SETS[E.set].hurt], [240, SETS[E.set].idle]]);
    }
  }
  function breakPoise(){
    en.pz = 0; en.move = null; tells.length = 0; E.glow = 0; E.trailUntil = 0;
    Snd.play('hitHeavy'); World.flash('rgba(240,205,120,1)', .12);
    const c = chestPt(E); World.pop(c[0], c[1] - E.H * .5, 'Haltung gebrochen', '#f0cd78', 15);
    E.stance = 'stagger'; playAnim(E, [[0, SETS[E.set].stagger]]);
    if (mode === 'runde'){ tb.broken = true; tb.intent = { id: 'taumelt', special: SPEZIAL.taumelt }; hook.turn(); en.st = 'broken'; return; }
    en.st = 'broken'; en.until = T + 2700;
  }
  function phaseChange(){
    en.phase = 2; en.st = 'trans'; en.until = T + 2800; en.move = null; tells.length = 0;
    en.moves = scaleMoves(def.moves, .9); en.pz = en.pzMax; E.stance = null;
    const S = SETS[E.set];
    playAnim(E, [[0, S.stagger], [700, S.stagger], [1300, S.W_slam, EASE.io], [1600, S.S_slam, EASE.in], [2200, S.S_slam], [2800, S.idle]]);
    setTimeout(() => {
      if (!on) return;
      E.torn = true; E.glow = 1; World.setFlood(1); World.setTint(1); World.shake(22); World.flash('rgba(190,240,236,1)', .25);
      World.burst(E.x, E.gy, 'drop', 40); World.ring(E.x, E.gy - E.H * .3, 20, E.H * 1.6, 'rgba(190,240,236,.8)', 900, 3);
      Music.setLevel(1); Snd.play('wave');
    }, 1600);
    hook.line(def.line2, 5200);
    if (mode === 'runde'){
      tb.lock = true; tb.broken = false; tb.intent = null; hook.turn();
      setTimeout(() => { if (!on || ended) return; tb.lock = false; tb.turn--; tbNext(); }, 2900);
    }
  }
  function enemyDie(){
    en.st = 'dead'; en.move = null; tells.length = 0; E.glow = 0;
    const S = SETS[E.set];
    playAnim(E, [[0, S.stagger], [400, S.kneel, EASE.out], [1100, S.dead, EASE.io]], true);
    Snd.play(def.boss ? 'bossDie' : 'enemyDie');
    slowUntil = T + (def.boss ? 900 : 400); World.setSlow(true); setTimeout(() => World.setSlow(false), 900);
    setTimeout(() => { const c = chestPt(E); World.burst(c[0], c[1], 'mist', 16); World.glutFlow(c, chestPt(P), def.boss ? 60 : 24); Snd.play('glut'); }, 900);
    finish('win');
  }

  /* ---------- Gegner: Ablauf ---------- */
  function scaleMoves(ms, f){
    const o = {};
    for (const k in ms){ const m = ms[k]; o[k] = Object.assign({}, m, { dur: m.dur * f, hits: m.hits.map(h => Object.assign({}, h, { t: h.t * f, hold: (h.hold || 0) * f, wave: h.wave })) }); }
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
    let id = wpick(en.phase === 2 ? def.p2 : def.p1);
    if (en.forceFast && def.punish){ id = def.punish; en.forceFast = false; }
    en.hist.unshift(id); en.hist.length = 3;
    return en.moves[id];
  }
  function moveTrack(set, m){
    const S = SETS[set], tr = [[0, S.idle]];
    let t = 0;
    m.hits.forEach(h => {
      const ts = h.t - (h.wave || 0), lead = h.s === 'lunge' ? 180 : h.s === 'grab' ? 150 : 115;
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
    en.move = m; en.st = 'move'; en.t0 = T; en.hi = 0; en.told = []; en.trailed = [];
    playAnim(E, moveTrack(E.set, m));
    if (m.hits.some(h => h.k === 'u')){ E.glow = .6; Snd.play('danger'); }
    if (mode === 'runde') tbPlanMove(m);
  }
  function tellLead(h){ return h.k === 'u' ? 480 : 320; }
  function gap(){ const g = en.phase === 2 && def.gap2 ? def.gap2 : def.gap; return rr(g[0], g[1]); }

  function stepEnemy(dt){
    if (en.st === 'dead') return;
    if (mode === 'echt' && en.st !== 'broken' && T - en.lastPz > 1600) en.pz = Math.min(en.pzMax, en.pz + def.pzRegen * dt / 1000);
    switch (en.st){
      case 'idle':
        if (mode !== 'echt' || pl.hp <= 0) break;
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
          const ts = h.t - (h.wave || 0);
          if (!en.trailed[i] && t >= ts - 130){
            en.trailed[i] = true; E.trailUntil = E.t + 200;
            if (h.wave){ World.wave(E.x - E.H * .3, P.x + P.H * .1, h.wave); Snd.play('wave'); World.shake(10); World.burst(E.x - E.H * .3, E.gy, 'drop', 20); }
            else if (h.s === 'lunge' || h.s === 'grab') Snd.play('heavySwing');
            else Snd.play(def.set === 'kette' ? 'chain' : 'swing');
          }
        });
        if (en.hi < m.hits.length && t >= m.hits[en.hi].t){
          const h = m.hits[en.hi], i = en.hi; en.hi++;
          if (mode === 'echt') resolveHit(h); else tbResolve(h, i);
          if (en.hi >= m.hits.length) E.glow = en.phase === 2 ? 1 : 0;
        }
        if (en.st === 'move' && t >= m.dur){
          en.st = 'idle'; en.move = null; en.next = T + gap();
          if (mode === 'runde') tbEnemyDone();
        }
        break;
      }
      case 'broken':
        if (mode === 'echt' && T >= en.until){ en.st = 'idle'; en.pz = en.pzMax; en.next = T + 450; E.stance = null; }
        break;
      case 'flinch':
        if (T >= en.until){ en.st = 'idle'; en.next = T + 250; }
        break;
      case 'trans':
        if (T >= en.until){ en.st = 'idle'; en.next = T + 500; E.glow = 1; if (mode === 'runde') hook.turn(); }
        break;
    }
  }

  /* ---------- Treffer am Spieler (Reaktion) ---------- */
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
      if (pl.st >= cost * .5){
        spend(cost);
        blocked(Math.round(d * (1 - pl.block)));
        return;
      }
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
    pl.fp = Math.min(pl.fpMax, pl.fp + 10);
    const s = P.sk ? toWorld(P, P.look.off === 'schild' ? P.sk.handB : P.sk.handA) : chestPt(P);
    Snd.play('parry'); World.burst(s[0] + 8, s[1], 'gold', 22, 0); World.ring(s[0] + 8, s[1], 6, P.H * .7, 'rgba(240,205,120,.95)', 380, 2.5);
    World.flash('rgba(240,205,120,1)', .1); World.pop(P.x, P.gy - P.H * 1.15, 'Pariert', '#f0cd78', 16);
    hitStop = 95; World.shake(6); E.shake = 220; buzz(20);
    playAnim(P, [[0, P_SET().parry], [180, P_SET().parry], [320, pl.blockHeld ? P_SET().block : P_SET().idle]]);
    en.pz -= def.boss ? 30 : 22; en.lastPz = T;
    if (en.pz <= 0) return breakPoise();
    // Wer den letzten Schlag pariert, bekommt eine Lücke
    if (mode === 'echt' && en.move && en.hi >= en.move.hits.length){
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
    if (a && a.k === 'art' && a.art.id === 'kronhieb' && T - a.t0 > 120 && T - a.t0 < a.hit) return;   // unerschütterlich im Sprung
    if (mode === 'runde' && tb){ playAnim(P, [[0, P_SET().hurt], [300, P_SET().hurt], [520, P_SET().idle]]); return; }
    pl.act = null; pl.buf = null; P.glow = 0; P.hideW = false;
    act('hurt', { dur: stun });
    playAnim(P, [[0, P_SET().hurt], [stun * .6, P_SET().hurt], [stun, P_SET().idle]]);
  }
  function die(){
    pl.hp = 0; pl.act = { k: 'dead', t0: T }; pl.buf = null; P.glow = 0; P.hideW = false;
    const S = P_SET();
    playAnim(P, [[0, S.hurt], [500, S.kneel, EASE.out], [1300, S.dead, EASE.io]], true);
    en.move = null; tells.length = 0;
    if (en.st !== 'dead') en.st = 'idle';
    en.next = 1e12;
    slowUntil = T + 700; World.setSlow(true);
    Snd.play('death');
    finish('dead');
  }

  /* =====================================================================
     RUNDENKAMPF
     ===================================================================== */
  const COST = { atk: 1, heavy: 2, block: 1, parry: 2, dodge: 2, flask: 1, art: 2, crit: 1 };
  // Im Rundenkampf lässt sich ein verzögerter Hieb nicht parieren
  const tbKind = h => h.k === 'p' && (h.hold || 0) >= 500 ? 'b' : h.k;
  function tbStart(){
    tb = { ap: 4, apMax: 4, lock: false, block: 0, parry: false, dodge: 0, busy: false, enemyTurn: false, intent: null, broken: false, turn: 1, plan: null, lastSpecial: '' };
    tb.intent = tbChoose();
    hook.turn();
  }
  function tbChoose(){
    const list = en.phase === 2 ? def.tb2 : def.tb1;
    if (tb.forced){ const f = tb.forced; tb.forced = null; return { id: f, move: en.moves[f] }; }
    let id = wpick(list.filter(([i]) => !(SPEZIAL[i] && i === tb.lastSpecial)));
    en.hist.unshift(id); en.hist.length = 3;
    if (SPEZIAL[id]){ tb.lastSpecial = id; return { id, special: SPEZIAL[id] }; }
    tb.lastSpecial = '';
    return { id, move: en.moves[id] };
  }
  function tbCan(k){
    if (!on || !tb || tb.busy || tb.lock || ended || pl.hp <= 0 || en.st === 'dead' || en.st === 'trans') return false;
    if (tb.ap < COST[k]) return false;
    if (k === 'crit') return tb.broken;
    if (k === 'flask') return pl.flasks > 0;
    if (k === 'art') return pl.fp >= herk.art.fp;
    if (k === 'parry') return !tb.parry;
    return true;
  }
  function tbAct(k){
    if (!tbCan(k)) return false;
    tb.ap -= COST[k];
    const S = P_SET();
    switch (k){
      case 'atk': tb.busy = true; startLight(); break;
      case 'heavy':
        tb.busy = true; startHeavy();
        pl.act.t0 = T - 400;   // im Rundenkampf ohne Aufladen
        setTimeout(() => { if (on && pl.act && pl.act.k === 'heavyW') releaseHeavy(); }, 120);
        break;
      case 'crit': tb.busy = true; startCrit(); break;
      case 'art': tb.busy = true; startArt(); break;
      case 'flask': tb.busy = true; startHeal(); break;
      case 'block':
        tb.block += pl.tbBlock; P.stance = 'block'; Snd.play('block');
        playAnim(P, [[0, S.parry], [160, S.block]]);
        World.pop(P.x, P.gy - P.H * 1.1, '+' + pl.tbBlock + ' Schutz', '#c9d3e0', 13);
        break;
      case 'parry':
        tb.parry = true; P.stance = 'block'; Snd.play('tell');
        playAnim(P, [[0, S.block], [200, S.parry], [360, S.block]]);
        World.pop(P.x, P.gy - P.H * 1.1, 'Parade bereit', '#f0cd78', 13);
        break;
      case 'dodge':
        tb.dodge++; Snd.play('dodge');
        playAnim(P, [[0, mkPose({ x: -.12 }, S.dodge)], [200, S.idle]]);
        World.pop(P.x, P.gy - P.H * 1.1, 'Ausweichen bereit', '#bcd3f5', 13);
        break;
    }
    hook.turn();
    return true;
  }
  function tbEnd(){
    if (!on || !tb || tb.busy || tb.lock || !tb.intent || ended || pl.hp <= 0 || en.st === 'dead' || en.st === 'trans') return;
    tb.busy = true; tb.enemyTurn = true; en.armor = 0;
    const it = tb.intent;
    hook.turn();
    if (it.move){ setTimeout(() => { if (on && !ended) beginMove(it.move); }, 250); return; }
    // Kein Angriff
    const S = SETS[E.set];
    let wait = 900;
    if (it.id === 'lauern'){ en.buff = 1.5; playAnim(E, [[0, S.W_grab], [500, S.W_grab], [900, S.idle]]); Snd.play('lure'); }
    if (it.id === 'panzer'){ en.armor = 12; playAnim(E, [[0, S.recover], [500, S.recover], [900, S.idle]]); Snd.play('chain'); }
    if (it.id === 'sammeln'){ en.pz = Math.min(en.pzMax, en.pz + en.pzMax * .4); playAnim(E, [[0, S.recover], [600, S.recover], [900, S.idle]]); Snd.play('lure'); }
    if (it.id === 'flutsammeln'){ tb.forced = 'flut'; World.setFlood(1.6); playAnim(E, [[0, S.W_slam], [700, S.W_slam], [1100, S.idle]]); Snd.play('rise'); wait = 1200; }
    if (it.id === 'taumelt' || it.id === 'gestoert') wait = 700;
    if (it.special) World.pop(E.x, E.gy - E.H * 1.1, it.special.name, '#c9d3e0', 14);
    setTimeout(() => {
      if (!on || ended) return;
      if (it.id === 'taumelt'){ tb.broken = false; en.st = 'idle'; en.pz = en.pzMax; E.stance = null; }
      tbNext();
    }, wait);
  }
  function tbPlanMove(m){
    let block = tb.block, parry = tb.parry, dodge = tb.dodge;
    tb.plan = m.hits.map(h => {
      const d = Math.round(h.d * en.dmgMul * en.buff), k = tbKind(h);
      if (k === 'p' && parry){ parry = false; return { r: 'parry' }; }
      if (k === 'u'){ if (dodge > 0){ dodge--; return { r: 'dodge' }; } return { r: 'hit', d }; }
      if (block >= d){ block -= d; return { r: 'block', d: 0 }; }
      if (dodge > 0){ dodge--; return { r: 'dodge' }; }
      const ab = block; block = 0;
      return { r: ab ? 'block' : 'hit', d: d - ab };
    });
    en.buff = 1;
    // Abwehrbewegungen rechtzeitig vor dem Treffer
    m.hits.forEach((h, i) => {
      const p = tb.plan[i];
      if (p.r === 'dodge') setTimeout(() => { if (!on) return; const S = P_SET(); playAnim(P, [[0, S.dodge], [300, S.dodge], [DODGE.dur, S.idle]]); Snd.play('dodge'); World.ghost(P); }, Math.max(0, h.t - 170));
      if (p.r === 'parry') setTimeout(() => { if (!on) return; playAnim(P, [[0, P_SET().parry], [260, P_SET().parry], [420, P_SET().block]]); }, Math.max(0, h.t - 120));
    });
  }
  function tbResolve(h, i){
    const p = tb.plan && tb.plan[i]; if (!p || pl.hp <= 0) return;
    if (p.r === 'dodge'){ World.pop(P.x, P.gy - P.H * 1.1, 'Ausgewichen', '#bcd3f5', 13); return; }
    if (p.r === 'parry') return parried(h);
    if (p.r === 'block'){ blocked(p.d); return; }
    damagePlayer(p.d, 380);
  }
  function tbEnemyDone(){ setTimeout(() => { if (on && !ended) tbNext(); }, 350); }
  function tbNext(){
    if (pl.hp <= 0 || en.st === 'dead') return;
    tb.turn++; tb.ap = tb.apMax; tb.block = 0; tb.parry = false; tb.dodge = 0; tb.busy = false; tb.enemyTurn = false; P.stance = null;
    if (!tb.broken) en.pz = Math.min(en.pzMax, en.pz + en.pzMax * .12);
    tb.intent = tb.broken ? { id: 'taumelt', special: SPEZIAL.taumelt } : tbChoose();
    hook.turn();
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
    if (mode === 'echt' && pl.hp > 0){
      const busy = pl.act && pl.act.k !== 'block' && pl.act.k !== 'parry' && pl.act.k !== 'hurt';
      const blocking = pl.act && (pl.act.k === 'block' || pl.act.k === 'parry');
      if (!busy && T - pl.lastSpend > 520) pl.st = Math.min(pl.stMax, pl.st + (blocking ? 20 : 55) * dt / 1000);
    }
    if (E.torn) E.glow = Math.max(E.glow, .8);
    updateActor(P, dt); updateActor(E, dt);
    for (let i = tells.length - 1; i >= 0; i--) if (T > tells[i].at + 200) tells.splice(i, 1);
  }

  /* ---------- Zeichnen: Warnzeichen und Wurfgeschoss ---------- */
  const TELL_COL = { p: '240,205,120', b: '225,232,240', u: '235,90,70' };
  function drawFx(ctx){
    if (!on) return;
    // rote Aura bei Angriffen, die nur Ausweichen erlauben
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
      // Aufblitzen an der Waffe
      if (left < 320 && left > 80){
        const tip = weaponTip(E), k = 1 - (left - 80) / 240, s = Math.min(E.H, P.H * 1.1) * (.04 + .08 * Math.sin(k * Math.PI));
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.sin(k * Math.PI);
        ctx.fillStyle = `rgb(${col})`;
        ctx.beginPath(); ctx.moveTo(tip[0], tip[1] - s * 2); ctx.lineTo(tip[0] + s * .3, tip[1] - s * .3); ctx.lineTo(tip[0] + s * 2, tip[1]); ctx.lineTo(tip[0] + s * .3, tip[1] + s * .3);
        ctx.lineTo(tip[0], tip[1] + s * 2); ctx.lineTo(tip[0] - s * .3, tip[1] + s * .3); ctx.lineTo(tip[0] - s * 2, tip[1]); ctx.lineTo(tip[0] - s * .3, tip[1] - s * .3); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      // Zeitring um den Spieler
      if (S.ring && mode === 'echt' && left > 0 && left < 700){
        const c = chestPt(P), k = 1 - left / 700, r0 = P.H * .38, r = r0 + (1 - k) * P.H * .9;
        ctx.save();
        ctx.strokeStyle = `rgba(${col},${.15 + k * .55})`; ctx.lineWidth = 1.5 + k * 1.5;
        ctx.beginPath(); ctx.arc(c[0], c[1], r, 0, TAU); ctx.stroke();
        ctx.strokeStyle = `rgba(${col},.18)`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(c[0], c[1], r0, 0, TAU); ctx.stroke();
        ctx.restore();
      }
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
    start, stop, update, drawFx, press, release, tbAct, tbEnd, tbCan, tbKind, hook,
    on: () => on, mode: () => mode, def: () => def, pl: () => pl, en: () => en, tb: () => tb, key: () => key,
    setPaused(v){ paused = v; if (v && pl){ pl.blockHeld = false; pl.heavyHeld = false; } },
    paused: () => paused, herk: () => herk, COST,
    critReady: () => on && en && en.st === 'broken',
    debug: () => ({ T, pl, en, tb, tells })
  };
})();
