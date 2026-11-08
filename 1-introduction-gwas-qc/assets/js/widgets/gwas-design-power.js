/* gwas-design-power.js — power of a GWAS to detect one SNP (page gwas-design, widget #w-power).

   Shows the probability that a test of one SNP reaches the chosen significance threshold, as a
   function of the number of people, for a quantitative trait or a case–control study, and the
   number of people needed for 80% power.

   Formulas (two-sided Wald test; the statistic z is approximately normal with mean λ and variance 1):
     power = Q(c − λ) + Q(c + λ),  c = Q⁻¹(α/2),  λ = √NCP,  Q(x) = P(Z > x) for a standard normal Z.
   Quantitative trait (trait scaled to variance 1, additive model, effect β trait SDs per allele):
     q² = 2p(1 − p)β²  (share of trait variance explained by the SNP)
     NCP = N q² / (1 − q²)   (= N · 2p(1 − p)β² / σ², σ² = residual variance 1 − q²)
   Case–control (allelic test, as in CaTS and the GAS power calculator):
     p₁ = OR p₀ / (1 + p₀(OR − 1))   (effect-allele frequency in cases; p₀ = in controls)
     NCP = (p₁ − p₀)² / [ p₁(1 − p₁)/(2N₁) + p₀(1 − p₀)/(2N₀) ],  N₁ = φN cases, N₀ = (1 − φ)N controls.
   NCP is proportional to N in both models, so the N for a target power is NCP*(α, power) / (NCP per person).
   Checked in Node against the closed form N₈₀ = (c + 0.8416)² (1 − q²)/q² and against the GAS calculator's
   default example (1,000 cases, 1,000 controls, case/control frequencies 0.600/0.489, α = 7×10⁻⁶ → power 0.995). */
