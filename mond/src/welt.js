/* =====================================================================
   WELT: Hintergründe, Wetter und Effekte
   ===================================================================== */
const World = (() => {
  let W = 1, Hh = 1, dpr = 1, bg = null, mid = null, bgKey = '', scene = 'strand';
  let flood = 0, floodT = 0, tint = 0, tintT = 0, fogWall = 0, fogWallT = 0, calm = 0;
  let shakeP = 0, flashC = '#fff', flashA = 0, slowA = 0, slowOn = false, camY = 0, camT = 0;
  const parts = [], rings = [], pops = [], ghosts = [], waves = [];
  const amb = [];

  // Szenen: was im Hintergrund steht. sea fehlt bei Innenräumen und Höhlen.
  const SKY = ['#06080c', '#121923', '#2a3542'], SEA = ['#26313e', '#0e141b'];
  const SC = {
    strand: { sky: SKY, sea: SEA, ground: 'kies', towers: true, wrecks: true, cliffs: true },
    feuer:  { sky: ['#07080b', '#15181f', '#33302f'], sea: ['#29303a', '#0f1318'], ground: 'kies', lighthouse: true, fire: true, cliffs: true },
    tor:    { sky: ['#07090c', '#131a22', '#2b3440'], sea: ['#252f3b', '#0e131a'], ground: 'fels', gate: true, cliffs: 'nah' },
    mole:   { sky: ['#07090c', '#141b24', '#2f3a47'], sea: ['#283441', '#0f151c'], ground: 'stein', towers: true, posts: true, fire: 'mole', anvil: true },
    nebel:  { sky: ['#07090c', '#141b24', '#303b47'], sea: ['#283441', '#0f151c'], ground: 'stein', towers: true, posts: true, fogwall: true },
    arena:  { sky: ['#06080b', '#111821', '#2b3643'], sea: ['#223040', '#0c1218'], ground: 'stein', towers: true, posts: true },
    ende:   { sky: ['#0a0d12', '#1b2430', '#46505a'], sea: ['#34414f', '#121920'], ground: 'stein', towers: 'hell', posts: true },
    bucht:  { sky: ['#06080c', '#111923', '#26323f'], sea: ['#1f2c38', '#0b1117'], ground: 'kies', cliffs: 'bucht', calm: true, glimmer: true },
    marsch: { sky: ['#07090a', '#131a1a', '#2f3935'], sea: ['#232d2a', '#0d1312'], ground: 'salz', calm: true, reeds: true, trees: true, fog: 1.5 },
    pfahldorf: { sky: ['#07090a', '#14191a', '#312f2c'], sea: ['#252d2b', '#0e1312'], ground: 'planken', calm: true, reeds: 'wenig', stilts: true, fire: true, fog: 1.3 },
    grube:  { cave: true, ground: 'salz', fog: .5 },
    bruecke:{ sky: ['#07090c', '#131922', '#2c3642'], sea: ['#1d2833', '#0a0f14'], ground: 'stein', city: 'fern', railing: true, fog: 1.4 },
    velmora:{ sky: ['#07090c', '#121820', '#28313c'], sea: ['#1f2a34', '#0c1116'], ground: 'stein', city: 'nah', calm: true, flood: .55 },
    brunnen:{ sky: ['#07090c', '#131820', '#2e2f33'], sea: ['#212a33', '#0c1116'], ground: 'stein', city: 'platz', calm: true, fire: 'brunnen', anvil: true, flood: .3 },
    hafen:  { sky: ['#06080b', '#10171f', '#27313c'], sea: ['#1c2833', '#0a1015'], ground: 'planken', ships: true, fog: 1.2 },
    kapelle:{ inside: 'kapelle', ground: 'stein', fog: .35 },
    treppe: { inside: 'treppe', ground: 'stein', fire: true, fog: .3 },
    turm:   { sky: ['#080a0e', '#161d27', '#35404c'], sea: ['#2a3643', '#10161d'], ground: 'stein', turm: true, fog: .8 }
  };
  let bellSwing = 0, bellT = 0, bellPh = 0;

  function resize(w, h, r){ W = w; Hh = h; dpr = r; bgKey = ''; if (!amb.length) seedAmb(); }
  function set(name){
    if (!SC[name]) name = 'strand';
    if (scene === name) return;
    scene = name; bgKey = '';
    fogWallT = SC[name].fogwall ? 1 : 0;
    floodT = SC[name].flood || 0; bellT = 0;
  }
  const sceneFlood = () => SC[scene].flood || 0;
  const horizon = () => Math.round(Hh * .43);
  const groundY = () => Math.round(Hh * .62);
  // Breite der Kampfbühne, damit es auch auf breiten Bildschirmen zusammenpasst
  const arenaW = () => Math.min(W, Hh * .78, 560);

  /* ---------- Statischer Hintergrund ---------- */
  function mulb(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  // Zwei Ebenen: hinten Himmel und Meer, davor alles, was im Wasser oder am Ufer steht.
  // Dazwischen zeichnet drawSea die bewegten Wellen.
  function layer(){
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(W * dpr)); c.height = Math.max(1, Math.round(Hh * dpr));
    const g = c.getContext('2d'); g.scale(dpr, dpr); g.lineCap = 'round'; g.lineJoin = 'round';
    return [c, g];
  }
  function buildBg(){
    const [c, g] = layer(), [c2, m] = layer();
    const s = SC[scene], hz = horizon(), gy = groundY(), R = mulb(7 + scene.length * 13 + scene.charCodeAt(0)), A = arenaW();
    if (s.cave) paintCave(g, s, R, hz, gy);
    else if (s.inside === 'kapelle') paintKapelle(g, R, hz, gy, A);
    else if (s.inside === 'treppe') paintTreppe(g, R, hz, gy, A);
    else {
      paintSky(g, s, R, hz);
      if (s.cliffs) paintCliffs(g, s, R, hz);
      if (s.towers) paintTowers(g, s, hz);
      if (s.city === 'fern') paintCityFar(g, R, hz);
      if (s.lighthouse) paintLighthouse(g, hz, gy);
      const gr = g.createLinearGradient(0, hz, 0, gy);
      gr.addColorStop(0, s.sea[0]); gr.addColorStop(1, s.sea[1]);
      g.fillStyle = gr; g.fillRect(0, hz, W, gy - hz + 2);
      g.fillStyle = 'rgba(214,224,238,.14)'; g.fillRect(0, hz, W, 1);
      if (s.trees) paintTrees(m, R, hz, gy);
      if (s.stilts) paintStilts(m, R, hz, gy);
      if (s.ships) paintShips(m, R, hz, gy);
      if (s.city === 'nah' || s.city === 'platz') paintCityNear(m, s, R, hz, gy, A);
      if (s.reeds) paintReeds(m, R, hz, gy, s.reeds === 'wenig' ? .45 : 1);
      if (s.wrecks) paintWrecks(m, R, gy);
      if (s.gate) paintGate(m, gy, A);
      if (s.turm) paintTurm(m, R, hz, gy, A);
    }
    if (s.posts) paintPosts(m, gy, A);
    if (s.railing) paintRailing(m, gy, A);
    paintGround(m, s, R, gy);
    if (s.anvil) paintAnvil(m, gy, A);
    bg = c; mid = c2; bgKey = scene + W + 'x' + Hh;
  }

  /* ---------- Maler für die Hintergründe ---------- */
  function paintSky(g, s, R, hz){
    let gr = g.createLinearGradient(0, 0, 0, hz);
    gr.addColorStop(0, s.sky[0]); gr.addColorStop(.6, s.sky[1]); gr.addColorStop(1, s.sky[2]);
    g.fillStyle = gr; g.fillRect(0, 0, W, hz + 1);
    gr = g.createRadialGradient(W * .56, hz, 0, W * .56, hz, Math.max(W, Hh) * .7);
    gr.addColorStop(0, s.fire ? 'rgba(200,170,140,.2)' : 'rgba(170,188,205,.2)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, hz);
    // Die Narbe am Himmel, wo einst der Mond stand
    const cx = W * .7, cy = -Hh * .06, rad = Math.min(W, Hh) * .5;
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
    for (let i = 0; i < 26; i++){ g.fillStyle = `rgba(214,224,238,${.05 + R() * .18})`; g.fillRect(R() * W, R() * hz * .7, 1, 1); }
  }
  function paintCliffs(g, s, R, hz){
    const near = s.cliffs === 'nah', bay = s.cliffs === 'bucht';
    g.fillStyle = near || bay ? '#10151c' : '#151c25';
    const lw = W * (bay ? .36 : near ? .42 : .3), lh = Hh * (bay ? .3 : near ? .24 : .15);
    g.beginPath(); g.moveTo(0, hz + 2);
    for (let x = 0; x <= lw; x += 6){ const u = x / lw; g.lineTo(x, hz - (1 - u * u) * lh - R() * 6 - Math.sin(x * .05) * 4); }
    g.lineTo(lw + 20, hz + 2); g.closePath(); g.fill();
    const rw = W * (bay ? .32 : near ? .35 : .18), rh = Hh * (bay ? .26 : near ? .2 : .06);
    g.beginPath(); g.moveTo(W, hz + 2);
    for (let x = 0; x <= rw; x += 6){ const u = x / rw; g.lineTo(W - x, hz - (1 - u * (bay ? u : 1)) * rh - R() * 5); }
    g.lineTo(W - rw - 10, hz + 2); g.closePath(); g.fill();
    if (bay){
      // Felsbogen, der die Bucht vom Meer trennt
      g.fillStyle = '#0d1218';
      g.beginPath(); g.moveTo(W * .5, hz + 2); g.quadraticCurveTo(W * .56, hz - Hh * .05, W * .66, hz - Hh * .04); g.lineTo(W * .7, hz + 2); g.fill();
    }
  }
  function paintTowers(g, s, hz){
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
  function paintLighthouse(g, hz, gy){
    const x = W * .8, top = hz - Hh * .17, bw = Math.max(18, W * .07);
    g.fillStyle = '#0c1016';
    g.beginPath(); g.moveTo(x - bw * .5, gy); g.lineTo(x - bw * .32, top); g.lineTo(x + bw * .32, top); g.lineTo(x + bw * .5, gy); g.closePath(); g.fill();
    g.fillRect(x - bw * .42, top - bw * .1, bw * .84, bw * .12);
    g.fillRect(x - bw * .26, top - bw * .55, bw * .52, bw * .45);
    g.beginPath(); g.moveTo(x - bw * .34, top - bw * .55); g.lineTo(x, top - bw * .85); g.lineTo(x + bw * .34, top - bw * .55); g.fill();
  }
  function paintWrecks(g, R, gy){
    g.strokeStyle = '#0b0f14';
    [[W * .08, 1], [W * .9, -1]].forEach(([x, dir]) => {
      for (let i = 0; i < 5; i++){
        const bx = x + dir * i * W * .025, h = Hh * (.07 + i * .012 + R() * .01);
        g.lineWidth = Math.max(2, W * .008);
        g.beginPath(); g.moveTo(bx, gy + 4); g.quadraticCurveTo(bx - dir * W * .03, gy - h * .6, bx + dir * W * .01, gy - h); g.stroke();
      }
      g.lineWidth = Math.max(3, W * .01); g.beginPath(); g.moveTo(x - dir * W * .02, gy - 2); g.lineTo(x + dir * W * .13, gy - Hh * .02); g.stroke();
    });
  }
  function paintGate(g, gy, A){
    const cx2 = W / 2 + A * .2, pw = Math.max(10, W * .035), ph = Hh * .3;
    g.fillStyle = '#0a0d12';
    [cx2 - A * .24, cx2 + A * .24].forEach(px => { g.fillRect(px - pw / 2, gy - ph, pw, ph + 4); g.fillRect(px - pw * .7, gy - ph - 6, pw * 1.4, 8); });
    g.strokeStyle = 'rgba(12,16,22,.95)'; g.lineWidth = 2.2;
    for (let i = 0; i < 6; i++){
      const y0 = gy - ph + 12 + i * 5, sag = 30 + i * 12;
      g.setLineDash([4, 3]);
      g.beginPath(); g.moveTo(cx2 - A * .24, y0); g.quadraticCurveTo(cx2, y0 + sag, cx2 + A * .24, y0); g.stroke();
    }
    g.setLineDash([]);
  }
  function paintPosts(g, gy, A){
    g.fillStyle = '#080b0f';
    [W / 2 - A * .5, W / 2 + A * .52].forEach(px => {
      const pw = Math.max(8, W * .022), ph = Hh * .05;
      g.fillRect(px - pw / 2, gy - ph, pw, ph + 2);
      g.beginPath(); g.ellipse(px, gy - ph, pw * .7, pw * .25, 0, 0, TAU); g.fill();
    });
  }
  // Schilf: dünne, leicht gebogene Halme mit Kolben
  function paintReeds(g, R, hz, gy, dens){
    const clump = (x, base, h, n, col) => {
      g.strokeStyle = col; g.fillStyle = col;
      for (let i = 0; i < n; i++){
        const bx = x + (R() - .5) * h * .5, hh = h * (.6 + R() * .5), bend = (R() - .4) * h * .25;
        g.lineWidth = Math.max(1, h * .018);
        g.beginPath(); g.moveTo(bx, base); g.quadraticCurveTo(bx + bend * .3, base - hh * .6, bx + bend, base - hh); g.stroke();
        if (R() < .35){ g.beginPath(); g.ellipse(bx + bend * .95, base - hh * .93, h * .012 + 1, h * .05, bend * .01, 0, TAU); g.fill(); }
      }
    };
    // ferne Büschel auf dem Wasser
    for (let i = 0; i < 14 * dens; i++){ const x = R() * W, y = hz + (gy - hz) * (.15 + R() * .35); clump(x, y, Hh * (.02 + R() * .02), 4, 'rgba(14,19,19,.9)'); }
    // nahe Büschel an der Uferkante
    const A = arenaW();
    [W / 2 - A * .62, W / 2 - A * .48, W / 2 + A * .5, W / 2 + A * .66, 0, W].forEach((x, i) => {
      if (dens < 1 && i % 2) return;
      clump(x + (R() - .5) * 20, gy + 2, Hh * (.09 + R() * .05), 12, '#080b0b');
    });
  }
  // Tote Bäume, die im flachen Wasser stehen
  function paintTrees(g, R, hz, gy){
    const tree = (x, base, h, dir) => {
      g.strokeStyle = '#0a0e0e';
      const branch = (x0, y0, len, ang, w, d) => {
        const x1 = x0 + Math.sin(ang) * len, y1 = y0 - Math.cos(ang) * len;
        g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + Math.sin(ang) * len * .3 + dir * len * .1, y0 - Math.cos(ang) * len * .6, x1, y1); g.stroke();
        if (d > 0){ branch(x1, y1, len * .62, ang - .5 - R() * .3, w * .6, d - 1); branch(x1, y1, len * .55, ang + .4 + R() * .3, w * .6, d - 1); }
      };
      branch(x, base, h * .45, dir * .12, Math.max(2, h * .05), 3);
    };
    tree(W * .12, hz + (gy - hz) * .55, Hh * .2, 1);
    tree(W * .84, hz + (gy - hz) * .4, Hh * .15, -1);
    tree(W * .36, hz + (gy - hz) * .2, Hh * .07, 1);
  }
  // Häuser auf Pfählen, eines mit Licht
  function paintStilts(g, R, hz, gy){
    const hut = (x, base, w, h, lit) => {
      g.fillStyle = '#0b0e0f'; g.strokeStyle = '#0b0e0f'; g.lineWidth = Math.max(1.5, w * .04);
      for (let i = 0; i < 4; i++){ const px = x - w * .42 + i * w * .28; g.beginPath(); g.moveTo(px, base); g.lineTo(px + (R() - .5) * 3, base - h * .45); g.stroke(); }
      const fy = base - h * .45;
      g.fillRect(x - w * .55, fy - 2, w * 1.1, 3);
      g.fillRect(x - w * .42, fy - h * .32, w * .84, h * .32);
      g.beginPath(); g.moveTo(x - w * .52, fy - h * .3); g.lineTo(x + (R() - .5) * w * .1, fy - h * .62); g.lineTo(x + w * .52, fy - h * .3); g.closePath(); g.fill();
      if (lit){
        const gw = g.createRadialGradient(x, fy - h * .16, 0, x, fy - h * .16, w * .8);
        gw.addColorStop(0, 'rgba(240,170,90,.3)'); gw.addColorStop(1, 'rgba(240,170,90,0)');
        g.fillStyle = gw; g.fillRect(x - w, fy - h, w * 2, h * 1.2);
        g.fillStyle = 'rgba(250,190,110,.8)'; g.fillRect(x - w * .07, fy - h * .22, w * .14, h * .11);
      } else { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x - w * .07, fy - h * .22, w * .14, h * .11); }
    };
    hut(W * .1, hz + (gy - hz) * .7, W * .16, Hh * .17, false);
    hut(W * .3, hz + (gy - hz) * .3, W * .08, Hh * .09, true);
    hut(W * .68, hz + (gy - hz) * .35, W * .09, Hh * .1, false);
    hut(W * .9, hz + (gy - hz) * .75, W * .15, Hh * .16, false);
    // Stege zwischen den Hütten
    g.fillStyle = '#0a0d0e';
    g.fillRect(W * .15, hz + (gy - hz) * .7 - Hh * .076, W * .12, 2);
  }
  // Übereinandergeschobene Schiffe mit Masten und Tauen
  function paintShips(g, R, hz, gy){
    const hull = (x, base, w, h, tilt, col) => {
      g.save(); g.translate(x, base); g.rotate(tilt); g.fillStyle = col;
      g.beginPath(); g.moveTo(-w / 2, -h); g.lineTo(w / 2, -h * 1.15); g.quadraticCurveTo(w * .46, h * .1, w * .2, h * .2); g.lineTo(-w * .3, h * .2); g.quadraticCurveTo(-w * .5, 0, -w / 2, -h); g.fill();
      g.restore();
    };
    const mast = (x, base, h, tilt) => {
      g.strokeStyle = '#090c10'; g.lineWidth = Math.max(2, W * .007);
      const x1 = x + Math.sin(tilt) * h, y1 = base - Math.cos(tilt) * h;
      g.beginPath(); g.moveTo(x, base); g.lineTo(x1, y1); g.stroke();
      g.lineWidth = Math.max(1.5, W * .004);
      g.beginPath(); g.moveTo(x1 - Math.cos(tilt) * h * .2, y1 + h * .15); g.lineTo(x1 + Math.cos(tilt) * h * .2, y1 + h * .15 + Math.sin(tilt) * h * .4); g.stroke();
      return [x1, y1];
    };
    hull(W * .12, hz + (gy - hz) * .6, W * .34, Hh * .07, -.12, '#0e1318');
    hull(W * .2, hz + (gy - hz) * .25, W * .26, Hh * .05, .2, '#10161c');
    hull(W * .86, hz + (gy - hz) * .55, W * .36, Hh * .08, .1, '#0d1217');
    hull(W * .74, hz + (gy - hz) * .15, W * .2, Hh * .045, -.25, '#11171d');
    const tops = [mast(W * .1, hz + (gy - hz) * .5, Hh * .34, .12), mast(W * .26, hz + (gy - hz) * .2, Hh * .26, -.18), mast(W * .78, hz + (gy - hz) * .1, Hh * .3, .2), mast(W * .9, hz + (gy - hz) * .45, Hh * .4, -.08)];
    // Taue, gespannt wie ein Netz
    g.strokeStyle = 'rgba(150,160,170,.18)'; g.lineWidth = 1;
    for (let i = 0; i < tops.length; i++) for (let j = i + 1; j < tops.length; j++){
      const [a, b] = [tops[i], tops[j]];
      for (let k = 0; k < 3; k++){ const oy = k * Hh * .03; g.beginPath(); g.moveTo(a[0], a[1] + oy); g.quadraticCurveTo((a[0] + b[0]) / 2, Math.max(a[1], b[1]) + Hh * (.05 + k * .03), b[0], b[1] + oy); g.stroke(); }
    }
    tops.forEach(t => { for (let k = 0; k < 4; k++){ g.beginPath(); g.moveTo(t[0], t[1]); g.lineTo(t[0] + (R() - .5) * W * .2, gy - Hh * .02 * R()); g.stroke(); } });
  }
  // Ein Haus mit Giebel und Fenstern
  function house(g, R, x, base, w, h, col, lit){
    g.fillStyle = col;
    g.fillRect(x - w / 2, base - h, w, h + 2);
    g.beginPath(); g.moveTo(x - w * .56, base - h); g.lineTo(x, base - h - w * .55); g.lineTo(x + w * .56, base - h); g.closePath(); g.fill();
    if (R() < .5) g.fillRect(x + w * .18, base - h - w * .45, w * .1, w * .3);
    const rows = Math.max(1, Math.floor(h / (w * .45))), cols = w > 30 ? 2 : 1;
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++){
      const wx = x - w * (cols === 2 ? .22 : 0) + k * w * .44 - w * .07, wy = base - h + h * .12 + r * w * .45;
      const on = lit && R() < .18;
      g.fillStyle = on ? 'rgba(235,190,120,.55)' : 'rgba(0,0,0,.45)';
      g.fillRect(wx, wy, w * .14, w * .2);
      if (!on && R() < .3){ g.fillStyle = 'rgba(160,180,200,.06)'; g.fillRect(wx, wy, w * .14, w * .2); }
    }
    g.fillStyle = col;
  }
  // Velmora in der Ferne, hinter der Brücke
  function paintCityFar(g, R, hz){
    const base = hz + 2;
    g.fillStyle = 'rgba(22,29,38,.92)';
    for (let i = 0; i < 12; i++){ const x = W * (.52 + i * .045), h = Hh * (.03 + R() * .05); g.fillRect(x, base - h, W * .04, h); g.beginPath(); g.moveTo(x - 2, base - h); g.lineTo(x + W * .02, base - h - W * .025); g.lineTo(x + W * .042, base - h); g.fill(); }
    [[.62, .15], [.8, .2], [.93, .12]].forEach(([fx, fh]) => {
      const x = W * fx, h = Hh * fh, w = Math.max(6, W * .025);
      g.fillRect(x - w / 2, base - h, w, h);
      g.beginPath(); g.moveTo(x - w * .7, base - h); g.lineTo(x, base - h - w * 2.4); g.lineTo(x + w * .7, base - h); g.fill();
      g.fillStyle = 'rgba(230,210,170,.4)'; g.fillRect(x - 1, base - h * .7, 2, 3); g.fillStyle = 'rgba(22,29,38,.92)';
    });
    // Nebel davor
    const gr = g.createLinearGradient(0, base - Hh * .12, 0, base);
    gr.addColorStop(0, 'rgba(120,135,150,0)'); gr.addColorStop(1, 'rgba(120,135,150,.18)');
    g.fillStyle = gr; g.fillRect(W * .45, base - Hh * .12, W * .55, Hh * .12);
  }
  // Velmora von innen: Häuser zu beiden Seiten, hinten der Glockenturm
  function paintCityNear(g, s, R, hz, gy, A){
    const plaza = s.city === 'platz';
    // Glockenturm in der Ferne
    const tx = W * (plaza ? .3 : .56), th = Hh * .28, tw = Math.max(12, W * .045);
    g.fillStyle = 'rgba(24,31,40,.95)';
    g.fillRect(tx - tw / 2, hz - th, tw, th + 4);
    g.fillRect(tx - tw * .7, hz - th - tw * .2, tw * 1.4, tw * .25);
    g.beginPath(); g.moveTo(tx - tw * .6, hz - th - tw * .2); g.lineTo(tx, hz - th - tw * 2); g.lineTo(tx + tw * .6, hz - th - tw * .2); g.fill();
    g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.arc(tx, hz - th + tw * .5, tw * .28, Math.PI, 0); g.fill();
    // Häuserreihen
    const row = (from, to, base, hmin, hmax, col, lit) => {
      for (let x = from; x < to;){ const w = W * (.07 + R() * .06); house(g, R, x + w / 2, base, w, Hh * (hmin + R() * (hmax - hmin)), col, lit); x += w * (.96 + R() * .1); }
    };
    if (plaza){
      row(-W * .05, W * 1.05, hz + (gy - hz) * .45, .1, .16, '#10151c', true);
    } else {
      row(-W * .04, W * .34, hz + (gy - hz) * .55, .14, .24, '#0e1319', true);
      row(W * .7, W * 1.05, hz + (gy - hz) * .6, .15, .26, '#0e1319', true);
      row(W * .34, W * .7, hz + (gy - hz) * .1, .05, .09, '#131922', false);
    }
    // Wasser in den Gassen spiegelt schwach
    g.fillStyle = 'rgba(160,185,210,.05)';
    for (let i = 0; i < 18; i++) g.fillRect(R() * W, hz + (gy - hz) * (.6 + R() * .4), 10 + R() * 40, 1);
  }
  // Der Glockenturm von innen: Bögen, Brüstung, Balken
  function paintTurm(g, R, hz, gy, A){
    const stone = '#0b0e13';
    g.fillStyle = stone;
    g.beginPath(); g.rect(0, 0, W, gy + 2);
    const arch = (x0, x1, top, bot) => { const r = (x1 - x0) / 2; g.moveTo(x0, bot); g.lineTo(x0, top + r); g.arc(x0 + r, top + r, r, Math.PI, 0); g.lineTo(x1, bot); g.closePath(); };
    const bot = gy - Hh * .08;
    arch(W * .03, W * .29, Hh * .13, bot); arch(W * .36, W * .64, Hh * .1, bot); arch(W * .71, W * .97, Hh * .13, bot);
    g.fill('evenodd');
    // Steinfugen an den Pfeilern
    g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1;
    for (let y = Hh * .1; y < gy; y += Hh * .035){ [[W * .29, W * .36], [W * .64, W * .71]].forEach(([a, b]) => { g.beginPath(); g.moveTo(a, y); g.lineTo(b, y); g.stroke(); }); }
    g.strokeStyle = 'rgba(170,186,205,.1)'; g.lineWidth = 1.2;
    [[W * .03, W * .29, Hh * .13], [W * .36, W * .64, Hh * .1], [W * .71, W * .97, Hh * .13]].forEach(([a, b, t]) => { const r = (b - a) / 2; g.beginPath(); g.arc(a + r, t + r, r, Math.PI, 0); g.stroke(); });
    // Brüstung
    g.fillStyle = '#0e1218'; g.fillRect(0, bot, W, gy - bot + 2);
    g.fillStyle = 'rgba(170,186,205,.12)'; g.fillRect(0, bot, W, 1);
    // Balken, an dem die Glocke hängt
    g.fillStyle = '#07090c'; g.fillRect(0, Hh * .015, W, Hh * .03);
  }
  function paintRailing(g, gy, A){
    const top = gy - Hh * .07;
    g.fillStyle = '#0b0f14';
    g.fillRect(0, top, W, Hh * .012);
    for (let x = 4; x < W; x += Math.max(12, W * .035)){
      g.beginPath(); g.moveTo(x - 3, top + Hh * .012); g.quadraticCurveTo(x - 6, top + Hh * .035, x - 3, gy); g.lineTo(x + 3, gy); g.quadraticCurveTo(x + 6, top + Hh * .035, x + 3, top + Hh * .012); g.fill();
    }
    g.fillStyle = 'rgba(170,186,205,.12)'; g.fillRect(0, top, W, 1);
  }
  function paintAnvil(g, gy, A){
    const x = W / 2 - A * .43, s = Math.min(W, Hh) * .05;
    g.fillStyle = '#07090c';
    g.fillRect(x - s * .35, gy - s * .9, s * .7, s * .9);
    g.beginPath(); g.moveTo(x - s * .9, gy - s * 1.25); g.lineTo(x + s * .75, gy - s * 1.25); g.lineTo(x + s * .55, gy - s * .9); g.lineTo(x - s * .55, gy - s * .9);
    g.quadraticCurveTo(x - s * 1.3, gy - s * 1.05, x - s * .9, gy - s * 1.25); g.fill();
    g.fillStyle = 'rgba(170,186,205,.16)'; g.fillRect(x - s * .8, gy - s * 1.26, s * 1.5, 1);
  }
  // Salzgrube: Höhle aus Kristall
  function paintCave(g, s, R, hz, gy){
    let gr = g.createLinearGradient(0, 0, 0, gy);
    gr.addColorStop(0, '#05070a'); gr.addColorStop(.6, '#0c1117'); gr.addColorStop(1, '#141b22');
    g.fillStyle = gr; g.fillRect(0, 0, W, gy + 2);
    gr = g.createRadialGradient(W * .55, 0, 0, W * .55, 0, Hh * .7);
    gr.addColorStop(0, 'rgba(190,210,230,.16)'); gr.addColorStop(1, 'rgba(190,210,230,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, gy);
    const shard = (x, y, len, ang, w, a) => {
      const dx = Math.sin(ang), dy = -Math.cos(ang);
      g.fillStyle = `rgba(200,214,230,${a * .35})`; g.strokeStyle = `rgba(225,235,245,${a})`; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x - dy * w, y + dx * w); g.lineTo(x + dx * len, y + dy * len); g.lineTo(x + dy * w, y - dx * w); g.closePath(); g.fill(); g.stroke();
    };
    // von oben hängend
    for (let i = 0; i < 28; i++){ const x = R() * W; shard(x, -4, Hh * (.05 + R() * .16), Math.PI + (R() - .5) * .5, 3 + R() * 8, .08 + R() * .18); }
    // aus den Wänden
    for (let i = 0; i < 14; i++){ const y = Hh * (.1 + R() * .4); shard(-4, y, W * (.06 + R() * .1), Math.PI / 2 + (R() - .5) * .8, 3 + R() * 6, .1 + R() * .15); shard(W + 4, y, W * (.06 + R() * .1), -Math.PI / 2 + (R() - .5) * .8, 3 + R() * 6, .1 + R() * .15); }
    // hinterer Boden, der abfällt
    gr = g.createLinearGradient(0, hz, 0, gy);
    gr.addColorStop(0, '#0f141a'); gr.addColorStop(1, '#161d24');
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, gy + 2);
    for (let x = 0; x <= W; x += 10) g.lineTo(x, hz + Hh * .03 + Math.sin(x * .02) * Hh * .01 + R() * 3);
    g.lineTo(W, gy + 2); g.closePath(); g.fill();
    for (let i = 0; i < 16; i++){ const x = R() * W, y = hz + (gy - hz) * (.2 + R() * .7); for (let k = 0; k < 3; k++) shard(x + (k - 1) * 5, y, Hh * (.02 + R() * .05), (k - 1) * .35 + (R() - .5) * .2, 2 + R() * 3, .15 + R() * .2); }
  }
  // Brautkapelle: hohe Fenster, Säulen, Girlanden, Altar
  function paintKapelle(g, R, hz, gy, A){
    let gr = g.createLinearGradient(0, 0, 0, gy);
    gr.addColorStop(0, '#07090c'); gr.addColorStop(1, '#10141a');
    g.fillStyle = gr; g.fillRect(0, 0, W, gy + 2);
    // Fenster mit Mondlicht
    [[.2, .1], [.5, .06], [.8, .1]].forEach(([fx, top]) => {
      const x = W * fx, w = Math.max(24, W * .11), t = Hh * top, b = Hh * .44;
      g.save(); g.beginPath(); g.moveTo(x - w / 2, b); g.lineTo(x - w / 2, t + w / 2); g.arc(x, t + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w / 2, b); g.closePath(); g.clip();
      const lg = g.createLinearGradient(0, t, 0, b); lg.addColorStop(0, 'rgba(170,190,215,.32)'); lg.addColorStop(1, 'rgba(120,140,170,.12)');
      g.fillStyle = lg; g.fillRect(x - w, t, w * 2, b - t);
      g.strokeStyle = 'rgba(6,8,11,.95)'; g.lineWidth = Math.max(2, w * .06);
      g.beginPath(); g.moveTo(x, t); g.lineTo(x, b); g.moveTo(x - w, t + (b - t) * .45); g.lineTo(x + w, t + (b - t) * .45); g.stroke();
      g.lineWidth = 1; for (let k = 0; k < 5; k++){ g.beginPath(); g.moveTo(x - w, t + (b - t) * (.2 + k * .17) + (R() - .5) * 4); g.lineTo(x + w, t + (b - t) * (.22 + k * .17)); g.stroke(); }
      g.restore();
      g.strokeStyle = 'rgba(170,186,205,.12)'; g.lineWidth = 1; g.beginPath(); g.arc(x, t + w / 2, w / 2 + 3, Math.PI, 0); g.stroke();
    });
    // Säulen
    g.fillStyle = '#06080b';
    [.02, .35, .65, .98].forEach(fx => {
      const x = W * fx, w = Math.max(12, W * .045);
      g.fillRect(x - w / 2, 0, w, gy + 2);
      g.fillRect(x - w * .7, gy - Hh * .03, w * 1.4, Hh * .03);
      g.fillRect(x - w * .7, Hh * .05, w * 1.4, Hh * .02);
    });
    // Girlanden, schwarz vor Alter
    g.strokeStyle = '#05070a'; g.lineWidth = Math.max(2, W * .006);
    [[.02, .35], [.35, .65], [.65, .98]].forEach(([a, b]) => {
      const x0 = W * a, x1 = W * b, y = Hh * .16;
      g.beginPath(); g.moveTo(x0, y); g.quadraticCurveTo((x0 + x1) / 2, y + Hh * .09, x1, y); g.stroke();
      g.fillStyle = '#05070a';
      for (let k = 1; k < 8; k++){ const u = k / 8, x = lerp(x0, x1, u), yy = y + 4 * u * (1 - u) * Hh * .09 * .5 * 2; g.beginPath(); g.arc(x, yy + 3, 3 + R() * 3, 0, TAU); g.fill(); }
    });
    // Altar mit Kerzenstümpfen
    const ax = W / 2, aw = Math.max(50, A * .26), ah = Hh * .06;
    g.fillStyle = '#0a0d11'; g.fillRect(ax - aw / 2, gy - ah, aw, ah + 2);
    g.fillStyle = '#12161c'; g.fillRect(ax - aw * .56, gy - ah - 3, aw * 1.12, 4);
    g.fillStyle = 'rgba(200,190,170,.35)';
    [-.4, -.25, .3, .42].forEach(k => g.fillRect(ax + aw * k - 2, gy - ah - 3 - 7 - R() * 4, 4, 8));
    g.fillStyle = 'rgba(170,186,205,.1)'; g.fillRect(ax - aw * .56, gy - ah - 3, aw * 1.12, 1);
  }
  // Turmtreppe: gewundene Stufen, Mauerwerk, schmale Fenster
  function paintTreppe(g, R, hz, gy, A){
    g.fillStyle = '#0b0e12'; g.fillRect(0, 0, W, gy + 2);
    // Mauerwerk
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1;
    for (let r = 0, y = 0; y < gy; r++, y += Hh * .035){
      g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
      const off = r % 2 ? Hh * .04 : 0;
      for (let x = -off; x < W; x += Hh * .08){ g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + Hh * .035); g.stroke(); }
    }
    g.fillStyle = 'rgba(160,175,195,.035)';
    for (let i = 0; i < 40; i++) g.fillRect(R() * W, R() * gy, Hh * .07, Hh * .03);
    // Rundung: dunkler zu den Seiten
    const gr = g.createLinearGradient(0, 0, W, 0);
    gr.addColorStop(0, 'rgba(0,0,0,.65)'); gr.addColorStop(.35, 'rgba(0,0,0,0)'); gr.addColorStop(.65, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.65)');
    g.fillStyle = gr; g.fillRect(0, 0, W, gy + 2);
    // Schmale Fenster
    [[.2, .12], [.62, .05]].forEach(([fx, fy]) => {
      const x = W * fx, y = Hh * fy, w = Math.max(6, W * .018), h = Hh * .12;
      g.fillStyle = 'rgba(150,170,200,.28)'; g.beginPath(); g.moveTo(x - w / 2, y + h); g.lineTo(x - w / 2, y + w / 2); g.arc(x, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w / 2, y + h); g.fill();
    });
    // Stufen, die sich an der Wand rechts nach oben winden
    const n = 13, x0 = W * 1.02, y0 = gy - Hh * .015, x1 = W * .5, y1 = Hh * .1, th = Hh * .05;
    const pts = [];
    for (let i = 0; i <= n; i++) pts.push([lerp(x0, x1, i / n), lerp(y0, y1, i / n)]);
    g.fillStyle = '#06080b';
    g.beginPath(); g.moveTo(x0, y0 + th);
    g.lineTo(x0, y0);
    for (let i = 1; i <= n; i++){ g.lineTo(pts[i][0], pts[i - 1][1]); g.lineTo(pts[i][0], pts[i][1]); }
    g.lineTo(x1 - W * .02, y1); g.lineTo(x1 - W * .02, y1 + th * .7); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(170,186,205,.14)'; g.lineWidth = 1;
    for (let i = 1; i <= n; i++){ g.beginPath(); g.moveTo(pts[i - 1][0], pts[i - 1][1]); g.lineTo(pts[i][0], pts[i - 1][1]); g.stroke(); }
    // Geländer mit Stäben
    g.strokeStyle = '#06080b'; g.lineWidth = Math.max(2, W * .006);
    g.beginPath(); g.moveTo(x0, y0 - Hh * .07); g.lineTo(x1, y1 - Hh * .07); g.stroke();
    g.lineWidth = Math.max(1, W * .003);
    for (let i = 1; i <= n; i += 1){ const [x, y] = pts[i]; g.beginPath(); g.moveTo(x + W * .01, y + (y0 - y1) / n * .5); g.lineTo(x + W * .01, y - Hh * .07 + (y0 - y1) / n * .5); g.stroke(); }
    g.fillStyle = '#06080b'; g.fillRect(W * .78, gy - Hh * .02, W * .3, Hh * .02 + 2);
    // Torbogen links, ins Dunkel
    const dx = W * .1, dw = Math.max(26, W * .1), dh = Hh * .2;
    g.fillStyle = '#030405'; g.beginPath(); g.moveTo(dx - dw / 2, gy); g.lineTo(dx - dw / 2, gy - dh + dw / 2); g.arc(dx, gy - dh + dw / 2, dw / 2, Math.PI, 0); g.lineTo(dx + dw / 2, gy); g.fill();
  }
  function paintGround(g, s, R, gy){
    const pal = { stein: ['#11151b', '#050608'], planken: ['#15130f', '#050504'], salz: ['#1b2127', '#07090b'], kies: ['#0d1116', '#050608'], fels: ['#0d1116', '#050608'] }[s.ground];
    const gr = g.createLinearGradient(0, gy, 0, Hh);
    gr.addColorStop(0, pal[0]); gr.addColorStop(1, pal[1]);
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(0, Hh);
    if (s.ground === 'kies' || s.ground === 'fels') for (let x = 0; x <= W + 8; x += 8) g.lineTo(x, gy - (s.ground === 'fels' ? 3 + Math.sin(x * .03) * 3 : 1) - R() * 2);
    else { g.lineTo(0, gy); g.lineTo(W, gy); }
    g.lineTo(W, Hh); g.closePath(); g.fill();
    g.fillStyle = s.ground === 'salz' ? 'rgba(220,230,240,.22)' : 'rgba(170,186,205,.13)'; g.fillRect(0, gy - 1, W, 1);
    if (s.ground === 'stein'){
      g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1;
      for (let row = 0; row < 5; row++){
        const y = gy + 6 + row * row * 9 + row * 10, off = row % 2 ? 22 : 0, step = 46 + row * 22;
        g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
        for (let x = -off; x < W; x += step){ g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 8 + row * 9); g.stroke(); }
      }
    } else if (s.ground === 'planken'){
      g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1.2;
      for (let row = 0; row < 7; row++){
        const y = gy + 4 + row * row * 5 + row * 8;
        g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
        for (let x = (row * 37) % 90; x < W; x += 90 + row * 30){ g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 6 + row * 5); g.stroke(); }
      }
      g.fillStyle = 'rgba(190,170,140,.04)';
      for (let i = 0; i < 60; i++){ const y = gy + 3 + Math.pow(R(), 1.5) * (Hh - gy); g.fillRect(R() * W, y, 12 + R() * 30, 1); }
    } else if (s.ground === 'salz'){
      for (let i = 0; i < 320; i++){
        const y = gy + 2 + Math.pow(R(), 1.6) * (Hh - gy), x = R() * W, r = .4 + (y - gy) / (Hh - gy) * 1.6;
        g.fillStyle = `rgba(220,232,242,${.04 + R() * .1})`; g.fillRect(x, y, r * 1.6, r);
      }
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1;
      for (let i = 0; i < 9; i++){ let x = R() * W, y = gy + 4 + R() * (Hh - gy) * .6; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++){ x += (R() - .5) * 50; y += R() * 14; g.lineTo(x, y); } g.stroke(); }
    } else {
      for (let i = 0; i < 260; i++){
        const y = gy + 3 + Math.pow(R(), 1.6) * (Hh - gy), x = R() * W, r = .6 + (y - gy) / (Hh - gy) * 2.6;
        g.fillStyle = `rgba(150,165,185,${.03 + R() * .07})`;
        g.beginPath(); g.ellipse(x, y, r * 1.5, r, 0, 0, TAU); g.fill();
      }
    }
  }

  /* ---------- Bewegte Teile ---------- */
  function seedAmb(){
    amb.length = 0;
    for (let i = 0; i < 46; i++) amb.push({ x: rnd(), y: rnd(), s: .4 + rnd() * 1.4, v: .004 + rnd() * .012, ph: rnd() * TAU });
  }
  function drawSea(ctx, t){
    const s = SC[scene]; if (!s.sea) return;
    const hz = horizon(), gy = groundY(), amp = s.calm ? .35 : 1;
    ctx.lineWidth = 1;
    for (let r = 1; r < 16; r++){
      const u = Math.pow(r / 16, 1.7), y = hz + (gy - hz) * u;
      ctx.strokeStyle = `rgba(175,195,215,${(.03 + u * .09) * (s.calm ? .7 : 1)})`;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 14){
        const yy = y + Math.sin(x * (.02 / (u + .2)) + t * .0009 * (1 + r * .1) * amp + r) * (1 + u * 2.5) * amp;
        x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
      }
      ctx.stroke();
    }
    // Schaum an der Kante
    if (s.calm || s.turm) return;
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
  function firePos(){ return [W / 2 + arenaW() * .06, groundY()]; }
  function drawFire(ctx, t){
    const s = SC[scene]; if (!s.fire) return;
    const [x, gy] = firePos(), sz = Math.min(W, Hh) * .062, brunnen = s.fire === 'brunnen';
    // Lichtschein
    let g = ctx.createRadialGradient(x, gy - sz, 0, x, gy - sz, sz * 9);
    g.addColorStop(0, 'rgba(227,154,85,.28)'); g.addColorStop(1, 'rgba(227,154,85,0)');
    ctx.fillStyle = g; ctx.fillRect(x - sz * 9, gy - sz * 10, sz * 18, sz * 12);
    let top = gy - sz * 1.3;
    if (brunnen){
      // Brunnen: breite Steinschale, Wasser läuft über den Rand, die Glut glimmt darunter
      ctx.fillStyle = '#07090c';
      ctx.fillRect(x - sz * .3, gy - sz * 1.1, sz * .6, sz * 1.1);
      ctx.beginPath(); ctx.ellipse(x, gy, sz * 1.9, sz * .3, 0, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - sz * 1.5, gy - sz * 1.45); ctx.lineTo(x + sz * 1.5, gy - sz * 1.45); ctx.quadraticCurveTo(x + sz * 1.2, gy - sz * .9, x + sz * .35, gy - sz * .95); ctx.lineTo(x - sz * .35, gy - sz * .95); ctx.quadraticCurveTo(x - sz * 1.2, gy - sz * .9, x - sz * 1.5, gy - sz * 1.45); ctx.fill();
      ctx.strokeStyle = 'rgba(170,190,210,.18)'; ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++){
        const sx = x + (i - 2.5) * sz * .55, ph = (t * .002 + i * .37) % 1;
        ctx.globalAlpha = .6; ctx.beginPath(); ctx.moveTo(sx, gy - sz * 1.42); ctx.quadraticCurveTo(sx + (i - 2.5) * 3, gy - sz * .9, sx + (i - 2.5) * 5, gy - sz * .1); ctx.stroke();
        ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(200,220,235,.35)'; ctx.fillRect(sx + (i - 2.5) * 5 * ph, gy - sz * 1.42 + sz * 1.3 * ph, 1.5, 3);
      }
      top = gy - sz * 1.5;
    } else {
      // Eiserne Schale
      ctx.fillStyle = '#07090c';
      ctx.fillRect(x - sz * .12, gy - sz * 1.1, sz * .24, sz * 1.1);
      ctx.beginPath(); ctx.moveTo(x - sz * .9, gy - sz * 1.3); ctx.lineTo(x + sz * .9, gy - sz * 1.3); ctx.lineTo(x + sz * .45, gy - sz * .85); ctx.lineTo(x - sz * .45, gy - sz * .85); ctx.closePath(); ctx.fill();
    }
    // Flammen
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const fl = brunnen ? .6 : 1;
    for (let i = 0; i < 7; i++){
      const ph = t * .006 + i * 1.7, fx = x + Math.sin(ph * .7 + i) * sz * .35 * (brunnen ? 2 : 1), h = sz * fl * (1 + .6 * Math.sin(ph) + (i % 3) * .3);
      const fy = top - sz * .1 - h * .3;
      g = ctx.createRadialGradient(fx, fy, 0, fx, fy, h * .8);
      g.addColorStop(0, 'rgba(255,218,160,.65)'); g.addColorStop(.5, 'rgba(235,135,60,.32)'); g.addColorStop(1, 'rgba(180,60,20,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(fx, fy, h * .35, h * .8, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
    if (rnd() < .25) parts.push({ x: x + (rnd() - .5) * sz, y: top - sz * .3, vx: (rnd() - .5) * .02, vy: -.03 - rnd() * .04, life: 0, max: 1600 + rnd() * 1400, size: 1 + rnd() * 1.4, col: '255,170,90', g: 0, add: true, drag: .999 });
  }
  // Kleine bewegte Dinge je nach Ort
  function drawExtra(ctx, t){
    const s = SC[scene], hz = horizon(), gy = groundY(), A = arenaW();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (s.glimmer){
      // Mondtau am Grund der Bucht
      for (let i = 0; i < 7; i++){
        const x = W * (.3 + ((i * .137) % .45)), y = hz + (gy - hz) * (.45 + (i % 3) * .16), a = .1 + .08 * Math.sin(t * .0015 + i * 2);
        const g = ctx.createRadialGradient(x, y, 0, x, y, 18 + i * 2);
        g.addColorStop(0, `rgba(140,200,255,${a})`); g.addColorStop(1, 'rgba(140,200,255,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 30, y - 12, 60, 24);
      }
    }
    if (s.cave){
      for (let i = 0; i < 12; i++){
        const k = (t * .0004 + i * .618) % 1, x = W * ((i * .381) % 1), y = Hh * (.05 + ((i * .271) % .5)), a = Math.sin(k * Math.PI);
        ctx.fillStyle = `rgba(230,240,255,${a * .8})`;
        ctx.fillRect(x - .5, y - 4 * a, 1, 8 * a); ctx.fillRect(x - 4 * a, y - .5, 8 * a, 1);
      }
    }
    if (s.inside === 'kapelle'){
      // Mondlicht fällt schräg durch die Fenster
      [[.2, .1], [.5, .06], [.8, .1]].forEach(([fx, top], i) => {
        const x = W * fx, w = Math.max(24, W * .11), a = .045 + .015 * Math.sin(t * .0007 + i);
        const g = ctx.createLinearGradient(0, Hh * top, 0, gy);
        g.addColorStop(0, `rgba(170,190,220,${a})`); g.addColorStop(1, 'rgba(170,190,220,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - w / 2, Hh * .2); ctx.lineTo(x + w / 2, Hh * .2); ctx.lineTo(x + w * 1.3, gy); ctx.lineTo(x - w * .1, gy); ctx.closePath(); ctx.fill();
      });
      // Kerzen auf dem Altar
      const aw = Math.max(50, A * .26), ah = Hh * .06;
      [-.4, -.25, .3, .42].forEach((k, i) => {
        const x = W / 2 + aw * k, y = gy - ah - 16 + Math.sin(t * .01 + i) * .8, r = 5 + Math.sin(t * .013 + i * 3) * 1;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
        g.addColorStop(0, 'rgba(255,210,150,.55)'); g.addColorStop(1, 'rgba(255,160,80,0)');
        ctx.fillStyle = g; ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
        ctx.fillStyle = 'rgba(255,230,180,.8)'; ctx.beginPath(); ctx.ellipse(x, y, 1.4, 3, 0, 0, TAU); ctx.fill();
      });
    }
    ctx.restore();
    if (s.turm) drawBell(ctx, t, A);
  }
  // Die große Glocke im Turm. World.bell(1) lässt sie schwingen.
  function drawBell(ctx, t, A){
    bellSwing += (bellT - bellSwing) * .02;
    bellPh += .0015 + bellSwing * .002;
    const ang = Math.sin(bellPh * 1.4) * (.03 + bellSwing * .22), px = W / 2 + A * .06, py = Hh * .03, bw = Math.max(90, A * .5), bh = bw * .9;
    ctx.save(); ctx.translate(px, py); ctx.rotate(ang);
    ctx.fillStyle = '#080a0d';
    ctx.fillRect(-bw * .05, 0, bw * .1, bh * .12);
    ctx.beginPath(); ctx.moveTo(-bw * .2, bh * .12); ctx.quadraticCurveTo(-bw * .28, bh * .15, -bw * .3, bh * .45);
    ctx.quadraticCurveTo(-bw * .34, bh * .8, -bw * .52, bh); ctx.lineTo(bw * .52, bh); ctx.quadraticCurveTo(bw * .34, bh * .8, bw * .3, bh * .45);
    ctx.quadraticCurveTo(bw * .28, bh * .15, bw * .2, bh * .12); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(190,205,220,.2)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(190,205,220,.12)'; ctx.lineWidth = 1;
    [.55, .62, .9].forEach(k => { ctx.beginPath(); ctx.moveTo(-bw * (.31 + (k - .5) * .45), bh * k); ctx.lineTo(bw * (.31 + (k - .5) * .45), bh * k); ctx.stroke(); });
    ctx.fillStyle = '#050608'; ctx.beginPath(); ctx.ellipse(0, bh, bw * .52, bh * .06, 0, 0, TAU); ctx.fill();
    ctx.restore();
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
    drawSea(ctx, t);
    ctx.drawImage(mid, 0, 0, W, Hh);
    ctx.fillStyle = '#050608'; ctx.fillRect(0, Hh - 1, W, Hh);
    const s = SC[scene];
    drawFog(ctx, t, s.fogwall ? 1.6 : s.fog || 1);
    drawFire(ctx, t);
    drawExtra(ctx, t);
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
  function reset(){ clearFx(); flood = floodT = sceneFlood(); tint = tintT = 0; bellT = 0; }
  function bell(v){ bellT = v; }
  return { resize, set, scene: () => scene, horizon, groundY, arenaW, drawBack, drawFront, drawOver, drawGhosts, updateFx, camShake,
    burst, glutFlow, ring, pop, ghost, shake, flash, wave, bell, sceneFlood, setFlood, setTint, setSlow, setCam, camY: () => camY, clearFx, reset, firePos, size: () => [W, Hh] };
})();
