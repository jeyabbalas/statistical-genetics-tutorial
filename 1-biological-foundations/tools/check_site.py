#!/usr/bin/env python3
"""Check the Lecture 1 site and rebuild the glossary usage index.

Run from anywhere:   python3 1-biological-foundations/tools/check_site.py [--links]

What it does
  1. Reads the page list from assets/js/pages.js and the glossary from assets/js/glossary-data.js.
  2. For every page: checks local links, images and scripts exist; checks that every
     <a class="term" href="glossary.html#ID"> points to an existing glossary entry.
  3. Finds which glossary terms occur on which page (same matching rules as site.js) and writes
     assets/js/glossary-usage.js, which the glossary page uses for its "Used on" lines.
  4. Lists glossary entries that are not used on any page.
  5. With --links, checks that external links respond (uses curl; slow).
Exit status is 1 if a problem was found.
"""
import json, os, re, subprocess, sys
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
problems = []


def read(p):
    with open(os.path.join(ROOT, p), encoding="utf-8") as fh:
        return fh.read()


pages_js = read("assets/js/pages.js")
page_map = dict(re.findall(r'"([a-z0-9-]+)":\s*\{\s*file:\s*"([^"]+)"', pages_js))
gl_js = read("assets/js/glossary-data.js")
m = re.search(r"window\.GLOSSARY_ENTRIES\s*=\s*(\[.*\]);?\s*$", gl_js, re.S)
entries = json.loads(m.group(1)) if m else []
GL = {e["id"]: e for e in entries}
if len(GL) != len(entries):
    problems.append("duplicate ids in glossary-data.js")


def plural_forms(s):
    out = [s]
    if re.search(r"[a-z]$", s, re.I):
        if re.search(r"[^aeiou]y$", s, re.I):
            out.append(s[:-1] + "ies")
        elif re.search(r"(s|x|z|ch|sh)$", s, re.I):
            out.append(s + "es")
        else:
            out.append(s + "s")
    return out


variants = {}
for e in entries:
    if e.get("auto") is False:
        continue
    pats = e.get("match") or [re.sub(r"<[^>]+>", "", e["term"])]
    for p in pats:
        for q in ([p] if e.get("noPlural") else plural_forms(p)):
            vs = [q] if e.get("cs") else [q, q[:1].upper() + q[1:], q[:1].lower() + q[1:]]
            for v in vs:
                variants.setdefault(v, e["id"])
keys = sorted(variants, key=len, reverse=True)
MATCH = re.compile(r"(?<![\w\-])(" + "|".join(re.escape(k) for k in keys) + r")(?!\w|-\w)") if keys else None

SKIP = {"script", "style", "code", "pre", "kbd", "samp", "a", "button", "input", "textarea", "select", "option",
        "label", "svg", "math", "h1", "h2", "h3", "h4", "h5", "h6", "summary", "nav", "th", "dfn", "q"}
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack, self.text, self.terms, self.links, self.srcs = [], [], [], [], []
        self.in_article = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "article":
            self.in_article += 1
        if tag not in VOID:
            cls = (a.get("class") or "").split()
            skip = (tag in SKIP or "data-no-autolink" in a or
                    any(c in cls for c in ("no-autolink", "widget", "readout", "callout-title", "fig-title", "sources", "file-label", "chips", "learn-more", "fig-credit")))
            self.stack.append(skip)
        if tag == "a" and a.get("href"):
            self.links.append(a["href"])
            if "term" in (a.get("class") or "").split() and "#" in a["href"]:
                self.terms.append(a["href"].split("#", 1)[1])
        for k in ("src",):
            if a.get(k) and tag in ("img", "script", "source"):
                self.srcs.append(a[k])
        if tag == "link" and a.get("href"):
            self.srcs.append(a["href"])

    def handle_endtag(self, tag):
        if tag == "article":
            self.in_article -= 1
        if tag not in VOID and self.stack:
            self.stack.pop()

    def handle_data(self, d):
        if self.in_article and not any(self.stack):
            self.text.append(d)


usage = {}
for key, fname in page_map.items():
    path = os.path.join(ROOT, fname)
    if not os.path.exists(path):
        problems.append(f"page listed in pages.js does not exist: {fname}")
        continue
    p = Page()
    p.feed(read(fname))
    for href in p.links:
        if href.startswith(("http:", "https:", "mailto:", "#")):
            continue
        target = href.split("#")[0]
        if target and not os.path.exists(os.path.join(ROOT, target)):
            problems.append(f"{fname}: broken link {href}")
    for s in p.srcs:
        if s.startswith(("http:", "https:", "data:")):
            continue
        if not os.path.exists(os.path.join(ROOT, s.split("?")[0])):
            problems.append(f"{fname}: missing file {s}")
    for t in p.terms:
        if t not in GL:
            problems.append(f"{fname}: term link to unknown glossary id '{t}'")
    found = set(t for t in p.terms if t in GL)
    if MATCH:
        for mm in MATCH.finditer(" ".join(p.text)):
            found.add(variants[mm.group(1)])
    for t in found:
        usage.setdefault(t, []).append(key)

order = list(page_map)
usage = {k: sorted(v, key=order.index) for k, v in sorted(usage.items())}
with open(os.path.join(ROOT, "assets/js/glossary-usage.js"), "w", encoding="utf-8") as fh:
    fh.write("/* Generated by tools/check_site.py: which pages use each glossary term. */\n")
    fh.write("window.GLOSSARY_USAGE = " + json.dumps(usage, indent=0) + ";\n")

unused = sorted(set(GL) - set(usage))
for e in entries:
    for s in e.get("see", []) or []:
        if s not in GL:
            problems.append(f"glossary '{e['id']}': see-also to unknown id '{s}'")

if "--links" in sys.argv:
    urls = set()
    for fname in page_map.values():
        if os.path.exists(os.path.join(ROOT, fname)):
            urls.update(re.findall(r'href="(https?://[^"]+)"', read(fname)))
    for e in entries:
        urls.update(l["u"] for l in e.get("links", []) or [])
    for u in sorted(urls):
        try:
            code = subprocess.run(["curl", "-s", "-L", "-o", "/dev/null", "-m", "25", "-A", "Mozilla/5.0", "-w", "%{http_code}", u],
                                  capture_output=True, text=True, timeout=40).stdout.strip()
        except Exception as ex:  # noqa: BLE001
            code = f"ERR {ex}"
        if not code.startswith(("2", "3")):
            problems.append(f"external link {code}: {u}")

print(f"pages: {len(page_map)}  glossary entries: {len(GL)}  used: {len(usage)}  unused: {len(unused)}")
if unused:
    print("unused glossary entries:", ", ".join(unused))
for x in problems:
    print("PROBLEM:", x)
sys.exit(1 if problems else 0)
