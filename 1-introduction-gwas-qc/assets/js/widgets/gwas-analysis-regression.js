/* gwas-analysis-regression.js — one SNP, one regression (page gwas-analysis, widget #w-regression).

   Shows the test a GWAS runs at every SNP. Simulated people get a genotype g = 0, 1 or 2 copies of the
   effect allele (Hardy–Weinberg proportions for allele frequency p) and a phenotype:
     quantitative trait: y = β (g − 2p) + e,  e ~ Normal(0, 1 − 2p(1 − p)β²)   (trait variance 1)
     disease (0/1):      logit P(y = 1 | g) = β₀ + β g,  β = ln(OR), β₀ set so that about 30% of people are cases
   and the widget fits the model the GWAS software fits:
     linear regression (least squares): β̂ = Sxy / Sxx,  SE = √(σ̂² / Sxx),  σ̂² = RSS / (N − 2)
     logistic regression (maximum likelihood, Newton–Raphson on the 2×3 table of counts):
       SE from the inverse of the information matrix; OR = e^β̂, 95% CI e^(β̂ ± 1.96 SE)
     Wald statistic z = β̂ / SE; two-sided p = 2 Q(|z|) (normal approximation; N ≥ 200 here).
   Data are simulated with a seeded generator (mulberry32), so the first view is the same for every reader. */
