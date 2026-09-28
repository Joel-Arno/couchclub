/* =====================================================================
   FIGUREN: Skelett, Posen und Scherenschnitt
   Längen sind Anteile der Körpergröße H. Winkel: 0 zeigt nach unten,
   positive Werte drehen nach vorn, also in Blickrichtung.
   ===================================================================== */
const BONE = { th: .235, sh: .235, torso: .30, neck: .035, head: .066, ua: .165, fa: .15 };
const PK = ['x', 'y', 'rot', 'lean', 'head', 'a1', 'a2', 'b1', 'b2', 'f1', 'f2', 'k1', 'k2', 'w', 'wb', 'ext', 'cape'];
const BASE = { x: 0, y: 0, rot: 0, lean: .1, head: -.05, a1: .55, a2: .95, b1: .45, b2: .75, f1: .32, f2: -.38, k1: -.32, k2: -.12, w: .35, wb: 0, ext: 0, cape: 0 };
const mkPose = (o, base = BASE) => Object.assign({}, base, o);
function mixPose(a, b, t){ const p = {}; for (const k of PK) p[k] = a[k] + (b[k] - a[k]) * t; return p; }
const dirv = a => [Math.sin(a), Math.cos(a)];

/* ---------- Aussehen ---------- */
const LOOK = {
  kron:      { hood: true, cape: 1, scarf: true, heart: true, weapon: 'schwert', off: 'schild' },
  harp:      { hood: true, cape: 1, scarf: true, heart: true, weapon: 'harpune', twoHand: -.2 },
  moench:    { hood: true, cape: 1.25, heart: true, weapon: 'hammer', twoHand: .15, limb: 1.05, bulk: 1.08 },
  ertrunken: { hair: true, rags: true, eyes: '#8fe0d6', weapon: 'entermesser', limb: .82, bulk: .86, scale: .97 },
  kette:     { helm: true, visor: '#f0a55c', weapon: 'flegel', chains: true, limb: 1.3, bulk: 1.42, scale: 1.1 },
  vogt:      { hat: true, coat: true, lantern: true, eyes: '#d8f2ea', weapon: 'haken', twoHand: -.28, limb: 1.2, bulk: 1.3, scale: 1.6 }
};

