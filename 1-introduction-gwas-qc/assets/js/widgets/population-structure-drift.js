/* Widget "Genetic drift pulls populations apart" (page: population-structure, section #mechanisms).

   What it shows. K populations split at generation 0 from one ancestral population and then evolve
   separately under the Wright–Fisher model (simulated, seeded):
     - each population has N people, so 2N allele copies per generation;
     - migration (optional): before sampling, a fraction m of each population's parental gene pool is
       replaced by migrants from a large pool that keeps the ancestral frequency p0 (Wright's island
       model with many islands), so the frequency the next generation is drawn from is
           p' = (1 - m) p + m p0;
     - drift: the next generation's allele count is Binomial(2N, p'), its frequency that count / 2N;
     - founder event (optional): population 1 starts from NF = 5 founders, i.e. its first frequency is
       Binomial(2 NF, p0) / (2 NF); it then has N people per generation like the others.
   Left plot: one SNP that starts at p0 = 0.5, one line per population.
   Right plot: F_ST over time, estimated from S = 200 SNPs with p0 ~ Uniform(0.05, 0.95), against theory.

   Estimator. With K populations and their allele frequencies p_kj known exactly (no sampling of people),
   F_ST = sum_j s2_j / sum_j [ pbar_j (1 - pbar_j) + s2_j / K ],
   where pbar_j is the mean and s2_j the variance (divisor K - 1) of p_kj across the K populations.
   This is Weir & Cockerham's (1984) estimator with infinitely many people per population; the plain
   ratio s2 / (pbar (1 - pbar)) is biased downward when K is small.

   Theory. With V_t = Var(p_t) across replicate populations and F_t = V_t / (p0 q0):
       F_{t+1} = 1/(2N) + (1 - 1/(2N)) (1 - m)^2 F_t,   F_0 = 0 (or 1/(2 NF) for a founded population).
   With m = 0 this gives F_t = 1 - (1 - 1/(2N))^t, about t/(2N) while t is small compared with 2N.
   With m > 0 it levels off at F* = (1/(2N)) / (1 - (1 - m)^2 (1 - 1/(2N))), about 1/(1 + 4Nm).
   The curve drawn is the average of F_t over the K populations (a founded population starts higher);
   the expected within-population heterozygosity is H_t = H_0 (1 - F_t).

   Binomial draws are exact (inversion that starts at the mode and searches outward).
   Vanilla JS, no libraries, no network; works from file://. The core is exported for Node tests. */
