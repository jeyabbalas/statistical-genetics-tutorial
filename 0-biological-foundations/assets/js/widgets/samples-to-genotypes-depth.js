/* Widget "Read depth and heterozygous calls" (page: samples-to-genotypes).
   Simulated data only. One SNP with reference allele A and alternative allele G.
   Read model: each read comes from one of the person's two chromosome copies with probability 1/2 (for a
   heterozygote A/G: copy with A or copy with G; for a homozygote A/A both copies carry A). Each base is misread
   with probability e = 1% and is then replaced by one of the other three bases at random (illustrative; Illumina
   per-base error rates are typically 0.1-1%). The number of reads showing G at depth d is therefore
   Binomial(d, pG) with pG = (1/2)(1 - e) + (1/2)(e/3) for A/G and pG = e/3 for A/A.
   Caller rule (stated in the widget): no call if d < minimum depth; otherwise, with f = share of reads showing G,
   call A/A if f < lo, G/G if f > hi, A/G if lo <= f <= hi (lo/hi = 20%/80% by default).
   For every depth 2-60 the widget simulates 1,000 pileups (seeded mulberry32) and compares the share of correct
   calls with the exact binomial probability.
   No libraries, no network, no modules: works from file://. Core functions are exported for node tests. */
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

  var ERR = 0.01, DMIN = 2, DMAX = 60, REPS = 1000, READ_LEN = 150, HALF = 20;

  function pG(truth) { return truth === "het" ? 0.5 * (1 - ERR) + 0.5 * ERR / 3 : ERR / 3; }

  /* call for k reads showing G out of d; band in percent (integers) -> exact integer comparisons */
  function callFor(k, d, lo, hi, minDepth) {
    if (d < minDepth) return "nocall";
    if (100 * k < lo * d) return "AA";
    if (100 * k > hi * d) return "GG";
    return "AG";
  }

  function binomPmf(d, p) {
    var pmf = new Float64Array(d + 1);
    if (p <= 0) { pmf[0] = 1; return pmf; }
    if (p >= 1) { pmf[d] = 1; return pmf; }
    // log-space start for stability
    var lq = Math.log(1 - p), lr = Math.log(p) - lq, lp = d * lq;
    pmf[0] = Math.exp(lp);
    for (var k = 0; k < d; k++) { lp += Math.log((d - k) / (k + 1)) + lr; pmf[k + 1] = Math.exp(lp); }
    return pmf;
  }

  function exactOutcome(d, truth, lo, hi, minDepth) {
    var pmf = binomPmf(d, pG(truth)), o = { AA: 0, AG: 0, GG: 0, nocall: 0 };
    for (var k = 0; k <= d; k++) o[callFor(k, d, lo, hi, minDepth)] += pmf[k];
    o.correct = truth === "het" ? o.AG : o.AA;
    return o;
  }

  /* 1,000 simulated pileups at every depth: counts of k (reads showing G) and of call outcomes. */
  function simulateAll(seed, truth, lo, hi, minDepth) {
    var rand = mulberry32(seed >>> 0), p = pG(truth), res = {};
    for (var d = DMIN; d <= DMAX; d++) {
      var kc = new Int32Array(d + 1), o = { AA: 0, AG: 0, GG: 0, nocall: 0 };
      for (var r = 0; r < REPS; r++) {
        var k = 0;
        for (var i = 0; i < d; i++) if (rand() < p) k++;
        kc[k]++;
        o[callFor(k, d, lo, hi, minDepth)]++;
      }
      o.correct = truth === "het" ? o.AG : o.AA;
      res[d] = { k: kc, o: o };
    }
    return res;
  }

  /* fixed reference sequence for the window -20..20; the SNP (position 0) has reference base A */
  var REF = "TGCAGGTCCTAGCATTGGACAGCTTCAGGAATCCTGGAGTC".split("");
  REF[HALF] = "A";

  /* One pileup with per-read detail for drawing: read start (relative to the SNP), base at the SNP,
     and misread positions elsewhere in the window. */
  var BASES = ["A", "C", "G", "T"];
  function onePileup(seed, d, truth) {
    var rand = mulberry32(seed >>> 0), reads = [];
    for (var i = 0; i < d; i++) {
      var start = -Math.floor(rand() * READ_LEN);           // read covers [start, start + 149]
      var copy = truth === "het" ? (rand() < 0.5 ? "G" : "A") : "A";
      var base = copy;
      if (rand() < ERR) { var others = BASES.filter(function (b) { return b !== copy; }); base = others[Math.floor(rand() * 3)]; }
      var errs = [];
      for (var x = Math.max(-HALF, start); x <= Math.min(HALF, start + READ_LEN - 1); x++) {
        if (x === 0) continue;
        if (rand() < ERR) {
          var refb = REF[x + HALF], alt3 = BASES.filter(function (b) { return b !== refb; });
          errs.push({ x: x, b: alt3[Math.floor(rand() * 3)] });
        }
      }
      reads.push({ start: start, end: start + READ_LEN - 1, base: base, errs: errs });
    }
    reads.sort(function (a, b) { return a.start - b.start; });
    return reads;
  }

  var CORE = { mulberry32: mulberry32, pG: pG, callFor: callFor, binomPmf: binomPmf, exactOutcome: exactOutcome,
               simulateAll: simulateAll, onePileup: onePileup, ERR: ERR, REPS: REPS };
  if (typeof module !== "undefined" && module.exports) module.exports = CORE;
  if (typeof document === "undefined") return;

  /* ------------------------------------------------------------------ DOM */

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
  function clear(g) { while (g.firstChild) g.removeChild(g.firstChild); }
  function thousands(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function pct(x, dgt) { return (100 * x).toFixed(dgt == null ? 1 : dgt) + "%"; }

  var BASECOL = { A: "var(--base-a)", C: "var(--base-c)", G: "var(--base-g)", T: "var(--base-t)" };
  var CALLNAME = { AA: "A/A", AG: "A/G", GG: "G/G", nocall: "no call" };

  function init() {
    var root = document.getElementById("w-depth");
    if (!root) return;
    var body = root.querySelector(".widget-body");
    if (!body) return;
    body.innerHTML = "";

    var state = { depth: 10, truth: "het", band: "20", minDepth: 1, seed: 1729, draws: 0 };
    var BANDS = { "20": [20, 80], "10": [10, 90], "30": [30, 70] };

    /* controls */
    var c1 = h("div", { "class": "controls s2g-ctl" });
    var ld = h("label", null, "Read depth ");
    var dIn = h("input", { type: "range", min: String(DMIN), max: String(DMAX), step: "1", value: String(state.depth), id: "depth-slider", "aria-label": "read depth: number of reads covering the SNP" });
    var dOut = h("output", { "class": "s2g-val", "for": "depth-slider" }, "");
    ld.appendChild(dIn); ld.appendChild(dOut);
    c1.appendChild(ld);
    var fs = h("fieldset", { "class": "s2g-radio" });
    fs.appendChild(h("legend", null, "True genotype"));
    var truthIn = {};
    [["het", "A/G (heterozygous)"], ["hom", "A/A (homozygous)"]].forEach(function (o) {
      var l = h("label", null, "");
      var r = h("input", { type: "radio", name: "depth-truth", value: o[0], id: "depth-truth-" + o[0] });
      if (o[0] === state.truth) r.checked = true;
      l.appendChild(r); l.appendChild(document.createTextNode(" " + o[1]));
      fs.appendChild(l); truthIn[o[0]] = r;
    });
    c1.appendChild(fs);
    body.appendChild(c1);

    var c2 = h("div", { "class": "controls s2g-ctl" });
    var lb = h("label", null, "Call A/G when the share of G reads is ");
    var bSel = h("select", { id: "depth-band", "aria-label": "range of the share of G reads that gives a heterozygous call" },
      '<option value="20" selected>20–80%</option><option value="10">10–90%</option><option value="30">30–70%</option>');
    lb.appendChild(bSel);
    c2.appendChild(lb);
    var lm = h("label", null, "Minimum depth for a call ");
    var mSel = h("select", { id: "depth-min", "aria-label": "minimum number of reads needed to make a call" },
      '<option value="1" selected>none</option><option value="8">8 reads</option><option value="15">15 reads</option>');
    lm.appendChild(mSel);
    c2.appendChild(lm);
    var reBtn = h("button", { "class": "btn", type: "button", id: "depth-resample" }, "New simulation");
    c2.appendChild(reBtn);
    body.appendChild(c2);

    body.appendChild(h("p", { "class": "note s2g-rule" }, "<strong>Caller rule.</strong> No call below the minimum depth; otherwise call A/G if the share of reads showing G is inside the band, A/A if it is below, G/G if it is above. Each read comes from one of the two chromosome copies with probability ½, and each base is misread with probability 1% (illustrative). Simulated data."));

    var grid = h("div", { "class": "s2g-wgrid2" });
    body.appendChild(grid);

    /* pileup */
    var PW = 420, PH = 320;
    var pile = svgEl("svg", { viewBox: "0 0 " + PW + " " + PH, role: "img", "aria-labelledby": "depth-pile-t", "class": "s2g-wsvg" });
    svgEl("title", { id: "depth-pile-t" }, pile).textContent = "One simulated pileup: reads stacked under a reference sequence, with the base each read shows at the SNP colored.";
    var pileBox = h("div", { "class": "s2g-panel" }); pileBox.appendChild(pile); grid.appendChild(pileBox);

    /* histogram */
    var HW = 420, HH = 260;
    var hist = svgEl("svg", { viewBox: "0 0 " + HW + " " + HH, role: "img", "aria-labelledby": "depth-hist-t", "class": "s2g-wsvg" });
    svgEl("title", { id: "depth-hist-t" }, hist).textContent = "Histogram of the number of reads showing G across 1,000 simulated pileups at the chosen depth, colored by the resulting call.";
    var histBox = h("div", { "class": "s2g-panel" }); histBox.appendChild(hist); grid.appendChild(histBox);

    /* curve */
    var CW = 420, CH = 296;
    var curve = svgEl("svg", { viewBox: "0 0 " + CW + " " + CH, role: "img", "aria-labelledby": "depth-curve-t", "class": "s2g-wsvg" });
    svgEl("title", { id: "depth-curve-t" }, curve).textContent = "Probability of a correct genotype call against read depth from 2 to 60: exact binomial curve and simulated points.";
    var curveBox = h("div", { "class": "s2g-panel" }); curveBox.appendChild(curve); grid.appendChild(curveBox);

    var out = h("div", { "class": "readout s2g-readout", "aria-live": "polite" });
    var outBox = h("div", { "class": "s2g-panel" }); outBox.appendChild(out); grid.appendChild(outBox);

    var sim = null, simKey = "";

    function band() { return BANDS[state.band]; }

    function ensureSim() {
      var key = [state.seed, state.draws, state.truth, state.band, state.minDepth].join("|");
      if (key !== simKey) {
        var b = band();
        sim = simulateAll(state.seed + 104729 * state.draws + (state.truth === "het" ? 0 : 7), state.truth, b[0], b[1], state.minDepth);
        simKey = key;
      }
    }

    function drawPileup(reads) {
      clear(pile);
      var L = 22, R = PW - 10, top = 44, ncol = 2 * HALF + 1, cw = (R - L) / ncol;
      function cx(pos) { return L + (pos + HALF) * cw; }
      var d = reads.length;
      svgText(pile, L, 14, "One simulated pileup at " + d + "× (" + (state.truth === "het" ? "true genotype A/G" : "true genotype A/A") + ")", "t-b");
      var avail = PH - top - 6, rh = Math.min(20, avail / Math.max(d, 1)), bh = Math.max(1.5, rh - (rh > 4 ? 1.6 : 0.6));
      var fsz = Math.min(12, bh * 0.8);
      // SNP band (down to the last read)
      svgEl("rect", { x: cx(0) - 1, y: 18, width: cw + 2, height: top + d * rh + 3 - 18, fill: "var(--accent-soft)", stroke: "var(--accent)", "stroke-width": 0.8 }, pile);
      // reference letters
      for (var p = -HALF; p <= HALF; p++) {
        var t = svgText(pile, cx(p) + cw / 2, 36, REF[p + HALF], "t-mono base-" + REF[p + HALF], { "text-anchor": "middle" });
        t.style.fontSize = "10px";
      }
      svgText(pile, L - 4, 36, "ref", "t-xs", { "text-anchor": "end" });

      reads.forEach(function (rd, i) {
        var y = top + i * rh, x0 = Math.max(-HALF, rd.start), x1 = Math.min(HALF, rd.end);
        svgEl("rect", { x: cx(x0) + 0.5, y: y, width: Math.max(1, cx(x1) + cw - cx(x0) - 1), height: bh, rx: Math.min(2, bh / 2),
                        fill: "var(--bg-sunk)", stroke: "var(--border-strong)", "stroke-width": 0.4 }, pile);
        rd.errs.forEach(function (er) {
          svgEl("rect", { x: cx(er.x) + 1, y: y, width: cw - 2, height: bh, fill: BASECOL[er.b], "fill-opacity": 0.85 }, pile);
        });
        var col = BASECOL[rd.base];
        svgEl("rect", { x: cx(0) + 0.5, y: y, width: cw - 1, height: bh, fill: col }, pile);
        if (rh >= 9) {
          var tt = svgText(pile, cx(0) + cw / 2, y + bh / 2 + fsz * 0.36, rd.base, "t-mono", { "text-anchor": "middle" });
          tt.style.fontSize = fsz.toFixed(1) + "px"; tt.style.fill = "var(--bg)"; tt.style.fontWeight = "700";
        }
      });
    }

    function drawHist(entry, d) {
      clear(hist);
      var M = { l: 46, r: 12, t: 26, b: 40 }, W = HW - M.l - M.r, H = HH - M.t - M.b;
      var b = band(), kc = entry.k, maxC = 0;
      for (var k = 0; k <= d; k++) maxC = Math.max(maxC, kc[k]);
      var tstep = niceStep(Math.max(10, maxC) / 4), top = Math.ceil(Math.max(10, maxC) / tstep) * tstep;
      function X(k) { return M.l + (k + 0.5) / (d + 1) * W; }
      function Y(c) { return M.t + H - c / top * H; }
      svgText(hist, M.l, 14, "1,000 simulated pileups at " + d + "×", "t-b");
      for (var v = 0; v <= top + 1e-9; v += tstep) {
        svgEl("line", { x1: M.l, x2: M.l + W, y1: Y(v), y2: Y(v), stroke: "var(--border)" }, hist);
        svgText(hist, M.l - 6, Y(v) + 4, String(Math.round(v)), "t-sm", { "text-anchor": "end" });
      }
      var bw = Math.max(1, W / (d + 1) - (d > 30 ? 1 : 2));
      for (var k2 = 0; k2 <= d; k2++) {
        if (!kc[k2]) continue;
        var c = callFor(k2, d, b[0], b[1], state.minDepth);
        var ok = (state.truth === "het" && c === "AG") || (state.truth === "hom" && c === "AA");
        var fill = c === "nocall" ? "var(--fg-faint)" : (ok ? "var(--q3)" : "var(--q4)");
        svgEl("rect", { x: X(k2) - bw / 2, y: Y(kc[k2]), width: bw, height: M.t + H - Y(kc[k2]), fill: fill }, hist);
      }
      // band edges
      [b[0], b[1]].forEach(function (pc, j) {
        var kk = pc * d / 100, x = M.l + (kk + 0.5) / (d + 1) * W;
        svgEl("line", { x1: x, x2: x, y1: M.t - 2, y2: M.t + H, stroke: "var(--fg)", "stroke-dasharray": "4 3" }, hist);
        svgText(hist, x + (j === 0 ? -3 : 3), M.t + 9, pc + "%", "t-sm", { "text-anchor": j === 0 ? "end" : "start" });
      });
      svgEl("line", { x1: M.l, x2: M.l + W, y1: M.t + H, y2: M.t + H, stroke: "var(--fg-muted)" }, hist);
      var step = d <= 12 ? 1 : d <= 30 ? 5 : 10;
      for (var t = 0; t <= d; t += step) {
        svgText(hist, X(t), M.t + H + 14, String(t), "t-sm", { "text-anchor": "middle" });
      }
      svgText(hist, M.l + W / 2, HH - 6, "reads showing G (out of " + d + ")", "t", { "text-anchor": "middle" });
    }

    function niceStep(v) {
      var e = Math.pow(10, Math.floor(Math.log10(v))), m = v / e;
      var s = m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10;
      return s * e;
    }

    function drawCurve() {
      clear(curve);
      var M = { l: 46, r: 14, t: 46, b: 40 }, W = CW - M.l - M.r, H = CH - M.t - M.b, b = band();
      function X(d) { return M.l + (d - DMIN) / (DMAX - DMIN) * W; }
      function Y(p) { return M.t + H - p * H; }
      svgText(curve, M.l, 14, "Share of correct calls at each depth", "t-b");
      [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
        svgEl("line", { x1: M.l, x2: M.l + W, y1: Y(v), y2: Y(v), stroke: "var(--border)" }, curve);
        svgText(curve, M.l - 6, Y(v) + 4, v === 1 ? "100%" : v === 0 ? "0" : (100 * v) + "%", "t-sm", { "text-anchor": "end" });
      });
      [2, 10, 20, 30, 40, 50, 60].forEach(function (d) {
        svgEl("line", { x1: X(d), x2: X(d), y1: M.t + H, y2: M.t + H + 4, stroke: "var(--fg-faint)" }, curve);
        svgText(curve, X(d), M.t + H + 16, d + "×", "t-sm", { "text-anchor": "middle" });
      });
      svgText(curve, M.l + W / 2, CH - 6, "read depth", "t", { "text-anchor": "middle" });
      // UK Biobank WGS mean depth
      var xu = X(32.5);
      svgEl("line", { x1: xu, x2: xu, y1: M.t, y2: M.t + H, stroke: "var(--data)", "stroke-dasharray": "2 3" }, curve);
      var ut = svgText(curve, xu + 4, M.t + H - 8, "UK Biobank genomes: mean 32.5×", "t-sm");
      ut.style.fill = "var(--data)";
      // exact line
      var dpath = "";
      for (var d = DMIN; d <= DMAX; d++) {
        var o = exactOutcome(d, state.truth, b[0], b[1], state.minDepth);
        dpath += (d === DMIN ? "M" : "L") + X(d).toFixed(1) + "," + Y(o.correct).toFixed(1);
      }
      svgEl("path", { d: dpath, fill: "none", stroke: "var(--accent)", "stroke-width": 2 }, curve);
      // simulated points
      for (var d2 = DMIN; d2 <= DMAX; d2++) {
        var s = sim[d2].o.correct / REPS;
        svgEl("circle", { cx: X(d2).toFixed(1), cy: Y(s).toFixed(1), r: 2.2, fill: "var(--fg-muted)" }, curve);
      }
      // current depth
      var cur = state.depth, oc = exactOutcome(cur, state.truth, b[0], b[1], state.minDepth);
      svgEl("line", { x1: X(cur), x2: X(cur), y1: M.t, y2: M.t + H, stroke: "var(--fg)", "stroke-dasharray": "4 3" }, curve);
      svgEl("circle", { cx: X(cur), cy: Y(oc.correct), r: 5, fill: "var(--accent)", stroke: "var(--bg)", "stroke-width": 1.5 }, curve);
      // legend
      var lg = svgEl("g", { transform: "translate(" + (M.l + 2) + ",32)" }, curve);
      svgEl("line", { x1: 0, x2: 18, y1: 0, y2: 0, stroke: "var(--accent)", "stroke-width": 2 }, lg);
      svgText(lg, 24, 4, "exact (binomial)", "t-sm");
      svgEl("circle", { cx: 130, cy: 0, r: 2.6, fill: "var(--fg-muted)" }, lg);
      svgText(lg, 138, 4, "simulated (1,000 each)", "t-sm");
    }

    function render() {
      ensureSim();
      var d = state.depth, b = band();
      dOut.textContent = d + "×";
      var reads = onePileup(state.seed * 31 + d * 1009 + state.draws * 7 + (state.truth === "het" ? 0 : 3), d, state.truth);
      drawPileup(reads);
      var entry = sim[d];
      drawHist(entry, d);
      drawCurve();
      var k = reads.filter(function (r) { return r.base === "G"; }).length;
      var a = reads.filter(function (r) { return r.base === "A"; }).length;
      var other = d - k - a;
      var c = callFor(k, d, b[0], b[1], state.minDepth);
      var truthName = state.truth === "het" ? "A/G" : "A/A";
      var ok = (state.truth === "het" && c === "AG") || (state.truth === "hom" && c === "AA");
      var o = entry.o, ex = exactOutcome(d, state.truth, b[0], b[1], state.minDepth);
      var need = "";
      for (var dd = DMIN; dd <= DMAX; dd++) {
        if (exactOutcome(dd, state.truth, b[0], b[1], state.minDepth).correct >= 0.99) { need = dd + "×"; break; }
      }
      out.innerHTML =
        "<div><strong>This pileup:</strong> " + d + " reads; " + k + " show G, " + a + " show A" + (other ? ", " + other + " show another base (misread)" : "") +
        " → " + (c === "nocall" ? "too few reads: <strong>no call</strong>" : (Math.round(100 * k / d)) + "% G → called <strong>" + CALLNAME[c] + "</strong> " + (ok ? "(correct)" : "(wrong: truth is " + truthName + ")")) + "</div>" +
        "<div><strong>1,000 pileups at " + d + "×:</strong> " + thousands(o.correct) + " correct (" + pct(o.correct / REPS) + "); called A/A " + o.AA + ", A/G " + o.AG + ", G/G " + o.GG +
        (o.nocall ? ", no call " + o.nocall : "") + ".</div>" +
        "<div><strong>Exact binomial probability</strong> of a correct call at " + d + "×: " + pct(ex.correct, 2) + ".</div>" +
        "<div>First depth with ≥ 99% correct calls under this rule: " + (need || "not reached by 60×") + ".</div>";
    }

    dIn.addEventListener("input", function () { state.depth = Number(dIn.value); render(); });
    Object.keys(truthIn).forEach(function (k) {
      truthIn[k].addEventListener("change", function () { if (truthIn[k].checked) { state.truth = k; render(); } });
    });
    bSel.addEventListener("change", function () { state.band = bSel.value; render(); });
    mSel.addEventListener("change", function () { state.minDepth = Number(mSel.value); render(); });
    reBtn.addEventListener("click", function () { state.draws += 1; render(); });
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
