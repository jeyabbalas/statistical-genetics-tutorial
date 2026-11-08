/* Widget "Gene counting: ABO allele frequencies from blood groups" (page: frequencies-hwe, Lecture 1).
   Data: numbers of people with blood group O, A, B and AB (default: slide 73's 3,117 genotypes from Wolpin et al.
   2010 collapsed into blood groups: O 1,168, A 262 + 1,080 = 1,342, B 44 + 377 = 421, AB 186).
   Under Hardy–Weinberg proportions with allele frequencies pA, pB, pO:
       P(O) = pO^2, P(A) = pA^2 + 2 pA pO, P(B) = pB^2 + 2 pB pO, P(AB) = 2 pA pB.
   Gene counting (Ceppellini, Siniscalco & Smith 1955), the EM algorithm for this problem:
     E-step: split each blood group into genotypes in proportion to their HWE probabilities,
       nAA = nA pA^2 / (pA^2 + 2 pA pO),  nAO = nA - nAA,  nBB = nB pB^2 / (pB^2 + 2 pB pO),  nBO = nB - nBB
     M-step: count alleles, 2n copies in all:
       pA = (2 nAA + nAO + nAB) / 2n,  pB = (2 nBB + nBO + nAB) / 2n,  pO = (2 nO + nAO + nBO) / 2n
   Log-likelihood (natural log, constant omitted):
       l = nO ln(pO^2) + nA ln(pA^2 + 2 pA pO) + nB ln(pB^2 + 2 pB pO) + nAB ln(2 pA pB);
   it never decreases from one step to the next. Stops when no frequency changes by more than 1e-7 (or after 500 steps).
   Fit: expected blood-group counts n P(.) at the estimates; Pearson X^2 with 4 - 1 - 2 = 1 degree of freedom;
   p-value P(chi2_1 >= X^2) = erfc(sqrt(X^2 / 2)) via the regularized upper incomplete gamma function.
   Square-root estimates for a starting point: pO = sqrt(fO), pA = 1 - sqrt(fB + fO), pB = 1 - sqrt(fA + fO),
   rescaled to sum to 1. No libraries, no network; pure functions are exported for Node tests. */
