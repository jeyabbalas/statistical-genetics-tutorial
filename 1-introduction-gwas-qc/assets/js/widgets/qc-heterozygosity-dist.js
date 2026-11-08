/* qc-heterozygosity-dist.js: the toy data's heterozygosity rates and the mean ± k SD rule.
   Page: qc-heterozygosity.html, section #look. Root element: <div class="widget" id="w-het-dist">.
   Loaded after lab.js. Reads ${analysis_dir}/toy.geno0.01.mind0.01.LD0.3.het, written in the lab by
     plink --bfile …/toy.geno0.01.mind0.01 --het --extract ….prune.in --out …/toy.geno0.01.mind0.01.LD0.3
   and redraws whenever a command writes that file again (lab:fs-change). It never runs PLINK by itself;
   the button runs the command through Lab.run when the reader asks.
   Shows:
   - a histogram of het_rate = (N(NM) − O(HOM)) / N(NM) with dashed lines at center ± k × spread, where
     center and spread are the mean and the standard deviation (divisor n − 1, as R's sd()), or, with
     the robust option, the median and 1.4826 × the median absolute deviation (R's mad());
   - the people outside the lines, with their distance from the center in units of the spread;
   - the spread recomputed without them (the outliers widen the SD that is used to find them);
   - the cut in F that the rule corresponds to: F ≈ 1 − h / H, with H the mean of (N(NM) − E(HOM)) / N(NM),
     so a band of ± k s_h in het_rate is a band of about ± k s_h / H in F. */
