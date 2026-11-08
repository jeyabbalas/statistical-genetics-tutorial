/* QC step 1 · Histograms of F_MISS from the lab's missingness reports, with a draggable threshold.
   Reads toy.lmiss, toy.imiss and toy.geno0.01.imiss (Lab.readTable), which the reader makes with plink --missing,
   counts the SNPs or people above the threshold (Lab.plot.histogram), and redraws whenever a command rewrites one
   of the files (lab:fs-change). Loaded after lab.js. */
(function () {
  "use strict";
  var root = document.getElementById("w-miss-explorer");
  if (!root) return;
  var body = root.querySelector(".widget-body");
  var REPORTS = {
    lmiss: { file: "${analysis_dir}/toy.lmiss", short: "toy.lmiss", unit: "SNPs", flag: "--geno",
             label: "SNPs · toy.lmiss",
             cmds: ["plink --bfile ${input_dir}/toy --missing --out ${analysis_dir}/toy"] },
    imiss: { file: "${analysis_dir}/toy.imiss", short: "toy.imiss", unit: "people", flag: "--mind",
             label: "people · toy.imiss (all SNPs)",
             cmds: ["plink --bfile ${input_dir}/toy --missing --out ${analysis_dir}/toy"] },
    imiss2: { file: "${analysis_dir}/toy.geno0.01.imiss", short: "toy.geno0.01.imiss", unit: "people", flag: "--mind",
              label: "people · toy.geno0.01.imiss (after --geno)",
              cmds: ["plink --bfile ${input_dir}/toy --geno 0.01 --make-bed --out ${analysis_dir}/toy.geno0.01",
                     "plink --bfile ${analysis_dir}/toy.geno0.01 --missing --out ${analysis_dir}/toy.geno0.01"] }
  };

  function el(tag, attrs, parent, text) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }

  if (!window.Lab) {
    body.textContent = "";
    el("p", { "class": "note" }, body, "This widget plots files from the in-browser lab, which did not load on this page.");
    return;
  }

  body.textContent = "";
  var row1 = el("div", { "class": "controls" }, body);
  var pickLab = el("label", { "class": "w-pick" }, row1, "Report ");
  var pick = el("select", null, pickLab);
  Object.keys(REPORTS).forEach(function (k) { el("option", { value: k }, pick, REPORTS[k].label); });
  var logLab = el("label", { "class": "me-log" }, row1);
  var logY = el("input", { type: "checkbox" }, logLab);
  logY.checked = true;
  logLab.appendChild(document.createTextNode(" counts on a log scale"));
  var row2 = el("div", { "class": "controls" }, body);
  var runBtn = el("button", { type: "button", "class": "btn primary" }, row2, "Run plink --missing");
  var status = el("span", { "class": "note", "aria-live": "polite" }, row2, "Waiting for the lab…");
  var plotBox = el("div", { "class": "me-plot" }, body);
  var compare = el("div", { "class": "readout me-compare", "aria-live": "polite" }, body);

  var hist = null, thr = { lmiss: 0.01, imiss: 0.01, imiss2: 0.01 }, shownKey = null;

  function read(key) {
    var t = null;
    try { t = Lab.readTable(REPORTS[key].file); } catch (err) { t = null; }
    if (!t || t.header.indexOf("F_MISS") < 0) return null;
    return t.col("F_MISS");
  }

  function drawCompare() {
    var a = read("imiss"), b = read("imiss2");
    if (!a || !b) { compare.textContent = ""; compare.hidden = true; return; }
    var t = thr.imiss2;
    var na = a.filter(function (v) { return v > t; }).length, nb = b.filter(function (v) { return v > t; }).length;
    var mean = function (v) { return v.reduce(function (s, x) { return s + x; }, 0) / (v.length || 1); };
    compare.hidden = false;
    compare.textContent =
      "People with F_MISS > " + t + ": " + na + " of " + a.length + " on all SNPs (toy.imiss), " +
      nb + " of " + b.length + " after --geno 0.01 (toy.geno0.01.imiss).\n" +
      "Mean F_MISS of a person: " + mean(a).toPrecision(3) + " before, " + mean(b).toPrecision(3) + " after.";
  }

  function draw() {
    var key = pick.value, R = REPORTS[key], vals = read(key);
    runBtn.textContent = key === "imiss2" ? "Run --geno 0.01, then --missing" : "Run plink --missing";
    if (!vals) {
      if (hist) { hist.destroy(); hist = null; }
      plotBox.textContent = "";
      el("p", { "class": "note" }, plotBox, "No " + R.short + " yet: run the commands in the terminal above, or press the button.");
      status.textContent = "";
      drawCompare();
      return;
    }
    status.textContent = vals.length.toLocaleString("en-US") + " " + R.unit + " in " + R.short + ".";
    var maxV = Math.max.apply(null, vals.concat([0.05]));
    var opts = {
      binWidth: 0.005, domain: [0, Math.ceil(maxV / 0.005) * 0.005], logY: logY.checked,
      xLabel: "F_MISS", yLabel: logY.checked ? R.unit + " (log scale)" : R.unit, unit: R.unit,
      threshold: { value: thr[key], min: 0, max: 0.2, step: 0.005, label: R.flag, direction: "above", verb: "would be removed" },
      onThreshold: function (v) { thr[key] = v; if (key === "imiss2") drawCompare(); },
      ariaLabel: "Histogram of F_MISS for the " + vals.length + " " + R.unit + " in " + R.short + ", with a threshold line."
    };
    if (hist && shownKey === key) hist.update(vals, opts);
    else { if (hist) hist.destroy(); plotBox.textContent = ""; hist = Lab.plot.histogram(plotBox, vals, opts); }
    shownKey = key;
    drawCompare();
  }

  runBtn.addEventListener("click", function () {
    var key = pick.value, cmds = REPORTS[key].cmds;
    if (key === "imiss2" && Lab.fs.exists("${analysis_dir}/toy.geno0.01.bed")) cmds = cmds.slice(1);
    runBtn.disabled = true;
    status.textContent = "Running " + cmds.length + (cmds.length === 1 ? " command…" : " commands…");
    var chain = Promise.resolve({ code: 0 });
    cmds.forEach(function (c) { chain = chain.then(function (res) { return res.code === 0 ? Lab.run(c) : res; }); });
    chain.then(function (res) {
      runBtn.disabled = false;
      if (res.code !== 0) status.textContent = "plink stopped with exit code " + res.code + ": " + String(res.stdout || res.stderr || "").trim().split("\n").pop();
    }, function (err) { runBtn.disabled = false; status.textContent = "The command could not run: " + err; });
  });
  pick.addEventListener("change", draw);
  logY.addEventListener("change", draw);
  document.addEventListener("lab:fs-change", function (e) {
    var paths = (e.detail && e.detail.paths) || [];
    if ((e.detail && e.detail.source === "reset") ||
        paths.some(function (p) { return /\/toy(\.geno0\.01)?\.[il]miss$/.test(p); })) draw();
  });
  Lab.ready.then(draw, function () { status.textContent = "The lab did not start."; });
})();
