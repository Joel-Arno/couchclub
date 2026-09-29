/* =====================================================================
   THEMEN: Farbwelt und Hintergrundebenen jedes Gebiets
   Jede Ebene wird einmal in einen Streifen gemalt, der sich nahtlos
   wiederholt. par: wie stark sie sich mit der Kamera bewegt (0 = gar nicht).
   base: Anteil der Streifenhöhe, an dem der Horizont liegt.
   ===================================================================== */

/* ---------- Werkzeuge für die Maler ---------- */
// Etwas nahtlos in einen Streifen malen: auch um die Breite verschoben
function nahtlos(w, x, breite, fn){ fn(x); if (x + breite > w) fn(x - w); if (x - breite < 0) fn(x + w); }
function verlauf(g, y0, y1, farben){ const gr = g.createLinearGradient(0, y0, 0, y1); farben.forEach((c, i) => gr.addColorStop(i / (farben.length - 1), c)); return gr; }
function bergkette(g, w, base, hoehe, R, farbe, zacken = 18, rau = 1){
  g.fillStyle = farbe; g.beginPath(); g.moveTo(0, base + 2);
  const n = Math.round(w / zacken), pts = [];
  for (let i = 0; i <= n; i++) pts.push(R());
  pts[n] = pts[0];
  for (let i = 0; i <= n; i++){
    const x = i * zacken, s = Math.sin(i / n * TAU * 2) * .3 + Math.sin(i / n * TAU * 5 + 1) * .2;
    g.lineTo(x, base - hoehe * (.55 + s * .5 + (pts[i] - .5) * .25 * rau));
  }
  g.lineTo(w, base + 2); g.closePath(); g.fill();
}
function turmAufWasser(g, x, base, h, w, farbe, licht){
  g.fillStyle = farbe;
  g.fillRect(x - w / 2, base - h, w, h + 2);
  g.fillRect(x - w * .8, base - h - h * .12, w * 1.6, h * .14);
  g.beginPath(); g.moveTo(x - w * .8, base - h - h * .12); g.lineTo(x, base - h - h * .34); g.lineTo(x + w * .8, base - h - h * .12); g.fill();
  if (licht){ g.fillStyle = licht; g.fillRect(x - 1, base - h - h * .08, 2, 2); }
}
function meerFlaeche(g, w, h, base, farben){
  g.fillStyle = verlauf(g, base, h, farben); g.fillRect(0, base, w, h - base);
  g.fillStyle = 'rgba(214,224,238,.12)'; g.fillRect(0, base, w, 1);
  g.strokeStyle = 'rgba(190,205,220,.05)'; g.lineWidth = 1;
  for (let i = 1; i < 12; i++){ const y = base + Math.pow(i / 12, 1.6) * (h - base); g.beginPath(); for (let x = 0; x <= w; x += 20){ const yy = y + Math.sin(x * .02 + i) * (1 + i * .15); x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); }
}
function haus(g, R, x, base, w, h, col, licht){
  g.fillStyle = col;
  g.fillRect(x - w / 2, base - h, w, h + 2);
  g.beginPath(); g.moveTo(x - w * .56, base - h); g.lineTo(x, base - h - w * .55); g.lineTo(x + w * .56, base - h); g.closePath(); g.fill();
  if (R() < .5) g.fillRect(x + w * .18, base - h - w * .45, w * .1, w * .3);
  const rows = Math.max(1, Math.floor(h / (w * .45))), cols = w > 30 ? 2 : 1;
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++){
    const wx = x - w * (cols === 2 ? .22 : 0) + k * w * .44 - w * .07, wy = base - h + h * .12 + r * w * .45;
    const on = licht && R() < licht;
    g.fillStyle = on ? 'rgba(235,190,120,.6)' : 'rgba(0,0,0,.45)';
    g.fillRect(wx, wy, w * .14, w * .2);
  }
}
function toterBaum(g, R, x, base, h, dir, farbe){
  g.strokeStyle = farbe;
  const ast = (x0, y0, len, ang, lw, d) => {
    const x1 = x0 + Math.sin(ang) * len, y1 = y0 - Math.cos(ang) * len;
    g.lineWidth = lw; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + Math.sin(ang) * len * .3 + dir * len * .1, y0 - Math.cos(ang) * len * .6, x1, y1); g.stroke();
    if (d > 0){ ast(x1, y1, len * .62, ang - .5 - R() * .3, lw * .6, d - 1); ast(x1, y1, len * .55, ang + .4 + R() * .3, lw * .6, d - 1); }
  };
  ast(x, base, h * .45, dir * .12, Math.max(2, h * .05), 4);
}
function schilfBuesche(g, R, w, base, n, hoehe, farbe){
  g.strokeStyle = farbe; g.fillStyle = farbe;
  for (let i = 0; i < n; i++){
    const cx = R() * w, hh = hoehe * (.5 + R() * .6), k = 6 + Math.floor(R() * 8);
    nahtlos(w, cx, 40, x => {
      for (let j = 0; j < k; j++){
        const bx = x + (R() - .5) * hh * .5, h2 = hh * (.6 + R() * .5), bend = (R() - .4) * hh * .25;
        g.lineWidth = Math.max(1, hh * .02);
        g.beginPath(); g.moveTo(bx, base); g.quadraticCurveTo(bx + bend * .3, base - h2 * .6, bx + bend, base - h2); g.stroke();
        if (R() < .3){ g.beginPath(); g.ellipse(bx + bend * .95, base - h2 * .93, hh * .014 + 1, hh * .05, bend * .01, 0, TAU); g.fill(); }
      }
    });
  }
}
function wrack(g, x, base, s, dir, farbe){
  g.strokeStyle = farbe; g.fillStyle = farbe;
  g.lineWidth = Math.max(2, s * .06);
  for (let i = 0; i < 6; i++){
    const bx = x + dir * i * s * .18, h = s * (.5 + i * .09);
    g.beginPath(); g.moveTo(bx, base + 4); g.quadraticCurveTo(bx - dir * s * .22, base - h * .6, bx + dir * s * .06, base - h); g.stroke();
  }
  g.lineWidth = Math.max(3, s * .08); g.beginPath(); g.moveTo(x - dir * s * .15, base - 2); g.lineTo(x + dir * s * 1.1, base - s * .1); g.stroke();
  g.lineWidth = Math.max(2, s * .04); g.beginPath(); g.moveTo(x + dir * s * .5, base - s * .1); g.lineTo(x + dir * s * .7, base - s * 1.6); g.stroke();
}
function schiff(g, x, base, w, h, tilt, farbe){
  g.save(); g.translate(x, base); g.rotate(tilt); g.fillStyle = farbe;
  g.beginPath(); g.moveTo(-w / 2, -h); g.lineTo(w / 2, -h * 1.15); g.quadraticCurveTo(w * .46, h * .1, w * .2, h * .2); g.lineTo(-w * .3, h * .2); g.quadraticCurveTo(-w * .5, 0, -w / 2, -h); g.fill();
  g.restore();
}
function mast(g, x, base, h, tilt, farbe){
  g.strokeStyle = farbe; g.lineWidth = Math.max(2, h * .018);
  const x1 = x + Math.sin(tilt) * h, y1 = base - Math.cos(tilt) * h;
  g.beginPath(); g.moveTo(x, base); g.lineTo(x1, y1); g.stroke();
  g.lineWidth = Math.max(1.5, h * .01);
  g.beginPath(); g.moveTo(x1 - Math.cos(tilt) * h * .2, y1 + h * .15); g.lineTo(x1 + Math.cos(tilt) * h * .2, y1 + h * .15 + Math.sin(tilt) * h * .4); g.stroke();
  return [x1, y1];
}
function glockenturm(g, x, base, h, w, farbe){
  g.fillStyle = farbe;
  g.fillRect(x - w / 2, base - h, w, h + 4);
  g.fillRect(x - w * .7, base - h - w * .2, w * 1.4, w * .25);
  g.beginPath(); g.moveTo(x - w * .6, base - h - w * .2); g.lineTo(x, base - h - w * 2.2); g.lineTo(x + w * .6, base - h - w * .2); g.fill();
  g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.arc(x, base - h + w * .55, w * .3, Math.PI, 0); g.fill();
  g.fillRect(x - w * .3, base - h + w * .55, w * .6, w * .3);
}
function kristall(g, x, y, len, ang, breite, a){
  const dx = Math.sin(ang), dy = -Math.cos(ang);
  g.fillStyle = `rgba(200,214,230,${a * .3})`; g.strokeStyle = `rgba(225,235,245,${a})`; g.lineWidth = 1;
  g.beginPath(); g.moveTo(x - dy * breite, y + dx * breite); g.lineTo(x + dx * len, y + dy * len); g.lineTo(x + dy * breite, y - dx * breite); g.closePath(); g.fill(); g.stroke();
}
function bogenfenster(g, x, top, w, h, licht){
  g.save(); g.beginPath(); g.moveTo(x - w / 2, top + h); g.lineTo(x - w / 2, top + w / 2); g.arc(x, top + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w / 2, top + h); g.closePath(); g.clip();
  g.fillStyle = verlauf(g, top, top + h, [licht, 'rgba(90,110,140,.1)']); g.fillRect(x - w, top, w * 2, h);
  g.strokeStyle = 'rgba(4,5,7,.95)'; g.lineWidth = Math.max(2, w * .07);
  g.beginPath(); g.moveTo(x, top); g.lineTo(x, top + h); g.moveTo(x - w, top + h * .45); g.lineTo(x + w, top + h * .45); g.stroke();
  g.restore();
}

