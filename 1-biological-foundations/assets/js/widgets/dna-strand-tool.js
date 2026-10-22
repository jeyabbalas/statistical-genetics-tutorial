/* ==========================================================================
   Strand tool (page: dna.html, Lecture 1)
   - Shows a DNA sequence and its partner strand aligned (5'->3' on top, 3'<-5' below)
   - Writes the partner strand 5'->3' (reverse complement); contrasts it with
     "reverse only" and "complement only"
   - For a SNP typed as X/Y (or X>Y), or inside a sequence as ACT[G/A]AAG, reports the
     alleles on the other strand, whether the SNP is strand-ambiguous (A/T or C/G),
     and Illumina's TOP/BOT designation (Illumina technical note 370-2006-018)
   Vanilla JS, no network, no modules. Pure logic is exported for Node tests.
   ========================================================================== */
(function () {
  "use strict";

  /* ---------------- Pure logic ---------------- */
  var COMP = { A: "T", C: "G", G: "C", T: "A", N: "N" };
  var MAX_BASES = 60;

  function compBase(b) { return COMP[b] || "?"; }
  function complementStr(s) { var o = ""; for (var i = 0; i < s.length; i++) o += compBase(s.charAt(i)); return o; }
  function reverseStr(s) { return s.split("").reverse().join(""); }
  function revCompStr(s) { return reverseStr(complementStr(s)); }

  /* Tokens: {t:"b", b:"A"} for a base, {t:"snp", a:["G","A"]} for a bracketed SNP column. */
  function compToken(tok) {
    return tok.t === "snp" ? { t: "snp", a: [compBase(tok.a[0]), compBase(tok.a[1])] } : { t: "b", b: compBase(tok.b) };
  }
  function complementTokens(toks) { return toks.map(compToken); }
  function reverseTokens(toks) { return toks.slice().reverse(); }
  function revCompTokens(toks) { return reverseTokens(complementTokens(toks)); }
  function tokensToString(toks) {
    return toks.map(function (k) { return k.t === "snp" ? "[" + k.a[0] + "/" + k.a[1] + "]" : k.b; }).join("");
  }
  function snpIndex(toks) {
    for (var i = 0; i < toks.length; i++) if (toks[i].t === "snp") return i;
    return -1;
  }

  /* Is a sequence its own reverse complement? Returns true or false, or null when N (unknown) bases leave it
     undecided. An odd-length sequence never is: its middle base would have to equal its own complement. */
  function palindromeStatus(s) {
    if (!s.length || s.length % 2 === 1) return false;
    var rc = revCompStr(s), unknown = false;
    for (var i = 0; i < s.length; i++) {
      var a = s.charAt(i), b = rc.charAt(i);
      if (a === "N" || b === "N") { unknown = true; continue; }
      if (a !== b) return false;
    }
    return unknown ? null : true;
  }

  /* Is a SNP strand-ambiguous? True exactly when the two alleles are complements (A/T, C/G). */
  function isAmbiguous(a, b) { return compBase(a) === b; }

  /* Illumina TOP/BOT for the strand as written.
     Unambiguous SNPs: an allele A (with C or G) -> TOP, allele A = "A"; an allele T (with C or G) -> BOT, allele A = "T".
     A/T and C/G SNPs: "sequence walking" outward from the SNP (n-1|n+1, n-2|n+2, ...) until the first pair
     made of one A/T base and one C/G base; TOP if its A/T base is on the 5' (left) side, BOT if on the 3' side.
     Returns {strand:"TOP"|"BOT", alleleA, alleleB, how} or {strand:null, how} if undetermined. */
  function topBot(a1, a2, left, right) {
    var pair = [a1, a2];
    if (!isAmbiguous(a1, a2)) {
      if (pair.indexOf("A") >= 0) return { strand: "TOP", alleleA: "A", alleleB: pair[1 - pair.indexOf("A")], how: "alleles" };
      if (pair.indexOf("T") >= 0) return { strand: "BOT", alleleA: "T", alleleB: pair[1 - pair.indexOf("T")], how: "alleles" };
      return { strand: null, how: "invalid" };
    }
    left = left || ""; right = right || "";
    var AT = { A: 1, T: 1 }, CG = { C: 1, G: 1 };
    for (var k = 1; k <= Math.min(left.length, right.length); k++) {
      var L = left.charAt(left.length - k), R = right.charAt(k - 1);
      var strand = null;
      if (AT[L] && CG[R]) strand = "TOP";
      else if (CG[L] && AT[R]) strand = "BOT";
      if (strand) {
        var isAT = (a1 === "A" || a1 === "T");
        var alleleA = isAT ? (strand === "TOP" ? "A" : "T") : (strand === "TOP" ? "C" : "G");
        return { strand: strand, alleleA: alleleA, alleleB: compBase(alleleA), how: "walk", k: k };
      }
    }
    return { strand: null, how: "walk-failed" };
  }

  /* Parse free text. Accepts: plain sequence; "X/Y" or "X>Y" (one SNP); sequence with one [X/Y].
     Ignores a FASTA header line, whitespace, digits, primes and hyphens (so "5'-ACGT-3'" works). */
  function parseInput(raw) {
    var res = { ok: false, kind: null, tokens: [], error: null };
    var s = String(raw == null ? "" : raw);
    var trimmed = s.trim();
    if (/^rs\d+$/i.test(trimmed)) { res.error = "This tool works on sequences, not on variant IDs such as " + trimmed + ". Pick an example above (rs671 is the first) or type the bases."; return res; }
    if (/^(chr)?([0-9]{1,2}|X|Y|MT?)[:_][0-9]/i.test(trimmed)) { res.error = "This tool works on sequences, not on genomic coordinates. Type the bases themselves (a genome browser shows them), or pick an example above."; return res; }
    s = s.split(/\r?\n/).filter(function (line) { return line.trim().charAt(0) !== ">"; }).join("");
    s = s.replace(/[\s0-9′’'`\-_.,;:]+/g, "").toUpperCase();
    if (!s) { res.error = "Type a DNA sequence such as ACCTGAG, a SNP such as G/A, or a sequence with a SNP in brackets such as ACT[G/A]AAG."; return res; }

    var m = s.match(/^([ACGT])[\/>]([ACGT])$/);
    if (m) {
      if (m[1] === m[2]) { res.error = "The two alleles of a SNP must differ (you typed " + m[1] + "/" + m[2] + ")."; return res; }
      res.ok = true; res.kind = "snp"; res.tokens = [{ t: "snp", a: [m[1], m[2]] }];
      return res;
    }
    if (/^[A-Z](?:[\/>][A-Z])+$/.test(s)) {
      var typedAlleles = s.split(/[\/>]/);
      if (typedAlleles.length > 2) { res.error = "This tool handles SNPs with exactly two alleles, such as G/A (you typed " + typedAlleles.join("/") + ")."; return res; }
      res.error = "SNP alleles must be A, C, G or T (you typed " + typedAlleles.join("/") + ")."; return res;
    }
    if (/[\/>]/.test(s) && s.indexOf("[") < 0) { res.error = "To give a SNP inside a sequence, put it in brackets, e.g. ACT[G/A]AAG. On its own, type it as G/A."; return res; }

    var nOpen = (s.match(/\[/g) || []).length, nClose = (s.match(/\]/g) || []).length;
    if (nOpen > 1 || nClose > 1) { res.error = "Only one SNP in brackets is supported."; return res; }
    if (nOpen !== nClose) { res.error = "Unbalanced brackets: write the SNP as [G/A]."; return res; }

    var toks = [];
    var i = 0;
    while (i < s.length) {
      var c = s.charAt(i);
      if (c === "[") {
        var close = s.indexOf("]", i);
        var inner = s.slice(i + 1, close);
        var mm = inner.match(/^([ACGT])[\/>]([ACGT])$/);
        if (!mm) { res.error = "Inside the brackets write two different bases, e.g. [G/A] (you wrote [" + inner + "])."; return res; }
        if (mm[1] === mm[2]) { res.error = "The two alleles of a SNP must differ (you wrote [" + inner + "])."; return res; }
        toks.push({ t: "snp", a: [mm[1], mm[2]] });
        i = close + 1;
        continue;
      }
      toks.push({ t: "b", b: c });
      i++;
    }
    var bad = {};
    toks.forEach(function (k) { if (k.t === "b" && !COMP[k.b]) bad[k.b] = 1; });
    var badList = Object.keys(bad);
    if (badList.length) {
      if (bad.U) res.error = "U (uracil) occurs in RNA, not in DNA; DNA uses T. " + (badList.length > 1 ? "Other unexpected characters: " + badList.filter(function (x) { return x !== "U"; }).join(", ") + ". " : "") + "Use A, C, G, T (or N for an unknown base).";
      else {
        var IUPAC = { R: "A or G", Y: "C or T", S: "C or G", W: "A or T", K: "G or T", M: "A or C", B: "C, G or T", D: "A, G or T", H: "A, C or T", V: "A, C or G" };
        var codes = badList.filter(function (x) { return IUPAC[x]; });
        var others = badList.filter(function (x) { return !IUPAC[x]; });
        if (codes.length) res.error = "This tool does not accept IUPAC codes for uncertain bases (" + codes.map(function (x) { return x + " = " + IUPAC[x]; }).join("; ") + "). " + (others.length ? "Other unexpected characters: " + others.join(", ") + ". " : "") + "Use A, C, G, T, or N for an unknown base.";
        else res.error = "Unexpected character" + (badList.length > 1 ? "s" : "") + ": " + badList.join(", ") + ". Use A, C, G, T (or N for an unknown base).";
      }
      return res;
    }
    if (toks.length > MAX_BASES) { res.error = "Please enter at most " + MAX_BASES + " bases (you entered " + toks.length + ")."; return res; }
    res.ok = true;
    res.kind = snpIndex(toks) >= 0 ? "snpseq" : "seq";
    res.tokens = toks;
    return res;
  }

  /* Everything the page shows, computed from parsed tokens. */
  function analyze(parsed) {
    var toks = parsed.tokens;
    var out = {
      kind: parsed.kind,
      length: toks.length,
      typed: tokensToString(toks),
      complement: tokensToString(complementTokens(toks)),
      revcomp: tokensToString(revCompTokens(toks)),
      reverse: tokensToString(reverseTokens(toks)),
      palindrome: false,
      snp: null
    };
    if (parsed.kind === "seq") out.palindrome = palindromeStatus(out.typed);
    var si = snpIndex(toks);
    if (si >= 0) {
      var a = toks[si].a;
      var left = toks.slice(0, si).map(function (k) { return k.b; }).join("");
      var right = toks.slice(si + 1).map(function (k) { return k.b; }).join("");
      var otherL = revCompStr(right), otherR = revCompStr(left);
      out.snp = {
        index: si,
        alleles: [a[0], a[1]],
        other: [compBase(a[0]), compBase(a[1])],
        ambiguous: isAmbiguous(a[0], a[1]),
        topbot: topBot(a[0], a[1], left, right),
        topbotOther: topBot(compBase(a[0]), compBase(a[1]), otherL, otherR),
        hasContext: parsed.kind === "snpseq"
      };
    }
    return out;
  }

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function randomSequence(rng, n) {
    var s = "";
    for (var i = 0; i < n; i++) s += "ACGT".charAt(Math.floor(rng() * 4));
    return s;
  }

  /* Presets. "start" = genomic position of the first typed base; the typed strand is the + strand of GRCh38
     for the real variants (flanking sequence from Ensembl release 116; see the page's sources). */
  var PRESETS = {
    rs671: { label: "rs671 · ALDH2", seq: "GGCATACACT[G/A]AAGTGAAAAC", start: 111803952,
      note: "GRCh38, chromosome 12, + strand. <em>ALDH2</em> lies on the + strand, so its codon reads left to right: [G/A]AA, i.e. GAA (Glu) or AAA (Lys). G/A is strand-unambiguous: from the − strand it is C/T." },
    rs334: { label: "rs334 · HBB (sickle)", seq: "AGACTTCTCC[T/A]CAGGAGTCAG", start: 5226992,
      note: "GRCh38, chromosome 11, + strand: T/A. <em>HBB</em> lies on the − strand: press <b>Flip</b> to read the gene's strand 5′→3′, …CCTG[A/T]GGAG…, where codon GAG (Glu) becomes GTG (Val). A/T: strand-ambiguous." },
    rs1801133: { label: "rs1801133 · MTHFR “C677T”", seq: "GATGAAATCG[G/A]CTCCCGCAGA", start: 11796311,
      note: "GRCh38, chromosome 1, + strand: G/A. <em>MTHFR</em> lies on the − strand; <b>Flip</b> shows the gene's strand, where the same SNP reads C/T (hence “C677T”): codon GCC (Ala) becomes GTC (Val)." },
    rs1801282: { label: "rs1801282 · PPARG (C/G)", seq: "TCCTATTGAC[C/G]CAGAAAGCGA", start: 12351616,
      note: "GRCh38, chromosome 3, + strand. <em>PPARG</em> lies on the + strand: codon [C/G]CA, i.e. CCA (Pro) or GCA (Ala). C/G: strand-ambiguous." },
    rs90210: { label: "Slide 69 · rs90210", seq: "C/G", start: 1,
      note: "The fictional strand-ambiguous SNP from Lecture 2, slide 69. Its alleles read C/G from both strands." },
    rs8675309: { label: "Slide 69 · rs8675309", seq: "G/T", start: 1,
      note: "The fictional strand-unambiguous SNP from Lecture 2, slide 69: Study A wrote G/T, Study B wrote C/A — the same SNP read from the two strands." },
    slide57: { label: "Slide 57 strand", seq: "CGT", start: 1,
      note: "The left strand drawn on Lecture 2, slide 57 reads 5′-CGT-3′ (top to bottom). Its partner, read 5′→3′ (bottom to top on the slide), is 5′-ACG-3′." },
    palin: { label: "GAATTC", seq: "GAATTC", start: 1,
      note: "A sequence that equals its own reverse complement (a palindromic sequence)." }
  };

  var StrandLogic = {
    compBase: compBase, complementStr: complementStr, reverseStr: reverseStr, revCompStr: revCompStr,
    complementTokens: complementTokens, revCompTokens: revCompTokens, tokensToString: tokensToString,
    isAmbiguous: isAmbiguous, palindromeStatus: palindromeStatus, topBot: topBot, parseInput: parseInput, analyze: analyze,
    mulberry32: mulberry32, randomSequence: randomSequence, PRESETS: PRESETS, MAX_BASES: MAX_BASES
  };
  if (typeof module === "object" && module && module.exports) module.exports = StrandLogic;
  if (typeof document === "undefined") return;

  /* ---------------- UI ---------------- */
  var NS = "http://www.w3.org/2000/svg";
  function svgEl(tag, attrs, text) {
    var n = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }
  function fmt(n) { return Number(n).toLocaleString("en-US"); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  /* Color bases in a token string such as ACT[G/A]AAG (returns HTML, wrapped in a monospace span). */
  function colorSeq(str) {
    var h = '<span class="st-seq">';
    for (var i = 0; i < str.length; i++) {
      var c = str.charAt(i);
      if ("ACGT".indexOf(c) >= 0) h += '<span class="b-' + c + '">' + c + "</span>";
      else if (c === "[" || c === "]" || c === "/") h += '<span class="st-br">' + c + "</span>";
      else h += esc(c);
    }
    return h + "</span>";
  }

  function init() {
    var root = document.getElementById("w-strand-tool");
    if (!root) return;
    var input = root.querySelector("#st-input");
    var startIn = root.querySelector("#st-start");
    var flipBtn = root.querySelector("#st-flip");
    var randBtn = root.querySelector("#st-random");
    var noteEl = root.querySelector("#st-preset-note");
    var duplexEl = root.querySelector("#st-duplex");
    var readEl = root.querySelector("#st-readout");
    if (!input || !duplexEl || !readEl) return;

    var state = { flipped: false, presetKey: null, seed: 20261021 };
    var rng = mulberry32(state.seed);

    function setFlipped(v) {
      state.flipped = !!v;
      if (flipBtn) flipBtn.setAttribute("aria-pressed", state.flipped ? "true" : "false");
    }

    function setPreset(key) {
      var p = PRESETS[key];
      if (!p) return;
      state.presetKey = key;
      setFlipped(false);
      input.value = p.seq;
      if (startIn) startIn.value = p.start;
      root.querySelectorAll("[data-preset]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-preset") === key ? "true" : "false"); });
      render();
    }

    function clearPresetMark() {
      state.presetKey = null;
      root.querySelectorAll("[data-preset]").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
    }

    function startValue() {
      var v = startIn ? parseInt(startIn.value, 10) : 1;
      return (isFinite(v) && v >= 1) ? v : 1;
    }

    /* Draw the two aligned strands as SVG, wrapped into rows that fit the widget width. */
    function drawDuplex(top, bottom, pos, labels, snpCol, rowsHint) {
      duplexEl.innerHTML = "";
      var n = top.length;
      if (!n) return;
      var avail = Math.max(280, (duplexEl.clientWidth || root.clientWidth || 640) - 4);
      var cw = 26, snpW = 46, labW = 112, padR = 34;
      var perRow = Math.max(8, Math.min(30, Math.floor((avail - labW - padR - (snpW - cw)) / cw)));
      if (rowsHint && n <= perRow) perRow = n;
      var rows = [];
      for (var s = 0; s < n; s += perRow) rows.push([s, Math.min(n, s + perRow)]);
      var rowH = 112, topPad = 6;
      var maxCols = Math.min(perRow, n);
      var widthCols = maxCols * cw + (snpCol >= 0 ? (snpW - cw) : 0);
      var W = labW + widthCols + padR, H = topPad + rows.length * rowH;
      var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, role: "img",
        "aria-label": labels.aria });
      rows.forEach(function (r, ri) {
        var y0 = topPad + ri * rowH;
        var g = svgEl("g", {});
        svg.appendChild(g);
        // column x positions
        var xs = [], x = labW;
        for (var i = r[0]; i < r[1]; i++) { var w = (i === snpCol) ? snpW : cw; xs.push([x, w]); x += w; }
        var xEnd = x;
        // labels on the left
        g.appendChild(svgEl("text", { x: 4, y: y0 + 45, "class": "t-sm st-lab" }, ri === 0 ? labels.top : ""));
        g.appendChild(svgEl("text", { x: 4, y: y0 + 87, "class": "t-sm st-lab" }, ri === 0 ? labels.bottom : ""));
        if (ri === 0 && labels.top2) g.appendChild(svgEl("text", { x: 4, y: y0 + 57, "class": "t-xs" }, labels.top2));
        if (ri === 0 && labels.bottom2) g.appendChild(svgEl("text", { x: 4, y: y0 + 99, "class": "t-xs" }, labels.bottom2));
        // SNP highlight
        for (var j = 0; j < xs.length; j++) {
          var col = r[0] + j;
          if (col === snpCol) g.appendChild(svgEl("rect", { x: xs[j][0] + 1, y: y0 + 16, width: xs[j][1] - 2, height: 88, rx: 5, fill: "var(--accent-soft)", stroke: "var(--accent)", "stroke-dasharray": "3 3" }));
        }
        // ruler
        if (pos) {
          g.appendChild(svgEl("line", { x1: xs[0][0], y1: y0 + 20, x2: xEnd, y2: y0 + 20, stroke: "var(--border-strong)", "stroke-width": 1 }));
          var lastLabelX = -1e9;
          for (var k = 0; k < xs.length; k++) {
            var c2 = r[0] + k, cx = xs[k][0] + xs[k][1] / 2;
            var labelIt = (k === 0) || (c2 === snpCol) || (pos[c2] % 10 === 0);
            g.appendChild(svgEl("line", { x1: cx, y1: y0 + 17, x2: cx, y2: y0 + (labelIt ? 24 : 21), stroke: "var(--fg-faint)", "stroke-width": 1 }));
            if (labelIt) {
              var txt = fmt(pos[c2]);
              var half = txt.length * 3.1;
              var nextSnp = (c2 !== snpCol && snpCol > c2 && snpCol < r[1]) ? (xs[snpCol - r[0]][0] + xs[snpCol - r[0]][1] / 2) : null;
              var collideSnp = nextSnp != null && Math.abs(nextSnp - cx) < 2 * half + 8;
              if (cx - half > lastLabelX + 6 && !collideSnp && cx + half < W - 2) {
                g.appendChild(svgEl("text", { x: cx, y: y0 + 12, "text-anchor": "middle", "class": c2 === snpCol ? "t-xs st-snp-pos" : "t-xs" }, txt));
                lastLabelX = cx + half;
              }
            }
          }
        }
        // strand lines + end labels
        var firstRow = ri === 0, lastRow = ri === rows.length - 1;
        g.appendChild(svgEl("line", { x1: labW - 6, y1: y0 + 28, x2: xEnd + 6, y2: y0 + 28, stroke: "var(--fg)", "stroke-width": 2.5 }));
        g.appendChild(svgEl("line", { x1: labW - 6, y1: y0 + 96, x2: xEnd + 6, y2: y0 + 96, stroke: "var(--fg-faint)", "stroke-width": 2.5 }));
        g.appendChild(svgEl("text", { x: labW - 10, y: y0 + 32, "text-anchor": "end", "class": "t-b" }, firstRow ? "5′" : "…"));
        g.appendChild(svgEl("text", { x: xEnd + 10, y: y0 + 32, "class": "t-b" }, lastRow ? "3′" : "…"));
        g.appendChild(svgEl("text", { x: labW - 10, y: y0 + 100, "text-anchor": "end", "class": "t-b" }, firstRow ? "3′" : "…"));
        g.appendChild(svgEl("text", { x: xEnd + 10, y: y0 + 100, "class": "t-b" }, lastRow ? "5′" : "…"));
        // tiles, letters, bonds
        for (var q = 0; q < xs.length; q++) {
          var cc = r[0] + q, tx = xs[q][0], tw = xs[q][1], mid = tx + tw / 2;
          var tt = top[cc], bt = bottom[cc];
          g.appendChild(svgEl("rect", { x: tx + 2, y: y0 + 34, width: tw - 4, height: 24, rx: 4, fill: "#fff", stroke: "var(--border-strong)" }));
          g.appendChild(svgEl("rect", { x: tx + 2, y: y0 + 66, width: tw - 4, height: 24, rx: 4, fill: "#fff", stroke: "var(--border-strong)" }));
          if (tt.t === "snp") {
            addSnpText(g, mid, y0 + 51, tt.a);
            addSnpText(g, mid, y0 + 83, bt.a);
            g.appendChild(svgEl("line", { x1: mid, y1: y0 + 59, x2: mid, y2: y0 + 65, stroke: "var(--fg-faint)", "stroke-dasharray": "2 2" }));
          } else {
            g.appendChild(svgEl("text", { x: mid, y: y0 + 51, "text-anchor": "middle", "class": "st-letter base-" + tt.b }, tt.b));
            g.appendChild(svgEl("text", { x: mid, y: y0 + 83, "text-anchor": "middle", "class": "st-letter base-" + bt.b }, bt.b));
            var nb = (tt.b === "C" || tt.b === "G") ? 3 : (tt.b === "N" ? 0 : 2);
            for (var h = 0; h < nb; h++) {
              var off = (h - (nb - 1) / 2) * 5;
              g.appendChild(svgEl("line", { x1: mid + off, y1: y0 + 59, x2: mid + off, y2: y0 + 65, stroke: "var(--fg-faint)", "stroke-width": 1.5 }));
            }
            if (nb === 0) g.appendChild(svgEl("line", { x1: mid, y1: y0 + 59, x2: mid, y2: y0 + 65, stroke: "var(--fg-faint)", "stroke-dasharray": "1 2" }));
          }
        }
        // direction arrows on the strand lines
        arrow(g, xEnd + 1, y0 + 28, 1, "var(--fg)");
        arrow(g, labW - 1, y0 + 96, -1, "var(--fg-faint)");
      });
      duplexEl.appendChild(svg);
    }
    function addSnpText(g, x, y, a) {
      var t = svgEl("text", { x: x, y: y, "text-anchor": "middle", "class": "st-letter st-snp" });
      var s1 = svgEl("tspan", { "class": "base-" + a[0] }, a[0]);
      var s2 = svgEl("tspan", { "class": "st-slash" }, "/");
      var s3 = svgEl("tspan", { "class": "base-" + a[1] }, a[1]);
      t.appendChild(s1); t.appendChild(s2); t.appendChild(s3);
      g.appendChild(t);
    }
    function arrow(g, x, y, dir, color) {
      var d = dir > 0 ? "M" + (x - 7) + "," + (y - 5) + " L" + x + "," + y + " L" + (x - 7) + "," + (y + 5)
                      : "M" + (x + 7) + "," + (y - 5) + " L" + x + "," + y + " L" + (x + 7) + "," + (y + 5);
      g.appendChild(svgEl("path", { d: d, fill: "none", stroke: color, "stroke-width": 2 }));
    }

    function row(label, valueHtml, extraClass) {
      return '<div class="st-row' + (extraClass ? " " + extraClass : "") + '"><span class="st-k">' + label + '</span><span class="st-v">' + valueHtml + "</span></div>";
    }

    function render() {
      var parsed = parseInput(input.value);
      if (noteEl) noteEl.innerHTML = state.presetKey ? PRESETS[state.presetKey].note : "";
      if (!parsed.ok) {
        duplexEl.innerHTML = "";
        readEl.innerHTML = '<div class="st-error" role="alert">' + esc(parsed.error) + "</div>";
        if (flipBtn) flipBtn.disabled = true;
        return;
      }
      if (flipBtn) flipBtn.disabled = false;
      var A = analyze(parsed);
      var toks = parsed.tokens;
      var n = toks.length;
      var start = startValue();
      var si = A.snp ? A.snp.index : -1;

      // what goes on top
      var top, bottom, pos = null, labels, snpCol;
      var basePos = [];
      for (var i = 0; i < n; i++) basePos.push(start + i);
      if (!state.flipped) {
        top = toks; bottom = complementTokens(toks); snpCol = si;
        pos = parsed.kind === "snp" ? null : basePos;
        labels = { top: "typed strand", top2: "read 5′→3′ →", bottom: "partner strand", bottom2: "← read 5′→3′" };
      } else {
        top = revCompTokens(toks); bottom = reverseTokens(toks); snpCol = si >= 0 ? n - 1 - si : -1;
        pos = parsed.kind === "snp" ? null : basePos.slice().reverse();
        labels = { top: "partner strand", top2: "read 5′→3′ →", bottom: "typed strand", bottom2: "← read 5′→3′" };
      }
      labels.aria = "Top strand 5′ to 3′: " + tokensToString(top) + ". Bottom strand, aligned, 3′ to 5′: " + tokensToString(bottom) + ".";
      drawDuplex(top, bottom, pos, labels, snpCol, true);

      var h = "";
      h += row("Typed strand, 5′→3′", "5′-" + colorSeq(A.typed) + "-3′");
      h += row("Partner strand, aligned base by base (3′→5′)", "3′-" + colorSeq(A.complement) + "-5′");
      h += row("Partner strand written 5′→3′ = <b>reverse complement</b>", "5′-" + colorSeq(A.revcomp) + "-3′", "st-key");
      if (parsed.kind !== "snp") {
        h += row("Reversed only (not a DNA strand)", '<span class="st-wrong">' + colorSeq(A.reverse) + "</span>");
        var nb = n - (si >= 0 ? 1 : 0);
        h += row("Length", n + " bp" + (si >= 0 ? " (" + nb + " bases + 1 SNP position)" : ""));
        if (start !== 1 || parsed.kind === "snpseq") {
          h += row("Positions", fmt(start) + "–" + fmt(start + n - 1) + (si >= 0 ? "; the SNP is at " + fmt(start + si) : "") + " <span class=\"st-muted\">(numbered along the typed strand, taken to be the + strand)</span>");
        }
      }
      if (A.kind === "seq") {
        h += row("Own reverse complement?", A.palindrome === true ? '<b>Yes</b> — this sequence is palindromic: both strands read the same 5′→3′.' :
          (A.palindrome === null ? "Cannot tell: N stands for an unknown base." : "No"));
      }
      if (A.snp) {
        var S = A.snp;
        var a = S.alleles, o = S.other;
        var allelesHtml = '<span class="b-' + a[0] + '">' + a[0] + '</span>/<span class="b-' + a[1] + '">' + a[1] + "</span>";
        var otherHtml = '<span class="b-' + o[0] + '">' + o[0] + '</span>/<span class="b-' + o[1] + '">' + o[1] + "</span>";
        h += row("SNP alleles", allelesHtml + " on the typed strand = " + otherHtml + " on the other strand");
        if (S.ambiguous) {
          h += row("Strand-ambiguous?", '<b class="st-amb">Yes</b> — the complement of {' + a[0] + ", " + a[1] + "} is {" + o[0] + ", " + o[1] + "}, the same pair. From the alleles alone you cannot tell which strand a dataset used. Options: compare allele frequencies (only when the minor allele frequency is clearly below 0.5), use the array's strand annotation, or drop the SNP.");
        } else {
          h += row("Strand-ambiguous?", '<b class="st-unamb">No</b> — {' + a[0] + ", " + a[1] + "} and {" + o[0] + ", " + o[1] + "} are different pairs, so a dataset that used the other strand is easy to spot and flip.");
        }
        var tb = S.topbot, tbo = S.topbotOther;
        var tbText;
        if (tb.strand) {
          tbText = "typed strand = <b>" + tb.strand + "</b> (allele A = " + tb.alleleA + ", allele B = " + tb.alleleB + "); the other strand = " + (tbo.strand || "?") + (tbo.strand ? " (allele A = " + tbo.alleleA + ", allele B = " + tbo.alleleB + ")" : "") +
            (tb.how === "walk" ? ' <span class="st-muted">— decided from the flanking bases ' + tb.k + " position" + (tb.k > 1 ? "s" : "") + " either side of the SNP</span>" : ' <span class="st-muted">— decided from the alleles</span>');
        } else if (tb.how === "walk-failed" && S.hasContext) {
          tbText = '<span class="st-muted">cannot be decided from this much flanking sequence (no A/T–C/G pair yet).</span>';
        } else {
          tbText = '<span class="st-muted">for an A/T or C/G SNP this needs the flanking sequence: type it as e.g. ACT[' + a[0] + "/" + a[1] + "]AAG.</span>";
        }
        h += row("Illumina TOP/BOT", tbText);
      }
      readEl.innerHTML = h;
    }

    root.querySelectorAll("[data-preset]").forEach(function (b) {
      b.addEventListener("click", function () { setPreset(b.getAttribute("data-preset")); });
    });
    input.addEventListener("input", function () { clearPresetMark(); setFlipped(false); render(); });
    if (startIn) startIn.addEventListener("input", function () { render(); });
    if (flipBtn) flipBtn.addEventListener("click", function () {
      setFlipped(!state.flipped);
      render();
    });
    if (randBtn) randBtn.addEventListener("click", function () {
      clearPresetMark();
      setFlipped(false);
      input.value = randomSequence(rng, 12);
      if (startIn) startIn.value = 1;
      render();
    });
    var resizeTimer = null;
    window.addEventListener("resize", function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(render, 120); });

    setPreset("rs671");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
