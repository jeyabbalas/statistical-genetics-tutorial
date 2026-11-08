/* ==========================================================================
   Lecture 1 · Page "linkage-disequilibrium" · Widget "EM: from genotype counts
   to haplotype frequencies"
   Input: a 3 × 3 table of genotype counts for two SNPs (rows GG, Gg, gg at
   SNP 2; columns AA, Aa, aa at SNP 1), as on Lecture 1, slide 117.
   Everyone except the double heterozygotes (Aa and Gg) has known haplotypes:
     c_AG = 2·n(AA,GG) + n(AA,Gg) + n(Aa,GG)      c_Ag = 2·n(AA,gg) + n(AA,Gg) + n(Aa,gg)
     c_aG = 2·n(aa,GG) + n(aa,Gg) + n(Aa,GG)      c_ag = 2·n(aa,gg) + n(aa,Gg) + n(Aa,gg)
   m = n(Aa,Gg) people are AG + ag or Ag + aG. Under random pairing of haplotypes,
     E-step:  w = p_AG·p_ag / (p_AG·p_ag + p_Ag·p_aG)   (share of the m people that are AG + ag)
     M-step:  p_AG = (c_AG + m·w) / 2n,  p_ag = (c_ag + m·w) / 2n,
              p_Ag = (c_Ag + m·(1 − w)) / 2n,  p_aG = (c_aG + m·(1 − w)) / 2n
     log-likelihood ℓ = Σ c_h·ln p_h + m·ln(2·p_AG·p_ag + 2·p_Ag·p_aG)
   After one iteration the allele frequencies equal their sample values, so ℓ is a
   function of p_AG alone; its stationary points are the roots of Hill's (1974)
   cubic, found here on a fine grid and refined by bisection of the derivative.
   Also: D, D′, r² from the estimates, and the Pearson r² of the allele-count
   columns (what plink --r2 reports by default). The simulated preset draws
   2n haplotypes from known frequencies with a seeded generator (mulberry32).
   No libraries, no network; works from file://. Loadable in node for tests
   (module.exports = Core).
   ========================================================================== */
