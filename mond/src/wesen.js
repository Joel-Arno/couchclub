/* =====================================================================
   WESEN: weitere Figuren für Akt I
   Menschen nutzen das Skelett aus figuren.js, Tiere werden eigens gezeichnet.
   ===================================================================== */
Object.assign(LOOK, {
  pfahl:    { hut: 'suedwester', rags: true, eyes: '#8fe0d6', weapon: 'pfahlspeer', twoHand: -.22, limb: .9, bulk: .9 },
  jungfer:  { schleier: 1.1, kleid: true, eyes: '#cdeef5', weapon: 'nadel', limb: .8, bulk: .8 },
  waechter: { hut: 'glockenhelm', visor: '#e8c070', weapon: 'kolben', off: 'glockenschild', limb: 1.35, bulk: 1.5, scale: 1.18 },
  hexe:     { hair: true, krone: true, coat: true, eyes: '#e8f4ff', weapon: 'stab', twoHand: -.18, limb: .9, bulk: .95, scale: 1.05 },
  isolde:   { schleier: 1.6, kleid: true, eyes: '#9fe3e8', weapon: 'kettenglocke', limb: .95, bulk: 1.0, scale: 1.45 },
  enna:     { hood: true, kleid: true, lantern: true, lanternCol: '#ffd29a', weapon: null, limb: .9, bulk: .9 },
  mira:     { hair: true, scarf: true, weapon: null, limb: .92, bulk: .95 },
  kalden:   { hut: 'ritterhelm', cape: 1.1, weapon: 'schwert', off: 'schild', bulk: 1.15 },
  krabbe:   { kind: 'krabbe', scale: .72, eyes: '#ffd9a0' },
  spinne:   { kind: 'spinne', scale: 1.3, breit: true, eyes: '#ffcf8a' }
});

