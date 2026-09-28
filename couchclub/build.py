#!/usr/bin/env python3
"""Baut den Couchclub als installierbare Web-App, zum Beispiel für GitHub Pages.

    python3 couchclub/build.py --out _site

- spiele.html (Kerker-Wischer und Lichtläufer) wird frisch aus spiel/src gebaut
- mond.html (Mondgeläut) wird frisch aus mond/src gebaut
- index.html bekommt das volle Grundgerüst mit Manifest, App-Symbolen und Service Worker
- sw.js bekommt eine Version aus dem Inhalt aller Dateien, damit Handys Änderungen erkennen

Keine Abhängigkeiten außer Python 3.
"""
import argparse
import hashlib
import importlib.util
import pathlib
import shutil

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent

STATIC = ["styles.css", "core.js", "g-connect4.js", "g-ultimate.js", "g-boxes.js", "g-memory.js",
          "g-abenteuer.js", "manifest.webmanifest"]
ICONS = ["icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"]

HEAD = """<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#ECE7E1" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#161218" media="(prefers-color-scheme: dark)">
<meta name="description" content="Spieleabend auf einem Handy: Spiele gegen die KI oder zu zweit, dazu Kerker-Wischer, Lichtläufer und Mondgeläut.">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Couchclub">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
{head}
</head>
<body>
{body}
<script>
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
</script>
</body>
</html>
"""


def load_build(folder):
    spec = importlib.util.spec_from_file_location(folder + "_build", ROOT / folder / "build.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def page():
    """index.html im Repo ist nur der Seiteninhalt (so will es das Artifact). Hier kommt das Gerüst dazu."""
    lines = (HERE / "index.html").read_text(encoding="utf-8").splitlines()
    first = next(i for i, l in enumerate(lines) if l.lstrip().startswith("<div"))
    head = [l for l in lines[:first] if l.strip()]
    return HEAD.replace("{head}", "\n".join(head)).replace("{body}", "\n".join(lines[first:]))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="_site", help="Zielordner")
    out = pathlib.Path(ap.parse_args().out)
    if out.exists():
        shutil.rmtree(out)
    (out / "icons").mkdir(parents=True)

    (out / "index.html").write_text(page(), encoding="utf-8")
    (out / "spiele.html").write_text(load_build("spiel").build(couchclub=True), encoding="utf-8")
    (out / "mond.html").write_text(load_build("mond").build(couchclub=True), encoding="utf-8")
    for f in STATIC:
        shutil.copy2(HERE / f, out / f)
    for f in ICONS:
        shutil.copy2(HERE / "icons" / f, out / "icons" / f)

    files = ["./", "index.html", "spiele.html", "mond.html"] + STATIC + ["icons/" + f for f in ICONS]
    digest = hashlib.sha256()
    for f in sorted(p for p in out.rglob("*") if p.is_file()):
        digest.update(f.relative_to(out).as_posix().encode())
        digest.update(f.read_bytes())
    version = digest.hexdigest()[:12]
    sw = (HERE / "sw.js").read_text(encoding="utf-8")
    sw = sw.replace("'@VERSION@'", repr(version)).replace("['@FILES@']", repr(files))
    (out / "sw.js").write_text(sw, encoding="utf-8")

    total = sum(p.stat().st_size for p in out.rglob("*") if p.is_file())
    print(f"{out}  {total // 1024} KB  Version {version}")


if __name__ == "__main__":
    main()
