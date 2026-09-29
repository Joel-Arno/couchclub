/* =====================================================================
   DATEN: Welt von Akt I – Regionen, Figuren, Gespräche, Laden
   Die Gebiete selbst stehen in karten.js, Briefe und Erinnerungen in
   lore.js, Zwischenszenen in skripte.js.
   ===================================================================== */
const REGIONEN = {
  strandung: { name: 'Die Strandung' },
  marsch: { name: 'Die Salzmarsch' },
  velmora: { name: 'Velmora' }
};

/* ---------- Figuren ---------- */
const NPC = {
  enna: { name: 'Enna', look: 'enna', titel: 'Hüterin der Leuchtfeuer' },
  oswin: { name: 'Oswin', look: 'oswin', titel: 'Strandgut' },
  mira: { name: 'Mira', look: 'mira', titel: 'Taucherin' },
  greta: { name: 'Greta', look: 'greta', titel: 'Netzflickerin aus Pfahlwyk' },
  kalden: { name: 'Ser Kalden', look: 'kalden', titel: 'Der Eidlose' }
};
// Welches Gespräch gerade dran ist
function gespraechFuer(id, D, ort){
  const m = D.merker;
  if (id === 'enna'){
    if (ort === 'turmtreppe') return D.bosse.isolde ? 'enna_ende' : 'enna_treppe';
    if (!m.enna1) return 'enna1';
    if (D.bosse.vogt && !m.enna_vogt) return 'enna_vogt';
    return 'enna_rast';
  }
  if (id === 'oswin') return m.oswin1 ? 'oswin2' : 'oswin1';
  if (id === 'mira'){
    if (!m.mira1) return 'mira1';
    if ((D.items.helm || 0) > 0) return 'mira_helm';
    if (ort === 'brunnenplatz' && !m.mira_velmora) return 'mira_velmora';
    return 'mira_handel';
  }
  if (id === 'greta'){
    if (!m.greta1) return 'greta1';
    if ((D.items.nadel || 0) > 0) return 'greta_nadel';
    return m.greta_fertig ? 'greta_nach' : 'greta_warten';
  }
  if (id === 'kalden'){
    if (ort === 'brunnenplatz') return 'kalden_abschied';
    if (!m.kalden1) return 'kalden1';
    return 'kalden2';
  }
}

