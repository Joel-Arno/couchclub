#!/usr/bin/env node
/* Prüft die Karten von Akt I: Ist alles erreichbar, mit der echten Sprung- und Kletterphysik?
   Aufruf: node mond/werkzeug/pruefe-karten.js [--zeige GEBIET]
   Simuliert von jedem Standplatz aus Laufen, Springen (verschiedene Weiten), Fallen, Leitern und
   Stege. Hebel, Schlüssel, brüchige Wände, Riegel und die Brücke werden nach und nach geöffnet,
   sobald man sie erreicht. Am Ende steht, was nicht erreichbar ist. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = path.join(__dirname, '..', 'src');
const ctx = { console, Math, Object, Array, Set, Map, JSON, Uint8Array, Number, String, Infinity, NaN };
ctx.window = ctx; ctx.EMB = null; ctx.location = { hash: '' };
ctx.lerp = (a, b, t) => a + (b - a) * t; ctx.clamp = (v, a, b) => Math.max(a, Math.min(b, v)); ctx.rnd = Math.random;
ctx.Path2D = class { moveTo(){} lineTo(){} closePath(){} };
vm.createContext(ctx);
const lade = f => vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8').replace(/^const (\w+) =/gm, 'var $1 =').replace(/^let (\w+) =/gm, 'var $1 ='), ctx, { filename: f });
// Nur was die Prüfung braucht; Stubs für Dinge, die erst im Spiel laufen
vm.runInContext('var LOOK = {}; var SETS = {}; var TAU = Math.PI * 2; function mkPose(){ return {}; }', ctx);
['level.js', 'daten-kampf.js', 'daten-welt.js', 'lore.js', 'karten-bild.js', 'karten.js', 'skripte.js'].forEach(lade);
const { GEBIETE, START, ladeGebiet, istFest, traegt, kachel, tileAt, setzeKachel, bodenUnter, wasserAn, K, T, FEINDE, LORE, SKRIPTE, GEGENSTAENDE, TALISMANE, NPC, GESPRAECHE } = ctx;
const PHYS = { lauf: 170, beschl: 1500, luft: 950, g: 1750, sprung: 505, fallMax: 900, kletter: 115, hw: 9, hoehe: 74 };

/* ---------- Welt mit Zustand: zerbrochen, geöffnet ---------- */
const bruch = {}, offen = {}, items = {};
const gebiete = {};
function G_(id){
  if (!gebiete[id]){
    const G = ladeGebiet(id);
    gebiete[id] = G;
  }
  return gebiete[id];
}
function wendeZustandAn(id){
  const G = G_(id);
  for (const b of G.F.brueche.slice()) if (bruch[id + ':' + b.tx]) for (let y = b.ty0; y < b.ty1; y++) setzeKachel(G, b.tx, y, K.luft);
  for (const g of G.gitter) if (offen[id + ':g' + g.tx]) for (let y = g.ty0; y < g.ty1; y++) setzeKachel(G, g.tx, y, K.luft);
}

