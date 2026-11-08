/* Widget "From genotypes to Pe, Pf and Pa" (page: qc-grafanc.html, section #triangle).
   Root element: <div class="widget" id="w-grafanc">.

   What it shows (simulated, seeded, except the 1000 Genomes points). How GRAF-pop and GrafAnc turn one
   person's genotypes into three distances, a point in the plane of a reference triangle, barycentric
   weights and the reported percentages Pe, Pf, Pa.

   Simulated reference populations. 10,000 SNPs. For each SNP an ancestral allele frequency
   p0 ~ Uniform(0.05, 0.95); population F drifts from p0 with F_ST = 0.10; an ancestor N of the other
   populations drifts from p0 with 0.05; E (0.05), A (0.08) and X (0.06) drift from N. Drift uses the
   Balding-Nichols model: p_child ~ Beta(p k, (1 - p) k) with k = (1 - F_ST) / F_ST. Frequencies are
   kept in [0.01, 0.99]. X stands for a population that the reference triangle does not contain.
   Simulated people. A person has shares sE + sF + sA + sX = 1 (sliders). Each of the two copies of a
   SNP comes from a population chosen with these probabilities, so the copy carries allele 1 with
   probability pm = sE pE + sF pF + sA pA + sX pX and the genotype g (copies of allele 1) ~ Binomial(2, pm).
   Distance to reference population j over the S SNPs used (GRAF-pop, Jin et al. 2019):
       D_j = -(1/S) sum_l ln P(g_l | p_jl),   P(2|p) = p^2, P(1|p) = 2 p (1 - p), P(0|p) = (1 - p)^2.
   Triangle corners: the expected distances of a member of E, F or A to each reference,
       ED_mj = -(1/S) sum_l [ pm^2 ln pj^2 + 2 pm qm ln(2 pj qj) + qm^2 ln qj^2 ].
   Barycentric weights: the person's point Q = (D_E, D_F, D_A) is written as
       Q = V_F + lambdaE (V_E - V_F) + lambdaA (V_A - V_F) + z n,   lambdaF = 1 - lambdaE - lambdaA,
   solved by least squares (the 2 x 2 normal equations); n is the unit normal of the triangle's plane,
   oriented so that moving away from all three references is positive; z plays the role of GD3.
   GD1, GD2: the weights placed on GrafAnc's fixed triangle E (1.4758, 1.4370), F (1.0800, 1.1000),
   A (1.7045, 1.1000) (GrafAnc documentation), GD = lambdaE E + lambdaF F + lambdaA A.
   Percentages: P_m = 100 max(0, lambda_m) / sum_k max(0, lambda_k); raw values are 100 lambda_m.
   For the real points the weights come from GD1 and GD2 with GrafAnc's determinant formula:
       det = (yF - yA)(xE - xA) + (xA - xF)(yE - yA)
       lambdaE = ((yF - yA)(x - xA) + (xA - xF)(y - yA)) / det
       lambdaF = ((yA - yE)(x - xA) + (xE - xA)(y - yA)) / det,  lambdaA = 1 - lambdaE - lambdaF.
   Real data: mean GD1, GD2, GD3 of the 26 1000 Genomes populations from GrafAnc's PopMeanScores.txt
   (GrafAnc repository, MIT license, Copyright (c) 2025 University of Pennsylvania).
   Spread reference: GrafAnc's documentation gives SD(GD1) = -0.0001 + 0.83 / sqrt(n) for n genotyped
   ancestry SNPs.
   No libraries, no network; works from file://. The core is exported for Node tests. */
