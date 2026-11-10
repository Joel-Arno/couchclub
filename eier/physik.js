/* Eier-Timer – Rechenmodell.
 *
 * Grundlage ist Charles Williams' Modell: Das Ei ist eine Kugel aus Eimasse,
 * die Wärme von außen nach innen leitet. Seine bekannte Formel
 *
 *   t = 0,451 · M^(2/3) · ln(0,76 · (T_Ei − T_Wasser) / (T_Eigelb − T_Wasser))
 *
 * ist das erste Glied der exakten Lösung für Wasser mit fester Temperatur.
 * Hier wird die ganze Reihe gerechnet (MODEN Glieder) und Sekunde für Sekunde
 * mit der Wassertemperatur gekoppelt. So lassen sich auch abbilden:
 *   - kaltes Wasser, das erst aufheizt (kaltes Aufsetzen)
 *   - kochendes Wasser, das durch viele kalte Eier kurz abkühlt
 *   - Nachgaren nach dem Herausnehmen, an der Luft oder im kalten Wasser
 *
 * Garpunkt: die höchste Temperatur am Rand des Eigelbs, nachdem das Ei aus dem
 * Topf genommen wurde. Alle Konstanten stehen in config.js.
 */
(function (root) {
  'use strict';

  const PI = Math.PI;

  // ---------- Luftdruck und Siedepunkt ----------

  /** Siedepunkt von Wasser in °C bei Luftdruck p (hPa), Antoine-Gleichung */
  function siedepunkt(hPa, C) {
    const { A, B, C: c } = C.ANTOINE;
    return B / (A - Math.log10(hPa * 0.750062)) - c;
  }

  /** Luftdruck in hPa aus der Höhe über dem Meer (Standardatmosphäre) */
  function druckAusHoehe(meter, C) {
    return C.NORMALDRUCK * Math.pow(1 - 2.25577e-5 * meter, 5.25588);
  }

  // ---------- Ei als Kugel ----------

  /** Zeitkonstante des ersten Glieds in Sekunden (Williams, mit Praxisfaktor) */
  function zeitkonstante(gramm, C) {
    return C.PRAXISFAKTOR * C.WILLIAMS_K * Math.pow(gramm, 2 / 3) * 60;
  }

  /** Radius der Kugel in Metern */
  function radius(gramm, C) {
    return Math.cbrt((3 * gramm / C.EI_DICHTE) / (4 * PI)) / 100;
  }

  /**
   * Innen läuft die Rechnung über u = T − T_Wasser, zerlegt in Glieder b[n].
   * Temperatur am Eigelbrand: T_Wasser + Σ a[n]·b[n]
   * Mittlere Temperatur des Eis: T_Wasser + Σ m[n]·b[n]
   * Jedes Glied klingt mit exp(−n²·t/τ) ab.
   */
  function koeffizienten(N, x) {
    const a = new Float64Array(N), m = new Float64Array(N), k = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const n = i + 1;
      a[i] = 2 * (n % 2 ? 1 : -1) * Math.sin(n * PI * x) / (n * PI * x);
      m[i] = 6 / (n * n * PI * PI);
      k[i] = n * n;
    }
    return { a, m, k };
  }

  // ---------- Kochen ----------

  /**
   * Rechnet Wasser und Ei Sekunde für Sekunde.
   * p: { gramm, anzahl, liter, siede, tEi, kalt, watt, tStart, nurAufheizen, stopBei }
   * stopBei: aufhören, sobald der Eigelbrand im Topf diese Temperatur hat
   * Ergebnis: { aufheiz (s bis zum Kochen), tw[], b[][] ab Kochbeginn, wasserMin }
   */
  function simuliere(p, C) {
    const N = C.MODEN, dt = C.ZEITSCHRITT;
    const tau = zeitkonstante(p.gramm, C);
    const { a, m, k } = koeffizienten(N, C.EIGELB_RAND);
    const stopBei = p.stopBei ?? Infinity;
    const lam = Array.from(k, (kk) => kk / tau);
    const dec = lam.map((l) => Math.exp(-l * dt));
    const ram = lam.map((l, i) => (1 - dec[i]) / (l * dt));
    const capEier = p.anzahl * p.gramm * C.EI_WAERMEKAPAZITAET;
    const capWasser = p.liter * 1000 * C.WASSER_WAERMEKAPAZITAET;

    let tw = p.kalt ? p.tStart : p.siede;
    let b = new Float64Array(N).fill(p.tEi - tw);
    let dTw = 0, t = 0, kocht = !p.kalt, aufheiz = 0, wasserMin = tw;
    const tws = [], bs = [];
    if (kocht) { tws.push(tw); bs.push(b); }
    const maxHeiz = 3 * 3600, maxKoch = C.MAX_KOCHZEIT_MIN * 60;

    while (true) {
      // Ei: ein Schritt bei linear veränderter Wassertemperatur (exakt je Glied)
      const nb = new Float64Array(N);
      let du = 0;
      for (let i = 0; i < N; i++) {
        nb[i] = b[i] * dec[i] - dTw * ram[i];
        du += m[i] * (nb[i] - b[i]);
      }
      // Wasser: Herd minus Wärme, die die Eier aufgenommen haben. Die Änderung
      // wirkt im nächsten Schritt; über dem Siedepunkt verdampft der Rest.
      const q = capEier * (du + dTw);
      tw += dTw;
      let twNeu = tw + (p.watt * dt - q) / capWasser;
      if (!(twNeu < p.siede)) twNeu = p.siede;
      dTw = twNeu - tw;
      b = nb;
      t += dt;
      if (kocht) {
        wasserMin = Math.min(wasserMin, tw);
        tws.push(tw); bs.push(b);
        if (tws.length > maxKoch / dt) break;
        if (stopBei < Infinity) {
          let rand = tw;
          for (let i = 0; i < N; i++) rand += a[i] * b[i];
          if (rand >= stopBei) break;
        }
      } else if (tw >= p.siede - 1e-9) {
        // Wasser kocht: ab hier zählt der Timer
        kocht = true; aufheiz = t;
        tw = p.siede; dTw = 0;
        if (p.nurAufheizen) break;
        tws.push(tw); bs.push(b);
      } else if (t > maxHeiz) {
        aufheiz = Infinity; break;
      }
    }
    return { aufheiz, tw: tws, b: bs, wasserMin, tau };
  }

  // ---------- Nach dem Herausnehmen ----------

  /** Nullstellen von 1 − μ·cot μ = Bi (Kugel mit Wärmeübergang an der Oberfläche) */
  function robinWurzeln(bi, K) {
    const mu = new Float64Array(K);
    const f = (x) => 1 - x / Math.tan(x) - bi;
    for (let k = 1; k <= K; k++) {
      let lo = (k - 1) * PI + 1e-9, hi = k * PI - 1e-9;
      for (let it = 0; it < 80; it++) {
        const mid = (lo + hi) / 2;
        if (f(mid) < 0) lo = mid; else hi = mid;
      }
      mu[k - 1] = (lo + hi) / 2;
    }
    return mu;
  }

  /** ∫₀¹ sin(a·x)·sin(b·x) dx */
  function sinsin(a, b) {
    if (Math.abs(a - b) < 1e-9) return 0.5 - Math.sin(2 * a) / (4 * a);
    return Math.sin(a - b) / (2 * (a - b)) - Math.sin(a + b) / (2 * (a + b));
  }

  /**
   * Bereitet das Nachgaren vor: Wärmeübergang h (W/m²K) an Umgebung tUmg.
   * Liefert eine Funktion (tWasser, b) → höchste Temperatur am Eigelbrand danach.
   */
  function nachgaren(gramm, h, tUmg, C) {
    const N = C.MODEN, K = C.MODEN, x0 = C.EIGELB_RAND;
    const tau = zeitkonstante(gramm, C);
    const bi = h * radius(gramm, C) / C.EI_WAERMELEITUNG;
    const mu = robinWurzeln(bi, K);
    const norm = Array.from(mu, (u) => 0.5 - Math.sin(2 * u) / (4 * u));
    const konst = Array.from(mu, (u, k) => (Math.sin(u) - u * Math.cos(u)) / (u * u) / norm[k]);
    const proj = [];
    for (let k = 0; k < K; k++) {
      const row = new Float64Array(N);
      for (let i = 0; i < N; i++) {
        const n = i + 1;
        row[i] = 2 * (n % 2 ? 1 : -1) / (n * PI) * sinsin(n * PI, mu[k]) / norm[k];
      }
      proj.push(row);
    }
    const phi0 = Array.from(mu, (u) => Math.sin(u * x0) / x0);
    const schritte = Math.round(C.NACHLAUF_MIN * 60 / 2);
    const abkl = [];
    for (let s = 0; s <= schritte; s++) {
      abkl.push(Array.from(mu, (u) => Math.exp(-(u * u) / (PI * PI) * (s * 2) / tau)));
    }

    return function spitze(tWasser, b) {
      const d = new Float64Array(K);
      for (let k = 0; k < K; k++) {
        let s = (tWasser - tUmg) * konst[k];
        const row = proj[k];
        for (let i = 0; i < N; i++) s += row[i] * b[i];
        d[k] = s * phi0[k];
      }
      let max = -Infinity, vorher = -Infinity;
      for (let s = 0; s <= schritte; s++) {
        const e = abkl[s];
        let v = 0;
        for (let k = 0; k < K; k++) v += d[k] * e[k];
        if (v > max) max = v;
        if (v < vorher - 0.5) break; // fällt deutlich: Höhepunkt ist vorbei
        vorher = v;
      }
      return tUmg + max;
    };
  }

  /** Kleinste Sekunde ab Kochbeginn, nach der der Eigelbrand die Zieltemperatur erreicht */
  function findeZeit(sim, ziel, spitze) {
    const n = sim.tw.length;
    if (spitze(sim.tw[0], sim.b[0]) >= ziel) return 0;
    if (spitze(sim.tw[n - 1], sim.b[n - 1]) < ziel) return null;
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (spitze(sim.tw[mid], sim.b[mid]) >= ziel) hi = mid; else lo = mid;
    }
    return hi;
  }

  /** Herdleistung, mit der das Wasser genau nach `sekunden` kocht */
  function herdAusAufheizzeit(sekunden, p, C) {
    let lo = 50, hi = 20000;
    for (let it = 0; it < 26; it++) {
      const mid = Math.sqrt(lo * hi);
      const s = simuliere({ ...p, watt: mid, nurAufheizen: true }, C).aufheiz;
      if (s > sekunden) lo = mid; else hi = mid;
    }
    return Math.sqrt(lo * hi);
  }

  /**
   * Hauptrechnung.
   * e: { groesse, start, garstufe, anzahl, topf, kalt, abschrecken, druck, aufheizGemessen? }
   */
  function berechne(e, C) {
    const gramm = C.GROESSEN[e.groesse].gramm;
    const tEi = C.STARTTEMPERATUR[e.start].grad;
    const ziel = C.GARSTUFEN[e.garstufe].ziel;
    const liter = C.TOEPFE[e.topf].liter;
    const siede = siedepunkt(e.druck, C);
    const basis = {
      gramm, anzahl: e.anzahl, liter, siede, tEi, kalt: !!e.kalt,
      tStart: Math.min(C.LEITUNGSWASSER, siede - 1), watt: C.HERD_WATT,
      stopBei: ziel + 3, // danach kann der Garpunkt nur noch früher liegen
    };
    if (basis.kalt && e.aufheizGemessen > 0) {
      basis.watt = herdAusAufheizzeit(e.aufheizGemessen, basis, C);
    }

    const dt = C.ZEITSCHRITT;
    const sek = (i) => (i === null ? null : i * dt);
    const sim = simuliere(basis, C);
    const quench = nachgaren(gramm, C.WAERMEUEBERGANG_ABSCHRECKEN, C.ABSCHRECKWASSER, C);
    const luft = nachgaren(gramm, C.WAERMEUEBERGANG_LUFT, C.RAUMTEMPERATUR, C);
    const mitAbschrecken = sek(findeZeit(sim, ziel, quench));
    const zeit = e.abschrecken ? mitAbschrecken : sek(findeZeit(sim, ziel, luft));

    const r = {
      gramm, tEi, ziel, siede, druck: e.druck, liter,
      kochzeit: zeit,                 // Sekunden ab Einlegen bzw. ab dem Kochen
      erreichbar: zeit !== null,
      sofort: zeit === 0 && basis.kalt,
      aufheiz: basis.kalt ? sim.aufheiz : 0,
      herdWatt: basis.watt,
      wasserMin: sim.wasserMin,
      nachgarAbzug: (!e.abschrecken && zeit !== null && mitAbschrecken !== null) ? mitAbschrecken - zeit : 0,
      abkuehlZuschlag: 0,
      williams: null,
    };

    if (!basis.kalt && zeit !== null) {
      // Vergleich: Wasser bleibt trotz der Eier am Sieden
      const ideal = simuliere({ ...basis, watt: Infinity }, C);
      const t0 = sek(findeZeit(ideal, ziel, e.abschrecken ? quench : luft));
      if (t0 !== null) r.abkuehlZuschlag = zeit - t0;
      // Williams' Formel pur (erstes Glied, ohne Praxisfaktor, ohne Nachgaren)
      if (ziel < siede && tEi < ziel) {
        r.williams = C.WILLIAMS_K * Math.pow(gramm, 2 / 3) * 60 *
          Math.log(0.76 * (tEi - siede) / (ziel - siede));
      }
    }
    return r;
  }

  const api = { siedepunkt, druckAusHoehe, zeitkonstante, radius, simuliere, nachgaren, findeZeit, herdAusAufheizzeit, berechne };
  if (typeof module !== 'undefined') module.exports = api;
  else root.EierPhysik = api;
})(this);