/* ---------- Posen ---------- */
function commonPoses(idle){
  return {
    idle,
    hurt: mkPose({ lean: -.32, head: -.3, x: -.07, a1: -.1, a2: .7, b1: -.35, b2: .4, f1: .15, f2: -.3, k1: -.18, k2: -.2 }, idle),
    heal: mkPose({ lean: -.1, head: -.45, a1: .25, a2: .8, b1: 2.3, b2: 2.0, w: .2 }, idle),
    dodge: mkPose({ x: -.46, lean: .5, rot: -.08, head: .15, a1: .25, a2: 1.5, b1: .1, b2: 1.1, f1: .95, f2: -1.6, k1: -.15, k2: -1.3, cape: .12 }, idle),
    kneel: mkPose({ lean: .35, head: .2, a1: .3, a2: .5, b1: .2, b2: .4, w: -.3, f1: 1.35, f2: -2.3, k1: .15, k2: -2.2 }, idle),
    dead: mkPose({ lean: 1.45, head: .3, a1: .15, a2: .2, b1: .05, b2: .1, w: -.8, f1: 1.55, f2: -2.55, k1: 1.35, k2: -2.45 }, idle),
    lie: mkPose({ rot: -1.52, y: -.05, lean: 0, head: -.1, a1: .15, a2: .25, b1: -.05, b2: .2, w: -1.2, f1: .05, f2: 0, k1: -.05, k2: 0, cape: -.1 }, idle),
    stagger: mkPose({ lean: -.22, head: -.45, x: -.08, a1: -.35, a2: .5, b1: -.45, b2: .3, f1: .1, f2: -.25, k1: -.35, k2: -.2 }, idle)
  };
}
const SETS = {};
// Kronwächter: Langschwert und Schild
(() => {
  const i = mkPose({ lean: .1, a1: .55, a2: .95, w: .35, b1: .45, b2: .75 });
  SETS.kron = Object.assign(commonPoses(i), {
    l1W: mkPose({ lean: -.04, a1: 2.5, a2: .5, w: 1.0, b1: .2, b2: .6 }, i),
    l1S: mkPose({ lean: .32, x: .1, a1: 1.35, a2: .05, w: .2, b1: -.2, b2: .5, f1: .55, f2: -.55, k1: -.45, k2: -.05 }, i),
    l2W: mkPose({ lean: .15, a1: .9, a2: 1.8, w: 2.1, b1: .1, b2: .4 }, i),
    l2S: mkPose({ lean: .28, x: .08, a1: 1.6, a2: .1, w: .1, b1: -.3, b2: .5, f1: .5, f2: -.5, k1: -.42 }, i),
    l3W: mkPose({ lean: 0, a1: .15, a2: 1.5, w: .1, b1: .8, b2: .5 }, i),
    l3S: mkPose({ lean: .4, x: .16, a1: 1.55, a2: 0, w: .05, b1: -.3, f1: .62, f2: -.5, k1: -.55, k2: -.05 }, i),
    hW: mkPose({ lean: -.12, a1: 2.9, a2: .4, w: .9, b1: -.2, b2: .5, f1: .42, f2: -.82, k1: -.5, k2: -.55 }, i),
    hS: mkPose({ lean: .5, x: .14, a1: 1.1, a2: 0, w: .45, b1: -.4, b2: .4, f1: .75, f2: -.9, k1: -.55, k2: -.1 }, i),
    block: mkPose({ lean: .02, a1: .1, a2: 1.3, w: -.2, b1: 1.25, b2: .55, f1: .38, f2: -.55, k1: -.4, k2: -.35 }, i),
    parry: mkPose({ lean: -.08, a1: 0, a2: 1.2, w: -.3, b1: 1.8, b2: -.15, f1: .35, f2: -.5, k1: -.42, k2: -.3 }, i),
    artW: mkPose({ lean: .2, a1: 2.8, a2: .5, w: 1.0, b1: .1, b2: .5, f1: .6, f2: -1.1, k1: -.5, k2: -.8 }, i),
    artA: mkPose({ y: -.34, x: .16, lean: -.2, a1: 3.1, a2: .4, w: 1.1, b1: -.3, b2: .4, f1: .7, f2: -1.2, k1: -.2, k2: -1.1, cape: .1 }, i),
    artS: mkPose({ x: .3, lean: .62, a1: 1.0, a2: 0, w: .5, b1: -.5, b2: .3, f1: .9, f2: -1.3, k1: -.6, k2: -.2 }, i),
    crit: mkPose({ x: .3, lean: .45, a1: 1.55, a2: 0, w: 0, b1: -.4, f1: .7, f2: -.6, k1: -.6, k2: -.05 }, i)
  });
})();
// Harpunierin: Harpune mit beiden Händen
(() => {
  const i = mkPose({ lean: .12, a1: .5, a2: 1.05, w: .1, f1: .38, f2: -.42, k1: -.36, k2: -.1 });
  SETS.harp = Object.assign(commonPoses(i), {
    l1W: mkPose({ lean: -.02, a1: .15, a2: 1.5, w: -.05 }, i),
    l1S: mkPose({ lean: .35, x: .12, a1: 1.5, a2: .05, w: .1, f1: .6, f2: -.5, k1: -.5 }, i),
    l2W: mkPose({ lean: .05, a1: .3, a2: 1.6, w: -.35 }, i),
    l2S: mkPose({ lean: .3, x: .1, a1: 1.7, a2: 0, w: -.25, f1: .55, f2: -.45, k1: -.48 }, i),
    l3W: mkPose({ lean: -.05, a1: .05, a2: 1.4, w: .2, f1: .3, f2: -.6, k1: -.4, k2: -.4 }, i),
    l3S: mkPose({ lean: .45, x: .2, a1: 1.45, a2: 0, w: .12, f1: .7, f2: -.5, k1: -.62, k2: -.05 }, i),
    hW: mkPose({ lean: -.1, a1: 2.8, a2: -.3, w: -1.2, f1: .4, f2: -.8, k1: -.5, k2: -.5 }, i),
    hS: mkPose({ lean: .5, x: .16, a1: 1.4, a2: .1, w: -.2, f1: .78, f2: -.9, k1: -.55, k2: -.1 }, i),
    block: mkPose({ lean: .02, a1: .8, a2: 1.2, w: .6, f1: .4, f2: -.6, k1: -.42, k2: -.35 }, i),
    parry: mkPose({ lean: -.1, a1: 1.1, a2: 1.0, w: .6, f1: .35, f2: -.5, k1: -.42, k2: -.3 }, i),
    artW: mkPose({ lean: -.12, a1: 2.9, a2: .2, w: -1.6, f1: .3, f2: -.5, k1: -.55, k2: -.2 }, i),
    artA: mkPose({ lean: .1, a1: 2.6, a2: .3, w: -1.4 }, i),
    artS: mkPose({ lean: .45, x: .1, a1: 1.5, a2: 0, w: .05, f1: .65, f2: -.5, k1: -.55 }, i),
    crit: mkPose({ x: .3, lean: .5, a1: 1.5, a2: 0, w: .1, f1: .75, f2: -.6, k1: -.62, k2: -.05 }, i)
  });
})();
// Glockenmönch: Hammer mit Glocke, beidhändig
(() => {
  const i = mkPose({ lean: .08, a1: .35, a2: 1.9, w: 1.05, f1: .34, f2: -.4, k1: -.34, k2: -.12 });
  SETS.moench = Object.assign(commonPoses(i), {
    l1W: mkPose({ lean: -.08, a1: 2.3, a2: 1.0, w: .6 }, i),
    l1S: mkPose({ lean: .38, x: .1, a1: 1.2, a2: .1, w: .2, f1: .6, f2: -.6, k1: -.48 }, i),
    l2W: mkPose({ lean: .1, a1: .6, a2: 1.9, w: 1.9 }, i),
    l2S: mkPose({ lean: .3, x: .08, a1: 1.7, a2: 0, w: .1, f1: .55, f2: -.5, k1: -.45 }, i),
    l3W: mkPose({ lean: -.1, a1: 2.6, a2: .8, w: .5 }, i),
    l3S: mkPose({ lean: .45, x: .12, a1: 1.1, a2: 0, w: .15, f1: .7, f2: -.8, k1: -.52, k2: -.1 }, i),
    hW: mkPose({ lean: -.2, a1: 3.0, a2: .6, w: .9, f1: .45, f2: -.9, k1: -.52, k2: -.6 }, i),
    hS: mkPose({ lean: .62, x: .15, a1: .95, a2: 0, w: .1, f1: .82, f2: -1.0, k1: -.6, k2: -.12 }, i),
    block: mkPose({ lean: .02, a1: .9, a2: 1.1, w: .55, f1: .4, f2: -.6, k1: -.42, k2: -.35 }, i),
    parry: mkPose({ lean: -.1, a1: 1.2, a2: .9, w: .55, f1: .35, f2: -.5, k1: -.42, k2: -.3 }, i),
    artW: mkPose({ lean: -.2, a1: 3.05, a2: .3, w: .3, f1: .45, f2: -.9, k1: -.5, k2: -.6 }, i),
    artA: mkPose({ lean: -.22, a1: 3.1, a2: .2, w: .25, y: -.04 }, i),
    artS: mkPose({ lean: .7, x: .1, a1: .9, a2: .1, w: -.3, f1: .9, f2: -1.2, k1: -.6, k2: -.3 }, i),
    crit: mkPose({ x: .26, lean: .6, a1: 1.0, a2: 0, w: .1, f1: .8, f2: -1.0, k1: -.6, k2: -.1 }, i)
  });
})();
// Ertrunkener: gebückt, Entermesser
(() => {
  const i = mkPose({ lean: .38, head: -.32, a1: .45, a2: .55, w: .7, b1: .1, b2: .25, f1: .3, f2: -.5, k1: -.25, k2: -.3 });
  SETS.ertrunken = Object.assign(commonPoses(i), {
    W_over: mkPose({ lean: .05, head: -.1, x: -.05, a1: 2.75, a2: .5, w: .9, b1: -.35, b2: .3 }, i),
    S_over: mkPose({ lean: .6, x: .2, a1: 1.2, a2: .1, w: .4, b1: -.3, f1: .7, f2: -.6, k1: -.45, k2: -.1 }, i),
    W_side: mkPose({ lean: .15, x: -.03, a1: .6, a2: 1.9, w: 2.2, b1: .3, b2: .5 }, i),
    S_side: mkPose({ lean: .5, x: .16, a1: 1.7, a2: .1, w: .1, b1: -.3, f1: .6, f2: -.5, k1: -.45 }, i),
    W_grab: mkPose({ lean: -.05, head: -.2, a1: 1.9, a2: .4, w: 1.0, b1: 1.9, b2: .4, f1: .55, f2: -1.0, k1: -.5, k2: -.6 }, i),
    S_grab: mkPose({ lean: .75, x: .52, y: -.04, a1: 1.6, a2: .1, w: .3, b1: 1.5, b2: .1, f1: .9, f2: -.4, k1: -.8, k2: -.1 }, i),
    recover: mkPose({ lean: .55, a1: .6, a2: .3, w: .3, x: .06 }, i)
  });
})();
// Kettenknecht: Helm wie ein Eimer, Flegel an der Kette
(() => {
  const i = mkPose({ lean: .1, head: -.08, a1: .45, a2: .8, w: -.4, wb: .1, b1: .15, b2: .5, f1: .35, f2: -.4, k1: -.35, k2: -.15 });
  SETS.kette = Object.assign(commonPoses(i), {
    W_over: mkPose({ lean: -.05, x: -.03, a1: 2.8, a2: .3, w: .5, wb: 3.6, b1: -.2 }, i),
    S_over: mkPose({ lean: .42, x: .12, a1: 1.3, a2: .1, w: .2, wb: 1.3, b1: -.35, f1: .6, f2: -.6, k1: -.5 }, i),
    W_side: mkPose({ lean: .1, a1: .3, a2: 1.8, w: 1.5, wb: -2.0, b1: .5 }, i),
    S_side: mkPose({ lean: .36, x: .1, a1: 1.8, a2: 0, w: .2, wb: 1.75, b1: -.3, f1: .55, f2: -.5, k1: -.45 }, i),
    W_thrust: mkPose({ lean: -.1, a1: 2.3, a2: .8, w: .5, wb: 3.9, b1: .3 }, i),
    S_thrust: mkPose({ lean: .32, x: .05, a1: 1.6, a2: 0, w: 0, wb: 1.62, ext: 1.7, b1: -.3, f1: .5, f2: -.5, k1: -.45 }, i),
    recover: mkPose({ lean: .3, a1: .9, a2: .3, w: .2, wb: .6, x: .04 }, i)
  });
})();
// Strandvogt: langer Mantel, Dreispitz, Bootshaken mit beiden Händen
(() => {
  const i = mkPose({ lean: .12, head: -.1, a1: .7, a2: .9, w: .7, f1: .3, f2: -.35, k1: -.3, k2: -.12 });
  SETS.vogt = Object.assign(commonPoses(i), {
    W_over: mkPose({ lean: -.1, x: -.05, a1: 2.8, a2: .5, w: .8 }, i),
    S_over: mkPose({ lean: .5, x: .15, a1: 1.3, a2: .05, w: .3, f1: .6, f2: -.6, k1: -.48 }, i),
    W_side: mkPose({ lean: .1, a1: .5, a2: 1.6, w: 2.6 }, i),
    S_side: mkPose({ lean: .35, x: .1, a1: 1.6, a2: .1, w: 0, f1: .5, f2: -.5, k1: -.45 }, i),
    W_thrust: mkPose({ lean: -.05, a1: .35, a2: 1.5, w: 0 }, i),
    S_thrust: mkPose({ lean: .32, x: .16, a1: 1.55, a2: 0, w: 0, f1: .55, f2: -.5, k1: -.48 }, i),
    W_lunge: mkPose({ lean: .52, x: -.1, a1: .9, a2: 1.0, w: .9, f1: .62, f2: -1.1, k1: -.62, k2: -.7 }, i),
    S_lunge: mkPose({ lean: .62, x: .95, a1: 1.3, a2: .3, w: .5, f1: .8, f2: -.4, k1: -.9, k2: -.1 }, i),
    W_slam: mkPose({ lean: -.16, y: -.03, a1: 3.0, a2: .3, w: .2, f1: .25, f2: -.2, k1: -.3, k2: -.05 }, i),
    S_slam: mkPose({ lean: .72, x: .08, a1: .9, a2: .1, w: -.5, f1: .7, f2: -1.2, k1: -.55, k2: -.5 }, i),
    W_grab: mkPose({ lean: -.1, a1: 2.4, a2: .6, w: .9 }, i),
    S_grab: mkPose({ lean: .5, x: .32, a1: 1.5, a2: .2, w: -.6, f1: .7, f2: -.5, k1: -.6 }, i),
    recover: mkPose({ lean: .4, a1: 1.1, a2: .4, w: .2, x: .05 }, i)
  });
})();

