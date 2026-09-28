/* =====================================================================
   KERKER-WISCHER: SPIELDATEN
   ===================================================================== */

/* ---------- Neue Icons für den Kerker ---------- */
Object.assign(ICON, {
  // Helden
  jaegerin: '<path class="f2" d="M7 15l4-9 2 10z"/><path class="f1" d="M10 44c1-13 4-22 10-27l4-7 4 7c6 5 9 14 10 27z"/><path class="sk" d="M18 26c0-4 2.7-7 6-7s6 3 6 7c0 3.5-2.7 6-6 6s-6-2.5-6-6z"/><circle class="dk" cx="21.8" cy="26" r="1.2"/><circle class="dk" cx="26.2" cy="26" r="1.2"/><path class="ln" d="M40 10c7 8 7 22 0 30"/><path class="ln lt" d="M40 10v30"/>',
  alchemist:'<path class="f1" d="M11 45c1-5.5 6-8.5 13-8.5s12 3 13 8.5z"/><path class="f2" d="M13 20c0-8 5-13.5 11-13.5S35 12 35 20z"/><path class="sk" d="M14 19.5h20v6c0 6-4.5 10.5-10 10.5s-10-4.5-10-10.5z"/><circle class="gl" cx="19" cy="21.5" r="3.8"/><circle class="gl" cx="29" cy="21.5" r="3.8"/><circle class="dk" cx="19" cy="21.5" r="1.5"/><circle class="dk" cx="29" cy="21.5" r="1.5"/><path class="ln lt" d="M22.8 21.5h2.4"/><path class="gd" d="M37 32h4v4l3.5 6.5h-11L37 36z"/>',
  // Monster
  kobold:  '<path class="f2" d="M11 22L2 15l3 12 8 2zM37 22l9-7-3 12-8 2z"/><path class="f1" d="M12 26c0-8 5-13 12-13s12 5 12 13c0 8-5 14-12 14s-12-6-12-14z"/><path class="f2" d="M11 23c0-9 6-17 13-19 7 2 13 10 13 19-4-5-8-7-13-7s-9 2-13 7z"/><circle class="gl" cx="19.5" cy="26" r="1.9"/><circle class="gl" cx="28.5" cy="26" r="1.9"/><path class="ln" d="M18.5 32.5q5.5 4 11 0"/><circle class="gl" cx="38" cy="39" r="5"/><circle class="ln lt" cx="38" cy="39" r="2.4"/>',
  archer:  '<path class="ln" d="M37 6c9 9 9 27 0 36"/><path class="ln lt" d="M37 6v36"/><path class="f2" d="M9 21L2 16l2 10 7 1zM31 21l6-5-1 10-6 1z"/><path class="f1" d="M9 26c0-8 5-13 11.5-13S32 18 32 26c0 8-5 13.5-11.5 13.5S9 34 9 26z"/><circle class="gl" cx="16.5" cy="25" r="1.8"/><circle class="gl" cx="24.5" cy="25" r="1.8"/><path class="ln" d="M15.5 31.5q5 3 10 0"/><path class="ln" d="M6 44L44 26"/><path class="f2" d="M44 26l-6.5-.2 3 5z"/>',
  wisp:    '<path class="f1" d="M24 3c7.5 7 12.5 13.5 12.5 22a12.5 12.5 0 0 1-25 0c0-5 2-8.5 5-11.5 0 4 2 6.5 4 6.5-1-6 0-11.5 3.5-17z"/><path class="gl" d="M24 21c3.5 3 5.5 6 5.5 9a5.5 5.5 0 0 1-11 0c0-3 2-6 5.5-9z"/><circle class="dk" cx="20.5" cy="30" r="1.8"/><circle class="dk" cx="27.5" cy="30" r="1.8"/>',
  necro:   '<path class="ln" d="M40 12v33"/><circle class="bn" cx="40" cy="9" r="4.5"/><circle class="dk" cx="38.4" cy="8.5" r="1"/><circle class="dk" cx="41.6" cy="8.5" r="1"/><path class="f1" d="M8 45c0-14 5-27 14-33 9 6 14 19 14 33z"/><ellipse class="dk" cx="22" cy="25" rx="5.8" ry="7"/><circle class="gl" cx="19.8" cy="24.5" r="1.2"/><circle class="gl" cx="24.2" cy="24.5" r="1.2"/>',
  shaman:  '<path class="f2" d="M15 13l-5-10 8 7zM24 11V1l4 10zM33 13l5-10-8 7z"/><path class="f1" d="M11 15h26v15c0 8-5.5 13.5-13 13.5S11 38 11 30z"/><path class="dk" d="M15.5 21.5h6.5v3.5h-6.5zM26 21.5h6.5v3.5H26zM20 33h8v3.5h-8z"/><path class="gl" d="M12.5 28h4.5v2.2h-4.5zM31 28h4.5v2.2H31z"/>',
  golem:   '<path class="f1" d="M10 16l6-8h16l6 8v22l-5 5H15l-5-5z"/><path class="ln lt" d="M18 12l3 6-2 5M31 29l-4 4 1 5"/><path class="gl" d="M15 21h6v4.5h-6zM27 21h6v4.5h-6z"/><path class="dk" d="M19 32h10v3.5H19z"/>',
  namenlos:'<circle class="f2" cx="24" cy="26" r="19.5"/><path class="f1" d="M24 8c10 0 18 8 18 18.5S34 44 24 44 6 37 6 26.5 14 8 24 8z"/><ellipse class="gl" cx="24" cy="25" rx="7" ry="4.6"/><ellipse class="dk" cx="24" cy="25" rx="1.8" ry="3.8"/><circle class="gl" cx="13.5" cy="19" r="2.2"/><circle class="gl" cx="34.5" cy="19" r="2.2"/><circle class="gl" cx="15.5" cy="33" r="1.7"/><circle class="gl" cx="32.5" cy="33" r="1.7"/><circle class="gl" cx="24" cy="36" r="1.5"/>' + P_CROWN.replace('d="M15.5 12.5l1.8-7 4 3.6L24 3.5l2.7 5.6 4-3.6 1.8 7z"', 'd="M15.5 9.5l1.8-7 4 3.6L24 .5l2.7 5.6 4-3.6 1.8 7z"'),
  // Waffen
  dagger:  '<g transform="rotate(45 24 24)"><path class="f2" d="M24 9l3.2 4.5V27h-6.4V13.5z"/><path class="ln lt" d="M24 14v11"/><rect class="f1" x="16.5" y="26.5" width="15" height="4" rx="2"/><rect class="f1" x="22.2" y="30.5" width="3.6" height="7.5"/><circle class="f1" cx="24" cy="40" r="2.6"/></g>',
  axe:     '<g transform="rotate(25 24 24)"><rect class="ck" x="22" y="8" width="4.4" height="37" rx="2"/><path class="f2" d="M26 7c9 1 14.5 6.5 15 15.5-5.5-1.5-10 0-15 3z"/><path class="f2" d="M22 10l-7 3.5 7 4z"/></g>',
  hammer:  '<g transform="rotate(-30 24 24)"><rect class="ck" x="22" y="17" width="4.4" height="28" rx="2"/><rect class="f2" x="9" y="6" width="30" height="13" rx="2.5"/><rect class="bd" x="22" y="6" width="4.4" height="13"/></g>',
  bow:     '<path class="f2" d="M13 5c15 6 22 21 15 38l-3.4-1.2c6-15 .5-27.5-13.1-33.3z"/><path class="ln lt" d="M13.5 6.5L25.7 42"/><path class="ln" d="M6 32L39 13"/><path class="f1" d="M39 13l-6.8.6 3.4 5.4zM6 32l3.5-5.2 2.3 4z"/>',
  // Karten
  stairs:  '<path class="gl" d="M29 4h14v14H29z"/><path class="f1" d="M5 43h38v-6H5zM11 37h32v-6H11zM17 31h26v-6H17zM23 25h20v-6H23z"/><path class="bd" d="M5 43h38v-1.5H5zM11 37h32v-1.5H11zM17 31h26v-1.5H17zM23 25h20v-1.5H23z"/>',
  key:     '<path class="f1" fill-rule="evenodd" d="M15 6a10 10 0 1 1 0 20 10 10 0 1 1 0-20zm0 5.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 1 0 0-9z"/><path class="f1" d="M22 22.5l19 19-3.4 3.4-3.2-3.2-2.6 2.6-3.4-3.4 2.6-2.6-12.4-12.4z"/>',
  lockchest:'<rect class="f1" x="4" y="21" width="40" height="22" rx="3"/><path class="f2" d="M4 22v-6.5C4 9.5 8.5 5.5 14 5.5h20c5.5 0 10 4 10 10V22z"/><path class="gl" d="M4 20h40v4H4zM10 5.8h3.8V43H10zM34.2 5.8H38V43h-3.8z"/><rect class="dk" x="19.5" y="17" width="9" height="12" rx="2"/><circle class="gl" cx="24" cy="22" r="1.8"/><path class="gl" d="M23 22.5h2l.6 4h-3.2z"/>',
  scroll:  '<rect class="f2" x="12" y="9" width="24" height="30" rx="2"/><rect class="f1" x="9" y="6" width="30" height="7" rx="3.5"/><rect class="f1" x="9" y="35" width="30" height="7" rx="3.5"/><path class="ln lt" d="M17 19h14M17 24h14M17 29h9"/>',
  scroll_fire:'<rect class="f2" x="12" y="9" width="24" height="30" rx="2"/><rect class="f1" x="9" y="6" width="30" height="7" rx="3.5"/><rect class="f1" x="9" y="35" width="30" height="7" rx="3.5"/><path class="fr" d="M24 15c4 4 6 7 6 10a6 6 0 0 1-12 0c0-2 1-4 2.5-5 .3 1.8 1 2.8 2 3.2 0-3 .5-5.5 1.5-8.2z"/>',
  scroll_tp:'<rect class="f2" x="12" y="9" width="24" height="30" rx="2"/><rect class="f1" x="9" y="6" width="30" height="7" rx="3.5"/><rect class="f1" x="9" y="35" width="30" height="7" rx="3.5"/><path class="ln" d="M24 24.5a2 2 0 1 1 2-2 4.2 4.2 0 1 1-4.2 4.2 6.4 6.4 0 1 1 6.4-6.4"/>',
  frost:   '<circle class="f1" cx="24" cy="24" r="6"/><path class="ln" d="M24 4v40M6.7 14l34.6 20M6.7 34l34.6-20M19 7l5 5 5-5M19 41l5-5 5 5M7 21l7-2-2-7M41 27l-7 2 2 7M7 27l7 2-2 7M41 21l-7-2 2-7"/>',
  smoke:   '<circle class="f2" cx="15" cy="17" r="8"/><circle class="f2" cx="27" cy="12" r="8.5"/><circle class="f2" cx="36" cy="20" r="6.5"/><circle class="f1" cx="22" cy="31" r="12"/><ellipse class="hl" cx="17" cy="26" rx="3" ry="4.2"/>',
  elixir:  '<path class="f2" d="M19 5h10v4h-1.2v10.5L35 33c2.2 4.4-.8 9-5.6 9H18.6c-4.8 0-7.8-4.6-5.6-9l7.2-13.5V9H19z"/><path class="f1" d="M15.6 31h16.8l2.6 4.3c1.3 2.8-.7 5.7-3.7 5.7H16.7c-3 0-5-2.9-3.7-5.7z"/><path class="gl" d="M24 32.5l1.1 2.4 2.6.2-2 1.7.6 2.6-2.3-1.4-2.3 1.4.6-2.6-2-1.7 2.6-.2z"/>',
  antidote:'<rect class="ck" x="19" y="5" width="10" height="6" rx="1.5"/><path class="f2" d="M20 10h8v6c5 1.5 9 6 9 12.5C37 36 31.5 42 24 42s-13-6-13-13.5C11 22 15 17.5 20 16z"/><path class="f1" d="M21.5 23h5v5h5v5h-5v5h-5v-5h-5v-5h5z"/>',
  // Karte
  campfire:'<path class="ck" d="M7 39l33-8 1.5 5L8.5 44zM7 31l33 8-1.5 5L5.5 36z"/>' + P_FLAME.replace('d="M24 6c6', 'd="M24 2c6').replace('class="gl" d="M24 17', 'class="gl" d="M24 14'),
  quest:   '<circle class="f1" cx="24" cy="24" r="19"/><path class="ln" style="stroke:var(--on-a, #fff);stroke-width:4" d="M18 18.5a6 6 0 1 1 8.7 5.3c-1.8.9-2.7 2-2.7 3.9v1.8"/><circle class="gl" cx="24" cy="36" r="2.6"/>',
  star:    '<path class="f1" d="M24 3.5l6.1 13 14.2 1.7-10.5 9.8 2.8 14-12.6-7-12.6 7 2.8-14L3.7 18.2l14.2-1.7z"/>',
  sigil:   '<path class="f2" d="M24 2l14 12-6 30H16L10 14z"/><path class="f1" d="M24 8l9 8-4 22h-10l-4-22z"/><path class="gl" d="M24 14l2.5 7-2.5 9-2.5-9z"/>',
  bag:     '<path class="f2" d="M17 11h14l-3 6H20z"/><path class="f1" d="M15 17h18c4 5 6 10.5 6 15 0 6.5-6.5 10-15 10S9 38.5 9 32c0-4.5 2-10 6-15z"/><path class="ln" d="M16.5 19.5h15"/>',
  // Relikte (neu)
  r_kugel:   '<circle class="f2" cx="24" cy="21" r="15"/><path class="gl" d="M18 21c2-5 8-7 11-3-3-1-5 0-6 3-1 3-4 4-5 0z"/><ellipse class="hl" cx="18" cy="15" rx="3" ry="4.5"/><path class="f1" d="M13 35h22l3.5 8h-29z"/>',
  r_laterne: '<path class="ln" d="M18 9a6 6 0 0 1 12 0"/><path class="f1" d="M14 10h20v4H14zM14 38h20v5H14z"/><path class="f2" d="M16 14h16l-1.5 24h-13z"/><path class="gl" d="M24 20c3 3 4.5 5.5 4.5 8a4.5 4.5 0 0 1-9 0c0-2.5 1.5-5 4.5-8z"/>',
  r_kelch:   '<path class="f1" d="M11 7h26c0 11-5.5 17.5-13 17.5S11 18 11 7z"/><ellipse class="fr" cx="24" cy="8.5" rx="11" ry="2.5"/><rect class="f1" x="22" y="24" width="4" height="11"/><path class="f1" d="M14 42c0-4 4.5-7 10-7s10 3 10 7z"/><circle class="gl" cx="24" cy="16" r="2.4"/>',
  r_karte:   '<path class="f2" d="M5 10l13-4.5 12 4.5 13-4.5v33l-13 4.5-12-4.5-13 4.5z"/><path class="bd" d="M18 5.5v33l12 4.5v-33z" opacity=".5"/><path class="ln lt" d="M10 33c5-9 10 3 16-6 3-4 5-6 9-7" stroke-dasharray="2 3"/><path class="ln" style="stroke:var(--fire)" d="M33 14l5 5M38 14l-5 5"/>',
  r_sehne:   '<path class="gd" d="M24 3c11 9 13 24 0 42C11 27 13 12 24 3z"/><path class="ln lt" d="M24 8v34M24 17l-5-4M24 24l6-5M24 31l-6-4"/>',
  r_beutel:  '<path class="f2" d="M17 10h14l-3 6H20z"/><path class="f1" d="M15 16h18c4 5 6 10.5 6 15 0 6.5-6.5 10-15 10S9 37.5 9 31c0-4.5 2-10 6-15z"/><path class="ln" d="M16.5 18.5h15"/><circle class="gl" cx="24" cy="30" r="5"/>',
  r_traene:  '<path class="f2" d="M24 4c9 12 14 20 14 27a14 14 0 0 1-28 0c0-7 5-15 14-27z"/><path class="ln lt" d="M24 10v31M14 30h20M17 21l7 9 7-9"/><ellipse class="hl" cx="18" cy="30" rx="2.5" ry="4"/>',
  r_krone:   '<path class="f1" d="M5 37l3-23 9 8.5L24 7l7 15.5 9-8.5 3 23z"/><rect class="f1" x="5" y="37" width="38" height="5" rx="1.5"/><circle class="fr" cx="24" cy="30" r="3"/><circle class="f2" cx="14" cy="31" r="2.2"/><circle class="f2" cx="34" cy="31" r="2.2"/>',
  r_uhrwerk: '<path class="f1" d="M21 3h6l1 5 4 1.7 4.2-3 4.3 4.3-3 4.2L39.2 20l5 1v6l-5 1-1.7 4 3 4.2-4.3 4.3-4.2-3-4 1.7-1 5h-6l-1-5-4-1.7-4.2 3-4.3-4.3 3-4.2L8.8 28l-5-1v-6l5-1 1.7-4-3-4.2 4.3-4.3 4.2 3L20 8z"/><circle class="f2" cx="24" cy="24" r="8"/><path class="ln" d="M24 19v5l3 3"/>',
  r_dornhaut:'<path class="f2" d="M6 32l3-9 4 6 3-12 4 9 4-13 4 13 4-9 3 12 4-6 3 9z"/><path class="f1" d="M5 32c0-4 8-7 19-7s19 3 19 7v5H5z"/><circle class="dk" cx="16" cy="31" r="1.5"/><circle class="dk" cx="32" cy="31" r="1.5"/>',
  r_klee:    '<path class="ln" d="M24 26c2 8 1 13-3 18"/><circle class="gd" cx="24" cy="14.5" r="7"/><circle class="gd" cx="33.5" cy="24" r="7"/><circle class="gd" cx="14.5" cy="24" r="7"/><circle class="gd" cx="24" cy="33" r="5.5" opacity=".0"/><circle class="gl" cx="24" cy="24" r="3"/>',
  r_amboss:  '<path class="f1" d="M4 13h32c0 6-4.5 9.5-11 9.5v6h7v7H14v-7h7v-6c-9 0-15-3.5-17-9.5z"/><path class="f2" d="M36 13h8l-8 5z"/><rect class="f2" x="10" y="36" width="28" height="6" rx="1.5"/><path class="gl" d="M20 4l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2z"/>',
  r_echo:    '<circle class="f2" cx="24" cy="24" r="19"/><path class="ln" d="M24 24.5a2.5 2.5 0 1 1 2.5-2.5 5 5 0 1 1-5 5 8 8 0 1 1 8-8 11.5 11.5 0 1 1-11.5 11.5"/>',
  r_sporn:   '<path class="ln" d="M4 30h20"/><path class="f1" d="M32 14l2.2 6.6 6.8-1.8-4.6 5.3 4.6 5.2-6.8-1.7L32 34.2l-2.2-6.6-6.8 1.7 4.6-5.2-4.6-5.3 6.8 1.8z"/><circle class="dk" cx="32" cy="24" r="2.4"/>',
  r_schaedel:P_SKULL + '<circle class="gl" cx="18.8" cy="22.5" r="1.5"/><circle class="gl" cx="29.2" cy="22.5" r="1.5"/>'
});

