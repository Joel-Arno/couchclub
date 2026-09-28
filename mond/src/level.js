/* =====================================================================
   LEVEL: Gebiete aus Textkarten, Kollision und Geländeformen
   Eine Karte besteht aus Zeilen von oben nach unten, ein Zeichen pro Kachel:
     #  Fels und Erde        X  Mauerwerk          W  Holz (Wrack, Planken)
     =  Steg, von unten durchlässig                H  Leiter
     ~  Wasser               ^  Stacheln aus Salz oder Eisen
     %  brüchige Wand        |  Gitter, öffnet sich über einen Hebel
     .  oder Leerzeichen: Luft
   Buchstaben und Ziffern (außer H, W, X) sind Anker für Objekte, die im
   Gebiet unter „o“ beschrieben sind. Der Anker steht auf der Kachel über
   dem Boden, das Objekt steht also auf dem Boden darunter.
   ===================================================================== */
const T = 24;
const K = { luft: 0, fels: 1, mauer: 2, holz: 3, steg: 4, leiter: 5, wasser: 6, stachel: 7, bruch: 8, gitter: 9 };
const ZEICHEN = { '#': K.fels, 'X': K.mauer, 'W': K.holz, '=': K.steg, 'H': K.leiter, '~': K.wasser, '^': K.stachel, '%': K.bruch, '|': K.gitter };
const FEST = new Set([K.fels, K.mauer, K.holz, K.bruch, K.gitter]);

function ladeGebiet(id){
  const def = GEBIETE[id];
  const rows = def.karte;
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const grid = new Uint8Array(w * h);
  const anker = {};
  for (let y = 0; y < h; y++){
    const r = rows[y];
    for (let x = 0; x < w; x++){
      const c = r[x] || ' ';
      if (ZEICHEN[c] != null) grid[y * w + x] = ZEICHEN[c];
      else if (/[A-Za-z0-9]/.test(c)) anker[c] = [x, y];
    }
  }
  const G = { id, def, w, h, grid, anker, W: w * T, Hh: h * T, offen: {} };
  G.hinten = (def.hinten || []).map(([x0, y0, x1, y1]) => [x0 * T, y0 * T, (x1 + 1) * T, (y1 + 1) * T]);
  G.wasser = wasserFlaechen(G);
  // Gitter merken, bevor sie sich öffnen: gezeichnet werden sie auch offen (hochgezogen)
  G.gitter = [];
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++){
    if (grid[y * w + x] !== K.gitter || (y > 0 && grid[(y - 1) * w + x] === K.gitter)) continue;
    let y1 = y; while (y1 < h && grid[y1 * w + x] === K.gitter) y1++;
    G.gitter.push({ x: x * T, y0: y * T, y1: y1 * T, tx: x, ty0: y, ty1: y1, auf: 0 });
  }
  baueFormen(G);
  return G;
}

/* ---------- Abfragen ---------- */
function kachel(G, tx, ty){
  if (tx < 0) tx = 0; else if (tx >= G.w) tx = G.w - 1;   // links und rechts geht der Rand weiter
  if (ty < 0) return K.luft;
  if (ty >= G.h) return K.fels;
  return G.grid[ty * G.w + tx];
}
function istFest(G, tx, ty){ return FEST.has(kachel(G, tx, ty)); }
// Oberkante einer Leiter trägt wie ein Steg
function traegt(G, tx, ty){
  const k = kachel(G, tx, ty);
  return k === K.steg || (k === K.leiter && kachel(G, tx, ty - 1) !== K.leiter);
}
const tileAt = v => Math.floor(v / T);
function setzeKachel(G, tx, ty, k){ G.grid[ty * G.w + tx] = k; }
// Boden unter einem Punkt (Weltkoordinaten), sucht nach unten
function bodenUnter(G, x, y){
  const tx = tileAt(x);
  for (let ty = Math.max(0, tileAt(y)); ty < G.h + 1; ty++) if (istFest(G, tx, ty) || traegt(G, tx, ty)) return ty * T;
  return G.Hh;
}
// Freie Sicht zwischen zwei Punkten (für Gegner, die den Spieler bemerken)
function sicht(G, x0, y0, x1, y1){
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (T / 2));
  for (let i = 1; i < n; i++){ const u = i / n; if (istFest(G, tileAt(lerp(x0, x1, u)), tileAt(lerp(y0, y1, u)))) return false; }
  return true;
}
function wasserFlaechen(G){
  // Zusammenhängende Wasserkacheln zu Becken. Pro Spalte: Oberfläche und Grund.
  const seen = new Uint8Array(G.w * G.h), out = [];
  const ist = (x, y) => x >= 0 && y >= 0 && x < G.w && y < G.h && G.grid[y * G.w + x] === K.wasser;
  for (let i = 0; i < G.w * G.h; i++){
    if (seen[i] || G.grid[i] !== K.wasser) continue;
    const q = [i], sp = {}; seen[i] = 1;
    let minX = 1e9, maxX = -1;
    while (q.length){
      const j = q.pop(), x = j % G.w, y = (j - x) / G.w;
      const c = sp[x] || (sp[x] = [y, y + 1]); c[0] = Math.min(c[0], y); c[1] = Math.max(c[1], y + 1);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){
        const nx = x + dx, ny = y + dy;
        if (ist(nx, ny) && !seen[ny * G.w + nx]){ seen[ny * G.w + nx] = 1; q.push(ny * G.w + nx); }
      }
    }
    const spalten = [];
    for (let x = minX; x <= maxX; x++) spalten.push(sp[x] ? [sp[x][0] * T, sp[x][1] * T] : null);
    const tops = spalten.filter(Boolean).map(c => c[0]), bots = spalten.filter(Boolean).map(c => c[1]);
    out.push({ tx0: minX, x0: minX * T, x1: (maxX + 1) * T, y0: Math.min(...tops), y1: Math.max(...bots), spalten });
  }
  return out;
}
// Welche Wasserfläche an einem Punkt? Liefert die Oberfläche (y0) in dieser Spalte
function wasserAn(G, x, y){
  for (const r of G.wasser){
    if (x < r.x0 || x >= r.x1) continue;
    const c = r.spalten[Math.floor(x / T) - r.tx0];
    if (c && y > c[0] && y <= c[1] + T * .5) return { y0: c[0], y1: c[1] };
  }
  return null;
}

