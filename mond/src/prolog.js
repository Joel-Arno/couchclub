/* =====================================================================
   PROLOG: fünf Bilder, bevor du am Strand erwachst
   Jedes Bild wird direkt auf die Leinwand gemalt, mit langsamer Bewegung.
   ===================================================================== */
const Prolog = (() => {
  const BILDER = [
    { dauer: 7600, text: 'Vor dreihundert Jahren holte König Aurel den Mond vom Himmel.' },
    { dauer: 7600, text: 'Aus seinem Herz schmiedete er eine Krone. Mit ihr gebot er über Ebbe und Flut.' },
    { dauer: 8200, text: 'Als der König starb, zerbrach die Krone. Seine fünf Kinder nahmen die Splitter und läuteten fünf Glocken gegen das Meer.' },
    { dauer: 7600, text: 'Dreihundert Jahre lang. Doch die Glocken werden leiser. Und das Meer steigt.' },
    { dauer: 7800, text: 'Was es verschluckt, gibt es manchmal zurück.' }
  ];
  let i = 0, t = 0, fertig = null, W = 1, H = 1, aus = false;
  const sterne = Array.from({ length: 140 }, () => [rnd(), rnd() * .8, rnd()]);

  function start(cb){
    fertig = cb; i = 0; t = 0; aus = false;
    zeigeText();
    Snd.bell(73.4, .18, 6, .9);
  }
  function zeigeText(){
    const p = $('#pText'); p.classList.remove('in');
    setTimeout(() => { if (aus) return; p.textContent = BILDER[i].text; p.classList.add('in'); }, 900);
  }
  function weiter(){
    if (aus) return;
    i++; t = 0;
    if (i >= BILDER.length){ ende(); return; }
    zeigeText();
    if (i === 2) Snd.play('block');
    if (i === 3){ Snd.bell(98, .16, 5, .9); setTimeout(() => Snd.bell(110, .12, 5, .9), 500); }
    if (i === 4) Snd.play('wave');
  }
  function ende(){
    if (aus) return;
    aus = true; $('#pText').classList.remove('in');
    const f = fertig; fertig = null; f && f();
  }
  function update(dt){ if (aus) return; t += dt; if (t > BILDER[i].dauer) weiter(); }
  $('#pSkip').addEventListener('click', e => { e.stopPropagation(); Snd.play('ui'); ende(); });
  $('#prolog').addEventListener('pointerdown', e => { if (e.target.closest('#pSkip')) return; if (t > 1500) weiter(); });

  /* ---------- Malen ---------- */
  function himmel(c, a, b){ const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(0, 0, W, H); }
  function sternenfeld(c, k, dy = 0){ for (const [x, y, s] of sterne){ c.globalAlpha = (.2 + s * .6) * k; c.fillStyle = '#dfe7f2'; c.fillRect(x * W, y * H + dy, s > .9 ? 2 : 1, s > .9 ? 2 : 1); } c.globalAlpha = 1; }
  function glow(c, x, y, r, col, a){ const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.globalAlpha = a; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.globalAlpha = 1; }
  function meer(c, y0, t2, farbe = '#0c141c'){
    const g = c.createLinearGradient(0, y0, 0, H); g.addColorStop(0, farbe); g.addColorStop(1, '#020305'); c.fillStyle = g; c.fillRect(0, y0, W, H - y0);
    c.strokeStyle = 'rgba(190,210,230,.08)'; c.lineWidth = 1;
    for (let r = 1; r < 12; r++){ const y = y0 + Math.pow(r / 12, 1.6) * (H - y0); c.beginPath(); for (let x = 0; x <= W; x += 16){ const yy = y + Math.sin(x * .02 + t2 * .001 + r) * (1 + r * .3); x ? c.lineTo(x, yy) : c.moveTo(x, yy); } c.stroke(); }
    c.fillStyle = 'rgba(214,224,238,.18)'; c.fillRect(0, y0, W, 1);
  }
  function turm(c, x, base, h, w, farbe){
    c.fillStyle = farbe; c.fillRect(x - w / 2, base - h, w, h);
    c.fillRect(x - w * .75, base - h - w * .3, w * 1.5, w * .32);
    c.beginPath(); c.moveTo(x - w * .6, base - h - w * .3); c.lineTo(x, base - h - w * 2.4); c.lineTo(x + w * .6, base - h - w * .3); c.fill();
  }
  function glockeForm(c, x, y, s){
    c.beginPath(); c.moveTo(x - s * .22, y); c.quadraticCurveTo(x - s * .32, y + s * .2, x - s * .34, y + s * .5);
    c.quadraticCurveTo(x - s * .38, y + s * .85, x - s * .56, y + s); c.lineTo(x + s * .56, y + s); c.quadraticCurveTo(x + s * .38, y + s * .85, x + s * .34, y + s * .5);
    c.quadraticCurveTo(x + s * .32, y + s * .2, x + s * .22, y); c.closePath(); c.fill();
  }
  function krone(c, x, y, s, zerbrochen){
    c.beginPath();
    c.moveTo(x - s, y + s * .35); c.lineTo(x - s, y - s * .15);
    const zacken = 5;
    for (let k = 0; k <= zacken * 2; k++){ const u = k / (zacken * 2), px = x - s + u * s * 2, py = k % 2 ? y - s * .15 : y - s * (.55 + (k === zacken ? .25 : 0)); c.lineTo(px, py); }
    c.lineTo(x + s, y + s * .35); c.closePath(); c.fill();
  }

  function draw(ctx, wt, dt){
    const [w, h] = World.size(); W = w; H = h;
    const B = BILDER[Math.min(i, BILDER.length - 1)], k = clamp(t / B.dauer, 0, 1);
    const ein = clamp(t / 900, 0, 1), aus2 = clamp((B.dauer - t) / 700, 0, 1), vis = Math.min(ein, aus2);
    ctx.save();
    ctx.fillStyle = '#020304'; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = vis;
    const hz = H * .62;
    if (i === 0){
      // Der Mond sinkt auf einen Turm herab
      himmel(ctx, '#05070c', '#1a2230'); sternenfeld(ctx, 1);
      const my = lerp(H * .12, hz - H * .2, EASE.io(k)), mx = W * .5, mr = Math.min(W, H) * .11;
      glow(ctx, mx, my, mr * 5, 'rgba(210,225,245,.5)', .9);
      ctx.fillStyle = '#e9eef6'; ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(160,175,195,.35)'; [[.3, -.2, .18], [-.25, .15, .12], [.1, .35, .09]].forEach(([a, b, r]) => { ctx.beginPath(); ctx.arc(mx + a * mr, my + b * mr, r * mr, 0, TAU); ctx.fill(); });
      // Ketten, die ihn herabziehen
      ctx.strokeStyle = 'rgba(10,12,16,.9)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      [-1, 1].forEach(s => { ctx.beginPath(); ctx.moveTo(mx + s * mr * .7, my + mr * .6); ctx.quadraticCurveTo(mx + s * mr * 1.4, (my + hz) / 2, W * .5 + s * 12, hz - H * .28); ctx.stroke(); });
      ctx.setLineDash([]);
      meer(ctx, hz, wt);
      turm(ctx, W * .5, hz + 2, H * .26, Math.max(18, W * .05), '#050608');
      glow(ctx, W * .5, hz - H * .3, mr * 2, 'rgba(210,225,245,.4)', k);
    } else if (i === 1){
      // Die Krone im Licht
      himmel(ctx, '#030406', '#0d1016');
      const cx = W * .5, cy = H * .38, s = Math.min(W, H) * .16 * (1 + k * .06);
      for (let r = 0; r < 12; r++){ const a = r / 12 * TAU + k * .3; ctx.strokeStyle = `rgba(230,220,190,${.06 + .04 * Math.sin(wt * .002 + r)})`; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * W, cy + Math.sin(a) * W); ctx.stroke(); }
      glow(ctx, cx, cy, s * 3.5, 'rgba(240,230,200,.55)', 1);
      ctx.fillStyle = '#060708'; krone(ctx, cx, cy, s);
      glow(ctx, cx, cy - s * .05, s * .5, 'rgba(255,250,235,.95)', .9 + .1 * Math.sin(wt * .004));
      meer(ctx, H * .72, wt, '#0a1016');
      // Ebbe und Flut: das Wasser hebt und senkt sich
      ctx.fillStyle = 'rgba(40,70,90,.25)'; ctx.fillRect(0, H * .72 + Math.sin(wt * .0015) * 8, W, H);
    } else if (i === 2){
      // Die Krone zerspringt, fünf Splitter fliegen davon
      himmel(ctx, '#030406', '#0d1016');
      const cx = W * .5, cy = H * .38, s = Math.min(W, H) * .16, kk = EASE.out(clamp((k - .15) / .6, 0, 1));
      glow(ctx, cx, cy, s * 3 * (1 - kk * .6), 'rgba(240,230,200,.5)', 1 - kk * .5);
      for (let n = 0; n < 5; n++){
        const a = -Math.PI / 2 + (n - 2) * .7, d = kk * Math.min(W, H) * .45;
        const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * .6 + kk * kk * H * .15;
        ctx.save(); ctx.translate(x, y); ctx.rotate(kk * (n - 2) * 1.3);
        ctx.fillStyle = '#060708'; ctx.beginPath(); ctx.moveTo(-s * .25, s * .2); ctx.lineTo(0, -s * .45); ctx.lineTo(s * .25, s * .2); ctx.closePath(); ctx.fill();
        ctx.restore();
        glow(ctx, x, y, s * .6, 'rgba(220,235,255,.8)', .5 + .3 * Math.sin(wt * .006 + n));
      }
      meer(ctx, H * .72, wt, '#0a1016');
    } else if (i === 3){
      // Fünf Türme mit Glocken, Ringe von Klang, steigendes Wasser
      himmel(ctx, '#05070b', '#222c38'); sternenfeld(ctx, .6);
      const lv = hz - k * H * .05;
      [.12, .31, .5, .69, .88].forEach((f, n) => {
        const x = W * f, th = H * (.2 + (n === 2 ? .08 : (n % 2) * .03));
        turm(ctx, x, hz + 4, th, Math.max(12, W * .035), '#07090c');
        const bx = x, by = hz - th + Math.max(12, W * .035) * .2, ph = (wt * .0006 + n * .21) % 1, leise = 1 - k * .7;
        ctx.strokeStyle = `rgba(220,230,245,${(1 - ph) * .35 * leise})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(bx, by, ph * W * .18, 0, TAU); ctx.stroke();
        glow(ctx, bx, by, 12, 'rgba(220,235,255,.9)', .5 * leise);
      });
      meer(ctx, lv, wt, '#101a24');
    } else {
      // Unter Wasser: eine Gestalt sinkt, in ihrer Brust ein schwaches Licht
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0e1d26'); g.addColorStop(1, '#010203'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (let n = 0; n < 7; n++){ const x = W * (.1 + n * .14) + Math.sin(wt * .0005 + n) * 20; ctx.fillStyle = 'rgba(160,200,215,.05)'; ctx.beginPath(); ctx.moveTo(x - 30, 0); ctx.lineTo(x + 30, 0); ctx.lineTo(x + 90, H); ctx.lineTo(x - 10, H); ctx.fill(); }
      const fx = W * .5 + Math.sin(wt * .0007) * 10, fy = lerp(H * .2, H * .62, EASE.out(k));
      const A = Prolog.figur || (Prolog.figur = makeActor({ set: 'kron', look: Object.assign({}, LOOK.kron, { weapon: null, off: null, heart: true }), face: 1, H: Math.min(W, H) * .25 }));
      A.H = Math.min(W, H) * .25; A.x = fx; A.gy = fy; A.t += dt; A.glow = .6;
      A.pose = mkPose({ rot: -.9 + Math.sin(wt * .0006) * .1, lean: .3, head: .4, a1: 2.2, a2: .4, b1: 2.5, b2: .5, f1: .5, f2: -.6, k1: .2, k2: -.4, cape: .2 }, SETS.kron.idle);
      drawActor(ctx, A);
      const c = chestPt(A), beat = Math.exp(-((wt % 2400) / 2400) * 12);
      glow(ctx, c[0], c[1], 30 + beat * 30, 'rgba(210,225,255,.9)', .5 + beat * .5);
      for (let n = 0; n < 8; n++){ const bx = fx + Math.sin(n * 7 + wt * .001) * 30, by = fy - ((wt * .05 + n * 60) % (H * .7)); ctx.strokeStyle = 'rgba(200,230,240,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(bx, by, 2 + n % 3, 0, TAU); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
    // Vignette und Körnung
    const vg = ctx.createRadialGradient(W / 2, H * .45, Math.min(W, H) * .25, W / 2, H * .45, Math.max(W, H) * .75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.75)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  return { start, update, draw, figur: null };
})();
