/* Widget "How precise is an allele frequency?" (page: frequencies-hwe, Lecture 1).
   Draws R = 2,000 samples of n people from a population in which the counted allele has frequency p and
   heterozygotes fall short of the Hardy–Weinberg (HWE) proportion by the fraction F:
       P(2 copies) = p^2 + F p q,   P(1 copy) = 2 p q (1 - F),   P(0 copies) = q^2 + F p q,   q = 1 - p
   (F = 0 is HWE; F < 0 is an excess of heterozygotes; F is limited to F >= -min(p/q, q/p) so that no
   probability is negative). For each sample: p-hat = (copies of the counted allele) / (2n).
   Shows the histogram of the 2,000 p-hat values with the normal curve whose standard deviation is
       SE = sqrt(p q (1 + F) / (2n))          (the HWE formula sqrt(p q / 2n) when F = 0, dashed when F != 0),
   the standard deviation of the simulated p-hat values, and the share of 95% intervals that contain p:
       Wald:   p-hat +/- 1.96 sqrt(p-hat (1 - p-hat) / N),                N = 2n allele copies
       Wilson: c +/- h,  w = z^2 / N,  c = (p-hat + w/2) / (1 + w),
               h = z sqrt(p-hat (1 - p-hat) / N + w / (4N)) / (1 + w),  z = 1.959964
   Both intervals assume HWE (2n independent copies). The ladder shows the first 40 intervals.
   Seeded generator (mulberry32) so the first view is the same for every reader; "Draw again" changes the seed.
   No libraries, no network; pure functions are exported for Node tests. */
