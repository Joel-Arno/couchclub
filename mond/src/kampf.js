/* =====================================================================
   BÜHNE: die Figuren des Kampfes, mitten in der Welt
   Der Kampf findet dort statt, wo er beginnt. duel.x ist der Platz des
   Helden, duel.dir die Richtung zum Gegner (1 rechts, -1 links).
   ===================================================================== */
const Stage = {
  P: null, E: null, E2: null, N: null, showP: true, showE: false, showN: false, duel: null,
  place(){
    const d = this.duel; if (!d) return;
    const P = this.P;
    if (P){ P.x = d.x; P.gy = d.gy; P.face = d.dir; P.H = HELD_H; }
    [this.E, this.E2].forEach((a, i) => {
      if (!a) return;
      const L = a.look;
      a.H = HELD_H * (L.scale || 1);
      a.baseX = d.x + d.dir * (this.abstand(a) + i * 75);
      a.gy = d.gy; a.face = -d.dir;
      a.x = a.baseX + d.dir * (a.enter || 0) * 260;
    });
  },
  // Abstand zum Gegner, aber nie in eine Wand hinein
  abstand(a){
    let d = 100 + a.H * .8 + (a.look.breit ? a.H * .3 : 0);
    const G = typeof Erk !== 'undefined' && Erk.gebiet(), du = this.duel;
    if (G && du){
      for (let s = T; s <= d + a.H * .35; s += T / 2){
        const x = du.x + du.dir * s;
        if (istFest(G, tileAt(x), tileAt(du.gy - 20)) || istFest(G, tileAt(x), tileAt(du.gy - 60))){ d = Math.max(90, s - a.H * .35 - 6); break; }
      }
    }
    return d;
  },
  hero(herk, waffe, schild){
    const w = WAFFEN[waffe] || WAFFEN.langschwert;
    const look = Object.assign({}, LOOK[herk] || LOOK.kron, { weapon: w.look, off: w.klasse === 'klinge' && schild ? (schild === 'glockenschild' ? 'glockenschild' : 'schild') : null, twoHand: w.klasse === 'speer' ? -.2 : w.klasse === 'wucht' ? .15 : 0 });
    const P = makeActor({ set: KLASSE_SET[w.klasse], look, face: 1, H: HELD_H });
    if (this.P){ P.pose = this.P.pose; P.t = this.P.t; P.x = this.P.x; P.gy = this.P.gy; P.face = this.P.face; P.poseFn = this.P.poseFn; P.bew = this.P.bew; }
    this.P = P; return P;
  },
  // Gegner für den Kampf: am liebsten die Figur, die schon in der Welt stand
  foe(key, actor, slot = 'E'){
    const d = FEINDE[key], L = LOOK[d.look || d.set];
    const a = actor || makeActor({ set: d.set, look: L, face: -1, H: HELD_H * (L.scale || 1) });
    a.set = d.set; a.look = L; a.poseFn = null; a.bew = null; a.stance = null; a.alpha = 1; a.glow = 0; a.torn = false;
    this[slot] = a;
    if (slot === 'E') this.showE = true;
    if (this.duel){
      a.H = HELD_H * (L.scale || 1);
      const base = this.duel.x + this.duel.dir * (this.abstand(a) + (slot === 'E2' ? 75 : 0));
      a.enter = actor ? clamp((actor.x - base) / (this.duel.dir * 260), 0, 3) : 0;
      this.place();
    }
    return a;
  },
  update(dt){
    [this.E, this.E2].forEach(a => {
      if (!a || !a.enter || !this.duel) return;
      a.enter = Math.max(0, a.enter - dt / (a.enterDur || 700));
      a.x = a.baseX + this.duel.dir * EASE.out(Math.min(1, a.enter)) * 260 * Math.max(1, a.enter);
      if (a.enter > 0 && !a.anim){ a.poseFn = bewegungsPose; a.bew = { m: 'lauf', ph: a.t * .012, st: .8 }; }
      else if (a.enter <= 0 && a.poseFn){ a.poseFn = null; a.bew = null; }
    });
  }
};
const KLASSE_SET = { klinge: 'kron', speer: 'harp', wucht: 'moench' };

/* =====================================================================
   KAMPF: Reaktion. Gegner holen sichtbar aus, der Spieler weicht aus,
   blockt oder pariert im richtigen Moment.
   ===================================================================== */
const REGEL = {
  parade: 165, paradePause: 520,
  rolle: { dur: 460, i0: 50, i1: 330, perfekt: 170 },
  puffer: 300,
  stRegen: 50, stRegenBlock: 16, stPause: 560,
  konterFenster: 520, konterMul: 1.6,
  heilSchluck: 360, heilWirkt: 660, heilDauer: 950,
  gapMul: .7
};

