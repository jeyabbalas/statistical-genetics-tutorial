/* qc-pca-prune.js: PCA with and without LD pruning, and where on the genome each component comes from.
   Page: qc-pca.html, section #pruning. Root element: <div class="widget" id="w-pca-prune">.
   Loaded after lab.js. Reads two PLINK --pca runs on the same fileset:
     pruned:   ${analysis_dir}/toy.geno0.01.mind0.01.LD0.3.{eigenvec,eigenval}  (--extract ….prune.in --maf 0.05)
     unpruned: ${analysis_dir}/toy.noprune.{eigenvec,eigenval}                  (--maf 0.05, all SNPs)
   and the genotypes of ${analysis_dir}/toy.geno0.01.mind0.01.{bed,bim,fam}. The button runs the missing PCA(s)
   through Lab.run; the widget redraws on lab:fs-change.
   Shows:
   - the first eigenvalues of both runs side by side;
   - for the chosen run and component k: PC k against PC k+1, and, for every SNP with minor allele frequency
     ≥ 0.05, the squared correlation r² between the SNP's genotypes (copies of A1, missing calls skipped) and
     the people's scores on PC k, along the genome. A component that reflects genome-wide ancestry gets small
     r² from SNPs everywhere; a component made by one region of strong LD gets large r² from that region.
     The readout locates the chromosome stretch holding most of the top 1% of SNPs (if one does) and reports the
     share of the summed r² that its SNPs carry: 50% or more reads "mostly that one region", less reads "mixes
     that region with structure spread over the genome" (components are perpendicular, the signals need not be).
     (r is approximately proportional to the SNP's weight on the component, which PLINK writes with --pca var-wts;
     the lab's emulator does not support var-wts.) */
