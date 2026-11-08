/* qc-heterozygosity-fmiss.js: F (or het_rate) against the missing-call rate, colored by which of the
   practical's two rules flags each person.
   Page: qc-heterozygosity.html, section #look. Root element: <div class="widget" id="w-het-fmiss">.
   Loaded after lab.js. Reads
     ${analysis_dir}/toy.geno0.01.mind0.01.LD0.3.het   (step 5, plink --het)
     ${analysis_dir}/toy.geno0.01.imiss                (step 1, plink --missing; F_MISS per person)
     ${analysis_dir}/toy.geno0.01.mind0.01.LD0.3.genome (step 4, optional: pairs with PI_HAT > 0.1875)
   and redraws whenever a command writes one of them (lab:fs-change). PLINK runs only when the reader
   presses a button.
   Rules (as in the practical): "±3 SD" flags het_rate = (N(NM) − O(HOM)) / N(NM) outside mean ± 3 SD
   (SD with divisor n − 1, as R's sd()); "|F|" flags |F| > c with c = 0.1 (or 0.2).
   On request (a spoiler, never the default) the points are colored by what the simulation planted, from
   window.TOY_PEOPLE (data-card.js): the planted cause (contaminated, inbred, low quality) or else the
   simulated group. */
(function () {
  "use strict";
  var root = document.getElementById("w-het-fmiss");
  if (!root) return;
  var body = root.querySelector(".widget-body");
  if (!window.Lab) {
    body.innerHTML = '<p class="note">The lab did not load on this page, so this widget cannot read the toy data.</p>';
    return;
  }
  var Lab = window.Lab;
  var HET = "${analysis_dir}/toy.geno0.01.mind0.01.LD0.3.het";
  var IMISS = "${analysis_dir}/toy.geno0.01.imiss";
  var GENOME = "${analysis_dir}/toy.geno0.01.mind0.01.LD0.3.genome";
  var CMD_HET = "plink --bfile ${analysis_dir}/toy.geno0.01.mind0.01 --het --extract ${analysis_dir}/toy.geno0.01.mind0.01.prune.in --out ${analysis_dir}/toy.geno0.01.mind0.01.LD0.3";
  var CMD_MISS = "plink --bfile ${analysis_dir}/toy.geno0.01 --missing --out ${analysis_dir}/toy.geno0.01";
  var CMD_GENOME = "plink --bfile ${analysis_dir}/toy.geno0.01.mind0.01 --extract ${analysis_dir}/toy.geno0.01.mind0.01.prune.in --genome --out ${analysis_dir}/toy.geno0.01.mind0.01.LD0.3";
  var G = { none: "neither rule", sd: "±3 SD of het_rate only", f: "|F| rule only", both: "both rules" };

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function f4(x) { return isFinite(x) ? x.toFixed(4) : "NA"; }
  function sig(x, d) {
    if (!isFinite(x)) return "NA";
    if (x === 0) return "0";
    var s = Number(x.toPrecision(d || 4)).toString();
    return s.indexOf("e") >= 0 ? x.toPrecision(d || 4) : s;
  }
  function int(n) { return n.toLocaleString("en-US"); }
  function mean(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return a.length ? s / a.length : NaN; }
  function sd(a) {
    var n = a.length; if (n < 2) return NaN;
    var m = mean(a), ss = 0;
    for (var i = 0; i < n; i++) ss += (a[i] - m) * (a[i] - m);
    return Math.sqrt(ss / (n - 1));
  }

  /* ---------------- layout ---------------- */
  body.innerHTML = "";
  var controls = el("div", { "class": "controls" });
  var runBtn = el("button", { type: "button", "class": "btn primary" }, "Run plink --het");
  var status = el("span", { "class": "note", "aria-live": "polite" }, "Waiting for the lab…");
  controls.appendChild(runBtn); controls.appendChild(status);
  body.appendChild(controls);

  var opts = el("div", { "class": "controls" });
  var yName = "y-" + Math.random().toString(36).slice(2, 7);
  var yF = el("input", { type: "radio", name: yName, value: "F", checked: "checked" });
  var yH = el("input", { type: "radio", name: yName, value: "h" });
  var lF = el("label", { "class": "hd-k" }); lF.appendChild(yF); lF.appendChild(document.createTextNode(" y axis: F"));
  var lH = el("label", { "class": "hd-k" }); lH.appendChild(yH); lH.appendChild(document.createTextNode(" y axis: het_rate"));
  var cutLab = el("label", { "class": "hd-k" }, "|F| cut-off ");
  var cutSel = el("select", { "aria-label": "Cut-off for the absolute value of F" }, '<option value="0.1" selected>0.1</option><option value="0.2">0.2</option>');
  cutLab.appendChild(cutSel);
  opts.appendChild(lF); opts.appendChild(lH); opts.appendChild(cutLab);
  body.appendChild(opts);
  var TP = window.TOY_PEOPLE || null;   // simulated group and planted role of each toy person (data-card.js)
  var colorSel = null;
  if (TP) {
    var cRow = el("div", { "class": "controls" });
    var cLab = el("label", { "class": "hd-k" }, "Color by ");
    colorSel = el("select", { "aria-label": "Color the points by" },
      '<option value="rule" selected>which rule flags them</option><option value="sim">what the simulation planted (spoiler)</option>');
    cLab.appendChild(colorSel); cRow.appendChild(cLab);
    body.appendChild(cRow);
  }

  var plotBox = el("div", { id: "w-het-fmiss-plot" });
  body.appendChild(plotBox);
  var readout = el("div", { "class": "readout hf-readout", "aria-live": "polite" });
  body.appendChild(readout);
  var extra = el("div", { "class": "controls" });
  var genomeBtn = el("button", { type: "button", "class": "btn" }, "Add step 4's relatedness (runs plink --genome)");
  extra.appendChild(genomeBtn);
  body.appendChild(extra);
  var tableBox = el("div", { "class": "hf-table" });
  body.appendChild(tableBox);

  /* ---------------- state ---------------- */
  var people = [], plot = null, hasMiss = false, hasPairs = false, lo = NaN, hi = NaN;

  function readFiles() {
    var tab = Lab.readTable(HET);
    if (!tab) return "nohet";
    var c = {};
    ["FID", "IID", "O(HOM)", "N(NM)", "F"].forEach(function (k) { c[k] = tab.header.indexOf(k); });
    if (c["O(HOM)"] < 0 || c["N(NM)"] < 0 || c.F < 0) throw new Error("the file has no O(HOM), N(NM) or F column");
    people = [];
    tab.rows.forEach(function (r) {
      var n = +r[c["N(NM)"]];
      if (!(n > 0)) return;
      people.push({ id: r[c.FID] + " " + r[c.IID], fid: r[c.FID], h: (n - r[c["O(HOM)"]]) / n, f: +r[c.F], miss: NaN, pairs: null });
    });
    var im = Lab.readTable(IMISS);
    hasMiss = false;
    if (im && im.header.indexOf("F_MISS") >= 0) {
      var m = Object.create(null), iF = im.header.indexOf("FID"), iI = im.header.indexOf("IID"), iM = im.header.indexOf("F_MISS");
      im.rows.forEach(function (r) { m[r[iF] + " " + r[iI]] = +r[iM]; });
      people.forEach(function (p) { if (m[p.id] != null) p.miss = m[p.id]; });
      hasMiss = people.some(function (p) { return isFinite(p.miss); });
    }
    var gen = Lab.readTable(GENOME);
    hasPairs = false;
    if (gen && gen.header.indexOf("PI_HAT") >= 0) {
      var cnt = Object.create(null), g = {};
      ["FID1", "IID1", "FID2", "IID2", "PI_HAT"].forEach(function (k) { g[k] = gen.header.indexOf(k); });
      gen.rows.forEach(function (r) {
        if (!(+r[g.PI_HAT] > 0.1875)) return;
        var a = r[g.FID1] + " " + r[g.IID1], b = r[g.FID2] + " " + r[g.IID2];
        cnt[a] = (cnt[a] || 0) + 1; cnt[b] = (cnt[b] || 0) + 1;
      });
      people.forEach(function (p) { p.pairs = cnt[p.id] || 0; });
      hasPairs = true;
    }
    var hs = people.map(function (p) { return p.h; }), m0 = mean(hs), s0 = sd(hs);
    lo = m0 - 3 * s0; hi = m0 + 3 * s0;
    return "ok";
  }

  function classify(p, cut) {
    var a = p.h < lo || p.h > hi, b = Math.abs(p.f) > cut;
    return a && b ? G.both : a ? G.sd : b ? G.f : G.none;
  }

  /* what the simulation planted: a cause that changes heterozygosity or missingness first, else the simulated group */
  var S = { EUR: "European-like", AFR: "African-like", EAS: "East-Asian-like", SAS: "South-Asian-like", ADMIXED: "admixed African–European",
    contaminated: "contaminated", inbred: "inbred", low_quality: "low quality (raised missingness)" };
  var S_ORDER = [S.EUR, S.AFR, S.EAS, S.SAS, S.ADMIXED, S.contaminated, S.inbred, S.low_quality];
  var S_COLORS = {};
  S_COLORS[S.EUR] = "#9aa3ae"; S_COLORS[S.AFR] = "var(--q1)"; S_COLORS[S.EAS] = "var(--q2)"; S_COLORS[S.SAS] = "var(--q3)";
  S_COLORS[S.ADMIXED] = "var(--q7)"; S_COLORS[S.contaminated] = "var(--pitfall)"; S_COLORS[S.inbred] = "var(--q8)"; S_COLORS[S.low_quality] = "var(--q5)";
  function simGroup(p) {
    var t = TP && TP[p.fid];
    if (!t) return "not in the data card";
    if (t.planted && S[t.planted]) return S[t.planted];
    return S[t.super] || t.super;
  }
  function simText(p) {
    var t = TP && TP[p.fid];
    if (!t) return "";
    return "\nsimulated: " + t.group + (t.ancestry ? " (" + Object.keys(t.ancestry).map(function (k) { return k + " " + Math.round(100 * t.ancestry[k]) + "%"; }).join(", ") + ")" : "") +
      (t.planted ? ", planted: " + t.planted.replace("_", " ") : "");
  }

  function refresh() {
    if (!people.length) return;
    var cut = +cutSel.value, useF = yF.checked, sim = !!(colorSel && colorSel.value === "sim");
    var fName = "|F| > " + cut + " only";
    var label = function (g) { return g === G.f ? fName : g; };
    var pts = people.map(function (p) {
      var rule = label(classify(p, cut));
      return { x: hasMiss ? p.miss : 0, y: useF ? p.f : p.h, group: sim ? simGroup(p) : rule, rule: rule, label: p.id, p: p };
    }).filter(function (q) { return isFinite(q.x) && isFinite(q.y); });
    var colors = {}; colors[G.none] = "#9aa3ae";
    colors[G.sd] = Lab.plot.color(0); colors[fName] = Lab.plot.color(2); colors[G.both] = "var(--pitfall)";
    var refs = useF ? [{ y: cut, label: "F = " + cut }, { y: -cut, label: "F = −" + cut }]
                    : [{ y: lo, label: "mean − 3 SD" }, { y: hi, label: "mean + 3 SD" }];
    var o = {
      groups: sim ? S_ORDER : [G.none, G.sd, fName, G.both], colors: sim ? S_COLORS : colors,
      legendTitle: sim ? "Simulated (spoiler)" : "Flagged by",
      highlight: sim ? S_ORDER.slice(1) : [G.sd, fName, G.both], refLines: refs,
      xLabel: hasMiss ? "F_MISS (step 1, toy.geno0.01.imiss)" : "F_MISS not available", yLabel: useF ? "F" : "het_rate",
      tooltip: function (q) {
        var p = q.p;
        return p.id + "\nhet_rate " + f4(p.h) + ", F " + sig(p.f, 4) + (hasMiss ? ", F_MISS " + sig(p.miss, 3) : "") +
          (p.pairs != null ? "\npairs with PI_HAT > 0.1875: " + p.pairs : "") + "\nflagged by: " + q.rule + (sim ? simText(p) : "");
      },
      ariaLabel: (useF ? "F" : "Heterozygosity rate") + " against the missing-call rate for every person in the toy data, colored by " +
        (sim ? "what the simulation planted" : "which rule flags them")
    };
    if (plot) plot.update(pts, o); else plot = Lab.plot.scatter(plotBox, pts, o);

    var groups = {}; pts.forEach(function (q) { groups[q.rule] = (groups[q.rule] || 0) + 1; });
    var nSd = (groups[G.sd] || 0) + (groups[G.both] || 0), nF = (groups[fName] || 0) + (groups[G.both] || 0);
    readout.innerHTML = "±3 SD of het_rate (limits " + f4(lo) + " and " + f4(hi) + ") flags <strong>" + int(nSd) + "</strong>; |F| &gt; " + cut +
      " flags <strong>" + int(nF) + "</strong>; both rules: <strong>" + int(groups[G.both] || 0) + "</strong>; only one rule: <strong>" +
      int((groups[G.sd] || 0) + (groups[fName] || 0)) + "</strong>." +
      (hasMiss ? "" : "<br>No <code>toy.geno0.01.imiss</code>: run <code>" + esc(CMD_MISS) + "</code> to add missingness.") +
      "<br>People removed by <code>--mind 0.01</code> in step 1 are not in the <code>.het</code> file, so F_MISS here is at most 0.01.";
    genomeBtn.hidden = hasPairs;

    var flagged = pts.filter(function (q) { return q.rule !== G.none; }).sort(function (a, b) { return a.p.f - b.p.f; });
    if (!flagged.length) { tableBox.innerHTML = '<p class="note">Neither rule flags anyone.</p>'; return; }
    var html = '<div class="table-wrap"><table class="compact stack"><caption>People flagged by either rule, lowest F first' +
      (flagged.length > 20 ? " (first 20 of " + int(flagged.length) + ")" : "") + "</caption>" +
      '<thead><tr><th scope="col">Person (FID IID)</th><th class="num" scope="col">het_rate</th><th class="num" scope="col">F</th>' +
      (hasMiss ? '<th class="num" scope="col">F_MISS</th>' : "") +
      (hasPairs ? '<th class="num" scope="col">Pairs with PI_HAT &gt; 0.1875</th>' : "") +
      '<th scope="col">Flagged by</th>' + (sim ? '<th scope="col">Simulated</th>' : "") + "</tr></thead><tbody>";
    flagged.slice(0, 20).forEach(function (q) {
      var p = q.p;
      html += '<tr><td data-label="Person">' + esc(p.id) + '</td><td class="num" data-label="het_rate">' + f4(p.h) + '</td><td class="num" data-label="F">' + sig(p.f, 4) + "</td>" +
        (hasMiss ? '<td class="num" data-label="F_MISS">' + sig(p.miss, 3) + "</td>" : "") +
        (hasPairs ? '<td class="num" data-label="Pairs with PI_HAT > 0.1875">' + p.pairs + "</td>" : "") +
        '<td data-label="Flagged by">' + esc(q.rule) + "</td>" + (sim ? '<td data-label="Simulated">' + esc(simGroup(p)) + "</td>" : "") + "</tr>";
    });
    html += "</tbody></table></div>";
    tableBox.innerHTML = html;
  }

  function draw() {
    var r;
    try { r = readFiles(); }
    catch (err) { status.textContent = "Could not read the files: " + err.message; return; }
    if (r !== "ok" || !people.length) {
      people = [];
      plotBox.innerHTML = '<p class="note">No <code>toy.geno0.01.mind0.01.LD0.3.het</code> yet.</p>';
      plot = null; readout.innerHTML = ""; tableBox.innerHTML = "";
      genomeBtn.hidden = true;
      status.textContent = "Run plink --het in the terminal above, or press the button.";
      runBtn.hidden = false;
      return;
    }
    runBtn.hidden = true;
    status.textContent = int(people.length) + " people in the .het file" + (hasMiss ? ", joined to step 1's toy.geno0.01.imiss" : "") +
      (hasPairs ? " and step 4's .genome" : "") + " (toy data, simulated).";
    refresh();
  }

  [yF, yH].forEach(function (r) { r.addEventListener("change", refresh); });
  cutSel.addEventListener("change", refresh);
  if (colorSel) colorSel.addEventListener("change", refresh);
  function runIt(btn, cmd, msg) {
    btn.disabled = true;
    status.textContent = msg;
    Lab.run(cmd).then(function (res) {
      btn.disabled = false;
      if (res.code !== 0) status.textContent = "plink stopped with exit code " + res.code + "; see the terminal output for the message.";
    });
  }
  runBtn.addEventListener("click", function () { runIt(runBtn, CMD_HET, "Running plink --het…"); });
  genomeBtn.addEventListener("click", function () { runIt(genomeBtn, CMD_GENOME, "Running plink --genome (every pair of people; this can take a while)…"); });
  document.addEventListener("lab:fs-change", function (e) {
    var hit = (e.detail.paths || []).some(function (p) { return /\/toy\.geno0\.01\.mind0\.01\.LD0\.3\.(het|genome)$|\/toy\.geno0\.01\.imiss$/.test(p); });
    if (hit) draw();
  });
  Lab.ready.then(draw);
})();
