/* Widget "Which filter goes first: SNPs or people?" (page: qc-missingness.html, section #threshold).
   Root element: <div class="widget" id="w-miss-order">.

   What it shows (simulated, seeded). A matrix of genotype calls for n = 1,000 people and M = 2,000 SNPs in which
   each call is either made or missing. Two kinds of failure are planted:
     - SNPs with a failing assay (the first K_snp SNPs): failure probability a_j ~ Uniform(0.02, 0.40);
       every other SNP: a_j ~ Uniform(0, 0.004).
     - People with poor DNA (the first K_people people): failure probability b_i ~ Uniform(0.02, 0.10);
       everyone else: b_i ~ Uniform(0, 0.002).
   A call is missing, independently of all other calls, with probability 1 - (1 - a_j)(1 - b_i).
   Missing rates as PLINK 1.9 computes them (no sex chromosomes here, so every call is potentially valid):
       F_MISS of SNP j    = (missing calls at SNP j among the people still in the data) / (number of those people)
       F_MISS of person i = (missing calls of person i at the SNPs still in the data) / (number of those SNPs)
   A SNP fails --geno g when its F_MISS > g; a person fails --mind m when their F_MISS > m (equality passes).
   Order 1, the practical's: --geno on all people, recount, then --mind on the SNPs that are left.
   Order 2, people first (what PLINK does when --geno and --mind are given in one command, and the order of
   Anderson et al. 2010): --mind on all SNPs, recount, then --geno on the people that are left.
   The uniform numbers behind every call are drawn once per seed, so moving a slider changes only the
   planted failure rates, not the random draws. Vanilla JS, no libraries, no network; works from file://.
   The core is exported for Node tests. */
