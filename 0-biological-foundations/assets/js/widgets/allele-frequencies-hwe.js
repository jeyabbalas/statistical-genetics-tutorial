/* Widget "Hardy–Weinberg explorer" (page: allele-frequencies).
   Part 1 — a population in Hardy–Weinberg equilibrium (HWE): slider for p = freq(C) (allele 1, Lecture 1
            notation) and the number of people n -> expected genotype frequencies p^2, 2pq, q^2 and counts;
            a live plot of the three curves against p with the current p marked; "draw a sample" simulates
            n people whose two alleles are independent draws (seeded mulberry32, so the first draw is
            reproducible; each further click draws a new sample).
   Part 2 — test observed genotype counts n11 (CC), n12 (CT), n22 (TT):
            p-hat = (2 n11 + n12) / (2n); expected counts n p^2, 2 n p q, n q^2 (from p-hat);
            Pearson X^2 = sum (O - E)^2 / E with 1 degree of freedom (3 classes - 1 - 1 estimated parameter);
            P(chi2_1 >= X^2) = Q(1/2, X^2/2) = erfc(sqrt(X^2/2)), via the regularized upper incomplete gamma
            function (series / continued fraction), also in log space so tiny p-values do not underflow;
            exact HWE test of Wigginton, Cutler & Abecasis (2005), the test PLINK reports;
            observed vs expected heterozygosity and F = 1 - H_obs / H_exp (note X^2 = n F^2 exactly).
   No libraries, no network, no modules: works from file://. Statistics functions are exported for node tests. */
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

  var LN_SQRT_PI = 0.5723649429247001;           // ln Gamma(1/2)

  /* Regularized upper incomplete gamma Q(a, x), returned as {q, lnq}. Numerical Recipes gser/gcf. */
  function gammaQ(a, x, lnGa) {
    var EPS = 1e-16, FPMIN = 1e-300, ITMAX = 100000;
    if (x <= 0) return { q: 1, lnq: 0 };
    var lnPre = -x + a * Math.log(x) - lnGa;     // ln( x^a e^-x / Gamma(a) )
    if (x < a + 1) {                             // series for P, Q = 1 - P
      var ap = a, sum = 1 / a, del = sum;
      for (var n = 0; n < ITMAX; n++) {
        ap += 1; del *= x / ap; sum += del;
        if (Math.abs(del) < Math.abs(sum) * EPS) break;
      }
      var P = sum * Math.exp(lnPre), Q = 1 - P;
      return { q: Q, lnq: Math.log(Q) };
    }
    var b = x + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d;   // continued fraction for Q (modified Lentz)
    for (var i = 1; i < ITMAX; i++) {
      var an = -i * (i - a);
      b += 2;
      d = an * d + b; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = b + an / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      var dl = d * c; h *= dl;
      if (Math.abs(dl - 1) < EPS) break;
    }
    var lnq = lnPre + Math.log(h);
    return { q: Math.exp(lnq), lnq: lnq };
  }

  /* Upper tail of the chi-square distribution with 1 df: P(X >= x) = erfc(sqrt(x/2)). */
  function chiSq1Upper(x) {
    var r = gammaQ(0.5, x / 2, LN_SQRT_PI);
    return { p: Math.min(1, Math.max(0, r.q)), log10p: r.lnq / Math.LN10 };
  }

  function clampCount(v) {
    v = Math.floor(Number(v));
    return isFinite(v) && v > 0 ? v : 0;
  }

  /* Allele frequencies from genotype counts (Lecture 1, slide 75): p1 = (2 n11 + n12) / (2n). */
  function alleleFreqs(n11, n12, n22) {
    var n = n11 + n12 + n22;
    if (n <= 0) return { n: 0, p: NaN, q: NaN };
    var p = (2 * n11 + n12) / (2 * n);
    return { n: n, p: p, q: 1 - p };
  }

  function hweExpectedFreqs(p) { var q = 1 - p; return [p * p, 2 * p * q, q * q]; }

  /* Chi-square test of HWE for a biallelic SNP; p estimated from the same data, so df = 1. */
  function hweChiSq(n11, n12, n22) {
    var a = alleleFreqs(n11, n12, n22), n = a.n, p = a.p, q = a.q;
    var out = { n: n, p: p, q: q, df: 1, valid: false };
    if (n <= 0) return out;
    var ef = hweExpectedFreqs(p);
    out.expected = [n * ef[0], n * ef[1], n * ef[2]];
    out.Hobs = n12 / n;
    out.Hexp = 2 * p * q;
    if (out.Hexp <= 0) { out.F = NaN; out.x2 = NaN; out.pval = NaN; out.log10p = NaN; return out; }  // monomorphic
    var obs = [n11, n12, n22], x2 = 0;
    for (var k = 0; k < 3; k++) {
      var e = out.expected[k];
      if (e > 0) x2 += (obs[k] - e) * (obs[k] - e) / e;
    }
    out.F = 1 - out.Hobs / out.Hexp;
    out.x2 = x2;
    var t = chiSq1Upper(x2);
    out.pval = t.p; out.log10p = t.log10p; out.valid = true;
    return out;
  }

  /* Exact test of HWE (Wigginton JE, Cutler DJ, Abecasis GR. Am J Hum Genet 2005;76:887-893).
     Conditions on the allele counts; the p-value sums the probabilities of all heterozygote counts that are
     no more likely than the observed one. Returns NaN for a monomorphic sample. */
  function hweExact(n11, n12, n22) {
    var obsHets = n12, obsHomc = Math.max(n11, n22), obsHomr = Math.min(n11, n22);
    var rare = 2 * obsHomr + obsHets, genotypes = obsHets + obsHomc + obsHomr;
    if (genotypes <= 0 || rare === 0) return NaN;
    var probs = new Float64Array(rare + 1);
    var mid = Math.floor(rare * (2 * genotypes - rare) / (2 * genotypes));
    if ((rare % 2) !== (mid % 2)) mid++;
    var currHets = mid, currHomr = (rare - mid) / 2, currHomc = genotypes - currHets - currHomr;
    probs[mid] = 1;
    var sum = 1, h;
    for (h = mid; h > 1; h -= 2) {
      probs[h - 2] = probs[h] * h * (h - 1) / (4 * (currHomr + 1) * (currHomc + 1));
      sum += probs[h - 2];
      currHomr++; currHomc++;
    }
    currHomr = (rare - mid) / 2; currHomc = genotypes - mid - currHomr;
    for (h = mid; h <= rare - 2; h += 2) {
      probs[h + 2] = probs[h] * 4 * currHomr * currHomc / ((h + 2) * (h + 1));
      sum += probs[h + 2];
      currHomr--; currHomc--;
    }
    var pObs = probs[obsHets] / sum, pval = 0;
    for (h = rare % 2; h <= rare; h += 2) {
      var ph = probs[h] / sum;
      if (ph <= pObs * (1 + 1e-9)) pval += ph;
    }
    return Math.min(1, pval);
  }

  /* Simulate n people whose two alleles are independent draws with P(C) = p (random mating). */
  function sampleHWE(p, n, seed) {
    var rand = mulberry32(seed >>> 0), c = [0, 0, 0];
    for (var i = 0; i < n; i++) {
      var t = (rand() < p ? 0 : 1) + (rand() < p ? 0 : 1);   // number of T alleles: 0 = CC, 1 = CT, 2 = TT
      c[t]++;
    }
    return c;
  }

  /* p-values as HTML: 0.493, 0.0012, 4.3 × 10<sup>−8</sup>, < 10<sup>−300</sup>. */
  function formatP(p, log10p) {
    if (!isFinite(p) && !isFinite(log10p)) return "—";
    if (p >= 0.001) return p >= 0.995 ? "1.00" : p.toPrecision(2);
    var l = (p > 0) ? Math.log10(p) : log10p;
    if (!isFinite(l) || l < -300) return "&lt; 10<sup>−300</sup>";
    var e = Math.floor(l), m = Math.pow(10, l - e);
    if (m >= 9.95) { m = 1; e += 1; }
    return m.toFixed(1) + " × 10<sup>" + (e < 0 ? "−" + (-e) : e) + "</sup>";
  }
  // "p = 0.49" but "p < 10^−300" (no "= <")
  function pEq(s) { return (s.indexOf("&lt;") === 0 ? " " : " = ") + s; }

  var STATS = { mulberry32: mulberry32, gammaQ: gammaQ, chiSq1Upper: chiSq1Upper, alleleFreqs: alleleFreqs,
                hweExpectedFreqs: hweExpectedFreqs, hweChiSq: hweChiSq, hweExact: hweExact,
                sampleHWE: sampleHWE, formatP: formatP };
  if (typeof module !== "undefined" && module.exports) module.exports = STATS;
  if (typeof document === "undefined") return;

  /* ------------------------------------------------------------------ DOM helpers */

  var SVGNS = "http://www.w3.org/2000/svg";
  function svgEl(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function svgText(parent, x, y, txt, cls, extra) {
    var a = { x: x, y: y, "class": cls || "t-sm" };
    if (extra) for (var k in extra) a[k] = extra[k];
    var t = svgEl("text", a, parent);
    t.textContent = txt;
    return t;
  }
  function h(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function fmt(x, d) { return isFinite(x) ? x.toFixed(d) : "—"; }
  function fmtCount(x) { return isFinite(x) ? (Math.abs(x - Math.round(x)) < 1e-9 ? String(Math.round(x)) : x.toFixed(1)) : "—"; }
  function signed(x, d) { return !isFinite(x) ? "—" : (x < 0 ? "−" + (-x).toFixed(d) : x.toFixed(d)); }
  function thousands(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

  var GENO = ["CC", "CT", "TT"];
  var GCOL = ["var(--q1)", "var(--q2)", "var(--q4)"];
  var GFORM = ["p²", "2pq", "q²"];

  var PRESETS = {
    mthfr:   { counts: [334, 350, 82],   label: "MTHFR C677T (Lecture 1)",
               note: "Counts shown on Lecture 1 slides 74 and 77 (766 people; the slides cite Han et al. 2007). Alleles C and T as on the slides." },
    error:   { counts: [1148, 672, 180], label: "Genotyping error",
               note: "Simulated: 2,000 people with freq(T) = 0.30 in HWE (980 CC, 840 CT, 180 TT); then 20% of the true heterozygotes were called CC, as happens when a heterozygote cluster overlaps a homozygote cluster." },
    wahlund: { counts: [485, 330, 185],  label: "Two populations pooled",
               note: "Simulated: 500 people from a population with freq(T) = 0.10 plus 500 from one with freq(T) = 0.60. Each group is exactly in HWE; the pooled sample is not (Wahlund effect)." },
    dup:     { counts: [120, 860, 20],   label: "Duplicated sequence",
               note: "Simulated: the assay also reads a second, nearly identical copy of the sequence elsewhere in the genome that carries T, so many people look heterozygous." }
  };

  /* ------------------------------------------------------------------ widget */

  function init() {
    var root = document.getElementById("w-hwe");
    if (!root) return;
    var body = root.querySelector(".widget-body");
    if (!body) return;
    body.innerHTML = "";

    var state = { p: 0.66, n: 766, counts: PRESETS.mthfr.counts.slice(), seed: 20261021, draws: 0, preset: "mthfr" };

    var grid = h("div", { "class": "hwe-grid" });
    body.appendChild(grid);

    /* ---- Part 1: population under HWE ---- */
    var c1 = h("div", { "class": "hwe-col" });
    grid.appendChild(c1);
    c1.appendChild(h("h4", { "class": "hwe-h" }, "1 · A population in Hardy–Weinberg equilibrium"));
    var ctl1 = h("div", { "class": "controls" });
    var lp = h("label", null, "p = freq(C) ");
    var pIn = h("input", { type: "range", min: "0", max: "1", step: "0.01", value: String(state.p), "aria-label": "p, the frequency of allele C" });
    var pOut = h("output", { "class": "hwe-val" }, "");
    lp.appendChild(pIn); lp.appendChild(pOut);
    var ln = h("label", null, "people n ");
    var nIn = h("input", { type: "number", min: "1", max: "1000000", step: "1", value: String(state.n), "aria-label": "number of people n", style: "width:7.5em" });
    ln.appendChild(nIn);
    ctl1.appendChild(lp); ctl1.appendChild(ln);
    c1.appendChild(ctl1);
    var exp1 = h("div", { "class": "readout hwe-exp", "aria-live": "polite" });
    c1.appendChild(exp1);
    var curves = svgEl("svg", { viewBox: "0 0 360 302", role: "img", "aria-labelledby": "hwe-cv-t", "class": "hwe-svg" });
    var cvt = svgEl("title", { id: "hwe-cv-t" }, curves);
    cvt.textContent = "Genotype frequencies p squared, 2pq and q squared plotted against p, with the current p and the observed sample marked";
    c1.appendChild(curves);
    var ctl1b = h("div", { "class": "controls" });
    var drawBtn = h("button", { "class": "btn primary", type: "button", id: "hwe-draw" }, "Draw a sample of n people");
    ctl1b.appendChild(drawBtn);
    c1.appendChild(ctl1b);
    c1.appendChild(h("p", { "class": "note" }, "Each simulated person gets two independent draws from the allele pool (random mating). The counts go into part 2 for testing; draw several samples and watch how often p &lt; 0.05 by chance alone."));

    /* ---- Part 2: test observed counts ---- */
    var c2 = h("div", { "class": "hwe-col" });
    grid.appendChild(c2);
    c2.appendChild(h("h4", { "class": "hwe-h" }, "2 · Test observed genotype counts"));
    var pre = h("div", { "class": "controls hwe-presets", role: "group", "aria-label": "Example data sets" });
    var presetBtns = {};
    Object.keys(PRESETS).forEach(function (k) {
      var b = h("button", { "class": "btn", type: "button", "data-preset": k, id: "hwe-preset-" + k }, PRESETS[k].label);
      presetBtns[k] = b;
      pre.appendChild(b);
    });
    c2.appendChild(pre);
    var ctl2 = h("div", { "class": "controls hwe-counts" });
    var cIn = [];
    [["n<sub>11</sub> = CC", 0], ["n<sub>12</sub> = CT", 1], ["n<sub>22</sub> = TT", 2]].forEach(function (d) {
      var l = h("label", null, "<span>" + d[0] + "</span>");
      var inp = h("input", { type: "number", min: "0", max: "10000000", step: "1", value: String(state.counts[d[1]]), "aria-label": "observed count of genotype " + GENO[d[1]], style: "width:6.5em" });
      l.appendChild(inp); ctl2.appendChild(l); cIn.push(inp);
    });
    c2.appendChild(ctl2);
    var srcNote = h("p", { "class": "note hwe-src" }, "");
    c2.appendChild(srcNote);
    var out2 = h("div", { "class": "readout hwe-out", "aria-live": "polite" });
    c2.appendChild(out2);
    var bars = svgEl("svg", { viewBox: "0 0 360 240", role: "img", "aria-labelledby": "hwe-bar-t", "class": "hwe-svg" });
    var bt = svgEl("title", { id: "hwe-bar-t" }, bars);
    bt.textContent = "Observed and expected genotype counts for CC, CT and TT";
    c2.appendChild(bars);
    var verdict = h("p", { "class": "hwe-verdict", "aria-live": "polite" });
    c2.appendChild(verdict);

    /* ---- drawing: curves ---- */
    var CV = { x0: 50, x1: 346, y0: 238, y1: 22 };
    function cx(p) { return CV.x0 + p * (CV.x1 - CV.x0); }
    function cy(f) { return CV.y0 - f * (CV.y0 - CV.y1); }
    var cvDyn = null;
    (function drawCurveFrame() {
      var g = svgEl("g", null, curves);
      for (var i = 0; i <= 4; i++) {
        var v = i / 4;
        svgEl("line", { x1: CV.x0, x2: CV.x1, y1: cy(v), y2: cy(v), stroke: "var(--border)", "stroke-width": 1 }, g);
        svgText(g, CV.x0 - 6, cy(v) + 4, v === 0 ? "0" : v === 1 ? "1" : v.toFixed(2), "t-sm", { "text-anchor": "end" });
        svgEl("line", { x1: cx(v), x2: cx(v), y1: CV.y0, y2: CV.y0 + 4, stroke: "var(--fg-faint)" }, g);
        svgText(g, cx(v), CV.y0 + 17, v === 0 ? "0" : v === 1 ? "1" : String(v), "t-sm", { "text-anchor": "middle" });
      }
      svgEl("line", { x1: CV.x0, x2: CV.x1, y1: CV.y0, y2: CV.y0, stroke: "var(--fg-muted)" }, g);
      svgText(g, (CV.x0 + CV.x1) / 2, CV.y0 + 36, "p = frequency of C   (q = 1 − p = frequency of T)", "t-sm", { "text-anchor": "middle" });
      svgText(g, 12, (CV.y0 + CV.y1) / 2, "genotype frequency", "t-sm", { "text-anchor": "middle", transform: "rotate(-90 12 " + ((CV.y0 + CV.y1) / 2) + ")" });
      var fns = [function (p) { return p * p; }, function (p) { return 2 * p * (1 - p); }, function (p) { return (1 - p) * (1 - p); }];
      for (var k = 0; k < 3; k++) {
        var d = "";
        for (var j = 0; j <= 100; j++) { var pp = j / 100; d += (j ? "L" : "M") + cx(pp).toFixed(1) + "," + cy(fns[k](pp)).toFixed(1); }
        svgEl("path", { d: d, fill: "none", stroke: GCOL[k], "stroke-width": k === 1 ? 3 : 2.5 }, g);
      }
      svgText(g, cx(0.97), cy(0.94) - 8, "CC: p²", "t-b", { "text-anchor": "end", fill: GCOL[0] }).style.fill = GCOL[0];
      var ctl = svgText(g, cx(0.5), cy(0.5) - 15, "CT: 2pq", "t-b", { "text-anchor": "middle" }); ctl.style.fill = "var(--fg)"; ctl.style.paintOrder = "stroke"; ctl.style.stroke = "var(--bg)"; ctl.style.strokeWidth = "4px";
      svgText(g, cx(0.03), cy(0.94) - 8, "TT: q²", "t-b", { "text-anchor": "start" }).style.fill = GCOL[2];
      cvDyn = svgEl("g", null, curves);
    })();

    function drawCurves(obs) {
      while (cvDyn.firstChild) cvDyn.removeChild(cvDyn.firstChild);
      var p = state.p, ef = hweExpectedFreqs(p);
      svgEl("line", { x1: cx(p), x2: cx(p), y1: CV.y0, y2: CV.y1 - 6, stroke: "var(--fg)", "stroke-dasharray": "4 3", "stroke-width": 1.2 }, cvDyn);
      for (var k = 0; k < 3; k++) svgEl("circle", { cx: cx(p), cy: cy(ef[k]), r: 5.5, fill: GCOL[k], stroke: "var(--bg)", "stroke-width": 1.5 }, cvDyn);
      var anchor = p > 0.85 ? "end" : p < 0.15 ? "start" : "middle";
      svgText(cvDyn, cx(p), CV.y1 - 10, "p = " + p.toFixed(2), "t-b", { "text-anchor": anchor });
      if (obs && obs.n > 0 && isFinite(obs.p)) {
        var of = [obs.c[0] / obs.n, obs.c[1] / obs.n, obs.c[2] / obs.n];
        for (var m = 0; m < 3; m++) {
          var X = cx(obs.p), Y = cy(of[m]), s = 7;
          svgEl("path", { d: "M" + X + "," + (Y - s) + "L" + (X + s) + "," + Y + "L" + X + "," + (Y + s) + "L" + (X - s) + "," + Y + "Z",
                          fill: "var(--bg)", stroke: GCOL[m], "stroke-width": 2.5 }, cvDyn);
        }
      }
      // legend
      var lg = svgEl("g", { transform: "translate(14," + (CV.y0 + 56) + ")" }, cvDyn);
      svgEl("circle", { cx: 6, cy: -4, r: 5, fill: "var(--fg-muted)" }, lg);
      svgText(lg, 16, 0, "expected at the slider’s p", "t-sm");
      svgEl("path", { d: "M183,-11L190,-4L183,3L176,-4Z", fill: "var(--bg)", stroke: "var(--fg-muted)", "stroke-width": 2 }, lg);
      svgText(lg, 196, 0, "observed in part 2", "t-sm");
    }

    /* ---- drawing: bars ---- */
    var BR = { x0: 46, x1: 350, y0: 196, y1: 26 };
    function drawBars(r, c) {
      while (bars.childNodes.length > 1) bars.removeChild(bars.lastChild);
      var n = r.n;
      if (!(n > 0)) { svgText(bars, 180, 120, "Enter genotype counts", "t", { "text-anchor": "middle" }); return; }
      var maxV = Math.max(c[0], c[1], c[2], r.expected[0], r.expected[1], r.expected[2]) || 1;
      var nice = niceMax(maxV * 1.12);
      function by(v) { return BR.y0 - v / nice * (BR.y0 - BR.y1); }
      for (var i = 0; i <= 4; i++) {
        var v = nice * i / 4;
        svgEl("line", { x1: BR.x0, x2: BR.x1, y1: by(v), y2: by(v), stroke: "var(--border)" }, bars);
        svgText(bars, BR.x0 - 6, by(v) + 4, abbrev(v), "t-sm", { "text-anchor": "end" });
      }
      svgEl("line", { x1: BR.x0, x2: BR.x1, y1: BR.y0, y2: BR.y0, stroke: "var(--fg-muted)" }, bars);
      var gw = (BR.x1 - BR.x0) / 3, bw = Math.min(42, gw * 0.32);
      for (var k = 0; k < 3; k++) {
        var gx = BR.x0 + gw * k + gw / 2;
        var o = c[k], e = r.expected[k];
        svgEl("rect", { x: gx - bw - 3, y: by(o), width: bw, height: Math.max(0, BR.y0 - by(o)), fill: GCOL[k] }, bars);
        svgEl("rect", { x: gx + 3, y: by(e), width: bw, height: Math.max(0, BR.y0 - by(e)), fill: "var(--bg)", stroke: GCOL[k], "stroke-width": 2, "stroke-dasharray": "5 3" }, bars);
        svgText(bars, gx - bw / 2 - 3, by(o) - 5, abbrev(o), "t-sm", { "text-anchor": "middle" });
        svgText(bars, gx + bw / 2 + 3, by(e) - 5, abbrev(e), "t-sm", { "text-anchor": "middle" });
        svgText(bars, gx, BR.y0 + 17, GENO[k], "t-b", { "text-anchor": "middle" });
      }
      var lg = svgEl("g", { transform: "translate(" + (BR.x0 - 30) + ",230)" }, bars);
      svgEl("rect", { x: 0, y: -10, width: 14, height: 11, fill: "var(--fg-muted)" }, lg);
      svgText(lg, 20, 0, "observed", "t-sm");
      svgEl("rect", { x: 96, y: -10, width: 14, height: 11, fill: "var(--bg)", stroke: "var(--fg-muted)", "stroke-width": 1.5, "stroke-dasharray": "4 2" }, lg);
      svgText(lg, 116, 0, "expected under HWE", "t-sm");
    }
    function niceMax(v) {
      var e = Math.pow(10, Math.floor(Math.log10(v))), m = v / e;
      var s = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 4 ? 4 : m <= 5 ? 5 : m <= 8 ? 8 : 10;
      return s * e;
    }
    function abbrev(v) {
      if (!isFinite(v)) return "—";
      if (v >= 1e6) return (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + "M";
      if (v >= 1e4) return (v / 1e3).toFixed(v >= 1e5 ? 0 : 1) + "k";
      return Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(1);
    }

    /* ---- update ---- */
    function update() {
      var p = state.p, q = 1 - p, ef = hweExpectedFreqs(p), n = state.n;
      pOut.textContent = p.toFixed(2);
      var minor = p < 0.5 ? "C" : p > 0.5 ? "T" : "neither, a tie";
      exp1.innerHTML =
        '<table class="hwe-t"><thead><tr><th></th><th>CC</th><th>CT</th><th>TT</th></tr></thead><tbody>' +
        "<tr><th>HWE formula</th>" + [0, 1, 2].map(function (k) { return "<td>" + GFORM[k] + "</td>"; }).join("") + "</tr>" +
        "<tr><th>frequency</th>" + [0, 1, 2].map(function (k) { return "<td>" + ef[k].toFixed(3) + "</td>"; }).join("") + "</tr>" +
        "<tr><th>expected count, n = " + thousands(n) + "</th>" + [0, 1, 2].map(function (k) { return "<td>" + fmtCount(n * ef[k]) + "</td>"; }).join("") + "</tr>" +
        "</tbody></table>" +
        "<div>q = freq(T) = " + q.toFixed(2) + " · MAF = " + Math.min(p, q).toFixed(2) + " (minor allele: " + minor + ")</div>" +
        "<div>expected heterozygosity 2pq = " + (2 * p * q).toFixed(3) + "</div>";

      var c = state.counts, r = hweChiSq(c[0], c[1], c[2]), ex = hweExact(c[0], c[1], c[2]);
      drawCurves({ n: r.n, p: r.p, c: c });
      drawBars(r, c);
      if (!(r.n > 0)) { out2.innerHTML = "Enter genotype counts (at least one person)."; verdict.innerHTML = ""; return; }
      var minorHat = r.p < 0.5 ? "C" : r.p > 0.5 ? "T" : "neither, a tie";
      var html = '<table class="hwe-t"><thead><tr><th></th><th>CC</th><th>CT</th><th>TT</th><th>total</th></tr></thead><tbody>' +
        "<tr><th>observed</th><td>" + c.map(thousands).join("</td><td>") + "</td><td>" + thousands(r.n) + "</td></tr>" +
        "<tr><th>expected</th><td>" + r.expected.map(function (e) { return fmt(e, 1); }).join("</td><td>") + "</td><td>" + thousands(r.n) + "</td></tr>" +
        "</tbody></table>" +
        "<div><span class=\"hat\">p</span> = freq(C) = " + fmt(r.p, 4) + " · <span class=\"hat\">q</span> = freq(T) = " + fmt(r.q, 4) + " · MAF = " + fmt(Math.min(r.p, r.q), 4) + " (minor allele: " + minorHat + ")</div>";
      if (!r.valid) {
        html += "<div>Only one allele is present: the SNP is monomorphic in this sample, so HWE cannot be tested.</div>";
        out2.innerHTML = html; verdict.innerHTML = ""; return;
      }
      html += "<div>heterozygosity: observed " + fmt(r.Hobs, 3) + " · expected 2<span class=\"hat\">p</span><span class=\"hat\">q</span> = " + fmt(r.Hexp, 3) + "</div>" +
        "<div>F = 1 − observed / expected = " + signed(r.F, 3) + "</div>" +
        "<div>χ² = " + (r.x2 < 100 ? r.x2.toFixed(2) : r.x2.toFixed(0)) + " (df = 1) → p" + pEq(formatP(r.pval, r.log10p)) +
        " · exact test p" + pEq(formatP(ex, NaN)) + "</div>" +
        "<div class=\"hwe-dim\">With n = " + thousands(r.n) + ", |F| must exceed 1.96/√n = " + (1.959964 / Math.sqrt(r.n)).toFixed(3) + " to reach p &lt; 0.05.</div>";
      out2.innerHTML = html;
      var dir = r.F > 0 ? "fewer heterozygotes than expected" : "more heterozygotes than expected";
      var pv = isFinite(ex) ? ex : r.pval;
      var v, cls;
      if (pv >= 0.05) { cls = "ok"; } else if (pv >= 1e-6) { cls = "warn"; } else { cls = "bad"; }
      verdict.className = "hwe-verdict " + cls;
      if (pv >= 0.05) v = "<strong>Consistent with HWE</strong> (exact p ≥ 0.05): the counts are what random mating predicts, up to sampling noise.";
      else if (pv >= 1e-6) v = "<strong>Some evidence of deviation</strong> (" + dir + "), but this SNP would pass a typical QC filter that removes SNPs with p &lt; 10<sup>−6</sup>.";
      else v = "<strong>Strong deviation</strong>: " + dir + " (F = " + signed(r.F, 2) + "). A typical QC filter (p &lt; 10<sup>−6</sup>) would remove this SNP.";
      verdict.innerHTML = v;
    }

    function setCounts(c, presetKey) {
      state.counts = c.slice();
      for (var k = 0; k < 3; k++) cIn[k].value = String(c[k]);
      state.preset = presetKey || null;
      Object.keys(presetBtns).forEach(function (key) { presetBtns[key].classList.toggle("primary", key === presetKey); presetBtns[key].setAttribute("aria-pressed", key === presetKey ? "true" : "false"); });
    }
    function syncSliderToData() {
      var a = alleleFreqs(state.counts[0], state.counts[1], state.counts[2]);
      if (a.n > 0 && isFinite(a.p)) {
        state.p = Math.round(a.p * 100) / 100; pIn.value = String(state.p);
        state.n = a.n; nIn.value = String(a.n);
      }
    }

    Object.keys(PRESETS).forEach(function (k) {
      presetBtns[k].addEventListener("click", function () {
        setCounts(PRESETS[k].counts, k);
        srcNote.textContent = PRESETS[k].note;
        syncSliderToData();
        update();
      });
    });
    cIn.forEach(function (inp) {
      inp.addEventListener("input", function () {
        var c = cIn.map(function (x) { return clampCount(x.value); });
        setCounts(c, null);
        for (var k = 0; k < 3; k++) cIn[k].value = String(c[k]);
        srcNote.textContent = "Your own counts.";
        syncSliderToData();
        update();
      });
    });
    pIn.addEventListener("input", function () { state.p = Number(pIn.value); update(); });
    nIn.addEventListener("change", function () {
      var v = Math.min(1000000, Math.max(1, clampCount(nIn.value) || 1));
      state.n = v; nIn.value = String(v); update();
    });
    drawBtn.addEventListener("click", function () {
      var v = Math.min(1000000, Math.max(1, clampCount(nIn.value) || 1));
      state.n = v; nIn.value = String(v);
      state.draws += 1;
      var c = sampleHWE(state.p, state.n, state.seed + state.draws);
      setCounts(c, null);
      srcNote.textContent = "Simulated sample " + state.draws + ": " + thousands(state.n) + " people drawn from a population in HWE with p = freq(C) = " + state.p.toFixed(2) + ".";
      drawBtn.textContent = "Draw another sample";
      update();
    });

    setCounts(state.counts, "mthfr");
    srcNote.textContent = PRESETS.mthfr.note;
    update();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
