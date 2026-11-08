/* QC step 2 · Q–Q plot of the Hardy–Weinberg exact-test p-values in the lab's toy.geno0.01.mind0.01.hwe.
   Reads the file the reader made with plink --hardy (Lab.readTable), draws observed against expected −log10(p)
   for the UNAFF, ALL and AFF rows (Lab.plot.scatter), counts the SNPs below a threshold in each row, marks the
   SNPs planted in the toy data when the reader asks (data card keys hwe_planted_deficit_ids, hwe_planted_excess_ids
   and sim_causal_snp), and redraws whenever a command rewrites the file (lab:fs-change). Loaded after lab.js. */
(function () {
  "use strict";
  var root = document.getElementById("w-hwe-qq");
  if (!root) return;
  var body = root.querySelector(".widget-body");
  var FILE = "${analysis_dir}/toy.geno0.01.mind0.01.hwe";
  var BFILE = "${analysis_dir}/toy.geno0.01.mind0.01";
  var STEP1 = [
    "plink --bfile ${input_dir}/toy --geno 0.01 --make-bed --out ${analysis_dir}/toy.geno0.01",
    "plink --bfile ${analysis_dir}/toy.geno0.01 --mind 0.01 --make-bed --out ${analysis_dir}/toy.geno0.01.mind0.01"
  ];
  var HARDY = "plink --bfile ${analysis_dir}/toy.geno0.01.mind0.01 --hardy --out ${analysis_dir}/toy.geno0.01.mind0.01";
  var GROUPS = [
    { test: "UNAFF", name: "UNAFF (controls)", color: "var(--q1)", on: true },
    { test: "ALL", name: "ALL (everyone)", color: "var(--q2)", on: true },
    { test: "AFF", name: "AFF (cases)", color: "var(--q4)", on: false }
  ];
  var PLANTED = "planted error (data card)";
  var CAUSAL = "causal SNP (data card)";

  function el(tag, attrs, parent, text) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function fmtP(x) {
    if (!isFinite(x)) return "nan";
    if (x === 0) return "0";
    var e = Math.floor(Math.log10(x));
    if (e >= -4) return String(Number(x.toPrecision(3)));
    var s = x.toExponential(2).split("e");
    return s[0].replace(/\.?0+$/, "") + "e" + s[1];
  }

  if (!window.Lab) {
    body.textContent = "";
    el("p", { "class": "note" }, body, "This widget plots a file from the in-browser lab, which did not load on this page.");
    return;
  }

  body.textContent = "";
  var top = el("div", { "class": "controls" }, body);
  var runBtn = el("button", { type: "button", "class": "btn primary" }, top, "Run plink --hardy");
  var status = el("span", { "class": "note", "aria-live": "polite" }, top, "Waiting for the lab…");

  var opts = el("div", { "class": "controls" }, body);
  var viewLab = el("label", { "class": "w-pick" }, opts, "Plot ");
  var view = el("select", null, viewLab);
  el("option", { value: "qq" }, view, "Q–Q plot");
  el("option", { value: "hist" }, view, "histogram of UNAFF p-values");
  var boxes = {};
  GROUPS.forEach(function (g) {
    var lab = el("label", { "class": "hq-group" }, opts);
    var cb = el("input", { type: "checkbox" }, lab);
    cb.checked = g.on;
    lab.appendChild(document.createTextNode(" " + g.name));
    boxes[g.test] = cb;
    cb.addEventListener("change", draw);
  });

  // The planted SNPs are the answers to the page's questions, so they are marked only on request.
  var revealLab = el("label", { "class": "hq-group" }, opts);
  var reveal = el("input", { type: "checkbox" }, revealLab);
  revealLab.appendChild(document.createTextNode(" Mark the planted SNPs"));
  reveal.addEventListener("change", draw);

  var thrRow = el("div", { "class": "controls" }, body);
  var thrLab = el("label", { "for": "w-hwe-qq-thr" }, thrRow, "Threshold ");
  var thrOut = el("output", { "for": "w-hwe-qq-thr", "class": "hq-thr" }, thrLab);
  var thr = el("input", { type: "range", id: "w-hwe-qq-thr", min: "2", max: "20", step: "1", value: "8" }, thrRow);
  var counts = el("div", { "class": "readout hq-readout", "aria-live": "polite" }, body);
  var plotBox = el("div", { "class": "hq-plot" }, body);
  var planted = el("div", { "class": "hq-planted" }, body);

  var data = null, chart = null, chartKind = null;

  function thrValue() { return Math.pow(10, -Number(thr.value)); }

  /* The SNPs planted in the toy data, from the data card (assets/js/lab/data-card.js): the calling errors
     (hwe_planted_deficit_ids and hwe_planted_excess_ids, comma-separated IDs) and the causal SNP
     (sim_causal_snp). Returns [{snp, what, group}]. */
  function plantedSnps() {
    var c = window.TOY_CARD || {};
    function ids(key) { return String(c[key] == null ? "" : c[key]).split(/[\s,]+/).filter(Boolean); }
    var out = [];
    ids("hwe_planted_deficit_ids").forEach(function (s) { out.push({ snp: s, what: "heterozygote deficit (calling error)", group: PLANTED }); });
    ids("hwe_planted_excess_ids").forEach(function (s) { out.push({ snp: s, what: "heterozygote excess (calling error)", group: PLANTED }); });
    ids("sim_causal_snp").forEach(function (s) { out.push({ snp: s, what: "causal SNP (real association)", group: CAUSAL }); });
    return out;
  }

  function load() {
    var t = null;
    try { t = Lab.readTable(FILE); } catch (err) { t = null; }
    if (!t || t.n === 0 || t.header.indexOf("TEST") < 0 || t.header.indexOf("P") < 0) { data = null; return; }
    var rows = t.objects(), by = { ALL: [], AFF: [], UNAFF: [] }, snps = Object.create(null);
    rows.forEach(function (r) {
      var key = String(r.TEST);
      if (!by[key]) return;
      by[key].push(r);
      snps[r.SNP] = true;
    });
    data = { by: by, nSnps: Object.keys(snps).length, rows: rows };
  }

  // plantedSet maps a SNP ID to its entry from plantedSnps(), or is empty when the planted SNPs are not marked.
  function qqPoints(rows, group, plantedSet) {
    var f = rows.filter(function (r) { return typeof r.P === "number" && r.P >= 0 && r.P <= 1; })
      .slice().sort(function (a, b) { return a.P - b.P; });
    var n = f.length;
    return f.map(function (r, i) {
      var p = r.P > 0 ? r.P : Number.MIN_VALUE;
      var d = plantedSet[r.SNP];
      return {
        x: -Math.log10((i + 0.5) / n), y: -Math.log10(p),
        group: d ? d.group : group,
        label: r.SNP + " · " + r.TEST + "\nGENO " + r.GENO + " · O(HET) " + r["O(HET)"] + " · E(HET) " + r["E(HET)"] + "\np = " + fmtP(r.P) +
          (d ? "\nPlanted: " + d.what : "")
      };
    });
  }

  function drawCounts() {
    var t = thrValue();
    thrOut.textContent = "p < 1e-" + thr.value;
    if (!data) { counts.textContent = ""; return; }
    var parts = ["UNAFF", "AFF", "ALL"].map(function (g) {
      var n = data.by[g].filter(function (r) { return r.P < t; }).length;
      return (g + "     ").slice(0, 6) + n.toLocaleString("en-US") + " of " + data.by[g].length.toLocaleString("en-US") + " SNPs below 1e-" + thr.value;
    });
    counts.textContent = parts.join("\n");
  }

  function drawPlanted() {
    planted.textContent = "";
    var list = plantedSnps();
    revealLab.hidden = !list.length;
    if (!data || !list.length || !reveal.checked) return;
    // "stack" turns each row into a labeled card on phones (data-label on every cell).
    var tbl = el("table", { "class": "compact stack" }, el("div", { "class": "table-wrap" }, planted));
    el("caption", null, tbl, "The SNPs planted in the toy data (data card) and their p-values in each row of the report");
    var hr = el("tr", null, el("thead", null, tbl));
    ["SNP", "Planted as", "UNAFF", "AFF", "ALL"].forEach(function (h) { el("th", null, hr, h); });
    var tb = el("tbody", null, tbl);
    list.forEach(function (d) {
      var tr = el("tr", null, tb);
      el("td", { "data-label": "SNP" }, tr, d.snp);
      el("td", { "data-label": "Planted as" }, tr, d.what);
      ["UNAFF", "AFF", "ALL"].forEach(function (g) {
        var r = data.by[g].filter(function (x) { return x.SNP === d.snp; })[0];
        el("td", { "data-label": g, "class": "hq-p" + (r && r.P < thrValue() ? " hq-below" : "") }, tr, r ? fmtP(r.P) : "removed in step 1");
      });
    });
  }

  function draw() {
    drawCounts();
    drawPlanted();
    if (!data) {
      if (chart) { chart.destroy(); chart = null; chartKind = null; }
      plotBox.textContent = "";
      el("p", { "class": "note" }, plotBox, "The plot appears when toy.geno0.01.mind0.01.hwe exists: run the --hardy command in the terminal above, or press the button.");
      return;
    }
    var kind = view.value;
    thrRow.hidden = kind !== "qq";
    if (chart && chartKind !== kind) { chart.destroy(); chart = null; }
    if (!chart) plotBox.textContent = "";
    if (kind === "hist") {
      var vals = data.by.UNAFF.map(function (r) { return r.P; });
      var ho = { bins: 50, domain: [0, 1], xLabel: "P (UNAFF rows)", yLabel: "SNPs", unit: "SNPs",
                 ariaLabel: "Histogram of the controls' Hardy–Weinberg exact-test p-values, " + vals.length + " SNPs in 50 bins from 0 to 1." };
      if (chart) chart.update(vals, ho); else chart = Lab.plot.histogram(plotBox, vals, ho);
      chartKind = kind;
      return;
    }
    var plantedSet = Object.create(null);
    if (reveal.checked) plantedSnps().forEach(function (d) { plantedSet[d.snp] = d; });
    var pts = [], maxE = 1, maxO = 1, groups = [], colors = {};
    GROUPS.forEach(function (g) {
      if (!boxes[g.test].checked) return;
      var q = qqPoints(data.by[g.test], g.name, plantedSet);
      if (!q.length) return;
      maxE = Math.max(maxE, q[0].x); maxO = Math.max(maxO, q[0].y);
      groups.push(g.name); colors[g.name] = g.color;
      pts = pts.concat(q);
    });
    if (pts.some(function (p) { return p.group === PLANTED; })) { groups.push(PLANTED); colors[PLANTED] = "var(--pitfall)"; }
    if (pts.some(function (p) { return p.group === CAUSAL; })) { groups.push(CAUSAL); colors[CAUSAL] = "var(--q7)"; }
    var yTop = Math.max(maxO, Number(thr.value), maxE) * 1.05;
    var so = {
      xLabel: "Expected −log₁₀(p)", yLabel: "Observed −log₁₀(p)", groups: groups, colors: colors,
      highlight: [PLANTED, CAUSAL], legendTitle: "Rows of the .hwe file",
      xDomain: [0, maxE * 1.05], yDomain: [0, yTop],
      refLines: [{ identity: true, label: "y = x (expected)", dash: false },
                 { y: Number(thr.value), label: "p = 1e-" + thr.value, color: "var(--pitfall)" }],
      tooltip: function (p) { return p.label; },
      ariaLabel: "Q–Q plot of the toy data's Hardy–Weinberg exact-test p-values: observed against expected −log₁₀(p) for " + groups.filter(function (g) { return g !== PLANTED && g !== CAUSAL; }).join(", ") +
        ", with a threshold line at p = 1e-" + thr.value + "."
    };
    if (chart) chart.update(pts, so); else chart = Lab.plot.scatter(plotBox, pts, so);
    chartKind = kind;
  }

  function refresh() {
    load();
    if (data) status.textContent = data.nSnps.toLocaleString("en-US") + " SNPs in toy.geno0.01.mind0.01.hwe, " + data.rows.length.toLocaleString("en-US") + " rows.";
    else status.textContent = "No toy.geno0.01.mind0.01.hwe yet.";
    draw();
  }

  runBtn.addEventListener("click", function () {
    runBtn.disabled = true;
    var cmds = Lab.fs.exists(BFILE + ".bed") ? [HARDY] : STEP1.concat([HARDY]);
    status.textContent = "Running " + (cmds.length > 1 ? "step 1, then " : "") + "plink --hardy…";
    var chain = Promise.resolve({ code: 0 });
    cmds.forEach(function (c) {
      chain = chain.then(function (res) { return res.code === 0 ? Lab.run(c) : res; });
    });
    chain.then(function (res) {
      runBtn.disabled = false;
      if (res.code !== 0) status.textContent = "plink stopped with exit code " + res.code + ": " + String(res.stdout || res.stderr || "").trim().split("\n").pop();
    }, function (err) {
      runBtn.disabled = false;
      status.textContent = "The command could not run: " + err;
    });
  });
  view.addEventListener("change", draw);
  thr.addEventListener("input", draw);
  document.addEventListener("lab:fs-change", function (e) {
    var paths = (e.detail && e.detail.paths) || [];
    if (paths.some(function (p) { return /\/toy\.geno0\.01\.mind0\.01\.hwe$/.test(p); }) || (e.detail && e.detail.source === "reset")) refresh();
  });
  Lab.ready.then(refresh, function () { status.textContent = "The lab did not start."; });
})();