(function () {
  "use strict";

  /* ================================================================== core */
  var N_PEOPLE = 1000, N_SNPS = 2000;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Random material for one seed: per-SNP and per-person draws and one uniform number per call.
  function makeDraws(n, m, seed) {
    var rnd = mulberry32(seed);
    var d = { n: n, m: m, snpGood: new Float64Array(m), snpBad: new Float64Array(m),
              personGood: new Float64Array(n), personBad: new Float64Array(n), u: new Float32Array(n * m) };
    for (var j = 0; j < m; j++) {
      d.snpGood[j] = 0.004 * rnd();                  // Uniform(0, 0.004)
      d.snpBad[j] = 0.02 + 0.38 * rnd();             // Uniform(0.02, 0.40)
    }
    for (var i = 0; i < n; i++) {
      d.personGood[i] = 0.002 * rnd();                // Uniform(0, 0.002)
      d.personBad[i] = 0.02 + 0.08 * rnd();           // Uniform(0.02, 0.10)
    }
    for (var k = 0; k < n * m; k++) d.u[k] = rnd();
    return d;
  }

  // The missing-call matrix (person-major: miss[i * m + j] = 1 if missing) for given shares of failures.
  function makeMatrix(d, badSnpShare, poorDnaShare) {
    var n = d.n, m = d.m;
    var kSnp = Math.round(badSnpShare * m), kPeople = Math.round(poorDnaShare * n);
    var a = new Float64Array(m), b = new Float64Array(n);
    var badSnp = new Uint8Array(m), poor = new Uint8Array(n);
    for (var j = 0; j < m; j++) { badSnp[j] = j < kSnp ? 1 : 0; a[j] = badSnp[j] ? d.snpBad[j] : d.snpGood[j]; }
    for (var i = 0; i < n; i++) { poor[i] = i < kPeople ? 1 : 0; b[i] = poor[i] ? d.personBad[i] : d.personGood[i]; }
    var miss = new Uint8Array(n * m);
    for (i = 0; i < n; i++) {
      var off = i * m, keepB = 1 - b[i];
      for (j = 0; j < m; j++) miss[off + j] = d.u[off + j] < 1 - (1 - a[j]) * keepB ? 1 : 0;
    }
    return { n: n, m: m, miss: miss, badSnp: badSnp, poor: poor, kSnp: kSnp, kPeople: kPeople };
  }

  // Missing rates of every SNP over the kept people, and of every person over the kept SNPs.
  function snpRates(X, keepP) {
    var n = X.n, m = X.m, cnt = new Float64Array(m), den = 0;
    for (var i = 0; i < n; i++) {
      if (!keepP[i]) continue;
      den++;
      var off = i * m;
      for (var j = 0; j < m; j++) cnt[j] += X.miss[off + j];
    }
    for (j = 0; j < m; j++) cnt[j] = den ? cnt[j] / den : 0;
    return cnt;
  }
  function personRates(X, keepS) {
    var n = X.n, m = X.m, r = new Float64Array(n), den = 0, j;
    for (j = 0; j < m; j++) den += keepS[j];
    for (var i = 0; i < n; i++) {
      var off = i * m, c = 0;
      for (j = 0; j < m; j++) if (keepS[j]) c += X.miss[off + j];
      r[i] = den ? c / den : 0;
    }
    return r;
  }
  var EPS = 1e-9;   // PLINK compares with a tiny tolerance, so a rate exactly equal to the threshold passes
  function passMask(rates, thr) {
    var k = new Uint8Array(rates.length);
    for (var t = 0; t < rates.length; t++) k[t] = rates[t] > thr * (1 + EPS) ? 0 : 1;
    return k;
  }
  function ones(len) { var k = new Uint8Array(len); k.fill(1); return k; }

  function summarize(X, keepP, keepS) {
    var s = { snpsRemoved: 0, badSnpsRemoved: 0, goodSnpsRemoved: 0, badSnpsKept: 0,
              peopleRemoved: 0, poorRemoved: 0, goodRemoved: 0, poorKept: 0,
              snpsKept: 0, peopleKept: 0, missKept: 0, missRateKept: 0 };
    for (var j = 0; j < X.m; j++) {
      if (keepS[j]) { s.snpsKept++; if (X.badSnp[j]) s.badSnpsKept++; }
      else { s.snpsRemoved++; if (X.badSnp[j]) s.badSnpsRemoved++; else s.goodSnpsRemoved++; }
    }
    for (var i = 0; i < X.n; i++) {
      if (keepP[i]) { s.peopleKept++; if (X.poor[i]) s.poorKept++; }
      else { s.peopleRemoved++; if (X.poor[i]) s.poorRemoved++; else s.goodRemoved++; }
    }
    for (i = 0; i < X.n; i++) {
      if (!keepP[i]) continue;
      var off = i * X.m;
      for (j = 0; j < X.m; j++) if (keepS[j]) s.missKept += X.miss[off + j];
    }
    var cells = s.snpsKept * s.peopleKept;
    s.missRateKept = cells ? s.missKept / cells : 0;
    return s;
  }

  // Order 1: SNPs first (the practical). Order 2: people first (one PLINK command; Anderson et al.).
  function runOrders(X, geno, mind) {
    var allP = ones(X.n), allS = ones(X.m);
    var snpAll = snpRates(X, allP);
    var keepS1 = passMask(snpAll, geno);
    var personAfter = personRates(X, keepS1);
    var keepP1 = passMask(personAfter, mind);
    var personAll = personRates(X, allS);
    var keepP2 = passMask(personAll, mind);
    var snpAfter = snpRates(X, keepP2);
    var keepS2 = passMask(snpAfter, geno);
    return {
      personAll: personAll, personAfterGeno: personAfter,
      snpsFirst: summarize(X, keepP1, keepS1),
      peopleFirst: summarize(X, keepP2, keepS2)
    };
  }

  var core = { mulberry32: mulberry32, makeDraws: makeDraws, makeMatrix: makeMatrix, snpRates: snpRates,
               personRates: personRates, passMask: passMask, runOrders: runOrders, N_PEOPLE: N_PEOPLE, N_SNPS: N_SNPS };
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  if (typeof document === "undefined") return;

  /* ================================================================== view */
  var root = document.getElementById("w-miss-order");
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
  function fmt(x) { return x.toLocaleString("en-US"); }
  function pct(x, d) { return (100 * x).toFixed(d == null ? 1 : d) + "%"; }

  body.innerHTML = "";
  el("p", { "class": "note" }, body,
     "Simulated data: 1,000 people × 2,000 SNPs. Some SNPs have a failing assay and some people have poor DNA; " +
     "every other call fails only rarely. Both orders of the two filters are applied to the same simulated calls.");

  var controls = el("div", { "class": "controls" }, body);
  function range(label, id, min, max, step, value, unit) {
    var lab = el("label", { "for": id }, controls);
    lab.appendChild(document.createTextNode(label + " "));
    var inp = el("input", { type: "range", id: id, min: min, max: max, step: step, value: value }, lab);
    var out = el("output", { "for": id, "class": "mo-val" }, lab, value + unit);
    inp.addEventListener("input", function () { out.textContent = inp.value + unit; update(false); });
    return inp;
  }
  function select(label, id, options, value) {
    var lab = el("label", { "for": id }, controls);
    lab.appendChild(document.createTextNode(label + " "));
    var s = el("select", { id: id }, lab);
    options.forEach(function (o) { var op = el("option", { value: o }, s, o); if (o === value) op.selected = true; });
    s.addEventListener("change", function () { update(false); });
    return s;
  }
  var inBadSnp = range("SNPs with a failing assay", "mo-badsnp", 0, 20, 1, 5, "%");
  var inPoor = range("People with poor DNA", "mo-poor", 0, 10, 1, 3, "%");
  var inGeno = select("--geno", "mo-geno", ["0.01", "0.02", "0.05", "0.1"], "0.01");
  var inMind = select("--mind", "mo-mind", ["0.01", "0.02", "0.05", "0.1"], "0.01");
  var btnNew = el("button", { type: "button", "class": "btn" }, controls, "New simulated sample");

  var plots = el("div", { "class": "mo-plots" }, body);
  var plotA = el("div", { "class": "mo-plot" }, plots);
  var plotB = el("div", { "class": "mo-plot" }, plots);
  var tableWrap = el("div", { "class": "mo-table-wrap" }, body);
  var live = el("p", { "class": "note", "aria-live": "polite" }, body);

  var seed = 20261108, draws = null, X = null;

  // Histogram of person missing rates (0 to 0.15 in steps of 0.005, last bin = 0.15 or more), with a rug of
  // the people with poor DNA and the --mind threshold.
  function drawHist(host, rates, poor, thr, title, sub) {
    host.innerHTML = "";
    var W = 320, H = 200, L = 40, R = 10, T = 40, B = 46;
    var svg = sv("svg", { viewBox: "0 0 " + W + " " + H, role: "img",
                          "aria-label": title + ": histogram of the simulated people's missing rates" }, host);
    var nb = 31, step = 0.005, xmax = nb * step;
    var counts = new Array(nb).fill(0), i;
    for (i = 0; i < rates.length; i++) counts[Math.min(nb - 1, Math.floor(rates[i] / step + 1e-9))]++;
    var cmax = Math.max.apply(null, counts) || 1;
    var x = function (v) { return L + (W - L - R) * Math.min(v, xmax) / xmax; };
    var y = function (c) { return T + (H - T - B) * (1 - c / cmax); };
    sv("text", { x: L - 30, y: 15, "class": "t-b" }, svg, title);
    sv("text", { x: L - 30, y: 30, "class": "t-sm" }, svg, sub);
    for (i = 0; i < nb; i++) {
      if (!counts[i]) continue;
      var x0 = x(i * step), x1 = x((i + 1) * step);
      sv("rect", { x: x0 + 0.5, y: y(counts[i]), width: Math.max(1, x1 - x0 - 1), height: H - B - y(counts[i]),
                   fill: "var(--q1)", opacity: "0.75" }, svg);
    }
    // axes
    sv("line", { x1: L, x2: W - R, y1: H - B, y2: H - B, stroke: "var(--fg-faint)" }, svg);
    sv("line", { x1: L, x2: L, y1: T, y2: H - B, stroke: "var(--fg-faint)" }, svg);
    [0, 0.05, 0.1, 0.15].forEach(function (v) {
      sv("line", { x1: x(v), x2: x(v), y1: H - B, y2: H - B + 4, stroke: "var(--fg-faint)" }, svg);
      sv("text", { x: x(v), y: H - B + 15, "class": "t-sm", "text-anchor": "middle" }, svg, v === 0.15 ? "≥ 0.15" : String(v));
    });
    sv("text", { x: (L + W - R) / 2, y: H - 6, "class": "t-sm", "text-anchor": "middle" }, svg, "person F_MISS");
    sv("text", { x: L - 6, y: T + 4, "class": "t-sm", "text-anchor": "end" }, svg, String(cmax));
    sv("text", { x: L - 6, y: H - B, "class": "t-sm", "text-anchor": "end" }, svg, "0");
    // rug: people with poor DNA, just above the axis
    for (i = 0; i < rates.length; i++) {
      if (!poor[i]) continue;
      var xr = x(rates[i]);
      sv("line", { x1: xr, x2: xr, y1: H - B - 9, y2: H - B - 1, stroke: "var(--q4)", "stroke-width": "1.5" }, svg);
    }
    // threshold
    var xt = x(thr);
    sv("line", { x1: xt, x2: xt, y1: T - 4, y2: H - B, stroke: "var(--pitfall)", "stroke-width": "1.5", "stroke-dasharray": "4 3" }, svg);
    var nFail = 0, nPoorFail = 0;
    for (i = 0; i < rates.length; i++) if (rates[i] > thr * (1 + 1e-9)) { nFail++; if (poor[i]) nPoorFail++; }
    // The labels go in the upper right corner, which the bars of person missing rates leave empty.
    sv("text", { x: W - R, y: T + 6, "class": "t-sm", "text-anchor": "end", style: "fill: var(--pitfall)" },
       svg, fmt(nFail) + " fail --mind " + thr);
    sv("text", { x: W - R, y: T + 20, "class": "t-sm", "text-anchor": "end" }, svg, "(" + fmt(nPoorFail) + " with poor DNA)");
  }

  function drawTable(res) {
    tableWrap.innerHTML = "";
    var t = el("table", { "class": "compact mo-table" }, tableWrap);
    el("caption", null, t, "What each order removes (simulated sample)");
    var thead = el("thead", null, t), tr = el("tr", null, thead);
    el("th", { scope: "col" }, tr, "");
    el("th", { scope: "col" }, tr, "SNPs first (the practical)");
    el("th", { scope: "col" }, tr, "People first (one command)");
    var tb = el("tbody", null, t);
    function row(label, f, warnIf) {
      var r = el("tr", null, tb);
      el("th", { scope: "row" }, r, label);
      [res.snpsFirst, res.peopleFirst].forEach(function (s) {
        var td = el("td", null, r, f(s));
        if (warnIf && warnIf(s)) td.className = "mo-warn";
      });
    }
    row("SNPs removed", function (s) { return fmt(s.snpsRemoved) + " of " + fmt(X.m); });
    row("… with a failing assay", function (s) { return fmt(s.badSnpsRemoved) + " of " + fmt(X.kSnp); });
    row("… with a working assay", function (s) { return fmt(s.goodSnpsRemoved); }, function (s) { return s.goodSnpsRemoved > 0; });
    row("People removed", function (s) { return fmt(s.peopleRemoved) + " of " + fmt(X.n); });
    row("… with poor DNA", function (s) { return fmt(s.poorRemoved) + " of " + fmt(X.kPeople); });
    row("… with good DNA", function (s) { return fmt(s.goodRemoved); }, function (s) { return s.goodRemoved > 0; });
    row("Missing calls left", function (s) { return pct(s.missRateKept, 2) + " of " + fmt(s.snpsKept * s.peopleKept); });
  }

  function update(resim) {
    if (resim || !draws) draws = makeDraws(N_PEOPLE, N_SNPS, seed);
    X = makeMatrix(draws, Number(inBadSnp.value) / 100, Number(inPoor.value) / 100);
    var geno = Number(inGeno.value), mind = Number(inMind.value);
    var res = runOrders(X, geno, mind);
    drawHist(plotA, res.personAll, X.poor, mind, "A · People first", "person F_MISS over all " + fmt(X.m) + " SNPs");
    drawHist(plotB, res.personAfterGeno, X.poor, mind, "B · SNPs first",
             "person F_MISS over the " + fmt(res.snpsFirst.snpsKept) + " SNPs left by --geno " + inGeno.value);
    drawTable(res);
    live.textContent = "SNPs first removes " + fmt(res.snpsFirst.goodRemoved) + " people with good DNA; people first removes " +
      fmt(res.peopleFirst.goodRemoved) + ". Red ticks under the bars mark the people with poor DNA." +
      (res.peopleFirst.peopleKept === 0 ? " People first removes everyone: PLINK would stop with \"Error: All people removed due to missing genotype data (--mind).\"" : "");
  }
  btnNew.addEventListener("click", function () { seed += 1; update(true); });
  update(true);
})();
