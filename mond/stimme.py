#!/usr/bin/env python3
"""Erzeugt die Sprachaufnahmen für Mondgeläut mit freien deutschen Piper-Stimmen.

    python3 mond/stimme.py --modelle ORDNER            alle geänderten Zeilen neu sprechen
    python3 mond/stimme.py --modelle ORDNER --alle     alles neu sprechen
    python3 mond/stimme.py --liste                     nur die Sprechzeilen anzeigen
    python3 mond/stimme.py --pruefen [ID ...]          Aufnahmen mit Spracherkennung gegenlesen

Welche Zeilen es gibt und wer sie spricht, steht in src/daten-welt.js (stimmZeilen und
SPRECHER, die Gegner kommen aus src/daten-kampf.js). Das Skript liest das über Node aus,
damit Text und Stimme nie auseinanderlaufen.

Voraussetzungen, nur zum Erzeugen (das Spiel selbst braucht nichts davon):
    pip install piper-tts lameenc
    Stimmen als .onnx und .onnx.json im Modellordner, zum Beispiel de_DE-thorsten-high,
    von https://huggingface.co/rhasspy/piper-voices (Ordner de/de_DE)

Ergebnis: src/stimme/<id>.mp3 und src/stimme/index.json. build.py bettet sie ins Spiel ein.

Alle Effekte (Tiefe, Flüsterschicht, Chorus, Hall) stecken fertig in der MP3, das Spiel
spielt sie nur noch ab. --pruefen lässt Whisper (pip install faster-whisper) jede Aufnahme
abschreiben, genau so, wie sie im Spiel klingt, und vergleicht mit dem Text. Wörter, die dabei immer wieder falsch ankommen,
bekommen einen Eintrag in AUSSPRACHE. Seltene Wörter wie Phiolen kennt Whisper oft nicht,
dort lohnt ein Blick auf die Umschrift statt auf die Punktzahl.
"""
import argparse
import hashlib
import json
import pathlib
import re
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / "src"
OUT = SRC / "stimme"
KBPS = 48

# Aussprachehilfen: nur für die Stimme, der Text im Spiel bleibt unverändert.
# Gefunden, indem die Aufnahmen mit einer Spracherkennung gegengelesen wurden.
AUSSPRACHE = {
    "Strandvogt": "Strand-Fohkt",
    "Mondtau": "Mond-Tau",
    "Laterne": "La-Terne",
    "Mole": "Mohle",
}


def zeilen():
    js = "\n".join((SRC / f).read_text(encoding="utf-8") for f in ("daten-kampf.js", "daten-welt.js"))
    code = js + "\nprocess.stdout.write(JSON.stringify({ z: stimmZeilen(), s: SPRECHER }));"
    res = subprocess.run(["node", "-e", code], capture_output=True, text=True, check=True)
    data = json.loads(res.stdout)
    return data["z"], data["s"]


def gesprochen(text):
    for wort, laut in AUSSPRACHE.items():
        text = re.sub(rf"\b{wort}\b", laut, text)
    return text


def schluessel(zeile, sprecher):
    # Ändert sich Text, Aussprache, Stimme oder ein Effekt, wird die Zeile neu gesprochen
    sp = {k: v for k, v in sprecher[zeile["wer"]].items() if k not in ("name", "laut")}
    roh = json.dumps([gesprochen(zeile["text"]), sp], ensure_ascii=False, sort_keys=True)
    return hashlib.sha1(roh.encode()).hexdigest()[:16]


# ---------- Klangeffekte, nur mit numpy ----------
# Werte in SPRECHER (alle freiwillig, 0 heißt aus):
#   tiefe      Abspielrate < 1 macht die Stimme tiefer und langsamer (wie ein langsamer laufendes Band)
#   fluestern  Anteil einer geflüsterten Schicht derselben Aufnahme, klingt geisterhaft
#   chorus     zwei leicht verzögerte Kopien, klingt nach mehreren Stimmen zugleich
#   rau        Übersteuerung, klingt kratzig und bedrohlich
#   dunkel     nimmt Höhen weg
#   hall       Anteil im Hall, hallzeit in Sekunden

def _spektrum_filter(x, rate, kurve):
    import numpy as np
    n = 1 << (len(x) - 1).bit_length()
    X = np.fft.rfft(x, n)
    f = np.fft.rfftfreq(n, 1 / rate)
    return np.fft.irfft(X * kurve(f), n)[:len(x)]


