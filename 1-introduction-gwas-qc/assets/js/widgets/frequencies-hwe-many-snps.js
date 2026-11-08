/* Widget "Test 2,000 SNPs at once" (page: frequencies-hwe, Lecture 1).
   Simulates M = 2,000 SNPs in n people. Each SNP has a minor allele frequency (MAF) drawn once from the seeded
   generator: 30% of SNPs uniform on [0.002, 0.05], 70% uniform on [0.05, 0.5]. Genotypes are drawn in
   Hardy–Weinberg proportions (q^2, 2pq, p^2). At a chosen share of SNPs ("problem SNPs") each heterozygote is
   miscalled as a homozygote with probability e, half the time as each homozygote, which leaves the allele
   frequency unchanged on average and lowers the heterozygote count by the fraction e (so F-hat ~ e and
   X^2 ~ n e^2).
   Every SNP is tested with the exact HWE test of Wigginton, Cutler & Abecasis (2005), the test PLINK reports:
   conditional on the allele counts, the probability of each heterozygote count is computed by the recurrence
       P(h - 2) = P(h) h (h - 1) / (4 (hom_rare + 1) (hom_common + 1)),
   and the p-value sums the probabilities of all heterozygote counts no more likely than the observed one.
   mid-p (PLINK's "midp" modifier; Graffelman & Moreno 2013): counts with exactly the observed probability are
   counted half. A SNP with no copy of the minor allele gets p = 1, as in PLINK's report.
   Shows the histogram of the M p-values (flat at M/20 per bin if every SNP were in HWE and the test were
   continuous), a Q–Q plot of -log10 p against its expectation -log10((k - 0.5)/M) for the k-th smallest p-value,
   and how many SNPs fall below 0.05, 10^-3, 10^-6 and 10^-8, split into problem SNPs (true flags) and SNPs in
   HWE (false flags). Seeded generator (mulberry32); "New data" changes the seed.
   No libraries, no network; pure functions are exported for Node tests. */