/* ---------- Helden ---------- */
const HEROES = {
  ritter:    { name: 'Ritter',    hp: 14, armor: 3, weapon: ['schwert', 3], ability: 'wirbel',   charge: 5, slots: 3, items: [],
               passive: 'Standhaft: +1 Rüstung zu Beginn jedes Raums.', unlock: '' },
  schurkin:  { name: 'Schurkin',  hp: 10, armor: 0, weapon: ['dolch', 3],   ability: 'schatten', charge: 4, slots: 3, items: ['teleport'],
               passive: 'Langfinger: +50 % Gold, und Kobolde bestehlen sie nie.', unlock: 'Besiege einen Boss.' },
  magierin:  { name: 'Magierin',  hp: 9,  armor: 0, weapon: null,           ability: 'feuer',    charge: 4, slots: 3, items: ['feuer', 'frost'],
               passive: 'Gelehrt: Tränke heilen 2 mehr, Feuer trifft 3 härter.', unlock: 'Erreiche Welt 3.' },
  berserker: { name: 'Berserker', hp: 17, armor: 0, weapon: null,           ability: 'rage',     charge: 6, slots: 3, items: [],
               passive: 'Blutdurst: Heilt 2 Leben, wenn er ohne Waffe siegt.', unlock: 'Besiege insgesamt 200 Monster.' },
  jaegerin:  { name: 'Jägerin',   hp: 11, armor: 1, weapon: ['bogen', 4],   ability: 'hagel',    charge: 5, slots: 3, items: [],
               passive: 'Scharfschützin: Bögen haben bei ihr +2 Stärke.', unlock: 'Besiege 25 Monster aus der Ferne.' },
  alchemist: { name: 'Alchemist', hp: 11, armor: 0, weapon: ['dolch', 2],   ability: 'trans',    charge: 4, slots: 5, items: ['trank', 'bombe'],
               passive: 'Tüftler: 5 Taschenplätze, Gegenstände wirken stärker.', unlock: 'Benutze 30 Gegenstände.' }
};
const HERO_IDS = Object.keys(HEROES);
const HERO_SHE = { schurkin: 1, magierin: 1, jaegerin: 1 };
const ABILITIES = {
  wirbel:   { name: 'Wirbelschlag',    target: '',        desc: '5 Schaden an allen angrenzenden Monstern.' },
  schatten: { name: 'Schattenschritt', target: 'any',     desc: 'Tausche den Platz mit einer beliebigen Karte, ohne sie auszulösen.' },
  feuer:    { name: 'Feuerball',       target: 'monster', desc: '8 Schaden an einem Monster, 3 an seinen Nachbarn.' },
  rage:     { name: 'Raserei',         target: '',        desc: '3 Kämpfe lang: ohne Waffe halber Schaden, Waffen nutzen sich nicht ab.' },
  hagel:    { name: 'Pfeilhagel',      target: '',        desc: '3 Schaden an jedem Monster auf dem Feld.' },
  trans:    { name: 'Verwandlung',     target: 'trans',   desc: 'Macht ein Monster zu Gold (so viel wie seine Stärke), jede andere Karte zu einem Heiltrank.' }
};

