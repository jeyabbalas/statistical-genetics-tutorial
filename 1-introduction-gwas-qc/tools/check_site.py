#!/usr/bin/env python3
"""Check the Lecture 1 site and rebuild its glossary usage index.

Run from anywhere:   python3 1-introduction-gwas-qc/tools/check_site.py [--links] [--page KEY]

What it does
  1. Reads the page list from assets/js/pages.js and merges the glossary the way site.js does:
     Lecture 0's entries, then this lecture's (assets/js/glossary-data.js) on top.
  2. For every page that exists: checks local links, images and scripts; checks that every
     <a class="term" href="glossary.html#ID"> points to a glossary entry; checks that every page
     loads the shared scripts in the right order.
  3. Finds which glossary terms occur on which page (same matching rules as site.js) and writes
     assets/js/glossary-usage.js, which the glossary page uses for "Used on" and its default filter.
  4. Lists Lecture 1 glossary entries that are not used on any page.
  5. With --links, checks that external links respond (uses curl; slow).
  --page KEY limits the link and script checks to one page (the usage index is still rebuilt from all pages).
Pages listed in pages.js that do not exist yet are reported as "missing" but are not errors until
--strict is given. Exit status is 1 if a problem was found.
"""
import json, os, re, subprocess, sys
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
L0 = os.path.join(ROOT, "..", "0-biological-foundations")
problems, notes = [], []
STRICT = "--strict" in sys.argv
ONLY = sys.argv[sys.argv.index("--page") + 1] if "--page" in sys.argv else None


def read(p):
    with open(p, encoding="utf-8") as fh:
        return fh.read()


def entries_of(path):
    m = re.search(r"window\.GLOSSARY_ENTRIES\s*=\s*(\[.*\]);?\s*$", read(path), re.S)
    return json.loads(m.group(1)) if m else []


pages_js = read(os.path.join(ROOT, "assets/js/pages.js"))
page_map = dict(re.findall(r'"([a-z0-9-]+)":\s*\{\s*file:\s*"([^"]+)"', pages_js))
l0_entries = entries_of(os.path.join(L0, "assets/js/glossary-data.js"))
l1_entries = entries_of(os.path.join(ROOT, "assets/js/glossary-data.js"))
GL = {e["id"]: e for e in l0_entries}
GL.update({e["id"]: e for e in l1_entries})
L1_IDS = {e["id"] for e in l1_entries}


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
for e in [x for x in GL.values() if x["id"] in L1_IDS] + [x for x in GL.values() if x["id"] not in L1_IDS]:
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
SKIP_CLASSES = ("no-autolink", "widget", "readout", "callout-title", "fig-title", "sources", "file-label", "chips",
                "learn-more", "fig-credit", "lab", "terminal", "tab-list", "code-wrap", "step-nav", "eq-display")
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
REQUIRED_SCRIPTS = ["../0-biological-foundations/assets/vendor/katex/katex.min.js",
                    "../0-biological-foundations/assets/vendor/katex/contrib/auto-render.min.js",
                    "../0-biological-foundations/assets/js/math.js", "assets/js/pages.js",
                    "../0-biological-foundations/assets/js/glossary-data.js", "assets/js/glossary-data.js",
                    "assets/js/glossary-usage.js", "assets/js/site.js"]


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack, self.text, self.terms, self.links, self.srcs, self.scripts, self.ids = [], [], [], [], [], [], set()
        self.in_article = 0
        self.body_page = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get("id"):
            self.ids.add(a["id"])
        if tag == "body":
            self.body_page = a.get("data-page")
        if tag == "article":
            self.in_article += 1
        if tag not in VOID:
            cls = (a.get("class") or "").split()
            skip = tag in SKIP or "data-no-autolink" in a or any(c in cls for c in SKIP_CLASSES)
            self.stack.append(skip)
        if tag == "a" and a.get("href"):
            self.links.append(a["href"])
            if "term" in (a.get("class") or "").split() and "#" in a["href"]:
                self.terms.append(a["href"].split("#", 1)[1])
        if a.get("src") and tag in ("img", "script", "source", "iframe"):
            self.srcs.append(a["src"])
            if tag == "script":
                self.scripts.append(a["src"])
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


def exists(base_dir, href):
    path = href.split("#")[0].split("?")[0]
    return not path or os.path.exists(os.path.normpath(os.path.join(base_dir, path)))


parsed = {}
for key, fname in page_map.items():
    path = os.path.join(ROOT, fname)
    if not os.path.exists(path):
        (problems if STRICT else notes).append(f"page listed in pages.js does not exist yet: {fname}")
        continue
    p = Page()
    p.feed(read(path))
    parsed[key] = p

