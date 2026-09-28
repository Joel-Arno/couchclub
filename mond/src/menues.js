/* =====================================================================
   MENÜS: Blätter von unten – Aufsteigen, Amboss, Handel, Ausrüstung,
   Gegenstände, Chronik, Steuerung, Pause
   ===================================================================== */
let sheetClose = null, sheetOn = null;
function sheet(html, o = {}){
  const s = $('#sheet');
  s.innerHTML = html; $('#sheetBack').hidden = false;
  sheetClose = o.onClose || null; sheetOn = o.on || null;
  if (!o.keepScroll) s.scrollTop = 0;
  const f = s.querySelector('button:not([disabled])'); if (f && !o.keepScroll) setTimeout(() => f.focus({ preventScroll: true }), 30);
  Eingabe.loslassen();
}
function closeSheet(run = true){
  $('#sheetBack').hidden = true;
  const f = sheetClose; sheetClose = null; sheetOn = null;
  if (run && f) f();
}
const sheetOffen = () => !$('#sheetBack').hidden;
$('#sheetBack').addEventListener('click', e => {
  if (e.target === $('#sheetBack')) { Snd.play('ui'); closeSheet(); return; }
  const b = e.target.closest('[data-a]');
  if (b && !b.disabled && sheetOn){ Snd.play('ui'); sheetOn(b.dataset.a, b); }
});
const row = (a, name, sub = '', val = '', o = {}) =>
  `<button type="button" class="row${o.on ? ' on' : ''}" data-a="${a}"${o.off ? ' disabled' : ''}><span><b>${esc(name)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span><span class="val">${val}</span></button>`;
