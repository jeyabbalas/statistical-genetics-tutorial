/* gwas-analysis-stratification.js — confounding by ancestry and its correction with a principal component
   (page gwas-analysis, widget #w-stratification).

   Simulated study: N people from two populations, A and B (a share w from B). M = 1,000 SNPs, none of which
   affects the trait. Allele frequencies differ between the populations by drift (Balding–Nichols model):
     p ~ Uniform(0.05, 0.5) ancestral frequency;  p_A, p_B ~ Beta(p(1 − F)/F, (1 − p)(1 − F)/F)
   so F (the fixation index F_ST) sets how different the populations are. Genotypes g ~ Binomial(2, p_pop).
   The trait differs between populations for a non-genetic reason:  y = δ · [person is in B] + e,  e ~ Normal(0, 1).
   Each SNP is tested twice:
     unadjusted:   y = a + b g + error                       (least squares; z = b̂ / SE)
     PC-adjusted:  y = a + b g + c PC1 + error               (same, after removing PC1 from y and g)
   PC1 is the first principal component of the standardized genotype matrix (power iteration).
   Summary: λ_GC = median(z²) / 0.4549 (0.4549 = median of a chi-square with 1 degree of freedom).
   Theory for the unadjusted test (large N): mean z² ≈ 1 + N · 4F [w(1 − w)]² δ² / (1 + w(1 − w) δ²).
   All data are simulated with a seeded generator (mulberry32). */
