/* Widget "Which allele is counted?" (page: snp-data, Lecture 1).
   Twelve simulated people, three SNPs given as genotype letters on the + strand (REF > ALT), and a
   simulated trait y. The reader chooses, per SNP, which allele is counted; the genotype matrix shows
   g = copies of the counted allele (0, 1 or 2; missing stays missing), and the summaries update:
     allele frequency of the counted allele  p-hat = sum(g) / (2 * number of people with a call)
     column mean = 2 * p-hat
     least-squares line of y on g (people with a call):  beta-hat = Sxy / Sxx,  alpha-hat = mean(y) - beta-hat * mean(g),
     R^2 = beta-hat^2 * Sxx / Syy.
   Counting the other allele replaces g by 2 - g, so p-hat -> 1 - p-hat, beta-hat -> -beta-hat,
   alpha-hat -> alpha-hat + 2 beta-hat, and R^2 is unchanged.
   Data: genotypes chosen for the example; y = 100 + 4 * (copies of A at SNP 1) + noise, noise drawn once from
   a normal distribution with SD 3 using the seeded generator mulberry32(20261108) and Box-Muller, so every
   reader sees the same numbers. No libraries, no network; pure functions exported for Node tests. */
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

  var SNPS = [
    { name: "SNP 1", ref: "G", alt: "A", g: ["GG", "AG", "GG", "AA", "AG", "GG", "AG", "GG", "AG", "AA", "GG", "AG"] },
    { name: "SNP 2", ref: "C", alt: "T", g: ["TT", "CT", "TT", "TT", "CT", "CC", "TT", "CT", "TT", "TT", "CT", "TT"] },
    { name: "SNP 3", ref: "A", alt: "G", g: ["AG", "AA", "--", "AG", "GG", "AA", "AG", "AA", "AA", "AG", "AG", "AA"] }
  ];
  var IDS = ["P01", "P02", "P03", "P04", "P05", "P06", "P07", "P08", "P09", "P10", "P11", "P12"];

  function makeTrait() {
    var r = mulberry32(20261108), y = [];
    for (var i = 0; i < IDS.length; i++) {
      var u1 = Math.max(r(), 1e-12), u2 = r();
      var z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      var a = countAllele(SNPS[0].g[i], "A");
      y.push(Math.round((100 + 4 * a + 3 * z) * 10) / 10);
    }
    return y;
  }
  /* copies of allele a in a two-letter genotype; null when missing */
  function countAllele(gt, a) {
    if (!gt || gt.indexOf("-") >= 0) return null;
    return (gt.charAt(0) === a ? 1 : 0) + (gt.charAt(1) === a ? 1 : 0);
  }
  function column(snp, counted) { return snp.g.map(function (gt) { return countAllele(gt, counted); }); }
  function freqOf(col) {
    var s = 0, m = 0;
    col.forEach(function (v) { if (v !== null) { s += v; m++; } });
    return { sum: s, called: m, p: m ? s / (2 * m) : NaN, mean: m ? s / m : NaN };
  }
  function regress(x, y) {
    var xs = [], ys = [];
    for (var i = 0; i < x.length; i++) if (x[i] !== null) { xs.push(x[i]); ys.push(y[i]); }
    var n = xs.length, mx = 0, my = 0, i2;
    for (i2 = 0; i2 < n; i2++) { mx += xs[i2]; my += ys[i2]; }
    mx /= n; my /= n;
    var sxx = 0, sxy = 0, syy = 0;
    for (i2 = 0; i2 < n; i2++) { sxx += (xs[i2] - mx) * (xs[i2] - mx); sxy += (xs[i2] - mx) * (ys[i2] - my); syy += (ys[i2] - my) * (ys[i2] - my); }
    var b = sxx > 0 ? sxy / sxx : NaN, a = my - b * mx;
    return { n: n, beta: b, alpha: a, r2: (sxx > 0 && syy > 0) ? b * b * sxx / syy : NaN, mx: mx, my: my };
  }
  function minorAllele(snp) {
    var fa = freqOf(column(snp, snp.alt)).p;
    return fa < 0.5 ? snp.alt : snp.ref;
  }

  var TRAIT = makeTrait();
  var STATS = { mulberry32: mulberry32, SNPS: SNPS, TRAIT: TRAIT, countAllele: countAllele, column: column, freqOf: freqOf, regress: regress, minorAllele: minorAllele };
  if (typeof module !== "undefined" && module.exports) module.exports = STATS;
  if (typeof document === "undefined") return;

  /* ------------------------------------------------------------------ DOM */
  var SVGNS = "http://www.w3.org/2000/svg";
  function svgEl(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function svgText(parent, x, y, txt, cls, extra) {
    var a = { x: x, y: y, "class": cls || "t-sm" };
    if (extra) for (var k in extra) a[k] = extra[k];
    var t = svgEl("text", a, parent); t.textContent = txt; return t;
  }
  function h(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function signed(x, d) { return !isFinite(x) ? "—" : (x < 0 ? "−" + (-x).toFixed(d) : x.toFixed(d)); }
  function base(b) { return '<span class="b-' + b + '">' + b + "</span>"; }

  function init() {
    var root = document.getElementById("w-coding");
    if (!root) return;
    var body = root.querySelector(".widget-body");
    if (!body) return;
    body.innerHTML = "";

    var counted = SNPS.map(function (s) { return s.alt; });
    var sel = 0;

    var pre = h("div", { "class": "controls cd-presets", role: "group", "aria-label": "Counting conventions" });
    var bAlt = h("button", { "class": "btn", type: "button" }, "Count ALT (VCF dosage)");
    var bMin = h("button", { "class": "btn", type: "button" }, "Count the minor allele (PLINK 1.9 A1)");
    var bRef = h("button", { "class": "btn", type: "button" }, "Count REF (PLINK 2 --export A)");
    pre.appendChild(bAlt); pre.appendChild(bMin); pre.appendChild(bRef);
    body.appendChild(pre);
    body.appendChild(h("p", { "class": "note" }, '<span class="illustrative">Simulated</span> 12 people, 3 SNPs (letters on the + strand, written REF&gt;ALT) and a trait y. Click a SNP’s button to count its other allele; choose which SNP the line uses.'));

    var grid = h("div", { "class": "cd-grid" });
    body.appendChild(grid);
    var tWrap = h("div", { "class": "cd-twrap" });
    grid.appendChild(tWrap);
    var right = h("div", { "class": "cd-right" });
    grid.appendChild(right);

    var regCtl = h("div", { "class": "controls", role: "radiogroup", "aria-label": "SNP used for the regression line" });
    regCtl.appendChild(h("span", { "class": "cd-lab" }, "Line for:"));
    var radios = [];
    SNPS.forEach(function (s, j) {
      var l = h("label", null, "");
      var r = h("input", { type: "radio", name: "cd-snp", value: String(j) });
      if (j === 0) r.checked = true;
      l.appendChild(r); l.appendChild(document.createTextNode(" " + s.name));
      regCtl.appendChild(l); radios.push(r);
    });
    right.appendChild(regCtl);
    var plot = svgEl("svg", { viewBox: "0 0 320 250", role: "img", "aria-labelledby": "cd-plot-t", "class": "cd-svg" });
    var ptitle = svgEl("title", { id: "cd-plot-t" }, plot);
    right.appendChild(plot);
    var read = h("div", { "class": "readout cd-read", "aria-live": "polite" });
    right.appendChild(read);

    function render() {
      var cols = SNPS.map(function (s, j) { return column(s, counted[j]); });
      var fr = cols.map(freqOf);
      var html = '<table class="cd-t"><thead><tr><th>person</th>';
      SNPS.forEach(function (s, j) {
        var other = counted[j] === s.alt ? s.ref : s.alt;
        html += '<th><div class="cd-snp">' + s.name + '</div><div class="cd-ra">' + base(s.ref) + "&gt;" + base(s.alt) + '</div>' +
          '<button type="button" class="btn cd-tog" data-j="' + j + '" aria-label="' + s.name + ': count ' + other + ' instead of ' + counted[j] + '">count ' +
          base(counted[j]) + " ⇄</button></th>";
      });
      html += "<th>y</th></tr></thead><tbody>";
      for (var i = 0; i < IDS.length; i++) {
        html += "<tr><th>" + IDS[i] + "</th>";
        for (var j = 0; j < SNPS.length; j++) {
          var v = cols[j][i], gt = SNPS[j].g[i];
          var cls = v === null ? "miss" : "g" + v;
          html += '<td class="cd-c"><span class="cd-gt">' + (v === null ? "--" : base(gt.charAt(0)) + base(gt.charAt(1))) + '</span><span class="cd-n ' + cls + '">' + (v === null ? "NA" : v) + "</span></td>";
        }
        html += '<td class="num">' + TRAIT[i].toFixed(1) + "</td></tr>";
      }
      html += "</tbody><tfoot>";
      html += "<tr><th>freq. of counted</th>" + fr.map(function (f) { return '<td class="num">' + f.p.toFixed(3) + "</td>"; }).join("") + "<td></td></tr>";
      html += "<tr><th>column mean</th>" + fr.map(function (f) { return '<td class="num">' + f.mean.toFixed(3) + "</td>"; }).join("") + "<td></td></tr>";
      html += "<tr><th>calls</th>" + fr.map(function (f) { return '<td class="num">' + f.called + "</td>"; }).join("") + "<td></td></tr>";
      html += "</tfoot></table>";
      tWrap.innerHTML = html;
      Array.prototype.forEach.call(tWrap.querySelectorAll(".cd-tog"), function (b) {
        b.addEventListener("click", function () {
          var j = Number(b.getAttribute("data-j"));
          counted[j] = counted[j] === SNPS[j].alt ? SNPS[j].ref : SNPS[j].alt;
          render();
          var nb = tWrap.querySelector('.cd-tog[data-j="' + j + '"]'); if (nb) nb.focus();
        });
      });
      drawPlot(cols[sel], fr[sel]);
    }

    function drawPlot(col, f) {
      while (plot.childNodes.length > 1) plot.removeChild(plot.lastChild);
      var s = SNPS[sel], c = counted[sel];
      ptitle.textContent = "Trait y against copies of " + c + " at " + s.name + ", with the least-squares line";
      var P = { x0: 46, x1: 306, y0: 206, y1: 14 };
      var ymin = 92, ymax = 116;
      function X(g) { return P.x0 + 30 + g * ((P.x1 - P.x0 - 60) / 2); }
      function Y(v) { return P.y0 - (v - ymin) / (ymax - ymin) * (P.y0 - P.y1); }
      for (var v = ymin; v <= ymax; v += 4) {
        svgEl("line", { x1: P.x0, x2: P.x1, y1: Y(v), y2: Y(v), stroke: "var(--border)" }, plot);
        svgText(plot, P.x0 - 5, Y(v) + 4, String(v), "t-xs", { "text-anchor": "end" });
      }
      for (var g = 0; g <= 2; g++) svgText(plot, X(g), P.y0 + 16, String(g), "t-sm", { "text-anchor": "middle" });
      svgText(plot, (P.x0 + P.x1) / 2, P.y0 + 36, "g = copies of " + c + " at " + s.name, "t-sm", { "text-anchor": "middle" });
      svgText(plot, 12, (P.y0 + P.y1) / 2, "trait y", "t-sm", { "text-anchor": "middle", transform: "rotate(-90 12 " + ((P.y0 + P.y1) / 2) + ")" });
      var offs = {};
      for (var i = 0; i < IDS.length; i++) {
        var gv = col[i];
        if (gv === null) continue;
        offs[gv] = (offs[gv] || 0) + 1;
        var jit = ((offs[gv] % 5) - 2) * 6;
        svgEl("circle", { cx: X(gv) + jit, cy: Y(TRAIT[i]), r: 4.5, fill: "var(--g" + gv + ")", stroke: "var(--g2)", "stroke-width": 1.2 }, plot);
      }
      var r = regress(col, TRAIT);
      if (isFinite(r.beta)) {
        svgEl("line", { x1: X(0) - 18, y1: Y(r.alpha - r.beta * 18 / ((P.x1 - P.x0 - 60) / 2)), x2: X(2) + 18, y2: Y(r.alpha + r.beta * (2 + 18 / ((P.x1 - P.x0 - 60) / 2))),
          stroke: "var(--q4)", "stroke-width": 2.5 }, plot);
        svgEl("circle", { cx: X(0), cy: Y(r.alpha), r: 4, fill: "var(--q4)" }, plot);
        svgText(plot, X(0) + 8, Y(r.alpha) - 8, "α̂", "t-b", {}).style.fill = "var(--q4)";
      }
      var other = c === s.alt ? s.ref : s.alt;
      read.innerHTML =
        "<div>" + s.name + ": counting " + base(c) + " · " + r.n + " people with a call</div>" +
        "<div>freq. of " + base(c) + ": <b>" + f.p.toFixed(3) + "</b> &nbsp; (of " + base(other) + ": " + (1 - f.p).toFixed(3) + ")</div>" +
        "<div>slope β̂ = <b>" + signed(r.beta, 2) + "</b> per copy of " + base(c) + "</div>" +
        "<div>intercept α̂ = <b>" + signed(r.alpha, 2) + "</b> (the line at g = 0)</div>" +
        "<div>R² = " + (isFinite(r.r2) ? r.r2.toFixed(3) : "—") + "</div>";
    }

    function setAll(fn) { counted = SNPS.map(fn); render(); }
    bAlt.addEventListener("click", function () { setAll(function (s) { return s.alt; }); });
    bRef.addEventListener("click", function () { setAll(function (s) { return s.ref; }); });
    bMin.addEventListener("click", function () { setAll(minorAllele); });
    radios.forEach(function (r) { r.addEventListener("change", function () { if (r.checked) { sel = Number(r.value); render(); } }); });

    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
