/* Widget "One SNP, one trait" (page: genotype-to-phenotype).
   Simulates a quantitative trait for n unrelated people at one biallelic SNP under the additive model
       g ~ Binomial(2, p)            (Hardy–Weinberg genotype frequencies)
       y = beta * (g - 2p) + e,      e ~ Normal(0, 1 - 2p(1-p)beta^2)
   so that Var(y) = 1 in the population and beta is in phenotype-SD units per copy of the effect allele.
   It fits the ordinary least-squares regression of y on g and reports beta-hat, its standard error,
   the t statistic, the two-sided p-value (exact Student t, computed in log space so tiny p-values do not
   underflow), the sample R^2, the population variance explained 2p(1-p)beta^2, the power at the chosen n
   and the n needed for 80% power at p < 5e-8.
   No libraries, no network. Works from file://. The statistics functions are exported for node tests. */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ statistics core */

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function normalGen(rand) {           // Box–Muller, both draws used
    var spare = null;
    return function () {
      if (spare !== null) { var s = spare; spare = null; return s; }
      var u = rand(); while (u <= 0) u = rand();
      var v = rand(), r = Math.sqrt(-2 * Math.log(u));
      spare = r * Math.sin(2 * Math.PI * v);
      return r * Math.cos(2 * Math.PI * v);
    };
  }

  /* Variance of the phenotype explained by the SNP (population value, Var(y) = 1). */
  function varianceExplained(p, beta) { return 2 * p * (1 - p) * beta * beta; }

  function simulate(p, beta, n, seed) {
    var rand = mulberry32(seed >>> 0), norm = normalGen(rand);
    var q2 = varianceExplained(p, beta);
    var sdE = Math.sqrt(Math.max(1 - q2, 1e-12));
    var g = new Uint8Array(n), y = new Float64Array(n);
    for (var i = 0; i < n; i++) {
      var gi = (rand() < p ? 1 : 0) + (rand() < p ? 1 : 0);
      g[i] = gi;
      y[i] = beta * (gi - 2 * p) + sdE * norm();
    }
    return { g: g, y: y, q2: q2, p: p, beta: beta, n: n };
  }

  /* log Gamma (Lanczos, g = 7, 9 coefficients); accurate to ~1e-15 relative for x > 0 */
  var LZ = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
            -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  function lgamma(x) {
    if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
    x -= 1;
    var a = LZ[0], t = x + 7.5;
    for (var i = 1; i < 9; i++) a += LZ[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }

  /* Continued fraction for the incomplete beta function (modified Lentz; Numerical Recipes betacf). */
  function betacf(a, b, x) {
    var MAXIT = 100000, EPS = 1e-15, FPMIN = 1e-300;
    var qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    var h = d;
    for (var m = 1; m <= MAXIT; m++) {
      var m2 = 2 * m, aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      var del = d * c; h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  }

  /* Natural log of the regularized incomplete beta I_x(a, b); xc = 1 - x passed separately for accuracy. */
  function logIbeta(x, xc, a, b) {
    if (x <= 0) return -Infinity;
    if (xc <= 0) return 0;
    var lbt = lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(xc);
    if (x < (a + 1) / (a + b + 2)) return lbt + Math.log(betacf(a, b, x) / a);
    var comp = Math.exp(lbt) * betacf(b, a, xc) / b;      // = 1 - I_x(a, b)
    return Math.log1p(-Math.min(comp, 1 - 1e-16));
  }

  /* log10 of the two-sided p-value P(|T| >= |t|) for Student t with df degrees of freedom. */
  function log10PvalT(t, df) {
    if (!isFinite(t)) return -Infinity;
    var t2 = t * t;
    if (t2 === 0) return 0;
    var x = df / (df + t2), xc = t2 / (df + t2);
    return logIbeta(x, xc, df / 2, 0.5) / Math.LN10;
  }

  /* Standard normal upper tail Q(z) = 1 - Phi(z) (W. J. Cody-style rational approximation via erfc). */
  function erfc(x) {
    // Numerical Recipes erfcc, fractional error < 1.2e-7 everywhere
    var z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    var r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
            t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 +
            t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  function normCdf(z) { return 0.5 * erfc(-z / Math.SQRT2); }

  /* Two-sided t quantile by bisection on the exact t tail (used for group-mean confidence intervals). */
  function tQuantile975(df) {
    if (df > 400) return 1.959964;
    var lo = 1.9, hi = 15;
    if (df < 2) hi = 60;
    for (var i = 0; i < 80; i++) {
      var mid = 0.5 * (lo + hi);
      if (Math.pow(10, log10PvalT(mid, df)) > 0.05) lo = mid; else hi = mid;
    }
    return 0.5 * (lo + hi);
  }

  var Z_GWS = 5.451310;          // two-sided 5e-8: Phi^{-1}(1 - 2.5e-8)
  var Z_80 = 0.8416212;          // Phi^{-1}(0.80)
  var NCP80 = (Z_GWS + Z_80) * (Z_GWS + Z_80);   // = 39.60

  /* Sample size for 80% power at p < 5e-8 (two-sided Wald test; ncp = n q2 / (1 - q2)). */
  function nRequired(q2) { return q2 > 0 ? NCP80 * (1 - q2) / q2 : Infinity; }
  function powerAt(n, q2, z) {
    z = z || Z_GWS;
    var d = Math.sqrt(Math.max(n * q2 / (1 - q2), 0));
    return normCdf(d - z) + normCdf(-d - z);
  }

  /* Ordinary least squares of y on g (with intercept), plus per-genotype summaries. */
  function fitOLS(g, y) {
    var n = g.length, cnt = [0, 0, 0], sy = [0, 0, 0], i;
    var sumG = 0, sumY = 0;
    for (i = 0; i < n; i++) { cnt[g[i]]++; sy[g[i]] += y[i]; sumG += g[i]; sumY += y[i]; }
    var mg = sumG / n, my = sumY / n, sxx = 0, sxy = 0, syy = 0;
    var means = [0, 1, 2].map(function (k) { return cnt[k] ? sy[k] / cnt[k] : NaN; });
    var ssw = [0, 0, 0];
    for (i = 0; i < n; i++) {
      var dx = g[i] - mg, dy = y[i] - my;
      sxx += dx * dx; sxy += dx * dy; syy += dy * dy;
      var w = y[i] - means[g[i]]; ssw[g[i]] += w * w;
    }
    var out = { n: n, counts: cnt, means: means, pHat: sumG / (2 * n), ok: sxx > 0 && n > 2 };
    out.sds = [0, 1, 2].map(function (k) { return cnt[k] > 1 ? Math.sqrt(ssw[k] / (cnt[k] - 1)) : NaN; });
    if (!out.ok) return out;
    var b = sxy / sxx, a = my - b * mg;
    var rss = Math.max(syy - b * sxy, 0), df = n - 2, s2 = rss / df, se = Math.sqrt(s2 / sxx);
    out.beta = b; out.alpha = a; out.se = se; out.df = df; out.t = b / se;
    out.r2 = syy > 0 ? (sxy * sxy) / (sxx * syy) : 0;
    out.log10p = log10PvalT(out.t, df);
    return out;
  }

  var api = {
    mulberry32: mulberry32, simulate: simulate, fitOLS: fitOLS, varianceExplained: varianceExplained,
    log10PvalT: log10PvalT, lgamma: lgamma, normCdf: normCdf, nRequired: nRequired, powerAt: powerAt,
    tQuantile975: tQuantile975, NCP80: NCP80
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  /* ------------------------------------------------------------------ formatting helpers */

  var SUP = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
              "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
  function sup(s) { return String(s).split("").map(function (c) { return SUP[c] || c; }).join(""); }
  function fmtSci(lg10) {                       // value given as log10
    if (lg10 >= -3) { var v = Math.pow(10, lg10); return v >= 0.995 ? "1.00" : v.toFixed(v >= 0.01 ? 3 : 4); }
    var e = Math.floor(lg10), m = Math.pow(10, lg10 - e);
    if (m >= 9.95) { m = 1; e += 1; }
    return m.toFixed(1) + " × 10" + sup(e);
  }
  function fmtInt(x) { return Math.round(x).toLocaleString("en-US"); }
  function fmtRound2(x) {                       // two significant digits, thousands separators
    if (!isFinite(x)) return "∞";
    if (x < 10) return "< 10";
    var e = Math.floor(Math.log10(x)) - 1, r = Math.round(x / Math.pow(10, e)) * Math.pow(10, e);
    return fmtInt(r);
  }
  function fmtPct(x) {
    var v = 100 * x;
    if (v === 0) return "0%";
    if (v < 0.01) return "< 0.01%";
    return (v < 0.1 ? v.toFixed(3) : v < 1 ? v.toFixed(2) : v < 10 ? v.toFixed(2) : v.toFixed(1)) + "%";
  }
  function fmtSigned(x, d) { var s = x.toFixed(d); return (x >= 0 ? "+" : "−") + s.replace("-", ""); }
  function fmtNum(x, d) { var s = x.toFixed(d); return s.charAt(0) === "-" ? "−" + s.slice(1) : s; }

  var NS = "http://www.w3.org/2000/svg";
  function S(tag, attrs, parent, text) {
    var n = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
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
  function niceStep(span, target) {
    var raw = span / target, p10 = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p10;
    return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p10;
  }

  /* ------------------------------------------------------------------ widget */

  var N_OPTIONS = [200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000];
  var P_MIN = 0.001, P_MAX = 0.5;
  var PRESETS = [
    { label: "No effect", p: 0.3, b: 0 },
    { label: "Common, small effect", p: 0.3, b: 0.03 },
    { label: "Low-frequency, moderate effect", p: 0.02, b: 0.3 },
    { label: "Rare, large effect", p: 0.002, b: 1.0 }
  ];
  var MAX_DOTS = 450;   // points drawn per genotype group (the regression always uses all n)

  function pToSlider(p) { return Math.round(1000 * (Math.log10(p) - Math.log10(P_MIN)) / (Math.log10(P_MAX) - Math.log10(P_MIN))); }
  function sliderToP(s) { return Math.pow(10, Math.log10(P_MIN) + (s / 1000) * (Math.log10(P_MAX) - Math.log10(P_MIN))); }
  function roundP(p) { return p >= 0.1 ? Math.round(p * 100) / 100 : p >= 0.01 ? Math.round(p * 1000) / 1000 : Math.round(p * 10000) / 10000; }

  function build(root) {
    var body = root.querySelector(".widget-body") || root;
    body.innerHTML = "";
    var state = { p: 0.3, b: 0.1, n: 2000, seed: 20261029 };

    /* controls */
    var c1 = H("div", { "class": "controls snp-controls" }, body);
    var lp = H("label", { "class": "snp-ctl" }, c1, '<span>Effect-allele frequency <i>p</i></span>');
    var pRange = H("input", { type: "range", min: "0", max: "1000", step: "1", "aria-label": "Effect-allele frequency p (logarithmic slider)" }, lp);
    var pNum = H("input", { type: "number", min: String(P_MIN), max: String(P_MAX), step: "0.001", "aria-label": "Effect-allele frequency p" }, lp);
    var lb = H("label", { "class": "snp-ctl" }, c1, '<span>Effect per allele <i>β</i> (SD)</span>');
    var bRange = H("input", { type: "range", min: "-1", max: "1", step: "0.01", "aria-label": "Per-allele effect beta in standard deviations" }, lb);
    var bNum = H("input", { type: "number", min: "-1", max: "1", step: "0.01", "aria-label": "Per-allele effect beta" }, lb);
    var ln = H("label", { "class": "snp-ctl" }, c1, "<span>Sample size <i>n</i></span>");
    var nSel = H("select", { "aria-label": "Sample size n" }, ln);
    N_OPTIONS.forEach(function (v) {
      H("option", { value: String(v) }, nSel, fmtInt(v) + (v === 500000 ? " (≈ UK Biobank)" : ""));
    });
    var resample = H("button", { type: "button", "class": "btn primary" }, c1, "Re-sample people");

    var c2 = H("div", { "class": "controls snp-presets" }, body, '<span class="snp-pl">Presets:</span>');
    PRESETS.forEach(function (pr) {
      var bt = H("button", { type: "button", "class": "btn" }, c2, pr.label);
      bt.addEventListener("click", function () { state.p = pr.p; state.b = pr.b; syncControls(); schedule(); });
    });

    /* panels */
    var grid = H("div", { "class": "snp-grid" }, body);
    var fa = H("div", { "class": "snp-panel snp-a" }, grid);
    var fb = H("div", { "class": "snp-panel snp-b" }, grid);
    var fc = H("div", { "class": "snp-panel snp-c" }, grid);
    var svgA = S("svg", { viewBox: "0 0 420 342", role: "img", "aria-label": "Strip plot of simulated phenotype by genotype" }, fa);
    var svgB = S("svg", { viewBox: "0 0 260 342", role: "img", "aria-label": "Mean phenotype by genotype with 95% confidence intervals" }, fb);
    var svgC = S("svg", { viewBox: "0 0 150 342", role: "img", "aria-label": "Minus log10 p-value compared with significance thresholds" }, fc);

    var verdict = H("p", { "class": "snp-verdict", "aria-live": "polite" }, body);
    var out = H("div", { "class": "readout snp-readout", "aria-live": "polite" }, body);

    function syncControls() {
      pRange.value = String(pToSlider(state.p));
      pNum.value = String(roundP(state.p));
      bRange.value = String(state.b);
      bNum.value = String(state.b);
      nSel.value = String(state.n);
    }
    pRange.addEventListener("input", function () { state.p = roundP(sliderToP(+pRange.value)); pNum.value = String(state.p); schedule(); });
    pNum.addEventListener("change", function () {
      var v = parseFloat(pNum.value);
      if (!isFinite(v)) v = state.p;
      state.p = Math.min(P_MAX, Math.max(P_MIN, v)); syncControls(); schedule();
    });
    bRange.addEventListener("input", function () { state.b = Math.round(+bRange.value * 100) / 100; bNum.value = String(state.b); schedule(); });
    bNum.addEventListener("change", function () {
      var v = parseFloat(bNum.value);
      if (!isFinite(v)) v = state.b;
      state.b = Math.min(1, Math.max(-1, Math.round(v * 1000) / 1000)); syncControls(); schedule();
    });
    nSel.addEventListener("change", function () { state.n = +nSel.value; schedule(); });
    resample.addEventListener("click", function () { state.seed = (Math.imul(state.seed, 1103515245) + 12345) >>> 0; schedule(); });

    var pending = false;
    function schedule() {
      if (pending) return;
      pending = true;
      (window.requestAnimationFrame || setTimeout)(function () { pending = false; render(); });
    }

    function render() {
      var sim = simulate(state.p, state.b, state.n, state.seed);
      var fit = fitOLS(sim.g, sim.y);
      drawStrip(svgA, sim, fit);
      drawMeans(svgB, sim, fit);
      drawP(svgC, fit);
      writeReadout(verdict, out, sim, fit);
    }

    syncControls();
    render();
  }

  /* Panel A: all phenotype values (sampled dots) by genotype, group means and fitted line */
  function drawStrip(svg, sim, fit) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var W = 420, Hh = 342, L = 46, R = 12, T = 30, B = 70;
    var pw = W - L - R, ph = Hh - T - B;
    var lo = -4, hi = 4;
    [0, 1, 2].forEach(function (k) {
      if (isFinite(fit.means[k])) { lo = Math.min(lo, Math.floor(fit.means[k] - 3.2)); hi = Math.max(hi, Math.ceil(fit.means[k] + 3.2)); }
    });
    var X = function (k) { return L + pw * (0.18 + 0.32 * k); };
    var Y = function (v) { return T + ph * (hi - v) / (hi - lo); };
    S("text", { x: L, y: 16, "class": "t-b" }, svg, "A · Every person (phenotype in SD units)");
    var step = niceStep(hi - lo, 6);
    for (var v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) {
      S("line", { x1: L, x2: W - R, y1: Y(v), y2: Y(v), stroke: v === 0 ? "#b9c1cc" : "#eef1f4", "stroke-width": 1 }, svg);
      S("text", { x: L - 6, y: Y(v) + 4, "text-anchor": "end", "class": "t-sm" }, svg, fmtNum(v, step < 1 ? 1 : 0));
    }
    S("text", { x: 13, y: T + ph / 2, "class": "t-sm", transform: "rotate(-90 13 " + (T + ph / 2) + ")", "text-anchor": "middle" }, svg, "phenotype y (SD)");

    // dots: first MAX_DOTS people of each genotype (order is random, so this is a random subsample)
    var rj = mulberry32(99), shown = [0, 0, 0], frag = document.createDocumentFragment();
    var cols = ["#7f8fa6", "#4a7fb5", "#1f5a96"];
    for (var i = 0; i < sim.n; i++) {
      var g = sim.g[i];
      if (shown[g] >= MAX_DOTS) { if (shown[0] >= MAX_DOTS && shown[1] >= MAX_DOTS && shown[2] >= MAX_DOTS) break; continue; }
      var yv = sim.y[i];
      if (yv < lo || yv > hi) continue;
      shown[g]++;
      var c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", (X(g) + (rj() - 0.5) * pw * 0.2).toFixed(1));
      c.setAttribute("cy", Y(yv).toFixed(1));
      c.setAttribute("r", "2.1");
      c.setAttribute("fill", cols[g]);
      c.setAttribute("fill-opacity", "0.35");
      frag.appendChild(c);
    }
    svg.appendChild(frag);

    if (fit.ok) {
      S("line", { x1: X(0) - pw * 0.13, x2: X(2) + pw * 0.13,
                  y1: Y(fit.alpha + fit.beta * (-0.13 / 0.32)), y2: Y(fit.alpha + fit.beta * (2 + 0.13 / 0.32)),
                  stroke: "var(--accent)", "stroke-width": 2.5 }, svg);
    }
    [0, 1, 2].forEach(function (k) {
      if (isFinite(fit.means[k])) {
        S("line", { x1: X(k) - 26, x2: X(k) + 26, y1: Y(fit.means[k]), y2: Y(fit.means[k]), stroke: "#12161b", "stroke-width": 3, "stroke-linecap": "round" }, svg);
      }
      S("text", { x: X(k), y: Hh - B + 18, "text-anchor": "middle", "class": "t-b" }, svg, String(k));
      var note = "n = " + fmtInt(fit.counts[k]);
      S("text", { x: X(k), y: Hh - B + 33, "text-anchor": "middle", "class": "t-sm" }, svg, note);
      if (fit.counts[k] > MAX_DOTS) S("text", { x: X(k), y: Hh - B + 46, "text-anchor": "middle", "class": "t-xs" }, svg, "(" + MAX_DOTS + " drawn)");
    });
    S("text", { x: L + pw / 2, y: Hh - 4, "text-anchor": "middle", "class": "t-sm" }, svg, "genotype g = copies of the effect allele");
    // legend
    S("line", { x1: W - R - 150, x2: W - R - 132, y1: 24, y2: 24, stroke: "#12161b", "stroke-width": 3, "stroke-linecap": "round" }, svg);
    S("text", { x: W - R - 127, y: 28, "class": "t-sm" }, svg, "group mean");
    S("line", { x1: W - R - 62, x2: W - R - 44, y1: 24, y2: 24, stroke: "var(--accent)", "stroke-width": 2.5 }, svg);
    S("text", { x: W - R - 39, y: 28, "class": "t-sm" }, svg, "fit");
  }

  /* Panel B: zoom on the group means with 95% CIs, fitted and true lines */
  function drawMeans(svg, sim, fit) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var W = 260, Hh = 342, L = 50, R = 12, T = 30, B = 70;
    var pw = W - L - R, ph = Hh - T - B;
    var tq = [0, 1, 2].map(function (k) { return fit.counts[k] > 1 ? tQuantile975(fit.counts[k] - 1) : NaN; });
    var ci = [0, 1, 2].map(function (k) { return fit.counts[k] > 1 ? tq[k] * fit.sds[k] / Math.sqrt(fit.counts[k]) : NaN; });
    var trueM = [0, 1, 2].map(function (k) { return sim.beta * (k - 2 * sim.p); });
    var vals = [];
    [0, 1, 2].forEach(function (k) {
      vals.push(trueM[k]);
      if (isFinite(fit.means[k])) { vals.push(fit.means[k]); if (isFinite(ci[k]) && ci[k] < 3) { vals.push(fit.means[k] - ci[k], fit.means[k] + ci[k]); } }
    });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    var span = Math.max(hi - lo, 0.04), mid = (hi + lo) / 2;
    lo = mid - span * 0.62; hi = mid + span * 0.62;
    var X = function (k) { return L + pw * (0.17 + 0.33 * k); };
    var Y = function (v) { return T + ph * (hi - v) / (hi - lo); };
    var clampY = function (v) { return Math.max(T, Math.min(T + ph, Y(v))); };
    S("text", { x: 6, y: 16, "class": "t-b" }, svg, "B · Zoom on the means");
    var step = niceStep(hi - lo, 5), dec = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
    for (var v = Math.ceil(lo / step) * step; v <= hi + 1e-12; v += step) {
      S("line", { x1: L, x2: W - R, y1: Y(v), y2: Y(v), stroke: Math.abs(v) < step / 2 ? "#b9c1cc" : "#eef1f4", "stroke-width": 1 }, svg);
      S("text", { x: L - 6, y: Y(v) + 4, "text-anchor": "end", "class": "t-sm" }, svg, fmtNum(v, dec));
    }
    S("text", { x: 12, y: T + ph / 2, "class": "t-sm", transform: "rotate(-90 12 " + (T + ph / 2) + ")", "text-anchor": "middle" }, svg, "mean y (SD)");
    // true line (dashed) and fitted line
    S("line", { x1: X(0), x2: X(2), y1: clampY(trueM[0]), y2: clampY(trueM[2]), stroke: "#8a93a0", "stroke-width": 1.6, "stroke-dasharray": "5 4" }, svg);
    if (fit.ok) S("line", { x1: X(0), x2: X(2), y1: clampY(fit.alpha), y2: clampY(fit.alpha + 2 * fit.beta), stroke: "var(--accent)", "stroke-width": 2.2 }, svg);
    [0, 1, 2].forEach(function (k) {
      if (isFinite(fit.means[k])) {
        if (isFinite(ci[k])) {
          S("line", { x1: X(k), x2: X(k), y1: clampY(fit.means[k] - ci[k]), y2: clampY(fit.means[k] + ci[k]), stroke: "#12161b", "stroke-width": 1.6 }, svg);
          [-1, 1].forEach(function (s) {
            var yy = fit.means[k] + s * ci[k];
            if (Y(yy) >= T && Y(yy) <= T + ph) S("line", { x1: X(k) - 6, x2: X(k) + 6, y1: Y(yy), y2: Y(yy), stroke: "#12161b", "stroke-width": 1.6 }, svg);
          });
        }
        S("circle", { cx: X(k), cy: clampY(fit.means[k]), r: 4.5, fill: "#12161b" }, svg);
      }
      S("text", { x: X(k), y: Hh - B + 18, "text-anchor": "middle", "class": "t-b" }, svg, String(k));
    });
    S("text", { x: L + pw / 2, y: Hh - B + 36, "text-anchor": "middle", "class": "t-sm" }, svg, "genotype g");
    // legend
    S("line", { x1: L, x2: L + 18, y1: Hh - 12, y2: Hh - 12, stroke: "#8a93a0", "stroke-width": 1.6, "stroke-dasharray": "5 4" }, svg);
    S("text", { x: L + 22, y: Hh - 8, "class": "t-sm" }, svg, "true");
    S("line", { x1: L + 62, x2: L + 80, y1: Hh - 12, y2: Hh - 12, stroke: "var(--accent)", "stroke-width": 2.2 }, svg);
    S("text", { x: L + 84, y: Hh - 8, "class": "t-sm" }, svg, "fit");
    S("line", { x1: L + 112, x2: L + 112, y1: Hh - 18, y2: Hh - 6, stroke: "#12161b", "stroke-width": 1.6 }, svg);
    S("text", { x: L + 118, y: Hh - 8, "class": "t-sm" }, svg, "95% CI");
  }

  /* Panel C: -log10 p against the two usual thresholds */
  function drawP(svg, fit) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var W = 150, Hh = 342, L = 34, T = 30, B = 70, ph = Hh - T - B;
    var top = 12;
    var v = fit.ok ? -fit.log10p : 0;
    var Y = function (s) { return T + ph * (1 - Math.min(s, top) / top); };
    S("text", { x: 4, y: 16, "class": "t-b" }, svg, "C · Evidence");
    for (var s = 0; s <= top; s += 2) {
      S("line", { x1: L, x2: L + 4, y1: Y(s), y2: Y(s), stroke: "#8a93a0" }, svg);
      S("text", { x: L - 4, y: Y(s) + 4, "text-anchor": "end", "class": "t-sm" }, svg, String(s));
    }
    S("line", { x1: L, x2: L, y1: T, y2: T + ph, stroke: "#8a93a0" }, svg);
    var col = v >= 7.30103 ? "var(--key)" : v >= 1.30103 ? "var(--q2)" : "#b9c1cc";
    S("rect", { x: L + 14, y: Y(v), width: 30, height: Math.max(T + ph - Y(v), 0.5), fill: col, rx: 2 }, svg);
    if (v > top) {
      S("path", { d: "M" + (L + 22) + "," + (T + 6) + " l7,-9 l7,9 z", fill: "#fff" }, svg);
      S("text", { x: L + 29, y: T - 4, "text-anchor": "middle", "class": "t-xs" }, svg, "off scale");
    }
    [[1.30103, "p = 0.05"], [7.30103, "5 × 10⁻⁸"]].forEach(function (th) {
      S("line", { x1: L, x2: W - 6, y1: Y(th[0]), y2: Y(th[0]), stroke: "#12161b", "stroke-width": 1.2, "stroke-dasharray": "4 3" }, svg);
      S("text", { x: W - 6, y: Y(th[0]) - 4, "text-anchor": "end", "class": "t-xs" }, svg, th[1]);
    });
    S("text", { x: L + 29, y: Hh - B + 18, "text-anchor": "middle", "class": "t-b" }, svg, v > 99.95 ? fmtInt(v) : v.toFixed(1));
    S("text", { x: L + 29, y: Hh - B + 34, "text-anchor": "middle", "class": "t-sm" }, svg, "−log₁₀ p");
  }

  function writeReadout(verdict, out, sim, fit) {
    var q2 = sim.q2, nReq = nRequired(q2), pow = powerAt(sim.n, q2);
    if (!fit.ok) {
      verdict.textContent = "Nobody in this sample carries the effect allele (or everybody is homozygous), so there is no variation in g and no slope can be estimated. Increase p or n.";
      out.innerHTML = "";
      return;
    }
    var lp = fit.log10p, ci = 1.959964 * fit.se;
    var level = lp <= -7.30103 ? "gws" : lp <= -1.30103 ? "nominal" : "none";
    verdict.className = "snp-verdict " + level;
    verdict.textContent = level === "gws" ? "Genome-wide significant: p < 5 × 10⁻⁸."
      : level === "nominal" ? "Significant at p < 0.05, but not genome-wide significant (that needs p < 5 × 10⁻⁸)."
      : "Not significant at p < 0.05: this sample cannot distinguish the slope from zero.";
    var rows = [
      ["Genotype counts (0 / 1 / 2)", fmtInt(fit.counts[0]) + " / " + fmtInt(fit.counts[1]) + " / " + fmtInt(fit.counts[2]) +
        "  ·  estimated p = " + fit.pHat.toFixed(fit.pHat < 0.01 ? 4 : 3)],
      ["Estimated β (true β = " + fmtNum(sim.beta, 2) + ")", fmtNum(fit.beta, 3) + " SD per allele  (SE " + fit.se.toFixed(3) +
        ";  95% CI " + fmtNum(fit.beta - ci, 3) + " to " + fmtNum(fit.beta + ci, 3) + ")"],
      ["Test of β = 0", "t = " + fmtNum(fit.t, 2) + "  (df = " + fmtInt(fit.df) + ")  ·  p = " + fmtSci(lp)],
      ["Variance explained", "true 2p(1−p)β² = " + fmtPct(q2) + "  ·  this sample R² = " + fmtPct(fit.r2)],
      ["Power at this n (p < 5 × 10⁻⁸)", q2 > 0 ? (pow > 0.999 ? "> 99.9%" : pow < 0.001 ? "< 0.1%" : (100 * pow).toFixed(pow < 0.1 ? 1 : 0) + "%") : "— (no true effect)"],
      ["n needed for 80% power at 5 × 10⁻⁸", q2 > 0 ? "≈ " + fmtRound2(nReq) : "no n is enough when β = 0"]
    ];
    out.innerHTML = "";
    var tbl = H("table", { "class": "snp-stats" }, out);
    rows.forEach(function (r) { var tr = H("tr", null, tbl); H("th", { scope: "row" }, tr).textContent = r[0]; H("td", null, tr).textContent = r[1]; });
  }

  function init() { var root = document.getElementById("w-snp"); if (root) build(root); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
