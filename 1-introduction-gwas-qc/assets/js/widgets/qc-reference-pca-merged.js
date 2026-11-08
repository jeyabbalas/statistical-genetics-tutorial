/* Widget "The merged PCA: toy study and toy reference panel" (page: qc-reference-pca.html, section #distribution).
   Root element: <div class="widget" id="w-refpca"> with an empty .widget-body.

   Reads, from the lab's file system (Lab.readTable), the files the step 7 terminal writes:
     ${analysis_dir}/toy.geno0.01.mind0.01.merge1kgenomes.eigenvec   (the practical's route, default)
     ${analysis_dir}/toy.shared.merge1kgenomes.eigenvec              (the explicit shared-SNP route, if run)
     ${analysis_dir}/nogeno.eigenvec                                 (the page's last question: no --geno 0.1, if run)
     ${analysis_dir}/akt/data/integrated_call_samples_v3.20130502.ALL.panel   (labels: sample pop super_pop gender)
     ${reference_dir}/toy_1kg.fam                                    (which people are reference people)
   and redraws on lab:fs-change. An .eigenvec line is FID IID PC1 ... PCn (no header unless --pca header).
   A person is a reference person when their family ID is in toy_1kg.fam or in the panel; everyone else is a
   study person. Reference people are colored by super_pop, study people in the text color on top.

   Rectangle rule (the flag control): for reference group G and the two plotted PCs a and b, take the mean and
   the standard deviation (n - 1 denominator) of G's reference people on each axis; a study person is flagged
   when |PC_a - mean_a| > k SD_a or |PC_b - mean_b| > k SD_b.

   No libraries; draws with Lab.plot.scatter. The DOM-free core is exported for Node tests. */
