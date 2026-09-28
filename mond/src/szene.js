/* =====================================================================
   SZENE: Kamera, Hintergrundebenen, Gelände, Wasser, Licht, Wetter
   Alles in der Welt liegt in Weltkoordinaten (eine Kachel = T Einheiten).
   Die Kamera rechnet sie auf den Bildschirm um. Der Name World bleibt,
   weil Kampf und Ablauf ihn schon immer benutzen.
   ===================================================================== */
const World = (() => {
  let W = 1, Hh = 1, dpr = 1, G = null, TH = null, themeKey = '';
  const cam = { x: 0, y: 0, z: 1, tx: 0, ty: 0, tz: 1, mode: 'follow', ease: .006, sx: 0, sy: 0 };
  let baseZ = 1;
  let flood = 0, floodT = 0, floodY = 0, tint = 0, tintT = 0, slowA = 0, slowOn = false, shakeP = 0, flashC = '#fff', flashA = 0;
  let letter = 0, letterT = 0, dunkel = 0, dunkelT = 0, bellSwing = 0, bellT = 0, bellPh = 0;
  const parts = [], rings = [], pops = [], ghosts = [], waves = [], wetter = [];
  const cache = {};
  let lights = [], dynLights = [];

  /* ---------- Bildschirm und Kamera ---------- */
  function resize(w, h, r){
    W = w; Hh = h; dpr = r;
    baseZ = clamp(Math.min(W / ((Hh > W * 1.15 ? 15 : 18) * T), Hh / (12 * T)), .8, 2.2);
    for (const k in cache) delete cache[k];
    if (TH) bauEbenen();
  }
  const size = () => [W, Hh];
  const zoomBase = () => baseZ;
  function setArea(g){
    G = g; TH = THEMEN[g.def.thema] || THEMEN.strand;
    themeKey = g.def.thema;
    for (const k in cache) delete cache[k];
    bauEbenen();
    lights = [];
    wetter.length = 0;
    dunkelT = dunkel = TH.dunkel || 0;
    RIM = TH.rimFig || 'rgba(176,196,214,.5)';
    floodT = flood = 0;
  }
  const area = () => G;
  const theme = () => TH;
  function setLights(list){ lights = list; }
  function dynLight(l){ dynLights.push(l); }
  // Kamera folgt einem Punkt (Füße des Helden), mit Blick nach vorn
  function follow(x, y, face, now){
    if (cam.mode !== 'follow') return;
    const portrait = Hh > W * 1.15;
    cam.tz = baseZ;
    cam.tx = x + face * T * (portrait ? 1.6 : 3);
    cam.ty = y - T * 2 + (portrait ? Hh * .03 / cam.tz : 0);
    if (now){ cam.x = cam.tx; cam.y = cam.ty; cam.z = cam.tz; }
  }
  function focus(x, y, zMul, ease = .004){ cam.mode = 'focus'; cam.tx = x; cam.ty = y; cam.tz = baseZ * zMul; cam.ease = ease; }
  function release(){ cam.mode = 'follow'; cam.ease = .006; }
  function clampCam(){
    if (!G) return;
    const hw = W / 2 / cam.z, hh = Hh / 2 / cam.z;
    if (G.W > hw * 2) cam.x = clamp(cam.x, hw, G.W - hw); else cam.x = G.W / 2;
    // Unter der Karte ist alles Fels: höchstens ein Stück davon zeigen
    cam.y = Math.min(cam.y, G.Hh + hh * .35);
  }
  function stepCam(dt){
    const k = 1 - Math.pow(1 - cam.ease, dt);
    cam.x += (cam.tx - cam.x) * k; cam.y += (cam.ty - cam.y) * k * 1.2; cam.z += (cam.tz - cam.z) * k * .8;
    if (cam.mode === 'follow') clampCam();
  }
  const toScreen = (x, y) => [(x - cam.x) * cam.z + W / 2 + cam.sx, (y - cam.y) * cam.z + Hh / 2 + cam.sy];
  const view = () => { const hw = W / 2 / cam.z, hh = Hh / 2 / cam.z; return [cam.x - hw, cam.y - hh, cam.x + hw, cam.y + hh]; };

  /* ---------- Hintergrund: vorgemalte Streifen, die sich wiederholen ---------- */
  function mulb(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function canvas(w, h, scale = 1){
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * scale)); c.height = Math.max(1, Math.round(h * scale));
    const g = c.getContext('2d'); g.scale(scale, scale); g.lineCap = 'round'; g.lineJoin = 'round';
    return [c, g];
  }
  function bauEbenen(){
    // Himmel: ein Verlauf in Bildschirmhöhe
    const [sc, sg] = canvas(8, 256);
    const gr = sg.createLinearGradient(0, 0, 0, 256);
    TH.himmel.forEach((c, i) => gr.addColorStop(i / (TH.himmel.length - 1), c));
    sg.fillStyle = gr; sg.fillRect(0, 0, 8, 256);
    cache.himmel = sc;
    // Sterne und Mondnarbe
    const [nc, ng] = canvas(1024, 512);
    const R = mulb(11 + themeKey.length);
    for (let i = 0; i < 90; i++){ ng.fillStyle = `rgba(214,224,238,${.04 + R() * .2})`; ng.fillRect(R() * 1024, R() * 420, R() < .1 ? 2 : 1, R() < .1 ? 2 : 1); }
    if (TH.mond !== false){
      const cx = 700, cy = -60, rad = 330;
      ng.strokeStyle = 'rgba(214,224,238,.05)'; ng.lineWidth = 18; ng.beginPath(); ng.arc(cx, cy, rad, .18 * Math.PI, .92 * Math.PI); ng.stroke();
      ng.strokeStyle = 'rgba(214,224,238,.16)'; ng.lineWidth = 1.5; ng.beginPath(); ng.arc(cx, cy, rad, .2 * Math.PI, .9 * Math.PI); ng.stroke();
      for (let i = 0; i < 9; i++){
        const a = (.24 + i * .075 + R() * .03) * Math.PI; let x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
        ng.strokeStyle = `rgba(214,224,238,${.05 + R() * .1})`; ng.lineWidth = 1; ng.beginPath(); ng.moveTo(x, y);
        for (let k = 0; k < 3; k++){ x += Math.cos(a) * (8 + R() * 18) + (R() - .5) * 10; y += Math.sin(a) * (8 + R() * 18) + (R() - .5) * 10; ng.lineTo(x, y); }
        ng.stroke();
      }
    }
    cache.nacht = nc;
    // Ebenen
    cache.ebenen = (TH.ebenen || []).map((E, i) => {
      const w = E.w || 1600, h = E.h || 560;
      const [c, g] = canvas(w, h, Math.min(dpr, 1.5));
      E.male(g, w, h, mulb(97 + i * 31 + themeKey.length), TH);
      return { c, w, h, par: E.par, base: E.base == null ? .72 : E.base, dy: E.dy || 0, unten: E.unten, voll: E.voll || TH.voll };
    });
    // Vignette
    const [vc, vg] = canvas(256, 256);
    const vgr = vg.createRadialGradient(128, 118, 60, 128, 118, 190);
    vgr.addColorStop(0, 'rgba(0,0,0,0)'); vgr.addColorStop(1, 'rgba(0,0,0,.72)');
    vg.fillStyle = vgr; vg.fillRect(0, 0, 256, 256);
    cache.vignette = vc;
    // Körnung
    const [kc, kg] = canvas(160, 160);
    const id = kg.createImageData(160, 160);
    for (let i = 0; i < id.data.length; i += 4){ const v = rnd() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 20; }
    kg.putImageData(id, 0, 0);
    cache.korn = kc;
  }
  // Der Himmelsverlauf endet am Horizont, darüber und darunter geht es einfarbig weiter
  function drawHimmel(ctx, hy){
    const top = hy - Hh * 1.05, H2 = Hh * 1.05, cols = TH.himmel;
    ctx.fillStyle = cols[0]; ctx.fillRect(0, 0, W, Math.max(0, top) + 1);
    ctx.drawImage(cache.himmel, 0, top, W, H2);
    ctx.fillStyle = cols[cols.length - 1]; ctx.fillRect(0, hy - 1, W, Math.max(0, Hh - hy + 1));
    if (TH.dunst){
      const g = ctx.createRadialGradient(W * .56, hy, 0, W * .56, hy, Math.max(W, Hh) * .8);
      g.addColorStop(0, TH.dunst); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh);
    }
    const ox = -((cam.x * .02) % 1024 + 1024) % 1024;
    for (let x = ox; x < W; x += 1024) ctx.drawImage(cache.nacht, x, Math.min(0, hy - 560));
  }
  function horizontY(){ return G ? (G.def.horizont || G.Hh * .6) : 0; }
  function drawEbenen(ctx){
    const hwY = horizontY();
    for (const E of cache.ebenen){
      const s = 1 + (cam.z / baseZ - 1) * E.par * .6;
      // Die Grundlinie der Ebene folgt dem Horizont, abgeschwächt nach Tiefe
      const y0 = Hh / 2 + (hwY - cam.y) * baseZ * (E.par * .85 + .15) + E.dy * baseZ;
      const w = E.w * s, h = E.h * s, top = y0 - E.base * h;
      const off = -(((cam.x * baseZ * E.par) % w) + w) % w;
      if (E.voll){
        // Höhlen und Innenräume: die Ebene füllt den ganzen Bildschirm, auch senkrecht
        const offY = -(((cam.y * baseZ * E.par) % h) + h) % h;
        for (let y = offY - h; y < Hh; y += h) for (let x = off - w; x < W; x += w) ctx.drawImage(E.c, x, y, w + .5, h + .5);
        continue;
      }
      for (let x = off - w; x < W; x += w) ctx.drawImage(E.c, x, top, w + .5, h);
      if (E.unten && top + h < Hh){ ctx.fillStyle = E.unten; ctx.fillRect(0, top + h - 1, W, Hh - top - h + 1); }
    }
  }

  /* ---------- Gelände ---------- */
  function drawGelaende(ctx, t){
    const F = G.F;
    const [x0, y0, x1, y1] = view();
    // Rückwände von Höhlen und Innenräumen
    if (G.hinten.length){
      ctx.fillStyle = TH.wand || '#0b0e13';
      for (const r of G.hinten) ctx.fillRect(r[0], r[1], r[2] - r[0], r[3] - r[1]);
      if (TH.wandMuster) TH.wandMuster(ctx, G, [x0, y0, x1, y1], t);
    }
    // Stege
    for (const [sx, sy, ex] of F.stege){
      if (ex < x0 || sx > x1) continue;
      ctx.fillStyle = '#0a0b0d'; ctx.fillRect(sx, sy + 2, ex - sx, 7);
      ctx.strokeStyle = '#0a0b0d'; ctx.lineWidth = 3;
      for (let x = sx + 10; x < ex; x += 36){ ctx.beginPath(); ctx.moveTo(x, sy + 8); ctx.lineTo(x - 6, sy + 30); ctx.stroke(); }
      ctx.fillStyle = TH.rim; ctx.globalAlpha = .35; ctx.fillRect(sx, sy + 2, ex - sx, 1); ctx.globalAlpha = 1;
    }
    // Leitern
    ctx.strokeStyle = '#0b0c0f';
    for (const [lx, ly0, ly1] of F.leitern){
      if (lx + T < x0 || lx > x1) continue;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(lx + 5, ly0 - 6); ctx.lineTo(lx + 5, ly1); ctx.moveTo(lx + T - 5, ly0 - 6); ctx.lineTo(lx + T - 5, ly1); ctx.stroke();
      ctx.lineWidth = 2.2;
      for (let y = ly0 + 6; y < ly1; y += 10){ ctx.beginPath(); ctx.moveTo(lx + 5, y); ctx.lineTo(lx + T - 5, y); ctx.stroke(); }
      ctx.strokeStyle = TH.rim; ctx.globalAlpha = .25; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(lx + 4, ly0 - 6); ctx.lineTo(lx + 4, ly1); ctx.stroke(); ctx.globalAlpha = 1; ctx.strokeStyle = '#0b0c0f';
    }
    // Feste Formen, unter der Karte geht der Fels weiter
    ctx.fillStyle = TH.fels || '#06080b';
    ctx.fill(F.fels);
    ctx.fillRect(x0 - 50, G.Hh + T * 2, x1 - x0 + 100, Math.max(0, y1 - G.Hh));
    ctx.fillStyle = TH.holz || '#0a0908'; ctx.fill(F.holz);
    ctx.fillStyle = TH.mauer || '#090b0e'; ctx.fill(F.mauer);
    ctx.save();
    ctx.globalAlpha = .5; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1; ctx.stroke(F.fugen);
    ctx.globalAlpha = 1;
    // Lichtschein innen an der Oberkante, dann die helle Kante selbst
    const clip = new Path2D(); clip.addPath(F.fels); clip.addPath(F.mauer); clip.addPath(F.holz);
    ctx.clip(clip);
    ctx.strokeStyle = TH.rim; ctx.globalAlpha = .035; ctx.lineWidth = 110; ctx.stroke(F.kante);
    ctx.globalAlpha = .04; ctx.lineWidth = 56; ctx.stroke(F.kante);
    ctx.globalAlpha = .1; ctx.lineWidth = 22; ctx.stroke(F.kante);
    ctx.globalAlpha = .12; ctx.lineWidth = 7; ctx.stroke(F.kante);
    ctx.globalAlpha = .06; ctx.lineWidth = 6; ctx.stroke(F.kanteSeiten);
    ctx.restore();
    ctx.strokeStyle = TH.rim; ctx.globalAlpha = .8; ctx.lineWidth = 1.4 / cam.z; ctx.stroke(F.kante);
    ctx.globalAlpha = .25; ctx.lineWidth = 1 / cam.z; ctx.stroke(F.kanteSeiten);
    ctx.globalAlpha = 1;
    // Brüchige Wände: Risse
    ctx.strokeStyle = 'rgba(170,186,205,.22)'; ctx.lineWidth = 1;
    for (const b of F.brueche){
      for (let y = b.y0 + 8; y < b.y1; y += 18){ ctx.beginPath(); ctx.moveTo(b.x + 4, y); ctx.lineTo(b.x + 12, y + 6); ctx.lineTo(b.x + 8, y + 12); ctx.lineTo(b.x + 18, y + 16); ctx.stroke(); }
    }
    // Stacheln
    for (const [sx, sy, ex] of F.stacheln){
      if (ex < x0 || sx > x1) continue;
      for (let x = sx + 3; x < ex; x += 8){
        const h = 12 + hash2(x, sy) * 10;
        ctx.fillStyle = TH.stachel || 'rgba(220,232,242,.85)';
        ctx.beginPath(); ctx.moveTo(x - 4, sy + T); ctx.lineTo(x + (hash2(sy, x) - .5) * 4, sy + T - h); ctx.lineTo(x + 4, sy + T); ctx.fill();
      }
    }
    // Gitter
    for (const g of G.gitter){
      if (g.offen) g.auf = Math.min(1, g.auf + .02);
      const lift = g.auf * (g.y1 - g.y0 - 6);
      ctx.strokeStyle = '#08090b'; ctx.lineWidth = 3;
      for (let x = g.x + 4; x < g.x + T; x += 8){ ctx.beginPath(); ctx.moveTo(x, g.y0 - lift); ctx.lineTo(x, g.y1 - lift); ctx.stroke(); }
      ctx.lineWidth = 4; for (let y = g.y0 + 10; y < g.y1; y += 30){ ctx.beginPath(); ctx.moveTo(g.x + 1, y - lift); ctx.lineTo(g.x + T - 1, y - lift); ctx.stroke(); }
      ctx.strokeStyle = TH.rim; ctx.globalAlpha = .3; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(g.x + 3, g.y0 - lift); ctx.lineTo(g.x + 3, g.y1 - lift); ctx.stroke(); ctx.globalAlpha = 1;
    }
    // Pflanzen und Kristalle entlang der Oberkanten
    if (TH.kantenDeko) TH.kantenDeko(ctx, F.kanten, [x0, y0, x1, y1], t);
  }

  /* ---------- Wasser ---------- */
  function drawWasser(ctx, t, spiegel){
    const [x0, , x1] = view();
    const welle = x => Math.sin(x * .05 + t * .002) * 1.4 + Math.sin(x * .013 - t * .0011) * 1.2;
    for (const r of G.wasser){
      if (r.x1 < x0 || r.x0 > x1) continue;
      // Umriss des Beckens: oben die Welle, unten der Grund jeder Spalte
      const sp = r.spalten, n = sp.length;
      const umriss = new Path2D();
      let erst = true;
      for (let i = 0; i < n; i++){
        const c = sp[i]; if (!c) continue;
        const xa = r.x0 + i * T;
        for (let k = 0; k <= 3; k++){ const xx = xa + k * T / 3, yy = c[0] + 6 + welle(xx); if (erst){ umriss.moveTo(xx, yy); erst = false; } else umriss.lineTo(xx, yy); }
      }
      for (let i = n - 1; i >= 0; i--){ const c = sp[i]; if (!c) continue; const xa = r.x0 + i * T; umriss.lineTo(xa + T, c[1] + 1); umriss.lineTo(xa, c[1] + 1); }
      umriss.closePath();
      const top = r.y0 + 6;
      if (spiegel && r.x1 - r.x0 > T * 2){
        ctx.save(); ctx.clip(umriss);
        ctx.translate(0, top * 2); ctx.scale(1, -1); ctx.globalAlpha = .22;
        spiegel(ctx);
        ctx.restore();
      }
      const g = ctx.createLinearGradient(0, top, 0, Math.max(r.y1, top + T * 2));
      g.addColorStop(0, TH.wasser[0]); g.addColorStop(1, TH.wasser[1]);
      ctx.fillStyle = g; ctx.fill(umriss);
      ctx.strokeStyle = TH.wasserKante || 'rgba(200,225,235,.4)'; ctx.lineWidth = 1.1; ctx.beginPath();
      erst = true;
      for (let i = 0; i < n; i++){
        const c = sp[i]; if (!c || c[0] !== r.y0){ erst = true; continue; }
        const xa = r.x0 + i * T;
        for (let k = 0; k <= 3; k++){ const xx = xa + k * T / 3, yy = c[0] + 6 + welle(xx); if (erst){ ctx.moveTo(xx, yy); erst = false; } else ctx.lineTo(xx, yy); }
      }
      ctx.stroke();
      // Lichtflecken auf der Oberfläche
      ctx.fillStyle = 'rgba(210,230,240,.1)';
      for (let x = r.x0 + 10; x < r.x1; x += 42){ const k = (t * .0004 + hash2(x, r.y0)) % 1; ctx.fillRect(x + k * 20, top + 4 + hash2(r.y0, x) * 14, 8 + hash2(x, x) * 10, 1); }
    }
  }
  // Flut im Kampf: steigt über den Boden an der Kampfstelle
  function drawFlut(ctx, t){
    if (flood < .005) return;
    const [x0, , x1, y1] = view(), lv = floodY - flood * 20;
    const g = ctx.createLinearGradient(0, lv, 0, floodY + 60);
    g.addColorStop(0, `rgba(40,96,104,${.5 * Math.min(1, flood)})`); g.addColorStop(1, `rgba(8,20,24,${.8 * Math.min(1, flood)})`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, y1);
    for (let x = x0; x <= x1 + 10; x += 10) ctx.lineTo(x, lv + Math.sin(x * .03 + t * .003) * 2.5 + Math.sin(x * .011 - t * .0017) * 2);
    ctx.lineTo(x1 + 10, y1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(190,230,230,${.35 * Math.min(1, flood)})`; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let x = x0; x <= x1 + 10; x += 10){ const y = lv + Math.sin(x * .03 + t * .003) * 2.5 + Math.sin(x * .011 - t * .0017) * 2; x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
  }

  /* ---------- Licht ---------- */
  function glow(ctx, x, y, r, col, a){
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function drawLichter(ctx, t){
    const [x0, y0, x1, y1] = view();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const L of lights.concat(dynLights)){
      if (L.x + L.r < x0 || L.x - L.r > x1 || L.y + L.r < y0 || L.y - L.r > y1) continue;
      const fl = L.flacker ? .85 + .15 * Math.sin(t * .013 + L.x) * Math.sin(t * .031 + L.y) : 1;
      glow(ctx, L.x, L.y, L.r * fl, L.col, (L.a || .35) * fl);
    }
    ctx.restore();
  }
  // Dunkelheit in Höhlen und Innenräumen, mit Löchern um jedes Licht
  function drawDunkel(ctx){
    if (dunkel < .02) return;
    if (!cache.dunkel || cache.dunkel.w !== W){ const [c, g] = canvas(W / 2, Hh / 2); cache.dunkel = { c, g, w: W }; }
    const { c, g } = cache.dunkel;
    g.setTransform(.5, 0, 0, .5, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, W, Hh);
    g.fillStyle = `rgba(1,2,4,${dunkel})`; g.fillRect(0, 0, W, Hh);
    g.globalCompositeOperation = 'destination-out';
    for (const L of lights.concat(dynLights)){
      const [sx, sy] = toScreen(L.x, L.y), r = L.r * cam.z * (L.hell || 1.4);
      if (sx + r < 0 || sx - r > W || sy + r < 0 || sy - r > Hh) continue;
      const gr = g.createRadialGradient(sx, sy, 0, sx, sy, r);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(.5, 'rgba(0,0,0,.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(sx - r, sy - r, r * 2, r * 2);
    }
    ctx.drawImage(c, 0, 0, W, Hh);
  }

  /* ---------- Wetter und Schwebeteilchen ---------- */
  function wetterStep(dt, t){
    const n = TH.regen ? Math.round(TH.regen * 140) : 0;
    while (wetter.length < n) wetter.push({ x: rnd() * W, y: rnd() * Hh, v: .9 + rnd() * .5, l: 10 + rnd() * 14 });
    for (const d of wetter){ d.y += d.v * dt * .9; d.x += d.v * dt * .18; if (d.y > Hh){ d.y = -20; d.x = rnd() * (W + 100) - 100; } }
  }
  function drawWetter(ctx, t){
    if (wetter.length){
      ctx.strokeStyle = 'rgba(190,205,225,.22)'; ctx.lineWidth = 1; ctx.beginPath();
      for (const d of wetter){ ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.l * .2, d.y - d.l); }
      ctx.stroke();
    }
    // Schwebeteilchen je nach Gebiet
    const art = TH.teilchen;
    if (!art) return;
    const def = TEILCHEN[art], n = def.n;
    for (let i = 0; i < n; i++){
      const s = hash2(i, 7), s2 = hash2(i, 13), sp = def.v * (.5 + s2);
      const par = .4 + s * .9;
      let x = ((s * 1.7 + t * sp * def.dx * .00004) % 1.2 - .1) * W - cam.x * baseZ * par * .08;
      x = ((x % (W * 1.2)) + W * 1.2) % (W * 1.2) - W * .1;
      let y = ((s2 * 1.3 + t * sp * def.dy * .00004) % 1.1 - .05) * Hh + Math.sin(t * .001 * def.wob + i) * 12 - cam.y * baseZ * par * .05;
      y = ((y % (Hh * 1.1)) + Hh * 1.1) % (Hh * 1.1) - Hh * .05;
      const a = def.a * (.4 + .6 * Math.sin(t * .002 + i * 1.7) ** 2), r = def.r * (.6 + s * .8);
      if (def.glut){ ctx.globalCompositeOperation = 'lighter'; }
      ctx.globalAlpha = a; ctx.fillStyle = def.col;
      if (def.form === 'blatt'){ ctx.save(); ctx.translate(x, y); ctx.rotate(t * .002 + i); ctx.beginPath(); ctx.ellipse(0, 0, r * 1.8, r * .8, 0, 0, TAU); ctx.fill(); ctx.restore(); }
      else { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  }
  const TEILCHEN = {
    gischt: { n: 36, v: 1, dx: 1.4, dy: .2, wob: 1, a: .35, r: 1.1, col: '#dbe6f0' },
    salz: { n: 50, v: .6, dx: .4, dy: .9, wob: 1.5, a: .5, r: 1.2, col: '#eef4fa' },
    staub: { n: 40, v: .3, dx: .5, dy: .3, wob: .8, a: .35, r: 1, col: '#c9d3df' },
    glut: { n: 28, v: .7, dx: .3, dy: -1.2, wob: 2, a: .8, r: 1.3, col: '#ffae5c', glut: true },
    irrlicht: { n: 16, v: .25, dx: .6, dy: .15, wob: .6, a: .9, r: 1.8, col: '#9fe8c8', glut: true },
    blueten: { n: 26, v: .5, dx: .9, dy: .7, wob: 2.5, a: .55, r: 2.2, col: '#e9ecef', form: 'blatt' }
  };
  function drawNebel(ctx, t){
    const n = TH.nebel || 0; if (!n) return;
    const hy = Hh / 2 + (horizontY() - cam.y) * baseZ * .5;
    for (let i = 0; i < 5; i++){
      const x = ((i * .31 + t * .000012 * (1 + i * .4) - cam.x * .00008 * (1 + i * .3)) % 1.4 + 1.4) % 1.4 * W - W * .2;
      const y = hy + (i - 2) * Hh * .06, r = W * (.45 + i * .08);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${TH.nebelFarbe || '170,185,200'},${.07 * n})`); g.addColorStop(1, `rgba(${TH.nebelFarbe || '170,185,200'},0)`);
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r * .4, r * 2, r * .8);
    }
  }

  /* ---------- Effekte (Weltkoordinaten) ---------- */
  const KIND = {
    spark: () => ({ v: .35, size: [1, 2.2], life: [180, 380], col: '255,210,150', g: .0006, add: true }),
    gold:  () => ({ v: .45, size: [1.2, 2.8], life: [300, 650], col: '240,205,120', g: .0003, add: true }),
    drop:  () => ({ v: .22, size: [1.2, 2.6], life: [400, 800], col: '160,200,210', g: .0009, add: false }),
    ember: () => ({ v: .08, size: [1, 2.2], life: [900, 1800], col: '255,160,80', g: -.00006, add: true }),
    mist:  () => ({ v: .03, size: [8, 18], life: [800, 1600], col: '150,170,190', g: -.00004, add: false, fade: .18 }),
    heal:  () => ({ v: .06, size: [1, 2], life: [700, 1200], col: '200,225,255', g: -.00012, add: true }),
    salz:  () => ({ v: .3, size: [1, 2.4], life: [400, 900], col: '235,242,250', g: .0008, add: false }),
    staub: () => ({ v: .12, size: [3, 7], life: [500, 900], col: '120,130,140', g: -.00002, add: false, fade: .3 }),
    blut:  () => ({ v: .25, size: [1.2, 2.6], life: [400, 800], col: '120,20,20', g: .0009, add: false }),
    splash: () => ({ v: .28, size: [1, 2.2], life: [300, 600], col: '190,220,230', g: .0012, add: false })
  };
  function burst(x, y, kind, n = 10, dir = null){
    const k = KIND[kind](); if (!k) return;
    for (let i = 0; i < n; i++){
      const a = dir === null ? rnd() * TAU : dir + (rnd() - .5) * 1.4, v = k.v * (.35 + rnd());
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (kind === 'drop' || kind === 'splash' ? .15 : 0), life: 0, max: rr(...k.life), size: rr(...k.size), col: k.col, g: k.g, add: k.add, drag: .996, fade: k.fade || 1 });
    }
  }
  function glutFlow(from, to, n = 24){
    for (let i = 0; i < n; i++) parts.push({ x: from[0] + (rnd() - .5) * 30, y: from[1] + (rnd() - .5) * 40, vx: (rnd() - .5) * .15, vy: -rnd() * .15, life: -i * 30, max: 1500, size: 1.2 + rnd() * 1.5, col: '255,170,90', g: 0, add: true, drag: .99, home: to });
  }
  function ring(x, y, r0, r1, col, dur = 420, w = 2){ rings.push({ x, y, r0, r1, col, t: 0, dur, w }); }
  function pop(x, y, text, col = '#e8ecf2', size = 18){ pops.push({ x, y, text, col, size, t: 0, dur: 900 }); }
  function ghost(a){ ghosts.push({ a: Object.assign({}, a, { pose: Object.assign({}, a.pose), trail: [] }), t: 0, dur: 260 }); }
  function shake(p){ if (!reduceMotion) shakeP = Math.max(shakeP, p); }
  function flash(col, a){ flashC = col; flashA = Math.max(flashA, a); }
  function wave(x0, x1, dur, gy){ waves.push({ x0, x1, dur, t: 0, gy }); }
  function updateFx(dt){
    for (let i = parts.length - 1; i >= 0; i--){
      const p = parts[i]; p.life += dt;
      if (p.life < 0) continue;
      if (p.home){
        const to = typeof p.home === 'function' ? p.home() : p.home;
        const dx = to[0] - p.x, dy = to[1] - p.y, d = Math.hypot(dx, dy) || 1, pull = Math.min(1, p.life / 500) * .0022;
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
    slowA += ((slowOn ? 1 : 0) - slowA) * (1 - Math.pow(.99, dt));
    letter += (letterT - letter) * (1 - Math.pow(.993, dt));
    dunkel += (dunkelT - dunkel) * (1 - Math.pow(.997, dt));
    stepCam(dt);
    wetterStep(dt);
    cam.sx = shakeP ? (rnd() - .5) * shakeP : 0; cam.sy = shakeP ? (rnd() - .5) * shakeP : 0;
  }
  function drawWellen(ctx, dt){
    for (let i = waves.length - 1; i >= 0; i--){
      const w = waves[i]; w.t += dt;
      const k = Math.min(1, w.t / w.dur), x = lerp(w.x0, w.x1, EASE.in(k)), gy = w.gy, h = 90 * Math.sin(Math.min(1, k * 1.3) * Math.PI * .5 + .2), dir = Math.sign(w.x1 - w.x0) || 1;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(x, gy - h, x, gy);
      g.addColorStop(0, 'rgba(190,240,236,.6)'); g.addColorStop(1, 'rgba(40,110,120,.25)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x + 40 * dir, gy);
      ctx.quadraticCurveTo(x + 10 * dir, gy - h * 1.1, x - 20 * dir, gy - h); ctx.quadraticCurveTo(x - 10 * dir, gy - h * .5, x - 70 * dir, gy);
      ctx.closePath(); ctx.fill(); ctx.restore();
      if (rnd() < .7) burst(x - 10 * dir + rnd() * 30 * dir, gy - h * rnd(), 'drop', 1);
      if (w.t > w.dur + 120) waves.splice(i, 1);
    }
  }
  function drawFxWelt(ctx, t, dt){
    drawWellen(ctx, dt);
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
  }
  // Schadenszahlen in Bildschirmgröße, damit sie beim Zoomen lesbar bleiben
  function drawPops(ctx){
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const p of pops){
      const k = p.t / p.dur, [sx, sy] = toScreen(p.x, p.y);
      const y = sy - EASE.out(k) * 34;
      ctx.globalAlpha = k < .7 ? 1 : 1 - (k - .7) / .3;
      ctx.font = `600 ${p.size}px 'IBM Plex Sans', system-ui, sans-serif`;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.strokeText(p.text, sx, y);
      ctx.fillStyle = p.col; ctx.fillText(p.text, sx, y);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- Ein ganzes Bild ---------- */
  // h: { hinten(ctx), figuren(ctx), spiegel(ctx), vorn(ctx), kampf(ctx) }
  function draw(ctx, t, dt, h = {}){
    if (!G){ ctx.fillStyle = '#050608'; ctx.fillRect(0, 0, W, Hh); return; }
    const hy = Hh / 2 + (horizontY() - cam.y) * baseZ * .15;
    drawHimmel(ctx, hy);
    drawEbenen(ctx);
    drawNebel(ctx, t);
    ctx.save();
    ctx.translate(W / 2 + cam.sx, Hh / 2 + cam.sy); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y);
    if (TH.hinterWelt) TH.hinterWelt(ctx, G, view(), t);
    drawGelaende(ctx, t);
    if (h.hinten) h.hinten(ctx);
    drawLichter(ctx, t);
    for (const g of ghosts) drawActor(ctx, g.a, .35 * (1 - g.t / g.dur));
    if (h.figuren) h.figuren(ctx);
    if (h.kampf) h.kampf(ctx);
    drawWasser(ctx, t, h.spiegel);
    drawFlut(ctx, t);
    if (h.vorn) h.vorn(ctx);
    drawFxWelt(ctx, t, dt);
    if (TH.vorWelt) TH.vorWelt(ctx, G, view(), t);
    ctx.restore();
    if (TH.vordergrund) TH.vordergrund(ctx, cam, W, Hh, t, baseZ);
    drawDunkel(ctx);
    drawWetter(ctx, t);
    drawPops(ctx);
    drawUeber(ctx, t);
    dynLights = [];
  }
  function drawUeber(ctx, t){
    if (tint > .01){ ctx.fillStyle = `rgba(30,90,100,${tint * .14})`; ctx.fillRect(0, 0, W, Hh); }
    if (slowA > .01){ ctx.fillStyle = `rgba(120,160,210,${slowA * .1})`; ctx.fillRect(0, 0, W, Hh); }
    if (TH.farbe){ ctx.fillStyle = TH.farbe; ctx.fillRect(0, 0, W, Hh); }
    ctx.drawImage(cache.vignette, -W * .05, -Hh * .05, W * 1.1, Hh * 1.1);
    if (!reduceMotion){ ctx.globalAlpha = .6; const ox = -(t * .37 % 160), oy = -(t * .23 % 160); for (let x = ox; x < W; x += 160) for (let y = oy; y < Hh; y += 160) ctx.drawImage(cache.korn, x, y); ctx.globalAlpha = 1; }
    if (letter > .005){ const b = letter * Hh * .09; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, b); ctx.fillRect(0, Hh - b, W, b); }
    if (flashA > .01){ ctx.globalAlpha = Math.min(1, flashA); ctx.fillStyle = flashC; ctx.fillRect(0, 0, W, Hh); ctx.globalAlpha = 1; }
  }
  // Glocke im Turm, als Teil der Welt gezeichnet
  function glocke(ctx, x, y, bw, t){
    bellSwing += (bellT - bellSwing) * .02;
    bellPh += .0015 + bellSwing * .002;
    const ang = Math.sin(bellPh * 1.4) * (.03 + bellSwing * .22), bh = bw * .9;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
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

  return {
    resize, size, setArea, area, theme, setLights, dynLight, follow, focus, release, cam, toScreen, view, zoomBase, horizontY,
    draw, updateFx, glow, glocke,
    burst, glutFlow, ring, pop, ghost, shake, flash, wave,
    setFlood(v, gy){ floodT = v; if (gy != null) floodY = gy; }, sceneFlood: () => 0,
    setTint(v){ tintT = v; }, setSlow(v){ slowOn = v; }, bell(v){ bellT = v; },
    letterbox(v){ letterT = v; }, dunkel(v){ dunkelT = v == null ? (TH && TH.dunkel) || 0 : v; },
    clearFx(){ parts.length = 0; rings.length = 0; pops.length = 0; ghosts.length = 0; waves.length = 0; },
    reset(){ parts.length = 0; rings.length = 0; pops.length = 0; ghosts.length = 0; waves.length = 0; flood = floodT = 0; tint = tintT = 0; bellT = 0; }
  };
})();