/* ---------- Waffen ---------- */
const WEAPONS = {
  schwert: { name: 'Schwert', ic: 'sword',  mod: 0,  desc: 'Verlässlich. Fängt Schaden ab und nutzt sich dabei ab.' },
  dolch:   { name: 'Dolch',   ic: 'dagger', mod: -1, desc: 'Schwächer, aber dreimal so oft kritisch. Kritische Treffer richten doppelten Schaden an und schonen die Waffe.' },
  axt:     { name: 'Axt',     ic: 'axe',    mod: 0,  desc: 'Jeder Schlag trifft auch alle Monster neben dem Ziel mit 2 Schaden.' },
  hammer:  { name: 'Hammer',  ic: 'hammer', mod: 0,  desc: 'Durchschlägt jeden Panzer. Überlebt das Ziel, ist es 2 Züge betäubt.' },
  bogen:   { name: 'Bogen',   ic: 'bow',    mod: -1, desc: 'Tippe ein Monster 2 Felder entfernt in gerader Linie an, um zu schießen, ohne dich zu bewegen.' }
};
const WEAPON_IDS = Object.keys(WEAPONS);

/* ---------- Monster-Eigenschaften ---------- */
const TRAITS = {
  dieb:   { name: 'Diebisch',     ic: 'coin',   cd: 0, desc: 'Steht er am Zugende neben dir, stiehlt er Gold und flieht 3 Züge später. Besiegst du ihn vorher, bekommst du alles doppelt zurück.' },
  schuss: { name: 'Schütze',      ic: 'bow',    cd: 2, desc: 'Schießt alle 2 Züge auf dich, wenn du in seiner Reihe oder Spalte stehst.' },
  wieder: { name: 'Wiedergänger', ic: 'skull',  cd: 0, desc: 'Steht nach dem ersten Tod mit halber Stärke wieder auf. Feuer und Explosionen verhindern das.' },
  gift:   { name: 'Giftig',       ic: 'drop',   cd: 0, desc: 'Bekämpfst du es ohne Waffe, bist du 3 Züge lang vergiftet.' },
  explo:  { name: 'Explosiv',     ic: 'flame',  cd: 0, desc: 'Explodiert beim Tod: 4 Schaden an allen Nachbarn, 3 an dir, falls du daneben stehst.' },
  ruf:    { name: 'Beschwörer',   ic: 'skull',  cd: 4, desc: 'Ruft alle 4 Züge ein Skelett herbei, das eine andere Karte ersetzt.' },
  brut:   { name: 'Brutpflege',   ic: 'egg',    cd: 3, desc: 'Lässt alle 3 Züge eine Giftspinne schlüpfen.' },
  geist:  { name: 'Körperlos',    ic: 'clock',  cd: 0, desc: 'Waffen gleiten durch ihn hindurch. Gewöhnliche Geister verblassen jeden Zug um 1.' },
  stark:  { name: 'Einpeitscher', ic: 'bolt',   cd: 0, desc: 'Stärkt jeden Zug alle angrenzenden Monster um 1.' },
  wut:    { name: 'Zornig',       ic: 'flame',  cd: 0, desc: 'Wird jeden Zug um 1 stärker, solange er neben dir steht.' },
  panzer: { name: 'Gepanzert',    ic: 'shield', cd: 0, desc: 'Waffen richten höchstens 3 Schaden pro Schlag an. Hämmer ignorieren das.' },
  wucht:  { name: 'Wuchtig',      ic: 'bolt',   cd: 3, desc: 'Schlägt alle 3 Züge hart zu, wenn du neben ihm stehst.' },
  regen:  { name: 'Regeneration', ic: 'heart',  cd: 0, desc: 'Heilt sich jeden Zug um 1, bis zu seiner vollen Stärke.' }
};