/* ---------- Physik, wie in erkundung.js ---------- */
function blockiertX(G, nx, y){
  const c0 = tileAt(nx - PHYS.hw), c1 = tileAt(nx + PHYS.hw), r0 = tileAt(y - PHYS.hoehe + 1), r1 = tileAt(y - 1);
  for (let tx = c0; tx <= c1; tx++) for (let ty = r0; ty <= r1; ty++) if (istFest(G, tx, ty)) return [tx, ty];
  return null;
}
function kopfStoss(G, x, y){ const c0 = tileAt(x - PHYS.hw), c1 = tileAt(x + PHYS.hw), r = tileAt(y - PHYS.hoehe); for (let tx = c0; tx <= c1; tx++) if (istFest(G, tx, r)) return true; return false; }
function bewegeX(G, S, dx){
  if (!dx) return;
  const nx = S.x + dx, b = blockiertX(G, nx, S.y);
  if (!b){ S.x = nx; return; }
  if (S.boden){ const stufe = tileAt(S.y - 1) * T; if (S.y - stufe <= T + .5 && !blockiertX(G, nx, stufe) && !kopfStoss(G, S.x, stufe)){ S.y = stufe; S.x = nx; return; } }
  S.x = dx > 0 ? b[0] * T - PHYS.hw - .01 : (b[0] + 1) * T + PHYS.hw + .01; S.vx = 0;
}
function bewegeY(G, S, dy){
  const c0 = tileAt(S.x - PHYS.hw + 1), c1 = tileAt(S.x + PHYS.hw - 1);
  if (dy > 0){
    const ny = S.y + dy, r = tileAt(ny), top = r * T;
    for (let tx = c0; tx <= c1; tx++){
      const fest = istFest(G, tx, r), tr = traegt(G, tx, r) && S.y <= top + .5 && S.stegAus <= 0;
      if ((fest || tr) && ny >= top){ S.y = top; S.vy = 0; return true; }
    }
    S.y = ny; return false;
  }
  const ny = S.y + dy, r = tileAt(ny - PHYS.hoehe);
  for (let tx = c0; tx <= c1; tx++) if (istFest(G, tx, r)){ S.y = (r + 1) * T + PHYS.hoehe; S.vy = 0; return false; }
  S.y = ny; return false;
}
function stehtAuf(G, S){
  const c0 = tileAt(S.x - PHYS.hw + 1), c1 = tileAt(S.x + PHYS.hw - 1), r = tileAt(S.y + .5);
  if (Math.abs(S.y - r * T) > .6) return false;
  for (let tx = c0; tx <= c1; tx++) if (istFest(G, tx, r) || (traegt(G, tx, r) && S.stegAus <= 0)) return true;
  return false;
}
// Eine Bewegung simulieren. plan: { ix(t), halt(t), sprung, vx0, vy0, steg, dauer }
function sim(G, x, y, plan){
  const S = { x, y, vx: plan.vx0 || 0, vy: plan.vy0 || 0, boden: !plan.inLuft, stegAus: plan.steg ? 220 : 0 };
  const dt = 16, s = dt / 1000; let t = 0, luft = false;
  if (plan.sprung){
    const w = wasserAn(G, S.x, S.y - 4), tief = w ? S.y - w.y0 : 0;
    if (plan.steg){ S.y += 2; S.boden = false; }
    else { S.vy = -PHYS.sprung * (w && tief > 40 ? .75 : 1); S.boden = false; }
  }
  while (t < (plan.dauer || 1600)){
    t += dt;
    S.stegAus -= dt;
    const w = wasserAn(G, S.x, S.y - 4), tief = w ? S.y - w.y0 : 0;
    const ix = plan.ix(t), langsam = w ? (tief > 40 ? .5 : .72) : 1;
    const ziel = ix * PHYS.lauf * langsam, a = (S.boden ? PHYS.beschl : PHYS.luft) * s;
    S.vx = S.vx < ziel ? Math.min(ziel, S.vx + a) : Math.max(ziel, S.vx - a);
    if (!plan.halt(t) && S.vy < -150) S.vy *= Math.pow(.86, dt / 16);
    S.vy = Math.min(PHYS.fallMax * (w ? .45 : 1), S.vy + PHYS.g * s * (w ? .5 : 1));
    const vy = S.vy;
    bewegeX(G, S, S.vx * s);
    const gel = bewegeY(G, S, S.vy * s);
    S.boden = gel || (S.vy >= 0 && stehtAuf(G, S));
    if (!S.boden) luft = true;
    if (w && tief > 76) return { tod: 'wasser' };
    if (S.y > G.Hh + T * 4) return { tod: 'sturz' };
    const k = kachel(G, tileAt(S.x), tileAt(S.y - 4));
    if (k === K.stachel) return { tod: 'stachel' };
    if (S.x < -PHYS.hw) return { rand: 'l', y: S.y };
    if (S.x > G.W + PHYS.hw) return { rand: 'r', y: S.y };
    if (S.boden && (luft || plan.lauf) && (!plan.lauf || Math.abs(S.x - x) >= T * .95)) return { x: S.x, y: S.y };
    if (S.boden && !luft && !plan.lauf && t > 60) return { x: S.x, y: S.y };
  }
  return S.boden ? { x: S.x, y: S.y } : null;
}
const leiterAn = (G, x, y) => kachel(G, tileAt(x), tileAt(y)) === K.leiter;
// Klettern wie in erkundung.js: richtung -1 hinauf, 1 hinunter
function klettern(G, x0, y0, richtung){
  const S = { x: (tileAt(x0) + .5) * T, y: y0 };
  if (richtung < 0 && !leiterAn(G, S.x, S.y - 30)) return null;
  if (richtung > 0){ if (!leiterAn(G, S.x, S.y + 2)) return null; S.y += 3; }
  for (let t = 0; t < 30000; t += 16){
    S.y += richtung * PHYS.kletter * .016;
    if (!leiterAn(G, S.x, S.y - 4) && !leiterAn(G, S.x, S.y - 40)) return { x: S.x, y: S.y, luft: true };
    if (richtung < 0 && !leiterAn(G, S.x, S.y - 8)){ S.y = tileAt(S.y) * T; return { x: S.x, y: S.y }; }
    if (richtung > 0 && istFest(G, tileAt(S.x), tileAt(S.y + 1))){ S.y = tileAt(S.y + 1) * T; return { x: S.x, y: S.y }; }
  }
  return null;
}

