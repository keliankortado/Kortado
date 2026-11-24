"""Pré-rendu des pages Kortado (pour le SEO et l'affichage sans attendre le JS).

Chaque page contient son gabarit dans <template id="dc-tpl"> : c'est LUI la source.
Après une modif du gabarit, relancer depuis la racine du dépôt :
    python3 -m http.server 8765 &   puis   python3 outils/prerender.py
Le script recopie le rendu initial dans <div id="dc-root">…</div>.
"""
import re, glob
from playwright.sync_api import sync_playwright

files = [f for f in sorted(glob.glob('*.html')) if f != 'formulaires.html']
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1440, 'height': 900})
    for f in files:
        s = open(f, encoding='utf-8').read()
        a = s.index('<div id="dc-root">') + len('<div id="dc-root">')
        z = s.index('</div>\n<template id="dc-tpl">')
        open(f, 'w', encoding='utf-8').write(s[:a] + s[z:])          # vide l'ancien rendu
        pg.goto(f'http://localhost:8765/{f}'); pg.wait_for_timeout(300)
        html = pg.evaluate("document.getElementById('dc-root').innerHTML")
        open(f, 'w', encoding='utf-8').write(s[:a] + html + s[z:])
        print(f, len(html))
    b.close()
