// browser_check.mjs — check Lecture 1 pages in headless Chrome through the DevTools protocol.
// No dependencies (Node >= 22 for the built-in WebSocket). Run from anywhere, with the local server running:
//
//   node 1-introduction-gwas-qc/tools/browser_check.mjs [--out DIR] [--pages all|key1,key2] [--mode desktop|phone|both]
//        [--segments N] [--shots "css selector"] [--max-shots N] [--eval "js (may await)"] [--wait ms]
//        [--hash section-id] [--base URL | --file] [--urls URL1,URL2] [--keep]
//
// --pages takes page keys from assets/js/pages.js ("all" = every page that exists; --existing skips listed
// pages that do not exist yet). --help prints this text; an unknown option prints it and stops. --mode phone emulates a
// 390 px wide phone (true device emulation, unlike --window-size). --file loads the pages from file:// instead
// of the server. --eval runs JavaScript in the page before the checks (for example, click a button).
// Set CHROME to the browser binary if it is not at the macOS default path.
//
// For each page: loads it, waits for load + Lab.ready (if present) + settle time, runs --eval, then reports
// console errors/warnings, exceptions, failed requests, unfilled data-card spans, KaTeX errors, raw TeX left
// in text, glossary links to missing ids, broken in-page anchors, broken images, empty widgets, unmounted
// labs, and page-level horizontal overflow (with the outermost offending elements). Screenshots: N segments
// of the page per mode (DIR/<key>-<mode>-<k>.png) and one shot per element matching --shots.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import os from "node:os";
import { fileURLToPath } from "node:url";

const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const LECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(a) {
  const o = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith("--")) {
      const k = a[i].slice(2);
      const v = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : "true";
      o[k] = v;
    }
  }
  return o;
}
const A = parseArgs(process.argv.slice(2));
const KNOWN = ["out", "pages", "existing", "mode", "segments", "shots", "max-shots", "eval", "wait", "hash", "base", "file", "urls", "keep", "help"];
const unknown = Object.keys(A).filter(k => KNOWN.indexOf(k) < 0);
if (A.help || process.argv.includes("-h") || unknown.length) {
  // Print the usage block at the top of this file, then stop: an unknown flag never starts a run.
  if (unknown.length && !A.help) console.error("Unknown option(s): --" + unknown.join(", --") + "\n");
  const own = fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n");
  console.log(own.slice(0, own.findIndex(l => !l.startsWith("//"))).map(l => l.replace(/^\/\/ ?/, "")).join("\n"));
  process.exit(A.help ? 0 : 2);
}
const BASE = A.file ? "file://" + LECT + "/" : (A.base || "http://127.0.0.1:8765/1-introduction-gwas-qc/");
// Results go to --out; without it, to a folder in the system temp directory, never into the site.
const OUT = path.resolve(A.out || path.join(os.tmpdir(), "lecture1-browser-check"));
const MODES = (A.mode || "desktop") === "both" ? ["desktop", "phone"] : [A.mode || "desktop"];
const SEGMENTS = +(A.segments || 0);
const WAIT = +(A.wait || 1200);
fs.mkdirSync(OUT, { recursive: true });