/* ---------- Abläufe ---------- */
// Spur: [[Zeit in ms, Pose, Kurve], ...]
function sampleTrack(tr, t){
  if (t <= tr[0][0]) return tr[0][1];
  for (let i = 1; i < tr.length; i++){
    const [t1, p1, e] = tr[i];
    if (t <= t1){
      const [t0, p0] = tr[i - 1];
      return mixPose(p0, p1, (e || EASE.io)(t1 > t0 ? (t - t0) / (t1 - t0) : 1));
    }
  }
  return tr[tr.length - 1][1];
}
function makeActor(o){
  return Object.assign({
    x: 0, gy: 0, H: 100, face: 1, set: 'kron', look: LOOK.kron,
    pose: mkPose({}), anim: null, animT: 0, stance: null, t: rnd() * 5000,
    trail: [], trailUntil: 0, alpha: 1, glow: 0, hideW: false, sink: 0, shake: 0, sk: null
  }, o);
}
function playAnim(a, track, hold = false){ a.anim = track; a.animT = 0; a.hold = hold; }
function actorIdle(a){
  const P = SETS[a.set], base = (a.stance && P[a.stance]) || P.idle, t = a.t;
  if (a.stance === 'dead' || a.stance === 'lie' || a.stance === 'kneel') return base;
  const br = Math.sin(t * .0022), tw = a.set === 'ertrunken' ? Math.sin(t * .013) * Math.sin(t * .0031) * .05 : 0;
  return mkPose({ lean: base.lean + br * .02 + tw, head: base.head - br * .03 + tw, a2: base.a2 + br * .04, b2: base.b2 + br * .03, w: base.w + br * .02 }, base);
}
function updateActor(a, dt){
  a.t += dt;
  let target;
  if (a.anim){
    a.animT += dt;
    target = sampleTrack(a.anim, a.animT);
    if (a.animT >= a.anim[a.anim.length - 1][0] && !a.hold) a.anim = null;
  }
  if (!target) target = actorIdle(a);
  a.pose = mixPose(a.pose, target, 1 - Math.exp(-dt * .032));
  if (a.shake > 0) a.shake = Math.max(0, a.shake - dt);
}

