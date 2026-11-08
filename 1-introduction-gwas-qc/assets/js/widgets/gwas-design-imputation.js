/* gwas-design-imputation.js — genotype imputation with a simplified Li–Stephens copying model
   (page gwas-design, widget #w-imputation).

   Shows: a simulated reference panel of K haplotypes at 18 SNPs, and one simulated study person whose two
   haplotypes were measured only at the "array" SNPs. Each study haplotype is modeled as a copy of one
   reference haplotype at a time, with occasional switches between reference haplotypes (a hidden Markov
   model, HMM). The forward–backward algorithm gives, at every SNP, the posterior probability that the
   haplotype copies each reference haplotype; the imputed allele probability is the probability-weighted
   allele of the copied haplotypes.

   Model (haploid Li–Stephens HMM, simplified: phase is taken as known, ρ and ε are constants):
     hidden state at SNP t: k = which reference haplotype is copied (1..K)
     transition t → t+1: stay with probability 1 − ρ + ρ/K, move to each other haplotype with probability ρ/K
     emission at an array SNP: P(observed allele | k) = 1 − ε if it equals reference allele h_k,t, else ε
     emission at an untyped SNP: 1 (nothing observed)
     posterior γ_t(k) ∝ α_t(k) β_t(k)   (forward and backward probabilities, rescaled at every SNP)
     P(allele 1 at t) = Σ_k γ_t(k) [ (1 − ε) if h_k,t = 1, else ε ]
   For the two haplotypes a and b with allele-1 probabilities P_a and P_b:
     dosage D = P_a + P_b;  P(g = 2) = P_a P_b;  P(g = 0) = (1 − P_a)(1 − P_b);  Var(g) = P_a(1 − P_a) + P_b(1 − P_b)
   Across M simulated study people, the INFO-like quality of an untyped SNP (IMPUTE's information measure):
     INFO = 1 − Σ_i Var(g_i) / (2M θ(1 − θ)),  θ = Σ_i D_i / (2M)
   and, because the simulation knows the truth, the squared correlation r² between dosage and true genotype.
   All data are simulated from a seeded generator (mulberry32): reference and study haplotypes are mosaics of
   four ancestral haplotypes with occasional allele changes. */
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

  var L = 18, NFOUNDER = 4, SW = 0.05, MU = 0.005; // SNPs; ancestral haplotypes; switch and allele-change probabilities of the simulation
  function makeFounders(rnd) {
    var F = [];
    for (var f = 0; f < NFOUNDER; f++) { F.push([]); for (var j = 0; j < L; j++) F[f].push(rnd() < 0.45 ? 1 : 0); }
    for (var jj = 0; jj < L; jj++) { // make every SNP polymorphic among founders
      var s = 0; for (var g = 0; g < NFOUNDER; g++) s += F[g][jj];
      if (s === 0) F[Math.floor(rnd() * NFOUNDER)][jj] = 1;
      if (s === NFOUNDER) F[Math.floor(rnd() * NFOUNDER)][jj] = 0;
    }
    return F;
  }
  function mosaic(F, rnd, sw, mu) {
    var h = [], f = Math.floor(rnd() * NFOUNDER);
    for (var j = 0; j < L; j++) {
      if (j > 0 && rnd() < sw) f = Math.floor(rnd() * NFOUNDER);
      var a = F[f][j];
      if (rnd() < mu) a = 1 - a;
      h.push(a);
    }
    return h;
  }

  /* Forward–backward for one haplotype. ref: K×L 0/1, obs: length-L array with 0/1 at typed SNPs and -1 elsewhere. */
  function forwardBackward(ref, obs, rho, eps) {
    var K = ref.length, T = obs.length, t, k;
    var stay = 1 - rho + rho / K, move = rho / K;
    function em(t, k) { return obs[t] < 0 ? 1 : (ref[k][t] === obs[t] ? 1 - eps : eps); }
    var A = [], B = [];
    for (t = 0; t < T; t++) { A.push(new Array(K)); B.push(new Array(K)); }
    var s = 0;
    for (k = 0; k < K; k++) { A[0][k] = em(0, k) / K; s += A[0][k]; }
    for (k = 0; k < K; k++) A[0][k] /= s;
    for (t = 1; t < T; t++) {
      var prevSum = 0; for (k = 0; k < K; k++) prevSum += A[t - 1][k];
      s = 0;
      for (k = 0; k < K; k++) {
        var pr = A[t - 1][k] * stay + (prevSum - A[t - 1][k]) * move;
        A[t][k] = pr * em(t, k); s += A[t][k];
      }
      for (k = 0; k < K; k++) A[t][k] /= s;
    }
    for (k = 0; k < K; k++) B[T - 1][k] = 1;
    for (t = T - 2; t >= 0; t--) {
      var w = new Array(K), wsum = 0;
      for (k = 0; k < K; k++) { w[k] = em(t + 1, k) * B[t + 1][k]; wsum += w[k]; }
      s = 0;
      for (k = 0; k < K; k++) { B[t][k] = w[k] * stay + (wsum - w[k]) * move; s += B[t][k]; }
      for (k = 0; k < K; k++) B[t][k] /= s;
    }
    var G = [], P1 = [];
    for (t = 0; t < T; t++) {
      var g = new Array(K), gs = 0;
      for (k = 0; k < K; k++) { g[k] = A[t][k] * B[t][k]; gs += g[k]; }
      var p1 = 0;
      for (k = 0; k < K; k++) { g[k] /= gs; p1 += g[k] * (ref[k][t] === 1 ? 1 - eps : eps); }
      G.push(g); P1.push(p1);
    }
    return { gamma: G, p1: P1 };
  }

  function typedMask(step) { var m = []; for (var j = 0; j < L; j++) m.push(j % step === 0 || j === L - 1); return m; }
  function observe(h, mask) { return h.map(function (a, j) { return mask[j] ? a : -1; }); }

  /* Simulate M people, impute every haplotype, return per-SNP INFO and true r². */
  function qualityScan(F, ref, mask, rho, eps, M, seed) {
    var rnd = mulberry32(seed), sumD = new Array(L).fill(0), sumV = new Array(L).fill(0);
    var Ds = [], Gs = [];
    for (var i = 0; i < M; i++) {
      var ha = mosaic(F, rnd, SW, MU), hb = mosaic(F, rnd, SW, MU);
      var ra = forwardBackward(ref, observe(ha, mask), rho, eps), rb = forwardBackward(ref, observe(hb, mask), rho, eps);
      var D = [], Gt = [];
      for (var j = 0; j < L; j++) {
        var pa = ra.p1[j], pb = rb.p1[j];
        D.push(pa + pb); Gt.push(ha[j] + hb[j]);
        sumD[j] += pa + pb; sumV[j] += pa * (1 - pa) + pb * (1 - pb);
      }
      Ds.push(D); Gs.push(Gt);
    }
    var info = [], r2 = [];
    for (var jj = 0; jj < L; jj++) {
      var th = sumD[jj] / (2 * M), den = 2 * M * th * (1 - th);
      info.push(den > 1e-12 ? Math.max(0, 1 - sumV[jj] / den) : 1);
      var mx = 0, my = 0, sxx = 0, syy = 0, sxy = 0;
      for (var a = 0; a < M; a++) { mx += Ds[a][jj]; my += Gs[a][jj]; }
      mx /= M; my /= M;
      for (var b = 0; b < M; b++) { var dx = Ds[b][jj] - mx, dy = Gs[b][jj] - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
      r2.push(sxx > 1e-12 && syy > 1e-12 ? sxy * sxy / (sxx * syy) : NaN);
    }
    return { info: info, r2: r2 };
  }

  var api = { mulberry32: mulberry32, makeFounders: makeFounders, mosaic: mosaic, forwardBackward: forwardBackward,
    typedMask: typedMask, observe: observe, qualityScan: qualityScan, L: L, SW: SW, MU: MU };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  /* ---------- user interface ---------- */
  var NS = "http://www.w3.org/2000/svg";
  function S(tag, attrs, parent, text) {
    var n = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k) && attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function H(tag, attrs, parent, html) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
    if (html != null) n.innerHTML = html;
    if (parent) parent.appendChild(n);
    return n;
  }

  var root = document.getElementById("w-imputation");
  if (!root) return;
  var body = root.querySelector(".widget-body");
  if (!body) return;

  var COLORS = ["#4e79a7", "#f28e2b", "#59a14f", "#e15759", "#76b7b2", "#edc948", "#b07aa1", "#9c755f", "#d37295", "#86bcb6", "#a0a0a0", "#8cd17d"];
  var EPS = 0.01, MSCAN = 300;
  var st = { K: 8, step: 2, rho: 0.05, person: 1, truth: false };
  var founders = makeFounders(mulberry32(20211)), refAll = [];
  (function () { var r = mulberry32(5150); for (var k = 0; k < 12; k++) refAll.push(mosaic(founders, r, SW, MU)); })();

  var c1 = H("div", { "class": "controls" }, body);
  var lk = H("label", { "for": "imp-k" }, c1); H("span", null, lk, "Reference haplotypes K");
  var inK = H("input", { type: "range", id: "imp-k", min: 2, max: 12, step: 1, value: st.K }, lk);
  var outK = H("output", { "for": "imp-k" }, lk);
  var ls = H("label", { "for": "imp-step" }, c1); H("span", null, ls, "Array SNPs");
  var selStep = H("select", { id: "imp-step" }, ls);
  [[1, "all 18 (nothing to impute)"], [2, "every 2nd SNP"], [3, "every 3rd SNP"], [4, "every 4th SNP"], [6, "every 6th SNP"]].forEach(function (o) {
    var op = H("option", { value: o[0] }, selStep, o[1]); if (o[0] === st.step) op.selected = true;
  });
  var c2 = H("div", { "class": "controls" }, body);
  var lr = H("label", { "for": "imp-rho" }, c2); H("span", null, lr, "Switch probability ρ");
  var inR = H("input", { type: "range", id: "imp-rho", min: 0, max: 100, step: 1, value: 50 }, lr);
  var outR = H("output", { "for": "imp-rho" }, lr);
  var bNew = H("button", { type: "button", "class": "btn" }, c2, "New study person");
  var lt = H("label", { "for": "imp-truth" }, c2);
  var cbT = H("input", { type: "checkbox", id: "imp-truth" }, lt); H("span", null, lt, "Show true genotypes");

  var chart = H("div", { "class": "imp-chart" }, body);
  var readout = H("div", { "class": "readout", "aria-live": "polite" }, body);
  H("p", { "class": "note" }, body, "Simulated data. A simplified Li–Stephens model: the person’s two haplotypes are taken as already phased, and ρ and the copying-error rate (ε = 0.01) are constants. Real imputation software (IMPUTE5, Beagle 5, Minimac4) estimates phase, uses genetic-map distances for ρ and handles panels of tens of thousands of haplotypes.");

  function rhoFromSlider(v) { return Math.pow(10, -3 + 3 * v / 100); } // 0.001 … 1
  function sliderFromRho(r) { return Math.round(100 * (Math.log10(r) + 3) / 3); }
  inR.value = sliderFromRho(st.rho);

  var cache = { key: "", scan: null };
  var raf = 0;
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }

  function draw() {
    var K = st.K, ref = refAll.slice(0, K), mask = typedMask(st.step);
    outK.textContent = String(K);
    outR.textContent = st.rho < 0.01 ? st.rho.toFixed(3) : st.rho.toFixed(2);
    var pr = mulberry32(1000 + st.person);
    var ha = mosaic(founders, pr, SW, MU), hb = mosaic(founders, pr, SW, MU);
    var ra = forwardBackward(ref, observe(ha, mask), st.rho, EPS), rb = forwardBackward(ref, observe(hb, mask), st.rho, EPS);
    var key = K + "|" + st.step + "|" + st.rho;
    if (cache.key !== key) { cache.key = key; cache.scan = qualityScan(founders, ref, mask, st.rho, EPS, MSCAN, 777); }
    var scan = cache.scan;

    var W = Math.max(300, Math.floor(chart.clientWidth || body.clientWidth || 640));
    var lab = W < 480 ? 50 : 82, right = 6;
    var cw = (W - lab - right) / L, rh = W < 480 ? 15 : 17;
    var showNum = cw >= 15, showProb = cw >= 30;
    var y = 0;
    chart.innerHTML = "";
    var Ht = 16 + 14 + K * rh + 14 + 16 + 2 * (rh + 2 + 22 + 6) + 6 + 26 + 16 + 64 + 30;
    var svg = S("svg", { width: W, height: Ht, viewBox: "0 0 " + W + " " + Ht, role: "img",
      "aria-label": "Reference panel of " + K + " haplotypes at 18 SNPs, a study person's two haplotypes with imputed allele probabilities, copying probabilities, dosages and per-SNP imputation quality." }, chart);
    function cx(j) { return lab + j * cw; }
    // header: SNP numbers and array markers
    y = 12;
    S("text", { x: 2, y: y, "class": "t-xs" }, svg, "SNP");
    for (var j = 0; j < L; j++) {
      if (showNum || j % 2 === 0) S("text", { x: cx(j) + cw / 2, y: y, "text-anchor": "middle", "class": "t-xs" }, svg, String(j + 1));
    }
    y += 4;
    S("text", { x: 2, y: y + 10, "class": "t-xs" }, svg, "on array");
    for (var j2 = 0; j2 < L; j2++) {
      if (mask[j2]) S("path", { d: "M" + (cx(j2) + cw / 2 - 4) + " " + (y + 9) + "l4 -7l4 7z", fill: "#1d2127" }, svg);
    }
    y += 16;
    // reference panel
    S("text", { x: 2, y: y - 3, "class": "t-xs" }, svg, "");
    for (var k = 0; k < K; k++) {
      var yy = y + k * rh;
      S("rect", { x: 2, y: yy + 3, width: 9, height: rh - 6, fill: COLORS[k], rx: 2 }, svg);
      S("text", { x: 14, y: yy + rh - 4, "class": "t-xs" }, svg, (W < 480 ? "" : "ref ") + (k + 1));
      for (var t = 0; t < L; t++) {
        var a = ref[k][t];
        S("rect", { x: cx(t) + 0.5, y: yy + 0.5, width: cw - 1, height: rh - 1, fill: a ? "#1f5a96" : "#eef3f8", stroke: mask[t] ? "none" : "none" }, svg);
        if (showNum) S("text", { x: cx(t) + cw / 2, y: yy + rh - 4, "text-anchor": "middle", "class": "t-xs", style: "fill:" + (a ? "#fff" : "#5a6370") }, svg, String(a));
      }
    }
    y += K * rh + 14;
    S("text", { x: 2, y: y, "class": "t-b", style: "font-size:12px" }, svg, "Study person (only array SNPs measured)");
    y += 8;
    [[ha, ra, "hap a"], [hb, rb, "hap b"]].forEach(function (row) {
      var h = row[0], res = row[1];
      S("text", { x: 2, y: y + rh - 4, "class": "t-xs" }, svg, row[2]);
      for (var t = 0; t < L; t++) {
        var x = cx(t);
        if (mask[t]) {
          S("rect", { x: x + 0.5, y: y + 0.5, width: cw - 1, height: rh - 1, fill: h[t] ? "#1f5a96" : "#eef3f8", stroke: "#1d2127", "stroke-width": 1.2 }, svg);
          if (showNum) S("text", { x: x + cw / 2, y: y + rh - 4, "text-anchor": "middle", "class": "t-xs", style: "fill:" + (h[t] ? "#fff" : "#1d2127") + ";font-weight:700" }, svg, String(h[t]));
        } else {
          var p = res.p1[t];
          var shade = Math.round(238 - p * (238 - 31)), g2 = Math.round(243 - p * (243 - 90)), b2 = Math.round(248 - p * (248 - 150));
          S("rect", { x: x + 0.5, y: y + 0.5, width: cw - 1, height: rh - 1, fill: "rgb(" + shade + "," + g2 + "," + b2 + ")", stroke: "#b9c1cc", "stroke-dasharray": "2 2" }, svg);
          if (showProb) S("text", { x: x + cw / 2, y: y + rh - 4, "text-anchor": "middle", "class": "t-xs", style: "fill:" + (p > 0.55 ? "#fff" : "#1d2127") }, svg, p.toFixed(2).replace(/^0/, ""));
          if (st.truth) S("circle", { cx: x + cw - 3.5, cy: y + 3.5, r: 2.4, fill: h[t] ? "#1d2127" : "#fff", stroke: "#1d2127", "stroke-width": 0.8 }, svg);
        }
      }
      y += rh + 2;
      // copying probabilities: stacked bars
      for (var t2 = 0; t2 < L; t2++) {
        var acc = 0;
        for (var kk = 0; kk < K; kk++) {
          var gk = res.gamma[t2][kk];
          if (gk < 0.004) { acc += gk; continue; }
          S("rect", { x: cx(t2) + 0.5, y: y + 22 * acc, width: cw - 1, height: 22 * gk, fill: COLORS[kk] }, svg);
          acc += gk;
        }
      }
      S("text", { x: 2, y: y + 15, "class": "t-xs" }, svg, W < 480 ? "copies" : "copies ref…");
      y += 22 + 6;
    });
    // dosage row
    y += 6;
    S("text", { x: 2, y: y + 15, "class": "t-xs" }, svg, "dosage");
    var nWrong = 0, nUntyped = 0;
    for (var t3 = 0; t3 < L; t3++) {
      var d = ra.p1[t3] + rb.p1[t3], gTrue = ha[t3] + hb[t3];
      var x3 = cx(t3);
      if (mask[t3]) {
        S("text", { x: x3 + cw / 2, y: y + 15, "text-anchor": "middle", "class": "t-xs", style: "font-weight:700;fill:#1d2127" }, svg, String(gTrue));
      } else {
        nUntyped++;
        if (Math.round(d) !== gTrue) nWrong++;
        var txt = cw >= 26 ? d.toFixed(2) : d.toFixed(1);
        if (cw < 19) txt = String(Math.round(d * 10) / 10).replace(/^0\./, ".");
        S("rect", { x: x3 + 1, y: y + 2, width: cw - 2, height: 18, fill: "#f6f7f9", stroke: "#d9dee5", rx: 3 }, svg);
        S("text", { x: x3 + cw / 2, y: y + 15, "text-anchor": "middle", "class": "t-xs", style: "fill:#1d2127" }, svg, txt);
        if (st.truth) S("text", { x: x3 + cw / 2, y: y + 33, "text-anchor": "middle", "class": "t-xs", style: "fill:" + (Math.round(d) === gTrue ? "#1d7a4c" : "#b42318") + ";font-weight:700" }, svg, String(gTrue));
      }
    }
    if (st.truth) S("text", { x: 2, y: y + 33, "class": "t-xs" }, svg, "true g");
    y += 26 + 16;
    // quality bars per SNP across simulated people
    var bh = 56;
    S("text", { x: 2, y: y + 12, "class": "t-xs" }, svg, W < 480 ? "quality" : "INFO / r²");
    S("text", { x: 2, y: y + 24, "class": "t-xs" }, svg, "(" + MSCAN + " people)");
    S("line", { x1: lab, x2: lab + L * cw, y1: y + bh, y2: y + bh, stroke: "#b9c1cc" }, svg);
    S("line", { x1: lab, x2: lab + L * cw, y1: y, y2: y, stroke: "#e3e7ec", "stroke-dasharray": "3 3" }, svg);
    for (var t4 = 0; t4 < L; t4++) {
      if (mask[t4]) continue;
      var inf = scan.info[t4], rr = scan.r2[t4], x4 = cx(t4);
      S("rect", { x: x4 + cw * 0.18, y: y + bh * (1 - inf), width: cw * 0.64, height: bh * inf, fill: inf < 0.7 ? "#e15759" : "#59a14f", opacity: 0.85 }, svg);
      if (isFinite(rr)) S("circle", { cx: x4 + cw / 2, cy: y + bh * (1 - rr), r: 3, fill: "#fff", stroke: "#1d2127", "stroke-width": 1.4 }, svg);
    }
    S("text", { x: lab + L * cw, y: y + bh + 14, "text-anchor": "end", "class": "t-xs" }, svg, "bars: INFO (red if < 0.7) · circles: true r²");

    var mInfo = 0, mR2 = 0, nU = 0;
    for (var t5 = 0; t5 < L; t5++) if (!mask[t5]) { mInfo += scan.info[t5]; if (isFinite(scan.r2[t5])) mR2 += scan.r2[t5]; nU++; }
    readout.innerHTML = nU === 0 ?
      "<div>Every SNP is on the array: nothing to impute.</div>" :
      "<div>Untyped SNPs: " + nU + " of " + L + ". This person: best-guess genotype (dosage rounded) " + (st.truth ? "wrong at " + nWrong + " of " + nUntyped + " untyped SNPs." : "tick “Show true genotypes” to check it.") + "</div>" +
      "<div>Across " + MSCAN + " simulated people: mean INFO " + (mInfo / nU).toFixed(2) + ", mean true r² " + (mR2 / nU).toFixed(2) + ".</div>";
  }

  inK.addEventListener("input", function () { st.K = +inK.value; schedule(); });
  selStep.addEventListener("change", function () { st.step = +selStep.value; schedule(); });
  inR.addEventListener("input", function () { st.rho = rhoFromSlider(+inR.value); schedule(); });
  bNew.addEventListener("click", function () { st.person++; schedule(); });
  cbT.addEventListener("change", function () { st.truth = cbT.checked; schedule(); });
  var lastW = 0;
  function onResize() { var w = chart.clientWidth; if (w !== lastW) { lastW = w; schedule(); } }
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(onResize).observe(chart);
  else window.addEventListener("resize", onResize);
  draw();
})();