anchor_cache = {}


def anchors(target):
    if target not in anchor_cache:
        q = Page()
        try:
            q.feed(read(target))
        except FileNotFoundError:
            pass
        anchor_cache[target] = q.ids
    return anchor_cache[target]


usage = {}
for key, p in parsed.items():
    fname = page_map[key]
    check = ONLY is None or ONLY == key
    if check:
        if p.body_page != key:
            problems.append(f"{fname}: <body data-page> is {p.body_page!r}, expected {key!r}")
        order = [s for s in p.scripts if s in REQUIRED_SCRIPTS]
        if order != REQUIRED_SCRIPTS:
            problems.append(f"{fname}: shared scripts missing or out of order; copy the <head> of _template.html")
        for href in p.links:
            if href.startswith(("http:", "https:", "mailto:")):
                continue
            if href.startswith("#"):
                if href[1:] and href[1:] not in p.ids and not href.startswith("#slide-") and not href.startswith("#src-"):
                    problems.append(f"{fname}: link to missing anchor {href}")
                continue
            if not exists(ROOT, href):
                (problems if STRICT or not re.match(r"^[a-z0-9-]+\.html", href) else notes).append(f"{fname}: link to missing file {href}")
                continue
            target, _, frag = href.partition("#")
            if frag and target.endswith(".html") and not target.endswith("glossary.html"):
                tpath = os.path.normpath(os.path.join(ROOT, target))
                if frag not in anchors(tpath) and not frag.startswith("slide-"):
                    problems.append(f"{fname}: link to missing anchor {href}")
        for s in p.srcs:
            if s.startswith(("http:", "https:", "data:")):
                continue
            if not exists(ROOT, s):
                problems.append(f"{fname}: missing file {s}")
        for t in p.terms:
            if t not in GL:
                problems.append(f"{fname}: term link to unknown glossary id '{t}'")
        srcs_in = re.findall(r'href="#src-(\d+)"', read(os.path.join(ROOT, fname)))
        for n in set(srcs_in):
            if f"src-{n}" not in p.ids:
                problems.append(f"{fname}: citation #src-{n} has no matching <li id=\"src-{n}\">")
    found = set(t for t in p.terms if t in GL)
    text = re.sub(r"\\\(.*?\\\)|\\\[.*?\\\]", " ", " ".join(p.text), flags=re.S)
    if MATCH:
        for mm in MATCH.finditer(text):
            found.add(variants[mm.group(1)])
    for t in found:
        usage.setdefault(t, []).append(key)

order = list(page_map)
usage = {k: sorted(v, key=order.index) for k, v in sorted(usage.items())}
with open(os.path.join(ROOT, "assets/js/glossary-usage.js"), "w", encoding="utf-8") as fh:
    fh.write("/* Generated by tools/check_site.py: which pages use each glossary term. */\n")
    fh.write("window.GLOSSARY_USAGE = " + json.dumps(usage, indent=0) + ";\n")

for e in l1_entries:
    for s in e.get("see", []) or []:
        if s not in GL:
            problems.append(f"glossary '{e['id']}': see-also to unknown id '{s}'")
unused = sorted(L1_IDS - set(usage))

if "--links" in sys.argv:
    urls = set()
    for key in parsed:
        if ONLY and key != ONLY:
            continue
        urls.update(re.findall(r'href="(https?://[^"]+)"', read(os.path.join(ROOT, page_map[key]))))
    if not ONLY:
        for e in l1_entries:
            urls.update(l["u"] for l in e.get("links", []) or [])
    for u in sorted(urls):
        try:
            code = subprocess.run(["curl", "-s", "-L", "-o", "/dev/null", "-m", "25", "-A", "Mozilla/5.0", "-w", "%{http_code}", u],
                                  capture_output=True, text=True, timeout=40).stdout.strip()
        except Exception as ex:  # noqa: BLE001
            code = f"ERR {ex}"
        if not code.startswith(("2", "3")):
            problems.append(f"external link {code}: {u}")

print(f"pages: {len(parsed)}/{len(page_map)}  glossary: {len(GL)} merged ({len(l1_entries)} from Lecture 1)  terms used: {len(usage)}  unused Lecture 1 entries: {len(unused)}")
if unused:
    print("unused Lecture 1 glossary entries:", ", ".join(unused))
for x in notes:
    print("NOTE:", x)
for x in problems:
    print("PROBLEM:", x)
sys.exit(1 if problems else 0)