/* ---------- Skelett ---------- */
function skeleton(p, H, L){
  const legA = BONE.th * Math.cos(p.f1) + BONE.sh * Math.cos(p.f1 + p.f2);
  const legB = BONE.th * Math.cos(p.k1) + BONE.sh * Math.cos(p.k1 + p.k2);
  const hip = [p.x * H, (-Math.max(legA, legB) + p.y) * H];
  const up = [Math.sin(p.lean), -Math.cos(p.lean)];
  const sho = [hip[0] + up[0] * BONE.torso * H, hip[1] + up[1] * BONE.torso * H];
  const hd = p.lean + p.head;
  const head = [sho[0] + Math.sin(hd) * (BONE.neck + BONE.head) * H, sho[1] - Math.cos(hd) * (BONE.neck + BONE.head) * H];
  const limb = (o, a1, a2, l1, l2) => {
    const d1 = dirv(a1), m = [o[0] + d1[0] * l1 * H, o[1] + d1[1] * l1 * H], d2 = dirv(a1 + a2);
    return [m, [m[0] + d2[0] * l2 * H, m[1] + d2[1] * l2 * H]];
  };
  const [kneeF, footF] = limb(hip, p.f1, p.f2, BONE.th, BONE.sh);
  const [kneeB, footB] = limb(hip, p.k1, p.k2, BONE.th, BONE.sh);
  const [elbA, handA] = limb(sho, p.a1 - p.lean, p.a2, BONE.ua, BONE.fa);
  let [elbB, handB] = limb(sho, p.b1 - p.lean, p.b2, BONE.ua, BONE.fa);
  const wAng = p.a1 - p.lean + p.a2 + p.w;
  if (L.twoHand){
    // Zweite Hand greift den Schaft
    const d = dirv(wAng), tgt = [handA[0] + d[0] * L.twoHand * H, handA[1] + d[1] * L.twoHand * H];
    [elbB, handB] = ik(sho, tgt, BONE.ua * H, BONE.fa * H);
  }
  return { hip, sho, head, hd, kneeF, footF, kneeB, footB, elbA, handA, elbB, handB, wAng, up };
}
function ik(o, t, l1, l2){
  const dx = t[0] - o[0], dy = t[1] - o[1];
  const d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + .01, l1 + l2 - .01);
  const a = Math.atan2(dy, dx), c = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const ang = a + Math.acos(clamp(c, -1, 1));
  return [[o[0] + Math.cos(ang) * l1, o[1] + Math.sin(ang) * l1], [o[0] + Math.cos(a) * d, o[1] + Math.sin(a) * d]];
}
// Punkt aus dem Figurenraum in Weltkoordinaten
function toWorld(a, pt){
  const r = a.pose.rot, c = Math.cos(r), s = Math.sin(r);
  return [a.x + a.face * (pt[0] * c - pt[1] * s), a.gy + a.sink + pt[0] * s + pt[1] * c];
}
function weaponTip(a){
  const sk = a.sk; if (!sk) return [a.x, a.gy - a.H * .6];
  if (a.look.kind) return toWorld(a, sk.tip);
  const d = dirv(sk.wAng), len = WLEN[a.look.weapon] || .45, H = a.H;
  let tip = [sk.handA[0] + d[0] * len * H, sk.handA[1] + d[1] * len * H];
  if (KETTE[a.look.weapon]) tip = flailBall(a, sk, H);
  return toWorld(a, tip);
}
const WLEN = { schwert: .47, harpune: .64, hammer: .48, entermesser: .33, flegel: .5, haken: .66, pfahlspeer: .6, nadel: .42, kolben: .4, stab: .62, glockenstab: .5, kettenglocke: .55 };
// Waffen mit Kette: Länge der Kette und Größe des Endes (Anteile von H)
const KETTE = { flegel: { len: .3, r: .05 }, kettenglocke: { len: .36, r: .11 } };
function chestPt(a){ const sk = a.sk; if (!sk) return [a.x, a.gy - a.H * .6]; if (sk.chest) return toWorld(a, sk.chest); return toWorld(a, [lerp(sk.hip[0], sk.sho[0], .65), lerp(sk.hip[1], sk.sho[1], .65)]); }
function headPt(a){ const sk = a.sk; if (!sk) return [a.x, a.gy - a.H]; return toWorld(a, sk.head); }

/* ---------- Zeichnen ---------- */
const INK = '#040507', INK2 = '#0d1117', RIM = 'rgba(176,196,214,.5)';
function seg(ctx, p, q, w){ ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); }

function drawActor(ctx, a, alpha = 1){
  const L = a.look, H = a.H, p = a.pose;
  if (L.kind) return drawWesen(ctx, a, alpha);
  const sk = skeleton(p, H, L);
  a.sk = sk;
  const jit = a.shake > 0 ? (rnd() - .5) * H * .025 : 0;
  ctx.save();
  ctx.globalAlpha = alpha * a.alpha;
  // Schatten am Boden
  if (!a.sink){
    const sx = a.x + a.face * (sk.hip[0]) * Math.cos(p.rot);
    const g = ctx.createRadialGradient(sx, a.gy, 1, sx, a.gy, H * .32);
    g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(sx, a.gy + 2, H * .32, H * .05, 0, 0, TAU); ctx.fill();
  }
  // Lichtkante, dann die Figur selbst
  ctx.save(); ctx.translate(a.x + 1.4 + jit, a.gy + a.sink - 1.1); ctx.scale(a.face, 1); ctx.rotate(p.rot);
  paintFigure(ctx, a, sk, RIM, RIM, H); ctx.restore();
  ctx.save(); ctx.translate(a.x + jit, a.gy + a.sink); ctx.scale(a.face, 1); ctx.rotate(p.rot);
  paintFigure(ctx, a, sk, INK, INK2, H);
  ctx.globalCompositeOperation = 'lighter';
  paintGlow(ctx, a, sk, H);
  ctx.restore();
  ctx.restore();
  // Leuchtspur beim Schlag merken
  if (a.trailUntil > a.t && !a.hideW){
    const d = dirv(sk.wAng), len = (WLEN[L.weapon] || .45) * H, h = sk.handA;
    const tip = KETTE[L.weapon] ? flailBall(a, sk, H) : [h[0] + d[0] * len, h[1] + d[1] * len];
    a.trail.push({ tip, mid: [lerp(h[0], tip[0], .45), lerp(h[1], tip[1], .45)], t: a.t });
  }
}

