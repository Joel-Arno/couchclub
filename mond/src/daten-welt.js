/* =====================================================================
   DATEN: Welt von Akt I – Regionen, Orte, Figuren, Gespräche
   Orte sind über „nach“ verbunden (in beide Richtungen). Ein Ort mit
   Kampf muss geräumt sein, bevor man tiefer hineingeht; zurück geht immer.
   Beim Rasten kehren alle normalen Gegner zurück, Bosse nicht.
   ===================================================================== */
const REGIONEN = {
  strandung: { name: 'Die Strandung' },
  marsch: { name: 'Die Salzmarsch' },
  velmora: { name: 'Velmora' }
};

const ORTE = {
  /* ---------- Die Strandung ---------- */
  kiesstrand: {
    region: 'strandung', name: 'Kiesstrand', welt: 'strand', pos: [.22, .9], nach: ['wrackfeld'],
    leer: 'Der Kies ist noch nass von der Flut, die dich ausgespuckt hat. Im Wasser treiben Planken, Seile, eine Kiste ohne Deckel. Nichts davon gehört dir.'
  },
  wrackfeld: {
    region: 'strandung', name: 'Wrackfeld', welt: 'strand', pos: [.45, .74], nach: ['feuer_strand', 'bucht'],
    kampf: ['ertrunkener', 'ertrunkener'], liegend: true,
    text: ['Zwischen den Wrackteilen bewegt sich etwas. Ein Mensch, oder was die Flut von einem übrig gelassen hat.', 'Wasser läuft ihm aus dem Mund, als es sich zu dir dreht.'],
    wieder: 'Die Ertrunkenen stehen wieder zwischen den Wrackteilen. Die Flut gibt her, was sie nimmt, immer wieder.',
    leer: 'Zwischen den Rippen des Schiffes ist es still geworden. Die Flut leckt an den Planken, als suchte sie etwas.',
    aktionen: [
      { id: 'treibholz', t: 'Zwischen den Planken suchen', text: 'Unter einer Planke klemmt ein Schild aus Treibholz, mit Eisen beschlagen. Schwer, aber besser als nichts.', gibt: { schild: 'treibholz' } }
    ]
  },
  bucht: {
    region: 'strandung', name: 'Stille Bucht', welt: 'bucht', pos: [.82, .8], nach: [],
    kampf: ['krabbe', 'krabbe'],
    text: ['Hinter einem Felsen öffnet sich eine kleine Bucht. Das Wasser ist hier glatt wie Glas, und am Grund glimmt etwas Bläuliches.', 'Zwischen den Steinen klackern Scheren. Die Krabben hier sind groß wie Hunde, ihre Panzer von Salz verkrustet.'],
    wieder: 'Zwischen den Steinen klackern wieder Scheren.',
    leer: 'Die Bucht liegt still. Am Grund glimmt es noch immer.',
    aktionen: [
      { id: 'mondtau1', t: 'Ins Wasser greifen', text: 'Deine Finger schließen sich um einen Kristall, kalt wie Mondlicht. Mondtau. Am Leuchtfeuer wird daraus eine weitere Phiole.', gibt: { item: 'mondtau' } },
      { id: 'erz_bucht', t: 'Die Felsspalte absuchen', text: 'In einer Spalte steckt ein Klumpen grünlichen Metalls. Glockenerz. An einem Amboss lässt sich damit eine Waffe schärfen.', gibt: { item: 'glockenerz' } }
    ]
  },
  feuer_strand: {
    region: 'strandung', name: 'Leuchtturm', welt: 'feuer', pos: [.32, .54], nach: ['kettentor'],
    feuer: 'Leuchtfeuer am Strand',
    text: ['Am Ende des Strandes steht ein Leuchtturm ohne Licht. Unten, in einer eisernen Schale, glimmt noch Glut.', 'Neben der Schale sitzt eine Frau in einem langen Mantel, eine Laterne auf den Knien. Sie sieht dir entgegen, als hätte sie dich erwartet.'],
    leer: 'Die Flamme brennt ruhig am Fuß des Leuchtturms.',
    npc: [{ id: 'enna', wenn: D => !D.merker.isolde }]
  },
  kettentor: {
    region: 'strandung', name: 'Kettentor', welt: 'tor', pos: [.58, .38], nach: ['mole'],
    kampf: ['knecht'],
    text: ['Der Pfad führt die Klippe hinauf zu einem Tor aus rostigen Ketten.', 'Davor steht ein Wächter mit einem Helm wie ein Eimer. In seiner Faust hängt eine eiserne Kugel an einer Kette. Er sagt nichts. Er wartet.'],
    wieder: 'Der Wächter steht wieder vor dem Tor, als wäre nichts gewesen.',
    leer: 'Das Tor aus Ketten steht offen. Der Wind lässt die Glieder aneinanderschlagen, wie ein schlecht gestimmtes Glockenspiel.'
  },
  mole: {
    region: 'strandung', name: 'Mole', welt: 'mole', pos: [.38, .22], nach: ['nebel'],
    feuer: 'Leuchtfeuer an der Mole', amboss: true,
    text: ['Eine steinerne Mole führt hinaus aufs Meer. Am Weg steht eine Feuerschale voller Asche. Du hältst die Hand darüber, und die Asche beginnt zu glühen.', 'Daneben steht ein Amboss, verrostet, aber heil. Jemand hat hier einmal Waffen gepflegt.'],
    leer: 'Die Feuerschale an der Mole glüht. Der Amboss wartet.'
  },
  nebel: {
    region: 'strandung', name: 'Ende der Mole', welt: 'nebel', pos: [.62, .08], nach: ['salzpfad'],
    boss: 'vogt', arena: 'arena',
    text: ['Am Ende der Mole steht der Nebel wie eine Wand.', 'Das Läuten ist hier lauter. Und dahinter hörst du noch etwas anderes: Eisen, das über Stein schleift.'],
    nachBoss: ['Der Strandvogt sinkt ins flache Wasser. Seine Laterne erlischt als Letztes.', 'Wo der Nebel war, ist jetzt nur noch Wasser, flach und grau. Am Ufer entlang führt ein Pfad aus weißem Salz ins Land hinein.'],
    leer: 'Wo der Strandvogt stand, schwappt flaches Wasser über die Steine. Landeinwärts schimmert der Salzpfad.',
    beute: { item: 'nachhall_vogt' }
  },

  /* ---------- Die Salzmarsch ---------- */
  salzpfad: {
    region: 'marsch', name: 'Salzpfad', welt: 'marsch', pos: [.5, .9], nach: ['pfahldorf', 'schilf'],
    sperre: { wenn: D => D.bosse.vogt, text: 'Der Nebel am Ende der Mole versperrt den Weg.' },
    kampf: ['ertrunkener', 'pfahl'], scale: 1.2,
    text: ['Der Pfad ist aus Salz, hart wie Stein und weiß wie Knochen. Links und rechts liegt die Marsch: flaches Wasser, Schilf, tote Bäume.', 'Auf dem Pfad stehen Gestalten mit Stangen in den Händen. Sie haben sich lange nicht bewegt. Jetzt bewegen sie sich.'],
    wieder: 'Auf dem Salzpfad stehen wieder Gestalten, reglos, bis du näherkommst.',
    leer: 'Der Salzpfad liegt weiß und leer vor dir.'
  },
  schilf: {
    region: 'marsch', name: 'Schilfmeer', welt: 'marsch', pos: [.15, .72], nach: [],
    kampf: ['krabbe', 'krabbe', 'krabbe'], scale: 1.25,
    text: ['Das Schilf steht höher als du. Es raschelt, obwohl kein Wind geht.', 'Dann klicken Scheren.'],
    wieder: 'Im Schilf klicken wieder Scheren.',
    leer: 'Im Schilf ist es still. Nur das Wasser gluckst.',
    aktionen: [
      { id: 'salzamulett', t: 'Den Reiher im Schilf untersuchen', text: 'Ein toter Reiher, das Gefieder weiß vor Salz. Um seinen Hals hängt ein Amulett aus Salzkristall. Jemand hat es ihm umgebunden, vor langer Zeit.', gibt: { tal: 'salzamulett' } },
      { id: 'erz_schilf', t: 'Im Schlamm graben', text: 'Unter dem Schlamm liegt ein Klumpen Glockenerz, rund gewaschen vom Wasser.', gibt: { item: 'glockenerz' } }
    ]
  },
  pfahldorf: {
    region: 'marsch', name: 'Pfahldorf', welt: 'pfahldorf', pos: [.55, .62], nach: ['salzgrube', 'ufer'],
    feuer: 'Leuchtfeuer im Pfahldorf',
    text: ['Ein Dorf auf Pfählen, halb im Wasser versunken. Die meisten Häuser sind leer. In einem brennt Licht.', 'Auf dem Steg davor sitzt eine Frau in einem Anzug aus geöltem Leder und flickt ein Netz. Neben ihr glimmt eine Feuerschale.'],
    leer: 'Das Pfahldorf knarrt im Wind. Die Feuerschale am Steg glimmt.',
    npc: [{ id: 'mira', wenn: D => !D.merker.velmora || !D.merker.mira1 }]
  },
  salzgrube: {
    region: 'marsch', name: 'Salzgrube', welt: 'grube', pos: [.86, .44], nach: [],
    boss: 'hexe', arena: 'grube',
    text: ['Der Boden fällt ab in eine Grube aus weißem Kristall. Die Wände glitzern, als hätte jemand die Sterne hier unten eingesperrt.', 'In der Mitte steht eine Gestalt, gebeugt über einen Stab. Ihr Haar ist steif vor Salz. Sie summt ein Lied, das du fast kennst.'],
    nachBoss: ['Die Salzhexe zerfällt zu Staub, weiß und fein. Das Lied hört mitten im Takt auf.', 'Wo sie stand, liegt eine Perle, glatt und kühl, und daneben zwei Klumpen Glockenerz.'],
    leer: 'Die Salzgrube ist still. Die Kristalle glitzern weiter, für niemanden.',
    beute: { tal: 'traenenperle', item: ['glockenerz', 2] }
  },
  ufer: {
    region: 'marsch', name: 'Totes Ufer', welt: 'marsch', pos: [.3, .4], nach: ['bruecke'],
    kampf: ['pfahl', 'pfahl'], scale: 1.25,
    text: ['Am Ufer liegen Boote kieloben, wie Tiere, die sich zum Sterben hingelegt haben.', 'Zwischen ihnen gehen Pfahlgänger auf und ab. Sie bewachen etwas.'],
    wieder: 'Zwischen den Booten gehen wieder Pfahlgänger auf und ab.',
    leer: 'Die Boote liegen still. Das Wasser leckt an ihren Kielen.',
    aktionen: [
      { id: 'entermesser', t: 'Unter dem größten Boot nachsehen', text: 'Unter dem Boot liegt ein Seemann, der schon lange nicht mehr atmet. In seiner Hand ein Entermesser, krumm und scharf. Er braucht es nicht mehr.', gibt: { waffe: 'entermesser' } },
      { id: 'mondtau2', t: 'Die Laterne am Bootshaus ansehen', text: 'In der Laterne brennt keine Kerze. Darin liegt ein Kristall aus Mondtau, als hätte ihn jemand hier aufbewahrt, für schlechte Zeiten.', gibt: { item: 'mondtau' } }
    ]
  },
  bruecke: {
    region: 'marsch', name: 'Nebelbrücke', welt: 'bruecke', pos: [.52, .12], nach: ['stadttor'],
    kampf: ['pfahl', 'knecht'], scale: 1.3,
    text: ['Eine Brücke aus Stein führt über dunkles Wasser. Am anderen Ende, im Nebel, stehen Türme. Velmora.', 'Auf der Brücke warten Gestalten. Weiter hinten lehnt ein Ritter am Geländer und sieht zu, wie sie auf dich zukommen.'],
    wieder: 'Auf der Brücke warten wieder Gestalten.',
    leer: 'Auf der Brücke ist es still. Der Nebel hängt über Velmora.',
    npc: [{ id: 'kalden', wenn: D => !D.merker.kalden1 }]
  },

  /* ---------- Velmora ---------- */
  stadttor: {
    region: 'velmora', name: 'Stadttor', welt: 'velmora', pos: [.5, .9], nach: ['gassen', 'feuer_velmora'],
    kampf: ['waechter'], scale: 1.35,
    text: ['Das Tor von Velmora steht halb unter Wasser. Über dem Bogen hängt eine Glocke ohne Klöppel.', 'Davor wacht ein Riese in einer Rüstung aus Glockenbronze. Er hebt den Schild, als du näherkommst.'],
    wieder: 'Der Glockenwächter steht wieder vor dem Tor.',
    leer: 'Das Tor steht offen. Die Glocke darüber schweigt.'
  },
  gassen: {
    region: 'velmora', name: 'Überflutete Gassen', welt: 'velmora', pos: [.2, .72], nach: ['kapelle'],
    kampf: ['jungfer', 'ertrunkener', 'jungfer'], scale: 1.4,
    text: ['Die Gassen von Velmora stehen knietief im Wasser. Blütenblätter treiben darauf, weiß und verfault.', 'Aus den Hauseingängen treten Frauen in Brautkleidern, die Schleier nass und schwer. Sie tanzen, bevor sie angreifen.'],
    wieder: 'In den Gassen tanzen wieder die Brautjungfern.',
    leer: 'Die Gassen sind still. Die Blütenblätter treiben weiter.',
    aktionen: [
      { id: 'ehering', t: 'Das Haus mit dem blauen Tor betreten', text: 'Auf einem Tisch stehen zwei Gläser, eines umgekippt. Daneben liegt ein Ring, rostig, mit einer Gravur: „für immer“.', gibt: { tal: 'ehering' } },
      { id: 'schild_gassen', t: 'Den gefallenen Wächter durchsuchen', text: 'Im Wasser liegt ein Glockenwächter, der seinen letzten Kampf verloren hat. Sein Schild ist aus Glockenbronze und dröhnt leise, als du ihn aufhebst.', gibt: { schild: 'glockenschild' } }
    ]
  },
  feuer_velmora: {
    region: 'velmora', name: 'Brunnenplatz', welt: 'brunnen', pos: [.62, .62], nach: ['hafen', 'kapelle'],
    feuer: 'Leuchtfeuer am Brunnen', amboss: true,
    text: ['Mitten auf dem Platz steht ein Brunnen, und in seiner Schale glimmt Glut, obwohl Wasser darüber läuft.', 'Daneben steht ein Amboss aus Glockenbronze. Hier haben die Glockengießer von Velmora gearbeitet.'],
    leer: 'Die Glut im Brunnen glimmt unter dem Wasser.',
    npc: [
      { id: 'kalden', wenn: D => D.merker.isolde && D.merker.kalden1 && !D.merker.kalden3 },
      { id: 'mira', wenn: D => D.merker.velmora && D.merker.mira1 }
    ]
  },
  hafen: {
    region: 'velmora', name: 'Hafen', welt: 'hafen', pos: [.9, .44], nach: [],
    boss: 'spinne', arena: 'hafen',
    text: ['Im Hafen liegen Schiffe übereinander, wie von einer Riesenhand zusammengeschoben. Zwischen den Masten hängen Seile, gespannt wie Netze.', 'Etwas Großes bewegt sich in den Tauen. Es hat zu viele Beine, und jedes davon war einmal ein Ruder.'],
    nachBoss: ['Die Wrackspinne fällt in sich zusammen, ein Haufen aus Planken und Tau.', 'Zwischen den Trümmern liegt ein Taucherhelm aus Messing, verbeult, und daneben Glockenerz, das die Spinne gesammelt hat wie andere Tiere Knochen.'],
    leer: 'Im Hafen knarren die Schiffe. Die Taue hängen schlaff.',
    beute: { item: [['helm', 1], ['glockenerz', 2]] }
  },
  kapelle: {
    region: 'velmora', name: 'Brautkapelle', welt: 'kapelle', pos: [.35, .34], nach: ['turmtreppe'],
    kampf: ['jungfer', 'jungfer', 'waechter'], scale: 1.5,
    text: ['Die Kapelle ist geschmückt, als sollte heute geheiratet werden. Die Girlanden sind schwarz vor Alter, die Kerzen nur noch Stümpfe.', 'Vor dem Altar warten Brautjungfern. Und ein Glockenwächter, der die Tür zur Treppe bewacht.'],
    wieder: 'Vor dem Altar warten wieder die Brautjungfern.',
    leer: 'Die Kapelle ist leer. Auf dem Altar liegt ein Brief.',
    aktionen: [
      { id: 'brief', t: 'Den Brief auf dem Altar lesen', text: '„Meine Isolde. Wenn die Glocke läutet, komme ich. Warte auf mich, und wenn es hundert Jahre dauert. Dein …“ Der Name ist herausgerissen. Jemand hat das Papier so oft gefaltet, dass es an den Knicken durchscheint.', wiederholbar: true },
      { id: 'glockenzunge', t: 'Unter der Altarglocke nachsehen', text: 'Die Glocke über dem Altar hat keinen Klöppel mehr. Er liegt darunter auf dem Boden, als hätte ihn jemand herausgerissen, damit sie nie wieder läutet. Du nimmst ihn mit.', gibt: { tal: 'glockenzunge' } }
    ]
  },
  turmtreppe: {
    region: 'velmora', name: 'Turmtreppe', welt: 'treppe', pos: [.58, .2], nach: ['turm'],
    feuer: 'Leuchtfeuer an der Turmtreppe',
    text: ['Am Fuß der Treppe glimmt ein letztes Leuchtfeuer. Von oben hörst du eine Glocke.', 'Nicht die, die nur du hörst. Eine andere, tiefere, die jeder hören kann.'],
    leer: 'Die Treppe windet sich nach oben ins Dunkel. Die Glocke oben schweigt.',
    npc: [
      { id: 'enna', wenn: D => !D.merker.enna_treppe || D.merker.isolde && !D.merker.enna_ende },
      { id: 'kalden', wenn: D => D.merker.kalden1 && !D.merker.kalden2 && !D.merker.isolde }
    ]
  },
  turm: {
    region: 'velmora', name: 'Glockenturm', welt: 'turm', pos: [.46, .05], nach: [],
    boss: 'isolde', arena: 'turm',
    text: ['Oben im Turm hängt eine Glocke, so groß wie ein Haus. Darunter, an der Brüstung, steht eine Frau in einem Brautkleid. Wasser tropft von ihrem Schleier.', 'In der Hand hält sie eine zweite Glocke, kleiner, an einer Kette. Sie dreht sich nicht um.'],
    nachBoss: [
      'Isolde sinkt auf die Knie. Ihr Schleier gleitet zur Seite, und darunter ist ein Gesicht, jung und sehr müde.',
      '„Er kommt nicht, oder?“ Sie sieht dich an, und zum ersten Mal scheint sie dich wirklich zu sehen. „Dann nimm du es. Ich habe lange genug gewartet.“',
      'Aus ihrer Brust löst sich ein Splitter, hell wie Mondlicht. Er schwebt zu dir herüber, und die Glocke, die nur du hörst, schlägt einmal, laut.',
      'Über dir beginnt die große Glocke zu schwingen. Ein Schlag. Dann nichts mehr. Irgendwo draußen hebt sich das Wasser.'
    ],
    leer: 'Die große Glocke hängt still. Durch die Bögen siehst du weit übers Meer, und das Wasser steht höher als gestern.',
    beute: { item: [['splitter_isolde', 1], ['nachhall_isolde', 1]] },
    ende: true
  }
};