const Fight = (() => {
  let on = false, def = null, key = '', T = 0, hitStop = 0, slowUntil = 0, paused = false;
  let pl = null, en = null, W = null, P = null, E = null, onEnd = null, ended = false, f = 1;
  let queue = [], actors = [], idx = 0, glut = 0, dmgScale = 1;
  let hinten = null;   // Gegner aus der zweiten Reihe, der aus der Ferne angreift
  const tells = [], projs = [], eprojs = [];
  let stats = { parries: 0, perfect: 0, hits: 0, taken: 0 };
  const hook = { toast: () => {}, line: () => {}, foe: () => {}, phase: () => {}, besiegt: () => {} };

  /* ---------- Start ----------
     o: { foes: [key, ...], actors: [actor, ...], profil, zustand: { hp, fp, flasks }, onEnd, scale, vorteil } */
  function start(o){
    queue = o.foes.slice(); actors = (o.actors || []).slice(); idx = 0; glut = 0; onEnd = o.onEnd; dmgScale = o.scale || 1;
    const pr = o.profil;
    W = pr.waffe;
    P = Stage.P; f = Stage.duel ? Stage.duel.dir : 1;
    P.stance = null; P.anim = null; P.hideW = false; P.glow = 0; P.poseFn = null; P.bew = null; P.alpha = 1;
    T = 0; hitStop = 0; slowUntil = 0; paused = false; ended = false;
    tells.length = 0; projs.length = 0; eprojs.length = 0;
    const z = o.zustand || {};
    pl = Object.assign({}, pr, {
      act: null, blockHeld: false, heavyHeld: false, blockPress: -1e9, lastParryTry: -1e9, lastSpend: -1e9,
      combo: 0, comboUntil: 0, buf: null, konterBis: 0
    });
    pl.hp = Math.min(pl.hpMax, z.hp == null ? pl.hpMax : z.hp);
    pl.fp = Math.min(pl.fpMax, z.fp == null ? pl.fpMax : z.fp);
    pl.flasks = z.flasks == null ? pl.flasksMax : z.flasks;
    pl.st = pl.stMax;
    stats = { parries: 0, perfect: 0, hits: 0, taken: 0 };
    World.setFlood(0, Stage.duel ? Stage.duel.gy : 0); World.setTint(0); World.setSlow(false);
    on = true;
    setupFoe(false, o.vorteil);
    setupHinten();
    if (o.vorteil === 'hinterhalt') hinterhalt();
  }
  function setupFoe(enter, vorteil){
    key = queue[idx]; def = FEINDE[key];
    E = Stage.foe(key, actors[idx] || null, 'E');
    E.torn = false; E.glow = 0; E.alpha = 1;
    const s = def.boss ? 1 : dmgScale;
    en = {
      hp: Math.round(def.hp * s), hpMax: Math.round(def.hp * s), pz: def.pz, pzMax: def.pz, st: E.enter > 0 ? 'enter' : 'idle', t0: 0,
      next: T + (vorteil === 'bemerkt' ? 700 : def.boss ? 3600 : 1100) + (E.enter > 0 ? E.enter * 700 : 0), until: T + (E.enter > 0 ? E.enter * 700 : 0),
      move: null, hi: 0, told: [], trailed: [], shot: [], phase: 0, lastPz: -1e9, hist: [], moves: def.moves, dmgMul: s * (def.schaden || 1),
      guardAus: 0, offenBis: 0, treffer: 0, trefferT: 0, kind: []
    };
    tells.length = 0; eprojs.length = 0;
    hook.foe(def, idx, queue.length);
  }
  // Der nächste lebende Gegner mit Fernangriffen wartet nicht untätig
  function setupHinten(){
    hinten = null; Stage.E2 = null;
    for (let i = idx + 1; i < queue.length; i++){
      const d = FEINDE[queue[i]];
      if (d.fern){ hinten = { i, key: queue[i], def: d, next: T + rr(...d.fern.gap) + 1200, move: null, hi: 0, shot: [], told: [] }; Stage.foe(queue[i], actors[i] || null, 'E2'); break; }
    }
  }
  function stop(){ on = false; pl && (pl.blockHeld = false); World.setSlow(false); }
  function finish(result){
    if (ended) return;
    ended = true;
    setTimeout(() => {
      on = false;
      onEnd && onEnd(result, { hp: pl.hp, fp: pl.fp, flasks: pl.flasks, stats, glut, boss: def.boss ? key : null, idx });
    }, result === 'win' ? 1700 : 1800);
  }
  function hinterhalt(){
    // Der erste Schlag aus dem Hinterhalt reißt eine tiefe Wunde
    const S = P_SET();
    act('crit', { hit: 300, dur: 800, hinterhalt: true });
    playAnim(P, [[0, S.l3W], [200, S.l3W], [300, S.crit, EASE.in], [500, S.crit], [800, S.idle]]);
    P.trailUntil = P.t + 360;
    en.next = T + 2200;
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
    act('light', { hit: L.hit, dur: L.dur, L, konter: T < pl.konterBis });
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
    act('heavyS', { hit, dur, mult: charged ? 1.35 : 1, konter: T < pl.konterBis });
    const S = P_SET();
    playAnim(P, [[0, S.hW], [hit - 70, S.hW], [hit, S.hS, EASE.in], [hit + 140, S.hS], [dur, S.idle]]);
    P.trailUntil = P.t + hit + 80;
    if (charged){ P.glow = 1; World.pop(P.x, P.gy - P.H * 1.15, 'Aufgeladen', '#f4c08a', 13); }
    setTimeout(() => Snd.play('heavySwing'), Math.max(0, hit - 120));
  }
  function startDodge(){
    if (!hasSt(pl.dodgeSt)) return true;
    spend(pl.dodgeSt);
    act('dodge', { dur: REGEL.rolle.dur });
    const S = P_SET();
    playAnim(P, [[0, S.dodge], [280, S.dodge], [REGEL.rolle.dur, S.idle]]);
    Snd.play('dodge');
    World.ghost(P); setTimeout(() => on && World.ghost(P), 70); setTimeout(() => on && World.ghost(P), 150);
    return true;
  }
  function startParry(){
    const S = P_SET();
    if (T - pl.lastParryTry >= REGEL.paradePause){ pl.blockPress = T; pl.lastParryTry = T; }
    act('parry', { dur: 230 });
    playAnim(P, [[0, S.parry], [120, S.parry], [230, pl.blockHeld ? S.block : S.idle]]);
    return true;
  }
  function startHeal(){
    if (pl.flasks <= 0){ hook.toast('flask'); return true; }
    act('heal', { dur: REGEL.heilDauer });
    const S = P_SET();
    playAnim(P, [[0, S.heal], [REGEL.heilDauer - 200, S.heal], [REGEL.heilDauer, S.idle]]);
    // Gegner nutzen den Moment
    if (en.st === 'idle' && en.next - T > 250){ en.next = T + 160; en.strafe = true; }
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
    if (b && T - b.t < REGEL.puffer) tryAct(b.k);
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
    if (a.k === 'heal'){
      if (!a.geschluckt && t >= REGEL.heilSchluck){ a.geschluckt = true; pl.flasks--; }
      if (!a.healed && t >= REGEL.heilWirkt){
        a.healed = true; const h = Math.round(pl.hpMax * pl.heal);
        pl.hp = Math.min(pl.hpMax, pl.hp + h);
        Snd.play('heal'); const c = chestPt(P); World.burst(c[0], c[1], 'heal', 18); World.pop(P.x, P.gy - P.H * 1.1, '+' + h, '#cfe3ff', 16);
      }
    }
    if (a.dur && t >= a.dur) endAct();
  }
  function playerHits(a){
    const km = a.konter ? REGEL.konterMul : 1;
    if (a.k === 'light') return hitEnemy(a.L.d * km, a.L.pz * km, { konter: a.konter });
    if (a.k === 'heavyS') return hitEnemy(W.heavy.d * a.mult * km, W.heavy.pz * a.mult * km, { heavy: true, konter: a.konter });
    if (a.k === 'crit'){
      if (a.hinterhalt){
        const frac = def.boss ? .12 : def.elite ? .3 : .55;
        return hitEnemy(Math.max(W.heavy.d * 2, en.hpMax * frac / pl.dmgMul), en.pzMax, { crit: true, heavy: true, hinterhalt: true });
      }
      return hitEnemy(W.heavy.d * 2.4, 0, { crit: true, heavy: true });
    }
  }
  function artHit(A, h, i){
    const c = chestPt(E);
    if (A.ring){
      Snd.play('geleut');
      const g = [P.x + f * P.H * .5, P.gy - P.H * .1], big = A.ring === 'gross';
      World.ring(g[0], g[1], 10, P.H * (big ? 2.4 : 1.6), 'rgba(230,220,190,.9)', big ? 900 : 700, 3);
      World.ring(g[0], g[1], 10, P.H * (big ? 1.7 : 1.1), 'rgba(200,225,255,.7)', 520, 2);
      World.shake(big ? 14 : 8);
      if (big && hinten) hintenTreffer(h.d * .6);
    }
    if (A.heal && i === 0){ pl.hp = Math.min(pl.hpMax, pl.hp + A.heal); World.pop(P.x, P.gy - P.H * 1.1, '+' + A.heal, '#cfe3ff', 16); }
    if (A.anim === 'sprung'){ World.shake(12); World.burst(P.x + f * P.H * .5, P.gy, 'spark', 16); }
    const interrupted = A.interrupt && interrupt();
    hitEnemy(h.d, h.pz, { heavy: true, art: true });
    if (interrupted) World.pop(c[0], c[1] - E.H * .45, 'Unterbrochen', '#f4c08a', 15);
  }
  // Harpune und Haken reißen den Gegner aus dem Ausholen, aber nicht bei roten Angriffen von Bossen
  function interrupt(){
    if (en.st !== 'move') return false;
    const nh = en.move.hits[en.hi];
    if (!nh || nh.t - (T - en.t0) < 140 || en.move.armor || (en.move.hits.some(h => h.k === 'u') && def.boss)) return false;
    en.st = 'flinch'; en.until = T + 850; en.move = null; tells.length = 0; eprojs.length = 0; E.glow = 0;
    const S = SETS[E.set];
    playAnim(E, [[0, S.stagger], [500, S.stagger], [850, S.idle]]);
    return true;
  }
  function hintenTreffer(d){
    if (!hinten || !Stage.E2) return;
    const a = Stage.E2, c = chestPt(a);
    hinten.move = null; hinten.next = T + 1800;
    World.pop(c[0], c[1] - 10, String(Math.round(d)), '#eef1f5', 16);
    World.burst(c[0], c[1], 'spark', 10);
    playAnim(a, [[0, SETS[a.set].hurt], [400, SETS[a.set].idle]]);
  }

  /* ---------- Treffer am Gegner ---------- */
  function hitEnemy(d, pz, o){
    if (en.st === 'dead' || en.st === 'trans' || en.st === 'enter') return;
    const c = chestPt(E);
    const offen = T < en.offenBis || en.st === 'broken' || en.st === 'flinch';
    // Schild: leichte Schläge prallen ab, schwere brechen die Deckung
    if (def.guard && !offen && T >= en.guardAus && (en.st === 'idle' || (en.st === 'move' && T - en.t0 < 250))){
      if (!o.heavy && !o.crit && !o.art){
        d *= 1 - def.guard.block; pz *= .25;
        Snd.play('block'); World.burst(c[0] - f * E.H * .2, c[1], 'spark', 14, f > 0 ? Math.PI : 0); E.shake = 120;
        World.pop(c[0], c[1] - E.H * .4, 'Abgewehrt', '#aab4c2', 13);
        zaehleTreffer();
        const dmg = Math.max(1, Math.round(d * pl.dmgMul));
        en.hp = Math.max(0, en.hp - dmg); en.pz -= pz * pl.pzMul; en.lastPz = T;
        if (en.hp <= 0) return enemyDie();
        return;
      }
      en.guardAus = T + 2600; pz *= 1.4;
      World.pop(c[0], c[1] - E.H * .55, 'Deckung gebrochen', '#f0cd78', 14);
    }
    // Panzer: nur schwere Schläge oder offene Stellen treffen richtig
    let gepanzert = false;
    if (def.panzer && !offen && !o.heavy && !o.crit && !o.art){ d *= 1 - def.panzer; pz *= .5; gepanzert = true; }
    const dmg = Math.max(1, Math.round(d * pl.dmgMul));
    en.hp = Math.max(0, en.hp - dmg);
    en.pz -= pz * pl.pzMul; en.lastPz = T; stats.hits++;
    World.pop(c[0] + (rnd() - .5) * 20, c[1] - 10, String(dmg), o.crit ? '#f4d27a' : gepanzert ? '#9aa6b4' : o.konter ? '#bcd3f5' : '#eef1f5', o.crit ? 26 : o.heavy ? 21 : 18);
    if (o.konter) World.pop(c[0], c[1] - E.H * .55, 'Gegenschlag', '#bcd3f5', 13);
    if (o.hinterhalt) World.pop(c[0], c[1] - E.H * .6, 'Hinterhalt', '#f4d27a', 16);
    World.burst(c[0], c[1], gepanzert ? 'spark' : def.blut || 'drop', o.heavy ? 16 : 9, f > 0 ? 0 : Math.PI);
    Snd.play(gepanzert ? 'block' : o.heavy ? 'hitHeavy' : 'hit');
    hitStop = o.crit ? 140 : o.heavy ? 85 : 55;
    E.shake = 140; World.shake(o.crit ? 16 : o.heavy ? 8 : 4);
    buzz(o.heavy ? 25 : 12);
    if (o.crit){ World.flash('#fff', .35); slowUntil = T + 260; World.burst(c[0], c[1], 'gold', 26); }
    if (en.hp <= 0) return enemyDie();
    if (def.phasen && def.phasen[en.phase] && en.hp <= en.hpMax * def.phasen[en.phase].at) return phaseChange();
    if (o.crit){
      en.st = o.hinterhalt ? 'broken' : 'idle'; if (o.hinterhalt){ en.until = T + 1400; E.stance = 'stagger'; }
      en.pz = o.hinterhalt ? 0 : en.pzMax; en.next = T + 1000; if (!o.hinterhalt) E.stance = null;
      playAnim(E, [[0, SETS[E.set].hurt], [300, SETS[E.set].stagger], [900, o.hinterhalt ? SETS[E.set].stagger : SETS[E.set].idle]]);
      return;
    }
    if (en.pz <= 0 && en.st !== 'broken') return breakPoise();
    zaehleTreffer();
    if (en.st === 'idle' && !def.boss && !def.panzer){
      en.next = Math.max(en.next, T + 260);
      playAnim(E, [[0, SETS[E.set].hurt], [240, SETS[E.set].idle]]);
    }
  }
  // Wer zu oft blind zuschlägt, wird gekontert
  // Ohne eigenen Konter schlägt jeder normale Gegner nach drei Treffern mit seinem schnellsten Angriff zurück
  function zaehleTreffer(){
    const k = def.konter || (def.boss ? null : { nach: 3 });
    if (!k || en.st !== 'idle') return;
    if (T - en.trefferT > 1400) en.treffer = 0;
    en.treffer++; en.trefferT = T;
    if (en.treffer >= k.nach){ en.treffer = 0; en.next = T + 120; en.zwang = k.move || schnellster(); }
  }
  function breakPoise(){
    en.pz = 0; en.move = null; tells.length = 0; eprojs.length = 0; E.glow = en.phase > 0 ? .8 : 0; E.trailUntil = 0;
    Snd.play('hitHeavy'); World.flash('rgba(240,205,120,1)', .12);
    const c = chestPt(E); World.pop(c[0], c[1] - E.H * .5, 'Haltung gebrochen', '#f0cd78', 15);
    E.stance = 'stagger'; playAnim(E, [[0, SETS[E.set].stagger]]);
    en.st = 'broken'; en.until = T + (def.boss ? 2300 : 2500);
  }
  // Neue Phase: jeder Boss hat seinen eigenen Auftritt
  function phaseChange(){
    const ph = def.phasen[en.phase];
    en.phase++; en.st = 'trans'; en.until = T + 2800; en.move = null; tells.length = 0; eprojs.length = 0;
    en.moves = scaleMoves(def.moves, ph.tempo || .9); en.pz = en.pzMax; E.stance = null;
    const S = SETS[E.set], big = S.W_slam ? ['W_slam', 'S_slam'] : ['W_over', 'S_over'];
    playAnim(E, [[0, S.stagger], [700, S.stagger], [1300, S[big[0]], EASE.io], [1600, S[big[1]], EASE.in], [2200, S[big[1]]], [2800, S.idle]]);
    setTimeout(() => {
      if (!on) return;
      E.torn = true; E.glow = 1; World.shake(22);
      const gy = Stage.duel.gy;
      if (ph.fx === 'flut'){ World.setFlood(1.2 + en.phase * .3, gy); World.setTint(1); World.flash('rgba(190,240,236,1)', .25); World.burst(E.x, E.gy, 'drop', 40); Snd.play('wave'); }
      if (ph.fx === 'glocke'){ World.bell(en.phase); World.setFlood(1 + en.phase * .5, gy); World.setTint(1); World.flash('rgba(210,220,255,1)', .3); Snd.bell(65.4, .5, 7, .9); }
      if (ph.fx === 'wut'){ World.flash('rgba(200,60,40,1)', .22); Snd.play('danger'); }
      if (ph.fx === 'salz'){ World.flash('rgba(235,242,250,1)', .3); World.burst(E.x, E.gy - E.H * .5, 'salz', 50); Snd.play('danger'); }
      World.ring(E.x, E.gy - E.H * .3, 20, E.H * 1.6, ph.fx === 'wut' ? 'rgba(235,110,90,.8)' : 'rgba(190,240,236,.8)', 900, 3);
      if (def.boss) Music.setLevel(1);
      hook.phase(en.phase, ph);
    }, 1600);
    if (ph.line) hook.line(ph.line, 5200, key + '.line' + en.phase);
  }
  function enemyDie(){
    en.st = 'dead'; en.deadT = T; en.move = null; tells.length = 0; eprojs.length = 0; E.glow = 0;
    glut += Math.round(def.glut * (def.boss ? 1 : dmgScale));
    hook.besiegt(idx, key);
    const S = SETS[E.set];
    playAnim(E, [[0, S.stagger], [400, S.kneel || S.stagger, EASE.out], [1100, S.dead || S.stagger, EASE.io]], true);
    Snd.play(def.boss ? 'bossDie' : 'enemyDie');
    slowUntil = T + (def.boss ? 900 : 400); World.setSlow(true); setTimeout(() => World.setSlow(false), 900);
    const tot = E;
    setTimeout(() => { const c = chestPt(tot); World.burst(c[0], c[1], 'mist', 16); World.glutFlow(c, () => chestPt(P), def.boss ? 60 : 24); Snd.play('glut'); }, 900);
    if (idx < queue.length - 1 && pl.hp > 0){
      // Der nächste Gegner tritt heran
      setTimeout(() => {
        if (!on || ended || pl.hp <= 0) return;
        idx++;
        const wasHinten = Stage.E2 && hinten && hinten.i === idx;
        const vorher = wasHinten ? Stage.E2 : null;
        Stage.E2 = null;
        setupFoe(true);
        if (vorher && E === vorher){ /* dieselbe Figur rückt nach vorn */ }
        setupHinten();
      }, 1700);
      return;
    }
    finish('win');
  }

  /* ---------- Gegner: Ablauf ---------- */
  function scaleMoves(ms, fk){
    const o = {};
    for (const k in ms){
      const m = ms[k];
      o[k] = Object.assign({}, m, { dur: m.dur * fk, hits: (m.hits || []).map(h => Object.assign({}, h, { t: h.t * fk, hold: (h.hold || 0) * fk })) });
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
  function aktuelleListe(){ return en.phase > 0 ? def.phasen[en.phase - 1].p : def.p1; }
  function chooseMove(){
    let id;
    if (en.zwang){ id = en.zwang; en.zwang = null; }
    else if (en.strafe){ en.strafe = false; id = def.punish || schnellster(); }
    else id = wpick(aktuelleListe());
    en.hist.unshift(id); en.hist.length = 3;
    const m = en.moves[id];
    // Mischangriffe entscheiden erst im letzten Moment, ob man parieren darf
    en.kind = m.hits.map(h => h.mix ? h.mix[Math.floor(rnd() * h.mix.length)] : h.k);
    return m;
  }
  function schnellster(){ let best = null, bt = 1e9; for (const [id] of aktuelleListe()){ const m = en.moves[id]; if (m.finte) continue; const t = m.hits[0] ? m.hits[0].t : 1e9; if (t < bt){ bt = t; best = id; } } return best; }
  const strikeAt = h => h.t - (h.flug || 0);
  function moveTrack(set, m){
    const S = SETS[set], tr = [[0, S.idle]];
    let t = 0;
    if (m.finte){
      // Täuschung: ausholen, zögern, zurück
      const Wp = S['W_' + m.finte] || S.W_over;
      tr.push([m.dur * .45, Wp, EASE.io]); tr.push([m.dur * .7, mkPose({ lean: Wp.lean - .05 }, Wp), EASE.lin]); tr.push([m.dur, S.idle, EASE.io]);
      return tr;
    }
    m.hits.forEach(h => {
      const ts = strikeAt(h), lead = h.s === 'lunge' ? 180 : h.s === 'grab' ? 150 : 115;
      const Wp = S['W_' + h.s] || S.W_over, Sp = S['S_' + h.s] || S.S_over;
      const wT = ts - lead, reach = Math.max(t + 90, wT - (h.hold || 0) - 40);
      tr.push([reach, Wp, EASE.io]);
      if (wT > reach + 1) tr.push([wT, mkPose({ lean: Wp.lean - .03 }, Wp), EASE.lin]);
      tr.push([ts, Sp, EASE.in]);
      tr.push([ts + 120, Sp, EASE.lin]);
      t = ts + 120;
    });
    const end = Math.max(m.dur, t + 240);
    tr.push([t + (end - t) * .45, S.recover || S.idle, EASE.out]);
    tr.push([end, S.idle, EASE.io]);
    return tr;
  }
  function beginMove(m){
    en.move = m; en.st = 'move'; en.t0 = T; en.hi = 0; en.told = []; en.trailed = []; en.shot = [];
    playAnim(E, moveTrack(E.set, m));
    if (m.weg){ E.fade = 1; }
    if (!m.finte && en.kind.some(k => k === 'u')){ E.glow = Math.max(E.glow, .6); Snd.play('danger'); }
  }
  const tellLead = (k, h) => h && h.mix ? 290 : k === 'u' ? 440 : 300;
  function gap(){
    const g = en.phase > 0 && def.phasen[en.phase - 1].gap ? def.phasen[en.phase - 1].gap : def.gap;
    return rr(g[0], g[1]) * REGEL.gapMul;
  }

  function stepEnemy(dt){
    if (en.st === 'dead') return;
    if (en.st !== 'broken' && T - en.lastPz > 1500) en.pz = Math.min(en.pzMax, en.pz + def.pzRegen * dt / 1000);
    switch (en.st){
      case 'enter':
        if (T >= en.until){ en.st = 'idle'; en.next = Math.max(en.next, T + 600); }
        break;
      case 'idle':
        if (pl.hp <= 0) break;
        if (T >= en.next) beginMove(chooseMove());
        break;
      case 'move': {
        const m = en.move, t = T - en.t0;
        if (m.weg){ E.alpha = t < m.dur * .25 ? 1 - t / (m.dur * .25) * .9 : t < strikeAt(m.hits[0]) - 180 ? .1 : Math.min(1, .1 + (t - strikeAt(m.hits[0]) + 180) / 180); }
        m.hits.forEach((h, i) => {
          const k = en.kind[i];
          if (!en.told[i] && t >= h.t - tellLead(k, h)){
            en.told[i] = true;
            tells.push({ at: en.t0 + h.t, from: T, k, i, actor: E });
            if (k !== 'u') Snd.play('tell');
          }
          const ts = strikeAt(h);
          if (!en.trailed[i] && t >= ts - 130){
            en.trailed[i] = true; if (!h.flug) E.trailUntil = E.t + 200;
            if (h.s === 'lunge' || h.s === 'grab') Snd.play('heavySwing');
            else if (!h.flug) Snd.play(def.klang === 'kette' ? 'chain' : 'swing');
          }
          if (h.flug && !en.shot[i] && t >= ts){ en.shot[i] = true; launch(h, E, k); }
        });
        if (en.hi < m.hits.length && t >= m.hits[en.hi].t){
          const i = en.hi, h = m.hits[i]; en.hi++;
          resolveHit(h, en.kind[i], en.dmgMul);
          if (en.hi >= m.hits.length) E.glow = en.phase > 0 ? 1 : 0;
        }
        if (en.st === 'move' && t >= m.dur){
          E.alpha = 1;
          en.st = 'idle'; en.move = null;
          if (m.offen) en.offenBis = T + m.offen;
          // Manchmal geht es ohne Pause weiter
          const weiter = !m.finte && def.weiter && rnd() < def.weiter * (en.phase > 0 ? 1.4 : 1);
          en.next = T + (weiter ? 140 : gap()) + (m.offen || 0) * .5;
        }
        break;
      }
      case 'broken':
        if (T >= en.until){ en.st = 'idle'; en.pz = en.pzMax; en.next = T + 400; E.stance = null; }
        break;
      case 'flinch':
        if (T >= en.until){ en.st = 'idle'; en.next = T + 250; }
        break;
      case 'trans':
        if (T >= en.until){ en.st = 'idle'; en.next = T + 450; E.glow = 1; }
        break;
    }
  }
  // Der Gegner in der zweiten Reihe greift aus der Ferne an
  function stepHinten(){
    const h = hinten; if (!h || !Stage.E2 || pl.hp <= 0 || en.st === 'trans') return;
    const a = Stage.E2, F = h.def.fern;
    if (!h.move){
      if (T >= h.next && en.st !== 'dead'){
        const id = F.moves[Math.floor(rnd() * F.moves.length)];
        h.move = h.def.moves[id]; h.t0 = T; h.hi = 0; h.shot = []; h.told = [];
        playAnim(a, moveTrack(a.set, h.move));
      }
      return;
    }
    const m = h.move, t = T - h.t0;
    m.hits.forEach((x, i) => {
      if (!h.told[i] && t >= x.t - tellLead(x.k)){ h.told[i] = true; tells.push({ at: h.t0 + x.t, from: T, k: x.k, i, actor: a }); if (x.k !== 'u') Snd.play('tell'); }
      if (x.flug && !h.shot[i] && t >= strikeAt(x)){ h.shot[i] = true; launch(x, a, x.k); }
    });
    if (h.hi < m.hits.length && t >= m.hits[h.hi].t){ const x = m.hits[h.hi]; h.hi++; resolveHit(x, x.k, dmgScale * (h.def.schaden || 1)); }
    if (t >= m.dur){ h.move = null; h.next = T + rr(...F.gap); }
  }
  function launch(h, von, k){
    const from = weaponTip(von), sfx = { welle: 'wave', salz: 'danger', netz: 'heavySwing', klang: 'geleut', feuer: 'fire' }[h.proj];
    if (h.proj === 'welle'){ World.wave(von.x - f * von.H * .3, P.x + f * P.H * .1, h.flug, P.gy); World.shake(10); World.burst(von.x - f * von.H * .3, von.gy, 'drop', 20); }
    else eprojs.push({ kind: h.proj, t0: T, t1: T + h.flug, from, k });
    if (sfx) Snd.play(sfx);
  }

  /* ---------- Treffer am Spieler ---------- */
  function resolveHit(h, k, mul){
    if (pl.hp <= 0) return;
    const d = Math.round(h.d * mul), a = pl.act, t = a ? T - a.t0 : 0, R = REGEL.rolle;
    if (a && a.k === 'dodge' && t >= R.i0 && t <= R.i1){
      if (t <= R.perfekt && !a.perfect){ a.perfect = true; perfectDodge(); }
      else World.pop(P.x, P.gy - P.H * 1.1, 'Ausgewichen', '#aab4c2', 12);
      return;
    }
    if (a && a.k === 'crit' && a.hinterhalt) return;   // der Hinterhalt geht vor
    const defending = !a || a.k === 'parry' || a.k === 'block';
    if (k === 'p' && defending && T - pl.blockPress <= REGEL.parade) return parried(h);
    if (k !== 'u' && a && (a.k === 'block' || a.k === 'parry') && (pl.blockHeld || a.k === 'parry')){
      const cost = d * pl.blockSt * 1.2;
      if (pl.st >= cost * .5){ spend(cost); blocked(Math.round(d * (1 - pl.block))); return; }
      World.pop(P.x, P.gy - P.H * 1.15, 'Deckung gebrochen', '#e08a7e', 13);
      pl.st = 0;
      damagePlayer(Math.round(d * .8), 950);
      return;
    }
    damagePlayer(d, d >= 25 ? 650 : 400);
  }
  function blocked(taken){
    const s = P.sk ? toWorld(P, P.look.off ? P.sk.handB : P.sk.handA) : chestPt(P);
    Snd.play('block'); World.burst(s[0] + 6 * f, s[1], 'spark', 12, f > 0 ? 0 : Math.PI); hitStop = 45; World.shake(4); P.shake = 90;
    playAnim(P, [[0, mkPose({ x: -.06 }, P_SET().block)], [200, P_SET().block]]);
    if (taken > 0){ pl.hp -= taken; stats.taken += taken; World.pop(P.x, P.gy - P.H * 1.1, String(taken), '#e0a39b', 14); if (pl.hp <= 0) die(); }
  }
  function parried(h){
    stats.parries++;
    pl.fp = Math.min(pl.fpMax, pl.fp + pl.parryFp);
    const s = P.sk ? toWorld(P, P.look.off ? P.sk.handB : P.sk.handA) : chestPt(P);
    Snd.play('parry'); World.burst(s[0] + 8 * f, s[1], 'gold', 22, f > 0 ? 0 : Math.PI); World.ring(s[0] + 8 * f, s[1], 6, P.H * .7, 'rgba(240,205,120,.95)', 380, 2.5);
    World.flash('rgba(240,205,120,1)', .1); World.pop(P.x, P.gy - P.H * 1.15, 'Pariert', '#f0cd78', 16);
    hitStop = 95; World.shake(6); E.shake = 220; buzz(20);
    playAnim(P, [[0, P_SET().parry], [180, P_SET().parry], [320, pl.blockHeld ? P_SET().block : P_SET().idle]]);
    en.pz -= (def.boss ? 30 : 24) * pl.pzMul; en.lastPz = T;
    if (en.pz <= 0) return breakPoise();
    // Wer den letzten Schlag pariert, bekommt eine Lücke
    if (en.move && en.hi >= en.move.hits.length){
      en.st = 'flinch'; en.until = T + 750; en.move = null; tells.length = 0; en.offenBis = T + 750;
      playAnim(E, [[0, SETS[E.set].hurt], [300, SETS[E.set].hurt], [750, SETS[E.set].idle]]);
    }
  }
  function perfectDodge(){
    stats.perfect++; pl.fp = Math.min(pl.fpMax, pl.fp + 6);
    pl.konterBis = T + REGEL.konterFenster + 200;
    Snd.play('perfect'); World.pop(P.x, P.gy - P.H * 1.15, 'Perfekt', '#bcd3f5', 15);
    slowUntil = T + 380; World.setSlow(true); setTimeout(() => World.setSlow(false), 700);
    const c = chestPt(P); World.ring(c[0], c[1], 8, P.H * .8, 'rgba(188,211,245,.8)', 460, 2);
  }
  function damagePlayer(d, stun){
    pl.hp -= d; stats.taken += d;
    World.pop(P.x, P.gy - P.H * 1.12, String(d), '#ff8c7a', d >= 25 ? 22 : 18);
    const c = chestPt(P); World.burst(c[0], c[1], 'drop', 10, (f > 0 ? Math.PI : 0) + (rnd() - .5));
    Snd.play('hurt'); World.shake(d >= 25 ? 14 : 8); World.flash('rgba(160,30,24,1)', .22); buzz(d >= 25 ? [40, 30, 40] : 35);
    hitStop = 70; P.shake = 160;
    if (pl.hp <= 0) return die();
    const a = pl.act;
    if (a && a.k === 'art' && a.art.hyper && T - a.t0 > a.art.hyper[0] && T - a.t0 < a.art.hyper[1]) return;   // unerschütterlich
    if (a && a.k === 'heal' && a.geschluckt && !a.healed) World.pop(P.x, P.gy - P.H * 1.3, 'Phiole verschüttet', '#e0a39b', 12);
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
    en.next = 1e12; if (hinten) hinten.next = 1e12;
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
    stepHinten();
    if (pl.hp > 0){
      const busy = pl.act && pl.act.k !== 'block' && pl.act.k !== 'parry' && pl.act.k !== 'hurt';
      const blocking = pl.act && (pl.act.k === 'block' || pl.act.k === 'parry');
      if (!busy && T - pl.lastSpend > REGEL.stPause) pl.st = Math.min(pl.stMax, pl.st + (blocking ? REGEL.stRegenBlock : REGEL.stRegen) * pl.stRegen * dt / 1000);
    }
    if (E.torn) E.glow = Math.max(E.glow, .8);
    if (en.st === 'dead') E.alpha = clamp(1 - (T - en.deadT - 1300) / 700, 0, 1);
    Stage.update(dt);
    updateActor(P, dt); updateActor(E, dt); if (Stage.E2) updateActor(Stage.E2, dt);
    for (let i = tells.length - 1; i >= 0; i--) if (T > tells[i].at + 200) tells.splice(i, 1);
    for (let i = eprojs.length - 1; i >= 0; i--) if (T > eprojs[i].t1 + 120) eprojs.splice(i, 1);
  }

  /* ---------- Zeichnen: Warnzeichen und Geschosse ---------- */
  const TELL_COL = { p: '240,205,120', b: '225,232,240', u: '235,90,70' };
  function drawActors(ctx){
    if (Stage.E2) drawActor(ctx, Stage.E2);
    if (E && Stage.showE) drawActor(ctx, E);
  }
  function drawFx(ctx){
    if (!on) return;
    if (en.st === 'move' && en.move && en.kind.slice(en.hi).some(k => k === 'u')){
      const c = chestPt(E), r = E.H * .75, pulse = .5 + .5 * Math.sin(T * .02);
      const g = ctx.createRadialGradient(c[0], c[1], r * .2, c[0], c[1], r);
      g.addColorStop(0, `rgba(200,50,40,${.18 + pulse * .12})`); g.addColorStop(1, 'rgba(200,50,40,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c[0], c[1], r, 0, TAU); ctx.fill();
    }
    drawTrail(ctx, P, 'rgba(214,224,238,1)');
    drawTrail(ctx, E, en.phase > 0 ? 'rgba(170,235,228,1)' : 'rgba(214,224,238,1)');
    for (const tl of tells){
      const left = tl.at - T, col = TELL_COL[tl.k], A = tl.actor || E;
      if (left < 300 && left > 60){
        const tip = weaponTip(A), k = 1 - (left - 60) / 240, s = Math.min(A.H, P.H * 1.1) * (.04 + .08 * Math.sin(k * Math.PI));
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
        const r = P.H * (.2 + .5 * k), a0 = f > 0 ? Math.PI * .6 : -Math.PI * .4;
        ctx.beginPath(); ctx.arc(x, y, r, a0, a0 + Math.PI * .8); ctx.stroke();
        ctx.beginPath(); ctx.arc(x + 14 * f, y, r * .8, a0, a0 + Math.PI * .8); ctx.stroke();
      } else if (g.kind === 'feuer'){
        const gr = ctx.createRadialGradient(x, y, 0, x, y, 16); gr.addColorStop(0, 'rgba(255,220,160,.95)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = gr; ctx.fillRect(x - 16, y - 16, 32, 32); if (rnd() < .6) World.burst(x, y, 'ember', 1);
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
    start, stop, update, drawFx, drawActors, press, release, hook,
    on: () => on, def: () => def, pl: () => pl, en: () => en, key: () => key,
    count: () => [idx, queue.length], glut: () => glut, hintenDef: () => hinten && hinten.def,
    setPaused(v){ paused = v; if (v && pl){ pl.blockHeld = false; pl.heavyHeld = false; } },
    paused: () => paused,
    critReady: () => on && en && en.st === 'broken',
    debug: () => ({ T, pl, en, tells, W, hinten })
  };
})();