/* ---------- Monster ---------- */
const MONSTERS = {
  slime:  { name: 'Schleim',        art: 'Ein Schleim',        v: [1, 3],   tr: [],         desc: 'Schwach, aber zahlreich.' },
  bat:    { name: 'Fledermaus',     art: 'Eine Fledermaus',    v: [3, 6],   tr: [],         desc: 'Flink und bissig, sonst harmlos.' },
  kobold: { name: 'Kobold',         art: 'Ein Kobold',         v: [2, 4],   tr: ['dieb'],   desc: 'Klaut Gold und rennt damit weg.' },
  archer: { name: 'Goblin-Schütze', art: 'Ein Goblin-Schütze', v: [3, 5],   tr: ['schuss'], desc: 'Trifft dich quer über das Feld.' },
  skull:  { name: 'Skelett',        art: 'Ein Skelett',        v: [5, 8],   tr: ['wieder'], desc: 'Ab Welt 2 steht es einmal wieder auf.' },
  spider: { name: 'Giftspinne',     art: 'Eine Giftspinne',    v: [2, 5],   tr: ['gift'],   desc: 'Nur mit Waffe gefahrlos.' },
  wisp:   { name: 'Irrlicht',       art: 'Ein Irrlicht',       v: [3, 6],   tr: ['explo'],  desc: 'Explodiert beim Tod. Gut gegen seine Nachbarn.' },
  necro:  { name: 'Nekromant',      art: 'Ein Nekromant',      v: [5, 8],   tr: ['ruf'],    desc: 'Holt Skelette aus dem Boden.' },
  ghost:  { name: 'Geist',          art: 'Ein Geist',          v: [4, 8],   tr: ['geist'],  desc: 'Immun gegen Waffen, verblasst aber.' },
  shaman: { name: 'Schamane',       art: 'Ein Schamane',       v: [4, 7],   tr: ['stark'],  desc: 'Macht seine Nachbarn stärker. Zuerst erledigen!' },
  demon:  { name: 'Dämon',          art: 'Ein Dämon',          v: [8, 11],  tr: ['wut'],    desc: 'Wird neben dir jeden Zug wütender.' },
  golem:  { name: 'Golem',          art: 'Ein Golem',          v: [10, 14], tr: ['panzer'], desc: 'Nur Hämmer knacken ihn richtig.' },
  ogre:   { name: 'Oger',           art: 'Ein Oger',           v: [12, 16], tr: ['wucht'],  desc: 'Holt alle 3 Züge zum Schlag aus.' },
  mimic:  { name: 'Mimic',          art: 'Ein Mimic',          v: [5, 9],   tr: [],         desc: 'Tarnt sich als Truhe. Lässt doppelt Gold fallen.' }
};
const MONSTER_POOL = {
  1: { slime: 30, bat: 22, kobold: 14, archer: 12, skull: 18 },
  2: { slime: 8, bat: 16, kobold: 12, archer: 14, skull: 14, spider: 22, wisp: 14 },
  3: { bat: 8, archer: 12, skull: 20, spider: 8, wisp: 10, necro: 12, ghost: 16, shaman: 12 },
  4: { archer: 10, skull: 10, wisp: 10, necro: 8, ghost: 12, shaman: 12, demon: 20, golem: 16 },
  5: { archer: 8, wisp: 14, shaman: 10, demon: 18, golem: 16, ogre: 22, ghost: 8, necro: 6 },
  6: { demon: 16, golem: 16, ogre: 16, ghost: 10, necro: 10, shaman: 10, wisp: 12, archer: 10, spider: 6 }
};
const ELITES = {
  1: [{ name: 'Rattenkönig',  art: 'Der Rattenkönig',   kind: 'kobold', v: [12, 14], tr: ['dieb', 'stark'] },
      { name: 'Knochenwache', art: 'Die Knochenwache',  kind: 'skull',  v: [11, 13], tr: ['wieder', 'panzer'] }],
  2: [{ name: 'Brutmutter',   art: 'Die Brutmutter',    kind: 'spider', v: [14, 17], tr: ['gift', 'brut'] },
      { name: 'Sporenfürst',  art: 'Der Sporenfürst',   kind: 'wisp',   v: [14, 16], tr: ['explo', 'regen'] }],
  3: [{ name: 'Lich',         art: 'Der Lich',          kind: 'necro',  v: [16, 19], tr: ['ruf', 'regen'] },
      { name: 'Grabkoloss',   art: 'Der Grabkoloss',    kind: 'golem',  v: [17, 20], tr: ['panzer', 'wucht'] }],
  4: [{ name: 'Blutritter',   art: 'Der Blutritter',    kind: 'demon',  v: [19, 22], tr: ['wut', 'regen'] },
      { name: 'Nachtmahr',    art: 'Der Nachtmahr',     kind: 'ghost',  v: [15, 18], tr: ['geist', 'schuss'] }],
  5: [{ name: 'Feuerriese',   art: 'Der Feuerriese',    kind: 'ogre',   v: [23, 26], tr: ['wucht', 'explo'] },
      { name: 'Drachenbrut',  art: 'Die Drachenbrut',   kind: 'demon',  v: [21, 24], tr: ['wut', 'schuss'] }],
  6: [{ name: 'Leerenwandler', art: 'Der Leerenwandler', kind: 'ghost', v: [22, 25], tr: ['geist', 'wucht'] },
      { name: 'Urkoloss',     art: 'Der Urkoloss',      kind: 'golem',  v: [26, 30], tr: ['panzer', 'regen'] }]
};