(function () {
  "use strict";

  var R = 2000, LADDER = 40, Z = 1.959963984540054, SEED0 = 20261108;
  var N_LIST = [10, 20, 50, 100, 200, 500, 766, 1000, 2000, 5000];

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Smallest F allowed at frequency p (keeps p^2 + F p q and q^2 + F p q non-negative). */
  function fMin(p) { var q = 1 - p; if (p <= 0 || q <= 0) return 0; return -Math.min(p / q, q / p); }
  function genotypeProbs(p, F) {
    var q = 1 - p;
    return [q * q + F * p * q, 2 * p * q * (1 - F), p * p + F * p * q];   // 0, 1, 2 copies of the counted allele
  }
  function seTrue(p, F, n) { return Math.sqrt(p * (1 - p) * (1 + F) / (2 * n)); }
  function seHWE(p, n) { return Math.sqrt(p * (1 - p) / (2 * n)); }
  function wald(x, N) {
    var ph = x / N, h = Z * Math.sqrt(ph * (1 - ph) / N);
    return [ph - h, ph + h];
  }
  function wilson(x, N) {
    var ph = x / N, w = Z * Z / N;
    var c = (ph + w / 2) / (1 + w), h = Z * Math.sqrt(ph * (1 - ph) / N + w / (4 * N)) / (1 + w);
    return [c - h, c + h];
  }
  /* R samples of n people; returns the copy counts (0..2n) of the counted allele. */
  function simulate(p, F, n, reps, seed) {
    var P = genotypeProbs(p, F), c0 = P[0], c1 = P[0] + P[1];
    var rand = mulberry32(seed >>> 0), out = new Int32Array(reps);
    for (var r = 0; r < reps; r++) {
      var x = 0;
      for (var i = 0; i < n; i++) { var u = rand(); x += (u < c0) ? 0 : (u < c1 ? 1 : 2); }
      out[r] = x;
    }
    return out;
  }
  function summarize(counts, p, n) {
    var N = 2 * n, m = 0, s2 = 0, i, k = counts.length, cw = 0, cs = 0, zero = 0;
    for (i = 0; i < k; i++) m += counts[i] / N;
    m /= k;
    for (i = 0; i < k; i++) {
      var ph = counts[i] / N, d = ph - m;
      s2 += d * d;
      var a = wald(counts[i], N), b = wilson(counts[i], N);
      if (a[0] <= p && p <= a[1]) cw++;
      if (b[0] <= p && p <= b[1]) cs++;
      if (counts[i] === 0) zero++;
    }
    return { mean: m, sd: Math.sqrt(s2 / (k - 1)), coverWald: cw / k, coverWilson: cs / k, zero: zero };
  }

  var STATS = { mulberry32: mulberry32, fMin: fMin, genotypeProbs: genotypeProbs, seTrue: seTrue, seHWE: seHWE,
                wald: wald, wilson: wilson, simulate: simulate, summarize: summarize, N_LIST: N_LIST, R: R, SEED0: SEED0 };
  if (typeof module !== "undefined" && module.exports) module.exports = STATS;
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
    var t = svgEl("text", a, parent); t.textContent = txt; return t;
  }
  function h(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function thousands(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function signed(x, d) { return x < 0 ? "−" + (-x).toFixed(d) : x.toFixed(d); }
  function fmtSE(x) { return x >= 0.01 ? x.toFixed(4) : x.toPrecision(3); }
  function pct(x) { return (100 * x).toFixed(1) + "%"; }
  function niceTicks(lo, hi, nt) {
    var span = hi - lo, raw = span / nt, mag = Math.pow(10, Math.floor(Math.log10(raw))), st;
    var r = raw / mag;
    st = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag;
    var out = [], t = Math.ceil(lo / st - 1e-9) * st;
    for (; t <= hi + 1e-12; t += st) out.push(Math.round(t / st) * st);
    return { ticks: out, step: st };
  }
  function tickLabel(v, step) {
    var d = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
    return v.toFixed(Math.min(d, 4));
  }

  function init() {
    var root = document.getElementById("w-sampling");
    if (!root) return;
    var body = root.querySelector(".widget-body");
    if (!body) return;
    body.innerHTML = "";

    var state = { ni: 6, p: 0.34, F: 0, seed: SEED0, kind: "wald" };

    var ctl = h("div", { "class": "controls fs-controls" });
    var lN = h("label", null, "People per sample, n ");
    var sN = h("input", { type: "range", min: "0", max: String(N_LIST.length - 1), step: "1", value: String(state.ni), "aria-label": "People per sample" });
    var vN = h("span", { "class": "fs-val" }, "");
    lN.appendChild(sN); lN.appendChild(vN);
    var lP = h("label", null, "Allele frequency, p ");
    var sP = h("input", { type: "range", min: "0.01", max: "0.5", step: "0.01", value: String(state.p), "aria-label": "Allele frequency in the population" });
    var vP = h("span", { "class": "fs-val" }, "");
    lP.appendChild(sP); lP.appendChild(vP);
    var lF = h("label", null, "Heterozygote shortfall, F ");
    var sF = h("input", { type: "range", min: "-0.2", max: "0.6", step: "0.05", value: "0", "aria-label": "Heterozygote shortfall F" });
    var vF = h("span", { "class": "fs-val" }, "");
    lF.appendChild(sF); lF.appendChild(vF);
    ctl.appendChild(lN); ctl.appendChild(lP); ctl.appendChild(lF);
    body.appendChild(ctl);

    var ctl2 = h("div", { "class": "controls" });
    var kindGroup = h("span", { role: "radiogroup", "aria-label": "Interval drawn in the lower plot", "class": "fs-radios" });
    kindGroup.appendChild(h("span", { "class": "fs-lab" }, "Intervals drawn:"));
    var radios = {};
    [["wald", "Wald"], ["wilson", "Wilson"]].forEach(function (d) {
      var l = h("label", null, "");
      var r = h("input", { type: "radio", name: "fs-kind", value: d[0] });
      if (d[0] === state.kind) r.checked = true;
      l.appendChild(r); l.appendChild(document.createTextNode(" " + d[1]));
      kindGroup.appendChild(l); radios[d[0]] = r;
    });
    ctl2.appendChild(kindGroup);
    var bDraw = h("button", { "class": "btn", type: "button" }, "Draw 2,000 new samples");
    var bReset = h("button", { "class": "btn", type: "button" }, "Reset");
    ctl2.appendChild(bDraw); ctl2.appendChild(bReset);
    body.appendChild(ctl2);

    var note = h("p", { "class": "note fs-note" }, "");
    body.appendChild(note);

    var grid = h("div", { "class": "fs-grid" });
    body.appendChild(grid);
    var left = h("div", null, ""), right = h("div", null, "");
    grid.appendChild(left); grid.appendChild(right);
    var hist = svgEl("svg", { viewBox: "0 0 360 236", role: "img", "aria-labelledby": "fs-hist-t", "class": "fs-svg" });
    svgEl("title", { id: "fs-hist-t" }, hist).textContent = "Histogram of the estimated allele frequency in 2,000 simulated samples, with the normal curve predicted by the standard-error formula";
    left.appendChild(hist);
    var ladder = svgEl("svg", { viewBox: "0 0 360 236", role: "img", "aria-labelledby": "fs-lad-t", "class": "fs-svg" });
    var ladTitle = svgEl("title", { id: "fs-lad-t" }, ladder);
    right.appendChild(ladder);
    var read = h("div", { "class": "readout fs-read", "aria-live": "polite" });
    body.appendChild(read);

    var X0 = 40, X1 = 348;
    function render() {
      var n = N_LIST[state.ni], p = state.p, fmin = fMin(p), F = Math.max(state.F, fmin), clamped = F !== state.F;
      vN.textContent = thousands(n);
      vP.textContent = p.toFixed(2);
      vF.textContent = signed(F, 2);
      var counts = simulate(p, F, n, R, state.seed);
      var S = summarize(counts, p, n), N = 2 * n;
      var sT = seTrue(p, F, n), sH = seHWE(p, n);

      note.innerHTML = '<span class="illustrative">Simulated</span> ' + thousands(R) + " samples of " + thousands(n) +
        " people (" + thousands(N) + " allele copies) from a population with p = " + p.toFixed(2) +
        (F === 0 ? ", in Hardy–Weinberg proportions." : ", with heterozygotes " + (F > 0 ? "short" : "in excess") + " by F = " + signed(F, 2) + ".") +
        (clamped ? " (At this p, F cannot go below " + signed(fmin, 3) + ".)" : "");

      /* x range: p +/- 4.5 SE, within [0, 1] */
      var lo = Math.max(0, p - 4.5 * Math.max(sT, sH)), hi = Math.min(1, p + 4.5 * Math.max(sT, sH));
      if (hi - lo < 6 / N) { lo = Math.max(0, p - 3 / N); hi = Math.min(1, p + 3 / N); }
      function X(v) { return X0 + (v - lo) / (hi - lo) * (X1 - X0); }

      /* histogram: bins aligned to the possible values k/N */
      while (hist.childNodes.length > 1) hist.removeChild(hist.lastChild);
      var kLo = Math.ceil(lo * N - 1e-9), kHi = Math.floor(hi * N + 1e-9), nv = kHi - kLo + 1;
      var per = Math.max(1, Math.ceil(nv / 45)), bins = [], b, k, i;
      for (k = kLo; k <= kHi; k += per) bins.push({ k0: k, k1: Math.min(kHi, k + per - 1), c: 0 });
      var outside = 0;
      for (i = 0; i < counts.length; i++) {
        var c = counts[i];
        if (c < kLo || c > kHi) { outside++; continue; }
        bins[Math.floor((c - kLo) / per)].c++;
      }
      var H0 = 196, H1 = 22, maxC = 1;
      bins.forEach(function (bb) { if (bb.c > maxC) maxC = bb.c; });
      /* normal curves: expected count per bin = R * (values per bin / N) * pdf */
      function pdf(v, sd) { return Math.exp(-0.5 * Math.pow((v - p) / sd, 2)) / (sd * Math.sqrt(2 * Math.PI)); }
      var peakT = R * (per / N) * pdf(p, sT), peakH = R * (per / N) * pdf(p, sH);
      var top = Math.max(maxC, peakT, peakH) * 1.08;
      function Y(v) { return H0 - v / top * (H0 - H1); }
      var halfStep = 0.5 / N;
      svgEl("line", { x1: X0, y1: H0, x2: X1, y2: H0, stroke: "var(--border-strong)" }, hist);
      bins.forEach(function (bb) {
        if (!bb.c) return;
        var xa = X(bb.k0 / N - halfStep) + 0.6, xb = X(bb.k1 / N + halfStep) - 0.6;
        if (xb - xa < 1) { xa -= 0.4; xb += 0.4; }
        svgEl("rect", { x: xa, y: Y(bb.c), width: Math.max(0.8, xb - xa), height: H0 - Y(bb.c), fill: "var(--g1)" }, hist);
      });
      function curve(sd, dash, color) {
        var d = "", steps = 120;
        for (var s = 0; s <= steps; s++) {
          var v = lo + (hi - lo) * s / steps, y = Y(R * (per / N) * pdf(v, sd));
          d += (s ? "L" : "M") + X(v).toFixed(1) + " " + y.toFixed(1);
        }
        var a = { d: d, fill: "none", stroke: color, "stroke-width": 2 };
        if (dash) a["stroke-dasharray"] = "5 4";
        svgEl("path", a, hist);
      }
      if (F !== 0) curve(sH, true, "var(--fg-muted)");
      curve(sT, false, "var(--q4)");
      svgEl("line", { x1: X(p), y1: H1 - 4, x2: X(p), y2: H0, stroke: "var(--fg)", "stroke-width": 1.2, "stroke-dasharray": "2 3" }, hist);
      svgText(hist, X(p), H1 - 8, "true p", "t-xs", { "text-anchor": "middle" });
      var tk = niceTicks(lo, hi, 5);
      tk.ticks.forEach(function (t) {
        svgEl("line", { x1: X(t), y1: H0, x2: X(t), y2: H0 + 4, stroke: "var(--border-strong)" }, hist);
        svgText(hist, X(t), H0 + 15, tickLabel(t, tk.step), "t-xs", { "text-anchor": "middle" });
      });
      svgText(hist, (X0 + X1) / 2, H0 + 33, "estimated p in each sample", "t-sm", { "text-anchor": "middle" });
      svgText(hist, 12, (H0 + H1) / 2, "samples", "t-sm", { "text-anchor": "middle", transform: "rotate(-90 12 " + ((H0 + H1) / 2) + ")" });
      /* legend */
      var lg = svgEl("g", { transform: "translate(" + (X1 - 112) + ",16)" }, hist);
      svgEl("line", { x1: 0, y1: -4, x2: 18, y2: -4, stroke: "var(--q4)", "stroke-width": 2 }, lg);
      svgText(lg, 22, 0, F === 0 ? "SE formula" : "SE formula with F", "t-xs");
      if (F !== 0) {
        svgEl("line", { x1: 0, y1: 9, x2: 18, y2: 9, stroke: "var(--fg-muted)", "stroke-width": 2, "stroke-dasharray": "5 4" }, lg);
        svgText(lg, 22, 13, "HWE formula", "t-xs");
      }

      /* ladder of the first 40 intervals */
      while (ladder.childNodes.length > 1) ladder.removeChild(ladder.lastChild);
      ladTitle.textContent = "The " + (state.kind === "wald" ? "Wald" : "Wilson") + " 95% intervals of the first 40 samples; red ones miss the true p";
      var L0y = 22, L1y = 196, miss = 0;
      svgEl("line", { x1: X(p), y1: L0y - 6, x2: X(p), y2: L1y + 4, stroke: "var(--fg)", "stroke-width": 1.2, "stroke-dasharray": "2 3" }, ladder);
      svgText(ladder, X(p), L0y - 10, "true p", "t-xs", { "text-anchor": "middle" });
      for (i = 0; i < LADDER; i++) {
        var iv = state.kind === "wald" ? wald(counts[i], N) : wilson(counts[i], N), hit = iv[0] <= p && p <= iv[1];
        if (!hit) miss++;
        var y = L0y + (i + 0.5) * (L1y - L0y) / LADDER;
        var xa2 = X(Math.max(lo, iv[0])), xb2 = X(Math.min(hi, iv[1]));
        var col = hit ? "var(--q1)" : "var(--q4)";
        svgEl("line", { x1: xa2, y1: y, x2: Math.max(xb2, xa2 + 0.01), y2: y, stroke: col, "stroke-width": hit ? 2 : 2.6 }, ladder);
        var ph = counts[i] / N;
        if (ph >= lo && ph <= hi) svgEl("circle", { cx: X(ph), cy: y, r: 2, fill: col }, ladder);
      }
      svgEl("line", { x1: X0, y1: L1y + 4, x2: X1, y2: L1y + 4, stroke: "var(--border-strong)" }, ladder);
      tk.ticks.forEach(function (t) {
        svgEl("line", { x1: X(t), y1: L1y + 4, x2: X(t), y2: L1y + 8, stroke: "var(--border-strong)" }, ladder);
        svgText(ladder, X(t), L1y + 19, tickLabel(t, tk.step), "t-xs", { "text-anchor": "middle" });
      });
      svgText(ladder, (X0 + X1) / 2, L1y + 37, "first 40 samples: " + (state.kind === "wald" ? "Wald" : "Wilson") + " intervals, " + miss + " miss p", "t-sm", { "text-anchor": "middle" });

      read.innerHTML =
        "<div>SE formula, HWE: √(pq/2n) = <b>" + fmtSE(sH) + "</b></div>" +
        (F !== 0 ? "<div>SE formula with F: √(pq(1+F)/2n) = <b>" + fmtSE(sT) + "</b></div>" : "") +
        "<div>SD of the " + thousands(R) + " simulated p̂: <b>" + fmtSE(S.sd) + "</b></div>" +
        "<div>95% intervals that contain p: Wald <b>" + pct(S.coverWald) + "</b> · Wilson <b>" + pct(S.coverWilson) + "</b></div>" +
        (S.zero ? "<div>samples with no copy of the allele (p̂ = 0): " + thousands(S.zero) + "</div>" : "") +
        (outside ? "<div class=\"fs-dim\">" + outside + " samples fall outside the plotted range</div>" : "");
    }

    var timer = null;
    function schedule() { if (timer) clearTimeout(timer); timer = setTimeout(function () { timer = null; render(); }, 25); }
    sN.addEventListener("input", function () { state.ni = Number(sN.value); schedule(); });
    sP.addEventListener("input", function () { state.p = Number(sP.value); schedule(); });
    sF.addEventListener("input", function () { state.F = Number(sF.value); schedule(); });
    Object.keys(radios).forEach(function (k) { radios[k].addEventListener("change", function () { if (radios[k].checked) { state.kind = k; render(); } }); });
    bDraw.addEventListener("click", function () { state.seed = (state.seed + 7919) >>> 0; render(); });
    bReset.addEventListener("click", function () {
      state = { ni: 6, p: 0.34, F: 0, seed: SEED0, kind: "wald" };
      sN.value = "6"; sP.value = "0.34"; sF.value = "0"; radios.wald.checked = true;
      render();
    });
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
