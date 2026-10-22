#!/usr/bin/env python3
"""Validate local links as a GitHub Pages project site, including fragments.

External reference URLs remain absolute and are counted, not fetched. This check
also covers quoted file paths in JavaScript and url() references in stylesheets.
"""
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://example.github.io/statistical-genetics-tutorial/"
problems = []
external = set()
checked = 0


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.refs = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            self.ids.add(attrs["id"])
        for key in ("href", "src", "poster"):
            if attrs.get(key):
                self.refs.append(attrs[key])

    handle_startendtag = handle_starttag


pages = {p: Page(p.read_text()) for p in ROOT.rglob("*.html") if ".git" not in p.parts}
# The glossary is rendered by site.js from these entries, rather than in HTML.
for data in ROOT.rglob("glossary-data.js"):
    match = re.search(r"window\.GLOSSARY_ENTRIES\s*=\s*(\[.*\]);?\s*$", data.read_text(), re.S)
    glossary = data.parents[2] / "glossary.html"
    if match and glossary in pages:
        pages[glossary].ids.update(entry["id"] for entry in json.loads(match.group(1)))


def check(source, ref):
    global checked
    if ref.startswith(("data:", "mailto:", "tel:", "javascript:", "blob:")):
        return
    if ref.startswith(("https://", "http://", "//")):
        external.add(ref)
        return
    checked += 1
    label = source.relative_to(ROOT)
    resolved = urlsplit(urljoin(urljoin(BASE, label.as_posix()), ref))
    prefix = urlsplit(BASE).path
    if not resolved.path.startswith(prefix):
        problems.append(f"{label}: link escapes the GitHub Pages project path: {ref}")
        return
    target = (ROOT / unquote(resolved.path[len(prefix):])).resolve()
    if not target.is_relative_to(ROOT):
        problems.append(f"{label}: link leaves the repository: {ref}")
        return
    if target.is_dir():
        target /= "index.html"
    if not target.is_file():
        problems.append(f"{label}: missing file: {ref}")
    elif resolved.fragment and target in pages:
        fragment = unquote(resolved.fragment)
        if fragment not in pages[target].ids:
            problems.append(f"{label}: missing anchor: {ref}")


for path, page in pages.items():
    for ref in page.refs:
        check(path, ref)

for path in ROOT.rglob("*.css"):
    for ref in re.findall(r"url\(\s*['\"]?([^'\"\s)]+)", path.read_text()):
        if not ref.startswith("#"):
            check(path, ref)

for path in ROOT.rglob("*.js"):
    # Script-created DOM paths are relative to the document, not the JS file.
    document = path.parents[2] / "index.html"
    if path.parent.name == "widgets":
        document = path.parents[3] / "index.html"
    for _, ref in re.findall(r'''(?<!\\)(["'])([^"'\\\s<>]+\.(?:html|css|js|png|jpg|jpeg|svg|pdf)(?:[?#][^"'\\\s<>]*)?)\1(?!\s*\+)''', path.read_text()):
        check(document, ref)

print(f"Checked {len(pages)} HTML pages and {checked} local links/assets under /statistical-genetics-tutorial/.")
print(f"{len(external)} distinct external HTML references retain their absolute URLs.")
for problem in problems:
    print("PROBLEM:", problem)
raise SystemExit(bool(problems))