/* ---------- Bosse ---------- */
const BOSSES = {
  waechter: { name: 'Kerkerwächter',  art: 'Der Kerkerwächter',  hp: 18, every: 3, badge: 'shield',
              mech: 'Gepanzert: Waffen richten höchstens 4 Schaden pro Schlag an.',
              p2: 'Wütend! Schlägt jetzt alle 3 Züge mit 4 Schaden zu, wenn du neben ihm stehst.' },
  koenigin: { name: 'Spinnenkönigin', art: 'Die Spinnenkönigin', hp: 26, every: 4, badge: 'egg',
              mech: 'Lässt alle 4 Züge eine Giftspinne schlüpfen. Ohne Waffe vergiftet sie dich.',
              p2: 'Wütend! Legt jetzt alle 3 Züge ein Ei.' },
  knochen:  { name: 'Knochenkönig',   art: 'Der Knochenkönig',   hp: 32, every: 4, badge: 'heart',
              mech: 'Heilt sich jeden Zug um 1. Triff ihn hart und schnell.',
              p2: 'Wütend! Heilt sich um 2 und ruft alle 4 Züge ein Skelett.' },
  schatten: { name: 'Schattenfürst',  art: 'Der Schattenfürst',  hp: 40, every: 3, badge: 'bolt',
              mech: 'Springt alle 3 Züge an einen anderen Platz.',
              p2: 'Wütend! Springt alle 2 Züge und trifft dich mit 4, wenn er neben dir landet.' },
  drache:   { name: 'Uralter Drache', art: 'Der Uralte Drache',  hp: 50, every: 4, badge: 'flame',
              mech: 'Speit alle 4 Züge Feuer über seine Reihe und Spalte: 5 Schaden.',
              p2: 'Wütend! Speit alle 3 Züge, und aus den Flammen steigen Irrlichter.' },
  namenlos: { name: 'Der Namenlose',  art: 'Der Namenlose',      hp: 70, every: 3, badge: 'clock',
              mech: 'Wechselt reihum die Kräfte der fünf Wächter: Eier, Sprünge, Feuer, Heilung.',
              p2: 'Wütend! Jeder seiner Angriffe frisst zusätzlich deine Rüstung.' }
};
const BOSS_IDS = Object.keys(BOSSES);

