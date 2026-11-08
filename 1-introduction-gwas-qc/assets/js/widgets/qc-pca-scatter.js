/* qc-pca-scatter.js: the toy data's principal components, any PC against any other, and the scree plot.
   Page: qc-pca.html, section #look. Root element: <div class="widget" id="w-pca-scatter">.
   Loaded after lab.js. Reads
     ${analysis_dir}/toy.geno0.01.mind0.01.LD0.3.eigenvec  (no header: FID, IID, PC1 … PC20)
     ${analysis_dir}/toy.geno0.01.mind0.01.LD0.3.eigenval  (one eigenvalue per line)
     ${analysis_dir}/toy.geno0.01.mind0.01.fam             (phenotype code, column 6)
   written in the lab by
     plink --bfile …/toy.geno0.01.mind0.01 --extract ….prune.in --maf 0.05 --pca --out …/toy.geno0.01.mind0.01.LD0.3
   and redraws whenever a command writes them (lab:fs-change). PLINK runs only when the reader presses the button.
   Shows:
   - a scatter of PC x against PC y with equal axes; values as PLINK writes them (each PC has length 1 over
     people) or, with the option, multiplied by the square root of the PC's eigenvalue, so that distances
     on the plot are distances between people's standardized genotypes (divided by the square root of the
     number of SNPs) projected on the two PCs;
   - colors by the .fam phenotype code, by a one-pass outlier rule: more than s standard deviations
     from the mean on any of the first K PCs (smartpca's defaults are s = 6, K = 10, repeated up to 5 times
     with the PCs recomputed; here one pass on PLINK's PCs), or, on request, by the simulated group of
     each person from window.TOY_PEOPLE (data-card.js; a spoiler, so it is never the default and the
     tooltip shows the simulated population and planted role only in that mode);
   - the scree plot of the eigenvalues, with the approximate share of variance ℓ_k / n (the trace of PLINK's
     relationship matrix is close to the number of people n);
   - for the people flagged by the outlier rule: F_MISS from step 1 (${analysis_dir}/toy.geno0.01.imiss, written
     by the lab's setup) and, after the reader presses the button that runs the practical's step 4 and 5
     commands, their pairs with PI_HAT > 0.1875 (.genome) and F (.het). */
