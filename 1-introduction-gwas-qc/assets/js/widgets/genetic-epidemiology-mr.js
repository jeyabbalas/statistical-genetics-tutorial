/* Mendelian randomization simulator (genetic-epidemiology.html, #w-mr).
   Simulates n people with a genotype G (0, 1 or 2 copies of the instrument allele, frequency 0.3),
   an unmeasured confounder U, an exposure X and an outcome Y:
       U ~ N(0, 1)
       X = gamma * G + c * U + eX,          eX ~ N(0, 1)
       Y = beta * X + c * U + alpha * G + eY, eY ~ N(0, 1)
   beta is the true causal effect of X on Y, c the strength of confounding, gamma the per-allele effect
   of G on X (instrument strength) and alpha a direct effect of G on Y (horizontal pleiotropy).
   Estimates, each from ordinary least squares with one predictor:
       bGX = Cov(G, X) / Var(G), SE = sqrt( RSS / (n - 2) / (n Var(G)) )   (first stage)
       bGY = Cov(G, Y) / Var(G), same SE formula                          (reduced form)
       bOLS = Cov(X, Y) / Var(X)                                          (naive observational slope)
       Wald ratio bIV = bGY / bGX, SE(bIV) ~ SE(bGY) / |bGX|              (first-order delta method)
       F = (bGX / SE(bGX))^2                                              (first-stage F, one instrument)
   Large-sample limits: bOLS -> beta + (c^2 + alpha gamma Var(G)) / Var(X); bIV -> beta + alpha / gamma.
   Data are simulated from a seeded generator (mulberry32), so the first view is the same for everyone. */
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
      var u = 0, v = 0;
      while (u <= 1e-300) u = rand();
      v = rand();
      var r = Math.sqrt(-2 * Math.log(u)), th = 2 * Math.PI * v;
      spare = r * Math.sin(th);
      return r * Math.cos(th);
    };
  }

  var P_ALLELE = 0.3;

  function simulate(p, seed) {
    var rand = mulberry32(seed), rn = normalGen(rand), n = p.n;
    var G = new Float64Array(n), X = new Float64Array(n), Y = new Float64Array(n);
    for (var i = 0; i < n; i++) {
      var g = (rand() < P_ALLELE ? 1 : 0) + (rand() < P_ALLELE ? 1 : 0);
      var u = rn();
      var x = p.gamma * g + p.c * u + rn();
      var y = p.beta * x + p.c * u + p.alpha * g + rn();
      G[i] = g; X[i] = x; Y[i] = y;
    }
    return { G: G, X: X, Y: Y, n: n };
  }

  /* Simple linear regression of y on x: slope, its standard error, intercept, means. */
  function regress(x, y) {
    var n = x.length, mx = 0, my = 0, i;
    for (i = 0; i < n; i++) { mx += x[i]; my += y[i]; }
    mx /= n; my /= n;
    var sxx = 0, sxy = 0, syy = 0;
    for (i = 0; i < n; i++) {
      var dx = x[i] - mx, dy = y[i] - my;
      sxx += dx * dx; sxy += dx * dy; syy += dy * dy;
    }
    var b = sxy / sxx;
    var rss = Math.max(syy - b * sxy, 0);
    var se = Math.sqrt(rss / (n - 2) / sxx);
    return { b: b, se: se, a: my - b * mx, mx: mx, my: my, r2: sxx > 0 && syy > 0 ? (sxy * sxy) / (sxx * syy) : 0 };
  }

  function analyze(sim) {
    var gx = regress(sim.G, sim.X), gy = regress(sim.G, sim.Y), xy = regress(sim.X, sim.Y);
    var iv = gy.b / gx.b, ivse = gy.se / Math.abs(gx.b);
    return { gx: gx, gy: gy, ols: xy, iv: iv, ivse: ivse, F: Math.pow(gx.b / gx.se, 2), r2gx: gx.r2 };
  }

  function theory(p) {
    var vg = 2 * P_ALLELE * (1 - P_ALLELE);
    var vx = p.gamma * p.gamma * vg + p.c * p.c + 1;
    return {
      ols: p.beta + (p.c * p.c + p.alpha * p.gamma * vg) / vx,
      iv: p.gamma !== 0 ? p.beta + p.alpha / p.gamma : NaN,
      F: p.n * (p.gamma * p.gamma * vg) / vx,
      r2: (p.gamma * p.gamma * vg) / vx
    };
  }

  function replicate(p, seed, R) {
    var ols = new Float64Array(R), iv = new Float64Array(R), cover = 0, coverOls = 0;
    for (var r = 0; r < R; r++) {
      var a = analyze(simulate(p, (seed + 7919 * (r + 1)) >>> 0));
      ols[r] = a.ols.b; iv[r] = a.iv;
      if (Math.abs(a.iv - p.beta) <= 1.96 * a.ivse) cover++;
      if (Math.abs(a.ols.b - p.beta) <= 1.96 * a.ols.se) coverOls++;
    }
    return { ols: ols, iv: iv, cover: cover / R, coverOls: coverOls / R };
  }

  function median(arr) {
    var a = Array.prototype.slice.call(arr).sort(function (x, y) { return x - y; });
    var m = a.length >> 1;
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }

  var core = { mulberry32: mulberry32, simulate: simulate, regress: regress, analyze: analyze, theory: theory, replicate: replicate, median: median };
  if (typeof module !== "undefined" && module.exports) { module.exports = core; }
  if (typeof document === "undefined") return;

  /* ------------------------------------------------------------------ UI */
  var root = document.getElementById("w-mr");
  if (!root) return;
  var body = root.querySelector(".widget-body");
  var NS = "http://www.w3.org/2000/svg";
  var DEF = { beta: 0, c: 1, gamma: 0.25, alpha: 0, n: 5000 };
  var state = { beta: DEF.beta, c: DEF.c, gamma: DEF.gamma, alpha: DEF.alpha, n: DEF.n, seed: 20260909 };
  var reps = null;

  function fmt(v, d) {
    if (!isFinite(v)) return "—";
    var s = v.toFixed(d === undefined ? 3 : d);
    if (/^-0\.0*$/.test(s)) s = s.slice(1);
    return s.replace("-", "−");
  }
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
  function fitWidth(svg, max) {
    var w = svg.getBoundingClientRect().width;
    if (!w || !isFinite(w)) w = max;
    return Math.round(Math.max(300, Math.min(max, w)));
  }

  body.innerHTML =
    '<p class="note"><span class="illustrative">Simulated</span> One sample of people with a genotype G, an unmeasured confounder U, an exposure X and an outcome Y (both in arbitrary units). Move a slider and the data are simulated again with the same seed.</p>' +
    '<div class="mr-grid">' +
      '<div class="mr-controls">' +
        '<label class="mr-slider"><span>True effect of X on Y, β = <output id="mr-o-beta"></output></span><input type="range" id="mr-beta" min="-0.5" max="0.5" step="0.05" aria-describedby="mr-o-beta"></label>' +
        '<label class="mr-slider"><span>Confounding by U, c = <output id="mr-o-c"></output></span><input type="range" id="mr-c" min="0" max="1.5" step="0.1"></label>' +
        '<label class="mr-slider"><span>Instrument strength, γ (change in X per allele) = <output id="mr-o-gamma"></output></span><input type="range" id="mr-gamma" min="0" max="0.5" step="0.01"></label>' +
        '<label class="mr-slider"><span>Direct effect of G on Y (pleiotropy), α = <output id="mr-o-alpha"></output></span><input type="range" id="mr-alpha" min="-0.2" max="0.2" step="0.01"></label>' +
        '<label class="mr-select"><span>People, n</span><select id="mr-n"><option>500</option><option>1000</option><option>2000</option><option>5000</option><option>10000</option><option>20000</option></select></label>' +
        '<div class="controls mr-buttons"><button type="button" class="btn" id="mr-new">New sample</button><button type="button" class="btn primary" id="mr-rep">Repeat 200 times</button><button type="button" class="btn" id="mr-reset">Reset</button></div>' +
        '<div class="mr-presets"><span class="note">Presets:</span> <button type="button" class="btn mr-pre" data-pre="hdl">No causal effect, strong confounding</button> <button type="button" class="btn mr-pre" data-pre="weak">Weak instrument</button> <button type="button" class="btn mr-pre" data-pre="pleio">Pleiotropy</button></div>' +
      '</div>' +
      '<div class="mr-plot"><svg id="mr-svg" viewBox="0 0 420 330" role="img" aria-label="Scatter plot of simulated exposure X against outcome Y, colored by genotype, with the observational regression line and the instrumental-variable line through the three genotype-group means"></svg>' +
        '<div class="mr-legend" aria-hidden="true"><span><i style="background:var(--g0);border:1px solid #9fb3c8"></i>G = 0</span><span><i style="background:var(--g1)"></i>G = 1</span><span><i style="background:var(--g2)"></i>G = 2</span><span><b class="ln ols"></b>naive slope of Y on X</span><span><b class="ln iv"></b>Wald ratio line through group means</span><span><i class="mr-mean"></i>mean of each genotype group</span></div>' +
      '</div>' +
    '</div>' +
    '<div class="readout mr-readout" id="mr-readout" aria-live="polite"></div>' +
    '<div class="mr-reps" id="mr-reps" hidden><svg id="mr-hist" viewBox="0 0 420 210" role="img" aria-label="Histograms of the naive estimate and the Wald ratio across 200 simulated studies"></svg><div class="readout" id="mr-reps-out"></div></div>';

  var ids = ["beta", "c", "gamma", "alpha"];
  var inputs = {};
  ids.forEach(function (k) { inputs[k] = body.querySelector("#mr-" + k); inputs[k].value = state[k]; });
  var nSel = body.querySelector("#mr-n");
  nSel.value = String(state.n);

  function syncOutputs() {
    ids.forEach(function (k) { body.querySelector("#mr-o-" + k).textContent = fmt(state[k], 2); });
  }

  function drawScatter(sim, a) {
    var svg = body.querySelector("#mr-svg");
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    // Match the drawing width to the rendered width (300-420) so text keeps its nominal size on phones.
    var W = fitWidth(svg, 420), H = W < 400 ? 300 : 330;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    var L = 46, R = W - 10, T = 12, B = H - 42;
    // axis ranges from robust quantiles
    var xs = Array.prototype.slice.call(sim.X).sort(function (p, q) { return p - q; });
    var ys = Array.prototype.slice.call(sim.Y).sort(function (p, q) { return p - q; });
    var q = function (arr, f) { return arr[Math.min(arr.length - 1, Math.max(0, Math.round(f * (arr.length - 1))))]; };
    var x0 = q(xs, 0.005), x1 = q(xs, 0.995), y0 = q(ys, 0.005), y1 = q(ys, 0.995);
    var padx = (x1 - x0) * 0.06, pady = (y1 - y0) * 0.06;
    x0 -= padx; x1 += padx; y0 -= pady; y1 += pady;
    var sx = function (v) { return L + (v - x0) / (x1 - x0) * (R - L); };
    var sy = function (v) { return B - (v - y0) / (y1 - y0) * (B - T); };
    el("rect", { x: L, y: T, width: R - L, height: B - T, fill: "#fff", stroke: "#d9dee5" }, svg);
    // ticks
    function ticks(lo, hi) {
      var span = hi - lo, step = Math.pow(10, Math.floor(Math.log10(span / 4)));
      if (span / step > 8) step *= 2;
      if (span / step > 8) step *= 2.5;
      var out = [];
      for (var v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(Math.round(v / step) * step);
      return out;
    }
    ticks(x0, x1).forEach(function (v) {
      el("line", { x1: sx(v), x2: sx(v), y1: B, y2: B + 4, stroke: "#8a93a0" }, svg);
      txt(svg, sx(v), B + 16, fmt(v, Math.abs(v) < 1 && v !== 0 ? 1 : 0), "t-xs", "middle");
    });
    ticks(y0, y1).forEach(function (v) {
      el("line", { x1: L - 4, x2: L, y1: sy(v), y2: sy(v), stroke: "#8a93a0" }, svg);
      txt(svg, L - 7, sy(v) + 3, fmt(v, Math.abs(v) < 1 && v !== 0 ? 1 : 0), "t-xs", "end");
    });
    txt(svg, (L + R) / 2, B + 34, "Exposure X (simulated units)", "t-sm", "middle");
    var yl = txt(svg, 12, (T + B) / 2, "Outcome Y", "t-sm", "middle");
    yl.setAttribute("transform", "rotate(-90 12 " + ((T + B) / 2) + ")");
    // points (subsample)
    var g = el("g", {}, svg);
    var step = Math.max(1, Math.floor(sim.n / 1200));
    var fills = ["var(--g0)", "var(--g1)", "var(--g2)"];
    for (var i = 0; i < sim.n; i += step) {
      var px = sx(sim.X[i]), py = sy(sim.Y[i]);
      if (px < L || px > R || py < T || py > B) continue;
      el("circle", { cx: px.toFixed(1), cy: py.toFixed(1), r: 2.1, fill: fills[sim.G[i]], stroke: sim.G[i] === 0 ? "#9fb3c8" : "none", "stroke-width": 0.6, "fill-opacity": 0.75 }, g);
    }
    // clip lines to the box
    function line(a0, b0, cls, dash) {
      var pts = [];
      [x0, x1].forEach(function (xv) { var yv = a0 + b0 * xv; if (yv >= y0 && yv <= y1) pts.push([xv, yv]); });
      if (b0 !== 0) [y0, y1].forEach(function (yv) { var xv = (yv - a0) / b0; if (xv > x0 && xv < x1) pts.push([xv, yv]); });
      if (pts.length < 2) return;
      pts.sort(function (p1, p2) { return p1[0] - p2[0]; });
      el("line", { x1: sx(pts[0][0]), y1: sy(pts[0][1]), x2: sx(pts[pts.length - 1][0]), y2: sy(pts[pts.length - 1][1]), "class": cls, "stroke-dasharray": dash || "" }, svg);
    }
    line(a.ols.a, a.ols.b, "mr-ols");
    if (isFinite(a.iv)) line(a.ols.my - a.iv * a.ols.mx, a.iv, "mr-iv", "6 4");
    // genotype-group means
    var sumX = [0, 0, 0], sumY = [0, 0, 0], cnt = [0, 0, 0];
    for (var j = 0; j < sim.n; j++) { var k = sim.G[j]; sumX[k] += sim.X[j]; sumY[k] += sim.Y[j]; cnt[k]++; }
    for (var m = 0; m < 3; m++) {
      if (!cnt[m]) continue;
      var mxv = sumX[m] / cnt[m], myv = sumY[m] / cnt[m];
      el("circle", { cx: sx(mxv), cy: sy(myv), r: 6.5, fill: fills[m], stroke: "#1d2127", "stroke-width": 1.8 }, svg);
    }
  }

  function render() {
    syncOutputs();
    var sim = simulate(state, state.seed);
    var a = analyze(sim), th = theory(state);
    drawScatter(sim, a);
    var weak = a.F < 10;
    var rows = [
      ["First stage, G → X", "β̂ = " + fmt(a.gx.b) + " (SE " + fmt(a.gx.se) + ") · F = " + fmt(a.F, 1) + (weak ? " (weak: F < 10)" : "") + " · R² = " + fmt(100 * a.r2gx, 2) + "%"],
      ["Reduced form, G → Y", "β̂ = " + fmt(a.gy.b) + " (SE " + fmt(a.gy.se) + ")"],
      ["Naive slope, Y on X", "β̂ = " + fmt(a.ols.b) + " (SE " + fmt(a.ols.se) + "), 95% CI " + fmt(a.ols.b - 1.96 * a.ols.se) + " to " + fmt(a.ols.b + 1.96 * a.ols.se)],
      ["Wald ratio, β̂GY / β̂GX", "β̂ = " + fmt(a.iv) + " (SE " + fmt(a.ivse) + "), 95% CI " + fmt(a.iv - 1.96 * a.ivse) + " to " + fmt(a.iv + 1.96 * a.ivse)],
      ["Truth and large-n limits", "true β = " + fmt(state.beta, 2) + " · as n grows, naive slope → " + fmt(th.ols) + " and Wald ratio → " + (isFinite(th.iv) ? fmt(th.iv) : "undefined (γ = 0)") + " · expected F ≈ " + fmt(th.F, 1)]
    ];
    var html = '<table class="mr-tab"><tbody>';
    rows.forEach(function (r) { html += "<tr><th scope=\"row\">" + r[0] + "</th><td>" + r[1] + "</td></tr>"; });
    html += "</tbody></table>";
    body.querySelector("#mr-readout").innerHTML = html;
    if (reps) drawReps();
  }

  function drawReps() {
    var box = body.querySelector("#mr-reps");
    box.hidden = false;
    var svg = body.querySelector("#mr-hist");
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var W = fitWidth(svg, 860);
    svg.setAttribute("viewBox", "0 0 " + W + " 210");
    var L = 30, R = W - 14, T = 36, B = 170;
    var beta = reps.params.beta;
    var lo = Math.min(beta, median(reps.ols)) - 0.6, hi = Math.max(beta, median(reps.ols)) + 0.6;
    var nb = 48, w = (hi - lo) / nb;
    function counts(arr) {
      var c = new Array(nb).fill(0), out = 0;
      for (var i = 0; i < arr.length; i++) {
        var k = Math.floor((arr[i] - lo) / w);
        if (k >= 0 && k < nb && isFinite(arr[i])) c[k]++; else out++;
      }
      return { c: c, out: out };
    }
    var co = counts(reps.ols), ci = counts(reps.iv);
    var mx = Math.max.apply(null, co.c.concat(ci.c)) || 1;
    var sx = function (v) { return L + (v - lo) / (hi - lo) * (R - L); };
    var sh = function (c) { return c / mx * (B - T); };
    el("line", { x1: L, x2: R, y1: B, y2: B, stroke: "#8a93a0" }, svg);
    for (var k = 0; k < nb; k++) {
      if (co.c[k]) el("rect", { x: sx(lo + k * w) + 0.5, y: B - sh(co.c[k]), width: Math.max(1, (R - L) / nb - 1), height: sh(co.c[k]), fill: "var(--q2)", "fill-opacity": 0.55 }, svg);
      if (ci.c[k]) el("rect", { x: sx(lo + k * w) + 0.5, y: B - sh(ci.c[k]), width: Math.max(1, (R - L) / nb - 1), height: sh(ci.c[k]), fill: "var(--q1)", "fill-opacity": 0.55 }, svg);
    }
    el("line", { x1: sx(beta), x2: sx(beta), y1: T - 6, y2: B, stroke: "#1d2127", "stroke-width": 1.6, "stroke-dasharray": "4 3" }, svg);
    txt(svg, sx(beta), T - 8, "true β", "t-xs", "middle");
    var step = (hi - lo) > 2.5 ? 1 : 0.5;
    for (var v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) {
      el("line", { x1: sx(v), x2: sx(v), y1: B, y2: B + 4, stroke: "#8a93a0" }, svg);
      txt(svg, sx(v), B + 15, fmt(v, 1), "t-xs", "middle");
    }
    txt(svg, (L + R) / 2, B + 32, "Estimate of β in each of 200 simulated studies", "t-sm", "middle");
    el("rect", { x: L, y: 5, width: 10, height: 10, fill: "var(--q2)", "fill-opacity": 0.7 }, svg);
    txt(svg, L + 14, 14, "naive slope", "t-xs");
    el("rect", { x: L + 90, y: 5, width: 10, height: 10, fill: "var(--q1)", "fill-opacity": 0.7 }, svg);
    txt(svg, L + 104, 14, "Wald ratio", "t-xs");
    var p = reps.params;
    body.querySelector("#mr-reps-out").innerHTML =
      "Settings: β = " + fmt(p.beta, 2) + ", c = " + fmt(p.c, 1) + ", γ = " + fmt(p.gamma, 2) + ", α = " + fmt(p.alpha, 2) + ", n = " + p.n + "<br>" +
      "Naive slope: median " + fmt(median(reps.ols)) + "; 95% CI contains the true β in " + Math.round(100 * reps.coverOls) + "% of studies<br>" +
      "Wald ratio: median " + fmt(median(reps.iv)) + "; 95% CI contains the true β in " + Math.round(100 * reps.cover) + "% of studies" +
      (ci.out ? "; " + ci.out + " estimates fall outside the plotted range" : "");
  }

  function readInputs() {
    ids.forEach(function (k) { state[k] = parseFloat(inputs[k].value); });
    state.n = parseInt(nSel.value, 10);
  }
  ids.forEach(function (k) { inputs[k].addEventListener("input", function () { readInputs(); reps = null; body.querySelector("#mr-reps").hidden = true; render(); }); });
  nSel.addEventListener("change", function () { readInputs(); reps = null; body.querySelector("#mr-reps").hidden = true; render(); });
  body.querySelector("#mr-new").addEventListener("click", function () { state.seed = (state.seed * 1103515245 + 12345) >>> 0; render(); });
  body.querySelector("#mr-reset").addEventListener("click", function () {
    state.beta = DEF.beta; state.c = DEF.c; state.gamma = DEF.gamma; state.alpha = DEF.alpha; state.n = DEF.n; state.seed = 20260909;
    ids.forEach(function (k) { inputs[k].value = state[k]; }); nSel.value = String(state.n);
    reps = null; body.querySelector("#mr-reps").hidden = true; render();
  });
  body.querySelector("#mr-rep").addEventListener("click", function () {
    var p = { beta: state.beta, c: state.c, gamma: state.gamma, alpha: state.alpha, n: state.n };
    var box = body.querySelector("#mr-reps");
    box.hidden = false;
    body.querySelector("#mr-reps-out").textContent = "Simulating 200 studies of " + p.n.toLocaleString("en-US") + " people…";
    setTimeout(function () {
      reps = replicate(p, state.seed, 200);
      reps.params = p;
      drawReps();
    }, 30);
  });
  Array.prototype.forEach.call(body.querySelectorAll(".mr-pre"), function (b) {
    b.addEventListener("click", function () {
      var pre = b.getAttribute("data-pre");
      if (pre === "hdl") { state.beta = 0; state.c = 1; state.gamma = 0.25; state.alpha = 0; state.n = 5000; }
      if (pre === "weak") { state.beta = 0; state.c = 1; state.gamma = 0.03; state.alpha = 0; state.n = 5000; }
      if (pre === "pleio") { state.beta = 0; state.c = 1; state.gamma = 0.25; state.alpha = 0.05; state.n = 20000; }
      ids.forEach(function (k) { inputs[k].value = state[k]; }); nSel.value = String(state.n);
      reps = null; body.querySelector("#mr-reps").hidden = true; render();
    });
  });
  var lastW = 0, rt = null;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      var w = Math.round(body.querySelector("#mr-svg").getBoundingClientRect().width);
      if (Math.abs(w - lastW) > 4) { lastW = w; render(); }
    }, 150);
  });
  render();
  lastW = Math.round(body.querySelector("#mr-svg").getBoundingClientRect().width);
})();