/* ---------- Dekor an den Oberkanten des Geländes ---------- */
function dekoKiesel(ctx, kanten, v){
  ctx.fillStyle = 'rgba(150,165,185,.18)';
  for (const [a, b] of kanten){
    if (b[0] < v[0] || a[0] > v[2]) continue;
    const n = Math.floor(Math.abs(b[0] - a[0]) / 7);
    for (let i = 0; i < n; i++){ const u = (i + .5) / n, x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u); if (hash2(x, y) < .35) ctx.fillRect(x, y - 1.5, 2 + hash2(y, x) * 3, 1.5); }
  }
}
function dekoGras(farbe, hoch, dicht){
  return (ctx, kanten, v, t) => {
    ctx.strokeStyle = farbe; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const [a, b] of kanten){
      if (b[0] < v[0] || a[0] > v[2]) continue;
      const n = Math.floor(Math.abs(b[0] - a[0]) / 5);
      for (let i = 0; i < n; i++){
        const u = (i + .5) / n, x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u), s = hash2(x | 0, y | 0);
        if (s > dicht) continue;
        const hh = hoch * (.4 + s * 1.4), sw = Math.sin(t * .0015 + x * .05) * hh * .15;
        ctx.moveTo(x, y + 1); ctx.quadraticCurveTo(x + sw * .3, y - hh * .5, x + sw + (s - .5) * hh * .4, y - hh);
      }
    }
    ctx.stroke();
  };
}
function dekoSalz(ctx, kanten, v){
  for (const [a, b] of kanten){
    if (b[0] < v[0] || a[0] > v[2]) continue;
    const n = Math.floor(Math.abs(b[0] - a[0]) / 9);
    for (let i = 0; i < n; i++){
      const u = (i + .5) / n, x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u), s = hash2(x | 0, y | 0);
      if (s > .3) continue;
      const len = 4 + s * 26;
      kristall(ctx, x, y + 1, len, (hash2(y | 0, x | 0) - .5) * .9, 2 + s * 4, .2 + s);
    }
  }
}

