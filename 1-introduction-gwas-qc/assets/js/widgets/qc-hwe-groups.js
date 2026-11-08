/* Widget "Why QC reads the controls: HWE in ALL, AFF and UNAFF" (page: qc-hwe.html, section #what-it-finds).
   Root element: <div class="widget" id="w-hwe-groups">.

   What it shows. One SNP with a risk allele (allele 1, frequency p in the population) in a case-control study.
   The population is in Hardy-Weinberg equilibrium: genotype frequencies p^2, 2pq, q^2 for 2, 1, 0 copies of
   allele 1 (q = 1 - p). The risk of disease for 0, 1, 2 copies is f0, f0*r1, f0*r2, with
       multiplicative: r1 = g, r2 = g^2;  dominant: r1 = r2 = g;  recessive: r1 = 1, r2 = g   (g = genotype relative risk),
   and f0 chosen so that the prevalence K = q^2 f0 + 2pq f0 r1 + p^2 f0 r2 (risks are capped at 1).
   Genotype frequencies in cases are proportional to P(genotype) * risk, in controls to P(genotype) * (1 - risk).
   Genotyping error: each true heterozygote is called homozygous with probability e (half of them each way).
   Counts: either the expected counts (rounded, largest remainders) or one simulated sample (seeded multinomial
   draws). ALL = cases + controls, as in PLINK's --hardy report when everyone has a case/control phenotype.
   For each group PLINK's columns are computed:
       GENO = n11/n12/n22 (allele 1 homozygotes / heterozygotes / allele 2 homozygotes)
       O(HET) = n12 / n,   E(HET) = 2 p^ (1 - p^) with p^ = (2 n11 + n12) / (2n) from the same group,
       P = Hardy-Weinberg exact test (Wigginton, Cutler & Abecasis 2005), optionally the mid-p version
           (Graffelman & Moreno 2013): sum of the probabilities of the heterozygote counts that are less likely
           than the observed one, plus half the probability of those exactly as likely.
   The exact-test code is the one in Lecture 0's allele-frequencies-hwe.js, with a mid-p option added.
   Vanilla JS, no libraries, no network; works from file://. The core is exported for Node tests. */
