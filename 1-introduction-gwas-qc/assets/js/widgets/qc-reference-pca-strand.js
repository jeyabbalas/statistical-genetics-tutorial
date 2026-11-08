/* Widget "Will this SNP merge?" (page: qc-reference-pca.html, section #flip).
   Root element: <div class="widget" id="w-strand">.

   What it shows. One SNP as it appears in two .bim files: the study file (the --bfile of the merge)
   and the reference file (the --bmerge file). Each row has allele 1, allele 2 (A, C, G, T, or 0 for
   "no second allele seen") and, optionally, the frequency of allele 1 in that file.
   The widget predicts what the practical's three commands do with the SNP:
     1. --bmerge. PLINK 1.9 matches variants by ID and collects the distinct non-missing allele letters
        of both rows. Two or fewer letters: the rows merge (order does not matter, and a 0 is filled in
        from the other file). Three or more letters: the SNP ID is written to <out>-merge.missnp and the
        merge stops. (Logic of merge_bim_scan in PLINK 1.9's plink_data.c.)
     2. --flip <out>-merge.missnp. Only SNPs listed in .missnp are flipped: each study letter is replaced
        by its complement on the other strand, c(A) = T, c(T) = A, c(C) = G, c(G) = C. Then the merge
        runs again with the same rule.
     3. Strand check with frequencies. A SNP whose two letters are complements of each other (A/T or
        C/G) looks the same on both strands, so letters alone cannot show a strand difference and the
        merge never complains. Let L be the study's allele-1 letter (allele 2 if allele 1 is 0),
        pS the study frequency of L, and pR(x) the reference frequency of letter x. Then
          same-strand reading:     d_same = |pS - pR(L)|
          opposite-strand reading: d_flip = |pS - pR(c(L))|
        and the smaller distance wins. For an A/T or C/G SNP, pR(c(L)) = 1 - pR(L), and "d_same is
        smaller" is the same as "pS and pR(L) lie on the same side of 0.5" (the TwoSampleMR rule).
        If either file's minor allele frequency min(f, 1 - f) is above 0.42 (the TwoSampleMR default),
        the two readings are too close to separate and the SNP should be excluded.
   No libraries, no network; works from file://. The core is exported for Node tests. */
