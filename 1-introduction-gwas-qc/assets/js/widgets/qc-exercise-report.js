/* Widget "The QC report, read from your files" (page: qc-exercise.html, section #report).
   Root element: <div class="widget" id="w-qc-report"> with an empty .widget-body.

   Builds the QC report table from the files in the page's lab (all optional; a row says what is missing):
     ${input_dir}/toy.fam, .bim                         the input
     ${analysis_dir}/toy.geno0.01.log, .fam, .bim       step 1, --geno 0.01 ("N variants removed due to missing genotype data (--geno).")
     ${analysis_dir}/toy.geno0.01.mind0.01.log, .fam, .bim   step 1, --mind 0.01 ("N people removed due to missing genotype data (--mind).")
     ${analysis_dir}/toy.geno0.01.mind0.01.hwe          step 2 (UNAFF rows below the threshold)
     ${analysis_dir}/toy.geno0.01.mind0.01.prune.in     step 3
     ${analysis_dir}/toy.geno0.01.mind0.01.LD0.3.genome step 4 (pairs with PI_HAT > 0.1875)
     ${analysis_dir}/toy.geno0.01.mind0.01.LD0.3.het    step 5 (people with |F| > 0.1)
     ${analysis_dir}/toy.geno0.01.mind0.01.LD0.3.eigenvec, ...merge1kgenomes.eigenvec   steps 6 and 7
     ${analysis_dir}/toy_grafanc_out.txt                step 8 (continental digit of AncGroupID)
     ${analysis_dir}/fail_het.txt, fail_related.txt, toy.remove.txt, flag_ancestry.txt   the reader's lists
     ${analysis_dir}/toy.qc.log, .fam, .bim             the final command ("--remove: N people remaining.",
                                                        "--hwe: N variants removed due to Hardy-Weinberg exact test.",
                                                        "N variants and M people pass filters and QC.")
   and checks that the numbers agree (list lines against people removed, log against files). Redraws on
   lab:fs-change (debounced). "Run steps 1-8" runs the remaining suggested commands of terminal #lab-pipeline.

   Comparison with the toy data's reference values: window.TOY_CARD (assets/js/lab/data-card.js, computed by
   running the practical's commands with the lab's emulators) gives the expected count of each step 1-8 row.
   The final rows are compared with this page's worked solution, derived from the card: the people of the
   practical's +-3 SD rule (het_outliers_3sd) plus one member of each planted pair (window.TOY_PEOPLE, pairs
   with a heterozygosity failure skipped; in these data every other pair above 0.1875 contains the
   contaminated sample, a heterozygosity failure), and --hwe 1e-6 removing hwe_unaff_p_lt_1e6 SNPs.
   A collapsed list ("spoilers") shows, from TOY_PEOPLE, what the simulation planted in each person the reader
   removed or flagged, and the planted problems still in the cleaned fileset.
   The DOM-free core (compute, keyList) is exported for Node tests. No libraries. */
