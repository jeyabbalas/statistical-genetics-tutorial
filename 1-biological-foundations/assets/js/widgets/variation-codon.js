/* ==========================================================================
   Widget: "Mutate a codon" (page: variation.html, root #w-codon)
   Shows the first 12 codons of the human HBB coding sequence (NM_000518.5,
   Ensembl ENST00000335295, MANE Select) and lets the reader substitute,
   delete or insert bases. Reports an HGVS-style description of the DNA change
   (c.) and its predicted protein consequence (p.), and classifies it as
   synonymous / missense / nonsense (stop-gained) / start-lost / frameshift /
   in-frame insertion or deletion.
   - Vanilla JS, no network, works from file://.
   - The pure functions (translate, describeDNA, analyze) are exported for
     node tests when `module.exports` exists.
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- Sequence data (verified from Ensembl REST, GRCh38, release 116) ---------- */
  // Coding sequence c.1..c.444 (includes the TAA stop) followed by the 3' UTR (134 nt),
  // so that frameshifted reading frames can be followed to their first stop codon.
  var CDS =
    "ATGGTGCATCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAGG" +
    "CTGCTGGTGGTCTACCCTTGGACCCAGAGGTTCTTTGAGTCCTTTGGGGATCTGTCCACTCCTGATGCTGTTATGGGCAACCCTAAGGTGAAG" +
    "GCTCATGGCAAGAAAGTGCTCGGTGCCTTTAGTGATGGCCTGGCTCACCTGGACAACCTCAAGGGCACCTTTGCCACACTGAGTGAGCTGCAC" +
    "TGTGACAAGCTGCACGTGGATCCTGAGAACTTCAGGCTCCTGGGCAACGTGCTGGTCTGTGTGCTGGCCCATCACTTTGGCAAAGAATTCACC" +
    "CCACCAGTGCAGGCTGCCTATCAGAAAGTGGTGGCTGGTGTGGCTAATGCCCTGGCCCACAAGTATCACTAA";
  var UTR3 =
    "GCTCGCTTTCTTGCTGTCCAATTTCTATTAAAGGTTCCTTTGTTCCCTAAGTCCAACTACTAAACTGGGGGATATTATGAAGGGCCTTGAGCAT" +
    "CTGGATTCTGCCTAATAAAAAACATTTATTTTCATTGCAA";
  var REF = CDS + UTR3;
  var WINDOW = 36;            // first 12 codons are editable
  var TRANSCRIPT = "NM_000518.5(HBB)";

  /* ---------- Genetic code ---------- */
  var BASES = "TCAG";
  var AAS = "FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG";
  var CODE = {};
  (function () {
    var n = 0;
    for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) for (var k = 0; k < 4; k++) {
      CODE[BASES[i] + BASES[j] + BASES[k]] = AAS[n++];
    }
  })();
  var THREE = { A: "Ala", R: "Arg", N: "Asn", D: "Asp", C: "Cys", Q: "Gln", E: "Glu", G: "Gly", H: "His", I: "Ile",
    L: "Leu", K: "Lys", M: "Met", F: "Phe", P: "Pro", S: "Ser", T: "Thr", W: "Trp", Y: "Tyr", V: "Val", "*": "Ter" };

  /** Translate from the first base, in frame, until (and including) the first stop codon. */
  function translate(seq) {
    var out = "";
    for (var i = 0; i + 3 <= seq.length; i += 3) {
      var aa = CODE[seq.substr(i, 3)] || "X";
      out += aa;
      if (aa === "*") break;
    }
    return out;
  }
  /** Translate every complete codon, reading through stop codons (used to align in-frame changes). */
  function translateAll(seq) {
    var out = "";
    for (var i = 0; i + 3 <= seq.length; i += 3) out += CODE[seq.substr(i, 3)] || "X";
    return out;
  }
  function three(s) {
    var r = "";
    for (var i = 0; i < s.length; i++) r += THREE[s[i]] || "Xaa";
    return r;
  }
  function revcomp(s) {
    var c = { A: "T", C: "G", G: "C", T: "A" }, r = "";
    for (var i = s.length - 1; i >= 0; i--) r += c[s[i]] || "N";
    return r;
  }

  /* ---------- DNA-level description (HGVS-style, 3' rule) ---------- */
  function describeDNA(ref, mut) {
    if (ref === mut) return "c.=";
    var p = 0;
    while (p < ref.length && p < mut.length && ref[p] === mut[p]) p++;
    var s = 0;
    while (s < ref.length - p && s < mut.length - p && ref[ref.length - 1 - s] === mut[mut.length - 1 - s]) s++;
    var rMid = ref.slice(p, ref.length - s), mMid = mut.slice(p, mut.length - s);
    var start = p + 1, end = ref.length - s; // 1-based c. positions of the changed reference span

    if (rMid.length === mMid.length) {
      // one or more substitutions: list them; merge adjacent ones (and ones one base apart in the same codon) into delins
      var diffs = [];
      for (var i = 0; i < rMid.length; i++) if (rMid[i] !== mMid[i]) diffs.push(start + i);
      var blocks = [], cur = [diffs[0], diffs[0]];
      for (var d = 1; d < diffs.length; d++) {
        var prev = cur[1], nxt = diffs[d];
        var sameCodon = Math.floor((prev - 1) / 3) === Math.floor((nxt - 1) / 3);
        if (nxt - prev === 1 || (nxt - prev === 2 && sameCodon)) cur[1] = nxt;
        else { blocks.push(cur); cur = [nxt, nxt]; }
      }
      blocks.push(cur);
      var parts = blocks.map(function (b) {
        if (b[0] === b[1]) return b[0] + ref[b[0] - 1] + ">" + mut[b[0] - 1];
        var newSeq = mut.slice(b[0] - 1, b[1]);
        // HGVS: a stretch replaced by its own reverse complement is an inversion (e.g. TC -> GA is c.9_10inv)
        if (newSeq === revcomp(ref.slice(b[0] - 1, b[1]))) return b[0] + "_" + b[1] + "inv";
        return b[0] + "_" + b[1] + "delins" + newSeq;
      });
      return parts.length === 1 ? "c." + parts[0] : "c.[" + parts.join(";") + "]";
    }
    if (mMid.length === 0) {
      return rMid.length === 1 ? "c." + start + "del" : "c." + start + "_" + end + "del";
    }
    if (rMid.length === 0) {
      // insertion between c.p and c.p+1; an insertion that repeats the preceding bases is a duplication
      var L = mMid.length;
      if (p - L >= 0 && ref.slice(p - L, p) === mMid) {
        return L === 1 ? "c." + p + "dup" : "c." + (p - L + 1) + "_" + p + "dup";
      }
      return "c." + p + "_" + (p + 1) + "ins" + mMid;
    }
    return (start === end ? "c." + start : "c." + start + "_" + end) + "delins" + mMid;
  }

  /* ---------- Protein-level consequence ---------- */
  function analyze(ref, mut) {
    var refP = translate(ref), mutP = translate(mut);
    var out = { dna: describeDNA(ref, mut), refProtein: refP, mutProtein: mutP, refLen: refP.length - 1 };
    var stopAt = mutP.indexOf("*");
    out.mutLen = stopAt >= 0 ? stopAt : mutP.length; // amino acids before the stop
    out.hasStop = stopAt >= 0;
    if (ref === mut) { out.cls = "none"; out.protein = "p.(=)"; out.vep = "—"; return out; }

    var lenDiff = mut.length - ref.length;
    // first amino acid that differs
    var i = 0;
    while (i < refP.length && i < mutP.length && refP[i] === mutP[i]) i++;
    out.firstChanged = i + 1;

    if (mut.substr(0, 3) !== "ATG") {
      out.cls = "start-lost"; out.protein = "p.(Met1?)"; out.vep = "start_lost";
      out.frameshift = lenDiff % 3 !== 0;
      // VEP adds a second term when the change is also an insertion or deletion
      if (out.frameshift) out.vep += ", frameshift_variant";
      else if (lenDiff < 0) out.vep += ", inframe_deletion";
      else if (lenDiff > 0) out.vep += ", inframe_insertion";
      return out;
    }
    if (lenDiff % 3 !== 0) {
      out.cls = "frameshift"; out.vep = "frameshift_variant";
      if (i >= refP.length || i >= mutP.length) { out.protein = "p.?"; return out; }
      if (mutP[i] === "*") { out.protein = "p.(" + THREE[refP[i]] + (i + 1) + "Ter)"; out.immediateStop = true; return out; }
      out.protein = "p.(" + THREE[refP[i]] + (i + 1) + THREE[mutP[i]] + "fsTer" + (stopAt >= 0 ? (stopAt - i + 1) : "?") + ")";
      return out;
    }
    if (refP === mutP) {
      out.cls = "synonymous"; out.vep = "synonymous_variant";
      // name the codon(s) that changed at the DNA level
      var codons = {};
      for (var k = 0; k < Math.min(ref.length, mut.length); k++) if (ref[k] !== mut[k]) codons[Math.floor(k / 3)] = 1;
      var cl = Object.keys(codons).map(Number).sort(function (a, b) { return a - b; });
      out.protein = cl.length === 1 ? "p.(" + THREE[refP[cl[0]]] + (cl[0] + 1) + "=)" : "p.(=)";
      return out;
    }
    if (mutP[i] === "*") {
      // HGVS: any change that makes the first changed amino acid a stop is written as a nonsense change
      out.cls = "nonsense"; out.vep = "stop_gained";
      out.protein = "p.(" + THREE[refP[i]] + (i + 1) + "Ter)";
      if (lenDiff !== 0) { out.inframe = true; out.vep += lenDiff > 0 ? ", inframe_insertion" : ", inframe_deletion"; }
      return out;
    }
    if (lenDiff !== 0) {
      // In-frame insertion / deletion / delins. Align translations that read through stop codons, so the
      // codons after the change line up again; then trim the common start (i) and the common end (s).
      // Trimming the start first puts the change as far C-terminal as possible (the HGVS 3' rule).
      var refA = translateAll(ref), mutA = translateAll(mut);
      var s = 0;
      while (s < refA.length - i && s < mutA.length - i && refA[refA.length - 1 - s] === mutA[mutA.length - 1 - s]) s++;
      var rMid = refA.slice(i, refA.length - s), mMid = mutA.slice(i, mutA.length - s);
      var a = i + 1, b = refA.length - s; // 1-based positions in the reference protein
      var span = THREE[refA[a - 1]] + a + (b > a ? "_" + THREE[refA[b - 1]] + b : "");
      var stopIn = mMid.indexOf("*");
      if (stopIn >= 0) {
        // the new amino acids end in a stop codon: list them up to and including the stop (HGVS),
        // not as a replacement of the whole rest of the protein
        out.cls = "nonsense"; out.inframe = true;
        var newAA = three(mMid.slice(0, stopIn + 1));
        if (rMid.length === 0) {
          out.protein = "p.(" + THREE[refA[i - 1]] + i + "_" + THREE[refA[i]] + (i + 1) + "ins" + newAA + ")";
          out.vep = "stop_gained, inframe_insertion";
        } else {
          out.protein = "p.(" + span + "delins" + newAA + ")";
          out.vep = "stop_gained, " + (lenDiff > 0 ? "protein_altering_variant" : "inframe_deletion");
        }
        return out;
      }
      if (mMid.length === 0) {
        out.cls = "inframe-deletion"; out.vep = "inframe_deletion";
        out.protein = "p.(" + span + "del)";
      } else if (rMid.length === 0) {
        out.cls = "inframe-insertion"; out.vep = "inframe_insertion";
        var L = mMid.length;
        if (i - L >= 0 && refA.slice(i - L, i) === mMid) {
          out.protein = "p.(" + THREE[refA[i - L]] + (i - L + 1) + (L > 1 ? "_" + THREE[refA[i - 1]] + i : "") + "dup)";
        } else {
          out.protein = "p.(" + THREE[refA[i - 1]] + i + "_" + THREE[refA[i]] + (i + 1) + "ins" + three(mMid) + ")";
        }
      } else {
        // amino acids replaced as well as added or removed (delins); VEP calls the net-insertion case
        // protein_altering_variant
        out.cls = lenDiff < 0 ? "inframe-deletion" : "inframe-insertion";
        out.vep = lenDiff < 0 ? "inframe_deletion" : "protein_altering_variant";
        out.protein = "p.(" + span + "delins" + three(mMid) + ")";
      }
      return out;
    }
    // same length, different amino acids: missense (one or several)
    out.cls = "missense"; out.vep = "missense_variant";
    var diffs = [];
    for (var q = 0; q < refP.length; q++) if (refP[q] !== mutP[q]) diffs.push(q);
    var blocks = [], cur = [diffs[0], diffs[0]];
    for (var r = 1; r < diffs.length; r++) {
      if (diffs[r] === cur[1] + 1) cur[1] = diffs[r]; else { blocks.push(cur); cur = [diffs[r], diffs[r]]; }
    }
    blocks.push(cur);
    var parts = blocks.map(function (bk) {
      if (bk[0] === bk[1]) return THREE[refP[bk[0]]] + (bk[0] + 1) + THREE[mutP[bk[0]]];
      return THREE[refP[bk[0]]] + (bk[0] + 1) + "_" + THREE[refP[bk[1]]] + (bk[1] + 1) + "delins" + three(mutP.slice(bk[0], bk[1] + 1));
    });
    out.protein = parts.length === 1 ? "p.(" + parts[0] + ")" : "p.[(" + parts.join(";") + ")]";
    out.nChanged = diffs.length;
    return out;
  }

  /* Real HBB variants that the reader may recreate (all checked in ClinVar / dbSNP / Ensembl). */
  var KNOWN = {
    "c.20A>T": "This is the sickle cell variant (rs334, HbS): Glu7Val, written Glu6Val in the older numbering that skips the first methionine.",
    "c.19G>A": "This is hemoglobin C (HbC; rs33930165): the same codon as the sickle variant, but Glu7Lys.",
    "c.19G>T": "This change is reported in ClinVar as pathogenic for β-thalassemia (p.Glu7Ter).",
    "c.9T>C": "This is rs713040, a common synonymous variant. The reference genome carries CAT, but CAC is the more frequent allele in 1000 Genomes overall (about 71% of chromosomes).",
    "c.2T>C": "Reported in ClinVar as pathogenic (β-thalassemia): ATG becomes ACG, so translation cannot start at this codon.",
    "c.2T>G": "Reported in ClinVar as pathogenic (β-thalassemia): ATG becomes AGG.",
    "c.3G>A": "Reported in ClinVar as pathogenic (β-thalassemia): ATG becomes ATA.",
    "c.20del": "Reported in ClinVar as pathogenic for β-thalassemia (c.20del, p.Glu7fs).",
    "c.25_26del": "Reported in ClinVar as pathogenic for β-thalassemia (c.25_26del, p.Lys9fs).",
    "c.17_18del": "Reported in ClinVar as pathogenic for β-thalassemia (c.17_18del, p.Pro6fs)."
  };

  var CORE = { translate: translate, describeDNA: describeDNA, analyze: analyze, REF: REF, CDS: CDS, WINDOW: WINDOW, KNOWN: KNOWN, CODE: CODE };
  if (typeof module !== "undefined" && module.exports) { module.exports = CORE; }
  if (typeof document === "undefined") return;

  /* ====================================================================== */
  /*                               DOM layer                                */
  /* ====================================================================== */
  var CLASS_INFO = {
    "none": { label: "No change", text: "This is the reference sequence. Pick a mode above, then click a base, or try a preset." },
    "synonymous": { label: "Synonymous", text: "The codon changed, but it still encodes the same amino acid, so the protein is unchanged." },
    "missense": { label: "Missense", text: "One amino acid is replaced by another. The protein keeps its full length." },
    "nonsense": { label: "Nonsense (stop-gained)", text: "The change puts a stop codon in the reading frame, so translation ends early and the protein is cut short." },
    "start-lost": { label: "Start-lost", text: "The ATG start codon is gone. Translation may begin at a later ATG or not at all, so HGVS writes p.(Met1?): the protein outcome cannot be predicted from the sequence alone." },
    "frameshift": { label: "Frameshift", text: "The net number of inserted or deleted bases is not a multiple of 3, so every codon after the change is read in a new frame until a stop codon appears." },
    "inframe-deletion": { label: "In-frame deletion", text: "A multiple of 3 bases was removed, so the reading frame is kept; amino acids are removed (or replaced) but the rest of the protein is normal." },
    "inframe-insertion": { label: "In-frame insertion", text: "A multiple of 3 bases was added, so the reading frame is kept; amino acids are added (or replaced) but the rest of the protein is normal." }
  };

  var PRESETS = [
    { id: "syn", label: "Synonymous", hint: "c.9T>C (rs713040)", edits: [["sub", 9, "C"]] },
    { id: "hbs", label: "Sickle cell (HbS)", hint: "c.20A>T (rs334)", edits: [["sub", 20, "T"]] },
    { id: "hbc", label: "HbC", hint: "c.19G>A", edits: [["sub", 19, "A"]] },
    { id: "non", label: "Nonsense", hint: "c.19G>T", edits: [["sub", 19, "T"]] },
    { id: "start", label: "Start-lost", hint: "c.2T>C", edits: [["sub", 2, "C"]] },
    { id: "fs", label: "Frameshift", hint: "c.20del", edits: [["del", 20]] }
  ];

  function h(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "class") n.className = attrs[k]; else n.setAttribute(k, attrs[k]);
    });
    if (text != null) n.textContent = text;
    return n;
  }

  function init() {
    var root = document.getElementById("w-codon");
    if (!root) return;
    var body = root.querySelector(".widget-body");
    if (!body) return;
    body.innerHTML = "";

    // state: editable window as a list of {b, orig}; orig = c. position (1-based) or 0 for inserted bases
    var state = { win: [], mode: "sub", insBase: "G", msg: "" };
    function reset() {
      state.win = [];
      for (var i = 0; i < WINDOW; i++) state.win.push({ b: REF[i], orig: i + 1 });
      state.msg = "";
    }
    reset();

    /* --- controls --- */
    var controls = h("div", { "class": "controls cw-controls" });
    var modeWrap = h("div", { "class": "cw-modes", role: "radiogroup", "aria-label": "What a click on a base does" });
    var modes = [["sub", "Change a base"], ["del", "Delete a base"], ["ins", "Insert a base after"]];
    var modeBtns = {};
    modes.forEach(function (m) {
      var b = h("button", { type: "button", "class": "btn cw-mode", role: "radio", "aria-checked": "false", "data-mode": m[0] }, m[1]);
      b.addEventListener("click", function () { state.mode = m[0]; render(); });
      modeBtns[m[0]] = b;
      modeWrap.appendChild(b);
    });
    controls.appendChild(modeWrap);
    var insLabel = h("label", { "class": "cw-inslabel" });
    insLabel.appendChild(document.createTextNode("Base to insert "));
    var insSel = h("select", { "aria-label": "Base to insert" });
    ["A", "C", "G", "T"].forEach(function (b) { var o = h("option", { value: b }, b); if (b === "G") o.selected = true; insSel.appendChild(o); });
    insSel.addEventListener("change", function () { state.insBase = insSel.value; });
    insLabel.appendChild(insSel);
    controls.appendChild(insLabel);
    body.appendChild(controls);

    var presetRow = h("div", { "class": "controls cw-presets" });
    var presetLabel = h("span", { "class": "cw-presets-label" });
    presetLabel.innerHTML = "Presets (real <em>HBB</em> variants):";
    presetRow.appendChild(presetLabel);
    PRESETS.forEach(function (p) {
      var b = h("button", { type: "button", "class": "btn cw-preset", "data-preset": p.id, title: p.hint });
      b.appendChild(document.createTextNode(p.label + " "));
      b.appendChild(h("span", { "class": "cw-hint" }, p.hint));
      b.addEventListener("click", function () { applyPreset(p); });
      presetRow.appendChild(b);
    });
    var resetBtn = h("button", { type: "button", "class": "btn primary cw-reset", "data-preset": "reset" }, "Reset");
    resetBtn.addEventListener("click", function () { reset(); render(); });
    presetRow.appendChild(resetBtn);
    body.appendChild(presetRow);

    var legend = h("p", { "class": "note cw-legend" });
    legend.innerHTML = "Top row of each column: the reference codon and amino acid. Bottom row: your sequence (click its bases). " +
      "Shading: <span class=\"cw-key cw-k-changed\">changed amino acid</span> <span class=\"cw-key cw-k-stop\">stop</span> <span class=\"cw-key cw-k-after\">not translated</span>.";
    body.appendChild(legend);

    var grid = h("div", { "class": "cw-grid", "aria-label": "Codons 1 to 12 of HBB" });
    body.appendChild(grid);
    var readout = h("div", { "class": "cw-readout", "aria-live": "polite" });
    body.appendChild(readout);

    function applyPreset(p) {
      reset();
      p.edits.forEach(function (e) {
        var idx = findOrig(e[1]);
        if (idx < 0) return;
        if (e[0] === "sub") state.win[idx].b = e[2];
        else if (e[0] === "del") state.win.splice(idx, 1);
      });
      render();
    }
    function findOrig(pos) {
      for (var i = 0; i < state.win.length; i++) if (state.win[i].orig === pos) return i;
      return -1;
    }
    function mutSeq() {
      var s = "";
      for (var i = 0; i < state.win.length; i++) s += state.win[i].b;
      return s + REF.slice(WINDOW);
    }

    function onBase(i) {
      state.msg = "";
      var n = state.win.length;
      if (state.mode === "sub") {
        var order = "ACGT";
        state.win[i].b = order[(order.indexOf(state.win[i].b) + 1) % 4];
      } else if (state.mode === "del") {
        if (n <= WINDOW - 6) { state.msg = "Limit reached: at most 6 net deletions in this window."; }
        else state.win.splice(i, 1);
      } else {
        if (n >= WINDOW + 6) { state.msg = "Limit reached: at most 6 net insertions in this window."; }
        else state.win.splice(i + 1, 0, { b: state.insBase, orig: 0 });
      }
      render(i);
    }

    function render(focusIdx) {
      Object.keys(modeBtns).forEach(function (k) {
        var on = state.mode === k;
        modeBtns[k].setAttribute("aria-checked", on ? "true" : "false");
        modeBtns[k].classList.toggle("primary", on);
      });
      insLabel.style.display = state.mode === "ins" ? "" : "none";

      var mut = mutSeq();
      var res = analyze(REF, mut);
      var refP = res.refProtein, mutP = res.mutProtein;
      var stopIdx = mutP.indexOf("*");
      var nWin = state.win.length;
      var nCodons = Math.max(12, Math.ceil(nWin / 3));

      grid.innerHTML = "";
      for (var c = 0; c < nCodons; c++) {
        var col = h("div", { "class": "cw-col" });
        col.appendChild(h("div", { "class": "cw-idx" }, String(c + 1)));
        // reference codon (only codons 1..12 are part of the window)
        var refBox = h("div", { "class": "cw-ref" });
        var rb = h("div", { "class": "cw-bases" });
        for (var k = 0; k < 3; k++) {
          var ch = REF[c * 3 + k];
          rb.appendChild(h("span", { "class": "cw-b b-" + ch }, ch));
        }
        refBox.appendChild(rb);
        refBox.appendChild(h("div", { "class": "cw-aa" }, THREE[refP[c]] || ""));
        if (c >= 12) refBox.classList.add("cw-outside");
        col.appendChild(refBox);

        // mutant codon
        var mutBox = h("div", { "class": "cw-mut" });
        var mb = h("div", { "class": "cw-bases" });
        for (var j = 0; j < 3; j++) {
          var wi = c * 3 + j;
          if (wi < nWin) {
            var o = state.win[wi];
            var changed = o.orig === 0 || o.b !== REF[o.orig - 1];
            var lab = (o.orig ? "c." + o.orig + " " : "inserted ") + o.b +
              (state.mode === "sub" ? ": click to change" : state.mode === "del" ? ": click to delete" : ": click to insert " + state.insBase + " after it");
            var btn = h("button", { type: "button", "class": "cw-b cw-btn b-" + o.b + (changed ? " cw-edited" : "") + (o.orig === 0 ? " cw-inserted" : ""), "aria-label": lab, title: lab, "data-i": String(wi) }, o.b);
            (function (idx) { btn.addEventListener("click", function () { onBase(idx); }); })(wi);
            mb.appendChild(btn);
          } else {
            // bases pulled in from outside the window after a deletion
            var extra = mut[wi];
            mb.appendChild(h("span", { "class": "cw-b cw-pulled b-" + extra, title: "base from codon 13 onward (outside the editable window)" }, extra || ""));
          }
        }
        mutBox.appendChild(mb);
        var aa = mutP[c];
        var aaTxt = aa === undefined ? "" : (aa === "*" ? "Stop" : THREE[aa]);
        var aaDiv = h("div", { "class": "cw-aa" }, stopIdx >= 0 && c > stopIdx ? "·" : aaTxt);
        mutBox.appendChild(aaDiv);
        if (stopIdx >= 0 && c > stopIdx) mutBox.classList.add("cw-after");
        else if (aa === "*") mutBox.classList.add("cw-stop");
        else if (aa !== refP[c]) mutBox.classList.add("cw-changed");
        col.appendChild(mutBox);
        grid.appendChild(col);
      }

      // readout
      var info = CLASS_INFO[res.cls];
      readout.innerHTML = "";
      var head = h("div", { "class": "cw-class cw-c-" + res.cls });
      head.appendChild(h("span", { "class": "cw-badge" }, info.label));
      head.appendChild(h("span", { "class": "cw-vep" }, res.cls === "none" ? "" : (res.vep.indexOf(",") >= 0 ? "VEP terms: " : "VEP term: ") + res.vep));
      readout.appendChild(head);
      var infoText = info.text;
      if (res.cls === "missense" && res.nChanged > 1) infoText = "Several amino acids are replaced by others. The protein keeps its full length.";
      var p1 = h("p", { "class": "cw-text" }, infoText);
      readout.appendChild(p1);
      if (res.cls !== "none") {
        var dl = h("div", { "class": "cw-hgvs readout" });
        dl.appendChild(h("div", null, "DNA:     " + TRANSCRIPT + ":" + res.dna));
        dl.appendChild(h("div", null, "Protein: " + res.protein));
        var lenTxt;
        if (res.cls === "start-lost") lenTxt = "Length:  unknown (no ATG at codon 1)";
        else lenTxt = "Length:  " + res.mutLen + " amino acids before the stop (normal: " + res.refLen + ")";
        dl.appendChild(h("div", null, lenTxt));
        readout.appendChild(dl);
        if (res.cls === "frameshift" && !res.immediateStop && res.hasStop) {
          readout.appendChild(h("p", { "class": "cw-text" }, "The new reading frame starts at codon " + res.firstChanged + " and reaches a stop codon after " + (res.mutLen - res.firstChanged + 1) + " new amino acids."));
        }
        if (res.cls === "inframe-deletion" || res.cls === "inframe-insertion") {
          readout.appendChild(h("p", { "class": "cw-text" }, "The codons after the change move by whole codons, so in the grid they no longer line up with the reference row above them, but they still encode the same amino acids as before."));
        }
        if (res.cls === "frameshift" && res.immediateStop) {
          readout.appendChild(h("p", { "class": "cw-text" }, "Here the shifted frame reads a stop codon immediately, so HGVS describes the protein change as a nonsense change."));
        }
        // protein strings (first 30 residues)
        var ps = h("div", { "class": "cw-prot" });
        ps.appendChild(protLine("Reference protein", refP, refP));
        ps.appendChild(protLine("Your protein", mutP, refP));
        if (res.cls === "start-lost") ps.appendChild(h("div", { "class": "cw-pnote" }, "Without the start codon this line is not a predicted protein: it only translates your codons in the original frame, for comparison."));
        ps.appendChild(h("div", { "class": "cw-pnote" }, "One-letter amino acid codes (M = Met, V = Val, H = His, E = Glu …); * = stop."));
        readout.appendChild(ps);
        if (KNOWN[res.dna]) readout.appendChild(h("p", { "class": "cw-known" }, KNOWN[res.dna]));
      }
      if (state.msg) readout.appendChild(h("p", { "class": "cw-msg" }, state.msg));

      if (focusIdx != null) {
        var target = grid.querySelector('button[data-i="' + Math.min(focusIdx, nWin - 1) + '"]');
        if (target) target.focus({ preventScroll: true });
      }
    }

    function protLine(label, p, refP) {
      var line = h("div", { "class": "cw-pline" });
      line.appendChild(h("span", { "class": "cw-plabel" }, label));
      var seq = h("span", { "class": "cw-pseq" });
      var n = Math.min(p.length, 30);
      // Which residues differ from the reference? Same length: compare position by position.
      // Different length (insertion/deletion): trim the common start and end, so that an in-frame
      // change highlights only the inserted residues (or marks the deletion point).
      var lo = 0, hi = 0, gapAt = -1, sameLen = p.length === refP.length;
      if (p !== refP && !sameLen) {
        while (lo < p.length && lo < refP.length && p[lo] === refP[lo]) lo++;
        var e = 0;
        while (e < p.length - lo && e < refP.length - lo && p[p.length - 1 - e] === refP[refP.length - 1 - e]) e++;
        hi = p.length - e;
        if (hi <= lo) gapAt = lo;
      }
      for (var i = 0; i < n; i++) {
        if (i === gapAt) seq.appendChild(h("span", { "class": "cw-ps-gap", title: "deleted residue(s)" }, "|"));
        var diff = p === refP ? false : (sameLen ? p[i] !== refP[i] : (i >= lo && i < hi));
        var cls = p === refP ? "" : (p[i] === "*" ? "cw-ps-stop" : (diff ? "cw-ps-diff" : ""));
        seq.appendChild(h("span", cls ? { "class": cls } : null, p[i]));
      }
      if (p.length > 30) seq.appendChild(h("span", { "class": "cw-ps-more" }, "… (" + (p[p.length - 1] === "*" ? p.length - 1 : p.length) + " aa)"));
      line.appendChild(seq);
      return line;
    }

    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