(function () {
  "use strict";
  var root = document.getElementById("w-het-dist");
  if (!root) return;
  var body = root.querySelector(".widget-body");
  if (!window.Lab) {
    body.innerHTML = '<p class="note">The lab did not load on this page, so this widget cannot read the toy data.</p>';
    return;
  }
  var Lab = window.Lab;
  var HET = "${analysis_dir}/toy.geno0.01.mind0.01.LD0.3.het";
  var CMD = "plink --bfile ${analysis_dir}/toy.geno0.01.mind0.01 --het --extract ${analysis_dir}/toy.geno0.01.mind0.01.prune.in --out ${analysis_dir}/toy.geno0.01.mind0.01.LD0.3";

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function f4(x) { return isFinite(x) ? x.toFixed(4) : "NA"; }
  function sig(x, d) {
    if (!isFinite(x)) return "NA";
    if (x === 0) return "0";
    var s = Number(x.toPrecision(d || 4)).toString();
    return s.indexOf("e") >= 0 ? x.toPrecision(d || 4) : s;
  }
  function int(n) { return n.toLocaleString("en-US"); }
  function kfmt(k) { return String(+k.toFixed(1)); }

  /* ---------------- statistics ---------------- */
  function mean(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return a.length ? s / a.length : NaN; }
  function sd(a) {
    var n = a.length; if (n < 2) return NaN;
    var m = mean(a), ss = 0;
    for (var i = 0; i < n; i++) ss += (a[i] - m) * (a[i] - m);
    return Math.sqrt(ss / (n - 1));
  }
  function median(a) {
    var s = a.slice().sort(function (x, y) { return x - y; }), n = s.length;
    if (!n) return NaN;
    return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
  }
  function mad(a) {                       // R's mad(): 1.4826 × median absolute deviation
    var m = median(a);
    return 1.4826 * median(a.map(function (v) { return Math.abs(v - m); }));
  }

  /* ---------------- layout ---------------- */
  body.innerHTML = "";
  var controls = el("div", { "class": "controls" });
  var runBtn = el("button", { type: "button", "class": "btn primary" }, "Run plink --het");
  var status = el("span", { "class": "note", "aria-live": "polite" }, "Waiting for the lab…");
  controls.appendChild(runBtn); controls.appendChild(status);
  body.appendChild(controls);

  var kRow = el("div", { "class": "controls" });
  var kLab = el("label", { "class": "hd-k" }, "Flag people more than k spreads from the center, k = ");
  var kIn = el("input", { type: "range", min: "1", max: "6", step: "0.5", value: "3", "aria-label": "Number of standard deviations, k" });
  var kOut = el("output", null, "3");
  kLab.appendChild(kIn); kLab.appendChild(kOut);
  kRow.appendChild(kLab);
  [[2, "2"], [3, "3 (practical)"], [5, "5"]].forEach(function (p) {
    var b = el("button", { type: "button", "class": "btn" }, "k = " + p[1]);
    b.addEventListener("click", function () { kIn.value = String(p[0]); refresh(); });
    kRow.appendChild(b);
  });
  body.appendChild(kRow);
  var robRow = el("div", { "class": "controls" });
  var robLab = el("label", { "class": "hd-rob" });
  var robIn = el("input", { type: "checkbox" });
  robLab.appendChild(robIn);
  robLab.appendChild(document.createTextNode(" robust: median and MAD instead of mean and SD"));
  robRow.appendChild(robLab);
  body.appendChild(robRow);

  var histBox = el("div", { id: "w-het-dist-hist" });
  body.appendChild(histBox);
  var readout = el("div", { "class": "readout hd-readout", "aria-live": "polite" });
  body.appendChild(readout);
  var tableBox = el("div", { "class": "hd-table" });
  body.appendChild(tableBox);

  /* ---------------- state ---------------- */
  var people = [], hist = null, H = NaN, stats = null;

  function readFile() {
    var tab = Lab.readTable(HET);
    if (!tab) return false;
    var c = {};
    ["FID", "IID", "O(HOM)", "E(HOM)", "N(NM)", "F"].forEach(function (k) { c[k] = tab.header.indexOf(k); });
    if (c["O(HOM)"] < 0 || c["N(NM)"] < 0) throw new Error("the file has no O(HOM) or N(NM) column");
    people = [];
    var hs = [];
    tab.rows.forEach(function (r) {
      var o = +r[c["O(HOM)"]], n = +r[c["N(NM)"]], e = c["E(HOM)"] >= 0 ? +r[c["E(HOM)"]] : NaN, f = c.F >= 0 ? +r[c.F] : NaN;
      if (!(n > 0)) return;
      var p = { id: r[c.FID] + " " + r[c.IID], o: o, e: e, n: n, f: f, h: (n - o) / n, hExp: (n - e) / n };
      people.push(p);
    });
    H = mean(people.map(function (p) { return p.hExp; }).filter(isFinite));
    var all = people.map(function (p) { return p.h; });
    stats = { mean: mean(all), sd: sd(all), median: median(all), mad: mad(all), min: Math.min.apply(null, all), max: Math.max.apply(null, all) };
    return true;
  }

  function center() { return robIn.checked ? { c: stats.median, s: stats.mad, cn: "median", sn: "MAD" } : { c: stats.mean, s: stats.sd, cn: "mean", sn: "SD" }; }

  function domain() {
    var lo = stats.min, hi = stats.max;
    [[stats.mean, stats.sd], [stats.median, stats.mad]].forEach(function (cs) {
      if (isFinite(cs[1])) { lo = Math.min(lo, cs[0] - 6.3 * cs[1]); hi = Math.max(hi, cs[0] + 6.3 * cs[1]); }
    });
    var pad = (hi - lo) * 0.02 || 0.01;
    return [lo - pad, hi + pad];
  }

  function refresh() {
    var k = +kIn.value;
    kOut.textContent = kfmt(k);
    if (!people.length || !stats) return;
    var cs = center(), lo = cs.c - k * cs.s, hi = cs.c + k * cs.s;
    // short labels: the two lines can be close together on a phone
    var lines = [{ x: lo, label: "−" + kfmt(k) + " " + cs.sn }, { x: hi, label: "+" + kfmt(k) + " " + cs.sn }];
    var opts = { bins: 40, domain: domain(), xLabel: "het_rate", unit: "people", lines: lines,
      ariaLabel: "Histogram of the heterozygosity rate of every person in the toy data, with lines at the " + cs.cn + " plus and minus " + kfmt(k) + " " + cs.sn };
    if (hist) hist.update(people.map(function (p) { return p.h; }), opts);
    else hist = Lab.plot.histogram(histBox, people.map(function (p) { return p.h; }), opts);

    var flagged = people.filter(function (p) { return p.h < lo || p.h > hi; })
      .map(function (p) { return { p: p, z: (p.h - cs.c) / cs.s }; })
      .sort(function (a, b) { return Math.abs(b.z) - Math.abs(a.z); });
    var nLow = flagged.filter(function (q) { return q.z < 0; }).length, nHigh = flagged.length - nLow;
    var rest = people.filter(function (p) { return !(p.h < lo || p.h > hi); }).map(function (p) { return p.h; });
    var restSpread = robIn.checked ? mad(rest) : sd(rest);
    var fCut = k * cs.s / H;
    readout.innerHTML =
      int(people.length) + " people · " + cs.cn + " het_rate " + f4(cs.c) + " · " + cs.sn + " " + sig(cs.s, 3) +
      " → limits " + f4(lo) + " and " + f4(hi) + "<br>" +
      "<strong>Outside the limits: " + int(flagged.length) + " " + (flagged.length === 1 ? "person" : "people") +
      " (" + int(nLow) + " low, " + int(nHigh) + " high).</strong> " +
      cs.sn + " of the other " + int(rest.length) + ": " + sig(restSpread, 3) + (flagged.length ? " (the flagged people widen the " + cs.sn + " used to find them)" : "") + "<br>" +
      "Average expected heterozygosity H = " + f4(H) + ", so these limits correspond to F about " + sig(fCut, 2) + " either side of the " + cs.cn + " F (|F| &gt; 0.1 is fixed at 0.1).";

    if (!flagged.length) { tableBox.innerHTML = '<p class="note">No one is outside the limits.</p>'; return; }
    var shown = flagged.slice(0, 15);
    var html = '<div class="table-wrap"><table class="compact stack"><caption>People outside ' + cs.cn + " ± " + kfmt(k) + " " + cs.sn + ", most extreme first" +
      (flagged.length > shown.length ? " (first " + shown.length + " of " + int(flagged.length) + ")" : "") + "</caption>" +
      '<thead><tr><th scope="col">Person (FID IID)</th><th class="num" scope="col">het_rate</th><th class="num" scope="col">' + cs.sn + "s from " + cs.cn +
      '</th><th class="num" scope="col">F</th><th class="num" scope="col">N(NM)</th><th scope="col">Side</th></tr></thead><tbody>';
    shown.forEach(function (q) {
      html += '<tr><td data-label="Person">' + esc(q.p.id) + '</td><td class="num" data-label="het_rate">' + f4(q.p.h) +
        '</td><td class="num" data-label="' + cs.sn + ' units from ' + cs.cn + '">' + (q.z > 0 ? "+" : "−") + Math.abs(q.z).toFixed(1) +
        '</td><td class="num" data-label="F">' + sig(q.p.f, 4) + '</td><td class="num" data-label="N(NM)">' + int(q.p.n) +
        '</td><td data-label="Side">' + (q.z > 0 ? "excess of heterozygous calls" : "shortfall of heterozygous calls") + "</td></tr>";
    });
    html += "</tbody></table></div>";
    tableBox.innerHTML = html;
  }

  function draw() {
    var ok;
    try { ok = readFile(); }
    catch (err) { status.textContent = "Could not read the .het file: " + err.message; return; }
    if (!ok || !people.length) {
      people = []; stats = null;
      histBox.innerHTML = '<p class="note">No <code>toy.geno0.01.mind0.01.LD0.3.het</code> yet.</p>';
      hist = null; readout.innerHTML = ""; tableBox.innerHTML = "";
      status.textContent = "Run plink --het in the terminal above, or press the button.";
      runBtn.hidden = false;
      return;
    }
    runBtn.hidden = true;
    status.textContent = int(people.length) + " people in toy.geno0.01.mind0.01.LD0.3.het (toy data, simulated).";
    refresh();
  }

  kIn.addEventListener("input", refresh);
  robIn.addEventListener("change", refresh);
  runBtn.addEventListener("click", function () {
    runBtn.disabled = true;
    status.textContent = "Running plink --het…";
    Lab.run(CMD).then(function (res) {
      runBtn.disabled = false;
      if (res.code !== 0) status.textContent = "plink stopped with exit code " + res.code + "; see the terminal output for the message.";
    });
  });
  document.addEventListener("lab:fs-change", function (e) {
    if ((e.detail.paths || []).some(function (p) { return /\/toy\.geno0\.01\.mind0\.01\.LD0\.3\.het$/.test(p); })) draw();
  });
  Lab.ready.then(draw);
})();