(function () {
  "use strict";

  var IN = "input_dir:toy", G1 = "analysis_dir:toy.geno0.01", M = "analysis_dir:toy.geno0.01.mind0.01",
    P3 = "analysis_dir:toy.geno0.01.mind0.01.LD0.3", QC = "analysis_dir:toy.qc";
  var CONT = { 1: "AFR", 2: "MEN", 3: "EUR", 4: "SAS", 5: "EAS", 6: "AMR", 7: "OCN", 8: "MIX" };

  /* ================================================================== core */
  function lines(text) {
    if (text == null) return null;
    return String(text).split(/\r?\n/).filter(function (l) { return l.trim() !== ""; });
  }
  function idKey(line) {
    var t = String(line).trim().split(/\s+/);
    return t.length >= 2 ? t[0] + " " + t[1] : null;
  }
  function num(re, text) {
    if (text == null) return null;
    var m = re.exec(text);
    return m ? +m[1] : null;
  }
  function table(text) {
    var L = lines(text);
    if (!L || !L.length) return null;
    var rows = L.map(function (l) { return l.trim().split(/\s+/); });
    return { header: rows[0], rows: rows.slice(1), col: function (name) { return rows[0].indexOf(name); } };
  }
  function ppl(n) { return n + (n === 1 ? " person" : " people"); }

  /* The worked solution's expected final counts, from the card and TOY_PEOPLE; null if they cannot be derived. */
  function workedSolution(card, people) {
    var need = ["het_outliers_3sd", "het_outliers_3sd_fids", "qc_people", "qc_snps", "hwe_unaff_p_lt_1e6"];
    if (!card || !people || need.some(function (k) { return card[k] == null; })) return null;
    var het = Object.create(null);
    String(card.het_outliers_3sd_fids).split(/\s*,\s*/).forEach(function (f) { if (f) het['"' + f + '"'] = true; });
    var pairs = Object.create(null);
    Object.keys(people).forEach(function (fid) {
      var q = people[fid] && people[fid].pair;
      if (q && !het[fid] && !het[q]) pairs[[fid, q].sort().join(" ")] = true;
    });
    var removed = card.het_outliers_3sd + Object.keys(pairs).length;
    return { removed: removed, people: card.qc_people - removed, hwe: card.hwe_unaff_p_lt_1e6, snps: card.qc_snps - card.hwe_unaff_p_lt_1e6 };
  }

  /* read(ref): text or null, where ref is "dir:file" with dir = input_dir or analysis_dir.
     card, people: window.TOY_CARD and window.TOY_PEOPLE (optional). */
  function compute(read, card, people) {
    function R(ref, ext) { return read(ref + (ext || "")); }
    function count(ref, ext) { var l = lines(R(ref, ext)); return l ? l.length : null; }
    var r = { rows: [], checks: [] };

    var inP = count(IN, ".fam"), inS = count(IN, ".bim");
    r.rows.push({ step: "Input", rule: "toy.bed, .bim, .fam", removed: null, flagged: null, people: inP, snps: inS,
      source: "toy.fam, toy.bim (lines)", missing: inP == null ? "the input files" : null });

    /* Step 1's removals are counted from the files: the practical's later commands reuse the prefixes
       toy.geno0.01 (--missing) and toy.geno0.01.mind0.01 (--hardy, --indep-pairwise) and so overwrite
       the logs of the two filters. A log line, when it is still there, becomes a check. */
    var g1P = count(G1, ".fam"), g1S = count(G1, ".bim");
    var genoGone = inS != null && g1S != null ? inS - g1S : null;
    var genoLog = num(/(\d+) variants? removed due to missing genotype data \(--geno\)/, R(G1, ".log"));
    r.rows.push({ step: "1 · variant missingness", rule: "--geno 0.01", removed: genoGone == null ? null : { n: genoGone, unit: "SNP" },
      people: g1P, snps: g1S, source: "toy.bim − toy.geno0.01.bim (lines)",
      missing: g1S == null ? "toy.geno0.01.bim (run step 1)" : null });

    var mP = count(M, ".fam"), mS = count(M, ".bim");
    var mindGone = g1P != null && mP != null ? g1P - mP : null;
    var mindLog = num(/(\d+) (?:people|person) removed due to missing genotype data \(--mind\)/, R(M, ".log"));
    r.rows.push({ step: "1 · sample missingness", rule: "--mind 0.01", removed: mindGone == null ? null : { n: mindGone, unit: "person" },
      people: mP, snps: mS, source: "toy.geno0.01.fam − toy.geno0.01.mind0.01.fam (lines)",
      missing: mP == null ? "toy.geno0.01.mind0.01.fam (run step 1)" : null });

    var qclog = R(QC, ".log");
    var hweOpt = qclog ? /--hwe\s+(\S+)((?:\s+(?:midp|include-nonctrl))*)/.exec(qclog) : null;
    var thr = hweOpt ? Number(hweOpt[1]) : 1e-6;
    var hweRule = hweOpt ? "--hwe " + hweOpt[1] + hweOpt[2].replace(/\s+/g, " ") + (/include-nonctrl/.test(hweOpt[2]) ? " (all founders)" : " (controls)") : "not applied yet";
    var hweGone = num(/--hwe: (\d+) variants? removed due to Hardy-Weinberg exact test/, qclog);
    var hwe = table(R(M, ".hwe")), below = null;
    if (hwe && isFinite(thr)) {
      var jt = hwe.col("TEST"), jp = hwe.col("P");
      if (jt >= 0 && jp >= 0) below = hwe.rows.filter(function (x) { return x[jt] === "UNAFF" && Number(x[jp]) < thr; }).length;
    }
    r.rows.push({ step: "2 · Hardy–Weinberg", rule: hweRule, removed: hweGone == null ? null : { n: hweGone, unit: "SNP" },
      flagged: below == null ? null : below + " UNAFF rows with p < " + (hweOpt ? hweOpt[1] : "1e-6") + " before removals",
      source: "toy.qc.log; …mind0.01.hwe", missing: hwe == null ? "the .hwe file (run step 2)" : (qclog == null ? "toy.qc.log (Task 6)" : null) });

    var pin = count(M, ".prune.in");
    r.rows.push({ step: "3 · LD pruning", rule: "--indep-pairwise 50 5 0.3", removed: "none", flagged: pin == null ? null : pin + " SNPs kept for steps 4–6",
      source: "….prune.in", missing: pin == null ? "the .prune.in file (run step 3)" : null });

    var gen = table(R(P3, ".genome")), pairs = null;
    if (gen && gen.col("PI_HAT") >= 0) { var jpi = gen.col("PI_HAT"); pairs = gen.rows.filter(function (x) { return Number(x[jpi]) > 0.1875; }).length; }
    var rel = lines(R("analysis_dir:fail_related.txt"));
    r.rows.push({ step: "4 · relatedness", rule: "your list: fail_related.txt", removed: rel == null ? null : { n: rel.length, unit: "person", listed: true },
      flagged: pairs == null ? null : pairs + " pairs with PI_HAT > 0.1875",
      source: "….LD0.3.genome; fail_related.txt", missing: gen == null ? "the .genome file (run step 4)" : (rel == null ? "fail_related.txt (Task 4)" : null) });

    var het = table(R(P3, ".het")), fOut = null;
    if (het && het.col("F") >= 0) { var jf = het.col("F"); fOut = het.rows.filter(function (x) { return Math.abs(Number(x[jf])) > 0.1; }).length; }
    var hl = lines(R("analysis_dir:fail_het.txt"));
    r.rows.push({ step: "5 · heterozygosity", rule: "your list: fail_het.txt", removed: hl == null ? null : { n: hl.length, unit: "person", listed: true },
      flagged: fOut == null ? null : fOut + " people with |F| > 0.1",
      source: "….LD0.3.het; fail_het.txt", missing: het == null ? "the .het file (run step 5)" : (hl == null ? "fail_het.txt (Task 3)" : null) });

    var pc6 = R(P3, ".eigenvec") != null, pc7 = R("analysis_dir:toy.geno0.01.mind0.01.merge1kgenomes", ".eigenvec") != null;
    r.rows.push({ step: "6 · PCA", rule: "look, do not remove", removed: "none", flagged: pc6 ? "PCs computed" : null, source: "….LD0.3.eigenvec",
      missing: pc6 ? null : "the .eigenvec file (run step 6)" });
    r.rows.push({ step: "7 · reference PCA", rule: "look, do not remove", removed: "none", flagged: pc7 ? "PCs computed" : null, source: "….merge1kgenomes.eigenvec",
      missing: pc7 ? null : "the merged .eigenvec (run step 7)" });

    var graf = table(R("analysis_dir:toy_grafanc_out.txt")), groups = null, c = null;
    if (graf) {
      var jg = graf.col("AncGroupID");
      if (jg >= 0) {
        c = {};
        graf.rows.forEach(function (x) { var k = CONT[Math.floor(Number(x[jg]) / 100)] || "other"; c[k] = (c[k] || 0) + 1; });
        groups = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; }).map(function (k) { return k + " " + c[k]; }).join(", ");
      }
    }
    var fl = lines(R("analysis_dir:flag_ancestry.txt"));
    r.rows.push({ step: "8 · GrafAnc", rule: fl == null ? "flag only (optional)" : "your flags: flag_ancestry.txt", removed: "none",
      flagged: (fl != null ? fl.length + " people flagged" : "") + (groups ? (fl != null ? "; " : "") + "groups: " + groups : "") || null,
      source: "toy_grafanc_out.txt; flag_ancestry.txt", missing: graf == null ? "toy_grafanc_out.txt (run step 8)" : null });

    var remaining = num(/--remove: (\d+) (?:people|person) remaining/, qclog);
    var rem = lines(R("analysis_dir:toy.remove.txt"));
    var remGone = remaining != null && mP != null ? mP - remaining : null;
    r.rows.push({ step: "Final · remove people", rule: "--remove toy.remove.txt" + (rem ? " (" + rem.length + " lines)" : ""),
      removed: remGone == null ? null : { n: remGone, unit: "person" }, people: remaining, source: "toy.qc.log",
      missing: qclog == null ? "toy.qc.log (Task 6)" : (remaining == null ? "a --remove line in toy.qc.log" : null) });

    var qP = count(QC, ".fam"), qS = count(QC, ".bim");
    var pass = qclog ? /(\d+) variants? and (\d+) (?:people|person) pass filters and QC/.exec(qclog) : null;
    r.rows.push({ step: "Cleaned fileset", rule: "toy.qc.bed, .bim, .fam", removed: null, people: qP, snps: qS, total: true,
      source: "toy.qc.fam, toy.qc.bim (lines)", missing: qP == null ? "toy.qc (Task 6)" : null });

    /* ---- checks ---- */
    var C = r.checks;
    if (rem && mP != null) {
      var famIds = Object.create(null);
      (lines(R(M, ".fam")) || []).forEach(function (l) { var k = idKey(l); if (k) famIds[k] = true; });
      var keys = rem.map(idKey).filter(Boolean), seen = Object.create(null), dup = 0, unmatched = [];
      keys.forEach(function (k) { if (seen[k]) dup++; seen[k] = true; if (!famIds[k]) unmatched.push(k); });
      C.push({ ok: unmatched.length === 0, text: unmatched.length === 0 ?
        "Every ID in toy.remove.txt matches a person in toy.geno0.01.mind0.01.fam." :
        unmatched.length + " of " + keys.length + " IDs in toy.remove.txt match nobody in toy.geno0.01.mind0.01.fam (first: " + unmatched.slice(0, 3).join("; ") + "). Check quotation marks and that the list uses the step 1 IDs, not GrafAnc's new ones." });
      if (dup) C.push({ ok: false, text: dup + " lines of toy.remove.txt repeat an ID; use sort -u." });
      if (remGone != null) C.push({ ok: remGone === keys.length - unmatched.length - dup, text: "--remove removed " + ppl(remGone) + "; toy.remove.txt names " + ppl(keys.length - unmatched.length - dup) + " of the fileset (distinct IDs that match)." });
    }
    if (rem && (hl || rel)) {
      var inRem = Object.create(null);
      rem.forEach(function (l) { var k = idKey(l); if (k) inRem[k] = true; });
      var miss = [];
      (hl || []).concat(rel || []).forEach(function (l) { var k = idKey(l); if (k && !inRem[k]) miss.push(k); });
      C.push({ ok: miss.length === 0, text: miss.length === 0 ? "Everyone in fail_het.txt and fail_related.txt is in toy.remove.txt." :
        ppl(miss.length) + " from fail_het.txt or fail_related.txt " + (miss.length === 1 ? "is" : "are") + " not in toy.remove.txt (first: " + miss.slice(0, 3).join("; ") + "). Rebuild it with cat … | sort -u." });
    }
    if (fl && rem) {
      var inR = Object.create(null);
      rem.forEach(function (l) { var k = idKey(l); if (k) inR[k] = true; });
      var both = fl.map(idKey).filter(function (k) { return k && inR[k]; });
      C.push({ ok: null, text: both.length ? ppl(both.length) + " in flag_ancestry.txt " + (both.length === 1 ? "is" : "are") + " also in toy.remove.txt. If a QC rule removed them, check that the rule did not pick up genetic ancestry instead of a fault in the sample; if the flags themselves were used, the restriction must be prespecified and justified." :
        "No one in flag_ancestry.txt is in toy.remove.txt: the ancestry flags are a record, not a removal." });
    }
    if (pass && qP != null) C.push({ ok: +pass[2] === qP, text: "The log says " + ppl(+pass[2]) + " pass filters and QC; toy.qc.fam has " + qP + " lines." });
    if (pass && qS != null) C.push({ ok: +pass[1] === qS, text: "The log says " + pass[1] + " variants pass; toy.qc.bim has " + qS + " lines." });
    if (mS != null && qS != null && hweGone != null) C.push({ ok: mS - hweGone === qS, text: "SNPs: " + mS + " after step 1 − " + hweGone + " removed by --hwe = " + (mS - hweGone) + "; toy.qc.bim has " + qS + "." });
    if (genoLog != null && genoGone != null)
      C.push({ ok: genoLog === genoGone, text: "toy.geno0.01.log reports " + genoLog + " variants removed by --geno; the files differ by " + genoGone + "." });
    if (mindLog != null && mindGone != null)
      C.push({ ok: mindLog === mindGone, text: "toy.geno0.01.mind0.01.log reports " + ppl(mindLog) + " removed by --mind; the files differ by " + mindGone + "." });
    if (inP != null && g1P != null && g1P !== inP)
      C.push({ ok: false, text: "toy.geno0.01.fam has " + g1P + " lines but the input has " + inP + ": --geno should remove SNPs only." });
    if (g1S != null && mS != null && mS !== g1S)
      C.push({ ok: false, text: "toy.geno0.01.mind0.01.bim has " + mS + " lines but toy.geno0.01.bim has " + g1S + ": --mind should remove people only." });

    /* ---- comparison with the toy data's reference values ---- */
    r.compare = [];
    if (card) {
      var cmp = function (what, yours, ref, note) {
        if (typeof ref === "string") ref = card[ref];
        if (typeof ref !== "number" || !isFinite(ref)) return;
        r.compare.push({ what: what, yours: yours == null ? null : yours, ref: ref, ok: yours == null ? null : yours === ref, note: note || "" });
      };
      cmp("People in the input", inP, "study_people");
      cmp("SNPs in the input", inS, "study_snps");
      cmp("SNPs removed by --geno 0.01", genoGone, "geno_removed");
      cmp("People removed by --mind 0.01", mindGone, "mind_removed");
      cmp("People after step 1", mP, "qc_people");
      cmp("SNPs after step 1", mS, "qc_snps");
      var hk = thr === 1e-8 ? "hwe_unaff_p_lt_1e8" : thr === 1e-6 ? "hwe_unaff_p_lt_1e6" : thr === 1e-3 ? "hwe_unaff_p_lt_1e3" : null;
      if (hk) cmp("UNAFF rows with p < " + (hweOpt ? hweOpt[1] : "1e-6") + " in step 2's .hwe", below, hk);
      cmp("SNPs in .prune.in", pin, "prune_in");
      cmp("Pairs with PI_HAT > 0.1875", pairs, "pairs_pihat_gt_0_1875");
      cmp("People with |F| > 0.1", fOut, "het_f_abs_gt_0_1");
      cmp("People outside mean ± 3 SD of the heterozygosity rate (fail_het.txt)", hl ? hl.length : null, "het_outliers_3sd",
        "the practical's rule");
      [["AFR", "grafanc_afr"], ["MEN", "grafanc_men"], ["EUR", "grafanc_eur"], ["SAS", "grafanc_sas"], ["EAS", "grafanc_eas"],
        ["AMR", "grafanc_amr"], ["OCN", "grafanc_ocn"], ["MIX", "grafanc_mix"]].forEach(function (g) {
        if (card[g[1]] || (c && c[g[0]])) cmp("GrafAnc group " + g[0], c ? (c[g[0]] || 0) : null, g[1]);
      });
      var ws = workedSolution(card, people);
      if (ws) {
        cmp("People removed by the final command", remGone, ws.removed, "worked solution");
        cmp("SNPs removed by --hwe", hweGone, ws.hwe, "worked solution");
        cmp("People in toy.qc", qP, ws.people, "worked solution");
        cmp("SNPs in toy.qc", qS, ws.snps, "worked solution");
      }
    }
    return r;
  }

  /* What the simulation planted in each person the reader removed or flagged, and the planted problems
     still in the cleaned fileset. people: window.TOY_PEOPLE. Returns {removed: [text], flagged: [text], kept: [text]}. */
  var ROLE = { duplicate: "planted duplicate of ", parent: "planted parent of ", offspring: "planted child of ",
    full_sibling: "planted full sibling of ", half_sibling: "planted half sibling of " };
  var PAIR = { duplicate: "duplicates", parent: "parent and child", offspring: "parent and child",
    full_sibling: "full siblings", half_sibling: "half siblings" };
  var SUPER = { EUR: "European-like", AFR: "African-like", EAS: "East-Asian-like", SAS: "South-Asian-like" };
  function describe(fid, p) {
    var id = fid.replace(/"/g, "");
    if (!p) return id + ": not in the toy study";
    var who = p.super === "ADMIXED" ? "admixed" + (p.ancestry ? " (" + Object.keys(p.ancestry).map(function (k) {
      return (SUPER[k] || k) + " " + Math.round(100 * p.ancestry[k]) + "%"; }).join(", ") + ")" : "") :
      (SUPER[p.super] || p.super) + " (" + p.group + ")";
    var role = p.planted == null ? "no planted problem" :
      ROLE[p.planted] ? ROLE[p.planted] + String(p.pair || "?").replace(/"/g, "") :
      p.planted === "contaminated" ? "planted contaminated sample (DNA of two people mixed)" :
      p.planted === "inbred" ? "planted child of two relatives" :
      p.planted === "degraded" ? "planted degraded sample" :
      p.planted === "low_quality" ? "planted low-quality sample" : "planted: " + p.planted;
    return id + ": " + role + "; " + who;
  }
  function keyList(read, people) {
    if (!people) return null;
    function fids(ref) {
      var l = lines(read(ref));
      return l ? l.map(function (x) { return String(x).trim().split(/\s+/)[0]; }) : null;
    }
    var rem = fids("analysis_dir:toy.remove.txt"), fl = fids("analysis_dir:flag_ancestry.txt");
    var kept = fids("analysis_dir:toy.qc.fam") || fids("analysis_dir:toy.geno0.01.mind0.01.fam");
    var out = { removed: rem ? rem.map(function (f) { return describe(f, people[f]); }) : null,
      flagged: fl ? fl.map(function (f) { return describe(f, people[f]); }) : null, kept: null };
    if (kept) {
      var inKept = Object.create(null);
      kept.forEach(function (f) { inKept[f] = true; });
      if (!fids("analysis_dir:toy.qc.fam") && rem) rem.forEach(function (f) { delete inKept[f]; });
      var left = [], seen = Object.create(null);
      Object.keys(people).forEach(function (f) {
        var p = people[f];
        if (!inKept[f] || !p || !p.planted || p.planted === "low_quality") return;
        if (p.pair) {
          if (!inKept[p.pair] || seen[f]) return;
          seen[f] = seen[p.pair] = true;
          left.push(f.replace(/"/g, "") + " and " + p.pair.replace(/"/g, "") + ": planted " + (PAIR[p.planted] || p.planted) + ", both still in");
        } else left.push(describe(f, p));
      });
      out.kept = left;
    }
    return out;
  }

  var core = { compute: compute, keyList: keyList, workedSolution: workedSolution, lines: lines, idKey: idKey, num: num };
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  if (typeof document === "undefined") return;

  /* ================================================================== widget */
  var root = document.getElementById("w-qc-report");
  if (!root) return;
  var body = root.querySelector(".widget-body") || root;

  function el(tag, attrs) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (k === "class") e.className = attrs[k]; else e.setAttribute(k, attrs[k]); });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null) continue;
      e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return e;
  }
  if (!window.Lab) { body.appendChild(el("p", { "class": "note" }, "This widget needs the lab (assets/js/lab/lab.js), which did not load.")); return; }

  var runBtn = el("button", { type: "button", "class": "btn primary" }, "Run steps 1–8");
  var status = el("span", { "class": "note", role: "status" }, "Waiting for the lab…");
  body.appendChild(el("div", { "class": "controls" }, runBtn, status));
  var wrap = el("div", { "class": "qr-table-wrap" });
  var checksHead = el("p", { "class": "note" }, "");
  var checks = el("ul", { "class": "qr-checks" });
  var cmpWrap = el("div", { "class": "qr-table-wrap" });
  var keyBody = el("div");
  var keyBox = el("details", { "class": "qr-key" }, el("summary", null, "What the simulation planted in the people you removed or flagged (spoilers)"), keyBody);
  body.appendChild(wrap);
  body.appendChild(checksHead);
  body.appendChild(checks);
  body.appendChild(cmpWrap);
  body.appendChild(keyBox);

  function read(ref) {
    var p = ref.split(":");
    try { return Lab.fs.readText("${" + p[0] + "}/" + p[1]); } catch (e) { return null; }
  }
  function fmt(n) { return n == null ? "" : Number(n).toLocaleString("en-US"); }
  function removedText(x) {
    if (x == null) return "";
    if (typeof x === "string") return x;
    var u = x.unit === "SNP" ? (x.n === 1 ? "SNP" : "SNPs") : (x.n === 1 ? "person" : "people");
    return fmt(x.n) + " " + u + (x.listed ? " (listed)" : "");
  }

  function renderCompare(r) {
    cmpWrap.textContent = "";
    if (!r.compare || !r.compare.length) {
      cmpWrap.appendChild(el("p", { "class": "note" }, window.TOY_CARD ? "" : "The toy data's reference values (data-card.js) did not load, so the comparison is not shown."));
      return;
    }
    var t = el("table", { "class": "qr qr-cmp" });
    t.appendChild(el("caption", null, "Your counts and the toy data's reference values"));
    t.appendChild(el("thead", null, el("tr", null, el("th", null, "Quantity"), el("th", null, "Yours"), el("th", null, "Reference"), el("th", null, "Match"))));
    var tb = el("tbody"), same = 0, diff = 0;
    r.compare.forEach(function (x) {
      var mark = x.ok === true ? el("span", { "class": "qr-ok" }, "✓ same") : x.ok === false ? el("span", { "class": "qr-bad" }, "≠ differs") : el("span", { "class": "qr-wait" }, "waiting");
      if (x.ok === true) same++; else if (x.ok === false) diff++;
      tb.appendChild(el("tr", null, el("td", null, x.what + (x.note ? " (" + x.note + ")" : "")), el("td", { "class": "n" }, x.yours == null ? "" : fmt(x.yours)),
        el("td", { "class": "n" }, fmt(x.ref)), el("td", null, mark)));
    });
    t.appendChild(tb);
    cmpWrap.appendChild(t);
    cmpWrap.appendChild(el("p", { "class": "note" }, same + " of " + r.compare.length + " counts match the reference" + (diff ? ", " + diff + " differ" : "") +
      ". The reference values come from the lab's emulators running the practical's commands; the rows marked \u201cworked solution\u201d differ whenever your rules differ from this page's."));
  }

  function renderKey() {
    keyBody.textContent = "";
    var k = keyList(read, window.TOY_PEOPLE);
    if (!k) { keyBody.appendChild(el("p", { "class": "note" }, "The toy data's answer key (data-card.js) did not load.")); return; }
    function block(title, items, empty) {
      keyBody.appendChild(el("p", null, el("strong", null, title)));
      if (items == null) { keyBody.appendChild(el("p", { "class": "note" }, empty)); return; }
      if (!items.length) { keyBody.appendChild(el("p", { "class": "note" }, "Nobody.")); return; }
      var ul = el("ul");
      items.forEach(function (t) { ul.appendChild(el("li", null, t)); });
      keyBody.appendChild(ul);
    }
    block("In toy.remove.txt", k.removed, "toy.remove.txt does not exist yet (Task 6).");
    block("In flag_ancestry.txt", k.flagged, "flag_ancestry.txt does not exist yet (Task 5).");
    block("Planted problems still in " + (Lab.fs.exists("${analysis_dir}/toy.qc.fam") ? "toy.qc" : "the step 1 fileset, after your list"), k.kept,
      "Run step 1 first.");
    keyBody.appendChild(el("p", { "class": "note" }, "Planted low-quality samples are not listed: after --geno their missing fraction is ordinary, and keeping them is correct. Being admixed, or having a genetic ancestry that is less common in the study, is not a problem to fix."));
  }

  function render() {
    var r;
    try { r = compute(read, window.TOY_CARD, window.TOY_PEOPLE); } catch (e) { status.textContent = "Could not read the files: " + e.message; return; }
    var t = el("table", { "class": "qr" });
    t.appendChild(el("caption", null, "QC report for the toy data, from the files in this page's lab"));
    t.appendChild(el("thead", null, el("tr", null, el("th", null, "Step"), el("th", null, "Rule"), el("th", null, "Removed"),
      el("th", null, "Flagged or counted"), el("th", null, "People left"), el("th", null, "SNPs left"), el("th", null, "Source"))));
    var tb = el("tbody");
    r.rows.forEach(function (x) {
      var tr = el("tr", x.total ? { "class": "qr-total" } : null,
        el("td", null, x.step), el("td", null, x.rule || ""),
        el("td", { "class": "n" }, removedText(x.removed)),
        el("td", null, x.missing && !x.flagged ? el("span", { "class": "qr-wait" }, "waiting for " + x.missing) : (x.flagged || "")),
        el("td", { "class": "n" }, fmt(x.people)), el("td", { "class": "n" }, fmt(x.snps)),
        el("td", { "class": "src" }, x.source));
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    wrap.textContent = "";
    wrap.appendChild(t);
    checks.textContent = "";
    checksHead.textContent = r.checks.length ? "Consistency checks:" : "Consistency checks appear once the lists and toy.qc exist (Tasks 3–6).";
    r.checks.forEach(function (c) {
      var mark = c.ok === true ? el("span", { "class": "qr-ok" }, "✓ ") : c.ok === false ? el("span", { "class": "qr-bad" }, "✗ ") : el("span", { "class": "qr-wait" }, "• ");
      checks.appendChild(el("li", null, mark, c.text));
    });
    renderCompare(r);
    try { renderKey(); } catch (e) { keyBody.textContent = "Could not build the answer key: " + e.message; }
    var done = r.rows.filter(function (x) { return !x.missing; }).length;
    if (!running) status.textContent = done + " of " + r.rows.length + " rows have their files.";
  }

  var timer = null, running = false;
  function soon() { clearTimeout(timer); timer = setTimeout(render, 150); }

  function terminal() {
    var T = (Lab.terminals || []).filter(function (t) { return t.id === "lab-pipeline"; })[0];
    return T || null;
  }
  runBtn.addEventListener("click", function () {
    var T = terminal();
    if (!T) { status.textContent = "The terminal of Task 1 was not found."; return; }
    if (!T.nextSuggestion()) { status.textContent = "All suggested commands of Task 1 have run."; return; }
    running = true; runBtn.disabled = true;
    var total = T.suggestions.length;
    function step() {
      var s = T.nextSuggestion();
      if (!s) return null;
      status.textContent = "Running command " + (s.i + 1) + " of " + total + " in the terminal…";
      return T.runNext().then(step);
    }
    Promise.resolve().then(step).then(function () {
      running = false; runBtn.disabled = false; status.textContent = "Steps 1–8 have run."; render();
    }, function (err) {
      running = false; runBtn.disabled = false; status.textContent = "Stopped: " + (err && err.message ? err.message : err);
    });
  });

  document.addEventListener("lab:fs-change", soon);
  Lab.ready.then(render);
})();