(function () {
  "use strict";

  /* ======================= Core (pure functions) ======================= */
  var Core = (function () {
    function mulberry32(a) {
      return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    /* t[row][col]: rows GG, Gg, gg (SNP 2); columns AA, Aa, aa (SNP 1) */
    function known(t) {
      var GG = t[0], Gg = t[1], gg = t[2], n = 0;
      for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) n += t[r][c];
      return {
        AG: 2 * GG[0] + Gg[0] + GG[1],
        Ag: 2 * gg[0] + Gg[0] + gg[1],
        aG: 2 * GG[2] + Gg[2] + GG[1],
        ag: 2 * gg[2] + Gg[2] + gg[1],
        m: Gg[1], n: n
      };
    }
    function counts(k) { return [k.AG, k.Ag, k.aG, k.ag]; }
    function alleleFreqs(k) {
      var N = 2 * k.n;
      return { pA: (k.AG + k.Ag + k.m) / N, pG: (k.AG + k.aG + k.m) / N };
    }
    function xlogy(c, p) { return c === 0 ? 0 : (p > 0 ? c * Math.log(p) : -Infinity); }
    function loglik(p, k) {
      return xlogy(k.AG, p[0]) + xlogy(k.Ag, p[1]) + xlogy(k.aG, p[2]) + xlogy(k.ag, p[3]) +
        xlogy(k.m, 2 * p[0] * p[3] + 2 * p[1] * p[2]);
    }
    function emStep(p, k) {
      var a = p[0] * p[3], b = p[1] * p[2];
      var w = (a + b) > 0 ? a / (a + b) : 0.5;
      var N = 2 * k.n;
      return { w: w, p: [(k.AG + k.m * w) / N, (k.Ag + k.m * (1 - w)) / N, (k.aG + k.m * (1 - w)) / N, (k.ag + k.m * w) / N] };
    }
    function measures(p) {
      var pA = p[0] + p[1], pG = p[0] + p[2], pa = 1 - pA, pg = 1 - pG;
      var D = p[0] * p[3] - p[1] * p[2];
      var Dmax = D >= 0 ? Math.min(pA * pg, pa * pG) : Math.min(pA * pG, pa * pg);
      var den = pA * pa * pG * pg;
      return { pA: pA, pG: pG, D: D, Dmax: Dmax, Dp: Dmax > 1e-15 ? D / Dmax : NaN, r2: den > 1e-15 ? D * D / den : NaN };
    }
    /* Feasible range of p_AG once the allele frequencies are fixed at their sample values */
    function range(k) {
      var f = alleleFreqs(k);
      return { pA: f.pA, pG: f.pG, lo: Math.max(0, f.pA + f.pG - 1), hi: Math.min(f.pA, f.pG) };
    }
    function pAt(x, R) { return [x, R.pA - x, R.pG - x, 1 - R.pA - R.pG + x]; }
    function profileLL(x, k, R) {
      var p = pAt(x, R);
      for (var i = 0; i < 4; i++) if (p[i] < 0) p[i] = 0;
      return loglik(p, k);
    }
    /* Stationary points of ℓ(p_AG) on [lo, hi]: interior maxima/minima and finite boundary maxima */
    function stationary(k) {
      var R = range(k), out = [];
      if (!(R.hi - R.lo > 1e-12) || k.n === 0) return out;
      var G = 2000, xs = [], ys = [];
      for (var i = 0; i <= G; i++) { var x = R.lo + (R.hi - R.lo) * i / G; xs.push(x); ys.push(profileLL(x, k, R)); }
      function refine(a, b, isMax) { // golden-section search on [a, b]
        var gr = (Math.sqrt(5) - 1) / 2, c = b - gr * (b - a), d = a + gr * (b - a);
        for (var it = 0; it < 80; it++) {
          var fc = profileLL(c, k, R), fd = profileLL(d, k, R);
          if (isMax ? fc > fd : fc < fd) { b = d; } else { a = c; }
          c = b - gr * (b - a); d = a + gr * (b - a);
        }
        return (a + b) / 2;
      }
      for (i = 1; i < G; i++) {
        var y0 = ys[i - 1], y1 = ys[i], y2 = ys[i + 1];
        if (!isFinite(y1)) continue;
        if (y1 > y0 && y1 >= y2) { var xm = refine(xs[i - 1], xs[i + 1], true); out.push({ x: xm, type: "max", ll: profileLL(xm, k, R) }); }
        else if (isFinite(y0) && isFinite(y2) && y1 < y0 && y1 <= y2) { var xn = refine(xs[i - 1], xs[i + 1], false); out.push({ x: xn, type: "min", ll: profileLL(xn, k, R) }); }
      }
      if (isFinite(ys[0]) && ys[0] > ys[1]) out.unshift({ x: R.lo, type: "max", ll: ys[0], edge: true });
      if (isFinite(ys[G]) && ys[G] > ys[G - 1]) out.push({ x: R.hi, type: "max", ll: ys[G], edge: true });
      return out;
    }
    function startPoint(k, mode) {
      var R = range(k), x;
      if (mode === "hi") x = R.hi - 0.04 * (R.hi - R.lo);
      else if (mode === "lo") x = R.lo + 0.04 * (R.hi - R.lo);
      else x = R.pA * R.pG;
      return pAt(x, R);
    }
    function run(k, p0, maxit, tol) {
      var p = p0.slice(), its = [{ t: 0, w: NaN, p: p.slice(), ll: loglik(p, k) }];
      for (var i = 1; i <= maxit; i++) {
        var s = emStep(p, k), d = 0;
        for (var j = 0; j < 4; j++) d = Math.max(d, Math.abs(s.p[j] - p[j]));
        p = s.p;
        its.push({ t: i, w: s.w, p: p.slice(), ll: loglik(p, k) });
        if (d < tol) break;
      }
      return its;
    }
    /* Pearson r² between the allele-count columns (A count, G count) across people */
    function genoR2(t) {
      var n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
      for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) {
        var w = t[r][c], x = 2 - c, y = 2 - r;
        n += w; sx += w * x; sy += w * y; sxx += w * x * x; syy += w * y * y; sxy += w * x * y;
      }
      if (n < 2) return NaN;
      var cov = sxy / n - (sx / n) * (sy / n), vx = sxx / n - (sx / n) * (sx / n), vy = syy / n - (sy / n) * (sy / n);
      return (vx > 1e-15 && vy > 1e-15) ? cov * cov / (vx * vy) : NaN;
    }
    /* Simulate n people: 2n haplotypes drawn from ptrue (AG, Ag, aG, ag), paired in order */
    function simulate(seed, n, ptrue) {
      var rng = mulberry32(seed), t = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], hc = [0, 0, 0, 0];
      var A = [1, 1, 0, 0], G = [1, 0, 1, 0];
      function draw() {
        var u = rng(), acc = 0;
        for (var h = 0; h < 4; h++) { acc += ptrue[h]; if (u < acc) return h; }
        return 3;
      }
      for (var i = 0; i < n; i++) {
        var h1 = draw(), h2 = draw();
        hc[h1]++; hc[h2]++;
        var nA = A[h1] + A[h2], nG = G[h1] + G[h2];
        t[2 - nG][2 - nA]++;
      }
      return { table: t, hapCounts: hc };
    }
    return { mulberry32: mulberry32, known: known, counts: counts, alleleFreqs: alleleFreqs, loglik: loglik, emStep: emStep,
      measures: measures, range: range, pAt: pAt, profileLL: profileLL, stationary: stationary, startPoint: startPoint,
      run: run, genoR2: genoR2, simulate: simulate };
  })();

  if (typeof module !== "undefined" && module.exports) module.exports = Core;
  if (typeof document === "undefined") return;

  /* ======================= Display ======================= */
  var SVGNS = "http://www.w3.org/2000/svg";
  var HAPS = ["AG", "Ag", "aG", "ag"];
  var TRUE_P = [0.40, 0.10, 0.05, 0.45];
  var PRESETS = [
    { id: "s117", label: "Slide 117: 8 people", t: [[1, 0, 0], [1, 5, 0], [0, 1, 0]] },
    { id: "sim", label: "Simulated: 200 people, truth known", sim: true },
    { id: "two", label: "Two likelihood peaks: 15 people", t: [[1, 0, 1], [0, 10, 0], [1, 0, 2]] },
    { id: "dh", label: "Only double heterozygotes: 6 people", t: [[0, 0, 0], [0, 6, 0], [0, 0, 0]] }
  ];

  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
    if (html != null) n.innerHTML = html;
    return n;
  }
  function svg(tag, attrs, parent) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function txt(parent, x, y, s, cls, anchor) {
    var t = svg("text", { x: x, y: y, "class": cls || "t-xs" }, parent);
    if (anchor) t.setAttribute("text-anchor", anchor);
    t.textContent = s;
    return t;
  }
  function f(x, d) {
    if (!isFinite(x)) return "undefined";
    var s = x.toFixed(d);
    if (/^-0(\.0+)?$/.test(s)) s = s.slice(1);
    return s.charAt(0) === "-" ? "−" + s.slice(1) : s;
  }
  function hat(s, cap) { return '<span class="hat' + (cap ? " cap" : "") + '">' + s + "</span>"; }
  function niceTicks(a, b, n) {
    var span = b - a; if (!(span > 0)) return [a];
    var step = Math.pow(10, Math.floor(Math.log10(span / n))), err = span / n / step;
    if (err >= 7.5) step *= 10; else if (err >= 3.5) step *= 5; else if (err >= 1.5) step *= 2;
    var out = [], s = Math.ceil(a / step - 1e-9) * step;
    for (var v = s; v <= b + 1e-9 * span; v += step) out.push(Math.abs(v) < 1e-12 ? 0 : v);
    return out;
  }

  function init() {
    var root = document.getElementById("w-ld-em");
    if (!root) return;
    var body = root.querySelector(".widget-body");
    body.innerHTML = "";

    var S = { preset: "s117", table: PRESETS[0].t.map(function (r) { return r.slice(); }), start: "le", seed: 20260917, hapCounts: null,
      its: null, shown: 0, edited: false };

    /* --- controls --- */
    var c1 = el("div", { "class": "controls" });
    var selP = el("select", { id: "ldem-preset", "aria-label": "Data set" });
    PRESETS.forEach(function (p) { selP.appendChild(el("option", { value: p.id }, p.label)); });
    selP.appendChild(el("option", { value: "custom", disabled: "disabled" }, "Your own counts (edited)"));
    var l1 = el("label", null, "Data "); l1.appendChild(selP); c1.appendChild(l1);
    var selS = el("select", { id: "ldem-start", "aria-label": "Starting values" },
      '<option value="le">no LD (D = 0)</option><option value="hi">near the largest possible D</option><option value="lo">near the smallest possible D</option>');
    var l2 = el("label", null, "Start EM from "); l2.appendChild(selS); c1.appendChild(l2);
    body.appendChild(c1);

    var grid = el("div", { "class": "ldem-top" });
    var tblWrap = el("div", { "class": "ldem-tablewrap" });
    tblWrap.appendChild(el("div", { "class": "ldem-ptitle" }, "Genotype counts (people)"));
    var tbl = el("table", { "class": "ldem-table" });
    var thead = el("tr", null, '<th scope="col"><span class="sr-only">SNP 2 genotype</span></th><th scope="col">AA</th><th scope="col">Aa</th><th scope="col">aa</th>');
    tbl.appendChild(thead);
    var inputs = [[], [], []], rowNames = ["GG", "Gg", "gg"], colNames = ["AA", "Aa", "aa"];
    for (var r = 0; r < 3; r++) {
      var tr = el("tr");
      tr.appendChild(el("th", { scope: "row" }, rowNames[r]));
      for (var c = 0; c < 3; c++) {
        var td = el("td", r === 1 && c === 1 ? { "class": "ldem-dh" } : null);
        var inp = el("input", { type: "number", min: "0", max: "9999", step: "1", inputmode: "numeric",
          "aria-label": "Number of people with genotypes " + colNames[c] + " and " + rowNames[r] });
        inp.dataset.r = r; inp.dataset.c = c;
        td.appendChild(inp); tr.appendChild(td); inputs[r][c] = inp;
      }
      tbl.appendChild(tr);
    }
    tblWrap.appendChild(tbl);
    tblWrap.appendChild(el("p", { "class": "note" }, "Columns: SNP 1. Rows: SNP 2. The shaded cell holds the double heterozygotes, the only people whose haplotypes are ambiguous. Edit any count."));
    var btns = el("div", { "class": "controls ldem-btns" });
    var bStep = el("button", { type: "button", "class": "btn primary" }, "Step");
    var bRun = el("button", { type: "button", "class": "btn" }, "Run to convergence");
    var bReset = el("button", { type: "button", "class": "btn" }, "Reset");
    var bNew = el("button", { type: "button", "class": "btn" }, "New sample");
    btns.appendChild(bStep); btns.appendChild(bRun); btns.appendChild(bReset); btns.appendChild(bNew);
    tblWrap.appendChild(btns);
    grid.appendChild(tblWrap);

    var barWrap = el("div", { "class": "ldem-panel" });
    barWrap.appendChild(el("div", { "class": "ldem-ptitle" }, "E-step: expected haplotype counts (chromosome copies)"));
    var barHost = el("div"); barWrap.appendChild(barHost);
    grid.appendChild(barWrap);
    body.appendChild(grid);

    var llWrap = el("div", { "class": "ldem-panel ldem-llwrap" });
    llWrap.appendChild(el("div", { "class": "ldem-ptitle" }, "Log-likelihood against the AG frequency, with the EM path"));
    var llHost = el("div"); llWrap.appendChild(llHost);
    body.appendChild(llWrap);

    var out = el("div", { "class": "readout ldem-readout", "aria-live": "polite" });
    body.appendChild(out);
    var det = el("details", { "class": "ldem-iters" });
    det.appendChild(el("summary", null, "Table of iterations"));
    var itHost = el("div", { "class": "ldem-itertable" }); det.appendChild(itHost);
    body.appendChild(det);
    body.appendChild(el("p", { "class": "note" }, "The simulated data set is labeled as simulated; its first view is the same for every reader (seeded random numbers). Haplotypes in it are paired at random, so Hardy–Weinberg proportions hold in the population it is drawn from."));

    /* --- state helpers --- */
    function readTable() {
      var t = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) {
        var v = Math.round(Number(inputs[r][c].value));
        if (!isFinite(v) || v < 0) v = 0; if (v > 9999) v = 9999;
        t[r][c] = v;
      }
      return t;
    }
    function writeTable() {
      for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) inputs[r][c].value = String(S.table[r][c]);
    }
    function loadPreset(id) {
      S.preset = id; S.edited = false; S.hapCounts = null;
      var p = PRESETS.filter(function (x) { return x.id === id; })[0];
      if (p.sim) { var sm = Core.simulate(S.seed, 200, TRUE_P); S.table = sm.table; S.hapCounts = sm.hapCounts; }
      else S.table = p.t.map(function (r) { return r.slice(); });
      writeTable();
      bNew.style.display = p.sim ? "" : "none";
      reset();
    }
    function reset() {
      var k = Core.known(S.table);
      S.k = k;
      S.stat = Core.stationary(k);
      if (k.n > 0) {
        S.its = Core.run(k, Core.startPoint(k, S.start), 2000, 1e-10);
      } else S.its = null;
      S.shown = 0;
      draw();
    }

    /* --- drawing --- */
    function draw() {
      drawBars(); drawLL(); drawReadout(); drawIters();
    }
    function cur() { return S.its ? S.its[Math.min(S.shown, S.its.length - 1)] : null; }

    function drawBars() {
      barHost.innerHTML = "";
      var k = S.k; if (!k || k.n === 0) return;
      var W = Math.max(280, Math.min(barHost.clientWidth || 360, 460)), H = 196;
      var s = svg("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, role: "img",
        "aria-label": "Bar chart of expected haplotype counts: the part counted from people with known phase and the part assigned from double heterozygotes" }, barHost);
      var c = Core.counts(k), it = cur(), w = (it && it.t > 0) ? it.w : NaN;
      var add = isFinite(w) ? [k.m * w, k.m * (1 - w), k.m * (1 - w), k.m * w] : [0, 0, 0, 0];
      var maxv = 0; for (var i = 0; i < 4; i++) maxv = Math.max(maxv, c[i] + k.m);
      var top = 26, base = H - 26, bw = Math.min(56, (W - 40) / 4 - 16), gap = (W - 20 - 4 * bw) / 4;
      svg("line", { x1: 10, x2: W - 10, y1: base, y2: base, stroke: "var(--border-strong)" }, s);
      for (i = 0; i < 4; i++) {
        var x = 10 + gap / 2 + i * (bw + gap), col = (i === 0 || i === 3) ? "var(--q1)" : "var(--q2)";
        var hk = maxv > 0 ? (base - top) * c[i] / maxv : 0, ha = maxv > 0 ? (base - top) * add[i] / maxv : 0;
        svg("rect", { x: x, y: base - hk, width: bw, height: hk, fill: col }, s);
        if (ha > 0) svg("rect", { x: x, y: base - hk - ha, width: bw, height: ha, fill: col, "fill-opacity": 0.35, stroke: col, "stroke-dasharray": "3 2" }, s);
        txt(s, x + bw / 2, base - hk - ha - 6, f(c[i] + add[i], (add[i] % 1 === 0) ? 0 : 2), "t-xs", "middle");
        txt(s, x + bw / 2, base + 16, HAPS[i], "t-b", "middle");
      }
      var lg = isFinite(w) ? "solid: phase certain · pale: share of the " + k.m + " double heterozygote" + (k.m === 1 ? "" : "s")
        : "solid: phase certain · press Step to assign the " + k.m + " double heterozygote" + (k.m === 1 ? "" : "s");
      barHost.appendChild(el("div", { "class": "ldem-key" }, lg));
      txt(s, 10, 14, isFinite(w) ? "iteration " + it.t + ": w = " + f(w, 3) + " of them counted as AG + ag" : "before the first iteration", "t-xs");
    }

    function drawLL() {
      llHost.innerHTML = "";
      var k = S.k; if (!k || k.n === 0) return;
      var R = Core.range(k);
      if (!(R.hi - R.lo > 1e-9)) { llHost.appendChild(el("p", { "class": "note" }, "One of the SNPs is monomorphic in these counts, so the AG frequency is fixed and there is nothing to estimate.")); return; }
      var W = Math.max(300, Math.min(llHost.clientWidth || 640, 900)), H = 250;
      var ml = 58, mr = 16, mt = 14, mb = 44, PW = W - ml - mr, PH = H - mt - mb;
      var s = svg("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, role: "img",
        "aria-label": "Log-likelihood of the data as a function of the AG haplotype frequency, with the EM iterations as points climbing to a maximum" }, llHost);
      var G = 300, xs = [], ys = [], ymax = -Infinity;
      for (var i = 0; i <= G; i++) { var x = R.lo + (R.hi - R.lo) * i / G, y = Core.profileLL(x, k, R); xs.push(x); ys.push(y); if (y > ymax) ymax = y; }
      S.stat.forEach(function (p) { if (p.ll > ymax) ymax = p.ll; });
      var its = S.its || [], ymin = ymax - 6;
      its.forEach(function (it) { if (isFinite(it.ll) && it.ll < ymin + 0.5) ymin = it.ll - 1; });
      S.stat.forEach(function (p) { if (p.ll < ymin + 0.5) ymin = p.ll - 1; });
      if (ymin < ymax - 60) ymin = ymax - 60;
      var ytop = ymax + 0.08 * (ymax - ymin);
      function X(v) { return ml + PW * (v - R.lo) / (R.hi - R.lo); }
      function Y(v) { return mt + PH * (ytop - Math.max(ymin, Math.min(ytop, v))) / (ytop - ymin); }
      // axes
      svg("line", { x1: ml, x2: ml + PW, y1: mt + PH, y2: mt + PH, stroke: "var(--border-strong)" }, s);
      svg("line", { x1: ml, x2: ml, y1: mt, y2: mt + PH, stroke: "var(--border-strong)" }, s);
      niceTicks(R.lo, R.hi, PW < 360 ? 4 : 6).forEach(function (v) {
        svg("line", { x1: X(v), x2: X(v), y1: mt + PH, y2: mt + PH + 4, stroke: "var(--border-strong)" }, s);
        txt(s, X(v), mt + PH + 16, f(v, (R.hi - R.lo) < 0.2 ? 3 : 2), "t-xs", "middle");
      });
      niceTicks(ymin, ytop, 4).forEach(function (v) {
        svg("line", { x1: ml - 4, x2: ml, y1: Y(v), y2: Y(v), stroke: "var(--border-strong)" }, s);
        svg("line", { x1: ml, x2: ml + PW, y1: Y(v), y2: Y(v), stroke: "var(--border)", "stroke-dasharray": "2 3" }, s);
        txt(s, ml - 7, Y(v) + 3.5, f(v, Math.abs(ytop - ymin) < 4 ? 1 : 0), "t-xs", "end");
      });
      txt(s, ml + PW / 2, H - 8, PW < 420 ? "AG frequency (allele frequencies fixed)" : "AG frequency (allele frequencies fixed at their sample values)", "t-xs", "middle");
      var yl = txt(s, 14, mt + PH / 2, "log-likelihood", "t-xs", "middle");
      yl.setAttribute("transform", "rotate(-90 14 " + (mt + PH / 2) + ")");
      // curve
      var d = "", pen = false;
      for (i = 0; i <= G; i++) {
        if (!isFinite(ys[i])) { pen = false; continue; }
        d += (pen ? "L" : "M") + X(xs[i]).toFixed(1) + " " + Y(ys[i]).toFixed(1); pen = true;
      }
      svg("path", { d: d, fill: "none", stroke: "var(--fg-muted)", "stroke-width": 2 }, s);
      // stationary points
      S.stat.forEach(function (p) {
        var cx = X(p.x), cy = Y(p.ll);
        if (p.type === "max") svg("path", { d: "M" + cx + " " + (cy - 8) + "l6 10h-12z", fill: "var(--key)" }, s);
        else svg("path", { d: "M" + cx + " " + (cy + 8) + "l6 -10h-12z", fill: "var(--pitfall)" }, s);
      });
      // EM path
      var n = Math.min(S.shown, its.length - 1), pts = "";
      for (i = 0; i <= n; i++) { if (isFinite(its[i].ll)) pts += (pts ? "L" : "M") + X(its[i].p[0]).toFixed(1) + " " + Y(its[i].ll).toFixed(1); }
      if (pts) svg("path", { d: pts, fill: "none", stroke: "var(--accent)", "stroke-width": 1.2, "stroke-dasharray": "3 2" }, s);
      for (i = 0; i <= n; i++) {
        var it = its[i]; if (!isFinite(it.ll)) continue;
        svg("circle", { cx: X(it.p[0]), cy: Y(it.ll), r: i === n ? 5.5 : 3, fill: i === n ? "var(--accent)" : "#fff", stroke: "var(--accent)", "stroke-width": 1.5 }, s);
      }
      var s0 = its[0];
      if (s0 && isFinite(s0.ll)) txt(s, X(s0.p[0]), Y(s0.ll) + 18, "start", "t-xs", X(s0.p[0]) > ml + PW - 30 ? "end" : "middle");
      // legend, outside the plot so it never covers the curve
      llHost.appendChild(el("div", { "class": "ldem-key" },
        '<span style="color:var(--key)">▲</span> maximum · <span style="color:var(--pitfall)">▼</span> minimum · ' +
        '<span style="color:var(--accent)">●</span> EM estimate (open circles: earlier iterations)'));
    }

    function fmtP(p) { return HAPS.map(function (h, i) { return h + " " + f(p[i], 4); }).join(" · "); }

    function drawReadout() {
      var k = S.k;
      if (!k || k.n === 0) { out.innerHTML = "Enter at least one person."; return; }
      var it = cur(), last = S.its[S.its.length - 1], R = Core.range(k), html = "";
      if (it.t === 0) html += "<b>Start</b> (iteration 0): " + fmtP(it.p) + ", log-likelihood " + f(it.ll, 3) + ".<br>";
      else html += "<b>Iteration " + it.t + "</b>: w = " + f(it.w, 4) + " of the " + k.m + " double heterozygote" + (k.m === 1 ? " is" : "s are") +
        " counted as AG + ag, " + f(1 - it.w, 4) + " as Ag + aG.<br>" + hat("p") + ": " + fmtP(it.p) + ", log-likelihood " + f(it.ll, 3) + ".<br>";
      var m = Core.measures(it.p);
      html += "From these: " + hat("D", true) + " = " + f(m.D, 4) + ", " + hat("D", true) + "′ = " + f(m.Dp, 3) + ", " + hat("r") + "² = " + f(m.r2, 3) +
        " (allele frequencies " + hat("p") + "<sub>A</sub> = " + f(R.pA, 3) + ", " + hat("p") + "<sub>G</sub> = " + f(R.pG, 3) + ").<br>";
      var moved = S.its.length > 1 && Math.abs(S.its[1].p[0] - S.its[0].p[0]) > 1e-12;
      if (S.shown >= S.its.length - 1) {
        html += S.its.length - 1 < 2000 ? "Converged after " + (S.its.length - 1) + " iteration" + (S.its.length === 2 ? "" : "s") + " (no frequency changes by more than 10⁻¹⁰)." : "Stopped after 2000 iterations.";
        if (!moved) html += " EM did not move: the start is a stationary point of the likelihood (here a minimum). Choose another start.";
        html += "<br>";
      } else html += "EM converges after " + (S.its.length - 1) + " iterations; press Step or Run to convergence.<br>";
      var maxima = S.stat.filter(function (p) { return p.type === "max"; });
      if (maxima.length > 1) {
        html += "The likelihood has " + maxima.length + " local maxima: " + maxima.map(function (p) { return "AG = " + f(p.x, 3) + " (log-likelihood " + f(p.ll, 2) + ")"; }).join(" and ") +
          ". EM climbs to the one uphill from its start; the higher one is the maximum-likelihood estimate.<br>";
      }
      var g2 = Core.genoR2(S.table);
      html += "Correlation of allele counts across people (what <code>plink --r2</code> reports by default): " +
        (isFinite(g2) ? "r² = " + f(g2, 3) + "." : "not defined here, because everyone has the same count of A or of G, so one column of allele counts does not vary.");
      if (S.preset === "sim" && S.hapCounts) {
        var mt = Core.measures(TRUE_P), hc = S.hapCounts;
        html += "<br><b>Truth (simulated)</b>: population frequencies " + fmtP(TRUE_P) + " (D = " + f(mt.D, 4) + ", D′ = " + f(mt.Dp, 3) + ", r² = " + f(mt.r2, 3) + "). " +
          "This sample's actual haplotype counts, known only because the data are simulated: " + HAPS.map(function (h, i) { return h + " " + hc[i]; }).join(" · ") +
          " of " + (2 * k.n) + " copies. Compare with the converged estimate " + HAPS.map(function (h, i) { return h + " " + f(last.p[i] * 2 * k.n, 1); }).join(" · ") + ".";
      }
      out.innerHTML = html;
    }

    function drawIters() {
      itHost.innerHTML = "";
      if (!S.its) return;
      var n = Math.min(S.shown, S.its.length - 1);
      var rows = "";
      for (var i = 0; i <= n; i++) {
        var it = S.its[i];
        rows += "<tr><td>" + it.t + "</td><td>" + (i === 0 ? "–" : f(it.w, 4)) + "</td>" + it.p.map(function (v) { return "<td>" + f(v, 4) + "</td>"; }).join("") + "<td>" + f(it.ll, 4) + "</td></tr>";
      }
      itHost.innerHTML = '<table class="compact mono"><thead><tr><th>t</th><th>w</th><th>AG</th><th>Ag</th><th>aG</th><th>ag</th><th>log-lik.</th></tr></thead><tbody>' + rows + "</tbody></table>";
    }

    /* --- events --- */
    selP.addEventListener("change", function () { if (selP.value !== "custom") loadPreset(selP.value); });
    selS.addEventListener("change", function () { S.start = selS.value; reset(); });
    for (var rr = 0; rr < 3; rr++) for (var cc = 0; cc < 3; cc++) {
      inputs[rr][cc].addEventListener("change", function () {
        S.table = readTable(); writeTable(); S.edited = true; S.preset = "custom"; S.hapCounts = null;
        selP.value = "custom"; bNew.style.display = "none"; reset();
      });
    }
    bStep.addEventListener("click", function () { if (S.its && S.shown < S.its.length - 1) { S.shown++; draw(); } });
    bRun.addEventListener("click", function () { if (S.its) { S.shown = S.its.length - 1; draw(); } });
    bReset.addEventListener("click", function () { S.shown = 0; draw(); });
    bNew.addEventListener("click", function () { S.seed = (S.seed * 1103515245 + 12345) >>> 0; loadPreset("sim"); });
    var rz;
    window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(function () { drawBars(); drawLL(); }, 150); });

    selP.value = "s117";
    loadPreset("s117");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
