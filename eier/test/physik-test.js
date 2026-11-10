/* Prüft das Rechenmodell und zeigt eine Tabelle der Kochzeiten.
 *
 *   node eier/test/physik-test.js
 *
 * Nach Änderungen in config.js zeigt die Tabelle sofort die neuen Zeiten.
 * Wird nicht mit veröffentlicht.
 */
'use strict';
const assert = require('node:assert/strict');
const C = require('../config.js');
const P = require('../physik.js');

const mmss = (s) => (s === null ? '  –  ' : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`);
const basis = { groesse: 'M', start: 'kuehlschrank', anzahl: 2, topf: 'mittel', kalt: false, abschrecken: true, druck: C.NORMALDRUCK };
const zeit = (e) => P.berechne({ ...basis, ...e }, C).kochzeit;
let ok = 0;
function pruefe(name, fn) { fn(); ok++; console.log('  ✓ ' + name); }

console.log('Prüfungen');
pruefe('Siedepunkt: 100 °C bei 1013 hPa, etwa 96,7 °C auf 1000 m', () => {
  assert.ok(Math.abs(P.siedepunkt(1013.25, C) - 100) < 0.05);
  assert.ok(Math.abs(P.siedepunkt(P.druckAusHoehe(1000, C), C) - 96.7) < 0.2);
});

pruefe('Reine Physik (Praxisfaktor 1) trifft eine unabhängige Wärmeleitungs-Simulation', () => {
  // Ei M, 5 °C, nach 5 / 8 Minuten aus sprudelndem Wasser, Höchsttemperatur am Eigelbrand
  // (Finite-Differenzen-Rechnung: abgeschreckt 65,2 / 78,4 °C, an der Luft 68,6 / 79,9 °C)
  const K = { ...C, PRAXISFAKTOR: 1 };
  const sim = P.simuliere({ gramm: 58, anzahl: 1, liter: 3, siede: 100, tEi: 5, kalt: false, watt: Infinity, tStart: 15 }, K);
  const kalt = P.nachgaren(58, 1e6, 12, K), luft = P.nachgaren(58, 15, 22, K);
  for (const [t, a, l] of [[300, 65.2, 68.6], [480, 78.4, 79.9]]) {
    assert.ok(Math.abs(kalt(sim.tw[t], sim.b[t]) - a) < 0.4, `abgeschreckt nach ${t} s`);
    assert.ok(Math.abs(luft(sim.tw[t], sim.b[t]) - l) < 0.4, `Luft nach ${t} s`);
  }
});

pruefe('Kalibrierung: M aus dem Kühlschrank etwa 6:00 / 7:00 / 8:15 / 10:00', () => {
  const soll = { weich: 360, wachsweich: 420, mittel: 495, hart: 600 };
  for (const [g, s] of Object.entries(soll)) assert.ok(Math.abs(zeit({ garstufe: g }) - s) <= 20, g);
});

pruefe('Größere Eier, kältere Eier, mehr Höhe und mehr Eier brauchen länger', () => {
  const m = zeit({ garstufe: 'mittel' });
  assert.ok(zeit({ garstufe: 'mittel', groesse: 'L' }) > m);
  assert.ok(zeit({ garstufe: 'mittel', start: 'zimmer' }) < m);
  assert.ok(zeit({ garstufe: 'mittel', druck: P.druckAusHoehe(1500, C) }) > m);
  assert.ok(zeit({ garstufe: 'mittel', anzahl: 12, topf: 'klein' }) >= m);
});

pruefe('Ohne Abschrecken etwas kürzer, kaltes Aufsetzen ab dem Kochen deutlich kürzer', () => {
  const m = zeit({ garstufe: 'mittel' });
  const ohne = zeit({ garstufe: 'mittel', abschrecken: false });
  assert.ok(ohne < m && m - ohne < 90);
  assert.ok(zeit({ garstufe: 'mittel', kalt: true, aufheizGemessen: 480 }) < m - 60);
  assert.ok(zeit({ garstufe: 'mittel', kalt: true, aufheizGemessen: 600 }) < zeit({ garstufe: 'mittel', kalt: true, aufheizGemessen: 300 }));
});

pruefe('Bei sehr langem Aufheizen sind weiche Eier beim Kochen schon gar', () => {
  const r = P.berechne({ ...basis, garstufe: 'weich', kalt: true, aufheizGemessen: 40 * 60 }, C);
  assert.equal(r.kochzeit, 0);
  assert.equal(r.sofort, true);
});

console.log(`${ok} Prüfungen bestanden\n`);

const stufen = Object.keys(C.GARSTUFEN);
console.log('Kochzeiten: 2 Eier, mittlerer Topf, abgeschreckt, Meereshöhe');
console.log(''.padEnd(40), stufen.map((s) => s.padStart(11)).join(''));
const zeile = (name, e) => console.log(name.padEnd(40), stufen.map((g) => mmss(zeit({ ...e, garstufe: g })).padStart(11)).join(''));
for (const g of Object.keys(C.GROESSEN)) zeile(`${g}, Kühlschrank`, { groesse: g });
zeile('M, Zimmertemperatur', { start: 'zimmer' });
zeile('M, ohne Abschrecken', { abschrecken: false });
zeile('M, 12 Eier im kleinen Topf', { anzahl: 12, topf: 'klein' });
for (const h of [500, 1000, 2000]) zeile(`M, ${h} m Höhe`, { druck: P.druckAusHoehe(h, C) });
for (const s of [5, 8, 12]) zeile(`M, kalt aufgesetzt, ${s} min Aufheizen`, { kalt: true, aufheizGemessen: s * 60 });