(function () {
  "use strict";

  /* ---------- numerics ---------- */
  var SQRT_PI = Math.sqrt(Math.PI), LN_SQRT_PI = 0.5 * Math.log(Math.PI);
  function erfcPos(x) {
    if (x < 2) {
      var sum = x, term = x, x2 = x * x;
      for (var n = 1; n < 200; n++) { term *= -x2 / n; var add = term / (2 * n + 1); sum += add; if (Math.abs(add) < 1e-17 * Math.abs(sum)) break; }
      var v = 1 - 2 / SQRT_PI * sum;
      return { v: v, ln: Math.log(v) };
    }
    var tiny = 1e-300, f = x, C = x, D = 0;
    for (var k = 1; k < 500; k++) {
      var a = k / 2;
      D = x + a * D; if (Math.abs(D) < tiny) D = tiny; D = 1 / D;
      C = x + a / C; if (Math.abs(C) < tiny) C = tiny;
      var delta = C * D; f *= delta;
      if (Math.abs(delta - 1) < 1e-16) break;
    }
    var ln = -x * x - LN_SQRT_PI - Math.log(f);
    return { v: Math.exp(ln), ln: ln };
  }
  /* log10 of the two-sided p-value of a z statistic (works far into the tail). */
  function log10P(z) { return (erfcPos(Math.abs(z) / Math.SQRT2).ln) / Math.LN10; }
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
  function expit(x) { return 1 / (1 + Math.exp(-x)); }

  function simulate(mode, N, p, eff, seed) {
    var rnd = mulberry32(seed), rn = normalGen(rnd), g = new Array(N), y = new Array(N);
    if (mode === "qt") {
      var sd = Math.sqrt(Math.max(1e-9, 1 - 2 * p * (1 - p) * eff * eff));
      for (var i = 0; i < N; i++) { g[i] = (rnd() < p ? 1 : 0) + (rnd() < p ? 1 : 0); y[i] = eff * (g[i] - 2 * p) + sd * rn(); }
    } else {
      var b = Math.log(eff), b0 = solveIntercept(p, b, 0.3);
      for (var j = 0; j < N; j++) { g[j] = (rnd() < p ? 1 : 0) + (rnd() < p ? 1 : 0); y[j] = rnd() < expit(b0 + b * g[j]) ? 1 : 0; }
    }
    return { g: g, y: y };
  }
  /* β₀ such that the population share of cases is K (bisection). */
  function solveIntercept(p, b, K) {
    var f = [(1 - p) * (1 - p), 2 * p * (1 - p), p * p], lo = -20, hi = 20;
    for (var it = 0; it < 100; it++) {
      var mid = 0.5 * (lo + hi), prev = f[0] * expit(mid) + f[1] * expit(mid + b) + f[2] * expit(mid + 2 * b);
      if (prev < K) lo = mid; else hi = mid;
    }
    return 0.5 * (lo + hi);
  }
  function fitLinear(g, y) {
    var N = g.length, sx = 0, sy = 0;
    for (var i = 0; i < N; i++) { sx += g[i]; sy += y[i]; }
    var mx = sx / N, my = sy / N, Sxx = 0, Sxy = 0, Syy = 0;
    for (var j = 0; j < N; j++) { var dx = g[j] - mx, dy = y[j] - my; Sxx += dx * dx; Sxy += dx * dy; Syy += dy * dy; }
    var b = Sxy / Sxx, a = my - b * mx, rss = Syy - b * Sxy, s2 = rss / (N - 2), se = Math.sqrt(s2 / Sxx);
    return { b: b, a: a, se: se, z: b / se, r2: Sxy * Sxy / (Sxx * Syy), sigma2: s2, Sxx: Sxx, mx: mx, my: my };
  }
  /* Logistic regression of y on g using the 2×3 table: n[k] people and c[k] cases with genotype k. */
  function fitLogistic(n, c) {
    var b0 = 0, b1 = 0, tot = n[0] + n[1] + n[2], cs = c[0] + c[1] + c[2];
    b0 = Math.log((cs + 0.5) / (tot - cs + 0.5));
    var I00 = 0, I01 = 0, I11 = 0;
    for (var it = 0; it < 50; it++) {
      var U0 = 0, U1 = 0; I00 = 0; I01 = 0; I11 = 0;
      for (var k = 0; k < 3; k++) {
        if (!n[k]) continue;
        var mu = expit(b0 + b1 * k), w = n[k] * mu * (1 - mu), r = c[k] - n[k] * mu;
        U0 += r; U1 += k * r; I00 += w; I01 += k * w; I11 += k * k * w;
      }
      var det = I00 * I11 - I01 * I01;
      if (!(det > 0)) break;
      var d0 = (I11 * U0 - I01 * U1) / det, d1 = (-I01 * U0 + I00 * U1) / det;
      b0 += d0; b1 += d1;
      if (Math.abs(d0) + Math.abs(d1) < 1e-12) break;
    }
    var detF = I00 * I11 - I01 * I01, se = Math.sqrt(I00 / detF);
    return { b0: b0, b: b1, se: se, z: b1 / se };
  }

  var api = { log10P: log10P, mulberry32: mulberry32, simulate: simulate, solveIntercept: solveIntercept, fitLinear: fitLinear, fitLogistic: fitLogistic, expit: expit };
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
  var SUP = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
  function fmtP(l10) { // from log10 p
    if (l10 > -3) return Math.pow(10, l10).toFixed(l10 > -1 ? 2 : 3);
    var e = Math.floor(l10), m = Math.pow(10, l10 - e);
    if (m >= 9.95) { m = 1; e += 1; }
    return m.toFixed(1) + "×10" + String(e).split("").map(function (ch) { return SUP[ch]; }).join("");
  }
  function fmtInt(x) { return Math.round(x).toLocaleString("en-US"); }
  function signed(x, d) { return (x < 0 ? "−" : "") + Math.abs(x).toFixed(d); }

  var root = document.getElementById("w-regression");
  if (!root) return;
  var body = root.querySelector(".widget-body");
  if (!body) return;

  var st = { mode: "qt", beta: 0.1, OR: 1.3, p: 0.3, N: 2000, seed: 2 };
  var nMapA = Math.log(200), nMapB = Math.log(20000);
  function nFromPos(v) { var x = Math.exp(nMapA + (nMapB - nMapA) * v / 100), mag = Math.pow(10, Math.floor(Math.log10(x)) - 1); return Math.round(x / mag) * mag; }
  function posFromN(n) { return Math.round(100 * (Math.log(n) - nMapA) / (nMapB - nMapA)); }

  var r0 = H("div", { "class": "controls", role: "group", "aria-label": "Trait type" }, body);
  H("span", null, r0, "<strong>Trait</strong>");
  var bQ = H("button", { type: "button", "class": "btn primary", "aria-pressed": "true" }, r0, "Quantitative: linear regression");
  var bB = H("button", { type: "button", "class": "btn", "aria-pressed": "false" }, r0, "Disease: logistic regression");
  var r1 = H("div", { "class": "controls" }, body);
  function slider(parent, label, min, max, step, value, id) {
    var lab = H("label", { "for": id }, parent);
    H("span", null, lab, label);
    var inp = H("input", { type: "range", id: id, min: min, max: max, step: step, value: value }, lab);
    var out = H("output", { "for": id }, lab);
    return { input: inp, out: out, label: lab };
  }
  var sBeta = slider(r1, "True β (SDs per allele)", -0.3, 0.3, 0.01, st.beta, "rg-beta");
  var sOR = slider(r1, "True odds ratio per allele", -0.7, 0.92, 0.01, Math.log(st.OR).toFixed(2), "rg-or");
  var r2 = H("div", { "class": "controls" }, body);
  var sP = slider(r2, "Effect-allele frequency p", 0.02, 0.5, 0.01, st.p, "rg-p");
  var sN = slider(r2, "People N", 0, 100, 1, posFromN(st.N), "rg-n");
  var bNew = H("button", { type: "button", "class": "btn" }, r2, "New sample");
  var chart = H("div", { "class": "rg-chart" }, body);
  var table = H("div", { "class": "rg-table" }, body);
  var readout = H("div", { "class": "readout", "aria-live": "polite" }, body);
  H("p", { "class": "note" }, body, "Simulated data (seeded). Genotypes are drawn in Hardy–Weinberg proportions; each new sample is a new draw of N people. The quantitative plot shows at most 1,500 people, jittered sideways so the three genotype columns do not overlap.");

  var raf = 0;
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }

  function syncMode() {
    var qt = st.mode === "qt";
    bQ.classList.toggle("primary", qt); bB.classList.toggle("primary", !qt);
    bQ.setAttribute("aria-pressed", qt ? "true" : "false"); bB.setAttribute("aria-pressed", qt ? "false" : "true");
    sBeta.label.style.display = qt ? "" : "none";
    sOR.label.style.display = qt ? "none" : "";
  }

  function draw() {
    sBeta.out.textContent = signed(st.beta, 2);
    sOR.out.textContent = st.OR.toFixed(2);
    sP.out.textContent = st.p.toFixed(2);
    sN.out.textContent = fmtInt(st.N);
    var qt = st.mode === "qt";
    var d = simulate(st.mode, st.N, st.p, qt ? st.beta : st.OR, 1000 + st.seed);
    var W = Math.max(290, Math.floor(chart.clientWidth || body.clientWidth || 640));
    var Hh = W < 480 ? 262 : 302, m = { l: 48, r: 14, t: 14, b: 58 };
    var pw = W - m.l - m.r, ph = Hh - m.t - m.b;
    function X(gx) { return m.l + pw * (gx + 0.5) / 3; }
    chart.innerHTML = "";
    var svg = S("svg", { width: W, height: Hh, viewBox: "0 0 " + W + " " + Hh, role: "img" }, chart);
    var counts = [0, 0, 0], cases = [0, 0, 0];
    for (var i = 0; i < d.g.length; i++) { counts[d.g[i]]++; cases[d.g[i]] += d.y[i]; }
    for (var k = 0; k < 3; k++) {
      S("text", { x: X(k), y: m.t + ph + 18, "text-anchor": "middle", "class": "t-sm" }, svg, "g = " + k);
      S("text", { x: X(k), y: m.t + ph + 32, "text-anchor": "middle", "class": "t-xs" }, svg, fmtInt(counts[k]) + " people");
    }
    var lines = [];
    if (qt) {
      var fit = fitLinear(d.g, d.y);
      var ymin = -3.5, ymax = 3.5;
      var Y = function (v) { return m.t + ph * (ymax - v) / (ymax - ymin); };
      for (var yt = -3; yt <= 3; yt++) {
        S("line", { x1: m.l, x2: m.l + pw, y1: Y(yt), y2: Y(yt), stroke: yt === 0 ? "#cfd5dd" : "#eef1f4" }, svg);
        S("text", { x: m.l - 6, y: Y(yt) + 4, "text-anchor": "end", "class": "t-sm" }, svg, signed(yt, 0).replace("−0", "0"));
      }
      S("text", { x: 12, y: m.t + ph / 2, "text-anchor": "middle", "class": "t-sm", transform: "rotate(-90 12 " + (m.t + ph / 2) + ")" }, svg, "trait y (SD units)");
      var rj = mulberry32(99), step = Math.max(1, Math.ceil(d.g.length / 1500));
      var grp = S("g", { opacity: 0.45 }, svg);
      for (var j = 0; j < d.g.length; j += step) {
        var yy = Math.max(ymin, Math.min(ymax, d.y[j]));
        S("circle", { cx: X(d.g[j]) + (rj() - 0.5) * pw / 3 * 0.55, cy: Y(yy), r: 2, fill: ["#8fbfe0", "#4e79a7", "#1f5a96"][d.g[j]] }, grp);
      }
      // group means
      var sums = [0, 0, 0];
      for (var q = 0; q < d.g.length; q++) sums[d.g[q]] += d.y[q];
      for (var k2 = 0; k2 < 3; k2++) if (counts[k2]) {
        var mean = sums[k2] / counts[k2];
        S("path", { d: "M" + (X(k2) - 7) + " " + Y(mean) + "l7 -7l7 7l-7 7z", fill: "#fff", stroke: "#1d2127", "stroke-width": 1.6 }, svg);
      }
      // fitted line from g = -0.3 to 2.3
      S("line", { x1: X(-0.35), y1: Y(fit.a + fit.b * -0.35), x2: X(2.35), y2: Y(fit.a + fit.b * 2.35), stroke: "#b42318", "stroke-width": 2.4 }, svg);
      svg.setAttribute("aria-label", "Scatter plot of the simulated trait against genotype with the fitted regression line; estimated slope " + signed(fit.b, 3) + ".");
      var l10 = log10P(fit.z);
      lines.push("Fitted line: y = " + signed(fit.a, 3) + " + " + signed(fit.b, 3) + " × g   (true β = " + signed(st.beta, 2) + ")");
      lines.push("β̂ = " + signed(fit.b, 4) + ",  SE = " + fit.se.toFixed(4) + ",  z = β̂/SE = " + signed(fit.z, 2) + ",  p = " + fmtP(l10));
      lines.push("Share of trait variance explained R² = " + (100 * fit.r2).toFixed(2) + "%   ·   genome-wide significant (p < 5×10⁻⁸)? " + (l10 < Math.log10(5e-8) ? "yes" : "no"));
      table.innerHTML = "";
    } else {
      var lf = fitLogistic(counts, cases);
      var Yp = function (v) { return m.t + ph * (1 - v); };
      for (var t = 0; t <= 5; t++) {
        var v = t / 5;
        S("line", { x1: m.l, x2: m.l + pw, y1: Yp(v), y2: Yp(v), stroke: "#eef1f4" }, svg);
        S("text", { x: m.l - 6, y: Yp(v) + 4, "text-anchor": "end", "class": "t-sm" }, svg, (20 * t) + "%");
      }
      S("text", { x: 12, y: m.t + ph / 2, "text-anchor": "middle", "class": "t-sm", transform: "rotate(-90 12 " + (m.t + ph / 2) + ")" }, svg, "share of people who are cases");
      // fitted logistic curve over g in [-0.35, 2.35]
      var dpath = "";
      for (var s = 0; s <= 60; s++) {
        var gx = -0.35 + 2.7 * s / 60;
        dpath += (s ? "L" : "M") + X(gx).toFixed(1) + " " + Yp(expit(lf.b0 + lf.b * gx)).toFixed(1);
      }
      S("path", { d: dpath, fill: "none", stroke: "#b42318", "stroke-width": 2.4 }, svg);
      for (var k3 = 0; k3 < 3; k3++) {
        if (!counts[k3]) continue;
        var ph3 = cases[k3] / counts[k3], se3 = Math.sqrt(ph3 * (1 - ph3) / counts[k3]);
        S("line", { x1: X(k3), x2: X(k3), y1: Yp(Math.min(1, ph3 + 1.96 * se3)), y2: Yp(Math.max(0, ph3 - 1.96 * se3)), stroke: "#1d2127", "stroke-width": 1.6 }, svg);
        S("rect", { x: X(k3) - 6, y: Yp(ph3) - 6, width: 12, height: 12, fill: ["#8fbfe0", "#4e79a7", "#1f5a96"][k3], stroke: "#1d2127" }, svg);
        S("text", { x: X(k3) + 12, y: Yp(ph3) + 4, "class": "t-sm" }, svg, (100 * ph3).toFixed(1) + "%");
      }
      svg.setAttribute("aria-label", "Share of cases in each genotype group with 95% intervals and the fitted logistic curve.");
      var or = Math.exp(lf.b), lo = Math.exp(lf.b - 1.96 * lf.se), hi = Math.exp(lf.b + 1.96 * lf.se);
      var l10b = log10P(lf.z);
      lines.push("Fitted model: logit P(case) = " + signed(lf.b0, 3) + " + " + signed(lf.b, 3) + " × g");
      lines.push("β̂ = ln OR = " + signed(lf.b, 4) + ",  SE = " + lf.se.toFixed(4) + ",  z = " + signed(lf.z, 2) + ",  p = " + fmtP(l10b));
      lines.push("OR = e^β̂ = " + or.toFixed(3) + " (95% CI " + lo.toFixed(3) + "–" + hi.toFixed(3) + ")   (true OR = " + st.OR.toFixed(2) + ")");
      table.innerHTML = '<div class="table-wrap"><table class="compact mono"><caption>The whole dataset for this SNP: a 2 × 3 table of counts</caption>' +
        "<thead><tr><th></th><th>g = 0</th><th>g = 1</th><th>g = 2</th></tr></thead><tbody>" +
        "<tr><th>cases (y = 1)</th><td>" + fmtInt(cases[0]) + "</td><td>" + fmtInt(cases[1]) + "</td><td>" + fmtInt(cases[2]) + "</td></tr>" +
        "<tr><th>controls (y = 0)</th><td>" + fmtInt(counts[0] - cases[0]) + "</td><td>" + fmtInt(counts[1] - cases[1]) + "</td><td>" + fmtInt(counts[2] - cases[2]) + "</td></tr>" +
        "</tbody></table></div>";
    }
    S("text", { x: m.l + pw / 2, y: Hh - 4, "text-anchor": "middle", "class": "t-sm" }, svg, "genotype g = copies of the effect allele");
    readout.innerHTML = lines.map(function (s2) { return "<div>" + s2 + "</div>"; }).join("");
  }

  bQ.addEventListener("click", function () { st.mode = "qt"; syncMode(); schedule(); });
  bB.addEventListener("click", function () { st.mode = "bin"; syncMode(); schedule(); });
  sBeta.input.addEventListener("input", function () { st.beta = +sBeta.input.value; schedule(); });
  sOR.input.addEventListener("input", function () { st.OR = Math.exp(+sOR.input.value); schedule(); });
  sP.input.addEventListener("input", function () { st.p = +sP.input.value; schedule(); });
  sN.input.addEventListener("input", function () { st.N = nFromPos(+sN.input.value); schedule(); });
  bNew.addEventListener("click", function () { st.seed++; schedule(); });
  var lastW = 0;
  function onResize() { var w = chart.clientWidth; if (w !== lastW) { lastW = w; schedule(); } }
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(onResize).observe(chart);
  else window.addEventListener("resize", onResize);
  syncMode();
  draw();
})();
