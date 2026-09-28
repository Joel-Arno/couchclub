/* =====================================================================
   EINGABE: Stick und Knöpfe auf dem Bildschirm, dazu die Tastatur
   Erkundung: links ein Stick (irgendwo in die linke Hälfte tippen),
   rechts Springen, Angriff, Ausweichen und die Aktion am Ort.
   ===================================================================== */
const Eingabe = (() => {
  const st = { x: 0, y: 0, keyX: 0, keyY: 0, stickX: 0, stickY: 0 };
  const gedrueckt = {}, neu = {};
  let stick = null, aktiv = true;
  const TASTE = {
    ArrowLeft: 'links', a: 'links', ArrowRight: 'rechts', d: 'rechts', ArrowUp: 'hoch', w: 'hoch', ArrowDown: 'runter', s: 'runter',
    ' ': 'sprung', j: 'angriff', Enter: 'angriff', e: 'aktion', k: 'rolle', Shift: 'rolle', m: 'karte', Escape: 'menue'
  };
  function druck(k){ if (!gedrueckt[k]) neu[k] = true; gedrueckt[k] = true; }
  function los(k){ gedrueckt[k] = false; }
  function tasten(){
    st.keyX = (gedrueckt.rechts ? 1 : 0) - (gedrueckt.links ? 1 : 0);
    st.keyY = (gedrueckt.runter ? 1 : 0) - (gedrueckt.hoch ? 1 : 0);
  }
  document.addEventListener('keydown', e => {
    const k = TASTE[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (!k || !aktiv) return;
    if (e.repeat){ e.preventDefault(); return; }
    druck(k); tasten();
    if (['links', 'rechts', 'hoch', 'runter', 'sprung'].includes(k)) e.preventDefault();
  });
  document.addEventListener('keyup', e => { const k = TASTE[e.key.length === 1 ? e.key.toLowerCase() : e.key]; if (k){ los(k); tasten(); } });

  // Stick: erscheint dort, wo der Daumen aufsetzt
  function stickSetup(zone, ring, knopf){
    const R = 46;
    zone.addEventListener('pointerdown', e => {
      if (stick) return;
      e.preventDefault();
      try { zone.setPointerCapture(e.pointerId); } catch (err) {}
      const b = zone.getBoundingClientRect();
      stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, bx: b.left, by: b.top };
      ring.style.transform = `translate(${e.clientX - b.left}px, ${e.clientY - b.top}px)`; ring.classList.add('an');
      knopf.style.transform = 'translate(0px, 0px)';
      if (window.Snd) Snd.init();
    });
    const move = e => {
      if (!stick || e.pointerId !== stick.id) return;
      let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy;
      const d = Math.hypot(dx, dy);
      // Der Stick wandert mit, wenn der Daumen weit wegrutscht
      if (d > R * 1.4){ const k = (d - R * 1.4) / d; stick.ox += dx * k; stick.oy += dy * k; dx = e.clientX - stick.ox; dy = e.clientY - stick.oy; ring.style.transform = `translate(${stick.ox - stick.bx}px, ${stick.oy - stick.by}px)`; }
      const m = Math.min(1, Math.hypot(dx, dy) / R);
      const ang = Math.atan2(dy, dx);
      st.stickX = Math.abs(dx) < 8 ? 0 : clamp(dx / R, -1, 1);
      st.stickY = Math.abs(dy) < 14 ? 0 : clamp(dy / R, -1, 1);
      knopf.style.transform = `translate(${Math.cos(ang) * m * R}px, ${Math.sin(ang) * m * R}px)`;
    };
    const up = e => {
      if (!stick || e.pointerId !== stick.id) return;
      stick = null; st.stickX = 0; st.stickY = 0; ring.classList.remove('an');
    };
    zone.addEventListener('pointermove', move); zone.addEventListener('pointerup', up); zone.addEventListener('pointercancel', up); zone.addEventListener('lostpointercapture', up);
  }
  // Knöpfe mit Halten (für Springen: kurzes Tippen springt niedrig)
  function knopfSetup(el, k){
    let id = null;
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); if (window.Snd) Snd.init();
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      id = e.pointerId; el.classList.add('on'); druck(k);
    });
    const up = e => { if (e.pointerId !== id) return; id = null; el.classList.remove('on'); los(k); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
    el.addEventListener('contextmenu', e => e.preventDefault());
  }
  return {
    stickSetup, knopfSetup,
    // Abfrage pro Bild
    x: () => clamp(st.keyX + st.stickX, -1, 1),
    y: () => clamp(st.keyY + st.stickY, -1, 1),
    halt: k => !!gedrueckt[k],
    neu(k){ const v = !!neu[k]; neu[k] = false; return v; },
    leeren(){ for (const k in neu) neu[k] = false; },
    loslassen(){ for (const k in gedrueckt) gedrueckt[k] = false; st.stickX = st.stickY = 0; st.keyX = st.keyY = 0; stick = null; },
    setAktiv(v){ aktiv = v; if (!v) this.loslassen(); }
  };
})();
