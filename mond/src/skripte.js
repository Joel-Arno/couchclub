/* =====================================================================
   SKRIPTE: Hinweise, Ereignisse in der Welt und Zwischenszenen
   Ein Ereignis in einer Karte nennt sein Skript mit „skript“.
   Bosse: vor_<boss>(e) läuft vor dem Kampf, nach_<boss>(e, beute) danach.
   Gebiete: „betreten“ nennt ein Skript, das beim Betreten läuft (erst = zum ersten Mal).
   ===================================================================== */
const lies = id => new Promise(r => zeigeLore(id, r));
const erhalten = gab => { if (gab && gab.length) toast('Erhalten: ' + gab.join(', '), 3400); };
// Den Gegner nach dem Kampf noch einmal zeigen, kniend oder liegend
function gefallen(e, stance = 'kneel'){
  const A = e.actor; if (!A) return null;
  A.anim = null; A.poseFn = null; A.alpha = 1; A.glow = 0; A.stance = stance;
  A.pose = mkPose({}, SETS[A.set][stance] || SETS[A.set].idle);
  return Erk.figur(A, A.x, A.gy, A.face);
}

const SKRIPTE = {
  /* ---------- Hinweise zum Erkunden ---------- */
  h_springen(){ hinweis('Springen: der große Knopf rechts. Kurz tippen springt niedrig, halten springt hoch.', 5200); },
  h_hinterhalt(){ hinweis('Dort liegt einer im Kies. Schleich dich an und greif an, bevor er aufsteht: ein Hinterhalt trifft schwer.', 6200); },
  h_leiter(){ hinweis('An Leitern ziehst du nach oben oder unten, um zu klettern.', 4600); },
  h_wand(){ hinweis('Der Fels klingt hier hohl. Ein Angriff dagegen könnte ihn öffnen.', 5200); },
  h_schleichen(){ hinweis('Gegner sehen nur nach vorn. Wenig ziehen heißt leise gehen. Von hinten bemerken sie dich kaum.', 6200); },
  h_steg(){ hinweis('Durch einen Steg fällst du, wenn du nach unten ziehst und springst.', 5200); },
  h_wasser(){ hinweis('Tiefes Wasser zieht dich hinab. Bleib, wo du Grund unter den Füßen hast.', 5200); },
  h_rolle(){ hinweis('Die Rolle trägt dich schnell ein Stück voran. Auch in der Welt.', 4200); },
  h_glut(){ hinweis('Glut von Gegnern trägst du bei dir. An einem Leuchtfeuer machst du sie zu Stärke.', 5200); },
  h_gitter_gasse(){ hinweis('Ein Gitter versperrt die Gasse. Der Hebel dafür muss irgendwo oben auf den Dächern sein.', 5200); },
  h_schacht(){ hinweis('Ein Schacht führt hinauf ins Licht. Von unten verschlossen, noch.', 4200); },

  /* ---------- Die Strandung ---------- */
  kiesstrand_betreten(erst){
    if (erst) return;
    if (D.bosse.vogt && !D.merker.strand_nach_vogt){ D.merker.strand_nach_vogt = true; hinweis('Der Strand ist stiller geworden, seit der Vogt nicht mehr nachts mit seiner Laterne umhergeht.', 5200); }
  },
  wrack_betreten(erst){
    if (erst) setTimeout(() => { if (modus === 'welt') hinweis('Im Bauch des großen Wracks brennt ein schwaches Licht.', 4200); }, 1800);
  },
  async bucht_ankunft(){
    await szene([
      'Hinter dem Fels öffnet sich eine Grotte. Das Wasser ist hier glatt wie Glas, und am Grund glimmt etwas Bläuliches.',
      'Weiter hinten steht jemand. Eine Rüstung, reglos, das Schwert vor sich auf den Boden gestützt, als hielte sie noch immer Wache.'
    ]);
  },
  async leuchtturm_ankunft(){
    await szene([
      'Am Ende des Strandes steht ein Leuchtturm ohne Licht. Unten, in einer eisernen Schale, glimmt noch Glut.',
      'Neben der Schale sitzt eine Frau in einem langen Mantel, eine Laterne auf den Knien. Sie sieht dir entgegen, als hätte sie dich erwartet.'
    ]);
  },
  lampenraum(){ hinweis('Die Tür zur Lampe ist verschlossen. Das Schloss ist groß und schwer, ein Wärterschloss.', 4600); },
  async vogt_silhouette(e){
    const x = e.x + T * 20, gy = bodenUnter(Erk.gebiet(), x, e.y - T * 4);
    const V = Erk.figur('vogt', x, gy, -1);
    Snd.play('danger');
    await szene([
      async () => { World.focus(x - T * 3, gy - 90, 1.1, .002); Snd.play('thunder'); World.flash('rgba(220,230,255,1)', .5); await warte(1600); },
      'Weit draußen, am Ende der Mole, steht eine Gestalt im Regen. Riesig, gebeugt. An einem Haken über ihrer Schulter hängt eine Laterne.',
      'Sie hebt die Laterne, als suchte sie etwas. Dann dreht sie sich zu dir um.',
      async () => { Snd.play('thunder'); World.flash('rgba(220,230,255,1)', .6); V.weg = true; await warte(1300); },
      'Als der Blitz verlischt, ist sie fort. Nur der Nebel ist noch da, und das Läuten, lauter als zuvor.'
    ]);
  },
  async nebel_ankunft(){
    await szene([
      'Am Ende der Mole steht der Nebel wie eine Wand.',
      'Das Läuten ist hier lauter. Und dahinter hörst du noch etwas anderes: Eisen, das über Stein schleift.'
    ]);
  },
  async vor_vogt(e){
    Erk.setzeSpieler(Erk.S.x + 20, Erk.S.y, 1);
    World.focus(e.x - 40, e.y - 110, 1.0, .002);
    await warte(900);
    Snd.play('danger'); World.shake(6);
    await warte(900);
    await zeile('Der Strandvogt', 'Da bist du ja. Ich habe dein Licht schon vom Leuchtturm aus gesehen. So hell. So lange habe ich darauf gewartet.', { rede: true });
    show('dialog'); $('#dText').textContent = ''; $('#dWer').textContent = ''; $('#dWeiter').hidden = true;
  },
  async nach_vogt(e, gab){
    const V = gefallen(e, 'kneel');
    await szene([
      'Der Strandvogt sinkt auf die Knie. Die Laterne rutscht vom Haken und rollt über die Steine, bis sie am Rand der Mole liegen bleibt.',
      ['Der Strandvogt', 'Einunddreißig Jahre … habe ich das Licht gehalten. Und dann habe ich es verkauft. Für ein anderes Licht.'],
      ['Der Strandvogt', 'Sie wird dich finden. Die Mutter findet alle, die leuchten.'],
      async () => { V.weg = true; World.burst(V.x, V.gy - 40, 'mist', 30); Snd.play('fire'); await warte(1400); },
      'Er zerfällt zu nassem Sand. Wo der Nebel war, ist jetzt nur noch Wasser, flach und grau. Am Ufer entlang führt ein Pfad aus weißem Salz ins Land hinein.'
    ], { bleiben: true });
    erhalten(gab);
    await lies('erinnerung_vogt');
    hinweis('Neben dem Vogt liegt ein Buch, schwer vom Wasser.', 4200);
    Erk.neu('b');
  },

  /* ---------- Die Salzmarsch ---------- */
  async salzpfad_ankunft(){
    await szene([
      'Der Pfad ist aus Salz, hart wie Stein und weiß wie Knochen. Links und rechts liegt die Marsch: flaches Wasser, Schilf, tote Bäume.',
      'Auf dem Pfad stehen Gestalten mit Stangen in den Händen. Sie haben sich lange nicht bewegt.'
    ]);
  },
  async pfahldorf_ankunft(){
    await szene([
      'Ein Dorf auf Pfählen, halb im Wasser versunken. Die meisten Häuser sind leer. In einem brennt Licht.',
      'Auf dem Steg sitzt eine Frau in einem Anzug aus geöltem Leder und flickt ein Netz. Neben ihr glimmt eine Feuerschale.'
    ]);
  },
  async grube_ankunft(){
    await szene([
      'Der Schacht fällt ab in eine Grube aus weißem Kristall. Die Wände glitzern, als hätte jemand die Sterne hier unten eingesperrt.',
      'Von tief unten steigt ein Summen herauf. Ein Lied, das du fast kennst.'
    ]);
  },
  async vor_hexe(e){
    World.focus(e.x - 30, e.y - 90, 1.1, .002);
    await warte(1000);
    await zeile('', 'In der Mitte der Grube steht eine Gestalt, gebeugt über einen Stab. Ihr Haar ist steif vor Salz. Um sie herum sitzen Menschen im Kreis, weiß und reglos, als hörten sie zu.');
    await zeile('Die Salzhexe', 'Pscht. Sie schlafen. Du weckst sie auf mit deinem Licht, siehst du das nicht?', { rede: true });
    show('dialog'); $('#dText').textContent = ''; $('#dWer').textContent = ''; $('#dWeiter').hidden = true;
  },
  async nach_hexe(e, gab){
    const W2 = gefallen(e, 'kneel');
    await szene([
      ['Die Salzhexe', 'Wenn ich … nicht mehr singe … holt sie das Meer. Alle. Joss. Hark. Die Kinder.'],
      'Das Lied hört mitten im Takt auf. Die weißen Gestalten im Kreis zerfallen, eine nach der anderen, zu feinem Staub, als hätten sie nur auf die Stille gewartet.',
      async () => { W2.weg = true; World.burst(W2.x, W2.gy - 40, 'salz', 50); await warte(1200); },
      'Wo sie stand, liegt eine Perle, glatt und kühl wie eine Träne.'
    ], { bleiben: true });
    erhalten(gab);
    await lies('erinnerung_hexe');
  },
  async bruecke_einsturz(e){
    const G = Erk.gebiet(), von = e.def.von, bis = e.def.bis;
    Erk.setAus(true);
    Snd.play('bruch'); World.shake(6);
    hinweis('Der Stein unter dir knirscht.', 1800);
    await warte(900);
    Snd.play('bruch'); Snd.play('danger'); World.shake(16);
    const B = G.F.brueche.filter(b => b.tx >= von && b.tx <= bis);
    B.forEach(b => { D.bruch[Erk.key(b.tx + ',' + b.ty0)] = true; for (let y = b.ty0; y < b.ty1; y++) setzeKachel(G, b.tx, y, K.luft); World.burst(b.x + T / 2, b.y0 + T, 'staub', 8); });
    baueFormen(G);
    Erk.setAus(false);
    speichern();
    setTimeout(() => { if (modus === 'welt') hinweis('Die Brücke ist eingestürzt. Unten im Flussbett geht es weiter, bis zur anderen Seite.', 5200); }, 1600);
  },
  async bruecke_ankunft(){
    await szene([
      'Eine Brücke aus Stein führt über dunkles Wasser. Am anderen Ende, im Nebel, stehen Türme. Velmora.',
      'Am Anfang der Brücke lehnt ein Ritter am Geländer und sieht dir entgegen.'
    ]);
  },

  /* ---------- Velmora ---------- */
  async velmora_ankunft(){
    await szene([
      'Das Tor von Velmora steht halb unter Wasser. Über dem Bogen hängt eine Glocke ohne Klöppel.',
      'Davor wacht ein Riese in einer Rüstung aus Glockenbronze. Er hebt den Schild, als du näherkommst.'
    ]);
  },
  async hafen_ankunft(){
    await szene([
      'Im Hafen liegen Schiffe übereinander, wie von einer Riesenhand zusammengeschoben. Zwischen den Masten hängen Seile, gespannt wie Netze.',
      'Irgendwo in den Tauen bewegt sich etwas Großes. Es hat zu viele Beine.'
    ]);
  },
  async vor_spinne(e){
    World.focus(e.x - 30, e.y - 120, .95, .002);
    Snd.play('danger');
    await warte(700);
    await zeile('', 'Aus den Tauen senkt sich etwas herab. Seine Beine waren einmal Ruder, sein Leib der Rumpf eines Bootes. In seinem Netz hängt eine kleine Glocke und läutet.');
    show('dialog'); $('#dText').textContent = ''; $('#dWeiter').hidden = true;
  },
  async nach_spinne(e, gab){
    await szene([
      'Die Wrackspinne fällt in sich zusammen, ein Haufen aus Planken und Tau. Die kleine Glocke in ihrem Netz läutet noch einmal, dann schweigt sie.',
      'Zwischen den Trümmern liegt Glockenerz, das sie gesammelt hat wie andere Tiere Knochen.'
    ], { bleiben: true });
    erhalten(gab);
    await lies('erinnerung_spinne');
  },
  async becken_ankunft(){
    await szene([
      'Das Hafenbecken ist leergelaufen. Algen hängen von den Mauern, und am Grund liegen Anker, Ketten, Knochen.',
      'In der Mitte des Beckens steht ein Taucher im Messinghelm. Er dreht sich langsam um sich selbst, als suchte er den Weg nach oben.'
    ]);
  },
  async vor_taucher(e){
    World.focus(e.x - 30, e.y - 100, 1.1, .002);
    await warte(900);
    await zeile('', 'Hinter dem Glas seines Helms ist Wasser. Kein Gesicht, nur Wasser, und darin zwei grüne Punkte.');
    show('dialog'); $('#dText').textContent = ''; $('#dWeiter').hidden = true;
  },
  async nach_taucher(e, gab){
    const J = gefallen(e, 'kneel');
    await szene([
      ['Jonte', 'Sag ihr … sag ihr, die Stufen gehen weiter. Sag ihr nicht … wie ich aussehe.'],
      async () => { J.weg = true; World.burst(J.x, J.gy - 40, 'splash', 30); await warte(1200); },
      'Der Helm rollt dir vor die Füße. In den Rand ist ein Name geritzt: Jonte.'
    ], { bleiben: true });
    erhalten(gab);
    await lies('erinnerung_jonte');
  },
  kapelle_ankunft(erst){
    if (erst) setTimeout(() => { if (modus === 'welt') hinweis('Die Kapelle ist geschmückt, als sollte heute geheiratet werden. Die Girlanden sind schwarz vor Alter.', 5200); }, 1400);
  },
  turm_ankunft(erst){
    if (erst && !D.bosse.isolde) setTimeout(() => { if (modus === 'welt') hinweis('Von oben hörst du eine Glocke. Nicht die, die nur du hörst. Eine andere, tiefere.', 5200); }, 1400);
  },
  async vor_isolde(e){
    World.focus(e.x - 20, e.y - 120, 1.0, .002);
    World.bell(.4);
    await warte(1200);
    await zeile('', 'Oben im Turm hängt eine Glocke, so groß wie ein Haus. Darunter, an der Brüstung, steht eine Frau in einem Brautkleid. Wasser tropft von ihrem Schleier.');
    await zeile('', 'In der Hand hält sie eine zweite Glocke, kleiner, an einer Kette. Sie dreht sich nicht um.');
    Snd.bell(98, .25, 5, .85);
    show('dialog'); $('#dText').textContent = ''; $('#dWeiter').hidden = true;
  },
  async nach_isolde(e, gab){
    const I = gefallen(e, 'kneel');
    World.bell(0);
    await szene([
      async () => { World.focus(I.x - 40, I.gy - 70, 1.35, .003); await warte(900); },
      'Isolde sinkt auf die Knie. Ihr Schleier gleitet zur Seite, und darunter ist ein Gesicht, jung und sehr müde.',
      ['Isolde', 'Er kommt nicht, oder?'],
      'Sie sieht dich an, und zum ersten Mal scheint sie dich wirklich zu sehen.',
      ['Isolde', 'Dann nimm du es. Ich habe lange genug gewartet.'],
      async () => { World.burst(I.x, I.gy - 60, 'heal', 40); World.flash('rgba(210,225,255,1)', .45); Snd.play('heart'); await warte(1100); },
      'Aus ihrer Brust löst sich ein Splitter, hell wie Mondlicht. Er schwebt zu dir herüber, und die Glocke, die nur du hörst, schlägt einmal, laut.'
    ], { bleiben: true });
    erhalten(gab);
    await lies('erinnerung_isolde');
    // Kalden kommt die Treppe herauf
    const Kd = Erk.neu('k');
    Snd.play('tuer');
    await szene([
      async () => { World.focus((I.x + Erk.S.x) / 2, I.gy - 70, 1.15, .003); await warte(900); },
      'Schritte auf der Treppe. Langsam, schwer, in Rüstung.',
      D.merker.portrait || D.merker.kalden_erkannt ? 'Ser Kalden tritt aus dem Treppenhaus. Er sieht dich nicht an. Er sieht nur sie.' : 'Ser Kalden tritt aus dem Treppenhaus. Er sieht dich nicht an. Er sieht nur sie, und plötzlich weißt du, wen sie dreihundert Jahre lang erwartet hat.',
      ['Ser Kalden', 'Isolde.'],
      ['Isolde', '… Kalden? Du bist … alt geworden.'],
      ['Ser Kalden', 'Ich weiß. Ich bin gekommen. Dreihundert Jahre zu spät, aber ich bin gekommen.'],
      ['Isolde', 'Die Glocke hat so lange geläutet. Hast du sie nicht gehört?'],
      ['Ser Kalden', 'Jeden Tag.'],
      async () => { I.weg = true; World.burst(I.x, I.gy - 50, 'mist', 40); await warte(1600); },
      'Sie lächelt. Dann ist sie Wasser, und das Wasser läuft über die Steine davon, durch die Bögen, hinaus zum Meer.',
      async () => { World.focus((Kd ? Kd.x : I.x) + 30, I.gy - 70, 1.3, .003); await warte(700); },
      ['Ser Kalden', 'Der Splitter. Die Kronwacht würde viel dafür geben. Ich auch. Nicht für die Krone. Für sie. Damit er nicht noch jemanden frisst.']
    ], { bleiben: true });
    const w = await wahl('Ser Kalden · Der Eidlose', 'Gibst du ihm den Splitter?', [
      { t: 'Gib ihm den Splitter', sub: 'Er bringt ihn nach Grauhall, zur Kronwacht', v: 'geben' },
      { t: 'Behalte den Splitter', sub: 'Er bleibt bei dir. Die Glocke in dir schlägt schneller.', v: 'behalten' }
    ], { rede: false });
    if (w === 'geben'){
      D.merker.splitter_kalden = true;
      if (anzahl('splitter_isolde')) D.items.splitter_isolde--;
      const g2 = geben({ tal: 'brautring' });
      await szene([
        ['Ser Kalden', 'Danke.'],
        'Er schließt die Hand um den Splitter, und für einen Moment leuchten seine Finger von innen, wie eine Laterne.',
        ['Ser Kalden', 'Nimm das. Ich habe ihn dreihundert Jahre bei mir getragen. Er gehörte an ihren Finger, nicht an meinen.'],
        async () => { erhalten(g2); await warte(800); }
      ], { bleiben: true });
    } else {
      D.merker.splitter_behalten = true;
      await szene([
        'Kalden sieht dich lange an. Dann nickt er, ganz langsam.',
        ['Ser Kalden', 'Wie du willst. Aber er wird dich fressen, wie er sie gefressen hat. Nicht heute. Nicht morgen. Aber er wird.']
      ], { bleiben: true });
    }
    D.merker.kalden_turm = true;
    if (Kd) Kd.weg = true;
    Snd.bell(98, .3, 6, .85);
    World.bell(.8);
    await szene([
      async () => { World.focus(Erk.S.x, Erk.S.y - 160, .85, .0015); World.shake(10); await warte(1400); },
      'Über dir beginnt die große Glocke zu schwingen. Ein Schlag. Dann nichts mehr.',
      async () => { World.bell(0); World.setFlood(4, Erk.S.y + T * 30); await warte(1400); },
      'Irgendwo draußen hebt sich das Wasser. Es steigt nicht schnell. Aber es steigt.'
    ], { bleiben: true });
    speichern();
    akt1Ende();
  }
};
