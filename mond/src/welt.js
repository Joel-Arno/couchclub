/* =====================================================================
   WELT: Hintergründe, Wetter und Effekte
   ===================================================================== */
const World = (() => {
  let W = 1, Hh = 1, dpr = 1, bg = null, bgKey = '', scene = 'strand';
  let flood = 0, floodT = 0, tint = 0, tintT = 0, fogWall = 0, fogWallT = 0, calm = 0;
  let shakeP = 0, flashC = '#fff', flashA = 0, slowA = 0, slowOn = false, camY = 0, camT = 0;
  const parts = [], rings = [], pops = [], ghosts = [], waves = [];
  const amb = [];

  const SC = {
    strand: { sky: ['#06080c', '#121923', '#2a3542'], sea: ['#26313e', '#0e141b'], ground: 'kies', towers: true, wrecks: true, cliffs: true },
    feuer:  { sky: ['#07080b', '#15181f', '#33302f'], sea: ['#29303a', '#0f1318'], ground: 'kies', lighthouse: true, fire: true, cliffs: true },
    tor:    { sky: ['#07090c', '#131a22', '#2b3440'], sea: ['#252f3b', '#0e131a'], ground: 'fels', gate: true, cliffs: 'nah' },
    mole:   { sky: ['#07090c', '#141b24', '#2f3a47'], sea: ['#283441', '#0f151c'], ground: 'stein', towers: true, posts: true, fire: 'mole' },
    nebel:  { sky: ['#07090c', '#141b24', '#303b47'], sea: ['#283441', '#0f151c'], ground: 'stein', towers: true, posts: true, fogwall: true },
    arena:  { sky: ['#06080b', '#111821', '#2b3643'], sea: ['#223040', '#0c1218'], ground: 'stein', towers: true, posts: true },
    ende:   { sky: ['#0a0d12', '#1b2430', '#46505a'], sea: ['#34414f', '#121920'], ground: 'stein', towers: 'hell', posts: true }
  };

  function resize(w, h, r){ W = w; Hh = h; dpr = r; bgKey = ''; if (!amb.length) seedAmb(); }
  function set(name){
    if (scene === name) return;
    scene = name; bgKey = '';
    fogWallT = SC[name].fogwall ? 1 : 0;
  }
  const horizon = () => Math.round(Hh * .43);
  const groundY = () => Math.round(Hh * .62);
  // Breite der Kampfbühne, damit es auch auf breiten Bildschirmen zusammenpasst
  const arenaW = () => Math.min(W, Hh * .78, 560);

  /* ---------- Statischer Hintergrund ---------- */
  function mulb(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function buildBg(){
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(W * dpr)); c.height = Math.max(1, Math.round(Hh * dpr));
    const g = c.getContext('2d'); g.scale(dpr, dpr);
    const s = SC[scene], hz = horizon(), gy = groundY(), R = mulb(7 + scene.length * 13);
    // Himmel
    let gr = g.createLinearGradient(0, 0, 0, hz);
    gr.addColorStop(0, s.sky[0]); gr.addColorStop(.6, s.sky[1]); gr.addColorStop(1, s.sky[2]);
    g.fillStyle = gr; g.fillRect(0, 0, W, hz + 1);
    // Heller Dunst über dem Horizont
    gr = g.createRadialGradient(W * .56, hz, 0, W * .56, hz, Math.max(W, Hh) * .7);
    gr.addColorStop(0, s.fire ? 'rgba(200,170,140,.2)' : 'rgba(170,188,205,.2)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, hz);
    // Die Narbe am Himmel, wo einst der Mond stand
    const cx = W * .7, cy = -Hh * .06, rad = Math.min(W, Hh) * .5;
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(214,224,238,.05)'; g.lineWidth = 16; g.beginPath(); g.arc(cx, cy, rad, .18 * Math.PI, .92 * Math.PI); g.stroke();
    g.strokeStyle = 'rgba(214,224,238,.14)'; g.lineWidth = 1.4; g.beginPath(); g.arc(cx, cy, rad, .2 * Math.PI, .9 * Math.PI); g.stroke();
    for (let i = 0; i < 7; i++){
      const a = (.25 + i * .1 + R() * .04) * Math.PI, x0 = cx + Math.cos(a) * rad, y0 = cy + Math.sin(a) * rad;
      g.strokeStyle = `rgba(214,224,238,${.05 + R() * .08})`; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x0, y0);
      let x = x0, y = y0;
      for (let k = 0; k < 3; k++){ x += Math.cos(a) * (8 + R() * 16) + (R() - .5) * 10; y += Math.sin(a) * (8 + R() * 16) + (R() - .5) * 10; g.lineTo(x, y); }
      g.stroke();
    }
    // Ein paar ferne Lichtpunkte
    for (let i = 0; i < 26; i++){ g.fillStyle = `rgba(214,224,238,${.05 + R() * .18})`; g.fillRect(R() * W, R() * hz * .7, 1, 1); }
    // Klippen
    if (s.cliffs){
      const near = s.cliffs === 'nah';
      g.fillStyle = near ? '#10151c' : '#151c25';
      g.beginPath(); g.moveTo(0, hz + 2);
      const lw = W * (near ? .42 : .3);
      for (let x = 0; x <= lw; x += 6){ const u = x / lw; g.lineTo(x, hz - (1 - u * u) * Hh * (near ? .24 : .15) - R() * 6 - Math.sin(x * .05) * 4); }
      g.lineTo(lw + 20, hz + 2); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(W, hz + 2);
      const rw = W * (near ? .35 : .18);
      for (let x = 0; x <= rw; x += 6){ const u = x / rw; g.lineTo(W - x, hz - (1 - u) * Hh * (near ? .2 : .06) - R() * 5); }
      g.lineTo(W - rw - 10, hz + 2); g.closePath(); g.fill();
    }
    // Türme draußen auf dem Wasser
    if (s.towers){
      const bright = s.towers === 'hell';
      [[.1, .07], [.27, .05], [.49, .095], [.7, .06], [.89, .045]].forEach(([fx, fh], i) => {
        const x = W * fx, h = Hh * fh, w = Math.max(3, W * .011), top = hz - h;
        g.fillStyle = bright ? 'rgba(40,50,62,.9)' : 'rgba(26,33,43,.95)';
        g.fillRect(x - w / 2, top, w, h + 2);
        g.fillRect(x - w * .8, top - h * .12, w * 1.6, h * .14);
        g.beginPath(); g.moveTo(x - w * .8, top - h * .12); g.lineTo(x, top - h * .34); g.lineTo(x + w * .8, top - h * .12); g.fill();
        if (i === 2){ g.fillStyle = 'rgba(230,220,190,.55)'; g.fillRect(x - 1, top - h * .08, 2, 2); }
      });
    }
    // Leuchtturm ohne Licht
    if (s.lighthouse){
      const x = W * .8, top = hz - Hh * .17, bw = Math.max(18, W * .07);
      g.fillStyle = '#0c1016';
      g.beginPath(); g.moveTo(x - bw * .5, gy); g.lineTo(x - bw * .32, top); g.lineTo(x + bw * .32, top); g.lineTo(x + bw * .5, gy); g.closePath(); g.fill();
      g.fillRect(x - bw * .42, top - bw * .1, bw * .84, bw * .12);
      g.fillRect(x - bw * .26, top - bw * .55, bw * .52, bw * .45);
      g.beginPath(); g.moveTo(x - bw * .34, top - bw * .55); g.lineTo(x, top - bw * .85); g.lineTo(x + bw * .34, top - bw * .55); g.fill();
    }
    // Meer
    gr = g.createLinearGradient(0, hz, 0, gy);
    gr.addColorStop(0, s.sea[0]); gr.addColorStop(1, s.sea[1]);
    g.fillStyle = gr; g.fillRect(0, hz, W, gy - hz + 2);
    g.fillStyle = 'rgba(214,224,238,.14)'; g.fillRect(0, hz, W, 1);
    // Wracks
    if (s.wrecks){
      g.strokeStyle = '#0b0f14'; g.lineCap = 'round';
      [[W * .08, 1], [W * .9, -1]].forEach(([x, dir]) => {
        for (let i = 0; i < 5; i++){
          const bx = x + dir * i * W * .025, h = Hh * (.07 + i * .012 + R() * .01);
          g.lineWidth = Math.max(2, W * .008);
          g.beginPath(); g.moveTo(bx, gy + 4); g.quadraticCurveTo(bx - dir * W * .03, gy - h * .6, bx + dir * W * .01, gy - h); g.stroke();
        }
        g.lineWidth = Math.max(3, W * .01); g.beginPath(); g.moveTo(x - dir * W * .02, gy - 2); g.lineTo(x + dir * W * .13, gy - Hh * .02); g.stroke();
      });
    }
    // Kettentor
    if (s.gate){
      const cx2 = W / 2 + arenaW() * .2, pw = Math.max(10, W * .035), ph = Hh * .3;
      g.fillStyle = '#0a0d12';
      [cx2 - arenaW() * .24, cx2 + arenaW() * .24].forEach(px => { g.fillRect(px - pw / 2, gy - ph, pw, ph + 4); g.fillRect(px - pw * .7, gy - ph - 6, pw * 1.4, 8); });
      g.strokeStyle = 'rgba(12,16,22,.95)'; g.lineWidth = 2.2;
      for (let i = 0; i < 6; i++){
        const y0 = gy - ph + 12 + i * 5, sag = 30 + i * 12;
        g.setLineDash([4, 3]);
        g.beginPath(); g.moveTo(cx2 - arenaW() * .24, y0); g.quadraticCurveTo(cx2, y0 + sag, cx2 + arenaW() * .24, y0); g.stroke();
      }
      g.setLineDash([]);
    }
    // Poller auf der Mole
    if (s.posts){
      g.fillStyle = '#080b0f';
      [W / 2 - arenaW() * .5, W / 2 + arenaW() * .52].forEach((px, i) => {
        const pw = Math.max(8, W * .022), ph = Hh * .05;
        g.fillRect(px - pw / 2, gy - ph, pw, ph + 2);
        g.beginPath(); g.ellipse(px, gy - ph, pw * .7, pw * .25, 0, 0, TAU); g.fill();
      });
    }
    // Boden
    const top = s.ground === 'stein' ? '#11151b' : '#0d1116';
    gr = g.createLinearGradient(0, gy, 0, Hh);
    gr.addColorStop(0, top); gr.addColorStop(1, '#050608');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(0, Hh);
    if (s.ground === 'stein'){ g.lineTo(0, gy); g.lineTo(W, gy); }
    else for (let x = 0; x <= W + 8; x += 8) g.lineTo(x, gy - (s.ground === 'fels' ? 3 + Math.sin(x * .03) * 3 : 1) - R() * 2);
    g.lineTo(W, Hh); g.closePath(); g.fill();
    g.fillStyle = 'rgba(170,186,205,.13)'; g.fillRect(0, gy - 1, W, 1);
    if (s.ground === 'stein'){
      g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1;
      for (let row = 0; row < 5; row++){
        const y = gy + 6 + row * row * 9 + row * 10, off = row % 2 ? 22 : 0, step = 46 + row * 22;
        g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
        for (let x = -off; x < W; x += step){ g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 8 + row * 9); g.stroke(); }
      }
    } else {
      for (let i = 0; i < 260; i++){
        const y = gy + 3 + Math.pow(R(), 1.6) * (Hh - gy), x = R() * W, r = .6 + (y - gy) / (Hh - gy) * 2.6;
        g.fillStyle = `rgba(150,165,185,${.03 + R() * .07})`;
        g.beginPath(); g.ellipse(x, y, r * 1.5, r, 0, 0, TAU); g.fill();
      }
    }
    bg = c; bgKey = scene + W + 'x' + Hh;
  }

  /* ---------- Bewegte Teile ---------- */
  function seedAmb(){
    amb.length = 0;
    for (let i = 0; i < 46; i++) amb.push({ x: rnd(), y: rnd(), s: .4 + rnd() * 1.4, v: .004 + rnd() * .012, ph: rnd() * TAU });
  }
  function drawSea(ctx, t){
    const hz = horizon(), gy = groundY();
    ctx.lineWidth = 1;
    for (let r = 1; r < 16; r++){
      const u = Math.pow(r / 16, 1.7), y = hz + (gy - hz) * u;
      ctx.strokeStyle = `rgba(175,195,215,${.03 + u * .09})`;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 14){
        const yy = y + Math.sin(x * (.02 / (u + .2)) + t * .0009 * (1 + r * .1) + r) * (1 + u * 2.5);
        x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
      }
      ctx.stroke();
    }
    // Schaum an der Kante
    const fa = .1 + Math.sin(t * .0011) * .06;
    ctx.fillStyle = `rgba(200,214,228,${fa})`;
    ctx.beginPath(); ctx.moveTo(0, gy - 2);
    for (let x = 0; x <= W; x += 10) ctx.lineTo(x, gy - 3 - Math.sin(x * .05 + t * .002) * 1.5 - Math.sin(t * .0011) * 2);
    ctx.lineTo(W, gy); ctx.lineTo(0, gy); ctx.closePath(); ctx.fill();
  }
  function drawFog(ctx, t, strength = 1){
    const hz = horizon();
    for (let i = 0; i < 5; i++){
      const x = ((i * .31 + t * .000012 * (1 + i * .4)) % 1.4 - .2) * W, y = hz + (i - 2) * Hh * .035, r = W * (.35 + i * .06);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(170,185,200,${.07 * strength})`); g.addColorStop(1, 'rgba(170,185,200,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r * .35, r * 2, r * .7);
    }
  }
  function drawFogWall(ctx, t){
    if (fogWall < .01) return;
    const gy = groundY(), x0 = W / 2 + arenaW() * .14;
    for (let i = 0; i < 9; i++){
      const x = x0 + (i % 3) * W * .12 + Math.sin(t * .0007 + i) * 12, y = gy - Hh * (.05 + (i / 9) * .28) + Math.cos(t * .0005 + i * 2) * 10;
      const r = Hh * (.14 + (i % 4) * .03);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(210,220,230,${.22 * fogWall})`); g.addColorStop(1, 'rgba(210,220,230,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    const g2 = ctx.createLinearGradient(x0 - 40, 0, x0 + W * .3, 0);
    g2.addColorStop(0, 'rgba(200,212,224,0)'); g2.addColorStop(1, `rgba(200,212,224,${.28 * fogWall})`);
    ctx.fillStyle = g2; ctx.fillRect(x0 - 40, gy - Hh * .42, W, Hh * .42);
  }
  function firePos(){ return SC[scene].fire === 'mole' ? [W / 2 + arenaW() * .06, groundY()] : [W / 2 + arenaW() * .06, groundY()]; }
  function drawFire(ctx, t){
    const s = SC[scene]; if (!s.fire) return;
    const [x, gy] = firePos(), sz = Math.min(W, Hh) * .062;
    // Lichtschein
    let g = ctx.createRadialGradient(x, gy - sz, 0, x, gy - sz, sz * 9);
    g.addColorStop(0, 'rgba(227,154,85,.28)'); g.addColorStop(1, 'rgba(227,154,85,0)');
    ctx.fillStyle = g; ctx.fillRect(x - sz * 9, gy - sz * 10, sz * 18, sz * 12);
    // Eiserne Schale
    ctx.fillStyle = '#07090c';
    ctx.fillRect(x - sz * .12, gy - sz * 1.1, sz * .24, sz * 1.1);
    ctx.beginPath(); ctx.moveTo(x - sz * .9, gy - sz * 1.3); ctx.lineTo(x + sz * .9, gy - sz * 1.3); ctx.lineTo(x + sz * .45, gy - sz * .85); ctx.lineTo(x - sz * .45, gy - sz * .85); ctx.closePath(); ctx.fill();
    // Flammen
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++){
      const ph = t * .006 + i * 1.7, fx = x + Math.sin(ph * .7 + i) * sz * .35, h = sz * (1 + .6 * Math.sin(ph) + (i % 3) * .3);
      g = ctx.createRadialGradient(fx, gy - sz * 1.4 - h * .3, 0, fx, gy - sz * 1.4 - h * .3, h * .8);
      g.addColorStop(0, 'rgba(255,218,160,.65)'); g.addColorStop(.5, 'rgba(235,135,60,.32)'); g.addColorStop(1, 'rgba(180,60,20,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(fx, gy - sz * 1.4 - h * .3, h * .35, h * .8, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
    if (rnd() < .25) parts.push({ x: x + (rnd() - .5) * sz, y: gy - sz * 1.6, vx: (rnd() - .5) * .02, vy: -.03 - rnd() * .04, life: 0, max: 1600 + rnd() * 1400, size: 1 + rnd() * 1.4, col: '255,170,90', g: 0, add: true, drag: .999 });
  }
  function drawAmb(ctx, t){
    ctx.fillStyle = 'rgba(205,215,228,.28)';
    for (const p of amb){
      const x = ((p.x - t * p.v * .00006 * 60) % 1 + 1) % 1 * W, y = (p.y * .85 + .05) * Hh + Math.sin(t * .001 + p.ph) * 8;
      ctx.globalAlpha = .35 + .35 * Math.sin(t * .002 + p.ph);
      ctx.fillRect(x, y, p.s, p.s);
    }
    ctx.globalAlpha = 1;
  }
  function drawFlood(ctx, t){
    if (flood < .005) return;
    const gy = groundY(), lv = gy - flood * Hh * .045;
    const g = ctx.createLinearGradient(0, lv, 0, Hh);
    g.addColorStop(0, `rgba(40,96,104,${.5 * Math.min(1, flood)})`); g.addColorStop(1, `rgba(8,20,24,${.75 * Math.min(1, flood)})`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, Hh);
    for (let x = 0; x <= W; x += 10) ctx.lineTo(x, lv + Math.sin(x * .03 + t * .003) * 2.5 + Math.sin(x * .011 - t * .0017) * 2);
    ctx.lineTo(W, Hh); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(190,230,230,${.35 * Math.min(1, flood)})`; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let x = 0; x <= W; x += 10){ const y = lv + Math.sin(x * .03 + t * .003) * 2.5 + Math.sin(x * .011 - t * .0017) * 2; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
  }
  // Flutwelle, die vom Boss zum Spieler rollt
  function drawWaves(ctx, dt){
    for (let i = waves.length - 1; i >= 0; i--){
      const w = waves[i]; w.t += dt;
      const k = Math.min(1, w.t / w.dur), x = lerp(w.x0, w.x1, EASE.in(k)), gy = groundY(), h = Hh * .13 * Math.sin(Math.min(1, k * 1.3) * Math.PI * .5 + .2);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(x, gy - h, x, gy);
      g.addColorStop(0, 'rgba(190,240,236,.6)'); g.addColorStop(1, 'rgba(40,110,120,.25)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x + 40, gy);
      ctx.quadraticCurveTo(x + 10, gy - h * 1.1, x - 20, gy - h); ctx.quadraticCurveTo(x - 10, gy - h * .5, x - 70, gy);
      ctx.closePath(); ctx.fill(); ctx.restore();
      if (rnd() < .7) burst(x - 10 + rnd() * 30, gy - h * rnd(), 'drop', 1);
      if (w.t > w.dur + 120) waves.splice(i, 1);
    }
  }

  /* ---------- Effekte ---------- */
  const KIND = {
    spark: () => ({ v: .35, spread: TAU, size: [1, 2.2], life: [180, 380], col: '255,210,150', g: .0006, add: true }),
    gold:  () => ({ v: .45, spread: TAU, size: [1.2, 2.8], life: [300, 650], col: '240,205,120', g: .0003, add: true }),
    drop:  () => ({ v: .22, spread: TAU, size: [1.2, 2.6], life: [400, 800], col: '160,200,210', g: .0009, add: false }),
    ember: () => ({ v: .08, spread: TAU, size: [1, 2.2], life: [900, 1800], col: '255,160,80', g: -.00006, add: true }),
    mist:  () => ({ v: .03, spread: TAU, size: [8, 18], life: [800, 1600], col: '150,170,190', g: -.00004, add: false, fade: .18 }),
    heal:  () => ({ v: .06, spread: TAU, size: [1, 2], life: [700, 1200], col: '200,225,255', g: -.00012, add: true })
  };
  function burst(x, y, kind, n = 10, dir = null){
    const k = KIND[kind]();
    for (let i = 0; i < n; i++){
      const a = dir === null ? rnd() * TAU : dir + (rnd() - .5) * 1.4, v = k.v * (.35 + rnd());
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (kind === 'drop' ? .12 : 0), life: 0, max: rr(...k.life), size: rr(...k.size), col: k.col, g: k.g, add: k.add, drag: .996, fade: k.fade || 1 });
    }
  }
  // Glut fliegt vom besiegten Gegner zum Spieler
  function glutFlow(from, to, n = 24){
    for (let i = 0; i < n; i++) parts.push({ x: from[0] + (rnd() - .5) * 30, y: from[1] + (rnd() - .5) * 40, vx: (rnd() - .5) * .15, vy: -rnd() * .15, life: -i * 30, max: 1500, size: 1.2 + rnd() * 1.5, col: '255,170,90', g: 0, add: true, drag: .99, home: to });
  }
  function ring(x, y, r0, r1, col, dur = 420, w = 2){ rings.push({ x, y, r0, r1, col, t: 0, dur, w }); }
  function pop(x, y, text, col = '#e8ecf2', size = 18){ pops.push({ x, y, text, col, size, t: 0, dur: 900 }); }
  function ghost(a){ ghosts.push({ a: Object.assign({}, a, { pose: Object.assign({}, a.pose), trail: [] }), t: 0, dur: 260 }); }
  function shake(p){ if (!reduceMotion) shakeP = Math.max(shakeP, p); }
  function flash(col, a){ flashC = col; flashA = Math.max(flashA, a); }
  function wave(x0, x1, dur){ waves.push({ x0, x1, dur, t: 0 }); }

  function updateFx(dt){
    for (let i = parts.length - 1; i >= 0; i--){
      const p = parts[i]; p.life += dt;
      if (p.life < 0) continue;
      if (p.home){
        const dx = p.home[0] - p.x, dy = p.home[1] - p.y, d = Math.hypot(dx, dy) || 1, pull = Math.min(1, p.life / 500) * .0022;
        p.vx += dx / d * pull * dt; p.vy += dy / d * pull * dt;
        if (d < 14 && p.life > 300) p.life = p.max;
      }
      p.vy += p.g * dt; p.vx *= Math.pow(p.drag, dt); p.vy *= Math.pow(p.drag, dt);
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.life >= p.max) parts.splice(i, 1);
    }
    for (let i = rings.length - 1; i >= 0; i--){ rings[i].t += dt; if (rings[i].t > rings[i].dur) rings.splice(i, 1); }
    for (let i = pops.length - 1; i >= 0; i--){ pops[i].t += dt; if (pops[i].t > pops[i].dur) pops.splice(i, 1); }
    for (let i = ghosts.length - 1; i >= 0; i--){ ghosts[i].t += dt; if (ghosts[i].t > ghosts[i].dur) ghosts.splice(i, 1); }
    shakeP *= Math.pow(.988, dt); if (shakeP < .2) shakeP = 0;
    flashA *= Math.pow(.992, dt);
    flood += (floodT - flood) * (1 - Math.pow(.9985, dt));
    tint += (tintT - tint) * (1 - Math.pow(.998, dt));
    fogWall += (fogWallT - fogWall) * (1 - Math.pow(.997, dt));
    camY += (camT * Hh - camY) * (1 - Math.pow(.994, dt));
    slowA += ((slowOn ? 1 : 0) - slowA) * (1 - Math.pow(.99, dt));
  }

  /* ---------- Zeichnen ---------- */
  function drawBack(ctx, t){
    if (!bg || bgKey !== scene + W + 'x' + Hh) buildBg();
    ctx.drawImage(bg, 0, 0, W, Hh);
    ctx.fillStyle = '#050608'; ctx.fillRect(0, Hh - 1, W, Hh);
    drawSea(ctx, t);
    drawFog(ctx, t, SC[scene].fogwall ? 1.6 : 1);
    drawFire(ctx, t);
  }
  function drawGhosts(ctx){
    for (const g of ghosts) drawActor(ctx, g.a, .35 * (1 - g.t / g.dur));
  }
  function drawFront(ctx, t, dt){
    drawWaves(ctx, dt);
    drawFlood(ctx, t);
    drawFogWall(ctx, t);
    drawAmb(ctx, t);
    for (const p of parts){
      if (p.life < 0) continue;
      const k = 1 - p.life / p.max;
      ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
      ctx.fillStyle = `rgba(${p.col},${Math.min(1, k * 1.5) * p.fade})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (p.fade < 1 ? (1.4 - k * .6) : 1), 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const r of rings){
      const k = r.t / r.dur, rad = lerp(r.r0, r.r1, EASE.out3(k));
      ctx.strokeStyle = r.col; ctx.globalAlpha = 1 - k; ctx.lineWidth = r.w * (1 - k * .5);
      ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const p of pops){
      const k = p.t / p.dur, y = p.y - EASE.out(k) * 34;
      ctx.globalAlpha = k < .7 ? 1 : 1 - (k - .7) / .3;
      ctx.font = `600 ${p.size}px 'IBM Plex Sans', system-ui, sans-serif`;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.strokeText(p.text, p.x, y);
      ctx.fillStyle = p.col; ctx.fillText(p.text, p.x, y);
    }
    ctx.globalAlpha = 1;
  }
  function drawOver(ctx){
    // Tönung der zweiten Bossphase
    if (tint > .01){ ctx.fillStyle = `rgba(30,90,100,${tint * .14})`; ctx.fillRect(0, 0, W, Hh); }
    if (slowA > .01){ ctx.fillStyle = `rgba(120,160,210,${slowA * .1})`; ctx.fillRect(0, 0, W, Hh); }
    // Vignette
    const g = ctx.createRadialGradient(W / 2, Hh * .45, Math.min(W, Hh) * .3, W / 2, Hh * .45, Math.max(W, Hh) * .75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.6)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh);
    if (flashA > .01){ ctx.globalAlpha = Math.min(1, flashA); ctx.fillStyle = flashC; ctx.fillRect(0, 0, W, Hh); ctx.globalAlpha = 1; }
  }
  function camShake(){ return shakeP ? [(rnd() - .5) * shakeP, (rnd() - .5) * shakeP] : [0, 0]; }
  function setFlood(v){ floodT = v; }
  function setTint(v){ tintT = v; }
  function setSlow(v){ slowOn = v; }
  function setCam(v, now = false){ camT = v; if (now) camY = v * Hh; }
  function clearFx(){ parts.length = 0; rings.length = 0; pops.length = 0; ghosts.length = 0; waves.length = 0; }
  function reset(){ clearFx(); flood = floodT = 0; tint = tintT = 0; }
  return { resize, set, scene: () => scene, horizon, groundY, arenaW, drawBack, drawFront, drawOver, drawGhosts, updateFx, camShake,
    burst, glutFlow, ring, pop, ghost, shake, flash, wave, setFlood, setTint, setSlow, setCam, camY: () => camY, clearFx, reset, firePos, size: () => [W, Hh] };
})();