(function () {
  "use strict";

  var DEFAULT = { O: 1168, A: 1342, B: 421, AB: 186 };
  var GENO_EST = { A: 1790 / 6234, B: 651 / 6234, O: 3793 / 6234 };   // from slide 73's genotype counts
  var TOL = 1e-7, MAXIT = 500;

  var LN_SQRT_PI = 0.5723649429247001;
  function gammaQ(a, x, lnGa) {
    var EPS = 1e-16, FPMIN = 1e-300, ITMAX = 100000;
    if (x <= 0) return { q: 1, lnq: 0 };
    var lnPre = -x + a * Math.log(x) - lnGa;
    if (x < a + 1) {
      var ap = a, sum = 1 / a, del = sum;
      for (var n = 0; n < ITMAX; n++) { ap += 1; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * EPS) break; }
      var P = sum * Math.exp(lnPre), Q = 1 - P;
      return { q: Q, lnq: Math.log(Q) };
    }
    var b = x + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d;
    for (var i = 1; i < ITMAX; i++) {
      var an = -i * (i - a);
      b += 2; d = an * d + b; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = b + an / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; var dl = d * c; h *= dl;
      if (Math.abs(dl - 1) < EPS) break;
    }
    var lnq = lnPre + Math.log(h);
    return { q: Math.exp(lnq), lnq: lnq };
  }
  function chiSq1Upper(x) { var r = gammaQ(0.5, x / 2, LN_SQRT_PI); return Math.min(1, Math.max(0, r.q)); }

  function total(c) { return c.O + c.A + c.B + c.AB; }
  function phenoProbs(f) {
    return { O: f.O * f.O, A: f.A * f.A + 2 * f.A * f.O, B: f.B * f.B + 2 * f.B * f.O, AB: 2 * f.A * f.B };
  }
  function logLik(c, f) {
    var P = phenoProbs(f), l = 0;
    ["O", "A", "B", "AB"].forEach(function (k) { if (c[k] > 0) l += c[k] * Math.log(P[k]); });
    return l;
  }
  function eStep(c, f) {
    var dA = f.A * f.A + 2 * f.A * f.O, dB = f.B * f.B + 2 * f.B * f.O;
    var nAA = dA > 0 ? c.A * f.A * f.A / dA : 0, nBB = dB > 0 ? c.B * f.B * f.B / dB : 0;
    return { AA: nAA, AO: c.A - nAA, BB: nBB, BO: c.B - nBB };
  }
  function mStep(c, s) {
    var N2 = 2 * total(c);
    return { A: (2 * s.AA + s.AO + c.AB) / N2, B: (2 * s.BB + s.BO + c.AB) / N2, O: (2 * c.O + s.AO + s.BO) / N2 };
  }
  /* One EM step from frequencies f; returns the split used and the new frequencies. */
  function step(c, f) { var s = eStep(c, f); return { split: s, f: mStep(c, s) }; }
  function maxDiff(a, b) { return Math.max(Math.abs(a.A - b.A), Math.abs(a.B - b.B), Math.abs(a.O - b.O)); }
  function run(c, f0, maxit) {
    var rows = [{ t: 0, f: f0, ll: logLik(c, f0), split: null }], f = f0;
    for (var t = 1; t <= (maxit || MAXIT); t++) {
      var r = step(c, f);
      rows.push({ t: t, f: r.f, ll: logLik(c, r.f), split: r.split });
      var d = maxDiff(r.f, f);
      f = r.f;
      if (d < TOL) break;
    }
    return rows;
  }
  function sqrtStart(c) {
    var n = total(c), fO = c.O / n, fA = c.A / n, fB = c.B / n;
    var o = Math.sqrt(fO), a = 1 - Math.sqrt(fB + fO), b = 1 - Math.sqrt(fA + fO);
    a = Math.max(a, 1e-3); b = Math.max(b, 1e-3); o = Math.max(o, 1e-3);
    var s = a + b + o;
    return { A: a / s, B: b / s, O: o / s, raw: { A: 1 - Math.sqrt(fB + fO), B: 1 - Math.sqrt(fA + fO), O: Math.sqrt(fO) } };
  }
  function fit(c, f) {
    var n = total(c), P = phenoProbs(f), x2 = 0, E = {};
    ["O", "A", "B", "AB"].forEach(function (k) { E[k] = n * P[k]; if (E[k] > 0) x2 += (c[k] - E[k]) * (c[k] - E[k]) / E[k]; });
    return { E: E, x2: x2, p: chiSq1Upper(x2) };
  }

  var STATS = { DEFAULT: DEFAULT, GENO_EST: GENO_EST, phenoProbs: phenoProbs, logLik: logLik, eStep: eStep, mStep: mStep,
                step: step, run: run, sqrtStart: sqrtStart, fit: fit, chiSq1Upper: chiSq1Upper };
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
  function c1(x) { return isFinite(x) ? x.toFixed(1) : "—"; }
  function minus(s) { return s.replace(/^-/, "−"); }
  function fmtP(p) {
    if (p >= 0.001) return p >= 0.995 ? "1.00" : p.toPrecision(2);
    var e = Math.floor(Math.log10(p)), m = p / Math.pow(10, e);
    if (m >= 9.95) { m = 1; e += 1; }
    return m.toFixed(1) + " × 10<sup>−" + (-e) + "</sup>";
  }

  var STARTS = {
    equal: { label: "equal: 1/3 each", f: function () { return { A: 1 / 3, B: 1 / 3, O: 1 / 3 }; } },
    far: { label: "far off: A 0.80, B 0.10, O 0.10", f: function () { return { A: 0.8, B: 0.1, O: 0.1 }; } },
    sqrt: { label: "square-root estimates", f: function (c) { var s = sqrtStart(c); return { A: s.A, B: s.B, O: s.O }; } }
  };

  function init() {
    var root = document.getElementById("w-abo-em");
    if (!root) return;
    var body = root.querySelector(".widget-body");
    if (!body) return;
    body.innerHTML = "";

    var counts = { O: DEFAULT.O, A: DEFAULT.A, B: DEFAULT.B, AB: DEFAULT.AB }, startKey = "equal", rows = [];

    var ctl = h("div", { "class": "controls em-counts", role: "group", "aria-label": "Number of people in each blood group" });
    var inputs = {};
    ["O", "A", "B", "AB"].forEach(function (k) {
      var l = h("label", null, "Group " + k + " ");
      var inp = h("input", { type: "number", min: "0", max: "1000000", step: "1", value: String(counts[k]), inputmode: "numeric", "aria-label": "People with blood group " + k });
      l.appendChild(inp); ctl.appendChild(l); inputs[k] = inp;
    });
    body.appendChild(ctl);

    var ctl2 = h("div", { "class": "controls" });
    var lS = h("label", null, "Start ");
    var sel = h("select", { "aria-label": "Starting allele frequencies" });
    Object.keys(STARTS).forEach(function (k) { var o = h("option", { value: k }, STARTS[k].label); sel.appendChild(o); });
    lS.appendChild(sel);
    var bStep = h("button", { "class": "btn primary", type: "button" }, "One step");
    var bRun = h("button", { "class": "btn", type: "button" }, "Run to convergence");
    var bReset = h("button", { "class": "btn", type: "button" }, "Reset");
    ctl2.appendChild(lS); ctl2.appendChild(bStep); ctl2.appendChild(bRun); ctl2.appendChild(bReset);
    body.appendChild(ctl2);

    var msg = h("p", { "class": "note em-msg" }, "");
    body.appendChild(msg);
    var grid = h("div", { "class": "em-grid" });
    body.appendChild(grid);
    var svgBox = h("div", null, "");
    grid.appendChild(svgBox);
    var svg = svgEl("svg", { viewBox: "0 0 340 214", role: "img", "aria-labelledby": "em-svg-t", "class": "em-svg" });
    svgEl("title", { id: "em-svg-t" }, svg).textContent = "The four blood groups as bars; the A and B bars are split into the genotypes the current step assigns them";
    svgBox.appendChild(svg);
    var right = h("div", null, "");
    grid.appendChild(right);
    var read = h("div", { "class": "readout em-read", "aria-live": "polite" });
    right.appendChild(read);
    var tWrap = h("div", { "class": "em-twrap", tabindex: "0", role: "region", "aria-label": "Iterations of gene counting" });
    body.appendChild(tWrap);

    function readCounts() {
      var ok = true;
      ["O", "A", "B", "AB"].forEach(function (k) {
        var v = Math.floor(Number(inputs[k].value));
        if (!isFinite(v) || v < 0) { v = 0; ok = false; }
        counts[k] = Math.min(v, 1000000);
      });
      return ok;
    }
    function reset() {
      readCounts();
      var f0 = STARTS[startKey].f(counts);
      rows = [{ t: 0, f: f0, ll: logLik(counts, f0), split: null }];
      render();
    }
    function converged() {
      if (rows.length < 2) return false;
      return maxDiff(rows[rows.length - 1].f, rows[rows.length - 2].f) < TOL;
    }
    function doStep() {
      if (total(counts) <= 0 || converged() || rows.length > MAXIT) return;
      var last = rows[rows.length - 1], r = step(counts, last.f);
      rows.push({ t: last.t + 1, f: r.f, ll: logLik(counts, r.f), split: r.split });
      render();
    }
    function doRun() {
      if (total(counts) <= 0) return;
      var guard = 0;
      while (!converged() && rows.length <= MAXIT && guard++ < MAXIT) {
        var last = rows[rows.length - 1], r = step(counts, last.f);
        rows.push({ t: last.t + 1, f: r.f, ll: logLik(counts, r.f), split: r.split });
      }
      render();
    }

    function render() {
      var n = total(counts);
      if (n <= 0) {
        msg.textContent = "Enter at least one person.";
        read.innerHTML = ""; tWrap.innerHTML = "";
        while (svg.childNodes.length > 1) svg.removeChild(svg.lastChild);
        return;
      }
      var cur = rows[rows.length - 1], f = cur.f, split = eStep(counts, f);
      var done = converged();
      msg.innerHTML = thousands(n) + " people, " + thousands(2 * n) + " allele copies. Step " + cur.t + (done ? ": converged (no frequency changes by more than 10<sup>−7</sup>)." : ". Each step splits groups A and B by the current frequencies, then counts alleles.");

      /* bars */
      while (svg.childNodes.length > 1) svg.removeChild(svg.lastChild);
      var BX0 = 70, BX1 = 300, maxC = Math.max(counts.O, counts.A, counts.B, counts.AB, 1);
      function W(v) { return v / maxC * (BX1 - BX0); }
      var groups = [
        { k: "O", y: 14, parts: [{ v: counts.O, lab: "OO", col: "var(--q5)" }] },
        { k: "A", y: 58, parts: [{ v: split.AA, lab: "AA", col: "var(--q1)" }, { v: split.AO, lab: "AO", col: "var(--g1)" }] },
        { k: "B", y: 102, parts: [{ v: split.BB, lab: "BB", col: "var(--q2)" }, { v: split.BO, lab: "BO", col: "#f8c99a" }] },
        { k: "AB", y: 146, parts: [{ v: counts.AB, lab: "AB", col: "var(--q7)" }] }
      ];
      groups.forEach(function (g) {
        svgText(svg, BX0 - 8, g.y + 17, "group " + g.k, "t-sm", { "text-anchor": "end" });
        var x = BX0;
        g.parts.forEach(function (pt) {
          var w = W(pt.v);
          if (w > 0) svgEl("rect", { x: x, y: g.y, width: w, height: 26, fill: pt.col, stroke: "#fff", "stroke-width": 1 }, svg);
          x += w;
        });
        var lab = g.parts.map(function (pt) { return pt.lab + " " + (g.parts.length > 1 ? c1(pt.v) : thousands(pt.v)); }).join(" + ");
        svgText(svg, BX0, g.y + 40, lab, "t-xs", {});
      });
      svgText(svg, 8, 208, "bars: people; A and B split by current frequencies", "t-xs", {});

      /* readout */
      var ft = fit(counts, f), isDefault = counts.O === DEFAULT.O && counts.A === DEFAULT.A && counts.B === DEFAULT.B && counts.AB === DEFAULT.AB;
      read.innerHTML =
        "<div>p̂<sub>A</sub> = <b>" + f.A.toFixed(4) + "</b> · p̂<sub>B</sub> = <b>" + f.B.toFixed(4) + "</b> · p̂<sub>O</sub> = <b>" + f.O.toFixed(4) + "</b></div>" +
        "<div>log-likelihood: " + minus(cur.ll.toFixed(3)) + "</div>" +
        (done ? "<div>Fit: expected O " + c1(ft.E.O) + ", A " + c1(ft.E.A) + ", B " + c1(ft.E.B) + ", AB " + c1(ft.E.AB) + "</div>" +
                "<div>X² = " + ft.x2.toFixed(3) + ", 1 df, p-value " + fmtP(ft.p) + "</div>" : "") +
        (done && isDefault ? "<div class=\"em-dim\">From the genotypes on slide 73 instead: p̂<sub>A</sub> " + GENO_EST.A.toFixed(4) + ", p̂<sub>B</sub> " + GENO_EST.B.toFixed(4) + ", p̂<sub>O</sub> " + GENO_EST.O.toFixed(4) + "</div>" : "");

      /* iteration table: the last 12 rows */
      var shown = rows.slice(Math.max(0, rows.length - 12));
      var trs = shown.map(function (r) {
        var s = r.split;
        return "<tr><td>" + r.t + "</td><td>" + (s ? c1(s.AA) + " / " + c1(s.AO) : "—") + "</td><td>" + (s ? c1(s.BB) + " / " + c1(s.BO) : "—") +
          "</td><td>" + r.f.A.toFixed(4) + "</td><td>" + r.f.B.toFixed(4) + "</td><td>" + r.f.O.toFixed(4) + "</td><td>" + minus(r.ll.toFixed(2)) + "</td></tr>";
      }).join("");
      tWrap.innerHTML = "<table class=\"em-t\"><thead><tr><th>step</th><th>AA / AO</th><th>BB / BO</th><th>freq. A</th><th>freq. B</th><th>freq. O</th><th>log-lik.</th></tr></thead><tbody>" + trs + "</tbody></table>" +
        (rows.length > 12 ? "<p class=\"note\">Showing the last 12 of " + rows.length + " rows.</p>" : "");
    }

    ["O", "A", "B", "AB"].forEach(function (k) { inputs[k].addEventListener("change", reset); });
    sel.addEventListener("change", function () { startKey = sel.value; reset(); });
    bStep.addEventListener("click", doStep);
    bRun.addEventListener("click", doRun);
    bReset.addEventListener("click", function () {
      ["O", "A", "B", "AB"].forEach(function (k) { inputs[k].value = String(DEFAULT[k]); });
      startKey = "equal"; sel.value = "equal";
      reset();
    });
    reset();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
