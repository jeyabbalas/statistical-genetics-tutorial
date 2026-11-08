/* gwas-applications-winners-curse.js — the winner's curse (page gwas-applications, widget #w-winners-curse).

   Many SNPs with the same true effect are each estimated once in a discovery GWAS and once in an independent
   replication GWAS of the same size. Effects are in standard-error units: the estimate ẑ = β̂/SE is
   Normal(μ, 1), where μ = β/SE is the true effect divided by its standard error (the expected z).
   A SNP is "discovered" if |ẑ| > c, c = Q⁻¹(α/2). Theory (Z ~ Normal(μ, 1), Q = upper normal tail, φ = density):
     power             P(|Z| > c) = Q(c − μ) + Q(c + μ)
     mean |estimate| of discovered SNPs   E[|Z| : |Z| > c] = [μ(Q(c − μ) − Q(c + μ)) + φ(c − μ) + φ(c + μ)] / power
     mean replication estimate (in the discovery direction) = μ (Q(c − μ) − Q(c + μ)) / power
   The widget simulates 20,000 SNPs with a seeded generator (mulberry32) and compares with the theory. */
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
  function normPdf(z) { return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI); }
  function qnormUpper(q) {
    if (q > 0.5) return -qnormUpper(1 - q);
    var t = Math.sqrt(-2 * Math.log(q));
    var z = t - (2.515517 + 0.802853 * t + 0.010328 * t * t) / (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t);
    for (var i = 0; i < 20; i++) {
      var s = normSf(z), dz = (s - q) / normPdf(z);
      if (q < 1e-10) dz = (Math.log(s) - Math.log(q)) * s / normPdf(z);
      z += dz;
      if (Math.abs(dz) < 1e-12) break;
    }
    return z;
  }
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

  function theory(mu, c) {
    var a = normSf(c - mu), b = normSf(c + mu), power = a + b;
    return { power: power, meanAbs: (mu * (a - b) + normPdf(c - mu) + normPdf(c + mu)) / power, meanRep: mu * (a - b) / power };
  }
  function simulate(mu, c, R, seed) {
    var rn = normalGen(mulberry32(seed)), disc = new Float64Array(R), rep = new Float64Array(R);
    var nSig = 0, sAbs = 0, sRep = 0, nRepSig = 0;
    for (var i = 0; i < R; i++) {
      disc[i] = mu + rn(); rep[i] = mu + rn();
      if (Math.abs(disc[i]) > c) {
        nSig++; sAbs += Math.abs(disc[i]);
        var sg = disc[i] > 0 ? 1 : -1;
        sRep += sg * rep[i];
        if (sg * rep[i] > c) nRepSig++;
      }
    }
    return { disc: disc, rep: rep, nSig: nSig, meanAbs: nSig ? sAbs / nSig : NaN, meanRep: nSig ? sRep / nSig : NaN, repRate: nSig ? nRepSig / nSig : NaN };
  }

  var api = { normSf: normSf, qnormUpper: qnormUpper, theory: theory, simulate: simulate };
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
  function pct(x) { var v = 100 * x; return v >= 99.95 ? "> 99.9%" : v < 0.05 ? "< 0.1%" : v.toFixed(v < 10 ? 1 : 0) + "%"; }

  var root = document.getElementById("w-winners-curse");
  if (!root) return;
  var body = root.querySelector(".widget-body");
  if (!body) return;

  var R = 20000;
  var st = { mu: 4.5, alpha: 5e-8, seed: 1 };
  var c1 = H("div", { "class": "controls" }, body);
  var lm = H("label", { "for": "wc-mu" }, c1); H("span", null, lm, "True effect μ = β / SE (expected z)");
  var inMu = H("input", { type: "range", id: "wc-mu", min: 0, max: 10, step: 0.1, value: st.mu }, lm);
  var outMu = H("output", { "for": "wc-mu" }, lm);
  var la = H("label", { "for": "wc-alpha" }, c1); H("span", null, la, "Threshold");
  var selA = H("select", { id: "wc-alpha" }, la);
  [[5e-8, "p < 5×10⁻⁸"], [1e-5, "p < 1×10⁻⁵"], [0.05, "p < 0.05"]].forEach(function (o) { var op = H("option", { value: o[0] }, selA, o[1]); if (o[0] === st.alpha) op.selected = true; });
  var bNew = H("button", { type: "button", "class": "btn" }, c1, "New simulation");
  var chart = H("div", { "class": "wc-chart" }, body);
  function sw(kind, color) {
    return kind === "rect" ? '<svg width="12" height="12" aria-hidden="true"><rect x="1" y="1" width="10" height="10" fill="' + color + '"/></svg>' :
      '<svg width="18" height="12" aria-hidden="true"><line x1="0" y1="6" x2="18" y2="6" stroke="' + color + '" stroke-width="2"' + (kind === "dash" ? ' stroke-dasharray="4 3"' : "") + "/></svg>";
  }
  H("p", { "class": "note" }, body, [sw("rect", "#c9d3de") + " not significant", sw("rect", "#0a62c2") + " significant in the discovery GWAS",
    sw("line", "#1d7a4c") + " the same SNPs in the replication GWAS", sw("line", "#1d2127") + " true effect μ", sw("dash", "#b42318") + " threshold",
    sw("dash", "#0a62c2") + " mean of the significant estimates"].map(function (t) { return '<span style="white-space:nowrap;margin-right:12px">' + t + "</span>"; }).join(" "));
  var readout = H("div", { "class": "readout", "aria-live": "polite" }, body);
  H("p", { "class": "note" }, body, "Simulated (seeded): 20,000 SNPs that all have the same true effect, each estimated in a discovery GWAS and again in an independent replication GWAS of the same size. Estimates are shown in standard-error units, so the plot looks the same for any sample size.");

  var raf = 0;
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }

  function draw() {
    outMu.textContent = st.mu.toFixed(1);
    var c = qnormUpper(st.alpha / 2), th = theory(st.mu, c), sim = simulate(st.mu, c, R, 700 + st.seed);
    var W = Math.max(290, Math.floor(chart.clientWidth || body.clientWidth || 640));
    var Hh = W < 480 ? 240 : 270, m = { l: 48, r: 12, t: 10, b: 42 };
    var pw = W - m.l - m.r, ph = Hh - m.t - m.b;
    var xmax = Math.max(c + 2, st.mu + 4.5), bw = 0.25, nb = Math.ceil(xmax / bw);
    var hd = new Array(nb).fill(0), hs = new Array(nb).fill(0), hr = new Array(nb).fill(0);
    for (var i = 0; i < R; i++) {
      var a = Math.abs(sim.disc[i]), b = Math.min(nb - 1, Math.floor(a / bw));
      if (a > c) {
        hs[b]++;
        var rv = (sim.disc[i] > 0 ? 1 : -1) * sim.rep[i];
        if (rv >= 0 && rv < xmax) hr[Math.floor(rv / bw)]++;
      } else hd[b]++;
    }
    var ymax = 1;
    for (var k = 0; k < nb; k++) ymax = Math.max(ymax, hd[k] + hs[k], hr[k]);
    function X(v) { return m.l + pw * v / xmax; }
    function Y(v) { return m.t + ph * (1 - v / ymax); }
    chart.innerHTML = "";
    var svg = S("svg", { width: W, height: Hh, viewBox: "0 0 " + W + " " + Hh, role: "img",
      "aria-label": "Histogram of estimated effects in standard-error units for 20,000 SNPs with true effect " + st.mu.toFixed(1) + "; significant estimates average " + (isFinite(sim.meanAbs) ? sim.meanAbs.toFixed(2) : "none") + "." }, chart);
    for (var t = 0; t <= xmax; t += (xmax > 12 ? 2 : 1)) {
      S("line", { x1: X(t), x2: X(t), y1: m.t, y2: m.t + ph, stroke: "#eef1f4" }, svg);
      S("text", { x: X(t), y: m.t + ph + 15, "text-anchor": "middle", "class": "t-sm" }, svg, String(t));
    }
    S("text", { x: m.l + pw / 2, y: Hh - 8, "text-anchor": "middle", "class": "t-sm" }, svg, "|estimated effect| / SE");
    S("text", { x: 12, y: m.t + ph / 2, "text-anchor": "middle", "class": "t-sm", transform: "rotate(-90 12 " + (m.t + ph / 2) + ")" }, svg, "number of SNPs");
    [0, 0.5, 1].forEach(function (f) { var v = Math.round(ymax * f); S("text", { x: m.l - 6, y: Y(v) + 4, "text-anchor": "end", "class": "t-xs" }, svg, fmtInt(v)); });
    for (var k2 = 0; k2 < nb; k2++) {
      var x0 = X(k2 * bw), x1 = X((k2 + 1) * bw) - 0.6;
      if (hd[k2]) S("rect", { x: x0, y: Y(hd[k2]), width: Math.max(0.5, x1 - x0), height: m.t + ph - Y(hd[k2]), fill: "#c9d3de" }, svg);
      if (hs[k2]) S("rect", { x: x0, y: Y(hd[k2] + hs[k2]), width: Math.max(0.5, x1 - x0), height: Y(hd[k2]) - Y(hd[k2] + hs[k2]), fill: "#0a62c2" }, svg);
    }
    var dr = "";
    for (var k3 = 0; k3 < nb; k3++) {
      dr += (k3 ? "L" : "M") + X(k3 * bw).toFixed(1) + " " + Y(hr[k3]).toFixed(1) + "L" + X((k3 + 1) * bw).toFixed(1) + " " + Y(hr[k3]).toFixed(1);
    }
    S("path", { d: dr, fill: "none", stroke: "#1d7a4c", "stroke-width": 2 }, svg);
    // reference lines
    S("line", { x1: X(c), x2: X(c), y1: m.t - 4, y2: m.t + ph, stroke: "#b42318", "stroke-dasharray": "4 3", "stroke-width": 1.5 }, svg);
    S("line", { x1: X(st.mu), x2: X(st.mu), y1: m.t - 4, y2: m.t + ph, stroke: "#1d2127", "stroke-width": 2 }, svg);
    if (isFinite(sim.meanAbs)) S("line", { x1: X(sim.meanAbs), x2: X(sim.meanAbs), y1: m.t - 4, y2: m.t + ph, stroke: "#0a62c2", "stroke-dasharray": "6 3", "stroke-width": 2 }, svg);
    var lines = [];
    lines.push("Power (share of SNPs significant): theory " + pct(th.power) + ", simulated " + pct(sim.nSig / R) + " (" + fmtInt(sim.nSig) + " of " + fmtInt(R) + ")");
    if (sim.nSig === 0) lines.push("No SNP passed the threshold in this simulation.");
    else if (st.mu === 0) lines.push("The true effect is zero, so all " + fmtInt(sim.nSig) + " significant SNPs are false positives; their mean |estimate| is " + sim.meanAbs.toFixed(2) + " SE.");
    else {
      lines.push("Mean |estimate| of significant SNPs: " + sim.meanAbs.toFixed(2) + " SE (theory " + th.meanAbs.toFixed(2) + ") vs true " + st.mu.toFixed(1) + " SE: overestimated " + (th.meanAbs / st.mu).toFixed(2) + "-fold");
      lines.push("Same SNPs in the replication: mean estimate " + sim.meanRep.toFixed(2) + " SE (theory " + th.meanRep.toFixed(2) + "); " + pct(sim.repRate) + " significant again at the same threshold");
    }
    readout.innerHTML = lines.map(function (s) { return "<div>" + s + "</div>"; }).join("");
  }

  inMu.addEventListener("input", function () { st.mu = +inMu.value; schedule(); });
  selA.addEventListener("change", function () { st.alpha = +selA.value; schedule(); });
  bNew.addEventListener("click", function () { st.seed++; schedule(); });
  var lastW = 0;
  function onResize() { var w = chart.clientWidth; if (w !== lastW) { lastW = w; schedule(); } }
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(onResize).observe(chart);
  else window.addEventListener("resize", onResize);
  draw();
})();