def _fluestern(x, rng, n=512, hop=128):
    """Flüsterfassung derselben Aufnahme: Lautstärke je Frequenz bleibt, die Tonhöhe verschwindet."""
    import numpy as np
    win = np.hanning(n)
    pad = np.concatenate([np.zeros(n), x, np.zeros(n)])
    out, norm = np.zeros(len(pad)), np.zeros(len(pad))
    for s in range(0, len(pad) - n, hop):
        X = np.fft.rfft(pad[s:s + n] * win)
        y = np.fft.irfft(np.abs(X) * np.exp(1j * rng.uniform(0, 2 * np.pi, len(X))), n) * win
        out[s:s + n] += y; norm[s:s + n] += win ** 2
    return (out / np.maximum(norm, 1e-6))[n:n + len(x)]


def _chorus(x, rate, anteil):
    import numpy as np
    t = np.arange(len(x)) / rate
    out, idx = x.copy(), np.arange(len(x))
    for basis, tiefe, f, ph in ((.019, .004, .55, 0), (.028, .005, .41, 1.9)):
        d = (basis + tiefe * np.sin(2 * np.pi * f * t + ph)) * rate
        out += anteil * np.interp(idx - d, idx, x, left=0, right=0)
    return out


def _hall(x, rate, anteil, zeit, rng):
    import numpy as np
    n = int(rate * zeit)
    ir = rng.standard_normal(n) * np.exp(-6.9 * np.arange(n) / n)
    ir = _spektrum_filter(ir, rate, lambda f: 1 / np.sqrt(1 + (f / 3500) ** 2))
    ir = np.concatenate([np.zeros(int(rate * .025)), ir])
    ir /= np.sqrt(np.sum(ir ** 2))
    laenge = len(x) + len(ir)
    m = 1 << (laenge - 1).bit_length()
    nass = np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[:laenge]
    trocken = np.concatenate([x, np.zeros(len(ir))])
    nass *= np.sqrt(np.mean(x ** 2)) / max(np.sqrt(np.mean(nass[:len(x)] ** 2)), 1e-9)
    return trocken * (1 - anteil * .35) + nass * anteil


def effekte(x, rate, sp, rng):
    import numpy as np
    tiefe = sp.get("tiefe", 1)
    if tiefe != 1:
        x = np.interp(np.linspace(0, len(x) - 1, int(len(x) / tiefe)), np.arange(len(x)), x)
    ende = len(x) / rate
    if sp.get("fluestern"):
        w = _fluestern(x, rng)
        w = _spektrum_filter(w, rate, lambda f: np.clip(f / 400, 0, 1))
        w *= np.sqrt(np.mean(x ** 2)) / max(np.sqrt(np.mean(w ** 2)), 1e-9)
        x = x + sp["fluestern"] * w
    if sp.get("chorus"):
        x = _chorus(x, rate, sp["chorus"])
    if sp.get("rau"):
        k = 1 + sp["rau"] * 8
        x = np.tanh(x / max(np.max(np.abs(x)), 1e-9) * k) / np.tanh(k)
    if sp.get("dunkel"):
        grenze = 9000 - 7000 * sp["dunkel"]
        x = _spektrum_filter(x, rate, lambda f: 1 / np.sqrt(1 + (f / grenze) ** 4))
    if sp.get("hall"):
        x = _hall(x, rate, sp["hall"], sp.get("hallzeit", 2.4), rng)
        # Ausklingen kürzen, sobald es sehr leise ist
        leise = np.where(np.abs(x) > np.max(np.abs(x)) * .004)[0]
        if len(leise):
            x = x[:leise[-1] + int(rate * .05)]
    return x, ende


def sprechen(stimme, text, sp):
    """Liefert fertige 16-Bit-Daten, Abtastrate, Gesamtdauer und den Zeitpunkt, an dem die Sprache endet."""
    import numpy as np
    from piper import SynthesisConfig

    cfg = SynthesisConfig(length_scale=sp["tempo"])
    if sp.get("sprecher"):
        cfg.speaker_id = stimme.config.speaker_id_map[sp["sprecher"]]
    elif sp.get("sprecher_id") is not None:
        # Stimmen mit vielen Sprechern (etwa de_DE-mls-medium) werden über die Nummer gewählt
        cfg.speaker_id = sp["sprecher_id"]
    teile, rate = [], stimme.config.sample_rate
    pause = np.zeros(int(rate * .28), dtype=np.float32)
    for chunk in stimme.synthesize(text, syn_config=cfg):
        a = np.frombuffer(chunk.audio_int16_bytes, dtype=np.int16).astype(np.float32) / 32768
        teile += [a, pause]
    ton = np.concatenate([np.zeros(int(rate * .12), dtype=np.float32)] + teile[:-1] + [np.zeros(int(rate * .3), dtype=np.float32)])
    ton, ende = effekte(ton.astype(np.float64), rate, sp, np.random.default_rng(len(text)))
    # Auf gleiche Spitzenlautstärke bringen, Ränder weich ein- und ausblenden
    spitze = float(np.max(np.abs(ton))) or 1
    ton = ton * (.89 / spitze)
    f = int(rate * .01)
    ton[:f] *= np.linspace(0, 1, f); ton[-f:] *= np.linspace(1, 0, f)
    return (np.clip(ton, -1, 1) * 32767).astype(np.int16).tobytes(), rate, len(ton) / rate, ende


