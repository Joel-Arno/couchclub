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
  const MODE_LABEL = { ai: 'Gegen KI', duo: 'Zu zweit', solo: 'Alleine', group: 'Zu mehreren', lead: 'Ein Handy', online: 'Mehrere Handys' };
  const SOON = ['Codeknacker', 'Zahlenkette', 'Reaktionsduell', 'Undercover', 'Air-Hockey', 'Begriffe erklären', 'Wörter raten', 'Quiz'];
  const SHELVES = [
    { id: 'duel', label: (n) => `Duelle · ${n} Spiele` },
    { id: 'party', label: () => 'Für die ganze Runde' },
    { id: 'puzzle', label: () => 'Knobeln' },
  ];
  const ACTIVE = 'couchclub.aktiv';   // sessionStorage: offener Raum als Gast, damit ein Neuladen wieder hineinführt
  const KEY = 'couchclub.v1';
  // Spielstände der Solo-Abenteuer: spiele.html (Kerker-Wischer und Lichtläufer) und mond.html (Mondgeläut)
  const saveKeysOf = (pid) => ['kerker-licht-v2@' + pid, 'mondgelaeut-v1@' + pid, 'mondgelaeut-v2@' + pid];

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
  function modeMeta(g, m) {
    if (m === 'group') return `${g.group[0]}–${g.group[1]} Spieler`;
    if (m === 'lead') return `${g.lead[0]}–${g.lead[1]} Spieler`;
    return { ai: 'KI', duo: '2 Spieler', solo: 'Solo', online: 'Mehrere Handys' }[m];
  }
  function tile(g) {
    const modes = g.modes.map((m) => modeMeta(g, m)).join(' · ');
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
    const solos = CC.games.filter((g) => g.frame);
    const shelves = SHELVES.map((sh) => ({ ...sh, games: CC.games.filter((g) => !g.frame && (g.shelf || 'duel') === sh.id) })).filter((sh) => sh.games.length);
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
        <button class="join-btn" data-action="join">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="8" height="15" rx="2"/><rect x="13" y="4" width="8" height="15" rx="2"/><path d="M6 16h2M16 16h2"/></svg>
          <span><b>Raum beitreten</b><small>Mit eigenem Handy bei einem Spiel mitmachen</small></span>
        </button>
      </section>
      ${shelves.map((sh) => `<div class="shelf-head"><h2 class="section-label">${sh.label(sh.games.length)}</h2></div>
      <section class="shelf">${sh.games.map(tile).join('')}</section>`).join('')}
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
      if (solo) parts.push(x.sf ? `${solo - x.sf} von ${solo} geschafft` : `${solo}× solo`);
      if (x?.best && g.bestText) { const b = g.bestText(x.best); if (b) parts.push(b); }
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
            <div class="row"><span class="row-text"><b>Version 1.2</b><small>${CC.games.filter((g) => !g.frame).length} Spiele, viele davon mit KI-Gegner in drei Stufen, ${CC.games.filter((g) => g.modes.includes('online')).length} auch mit mehreren Handys, dazu ${CC.games.filter((g) => g.frame).length} Solo-Abenteuer. ${SOON.length} weitere Spiele sind geplant.</small></span></div>
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
  function hideSheet() { sheet.hidden = true; sheetKind = null; setup = null; editor = null; join = null; }

  /* Spiel-Setup */
  let setup = null;
  /* Wie viele Profile ein Modus braucht: [mindestens, höchstens] */
  function need(mode, g = setup?.g) {
    if (mode === 'duo') return [2, 2];
    if (mode === 'group') return g?.group || [2, 6];
    if (mode === 'lead') return [0, 0];
    return [1, 1];
  }
  function fillPicks() {
    const [min, max] = need(setup.mode);
    setup.picks = setup.picks.filter((id) => playerById(id));
    if (max > 2) state.lineup.forEach((id) => { if (setup.picks.length < max && !setup.picks.includes(id) && playerById(id)) setup.picks.push(id); });
    const pool = [...state.lineup, ...state.players.map((p) => p.id)];
    for (const id of pool) {
      if (setup.picks.length >= min) break;
      if (!setup.picks.includes(id) && playerById(id)) setup.picks.push(id);
    }
    setup.picks = setup.picks.slice(0, max);
  }
  const enoughPicks = () => { const [min, max] = need(setup.mode); return setup.picks.length >= min && setup.picks.length <= max; };
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
    const [min, max] = need(mode);
    const n = max;
    const enough = enoughPicks();
    const who = state.players.map((p) => {
      const idx = picks.indexOf(p.id);
      const on = idx >= 0;
      const order = !on || n < 2 ? '' : n === 2 ? (idx === 0 ? 'beginnt' : '') : `${idx + 1}.`;
      return `<button class="chip ${on ? 'is-on' : ''}" data-pick="${p.id}" aria-pressed="${on}" style="--pc:var(--p-${p.color})"><span class="dot">${esc(initial(p.name))}</span>${esc(p.name)}${order ? `<span class="pick-order">${order}</span>` : ''}</button>`;
    }).join('');
    const whoLabel = mode === 'online' ? 'Wer bist du?' : n > 2 ? `Wer spielt? ${min} bis ${max} antippen` : n > 1 ? 'Wer spielt? Zwei antippen' : 'Wer spielt?';
    const modeHint = { online: 'Jeder spielt auf seinem eigenen Handy. Du eröffnest einen Raum, die anderen treten mit dem Code bei.', lead: g.leadHint || '' }[mode];
    panel.innerHTML = `
      <div class="sheet-head" style="--gc:var(--p-${g.color})">
        <span class="thumb">${g.thumb}</span>
        <div><h2 class="sheet-title" id="sheet-title">${g.name}</h2><p class="sheet-sub">${g.tagline}</p></div>
        <button class="icon-btn" data-action="close-sheet" aria-label="Schließen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>
      <ul class="rules">${g.rules.map((r) => `<li>${r}</li>`).join('')}</ul>
      ${g.modes.length > 1 ? `<div class="field"><span class="label">Modus</span>${seg(g.modes.map((m) => ({ v: m, l: MODE_LABEL[m] })), 'mode', mode)}${modeHint ? `<span class="hint">${modeHint}</span>` : ''}</div>` : ''}
      ${n ? `<div class="field">
        <span class="label">${whoLabel}</span>
        <div class="lineup">${who}<button class="chip chip-add" data-action="add-player">+ Spieler</button></div>
        ${min > 1 && state.players.length < min ? `<span class="hint">Lege ${min === 2 ? 'einen zweiten Spieler' : `mindestens ${min} Spieler`} an, um ${min === 2 ? 'zu zweit' : 'zusammen'} zu spielen.</span>` : ''}
      </div>` : ''}
      ${g.frame ? `<div class="field"><span class="label">Spielstand${picks[0] ? ` von ${esc(playerById(picks[0]).name)}` : ''}</span><p class="progress">${esc(frameProgress(g, picks[0]))}</p></div>` : ''}
      ${mode === 'ai' ? `<div class="field"><span class="label">KI-Stufe</span>${seg(LEVELS.map((l, i) => ({ v: i + 1, l })), 'level', level)}<span class="hint">${['Macht Fehler, gut zum Reinkommen.', 'Denkt ein paar Züge voraus.', 'Spielt richtig stark. Viel Glück.'][level - 1]}</span></div>` : ''}
      ${g.options.map((o) => `<div class="field"><span class="label">${o.label}</span>${seg(o.choices, `opt-${o.id}`, opts[o.id])}</div>`).join('')}
      <button class="btn primary wide" data-action="start" ${enough ? '' : 'disabled'}>${mode === 'online' ? 'Raum eröffnen' : 'Los geht’s'}</button>`;
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
    const back = sheetKind === 'setup' ? setup : sheetKind === 'join' ? 'join' : null;
    editor = p
      ? { id: p.id, name: p.name, color: p.color, confirm: false, wipe: null, wiped: null, back }
      : { id: null, name: '', color: COLORS.find((c) => !used.includes(c)) || COLORS[state.players.length % COLORS.length], confirm: false, back };
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
      ${e.id ? progressRows(e) : ''}
      <div class="sheet-actions">
        ${e.id && state.players.length > 1 ? `<button class="btn ${e.confirm ? 'danger' : 'ghost'}" data-action="delete-player">${e.confirm ? 'Wirklich löschen?' : 'Löschen'}</button>` : ''}
        <button class="btn primary" data-action="save-player">${e.id ? 'Speichern' : 'Aufnehmen'}</button>
      </div>`;
    panel.setAttribute('aria-labelledby', 'sheet-title');
  }
  /* Spielstände der Solo-Abenteuer, die sich pro Spieler neu beginnen lassen (frame.save) */
  const frameSaveKey = (g, pid) => g.frame.save + '@' + pid;
  function hasProgress(g, pid) {
    if (state.stats[pid]?.[g.id]?.sum?.runs) return true;
    try { return localStorage.getItem(frameSaveKey(g, pid)) !== null; } catch (e) { return false; }
  }
  function progressRows(e) {
    const games = CC.games.filter((g) => g.frame?.save);
    if (!games.length) return '';
    return `<div class="field"><span class="label">Spielstände</span><div class="rows">${games.map((g) => {
      const has = hasProgress(g, e.id), sure = e.wipe === g.id, x = state.stats[e.id]?.[g.id]?.sum;
      const text = e.wiped === g.id ? 'Gelöscht. Beim nächsten Start beginnt das Abenteuer von vorn.'
        : has ? `${x?.runs ? g.statText(x) : 'Spielstand vorhanden'}. Löschen lässt sich nicht rückgängig machen.` : 'Noch nicht gespielt.';
      return `<div class="row"><span class="row-text"><b>${g.name}</b><small>${esc(text)}</small></span>
        ${has ? `<button class="btn small ${sure ? 'danger' : 'ghost'}" data-wipe="${g.id}">${sure ? 'Wirklich löschen?' : 'Neu beginnen'}</button>` : ''}</div>`;
    }).join('')}</div></div>`;
  }
  function wipeProgress(pid, gid) {
    const g = CC.games.find((x) => x.id === gid);
    if (!g?.frame?.save) return;
    try { [g.frame.save, ...(g.frame.alt || [])].forEach((k) => localStorage.removeItem(k + '@' + pid)); } catch (e) { /* nichts gespeichert */ }
    if (state.stats[pid]) delete state.stats[pid][gid];
    save();
    render();
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
    if (back === 'join') { openJoin(join?.code, id); render(); return; }
    if (back) {
      setup = back;
      if (isNew && setup.picks.length < need(setup.mode)[1]) setup.picks.push(id);
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
  let roundHooks = {};

  function start() {
    const { g, mode, level, picks, opts } = setup;
    state.last[g.id] = { mode, level, picks: picks.slice(), opts: { ...opts } };
    save();
    if (g.frame) { hideSheet(); openFrame(g, playerById(picks[0])); return; }
    if (mode === 'online') { hideSheet(); openRoom({ host: true, g, opts, pid: picks[0] }); return; }
    const players = picks.map((id) => ({ ...playerById(id), pid: id, local: true }));
    if (mode === 'ai') {
      const color = ['plum', 'teal', 'blue', 'coral'].find((c) => c !== players[0].color);
      players.push({ id: 'ai', name: 'KI', color, ai: true, level });
    }
    match = { g, mode, level, opts, players, wins: {}, round: 0 };
    players.forEach((p) => (match.wins[p.id] = 0));
    hideSheet();
    openPlay(g.name, [mode === 'ai' ? `Gegen KI · ${LEVELS[level - 1]}` : MODE_LABEL[mode], g.optionLabel?.(opts)].filter(Boolean).join(' · '));
    newRound();
  }

  function openPlay(name, sub) {
    $('#play-name').textContent = name;
    $('#play-mode').textContent = sub;
    play.hidden = false;
    document.body.classList.add('is-playing');
  }

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function clearOverlays() { play.querySelectorAll('.handoff, .result-back').forEach((el) => el.remove()); hush(); }
  function peekBoard(on) {
    play.querySelectorAll('.result-back').forEach((el) => el.remove());
    resultEl.hidden = on;
    if (on) play.insertAdjacentHTML('beforeend', '<button class="btn small primary result-back" data-action="unpeek">Ergebnis zeigen</button>');
  }

  function newRound() {
    clearTimers();
    clearOverlays();
    try { inst?.destroy?.(); } catch (e) { /* weiter */ }
    resultEl.hidden = true;
    resultEl.innerHTML = '';
    roundHooks = {};
    const P = match.players;
    let order = P;
    if (match.mode !== 'online' && P.length > 1) {
      const k = match.round % P.length;
      order = P.length === 2 ? (k ? [...P].reverse() : P) : [...P.slice(k), ...P.slice(0, k)];
    }
    live = { order, turn: null, points: {}, labels: {}, done: false };
    play.classList.toggle('bare', !!match.g.bare || !match.players.length);
    renderScorebar();
    statusEl.textContent = '';
    stageHost.replaceChildren();
    const stage = document.createElement('div');
    stage.className = 'stage-inner';
    stage.style.cssText = 'width:100%;height:100%;display:grid;place-items:center;min-height:0';
    stageHost.append(stage);
    $('[data-action="restart"]').hidden = match.mode === 'online' || !!match.g.noRestart;
    const api = {
      players: order,
      mode: match.mode,
      opts: match.opts,
      motion: motionOn(),
      round: match.round,
      turn(i) { live.turn = order[i]?.id ?? null; paintPills(); },
      score(i, v, label) { if (!order[i]) return; live.points[order[i].id] = v; if (label) live.labels[order[i].id] = label; paintPills(); },
      status(t) { statusEl.textContent = t; },
      sfx,
      buzz,
      later(fn, ms) { const t = setTimeout(fn, ms); timers.push(t); return t; },
      finish,
      esc,
      avatar,
      handoff,
      speak,
      hush,
      profiles: state.players.map((p) => ({ id: p.id, name: p.name, color: p.color })),
      lineup: state.lineup.slice(),
      wake: (on) => wakeLock(on),
    };
    if (match.mode === 'online') api.online = onlineApi(order), api.me = api.online.me;
    inst = match.g.create(stage, api);
  }

  function renderScorebar() {
    scorebar.classList.toggle('many', match.players.length > 2);
    scorebar.innerHTML = live.order.map((p) => `
      <div class="pp" data-pid="${p.id}" style="--pc:var(--p-${p.color})">
        ${avatar(p)}
        <div class="pp-text"><span class="pp-name">${esc(p.ai ? 'KI' : p.name)}</span><span class="pp-sub"></span></div>
        <span class="pp-score">0</span>
      </div>`).join('');
    paintPills();
  }
  function paintPills() {
    if (!live) return;
    scorebar.querySelectorAll('.pp').forEach((el) => {
      const id = el.dataset.pid;
      const p = live.order.find((x) => x.id === id);
      const on = !live.done && live.turn === id && match.players.length > 1;
      const hasPts = id in live.points;
      const wins = match.wins[id] || 0;
      const away = p?.c && room && !room.s.isOn(p.c);
      el.classList.toggle('on', on);
      el.classList.toggle('away', !!away);
      el.querySelector('.pp-score').textContent = hasPts ? live.points[id] : wins;
      el.querySelector('.pp-sub').textContent = away ? 'nicht verbunden'
        : on ? (id === 'ai' ? 'denkt nach' : 'am Zug')
        : hasPts ? (live.labels[id] || (wins ? `${wins} ${wins === 1 ? 'Sieg' : 'Siege'}` : 'Punkte'))
        : (wins === 1 ? 'Sieg' : 'Siege');
    });
  }

  /* res: { winner: Index | null } oder { winners: [Index] }, im Solo { fail, best: { key, value, high } },
     title und detail für die Ergebniskarte, record: { Profil-ID: 'w' | 'l' | 'd' } überschreibt die Wertung */
  function finish(res) {
    if (live.done) return;
    live.done = true;
    const g = match.g;
    const solo = match.mode === 'solo';
    const winners = res.winners || (res.winner == null ? [] : [res.winner]);
    let record = false;
    if (res.record) {
      Object.entries(res.record).forEach(([pid, r]) => { if (playerById(pid) && 'wld'.includes(r)) stat(pid, g.id)[r]++; });
    } else live.order.forEach((p, i) => {
      if (p.ai || !p.local) return;
      const s = stat(p.pid || p.id, g.id);
      if (solo) {
        s.solo = (s.solo || 0) + 1;
        if (res.fail) s.sf = (s.sf || 0) + 1;
        else if (res.best) {
          s.best ||= {};
          const prev = s.best[res.best.key];
          const better = prev == null || (res.best.high ? res.best.value > prev : res.best.value < prev);
          if (better) { if (prev != null) record = true; s.best[res.best.key] = res.best.value; }
        }
      } else if (!winners.length) s.d++;
      else if (winners.includes(i)) s.w++;
      else s.l++;
    });
    save();
    if (!solo) winners.forEach((i) => { const p = live.order[i]; if (p) match.wins[p.id] = (match.wins[p.id] || 0) + 1; });
    paintPills();
    const won = winners.map((i) => live.order[i]).filter(Boolean);
    const mine = live.order.filter((p) => p.local);
    const iWon = won.some((p) => p.local);
    const color = (won.find((p) => p.local) || won[0])?.color;
    if (solo) { if (res.fail) { sfx('lose'); buzz(80); } else { sfx('win'); confetti('velvet'); buzz([30, 40, 30]); } }
    else if (!won.length) sfx('draw');
    else if (match.mode === 'online' ? !iWon : won.every((p) => p.ai)) { sfx('lose'); buzz(80); }
    else if (match.mode === 'online' || mine.length) { sfx('win'); confetti(color); buzz([30, 40, 30]); }
    else sfx('win');
    const t = setTimeout(() => showResult(res, won, record), res.delay ?? 900);
    timers.push(t);
  }

  function showResult(res, won, record) {
    const solo = match.mode === 'solo';
    let title, pc = '';
    if (res.title) title = esc(res.title);
    else if (solo) title = res.fail ? 'Leider verloren' : 'Geschafft!';
    else if (!won.length) title = 'Unentschieden';
    else if (won.length > 1) title = `${won.map((p) => esc(p.ai ? 'KI' : p.name)).join(' und ')} gewinnen`;
    else if (won[0].ai) title = 'Die KI gewinnt';
    else title = `${esc(won[0].name)} gewinnt`;
    if (won.length === 1 && !won[0].ai) pc = `style="--pc:var(--p-${won[0].color})"`;
    const P = match.players;
    let score = '';
    if (!res.noScore && P.length === 2) {
      const [a, b] = P;
      score = `<div class="result-score"><span>${esc(a.ai ? 'KI' : a.name)}</span><b>${match.wins[a.id]}</b><b>:</b><b>${match.wins[b.id]}</b><span>${esc(b.ai ? 'KI' : b.name)}</span></div>`;
    } else if (!res.noScore && P.length > 2 && match.round > 0) {
      score = `<ol class="result-table">${[...P].sort((x, y) => match.wins[y.id] - match.wins[x.id]).map((p) => `<li style="--pc:var(--p-${p.color})">${avatar(p)}<span>${esc(p.ai ? 'KI' : p.name)}</span><b>${match.wins[p.id]}</b></li>`).join('')}</ol>`;
    }
    const online = match.mode === 'online';
    const hostName = online ? room.s.lobby.players.find((p) => p.c === room.s.lobby.host)?.name || 'Gastgeber' : '';
    const again = online && !room.s.host
      ? `<button class="btn primary" disabled>Warte auf ${esc(hostName)} …</button>`
      : `<button class="btn primary" data-action="rematch">${solo ? 'Nochmal' : online ? 'Nächste Runde' : 'Revanche'}</button>`;
    resultEl.innerHTML = `
      <div class="result-card" role="dialog" aria-labelledby="result-title">
        ${record ? '<span class="record">Neuer Rekord</span>' : ''}
        <h2 class="result-title" id="result-title" ${pc}>${title}</h2>
        ${res.detail ? `<p class="result-detail">${res.detail}</p>` : ''}
        ${score}
        <div class="result-actions">
          ${again}
          <button class="btn ghost" data-action="leave">${online ? 'Raum verlassen' : 'Andere Spiele'}</button>
          <button class="link-btn" data-action="peek">Spielfeld ansehen</button>
        </div>
      </div>`;
    resultEl.hidden = false;
    resultEl.querySelector('.btn').focus({ preventScroll: true });
  }

  function rematch() {
    if (!match) return;
    if (match.mode === 'online') {
      if (!room?.s.host) return;
      const L = room.s.lobby;
      const ps = L.players.filter((p) => !p.gone).map((p) => p.c);
      const k = L.round % ps.length;
      room.s.start([...ps.slice(k), ...ps.slice(0, k)]);
      return;
    }
    match.round++;
    newRound();
  }

  function leave() {
    clearTimers();
    clearOverlays();
    try { inst?.destroy?.(); } catch (e) { /* weiter */ }
    inst = null;
    match = null;
    live = null;
    if (room) closeRoom();
    play.hidden = true;
    play.classList.remove('bare');
    document.body.classList.remove('is-playing');
    stageHost.replaceChildren();
    resultEl.hidden = true;
    render();
  }

  /* Handy weitergeben: Bildschirm verdecken, bis die richtige Person tippt */
  function handoff(p, text, button) {
    return new Promise((done) => {
      const el = document.createElement('div');
      el.className = 'handoff';
      el.innerHTML = `<div class="handoff-card" style="--pc:var(--p-${p.color || 'blue'})">
        ${avatar(p, 'lg')}
        <h2 class="handoff-title">Gib das Handy an ${esc(p.name)}</h2>
        <p class="handoff-text">${text || 'Die anderen schauen bitte weg.'}</p>
        <button class="btn primary wide">${button || `Ich bin ${esc(p.name)}`}</button>
      </div>`;
      play.append(el);
      sfx('tap');
      el.querySelector('button').addEventListener('click', () => { el.remove(); done(); });
    });
  }

  /* Vorlesen (Werwolf-Erzähler) */
  let voice = null;
  function pickVoice() {
    try {
      const vs = speechSynthesis.getVoices().filter((v) => /^de/i.test(v.lang));
      voice = vs.find((v) => /premium|enhanced|natural|google/i.test(v.name)) || vs.find((v) => v.localService) || vs[0] || null;
    } catch (e) { voice = null; }
  }
  if ('speechSynthesis' in window) { pickVoice(); try { speechSynthesis.addEventListener('voiceschanged', pickVoice); } catch (e) { /* alt */ } }
  function speak(text) {
    if (!('speechSynthesis' in window) || !text) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'de-DE';
      if (voice) u.voice = voice;
      u.rate = 0.92;
      u.pitch = 0.95;
      speechSynthesis.speak(u);
    } catch (e) { /* stumm */ }
  }
  function hush() { try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) { /* stumm */ } }

  /* Bildschirm wach halten, solange mehrere Handys verbunden sind */
  let screenLock = null, lockWanted = false;
  async function wakeLock(on) {
    lockWanted = on;
    try {
      if (on && !screenLock && navigator.wakeLock && document.visibilityState === 'visible') {
        screenLock = await navigator.wakeLock.request('screen');
        screenLock.addEventListener('release', () => { screenLock = null; });
      } else if (!on && screenLock) { const l = screenLock; screenLock = null; await l.release(); }
    } catch (e) { screenLock = null; }
  }
  document.addEventListener('visibilitychange', () => { if (lockWanted && document.visibilityState === 'visible') wakeLock(true); });

  /* ---------- Mehrere Handys: Raum ---------- */
  let room = null;
  let join = null;

  function openJoin(code = '', pid = null) {
    join = { code: CC.net.cleanCode(code), pid: pid && playerById(pid) ? pid : (join?.pid && playerById(join.pid) ? join.pid : state.lineup.find(playerById) || state.players[0]?.id) };
    renderJoin();
    showSheet('join');
    setTimeout(() => { const i = $('#join-code'); if (i && join && !join.code) i.focus(); }, 80);
  }
  function renderJoin() {
    const ok = join.code.length === CC.net.CODE_LEN && join.pid;
    panel.innerHTML = `
      <div class="sheet-head">
        <div><h2 class="sheet-title" id="sheet-title">Raum beitreten</h2><p class="sheet-sub">Gib den Code vom Gastgeber-Handy ein.</p></div>
        <button class="icon-btn" data-action="close-sheet" aria-label="Schließen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>
      <div class="field"><label class="label" for="join-code">Raumcode</label><input class="form-input code-input" id="join-code" maxlength="${CC.net.CODE_LEN + 2}" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="z. B. K7Q2X" value="${esc(join.code)}"></div>
      <div class="field"><span class="label">Wer bist du?</span>
        <div class="lineup">${state.players.map((p) => `<button class="chip ${p.id === join.pid ? 'is-on' : ''}" data-joinpick="${p.id}" aria-pressed="${p.id === join.pid}" style="--pc:var(--p-${p.color})"><span class="dot">${esc(initial(p.name))}</span>${esc(p.name)}</button>`).join('')}<button class="chip chip-add" data-action="add-player">+ Spieler</button></div>
        <span class="hint">Deine Siege landen in deinem Profil auf diesem Handy.</span>
      </div>
      <button class="btn primary wide" data-action="join-go" ${ok ? '' : 'disabled'}>Beitreten</button>`;
    panel.setAttribute('aria-labelledby', 'sheet-title');
  }

  function openRoom({ host, g, opts, pid, code }) {
    const p = playerById(pid) || state.players[0];
    const s = CC.net.session({
      host, code, opts,
      game: g?.id,
      me: { name: p.name, color: p.color, pid: p.id },
      min: g?.online?.[0] || 2, max: g?.online?.[1] || 8,
    });
    room = { s, pid: p.id, round: 0, cache: {}, since: Date.now() };
    if (!host) { try { sessionStorage.setItem(ACTIVE, JSON.stringify({ code: s.code, pid: p.id })); } catch (e) { /* egal */ } }
    match = null;
    openPlay(g?.name || 'Raum', `Raum ${s.code} · verbindet …`);
    $('[data-action="restart"]').hidden = true;
    play.classList.add('bare');
    resultEl.hidden = true;
    wakeLock(true);
    renderLobby();
    s.on('lobby', onLobby);
    s.on('status', () => { paintRoomStatus(); if (!room.round) renderLobby(); });
    s.on('presence', () => { paintRoomStatus(); paintPills(); roundHooks.presence?.(); });
    s.on('act', (c, a) => { const i = live?.order.findIndex((x) => x.c === c); if (i >= 0) roundHooks.act?.(i, a); });
    s.on('state', (st) => { room.cache.state = st; roundHooks.state?.(st); });
    s.on('private', (d) => { room.cache.priv = d; roundHooks.priv?.(d); });
    s.on('left', (c) => {
      const i = live?.order.findIndex((x) => x.c === c);
      if (i >= 0 && !live.done) { statusEl.textContent = `${live.order[i].name} hat den Raum verlassen.`; roundHooks.left?.(i); }
      paintPills();
    });
    s.on('closed', (why) => roomClosed(why));
    const tick = setInterval(() => { if (!room || room.s !== s) { clearInterval(tick); return; } paintRoomStatus(); }, 2000);
  }
  function closeRoom() {
    if (!room) return;
    room.s.leave();
    room = null;
    wakeLock(false);
    try { sessionStorage.removeItem(ACTIVE); } catch (e) { /* egal */ }
  }
  function paintRoomStatus() {
    if (!room) return;
    const s = room.s;
    let t;
    if (!s.connected) t = Date.now() - room.since > 12000 ? 'keine Verbindung' : 'verbindet …';
    else if (!s.host && !s.lobby) t = 'sucht den Gastgeber …';
    else if (!s.host && !s.hostOn) t = 'Gastgeber nicht erreichbar';
    else t = s.host ? 'du bist Gastgeber' : 'verbunden';
    $('#play-mode').textContent = `Raum ${s.code} · ${t}`;
    play.classList.toggle('offline', !s.connected || (!s.host && s.lobby && !s.hostOn));
  }
  function roomClosed(why) {
    if (!room) return;
    clearTimers(); clearOverlays();
    try { inst?.destroy?.(); } catch (e) { /* weiter */ }
    inst = null;
    resultEl.innerHTML = `<div class="result-card" role="dialog"><h2 class="result-title">Raum geschlossen</h2><p class="result-detail">${esc(why || 'Die Verbindung zum Raum ist weg.')}</p><div class="result-actions"><button class="btn primary" data-action="leave">Zurück</button></div></div>`;
    resultEl.hidden = false;
    room.s.leave();
    room = null;
    wakeLock(false);
    try { sessionStorage.removeItem(ACTIVE); } catch (e) { /* egal */ }
  }

  function onLobby(L) {
    if (!room) return;
    const g = gameById(L.game);
    if (!g || !g.modes.includes('online')) { roomClosed('Dieses Spiel kennt dein Couchclub noch nicht. Lade die App neu und versuch es noch einmal.'); return; }
    $('#play-name').textContent = g.name;
    if (L.round > room.round) {
      room.round = L.round;
      room.cache = {};
      startOnline(L, g);
      return;
    }
    if (!room.round) renderLobby();
    else { paintPills(); roundHooks.presence?.(); }
    paintRoomStatus();
  }

  function startOnline(L, g) {
    if (!L.order.includes(room.s.me)) { roomClosed('Die Runde hat ohne dich begonnen.'); return; }
    const players = L.order.map((c) => {
      const p = L.players.find((x) => x.c === c) || { name: '?', color: 'blue' };
      const mine = c === room.s.me;
      return { id: 'c:' + c, c, name: p.name, color: p.color, local: mine, remote: !mine, pid: mine ? room.pid : null };
    });
    const wins = match?.online === room ? match.wins : {};
    players.forEach((p) => (wins[p.id] ||= 0));
    match = { g, mode: 'online', level: 2, opts: L.opts || {}, players, wins, round: L.round - 1, online: room };
    room.started = true;
    newRound();
    paintRoomStatus();
  }

  function onlineApi(order) {
    const s = room.s;
    const me = order.findIndex((p) => p.c === s.me);
    const cached = room.cache;
    return {
      host: s.host,
      me,
      send: (a) => s.act(a),
      onAction: (fn) => { roundHooks.act = fn; },
      publish: (st) => s.publish(st),
      tell: (i, d) => { if (order[i]) s.tell(order[i].c, d); },
      onState: (fn) => { roundHooks.state = fn; if (cached.state !== undefined) queueMicrotask(() => fn(cached.state)); },
      onPrivate: (fn) => { roundHooks.priv = fn; if (cached.priv !== undefined) queueMicrotask(() => fn(cached.priv)); },
      onPresence: (fn) => { roundHooks.presence = fn; },
      onLeft: (fn) => { roundHooks.left = fn; },
      isOn: (i) => !!order[i] && s.isOn(order[i].c),
      gone: (i) => !!order[i] && !!s.lobby?.players.find((p) => p.c === order[i].c)?.gone,
    };
  }

  function renderLobby() {
    if (!room || room.round) return;
    const s = room.s, L = s.lobby;
    const g = gameById(L?.game);
    const url = location.origin + location.pathname + '#raum=' + s.code;
    const ps = L ? L.players : [];
    const enough = L && ps.length >= L.min;
    stageHost.innerHTML = `<div class="lobby">
      <div class="lobby-card">
        <span class="label">Raumcode</span>
        <b class="lobby-code">${s.code}</b>
        ${s.host ? `<div class="lobby-qr">${CC.net.qr(url)}</div>
        <p class="lobby-hint">Die anderen öffnen den Couchclub und tippen auf „Raum beitreten“. Oder sie scannen den QR-Code mit der Kamera.</p>
        ${navigator.share ? '<button class="btn small ghost" data-action="share-room">Link teilen</button>' : ''}` : ''}
      </div>
      <div class="lobby-card">
        <span class="label">${L ? `Im Raum · ${ps.length}${L.max ? ` von ${L.max}` : ''}` : 'Im Raum'}</span>
        <ul class="lobby-list">${ps.map((p) => `<li class="${p.on ? '' : 'away'}" style="--pc:var(--p-${p.color})">${avatar(p)}<span>${esc(p.name)}${p.c === s.me ? ' <small>(du)</small>' : ''}</span>${p.c === L.host ? '<small class="tag">Gastgeber</small>' : ''}${p.on ? '' : '<small class="tag">weg</small>'}</li>`).join('')}</ul>
        ${!L ? `<p class="lobby-hint">${s.connected ? 'Suche den Raum … Ist der Code richtig?' : 'Verbinde …'}</p>` : ''}
      </div>
      ${s.host
        ? `<button class="btn primary wide" data-action="room-start" ${enough ? '' : 'disabled'}>${enough ? `${g ? g.name : 'Spiel'} starten` : `Warte auf Mitspieler (mindestens ${L?.min || 2})`}</button>`
        : L ? `<p class="lobby-wait">Warte, bis ${esc(ps.find((p) => p.c === L.host)?.name || 'der Gastgeber')} das Spiel startet …</p>` : ''}
    </div>`;
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
        const n = need(setup.mode)[1];
        const id = d.pick;
        if (setup.picks.includes(id)) setup.picks = setup.picks.filter((x) => x !== id);
        else if (n > 2 && setup.picks.length >= n) { sfx('miss'); return; }
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
    if (d.joinpick && join) { join.pid = d.joinpick; join.code = CC.net.cleanCode($('#join-code')?.value ?? join.code); sfx('tap'); renderJoin(); return; }
    if (d.edit) { openEditor(d.edit); return; }
    if (d.color && editor) {
      editor.name = $('#player-name')?.value ?? editor.name;
      editor.color = d.color; editor.confirm = false; editor.wipe = null; renderEditor(); return;
    }
    if (d.wipe && editor) {
      // Erst fragen, beim zweiten Tippen löschen. Der eingetippte Name bleibt erhalten.
      editor.name = $('#player-name')?.value ?? editor.name;
      editor.confirm = false;
      if (editor.wipe !== d.wipe) { editor.wipe = d.wipe; editor.wiped = null; renderEditor(); return; }
      wipeProgress(editor.id, d.wipe);
      editor.wipe = null; editor.wiped = d.wipe; sfx('tap'); renderEditor(); return;
    }
    switch (d.action) {
      case 'add-player': openEditor(null); break;
      case 'close-sheet':
        if (sheetKind === 'editor' && editor?.back === 'join') { editor = null; openJoin(join?.code); }
        else if (sheetKind === 'editor' && editor?.back) { setup = editor.back; editor = null; sheetKind = 'setup'; renderSetup(); }
        else hideSheet();
        break;
      case 'start': if (setup && enoughPicks()) start(); break;
      case 'join': sfx('tap'); openJoin(); break;
      case 'join-go':
        if (join && join.code.length === CC.net.CODE_LEN && playerById(join.pid)) { const j = join; hideSheet(); openRoom({ host: false, code: j.code, pid: j.pid }); }
        break;
      case 'room-start':
        if (room?.s.host && room.s.lobby && room.s.lobby.players.length >= room.s.lobby.min) { sfx('tap'); room.s.start(); }
        break;
      case 'share-room':
        if (room && navigator.share) navigator.share({ title: 'Couchclub', text: `Komm in meinen Couchclub-Raum: ${room.s.code}`, url: location.origin + location.pathname + '#raum=' + room.s.code }).catch(() => {});
        break;
      case 'save-player': saveEditor(); break;
      case 'delete-player': deleteEditor(); break;
      case 'rematch': rematch(); break;
      case 'peek': peekBoard(true); break;
      case 'unpeek': peekBoard(false); break;
      case 'restart': if (match && match.mode !== 'online') newRound(); break;
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
    if (e.key === 'Enter' && e.target.id === 'join-code') { e.preventDefault(); panel.querySelector('[data-action="join-go"]')?.click(); }
  });
  panel.addEventListener('input', (e) => {
    if (e.target.id !== 'join-code' || !join) return;
    join.code = CC.net.cleanCode(e.target.value);
    const btn = panel.querySelector('[data-action="join-go"]');
    if (btn) btn.disabled = !(join.code.length === CC.net.CODE_LEN && join.pid);
  });

  function invite() {
    const m = /raum=([A-Za-z0-9]+)/.exec(location.hash);
    if (!m) return false;
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* egal */ }
    const code = CC.net.cleanCode(m[1]);
    if (room && room.s.code === code) return true;
    let active = null;
    try { active = JSON.parse(sessionStorage.getItem(ACTIVE)); } catch (e) { /* keiner */ }
    if (!play.hidden || !frameEl.hidden) leave();
    if (frame) closeFrame();
    if (active && active.code === code && playerById(active.pid)) openRoom({ host: false, code, pid: active.pid });
    else openJoin(code);
    return true;
  }

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
      // Einladungslink (#raum=CODE) oder ein offener Raum, den ein Neuladen unterbrochen hat
      if (!invite()) {
        let active = null;
        try { active = JSON.parse(sessionStorage.getItem(ACTIVE)); } catch (e) { /* keiner */ }
        if (active && active.code && playerById(active.pid)) openRoom({ host: false, code: active.code, pid: active.pid });
      }
      window.addEventListener('hashchange', invite);
      try { window.claude?.hot?.snapshot?.(() => ({ tab })); } catch (e) { /* optional */ }
    };
    if (window.claude?.hot?.ready) window.claude.hot.ready(run);
    else run(window.claude?.hot?.data ?? {});
  };
})();
