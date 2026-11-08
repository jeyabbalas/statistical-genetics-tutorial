/* qc-relatedness-z0z1.js: the toy data's pairs in the plane of Z0 against Z1, with a PI_HAT threshold.
   Loaded after lab.js. Reads ${analysis_dir}/toy.geno0.01.mind0.01.LD0.3.genome, written in the lab by
     plink --bfile …/toy.geno0.01.mind0.01 --extract ….prune.in --genome --out …/toy.geno0.01.mind0.01.LD0.3
   and redraws whenever a command writes that file again (lab:fs-change). It never runs PLINK by itself;
   the button runs the command through Lab.run when the reader asks.
   Shows:
   - every pair as a point (Z0, Z1); the expected point of each relationship; the line Z2 = 0;
   - the threshold t as the line PI_HAT = 1 − Z0 − Z1/2 = t, that is Z1 = 2(1 − t − Z0), and the flagged
     region PI_HAT > t (PI_HAT = Z1/2 + Z2 and Z0 + Z1 + Z2 = 1);
   - a histogram of PI_HAT (Lab.plot.histogram, log count scale) whose draggable threshold sets t;
   - R's summary(PI_HAT): minimum, quartiles (R's default quantile type 7), mean, maximum;
   - the flagged pairs with the nearest expected relationship (Euclidean distance in (Z0, Z1, Z2));
   - a removal list: repeatedly remove the person in the most unresolved flagged pairs; when everyone
     left is in one pair, remove the member with the larger F_MISS in toy.geno0.01.imiss (if present);
   - on request (a spoiler, off by default), what the simulation planted for each listed pair, from
     window.TOY_PEOPLE (data-card.js): a planted relationship, the contaminated sample, or nothing. */
