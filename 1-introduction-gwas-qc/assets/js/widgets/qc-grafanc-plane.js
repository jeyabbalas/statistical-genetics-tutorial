/* Widget "The toy study on the lab's GD1-GD2 plane" (page: qc-grafanc.html, section #distribution).
   Root element: <div class="widget" id="w-grafanc-plane"> with an empty .widget-body.

   Reads ${analysis_dir}/toy_grafanc_out.txt (GrafAnc's output table: a header line, then one line per person,
   tab-separated) with Lab.parseTable and redraws on lab:fs-change. Columns are found by name: Sample, GD1, GD2,
   GD3, Pe, Pf, Pa, AncGroupID, and the ancestry-SNP count (#SNPs, SNPs or NumSNPs, whichever exists).
   Pe, Pf, Pa are percentages in GrafAnc; if every value is at most 1 they are taken as fractions and shown
   multiplied by 100.

   Drawn with Lab.plot.scatter: x = GD1, y = GD2 (or GD3). Toy people are colored by the continental group,
   the first digit of AncGroupID (the practical's coding: 1 AFR, 2 MEN, 3 EUR, 4 SAS, 5 EAS, 6 AMR, 7 OCN,
   8 MIX). The geometry is the lab's, not real GrafAnc's (the toy triangle is smaller; CORE.md):
     - the triangle E, F, A comes from window.GrafAncCore.stats.vertices() and is drawn over the chart after
       each redraw on the GD1-GD2 view;
     - gray points: the mean GD1, GD2, GD3 of each toy population of toy_1kg, the lab's stand-in for GrafAnc's
       PopMeanScores.txt. The widget scores the panel people once, with PlinkCore.readBfile on the toy_1kg
       files of window.TOY_FILES and GrafAncCore.stats.scores, and groups them by the pop column of the toy
       panel file (TOY_FILES "_panel/integrated_call_samples_v3.20130502.ALL.panel").
   Population names in the tooltips are those of the 1000 Genomes populations that the toy populations are
   named after. Because F and A have the same GD2, inside the triangle Pe = 100 (GD2 - GD2_F) / (GD2_E - GD2_F),
   so the Pe flag line is the horizontal line at that GD2. The count of flagged people uses the Pe column
   itself. Without GrafAncCore or PlinkCore the widget plots the people alone.

   No libraries. The DOM-free core is exported for Node tests. */