/* ---------- Figuren ---------- */
const NPC = {
  enna: { name: 'Enna', look: 'enna', titel: 'Leuchtfeuerwärterin' },
  mira: { name: 'Mira', look: 'mira', titel: 'Taucherin' },
  kalden: { name: 'Ser Kalden', look: 'kalden', titel: 'Der Eidlose' }
};
// Welches Gespräch gerade dran ist
function gespraechFuer(id, D, ort){
  if (id === 'enna'){
    if (ort === 'turmtreppe' && D.merker.isolde) return 'enna_ende';
    if (ort === 'turmtreppe') return 'enna_treppe';
    if (!D.merker.enna1) return 'enna1';
    if (D.bosse.vogt && !D.merker.enna_vogt) return 'enna_vogt';
    return 'enna_rast';
  }
  if (id === 'mira'){
    if (!D.merker.mira1) return 'mira1';
    if ((D.items.helm || 0) > 0) return 'mira_helm';
    if (ort === 'feuer_velmora' && !D.merker.mira_velmora) return 'mira_velmora';
    return 'mira_handel';
  }
  if (id === 'kalden'){
    if (!D.merker.kalden1) return 'kalden1';
    if (D.merker.isolde) return 'kalden3';
    return 'kalden2';
  }
}

// Gespräche: Knoten mit Text und Antworten. „go“ ist der nächste Knoten, ohne „go“ endet es.
const GESPRAECHE = {
  enna1: {
    wer: 'enna', setze: 'enna1', start: 'a',
    k: {
      a: { text: 'Du bist aufgestanden. Die meisten bleiben liegen.', a: [
        { t: 'Wer bist du?', go: 'wer' }, { t: 'Wo bin ich?', go: 'wo' }, { t: 'Ich höre eine Glocke.', go: 'glocke' } ] },
      wer: { text: 'Enna. Ich hüte die Leuchtfeuer, solange es welche gibt. Und ich warte.', a: [{ t: 'Worauf?', go: 'worauf' }] },
      worauf: { text: 'Auf jemanden wie dich, vielleicht. Das wird sich zeigen.', a: [{ t: 'Wo bin ich?', go: 'wo' }, { t: 'Was ist mit der Flamme?', go: 'feuer' }] },
      wo: { text: 'An der Strandung. Hier spuckt die Flut aus, was sie nicht behalten will. Die Lebenden nennen euch Strandgut.', a: [{ t: 'Ich höre eine Glocke.', go: 'glocke' }, { t: 'Was ist mit der Flamme?', go: 'feuer' }] },
      glocke: { text: 'Tust du das. … Dann hör weiter hin. Und erzähl es niemandem, der eine Krone trägt.', setze: 'enna_glocke', a: [{ t: 'Was ist mit der Flamme?', go: 'feuer' }] },
      feuer: { text: 'Die Glut, die du den Toten nimmst, macht dich stärker. Gib sie der Flamme, und die Flamme gibt sie dir zurück. Stirbst du, bleibt sie dort liegen, wo du gefallen bist. Hol sie dir, bevor du ein zweites Mal fällst.', a: [{ t: 'Und die Toten?', go: 'tote' }] },
      tote: { text: 'Wer an einem Leuchtfeuer rastet, ruft sie zurück. Das ist der Preis. Ich bin an den Feuern, wenn du mich brauchst.', a: [{ t: 'Danke, Enna.' }] }
    }
  },
  enna_vogt: {
    wer: 'enna', setze: 'enna_vogt', start: 'a',
    k: {
      a: { text: 'Der Vogt ist gefallen. Hundert Jahre hat er gesammelt, was die Flut bringt.', a: [{ t: 'Für wen?', go: 'wen' }, { t: 'Er hat die Glocke erwähnt.', go: 'glocke' }] },
      wen: { text: 'Das hat er nie gesagt. Aber niemand sammelt hundert Jahre lang für sich allein.', a: [{ t: 'Ich gehe weiter.' }] },
      glocke: { text: 'Hat er das. … Dann weiß es bald nicht mehr nur ich. Sei vorsichtig in der Marsch.', a: [{ t: 'Ich gehe weiter.' }] }
    }
  },
  enna_rast: {
    wer: 'enna', start: 'a',
    k: { a: { text: 'Ruh dich aus. Die Flamme brennt, solange du sie brauchst.', a: [{ t: 'Danke.' }] } }
  },
  enna_treppe: {
    wer: 'enna', setze: 'enna_treppe', start: 'a',
    k: {
      a: { text: 'Da oben ist sie. Isolde. Die Jüngste der fünf Kinder des Königs.', a: [{ t: 'Worauf wartet sie?', go: 'wartet' }, { t: 'Muss ich sie töten?', go: 'toeten' }] },
      wartet: { text: 'Auf einen Mann, der versprochen hat zu kommen, wenn die Glocke läutet. Sie läutet seit hundert Jahren.', a: [{ t: 'Muss ich sie töten?', go: 'toeten' }] },
      toeten: { text: 'Sie trägt einen Splitter der Krone, und er frisst sie auf. Du tust ihr keinen Gefallen, wenn du sie lässt. Aber du tust auch der Welt keinen, wenn du ihn nimmst. Das wirst du noch verstehen.', a: [{ t: 'Das klingt nicht nach einer Antwort.', go: 'antwort' }] },
      antwort: { text: 'Nein. Es ist keine.', a: [{ t: 'Ich gehe hinauf.' }] }
    }
  },
  enna_ende: {
    wer: 'enna', setze: 'enna_ende', start: 'a',
    k: {
      a: { text: 'Eine Glocke weniger. Hörst du, wie still es geworden ist? … Und wie das Wasser steigt.', a: [{ t: 'Was bedeutet das?', go: 'was' }, { t: 'Ich habe einen Splitter.', go: 'splitter' }] },
      was: { text: 'Dass du etwas getan hast, das man nicht zurücknimmt. Ruh dich aus. Es wird nicht leichter.', a: [{ t: 'Ich habe einen Splitter.', go: 'splitter' }, { t: 'Ich ruhe mich aus.' }] },
      splitter: { text: 'Ich weiß. Ich kann ihn hören. Behalt ihn nah bei dir, und zeig ihn niemandem. Auch mir nicht.', setze: 'enna_splitter', a: [{ t: 'Ich ruhe mich aus.' }] }
    }
  },
  mira1: {
    wer: 'mira', setze: 'mira1', start: 'a',
    k: {
      a: { text: 'Noch einer aus dem Wasser. Du tropfst auf meinen Steg.', a: [{ t: 'Wer bist du?', go: 'wer' }, { t: 'Was ist mit dem Dorf passiert?', go: 'dorf' }] },
      wer: { text: 'Mira. Ich tauche nach dem, was die Flut verschluckt hat, und verkaufe es an die, die noch bezahlen können. Also meistens an niemanden. Du hast Glut, oder? Die nehme ich.', a: [{ t: 'Was ist mit dem Dorf passiert?', go: 'dorf' }, { t: 'Suchst du etwas?', go: 'sucht' }] },
      dorf: { text: 'Die Flut kam höher als sonst. Wer nicht weg ist, steht jetzt draußen auf dem Salzpfad und wartet. Du hast sie gesehen.', a: [{ t: 'Suchst du etwas?', go: 'sucht' }] },
      sucht: { text: 'Meinen Bruder. Jonte. Er ist nach Velmora getaucht, in den Hafen, vor drei Wochen. Er wollte Glockenbronze holen, die bringt am meisten.', a: [{ t: 'Ich halte Ausschau nach ihm.', go: 'auftrag' }] },
      auftrag: { text: 'Sein Helm hat seinen Namen eingeritzt. Wenn du ihn findest, bring ihn mir. Den Helm, meine ich. Ihn bringst du mir nicht mehr.', setze: 'mira_auftrag', a: [{ t: 'Zeig mir, was du hast.', laden: true }, { t: 'Ich mache mich auf den Weg.' }] }
    }
  },
  mira_velmora: {
    wer: 'mira', setze: 'mira_velmora', start: 'a',
    k: {
      a: { text: 'Ich bin dir nachgekommen. Irgendwer muss ja dein Glut nehmen. Der Hafen ist dort drüben. Zwischen den Schiffen ist etwas, das ich nicht sehen will.', a: [{ t: 'Zeig mir, was du hast.', laden: true }, { t: 'Ich sehe nach.' }] }
    }
  },
  mira_handel: {
    wer: 'mira', start: 'a',
    k: { a: { text: 'Glut gegen Ware. Das ist das einzige Gesetz, das noch gilt.', a: [{ t: 'Zeig mir, was du hast.', laden: true }, { t: 'Später.' }] } }
  },
  mira_helm: {
    wer: 'mira', start: 'a',
    k: {
      a: { text: 'Du hast da etwas in der Hand.', a: [{ t: 'Den Helm deines Bruders.', go: 'helm' }] },
      helm: { text: '… Das ist er.', a: [{ t: '(Schweigen)', go: 'stein' }] },
      stein: { text: 'Danke. Hier. Das hat er mir geschenkt, als wir Kinder waren. Er würde wollen, dass es jemand trägt, der zurückkommt.', nimmt: 'helm', gibt: { tal: 'taucherstein' }, setze: 'mira_helm', a: [{ t: 'Was wirst du jetzt tun?', go: 'jetzt' }] },
      jetzt: { text: 'Weitertauchen. Jonte hat immer gesagt, unter Velmora gibt es noch etwas. Tiefer als der Hafen, tiefer als alles. Ich dachte, er spinnt. Vielleicht sehe ich nach.', setze: 'mira_tiefe', a: [{ t: 'Pass auf dich auf, Mira.' }] }
    }
  },
  kalden1: {
    wer: 'kalden', setze: 'kalden1', start: 'a',
    k: {
      a: { text: 'Nicht schlecht, für Strandgut. Ser Kalden. Einst von der Kronwacht. Jetzt nur noch Kalden.', a: [{ t: 'Die Kronwacht?', go: 'wacht' }, { t: 'Was ist in Velmora?', go: 'velmora' }] },
      wacht: { text: 'Die Ritter des Königs. Wir haben geschworen, die Krone zu schützen. Die Krone ist zerbrochen, also haben wir unseren Schwur wohl gebrochen. So sehen es jedenfalls die anderen.', a: [{ t: 'Was ist in Velmora?', go: 'velmora' }] },
      velmora: { text: 'Isolde. Die Tochter des Königs. Sie trägt einen Splitter der Krone, oben im Glockenturm, und sie lässt niemanden hinauf.', a: [{ t: 'Warum bist du hier?', go: 'warum' }] },
      warum: { text: 'Weil jemand die Splitter zurückholen muss, bevor sie alles zerfressen, was sie tragen. Allein schaffe ich es nicht. Vielleicht schaffst du es.', a: [{ t: 'Vielleicht.', go: 'ende' }] },
      ende: { text: 'Wir sehen uns in Velmora. Wenn du bis dahin noch stehst.', a: [{ t: 'Leb wohl, Kalden.' }] }
    }
  },
  kalden2: {
    wer: 'kalden', setze: 'kalden2', start: 'a',
    k: {
      a: { text: 'Du bist also so weit gekommen. Hör zu. Wenn sie die große Glocke läutet, lauf nicht weg. Weich aus, wenn der Klang dich erreicht, nicht vorher.', a: [{ t: 'Danke für den Rat.', go: 'splitter' }] },
      splitter: { text: 'Und wenn du den Splitter bekommst … bring ihn nicht zu Enna.', a: [{ t: 'Warum nicht?', go: 'warum' }] },
      warum: { text: 'Weil ich nicht weiß, auf wessen Seite sie steht. Und du auch nicht.', setze: 'kalden_warnung', a: [{ t: 'Ich werde darüber nachdenken.' }] }
    }
  },
  kalden3: {
    wer: 'kalden', setze: 'kalden3', start: 'a',
    k: {
      a: { text: 'Der Splitter. Du hast ihn. Die Kronwacht würde viel dafür geben. Ich auch.', a: [{ t: 'Er bleibt bei mir.', go: 'nein', setze: 'kalden_nein' }, { t: 'Was würdest du damit tun?', go: 'was' }] },
      nein: { text: 'Natürlich. Fürs Erste.', a: [{ t: 'Leb wohl, Kalden.' }] },
      was: { text: 'Die Krone wieder zusammensetzen. Was sonst? Ohne Krone steigt das Wasser, bis es uns alle holt.', setze: 'kalden_krone', a: [{ t: 'Er bleibt trotzdem bei mir.', go: 'nein', setze: 'kalden_nein' }] }
    }
  }
};

