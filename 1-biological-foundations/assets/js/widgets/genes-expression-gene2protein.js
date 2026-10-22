/* "From gene to protein" stepper (genes-expression page).
   A toy gene (promoter, exon 1, intron, exon 2) is transcribed, spliced and translated step by step.
   Hover or tap any base, codon or amino acid to see which DNA positions it came from.
   Vanilla JS, no network. Root element: <div class="widget" id="w-gene2protein"> with a .g2p-mount inside. */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ model (pure, testable) */
  var MODEL = (function () {
    // Coding strand of the toy gene, 5' -> 3'. Index 0..62.
    var PARTS = [
      { id: "prom", seq: "TATAAA" },          // 0-5   promoter (not transcribed)
      { id: "utr5", seq: "AGCACC" },          // 6-11  5' UTR (exon 1)
      { id: "cds1", seq: "ATGGCCTGGAAGAG" },  // 12-25 coding part of exon 1
      { id: "intr", seq: "GTAAGTCTTTTCAG" },  // 26-39 intron (GT ... AG)
      { id: "cds2", seq: "GCTGTTCGGCTAA" },   // 40-52 coding part of exon 2 (ends with stop TAA)
      { id: "utr3", seq: "GCAATAAAGC" }       // 53-62 3' UTR (exon 2), contains the AATAAA poly(A) signal
    ];
    var DNA = "", REGION = [];
    PARTS.forEach(function (p) {
      for (var i = 0; i < p.seq.length; i++) { DNA += p.seq.charAt(i); REGION.push(p.id); }
    });
    var TSS = 6;                 // first transcribed base
    var INTRON = [26, 40];       // [start, end) of the intron
    var COMP = { A: "T", T: "A", C: "G", G: "C" };
    var CODE = {};
    (function () {
      var b = "UCAG";
      var aa = "FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG";
      var n = 0;
      for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) for (var k = 0; k < 4; k++) {
        CODE[b[i] + b[j] + b[k]] = aa.charAt(n++);
      }
    })();
    var THREE = { A: "Ala", R: "Arg", N: "Asn", D: "Asp", C: "Cys", Q: "Gln", E: "Glu", G: "Gly", H: "His", I: "Ile",
      L: "Leu", K: "Lys", M: "Met", F: "Phe", P: "Pro", S: "Ser", T: "Thr", W: "Trp", Y: "Tyr", V: "Val", "*": "Stop" };

    function toRNA(s) { return s.replace(/T/g, "U"); }

    function build(intronKept) {
      var i, pre = [], mrna = [];
      for (i = TSS; i < DNA.length; i++) pre.push(i);                 // pre-mRNA: DNA index of each nucleotide
      for (i = 0; i < pre.length; i++) {
        var d = pre[i];
        if (intronKept || d < INTRON[0] || d >= INTRON[1]) mrna.push(d);
      }
      var mseq = mrna.map(function (d) { return toRNA(DNA.charAt(d)); }).join("");
      var start = mseq.indexOf("AUG");
      var codons = [];
      for (var k = start; k >= 0 && k + 2 < mseq.length; k += 3) {
        var c = mseq.substr(k, 3);
        var a = CODE[c];
        codons.push({ k: k, codon: c, aa1: a, aa3: THREE[a], dna: [mrna[k], mrna[k + 1], mrna[k + 2]] });
        if (a === "*") break;
      }
      var protein = codons.filter(function (c) { return c.aa1 !== "*"; }).map(function (c) { return c.aa3; });
      return {
        pre: pre, mrna: mrna, mseq: mseq, start: start, codons: codons, protein: protein,
        stopFound: codons.length > 0 && codons[codons.length - 1].aa1 === "*"
      };
    }

    return {
      DNA: DNA, REGION: REGION, TSS: TSS, INTRON: INTRON, COMP: COMP, CODE: CODE, THREE: THREE,
      toRNA: toRNA, build: build
    };
  })();

  if (typeof module !== "undefined" && module.exports) { module.exports = MODEL; return; }

  /* ------------------------------------------------------------------ view */
  var NS = "http://www.w3.org/2000/svg";
  var P = 11;            // pitch per base (SVG units)
  var X0 = 116;          // left edge of base 0
  var W = X0 + MODEL.DNA.length * P + 60;
  var H = 262;
  var Y = { lab: 13, bar: 19, cod: 54, tpl: 74, pre: 116, mrna: 166, frame: 182, aa: 204 };
  var REGION_FILL = { prom: "var(--q7)", utr5: "var(--q5)", cds1: "var(--q1)", intr: "#d5dae2", cds2: "var(--q1)", utr3: "var(--q5)" };
  var REGION_TINT = { prom: "#efe3ec", utr5: "#e3f1f0", cds1: "#e1e9f2", intr: "#f1f3f6", cds2: "#e1e9f2", utr3: "#e3f1f0" };
  var STEPS = [
    "The gene",
    "Transcription",
    "Splicing",
    "Reading frame",
    "Translation",
    "Back to the DNA"
  ];

  function el(name, attrs, parent, text) {
    var e = document.createElementNS(NS, name);
    if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function h(tag, attrs, parent, text) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function xOf(i) { return X0 + i * P; }
  function baseClass(b) { return "g2p-b base-" + (b === "U" ? "T" : b); }

  function init() {
    var root = document.getElementById("w-gene2protein");
    if (!root) return;
    var mount = root.querySelector(".g2p-mount");
    if (!mount) return;

    var state = { step: 1, kept: false, pinned: null };

    /* controls */
    var controls = h("div", { "class": "controls g2p-controls" }, mount);
    var back = h("button", { "class": "btn", type: "button", "aria-label": "Previous step" }, controls, "◀ Back");
    var next = h("button", { "class": "btn primary", type: "button", "aria-label": "Next step" }, controls, "Next ▶");
    var pills = h("div", { "class": "g2p-pills", role: "group", "aria-label": "Jump to step" }, controls);
    var pillBtns = STEPS.map(function (name, i) {
      return h("button", { "class": "btn g2p-pill", type: "button", "data-step": String(i + 1), "aria-label": "Step " + (i + 1) + ": " + name }, pills, (i + 1) + " " + name);
    });
    var optRow = h("div", { "class": "controls g2p-opts" }, mount);
    var lab = h("label", null, optRow);
    var chk = h("input", { type: "checkbox" }, lab);
    lab.appendChild(document.createTextNode("Splicing fails (intron kept)"));
    var reset = h("button", { "class": "btn", type: "button" }, optRow, "Reset");

    /* drawing area */
    var scroller = h("div", { "class": "g2p-scroll" }, mount);
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-labelledby": "g2p-t", "class": "g2p-svg" }, scroller);
    el("title", { id: "g2p-t" }, svg, "A toy gene going from DNA to protein, step by step");
    var gStatic = el("g", null, svg);
    var gDyn = el("g", null, svg);

    // one line under the drawing that says, in words, where the highlighted base or codon came from
    var where = h("div", { "class": "g2p-where", "aria-live": "polite" }, mount);
    var WHERE_IDLE = "Hover over (or tap) a base, codon or amino acid to trace it back to the DNA.";
    where.textContent = WHERE_IDLE;
    var readout = h("div", { "class": "readout g2p-readout", "aria-live": "polite" }, mount);

    var REGION_NAME = { prom: "promoter", utr5: "5′ UTR, exon 1", cds1: "coding part of exon 1", intr: "intron",
      cds2: "coding part of exon 2", utr3: "3′ UTR, exon 2" };
    function baseText(d) {
      var b = MODEL.DNA.charAt(d);
      return "DNA base " + (d + 1) + " of 63 (" + REGION_NAME[MODEL.REGION[d]] + "): " + b + " on the coding strand, " +
        MODEL.COMP[b] + " on the template strand.";
    }
    function codonText(c) {
      var pos = c.dna.map(function (d) { return d + 1; });
      var regs = [];
      c.dna.forEach(function (d) { var r = REGION_NAME[MODEL.REGION[d]]; if (regs.indexOf(r) < 0) regs.push(r); });
      return "Codon " + c.codon + " → " + (c.aa1 === "*" ? "stop" : c.aa3) + ": from DNA bases " + pos[0] + ", " + pos[1] +
        " and " + pos[2] + " (" + regs.join("; ") + ").";
    }

    /* index of drawn elements by DNA position, for cross-highlighting */
    var byDna = {};
    function reg(d, node) { (byDna[d] = byDna[d] || []).push(node); }

    function hl(list, on) {
      list.forEach(function (d) { (byDna[d] || []).forEach(function (n) { n.classList.toggle("g2p-hl", on); }); });
    }
    function wireHover(node, dnaList, text) {
      node.style.cursor = "pointer";
      node.addEventListener("mouseenter", function () { if (!state.pinned) { hl(dnaList, true); where.textContent = text; } });
      node.addEventListener("mouseleave", function () { if (!state.pinned) { hl(dnaList, false); where.textContent = WHERE_IDLE; } });
      node.addEventListener("click", function (ev) {
        ev.stopPropagation();
        if (state.pinned) hl(state.pinned, false);
        state.pinned = (state.pinned && state.pinned.join() === dnaList.join()) ? null : dnaList;
        if (state.pinned) hl(state.pinned, true);
        where.textContent = state.pinned ? text : WHERE_IDLE;
      });
    }
    svg.addEventListener("click", function () {
      if (state.pinned) { hl(state.pinned, false); state.pinned = null; where.textContent = WHERE_IDLE; }
    });

    function cell(parent, x, y, d, letter, tint, extraCls) {
      var g = el("g", { "class": "g2p-cell" + (extraCls ? " " + extraCls : "") }, parent);
      var r = el("rect", { x: x, y: y - 11, width: P - 1, height: 15, rx: 2, fill: tint, "class": "g2p-bg" }, g);
      el("text", { x: x + (P - 1) / 2, y: y, "text-anchor": "middle", "class": baseClass(letter) }, g, letter);
      reg(d, r);
      wireHover(g, [d], baseText(d));
      return g;
    }

    /* static part: annotation bars, both DNA strands */
    function drawStatic() {
      var DNA = MODEL.DNA, R = MODEL.REGION;
      // row labels
      el("text", { x: 6, y: Y.cod, "class": "t-sm g2p-rowlab" }, gStatic, "coding strand");
      el("text", { x: 6, y: Y.tpl, "class": "t-sm g2p-rowlab" }, gStatic, "template strand");
      el("text", { x: X0 - 16, y: Y.cod, "class": "t-xs" }, gStatic, "5′");
      el("text", { x: xOf(DNA.length) + 3, y: Y.cod, "class": "t-xs" }, gStatic, "3′");
      el("text", { x: X0 - 16, y: Y.tpl, "class": "t-xs" }, gStatic, "3′");
      el("text", { x: xOf(DNA.length) + 3, y: Y.tpl, "class": "t-xs" }, gStatic, "5′");
      el("text", { x: 6, y: Y.bar + 10, "class": "t-sm g2p-rowlab" }, gStatic, "DNA");
      // region bar (UTR / coding / intron colors)
      var segs = [["prom", 0, 6, "promoter"], ["utr5", 6, 12, "5′ UTR"], ["cds1", 12, 26, "coding"], ["intr", 26, 40, "intron"],
        ["cds2", 40, 53, "coding"], ["utr3", 53, 63, "3′ UTR"]];
      segs.forEach(function (s) {
        el("rect", { x: xOf(s[1]), y: Y.bar, width: (s[2] - s[1]) * P - 1, height: 13, rx: 2, fill: REGION_FILL[s[0]] }, gStatic);
        var dark = (s[0] === "intr" || s[0] === "utr5" || s[0] === "utr3");
        el("text", { x: xOf(s[1]) + (s[2] - s[1]) * P / 2, y: Y.bar + 10, "text-anchor": "middle", "class": "t-xs g2p-barlab" + (dark ? " g2p-dark" : "") }, gStatic, s[3]);
      });
      // exon brackets above the bar
      [[6, 26, "exon 1"], [40, 63, "exon 2"]].forEach(function (e) {
        var x1 = xOf(e[0]), x2 = xOf(e[1]) - 1;
        el("path", { d: "M" + x1 + "," + (Y.bar - 2) + " v-4 H" + x2 + " v4", fill: "none", stroke: "var(--fg-muted)", "stroke-width": 1 }, gStatic);
        el("text", { x: (x1 + x2) / 2, y: Y.lab - 3, "text-anchor": "middle", "class": "t-xs g2p-strong" }, gStatic, e[2]);
      });
      // transcription start site arrow
      var xt = xOf(MODEL.TSS);
      el("path", { d: "M" + xt + "," + (Y.cod - 13) + " V" + (Y.cod - 19) + " h12", fill: "none", stroke: "var(--fg)", "stroke-width": 1.4 }, gStatic);
      el("polygon", { points: (xt + 16) + "," + (Y.cod - 19) + " " + (xt + 11) + "," + (Y.cod - 22) + " " + (xt + 11) + "," + (Y.cod - 16), fill: "var(--fg)" }, gStatic);
      // the two strands
      for (var i = 0; i < DNA.length; i++) {
        var b = DNA.charAt(i);
        cell(gStatic, xOf(i), Y.cod, i, b, REGION_TINT[R[i]], "g2p-dna");
        cell(gStatic, xOf(i), Y.tpl, i, MODEL.COMP[b], REGION_TINT[R[i]], "g2p-dna g2p-tplcell");
      }
    }

    function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

    function drawDynamic() {
      clear(gDyn);
      // drop dynamic nodes from the highlight index (static ones are rebuilt below by re-registering)
      byDna = {};
      // re-register static rects
      Array.prototype.forEach.call(gStatic.querySelectorAll("g.g2p-dna"), function (g, n) {
        // DNA cells were drawn in pairs (coding, template) for i = 0..62
        var i = Math.floor(n / 2);
        reg(i, g.querySelector("rect"));
      });

      var st = state.step, m = MODEL.build(state.kept), R = MODEL.REGION;
      svg.classList.toggle("g2p-map", st >= 6);

      // mark coding positions on DNA in step 6
      var coding = {};
      m.codons.forEach(function (c) { c.dna.forEach(function (d) { coding[d] = c.aa1 === "*" ? "stop" : "aa"; }); });
      Array.prototype.forEach.call(gStatic.querySelectorAll("g.g2p-dna"), function (g, n) {
        var i = Math.floor(n / 2);
        g.classList.toggle("g2p-dim", st >= 6 && !coding[i]);
        g.classList.toggle("g2p-codingpos", st >= 6 && coding[i] === "aa");
        g.classList.toggle("g2p-stoppos", st >= 6 && coding[i] === "stop");
      });

      if (st >= 2) {
        el("text", { x: 6, y: Y.pre, "class": "t-sm g2p-rowlab" }, gDyn, "pre-mRNA");
        el("text", { x: xOf(MODEL.TSS) - 16, y: Y.pre, "class": "t-xs" }, gDyn, "5′");
        el("text", { x: xOf(MODEL.DNA.length) + 3, y: Y.pre, "class": "t-xs" }, gDyn, "3′");
        m.pre.forEach(function (d) {
          var removed = st >= 3 && !state.kept && d >= MODEL.INTRON[0] && d < MODEL.INTRON[1];
          cell(gDyn, xOf(d), Y.pre, d, MODEL.toRNA(MODEL.DNA.charAt(d)), REGION_TINT[R[d]], removed ? "g2p-removed" : "");
        });
        if (st === 2) {
          // transcription arrow from the template strand
          el("path", { d: "M" + xOf(30) + "," + (Y.tpl + 8) + " V" + (Y.pre - 16), stroke: "var(--fg-muted)", "stroke-width": 1.5, fill: "none", "stroke-dasharray": "3 2" }, gDyn);
          el("polygon", { points: xOf(30) + "," + (Y.pre - 13) + " " + (xOf(30) - 4) + "," + (Y.pre - 20) + " " + (xOf(30) + 4) + "," + (Y.pre - 20), fill: "var(--fg-muted)" }, gDyn);
          el("text", { x: xOf(30) + 8, y: Y.tpl + 22, "class": "t-xs g2p-strong" }, gDyn, "RNA polymerase reads the template strand and builds RNA 5′ → 3′");
        }
        if (st >= 3 && !state.kept) {
          var xa = xOf(MODEL.INTRON[0]), xb = xOf(MODEL.INTRON[1]) - 1;
          el("line", { x1: xa, y1: Y.pre - 4, x2: xb, y2: Y.pre - 4, stroke: "var(--pitfall)", "stroke-width": 1.4 }, gDyn);
          el("text", { x: (xa + xb) / 2, y: Y.pre - 15, "text-anchor": "middle", "class": "t-xs g2p-red" }, gDyn, "intron removed");
        }
      }

      if (st >= 3) {
        el("text", { x: 6, y: Y.mrna, "class": "t-sm g2p-rowlab" }, gDyn, "mRNA");
        // mRNA k-th nucleotide drawn at x of (TSS + k): exon 1 stays in place, exon 2 moves left
        var xm = function (k) { return xOf(MODEL.TSS + k); };
        // cap and tail
        el("circle", { cx: xm(0) - 9, cy: Y.mrna - 4, r: 4.5, fill: "var(--q4)" }, gDyn);
        el("text", { x: xm(0) - 9, y: Y.mrna + 15, "text-anchor": "middle", "class": "t-xs" }, gDyn, "cap");
        var endX = xm(m.mrna.length);
        el("text", { x: endX + 2, y: Y.mrna, "class": "g2p-tail" }, gDyn, "AAAA…");
        // end-anchored under "AAAA…" so the label stays inside the SVG when the intron is kept
        el("text", { x: endX + 38, y: Y.mrna + 15, "text-anchor": "end", "class": "t-xs" }, gDyn, "poly(A) tail");
        // connectors from pre-mRNA to mRNA for the part that moved
        if (!state.kept) {
          var firstEx2 = m.mrna.indexOf(MODEL.INTRON[1]);
          var lastK = m.mrna.length - 1;
          [[MODEL.INTRON[1], firstEx2], [m.mrna[lastK], lastK]].forEach(function (pair, j) {
            var xFrom = xOf(pair[0]) + (j === 1 ? P - 1 : 0), xTo = xm(pair[1]) + (j === 1 ? P - 1 : 0);
            el("line", { x1: xFrom, y1: Y.pre + 5, x2: xTo, y2: Y.mrna - 12, stroke: "var(--q1)", "stroke-width": 1, "stroke-dasharray": "3 2" }, gDyn);
          });
          // junction tick
          var xj = xm(firstEx2);
          el("line", { x1: xj - 0.5, y1: Y.mrna - 14, x2: xj - 0.5, y2: Y.mrna + 6, stroke: "var(--fg)", "stroke-width": 1.2 }, gDyn);
          if (st === 3) el("text", { x: xj, y: Y.mrna + 15, "text-anchor": "middle", "class": "t-xs g2p-strong" }, gDyn, "exon–exon junction");
        }
        m.mrna.forEach(function (d, k) {
          cell(gDyn, xm(k), Y.mrna, d, MODEL.toRNA(MODEL.DNA.charAt(d)), REGION_TINT[R[d]], "");
        });

        if (st >= 4) {
          m.codons.forEach(function (c, n) {
            var x1 = xm(c.k), x2 = xm(c.k + 3) - 1;
            var cls = c.aa1 === "*" ? "g2p-stop" : (n === 0 ? "g2p-start" : "g2p-frame");
            el("path", { d: "M" + x1 + "," + (Y.frame - 6) + " v5 H" + x2 + " v-5", fill: "none", "class": cls }, gDyn);
            var hit = el("rect", { x: x1, y: Y.mrna - 12, width: x2 - x1, height: 22, fill: "transparent" }, gDyn);
            wireHover(hit, c.dna, codonText(c));
          });
          var c0 = m.codons[0];
          el("text", { x: xm(c0.k) - 2, y: Y.frame + 10, "text-anchor": "end", "class": "t-xs g2p-green" }, gDyn, "start codon");
          var cl = m.codons[m.codons.length - 1];
          if (st === 4 && m.stopFound) {
            el("text", { x: xm(cl.k + 3) + 2, y: Y.frame + 10, "class": "t-xs g2p-red" }, gDyn, "stop codon");
          }
        }

        if (st >= 5) {
          el("text", { x: 6, y: Y.aa + 4, "class": "t-sm g2p-rowlab" }, gDyn, "protein");
          m.codons.forEach(function (c) {
            var x1 = xm(c.k), w = 3 * P - 2;
            var g = el("g", { "class": "g2p-aa" + (c.aa1 === "*" ? " g2p-aastop" : "") }, gDyn);
            el("rect", { x: x1, y: Y.aa - 9, width: w, height: 18, rx: 9, "class": "g2p-aabg" }, g);
            el("text", { x: x1 + w / 2, y: Y.aa + 4, "text-anchor": "middle", "class": "g2p-aatxt" }, g, c.aa3);
            wireHover(g, c.dna, codonText(c));
          });
        }
      }

      // counts / legend line at the bottom
      var lines = [];
      if (st >= 6) {
        var nCod = m.codons.length * 3;
        lines.push("DNA shown: " + MODEL.DNA.length + " bp  →  pre-mRNA: " + m.pre.length + " nt  →  mRNA: " + m.mrna.length +
          " nt  →  read as codons: " + nCod + " nt  →  protein: " + m.protein.length + " amino acids");
        lines.push("Highlighted on the DNA: the bases that end up as codons (blue) and the stop codon (red); gray bases are not translated.");
      }
      lines.forEach(function (t, j) {
        el("text", { x: 6, y: H - 30 + j * 15, "class": "t-sm g2p-strong" }, gDyn, t);
      });

      // re-apply a pinned highlight
      if (state.pinned) hl(state.pinned, true);

      // controls state
      back.disabled = st <= 1;
      next.disabled = st >= STEPS.length;
      pillBtns.forEach(function (b, i) {
        var on = i + 1 === st;
        b.classList.toggle("primary", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      readout.textContent = message(st, m);
    }

    function message(st, m) {
      var kept = state.kept;
      var prot = m.protein.join("-");
      switch (st) {
        case 1:
          return "Step 1 of 6 · The gene. Two DNA strands, 63 base pairs. The coding strand (top) has the same sequence the RNA will have; " +
            "RNA polymerase reads the template strand (bottom). It binds at the promoter and starts copying at the arrow (the transcription start site).";
        case 2:
          return "Step 2 of 6 · Transcription. The gene is copied from the start site to the end of the 3′ UTR into pre-mRNA: " +
            m.pre.length + " nucleotides with the coding-strand sequence, U in place of T. The promoter itself is not copied.";
        case 3:
          return kept
            ? "Step 3 of 6 · Splicing fails. The intron stays in the RNA, so the mRNA has all " + m.mrna.length + " nucleotides (plus the cap and poly(A) tail)."
            : "Step 3 of 6 · Splicing. The intron, which starts with GU and ends with AG, is cut out and exon 1 is joined to exon 2. " +
              "A cap is added to the 5′ end and a poly(A) tail to the 3′ end. The mature mRNA has " + m.mrna.length + " nucleotides plus the tail.";
        case 4:
          return kept
            ? "Step 4 of 6 · Reading frame. Translation starts at the first AUG. Reading on in groups of three, the ribosome enters the intron and meets UAA, a stop codon, after codon 5."
            : "Step 4 of 6 · Reading frame. Translation starts at the first AUG; the six nucleotides before it are the 5′ UTR. From there the mRNA is read in non-overlapping groups of three. " +
              "Codon 5 (AGG) spans the exon–exon junction: two bases come from exon 1 and one from exon 2.";
        case 5:
          return kept
            ? "Step 5 of 6 · Translation. " + prot + ", then stop: a fragment of " + m.protein.length + " amino acids instead of 8. A kept intron often brings an early stop codon like this."
            : "Step 5 of 6 · Translation. Each codon is matched to one amino acid using the genetic code, until the stop codon UAA: " + prot + " (" + m.protein.length + " amino acids).";
        default:
          if (kept) {
            var pos = [];
            m.codons.forEach(function (c) { pos = pos.concat(c.dna); });
            var inIntron = pos.filter(function (i) { return i >= MODEL.INTRON[0] && i < MODEL.INTRON[1]; }).length;
            return "Step 6 of 6 · Back to the DNA. With the intron kept, only " + pos.length + " of the " + MODEL.DNA.length +
              " base pairs are read as codons: " + (pos.length - inIntron) + " from exon 1 and " + inIntron +
              " from the intron, which supplies the stop codon UAA. The coding part of exon 2 is never reached. " +
              "Hover over (or tap) any base, codon or amino acid to see where it came from.";
          }
          return "Step 6 of 6 · Back to the DNA. Of " + MODEL.DNA.length + " base pairs, only " + (m.codons.length * 3) + " are read as codons (" +
            (m.codons.length * 3 - 3) + " coding + 3 for the stop codon). The rest is promoter, untranslated region or intron. " +
            "Hover over (or tap) any base, codon or amino acid to see where it came from.";
      }
    }

    function go(st) {
      state.step = Math.max(1, Math.min(STEPS.length, st));
      drawDynamic();
    }

    back.addEventListener("click", function () { go(state.step - 1); });
    next.addEventListener("click", function () { go(state.step + 1); });
    pillBtns.forEach(function (b) { b.addEventListener("click", function () { go(+b.getAttribute("data-step")); }); });
    chk.addEventListener("change", function () { state.kept = chk.checked; drawDynamic(); });
    reset.addEventListener("click", function () {
      state.kept = false; chk.checked = false;
      if (state.pinned) { hl(state.pinned, false); state.pinned = null; }
      where.textContent = WHERE_IDLE;
      go(1);
    });

    drawStatic();
    go(1);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
