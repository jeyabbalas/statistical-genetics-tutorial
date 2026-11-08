/* gwas-analysis-finemap.js — statistical fine-mapping of one locus (page gwas-analysis, widget #w-finemap).

   A simulated locus of 25 SNPs with one causal SNP. Linkage disequilibrium (LD) follows a Markov chain:
   neighboring SNPs j and j+1 have genotype correlation ℓ_j, so the correlation between SNPs i < k is
   R_ik = ℓ_i ℓ_(i+1) … ℓ_(k−1). The slider sets ℓ between the causal SNP and its right-hand neighbor.
   GWAS z-scores:  z = μ R[·, c] + ε,  ε ~ Normal(0, R)   (μ = expected z at the causal SNP c;
   ε is drawn along the chain: ε_1 ~ N(0, 1), ε_(j+1) = ℓ_j ε_j + √(1 − ℓ_j²) η_j).
   Fine-mapping with Wakefield's approximate Bayes factor (ABF) under "exactly one causal SNP":
     r = W / (V + W)   (prior variance W of the true effect, sampling variance V of its estimate; r = 0.99 here)
     ln ABF_j = ½ ln(1 − r) + r z_j² / 2
     PIP_j = ABF_j / Σ_k ABF_k   (posterior inclusion probability, equal prior for every SNP)
   95% credible set: SNPs sorted by PIP, added until their PIPs sum to at least 0.95.
   Plots follow LocusZoom conventions: −log10 p against position, colored by r² with the lead SNP.
   Simulated data from a seeded generator (mulberry32). */
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

  var J = 25, CAUSAL = 11; // 0-based index of the causal SNP (SNP 12)
  /* Fixed background LD: high within a block around the causal SNP, lower across two recombination hot spots. */
  function baseLinks() {
    var rnd = mulberry32(31337), l = [];
    for (var j = 0; j < J - 1; j++) l.push(0.80 + 0.17 * rnd());
    l[5] = 0.35; l[17] = 0.30; // hot spots between SNPs 6–7 and 18–19
    return l;
  }
  function corrMatrix(links) {
    var R = [];
    for (var i = 0; i < J; i++) { R.push(new Array(J)); R[i][i] = 1; }
    for (var a = 0; a < J; a++) {
      var c = 1;
      for (var b = a + 1; b < J; b++) { c *= links[b - 1]; R[a][b] = c; R[b][a] = c; }
    }
    return R;
  }
  function simulateZ(links, R, mu, seed) {
    var rn = normalGen(mulberry32(seed)), e = new Array(J);
    e[0] = rn();
    for (var j = 1; j < J; j++) e[j] = links[j - 1] * e[j - 1] + Math.sqrt(1 - links[j - 1] * links[j - 1]) * rn();
    var z = new Array(J);
    for (var k = 0; k < J; k++) z[k] = mu * R[k][CAUSAL] + e[k];
    return z;
  }
  function abfPip(z, r) {
    var lab = z.map(function (x) { return 0.5 * Math.log(1 - r) + r * x * x / 2; });
    var mx = Math.max.apply(null, lab);
    var w = lab.map(function (x) { return Math.exp(x - mx); });
    var s = w.reduce(function (a, b) { return a + b; }, 0);
    return { lnABF: lab, pip: w.map(function (x) { return x / s; }) };
  }
  function credibleSet(pip, level) {
    var idx = pip.map(function (p, i) { return i; }).sort(function (a, b) { return pip[b] - pip[a]; });
    var set = [], cum = 0;
    for (var k = 0; k < idx.length && cum < level; k++) { set.push(idx[k]); cum += pip[idx[k]]; }
    return { set: set, cum: cum };
  }
  function log10P(z) { // two-sided, normal
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

  var api = { mulberry32: mulberry32, baseLinks: baseLinks, corrMatrix: corrMatrix, simulateZ: simulateZ, abfPip: abfPip, credibleSet: credibleSet, log10P: log10P, J: J, CAUSAL: CAUSAL };
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
  function fmtP(l10) {
    if (l10 > -3) return Math.pow(10, l10).toFixed(3);
    var e = Math.floor(l10), m = Math.pow(10, l10 - e);
    if (m >= 9.95) { m = 1; e += 1; }
    return m.toFixed(1) + "×10" + String(e).split("").map(function (ch) { return SUP[ch]; }).join("");
  }
  /* LocusZoom r² colors */
  function ldColor(r2) { return r2 >= 0.8 ? "#d43f3a" : r2 >= 0.6 ? "#eea236" : r2 >= 0.4 ? "#5cb85c" : r2 >= 0.2 ? "#46b8da" : "#357ebd"; }

  var root = document.getElementById("w-finemap");
  if (!root) return;
  var body = root.querySelector(".widget-body");
  if (!body) return;

  var R_PRIOR = 0.99;
  var st = { mu: 7, link: 0.9, seed: 4, reveal: false };
  var c1 = H("div", { "class": "controls" }, body);
  function slider(parent, label, min, max, step, value, id) {
    var lab = H("label", { "for": id }, parent);
    H("span", null, lab, label);
    var inp = H("input", { type: "range", id: id, min: min, max: max, step: step, value: value }, lab);
    var out = H("output", { "for": id }, lab);
    return { input: inp, out: out };
  }
  var sMu = slider(c1, "Signal: expected z at the causal SNP", 2, 14, 0.5, st.mu, "fm-mu");
  var sL = slider(c1, "LD (r) between SNP 12 and SNP 13", 0.5, 0.999, 0.001, st.link, "fm-l");
  var c2 = H("div", { "class": "controls" }, body);
  var bNew = H("button", { type: "button", "class": "btn" }, c2, "New sample");
  var lr = H("label", { "for": "fm-rev" }, c2);
  var cb = H("input", { type: "checkbox", id: "fm-rev" }, lr); H("span", null, lr, "Reveal the causal SNP");
  var chart = H("div", { "class": "fm-chart" }, body);
  var readout = H("div", { "class": "readout", "aria-live": "polite" }, body);
  H("p", { "class": "note" }, body, "Simulated locus (seeded). Fine-mapping here assumes exactly one causal SNP and uses only the z-scores and the LD matrix, as summary-statistic methods do; SuSiE and FINEMAP relax the one-causal-SNP assumption.");

  var raf = 0;
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }

  function draw() {
    sMu.out.textContent = st.mu.toFixed(1);
    sL.out.textContent = st.link.toFixed(3) + " (r² " + (st.link * st.link).toFixed(2) + ")";
    var links = baseLinks(); links[CAUSAL] = st.link;
    var R = corrMatrix(links), z = simulateZ(links, R, st.mu, 500 + st.seed);
    var fm = abfPip(z, R_PRIOR), cs = credibleSet(fm.pip, 0.95);
    var lp = z.map(function (x) { return -log10P(x); });
    var lead = 0; for (var j = 1; j < J; j++) if (lp[j] > lp[lead]) lead = j;
    var inSet = {}; cs.set.forEach(function (k) { inSet[k] = true; });

    var W = Math.max(290, Math.floor(chart.clientWidth || body.clientWidth || 640));
    var m = { l: 44, r: 12 }, pw = W - m.l - m.r;
    var h1 = W < 480 ? 170 : 200, h2 = W < 480 ? 120 : 140, gap = 34;
    var top1 = 22, top2 = top1 + h1 + gap + 14, Ht = top2 + h2 + 46;
    var colW = pw / J;
    function X(j) { return m.l + colW * (j + 0.5); }
    var ymax = Math.max(8, Math.ceil(lp[lead] + 1));
    function Y1(v) { return top1 + h1 * (1 - Math.min(v, ymax) / ymax); }
    function Y2(v) { return top2 + h2 * (1 - v); }
    chart.innerHTML = "";
    var svg = S("svg", { width: W, height: Ht, viewBox: "0 0 " + W + " " + Ht, role: "img",
      "aria-label": "Regional association plot of 25 SNPs colored by LD with the lead SNP, and the posterior inclusion probability of each SNP with the 95% credible set highlighted." }, chart);
    S("text", { x: m.l, y: 14, "class": "t-sm", style: "fill:#1d2127;font-weight:700" }, svg, "GWAS association at the locus");
    var ystep = ymax <= 10 ? 2 : ymax <= 24 ? 4 : 10;
    for (var yv = 0; yv <= ymax; yv += ystep) {
      S("line", { x1: m.l, x2: m.l + pw, y1: Y1(yv), y2: Y1(yv), stroke: "#eef1f4" }, svg);
      S("text", { x: m.l - 6, y: Y1(yv) + 4, "text-anchor": "end", "class": "t-sm" }, svg, String(yv));
    }
    S("text", { x: 12, y: top1 + h1 / 2, "text-anchor": "middle", "class": "t-sm", transform: "rotate(-90 12 " + (top1 + h1 / 2) + ")" }, svg, "−log10 p");
    if (7.30103 < ymax) {
      S("line", { x1: m.l, x2: m.l + pw, y1: Y1(7.30103), y2: Y1(7.30103), stroke: "#b42318", "stroke-dasharray": "2 3" }, svg);
    }
    for (var k = 0; k < J; k++) {
      var r2 = R[k][lead] * R[k][lead];
      if (k === lead) S("path", { d: "M" + X(k) + " " + (Y1(lp[k]) - 7) + "l7 7l-7 7l-7 -7z", fill: "#7b3294", stroke: "#1d2127" }, svg);
      else S("circle", { cx: X(k), cy: Y1(lp[k]), r: 5, fill: ldColor(r2), stroke: "#1d2127", "stroke-width": 0.6 }, svg);
      if (st.reveal && k === CAUSAL) S("circle", { cx: X(k), cy: Y1(lp[k]), r: 10, fill: "none", stroke: "#1d2127", "stroke-width": 1.6, "stroke-dasharray": "3 2" }, svg);
    }
    // r2 legend (top right)
    var lgx = m.l + pw - 5 * 30 - 30, lgy = 6;
    if (W >= 420) {
      S("text", { x: lgx - 4, y: lgy + 9, "text-anchor": "end", "class": "t-xs" }, svg, "r² with lead");
      [[0.1, "<.2"], [0.3, ".2"], [0.5, ".4"], [0.7, ".6"], [0.9, ".8+"]].forEach(function (b, i) {
        S("rect", { x: lgx + i * 30, y: lgy, width: 12, height: 10, fill: ldColor(b[0]) }, svg);
        S("text", { x: lgx + i * 30 + 14, y: lgy + 9, "class": "t-xs" }, svg, b[1]);
      });
      S("path", { d: "M" + (lgx + 152) + " " + (lgy) + "l5 5l-5 5l-5 -5z", fill: "#7b3294" }, svg);
      S("text", { x: lgx + 160, y: lgy + 9, "class": "t-xs" }, svg, "lead");
    }
    // PIP panel
    S("text", { x: m.l, y: top2 - 10, "class": "t-sm", style: "fill:#1d2127;font-weight:700" }, svg, "Fine-mapping: posterior inclusion probability (PIP)");
    [0, 0.5, 1].forEach(function (v) {
      S("line", { x1: m.l, x2: m.l + pw, y1: Y2(v), y2: Y2(v), stroke: "#eef1f4" }, svg);
      S("text", { x: m.l - 6, y: Y2(v) + 4, "text-anchor": "end", "class": "t-sm" }, svg, v.toFixed(1));
    });
    for (var k2 = 0; k2 < J; k2++) {
      var pp = fm.pip[k2];
      S("rect", { x: X(k2) - colW * 0.35, y: Y2(pp), width: colW * 0.7, height: Math.max(0.5, h2 * pp), fill: inSet[k2] ? "#1f5a96" : "#c9d3de" }, svg);
      if (st.reveal && k2 === CAUSAL) S("text", { x: X(k2), y: Y2(pp) - 6, "text-anchor": "middle", "class": "t-xs", style: "fill:#1d2127;font-weight:700" }, svg, "causal");
    }
    for (var k3 = 0; k3 < J; k3++) {
      if (colW >= 18 || k3 % 2 === 0) S("text", { x: X(k3), y: top2 + h2 + 14, "text-anchor": "middle", "class": "t-xs" }, svg, String(k3 + 1));
    }
    S("text", { x: m.l + pw / 2, y: top2 + h2 + 32, "text-anchor": "middle", "class": "t-sm" }, svg, "SNP, in chromosome order (dark bars: 95% credible set)");

    var setNames = cs.set.slice().sort(function (a, b) { return a - b; }).map(function (k4) { return "SNP " + (k4 + 1); });
    readout.innerHTML =
      "<div>Lead SNP: SNP " + (lead + 1) + ", p = " + fmtP(-lp[lead]) + ", PIP = " + fm.pip[lead].toFixed(3) + "</div>" +
      "<div>95% credible set: " + cs.set.length + " SNP" + (cs.set.length > 1 ? "s" : "") + " (" + setNames.join(", ") + "), total PIP " + cs.cum.toFixed(3) + "</div>" +
      (st.reveal ? "<div>The causal SNP is SNP " + (CAUSAL + 1) + ": PIP = " + fm.pip[CAUSAL].toFixed(3) + ", " + (inSet[CAUSAL] ? "inside" : "outside") + " the credible set" + (lead === CAUSAL ? "; it is also the lead SNP." : "; the lead SNP is a different SNP.") + "</div>" : "<div>Tick “Reveal the causal SNP” to check whether the credible set caught it.</div>");
  }

  sMu.input.addEventListener("input", function () { st.mu = +sMu.input.value; schedule(); });
  sL.input.addEventListener("input", function () { st.link = +sL.input.value; schedule(); });
  bNew.addEventListener("click", function () { st.seed++; schedule(); });
  cb.addEventListener("change", function () { st.reveal = cb.checked; schedule(); });
  var lastW = 0;
  function onResize() { var w = chart.clientWidth; if (w !== lastW) { lastW = w; schedule(); } }
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(onResize).observe(chart);
  else window.addEventListener("resize", onResize);
  draw();
})();
