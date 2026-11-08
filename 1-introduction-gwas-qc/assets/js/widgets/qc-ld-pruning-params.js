/* QC step 3 · plink --indep-pairwise on the toy data with other windows, steps and thresholds.
   Runs the command in the lab (Lab.run) with the settings chosen here, and also picks up every
   --indep-pairwise run made in the terminals (lab:fs-change), or found on load from the .log next to a
   .prune.in file. For each run it counts the IDs in .prune.in and .prune.out and compares the runs in a
   bar chart (Lab.plot.bar) and a table. Loaded after lab.js. */
(function () {
  "use strict";
  var root = document.getElementById("w-prune-params");
  if (!root) return;
  var body = root.querySelector(".widget-body");
  var BFILE = "${analysis_dir}/toy.geno0.01.mind0.01";
  var STEP1 = [
    "plink --bfile ${input_dir}/toy --geno 0.01 --make-bed --out ${analysis_dir}/toy.geno0.01",
    "plink --bfile ${analysis_dir}/toy.geno0.01 --mind 0.01 --make-bed --out ${analysis_dir}/toy.geno0.01.mind0.01"
  ];

  function el(tag, attrs, parent, text) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function pick(parent, label, options, value) {
    var lab = el("label", { "class": "w-pick" }, parent, label + " ");
    var sel = el("select", null, lab);
    options.forEach(function (o) { el("option", { value: o[0] }, sel, o[1]); });
    sel.value = value;
    return sel;
  }
  function base(p) { return String(p).split("/").pop(); }
  function countLines(text) { return text == null ? null : text.split("\n").filter(function (l) { return /\S/.test(l); }).length; }

  if (!window.Lab) {
    body.textContent = "";
    el("p", { "class": "note" }, body, "This widget runs commands in the in-browser lab, which did not load on this page.");
    return;
  }

  body.textContent = "";
  var row1 = el("div", { "class": "controls" }, body);
  var selWin = pick(row1, "Window", [["10", "10 SNPs"], ["50", "50 SNPs"], ["200", "200 SNPs"], ["1000", "1,000 SNPs"],
                                     ["250kb", "250 kb"], ["1000kb", "1,000 kb"]], "50");
  var selStep = pick(row1, "Step", [["1", "1 SNP"], ["5", "5 SNPs"], ["25", "25 SNPs"], ["50", "50 SNPs"]], "5");
  var selThr = pick(row1, "r² threshold", [["0.1", "0.1"], ["0.2", "0.2"], ["0.3", "0.3"], ["0.5", "0.5"], ["0.8", "0.8"]], "0.3");
  var row2 = el("div", { "class": "controls" }, body);
  var runBtn = el("button", { type: "button", "class": "btn primary" }, row2, "Run --indep-pairwise");
  var status = el("span", { "class": "note", "aria-live": "polite" }, row2, "Waiting for the lab…");
  var cmdBox = el("div", { "class": "readout pp-cmd" }, body);
  var plotBox = el("div", { "class": "pp-plot" }, body);
  var table = el("div", { "class": "readout pp-table", "aria-live": "polite" }, body);

  var runs = [], chart = null;

  function settings() {
    var w = selWin.value, kb = /kb$/.test(w);
    return { w: w, s: kb ? "1" : selStep.value, t: selThr.value, kb: kb };
  }
  function command() {
    var o = settings();
    return "plink --bfile " + BFILE + " --indep-pairwise " + o.w + " " + o.s + " " + o.t +
      " --out ${analysis_dir}/toy.prune_" + o.w + "_" + o.s + "_" + o.t;
  }
  /* A window in kb takes a step of 1 (PLINK warns otherwise); a window in SNPs takes a step no larger than
     itself, since PLINK leaves SNPs outside every window when the step is larger. */
  function syncStep() {
    var w = selWin.value, kb = /kb$/.test(w), n = parseInt(w, 10);
    Array.prototype.forEach.call(selStep.options, function (o) { o.disabled = !kb && Number(o.value) > n; });
    if (kb) selStep.value = "1";
    else if (Number(selStep.value) > n) {
      var ok = Array.prototype.filter.call(selStep.options, function (o) { return !o.disabled; });
      selStep.value = ok[ok.length - 1].value;
    }
    selStep.disabled = kb;
  }
  /* The command, one unbreakable span per word, so that a narrow screen breaks lines between words only. */
  function showCommand() {
    syncStep();
    cmdBox.textContent = "";
    command().split(" ").forEach(function (word, i) {
      if (i) cmdBox.appendChild(document.createTextNode(" "));
      el("span", { "class": "pp-word" }, cmdBox, word);
    });
    if (settings().kb) el("span", { "class": "pp-note" }, cmdBox, "(With a window in kb, PLINK expects a step of 1.)");
  }

  /* "--indep-pairwise 50 5 0.3" or "--indep-pairwise 250kb 1 0.3" / "250 kb 1 0.3" → "50 5 0.3" etc. */
  function parseParams(text) {
    var m = /--indep-pairwise\s+(\d+)\s*(kb)?\s+(\d+)\s+([0-9.eE+-]+)/i.exec(text || "");
    return m ? m[1] + (m[2] ? "kb" : "") + " " + m[3] + " " + m[4] : null;
  }
  function parseInput(text) {
    var m = /--bfile\s+(\S+)/.exec(text || "");
    return m ? base(m[1]) : null;
  }

  function record(prefix, params, input) {
    var kept = countLines(Lab.fs.readText(prefix + ".prune.in"));
    var removed = countLines(Lab.fs.readText(prefix + ".prune.out"));
    if (kept == null || removed == null) return;
    var label = (params || base(prefix)) + (input && input !== "toy.geno0.01.mind0.01" ? " (" + input + ")" : "");
    var row = { prefix: prefix, label: label, kept: kept, removed: removed };
    var at = -1;
    runs.forEach(function (r, i) { if (r.prefix === prefix || r.label === label) at = i; });
    if (at >= 0) runs.splice(at, 1);
    runs.push(row);
  }

  function scan() {
    runs = [];
    var dir = Lab.paths.analysis_dir, names = Lab.fs.list(dir) || [];
    names.filter(function (n) { return /\.prune\.in$/.test(n); }).forEach(function (n) {
      var prefix = dir + "/" + n.replace(/\.prune\.in$/, ""), log = Lab.fs.readText(prefix + ".log");
      record(prefix, parseParams(log), parseInput(log));
    });
  }

  function draw() {
    if (!runs.length) {
      if (chart) { chart.destroy(); chart = null; }
      plotBox.textContent = "";
      el("p", { "class": "note" }, plotBox, "No .prune.in yet: run the command in the terminal above, or press the button.");
      table.textContent = "";
      table.hidden = true;
      return;
    }
    var data = runs.map(function (r) { return [r.label, r.kept]; });
    var opts = { horizontal: true, xLabel: "SNPs kept (lines of .prune.in)",
                 ariaLabel: "SNPs kept by each --indep-pairwise run on the toy data: " + runs.map(function (r) { return r.label + ": " + r.kept; }).join("; ") + "." };
    if (chart) chart.update(data, opts);
    else { plotBox.textContent = ""; chart = Lab.plot.bar(plotBox, data, opts); }
    var w = Math.max.apply(null, runs.map(function (r) { return r.label.length; }).concat([14]));
    var pad = function (s, n) { s = String(s); while (s.length < n) s += " "; return s; };
    var lpad = function (s, n) { s = String(s); while (s.length < n) s = " " + s; return s; };
    var lines = [pad("window step r²", w) + lpad("kept", 7) + lpad("set aside", 11) + lpad("kept %", 8)];
    runs.forEach(function (r) {
      var tot = r.kept + r.removed;
      lines.push(pad(r.label, w) + lpad(r.kept.toLocaleString("en-US"), 7) + lpad(r.removed.toLocaleString("en-US"), 11) +
                 lpad(tot ? (100 * r.kept / tot).toFixed(1) : "–", 8));
    });
    table.hidden = false;
    table.textContent = lines.join("\n");
  }

  runBtn.addEventListener("click", function () {
    var cmds = Lab.fs.exists(BFILE + ".bed") ? [command()] : STEP1.concat([command()]);
    runBtn.disabled = true;
    status.textContent = cmds.length > 1 ? "Running step 1, then --indep-pairwise…" : "Running --indep-pairwise…";
    var chain = Promise.resolve({ code: 0 });
    cmds.forEach(function (c) { chain = chain.then(function (res) { return res.code === 0 ? Lab.run(c) : res; }); });
    chain.then(function (res) {
      runBtn.disabled = false;
      status.textContent = res.code === 0 ? "Done." :
        "plink stopped with exit code " + res.code + ": " + String(res.stdout || res.stderr || "").trim().split("\n").pop();
    }, function (err) { runBtn.disabled = false; status.textContent = "The command could not run: " + err; });
  });
  [selWin, selStep, selThr].forEach(function (s) { s.addEventListener("change", showCommand); });
  document.addEventListener("lab:fs-change", function (e) {
    var d = e.detail || {}, paths = d.paths || [];
    if (d.source === "reset") { scan(); draw(); return; }
    var hit = paths.filter(function (p) { return /\.prune\.in$/.test(p); });
    if (!hit.length) return;
    hit.forEach(function (p) {
      var prefix = p.replace(/\.prune\.in$/, "");
      record(prefix, parseParams(d.command) || parseParams(Lab.fs.readText(prefix + ".log")), parseInput(d.command) || parseInput(Lab.fs.readText(prefix + ".log")));
    });
    draw();
  });
  showCommand();
  Lab.ready.then(function () { status.textContent = ""; scan(); draw(); }, function () { status.textContent = "The lab did not start."; });
})();