/* ---------- Welten ---------- */
const WORLDS = [
  { name: 'Modergewölbe',  boss: 'waechter', sub: 'Feuchte Mauern, flinke Kobolde und ein gepanzerter Wächter.' },
  { name: 'Spinnengrotte', boss: 'koenigin', sub: 'Netze, Gift und Irrlichter, die in der Dunkelheit zerplatzen.' },
  { name: 'Knochenhalle',  boss: 'knochen',  sub: 'Hier bleiben die Toten nicht liegen.' },
  { name: 'Schattenreich', boss: 'schatten', sub: 'Dämonen, Golems und Schamanen, die alles noch schlimmer machen.' },
  { name: 'Drachenhort',   boss: 'drache',   sub: 'Oger, Feuer und am Ende der Uralte Drache.' },
  { name: 'Der Abgrund',   boss: 'namenlos', sub: 'Drei Siegelsplitter haben das Tor geöffnet. Dahinter wartet der Namenlose.' }
];
const ROOMS = {
  kampf:    { name: 'Kampf',        ic: 'sword' },
  elite:    { name: 'Elite',        ic: 'knochen' },
  schatz:   { name: 'Schatzkammer', ic: 'lockchest' },
  haendler: { name: 'Händler',      ic: 'merchant' },
  rast:     { name: 'Rastplatz',    ic: 'campfire' },
  ereignis: { name: 'Ereignis',     ic: 'quest' },
  boss:     { name: 'Boss',         ic: 'waechter' }
};

/* ---------- Karten auf dem Feld ---------- */
const CARDS = {
  weapon:    { name: 'Waffe',        ic: 'sword',     desc: 'Fängt Schaden ab und nutzt sich dabei ab.' },
  armor:     { name: 'Rüstung',      ic: 'armor',     desc: 'Schluckt Schaden, bevor du Leben verlierst.' },
  potion:    { name: 'Trank',        ic: 'potion',    desc: 'Heilt sofort. Bist du voll, wandert er in die Tasche.' },
  gold:      { name: 'Gold',         ic: 'coin',      desc: 'Für Händler und für deinen Schatz.' },
  chest:     { name: 'Truhe',        ic: 'chest',     desc: 'Gold, Heilung, Ausrüstung, Gegenstände, selten ein Relikt.' },
  bomb:      { name: 'Bombe',        ic: 'bomb',      desc: 'Explodiert bei 0 und trifft alle Nachbarfelder.' },
  trap:      { name: 'Falle',        ic: 'trap',      desc: 'Kostet Leben, wenn du drauftrittst.' },
  shrine:    { name: 'Schrein',      ic: 'shrine',    desc: 'Wähle eines von drei Relikten.' },
  item:      { name: 'Fundstück',    ic: 'scroll',    desc: 'Ein Gegenstand für deine Tasche.' },
  key:       { name: 'Schlüssel',    ic: 'key',       desc: 'Öffnet die Schatztruhe dieses Raums.' },
  lockchest: { name: 'Schatztruhe',  ic: 'lockchest', desc: 'Verschlossen. Mit Schlüssel voller Beute.' },
  stairs:    { name: 'Treppe',       ic: 'stairs',    desc: 'Führt aus dem Raum. Erscheint, sobald das Ziel erfüllt ist.' }
};

/* ---------- Gegenstände ---------- */
const ITEMS = {
  trank:     { name: 'Heiltrank',        ic: 'potion',      target: '',        desc: 'Heilt 8 Leben.' },
  bombe:     { name: 'Wurfbombe',        ic: 'bomb',        target: 'any',     desc: 'Wirf sie auf eine Karte: 6 Schaden an ihr und an allen Nachbarn.' },
  feuer:     { name: 'Feuerrolle',       ic: 'scroll_fire', target: 'monster', desc: '10 Schaden an einem Monster.' },
  teleport:  { name: 'Versetzungsrolle', ic: 'scroll_tp',   target: 'any',     desc: 'Tausche den Platz mit einer beliebigen Karte.' },
  frost:     { name: 'Frostrolle',       ic: 'frost',       target: '',        desc: 'Monster, Bosse und Bomben erstarren 3 Züge lang.' },
  wetz:      { name: 'Wetzstein',        ic: 'r_schleif',   target: '',        desc: 'Deine Waffe +4. Ohne Waffe bekommst du einen Dolch.' },
  rauch:     { name: 'Rauchbombe',       ic: 'smoke',       target: '',        desc: 'Mischt alle anderen Karten neu, außer Boss, Treppe und Schatztruhe.' },
  elixier:   { name: 'Kraftelixier',     ic: 'elixir',      target: '',        desc: '3 Kämpfe lang doppelter Waffenschaden.' },
  gegengift: { name: 'Gegengift',        ic: 'antidote',    target: '',        desc: 'Heilt Gift und gibt 4 Rüstung.' }
};
const ITEM_IDS = Object.keys(ITEMS);