/* ---------- Vordergrund: dunkle Formen dicht vor der Kamera ---------- */
function vorneFormen(art){
  return (ctx, cam, W, H, t, z) => {
    const par = 1.45, step = 520, off = cam.x * z * par;
    const i0 = Math.floor((off - 200) / step), i1 = Math.floor((off + W + 200) / step);
    ctx.fillStyle = '#020304'; ctx.strokeStyle = '#020304';
    for (let i = i0; i <= i1; i++){
      const s = hash2(i, 91); if (s > .55) continue;
      const x = i * step - off + s * 200, base = H + 10 - (cam.y - (World.horizontY() || 0)) * z * .05;
      if (art === 'schilf'){
        ctx.lineWidth = 3;
        for (let k = 0; k < 9; k++){ const bx = x + (hash2(i, k) - .5) * 60, h = 90 + hash2(k, i) * 120, sw = Math.sin(t * .001 + k) * 8; ctx.beginPath(); ctx.moveTo(bx, base); ctx.quadraticCurveTo(bx + sw * .5, base - h * .6, bx + sw + 10, base - h); ctx.stroke(); }
      } else if (art === 'kette'){
        ctx.lineWidth = 5; ctx.setLineDash([9, 5]);
        ctx.beginPath(); ctx.moveTo(x, -10); ctx.quadraticCurveTo(x + 30 + Math.sin(t * .001) * 8, H * .3, x + 10, H * .55); ctx.stroke(); ctx.setLineDash([]);
      } else if (art === 'pfahl'){
        ctx.fillRect(x, base - H * .5, 22, H * .6);
        ctx.fillRect(x - 6, base - H * .5, 34, 8);
      } else {
        ctx.beginPath(); ctx.moveTo(x - 80, base); ctx.quadraticCurveTo(x, base - 70 - s * 90, x + 110, base); ctx.fill();
      }
    }
  };
}

