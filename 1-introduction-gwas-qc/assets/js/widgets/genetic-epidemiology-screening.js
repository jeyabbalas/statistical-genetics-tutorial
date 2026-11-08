/* Risk-stratified breast cancer screening (genetic-epidemiology.html, #w-screening).
   Simulates a cohort of 20,000 women. Each woman i has three independent risk components:
       a polygenic risk score zP ~ N(0, 1), with log relative risk sP * zP, sP = ln(1.61) = 0.476
         (odds ratio 1.61 per standard deviation for the 313-SNP score; Mavaddat et al. 2019);
       other risk factors (questionnaire answers, mammographic density) zO ~ N(0, 1), log relative risk sO * zO,
         sO = 0.275 chosen so that the full model reproduces the spread reported by Lee et al. 2019
         (1st percentile about 2.8%, 99th about 30.6%; this choice is an assumption of the simulation);
       a pathogenic BRCA1/BRCA2 variant with probability 1/400 (NCI), log relative risk lnRRc chosen so that
         a carrier's average lifetime risk is about 70% (Kuchenbaecker et al. 2017).
   True lifetime risk to age 80 under proportional hazards (competing risks ignored):
       r = 1 - exp(-L * exp(eta)),  eta = sP zP + sO zO + lnRRc * carrier,
   with L set so that the average risk is 11% (the "population" line of Lee et al. 2019, slide 20).
   Each woman's future diagnosis is simulated as a Bernoulli(r) draw.
   A screening program sees only some components. Its predicted risk is the conditional expectation
       rhat = E[ 1 - exp(-L exp(eta)) | known components ],
   averaging over the unknown components numerically (normal quadrature on a 61-point grid; carrier status by its
   prior 1/400 when not tested). Women with rhat >= threshold are offered extra screening.
   Readouts: share of women offered extra screening, and share of the simulated future cases among them. */
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
  function normalGen(rand) {
    var spare = null;
    return function () {
      if (spare !== null) { var s = spare; spare = null; return s; }
      var u = 0;
      while (u <= 1e-300) u = rand();
      var v = rand(), r = Math.sqrt(-2 * Math.log(u)), th = 2 * Math.PI * v;
      spare = r * Math.sin(th);
      return r * Math.cos(th);
    };
  }

  var SP = Math.log(1.61), SO = 0.275, PCARRIER = 1 / 400, MEANRISK = 0.11, CARRIER_RISK = 0.70, N = 20000;

  /* Normal quadrature grid: nodes z_k on [-6, 6], weights proportional to the N(0,1) density, summing to 1. */
  var GRID = (function () {
    var K = 61, z = [], w = [], s = 0;
    for (var k = 0; k < K; k++) { var zz = -6 + 12 * k / (K - 1); z.push(zz); var ww = Math.exp(-0.5 * zz * zz); w.push(ww); s += ww; }
    for (k = 0; k < K; k++) w[k] /= s;
    return { z: z, w: w };
  })();

  /* E[1 - exp(-L exp(m + s Z))], Z ~ N(0, 1) */
  function expRisk(L, m, s) {
    if (s === 0) return 1 - Math.exp(-L * Math.exp(m));
    var acc = 0;
    for (var k = 0; k < GRID.z.length; k++) acc += GRID.w[k] * (1 - Math.exp(-L * Math.exp(m + s * GRID.z[k])));
    return acc;
  }

  /* Solve for the baseline cumulative hazard L and the carrier log relative risk. */
  function calibrate() {
    var sAll = Math.sqrt(SP * SP + SO * SO), L = 0.1, lnc = 2.4;
    for (var it = 0; it < 6; it++) {
      // carrier log RR so that the carriers' mean risk is CARRIER_RISK given L
      var lo = 0, hi = 6;
      for (var j = 0; j < 60; j++) { var mid = (lo + hi) / 2; if (expRisk(L, mid, sAll) < CARRIER_RISK) lo = mid; else hi = mid; }
      lnc = (lo + hi) / 2;
      // L so that the population mean risk is MEANRISK
      var a = 1e-4, b = 2;
      for (j = 0; j < 60; j++) {
        var m2 = (a + b) / 2;
        var mean = (1 - PCARRIER) * expRisk(m2, 0, sAll) + PCARRIER * expRisk(m2, lnc, sAll);
        if (mean < MEANRISK) a = m2; else b = m2;
      }
      L = (a + b) / 2;
    }
    return { L: L, lnc: lnc };
  }
  var CAL = calibrate();

  function simulate(seed) {
    var rand = mulberry32(seed), rn = normalGen(rand);
    var zp = new Float64Array(N), zo = new Float64Array(N), car = new Uint8Array(N), risk = new Float64Array(N), cas = new Uint8Array(N);
    for (var i = 0; i < N; i++) {
      zp[i] = rn(); zo[i] = rn(); car[i] = rand() < PCARRIER ? 1 : 0;
      var eta = SP * zp[i] + SO * zo[i] + CAL.lnc * car[i];
      risk[i] = 1 - Math.exp(-CAL.L * Math.exp(eta));
      cas[i] = rand() < risk[i] ? 1 : 0;
    }
    return { zp: zp, zo: zo, car: car, risk: risk, cas: cas };
  }

  /* Predicted risk for an information set: info = {prs, other, brca} booleans. */
  function predict(sim, info) {
    var sUnknown = Math.sqrt((info.prs ? 0 : SP * SP) + (info.other ? 0 : SO * SO));
    var out = new Float64Array(N);
    var cache = {};
    for (var i = 0; i < N; i++) {
      var m = (info.prs ? SP * sim.zp[i] : 0) + (info.other ? SO * sim.zo[i] : 0);
      var key = info.prs || info.other ? null : (info.brca ? "c" + sim.car[i] : "x");
      if (key !== null && cache[key] !== undefined) { out[i] = cache[key]; continue; }
      var r;
      if (info.brca) r = expRisk(CAL.L, m + CAL.lnc * sim.car[i], sUnknown);
      else r = (1 - PCARRIER) * expRisk(CAL.L, m, sUnknown) + PCARRIER * expRisk(CAL.L, m + CAL.lnc, sUnknown);
      out[i] = r;
      if (key !== null) cache[key] = r;
    }
    return out;
  }

  function summarize(sim, pred, t) {
    var nOff = 0, casesOff = 0, casesAll = 0;
    for (var i = 0; i < N; i++) {
      casesAll += sim.cas[i];
      if (pred[i] >= t) { nOff++; casesOff += sim.cas[i]; }
    }
    return {
      nOff: nOff, fracOff: nOff / N, casesOff: casesOff, casesAll: casesAll,
      fracCases: casesAll ? casesOff / casesAll : 0,
      rateOff: nOff ? 1000 * casesOff / nOff : NaN,
      rateRest: N - nOff ? 1000 * (casesAll - casesOff) / (N - nOff) : NaN
    };
  }

  function quantiles(arr) {
    var a = Array.prototype.slice.call(arr).sort(function (x, y) { return x - y; });
    return function (f) { return a[Math.min(a.length - 1, Math.max(0, Math.floor(f * a.length)))]; };
  }

  var core = { CAL: CAL, SP: SP, SO: SO, N: N, simulate: simulate, predict: predict, summarize: summarize, quantiles: quantiles, expRisk: expRisk };
  if (typeof module !== "undefined" && module.exports) { module.exports = core; }
  if (typeof document === "undefined") return;

  /* ------------------------------------------------------------------ UI */
  var root = document.getElementById("w-screening");
  if (!root) return;
  var body = root.querySelector(".widget-body");
  var NS = "http://www.w3.org/2000/svg";
  var SETS = {
    none: { prs: false, other: false, label: "No personal information (everyone gets the average)" },
    other: { prs: false, other: true, label: "Questionnaire risk factors and breast density" },
    prs: { prs: true, other: false, label: "Polygenic risk score only" },
    all: { prs: true, other: true, label: "Polygenic score + questionnaire + density" }
  };
  var COLORS = { none: "#8a93a0", other: "var(--q3)", prs: "var(--q1)", all: "var(--q4)" };
  var state = { set: "all", brca: false, t: 0.17, seed: 20190115 };
  var sim = null, preds = {};

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, s, cls, anchor) {
    var t = el("text", { x: x, y: y, "class": cls || "t-sm" }, parent);
    if (anchor) t.setAttribute("text-anchor", anchor);
    t.textContent = s;
    return t;
  }
  function pct(v, d) { return isFinite(v) ? (100 * v).toFixed(d === undefined ? 1 : d) + "%" : "—"; }
  function num(v) { return Math.round(v).toLocaleString("en-US"); }

  var radios = "";
  Object.keys(SETS).forEach(function (k) {
    radios += '<label class="sc-radio"><input type="radio" name="sc-set" value="' + k + '"' + (k === state.set ? " checked" : "") + '><span class="sc-sw" style="background:' + COLORS[k] + '"></span>' + SETS[k].label + "</label>";
  });
  body.innerHTML =
    '<p class="note"><span class="illustrative">Simulated</span> 20,000 simulated women aged 20 with an average lifetime (to age 80) breast cancer risk of 11%. Their true risks and future diagnoses are simulated; a screening program sees only the information you choose.</p>' +
    '<fieldset class="sc-sets"><legend>What the program knows about each woman</legend>' + radios +
    '<label class="sc-check"><input type="checkbox" id="sc-brca"> also a BRCA1/BRCA2 test result (1 in 400 women carry a pathogenic variant)</label></fieldset>' +
    '<div class="controls"><label class="sc-thr"><span>Offer extra screening if predicted lifetime risk ≥ <output id="sc-t-out"></output></span><input type="range" id="sc-t" min="0.05" max="0.40" step="0.01" value="0.17" aria-label="Risk threshold for extra screening"></label>' +
    '<button type="button" class="btn" id="sc-new">New cohort</button></div>' +
    '<svg id="sc-svg" viewBox="0 0 440 300" role="img" aria-label="Predicted lifetime breast cancer risk of every simulated woman, sorted from lowest to highest, for each information set, with the screening threshold and the NICE risk bands"></svg>' +
    '<div class="readout sc-readout" id="sc-readout" aria-live="polite"></div>';

  function ensurePreds() {
    var k;
    for (k in SETS) {
      var key = k + (state.brca ? "+b" : "");
      if (!preds[key]) preds[key] = predict(sim, { prs: SETS[k].prs, other: SETS[k].other, brca: state.brca });
    }
  }

  function draw() {
    var svg = body.querySelector("#sc-svg");
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    // Match the drawing width to the rendered width (300-620) so text keeps its nominal size.
    var W = svg.getBoundingClientRect().width;
    if (!W || !isFinite(W)) W = 620;
    W = Math.round(Math.max(300, Math.min(620, W)));
    var H = W < 400 ? 290 : 330;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    var L = 44, R = W - 18, T = 12, B = H - 50, YMAX = 0.8;
    var sx = function (f) { return L + f * (R - L); };
    var sy = function (r) { return B - Math.min(r, YMAX) / YMAX * (B - T); };
    // NICE bands
    el("rect", { x: L, y: sy(0.17), width: R - L, height: sy(0) - sy(0.17), fill: "#fdeef0" }, svg);
    el("rect", { x: L, y: sy(0.30), width: R - L, height: sy(0.17) - sy(0.30), fill: "#fff6d6" }, svg);
    el("rect", { x: L, y: T, width: R - L, height: sy(0.30) - T, fill: "#e9f2fb" }, svg);
    // Band labels sit where the curves do not pass: bottom right, middle of the moderate band, top right.
    txt(svg, R - 4, sy(0) - 5, "near-population risk (< 17%)", "t-xs sc-lab", "end");
    txt(svg, sx(0.56), sy(0.30) + 13, "moderate (17–30%)", "t-xs sc-lab", "middle");
    txt(svg, R - 4, T + 13, "high (≥ 30%)", "t-xs sc-lab", "end");
    el("rect", { x: L, y: T, width: R - L, height: B - T, fill: "none", stroke: "#d9dee5" }, svg);
    [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8].forEach(function (v) {
      el("line", { x1: L - 4, x2: L, y1: sy(v), y2: sy(v), stroke: "#8a93a0" }, svg);
      txt(svg, L - 7, sy(v) + 3, Math.round(100 * v) + "%", "t-xs", "end");
    });
    [0, 0.2, 0.4, 0.6, 0.8, 1].forEach(function (f) {
      el("line", { x1: sx(f), x2: sx(f), y1: B, y2: B + 4, stroke: "#8a93a0" }, svg);
      txt(svg, sx(f), B + 15, Math.round(100 * f) + "%", "t-xs", "middle");
    });
    txt(svg, (L + R) / 2, B + 32, "Women sorted by predicted risk (cumulative %)", "t-sm", "middle");
    var yl = txt(svg, 11, (T + B) / 2, "Predicted lifetime risk", "t-sm", "middle");
    yl.setAttribute("transform", "rotate(-90 11 " + ((T + B) / 2) + ")");
    // curves: other sets faint, chosen set bold
    var order = Object.keys(SETS).filter(function (k) { return k !== state.set; }).concat([state.set]);
    order.forEach(function (k) {
      var arr = preds[k + (state.brca ? "+b" : "")];
      var q = quantiles(arr), d = "";
      for (var j = 0; j <= 200; j++) {
        var f = Math.min(0.9999, Math.max(0.0001, j / 200));
        d += (j ? "L" : "M") + sx(f).toFixed(1) + "," + sy(q(f)).toFixed(1);
      }
      el("path", { d: d, fill: "none", stroke: COLORS[k], "stroke-width": k === state.set ? 3 : 1.4, "stroke-opacity": k === state.set ? 1 : 0.55 }, svg);
    });
    // threshold
    el("line", { x1: L, x2: R, y1: sy(state.t), y2: sy(state.t), stroke: "#1d2127", "stroke-width": 1.4, "stroke-dasharray": "6 4" }, svg);
    txt(svg, L + 6, sy(state.t) - 5, "threshold " + Math.round(100 * state.t) + "%", "t-xs sc-lab");
  }

  function render() {
    body.querySelector("#sc-t-out").textContent = Math.round(100 * state.t) + "%";
    ensurePreds();
    draw();
    var html = '<table class="sc-tab stack"><thead><tr><th scope="col">Information used</th><th scope="col" class="num">Women offered extra screening</th><th scope="col" class="num">Share of future cases among them</th><th scope="col" class="num">Cases per 1,000 women: offered / not offered</th></tr></thead><tbody>';
    Object.keys(SETS).forEach(function (k) {
      var s = summarize(sim, preds[k + (state.brca ? "+b" : "")], state.t);
      html += '<tr' + (k === state.set ? ' class="sc-on"' : "") + '><td><span class="sc-sw" style="background:' + COLORS[k] + '"></span>' + SETS[k].label + (state.brca ? " + BRCA test" : "") +
        '</td><td class="num" data-label="Women offered extra screening">' + pct(s.fracOff) + " (" + num(s.nOff) + ')</td><td class="num" data-label="Share of future cases among them">' + pct(s.fracCases) +
        '</td><td class="num" data-label="Cases per 1,000 women: offered / not offered">' + (isFinite(s.rateOff) ? Math.round(s.rateOff) : "—") + " / " + (isFinite(s.rateRest) ? Math.round(s.rateRest) : "—") + "</td></tr>";
    });
    var all = summarize(sim, preds["none" + (state.brca ? "+b" : "")], 2);
    html += "</tbody></table><p class=\"note\">" + num(all.casesAll) + " of the 20,000 simulated women (" + pct(all.casesAll / N) + ") develop breast cancer by age 80 in this cohort.</p>";
    body.querySelector("#sc-readout").innerHTML = html;
  }

  function newCohort() { sim = simulate(state.seed); preds = {}; render(); }
  Array.prototype.forEach.call(body.querySelectorAll('input[name="sc-set"]'), function (r) {
    r.addEventListener("change", function () { if (r.checked) { state.set = r.value; render(); } });
  });
  body.querySelector("#sc-brca").addEventListener("change", function (e) { state.brca = e.target.checked; render(); });
  body.querySelector("#sc-t").addEventListener("input", function (e) { state.t = parseFloat(e.target.value); render(); });
  body.querySelector("#sc-new").addEventListener("click", function () { state.seed = (state.seed * 1664525 + 1013904223) >>> 0; newCohort(); });
  var lastW = 0, rt = null;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      var w = Math.round(body.querySelector("#sc-svg").getBoundingClientRect().width);
      if (Math.abs(w - lastW) > 4) { lastW = w; draw(); }
    }, 150);
  });
  newCohort();
  lastW = Math.round(body.querySelector("#sc-svg").getBoundingClientRect().width);
})();