function paintFigure(ctx, a, sk, col, colB, H){
  const L = a.look, p = a.pose, lw = H * (L.limb || 1), bulk = L.bulk || 1;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (L.cape || L.coat) cape(ctx, a, sk, H, colB);
  if (L.scarf) scarf(ctx, a, sk, H, colB);
  // hinteres Bein
  ctx.strokeStyle = colB;
  seg(ctx, sk.hip, sk.kneeB, lw * .078); seg(ctx, sk.kneeB, sk.footB, lw * .062);
  seg(ctx, sk.footB, [sk.footB[0] + H * .05, sk.footB[1]], lw * .05);
  // hinterer Arm
  seg(ctx, sk.sho, sk.elbB, lw * .056); seg(ctx, sk.elbB, sk.handB, lw * .046);
  if (L.chains) chains(ctx, a, sk, H, colB);
  // Rumpf
  ctx.fillStyle = col; ctx.strokeStyle = col;
  const n = [Math.cos(p.lean), Math.sin(p.lean)], hw = H * .058 * bulk, sw = H * .076 * bulk;
  ctx.lineWidth = H * .03;
  ctx.beginPath();
  ctx.moveTo(sk.hip[0] - n[0] * hw, sk.hip[1] - n[1] * hw);
  ctx.lineTo(sk.sho[0] - n[0] * sw, sk.sho[1] - n[1] * sw);
  ctx.lineTo(sk.sho[0] + n[0] * sw * .8, sk.sho[1] + n[1] * sw * .8);
  ctx.lineTo(sk.hip[0] + n[0] * hw, sk.hip[1] + n[1] * hw);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  seg(ctx, sk.sho, [lerp(sk.sho[0], sk.head[0], .6), lerp(sk.sho[1], sk.head[1], .6)], H * .05 * bulk);
  head(ctx, a, sk, H, col);
  if (L.coat) coatFront(ctx, a, sk, H, col);
  if (L.rags) rags(ctx, a, sk, H, col);
  // vorderes Bein
  ctx.strokeStyle = col;
  seg(ctx, sk.hip, sk.kneeF, lw * .08); seg(ctx, sk.kneeF, sk.footF, lw * .064);
  seg(ctx, sk.footF, [sk.footF[0] + H * .055, sk.footF[1]], lw * .05);
  if (L.kleid) skirt(ctx, a, sk, H, col);
  if (L.lantern) lantern(ctx, a, sk, H, col);
  // Waffe und vorderer Arm
  if (!a.hideW) weapon(ctx, a, sk, H, col);
  ctx.strokeStyle = col;
  seg(ctx, sk.sho, sk.elbA, lw * .058); seg(ctx, sk.elbA, sk.handA, lw * .048);
  if (L.off === 'schild' || L.off === 'glockenschild') shield(ctx, a, sk, H, col);
  if (L.twoHand){ ctx.strokeStyle = colB === col ? col : INK; seg(ctx, sk.elbB, sk.handB, lw * .046); }
}

