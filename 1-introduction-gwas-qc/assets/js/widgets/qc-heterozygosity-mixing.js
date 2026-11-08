/* Widget "Mix two people's DNA and call genotypes" (page: qc-heterozygosity.html, section #what-it-finds).
   Root element: <div class="widget" id="w-het-mix">.

   What it shows (simulated, seeded). A DNA sample from person A is contaminated with DNA from an unrelated
   person B. A genotyping array measures, at each SNP, the share of the signal that comes from allele B
   (the B allele frequency, BAF): 0 for AA, 0.5 for AB, 1 for BB. In a mixture with a fraction alpha of B's
   DNA, the measured value is the DNA-weighted average of the two people's values plus measurement noise:
       theta = (1 - alpha) * gA / 2 + alpha * gB / 2 + e,   e ~ Normal(0, 0.03^2),
   where gA, gB are the numbers of B alleles (0, 1, 2) carried by A and B.
   Simplified calling rule (a real array clusters each SNP across many people and leaves low-confidence
   calls missing): AA if theta < 0.15, AB if 0.3 <= theta <= 0.7, BB if theta > 0.85, no call otherwise.
   SNPs: M = 20,000 with allele frequency p ~ Uniform(0.05, 0.95); genotypes of A and B are drawn
   independently under Hardy-Weinberg proportions. 300 of the SNPs are drawn in the plot.
   Statistics of the mixed sample, as PLINK --het computes them (with the simulated allele frequencies
   in place of frequencies estimated from a whole study):
       het_rate = heterozygous calls / called SNPs
       E(HOM)   = sum over called SNPs of (1 - 2 p q)
       F        = (O(HOM) - E(HOM)) / (N(NM) - E(HOM))
   The curve on the right is the expected het_rate and no-call rate at each alpha, averaged over the
   20,000 SNPs with exact normal probabilities for the noise (no simulation noise).
   Vanilla JS, no libraries, no network; works from file://. The core is exported for Node tests. */
