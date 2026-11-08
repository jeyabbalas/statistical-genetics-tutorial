/* Widget "Harmonize one SNP across two files" (page: snp-data, Lecture 1).
   The reader enters, for file 1 (the reference) and file 2 (the file to align), the effect allele E,
   the other allele O, the effect-allele frequency f (optional) and the effect beta per copy of E (optional).
   The widget decides how file 2 must be changed so that its numbers refer to file 1's effect allele.

   Letters first (c = complement on the other strand: A<->T, C<->G):
     same        (E2, O2) = (E1, O1)            -> beta2h = beta2,   f2h = f2
     swap        (E2, O2) = (O1, E1)            -> beta2h = -beta2,  f2h = 1 - f2
     flip        (c(E2), c(O2)) = (E1, O1)      -> beta2h = beta2,   f2h = f2
     flip+swap   (c(E2), c(O2)) = (O1, E1)      -> beta2h = -beta2,  f2h = 1 - f2
     anything else: not the same pair of alleles -> drop.
   A/T and C/G SNPs: c(A) = T, so the letters cannot tell "same" from "flip + swap", or "swap" from "flip".
     Same-strand reading: file 2's frequency of file 1's effect letter is f2' = f2 (if E2 = E1) or 1 - f2.
     Opposite-strand reading: it is 1 - f2'.
     If either file's minor allele frequency min(f, 1 - f) is above the threshold t (default 0.42, the
     TwoSampleMR default), or a frequency is missing, the SNP is ambiguous and is dropped.
     Otherwise the same-strand reading is kept when f1 and f2' lie on the same side of 0.5, else the
     opposite-strand reading (the TwoSampleMR rule).
   Check after harmonizing: |f1 - f2h| > 0.2 is flagged (a different population, or an error).
   Real presets: PennCATH .bim (all 1,401 people, before QC) against the practical's 1000 Genomes panel
   (503 people labeled EUR), frequencies computed for this page; rs3094315 from Ensembl GRCh37
   (1000 Genomes phase 3 EUR). Slide 69 presets give directions only (beta = +1 or -1).
   No libraries, no network; works from file://. Pure functions are exported for Node tests. */
