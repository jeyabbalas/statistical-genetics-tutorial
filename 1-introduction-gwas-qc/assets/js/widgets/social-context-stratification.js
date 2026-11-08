/* Stratification simulator (social-context.html, #w-strat).
   Two regions, A and B, with n/2 people each. M SNPs with no effect on the trait.
   Allele frequencies (Balding–Nichols model):
       p    ~ Uniform(0.05, 0.5)                       ancestral frequency of the counted allele
       p_k  ~ Beta(p (1 - F) / F, (1 - p)(1 - F) / F)   frequency in region k = A, B (p_k = p when F = 0)
   so that E[p_k] = p, Var(p_k) = F p (1 - p), and Hudson's FST between the two regions is about F.
   Genotype of person i in region k: g ~ Binomial(2, p_k). Trait: y = delta * [region B] + e, e ~ N(0, 1),
   so the regions differ in mean trait by delta (in units of the within-region SD) for non-genetic reasons.
   Tests for each SNP, as in a GWAS of a quantitative trait (one linear regression per SNP):
       unadjusted:  y on g;            chi2 = (n - 2) r^2 / (1 - r^2), r = correlation of g and y
       adjusted:    y on g and region; same with r computed after subtracting each region's means
   lambda_GC = median(chi2) / 0.4549 (the median of a chi-square with 1 df).
   Expected mean chi2 without adjustment (first-order approximation, equal region sizes):
       E[chi2] ~ 1 + n delta^2 F / (4 + delta^2)
   Data come from a seeded generator (mulberry32), so the first view is the same for everyone. */
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
      var u = 0;
      while (u <= 1e-300) u = rand();
      var v = rand(), r = Math.sqrt(-2 * Math.log(u)), th = 2 * Math.PI * v;
      spare = r * Math.sin(th);
      return r * Math.cos(th);
    };
  }
  /* Gamma(shape, 1) by Marsaglia and Tsang (2000); shape < 1 handled by the boost u^(1/shape). */
  function gammaGen(rand, norm) {
    return function g(shape) {
      if (shape < 1) { var u0 = rand(); while (u0 <= 1e-300) u0 = rand(); return g(shape + 1) * Math.pow(u0, 1 / shape); }
      var d = shape - 1 / 3, c = 1 / Math.sqrt(9 * d);
      for (;;) {
        var x, v;
        do { x = norm(); v = 1 + c * x; } while (v <= 0);
        v = v * v * v;
        var u = rand();
        if (u < 1 - 0.0331 * x * x * x * x) return d * v;
        if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
      }
    };
  }
  function median(arr) {
    var a = Array.prototype.slice.call(arr).sort(function (x, y) { return x - y; });
    var m = a.length >> 1;
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }
  /* -log10 of the upper-tail p-value of a chi-square with 1 df (two-sided normal test). */
  function negLog10P(chi2) {
    if (!(chi2 > 0)) return 0;
    var z = Math.sqrt(chi2);
    if (z < 6) {
      // erfc by the Numerical Recipes Chebyshev fit (relative error < 1.2e-7)
      var x = z / Math.SQRT2, t = 1 / (1 + 0.5 * x);
      var p = t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
        t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
      return -Math.log(p) / Math.LN10;
    }
    // two-sided p = 2 (1 - Phi(z)) ~ 2 phi(z) / z (1 - 1/z^2 + 3/z^4)
    var lnp = Math.log(2) - 0.5 * z * z - 0.5 * Math.log(2 * Math.PI) - Math.log(z) + Math.log(1 - 1 / (z * z) + 3 / Math.pow(z, 4));
    return -lnp / Math.LN10;
  }
  var CHI2_GWS = 29.716785;   // chi-square (1 df) at p = 5e-8

  function simulate(o) {
    var n = o.n, M = o.M || 1000, F = o.F, delta = o.delta;
    var rand = mulberry32(o.seed), norm = normalGen(rand), gam = gammaGen(rand, norm);
    var nA = n >> 1, nB = n - nA;
    var y = new Float64Array(n);
    var SyA = 0, SyB = 0, SyyA = 0, SyyB = 0;
    for (var i = 0; i < n; i++) {
      var v = (i >= nA ? delta : 0) + norm();
      y[i] = v;
      if (i < nA) { SyA += v; SyyA += v * v; } else { SyB += v; SyyB += v * v; }
    }
    var Sy = SyA + SyB, Syy = SyyA + SyyB;
    var chiU = new Float64Array(M), chiA = new Float64Array(M), fdiff = new Float64Array(M);
    for (var j = 0; j < M; j++) {
      var p = 0.05 + 0.45 * rand(), pa = p, pb = p;
      if (F > 0) {
        var a = p * (1 - F) / F, b = (1 - p) * (1 - F) / F;
        var x1 = gam(a), y1 = gam(b); pa = x1 / (x1 + y1);
        var x2 = gam(a), y2 = gam(b); pb = x2 / (x2 + y2);
      }
      fdiff[j] = pb - pa;
      var SgA = 0, SgB = 0, SggA = 0, SggB = 0, SgyA = 0, SgyB = 0;
      for (var k = 0; k < n; k++) {
        var q = k < nA ? pa : pb;
        var g = (rand() < q ? 1 : 0) + (rand() < q ? 1 : 0);
        if (g) {
          if (k < nA) { SgA += g; SggA += g * g; SgyA += g * y[k]; }
          else { SgB += g; SggB += g * g; SgyB += g * y[k]; }
        }
      }
      // unadjusted correlation
      var Sg = SgA + SgB, Sgg = SggA + SggB, Sgy = SgyA + SgyB;
      var cgy = Sgy - Sg * Sy / n, vg = Sgg - Sg * Sg / n, vy = Syy - Sy * Sy / n;
      var r2 = vg > 0 ? cgy * cgy / (vg * vy) : 0;
      chiU[j] = r2 < 1 ? (n - 2) * r2 / (1 - r2) : 1e6;
      // adjusted for region: within-region sums of squares and cross-products
      var cA = SgyA - SgA * SyA / nA, cB = SgyB - SgB * SyB / nB;
      var vgW = (SggA - SgA * SgA / nA) + (SggB - SgB * SgB / nB);
      var vyW = (SyyA - SyA * SyA / nA) + (SyyB - SyB * SyB / nB);
      var r2w = vgW > 0 ? (cA + cB) * (cA + cB) / (vgW * vyW) : 0;
      chiA[j] = r2w < 1 ? (n - 3) * r2w / (1 - r2w) : 1e6;
    }
    return summarize({ chiU: chiU, chiA: chiA, fdiff: fdiff, n: n, M: M, F: F, delta: delta });
  }
  function summarize(r) {
    function stats(c) {
      var s = 0, hits = 0;
      for (var j = 0; j < c.length; j++) { s += c[j]; if (c[j] > CHI2_GWS) hits++; }
      return { mean: s / c.length, lambda: median(c) / 0.454936423, hits: hits };
    }
    r.unadj = stats(r.chiU);
    r.adj = stats(r.chiA);
    r.expected = 1 + r.n * r.delta * r.delta * r.F / (4 + r.delta * r.delta);
    var s = 0; for (var j = 0; j < r.fdiff.length; j++) s += Math.abs(r.fdiff[j]);
    r.meanAbsDiff = s / r.fdiff.length;
    return r;
  }

  var core = { mulberry32: mulberry32, simulate: simulate, negLog10P: negLog10P, median: median, CHI2_GWS: CHI2_GWS };
  if (typeof module !== "undefined" && module.exports) { module.exports = core; }
  if (typeof document === "undefined") return;

  /* ------------------------------------------------------------------ UI */
  var root = document.getElementById("w-strat");
  if (!root) return;
  var body = root.querySelector(".widget-body");
  var NS = "http://www.w3.org/2000/svg";
  var DEF = { n: 6000, F: 0.002, delta: 0.3 };
  var SEED0 = 20260945;
  var state = { n: DEF.n, F: DEF.F, delta: DEF.delta, seed: SEED0 };
  var M = 1000;

  function fmt(v, d) {
    if (!isFinite(v)) return "—";
    return v.toFixed(d).replace("-", "−");
  }
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, s, cls, anchor) {
    var t = el("text", { x: x, y: y, "class": cls || "t-sm" }, parent);
    if (anchor) t.setAttribute("text-anchor", anchor);
    t.textContent = s;
    return t;
  }
  function fitWidth(svg, max) {
    var w = svg.getBoundingClientRect().width;
    if (!w || !isFinite(w)) w = max;
    return Math.round(Math.max(300, Math.min(max, w)));
  }

  body.innerHTML =
    '<p class="note"><span class="illustrative">Simulated</span> Two regions of one country, ' + M.toLocaleString("en-US") + ' SNPs that have no effect on the trait, and a trait whose mean differs between the regions for non-genetic reasons. Each SNP is tested by linear regression, without and with region as a covariate.</p>' +
    '<label class="st-slider"><span>People, n = <output id="st-o-n"></output> (half in each region)</span><input type="range" id="st-n" min="1000" max="20000" step="1000"></label>' +
    '<label class="st-slider"><span>Allele-frequency difference between the regions, F<sub>ST</sub> = <output id="st-o-F"></output></span><input type="range" id="st-F" min="0" max="0.01" step="0.0005"></label>' +
    '<label class="st-slider"><span>Difference in mean trait between the regions, δ = <output id="st-o-delta"></output> SD</span><input type="range" id="st-delta" min="0" max="0.5" step="0.05"></label>' +
    '<div class="controls"><button type="button" class="btn" id="st-new">New sample</button><button type="button" class="btn" id="st-reset">Reset</button></div>' +
    '<svg id="st-svg" role="img" aria-label="Quantile–quantile plot of the SNP p-values without and with adjustment for region"></svg>' +
    '<p class="note st-legend" aria-hidden="true"><span class="st-li"><i class="st-dot st-u"></i>not adjusted</span> <span class="st-li"><i class="st-dot st-a"></i>adjusted for region</span> <span class="st-li"><i class="st-line"></i>expected if no SNP has an effect</span></p>' +
    '<div class="readout st-readout" id="st-readout" aria-live="polite"></div>';

  var inputs = { n: body.querySelector("#st-n"), F: body.querySelector("#st-F"), delta: body.querySelector("#st-delta") };
  var outs = { n: body.querySelector("#st-o-n"), F: body.querySelector("#st-o-F"), delta: body.querySelector("#st-o-delta") };
  function syncInputs() {
    inputs.n.value = state.n; inputs.F.value = state.F; inputs.delta.value = state.delta;
    showValues();
  }
  function showValues() {
    outs.n.textContent = Number(inputs.n.value).toLocaleString("en-US");
    outs.F.textContent = Number(inputs.F.value).toFixed(4);
    outs.delta.textContent = Number(inputs.delta.value).toFixed(2);
  }

  var res = null;
  function compute() {
    res = simulate({ n: state.n, M: M, F: state.F, delta: state.delta, seed: state.seed });
  }
  function draw() {
    var svg = body.querySelector("#st-svg");
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var W = fitWidth(svg, 520), H = W < 400 ? 300 : 330;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    var L = 46, R = W - 12, T = 12, B = H - 42;
    var obsU = Array.prototype.map.call(res.chiU, negLog10P).sort(function (a, b) { return b - a; });
    var obsA = Array.prototype.map.call(res.chiA, negLog10P).sort(function (a, b) { return b - a; });
    var exp = []; for (var j = 0; j < M; j++) exp.push(-Math.log((j + 0.5) / M) / Math.LN10);
    var xMax = Math.ceil(exp[0]);
    var yTop = Math.max(obsU[0], obsA[0], 8);
    var yMax = Math.min(30, Math.ceil(yTop / 2) * 2);
    var sx = function (v) { return L + v / xMax * (R - L); };
    var sy = function (v) { return B - Math.min(v, yMax) / yMax * (B - T); };
    el("rect", { x: L, y: T, width: R - L, height: B - T, fill: "#fff", stroke: "#d9dee5" }, svg);
    var stepY = yMax > 16 ? 5 : 2;
    for (var t = 0; t <= yMax; t += stepY) {
      el("line", { x1: L, x2: R, y1: sy(t), y2: sy(t), stroke: "#eef1f4" }, svg);
      txt(svg, L - 6, sy(t) + 4, String(t), "t-xs", "end");
    }
    for (var u = 0; u <= xMax; u += 1) txt(svg, sx(u), B + 15, String(u), "t-xs", "middle");
    txt(svg, (L + R) / 2, H - 8, "expected −log10(p) if no SNP has an effect", "t-xs", "middle");
    var yl = txt(svg, 12, (T + B) / 2, "observed −log10(p)", "t-xs", "middle");
    yl.setAttribute("transform", "rotate(-90 12 " + ((T + B) / 2) + ")");
    var gws = -Math.log(5e-8) / Math.LN10;
    if (gws <= yMax) {
      el("line", { x1: L, x2: R, y1: sy(gws), y2: sy(gws), stroke: "#c0392b", "stroke-dasharray": "4 3" }, svg);
      txt(svg, R - 4, sy(gws) - 4, "p = 5 × 10⁻⁸", "t-xs", "end");
    }
    el("line", { x1: sx(0), y1: sy(0), x2: sx(Math.min(xMax, yMax)), y2: sy(Math.min(xMax, yMax)), stroke: "#5a6370", "stroke-width": 1.2 }, svg);
    function series(obs, color) {
      for (var j = 0; j < M; j++) {
        el("circle", { cx: sx(exp[j]).toFixed(1), cy: sy(obs[j]).toFixed(1), r: 2.4, fill: color, "fill-opacity": 0.75 }, svg);
      }
    }
    series(obsA, "#2f6aa3");
    series(obsU, "#d9822b");
    if (yTop > yMax) txt(svg, L + 6, T + 13, "points above " + yMax + " are drawn at the top", "t-xs");
  }
  function readout() {
    var r = res;
    var html =
      '<div><strong>Not adjusted:</strong> λ<sub>GC</sub> = ' + fmt(r.unadj.lambda, 2) + ', mean χ² = ' + fmt(r.unadj.mean, 2) +
      ' (formula: ' + fmt(r.expected, 2) + '); ' + r.unadj.hits + ' of ' + M.toLocaleString("en-US") + ' SNPs pass p &lt; 5&nbsp;×&nbsp;10⁻⁸</div>' +
      '<div><strong>Adjusted for region:</strong> λ<sub>GC</sub> = ' + fmt(r.adj.lambda, 2) + ', mean χ² = ' + fmt(r.adj.mean, 2) +
      '; ' + r.adj.hits + ' of ' + M.toLocaleString("en-US") + ' SNPs pass p &lt; 5&nbsp;×&nbsp;10⁻⁸</div>' +
      '<div class="note">Average difference in allele frequency between the regions: ' + fmt(r.meanAbsDiff * 100, 2) + ' percentage points. No SNP affects the trait.</div>';
    body.querySelector("#st-readout").innerHTML = html;
  }
  function render() { compute(); draw(); readout(); }

  ["n", "F", "delta"].forEach(function (k) {
    inputs[k].addEventListener("input", showValues);
    inputs[k].addEventListener("change", function () { state[k] = Number(inputs[k].value); render(); });
  });
  body.querySelector("#st-new").addEventListener("click", function () { state.seed = (state.seed * 1103515245 + 12345) >>> 0; render(); });
  body.querySelector("#st-reset").addEventListener("click", function () {
    state.n = DEF.n; state.F = DEF.F; state.delta = DEF.delta; state.seed = SEED0; syncInputs(); render();
  });
  var lastW = 0, rt = null;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      var w = Math.round(body.querySelector("#st-svg").getBoundingClientRect().width);
      if (Math.abs(w - lastW) > 4 && res) { lastW = w; draw(); }
    }, 150);
  });
  syncInputs();
  render();
  lastW = Math.round(body.querySelector("#st-svg").getBoundingClientRect().width);
})();