/* ---------- Talente (bei jedem Stufenaufstieg) ---------- */
const PERKS = {
  zaeh:     { name: 'Zähigkeit',     ic: 'heart',      max: 9, desc: '+3 maximale Leben.' },
  meister:  { name: 'Waffenmeister', ic: 'sword',      max: 3, desc: 'Neue Waffen haben +1 Stärke.' },
  wall:     { name: 'Schildwall',    ic: 'armor',      max: 3, desc: 'Zu Beginn jedes Raums +1 Rüstung. Jetzt sofort +2.' },
  praez:    { name: 'Präzision',     ic: 'star',       max: 3, desc: '+8 % Chance auf kritische Treffer.' },
  blut:     { name: 'Blutdurst',     ic: 'drop',       max: 2, desc: 'Jeder dritte Sieg heilt 2 Leben.' },
  gier:     { name: 'Goldgier',      ic: 'coin',       max: 3, desc: '+20 % Gold.' },
  taschen:  { name: 'Tiefe Taschen', ic: 'bag',        max: 2, desc: '+1 Taschenplatz.' },
  taktik:   { name: 'Taktiker',      ic: 'bolt',       max: 2, desc: 'Deine Heldenfähigkeit braucht 1 Sieg weniger.' },
  kraut:    { name: 'Kräuterkunde',  ic: 'r_kraeuter', max: 2, desc: 'Tränke heilen 2 Leben mehr.' },
  voraus:   { name: 'Voraussicht',   ic: 'r_auge',     max: 2, desc: 'Du siehst 1 Karte weiter voraus.' },
  konter:   { name: 'Vergeltung',    ic: 'r_dornen',   max: 2, desc: 'Greift dich ein Monster mit seiner Fähigkeit an, erleidet es 2 Schaden.' },
  pluender: { name: 'Plünderer',     ic: 'chest',      max: 1, desc: 'Truhen und Kobolde geben 50 % mehr Gold.' },
  zweit:    { name: 'Zweiter Wind',  ic: 'r_kelch',    max: 1, desc: 'Jeder Stufenaufstieg heilt dich vollständig.' },
  spreng:   { name: 'Sprengmeister', ic: 'bomb',       max: 1, desc: 'Entschärfte Bomben geben 8 Gold. Explosionen verletzen dich nicht.' },
  giftfest: { name: 'Giftfest',      ic: 'antidote',   max: 1, desc: 'Gift und Fallen können dir nichts mehr.' }
};
const PERK_IDS = Object.keys(PERKS);

/* ---------- Relikte ---------- */
const RELICS = {
  vampir:    { name: 'Vampirzahn',       desc: 'Jeder Sieg heilt 1 Leben.' },
  phoenix:   { name: 'Phönixfeder',      desc: 'Einmal pro Lauf: Statt zu sterben, stehst du mit 8 Leben wieder auf.' },
  schleif:   { name: 'Schleifstein',     desc: 'Neue Waffen haben +2 Stärke.' },
  kraeuter:  { name: 'Kräuterbeutel',    desc: 'Tränke heilen 3 Leben mehr.' },
  eisen:     { name: 'Eisenhaut',        desc: '+5 maximale Leben, sofort geheilt.' },
  dornen:    { name: 'Dornenpanzer',     desc: 'Zu Beginn jeder Welt +6 Rüstung, jetzt sofort auch.' },
  midas:     { name: 'Midas-Ring',       desc: 'Goldkarten sind 50 % mehr wert.' },
  horn:      { name: 'Kriegshorn',       desc: 'Deine Heldenfähigkeit lädt doppelt so schnell.' },
  stiefel:   { name: 'Giftstiefel',      desc: 'Immun gegen Gift und Fallen.' },
  glueck:    { name: 'Glücksmünze',      desc: '+15 % Chance auf kritische Treffer.' },
  auge:      { name: 'Adlerauge',        desc: 'Du erkennst Mimics, und Truhen geben mehr Gold.' },
  kanone:    { name: 'Glaskanone',       desc: 'Waffen +4 Stärke, aber −4 maximale Leben.' },
  feuerfest: { name: 'Feuerfest',        desc: 'Explosionen und Drachenfeuer verletzen dich nicht.' },
  feilscher: { name: 'Feilscher-Siegel', desc: 'Händler verlangen 40 % weniger.' },
  titan:     { name: 'Titanenherz',      desc: 'Jeder Bosssieg: +4 maximale Leben und volle Heilung.' },
  kugel:     { name: 'Kristallkugel',    desc: 'Du siehst 2 Karten weiter voraus.' },
  laterne:   { name: 'Seelenlaterne',    desc: 'Geister verblassen doppelt so schnell, Wiedergänger bleiben liegen.' },
  kelch:     { name: 'Blutkelch',        desc: 'Jeder Stufenaufstieg heilt dich vollständig.' },
  karte:     { name: 'Schatzkarte',      desc: 'Nach jedem geschafften Raum +8 Gold.' },
  sehne:     { name: 'Elfensehne',       desc: 'Mit jeder Waffe kannst du aus 2 Feldern Entfernung zuschlagen.' },
  beutel:    { name: 'Lederbeutel',      desc: '+2 Taschenplätze.' },
  traene:    { name: 'Tränenkristall',   desc: 'Tränke geben zusätzlich 3 Rüstung.' },
  krone:     { name: 'Gierkrone',        desc: '+60 % Gold, aber alle Monster sind 1 stärker.' },
  uhrwerk:   { name: 'Uhrwerk',          desc: 'Monster-Fähigkeiten brauchen 1 Zug länger.' },
  dornhaut:  { name: 'Dornenhaut',       desc: 'Greift dich ein Monster mit seiner Fähigkeit an, erleidet es 4 Schaden.' },
  klee:      { name: 'Vierblatt',        desc: 'Keine Mimics mehr, und Truhen enthalten öfter Relikte.' },
  amboss:    { name: 'Taschenamboss',    desc: 'Am Rastplatz darfst du zwei Dinge tun statt einem.' },
  echo:      { name: 'Echostein',        desc: 'Nach dem Einsatz ist deine Heldenfähigkeit halb wieder geladen.' },
  sporn:     { name: 'Kampfsporn',       desc: 'Jeder Sieg in einer Serie ab ×3 gibt 1 Rüstung.' },
  schaedel:  { name: 'Totenschädel',     desc: 'Monster geben 50 % mehr Erfahrung.' }
};
const RELIC_IDS = Object.keys(RELICS);

/* ---------- Aufstieg (Schwierigkeit nach dem ersten Sieg) ---------- */
const ASC = [
  'Normal.',
  'Monster sind 1 stärker.',
  'Elite-Gegner haben 25 % mehr Leben.',
  'Rastplätze heilen nur 30 %.',
  'Bosse haben 20 % mehr Leben.',
  'Du startest mit 3 Leben weniger.',
  'Händler verlangen 25 % mehr.',
  'Monster-Fähigkeiten laden 1 Zug schneller.',
  'Weniger Tränke im Kerker.',
  '20 % weniger Gold.',
  'Die Gruft wird doppelt so schnell unruhig.'
];