/* ---------- Standplätze und Kanten eines Gebiets ---------- */
function standplatz(G, tx, ty){
  // Stehen auf Kachel (tx, ty): Boden trägt, darüber frei für den Körper
  if (!(istFest(G, tx, ty) || traegt(G, tx, ty))) return false;
  const x = (tx + .5) * T, y = ty * T;
  if (blockiertX(G, x, y)) return false;
  const w = wasserAn(G, x, y - 4);
  if (w && y - w.y0 > 76) return false;
  if (kachel(G, tx, ty - 1) === K.stachel) return false;
  return true;
}
const plaene = [];
for (const d of [-1, 1]){
  plaene.push({ lauf: true, ix: () => d, halt: () => false, dauer: 1400 });
  for (const cut of [1e9, 90, 160, 240, 330, 450]) for (const vx0 of [0, d * PHYS.lauf, d * PHYS.lauf * .5]){
    plaene.push({ sprung: true, vx0, ix: t => t < cut ? d : 0, halt: () => true });
  }
  plaene.push({ sprung: true, vx0: d * 60, ix: t => t < 80 ? d : 0, halt: t => t < 90 });
}
plaene.push({ sprung: true, ix: () => 0, halt: () => true });
function kanten(id){
  const G = G_(id), out = new Map();
  const knoten = [];
  for (let ty = 0; ty <= G.h; ty++) for (let tx = 0; tx < G.w; tx++) if (standplatz(G, tx, ty)) knoten.push([tx, ty]);
  const snap = (x, y) => tileAt(x) + ',' + Math.round(y / T);
  for (const [tx, ty] of knoten){
    const k = tx + ',' + ty, x = (tx + .5) * T, y = ty * T, ziele = new Set();
    for (const p of plaene){
      const r = sim(G, x, y, p);
      if (!r || r.tod) continue;
      if (r.rand){ ziele.add('rand:' + r.rand); continue; }
      ziele.add(snap(r.x, r.y));
    }
    // Durch einen Steg fallen
    if (kachel(G, tx, ty) === K.steg){ const r = sim(G, x, y, { sprung: true, steg: true, ix: () => 0, halt: () => false }); if (r && !r.tod && !r.rand) ziele.add(snap(r.x, r.y)); }
    // Leiter: nach oben oder unten bis zum Ende, und von jeder Sprosse abspringen
    if (leiterAn(G, x, y - 30) || leiterAn(G, x, y + 2)){
      let top = null, bot = null;
      let ry = tileAt(y - 30); if (!leiterAn(G, x, ry * T + 1)) ry = tileAt(y + 2);
      let a = ry; while (kachel(G, tx, a - 1) === K.leiter) a--;
      let b = ry; while (kachel(G, tx, b + 1) === K.leiter) b++;
      top = a; bot = b + 1;
      // Hinauf und hinunter klettern wie im Spiel, dann stehen bleiben (fällt man wieder herunter?)
      for (const r of [klettern(G, x, y, -1), klettern(G, x, y, 1)]){
        if (!r) continue;
        const s2 = sim(G, r.x, r.y, { ix: () => 0, halt: () => false, dauer: 400 });
        if (s2 && !s2.tod && !s2.rand) ziele.add(snap(s2.x, s2.y));
      }
      for (let yy = a + 1; yy <= b + 1; yy++) for (const d of [-1, 1]){
        const r = sim(G, x, yy * T, { sprung: false, inLuft: true, vx0: d * PHYS.lauf * .6, vy0: -PHYS.sprung * .6, ix: () => d, halt: () => true });
        if (r && !r.tod && !r.rand) ziele.add(snap(r.x, r.y));
      }
    }
    ziele.delete(k);
    out.set(k, ziele);
  }
  return out;
}

