/* Widget "From shared segments to Z0, Z1, Z2" (page: qc-relatedness.html, section #statistic).
   Root element: <div class="widget" id="w-ibd-sim">.

   What it shows. One simulated pair of relatives at a time (simulated, seeded):
   1. Meiosis. Founders carry chromosome copies with unique labels. Each transmitted copy (sperm or egg)
      starts on a random one of the parent's two copies and switches copy at each crossover; the number
      of crossovers on a chromosome is Poisson with mean equal to its map length in Morgans (male map for
      fathers, female map for mothers; Bherer et al. 2017), positions uniform along the chromosome (no
      crossover interference). This is the model of Lecture 0's meiosis simulator.
   2. True IBD. At each position the pair shares 0, 1 or 2 copies identical by descent (IBD): the number
      of founder labels the two people have in common. k0, k1, k2 are the fractions of the genome
      (weighted by physical length) in each state.
   3. Genotypes. M SNPs are placed uniformly along the genome. Each founder copy carries allele 1 at SNP j
      with probability p_j, independently (linkage equilibrium, as after LD pruning); p_j ~ Uniform(0.05,
      0.95). A person's genotype is the number of allele-1 copies among their two copies at the SNP.
   4. IBS counts. At each SNP the pair shares 2 - |gA - gB| alleles identical by state (IBS).
   5. PLINK 1.9's method-of-moments estimator (--genome; Purcell et al. 2007, plink_calc.c):
        expected IBS fractions given IBD, averaged over SNPs, with q = 1 - p:
          e00 = 2p^2q^2,  e01 = 4pq(p^2 + q^2),  e02 = p^4 + q^4 + 4p^2q^2   (IBD = 0)
          e11 = 2pq,      e12 = 1 - 2pq                                    (IBD = 1)
          IBS = 2 with probability 1                                       (IBD = 2)
        Z0 = IBS0 / (n e00)
        Z1 = (IBS1 - n Z0 e01) / (n e11)
        Z2 = (IBS2 - n (Z0 e02 + Z1 e12)) / n          (so Z0 + Z1 + Z2 = 1)
        then PLINK's clipping to [0, 1] (same order of checks as plink_calc.c), and PI_HAT = Z1/2 + Z2.
      The widget uses the allele frequencies the SNPs were simulated with; PLINK estimates them from the
      whole sample and applies a small-sample correction, which matters little with many people.
   Vanilla JS, no libraries, no network; works from file://. The core is exported for Node tests. */