(function () {
  "use strict";

  /* ================================================================== core */
  function mulberry32(a) {
    a = a >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function normalGen(rand) {            // Box-Muller, both draws used
    var spare = null;
    return function () {
      if (spare !== null) { var s = spare; spare = null; return s; }
      var u = rand(); while (u <= 0) u = rand();
      var v = rand(), r = Math.sqrt(-2 * Math.log(u));
      spare = r * Math.sin(2 * Math.PI * v);
      return r * Math.cos(2 * Math.PI * v);
    };
  }
  /* Gamma(shape a, scale 1): Marsaglia & Tsang (2000); shape < 1 via Gamma(a + 1) * U^(1/a). */
  function rgamma(rand, norm, a) {
    if (a < 1) {
      var u0 = rand(); while (u0 <= 0) u0 = rand();
      return rgamma(rand, norm, a + 1) * Math.pow(u0, 1 / a);
    }
    var d = a - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) {
      var x, v;
      do { x = norm(); v = 1 + c * x; } while (v <= 0);
      v = v * v * v;
      var u = rand();
      if (u < 1 - 0.0331 * x * x * x * x) return d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }
  function rbeta(rand, norm, a, b) { var x = rgamma(rand, norm, a), y = rgamma(rand, norm, b); return x / (x + y); }
  function drift(rand, norm, p, F) { var k = (1 - F) / F; return rbeta(rand, norm, p * k, (1 - p) * k); }
  function clampP(p) { return Math.min(0.99, Math.max(0.01, p)); }

  var DRIFT = { F: 0.10, N: 0.05, E: 0.05, A: 0.08, X: 0.06 };
  var REF = ["E", "F", "A"];
  var M_MAX = 10000;
  var LN2 = Math.log(2);

  function makeRefs(seed, M) {
    var rand = mulberry32(seed), norm = normalGen(rand);
    var r = { E: new Float64Array(M), F: new Float64Array(M), A: new Float64Array(M), X: new Float64Array(M) };
    for (var l = 0; l < M; l++) {
      var p0 = 0.05 + 0.9 * rand();
      var pf = drift(rand, norm, p0, DRIFT.F), pn = drift(rand, norm, p0, DRIFT.N);
      r.F[l] = clampP(pf);
      r.E[l] = clampP(drift(rand, norm, pn, DRIFT.E));
      r.A[l] = clampP(drift(rand, norm, pn, DRIFT.A));
      r.X[l] = clampP(drift(rand, norm, pn, DRIFT.X));
    }
    return r;
  }
  /* ln P(g | p) for g = 0, 1, 2 at every SNP, for the three reference populations. */
  function logTables(refs) {
    var t = {};
    REF.forEach(function (k) {
      var p = refs[k], M = p.length, l0 = new Float64Array(M), l1 = new Float64Array(M), l2 = new Float64Array(M);
      for (var l = 0; l < M; l++) {
        var lp = Math.log(p[l]), lq = Math.log(1 - p[l]);
        l0[l] = 2 * lq; l1[l] = LN2 + lp + lq; l2[l] = 2 * lp;
      }
      t[k] = [l0, l1, l2];
    });
    return t;
  }
  function simPerson(rand, refs, S, sh) {
    var g = new Uint8Array(S);
    for (var l = 0; l < S; l++) {
      var pm = sh.E * refs.E[l] + sh.F * refs.F[l] + sh.A * refs.A[l] + sh.X * refs.X[l];
      g[l] = (rand() < pm ? 1 : 0) + (rand() < pm ? 1 : 0);
    }
    return g;
  }
  function distances(g, tabs, S) {
    return REF.map(function (k) {
      var T = tabs[k], s = 0;
      for (var l = 0; l < S; l++) s += T[g[l]][l];
      return -s / S;
    });
  }
  function expectedDistances(refs, tabs, S, m) {
    var pm = refs[m];
    return REF.map(function (k) {
      var T = tabs[k], s = 0;
      for (var l = 0; l < S; l++) { var p = pm[l], q = 1 - p; s += q * q * T[0][l] + 2 * p * q * T[1][l] + p * p * T[2][l]; }
      return -s / S;
    });
  }
  function vertices(refs, tabs, S) {
    return { E: expectedDistances(refs, tabs, S, "E"), F: expectedDistances(refs, tabs, S, "F"),
      A: expectedDistances(refs, tabs, S, "A"), X: expectedDistances(refs, tabs, S, "X") };
  }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  /* Barycentric weights of the projection of Q on the plane of the triangle V, and the signed height z. */
  function barycentric(Q, V) {
    var a = sub(V.E, V.F), b = sub(V.A, V.F), d = sub(Q, V.F);
    var aa = dot(a, a), ab = dot(a, b), bb = dot(b, b), ad = dot(a, d), bd = dot(b, d);
    var det = aa * bb - ab * ab;
    var lE = (bb * ad - ab * bd) / det, lA = (aa * bd - ab * ad) / det;
    var n = cross(a, b), nl = Math.sqrt(dot(n, n));
    n = [n[0] / nl, n[1] / nl, n[2] / nl];
    if (n[0] + n[1] + n[2] < 0) n = [-n[0], -n[1], -n[2]];
    return { E: lE, F: 1 - lE - lA, A: lA, z: dot(d, n) };
  }
  var VX = { E: [1.4758, 1.4370], F: [1.0800, 1.1000], A: [1.7045, 1.1000] };
  function toGD(l) {
    return [l.E * VX.E[0] + l.F * VX.F[0] + l.A * VX.A[0], l.E * VX.E[1] + l.F * VX.F[1] + l.A * VX.A[1]];
  }
  function fromGD(x, y) {
    var xE = VX.E[0], yE = VX.E[1], xF = VX.F[0], yF = VX.F[1], xA = VX.A[0], yA = VX.A[1];
    var det = (yF - yA) * (xE - xA) + (xA - xF) * (yE - yA);
    var e = ((yF - yA) * (x - xA) + (xA - xF) * (y - yA)) / det;
    var f = ((yA - yE) * (x - xA) + (xE - xA) * (y - yA)) / det;
    return { E: e, F: f, A: 1 - e - f };
  }
  function percentages(l) {
    var e = Math.max(0, l.E), f = Math.max(0, l.F), a = Math.max(0, l.A), s = e + f + a;
    return { E: 100 * e / s, F: 100 * f / s, A: 100 * a / s };
  }
  function sdGD1(n) { return -0.0001 + 0.83 / Math.sqrt(n); }

  /* Mean GD1, GD2, GD3 of the 1000 Genomes populations (GrafAnc PopMeanScores.txt, MIT license). */
  var TGP = [
    ["ACB", "AFR", "African Caribbean in Barbados", 1.1202, 1.1301, -0.0062],
    ["ASW", "AFR", "African Ancestry in Southwest US", 1.1597, 1.1562, -0.0125],
    ["ESN", "AFR", "Esan in Nigeria", 1.0735, 1.0982, 0.0045],
    ["GWD", "AFR", "Gambian in Western Division, The Gambia", 1.0855, 1.1072, 0.0065],
    ["LWK", "AFR", "Luhya in Webuye, Kenya", 1.0989, 1.1116, 0.0031],
    ["MSL", "AFR", "Mende in Sierra Leone", 1.0772, 1.1005, 0.0058],
    ["YRI", "AFR", "Yoruba in Ibadan, Nigeria", 1.0738, 1.0983, 0.0039],
    ["CLM", "AMR", "Colombian in Medellín, Colombia", 1.4954, 1.3574, 0.0074],
    ["MXL", "AMR", "Mexican Ancestry in Los Angeles, California", 1.5321, 1.3091, 0.0144],
    ["PEL", "AMR", "Peruvian in Lima, Peru", 1.5912, 1.2719, 0.0539],
    ["PUR", "AMR", "Puerto Rican in Puerto Rico", 1.4434, 1.3555, -0.0050],
    ["CDX", "EAS", "Chinese Dai in Xishuangbanna, China", 1.7003, 1.1015, 0.0045],
    ["CHB", "EAS", "Han Chinese in Beijing, China", 1.7052, 1.1019, 0.0034],
    ["CHS", "EAS", "Southern Han Chinese", 1.7072, 1.0978, 0.0030],
    ["JPT", "EAS", "Japanese in Tokyo, Japan", 1.7026, 1.1027, 0.0050],
    ["KHV", "EAS", "Kinh in Ho Chi Minh City, Vietnam", 1.6978, 1.1042, 0.0017],
    ["CEU", "EUR", "Utah residents (CEPH) with Northern and Western European ancestry", 1.4751, 1.4385, 0.0024],
    ["FIN", "EUR", "Finnish in Finland", 1.4966, 1.4158, 0.0021],
    ["GBR", "EUR", "British in England and Scotland", 1.4760, 1.4388, 0.0023],
    ["IBS", "EUR", "Iberian populations in Spain", 1.4608, 1.4295, 0.0039],
    ["TSI", "EUR", "Toscani in Italy", 1.4629, 1.4289, 0.0060],
    ["BEB", "SAS", "Bengali in Bangladesh", 1.5470, 1.2624, -0.0022],
    ["GIH", "SAS", "Gujarati Indians in Houston, Texas", 1.5202, 1.2961, 0.0046],
    ["ITU", "SAS", "Indian Telugu in the UK", 1.5251, 1.2818, 0.0078],
    ["PJL", "SAS", "Punjabi in Lahore, Pakistan", 1.5159, 1.3091, 0.0069],
    ["STU", "SAS", "Sri Lankan Tamil in the UK", 1.5260, 1.2786, 0.0089]
  ];

  var core = { mulberry32: mulberry32, makeRefs: makeRefs, logTables: logTables, simPerson: simPerson,
    distances: distances, expectedDistances: expectedDistances, vertices: vertices, barycentric: barycentric,
    toGD: toGD, fromGD: fromGD, percentages: percentages, sdGD1: sdGD1, TGP: TGP, VX: VX, DRIFT: DRIFT };
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  if (typeof document === "undefined") return;

  /* ================================================================== view */
  var SVGNS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function sv(tag, attrs, text) {
    var e = document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function fx(x, d) { var s = x.toFixed(d); return (s.charAt(0) === "-" ? "−" + s.slice(1) : s); }
  function pct(x) { var v = Math.abs(x) < 0.05 ? 0 : x; return fx(v, 1) + "%"; }
  function int(x) { return Math.round(x).toLocaleString("en-US"); }

  var SUPER_COL = { AFR: "var(--q2)", AMR: "var(--q4)", EAS: "var(--q3)", EUR: "var(--q1)", SAS: "var(--q7)" };
  var SUPER_NAME = { AFR: "AFR", AMR: "AMR", EAS: "EAS", EUR: "EUR", SAS: "SAS" };
  var PRESETS = [
    { label: "All from E", s: { F: 0, A: 0, X: 0 } },
    { label: "All from F", s: { F: 100, A: 0, X: 0 } },
    { label: "All from A", s: { F: 0, A: 100, X: 0 } },
    { label: "80% F, 20% E", s: { F: 80, A: 0, X: 0 } },
    { label: "50% E, 50% A", s: { F: 0, A: 50, X: 0 } },
    { label: "A third from each", s: { F: 33, A: 33, X: 0 } },
    { label: "All from X (not a reference)", s: { F: 0, A: 0, X: 100 } },
    { label: "50% E, 50% X", s: { F: 0, A: 0, X: 50 } }
  ];
  var N_PEOPLE = 40;
  var REF_SEED = 20261108;

  /* plot geometry */
  var W = 360, H = 292, ML = 46, MR = 12, MT = 14, MB = 42;
  var X0 = 1.0, X1 = 1.8, Y0 = 1.04, Y1 = 1.52;
  function px(x) { return ML + (x - X0) / (X1 - X0) * (W - ML - MR); }
  function py(y) { return H - MB - (y - Y0) / (Y1 - Y0) * (H - MT - MB); }
  function ix(sx) { return X0 + (sx - ML) / (W - ML - MR) * (X1 - X0); }
  function iy(sy) { return Y0 + (H - MB - sy) / (H - MT - MB) * (Y1 - Y0); }

  function init() {
    var root = document.getElementById("w-grafanc");
    if (!root) return;
    var body = root.querySelector(".widget-body") || root;
    body.innerHTML = "";

    var refs = makeRefs(REF_SEED, M_MAX), tabs = logTables(refs), vcache = {};
    var state = { F: 0, A: 0, X: 0, S: 1000, seed: 7, showTGP: true, look: -1 };

    /* ---- controls */
    var c1 = el("div", { "class": "controls" }); body.appendChild(c1);
    var lp = el("label", null, "<span>Person (simulated)</span>");
    var selP = el("select", { "aria-label": "Example person" });
    PRESETS.forEach(function (p, i) { selP.appendChild(el("option", { value: String(i) }, p.label)); });
    selP.appendChild(el("option", { value: "custom" }, "Your own mix (sliders)"));
    lp.appendChild(selP); c1.appendChild(lp);
    var lS = el("label", null, "<span>SNPs genotyped</span>");
    var selS = el("select", { "aria-label": "Number of SNPs used" });
    [100, 1000, 10000].forEach(function (v) { selS.appendChild(el("option", { value: String(v) }, int(v))); });
    lS.appendChild(selS); c1.appendChild(lS);
    var btn = el("button", { type: "button", "class": "btn" }, "New people");
    c1.appendChild(btn);

    var c2 = el("div", { "class": "controls ge-sliders" }); body.appendChild(c2);
    var sliders = {};
    [["F", "Share from F"], ["A", "Share from A"], ["X", "Share from X"]].forEach(function (k) {
      var lab = el("label", null, "<span>" + k[1] + "</span>");
      var r = el("input", { type: "range", min: "0", max: "100", step: "1", "aria-label": k[1] + " in percent" });
      var o = el("output", { "class": "ge-val" });
      lab.appendChild(r); lab.appendChild(o); c2.appendChild(lab);
      sliders[k[0]] = { r: r, o: o };
    });
    var eOut = el("span", { "class": "ge-e" }); c2.appendChild(eOut);

    /* ---- plane */
    var fig = el("div", { "class": "ge-plane" }); body.appendChild(fig);
    var svg = sv("svg", { viewBox: "0 0 " + W + " " + H, role: "img",
      "aria-label": "GD1 against GD2: the reference triangle E, F, A, the simulated people and the 1000 Genomes population means" });
    fig.appendChild(svg);
    var defs = sv("defs"); svg.appendChild(defs);
    var cp = sv("clipPath", { id: "ge-clip" }); defs.appendChild(cp);
    cp.appendChild(sv("rect", { x: ML, y: MT, width: W - ML - MR, height: H - MT - MB }));
    svg.appendChild(sv("rect", { x: ML, y: MT, width: W - ML - MR, height: H - MT - MB, fill: "none", stroke: "var(--border, #d0d6de)" }));
    [1.0, 1.2, 1.4, 1.6, 1.8].forEach(function (t) {
      svg.appendChild(sv("line", { x1: px(t), x2: px(t), y1: MT, y2: H - MB, stroke: "var(--border, #e3e7ec)", "stroke-width": "0.6" }));
      svg.appendChild(sv("text", { x: px(t), y: H - MB + 15, "class": "t-sm", "text-anchor": "middle" }, t.toFixed(1)));
    });
    [1.1, 1.2, 1.3, 1.4, 1.5].forEach(function (t) {
      svg.appendChild(sv("line", { x1: ML, x2: W - MR, y1: py(t), y2: py(t), stroke: "var(--border, #e3e7ec)", "stroke-width": "0.6" }));
      svg.appendChild(sv("text", { x: ML - 6, y: py(t) + 4, "class": "t-sm", "text-anchor": "end" }, t.toFixed(1)));
    });
    svg.appendChild(sv("text", { x: (ML + W - MR) / 2, y: H - 8, "class": "t-sm t-b", "text-anchor": "middle" }, "GD1"));
    svg.appendChild(sv("text", { x: 12, y: (MT + H - MB) / 2, "class": "t-sm t-b", "text-anchor": "middle",
      transform: "rotate(-90 12 " + ((MT + H - MB) / 2) + ")" }, "GD2"));
    var gPlot = sv("g", { "clip-path": "url(#ge-clip)" }); svg.appendChild(gPlot);
    var tri = [VX.E, VX.F, VX.A].map(function (v) { return px(v[0]).toFixed(1) + "," + py(v[1]).toFixed(1); }).join(" ");
    gPlot.appendChild(sv("polygon", { points: tri, fill: "var(--bg-soft, #f4f6f8)", stroke: "var(--fg-muted, #5a6370)", "stroke-width": "1.2" }));
    var gTGP = sv("g"); gPlot.appendChild(gTGP);
    var gPeople = sv("g"); gPlot.appendChild(gPeople);
    var gMarks = sv("g"); gPlot.appendChild(gMarks);
    /* corner labels */
    svg.appendChild(sv("text", { x: px(VX.E[0]), y: py(VX.E[1]) - 7, "class": "t-sm t-b", "text-anchor": "middle" }, "E"));
    svg.appendChild(sv("text", { x: px(VX.F[0]) + 4, y: py(VX.F[1]) + 16, "class": "t-sm t-b", "text-anchor": "start" }, "F"));
    svg.appendChild(sv("text", { x: px(VX.A[0]) - 4, y: py(VX.A[1]) + 16, "class": "t-sm t-b", "text-anchor": "end" }, "A"));

    var tgpNodes = TGP.map(function (row, i) {
      var c = sv("circle", { cx: px(row[3]).toFixed(1), cy: py(row[4]).toFixed(1), r: "3.6", fill: SUPER_COL[row[1]],
        stroke: "#fff", "stroke-width": "0.8", "class": "ge-tgp" });
      c.appendChild(sv("title", null, row[0] + " (" + row[1] + "): " + row[2]));
      c.addEventListener("pointerenter", function () { state.look = i; selL.value = String(i); drawLook(); });
      c.addEventListener("click", function (ev) { ev.stopPropagation(); state.look = i; selL.value = String(i); drawLook(); });
      gTGP.appendChild(c);
      return c;
    });

    /* legend */
    var leg = el("div", { "class": "ge-legend" }); body.appendChild(leg);
    var legH = [];
    ["AFR", "AMR", "EAS", "EUR", "SAS"].forEach(function (k) {
      legH.push('<span><i class="ge-sw" style="background:' + SUPER_COL[k] + '"></i>' + SUPER_NAME[k] + "</span>");
    });
    legH.push('<span><i class="ge-sw ge-sw-sim"></i>simulated people</span>');
    legH.push('<span><i class="ge-sw ge-sw-me"></i>the first of them</span>');
    legH.push('<span><i class="ge-sw ge-sw-true"></i>true mix</span>');
    leg.innerHTML = '<span class="ge-legend-h">1000 Genomes means (real):</span> ' + legH.slice(0, 5).join("") + '<br><span class="ge-legend-h">Simulated:</span> ' + legH.slice(5).join("");

    var c3 = el("div", { "class": "controls" }); body.appendChild(c3);
    var lT = el("label", { "class": "ge-check" });
    var cbT = el("input", { type: "checkbox", checked: "checked" });
    lT.appendChild(cbT); lT.appendChild(document.createTextNode(" Show 1000 Genomes means"));
    c3.appendChild(lT);
    var lL = el("label", null, "<span>Look up a population</span>");
    var selL = el("select", { "aria-label": "Look up a 1000 Genomes population" });
    selL.appendChild(el("option", { value: "-1" }, "none"));
    TGP.forEach(function (row, i) { selL.appendChild(el("option", { value: String(i) }, row[0] + " · " + row[2])); });
    lL.appendChild(selL); c3.appendChild(lL);

    /* table and readout */
    var tblWrap = el("div", { "class": "ge-table-wrap" }); body.appendChild(tblWrap);
    var out = el("div", { "class": "readout ge-out", "aria-live": "polite" }); body.appendChild(out);
    var look = el("div", { "class": "readout ge-look", "aria-live": "polite" }); body.appendChild(look);
    body.appendChild(el("p", { "class": "note" }, "Simulated: four populations drawn from one ancestor; E, A and X share a branch and F split first. " +
      "Click or tap inside the triangle to set the person's shares of E, F and A. The colored points are real: mean scores of the 26 1000 Genomes populations from GrafAnc's PopMeanScores.txt (MIT license)."));

    function vertsFor(S) { if (!vcache[S]) vcache[S] = vertices(refs, tabs, S); return vcache[S]; }

    function syncSliders() {
      ["F", "A", "X"].forEach(function (k) { sliders[k].r.value = String(state[k]); sliders[k].o.textContent = state[k] + "%"; });
      eOut.textContent = "Share from E: " + (100 - state.F - state.A - state.X) + "%";
    }
    function setShare(k, v) {
      state[k] = v;
      var others = ["F", "A", "X"].filter(function (o) { return o !== k; });
      var over = state.F + state.A + state.X - 100;
      if (over > 0) {   // shrink the other two shares in proportion so that the share from E becomes 0
        var a = others[0], b = others[1], tot = state[a] + state[b];
        state[a] = tot > 0 ? Math.floor(state[a] * (100 - state[k]) / tot) : 0;
        state[b] = 100 - state[k] - state[a];
      }
    }

    function compute() {
      var S = state.S, V = vertsFor(S);
      var sh = { F: state.F / 100, A: state.A / 100, X: state.X / 100 };
      sh.E = Math.max(0, 1 - sh.F - sh.A - sh.X);
      var rand = mulberry32(state.seed * 7919 + S);
      var people = [];
      for (var i = 0; i < N_PEOPLE; i++) {
        var g = simPerson(rand, refs, S, sh);
        var D = distances(g, tabs, S);
        var b = barycentric(D, V);
        people.push({ D: D, b: b, gd: toGD(b) });
      }
      return { S: S, V: V, sh: sh, people: people };
    }

    function render() {
      syncSliders();
      var res = compute();
      /* people */
      while (gPeople.firstChild) gPeople.removeChild(gPeople.firstChild);
      while (gMarks.firstChild) gMarks.removeChild(gMarks.firstChild);
      res.people.forEach(function (p, i) {
        if (i === 0) return;
        gPeople.appendChild(sv("circle", { cx: px(p.gd[0]).toFixed(1), cy: py(p.gd[1]).toFixed(1), r: "2.4",
          fill: "var(--fg, #1d2127)", "fill-opacity": "0.35" }));
      });
      if (res.sh.X === 0) {
        var tg = toGD({ E: res.sh.E, F: res.sh.F, A: res.sh.A });
        gMarks.appendChild(sv("circle", { cx: px(tg[0]).toFixed(1), cy: py(tg[1]).toFixed(1), r: "7.5", fill: "none",
          stroke: "var(--fg, #1d2127)", "stroke-width": "1.4", "stroke-dasharray": "3 2" }));
      }
      var me = res.people[0];
      gMarks.appendChild(sv("circle", { cx: px(me.gd[0]).toFixed(1), cy: py(me.gd[1]).toFixed(1), r: "5",
        fill: "var(--accent, #0a62c2)", stroke: "#fff", "stroke-width": "1.4" }));

      /* table of distances */
      var rows = [["The first simulated person", me.D]];
      rows.push(["Expected for a member of E", res.V.E], ["Expected for a member of F", res.V.F], ["Expected for a member of A", res.V.A]);
      if (res.sh.X > 0) rows.push(["Expected for a member of X", res.V.X]);
      var t = ['<table class="ge-table"><thead><tr><th scope="col">Average −ln P(genotype) per SNP</th><th scope="col">to E</th><th scope="col">to F</th><th scope="col">to A</th></tr></thead><tbody>'];
      rows.forEach(function (r, i) {
        t.push("<tr" + (i === 0 ? ' class="ge-me"' : "") + '><th scope="row">' + r[0] + "</th><td>" + fx(r[1][0], 3) + "</td><td>" + fx(r[1][1], 3) + "</td><td>" + fx(r[1][2], 3) + "</td></tr>");
      });
      t.push("</tbody></table>");
      tblWrap.innerHTML = t.join("");

      /* readout */
      var P = percentages(me.b);
      var m1 = 0, m2 = 0;
      res.people.forEach(function (p) { m1 += p.gd[0]; m2 += p.gd[0] * p.gd[0]; });
      var mean = m1 / N_PEOPLE, sd = Math.sqrt(Math.max(0, m2 / N_PEOPLE - mean * mean) * N_PEOPLE / (N_PEOPLE - 1));
      var zbar = 0; res.people.forEach(function (p) { zbar += p.b.z; }); zbar /= N_PEOPLE;
      var h = [];
      h.push("<p><strong>True mix:</strong> E " + Math.round(res.sh.E * 100) + "%, F " + state.F + "%, A " + state.A + "%, X " + state.X + "%</p>");
      h.push("<p><strong>Raw weights</strong> (RawPe, RawPf, RawPa): E " + pct(100 * me.b.E) + ", F " + pct(100 * me.b.F) + ", A " + pct(100 * me.b.A) + "</p>");
      h.push("<p><strong>Reported</strong> after setting negative weights to 0 and rescaling: Pe " + pct(P.E) + ", Pf " + pct(P.F) + ", Pa " + pct(P.A) + "</p>");
      h.push("<p><strong>Scores:</strong> GD1 " + fx(me.gd[0], 4) + ", GD2 " + fx(me.gd[1], 4) + ", height above the triangle (GD3, simulated scale) " + fx(me.b.z, 4) +
        " · mean height of the " + N_PEOPLE + " people " + fx(zbar, 4) + "</p>");
      h.push("<p><strong>Spread of GD1</strong> across the " + N_PEOPLE + " simulated people: SD " + fx(sd, 3) + " with " + int(res.S) +
        " SNPs. GrafAnc's documentation gives about 0.83 / √n = " + fx(sdGD1(res.S), 3) + " for n of its own SNPs.</p>");
      if (res.sh.X > 0) h.push('<p class="ge-warn">X has no corner in the triangle, so its share is reported as a mix of E, F and A. In this three-reference picture, a height above zero is the only sign of it.</p>');
      out.innerHTML = h.join("");
      drawLook();
    }

    function drawLook() {
      tgpNodes.forEach(function (c, i) {
        c.setAttribute("r", i === state.look ? "6" : "3.6");
        c.setAttribute("stroke", i === state.look ? "var(--fg, #1d2127)" : "#fff");
        c.setAttribute("stroke-width", i === state.look ? "1.6" : "0.8");
      });
      if (state.look >= 0) gTGP.appendChild(tgpNodes[state.look]);   // draw on top
      gTGP.style.display = state.showTGP ? "" : "none";
      if (state.look < 0 || !state.showTGP) { look.innerHTML = "<p>Hover over, tap or look up a 1000 Genomes population to see its mean scores.</p>"; return; }
      var row = TGP[state.look], l = fromGD(row[3], row[4]), P = percentages(l);
      look.innerHTML = "<p><strong>" + row[0] + "</strong> (" + row[1] + ", " + row[2] + "), real mean scores: GD1 " + fx(row[3], 4) + ", GD2 " + fx(row[4], 4) +
        ", GD3 " + fx(row[5], 4) + "</p><p>Raw weights: E " + pct(100 * l.E) + ", F " + pct(100 * l.F) + ", A " + pct(100 * l.A) +
        " · reported: Pe " + pct(P.E) + ", Pf " + pct(P.F) + ", Pa " + pct(P.A) + "</p>";
    }

    /* ---- events */
    selP.addEventListener("change", function () {
      if (selP.value === "custom") return;
      var p = PRESETS[+selP.value].s;
      state.F = p.F; state.A = p.A; state.X = p.X;
      render();
    });
    selS.addEventListener("change", function () { state.S = +selS.value; render(); });
    btn.addEventListener("click", function () { state.seed = (Math.imul(state.seed, 1103515245) + 12345) >>> 0; render(); });
    ["F", "A", "X"].forEach(function (k) {
      sliders[k].r.addEventListener("input", function () { setShare(k, +sliders[k].r.value); selP.value = "custom"; render(); });
    });
    cbT.addEventListener("change", function () { state.showTGP = cbT.checked; drawLook(); });
    selL.addEventListener("change", function () { state.look = +selL.value; drawLook(); });
    svg.addEventListener("click", function (ev) {
      var rect = svg.getBoundingClientRect();
      if (!rect.width) return;
      var sx = (ev.clientX - rect.left) / rect.width * W, sy = (ev.clientY - rect.top) / rect.height * H;
      var l = fromGD(ix(sx), iy(sy));
      if (l.E < -0.005 || l.F < -0.005 || l.A < -0.005) return;
      state.F = Math.max(0, Math.round(100 * l.F)); state.A = Math.max(0, Math.round(100 * l.A)); state.X = 0;
      if (state.F + state.A > 100) state.A = 100 - state.F;
      selP.value = "custom";
      render();
    });

    selP.value = "3";
    var p0 = PRESETS[3].s; state.F = p0.F; state.A = p0.A; state.X = p0.X;
    selS.value = String(state.S);
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
