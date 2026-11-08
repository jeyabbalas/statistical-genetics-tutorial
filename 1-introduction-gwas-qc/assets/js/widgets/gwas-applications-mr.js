/* gwas-applications-mr.js — two-sample Mendelian randomization with many SNPs (page gwas-applications, widget #w-mr).

   Simulated summary statistics for J = 30 SNPs used as instruments:
     true SNP → exposure effects γ_j = 0.03 + 0.12 u_j²  (u_j ~ Uniform(0, 1)), estimate β̂_X,j ~ Normal(γ_j, 0.008²)
     true SNP → outcome effects  Γ_j = θ γ_j + α_j,  α_j ~ Normal(μ_α, σ_α²)  (α = pleiotropy: a path that bypasses
     the exposure), estimate β̂_Y,j ~ Normal(Γ_j, 0.012²); exposure and outcome come from two different GWAS.
   Estimators (w_j = 1 / SE_Y,j²):
     IVW:       θ̂ = Σ w β̂_X β̂_Y / Σ w β̂_X²,  SE = max(1, σ̂) / √(Σ w β̂_X²),  σ̂² = Q / (J − 1)
     Cochran's Q = Σ w (β̂_Y − θ̂ β̂_X)²  (heterogeneity; about J − 1 if all SNPs agree)
     MR-Egger:  weighted regression β̂_Y = b₀ + θ_E β̂_X (SNPs oriented so β̂_X > 0), SE = SE(σ = 1) × max(1, σ̂_E),
                σ̂_E² = Σ w residual² / (J − 2); b₀ estimates the average pleiotropic effect μ_α.
   p-values use the normal approximation. All data are simulated with a seeded generator (mulberry32). */
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
  var SQRT_PI = Math.sqrt(Math.PI);
  function erfcPos(x) {
    if (x < 2) {
      var sum = x, term = x, x2 = x * x;
      for (var n = 1; n < 200; n++) { term *= -x2 / n; var add = term / (2 * n + 1); sum += add; if (Math.abs(add) < 1e-17 * Math.abs(sum)) break; }
      return 1 - 2 / SQRT_PI * sum;
    }
    var tiny = 1e-300, f = x, C = x, D = 0;
    for (var k = 1; k < 500; k++) { var a = k / 2; D = x + a * D; if (Math.abs(D) < tiny) D = tiny; D = 1 / D; C = x + a / C; if (Math.abs(C) < tiny) C = tiny; var dl = C * D; f *= dl; if (Math.abs(dl - 1) < 1e-16) break; }
    return Math.exp(-x * x) / (SQRT_PI * f);
  }
  function pTwo(z) { return erfcPos(Math.abs(z) / Math.SQRT2); }
  /* Upper tail of a chi-square with k degrees of freedom (regularized gamma Q(k/2, x/2)). */
  function lgamma(x) {
    var c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    var y = x, tmp = x + 5.5; tmp -= (x + 0.5) * Math.log(tmp);
    var ser = 1.000000000190015;
    for (var j = 0; j < 6; j++) ser += c[j] / ++y;
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }
  function chiSqUpper(x, k) {
    var a = k / 2, z = x / 2;
    if (z <= 0) return 1;
    if (z < a + 1) { // series for P, return 1 − P
      var sum = 1 / a, del = sum, ap = a;
      for (var n = 0; n < 500; n++) { ap += 1; del *= z / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-15) break; }
      return 1 - sum * Math.exp(-z + a * Math.log(z) - lgamma(a));
    }
    var b = z + 1 - a, c = 1e300, d = 1 / b, h = d; // continued fraction for Q
    for (var i = 1; i < 500; i++) {
      var an = -i * (i - a); b += 2;
      d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
      c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d; var dl = d * c; h *= dl;
      if (Math.abs(dl - 1) < 1e-15) break;
    }
    return Math.exp(-z + a * Math.log(z) - lgamma(a)) * h;
  }

  var J = 30, SEX = 0.008, SEY = 0.012;
  function simulate(theta, muA, sdA, seed) {
    var rnd = mulberry32(seed), rn = normalGen(rnd), d = [];
    for (var j = 0; j < J; j++) {
      var u = rnd(), g = 0.03 + 0.12 * u * u;
      var bx = g + SEX * rn(), by = theta * g + muA + sdA * rn() + SEY * rn();
      d.push({ bx: bx, by: by, sx: SEX, sy: SEY, g: g });
    }
    return d;
  }
  function ivw(d) {
    var sxx = 0, sxy = 0, n = d.length;
    d.forEach(function (r) { var w = 1 / (r.sy * r.sy); sxx += w * r.bx * r.bx; sxy += w * r.bx * r.by; });
    var th = sxy / sxx, Q = 0;
    d.forEach(function (r) { var w = 1 / (r.sy * r.sy), e = r.by - th * r.bx; Q += w * e * e; });
    var sig = Math.sqrt(Q / (n - 1)), seF = 1 / Math.sqrt(sxx), se = seF * Math.max(1, sig);
    return { est: th, se: se, seFixed: seF, Q: Q, df: n - 1, pQ: chiSqUpper(Q, n - 1), I2: Math.max(0, (Q - (n - 1)) / Q), p: pTwo(th / se) };
  }
  function egger(d) {
    // orient so that bx > 0
    var rows = d.map(function (r) { var s = r.bx < 0 ? -1 : 1; return { bx: s * r.bx, by: s * r.by, w: 1 / (r.sy * r.sy) }; });
    var S0 = 0, S1 = 0, S2 = 0, T0 = 0, T1 = 0, n = rows.length;
    rows.forEach(function (r) { S0 += r.w; S1 += r.w * r.bx; S2 += r.w * r.bx * r.bx; T0 += r.w * r.by; T1 += r.w * r.bx * r.by; });
    var det = S0 * S2 - S1 * S1, b0 = (S2 * T0 - S1 * T1) / det, b1 = (S0 * T1 - S1 * T0) / det;
    var rss = 0;
    rows.forEach(function (r) { var e = r.by - b0 - b1 * r.bx; rss += r.w * e * e; });
    var sig = Math.sqrt(rss / (n - 2)), k = Math.max(1, sig);
    var se0 = Math.sqrt(S2 / det) * k, se1 = Math.sqrt(S0 / det) * k;
    return { est: b1, se: se1, p: pTwo(b1 / se1), int: b0, seInt: se0, pInt: pTwo(b0 / se0), sigma: sig };
  }

  var api = { mulberry32: mulberry32, simulate: simulate, ivw: ivw, egger: egger, chiSqUpper: chiSqUpper, pTwo: pTwo, J: J };
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
  function fmtP(p) {
    if (p >= 0.001) return p.toFixed(3);
    if (p < 1e-300) return "< 10⁻³⁰⁰";
    var e = Math.floor(Math.log10(p)), m = p / Math.pow(10, e);
    if (m >= 9.95) { m = 1; e += 1; }
    return m.toFixed(1) + "×10" + String(e).split("").map(function (ch) { return SUP[ch]; }).join("");
  }
  function sg(x, d) { return (x < 0 ? "−" : "") + Math.abs(x).toFixed(d); }

  var root = document.getElementById("w-mr");
  if (!root) return;
  var body = root.querySelector(".widget-body");
  if (!body) return;

  var st = { theta: 0.4, muA: 0, sdA: 0.004, seed: 1 };
  function slider(parent, label, min, max, step, value, id) {
    var lab = H("label", { "for": id }, parent);
    H("span", null, lab, label);
    var inp = H("input", { type: "range", id: id, min: min, max: max, step: step, value: value }, lab);
    var out = H("output", { "for": id }, lab);
    return { input: inp, out: out };
  }
  var c1 = H("div", { "class": "controls" }, body);
  var sT = slider(c1, "True causal effect θ", -0.5, 1, 0.05, st.theta, "mr-theta");
  var sM = slider(c1, "Directional pleiotropy μ<sub>α</sub>", -0.02, 0.03, 0.001, st.muA, "mr-mu");
  var c2 = H("div", { "class": "controls" }, body);
  var sS = slider(c2, "Balanced pleiotropy σ<sub>α</sub>", 0, 0.03, 0.001, st.sdA, "mr-sd");
  var bNew = H("button", { type: "button", "class": "btn" }, c2, "New sample");
  var chart = H("div", { "class": "mr-chart" }, body);
  H("p", { "class": "note" }, body,
    '<span style="white-space:nowrap;margin-right:12px"><svg width="18" height="12" aria-hidden="true"><line x1="0" y1="6" x2="18" y2="6" stroke="#0a62c2" stroke-width="2.4"/></svg> IVW (line through 0)</span> ' +
    '<span style="white-space:nowrap;margin-right:12px"><svg width="18" height="12" aria-hidden="true"><line x1="0" y1="6" x2="18" y2="6" stroke="#e8710a" stroke-width="2.4"/></svg> MR-Egger (free intercept)</span> ' +
    '<span style="white-space:nowrap"><svg width="18" height="12" aria-hidden="true"><line x1="0" y1="6" x2="18" y2="6" stroke="#1d2127" stroke-width="1.5" stroke-dasharray="5 4"/></svg> true θ</span>');
  var readout = H("div", { "class": "readout", "aria-live": "polite" }, body);
  H("p", { "class": "note" }, body, "Simulated summary statistics (seeded) for 30 independent SNPs: each cross is one SNP, with 95% intervals for its effect on the exposure (horizontal) and on the outcome (vertical).");

  var raf = 0;
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }

  function draw() {
    sT.out.textContent = sg(st.theta, 2);
    sM.out.textContent = sg(st.muA, 3);
    sS.out.textContent = st.sdA.toFixed(3);
    var d = simulate(st.theta, st.muA, st.sdA, 300 + st.seed), iv = ivw(d), eg = egger(d);
    var W = Math.max(290, Math.floor(chart.clientWidth || body.clientWidth || 640));
    var Hh = W < 480 ? 280 : 320, m = { l: 54, r: 14, t: 12, b: 44 };
    var pw = W - m.l - m.r, ph = Hh - m.t - m.b;
    var xmax = 0, ymin = 0, ymax = 0;
    d.forEach(function (r) {
      xmax = Math.max(xmax, r.bx + 1.96 * r.sx);
      ymin = Math.min(ymin, r.by - 1.96 * r.sy); ymax = Math.max(ymax, r.by + 1.96 * r.sy);
    });
    [iv.est * xmax, eg.int + eg.est * xmax, st.theta * xmax].forEach(function (v) { ymin = Math.min(ymin, v); ymax = Math.max(ymax, v); });
    xmax = Math.ceil(xmax * 50) / 50;
    var pad = 0.08 * (ymax - ymin || 0.1); ymin -= pad; ymax += pad;
    function X(v) { return m.l + pw * v / xmax; }
    function Y(v) { return m.t + ph * (ymax - v) / (ymax - ymin); }
    chart.innerHTML = "";
    var svg = S("svg", { width: W, height: Hh, viewBox: "0 0 " + W + " " + Hh, role: "img",
      "aria-label": "Scatter plot of SNP effects on the outcome against SNP effects on the exposure for 30 SNPs, with the IVW line (slope " + sg(iv.est, 3) + ") and the MR-Egger line (slope " + sg(eg.est, 3) + ")." }, chart);
    var xs = xmax <= 0.1 ? 0.02 : 0.05;
    for (var xv = 0; xv <= xmax + 1e-9; xv += xs) {
      S("line", { x1: X(xv), x2: X(xv), y1: m.t, y2: m.t + ph, stroke: "#eef1f4" }, svg);
      S("text", { x: X(xv), y: m.t + ph + 15, "text-anchor": "middle", "class": "t-sm" }, svg, xv.toFixed(2));
    }
    var span = ymax - ymin, ys = span > 0.2 ? 0.05 : span > 0.1 ? 0.02 : span > 0.05 ? 0.01 : 0.005;
    for (var yv = Math.ceil(ymin / ys) * ys; yv <= ymax + 1e-9; yv += ys) {
      S("line", { x1: m.l, x2: m.l + pw, y1: Y(yv), y2: Y(yv), stroke: Math.abs(yv) < 1e-9 ? "#b9c1cc" : "#eef1f4" }, svg);
      S("text", { x: m.l - 6, y: Y(yv) + 4, "text-anchor": "end", "class": "t-sm" }, svg, sg(yv, ys < 0.01 ? 3 : 2).replace("−0.000", "0.000").replace("−0.00", "0.00"));
    }
    S("text", { x: m.l + pw / 2, y: Hh - 6, "text-anchor": "middle", "class": "t-sm" }, svg, "estimated SNP effect on the exposure");
    S("text", { x: 12, y: m.t + ph / 2, "text-anchor": "middle", "class": "t-sm", transform: "rotate(-90 12 " + (m.t + ph / 2) + ")" }, svg, "estimated SNP effect on the outcome");
    var gE = S("g", { stroke: "#8a93a0", "stroke-width": 1 }, svg);
    d.forEach(function (r) {
      S("line", { x1: X(Math.max(0, r.bx - 1.96 * r.sx)), x2: X(r.bx + 1.96 * r.sx), y1: Y(r.by), y2: Y(r.by) }, gE);
      S("line", { x1: X(r.bx), x2: X(r.bx), y1: Y(r.by - 1.96 * r.sy), y2: Y(r.by + 1.96 * r.sy) }, gE);
    });
    var gP = S("g", { fill: "#1d2127" }, svg);
    d.forEach(function (r) { S("circle", { cx: X(r.bx), cy: Y(r.by), r: 2.6 }, gP); });
    S("line", { x1: X(0), y1: Y(0), x2: X(xmax), y2: Y(st.theta * xmax), stroke: "#1d2127", "stroke-width": 1.5, "stroke-dasharray": "5 4" }, svg);
    S("line", { x1: X(0), y1: Y(0), x2: X(xmax), y2: Y(iv.est * xmax), stroke: "#0a62c2", "stroke-width": 2.4 }, svg);
    S("line", { x1: X(0), y1: Y(eg.int), x2: X(xmax), y2: Y(eg.int + eg.est * xmax), stroke: "#e8710a", "stroke-width": 2.4 }, svg);
    S("circle", { cx: X(0), cy: Y(eg.int), r: 3.5, fill: "#e8710a" }, svg);

    readout.innerHTML =
      "<div>IVW: θ̂ = " + sg(iv.est, 3) + " (SE " + iv.se.toFixed(3) + ", p = " + fmtP(iv.p) + ")   true θ = " + sg(st.theta, 2) + "</div>" +
      "<div>MR-Egger: slope " + sg(eg.est, 3) + " (SE " + eg.se.toFixed(3) + ", p = " + fmtP(eg.p) + "); intercept " + sg(eg.int, 4) + " (SE " + eg.seInt.toFixed(4) + ", p = " + fmtP(eg.pInt) + ")</div>" +
      "<div>Heterogeneity: Cochran's Q = " + iv.Q.toFixed(1) + " on " + iv.df + " df (p = " + fmtP(iv.pQ) + "), I² = " + Math.round(100 * iv.I2) + "%</div>";
  }

  sT.input.addEventListener("input", function () { st.theta = +sT.input.value; schedule(); });
  sM.input.addEventListener("input", function () { st.muA = +sM.input.value; schedule(); });
  sS.input.addEventListener("input", function () { st.sdA = +sS.input.value; schedule(); });
  bNew.addEventListener("click", function () { st.seed++; schedule(); });
  var lastW = 0;
  function onResize() { var w = chart.clientWidth; if (w !== lastW) { lastW = w; schedule(); } }
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(onResize).observe(chart);
  else window.addEventListener("resize", onResize);
  draw();
})();