/* ---------- Tagesgruft-Modifikatoren ---------- */
const MODS = {
  goldrausch: { name: 'Goldrausch',    desc: 'Goldkarten sind doppelt so viel wert.' },
  pulverfass: { name: 'Pulverfass',    desc: 'Überall liegen Bomben.' },
  glaskanone: { name: 'Glasknochen',   desc: 'Waffen +3 Stärke, aber nur halbe Leben.' },
  schreine:   { name: 'Heilige Nacht', desc: 'Schreine sind dreimal so häufig.' },
  giftnebel:  { name: 'Giftnebel',     desc: 'Alle 8 Züge wirst du vergiftet.' },
  markttag:   { name: 'Markttag',      desc: 'Händler sind 30 % günstiger, Truhen häufiger.' },
  blutmond:   { name: 'Blutmond',      desc: 'Monster geben doppelte Erfahrung, sind aber 1 stärker.' }
};
const MOD_IDS = Object.keys(MODS);

/* ---------- Ziele in Kampfräumen ---------- */
const GOALS = {
  kill:     n => `Besiege ${n} Monster`,
  gold:     n => `Sammle ${n} Gold`,
  survive:  n => `Überlebe ${n} Züge`,
  key:      () => 'Finde den Schlüssel',
  hunt:     () => 'Besiege den Anführer',
  elite:    name => `Elite: ${name}`,
  treasure: () => 'Öffne die Schatztruhe',
  boss:     name => `Boss: ${name}`
};

/* ---------- Hinweise beim ersten Kontakt ---------- */
const TIPS = {
  goal:       ['Raumziel', 'Oben steht, was du hier erledigen musst. Danach erscheint die Treppe. Du darfst bleiben und weiter plündern, aber die Gruft wird mit jedem Zug unruhiger.'],
  next:       ['Vorschau', 'Oben rechts siehst du, welche Karte als Nächstes nachrückt. Neue Karten kommen am Ende der Reihe herein, die du verlässt.'],
  c_stairs:   ['Treppe', 'Tritt drauf, um den Raum zu verlassen. Danach wartet Beute und die Karte.'],
  c_armor:    ['Rüstung', 'Fängt Schaden ab, bevor du Leben verlierst. Mehrere Rüstungen stapeln sich.'],
  c_chest:    ['Truhe', 'Enthält Gold, Heilung, Ausrüstung, Gegenstände und selten ein Relikt.'],
  c_bomb:     ['Bombe', 'Zählt jeden Zug herunter. Bei 0 trifft sie alle Nachbarfelder, auch dich. Tritt drauf, um sie zu entschärfen, oder lass sie Monster sprengen.'],
  c_trap:     ['Stachelfalle', 'Kostet Leben, wenn du drauftrittst. Rüstung fängt den Schaden ab.'],
  c_shrine:   ['Schrein', 'Tritt drauf und wähle eines von drei Relikten.'],
  c_item:     ['Fundstück', 'Ein Gegenstand für deine Tasche. Unten in der Leiste antippen, um ihn zu benutzen. Das kostet keinen Zug.'],
  c_key:      ['Schlüssel', 'Heb ihn auf und bring ihn zur Schatztruhe.'],
  c_lockchest:['Schatztruhe', 'Verschlossen. Mit dem Schlüssel dieses Raums springt sie auf.'],
  m_kobold:   ['Kobold', 'Steht er am Zugende neben dir, klaut er Gold und haut 3 Züge später ab. Erwischst du ihn vorher, zahlt er doppelt zurück.'],
  m_archer:   ['Goblin-Schütze', 'Die Zahl im Abzeichen zählt herunter. Bei 0 schießt er, wenn du in seiner Reihe oder Spalte stehst. Rot markierte Felder sind in der Schusslinie.'],
  m_skull:    ['Skelett', 'Ab Welt 2 stehen Skelette einmal mit halber Stärke wieder auf. Feuer und Bomben verhindern das.'],
  m_spider:   ['Giftspinne', 'Ohne Waffe bekämpft, vergiftet sie dich 3 Züge lang.'],
  m_wisp:     ['Irrlicht', 'Explodiert beim Tod und trifft alle Nachbarn. Töte es neben anderen Monstern, dann räumt es für dich auf.'],
  m_necro:    ['Nekromant', 'Ruft alle 4 Züge ein Skelett. Je länger er lebt, desto voller wird das Feld.'],
  m_ghost:    ['Geist', 'Waffen gleiten durch ihn hindurch. Dafür verblasst er jeden Zug um 1. Warten kann sich lohnen.'],
  m_shaman:   ['Schamane', 'Stärkt jeden Zug alle Monster neben sich. Er sollte zuerst fallen.'],
  m_demon:    ['Dämon', 'Wird jeden Zug stärker, solange er neben dir steht. Halt Abstand oder schlag schnell zu.'],
  m_golem:    ['Golem', 'Waffen richten höchstens 3 Schaden an. Mit einem Hammer knackst du ihn in einem Schlag.'],
  m_ogre:     ['Oger', 'Holt alle 3 Züge zu einem schweren Schlag aus, wenn du neben ihm stehst.'],
  m_mimic:    ['Mimic', 'Manche Truhen beißen. Achte auf Truhen, die zucken.'],
  elite:      ['Elite-Gegner', 'Stark und mit zwei Eigenschaften. Besiegst du ihn, gibt es ein Relikt.'],
  w_dolch:    ['Dolch', 'Schwächer, aber oft kritisch. Kritische Treffer richten doppelten Schaden an und schonen die Waffe.'],
  w_axt:      ['Axt', 'Jeder Schlag trifft auch alle Monster neben dem Ziel mit 2 Schaden.'],
  w_hammer:   ['Hammer', 'Durchschlägt Panzer. Überlebt das Ziel, ist es 2 Züge betäubt.'],
  w_bogen:    ['Bogen', 'Tippe ein Monster 2 Felder entfernt in gerader Linie an, um zu schießen, ohne dich zu bewegen.'],
  levelup:    ['Stufenaufstieg', 'Siege geben Erfahrung. Bei jeder neuen Stufe wählst du ein Talent.']
};
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const MODE_NAME = { adv: 'Abenteuer', end: 'Endlose Gruft', daily: 'Tagesgruft' };
