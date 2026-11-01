/* Widget "Build a case definition" (page: phenotypes).
   A simulated cohort of 100,000 people (seeded mulberry32, so the first cohort is reproducible). Everything is
   simulated; no UK Biobank data are used.
   Truth: each person has a genotype g = 0, 1 or 2 at one SNP (allele frequency 0.40). A first myocardial
   infarction (MI) occurs with a Gompertz hazard from age 30 that is multiplied by 1.30 per allele; follow-up
   ends at 2023.0. Baseline visits fall in 2006.2-2010.8; age at baseline is 40-70.
   Three record sources, each with its own window and errors:
     self-report at the baseline visit: reports a past MI with probability 0.85, with the year off by a few
       years (normal error, SD 1.5); 0.7% of people without a past MI also report one;
     hospital records from April 1997 to 2023: record 90% of MIs in that window; 0.15% false records;
     primary care (GP) records for 45% of people, from 1990 to mid-2016 or mid-2017: 85% of MIs in the
       window; 0.2% false records.
   The reader chooses which sources count, whether only incident cases count (first counted record after the
   baseline visit), and whether controls must have no MI record in the sources not counted. Everyone is then a
   case, a control or excluded. The widget compares the labels with the simulated truth and fits a per-allele
   logistic regression (grouped by genotype; Newton-Raphson; Wald 95% CI; two-sided p from the chi-square(1)
   upper tail computed in log space).
   No libraries, no network, no modules: works from file://. Core functions are exported for node tests. */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ simulation and statistics core */

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var P = {
    N: 100000, f: 0.40, HR: 1.30, kappa: 0.085, c: 0.00013,
    END: 2023.0, HOSP_START: 1997.25, GP_FRAC: 0.45, GP_START: 1990.0,
    SR_SENS: 0.85, SR_FP: 0.007, SR_SD: 1.5,
    HOSP_SENS: 0.90, HOSP_FP: 0.0015, GP_SENS: 0.85, GP_FP: 0.002
  };

  function simulate(seed, p) {
    p = p || P;
    var r = mulberry32(seed), N = p.N, i;
    var g = new Uint8Array(N), B = new Float64Array(N), birth = new Float64Array(N), T = new Float64Array(N);
    var sr = new Float64Array(N), ho = new Float64Array(N), gp = new Float64Array(N), gpEnd = new Float64Array(N);
    function norm() { var u = 0; while (u === 0) u = r(); var v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
    for (i = 0; i < N; i++) {
      g[i] = (r() < p.f ? 1 : 0) + (r() < p.f ? 1 : 0);
      var base = 2006.2 + r() * 4.6;
      var age = 40 + r() * 30;
      B[i] = base;
      birth[i] = base - age;
      var rate = p.c * Math.pow(p.HR, g[i]);
      var E = -Math.log(1 - r());
      var onset = birth[i] + 30 + Math.log(1 + p.kappa * E / rate) / p.kappa;
      T[i] = onset <= p.END ? onset : NaN;
      var hasGP = r() < p.GP_FRAC;
      gpEnd[i] = hasGP ? (r() < 0.75 ? 2016.42 : 2017.42) : NaN;
      sr[i] = NaN;
      if (!isNaN(T[i]) && T[i] < base) {
        if (r() < p.SR_SENS) {
          var d = Math.floor(T[i] + p.SR_SD * norm()) + 0.5;
          if (d > base) d = base;
          if (d < birth[i]) d = birth[i];
          sr[i] = d;
        }
      } else if (r() < p.SR_FP) {
        sr[i] = Math.floor(base - 1 - r() * 15) + 0.5;
      }
      ho[i] = NaN;
      if (!isNaN(T[i]) && T[i] >= p.HOSP_START && r() < p.HOSP_SENS) ho[i] = T[i] + r() * 0.02;
      if (isNaN(ho[i]) && r() < p.HOSP_FP) ho[i] = p.HOSP_START + r() * (p.END - p.HOSP_START);
      gp[i] = NaN;
      if (hasGP) {
        if (!isNaN(T[i]) && T[i] >= p.GP_START && T[i] <= gpEnd[i] && r() < p.GP_SENS) gp[i] = Math.min(gpEnd[i], T[i] + r() * 0.15);
        if (isNaN(gp[i]) && r() < p.GP_FP) gp[i] = p.GP_START + r() * (gpEnd[i] - p.GP_START);
      }
    }
    return { N: N, g: g, B: B, birth: birth, T: T, sr: sr, ho: ho, gp: gp, gpEnd: gpEnd };
  }

  /* Labels: 1 case, 0 control, -1 excluded. opt = {sr, ho, gp (booleans), incident, clean}. */
  function classify(d, opt) {
    var out = new Int8Array(d.N);
    for (var i = 0; i < d.N; i++) {
      var first = Infinity, other = false;
      if (!isNaN(d.sr[i])) { if (opt.sr) { if (d.sr[i] < first) first = d.sr[i]; } else other = true; }
      if (!isNaN(d.ho[i])) { if (opt.ho) { if (d.ho[i] < first) first = d.ho[i]; } else other = true; }
      if (!isNaN(d.gp[i])) { if (opt.gp) { if (d.gp[i] < first) first = d.gp[i]; } else other = true; }
      if (first < Infinity) out[i] = (opt.incident && first <= d.B[i]) ? -1 : 1;
      else out[i] = (opt.clean && other) ? -1 : 0;
    }
    return out;
  }

  /* The "truth" labels with the same timing choice: any time, or incident (true prevalent MI excluded). */
  function truthLabels(d, incident) {
    var out = new Int8Array(d.N);
    for (var i = 0; i < d.N; i++) {
      if (isNaN(d.T[i])) out[i] = 0;
      else out[i] = (incident && d.T[i] <= d.B[i]) ? -1 : 1;
    }
    return out;
  }

  function summarize(d, lab, incident) {
    var cases = [0, 0, 0], ctrls = [0, 0, 0], nC = 0, nK = 0, nX = 0, tpC = 0, hiddenK = 0;
    for (var i = 0; i < d.N; i++) {
      var t = d.T[i];
      if (lab[i] === 1) {
        cases[d.g[i]]++; nC++;
        if (!isNaN(t) && (!incident || t > d.B[i])) tpC++;
      } else if (lab[i] === 0) {
        ctrls[d.g[i]]++; nK++;
        if (!isNaN(t)) hiddenK++;
      } else nX++;
    }
    return { nC: nC, nK: nK, nX: nX, tpC: tpC, ppv: nC ? tpC / nC : NaN, hiddenK: hiddenK,
             cases: cases, ctrls: ctrls, fit: logit3(cases, ctrls) };
  }

  /* Logistic regression y ~ a + b*g on counts by genotype (0, 1, 2). Returns null if it cannot be fitted. */
  function logit3(cases, ctrls) {
    var nc = cases[0] + cases[1] + cases[2], nk = ctrls[0] + ctrls[1] + ctrls[2];
    if (nc === 0 || nk === 0) return null;
    var a = Math.log(nc / nk), b = 0;
    for (var it = 0; it < 60; it++) {
      var g0 = 0, g1 = 0, h00 = 0, h01 = 0, h11 = 0;
      for (var k = 0; k < 3; k++) {
        var n = cases[k] + ctrls[k];
        if (!n) continue;
        var pr = 1 / (1 + Math.exp(-(a + b * k)));
        var res = cases[k] - n * pr, w = n * pr * (1 - pr);
        g0 += res; g1 += res * k; h00 += w; h01 += w * k; h11 += w * k * k;
      }
      var det = h00 * h11 - h01 * h01;
      if (!(det > 0)) return null;
      var da = (h11 * g0 - h01 * g1) / det, db = (-h01 * g0 + h00 * g1) / det;
      a += da; b += db;
      if (Math.abs(da) + Math.abs(db) < 1e-11) {
        var se = Math.sqrt(h00 / det), z = b / se, pv = chiSq1Upper(z * z);
        return { b: b, se: se, or: Math.exp(b), lo: Math.exp(b - 1.959964 * se), hi: Math.exp(b + 1.959964 * se),
                 z: z, p: pv.p, log10p: pv.log10p };
      }
    }
    return null;
  }

  /* Upper tail of chi-square(1): Q(1/2, x/2) via the regularized incomplete gamma function (log space). */
  var LN_SQRT_PI = 0.5723649429247001;
  function chiSq1Upper(x) {
    var a = 0.5, xx = x / 2, EPS = 1e-15, FPMIN = 1e-300, n;
    if (xx <= 0) return { p: 1, log10p: 0 };
    var lnPre = -xx + a * Math.log(xx) - LN_SQRT_PI, lnq;
    if (xx < a + 1) {
      var ap = a, sum = 1 / a, del = sum;
      for (n = 0; n < 10000; n++) { ap += 1; del *= xx / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * EPS) break; }
      lnq = Math.log(1 - sum * Math.exp(lnPre));
    } else {
      var b = xx + 1 - a, c = 1 / FPMIN, dd = 1 / b, h = dd;
      for (n = 1; n < 10000; n++) {
        var an = -n * (n - a);
        b += 2; dd = an * dd + b; if (Math.abs(dd) < FPMIN) dd = FPMIN;
        c = b + an / c; if (Math.abs(c) < FPMIN) c = FPMIN;
        dd = 1 / dd; var dl = dd * c; h *= dl;
        if (Math.abs(dl - 1) < EPS) break;
      }
      lnq = lnPre + Math.log(h);
    }
    return { p: Math.exp(lnq), log10p: lnq / Math.LN10 };
  }

  /* People with at least one MI record (any date) in each region of the 3-source Venn diagram. */
  function vennCounts(d) {
    var c = { sr: 0, ho: 0, gp: 0, srho: 0, srgp: 0, hogp: 0, all: 0, none: 0 };
    for (var i = 0; i < d.N; i++) {
      var a = !isNaN(d.sr[i]), b = !isNaN(d.ho[i]), e = !isNaN(d.gp[i]);
      if (a && b && e) c.all++;
      else if (a && b) c.srho++;
      else if (a && e) c.srgp++;
      else if (b && e) c.hogp++;
      else if (a) c.sr++;
      else if (b) c.ho++;
      else if (e) c.gp++;
      else c.none++;
    }
    return c;
  }

  /* Example people: the first person in the cohort matching each description. */
  var ARCHETYPES = [
    { key: "inc-ho", text: "MI after baseline; hospital record",
      test: function (d, i) { return d.T[i] > d.B[i] && !isNaN(d.ho[i]) && isNaN(d.sr[i]) && isNaN(d.gp[i]); } },
    { key: "old-sr", text: "MI before 1997; only self-reported",
      test: function (d, i) { return d.T[i] < 1996 && !isNaN(d.sr[i]) && isNaN(d.ho[i]) && isNaN(d.gp[i]); } },
    { key: "fp-sr", text: "no MI; reported one at the visit",
      test: function (d, i) { return isNaN(d.T[i]) && !isNaN(d.sr[i]) && isNaN(d.ho[i]) && isNaN(d.gp[i]); } },
    { key: "prev-all", text: "MI before baseline; in all three sources",
      test: function (d, i) { return d.T[i] < d.B[i] && d.T[i] > 2000 && !isNaN(d.sr[i]) && !isNaN(d.ho[i]) && !isNaN(d.gp[i]); } },
    { key: "gp-end", text: "MI after GP data ended; hospital only",
      test: function (d, i) { return !isNaN(d.gpEnd[i]) && d.T[i] > d.gpEnd[i] + 1 && !isNaN(d.ho[i]) && isNaN(d.gp[i]); } },
    { key: "missed", text: "MI after baseline; never recorded",
      test: function (d, i) { return d.T[i] > d.B[i] && isNaN(d.sr[i]) && isNaN(d.ho[i]) && isNaN(d.gp[i]); } },
    { key: "fp-ho", text: "no MI; one wrong hospital code",
      test: function (d, i) { return isNaN(d.T[i]) && !isNaN(d.ho[i]) && isNaN(d.sr[i]) && isNaN(d.gp[i]); } },
    { key: "none", text: "no MI; no MI records",
      test: function (d, i) { return isNaN(d.T[i]) && isNaN(d.sr[i]) && isNaN(d.ho[i]) && isNaN(d.gp[i]) && !isNaN(d.gpEnd[i]); } }
  ];

  function findExamples(d) {
    var out = [];
    ARCHETYPES.forEach(function (a) {
      for (var i = 0; i < d.N; i++) { if (a.test(d, i)) { out.push({ i: i, text: a.text }); return; } }
    });
    return out;
  }

  var CORE = { P: P, mulberry32: mulberry32, simulate: simulate, classify: classify, truthLabels: truthLabels,
               summarize: summarize, logit3: logit3, chiSq1Upper: chiSq1Upper, vennCounts: vennCounts,
               findExamples: findExamples };
  if (typeof module !== "undefined" && module.exports) module.exports = CORE;
  if (typeof document === "undefined") return;

  /* ------------------------------------------------------------------ user interface */

  var SVGNS = "http://www.w3.org/2000/svg";
  var COL = { sr: "var(--q1)", ho: "var(--q2)", gp: "var(--q8)" };
  var NAME = { sr: "Self-report", ho: "Hospital", gp: "Primary care" };

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") el.textContent = attrs[k];
      else if (k === "html") el.innerHTML = attrs[k];
      else el.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) el.appendChild(c); });
    return el;
  }
  function s(tag, attrs, text) {
    var el = document.createElementNS(SVGNS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    if (text != null) el.textContent = text;
    return el;
  }
  function fmtInt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function fmtP(fit) {
    if (fit.log10p > -3) return "p = " + fit.p.toPrecision(2);
    var e = Math.floor(fit.log10p), m = Math.pow(10, fit.log10p - e);
    if (m >= 9.95) { m = 1; e += 1; }
    return "p = " + m.toFixed(1) + " × 10" + sup(e);
  }
  function sup(e) {
    var map = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
    return String(e).split("").map(function (ch) { return map[ch] || ch; }).join("");
  }
  function hatchDef(svg, id) {
    var defs = s("defs");
    var pat = s("pattern", { id: id, width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" });
    pat.appendChild(s("rect", { width: 6, height: 6, fill: "var(--bg)" }));
    pat.appendChild(s("line", { x1: 0, y1: 0, x2: 0, y2: 6, stroke: "var(--border-strong)", "stroke-width": 2 }));
    defs.appendChild(pat);
    svg.appendChild(defs);
  }
  function defName(opt) {
    var src = ["sr", "ho", "gp"].filter(function (k) { return opt[k]; }).map(function (k) { return { sr: "SR", ho: "Hosp", gp: "GP" }[k]; });
    return (src.join("+") || "none") + " · " + (opt.incident ? "incident" : "any time") + (opt.clean ? " · clean" : "");
  }

  function init() {
    var root = document.getElementById("w-casedef");
    if (!root) return;
    var body = root.querySelector(".widget-body");
    var seed = 20261021, data, examples, venn, truthAny, truthInc;
    var DEFAULT = { sr: true, ho: true, gp: false, incident: false, clean: false };
    var opt = JSON.parse(JSON.stringify(DEFAULT));
    var history = [];

    /* controls */
    var srcBoxes = {};
    function srcLabel(k, label) {
      var inp = h("input", { type: "checkbox" });
      inp.checked = opt[k];
      srcBoxes[k] = inp;
      inp.addEventListener("change", function () { opt[k] = inp.checked; update(true); });
      return h("label", { "class": "cd-opt" }, [inp, h("span", { "class": "cd-key cd-" + k, "aria-hidden": "true" }), h("span", { text: label })]);
    }
    var gSrc = h("fieldset", { "class": "cd-group" }, [h("legend", { text: "1 · Count MI records from" }),
      srcLabel("sr", "Self-report at the baseline visit"), srcLabel("ho", "Hospital records"),
      srcLabel("gp", "Primary care records (45% of people)")]);
    var rAny = h("input", { type: "radio", name: "cd-time", value: "any" }), rInc = h("input", { type: "radio", name: "cd-time", value: "inc" });
    rAny.checked = !opt.incident; rInc.checked = opt.incident;
    [rAny, rInc].forEach(function (r) { r.addEventListener("change", function () { opt.incident = rInc.checked; update(true); }); });
    var gTime = h("fieldset", { "class": "cd-group" }, [h("legend", { text: "2 · Which cases" }),
      h("label", { "class": "cd-opt" }, [rAny, h("span", { text: "Any time: before or after baseline" })]),
      h("label", { "class": "cd-opt" }, [rInc, h("span", { text: "Incident only: first counted record after baseline" })])]);
    var cClean = h("input", { type: "checkbox" });
    cClean.addEventListener("change", function () { opt.clean = cClean.checked; update(true); });
    var gCtl = h("fieldset", { "class": "cd-group" }, [h("legend", { text: "3 · Who can be a control" }),
      h("label", { "class": "cd-opt" }, [cClean, h("span", { text: "Exclude people with an MI record in a source you do not count" })])]);
    var bNew = h("button", { "class": "btn", type: "button", text: "New simulated cohort" });
    var bReset = h("button", { "class": "btn", type: "button", text: "Reset" });
    var buttons = h("div", { "class": "cd-buttons" }, [bNew, bReset]);
    body.appendChild(h("div", { "class": "cd-controls" }, [gSrc, gTime, gCtl, buttons]));

    /* output cards */
    var vennSvg = s("svg", { viewBox: "0 0 280 214", role: "img", "aria-label": "Venn diagram of record sources" });
    // the bar and forest plots are drawn at the width of their box, so their text stays at its set size
    var barSvg = s("svg", { viewBox: "0 0 300 74", role: "img", "aria-label": "Cases, controls and excluded" });
    var truthTbl = h("table", { "class": "cd-truth" });
    var forestSvg = s("svg", { viewBox: "0 0 300 186", role: "img", "aria-label": "Odds ratio estimates" });
    var readout = h("div", { "class": "readout cd-readout", "aria-live": "polite" });
    var exSvgWrap = h("div", { "class": "cd-ex" });
    var barWrap = h("div", { "class": "cd-fit" }, [barSvg]);
    var forestWrap = h("div", { "class": "cd-fit" }, [forestSvg]);
    var grid = h("div", { "class": "cd-grid" }, [
      h("div", { "class": "cd-card cd-venn" }, [h("div", { "class": "cd-h", text: "People with an MI record, by source (any date)" }), vennSvg]),
      h("div", { "class": "cd-card" }, [h("div", { "class": "cd-h", text: "Your definition labels 100,000 people" }), barWrap, truthTbl]),
      h("div", { "class": "cd-card cd-span" }, [h("div", { "class": "cd-h", text: "Per-allele odds ratio for MI (95% CI)" }), forestWrap])
    ]);
    body.appendChild(grid);
    body.appendChild(readout);
    body.appendChild(h("div", { "class": "cd-card cd-wide" }, [h("div", { "class": "cd-h", text: "Eight example people under your definition" }),
      h("div", { "class": "cd-legend", html:
        '<span><i class="cd-mk cd-sr"></i>self-report</span><span><i class="cd-mk cd-ho"></i>hospital record</span>' +
        '<span><i class="cd-mk cd-gp"></i>primary care record</span><span><b class="cd-x">✕</b>true MI (simulated truth)</span>' +
        '<span><i class="cd-mk cd-base"></i>baseline visit</span><span><i class="cd-cov"></i>years a source covers</span>' }),
      exSvgWrap]));

    bNew.addEventListener("click", function () { seed = (seed * 1103515245 + 12345) % 2147483647; newCohort(); });
    bReset.addEventListener("click", function () {
      seed = 20261021; opt = JSON.parse(JSON.stringify(DEFAULT)); history = [];
      ["sr", "ho", "gp"].forEach(function (k) { srcBoxes[k].checked = opt[k]; });
      rAny.checked = true; rInc.checked = false; cClean.checked = false;
      newCohort();
    });

    function newCohort() {
      data = simulate(seed, P);
      venn = vennCounts(data);
      examples = findExamples(data);
      truthAny = summarize(data, truthLabels(data, false), false);
      truthInc = summarize(data, truthLabels(data, true), true);
      history = [];
      update(false);
    }

    var current = null, lastSm = null;
    function update(pushHistory) {
      if (pushHistory && current) {
        history.unshift(current);
        if (history.length > 3) history.length = 3;
      }
      var lab = classify(data, opt);
      var sm = summarize(data, lab, opt.incident);
      lastSm = sm;
      current = { name: defName(opt), fit: sm.fit };
      drawVenn();
      drawBar(sm);
      drawTruth(sm);
      drawForest(sm);
      drawExamples(lab);
      var tr = opt.incident ? truthInc : truthAny;
      var txt = "Cases " + fmtInt(sm.nC) + " · controls " + fmtInt(sm.nK) + " · excluded " + fmtInt(sm.nX) + ". ";
      if (sm.fit) txt += "OR " + sm.fit.or.toFixed(3) + " (95% CI " + sm.fit.lo.toFixed(3) + "–" + sm.fit.hi.toFixed(3) + "), " + fmtP(sm.fit) + ". ";
      else txt += "No cases, so no estimate. ";
      txt += "With true MI status: OR " + tr.fit.or.toFixed(3) + ".";
      readout.textContent = txt;
    }

    function drawVenn() {
      while (vennSvg.firstChild) vennSvg.removeChild(vennSvg.firstChild);
      var C = { sr: [98, 82], ho: [172, 82], gp: [135, 138] }, R = 54;
      ["sr", "ho", "gp"].forEach(function (k) {
        var on = opt[k];
        vennSvg.appendChild(s("circle", { cx: C[k][0], cy: C[k][1], r: R, fill: on ? COL[k] : "none", "fill-opacity": on ? 0.16 : 0,
          stroke: on ? COL[k] : "var(--fg-faint)", "stroke-width": on ? 2 : 1.3, "stroke-dasharray": on ? "none" : "4 3" }));
      });
      var lab = [["sr", 14, 18, "start", "Self-report"], ["ho", 266, 18, "end", "Hospital"], ["gp", 84, 184, "end", "Primary care"]];
      lab.forEach(function (l) {
        var on = opt[l[0]];
        vennSvg.appendChild(s("text", { x: l[1], y: l[2], "text-anchor": l[3], "class": "t-sm",
          style: "font-weight:700;fill:" + (on ? "var(--fg)" : "var(--fg-faint)") }, l[4]));
        if (!on) vennSvg.appendChild(s("text", { x: l[1], y: l[2] + 14, "text-anchor": l[3], "class": "t-sm" }, "(not counted)"));
      });
      var pos = [["sr", 72, 70], ["ho", 198, 70], ["gp", 135, 166], ["srho", 135, 64], ["srgp", 104, 124], ["hogp", 166, 124], ["all", 135, 104]];
      pos.forEach(function (p) {
        vennSvg.appendChild(s("text", { x: p[1], y: p[2], "text-anchor": "middle", "class": "t-mono", style: "font-size:12px" }, fmtInt(venn[p[0]])));
      });
      vennSvg.appendChild(s("text", { x: 276, y: 208, "text-anchor": "end", "class": "t-sm" }, "no MI record: " + fmtInt(venn.none)));
    }

    function fitWidth(wrap, min) {
      return Math.max(min, Math.round(wrap.clientWidth || min));
    }

    function drawBar(sm) {
      while (barSvg.firstChild) barSvg.removeChild(barSvg.firstChild);
      var FW = fitWidth(barWrap, 240);
      barSvg.setAttribute("viewBox", "0 0 " + FW + " 74");
      barSvg.setAttribute("width", FW);
      barSvg.setAttribute("height", 74);
      hatchDef(barSvg, "cd-hatch-bar");
      var W = FW - 10, x = 5, tot = sm.nC + sm.nK + sm.nX;
      var segs = [["cases", sm.nC, "var(--bridge-soft)", "var(--bridge)"], ["controls", sm.nK, "var(--bg-alt)", "var(--border-strong)"],
                  ["excluded", sm.nX, "url(#cd-hatch-bar)", "var(--border-strong)"]];
      // the case and excluded segments are small; give every non-empty segment at least 3 px
      var widths = segs.map(function (sg) { return sg[1] ? Math.max(3, W * sg[1] / tot) : 0; });
      var extra = widths.reduce(function (a, b) { return a + b; }, 0) - W;
      widths[1] -= extra;
      segs.forEach(function (sg, k) {
        if (!widths[k]) return;
        barSvg.appendChild(s("rect", { x: x, y: 6, width: widths[k], height: 24, fill: sg[2], stroke: sg[3], "stroke-width": 1 }));
        x += widths[k];
      });
      var lx = 5, step = Math.max(80, Math.floor(W / 3));
      segs.forEach(function (sg) {
        var g = s("g");
        g.appendChild(s("rect", { x: lx, y: 42, width: 11, height: 11, fill: sg[2], stroke: sg[3] }));
        g.appendChild(s("text", { x: lx + 15, y: 52, "class": "t-sm", style: "fill:var(--fg)" }, sg[0]));
        g.appendChild(s("text", { x: lx + 15, y: 67, "class": "t-mono", style: "font-size:12px" }, fmtInt(sg[1])));
        barSvg.appendChild(g);
        lx += step;
      });
    }

    function drawTruth(sm) {
      truthTbl.innerHTML = "";
      var rows = [
        ["Cases with a true MI" + (opt.incident ? " after baseline" : ""), sm.nC ? (100 * sm.ppv).toFixed(1) + "%" : "–"],
        ["Controls who truly had an MI", fmtInt(sm.hiddenK)],
        ["People with a true MI in the cohort", fmtInt(truthAny.nC)]
      ];
      rows.forEach(function (r) {
        truthTbl.appendChild(h("tr", null, [h("td", { text: r[0] }), h("td", { "class": "num", text: r[1] })]));
      });
    }

    function drawForest(sm) {
      while (forestSvg.firstChild) forestSvg.removeChild(forestSvg.firstChild);
      var W = fitWidth(forestWrap, 260), wide = W >= 560;
      var lo = 0.9, hi = 1.6;
      // wide boxes: labels in a left column; narrow boxes: each label sits above its interval
      var X0 = wide ? Math.min(330, Math.round(W * 0.42)) : 12, X1 = W - 52;
      function X(v) { return X0 + (Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)) * (X1 - X0); }
      var tr = opt.incident ? truthInc : truthAny;
      var rows = [{ name: "true MI status (same timing)", fit: tr.fit, col: "var(--fg)" },
                  { name: "your definition: " + defName(opt), fit: sm.fit, col: "var(--bridge)" }];
      history.forEach(function (hh) { rows.push({ name: "earlier: " + hh.name, fit: hh.fit, col: "var(--fg-faint)" }); });
      var top = 6, rh = wide ? 25 : 32;
      var bottom = top + 5 * rh, H = bottom + (wide ? 40 : 54);
      forestSvg.setAttribute("viewBox", "0 0 " + W + " " + H);
      forestSvg.setAttribute("width", W);
      forestSvg.setAttribute("height", H);
      forestSvg.appendChild(s("line", { x1: X(1), y1: top, x2: X(1), y2: bottom, stroke: "var(--border-strong)" }));
      forestSvg.appendChild(s("line", { x1: X(tr.fit.or), y1: top, x2: X(tr.fit.or), y2: bottom, stroke: "var(--fg-muted)", "stroke-dasharray": "4 3" }));
      rows.forEach(function (r, k) {
        var y = top + k * rh, ly = wide ? y + rh / 2 : y + 22;
        var fill = k < 2 ? "var(--fg)" : "var(--fg-muted)";
        forestSvg.appendChild(s("text", { x: wide ? 12 : X0, y: wide ? ly + 4 : y + 11, "class": "t-sm",
          style: "paint-order:stroke;stroke:var(--bg);stroke-width:4px;stroke-linejoin:round;fill:" + fill + (k === 1 ? ";font-weight:700" : "") }, r.name));
        if (!r.fit) {
          forestSvg.appendChild(s("text", { x: X0, y: ly + 4, "class": "t-sm", style: "fill:var(--pitfall)" }, "no cases: no estimate"));
          return;
        }
        var a = Math.max(lo, r.fit.lo), b = Math.min(hi, r.fit.hi);
        forestSvg.appendChild(s("line", { x1: X(a), y1: ly, x2: X(b), y2: ly, stroke: r.col, "stroke-width": 2.2 }));
        forestSvg.appendChild(s("circle", { cx: X(Math.min(hi, Math.max(lo, r.fit.or))), cy: ly, r: 4.2, fill: r.col }));
        forestSvg.appendChild(s("text", { x: W - 6, y: ly + 4, "text-anchor": "end", "class": "t-mono", style: "font-size:12px;fill:" + fill }, r.fit.or.toFixed(2)));
      });
      if (!history.length) {
        forestSvg.appendChild(s("text", { x: wide ? 12 : X0, y: top + 2 * rh + (wide ? rh / 2 + 4 : 11), "class": "t-sm", style: "paint-order:stroke;stroke:var(--bg);stroke-width:4px;stroke-linejoin:round;fill:var(--fg-faint)" },
          "estimates from your earlier choices appear here"));
      }
      var ay = bottom + 4;
      forestSvg.appendChild(s("line", { x1: X0, y1: ay, x2: X1, y2: ay, stroke: "var(--fg-muted)" }));
      [0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6].forEach(function (v) {
        forestSvg.appendChild(s("line", { x1: X(v), y1: ay, x2: X(v), y2: ay + 4, stroke: "var(--fg-muted)" }));
        forestSvg.appendChild(s("text", { x: X(v), y: ay + 16, "text-anchor": "middle", "class": "t-sm" }, v.toFixed(1)));
      });
      if (wide) {
        forestSvg.appendChild(s("text", { x: (X0 + X1) / 2, y: ay + 32, "text-anchor": "middle", "class": "t-sm" }, "odds ratio per allele (log scale); dashed: true MI status"));
      } else {
        forestSvg.appendChild(s("text", { x: (X0 + X1) / 2, y: ay + 32, "text-anchor": "middle", "class": "t-sm" }, "odds ratio per allele (log scale)"));
        forestSvg.appendChild(s("text", { x: (X0 + X1) / 2, y: ay + 46, "text-anchor": "middle", "class": "t-sm" }, "dashed: true MI status"));
      }
    }

    function drawExamples(lab) {
      var W = Math.max(300, Math.round(exSvgWrap.clientWidth || 600));
      var narrow = W < 520;
      var rh = 46, top = 20, pill = narrow ? 74 : 86;
      var H = top + examples.length * rh + 26;
      var svg = s("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, role: "img",
        "aria-label": "Timelines of eight example people with their records and label" });
      hatchDef(svg, "cd-hatch-ex");
      var Y0 = 1975, Y1 = 2023.5, X0 = 8, X1 = W - pill - 14;
      function X(yr) { return X0 + (Math.max(Y0, yr) - Y0) / (Y1 - Y0) * (X1 - X0); }
      for (var yr = 1980; yr <= 2020; yr += 10) {
        svg.appendChild(s("line", { x1: X(yr), y1: top - 6, x2: X(yr), y2: H - 22, stroke: "var(--border)", "stroke-width": 0.8 }));
        svg.appendChild(s("text", { x: X(yr), y: H - 8, "text-anchor": "middle", "class": "t-sm" }, String(yr)));
      }
      svg.appendChild(s("text", { x: X1 + pill / 2 + 6, y: top - 6, "text-anchor": "middle", "class": "t-sm", style: "font-weight:700;fill:var(--fg)" }, "label"));
      examples.forEach(function (ex, k) {
        var i = ex.i, y = top + k * rh + 26;
        svg.appendChild(s("text", { x: X0, y: y - 19, "class": "t-sm", style: "fill:var(--fg)" }, String.fromCharCode(97 + k) + " · " + ex.text));
        // coverage bands
        svg.appendChild(s("rect", { x: X(P.HOSP_START), y: y + 6, width: X(P.END) - X(P.HOSP_START), height: 3, fill: COL.ho, "fill-opacity": 0.45 }));
        if (!isNaN(data.gpEnd[i])) svg.appendChild(s("rect", { x: X(P.GP_START), y: y + 10, width: X(data.gpEnd[i]) - X(P.GP_START), height: 3, fill: COL.gp, "fill-opacity": 0.5 }));
        svg.appendChild(s("line", { x1: X(Y0), y1: y, x2: X(P.END), y2: y, stroke: "var(--fg-faint)", "stroke-width": 1.2 }));
        svg.appendChild(s("rect", { x: X(data.B[i]) - 3.5, y: y - 3.5, width: 7, height: 7, fill: "var(--mm)" }));
        var t = data.T[i];
        if (!isNaN(t)) {
          var tx = X(t);
          svg.appendChild(s("path", { d: "M" + (tx - 4) + "," + (y - 15) + " l8,8 m0,-8 l-8,8", stroke: "var(--pitfall)", "stroke-width": 2, fill: "none" }));
        }
        // records: sources you do not count are hollow and drawn first, so a counted record on the same date stays visible
        var marks = [];
        if (!isNaN(data.gp[i])) marks.push({ k: "gp", x: X(data.gp[i]) });
        if (!isNaN(data.ho[i])) marks.push({ k: "ho", x: X(data.ho[i]) });
        if (!isNaN(data.sr[i])) marks.push({ k: "sr", x: X(data.sr[i]) });
        marks.sort(function (m1, m2) { return (opt[m1.k] ? 1 : 0) - (opt[m2.k] ? 1 : 0); });
        marks.forEach(function (m) {
          var f = opt[m.k] ? COL[m.k] : "var(--bg)";
          if (m.k === "sr") svg.appendChild(s("path", { d: "M" + m.x + "," + (y - 6) + " l6,6 l-6,6 l-6,-6 z", fill: f, stroke: COL.sr, "stroke-width": 1.6 }));
          else if (m.k === "ho") svg.appendChild(s("circle", { cx: m.x, cy: y, r: 5.2, fill: f, stroke: COL.ho, "stroke-width": 1.6 }));
          else svg.appendChild(s("rect", { x: m.x - 4.5, y: y - 4.5, width: 9, height: 9, fill: f, stroke: COL.gp, "stroke-width": 1.6 }));
        });
        var L = lab[i], px = X1 + 12;
        var fill = L === 1 ? "var(--bridge-soft)" : (L === 0 ? "var(--bg-alt)" : "url(#cd-hatch-ex)");
        var stroke = L === 1 ? "var(--bridge)" : "var(--border-strong)";
        var word = L === 1 ? "case" : (L === 0 ? "control" : "excluded");
        svg.appendChild(s("rect", { x: px, y: y - 11, width: pill - 4, height: 22, rx: 11, fill: fill, stroke: stroke }));
        svg.appendChild(s("text", { x: px + (pill - 4) / 2, y: y + 4, "text-anchor": "middle", "class": "t-sm", style: "font-weight:700;fill:var(--fg)" }, word));
      });
      exSvgWrap.innerHTML = "";
      exSvgWrap.appendChild(svg);
    }

    var lastW = 0, timer = null;
    function onResize() {
      var w = body.clientWidth;
      if (Math.abs(w - lastW) < 8) return;
      lastW = w;
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (!data || !lastSm) return;
        drawBar(lastSm);
        drawForest(lastSm);
        drawExamples(classify(data, opt));
      }, 120);
    }
    if (typeof ResizeObserver !== "undefined") new ResizeObserver(onResize).observe(body);
    else window.addEventListener("resize", onResize);

    newCohort();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
