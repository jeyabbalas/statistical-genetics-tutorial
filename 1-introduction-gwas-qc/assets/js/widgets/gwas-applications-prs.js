/* gwas-applications-prs.js — how accurate can a polygenic score be? (page gwas-applications, widget #w-prs)

   Expected accuracy of a polygenic score built from a GWAS of N people (Daetwyler et al. 2008):
     R² = h² · N h² / (N h² + M)
   h² = SNP heritability on the liability scale, M = number of independent causal SNPs (effective loci).
   Disease model (liability threshold): liability L = S + E, S = the score's part (variance R²),
   E = everything else (variance 1 − R²); a person has the disease if L > T, T = Φ⁻¹(1 − K), K = prevalence.
     P(disease | S = s) = Q((T − s) / √(1 − R²))
     score density among cases:    φ(u) Q((T − R u) / √(1 − R²)) / K          (u = s / R, R = √R²)
     score density among controls:  φ(u) Φ((T − R u) / √(1 − R²)) / (1 − K)
   ROC curve: for every cut-off u, true-positive rate P(U > u | case) against false-positive rate
   P(U > u | control); AUC = area under it (trapezoid rule on a fine grid). Top 10% of scores: u > Φ⁻¹(0.9).
   Checked in Node against the approximate closed form for AUC of Wray et al. 2010. */
