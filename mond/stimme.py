#!/usr/bin/env python3
"""Erzeugt die Sprachaufnahmen für Mondgeläut mit freien deutschen Piper-Stimmen.

    python3 mond/stimme.py --modelle ORDNER            alle geänderten Zeilen neu sprechen
    python3 mond/stimme.py --modelle ORDNER --alle     alles neu sprechen
    python3 mond/stimme.py --liste                     nur die Sprechzeilen anzeigen

Welche Zeilen es gibt und wer sie spricht, steht in src/daten.js (stimmZeilen und
SPRECHER). Das Skript liest das über Node aus, damit Text und Stimme nie auseinanderlaufen.

Voraussetzungen, nur zum Erzeugen (das Spiel selbst braucht nichts davon):
    pip install piper-tts lameenc
    Stimmen als .onnx und .onnx.json im Modellordner, zum Beispiel de_DE-thorsten-high,
    von https://huggingface.co/rhasspy/piper-voices (Ordner de/de_DE)

Ergebnis: src/stimme/<id>.mp3 und src/stimme/index.json. build.py bettet sie ins Spiel ein.
"""
import argparse
import hashlib
import json
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / "src"
OUT = SRC / "stimme"
KBPS = 48


def zeilen():
    js = (SRC / "daten.js").read_text(encoding="utf-8")
    code = js + "\nprocess.stdout.write(JSON.stringify({ z: stimmZeilen(), s: SPRECHER }));"
    res = subprocess.run(["node", "-e", code], capture_output=True, text=True, check=True)
    data = json.loads(res.stdout)
    return data["z"], data["s"]


def schluessel(zeile, sprecher):
    # Ändert sich Text oder Stimme, wird die Zeile neu gesprochen. Abspielrate und Hall wirken erst im Spiel.
    sp = sprecher[zeile["wer"]]
    roh = json.dumps([zeile["text"], sp["stimme"], sp.get("sprecher"), sp["tempo"]], ensure_ascii=False)
    return hashlib.sha1(roh.encode()).hexdigest()[:16]


def sprechen(stimme, text, sp):
    import numpy as np
    from piper import SynthesisConfig

    cfg = SynthesisConfig(length_scale=sp["tempo"])
    if sp.get("sprecher"):
        cfg.speaker_id = stimme.config.speaker_id_map[sp["sprecher"]]
    teile, rate = [], stimme.config.sample_rate
    pause = np.zeros(int(rate * .28), dtype=np.float32)
    for chunk in stimme.synthesize(text, syn_config=cfg):
        a = np.frombuffer(chunk.audio_int16_bytes, dtype=np.int16).astype(np.float32) / 32768
        teile += [a, pause]
    ton = np.concatenate([np.zeros(int(rate * .12), dtype=np.float32)] + teile[:-1] + [np.zeros(int(rate * .3), dtype=np.float32)])
    # Auf gleiche Spitzenlautstärke bringen, Ränder weich ein- und ausblenden
    spitze = float(np.max(np.abs(ton))) or 1
    ton = ton * (.89 / spitze)
    f = int(rate * .01)
    ton[:f] *= np.linspace(0, 1, f); ton[-f:] *= np.linspace(1, 0, f)
    return (np.clip(ton, -1, 1) * 32767).astype(np.int16).tobytes(), rate, len(ton) / rate


def mp3(pcm, rate):
    import lameenc

    enc = lameenc.Encoder()
    enc.set_bit_rate(KBPS); enc.set_in_sample_rate(rate); enc.set_channels(1); enc.set_quality(2)
    return enc.encode(pcm) + enc.flush()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--modelle", help="Ordner mit den Piper-Stimmen (.onnx und .onnx.json)")
    ap.add_argument("--alle", action="store_true", help="auch unveränderte Zeilen neu sprechen")
    ap.add_argument("--liste", action="store_true", help="nur die Zeilen anzeigen")
    args = ap.parse_args()

    z, sprecher = zeilen()
    if args.liste:
        for l in z:
            print(f"{l['id']:<14} {l['wer']:<10} {l['text']}")
        return
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
        pcm, rate, dauer = sprechen(geladen[sp["stimme"]], l["text"], sp)
        ziel.write_bytes(mp3(pcm, rate))
        idx[l["id"]] = {"key": key, "wer": l["wer"], "dauer": round(dauer, 2)}
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