(function () {
  "use strict";
  var root = document.getElementById("w-pca-prune");
  if (!root) return;
  var body = root.querySelector(".widget-body");
  if (!window.Lab) {
    body.innerHTML = '<p class="note">The lab did not load on this page, so this widget cannot read the toy data.</p>';
    return;
  }
  var Lab = window.Lab;
  var BF = "${analysis_dir}/toy.geno0.01.mind0.01";
  var RUNS = {
    pruned: { pfx: "${analysis_dir}/toy.geno0.01.mind0.01.LD0.3", name: "pruned (the practical)",
      cmd: "plink --bfile ${analysis_dir}/toy.geno0.01.mind0.01 --extract ${analysis_dir}/toy.geno0.01.mind0.01.prune.in --maf 0.05 --pca --out ${analysis_dir}/toy.geno0.01.mind0.01.LD0.3" },
    noprune: { pfx: "${analysis_dir}/toy.noprune", name: "unpruned (all SNPs)",
      cmd: "plink --bfile ${analysis_dir}/toy.geno0.01.mind0.01 --maf 0.05 --pca --out ${analysis_dir}/toy.noprune" }
  };

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

  /* ---------------- layout ---------------- */
  body.innerHTML = "";
  var controls = el("div", { "class": "controls" });
  var runBtn = el("button", { type: "button", "class": "btn primary" }, "Run the PCA without pruning");
  var status = el("span", { "class": "note", "aria-live": "polite" }, "Waiting for the lab…");
  controls.appendChild(runBtn); controls.appendChild(status);
  body.appendChild(controls);
  var evBox = el("div", { "class": "pc-table" });
  body.appendChild(evBox);

  var pick = el("div", { "class": "controls" });
  var rName = "run-" + Math.random().toString(36).slice(2, 7);
  var rNo = el("input", { type: "radio", name: rName, value: "noprune", checked: "checked" });
  var rPr = el("input", { type: "radio", name: rName, value: "pruned" });
  var l1 = el("label", { "class": "pc-k" }); l1.appendChild(rNo); l1.appendChild(document.createTextNode(" unpruned run"));
  var l2 = el("label", { "class": "pc-k" }); l2.appendChild(rPr); l2.appendChild(document.createTextNode(" pruned run"));
  var kLab = el("label", { "class": "pc-k" }, "component ");
  var kSel = el("select", { "aria-label": "Component" });
  kLab.appendChild(kSel);
  pick.appendChild(l1); pick.appendChild(l2); pick.appendChild(kLab);
  body.appendChild(pick);

  var grid = el("div", { "class": "pc-grid" });
  var left = el("div"), right = el("div");
  grid.appendChild(left); grid.appendChild(right);
  body.appendChild(grid);
  var capL = el("p", { "class": "pc-cap" }, "");
  left.appendChild(capL);
  var scBox = el("div", { id: "w-pca-prune-scatter" });
  left.appendChild(scBox);
  var capR = el("p", { "class": "pc-cap" }, "");
  right.appendChild(capR);
  var gBox = el("div", { id: "w-pca-prune-genome" });
  right.appendChild(gBox);
  var readout = el("div", { "class": "readout pc-readout", "aria-live": "polite" });
  body.appendChild(readout);

  /* ---------------- data ---------------- */
  var data = { pruned: null, noprune: null }, geno = null, sc = null, gp = null, cache = {};

  function readRun(key) {
    var v = Lab.readTable(RUNS[key].pfx + ".eigenvec"), e = Lab.readTable(RUNS[key].pfx + ".eigenval", { header: false });
    if (!v || !e) return null;
    var K = v.header.length - 2, idx = Object.create(null);
    var ids = v.rows.map(function (r, i) { var id = r[0] + " " + r[1]; idx[id] = i; return id; });
    var pcs = [];
    for (var k = 0; k < K; k++) pcs.push(v.col(k + 2).map(Number));
    return { K: K, ids: ids, idx: idx, pcs: pcs, vals: e.col(0).filter(isFinite) };
  }

  // genotypes of the fileset, decoded from the .bed (copies of A1; -1 = missing)
  function readGeno() {
    var bed = Lab.fs.readBytes(BF + ".bed"), bim = Lab.readTable(BF + ".bim", { header: false }), fam = Lab.readTable(BF + ".fam", { header: false });
    if (!bed || !bim || !fam) return null;
    if (bed[0] !== 0x6c || bed[1] !== 0x1b || bed[2] !== 0x01) throw new Error("the .bed file is not a variant-major PLINK 1 file");
    var n = fam.n, m = bim.n, bpv = Math.ceil(n / 4);
    if (bed.length !== 3 + m * bpv) throw new Error("the .bed size does not match the .bim and .fam files");
    var ids = fam.rows.map(function (r) { return r[0] + " " + r[1]; });
    var chr = bim.col(0), pos = bim.col(3), snp = bim.col(1);
    var G = new Int8Array(n * m), CODE = [2, -1, 1, 0];
    for (var j = 0; j < m; j++) {
      var off = 3 + j * bpv, base = j * n;
      for (var i = 0; i < n; i++) G[base + i] = CODE[(bed[off + (i >> 2)] >> ((i & 3) * 2)) & 3];
    }
    // genome coordinate: chromosomes laid end to end, in Mb
    var cum = new Float64Array(m), start = 0, last = null, maxPos = 0;
    for (j = 0; j < m; j++) {
      if (chr[j] !== last) { if (last !== null) start += maxPos / 1e6 + 5; last = chr[j]; maxPos = 0; }
      cum[j] = start + pos[j] / 1e6;
      if (pos[j] > maxPos) maxPos = pos[j];
    }
    // minor allele frequency among called genotypes
    var maf = new Float64Array(m);
    for (j = 0; j < m; j++) {
      var s = 0, c = 0;
      for (i = 0; i < n; i++) { var g = G[j * n + i]; if (g >= 0) { s += g; c++; } }
      var p = c ? s / (2 * c) : 0;
      maf[j] = Math.min(p, 1 - p);
    }
    return { n: n, m: m, ids: ids, G: G, chr: chr, pos: pos, snp: snp, cum: cum, maf: maf };
  }

  // r² between every SNP (MAF ≥ 0.05) and PC k of a run
  function r2Along(run, k) {
    var key = (run === data.pruned ? "p" : "u") + k;
    if (cache[key]) return cache[key];
    var n = geno.n, u = new Float64Array(n), has = new Uint8Array(n);
    for (var i = 0; i < n; i++) { var r = run.idx[geno.ids[i]]; if (r != null) { u[i] = run.pcs[k][r]; has[i] = 1; } }
    var out = [];
    for (var j = 0; j < geno.m; j++) {
      if (geno.maf[j] < 0.05) continue;
      var sg = 0, su = 0, sgg = 0, suu = 0, sgu = 0, c = 0, base = j * n;
      for (i = 0; i < n; i++) {
        var g = geno.G[base + i];
        if (g < 0 || !has[i]) continue;
        var x = u[i];
        sg += g; su += x; sgg += g * g; suu += x * x; sgu += g * x; c++;
      }
      if (c < 3) continue;
      var cov = sgu - sg * su / c, vg = sgg - sg * sg / c, vu = suu - su * su / c;
      var r2 = vg > 0 && vu > 0 ? cov * cov / (vg * vu) : 0;
      out.push({ j: j, r2: r2 });
    }
    cache[key] = out;
    return out;
  }

  // Is the component made by one region? Find the chromosome holding most of the top 1% of SNPs by r²; if it holds
  // at least 80% of them, report the share of the component's summed r² that the SNPs of that stretch carry
  // (the summed r² over all SNPs is about m × eigenvalue / n, so the share says how much of the component the region is).
  function summary(list) {
    if (!list.length) return "";
    var sorted = list.slice().sort(function (a, b) { return b.r2 - a.r2; });
    var top = sorted.slice(0, Math.max(10, Math.round(list.length * 0.01)));
    var byChr = Object.create(null);
    top.forEach(function (t) { var c = geno.chr[t.j]; (byChr[c] = byChr[c] || []).push(t.j); });
    var best = null;
    Object.keys(byChr).forEach(function (c) { if (!best || byChr[c].length > byChr[best].length) best = c; });
    var total = list.reduce(function (a, b) { return a + b.r2; }, 0);
    var head = "Largest r²: " + sig(sorted[0].r2, 3) + " (" + esc(String(geno.snp[sorted[0].j])) + ", chromosome " + esc(String(geno.chr[sorted[0].j])) + "). " +
      "Mean r² over " + int(list.length) + " SNPs: " + sig(total / list.length, 3) + ". ";
    var share = byChr[best].length / top.length;
    if (share < 0.8) return head + "Of the " + top.length + " SNPs with the largest r², at most " + Math.round(100 * share) + "% lie on any one chromosome: <strong>the signal is spread over the genome.</strong>";
    var js = byChr[best], lo = Math.min.apply(null, js.map(function (j) { return +geno.pos[j]; })), hi = Math.max.apply(null, js.map(function (j) { return +geno.pos[j]; }));
    var inR = list.filter(function (t) { return String(geno.chr[t.j]) === String(best) && +geno.pos[t.j] >= lo - 5e5 && +geno.pos[t.j] <= hi + 5e5; });
    var rs = inR.reduce(function (a, b) { return a + b.r2; }, 0), fr = total > 0 ? rs / total : 0;
    return head + "Of the " + top.length + " SNPs with the largest r², " + Math.round(100 * share) + "% lie on chromosome " + esc(String(best)) +
      " between " + sig(lo / 1e6, 4) + " and " + sig(hi / 1e6, 4) + " Mb. The " + int(inR.length) + " SNPs of that stretch (" + (100 * inR.length / list.length).toFixed(1) +
      "% of the SNPs) carry " + Math.round(100 * fr) + "% of the summed r²: <strong>" +
      (fr >= 0.5 ? "this component is mostly that one region." : "this component mixes that region with structure spread over the genome.") + "</strong>";
  }

  function refresh() {
    var key = rPr.checked ? "pruned" : "noprune", run = data[key];
    if (!run) { capL.textContent = ""; capR.textContent = ""; scBox.innerHTML = '<p class="note">Run the ' + RUNS[key].name + " PCA first.</p>"; gBox.innerHTML = ""; sc = gp = null; readout.textContent = ""; return; }
    var kv = kSel.value, K = run.K;
    if (!kv || +kv > K - 1) kv = "1";
    var k = +kv - 1;
    capL.innerHTML = "<strong>PC" + (k + 1) + " against PC" + (k + 2) + "</strong>, " + esc(RUNS[key].name) + ".";
    var pts = run.ids.map(function (id, i) { return { x: run.pcs[k][i], y: run.pcs[k + 1][i], label: id }; });
    var so = { equal: true, xLabel: "PC" + (k + 1), yLabel: "PC" + (k + 2), legend: false, refLines: [{ x: 0, extend: false }, { y: 0, extend: false }],
      ariaLabel: "Scatter plot of PC" + (k + 1) + " against PC" + (k + 2) + " of the " + RUNS[key].name + " PCA" };
    if (sc) sc.update(pts, so); else sc = Lab.plot.scatter(scBox, pts, so);
    capR.innerHTML = "<strong>Which SNPs move with PC" + (k + 1) + "?</strong> r² between each SNP's genotypes and the PC" + (k + 1) + " scores, along the genome; chromosomes alternate blue and gray.";
    if (!geno) { gBox.innerHTML = '<p class="note">The genotypes of <code>toy.geno0.01.mind0.01.bed</code> are not in the lab yet.</p>'; gp = null; readout.textContent = ""; return; }
    var list = r2Along(run, k);
    var gpts = list.map(function (t) { var c = String(geno.chr[t.j]); return { x: geno.cum[t.j], y: t.r2, group: (+c % 2 ? "odd" : "even"), label: geno.snp[t.j] + " (chr " + c + ":" + int(+geno.pos[t.j]) + ")" }; });
    var go = { legend: false, groups: ["odd", "even"], colors: { odd: "var(--q1)", even: "#8a93a0" }, xLabel: "Position along the genome (Mb, chromosomes in order)", yLabel: "r² with PC" + (k + 1),
      yDomain: [0, Math.max(0.05, Math.min(1, Math.max.apply(null, list.map(function (t) { return t.r2; }).concat([0])) * 1.1))], r: 2,
      tooltip: function (q) { return q.label + "\nr² " + sig(q.y, 3); },
      ariaLabel: "Squared correlation of each SNP with PC" + (k + 1) + " along the genome, " + RUNS[key].name + " PCA" };
    if (gp) gp.update(gpts, go); else gp = Lab.plot.scatter(gBox, gpts, go);
    readout.innerHTML = summary(list);
  }

  function evTable() {
    var a = data.pruned, b = data.noprune;
    if (!a && !b) { evBox.innerHTML = ""; return; }
    var rows = Math.min(6, Math.max(a ? a.vals.length : 0, b ? b.vals.length : 0));
    var html = '<div class="table-wrap"><table class="compact"><caption>Eigenvalues of the first components</caption><thead><tr><th scope="col">Component</th>' +
      '<th class="num" scope="col">pruned run</th><th class="num" scope="col">unpruned run</th></tr></thead><tbody>';
    for (var k = 0; k < rows; k++) {
      html += "<tr><td>PC" + (k + 1) + '</td><td class="num">' + (a ? sig(a.vals[k], 4) : "not run") + '</td><td class="num">' + (b ? sig(b.vals[k], 4) : "not run") + "</td></tr>";
    }
    evBox.innerHTML = html + "</tbody></table></div>";
  }

  function draw() {
    try {
      data.pruned = readRun("pruned"); data.noprune = readRun("noprune");
      geno = readGeno();
    } catch (err) { status.textContent = "Could not read the files: " + err.message; return; }
    cache = {};
    var K = Math.max(data.pruned ? data.pruned.K : 0, data.noprune ? data.noprune.K : 0);
    var cur = kSel.value || "1";
    kSel.innerHTML = "";
    for (var k = 1; k <= Math.max(1, Math.min(6, K - 1)); k++) { var o = el("option", { value: String(k) }, "PC" + k); if (String(k) === cur) o.selected = true; kSel.appendChild(o); }
    runBtn.hidden = !!(data.pruned && data.noprune);
    runBtn.textContent = !data.noprune && !data.pruned ? "Run both PCAs" : !data.noprune ? "Run the PCA without pruning" : "Run the pruned PCA";
    status.textContent = (data.pruned ? "Pruned run found. " : "No pruned run yet. ") + (data.noprune ? "Unpruned run found (toy.noprune)." : "No unpruned run yet.") + " (Toy data, simulated.)";
    evTable();
    refresh();
  }

  [rNo, rPr].forEach(function (r) { r.addEventListener("change", refresh); });
  kSel.addEventListener("change", refresh);
  runBtn.addEventListener("click", function () {
    runBtn.disabled = true;
    var todo = [];
    if (!data.pruned) todo.push(RUNS.pruned.cmd);
    if (!data.noprune) todo.push(RUNS.noprune.cmd);
    status.textContent = "Running plink --pca…";
    todo.reduce(function (p, c) { return p.then(function (prev) { return prev && prev.code ? prev : Lab.run(c); }); }, Promise.resolve(null)).then(function (res) {
      runBtn.disabled = false;
      if (res && res.code !== 0) status.textContent = "plink stopped with exit code " + res.code + "; see the terminal output for the message.";
    });
  });
  document.addEventListener("lab:fs-change", function (e) {
    if ((e.detail.paths || []).some(function (p) { return /\/toy\.(geno0\.01\.mind0\.01\.LD0\.3|noprune)\.eigen(vec|val)$|\/toy\.geno0\.01\.mind0\.01\.(bed|bim|fam)$/.test(p); })) draw();
  });
  Lab.ready.then(draw);
})();
