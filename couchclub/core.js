/* Couchclub — App-Kern: Speicher, Profile, Navigation, Spielrahmen */
(() => {
  'use strict';

  const CC = (window.CC = { games: [] });
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  CC.esc = esc;

  const COLORS = ['coral', 'blue', 'saffron', 'teal', 'plum', 'rose'];
  const COLOR_NAMES = { coral: 'Koralle', blue: 'Blau', saffron: 'Safran', teal: 'Petrol', plum: 'Pflaume', rose: 'Pink' };
  const LEVELS = ['Leicht', 'Mittel', 'Schwer'];
  const MODE_LABEL = { ai: 'Gegen KI', duo: 'Zu zweit', solo: 'Alleine' };
  const SOON = ['Codeknacker', 'Zahlenkette', 'Reaktionsduell', 'Undercover', 'Schiffe versenken', 'Air-Hockey', 'Begriffe erklären', 'Wörter raten', 'Quiz'];
  const KEY = 'couchclub.v1';
  // Spielstände der Solo-Abenteuer: spiele.html (Kerker-Wischer und Lichtläufer) und mond.html (Mondgeläut)
  const saveKeysOf = (pid) => ['kerker-licht-v2@' + pid, 'mondgelaeut-v1@' + pid];

  /* ---------- Speicher ---------- */
  function defaults() {
    const now = Date.now();
    return {
      v: 1,
      players: [
        { id: 'p1', name: 'Joel', color: 'coral', since: now, no: 1 },
        { id: 'p2', name: 'Max', color: 'blue', since: now, no: 2 },
      ],
      nextNo: 3,
      lineup: ['p1', 'p2'],
      stats: {},
      settings: { sound: true, haptics: true, motion: true },
      last: {},
    };
  }
  let state = null;
  let storageOk = true;
  try { state = JSON.parse(localStorage.getItem(KEY)); } catch (e) { storageOk = false; }
  if (!state || state.v !== 1) state = defaults();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); storageOk = true; } catch (e) { storageOk = false; }
  }

  const reduceMQ = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const motionOn = () => state.settings.motion && !reduceMQ.matches;
  function applyMotion() { document.documentElement.classList.toggle('still', !motionOn()); }

  /* ---------- Sound & Vibration ---------- */
  let actx = null;
  function audio() {
    if (!actx) {
      const A = window.AudioContext || window.webkitAudioContext;
      if (!A) return null;
      try { actx = new A(); } catch (e) { return null; }
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  function tone(freq, dur, type = 'sine', vol = 0.14, when = 0, slide = 0) {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + when;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.03);
  }
  const SFX = {
    tap: () => tone(640, 0.06, 'triangle', 0.08),
    place: () => tone(460, 0.1, 'triangle', 0.12, 0, 320),
    drop: () => tone(210, 0.16, 'sine', 0.24, 0, 90),
    flip: () => tone(880, 0.05, 'triangle', 0.06, 0, 1250),
    point: () => { tone(740, 0.09, 'triangle', 0.12); tone(990, 0.16, 'triangle', 0.12, 0.08); },
    miss: () => tone(280, 0.14, 'sine', 0.08, 0, 210),
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.24, 'triangle', 0.13, i * 0.09)),
    lose: () => [392, 330, 262].forEach((f, i) => tone(f, 0.28, 'sine', 0.12, i * 0.13)),
    draw: () => { tone(440, 0.16, 'triangle', 0.1); tone(440, 0.2, 'triangle', 0.1, 0.2); },
  };
  function sfx(name) { if (state.settings.sound && SFX[name]) try { SFX[name](); } catch (e) { /* stumm */ } }
  function buzz(pattern) { if (state.settings.haptics && navigator.vibrate) try { navigator.vibrate(pattern); } catch (e) { /* nicht verfügbar */ } }

  /* ---------- Helfer ---------- */
  const playerById = (id) => state.players.find((p) => p.id === id);
  const initial = (name) => (name.trim()[0] || '?').toUpperCase();
  function avatar(p, size = '') {
    if (p.ai) return `<span class="av ai ${size}">KI</span>`;
    return `<span class="av ${size}" style="--pc:var(--p-${p.color})" aria-hidden="true">${esc(initial(p.name))}</span>`;
  }
  function stat(pid, gid) {
    const s = (state.stats[pid] ||= {});
    return (s[gid] ||= { w: 0, l: 0, d: 0 });
  }
  const fmtDate = (t) => new Date(t).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' });
  const gameById = (id) => CC.games.find((g) => g.id === id);

  /* ---------- Navigation ---------- */
  const view = $('#view');
  let tab = 'games';
  function setTab(t) {
    tab = t;
    render();
    window.scrollTo({ top: 0 });
  }
  function render() {
    document.querySelectorAll('.tab').forEach((b) => {
      if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    if (tab === 'players') renderPlayers();
    else if (tab === 'settings') renderSettings();
    else renderGames();
  }

  /* ---------- Spiele ---------- */
  function headline() {
    const names = state.lineup.map(playerById).filter(Boolean);
    if (names.length === 2) return `<em style="--pc:var(--p-${names[0].color})">${esc(names[0].name)}</em> gegen <em style="--pc:var(--p-${names[1].color})">${esc(names[1].name)}</em>. Was spielt ihr?`;
    if (names.length === 1) return `Eine Runde, <em style="--pc:var(--p-${names[0].color})">${esc(names[0].name)}</em>?`;
    if (names.length > 2) return 'Wer ist heute dabei?';
    return 'Was spielen wir?';
  }
  function tile(g) {
    const modes = g.modes.map((m) => ({ ai: 'KI', duo: '2 Spieler', solo: 'Solo' }[m])).join(' · ');
    return `<button class="tile ${g.frame ? 'wide' : ''}" data-game="${g.id}" style="--gc:var(--p-${g.color})">
      <span class="thumb">${g.thumb}</span>
      <span class="tile-body">
        <span class="tile-name">${g.name}</span>
        <span class="tile-tag">${g.tagline}</span>
        <span class="tile-meta">${modes} · ${g.minutes} Min.</span>
      </span>
    </button>`;
  }
  function renderGames() {
    const duels = CC.games.filter((g) => !g.frame), solos = CC.games.filter((g) => g.frame);
    view.innerHTML = `
      <section class="intro">
        <h1 class="hello">${headline()}</h1>
        <div class="lineup" role="group" aria-label="Heute dabei">
          ${state.players.map((p) => {
            const on = state.lineup.includes(p.id);
            return `<button class="chip ${on ? 'is-on' : ''}" data-lineup="${p.id}" aria-pressed="${on}" style="--pc:var(--p-${p.color})"><span class="dot">${esc(initial(p.name))}</span>${esc(p.name)}</button>`;
          }).join('')}
          <button class="chip chip-add" data-action="add-player">+ Spieler</button>
        </div>
      </section>
      <div class="shelf-head"><h2 class="section-label">Im Club · ${duels.length} Spiele</h2></div>
      <section class="shelf">${duels.map(tile).join('')}</section>
      ${solos.length ? `<div class="shelf-head"><h2 class="section-label">Solo-Abenteuer</h2></div>
      <section class="shelf shelf-wide">${solos.map(tile).join('')}</section>` : ''}
      <section class="soon">
        <h2 class="section-label">Kommt als Nächstes</h2>
        <ul class="soon-list">${SOON.map((s) => `<li>${s}</li>`).join('')}</ul>
      </section>`;
  }

  /* ---------- Spieler ---------- */
  function memberCard(p) {
    const s = state.stats[p.id] || {};
    let w = 0, l = 0, d = 0;
    Object.values(s).forEach((x) => { w += x.w; l += x.l; d += x.d; });
    const total = w + l + d;
    const rows = CC.games.map((g) => {
      const x = s[g.id];
      if (g.frame) {
        const cell = x?.sum?.runs ? `<td>${esc(g.statText(x.sum))}</td>` : '<td class="muted">noch nicht gespielt</td>';
        return `<tr><th scope="row">${g.name}</th>${cell}</tr>`;
      }
      const duels = x ? x.w + x.l + x.d : 0;
      const solo = x?.solo || 0;
      const parts = [];
      if (duels) parts.push(`${x.w} gew. · ${x.d} unent. · ${x.l} verl.`);
      if (solo) parts.push(`${solo}× solo`);
      const cell = parts.length ? `<td>${parts.join(' · ')}</td>` : '<td class="muted">noch nicht gespielt</td>';
      return `<tr><th scope="row">${g.name}</th>${cell}</tr>`;
    }).join('');
    return `<article class="member" style="--pc:var(--p-${p.color})">
      <header class="member-top">
        ${avatar(p, 'lg')}
        <div>
          <h2 class="member-name">${esc(p.name)}</h2>
          <p class="member-no">Mitglied Nr. ${String(p.no).padStart(3, '0')} · seit ${fmtDate(p.since)}</p>
        </div>
        <button class="icon-btn" data-edit="${p.id}" aria-label="${esc(p.name)} bearbeiten">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>
        </button>
      </header>
      <div class="member-totals">
        <div><b>${w}</b><span>Siege</span></div>
        <div><b>${d}</b><span>Unentsch.</span></div>
        <div><b>${l}</b><span>Niederl.</span></div>
        <div><b>${total ? Math.round((w / total) * 100) + '%' : '–'}</b><span>Quote</span></div>
      </div>
      <table class="member-games"><tbody>${rows}</tbody></table>
    </article>`;
  }
  function renderPlayers() {
    view.innerHTML = `
      <section class="page-head">
        <h1 class="page-title">Spieler</h1>
        <button class="btn small ghost" data-action="add-player">+ Neu</button>
      </section>
      <p class="page-note">${storageOk ? 'Profile und Statistiken werden auf diesem Gerät gespeichert.' : 'In dieser Ansicht kann nichts gespeichert werden. Profile gelten nur, bis die Seite neu lädt.'}</p>
      <div class="cards">${state.players.map(memberCard).join('')}</div>`;
  }

  /* ---------- Einstellungen ---------- */
  let confirmReset = false;
  function renderSettings() {
    const s = state.settings;
    const vib = !!navigator.vibrate;
    view.innerHTML = `
      <section class="page-head"><h1 class="page-title">Einstellungen</h1></section>
      <div class="settings">
        <div class="group">
          <h2 class="section-label">Spielgefühl</h2>
          <div class="rows">
            <label class="row" for="set-sound"><span class="row-text"><b>Sound</b><small>Kurze Töne beim Setzen, Punkten und Gewinnen</small></span><input class="switch" type="checkbox" role="switch" id="set-sound" data-setting="sound" ${s.sound ? 'checked' : ''}></label>
            <label class="row" for="set-haptics"><span class="row-text"><b>Vibration</b><small>${vib ? 'Kurzes Brummen bei wichtigen Momenten' : 'Wird von diesem Browser nicht unterstützt (z. B. iPhone, iPad).'}</small></span><input class="switch" type="checkbox" role="switch" id="set-haptics" data-setting="haptics" ${s.haptics ? 'checked' : ''} ${vib ? '' : 'disabled'}></label>
            <label class="row" for="set-motion"><span class="row-text"><b>Animationen</b><small>${reduceMQ.matches ? 'Dein Gerät hat „Bewegung reduzieren“ aktiviert, daher bleiben sie aus.' : 'Fallende Steine, drehende Karten, Konfetti'}</small></span><input class="switch" type="checkbox" role="switch" id="set-motion" data-setting="motion" ${s.motion ? 'checked' : ''}></label>
          </div>
        </div>
        <div class="group">
          <h2 class="section-label">Daten</h2>
          <div class="rows">
            <div class="row"><span class="row-text"><b>Statistiken zurücksetzen</b><small>Profile bleiben, alle Siege und Rekorde werden gelöscht. Die Spielstände der Solo-Abenteuer bleiben erhalten.</small></span><button class="btn small ${confirmReset ? 'danger' : 'ghost'}" data-action="reset-stats">${confirmReset ? 'Wirklich?' : 'Zurücksetzen'}</button></div>
          </div>
        </div>
        <div class="group">
          <h2 class="section-label">Über Couchclub</h2>
          <div class="rows">
            <div class="row"><span class="row-text"><b>Version 1.1</b><small>${CC.games.filter((g) => !g.frame).length} Spiele mit KI-Gegner in drei Stufen und ${CC.games.filter((g) => g.frame).length} Solo-Abenteuer. ${SOON.length} weitere Spiele sind geplant.</small></span></div>
          </div>
        </div>
      </div>`;
  }

  /* ---------- Bottom-Sheet ---------- */
  const sheet = $('#sheet');
  const panel = $('#sheet-panel');
  let sheetKind = null;
  function showSheet(kind) {
    sheetKind = kind;
    sheet.hidden = false;
    const first = panel.querySelector('input, button:not([data-action="close-sheet"])');
    if (first && kind === 'editor') setTimeout(() => first.focus(), 60);
  }
  function hideSheet() { sheet.hidden = true; sheetKind = null; setup = null; editor = null; }

  /* Spiel-Setup */
  let setup = null;
  const needed = (mode) => (mode === 'duo' ? 2 : 1);
  function fillPicks() {
    const n = needed(setup.mode);
    const pool = [...state.lineup, ...state.players.map((p) => p.id)];
    setup.picks = setup.picks.filter((id) => playerById(id));
    for (const id of pool) {
      if (setup.picks.length >= n) break;
      if (!setup.picks.includes(id) && playerById(id)) setup.picks.push(id);
    }
    setup.picks = setup.picks.slice(0, n);
  }
  function openSetup(gid) {
    const g = gameById(gid);
    const last = state.last[gid] || {};
    const opts = {};
    g.options.forEach((o) => { opts[o.id] = last.opts && o.choices.some((c) => c.v === last.opts[o.id]) ? last.opts[o.id] : o.default; });
    setup = {
      g,
      mode: g.modes.includes(last.mode) ? last.mode : g.modes[0],
      level: last.level || 2,
      picks: (last.picks || state.lineup).slice(),
      opts,
    };
    fillPicks();
    renderSetup();
    showSheet('setup');
  }
  function seg(items, attr, current) {
    return `<div class="seg">${items.map((it) => `<button data-${attr}="${it.v}" aria-pressed="${String(it.v) === String(current)}">${it.l}</button>`).join('')}</div>`;
  }
  function renderSetup() {
    const { g, mode, level, picks, opts } = setup;
    const n = needed(mode);
    const enough = picks.length === n;
    const who = state.players.map((p) => {
      const idx = picks.indexOf(p.id);
      const on = idx >= 0;
      return `<button class="chip ${on ? 'is-on' : ''}" data-pick="${p.id}" aria-pressed="${on}" style="--pc:var(--p-${p.color})"><span class="dot">${esc(initial(p.name))}</span>${esc(p.name)}${on && n > 1 ? `<span class="pick-order">${idx === 0 ? 'beginnt' : ''}</span>` : ''}</button>`;
    }).join('');
    panel.innerHTML = `
      <div class="sheet-head" style="--gc:var(--p-${g.color})">
        <span class="thumb">${g.thumb}</span>
        <div><h2 class="sheet-title" id="sheet-title">${g.name}</h2><p class="sheet-sub">${g.tagline}</p></div>
        <button class="icon-btn" data-action="close-sheet" aria-label="Schließen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>
      <ul class="rules">${g.rules.map((r) => `<li>${r}</li>`).join('')}</ul>
      ${g.modes.length > 1 ? `<div class="field"><span class="label">Modus</span>${seg(g.modes.map((m) => ({ v: m, l: MODE_LABEL[m] })), 'mode', mode)}</div>` : ''}
      <div class="field">
        <span class="label">${n > 1 ? 'Wer spielt? Zwei antippen' : 'Wer spielt?'}</span>
        <div class="lineup">${who}<button class="chip chip-add" data-action="add-player">+ Spieler</button></div>
        ${n > 1 && state.players.length < 2 ? '<span class="hint">Lege einen zweiten Spieler an, um zu zweit zu spielen.</span>' : ''}
      </div>
      ${g.frame ? `<div class="field"><span class="label">Spielstand${picks[0] ? ` von ${esc(playerById(picks[0]).name)}` : ''}</span><p class="progress">${esc(frameProgress(g, picks[0]))}</p></div>` : ''}
      ${mode === 'ai' ? `<div class="field"><span class="label">KI-Stufe</span>${seg(LEVELS.map((l, i) => ({ v: i + 1, l })), 'level', level)}<span class="hint">${['Macht Fehler, gut zum Reinkommen.', 'Denkt ein paar Züge voraus.', 'Spielt richtig stark. Viel Glück.'][level - 1]}</span></div>` : ''}
      ${g.options.map((o) => `<div class="field"><span class="label">${o.label}</span>${seg(o.choices, `opt-${o.id}`, opts[o.id])}</div>`).join('')}
      <button class="btn primary wide" data-action="start" ${enough ? '' : 'disabled'}>Los geht’s</button>`;
    panel.setAttribute('aria-labelledby', 'sheet-title');
  }

  function frameProgress(g, pid) {
    const x = pid && state.stats[pid]?.[g.id]?.sum;
    return x && x.runs ? g.statText(x) : 'Noch nicht gespielt. Das Abenteuer beginnt von vorn.';
  }

  /* Spieler-Editor */
  let editor = null;
  function openEditor(id) {
    const p = id && playerById(id);
    const used = state.players.map((x) => x.color);
    editor = p
      ? { id: p.id, name: p.name, color: p.color, confirm: false, back: sheetKind === 'setup' ? setup : null }
      : { id: null, name: '', color: COLORS.find((c) => !used.includes(c)) || COLORS[state.players.length % COLORS.length], confirm: false, back: sheetKind === 'setup' ? setup : null };
    renderEditor();
    sheetKind = 'editor';
    sheet.hidden = false;
    setTimeout(() => $('#player-name')?.focus(), 80);
  }
  function renderEditor() {
    const e = editor;
    panel.innerHTML = `
      <div class="sheet-head">
        <div><h2 class="sheet-title" id="sheet-title">${e.id ? 'Spieler bearbeiten' : 'Neues Mitglied'}</h2><p class="sheet-sub">Name und Farbe erscheinen in jedem Spiel.</p></div>
        <button class="icon-btn" data-action="close-sheet" aria-label="Schließen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>
      <div class="field"><label class="label" for="player-name">Name</label><input class="form-input" id="player-name" maxlength="14" autocomplete="off" placeholder="z. B. Lena" value="${esc(e.name)}"></div>
      <div class="field"><span class="label">Farbe</span><div class="swatches">${COLORS.map((c) => `<button class="swatch" data-color="${c}" aria-pressed="${c === e.color}" style="--pc:var(--p-${c})" aria-label="Farbe ${COLOR_NAMES[c]}"></button>`).join('')}</div></div>
      <div class="sheet-actions">
        ${e.id && state.players.length > 1 ? `<button class="btn ${e.confirm ? 'danger' : 'ghost'}" data-action="delete-player">${e.confirm ? 'Wirklich löschen?' : 'Löschen'}</button>` : ''}
        <button class="btn primary" data-action="save-player">${e.id ? 'Speichern' : 'Aufnehmen'}</button>
      </div>`;
    panel.setAttribute('aria-labelledby', 'sheet-title');
  }
  function saveEditor() {
    const name = ($('#player-name')?.value || '').trim().slice(0, 14);
    if (!name) { $('#player-name')?.focus(); return; }
    let id = editor.id;
    const isNew = !id;
    if (id) Object.assign(playerById(id), { name, color: editor.color });
    else {
      id = 'p' + Math.random().toString(36).slice(2, 8);
      state.players.push({ id, name, color: editor.color, since: Date.now(), no: state.nextNo++ });
      if (state.lineup.length < 2) state.lineup.push(id);
    }
    save();
    const back = editor.back;
    editor = null;
    if (back) {
      setup = back;
      if (isNew && setup.picks.length < needed(setup.mode)) setup.picks.push(id);
      renderSetup();
      sheetKind = 'setup';
    } else hideSheet();
    render();
  }
  function deleteEditor() {
    if (!editor.confirm) { editor.confirm = true; renderEditor(); return; }
    const id = editor.id;
    state.players = state.players.filter((p) => p.id !== id);
    state.lineup = state.lineup.filter((x) => x !== id);
    delete state.stats[id];
    saveKeysOf(id).forEach((k) => { try { localStorage.removeItem(k); } catch (e) { /* nichts gespeichert */ } });
    Object.values(state.last).forEach((l) => { if (l.picks) l.picks = l.picks.filter((x) => x !== id); });
    save();
    hideSheet();
    render();
  }

  /* ---------- Spielrahmen ---------- */
  const play = $('#play');
  const stageHost = $('#stage');
  const scorebar = $('#scorebar');
  const statusEl = $('#status');
  const resultEl = $('#result');
  let match = null;
  let inst = null;
  let timers = [];
  let live = null;

  function start() {
    const { g, mode, level, picks, opts } = setup;
    state.last[g.id] = { mode, level, picks: picks.slice(), opts: { ...opts } };
    save();
    if (g.frame) { hideSheet(); openFrame(g, playerById(picks[0])); return; }
    const players = picks.map((id) => ({ ...playerById(id) }));
    if (mode === 'ai') {
      const color = ['plum', 'teal', 'blue', 'coral'].find((c) => c !== players[0].color);
      players.push({ id: 'ai', name: 'KI', color, ai: true, level });
    }
    match = { g, mode, level, opts, players, wins: {}, round: 0 };
    players.forEach((p) => (match.wins[p.id] = 0));
    hideSheet();
    $('#play-name').textContent = g.name;
    $('#play-mode').textContent = [mode === 'ai' ? `Gegen KI · ${LEVELS[level - 1]}` : MODE_LABEL[mode], g.optionLabel?.(opts)].filter(Boolean).join(' · ');
    play.hidden = false;
    document.body.classList.add('is-playing');
    newRound();
  }

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function newRound() {
    clearTimers();
    try { inst?.destroy?.(); } catch (e) { /* weiter */ }
    resultEl.hidden = true;
    resultEl.innerHTML = '';
    const order = match.round % 2 && match.players.length > 1 ? [...match.players].reverse() : match.players;
    live = { order, turn: null, points: {}, labels: {}, done: false };
    renderScorebar();
    statusEl.textContent = '';
    stageHost.replaceChildren();
    const stage = document.createElement('div');
    stage.className = 'stage-inner';
    stage.style.cssText = 'width:100%;height:100%;display:grid;place-items:center;min-height:0';
    stageHost.append(stage);
    const api = {
      players: order,
      mode: match.mode,
      opts: match.opts,
      motion: motionOn(),
      turn(i) { live.turn = order[i]?.id ?? null; paintPills(); },
      score(i, v, label) { live.points[order[i].id] = v; if (label) live.labels[order[i].id] = label; paintPills(); },
      status(t) { statusEl.textContent = t; },
      sfx,
      buzz,
      later(fn, ms) { const t = setTimeout(fn, ms); timers.push(t); return t; },
      finish,
      esc,
    };
    inst = match.g.create(stage, api);
  }

  function renderScorebar() {
    scorebar.innerHTML = match.players.map((p) => `
      <div class="pp" data-pid="${p.id}" style="--pc:var(--p-${p.color})">
        ${avatar(p)}
        <div class="pp-text"><span class="pp-name">${esc(p.ai ? 'KI' : p.name)}</span><span class="pp-sub"></span></div>
        <span class="pp-score">0</span>
      </div>`).join('');
    paintPills();
  }
  function paintPills() {
    scorebar.querySelectorAll('.pp').forEach((el) => {
      const id = el.dataset.pid;
      const on = !live.done && live.turn === id && match.players.length > 1;
      const hasPts = id in live.points;
      const wins = match.wins[id];
      el.classList.toggle('on', on);
      el.querySelector('.pp-score').textContent = hasPts ? live.points[id] : wins;
      el.querySelector('.pp-sub').textContent = on
        ? (id === 'ai' ? 'denkt nach' : 'am Zug')
        : hasPts ? (live.labels[id] || (wins ? `${wins} ${wins === 1 ? 'Sieg' : 'Siege'}` : 'Punkte'))
        : (wins === 1 ? 'Sieg' : 'Siege');
    });
  }

  function finish(res) {
    if (live.done) return;
    live.done = true;
    const g = match.g;
    const winner = res.winner == null ? null : live.order[res.winner];
    let record = false;
    live.order.forEach((p, i) => {
      if (p.ai) return;
      const s = stat(p.id, g.id);
      if (match.mode === 'solo') {
        s.solo = (s.solo || 0) + 1;
        if (res.best) {
          s.best ||= {};
          const prev = s.best[res.best.key];
          if (prev == null || res.best.value < prev) { if (prev != null) record = true; s.best[res.best.key] = res.best.value; }
        }
      } else if (winner == null) s.d++;
      else if (res.winner === i) s.w++;
      else s.l++;
    });
    save();
    if (winner && match.mode !== 'solo') match.wins[winner.id]++;
    paintPills();
    if (match.mode === 'solo') { sfx('win'); confetti('velvet'); buzz([30, 40, 30]); }
    else if (!winner) sfx('draw');
    else if (winner.ai) { sfx('lose'); buzz(80); }
    else { sfx('win'); confetti(winner.color); buzz([30, 40, 30]); }
    const t = setTimeout(() => showResult(res, winner, record), res.delay ?? 900);
    timers.push(t);
  }

  function showResult(res, winner, record) {
    const g = match.g;
    let title, pc = '';
    if (match.mode === 'solo') title = 'Geschafft!';
    else if (!winner) title = 'Unentschieden';
    else if (winner.ai) title = 'Die KI gewinnt';
    else { title = `${esc(winner.name)} gewinnt`; pc = `style="--pc:var(--p-${winner.color})"`; }
    const [a, b] = match.players;
    const score = match.players.length === 2
      ? `<div class="result-score"><span>${esc(a.ai ? 'KI' : a.name)}</span><b>${match.wins[a.id]}</b><b>:</b><b>${match.wins[b.id]}</b><span>${esc(b.ai ? 'KI' : b.name)}</span></div>`
      : '';
    resultEl.innerHTML = `
      <div class="result-card" role="dialog" aria-labelledby="result-title">
        ${record ? '<span class="record">Neuer Rekord</span>' : ''}
        <h2 class="result-title" id="result-title" ${pc}>${title}</h2>
        ${res.detail ? `<p class="result-detail">${res.detail}</p>` : ''}
        ${score}
        <div class="result-actions">
          <button class="btn primary" data-action="rematch">${match.mode === 'solo' ? 'Nochmal' : 'Revanche'}</button>
          <button class="btn ghost" data-action="leave">Andere Spiele</button>
        </div>
      </div>`;
    resultEl.hidden = false;
    resultEl.querySelector('[data-action="rematch"]').focus({ preventScroll: true });
  }

  function leave() {
    clearTimers();
    try { inst?.destroy?.(); } catch (e) { /* weiter */ }
    inst = null;
    match = null;
    play.hidden = true;
    document.body.classList.remove('is-playing');
    stageHost.replaceChildren();
    render();
  }

  /* ---------- Solo-Abenteuer im Vollbild ---------- */
  const frameEl = $('#frame');
  let frame = null;
  const SUM_KEYS = ['runs', 'wins', 'world', 'asc', 'bank', 'depth', 'best', 'rank', 'zone', 'lvl', 'bosse', 'tode', 'min', 'akt'];
  const FRAME_SOURCES = ['kerker-licht', 'mondgelaeut'];
  function openFrame(g, p) {
    const s = state.settings;
    const q = new URLSearchParams({ g: g.frame.g, p: p.id, n: p.name, snd: s.sound ? 1 : 0, vib: s.haptics ? 1 : 0, mot: motionOn() ? 1 : 0 });
    frameEl.style.setProperty('--fbg', g.frame.bg);
    frameEl.classList.remove('ready', 'failed');
    frameEl.innerHTML = `
      <div class="frame-load" style="--gc:var(--p-${g.color})">
        <span class="frame-thumb">${g.thumb}</span>
        <p class="frame-msg">${g.name} lädt …</p>
        <button class="btn small ghost" data-action="close-frame" hidden>Zurück</button>
      </div>
      <iframe title="${g.name} für ${esc(p.name)}" src="${g.frame.src}#${q}"></iframe>`;
    frameEl.hidden = false;
    document.body.classList.add('is-playing');
    frame = { g, pid: p.id, win: frameEl.querySelector('iframe'), ready: false };
    frame.timer = setTimeout(() => {
      if (!frame || frame.ready) return;
      frameEl.classList.add('failed');
      frameEl.querySelector('.frame-msg').textContent = `${g.name} startet gerade nicht. Versuch es gleich noch einmal.`;
      frameEl.querySelector('[data-action="close-frame"]').hidden = false;
    }, 15000);
  }
  function closeFrame() {
    if (!frame) return;
    clearTimeout(frame.timer);
    frame = null;
    frameEl.hidden = true;
    frameEl.replaceChildren();
    document.body.classList.remove('is-playing');
    render();
  }
  window.addEventListener('message', (e) => {
    if (!frame || e.source !== frame.win.contentWindow) return;
    const d = e.data;
    if (!d || !FRAME_SOURCES.includes(d.cc)) return;
    if (d.sum && typeof d.sum === 'object') {
      const sum = {};
      SUM_KEYS.forEach((k) => { const v = Number(d.sum[k]); if (Number.isFinite(v) && v >= 0) sum[k] = Math.floor(v); });
      stat(frame.pid, frame.g.id).sum = sum;
      save();
    }
    if (d.t === 'ready' && !frame.ready) {
      frame.ready = true;
      frameEl.classList.add('ready');
      frame.win.focus();
    }
    if (d.t === 'leave') closeFrame();
  });

  /* ---------- Konfetti ---------- */
  function confetti(colorKey) {
    if (!motionOn()) return;
    const c = $('#confetti');
    const x = c.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = innerWidth, H = innerHeight;
    c.width = W * dpr; c.height = H * dpr;
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cs = getComputedStyle(document.documentElement);
    const main = cs.getPropertyValue(colorKey === 'velvet' ? '--velvet' : '--p-' + colorKey).trim();
    const others = COLORS.map((k) => cs.getPropertyValue('--p-' + k).trim());
    const parts = Array.from({ length: 140 }, (_, i) => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.3,
      y: H * 0.45,
      vx: (Math.random() - 0.5) * 16,
      vy: -Math.random() * 15 - 6,
      r: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.35,
      w: 6 + Math.random() * 7,
      h: 3 + Math.random() * 4,
      c: i < 60 ? main : others[(Math.random() * others.length) | 0],
    }));
    c.hidden = false;
    const t0 = performance.now();
    let last = t0;
    function step(t) {
      const dt = Math.min(34, t - last) / 16.7;
      last = t;
      x.clearRect(0, 0, W, H);
      const fade = Math.max(0, 1 - (t - t0 - 1500) / 700);
      x.globalAlpha = Math.min(1, fade);
      for (const p of parts) {
        p.vy += 0.42 * dt; p.vx *= 0.985; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
        x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); x.restore();
      }
      if (t - t0 < 2200) requestAnimationFrame(step);
      else { x.clearRect(0, 0, W, H); c.hidden = true; }
    }
    requestAnimationFrame(step);
  }

  /* ---------- Eingaben ---------- */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('button,[data-action]');
    if (!el) return;
    audio();
    const d = el.dataset;
    if (d.tab) { if (!play.hidden) leave(); confirmReset = false; setTab(d.tab); return; }
    if (d.game) { sfx('tap'); openSetup(d.game); return; }
    if (d.lineup) {
      const id = d.lineup;
      state.lineup = state.lineup.includes(id) ? state.lineup.filter((x) => x !== id) : [...state.lineup, id];
      save(); sfx('tap'); render(); return;
    }
    if (setup && sheetKind === 'setup') {
      if (d.mode) { setup.mode = d.mode; fillPicks(); renderSetup(); return; }
      if (d.level) { setup.level = +d.level; renderSetup(); return; }
      if (d.pick) {
        const n = needed(setup.mode);
        const id = d.pick;
        if (setup.picks.includes(id)) setup.picks = setup.picks.filter((x) => x !== id);
        else { setup.picks.push(id); if (setup.picks.length > n) setup.picks.shift(); }
        sfx('tap'); renderSetup(); return;
      }
      const optKey = Object.keys(d).find((k) => k.startsWith('opt'));
      if (optKey) {
        const id = optKey.slice(3).replace(/^./, (c) => c.toLowerCase());
        const o = setup.g.options.find((x) => x.id === id);
        const choice = o && o.choices.find((c) => String(c.v) === d[optKey]);
        if (choice) { setup.opts[id] = choice.v; renderSetup(); }
        return;
      }
    }
    if (d.edit) { openEditor(d.edit); return; }
    if (d.color && editor) {
      editor.name = $('#player-name')?.value ?? editor.name;
      editor.color = d.color; editor.confirm = false; renderEditor(); return;
    }
    switch (d.action) {
      case 'add-player': openEditor(null); break;
      case 'close-sheet':
        if (sheetKind === 'editor' && editor?.back) { setup = editor.back; editor = null; sheetKind = 'setup'; renderSetup(); }
        else hideSheet();
        break;
      case 'start': if (setup && setup.picks.length === needed(setup.mode)) start(); break;
      case 'save-player': saveEditor(); break;
      case 'delete-player': deleteEditor(); break;
      case 'rematch': match.round++; newRound(); break;
      case 'restart': if (match) newRound(); break;
      case 'leave': leave(); break;
      case 'close-frame': closeFrame(); break;
      case 'reset-stats':
        if (!confirmReset) { confirmReset = true; renderSettings(); }
        else {
          // Der Fortschritt der Solo-Abenteuer steckt in deren eigenem Spielstand und bleibt sichtbar
          const keep = {};
          Object.entries(state.stats).forEach(([pid, games]) => Object.entries(games).forEach(([gid, x]) => {
            if (x.sum) (keep[pid] ||= {})[gid] = { w: 0, l: 0, d: 0, sum: x.sum };
          }));
          state.stats = keep; save(); confirmReset = false; renderSettings();
        }
        break;
    }
  });

  document.addEventListener('change', (e) => {
    const k = e.target.dataset?.setting;
    if (!k) return;
    state.settings[k] = e.target.checked;
    save();
    applyMotion();
    if (k === 'sound' && e.target.checked) sfx('point');
    if (k === 'haptics' && e.target.checked) buzz(40);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!sheet.hidden) hideSheet();
    else if (!play.hidden) leave();
  });

  document.addEventListener('submit', (e) => e.preventDefault());
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.id === 'player-name') { e.preventDefault(); saveEditor(); }
  });

  /* ---------- Start ---------- */
  CC.register = (g) => {
    CC.games.push(Object.assign({ options: [], modes: ['ai', 'duo'], color: 'blue', minutes: '5' }, g));
  };
  CC.css = (text) => {
    const s = document.createElement('style');
    s.textContent = text;
    document.head.append(s);
  };
  CC.boot = () => {
    const run = (data) => {
      if (data && ['games', 'players', 'settings'].includes(data.tab)) tab = data.tab;
      applyMotion();
      render();
      try { window.claude?.hot?.snapshot?.(() => ({ tab })); } catch (e) { /* optional */ }
    };
    if (window.claude?.hot?.ready) window.claude.hot.ready(run);
    else run(window.claude?.hot?.data ?? {});
  };
})();