// Gespräche: Knoten mit Text und Antworten. „go“ ist der nächste Knoten, ohne „go“ endet es.
// text darf eine Funktion des Spielstands sein, Antworten mit „wenn“ erscheinen nur manchmal.
const GESPRAECHE = {
  /* ---------- Enna ---------- */
  enna1: {
    wer: 'enna', setze: 'enna1', start: 'a',
    k: {
      a: { text: 'Du bist aufgestanden. Die meisten bleiben liegen.', a: [
        { t: 'Wer bist du?', go: 'wer' }, { t: 'Wo bin ich?', go: 'wo' }, { t: 'Ich höre eine Glocke.', go: 'glocke' } ] },
      wer: { text: 'Enna. Ich hüte die Leuchtfeuer, solange es welche gibt. Früher waren es hundert entlang der Küste. Jetzt zähle ich sie an einer Hand.', a: [{ t: 'Wo bin ich?', go: 'wo' }, { t: 'Ich höre eine Glocke.', go: 'glocke' }] },
      wo: { text: 'An der Strandung. Hier spuckt die Flut aus, was sie nicht behalten will. Die Lebenden nennen euch Strandgut. Die meisten von euch sind leer, wenn sie aufstehen. Hohl wie Treibholz.', a: [{ t: 'Und ich?', go: 'licht' }] },
      glocke: { text: 'Tust du das. … Dann hör weiter hin. Und erzähl es niemandem, der eine Krone trägt. Oder eine Laterne.', setze: 'enna_glocke', a: [{ t: 'Du trägst selbst eine Laterne.', go: 'laterne' }, { t: 'Warum nicht?', go: 'licht' }] },
      laterne: { text: 'Ja. Merk dir, dass ich es dir trotzdem gesagt habe.', a: [{ t: 'Warum soll ich es niemandem sagen?', go: 'licht' }] },
      licht: { text: 'Sieh an dir hinunter. Da, unter dem nassen Hemd. Es leuchtet. Die Flut gibt selten etwas zurück, in dem noch Licht ist, und es gibt Leute, die genau danach suchen.', setze: 'enna_licht', a: [{ t: 'Wer sucht danach?', go: 'wer_sucht' }] },
      wer_sucht: { text: 'Der Vogt, zum Beispiel. Er geht nachts mit seiner Laterne den Strand ab und sieht jedem von euch in die Brust. Halt dich von ihm fern, solange du kannst. Du wirst es nicht lange können.', a: [{ t: 'Was ist mit der Flamme hier?', go: 'feuer' }] },
      feuer: { text: 'Die Glut, die du den Toten nimmst, macht dich stärker. Gib sie der Flamme, und die Flamme gibt sie dir zurück. Stirbst du, bleibt sie dort liegen, wo du gefallen bist. Hol sie dir, bevor du ein zweites Mal fällst.', a: [{ t: 'Und die Toten?', go: 'tote' }] },
      tote: { text: 'Wer an einem Leuchtfeuer rastet, ruft sie zurück. Das ist der Preis. Die Flamme heilt dich, und sie weckt alles, was du erschlagen hast.', a: [{ t: 'Wohin soll ich gehen?', go: 'wohin' }] },
      wohin: { text: 'Hinter dem Leuchtturm führt ein Pfad die Klippe hinauf, zur Mole. Dahinter steht der Nebel. Und hinter dem Nebel ist das Land. Der Leuchtturm selbst ist offen, falls du neugierig bist. Der Wärter braucht ihn nicht mehr.', a: [{ t: 'Danke, Enna.' }] }
    }
  },
  enna_rast: {
    wer: 'enna', start: 'a',
    k: {
      a: { text: D => !D.bosse.vogt ? 'Ruh dich aus. Die Klippe ist schlüpfrig, und der Knecht am Kettentor schlägt härter, als er aussieht. Er holt weit aus. Warte auf den Schlag, dann antworte.'
        : !D.merker.velmora ? 'Die Marsch ist still, aber nicht leer. Bleib auf dem Salzpfad, wenn du kannst. Was im Wasser liegt, schläft nur.'
        : 'Die Flamme brennt, solange du sie brauchst.', a: [
        { t: 'Was weißt du über das Licht in mir?', go: 'licht', wenn: D => D.merker.enna_licht && !D.merker.enna_licht2 },
        { t: 'Danke.' } ] },
      licht: { text: 'Weniger, als du glaubst. Mehr, als ich sagen will. Frag mich wieder, wenn du eine Glocke zum Schweigen gebracht hast.', setze: 'enna_licht2', a: [{ t: 'Das werde ich.' }] }
    }
  },
  enna_vogt: {
    wer: 'enna', setze: 'enna_vogt', start: 'a',
    k: {
      a: { text: 'Der Vogt ist gefallen. Thore Brandt. So hieß er, bevor er Vogt wurde. Einunddreißig Jahre hat er das Licht dort oben gehütet.', a: [
        { t: 'Er hat Strandgut gesammelt. Für wen?', go: 'wen' },
        { t: 'Ich habe sein Verzeichnis gelesen.', go: 'buch', wenn: D => D.gelesen.liste_vogt } ] },
      wen: { text: 'Das hat er nie gesagt. Aber niemand sammelt hundert Jahre lang für sich allein.', a: [{ t: 'Ich gehe weiter.' }] },
      buch: { text: '„Für die Mutter vom Wiederaufgang.“ … Ich hatte gehofft, es gibt sie nicht mehr. Sie glauben, der Mond gehört an den Himmel zurück. Um jeden Preis. Und Licht wie deins ist ein Teil dieses Preises.', setze: 'enna_mutter', a: [{ t: 'Wer ist die Mutter?', go: 'mutter' }] },
      mutter: { text: 'Keine Frau. Eine Kirche. Ein Versprechen. Sie tragen Laternen, weil sie auf ein Licht warten, das nicht kommt. Geh in die Marsch. Und zeig dein Licht niemandem.', a: [{ t: 'Ich gehe weiter.' }] }
    }
  },
  enna_treppe: {
    wer: 'enna', setze: 'enna_treppe', start: 'a',
    k: {
      a: { text: 'Du bist weit gekommen. Da oben ist sie. Isolde. Die Jüngste der fünf Kinder des Königs.', a: [{ t: 'Worauf wartet sie?', go: 'wartet' }, { t: 'Muss ich sie töten?', go: 'toeten' }] },
      wartet: { text: 'Auf einen Mann, der versprochen hat zu kommen, wenn die Glocke läutet. Sie läutet seit dreihundert Jahren.', a: [{ t: 'Muss ich sie töten?', go: 'toeten' }] },
      toeten: { text: 'Sie trägt einen Splitter der Krone, und er frisst sie auf. Du tust ihr keinen Gefallen, wenn du sie lässt. Aber du tust auch der Welt keinen, wenn du ihn nimmst. Das wirst du noch verstehen.', a: [
        { t: 'Kalden sagt, ich soll dir nicht trauen.', go: 'kalden', wenn: D => D.merker.kalden_warnung },
        { t: 'Das klingt nicht nach einer Antwort.', go: 'antwort' } ] },
      kalden: { text: 'Ser Kalden hat mit Vertrauen keine gute Hand. Frag ihn, warum er nicht selbst hinaufgeht. Frag ihn, wen er dort oben nicht sehen will.', setze: 'enna_kalden', a: [{ t: 'Ich gehe hinauf.' }] },
      antwort: { text: 'Nein. Es ist keine.', a: [{ t: 'Ich gehe hinauf.' }] }
    }
  },
  enna_ende: {
    wer: 'enna', setze: 'enna_ende', start: 'a',
    k: {
      a: { text: 'Eine Glocke weniger. Hörst du, wie still es geworden ist? … Und wie das Wasser steigt.', a: [{ t: 'Was bedeutet das?', go: 'was' }, { t: 'Das Licht in mir. Du wolltest es mir sagen.', go: 'licht', wenn: D => D.merker.enna_licht2 }] },
      was: { text: 'Dass du etwas getan hast, das man nicht zurücknimmt. Solange sie gewartet hat, stand das Meer still. Jetzt nicht mehr.', a: [{ t: 'Du hast es gewusst.', go: 'gewusst' }] },
      gewusst: { text: 'Ja. Und ich habe dich trotzdem gehen lassen. Weil der Splitter sie gefressen hätte, Stück für Stück, noch einmal dreihundert Jahre lang. Manchmal gibt es nur falsche Wege.', a: [{ t: 'Das Licht in mir. Du wolltest es mir sagen.', go: 'licht', wenn: D => D.merker.enna_licht2 }, { t: 'Ich ruhe mich aus.' }] },
      licht: { text: D => (D.merker.splitter_behalten ? 'Du trägst jetzt zwei Lichter. Ich höre beide. ' : 'Ich höre es, auch jetzt. ') + 'Als der König den Mond herunterholte, schmiedete er aus seinem Herzen die Krone. Aber ein Herz ist nie ganz aus einem Stück. Ein Rest blieb übrig. Er ist nie gefunden worden.', setze: 'enna_herz', a: [{ t: 'Bis jetzt.', go: 'bisjetzt' }] },
      bisjetzt: { text: 'Bis jetzt. Geh nach Osten, nach Grauhall. Dort läutet die nächste Glocke. Und sei vorsichtig, wem du dein Licht zeigst. Auch mir.', a: [{ t: 'Ich ruhe mich aus.' }] }
    }
  },

  /* ---------- Oswin ---------- */
  oswin1: {
    wer: 'oswin', setze: 'oswin1', start: 'a',
    k: {
      a: { text: 'Nicht … nicht näher. Ich weiß nicht, wie lange ich noch ich bin.', a: [{ t: 'Wer bist du?', go: 'wer' }, { t: 'Was ist mit dir?', go: 'was' }] },
      wer: { text: 'Oswin. Glaube ich. Die Flut hat mich ausgespuckt, wie dich. Vor Tagen. Oder Wochen. Man verliert das Zählen, wenn man hohl wird.', a: [{ t: 'Hohl?', go: 'was' }] },
      was: { text: 'Siehst du das nicht? Da ist nichts in mir. Kein Licht. Nur Salzwasser. Die anderen draußen zwischen den Wracks waren wie ich. Irgendwann stehen sie auf und wissen nicht mehr, wer sie waren.', a: [{ t: 'Kann ich dir helfen?', go: 'helfen' }] },
      helfen: { text: 'Du? … Du leuchtest ja. Heilige Flut, du leuchtest. Dann hör zu. Der Vogt, der mit der Laterne. Er holt die, die leuchten. Die Leeren lässt er liegen.', a: [{ t: 'Wohin bringt er sie?', go: 'wohin' }] },
      wohin: { text: 'Keiner kommt zurück, um es zu erzählen. Hier. Nimm das, ich hab es aus dem Kies gegraben. Mir nützt es nichts mehr.', gibt: { item: 'glockenerz' }, a: [{ t: 'Danke, Oswin.', go: 'bucht' }] },
      bucht: { text: 'Noch etwas. Unten am Strand, wo die Klippe ins Wasser geht, klingt der Fels hohl. Dahinter ist eine Bucht. Da unten wacht einer in Rüstung. Ich hab mich nicht getraut. Vielleicht du.', setze: 'oswin_bucht', a: [{ t: 'Ich sehe nach.' }] }
    }
  },
  oswin2: {
    wer: 'oswin', start: 'a',
    k: { a: { text: 'Geh. Bevor ich vergesse, wer du bist. … Wer du warst. Wer ich … Geh.', a: [{ t: 'Leb wohl, Oswin.' }] } }
  },

  /* ---------- Mira ---------- */
  mira1: {
    wer: 'mira', setze: 'mira1', start: 'a',
    k: {
      a: { text: 'Noch einer aus dem Wasser. Du tropfst auf meinen Steg.', a: [{ t: 'Wer bist du?', go: 'wer' }, { t: 'Was ist mit dem Dorf passiert?', go: 'dorf' }] },
      wer: { text: 'Mira. Ich tauche nach dem, was die Flut verschluckt hat, und verkaufe es an die, die noch bezahlen können. Also meistens an niemanden. Du hast Glut, oder? Die nehme ich.', a: [{ t: 'Was ist mit dem Dorf passiert?', go: 'dorf' }, { t: 'Suchst du etwas?', go: 'sucht' }] },
      dorf: { text: 'Die Flut kam höher als sonst. Wer nicht weg ist, steht jetzt draußen auf dem Salzpfad und wartet. Und Wenda, die Heilerin, ist in die Grube gegangen und nicht wiedergekommen. Frag Greta, wenn du mehr wissen willst. Sie redet nicht mit mir.', a: [{ t: 'Suchst du etwas?', go: 'sucht' }] },
      sucht: { text: 'Meinen Bruder. Jonte. Er ist nach Velmora getaucht, ins Hafenbecken, vor drei Wochen. Er wollte Glockenbronze holen, die bringt am meisten. Er hat gesagt, er ist zurück, bevor das Netz fertig ist.', a: [{ t: 'Ich halte Ausschau nach ihm.', go: 'auftrag' }] },
      auftrag: { text: 'Sein Helm hat seinen Namen eingeritzt. Wenn du ihn findest, bring ihn mir. Den Helm, meine ich. Ihn bringst du mir nicht mehr. Das weiß ich.', setze: 'mira_auftrag', a: [{ t: 'Zeig mir, was du hast.', laden: true }, { t: 'Ich mache mich auf den Weg.' }] }
    }
  },
  mira_velmora: {
    wer: 'mira', setze: 'mira_velmora', start: 'a',
    k: {
      a: { text: 'Ich bin dir nachgekommen. Irgendwer muss ja deine Glut nehmen. Der Hafen ist dort drüben. Zwischen den Schiffen ist etwas, das ich nicht sehen will. Und darunter, im Becken … da hat Jonte getaucht.', a: [{ t: 'Zeig mir, was du hast.', laden: true }, { t: 'Ich sehe nach.' }] }
    }
  },
  mira_handel: {
    wer: 'mira', start: 'a',
    k: { a: { text: D => D.merker.mira_wahr ? 'Ich tauche nicht mehr im Hafen. Aber handeln kann ich noch.' : D.merker.mira_luege ? 'Ich träume jetzt von ihm. Er lächelt im Traum. Danke dafür. … Also. Glut gegen Ware.' : 'Glut gegen Ware. Das ist das einzige Gesetz, das noch gilt.', a: [{ t: 'Zeig mir, was du hast.', laden: true }, { t: 'Später.' }] } }
  },
  mira_helm: {
    wer: 'mira', start: 'a',
    k: {
      a: { text: 'Du hast da etwas in der Hand.', a: [{ t: 'Den Helm deines Bruders.', go: 'helm' }] },
      helm: { text: '… Das ist er. Das ist sein Helm. Wie … wie hast du ihn gefunden?', a: [
        { t: 'Er lag am Grund. Er hat nicht gelitten.', go: 'luege', setze: 'mira_luege', sub: 'Lügen' },
        { t: 'Er war einer von ihnen. Ich musste gegen ihn kämpfen.', go: 'wahr', setze: 'mira_wahr', sub: 'Die Wahrheit sagen' } ] },
      luege: { text: 'Am Grund. … Gut. Das ist gut. Dann hat er einfach geschlafen, oder? Einfach … Danke. Hier. Das hat er mir geschenkt, als wir Kinder waren. Er würde wollen, dass es jemand trägt, der zurückkommt.', nimmt: 'helm', gibt: { tal: 'taucherstein' }, setze: 'mira_helm', a: [{ t: 'Was wirst du jetzt tun?', go: 'jetzt' }] },
      wahr: { text: '… Einer von denen. Die draußen auf dem Salzpfad stehen und warten. Jonte. … Hat er etwas gesagt?', a: [{ t: 'Er hat nach dir gefragt.', go: 'gefragt' }] },
      gefragt: { text: 'Natürlich hat er das. Der Idiot. Hier. Das hat er mir geschenkt, als wir Kinder waren. Und die hier hat er für mich gesammelt. Er hat nie verstanden, dass ich nur ihn wollte, nicht das Erz.', nimmt: 'helm', gibt: { tal: 'taucherstein', item: ['glockenerz', 2] }, setze: 'mira_helm', a: [{ t: 'Was wirst du jetzt tun?', go: 'jetzt' }] },
      jetzt: { text: 'Weitertauchen. Jonte hat immer gesagt, unter Velmora gibt es noch etwas. Tiefer als der Hafen, tiefer als alles. Ich dachte, er spinnt. Vielleicht sehe ich nach. Vielleicht nicht.', setze: 'mira_tiefe', a: [{ t: 'Pass auf dich auf, Mira.' }] }
    }
  },

  /* ---------- Greta ---------- */
  greta1: {
    wer: 'greta', setze: 'greta1', start: 'a',
    k: {
      a: { text: 'Du bist nicht von hier. Keiner ist mehr von hier.', a: [{ t: 'Was ist mit dem Dorf geschehen?', go: 'dorf' }, { t: 'Du flickst ein Netz. Für wen?', go: 'netz' }] },
      dorf: { text: 'Das Wasser ist gekommen, wie jedes Jahr. Nur ist es diesmal nicht wieder gegangen. Die Glocke von Velmora bleibt aus, und das Meer merkt es.', a: [{ t: 'Du flickst ein Netz. Für wen?', go: 'netz' }] },
      netz: { text: 'Für Hark. Meinen Mann. Er ist vor einem Monat in die Salzgrube gestiegen, um Salz zu schlagen. Wenda war schon unten. Die Heilerin. Sie hat gesagt, sie bewahrt die Toten vor dem Meer.', a: [{ t: 'Und Hark?', go: 'hark' }] },
      hark: { text: 'Ist nicht wiedergekommen. Keiner kommt wieder aus der Grube. Aber ich flicke weiter. Wenn ich aufhöre, heißt das, ich glaube es.', a: [{ t: 'Soll ich nach ihm sehen?', go: 'auftrag' }] },
      auftrag: { text: 'Er trägt eine Nadel aus Walknochen, mit der er Netze flickt. Die gibt er nie aus der Hand. Wenn du sie findest, bring sie mir. Dann weiß ich es. Die Grube liegt hinter den Häusern, wo das Salz aus dem Boden wächst.', setze: 'greta_auftrag', a: [{ t: 'Ich suche sie.' }] }
    }
  },
  greta_warten: {
    wer: 'greta', start: 'a',
    k: { a: { text: 'Die Grube liegt hinter den Häusern. Hinter dem Pfahl mit dem Rad. Pass auf, wo du hintrittst. Das Salz dort unten wächst spitz.', a: [{ t: 'Ich gehe.' }] } }
  },
  greta_nadel: {
    wer: 'greta', setze: 'greta_fertig', start: 'a',
    k: {
      a: { text: 'Du warst unten. Ich sehe es an deinen Stiefeln. Weiß vom Salz.', a: [{ t: 'Ich habe seine Nadel.', go: 'nadel' }] },
      nadel: { text: '… Seine Nadel. Er hat sie nie aus der Hand gegeben. Nie.', nimmt: 'nadel', a: [
        { t: 'Er hat dir etwas geschrieben.', go: 'brief', wenn: D => D.gelesen.brief_hark },
        { t: 'Wenda hat ihn im Salz bewahrt.', go: 'wenda', wenn: D => D.gelesen.tagebuch_wenda || D.bosse.hexe },
        { t: '(Schweigen)', go: 'dank' } ] },
      brief: { text: '„Flick sie für dich.“ … Das sieht ihm ähnlich. Er konnte nie etwas Schönes sagen, ohne dass es wehtut.', a: [{ t: '(Schweigen)', go: 'dank' }] },
      wenda: { text: 'Wenda. Sie hat immer gesagt, das Meer soll niemanden mehr bekommen. Ich hätte nie gedacht, dass sie es so meint. Sie hat uns alle entbunden, weißt du. Auch Hark.', a: [{ t: '(Schweigen)', go: 'dank' }] },
      dank: { text: 'Hier. Hark hat ihn gefunden, im ersten Jahr, in der Grube. Wir wollten ihn verkaufen, wenn es schlimm wird. Es ist schlimm. Aber anders, als wir dachten.', gibt: { item: 'mondtau' }, a: [{ t: 'Danke, Greta.' }] }
    }
  },
  greta_nach: {
    wer: 'greta', start: 'a',
    k: { a: { text: 'Ich flicke weiter. Nicht mehr für ihn. Irgendwer muss ja. Und das Netz hält noch.', a: [{ t: 'Leb wohl, Greta.' }] } }
  },

  /* ---------- Ser Kalden ---------- */
  kalden1: {
    wer: 'kalden', setze: 'kalden1', start: 'a',
    k: {
      a: { text: 'Nicht schlecht, für Strandgut. Ser Kalden. Einst von der Kronwacht. Jetzt nur noch Kalden.', a: [{ t: 'Die Kronwacht?', go: 'wacht' }, { t: 'Was ist in Velmora?', go: 'velmora' }] },
      wacht: { text: 'Die Ritter des Königs. Wir haben geschworen, die Krone zu schützen. Die Krone ist zerbrochen, also haben wir unseren Schwur wohl gebrochen. So sehen es jedenfalls die, die noch leben.', a: [
        { t: 'In der Bucht lag ein Ritter der Kronwacht.', go: 'bucht', wenn: D => D.gelesen.schild_ritter },
        { t: 'Was ist in Velmora?', go: 'velmora' } ] },
      bucht: { text: '„Die Krone ist es nicht wert.“ Hat er das geschrieben? … Aldric. Er hat immer zu viel gedacht. Gut, dass er Ruhe hat.', a: [{ t: 'Was ist in Velmora?', go: 'velmora' }] },
      velmora: { text: 'Isolde. Die Jüngste der fünf. Sie trägt einen Splitter der Krone, oben im Glockenturm, und sie lässt niemanden hinauf.', a: [{ t: 'Du kennst sie?', go: 'kennt' }, { t: 'Warum bist du hier?', go: 'warum' }] },
      kennt: { text: 'Jeder in Velmora kannte sie. Das ist lange her. … Sehr lange.', a: [{ t: 'Warum bist du hier?', go: 'warum' }] },
      warum: { text: 'Weil jemand die Splitter zurückholen muss, bevor sie alles zerfressen, was sie tragen. Allein schaffe ich es nicht. Vielleicht schaffst du es.', a: [{ t: 'Warum schaffst du es nicht?', go: 'nicht' }] },
      nicht: { text: 'Das geht dich nichts an. Pass auf die Brücke auf. Die Pfeiler sind älter als ich, und das will etwas heißen. Wir sehen uns in Velmora. Wenn du bis dahin noch stehst.', a: [{ t: 'Leb wohl, Kalden.' }] }
    }
  },
  kalden2: {
    wer: 'kalden', setze: 'kalden2', start: 'a',
    k: {
      a: { text: 'Du bist also so weit gekommen. Hör zu. Wenn sie die große Glocke läutet, lauf nicht weg. Weich aus, wenn der Klang dich erreicht, nicht vorher.', a: [
        { t: 'Ich habe das Bild in der Gruft gesehen.', go: 'bild', wenn: D => D.gelesen.portrait_gruft },
        { t: 'Danke für den Rat.', go: 'splitter' } ] },
      bild: { text: '… Dann weißt du es.', a: [{ t: 'Warum gehst du nicht selbst hinauf?', go: 'warum' }] },
      warum: { text: 'Man rief die Kronwacht nach Grauhall, in der Nacht unserer Verlobung. Die Nacht, in der der König starb. Ich habe geschworen, die Splitter zu schützen, und ein Splitter ging an sie. Ich durfte nicht zu ihr. Nicht als ihr Mann. Nur als ihr Wächter.', a: [{ t: 'Und dann?', go: 'dann' }] },
      dann: { text: 'Dann ist das Jahrhundert vergangen. Dann das nächste. Irgendwann war ich zu feige, noch zu gehen. Geh hinauf. Ich kann es nicht. Ich kann ihr nicht in die Augen sehen, wenn sie mich nicht mehr erkennt.', setze: 'kalden_erkannt', a: [{ t: 'Ich gehe.' }] },
      splitter: { text: 'Und wenn du den Splitter bekommst … bring ihn nicht zu Enna.', a: [{ t: 'Warum nicht?', go: 'enna' }] },
      enna: { text: 'Weil ich nicht weiß, auf wessen Seite sie steht. Sie ist älter, als sie aussieht. Viel älter. Und du weißt es auch nicht.', setze: 'kalden_warnung', a: [{ t: 'Ich werde darüber nachdenken.' }] }
    }
  },
  kalden_abschied: {
    wer: 'kalden', setze: 'kalden_fort', start: 'a',
    k: {
      a: { text: D => D.merker.splitter_kalden
        ? 'Ich bringe ihn dorthin, wo er hingehört. Nach Grauhall. Zu dem, was von der Kronwacht übrig ist. Und dann … dann halte ich zum ersten Mal seit dreihundert Jahren ein Versprechen.'
        : 'Du hast ihn behalten. Ich hoffe, du weißt, was du da trägst. Sie wusste es auch nicht, am Anfang.', a: [{ t: 'Was wirst du tun?', go: 'tun' }] },
      tun: { text: 'Nach Osten gehen. Die nächste Glocke hängt in Grauhall, und sie wird von jemandem geläutet, den ich einmal meinen Herrn genannt habe. Wir sehen uns dort, Strandgut. So oder so.', a: [{ t: 'Leb wohl, Kalden.' }] }
    }
  }
};