(function () {
  "use strict";

  var M = 2000, SEED0 = 20261109;
  var N_LIST = [200, 500, 1000, 2000, 5000];
  var THRESH = [0.05, 1e-3, 1e-6, 1e-8];

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Exact HWE test (Wigginton et al. 2005), as in Lecture 0's widget, returning both p-values.
     Arguments: counts of the two homozygotes and of heterozygotes. */
  function hweExact(n11, n12, n22) {
    var obsHets = n12, obsHomc = Math.max(n11, n22), obsHomr = Math.min(n11, n22);
    var rare = 2 * obsHomr + obsHets, genotypes = obsHets + obsHomc + obsHomr;
    if (genotypes <= 0 || rare === 0) return { p: 1, mid: 1, pObs: 1 };
    var probs = new Float64Array(rare + 1);
    var mid = Math.floor(rare * (2 * genotypes - rare) / (2 * genotypes));
    if ((rare % 2) !== (mid % 2)) mid++;
    var currHets = mid, currHomr = (rare - mid) / 2, currHomc = genotypes - currHets - currHomr;
    probs[mid] = 1;
    var sum = 1, hh;
    for (hh = mid; hh > 1; hh -= 2) {
      probs[hh - 2] = probs[hh] * hh * (hh - 1) / (4 * (currHomr + 1) * (currHomc + 1));
      sum += probs[hh - 2];
      currHomr++; currHomc++;
    }
    currHomr = (rare - mid) / 2; currHomc = genotypes - mid - currHomr;
    for (hh = mid; hh <= rare - 2; hh += 2) {
      probs[hh + 2] = probs[hh] * 4 * currHomr * currHomc / ((hh + 2) * (hh + 1));
      sum += probs[hh + 2];
      currHomr--; currHomc--;
    }
    var pObs = probs[obsHets] / sum, less = 0, tie = 0;
    for (hh = rare % 2; hh <= rare; hh += 2) {
      var ph = probs[hh] / sum;
      if (ph < pObs * (1 - 1e-9)) less += ph;
      else if (ph <= pObs * (1 + 1e-9)) tie += ph;
    }
    return { p: Math.min(1, less + tie), mid: Math.min(1, less + tie / 2), pObs: pObs };
  }

  /* MAFs for the M SNPs (fixed for a seed) */
  function drawMafs(m, seed) {
    var rand = mulberry32(seed >>> 0), out = new Float64Array(m);
    for (var j = 0; j < m; j++) {
      var u = rand(), v = rand();
      out[j] = u < 0.3 ? 0.002 + 0.048 * v : 0.05 + 0.45 * v;
    }
    return out;
  }

  /* Simulate and test every SNP. share = fraction of problem SNPs (the first round(share*M) in a shuffled order),
     e = miscall rate of heterozygotes at problem SNPs. Returns per-SNP results. */
  function simulate(n, share, e, seed) {
    var maf = drawMafs(M, seed), rand = mulberry32((seed ^ 0x5bd1e995) >>> 0);
    var order = new Int32Array(M), j, i;
    for (j = 0; j < M; j++) order[j] = j;
    for (j = M - 1; j > 0; j--) { var r = Math.floor(rand() * (j + 1)), t = order[j]; order[j] = order[r]; order[r] = t; }
    var nBad = Math.round(share * M), bad = new Uint8Array(M);
    for (j = 0; j < nBad; j++) bad[order[j]] = 1;
    var res = [];
    for (j = 0; j < M; j++) {
      var p = maf[j], q = 1 - p, c0 = q * q, c1 = q * q + 2 * p * q, a = 0, het = 0, b = 0;
      for (i = 0; i < n; i++) {
        var u = rand();
        if (u < c0) a++;
        else if (u < c1) {
          if (bad[j] && rand() < e) { if (rand() < 0.5) a++; else b++; }
          else het++;
        } else b++;
      }
      var t2 = hweExact(a, het, b);
      var nAll = a + het + b, pHat = (het + 2 * b) / (2 * nAll), hExp = 2 * pHat * (1 - pHat);
      res.push({ maf: p, bad: bad[j] === 1, counts: [a, het, b], p: t2.p, mid: t2.mid, F: hExp > 0 ? 1 - (het / nAll) / hExp : NaN });
    }
    return res;
  }

  function tally(res, useMid) {
    var out = THRESH.map(function (t) { return { t: t, ok: 0, bad: 0 }; }), nBad = 0, nOk = 0, sumF = 0, nF = 0;
    res.forEach(function (r) {
      var pv = useMid ? r.mid : r.p;
      if (r.bad) { nBad++; if (isFinite(r.F)) { sumF += r.F; nF++; } } else nOk++;
      out.forEach(function (o) { if (pv < o.t) { if (r.bad) o.bad++; else o.ok++; } });
    });
    return { rows: out, nBad: nBad, nOk: nOk, meanFbad: nF ? sumF / nF : NaN };
  }

  var STATS = { mulberry32: mulberry32, hweExact: hweExact, drawMafs: drawMafs, simulate: simulate, tally: tally,
                M: M, N_LIST: N_LIST, SEED0: SEED0, THRESH: THRESH };
  if (typeof module !== "undefined" && module.exports) module.exports = STATS;
  if (typeof document === "undefined") return;

  /* ------------------------------------------------------------------ DOM */
  var SVGNS = "http://www.w3.org/2000/svg";
  function svgEl(tag, attrs, parent) {
    var el = document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }
  function svgText(parent, x, y, txt, cls, extra) {
    var a = { x: x, y: y, "class": cls || "t-sm" };
    if (extra) for (var k in extra) a[k] = extra[k];
    var t = svgEl("text", a, parent); t.textContent = txt; return t;
  }
  function h(tag, attrs, html) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) el.setAttribute(k, attrs[k]);
    if (html != null) el.innerHTML = html;
    return el;
  }
  function thousands(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  var T_LABEL = ["0.05", "10<sup>−3</sup>", "10<sup>−6</sup>", "10<sup>−8</sup>"];
  function expLabel(x) {
    if (x >= 10) return thousands(Math.round(x));
    if (x >= 1) return x.toFixed(1);
    if (x >= 0.01) return x.toFixed(2);
    if (x >= 0.001) return x.toFixed(3);
    var e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e);
    if (m >= 9.95) { m = 1; e += 1; }
    return m.toFixed(1) + " × 10<sup>−" + (-e) + "</sup>";
  }

  function init() {
    var root = document.getElementById("w-many-snps");
    if (!root) return;
    var body = root.querySelector(".widget-body");
    if (!body) return;
    body.innerHTML = "";

    var DEF = { ni: 2, share: 0.02, e: 0.1, mid: false, seed: SEED0 };
    var state = { ni: DEF.ni, share: DEF.share, e: DEF.e, mid: DEF.mid, seed: DEF.seed };

    var ctl = h("div", { "class": "controls ms-controls" });
    var lN = h("label", null, "People, n ");
    var sN = h("input", { type: "range", min: "0", max: String(N_LIST.length - 1), step: "1", value: String(state.ni), "aria-label": "Number of people" });
    var vN = h("span", { "class": "ms-val" }, "");
    lN.appendChild(sN); lN.appendChild(vN);
    var lS = h("label", null, "Problem SNPs ");
    var sS = h("input", { type: "range", min: "0", max: "0.2", step: "0.01", value: String(state.share), "aria-label": "Share of SNPs with a genotyping problem" });
    var vS = h("span", { "class": "ms-val" }, "");
    lS.appendChild(sS); lS.appendChild(vS);
    var lE = h("label", null, "Heterozygotes miscalled there, e ");
    var sE = h("input", { type: "range", min: "0", max: "0.3", step: "0.01", value: String(state.e), "aria-label": "Share of heterozygotes called homozygous at problem SNPs" });
    var vE = h("span", { "class": "ms-val" }, "");
    lE.appendChild(sE); lE.appendChild(vE);
    ctl.appendChild(lN); ctl.appendChild(lS); ctl.appendChild(lE);
    body.appendChild(ctl);

    var ctl2 = h("div", { "class": "controls" });
    var lM = h("label", null, "");
    var cM = h("input", { type: "checkbox" });
    lM.appendChild(cM); lM.appendChild(document.createTextNode(" mid-p (PLINK’s midp)"));
    var bNew = h("button", { "class": "btn", type: "button" }, "New data");
    var bReset = h("button", { "class": "btn", type: "button" }, "Reset");
    ctl2.appendChild(lM); ctl2.appendChild(bNew); ctl2.appendChild(bReset);
    body.appendChild(ctl2);

    var note = h("p", { "class": "note ms-note" }, "");
    body.appendChild(note);

    var grid = h("div", { "class": "ms-grid" });
    body.appendChild(grid);
    var histBox = h("div", null, ""), qqBox = h("div", null, "");
    grid.appendChild(histBox); grid.appendChild(qqBox);
    var hist = svgEl("svg", { viewBox: "0 0 340 236", role: "img", "aria-labelledby": "ms-hist-t", "class": "ms-svg" });
    svgEl("title", { id: "ms-hist-t" }, hist).textContent = "Histogram of the 2,000 HWE p-values";
    histBox.appendChild(hist);
    var qq = svgEl("svg", { viewBox: "0 0 340 236", role: "img", "aria-labelledby": "ms-qq-t", "class": "ms-svg" });
    svgEl("title", { id: "ms-qq-t" }, qq).textContent = "Q–Q plot: observed against expected minus log10 p-values, problem SNPs in red";
    qqBox.appendChild(qq);

    var tWrap = h("div", { "class": "ms-twrap" });
    body.appendChild(tWrap);
    var read = h("div", { "class": "readout ms-read", "aria-live": "polite" });
    body.appendChild(read);

    var cache = { key: "", res: null };
    function results() {
      var key = [N_LIST[state.ni], state.share, state.e, state.seed].join("|");
      if (cache.key !== key) { cache.key = key; cache.res = simulate(N_LIST[state.ni], state.share, state.e, state.seed); }
      return cache.res;
    }

    function render() {
      var n = N_LIST[state.ni], res = results(), T = tally(res, state.mid);
      vN.textContent = thousands(n);
      vS.textContent = Math.round(state.share * 100) + "% (" + T.nBad + ")";
      vE.textContent = Math.round(state.e * 100) + "%";
      note.innerHTML = '<span class="illustrative">Simulated</span> ' + thousands(M) + " SNPs in " + thousands(n) +
        " people, genotypes drawn in Hardy–Weinberg proportions; minor allele frequencies 0.002–0.5 (30% below 0.05). At " +
        T.nBad + " problem SNPs, " + Math.round(state.e * 100) + "% of heterozygotes are called homozygous. Each SNP gets an exact-test " +
        (state.mid ? "mid-p value." : "p-value.");

      /* histogram: 20 bins of width 0.05, stacked ok / problem */
      while (hist.childNodes.length > 1) hist.removeChild(hist.lastChild);
      var bins = [], k;
      for (k = 0; k < 20; k++) bins.push({ ok: 0, bad: 0 });
      res.forEach(function (r) {
        var pv = state.mid ? r.mid : r.p, b = Math.min(19, Math.floor(pv / 0.05));
        if (r.bad) bins[b].bad++; else bins[b].ok++;
      });
      var X0 = 46, X1 = 330, Y0 = 190, Y1 = 26, maxB = M / 20 * 1.6;
      bins.forEach(function (b) { if (b.ok + b.bad > maxB) maxB = b.ok + b.bad; });
      maxB = Math.ceil(maxB / 50) * 50;
      function HX(v) { return X0 + v * (X1 - X0); }
      function HY(c) { return Y0 - c / maxB * (Y0 - Y1); }
      for (var g = 0; g <= maxB; g += (maxB > 400 ? 200 : 100)) {
        svgEl("line", { x1: X0, y1: HY(g), x2: X1, y2: HY(g), stroke: "var(--border)", "stroke-width": 0.8 }, hist);
        svgText(hist, X0 - 6, HY(g) + 4, thousands(g), "t-xs", { "text-anchor": "end" });
      }
      bins.forEach(function (b, i) {
        var xa = HX(i * 0.05) + 0.8, w = HX(0.05) - HX(0) - 1.6;
        if (b.ok) svgEl("rect", { x: xa, y: HY(b.ok), width: w, height: Y0 - HY(b.ok), fill: "var(--q1)" }, hist);
        if (b.bad) svgEl("rect", { x: xa, y: HY(b.ok + b.bad), width: w, height: HY(b.ok) - HY(b.ok + b.bad), fill: "var(--q4)" }, hist);
      });
      svgEl("line", { x1: X0, y1: HY(M / 20), x2: X1, y2: HY(M / 20), stroke: "var(--fg)", "stroke-width": 1.2, "stroke-dasharray": "5 4" }, hist);
      svgText(hist, HX(0.5), HY(M / 20) - 5, "flat: 100 per bin", "t-xs", { "text-anchor": "middle" });
      svgEl("line", { x1: X0, y1: Y0, x2: X1, y2: Y0, stroke: "var(--border-strong)" }, hist);
      [0, 0.25, 0.5, 0.75, 1].forEach(function (t) {
        svgText(hist, HX(t), Y0 + 14, t === 0 ? "0" : t === 1 ? "1" : String(t), "t-xs", { "text-anchor": "middle" });
      });
      svgText(hist, (X0 + X1) / 2, Y0 + 32, state.mid ? "HWE mid-p value" : "HWE p-value", "t-sm", { "text-anchor": "middle" });
      svgText(hist, 11, (Y0 + Y1) / 2, "SNPs", "t-sm", { "text-anchor": "middle", transform: "rotate(-90 11 " + ((Y0 + Y1) / 2) + ")" });
      var lg = svgEl("g", { transform: "translate(" + (X0 + 6) + ",12)" }, hist);
      svgEl("rect", { x: 0, y: -8, width: 10, height: 10, fill: "var(--q1)" }, lg);
      svgText(lg, 14, 1, "in HWE", "t-xs");
      svgEl("rect", { x: 70, y: -8, width: 10, height: 10, fill: "var(--q4)" }, lg);
      svgText(lg, 84, 1, "problem SNPs", "t-xs");

      /* Q-Q plot */
      while (qq.childNodes.length > 1) qq.removeChild(qq.lastChild);
      var pts = res.map(function (r) { var pv = state.mid ? r.mid : r.p; return { y: -Math.log10(Math.max(pv, 1e-300)), bad: r.bad }; });
      pts.sort(function (a, b) { return b.y - a.y; });
      var xmax = -Math.log10(0.5 / M), ymaxObs = pts.length ? pts[0].y : 0;
      var YCAP = 40, ymax = Math.max(9, Math.min(YCAP, Math.ceil(ymaxObs + 0.5)));
      var QX0 = 40, QX1 = 330, QY0 = 196, QY1 = 14;
      function QX(v) { return QX0 + v / xmax * (QX1 - QX0); }
      function QY(v) { return QY0 - Math.min(v, ymax) / ymax * (QY0 - QY1); }
      var ystep = ymax <= 12 ? 2 : ymax <= 24 ? 4 : 10;
      for (var yt = 0; yt <= ymax; yt += ystep) {
        svgEl("line", { x1: QX0, y1: QY(yt), x2: QX1, y2: QY(yt), stroke: "var(--border)", "stroke-width": 0.8 }, qq);
        svgText(qq, QX0 - 6, QY(yt) + 4, String(yt), "t-xs", { "text-anchor": "end" });
      }
      [6, 8].forEach(function (t) {
        svgEl("line", { x1: QX0, y1: QY(t), x2: QX1, y2: QY(t), stroke: "var(--pitfall)", "stroke-width": 1, "stroke-dasharray": "4 3" }, qq);
      });
      svgText(qq, QX0 + 4, QY(6) + 12, "10⁻⁶", "t-xs");
      svgText(qq, QX0 + 4, QY(8) - 4, "10⁻⁸", "t-xs");
      svgEl("line", { x1: QX(0), y1: QY(0), x2: QX(Math.min(xmax, ymax)), y2: QY(Math.min(xmax, ymax)), stroke: "var(--fg-muted)", "stroke-width": 1.2 }, qq);
      for (var xt = 0; xt <= Math.floor(xmax); xt++) svgText(qq, QX(xt), QY0 + 14, String(xt), "t-xs", { "text-anchor": "middle" });
      svgEl("line", { x1: QX0, y1: QY0, x2: QX1, y2: QY0, stroke: "var(--border-strong)" }, qq);
      /* draw ok points first, problem points on top */
      [false, true].forEach(function (wantBad) {
        for (var i = pts.length - 1; i >= 0; i--) {
          var pt = pts[i];
          if (pt.bad !== wantBad) continue;
          var ex = -Math.log10((i + 0.5) / M), cx = QX(ex), cy = QY(pt.y);
          if (pt.y > ymax) svgEl("path", { d: "M" + (cx - 3.5) + " " + (cy + 4) + "L" + cx + " " + (cy - 3) + "L" + (cx + 3.5) + " " + (cy + 4) + "Z", fill: "var(--q4)" }, qq);
          else svgEl("circle", { cx: cx, cy: cy, r: wantBad ? 2.6 : 2.1, fill: wantBad ? "var(--q4)" : "var(--q1)", "fill-opacity": wantBad ? 0.95 : 0.7 }, qq);
        }
      });
      svgText(qq, (QX0 + QX1) / 2, QY0 + 32, "expected −log₁₀ p (rank)", "t-sm", { "text-anchor": "middle" });
      svgText(qq, 11, (QY0 + QY1) / 2, "observed −log₁₀ p", "t-sm", { "text-anchor": "middle", transform: "rotate(-90 11 " + ((QY0 + QY1) / 2) + ")" });
      if (ymaxObs > ymax) svgText(qq, QX1, QY1 + 10, "▲ beyond " + ymax, "t-xs", { "text-anchor": "end" });

      /* counts table */
      var rows = T.rows.map(function (o, i) {
        return "<tr><th scope=\"row\">p &lt; " + T_LABEL[i] + "</th><td>" + o.ok + "</td><td>" + expLabel(T.nOk * o.t) + "</td><td>" + o.bad + " of " + T.nBad + "</td></tr>";
      }).join("");
      tWrap.innerHTML = "<table class=\"ms-t\"><thead><tr><th>SNPs with</th><th>in HWE (false flags)</th><th>expected by chance</th><th>problem SNPs (true flags)</th></tr></thead><tbody>" + rows + "</tbody></table>";
      var x2 = n * state.e * state.e;
      read.innerHTML =
        "<div>Problem SNPs: mean F̂ = " + (isFinite(T.meanFbad) ? T.meanFbad.toFixed(3) : "—") + " (e = " + state.e.toFixed(2) + "), so X² ≈ n e² = " + (x2 >= 100 ? Math.round(x2) : x2.toFixed(1)) + "</div>" +
        "<div>In HWE, a SNP is flagged at threshold t with probability at most t.</div>";
    }

    var timer = null;
    function schedule() { if (timer) clearTimeout(timer); timer = setTimeout(function () { timer = null; render(); }, 40); }
    sN.addEventListener("input", function () { state.ni = Number(sN.value); schedule(); });
    sS.addEventListener("input", function () { state.share = Number(sS.value); schedule(); });
    sE.addEventListener("input", function () { state.e = Number(sE.value); schedule(); });
    cM.addEventListener("change", function () { state.mid = cM.checked; render(); });
    bNew.addEventListener("click", function () { state.seed = (state.seed + 104729) >>> 0; render(); });
    bReset.addEventListener("click", function () {
      state = { ni: DEF.ni, share: DEF.share, e: DEF.e, mid: DEF.mid, seed: DEF.seed };
      sN.value = String(DEF.ni); sS.value = String(DEF.share); sE.value = String(DEF.e); cM.checked = false;
      render();
    });
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
