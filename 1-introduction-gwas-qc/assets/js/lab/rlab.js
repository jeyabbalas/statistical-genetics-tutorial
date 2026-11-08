/* ==========================================================================
   Lecture 1 lab: the R console (WebR), optional
   --------------------------------------------------------------------------
   <div class="rlab" data-title="…" data-packages="data.table,dplyr,ggplot2">
     <pre class="lab-setup">plink … (optional: shell commands run in the lab before the first R run)</pre>
     <pre class="rlab-code">R code</pre>
   </div>
   becomes an editable code box with a "Run in R" button. Nothing is downloaded until the reader
   clicks it; then WebR (R compiled to WebAssembly, https://docs.r-wasm.org/webr/v0.6.0/) is loaded from
   its CDN, the packages are installed from repo.r-wasm.org, the lab's files are copied into R's file
   system at the same paths, and the code runs with input_dir, reference_dir and analysis_dir defined
   and the working directory set to ~/statgen-workshop. Later runs reuse the same R session and copy
   only the files that changed. Needs a network connection on first use; everything else in the lab
   works offline. Documented in assets/js/lab/LAB.md.
   ========================================================================== */
(function (G) {
  "use strict";
  var doc = G.document;
  if (!doc) return;

  var WEBR_VERSION = "0.6.0";
  var WEBR_URL = "https://webr.r-wasm.org/v" + WEBR_VERSION + "/webr.mjs";
  var DEFAULT_PACKAGES = ["data.table", "dplyr", "ggplot2", "glue"];
  // Download sizes measured in Chrome on 2026-11-08 (bytes transferred; see LAB.md): R itself from
  // webr.r-wasm.org, the four default packages with their dependencies from repo.r-wasm.org, and tidyverse.
  var SIZE_R = "about 15 MB";
  var SIZE_PACKAGES = "about 24 MB";
  var SIZE_TIDYVERSE = "about 76 MB";
  var PLOT_MAX = 720, PLOT_MIN = 360, PLOT_ZOOM = 1.25;   // plot width on the page (CSS px) and R's text scale
  var START_TIMEOUT = 180000;   // ms before giving up on starting R
  var SLOW_NOTICE = 20000;      // ms before telling the reader that R is slow to start
  var HOME = "/home/student", PROJECT = HOME + "/statgen-workshop";

  var R = {
    webR: null,
    starting: null,
    installed: Object.create(null),
    synced: Object.create(null),   // path -> lab file version copied into R
    dirs: Object.create(null),
    queue: Promise.resolve(),
    blocks: [],
    attempts: 0
  };
  var uid = 0;

  function h(tag, attrs) {
    var e = doc.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "text") e.textContent = v;
      else if (k === "class") e.className = v;
      else e.setAttribute(k, v === true ? "" : String(v));
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      e.appendChild(typeof c === "object" ? c : doc.createTextNode(String(c)));
    }
    return e;
  }
  function enqueue(fn) {
    var p = R.queue.then(fn);
    R.queue = p.then(function () {}, function () {});
    return p;
  }
  function timeout(promise, ms, message) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(new Error(message)); }, ms);
      promise.then(function (v) { clearTimeout(t); resolve(v); }, function (e) { clearTimeout(t); reject(e); });
    });
  }
  function copyText(text) {
    function fallback() {
      var ta = h("textarea", { "aria-hidden": "true" });
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      doc.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = doc.execCommand("copy"); } catch (e) { ok = false; }
      ta.remove();
      return ok;
    }
    if (G.navigator && G.navigator.clipboard && G.navigator.clipboard.writeText) {
      return G.navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(); });
    }
    return Promise.resolve(fallback());
  }
  function rString(s) { return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"'; }

  /* ---------------- starting R (once per page) ---------------- */
  function startR(report) {
    if (R.webR) return Promise.resolve(R.webR);
    if (R.starting) return R.starting;
    R.starting = (async function () {
      report("Downloading R for the browser (WebR " + WEBR_VERSION + ", " + SIZE_R + ")…", 0.05);
      var mod;
      // A failed import may be remembered by the browser, so a retry asks for a fresh URL.
      try { mod = await import(WEBR_URL + (R.attempts++ ? "?retry=" + R.attempts : "")); }
      catch (e) {
        var err = new Error("download");
        err.detail = e && e.message || String(e);
        throw err;
      }
      var webR = new mod.WebR({ interactive: false });
      var slow = setTimeout(function () { report("R is still starting. This can take a minute on a slow connection or an older device…", 0.3); }, SLOW_NOTICE);
      try { await timeout(webR.init(), START_TIMEOUT, "start-timeout"); }
      finally { clearTimeout(slow); }
      report("Setting up R…", 0.45);
      await webR.evalRVoid([
        "options(width = 90, warn = 1, datatable.print.class = FALSE)",
        "input_dir <- " + rString(PROJECT + "/data/inputs/penncath_withPheno"),
        "reference_dir <- " + rString(PROJECT + "/data/inputs/ref"),
        "analysis_dir <- " + rString(PROJECT + "/analysis")
      ].join("\n"));
      R.webR = webR;
      return webR;
    })();
    R.starting.catch(function () { R.starting = null; });
    return R.starting;
  }
  async function ensurePackages(pkgs, report) {
    var todo = pkgs.filter(function (p) { return !R.installed[p]; });
    for (var i = 0; i < todo.length; i++) {
      report("Installing the R package " + todo[i] + " and what it needs (" + (i + 1) + " of " + todo.length + ")…", 0.5 + 0.4 * i / todo.length);
      await R.webR.installPackages([todo[i]], { quiet: true });
      R.installed[todo[i]] = true;
    }
  }
  /* Copy the lab's files into R's file system at the same absolute paths (only those that changed). */
  async function syncFiles() {
    var Lab = G.Lab;
    if (!Lab || !Lab._page || !Lab._page.fs) return 0;
    var fs = Lab._page.fs, webR = R.webR, copied = 0;
    var all = fs.walk(HOME, true);
    for (var i = 0; i < all.length; i++) {
      var p = all[i], node = fs.lookup(p);
      if (!node) continue;
      if (node.type === "d") {
        if (!R.dirs[p]) {
          try { await webR.FS.mkdir(p); } catch (e) { /* exists */ }
          R.dirs[p] = true;
        }
        continue;
      }
      if (R.synced[p] === node.ver) continue;
      var data = node.data;
      var bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
      await webR.FS.writeFile(p, bytes);
      R.synced[p] = node.ver;
      copied++;
    }
    for (var q in R.synced) {
      if (!fs.isFile(q)) {
        try { await webR.FS.unlink(q); } catch (e) { /* gone */ }
        delete R.synced[q];
      }
    }
    if (!R.wdSet) {
      await webR.evalRVoid("setwd(" + rString(PROJECT) + ")");
      R.wdSet = true;
    }
    return copied;
  }
  async function conditionText(d) {
    if (d == null) return "";
    if (typeof d === "string") return d;
    try {
      var m = await d.get("message");
      var js = await m.toJs();
      if (js && js.values) return js.values.join("\n");
    } catch (e) { /* fall through */ }
    return String(d);
  }

  /* ---------------- one R block ---------------- */
  function Block(el) {
    var B = this;
    B.el = el;
    B.id = el.id || ("rlab-" + (++uid));
    if (!el.id) el.id = B.id;
    var codeEl = el.querySelector("pre.rlab-code");
    B.original = codeEl ? codeEl.textContent.replace(/^\n/, "").replace(/\s+$/, "") : "";
    var setups = el.querySelectorAll("pre.lab-setup");
    B.setup = Array.prototype.map.call(setups, function (p) { return p.textContent.trim(); }).filter(Boolean).join("\n");
    B.setupDone = false;
    Array.prototype.forEach.call(el.querySelectorAll("pre.rlab-code, pre.lab-setup"), function (p) { p.hidden = true; });
    B.packages = (el.getAttribute("data-packages") || DEFAULT_PACKAGES.join(",")).split(/[\s,]+/).filter(Boolean);
    B.plotW = +el.getAttribute("data-width") || 0;     // R device size in pixels (0: fit the page)
    B.plotH = +el.getAttribute("data-height") || 0;
    var title = el.getAttribute("data-title") || "R console";
    el.classList.add("rlab-on");

    B.editor = h("textarea", { "class": "rlab-editor", id: B.id + "-code", spellcheck: "false", autocapitalize: "off", autocomplete: "off",
      autocorrect: "off", "aria-label": "R code (editable). Control+Enter or Command+Enter runs it." });
    B.editor.value = B.original;
    B.editor.rows = Math.min(30, Math.max(4, B.original.split("\n").length + 1));
    B.runBtn = h("button", { type: "button", "class": "btn primary rlab-btn" }, "Run in R");
    B.copyBtn = h("button", { type: "button", "class": "lab-btn light" }, "Copy code");
    B.resetBtn = h("button", { type: "button", "class": "lab-btn light" }, "Reset code");
    var pkgSize = B.packages.indexOf("tidyverse") >= 0 ? SIZE_TIDYVERSE : B.packages.every(function (p) { return DEFAULT_PACKAGES.indexOf(p) >= 0; }) ? (B.packages.length === DEFAULT_PACKAGES.length ? SIZE_PACKAGES : "up to " + SIZE_PACKAGES) : "size depends on the packages";
    B.hint = h("span", { "class": "rlab-hint" }, R.webR ? "R is ready." :
      "The first run downloads R for the browser (WebR, " + SIZE_R + ") and the R packages " + B.packages.join(", ") + " (" + pkgSize + "); later runs start at once.");
    B.progress = h("progress", { "class": "rlab-progress", max: "1", value: "0", hidden: true, "aria-label": "Starting R" });
    B.status = h("div", { "class": "rlab-status", role: "status", "aria-live": "polite" });
    B.text = h("pre", { "class": "rlab-text", tabindex: "0", "aria-label": "R output" });
    B.plots = h("div", { "class": "rlab-plots" });
    B.out = h("div", { "class": "rlab-out", "aria-live": "polite" });
    el.appendChild(h("div", { "class": "rlab-bar" }, h("span", { "class": "rlab-badge", "aria-hidden": "true" }, "R"), h("span", { "class": "rlab-title" }, title)));
    el.appendChild(B.editor);
    el.appendChild(h("div", { "class": "rlab-actions" }, B.runBtn, B.copyBtn, B.resetBtn, B.hint));
    el.appendChild(B.progress);
    el.appendChild(B.status);
    el.appendChild(B.out);

    B.runBtn.addEventListener("click", function () { B.run(); });
    B.editor.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); B.run(); }
    });
    B.copyBtn.addEventListener("click", function () {
      copyText(B.editor.value).then(function (ok) { B.flash(B.copyBtn, ok ? "Copied" : "Copy failed", "Copy code"); });
    });
    B.resetBtn.addEventListener("click", function () { B.editor.value = B.original; B.flash(B.resetBtn, "Code reset", "Reset code"); });
  }
  Block.prototype.flash = function (btn, text, back) {
    btn.textContent = text;
    clearTimeout(btn._t);
    btn._t = setTimeout(function () { btn.textContent = back; }, 1500);
  };
  Block.prototype.report = function (text, frac) {
    this.status.textContent = text || "";
    if (frac == null) { this.progress.hidden = true; return; }
    this.progress.hidden = false;
    this.progress.value = Math.max(0, Math.min(1, frac));
  };
  Block.prototype.print = function (text, cls) {
    if (!text) return;
    if (cls) this.text.appendChild(h("span", { "class": cls }, text));
    else this.text.appendChild(doc.createTextNode(text));
  };
  Block.prototype.showFailure = function (e) {
    var why;
    var fileUrl = G.location && G.location.protocol === "file:";
    if (e && e.message === "download") {
      why = "R could not be downloaded from webr.r-wasm.org" + (e.detail ? " (" + e.detail + ")" : "") + ". The R console needs an internet connection the first time it runs" +
        (fileUrl ? ", and some browsers refuse to load it into a page opened from a file on your computer" : "") + "; Run in R tries again.";
    } else if (e && e.message === "start-timeout") {
      why = "R did not finish starting within " + Math.round(START_TIMEOUT / 60000) + " minutes. Slow connections and older phones or tablets can be too slow for R in the browser.";
    } else {
      why = "R stopped with an error in the browser: " + (e && e.message || e) + ".";
    }
    this.out.insertBefore(h("p", { "class": "rlab-fail" }, why + " The rest of the lab still works. To run this code, copy it into R or RStudio on your own computer (the Setup page explains how), where the same files are in ~/statgen-workshop after you run the practical's PLINK commands."), this.out.firstChild);
  };
  Block.prototype.run = function () {
    var B = this;
    if (B.running) return Promise.resolve();
    B.running = true;
    B.runBtn.disabled = true;
    B.runBtn.textContent = "Running…";
    B.out.textContent = "";
    B.text.textContent = "";
    B.plots.textContent = "";
    return enqueue(async function () {
      var report = function (t, f) { B.report(t, f); };
      try {
        if (B.setup && !B.setupDone && G.Lab && G.Lab.run) {
          report("Running the lab setup commands…", null);
          await G.Lab.ready;
          var res = await G.Lab.run(B.setup);
          B.setupDone = res.code === 0;
        }
        await startR(report);
        await ensurePackages(B.packages, report);
        report("Copying the lab's files into R…", 0.95);
        await syncFiles();
        report("Running…", null);
        await B.evaluate(B.editor.value);
        report("", null);
        R.blocks.forEach(function (b) { if (!b.running) b.hint.textContent = "R is ready; each run uses the lab's files as they are now."; });
        B.hint.textContent = "R is ready; each run uses the lab's files as they are now.";
      } catch (e) {
        report("", null);
        B.out.appendChild(B.text);
        B.showFailure(e);
        if (G.console) console.warn("rlab:", e);
      } finally {
        B.running = false;
        B.runBtn.disabled = false;
        B.runBtn.textContent = "Run in R";
      }
    });
  };
  Block.prototype.evaluate = async function (code) {
    var B = this, webR = R.webR;
    B.out.appendChild(B.text);
    B.out.appendChild(B.plots);
    var wantsTidy = /\b(library|require)\(\s*["']?tidyverse["']?\s*\)/.test(code) && B.packages.indexOf("tidyverse") < 0 && !R.installed.tidyverse;
    if (wantsTidy) {
      B.print("lab: library(tidyverse) needs the tidyverse package, which this console does not download by itself: with its dependencies it is " + SIZE_TIDYVERSE + ", against " + SIZE_PACKAGES + " for data.table, dplyr, ggplot2 and glue. The practical's code uses only dplyr and ggplot2 from the tidyverse, so library(dplyr) and library(ggplot2) do the same job here. Or download the tidyverse with the button below.\n", "rlab-msg");
    }
    var shelter = await new webR.Shelter();
    try {
      // Plots are drawn a little smaller than they are shown, so R's 9-11 pt text stays readable on the page.
      var boxW = Math.max(300, Math.min(PLOT_MAX, B.el.clientWidth - 26));
      var devW = B.plotW || Math.round(Math.max(PLOT_MIN, boxW) / PLOT_ZOOM);
      var devH = B.plotH || Math.round(devW * 0.64);
      var cap = await shelter.captureR(code, {
        withAutoprint: true, captureStreams: true, captureConditions: true, throwJsException: false,
        captureGraphics: { width: devW, height: devH }
      });
      for (var i = 0; i < cap.output.length; i++) {
        var o = cap.output[i];
        if (o.type === "stdout") B.print(o.data + "\n");
        else if (o.type === "stderr") B.print(o.data + "\n", "rlab-msg");
        else if (o.type === "message") B.print((await conditionText(o.data)).replace(/\n?$/, "\n"), "rlab-msg");
        else if (o.type === "warning") B.print("Warning message:\n" + (await conditionText(o.data)) + "\n", "rlab-msg");
        else if (o.type === "error") B.print("Error: " + (await conditionText(o.data)) + "\n", "rlab-err");
      }
      (cap.images || []).forEach(function (img, k) {
        var c = h("canvas", { width: img.width, height: img.height, role: "img", "aria-label": "Plot " + (k + 1) + " drawn by R" });
        c.getContext("2d").drawImage(img, 0, 0);
        c.style.width = Math.min(boxW, Math.round(devW * PLOT_ZOOM)) + "px";
        B.plots.appendChild(c);
      });
      if (!B.text.textContent && !(cap.images || []).length) B.print("(The code ran without printing anything.)\n", "rlab-msg");
      if (!B.text.textContent) B.text.remove();
      if (wantsTidy) {
        var tb = h("button", { type: "button", "class": "lab-btn light rlab-tidy" }, "Download the tidyverse (" + SIZE_TIDYVERSE + ") and run again");
        tb.addEventListener("click", function () { if (B.packages.indexOf("tidyverse") < 0) B.packages.push("tidyverse"); B.run(); });
        B.out.appendChild(h("p", { "class": "rlab-more" }, tb));
      }
    } finally {
      try { await shelter.purge(); } catch (e) { /* ignore */ }
    }
  };

  function mountAll() {
    Array.prototype.forEach.call(doc.querySelectorAll("div.rlab"), function (el) {
      if (el._rlab) return;
      try { el._rlab = new Block(el); R.blocks.push(el._rlab); }
      catch (e) { if (G.console) console.error("rlab: could not build the R console", el, e); }
    });
  }
  G.RLab = {
    version: WEBR_VERSION,
    mount: function (el) { if (!el._rlab) { el._rlab = new Block(el); R.blocks.push(el._rlab); } return el._rlab; },
    start: function () { return startR(function () {}); },
    get webR() { return R.webR; },
    sync: function () { return R.webR ? syncFiles() : Promise.resolve(0); },
    packages: DEFAULT_PACKAGES.slice()
  };
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", mountAll);
  else mountAll();
})(typeof window !== "undefined" ? window : this);
