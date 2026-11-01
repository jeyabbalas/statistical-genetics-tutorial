#!/usr/bin/env node
/* Check every TeX expression on the site with the vendored KaTeX and the macros in math.js.

   Run from anywhere:   node tools/check_math.mjs

   For every HTML page and for the glossary entries it reports
     - expressions that KaTeX cannot parse, or that it parses only in its non-strict mode,
     - Unicode symbols typed inside the TeX (β, −, ≈) instead of TeX commands (\beta, -, \approx),
     - unmatched \( \) or \[ \] delimiters, which are usually HTML tags or a glossary link inside an
       expression: the browser splits the text there, so the expression is left as raw TeX,
     - delimiters in places that are not rendered (headings, <title>, attributes such as alt or data-toc).
   Exit status is 1 if a problem was found. Needs Node.js only; KaTeX is read from the repository. */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LECTURE0 = join(ROOT, "0-biological-foundations");
const katex = createRequire(import.meta.url)(join(LECTURE0, "assets/vendor/katex/katex.min.js"));

// Load the shared macros the same way the browser does.
const sandbox = { window: {}, console };
vm.runInNewContext(readFileSync(join(LECTURE0, "assets/js/math.js"), "utf8"), sandbox);
const MACROS = sandbox.window.LectureMath.macros;

const problems = [];
let checked = 0;

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", thinsp: " ", minus: "−" };
function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

function render(tex, display, where) {
  checked++;
  // One source style everywhere: TeX commands, not Unicode symbols (words inside \text{} may use any character).
  const unicode = [...new Set(tex.replace(/\\text\{[^{}]*\}/g, "").match(/[^\x00-\x7F]/g) || [])];
  if (unicode.length) problems.push(`${where}: Unicode ${unicode.join(" ")} inside TeX; write TeX commands instead (\\beta, -, \\times, \\approx, \\le, ^2, \\tfrac{1}{2}, ', \\sqrt{}, \\ell)\n    ${tex}`);
  const warnings = [];
  try {
    katex.renderToString(tex, {
      displayMode: display, throwOnError: true, macros: { ...MACROS },
      strict: (code, msg) => { warnings.push(`${code}: ${msg}`); return "ignore"; }
    });
  } catch (err) {
    problems.push(`${where}: ${err.message.replace(/\s+/g, " ")}\n    ${tex}`);
    return;
  }
  for (const w of warnings) problems.push(`${where}: ${w}\n    ${tex}`);
}

// The closing delimiter is found the way KaTeX's auto-render finds it: escaped characters (\\, \{, \[)
// are skipped and braces must be balanced, so a line break such as \\[6pt] does not end display math.
function findEndOfMath(delim, text, start) {
  let braces = 0;
  for (let i = start; i < text.length; i++) {
    if (braces <= 0 && text.startsWith(delim, i)) return i;
    const c = text[i];
    if (c === "\\") i++;
    else if (c === "{") braces++;
    else if (c === "}") braces--;
  }
  return -1;
}

// Split one run of text (text between two tags, as the browser sees it) into math and plain text.
function scanText(text, where, rendered) {
  const plain = [];
  for (;;) {
    const at = text.search(/\\\(|\\\[/);
    if (at < 0) break;
    plain.push(text.slice(0, at));
    text = text.slice(at);
    const display = text.startsWith("\\[");
    const close = display ? "\\]" : "\\)";
    const end = findEndOfMath(close, text, 2);
    if (end < 0) {
      problems.push(`${where}: ${text.slice(0, 2)} opened but not closed in the same run of text (an HTML tag or link inside the TeX?): ${text.slice(0, 80)}…`);
      return;
    }
    const tex = text.slice(2, end);
    if (!rendered) problems.push(`${where}: math in a place that is not rendered (use Unicode there): ${text.slice(0, end + 2)}`);
    else render(tex, display, where);
    text = text.slice(end + 2);
  }
  plain.push(text);
  for (const t of plain) {
    const m = t.match(/\\[)\]]/);
    if (m) problems.push(`${where}: ${m[0]} without an opening delimiter: …${t.slice(Math.max(0, m.index - 60), m.index + 2)}`);
  }
}

// Contents never read as text.
const SKIP = new Set(["script", "style"]);
// Text that is shown but never rendered as math (math.js ignores code, pre, textarea and svg).
const NO_RENDER = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "title", "svg", "pre", "code", "textarea", "option"]);
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);

function scanHtml(html, label) {
  const lineAt = (i) => html.slice(0, i).split("\n").length;
  const stack = []; // { name, noMath }
  const tagRe = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9-]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  let last = 0, m;
  const flush = (end) => {
    if (end <= last) return;
    const text = html.slice(last, end);
    if (!/\\[()[\]]/.test(text)) return;
    if (stack.some((t) => t.noMath)) return; // class="no-math": shown as typed, on purpose
    const rendered = !stack.some((t) => NO_RENDER.has(t.name));
    scanText(decode(text), `${label}:${lineAt(last)}`, rendered);
  };
  while ((m = tagRe.exec(html))) {
    flush(m.index);
    last = tagRe.lastIndex;
    if (m[0].startsWith("<!--")) continue;
    const name = (m[1] || "").toLowerCase();
    if (m[0][1] === "/") {
      const i = stack.map((t) => t.name).lastIndexOf(name);
      if (i >= 0) stack.length = i;
      continue;
    }
    const attrs = {};
    for (const a of (m[2] || "").matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
      attrs[a[1].toLowerCase()] = decode(a[3] ?? a[4] ?? "");
      // Attributes are never rendered as math.
      if (/\\[([]/.test(attrs[a[1].toLowerCase()])) problems.push(`${label}:${lineAt(m.index)}: math delimiters in the ${a[1]} attribute (use Unicode there): ${attrs[a[1].toLowerCase()].slice(0, 80)}`);
    }
    if (SKIP.has(name)) {
      const end = html.toLowerCase().indexOf(`</${name}`, tagRe.lastIndex);
      if (end > 0) { tagRe.lastIndex = end; last = end; }
      continue;
    }
    if (VOID.has(name) || m[0].endsWith("/>")) continue;
    stack.push({ name, noMath: /(^|\s)no-math(\s|$)/.test(attrs.class || "") });
  }
  flush(html.length);
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === ".git" || name === "node_modules") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

const files = walk(ROOT).sort();
for (const f of files) scanHtml(readFileSync(f, "utf8"), relative(ROOT, f));

// Glossary entries: HTML strings shown in tooltips and on the glossary page.
const glossaryFile = join(LECTURE0, "assets/js/glossary-data.js");
const gsrc = readFileSync(glossaryFile, "utf8");
const gm = gsrc.match(/window\.GLOSSARY_ENTRIES\s*=\s*(\[[\s\S]*\]);?\s*$/);
if (gm) {
  for (const e of JSON.parse(gm[1])) {
    for (const key of ["term", "short", "long"]) {
      if (!e[key]) continue;
      const label = `${relative(ROOT, glossaryFile)} [${e.id}.${key}]`;
      if (key === "term") { if (/\\[([]/.test(e[key])) problems.push(`${label}: math in a glossary term, which is used as a heading (use Unicode there)`); continue; }
      scanHtml(e[key], label);
    }
  }
}

console.log(`Checked ${checked} TeX expressions in ${files.length} HTML pages and the glossary.`);
for (const p of problems) console.log("PROBLEM:", p);
process.exit(problems.length ? 1 : 0);