def mp3(pcm, rate):
    import lameenc

    enc = lameenc.Encoder()
    enc.set_bit_rate(KBPS); enc.set_in_sample_rate(rate); enc.set_channels(1); enc.set_quality(2)
    return enc.encode(pcm) + enc.flush()


def pruefen(z, sprecher, ids):
    import difflib
    import numpy as np
    from faster_whisper import WhisperModel, decode_audio

    modell = WhisperModel("small", device="cpu", compute_type="int8")
    norm = lambda t: re.sub(r"[^a-zäöüß ]", "", t.lower().replace("-", " ")).split()
    auffaellig = []
    for l in z:
        if ids and l["id"] not in ids:
            continue
        a = decode_audio(str(OUT / f"{l['id']}.mp3"), sampling_rate=16000)
        segs, _ = modell.transcribe(a, language="de", beam_size=5)
        hyp = " ".join(s.text.strip() for s in segs)
        q = difflib.SequenceMatcher(None, norm(l["text"]), norm(hyp)).ratio()
        if q < .9:
            auffaellig.append(l["id"])
        print(f"{'OK' if q >= .9 else '??'} {q:.2f} {l['id']:<14} {hyp}")
    print("Auffällig:", ", ".join(auffaellig) or "keine")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--modelle", help="Ordner mit den Piper-Stimmen (.onnx und .onnx.json)")
    ap.add_argument("--alle", action="store_true", help="auch unveränderte Zeilen neu sprechen")
    ap.add_argument("--liste", action="store_true", help="nur die Zeilen anzeigen")
    ap.add_argument("--pruefen", nargs="*", metavar="ID", help="Aufnahmen mit Spracherkennung gegenlesen")
    args = ap.parse_args()

    z, sprecher = zeilen()
    if args.liste:
        for l in z:
            print(f"{l['id']:<14} {l['wer']:<10} {l['text']}")
        return
    if args.pruefen is not None:
        return pruefen(z, sprecher, set(args.pruefen))
    if not args.modelle:
        sys.exit("Bitte --modelle ORDNER angeben (siehe Hilfe oben in der Datei).")

    from piper import PiperVoice

    OUT.mkdir(exist_ok=True)
    idx_pfad = OUT / "index.json"
    idx = json.loads(idx_pfad.read_text(encoding="utf-8")) if idx_pfad.exists() else {}
    geladen, neu = {}, 0
    for l in z:
        sp = sprecher[l["wer"]]
        key = schluessel(l, sprecher)
        ziel = OUT / f"{l['id']}.mp3"
        if not args.alle and idx.get(l["id"], {}).get("key") == key and ziel.exists():
            continue
        if sp["stimme"] not in geladen:
            geladen[sp["stimme"]] = PiperVoice.load(str(pathlib.Path(args.modelle) / f"{sp['stimme']}.onnx"))
        pcm, rate, dauer, ende = sprechen(geladen[sp["stimme"]], gesprochen(l["text"]), sp)
        ziel.write_bytes(mp3(pcm, rate))
        idx[l["id"]] = {"key": key, "wer": l["wer"], "dauer": round(dauer, 2), "ende": round(ende, 2)}
        neu += 1
        print(f"{l['id']:<14} {dauer:5.1f} s  {ziel.stat().st_size // 1024} KB")
    # Zeilen, die es nicht mehr gibt, entfernen
    ids = {l["id"] for l in z}
    for alt in [k for k in idx if k not in ids]:
        (OUT / f"{alt}.mp3").unlink(missing_ok=True)
        del idx[alt]
    idx_pfad.write_text(json.dumps(idx, ensure_ascii=False, indent=1, sort_keys=True) + "\n", encoding="utf-8")
    gesamt = sum(v["dauer"] for v in idx.values())
    print(f"{neu} neu gesprochen, {len(idx)} Zeilen, {gesamt / 60:.1f} Minuten")


if __name__ == "__main__":
    main()