(function () {
  "use strict";
  var root = document.getElementById("w-pca-scatter");
  if (!root) return;
  var body = root.querySelector(".widget-body");
  if (!window.Lab) {
    body.innerHTML = '<p class="note">The lab did not load on this page, so this widget cannot read the toy data.</p>';
    return;
  }
  var Lab = window.Lab;
  var PFX = "${analysis_dir}/toy.geno0.01.mind0.01.LD0.3";
  var FAM = "${analysis_dir}/toy.geno0.01.mind0.01.fam";
  var CMD = "plink --bfile ${analysis_dir}/toy.geno0.01.mind0.01 --extract ${analysis_dir}/toy.geno0.01.mind0.01.prune.in --maf 0.05 --pca --out ${analysis_dir}/toy.geno0.01.mind0.01.LD0.3";
  var IMISS = "${analysis_dir}/toy.geno0.01.imiss";
  var GENOME = "${analysis_dir}/toy.geno0.01.mind0.01.LD0.3.genome";
  var HET = "${analysis_dir}/toy.geno0.01.mind0.01.LD0.3.het";
  var CMD_GENOME = "plink --bfile ${analysis_dir}/toy.geno0.01.mind0.01 --extract ${analysis_dir}/toy.geno0.01.mind0.01.prune.in --genome --out ${analysis_dir}/toy.geno0.01.mind0.01.LD0.3";
  var CMD_HET = "plink --bfile ${analysis_dir}/toy.geno0.01.mind0.01 --extract ${analysis_dir}/toy.geno0.01.mind0.01.prune.in --het --out ${analysis_dir}/toy.geno0.01.mind0.01.LD0.3";

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function sig(x, d) {
    if (!isFinite(x)) return "NA";
    if (x === 0) return "0";
    var s = Number(x.toPrecision(d || 4)).toString();
    return s.indexOf("e") >= 0 ? x.toPrecision(d || 4) : s;
  }
  function int(n) { return n.toLocaleString("en-US"); }
  function pct(x) { return (100 * x).toFixed(1) + "%"; }
  function opt(sel, v, text, selected) { var o = el("option", { value: String(v) }, esc(text)); if (selected) o.selected = true; sel.appendChild(o); }

  /* ---------------- layout ---------------- */
  body.innerHTML = "";
  var controls = el("div", { "class": "controls" });
  var runBtn = el("button", { type: "button", "class": "btn primary" }, "Run plink --pca");
  var status = el("span", { "class": "note", "aria-live": "polite" }, "Waiting for the lab…");
  controls.appendChild(runBtn); controls.appendChild(status);
  body.appendChild(controls);

  var pick = el("div", { "class": "controls" });
  var xLab = el("label", { "class": "pc-k" }, "x axis ");
  var xSel = el("select", { "aria-label": "Component on the x axis" });
  var yLab = el("label", { "class": "pc-k" }, "y axis ");
  var ySel = el("select", { "aria-label": "Component on the y axis" });
  xLab.appendChild(xSel); yLab.appendChild(ySel);
  pick.appendChild(xLab); pick.appendChild(yLab);
  [[1, 2], [2, 3], [3, 4]].forEach(function (p) {
    var b = el("button", { type: "button", "class": "btn" }, "PC" + p[0] + " vs PC" + p[1]);
    b.addEventListener("click", function () { xSel.value = String(p[0]); ySel.value = String(p[1]); refresh(); });
    pick.appendChild(b);
  });
  body.appendChild(pick);

  var look = el("div", { "class": "controls" });
  var cLab = el("label", { "class": "pc-k" }, "Color by ");
  var cSel = el("select", { "aria-label": "Color the points by" });
  opt(cSel, "none", "nothing", true); opt(cSel, "pheno", "phenotype code (.fam column 6)"); opt(cSel, "out", "outlier rule");
  var TP = window.TOY_PEOPLE || null;   // simulated group and planted role of each toy person (data-card.js)
  if (TP) opt(cSel, "sim", "simulated group (spoiler)");
  cLab.appendChild(cSel);
  var scLab = el("label", { "class": "pc-k" });
  var scIn = el("input", { type: "checkbox" });
  scLab.appendChild(scIn); scLab.appendChild(document.createTextNode(" multiply each PC by √eigenvalue"));
  look.appendChild(cLab); look.appendChild(scLab);
  body.appendChild(look);

  var outRow = el("div", { "class": "controls" });
  var sLab = el("label", { "class": "pc-k" }, "Outlier rule: more than ");
  var sSel = el("select", { "aria-label": "Number of standard deviations" });
  [4, 5, 6].forEach(function (v) { opt(sSel, v, String(v), v === 6); });
  sLab.appendChild(sSel); sLab.appendChild(document.createTextNode(" SD from the mean on any of the first "));
  var kSel = el("select", { "aria-label": "Number of components checked" });
  [2, 5, 10].forEach(function (v) { opt(kSel, v, String(v), v === 10); });
  sLab.appendChild(kSel); sLab.appendChild(document.createTextNode(" PCs"));
  outRow.appendChild(sLab);
  body.appendChild(outRow);

  var grid = el("div", { "class": "pc-grid" });
  var left = el("div"), right = el("div");
  grid.appendChild(left); grid.appendChild(right);
  body.appendChild(grid);
  left.appendChild(el("p", { "class": "pc-cap" }, "<strong>One dot per person.</strong> Point at (or tap) a dot to see who it is."));
  var plotBox = el("div", { id: "w-pca-scatter-plot" });
  left.appendChild(plotBox);
  right.appendChild(el("p", { "class": "pc-cap" }, "<strong>Scree plot:</strong> the eigenvalue of each PC, largest first."));
  var screeBox = el("div", { id: "w-pca-scatter-scree" });
  right.appendChild(screeBox);
  var readout = el("div", { "class": "readout pc-readout", "aria-live": "polite" });
  body.appendChild(readout);
  var tableBox = el("div", { "class": "pc-table" });
  body.appendChild(tableBox);
  var moreRow = el("div", { "class": "controls" });
  var moreBtn = el("button", { type: "button", "class": "btn" }, "Add steps 4 and 5 (runs plink --genome and plink --het)");
  var moreNote = el("span", { "class": "note", "aria-live": "polite" }, "");
  moreRow.appendChild(moreBtn); moreRow.appendChild(moreNote);
  moreRow.style.display = "none";   // .widget .controls is display: flex, which would override the hidden attribute
  body.appendChild(moreRow);

  /* ---------------- state ---------------- */
  var people = [], vals = [], K = 0, plot = null, scree = null;

  function readFiles() {
    var v = Lab.readTable(PFX + ".eigenvec");
    var e = Lab.readTable(PFX + ".eigenval", { header: false });
    if (!v || !e) return false;
    K = v.header.length - 2;
    if (K < 2) throw new Error("the .eigenvec file has fewer than two components");
    vals = e.col(0).filter(isFinite);
    var pheno = Object.create(null), fam = Lab.readTable(FAM, { header: false });
    if (fam) fam.rows.forEach(function (r) { pheno[r[0] + " " + r[1]] = r[5]; });
    people = v.rows.map(function (r) {
      var id = r[0] + " " + r[1], pcs = [];
      for (var k = 0; k < K; k++) pcs.push(+r[k + 2]);
      return { id: id, fid: r[0], pcs: pcs, pheno: pheno[id] != null ? String(pheno[id]) : "?" };
    });
    return true;
  }

  // what steps 1, 4 and 5 say about each person, from whichever of their files exist
  var extrasCache = null;
  function readExtras() {
    if (extrasCache) return extrasCache;
    var x = { miss: null, f: null, pairs: null };
    var im = Lab.readTable(IMISS);
    if (im && im.header.indexOf("F_MISS") >= 0) {
      x.miss = Object.create(null);
      var a = im.header.indexOf("FID"), b = im.header.indexOf("IID"), c = im.header.indexOf("F_MISS");
      im.rows.forEach(function (r) { x.miss[r[a] + " " + r[b]] = +r[c]; });
    }
    var het = Lab.readTable(HET);
    if (het && het.header.indexOf("F") >= 0) {
      x.f = Object.create(null);
      var hf = het.header.indexOf("FID"), hi = het.header.indexOf("IID"), hF = het.header.indexOf("F");
      het.rows.forEach(function (r) { x.f[r[hf] + " " + r[hi]] = +r[hF]; });
    }
    var gen = Lab.readTable(GENOME);
    if (gen && gen.header.indexOf("PI_HAT") >= 0) {
      x.pairs = Object.create(null);
      var g = {};
      ["FID1", "IID1", "FID2", "IID2", "PI_HAT"].forEach(function (k) { g[k] = gen.header.indexOf(k); });
      gen.rows.forEach(function (r) {
        var pi = +r[g.PI_HAT];
        if (!(pi > 0.1875)) return;
        var p1 = r[g.FID1] + " " + r[g.IID1], p2 = r[g.FID2] + " " + r[g.IID2];
        (x.pairs[p1] = x.pairs[p1] || []).push(p2 + " (" + pi.toFixed(2) + ")");
        (x.pairs[p2] = x.pairs[p2] || []).push(p1 + " (" + pi.toFixed(2) + ")");
      });
    }
    extrasCache = x;
    return x;
  }

  function fillSelects() {
    var xv = xSel.value || "1", yv = ySel.value || "2";
    xSel.innerHTML = ""; ySel.innerHTML = "";
    for (var k = 1; k <= K; k++) { opt(xSel, k, "PC" + k, String(k) === xv); opt(ySel, k, "PC" + k, String(k) === yv); }
    if (+xSel.value > K) xSel.value = "1";
    if (+ySel.value > K) ySel.value = "2";
  }

  function outliers() {
    var s = +sSel.value, kk = Math.min(+kSel.value, K), flag = Object.create(null);
    for (var k = 0; k < kk; k++) {
      var col = people.map(function (p) { return p.pcs[k]; });
      var m = col.reduce(function (a, b) { return a + b; }, 0) / col.length;
      var sd = Math.sqrt(col.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / (col.length - 1));
      people.forEach(function (p) {
        var z = (p.pcs[k] - m) / sd;
        if (Math.abs(z) > s && (!flag[p.id] || Math.abs(z) > Math.abs(flag[p.id].z))) flag[p.id] = { pc: k + 1, z: z };
      });
    }
    return flag;
  }

  var SIM = { EUR: "European-like", AFR: "African-like", EAS: "East-Asian-like", SAS: "South-Asian-like", ADMIXED: "admixed African–European" };
  var SIM_ORDER = [SIM.EUR, SIM.AFR, SIM.EAS, SIM.SAS, SIM.ADMIXED];
  var SIM_COLORS = {};
  SIM_COLORS[SIM.EUR] = "#9aa3ae"; SIM_COLORS[SIM.AFR] = "var(--q1)"; SIM_COLORS[SIM.EAS] = "var(--q2)";
  SIM_COLORS[SIM.SAS] = "var(--q3)"; SIM_COLORS[SIM.ADMIXED] = "var(--q7)";
  var ROLE = { duplicate: "duplicate of", parent: "parent of", offspring: "offspring of", full_sibling: "full sibling of",
    half_sibling: "half sibling of", contaminated: "contaminated sample", inbred: "inbred (child of related parents)",
    degraded: "degraded sample", low_quality: "low-quality sample" };
  function simOf(p) { return TP && TP[p.fid] ? TP[p.fid] : null; }
  function simName(p) { var t = simOf(p); return t ? (SIM[t.super] || t.super) : "not in the data card"; }
  function simText(p) {
    var t = simOf(p);
    if (!t) return "\nsimulated: not in the data card";
    var s = "\nsimulated: " + t.group + " (" + (SIM[t.super] || t.super) + ")";
    if (t.ancestry) s += ", " + Object.keys(t.ancestry).map(function (k) { return k + " " + Math.round(100 * t.ancestry[k]) + "%"; }).join(", ");
    if (t.planted) s += "\nplanted: " + (ROLE[t.planted] || t.planted) + (t.pair ? " " + t.pair : "");
    return s;
  }

  function phenoName(c) {
    return c === "1" ? "1 (control code)" : c === "2" ? "2 (case code)" : (c === "-9" || c === "0") ? c + " (missing)" : c;
  }

  function refresh() {
    if (!people.length) return;
    var xi = +xSel.value - 1, yi = +ySel.value - 1, scaled = scIn.checked, mode = cSel.value;
    var fx = scaled ? Math.sqrt(Math.max(0, vals[xi] || 0)) : 1, fy = scaled ? Math.sqrt(Math.max(0, vals[yi] || 0)) : 1;
    var flag = outliers(), nOut = Object.keys(flag).length;
    outRow.style.display = mode === "out" ? "" : "none";
    var pts = people.map(function (p) {
      var g = mode === "pheno" ? phenoName(p.pheno) : mode === "out" ? (flag[p.id] ? "outlier" : "within the limits") : mode === "sim" ? simName(p) : "";
      return { x: p.pcs[xi] * fx, y: p.pcs[yi] * fy, group: g, label: p.id, p: p };
    });
    var o = {
      equal: true, xLabel: "PC" + (xi + 1) + (scaled ? " × √ℓ" + (xi + 1) : ""), yLabel: "PC" + (yi + 1) + (scaled ? " × √ℓ" + (yi + 1) : ""),
      legend: mode !== "none", legendTitle: mode === "pheno" ? "Phenotype code" : mode === "sim" ? "Simulated group" : "Outlier rule",
      groups: mode === "out" ? ["within the limits", "outlier"] : mode === "pheno" ? ["1 (control code)", "2 (case code)", "-9 (missing)"] : mode === "sim" ? SIM_ORDER : undefined,
      colors: mode === "out" ? { "within the limits": "#9aa3ae", "outlier": "var(--pitfall)" } : mode === "sim" ? SIM_COLORS : undefined,
      highlight: mode === "out" ? "outlier" : mode === "sim" ? SIM_ORDER.slice(1) : undefined,
      refLines: [{ x: 0, extend: false }, { y: 0, extend: false }],
      tooltip: function (q) {
        var p = q.p, f = flag[p.id];
        return p.id + "\nPC" + (xi + 1) + " " + sig(p.pcs[xi], 4) + ", PC" + (yi + 1) + " " + sig(p.pcs[yi], 4) +
          "\nphenotype code " + p.pheno + (f ? "\noutlier: " + (f.z > 0 ? "+" : "−") + Math.abs(f.z).toFixed(1) + " SD on PC" + f.pc : "") +
          (mode === "sim" ? simText(p) : "");
      },
      ariaLabel: "Scatter plot of PC" + (xi + 1) + " against PC" + (yi + 1) + " for every person in the toy data"
    };
    if (plot) plot.update(pts, o); else plot = Lab.plot.scatter(plotBox, pts, o);

    var n = people.length, total = vals.reduce(function (a, b) { return a + b; }, 0);
    var SHOWN = "in the scatter plot", OTHER = "other PCs";
    var sp = vals.map(function (v, k) { return { x: k + 1, y: v, group: k === xi || k === yi ? SHOWN : OTHER, label: "PC" + (k + 1) }; });
    var maxV = Math.max.apply(null, vals.concat([0]));
    var so = { groups: [OTHER, SHOWN], colors: { "other PCs": "var(--q1)", "in the scatter plot": "var(--pitfall)" }, highlight: SHOWN, legend: false,
      xLabel: "Component (PC number)", yLabel: "Eigenvalue", xDomain: [0.3, vals.length + 0.7], yDomain: [0, maxV * 1.08 || 1], r: 4.2,
      tooltip: function (q) { return q.label + ": eigenvalue " + sig(q.y, 4) + "\nabout " + pct(q.y / n) + " of the variance"; },
      ariaLabel: "Scree plot: the eigenvalues of the toy data's principal components in decreasing order" };
    if (scree) scree.update(sp, so); else scree = Lab.plot.scatter(screeBox, sp, so);

    readout.innerHTML = int(n) + " people, " + K + " components. " +
      "PC" + (xi + 1) + ": eigenvalue " + sig(vals[xi], 4) + ", about " + pct(vals[xi] / n) + " of the variance; " +
      "PC" + (yi + 1) + ": " + sig(vals[yi], 4) + ", about " + pct(vals[yi] / n) + ".<br>" +
      "The " + vals.length + " eigenvalues add up to " + sig(total, 4) + ", " + pct(total / n) + " of the total (the trace of the relationship matrix is close to n = " + int(n) + ")." +
      (mode === "sim" ? "<br><strong>Simulated groups</strong> (the simulation's truth, which a real study does not have): " +
        SIM_ORDER.map(function (g) { var c = pts.filter(function (q) { return q.group === g; }).length; return c ? g + " " + int(c) : ""; }).filter(Boolean).join(" · ") + "." : "") +
      (mode === "out" ? "<br><strong>Outlier rule: " + int(nOut) + " " + (nOut === 1 ? "person" : "people") + "</strong> more than " + sSel.value + " SD from the mean on at least one of PC1–PC" + Math.min(+kSel.value, K) + "." : "");

    if (mode !== "out" || !nOut) { tableBox.innerHTML = ""; moreRow.style.display = "none"; return; }
    var x = readExtras();
    moreRow.style.display = x.f && x.pairs ? "none" : "";
    var ids = Object.keys(flag).sort(function (a, b) { return Math.abs(flag[b].z) - Math.abs(flag[a].z); });
    var html = '<div class="table-wrap"><table class="compact stack"><caption>People flagged by the outlier rule' + (ids.length > 15 ? " (first 15 of " + int(ids.length) + ")" : "") + "</caption>" +
      '<thead><tr><th scope="col">Person (FID IID)</th><th scope="col">Most extreme on</th><th class="num" scope="col">SDs from the mean</th><th scope="col">Phenotype code</th>' +
      (x.miss ? '<th class="num" scope="col">F_MISS (step 1)</th>' : "") +
      (x.pairs ? '<th scope="col">Pairs with PI_HAT &gt; 0.1875 (step 4)</th>' : "") +
      (x.f ? '<th class="num" scope="col">F (step 5)</th>' : "") + "</tr></thead><tbody>";
    ids.slice(0, 15).forEach(function (id) {
      var f = flag[id], p = people.filter(function (q) { return q.id === id; })[0];
      html += '<tr><td data-label="Person">' + esc(id) + '</td><td data-label="Most extreme on">PC' + f.pc + '</td><td class="num" data-label="SDs from the mean">' + (f.z > 0 ? "+" : "−") + Math.abs(f.z).toFixed(1) +
        '</td><td data-label="Phenotype code">' + esc(p ? p.pheno : "?") + "</td>" +
        (x.miss ? '<td class="num" data-label="F_MISS (step 1)">' + (x.miss[id] != null ? sig(x.miss[id], 3) : "–") + "</td>" : "") +
        (x.pairs ? '<td data-label="Pairs with PI_HAT > 0.1875 (step 4)">' + (x.pairs[id] ? esc(x.pairs[id].join(", ")) : "none") + "</td>" : "") +
        (x.f ? '<td class="num" data-label="F (step 5)">' + (x.f[id] != null ? sig(x.f[id], 3) : "–") + "</td>" : "") + "</tr>";
    });
    tableBox.innerHTML = html + "</tbody></table></div>";
  }

  function draw() {
    var ok;
    try { ok = readFiles(); }
    catch (err) { status.textContent = "Could not read the PCA files: " + err.message; return; }
    if (!ok || !people.length) {
      people = [];
      plotBox.innerHTML = '<p class="note">No <code>toy.geno0.01.mind0.01.LD0.3.eigenvec</code> yet.</p>';
      screeBox.innerHTML = ""; plot = null; scree = null; readout.innerHTML = ""; tableBox.innerHTML = "";
      status.textContent = "Run plink --pca in the terminal above, or press the button.";
      runBtn.hidden = false;
      return;
    }
    runBtn.hidden = true;
    status.textContent = int(people.length) + " people and " + K + " PCs in toy.geno0.01.mind0.01.LD0.3.eigenvec (toy data, simulated).";
    fillSelects();
    refresh();
  }

  [xSel, ySel, cSel, sSel, kSel].forEach(function (s) { s.addEventListener("change", refresh); });
  scIn.addEventListener("change", refresh);
  runBtn.addEventListener("click", function () {
    runBtn.disabled = true;
    status.textContent = "Running plink --pca…";
    Lab.run(CMD).then(function (res) {
      runBtn.disabled = false;
      if (res.code !== 0) status.textContent = "plink stopped with exit code " + res.code + "; see the terminal output for the message.";
    });
  });
  moreBtn.addEventListener("click", function () {
    moreBtn.disabled = true;
    extrasCache = null;
    var x = readExtras(), todo = [];
    if (!x.pairs) todo.push(CMD_GENOME);
    if (!x.f) todo.push(CMD_HET);
    moreNote.textContent = "Running " + todo.map(function (c) { return c.indexOf("--genome") >= 0 ? "plink --genome" : "plink --het"; }).join(" and ") + "…";
    todo.reduce(function (p, c) { return p.then(function (prev) { return prev && prev.code ? prev : Lab.run(c); }); }, Promise.resolve(null)).then(function (res) {
      moreBtn.disabled = false;
      moreNote.textContent = res && res.code !== 0 ? "plink stopped with exit code " + res.code + "; see the terminal output for the message." : "";
    });
  });
  document.addEventListener("lab:fs-change", function (e) {
    var paths = e.detail.paths || [];
    extrasCache = null;
    if (paths.some(function (p) { return /\/toy\.geno0\.01\.mind0\.01\.LD0\.3\.eigen(vec|val)$|\/toy\.geno0\.01\.mind0\.01\.fam$/.test(p); })) draw();
    else if (paths.some(function (p) { return /\/toy\.geno0\.01\.mind0\.01\.LD0\.3\.(het|genome)$|\/toy\.geno0\.01\.imiss$/.test(p); })) refresh();
  });
  Lab.ready.then(draw);
})();