const dl = (list, cls = 'stats') => `<dl class="${cls}">${list.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- Aufsteigen ---------- */
function aufsteigen(danach){
  const k = lvlKosten(), p = profil(), kann = D.glut >= k;
  const vor = (attr, fn) => { const a = Object.assign({}, D.attr, { [attr]: D.attr[attr] + 1 }); return fn(profil(D.waffe, a)); };
  const pct = attr => Math.round((vor(attr, q => q.dmgMul) / p.dmgMul - 1) * 1000) / 10;
  const rows = [
    ['vit', `Leben ${p.hpMax} → ${vor('vit', q => q.hpMax)}`],
    ['aus', `Ausdauer ${p.stMax} → ${vor('aus', q => q.stMax)}`],
    ['str', `Schaden mit ${WAFFEN[D.waffe].name} +${String(pct('str')).replace('.', ',')} %`],
    ['ges', `Schaden mit ${WAFFEN[D.waffe].name} +${String(pct('ges')).replace('.', ',')} %`]
  ];
  sheet(`<h3>Aufsteigen</h3><p>Stufe ${D.lvl} auf ${D.lvl + 1} kostet ${fmt(k)} Glut. Du trägst ${fmt(D.glut)} bei dir.</p>
    ${rows.map(([a, t]) => row(a, ATTR[a].name, t, D.attr[a], { off: !kann })).join('')}
    <button type="button" class="btn ghost" data-a="x">Fertig</button>`, {
    keepScroll: true, onClose: danach,
    on(a){
      if (a === 'x') return closeSheet();
      if (D.glut < k || !ATTR[a]) return;
      D.glut -= k; D.lvl++; D.attr[a]++;
      speichern(); Snd.play('fire');
      const P = Stage.P; World.burst(P.x, P.gy - P.H * .6, 'ember', 30);
      toast(`Stufe ${D.lvl}`); aufsteigen(danach);
    }
  });
}

/* ---------- Amboss ---------- */
function amboss(danach){
  const rows = [], forge = [];
  Object.keys(D.waffen).forEach(k => {
    const w = WAFFEN[k], lv = D.waffen[k], c = upgradeKosten(lv), max = lv >= MAX_STUFE;
    const ok = !max && anzahl('glockenerz') >= c.erz && D.glut >= c.glut;
    rows.push(row('up:' + k, `${w.name} +${lv}`, max ? 'Voll geschärft' : `Auf +${lv + 1}: ${c.erz} Glockenerz, ${fmt(c.glut)} Glut`, max ? '' : 'Schärfen', { off: !ok, on: k === D.waffe }));
  });
  Object.keys(WAFFEN).forEach(k => {
    const w = WAFFEN[k], nh = 'nachhall_' + w.nachhall;
    if (!w.nachhall || k in D.waffen || !anzahl(nh)) return;
    forge.push(row('forge:' + k, `${w.name} gießen`, `${GEGENSTAENDE[nh].name} und 600 Glut. ${w.text}`, 'Gießen', { off: D.glut < 600 }));
  });
  sheet(`<h3>Amboss</h3><p>Glockenerz ${anzahl('glockenerz')} · Glut ${fmt(D.glut)}. Jede Stufe macht eine Waffe um 10 % stärker, höchstens +${MAX_STUFE}.</p>
    ${rows.join('')}${forge.length ? '<p class="sec">Nachhall</p>' + forge.join('') : ''}
    <button type="button" class="btn ghost" data-a="x">Fertig</button>`, {
    keepScroll: true, onClose: danach,
    on(a){
      if (a === 'x') return closeSheet();
      const [what, k] = a.split(':');
      if (what === 'up'){
        const lv = D.waffen[k], c = upgradeKosten(lv);
        if (lv >= MAX_STUFE || anzahl('glockenerz') < c.erz || D.glut < c.glut) return;
        D.items.glockenerz -= c.erz; D.glut -= c.glut; D.waffen[k]++;
        Snd.play('block'); setTimeout(() => Snd.play('parry'), 120);
        toast(`${WAFFEN[k].name} +${D.waffen[k]}`);
      }
      if (what === 'forge'){
        const nh = 'nachhall_' + WAFFEN[k].nachhall;
        if (D.glut < 600 || !anzahl(nh)) return;
        D.items[nh]--; D.glut -= 600; D.waffen[k] = 0;
        Snd.play('geleut'); toast(`${WAFFEN[k].name} gegossen. Anlegen im Menü.`, 2600);
      }
      speichern(); amboss(danach);
    }
  });
}

/* ---------- Handel ---------- */
function handel(wer, zurueck){
  const L = LADEN[wer], gek = D.laden[wer] = D.laden[wer] || {};
  const rows = L.filter(e => !e.wenn || e.wenn(D)).map(e => {
    const def = e.art === 'tal' ? TALISMANE[e.id] : GEGENSTAENDE[e.id], rest = e.vorrat - (gek[e.id] || 0);
    return row('buy:' + e.id, def.name, def.text + (rest > 0 ? ` Noch ${rest}.` : ''), rest > 0 ? fmt(e.preis) + ' Glut' : 'ausverkauft', { off: rest <= 0 || D.glut < e.preis });
  });
  sheet(`<h3>${esc(NPC[wer].name)}s Ware</h3><p>Du trägst ${fmt(D.glut)} Glut bei dir.</p>${rows.join('')}
    <button type="button" class="btn ghost" data-a="x">Fertig</button>`, {
    keepScroll: true, onClose: zurueck,
    on(a){
      if (a === 'x') return closeSheet();
      const e = L.find(x => 'buy:' + x.id === a); if (!e) return;
      if (D.glut < e.preis || (gek[e.id] || 0) >= e.vorrat) return;
      D.glut -= e.preis; gek[e.id] = (gek[e.id] || 0) + 1;
      const g = geben({ [e.art]: e.id });
      speichern(); Snd.play('glut'); toast('Gekauft: ' + g[0]);
      handel(wer, zurueck);
    }
  });
}

/* ---------- Ausrüstung und Einstellungen ---------- */
function menue(){
  if (!D.herk) return;
  pausiere(true);
  const p = profil(), w = WAFFEN[D.waffe], a = D.attr;
  const talName = i => D.tal[i] ? TALISMANE[D.tal[i]].name : 'leer';
  sheet(`<h3>${esc(HERK[D.herk].name)}${EMB && EMB.name ? ` <small style="font:italic 500 16px var(--serif);color:var(--mist)">${esc(EMB.name)}</small>` : ''}</h3>
    ${dl([['Stufe', D.lvl], ['Glut', fmt(D.glut)], ['Phiolen', D.flasksMax], ['Leben', p.hpMax], ['Ausdauer', p.stMax], ['Fokus', p.fpMax]])}
    ${dl([[ATTR.vit.name, a.vit], [ATTR.aus.name, a.aus], [ATTR.str.name, a.str], [ATTR.ges.name, a.ges]], 'stats four')}
    <p class="sec">Ausrüstung</p>
    ${row('waffe', 'Waffe', `${w.name} +${D.waffen[D.waffe] || 0} · Kunst: ${w.art.name}`, '›')}
    ${row('schild', 'Schild', w.klasse === 'klinge' ? (D.schild ? SCHILDE[D.schild].name : 'keiner') : 'Nur mit einhändigen Klingen', '›', { off: w.klasse !== 'klinge' })}
    ${row('tal0', 'Talisman', talName(0), '›')}
    ${row('tal1', 'Talisman', talName(1), '›')}
    ${row('items', 'Gegenstände', Object.keys(D.items).filter(k => D.items[k] > 0).map(k => GEGENSTAENDE[k].name).join(', ') || 'keine', '›')}
    ${row('chronik', 'Chronik', `${Object.keys(D.gelesen).length} Schriften, Figuren und Erinnerungen`, '›')}
    <p class="sec">Einstellungen</p>
    ${row('sound', 'Ton', '', S.sound ? 'an' : 'aus')}
    ${hasVoices() ? row('voice', 'Stimmen', 'Erzähler und Figuren sprechen', S.voice ? 'an' : 'aus') : ''}
    ${row('ring', 'Hilfe: Zeitring', 'Zeigt im Kampf, wann ein Treffer kommt. Macht es deutlich leichter.', S.ring ? 'an' : 'aus')}
    ${EMB ? '' : row('vib', 'Vibration', '', S.vib ? 'an' : 'aus')}
    ${row('help', 'Steuerung', 'Erkunden und Kämpfen')}
    ${row('title', EMB ? 'Zurück zum Couchclub' : 'Zum Titel', 'Das Spiel ist gespeichert')}
    <button type="button" class="btn ghost" data-a="x">Schließen</button>`, {
    keepScroll: true, onClose: () => pausiere(false),
    on(k, b){
      const flip = key => { S[key] = !S[key]; saveSettings(); b.querySelector('.val').textContent = S[key] ? 'an' : 'aus'; };
      switch (k){
        case 'x': return closeSheet();
        case 'waffe': return waffenWahl();
        case 'schild': return schildWahl();
        case 'tal0': case 'tal1': return talWahl(+k.slice(3));
        case 'items': return gegenstaende();
        case 'chronik': return chronik();
        case 'sound': flip('sound'); Snd.setOn(S.sound); if (!S.sound) Voice.stop(); else if (!Music.mode()) Music.play('amb'); return;
        case 'voice': flip('voice'); if (!S.voice) Voice.stop(); return;
        case 'ring': return flip('ring');
        case 'vib': return flip('vib');
        case 'help': closeSheet(false); return steuerung(menue);
        case 'title': closeSheet(false); speichern(); pausiere(false); return EMB ? ccLeave() : titel();
      }
    }
  });
}
function nachWechsel(){
  const P = heldAufBuehne();
  const p = profil(); if (D.hp != null) D.hp = Math.min(D.hp, p.hpMax);
  speichern();
}
function waffenWahl(){
  const rows = Object.keys(D.waffen).map(k => {
    const w = WAFFEN[k], d = Math.round(w.light[0].d * profil(k).dmgMul);
    return row(k, `${w.name} +${D.waffen[k]}`, `${w.text} Kunst: ${w.art.name}, ${w.art.text}`, `${d}<small> Schaden</small>`, { on: k === D.waffe });
  });
  sheet(`<h3>Waffe</h3><p>Der Schaden gilt für den ersten leichten Schlag, mit deinen Attributen.</p>${rows.join('')}<button type="button" class="btn ghost" data-a="x">Zurück</button>`, {
    onClose: menue,
    on(k){ if (k !== 'x' && WAFFEN[k]){ D.waffe = k; nachWechsel(); Snd.play('block'); } closeSheet(); }
  });
}
function schildWahl(){
  const rows = Object.keys(D.schilde).map(k => row(k, SCHILDE[k].name, `${SCHILDE[k].text} Fängt ${Math.round(SCHILDE[k].block * 100)} % ab.`, '', { on: k === D.schild }));
  sheet(`<h3>Schild</h3>${rows.join('')}${row('none', 'Ohne Schild', 'Blocken mit der Waffe', '', { on: !D.schild })}<button type="button" class="btn ghost" data-a="x">Zurück</button>`, {
    onClose: menue,
    on(k){ if (k === 'none'){ D.schild = null; nachWechsel(); } else if (SCHILDE[k]){ D.schild = k; nachWechsel(); Snd.play('block'); } closeSheet(); }
  });
}
function talWahl(slot){
  const other = D.tal[1 - slot];
  const rows = Object.keys(D.tals).filter(k => k !== other).map(k => row(k, TALISMANE[k].name, TALISMANE[k].text, '', { on: D.tal[slot] === k }));
  sheet(`<h3>Talisman</h3>${rows.length ? rows.join('') : '<p>Du hast noch keine Talismane gefunden. Sieh dich genau um: in Truhen, bei Toten, hinter brüchigen Wänden.</p>'}${D.tal[slot] ? row('none', 'Ablegen', '') : ''}<button type="button" class="btn ghost" data-a="x">Zurück</button>`, {
    onClose: menue,
    on(k){ if (k === 'none') D.tal[slot] = null; else if (TALISMANE[k]) D.tal[slot] = k; if (k !== 'x'){ nachWechsel(); Snd.play('ui'); } closeSheet(); }
  });
}
function gegenstaende(){
  const ids = Object.keys(D.items).filter(k => D.items[k] > 0);
  const rows = ids.map(k => `<div class="row"><span><b>${esc(GEGENSTAENDE[k].name)}</b><small>${esc(GEGENSTAENDE[k].text)}</small></span><span class="val">${D.items[k] > 1 ? '×' + D.items[k] : ''}</span></div>`);
  sheet(`<h3>Gegenstände</h3>${rows.length ? rows.join('') : '<p>Noch nichts gefunden.</p>'}<button type="button" class="btn ghost" data-a="x">Zurück</button>`, { onClose: menue, on(){ closeSheet(); } });
}
// Chronik: alles Gelesene und Erinnerte zum Nachlesen
function chronik(){
  const ids = Object.keys(D.gelesen).filter(id => LORE[id]).sort((a, b) => D.gelesen[a] - D.gelesen[b]);
  const rows = ids.map(id => row('l:' + id, LORE[id].titel, LORE[id].art, '›'));
  sheet(`<h3>Chronik</h3><p>Briefe, Inschriften und Erinnerungen, die du gefunden hast.</p>${rows.length ? rows.join('') : '<p>Noch leer.</p>'}<button type="button" class="btn ghost" data-a="x">Zurück</button>`, {
    onClose: menue,
    on(a){ if (a === 'x') return closeSheet(); closeSheet(false); zeigeLore(a.slice(2), chronik); }
  });
}

/* ---------- Steuerung ---------- */
const ICON = {
  atk: '<path d="M5 19l3.2-3.2M6.8 13.8l3.4 3.4M9.3 14.7L19 5V4h-1L8.3 13.7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
  dodge: '<path d="M12 6l-6 6 6 6M19 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  block: '<path d="M12 3l7 3v5.2c0 4.6-3.2 7.9-7 9.8-3.8-1.9-7-5.2-7-9.8V6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  eye: '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/>',
  crit: '<path d="M12 3v12M8.5 11.5L12 15l3.5-3.5M6 20h12" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
  flask: '<path d="M9.5 3h5M10.3 3v5.2L6.4 15.5a3.4 3.4 0 0 0 3 5h5.2a3.4 3.4 0 0 0 3-5l-3.9-7.3V3M8 15h8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  jump: '<path d="M12 19V6M6.5 11.5L12 6l5.5 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  sneak: '<path d="M4 16c3-6 13-6 16 0M9 12l-2-5M15 12l2-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
};
const ico = k => `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">${ICON[k]}</svg>`;
function kampfRegeln(then){
  const R = [
    ['atk', '<b>Angriff</b> antippen, mehrmals für eine Folge. <b>Schwer</b> halten und loslassen, lange halten lädt auf. Schwere Schläge brechen Schilde und Panzer.'],
    ['dodge', '<b>Ausweichen</b> macht dich kurz unverwundbar. Kurz vor dem Treffer ist es perfekt: die Zeit wird langsam, und dein nächster Schlag ist ein <b>Gegenschlag</b>.'],
    ['block', '<b>Blocken</b> halten fängt Schaden ab. Kurz vor dem Treffer drücken heißt <b>parieren</b>. Wer zu früh drückt, muss kurz warten.'],
    ['eye', 'Das Aufblitzen an der Waffe verrät den Angriff: <b class="k-p">Gold</b> lässt sich parieren, <b class="k-b">Weiß</b> nur blocken, <b class="k-u">Rot</b> nur ausweichen. Manche holen nur zum Schein aus: ohne Aufblitzen kein Schlag.'],
    ['crit', 'Ist die goldene <b>Haltung</b> leer, taumelt der Gegner. Dann trifft ein <b>Todesstoß</b> besonders hart.'],
    ['flask', 'Die <b>Phiole</b> braucht einen Moment. Gegner nutzen ihn, und wer getroffen wird, verschüttet sie.']
  ];
  S.tut = true; saveSettings();
  sheet(`<h3>Kampf</h3>
    <ul class="rules">${R.map(([i, t]) => `<li><i>${ico(i)}</i><span>${t}</span></li>`).join('')}</ul>
    <p class="keys">Tastatur: Leertaste Angriff, H Schwer, K Ausweichen, L Blocken, U Kunst, E Phiole, Esc Pause.</p>
    <button type="button" class="btn primary" data-a="go">Verstanden</button>`, { onClose: then, on: () => closeSheet() });
}
function steuerung(then){
  const R = [
    ['dodge', '<b>Links</b> auf den Bildschirm tippen und ziehen: laufen. Nach oben oder unten an Leitern: klettern. Wenig ziehen heißt leise schleichen.'],
    ['jump', '<b>Springen</b> kurz tippen springt niedrig, halten springt hoch. Nach unten ziehen und springen: durch einen Steg fallen.'],
    ['sneak', 'Gegner sehen nach vorn. Schleich dich von hinten an und greif an, bevor sie dich bemerken: ein <b>Hinterhalt</b> trifft schwer.'],
    ['eye', 'Funkeln verrät etwas zum Aufheben, Lesen oder Untersuchen. Die <b>Aktion</b> erscheint rechts, sobald du nah genug bist.'],
    ['atk', 'Manche Wände sind brüchig. Ein <b>Angriff</b> dagegen öffnet verborgene Wege.']
  ];
  sheet(`<h3>Erkunden</h3>
    <ul class="rules">${R.map(([i, t]) => `<li><i>${ico(i)}</i><span>${t}</span></li>`).join('')}</ul>
    <p class="keys">Tastatur: Pfeile oder WASD laufen und klettern, Leertaste springen, J Angriff, E Aktion, K Rolle, M Karte, Esc Menü.</p>
    <button type="button" class="btn ghost" data-a="kampf">Kampf erklärt</button>
    <button type="button" class="btn primary" data-a="go">Verstanden</button>`, { onClose: then, on(a){ if (a === 'kampf'){ closeSheet(false); kampfRegeln(then); } else closeSheet(); } });
}