/* ---------- Die ganze Welt ---------- */
const ergebnis = { erreicht: {}, ents: {} };
function entPos(G, a){
  const p = G.anker[a]; if (!p) return null;
  const def = G.def.o[a], x = (p[0] + .5) * T;
  const y = def && def.schwebt ? (p[1] + 1) * T : bodenUnter(G, x, (p[1] + 1) * T - T * .5);
  return { x, y, tx: p[0], ty: Math.round(y / T) };
}
function inReichweite(G, knotenSet, e, reich = 1.8){
  for (const k of knotenSet){
    const [tx, ty] = k.split(',').map(Number), x = (tx + .5) * T, y = ty * T;
    if (Math.abs(e.x - x) <= T * reich + T * .5 && Math.abs(e.y - y) <= T * 2.2) return true;
  }
  return false;
}
function laufe(){
  const cache = {};
  const kan = id => cache[id] || (cache[id] = kanten(id));
  const erreicht = {};
  const warte = [];
  const besuche = (id, k) => { erreicht[id] = erreicht[id] || new Set(); if (!erreicht[id].has(k)){ erreicht[id].add(k); warte.push([id, k]); } };
  const ankunft = (ziel) => {
    const [g, a] = ziel.split(':'); const G = G_(g), e = entPos(G, a);
    if (!e){ console.log('FEHLER Ziel ohne Anker:', ziel); return; }
    // Auf den nächsten Standplatz stellen
    const k = tileAt(e.x) + ',' + Math.round(e.y / T);
    besuche(g, k);
  };
  let geaendert = true, runden = 0;
  const start = entPos(G_(START.gebiet), START.anker);
  besuche(START.gebiet, tileAt(start.x) + ',' + Math.round(start.y / T));
  const erledigt = new Set();
  while (geaendert && runden < 40){
    geaendert = false; runden++;
    while (warte.length){
      const [id, k] = warte.pop(), E = kan(id).get(k);
      if (!E){ continue; }
      const G = G_(id);
      for (const z of E){
        if (z.startsWith('rand:')){ const ziel = (G.def.links || {})[z.slice(5)]; if (ziel) ankunft(ziel); continue; }
        besuche(id, z);
      }
    }
    // Übergänge, Gegenstände, Hebel, Wände
    for (const id in erreicht){
      const G = G_(id), R = erreicht[id], O = G.def.o || {};
      for (const a in O){
        const d = O[a], e = entPos(G, a); if (!e) continue;
        const reich = d.t === 'tuer' ? 1.2 : 1.8;
        let da = false;
        if (d.t === 'ausgang' || d.t === 'ereignis'){
          const w = (d.breite || (d.t === 'ausgang' ? 1 : 2)) * T, h = (d.hoch || (d.t === 'ausgang' ? 2 : 4)) * T;
          for (const k of R){ const [tx, ty] = k.split(',').map(Number), x = (tx + .5) * T, y = ty * T; if (x > e.x - w / 2 - T * .5 && x < e.x + w / 2 + T * .5 && y > e.y - h && y <= e.y + T){ da = true; break; } }
        } else da = inReichweite(G, R, e, reich);
        if (!da) continue;
        const key = id + ':' + a;
        ergebnis.ents[key] = true;
        if (erledigt.has(key)) continue;
        const gib = g => { if (!g) return; if (g.item){ const L = Array.isArray(g.item) ? (Array.isArray(g.item[0]) ? g.item : [g.item]) : [[g.item, 1]]; L.forEach(([i]) => { items[i] = true; }); } };
        if (['gegenstand', 'leiche', 'truhe', 'untersuchen', 'boss'].includes(d.t)){ gib(d.gibt); gib(d.beute); erledigt.add(key); geaendert = true; }
        if (d.t === 'ausgang'){ ankunft(d.ziel); erledigt.add(key); geaendert = true; }
        if (d.t === 'tuer'){
          const eigen = id + ':' + (d.id || a);
          const auf = !d.zu && !d.einweg && !d.riegel || offen[eigen] || (d.zu && items[d.zu]) || d.riegel;
          if (d.riegel){ offen[eigen] = true; if (d.paar) offen[d.paar] = true; }
          if (auf){ ankunft(d.ziel); erledigt.add(key); geaendert = true; }
        }
        if (d.t === 'hebel' && (!d.zu || items[d.zu])){
          const col = G.anker[d.oeffnet] && G.anker[d.oeffnet][0];
          if (col != null && !offen[id + ':g' + col]){ offen[id + ':g' + col] = true; wendeZustandAn(id); delete cache[id]; R.forEach(k => warte.push([id, k])); }
          erledigt.add(key); geaendert = true;
        }
        if (d.t === 'ereignis' && d.skript === 'bruecke_einsturz'){
          for (let x = d.von; x <= d.bis; x++) bruch[id + ':' + x] = true;
          wendeZustandAn(id); delete cache[id]; R.forEach(k => warte.push([id, k]));
          erledigt.add(key); geaendert = true;
        }
      }
      // brüchige Wände neben erreichten Plätzen
      for (const b of G.F.brueche){
        if (bruch[id + ':' + b.tx]) continue;
        for (const k of R){
          const [tx, ty] = k.split(',').map(Number), y = ty * T, hr = tileAt(y - 30);
          if (Math.abs(tx - b.tx) === 1 && hr >= b.ty0 - 1 && hr <= b.ty1){ bruch[id + ':' + b.tx] = true; wendeZustandAn(id); delete cache[id]; R.forEach(kk => warte.push([id, kk])); geaendert = true; break; }
        }
      }
    }
    if (warte.length) geaendert = true;
  }
  return erreicht;
}

