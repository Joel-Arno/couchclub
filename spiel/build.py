#!/usr/bin/env python3
"""Baut das Spiel zu einer einzigen HTML-Datei zusammen.

    python3 spiel/build.py                    -> spiel/index.html (installierbare Web-App)
    python3 spiel/build.py --artifact PFAD    -> zusätzlich eine Variante ohne Manifest/Service Worker
    python3 spiel/build.py --couchclub ORDNER -> zusätzlich ORDNER/spiele.html für den Couchclub
                                                 (ohne Papier-Stil, ein Spielstand pro Spieler)

Die Schriften aus src/fonts werden als Base64 eingebettet, damit das Spiel
ohne Internet läuft. Keine Abhängigkeiten außer Python 3.
"""
import argparse
import base64
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / "src"

FONTS = [
    ("Fraunces", "fraunces.woff2", "600 700"),
    ("IBM Plex Sans", "plexsans-400.woff2", "400"),
    ("IBM Plex Sans", "plexsans-600.woff2", "600"),
    ("IBM Plex Mono", "plexmono-500.woff2", "500"),
    ("IBM Plex Mono", "plexmono-600.woff2", "600"),
    ("Caveat", "caveat.woff2", "600 700"),
    ("Patrick Hand", "patrickhand.woff2", "400"),
]
JS = ["core.js", "kerker-data.js", "kerker-engine.js", "kerker-ui.js", "licht.js", "main.js"]


PAPER_FONTS = {"Caveat", "Patrick Hand"}


def font_css(paper=True):
    rules = []
    for family, file, weight in FONTS:
        if not paper and family in PAPER_FONTS:
            continue
        data = base64.b64encode((SRC / "fonts" / file).read_bytes()).decode()
        rules.append(
            f"@font-face{{font-family:'{family}';font-style:normal;font-weight:{weight};"
            f"font-display:swap;src:url(data:font/woff2;base64,{data}) format('woff2');}}"
        )
    return "\n".join(rules)


def split_top(text, sep):
    """Teilt an sep, aber nicht innerhalb von Klammern."""
    parts, depth, cur = [], 0, ""
    for ch in text:
        if ch in "([":
            depth += 1
        elif ch in ")]":
            depth -= 1
        if ch == sep and depth == 0:
            parts.append(cur)
            cur = ""
        else:
            cur += ch
    parts.append(cur)
    return parts


def strip_paper(css):
    """Entfernt alle Regeln, die nur für den Papier-Stil gelten."""
    out, i, start, depth = [], 0, 0, 0
    while i < len(css):
        if css.startswith("/*", i):
            i = css.index("*/", i) + 2
            continue
        if css[i] == "{":
            depth += 1
        elif css[i] == "}":
            depth -= 1
            if depth == 0:
                rule = css[start:i + 1]
                sel = re.sub(r"/\*.*?\*/", "", rule.split("{", 1)[0], flags=re.S).strip()
                paper = sel and all('data-style="papier"' in p for p in split_top(sel, ","))
                if not paper:
                    out.append(rule)
                start = i + 1
        i += 1
    out.append(css[start:])
    return "".join(out)


def build(pwa=True, couchclub=False):
    shell = (SRC / "shell.html").read_text(encoding="utf-8")
    css = (SRC / "style.css").read_text(encoding="utf-8")
    js = "\n".join((SRC / f).read_text(encoding="utf-8") for f in JS)
    if couchclub:
        css = strip_paper(css)
        shell = re.sub(r'<svg width="0" height="0".*?</svg>\n', "", shell, flags=re.S)
    html = (
        shell.replace("/*@FONTS@*/", font_css(paper=not couchclub))
        .replace("/*@CSS@*/", css)
        .replace("/*@JS@*/", "(function(){\n'use strict';\nconst CC_MODE = " + ("true" if couchclub else "false")
                 + ";\n" + js + "\n})();")
    )
    if couchclub:
        return re.sub(r"<!--@PWA-->.*?<!--@/PWA-->\n", "", html, flags=re.S)
    if pwa:
        html = html.replace("<!--@PWA-->\n", "").replace("<!--@/PWA-->\n", "")
    else:
        html = re.sub(r"<!--@PWA-->.*?<!--@/PWA-->\n", "", html, flags=re.S)
        drop = re.compile(
            r'^(<!DOCTYPE html>|<html lang="de">|</html>|<head>|</head>|<body>|</body>|'
            r'<meta charset="UTF-8">|<meta name="viewport".*)$'
        )
        html = "\n".join(line for line in html.split("\n") if not drop.match(line))
    return html


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--artifact", help="Pfad für die Variante ohne Web-App-Hülle")
    ap.add_argument("--couchclub", help="Ordner des Couchclubs, dorthin kommt spiele.html")
    args = ap.parse_args()
    out = HERE / "index.html"
    out.write_text(build(pwa=True), encoding="utf-8")
    print(f"{out.relative_to(HERE.parent)}  {out.stat().st_size // 1024} KB")
    if args.artifact:
        p = pathlib.Path(args.artifact)
        p.write_text(build(pwa=False), encoding="utf-8")
        print(f"{p}  {p.stat().st_size // 1024} KB")
    if args.couchclub:
        p = pathlib.Path(args.couchclub) / "spiele.html"
        p.write_text(build(couchclub=True), encoding="utf-8")
        print(f"{p}  {p.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