(function () {
  "use strict";

  /* ================================================================== core */
  var SIGMA = 0.03, CUT = [0.15, 0.3, 0.7, 0.85];

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(rnd) {                       // Box-Muller
    var u = 0, v = 0;
    while (u === 0) u = rnd();
    v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function phi(z) {                           // standard normal CDF (erf, Abramowitz & Stegun 7.1.26)
    var s = z < 0 ? -1 : 1, x = Math.abs(z) / Math.SQRT2;
    var t = 1 / (1 + 0.3275911 * x);
    var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return 0.5 * (1 + s * y);
  }
  function call(theta) {
    if (theta < CUT[0]) return 0;
    if (theta < CUT[1]) return -1;
    if (theta <= CUT[2]) return 1;
    if (theta <= CUT[3]) return -1;
    return 2;
  }
  function binom2(p, rnd) { return (rnd() < p ? 1 : 0) + (rnd() < p ? 1 : 0); }

  // The fixed simulated material: allele frequencies, both people's genotypes, the noise.
  function makeData(M, seed) {
    var rnd = mulberry32(seed);
    var d = { M: M, p: new Float64Array(M), gA: new Int8Array(M), gB: new Int8Array(M), e: new Float64Array(M), jit: new Float64Array(M) };
    for (var j = 0; j < M; j++) {
      d.p[j] = 0.05 + 0.9 * rnd();
      d.gA[j] = binom2(d.p[j], rnd);
      d.gB[j] = binom2(d.p[j], rnd);
      d.e[j] = SIGMA * gauss(rnd);
      d.jit[j] = rnd();
    }
    return d;
  }

  // Calls and --het statistics of the mixed sample at contamination fraction alpha.
  function mix(d, alpha) {
    var calls = new Int8Array(d.M), theta = new Float64Array(d.M);
    var nm = 0, het = 0, ehom = 0, miss = 0, homToHet = 0, homToMiss = 0, hetToOther = 0, homA = 0;
    for (var j = 0; j < d.M; j++) {
      var th = (1 - alpha) * d.gA[j] / 2 + alpha * d.gB[j] / 2 + d.e[j];
      th = Math.min(1, Math.max(0, th));
      theta[j] = th;
      var c = call(th);
      calls[j] = c;
      if (d.gA[j] !== 1) homA++;
      if (c < 0) { miss++; if (d.gA[j] !== 1) homToMiss++; else hetToOther++; continue; }
      nm++;
      if (c === 1) { het++; if (d.gA[j] !== 1) homToHet++; }
      else if (d.gA[j] === 1) hetToOther++;
      ehom += 1 - 2 * d.p[j] * (1 - d.p[j]);
    }
    var ohom = nm - het;
    return { theta: theta, calls: calls, nm: nm, het: het, ohom: ohom, ehom: ehom, miss: miss,
      hetRate: het / nm, missRate: miss / d.M, F: (ohom - ehom) / (nm - ehom),
      homToHet: homToHet, homToMiss: homToMiss, hetToOther: hetToOther, homA: homA };
  }

  // Expected het_rate and no-call rate at alpha, exact over the noise, averaged over SNP frequencies.
  function expected(d, alpha) {
    var pHet = 0, pMiss = 0, pCall = 0;
    for (var j = 0; j < d.M; j++) {
      var p = d.p[j], q = 1 - p, gp = [q * q, 2 * p * q, p * p];
      for (var a = 0; a < 3; a++) for (var b = 0; b < 3; b++) {
        var w = gp[a] * gp[b];
        var mu = (1 - alpha) * a / 2 + alpha * b / 2;
        var F = function (x) { return phi((x - mu) / SIGMA); };
        var het = F(CUT[2]) - F(CUT[1]);
        var ms = (F(CUT[1]) - F(CUT[0])) + (F(CUT[3]) - F(CUT[2]));
        pHet += w * het; pMiss += w * ms; pCall += w * (1 - ms);
      }
    }
    return { het: pHet / pCall, miss: pMiss / d.M };
  }

  var core = { mulberry32: mulberry32, phi: phi, call: call, makeData: makeData, mix: mix, expected: expected, CUT: CUT, SIGMA: SIGMA };
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  if (typeof document === "undefined") return;

  /* ================================================================== view */
  var SVGNS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function sv(tag, attrs, text) {
    var e = document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function int(x) { return Math.round(x).toLocaleString("en-US"); }
  function pc(x, d) { return (100 * x).toFixed(d == null ? 1 : d) + "%"; }
  var COL = { hom: "#5a6370", het: "var(--q2)", miss: "var(--q4)" };

  function start() {
    var root = document.getElementById("w-het-mix");
    if (!root) return;
    var body = root.querySelector(".widget-body");
    body.innerHTML = "";
    var data = makeData(20000, 7);
    var SHOW = 300;
    var state = { alpha: 0.0 };

    var controls = el("div", { "class": "controls" });
    var lab = el("label", null, "Share of the DNA from person B ");
    var rng = el("input", { type: "range", min: "0", max: "50", step: "1", value: "0", "aria-label": "Share of the DNA that comes from person B, in percent" });
    var out = el("output", { "class": "mix-out" }, "0%");
    lab.appendChild(rng); lab.appendChild(out);
    controls.appendChild(lab);
    var presets = el("span", { "class": "mix-presets" });
    [0, 10, 20, 30, 50].forEach(function (v) {
      var b = el("button", { type: "button", "class": "btn" }, v + "%");
      b.addEventListener("click", function () { rng.value = String(v); update(); });
      presets.appendChild(b);
    });
    controls.appendChild(presets);
    body.appendChild(controls);

    var grid = el("div", { "class": "mix-grid" });
    body.appendChild(grid);

    /* left: signal plot */
    var L = { w: 360, h: 300, l: 44, r: 10, t: 14, b: 40 };
    var svgA = sv("svg", { viewBox: "0 0 " + L.w + " " + L.h, role: "img", "class": "mix-svg", "aria-label": "B allele signal of 300 SNPs in the mixed sample, grouped by person A's true genotype, colored by the genotype call" });
    var capA = el("p", { "class": "mix-cap" }, "<strong>Signal and call at 300 SNPs</strong> (simulated), grouped by person A's true genotype");
    var colA = el("div"); colA.appendChild(capA); colA.appendChild(svgA);
    grid.appendChild(colA);
    var ty = function (t) { return L.t + (1 - t) * (L.h - L.t - L.b); };
    var colX = [0, 1, 2].map(function (g) { var w = (L.w - L.l - L.r) / 3; return L.l + g * w + w * 0.12; });
    var colW = (L.w - L.l - L.r) / 3 * 0.76;
    // call bands
    var bands = [[0, CUT[0], "#eef3f8", "AA"], [CUT[0], CUT[1], "#fbecea", "no call"], [CUT[1], CUT[2], "#fff1e2", "AB"], [CUT[2], CUT[3], "#fbecea", "no call"], [CUT[3], 1, "#eef3f8", "BB"]];
    bands.forEach(function (b) {
      svgA.appendChild(sv("rect", { x: L.l, y: ty(b[1]), width: L.w - L.l - L.r, height: ty(b[0]) - ty(b[1]), fill: b[2] }));
    });
    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
      svgA.appendChild(sv("text", { x: L.l - 6, y: ty(v) + 3.5, "class": "t-xs", "text-anchor": "end" }, String(v)));
    });
    svgA.appendChild(sv("text", { x: 12, y: (ty(0) + ty(1)) / 2, "class": "t-sm", "text-anchor": "middle", transform: "rotate(-90 12 " + ((ty(0) + ty(1)) / 2) + ")" }, "share of signal from allele B"));
    ["A is AA", "A is AB", "A is BB"].forEach(function (s, g) {
      svgA.appendChild(sv("text", { x: colX[g] + colW / 2, y: L.h - 22, "class": "t-sm", "text-anchor": "middle" }, s));
    });
    svgA.appendChild(sv("text", { x: L.w - L.r - 2, y: ty(0.5) + 3.5, "class": "t-xs", "text-anchor": "end" }, "AB"));
    svgA.appendChild(sv("text", { x: L.w - L.r - 2, y: ty(0.1) + 3.5, "class": "t-xs", "text-anchor": "end" }, "AA"));
    svgA.appendChild(sv("text", { x: L.w - L.r - 2, y: ty(0.9) + 3.5, "class": "t-xs", "text-anchor": "end" }, "BB"));
    svgA.appendChild(sv("rect", { x: L.l, y: L.t, width: L.w - L.l - L.r, height: L.h - L.t - L.b, fill: "none", stroke: "#b9c1cc" }));
    var ptsG = sv("g"); svgA.appendChild(ptsG);
    var legA = el("p", { "class": "note mix-legend" },
      '<span class="mix-sw"><i style="background:' + COL.hom + '"></i>called homozygous</span> ' +
      '<span class="mix-sw"><i style="background:' + COL.het + '"></i>called heterozygous</span> ' +
      '<span class="mix-sw"><i class="hollow" style="border-color:' + COL.miss + '"></i>no call</span>');
    colA.appendChild(legA);

    /* right: curve */
    var R = { w: 320, h: 300, l: 44, r: 14, t: 14, b: 40 };
    var svgB = sv("svg", { viewBox: "0 0 " + R.w + " " + R.h, role: "img", "class": "mix-svg", "aria-label": "Expected heterozygosity rate and no-call rate of the mixed sample as the share of DNA from person B goes from 0 to 50 percent" });
    var capB = el("p", { "class": "mix-cap" }, "<strong>Expected rates</strong> at every mixing share (20,000 simulated SNPs)");
    var colB = el("div"); colB.appendChild(capB); colB.appendChild(svgB);
    grid.appendChild(colB);
    var bx = function (a) { return R.l + a / 0.5 * (R.w - R.l - R.r); };
    var by = function (v) { return R.t + (1 - v / 0.8) * (R.h - R.t - R.b); };
    for (var i = 0; i <= 4; i++) {
      var v = i * 0.2;
      svgB.appendChild(sv("line", { x1: R.l, y1: by(v), x2: R.w - R.r, y2: by(v), stroke: "#eef1f4" }));
      svgB.appendChild(sv("text", { x: R.l - 6, y: by(v) + 3.5, "class": "t-xs", "text-anchor": "end" }, (v * 100).toFixed(0) + "%"));
    }
    [0, 0.1, 0.2, 0.3, 0.4, 0.5].forEach(function (a) {
      svgB.appendChild(sv("text", { x: bx(a), y: by(0) + 14, "class": "t-xs", "text-anchor": "middle" }, (a * 100).toFixed(0) + "%"));
    });
    svgB.appendChild(sv("text", { x: (bx(0) + bx(0.5)) / 2, y: R.h - 6, "class": "t-sm", "text-anchor": "middle" }, "share of the DNA from person B"));
    svgB.appendChild(sv("rect", { x: R.l, y: R.t, width: R.w - R.l - R.r, height: R.h - R.t - R.b, fill: "none", stroke: "#b9c1cc" }));
    var curve = [];
    for (var k = 0; k <= 50; k++) curve.push([k / 100, expected(data, k / 100)]);
    var pathH = "", pathM = "";
    curve.forEach(function (c, ix) {
      pathH += (ix ? "L" : "M") + bx(c[0]).toFixed(1) + "," + by(c[1].het).toFixed(1);
      pathM += (ix ? "L" : "M") + bx(c[0]).toFixed(1) + "," + by(c[1].miss).toFixed(1);
    });
    svgB.appendChild(sv("path", { d: pathH, fill: "none", stroke: COL.het, "stroke-width": 2.2 }));
    svgB.appendChild(sv("path", { d: pathM, fill: "none", stroke: COL.miss, "stroke-width": 2.2, "stroke-dasharray": "5 3" }));
    var het0 = curve[0][1].het;
    svgB.appendChild(sv("text", { x: bx(0.01), y: by(het0) - 8, "class": "t-xs" }, "heterozygous calls"));
    svgB.appendChild(sv("text", { x: bx(0.01), y: by(0.02) - 8, "class": "t-xs" }, "no calls"));
    var marker = sv("line", { x1: bx(0), y1: R.t, x2: bx(0), y2: by(0), stroke: "#1d2127", "stroke-width": 1.2, "stroke-dasharray": "3 3" });
    svgB.appendChild(marker);
    var dotH = sv("circle", { r: 4.5, fill: COL.het, stroke: "#1d2127", "stroke-width": 1.2 });
    var dotM = sv("circle", { r: 4.5, fill: "#fff", stroke: COL.miss, "stroke-width": 2 });
    svgB.appendChild(dotH); svgB.appendChild(dotM);

    var readout = el("div", { "class": "readout mix-readout", "aria-live": "polite" });
    body.appendChild(readout);
    var base = mix(data, 0);

    function update() {
      var a = +rng.value / 100;
      state.alpha = a;
      out.textContent = rng.value + "%";
      var r = mix(data, a);
      while (ptsG.firstChild) ptsG.removeChild(ptsG.firstChild);
      for (var j = 0; j < SHOW; j++) {
        var g = data.gA[j], c = r.calls[j];
        var x = colX[g] + data.jit[j] * colW, y = ty(r.theta[j]);
        if (c < 0) ptsG.appendChild(sv("circle", { cx: x, cy: y, r: 2.8, fill: "#fff", stroke: COL.miss, "stroke-width": 1.4 }));
        else ptsG.appendChild(sv("circle", { cx: x, cy: y, r: 2.8, fill: c === 1 ? COL.het : COL.hom, "fill-opacity": 0.85 }));
      }
      marker.setAttribute("x1", bx(a)); marker.setAttribute("x2", bx(a));
      var e = curve[Math.round(a * 100)][1];
      dotH.setAttribute("cx", bx(a)); dotH.setAttribute("cy", by(e.het));
      dotM.setAttribute("cx", bx(a)); dotM.setAttribute("cy", by(e.miss));
      readout.innerHTML =
        "Mixed sample, " + pc(a, 0) + " of the DNA from person B (20,000 SNPs):<br>" +
        "heterozygous calls " + int(r.het) + " of " + int(r.nm) + " called SNPs → het_rate " + r.hetRate.toFixed(3) +
        " (person A alone: " + base.hetRate.toFixed(3) + ")<br>" +
        "no calls " + int(r.miss) + " → missing rate " + pc(r.missRate) + "<br>" +
        "O(HOM) " + int(r.ohom) + ", E(HOM) " + r.ehom.toFixed(1) + ", N(NM) " + int(r.nm) + " → F = " + r.F.toFixed(3) +
        " (person A alone: " + base.F.toFixed(3) + ")<br>" +
        "of A's " + int(r.homA) + " homozygous genotypes: " + int(r.homToHet) + " now called heterozygous, " + int(r.homToMiss) + " no call";
    }
    rng.addEventListener("input", update);
    update();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