(function () {
  "use strict";

  /* ================================================================== core */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Probabilities of every possible heterozygote count given n people and the allele counts (Wigginton et al. 2005).
  function hweProbs(n11, n12, n22) {
    var obsHomc = Math.max(n11, n22), obsHomr = Math.min(n11, n22);
    var rare = 2 * obsHomr + n12, genotypes = n12 + obsHomc + obsHomr;
    if (genotypes <= 0 || rare === 0) return null;
    var probs = new Float64Array(rare + 1);
    var mid = Math.floor(rare * (2 * genotypes - rare) / (2 * genotypes));
    if ((rare % 2) !== (mid % 2)) mid++;
    var currHomr = (rare - mid) / 2, currHomc = genotypes - mid - currHomr, h, sum = 1;
    probs[mid] = 1;
    for (h = mid; h > 1; h -= 2) {
      probs[h - 2] = probs[h] * h * (h - 1) / (4 * (currHomr + 1) * (currHomc + 1));
      sum += probs[h - 2]; currHomr++; currHomc++;
    }
    currHomr = (rare - mid) / 2; currHomc = genotypes - mid - currHomr;
    for (h = mid; h <= rare - 2; h += 2) {
      probs[h + 2] = probs[h] * 4 * currHomr * currHomc / ((h + 2) * (h + 1));
      sum += probs[h + 2]; currHomr--; currHomc--;
    }
    for (h = rare % 2; h <= rare; h += 2) probs[h] /= sum;
    return { probs: probs, rare: rare };
  }
  // Exact p-value: total probability of the heterozygote counts no more likely than the observed one.
  // midp: counts exactly as likely as the observed one (including it) contribute half their probability.
  function hweExact(n11, n12, n22, midp) {
    var r = hweProbs(n11, n12, n22);
    if (!r) return midp ? 0.5 : 1;     // monomorphic or no data: PLINK reports 1 (0.5 with midp)
    var pObs = r.probs[n12], below = 0, tie = 0, h;
    for (h = r.rare % 2; h <= r.rare; h += 2) {
      var ph = r.probs[h];
      if (ph < pObs * (1 - 1e-9)) below += ph;
      else if (ph <= pObs * (1 + 1e-9)) tie += ph;
    }
    return Math.min(1, midp ? below + 0.5 * tie : below + tie);
  }

  function relRisks(model, g) {
    if (model === "dominant") return [1, g, g];
    if (model === "recessive") return [1, 1, g];
    return [1, g, g * g];   // multiplicative
  }
  // Genotype probabilities (index = copies of allele 1: 0, 1, 2) in the population, cases and controls.
  function groupProbs(p, model, g, K) {
    var q = 1 - p, pop = [q * q, 2 * p * q, p * p], rr = relRisks(model, g);
    var f0 = K / (pop[0] * rr[0] + pop[1] * rr[1] + pop[2] * rr[2]);
    var risk = rr.map(function (r) { return Math.min(1, f0 * r); });
    var cs = pop.map(function (x, k) { return x * risk[k]; }), ct = pop.map(function (x, k) { return x * (1 - risk[k]); });
    var sc = cs[0] + cs[1] + cs[2], st = ct[0] + ct[1] + ct[2];
    return { pop: pop, risk: risk, cases: cs.map(function (x) { return x / sc; }), controls: ct.map(function (x) { return x / st; }) };
  }
  // Calling error: a share e of true heterozygotes is called homozygous, half each way.
  function withError(pr, e) {
    return [pr[0] + pr[1] * e / 2, pr[1] * (1 - e), pr[2] + pr[1] * e / 2];
  }
  // Expected counts rounded to whole people that still add up to n (largest remainders).
  function roundCounts(pr, n) {
    var raw = pr.map(function (x) { return x * n; }), fl = raw.map(Math.floor);
    var left = n - fl[0] - fl[1] - fl[2];
    var order = [0, 1, 2].sort(function (a, b) { return (raw[b] - fl[b]) - (raw[a] - fl[a]); });
    for (var k = 0; k < left; k++) fl[order[k]]++;
    return fl;
  }
  function drawCounts(pr, n, rnd) {
    var c = [0, 0, 0];
    for (var i = 0; i < n; i++) { var u = rnd(); c[u < pr[0] ? 0 : (u < pr[0] + pr[1] ? 1 : 2)]++; }
    return c;
  }
  // Counts c are indexed by copies of allele 1 (0, 1, 2); PLINK's GENO lists n11/n12/n22 = c[2]/c[1]/c[0].
  function hardyRow(c, midp) {
    var n11 = c[2], n12 = c[1], n22 = c[0], n = n11 + n12 + n22;
    var p1 = n ? (2 * n11 + n12) / (2 * n) : NaN;
    return { n11: n11, n12: n12, n22: n22, n: n, p1: p1,
             ohet: n ? n12 / n : NaN, ehet: n ? 2 * p1 * (1 - p1) : NaN,
             expected: [n * (1 - p1) * (1 - p1), n * 2 * p1 * (1 - p1), n * p1 * p1],
             P: hweExact(n11, n12, n22, midp) };
  }
  function study(opt) {
    // opt: {p, model, g, K, e, nCases, nControls, mode: "expected"|"sample", seed, midp}
    var gp = groupProbs(opt.p, opt.model, opt.g, opt.K);
    var prCase = withError(gp.cases, opt.e), prCtrl = withError(gp.controls, opt.e);
    var cCase, cCtrl;
    if (opt.mode === "sample") {
      var rnd = mulberry32(opt.seed);
      cCase = drawCounts(prCase, opt.nCases, rnd); cCtrl = drawCounts(prCtrl, opt.nControls, rnd);
    } else {
      cCase = roundCounts(prCase, opt.nCases); cCtrl = roundCounts(prCtrl, opt.nControls);
    }
    var cAll = [cCase[0] + cCtrl[0], cCase[1] + cCtrl[1], cCase[2] + cCtrl[2]];
    return { probs: gp, ALL: hardyRow(cAll, opt.midp), AFF: hardyRow(cCase, opt.midp), UNAFF: hardyRow(cCtrl, opt.midp) };
  }

  var core = { mulberry32: mulberry32, hweProbs: hweProbs, hweExact: hweExact, groupProbs: groupProbs, withError: withError,
               roundCounts: roundCounts, hardyRow: hardyRow, study: study };
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  if (typeof document === "undefined") return;

  /* ================================================================== view */
  var root = document.getElementById("w-hwe-groups");
  if (!root) return;
  var body = root.querySelector(".widget-body");
  var SVGNS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, parent, text) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function sv(tag, attrs, parent, text) {
    var e = document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  // P as PLINK prints it (4 significant digits), with Unicode exponents for small values.
  function fmtP(x) {
    if (!isFinite(x)) return "nan";
    if (x === 0) return "0";
    if (x >= 1e-4) return String(Number(x.toPrecision(4)));
    var s = x.toExponential(3).split("e"), m = Number(s[0]), ex = Number(s[1]);
    var sup = String(ex).replace(/-/g, "⁻").replace(/[0-9]/g, function (d) { return "⁰¹²³⁴⁵⁶⁷⁸⁹"[d]; });
    return m + " × 10" + sup;
  }
  // A number as C's printf("%.4g") writes it, which is how PLINK prints O(HET), E(HET) and P in .hwe.
  function g4(x) {
    if (!isFinite(x)) return "nan";
    if (x === 0) return "0";
    var ex = Math.floor(Math.log10(Math.abs(Number(x.toPrecision(4)))));
    if (ex < -4 || ex >= 4) {
      var s = x.toExponential(3).split("e"), m = s[0].replace(/\.?0+$/, ""), e = Number(s[1]);
      return m + "e" + (e < 0 ? "-" : "+") + (Math.abs(e) < 10 ? "0" : "") + Math.abs(e);
    }
    var t = x.toPrecision(4);
    return t.indexOf(".") >= 0 ? t.replace(/\.?0+$/, "") : t;
  }
  function pad(s, w, right) { while (s.length < w) s = right ? " " + s : s + " "; return s; }

  body.innerHTML = "";
  el("p", { "class": "note" }, body,
     "One SNP in a case–control study. Allele 1 raises the risk of disease; the population itself is in Hardy–Weinberg " +
     "equilibrium. The bars are the genotype counts in each group; the outlined boxes are the counts that Hardy–Weinberg " +
     "proportions predict from that group's own allele frequency.");
  var controls = el("div", { "class": "controls" }, body);
  function range(label, id, min, max, step, value, show) {
    var lab = el("label", { "for": id }, controls);
    lab.appendChild(document.createTextNode(label + " "));
    var inp = el("input", { type: "range", id: id, min: min, max: max, step: step, value: value }, lab);
    var out = el("output", { "for": id, "class": "hg-val" }, lab, show(Number(value)));
    inp.addEventListener("input", function () { out.textContent = show(Number(inp.value)); update(); });
    return inp;
  }
  function select(label, id, opts, value) {
    var lab = el("label", { "for": id }, controls);
    lab.appendChild(document.createTextNode(label + " "));
    var s = el("select", { id: id }, lab);
    opts.forEach(function (o) { var op = el("option", { value: o[0] }, s, o[1]); if (o[0] === value) op.selected = true; });
    s.addEventListener("change", update);
    return s;
  }
  var inModel = select("Disease model", "hg-model", [["multiplicative", "multiplicative"], ["dominant", "dominant"], ["recessive", "recessive"]], "recessive");
  var inG = range("Genotype relative risk", "hg-g", 1, 5, 0.1, 2.5, function (v) { return v.toFixed(1); });
  var inP = range("Allele 1 frequency p", "hg-p", 0.05, 0.5, 0.01, 0.3, function (v) { return v.toFixed(2); });
  var inK = range("Prevalence", "hg-k", 0.01, 0.3, 0.01, 0.05, function (v) { return Math.round(v * 100) + "%"; });
  var inE = range("Heterozygotes called homozygous", "hg-e", 0, 0.2, 0.01, 0, function (v) { return Math.round(v * 100) + "%"; });
  var inN = select("Study size", "hg-n", [["1", "463 cases, 470 controls"], ["10", "4,630 cases, 4,700 controls"]], "1");
  var inMode = select("Counts", "hg-mode", [["expected", "expected counts"], ["sample", "one simulated sample"]], "expected");
  var midLab = el("label", { "for": "hg-midp" }, controls);
  var inMid = el("input", { type: "checkbox", id: "hg-midp" }, midLab);
  midLab.appendChild(document.createTextNode(" mid-p"));
  inMid.addEventListener("change", update);
  var btn = el("button", { type: "button", "class": "btn" }, controls, "New simulated sample");
  var seed = 83;
  btn.addEventListener("click", function () { seed += 1; inMode.value = "sample"; update(); });

  var chart = el("div", { "class": "hg-chart" }, body);
  var table = el("div", { "class": "readout hg-readout", "aria-live": "polite" }, body);
  var note = el("p", { "class": "note" }, body);

  var lastRes = null;
  function drawChart(res) {
    lastRes = res;
    chart.innerHTML = "";
    var W = 360, H = 206, groups = ["ALL", "AFF", "UNAFF"], names = ["everyone", "cases", "controls"];
    // The chart is drawn at most 470 px wide; on a narrow screen the text is enlarged so it stays at 10 px or more.
    var scale = Math.min(chart.clientWidth || W, 470) / W;
    var fs = Math.max(11, 10.5 / scale).toFixed(1), fb = Math.max(13, 11.5 / scale).toFixed(1);
    var svg = sv("svg", { viewBox: "0 0 " + W + " " + H, role: "img",
                          "aria-label": "Observed and Hardy–Weinberg-expected genotype counts in all people, cases and controls" }, chart);
    var pw = 112, top = 50, base = 166, hmax = base - top - 4;
    groups.forEach(function (gname, gi) {
      var r = res[gname], x0 = 8 + gi * (pw + 6);
      var maxc = Math.max(r.n11, r.n12, r.n22, r.expected[0], r.expected[1], r.expected[2]) || 1;
      sv("text", { x: x0 + pw / 2, y: 14, "class": "t-b", "text-anchor": "middle", style: "font-size: " + fb + "px" }, svg, gname);
      sv("text", { x: x0 + pw / 2, y: 29, "class": "t-sm", "text-anchor": "middle", style: "font-size: " + fs + "px" }, svg, names[gi]);
      sv("text", { x: x0 + pw / 2, y: 43, "class": "t-sm", "text-anchor": "middle", style: "font-size: " + fs + "px" }, svg, "n = " + r.n.toLocaleString("en-US"));
      var obs = [r.n11, r.n12, r.n22], exp = [r.expected[2], r.expected[1], r.expected[0]];
      var fills = ["var(--g2)", "var(--g1)", "var(--g0)"], labels = ["11", "12", "22"];
      for (var k = 0; k < 3; k++) {
        var bx = x0 + 6 + k * 35, bw = 28;
        var h = hmax * obs[k] / maxc, he = hmax * exp[k] / maxc;
        sv("rect", { x: bx, y: base - h, width: bw, height: Math.max(0, h), fill: fills[k], stroke: "#8a93a0", "stroke-width": "0.6" }, svg);
        sv("rect", { x: bx - 2, y: base - he, width: bw + 4, height: Math.max(0, he), fill: "none", stroke: "var(--fg)", "stroke-width": "1.3", "stroke-dasharray": "3 2" }, svg);
        sv("text", { x: bx + bw / 2, y: base + 14, "class": "t-sm", "text-anchor": "middle", style: "font-size: " + fs + "px" }, svg, labels[k]);
      }
      sv("line", { x1: x0 + 2, x2: x0 + pw, y1: base, y2: base, stroke: "#8a93a0" }, svg);
      sv("text", { x: x0 + pw / 2, y: base + 32, "class": "t-sm", "text-anchor": "middle",
                   style: "font-size: " + fs + "px" + (r.P < 1e-6 ? "; fill: var(--pitfall); font-weight: 700" : "") }, svg, "P = " + fmtP(r.P));
    });
  }
  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (lastRes) drawChart(lastRes); }, 150);
  });
  function drawTable(res) {
    // The three rows of this SNP as PLINK writes them in .hwe (without CHR, SNP, A1, A2), columns aligned.
    var rows = [["TEST", "GENO", "O(HET)", "E(HET)", "P"]];
    ["ALL", "AFF", "UNAFF"].forEach(function (g) {
      var r = res[g];
      rows.push([g, r.n11 + "/" + r.n12 + "/" + r.n22, g4(r.ohet), g4(r.ehet), g4(r.P)]);
    });
    var w = [0, 0, 0, 0, 0];
    rows.forEach(function (row) { row.forEach(function (c, i) { w[i] = Math.max(w[i], c.length); }); });
    table.textContent = rows.map(function (row) {
      return pad(row[0], w[0]) + "  " + pad(row[1], w[1], true) + "  " + pad(row[2], w[2]) + "  " + pad(row[3], w[3]) + "  " + row[4];
    }).join("\n");
  }
  function update() {
    var mult = Number(inN.value);
    var res = study({ p: Number(inP.value), model: inModel.value, g: Number(inG.value), K: Number(inK.value), e: Number(inE.value),
                      nCases: 463 * mult, nControls: 470 * mult, mode: inMode.value, seed: seed, midp: inMid.checked });
    drawChart(res);
    drawTable(res);
    var f = function (r) { return (1 - r.ohet / r.ehet); };
    note.textContent = "Allele 1 frequency: " + res.UNAFF.p1.toFixed(3) + " in controls, " + res.AFF.p1.toFixed(3) + " in cases. " +
      "Heterozygote shortfall 1 − O(HET)/E(HET): " + f(res.UNAFF).toFixed(3) + " in controls, " + f(res.AFF).toFixed(3) + " in cases " +
      "(negative = more heterozygotes than expected). Red P values are below 10⁻⁶." +
      (inMode.value === "sample" ? " Simulated sample (seeded)." : " Expected counts, rounded to whole people.");
  }
  update();
})();