(function () {
  "use strict";

  /* ---------- numerics ---------- */
  var SQRT_PI = Math.sqrt(Math.PI), LN_SQRT_PI = 0.5 * Math.log(Math.PI);
  function erfcPos(x) { // erfc(x) for x >= 0, returned as {v, ln}
    if (x < 2) {
      var sum = x, term = x, x2 = x * x;
      for (var n = 1; n < 200; n++) {
        term *= -x2 / n;
        var add = term / (2 * n + 1);
        sum += add;
        if (Math.abs(add) < 1e-17 * Math.abs(sum)) break;
      }
      var v = 1 - 2 / SQRT_PI * sum;
      return { v: v, ln: Math.log(v) };
    }
    var tiny = 1e-300, f = x, C = x, D = 0; // continued fraction (modified Lentz)
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
  function normSf(z) { return z >= 0 ? 0.5 * erfcPos(z / Math.SQRT2).v : 1 - 0.5 * erfcPos(-z / Math.SQRT2).v; }
  function lnNormSf(z) { return z >= 0 ? erfcPos(z / Math.SQRT2).ln - Math.LN2 : Math.log(normSf(z)); }
  function normPdf(z) { return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI); }
  function qnormUpper(q) { // z with Q(z) = q
    if (q <= 0) return Infinity;
    if (q >= 1) return -Infinity;
    if (q > 0.5) return -qnormUpper(1 - q);
    var t = Math.sqrt(-2 * Math.log(q));
    var z = t - (2.515517 + 0.802853 * t + 0.010328 * t * t) / (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t);
    var lq = Math.log(q);
    for (var i = 0; i < 10; i++) {
      var lQ = lnNormSf(z);
      var dz = (lQ - lq) * Math.exp(lQ) / normPdf(z);
      z += dz;
      if (Math.abs(dz) < 1e-13) break;
    }
    return z;
  }

  function zCrit(alpha) { return qnormUpper(alpha / 2); }
  function powerFromNcp(ncp, alpha) {
    var c = zCrit(alpha), l = Math.sqrt(Math.max(ncp, 0));
    return normSf(c - l) + normSf(c + l);
  }
  /* NCP that gives the target power (bisection on λ; power increases with λ). */
  function ncpForPower(target, alpha) {
    var lo = 0, hi = 60;
    for (var i = 0; i < 200; i++) {
      var mid = 0.5 * (lo + hi);
      if (powerFromNcp(mid * mid, alpha) < target) lo = mid; else hi = mid;
    }
    var l = 0.5 * (lo + hi);
    return l * l;
  }
  function qtVarExplained(p, beta) { return 2 * p * (1 - p) * beta * beta; }
  function qtNcpPerPerson(p, beta) { var q2 = qtVarExplained(p, beta); return q2 / (1 - q2); }
  function caseFreq(p0, OR) { return OR * p0 / (1 + p0 * (OR - 1)); }
  function ccNcpPerPerson(p0, OR, phi) {
    var p1 = caseFreq(p0, OR), d = p1 - p0;
    return d * d / (p1 * (1 - p1) / (2 * phi) + p0 * (1 - p0) / (2 * (1 - phi)));
  }
  function nForPower(target, alpha, ncpPerPerson) { return ncpForPower(target, alpha) / ncpPerPerson; }

  var api = { normSf: normSf, qnormUpper: qnormUpper, zCrit: zCrit, powerFromNcp: powerFromNcp, ncpForPower: ncpForPower,
    qtVarExplained: qtVarExplained, qtNcpPerPerson: qtNcpPerPerson, caseFreq: caseFreq, ccNcpPerPerson: ccNcpPerPerson,
    nForPower: nForPower };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  /* ---------- user interface ---------- */
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
  function fmtInt(x) { return Math.round(x).toLocaleString("en-US"); }
  function fmtN(x) {
    if (!isFinite(x)) return "more than 10 billion";
    if (x > 1e10) return "more than 10 billion";
    if (x >= 1e6) return (x / 1e6).toFixed(x >= 1e7 ? 0 : 1) + " million";
    return fmtInt(x);
  }
  function fmtPct(x) {
    var v = 100 * x;
    if (v >= 99.95) return "> 99.9%";
    if (v < 0.1) return "< 0.1%";
    return v.toFixed(v < 10 ? 1 : 0) + "%";
  }
  var SUP = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
  function fmtAlpha(a) {
    if (a >= 0.001) return String(a);
    var e = Math.floor(Math.log10(a) + 1e-9), m = a / Math.pow(10, e);
    var es = String(e).split("").map(function (ch) { return SUP[ch]; }).join("");
    return (Math.abs(m - 1) < 1e-9 ? "1" : String(+m.toFixed(2))) + "×10" + es;
  }
  function logMap(min, max) { // slider position 0..1000 <-> value on a log scale
    var a = Math.log(min), b = Math.log(max);
    return { val: function (i) { return Math.exp(a + (b - a) * i / 1000); }, pos: function (v) { return Math.round(1000 * (Math.log(v) - a) / (b - a)); } };
  }

  var root = document.getElementById("w-power");
  if (!root) return;
  var body = root.querySelector(".widget-body");
  if (!body) return;

  var mapBeta = logMap(0.005, 0.5), mapOR = logMap(1.01, 4), mapN = logMap(100, 1e7);
  var st = { mode: "qt", p: 0.3, beta: 0.05, p0: 0.3, OR: 1.2, phi: 0.5, N: 20000, alpha: 5e-8 };

  var modeRow = H("div", { "class": "controls", role: "group", "aria-label": "Trait type" }, body);
  H("span", null, modeRow, "<strong>Trait</strong>");
  var bQT = H("button", { type: "button", "class": "btn", "aria-pressed": "true" }, modeRow, "Quantitative (for example LDL cholesterol)");
  var bCC = H("button", { type: "button", "class": "btn", "aria-pressed": "false" }, modeRow, "Case–control (disease yes/no)");

  function slider(parent, label, min, max, step, value, id) {
    var lab = H("label", { "for": id }, parent);
    H("span", null, lab, label);
    var inp = H("input", { type: "range", id: id, min: min, max: max, step: step, value: value }, lab);
    var out = H("output", { "for": id, "class": "pw-val" }, lab);
    return { input: inp, out: out, label: lab };
  }
  var qtRow = H("div", { "class": "controls" }, body);
  var sP = slider(qtRow, "Effect-allele frequency p", 0.01, 0.5, 0.01, st.p, "pw-p");
  var sB = slider(qtRow, "Effect β (trait SDs per allele)", 0, 1000, 1, mapBeta.pos(st.beta), "pw-beta");
  var ccRow = H("div", { "class": "controls" }, body);
  var sP0 = slider(ccRow, "Effect-allele frequency in controls p₀", 0.01, 0.5, 0.01, st.p0, "pw-p0");
  var sOR = slider(ccRow, "Odds ratio per allele", 0, 1000, 1, mapOR.pos(st.OR), "pw-or");
  var sPhi = slider(ccRow, "Share of cases φ", 0.05, 0.95, 0.05, st.phi, "pw-phi");
  var nRow = H("div", { "class": "controls" }, body);
  var sN = slider(nRow, "People N", 0, 1000, 1, mapN.pos(st.N), "pw-n");
  var labA = H("label", { "for": "pw-alpha" }, nRow);
  H("span", null, labA, "Threshold α");
  var selA = H("select", { id: "pw-alpha" }, labA);
  [[5e-8, "5×10⁻⁸ (genome-wide)"], [5e-9, "5×10⁻⁹ (stricter, for sequencing)"], [1e-5, "1×10⁻⁵ (suggestive)"], [0.05, "0.05 (one pre-specified test)"]].forEach(function (o) {
    var opt = H("option", { value: String(o[0]) }, selA, o[1]);
    if (o[0] === st.alpha) opt.selected = true;
  });

  var presetRow = H("div", { "class": "controls" }, body);
  H("span", null, presetRow, "<strong>Try</strong>");
  var presets = [
    ["β = 0.02 SD, p = 0.3", { mode: "qt", p: 0.3, beta: 0.02 }],
    ["β = 0.1 SD, p = 0.1", { mode: "qt", p: 0.1, beta: 0.1 }],
    ["OR 1.1, p₀ = 0.3", { mode: "cc", p0: 0.3, OR: 1.1, phi: 0.5 }],
    ["OR 3, p₀ = 0.2", { mode: "cc", p0: 0.2, OR: 3, phi: 0.5 }]
  ];
  presets.forEach(function (pr) {
    var b = H("button", { type: "button", "class": "btn" }, presetRow, pr[0]);
    b.addEventListener("click", function () {
      for (var k in pr[1]) if (Object.prototype.hasOwnProperty.call(pr[1], k)) st[k] = pr[1][k];
      syncInputs(); schedule();
    });
  });

  var chartBox = H("div", { "class": "pw-chart" }, body);
  var legend = H("p", { "class": "note pw-legend" }, body);
  var readout = H("div", { "class": "readout", "aria-live": "polite" }, body);
  H("p", { "class": "note" }, body, "Computed from the formulas on this page (normal approximation to the Wald test, additive model). Real studies lose some power to imperfect tagging of the causal SNP, imputation error and covariates; dedicated calculators such as CaTS, GAS or GPC add these details.");

  function syncInputs() {
    sP.input.value = st.p; sB.input.value = mapBeta.pos(st.beta);
    sP0.input.value = st.p0; sOR.input.value = mapOR.pos(st.OR); sPhi.input.value = st.phi;
    sN.input.value = mapN.pos(st.N);
    bQT.setAttribute("aria-pressed", st.mode === "qt" ? "true" : "false");
    bCC.setAttribute("aria-pressed", st.mode === "cc" ? "true" : "false");
    bQT.classList.toggle("primary", st.mode === "qt");
    bCC.classList.toggle("primary", st.mode === "cc");
    qtRow.style.display = st.mode === "qt" ? "" : "none";
    ccRow.style.display = st.mode === "cc" ? "" : "none";
  }

  function ncpPerPerson() { return st.mode === "qt" ? qtNcpPerPerson(st.p, st.beta) : ccNcpPerPerson(st.p0, st.OR, st.phi); }

  var raf = 0;
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }

  function draw() {
    sP.out.textContent = st.p.toFixed(2);
    sB.out.textContent = st.beta < 0.1 ? st.beta.toFixed(3) : st.beta.toFixed(2);
    sP0.out.textContent = st.p0.toFixed(2);
    sOR.out.textContent = st.OR.toFixed(2);
    sPhi.out.textContent = st.phi.toFixed(2);
    sN.out.textContent = fmtInt(st.N);

    var k = ncpPerPerson();
    var alphas = st.alpha === 0.05 ? [st.alpha] : [st.alpha, 0.05];
    var W = Math.max(280, Math.floor(chartBox.clientWidth || body.clientWidth || 600));
    var Hh = W < 480 ? 230 : 260;
    var m = { l: 46, r: 14, t: 12, b: 42 };
    var pw = W - m.l - m.r, ph = Hh - m.t - m.b;
    var lx0 = 2, lx1 = 7;
    function X(n) { return m.l + pw * (Math.log10(n) - lx0) / (lx1 - lx0); }
    function Y(pow) { return m.t + ph * (1 - pow); }

    chartBox.innerHTML = "";
    var power = powerFromNcp(k * st.N, st.alpha);
    var n80 = nForPower(0.8, st.alpha, k), n80b = nForPower(0.8, 0.05, k);
    var svg = S("svg", { width: W, height: Hh, viewBox: "0 0 " + W + " " + Hh, role: "img",
      "aria-label": "Power curve: power against number of people on a log scale. At N = " + fmtInt(st.N) + " the power is " + fmtPct(power) + "." }, chartBox);
    // grid and axes
    for (var e = lx0; e <= lx1; e++) {
      var x = X(Math.pow(10, e));
      S("line", { x1: x, x2: x, y1: m.t, y2: m.t + ph, stroke: "#e3e7ec" }, svg);
      var lab = ["100", "1k", "10k", "100k", "1M", "10M"][e - 2];
      S("text", { x: x, y: m.t + ph + 16, "text-anchor": "middle", "class": "t-sm" }, svg, lab);
    }
    for (var j = 0; j <= 5; j++) {
      var yy = Y(j / 5);
      S("line", { x1: m.l, x2: m.l + pw, y1: yy, y2: yy, stroke: j === 4 ? "#b9c1cc" : "#e3e7ec", "stroke-dasharray": j === 4 ? "5 4" : null }, svg);
      S("text", { x: m.l - 6, y: yy + 4, "text-anchor": "end", "class": "t-sm" }, svg, (20 * j) + "%");
    }
    S("text", { x: m.l + pw / 2, y: Hh - 6, "text-anchor": "middle", "class": "t-sm" }, svg, "people in the study, N (log scale)");
    S("text", { x: 12, y: m.t + ph / 2, "text-anchor": "middle", "class": "t-sm", transform: "rotate(-90 12 " + (m.t + ph / 2) + ")" }, svg, "power");
    // curves
    alphas.forEach(function (a, idx) {
      var d = "";
      for (var i = 0; i <= 240; i++) {
        var ln = lx0 + (lx1 - lx0) * i / 240, n = Math.pow(10, ln);
        var pwr = powerFromNcp(k * n, a);
        d += (i ? "L" : "M") + X(n).toFixed(1) + " " + Y(pwr).toFixed(1);
      }
      S("path", { d: d, fill: "none", stroke: idx === 0 ? "var(--accent)" : "#8a93a0", "stroke-width": idx === 0 ? 2.6 : 1.8, "stroke-dasharray": idx === 0 ? null : "6 4" }, svg);
    });
    // N80 guide for the chosen alpha
    if (n80 >= 100 && n80 <= 1e7) {
      S("line", { x1: X(n80), x2: X(n80), y1: Y(0.8), y2: m.t + ph, stroke: "var(--accent)", "stroke-dasharray": "2 3" }, svg);
    }
    // chosen N
    var xn = X(st.N);
    S("line", { x1: xn, x2: xn, y1: m.t, y2: m.t + ph, stroke: "#1d2127", "stroke-width": 1 }, svg);
    S("circle", { cx: xn, cy: Y(power), r: 5, fill: "var(--accent)", stroke: "#fff", "stroke-width": 1.5 }, svg);
    var tx = xn + 6, anchor = "start";
    if (xn > m.l + pw - 70) { tx = xn - 6; anchor = "end"; }
    S("text", { x: tx, y: m.t + 12, "text-anchor": anchor, "class": "t-sm", stroke: "#fff", "stroke-width": 4, "paint-order": "stroke", style: "fill:#1d2127" }, svg, "your N");

    legend.innerHTML = '<svg width="26" height="10" aria-hidden="true"><line x1="0" y1="5" x2="26" y2="5" stroke="#0a62c2" stroke-width="2.6"/></svg> α = ' + fmtAlpha(st.alpha) +
      (alphas.length > 1 ? ' &nbsp; <svg width="26" height="10" aria-hidden="true"><line x1="0" y1="5" x2="26" y2="5" stroke="#8a93a0" stroke-width="1.8" stroke-dasharray="6 4"/></svg> α = 0.05 (one test, for comparison)' : "") +
      ' &nbsp; dashed gray line: 80% power';

    var lines = [];
    if (st.mode === "qt") {
      var q2 = qtVarExplained(st.p, st.beta);
      lines.push("Variance explained by the SNP 2p(1−p)β² = " + (100 * q2 < 0.01 ? (100 * q2).toFixed(4) : (100 * q2).toFixed(3)) + "% of the trait variance");
    } else {
      var p1 = caseFreq(st.p0, st.OR);
      lines.push("Effect-allele frequency: controls " + st.p0.toFixed(3) + ", cases " + p1.toFixed(3) + " (" + fmtInt(st.phi * st.N) + " cases, " + fmtInt((1 - st.phi) * st.N) + " controls)");
    }
    var ncp = k * st.N;
    lines.push("NCP = " + (ncp < 100 ? ncp.toFixed(1) : fmtInt(ncp)) + ", expected |z| ≈ " + Math.sqrt(ncp).toFixed(2) + ", threshold |z| > " + zCrit(st.alpha).toFixed(2));
    lines.push("Power at N = " + fmtInt(st.N) + ": " + fmtPct(power));
    lines.push("People needed for 80% power: " + fmtN(n80) + " at α = " + fmtAlpha(st.alpha) + (st.alpha !== 0.05 ? "; " + fmtN(n80b) + " at α = 0.05" : ""));
    readout.innerHTML = lines.map(function (s) { return "<div>" + s + "</div>"; }).join("");
  }

  bQT.addEventListener("click", function () { st.mode = "qt"; syncInputs(); schedule(); });
  bCC.addEventListener("click", function () { st.mode = "cc"; syncInputs(); schedule(); });
  sP.input.addEventListener("input", function () { st.p = +sP.input.value; schedule(); });
  sB.input.addEventListener("input", function () { st.beta = mapBeta.val(+sB.input.value); schedule(); });
  sP0.input.addEventListener("input", function () { st.p0 = +sP0.input.value; schedule(); });
  sOR.input.addEventListener("input", function () { st.OR = mapOR.val(+sOR.input.value); schedule(); });
  sPhi.input.addEventListener("input", function () { st.phi = +sPhi.input.value; schedule(); });
  sN.input.addEventListener("input", function () {
    var v = mapN.val(+sN.input.value);
    var mag = Math.pow(10, Math.floor(Math.log10(v)) - 1);
    st.N = Math.round(v / mag) * mag; // two significant digits
    schedule();
  });
  selA.addEventListener("change", function () { st.alpha = +selA.value; schedule(); });
  var lastW = 0;
  function onResize() { var w = chartBox.clientWidth; if (w !== lastW) { lastW = w; schedule(); } }
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(onResize).observe(chartBox);
  else window.addEventListener("resize", onResize);

  syncInputs();
  draw();
})();