(function () {
  "use strict";

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function normalGen(rand) {
    var spare = null;
    return function () {
      if (spare !== null) { var s = spare; spare = null; return s; }
      var u, v, r;
      do { u = 2 * rand() - 1; v = 2 * rand() - 1; r = u * u + v * v; } while (r >= 1 || r === 0);
      var m = Math.sqrt(-2 * Math.log(r) / r);
      spare = v * m; return u * m;
    };
  }
  /* Gamma(shape a, scale 1) by Marsaglia–Tsang; shape < 1 handled by boosting. */
  function gammaGen(rand, rn) {
    return function g(a) {
      if (a < 1) { var u = rand(); return g(a + 1) * Math.pow(u, 1 / a); }
      var d = a - 1 / 3, c = 1 / Math.sqrt(9 * d);
      for (;;) {
        var x, v;
        do { x = rn(); v = 1 + c * x; } while (v <= 0);
        v = v * v * v;
        var u2 = rand();
        if (u2 < 1 - 0.0331 * x * x * x * x) return d * v;
        if (Math.log(u2) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
      }
    };
  }
  function betaDraw(gam, a, b) { var x = gam(a), y = gam(b); return x / (x + y); }

  var M = 1000;
  /* Genotypes (Int8Array, person-major N×M), population labels and PC1. */
  function simulateGenotypes(N, w, F, seed) {
    var rnd = mulberry32(seed), rn = normalGen(rnd), gam = gammaGen(rnd, rn);
    var pop = new Uint8Array(N), G = new Int8Array(N * M), pA = new Float64Array(M), pB = new Float64Array(M);
    var nB = Math.round(w * N);
    for (var i = 0; i < N; i++) pop[i] = i < nB ? 1 : 0;
    for (var j = 0; j < M; j++) {
      var p = 0.05 + 0.45 * rnd();
      if (F > 1e-6) {
        var s = (1 - F) / F;
        pA[j] = betaDraw(gam, p * s, (1 - p) * s);
        pB[j] = betaDraw(gam, p * s, (1 - p) * s);
      } else { pA[j] = p; pB[j] = p; }
    }
    for (var i2 = 0; i2 < N; i2++) {
      var row = i2 * M, pp = pop[i2] ? pB : pA;
      for (var j2 = 0; j2 < M; j2++) G[row + j2] = (rnd() < pp[j2] ? 1 : 0) + (rnd() < pp[j2] ? 1 : 0);
    }
    return { N: N, pop: pop, G: G, pc1: pc1(G, N, seed + 7) };
  }
  /* First principal component of the standardized genotype matrix, by power iteration on X Xᵀ. */
  function pc1(G, N, seed) {
    var mean = new Float64Array(M), sd = new Float64Array(M);
    for (var j = 0; j < M; j++) {
      var s = 0;
      for (var i = 0; i < N; i++) s += G[i * M + j];
      var p = s / (2 * N);
      mean[j] = 2 * p; sd[j] = Math.sqrt(Math.max(2 * p * (1 - p), 1e-9));
    }
    var rnd = mulberry32(seed), v = new Float64Array(N), u = new Float64Array(M);
    for (var i0 = 0; i0 < N; i0++) v[i0] = rnd() - 0.5;
    for (var it = 0; it < 40; it++) {
      u.fill(0);
      for (var i1 = 0; i1 < N; i1++) {
        var vi = v[i1], row = i1 * M;
        if (vi === 0) continue;
        for (var j1 = 0; j1 < M; j1++) u[j1] += vi * (G[row + j1] - mean[j1]) / sd[j1];
      }
      var nv = 0, prev = v.slice();
      for (var i2 = 0; i2 < N; i2++) {
        var row2 = i2 * M, acc = 0;
        for (var j2 = 0; j2 < M; j2++) acc += (G[row2 + j2] - mean[j2]) / sd[j2] * u[j2];
        v[i2] = acc; nv += acc * acc;
      }
      nv = Math.sqrt(nv);
      var diff = 0;
      for (var i3 = 0; i3 < N; i3++) { v[i3] /= nv; diff += Math.abs(v[i3] - prev[i3]); }
      if (diff < 1e-7 * N) break;
    }
    return v;
  }
  function simulateTrait(geno, delta, seed) {
    var rn = normalGen(mulberry32(seed)), y = new Float64Array(geno.N);
    for (var i = 0; i < geno.N; i++) y[i] = delta * geno.pop[i] + rn();
    return y;
  }
  /* z statistics for all SNPs, unadjusted and adjusted for PC1 (Frisch–Waugh–Lovell residualization). */
  function scan(geno, y) {
    var N = geno.N, G = geno.G, v = geno.pc1, i, j;
    var my = 0, mv = 0;
    for (i = 0; i < N; i++) { my += y[i]; mv += v[i]; }
    my /= N; mv /= N;
    var vc = new Float64Array(N), yc = new Float64Array(N), Svv = 0, Svy = 0;
    for (i = 0; i < N; i++) { vc[i] = v[i] - mv; yc[i] = y[i] - my; Svv += vc[i] * vc[i]; Svy += vc[i] * yc[i]; }
    var gy = Svy / Svv, yr = new Float64Array(N), Syy = 0, Syyr = 0;
    for (i = 0; i < N; i++) { yr[i] = yc[i] - gy * vc[i]; Syy += yc[i] * yc[i]; Syyr += yr[i] * yr[i]; }
    var z0 = new Float64Array(M), z1 = new Float64Array(M);
    var sg = new Float64Array(M), sgv = new Float64Array(M), sgy = new Float64Array(M), sgg = new Float64Array(M);
    for (i = 0; i < N; i++) {
      var row = i * M, vci = vc[i], yci = yc[i];
      for (j = 0; j < M; j++) { var g = G[row + j]; sg[j] += g; sgv[j] += g * vci; sgy[j] += g * yci; sgg[j] += g * g; }
    }
    for (j = 0; j < M; j++) {
      var Sgg = sgg[j] - sg[j] * sg[j] / N, Sgy = sgy[j]; // yc has mean 0, so Σ(g − ḡ) yc = Σ g yc
      if (Sgg < 1e-9) { z0[j] = 0; z1[j] = 0; continue; }
      var b = Sgy / Sgg, rss = Syy - b * Sgy, se = Math.sqrt(rss / (N - 2) / Sgg);
      z0[j] = b / se;
      var a = sgv[j] / Svv; // regression of g on PC1
      var Sgr = Sgg - a * sgv[j];        // Σ (g residual)²
      var Sgry = Sgy - a * Svy;          // Σ g_res · y_res (y_res = yc − gy·vc; the other cross terms cancel)
      var b1 = Sgry / Sgr, rss1 = Syyr - b1 * Sgry, se1 = Math.sqrt(rss1 / (N - 3) / Sgr);
      z1[j] = b1 / se1;
    }
    return { z0: z0, z1: z1 };
  }
  function median(arr) { var a = Array.prototype.slice.call(arr).sort(function (x, y) { return x - y; }); var n = a.length; return n % 2 ? a[(n - 1) / 2] : 0.5 * (a[n / 2 - 1] + a[n / 2]); }
  function lambdaGC(z) { var c = Array.prototype.map.call(z, function (x) { return x * x; }); return median(c) / 0.4549364231; }
  function theoryMeanChi2(N, w, F, delta) { var h = w * (1 - w); return 1 + N * 4 * F * h * h * delta * delta / (1 + h * delta * delta); }

  /* two-sided p-value as log10, normal approximation (erfc with continued fraction for large z) */
  function log10P(z) {
    var x = Math.abs(z) / Math.SQRT2;
    if (x < 2) {
      var sum = x, term = x, x2 = x * x;
      for (var n = 1; n < 200; n++) { term *= -x2 / n; var add = term / (2 * n + 1); sum += add; if (Math.abs(add) < 1e-17 * Math.abs(sum)) break; }
      return Math.log10(1 - 2 / Math.sqrt(Math.PI) * sum);
    }
    var tiny = 1e-300, f = x, C = x, D = 0;
    for (var k = 1; k < 500; k++) { var a = k / 2; D = x + a * D; if (Math.abs(D) < tiny) D = tiny; D = 1 / D; C = x + a / C; if (Math.abs(C) < tiny) C = tiny; var dl = C * D; f *= dl; if (Math.abs(dl - 1) < 1e-16) break; }
    return (-x * x - 0.5 * Math.log(Math.PI) - Math.log(f)) / Math.LN10;
  }

  var api = { mulberry32: mulberry32, simulateGenotypes: simulateGenotypes, simulateTrait: simulateTrait, scan: scan, lambdaGC: lambdaGC,
    theoryMeanChi2: theoryMeanChi2, log10P: log10P, median: median, M: M };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  /* ---------- user interface ---------- */
  var NS = "http://www.w3.org/2000/svg";
  function S(tag, attrs, parent, text) {
    var n = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k) && attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function H(tag, attrs, parent, html) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
    if (html != null) n.innerHTML = html;
    if (parent) parent.appendChild(n);
    return n;
  }
  function fmtInt(x) { return Math.round(x).toLocaleString("en-US"); }

  var root = document.getElementById("w-stratification");
  if (!root) return;
  var body = root.querySelector(".widget-body");
  if (!body) return;

  var st = { N: 1000, w: 0.5, F: 0.02, delta: 0.5, seed: 6 };
  var c1 = H("div", { "class": "controls" }, body);
  function slider(parent, label, min, max, step, value, id) {
    var lab = H("label", { "for": id }, parent);
    H("span", null, lab, label);
    var inp = H("input", { type: "range", id: id, min: min, max: max, step: step, value: value }, lab);
    var out = H("output", { "for": id }, lab);
    return { input: inp, out: out };
  }
  var sF = slider(c1, "Allele-frequency difference F<sub>ST</sub>", 0, 0.1, 0.001, st.F, "st-f");
  var sD = slider(c1, "Trait difference between populations δ (SD)", 0, 1, 0.05, st.delta, "st-d");
  var c2 = H("div", { "class": "controls" }, body);
  var sW = slider(c2, "Share from population B", 0.05, 0.95, 0.05, st.w, "st-w");
  var lN = H("label", { "for": "st-n" }, c2); H("span", null, lN, "People N");
  var selN = H("select", { id: "st-n" }, lN);
  [500, 1000, 2000].forEach(function (n) { var o = H("option", { value: n }, selN, fmtInt(n)); if (n === st.N) o.selected = true; });
  var bNew = H("button", { type: "button", "class": "btn" }, c2, "New simulation");
  var chart = H("div", { "class": "st-chart" }, body);
  var readout = H("div", { "class": "readout", "aria-live": "polite" }, body);
  H("p", { "class": "note" }, body, "Simulated data (seeded): 1,000 SNPs, none of which affects the trait. Every association in the unadjusted scan is a false positive created by the two populations differing both in allele frequencies and in mean trait value.");

  var cacheKey = "", geno = null;
  var raf = 0;
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }

  function draw() {
    sF.out.textContent = st.F.toFixed(3);
    sD.out.textContent = st.delta.toFixed(2);
    sW.out.textContent = st.w.toFixed(2);
    var key = st.N + "|" + st.w + "|" + st.F + "|" + st.seed;
    if (key !== cacheKey) { cacheKey = key; geno = simulateGenotypes(st.N, st.w, st.F, 4000 + st.seed); }
    var y = simulateTrait(geno, st.delta, 9000 + st.seed);
    var res = scan(geno, y);
    var l0 = lambdaGC(res.z0), l1 = lambdaGC(res.z1);
    var lp0 = Array.prototype.map.call(res.z0, function (z) { return -log10P(z); }).sort(function (a, b) { return b - a; });
    var lp1 = Array.prototype.map.call(res.z1, function (z) { return -log10P(z); }).sort(function (a, b) { return b - a; });
    var mean0 = 0; for (var j = 0; j < M; j++) mean0 += res.z0[j] * res.z0[j]; mean0 /= M;
    var gws0 = 0, gws1 = 0, nom0 = 0, nom1 = 0;
    for (var k = 0; k < M; k++) { if (lp0[k] > 7.30103) gws0++; if (lp1[k] > 7.30103) gws1++; if (lp0[k] > 1.30103) nom0++; if (lp1[k] > 1.30103) nom1++; }

    var W = Math.max(290, Math.floor(chart.clientWidth || body.clientWidth || 640));
    var narrow = W < 560;
    var qW = narrow ? W : Math.floor(W * 0.56), qH = narrow ? 270 : 300;
    var hW = narrow ? W : W - qW - 16, hH = narrow ? 170 : 300;
    var totH = narrow ? qH + hH + 12 : qH;
    chart.innerHTML = "";
    var svg = S("svg", { width: W, height: totH, viewBox: "0 0 " + W + " " + totH, role: "img",
      "aria-label": "Q–Q plot of 1,000 null SNPs before and after adjusting for the first principal component, with genomic inflation factors " + l0.toFixed(2) + " and " + l1.toFixed(2) + ", and a histogram of PC1 by population." }, chart);
    // --- QQ plot
    var m = { l: 44, r: 10, t: 12, b: 40 }, pw = qW - m.l - m.r, ph = qH - m.t - m.b;
    var xmax = -Math.log10(0.5 / M) + 0.1, ymaxRaw = Math.max(lp0[0], lp1[0], xmax);
    var ymax = ymaxRaw <= 6 ? 6 : ymaxRaw <= 10 ? 10 : ymaxRaw <= 20 ? 20 : ymaxRaw <= 40 ? 40 : Math.ceil(ymaxRaw / 20) * 20;
    var X = function (v) { return m.l + pw * v / xmax; }, Y = function (v) { return m.t + ph * (1 - Math.min(v, ymax) / ymax); };
    var g0 = S("g", null, svg);
    for (var t = 0; t <= 3; t++) {
      S("line", { x1: X(t), x2: X(t), y1: m.t, y2: m.t + ph, stroke: "#eef1f4" }, g0);
      S("text", { x: X(t), y: m.t + ph + 15, "text-anchor": "middle", "class": "t-sm" }, g0, String(t));
    }
    var ystep = ymax <= 6 ? 1 : ymax <= 10 ? 2 : ymax <= 20 ? 5 : ymax <= 40 ? 10 : 20;
    for (var yv = 0; yv <= ymax + 1e-9; yv += ystep) {
      S("line", { x1: m.l, x2: m.l + pw, y1: Y(yv), y2: Y(yv), stroke: "#eef1f4" }, g0);
      S("text", { x: m.l - 6, y: Y(yv) + 4, "text-anchor": "end", "class": "t-sm" }, g0, String(yv));
    }
    S("text", { x: m.l + pw / 2, y: qH - 6, "text-anchor": "middle", "class": "t-sm" }, g0, "expected −log10 p");
    S("text", { x: 12, y: m.t + ph / 2, "text-anchor": "middle", "class": "t-sm", transform: "rotate(-90 12 " + (m.t + ph / 2) + ")" }, g0, "observed −log10 p");
    S("line", { x1: X(0), y1: Y(0), x2: X(xmax), y2: Y(xmax), stroke: "#1d2127", "stroke-dasharray": "4 3" }, g0);
    if (7.30103 < ymax) {
      S("line", { x1: m.l, x2: m.l + pw, y1: Y(7.30103), y2: Y(7.30103), stroke: "#b42318", "stroke-dasharray": "2 3" }, g0);
      S("text", { x: m.l + 4, y: Y(7.30103) - 4, "class": "t-xs", style: "fill:#b42318" }, g0, "5×10⁻⁸");
    }
    [[lp0, "#f28e2b"], [lp1, "#1f5a96"]].forEach(function (ser) {
      var gg = S("g", { fill: ser[1] }, g0);
      for (var i = 0; i < M; i++) {
        var ex = -Math.log10((i + 0.5) / M);
        S("circle", { cx: X(ex), cy: Y(ser[0][i]), r: 2.4, opacity: 0.8 }, gg);
      }
    });
    // legend inside the QQ plot (top left)
    var lgY = m.t + 14;
    S("circle", { cx: m.l + 10, cy: lgY - 4, r: 4, fill: "#f28e2b" }, g0);
    S("text", { x: m.l + 18, y: lgY, "class": "t-sm", style: "fill:#1d2127" }, g0, "unadjusted, λ = " + l0.toFixed(2));
    S("circle", { cx: m.l + 10, cy: lgY + 14, r: 4, fill: "#1f5a96" }, g0);
    S("text", { x: m.l + 18, y: lgY + 18, "class": "t-sm", style: "fill:#1d2127" }, g0, "adjusted for PC1, λ = " + l1.toFixed(2));
    // --- PC1 histogram by population
    var hx0 = narrow ? 0 : qW + 16, hy0 = narrow ? qH + 12 : 0;
    var hm = { l: 12, r: 10, t: 22, b: 36 }, hpw = hW - hm.l - hm.r, hph = hH - hm.t - hm.b;
    var g1 = S("g", { transform: "translate(" + hx0 + " " + hy0 + ")" }, svg);
    var v = geno.pc1, vmin = Infinity, vmax = -Infinity;
    for (var i2 = 0; i2 < v.length; i2++) { if (v[i2] < vmin) vmin = v[i2]; if (v[i2] > vmax) vmax = v[i2]; }
    var nb = 30, wbin = (vmax - vmin) / nb || 1, hA = new Array(nb).fill(0), hB = new Array(nb).fill(0);
    for (var i3 = 0; i3 < v.length; i3++) { var b = Math.min(nb - 1, Math.floor((v[i3] - vmin) / wbin)); if (geno.pop[i3]) hB[b]++; else hA[b]++; }
    var hmax = Math.max.apply(null, hA.concat(hB)) || 1;
    S("text", { x: hm.l, y: 14, "class": "t-sm", style: "fill:#1d2127;font-weight:700" }, g1, "PC1 of the genotypes, by population");
    for (var b2 = 0; b2 < nb; b2++) {
      var bx = hm.l + hpw * b2 / nb, bw = hpw / nb - 1;
      if (hA[b2]) S("rect", { x: bx, y: hm.t + hph * (1 - hA[b2] / hmax), width: bw, height: hph * hA[b2] / hmax, fill: "#59a14f", opacity: 0.65 }, g1);
      if (hB[b2]) S("rect", { x: bx, y: hm.t + hph * (1 - hB[b2] / hmax), width: bw, height: hph * hB[b2] / hmax, fill: "#b07aa1", opacity: 0.65 }, g1);
    }
    S("line", { x1: hm.l, x2: hm.l + hpw, y1: hm.t + hph, y2: hm.t + hph, stroke: "#b9c1cc" }, g1);
    S("text", { x: hm.l + hpw / 2, y: hH - 20, "text-anchor": "middle", "class": "t-sm" }, g1, "PC1 score (one bar = a range of scores)");
    S("rect", { x: hm.l, y: hH - 13, width: 10, height: 10, fill: "#59a14f", opacity: 0.65 }, g1);
    S("text", { x: hm.l + 14, y: hH - 4, "class": "t-sm" }, g1, "population A");
    S("rect", { x: hm.l + 104, y: hH - 13, width: 10, height: 10, fill: "#b07aa1", opacity: 0.65 }, g1);
    S("text", { x: hm.l + 118, y: hH - 4, "class": "t-sm" }, g1, "population B");

    readout.innerHTML =
      "<div>Unadjusted: λ = " + l0.toFixed(2) + ", mean z² = " + mean0.toFixed(2) + " (theory ≈ " + theoryMeanChi2(st.N, st.w, st.F, st.delta).toFixed(2) + "), " +
      fmtInt(nom0) + " SNPs with p < 0.05 (≈ 50 expected by chance), " + gws0 + " with p < 5×10⁻⁸</div>" +
      "<div>Adjusted for PC1: λ = " + l1.toFixed(2) + ", " + fmtInt(nom1) + " SNPs with p < 0.05, " + gws1 + " with p < 5×10⁻⁸</div>";
  }

  sF.input.addEventListener("input", function () { st.F = +sF.input.value; schedule(); });
  sD.input.addEventListener("input", function () { st.delta = +sD.input.value; schedule(); });
  sW.input.addEventListener("input", function () { st.w = +sW.input.value; schedule(); });
  selN.addEventListener("change", function () { st.N = +selN.value; schedule(); });
  bNew.addEventListener("click", function () { st.seed++; schedule(); });
  var lastW = 0;
  function onResize() { var w = chart.clientWidth; if (w !== lastW) { lastW = w; schedule(); } }
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(onResize).observe(chart);
  else window.addEventListener("resize", onResize);
  draw();
})();