(function () {
  "use strict";

  var SUPER = ["AFR", "AMR", "EAS", "EUR", "SAS"];
  var COLORS = { AFR: "var(--q2)", AMR: "var(--q4)", EAS: "var(--q3)", EUR: "var(--q1)", SAS: "var(--q7)",
    "toy study": "var(--fg)", "toy study, flagged": "var(--pitfall)", "reference, no label yet": "var(--fg-faint)" };
  var FILES = [
    { key: "practical", label: "Practical route (--geno 0.1 --maf 0.05)", path: "${analysis_dir}/toy.geno0.01.mind0.01.merge1kgenomes.eigenvec" },
    { key: "shared", label: "Explicit shared-SNP route (--maf 0.05)", path: "${analysis_dir}/toy.shared.merge1kgenomes.eigenvec" },
    { key: "nogeno", label: "Without --geno 0.1 (last question)", path: "${analysis_dir}/nogeno.eigenvec" }
  ];
  var PANEL = "${analysis_dir}/akt/data/integrated_call_samples_v3.20130502.ALL.panel";
  var REF_FAM = "${reference_dir}/toy_1kg.fam";

  /* ================================================================== core */
  function str(x) { return x == null ? "" : String(x); }
  function unquote(x) { return str(x).replace(/^"(.*)"$/, "$1"); }

  /* eig, panel, refFam: parsed tables (Lab.parseTable / Lab.readTable) or null. */
  function build(eig, panel, refFam) {
    var labels = Object.create(null), isRef = Object.create(null);
    if (panel) {
      var js = panel.index("sample"), jp = panel.index("pop"), jsp = panel.index("super_pop");
      if (js < 0) js = 0;
      panel.rows.forEach(function (r) {
        var id = str(r[js]);
        labels[id] = { pop: jp >= 0 ? str(r[jp]) : "", sp: jsp >= 0 ? str(r[jsp]) : "" };
        isRef[id] = true;
      });
    }
    if (refFam) refFam.rows.forEach(function (r) { isRef[str(r[0])] = true; });
    var rows = eig ? eig.rows : [];
    var nPC = 0;
    if (rows.length) nPC = Math.max(0, rows[0].length - 2);
    var people = rows.map(function (r) {
      var fid = str(r[0]), iid = str(r[1]), lab = labels[fid];
      var ref = !!isRef[fid];
      return { fid: fid, iid: iid, pcs: r.slice(2).map(Number), ref: ref,
        pop: lab ? lab.pop : "", sp: lab ? lab.sp : "" };
    });
    return { people: people, nPC: nPC,
      nRef: people.filter(function (p) { return p.ref; }).length,
      nStudy: people.filter(function (p) { return !p.ref; }).length };
  }

  function meanSd(v) {
    var n = v.length, s = 0, ss = 0;
    if (!n) return { mean: NaN, sd: NaN, n: 0 };
    v.forEach(function (x) { s += x; });
    var m = s / n;
    v.forEach(function (x) { ss += (x - m) * (x - m); });
    return { mean: m, sd: n > 1 ? Math.sqrt(ss / (n - 1)) : NaN, n: n };
  }

  /* a, b: 0-based PC indexes; group: super_pop label; k: number of SDs. */
  function flag(data, a, b, group, k) {
    var refs = data.people.filter(function (p) { return p.ref && p.sp === group; });
    var A = meanSd(refs.map(function (p) { return p.pcs[a]; })), B = meanSd(refs.map(function (p) { return p.pcs[b]; }));
    var flagged = [];
    if (refs.length > 1 && A.sd > 0 && B.sd > 0) {
      data.people.forEach(function (p) {
        if (p.ref) return;
        var x = p.pcs[a], y = p.pcs[b];
        if (Math.abs(x - A.mean) > k * A.sd || Math.abs(y - B.mean) > k * B.sd) flagged.push(p);
      });
    }
    return { nGroup: refs.length, a: A, b: B, flagged: flagged,
      box: refs.length > 1 ? [A.mean - k * A.sd, A.mean + k * A.sd, B.mean - k * B.sd, B.mean + k * B.sd] : null };
  }

  var core = { build: build, flag: flag, meanSd: meanSd, unquote: unquote, FILES: FILES, SUPER: SUPER };
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  if (typeof document === "undefined") return;

  /* ================================================================== widget */
  var root = document.getElementById("w-refpca");
  if (!root) return;
  var body = root.querySelector(".widget-body") || root;

  function el(tag, attrs) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") e.textContent = attrs[k];
      else if (k === "class") e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null) continue;
      e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return e;
  }

  if (!window.Lab) {
    body.appendChild(el("p", { "class": "note", text: "This widget needs the lab (assets/js/lab/lab.js), which did not load." }));
    return;
  }

  var state = { file: "practical", a: 0, b: 1, group: "EUR", k: 3 };
  var data = null, chart = null, running = false;

  var selFile = el("select", { "aria-label": "Which merged PCA to plot" });
  var selX = el("select", { "aria-label": "PC on the horizontal axis" });
  var selY = el("select", { "aria-label": "PC on the vertical axis" });
  var runBtn = el("button", { type: "button", "class": "btn primary", hidden: "" }, "Run the step 7 commands");
  var status = el("span", { "class": "note", role: "status" }, "Waiting for the lab…");
  var fileWrap = el("label", { "class": "rp-file" }, "File ", selFile);
  body.appendChild(el("div", { "class": "controls" },
    fileWrap,
    el("label", null, "x axis ", selX),
    el("label", null, "y axis ", selY),
    runBtn, status));
  var plotEl = el("div", { "class": "rp-plot" });
  body.appendChild(plotEl);

  var selG = el("select", { "aria-label": "Reference group for the rectangle rule" });
  SUPER.forEach(function (g) { selG.appendChild(el("option", { value: g }, g)); });
  selG.value = state.group;
  var kIn = el("input", { type: "range", min: "1", max: "10", step: "0.5", value: String(state.k), "aria-label": "k, the number of standard deviations" });
  var kOut = el("output", { "class": "rp-k" }, String(state.k));
  body.appendChild(el("div", { "class": "controls rp-rule" },
    el("strong", null, "Rectangle rule"),
    el("label", null, "Reference group ", selG),
    el("label", null, "k ", kIn, kOut)));
  var readout = el("p", { "class": "rp-readout", "aria-live": "polite" });
  var list = el("p", { "class": "rp-list note" });
  body.appendChild(readout);
  body.appendChild(list);

  function fillPCs(n) {
    [selX, selY].forEach(function (s, j) {
      var keep = j === 0 ? state.a : state.b;
      s.textContent = "";
      for (var i = 0; i < n; i++) s.appendChild(el("option", { value: String(i) }, "PC" + (i + 1)));
      if (keep >= n) keep = Math.min(j, n - 1);
      s.value = String(keep);
      if (j === 0) state.a = keep; else state.b = keep;
    });
  }

  function availableFiles() { return FILES.filter(function (f) { return Lab.fs.exists(f.path); }); }

  function fillFiles() {
    var av = availableFiles();
    selFile.textContent = "";
    av.forEach(function (f) { selFile.appendChild(el("option", { value: f.key }, f.label)); });
    if (!av.some(function (f) { return f.key === state.file; }) && av.length) state.file = av[0].key;
    selFile.value = state.file;
    fileWrap.hidden = av.length < 2;
    return av;
  }

  function idText(p) { return p.fid + " " + p.iid; }

  function load() {
    var av = fillFiles();
    var need = !Lab.fs.exists(FILES[0].path) || !Lab.fs.exists(PANEL);
    runBtn.hidden = !need || running;
    if (!av.length) {
      data = null;
      if (chart) { chart.destroy(); chart = null; }
      plotEl.textContent = "";
      plotEl.appendChild(el("p", { "class": "note" }, "No merged PCA yet. Run the step 7 commands in the terminal above (the merge, the flip, the second merge and the PCA), or press the button."));
      readout.textContent = ""; list.textContent = "";
      if (!running) status.textContent = "";
      return;
    }
    var f = FILES.filter(function (x) { return x.key === state.file; })[0];
    var eig = Lab.readTable(f.path), panel = Lab.readTable(PANEL), refFam = Lab.readTable(REF_FAM);
    data = build(eig, panel, refFam);
    fillPCs(data.nPC);
    var groupsPresent = SUPER.filter(function (g) { return data.people.some(function (p) { return p.ref && p.sp === g; }); });
    if (groupsPresent.length && groupsPresent.indexOf(state.group) < 0) { state.group = groupsPresent[0]; selG.value = state.group; }
    if (!running) status.textContent = data.nStudy + " study people and " + data.nRef + " reference people, " + data.nPC + " PCs" +
      (panel ? "." : ". The panel file is missing: run the git clone command to label the reference people.");
    draw();
  }

  function draw() {
    if (!data) return;
    var a = state.a, b = state.b, k = state.k;
    var fl = flag(data, a, b, state.group, k);
    var flaggedSet = new Set(fl.flagged);
    var pts = data.people.map(function (p) {
      var g = p.ref ? (p.sp || "reference, no label yet") : (flaggedSet.has(p) ? "toy study, flagged" : "toy study");
      return { x: p.pcs[a], y: p.pcs[b], group: g, label: idText(p), person: p };
    });
    var refLines = [];
    if (fl.box) {
      var lab = state.group + " mean ± " + k + " SD";
      refLines = [{ x: fl.box[0], extend: false, label: lab }, { x: fl.box[1], extend: false },
        { y: fl.box[2], extend: false }, { y: fl.box[3], extend: false }];
    }
    var xl = "PC" + (a + 1), yl = "PC" + (b + 1);
    var opts = {
      xLabel: xl, yLabel: yl, equal: true, opacity: 0.75,
      groups: SUPER.concat(["reference, no label yet", "toy study", "toy study, flagged"]),
      colors: COLORS, highlight: ["toy study", "toy study, flagged"], legendTitle: "Panel label or study",
      refLines: refLines,
      ariaLabel: "Scatter plot of " + yl + " against " + xl + " for " + data.nStudy + " toy study people and " + data.nRef + " reference people; " + fl.flagged.length + " study people flagged by the rectangle rule.",
      tooltip: function (pt) {
        var p = pt.person;
        var where = xl + " " + Lab.plot.format(pt.x) + ", " + yl + " " + Lab.plot.format(pt.y);
        if (p.ref) return idText(p) + "\nreference" + (p.sp ? ": " + p.pop + " (" + p.sp + ")" : "") + "\n" + where;
        return idText(p) + "\ntoy study" + (flaggedSet.has(p) ? ", flagged" : "") + "\n" + where;
      }
    };
    if (chart) chart.update(pts, opts);
    else { plotEl.textContent = ""; chart = Lab.plot.scatter(plotEl, pts, opts); }

    if (!fl.box) {
      readout.textContent = "The rule needs at least two reference people labeled " + state.group + " (run the git clone command for the labels).";
      list.textContent = "";
      return;
    }
    readout.textContent = "Rule: " + state.group + " mean ± " + k + " SD on " + xl + " and on " + yl + " (from " + fl.nGroup + " reference people). " +
      fl.flagged.length + " of " + data.nStudy + " study people flagged.";
    var ids = fl.flagged.map(idText);
    list.textContent = ids.length ? "Flagged: " + ids.slice(0, 15).join(", ") + (ids.length > 15 ? ", and " + (ids.length - 15) + " more." : ".") : "";
  }

  selFile.addEventListener("change", function () { state.file = selFile.value; load(); });
  selX.addEventListener("change", function () { state.a = +selX.value; draw(); });
  selY.addEventListener("change", function () { state.b = +selY.value; draw(); });
  selG.addEventListener("change", function () { state.group = selG.value; draw(); });
  kIn.addEventListener("input", function () { state.k = +kIn.value; kOut.textContent = kIn.value; draw(); });

  var M = "${analysis_dir}/toy.geno0.01.mind0.01";
  var REF3 = "${reference_dir}/toy_1kg.bed ${reference_dir}/toy_1kg.bim ${reference_dir}/toy_1kg.fam";
  var STEPS = [
    "plink --bfile " + M + " --bmerge " + REF3 + " --make-bed --out " + M + ".merge1kgenomes || true",
    "plink --bfile " + M + " --flip " + M + ".merge1kgenomes-merge.missnp --make-bed --out " + M + "_flipSNPs",
    "plink --bfile " + M + "_flipSNPs --bmerge " + REF3 + " --make-bed --out " + M + ".merge1kgenomes",
    "plink --bfile " + M + ".merge1kgenomes --geno 0.1 --maf 0.05 --pca --out " + M + ".merge1kgenomes"
  ];
  runBtn.addEventListener("click", function () {
    running = true;
    runBtn.hidden = true;
    var steps = Lab.fs.exists(FILES[0].path) ? [] : STEPS.slice();
    var i = 0;
    function next() {
      if (i < steps.length) {
        status.textContent = "Running command " + (i + 1) + " of " + steps.length + "…";
        return Lab.run(steps[i++]).then(function (res) {
          if (res.code !== 0) throw new Error("plink exited with code " + res.code + ". Run the commands in the terminal to see its message.");
          return next();
        });
      }
      if (!Lab.fs.exists(PANEL)) {
        status.textContent = "Cloning akt for the panel file…";
        return Lab.run("git clone https://github.com/Illumina/akt.git", { cwd: Lab.paths.analysis_dir });
      }
      return null;
    }
    Promise.resolve().then(next).then(function () {
      running = false; load();
    }, function (err) {
      running = false; status.textContent = err.message; runBtn.hidden = false;
    });
  });

  document.addEventListener("lab:fs-change", function (e) {
    if (running) return;
    var hit = e.detail.paths.some(function (p) { return /\.eigenvec$|\.panel$|toy_1kg\.fam$/.test(p) || e.detail.source === "reset"; });
    if (hit) load();
  });
  Lab.ready.then(load);
})();