/* ---------- Laden ---------- */
const LADEN = {
  mira: [
    { id: 'glockenerz', art: 'item', preis: 250, vorrat: 5 },
    { id: 'muschel', art: 'tal', preis: 900, vorrat: 1 }
  ]
};

/* ---------- Anfang ---------- */
const ANFANG = {
  erwachen: [
    'Salz im Mund. Kies unter den Händen.',
    'Das Meer hat dich ausgespuckt, zwischen Tang und Treibholz, an einen Strand, dessen Namen du nicht kennst. Deinen eigenen kennst du auch nicht mehr.',
    'Irgendwo läutet eine Glocke. Leise und gleichmäßig, wie ein Herzschlag. Und in deiner Brust schlägt etwas mit.'
  ],
  herkunft: ['Neben dir im Kies liegt, was dir geblieben ist. Deine Hand greift danach, als wüsste sie besser als du, wer du warst.']
};
const SAETZE = {
  'feuer.tod': 'Du erwachst am Leuchtfeuer. Die Flut hat dich ein weiteres Mal ausgespuckt.',
  'feuer.rast': 'Die Flamme brennt ruhig. Du rastest. Deine Wunden schließen sich, und die Phiolen füllen sich mit Mondtau. Irgendwo stehen die Toten wieder auf.'
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
  for (const k in SAETZE) z.push({ id: k, wer: 'erzaehler', text: SAETZE[k] });
  for (const k in FEINDE){
    const d = FEINDE[k], wer = SPRECHER[k] ? k : 'erzaehler';
    if (d.intro) z.push({ id: k + '.intro', wer, text: d.intro });
    (d.phasen || []).forEach((p, i) => { if (p.line) z.push({ id: k + '.phase' + (i + 1), wer, text: p.line }); });
  }
  return z;
}