(function () {
  "use strict";

  var COMP = { A: "T", T: "A", C: "G", G: "C" };
  var BASES = ["A", "C", "G", "T"];

  function isPal(a, b) { return COMP[a] === b; }
  function num(v) { if (v === null || v === undefined || v === "") return NaN; var x = Number(v); return isFinite(x) ? x : NaN; }
  function maf(f) { return Math.min(f, 1 - f); }

  /* Core decision. r1, r2: {e, o, f, b}. t: MAF threshold for A/T and C/G SNPs. */
  function harmonize(r1, r2, t) {
    var out = { kind: "", steps: [], drop: false, readings: null, f2h: NaN, b2h: NaN, e2h: "", o2h: "", warn: "", pal: false };
    var e1 = r1.e, o1 = r1.o, e2 = r2.e, o2 = r2.o;
    var f1 = num(r1.f), f2 = num(r2.f), b2 = num(r2.b);
    if (e1 === o1 || e2 === o2) { out.kind = "invalid"; out.drop = true; out.steps.push("The effect and other allele of a file must differ."); return out; }
    var pal1 = isPal(e1, o1), pal2 = isPal(e2, o2);
    out.pal = pal1 && pal2 && ((e1 === e2 || e1 === o2));
    if (out.pal) {
      out.steps.push("Both files list " + e1 + "/" + o1 + ": an A/T or C/G SNP. Read from the other strand, " + e1 + "/" + o1 +
        " is " + COMP[e1] + "/" + COMP[o1] + ", the same pair, so the letters cannot show which strand each file used.");
      var sameLetter = (e2 === e1);
      var f2p = isFinite(f2) ? (sameLetter ? f2 : 1 - f2) : NaN;       // file 2's frequency of file 1's effect letter
      var sameR = { strand: "same", e2h: e1, o2h: o1, f2h: f2p, b2h: sameLetter ? b2 : -b2, kind: sameLetter ? "same" : "swap" };
      var oppR = { strand: "opposite", e2h: e1, o2h: o1, f2h: isFinite(f2p) ? 1 - f2p : NaN, b2h: sameLetter ? -b2 : b2, kind: sameLetter ? "flip+swap" : "flip" };
      out.readings = [sameR, oppR];
      if (!isFinite(f1) || !isFinite(f2)) {
        out.kind = "ambiguous"; out.drop = true;
        out.steps.push("Without allele frequencies both readings remain possible (shown below). Drop the SNP or find strand information.");
        return out;
      }
      var m1 = maf(f1), m2 = maf(f2);
      if (m1 > t || m2 > t) {
        out.kind = "ambiguous"; out.drop = true;
        out.steps.push("Minor allele frequencies " + m1.toFixed(3) + " and " + m2.toFixed(3) + ": at least one is above the threshold " +
          t.toFixed(2) + ", so the two readings predict frequencies too close to tell apart. Drop the SNP.");
        return out;
      }
      var chosen = ((f1 < 0.5) === (f2p < 0.5)) ? sameR : oppR;
      out.chosen = chosen.strand;
      out.kind = chosen.strand === "same" ? "pal-same" : "pal-opp";
      out.e2h = chosen.e2h; out.o2h = chosen.o2h; out.f2h = chosen.f2h; out.b2h = chosen.b2h;
      if (chosen.strand === "same") {
        out.steps.push("If both files use the same strand, file 2's frequency of " + e1 + " is " + f2p.toFixed(3) +
          ", on the same side of 0.5 as file 1's " + f1.toFixed(3) + ". Keep that reading.");
        out.steps.push(sameLetter ? "File 2 already counts " + e1 + ": nothing to change." :
          "File 2 counts " + e2 + ", which is file 1's other allele: swap (β → −β, f → 1 − f).");
      } else {
        out.steps.push("If both files used the same strand, file 2's frequency of " + e1 + " would be " + f2p.toFixed(3) +
          ", on the other side of 0.5 from file 1's " + f1.toFixed(3) + ". So file 2 is on the opposite strand.");
        out.steps.push("Flip file 2 (" + e2 + "/" + o2 + " → " + COMP[e2] + "/" + COMP[o2] + "). " +
          (sameLetter ? "Its effect allele becomes " + COMP[e2] + ", file 1's other allele, so also swap (β → −β, f → 1 − f)." :
            "Its effect allele becomes " + COMP[e2] + ", which is file 1's effect allele: no swap."));
      }
    } else {
      var ce2 = COMP[e2], co2 = COMP[o2];
      if (e2 === e1 && o2 === o1) {
        out.kind = "same"; out.steps.push("Same letters in the same roles: nothing to change.");
        out.f2h = f2; out.b2h = b2;
      } else if (e2 === o1 && o2 === e1) {
        out.kind = "swap"; out.steps.push("Same letters, roles exchanged: file 2 counts " + e2 + ", file 1 counts " + e1 + ". Swap: β → −β, f → 1 − f.");
        out.f2h = isFinite(f2) ? 1 - f2 : NaN; out.b2h = -b2;
      } else if (ce2 === e1 && co2 === o1) {
        out.kind = "flip"; out.steps.push("File 2's letters are complements of file 1's: " + e2 + "/" + o2 + " read on the other strand is " +
          ce2 + "/" + co2 + ". Flip the letters; β and f stay as they are.");
        out.f2h = f2; out.b2h = b2;
      } else if (ce2 === o1 && co2 === e1) {
        out.kind = "flip+swap"; out.steps.push("Flip: " + e2 + "/" + o2 + " on the other strand is " + ce2 + "/" + co2 + ".");
        out.steps.push("Now file 2 counts " + ce2 + ", file 1's other allele. Swap: β → −β, f → 1 − f.");
        out.f2h = isFinite(f2) ? 1 - f2 : NaN; out.b2h = -b2;
      } else {
        out.kind = "incompatible"; out.drop = true;
        out.steps.push("No flip or swap turns " + e2 + "/" + o2 + " into " + e1 + "/" + o1 +
          ". These are different alleles: a different variant, a multiallelic site or an error. Drop the SNP.");
        return out;
      }
      out.e2h = e1; out.o2h = o1;
    }
    if (isFinite(f1) && isFinite(out.f2h) && Math.abs(f1 - out.f2h) > 0.2) {
      out.warn = "After harmonizing, the frequencies of " + e1 + " differ by " + Math.abs(f1 - out.f2h).toFixed(2) +
        " (" + f1.toFixed(3) + " vs " + out.f2h.toFixed(3) + "). Check that the files describe similar populations; otherwise suspect an error and drop the SNP.";
    }
    return out;
  }

  var PRESETS = [
    { group: "PennCATH vs the practical's 1000 Genomes panel (real)", items: [
      { k: "same", label: "Same letters · rs2257182", r1: ["C", "T", 0.394, ""], r2: ["C", "T", 0.368, ""],
        note: "rs2257182 (chr1:2,082,566, GRCh37). File 1: the practical's 1000 Genomes panel, frequency among the 503 people labeled EUR. File 2: the PennCATH .bim (A1 as effect allele), frequency among all 1,401 people before QC. Computed for this page." },
      { k: "swap", label: "Swap · rs11121675", r1: ["T", "G", 0.649, ""], r2: ["G", "T", 0.352, ""],
        note: "rs11121675 (chr1:11,060,075). The panel lists T first, PennCATH lists G first: the same SNP with A1 and A2 exchanged. PLINK's merge handles this case by itself. Computed for this page." },
      { k: "flip", label: "Strand flip · rs2465136", r1: ["C", "T", 0.321, ""], r2: ["G", "A", 0.278, ""],
        note: "rs2465136 (chr1:990,417). The panel writes C/T, PennCATH writes G/A: the same alleles read from opposite strands. PLINK's merge stops at such SNPs and lists them in a .missnp file. Computed for this page." },
      { k: "flipswap", label: "Flip + swap · rs2840528", r1: ["A", "G", 0.576, ""], r2: ["C", "T", 0.404, ""],
        note: "rs2840528 (chr1:2,283,896). PennCATH's C/T is G/A on the panel's strand, with the alleles in the other order. Computed for this page." },
      { k: "rs3094315", label: "Strand flip · rs3094315", r1: ["G", "A", 0.160, ""], r2: ["C", "T", 0.178, ""],
        note: "rs3094315 (chr1:752,566, GRCh37). File 1: the + strand of GRCh37 with the G frequency among 1000 Genomes EUR samples (Ensembl). File 2: the PennCATH .bim, which lists this SNP on the − strand. Computed for this page." },
      { k: "palres", label: "A/T or C/G, resolved · rs1983210", r1: ["C", "G", 0.263, ""], r2: ["G", "C", 0.269, ""],
        note: "rs1983210 (chr2:220,421,417). A C/G SNP with minor allele frequency near 0.27 in both files: frequencies settle the strand. Computed for this page." },
      { k: "palamb", label: "A/T or C/G, near 0.5 · rs1042464", r1: ["A", "T", 0.517, ""], r2: ["T", "A", 0.495, ""],
        note: "rs1042464 (chr3:186,395,572). An A/T SNP with both alleles near 50%: both readings predict about 0.5, so the strand cannot be settled. Computed for this page." },
      { k: "paldisc", label: "A/T or C/G, frequencies disagree · rs9282553", r1: ["G", "C", 0.065, ""], r2: ["G", "C", 0.383, ""],
        note: "rs9282553 (chr17:67,108,362). The frequency of G is 0.065 in the panel's EUR samples but 0.383 in PennCATH, where only 432 of 1,401 people have a call: a sign of a poorly measured SNP, not of a strand problem. Computed for this page." }
    ] },
    { group: "Slide 69 (directions only: β = +1 increase, −1 decrease)", items: [
      { k: "s69a", label: "Slide 69 · rs8675309", r1: ["G", "T", "", 1], r2: ["C", "A", "", 1],
        note: "Study A: G increases “rhubarbiol” relative to T. Study B: C increases it relative to A. Fictional SNP and trait from slide 69." },
      { k: "s69b", label: "Slide 69 · rs90210", r1: ["G", "C", "", 1], r2: ["C", "G", "", -1],
        note: "Study A: G increases “Luke Perry Factor” relative to C. Study B: C decreases it relative to G. Fictional SNP and trait from slide 69. Add frequencies to see how they settle it." }
    ] },
    { group: "Summary statistics (illustrative numbers)", items: [
      { k: "ill-flipswap", label: "Flip + swap with effects", r1: ["A", "G", 0.25, 0.20], r2: ["C", "T", 0.75, -0.20],
        note: "Illustrative: file 2 reports C/T with β = −0.20 per copy of C. On file 1's strand C is G, file 1's other allele, so per copy of A the effect is +0.20." },
      { k: "ill-bad", label: "Not the same alleles", r1: ["A", "G", 0.30, 0.10], r2: ["A", "C", 0.30, 0.10],
        note: "Illustrative: A/G against A/C. No flip or swap makes the pairs match." }
    ] }
  ];

  var STATS = { harmonize: harmonize, isPal: isPal, PRESETS: PRESETS };
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
  function fmtF(x) { return isFinite(x) ? x.toFixed(3) : "—"; }
  function fmtB(x) { return !isFinite(x) ? "—" : (x < 0 ? "−" + (-x).toFixed(2) : (x > 0 ? "+" : "") + x.toFixed(2)); }
  function base(b) { return '<span class="b-' + b + '">' + b + "</span>"; }

  var KIND = {
    "same": ["Same letters, same roles", "ok"],
    "swap": ["Allele swap", "ok"],
    "flip": ["Strand flip", "ok"],
    "flip+swap": ["Strand flip and allele swap", "ok"],
    "pal-same": ["A/T or C/G SNP: same strand (from frequencies)", "warn"],
    "pal-opp": ["A/T or C/G SNP: opposite strands (from frequencies)", "warn"],
    "ambiguous": ["A/T or C/G SNP: strand cannot be settled → drop", "bad"],
    "incompatible": ["Different alleles → drop", "bad"],
    "invalid": ["Check the input", "bad"]
  };

  function init() {
    var root = document.getElementById("w-harmonize");
    if (!root) return;
    var body = root.querySelector(".widget-body");
    if (!body) return;
    body.innerHTML = "";

    var top = h("div", { "class": "controls" });
    var pl = h("label", null, "Example ");
    var sel = h("select", { "aria-label": "Choose an example SNP" });
    PRESETS.forEach(function (g) {
      var og = h("optgroup", { label: g.group });
      g.items.forEach(function (it) { var o = h("option", { value: it.k }); o.textContent = it.label; og.appendChild(o); });
      sel.appendChild(og);
    });
    pl.appendChild(sel); top.appendChild(pl);
    body.appendChild(top);
    var note = h("p", { "class": "note hz-note" }, "");
    body.appendChild(note);

    var files = h("div", { "class": "hz-files" });
    body.appendChild(files);
    var inputs = [];
    ["File 1 · reference", "File 2 · to align"].forEach(function (title, i) {
      var fs = h("fieldset", { "class": "hz-file" });
      fs.appendChild(h("legend", null, title));
      var e = h("select", { "aria-label": "File " + (i + 1) + " effect allele" });
      var o = h("select", { "aria-label": "File " + (i + 1) + " other allele" });
      BASES.forEach(function (b) { e.appendChild(h("option", { value: b }, b)); o.appendChild(h("option", { value: b }, b)); });
      var f = h("input", { type: "number", min: "0", max: "1", step: "0.001", inputmode: "decimal", placeholder: "blank", "aria-label": "File " + (i + 1) + " effect-allele frequency" });
      var b = h("input", { type: "number", step: "0.01", inputmode: "decimal", placeholder: "blank", "aria-label": "File " + (i + 1) + " effect per copy of the effect allele" });
      var l1 = h("label", null, "<span>effect allele</span>"); l1.appendChild(e);
      var l2 = h("label", null, "<span>other allele</span>"); l2.appendChild(o);
      var l3 = h("label", null, "<span>effect-allele freq.</span>"); l3.appendChild(f);
      var l4 = h("label", null, "<span>β per copy</span>"); l4.appendChild(b);
      fs.appendChild(l1); fs.appendChild(l2); fs.appendChild(l3); fs.appendChild(l4);
      files.appendChild(fs);
      inputs.push({ e: e, o: o, f: f, b: b });
    });

    var tctl = h("div", { "class": "controls" });
    var tl = h("label", null, "Drop A/T and C/G SNPs when MAF &gt; ");
    var tIn = h("input", { type: "range", min: "0.30", max: "0.49", step: "0.01", value: "0.42", "aria-label": "Minor allele frequency threshold for A/T and C/G SNPs" });
    var tOut = h("output", { "class": "hz-val" }, "0.42");
    tl.appendChild(tIn); tl.appendChild(tOut); tctl.appendChild(tl);
    body.appendChild(tctl);

    var outGrid = h("div", { "class": "hz-out" });
    body.appendChild(outGrid);
    var left = h("div", { "class": "hz-left" });
    outGrid.appendChild(left);
    var verdict = h("p", { "class": "hz-verdict", "aria-live": "polite" });
    left.appendChild(verdict);
    var steps = h("ol", { "class": "hz-steps" });
    left.appendChild(steps);
    var table = h("div", { "class": "readout hz-table" });
    left.appendChild(table);
    var warn = h("p", { "class": "hz-warn" });
    left.appendChild(warn);
    var right = h("div", { "class": "hz-right" });
    outGrid.appendChild(right);
    var plot = svgEl("svg", { viewBox: "0 0 300 300", role: "img", "aria-labelledby": "hz-plot-t", "class": "hz-svg" });
    var pt = svgEl("title", { id: "hz-plot-t" }, plot); pt.textContent = "Frequency of file 1's effect allele in file 1 (horizontal) and in file 2 (vertical)";
    right.appendChild(plot);
    right.appendChild(h("p", { "class": "note" }, "Filled dot: file 2 after harmonizing. For A/T and C/G SNPs the open dot is the other strand reading. Shaded: MAF above the threshold."));

    // static frame of the plot
    var P = { x0: 46, x1: 288, y0: 252, y1: 12 };
    function px(v) { return P.x0 + v * (P.x1 - P.x0); }
    function py(v) { return P.y0 - v * (P.y0 - P.y1); }
    var bandV = svgEl("rect", { fill: "var(--pitfall-soft)" }, plot);
    var bandH = svgEl("rect", { fill: "var(--pitfall-soft)" }, plot);
    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
      svgEl("line", { x1: px(v), x2: px(v), y1: P.y0, y2: P.y1, stroke: "var(--border)" }, plot);
      svgEl("line", { x1: P.x0, x2: P.x1, y1: py(v), y2: py(v), stroke: "var(--border)" }, plot);
      svgText(plot, px(v), P.y0 + 15, String(v), "t-xs", { "text-anchor": "middle" });
      svgText(plot, P.x0 - 5, py(v) + 4, String(v), "t-xs", { "text-anchor": "end" });
    });
    svgEl("line", { x1: px(0), y1: py(0), x2: px(1), y2: py(1), stroke: "var(--key)", "stroke-width": 2 }, plot);
    svgEl("line", { x1: px(0), y1: py(1), x2: px(1), y2: py(0), stroke: "var(--fg-faint)", "stroke-width": 1.5, "stroke-dasharray": "5 4" }, plot);
    svgText(plot, px(0.98), py(0.9), "agree", "t-xs", { "text-anchor": "end" }).style.fill = "var(--key)";
    svgText(plot, px(0.98), py(0.1), "1 − f", "t-xs", { "text-anchor": "end" });
    svgText(plot, (P.x0 + P.x1) / 2, P.y0 + 32, "file 1: frequency of its effect allele", "t-sm", { "text-anchor": "middle" });
    svgText(plot, 11, (P.y0 + P.y1) / 2, "file 2, same allele", "t-sm", { "text-anchor": "middle", transform: "rotate(-90 11 " + ((P.y0 + P.y1) / 2) + ")" });
    var dyn = svgEl("g", null, plot);

    var state = { t: 0.42 };

    function readRow(i) { var r = inputs[i]; return { e: r.e.value, o: r.o.value, f: r.f.value, b: r.b.value }; }
    function setRow(i, v) { var r = inputs[i]; r.e.value = v[0]; r.o.value = v[1]; r.f.value = v[2] === "" ? "" : String(v[2]); r.b.value = v[3] === "" ? "" : String(v[3]); }

    function update() {
      tOut.textContent = state.t.toFixed(2);
      var t = state.t;
      bandV.setAttribute("x", px(t)); bandV.setAttribute("width", px(1 - t) - px(t)); bandV.setAttribute("y", P.y1); bandV.setAttribute("height", P.y0 - P.y1);
      bandH.setAttribute("x", P.x0); bandH.setAttribute("width", P.x1 - P.x0); bandH.setAttribute("y", py(1 - t)); bandH.setAttribute("height", py(t) - py(1 - t));
      var r1 = readRow(0), r2 = readRow(1);
      var res = harmonize(r1, r2, t);
      var k = KIND[res.kind] || ["", ""];
      verdict.className = "hz-verdict " + k[1];
      verdict.innerHTML = "<strong>" + k[0] + ".</strong> " + (res.drop ? "File 2 cannot be aligned to file 1 safely." :
        "File 2, rewritten in file 1's terms, counts " + base(res.e2h) + ".");
      steps.innerHTML = res.steps.map(function (s) { return "<li>" + s.replace(/\b([ACGT])\/([ACGT])\b/g, function (m0, a, b) { return base(a) + "/" + base(b); }) + "</li>"; }).join("");
      var f1 = Number(r1.f === "" ? NaN : r1.f), b1 = Number(r1.b === "" ? NaN : r1.b);
      var rows = '<table class="hz-t"><thead><tr><th></th><th>effect</th><th>other</th><th>freq.</th><th>β</th></tr></thead><tbody>' +
        "<tr><th>file 1</th><td>" + base(r1.e) + "</td><td>" + base(r1.o) + "</td><td>" + fmtF(f1) + "</td><td>" + fmtB(b1) + "</td></tr>" +
        "<tr><th>file 2 as given</th><td>" + base(r2.e) + "</td><td>" + base(r2.o) + "</td><td>" + fmtF(Number(r2.f === "" ? NaN : r2.f)) + "</td><td>" + fmtB(Number(r2.b === "" ? NaN : r2.b)) + "</td></tr>";
      if (!res.drop) {
        rows += '<tr class="hz-h"><th>file 2 harmonized</th><td>' + base(res.e2h) + "</td><td>" + base(res.o2h) + "</td><td>" + fmtF(res.f2h) + "</td><td>" + fmtB(res.b2h) + "</td></tr>";
      } else if (res.readings) {
        res.readings.forEach(function (rd) {
          rows += '<tr class="hz-alt"><th>if ' + rd.strand + " strand</th><td>" + base(rd.e2h) + "</td><td>" + base(rd.o2h) + "</td><td>" + fmtF(rd.f2h) + "</td><td>" + fmtB(rd.b2h) + "</td></tr>";
        });
      }
      rows += "</tbody></table>";
      var agree = "";
      var b2use = !res.drop ? res.b2h : NaN;
      if (isFinite(b1) && isFinite(b2use) && b1 !== 0 && b2use !== 0) {
        agree = '<div class="hz-agree">Per copy of ' + base(r1.e) + ": file 1 " + fmtB(b1) + ", file 2 " + fmtB(b2use) + " → " +
          ((b1 > 0) === (b2use > 0) ? "same direction." : "opposite directions.") + "</div>";
      } else if (res.readings && isFinite(b1) && res.readings.every(function (rd) { return isFinite(rd.b2h); })) {
        agree = '<div class="hz-agree">' + res.readings.map(function (rd) {
          return "If " + rd.strand + " strand: " + ((b1 > 0) === (rd.b2h > 0) ? "the files agree" : "the files contradict each other");
        }).join("; ") + ".</div>";
      }
      table.innerHTML = rows + agree;
      warn.textContent = res.warn || "";
      warn.style.display = res.warn ? "" : "none";
      drawPoints(res, f1);
    }

    function drawPoints(res, f1) {
      while (dyn.firstChild) dyn.removeChild(dyn.firstChild);
      if (!isFinite(f1)) { svgText(dyn, (P.x0 + P.x1) / 2, py(0.55), "enter frequencies to plot", "t-sm", { "text-anchor": "middle" }); return; }
      var pts = [];
      if (res.readings) {
        res.readings.forEach(function (rd) {
          if (isFinite(rd.f2h)) pts.push({ y: rd.f2h, filled: !res.drop && res.chosen === rd.strand, lab: rd.strand });
        });
      } else if (isFinite(res.f2h)) {
        pts.push({ y: res.f2h, filled: true });
      }
      if (!pts.length) { svgText(dyn, (P.x0 + P.x1) / 2, py(0.55), "enter both frequencies to plot", "t-sm", { "text-anchor": "middle" }); return; }
      pts.forEach(function (p) {
        svgEl("circle", { cx: px(f1), cy: py(p.y), r: 7, fill: p.filled ? "var(--accent)" : "var(--bg)", stroke: "var(--accent)", "stroke-width": 2.5 }, dyn);
        if (p.lab) svgText(dyn, px(f1) + (f1 > 0.6 ? -11 : 11), py(p.y) + 4, p.lab + " strand", "t-xs", { "text-anchor": f1 > 0.6 ? "end" : "start" });
      });
    }

    function applyPreset(key) {
      var it = null;
      PRESETS.forEach(function (g) { g.items.forEach(function (x) { if (x.k === key) it = x; }); });
      if (!it) return;
      setRow(0, it.r1); setRow(1, it.r2);
      note.textContent = it.note;
      update();
    }

    sel.addEventListener("change", function () { applyPreset(sel.value); });
    inputs.forEach(function (r) {
      [r.e, r.o].forEach(function (x) { x.addEventListener("change", function () { note.textContent = "Your own entries."; update(); }); });
      [r.f, r.b].forEach(function (x) { x.addEventListener("input", function () { note.textContent = "Your own entries."; update(); }); });
    });
    tIn.addEventListener("input", function () { state.t = Number(tIn.value); update(); });

    sel.value = "flip";
    applyPreset("flip");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
