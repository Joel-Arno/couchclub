/* Couchclub — Werwolf
   Zwei Arten zu spielen:
   - Ein Handy: Eine Person leitet das Spiel und spielt nicht mit. Die Rollen werden reihum verdeckt verteilt,
     danach führt die App den Spielleiter Satz für Satz durch Nacht und Tag und merkt sich alles.
   - Mehrere Handys: Jeder spielt auf seinem eigenen Handy, die App ist der Erzähler. Nachts tippen alle
     gleichzeitig etwas an (wer keine Rolle hat, nennt einen Verdacht), so verrät keine Bewegung, wer wer ist. */
(() => {
  'use strict';

  const ROLES = {
    wolf: { n: 'Werwolf', pl: 'Werwölfe', e: '🐺', team: 'wolf', max: 6, d: 'Wacht nachts mit den anderen Werwölfen auf. Gemeinsam sucht ihr ein Opfer aus. Am Tag tust du unschuldig.' },
    white: { n: 'Weißer Werwolf', e: '🐺', team: 'white', d: 'Jagt nachts mit den Werwölfen, darf aber jede zweite Nacht einen von ihnen fressen. Du gewinnst nur, wenn du als Einziger übrig bleibst.' },
    seer: { n: 'Seherin', e: '🔮', team: 'village', d: 'Jede Nacht siehst du die Rolle eines Mitspielers. Nutze dein Wissen, ohne dich zu verraten.' },
    witch: { n: 'Hexe', e: '🧪', team: 'village', d: 'Du hast einen Heiltrank, der das Opfer der Werwölfe rettet, und einen Gifttrank, der jemanden tötet. Jeder Trank wirkt nur einmal.' },
    hunter: { n: 'Jäger', e: '🏹', team: 'village', d: 'Wenn du stirbst, nimmst du mit einem letzten Schuss jemanden mit.' },
    cupid: { n: 'Amor', e: '💘', team: 'village', d: 'In der ersten Nacht verliebst du zwei Spieler. Stirbt einer, stirbt der andere aus Kummer mit.' },
    guard: { n: 'Beschützer', e: '🛡️', team: 'village', d: 'Jede Nacht beschützt du einen Spieler vor den Werwölfen, aber nie zweimal hintereinander denselben.' },
    girl: { n: 'Mädchen', e: '👧', team: 'village', d: 'Während die Werwölfe wach sind, darfst du blinzeln und einen von ihnen erkennen. Aber vielleicht sehen sie dich dabei.' },
    elder: { n: 'Dorfältester', e: '👴', team: 'village', d: 'Du bist zäh: Den ersten Angriff der Werwölfe überlebst du.' },
    idiot: { n: 'Dorfdepp', e: '🤪', team: 'village', d: 'Verbannt dich das Dorf, merkt es, dass du nur der Depp bist: Du bleibst am Leben, darfst aber nicht mehr abstimmen.' },
    raven: { n: 'Rabe', e: '🐦', team: 'village', d: 'Jede Nacht markierst du einen Verdächtigen. Bei der nächsten Abstimmung bekommt er zwei Stimmen extra.' },
    child: { n: 'Wildes Kind', e: '🧒', team: 'village', d: 'In der ersten Nacht suchst du dir ein Vorbild. Stirbt dein Vorbild, wirst du zum Werwolf.' },
    villager: { n: 'Dorfbewohner', pl: 'Dorfbewohner', e: '🧑‍🌾', team: 'village', d: 'Du hast keine besondere Fähigkeit, nur deinen Verstand. Findet die Werwölfe und verbannt sie!' },
  };
  const SPECIAL = ['white', 'seer', 'witch', 'hunter', 'cupid', 'guard', 'girl', 'elder', 'idiot', 'raven', 'child'];
  const TALK = [{ v: 0, l: 'Ohne Uhr' }, { v: 120, l: '2 Min.' }, { v: 180, l: '3 Min.' }, { v: 300, l: '5 Min.' }];
  const STORE = 'couchclub.werwolf';

  /* Vorschlag je nach Spielerzahl */
  function suggest(n) {
    const c = { wolf: n <= 5 ? 1 : n <= 8 ? 2 : n <= 12 ? 3 : 4 };
    const at = { seer: 4, witch: 6, hunter: 6, cupid: 7, guard: 8, girl: 9, raven: 10, elder: 11, white: 12, idiot: 12, child: 13 };
    SPECIAL.forEach((r) => { if (n >= at[r]) c[r] = 1; });
    return c;
  }
  function deck(counts, n) {
    const out = [];
    Object.entries(counts).forEach(([r, k]) => { for (let i = 0; i < k; i++) out.push(r); });
    while (out.length < n) out.push('villager');
    return out.slice(0, n);
  }
  const specialsOf = (c) => Object.entries(c).reduce((a, [r, k]) => a + (r === 'villager' ? 0 : k), 0);
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* ---------- Spielregeln ---------- */
  function newGame(names, colors, counts, opts) {
    const roles = shuffle(deck(counts, names.length));
    return {
      n: names.length, names, colors, roles, opts,
      alive: names.map(() => true), mute: [],
      night: 0, day: 0, phase: 'roles',
      lovers: null, model: -1, turned: false,
      heal: true, poison: true, elderHit: false, guardLast: -1, raven: -1,
      act: {}, news: [], log: [], winner: null, hunters: [], queue: [], deaths: [],
      notes: names.map(() => []),
    };
  }
  const isWolf = (S, i) => S.roles[i] === 'wolf' || S.roles[i] === 'white' || (S.roles[i] === 'child' && S.turned);
  const living = (S) => S.alive.map((a, i) => (a ? i : -1)).filter((i) => i >= 0);
  const wolvesAlive = (S) => living(S).filter((i) => isWolf(S, i));
  const holder = (S, r) => S.roles.findIndex((x, i) => x === r && S.alive[i]);
  const mixedLovers = (S) => !!S.lovers && isWolf(S, S.lovers[0]) !== isWolf(S, S.lovers[1]);
  const roleName = (S, i) => (S.roles[i] === 'child' && S.turned ? 'Wildes Kind (jetzt Werwolf)' : ROLES[S.roles[i]].n);

  function nightSteps(S) {
    const has = (r) => holder(S, r) >= 0;
    const wolves = wolvesAlive(S).length;
    const out = [];
    if (S.night === 1 && has('cupid')) out.push('cupid');
    if (S.night === 1 && has('child')) out.push('child');
    if (has('guard')) out.push('guard');
    if (has('seer')) out.push('seer');
    if (wolves) out.push('wolves');
    if (has('girl') && wolves) out.push('girl');
    if (has('white') && S.night % 2 === 0 && wolves > 1) out.push('white');
    if (has('witch') && (S.heal || S.poison)) out.push('witch');
    if (has('raven')) out.push('raven');
    return out;
  }
  function startNight(S) {
    S.night++;
    S.phase = 'night';
    S.act = { wolfVotes: {} };
    S.news = [];
  }
  function kill(S, i, cause) { if (i >= 0 && S.alive[i]) S.queue.push([i, cause]); }
  /* Tote abarbeiten: Liebeskummer, Vorbild, Jäger. Gibt true zurück, wenn ein Jäger noch schießen muss. */
  function process(S) {
    while (S.queue.length) {
      const [i, cause] = S.queue.shift();
      if (!S.alive[i]) continue;
      S.alive[i] = false;
      S.deaths.push({ i, cause, night: S.night, day: S.day });
      S.news.push({ t: 'dead', i, cause });
      if (S.lovers && S.lovers.includes(i)) { const o = S.lovers[0] === i ? S.lovers[1] : S.lovers[0]; if (S.alive[o]) S.queue.push([o, 'love']); }
      if (S.model === i && !S.turned) { const c = holder(S, 'child'); if (c >= 0) { S.turned = true; S.notes[c].push(`Dein Vorbild ${S.names[i]} ist tot. Du bist jetzt ein Werwolf und wachst nachts mit dem Rudel auf.`); } }
      if (S.roles[i] === 'hunter') S.hunters.push(i);
    }
    return S.hunters.length > 0;
  }
  function resolveNight(S) {
    const a = S.act;
    const v = a.wolves;
    if (v != null && v >= 0 && S.alive[v]) {
      if (a.guard === v || a.heal) { /* gerettet */ }
      else if (S.roles[v] === 'elder' && !S.elderHit) S.elderHit = true;
      else kill(S, v, 'wolves');
    }
    if (a.heal) S.heal = false;
    if (a.white != null && a.white >= 0) kill(S, a.white, 'white');
    if (a.poison != null && a.poison >= 0) { kill(S, a.poison, 'poison'); S.poison = false; }
    S.guardLast = a.guard ?? -1;
    S.raven = a.raven ?? -1;
    // Mädchen
    if (a.girl) {
      const g = holder(S, 'girl'), ws = wolvesAlive(S);
      if (g >= 0 && ws.length) {
        const w = ws[(Math.random() * ws.length) | 0];
        S.notes[g].push(`Du hast geblinzelt: ${S.names[w]} ist ein Werwolf.`);
        if (Math.random() < 0.3) ws.forEach((x) => S.notes[x].push(`Ihr habt das Mädchen beim Blinzeln erwischt: Es ist ${S.names[g]}.`));
      }
    }
    if (S.night === 1 && S.lovers) {
      const [x, y] = S.lovers;
      const extra = mixedLovers(S) ? ' Ihr gehört zu verschiedenen Seiten: Ihr gewinnt nur, wenn ihr am Ende die letzten zwei seid.' : '';
      S.notes[x].push(`Amor hat dich verliebt: in ${S.names[y]}. Stirbt einer von euch, stirbt der andere mit.${extra}`);
      S.notes[y].push(`Amor hat dich verliebt: in ${S.names[x]}. Stirbt einer von euch, stirbt der andere mit.${extra}`);
    }
    S.day++;
    S.phase = 'day';
    return process(S);
  }
  function hunterShot(S, t) {
    const h = S.hunters.shift();
    if (t != null && t >= 0 && t !== h) { S.news.push({ t: 'shot', i: h, target: t }); kill(S, t, 'hunter'); }
    return process(S);
  }
  /* Stimmen zählen, Rabe gibt +2. Gibt das Opfer zurück oder -1 bei Gleichstand */
  function tally(S, votes) {
    const c = new Array(S.n).fill(0);
    Object.values(votes).forEach((t) => { if (t >= 0) c[t]++; });
    if (S.raven >= 0 && S.alive[S.raven]) c[S.raven] += 2;
    const top = Math.max(...c);
    if (!top) return { target: -1, counts: c };
    const best = c.map((x, i) => (x === top ? i : -1)).filter((i) => i >= 0);
    return { target: best.length === 1 ? best[0] : -1, counts: c };
  }
  function execute(S, t) {
    S.news = [];
    if (t < 0) { S.news.push({ t: 'none' }); return false; }
    if (S.roles[t] === 'idiot' && !S.mute.includes(t)) { S.mute.push(t); S.news.push({ t: 'idiot', i: t }); return false; }
    kill(S, t, 'vote');
    return process(S);
  }
  function winner(S) {
    const al = living(S);
    if (!al.length) return 'none';
    if (mixedLovers(S) && al.length === 2 && S.lovers.every((i) => S.alive[i])) return 'love';
    if (al.length === 1 && S.roles[al[0]] === 'white') return 'white';
    const ws = al.filter((i) => isWolf(S, i));
    if (!ws.length) return 'village';
    if (ws.length === al.length && !ws.some((i) => S.roles[i] === 'white')) return 'wolf';
    return null;
  }
  function winners(S, w) {
    const love = mixedLovers(S) ? S.lovers : [];
    return S.names.map((_, i) => i).filter((i) => {
      if (w === 'love') return love.includes(i);
      if (love.includes(i)) return false;
      if (w === 'white') return S.roles[i] === 'white';
      if (w === 'wolf') return isWolf(S, i) && S.roles[i] !== 'white';
      if (w === 'village') return !isWolf(S, i);
      return false;
    });
  }
  const WIN = { village: 'Das Dorf gewinnt', wolf: 'Die Werwölfe gewinnen', white: 'Der Weiße Werwolf gewinnt', love: 'Die Verliebten gewinnen', none: 'Niemand überlebt' };
  const WIN_SAY = {
    village: 'Das Dorf hat alle Werwölfe gefunden. Das Dorf gewinnt!',
    wolf: 'Im Dorf leben nur noch Werwölfe. Die Werwölfe gewinnen!',
    white: 'Der Weiße Werwolf ist als Einziger übrig. Er gewinnt allein!',
    love: 'Nur die Verliebten sind übrig. Die Liebe gewinnt!',
    none: 'Niemand hat überlebt.',
  };
  const CAUSE = { wolves: 'von den Werwölfen gefressen', white: 'vom Weißen Werwolf gefressen', poison: 'von der Hexe vergiftet', love: 'aus Liebeskummer gestorben', hunter: 'vom Jäger erschossen', vote: 'vom Dorf verbannt', left: 'hat das Spiel verlassen' };

  /* Ansagen */
  function newsLines(S, reveal) {
    const role = (i) => (reveal ? ` ${S.names[i]} war ${S.roles[i] === 'child' && S.turned ? 'das Wilde Kind und schon ein Werwolf' : artikel(S.roles[i])}.` : '');
    return S.news.map((x) => {
      if (x.t === 'dead') {
        if (x.cause === 'love') return `${S.names[x.i]} stirbt aus Liebeskummer.${role(x.i)}`;
        if (x.cause === 'hunter') return `${S.names[x.i]} wird vom Jäger erschossen.${role(x.i)}`;
        if (x.cause === 'vote') return `Das Dorf hat entschieden: ${S.names[x.i]} muss gehen.${role(x.i)}`;
        if (x.cause === 'left') return `${S.names[x.i]} hat das Spiel verlassen.${role(x.i)}`;
        return `Heute Nacht hat es ${S.names[x.i]} erwischt.${role(x.i)}`;
      }
      if (x.t === 'shot') return `${S.names[x.i]} war der Jäger und schießt ein letztes Mal.`;
      if (x.t === 'idiot') return `${S.names[x.i]} ist der Dorfdepp! Das Dorf lässt ihn laufen, aber abstimmen darf er nicht mehr.`;
      if (x.t === 'none') return 'Keine Mehrheit. Heute muss niemand gehen.';
      return '';
    });
  }
  function artikel(r) {
    return { wolf: 'ein Werwolf', white: 'der Weiße Werwolf', seer: 'die Seherin', witch: 'die Hexe', hunter: 'der Jäger', cupid: 'Amor', guard: 'der Beschützer', girl: 'das Mädchen', elder: 'der Dorfälteste', idiot: 'der Dorfdepp', raven: 'der Rabe', child: 'das Wilde Kind', villager: 'ein Dorfbewohner' }[r];
  }
  function dawnText(S, reveal) {
    const lines = newsLines(S, reveal);
    const deadNight = S.news.filter((x) => x.t === 'dead').length;
    const head = deadNight ? 'Das Dorf erwacht.' : 'Das Dorf erwacht. Heute Nacht ist niemand gestorben.';
    const raven = S.raven >= 0 && S.alive[S.raven] ? [`Der Rabe hat ${S.names[S.raven]} markiert: zwei Stimmen extra bei der Abstimmung.`] : [];
    return [head, ...lines, ...raven];
  }

  const SAY = {
    night: 'Die Nacht bricht herein. Alle schließen die Augen.',
    nightOnline: 'Die Nacht bricht herein. Wer eine Aufgabe hat, erledigt sie jetzt still auf dem Handy. Alle anderen nennen einen Verdacht.',
    cupid: 'Amor erwacht und verliebt zwei Spieler.',
    lovers: 'Die Verliebten erwachen, erkennen sich und schlafen wieder ein.',
    child: 'Das Wilde Kind erwacht und sucht sich ein Vorbild.',
    guard: 'Der Beschützer erwacht. Wen beschützt er heute Nacht?',
    seer: 'Die Seherin erwacht. Wessen Rolle will sie sehen?',
    wolves: 'Die Werwölfe erwachen und suchen sich gemeinsam ein Opfer.',
    girl: 'Das Mädchen darf jetzt blinzeln. Aber Vorsicht!',
    white: 'Der Weiße Werwolf erwacht noch einmal. Will er einen anderen Werwolf fressen?',
    witch: 'Die Hexe erwacht. Ich zeige ihr das Opfer. Will sie es retten? Will sie jemanden vergiften?',
    raven: 'Der Rabe erwacht und markiert einen Verdächtigen.',
    talk: 'Diskutiert! Wer von euch ist ein Werwolf?',
    vote: 'Stimmt jetzt ab. Wer soll das Dorf verlassen?',
  };
  const STEP_SLEEP = { cupid: 'Amor schläft wieder ein', child: 'Das Wilde Kind schläft wieder ein', guard: 'Der Beschützer schläft wieder ein', seer: 'Die Seherin schläft wieder ein', wolves: 'Die Werwölfe schlafen wieder ein', girl: 'Das Mädchen schließt die Augen', white: 'Der Weiße Werwolf schläft wieder ein', witch: 'Die Hexe schläft wieder ein', raven: 'Der Rabe schläft wieder ein' };
  const STEP_TITLE = { cupid: 'Amor', child: 'Wildes Kind', guard: 'Beschützer', seer: 'Seherin', wolves: 'Werwölfe', girl: 'Mädchen', white: 'Weißer Werwolf', witch: 'Hexe', raven: 'Rabe' };

  /* ---------- Darstellung ---------- */
  CC.css(`
    .play.ww-night {
      --ground: #0D1020; --surface: #181C31; --sunk: #232841; --ink: #ECEAF6; --ink-2: #ABA8C3; --ink-3: #78748F;
      --line: rgba(236, 234, 246, .12); --velvet: #8FB8FF; --velvet-ink: #0D1020; --lift: 0 14px 30px -18px rgba(0, 0, 0, .9);
      background: radial-gradient(120% 60% at 50% 0%, #1D2347 0%, #0D1020 70%);
      color: var(--ink);
    }
    .play.ww-night .icon-btn { color: var(--ink); }
    .ww { width: min(100cqw, 560px); height: 100cqh; overflow-y: auto; overscroll-behavior: contain; display: grid; gap: 12px; align-content: start; padding: 2px 2px 12px; }
    .ww-card { background: var(--surface); border-radius: 22px; box-shadow: var(--lift); padding: 16px; display: grid; gap: 12px; }
    .ww-card.center { text-align: center; justify-items: center; }
    .ww-eyebrow { font: 650 12px/1.2 var(--font-body); letter-spacing: .09em; text-transform: uppercase; color: var(--ink-2); }
    .ww-say { font: 760 clamp(21px, 6cqw, 27px)/1.18 var(--font-display); font-stretch: 86%; letter-spacing: -.005em; text-wrap: balance; }
    .ww-say.small { font-size: clamp(18px, 5cqw, 22px); }
    .ww-text { color: var(--ink-2); font-size: 15px; }
    .ww-text b { color: var(--ink); }
    .ww-list { margin: 0; padding: 0 0 0 18px; display: grid; gap: 6px; }
    .ww-picks { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 150px), 1fr)); gap: 8px; }
    .ww-pick {
      display: flex; align-items: center; gap: 9px; min-height: 50px; padding: 6px 12px 6px 7px;
      border-radius: 14px; background: var(--sunk); text-align: left; font-weight: 650;
      box-shadow: inset 0 0 0 2px transparent; transition: background .15s, box-shadow .15s, transform .1s;
    }
    .ww-pick:active:not(:disabled) { transform: scale(.98); }
    .ww-pick .av { width: 32px; height: 32px; font-size: 15px; }
    .ww-pick > span:not(.av) { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ww-pick small { font-size: 11px; color: var(--ink-2); font-weight: 600; }
    .ww-pick.on { background: color-mix(in srgb, var(--pc) 22%, var(--surface)); box-shadow: inset 0 0 0 2px var(--pc); }
    .ww-pick:disabled { opacity: .35; }
    .ww-pick.dead { opacity: .45; text-decoration: line-through; }
    .ww-role { display: grid; justify-items: center; gap: 6px; text-align: center; padding: 10px 6px; }
    .ww-role .em { font-size: 64px; line-height: 1; filter: drop-shadow(0 6px 10px rgba(0, 0, 0, .25)); }
    .ww-role .em.white { filter: grayscale(1) brightness(1.6) drop-shadow(0 6px 10px rgba(0, 0, 0, .25)); }
    .ww-role h3 { font: 800 clamp(28px, 8cqw, 36px)/1 var(--font-display); font-stretch: 80%; margin: 0; }
    .ww-role p { color: var(--ink-2); max-width: 36ch; font-weight: 500; }
    .ww-role h3 { color: var(--ink); }
    .ww-cover { min-height: 220px; display: grid; place-items: center; border-radius: 18px; background: repeating-linear-gradient(135deg, rgba(255, 255, 255, .04) 0 8px, transparent 8px 16px), var(--sunk); font-weight: 700; color: var(--ink-2); text-align: center; padding: 20px; }
    .ww-row { display: flex; gap: 8px; flex-wrap: wrap; }
    .ww-row .btn { flex: 1; }
    .ww-roles { display: grid; gap: 6px; }
    .ww-rl { display: flex; align-items: center; gap: 10px; padding: 6px 6px 6px 10px; border-radius: 14px; background: var(--sunk); }
    .ww-rl .em { font-size: 24px; width: 30px; text-align: center; }
    .ww-rl .em.white { filter: grayscale(1) brightness(1.6); }
    .ww-rl > div:not(.ww-step) { flex: 1; min-width: 0; display: grid; line-height: 1.2; }
    .ww-rl b { font-weight: 700; }
    .ww-rl small { font-size: 12px; color: var(--ink-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ww-step { display: flex; align-items: center; gap: 4px; }
    .ww-step button { width: 36px; height: 36px; border-radius: 50%; background: var(--surface); font: 700 20px/1 var(--font-body); }
    .ww-step button:disabled { opacity: .3; }
    .ww-step output { min-width: 22px; text-align: center; font: 780 20px var(--font-display); }
    .ww-sw { width: 52px; height: 32px; }
    .ww-names { display: flex; gap: 8px; }
    .ww-names .form-input { flex: 1; min-height: 46px; font-size: 16px; }
    .ww-chip-x { margin-left: 2px; color: var(--ink-2); font-weight: 700; }
    .ww-timer { font: 800 clamp(48px, 16cqw, 72px)/1 var(--font-display); font-variant-numeric: tabular-nums; letter-spacing: -.02em; }
    .ww-timer.low { color: var(--p-coral); }
    .ww-bar { height: 6px; border-radius: 3px; background: var(--sunk); overflow: hidden; }
    .ww-bar i { display: block; height: 100%; background: var(--velvet); transition: width .3s; }
    .ww-moon { font-size: 54px; line-height: 1; text-align: center; animation: wwglow 3s ease-in-out infinite alternate; }
    @keyframes wwglow { to { filter: drop-shadow(0 0 18px rgba(200, 210, 255, .45)); } }
    .ww-cast { display: grid; gap: 4px; font-size: 14px; }
    .ww-cast div { display: flex; gap: 8px; align-items: center; padding: 4px 8px; border-radius: 10px; }
    .ww-cast div.dead { opacity: .5; }
    .ww-cast div.win { background: color-mix(in srgb, var(--velvet) 18%, transparent); }
    .ww-cast b { flex: 1; }
    .ww-tag { font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--ink-2); }
    .ww-wolfvotes { font-size: 13px; color: var(--ink-2); }
  `);

  function thumb() {
    return `<svg viewBox="0 0 60 60" aria-hidden="true">
      <rect width="60" height="60" rx="9" fill="#141831"/>
      <circle cx="42" cy="17" r="8" fill="#F3E7C2"/><circle cx="46" cy="14" r="7" fill="#141831"/>
      <circle cx="12" cy="10" r="1" fill="#fff" opacity=".7"/><circle cx="24" cy="6" r=".8" fill="#fff" opacity=".6"/><circle cx="52" cy="30" r=".9" fill="#fff" opacity=".6"/>
      <path d="M8 52l7-14 4 5 3-11 4 8 3-6 3 6 4-9 3 10 4-4 5 15z" fill="#0A0C18"/>
      <path d="M22 50c0-6 3-10 3-14l2-6 2 4h3l2-4 2 6c0 4 3 8 3 14z" fill="#1F2440"/>
      <path d="M27 36l1.5 1.2M33 36l-1.5 1.2" stroke="#F2735C" stroke-width="1.6" stroke-linecap="round"/>
    </svg>`;
  }

  function create(root, api) {
    const play = document.querySelector('#play');
    const esc = api.esc;
    root.innerHTML = '<div class="ww"></div>';
    const wrap = root.firstElementChild;
    let gone = false;
    let config = loadConfig();
    const setNight = (on) => play.classList.toggle('ww-night', !!on);

    function loadConfig() {
      try { const c = JSON.parse(localStorage.getItem(STORE)); if (c && typeof c === 'object') return { counts: c.counts || null, talk: c.talk ?? 180, reveal: c.reveal !== false, speak: c.speak, open: c.open !== false, guests: Array.isArray(c.guests) ? c.guests.slice(0, 20) : [], picks: Array.isArray(c.picks) ? c.picks : null }; } catch (e) { /* neu */ }
      return { counts: null, talk: 180, reveal: true, speak: undefined, open: true, guests: [], picks: null };
    }
    function saveConfig() { try { localStorage.setItem(STORE, JSON.stringify(config)); } catch (e) { /* egal */ } }

    const av = (name, color) => api.avatar({ name, color: color || 'blue' });
    const roleEm = (r) => `<span class="em ${r === 'white' ? 'white' : ''}">${ROLES[r].e}</span>`;
    function roleCard(r, extra = '') {
      return `<div class="ww-role">${roleEm(r)}<span class="ww-eyebrow">Deine Rolle</span><h3>${ROLES[r].n}</h3><p>${ROLES[r].d}</p>${extra}</div>`;
    }

    /* Rollen-Auswahl (Spielleiter und Gastgeber) */
    function rolesEditor(n, counts) {
      const specials = specialsOf(counts);
      const villagers = Math.max(0, n - specials);
      const row = (r, max) => {
        const k = counts[r] || 0;
        return `<div class="ww-rl">${roleEm(r)}<div><b>${ROLES[r].n}</b><small>${ROLES[r].d}</small></div>
          <div class="ww-step"><button data-dec="${r}" ${k <= (r === 'wolf' ? 1 : 0) ? 'disabled' : ''} aria-label="weniger">−</button><output>${k}</output><button data-inc="${r}" ${k >= max || specials >= n ? 'disabled' : ''} aria-label="mehr">+</button></div></div>`;
      };
      return `<div class="ww-roles">
        ${row('wolf', ROLES.wolf.max)}
        ${SPECIAL.map((r) => row(r, 1)).join('')}
        <div class="ww-rl">${roleEm('villager')}<div><b>Dorfbewohner</b><small>Füllen den Rest auf</small></div><div class="ww-step"><output>${villagers}</output></div></div>
      </div>`;
    }
    function editCounts(e, counts, n) {
      const inc = e.target.closest('[data-inc]'), dec = e.target.closest('[data-dec]');
      if (inc) { const r = inc.dataset.inc; if (specialsOf(counts) < n) counts[r] = (counts[r] || 0) + 1; api.sfx('tap'); return true; }
      if (dec) { const r = dec.dataset.dec; counts[r] = Math.max(r === 'wolf' ? 1 : 0, (counts[r] || 0) - 1); api.sfx('tap'); return true; }
      return false;
    }
    function balanceHint(n, counts) {
      const w = (counts.wolf || 0) + (counts.white || 0);
      if (n < 5) return 'Mit weniger als fünf Spielern ist Werwolf sehr kurz. Ab acht wird es richtig gut.';
      if (w * 3 > n) return 'Ziemlich viele Werwölfe. Das wird hart fürs Dorf.';
      if (w * 6 < n) return 'Wenige Werwölfe. Das Dorf hat gute Karten.';
      return '';
    }
    const optionsHTML = (online) => `
      <div class="field"><span class="label">Rollen der Toten</span>${seg([{ v: 1, l: 'Aufdecken' }, { v: 0, l: 'Geheim halten' }], 'reveal', config.reveal ? 1 : 0)}</div>
      ${online ? `<div class="field"><span class="label">Abstimmung</span>${seg([{ v: 1, l: 'Offen' }, { v: 0, l: 'Geheim' }], 'open', config.open ? 1 : 0)}<span class="hint">Offen: Nach dem Auszählen sieht jeder, wer wen gewählt hat.</span></div>` : ''}
      <div class="field"><span class="label">Diskussion am Tag</span>${seg(TALK, 'talk', config.talk)}</div>
      <div class="field"><span class="label">Handy liest vor</span>${seg([{ v: 1, l: 'Ja' }, { v: 0, l: 'Nein' }], 'speak', speakOn(online) ? 1 : 0)}${'speechSynthesis' in window ? '' : '<span class="hint">Dieser Browser kann nicht vorlesen.</span>'}</div>`;
    const speakOn = (online) => (config.speak === undefined ? online : !!config.speak);
    function seg(items, key, cur) { return `<div class="seg">${items.map((it) => `<button data-ww-${key}="${it.v}" aria-pressed="${String(it.v) === String(cur)}">${it.l}</button>`).join('')}</div>`; }
    function editOptions(e) {
      const b = e.target.closest('button');
      if (!b) return false;
      for (const key of ['reveal', 'talk', 'speak', 'open']) {
        const v = b.dataset['ww' + key[0].toUpperCase() + key.slice(1)];
        if (v == null) continue;
        config[key] = key === 'talk' ? +v : v === '1';
        api.sfx('tap');
        return true;
      }
      return false;
    }

    function pickList(S, opts) {
      // opts: { choose: [Indizes], on: [Indizes], note: (i) => '', dead: true }
      const show = opts.all ? S.names.map((_, i) => i) : living(S);
      return `<div class="ww-picks">${show.map((i) => {
        const ok = opts.choose.includes(i);
        return `<button class="ww-pick ${opts.on?.includes(i) ? 'on' : ''} ${S.alive[i] ? '' : 'dead'}" data-pick="${i}" ${ok ? '' : 'disabled'} style="--pc:var(--p-${S.colors[i]})">${av(S.names[i], S.colors[i])}<span>${esc(S.names[i])}${opts.note ? `<br><small>${opts.note(i)}</small>` : ''}</span></button>`;
      }).join('')}</div>`;
    }

    let speakLast = '';
    function say(text, on) { if (!on || !text || text === speakLast) return; speakLast = text; api.speak(text); }

    const ctl = api.mode === 'online' ? onlineGame() : leadGame();
    return { destroy() { gone = true; setNight(false); api.hush(); api.wake(false); ctl?.destroy?.(); } };

    /* ================================================================
       Ein Handy: Spielleiter-Hilfe
       ================================================================ */
    function leadGame() {
      const profiles = api.profiles;
      let picks = (config.picks || api.lineup).filter((id) => profiles.some((p) => p.id === id));
      if (!picks.length) picks = profiles.slice(0, 2).map((p) => p.id);
      let guests = config.guests.slice();
      let counts = null;
      let S = null, step = null, steps = [], sel = [], seerSeen = null, witch = { heal: false, poison: -1 }, timer = null, tEnd = 0, voteSel = -2;
      let reveal = 0;
      let ids = [];
      const names = () => [...picks.map((id) => profiles.find((p) => p.id === id)?.name).filter(Boolean), ...guests];
      const colorsOf = () => { const cs = ['coral', 'blue', 'saffron', 'teal', 'plum', 'rose']; return [...picks.map((id) => profiles.find((p) => p.id === id)?.color || 'blue'), ...guests.map((_, k) => cs[(k + picks.length) % cs.length])]; };

      api.wake(true);
      renderSetup();

      function renderSetup() {
        setNight(false);
        const ns = names();
        if (!counts || !config.counts) counts = config.counts ? { ...config.counts } : suggest(ns.length);
        while (specialsOf(counts) > ns.length && specialsOf(counts) > 1) {
          const r = [...SPECIAL].reverse().find((x) => counts[x]);
          if (r) counts[r]--; else if (counts.wolf > 1) counts.wolf--; else break;
        }
        api.status(`${ns.length} Spieler`);
        const hint = balanceHint(ns.length, counts);
        wrap.innerHTML = `
          <div class="ww-card">
            <span class="ww-eyebrow">Wer spielt mit?</span>
            <p class="ww-text">Eine weitere Person leitet das Spiel, hält das Handy und spielt nicht mit.</p>
            <div class="lineup">${profiles.map((p) => `<button class="chip ${picks.includes(p.id) ? 'is-on' : ''}" data-prof="${p.id}" style="--pc:var(--p-${p.color})"><span class="dot">${esc((p.name.trim()[0] || '?').toUpperCase())}</span>${esc(p.name)}</button>`).join('')}
            ${guests.map((g, k) => `<button class="chip is-on" data-guest="${k}" style="--pc:var(--ink-3)"><span class="dot">${esc((g[0] || '?').toUpperCase())}</span>${esc(g)}<span class="ww-chip-x">×</span></button>`).join('')}</div>
            <form class="ww-names" data-form="guest"><input class="form-input" id="ww-guest" maxlength="14" autocomplete="off" placeholder="Gast hinzufügen"><button class="btn small ghost" type="submit">Dazu</button></form>
          </div>
          <div class="ww-card">
            <div class="ww-row" style="align-items:center"><span class="ww-eyebrow" style="flex:1">Rollen für ${ns.length} Spieler</span><button class="btn small ghost" data-act="suggest">Vorschlag</button></div>
            ${rolesEditor(ns.length, counts)}
            ${hint ? `<p class="ww-text">${hint}</p>` : ''}
          </div>
          <div class="ww-card">${optionsHTML(false)}</div>
          <button class="btn primary wide" data-act="deal" ${ns.length >= 4 ? '' : 'disabled'}>${ns.length >= 4 ? 'Rollen verteilen' : 'Mindestens 4 Spieler'}</button>`;
      }

      function deal() {
        const ns = names();
        config.counts = { ...counts };
        config.picks = picks.slice();
        config.guests = guests.slice();
        saveConfig();
        ids = [...picks, ...guests.map(() => null)];
        S = newGame(ns, colorsOf(), counts, { reveal: config.reveal, talk: config.talk });
        reveal = 0;
        showRole();
      }
      async function showRole() {
        if (gone) return;
        if (reveal >= S.n) {
          wrap.innerHTML = '';
          await api.handoff({ name: 'den Spielleiter', color: 'plum' }, 'Alle kennen ihre Rolle. Jetzt beginnt die erste Nacht.', 'Ich leite das Spiel');
          if (gone) return;
          beginNight();
          return;
        }
        const i = reveal;
        wrap.innerHTML = '';
        api.status(`Rollen verteilen · ${i + 1} von ${S.n}`);
        await api.handoff({ name: S.names[i], color: S.colors[i] }, 'Gleich siehst du deine Rolle. Die anderen schauen bitte weg.');
        if (gone) return;
        wrap.innerHTML = `<div class="ww-card center"><div class="ww-cover" data-act="peek">Tippen und halten, um deine Rolle zu sehen</div><button class="btn primary wide" data-act="seen">Gesehen, weiter</button></div>`;
        const cover = wrap.querySelector('.ww-cover');
        const showR = () => { cover.innerHTML = roleCard(S.roles[i]); };
        const hideR = () => { cover.textContent = 'Tippen und halten, um deine Rolle zu sehen'; };
        cover.addEventListener('pointerdown', showR);
        cover.addEventListener('pointerup', hideR);
        cover.addEventListener('pointerleave', hideR);
        cover.addEventListener('pointercancel', hideR);
      }

      function beginNight() {
        startNight(S);
        steps = nightSteps(S);
        setNight(true);
        step = 'start';
        sel = [];
        renderNight();
      }
      const holderNames = (r) => S.roles.map((x, i) => (x === r && S.alive[i] ? S.names[i] : null)).filter(Boolean).join(', ') || 'niemand mehr';
      const wolfNames = () => wolvesAlive(S).map((i) => S.names[i]).join(', ');

      function renderNight() {
        if (gone) return;
        const speak = speakOn(false);
        api.status(`Nacht ${S.night}`);
        if (step === 'start') {
          say(SAY.night, speak);
          wrap.innerHTML = `<div class="ww-card center"><div class="ww-moon">🌙</div><span class="ww-eyebrow">Nacht ${S.night} · Vorlesen</span><p class="ww-say">${SAY.night}</p>
            <p class="ww-text">Heute Nacht: ${steps.map((s) => STEP_TITLE[s]).join(', ') || 'nur die Werwölfe'}.</p></div>
            <button class="btn primary wide" data-act="next">Weiter</button>`;
          return;
        }
        const s = step;
        const who = s === 'wolves' ? wolfNames() : s === 'white' ? holderNames('white') : holderNames(s === 'child' ? 'child' : s);
        let body = '', can = true, extra = '';
        const others = (i) => living(S).filter((x) => x !== i);
        if (s === 'cupid') {
          body = pickList(S, { choose: living(S), on: sel });
          can = sel.length === 2;
          extra = sel.length === 2 ? `<p class="ww-text">${SAY.lovers}</p>` : '<p class="ww-text">Tippe die zwei an, auf die Amor zeigt.</p>';
        } else if (s === 'child') {
          body = pickList(S, { choose: others(holder(S, 'child')), on: sel });
          can = sel.length === 1;
        } else if (s === 'guard') {
          body = pickList(S, { choose: living(S).filter((i) => i !== S.guardLast), on: sel, note: (i) => (i === S.guardLast ? 'letzte Nacht' : '') });
          can = sel.length === 1;
        } else if (s === 'seer') {
          const me = holder(S, 'seer');
          body = pickList(S, { choose: others(me), on: sel });
          if (sel.length === 1) extra = `<p class="ww-say small">${esc(S.names[sel[0]])} ist <b>${roleName(S, sel[0])}</b> ${ROLES[S.roles[sel[0]]].e}</p><p class="ww-text">Zeig der Seherin die Rolle, zum Beispiel mit dem Daumen: hoch für Dorf, runter für Werwolf.</p>`;
          can = sel.length === 1;
        } else if (s === 'wolves') {
          body = pickList(S, { choose: living(S).filter((i) => !isWolf(S, i)), on: sel });
          can = sel.length === 1;
          if (S.night === 1) extra = '<p class="ww-text">Die Werwölfe sehen sich zum ersten Mal und wissen jetzt, wer zum Rudel gehört.</p>';
        } else if (s === 'girl') {
          body = `<p class="ww-text">Das Mädchen (${esc(holderNames('girl'))}) darf während der Werwolf-Phase blinzeln. Hat es jemanden erkannt? Achte darauf, ob die Werwölfe es bemerken.</p>`;
          can = true;
        } else if (s === 'white') {
          body = pickList(S, { choose: wolvesAlive(S).filter((i) => S.roles[i] !== 'white'), on: sel });
          extra = '<p class="ww-text">Nichts antippen, wenn er niemanden frisst.</p>';
          can = true;
        } else if (s === 'witch') {
          const v = S.act.wolves;
          const vic = v >= 0 ? S.names[v] : null;
          body = `<p class="ww-say small">${vic ? `Das Opfer ist <b>${esc(vic)}</b>.` : 'Die Werwölfe haben niemanden angegriffen.'}</p>
            <div class="ww-row">${S.heal && vic ? `<button class="btn small ${witch.heal ? 'primary' : 'ghost'}" data-act="heal">${witch.heal ? 'Wird geheilt ✓' : 'Heiltrank geben'}</button>` : `<span class="ww-text">${S.heal ? '' : 'Heiltrank schon verbraucht.'}</span>`}</div>
            ${S.poison ? `<span class="ww-eyebrow">Gifttrank für …</span>${pickList(S, { choose: living(S), on: witch.poison >= 0 ? [witch.poison] : [] })}` : '<p class="ww-text">Gifttrank schon verbraucht.</p>'}`;
          can = true;
        } else if (s === 'raven') {
          body = pickList(S, { choose: others(holder(S, 'raven')), on: sel });
          extra = '<p class="ww-text">Nichts antippen, wenn der Rabe niemanden markiert.</p>';
          can = true;
        }
        const script = SAY[s];
        say(script, speak);
        wrap.innerHTML = `<div class="ww-card"><span class="ww-eyebrow">Nacht ${S.night} · ${STEP_TITLE[s]} · ${esc(who)}</span><p class="ww-say">${script}</p>${body}${extra}</div>
          <button class="btn primary wide" data-act="next" ${can ? '' : 'disabled'}>${STEP_SLEEP[s]}</button>`;
      }

      function nightNext() {
        const s = step;
        if (STEP_SLEEP[s]) say(`${STEP_SLEEP[s]}.`, speakOn(false));
        if (s === 'cupid') S.lovers = sel.slice(0, 2);
        else if (s === 'child') S.model = sel[0];
        else if (s === 'guard') S.act.guard = sel[0];
        else if (s === 'seer') S.act.seer = sel[0];
        else if (s === 'wolves') S.act.wolves = sel[0];
        else if (s === 'white') S.act.white = sel[0] ?? -1;
        else if (s === 'witch') { S.act.heal = witch.heal; S.act.poison = witch.poison; }
        else if (s === 'raven') S.act.raven = sel[0] ?? -1;
        sel = [];
        const k = step === 'start' ? 0 : steps.indexOf(step) + 1;
        if (k < steps.length) { step = steps[k]; witch = { heal: false, poison: -1 }; renderNight(); return; }
        const hunt = resolveNight(S);
        dawn(hunt);
      }

      function dawn(hunt) {
        setNight(false);
        const lines = dawnText(S, S.opts.reveal);
        say(lines.join(' '), speakOn(false));
        if (hunt) return hunter(lines);
        const w = winner(S);
        if (w) return end(w, lines);
        renderDay(lines);
      }
      function hunter(lines) {
        const h = S.hunters[0];
        api.status('Der Jäger schießt');
        wrap.innerHTML = `<div class="ww-card">${lines.map((l) => `<p class="ww-say small">${esc(l)}</p>`).join('')}</div>
          <div class="ww-card"><span class="ww-eyebrow">Jäger · ${esc(S.names[h])}</span><p class="ww-say">${esc(S.names[h])} war der Jäger. Wen nimmt er mit?</p>${pickList(S, { choose: living(S), on: sel })}</div>
          <div class="ww-row"><button class="btn ghost" data-act="noshot">Niemand</button><button class="btn primary" data-act="shoot" ${sel.length ? '' : 'disabled'}>Schuss</button></div>`;
        say(`${S.names[h]} war der Jäger. Wen nimmt er mit?`, speakOn(false));
      }
      function afterShot(t) {
        S.news = [];
        const more = hunterShot(S, t);
        sel = [];
        const lines = newsLines(S, S.opts.reveal);
        say(lines.join(' '), speakOn(false));
        if (more) return hunter(lines);
        const w = winner(S);
        if (w) return end(w, lines);
        if (S.phase === 'verdict') return renderVerdict(lines);
        renderDay(lines);
      }

      function renderDay(lines) {
        S.phase = 'day';
        api.status(`Tag ${S.day}`);
        clearInterval(timer);
        tEnd = S.opts.talk ? Date.now() + S.opts.talk * 1000 : 0;
        voteSel = -2;
        const raven = S.raven >= 0 && S.alive[S.raven] ? `<p class="ww-text">Der Rabe hat <b>${esc(S.names[S.raven])}</b> markiert: +2 Stimmen gegen ihn.</p>` : '';
        wrap.innerHTML = `
          <div class="ww-card"><span class="ww-eyebrow">Tag ${S.day} · Vorlesen</span>${lines.map((l) => `<p class="ww-say small">${esc(l)}</p>`).join('')}</div>
          <div class="ww-card center"><p class="ww-say small">${SAY.talk}</p>${tEnd ? '<div class="ww-timer"></div>' : ''}${raven}</div>
          <div class="ww-card"><span class="ww-eyebrow">Abstimmung per Handzeichen · Wer muss gehen?</span>
            ${pickList(S, { choose: living(S), on: voteSel >= 0 ? [voteSel] : [], note: (i) => (S.mute.includes(i) ? 'darf nicht abstimmen' : '') })}
            <div class="ww-row"><button class="btn small ${voteSel === -1 ? 'primary' : 'ghost'}" data-act="tie">Gleichstand / niemand</button></div>
          </div>
          <button class="btn primary wide" data-act="verdict" disabled>Urteil verkünden</button>
          ${castHTML()}`;
        if (tEnd) {
          const el = wrap.querySelector('.ww-timer');
          const tick = () => {
            const s = Math.max(0, Math.ceil((tEnd - Date.now()) / 1000));
            el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
            el.classList.toggle('low', s <= 20);
            if (!s) { clearInterval(timer); api.sfx('draw'); api.buzz([80, 60, 80]); say('Die Zeit ist um. Stimmt jetzt ab.', speakOn(false)); }
          };
          tick();
          timer = setInterval(tick, 500);
        }
        say(SAY.talk, speakOn(false));
      }
      function paintVote() {
        wrap.querySelectorAll('.ww-picks [data-pick]').forEach((b) => b.classList.toggle('on', +b.dataset.pick === voteSel));
        const tie = wrap.querySelector('[data-act="tie"]');
        if (tie) tie.className = `btn small ${voteSel === -1 ? 'primary' : 'ghost'}`;
        const v = wrap.querySelector('[data-act="verdict"]');
        if (v) v.disabled = voteSel < -1;
      }
      function verdict() {
        clearInterval(timer);
        S.phase = 'verdict';
        const hunt = execute(S, voteSel);
        const lines = newsLines(S, S.opts.reveal);
        say(lines.join(' '), speakOn(false));
        if (hunt) return hunter(lines);
        const w = winner(S);
        if (w) return end(w, lines);
        renderVerdict(lines);
      }
      function renderVerdict(lines) {
        api.status(`Tag ${S.day}`);
        wrap.innerHTML = `<div class="ww-card">${lines.map((l) => `<p class="ww-say small">${esc(l)}</p>`).join('')}</div>
          <button class="btn primary wide" data-act="night">Die Nacht beginnt</button>${castHTML()}`;
      }
      function castHTML(win) {
        const ws = win ? winners(S, win) : [];
        return `<div class="ww-card"><span class="ww-eyebrow">Nur für den Spielleiter</span><div class="ww-cast">${S.names.map((n, i) => `<div class="${S.alive[i] ? '' : 'dead'} ${ws.includes(i) ? 'win' : ''}">${av(n, S.colors[i])}<b>${esc(n)}</b>${roleEm(S.roles[i])}<span class="ww-tag">${roleName(S, i)}${S.lovers?.includes(i) ? ' · verliebt' : ''}${S.alive[i] ? '' : ' · tot'}</span></div>`).join('')}</div>
          <p class="ww-text">Tränke: Heilen ${S.heal ? 'übrig' : 'weg'}, Gift ${S.poison ? 'übrig' : 'weg'}.</p></div>`;
      }

      function end(w, lines) {
        clearInterval(timer);
        setNight(false);
        S.phase = 'over';
        const ws = winners(S, w);
        say(WIN_SAY[w], speakOn(false));
        wrap.innerHTML = `<div class="ww-card">${lines.map((l) => `<p class="ww-say small">${esc(l)}</p>`).join('')}<p class="ww-say">${WIN_SAY[w]}</p></div>${castHTML(w)}`;
        const record = {};
        ids.forEach((pid, i) => { if (pid) record[pid] = w === 'none' ? 'l' : ws.includes(i) ? 'w' : 'l'; });
        api.status(WIN[w]);
        api.later(() => api.finish({ title: WIN[w], detail: ws.length ? `Gewonnen haben: ${ws.map((i) => esc(S.names[i])).join(', ')}.` : 'Diesmal gewinnt niemand.', record, noScore: true, delay: 0 }), 2600);
      }

      wrap.addEventListener('submit', (e) => {
        e.preventDefault();
        const inp = wrap.querySelector('#ww-guest');
        const v = (inp?.value || '').trim().slice(0, 14);
        if (!v || names().length >= 20) return;
        guests.push(v);
        counts = null;
        config.counts = null;
        api.sfx('tap');
        renderSetup();
        wrap.querySelector('#ww-guest')?.focus();
      });
      wrap.addEventListener('click', (e) => {
        if (gone) return;
        if (!S) {
          const prof = e.target.closest('[data-prof]');
          const gst = e.target.closest('[data-guest]');
          if (prof) { const id = prof.dataset.prof; picks = picks.includes(id) ? picks.filter((x) => x !== id) : [...picks, id]; config.counts = null; counts = null; api.sfx('tap'); renderSetup(); return; }
          if (gst) { guests.splice(+gst.dataset.guest, 1); config.counts = null; counts = null; api.sfx('tap'); renderSetup(); return; }
          if (editCounts(e, counts, names().length)) { config.counts = { ...counts }; renderSetup(); return; }
          if (editOptions(e)) { renderSetup(); return; }
          const a = e.target.closest('[data-act]')?.dataset.act;
          if (a === 'suggest') { counts = suggest(names().length); config.counts = { ...counts }; api.sfx('tap'); renderSetup(); }
          if (a === 'deal') { api.sfx('place'); deal(); }
          return;
        }
        const a = e.target.closest('[data-act]')?.dataset.act;
        if (a === 'seen') { reveal++; api.sfx('tap'); showRole(); return; }
        const pk = e.target.closest('[data-pick]');
        if (S.phase === 'night' && step && step !== 'start') {
          if (pk) {
            const i = +pk.dataset.pick;
            if (step === 'witch') witch.poison = witch.poison === i ? -1 : i;
            else if (step === 'cupid') sel = sel.includes(i) ? sel.filter((x) => x !== i) : [...sel, i].slice(-2);
            else sel = sel[0] === i ? [] : [i];
            api.sfx('tap');
            renderNight();
            return;
          }
          if (a === 'heal') { witch.heal = !witch.heal; api.sfx('tap'); renderNight(); return; }
        }
        if (a === 'next' && S.phase === 'night') { api.sfx('flip'); nightNext(); return; }
        if (S.hunters.length) {
          if (pk) { const i = +pk.dataset.pick; sel = sel[0] === i ? [] : [i]; api.sfx('tap'); wrap.querySelectorAll('.ww-picks [data-pick]').forEach((b) => b.classList.toggle('on', sel.includes(+b.dataset.pick))); const sb = wrap.querySelector('[data-act="shoot"]'); if (sb) sb.disabled = !sel.length; return; }
          if (a === 'shoot' && sel.length) { api.sfx('drop'); afterShot(sel[0]); return; }
          if (a === 'noshot') { afterShot(-1); return; }
          return;
        }
        if (S.phase === 'day') {
          if (pk) { voteSel = +pk.dataset.pick; api.sfx('tap'); paintVote(); return; }
          if (a === 'tie') { voteSel = -1; api.sfx('tap'); paintVote(); return; }
          if (a === 'verdict' && voteSel >= -1) { api.sfx('drop'); verdict(); return; }
        }
        if (a === 'night') { api.sfx('flip'); beginNight(); }
      });

      return { destroy() { clearInterval(timer); } };
    }

    /* ================================================================
       Mehrere Handys: Die App ist der Erzähler
       ================================================================ */
    function onlineGame() {
      const on = api.online;
      const P = api.players;
      const me = on.me;
      const host = on.host;
      let pub = null, priv = null;
      let S = null;                   // nur beim Gastgeber
      let counts = null;
      let local = { sel: [], sent: null, peek: false, heal: false, poison: -1 };
      let timer = null;
      api.wake(true);

      /* ---------- Gastgeber ---------- */
      const tasks = {};               // offene Aufgaben je Spieler: [Art]
      const done = {};                // Antworten der laufenden Phase
      let waitSince = 0, skipTimer = null;
      const sentPriv = {};

      function hostSetup() {
        counts = config.counts ? { ...config.counts } : suggest(P.length);
        fitCounts();
        publishSetup();
      }
      function fitCounts() {
        while (specialsOf(counts) > P.length && specialsOf(counts) > 1) {
          const r = [...SPECIAL].reverse().find((x) => counts[x]);
          if (r) counts[r]--; else if (counts.wolf > 1) counts.wolf--; else break;
        }
      }
      function publishSetup() {
        on.publish({ phase: 'setup', names: P.map((p) => p.name), colors: P.map((p) => p.color), counts, talk: config.talk, reveal: config.reveal });
      }
      function hostStart() {
        config.counts = { ...counts };
        saveConfig();
        S = newGame(P.map((p) => p.name), P.map((p) => p.color), counts, { reveal: config.reveal, talk: config.talk, open: config.open, speak: speakOn(true) });
        S.phase = 'roles';
        S.ready = [];
        P.forEach((_, i) => { if (on.gone(i)) leaveNow(i, true); });
        assign('roles');
      }
      /* Aufgaben einer Phase verteilen */
      function assign(kind) {
        Object.keys(tasks).forEach((k) => delete tasks[k]);
        Object.keys(done).forEach((k) => delete done[k]);
        const L = living(S);
        if (kind === 'roles') S.names.forEach((_, i) => { if (S.alive[i]) tasks[i] = ['ready']; });
        else if (kind === 'nightA') {
          const st = nightSteps(S).filter((s) => s !== 'witch');
          L.forEach((i) => {
            const t = [];
            const r = S.roles[i];
            if (st.includes('cupid') && r === 'cupid') t.push('cupid');
            if (st.includes('child') && r === 'child' && !S.turned) t.push('child');
            if (st.includes('guard') && r === 'guard') t.push('guard');
            if (st.includes('seer') && r === 'seer') t.push('seer');
            if (st.includes('wolves') && isWolf(S, i)) t.push('wolves');
            if (st.includes('girl') && r === 'girl') t.push('girl');
            if (st.includes('white') && r === 'white') t.push('white');
            if (st.includes('raven') && r === 'raven') t.push('raven');
            if (!t.length) t.push('suspect');
            tasks[i] = t;
          });
        } else if (kind === 'nightB') {
          const w = holder(S, 'witch');
          if (w >= 0) tasks[w] = ['witch'];
        } else if (kind === 'vote') {
          L.forEach((i) => { if (!S.mute.includes(i)) tasks[i] = ['vote']; });
          S.votes = {};
        } else if (kind === 'hunter') {
          tasks[S.hunters[0]] = ['hunter'];
        } else if (kind === 'next') {
          // niemand muss etwas tun, der Gastgeber drückt weiter
        }
        S.stage = kind;
        waitSince = Date.now();
        clearTimeout(skipTimer);
        skipTimer = setTimeout(sync, 26000);
        sync();
        if (!Object.keys(tasks).length && !['next', 'talk', 'done'].includes(kind)) advance();
      }
      function pending() { return Object.entries(tasks).filter(([, t]) => t.length).map(([i]) => +i); }

      function hostAct(i, a) {
        if (!S || !a) return;
        const t = tasks[i];
        if (!t || !t.length || t[0] !== a.k) { syncTo(i); return; }
        const L = living(S);
        const target = (x) => Number.isInteger(x) && x >= 0 && x < S.n && S.alive[x];
        const k = a.k;
        if (k === 'ready') S.ready.push(i);
        else if (k === 'cupid') { if (!Array.isArray(a.v) || a.v.length !== 2 || !a.v.every(target) || a.v[0] === a.v[1]) return syncTo(i); S.lovers = a.v.slice(); }
        else if (k === 'child') { if (!target(a.v) || a.v === i) return syncTo(i); S.model = a.v; }
        else if (k === 'guard') { if (!target(a.v) || a.v === S.guardLast) return syncTo(i); S.act.guard = a.v; }
        else if (k === 'seer') { if (!target(a.v) || a.v === i) return syncTo(i); S.act.seer = a.v; S.notes[i].push(`Nacht ${S.night}: ${S.names[a.v]} ist ${roleName(S, a.v)} ${ROLES[S.roles[a.v]].e}`); }
        else if (k === 'wolves') {
          if (!target(a.v) || isWolf(S, a.v)) return syncTo(i);
          S.act.wolfVotes[i] = a.v;
          // Alle Wölfe einig oder alle haben gewählt? Erst dann ist die Aufgabe erledigt
          const ws = wolvesAlive(S).filter((w) => tasks[w]?.includes('wolves') || S.act.wolfVotes[w] != null);
          if (ws.every((w) => S.act.wolfVotes[w] != null)) {
            ws.forEach((w) => { if (tasks[w] && tasks[w][0] === 'wolves') tasks[w].shift(); });
            S.act.wolves = majority(Object.values(S.act.wolfVotes));
          }
          sync();
          checkDone();
          return;
        } else if (k === 'girl') S.act.girl = !!a.v;
        else if (k === 'white') S.act.white = target(a.v) && isWolf(S, a.v) && a.v !== i ? a.v : -1;
        else if (k === 'raven') S.act.raven = target(a.v) && a.v !== i ? a.v : -1;
        else if (k === 'witch') {
          S.act.heal = !!a.heal && S.heal && S.act.wolves >= 0;
          S.act.poison = S.poison && target(a.poison) ? a.poison : -1;
        } else if (k === 'suspect') { S.sus ||= {}; if (target(a.v)) S.sus[a.v] = (S.sus[a.v] || 0) + 1; }
        else if (k === 'vote') { if (!(a.v === -1 || target(a.v))) return syncTo(i); S.votes[i] = a.v; }
        else if (k === 'hunter') { done.hunter = target(a.v) ? a.v : -1; }
        t.shift();
        sync();
        checkDone();
      }
      function majority(list) {
        const c = {};
        list.forEach((x) => (c[x] = (c[x] || 0) + 1));
        const top = Math.max(...Object.values(c));
        const best = Object.keys(c).filter((k) => c[k] === top).map(Number);
        return best[(Math.random() * best.length) | 0];
      }
      function checkDone() { if (!pending().length) advance(); }

      function advance() {
        clearTimeout(skipTimer);
        const st = S.stage;
        if (st === 'roles') return night();
        if (st === 'nightA') {
          if (S.act.wolves == null && Object.keys(S.act.wolfVotes).length) S.act.wolves = majority(Object.values(S.act.wolfVotes));
          if (S.act.wolves == null) S.act.wolves = -1;
          if (nightSteps(S).includes('witch')) return assign('nightB');
          return morning();
        }
        if (st === 'nightB') return morning();
        if (st === 'vote') return count();
        if (st === 'hunter') {
          const more = hunterShot(S, done.hunter ?? -1);
          S.lines = [...S.lines, ...newsLines(S, S.opts.reveal)];
          S.news = [];
          return afterDeaths(more);
        }
      }
      function night() {
        startNight(S);
        S.lines = [SAY.night];
        S.sus = {};
        S.narr = SAY.nightOnline;
        assign('nightA');
      }
      function morning() {
        const more = resolveNight(S);
        S.lines = dawnText(S, S.opts.reveal);
        const sus = Object.entries(S.sus || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
        S.susLine = sus.length ? `Verdächtigt wurden heute Nacht: ${sus.map(([i, k]) => `${S.names[i]} (${k})`).join(', ')}.` : '';
        S.news = [];
        S.narr = S.lines.join(' ');
        afterDeaths(more, 'day');
      }
      function afterDeaths(more, then) {
        if (then) S.after = then;
        if (more) { S.phase = 'hunter'; return assign('hunter'); }
        const w = winner(S);
        if (w) return over(w);
        if (S.after === 'day') {
          S.phase = 'day';
          S.talkEnd = S.opts.talk ? Date.now() + S.opts.talk * 1000 : 0;
          S.narr = `${(S.lines || []).join(' ')} ${SAY.talk}`;
          assign('talk');
          scheduleVote();
          return;
        }
        S.phase = 'verdict';
        assign('next');
      }
      let voteTimer = null;
      function scheduleVote() {
        clearTimeout(voteTimer);
        if (S.talkEnd) voteTimer = setTimeout(() => { if (S && S.phase === 'day' && S.stage === 'talk') startVote(); }, S.talkEnd - Date.now() + 400);
      }
      function startVote() {
        clearTimeout(voteTimer);
        S.phase = 'vote';
        S.narr = SAY.vote;
        assign('vote');
      }
      function count() {
        const { target, counts: c } = tally(S, S.votes);
        S.lastVotes = { ...S.votes };
        S.lastCounts = c;
        const more = execute(S, target);
        S.lines = newsLines(S, S.opts.reveal);
        S.news = [];
        S.narr = S.lines.join(' ');
        S.phase = 'verdict';
        afterDeaths(more, 'verdict');
      }
      function over(w) {
        S.phase = 'over';
        S.win = w;
        S.winners = winners(S, w);
        S.narr = WIN_SAY[w];
        assign('done');
      }
      function leaveNow(i, quiet) {
        if (!S || !S.alive[i]) return;
        S.news = [];
        kill(S, i, 'left');
        const more = process(S);
        if (!quiet) S.lines = [...(S.lines || []), ...newsLines(S, S.opts.reveal)];
        S.news = [];
        delete tasks[i];
        if (S.lovers && S.lovers.includes(i)) { /* Liebeskummer wurde schon erledigt */ }
        if (more) { S.phase = 'hunter'; assign('hunter'); return; }
        const w = winner(S);
        if (w && S.phase !== 'over' && S.phase !== 'roles') { over(w); return; }
        sync();
        checkDone();
      }

      /* Was jedes Handy sehen darf */
      function publicView() {
        const showRoles = S.phase === 'over';
        const revealed = {};
        S.names.forEach((_, i) => { if (showRoles || (!S.alive[i] && S.opts.reveal)) revealed[i] = S.roles[i] === 'child' && S.turned ? 'child*' : S.roles[i]; });
        return {
          phase: S.phase, stage: S.stage, night: S.night, day: S.day,
          names: S.names, colors: S.colors, alive: S.alive, mute: S.mute, revealed,
          lines: S.lines || [], sus: S.susLine || '', narr: S.narr || '',
          raven: S.phase === 'day' || S.phase === 'vote' ? S.raven : -1,
          waiting: pending().length, total: Object.keys(tasks).length,
          waitingNames: Date.now() - waitSince > 25000 ? pending().filter((i) => !on.isOn(i)).map((i) => S.names[i]) : [],
          canSkip: Date.now() - waitSince > 25000 && pending().length > 0,
          talkEnd: S.talkEnd || 0,
          votes: S.phase === 'verdict' && S.opts.open ? S.lastVotes : null,
          counts: S.phase === 'verdict' ? S.lastCounts : null,
          hunter: S.phase === 'hunter' ? S.hunters[0] : -1,
          win: S.win || null, winners: S.winners || [], roles: showRoles ? S.roles : null, turned: S.turned, lovers: showRoles ? S.lovers : null,
          heal: showRoles ? S.heal : null,
          voted: S.phase === 'vote' ? Object.keys(S.votes || {}).length : 0,
          speak: S.opts.speak,
        };
      }
      function privateView(i) {
        const t = tasks[i] && tasks[i][0];
        const v = { role: S.roles[i], turned: S.roles[i] === 'child' && S.turned, notes: S.notes[i].slice(-8), alive: S.alive[i], task: t || null, lover: S.lovers?.includes(i) && (S.night > 1 || S.phase !== 'night') ? S.lovers.find((x) => x !== i) : -1 };
        if (isWolf(S, i)) {
          v.pack = wolvesAlive(S).filter((x) => x !== i);
          if (S.phase === 'night') v.wolfVotes = S.act.wolfVotes;
        }
        if (t === 'guard') v.not = S.guardLast;
        if (t === 'witch') { v.victim = S.act.wolves; v.heal = S.heal; v.poison = S.poison; }
        if (t === 'white') v.pack = wolvesAlive(S).filter((x) => x !== i && S.roles[x] !== 'white');
        if (!S.alive[i]) v.all = S.roles;   // Tote sehen alles
        return v;
      }
      function sync() {
        if (!S || gone) return;
        on.publish(publicView());
        S.names.forEach((_, i) => syncTo(i));
      }
      function syncTo(i) {
        if (!S) return;
        const v = privateView(i);
        const key = JSON.stringify(v);
        if (sentPriv[i] === key && i !== me) return;
        sentPriv[i] = key;
        on.tell(i, v);
      }
      function skipWaiting() {
        pending().forEach((i) => {
          const t = tasks[i];
          while (t.length) {
            const k = t.shift();
            if (k === 'wolves') { /* ohne Stimme */ }
            if (k === 'hunter') done.hunter = -1;
          }
        });
        if (S.stage === 'nightA' && S.act.wolves == null) {
          const vs = Object.values(S.act.wolfVotes);
          S.act.wolves = vs.length ? majority(vs) : -1;
        }
        sync();
        checkDone();
      }

      /* ---------- Anzeige (alle Handys) ---------- */
      function render() {
        if (gone) return;
        clearInterval(timer);
        if (!pub) { wrap.innerHTML = '<div class="ww-card center"><p class="ww-text">Verbinde mit dem Spiel …</p></div>'; return; }
        const V = pub;
        if (V.phase === 'setup') return renderSetupOnline(V);
        const nightTime = V.phase === 'night' || V.phase === 'roles';
        setNight(nightTime);
        const myRole = priv?.role;
        const alive = V.alive[me];
        api.status(V.phase === 'roles' ? 'Rollen ansehen' : V.phase === 'night' ? `Nacht ${V.night}` : V.phase === 'over' ? WIN[V.win] : `Tag ${V.day}`);
        let html = '';
        if (V.phase === 'roles') html = renderRoles(V);
        else if (V.phase === 'night') html = renderNightOnline(V);
        else if (V.phase === 'over') html = renderOver(V);
        else html = renderDayOnline(V);
        const mine = myRole ? `<div class="ww-card" style="padding:10px 14px"><div class="ww-rl" style="background:none;padding:0">${roleEm(myRole)}<div><b>${priv.turned ? 'Wildes Kind, jetzt Werwolf' : ROLES[myRole].n}${alive ? '' : ' · tot'}</b><small>${priv.pack?.length && V.phase !== 'roles' ? `Rudel: ${priv.pack.map((x) => esc(V.names[x])).join(', ')}` : priv.lover >= 0 ? `Verliebt in ${esc(V.names[priv.lover])}` : 'Deine Rolle bleibt geheim'}</small></div></div></div>` : '';
        const notes = priv?.notes?.length && V.phase !== 'roles' ? `<div class="ww-card"><span class="ww-eyebrow">Nur für dich</span><ul class="ww-list">${priv.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>` : '';
        const hostBar = host && V.canSkip && V.phase !== 'over' ? `<div class="ww-card"><p class="ww-text">Noch offen: ${V.waiting} ${V.waitingNames.length ? `(nicht verbunden: ${V.waitingNames.map(esc).join(', ')})` : ''}</p><button class="btn small ghost" data-act="skip">Nicht mehr warten</button></div>` : '';
        const deadView = !alive && priv?.all && V.phase !== 'over' ? `<div class="ww-card"><span class="ww-eyebrow">Du bist tot und siehst alle Rollen. Psst!</span><div class="ww-cast">${V.names.map((n, i) => `<div class="${V.alive[i] ? '' : 'dead'}">${av(n, V.colors[i])}<b>${esc(n)}</b>${roleEm(priv.all[i])}<span class="ww-tag">${ROLES[priv.all[i]].n}</span></div>`).join('')}</div></div>` : '';
        wrap.innerHTML = html + hostBar + (V.phase !== 'roles' && V.phase !== 'over' ? mine + notes : '') + deadView;
        if (V.talkEnd && V.phase === 'day') {
          const el = wrap.querySelector('.ww-timer');
          const tick = () => {
            if (!el) return;
            const s = Math.max(0, Math.ceil((V.talkEnd - Date.now()) / 1000));
            el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
            el.classList.toggle('low', s <= 20);
          };
          tick();
          timer = setInterval(tick, 500);
        }
      }

      function renderSetupOnline(V) {
        setNight(false);
        api.status('Rollen zusammenstellen');
        if (!host) {
          const c = V.counts || {};
          wrap.innerHTML = `<div class="ww-card center"><div class="ww-moon">🐺</div><p class="ww-say small">Der Gastgeber stellt die Rollen zusammen …</p></div>
            <div class="ww-card"><span class="ww-eyebrow">Im Spiel · ${V.names.length} Spieler</span>
            <div class="ww-roles">${Object.entries(c).filter(([, k]) => k).map(([r, k]) => `<div class="ww-rl">${roleEm(r)}<div><b>${k > 1 ? `${k} ${ROLES[r].pl || ROLES[r].n}` : ROLES[r].n}</b><small>${ROLES[r].d}</small></div></div>`).join('')}
            <div class="ww-rl">${roleEm('villager')}<div><b>${Math.max(0, V.names.length - specialsOf(c))} Dorfbewohner</b></div></div></div></div>`;
          return;
        }
        const hint = balanceHint(P.length, counts);
        wrap.innerHTML = `<div class="ww-card"><span class="ww-eyebrow">Rollen für ${P.length} Spieler</span>
            <div class="ww-row" style="align-items:center"><p class="ww-text" style="flex:1">Alle sehen die Auswahl, aber nicht, wer was bekommt.</p><button class="btn small ghost" data-act="suggest">Vorschlag</button></div>
            ${rolesEditor(P.length, counts)}${hint ? `<p class="ww-text">${hint}</p>` : ''}</div>
          <div class="ww-card">${optionsHTML(true)}</div>
          <button class="btn primary wide" data-act="startgame">Rollen verteilen</button>`;
      }
      function renderRoles(V) {
        if (!priv) return '<div class="ww-card center"><p class="ww-text">Deine Rolle kommt gleich …</p></div>';
        const ready = !priv.task;
        const pack = priv.pack?.length ? `<p class="ww-text">Dein Rudel: <b>${priv.pack.map((x) => esc(V.names[x])).join(', ')}</b></p>` : '';
        return `<div class="ww-card center">
            <div class="ww-cover" data-act="peek">${local.peek ? roleCard(priv.role, pack) : 'Tippen und halten, um deine Rolle zu sehen'}</div>
            <p class="ww-text">${ready ? `Warte auf die anderen … (${V.total - V.waiting} von ${V.total} bereit)` : 'Schau dir deine Rolle an, ohne dass jemand mitliest.'}</p>
            ${ready ? '' : '<button class="btn primary wide" data-act="ready">Ich kenne meine Rolle</button>'}
          </div>`;
      }
      function taskHTML(V) {
        const t = priv.task;
        const L = V.alive.map((a, i) => (a ? i : -1)).filter((i) => i >= 0);
        const others = L.filter((i) => i !== me);
        const s = local.sel;
        const btn = (label, ok = true) => `<button class="btn primary wide" data-act="send" ${ok ? '' : 'disabled'}>${label}</button>`;
        const list = (choose, extra = {}) => pickList({ names: V.names, colors: V.colors, alive: V.alive }, { choose, on: s, ...extra });
        switch (t) {
          case 'cupid': return `<p class="ww-say small">Wen verliebst du? Wähle zwei.</p>${list(L)}${btn('Verlieben', s.length === 2)}`;
          case 'child': return `<p class="ww-say small">Wer ist dein Vorbild?</p>${list(others)}${btn('Vorbild wählen', s.length === 1)}`;
          case 'guard': return `<p class="ww-say small">Wen beschützt du heute Nacht?</p>${list(L.filter((i) => i !== priv.not), { note: (i) => (i === priv.not ? 'letzte Nacht' : '') })}${btn('Beschützen', s.length === 1)}`;
          case 'seer': return `<p class="ww-say small">Wessen Rolle willst du sehen?</p>${list(others)}${btn('Ansehen', s.length === 1)}`;
          case 'wolves': {
            const votes = priv.wolfVotes || {};
            const by = (i) => Object.entries(votes).filter(([, x]) => x === i).map(([w]) => V.names[w]);
            return `<p class="ww-say small">Wen fresst ihr heute Nacht?</p><p class="ww-wolfvotes">Einigt euch. Wenn ihr euch nicht einig seid, entscheidet die Mehrheit oder das Los.</p>
              ${list(L.filter((i) => !priv.pack.includes(i) && i !== me), { note: (i) => (by(i).length ? `🐺 ${by(i).map(esc).join(', ')}` : '') })}${btn(votes[me] != null ? 'Stimme ändern' : 'Opfer wählen', s.length === 1)}`;
          }
          case 'girl': return `<p class="ww-say small">Die Werwölfe sind wach. Willst du blinzeln?</p><p class="ww-text">Dann erfährst du morgen früh, wer einer von ihnen ist. Aber vielleicht sehen sie dich.</p>
            <div class="ww-row"><button class="btn ghost" data-girl="0">Augen zu lassen</button><button class="btn primary" data-girl="1">Blinzeln</button></div>`;
          case 'white': return `<p class="ww-say small">Willst du einen anderen Werwolf fressen?</p>${list(priv.pack)}<div class="ww-row"><button class="btn ghost" data-act="nobody">Niemanden</button>${btn('Fressen', s.length === 1)}</div>`;
          case 'raven': return `<p class="ww-say small">Wen markierst du als verdächtig?</p>${list(others)}<div class="ww-row"><button class="btn ghost" data-act="nobody">Niemanden</button>${btn('Markieren', s.length === 1)}</div>`;
          case 'witch': {
            const v = priv.victim;
            return `<p class="ww-say small">${v >= 0 ? `Das Opfer der Werwölfe ist <b>${esc(V.names[v])}</b>.` : 'Die Werwölfe haben heute niemanden angegriffen.'}</p>
              ${priv.heal && v >= 0 ? `<button class="btn ${local.heal ? 'primary' : 'ghost'} wide" data-act="heal">${local.heal ? 'Wird mit dem Heiltrank gerettet ✓' : 'Heiltrank geben'}</button>` : `<p class="ww-text">${priv.heal ? '' : 'Dein Heiltrank ist verbraucht.'}</p>`}
              ${priv.poison ? `<span class="ww-eyebrow">Gifttrank (antippen zum Vergiften)</span>${pickList({ names: V.names, colors: V.colors, alive: V.alive }, { choose: L, on: local.poison >= 0 ? [local.poison] : [] })}` : '<p class="ww-text">Dein Gifttrank ist verbraucht.</p>'}
              ${btn('Fertig')}`;
          }
          case 'suspect': return `<p class="ww-say small">Wen hältst du für verdächtig?</p><p class="ww-text">Alle tippen nachts etwas an, damit niemand an den Bewegungen erkennt, wer eine Rolle hat. Morgen früh hören alle, wer verdächtigt wurde.</p>${list(others)}${btn('Verdächtigen', s.length === 1)}`;
          case 'vote': return `<p class="ww-say small">Wer soll das Dorf verlassen?</p>${list(others, { note: (i) => (i === V.raven ? '🐦 +2 vom Raben' : '') })}<div class="ww-row"><button class="btn ghost" data-act="abstain">Enthalten</button>${btn('Abstimmen', s.length === 1)}</div>`;
          case 'hunter': return `<p class="ww-say small">Du bist der Jäger und stirbst. Wen nimmst du mit?</p>${list(others)}<div class="ww-row"><button class="btn ghost" data-act="nobody">Niemanden</button>${btn('Schießen', s.length === 1)}</div>`;
          default: return '';
        }
      }
      function renderNightOnline(V) {
        const t = priv?.task;
        const head = `<div class="ww-card center"><div class="ww-moon">🌙</div><span class="ww-eyebrow">Nacht ${V.night}</span><p class="ww-say">${V.alive[me] ? 'Augen zu, Handy in die Hand.' : 'Du bist tot und schaust zu.'}</p></div>`;
        if (t && t !== 'ready') return head + `<div class="ww-card">${taskHTML(V)}</div>`;
        const prog = V.total ? Math.round(((V.total - V.waiting) / V.total) * 100) : 100;
        return head + `<div class="ww-card"><p class="ww-text">Die Nacht geht weiter … Warte, bis alle fertig sind.</p><div class="ww-bar"><i style="width:${prog}%"></i></div></div>`;
      }
      function renderDayOnline(V) {
        const lines = (V.lines || []).filter(Boolean);
        let html = `<div class="ww-card"><span class="ww-eyebrow">Tag ${V.day}</span>${lines.map((l) => `<p class="ww-say small">${esc(l)}</p>`).join('')}${V.sus && V.phase === 'day' ? `<p class="ww-text">${esc(V.sus)}</p>` : ''}</div>`;
        if (V.phase === 'hunter') {
          html += priv?.task === 'hunter' ? `<div class="ww-card">${taskHTML(V)}</div>` : `<div class="ww-card center"><p class="ww-say small">${esc(V.names[V.hunter])} war der Jäger und legt an …</p></div>`;
        } else if (V.phase === 'day') {
          html += `<div class="ww-card center"><p class="ww-say small">${SAY.talk}</p>${V.talkEnd ? '<div class="ww-timer"></div>' : ''}
            ${V.raven >= 0 ? `<p class="ww-text">Der Rabe hat <b>${esc(V.names[V.raven])}</b> markiert: +2 Stimmen.</p>` : ''}
            ${host ? '<button class="btn primary wide" data-act="vote">Abstimmung starten</button>' : '<p class="ww-text">Wenn ihr so weit seid, startet der Gastgeber die Abstimmung.</p>'}</div>`;
        } else if (V.phase === 'vote') {
          html += priv?.task === 'vote' ? `<div class="ww-card">${taskHTML(V)}</div>`
            : `<div class="ww-card center"><p class="ww-say small">${V.alive[me] ? (V.mute.includes(me) ? 'Du darfst nicht mehr abstimmen.' : 'Deine Stimme ist abgegeben.') : 'Die Lebenden stimmen ab.'}</p><p class="ww-text">${V.voted} von ${V.total} Stimmen</p>${host ? '<button class="btn small ghost" data-act="count">Jetzt auszählen</button>' : ''}</div>`;
        } else if (V.phase === 'verdict') {
          const votes = V.votes ? Object.entries(V.votes).map(([w, t]) => `<li>${esc(V.names[w])} → ${t >= 0 ? esc(V.names[t]) : 'enthalten'}</li>`).join('') : '';
          html += `${votes ? `<div class="ww-card"><span class="ww-eyebrow">So wurde abgestimmt</span><ul class="ww-list">${votes}</ul></div>` : ''}
            <div class="ww-card center">${host ? '<button class="btn primary wide" data-act="night">Die Nacht beginnt</button>' : `<p class="ww-text">Gleich beginnt die Nacht.</p>`}</div>`;
        }
        return html;
      }
      function renderOver(V) {
        setNight(false);
        const ws = V.winners || [];
        return `<div class="ww-card">${(V.lines || []).map((l) => `<p class="ww-say small">${esc(l)}</p>`).join('')}<p class="ww-say">${WIN_SAY[V.win]}</p></div>
          <div class="ww-card"><span class="ww-eyebrow">Alle Rollen</span><div class="ww-cast">${V.names.map((n, i) => `<div class="${V.alive[i] ? '' : 'dead'} ${ws.includes(i) ? 'win' : ''}">${av(n, V.colors[i])}<b>${esc(n)}${i === me ? ' (du)' : ''}</b>${roleEm(V.roles[i])}<span class="ww-tag">${V.roles[i] === 'child' && V.turned ? 'Wildes Kind → Werwolf' : ROLES[V.roles[i]].n}${V.lovers?.includes(i) ? ' · verliebt' : ''}</span></div>`).join('')}</div></div>`;
      }

      let finished = false, lastNarr = '';
      function onPub(V) {
        const prevStage = pub && `${pub.phase}:${pub.stage}:${pub.night}:${pub.day}`;
        pub = V;
        const stageKey = `${V.phase}:${V.stage}:${V.night}:${V.day}`;
        if (stageKey !== prevStage) { local = { sel: [], sent: null, peek: false, heal: false, poison: -1 }; api.sfx(V.phase === 'night' ? 'flip' : 'tap'); }
        if (host && V.speak && V.narr && V.narr !== lastNarr) { lastNarr = V.narr; api.hush(); api.speak(V.narr); }
        render();
        if (V.phase === 'over' && !finished) {
          finished = true;
          const ws = V.winners || [];
          api.later(() => api.finish({ title: WIN[V.win], winners: ws, detail: ws.length ? `Gewonnen haben: ${ws.map((i) => esc(V.names[i])).join(', ')}.` : 'Diesmal gewinnt niemand.', noScore: true, delay: 0 }), 3500);
        }
      }
      on.onState(onPub);
      on.onPrivate((d) => {
        const before = priv?.task;
        priv = d;
        if (d.task !== before) local.sel = [];
        render();
      });
      if (host) {
        on.onAction((i, a) => {
          if (!S) {
            if (i !== me || !a) return;
            if (a.t === 'start') hostStart();
            return;
          }
          if (a.t === 'skip' && i === me) { skipWaiting(); return; }
          if (a.t === 'vote' && i === me && S.phase === 'day') { startVote(); return; }
          if (a.t === 'count' && i === me && S.stage === 'vote') { advance(); return; }
          if (a.t === 'night' && i === me && S.phase === 'verdict') { night(); return; }
          hostAct(i, a);
        });
        on.onLeft((i) => { if (S) leaveNow(i); });
        hostSetup();
        // Warteanzeige auffrischen (für „Nicht mehr warten“)
        const refresher = setInterval(() => { if (gone) { clearInterval(refresher); return; } if (S && pending().length && Date.now() - waitSince > 25000) sync(); }, 5000);
      }

      wrap.addEventListener('pointerdown', (e) => { if (e.target.closest('[data-act="peek"]')) { local.peek = true; render(); } });
      const unpeek = () => { if (local.peek) { local.peek = false; render(); } };
      wrap.addEventListener('pointerup', unpeek);
      wrap.addEventListener('pointercancel', unpeek);
      wrap.addEventListener('click', (e) => {
        if (gone || !pub) return;
        const V = pub;
        if (V.phase === 'setup' && host) {
          if (editCounts(e, counts, P.length)) { config.counts = { ...counts }; publishSetup(); render(); return; }
          if (editOptions(e)) { saveConfig(); publishSetup(); render(); return; }
          const a = e.target.closest('[data-act]')?.dataset.act;
          if (a === 'suggest') { counts = suggest(P.length); config.counts = { ...counts }; api.sfx('tap'); publishSetup(); render(); }
          if (a === 'startgame') { api.sfx('place'); on.send({ t: 'start' }); }
          return;
        }
        const a = e.target.closest('[data-act]')?.dataset.act;
        const send = (x) => { on.send({ k: priv.task, ...x }); local.sent = priv.task; api.sfx('place'); api.buzz(12); };
        if (a === 'ready' && priv?.task === 'ready') { send({}); return; }
        if (a === 'skip') { on.send({ t: 'skip' }); return; }
        if (a === 'vote') { on.send({ t: 'vote' }); return; }
        if (a === 'count') { on.send({ t: 'count' }); return; }
        if (a === 'night') { on.send({ t: 'night' }); return; }
        if (!priv?.task) return;
        const pk = e.target.closest('[data-pick]');
        if (pk) {
          const i = +pk.dataset.pick;
          if (priv.task === 'witch') local.poison = local.poison === i ? -1 : i;
          else if (priv.task === 'cupid') local.sel = local.sel.includes(i) ? local.sel.filter((x) => x !== i) : [...local.sel, i].slice(-2);
          else local.sel = local.sel[0] === i ? [] : [i];
          api.sfx('tap');
          render();
          return;
        }
        const girl = e.target.closest('[data-girl]');
        if (girl) { send({ v: girl.dataset.girl === '1' }); return; }
        if (a === 'heal') { local.heal = !local.heal; api.sfx('tap'); render(); return; }
        if (a === 'nobody') { send({ v: -1 }); return; }
        if (a === 'abstain') { send({ v: -1 }); return; }
        if (a === 'send') {
          if (priv.task === 'witch') send({ heal: local.heal, poison: local.poison });
          else if (priv.task === 'cupid') send({ v: local.sel.slice(0, 2) });
          else if (local.sel.length) send({ v: local.sel[0] });
        }
      });

      render();
      return { destroy() { clearInterval(timer); clearTimeout(skipTimer); clearTimeout(voteTimer); } };
    }
  }

  CC.register({
    id: 'werwolf',
    name: 'Werwolf',
    tagline: 'Das Dorf schläft. Wer ist der Werwolf?',
    color: 'plum',
    minutes: '20–60',
    shelf: 'party',
    modes: ['online', 'lead'],
    lead: [4, 20],
    online: [4, 18],
    bare: true,
    noRestart: true,
    leadHint: 'Eine Person leitet das Spiel und spielt nicht mit. Die Rollen werden verdeckt reihum verteilt, danach sagt dir die App, was du ansagen sollst.',
    thumb: thumb(),
    rules: [
      'Nachts suchen sich die Werwölfe heimlich ein Opfer. Tagsüber berät das Dorf und verbannt per Abstimmung einen Verdächtigen.',
      'Das Dorf gewinnt, wenn alle Werwölfe weg sind. Die Werwölfe gewinnen, wenn nur noch sie übrig sind.',
      'Dazu gibt es 12 Sonderrollen wie Seherin, Hexe, Jäger, Amor oder Rabe, die du einzeln an- und abwählen kannst.',
      'Mit mehreren Handys ist die App der Erzähler und liest vor. Mit einem Handy hilft sie einer Spielleitung.',
    ],
    create,
  });
})();