(function () {
  "use strict";

  /* ================================================================== core */

  // [chromosome, GRCh38 length (bp), female map length (cM), male map length (cM)]
  // Same values as Lecture 0's meiosis simulator (Bherer et al. 2017; GRCh38 lengths from Ensembl).
  var CHR = [
    ["1", 248956422, 327.9, 195.6], ["2", 242193529, 310.7, 186.7], ["3", 198295559, 269.2, 164.5],
    ["4", 190214555, 256.3, 144.1], ["5", 181538259, 246.8, 145.8], ["6", 170805979, 232.4, 135.3],
    ["7", 159345973, 218.7, 133.4], ["8", 145138636, 202.9, 117.1], ["9", 138394717, 186.3, 122.0],
    ["10", 133797422, 203.9, 127.3], ["11", 135086622, 189.1, 118.0], ["12", 133275309, 196.1, 129.2],
    ["13", 114364328, 150.5, 99.7], ["14", 107043718, 135.6, 96.3], ["15", 101991189, 138.6, 98.2],
    ["16", 90338345, 150.6, 99.5], ["17", 83257441, 149.4, 101.0], ["18", 80373285, 138.2, 94.7],
    ["19", 58617616, 115.4, 91.7], ["20", 64444167, 119.1, 94.5], ["21", 46709983, 72.6, 50.3],
    ["22", 50818468, 76.3, 61.0]
  ];
  var TOTAL_BP = CHR.reduce(function (s, c) { return s + c[1]; }, 0);

  // Expected (Z0, Z1, Z2) for relatives who are not inbred (Lecture 0, inheritance.html#ibd).
  var REL = {
    dup: { name: "Duplicate or identical twins", short: "duplicate", pl: "duplicate pairs", z: [0, 0, 1], color: "var(--q4)" },
    po:  { name: "Parent and child", short: "parent–child", pl: "parent–child pairs", z: [0, 1, 0], color: "var(--q2)" },
    fs:  { name: "Full siblings", short: "full siblings", pl: "pairs of full siblings", z: [0.25, 0.5, 0.25], color: "var(--q1)" },
    hs:  { name: "Half siblings (2nd degree)", short: "half siblings", pl: "pairs of half siblings", z: [0.5, 0.5, 0], color: "var(--q3)" },
    c1:  { name: "First cousins (3rd degree)", short: "first cousins", pl: "pairs of first cousins", z: [0.75, 0.25, 0], color: "var(--q7)" },
    un:  { name: "Unrelated", short: "unrelated", pl: "unrelated pairs", z: [1, 0, 0], color: "var(--q8)" }
  };
  var REL_ORDER = ["dup", "po", "fs", "hs", "c1", "un"];

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
  function poisson(lambda, rnd) {           // Knuth's method; means here are below 4
    var L = Math.exp(-lambda), k = 0, p = 1;
    do { k++; p *= rnd(); } while (p > L);
    return k - 1;
  }

  /* A chromosome copy is a list of segments [x0, x1, label] covering [0, 1] in order. */
  function founderCopy(label) { return [[0, 1, label]]; }

  // Transmit one copy from a parent with copies c0 and c1 (one meiosis).
  function transmit(c0, c1, mapMorgans, rnd) {
    var k = poisson(mapMorgans, rnd), cuts = [];
    for (var i = 0; i < k; i++) cuts.push(rnd());
    cuts.sort(function (a, b) { return a - b; });
    var which = rnd() < 0.5 ? 0 : 1;
    var bounds = [0].concat(cuts, [1]);
    var out = [];
    for (var b = 0; b < bounds.length - 1; b++) {
      var lo = bounds[b], hi = bounds[b + 1], src = which ? c1 : c0;
      for (var s = 0; s < src.length; s++) {
        var a0 = Math.max(lo, src[s][0]), a1 = Math.min(hi, src[s][1]);
        if (a1 > a0) {
          var last = out[out.length - 1];
          if (last && last[2] === src[s][2] && Math.abs(last[1] - a0) < 1e-12) last[1] = a1;
          else out.push([a0, a1, src[s][2]]);
        }
      }
      which = 1 - which;
    }
    return out;
  }
  function labelAt(copy, x) {
    for (var i = 0; i < copy.length; i++) if (x < copy[i][1]) return copy[i][2];
    return copy[copy.length - 1][2];
  }
  function ibdCount(la0, la1, lb0, lb1) {   // people are not inbred, so la0 != la1 and lb0 != lb1
    return ((la0 === lb0 || la0 === lb1) ? 1 : 0) + ((la1 === lb0 || la1 === lb1) ? 1 : 0);
  }

  // One chromosome for a pair of a given relationship: returns {a: [copy, copy], b: [copy, copy]}.
  // Labels are strings; F = father side, M = mother side; every spouse brings new labels.
  function pairChromosome(rel, ci, rnd) {
    var mMale = CHR[ci][3] / 100, mFemale = CHR[ci][2] / 100;
    var f = [founderCopy("f1"), founderCopy("f2")], m = [founderCopy("m1"), founderCopy("m2")];
    var a, b;
    if (rel === "dup") {
      a = [transmit(f[0], f[1], mMale, rnd), transmit(m[0], m[1], mFemale, rnd)];
      b = a;
    } else if (rel === "po") {          // person a is the father; person b his child
      a = f;
      b = [transmit(f[0], f[1], mMale, rnd), transmit(m[0], m[1], mFemale, rnd)];
    } else if (rel === "fs") {
      a = [transmit(f[0], f[1], mMale, rnd), transmit(m[0], m[1], mFemale, rnd)];
      b = [transmit(f[0], f[1], mMale, rnd), transmit(m[0], m[1], mFemale, rnd)];
    } else if (rel === "hs") {          // same father, different mothers
      a = [transmit(f[0], f[1], mMale, rnd), transmit(m[0], m[1], mFemale, rnd)];
      b = [transmit(f[0], f[1], mMale, rnd), transmit(founderCopy("n1"), founderCopy("n2"), mFemale, rnd)];
    } else if (rel === "c1") {          // grandparents f (father side) and m; their son P1 and daughter P2
      var p1 = [transmit(f[0], f[1], mMale, rnd), transmit(m[0], m[1], mFemale, rnd)];
      var p2 = [transmit(f[0], f[1], mMale, rnd), transmit(m[0], m[1], mFemale, rnd)];
      // cousin a: child of P1 (a father) and spouse s; cousin b: child of P2 (a mother) and spouse t
      a = [transmit(p1[0], p1[1], mMale, rnd), transmit(founderCopy("s1"), founderCopy("s2"), mFemale, rnd)];
      b = [transmit(founderCopy("t1"), founderCopy("t2"), mMale, rnd), transmit(p2[0], p2[1], mFemale, rnd)];
    } else {                            // unrelated
      a = [founderCopy("u1"), founderCopy("u2")];
      b = [founderCopy("v1"), founderCopy("v2")];
    }
    return { a: a, b: b };
  }

  // IBD segments of a chromosome pair: list of [x0, x1, count].
  function ibdSegments(pc) {
    var xs = [0, 1];
    [pc.a[0], pc.a[1], pc.b[0], pc.b[1]].forEach(function (c) { c.forEach(function (s) { xs.push(s[0], s[1]); }); });
    xs.sort(function (u, v) { return u - v; });
    var out = [];
    for (var i = 0; i < xs.length - 1; i++) {
      var x0 = xs[i], x1 = xs[i + 1];
      if (x1 - x0 < 1e-12) continue;
      var mid = (x0 + x1) / 2;
      var k = ibdCount(labelAt(pc.a[0], mid), labelAt(pc.a[1], mid), labelAt(pc.b[0], mid), labelAt(pc.b[1], mid));
      var last = out[out.length - 1];
      if (last && last[2] === k) last[1] = x1; else out.push([x0, x1, k]);
    }
    return out;
  }

  // Expected IBS fractions given IBD for one SNP with allele frequency p (large-sample formulas).
  function ibsGivenIbd(p) {
    var q = 1 - p, pq = p * q, p2 = p * p, q2 = q * q;
    return {
      e00: 2 * p2 * q2, e01: 4 * pq * (p2 + q2), e02: p2 * p2 + q2 * q2 + 4 * p2 * q2,
      e11: 2 * pq, e12: 1 - 2 * pq
    };
  }

  // PLINK 1.9's estimator from IBS counts and the SNP-averaged expectations E.
  function plinkZ(ibs0, ibs1, ibs2, E, unbounded) {
    var n = ibs0 + ibs1 + ibs2;
    var z0 = ibs0 / (E.e00 * n);
    var z1 = (ibs1 - z0 * E.e01 * n) / (E.e11 * n);
    var z2 = (ibs2 - n * (z0 * E.e02 + z1 * E.e12)) / n;
    var raw = [z0, z1, z2], s;
    if (!unbounded) {
      if (z0 > 1) { z0 = 1; z1 = 0; z2 = 0; }
      else if (z1 > 1) { z1 = 1; z0 = 0; z2 = 0; }
      else if (z2 > 1) { z2 = 1; z1 = 0; z0 = 0; }
      else if (z0 < 0) { s = 1 / (z1 + z2); z1 *= s; z2 *= s; z0 = 0; }
      if (z1 < 0) { s = 1 / (z0 + z2); z0 *= s; z2 *= s; z1 = 0; }
      if (z2 < 0) { s = 1 / (z0 + z1); z0 *= s; z1 *= s; z2 = 0; }
    }
    return { n: n, raw: raw, z: [z0, z1, z2], pihat: z1 / 2 + z2, clipped: raw[0] !== z0 || raw[1] !== z1 || raw[2] !== z2 };
  }

  // Simulate one pair over the whole genome with M SNPs.
  function simulatePair(rel, M, seed) {
    var rnd = mulberry32(seed);
    var chroms = [], k = [0, 0, 0];
    var ibs = [0, 0, 0];
    var E = { e00: 0, e01: 0, e02: 0, e11: 0, e12: 0 };
    var labelAllele = {};      // label -> Uint8Array of alleles at this chromosome's SNPs (per chromosome)
    var used = 0;
    for (var ci = 0; ci < CHR.length; ci++) {
      var pc = pairChromosome(rel, ci, rnd);
      var segs = ibdSegments(pc);
      var w = CHR[ci][1] / TOTAL_BP;
      segs.forEach(function (s) { k[s[2]] += w * (s[1] - s[0]); });
      // SNPs on this chromosome: share of M by physical length (last chromosome takes the remainder)
      var mc = ci === CHR.length - 1 ? M - used : Math.round(M * w);
      used += mc;
      var xs = new Float64Array(mc);
      for (var j = 0; j < mc; j++) xs[j] = rnd();
      xs.sort();
      labelAllele = {};
      var ps = new Float64Array(mc);
      for (j = 0; j < mc; j++) ps[j] = 0.05 + 0.9 * rnd();
      var alleleOf = function (label, jj) {
        var arr = labelAllele[label];
        if (!arr) {
          arr = labelAllele[label] = new Int8Array(mc).fill(-1);
        }
        if (arr[jj] < 0) arr[jj] = rnd() < ps[jj] ? 1 : 0;
        return arr[jj];
      };
      for (j = 0; j < mc; j++) {
        var x = xs[j];
        var gA = alleleOf(labelAt(pc.a[0], x), j) + alleleOf(labelAt(pc.a[1], x), j);
        var gB = alleleOf(labelAt(pc.b[0], x), j) + alleleOf(labelAt(pc.b[1], x), j);
        ibs[2 - Math.abs(gA - gB)]++;
        var e = ibsGivenIbd(ps[j]);
        E.e00 += e.e00; E.e01 += e.e01; E.e02 += e.e02; E.e11 += e.e11; E.e12 += e.e12;
      }
      chroms.push(segs);
    }
    for (var key in E) E[key] /= M;
    var est = plinkZ(ibs[0], ibs[1], ibs[2], E);
    return { rel: rel, M: M, seed: seed, chroms: chroms, k: k, pi: k[1] / 2 + k[2], ibs: ibs, E: E, est: est };
  }

  var core = { CHR: CHR, REL: REL, mulberry32: mulberry32, transmit: transmit, labelAt: labelAt,
    ibdSegments: ibdSegments, pairChromosome: pairChromosome, ibsGivenIbd: ibsGivenIbd, plinkZ: plinkZ,
    simulatePair: simulatePair };
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  if (typeof document === "undefined") return;

  /* ================================================================== view */

  var SVGNS = "http://www.w3.org/2000/svg";
  var IBD_FILL = ["#e6eaef", "var(--g1)", "var(--g2)"];
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
  function f3(x) { return (Math.abs(x) < 0.0005 ? 0 : x).toFixed(3); }
  function f2(x) { return (Math.abs(x) < 0.005 ? 0 : x).toFixed(2); }
  function int(x) { return Math.round(x).toLocaleString("en-US"); }
  function pct(x) { return (100 * x).toFixed(1) + "%"; }

  function start() {
    var root = document.getElementById("w-ibd-sim");
    if (!root) return;
    var body = root.querySelector(".widget-body");
    body.innerHTML = "";

    var state = { rel: "fs", M: 10000, seed: 20261108, cur: null, hist: [], busy: false };

    /* controls */
    var controls = el("div", { "class": "controls" });
    var lr = el("label", null, "Relationship ");
    var selR = el("select", { "aria-label": "Relationship of the simulated pair" });
    REL_ORDER.forEach(function (k) { var o = el("option", { value: k }, REL[k].name); selR.appendChild(o); });
    selR.value = state.rel;
    lr.appendChild(selR);
    var lm = el("label", null, "SNPs ");
    var selM = el("select", { "aria-label": "Number of SNPs" });
    [[1000, "1,000"], [10000, "10,000"], [50000, "50,000"]].forEach(function (o) { selM.appendChild(el("option", { value: o[0] }, o[1])); });
    selM.value = String(state.M);
    lm.appendChild(selM);
    var bNew = el("button", { type: "button", "class": "btn primary" }, "New pair");
    var bAdd = el("button", { type: "button", "class": "btn" }, "Add 100 pairs");
    var bClr = el("button", { type: "button", "class": "btn" }, "Clear plot");
    [lr, lm, bNew, bAdd, bClr].forEach(function (c) { controls.appendChild(c); });
    body.appendChild(controls);

    var grid = el("div", { "class": "ibd-grid" });
    var left = el("div", { "class": "ibd-left" });
    var right = el("div", { "class": "ibd-right" });
    grid.appendChild(left); grid.appendChild(right);
    body.appendChild(grid);

    /* genome strip */
    var capG = el("p", { "class": "ibd-cap" }, "<strong>1 · True sharing.</strong> Copies this simulated pair shares identical by descent, chromosomes 1–22");
    left.appendChild(capG);
    var gW = 360, rowH = 9, gap = 3, top = 20, labW = 20;
    var gH = top + CHR.length * (rowH + gap) + 4;
    var svgG = sv("svg", { viewBox: "0 0 " + gW + " " + gH, role: "img", "class": "ibd-genome", "aria-label": "Chromosomes 1 to 22 colored by the number of copies the pair shares identical by descent" });
    left.appendChild(svgG);
    var maxBp = CHR[0][1];
    // legend
    [["0 copies", 0], ["1 copy", 1], ["2 copies", 2]].forEach(function (lg, i) {
      var x = labW + i * 92;
      svgG.appendChild(sv("rect", { x: x, y: 4, width: 14, height: 10, rx: 2, fill: IBD_FILL[lg[1]], stroke: "#b9c1cc", "stroke-width": 0.6 }));
      svgG.appendChild(sv("text", { x: x + 18, y: 13, "class": "t-xs" }, "IBD " + lg[0]));
    });
    var rowsG = sv("g");
    svgG.appendChild(rowsG);

    /* computation */
    var capC = el("p", { "class": "ibd-cap" }, "<strong>2 · What PLINK sees and estimates.</strong> Counts of SNPs by identity by state (IBS), and the method of moments");
    left.appendChild(capC);
    var tabWrap = el("div", { "class": "ibd-tabwrap" });
    left.appendChild(tabWrap);
    var calc = el("div", { "class": "readout ibd-calc", "aria-live": "polite" });
    left.appendChild(calc);

    /* Z0-Z1 plot */
    var capZ = el("p", { "class": "ibd-cap" }, "<strong>3 · Z0 against Z1.</strong> Expected points (labeled) and every simulated pair (dots)");
    right.appendChild(capZ);
    var P = { w: 330, h: 320, l: 50, r: 12, t: 12, b: 40 };
    var svgZ = sv("svg", { viewBox: "0 0 " + P.w + " " + P.h, role: "img", "class": "ibd-zplot", "aria-label": "Scatter plot of Z0 against Z1 for the simulated pairs, with the expected point of each relationship" });
    right.appendChild(svgZ);
    var sx = function (z0) { return P.l + z0 * (P.w - P.l - P.r); };
    var sy = function (z1) { return P.h - P.b - z1 * (P.h - P.t - P.b); };
    // axes and grid
    for (var g = 0; g <= 4; g++) {
      var v = g / 4;
      svgZ.appendChild(sv("line", { x1: sx(v), y1: sy(0), x2: sx(v), y2: sy(1), stroke: "#eef1f4" }));
      svgZ.appendChild(sv("line", { x1: sx(0), y1: sy(v), x2: sx(1), y2: sy(v), stroke: "#eef1f4" }));
      svgZ.appendChild(sv("text", { x: sx(v), y: sy(0) + 18, "class": "t-xs", "text-anchor": "middle" }, String(v)));
      svgZ.appendChild(sv("text", { x: sx(0) - 10, y: sy(v) + 3.5, "class": "t-xs", "text-anchor": "end" }, String(v)));
    }
    svgZ.appendChild(sv("line", { x1: sx(0), y1: sy(0), x2: sx(1), y2: sy(0), stroke: "#8a93a0" }));
    svgZ.appendChild(sv("line", { x1: sx(0), y1: sy(0), x2: sx(0), y2: sy(1), stroke: "#8a93a0" }));
    svgZ.appendChild(sv("line", { x1: sx(0), y1: sy(1), x2: sx(1), y2: sy(0), stroke: "#8a93a0", "stroke-dasharray": "4 3" }));
    svgZ.appendChild(sv("text", { x: sx(0.62), y: sy(0.44), "class": "t-xs", transform: "rotate(-45 " + sx(0.62) + " " + sy(0.44) + ")" }, "Z2 = 0 on this line"));
    svgZ.appendChild(sv("text", { x: (sx(0) + sx(1)) / 2, y: P.h - 6, "class": "t-sm", "text-anchor": "middle" }, "Z0 = estimated P(IBD = 0)"));
    svgZ.appendChild(sv("text", { x: 12, y: (sy(0) + sy(1)) / 2, "class": "t-sm", "text-anchor": "middle", transform: "rotate(-90 12 " + ((sy(0) + sy(1)) / 2) + ")" }, "Z1 = estimated P(IBD = 1)"));
    var histG = sv("g"); svgZ.appendChild(histG);
    var expG = sv("g"); svgZ.appendChild(expG);
    var curG = sv("g"); svgZ.appendChild(curG);
    // expected points with labels placed to avoid each other
    var LAB = { dup: [8, -8, "start"], po: [8, 4, "start"], fs: [-8, -8, "end"], hs: [0, -10, "middle"], c1: [8, -7, "start"], un: [-6, -8, "end"] };
    REL_ORDER.forEach(function (k) {
      var z = REL[k].z, x = sx(z[0]), y = sy(z[1]);
      expG.appendChild(sv("rect", { x: x - 4.5, y: y - 4.5, width: 9, height: 9, fill: "#fff", stroke: "#1d2127", "stroke-width": 1.6, transform: "rotate(45 " + x + " " + y + ")" }));
      var t = sv("text", { x: x + LAB[k][0], y: y + LAB[k][1], "class": "t-xs ibd-lab", "text-anchor": LAB[k][2] }, REL[k].short);
      expG.appendChild(t);
    });
    var legend = el("p", { "class": "note ibd-legend" });
    right.appendChild(legend);
    var summary = el("p", { "class": "note ibd-summary", "aria-live": "polite" });
    right.appendChild(summary);

    function drawGenome(r) {
      while (rowsG.firstChild) rowsG.removeChild(rowsG.firstChild);
      var wMax = gW - labW - 4;
      r.chroms.forEach(function (segs, ci) {
        var y = top + ci * (rowH + gap);
        var w = wMax * CHR[ci][1] / maxBp;
        rowsG.appendChild(sv("text", { x: labW - 4, y: y + rowH - 1, "class": "t-xs", "text-anchor": "end" }, CHR[ci][0]));
        segs.forEach(function (s) {
          rowsG.appendChild(sv("rect", { x: labW + s[0] * w, y: y, width: Math.max(0.4, (s[1] - s[0]) * w), height: rowH, fill: IBD_FILL[s[2]] }));
        });
        rowsG.appendChild(sv("rect", { x: labW, y: y, width: w, height: rowH, fill: "none", stroke: "#b9c1cc", "stroke-width": 0.6, rx: 1.5 }));
      });
    }

    function drawTable(r) {
      var E = r.E, n = r.est.n, c = r.ibs;
      tabWrap.innerHTML =
        '<table class="ibd-tab"><caption>SNPs at which the pair shares 0, 1 or 2 alleles by state (IBS0, IBS1, IBS2)</caption>' +
        '<thead><tr><th scope="col">n = ' + int(n) + ' SNPs</th><th scope="col">IBS0</th><th scope="col">IBS1</th><th scope="col">IBS2</th></tr></thead><tbody>' +
        "<tr><th scope=\"row\">Observed count</th><td>" + int(c[0]) + "</td><td>" + int(c[1]) + "</td><td>" + int(c[2]) + "</td></tr>" +
        "<tr><th scope=\"row\">Observed fraction</th><td>" + f3(c[0] / n) + "</td><td>" + f3(c[1] / n) + "</td><td>" + f3(c[2] / n) + "</td></tr>" +
        "<tr class=\"ibd-exp\"><th scope=\"row\">Expected, IBD 0</th><td>" + f3(E.e00) + "</td><td>" + f3(E.e01) + "</td><td>" + f3(E.e02) + "</td></tr>" +
        "<tr class=\"ibd-exp\"><th scope=\"row\">Expected, IBD 1</th><td>0</td><td>" + f3(E.e11) + "</td><td>" + f3(E.e12) + "</td></tr>" +
        "<tr class=\"ibd-exp\"><th scope=\"row\">Expected, IBD 2</th><td>0</td><td>0</td><td>1</td></tr></tbody></table>";
    }

    function drawCalc(r) {
      var E = r.E, n = r.est.n, c = r.ibs, raw = r.est.raw, z = r.est.z;
      var lines = [];
      lines.push("Z0 = IBS0 / (n × " + f3(E.e00) + ") = " + int(c[0]) + " / " + int(n * E.e00) + " = " + f3(raw[0]));
      lines.push("Z1 = (IBS1 − n × Z0 × " + f3(E.e01) + ") / (n × " + f3(E.e11) + ") = " + f3(raw[1]));
      lines.push("Z2 = 1 − Z0 − Z1 = " + f3(raw[2]));
      if (r.est.clipped) lines.push("Outside 0–1, so PLINK clips: Z0 = " + f3(z[0]) + ", Z1 = " + f3(z[1]) + ", Z2 = " + f3(z[2]));
      lines.push("<strong>PI_HAT = Z1/2 + Z2 = " + f3(r.est.pihat) + "</strong>");
      lines.push("True (simulated) sharing: k0 = " + f3(r.k[0]) + ", k1 = " + f3(r.k[1]) + ", k2 = " + f3(r.k[2]) + ", proportion IBD = " + f3(r.pi));
      calc.innerHTML = lines.map(function (s) { return "<span>" + s + "</span>"; }).join("<br>");
    }

    function drawHist() {
      while (histG.firstChild) histG.removeChild(histG.firstChild);
      state.hist.forEach(function (h) {
        histG.appendChild(sv("circle", { cx: sx(h.z[0]), cy: sy(h.z[1]), r: 2.6, fill: REL[h.rel].color, "fill-opacity": 0.55, stroke: "none" }));
      });
      while (curG.firstChild) curG.removeChild(curG.firstChild);
      if (state.cur) {
        var z = state.cur.est.z;
        curG.appendChild(sv("circle", { cx: sx(z[0]), cy: sy(z[1]), r: 6, fill: REL[state.cur.rel].color, stroke: "#1d2127", "stroke-width": 1.8 }));
      }
      var counts = {};
      state.hist.forEach(function (h) { counts[h.rel] = (counts[h.rel] || 0) + 1; });
      var parts = REL_ORDER.filter(function (k) { return counts[k]; }).map(function (k) {
        return '<span class="ibd-sw"><i style="background:' + REL[k].color + '"></i>' + REL[k].short + " (" + counts[k] + ")</span>";
      });
      legend.innerHTML = parts.length ? "Simulated pairs: " + parts.join(" ") : "";
      // summary of PI_HAT for the selected relationship and SNP count
      var sel = state.hist.filter(function (h) { return h.rel === state.rel && h.M === state.M; });
      if (sel.length >= 5) {
        var v = sel.map(function (h) { return h.pihat; });
        var m = v.reduce(function (a, b) { return a + b; }, 0) / v.length;
        var sd = Math.sqrt(v.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / (v.length - 1));
        var lo = Math.min.apply(null, v), hi = Math.max.apply(null, v);
        summary.innerHTML = "PI_HAT of the " + sel.length + " simulated " + REL[state.rel].pl + ", " + int(state.M) +
          " SNPs: mean " + f3(m) + ", standard deviation " + f3(sd) + ", range " + f3(lo) + "–" + f3(hi) + " (expected " + f3(REL[state.rel].z[1] / 2 + REL[state.rel].z[2]) + ").";
      } else summary.innerHTML = "Add pairs to see how much PI_HAT varies between pairs of the same relationship.";
    }

    function newPair(push) {
      state.seed = (Math.imul(state.seed, 1103515245) + 12345) >>> 0;
      var r = simulatePair(state.rel, state.M, state.seed);
      state.cur = r;
      if (push !== false) state.hist.push({ rel: r.rel, M: r.M, z: r.est.z.slice(), pihat: r.est.pihat });
      if (state.hist.length > 1200) state.hist.splice(0, state.hist.length - 1200);
      return r;
    }
    function render() {
      if (!state.cur) return;
      drawGenome(state.cur);
      drawTable(state.cur);
      drawCalc(state.cur);
      drawHist();
    }
    function addMany(rels, k, done) {
      if (state.busy) return;
      state.busy = true;
      bAdd.disabled = true;
      var queue = [];
      rels.forEach(function (rel) { for (var i = 0; i < k; i++) queue.push(rel); });
      var keepRel = state.rel;
      (function step() {
        var t0 = Date.now();
        while (queue.length && Date.now() - t0 < 40) {
          state.rel = queue.shift();
          newPair(true);
        }
        state.rel = keepRel;
        if (queue.length) { drawHist(); setTimeout(step, 0); }
        else { state.busy = false; bAdd.disabled = false; if (done) done(); render(); }
      })();
    }

    selR.addEventListener("change", function () { state.rel = selR.value; newPair(true); render(); });
    selM.addEventListener("change", function () { state.M = +selM.value; newPair(true); render(); });
    bNew.addEventListener("click", function () { newPair(true); render(); });
    bAdd.addEventListener("click", function () { addMany([state.rel], 100); });
    bClr.addEventListener("click", function () { state.hist = state.cur ? [{ rel: state.cur.rel, M: state.cur.M, z: state.cur.est.z.slice(), pihat: state.cur.est.pihat }] : []; drawHist(); });

    // first view: one full-sibling pair, then 15 pairs of each relationship in the background
    newPair(true);
    render();
    setTimeout(function () {
      addMany(REL_ORDER, 15, function () {
        // put a full-sibling pair back on top as the current pair
        state.rel = selR.value; newPair(true); render();
      });
    }, 30);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