function loadPages() {
  const src = fs.readFileSync(path.join(LECT, "assets/js/pages.js"), "utf8");
  const win = {};
  new Function("window", src)(win);
  return win.SITE.pages;
}
const PAGES = loadPages();
let keys = !A.pages || A.pages === "all" ? Object.keys(PAGES) : A.pages.split(",");
if (A.pages === "all" || A.existing) keys = keys.filter((k) => fs.existsSync(path.join(LECT, PAGES[k].file)));
if (A.urls) {  // --urls "http://host/a.html,http://host/b/c.html": check arbitrary pages; key = last two path parts
  keys = A.urls.split(",").map((u) => { const k = u.replace(/[?#].*$/, "").split("/").slice(-2).join("_").replace(/\.html$/, ""); PAGES[k] = { file: u, abs: true }; return k; });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = new Set();
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { res, rej } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? rej(new Error(msg.error.message + " " + (msg.error.data || ""))) : res(msg.result);
      } else if (msg.method) for (const h of [...this.handlers]) h(msg);
    };
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((res, rej) => this.pending.set(id, { res, rej }));
  }
  on(fn) { this.handlers.add(fn); return () => this.handlers.delete(fn); }
  waitFor(method, timeout = 20000) {
    return new Promise((res, rej) => {
      const t = setTimeout(() => { off(); rej(new Error("timeout waiting for " + method)); }, timeout);
      const off = this.on((m) => { if (m.method === method) { clearTimeout(t); off(); res(m.params); } });
    });
  }
}

// Each run gets its own profile and a free port (Chrome writes the port it chose to DevToolsActivePort), so
// several runs can go at the same time.
async function launch() {
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), "lecture1-chrome-"));   // never inside the site, even if --out is
  const proc = spawn(CHROME, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${prof}`,
    "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check",
    "--allow-file-access-from-files", "about:blank"], { stdio: "ignore" });
  for (let i = 0; i < 150; i++) {
    try {
      const port = fs.readFileSync(path.join(prof, "DevToolsActivePort"), "utf8").split("\n")[0].trim();
      const r = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (r.ok) { const l = await r.json(); const p = l.find((t) => t.type === "page"); if (p) return { proc, prof, url: p.webSocketDebuggerUrl }; }
    } catch {}
    await sleep(100);
  }
  proc.kill();
  throw new Error("Chrome did not start (set CHROME to the browser binary)");
}

const CHECK = `(() => {
  const out = {};
  const vw = document.documentElement.clientWidth;
  const main = document.querySelector('main') || document.body;
  const desc = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.') : '');
  out.title = document.title;
  out.height = document.documentElement.scrollHeight;
  out.dc = { total: document.querySelectorAll('[data-card]').length,
    missing: [...document.querySelectorAll('[data-card]')].filter(n => n.classList.contains('dc-missing') || n.textContent.trim() === '?').map(n => n.getAttribute('data-card')) };
  out.katexErrors = [...document.querySelectorAll('.katex-error')].map(n => (n.getAttribute('title') || n.textContent).slice(0, 120));
  const raw = [];
  const w = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement && n.parentElement.closest('pre,code,script,style,textarea,.katex,.cm-editor,.lab,.rlab') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
  let t; while ((t = w.nextNode())) if (/\\\\\\(|\\\\\\[|\\\\frac|\\\\hat\\{|\\\\mathrm|\\\\text\\{/.test(t.nodeValue)) raw.push(t.nodeValue.trim().slice(0, 100));
  out.rawTex = raw.slice(0, 8);
  const GL = (window.LectureSite && window.LectureSite.glossary) || {};
  const termIds = [...document.querySelectorAll('a.term')].map(a => { const h = a.getAttribute('href') || ''; const i = h.indexOf('#'); return i >= 0 ? decodeURIComponent(h.slice(i + 1)) : ''; });
  out.terms = { links: termIds.length, distinct: new Set(termIds).size, missing: [...new Set(termIds.filter(id => !GL[id]))] };
  out.brokenAnchors = [...new Set([...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href').slice(1)).filter(id => id && !document.getElementById(decodeURIComponent(id))))];
  out.brokenImgs = [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.getAttribute('src'));
  out.widgets = [...document.querySelectorAll('.widget')].map(x => { const b = x.querySelector('.widget-body'); return { id: x.id, empty: b ? b.children.length === 0 : null, h: Math.round(x.getBoundingClientRect().height) }; });
  out.emptyWidgets = out.widgets.filter(x => x.empty).map(x => x.id);
  out.labs = [...document.querySelectorAll('div.lab:not(.callout), div.rlab')].map(x => ({ id: x.id, cls: x.className, kids: x.children.length, h: Math.round(x.getBoundingClientRect().height) }));
  out.overflow = { scrollWidth: document.documentElement.scrollWidth, vw, offenders: [] };
  if (document.documentElement.scrollWidth > vw + 1) {
    const offs = [];
    const clipped = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const ox = getComputedStyle(p).overflowX; if (ox !== 'visible') return true; } return false; };
    document.querySelectorAll('body *').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > vw + 1 && !offs.some(o => o.contains(el)) && !clipped(el)) offs.push(el);
    });
    out.overflow.offenders = offs.slice(0, 10).map(el => desc(el) + ' right=' + Math.round(el.getBoundingClientRect().right) + ' w=' + Math.round(el.getBoundingClientRect().width));
  }
  return out;
})()`;

async function evaluate(cdp, expr, awaitPromise = true, timeout = 60000) {
  let timer;
  const r = await Promise.race([
    cdp.send("Runtime.evaluate", { expression: expr, awaitPromise, returnByValue: true, userGesture: true }),
    new Promise((res) => { timer = setTimeout(() => res({ timeout: true }), timeout); }),
  ]);
  clearTimeout(timer);
  if (r.timeout) return { __error: "evaluate timeout" };
  if (r.exceptionDetails) return { __error: (r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text };
  return r.result.value;
}

async function shot(cdp, file, clip) {
  const r = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { ...clip, scale: 1 } });
  fs.writeFileSync(file, Buffer.from(r.data, "base64"));
}

async function main() {
  const { proc, prof, url } = await launch();
  const ws = new WebSocket(url);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  const cdp = new CDP(ws);
  let logs = [];
  const reqs = new Map();
  cdp.on((m) => {
    if (m.method === "Runtime.consoleAPICalled" && /error|warning|assert/.test(m.params.type))
      logs.push(m.params.type + ": " + m.params.args.map((a) => a.value !== undefined ? String(a.value) : a.description || a.type).join(" ").slice(0, 300));
    else if (m.method === "Runtime.exceptionThrown") {
      const d = m.params.exceptionDetails;
      logs.push("exception: " + ((d.exception && d.exception.description) || d.text).split("\n").slice(0, 3).join(" | ").slice(0, 400) + (d.url ? " @" + d.url.split("/").pop() + ":" + d.lineNumber : ""));
    } else if (m.method === "Log.entryAdded" && /error|warning/.test(m.params.entry.level))
      logs.push("log-" + m.params.entry.level + ": " + m.params.entry.text.slice(0, 200) + (m.params.entry.url ? " " + m.params.entry.url : ""));
    else if (m.method === "Network.requestWillBeSent") reqs.set(m.params.requestId, m.params.request.url);
    else if (m.method === "Network.loadingFailed" && !m.params.canceled)
      logs.push("net-fail: " + m.params.errorText + " " + (reqs.get(m.params.requestId) || ""));
    else if (m.method === "Network.responseReceived" && m.params.response.status >= 400)
      logs.push("http-" + m.params.response.status + ": " + m.params.response.url);
    else if (m.method === "Page.javascriptDialogOpening") { logs.push("dialog: " + m.params.message); cdp.send("Page.handleJavaScriptDialog", { accept: true }); }
  });
  await cdp.send("Page.enable"); await cdp.send("Runtime.enable"); await cdp.send("Log.enable"); await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });

  const report = {};
  for (const key of keys) {
    const page = PAGES[key];
    if (!page) { console.log("unknown key " + key); continue; }
    for (const mode of MODES) {
      const phone = mode === "phone";
      const W = phone ? 390 : 1280, H = phone ? 844 : 900;
      await cdp.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: phone ? 2 : 1, mobile: phone });
      await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: phone });
      logs = [];
      const target = (page.abs ? page.file : BASE + page.file) + (A.hash ? "#" + A.hash : "");
      const loaded = cdp.waitFor("Page.loadEventFired", 30000);
      await cdp.send("Page.navigate", { url: target });
      try { await loaded; } catch (e) { logs.push("load: " + e.message); }
      await evaluate(cdp, "window.Lab && Lab.ready ? Promise.race([Lab.ready.then(() => 'ready'), new Promise(r => setTimeout(() => r('lab-timeout'), 20000))]) : 'no-lab'");
      await sleep(WAIT);
      if (A.eval) {
        const v = await evaluate(cdp, "(async () => { " + A.eval + " })()", true, 120000);
        if (v !== undefined) console.log(`[${key}/${mode}] eval →`, typeof v === "string" ? v : JSON.stringify(v));
        await sleep(400);
      }
      await evaluate(cdp, "document.querySelectorAll('img[loading=lazy]').forEach(i => i.loading = 'eager'); true");
      await sleep(300);
      const res = await evaluate(cdp, CHECK, false);
      res.logs = [...new Set(logs)];
      report[key + "/" + mode] = res;
      const tag = key + "-" + mode;
      if (SEGMENTS) {
        const total = res.height || H;
        const segH = phone ? 1400 : 1600;
        const n = Math.min(SEGMENTS, Math.ceil(total / segH));
        const startY = A.hash ? (await evaluate(cdp, `(() => { const e = document.getElementById(${JSON.stringify(A.hash)}); return e ? Math.max(0, Math.round(e.getBoundingClientRect().top + scrollY - 80)) : 0; })()`, false)) : 0;
        for (let k = 0; k < n; k++) {
          const y = startY + k * segH;
          if (y >= total) break;
          await shot(cdp, path.join(OUT, `${tag}-${k + 1}.png`), { x: 0, y, width: W, height: Math.min(segH, total - y) });
        }
      }
      if (A.shots) {
        const rects = await evaluate(cdp, `[...document.querySelectorAll(${JSON.stringify(A.shots)})].slice(0, ${+(A["max-shots"] || 12)}).map(e => { const r = e.getBoundingClientRect(); return { id: e.id || '', x: Math.max(0, Math.floor(r.left + scrollX) - 6), y: Math.max(0, Math.floor(r.top + scrollY) - 6), w: Math.ceil(r.width) + 12, h: Math.ceil(r.height) + 12 }; })`, false);
        let i = 0;
        for (const r of rects || []) {
          i++;
          if (!r.w || !r.h) continue;
          await shot(cdp, path.join(OUT, `${tag}-el${i}${r.id ? "-" + r.id : ""}.png`), { x: Math.min(r.x, W - 1), y: r.y, width: Math.min(r.w, W), height: Math.min(r.h, 6000) });
        }
      }
      const issues = [];
      if (res.__error) issues.push("CHECK ERROR " + res.__error);
      else {
        if (res.logs.length) issues.push("console/network:\n    " + res.logs.join("\n    "));
        if (res.dc.missing.length) issues.push("unfilled data-card: " + [...new Set(res.dc.missing)].join(", "));
        if (res.katexErrors.length) issues.push("katex errors: " + res.katexErrors.join(" || "));
        if (res.rawTex.length) issues.push("raw TeX in text: " + res.rawTex.join(" || "));
        if (res.terms.missing.length) issues.push("term links to missing glossary ids: " + res.terms.missing.join(", "));
        if (res.brokenAnchors.length) issues.push("broken #anchors: " + res.brokenAnchors.join(", "));
        if (res.brokenImgs.length) issues.push("broken images: " + res.brokenImgs.join(", "));
        if (res.emptyWidgets.length) issues.push("empty widgets: " + res.emptyWidgets.join(", "));
        if (res.overflow.offenders.length) issues.push(`horizontal overflow (scrollWidth ${res.overflow.scrollWidth} > ${res.overflow.vw}):\n    ` + res.overflow.offenders.join("\n    "));
      }
      console.log(`== ${key} [${mode}] h=${res.height} widgets=${(res.widgets || []).length} labs=${(res.labs || []).length} terms=${res.terms ? res.terms.links + "/" + res.terms.distinct : "?"} dc=${res.dc ? res.dc.total : "?"} ${issues.length ? "ISSUES" : "ok"}`);
      for (const s of issues) console.log("  - " + s);
    }
  }
  fs.writeFileSync(path.join(OUT, "qa-report.json"), JSON.stringify(report, null, 1));
  console.log("Report and screenshots in " + OUT);
  ws.close();
  await new Promise((r) => { proc.on("exit", r); proc.kill(); setTimeout(r, 5000); });
  if (!A.keep) { try { fs.rmSync(prof, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); } catch (e) {} }
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
