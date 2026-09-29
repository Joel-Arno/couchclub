/* =====================================================================
   LORE: Briefe, Inschriften, Erinnerungen und was man über die Figuren weiß
   Jeder Eintrag landet beim ersten Lesen in der Chronik.
   text: Absätze, ein „~“ am Anfang setzt den Absatz kursiv.
   text darf eine Funktion des Spielstands sein (für Figuren, über die man mehr erfährt).
   gibt: was man beim ersten Lesen erhält. merker: was sich der Spielstand merkt.
   ===================================================================== */
const LORE = {
  /* ---------- Die Strandung ---------- */
  brief_strandgut: {
    art: 'Flaschenpost', titel: 'Eine Flasche im Kies',
    text: [
      'An wen auch immer die Flut dies bringt.',
      'Du bist nicht der Erste, und du wirst nicht der Letzte sein. Geh den Strand hinauf, zum Leuchtturm. Dort brennt eine Flamme, die dich kennt, auch wenn du sie nicht kennst.',
      'Was du den Toten nimmst, gib der Flamme. Wenn du fällst, bleibt es liegen, wo du gefallen bist.',
      'Und wenn du eine Glocke hörst, die sonst niemand hört: Sag es keinem mit Krone oder Laterne.',
      '~E.'
    ]
  },
  grab_fischer: {
    art: 'Grabstein', titel: 'Ein Grab über dem Strand',
    text: [
      'HIER LIEGT NIEMAND.',
      'DAS MEER HAT IHN BEHALTEN.',
      'ELDRIC, FISCHER, VATER VON DREI.',
      '~Jemand hat Muscheln auf den Stein gelegt, sorgfältig in einer Reihe. Die ältesten sind weiß gebleicht, die neuesten noch nass.'
    ]
  },
  logbuch_seraphine: {
    art: 'Logbuch', titel: 'Logbuch der Seraphine',
    text: [
      'Dritter Tag nach Grauhall. Siebenundvierzig Pilger an Bord, alle für Velmora. Sie singen nachts, ein Lied über den Mond, der wieder aufgeht. Die Mannschaft mag es nicht.',
      'Fünfter Tag. Die Glocke von Velmora schlägt nicht mehr zur vollen Stunde. Mal zu früh, mal gar nicht. Der Steuermann sagt, das hat er nie erlebt.',
      'Sechster Tag. Sturm aus Westen. Die Pilger stehen an Deck und singen gegen den Wind. Eine von ihnen hat gelacht, als der Hauptmast brach. Ihre Laterne ist nicht ausgegangen, nicht einmal im Regen.',
      '~Ich glaube, sie wollen, dass wir sinken.',
      'Die letzte Seite ist leer bis auf einen Abdruck. Eine nasse Hand, zu schmal für einen Seemann.'
    ]
  },
  schild_ritter: {
    art: 'Inschrift', titel: 'Der Schild des Ritters',
    text: [
      'Auf dem Schild ist ein Wappen, fast ganz vom Salz zerfressen: eine Krone über einer Welle. Das Zeichen der Kronwacht.',
      'Darunter, in den Rand geritzt, mit einem Messer und in Eile:',
      '~Wir hielten die Bucht, wie befohlen. Das Wasser stieg trotzdem. Wer das liest: Die Krone ist es nicht wert. — Aldric',
      'Am Griff hängt ein Siegel aus schwarzem Wachs, unversehrt, als hätte das Meer es nicht anrühren wollen.'
    ]
  },
  lampenbuch: {
    art: 'Buch', titel: 'Das Lampenbuch',
    text: [
      'Spalten mit Zahlen und einer engen, sorgfältigen Handschrift.',
      'Öl: vier Maß. Wetter: klar. Glocke von Velmora: pünktlich.',
      'Öl: vier Maß. Wetter: Nebel. Glocke von Velmora: pünktlich.',
      'Öl: fünf Maß. Wetter: Sturm. Glocke von Velmora: ausgeblieben.',
      'Glocke: ausgeblieben. Glocke: ausgeblieben. Glocke: ausgeblieben.',
      '~Kein Öl mehr nötig. Sie bringt mir ein anderes Licht.'
    ]
  },
  tagebuch_waerter: {
    art: 'Tagebuch', titel: 'Tagebuch des Leuchtturmwärters',
    text: [
      'Einunddreißig Jahre halte ich das Licht. Es wird trotzdem dunkler. Nicht die Lampe. Das Meer.',
      'Heute stand eine Frau mit einer Laterne am Fuß des Turms. Sie sagt, die Mutter vom Wiederaufgang kann das Licht zurückbringen. Das richtige Licht, das am Himmel.',
      'Sie braucht nur, was die Flut bringt. Nicht alles. Nur die, in denen es noch leuchtet. Ich soll sie einsammeln, bevor sie weiterziehen. Sie sagt, sie spüren nichts.',
      'Ich habe Ja gesagt. Möge das Meer mir vergeben, ich habe Ja gesagt.',
      '~Das Kind heute hat geweint, als ich es hinaufgetragen habe. Sie spüren doch etwas. Ich schreibe nicht mehr in dieses Buch.',
      '— Thore Brandt, Wärter'
    ]
  },
  mole_stein: {
    art: 'Gedenkstein', titel: 'Ein Stein an der Mole',
    text: [
      'ZUM GEDENKEN AN DIE FLUT IM JAHR DER DRITTEN GLOCKE.',
      'DAS MEER KAM BIS HIER. WIR HABEN DIE MOLE HÖHER GEBAUT.',
      'Über der Inschrift sind Striche in den Stein gehauen, einer über dem anderen. Neben jedem steht ein Jahr und dasselbe Wort:',
      '~Bis hier. Bis hier. Bis hier.',
      'Der oberste Strich ist frisch. Er liegt über deinem Kopf.'
    ]
  },
  liste_vogt: {
    art: 'Verzeichnis', titel: 'Das Verzeichnis des Vogts',
    text: [
      'Seiten über Seiten, Striche und Tage. Neben den meisten steht nur ein Wort: leer.',
      'Strandgut, Frühjahr. Elf. Alle leer.',
      'Strandgut, Herbst. Sechs. Leer. Eins mit schwachem Schein, ging unterwegs aus.',
      'Strandgut, Winter. Zwei mit Schein. Übergeben an die Laternenträgerin, zur Salzmarsch.',
      'Die letzte Zeile ist frisch, die Tinte kaum getrocknet:',
      '~Heute Nacht: eins mit Licht in der Brust. Hell. Endlich. Für die Mutter vom Wiederaufgang.'
    ]
  },
  brief_oswin: {
    art: 'Zettel', titel: 'Oswins letzte Zeilen',
    text: [
      'In Oswins Hand ein Stück Segeltuch, beschrieben mit Kohle. Die Buchstaben werden gegen Ende immer größer, als hätte er die kleinen nicht mehr gekonnt.',
      '~Für den nach mir. Der mit dem Licht.',
      '~Ich weiß meinen Namen noch. Oswin. Ich schreibe ihn auf, damit ihn einer weiß, wenn ich es nicht mehr tu.',
      '~Lass dir dein Licht nicht nehmen. Von keinem.',
      'Darunter liegt ein kleiner Beutel mit Glut. Er hat sie gesammelt, für jemanden, der sie brauchen kann.'
    ],
    gibt: { glut: 400 }
  },

  /* ---------- Die Salzmarsch ---------- */
  warnschild_salz: {
    art: 'Schild', titel: 'Ein Schild am Salzpfad',
    text: [
      'PFAHLWYK.',
      'WER WEITERGEHT, BLEIBT AUF DEM PFAD.',
      'DIE MARSCH NIMMT, WAS VOM WEG ABKOMMT.',
      'WER IM WASSER LIEGT, DEN LASST LIEGEN.',
      '~Darunter, mit einem Messer, viel später: Sie stehen wieder auf.'
    ]
  },
  tagebuch_wenda: {
    art: 'Tagebuch', titel: 'Wendas Aufzeichnungen',
    text: [
      'Der alte Joss ist heute gestorben. Das Wasser stand schon an seinem Bett. Ich habe ihn in Salz gelegt, damit die Flut ihn nicht holt. Er sieht aus, als schliefe er.',
      'Die Glocke von Velmora ist wieder ausgeblieben. Jede Nacht holt das Meer mehr. Wer ertrinkt, steht wieder auf. Wer im Salz liegt, bleibt, wer er war.',
      'Ich bewahre sie jetzt alle, unten in der Grube. Sie sind so still dort. Manchmal summen sie mit, wenn ich singe.',
      'Eine Frau mit Laterne war hier. Sie wollte die, die leuchten. Ich habe ihr keinen gegeben. Meine gehören dem Salz, nicht ihrer Mutter.',
      '~Hark kam heute herunter und wollte mich holen. Er wird bleiben. Das Salz ist gut zu ihm.'
    ]
  },
  grube_inschrift: {
    art: 'Inschrift', titel: 'In den Salzfels geritzt',
    text: [
      'SALZ BEWAHRT. MEER VERZEHRT.',
      'Darunter Namen, Hunderte. Manche sind so alt, dass das Salz über sie gewachsen ist wie Frost über ein Fenster.',
      'Der letzte Name ist sauber und tief eingeritzt, mit einer Hand, die sich Zeit gelassen hat:',
      '~Wenda. Wenn keiner mehr da ist.'
    ]
  },
  brief_hark: {
    art: 'Zettel', titel: 'Ein Zettel in Harks Hand',
    text: [
      '~Greta.',
      '~Wenda singt. Ich kann nicht mehr aufstehen, das Salz ist schon in den Beinen. Es tut nicht weh. Es ist nur kalt, und dann nicht mehr.',
      '~Flick die Netze nicht mehr für mich. Flick sie für dich.',
      '~H.'
    ]
  },
  kalden_bruecke: {
    art: 'Inschrift', titel: 'Am ersten Pfeiler der Brücke',
    text: [
      'GEBAUT IM JAHR DER ERSTEN GLOCKE, AUF BEFEHL VON KÖNIG AUREL.',
      'MÖGE SIE STEHEN, SOLANGE VELMORA LÄUTET.',
      '~In den Stein geritzt, klein und schief, zwei Buchstaben in einem Herz: K und I.'
    ]
  },

  /* ---------- Velmora ---------- */
  inschrift_tor: {
    art: 'Inschrift', titel: 'Über dem Stadttor',
    text: [
      'VELMORA.',
      'SOLANGE SIE LÄUTET, STEHT DAS MEER STILL.',
      '~Jemand hat mit Kreide darunter geschrieben: Sie läutet nicht mehr zur Stunde. Sie läutet, wann sie will.'
    ]
  },
  blaues_haus: {
    art: 'Zettel', titel: 'Ein Zettel im blauen Haus',
    text: [
      'Auf dem Tisch stehen zwei Gläser. Eines ist umgefallen und nie aufgehoben worden. Daneben ein Zettel, mit einer Nadel an das Holz geheftet:',
      '~Für I. Heute Abend, wenn die Glocke sieben schlägt, am Brunnen. Zieh das Blaue an. K.',
      'Unter dem Zettel liegt ein Ring. Rostig, mit einer Gravur, die man kaum noch lesen kann.'
    ],
    gibt: { tal: 'ehering' }
  },
  hafen_tafel: {
    art: 'Aushang', titel: 'Am Hafenamt',
    text: [
      'BEKANNTMACHUNG.',
      'KEINE AUSFAHRT NACH GRAUHALL BIS AUF WEITERES.',
      'DIE KRONWACHT IST HEUTE NACHT ABGEZOGEN. WER SIE AUFHÄLT, WIRD GEHÄNGT.',
      '~Das Papier ist dreihundert Jahre alt und hängt noch immer. Das Meer hat es nie erreicht, als hätte es gewartet, bis es jemand liest.'
    ]
  },
  brief_jonte: {
    art: 'Brief', titel: 'Ein wasserfester Beutel',
    text: [
      '~Mira,',
      '~falls du das findest, bin ich zu tief getaucht. Unter dem Hafenbecken führen Stufen nach unten, aus demselben Stein wie der Glockenturm. Kein Mensch baut Stufen unter Wasser.',
      '~Es läutet da unten, Mira. Ganz leise. Nicht wie die Glocke im Turm. Tiefer. Ich muss wissen, was es ist.',
      '~Das Erz ist für dich. Kauf dir ein Boot, das nicht leckt.',
      '~J.'
    ],
    gibt: { item: 'glockenerz' }
  },
  gaestebuch: {
    art: 'Buch', titel: 'Das Buch der Gäste',
    text: [
      'Die Namen der Hochzeitsgäste, in schöner, geschwungener Schrift. Fürsten aus Grauhall, Glockengießer, Kapitäne.',
      'Die Hochzeit hat nie stattgefunden. Trotzdem geht das Buch weiter, Seite um Seite, in einer anderen Schrift. Zittrig, dann ruhig, dann wieder zittrig:',
      '~Er kommt bestimmt morgen.',
      '~Morgen.',
      '~Morgen.',
      'So geht es über hundert Seiten.'
    ]
  },
  brief_isolde: {
    art: 'Brief', titel: 'Ein Brief auf dem Altar',
    text: [
      '~Meine Isolde,',
      '~man ruft die Kronwacht nach Grauhall, heute Nacht noch. Ich darf nicht sagen, warum. Ich darf nicht einmal Lebewohl sagen, also schreibe ich es.',
      '~Wenn die Glocke läutet, komme ich zurück. Warte auf mich, und wenn es hundert Jahre dauert.',
      '~Dein K.',
      'Das Papier ist so oft gefaltet worden, dass es an den Knicken durchscheint.'
    ]
  },
  portrait_gruft: {
    art: 'Bild', titel: 'Ein Bild in der Gruft', merker: 'portrait',
    text: [
      'Ein Gemälde, von Feuchtigkeit gewellt. Eine junge Frau mit Blumen im Haar, daneben ein Ritter in der Rüstung der Kronwacht. Er hat die Hand auf ihre Schulter gelegt, sie lacht über etwas außerhalb des Bildes.',
      'Auf dem Rahmen, auf einer Messingplatte:',
      '~Isolde von Velmora und Ser Kalden von der Kronwacht. Zur Verlobung, im Jahr der fünften Glocke.',
      'Das Gesicht des Ritters kennst du. Es ist dreihundert Jahre jünger, aber du kennst es.'
    ]
  },
  treppe_inschrift: {
    art: 'Inschrift', titel: 'An der Turmtreppe',
    text: [
      'DREIHUNDERT STUFEN.',
      'EINE FÜR JEDES JAHR, DAS SIE WARTET.',
      '~Die Zahl ist oft geändert worden. Unter den neuen Strichen sieht man die alten: hundert, zweihundert, zweihundertfünfzig. Jemand kommt jedes Jahr hierher und schreibt sie um.'
    ]
  },

  /* ---------- Erinnerungen der Bosse ---------- */
  erinnerung_vogt: {
    art: 'Erinnerung', titel: 'Der Wärter',
    text: [
      'Du siehst durch fremde Augen. Ein Mann oben im Leuchtturm, die Hände schwarz vom Lampenruß. Unten am Strand liegt ein Kind im Kies, und in seiner Brust glimmt ein Schein, schwach wie eine Kerze.',
      'Er trägt es hinauf, zu der Frau mit der Laterne. Sie hält es gegen ihr Licht, und der Schein geht aus.',
      '~Es tut mir leid, sagt er. Es tut mir so leid.',
      'Und dann sagt er es nie wieder.'
    ]
  },
  erinnerung_hexe: {
    art: 'Erinnerung', titel: 'Die Heilerin',
    text: [
      'Eine Frau kniet neben einem Bett, in dem das Wasser steht. Sie streut Salz über die Hände eines alten Mannes, ganz vorsichtig, als würde sie ihn zudecken.',
      'Sie singt. Das Lied, das du fast kennst. Es ist ein Wiegenlied.',
      '~Schlaf, das Meer ist weit. Schlaf, das Salz ist nah. Wer im Salz schläft, den findet keine Flut.'
    ]
  },
  erinnerung_spinne: {
    art: 'Erinnerung', titel: 'Das Netz',
    text: [
      'Tausend Taue, und in jedem hängt ein Stück von einem Schiff. Etwas hat sie gesammelt, jahrelang, wie andere Tiere Knochen sammeln.',
      'Ganz unten im Netz hängt eine Glocke, klein wie eine Faust. Sie läutet, wenn der Wind geht. Das Ding in den Tauen hat sich jedes Mal danach umgedreht.'
    ]
  },
  erinnerung_jonte: {
    art: 'Erinnerung', titel: 'Der Taucher',
    text: [
      'Grünes Wasser. Stufen, die in die Tiefe führen, jede so breit wie ein Haus. Ein Licht weit unten, und ein Läuten, das man nicht hört, sondern in den Zähnen spürt.',
      'Er will umkehren. Die Luft im Helm wird knapp. Er taucht weiter.',
      '~Mira, denkt er. Nur noch ein Stück.'
    ]
  },
  erinnerung_isolde: {
    art: 'Erinnerung', titel: 'Die Braut',
    text: [
      'Ein Abend am Brunnen. Die Glocke schlägt sieben. Sie trägt das Blaue. Er kommt nicht.',
      'Sie wartet, bis die Glocke acht schlägt. Dann neun. Dann steigt sie den Turm hinauf, weil man von oben weiter sehen kann.',
      'Oben nimmt sie den Splitter, den ihr Vater ihr hinterlassen hat, und läutet. Wenn er die Glocke hört, denkt sie, dann kommt er.',
      '~Dreihundert Jahre lang hat sie geläutet. Und so lange hat das Meer stillgestanden.'
    ]
  },

  /* ---------- Figuren ---------- */
  npc_enna: {
    art: 'Figur', titel: 'Enna, Hüterin der Leuchtfeuer',
    text: D => [
      'Eine Frau in einem langen Mantel, eine Laterne auf den Knien. Sie hütet die letzten Leuchtfeuer der Küste und scheint zu wissen, wer aus dem Meer kommt, bevor es ankommt.',
      D.merker.enna_glocke ? 'Sie weiß von der Glocke, die nur du hörst. Sie hat dir geraten, es niemandem zu sagen, der eine Krone oder eine Laterne trägt. Sie trägt selbst eine.' : null,
      D.merker.kalden_warnung ? 'Ser Kalden sagt, sie sei älter, als sie aussieht. Viel älter.' : null,
      D.merker.enna_herz ? '~Sie sagt, aus dem Herzen des Mondes sei beim Schmieden der Krone ein Rest geblieben. Nie gefunden. Bis jetzt.' : null
    ].filter(Boolean)
  },
  npc_oswin: {
    art: 'Figur', titel: 'Oswin, Strandgut',
    text: D => [
      'Ein Mann im Bauch eines Wracks, der sich an seinen eigenen Namen klammert. Die Flut hat ihn ausgespuckt wie dich, aber in ihm leuchtet nichts.',
      D.bosse.vogt ? '~Als du wiederkamst, hatte er seinen Namen aufgeschrieben. Damit ihn einer weiß.' : 'Er hat dir von der Bucht erzählt, hinter dem hohlen Fels.'
    ]
  },
  npc_mira: {
    art: 'Figur', titel: 'Mira, Taucherin',
    text: D => [
      'Sie taucht nach dem, was die Flut verschluckt hat, und verkauft es gegen Glut. Ihr Bruder Jonte ist ins Hafenbecken von Velmora getaucht und nicht zurückgekommen.',
      D.merker.mira_luege ? '~Du hast ihr gesagt, er habe nicht gelitten. Sie träumt jetzt von ihm, und im Traum lächelt er.' : null,
      D.merker.mira_wahr ? '~Du hast ihr die Wahrheit gesagt. Sie taucht nicht mehr im Hafen.' : null
    ].filter(Boolean)
  },
  npc_greta: {
    art: 'Figur', titel: 'Greta, Netzflickerin',
    text: D => [
      'Sie flickt ein Netz für ihren Mann Hark, der in die Salzgrube gestiegen und nicht zurückgekommen ist.',
      D.merker.greta_fertig ? '~Du hast ihr seine Nadel gebracht. Sie flickt weiter, nicht mehr für ihn.' : 'Sie will seine Nadel aus Walknochen, damit sie es weiß.'
    ]
  },
  npc_kalden: {
    art: 'Figur', titel: 'Ser Kalden, der Eidlose',
    text: D => [
      'Ein Ritter der Kronwacht, der seinen Schwur gebrochen hat, weil es die Krone nicht mehr gibt, die er schützen sollte. Er will die Splitter zurückholen, aber nicht selbst.',
      D.merker.portrait || D.merker.kalden_erkannt ? '~Er war Isoldes Verlobter. In der Nacht der Verlobung rief man ihn nach Grauhall, und er kam nicht wieder. Dreihundert Jahre lang.' : null,
      D.merker.splitter_kalden ? 'Du hast ihm ihren Splitter gegeben. Er bringt ihn nach Grauhall.' : null,
      D.merker.splitter_behalten ? 'Du hast ihren Splitter behalten. Er hat dich lange angesehen und nichts gesagt.' : null
    ].filter(Boolean)
  }
};