(function () {
  "use strict";

  /* ================================================================== core */
  var COMP = { A: "T", T: "A", C: "G", G: "C" };
  var MAF_MAX = 0.42;

  function comp(x) { return COMP[x] || x; }
  function lettersOf(row) {
    var out = [];
    [row.a1, row.a2].forEach(function (x) { if (x && x !== "0" && out.indexOf(x) < 0) out.push(x); });
    return out;
  }
  function unionLetters(a, b) {
    var out = a.slice();
    b.forEach(function (x) { if (out.indexOf(x) < 0) out.push(x); });
    return out.sort();
  }
  function flipRow(row) { return { a1: row.a1 === "0" ? "0" : comp(row.a1), a2: row.a2 === "0" ? "0" : comp(row.a2), f: row.f }; }
  function isAmbiguous(row) { return !!row.a1 && row.a1 !== "0" && COMP[row.a1] === row.a2; }
  function num(v) { if (v === null || v === undefined || v === "") return NaN; var x = Number(v); return (isFinite(x) && x >= 0 && x <= 1) ? x : NaN; }

  /* Frequency of a letter in a row (NaN when the frequency is not given or the letter is absent). */
  function freqOf(row, letter) {
    var f = num(row.f);
    if (isNaN(f)) return NaN;
    if (letter === row.a1) return f;
    if (letter === row.a2) return 1 - f;
    if (row.a1 === "0" || row.a2 === "0") return 0;   // a letter not seen in a monomorphic row
    return NaN;
  }

  /* Merge rule of PLINK 1.9 for one SNP present in both files. */
  function mergeCheck(study, ref) {
    var u = unionLetters(lettersOf(study), lettersOf(ref));
    return { letters: u, ok: u.length <= 2 };
  }

  function analyse(study, ref) {
    var out = { problem: "", study: study, ref: ref };
    if (study.a1 !== "0" && study.a1 === study.a2) out.problem = "The study row has the same letter twice.";
    if (ref.a1 !== "0" && ref.a1 === ref.a2) out.problem = "The reference row has the same letter twice.";
    if (!lettersOf(study).length || !lettersOf(ref).length) out.problem = "Each row needs at least one letter.";
    out.merge1 = mergeCheck(study, ref);
    out.flipped = flipRow(study);
    out.merge2 = out.merge1.ok ? null : mergeCheck(out.flipped, ref);
    out.ambiguousStudy = isAmbiguous(study);
    out.ambiguousRef = isAmbiguous(ref);
    /* Which strand readings agree with the letters? */
    out.sameOK = out.merge1.ok;
    out.oppOK = mergeCheck(out.flipped, ref).ok;
    /* Frequency comparison */
    var L = (study.a1 && study.a1 !== "0") ? study.a1 : study.a2;
    out.letter = L;
    out.pS = freqOf(study, L);
    out.pRsame = freqOf(ref, L);
    out.pRopp = freqOf(ref, comp(L));
    out.dSame = Math.abs(out.pS - out.pRsame);
    out.dFlip = Math.abs(out.pS - out.pRopp);
    var fS = num(study.f), fR = num(ref.f);
    out.mafS = isNaN(fS) ? NaN : Math.min(fS, 1 - fS);
    out.mafR = isNaN(fR) ? NaN : Math.min(fR, 1 - fR);
    out.tooClose = (out.mafS > MAF_MAX) || (out.mafR > MAF_MAX);
    /* Verdict */
    if (out.problem) { out.verdict = "invalid"; return out; }
    if (out.sameOK && out.oppOK) {
      if (isNaN(out.dSame) || isNaN(out.dFlip)) out.verdict = "ambiguous-nofreq";
      else if (out.tooClose) out.verdict = "ambiguous-close";
      else out.verdict = out.dSame <= out.dFlip ? "ambiguous-same" : "ambiguous-opposite";
    } else if (out.sameOK) out.verdict = "same";
    else if (out.oppOK) out.verdict = "opposite";
    else out.verdict = "different";
    return out;
  }

  var core = { comp: comp, lettersOf: lettersOf, unionLetters: unionLetters, flipRow: flipRow, isAmbiguous: isAmbiguous,
    freqOf: freqOf, mergeCheck: mergeCheck, analyse: analyse, MAF_MAX: MAF_MAX };
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  if (typeof document === "undefined") return;

  /* ================================================================== view */
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function f2(x) { return isNaN(x) ? "–" : x.toFixed(2); }
  var BASE_VAR = { A: "--base-a", C: "--base-c", G: "--base-g", T: "--base-t" };
  function chip(x) {
    if (!x || x === "0") return '<span class="sc-chip sc-zero" title="no letter">0</span>';
    return '<span class="sc-chip" style="background: var(' + BASE_VAR[x] + ')">' + x + "</span>";
  }
  function chips(list) { return list.map(chip).join(""); }
  function codeList(list) { return list.join(", "); }

  var PRESETS = [
    { label: "Same letters", s: ["A", "G", "0.30"], r: ["A", "G", "0.32"] },
    { label: "Same letters, other order", s: ["G", "A", "0.70"], r: ["A", "G", "0.32"] },
    { label: "Opposite strand (T/C against A/G)", s: ["T", "C", "0.30"], r: ["A", "G", "0.32"] },
    { label: "A/T SNP, same strand", s: ["A", "T", "0.20"], r: ["A", "T", "0.22"] },
    { label: "A/T SNP, opposite strand", s: ["A", "T", "0.79"], r: ["A", "T", "0.22"] },
    { label: "C/G SNP near 50%", s: ["C", "G", "0.47"], r: ["C", "G", "0.45"] },
    { label: "Different alleles (A/C against A/G)", s: ["A", "C", "0.30"], r: ["A", "G", "0.32"] },
    { label: "One letter in the study (0/G against A/G)", s: ["0", "G", "0"], r: ["A", "G", "0.03"] },
    { label: "One letter, opposite strand (0/C against A/G)", s: ["0", "C", "0"], r: ["A", "G", "0.03"] }
  ];
  var START = 2;

  function init() {
    var root = document.getElementById("w-strand");
    if (!root) return;
    var body = root.querySelector(".widget-body") || root;
    body.innerHTML = "";

    var c0 = el("div", { "class": "controls" });
    body.appendChild(c0);
    var lp = el("label", null, "<span>Example</span>");
    var sel = el("select", { "aria-label": "Example SNP" });
    PRESETS.forEach(function (p, i) { sel.appendChild(el("option", { value: String(i) }, p.label)); });
    sel.appendChild(el("option", { value: "custom" }, "Your own (edit the rows)"));
    lp.appendChild(sel);
    c0.appendChild(lp);

    var grid = el("div", { "class": "sc-rows" });
    body.appendChild(grid);
    function rowInputs(name, who) {
      var fs = el("fieldset", { "class": "sc-row" });
      fs.appendChild(el("legend", null, name));
      var inputs = {};
      [["a1", "Allele 1"], ["a2", "Allele 2"]].forEach(function (k) {
        var lab = el("label", null, "<span>" + k[1] + "</span>");
        var s = el("select", { "aria-label": who + " " + k[1].toLowerCase() });
        ["A", "C", "G", "T", "0"].forEach(function (b) { s.appendChild(el("option", { value: b }, b)); });
        lab.appendChild(s);
        fs.appendChild(lab);
        inputs[k[0]] = s;
      });
      var lf = el("label", null, "<span>Frequency of allele 1</span>");
      var fi = el("input", { type: "number", min: "0", max: "1", step: "0.01", inputmode: "decimal",
        "aria-label": who + " frequency of allele 1 (0 to 1, may be left empty)" });
      lf.appendChild(fi);
      fs.appendChild(lf);
      inputs.f = fi;
      grid.appendChild(fs);
      return inputs;
    }
    var inS = rowInputs("Study .bim (--bfile)", "Study");
    var inR = rowInputs("Reference .bim (--bmerge)", "Reference");

    var out = el("div", { "class": "readout sc-out", "aria-live": "polite" });
    body.appendChild(out);
    body.appendChild(el("p", { "class": "note" }, "Letters only, as PLINK 1.9 compares them. The frequency check is not done by PLINK; it is the check you add for A/T and C/G SNPs. The 0.42 cutoff is the TwoSampleMR default."));

    function load(i) {
      var p = PRESETS[i];
      inS.a1.value = p.s[0]; inS.a2.value = p.s[1]; inS.f.value = p.s[2];
      inR.a1.value = p.r[0]; inR.a2.value = p.r[1]; inR.f.value = p.r[2];
    }
    function read(inp) { return { a1: inp.a1.value, a2: inp.a2.value, f: inp.f.value }; }

    function render() {
      var s = read(inS), r = read(inR);
      var a = analyse(s, r);
      var h = [];
      if (a.problem) { out.innerHTML = '<p><span class="pill bad">Check the rows</span> ' + a.problem + "</p>"; return; }

      /* Step 1 */
      h.push('<div class="sc-step"><div class="sc-h">1 · <code>--bmerge</code></div>');
      h.push("<p>Study " + chips([s.a1, s.a2]) + " · reference " + chips([r.a1, r.a2]) + " · letters seen in both rows: " +
        chips(a.merge1.letters) + " (" + a.merge1.letters.length + ")</p>");
      if (a.merge1.ok) {
        h.push('<p><span class="pill ok">Merges</span> Two or fewer letters, so PLINK accepts the SNP' +
          ((s.a1 !== r.a1 && s.a1 !== "0") ? " (the order of allele 1 and allele 2 does not matter)" : "") +
          ((s.a1 === "0" || r.a1 === "0") ? " and fills in the missing letter from the other file" : "") + ".</p>");
      } else {
        h.push('<p><span class="pill bad">3+ alleles</span> PLINK writes this SNP\'s ID to <code>…-merge.missnp</code> and stops without writing a merged fileset.</p>');
      }
      h.push("</div>");

      /* Step 2 */
      h.push('<div class="sc-step"><div class="sc-h">2 · <code>--flip …-merge.missnp</code>, then <code>--bmerge</code> again</div>');
      if (a.merge1.ok) {
        h.push("<p>Not in <code>.missnp</code>, so <code>--flip</code> leaves it as it is.</p>");
      } else {
        h.push("<p>Study letters become " + chips([a.flipped.a1, a.flipped.a2]) + " · letters seen: " + chips(a.merge2.letters) + " (" + a.merge2.letters.length + ")</p>");
        if (a.merge2.ok) h.push('<p><span class="pill ok">Merges</span> The SNP was on the opposite strand in the study file; flipping fixed it.</p>');
        else h.push('<p><span class="pill bad">Still 3+ alleles</span> Not a strand problem: the files describe different alleles. Exclude the SNP (<code>--exclude</code> with the new <code>.missnp</code>).</p>');
      }
      h.push("</div>");

      /* Step 3 */
      h.push('<div class="sc-step"><div class="sc-h">3 · Is the merged SNP right?</div>');
      var amb = a.sameOK && a.oppOK;
      if (amb) {
        h.push("<p>" + (a.ambiguousStudy || a.ambiguousRef ? "A strand-ambiguous SNP: each letter's complement is the other letter, " : "Only one letter is known in one file, ") +
          "so the letters fit both strands and PLINK cannot tell.</p>");
        h.push("<p>Study frequency of " + chip(a.letter) + ": " + f2(a.pS) + " · reference frequency of " + chip(a.letter) + ": " + f2(a.pRsame) +
          " (same strand) or of " + chip(comp(a.letter)) + ": " + f2(a.pRopp) + " (opposite strand)</p>");
        if (a.verdict === "ambiguous-nofreq") h.push('<p><span class="pill bad">Unknown</span> Enter both frequencies to compare them. Without frequencies, exclude the SNP.</p>');
        else {
          h.push("<p>Distance to the same-strand reading " + f2(a.dSame) + " · to the opposite-strand reading " + f2(a.dFlip) +
            " · minor allele frequencies " + f2(a.mafS) + " (study) and " + f2(a.mafR) + " (reference)</p>");
          if (a.verdict === "ambiguous-close") h.push('<p><span class="pill bad">Cannot tell</span> A minor allele frequency is above ' + MAF_MAX.toFixed(2) + ", so both readings sit near 0.5 and a small difference between populations could swap them. Exclude the SNP.</p>");
          else if (a.verdict === "ambiguous-same") h.push('<p><span class="pill ok">Same strand</span> The frequencies agree without flipping. The merged SNP is right.</p>');
          else h.push('<p><span class="pill bad">Opposite strand, merged anyway</span> The merge went through, but every study genotype now counts the wrong letter: a person with two copies of the reference\'s ' +
            chip(a.letter) + " is recorded with none. Flip this SNP in the study file or exclude it.</p>");
        }
      } else if (a.verdict === "same") {
        h.push('<p><span class="pill ok">Letters decide</span> Only the same-strand reading fits the letters.' + alignedNote(a.dSame) + "</p>");
      } else if (a.verdict === "opposite") {
        h.push('<p><span class="pill ok">Letters decide</span> Only the opposite-strand reading fits the letters, so <code>--flip</code> was the right repair.' + alignedNote(a.dFlip) + "</p>");
      } else {
        h.push('<p><span class="pill bad">No reading fits</span> Neither strand gives the same pair of letters. The two files disagree about the SNP itself (a different variant under the same ID, or an error).</p>');
      }
      h.push("</div>");
      out.innerHTML = h.join("");
    }
    function alignedNote(d) {
      if (isNaN(d)) return "";
      var t = " After aligning the letters, the frequencies differ by " + f2(d) + ".";
      if (d > 0.2) t += " That is large: a different population, or an error in one file.";
      return t;
    }

    sel.addEventListener("change", function () { if (sel.value !== "custom") { load(+sel.value); } render(); });
    [inS.a1, inS.a2, inR.a1, inR.a2].forEach(function (s) { s.addEventListener("change", function () { sel.value = "custom"; render(); }); });
    [inS.f, inR.f].forEach(function (s) { s.addEventListener("input", function () { sel.value = "custom"; render(); }); });

    sel.value = String(START);
    load(START);
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