/* ---------- Themen ---------- */
const THEMEN = {
  strand: {
    himmel: ['#070a0f', '#121a25', '#2a3542', '#46515d'], dunst: 'rgba(170,188,205,.2)', rim: 'rgba(200,216,234,.95)', rimFig: 'rgba(176,196,214,.55)',
    fels: '#030405', holz: '#0a0a0b', wasser: ['rgba(34,48,60,.78)', 'rgba(6,12,18,.94)'], nebel: 1, teilchen: 'gischt',
    kantenDeko: dekoKiesel, vordergrund: vorneFormen('fels'),
    ebenen: [
      { par: .05, base: .7, unten: '#151d26', male(g, w, h, R){
        const b = h * .7;
        bergkette(g, w, b, 90, R, '#18212b', 26);
        meerFlaeche(g, w, h, b, ['#34414f', '#151d26']);
        [.08, .23, .41, .6, .77, .93].forEach((f, i) => turmAufWasser(g, w * f, b, 26 + R() * 34, 5, 'rgba(24,31,40,.95)', i === 2 ? 'rgba(230,220,190,.6)' : null));
      } },
      { par: .2, base: .74, male(g, w, h, R){
        const b = h * .74;
        for (let i = 0; i < 4; i++){ const x = R() * w; nahtlos(w, x, 200, xx => wrack(g, xx, b, 50 + R() * 40, R() < .5 ? 1 : -1, '#121a22')); }
        g.fillStyle = '#111820'; for (let i = 0; i < 7; i++){ const x = R() * w, s = 20 + R() * 50; nahtlos(w, x, s, xx => { g.beginPath(); g.ellipse(xx, b, s, s * .45, 0, Math.PI, 0); g.fill(); }); }
      } },
      { par: .45, base: .8, male(g, w, h, R){
        const b = h * .8;
        g.fillStyle = '#0b1016';
        for (let i = 0; i < 5; i++){ const x = R() * w, s = 40 + R() * 90; nahtlos(w, x, s * 1.3, xx => { g.beginPath(); g.moveTo(xx - s * 1.2, b + 4); g.quadraticCurveTo(xx - s * .3, b - s * .9, xx + s * .2, b - s * .7); g.quadraticCurveTo(xx + s * .8, b - s * .5, xx + s * 1.3, b + 4); g.fill(); }); }
      } }
    ]
  },
  leuchtturm: null,
  klippe: {
    himmel: ['#06080c', '#10161f', '#252e39', '#3b434d'], dunst: 'rgba(190,190,195,.14)', rim: 'rgba(200,214,230,.9)',
    fels: '#060709', wasser: ['rgba(34,48,60,.78)', 'rgba(6,12,18,.94)'], nebel: 1.2, teilchen: 'gischt', regen: .25,
    kantenDeko: dekoGras('rgba(8,10,12,.95)', 9, .55), vordergrund: vorneFormen('fels'),
    ebenen: [
      { par: .04, base: .78, unten: '#0a0f15', male(g, w, h, R){ const b = h * .78; meerFlaeche(g, w, h, b, ['#27323e', '#0a0f15']); [.15, .5, .82].forEach(f => turmAufWasser(g, w * f, b, 30 + R() * 30, 5, 'rgba(26,33,43,.9)')); } },
      { par: .15, base: .8, male(g, w, h, R){ bergkette(g, w, h * .8, 260, R, '#10151c', 30, 1.6); } },
      { par: .35, base: .84, male(g, w, h, R){ bergkette(g, w, h * .84, 200, R, '#0a0e13', 22, 2); } }
    ]
  },
  mole: {
    himmel: ['#04060a', '#0c131c', '#1f2a36', '#33404c'], dunst: 'rgba(160,185,205,.14)', rim: 'rgba(190,210,230,.9)',
    fels: '#07090c', mauer: '#0a0c10', wasser: ['rgba(30,46,60,.8)', 'rgba(5,10,16,.95)'], nebel: 1.4, teilchen: 'gischt', regen: .55, blitz: true,
    vordergrund: vorneFormen('pfahl'),
    ebenen: [
      { par: .03, base: .72, unten: '#080d13', male(g, w, h, R){ const b = h * .72; meerFlaeche(g, w, h, b, ['#223040', '#080d13']); [.1, .3, .52, .7, .9].forEach((f, i) => turmAufWasser(g, w * f, b, 24 + R() * 40, 5, 'rgba(22,29,38,.95)', i === 2 ? 'rgba(230,220,190,.55)' : null)); } },
      { par: .14, base: .76, male(g, w, h, R){ const b = h * .76; g.strokeStyle = 'rgba(160,185,205,.08)'; g.lineWidth = 1.2; for (let i = 0; i < 22; i++){ const x = R() * w, y = b - R() * 30; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 30, y - 8, x + 70, y); g.stroke(); } } }
    ]
  },
  nebel: {
    himmel: ['#07090c', '#141b24', '#303b47', '#48535f'], dunst: 'rgba(200,212,224,.2)', rim: 'rgba(210,222,235,.85)',
    fels: '#07090c', mauer: '#0a0c10', wasser: ['rgba(40,56,70,.7)', 'rgba(8,14,20,.92)'], nebel: 3, nebelFarbe: '200,212,224', teilchen: 'gischt',
    ebenen: [
      { par: .03, base: .72, unten: '#10161d', male(g, w, h, R){ const b = h * .72; meerFlaeche(g, w, h, b, ['#2c3844', '#10161d']); [.2, .55, .85].forEach(f => turmAufWasser(g, w * f, b, 30 + R() * 30, 5, 'rgba(40,50,62,.7)')); } }
    ]
  },
  marsch: {
    himmel: ['#050807', '#0f1614', '#222c29', '#34403b'], dunst: 'rgba(160,190,175,.14)', rim: 'rgba(200,222,210,.85)', rimFig: 'rgba(180,205,195,.5)',
    fels: '#060807', holz: '#0a0a09', wasser: ['rgba(34,48,44,.8)', 'rgba(6,12,11,.94)'], wasserKante: 'rgba(200,230,215,.35)', nebel: 1.8, nebelFarbe: '165,190,178', teilchen: 'irrlicht',
    kantenDeko: (ctx, k, v, t) => { dekoSalz(ctx, k.filter((e, i) => i % 3 === 0), v); dekoGras('rgba(6,9,8,.95)', 14, .5)(ctx, k, v, t); },
    vordergrund: vorneFormen('schilf'),
    ebenen: [
      { par: .04, base: .76, unten: '#0a0f0e', male(g, w, h, R){ const b = h * .76; meerFlaeche(g, w, h, b, ['#26302d', '#0a0f0e']); for (let i = 0; i < 6; i++) toterBaum(g, R, R() * w, b + 2, 30 + R() * 30, R() < .5 ? 1 : -1, 'rgba(20,27,25,.9)'); } },
      { par: .16, base: .78, male(g, w, h, R){ const b = h * .78; schilfBuesche(g, R, w, b, 18, 34, 'rgba(14,19,18,.95)'); for (let i = 0; i < 3; i++) toterBaum(g, R, R() * w, b + 2, 80 + R() * 60, R() < .5 ? 1 : -1, '#0f1413'); } },
      { par: .42, base: .84, male(g, w, h, R){ const b = h * .84; schilfBuesche(g, R, w, b, 10, 90, '#0a0e0d'); toterBaum(g, R, w * .3, b + 4, 220, 1, '#080b0a'); toterBaum(g, R, w * .78, b + 4, 170, -1, '#080b0a'); } }
    ]
  },
  pfahldorf: {
    himmel: ['#060707', '#12161a', '#2a2b2c', '#3d3a36'], dunst: 'rgba(205,180,150,.14)', rim: 'rgba(214,210,200,.8)', rimFig: 'rgba(200,190,180,.5)',
    fels: '#060807', holz: '#0b0a09', wasser: ['rgba(38,48,44,.8)', 'rgba(6,12,11,.94)'], nebel: 1.5, nebelFarbe: '180,175,165', teilchen: 'irrlicht',
    kantenDeko: dekoGras('rgba(6,9,8,.95)', 12, .45), vordergrund: vorneFormen('schilf'),
    ebenen: [
      { par: .04, base: .76, unten: '#0b0f0e', male(g, w, h, R){ const b = h * .76; meerFlaeche(g, w, h, b, ['#2a302d', '#0b0f0e']); } },
      { par: .22, base: .8, male(g, w, h, R){
        const b = h * .8;
        for (let i = 0; i < 7; i++){
          const x = R() * w, s = 50 + R() * 60, lit = R() < .4;
          nahtlos(w, x, s, xx => {
            g.fillStyle = '#0f1311'; g.strokeStyle = '#0f1311'; g.lineWidth = 3;
            for (let k = 0; k < 4; k++){ g.beginPath(); g.moveTo(xx - s * .4 + k * s * .27, b); g.lineTo(xx - s * .4 + k * s * .27, b - s * .5); g.stroke(); }
            g.fillRect(xx - s * .5, b - s * .52, s, 4); g.fillRect(xx - s * .4, b - s * .9, s * .8, s * .4);
            g.beginPath(); g.moveTo(xx - s * .5, b - s * .88); g.lineTo(xx, b - s * 1.25); g.lineTo(xx + s * .5, b - s * .88); g.fill();
            g.fillStyle = lit ? 'rgba(250,190,110,.75)' : 'rgba(0,0,0,.5)'; g.fillRect(xx - s * .06, b - s * .78, s * .12, s * .12);
          });
        }
      } },
      { par: .45, base: .85, male(g, w, h, R){ schilfBuesche(g, R, w, h * .85, 9, 70, '#0a0d0c'); } }
    ]
  },
  grube: { voll: true,
    himmel: ['#030406', '#07090d', '#0c1016'], mond: false, rim: 'rgba(225,236,248,.9)', rimFig: 'rgba(210,225,240,.55)',
    fels: '#07090c', wand: '#0c1015', dunkel: .45, wasser: ['rgba(60,80,90,.6)', 'rgba(10,16,20,.9)'], teilchen: 'salz', nebel: .5, nebelFarbe: '200,215,230',
    kantenDeko: dekoSalz,
    ebenen: [
      { par: .1, base: .5, male(g, w, h, R){ g.fillStyle = '#0a0d12'; g.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++){ const x = R() * w; nahtlos(w, x, 60, xx => kristall(g, xx, R() * h, 20 + R() * 70, (R() - .5) * 2.5, 3 + R() * 8, .06 + R() * .12)); } } },
      { par: .3, base: .5, male(g, w, h, R){ for (let i = 0; i < 30; i++){ const x = R() * w; nahtlos(w, x, 80, xx => kristall(g, xx, h * (R() < .5 ? 0 : 1), 40 + R() * 90, R() < .5 ? Math.PI + (R() - .5) * .5 : (R() - .5) * .5, 5 + R() * 10, .12 + R() * .15)); } } }
    ]
  },
  bruecke: {
    himmel: ['#05070b', '#0f151e', '#242d38', '#38414c'], dunst: 'rgba(170,185,200,.16)', rim: 'rgba(196,210,226,.85)',
    fels: '#06080b', mauer: '#0a0c10', wasser: ['rgba(26,40,52,.8)', 'rgba(5,10,16,.95)'], nebel: 2, teilchen: 'gischt', regen: .35,
    vordergrund: vorneFormen('kette'),
    ebenen: [
      { par: .05, base: .7, unten: '#080d12', male(g, w, h, R){
        const b = h * .7;
        meerFlaeche(g, w, h, b, ['#1d2833', '#080d12']);
        g.fillStyle = 'rgba(22,29,38,.92)';
        for (let i = 0; i < 26; i++){ const x = R() * w, hh = 20 + R() * 50; nahtlos(w, x, 30, xx => { g.fillRect(xx, b - hh, 24, hh); g.beginPath(); g.moveTo(xx - 2, b - hh); g.lineTo(xx + 12, b - hh - 16); g.lineTo(xx + 26, b - hh); g.fill(); }); }
        [.3, .62, .88].forEach(f => glockenturm(g, w * f, b, 110 + R() * 50, 12, 'rgba(22,29,38,.95)'));
      } },
      { par: .25, base: .86, male(g, w, h, R){ bergkette(g, w, h * .86, 140, R, '#0b1015', 26, 1.5); } }
    ]
  },
  velmora: {
    himmel: ['#05070b', '#0e141c', '#212a35', '#343d48'], dunst: 'rgba(170,190,210,.16)', rim: 'rgba(200,218,236,.85)',
    fels: '#07090c', mauer: '#0a0c10', holz: '#0b0a09', wasser: ['rgba(30,54,62,.75)', 'rgba(6,14,18,.93)'], wasserKante: 'rgba(170,230,230,.4)', nebel: 1.4, teilchen: 'blueten',
    vordergrund: vorneFormen('kette'),
    ebenen: [
      { par: .05, base: .72, unten: '#0a0f14', male(g, w, h, R){
        const b = h * .72;
        g.fillStyle = verlauf(g, b, h, ['#1c2630', '#0a0f14']); g.fillRect(0, b, w, h - b);
        for (let x = 0; x < w;){ const ww = 30 + R() * 40; haus(g, R, x + ww / 2, b + 4, ww, 40 + R() * 70, 'rgba(24,31,40,.95)', .1); x += ww * .95; }
        glockenturm(g, w * .55, b, 230, 22, 'rgba(20,26,34,.98)');
      } },
      { par: .3, base: .8, male(g, w, h, R){ const b = h * .8; for (let x = 0; x < w;){ const ww = 60 + R() * 70; haus(g, R, x + ww / 2, b + 4, ww, 90 + R() * 120, '#0e1319', .2); x += ww * (1 + R() * .4); } } }
    ]
  },
  hafen: {
    himmel: ['#04060a', '#0c121a', '#1d2631', '#303945'], dunst: 'rgba(160,180,200,.14)', rim: 'rgba(196,212,230,.85)',
    fels: '#07090c', holz: '#0b0a09', wasser: ['rgba(28,44,56,.82)', 'rgba(5,10,15,.95)'], nebel: 1.6, teilchen: 'gischt', regen: .45, blitz: true,
    vordergrund: vorneFormen('kette'),
    ebenen: [
      { par: .05, base: .74, unten: '#080c11', male(g, w, h, R){ const b = h * .74; meerFlaeche(g, w, h, b, ['#1c2833', '#080c11']); for (let i = 0; i < 5; i++){ const x = R() * w; nahtlos(w, x, 120, xx => schiff(g, xx, b + 4, 90 + R() * 90, 14 + R() * 12, (R() - .5) * .4, 'rgba(18,25,33,.95)')); } } },
      { par: .25, base: .8, male(g, w, h, R){
        const b = h * .8, tops = [];
        for (let i = 0; i < 5; i++){ const x = R() * w; schiff(g, x, b, 160 + R() * 120, 26 + R() * 18, (R() - .5) * .5, '#0d1218'); tops.push(mast(g, x + (R() - .5) * 60, b - 10, 160 + R() * 120, (R() - .5) * .5, '#0b0f14')); }
        g.strokeStyle = 'rgba(150,160,170,.14)'; g.lineWidth = 1;
        for (let i = 0; i < tops.length; i++) for (let j = i + 1; j < tops.length; j++){ const a = tops[i], c = tops[j]; if (Math.abs(a[0] - c[0]) > w * .5) continue; g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo((a[0] + c[0]) / 2, Math.max(a[1], c[1]) + 40, c[0], c[1]); g.stroke(); }
      } }
    ]
  },
  kapelle: { voll: true,
    himmel: ['#050608', '#0a0c10', '#101419'], mond: false, rim: 'rgba(200,214,232,.75)', rimFig: 'rgba(190,205,225,.45)',
    fels: '#07080b', mauer: '#0a0c10', holz: '#0b0a09', wand: '#0d1015', dunkel: .3, teilchen: 'staub', nebel: .4,
    ebenen: [
      { par: .15, base: .6, male(g, w, h, R){
        g.fillStyle = verlauf(g, 0, h, ['#0b0d11', '#12161c']); g.fillRect(0, 0, w, h);
        for (let x = 80; x < w; x += 260){ bogenfenster(g, x, h * .08, 60, h * .45, 'rgba(170,190,215,.3)'); g.fillStyle = '#06080b'; g.fillRect(x + 110, 0, 36, h); }
      } }
    ]
  },
  turm: { voll: true,
    himmel: ['#050609', '#0b0e13', '#13181f'], mond: false, rim: 'rgba(205,218,235,.8)',
    fels: '#07080b', mauer: '#0a0c10', holz: '#0b0a09', wand: '#0c0f14', dunkel: .4, teilchen: 'staub',
    ebenen: [
      { par: .12, base: .6, male(g, w, h, R){
        g.fillStyle = '#0b0e12'; g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1;
        for (let y = 0; y < h; y += 26){ g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (let x = (y / 26 % 2) * 30; x < w; x += 60){ g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 26); g.stroke(); } }
        for (let x = 120; x < w; x += 400){ g.fillStyle = 'rgba(150,170,200,.25)'; g.beginPath(); g.moveTo(x - 6, h * .5); g.lineTo(x - 6, h * .3); g.arc(x, h * .3, 6, Math.PI, 0); g.lineTo(x + 6, h * .5); g.fill(); }
      } }
    ]
  },
  turmspitze: {
    himmel: ['#07090d', '#141b25', '#2b3643', '#44505c'], dunst: 'rgba(190,205,222,.2)', rim: 'rgba(210,224,240,.9)',
    fels: '#07080b', mauer: '#0a0c10', wasser: ['rgba(34,50,64,.8)', 'rgba(6,12,18,.94)'], nebel: 1, teilchen: 'blueten',
    ebenen: [
      { par: .03, base: .8, unten: '#0a1017', male(g, w, h, R){ const b = h * .8; meerFlaeche(g, w, h, b, ['#2a3643', '#0a1017']); for (let x = 0; x < w;){ const ww = 20 + R() * 30; haus(g, R, x + ww / 2, b + 2, ww, 20 + R() * 40, 'rgba(26,33,43,.9)', .05); x += ww * 1.4 + R() * 40; } } }
    ]
  }
};
THEMEN.leuchtturm = Object.assign({}, THEMEN.strand, { dunst: 'rgba(210,175,140,.18)', himmel: ['#06070a', '#12151b', '#2c2c2f', '#403c38'] });
// Meeresgrotte: dunkel, türkis, Wasser mit Leuchten am Grund
THEMEN.grotte = Object.assign({}, THEMEN.grube, { voll: true,
  himmel: ['#020405', '#050a0c', '#081114'], rim: 'rgba(170,230,230,.8)', rimFig: 'rgba(150,215,215,.5)',
  fels: '#040607', wand: '#0c1719', dunkel: .32, wasser: ['rgba(50,140,150,.5)', 'rgba(4,16,20,.92)'], wasserKante: 'rgba(170,245,245,.6)',
  teilchen: 'gischt', nebel: .6, nebelFarbe: '150,210,210', kantenDeko: dekoKiesel,
  ebenen: [
    { par: .1, base: .5, male(g, w, h, R){ g.fillStyle = verlauf(g, 0, h, ['#0a1416', '#10201f', '#0b1516']); g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++){ const x = R() * w; nahtlos(w, x, 60, xx => { g.fillStyle = `rgba(34,64,66,${.25 + R() * .35})`; g.beginPath(); g.ellipse(xx, R() * h, 20 + R() * 60, 10 + R() * 30, R() * 3, 0, TAU); g.fill(); }); } } },
    { par: .3, base: .5, male(g, w, h, R){ g.fillStyle = '#040809'; for (let i = 0; i < 26; i++){ const x = R() * w, l = 30 + R() * 110; nahtlos(w, x, 30, xx => { g.beginPath(); g.moveTo(xx - 10, 0); g.lineTo(xx, l); g.lineTo(xx + 10, 0); g.fill(); }); } } }
  ]
});
// Innenräume in Holz und Stein, warm von Kerzen
THEMEN.haus = Object.assign({}, THEMEN.kapelle, {
  himmel: ['#060504', '#0c0a08', '#14110d'], rim: 'rgba(230,205,170,.7)', rimFig: 'rgba(220,195,160,.45)',
  wand: '#120e0b', dunkel: .35, teilchen: 'staub',
  ebenen: [{ par: .15, base: .6, male(g, w, h, R){ g.fillStyle = verlauf(g, 0, h, ['#0e0b09', '#16120e']); g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 2; for (let x = 0; x < w; x += 34){ g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } } }]
});
// Gruft: kälter und dunkler als die Kapelle
THEMEN.gruft = Object.assign({}, THEMEN.kapelle, { himmel: ['#030405', '#06080a', '#0a0d10'], dunkel: .55, wand: '#0a0c10', teilchen: 'staub' });
// Hafenbecken: leergelaufen, Algen, Ketten
THEMEN.becken = Object.assign({}, THEMEN.hafen, { dunkel: .35, regen: .2, blitz: false, nebel: 1.2 });