(function () {
  "use strict";

  var OUT = "${analysis_dir}/toy_grafanc_out.txt";
  var CONT = { 1: "AFR", 2: "MEN", 3: "EUR", 4: "SAS", 5: "EAS", 6: "AMR", 7: "OCN", 8: "MIX" };
  var MEANS = "toy panel means";
  var GROUP_ORDER = [MEANS, "EUR", "AFR", "EAS", "SAS", "AMR", "MEN", "OCN", "MIX", "no group"];
  var COLORS = { "toy panel means": "var(--fg-faint)", AFR: "var(--q2)", AMR: "var(--q4)", EAS: "var(--q3)", EUR: "var(--q1)",
    SAS: "var(--q7)", MEN: "var(--q8)", OCN: "var(--q5)", MIX: "var(--q6)", "no group": "var(--fg)" };
  var PANEL_KEY = "_panel/integrated_call_samples_v3.20130502.ALL.panel";
  var REF_KEY = "data/inputs/ref/toy_1kg";
  /* 1000 Genomes populations: code, super-population, name, and the mean GD1, GD2, GD3 of real GrafAnc
     (PopMeanScores.txt). Only the names are used here, for the toy populations named after them. */
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

  /* ================================================================== core */
  function str(x) { return x == null ? "" : String(x); }
  function unquote(x) { return str(x).replace(/^"(.*)"$/, "$1"); }
  function findCol(t, names) {
    for (var i = 0; i < names.length; i++) { var j = t.index(names[i]); if (j >= 0) return j; }
    return -1;
  }
  function continental(id) {
    var v = Number(id);
    if (!isFinite(v)) return "no group";
    return CONT[Math.floor(v / 100)] || "no group";
  }
  /* t: a parsed table of GrafAnc output. Returns {people, missing: [column names], scale}. */
  function build(t) {
    var J = {
      sample: findCol(t, ["Sample", "sample", "SAMPLE"]),
      snps: findCol(t, ["#SNPs", "SNPs", "NumSNPs", "Num_SNPs", "nSNPs"]),
      gd1: findCol(t, ["GD1"]), gd2: findCol(t, ["GD2"]), gd3: findCol(t, ["GD3"]),
      pe: findCol(t, ["Pe", "P_e", "PE"]), pf: findCol(t, ["Pf", "P_f", "PF"]), pa: findCol(t, ["Pa", "P_a", "PA"]),
      grp: findCol(t, ["AncGroupID", "AncGroup", "GroupID"])
    };
    var missing = [];
    ["sample", "gd1", "gd2", "pe", "pf", "pa", "grp"].forEach(function (k) { if (J[k] < 0) missing.push(k); });
    var people = t.rows.map(function (r) {
      function num(j) { return j >= 0 ? Number(r[j]) : NaN; }
      return { sample: J.sample >= 0 ? str(r[J.sample]) : "", snps: num(J.snps), gd1: num(J.gd1), gd2: num(J.gd2), gd3: num(J.gd3),
        pe: num(J.pe), pf: num(J.pf), pa: num(J.pa), grp: J.grp >= 0 ? str(r[J.grp]) : "" };
    });
    var maxP = 0;
    people.forEach(function (p) { [p.pe, p.pf, p.pa].forEach(function (v) { if (isFinite(v) && v > maxP) maxP = v; }); });
    var scale = people.length && maxP <= 1.0001 ? 100 : 1;
    if (scale !== 1) people.forEach(function (p) { p.pe *= scale; p.pf *= scale; p.pa *= scale; });
    people.forEach(function (p) { p.cont = continental(p.grp); });
    return { people: people, missing: missing, scale: scale };
  }
  function flagPe(people, below) {
    return people.filter(function (p) { return isFinite(p.pe) && p.pe < below; });
  }
  /* vx: {E: [GD1, GD2], F: [...], A: [...]}. */
  function gd2OfPe(pe, vx) { return vx.F[1] + (vx.E[1] - vx.F[1]) * pe / 100; }
  function counts(people) {
    var c = Object.create(null);
    people.forEach(function (p) { c[p.cont] = (c[p.cont] || 0) + 1; });
    return c;
  }
  /* The triangle from GrafAncCore.stats.vertices() ({E: {x, y, z}, ...}), or null. */
  function vertices(G) {
    try {
      var v = G && G.stats && G.stats.vertices ? G.stats.vertices() : null;
      if (!v || !v.E || !v.F || !v.A) return null;
      var out = {};
      ["E", "F", "A"].forEach(function (k) { out[k] = [Number(v[k].x), Number(v[k].y)]; });
      return [out.E, out.F, out.A].every(function (p) { return isFinite(p[0]) && isFinite(p[1]); }) ? out : null;
    } catch (e) { return null; }
  }
  var NAMES = Object.create(null);
  TGP.forEach(function (r) { NAMES[r[0]] = r; });
  /* results: GrafAncCore.stats.scores(...).results; panelText: the panel file (sample pop super_pop gender).
     Returns one entry per pop with at least one scored person: {code, sp, n, gd1, gd2, gd3, pe}. */
  function panelMeans(results, panelText) {
    var pop = Object.create(null), sp = Object.create(null);
    String(panelText || "").split(/\r?\n/).slice(1).forEach(function (l) {
      var c = l.trim().split(/\s+/);
      if (c.length >= 3) { pop[c[0]] = c[1]; sp[c[1]] = c[2]; }
    });
    var acc = Object.create(null), order = [];
    (results || []).forEach(function (r) {
      var code = pop[unquote(r.name)];
      if (!code || !isFinite(r.gd1) || !isFinite(r.gd2)) return;
      if (!acc[code]) { acc[code] = { code: code, sp: sp[code] || "", n: 0, gd1: 0, gd2: 0, gd3: 0, pe: 0 }; order.push(code); }
      var a = acc[code];
      a.n++; a.gd1 += r.gd1; a.gd2 += r.gd2; a.gd3 += isFinite(r.gd3) ? r.gd3 : 0; a.pe += isFinite(r.pe) ? r.pe : 0;
    });
    return order.map(function (k) {
      var a = acc[k];
      return { code: a.code, sp: a.sp, n: a.n, gd1: a.gd1 / a.n, gd2: a.gd2 / a.n, gd3: a.gd3 / a.n, pe: a.pe / a.n };
    });
  }

  var core = { build: build, flagPe: flagPe, gd2OfPe: gd2OfPe, counts: counts, continental: continental, unquote: unquote,
    vertices: vertices, panelMeans: panelMeans, TGP: TGP };
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  if (typeof document === "undefined") return;

  /* ================================================================== widget */
  var root = document.getElementById("w-grafanc-plane");
  if (!root) return;
  var body = root.querySelector(".widget-body") || root;
  var SVGNS = "http://www.w3.org/2000/svg";

  function el(tag, attrs) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "class") e.className = attrs[k]; else e.setAttribute(k, attrs[k]);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null) continue;
      e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return e;
  }
  function sv(tag, attrs) {
    var e = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }

  if (!window.Lab) {
    body.appendChild(el("p", { "class": "note" }, "This widget needs the lab (assets/js/lab/lab.js), which did not load."));
    return;
  }

  var state = { y: "gd2", pe: 80 };
  var data = null, chart = null, running = false;

  /* The lab's geometry, computed once: the toy triangle and the toy panel's population means. */
  var geo = null;
  function fileText(f) {
    if (!f) return null;
    if (f.text != null) return String(f.text);
    return f.b64 != null ? new TextDecoder().decode(fileBytes(f)) : null;
  }
  function fileBytes(f) {
    if (!f || f.b64 == null) return null;
    var bin = atob(f.b64), u = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }
  function geometry() {
    if (geo) return geo;
    geo = { vx: vertices(window.GrafAncCore), means: [] };
    try {
      var F = window.TOY_FILES || {};
      var bed = fileBytes(F[REF_KEY + ".bed"]), bim = fileText(F[REF_KEY + ".bim"]), fam = fileText(F[REF_KEY + ".fam"]);
      if (window.PlinkCore && window.GrafAncCore && bed && bim && fam) {
        var res = window.GrafAncCore.stats.scores(window.PlinkCore.readBfile(bed, bim, fam));
        geo.means = panelMeans(res.results, fileText(F[PANEL_KEY]));
      }
    } catch (e) { geo.means = []; }
    return geo;
  }

  var selY = el("select", { "aria-label": "Score on the vertical axis" },
    el("option", { value: "gd2" }, "GD2 (the triangle's plane)"), el("option", { value: "gd3" }, "GD3 (height above it)"));
  var runBtn = el("button", { type: "button", "class": "btn primary", hidden: "" }, "Run step 8");
  var status = el("span", { "class": "note", role: "status" }, "Waiting for the lab…");
  body.appendChild(el("div", { "class": "controls" }, el("label", null, "Vertical axis ", selY), runBtn, status));
  var plotEl = el("div", { "class": "gp-plot" });
  body.appendChild(plotEl);
  var peIn = el("input", { type: "range", min: "0", max: "100", step: "1", value: String(state.pe), "aria-label": "Flag people with Pe below this percentage" });
  var peOut = el("output", null, state.pe + "%");
  body.appendChild(el("div", { "class": "controls" }, el("label", null, "Flag people with Pe below ", peIn, peOut)));
  var readout = el("p", { "aria-live": "polite" });
  var list = el("p", { "class": "note" });
  body.appendChild(readout);
  body.appendChild(list);

  function f4(v) { return isFinite(v) ? v.toFixed(4) : "NA"; }
  function f1(v) { return isFinite(v) ? v.toFixed(1) : "NA"; }

  function load() {
    var t = null;
    if (Lab.fs.exists(OUT)) {
      var text = Lab.fs.readText(OUT) || "";
      var first = text.split("\n")[0] || "";
      t = Lab.parseTable(text, { header: true, sep: first.indexOf("\t") >= 0 ? /\t/ : undefined });
    }
    runBtn.hidden = !!t || running;
    if (!t || !t.n) {
      data = null;
      if (chart) { chart.destroy(); chart = null; }
      plotEl.textContent = "";
      plotEl.appendChild(el("p", { "class": "note" }, "No GrafAnc output yet. Run the step 8 commands in the terminal above (unique IDs, then GrafAnc), or press the button."));
      readout.textContent = ""; list.textContent = "";
      if (!running) status.textContent = runError;
      return;
    }
    data = build(t);
    if (data.missing.length) {
      status.textContent = "toy_grafanc_out.txt lacks the columns " + data.missing.join(", ") + "; the widget cannot plot it.";
      return;
    }
    if (!running) status.textContent = data.people.length + " people in toy_grafanc_out.txt.";
    draw();
  }

  function drawTriangle(c) {
    var VX = geometry().vx;
    if (!VX || state.y !== "gd2" || !c.svg || typeof c.sx !== "function") return;
    var pts = [VX.E, VX.F, VX.A].map(function (v) { return c.sx(v[0]).toFixed(1) + "," + c.sy(v[1]).toFixed(1); });
    var g = sv("g", { "class": "gp-tri", "aria-hidden": "true" });
    g.appendChild(sv("polygon", { points: pts.join(" "), fill: "none", stroke: "currentColor", "stroke-width": "1.2" }));
    var dots = c.svg.querySelector(".lp-dots");
    if (dots) c.svg.insertBefore(g, dots); else c.svg.appendChild(g);
    /* The corner letters go on top of the points, with a halo in the page background, so a dense cloud
       at a corner cannot hide them. E sits below its corner, inside the triangle, where nobody is. */
    var lab = sv("g", { "class": "gp-tri", "aria-hidden": "true" });
    [["E", VX.E, 0, 22], ["F", VX.F, 14, 18], ["A", VX.A, -14, 18]].forEach(function (d) {
      var tx = sv("text", { x: (c.sx(d[1][0]) + d[2]).toFixed(1), y: (c.sy(d[1][1]) + d[3]).toFixed(1), "text-anchor": "middle",
        "font-size": "12", "font-weight": "700", fill: "currentColor", stroke: "var(--bg)", "stroke-width": "3", "paint-order": "stroke" });
      tx.textContent = d[0];
      lab.appendChild(tx);
    });
    c.svg.appendChild(lab);
  }

  function draw() {
    if (!data) return;
    var yk = state.y, yl = yk === "gd2" ? "GD2" : "GD3", g = geometry(), VX = g.vx;
    var pts = g.means.map(function (m) {
      return { x: m.gd1, y: yk === "gd2" ? m.gd2 : m.gd3, group: MEANS, label: m.code, mean: m };
    });
    data.people.forEach(function (p) {
      pts.push({ x: p.gd1, y: yk === "gd2" ? p.gd2 : p.gd3, group: p.cont, label: unquote(p.sample), person: p });
    });
    var flagged = flagPe(data.people, state.pe);
    var refLines = yk === "gd2" ? (VX ? [{ y: gd2OfPe(state.pe, VX), extend: false, label: "Pe = " + state.pe + "%" }] : []) : [{ y: 0, extend: false }];
    var xs = pts.map(function (p) { return p.x; }).filter(isFinite), ys = pts.map(function (p) { return p.y; }).filter(isFinite);
    if (VX) { [VX.E, VX.F, VX.A].forEach(function (v) { xs.push(v[0]); if (yk === "gd2") ys.push(v[1]); }); }
    var opts = {
      xLabel: "GD1", yLabel: yl, equal: yk === "gd2", opacity: 0.8,
      groups: GROUP_ORDER, colors: COLORS, legendTitle: "GrafAnc continental group",
      highlight: GROUP_ORDER.slice(1),
      xDomain: [Math.min.apply(null, xs) - 0.02, Math.max.apply(null, xs) + 0.02],
      yDomain: yk === "gd2" ? [Math.min.apply(null, ys) - 0.02, Math.max.apply(null, ys) + 0.02] : null,
      refLines: refLines,
      ariaLabel: "Scatter plot of " + yl + " against GD1 for " + data.people.length + " toy people, colored by GrafAnc continental group" +
        (g.means.length ? ", with the mean scores of the " + g.means.length + " toy reference populations" : "") +
        (yk === "gd2" && VX ? " and the lab's reference triangle." : "."),
      tooltip: function (pt) {
        if (pt.mean) {
          var m = pt.mean, r = NAMES[m.code];
          return "toy " + m.code + " (" + m.sp + ")" + (r ? ": named after " + r[2] : "") +
            "\nMean of its " + m.n + " people in toy_1kg, scored by the lab's GrafAnc:\nGD1 " + f4(m.gd1) + ", GD2 " + f4(m.gd2) + ", GD3 " + f4(m.gd3) + ", Pe " + f1(m.pe) + "%";
        }
        var p = pt.person;
        return unquote(p.sample) + "\nAncGroupID " + p.grp + " (" + p.cont + ")" +
          "\nPe " + f1(p.pe) + "%, Pf " + f1(p.pf) + "%, Pa " + f1(p.pa) + "%" +
          "\nGD1 " + f4(p.gd1) + ", GD2 " + f4(p.gd2) + ", GD3 " + f4(p.gd3) +
          (isFinite(p.snps) ? "\nAncestry SNPs used: " + p.snps : "");
      }
    };
    if (!opts.yDomain) delete opts.yDomain;
    if (chart) chart.update(pts, opts);
    else {
      plotEl.textContent = "";
      chart = Lab.plot.scatter(plotEl, pts, opts);
      var base = chart.draw;
      chart.draw = function () { base.apply(chart, arguments); drawTriangle(chart); };
      chart.draw();
    }
    if (yk !== "gd2" && chart.svg) Array.prototype.forEach.call(chart.svg.querySelectorAll(".gp-tri"), function (n) { n.remove(); });

    readout.textContent = flagged.length + " of " + data.people.length + " toy people have Pe below " + state.pe + "%." +
      (yk === "gd2" && VX ? " For people inside the triangle, that is the region below the horizontal line." : "");
    var ids = flagged.map(function (p) { return unquote(p.sample) + " (" + p.cont + ", Pe " + f1(p.pe) + ")"; });
    list.textContent = ids.length ? "Flagged: " + ids.slice(0, 12).join("; ") + (ids.length > 12 ? "; and " + (ids.length - 12) + " more." : ".") : "";
  }

  selY.addEventListener("change", function () {
    state.y = selY.value;
    if (chart) { chart.destroy(); chart = null; }
    draw();
  });
  peIn.addEventListener("input", function () { state.pe = +peIn.value; peOut.textContent = peIn.value + "%"; draw(); });

  var M = "${analysis_dir}/toy.geno0.01.mind0.01";
  // A failed run's message stays until the next run: load() also runs on later file changes.
  var runError = "";
  runBtn.addEventListener("click", function () {
    running = true;
    runError = "";
    runBtn.hidden = true;
    var steps = [
      "awk '{ gsub(\"\\\"\", \"\", $1); print \"\\\"\" $1 \"\\\"\", $2, \"\\\"\" $1 \"\\\"\", \"\\\"\" $1 \"_\" $2 \"\\\"\" }' " + M + ".fam > ${analysis_dir}/toy.updateIDs.txt",
      "plink --bfile " + M + " --update-ids ${analysis_dir}/toy.updateIDs.txt --make-bed --out " + M + ".uniqueIDs"
    ];
    if (!Lab.fs.exists("${analysis_dir}/grafanc")) steps.push({ cmd: "git clone https://github.com/jimmy-penn/grafanc.git", cwd: Lab.paths.analysis_dir });
    // Tested when it runs, after the clone, as the practical does; a test made now would miss a fresh clone.
    steps.push('if [ -f "${analysis_dir}/grafanc/cpp/data/AncSnpPopAFs.txt.gz" ]; then gunzip ${analysis_dir}/grafanc/cpp/data/AncSnpPopAFs.txt.gz; fi');
    steps.push("export GRAFPATH=${analysis_dir}/grafanc/cpp");
    steps.push("${analysis_dir}/grafanc/bin/grafanc " + M + ".uniqueIDs ${analysis_dir}/toy_grafanc_out.txt");
    var i = 0;
    function next() {
      if (i >= steps.length) return null;
      var s = steps[i++], cmd = typeof s === "string" ? s : s.cmd;
      status.textContent = "Running command " + i + " of " + steps.length + "…";
      return Lab.run(cmd, typeof s === "string" ? undefined : { cwd: s.cwd }).then(function (res) {
        if (res.code !== 0) throw new Error("A command failed (exit code " + res.code + "). Run the commands in the terminal to see the message.");
        return next();
      });
    }
    Promise.resolve().then(next).then(function () { running = false; load(); },
      function (err) { running = false; runError = err.message; status.textContent = runError; runBtn.hidden = false; });
  });

  document.addEventListener("lab:fs-change", function (e) {
    if (running) return;
    if (e.detail.source === "reset" || e.detail.paths.some(function (p) { return /toy_grafanc_out\.txt$/.test(p); })) load();
  });
  Lab.ready.then(load);
})();
