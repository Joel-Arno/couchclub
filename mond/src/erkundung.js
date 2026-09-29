/* =====================================================================
   ERKUNDUNG: Laufen, Springen, Klettern und alles, was in der Welt steht
   Die Spielfigur ist Stage.P. Gegner, Figuren und Gegenstände sind
   Einträge in ents. Was der Spielstand wissen muss (besiegt, genommen,
   geöffnet), meldet die Erkundung über hook an den Ablauf.
   ===================================================================== */
const HELD_H = 92;
const PHYS = { lauf: 170, beschl: 1500, luft: 950, g: 1750, sprung: 505, fallMax: 900, kletter: 115, rolle: 300, rolleDauer: 320, hw: 9, hoehe: 74, coyote: 90, puffer: 130 };

const Erk = (() => {
  let G = null, ents = [], zeit = 0, aus = false, lastInter = null, DD = null;
  const S = { x: 0, y: 0, vx: 0, vy: 0, boden: false, leiter: false, face: 1, coyote: 0, puffer: 0, rolle: 0, rolleCd: 0, unverw: 0,
    landT: 0, stegAus: 0, sicher: [0, 0], sicherT: 0, wasser: false, tief: 0, schritt: 0, stoss: 0, aktionT: 0, aktionArt: null, fallStart: 0 };
  const hook = { schaden(){}, kampf(){}, boss(){}, dialog(){}, feuer(){}, lesen(){}, beute(){}, tuer(){}, ereignis(){}, merke(){}, hinweis(){}, ausgang(){}, laut(){} };
  const key = id => G.id + ':' + id;

  /* ---------- Gebiet betreten ---------- */
  // wo: Anker-Buchstabe, Eingangs-Id oder { x, y }
  function betrete(id, wo, D){
    G = ladeGebiet(id); DD = D;
    // Was sich schon geändert hat: zerbrochene Wände, offene Gitter
    const kaputt = G.F.brueche.filter(b => D.bruch[key(b.tx + ',' + b.ty0)]);
    if (kaputt.length){ kaputt.forEach(b => { for (let y = b.ty0; y < b.ty1; y++) setzeKachel(G, b.tx, y, K.luft); }); baueFormen(G); }
    G.gitter.forEach(g => { if (D.offen[key('g' + g.tx + ',' + g.ty0)]) oeffneGitter(G, g, true); });
    ents = [];
    const O = G.def.o || {};
    for (const a in O){
      const def = O[a], pos = G.anker[a];
      if (!pos){ console.warn('Anker fehlt', id, a); continue; }
      const e = { a, id: def.id || a, def, typ: def.t, tx: pos[0], ty: pos[1], x: (pos[0] + .5) * T, y: (pos[1] + 1) * T, t: rnd() * 1000 };
      // Auf den Boden stellen, falls der Anker in der Luft steht
      if (!def.schwebt) e.y = bodenUnter(G, e.x, e.y - T * .5);
      if (!erzeuge(e, D)) continue;
      ents.push(e);
    }
    // Startpunkt
    let sx, sy;
    if (typeof wo === 'object' && wo){ sx = wo.x; sy = wo.y; }
    else {
      const e = ents.find(x => (x.typ === 'eingang' && x.id === wo) || x.a === wo) || ents.find(x => x.typ === 'start') || ents[0];
      sx = e ? e.x : T * 2; sy = e ? e.y : bodenUnter(G, T * 2, 0);
      if (e && e.def.richtung) S.face = e.def.richtung;
    }
    Object.assign(S, { x: sx, y: sy, vx: 0, vy: 0, boden: true, leiter: false, rolle: 0, unverw: 800, landT: 0, sicher: [sx, sy], wasser: false, tief: 0, stoss: 0, aktionT: 0 });
    World.setArea(G);
    World.setLights(ents.filter(e => e.licht).map(e => e.licht));
    const P = Stage.P; P.x = S.x; P.gy = S.y; P.face = S.face; P.H = HELD_H; P.poseFn = bewegungsPose; P.bew = { m: 'stand' }; P.alpha = 1; P.hideW = false; P.stance = null; P.anim = null;
    World.release(); World.follow(S.x, S.y, S.face, true);
    aus = false;
    return G;
  }
  // Ein Eintrag aus der Karte wird zum Ding in der Welt. false: gibt es nicht (mehr)
  function erzeuge(e, D){
    const d = e.def;
    if (d.wenn && !d.wenn(D)) return false;
    switch (e.typ){
      case 'feind': {
        if (D.tot[key(e.id)]) return false;
        const k = d.g, F = FEINDE[k];
        e.actor = makeActor({ set: F.set, look: LOOK[F.look || F.set], face: d.blick || -1, H: HELD_H * (LOOK[F.look || F.set].scale || 1) });
        e.actor.poseFn = bewegungsPose; e.actor.bew = { m: 'stand' };
        e.key = k; e.face = d.blick || -1; e.home = e.x; e.zustand = d.liegt ? 'liegt' : d.lauert ? 'lauert' : 'ruhe';
        e.pat = d.patrouille ? [e.x - d.patrouille[0] * T, e.x + d.patrouille[1] * T] : null; e.ziel = null; e.wait = rr(500, 2500);
        e.gruppe = d.gruppe || e.id;
        if (d.liegt){ e.actor.stance = 'lie'; e.actor.pose = mkPose({}, SETS[F.set].lie || SETS[F.set].idle); e.actor.poseFn = null; }
        return true;
      }
      case 'boss': {
        if (D.bosse[d.boss]) return false;
        const F = FEINDE[d.boss];
        e.actor = makeActor({ set: F.set, look: LOOK[F.look || F.set], face: d.blick || -1, H: HELD_H * (LOOK[F.look || F.set].scale || 1) });
        e.key = d.boss; e.zustand = 'wartet';
        return true;
      }
      case 'npc': {
        const n = NPC[d.id];
        e.actor = makeActor({ set: 'npc', look: LOOK[n.look], face: d.blick || -1, H: HELD_H * (LOOK[n.look].scale || 1) });
        if (d.sitzt){ e.actor.stance = 'kneel'; e.actor.pose = mkPose({}, SETS.npc.kneel || SETS.npc.idle); }
        if (n.look === 'enna') e.licht = { x: e.x, y: e.y - 40, r: 110, col: 'rgba(255,200,140,.6)', a: .25, flacker: true };
        return true;
      }
      case 'feuer':
        e.licht = { x: e.x, y: e.y - 30, r: d.brunnen ? 260 : 300, col: 'rgba(255,170,90,.8)', a: D.lit[d.id] ? .38 : .12, flacker: true, hell: 1.8 };
        return true;
      case 'gegenstand': case 'leiche': case 'truhe':
        if (D.genommen[key(e.id)]){ if (e.typ === 'gegenstand') return false; e.leer = true; }
        return true;
      case 'schrift': return true;
      case 'tuer': e.offen = (!d.zu && !d.einweg && !d.riegel) || !!D.offen[key(e.id)]; return true;
      case 'hebel': e.an = !!D.offen[key(e.id)]; return true;
      case 'ereignis': if (d.einmal !== false && D.ereignisse[key(e.id)]) return false; return true;
      case 'licht': e.licht = { x: e.x, y: e.y - (d.hoehe || 2) * T, r: d.r || 140, col: d.farbe || 'rgba(255,190,120,.8)', a: d.a || .3, flacker: d.flacker !== false }; return true;
      case 'nebeltor': if (D.bosse[d.boss]) return false; return true;
      default: return true;
    }
  }

  /* ---------- Kollision ---------- */
  function spalten(x0, x1){ return [tileAt(x0), tileAt(x1)]; }
  function blockiertX(nx, y){
    const [c0, c1] = spalten(nx - PHYS.hw, nx + PHYS.hw), r0 = tileAt(y - PHYS.hoehe + 1), r1 = tileAt(y - 1);
    for (let tx = c0; tx <= c1; tx++) for (let ty = r0; ty <= r1; ty++) if (istFest(G, tx, ty)) return [tx, ty];
    return null;
  }
  function bewegeX(dx){
    if (!dx) return;
    const nx = S.x + dx, b = blockiertX(nx, S.y);
    if (!b){ S.x = nx; return; }
    // Kleine Stufen läuft man hinauf
    if (S.boden && !S.leiter){
      const stufe = tileAt(S.y - 1) * T;
      if (S.y - stufe <= T + .5 && !blockiertX(nx, stufe) && !kopfStoss(S.x, stufe)){ S.y = stufe; S.x = nx; S.landT = Math.max(S.landT, 60); return; }
    }
    S.x = dx > 0 ? b[0] * T - PHYS.hw - .01 : (b[0] + 1) * T + PHYS.hw + .01;
    S.vx = 0;
  }
  function kopfStoss(x, y){ const [c0, c1] = spalten(x - PHYS.hw, x + PHYS.hw), r = tileAt(y - PHYS.hoehe); for (let tx = c0; tx <= c1; tx++) if (istFest(G, tx, r)) return true; return false; }
  function bewegeY(dy){
    const [c0, c1] = spalten(S.x - PHYS.hw + 1, S.x + PHYS.hw - 1);
    if (dy > 0){
      const ny = S.y + dy, r = tileAt(ny), top = r * T;
      for (let tx = c0; tx <= c1; tx++){
        const fest = istFest(G, tx, r), traeg = traegt(G, tx, r) && S.y <= top + .5 && S.stegAus <= 0 && !S.leiter;
        if ((fest || traeg) && ny >= top){ S.y = top; S.vy = 0; return true; }
      }
      S.y = ny; return false;
    }
    const ny = S.y + dy, r = tileAt(ny - PHYS.hoehe);
    for (let tx = c0; tx <= c1; tx++) if (istFest(G, tx, r)){ S.y = (r + 1) * T + PHYS.hoehe; S.vy = 0; return false; }
    S.y = ny; return false;
  }
  function stehtAuf(){
    const [c0, c1] = spalten(S.x - PHYS.hw + 1, S.x + PHYS.hw - 1), r = tileAt(S.y + .5);
    if (Math.abs(S.y - r * T) > .6) return false;
    for (let tx = c0; tx <= c1; tx++) if (istFest(G, tx, r) || (traegt(G, tx, r) && S.stegAus <= 0)) return true;
    return false;
  }
  const leiterAn = (x, y) => kachel(G, tileAt(x), tileAt(y)) === K.leiter;

  /* ---------- Spielfigur ---------- */
  function spieler(dt){
    const s = dt / 1000, ix = Eingabe.x(), iy = Eingabe.y();
    S.coyote -= dt; S.puffer -= dt; S.rolleCd -= dt; S.unverw -= dt; S.landT -= dt; S.stegAus -= dt; S.aktionT -= dt;
    if (Eingabe.neu('sprung')) S.puffer = PHYS.puffer;
    const wasser = wasserAn(G, S.x, S.y - 4), tief = wasser ? S.y - wasser.y0 : 0;
    S.wasser = !!wasser; S.tief = tief;
    const langsam = wasser ? (tief > 40 ? .5 : .72) : 1;
    // Aktion am Ort hält die Figur kurz fest
    if (S.aktionT > 0){ S.vx = 0; ix && (S.face = Math.sign(ix)); }
    // Rolle
    if (S.rolle > 0){
      S.rolle -= dt;
      S.vx = S.face * PHYS.rolle * (S.rolle > 60 ? 1 : .4);
    } else if (Eingabe.neu('rolle') && S.rolleCd <= 0 && S.boden && !S.leiter && S.aktionT <= 0){
      S.rolle = PHYS.rolleDauer; S.rolleCd = PHYS.rolleDauer + 250; if (ix) S.face = Math.sign(ix);
      hook.laut('dodge'); World.ghost(Stage.P);
    }
    // Leiter
    if (!S.leiter && Math.abs(iy) > .5 && S.rolle <= 0){
      // Etwas Spielraum: man muss nicht genau vor der Leiter stehen
      for (const dx of [0, -10, 10]){
        const lx = S.x + dx, obenDrauf = iy > 0 && S.boden && leiterAn(lx, S.y + 2);
        if ((iy < 0 && leiterAn(lx, S.y - 30)) || obenDrauf){
          S.leiter = true; S.vx = 0; S.x = (tileAt(lx) + .5) * T; if (obenDrauf) S.y += 3;
          break;
        }
      }
    }
    if (S.leiter){
      S.vy = iy * PHYS.kletter;
      S.y += S.vy * s;
      S.schritt += Math.abs(S.vy) * s * .09;
      if (!leiterAn(S.x, S.y - 4) && !leiterAn(S.x, S.y - 40)){ S.leiter = false; }
      if (iy < 0 && !leiterAn(S.x, S.y - 8)){
        // oben angekommen: auf die Oberkante steigen
        S.y = tileAt(S.y) * T; S.vy = 0; S.leiter = false; S.boden = true;
      }
      if (iy > 0 && (istFest(G, tileAt(S.x), tileAt(S.y + 1)))){ S.y = tileAt(S.y + 1) * T; S.leiter = false; }
      if (S.puffer > 0){ S.leiter = false; S.puffer = 0; S.vy = -PHYS.sprung * .6; S.vx = (ix || S.face) * PHYS.lauf * .6; }
      else if (Math.abs(ix) > .7 && Math.abs(iy) < .3 && stehtAuf()){ S.leiter = false; }
      if (S.leiter) return;
    }
    // Laufen
    if (S.rolle <= 0 && S.aktionT <= 0){
      const ziel = ix * PHYS.lauf * langsam, a = (S.boden ? PHYS.beschl : PHYS.luft) * s;
      S.vx = S.vx < ziel ? Math.min(ziel, S.vx + a) : Math.max(ziel, S.vx - a);
      if (Math.abs(ix) > .15) S.face = Math.sign(ix);
    }
    if (S.stoss){ S.vx += S.stoss; S.stoss *= .82; if (Math.abs(S.stoss) < 4) S.stoss = 0; }
    // Springen, auch kurz nach dem Rand, auch kurz vor der Landung gedrückt
    if (S.puffer > 0 && (S.boden || S.coyote > 0) && S.rolle <= 0 && S.aktionT <= 0){
      if (iy > .6 && stegUnter()){ S.stegAus = 220; S.y += 2; S.boden = false; }
      else { S.vy = -PHYS.sprung * (wasser && tief > 40 ? .75 : 1); S.boden = false; S.coyote = 0; hook.laut('sprung'); }
      S.puffer = 0;
    }
    if (!Eingabe.halt('sprung') && S.vy < -150) S.vy *= Math.pow(.86, dt / 16);
    S.vy = Math.min(PHYS.fallMax * (wasser ? .45 : 1), S.vy + PHYS.g * s * (wasser ? .5 : 1));
    const warBoden = S.boden, vorY = S.y, fallV = S.vy;
    bewegeX(S.vx * s);
    const gelandet = bewegeY(S.vy * s);
    S.boden = gelandet || (S.vy >= 0 && stehtAuf());
    if (S.boden){
      S.coyote = PHYS.coyote;
      if (!warBoden){ if (fallV > 420){ S.landT = 180; hook.laut('landen'); World.burst(S.x, S.y, 'staub', 5); } }
    }
    if (S.boden && S.rolle <= 0) S.schritt += Math.abs(S.vx) * s * .055;
    else if (!S.boden && warBoden && S.vy >= 0) S.fallStart = S.y;
    // Sicherer Ort zum Zurücksetzen
    S.sicherT -= dt;
    if (S.boden && !wasser && S.sicherT <= 0 && !gefahrNahe()){ S.sicher = [S.x, S.y]; S.sicherT = 400; }
    // Tiefes Wasser zieht hinab, Abgründe auch
    if (wasser && tief > 76) return zurueck('wasser');
    if (S.y > G.Hh + T * 4) return zurueck('sturz');
    // Stacheln
    const k = kachel(G, tileAt(S.x), tileAt(S.y - 4));
    if (k === K.stachel && S.unverw <= 0){
      S.unverw = 1000; S.vy = -PHYS.sprung * .7; S.stoss = -S.face * 60; S.boden = false;
      hook.schaden(.18, 'stachel'); World.burst(S.x, S.y - 10, 'salz', 12);
    }
    // Rand des Gebiets
    if (S.x < -PHYS.hw) randAus('l'); else if (S.x > G.W + PHYS.hw) randAus('r');
    // Schritte hörbar machen
    if (S.boden && Math.abs(S.vx) > 40 && Math.floor(S.schritt / Math.PI) !== Math.floor((S.schritt - Math.abs(S.vx) * s * .055) / Math.PI)) hook.laut(wasser ? 'platsch' : 'schritt');
  }
  function stegUnter(){ const r = tileAt(S.y + .5); const [c0, c1] = spalten(S.x - PHYS.hw + 1, S.x + PHYS.hw - 1); for (let tx = c0; tx <= c1; tx++) if (traegt(G, tx, r) && kachel(G, tx, r) === K.steg) return true; return false; }
  function gefahrNahe(){ for (let dx = -2; dx <= 2; dx++){ const k = kachel(G, tileAt(S.x) + dx, tileAt(S.y - 4)), k2 = kachel(G, tileAt(S.x) + dx, tileAt(S.y + 4)); if (k === K.stachel || k2 === K.luft && dx === 0) return true; } return false; }
  function zurueck(grund){
    aus = true;
    hook.schaden(.2, grund, () => {
      S.x = S.sicher[0]; S.y = S.sicher[1]; S.vx = S.vy = 0; S.unverw = 1200; S.leiter = false; S.rolle = 0; S.boden = true;
      World.follow(S.x, S.y, S.face, true); aus = false;
    });
  }
  function randAus(seite){
    const ziel = (G.def.links || {})[seite];
    if (!ziel){ S.x = clamp(S.x, PHYS.hw, G.W - PHYS.hw); S.vx = 0; return; }
    aus = true; hook.ausgang(ziel);
  }

  /* ---------- Figur zeichnen: Bewegung in Posen übersetzen ---------- */
  function heldPose(dt){
    const P = Stage.P;
    P.x = S.x; P.gy = S.y; P.face = S.face;
    if (S.unverw > 0 && S.unverw < 900) P.alpha = .55 + .45 * Math.abs(Math.sin(zeit * .025)); else P.alpha = 1;
    let b;
    if (S.aktionT > 0) b = { m: S.aktionArt || 'hocke' };
    else if (S.rolle > 0) b = { m: 'rolle', k: 1 - S.rolle / PHYS.rolleDauer };
    else if (S.leiter) b = { m: 'klettern', ph: S.schritt * 2 };
    else if (S.wasser && S.tief > 40) b = { m: 'schwimm', ph: zeit * .006 };
    else if (!S.boden) b = { m: S.vy < 0 ? 'sprung' : 'fall' };
    else if (S.landT > 0) b = { m: 'landen' };
    else if (Math.abs(S.vx) > 12) b = { m: 'lauf', ph: S.schritt, st: Math.min(1, Math.abs(S.vx) / PHYS.lauf) };
    else b = { m: 'stand' };
    P.bew = b; P.poseFn = bewegungsPose;
    P.hideW = b.m === 'klettern' || b.m === 'schwimm';
    P.mix = b.m === 'lauf' || b.m === 'klettern' ? .05 : b.m === 'rolle' ? .09 : .025;
    updateActor(P, dt);
  }

  /* ---------- Gegner in der Welt ---------- */
  function gegner(dt){
    const s = dt / 1000;
    for (const e of ents){
      if (e.typ === 'boss'){ if (!e.imKampf){ updateActor(e.actor, dt); e.actor.x = e.x; e.actor.gy = e.y; } continue; }
      if (e.typ !== 'feind' || e.zustand === 'tot' || e.imKampf) continue;
      const A = e.actor, dx = S.x - e.x, dy = S.y - e.y, dist = Math.abs(dx);
      e.t += dt;
      switch (e.zustand){
        case 'liegt':
          if (dist < T * 3.5 && Math.abs(dy) < T * 3) aufstehen(e);
          break;
        case 'lauert':
          if (dist < T * (e.def.lauert || 3) && Math.abs(dy) < T * 4){
            e.zustand = 'wach'; e.alarmT = 350; hook.laut('danger');
            if (e.def.von === 'oben'){ e.y = bodenUnter(G, e.x, e.y); World.burst(e.x, e.y, 'staub', 10); }
            else if (e.def.von === 'wasser') World.burst(e.x, e.y, 'splash', 18);
            gruppeWach(e);
          }
          break;
        case 'steigt':
          e.aufT -= dt; if (e.aufT <= 0){ e.zustand = 'wach'; e.alarmT = 0; A.poseFn = bewegungsPose; A.stance = null; }
          break;
        case 'ruhe': {
          // Patrouille
          if (e.pat){
            if (e.wait > 0){ e.wait -= dt; A.bew = { m: 'stand' }; }
            else {
              if (e.ziel == null) e.ziel = e.x < (e.pat[0] + e.pat[1]) / 2 ? e.pat[1] : e.pat[0];
              const dir = Math.sign(e.ziel - e.x); e.face = dir || e.face;
              e.x += dir * 48 * s; e.schritt = (e.schritt || 0) + 48 * s * .055;
              A.bew = { m: 'lauf', ph: e.schritt, st: .55 };
              if (Math.abs(e.ziel - e.x) < 3){ e.ziel = null; e.wait = rr(1200, 3200); }
            }
          } else A.bew = { m: 'stand' };
          if (bemerkt(e)){ e.zustand = 'wach'; e.alarmT = 500; hook.laut('bemerkt'); gruppeWach(e); }
          break;
        }
        case 'wach': {
          e.alarmT -= dt; e.face = Math.sign(dx) || e.face;
          if (e.alarmT > 0){ A.bew = { m: 'stand' }; break; }
          // Auf den Spieler zu, bis zur Kampfdistanz
          if (dist < T * 5 && Math.abs(dy) < T * 2 && !S.leiter && S.boden){ kampfBeginn(e, null); return; }
          if (dist > T * 16 || Math.abs(dy) > T * 6){ e.verlorenT = (e.verlorenT || 0) + dt; if (e.verlorenT > 3500){ e.zustand = 'ruhe'; e.verlorenT = 0; e.ziel = e.home; } }
          else e.verlorenT = 0;
          const nx = e.x + Math.sign(dx) * 105 * s;
          if (!istFest(G, tileAt(nx + Math.sign(dx) * 12), tileAt(e.y - 10)) && (istFest(G, tileAt(nx + Math.sign(dx) * 12), tileAt(e.y + 4)) || traegt(G, tileAt(nx + Math.sign(dx) * 12), tileAt(e.y + 4)))){
            e.x = nx; e.schritt = (e.schritt || 0) + 105 * s * .055; A.bew = { m: 'lauf', ph: e.schritt, st: .9 };
          } else A.bew = { m: 'stand' };
          break;
        }
      }
      A.x = e.x; A.gy = e.y; A.face = e.face;
      if (e.zustand !== 'lauert') updateActor(A, dt);
    }
  }
  function bemerkt(e){
    const dx = S.x - e.x, dy = S.y - e.y, vor = Math.sign(dx) === e.face, dist = Math.abs(dx);
    if (Math.abs(dy) > T * 3.2) return false;
    const leise = Math.abs(S.vx) < PHYS.lauf * .55;
    const reichweite = vor ? T * (e.def.sicht || 8) : T * (leise ? 1.2 : 3);
    if (dist > reichweite) return false;
    return sicht(G, e.x, e.y - 60, S.x, S.y - 50);
  }
  function aufstehen(e){
    const A = e.actor, S2 = SETS[A.set];
    e.zustand = 'steigt'; e.aufT = 1200; A.poseFn = null; A.stance = null;
    playAnim(A, [[0, S2.lie || S2.idle], [600, S2.kneel || S2.idle, EASE.io], [1200, S2.idle, EASE.io]]);
    hook.laut('rise'); e.face = Math.sign(S.x - e.x) || e.face;
    if (wasserAn(G, e.x, e.y - 4)) World.burst(e.x, e.y - 10, 'splash', 16);
    gruppeWach(e);
  }
  function gruppeWach(e){
    for (const o of ents) if (o !== e && o.typ === 'feind' && o.gruppe === e.gruppe && (o.zustand === 'ruhe' || o.zustand === 'liegt' || o.zustand === 'lauert')){
      if (o.zustand === 'liegt') aufstehen(o); else { o.zustand = 'wach'; o.alarmT = 500 + rnd() * 400; }
    }
  }
  // Kampf beginnt: der Auslöser vorn, der Rest seiner Gruppe in der Nähe dahinter
  function kampfBeginn(e, vorteil){
    const gruppe = ents.filter(o => o.typ === 'feind' && o.zustand !== 'tot' && (o === e || (o.gruppe === e.gruppe && Math.abs(o.x - S.x) < T * (FEINDE[o.key].fern ? 26 : 18))));
    gruppe.sort((a, b) => (a === e ? -1 : b === e ? 1 : Math.abs(a.x - S.x) - Math.abs(b.x - S.x)));
    S.vx = 0; S.rolle = 0; S.aktionT = 0;
    aus = true;
    gruppe.forEach(o => { o.imKampf = true; });
    hook.kampf(gruppe, vorteil);
  }

  /* ---------- Handeln am Ort ---------- */
  function aktionen(D){
    let best = null, bd = 1e9;
    for (const e of ents){
      const dx = e.x - S.x, dy = e.y - S.y, d = Math.abs(dx) + Math.abs(dy) * .5;
      const reich = e.typ === 'tuer' ? T * 1.2 : T * 1.8;
      if (Math.abs(dx) > reich || Math.abs(dy) > T * 2.2) continue;
      const l = label(e, D); if (!l) continue;
      if (d < bd){ bd = d; best = { e, label: l }; }
    }
    return best;
  }
  function label(e, D){
    const d = e.def;
    switch (e.typ){
      case 'feuer': return D.lit[d.id] ? 'Rasten' : 'Entfachen';
      case 'npc': return 'Sprechen';
      case 'gegenstand': return 'Aufheben';
      case 'leiche': return e.leer ? null : 'Durchsuchen';
      case 'truhe': return e.leer ? null : 'Öffnen';
      case 'schrift': return d.art === 'grab' ? 'Lesen' : d.art === 'bild' ? 'Betrachten' : 'Lesen';
      case 'tuer': return e.offen ? (d.label || 'Eintreten') : (d.zu && D.items[d.zu] ? 'Aufschließen' : d.riegel ? 'Riegel öffnen' : d.label || 'Eintreten');
      case 'hebel': return e.an ? null : d.zu && D.items[d.zu] ? 'Aufschließen' : 'Ziehen';
      case 'untersuchen': return D.genommen[key(e.id)] ? null : (d.label || 'Untersuchen');
    }
    return null;
  }
  function handle(D){
    const b = aktionen(D); if (!b || S.aktionT > 0 || !S.boden) return false;
    const e = b.e, d = e.def;
    S.face = Math.sign(e.x - S.x) || S.face;
    switch (e.typ){
      case 'feuer': hook.feuer(e); return true;
      case 'npc': hook.dialog(e); return true;
      case 'schrift': S.aktionT = 400; S.aktionArt = 'hocke'; hook.lesen(e); return true;
      case 'gegenstand': case 'leiche': case 'truhe': case 'untersuchen':
        S.aktionT = 650; S.aktionArt = 'hocke';
        if (e.typ !== 'untersuchen') e.leer = true;
        setTimeout(() => hook.beute(e), 450);
        return true;
      case 'tuer':
        if (!e.offen){
          if (d.zu && D.items[d.zu]){ e.offen = true; hook.merke('offen', key(e.id)); hook.laut('tuer'); hook.hinweis(d.aufText || 'Das Schloss gibt nach.'); return true; }
          if (d.riegel){ e.offen = true; hook.merke('offen', key(e.id)); if (d.paar) hook.merke('offen', d.paar); hook.laut('tuer'); hook.hinweis(d.aufText || 'Du schiebst den Riegel zurück. Die Tür steht jetzt offen.'); return true; }
          if (d.einweg){ hook.hinweis(d.zuText || 'Von dieser Seite lässt sich die Tür nicht öffnen.'); return true; }
          hook.hinweis(d.zuText || 'Verschlossen.'); return true;
        }
        hook.tuer(e); return true;
      case 'hebel':
        if (d.zu && !D.items[d.zu]){ hook.hinweis(d.zuText || 'Der Hebel ist mit einem Schloss gesichert.'); return true; }
        S.aktionT = 700; S.aktionArt = 'ziehen'; e.an = true; hook.merke('offen', key(e.id)); hook.laut('hebel');
        setTimeout(() => {
          const g = G.gitter.find(x => d.oeffnet && G.anker[d.oeffnet] && x.tx === G.anker[d.oeffnet][0]);
          if (g){ oeffneGitter(G, g); hook.merke('offen', key('g' + g.tx + ',' + g.ty0)); hook.laut('gitter'); World.shake(4); }
          if (d.oeffnet && !g){ const t = ents.find(x => x.a === d.oeffnet && x.typ === 'tuer'); if (t){ t.offen = true; hook.merke('offen', key(t.id)); } }
          if (d.text) hook.hinweis(d.text);
        }, 400);
        return true;
    }
    return false;
  }
  // Angriff außerhalb des Kampfes: Hinterhalt oder brüchige Wand
  function angriff(D){
    if (S.aktionT > 0 || S.leiter || S.rolle > 0) return;
    // Gegner, der nichts ahnt oder noch liegt
    for (const e of ents){
      if (e.typ !== 'feind' || e.imKampf || !['ruhe', 'liegt', 'lauert'].includes(e.zustand)) continue;
      const dx = e.x - S.x;
      if (Math.abs(dx) < T * 2.4 && Math.abs(e.y - S.y) < T && Math.sign(dx) === S.face){ S.face = Math.sign(dx); kampfBeginn(e, 'hinterhalt'); return; }
    }
    // Schlag ins Leere, vielleicht gegen eine brüchige Wand
    const P = Stage.P, SS = SETS[P.set];
    P.poseFn = null;
    playAnim(P, [[0, SS.l1W], [150, SS.l1W], [240, SS.l1S, EASE.in], [380, SS.l1S], [520, SS.idle]]);
    P.trailUntil = P.t + 300; S.aktionT = 480; S.aktionArt = 'stand';
    hook.laut('swing');
    setTimeout(() => {
      P.poseFn = bewegungsPose;
      const tx = tileAt(S.x + S.face * T * 1.1);
      const b = G.F.brueche.find(b => b.tx === tx && tileAt(S.y - 30) >= b.ty0 - 1 && tileAt(S.y - 30) <= b.ty1);
      if (b){
        hook.merke('bruch', key(b.tx + ',' + b.ty0)); zerbrich(G, b);
        World.burst(b.x + T / 2, (b.y0 + b.y1) / 2, 'staub', 30); World.burst(b.x + T / 2, (b.y0 + b.y1) / 2, 'spark', 10); World.shake(8);
        hook.laut('bruch'); hook.hinweis('Dahinter liegt ein verborgener Gang.');
      } else if (istFest(G, tx, tileAt(S.y - 30))){ hook.laut('block'); World.burst(S.x + S.face * T, S.y - 40, 'spark', 5); }
    }, 250);
  }

  /* ---------- Auslöser: Ereignisse, Ausgänge, Nebeltore ---------- */
  function ausloeser(D){
    for (const e of ents){
      const d = e.def;
      if (e.typ === 'ereignis' && !e.fertig){
        const w = (d.breite || 2) * T, h = (d.hoch || 4) * T;
        if (S.x > e.x - w / 2 && S.x < e.x + w / 2 && S.y > e.y - h && S.y <= e.y + T){ e.fertig = true; hook.ereignis(e); if (aus) return; }
      }
      if (e.typ === 'ausgang'){
        const w = (d.breite || 1) * T, h = (d.hoch || 2) * T;
        if (S.x > e.x - w / 2 && S.x < e.x + w / 2 && S.y > e.y - h && S.y <= e.y + T * .5){ aus = true; hook.ausgang(d.ziel); return; }
      }
      if (e.typ === 'nebeltor'){
        const seite = d.seite || 1;
        if ((S.x - e.x) * seite > 4 && Math.abs(S.y - e.y) < T * 3){
          const boss = ents.find(x => x.typ === 'boss' && x.key === d.boss);
          if (boss){ aus = true; S.vx = 0; hook.boss(boss, e); return; }
        }
      }
      if (e.typ === 'feuer' && !D.lit[d.id] && Math.abs(e.x - S.x) < T * 5 && Math.abs(e.y - S.y) < T * 3) e.naehe = true;
    }
  }

  /* ---------- Pro Bild ---------- */
  // imKampf: die Figur gehört gerade dem Kampf, nur die Welt drumherum lebt weiter
  function update(dt, D, imKampf){
    zeit += dt;
    if (!G) return;
    if (!aus && !imKampf){
      spieler(dt);
      if (!aus && Eingabe.neu('aktion')) handle(D);
      if (!aus && Eingabe.neu('angriff')) angriff(D);
      if (!aus) ausloeser(D);
    }
    gegner(dt);
    for (let i = ents.length - 1; i >= 0; i--){
      const e = ents[i];
      if (e.typ === 'npc'){ e.actor.x = e.x; e.actor.gy = e.y; if (Math.abs(S.x - e.x) < T * 6 && !e.def.sitzt) e.actor.face = Math.sign(S.x - e.x) || e.actor.face; updateActor(e.actor, dt); }
      if (e.typ === 'figur'){ e.actor.x = e.x; e.actor.gy = e.y; updateActor(e.actor, dt); }
      if (e.einblenden && e.actor){ e.actor.alpha = Math.min(1, e.actor.alpha + dt / 900); if (e.actor.alpha >= 1) e.einblenden = false; }
      // Figuren, die gehen: langsam ausblenden
      if (e.weg && e.actor){ e.actor.alpha = Math.max(0, (e.actor.alpha == null ? 1 : e.actor.alpha) - dt / 1400); if (e.actor.alpha <= 0) ents.splice(i, 1); }
    }
    if (!imKampf) heldPose(dt);
    if (!aus && !imKampf) World.follow(S.x, S.y, S.face);
    lastInter = aus || imKampf ? null : aktionen(D);
    // Das Herz in der Brust leuchtet ein wenig in dunklen Gegenden
    const c = chestPt(Stage.P);
    World.dynLight({ x: c[0], y: c[1], r: 70, col: 'rgba(200,220,255,.8)', a: .12, hell: 1.6 });
  }

  /* ---------- Zeichnen ---------- */
  function sichtbar(x, y, pad = 200){ const v = World.view(); return x > v[0] - pad && x < v[2] + pad && y > v[1] - pad && y < v[3] + pad * 2; }
  function zeichneHinten(ctx, D){
    for (const e of ents){
      if (!sichtbar(e.x, e.y)) continue;
      const d = e.def;
      switch (e.typ){
        case 'feuer': feuerschale(ctx, e, D.lit[d.id], d.brunnen); if (d.amboss) amboss(ctx, e.x + (d.amboss === 'l' ? -T * 2.5 : T * 2.5), e.y); break;
        case 'tuer': if (d.art === 'schacht') schacht(ctx, e); else if (d.art === 'loch') hoehle(ctx, e); else if (d.art !== 'unsichtbar') tuerBogen(ctx, e); break;
        case 'hebel': hebel(ctx, e); break;
        case 'truhe': truhe(ctx, e); break;
        case 'leiche': leiche(ctx, e); break;
        case 'deko': deko(ctx, e); break;
        case 'schrift': if (d.art === 'grab') grabstein(ctx, e); else if (d.art === 'bild') bild(ctx, e); else if (d.art === 'schild') schildPfahl(ctx, e); else if (d.art === 'buch') pult(ctx, e); break;
      }
      if (['gegenstand', 'leiche', 'truhe', 'schrift', 'untersuchen'].includes(e.typ) && !e.leer && !(e.typ === 'untersuchen' && D.genommen[key(e.id)])) funkeln(ctx, e);
    }
  }
  function figuren(ctx, spiegel){
    for (const e of ents){
      if (!e.actor || e.imKampf || e.zustand === 'lauert' || !sichtbar(e.x, e.y)) continue;
      drawActor(ctx, e.actor, spiegel ? .8 : 1);
      if (!spiegel && e.typ === 'feind' && e.zustand === 'wach' && e.alarmT > 0){
        const h = headPt(e.actor);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(235,90,70,.9)';
        ctx.font = "600 22px 'Cormorant Garamond', serif"; ctx.textAlign = 'center'; ctx.fillText('!', h[0], h[1] - 26 - Math.sin(zeit * .02) * 2); ctx.restore();
      }
    }
    if (Stage.P && Stage.showP) drawActor(ctx, Stage.P);
  }
  function zeichneVorn(ctx, D){
    for (const e of ents){
      if (e.typ === 'nebeltor' && sichtbar(e.x, e.y)) nebeltor(ctx, e);
      if (e.typ === 'deko' && e.def.vorn && sichtbar(e.x, e.y)) deko(ctx, e, true);
    }
  }

  /* ---------- Einzelne Dinge in der Welt ---------- */
  function feuerschale(ctx, e, an, brunnen){
    const x = e.x, gy = e.y, sz = 20, t = zeit;
    ctx.fillStyle = '#07090c';
    if (brunnen){
      ctx.fillRect(x - 8, gy - 26, 16, 26);
      ctx.beginPath(); ctx.moveTo(x - 44, gy - 34); ctx.lineTo(x + 44, gy - 34); ctx.quadraticCurveTo(x + 36, gy - 18, x + 10, gy - 20); ctx.lineTo(x - 10, gy - 20); ctx.quadraticCurveTo(x - 36, gy - 18, x - 44, gy - 34); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x, gy, 50, 7, 0, Math.PI, 0); ctx.fill();
    } else {
      ctx.fillRect(x - 3, gy - 24, 6, 24);
      ctx.beginPath(); ctx.moveTo(x - 20, gy - 29); ctx.lineTo(x + 20, gy - 29); ctx.lineTo(x + 10, gy - 19); ctx.lineTo(x - 10, gy - 19); ctx.closePath(); ctx.fill();
      ctx.fillRect(x - 12, gy - 3, 24, 3);
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const top = gy - (brunnen ? 34 : 29);
    if (an){
      for (let i = 0; i < 7; i++){
        const ph = t * .006 + i * 1.7, fx = x + Math.sin(ph * .7 + i) * sz * .35 * (brunnen ? 2 : 1), h = sz * (1 + .6 * Math.sin(ph) + (i % 3) * .3) * (brunnen ? .7 : 1);
        const fy = top - 2 - h * .3, g = ctx.createRadialGradient(fx, fy, 0, fx, fy, h * .8);
        g.addColorStop(0, 'rgba(255,218,160,.65)'); g.addColorStop(.5, 'rgba(235,135,60,.32)'); g.addColorStop(1, 'rgba(180,60,20,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(fx, fy, h * .35, h * .8, 0, 0, TAU); ctx.fill();
      }
      if (rnd() < .2) World.burst(x + (rnd() - .5) * 16, top - 8, 'ember', 1);
    } else {
      // nur Glut
      const g = ctx.createRadialGradient(x, top, 0, x, top, 14);
      g.addColorStop(0, `rgba(255,140,60,${.35 + .15 * Math.sin(t * .004)})`); g.addColorStop(1, 'rgba(255,100,40,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 14, top - 14, 28, 28);
    }
    ctx.restore();
  }
  function amboss(ctx, x, gy){
    const s = 22;
    ctx.fillStyle = '#07090c';
    ctx.fillRect(x - s * .35, gy - s * .9, s * .7, s * .9);
    ctx.beginPath(); ctx.moveTo(x - s * .9, gy - s * 1.25); ctx.lineTo(x + s * .75, gy - s * 1.25); ctx.lineTo(x + s * .55, gy - s * .9); ctx.lineTo(x - s * .55, gy - s * .9); ctx.quadraticCurveTo(x - s * 1.3, gy - s * 1.05, x - s * .9, gy - s * 1.25); ctx.fill();
    ctx.fillStyle = 'rgba(170,186,205,.25)'; ctx.fillRect(x - s * .8, gy - s * 1.26, s * 1.5, 1);
  }
  function tuerBogen(ctx, e){
    const x = e.x, gy = e.y, w = 34, h = 70;
    ctx.fillStyle = e.offen ? '#020304' : (e.def.farbe || '#0b0906');
    ctx.beginPath(); ctx.moveTo(x - w / 2, gy); ctx.lineTo(x - w / 2, gy - h + w / 2); ctx.arc(x, gy - h + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w / 2, gy); ctx.fill();
    ctx.strokeStyle = 'rgba(170,186,205,.28)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - w / 2 - 3, gy); ctx.lineTo(x - w / 2 - 3, gy - h + w / 2); ctx.arc(x, gy - h + w / 2, w / 2 + 3, Math.PI, 0); ctx.lineTo(x + w / 2 + 3, gy); ctx.stroke();
    if (!e.offen){ ctx.strokeStyle = 'rgba(0,0,0,.6)'; for (let i = -1; i <= 1; i++){ ctx.beginPath(); ctx.moveTo(x + i * 9, gy); ctx.lineTo(x + i * 9, gy - h + 12); ctx.stroke(); } ctx.fillStyle = 'rgba(200,170,110,.5)'; ctx.fillRect(x + 8, gy - 36, 3, 3); }
    else { const g = ctx.createLinearGradient(0, gy - h, 0, gy); g.addColorStop(0, 'rgba(255,190,120,0)'); g.addColorStop(1, e.def.warm ? 'rgba(255,190,120,.12)' : 'rgba(150,170,200,.06)'); ctx.fillStyle = g; ctx.fillRect(x - w / 2, gy - h, w, h); }
  }
  function hebel(ctx, e){
    const x = e.x, gy = e.y, an = e.an ? 1 : 0;
    ctx.fillStyle = '#08090b'; ctx.fillRect(x - 8, gy - 16, 16, 16);
    ctx.strokeStyle = '#08090b'; ctx.lineWidth = 3; const a = an ? .7 : -.7;
    ctx.beginPath(); ctx.moveTo(x, gy - 10); ctx.lineTo(x + Math.sin(a) * 24, gy - 10 - Math.cos(a) * 24); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + Math.sin(a) * 25, gy - 10 - Math.cos(a) * 25, 3.5, 0, TAU); ctx.fillStyle = '#08090b'; ctx.fill();
    ctx.strokeStyle = 'rgba(170,186,205,.3)'; ctx.lineWidth = 1; ctx.strokeRect(x - 8, gy - 16, 16, 16);
  }
  function truhe(ctx, e){
    const x = e.x, gy = e.y;
    ctx.fillStyle = '#0b0907'; ctx.fillRect(x - 16, gy - 16, 32, 16);
    ctx.save(); ctx.translate(x - 16, gy - 16); ctx.rotate(e.leer ? -.8 : 0);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(32, 0); ctx.quadraticCurveTo(32, -9, 16, -10); ctx.quadraticCurveTo(0, -9, 0, 0); ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(200,170,110,.35)'; ctx.lineWidth = 1; ctx.strokeRect(x - 16, gy - 16, 32, 16);
  }
  function leiche(ctx, e){
    if (!e.leichenActor){
      e.leichenActor = makeActor({ set: 'ertrunken', look: Object.assign({}, LOOK.ertrunken, { weapon: null, eyes: null }), face: e.def.blick || 1, H: HELD_H * .95 });
      e.leichenActor.stance = e.def.sitzt ? 'kneel' : 'dead'; e.leichenActor.pose = mkPose({}, SETS.ertrunken[e.leichenActor.stance]);
      e.leichenActor.poseFn = null;
    }
    const A = e.leichenActor; A.x = e.x; A.gy = e.y; drawActor(ctx, A);
  }
  function funkeln(ctx, e){
    const x = e.x, y = e.y - (e.typ === 'leiche' ? 14 : 8), t = zeit * .003 + e.t, a = .55 + .45 * Math.sin(t * 2.2);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const col = e.typ === 'schrift' ? '200,215,240' : '240,215,160';
    const g = ctx.createRadialGradient(x, y, 0, x, y, 16); g.addColorStop(0, `rgba(${col},${.45 * a})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - 16, y - 16, 32, 32);
    ctx.fillStyle = `rgba(255,250,235,${a})`; const s = 3 + a * 3;
    ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + 1, y - 1); ctx.lineTo(x + s, y); ctx.lineTo(x + 1, y + 1); ctx.lineTo(x, y + s); ctx.lineTo(x - 1, y + 1); ctx.lineTo(x - s, y); ctx.lineTo(x - 1, y - 1); ctx.fill();
    ctx.restore();
    if (rnd() < .02) World.burst(x, y, 'heal', 1);
  }
  function grabstein(ctx, e){
    const x = e.x, gy = e.y;
    ctx.fillStyle = '#090b0e'; ctx.beginPath(); ctx.moveTo(x - 12, gy); ctx.lineTo(x - 12, gy - 26); ctx.arc(x, gy - 26, 12, Math.PI, 0); ctx.lineTo(x + 12, gy); ctx.fill();
    ctx.strokeStyle = 'rgba(170,186,205,.22)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 5, gy - 28); ctx.lineTo(x + 5, gy - 28); ctx.moveTo(x, gy - 33); ctx.lineTo(x, gy - 18); ctx.stroke();
  }
  function bild(ctx, e){
    const x = e.x, gy = e.y - T * 2.2;
    ctx.fillStyle = '#0c0d10'; ctx.fillRect(x - 20, gy - 26, 40, 32);
    ctx.strokeStyle = 'rgba(200,170,110,.35)'; ctx.lineWidth = 2; ctx.strokeRect(x - 20, gy - 26, 40, 32);
  }
  // Förderturm über einem Schacht
  function schacht(ctx, e){
    const x = e.x, gy = e.y;
    ctx.fillStyle = '#020304'; ctx.beginPath(); ctx.ellipse(x, gy - 2, 22, 5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#08090b'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x - 24, gy); ctx.lineTo(x - 10, gy - 78); ctx.moveTo(x + 24, gy); ctx.lineTo(x + 10, gy - 78); ctx.moveTo(x - 16, gy - 50); ctx.lineTo(x + 16, gy - 50); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, gy - 80, 10, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(170,186,205,.3)'; ctx.beginPath(); ctx.moveTo(x + 10, gy - 80); ctx.lineTo(x + 10, gy - 8 + Math.sin(zeit * .002) * 3); ctx.stroke();
  }
  // Dunkles Loch im Fels
  function hoehle(ctx, e){
    const x = e.x, gy = e.y;
    const g = ctx.createRadialGradient(x, gy - 30, 4, x, gy - 30, 44);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.7, 'rgba(0,0,0,.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, gy - 28, 30, 36, 0, Math.PI, 0); ctx.lineTo(x + 30, gy); ctx.lineTo(x - 30, gy); ctx.fill();
  }
  function schildPfahl(ctx, e){
    const x = e.x, gy = e.y;
    ctx.fillStyle = '#0a0907'; ctx.fillRect(x - 2, gy - 52, 4, 52);
    ctx.save(); ctx.translate(x, gy - 46); ctx.rotate(-.06); ctx.fillRect(-20, -12, 40, 22);
    ctx.strokeStyle = 'rgba(200,190,170,.25)'; ctx.lineWidth = 1; ctx.strokeRect(-20, -12, 40, 22);
    ctx.fillStyle = 'rgba(200,190,170,.18)'; for (let i = 0; i < 3; i++) ctx.fillRect(-14, -6 + i * 6, 22 - i * 5, 1.5);
    ctx.restore();
  }
  function pult(ctx, e){
    const x = e.x, gy = e.y;
    ctx.fillStyle = '#0a0907'; ctx.fillRect(x - 3, gy - 34, 6, 34); ctx.fillRect(x - 10, gy - 3, 20, 3);
    ctx.save(); ctx.translate(x, gy - 36); ctx.rotate(-.25); ctx.fillRect(-14, -3, 28, 6);
    ctx.fillStyle = 'rgba(220,210,190,.35)'; ctx.fillRect(-12, -6, 11, 3); ctx.fillRect(1, -6, 11, 3); ctx.restore();
  }
  function nebeltor(ctx, e){
    const x = e.x, gy = e.y, t = zeit;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++){
      const y = gy - 12 - i * 16 + Math.sin(t * .002 + i) * 4, r = 26 + (i % 3) * 8, xx = x + Math.sin(t * .0013 + i * 2) * 6;
      const g = ctx.createRadialGradient(xx, y, 0, xx, y, r); g.addColorStop(0, 'rgba(200,215,230,.16)'); g.addColorStop(1, 'rgba(200,215,230,0)');
      ctx.fillStyle = g; ctx.fillRect(xx - r, y - r, r * 2, r * 2);
    }
    ctx.strokeStyle = 'rgba(220,230,240,.25)'; ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++){ const xx = x - 8 + i * 4 + Math.sin(t * .003 + i) * 3; ctx.beginPath(); ctx.moveTo(xx, gy); ctx.quadraticCurveTo(xx + Math.sin(t * .002 + i) * 8, gy - 60, xx, gy - 120); ctx.stroke(); }
    ctx.restore();
  }
  function deko(ctx, e, vorn){
    const d = e.def, x = e.x, gy = e.y;
    if (!!d.vorn !== !!vorn) return;
    const art = d.art;
    ctx.fillStyle = '#07090b'; ctx.strokeStyle = '#07090b';
    if (art === 'laterne' || art === 'laternenpfahl'){
      const h = art === 'laternenpfahl' ? 80 : 0;
      if (h){ ctx.fillRect(x - 2, gy - h, 4, h); ctx.fillRect(x - 2, gy - h, 14, 3); }
      const lx = x + (h ? 12 : 0), ly = gy - h + (h ? 3 : -40);
      ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx, ly + 6); ctx.stroke();
      ctx.fillRect(lx - 5, ly + 6, 10, 13);
      World.dynLight({ x: lx, y: ly + 12, r: 110, col: d.farbe || 'rgba(255,190,120,.9)', a: .35, flacker: true });
    } else if (art === 'kerzen'){
      for (let i = 0; i < 4; i++){ const cx = x - 12 + i * 8, h = 6 + (i % 2) * 5; ctx.fillStyle = 'rgba(200,190,170,.4)'; ctx.fillRect(cx - 1.5, gy - h, 3, h); World.dynLight({ x: cx, y: gy - h - 3, r: 26, col: 'rgba(255,210,150,.9)', a: .45, flacker: true }); }
    } else if (art === 'pfahl'){ ctx.fillRect(x - 6, gy - (d.h || 3) * T, 12, (d.h || 3) * T); ctx.beginPath(); ctx.ellipse(x, gy - (d.h || 3) * T, 8, 3, 0, 0, TAU); ctx.fill(); }
    else if (art === 'boot'){ ctx.beginPath(); ctx.moveTo(x - 70, gy - 34); ctx.quadraticCurveTo(x, gy + 4, x + 70, gy - 34); ctx.lineTo(x + 60, gy - 28); ctx.quadraticCurveTo(x, gy - 6, x - 60, gy - 28); ctx.closePath(); ctx.fill(); }
    else if (art === 'kiste'){ ctx.fillRect(x - 14, gy - 26, 28, 26); ctx.strokeStyle = 'rgba(170,186,205,.15)'; ctx.lineWidth = 1; ctx.strokeRect(x - 14, gy - 26, 28, 26); ctx.beginPath(); ctx.moveTo(x - 14, gy - 26); ctx.lineTo(x + 14, gy); ctx.stroke(); }
    else if (art === 'fass'){ ctx.beginPath(); ctx.ellipse(x, gy - 16, 12, 16, 0, 0, TAU); ctx.fill(); }
    else if (art === 'statue'){ const A = e.statue || (e.statue = makeActor({ set: 'kron', look: Object.assign({}, LOOK.kron, { heart: false, cape: 1.2 }), face: d.blick || 1, H: HELD_H * (d.gross || 1.6) })); A.pose = mkPose({ a1: 2.9, a2: .2, w: 0, b1: .3 }, SETS.kron.idle); A.x = x; A.gy = gy - 20; ctx.fillRect(x - 26, gy - 20, 52, 20); drawActor(ctx, A); }
    else if (art === 'glocke'){ World.glocke(ctx, x, gy - (d.hoehe || 8) * T, d.breite || 160, zeit); }
    else if (art === 'kette'){ ctx.lineWidth = 3; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(x, gy - (d.h || 6) * T); ctx.quadraticCurveTo(x + 10 + Math.sin(zeit * .001) * 4, gy - (d.h || 6) * T * .5, x + 4, gy - T); ctx.stroke(); ctx.setLineDash([]); }
    else if (art === 'fenster'){ const w = d.w || 40, h = d.hh || 90, top = gy - (d.hoehe || 5) * T; ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(0, top, 0, gy); g.addColorStop(0, 'rgba(170,190,220,.12)'); g.addColorStop(1, 'rgba(170,190,220,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - w / 2, top + h); ctx.lineTo(x + w / 2, top + h); ctx.lineTo(x + w * 1.8, gy); ctx.lineTo(x + w * .2, gy); ctx.closePath(); ctx.fill(); ctx.restore(); }
    else if (art === 'leuchtturm'){
      const h = (d.h || 16) * T, b0 = 46, b1 = 30;
      ctx.fillStyle = '#06080b';
      ctx.beginPath(); ctx.moveTo(x - b0, gy); ctx.lineTo(x - b1, gy - h); ctx.lineTo(x + b1, gy - h); ctx.lineTo(x + b0, gy); ctx.fill();
      ctx.fillRect(x - b1 - 12, gy - h - 6, (b1 + 12) * 2, 6);
      ctx.fillRect(x - b1 + 6, gy - h - 46, (b1 - 6) * 2, 40);
      ctx.beginPath(); ctx.moveTo(x - b1, gy - h - 46); ctx.lineTo(x, gy - h - 74); ctx.lineTo(x + b1, gy - h - 46); ctx.fill();
      ctx.strokeStyle = 'rgba(170,186,205,.14)'; ctx.lineWidth = 1;
      for (let k = 1; k < 6; k++){ const yy = gy - h * k / 6, ww = b0 + (b1 - b0) * k / 6; ctx.beginPath(); ctx.moveTo(x - ww, yy); ctx.lineTo(x + ww, yy); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(200,216,234,.35)'; ctx.beginPath(); ctx.moveTo(x - b0, gy); ctx.lineTo(x - b1, gy - h); ctx.stroke();
      const hell = d.an && DD && d.an(DD);
      ctx.fillStyle = hell ? 'rgba(255,220,160,.8)' : 'rgba(120,130,140,.18)'; ctx.fillRect(x - b1 + 12, gy - h - 40, (b1 - 12) * 2, 26);
      if (hell) World.dynLight({ x, y: gy - h - 28, r: 260, col: 'rgba(255,210,150,.9)', a: .4, flacker: true });
      ctx.fillStyle = 'rgba(0,0,0,.6)'; for (let k = 0; k < 3; k++) ctx.fillRect(x - 5, gy - h * (.3 + k * .22), 10, 16);
    }
    else if (art === 'baum'){
      let sd = e.tx * 7919 + 13; const R = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      toterBaum(ctx, R, x, gy + 2, (d.h || 6) * T, d.blick || 1, '#07090a');
    }
    else if (art === 'netz'){
      const w = (d.w || 3) * T, h = (d.h || 3) * T;
      ctx.fillRect(x - w / 2 - 2, gy - h - 10, 4, h + 10); ctx.fillRect(x + w / 2 - 2, gy - h - 10, 4, h + 10);
      ctx.strokeStyle = 'rgba(10,12,14,.9)'; ctx.lineWidth = 1;
      for (let i = 0; i <= 8; i++){ const u = i / 8; ctx.beginPath(); ctx.moveTo(x - w / 2 + u * w, gy - h); ctx.quadraticCurveTo(x - w / 2 + u * w + 4, gy - h * .45, x - w / 2 + u * w, gy - h * .15); ctx.stroke(); }
      for (let j = 0; j < 5; j++){ const yy = gy - h + j * h * .17; ctx.beginPath(); ctx.moveTo(x - w / 2, yy); ctx.quadraticCurveTo(x, yy + 10 + Math.sin(zeit * .001 + j) * 2, x + w / 2, yy); ctx.stroke(); }
    }
    else if (art === 'mast'){
      const h = (d.h || 10) * T, tilt = d.neigung || .08, x1 = x + Math.sin(tilt) * h, y1 = gy - Math.cos(tilt) * h;
      ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x1 - 50, y1 + 30); ctx.lineTo(x1 + 50, y1 + 22); ctx.stroke();
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(150,160,170,.25)'; ctx.beginPath(); ctx.moveTo(x1 - 50, y1 + 30); ctx.lineTo(x - 70, gy); ctx.moveTo(x1 + 50, y1 + 22); ctx.lineTo(x + 80, gy); ctx.stroke();
    }
    else if (art === 'sarg'){ ctx.beginPath(); ctx.moveTo(x - 30, gy); ctx.lineTo(x - 34, gy - 16); ctx.lineTo(x + 28, gy - 18); ctx.lineTo(x + 32, gy); ctx.fill(); ctx.strokeStyle = 'rgba(170,186,205,.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 34, gy - 16); ctx.lineTo(x + 28, gy - 18); ctx.stroke(); }
    else if (art === 'altar'){ ctx.fillRect(x - 36, gy - 30, 72, 30); ctx.fillRect(x - 42, gy - 34, 84, 5); ctx.strokeStyle = 'rgba(200,190,170,.2)'; ctx.lineWidth = 1; ctx.strokeRect(x - 36, gy - 30, 72, 30); ctx.fillStyle = '#07090b'; ctx.fillRect(x - 1, gy - T * 8, 2, T * 2); World.glocke(ctx, x, gy - T * 6, 50, zeit); }
    else if (art === 'bank'){ ctx.fillRect(x - 30, gy - 14, 60, 4); ctx.fillRect(x - 26, gy - 14, 4, 14); ctx.fillRect(x + 22, gy - 14, 4, 14); ctx.fillRect(x - 30, gy - 30, 4, 20); }
    else if (art === 'rad'){ ctx.fillRect(x - 3, gy - 70, 6, 70); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, gy - 74, 18, 0, TAU); ctx.stroke(); for (let k = 0; k < 4; k++){ const a = k * Math.PI / 4 + zeit * .0002; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 18, gy - 74 + Math.sin(a) * 18); ctx.lineTo(x - Math.cos(a) * 18, gy - 74 - Math.sin(a) * 18); ctx.stroke(); } }
    else if (art === 'schilf'){ ctx.lineWidth = 2; for (let k = 0; k < 7; k++){ const bx = x + (hash2(e.tx, k) - .5) * 30, h = 40 + hash2(k, e.ty) * 50, sw = Math.sin(zeit * .0015 + k) * 5; ctx.beginPath(); ctx.moveTo(bx, gy); ctx.quadraticCurveTo(bx + sw * .5, gy - h * .6, bx + sw + 6, gy - h); ctx.stroke(); } }
  }

  /* ---------- Nach dem Kampf ---------- */
  function kampfEnde(gruppe, ergebnis, D){
    for (const e of gruppe){
      e.imKampf = false;
      if (e.besiegt){ e.zustand = 'tot'; D.tot[key(e.id)] = true; ents.splice(ents.indexOf(e), 1); }
      else if (ergebnis === 'flucht'){ e.zustand = 'ruhe'; e.x = e.home; e.ziel = null; e.actor.anim = null; e.actor.poseFn = bewegungsPose; }
    }
    const P = Stage.P; P.poseFn = bewegungsPose; P.anim = null; P.stance = null; P.hideW = false; P.glow = 0;
    S.unverw = 1500; aus = false; S.aktionT = 0;
    World.release();
  }
  function bossWeg(key2){ ents = ents.filter(e => !(e.typ === 'boss' && e.key === key2) && !(e.typ === 'nebeltor' && e.def.boss === key2)); aus = false; }
  function entAus(e){ const i = ents.indexOf(e); if (i >= 0) ents.splice(i, 1); }
  // Eine Figur nur zum Ansehen, für Zwischenszenen. k: Gegnerschlüssel oder fertiger Actor
  function figur(k, x, y, face = -1){
    let A = k;
    if (typeof k === 'string'){ const F = FEINDE[k], L = LOOK[F.look || F.set]; A = makeActor({ set: F.set, look: L, face, H: HELD_H * (L.scale || 1) }); }
    A.x = x; A.gy = y; A.face = face; A.alpha = A.alpha == null ? 1 : A.alpha;
    const e = { a: null, id: 'figur' + zeit, def: {}, typ: 'figur', x, y, gy: y, actor: A, t: 0 };
    ents.push(e); return e;
  }
  // Einen Eintrag der Karte neu erzeugen, etwa wenn er erst nach einem Boss erscheint
  function neu(a){
    const def = (G.def.o || {})[a], pos = G.anker[a]; if (!def || !pos) return null;
    const alt = ents.find(x => x.a === a); if (alt) return alt;
    const e = { a, id: def.id || a, def, typ: def.t, tx: pos[0], ty: pos[1], x: (pos[0] + .5) * T, y: (pos[1] + 1) * T, t: rnd() * 1000 };
    if (!def.schwebt) e.y = bodenUnter(G, e.x, e.y - T * .5);
    if (!erzeuge(e, DD)) return null;
    e.gy = e.y; ents.push(e);
    if (e.actor){ e.actor.x = e.x; e.actor.gy = e.y; e.actor.alpha = 0; e.einblenden = true; }
    if (e.licht) World.setLights(ents.filter(x => x.licht).map(x => x.licht));
    return e;
  }
  function setzeSpieler(x, y, face){ S.x = x; S.y = y; S.vx = S.vy = 0; if (face) S.face = face; S.boden = true; S.leiter = false; S.sicher = [x, y]; World.follow(x, y, S.face, true); }

  return {
    betrete, update, zeichneHinten, figuren, zeichneVorn, kampfEnde, bossWeg, entAus, setzeSpieler, hook, figur, neu,
    S, gebiet: () => G, ents: () => ents, inter: () => lastInter, handle, angriff,
    aus: () => aus, setAus(v){ aus = v; if (v){ S.vx = 0; } },
    key
  };
})();