(function () {
  "use strict";
  var root = document.getElementById("w-ibd-z0z1");
  if (!root) return;
  var body = root.querySelector(".widget-body");
  if (!window.Lab) {
    body.innerHTML = '<p class="note">The lab did not load on this page, so this widget cannot read the toy data.</p>';
    return;
  }
  var Lab = window.Lab;
  var GENOME = "${analysis_dir}/toy.geno0.01.mind0.01.LD0.3.genome";
  var IMISS = "${analysis_dir}/toy.geno0.01.imiss";
  var CMD = "plink --bfile ${analysis_dir}/toy.geno0.01.mind0.01 --extract ${analysis_dir}/toy.geno0.01.mind0.01.prune.in --genome --out ${analysis_dir}/toy.geno0.01.mind0.01.LD0.3";
  var SVGNS = "http://www.w3.org/2000/svg";
  var EXPECTED = [
    { name: "duplicate", z: [0, 0, 1], lab: [9, -7, "start"] },
    { name: "parent–child", z: [0, 1, 0], lab: [9, 4, "start"] },
    { name: "full siblings", z: [0.25, 0.5, 0.25], lab: [-9, 17, "end"] },
    { name: "2nd degree", z: [0.5, 0.5, 0], lab: [8, -8, "start"] },
    { name: "3rd degree", z: [0.75, 0.25, 0], lab: [8, -8, "start"] },
    { name: "unrelated", z: [1, 0, 0], lab: [-2, -12, "end"] }
  ];

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function sv(tag, attrs, text) {
    var e = document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function f3(x) { return isFinite(x) ? x.toFixed(3) : "NA"; }
  function sig(x) {
    if (!isFinite(x)) return "NA";
    if (x === 0) return "0";
    var s = Number(x.toPrecision(4)).toString();
    return s.indexOf("e") >= 0 ? x.toPrecision(4) : s;
  }
  function int(n) { return n.toLocaleString("en-US"); }

  /* ---------------- layout ---------------- */
  body.innerHTML = "";
  var controls = el("div", { "class": "controls" });
  var runBtn = el("button", { type: "button", "class": "btn primary" }, "Run plink --genome");
  var status = el("span", { "class": "note", "aria-live": "polite" }, "Waiting for the lab…");
  controls.appendChild(runBtn); controls.appendChild(status);
  body.appendChild(controls);

  var grid = el("div", { "class": "zz-grid" });
  var left = el("div"), right = el("div");
  grid.appendChild(left); grid.appendChild(right);
  body.appendChild(grid);
  left.appendChild(el("p", { "class": "zz-cap" }, "<strong>Z0 against Z1.</strong> One dot per pair of people; diamonds mark each relationship's expected point."));
  var P = { w: 330, h: 320, l: 50, r: 12, t: 12, b: 40 };
  var svg = sv("svg", { viewBox: "0 0 " + P.w + " " + P.h, role: "img", "class": "zz-plane", "aria-label": "Scatter plot of Z0 against Z1 for every pair of people in the toy data" });
  left.appendChild(svg);
  var pointed = el("p", { "class": "note zz-pointed", "aria-live": "polite" }, "Point at (or tap) a dot to see the pair.");
  left.appendChild(pointed);

  right.appendChild(el("p", { "class": "zz-cap" }, "<strong>PI_HAT of every pair.</strong> Counts on a log scale. Drag the red line, or use the slider, to move the threshold."));
  var histBox = el("div", { id: "w-ibd-z0z1-hist" });
  right.appendChild(histBox);
  var presets = el("div", { "class": "controls zz-presets" });
  presets.appendChild(el("span", { "class": "note" }, "Set the threshold:"));
  [[0.1875, "0.1875"], [0.2, "0.2"], [0.98, "0.98 (duplicates)"]].forEach(function (p) {
    var b = el("button", { type: "button", "class": "btn" }, p[1]);
    b.addEventListener("click", function () { if (hist) hist.setThreshold(p[0]); else setT(p[0]); });
    presets.appendChild(b);
  });
  right.appendChild(presets);

  var TP = window.TOY_PEOPLE || null;   // simulated group and planted role of each toy person (data-card.js)
  var truthIn = null;
  if (TP) {
    var tRow = el("div", { "class": "controls" });
    var tLab = el("label", { "class": "zz-truth" });
    truthIn = el("input", { type: "checkbox" });
    tLab.appendChild(truthIn); tLab.appendChild(document.createTextNode(" Show what the simulation planted (spoiler)"));
    tRow.appendChild(tLab);
    body.appendChild(tRow);
  }
  var REL = { duplicate: "planted duplicate", parent: "planted parent–offspring", offspring: "planted parent–offspring",
    full_sibling: "planted full siblings", half_sibling: "planted half siblings" };
  function truthOf(p) {
    var fa = p.a.split(" ")[0], fb = p.b.split(" ")[0], A = TP && TP[fa], B = TP && TP[fb];
    if (!A || !B) return "not in the data card";
    if (A.pair === fb && REL[A.planted]) return REL[A.planted];
    if (A.planted === "contaminated" || B.planted === "contaminated") return "unrelated; contaminated sample";
    return "unrelated";
  }
  function showTruth() { return !!(truthIn && truthIn.checked); }
  var summary = el("div", { "class": "readout zz-summary", "aria-live": "polite" });
  body.appendChild(summary);
  var tableBox = el("div", { "class": "zz-table" });
  body.appendChild(tableBox);

  /* ---------------- static parts of the plane ---------------- */
  function sx(z0) { return P.l + z0 * (P.w - P.l - P.r); }
  function sy(z1) { return P.h - P.b - z1 * (P.h - P.t - P.b); }
  var gGrid = sv("g"), gFlag = sv("g"), gDots = sv("g"), gExp = sv("g"), gHot = sv("g"), gExpLab = sv("g"), gRing = sv("g");
  (function axes() {
    for (var g = 0; g <= 4; g++) {
      var v = g / 4;
      gGrid.appendChild(sv("line", { x1: sx(v), y1: sy(0), x2: sx(v), y2: sy(1), stroke: "#eef1f4" }));
      gGrid.appendChild(sv("line", { x1: sx(0), y1: sy(v), x2: sx(1), y2: sy(v), stroke: "#eef1f4" }));
      gGrid.appendChild(sv("text", { x: sx(v), y: sy(0) + 18, "class": "t-xs", "text-anchor": "middle" }, String(v)));
      gGrid.appendChild(sv("text", { x: sx(0) - 10, y: sy(v) + 3.5, "class": "t-xs", "text-anchor": "end" }, String(v)));
    }
    gGrid.appendChild(sv("line", { x1: sx(0), y1: sy(0), x2: sx(1), y2: sy(0), stroke: "#8a93a0" }));
    gGrid.appendChild(sv("line", { x1: sx(0), y1: sy(0), x2: sx(0), y2: sy(1), stroke: "#8a93a0" }));
    gGrid.appendChild(sv("line", { x1: sx(0), y1: sy(1), x2: sx(1), y2: sy(0), stroke: "#8a93a0", "stroke-dasharray": "4 3" }));
    gGrid.appendChild(sv("text", { x: (sx(0) + sx(1)) / 2, y: P.h - 6, "class": "t-sm", "text-anchor": "middle" }, "Z0 = estimated P(IBD = 0)"));
    var cy = (sy(0) + sy(1)) / 2;
    gGrid.appendChild(sv("text", { x: 12, y: cy, "class": "t-sm", "text-anchor": "middle", transform: "rotate(-90 12 " + cy + ")" }, "Z1 = estimated P(IBD = 1)"));
    EXPECTED.forEach(function (e) {
      var x = sx(e.z[0]), y = sy(e.z[1]);
      gExp.appendChild(sv("rect", { x: x - 5.5, y: y - 5.5, width: 11, height: 11, fill: "none", stroke: "#1d2127", "stroke-width": 1.4, transform: "rotate(45 " + x + " " + y + ")" }));
      gExpLab.appendChild(sv("text", { x: x + e.lab[0], y: y + e.lab[1], "class": "t-xs zz-lab", "text-anchor": e.lab[2] }, e.name));
    });
  })();
  // flagged pairs are drawn above the labels, so that a label never hides one
  [gGrid, gFlag, gDots, gExp, gExpLab, gHot, gRing].forEach(function (g) { svg.appendChild(g); });

  /* ---------------- state ---------------- */
  var pairs = [], hist = null, t = 0.1875, imiss = null, raf = 0, piSorted = [], piMean = NaN, piZeros = 0;

  function nearest(z) {
    var best = null, bd = Infinity;
    EXPECTED.forEach(function (e) {
      var d = Math.pow(z[0] - e.z[0], 2) + Math.pow(z[1] - e.z[1], 2) + Math.pow(z[2] - e.z[2], 2);
      if (d < bd) { bd = d; best = e.name; }
    });
    return best;
  }
  function quantile7(sorted, p) {
    var n = sorted.length; if (!n) return NaN;
    var hgt = (n - 1) * p, lo = Math.floor(hgt), hi = Math.min(n - 1, lo + 1);
    return sorted[lo] + (hgt - lo) * (sorted[hi] - sorted[lo]);
  }

  function readFiles() {
    var tab = Lab.readTable(GENOME);
    if (!tab) return false;
    var c = {};
    ["FID1", "IID1", "FID2", "IID2", "Z0", "Z1", "Z2", "PI_HAT"].forEach(function (k) { c[k] = tab.header.indexOf(k); });
    if (c.Z0 < 0 || c.Z1 < 0 || c.PI_HAT < 0) throw new Error("the file has no Z0, Z1 or PI_HAT column");
    pairs = tab.rows.map(function (r) {
      return { a: r[c.FID1] + " " + r[c.IID1], b: r[c.FID2] + " " + r[c.IID2], z: [+r[c.Z0], +r[c.Z1], c.Z2 >= 0 ? +r[c.Z2] : 1 - r[c.Z0] - r[c.Z1]], pi: +r[c.PI_HAT] };
    });
    piSorted = pairs.map(function (p) { return p.pi; }).filter(isFinite).sort(function (x, y) { return x - y; });
    piMean = piSorted.reduce(function (s, v) { return s + v; }, 0) / (piSorted.length || 1);
    piZeros = piSorted.filter(function (v) { return v === 0; }).length;
    imiss = null;
    var im = Lab.readTable(IMISS);
    if (im && im.header.indexOf("F_MISS") >= 0) {
      imiss = {};
      var iF = im.header.indexOf("FID"), iI = im.header.indexOf("IID"), iM = im.header.indexOf("F_MISS");
      im.rows.forEach(function (r) { imiss[r[iF] + " " + r[iI]] = +r[iM]; });
    }
    return true;
  }

  function drawDots() {
    while (gDots.firstChild) gDots.removeChild(gDots.firstChild);
    var seen = Object.create(null);
    var frag = document.createDocumentFragment();
    pairs.forEach(function (p) {
      if (!isFinite(p.z[0]) || !isFinite(p.z[1])) return;
      var x = sx(Math.max(0, Math.min(1, p.z[0]))), y = sy(Math.max(0, Math.min(1, p.z[1])));
      var key = Math.round(x * 2) + "|" + Math.round(y * 2);
      if (seen[key]) return;
      seen[key] = 1;
      frag.appendChild(sv("circle", { cx: x.toFixed(1), cy: y.toFixed(1), r: 2.3, fill: "#7d8794", "fill-opacity": 0.45 }));
    });
    gDots.appendChild(frag);
  }

  function drawThreshold() {
    while (gFlag.firstChild) gFlag.removeChild(gFlag.firstChild);
    while (gHot.firstChild) gHot.removeChild(gHot.firstChild);
    // flagged region PI_HAT > t inside the triangle Z0, Z1 >= 0, Z0 + Z1 <= 1
    var poly = t <= 0.5 ? [[0, 0], [1 - t, 0], [1 - 2 * t, 2 * t], [0, 1]] : [[0, 0], [1 - t, 0], [0, 2 * (1 - t)]];
    gFlag.appendChild(sv("polygon", { points: poly.map(function (q) { return sx(q[0]).toFixed(1) + "," + sy(q[1]).toFixed(1); }).join(" "), fill: "var(--pitfall-soft)", "fill-opacity": 0.75 }));
    var a = [1 - t, 0], b = t <= 0.5 ? [1 - 2 * t, 2 * t] : [0, 2 * (1 - t)];
    gFlag.appendChild(sv("line", { x1: sx(a[0]), y1: sy(a[1]), x2: sx(b[0]), y2: sy(b[1]), stroke: "var(--pitfall)", "stroke-width": 2 }));
    pairs.forEach(function (p) {
      if (!(p.pi > t)) return;
      gHot.appendChild(sv("circle", { cx: sx(Math.max(0, Math.min(1, p.z[0]))).toFixed(1), cy: sy(Math.max(0, Math.min(1, p.z[1]))).toFixed(1), r: 3.6, fill: "var(--pitfall)", stroke: "#fff", "stroke-width": 0.8 }));
    });
  }

  function removalList(flagged) {
    var open = flagged.slice(), removed = [], reasons = {};
    while (open.length) {
      var cnt = Object.create(null);
      open.forEach(function (p) { cnt[p.a] = (cnt[p.a] || 0) + 1; cnt[p.b] = (cnt[p.b] || 0) + 1; });
      var top = null, tc = 0;
      Object.keys(cnt).forEach(function (k) { if (cnt[k] > tc) { tc = cnt[k]; top = k; } });
      var who;
      if (tc >= 2) { who = top; reasons[who] = "in " + tc + " flagged pairs"; }
      else {
        var p = open[0];
        if (imiss && imiss[p.a] != null && imiss[p.b] != null) {
          who = imiss[p.a] > imiss[p.b] ? p.a : p.b;
          reasons[who] = "F_MISS " + sig(imiss[who]) + " vs " + sig(imiss[who === p.a ? p.b : p.a]);
        } else { who = p.b; reasons[who] = "second member of the pair"; }
      }
      removed.push(who);
      open = open.filter(function (q) { return q.a !== who && q.b !== who; });
    }
    return { ids: removed, reasons: reasons };
  }

  function drawTables() {
    var vals = piSorted, n = vals.length, mean = piMean, zeros = piZeros;
    var flagged = pairs.filter(function (p) { return p.pi > t; }).sort(function (x, y) { return y.pi - x.pi; });
    var people = Object.create(null);
    flagged.forEach(function (p) { people[p.a] = (people[p.a] || 0) + 1; people[p.b] = (people[p.b] || 0) + 1; });
    var nPeople = Object.keys(people).length;
    summary.innerHTML =
      "summary(PI_HAT) over " + int(n) + " pairs: Min. " + sig(vals[0]) + " · 1st Qu. " + sig(quantile7(vals, 0.25)) +
      " · Median " + sig(quantile7(vals, 0.5)) + " · Mean " + sig(mean) + " · 3rd Qu. " + sig(quantile7(vals, 0.75)) +
      " · Max. " + sig(vals[n - 1]) + "<br>Pairs with PI_HAT exactly 0 (clipped): " + int(zeros) + " (" + (n ? (100 * zeros / n).toFixed(1) : "0") + "%)" +
      "<br><strong>PI_HAT &gt; " + sig(t) + ": " + int(flagged.length) + " pair" + (flagged.length === 1 ? "" : "s") + ", involving " + int(nPeople) + " " + (nPeople === 1 ? "person" : "people") + ".</strong>";
    if (!flagged.length) { tableBox.innerHTML = '<p class="note">No pair is above the threshold.</p>'; return; }
    var shown = flagged.slice(0, 12), extra = 0;
    if (showTruth()) flagged.slice(12).forEach(function (p) { if (/^planted/.test(truthOf(p))) { shown.push(p); extra++; } });
    var html = '<div class="table-wrap"><table class="compact zz-pairs"><caption>Pairs above the threshold, closest first' +
      (flagged.length > 12 ? " (first 12 of " + int(flagged.length) + (extra ? ", then the planted pairs further down the list" : "") + ")" : "") + '</caption>' +
      '<thead><tr><th scope="col">Pair (FID IID)</th><th class="num" scope="col">Z0</th><th class="num" scope="col">Z1</th><th class="num zz-z2" scope="col">Z2</th><th class="num" scope="col">PI_HAT</th><th scope="col">Nearest expected' + (showTruth() ? " (and what was planted)" : "") + '</th></tr></thead><tbody>';
    shown.forEach(function (p) {
      html += '<tr><td class="zz-ids">' + esc(p.a) + "<br>" + esc(p.b) + '</td><td class="num">' + f3(p.z[0]) + '</td><td class="num">' + f3(p.z[1]) +
        '</td><td class="num zz-z2">' + f3(p.z[2]) + '</td><td class="num">' + f3(p.pi) + '</td><td class="zz-near">' + nearest(p.z) + (showTruth() ? '<br><span class="zz-sim">' + esc(truthOf(p)) + "</span>" : "") + "</td></tr>";
    });
    html += "</tbody></table></div>";
    var busy = Object.keys(people).filter(function (k) { return people[k] >= 3; }).sort(function (x, y) { return people[y] - people[x]; });
    if (busy.length) {
      html += '<p class="note zz-busy"><strong>In three or more flagged pairs:</strong> ' + busy.slice(0, 6).map(function (k) { return esc(k) + " (" + people[k] + " pairs)"; }).join(", ") +
        ". One person related to many others is more often a contaminated or low-quality sample than a person with many relatives; check heterozygosity (step 5).</p>";
    }
    var rm = removalList(flagged);
    html += '<p class="zz-cap"><strong>Removal list</strong> (' + int(rm.ids.length) + " " + (rm.ids.length === 1 ? "person" : "people") +
      "; family ID and individual ID, the format <code>plink --remove</code> reads)" + (imiss ? "" : ". Without <code>toy.geno0.01.imiss</code> in the lab, ties go to the second member; run <code>plink --bfile ${analysis_dir}/toy.geno0.01 --missing --out ${analysis_dir}/toy.geno0.01</code> to choose by missingness") + ":</p>";
    html += '<pre class="output zz-remove">' + rm.ids.map(function (id) { return esc(id) + "    # " + esc(rm.reasons[id]); }).join("\n") + "</pre>";
    tableBox.innerHTML = html;
  }

  function setT(v) {
    t = v;
    if (raf) return;
    var go = function () { raf = 0; drawThreshold(); drawTables(); };
    raf = (window.requestAnimationFrame || function (f) { return setTimeout(f, 16); })(go);
  }

  /* pointing at a dot */
  function onPoint(e) {
    if (!pairs.length) return;
    var rect = svg.getBoundingClientRect();
    var k = P.w / rect.width;
    var x = (e.clientX - rect.left) * k, y = (e.clientY - rect.top) * k;
    var best = null, bd = (e.pointerType === "touch" ? 16 : 9) * k;
    bd *= bd;
    for (var i = 0; i < pairs.length; i++) {
      var p = pairs[i];
      var dx = sx(Math.max(0, Math.min(1, p.z[0]))) - x, dy = sy(Math.max(0, Math.min(1, p.z[1]))) - y, dd = dx * dx + dy * dy;
      if (dd < bd || (dd === bd && best && p.pi > best.pi)) { bd = dd; best = p; }
    }
    while (gRing.firstChild) gRing.removeChild(gRing.firstChild);
    if (!best) { pointed.textContent = "Point at (or tap) a dot to see the pair."; return; }
    gRing.appendChild(sv("circle", { cx: sx(Math.max(0, Math.min(1, best.z[0]))), cy: sy(Math.max(0, Math.min(1, best.z[1]))), r: 6.5, fill: "none", stroke: "#1d2127", "stroke-width": 1.5 }));
    pointed.textContent = best.a + " and " + best.b + ": Z0 " + f3(best.z[0]) + ", Z1 " + f3(best.z[1]) + ", Z2 " + f3(best.z[2]) + ", PI_HAT " + f3(best.pi) + " (nearest expected point: " + nearest(best.z) + ")" +
      (showTruth() ? "; simulated: " + truthOf(best) : "");
  }
  svg.addEventListener("pointermove", function (e) { if (e.pointerType !== "touch") onPoint(e); });
  svg.addEventListener("pointerdown", onPoint);

  function draw() {
    var ok;
    try { ok = readFiles(); }
    catch (err) { status.textContent = "Could not read the .genome file: " + err.message; return; }
    if (!ok) {
      pairs = [];
      drawDots(); drawThreshold();
      summary.innerHTML = ""; tableBox.innerHTML = "";
      histBox.innerHTML = '<p class="note">No <code>toy.geno0.01.mind0.01.LD0.3.genome</code> yet.</p>';
      hist = null;
      status.textContent = "Run plink --genome in the terminal above, or press the button.";
      runBtn.hidden = false;
      return;
    }
    runBtn.hidden = true;
    status.textContent = int(pairs.length) + " pairs in toy.geno0.01.mind0.01.LD0.3.genome (toy data, simulated).";
    var vals = pairs.map(function (p) { return p.pi; });
    var opts = { bins: 40, domain: [0, 1], logY: true, xLabel: "PI_HAT", unit: "pairs",
      threshold: { value: t, min: 0, max: 1, step: 0.0025, label: "PI_HAT threshold", direction: "above", verb: "flagged", format: function (v) { return String(+v.toFixed(4)); } },
      onThreshold: function (v) { setT(v); },
      ariaLabel: "Histogram of PI_HAT over all pairs of people in the toy data, with a draggable threshold" };
    if (hist) hist.update(vals, opts); else hist = Lab.plot.histogram(histBox, vals, opts);
    drawDots(); drawThreshold(); drawTables();
  }

  if (truthIn) truthIn.addEventListener("change", function () { if (pairs.length) drawTables(); });
  runBtn.addEventListener("click", function () {
    runBtn.disabled = true;
    status.textContent = "Running plink --genome…";
    Lab.run(CMD).then(function (res) {
      runBtn.disabled = false;
      if (res.code !== 0) status.textContent = "plink stopped with exit code " + res.code + "; see the terminal output for the message.";
    });
  });
  document.addEventListener("lab:fs-change", function (e) {
    var hit = (e.detail.paths || []).some(function (p) { return /\/toy\.geno0\.01\.mind0\.01\.LD0\.3\.genome$|\/toy\.geno0\.01\.imiss$/.test(p); });
    if (hit) draw();
  });
  Lab.ready.then(draw);
})();