/* ---------- Posen der neuen Menschen ---------- */
// Pfahlgänger: gebückt, Speer mit beiden Händen
(() => {
  const i = mkPose({ lean: .25, head: -.2, a1: .5, a2: 1.0, w: .1, f1: .32, f2: -.45, k1: -.3, k2: -.2 });
  SETS.speer = Object.assign(commonPoses(i), {
    W_thrust: mkPose({ lean: .05, x: -.04, a1: .15, a2: 1.5, w: -.05 }, i),
    S_thrust: mkPose({ lean: .45, x: .16, a1: 1.5, a2: .05, w: .1, f1: .6, f2: -.5, k1: -.5 }, i),
    W_side: mkPose({ lean: .1, a1: .3, a2: 1.8, w: 1.6 }, i),
    S_side: mkPose({ lean: .35, x: .1, a1: 1.7, a2: 0, w: -.3, f1: .55, f2: -.5, k1: -.45 }, i),
    W_over: mkPose({ lean: -.05, a1: 2.8, a2: -.3, w: -1.2 }, i),
    S_over: mkPose({ lean: .5, x: .12, a1: 1.4, a2: .1, w: -.2, f1: .7, f2: -.8, k1: -.5 }, i),
    W_lunge: mkPose({ lean: .55, x: -.12, a1: .4, a2: 1.3, w: .05, f1: .65, f2: -1.2, k1: -.6, k2: -.8 }, i),
    S_lunge: mkPose({ lean: .6, x: .75, a1: 1.5, a2: .05, w: .1, f1: .9, f2: -.4, k1: -.9, k2: -.1 }, i),
    recover: mkPose({ lean: .4, x: .04, a1: .7, a2: .7, w: .2 }, i)
  });
})();
// Brautjungfer: aufrecht, tänzelnd, dünne Klinge
(() => {
  const i = mkPose({ lean: .05, head: -.05, a1: .45, a2: 1.1, w: .3, b1: -.3, b2: .9, f1: .25, f2: -.3, k1: -.25, k2: -.2 });
  SETS.jungfer = Object.assign(commonPoses(i), {
    W_over: mkPose({ lean: -.05, a1: 2.7, a2: .4, w: .9, b1: .6, b2: .8 }, i),
    S_over: mkPose({ lean: .45, x: .16, a1: 1.3, a2: .05, w: .3, b1: -.4, f1: .6, f2: -.55, k1: -.45 }, i),
    W_side: mkPose({ lean: .1, rot: -.05, a1: .7, a2: 1.9, w: 2.1, b1: .9, b2: .6 }, i),
    S_side: mkPose({ lean: .35, x: .14, a1: 1.7, a2: .1, w: .1, b1: -.5, f1: .5, f2: -.5, k1: -.45 }, i),
    W_grab: mkPose({ lean: -.1, a1: 2.2, a2: .3, b1: 2.2, b2: .3, w: 1.2 }, i),
    S_grab: mkPose({ lean: .6, x: .45, a1: 1.6, a2: .1, b1: 1.6, b2: .1, f1: .8, f2: -.4, k1: -.8 }, i),
    recover: mkPose({ lean: .3, a1: .8, a2: .6, w: .2 }, i)
  });
})();
// Salzhexe: gebeugt über den Stab, zaubert Salzsplitter
(() => {
  const i = mkPose({ lean: .3, head: -.25, a1: .6, a2: .9, w: 1.0, f1: .25, f2: -.4, k1: -.25, k2: -.25 });
  SETS.hexe = Object.assign(commonPoses(i), {
    W_over: mkPose({ lean: -.1, a1: 2.8, a2: .4, w: .6 }, i),
    S_over: mkPose({ lean: .5, x: .12, a1: 1.3, a2: .1, w: .2, f1: .6, f2: -.6, k1: -.45 }, i),
    W_side: mkPose({ lean: .15, a1: .5, a2: 1.7, w: 2.2 }, i),
    S_side: mkPose({ lean: .4, x: .1, a1: 1.7, a2: 0, w: .1, f1: .5, f2: -.5, k1: -.4 }, i),
    W_cast: mkPose({ lean: -.15, head: -.35, y: -.02, a1: 2.6, a2: .6, w: .2 }, i),
    S_cast: mkPose({ lean: .35, x: .06, a1: 1.6, a2: .1, w: 0 }, i),
    W_slam: mkPose({ lean: -.2, y: -.04, a1: 3.0, a2: .3, w: .1 }, i),
    S_slam: mkPose({ lean: .7, x: .06, a1: 1.0, a2: .1, w: -.5, f1: .7, f2: -1.2, k1: -.55, k2: -.5 }, i),
    recover: mkPose({ lean: .45, a1: .8, a2: .6, w: .5 }, i)
  });
})();
// Isolde: schwingt eine Glocke an der Kette
(() => {
  const i = mkPose({ lean: .05, head: .05, a1: .35, a2: .7, w: -.2, wb: .15, b1: .25, b2: .5, f1: .22, f2: -.25, k1: -.22, k2: -.12 });
  SETS.isolde = Object.assign(commonPoses(i), {
    W_side: mkPose({ lean: .1, a1: .3, a2: 1.8, w: 1.5, wb: -2.1, b1: .6 }, i),
    S_side: mkPose({ lean: .35, x: .1, a1: 1.8, a2: 0, w: .2, wb: 1.7, b1: -.3, f1: .45, f2: -.45, k1: -.4 }, i),
    W_over: mkPose({ lean: -.1, a1: 2.9, a2: .3, w: .5, wb: 3.7, b1: -.2 }, i),
    S_over: mkPose({ lean: .45, x: .12, a1: 1.25, a2: .1, w: .2, wb: 1.25, f1: .55, f2: -.6, k1: -.45 }, i),
    W_thrust: mkPose({ lean: -.1, a1: 2.2, a2: .8, w: .5, wb: 3.9, b1: .8, b2: .6 }, i),
    S_thrust: mkPose({ lean: .3, x: .05, a1: 1.6, a2: 0, w: 0, wb: 1.6, ext: 1.3, b1: -.3 }, i),
    W_slam: mkPose({ lean: -.2, y: -.03, a1: 3.05, a2: .2, w: .2, wb: 3.14, b1: 2.8, b2: .3 }, i),
    S_slam: mkPose({ lean: .65, x: .08, a1: 1.1, a2: .1, w: -.3, wb: .6, ext: .2, b1: 1.2, f1: .6, f2: -1.1, k1: -.5, k2: -.5 }, i),
    W_grab: mkPose({ lean: -.1, a1: 2.3, a2: .4, b1: 2.3, b2: .4, wb: 3.3 }, i),
    S_grab: mkPose({ lean: .6, x: .38, a1: 1.6, a2: .1, b1: 1.6, b2: .1, wb: 1.4, f1: .7, f2: -.4, k1: -.7 }, i),
    recover: mkPose({ lean: .3, a1: .8, a2: .4, w: .2, wb: .6 }, i)
  });
})();
// Figuren im Gespräch: ruhig stehend
(() => {
  const i = mkPose({ lean: .03, head: .05, a1: .12, a2: .25, w: -.4, b1: .05, b2: .3, f1: .12, f2: -.1, k1: -.12, k2: -.05 });
  SETS.npc = Object.assign(commonPoses(i), { recover: i });
})();

