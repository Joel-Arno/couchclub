#!/usr/bin/env python3
"""Baut Mondgeläut zu einer einzigen HTML-Datei zusammen.

    python3 mond/build.py                    -> mond/index.html (läuft direkt im Browser, auch offline)
    python3 mond/build.py --artifact PFAD    -> zusätzlich eine Variante ohne HTML-Grundgerüst
    python3 mond/build.py --stimmen          -> mit Sprachaufnahmen aus src/stimme (sonst ohne Stimme)

Die Schriften aus src/fonts und die Sprachaufnahmen aus src/stimme werden als
Base64 eingebettet, damit das Spiel ohne Internet läuft. Keine Abhängigkeiten
außer Python 3. Die Aufnahmen selbst erzeugt stimme.py.
"""
import argparse
import base64
import json
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / "src"

FONTS = [
    ("Cormorant Garamond", "cormorant.woff2", "normal", "500 700"),
    ("Cormorant Garamond", "cormorant-italic.woff2", "italic", "500"),
    ("IBM Plex Sans", "plexsans-400.woff2", "normal", "400"),
    ("IBM Plex Sans", "plexsans-600.woff2", "normal", "600 700"),
]
JS = ["core.js", "figuren.js", "welt.js", "daten.js", "stimme.js", "kampf.js", "ablauf.js"]


def font_css():
    rules = []
    for family, file, style, weight in FONTS:
        data = base64.b64encode((SRC / "fonts" / file).read_bytes()).decode()
        rules.append(
            f"@font-face{{font-family:'{family}';font-style:{style};font-weight:{weight};"
            f"font-display:swap;src:url(data:font/woff2;base64,{data}) format('woff2');}}"
        )
    return "\n".join(rules)


def voices_js(stimmen):
    """Sprachaufnahmen aus src/stimme (erzeugt mit stimme.py) als Base64 einbetten, nur mit --stimmen."""
    idx_path = SRC / "stimme" / "index.json"
    idx = json.loads(idx_path.read_text(encoding="utf-8")) if stimmen and idx_path.exists() else {}
    data, ende = {}, {}
    for vid in sorted(idx):
        f = SRC / "stimme" / f"{vid}.mp3"
        if f.exists():
            data[vid] = base64.b64encode(f.read_bytes()).decode()
            if idx[vid].get("ende"):
                ende[vid] = idx[vid]["ende"]
    return ("const STIMMEN = " + json.dumps(data, separators=(",", ":")) + ";\n"
            + "const STIMMEN_ENDE = " + json.dumps(ende, separators=(",", ":")) + ";\n")


def build(skeleton=True, stimmen=False):
    shell = (SRC / "shell.html").read_text(encoding="utf-8")
    css = (SRC / "style.css").read_text(encoding="utf-8")
    js = voices_js(stimmen) + "\n".join((SRC / f).read_text(encoding="utf-8") for f in JS)
    html = (
        shell.replace("/*@FONTS@*/", font_css())
        .replace("/*@CSS@*/", css)
        .replace("/*@JS@*/", "(function(){\n'use strict';\n" + js + "\n})();")
    )
    if not skeleton:
        drop = re.compile(
            r'^(<!DOCTYPE html>|<html lang="de">|</html>|<head>|</head>|<body>|</body>|'
            r'<meta charset="UTF-8">|<meta name="viewport".*)$'
        )
        html = "\n".join(line for line in html.split("\n") if not drop.match(line))
    return html


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--artifact", help="Pfad für die Variante ohne HTML-Grundgerüst")
    ap.add_argument("--stimmen", action="store_true", help="Sprachaufnahmen einbetten")
    args = ap.parse_args()
    out = HERE / "index.html"
    out.write_text(build(stimmen=args.stimmen), encoding="utf-8")
    print(f"{out.relative_to(HERE.parent)}  {out.stat().st_size // 1024} KB")
    if args.artifact:
        p = pathlib.Path(args.artifact)
        p.write_text(build(skeleton=False, stimmen=args.stimmen), encoding="utf-8")
        print(f"{p}  {p.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
