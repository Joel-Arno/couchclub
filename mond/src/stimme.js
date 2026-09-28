/* =====================================================================
   STIMME: eingebettete Sprachaufnahmen abspielen
   Tonhöhe, Hall und alle anderen Effekte stecken schon in der Aufnahme
   (siehe stimme.py). Während jemand spricht, wird die Musik leiser.
   ===================================================================== */
const Voice = (() => {
  const cache = {};
  let cur = null, curG = null, done = null, tok = 0;

  const has = id => typeof STIMMEN !== 'undefined' && !!STIMMEN[id];
  const ok = id => S.voice && S.sound && has(id) && !!Snd.ac();
  const whoOf = id => { const p = id.split('.')[0]; return SPRECHER[p] ? p : 'erzaehler'; };

  function decode(id){
    if (cache[id]) return cache[id];
    const bin = atob(STIMMEN[id]), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    cache[id] = new Promise((res, rej) => {
      try {
        // Ältere Safari-Versionen kennen nur die Rückruf-Form
        const p = Snd.ac().decodeAudioData(u.buffer, res, rej);
        if (p && p.then) p.then(res, rej);
      } catch (e) { rej(e); }
    });
    cache[id].catch(() => { delete cache[id]; });
    return cache[id];
  }
  function finish(v){ const f = done; done = null; if (f) f(v); }
  function stop(){
    tok++;
    if (cur){
      // Kurz ausblenden statt hart abzuschneiden, falls noch Hall nachklingt
      const ac = Snd.ac(), t = ac.currentTime;
      try { curG.gain.setTargetAtTime(0, t, .06); cur.onended = null; cur.stop(t + .35); } catch (e) {}
      cur = null; curG = null;
    }
    Music.duck(false);
    finish(false);
  }
  // Spielt eine Zeile ab. Das Versprechen erfüllt sich, wenn sie zu Ende ist oder abgebrochen wird.
  function say(id){
    stop();
    if (!ok(id)) return Promise.resolve(false);
    const my = tok;
    return new Promise(res => {
      done = res;
      decode(id).then(buf => {
        if (my !== tok) return;
        const sp = SPRECHER[whoOf(id)], ac = Snd.ac();
        const src = ac.createBufferSource(), g = ac.createGain();
        src.buffer = buf; g.gain.value = sp.laut;
        src.connect(g); Snd.out(g, 0);
        src.onended = () => { if (cur !== src) return; cur = null; Music.duck(false); finish(true); };
        cur = src; curG = g; Music.duck(true); src.start();
        // Weiter geht es, sobald die Worte gesprochen sind; der Hall klingt dabei aus
        const ende = STIMMEN_ENDE[id];
        if (ende) setTimeout(() => { if (my === tok) finish(true); }, ende * 1000);
      }, () => { if (my === tok) finish(false); });
    });
  }
  // Vorab entpacken, damit die erste Zeile einer Szene ohne Verzögerung kommt
  function warm(ids){ if (!Snd.ac()) return; ids.forEach(id => { if (has(id)) decode(id).catch(() => {}); }); }
  // Wie lange gesprochen wird, in Sekunden (für Untertitel)
  async function length(id){
    if (!ok(id)) return 0;
    if (STIMMEN_ENDE[id]) return STIMMEN_ENDE[id];
    try { return (await decode(id)).duration; } catch (e) { return 0; }
  }
  return { say, stop, warm, has, ok, length, speaking: () => !!cur };
})();