/* ---------- Tiere ----------
   Die Posen nutzen dieselben Schlüssel wie Menschen, bedeuten aber anderes:
   x, y: Versatz; lean: Neigung des Körpers; a1/b1: vordere Scheren oder Beine heben;
   a2/b2: Scheren öffnen; w: nach vorn stoßen; f2: ducken */
const tierPose = o => mkPose(Object.assign({ x: 0, y: 0, rot: 0, lean: 0, head: 0, a1: .3, a2: .2, b1: .25, b2: .2, f1: 0, f2: .1, k1: 0, k2: 0, w: 0, wb: 0, ext: 0, cape: 0 }, o), {});
function tierSatz(extra){
  const i = tierPose({});
  return Object.assign({
    idle: i, recover: tierPose({ a1: .4, b1: .35, f2: .2 }),
    hurt: tierPose({ lean: -.15, x: -.04 }), heal: i, dodge: i,
    stagger: tierPose({ lean: -.3, x: -.08, a1: .9, b1: .9, a2: .5, b2: .5, f2: .3 }),
    kneel: tierPose({ f2: .8, a1: 0, b1: 0, a2: 0, b2: 0 }),
    dead: tierPose({ f2: 1, lean: .15, a1: 0, b1: 0, a2: 0, b2: 0, y: .03 }),
    lie: tierPose({ f2: 1, lean: .15, a1: 0, b1: 0, a2: 0, b2: 0, y: .03 })
  }, extra);
}
SETS.krabbe = tierSatz({
  W_side: tierPose({ a1: .9, a2: .9, x: -.05, lean: -.15, f2: .25 }),
  S_side: tierPose({ a1: .2, a2: 0, w: 1, x: .2, lean: .2 }),
  W_over: tierPose({ a1: 1.2, b1: 1.1, a2: .9, b2: .9, lean: -.25 }),
  S_over: tierPose({ a1: .1, b1: .1, a2: 0, b2: 0, w: .8, x: .15, lean: .3 }),
  W_lunge: tierPose({ f2: .7, x: -.15, lean: -.1, a1: .8, b1: .8, a2: .8, b2: .8 }),
  S_lunge: tierPose({ x: .9, y: -.25, f2: 0, lean: .2, a1: .3, b1: .3, a2: 0, b2: 0, w: 1 })
});
SETS.spinne = tierSatz({
  idle: tierPose({ a1: .15, b1: .1, f2: .1 }),
  W_thrust: tierPose({ a1: 1.2, b1: .9, lean: -.2, x: -.05 }),
  S_thrust: tierPose({ a1: .6, b1: .4, w: 1, lean: .25, x: .15 }),
  W_over: tierPose({ a1: 1.5, b1: 1.4, lean: -.35 }),
  S_over: tierPose({ a1: .3, b1: .3, w: .8, lean: .4, x: .15, f2: .3 }),
  W_side: tierPose({ a1: 1.0, b1: .2, lean: -.1, rot: -.08 }),
  S_side: tierPose({ a1: .5, w: 1, rot: .08, lean: .15, x: .1 }),
  W_cast: tierPose({ lean: .35, head: -.3, f2: .2 }),
  S_cast: tierPose({ lean: -.1, x: .05 }),
  W_lunge: tierPose({ f2: .6, x: -.1, a1: .6, b1: .6, lean: -.1 }),
  S_lunge: tierPose({ x: .8, y: -.3, f2: 0, a1: .9, b1: .9, w: 1, lean: .3 })
});