(function () {
  "use strict";

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
  function normSf(z) { return z >= 0 ? 0.5 * erfcPos(z / Math.SQRT2) : 1 - 0.5 * erfcPos(-z / Math.SQRT2); }
  function normCdf(z) { return normSf(-z); }
  function normPdf(z) { return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI); }
  function qnormUpper(q) { // z with Q(z) = q
    if (q > 0.5) return -qnormUpper(1 - q);
    var t = Math.sqrt(-2 * Math.log(q));
    var z = t - (2.515517 + 0.802853 * t + 0.010328 * t * t) / (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t);
    for (var i = 0; i < 10; i++) { var dz = (normSf(z) - q) / normPdf(z); z += dz; if (Math.abs(dz) < 1e-13) break; }
    return z;
  }

  function daetwyler(h2, N, M) { return h2 * N * h2 / (N * h2 + M); }

  /* Everything that follows from R² and K. */
  function liabilityModel(R2, K) {
    var T = qnormUpper(K), R = Math.sqrt(R2), sE = Math.sqrt(1 - R2);
    var G = 1401, lo = -7, hi = 7, du = (hi - lo) / (G - 1);
    var u = new Float64Array(G), f1 = new Float64Array(G), f0 = new Float64Array(G);
    for (var i = 0; i < G; i++) {
      u[i] = lo + i * du;
      var pr = normSf((T - R * u[i]) / sE), ph = normPdf(u[i]);
      f1[i] = ph * pr / K; f0[i] = ph * (1 - pr) / (1 - K);
    }
    // tail integrals from the right (trapezoid)
    var tpr = new Float64Array(G), fpr = new Float64Array(G);
    tpr[G - 1] = 0; fpr[G - 1] = 0;
    for (var j = G - 2; j >= 0; j--) {
      tpr[j] = tpr[j + 1] + 0.5 * du * (f1[j] + f1[j + 1]);
      fpr[j] = fpr[j + 1] + 0.5 * du * (f0[j] + f0[j + 1]);
    }
    var auc = 0;
    for (var k = G - 1; k > 0; k--) auc += 0.5 * (tpr[k] + tpr[k - 1]) * (fpr[k - 1] - fpr[k]);
    auc /= (tpr[0] * fpr[0]); // normalize the small truncation error
    // top 10% of scores
    var u90 = qnormUpper(0.1), rTop = 0;
    for (var m = 0; m < G - 1; m++) {
      var a = u[m], b = u[m + 1];
      if (b <= u90) continue;
      var aa = Math.max(a, u90);
      var ga = normPdf(aa) * normSf((T - R * aa) / sE), gb = normPdf(b) * normSf((T - R * b) / sE);
      rTop += 0.5 * (b - aa) * (ga + gb);
    }
    var riskTop = rTop / 0.1, riskRest = (K - rTop) / 0.9;
    var orTop = (riskTop / (1 - riskTop)) / (riskRest / (1 - riskRest));
    return { T: T, u: u, f1: f1, f0: f0, tpr: tpr, fpr: fpr, auc: auc, riskTop: riskTop, riskRest: riskRest,
      rrTop: riskTop / riskRest, orTop: orTop, shareCasesTop: rTop / K, u90: u90 };
  }
  /* Approximate AUC for a liability threshold model (Wray et al. 2010, PLoS Genet 6:e1000864). */
  function wrayAUC(R2, K) {
    var T = qnormUpper(K), i = normPdf(T) / K, v = -i * K / (1 - K);
    return normCdf((i - v) * R2 / Math.sqrt(R2 * (1 - R2 * i * (i - T)) + R2 * (1 - R2 * v * (v - T))));
  }

  var api = { normSf: normSf, normCdf: normCdf, qnormUpper: qnormUpper, daetwyler: daetwyler, liabilityModel: liabilityModel, wrayAUC: wrayAUC };
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
  function fmtN(x) { return x >= 1e6 ? (x / 1e6).toFixed(x >= 1e7 ? 0 : 1) + " million" : fmtInt(x); }
  function logMap(min, max) {
    var a = Math.log(min), b = Math.log(max);
    return { val: function (i) { return Math.exp(a + (b - a) * i / 1000); }, pos: function (v) { return Math.round(1000 * (Math.log(v) - a) / (b - a)); } };
  }
  function round2(v) { var mag = Math.pow(10, Math.floor(Math.log10(v)) - 1); return Math.round(v / mag) * mag; }

  var root = document.getElementById("w-prs");
  if (!root) return;
  var body = root.querySelector(".widget-body");
  if (!body) return;

  var mapN = logMap(1000, 1e7), mapM = logMap(1000, 100000);
  var st = { h2: 0.2, M: 50000, N: 300000, K: 0.05 };
  function slider(parent, label, min, max, step, value, id) {
    var lab = H("label", { "for": id }, parent);
    H("span", null, lab, label);
    var inp = H("input", { type: "range", id: id, min: min, max: max, step: step, value: value }, lab);
    var out = H("output", { "for": id }, lab);
    return { input: inp, out: out };
  }
  var c1 = H("div", { "class": "controls" }, body);
  var sH = slider(c1, "SNP heritability h²", 0.02, 0.8, 0.01, st.h2, "prs-h2");
  var sM = slider(c1, "Independent causal SNPs M", 0, 1000, 1, mapM.pos(st.M), "prs-m");
  var c2 = H("div", { "class": "controls" }, body);
  var sN = slider(c2, "GWAS sample size N", 0, 1000, 1, mapN.pos(st.N), "prs-n");
  var sK = slider(c2, "Disease prevalence K", 0.01, 0.3, 0.01, st.K, "prs-k");
  var chart = H("div", { "class": "prs-chart" }, body);
  var readout = H("div", { "class": "readout", "aria-live": "polite" }, body);
  H("p", { "class": "note" }, body, "Computed from formulas, not simulated people: expected accuracy (Daetwyler et al. 2008) and a liability threshold model of the disease. It assumes the GWAS and the target people share ancestry and that all causal SNPs are measured; real scores fall short of this curve.");

  var raf = 0;
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }

  function draw() {
    sH.out.textContent = st.h2.toFixed(2);
    sM.out.textContent = fmtInt(st.M);
    sN.out.textContent = fmtN(st.N);
    sK.out.textContent = Math.round(100 * st.K) + "%";
    var R2 = daetwyler(st.h2, st.N, st.M), lm = liabilityModel(Math.max(R2, 1e-6), st.K);

    var W = Math.max(290, Math.floor(chart.clientWidth || body.clientWidth || 640));
    var narrow = W < 560;
    var hA = narrow ? 190 : 200, hB = narrow ? 200 : 230;
    var bW = narrow ? W : Math.floor((W - 16) * 0.55), cW = narrow ? W : W - bW - 16;
    var topB = hA + 18, Ht = narrow ? topB + 2 * hB + 18 : topB + hB;
    chart.innerHTML = "";
    var svg = S("svg", { width: W, height: Ht, viewBox: "0 0 " + W + " " + Ht, role: "img",
      "aria-label": "Expected R² of the polygenic score against GWAS sample size; score distributions in cases and controls; ROC curve with AUC " + lm.auc.toFixed(3) + "." }, chart);
    // --- panel A: R2 vs N
    var m = { l: 46, r: 12, t: 22, b: 34 }, pw = W - m.l - m.r, ph = hA - m.t - m.b;
    var lx0 = 3, lx1 = 7, ymax = Math.min(1, Math.max(0.1, Math.ceil(st.h2 * 10 + 0.5) / 10));
    function XA(n) { return m.l + pw * (Math.log10(n) - lx0) / (lx1 - lx0); }
    function YA(v) { return m.t + ph * (1 - v / ymax); }
    S("text", { x: m.l, y: 14, "class": "t-sm", style: "fill:#1d2127;font-weight:700" }, svg, "A  Expected accuracy R² against GWAS size");
    for (var e = lx0; e <= lx1; e++) {
      S("line", { x1: XA(Math.pow(10, e)), x2: XA(Math.pow(10, e)), y1: m.t, y2: m.t + ph, stroke: "#eef1f4" }, svg);
      S("text", { x: XA(Math.pow(10, e)), y: m.t + ph + 14, "text-anchor": "middle", "class": "t-sm" }, svg, ["1k", "10k", "100k", "1M", "10M"][e - lx0]);
    }
    var nt = ymax <= 0.2 ? 0.05 : ymax <= 0.5 ? 0.1 : 0.2;
    for (var yv = 0; yv <= ymax + 1e-9; yv += nt) {
      S("line", { x1: m.l, x2: m.l + pw, y1: YA(yv), y2: YA(yv), stroke: "#eef1f4" }, svg);
      S("text", { x: m.l - 6, y: YA(yv) + 4, "text-anchor": "end", "class": "t-sm" }, svg, yv.toFixed(2));
    }
    S("text", { x: m.l + pw / 2, y: hA - 6, "text-anchor": "middle", "class": "t-sm" }, svg, "people in the GWAS, N (log scale)");
    S("line", { x1: m.l, x2: m.l + pw, y1: YA(st.h2), y2: YA(st.h2), stroke: "#b42318", "stroke-dasharray": "5 4" }, svg);
    S("text", { x: m.l + 4, y: YA(st.h2) - 4, "class": "t-xs", style: "fill:#b42318" }, svg, "ceiling: h² = " + st.h2.toFixed(2));
    var d = "";
    for (var i = 0; i <= 160; i++) {
      var n = Math.pow(10, lx0 + (lx1 - lx0) * i / 160);
      d += (i ? "L" : "M") + XA(n).toFixed(1) + " " + YA(daetwyler(st.h2, n, st.M)).toFixed(1);
    }
    S("path", { d: d, fill: "none", stroke: "#0a62c2", "stroke-width": 2.4 }, svg);
    S("circle", { cx: XA(st.N), cy: YA(R2), r: 5, fill: "#0a62c2", stroke: "#fff", "stroke-width": 1.5 }, svg);
    var tx = XA(st.N) + 8, anc = "start";
    if (XA(st.N) > m.l + pw - 90) { tx = XA(st.N) - 8; anc = "end"; }
    S("text", { x: tx, y: YA(R2) + 16, "text-anchor": anc, "class": "t-sm", style: "fill:#1d2127" }, svg, "R² = " + R2.toFixed(3));
    // --- panel B: score distributions
    var gB = S("g", { transform: "translate(0 " + topB + ")" }, svg);
    var mb = { l: 12, r: 8, t: 22, b: 34 }, bpw = bW - mb.l - mb.r, bph = hB - mb.t - mb.b;
    var umin = -4, umax = 4;
    function XB(u) { return mb.l + bpw * (u - umin) / (umax - umin); }
    var fmax = 0;
    for (var g = 0; g < lm.u.length; g++) if (lm.u[g] >= umin && lm.u[g] <= umax) fmax = Math.max(fmax, lm.f1[g], lm.f0[g]);
    function YB(f) { return mb.t + bph * (1 - f / (fmax * 1.05)); }
    S("text", { x: mb.l, y: 14, "class": "t-sm", style: "fill:#1d2127;font-weight:700" }, gB, "B  Scores of cases and controls");
    S("rect", { x: XB(lm.u90), y: mb.t, width: XB(umax) - XB(lm.u90), height: bph, fill: "#fff7e8" }, gB);
    S("text", { x: XB(umax) - 2, y: mb.t + 12, "text-anchor": "end", "class": "t-xs", style: "fill:#a3620a" }, gB, "top 10%");
    [[lm.f0, "#59a14f", "controls"], [lm.f1, "#e15759", "cases"]].forEach(function (ser) {
      var dd = "";
      for (var q = 0; q < lm.u.length; q++) {
        if (lm.u[q] < umin || lm.u[q] > umax) continue;
        dd += (dd ? "L" : "M") + XB(lm.u[q]).toFixed(1) + " " + YB(ser[0][q]).toFixed(1);
      }
      S("path", { d: dd, fill: "none", stroke: ser[1], "stroke-width": 2.2 }, gB);
    });
    S("line", { x1: mb.l, x2: mb.l + bpw, y1: mb.t + bph, y2: mb.t + bph, stroke: "#b9c1cc" }, gB);
    for (var ut = -3; ut <= 3; ut++) S("text", { x: XB(ut), y: mb.t + bph + 14, "text-anchor": "middle", "class": "t-xs" }, gB, (ut < 0 ? "−" : "") + Math.abs(ut));
    S("text", { x: mb.l + bpw / 2, y: hB - 6, "text-anchor": "middle", "class": "t-sm" }, gB, "polygenic score (SD units)");
    S("line", { x1: mb.l + 4, x2: mb.l + 20, y1: mb.t + 10, y2: mb.t + 10, stroke: "#59a14f", "stroke-width": 2.2 }, gB);
    S("text", { x: mb.l + 24, y: mb.t + 14, "class": "t-xs" }, gB, "controls");
    S("line", { x1: mb.l + 4, x2: mb.l + 20, y1: mb.t + 26, y2: mb.t + 26, stroke: "#e15759", "stroke-width": 2.2 }, gB);
    S("text", { x: mb.l + 24, y: mb.t + 30, "class": "t-xs" }, gB, "cases");
    // --- panel C: ROC
    var cx0 = narrow ? 0 : bW + 16, cy0 = narrow ? topB + hB + 18 : topB;
    var gC = S("g", { transform: "translate(" + cx0 + " " + cy0 + ")" }, svg);
    var mc = { l: 40, r: 10, t: 22, b: 34 }, side = Math.min(cW - mc.l - mc.r, hB - mc.t - mc.b);
    function XC(v) { return mc.l + side * v; }
    function YC(v) { return mc.t + side * (1 - v); }
    S("text", { x: mc.l, y: 14, "class": "t-sm", style: "fill:#1d2127;font-weight:700" }, gC, "C  ROC curve");
    S("rect", { x: XC(0), y: YC(1), width: side, height: side, fill: "none", stroke: "#b9c1cc" }, gC);
    S("line", { x1: XC(0), y1: YC(0), x2: XC(1), y2: YC(1), stroke: "#8a93a0", "stroke-dasharray": "4 3" }, gC);
    var dr = "";
    for (var r = lm.u.length - 1; r >= 0; r -= 4) dr += (dr ? "L" : "M") + XC(lm.fpr[r]).toFixed(1) + " " + YC(lm.tpr[r]).toFixed(1);
    dr += "L" + XC(1) + " " + YC(1);
    S("path", { d: dr, fill: "none", stroke: "#0a62c2", "stroke-width": 2.4 }, gC);
    [0, 0.5, 1].forEach(function (v) {
      S("text", { x: XC(v), y: YC(0) + 14, "text-anchor": "middle", "class": "t-xs" }, gC, v.toFixed(1));
      S("text", { x: XC(0) - 5, y: YC(v) + 4, "text-anchor": "end", "class": "t-xs" }, gC, v.toFixed(1));
    });
    S("text", { x: XC(0.5), y: YC(0) + 28, "text-anchor": "middle", "class": "t-xs" }, gC, "false-positive rate");
    S("text", { x: XC(0) - 28, y: YC(0.5), "text-anchor": "middle", "class": "t-xs", transform: "rotate(-90 " + (XC(0) - 28) + " " + YC(0.5) + ")" }, gC, "true-positive rate");
    S("text", { x: XC(0.55), y: YC(0.18), "class": "t-sm", style: "fill:#1d2127;font-weight:700" }, gC, "AUC = " + lm.auc.toFixed(3));

    readout.innerHTML =
      "<div>Expected R² = " + R2.toFixed(3) + " (" + (100 * R2 / st.h2).toFixed(0) + "% of the ceiling h²); AUC = " + lm.auc.toFixed(3) + "</div>" +
      "<div>Absolute risk: " + (100 * lm.riskTop).toFixed(1) + "% in the top 10% of scores vs " + (100 * lm.riskRest).toFixed(1) + "% in the other 90% (population: " + Math.round(100 * st.K) + "%)</div>" +
      "<div>Relative risk " + lm.rrTop.toFixed(2) + ", odds ratio " + lm.orTop.toFixed(2) + " (top 10% vs rest); the top 10% holds " + (100 * lm.shareCasesTop).toFixed(0) + "% of all cases</div>";
  }

  sH.input.addEventListener("input", function () { st.h2 = +sH.input.value; schedule(); });
  sM.input.addEventListener("input", function () { st.M = round2(mapM.val(+sM.input.value)); schedule(); });
  sN.input.addEventListener("input", function () { st.N = round2(mapN.val(+sN.input.value)); schedule(); });
  sK.input.addEventListener("input", function () { st.K = +sK.input.value; schedule(); });
  var lastW = 0;
  function onResize() { var w = chart.clientWidth; if (w !== lastW) { lastW = w; schedule(); } }
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(onResize).observe(chart);
  else window.addEventListener("resize", onResize);
  draw();
})();