/* ---------- Formen: Umrisse der festen Bereiche ---------- */
// Kanten zwischen festen und freien Kacheln, im Uhrzeigersinn um das Feste
function umrisse(G, pruef){
  const pad = 3, W = G.w + pad * 2, H = G.h + pad;
  // Außerhalb des erweiterten Rahmens ist nichts fest, damit sich jeder Umriss schließt
  const fest = (x, y) => {
    if (x < 0 || x >= W || y < 0 || y >= H) return false;
    if (y >= G.h) return pruef(K.fels);
    return pruef(kachel(G, x - pad, y));
  };
  const key = (x, y) => x * 4096 + y;
  const edges = new Map();
  const add = (x0, y0, x1, y1) => { const k = key(x0, y0); if (!edges.has(k)) edges.set(k, []); edges.get(k).push([x0, y0, x1, y1]); };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++){
    if (!fest(x, y)) continue;
    if (!fest(x, y - 1)) add(x, y, x + 1, y);
    if (!fest(x + 1, y)) add(x + 1, y, x + 1, y + 1);
    if (!fest(x, y + 1)) add(x + 1, y + 1, x, y + 1);
    if (!fest(x - 1, y)) add(x, y + 1, x, y);
  }
  const loops = [];
  const used = new Set();
  for (const [, list] of edges) for (const e of list){
    if (used.has(e)) continue;
    const loop = [];
    let cur = e, guard = 0;
    while (cur && !used.has(cur) && guard++ < 100000){
      used.add(cur); loop.push([cur[0], cur[1]]);
      const next = edges.get(key(cur[2], cur[3]));
      if (!next) break;
      const cand = next.filter(n => !used.has(n));
      if (!cand.length) break;
      // Bei Berührung über Eck: rechts abbiegen, damit Bereiche getrennt bleiben
      const dx = cur[2] - cur[0], dy = cur[3] - cur[1];
      cand.sort((a, b) => turn(dx, dy, a) - turn(dx, dy, b));
      cur = cand[0];
    }
    if (loop.length > 2) loops.push(loop.map(([x, y]) => [(x - pad) * T, y * T]));
  }
  return loops;
}
function turn(dx, dy, e){ const ex = e[2] - e[0], ey = e[3] - e[1], cr = dx * ey - dy * ex; return cr > 0 ? 0 : cr === 0 ? 1 : 2; }
// Gerade Stücke zusammenfassen
function vereinfache(loop){
  const out = [];
  for (let i = 0; i < loop.length; i++){
    const a = loop[(i - 1 + loop.length) % loop.length], b = loop[i], c = loop[(i + 1) % loop.length];
    if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) !== 0) out.push(b);
  }
  return out;
}
function unterteile(loop, step){
  const out = [];
  for (let i = 0; i < loop.length; i++){
    const a = loop[i], b = loop[(i + 1) % loop.length], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 0; k < n; k++) out.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]);
  }
  return out;
}
function chaikin(loop, n){
  for (let it = 0; it < n; it++){
    const out = [];
    for (let i = 0; i < loop.length; i++){
      const a = loop[i], b = loop[(i + 1) % loop.length];
      out.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]);
    }
    loop = out;
  }
  return loop;
}
// Ortsfestes Rauschen, damit Felsen bei jedem Laden gleich aussehen
function hash2(x, y){ let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function rauhe(loop, amp){
  return loop.map((p, i) => {
    const a = loop[(i - 1 + loop.length) % loop.length], b = loop[(i + 1) % loop.length];
    let nx = b[1] - a[1], ny = -(b[0] - a[0]); const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    // Oberseiten nur wenig verformen, damit man sichtbar auf dem Boden steht
    const k = ny < -.6 ? .2 : 1, r = (hash2(Math.round(p[0]), Math.round(p[1])) - .5) * 2 * amp * k;
    return [p[0] + nx * r, p[1] + ny * r];
  });
}
function baueFormen(G){
  const stil = G.def.stil || {};
  const F = {};
  const pfad = (loops, fn) => { const p = new Path2D(); loops.forEach(l => { const q = fn(l); if (q.length < 3) return; p.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) p.lineTo(q[i][0], q[i][1]); p.closePath(); }); return p; };
  const fels = umrisse(G, k => k === K.fels || k === K.bruch).map(vereinfache).filter(l => l.length > 2);
  const felsFn = l => chaikin(rauhe(unterteile(l, T * .5), stil.rauh == null ? 3.5 : stil.rauh), 2);
  F.felsLoops = fels.map(felsFn);
  F.fels = pfad(F.felsLoops, l => l);
  const mauer = umrisse(G, k => k === K.mauer).map(vereinfache).filter(l => l.length > 2);
  F.mauerLoops = mauer;
  F.mauer = pfad(mauer, l => l);
  const holz = umrisse(G, k => k === K.holz).map(vereinfache).filter(l => l.length > 2);
  F.holzLoops = holz.map(l => chaikin(unterteile(l, T), 1));
  F.holz = pfad(F.holzLoops, l => l);
  // Lichtkanten: Stücke der Umrisse, deren Außenseite nach oben zeigt
  F.kante = new Path2D(); F.kanteSeiten = new Path2D();
  const kanten = [];
  [F.felsLoops, F.mauerLoops, F.holzLoops].forEach(ls => ls.forEach(l => {
    for (let i = 0; i < l.length; i++){
      const a = l[i], b = l[(i + 1) % l.length], nx = b[1] - a[1], ny = -(b[0] - a[0]), len = Math.hypot(nx, ny) || 1;
      // Umlauf im Uhrzeigersinn: die Normale (dy, -dx) zeigt nach außen
      const up = -ny / len;
      if (up > .45){ F.kante.moveTo(a[0], a[1]); F.kante.lineTo(b[0], b[1]); kanten.push([a, b]); }
      else if (Math.abs(nx / len) > .7){ F.kanteSeiten.moveTo(a[0], a[1]); F.kanteSeiten.lineTo(b[0], b[1]); }
    }
  }));
  F.kanten = kanten;
  // Fugen im Mauerwerk
  F.fugen = new Path2D();
  for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++){
    if (G.grid[y * G.w + x] !== K.mauer) continue;
    const X = x * T, Y = y * T;
    F.fugen.moveTo(X, Y + T); F.fugen.lineTo(X + T, Y + T);
    const off = (y % 2) ? T * .5 : 0;
    F.fugen.moveTo(X + off, Y); F.fugen.lineTo(X + off, Y + T);
  }
  // Stege, Leitern, Stacheln, Gitter und brüchige Wände werden einzeln gezeichnet
  F.stege = []; F.leitern = []; F.stacheln = []; F.brueche = [];
  for (let y = 0; y < G.h; y++){
    let x = 0;
    while (x < G.w){
      const k = G.grid[y * G.w + x];
      if (k === K.steg || k === K.stachel){
        let x1 = x; while (x1 < G.w && G.grid[y * G.w + x1] === k) x1++;
        (k === K.steg ? F.stege : F.stacheln).push([x * T, y * T, x1 * T]);
        x = x1; continue;
      }
      if (k === K.leiter && (y === 0 || G.grid[(y - 1) * G.w + x] !== K.leiter)){
        let y1 = y; while (y1 < G.h && G.grid[y1 * G.w + x] === K.leiter) y1++;
        F.leitern.push([x * T, y * T, y1 * T]);
      }
      if (k === K.bruch && (y === 0 || G.grid[(y - 1) * G.w + x] !== K.bruch)){
        let y1 = y; while (y1 < G.h && G.grid[y1 * G.w + x] === K.bruch) y1++;
        F.brueche.push({ x: x * T, y0: y * T, y1: y1 * T, tx: x, ty0: y, ty1: y1 });
      }
      x++;
    }
  }
  G.F = F;
}
// Brüchige Wand zerschlagen: Kacheln werden Luft, die Formen neu gebaut
function zerbrich(G, b){
  for (let y = b.ty0; y < b.ty1; y++) setzeKachel(G, b.tx, y, K.luft);
  baueFormen(G);
}
// Gitter öffnen: begehbar sofort, hochgezogen wird es im Bild
function oeffneGitter(G, g, sofort){
  for (let y = g.ty0; y < g.ty1; y++) setzeKachel(G, g.tx, y, K.luft);
  g.offen = true; if (sofort) g.auf = 1;
}