function drawWesen(ctx, a, alpha = 1){
  const L = a.look, H = a.H, p = a.pose, jit = a.shake > 0 ? (rnd() - .5) * H * .025 : 0;
  ctx.save();
  ctx.globalAlpha = alpha * a.alpha;
  const sx = a.x + a.face * p.x * H;
  let g = ctx.createRadialGradient(sx, a.gy, 1, sx, a.gy, H * .5);
  g.addColorStop(0, 'rgba(0,0,0,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(sx, a.gy + 2, H * .5, H * .06, 0, 0, TAU); ctx.fill();
  const paint = L.kind === 'spinne' ? paintSpinne : paintKrabbe;
  [[RIM, RIM, 1.4, -1.1, false], [INK, INK2, 0, 0, true]].forEach(([c, cB, dx, dy, main]) => {
    ctx.save(); ctx.translate(a.x + dx + jit, a.gy + a.sink + dy); ctx.scale(a.face, 1); ctx.rotate(p.rot);
    paint(ctx, a, H, c, cB, main);
    ctx.restore();
  });
  ctx.restore();
  if (a.trailUntil > a.t && a.sk){
    const t = a.sk.tip;
    a.trail.push({ tip: t, mid: [lerp(a.sk.chest[0], t[0], .6), lerp(a.sk.chest[1], t[1], .6)], t: a.t });
  }
}
function augen(ctx, a, pts, r){
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const col = a.glow > .5 ? '#ff8a6a' : a.look.eyes;
  pts.forEach(([x, y]) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * (2.5 + a.glow * 2));
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = (.7 + a.glow * .3) * a.alpha; ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r * (2.5 + a.glow * 2), 0, TAU); ctx.fill();
    ctx.globalAlpha = a.alpha; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r * .5, 0, TAU); ctx.fill();
  });
  ctx.restore();
}
// Salzkrabbe: breiter Panzer, sechs Beine, zwei Scheren
function paintKrabbe(ctx, a, H, col, colB, main){
  const p = a.pose, t = a.t;
  const cx = p.x * H, cy = -H * (.26 - p.f2 * .13) + p.y * H, bw = H * .34, bh = H * .15;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  [-1, 1].forEach(side => {
    ctx.strokeStyle = side < 0 ? colB : col;
    for (let i = 0; i < 3; i++){
      const ax = cx + (i - 1) * bw * .45, ay = cy + bh * .3;
      const ph = Math.sin(t * .01 + i * 2 + side) * .025 * H;
      const kx = ax + (i - 1) * H * .12 + ph + side * H * .02, ky = cy - H * .04 - p.f2 * H * .05;
      const fx = ax + (i - 1) * H * .22 + ph * 1.5 + side * H * .03;
      seg(ctx, [ax, ay], [kx, ky], H * .032); seg(ctx, [kx, ky], [fx, 0], H * .024);
    }
  });
  // hintere Schere
  const schere = (raise, open, reach, c, back) => {
    ctx.strokeStyle = c; ctx.fillStyle = c;
    const s0 = [cx + bw * .7, cy + (back ? -bh * .1 : bh * .2)];
    const ang = -.2 - raise * 1.2, el = [s0[0] + Math.cos(ang) * H * .14, s0[1] + Math.sin(ang) * H * .14];
    const ang2 = ang + 1.1 - reach * .9, hand = [el[0] + Math.cos(ang2) * H * (.12 + reach * .1), el[1] + Math.sin(ang2) * H * (.12 + reach * .1)];
    seg(ctx, s0, el, H * .05); seg(ctx, el, hand, H * .045);
    const o = .25 + open * .6;
    [[-o, 1], [o * .6, .8]].forEach(([d, l]) => {
      const a2 = ang2 + d, tip = [hand[0] + Math.cos(a2) * H * .13 * l, hand[1] + Math.sin(a2) * H * .13 * l];
      ctx.beginPath(); ctx.moveTo(hand[0] - H * .02, hand[1] - H * .02);
      ctx.quadraticCurveTo(hand[0] + Math.cos(a2 - .4) * H * .1, hand[1] + Math.sin(a2 - .4) * H * .1, tip[0], tip[1]);
      ctx.lineTo(hand[0] + H * .02, hand[1] + H * .02); ctx.closePath(); ctx.fill();
    });
    return [hand[0] + Math.cos(ang2) * H * .1, hand[1] + Math.sin(ang2) * H * .1];
  };
  schere(p.b1, p.b2, 0, colB, true);
  // Panzer
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(p.lean * .6);
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, bw, bh, 0, 0, TAU); ctx.fill();
  for (let i = 0; i < 5; i++){
    const x = -bw * .7 + i * bw * .35;
    ctx.beginPath(); ctx.moveTo(x - H * .025, -bh * .8); ctx.lineTo(x, -bh * 1.25 - (i % 2) * H * .02); ctx.lineTo(x + H * .025, -bh * .8); ctx.fill();
  }
  ctx.strokeStyle = col; ctx.lineWidth = H * .014;
  const eye = [[bw * .55, -bh * 1.5 + Math.sin(t * .006) * H * .01], [bw * .8, -bh * 1.35 + Math.cos(t * .007) * H * .01]];
  eye.forEach(e => { ctx.beginPath(); ctx.moveTo(e[0] - H * .01, -bh * .6); ctx.lineTo(e[0], e[1]); ctx.stroke(); ctx.beginPath(); ctx.arc(e[0], e[1], H * .018, 0, TAU); ctx.fill(); });
  ctx.restore();
  const tip = schere(p.a1, p.a2, p.w, col, false);
  if (main){
    const c = Math.cos(p.lean * .6), s = Math.sin(p.lean * .6);
    const ew = eye.map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
    augen(ctx, a, ew, H * .012);
    a.sk = { tip, chest: [cx, cy], head: ew[1], hip: [cx, cy], sho: [cx, cy], handA: tip, handB: tip, wAng: 1.6, hd: 0 };
  }
}
// Wrackspinne: Rumpf eines Bootes, acht Beine aus Rudern, Laternenaugen
function paintSpinne(ctx, a, H, col, colB, main){
  const p = a.pose, t = a.t;
  const cx = p.x * H, cy = -H * (.4 - p.f2 * .2) + p.y * H;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const thorax = [cx + H * .12, cy - H * .02];
  let frontTip = null;
  const bein = (side, i, c) => {
    ctx.strokeStyle = c; ctx.fillStyle = c;
    const hip = [thorax[0] - i * H * .05, thorax[1] + H * .02];
    const gait = Math.sin(t * .006 + i * 1.7 + side * 2) * H * .02;
    let foot = [cx + H * (.62 - i * .4) + gait + side * H * .03, 0];
    const raise = i === 0 ? (side > 0 ? p.a1 : p.b1) : 0;
    if (raise > .05){
      const r = Math.min(1, raise), tx = cx + H * (.5 + .45 * p.w), ty = cy - H * (.15 + .35 * Math.max(0, raise - p.w * .5));
      foot = [lerp(foot[0], tx, r), lerp(foot[1], ty, r)];
    }
    const knee = [(hip[0] + foot[0]) / 2 + (i < 2 ? .06 : -.06) * H, Math.min(hip[1], foot[1]) - H * (.26 + .05 * (i % 2)) + p.f2 * H * .1];
    seg(ctx, hip, knee, H * .034); seg(ctx, knee, foot, H * .024);
    // Ruderblatt am Ende
    const an = Math.atan2(foot[1] - knee[1], foot[0] - knee[0]);
    ctx.save(); ctx.translate(lerp(knee[0], foot[0], .8), lerp(knee[1], foot[1], .8)); ctx.rotate(an);
    ctx.beginPath(); ctx.ellipse(0, 0, H * .06, H * .02, 0, 0, TAU); ctx.fill(); ctx.restore();
    if (side > 0 && i === 0) frontTip = foot;
  };
  for (let i = 3; i >= 0; i--) bein(-1, i, colB);
  // Rumpf: kieloben liegendes Boot
  ctx.save(); ctx.translate(cx - H * .18, cy); ctx.rotate(p.lean * .5);
  ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(H * .2, -H * .05); ctx.quadraticCurveTo(H * .05, -H * .26, -H * .38, -H * .12);
  ctx.quadraticCurveTo(-H * .46, -H * .02, -H * .34, H * .06); ctx.quadraticCurveTo(0, H * .1, H * .2, H * .04); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = H * .012;
  for (let k = 0; k < 3; k++){ ctx.beginPath(); ctx.moveTo(-H * .3, -H * (.08 - k * .05)); ctx.quadraticCurveTo(-H * .05, -H * (.18 - k * .06), H * .16, -H * (.03 - k * .03)); ctx.stroke(); }
  // Tau hängt herab
  ctx.lineWidth = H * .008; ctx.beginPath(); ctx.moveTo(-H * .2, H * .05); ctx.quadraticCurveTo(-H * .22 + Math.sin(t * .003) * H * .03, H * .2, -H * .18, H * .3); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(thorax[0], thorax[1], H * .1, 0, TAU); ctx.fill();
  for (let i = 3; i >= 0; i--) bein(1, i, col);
  if (main){
    const e = [[thorax[0] + H * .07, thorax[1] - H * .04], [thorax[0] + H * .09, thorax[1] - H * .0], [thorax[0] + H * .04, thorax[1] - H * .06], [thorax[0] + H * .1, thorax[1] - H * .05]];
    augen(ctx, a, e, H * .01);
    a.sk = { tip: frontTip, chest: thorax, head: e[0], hip: [cx, cy], sho: thorax, handA: frontTip, handB: frontTip, wAng: 1.6, hd: 0 };
  }
}