/* ---------- Auswertung ---------- */
const fehler = [];
// Daten prüfen
for (const id in GEBIETE){
  const d = GEBIETE[id];
  if (!d.karte) fehler.push(`${id}: keine Karte`);
  for (const [a, o] of Object.entries(d.o || {})){
    if (o.t === 'feind' && !FEINDE[o.g]) fehler.push(`${id}:${a} Gegner unbekannt: ${o.g}`);
    if (o.t === 'boss' && !FEINDE[o.boss]) fehler.push(`${id}:${a} Boss unbekannt: ${o.boss}`);
    if ((o.t === 'schrift' || o.lore) && o.lore && !LORE[o.lore]) fehler.push(`${id}:${a} Lore fehlt: ${o.lore}`);
    if (o.t === 'schrift' && !o.lore) fehler.push(`${id}:${a} Schrift ohne Lore`);
    if (o.t === 'ereignis' && !SKRIPTE[o.skript]) fehler.push(`${id}:${a} Skript fehlt: ${o.skript}`);
    if (o.t === 'npc' && !NPC[o.id]) fehler.push(`${id}:${a} Figur unbekannt: ${o.id}`);
    for (const z of [o.ziel].filter(Boolean)){ const [g, an] = z.split(':'); if (!GEBIETE[g] || !(an in (GEBIETE[g].o || {}))) fehler.push(`${id}:${a} Ziel fehlt: ${z}`); }
    const g = o.gibt || o.beute;
    if (g){
      const L = g.item ? (Array.isArray(g.item) ? (Array.isArray(g.item[0]) ? g.item : [g.item]) : [[g.item, 1]]) : [];
      L.forEach(([i]) => { if (!GEGENSTAENDE[i]) fehler.push(`${id}:${a} Gegenstand unbekannt: ${i}`); });
      if (g.tal && !TALISMANE[g.tal]) fehler.push(`${id}:${a} Talisman unbekannt: ${g.tal}`);
    }
  }
  for (const z of Object.values(d.links || {})){ const [g, an] = z.split(':'); if (!GEBIETE[g] || !(an in (GEBIETE[g].o || {}))) fehler.push(`${id}: Randziel fehlt: ${z}`); }
  if (d.betreten && !SKRIPTE[d.betreten]) fehler.push(`${id}: Betreten-Skript fehlt: ${d.betreten}`);
  const G = G_(id);
  for (const a in d.o || {}) if (!G.anker[a]) fehler.push(`${id}: Anker ${a} fehlt in der Karte`);
}
for (const k in GESPRAECHE){ const g = GESPRAECHE[k]; for (const [n, node] of Object.entries(g.k)) for (const a of node.a || []) if (a.go && !g.k[a.go]) fehler.push(`Gespräch ${k}.${n}: Knoten ${a.go} fehlt`); }
for (const k in FEINDE) if (FEINDE[k].boss && !SKRIPTE['vor_' + k]) console.log('Hinweis: kein vor_-Skript für', k);

