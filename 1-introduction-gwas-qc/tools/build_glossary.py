#!/usr/bin/env python3
"""Build assets/js/glossary-data.js for Lecture 1 from assets/js/glossary-parts/*.json.

Run from anywhere:   python3 1-introduction-gwas-qc/tools/build_glossary.py

Each part file is a JSON array of glossary entries (same fields as Lecture 0's glossary-data.js:
id, term, aka[], short, long, l1, see[], links[{t,u}], match[], cs, auto, noPlural, owner).
Rules checked here:
  - id, term and short are present; ids are lowercase-with-hyphens and unique across all parts;
  - an id that already exists in Lecture 0's glossary is an error unless the entry has "override": true
    (then it replaces the Lecture 0 entry on Lecture 1 pages);
  - every id in "see" exists in Lecture 0 or Lecture 1;
  - a match string used by two Lecture 1 entries is reported (the first one wins in site.js).
Exit status is 1 if a problem was found; the file is written only when there is none.
"""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
L0_FILE = os.path.join(ROOT, "..", "0-biological-foundations", "assets", "js", "glossary-data.js")
OUT = os.path.join(ROOT, "assets", "js", "glossary-data.js")
FIELDS = ["id", "term", "aka", "short", "long", "l1", "see", "links", "match", "cs", "auto", "noPlural", "owner", "override"]

HEADER = """/* Lecture 1 glossary entries. Lecture 0's entries are loaded first (../0-biological-foundations/assets/js/
   glossary-data.js); the next line keeps them, and site.js merges both lists (an entry here with the same id
   as a Lecture 0 entry overrides it). Fields: id, term, aka[], short (HTML), long (HTML), l1 (Lecture 1
   slides), see[] (ids), links[] ({t,u}), match[] (strings to auto-link), cs (case-sensitive), auto (false =
   never auto-link), noPlural, owner (page key). Generated from assets/js/glossary-parts/*.json by
   tools/build_glossary.py; edit the parts, then rebuild. */
window.GLOSSARY_L0 = window.GLOSSARY_ENTRIES || [];
"""


def load_l0():
    src = open(L0_FILE, encoding="utf-8").read()
    m = re.search(r"window\.GLOSSARY_ENTRIES\s*=\s*(\[.*\]);?\s*$", src, re.S)
    return json.loads(m.group(1)) if m else []


def main():
    problems = []
    l0 = {e["id"]: e for e in load_l0()}
    entries, where = [], {}
    for path in sorted(glob.glob(os.path.join(ROOT, "assets", "js", "glossary-parts", "*.json"))):
        name = os.path.basename(path)
        try:
            data = json.load(open(path, encoding="utf-8"))
        except json.JSONDecodeError as ex:
            problems.append(f"{name}: invalid JSON: {ex}")
            continue
        if not isinstance(data, list):
            problems.append(f"{name}: must be a JSON array of entries")
            continue
        for e in data:
            eid = e.get("id", "")
            if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", eid or ""):
                problems.append(f"{name}: bad or missing id {eid!r}")
                continue
            for k in ("term", "short"):
                if not e.get(k):
                    problems.append(f"{name}: {eid}: missing {k}")
            unknown = set(e) - set(FIELDS)
            if unknown:
                problems.append(f"{name}: {eid}: unknown fields {sorted(unknown)}")
            if eid in where:
                problems.append(f"{name}: {eid}: duplicate id (also in {where[eid]})")
                continue
            if eid in l0 and not e.get("override"):
                problems.append(f"{name}: {eid}: id exists in Lecture 0; reuse that entry, choose another id, or add \"override\": true")
            where[eid] = name
            entries.append({k: e[k] for k in FIELDS if k in e})
    ids = set(l0) | set(where)
    seen_match = {}
    for e in entries:
        for s in e.get("see", []) or []:
            if s not in ids:
                problems.append(f"{e['id']}: see-also to unknown id {s!r}")
        pats = e.get("match") or [re.sub(r"<[^>]+>", "", e["term"])]
        if e.get("auto") is False:
            continue
        for p in pats:
            key = p if e.get("cs") else p.lower()
            if key in seen_match and seen_match[key] != e["id"]:
                problems.append(f"match {p!r} used by both {seen_match[key]} and {e['id']}")
            seen_match.setdefault(key, e["id"])
    if problems:
        for p in problems:
            print("PROBLEM:", p)
        sys.exit(1)
    entries.sort(key=lambda e: e["id"])
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(HEADER)
        fh.write("window.GLOSSARY_ENTRIES = " + json.dumps(entries, indent=1, ensure_ascii=False) + ";\n")
    overrides = sum(1 for e in entries if e["id"] in l0)
    print(f"Wrote {len(entries)} Lecture 1 entries ({overrides} override Lecture 0) to {os.path.relpath(OUT)}; Lecture 0 has {len(l0)}.")


if __name__ == "__main__":
    main()