/* ---------- Laden ---------- */
const LADEN = {
  mira: [
    { id: 'glockenerz', art: 'item', preis: 250, vorrat: 4 },
    { id: 'muschel', art: 'tal', preis: 900, vorrat: 1 }
  ]
};

/* ---------- Anfang ---------- */
const ANFANG = {
  erwachen: [
    'Salz im Mund. Kies unter den Händen.',
    'Das Meer hat dich ausgespuckt, zwischen die Rippen eines Schiffes, dessen Namen du nicht kennst. Deinen eigenen kennst du auch nicht mehr.',
    'Irgendwo läutet eine Glocke. Leise und gleichmäßig, wie ein Herzschlag.'
  ],
  herkunft: ['Neben dir im Kies liegt, was dir geblieben ist. Deine Hand greift danach, als wüsste sie besser als du, wer du warst.']
};
const SAETZE = {
  'feuer.tod': 'Du erwachst am Leuchtfeuer. Die Flut hat dich ein weiteres Mal ausgespuckt.',
  'feuer.rast': 'Die Flamme brennt ruhig. Du rastest. Deine Wunden schließen sich, und die Phiolen füllen sich mit Mondtau.'
};

/* ---------- Stimmen (derzeit nicht im Spiel, siehe README) ---------- */
const SPRECHER = {
  erzaehler: { name: 'Erzähler', stimme: 'de_DE-thorsten-high', tempo: 1.08, tiefe: .96, hall: .2, laut: 1 },
  vogt:      { name: 'Der Strandvogt', stimme: 'de_DE-thorsten_emotional-medium', sprecher: 'disgusted', tempo: 1.12, tiefe: .8, hall: .5, laut: 1.1 }
};
function stimmZeilen(){
  const z = [];
  ANFANG.erwachen.forEach((t, i) => z.push({ id: 'erwachen.' + i, wer: 'erzaehler', text: t }));
  ANFANG.herkunft.forEach((t, i) => z.push({ id: 'herkunft.' + i, wer: 'erzaehler', text: t }));
  for (const k in HERK) z.push({ id: 'herk.' + k, wer: 'erzaehler', text: HERK[k].rise });
  for (const k in ORTE){
    const o = ORTE[k];
    (o.text || []).forEach((t, i) => z.push({ id: k + '.' + i, wer: 'erzaehler', text: t }));
    (o.nachBoss || []).forEach((t, i) => z.push({ id: k + '.nach' + i, wer: 'erzaehler', text: t }));
  }
  for (const k in SAETZE) z.push({ id: k, wer: 'erzaehler', text: SAETZE[k] });
  for (const k in FEINDE){
    const d = FEINDE[k], wer = SPRECHER[k] ? k : 'erzaehler';
    if (d.intro) z.push({ id: k + '.intro', wer, text: d.intro });
    if (d.phase2 && d.phase2.line) z.push({ id: k + '.line2', wer, text: d.phase2.line });
  }
  return z;
}