function head(ctx, a, sk, H, c){
  const L = a.look, r = BONE.head * H;
  ctx.save(); ctx.translate(sk.head[0], sk.head[1]); ctx.rotate(sk.hd); ctx.fillStyle = c; ctx.strokeStyle = c;
  if (L.helm){
    ctx.beginPath();
    ctx.moveTo(-r * 1.15, -r * 1.3); ctx.lineTo(r * 1.1, -r * 1.3); ctx.lineTo(r * 1.25, r * 1.05); ctx.lineTo(-r * 1.25, r * 1.05);
    ctx.closePath(); ctx.fill();
    ctx.lineWidth = r * .35; ctx.beginPath(); ctx.moveTo(-r * 1.4, -r * 1.3); ctx.lineTo(r * 1.35, -r * 1.3); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(0, 0, r * (L.hood ? 1.1 : 1), 0, TAU); ctx.fill();
  }
  if (L.hood){
    const flap = Math.sin(a.t * .005) * r * .08;
    ctx.beginPath();
    ctx.moveTo(r * .1, -r * 1.1);
    ctx.quadraticCurveTo(-r * 1.7, -r * .9, -r * 1.55 + flap, r * .8);
    ctx.lineTo(-r * .3, r * 1.3); ctx.lineTo(r * .6, r * .7); ctx.closePath(); ctx.fill();
  }
  if (L.hat){
    ctx.beginPath();
    ctx.moveTo(-r * 2.0, -r * .55); ctx.quadraticCurveTo(0, -r * 1.15, r * 2.0, -r * .6);
    ctx.lineTo(r * 1.25, -r * .95); ctx.quadraticCurveTo(r * .1, -r * 2.6, -r * 1.3, -r * .95);
    ctx.closePath(); ctx.fill();
  }
  if (L.hut === 'suedwester'){
    ctx.beginPath();
    ctx.moveTo(-r * 1.9, r * .2); ctx.quadraticCurveTo(-r * .2, -r * .8, r * 1.5, -r * .45);
    ctx.lineTo(r * .9, -r * .7); ctx.quadraticCurveTo(0, -r * 1.9, -r * 1.1, -r * .6);
    ctx.closePath(); ctx.fill();
  }
  if (L.hut === 'glockenhelm'){
    ctx.beginPath();
    ctx.moveTo(-r * 1.35, r * 1.1); ctx.quadraticCurveTo(-r * 1.2, -r * .4, -r * .7, -r * 1.2);
    ctx.quadraticCurveTo(0, -r * 1.7, r * .7, -r * 1.2); ctx.quadraticCurveTo(r * 1.2, -r * .4, r * 1.35, r * 1.1);
    ctx.closePath(); ctx.fill();
    ctx.lineWidth = r * .3; ctx.beginPath(); ctx.moveTo(-r * 1.55, r * 1.1); ctx.lineTo(r * 1.55, r * 1.1); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -r * 1.6, r * .25, 0, TAU); ctx.fill();
  }
  if (L.hut === 'ritterhelm'){
    ctx.beginPath(); ctx.arc(0, 0, r * 1.12, 0, TAU); ctx.fill();
    ctx.fillRect(-r * 1.12, -r * .1, r * 2.24, r * 1.2);
    const fl = Math.sin(a.t * .004) * r * .15;
    ctx.beginPath(); ctx.moveTo(-r * .1, -r * 1.1); ctx.quadraticCurveTo(-r * 1.4, -r * 1.9 + fl, -r * 2.3, -r * .6 + fl); ctx.quadraticCurveTo(-r * 1.1, -r * 1.1, -r * .1, -r * .7); ctx.fill();
  }
  if (L.krone){
    for (let i = 0; i < 5; i++){
      const x = -r * .8 + i * r * .4, h = r * (.7 + (i % 2) * .5);
      ctx.beginPath(); ctx.moveTo(x - r * .15, -r * .8); ctx.lineTo(x, -r * .8 - h); ctx.lineTo(x + r * .15, -r * .8); ctx.fill();
    }
  }
  if (L.schleier){
    // Schleier fällt vom Kopf weit über den Rücken
    const sw = Math.sin(a.t * .003) * r * .4, len = r * (L.schleier || 1) * 6;
    ctx.beginPath();
    ctx.moveTo(r * .5, -r * 1.05);
    ctx.quadraticCurveTo(-r * 1.6, -r * 1.2, -r * 2.2 + sw, r * 1.5);
    ctx.quadraticCurveTo(-r * 2.6 + sw * 1.5, len * .6, -r * 1.8 + sw * 2, len);
    ctx.lineTo(-r * .6 + sw, len * .9);
    ctx.quadraticCurveTo(-r * .9, r * 1.5, r * .3, r * .6);
    ctx.closePath(); ctx.fill();
  }
  if (L.hair){
    ctx.lineWidth = r * .22;
    for (let i = 0; i < 6; i++){
      const x = -r * .9 + i * r * .3, sw = Math.sin(a.t * .003 + i) * r * .15;
      ctx.beginPath(); ctx.moveTo(x, -r * .7); ctx.quadraticCurveTo(x - r * .3 + sw, r * .6, x - r * .5 + sw * 1.5, r * (1.6 + (i % 3) * .35)); ctx.stroke();
    }
  }
  ctx.restore();
}
function cape(ctx, a, sk, H, c){
  const L = a.look, p = a.pose, s = sk.sho, h = sk.hip, t = a.t * .004;
  const coat = !!L.coat, torn = coat && a.torn;
  const len = (coat ? (torn ? .34 : .47) : .31 * (L.cape || 1)) * H;
  const sway = Math.sin(t) * .018 * H + Math.sin(t * 2.3) * .008 * H;
  const back = -(coat ? .1 : .15 + p.cape) * H;
  ctx.fillStyle = c; ctx.beginPath();
  ctx.moveTo(s[0] - .01 * H, s[1] - .02 * H);
  ctx.quadraticCurveTo(h[0] - .09 * H, h[1] - .08 * H, h[0] + back + sway, h[1] + len);
  const n = coat ? 7 : 5;
  for (let i = 1; i <= n; i++){
    const u = i / n, x = lerp(h[0] + back + sway, h[0] + (coat ? .06 : .02) * H, u);
    const y = h[1] + len * (1 - .12 * u) + ((i % 2) ? (torn ? .07 : .035) * H : 0) + Math.sin(t * 1.7 + i) * .006 * H;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(h[0] + .04 * H, h[1] - .02 * H); ctx.closePath(); ctx.fill();
}
function coatFront(ctx, a, sk, H, c){
  const h = sk.hip, k = sk.kneeF, len = a.torn ? .2 : .3;
  ctx.fillStyle = c; ctx.beginPath();
  ctx.moveTo(h[0] - .04 * H, h[1] - .08 * H);
  ctx.lineTo(h[0] + .08 * H, h[1] - .06 * H);
  ctx.lineTo(k[0] + .05 * H, k[1] + len * H * .5);
  ctx.lineTo(k[0] - .02 * H, k[1] + len * H * .62);
  ctx.lineTo(k[0] - .08 * H, k[1] + len * H * .5);
  ctx.closePath(); ctx.fill();
}
function scarf(ctx, a, sk, H, c){
  // Schalende hängt hinten herab und flattert im Wind
  const t = a.t * .006, n = [lerp(sk.sho[0], sk.head[0], .35), lerp(sk.sho[1], sk.head[1], .35)];
  ctx.strokeStyle = c; ctx.lineWidth = H * .018; ctx.beginPath(); ctx.moveTo(n[0] - .02 * H, n[1]);
  for (let i = 1; i <= 3; i++) ctx.lineTo(n[0] - .02 * H - i * .04 * H - a.pose.cape * H * i * .25, n[1] + i * .05 * H + Math.sin(t + i * .9) * .012 * H * i);
  ctx.stroke();
}
function rags(ctx, a, sk, H, c){
  ctx.strokeStyle = c; ctx.lineWidth = H * .018;
  for (let i = 0; i < 4; i++){
    const u = .2 + i * .22, o = [lerp(sk.hip[0], sk.sho[0], u) - .03 * H, lerp(sk.hip[1], sk.sho[1], u)];
    const sw = Math.sin(a.t * .004 + i * 1.3) * .02 * H;
    ctx.beginPath(); ctx.moveTo(o[0], o[1]); ctx.lineTo(o[0] - .05 * H + sw, o[1] + (.1 + i * .02) * H); ctx.stroke();
  }
}
function chains(ctx, a, sk, H, c){
  ctx.strokeStyle = c; ctx.lineWidth = H * .014;
  [[-.04, .2], [.04, .16]].forEach(([dx, len], i) => {
    const o = [sk.hip[0] + dx * H, sk.hip[1] + .02 * H], sw = Math.sin(a.t * .003 + i * 2) * .03 * H;
    ctx.beginPath(); ctx.moveTo(o[0], o[1]); ctx.quadraticCurveTo(o[0] - .04 * H + sw, o[1] + len * H * .6, o[0] + sw * 1.5, o[1] + len * H); ctx.stroke();
  });
}
function lantern(ctx, a, sk, H, c){
  const o = [sk.hip[0] + .07 * H, sk.hip[1] - .02 * H], ang = Math.sin(a.t * .0028) * .3 - a.pose.lean * .6;
  const q = [o[0] + Math.sin(ang) * .05 * H, o[1] + Math.cos(ang) * .05 * H];
  a.lanternPt = q;
  ctx.strokeStyle = c; seg(ctx, o, q, H * .006);
  ctx.fillStyle = c; ctx.fillRect(q[0] - .022 * H, q[1], .044 * H, .058 * H);
}
function shield(ctx, a, sk, H, c){
  const h = sk.handB, big = a.look.off === 'glockenschild' ? 1.35 : 1;
  ctx.fillStyle = c; ctx.beginPath();
  ctx.ellipse(h[0] + .025 * H, h[1], .036 * H * big, .092 * H * big, a.pose.lean * .4 - .08, 0, TAU); ctx.fill();
}
// Langer Rock, der die Beine verdeckt
function skirt(ctx, a, sk, H, c){
  const h = sk.hip, t = a.t * .003, sw = Math.sin(t) * .02 * H, gy = 0;
  const fx = Math.max(sk.footF[0], sk.footB[0]) + .08 * H, bx = Math.min(sk.footF[0], sk.footB[0]) - .1 * H;
  ctx.fillStyle = c; ctx.beginPath();
  ctx.moveTo(h[0] - .06 * H, h[1] - .04 * H);
  ctx.lineTo(h[0] + .06 * H, h[1] - .04 * H);
  ctx.quadraticCurveTo(fx, h[1] + (gy - h[1]) * .5, fx + sw, gy - .01 * H);
  for (let i = 1; i <= 6; i++){
    const u = i / 6, x = lerp(fx + sw, bx + sw * 1.5, u), y = gy - .01 * H + ((i % 2) ? .015 * H : 0) + Math.sin(t * 2 + i) * .005 * H;
    ctx.lineTo(x, y);
  }
  ctx.quadraticCurveTo(bx, h[1] + (gy - h[1]) * .4, h[0] - .06 * H, h[1] - .04 * H);
  ctx.closePath(); ctx.fill();
}
function flailBall(a, sk, H){
  const K = KETTE[a.look.weapon] || KETTE.flegel;
  const d = dirv(sk.wAng), end = [sk.handA[0] + d[0] * (a.look.weapon === 'kettenglocke' ? .12 : .14) * H, sk.handA[1] + d[1] * (a.look.weapon === 'kettenglocke' ? .12 : .14) * H];
  const cd = dirv(a.pose.wb), len = K.len * H * (1 + a.pose.ext);
  return [end[0] + cd[0] * len, end[1] + cd[1] * len];
}
function weapon(ctx, a, sk, H, c){
  const kind = a.look.weapon, h = sk.handA, d = dirv(sk.wAng), n = [d[1], -d[0]];
  const P = (along, across = 0) => [h[0] + d[0] * along * H + n[0] * across * H, h[1] + d[1] * along * H + n[1] * across * H];
  ctx.fillStyle = c; ctx.strokeStyle = c;
  const poly = pts => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fill(); };
  if (kind === 'schwert'){
    seg(ctx, P(-.06), P(.03), H * .022);
    seg(ctx, P(.03, -.055), P(.03, .055), H * .02);
    poly([P(.04, -.015), P(.4, -.011), P(.47, 0), P(.4, .011), P(.04, .015)]);
  } else if (kind === 'harpune'){
    seg(ctx, P(-.3), P(.54), H * .017);
    poly([P(.52, -.028), P(.66, 0), P(.52, .028), P(.55, 0)]);
    seg(ctx, P(.53, .02), P(.47, .05), H * .01); seg(ctx, P(.53, -.02), P(.47, -.05), H * .01);
  } else if (kind === 'hammer'){
    seg(ctx, P(-.1), P(.42), H * .021);
    poly([P(.38, -.07), P(.49, -.07), P(.49, .1), P(.38, .1)]);
    // Glocke unter dem Hammerkopf
    const b = P(.43, .13), bs = H * .03, sw = Math.sin(a.t * .006) * .25;
    ctx.save(); ctx.translate(b[0], b[1]); ctx.rotate(sw);
    ctx.lineWidth = H * .006; ctx.beginPath(); ctx.moveTo(0, -bs * .6); ctx.lineTo(0, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-bs * .5, 0); ctx.quadraticCurveTo(-bs * .55, bs * 1.2, -bs * 1.05, bs * 1.35); ctx.lineTo(bs * 1.05, bs * 1.35); ctx.quadraticCurveTo(bs * .55, bs * 1.2, bs * .5, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  } else if (kind === 'entermesser'){
    seg(ctx, P(-.05), P(.03), H * .022);
    seg(ctx, P(.02, -.03), P(.02, .03), H * .014);
    ctx.beginPath(); const s0 = P(.03, -.012), s1 = P(.33, .03), c1 = P(.2, -.06), e1 = P(.03, .018), c2 = P(.2, .005);
    ctx.moveTo(s0[0], s0[1]); ctx.quadraticCurveTo(c1[0], c1[1], s1[0], s1[1]); ctx.quadraticCurveTo(c2[0], c2[1], e1[0], e1[1]); ctx.closePath(); ctx.fill();
  } else if (kind === 'flegel'){
    seg(ctx, P(-.04), P(.14), H * .026);
    const end = P(.14), ball = flailBall(a, sk, H);
    const mid = [(end[0] + ball[0]) / 2, (end[1] + ball[1]) / 2 + H * .04 * (1 - Math.min(1, a.pose.ext))];
    ctx.lineWidth = H * .009; ctx.setLineDash([H * .012, H * .008]);
    ctx.beginPath(); ctx.moveTo(end[0], end[1]); ctx.quadraticCurveTo(mid[0], mid[1], ball[0], ball[1]); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(ball[0], ball[1], H * .05, 0, TAU); ctx.fill();
    ctx.lineWidth = H * .014;
    for (let i = 0; i < 6; i++){ const an = i / 6 * TAU + a.t * .002; seg(ctx, ball, [ball[0] + Math.cos(an) * H * .075, ball[1] + Math.sin(an) * H * .075], H * .014); }
  } else if (kind === 'pfahlspeer'){
    seg(ctx, P(-.3), P(.52), H * .022);
    poly([P(.5, -.022), P(.6, 0), P(.5, .022)]);
    ctx.lineWidth = H * .008; seg(ctx, P(.46, -.03), P(.48, .03), H * .008);
  } else if (kind === 'nadel'){
    seg(ctx, P(-.05), P(.03), H * .02);
    seg(ctx, P(.02, -.04), P(.02, .04), H * .012);
    poly([P(.03, -.008), P(.42, 0), P(.03, .008)]);
  } else if (kind === 'kolben'){
    seg(ctx, P(-.06), P(.32), H * .026);
    poly([P(.28, -.06), P(.42, -.05), P(.44, 0), P(.42, .05), P(.28, .06)]);
    for (let i = -1; i <= 1; i++) seg(ctx, P(.35, i * .05), P(.35, i * .09), H * .016);
  } else if (kind === 'stab'){
    ctx.lineWidth = H * .018; ctx.beginPath();
    const s0 = P(-.2), s1 = P(.52), m = P(.18, .03); ctx.moveTo(s0[0], s0[1]); ctx.quadraticCurveTo(m[0], m[1], s1[0], s1[1]); ctx.stroke();
    poly([P(.5, -.035), P(.58, 0), P(.66, -.01), P(.58, .04), P(.52, .03)]);
  } else if (kind === 'glockenstab'){
    seg(ctx, P(-.1), P(.44), H * .02);
    const b = P(.47), bs = H * .06, an = sk.wAng;
    ctx.save(); ctx.translate(b[0], b[1]); ctx.rotate(-an + Math.PI);
    ctx.beginPath(); ctx.moveTo(-bs * .45, -bs * .2); ctx.quadraticCurveTo(-bs * .55, bs * .9, -bs * 1.05, bs * 1.1); ctx.lineTo(bs * 1.05, bs * 1.1); ctx.quadraticCurveTo(bs * .55, bs * .9, bs * .45, -bs * .2); ctx.closePath(); ctx.fill();
    ctx.restore();
  } else if (kind === 'kettenglocke'){
    seg(ctx, P(-.04), P(.12), H * .028);
    const end = P(.12), ball = flailBall(a, sk, H), K = KETTE.kettenglocke;
    const mid = [(end[0] + ball[0]) / 2, (end[1] + ball[1]) / 2 + H * .05 * (1 - Math.min(1, a.pose.ext))];
    ctx.lineWidth = H * .011; ctx.setLineDash([H * .014, H * .009]);
    ctx.beginPath(); ctx.moveTo(end[0], end[1]); ctx.quadraticCurveTo(mid[0], mid[1], ball[0], ball[1]); ctx.stroke();
    ctx.setLineDash([]);
    // Die Glocke hängt immer mit der Öffnung weg von der Hand
    const an = Math.atan2(ball[1] - end[1], ball[0] - end[0]) - Math.PI / 2, bs = K.r * H;
    ctx.save(); ctx.translate(ball[0], ball[1]); ctx.rotate(an);
    ctx.beginPath(); ctx.moveTo(-bs * .45, -bs * .25); ctx.quadraticCurveTo(-bs * .55, bs * .8, -bs * 1.05, bs * 1.05);
    ctx.lineTo(bs * 1.05, bs * 1.05); ctx.quadraticCurveTo(bs * .55, bs * .8, bs * .45, -bs * .25); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(0, bs * 1.15, bs * .18, 0, TAU); ctx.fill();
    ctx.restore();
  } else if (kind === 'haken'){
    seg(ctx, P(-.34), P(.62), H * .02);
    poly([P(.6, -.012), P(.7, 0), P(.6, .012)]);
    ctx.lineWidth = H * .02; ctx.beginPath();
    const s0 = P(.6), c1 = P(.62, .1), e1 = P(.52, .1);
    ctx.moveTo(s0[0], s0[1]); ctx.quadraticCurveTo(c1[0], c1[1], e1[0], e1[1]); ctx.stroke();
  }
}

function paintGlow(ctx, a, sk, H){
  const L = a.look, t = a.t;
  const dot = (x, y, r, col, al) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = al * a.alpha; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  };
  const r = BONE.head * H;
  if (L.eyes){
    const e = [sk.head[0] + Math.sin(sk.hd + 1.4) * r * .55, sk.head[1] - Math.cos(sk.hd + 1.4) * r * .55];
    dot(e[0], e[1], r * (.75 + a.glow * .5), L.eyes, .6 + a.glow * .25);
    dot(e[0], e[1], r * .22, '#ffffff', .9);
  }
  if (L.visor){
    ctx.save(); ctx.translate(sk.head[0], sk.head[1]); ctx.rotate(sk.hd);
    ctx.globalAlpha = .9 * a.alpha; ctx.strokeStyle = L.visor; ctx.lineWidth = r * .22;
    ctx.beginPath(); ctx.moveTo(r * .1, -r * .15); ctx.lineTo(r * 1.2, -r * .15); ctx.stroke();
    ctx.restore();
    dot(sk.head[0] + r * .8, sk.head[1] - r * .1, r * 1.3, L.visor, .35);
  }
  if (L.krone){
    ctx.save(); ctx.translate(sk.head[0], sk.head[1]); ctx.rotate(sk.hd);
    dot(0, -r * 1.3, r * 2, '#e8f4ff', .35 + a.glow * .3);
    ctx.restore();
  }
  if (L.weapon === 'stab' && !a.hideW){
    const d = dirv(sk.wAng), c = [sk.handA[0] + d[0] * .58 * H, sk.handA[1] + d[1] * .58 * H];
    dot(c[0], c[1], H * (.07 + a.glow * .06), '#dff2ff', .7 + Math.sin(t * .008) * .15);
  }
  if (L.weapon === 'kettenglocke' && a.glow > .3){
    const b = flailBall(a, sk, H);
    dot(b[0], b[1], H * .2, '#bfe6ee', a.glow * .35);
  }
  if (L.lantern && a.lanternPt){
    const q = a.lanternPt, lv = .7 + a.glow * .8 + Math.sin(t * .011) * .08;
    dot(q[0], q[1] + .03 * H, H * (.09 + a.glow * .12), L.lanternCol || '#cfeee4', lv);
    dot(q[0], q[1] + .03 * H, H * .016, '#ffffff', 1);
  }
  if (L.heart){
    // schwacher Schein in der Brust, im Takt der Glocke
    const ph = (t % 2400) / 2400, beat = Math.exp(-ph * 14) + Math.exp(-Math.max(0, ph - .12) * 14) * .7 * (ph > .12 ? 1 : 0);
    const c = [lerp(sk.hip[0], sk.sho[0], .72) + .015 * H, lerp(sk.hip[1], sk.sho[1], .72)];
    dot(c[0], c[1], H * (.05 + beat * .03 + a.glow * .05), '#cfdcf2', .25 + beat * .35 + a.glow * .3);
  }
  ctx.globalAlpha = 1;
}

// Leuchtspur der Waffe, in Weltkoordinaten gezeichnet
function drawTrail(ctx, a, col){
  const keep = 110;
  a.trail = a.trail.filter(s => a.t - s.t < keep);
  if (a.trail.length < 2) return;
  const pts = a.trail.map(s => ({ tip: toWorld(a, s.tip), mid: toWorld(a, s.mid), k: 1 - (a.t - s.t) / keep }));
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 1; i < pts.length; i++){
    const p0 = pts[i - 1], p1 = pts[i];
    ctx.globalAlpha = .16 * p1.k;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(p0.mid[0], p0.mid[1]); ctx.lineTo(p0.tip[0], p0.tip[1]); ctx.lineTo(p1.tip[0], p1.tip[1]); ctx.lineTo(p1.mid[0], p1.mid[1]); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