const erreicht = laufe();
const unerreicht = [];
for (const id in GEBIETE){
  if (!erreicht[id]){ unerreicht.push(`${id}: GEBIET NICHT ERREICHT`); continue; }
  for (const a in GEBIETE[id].o || {}){
    const d = GEBIETE[id].o[a];
    if (['start', 'licht', 'deko'].includes(d.t)) continue;
    if (d.t === 'eingang') continue;
    if (!ergebnis.ents[id + ':' + a]) unerreicht.push(`${id}:${a} (${d.t}${d.g ? ' ' + d.g : ''}${d.id ? ' ' + d.id : ''}${d.skript ? ' ' + d.skript : ''})`);
  }
}
// Festsitzen: von jedem erreichten Platz muss ein Ausgang, eine Tür, ein Rand mit Ziel oder ein Feuer erreichbar sein
const fallen = [];
for (const id in erreicht){
  const G = G_(id), E = kanten(id), O = G.def.o || {}, R = erreicht[id];
  const raus = new Set();
  for (const [k, z] of E){
    if ([...z].some(v => v.startsWith('rand:') && (G.def.links || {})[v.slice(5)])) raus.add(k);
    const [tx, ty] = k.split(',').map(Number), x = (tx + .5) * T, y = ty * T;
    for (const a in O){
      const d = O[a]; if (!['tuer', 'ausgang', 'feuer'].includes(d.t)) continue;
      const e = entPos(G, a); if (Math.abs(e.x - x) <= T * 1.8 && Math.abs(e.y - y) <= T * 2.2) raus.add(k);
    }
  }
  // rückwärts: wer kommt zu einem Ausgang?
  const rueck = new Map();
  for (const [k, z] of E) for (const v of z) if (!v.startsWith('rand:')){ if (!rueck.has(v)) rueck.set(v, []); rueck.get(v).push(k); }
  const gut = new Set(raus), q = [...raus];
  while (q.length){ const k = q.pop(); for (const p of rueck.get(k) || []) if (!gut.has(p)){ gut.add(p); q.push(p); } }
  const schlecht = [...R].filter(k => E.has(k) && !gut.has(k));
  if (schlecht.length) fallen.push(`${id}: ${schlecht.length} Plätze ohne Rückweg, z. B. ${schlecht.slice(0, 6).join(' ')}`);
}
if (fallen.length){ console.log('\nFESTSITZEN MÖGLICH:'); fallen.forEach(f => console.log('  ' + f)); }
console.log('Gebiete erreicht:', Object.keys(erreicht).length, 'von', Object.keys(GEBIETE).length);
console.log('Gegenstände/Schlüssel:', Object.keys(items).join(', '));
if (fehler.length){ console.log('\nFEHLER IN DEN DATEN:'); fehler.forEach(f => console.log('  ' + f)); }
if (unerreicht.length){ console.log('\nNICHT ERREICHBAR:'); unerreicht.forEach(f => console.log('  ' + f)); }
if (!fehler.length && !unerreicht.length) console.log('Alles erreichbar.');

// Karte eines Gebiets mit erreichten Plätzen zeigen
const zi = process.argv.indexOf('--zeige');
if (zi > 0){
  const id = process.argv[zi + 1], G = G_(id), R = erreicht[id] || new Set();
  const rows = GEBIETE[id].karte.map(r => r.padEnd(G.w, ' ').split(''));
  for (const k of R){ const [tx, ty] = k.split(',').map(Number); if (ty - 1 >= 0 && rows[ty - 1] && rows[ty - 1][tx] === ' ') rows[ty - 1][tx] = '·'; }
  console.log(rows.map((r, i) => String(i).padStart(2) + ' ' + r.join('')).join('\n'));
}
process.exit(fehler.length || unerreicht.length ? 1 : 0);
