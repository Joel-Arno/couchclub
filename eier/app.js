/* Eier-Timer – Bedienung, Timer, Ton, Standort. Rechnung: physik.js, Konstanten: config.js */
(() => {
  'use strict';

  const C = EIER_CONFIG, P = EierPhysik;
  const KEY_E = 'eier-timer.einstellungen';
  const KEY_L = 'eier-timer.lauf';
  const $ = (s) => document.querySelector(s);

  // ---------- Speicher ----------

  function lade(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  }
  function speichere(key, wert) {
    try {
      if (wert === null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(wert));
    } catch { /* privater Modus: dann eben ohne Speicher */ }
  }

  const erste = (obj, wunsch) => (wunsch in obj ? wunsch : Object.keys(obj)[0]);
  const begrenze = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

  function pruefe(e) {
    const r = Object.assign({
      garstufe: 'wachsweich', groesse: 'M', start: 'kuehlschrank', anzahl: 2, topf: 'mittel',
      kalt: false, abschrecken: true, druckQuelle: 'standort', hoehe: 0, standort: null,
    }, e || {});
    r.garstufe = erste(C.GARSTUFEN, r.garstufe);
    r.groesse = erste(C.GROESSEN, r.groesse);
    r.start = erste(C.STARTTEMPERATUR, r.start);
    r.topf = erste(C.TOEPFE, r.topf);
    r.anzahl = begrenze(Math.round(Number(r.anzahl)) || 1, 1, C.MAX_EIER);
    r.kalt = r.kalt === true;
    r.abschrecken = r.abschrecken !== false;
    if (!['standort', 'hoehe', 'normal'].includes(r.druckQuelle)) r.druckQuelle = 'standort';
    r.hoehe = begrenze(Number(r.hoehe) || 0, -400, 6000);
    if (!r.standort || !(r.standort.druck > 300 && r.standort.druck < 1100)) r.standort = null;
    return r;
  }

  let E = pruefe(lade(KEY_E));
  let L = lade(KEY_L);
  if (L && !['heizen', 'laeuft', 'pause', 'fertig'].includes(L.phase)) L = null;
  const sichern = () => speichere(KEY_E, E);
  const sichereLauf = () => speichere(KEY_L, L);

  // ---------- Formate ----------

  const zahl = (x, d = 0) => x.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: false });
  function mmss(sek) {
    sek = Math.max(0, Math.round(sek));
    return `${Math.floor(sek / 60)}:${String(sek % 60).padStart(2, '0')}`;
  }
  function dauer(sek) {
    sek = Math.abs(Math.round(sek));
    return sek < 60 ? `${sek} s` : `${mmss(sek)} min`;
  }
  const uhrzeit = (ms) => new Date(ms).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  function alter(ms) {
    const min = Math.round((Date.now() - ms) / 60000);
    if (min < 2) return 'gerade eben';
    if (min < 60) return `vor ${min} min`;
    if (min < 24 * 60) return `vor ${Math.round(min / 60)} h`;
    return `am ${new Date(ms).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' })}`;
  }

  // ---------- Luftdruck ----------

  let standortLaedt = false;
  let standortFehler = null;

  function druck() {
    if (E.druckQuelle === 'hoehe') {
      return { hPa: P.druckAusHoehe(E.hoehe, C), quelle: `aus ${zahl(E.hoehe)} m Höhe` };
    }
    if (E.druckQuelle === 'standort' && E.standort) {
      return { hPa: E.standort.druck, quelle: 'am Standort' };
    }
    return { hPa: C.NORMALDRUCK, quelle: E.druckQuelle === 'standort' ? 'Normaldruck, noch kein Standort' : 'Normaldruck' };
  }

  function standortVeraltet() {
    return !E.standort || Date.now() - E.standort.zeit > C.DRUCK_GUELTIG_MIN * 60000;
  }

  function position() {
    return new Promise((ok, fehler) => navigator.geolocation.getCurrentPosition(ok, fehler, {
      enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60000,
    }));
  }

  async function holeStandort() {
    if (standortLaedt) return;
    if (!('geolocation' in navigator)) {
      standortFehler = 'Dieses Gerät liefert keinen Standort. Gib die Höhe ein oder rechne mit Normaldruck.';
      zeigeDruck();
      return;
    }
    standortLaedt = true;
    standortFehler = null;
    zeigeDruck();
    try {
      const pos = await position();
      const lat = pos.coords.latitude.toFixed(3), lon = pos.coords.longitude.toFixed(3);
      const url = `${C.OPEN_METEO_URL}?latitude=${lat}&longitude=${lon}&current=surface_pressure`;
      const abbruch = new AbortController();
      const uhr = setTimeout(() => abbruch.abort(), 12000);
      let data;
      try {
        const res = await fetch(url, { signal: abbruch.signal, cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        data = await res.json();
      } finally { clearTimeout(uhr); }
      const hPa = Number(data && data.current && data.current.surface_pressure);
      if (!(hPa > 300 && hPa < 1100)) throw new Error('Kein Luftdruck in der Antwort');
      const hoehe = Number(data.elevation);
      E.standort = { druck: hPa, hoehe: Number.isFinite(hoehe) ? hoehe : null, zeit: Date.now() };
      if (E.standort.hoehe !== null && !E.hoehe) E.hoehe = Math.round(E.standort.hoehe);
      E.druckQuelle = 'standort';
    } catch (err) {
      if (err && err.code === 1) {
        standortFehler = 'Standort nicht freigegeben. Gib die Höhe über dem Meer ein oder rechne mit Normaldruck.';
        E.druckQuelle = 'hoehe';
      } else if (err && (err.code === 2 || err.code === 3)) {
        standortFehler = 'Standort gerade nicht verfügbar. Versuch es gleich noch einmal oder gib die Höhe ein.';
      } else {
        standortFehler = 'Luftdruck konnte nicht geladen werden. Bist du online?' +
          (E.standort ? ' Gerechnet wird mit dem letzten Wert.' : ' Bis dahin wird mit 1013 hPa gerechnet.');
      }
    } finally {
      standortLaedt = false;
      sichern();
      alles();
    }
  }

  async function standortAutomatisch() {
    if (E.druckQuelle !== 'standort' || !standortVeraltet()) return;
    try {
      const st = navigator.permissions && await navigator.permissions.query({ name: 'geolocation' });
      if (st && st.state === 'granted') holeStandort();
    } catch { /* Permissions API fehlt: nur auf Knopfdruck */ }
  }

  // ---------- Bedienelemente ----------

  const EI_SVG = {
    weich: '<circle cx="24" cy="37" r="12" fill="url(#glanz)"/><ellipse cx="20" cy="33" rx="3.6" ry="2.3" fill="#fff" opacity=".75"/>',
    wachsweich: '<circle cx="24" cy="37" r="12" fill="#F6C445"/><circle cx="24" cy="37" r="7.5" fill="#FF9F0A"/><ellipse cx="22" cy="35" rx="2.2" ry="1.4" fill="#fff" opacity=".55"/>',
    mittel: '<circle cx="24" cy="37" r="12" fill="#F4D05C"/><circle cx="24" cy="37" r="4.5" fill="#F7AE2B"/>',
    hart: '<circle cx="24" cy="37" r="12" fill="#F1D372"/><circle cx="24" cy="37" r="12" fill="none" stroke="#E2BE52" stroke-width="1"/>',
  };

  function segment(box, name, optionen, wert, aendern) {
    box.textContent = '';
    for (const o of optionen) {
      const label = document.createElement('label');
      label.innerHTML = `<input type="radio" name="${name}"><span>${o.text}${o.klein ? `<small>${o.klein}</small>` : ''}</span>`;
      const input = label.querySelector('input');
      input.value = String(o.wert);
      input.checked = String(o.wert) === String(wert);
      input.addEventListener('change', () => { if (input.checked) aendern(o.wert); });
      box.append(label);
    }
  }

  function setze(feld, wert) {
    E[feld] = wert;
    sichern();
    alles();
  }

  // Auswahl an den gespeicherten Stand angleichen, ohne die Knöpfe neu zu bauen
  const FELDER = { garstufe: 'garstufe', groesse: 'groesse', start: 'start', topf: 'topf', methode: 'kalt', abschrecken: 'abschrecken', druckquelle: 'druckQuelle' };
  function syncAuswahl() {
    for (const input of document.querySelectorAll('input[type=radio]')) {
      const feld = FELDER[input.name];
      if (feld) input.checked = input.value === String(E[feld]);
    }
  }

  function baueBedienung() {
    const gar = $('#garstufen');
    gar.textContent = '';
    for (const [key, g] of Object.entries(C.GARSTUFEN)) {
      const label = document.createElement('label');
      label.innerHTML = `<input type="radio" name="garstufe"><span><svg viewBox="0 0 48 60" aria-hidden="true"><use href="#ei-schale" class="ei-weiss"/>${EI_SVG[key] || EI_SVG.mittel}</svg>${g.name}</span>`;
      const input = label.querySelector('input');
      input.value = key;
      input.checked = key === E.garstufe;
      input.addEventListener('change', () => { if (input.checked) setze('garstufe', key); });
      gar.append(label);
    }
    let info = gar.parentElement.querySelector('.garinfo');
    if (!info) { info = document.createElement('p'); info.className = 'garinfo'; gar.after(info); }

    segment($('#groessen'), 'groesse',
      Object.entries(C.GROESSEN).map(([k, g]) => ({ wert: k, text: k, klein: g.info })),
      E.groesse, (v) => setze('groesse', v));
    segment($('#starttemp'), 'start',
      Object.entries(C.STARTTEMPERATUR).map(([k, s]) => ({ wert: k, text: s.name, klein: `ca. ${zahl(s.grad)} °C` })),
      E.start, (v) => setze('start', v));
    segment($('#toepfe'), 'topf',
      Object.entries(C.TOEPFE).map(([k, t]) => ({ wert: k, text: t.name, klein: `${zahl(t.liter, t.liter % 1 ? 1 : 0)} l Wasser` })),
      E.topf, (v) => setze('topf', v));
    segment($('#methode'), 'methode', [
      { wert: false, text: 'Ins kochende Wasser' },
      { wert: true, text: 'Kalt aufsetzen' },
    ], E.kalt, (v) => setze('kalt', v));
    segment($('#abschrecken'), 'abschrecken', [
      { wert: true, text: 'Ja' },
      { wert: false, text: 'Nein' },
    ], E.abschrecken, (v) => setze('abschrecken', v));
    segment($('#druckquelle'), 'druckquelle', [
      { wert: 'standort', text: 'Standort' },
      { wert: 'hoehe', text: 'Höhe' },
      { wert: 'normal', text: 'Normal' },
    ], E.druckQuelle, (v) => {
      E.druckQuelle = v;
      sichern();
      alles();
      if (v === 'standort' && standortVeraltet()) holeStandort();
    });
  }

  $('#weniger').addEventListener('click', () => setze('anzahl', Math.max(1, E.anzahl - 1)));
  $('#mehr').addEventListener('click', () => setze('anzahl', Math.min(C.MAX_EIER, E.anzahl + 1)));
  $('#standort-holen').addEventListener('click', holeStandort);
  $('#hoehe').addEventListener('input', (ev) => {
    const v = Number(ev.target.value);
    E.hoehe = Number.isFinite(v) ? begrenze(v, -400, 6000) : 0;
    sichern();
    rechne();
    zeigeDruck();
  });

  // ---------- Rechnen und Anzeigen ----------

  let erg = null;

  function eingaben() {
    return {
      groesse: E.groesse, start: E.start, garstufe: E.garstufe, anzahl: E.anzahl, topf: E.topf,
      kalt: E.kalt, abschrecken: E.abschrecken, druck: druck().hPa,
    };
  }

  function rechne() {
    erg = P.berechne(eingaben(), C);
    zeigeErgebnis();
  }

  function zeigeDruck() {
    $('#panel-standort').hidden = E.druckQuelle !== 'standort';
    $('#panel-hoehe').hidden = E.druckQuelle !== 'hoehe';
    $('#panel-normal').hidden = E.druckQuelle !== 'normal';

    let text;
    if (standortLaedt) text = 'Standort und Luftdruck werden abgefragt …';
    else if (E.standort) {
      const s = E.standort;
      text = `${zahl(s.druck)} hPa am Standort${s.hoehe !== null ? ` (${zahl(s.hoehe)} m)` : ''}, abgerufen ${alter(s.zeit)}.`;
      if (standortVeraltet()) text += ' Tipp: aktualisieren, der Luftdruck ändert sich mit dem Wetter.';
    } else text = 'Noch kein Luftdruck abgerufen. Bis dahin wird mit 1013 hPa gerechnet.';
    if (standortFehler && E.druckQuelle === 'standort') text = standortFehler + ' ' + (E.standort ? text : '');
    $('#standort-status').textContent = text.trim();
    const knopf = $('#standort-holen');
    knopf.disabled = standortLaedt;
    knopf.textContent = E.standort ? 'Luftdruck aktualisieren' : 'Luftdruck am Standort abrufen';

    const hoehe = $('#hoehe');
    if (document.activeElement !== hoehe) hoehe.value = String(E.hoehe);
    const hPa = P.druckAusHoehe(E.hoehe, C);
    $('#hoehe-status').textContent = (standortFehler && E.druckQuelle === 'hoehe' ? standortFehler + ' ' : '') +
      `Ergibt etwa ${zahl(hPa)} hPa, Wasser kocht bei ${zahl(P.siedepunkt(hPa, C), 1)} °C.`;
  }

  function zeigeErgebnis() {
    const r = erg, g = C.GARSTUFEN[E.garstufe], d = druck();
    $('#erg-titel').textContent = E.kalt ? 'Ab dem Kochen' : 'Kochzeit';
    $('#erg-zeit').textContent = r.erreichbar ? mmss(r.kochzeit) : '–:––';

    let unter;
    if (E.kalt) {
      unter = r.sofort
        ? 'Bei so langem Aufheizen sind die Eier beim Kochen schon gar.'
        : `Aufheizen dauert etwa ${mmss(r.aufheiz)} min. Die App misst die echte Zeit und rechnet nach.`;
    } else {
      unter = 'Ab dem Einlegen ins sprudelnde Wasser';
    }
    $('#erg-unter').textContent = unter;

    const warnung = $('#erg-warnung');
    warnung.hidden = r.erreichbar;
    if (!r.erreichbar) {
      warnung.textContent = `Bei ${zahl(r.siede, 1)} °C Siedepunkt wird das Eigelb nicht ${g.name.toLowerCase()}. Wähle eine weichere Garstufe.`;
    }
    $('#start').disabled = !r.erreichbar;
    $('#start').textContent = E.kalt ? 'Start: Topf steht auf dem Herd' : 'Start: Eier sind im Wasser';

    $('#werte').innerHTML =
      `<li><b>${zahl(d.hPa)} hPa</b><span>Luftdruck</span></li>` +
      `<li><b>${zahl(r.siede, 1)} °C</b><span>Siedepunkt</span></li>` +
      `<li><b>${zahl(r.ziel, r.ziel % 1 ? 1 : 0)} °C</b><span>Ziel Eigelbrand</span></li>`;

    const info = document.querySelector('.garinfo');
    if (info) info.textContent = g.info;

    const topf = C.TOEPFE[E.topf];
    const th = $('#topf-hinweis');
    th.hidden = E.anzahl <= topf.maxEier;
    th.textContent = `Für ${E.anzahl} Eier ist der Topf knapp. Die Eier sollten nebeneinander liegen und ganz mit Wasser bedeckt sein.`;
    $('#anzahl').textContent = String(E.anzahl);
    $('#weniger').disabled = E.anzahl <= 1;
    $('#mehr').disabled = E.anzahl >= C.MAX_EIER;

    $('#methode-hinweis').textContent = E.kalt
      ? 'Eier mit kaltem Wasser aufsetzen und Start tippen, sobald der Herd an ist. Kocht das Wasser, tippst du „Wasser kocht jetzt“, ab dann läuft der Countdown.'
      : 'Wasser sprudelnd kochen lassen, Eier mit einem Löffel hineinlegen und sofort Start tippen. Herd auf hoher Stufe lassen.';
    $('#abschreck-hinweis').textContent = E.abschrecken
      ? 'Nach dem Timer kommen die Eier sofort in kaltes Wasser. So garen sie kaum nach.'
      : `Die Eier garen nach dem Herausnehmen nach. Das ist eingerechnet${r.nachgarAbzug ? ` (${dauer(r.nachgarAbzug)} kürzer)` : ''}.`;

    // Details
    const zeilen = [
      ['Luftdruck', `${zahl(d.hPa)} hPa`, d.quelle],
      ['Siedepunkt', `${zahl(r.siede, 1)} °C`],
      ['Ei', `${E.groesse}, ca. ${zahl(r.gramm)} g, ${zahl(r.tEi)} °C`],
      ['Ziel am Rand des Eigelbs', `${zahl(r.ziel, r.ziel % 1 ? 1 : 0)} °C`],
      ['Wasser', `${zahl(r.liter, r.liter % 1 ? 1 : 0)} l, ${E.anzahl} ${E.anzahl === 1 ? 'Ei' : 'Eier'}`],
    ];
    if (E.kalt) {
      zeilen.push(['Aufheizen (Schätzung)', `${mmss(r.aufheiz)} min`, `${zahl(r.herdWatt)} W Herdleistung`]);
    } else if (r.erreichbar) {
      zeilen.push(['Wasser nach dem Einlegen', `kurz ${zahl(r.wasserMin, 1)} °C`]);
      zeilen.push(['Zuschlag für Abkühlung', `+${dauer(r.abkuehlZuschlag)}`]);
    }
    if (!E.abschrecken && r.erreichbar) zeilen.push(['Abzug fürs Nachgaren', `−${dauer(r.nachgarAbzug)}`]);
    if (r.williams) zeilen.push(["Williams' Formel allein", `${mmss(r.williams)} min`, 'ideale Kugel, ohne Praxisfaktor']);
    zeilen.push([E.kalt ? 'Kochzeit ab dem Kochen' : 'Kochzeit', r.erreichbar ? `${mmss(r.kochzeit)} min` : '–', null, true]);
    $('#details').innerHTML = zeilen.map(([dt, dd, klein, summe]) =>
      `<dt${summe ? ' class="summe"' : ''}>${dt}${klein ? `<br><small>${klein}</small>` : ''}</dt><dd${summe ? ' class="summe"' : ''}>${dd}</dd>`).join('');
  }

  function alles() {
    syncAuswahl();
    rechne();
    zeigeDruck();
  }

  // ---------- Ton ----------

  let audio = null;

  function entsperreAudio() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audio) audio = new AC();
      if (audio.state === 'suspended') audio.resume();
      // stummer Klick, damit iOS den Ton später ohne Antippen erlaubt
      const o = audio.createOscillator(), g = audio.createGain();
      g.gain.value = 0;
      o.connect(g).connect(audio.destination);
      o.start();
      o.stop(audio.currentTime + 0.02);
    } catch { /* ohne Ton */ }
  }

  function gong() {
    if (!audio) return;
    try {
      if (audio.state === 'suspended') audio.resume();
      const t0 = audio.currentTime + 0.03;
      [[880, 0], [1108.7, 0.16], [1318.5, 0.32], [1760, 0.48]].forEach(([f, d]) => {
        const o = audio.createOscillator(), g = audio.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0 + d);
        g.gain.exponentialRampToValueAtTime(0.45, t0 + d + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.85);
        o.connect(g).connect(audio.destination);
        o.start(t0 + d);
        o.stop(t0 + d + 0.9);
      });
    } catch { /* ohne Ton */ }
  }

  let alarmUhr = null;

  function alarmAn() {
    if (alarmUhr || !L || L.phase !== 'fertig') return;
    const ende = (L.fertigUm || Date.now()) + C.ALARM_WIEDERHOLEN_S * 1000;
    if (Date.now() > ende) return;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* egal */ }
    const einmal = () => {
      if (!L || L.phase !== 'fertig' || Date.now() > ende) { alarmAus(); return; }
      gong();
      if (navigator.vibrate) navigator.vibrate([400, 150, 400, 150, 600]);
    };
    einmal();
    alarmUhr = setInterval(einmal, 1800);
  }

  function alarmAus() {
    clearInterval(alarmUhr);
    alarmUhr = null;
    if (navigator.vibrate) navigator.vibrate(0);
    try { if (navigator.audioSession) navigator.audioSession.type = 'auto'; } catch { /* egal */ }
  }

  $('#ton-test').addEventListener('click', () => { entsperreAudio(); gong(); });

  // ---------- Bildschirm wach halten ----------

  let sperre = null;
  let wachStatus = '';

  async function wachAn() {
    if (!('wakeLock' in navigator)) {
      wachStatus = 'Tipp: Bildschirm nicht sperren, sonst kommt der Ton erst beim Entsperren.';
      return;
    }
    if (sperre || document.visibilityState !== 'visible') return;
    try {
      sperre = await navigator.wakeLock.request('screen');
      wachStatus = 'Der Bildschirm bleibt an, solange der Timer läuft.';
      sperre.addEventListener('release', () => { sperre = null; });
    } catch {
      wachStatus = 'Bildschirm bleibt evtl. nicht an. Bitte nicht sperren, sonst kommt der Ton erst beim Entsperren.';
    }
    tick();
  }

  function wachAus() {
    if (sperre) sperre.release().catch(() => {});
    sperre = null;
  }

  // ---------- Timer ----------

  const UMFANG = 2 * Math.PI * 54;
  let tickUhr = null;
  let liveUm = 0, liveRest = null;
  let abbruchScharf = false, abbruchUhr = null;

  function zeigeTimer() {
    const box = $('#timer');
    box.hidden = !L;
    document.documentElement.style.overflow = L ? 'hidden' : '';
    if (!L) {
      clearInterval(tickUhr);
      tickUhr = null;
      document.title = 'Eier-Timer';
      return;
    }
    if (!tickUhr) tickUhr = setInterval(tick, 250);
    tick();
  }

  function ring(anteil) {
    const el = $('#ring');
    el.style.strokeDasharray = String(UMFANG);
    el.style.strokeDashoffset = String(UMFANG * (1 - begrenze(anteil, 0, 1)));
    el.style.opacity = anteil > 0.004 ? '' : '0'; // sonst bleibt ein runder Punkt stehen
  }

  function knoepfe(sichtbar) {
    for (const id of ['t-kocht', 't-aus', 't-pause', 't-abbruch']) $('#' + id).hidden = !sichtbar.includes(id);
  }

  function fertig(um) {
    L.phase = 'fertig';
    L.fertigUm = um;
    sichereLauf();
    alarmAn();
  }

  function tick() {
    if (!L) return;
    const jetzt = Date.now();
    if (L.phase === 'laeuft' && jetzt >= L.endeUm) fertig(L.endeUm);

    const ein = L.eingaben, g = C.GARSTUFEN[ein.garstufe] || { name: '' };
    $('#timer').className = 'timer ' + ({ heizen: 'heizen', pause: 'pausiert', fertig: 'fertig' }[L.phase] || '');
    $('#t-info').textContent = `${g.name} · ${ein.anzahl} ${ein.anzahl === 1 ? 'Ei' : 'Eier'} ${ein.groesse}` +
      (ein.kalt ? ' · kalt aufgesetzt' : '');

    let phase, zeit, unter = '', hinweis = '';
    if (L.phase === 'heizen') {
      const sek = (jetzt - L.heizStart) / 1000;
      phase = 'Wasser heizt auf';
      zeit = mmss(sek);
      unter = 'seit dem Start';
      ring(L.aufheizSchaetzung > 0 ? sek / L.aufheizSchaetzung : 0);
      if (jetzt - liveUm > 10000 && sek > 20) {
        liveUm = jetzt;
        liveRest = P.berechne({ ...ein, aufheizGemessen: sek }, C).kochzeit;
      }
      hinweis = liveRest === null
        ? 'Tippe auf „Wasser kocht jetzt“, sobald es sprudelnd kocht.'
        : liveRest > 0
          ? `Kocht es jetzt, dann noch ${mmss(liveRest)} min. Tippe, sobald es sprudelt.`
          : 'Die Eier sind schon gar: Sobald es kocht, gleich herausnehmen.';
      knoepfe(['t-kocht', 't-abbruch']);
    } else if (L.phase === 'laeuft') {
      const rest = L.endeUm - jetzt;
      phase = 'Eier kochen';
      zeit = mmss(Math.ceil(rest / 1000));
      unter = `fertig um ${uhrzeit(L.endeUm)}`;
      ring(1 - rest / L.gesamt);
      hinweis = ein.kalt ? 'Wasser sanft weiterkochen lassen.' : 'Herd auf hoher Stufe lassen, das Wasser soll weiter sprudeln.';
      $('#t-pause').textContent = 'Pause';
      knoepfe(['t-pause', 't-abbruch']);
    } else if (L.phase === 'pause') {
      phase = 'Pausiert';
      zeit = mmss(Math.ceil(L.rest / 1000));
      unter = 'Timer steht';
      ring(1 - L.rest / L.gesamt);
      hinweis = 'Die Eier garen im heißen Wasser weiter. Am besten bald fortsetzen.';
      $('#t-pause').textContent = 'Weiter';
      knoepfe(['t-pause', 't-abbruch']);
    } else {
      const ueber = (jetzt - (L.fertigUm || jetzt)) / 1000;
      phase = 'Fertig!';
      zeit = '0:00';
      unter = ueber > 5 ? `seit ${mmss(ueber)} min fertig` : '';
      ring(1);
      hinweis = L.sofort
        ? 'Das Aufheizen hat so lange gedauert, dass die Eier schon gar sind. Gleich herausnehmen' + (ein.abschrecken ? ' und kalt abschrecken.' : '.')
        : ein.abschrecken
          ? 'Eier sofort herausnehmen und 1 bis 2 Minuten in kaltem Wasser abschrecken.'
          : 'Eier herausnehmen. Sie garen noch etwas nach, das ist schon eingerechnet.';
      knoepfe(['t-aus']);
    }

    $('#t-phase').textContent = phase;
    $('#t-zeit').textContent = zeit;
    $('#t-unter').textContent = unter;
    $('#t-hinweis').textContent = hinweis;
    $('#t-wach').textContent = L.phase === 'fertig' ? '' : wachStatus;
    document.title = L.phase === 'fertig' ? 'Fertig! · Eier-Timer' : `${zeit} · Eier-Timer`;
  }

  function beende() {
    alarmAus();
    wachAus();
    L = null;
    liveRest = null;
    sichereLauf();
    zeigeTimer();
  }

  $('#start').addEventListener('click', () => {
    if (!erg || !erg.erreichbar) return;
    entsperreAudio();
    const ein = eingaben();
    const jetzt = Date.now();
    if (E.kalt) {
      L = { phase: 'heizen', heizStart: jetzt, aufheizSchaetzung: erg.aufheiz, eingaben: ein };
    } else {
      L = { phase: 'laeuft', endeUm: jetzt + erg.kochzeit * 1000, gesamt: erg.kochzeit * 1000, eingaben: ein };
    }
    liveUm = 0;
    liveRest = null;
    sichereLauf();
    wachAn();
    zeigeTimer();
  });

  $('#t-kocht').addEventListener('click', () => {
    if (!L || L.phase !== 'heizen') return;
    entsperreAudio();
    const jetzt = Date.now();
    const heiz = Math.max(1, (jetzt - L.heizStart) / 1000);
    const r = P.berechne({ ...L.eingaben, aufheizGemessen: heiz }, C);
    const sek = r.erreichbar ? r.kochzeit : 0;
    L.aufheiz = heiz;
    L.phase = 'laeuft';
    L.sofort = sek <= 0;
    L.endeUm = jetzt + sek * 1000;
    L.gesamt = Math.max(1, sek * 1000);
    sichereLauf();
    tick();
  });

  $('#t-pause').addEventListener('click', () => {
    if (!L) return;
    const jetzt = Date.now();
    if (L.phase === 'laeuft') {
      L.rest = Math.max(0, L.endeUm - jetzt);
      L.phase = 'pause';
    } else if (L.phase === 'pause') {
      L.endeUm = jetzt + L.rest;
      L.phase = 'laeuft';
      entsperreAudio();
      wachAn();
    }
    sichereLauf();
    tick();
  });

  $('#t-abbruch').addEventListener('click', () => {
    const knopf = $('#t-abbruch');
    if (!abbruchScharf) {
      abbruchScharf = true;
      knopf.textContent = 'Wirklich abbrechen? Nochmal tippen';
      abbruchUhr = setTimeout(() => { abbruchScharf = false; knopf.textContent = 'Abbrechen'; }, 3000);
      return;
    }
    clearTimeout(abbruchUhr);
    abbruchScharf = false;
    knopf.textContent = 'Abbrechen';
    beende();
  });

  $('#t-aus').addEventListener('click', beende);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (L) {
      tick();
      wachAn();
      if (L.phase === 'fertig') alarmAn();
    }
    if (E.druckQuelle === 'standort') zeigeDruck();
  });

  // ---------- Los geht's ----------

  baueBedienung();
  alles();
  zeigeTimer();
  if (L) wachAn();
  standortAutomatisch();
})();
