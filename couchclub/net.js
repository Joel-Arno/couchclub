/* Couchclub — Netz: Räume für mehrere Handys
   Die Handys finden sich über öffentliche MQTT-Vermittler (WebSocket, ohne Konto). Jede Nachricht
   geht an alle erreichbaren Vermittler gleichzeitig und wird mit dem Raumcode verschlüsselt.
   Ein Handy ist Gastgeber: Es führt das Spiel, die anderen schicken Züge und zeigen den Stand. */
(() => {
  'use strict';

  const BROKERS = [
    'wss://broker.emqx.io:8084/mqtt',
    'wss://broker.hivemq.com:8884/mqtt',
    'wss://test.mosquitto.org:8081/mqtt',
  ];
  // Eigene Vermittler zum Testen: localStorage['couchclub.brokers'] = '["ws://localhost:8888"]'
  function brokers() {
    try {
      const b = JSON.parse(localStorage.getItem('couchclub.brokers'));
      if (Array.isArray(b) && b.length && b.every((x) => typeof x === 'string')) return b;
    } catch (e) { /* Standard */ }
    return BROKERS;
  }

  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const CODE_LEN = 5;
  const rid = (n = 10) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map((x) => ALPHA[x % 32]).join(''); };
  const cleanCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/O/g, '0').replace(/I/g, '1').split('').filter((c) => ALPHA.includes(c)).join('').slice(0, CODE_LEN);

  const enc = new TextEncoder();
  const dec = new TextDecoder();

  /* ---------- MQTT 3.1.1, nur das Nötigste (QoS 0) ---------- */
  function mstr(s) { const b = enc.encode(s); return [b.length >> 8, b.length & 255, ...b]; }
  function packet(type, body) {
    const len = [];
    let n = body.length;
    do { let d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; len.push(d); } while (n > 0);
    const out = new Uint8Array(1 + len.length + body.length);
    out[0] = type; out.set(len, 1); out.set(body, 1 + len.length);
    return out;
  }
  const P_CONNECT = (cid, keep) => packet(0x10, [...mstr('MQTT'), 4, 0x02, keep >> 8, keep & 255, ...mstr(cid)]);
  const P_SUB = (topic) => packet(0x82, [0, 1, ...mstr(topic), 0]);
  const P_PING = () => new Uint8Array([0xc0, 0]);
  const P_DISC = () => new Uint8Array([0xe0, 0]);
  function P_PUB(topic, payload) {
    const t = mstr(topic);
    const body = new Uint8Array(t.length + payload.length);
    body.set(t, 0); body.set(payload, t.length);
    return packet(0x30, body);
  }

  class Link {
    constructor(url, topic, onMsg, onChange) {
      Object.assign(this, { url, topic, onMsg, onChange, up: false, dead: false, tries: 0, buf: new Uint8Array(0) });
      this.open();
    }
    open() {
      if (this.dead) return;
      let ws;
      try { ws = new WebSocket(this.url, ['mqtt']); } catch (e) { this.retry(); return; }
      this.ws = ws;
      ws.binaryType = 'arraybuffer';
      ws.onopen = () => { this.seen = Date.now(); this.raw(P_CONNECT('cc' + rid(12), 30)); };
      ws.onmessage = (e) => this.feed(new Uint8Array(e.data));
      ws.onerror = () => {};
      ws.onclose = () => { if (this.ws !== ws) return; this.ws = null; this.setUp(false); this.retry(); };
      clearInterval(this.pinger);
      this.pinger = setInterval(() => {
        if (!this.ws || this.ws.readyState !== 1) return;
        if (Date.now() - this.seen > 50000) { this.kill(); return; }
        this.raw(P_PING());
      }, 20000);
    }
    kill() { const ws = this.ws; this.ws = null; this.setUp(false); try { ws && ws.close(); } catch (e) { /* zu */ } this.retry(); }
    retry() {
      if (this.dead) return;
      clearTimeout(this.timer);
      const wait = Math.min(15000, 800 * 2 ** Math.min(this.tries++, 5));
      this.timer = setTimeout(() => this.open(), wait);
    }
    nudge() { if (!this.dead && (!this.ws || this.ws.readyState > 1)) { clearTimeout(this.timer); this.tries = 0; this.open(); } }
    setUp(v) { if (this.up !== v) { this.up = v; this.onChange(); } }
    raw(bytes) { try { if (this.ws && this.ws.readyState === 1) { this.ws.send(bytes); return true; } } catch (e) { /* weg */ } return false; }
    pub(payload) { return this.up && this.raw(P_PUB(this.topic, payload)); }
    feed(chunk) {
      this.seen = Date.now();
      const b = new Uint8Array(this.buf.length + chunk.length);
      b.set(this.buf, 0); b.set(chunk, this.buf.length);
      let i = 0;
      while (i < b.length) {
        let len = 0, mul = 1, j = i + 1, ok = false;
        while (j < b.length && j < i + 5) { const d = b[j++]; len += (d & 127) * mul; mul *= 128; if (!(d & 128)) { ok = true; break; } }
        if (!ok || j + len > b.length) break;
        this.handle(b[i], b.subarray(j, j + len));
        i = j + len;
      }
      this.buf = b.slice(i);
    }
    handle(h, body) {
      const type = h >> 4;
      if (type === 2) { if (body[1] === 0) this.raw(P_SUB(this.topic)); else this.kill(); }
      else if (type === 9) { this.tries = 0; this.setUp(true); }
      else if (type === 3) {
        const tl = (body[0] << 8) | body[1];
        let k = 2 + tl;
        if ((h >> 1) & 3) k += 2;
        this.onMsg(body.slice(k));
      }
    }
    close() {
      this.dead = true;
      clearTimeout(this.timer); clearInterval(this.pinger);
      if (this.ws) { this.raw(P_DISC()); try { this.ws.close(); } catch (e) { /* zu */ } }
      this.ws = null; this.up = false;
    }
  }

  /* ---------- Verschlüsselung mit dem Raumcode ---------- */
  const subtle = window.crypto && crypto.subtle;
  async function hex(s) {
    if (!subtle) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0).toString(16) + s; }
    const d = new Uint8Array(await subtle.digest('SHA-256', enc.encode(s)));
    return [...d].slice(0, 12).map((x) => x.toString(16).padStart(2, '0')).join('');
  }
  async function keyFor(code) {
    if (!subtle) return null;
    const base = await subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveKey']);
    return subtle.deriveKey({ name: 'PBKDF2', salt: enc.encode('couchclub-raum-v1'), iterations: 20000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 128 }, false, ['encrypt', 'decrypt']);
  }
  async function seal(key, obj) {
    const data = enc.encode(JSON.stringify(obj));
    if (!key) return data;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, data));
    const out = new Uint8Array(12 + ct.length);
    out.set(iv, 0); out.set(ct, 12);
    return out;
  }
  async function open(key, bytes) {
    try {
      const plain = key ? new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: bytes.subarray(0, 12) }, key, bytes.subarray(12))) : bytes;
      return JSON.parse(dec.decode(plain));
    } catch (e) { return null; }
  }

  /* ---------- Kanal: alle Vermittler, Doppeltes aussortieren ---------- */
  async function channel(code, me, onMsg, onStatus) {
    const [topic, key] = await Promise.all([hex('couchclub:' + code).then((h) => 'couchclub/r1/' + h), keyFor(code)]);
    const seen = new Set(), order = [];
    let links = [];
    const status = () => onStatus(links.some((l) => l.up));
    const recv = async (bytes) => {
      const m = await open(key, bytes);
      if (!m || typeof m !== 'object' || !m.id || seen.has(m.id)) return;
      seen.add(m.id); order.push(m.id);
      if (order.length > 600) seen.delete(order.shift());
      if (m.f === me) return;
      onMsg(m);
    };
    links = brokers().map((u) => new Link(u, topic, recv, status));
    const queue = [];
    return {
      async send(obj) {
        obj.f = me; obj.id = rid(9);
        seen.add(obj.id); order.push(obj.id);
        const bytes = await seal(key, obj);
        if (!links.some((l) => l.pub(bytes))) { queue.push(bytes); if (queue.length > 30) queue.shift(); }
      },
      flush() { while (queue.length && links.some((l) => l.up)) { const b = queue.shift(); links.forEach((l) => l.pub(b)); } },
      nudge() { links.forEach((l) => l.nudge()); },
      get up() { return links.some((l) => l.up); },
      close() { links.forEach((l) => l.close()); links = []; },
    };
  }

  /* ---------- Sitzung: Raum, Mitspieler, Spielstand ---------- */
  const HB = 4000, LOST = 15000;
  const COLORS = ['coral', 'blue', 'saffron', 'teal', 'plum', 'rose'];

  /* opts: { code, host, me: {name, color, pid}, game, opts, min, max } */
  function session(o) {
    const code = cleanCode(o.code) || (() => { let c = ''; while (c.length < CODE_LEN) c += rid(1); return c; })();
    const idKey = 'couchclub.raum.' + code;
    let me = null;
    try { me = sessionStorage.getItem(idKey); } catch (e) { /* egal */ }
    if (!me) { me = 'c' + rid(8); try { sessionStorage.setItem(idKey, me); } catch (e) { /* egal */ } }

    const handlers = {};
    const emit = (t, ...a) => (handlers[t] || []).forEach((fn) => { try { fn(...a); } catch (e) { console.error(e); } });
    const S = {
      code, me, host: !!o.host, lobby: null, connected: false, closed: false,
      on(t, fn) { (handlers[t] ||= []).push(fn); return S; },
    };
    let ch = null;
    let lastHost = Date.now();
    const seenAt = {};
    let stateMsg = null;            // zuletzt verschickter Spielstand (Gastgeber) bzw. zuletzt erhaltener (Gast)
    const privMsgs = {};            // Gastgeber: letzte private Nachricht je Mitspieler
    let myPriv = null;
    let acked = false;
    const timers = [];

    function lobbyPublic() { return S.lobby; }
    function sendLobby(to) { ch && ch.send({ t: 'lobby', to, l: S.lobby }); }
    function bumpLobby() { S.lobby.v++; sendLobby(); emit('lobby', S.lobby); }

    if (S.host) {
      S.lobby = {
        v: 1, game: o.game, opts: o.opts || {}, min: o.min || 2, max: o.max || 8,
        host: me, round: 0, order: [],
        players: [{ c: me, name: o.me.name, color: o.me.color, on: true }],
      };
    }

    function freeColor(want) {
      const used = S.lobby.players.map((p) => p.color);
      if (!used.includes(want)) return want;
      return COLORS.find((c) => !used.includes(c)) || want;
    }

    function onMsg(m) {
      if (m.to && m.to !== me) return;
      if (S.host) hostMsg(m); else guestMsg(m);
    }

    function hostMsg(m) {
      const L = S.lobby;
      const p = L.players.find((x) => x.c === m.f);
      if (p) { seenAt[m.f] = Date.now(); if (!p.on && !p.gone) { p.on = true; bumpLobby(); } }
      switch (m.t) {
        case 'hi': {
          if (!p) {
            if (L.round > 0) { ch.send({ t: 'nope', to: m.f, why: 'In diesem Raum läuft schon ein Spiel.' }); return; }
            if (L.players.length >= L.max) { ch.send({ t: 'nope', to: m.f, why: `Der Raum ist voll (${L.max} Spieler).` }); return; }
            const name = String(m.name || 'Gast').slice(0, 14);
            seenAt[m.f] = Date.now();
            L.players.push({ c: m.f, name, color: freeColor(COLORS.includes(m.color) ? m.color : 'blue'), on: true });
            bumpLobby();
          } else {
            if (p.gone) { p.gone = false; p.on = true; L.v++; emit('lobby', L); }
            sendLobby();
          }
          resync(m.f);
          break;
        }
        case 'sync': resync(m.f); break;
        case 'act': if (p && m.r === L.round) emit('act', m.f, m.a); break;
        case 'bye':
          if (p) {
            if (L.round === 0) L.players = L.players.filter((x) => x !== p);
            else { p.gone = true; p.on = false; }
            bumpLobby();
            emit('left', m.f);
          }
          break;
      }
    }
    function resync(c) {
      if (!ch) return;
      sendLobby(c);
      if (stateMsg) ch.send({ ...stateMsg, to: c });
      if (privMsgs[c]) ch.send({ ...privMsgs[c], to: c });
    }

    function guestMsg(m) {
      const L = S.lobby;
      if (L && m.f !== L.host && m.t !== 'lobby') return;
      if (m.t === 'lobby') {
        if (L && m.l.host !== L.host && L.round > 0) return;
        lastHost = Date.now();
        if (L && m.l.v <= L.v && m.l.host === L.host) { if (!acked && m.l.players.some((p) => p.c === me)) acked = true; return; }
        const prevRound = L ? L.round : 0;
        S.lobby = m.l;
        if (S.lobby.players.some((p) => p.c === me)) acked = true;
        if (S.lobby.round !== prevRound) { stateMsg = null; myPriv = null; }
        emit('lobby', S.lobby);
        return;
      }
      lastHost = Date.now();
      if (!L) return;
      switch (m.t) {
        case 'hb':
          if (m.lv > L.v || (m.r === L.round && ((m.sv && (!stateMsg || m.sv > stateMsg.v)) || (m.pv && m.pv[me] && (!myPriv || m.pv[me] > myPriv.v))))) ch.send({ t: 'sync' });
          break;
        case 'st':
          if (m.r !== L.round || (stateMsg && stateMsg.v >= m.v)) return;
          stateMsg = m;
          emit('state', m.s);
          break;
        case 'pv':
          if (m.r !== L.round || (myPriv && myPriv.v >= m.v)) return;
          myPriv = m;
          emit('private', m.d);
          break;
        case 'nope': S.closed = true; emit('closed', m.why); break;
        case 'bye': S.closed = true; emit('closed', 'Der Gastgeber hat den Raum geschlossen.'); break;
      }
    }

    function tick() {
      if (!ch || S.closed) return;
      const now = Date.now();
      if (S.host) {
        const pv = {};
        Object.entries(privMsgs).forEach(([c, x]) => (pv[c] = x.v));
        ch.send({ t: 'hb', lv: S.lobby.v, sv: stateMsg ? stateMsg.v : 0, r: S.lobby.round, pv });
        let changed = false;
        S.lobby.players.forEach((p) => {
          if (p.c === me || p.gone) return;
          const on = now - (seenAt[p.c] || 0) < LOST;
          if (on !== p.on) { p.on = on; changed = true; }
        });
        if (changed) bumpLobby();
      } else {
        if (!acked) ch.send({ t: 'hi', name: o.me.name, color: o.me.color });
        else ch.send({ t: 'hb' });
        const hostOn = now - lastHost < LOST;
        if (hostOn !== S.hostOn) { S.hostOn = hostOn; emit('presence'); }
      }
    }

    S.ready = channel(code, me, onMsg, (up) => {
      const was = S.connected;
      S.connected = up;
      if (up && !was) {
        ch && ch.flush();
        if (!S.host) { ch && ch.send(acked ? { t: 'sync' } : { t: 'hi', name: o.me.name, color: o.me.color }); }
        else if (ch) { sendLobby(); if (stateMsg) ch.send(stateMsg); }
      }
      if (up !== was) emit('status', up);
    }).then((c) => {
      ch = c;
      if (S.closed) { c.close(); return; }
      timers.push(setInterval(tick, HB));
      if (S.host) emit('lobby', S.lobby);
      tick();
    });
    S.hostOn = true;

    const vis = () => { if (document.visibilityState === 'visible' && ch) { ch.nudge(); tick(); } };
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('online', vis);

    /* Gastgeber: Runde starten (auch Revanche) */
    S.start = (order) => {
      if (!S.host) return;
      const L = S.lobby;
      L.round++;
      L.order = order || L.players.filter((p) => !p.gone).map((p) => p.c);
      stateMsg = null;
      Object.keys(privMsgs).forEach((k) => delete privMsgs[k]);
      bumpLobby();
    };
    S.setOpts = (opts) => { if (S.host) { S.lobby.opts = opts; bumpLobby(); } };

    /* Spielkanal */
    let sv = 0;
    S.act = (a) => {
      if (S.host) { queueMicrotask(() => emit('act', me, a)); return; }
      ch && ch.send({ t: 'act', r: S.lobby.round, a });
    };
    S.publish = (s) => {
      if (!S.host) return;
      stateMsg = { t: 'st', r: S.lobby.round, v: ++sv, s };
      ch && ch.send({ ...stateMsg });
      queueMicrotask(() => emit('state', s));
    };
    S.tell = (c, d) => {
      if (!S.host) return;
      if (c === me) { queueMicrotask(() => emit('private', d)); return; }
      privMsgs[c] = { t: 'pv', r: S.lobby.round, v: ++sv, to: c, d };
      ch && ch.send({ ...privMsgs[c] });
    };
    S.isOn = (c) => {
      if (c === me) return S.connected;
      if (S.host) { const p = S.lobby.players.find((x) => x.c === c); return !!(p && p.on && !p.gone); }
      if (c === S.lobby?.host) return S.hostOn;
      const p = S.lobby?.players.find((x) => x.c === c);
      return !!(p && p.on && !p.gone);
    };
    S.leave = () => {
      if (S.closed && !ch) return;
      S.closed = true;
      timers.forEach(clearInterval);
      document.removeEventListener('visibilitychange', vis);
      window.removeEventListener('online', vis);
      try { sessionStorage.removeItem(idKey); } catch (e) { /* egal */ }
      const c = ch;
      if (c) { c.send({ t: 'bye' }).finally(() => setTimeout(() => c.close(), 400)); }
      else S.ready.then(() => ch && ch.close());
    };
    S.lobbyPublic = lobbyPublic;
    return S;
  }

  /* QR-Code als SVG */
  function qr(text) {
    if (typeof qrcode !== 'function') return '';
    const q = qrcode(0, 'M');
    q.addData(text);
    q.make();
    const n = q.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + 2} ${r + 2}h1v1h-1z`;
    return `<svg viewBox="0 0 ${n + 4} ${n + 4}" shape-rendering="crispEdges" aria-hidden="true"><rect width="${n + 4}" height="${n + 4}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  }

  window.CC = window.CC || {};
  CC.net = { session, qr, cleanCode, CODE_LEN };
})();