(function () {
  "use strict";

  /* ================================================================== core */

  function mulberry32(a) {
    a = a >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var LF = [0];                                   // LF[n] = log(n!)
  function lfact(n) {
    while (LF.length <= n) { var k = LF.length; LF.push(LF[k - 1] + Math.log(k)); }
    return LF[n];
  }

  /* Exact Binomial(n, p) draw: inversion over the outcomes ordered mode, mode-1, mode+1, mode-2, ... */
  function rbinom(n, p, rand) {
    if (n <= 0 || p <= 0) return 0;
    if (p >= 1) return n;
    var q = 1 - p, r = p / q;
    var mode = Math.floor((n + 1) * p);
    if (mode > n) mode = n;
    var pm = Math.exp(lfact(n) - lfact(mode) - lfact(n - mode) + mode * Math.log(p) + (n - mode) * Math.log(q));
    var u = rand() - pm;
    if (u <= 0) return mode;
    var lo = mode, hi = mode, plo = pm, phi = pm;
    while (lo > 0 || hi < n) {
      if (lo > 0) { plo *= lo / ((n - lo + 1) * r); lo--; u -= plo; if (u <= 0) return lo; }
      if (hi < n) { phi *= (n - hi) * r / (hi + 1); hi++; u -= phi; if (u <= 0) return hi; }
    }
    return mode;                                  // only reached through rounding (probability < 1e-12)
  }

  /* Expected F_t for each population (theory), t = 0..T. */
  function theoryF(N, T, m, f0) {
    var out = new Float64Array(T + 1), a = 1 / (2 * N), b = (1 - a) * (1 - m) * (1 - m);
    out[0] = f0;
    for (var t = 1; t <= T; t++) out[t] = a + b * out[t - 1];
    return out;
  }
  function equilibriumF(N, m) {
    if (m <= 0) return 1;
    var a = 1 / (2 * N);
    return a / (1 - (1 - m) * (1 - m) * (1 - a));
  }

  /* Weir–Cockerham F_ST for exactly known population frequencies.
     P: Float64Array of K*S frequencies (population-major: P[k*S + j]). Returns NaN if undefined. */
  function fstWC(P, K, S) {
    var num = 0, den = 0;
    for (var j = 0; j < S; j++) {
      var s = 0, ss = 0, k, x;
      for (k = 0; k < K; k++) { x = P[k * S + j]; s += x; }
      var pbar = s / K;
      for (k = 0; k < K; k++) { x = P[k * S + j] - pbar; ss += x * x; }
      var s2 = ss / (K - 1);
      num += s2;
      den += pbar * (1 - pbar) + s2 / K;
    }
    return den > 0 ? num / den : NaN;
  }

  /* Run one simulation.
     opts: { N, T, K, m, founder (bool), NF, S, seed }
     Returns { traj: [Float64Array(T+1) per population] for the shown SNP (start 0.5),
               founderStart (frequency of the shown SNP in population 1 right after founding, or null),
               fst: Float64Array(T+1) estimated, theory: Float64Array(T+1), eq,
               het: Float64Array(T+1) mean within-population heterozygosity / its start,
               lostShare: share of (population, SNP) pairs with frequency 0 or 1 at generation T } */
  function simulate(opts) {
    var N = opts.N, T = opts.T, K = opts.K, m = opts.m || 0, S = opts.S || 200;
    var NF = opts.NF || 5, founder = !!opts.founder;
    var rand = mulberry32(opts.seed >>> 0);
    var n2 = 2 * N, j, k, t;
    lfact(Math.max(n2, 2 * NF));
    var p0 = new Float64Array(S + 1);             // SNP 0 is the plotted SNP (p0 = 0.5)
    p0[0] = 0.5;
    for (j = 1; j <= S; j++) p0[j] = 0.05 + 0.9 * rand();
    var W = S + 1;
    var P = new Float64Array(K * W);
    for (k = 0; k < K; k++) for (j = 0; j < W; j++) {
      P[k * W + j] = (founder && k === 0) ? rbinom(2 * NF, p0[j], rand) / (2 * NF) : p0[j];
    }
    var traj = [];
    for (k = 0; k < K; k++) { traj.push(new Float64Array(T + 1)); traj[k][0] = P[k * W]; }
    var Pf = new Float64Array(K * S);             // the S SNPs used for F_ST (without SNP 0)
    function fstNow() {
      for (var kk = 0; kk < K; kk++) for (var jj = 0; jj < S; jj++) Pf[kk * S + jj] = P[kk * W + jj + 1];
      return fstWC(Pf, K, S);
    }
    var H0 = 0;
    for (j = 1; j <= S; j++) H0 += 2 * p0[j] * (1 - p0[j]);
    function hetNow() {
      var h = 0;
      for (var kk = 0; kk < K; kk++) for (var jj = 1; jj <= S; jj++) { var x = P[kk * W + jj]; h += 2 * x * (1 - x); }
      return (h / K) / H0;
    }
    var fst = new Float64Array(T + 1), het = new Float64Array(T + 1);
    fst[0] = fstNow(); het[0] = hetNow();
    for (t = 1; t <= T; t++) {
      for (k = 0; k < K; k++) {
        var o = k * W;
        for (j = 0; j < W; j++) {
          var pp = P[o + j];
          if (m > 0) pp = (1 - m) * pp + m * p0[j];
          P[o + j] = rbinom(n2, pp, rand) / n2;
        }
        traj[k][t] = P[o];
      }
      fst[t] = fstNow(); het[t] = hetNow();
    }
    var lost = 0;
    for (k = 0; k < K; k++) for (j = 1; j <= S; j++) { var y = P[k * W + j]; if (y === 0 || y === 1) lost++; }
    // theory: average over populations of F_t (population 1 starts at 1/(2 NF) after a founder event)
    var base = theoryF(N, T, m, 0), theory = new Float64Array(T + 1);
    var fnd = founder ? theoryF(N, T, m, 1 / (2 * NF)) : null;
    for (t = 0; t <= T; t++) theory[t] = founder ? ((K - 1) * base[t] + fnd[t]) / K : base[t];
    return {
      traj: traj, founderStart: founder ? traj[0][0] : null, fst: fst, theory: theory,
      eq: equilibriumF(N, m), het: het, lostShare: lost / (K * S)
    };
  }

  var core = { mulberry32: mulberry32, rbinom: rbinom, lfact: lfact, theoryF: theoryF,
    equilibriumF: equilibriumF, fstWC: fstWC, simulate: simulate };
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  if (typeof document === "undefined") return;

  /* ================================================================== user interface */

  var NS = "http://www.w3.org/2000/svg";
  function S(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag);
    for (var a in attrs) if (attrs[a] != null) e.setAttribute(a, attrs[a]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function H(tag, attrs, parent, html) {
    var e = document.createElement(tag);
    for (var a in attrs) if (attrs[a] != null) e.setAttribute(a, attrs[a]);
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  }
  function fmt(x, d) { var s = x.toFixed(d); return s.charAt(0) === "-" ? "−" + s.slice(1) : s; }
  function niceStep(span, target) {
    var raw = span / target, p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  }

  var N_VALUES = [10, 20, 50, 100, 200, 500, 1000];
  var M_VALUES = [0, 0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1];
  var COLORS = ["--q1", "--q2", "--q3", "--q4", "--q5", "--q7", "--q8", "--q6"];
  var NF = 5, NSNP = 200;

  function init(root) {
    var body = root.querySelector(".widget-body");
    if (!body) return;
    body.innerHTML = "";
    var state = { iN: 3, T: 100, K: 5, iM: 0, founder: false, seed: 2026 };

    function slider(parent, label, min, max, step, value, id) {
      var lab = H("label", { "for": id }, parent);
      lab.appendChild(document.createTextNode(label + " "));
      var inp = H("input", { type: "range", id: id, min: min, max: max, step: step, value: value }, lab);
      var out = H("output", { "for": id, "class": "ps-out" }, lab);
      return { input: inp, out: out };
    }
    var uid = root.id || "w-drift";
    var c1 = H("div", { "class": "controls" }, body);
    var sN = slider(c1, "People per population, N", 0, N_VALUES.length - 1, 1, state.iN, uid + "-n");
    var sT = slider(c1, "Generations", 10, 500, 10, state.T, uid + "-t");
    var c2 = H("div", { "class": "controls" }, body);
    var sK = slider(c2, "Populations", 2, 8, 1, state.K, uid + "-k");
    var sM = slider(c2, "Migration per generation, m", 0, M_VALUES.length - 1, 1, state.iM, uid + "-m");
    var c3 = H("div", { "class": "controls" }, body);
    var fl = H("label", {}, c3);
    var cbF = H("input", { type: "checkbox" }, fl);
    fl.appendChild(document.createTextNode(" Founder event: population 1 starts from " + NF + " people"));
    var bNew = H("button", { type: "button", "class": "btn" }, c3, "New random run");

    var plots = H("div", { "class": "ps-plots" }, body);
    var W = 360, Hh = 250, ML = 44, MR = 12, MT = 30, MB = 40, PW = W - ML - MR, PH = Hh - MT - MB;
    var svg1 = S("svg", { viewBox: "0 0 " + W + " " + Hh, role: "img", "class": "ps-plot" }, plots);
    var svg2 = S("svg", { viewBox: "0 0 " + W + " " + Hh, role: "img", "class": "ps-plot" }, plots);
    var readout = H("div", { "class": "readout", "aria-live": "polite" }, body);
    H("p", { "class": "note" }, body,
      "Simulated data (seeded, so the first view is the same for everyone). Each population has N people " +
      "(2N allele copies) in every generation; there is no selection and no mutation. The F<sub>ST</sub> curve " +
      "uses " + NSNP + " SNPs whose starting frequencies are spread between 0.05 and 0.95.");

    function axes(svg, T, ymax, ylabel, title) {
      S("text", { x: ML, y: 16, "class": "t-b" }, svg, title);
      var g = S("g", {}, svg);
      var ys = niceStep(ymax, 4), xs = niceStep(T, 5), v;
      for (v = 0; v <= ymax + 1e-9; v += ys) {
        var y = MT + PH - v / ymax * PH;
        S("line", { x1: ML, x2: ML + PW, y1: y, y2: y, style: "stroke: var(--border); stroke-width: 1" }, g);
        S("text", { x: ML - 6, y: y + 4, "text-anchor": "end", "class": "t-sm" }, g, ys < 0.1 ? fmt(v, 2) : fmt(v, 1));
      }
      for (v = 0; v <= T + 1e-9; v += xs) {
        var x = ML + v / T * PW;
        S("line", { x1: x, x2: x, y1: MT + PH, y2: MT + PH + 4, style: "stroke: var(--fg-muted)" }, g);
        S("text", { x: x, y: MT + PH + 17, "text-anchor": "middle", "class": "t-sm" }, g, String(Math.round(v)));
      }
      S("line", { x1: ML, x2: ML + PW, y1: MT + PH, y2: MT + PH, style: "stroke: var(--fg-muted)" }, g);
      S("line", { x1: ML, x2: ML, y1: MT, y2: MT + PH, style: "stroke: var(--fg-muted)" }, g);
      S("text", { x: ML + PW / 2, y: Hh - 6, "text-anchor": "middle", "class": "t-sm" }, g, "Generation");
      var yl = S("text", { x: 12, y: MT + PH / 2, "text-anchor": "middle", "class": "t-sm",
        transform: "rotate(-90 12 " + (MT + PH / 2) + ")" }, g);
      if (ylabel === "fst") {
        yl.textContent = "F";
        S("tspan", { "baseline-shift": "sub", style: "font-size: 10px" }, yl, "ST");
      } else yl.textContent = ylabel;
    }
    function path(T, arr, ymax, start) {
      var d = "", step = Math.max(1, Math.floor(T / 300));
      for (var t = start || 0; t <= T; t += step) {
        var x = ML + t / T * PW, y = MT + PH - Math.min(arr[t], ymax) / ymax * PH;
        d += (d ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
      }
      if ((T - (start || 0)) % step) { var xe = ML + PW, ye = MT + PH - Math.min(arr[T], ymax) / ymax * PH; d += "L" + xe.toFixed(1) + " " + ye.toFixed(1); }
      return d;
    }

    var pending = false;
    function schedule() {
      if (pending) return;
      pending = true;
      (window.requestAnimationFrame || setTimeout)(function () { pending = false; render(); });
    }

    function render() {
      var N = N_VALUES[state.iN], T = state.T, K = state.K, m = M_VALUES[state.iM];
      sN.out.textContent = String(N);
      sT.out.textContent = String(T);
      sK.out.textContent = String(K);
      sM.out.textContent = m === 0 ? "0" : String(m);
      var r = simulate({ N: N, T: T, K: K, m: m, founder: state.founder, NF: NF, S: NSNP, seed: state.seed });

      // left: trajectories of one SNP
      while (svg1.firstChild) svg1.removeChild(svg1.firstChild);
      axes(svg1, T, 1, "Allele frequency", "One SNP that starts at 0.5");
      for (var k = 0; k < K; k++) {
        var d = path(T, r.traj[k], 1);
        if (k === 0 && state.founder) {          // vertical jump at generation 0: the founding sample
          d = "M" + ML + " " + (MT + PH / 2).toFixed(1) + "L" + d.slice(1);
        }
        S("path", { d: d, fill: "none", style: "stroke: var(" + COLORS[k] + "); stroke-width: " + (k === 0 && state.founder ? 2.4 : 1.6) }, svg1);
      }
      if (state.founder) {
        var yF = MT + PH - r.traj[0][0] * PH;
        S("text", { x: ML + 6, y: yF < MT + 20 ? yF + 16 : yF - 6, "class": "t-sm" }, svg1, "population 1 after its founding");
      }
      svg1.setAttribute("aria-label", "Allele frequency of one simulated SNP in " + K + " populations over " + T + " generations.");

      // right: F_ST over time
      while (svg2.firstChild) svg2.removeChild(svg2.firstChild);
      var maxv = 0.05;
      for (var t = 0; t <= T; t++) maxv = Math.max(maxv, r.fst[t], r.theory[t]);
      if (m > 0) maxv = Math.max(maxv, Math.min(1, r.eq));
      var YMAX = [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1], ymax = 1;
      for (var yi = 0; yi < YMAX.length; yi++) if (YMAX[yi] >= maxv * 1.05) { ymax = YMAX[yi]; break; }
      axes(svg2, T, ymax, "fst", "");
      var ttl = S("text", { x: ML, y: 16, "class": "t-b" }, svg2, "F");
      S("tspan", { "baseline-shift": "sub", style: "font-size: 10px" }, ttl, "ST");
      S("tspan", {}, ttl, " across " + NSNP + " SNPs");
      if (m > 0 && r.eq < ymax) {
        var yE = MT + PH - r.eq / ymax * PH;
        S("line", { x1: ML, x2: ML + PW, y1: yE, y2: yE, style: "stroke: var(--pitfall); stroke-width: 1.2; stroke-dasharray: 2 3" }, svg2);
        S("text", { x: ML + PW - 4, y: yE - 5, "text-anchor": "end", "class": "t-sm", style: "fill: var(--pitfall)" }, svg2, "equilibrium");
      }
      S("path", { d: path(T, r.theory, ymax), fill: "none", style: "stroke: var(--fg-muted); stroke-width: 1.6; stroke-dasharray: 6 4" }, svg2);
      S("path", { d: path(T, r.fst, ymax), fill: "none", style: "stroke: var(--accent); stroke-width: 2.2" }, svg2);
      var lg = S("g", { transform: "translate(" + (ML + 10) + "," + (MT + 8) + ")" }, svg2);
      S("rect", { x: -6, y: -8, width: 150, height: 40, rx: 4, style: "fill: #fff; fill-opacity: 0.85" }, lg);
      S("line", { x1: 0, x2: 22, y1: 4, y2: 4, style: "stroke: var(--accent); stroke-width: 2.2" }, lg);
      S("text", { x: 28, y: 8, "class": "t-sm" }, lg, "simulated");
      S("line", { x1: 0, x2: 22, y1: 24, y2: 24, style: "stroke: var(--fg-muted); stroke-width: 1.6; stroke-dasharray: 6 4" }, lg);
      S("text", { x: 28, y: 28, "class": "t-sm" }, lg, "expected (theory)");
      svg2.setAttribute("aria-label", "F_ST across " + NSNP + " simulated SNPs over " + T + " generations, simulated and expected.");

      // readout
      var fT = r.fst[T], thT = r.theory[T];
      var lines = [];
      lines.push("Generation " + T + " · N = " + N + " people per population (" + 2 * N + " allele copies) · " + K + " populations · m = " + (m === 0 ? "0" : m));
      lines.push("F<sub>ST</sub> from the simulated SNPs: " + fmt(fT, 3) + " · expected: " + fmt(thT, 3) +
        (m === 0 && !state.founder ? " = 1 − (1 − 1/2N)<sup>t</sup>" : ""));
      lines.push("Heterozygosity within populations: " + fmt(r.het[T], 2) + " of its starting value (expected 1 − F<sub>ST</sub> = " + fmt(1 - thT, 2) + ")");
      lines.push("One allele lost (frequency 0 or 1) in " + Math.round(100 * r.lostShare) + "% of the " + (K * NSNP).toLocaleString("en-US") + " SNP–population pairs");
      if (m > 0) lines.push("Equilibrium with migration: F<sub>ST</sub> = " + fmt(r.eq, 3) + " (approximation 1/(1 + 4Nm) = " + fmt(1 / (1 + 4 * N * m), 3) + ")");
      if (state.founder) lines.push("Population 1 was founded by " + NF + " people (" + 2 * NF + " allele copies): the shown SNP jumped from 0.50 to " + fmt(r.founderStart, 2) + "; on average a founding adds 1/(2·" + NF + ") = " + fmt(1 / (2 * NF), 2) + " to that population's F");
      readout.innerHTML = lines.join("<br>");
    }

    sN.input.addEventListener("input", function () { state.iN = +sN.input.value; schedule(); });
    sT.input.addEventListener("input", function () { state.T = +sT.input.value; schedule(); });
    sK.input.addEventListener("input", function () { state.K = +sK.input.value; schedule(); });
    sM.input.addEventListener("input", function () { state.iM = +sM.input.value; schedule(); });
    cbF.addEventListener("change", function () { state.founder = cbF.checked; schedule(); });
    bNew.addEventListener("click", function () { state.seed = (state.seed * 1103515245 + 12345) >>> 0; schedule(); });
    render();
  }

  function start() {
    var root = document.getElementById("w-drift");
    if (root) init(root);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
