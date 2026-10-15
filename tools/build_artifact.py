"""Flatten one module into a self-contained folder for publishing as a claude.ai Artifact.

Usage: python3 tools/build_artifact.py ai-evolution OUT_DIR
The page body is emitted without <html>/<head>/<body> (the Artifact host adds its own skeleton),
and shared asset paths are rewritten to sit beside the page.
"""
import re, shutil, sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
mod, out = sys.argv[1], pathlib.Path(sys.argv[2])
src = root / 'modules' / mod
out.mkdir(parents=True, exist_ok=True)
html = (src / 'index.html').read_text()
html = re.sub(r'<!doctype html>\s*', '', html, flags=re.I)
html = re.sub(r'</?(html|head|body)[^>]*>\s*', '', html)
html = re.sub(r'<meta (charset|name="viewport")[^>]*>\s*', '', html)
html = html.replace('../../assets/', 'assets/').replace('href="../../index.html"', 'href="#title"')
(out / 'index.html').write_text(html)
shutil.copytree(root / 'assets', out / 'assets', dirs_exist_ok=True)
shutil.copytree(src / 'js', out / 'js', dirs_exist_ok=True)
print(out)
