/* Widget "Calling genotypes from intensities" (page: samples-to-genotypes).
   Simulated data only. 500 samples at one SNP, processed in two batches of 250.
   Each sample has two measured signals: allele A (dye 1) and allele B (dye 2).
   True genotypes are drawn under Hardy–Weinberg equilibrium with freq(B) = 0.30.
   Signal model: share of the signal from allele B f = 0.04 / 0.50 / 0.96 for AA / AB / BB, plus noise;
   total brightness S varies between samples (lognormal). A = S(1 - f) + noise, B = S f + noise.
   About 3% of samples have weak signal (little or degraded DNA) and about 1% are a 50:50 mix of two people.
   Batch effect (toggle): in batch 2 the allele-B signal is multiplied by 0.35 (for example a weaker dye).

   Caller (stated in the widget):
   1. angle = (2/pi) atan2(B, A) in [0, 1] (0 = only allele A signal, 1 = only allele B signal);
      strength R = A + B.
   2. Samples with R below 30% of the median R are no-calls (signal too weak).
   3. Three cluster centers are found by k-means on the angle (all samples together), starting at 0.03, 0.5, 0.97.
   4. Each sample gets the genotype of the nearest center. Confidence = d2 / (d1 + d2), where d1 and d2 are the
      distances (in angle) to the nearest and second-nearest centers: 0.5 = exactly halfway, 1 = on a center.
   5. Confidence below the threshold -> no-call.
   Statistics: HWE exact test (Wigginton, Cutler & Abecasis 2005, as in PLINK) and Pearson chi-square (1 df)
   on the called genotypes; batch 1 vs batch 2 allele-frequency test (2 x 2 allele counts, Pearson chi-square,
   1 df); wrong calls are counted against the simulated truth.
   No libraries, no network, no modules: works from file://. Core functions are exported for node tests. */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ simulation */

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function randn(rand) {
    var u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }

  var N = 500, FREQ_B = 0.30, FRAC = [0.04, 0.50, 0.96], SHIFT = 0.35;
  var FLOOR_FRAC = 0.30;

  function drawGeno(rand) { return (rand() < FREQ_B ? 1 : 0) + (rand() < FREQ_B ? 1 : 0); }

  function simulate(seed) {
    var rand = mulberry32(seed >>> 0), out = [];
    for (var i = 0; i < N; i++) {
      var batch = i < N / 2 ? 1 : 2;
      var g = drawGeno(rand);
      var u = rand(), kind = u < 0.03 ? "weak" : (u < 0.042 ? "mixed" : "ok");
      var f;
      if (kind === "mixed") {
        var g2 = drawGeno(rand);
        f = 0.5 * FRAC[g] + 0.5 * FRAC[g2] + 0.03 * randn(rand);
      } else {
        f = FRAC[g] + (kind === "weak" ? 0.12 : 0.03) * randn(rand);
      }
      f = clamp(f, 0.003, 0.997);
      var S = Math.exp(0.16 * randn(rand)) * (kind === "weak" ? 0.2 : 1);
      var A = S * (1 - f) + 0.012 * randn(rand), B = S * f + 0.012 * randn(rand);
      out.push({ id: i, batch: batch, g: g, kind: kind, A: Math.max(A, 0.003), B: Math.max(B, 0.003) });
    }
    return out;
  }

  /* ------------------------------------------------------------------ caller */

  function signals(s, shift) {
    var f = typeof shift === "number" ? shift : (shift ? SHIFT : 1);
    return { A: s.A, B: s.batch === 2 ? s.B * f : s.B };
  }
  function median(arr) {
    var a = arr.slice().sort(function (x, y) { return x - y; }), m = a.length >> 1;
    return a.length % 2 ? a[m] : 0.5 * (a[m - 1] + a[m]);
  }

  function kmeans3(xs) {
    var c = [0.03, 0.5, 0.97];
    for (var it = 0; it < 100; it++) {
      var sum = [0, 0, 0], cnt = [0, 0, 0];
      for (var i = 0; i < xs.length; i++) {
        var x = xs[i], k = 0, best = Math.abs(x - c[0]);
        for (var j = 1; j < 3; j++) { var d = Math.abs(x - c[j]); if (d < best) { best = d; k = j; } }
        sum[k] += x; cnt[k]++;
      }
      var moved = 0, nc = c.slice();
      for (var q = 0; q < 3; q++) if (cnt[q] > 0) { nc[q] = sum[q] / cnt[q]; moved = Math.max(moved, Math.abs(nc[q] - c[q])); }
      c = nc;
      if (moved < 1e-9) break;
    }
    return c.sort(function (x, y) { return x - y; });
  }

  /* Returns per-sample calls (0/1/2 = AA/AB/BB, -1 = no-call) and the fitted model. */
  function callAll(samples, threshold, shift) {
    var pts = samples.map(function (s) {
      var v = signals(s, shift);
      return { A: v.A, B: v.B, R: v.A + v.B, th: (2 / Math.PI) * Math.atan2(v.B, v.A) };
    });
    var floor = FLOOR_FRAC * median(pts.map(function (p) { return p.R; }));
    var strong = pts.filter(function (p) { return p.R >= floor; }).map(function (p) { return p.th; });
    var centers = kmeans3(strong);
    var calls = pts.map(function (p) {
      if (p.R < floor) return { call: -1, conf: NaN, why: "weak", th: p.th, A: p.A, B: p.B };
      var d = centers.map(function (c) { return Math.abs(p.th - c); });
      var order = [0, 1, 2].sort(function (a, b) { return d[a] - d[b]; });
      var d1 = d[order[0]], d2 = d[order[1]];
      var conf = (d1 + d2) > 0 ? d2 / (d1 + d2) : 1;
      return { call: conf >= threshold ? order[0] : -1, conf: conf, why: conf >= threshold ? "" : "between", th: p.th, A: p.A, B: p.B };
    });
    return { calls: calls, centers: centers, floor: floor };
  }

  /* No-call intervals in angle for a given threshold: between neighboring centers c1 < c2 the confidence is
     d2 / (c2 - c1), which is below t on (c2 - t*D, c1 + t*D). Outside the outer centers it never drops below 0.5. */
  function noCallIntervals(centers, t) {
    var out = [];
    for (var i = 0; i < 2; i++) {
      var c1 = centers[i], c2 = centers[i + 1], D = c2 - c1;
      var lo = c2 - t * D, hi = c1 + t * D;
      if (hi > lo) out.push([lo, hi]);
    }
    return out;
  }

  /* ------------------------------------------------------------------ statistics */

  /* log of the upper tail of chi-square(1): P = erfc(sqrt(x/2)). Numerical Recipes erfc (rel. error < 1.2e-7). */
  function chi1Log10P(x) {
    if (!(x > 0)) return 0;
    var z = Math.sqrt(x / 2), t = 1 / (1 + 0.5 * z);
    var poly = -z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 +
      t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))));
    return (Math.log(t) + poly) / Math.LN10;
  }

  function hweExact(n11, n12, n22) {
    var obsHets = n12, obsHomc = Math.max(n11, n22), obsHomr = Math.min(n11, n22);
    var rare = 2 * obsHomr + obsHets, genotypes = obsHets + obsHomc + obsHomr;
    if (genotypes <= 0 || rare === 0) return NaN;
    var probs = new Float64Array(rare + 1);
    var mid = Math.floor(rare * (2 * genotypes - rare) / (2 * genotypes));
    if ((rare % 2) !== (mid % 2)) mid++;
    var currHets = mid, currHomr = (rare - mid) / 2, currHomc = genotypes - currHets - currHomr;
    probs[mid] = 1;
    var sum = 1, h;
    for (h = mid; h > 1; h -= 2) {
      probs[h - 2] = probs[h] * h * (h - 1) / (4 * (currHomr + 1) * (currHomc + 1));
      sum += probs[h - 2]; currHomr++; currHomc++;
    }
    currHomr = (rare - mid) / 2; currHomc = genotypes - mid - currHomr;
    for (h = mid; h <= rare - 2; h += 2) {
      probs[h + 2] = probs[h] * 4 * currHomr * currHomc / ((h + 2) * (h + 1));
      sum += probs[h + 2]; currHomr--; currHomc--;
    }
    var pObs = probs[obsHets] / sum, pval = 0;
    for (h = rare % 2; h <= rare; h += 2) { var ph = probs[h] / sum; if (ph <= pObs * (1 + 1e-9)) pval += ph; }
    return Math.min(1, pval);
  }

  function hweChi(n11, n12, n22) {
    var n = n11 + n12 + n22;
    if (n <= 0) return NaN;
    var p = (2 * n11 + n12) / (2 * n), q = 1 - p;
    var e = [n * p * p, 2 * n * p * q, n * q * q], o = [n11, n12, n22], x2 = 0;
    for (var k = 0; k < 3; k++) if (e[k] > 0) x2 += (o[k] - e[k]) * (o[k] - e[k]) / e[k];
    return x2;
  }

  /* 2 x 2 table of allele counts: rows = batch, columns = allele B / allele A. Pearson chi-square, 1 df. */
  function batchFreqTest(b1, a1, b2, a2) {
    var n = b1 + a1 + b2 + a2;
    if (n <= 0) return NaN;
    var r1 = b1 + a1, r2 = b2 + a2, cB = b1 + b2, cA = a1 + a2;
    if (!r1 || !r2 || !cB || !cA) return NaN;
    var obs = [b1, a1, b2, a2], exp = [r1 * cB / n, r1 * cA / n, r2 * cB / n, r2 * cA / n], x2 = 0;
    for (var i = 0; i < 4; i++) x2 += (obs[i] - exp[i]) * (obs[i] - exp[i]) / exp[i];
    return x2;
  }

  function summarize(samples, res) {
    var rows = { 1: [0, 0, 0, 0], 2: [0, 0, 0, 0], all: [0, 0, 0, 0] };   // AA, AB, BB, no-call
    var wrong = 0, called = 0, wrongByTrue = [0, 0, 0];
    samples.forEach(function (s, i) {
      var c = res.calls[i].call, k = c < 0 ? 3 : c;
      rows[s.batch][k]++; rows.all[k]++;
      if (c >= 0) { called++; if (c !== s.g) { wrong++; wrongByTrue[s.g]++; } }
    });
    function freqB(r) { var n = r[0] + r[1] + r[2]; return n ? (2 * r[2] + r[1]) / (2 * n) : NaN; }
    var a = rows.all;
    var out = {
      rows: rows, called: called, wrong: wrong, wrongByTrue: wrongByTrue,
      freq: { 1: freqB(rows[1]), 2: freqB(rows[2]), all: freqB(a) },
      callRate: {
        1: 1 - rows[1][3] / (N / 2), 2: 1 - rows[2][3] / (N / 2), all: 1 - a[3] / N
      },
      hweExact: hweExact(a[0], a[1], a[2]),
      hweChi2: hweChi(a[0], a[1], a[2])
    };
    var r1 = rows[1], r2 = rows[2];
    out.batchChi2 = batchFreqTest(2 * r1[2] + r1[1], 2 * r1[0] + r1[1], 2 * r2[2] + r2[1], 2 * r2[0] + r2[1]);
    return out;
  }

  function formatP(p, log10p) {
    if (p != null && isFinite(p) && p >= 0.001) return p >= 0.995 ? "1.00" : p.toPrecision(2);
    var l = (p != null && isFinite(p) && p > 0) ? Math.log10(p) : log10p;
    if (l == null || !isFinite(l)) return "—";
    if (l < -300) return "&lt; 10<sup>−300</sup>";
    var e = Math.floor(l), m = Math.pow(10, l - e);
    if (m >= 9.95) { m = 1; e += 1; }
    return m.toFixed(1) + " × 10<sup>" + (e < 0 ? "−" + (-e) : e) + "</sup>";
  }

  var CORE = { mulberry32: mulberry32, simulate: simulate, callAll: callAll, kmeans3: kmeans3,
               noCallIntervals: noCallIntervals, hweExact: hweExact, hweChi: hweChi, chi1Log10P: chi1Log10P,
               batchFreqTest: batchFreqTest, summarize: summarize, formatP: formatP, N: N, SHIFT: SHIFT };
  if (typeof module !== "undefined" && module.exports) module.exports = CORE;
  if (typeof document === "undefined") return;

  /* ------------------------------------------------------------------ DOM */

  var SVGNS = "http://www.w3.org/2000/svg";
  function svgEl(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function svgText(parent, x, y, txt, cls, extra) {
    var a = { x: x, y: y, "class": cls || "t-sm" };
    if (extra) for (var k in extra) a[k] = extra[k];
    var t = svgEl("text", a, parent);
    t.textContent = txt;
    return t;
  }
  function h(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function pct(x, d) { return isFinite(x) ? (100 * x).toFixed(d == null ? 1 : d) + "%" : "—"; }

  var GCOL = ["var(--q1)", "var(--q6)", "var(--q4)"];       // AA blue, AB yellow, BB red
  var GSTROKE = ["var(--q1)", "var(--q8)", "var(--q4)"];
  var BCOL = { 1: "var(--q5)", 2: "var(--q7)" };
  var GNAME = ["AA", "AB", "BB"];

  function init() {
    var root = document.getElementById("w-calling");
    if (!root) return;
    var body = root.querySelector(".widget-body");
    if (!body) return;
    body.innerHTML = "";

    var state = { seed: 20261021, draws: 0, threshold: 0.75, shift: false, color: "call" };
    var samples = simulate(state.seed);

    /* controls */
    var ctl = h("div", { "class": "controls s2g-ctl" });
    var lt = h("label", null, "Confidence needed for a call ");
    var tIn = h("input", { type: "range", min: "0.5", max: "0.95", step: "0.01", value: String(state.threshold),
                           id: "calling-threshold", "aria-label": "confidence threshold for making a genotype call" });
    var tOut = h("output", { "class": "s2g-val", "for": "calling-threshold" }, "");
    lt.appendChild(tIn); lt.appendChild(tOut);
    ctl.appendChild(lt);
    var ls = h("label", null, "");
    var sIn = h("input", { type: "checkbox", id: "calling-shift" });
    ls.appendChild(sIn);
    ls.appendChild(document.createTextNode(" Batch effect: batch 2’s allele-B signal 65% weaker"));
    ctl.appendChild(ls);
    body.appendChild(ctl);

    var ctl2 = h("div", { "class": "controls s2g-ctl" });
    var fs = h("fieldset", { "class": "s2g-radio" });
    fs.appendChild(h("legend", null, "Color points by"));
    var colorInputs = {};
    [["call", "genotype call"], ["truth", "true genotype"], ["batch", "batch"]].forEach(function (o) {
      var l = h("label", null, "");
      var r = h("input", { type: "radio", name: "calling-color", value: o[0], id: "calling-color-" + o[0] });
      if (o[0] === state.color) r.checked = true;
      l.appendChild(r); l.appendChild(document.createTextNode(" " + o[1]));
      fs.appendChild(l); colorInputs[o[0]] = r;
    });
    ctl2.appendChild(fs);
    var reBtn = h("button", { "class": "btn", type: "button", id: "calling-resample" }, "New simulated sample");
    ctl2.appendChild(reBtn);
    body.appendChild(ctl2);

    var grid = h("div", { "class": "s2g-wgrid" });
    body.appendChild(grid);
    var plotBox = h("div", { "class": "s2g-plot" });
    grid.appendChild(plotBox);
    var W = 400, H = 392, M = { l: 50, r: 12, t: 14, b: 44 }, MAXV = 1.6;
    var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-labelledby": "calling-svg-t", "class": "s2g-wsvg" });
    svgEl("title", { id: "calling-svg-t" }, svg).textContent =
      "Cluster plot: allele A signal on the horizontal axis, allele B signal on the vertical axis, one point per simulated sample, colored by genotype call; hatched wedges are no-call zones.";
    plotBox.appendChild(svg);
    var legend = h("div", { "class": "s2g-legend", "aria-hidden": "true" });
    plotBox.appendChild(legend);

    var side = h("div", { "class": "s2g-side" });
    grid.appendChild(side);
    var out = h("div", { "class": "readout s2g-readout", "aria-live": "polite" });
    side.appendChild(out);
    side.appendChild(h("p", { "class": "note" },
      "<strong>Caller rule.</strong> The caller uses the angle of each point (the share of the signal that comes from allele B), because total brightness varies between samples. Three cluster centers are found from all 500 samples together (k-means). Each sample gets the genotype of the nearest center, with confidence d₂ / (d₁ + d₂): 0.5 means halfway between two centers, 1 means on a center. Below the threshold, or with a total signal under 30% of the median, the genotype is a no-call. Simulated data: 500 people, freq(B) = 0.30, two batches of 250."));

    /* defs: hatch pattern */
    var defs = svgEl("defs", null, svg);
    var pat = svgEl("pattern", { id: "calling-hatch", width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
    svgEl("rect", { width: 6, height: 6, fill: "var(--gmiss)" }, pat);
    svgEl("line", { x1: 0, y1: 0, x2: 0, y2: 6, stroke: "var(--border-strong)", "stroke-width": 2 }, pat);

    var PW = W - M.l - M.r, PH = H - M.t - M.b;
    function X(v) { return M.l + v / MAXV * PW; }
    function Y(v) { return M.t + PH - v / MAXV * PH; }

    var gZones = svgEl("g", null, svg);
    var gAxes = svgEl("g", null, svg);
    var gRays = svgEl("g", null, svg);
    var gPts = svgEl("g", null, svg);
    var gLabs = svgEl("g", null, svg);

    (function drawAxes() {
      svgEl("rect", { x: M.l, y: M.t, width: PW, height: PH, fill: "none", stroke: "var(--border)" }, gAxes);
      [0, 0.5, 1, 1.5].forEach(function (v) {
        svgEl("line", { x1: X(v), x2: X(v), y1: M.t + PH, y2: M.t + PH + 4, stroke: "var(--fg-faint)" }, gAxes);
        svgText(gAxes, X(v), M.t + PH + 16, v === 0 ? "0" : v.toFixed(1), "t-sm", { "text-anchor": "middle" });
        svgEl("line", { x1: M.l - 4, x2: M.l, y1: Y(v), y2: Y(v), stroke: "var(--fg-faint)" }, gAxes);
        svgText(gAxes, M.l - 7, Y(v) + 4, v === 0 ? "0" : v.toFixed(1), "t-sm", { "text-anchor": "end" });
      });
      svgText(gAxes, M.l + PW / 2, H - 6, "allele A signal (dye 1)", "t", { "text-anchor": "middle" });
      var yc = M.t + PH / 2;
      svgText(gAxes, 14, yc, "allele B signal (dye 2)", "t", { "text-anchor": "middle", transform: "rotate(-90 14 " + yc + ")" });
    })();

    function clear(g) { while (g.firstChild) g.removeChild(g.firstChild); }

    function wedge(t0, t1) {
      var r = MAXV * 1.5, d = "M" + X(0) + "," + Y(0);
      var steps = 24;
      for (var i = 0; i <= steps; i++) {
        var a = (t0 + (t1 - t0) * i / steps) * Math.PI / 2;
        var vx = Math.min(MAXV, r * Math.cos(a)), vy = Math.min(MAXV, r * Math.sin(a));
        // project to the square boundary along the ray
        var ca = Math.cos(a), sa = Math.sin(a), s = Math.min(ca > 1e-9 ? MAXV / ca : Infinity, sa > 1e-9 ? MAXV / sa : Infinity);
        vx = s * ca; vy = s * sa;
        d += "L" + X(vx).toFixed(1) + "," + Y(vy).toFixed(1);
      }
      return d + "Z";
    }

    var res, sum;
    function render() {
      res = callAll(samples, state.threshold, state.shift);
      sum = summarize(samples, res);
      tOut.textContent = state.threshold.toFixed(2);

      /* zones */
      clear(gZones);
      noCallIntervals(res.centers, state.threshold).forEach(function (iv) {
        svgEl("path", { d: wedge(iv[0], iv[1]), fill: "url(#calling-hatch)", stroke: "var(--border-strong)", "stroke-width": 0.8 }, gZones);
      });
      var f = res.floor;
      svgEl("path", { d: "M" + X(0) + "," + Y(0) + "L" + X(f) + "," + Y(0) + "L" + X(0) + "," + Y(f) + "Z",
                      fill: "url(#calling-hatch)", stroke: "var(--border-strong)", "stroke-width": 0.8 }, gZones);

      /* center rays (labels drawn after the points, with a halo, so they stay legible) */
      clear(gRays); clear(gLabs);
      res.centers.forEach(function (c, k) {
        var a = c * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
        var s = Math.min(ca > 1e-9 ? MAXV / ca : Infinity, sa > 1e-9 ? MAXV / sa : Infinity) * 0.97;
        svgEl("line", { x1: X(0), y1: Y(0), x2: X(s * ca), y2: Y(s * sa), stroke: "var(--fg-muted)", "stroke-dasharray": "3 4", "stroke-width": 1 }, gRays);
        var lx = X(s * ca * 0.93), ly = Y(s * sa * 0.93);
        if (k === 0) { lx = X(MAXV) - 4; ly = Y(0.26); }          // above the AA cluster, which lies along this ray
        var lab = svgText(gLabs, lx + (k === 2 ? 14 : 0), ly + (k === 0 ? 0 : (k === 2 ? 4 : -6)), GNAME[k] + " center", "t-b", { "text-anchor": k === 2 ? "start" : "end" });
        lab.style.fill = "var(--fg)";
        lab.style.stroke = "var(--bg)"; lab.style.strokeWidth = "3px"; lab.style.strokeLinejoin = "round";
        lab.setAttribute("paint-order", "stroke");
      });

      /* points */
      clear(gPts);
      samples.forEach(function (s, i) {
        var c = res.calls[i], x = X(Math.min(c.A, MAXV)), y = Y(Math.min(c.B, MAXV));
        var fill, stroke, nc = c.call < 0;
        if (state.color === "call") {
          fill = nc ? "var(--bg)" : GCOL[c.call]; stroke = nc ? "var(--fg)" : GSTROKE[c.call];
        } else if (state.color === "truth") {
          fill = GCOL[s.g]; stroke = nc ? "var(--fg)" : GSTROKE[s.g];
        } else {
          fill = BCOL[s.batch]; stroke = nc ? "var(--fg)" : BCOL[s.batch];
        }
        svgEl("circle", { cx: x.toFixed(1), cy: y.toFixed(1), r: nc ? 3.6 : 3.2, fill: fill, stroke: stroke,
                          "stroke-width": nc ? 1.4 : 0.8, "fill-opacity": nc && state.color === "call" ? 1 : 0.85 }, gPts);
        if (nc && state.color === "call") {
          svgEl("path", { d: "M" + (x - 2) + "," + (y - 2) + "L" + (x + 2) + "," + (y + 2) + "M" + (x - 2) + "," + (y + 2) + "L" + (x + 2) + "," + (y - 2),
                          stroke: "var(--fg)", "stroke-width": 1 }, gPts);
        }
      });

      /* legend */
      var items;
      if (state.color === "call") items = [[GCOL[0], GSTROKE[0], "called AA"], [GCOL[1], GSTROKE[1], "called AB"], [GCOL[2], GSTROKE[2], "called BB"], ["var(--bg)", "var(--fg)", "no-call ×"]];
      else if (state.color === "truth") items = [[GCOL[0], GSTROKE[0], "truly AA"], [GCOL[1], GSTROKE[1], "truly AB"], [GCOL[2], GSTROKE[2], "truly BB"], ["var(--bg)", "var(--fg)", "dark ring = no-call"]];
      else items = [[BCOL[1], BCOL[1], "batch 1"], [BCOL[2], BCOL[2], "batch 2"], ["var(--bg)", "var(--fg)", "dark ring = no-call"]];
      legend.innerHTML = items.map(function (it) {
        return '<span><i style="background:' + it[0] + ';border-color:' + it[1] + '"></i>' + it[2] + "</span>";
      }).join("") + '<span><i class="s2g-hatch"></i>no-call zone</span>';

      /* readout */
      var r = sum.rows;
      function row(lab, key, n) {
        var x = r[key];
        return "<tr><th>" + lab + "</th><td>" + x[0] + "</td><td>" + x[1] + "</td><td>" + x[2] + "</td><td>" + x[3] +
          "</td><td>" + pct(sum.callRate[key]) + "</td><td>" + (isFinite(sum.freq[key]) ? sum.freq[key].toFixed(3) : "—") + "</td></tr>";
      }
      var hweP = sum.hweExact, x2 = sum.hweChi2, bx2 = sum.batchChi2;
      var html = '<table class="s2g-t"><thead><tr><th></th><th>AA</th><th>AB</th><th>BB</th><th>no-call</th><th>call rate</th><th>freq(B)</th></tr></thead><tbody>' +
        row("batch 1", 1) + row("batch 2", 2) + row("all", "all") + "</tbody></table>" +
        "<div>Hardy–Weinberg test on the calls: <span class=\"nw\">exact p = " + formatP(hweP, null) + "</span>" +
        (isFinite(x2) ? ' <span class="nw">(χ² = ' + (x2 < 100 ? x2.toFixed(1) : x2.toFixed(0)) + ", 1 df)</span>" : "") + "</div>" +
        "<div>Batch 1 vs batch 2 allele frequency: <span class=\"nw\">χ² = " + (isFinite(bx2) ? (bx2 < 100 ? bx2.toFixed(1) : bx2.toFixed(0)) : "—") +
        ",</span> <span class=\"nw\">p = " + formatP(isFinite(bx2) ? Math.pow(10, chi1Log10P(bx2)) : NaN, chi1Log10P(bx2)) + "</span></div>" +
        "<div>Wrong calls (checked against the simulated truth): " + sum.wrong + " of " + sum.called + " calls (" + pct(sum.called ? sum.wrong / sum.called : NaN, 1) + ")</div>";
      out.innerHTML = html;
    }

    tIn.addEventListener("input", function () { state.threshold = Number(tIn.value); render(); });
    sIn.addEventListener("change", function () { state.shift = sIn.checked; render(); });
    Object.keys(colorInputs).forEach(function (k) {
      colorInputs[k].addEventListener("change", function () { if (colorInputs[k].checked) { state.color = k; render(); } });
    });
    reBtn.addEventListener("click", function () {
      state.draws += 1;
      samples = simulate(state.seed + 7919 * state.draws);
      render();
    });
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
