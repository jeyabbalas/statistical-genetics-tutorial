/* plink-core.js: an emulator of the PLINK 1.9 command line for the Lecture 1 lab (author: CORE).

   Plain script: no modules, no network, no DOM. In a page it sets window.PlinkCore; in Node,
   module.exports = PlinkCore. API, supported flags and the known differences from the real program
   are documented in assets/js/lab/CORE.md.

   The definitions follow PLINK 1.9 (https://www.cog-genomics.org/plink/1.9/ and the 1.9 source code,
   https://github.com/chrchang/plink-ng): which samples count (founders), the order of operations
   (--mind before --geno; --freq/--missing before --geno/--hwe/--maf), the allele that becomes A1, the
   exact Hardy-Weinberg test with PLINK's tie handling and mid-p, the --indep-pairwise window walk,
   the method-of-moments IBD estimator of --genome, E(HOM) in --het, the relationship matrix behind
   --pca, the merge rules of --bmerge, the number formatting, column layout and log messages. This file
   is an independent reimplementation for teaching; it is not PLINK. It was checked against real PLINK
   1.9.0 (27 Sep 2026): on the toy data, the exit codes, every output file and the logs (apart from the
   lines that name the program, computer, folder, times, random seed, memory and threads) of the
   practical's commands are identical, as are the files every terminal on the practical pages writes;
   tools/real_plink_check.mjs repeats the comparison and test_lab.mjs (section J) keeps checking it. */
(function (root) {
  "use strict";

  /* ====================================================================================
     1. Constants, version text, help text
     ==================================================================================== */
  var VERSION = "PLINK v1.9.0-toy 64-bit (lab emulator)";
  var BANNER = VERSION + "         www.cog-genomics.org/plink/1.9/\n" +
    "In-browser teaching emulator of PLINK 1.9 for toy data; not the real program.\n";
  var HOSTNAME = "statgen-lab";
  var DEFAULT_CWD = "/home/student/statgen-workshop";
  var RAM_MB = 16384;
  var THREADS = 8;

  var EPSILON = 0.000000000931322574615478515625;                   // 2^-30
  var SMALLISH_EPSILON = 0.00000000002910383045673370361328125;      // 2^-35
  var SMALL_EPSILON = 0.00000000000005684341886080801486968994140625; // 2^-44
  var EXACT_TEST_BIAS = 0.00000000000000000000000010339757656912845935892608650874535669572651386260986328125; // 2^-83

  var RET = { SUCCESS: 0, NOMEM: 1, OPEN_FAIL: 2, INVALID_FORMAT: 3, CALC_NOT_YET_SUPPORTED: 4,
    INVALID_CMDLINE: 5, WRITE_FAIL: 6, READ_FAIL: 7, THREAD_CREATE_FAIL: 8, ALLELE_MISMATCH: 9,
    NULL_CALC: 10, ALL_SAMPLES_EXCLUDED: 11, ALL_MARKERS_EXCLUDED: 12, NETWORK: 13, DEGENERATE_DATA: 14 };

  var ERRSTR_APPEND = "For more information, try \"plink --help <flag name>\" or \"plink --help | more\".\n";
  var CMDLINE_FORMAT = "\n  plink <input flag(s)...> [command flag(s)...] [other flag(s)...]\n  plink --help [flag name(s)...]\n\n";
  var COMMANDS_TEXT =
    "Commands in this lab emulator: --make-bed, --freq, --missing, --hardy,\n" +
    "--indep-pairwise, --genome, --het, --pca, --bmerge and --write-snplist.\n" +
    "Filters: --geno, --mind, --maf, --max-maf, --hwe, --extract, --exclude, --keep,\n" +
    "--remove.  Data changes: --flip, --update-ids.\n\n" +
    "'plink --help | more' describes these flags.\n";

  /* Every flag name that real PLINK 1.9 accepts (taken from its help text), so that a real flag the
     emulator lacks gets an honest "not in the lab" message instead of "Unrecognized flag". */
  var REAL_FLAGS = toSet(
    "1 23file a1-allele a2-allele adjust all-pheno allele-count allele1234 alleleACGT allow-extra-chr " +
    "allow-no-covars allow-no-samples allow-no-sex allow-no-vars annotate annotate-snp-field aperm assoc " +
    "attrib attrib-indiv autosome autosome-num autosome-xy bcf bd bed bfile bgen biallelic-only bim " +
    "blocks blocks-inform-frac blocks-max-kb blocks-min-maf blocks-recomb-highci blocks-strong-highci " +
    "blocks-strong-lowci bmerge border bp-space cell cfile check-sex chr chr-set ci clump " +
    "clump-allow-overlap clump-annotate clump-best clump-field clump-index-first clump-kb clump-p1 " +
    "clump-p2 clump-r2 clump-range clump-range-border clump-replicate clump-snp-field clump-verbose " +
    "cluster cm-map cnv-check-no-overlap cnv-count cnv-del cnv-disrupt cnv-dup cnv-enrichment-test " +
    "cnv-exclude cnv-exclude-off-by-1 cnv-freq-exclude-above cnv-freq-exclude-below " +
    "cnv-freq-exclude-exact cnv-freq-include-exact cnv-freq-method2 cnv-freq-overlap cnv-indiv-perm " +
    "cnv-intersect cnv-kb cnv-list cnv-make-map cnv-max-kb cnv-max-score cnv-max-sites cnv-overlap " +
    "cnv-region-overlap cnv-score cnv-sites cnv-subset cnv-test cnv-test-region cnv-test-window " +
    "cnv-union-overlap cnv-write complement-sets condition condition-list const-fid covar covar-name " +
    "covar-number cow d data debug dfam distance distance-matrix distance-wts dosage double-id dummy " +
    "dummy-coding epi1 epi2 epistasis epistasis-summary-merge exclude exclude-snp exclude-snps extract " +
    "fam family fast-epistasis file fill-missing-a2 filter filter-cases filter-controls filter-females " +
    "filter-founders filter-males filter-nonfounders flip flip-scan flip-scan-threshold flip-scan-window " +
    "flip-scan-window-kb flip-subset freq freqx from from-bp from-kb from-mb fst gap gen gene gene-all " +
    "gene-list-border gene-report gene-report-snp-field gene-subset geno genome gfile gplink grm-bin " +
    "grm-gz groupdist gxe hard-call-threshold hardy het homog homozyg homozyg-density homozyg-gap " +
    "homozyg-het homozyg-kb homozyg-match homozyg-snp homozyg-window-het homozyg-window-missing " +
    "homozyg-window-snp homozyg-window-threshold hwe ibc ibm ibs-matrix ibs-test id-delim impute-sex " +
    "indep indep-pairphase indep-pairwise indiv-sort je-cellmin K keep keep-allele-order keep-autoconv " +
    "keep-cluster-names keep-clusters keep-fam lambda lasso lasso-lambda lasso-select-covars ld ld-snp " +
    "ld-snp-list ld-snps ld-window ld-window-cm ld-window-kb ld-window-r2 ld-xchr lfile lgen linear " +
    "list-23-indels list-all list-duplicate-vars logistic loop-assoc mac maf maf-succ make-bed " +
    "make-founders make-grm-bin make-grm-gz make-just-bim make-just-fam make-perm-pheno make-pheno " +
    "make-rel make-set make-set-border make-set-collapse-group make-set-complement-all map match " +
    "match-type max max-mac max-maf mc mcc mds-plot me me-exclude-one memory mendel mendel-duos " +
    "mendel-multigen merge merge-equal-pos merge-list merge-mode merge-x meta-analysis " +
    "meta-analysis-a1-field meta-analysis-a2-field meta-analysis-bp-field meta-analysis-chr-field " +
    "meta-analysis-ess-field meta-analysis-p-field meta-analysis-report-dups meta-analysis-se-field " +
    "meta-analysis-snp-field mfilter mh mh2 min mind missing missing-code missing-genotype " +
    "missing-genotype2 missing-phenotype missing-var-code model mperm-save mperm-save-all mpheno " +
    "must-have-sex mwithin native neighbour new-id-max-allele-len no-const-covar no-fid no-parents " +
    "no-pheno no-sex nonfounders not-chr oblig-missing out output-chr output-min-p " +
    "output-missing-genotype output-missing-phenotype oxford-pheno-name oxford-single-chr parallel " +
    "parameters pca pca-cluster-names pca-clusters ped perm-batch-size pfilter pheno pheno-merge " +
    "pheno-name pool-size ppc ppc-gap prune q-score-range qfam qfam-between qfam-parents qfam-total " +
    "qmatch qt qual-max-threshold qual-scores qual-threshold r R R-host R-port R-socket r2 read-dists " +
    "read-freq read-genome real-ref-alleles recode recode-allele reference regress-distance regress-rel " +
    "rel-cutoff remove remove-cluster-names remove-clusters remove-fam rerun sample score script seed " +
    "set set-collapse-all set-hh-missing set-max set-me-missing set-missing-var-ids set-mixed-mt-missing " +
    "set-names set-p set-r2 set-table set-test-lambda show-tags silent simulate simulate-label " +
    "simulate-missing simulate-n simulate-ncases simulate-ncontrols simulate-prevalence simulate-qt snp " +
    "snps snps-only split-x subset tag-kb tag-mode2 tag-r2 tail-pheno tdt test-mishap test-missing tests " +
    "tfam tfile thin thin-count thin-indiv thin-indiv-count threads to to-bp to-kb to-mb tped tucc " +
    "twolocus unrelated-heritability update-alleles update-chr update-cm update-ids update-map " +
    "update-name update-parents update-sex vcf vcf-filter vcf-half-call vcf-idspace-to vcf-min-gp " +
    "vcf-min-gq vcf-min-qual vcf-require-gt version vif window with-phenotype within write-cluster " +
    "write-covar write-dosage write-set write-snplist write-var-ranges xchr-model zero-cluster zero-cms " +
    "dog horse mouse rice sheep help h v V Z-genome hwe-all frqx make-just-bim recode-vcf");
  var PLINK2_FLAGS = toSet("pfile bpfile pgen pvar psam make-pgen make-bpgen make-pfile export");

  /* Short help entries for the flags the emulator supports (wording follows the PLINK 1.9 docs). */
  var HELP = {
    "bfile": "  --bfile [prefix]   : Specify .bed + .bim + .fam prefix (default 'plink').\n",
    "out": "  --out <prefix>     : Specify prefix for output files.\n",
    "make-bed": "  --make-bed         : Create a new binary fileset.  Unlike the automatic text-to-\n                       binary converters (which only heed chromosome filters),\n                       this supports all of PLINK's filtering flags.\n",
    "freq": "  --freq             : Allele frequency report (founders only).  Writes <out>.frq.\n",
    "missing": "  --missing          : Sample missing data report written to <out>.imiss, and\n                       variant-based missing data report written to <out>.lmiss.\n",
    "hardy": "  --hardy <midp>     : Generate a Hardy-Weinberg exact test p-value report.  (This\n                       does NOT simultaneously filter on the p-value any more; use\n                       --hwe for that.)  With the 'midp' modifier, the test applies\n                       the mid-p adjustment described in Graffelman J, Moreno V\n                       (2013).\n",
    "indep-pairwise": "  --indep-pairwise <window size>['kb'] <step size (variant ct)> <r^2 threshold>\n                     : Generate a list of markers in approximate linkage\n                       equilibrium.  Pairs of variants in the current window with\n                       squared correlation greater than the threshold are noted,\n                       and variants are greedily pruned from the window until no\n                       such pairs remain.  Writes <out>.prune.in and\n                       <out>.prune.out.\n",
    "genome": "  --genome <gz> <rel-check> <full> <unbounded> <nudge>\n                     : Generate an identity-by-descent report (Purcell et al.\n                       2007 method-of-moments estimator).  Writes <out>.genome.\n",
    "het": "  --het <small-sample>\n                     : Inbreeding coefficient (F) report: observed and expected\n                       autosomal homozygous genotype counts per sample.\n",
    "pca": "  --pca [count] <header> <tabs>\n                     : Extract the top principal components (default 20) of the\n                       variance-standardized relationship matrix.  Writes\n                       <out>.eigenval and <out>.eigenvec.\n",
    "bmerge": "  --bmerge [.bed filename] [.bim filename] [.fam filename]\n  --bmerge [prefix]  : Merge in a binary fileset.\n",
    "write-snplist": "  --write-snplist    : List the IDs of all variants that pass the filters.\n",
    "geno": "  --geno [val]       : Exclude variants with missing call frequencies greater than\n                       a threshold (default 0.1).\n",
    "mind": "  --mind [val]       : Exclude samples with missing call frequencies greater than a\n                       threshold (default 0.1).\n",
    "maf": "  --maf [freq]       : Exclude variants with minor allele frequency lower than a\n                       threshold (default 0.01).\n",
    "max-maf": "  --max-maf <freq>   : Exclude variants with MAF greater than the threshold.\n",
    "hwe": "  --hwe <p> ['midp'] ['include-nonctrl']\n                     : Exclude markers with Hardy-Weinberg equilibrium exact test\n                       p-values below the threshold.  Only controls are tested\n                       when case/control phenotypes are present, unless\n                       'include-nonctrl' is given.\n",
    "extract": "  --extract <filename> : Exclude all variants not named in the file.\n",
    "exclude": "  --exclude <filename> : Exclude all variants named in the file.\n",
    "keep": "  --keep <filename>  : Exclude all samples not named in the file (FID IID).\n",
    "remove": "  --remove <filename> : Exclude all samples named in the file (FID IID).\n",
    "flip": "  --flip <filename>  : Flip alleles (A<->T, C<->G) for the variants named in the\n                       file.\n",
    "update-ids": "  --update-ids <f>   : Update sample IDs.  Each line: old FID, old IID, new FID,\n                       new IID.\n",
    "min": "  --min <minimum PI_HAT> : Minimum PI_HAT for inclusion in --genome output.\n",
    "max": "  --max <maximum PI_HAT> : Maximum PI_HAT for inclusion in --genome output.\n",
    "allow-no-sex": "  --allow-no-sex     : Do not treat ambiguous-sex samples as having missing\n                       phenotypes in analysis commands.\n",
    "keep-allele-order": "  --keep-allele-order : Keep the allele order of the input .bim file (by default,\n                       A1 becomes the minor allele).\n",
    "nonfounders": "  --nonfounders      : Include nonfounders in allele frequency and HWE\n                       calculations.\n",
    "seed": "  --seed <val...>    : Set random number seed(s).\n",
    "threads": "  --threads <val>    : Set maximum number of compute threads.\n",
    "memory": "  --memory <val>     : Set size, in MB, of initial workspace malloc attempt.\n",
    "allow-extra-chr": "  --allow-extra-chr  : Permit unrecognized chromosome codes (no effect here).\n",
    "silent": "  --silent           : Suppress output to console.\n",
    "version": "  --version          : Display only the version number.\n",
    "help": "  --help [flag name(s)] : Display this list, or help for the named flags.\n"
  };

  /* ====================================================================================
     2. Small helpers
     ==================================================================================== */
  function toSet(s) { var o = Object.create(null); s.split(/\s+/).forEach(function (w) { if (w) o[w] = 1; }); return o; }
  function rep(ch, n) { return n > 0 ? new Array(n + 1).join(ch) : ""; }
  function padL(s, w) { s = String(s); return s.length >= w ? s : rep(" ", w - s.length) + s; }
  function plural(n, one, many) { return n === 1 ? one : many; }
  function sp(n) { return n === 1 ? "" : "s"; }
  function people(n) { return n === 1 ? "person" : "people"; }
  function splitTokens(line) { var t = line.trim(); return t ? t.split(/\s+/) : []; }
  function splitLines(text) { var a = text.split(/\r?\n/); if (a.length && a[a.length - 1] === "") a.pop(); return a; }
  function isAutosome(chr) { return chr >= 1 && chr <= 22; }

  function PlinkExit(code) { this.code = code; }

  function bytesToText(d) {
    if (typeof d === "string") return d;
    if (typeof TextDecoder !== "undefined") return new TextDecoder("utf-8").decode(d);
    var s = ""; for (var i = 0; i < d.length; i++) s += String.fromCharCode(d[i]); return s;
  }
  function textToBytes(d) {
    if (typeof d !== "string") return d;
    var b = new Uint8Array(d.length); for (var i = 0; i < d.length; i++) b[i] = d.charCodeAt(i) & 255; return b;
  }

  /* C strtod-like prefix parse (PLINK's scan_double accepts trailing text); strict version rejects it. */
  var NUM_PREFIX = /^\s*[+-]?(?:(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?|inf(?:inity)?|nan)/i;
  function scanDouble(s) {
    var m = NUM_PREFIX.exec(s); if (!m) return null;
    var t = m[0].trim().toLowerCase().replace(/^\+/, "");
    if (/inf/.test(t)) return t.charAt(0) === "-" ? -Infinity : Infinity;
    if (/nan/.test(t)) return NaN;
    return parseFloat(t);
  }
  function scanDoubleStrict(s) { var m = NUM_PREFIX.exec(s); if (!m || m[0].length !== s.length) return null; return scanDouble(s); }
  /* scan_posint_defcap: positive integer prefix (trailing text allowed). */
  function scanPosint(s, strict) {
    var m = /^\+?(\d+)/.exec(s); if (!m) return null;
    if (strict && m[0].length !== s.length) return null;
    var v = parseInt(m[1], 10); if (!(v > 0) || v > 2147483646) return null; return v;
  }

  /* ---- PLINK 1.9 number formatting (dtoa_g, dtoa_g_wxp4, dtoa_f_w7p4, dtoa_f_w9p6) ----
     Digits are produced with banker's rounding judged with a small tolerance, which is what makes
     PLINK print 0.5 as 0.5 and 2.5e-05 as 2.5e-05 rather than 2.50001e-05. */
  function bround(x, d) { var r = Math.trunc(x); return r + Math.trunc((x - r) + ((r & 1) ? 0.5 + d : 0.5 - d)); }
  function digitsNoTrail(u, nd) { var s = String(u); while (s.length < nd) s = "0" + s; return s.replace(/0+$/, ""); }
  function qrtoa(q, r, nd) { return r ? q + "." + digitsNoTrail(r, nd) : String(q); }
  var POW10 = [1, 10, 100, 1000, 10000, 100000, 1000000];
  var T4 = thresholds("9.9994999999999"), T6 = thresholds("9.9999949999999");
  function thresholds(m) {
    var t = {}; [-256, -128, -64, -32, -16, -8, -5, -4, -3, -2, -1, 0, 1, 3, 7, 15, 31, 63, 127, 255].forEach(function (e) { t[e] = parseFloat(m + "e" + e); });
    return t;
  }
  function expScaleSmall(x, T) {
    var xp = 0;
    if (x < T[-16]) {
      if (x < T[-128]) { if (x < T[-256]) { x *= 1e256; xp |= 256; } else { x *= 1e128; xp |= 128; } }
      if (x < T[-64]) { x *= 1e64; xp |= 64; }
      if (x < T[-32]) { x *= 1e32; xp |= 32; }
      if (x < T[-16]) { x *= 1e16; xp |= 16; }
    }
    if (x < T[-8]) { x *= 1e8; xp |= 8; }
    if (x < T[-4]) { x *= 1e4; xp |= 4; }
    if (x < T[-2]) { x *= 100; xp |= 2; }
    if (x < T[-1]) { x *= 10; xp++; }
    return [x, xp];
  }
  function expScaleLarge(x, T) {
    var xp = 0;
    if (x >= T[15]) {
      if (x >= T[127]) { if (x >= T[255]) { x *= 1e-256; xp |= 256; } else { x *= 1e-128; xp |= 128; } }
      if (x >= T[63]) { x *= 1e-64; xp |= 64; }
      if (x >= T[31]) { x *= 1e-32; xp |= 32; }
      if (x >= T[15]) { x *= 1e-16; xp |= 16; }
    }
    if (x >= T[7]) { x *= 1e-8; xp |= 8; }
    if (x >= T[3]) { x *= 1e-4; xp |= 4; }
    if (x >= T[1]) { x *= 1e-2; xp |= 2; }
    if (x >= T[0]) { x *= 1e-1; xp++; }
    return [x, xp];
  }
  function expDigits(xp) { var s = ""; if (xp >= 100) { s = String(Math.floor(xp / 100)); xp %= 100; } return s + (xp < 10 ? "0" : "") + xp; }
  /* significant digits of x in [~1, 10^sig): sig 4 or 6 */
  function sigDigits(x, sig, d) {
    var dec;
    if (sig === 4) dec = x < 9.9994999999999 ? 3 : x < 99.994999999999 ? 2 : x < 999.94999999999 ? 1 : 0;
    else dec = x < 9.9999949999999 ? 5 : x < 99.999949999999 ? 4 : x < 999.99949999999 ? 3 : x < 9999.9949999999 ? 2 : x < 99999.949999999 ? 1 : 0;
    var u = bround(dec ? x * POW10[dec] : x, d);
    if (!dec) return String(u);
    var q = Math.floor(u / POW10[dec]);
    return qrtoa(q, u - q * POW10[dec], dec);
  }
  /* dtoa_g: 6 significant digits, like C's %g. */
  function g6(x) {
    if (x !== x) return "nan";
    var s = "";
    if (x < 0) { s = "-"; x = -x; }
    if (x < 9.9999949999999e-5) {
      if (x === 0) return "0";
      var a = expScaleSmall(x, T6), u = bround(a[0] * 100000, 5e-9), q = Math.floor(u / 100000);
      return s + qrtoa(q, u - q * 100000, 5) + "e-" + expDigits(a[1]);
    }
    if (x >= 999999.49999999) {
      if (x === Infinity) return s + "inf";
      var b = expScaleLarge(x, T6), v = bround(b[0] * 100000, 5e-9), q2 = Math.floor(v / 100000);
      return s + qrtoa(q2, v - q2 * 100000, 5) + "e+" + expDigits(b[1]);
    }
    if (x >= 0.99999949999999) return s + sigDigits(x, 6, 5e-9);
    var t = "0.";
    if (x < 9.9999949999999e-3) { x *= 100; t += "00"; }
    if (x < 9.9999949999999e-2) { x *= 10; t += "0"; }
    return s + t + digitsNoTrail(bround(x * 1000000, 5e-9), 6);
  }
  /* dtoa_g_wxp4: 4 significant digits, right-aligned in at least w characters. */
  function g4(x, w) {
    var out;
    if (x !== x) out = "nan";
    else {
      var s = "";
      if (x < 0) { s = "-"; x = -x; }
      if (x < 9.9994999999999e-5) {
        if (x === 0) out = "0";
        else {
          var a = expScaleSmall(x, T4), u = bround(a[0] * 1000, 5e-11), q = Math.floor(u / 1000);
          out = s + qrtoa(q, u - q * 1000, 3) + "e-" + expDigits(a[1]);
        }
      } else if (x >= 9999.4999999999) {
        if (x === Infinity) out = s ? "-inf" : " inf";
        else {
          var b = expScaleLarge(x, T4), v = bround(b[0] * 1000, 5e-11), q2 = Math.floor(v / 1000);
          out = s + qrtoa(q2, v - q2 * 1000, 3) + "e+" + expDigits(b[1]);
        }
      } else if (x >= 0.99994999999999) out = s + sigDigits(x, 4, 5e-11);
      else {
        var t = "0.";
        if (x < 9.9994999999999e-3) { x *= 100; t += "00"; }
        if (x < 9.9994999999999e-2) { x *= 10; t += "0"; }
        out = s + t + digitsNoTrail(bround(x * 10000, 5e-11), 4);
      }
    }
    return padL(out, w || 0);
  }
  function pad4(r) { return (r < 10 ? "000" : r < 100 ? "00" : r < 1000 ? "0" : "") + r; }
  function pad6(r) { var s = String(r); while (s.length < 6) s = "0" + s; return s; }
  /* dtoa_f_w7p4: fixed, 4 decimals, width 7 for |x| < 10. */
  function f7p4(x) {
    if (x !== x) return "    nan";
    var s;
    if (x < 9.9999499999999) {
      if (x < 0) { s = "-"; x = -x; if (x >= 9.9999499999999) return s + f4big(x); } else s = " ";
      var u = bround(x * 10000, 5e-10), q = Math.floor(u / 10000);
      return s + q + "." + pad4(u - q * 10000);
    }
    return f4big(x);
  }
  function f4big(x) {
    if (x < 99999.999949999) {
      var d = x < 999.99994999999 ? (x < 99.999949999999 ? 5e-9 : 5e-8) : (x < 9999.9999499999 ? 5e-7 : 5e-6);
      var u = bround(x * 10000, d), q = Math.floor(u / 10000);
      return q + "." + pad4(u - q * 10000);
    }
    if (x === Infinity) return "    inf";
    return x.toFixed(4);
  }
  /* dtoa_f_w9p6: fixed, 6 decimals, width 9 for |x| < 10. */
  function f9p6(x) {
    if (x !== x) return "      nan";
    var s;
    if (x < 9.9999994999999) {
      if (x < 0) { s = "-"; x = -x; if (x >= 9.9999994999999) return s + f6big(x); } else s = " ";
      var u = bround(x * 1000000, 5e-8), q = Math.floor(u / 1000000);
      return s + q + "." + pad6(u - q * 1000000);
    }
    return f6big(x);
  }
  function f6big(x) {
    if (x < 999.99999949999) {
      var u = bround(x * 1000000, x < 99.999999499999 ? 5e-7 : 5e-6), q = Math.floor(u / 1000000);
      return q + "." + pad6(u - q * 1000000);
    }
    if (x === Infinity) return "      inf";
    return x.toFixed(6);
  }
  /* C printf("%g") (and "%.<prec>g"): used where PLINK calls printf rather than its own routines. */
  function cG(x, prec) {
    prec = prec || 6;
    if (x !== x) return "nan";
    if (x === Infinity) return "inf";
    if (x === -Infinity) return "-inf";
    if (x === 0) return (1 / x < 0) ? "-0" : "0";
    var e = x.toExponential(prec - 1), parts = e.split("e"), xp = parseInt(parts[1], 10);
    if (xp < -4 || xp >= prec) {
      var mant = parts[0].indexOf(".") >= 0 ? parts[0].replace(/0+$/, "").replace(/\.$/, "") : parts[0];
      var ax = Math.abs(xp);
      return mant + "e" + (xp < 0 ? "-" : "+") + (ax < 10 ? "0" : "") + ax;
    }
    var f = x.toFixed(prec - 1 - xp);
    if (f.indexOf(".") >= 0) f = f.replace(/0+$/, "").replace(/\.$/, "");
    return f;
  }

  /* PLINK wraps its long log messages for 80-column terminals by turning spaces into newlines. The
     message ends in "\n" (suffixLen 0) or, for "... done." messages, in a space with suffixLen 5
     reserved for the "done." that follows. Runs of spaces are never collapsed. */
  function wordwrap(s, suffixLen) {
    var a = s.split(""), n = a.length, ts = 0, le = 79, te;
    for (;;) {
      while (ts < n && a[ts] === " ") ts++;
      while (ts > le) { a[le] = "\n"; le += 80; }
      te = a.indexOf(" ", ts);
      if (te < 0) {
        if (ts + 79 === le) return a.join("");
        te = n;
        if (!suffixLen) { if (te <= le + 1) return a.join(""); }
        else if (te + suffixLen <= le) return a.join("");
        a[ts - 1] = "\n";
        return a.join("");
      }
      if (te > le) {
        if (ts + 79 !== le) {
          a[ts - 1] = "\n"; le = ts + 79;
          if (te > le) { a[te] = "\n"; le = te + 80; }
        } else { a[te] = "\n"; le = te + 80; }
      }
      ts = te + 1;
    }
  }

  /* Natural ("human") string order used for merged sample lists: digit runs compare as numbers,
     letters compare case-insensitively with lower case breaking ties (PLINK's strcmp_natural). */
  function natCompare(a, b) {
    var s1 = codesOf(a), s2 = codesOf(b);
    return natMain(s1, s2);
  }
  function codesOf(s) { var c = new Array(s.length + 1); for (var i = 0; i < s.length; i++) c[i] = s.charCodeAt(i); c[s.length] = 0; return c; }
  function isDig(c) { return c >= 48 && c <= 57; }
  function isNz(c) { return c >= 49 && c <= 57; }
  function isLow(c) { return c >= 97 && c <= 122; }
  function natForward(s1, i, s2, j) { var c1, c2; do { c1 = s1[++i]; c2 = s2[++j]; if (!isDig(c1)) return -1; } while (isDig(c2)); return 1; }
  function natNumber(s1, i, s2, j, c1, c2, state) {
    // both strings are inside digit runs that agree so far; returns [result or null, i, j, c1, c2]
    do {
      if (c1 !== c2) {
        if (isDig(c2)) return [c1 < c2 ? natForward(s1, i, s2, j) : -natForward(s2, j, s1, i)];
        return [1];
      }
      c1 = s1[++i]; c2 = s2[++j];
    } while (isDig(c1));
    if (isDig(c2)) return [-1];
    return [null, i, j, c1, c2];
  }
  function natTiebroken(s1, i, s2, j) {
    var c1 = s1[++i], c2 = s2[++j], skip = false;
    for (;;) {
      while (skip || (!isNz(c1) && !isNz(c2))) {
        skip = false;
        if (c1 !== c2) {
          var d1 = isLow(c1) ? c1 - 32 : c1, d2 = isLow(c2) ? c2 - 32 : c2;
          if (d1 < d2) return -1;
          if (d1 > d2) return 1;
        } else if (!c1) return -1;
        c1 = s1[++i]; c2 = s2[++j];
      }
      if (!isNz(c1) || !isNz(c2)) return c1 < c2 ? -1 : 1;
      var r = natNumber(s1, i, s2, j, c1, c2);
      if (r[0] !== null) return r[0];
      i = r[1]; j = r[2]; c1 = r[3]; c2 = r[4]; skip = true;
    }
  }
  function natMain(s1, s2) {
    var i = 0, j = 0, c1 = s1[0], c2 = s2[0], skip = false;
    for (;;) {
      while (skip || (!isNz(c1) && !isNz(c2))) {
        skip = false;
        if (c1 !== c2) {
          if (isLow(c1)) {
            if (c2 + 32 === c1) return -natTiebroken(s2, j, s1, i);
            else if (!isLow(c2)) c1 -= 32;
          } else if (isLow(c2)) {
            c2 -= 32;
            if (c1 === c2) return natTiebroken(s1, i, s2, j);
          }
          return c1 < c2 ? -1 : 1;
        } else if (!c1) return 0;
        c1 = s1[++i]; c2 = s2[++j];
      }
      if (!isNz(c1) || !isNz(c2)) return c1 < c2 ? -1 : 1;
      var r = natNumber(s1, i, s2, j, c1, c2);
      if (r[0] !== null) return r[0];
      i = r[1]; j = r[2]; c1 = r[3]; c2 = r[4]; skip = true;
    }
  }
  function strcmp(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function ctime(ms) {
    var d = new Date(ms), two = function (v) { return (v < 10 ? "0" : "") + v; };
    var day = d.getDate();
    return DAYS[d.getDay()] + " " + MONTHS[d.getMonth()] + " " + (day < 10 ? " " : "") + day + " " +
      two(d.getHours()) + ":" + two(d.getMinutes()) + ":" + two(d.getSeconds()) + " " + d.getFullYear() + "\n";
  }

  /* ====================================================================================
     3. Filesets: parsing and writing .bed/.bim/.fam
     ==================================================================================== */
  var BED_LUT = [2, -1, 1, 0];          // 2-bit code -> number of A1 alleles (-1 = missing)
  var BED_CODE = [1, 3, 2, 0];          // A1 count + 1 -> 2-bit code

  function chromCode(tok) {
    var t = String(tok), u = t.toUpperCase();
    if (u.indexOf("CHR") === 0) { t = t.slice(3); u = u.slice(3); }
    if (/^\d+$/.test(t)) { var v = parseInt(t, 10); return v <= 26 ? v : -1; }
    if (u === "X") return 23; if (u === "Y") return 24; if (u === "XY") return 25; if (u === "M" || u === "MT") return 26;
    return -1;
  }

  /* Parse .bim text -> {snps} or {error: message (PLINK wording)} */
  function parseBim(text) {
    var lines = splitLines(text), snps = [];
    for (var k = 0; k < lines.length; k++) {
      var line = lines[k], t = splitTokens(line);
      if (!t.length || t[0].charAt(0) === "#") continue;
      if (t.length < 6) return { error: "Error: Line " + (k + 1) + " of .bim file has fewer tokens than expected.\n" };
      var chr = chromCode(t[0]);
      if (chr < 0) return { error: "Error: Invalid chromosome code '" + t[0] + "' on line " + (k + 1) + " of .bim file.\n(Use --allow-extra-chr to force it to be accepted.)\n", ww: true };
      snps.push({ chr: chr, id: t[1], cm: parseFloat(t[2]) || 0, bp: parseInt(t[3], 10), a1: t[4], a2: t[5] });
    }
    return { snps: snps };
  }
  /* Parse .fam text -> {samples, phenoType} or {error} */
  function parseFam(text) {
    var lines = splitLines(text), samples = [], qt = false, raw = [];
    for (var k = 0; k < lines.length; k++) {
      var t = splitTokens(lines[k]);
      if (!t.length) continue;
      if (t.length < 6) return { error: "Error: Line " + (k + 1) + " of .fam file has fewer tokens than expected.\n" };
      var sex = t[4] === "1" ? 1 : t[4] === "2" ? 2 : 0;
      samples.push({ fid: t[0], iid: t[1], pat: t[2], mat: t[3], sex: sex, phen: -9 });
      raw.push(t[5]);
      var v = scanDoubleStrict(t[5]);
      if (v !== null && v === v && v !== -9 && v !== 0 && v !== 1 && v !== 2) qt = true;
    }
    for (var i = 0; i < samples.length; i++) {
      var x = scanDoubleStrict(raw[i]);
      if (qt) samples[i].phen = (x === null || x !== x || x === -9) ? -9 : x;
      else samples[i].phen = (x === 1 || x === 2) ? x : -9;
    }
    return { samples: samples, phenoType: qt ? "qt" : "cc" };
  }
  function decodeBed(bytes, n, m) {
    var bpr = (n + 3) >> 2, geno = new Int8Array(n * m);
    for (var j = 0; j < m; j++) {
      var base = j * n, p = 3 + j * bpr;
      for (var i = 0; i < n; i++) geno[base + i] = BED_LUT[(bytes[p + (i >> 2)] >> ((i & 3) << 1)) & 3];
    }
    return geno;
  }
  function encodeBed(geno, n, m, flipMask) {
    var bpr = (n + 3) >> 2, out = new Uint8Array(3 + bpr * m);
    out[0] = 0x6c; out[1] = 0x1b; out[2] = 0x01;
    for (var j = 0; j < m; j++) {
      var base = j * n, p = 3 + j * bpr, fl = flipMask && flipMask[j];
      for (var i = 0; i < n; i++) {
        var g = geno[base + i];
        if (fl && g >= 0) g = 2 - g;
        out[p + (i >> 2)] |= BED_CODE[g + 1] << ((i & 3) << 1);
      }
    }
    return out;
  }
  function famLine(s, phenoType) {
    var ph = s.phen === -9 ? "-9" : (phenoType === "qt" ? g6(s.phen) : String(s.phen));
    return s.fid + " " + s.iid + " " + s.pat + " " + s.mat + " " + s.sex + " " + ph + "\n";
  }
  function cmText(cm) { return cm === 0 ? "0" : cG(cm, 8); }
  function bimLine(snp, swap) {
    return snp.chr + "\t" + snp.id + "\t" + cmText(snp.cm) + "\t" + snp.bp + "\t" + (swap ? snp.a2 + "\t" + snp.a1 : snp.a1 + "\t" + snp.a2) + "\n";
  }

  /* Public: Dataset from file contents (throws Error with PLINK's message on bad input). */
  function readBfile(bedBytes, bimText, famText) {
    var b = parseBim(bytesToText(bimText)); if (b.error) throw new Error(b.error.trim());
    var f = parseFam(bytesToText(famText)); if (f.error) throw new Error(f.error.trim());
    var bytes = textToBytes(bedBytes), n = f.samples.length, m = b.snps.length;
    var msg = checkBed(bytes, n, m); if (msg) throw new Error(msg.trim());
    return { samples: f.samples, snps: b.snps, n: n, m: m, geno: decodeBed(bytes, n, m), phenoType: f.phenoType };
  }
  function checkBed(bytes, n, m) {
    if (!bytes || !bytes.length) return "Error: Empty .bed file.\n";
    var expect = 3 + ((n + 3) >> 2) * m;
    if (bytes.length < 3 || bytes[0] !== 0x6c || bytes[1] !== 0x1b) return "Error: Invalid .bed file (missing PLINK 1 magic number).\n";
    if (bytes[2] !== 0x01) return "Error: This lab emulator reads only variant-major .bed files.\n";
    if (bytes.length !== expect) return "Error: Invalid .bed file size (expected " + expect + " bytes).\n";
    return null;
  }
  /* Public: file contents from a Dataset (A1 = snps[j].a1, as in the Dataset). */
  function writeBfile(ds) {
    var bim = "", fam = "";
    for (var j = 0; j < ds.m; j++) bim += bimLine(ds.snps[j], false);
    for (var i = 0; i < ds.n; i++) fam += famLine(ds.samples[i], ds.phenoType);
    return { bed: encodeBed(ds.geno, ds.n, ds.m, null), bim: bim, fam: fam };
  }
  function subsetDataset(ds, sIdx, mIdx) {
    var n = sIdx ? sIdx.length : ds.n, m = mIdx ? mIdx.length : ds.m, geno = new Int8Array(n * m);
    for (var jj = 0; jj < m; jj++) {
      var j = mIdx ? mIdx[jj] : jj, src = j * ds.n, dst = jj * n;
      if (sIdx) { for (var ii = 0; ii < n; ii++) geno[dst + ii] = ds.geno[src + sIdx[ii]]; }
      else geno.set(ds.geno.subarray(src, src + n), dst);
    }
    var snps = [], samples = [];
    for (jj = 0; jj < m; jj++) { var s = ds.snps[mIdx ? mIdx[jj] : jj]; snps.push({ chr: s.chr, id: s.id, cm: s.cm, bp: s.bp, a1: s.a1, a2: s.a2 }); }
    for (var k = 0; k < n; k++) samples.push(ds.samples[sIdx ? sIdx[k] : k]);
    return { samples: samples, snps: snps, n: n, m: m, geno: geno, phenoType: ds.phenoType };
  }

  /* ====================================================================================
     4. Statistics (pure functions on Datasets; exported as PlinkCore.stats)
     ==================================================================================== */
  function founderMask(ds) {
    var f = new Uint8Array(ds.n);
    for (var i = 0; i < ds.n; i++) f[i] = (ds.samples[i].pat === "0" && ds.samples[i].mat === "0") ? 1 : 0;
    return f;
  }
  function allMask(n) { var f = new Uint8Array(n); f.fill(1); return f; }

  /* Exact test of Hardy-Weinberg equilibrium (Wigginton, Cutler & Abecasis 2005, AJHG 76:887) with
     PLINK 1.9's conventions: the p-value is the total probability of heterozygote counts no more
     likely than the observed one; a configuration whose probability matches the observed one to
     within rounding counts as a tie, and the mid-p version subtracts half the probability of the
     observed configuration and its ties (Graffelman & Moreno 2013). The walk starts at the observed
     count, so very small p-values do not underflow. Monomorphic or empty input gives 1 (0.5 mid-p). */
  function hweExact(hets, hom1, hom2, midp) {
    var homc = Math.max(hom1, hom2), homr = Math.min(hom1, hom2);
    var rare = 2 * homr + hets, alleles = 2 * (hets + homc + homr);
    if (!alleles) return midp ? 0.5 : 1;
    var base = EXACT_TEST_BIAS;                 // the comparison point
    var start = (1 - SMALL_EPSILON) * base;     // probability of the observed table, rescaled: just below
                                                // base, so that an exact tie lands in the tail (SNPHWE2)
    var tail = start, center = 0, ties = 1;
    var h, r, c, p, prev;
    var excess = hets * alleles > rare * (alleles - rare);   // more hets than expected?
    if (excess) {
      // towards fewer heterozygotes (the more likely side first)
      h = hets; r = homr; c = homc; p = start;
      while (h > 1.5) {
        r += 1; c += 1; p *= (h * (h - 1)) / (4 * r * c); h -= 2;
        if (p < base) { if (p > (1 - 2 * SMALL_EPSILON) * base) ties++; tail += p; break; }
        center += p;
        if (center === Infinity) return 0;
      }
      if (center === 0 && !midp) return 1;
      while (h > 1.5) { r += 1; c += 1; p *= (h * (h - 1)) / (4 * r * c); h -= 2; prev = tail; tail += p; if (tail <= prev) break; }
      // towards more heterozygotes (all less likely than observed)
      h = hets + 2; r = homr; c = homc; p = start;
      while (r > 0.5) { p *= (4 * r * c) / (h * (h - 1)); prev = tail; tail += p; if (tail <= prev) break; h += 2; r -= 1; c -= 1; }
    } else {
      h = hets; r = homr; c = homc; p = start;
      while (r > 0.5) {
        h += 2; p *= (4 * r * c) / (h * (h - 1)); r -= 1; c -= 1;
        if (p < base) { if (p > (1 - 2 * SMALL_EPSILON) * base) ties++; tail += p; break; }
        center += p;
        if (center === Infinity) return 0;
      }
      if (center === 0 && !midp) return 1;
      while (r > 0.5) { h += 2; p *= (4 * r * c) / (h * (h - 1)); r -= 1; c -= 1; prev = tail; tail += p; if (tail <= prev) break; }
      h = hets; r = homr; c = homc; p = start;
      while (h > 1.5) { r += 1; c += 1; p *= (h * (h - 1)) / (4 * r * c); prev = tail; tail += p; if (tail <= prev) break; h -= 2; }
    }
    if (!midp) return tail / (tail + center);
    return (tail - ((1 - SMALL_EPSILON) * base * 0.5) * ties) / (tail + center);
  }

  /* Genotype counts at SNP j over samples with mask[i] = 1: [hom A1 (2 copies), het, hom A2, missing]. */
  function genoCounts(ds, j, mask) {
    var a = 0, h = 0, b = 0, z = 0, base = j * ds.n;
    for (var i = 0; i < ds.n; i++) {
      if (mask && !mask[i]) continue;
      var g = ds.geno[base + i];
      if (g === 2) a++; else if (g === 1) h++; else if (g === 0) b++; else z++;
    }
    return [a, h, b, z];
  }
  /* Allele frequencies among founders (or all samples with opts.nonfounders): a2[j] is the frequency
     of snps[j].a2 (0.5 with no observations), nobs[j] the number of observed alleles. */
  function alleleFreq(ds, opts) {
    opts = opts || {};
    var mask = opts.mask || (opts.nonfounders ? allMask(ds.n) : founderMask(ds));
    var a2 = new Float64Array(ds.m), nobs = new Int32Array(ds.m);
    for (var j = 0; j < ds.m; j++) {
      var c = genoCounts(ds, j, mask), tot = 2 * (c[0] + c[1] + c[2]);
      nobs[j] = tot;
      a2[j] = tot ? (2 * c[2] + c[1]) / tot : 0.5;
    }
    return { a2: a2, nobs: nobs };
  }
  function mafOf(a2) { return a2 < 0.5 ? a2 : 1 - a2; }
  /* Missing-call counts per SNP and per sample. */
  function missingCounts(ds) {
    var snp = new Int32Array(ds.m), smp = new Int32Array(ds.n);
    for (var j = 0; j < ds.m; j++) {
      var base = j * ds.n;
      for (var i = 0; i < ds.n; i++) if (ds.geno[base + i] < 0) { snp[j]++; smp[i]++; }
    }
    return { snp: snp, sample: smp };
  }
  /* Hardy-Weinberg statistics for one group of samples: counts in file orientation
     ([homA1, het, homA2]), observed and expected heterozygosity, exact-test p-value. */
  function hardyStats(c, midp) {
    var ll = c[0], lh = c[1], hh = c[2], denom = 2 * (ll + lh + hh), o = NaN, e = NaN;
    if (denom) {
      var rc = 1 / denom, minor = (2 * ll + lh) * rc;
      o = (lh * 2) * rc;
      e = minor * (2 * hh + lh) * rc * 2;
    }
    return { counts: [ll, lh, hh], oHet: o, eHet: e, p: denom ? hweExact(lh, ll, hh, midp) : (midp ? 0.5 : 1) };
  }
  /* --hardy rows: groups ALL (all founders), AFF (founder cases) and UNAFF (founder controls) for
     case/control data; ALL(NP) without phenotypes; ALL(QT) for a quantitative phenotype. */
  function hardy(ds, opts) {
    opts = opts || {};
    var fm = opts.nonfounders ? allMask(ds.n) : founderMask(ds), groups = [];
    var anyPheno = ds.samples.some(function (s) { return s.phen !== -9; });
    if (!anyPheno) groups.push({ test: "ALL(NP)", mask: fm });
    else if (ds.phenoType === "qt") groups.push({ test: "ALL(QT)", mask: fm });
    else {
      var aff = new Uint8Array(ds.n), un = new Uint8Array(ds.n);
      for (var i = 0; i < ds.n; i++) { if (fm[i] && ds.samples[i].phen === 2) aff[i] = 1; if (fm[i] && ds.samples[i].phen === 1) un[i] = 1; }
      groups.push({ test: "ALL", mask: fm }, { test: "AFF", mask: aff }, { test: "UNAFF", mask: un });
    }
    var rows = [];
    for (var j = 0; j < ds.m; j++) for (var g = 0; g < groups.length; g++) {
      var st = hardyStats(genoCounts(ds, j, groups[g].mask), !!opts.midp);
      rows.push({ snp: j, test: groups[g].test, counts: st.counts, oHet: st.oHet, eHet: st.eHet, p: st.p });
    }
    return rows;
  }

  /* Squared correlation of allele counts at SNPs j and k over samples in mask that are non-missing at
     both (the r^2 that --indep-pairwise uses). NaN when either SNP is constant on those samples. */
  function r2(ds, j, k, mask) {
    var n = ds.n, bj = j * n, bk = k * n, N = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
    for (var i = 0; i < n; i++) {
      if (mask && !mask[i]) continue;
      var x = ds.geno[bj + i], y = ds.geno[bk + i];
      if (x < 0 || y < 0) continue;
      N++; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y;
    }
    var cov = N * sxy - sx * sy, vx = N * sxx - sx * sx, vy = N * syy - sy * sy;
    return (cov * cov) / (vx * vy);
  }

  /* --indep-pairwise W[kb] S r2: within each window of W variants (or W kb), while some pair has
     r^2 > threshold, drop the variant with the lower MAF (the later one on ties); then slide by S
     variants. Variants with zero variance among founders are dropped too. Runs per chromosome over
     contiguous blocks of the input order. Returns pruned flags and per-chromosome counts. */
  function indepPairwise(ds, opts) {
    var W = opts.window, S = opts.step, thr = opts.r2 * (1 + SMALL_EPSILON), kb = !!opts.kb;
    var fm = opts.mask || (opts.nonfounders ? allMask(ds.n) : founderMask(ds));
    var a2 = opts.freqA2 || alleleFreq(ds, { mask: fm }).a2;
    var m = ds.m, pruned = new Uint8Array(m), maf = new Float64Array(m), perChrom = [];
    for (var j = 0; j < m; j++) maf[j] = mafOf(a2[j]);
    var bp = ds.snps.map(function (s) { return s.bp; });
    function zeroVar(v) {
      var n = ds.n, b = v * n, N = 0, s = 0, ss = 0;
      for (var i = 0; i < n; i++) { if (!fm[i]) continue; var g = ds.geno[b + i]; if (g < 0) continue; var x = 1 - g; N++; s += x; ss += x * x; }
      return N * ss - s * s === 0;
    }
    function pairR2(u, v) {
      var n = ds.n, bu = u * n, bv = v * n, N = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
      for (var i = 0; i < n; i++) {
        if (!fm[i]) continue;
        var x = ds.geno[bu + i], y = ds.geno[bv + i];
        if (x < 0 || y < 0) continue;
        x = 1 - x; y = 1 - y; N++; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y;
      }
      var cov = N * sxy - sx * sy;
      return (cov * cov) / ((N * sxx - sx * sx) * (N * syy - sy * sy));
    }
    var cs = 0;
    while (cs < m) {
      var ce = cs + 1; while (ce < m && ds.snps[ce].chr === ds.snps[cs].chr) ce++;
      var excl = 0, start = cs, end = cs + 1, live = [cs], firstCand = [], cur, prevEnd, k, u, ws;
      if (kb) { ws = 1; u = end; while (u < ce && bp[u] <= bp[start] + 1000 * W) { ws++; u++; } } else ws = W;
      for (k = 1; k < ws; k++) { if (end === ce) break; firstCand[k - 1] = end; live[k] = end; end++; }
      cur = k; firstCand[k - 1] = end;
      if (cur > 1) for (var t = 0; t < cur; t++) if (zeroVar(live[t])) { pruned[live[t]] = 1; excl++; }
      while (start < ce || cur > 1) {
        if (cur > 1) {
          var changed;
          do {
            changed = false;
            for (var a = 0; a < cur - 1; a++) {
              if (pruned[live[a]]) continue;
              var b = a + 1;
              while (live[b] < firstCand[a]) { if (++b === cur) break; }
              for (; b < cur; b++) {
                if (pruned[live[b]]) continue;
                if (pairR2(live[a], live[b]) > thr) {
                  changed = true; excl++;
                  if (maf[live[a]] < (1 - SMALL_EPSILON) * maf[live[b]]) pruned[live[a]] = 1;
                  else {
                    pruned[live[b]] = 1; b++;
                    while (b < cur) { if (!pruned[live[b]]) break; b++; }
                    if (b < cur) firstCand[a] = live[b];
                  }
                  break;
                }
              }
              if (b === cur) firstCand[a] = end;
            }
          } while (changed);
        }
        for (k = 0; k < S; k++) { if (start === ce) break; start++; }
        if (start === ce) break;
        if (end < start) end = start;
        var w = 0, jj = 0;
        while (jj < cur && live[jj] < start) jj++;
        for (; jj < cur; jj++) { if (pruned[live[jj]]) continue; live[w] = live[jj]; firstCand[w] = firstCand[jj]; w++; }
        cur = w; prevEnd = w;
        var add;
        if (kb) { add = 0; u = end; while (u < ce && bp[u] <= bp[start] + 1000 * W) { add++; u++; } } else add = S;
        for (k = 0; k < add; k++) {
          if (end === ce) break;
          live[cur] = end;
          if (cur > prevEnd) firstCand[cur - 1] = end;
          if (zeroVar(end)) { pruned[end] = 1; excl++; }
          cur++; end++;
        }
        if (cur > prevEnd) firstCand[cur - 1] = end;
      }
      perChrom.push({ chr: ds.snps[cs].chr, pruned: excl, left: ce - cs - excl });
      cs = ce;
    }
    return { pruned: pruned, perChrom: perChrom };
  }

  /* --genome: identity by state per pair and the method-of-moments IBD estimates of Purcell et al.
     (2007, AJHG 81:559), with PLINK 1.9's expected-IBS terms (founder allele frequencies with a
     finite-sample correction), clamping, PPC and DST. Autosomal SNPs only. */
  function normdist(z) {      // normal CDF approximation used by PLINK (Abramowitz & Stegun 26.2.17)
    var t0 = 1 / (1 + 0.2316419 * Math.abs(z)), z1 = Math.exp(-0.5 * z * z) / 2.50662827463;
    var p0 = z1 * t0 * (0.31938153 + t0 * (-0.356563782 + t0 * (1.781477937 + t0 * (-1.821255978 + 1.330274429 * t0))));
    return z >= 0 ? 1 - p0 : p0;
  }
  function genomeExpectations(ds, auto, fm, a2) {
    var e00 = 0, e01 = 0, e02 = 0, e11 = 0, e12 = 0, cnt = 0;
    for (var q = 0; q < auto.length; q++) {
      var j = auto[q], c = genoCounts(ds, j, fm), na = 2 * (c[0] + c[1] + c[2]);
      var dpp = a2[j], dqq = 1.0 - dpp;
      if (na > 3 && dpp > 0 && dqq > 0) {
        var f2 = na * na / ((na - 1) * (na - 2)), f3 = f2 * na / (na - 3);
        var dxx = dpp * na, dyy = dqq * na, rx = 1.0 / dxx, ry = 1.0 / dyy, p2 = dpp * dpp, q2 = dqq * dqq;
        var x1 = (dxx - 1) * rx, x2 = x1 * (dxx - 2) * rx, y1 = (dyy - 1) * ry, y2 = y1 * (dyy - 2) * ry;
        e00 += 2 * p2 * q2 * x1 * y1 * f3;
        e01 += 4 * dpp * dqq * f3 * (p2 * x2 + q2 * y2);
        e02 += f3 * (q2 * q2 * y2 * (dyy - 3) * ry + p2 * p2 * x2 * (dxx - 3) * rx + 4 * p2 * q2 * x1 * y1);
        e11 += 2 * dpp * dqq * f2 * (dpp * x1 + dqq * y1);
        e12 += f2 * (p2 * dpp * x2 + q2 * dqq * y2 + p2 * dqq * x1 + dpp * q2 * y1);
        cnt++;
      }
    }
    var r = 1.0 / cnt;
    return { e00: e00 * r, e01: e01 * r, e02: e02 * r, e11: e11 * r, e12: e12 * r, markers: cnt };
  }
  /* bit helpers for --genome: genotypes of one sample packed 32 SNPs per word in three bit planes */
  function popcount32(x) {
    x = x - ((x >>> 1) & 0x55555555);
    x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
    return Math.imul((x + (x >>> 4)) & 0x0F0F0F0F, 0x01010101) >>> 24;
  }
  function genomePair(P0, P1, P2, a, b, W, lead, E, opts) {
    // P0/P1/P2: bit planes (0, 1 or 2 copies of A1) for all samples, W words per sample
    var oa = a * W, ob = b * W, nn = 0, ibs0 = 0, ibs2 = 0, hethet = 0, homhom = 0, next = 0;
    for (var w = 0; w < W; w++) {
      var a0 = P0[oa + w], a1 = P1[oa + w], a2 = P2[oa + w], b0 = P0[ob + w], b1 = P1[ob + w], b2 = P2[ob + w];
      var nm = (a0 | a1 | a2) & (b0 | b1 | b2);
      if (nm === 0) continue;
      var opp = (a0 & b2) | (a2 & b0), hh = a1 & b1;
      nn += popcount32(nm);
      ibs0 += popcount32(opp);
      ibs2 += popcount32((a0 & b0) | hh | (a2 & b2));
      // HETHET / HOMHOM for PPC: after each counted SNP, skip SNPs closer than 500 kb
      var c = hh | opp;
      if (c === 0) continue;
      var base = w << 5;
      if (next > base) { if (next - base >= 32) continue; c &= (-1 << (next - base)); }
      while (c !== 0) {
        var bit = 31 - Math.clz32(c & -c);
        if (hh & (1 << bit)) hethet++; else homhom++;
        next = lead[base + bit];
        if (next - base >= 32) break;
        c &= (-1 << (next - base));
      }
    }
    var ibs1 = nn - ibs0 - ibs2;
    var z0 = ibs0 / (E.e00 * nn), z1 = (ibs1 - z0 * E.e01 * nn) / (E.e11 * nn), z2 = (ibs2 - nn * (z0 * E.e02 + z1 * E.e12)) / nn, t;
    if (!opts.unbounded) {
      if (z0 > 1) { z0 = 1; z1 = 0; z2 = 0; }
      else if (z1 > 1) { z1 = 1; z0 = 0; z2 = 0; }
      else if (z2 > 1) { z2 = 1; z1 = 0; z0 = 0; }
      else if (z0 < 0) { t = 1.0 / (z1 + z2); z1 *= t; z2 *= t; z0 = 0; }
      if (z1 < 0) { t = 1.0 / (z0 + z2); z0 *= t; z2 *= t; z1 = 0; }
      if (z2 < 0) { t = 1.0 / (z0 + z1); z0 *= t; z1 *= t; z2 = 0; }
    }
    var pihat = z1 * 0.5 + z2;
    var res = { z0: z0, z1: z1, z2: z2, pihat: pihat, ibs0: ibs0, ibs1: ibs1, ibs2: ibs2, hethet: hethet, homhom: homhom, nn: nn };
    if (opts.nudge && pihat * pihat < z2) { res.z0 = (1 - pihat) * (1 - pihat); res.z1 = 2 * pihat * (1 - pihat); res.z2 = pihat * pihat; }
    var dr = 1.0 / (hethet + homhom);
    res.ppc = normdist((hethet * dr - 0.666666) / Math.sqrt(0.2222222 * dr));
    res.dst = 1.0 - (ibs1 + 2 * ibs0) / (2 * nn);
    res.ratio = homhom ? hethet / homhom : NaN;
    return res;
  }
  /* Returns {pairs: [{i, k, z0, z1, z2, pihat, ibs0, ibs1, ibs2, hethet, homhom, nn, ppc, dst, ratio}],
     expected: {e00, e01, e02, e11, e12, markers}, markers}. opts: mask or nonfounders (samples whose
     allele frequencies are used), freqA2, unbounded, nudge, min, max (PI_HAT filter), pairs (optional
     list of [i, k] to compute instead of all pairs). HETHET counts SNPs where both are heterozygous and
     HOMHOM SNPs where they are opposite homozygotes, each time skipping SNPs within 500 kb of the last
     counted one (PLINK's PPC test). */
  function genome(ds, opts) {
    opts = opts || {};
    var fm = opts.mask || (opts.nonfounders ? allMask(ds.n) : founderMask(ds));
    var a2 = opts.freqA2 || alleleFreq(ds, { mask: fm }).a2;
    var auto = []; for (var j = 0; j < ds.m; j++) if (isAutosome(ds.snps[j].chr)) auto.push(j);
    var E = genomeExpectations(ds, auto, fm, a2), m = auto.length, n = ds.n, W = (m + 31) >>> 5;
    var P0 = new Int32Array(n * W), P1 = new Int32Array(n * W), P2 = new Int32Array(n * W), i, q;
    for (q = 0; q < m; q++) {
      var base = auto[q] * n, w = q >>> 5, bit = 1 << (q & 31);
      for (i = 0; i < n; i++) {
        var g = ds.geno[base + i];
        if (g === 0) P0[i * W + w] |= bit; else if (g === 1) P1[i * W + w] |= bit; else if (g === 2) P2[i * W + w] |= bit;
      }
    }
    var lead = new Int32Array(m + 32);
    for (q = 0; q < m; q++) {
      var r = q + 1, sq = ds.snps[auto[q]];
      while (r < m && ds.snps[auto[r]].chr === sq.chr && ds.snps[auto[r]].bp <= sq.bp + 500000) r++;
      lead[q] = r;
    }
    var pairs = [], lo = opts.min != null ? opts.min : -Infinity, hi = opts.max != null ? opts.max : Infinity;
    function one(a, b) {
      var res = genomePair(P0, P1, P2, a, b, W, lead, E, opts);
      if (res.pihat < lo || res.pihat > hi) return;
      res.i = a; res.k = b; pairs.push(res);
    }
    if (opts.pairs) opts.pairs.forEach(function (pr) { one(pr[0], pr[1]); });
    else for (i = 0; i < n - 1; i++) for (var k = i + 1; k < n; k++) one(i, k);
    return { pairs: pairs, expected: E, markers: m };
  }

  /* --het: per sample, observed homozygous genotype count O(HOM), the count expected under HWE given
     the founder allele frequencies E(HOM) = sum over non-missing SNPs of 1 - 2pq, the number of
     non-missing SNPs N(NM), and F = (O - E) / (N - E). Autosomal SNPs that are polymorphic
     (1e-8 < p < 1 - 1e-8) only. small-sample: frequencies and 1 - 2pq with the n/(n-1) correction. */
  function het(ds, opts) {
    opts = opts || {};
    var fm = opts.mask || founderMask(ds), n = ds.n;
    var a2 = opts.freqA2 || alleleFreq(ds, { mask: fm }).a2;
    var hetCt = new Int32Array(n), missCt = new Int32Array(n), neiOff = new Float64Array(n), neiSum = 0, used = 0;
    for (var j = 0; j < ds.m; j++) {
      if (!isAutosome(ds.snps[j].chr)) continue;
      var base = j * n, miss = 0, nei;
      for (var i = 0; i < n; i++) if (ds.geno[base + i] < 0) miss++;
      if (!opts.smallSample) {
        var dpp = a2[j];
        if (!(2 * (n - miss)) || dpp < 1e-8 || dpp > 1 - 1e-8) continue;
        nei = 1.0 - 2 * dpp * (1 - dpp);
      } else {
        var c = genoCounts(ds, j, fm), fobs = 2 * (c[0] + c[1] + c[2]), a2c = 2 * c[2] + c[1];
        if (!fobs || !a2c || a2c === fobs) continue;
        var pp = a2c / fobs;
        nei = 1.0 - 2 * (1 - pp) * a2c / (fobs - 1);
      }
      for (i = 0; i < n; i++) {
        var g = ds.geno[base + i];
        if (g < 0) { missCt[i]++; neiOff[i] += nei; } else if (g === 1) hetCt[i]++;
      }
      neiSum += nei; used++;
    }
    var rows = [];
    for (i = 0; i < n; i++) {
      var obs = used - missCt[i];
      if (!obs) { rows.push({ i: i, ohom: 0, ehom: 0, nnm: 0, f: NaN }); continue; }
      var e = neiSum - neiOff[i], tot = obs - e;
      rows.push({ i: i, ohom: obs - hetCt[i], ehom: e, nnm: obs, f: (tot - hetCt[i]) / tot });
    }
    return { rows: rows, markers: used };
  }

  /* Relationship matrix behind --pca: for samples i != k, the mean over autosomal SNPs non-missing in
     both of (x_i - 2p)(x_k - 2p) / (2p(1-p)), with x the allele count and p the founder frequency
     (monomorphic SNPs add 0 but still count); the diagonal is the mean of (x_i - 2p)^2 / (2p(1-p)) over
     the sample's non-missing SNPs, i.e. 1 + Fhat1, PLINK 1.9.0's default ("plink --help make-rel"; a
     monomorphic SNP adds 0, or infinity for a sample that carries the absent allele, as in
     update_rel_ibc()). Checked against real PLINK 1.9.0 (27 Sep 2026) --make-rel and --pca output.
     monomorphic is true if a monomorphic SNP is present OR the number of autosomal SNPs is not a
     multiple of 20: PLINK 1.9 processes SNPs in windows of 20 and pads the last window with
     frequency-0 entries, which its monomorphic check (fill_subset_weights_r()) also counts, so real
     PLINK prints the "Monomorphic variant(s) present" warning in that case too. Returns {n, matrix
     (row-major Float64Array n*n), monomorphic (bool), allMissing (bool), markers}. */
  function grm(ds, opts) {
    opts = opts || {};
    var fm = opts.mask || founderMask(ds), a2 = opts.freqA2 || alleleFreq(ds, { mask: fm }).a2;
    var n = ds.n, auto = [];
    for (var j = 0; j < ds.m; j++) if (isAutosome(ds.snps[j].chr)) auto.push(j);
    var M = auto.length, Z = new Float64Array(n * M), miss = new Int32Array(n), diag = new Float64Array(n);
    var missLists = [], mono = false;
    for (var q = 0; q < M; q++) {
      j = auto[q];
      var p = a2[j], base = j * n, poly = (p !== 0 && p < 1 - EPSILON), list = null;
      // standardized count of a2 alleles (the choice of allele does not change the matrix)
      var mean = 2 * p, sd = poly ? Math.sqrt(2 * p * (1 - p)) : 0;
      // diagonal weights for x = 0, 1, 2 copies of a2: (x - 2p)^2 / (2p(1-p)), as PLINK computes them
      var w0 = 0, w1 = 0, w2 = 0, monoX = p === 0 ? 0 : 2;
      if (poly) { var mult = 1 / (mean * (1 - p)); w0 = mean * mean * mult; w1 = (1 - mean) * (1 - mean) * mult; w2 = (2 - mean) * (2 - mean) * mult; }
      else mono = true;
      for (var i = 0; i < n; i++) {
        var g = ds.geno[base + i];
        if (g < 0) { miss[i]++; (list || (list = [])).push(i); continue; }
        var x = 2 - g;
        Z[i * M + q] = poly ? (x - mean) / sd : 0;
        diag[i] += poly ? (x === 0 ? w0 : x === 2 ? w2 : w1) : (x === monoX ? 0 : Infinity);
      }
      if (list && list.length > 1) missLists.push(list);
    }
    var both = new Int32Array(n * n);
    missLists.forEach(function (L) { for (var a = 0; a < L.length; a++) for (var b = a + 1; b < L.length; b++) { both[L[a] * n + L[b]]++; } });
    var S = new Float64Array(n * n);
    // cross-products Z Z' in 2 x 2 blocks of samples (same summation order as a plain dot product)
    for (i = 0; i < n; i += 2) {
      var i1 = i + 1, ri = i * M, ri1 = i1 * M, two = i1 < n;
      for (var k = i; k < n; k += 2) {
        var k1 = k + 1, rk = k * M, rk1 = k1 * M, s00 = 0, s01 = 0, s10 = 0, s11 = 0, zi, zi1, zk, zk1;
        if (two && k1 < n) {
          for (q = 0; q < M; q++) {
            zi = Z[ri + q]; zi1 = Z[ri1 + q]; zk = Z[rk + q]; zk1 = Z[rk1 + q];
            s00 += zi * zk; s01 += zi * zk1; s10 += zi1 * zk; s11 += zi1 * zk1;
          }
          S[i * n + k] = s00; S[i * n + k1] = s01; S[i1 * n + k] = s10; S[i1 * n + k1] = s11;
        } else if (two) {        // last column is a single sample
          for (q = 0; q < M; q++) { zk = Z[rk + q]; s00 += Z[ri + q] * zk; s10 += Z[ri1 + q] * zk; }
          S[i * n + k] = s00; S[i1 * n + k] = s10;
        } else if (k1 < n) {     // last row is a single sample
          for (q = 0; q < M; q++) { zi = Z[ri + q]; s00 += zi * Z[rk + q]; s01 += zi * Z[rk1 + q]; }
          S[i * n + k] = s00; S[i * n + k1] = s01;
        } else {
          for (q = 0; q < M; q++) s00 += Z[ri + q] * Z[rk + q];
          S[i * n + k] = s00;
        }
      }
    }
    var A = new Float64Array(n * n), allMissing = false;
    for (i = 0; i < n; i++) {
      var nmI = M - miss[i]; if (!nmI) allMissing = true;
      A[i * n + i] = diag[i] / nmI;
      for (k = i + 1; k < n; k++) {
        var v = S[i * n + k] / (nmI - miss[k] + both[i * n + k]);
        A[i * n + k] = v; A[k * n + i] = v;
      }
    }
    return { n: n, matrix: A, monomorphic: mono || M % 20 !== 0, allMissing: allMissing, markers: M };
  }

  /* Symmetric eigendecomposition (Householder tridiagonalization + implicit QL, as in EISPACK
     tred2/tql2). Returns {values: Float64Array descending, vectors: [Float64Array(n)] unit norm},
     each vector's sign fixed so that its largest-magnitude entry is positive. */
  function eigenSym(Ain, n) {
    var V = new Array(n), d = new Float64Array(n), e = new Float64Array(n), i, j, k, f, g, h, hh, scale;
    for (i = 0; i < n; i++) { V[i] = new Float64Array(n); for (j = 0; j < n; j++) V[i][j] = Ain[i * n + j]; }
    for (j = 0; j < n; j++) d[j] = V[n - 1][j];
    for (i = n - 1; i > 0; i--) {
      scale = 0; h = 0;
      for (k = 0; k < i; k++) scale += Math.abs(d[k]);
      if (scale === 0) {
        e[i] = d[i - 1];
        for (j = 0; j < i; j++) { d[j] = V[i - 1][j]; V[i][j] = 0; V[j][i] = 0; }
      } else {
        for (k = 0; k < i; k++) { d[k] /= scale; h += d[k] * d[k]; }
        f = d[i - 1]; g = Math.sqrt(h); if (f > 0) g = -g;
        e[i] = scale * g; h = h - f * g; d[i - 1] = f - g;
        for (j = 0; j < i; j++) e[j] = 0;
        for (j = 0; j < i; j++) {
          f = d[j]; V[j][i] = f; g = e[j] + V[j][j] * f;
          for (k = j + 1; k <= i - 1; k++) { g += V[k][j] * d[k]; e[k] += V[k][j] * f; }
          e[j] = g;
        }
        f = 0;
        for (j = 0; j < i; j++) { e[j] /= h; f += e[j] * d[j]; }
        hh = f / (h + h);
        for (j = 0; j < i; j++) e[j] -= hh * d[j];
        for (j = 0; j < i; j++) {
          f = d[j]; g = e[j];
          for (k = j; k <= i - 1; k++) V[k][j] -= (f * e[k] + g * d[k]);
          d[j] = V[i - 1][j]; V[i][j] = 0;
        }
      }
      d[i] = h;
    }
    for (i = 0; i < n - 1; i++) {
      V[n - 1][i] = V[i][i]; V[i][i] = 1; h = d[i + 1];
      if (h !== 0) {
        for (k = 0; k <= i; k++) d[k] = V[k][i + 1] / h;
        for (j = 0; j <= i; j++) {
          g = 0;
          for (k = 0; k <= i; k++) g += V[k][i + 1] * V[k][j];
          for (k = 0; k <= i; k++) V[k][j] -= g * d[k];
        }
      }
      for (k = 0; k <= i; k++) V[k][i + 1] = 0;
    }
    for (j = 0; j < n; j++) { d[j] = V[n - 1][j]; V[n - 1][j] = 0; }
    V[n - 1][n - 1] = 1; e[0] = 0;
    // tql2
    for (i = 1; i < n; i++) e[i - 1] = e[i];
    e[n - 1] = 0;
    f = 0; var tst1 = 0, eps = Math.pow(2, -52), l, m, iter, p, r, c, c2, c3, el1, s, s2, dl1;
    for (l = 0; l < n; l++) {
      tst1 = Math.max(tst1, Math.abs(d[l]) + Math.abs(e[l]));
      m = l;
      while (m < n) { if (Math.abs(e[m]) <= eps * tst1) break; m++; }
      if (m > l) {
        iter = 0;
        do {
          iter++;
          g = d[l]; p = (d[l + 1] - g) / (2 * e[l]); r = Math.hypot(p, 1); if (p < 0) r = -r;
          d[l] = e[l] / (p + r); d[l + 1] = e[l] * (p + r); dl1 = d[l + 1]; h = g - d[l];
          for (i = l + 2; i < n; i++) d[i] -= h;
          f += h;
          p = d[m]; c = 1; c2 = c; c3 = c; el1 = e[l + 1]; s = 0; s2 = 0;
          for (i = m - 1; i >= l; i--) {
            c3 = c2; c2 = c; s2 = s; g = c * e[i]; h = c * p; r = Math.hypot(p, e[i]);
            e[i + 1] = s * r; s = e[i] / r; c = p / r; p = c * d[i] - s * g; d[i + 1] = h + s * (c * g + s * d[i]);
            for (k = 0; k < n; k++) { h = V[k][i + 1]; V[k][i + 1] = s * V[k][i] + c * h; V[k][i] = c * V[k][i] - s * h; }
          }
          p = -s * s2 * c3 * el1 * e[l] / dl1; e[l] = s * p; d[l] = c * p;
        } while (Math.abs(e[l]) > eps * tst1 && iter < 60);
      }
      d[l] = d[l] + f; e[l] = 0;
    }
    var order = []; for (i = 0; i < n; i++) order.push(i);
    order.sort(function (a, b) { return d[b] - d[a]; });
    var values = new Float64Array(n), vectors = [];
    for (var t = 0; t < n; t++) {
      var col = order[t], vec = new Float64Array(n), big = 0, bigAbs = -1;
      for (i = 0; i < n; i++) { vec[i] = V[i][col]; if (Math.abs(vec[i]) > bigAbs + 1e-12) { bigAbs = Math.abs(vec[i]); big = vec[i]; } }
      if (big < 0) for (i = 0; i < n; i++) vec[i] = -vec[i];
      values[t] = d[col]; vectors.push(vec);
    }
    return { values: values, vectors: vectors };
  }
  /* Top eigenpairs of a symmetric matrix, as --pca needs them: Householder reduction to a tridiagonal
     matrix T (LAPACK dsytd2, UPLO = 'U'), all eigenvalues of T by implicit QL, the top `k` eigenvectors
     of T by inverse iteration (re-orthogonalized within clusters of close eigenvalues, as LAPACK's
     dstein does) with dstein's sign rule, transformed back with the Householder reflections. The
     signs then match real PLINK 1.9.0's dsyevr output (checked on the toy PCAs). Returns
     {values: Float64Array (all, descending), vectors: [Float64Array(n)] (top k, unit norm)}. */
  function eigenTop(Ain, n, k) {
    k = Math.min(k == null ? n : k, n);
    var A = new Float64Array(n * n), d = new Float64Array(n), e = new Float64Array(n), refl = [], taus = new Float64Array(Math.max(n, 1));
    var r, t, s, I;
    for (t = 0; t < n * n; t++) A[t] = Ain[t];
    if (n === 1) return { values: new Float64Array([A[0]]), vectors: k ? [new Float64Array([1])] : [] };
    /* Householder reduction to tridiagonal form exactly as LAPACK's dsytd2 with UPLO = 'U', the call
       PLINK makes through dsyevr: reflectors H(I), I = n-1 down to 1, each annihilating the entries
       above the superdiagonal in column I+1 (Fortran numbering); T has diagonal d and superdiagonal e. */
    for (I = n - 1; I >= 1; I--) {
      var col = I, alpha = A[(I - 1) * n + col], xnorm = 0, taui = 0, beta = alpha;
      for (r = 0; r < I - 1; r++) xnorm += A[r * n + col] * A[r * n + col];
      xnorm = Math.sqrt(xnorm);
      var v = new Float64Array(I);
      v[I - 1] = 1;
      if (xnorm !== 0) {                         // dlarfg: H (alpha, x) = (beta, 0)
        beta = -(alpha >= 0 ? 1 : -1) * Math.hypot(alpha, xnorm);
        taui = (beta - alpha) / beta;
        var sc = 1 / (alpha - beta);
        for (r = 0; r < I - 1; r++) v[r] = A[r * n + col] * sc;
      }
      e[I - 1] = beta;
      if (taui !== 0) {                          // A(1:I,1:I) := H A H as a rank-2 update
        var w = new Float64Array(I), dot = 0;
        for (r = 0; r < I; r++) { s = 0; for (t = 0; t < I; t++) s += A[r * n + t] * v[t]; w[r] = taui * s; }
        for (r = 0; r < I; r++) dot += w[r] * v[r];
        var half = -0.5 * taui * dot;
        for (r = 0; r < I; r++) w[r] += half * v[r];
        for (r = 0; r < I; r++) for (t = 0; t < I; t++) A[r * n + t] -= v[r] * w[t] + w[r] * v[t];
      }
      d[I] = A[I * n + I];
      taus[I - 1] = taui; refl[I - 1] = v;
    }
    d[0] = A[0]; e[n - 1] = 0;
    var dT = new Float64Array(d), eT = new Float64Array(e);  // keep T for inverse iteration
    // eigenvalues of T: implicit QL (EISPACK tql1)
    var f = 0, tst1 = 0, eps = Math.pow(2, -52), l, m, g, h, pp, rr, cc, c2, c3, el1, ss, s2, dl1, i;
    for (l = 0; l < n; l++) {
      tst1 = Math.max(tst1, Math.abs(d[l]) + Math.abs(e[l]));
      m = l;
      while (m < n) { if (Math.abs(e[m]) <= eps * tst1) break; m++; }
      if (m > l) {
        var iter = 0;
        do {
          iter++;
          g = d[l]; pp = (d[l + 1] - g) / (2 * e[l]); rr = Math.hypot(pp, 1); if (pp < 0) rr = -rr;
          d[l] = e[l] / (pp + rr); d[l + 1] = e[l] * (pp + rr); dl1 = d[l + 1]; h = g - d[l];
          for (i = l + 2; i < n; i++) d[i] -= h;
          f += h;
          pp = d[m]; cc = 1; c2 = cc; c3 = cc; el1 = e[l + 1]; ss = 0; s2 = 0;
          for (i = m - 1; i >= l; i--) {
            c3 = c2; c2 = cc; s2 = ss; g = cc * e[i]; h = cc * pp; rr = Math.hypot(pp, e[i]);
            e[i + 1] = ss * rr; ss = e[i] / rr; cc = pp / rr; pp = cc * d[i] - ss * g; d[i + 1] = h + ss * (cc * g + ss * d[i]);
          }
          pp = -ss * s2 * c3 * el1 * e[l] / dl1; e[l] = ss * pp; d[l] = cc * pp;
        } while (Math.abs(e[l]) > eps * tst1 && iter < 100);
      }
      d[l] = d[l] + f; e[l] = 0;
    }
    var values = Float64Array.from(d).sort().reverse();
    // eigenvectors of T by inverse iteration
    var norm = 0;
    for (i = 0; i < n; i++) norm = Math.max(norm, Math.abs(dT[i]) + Math.abs(eT[i]) + (i ? Math.abs(eT[i - 1]) : 0));
    if (norm === 0) norm = 1;
    var ortol = 1e-3 * norm, tiny = eps * norm, vecs = [], seed = 12345;
    var u0 = new Float64Array(n), u1 = new Float64Array(n), u2 = new Float64Array(n), lm = new Float64Array(n), piv = new Uint8Array(n);
    var prevLam = Infinity, clusterStart = 0;
    for (var j = 0; j < k; j++) {
      var lam = values[j];
      if (j > 0) {
        if (prevLam - lam > ortol) clusterStart = j;
        var pertol = 10 * Math.abs(eps * lam) + tiny;
        if (prevLam - lam < pertol) lam = prevLam - pertol;
      }
      prevLam = lam;
      // LU factorization of T - lam I with partial pivoting
      var cd = dT[0] - lam, cs1 = n > 1 ? eT[0] : 0;
      for (i = 0; i < n - 1; i++) {
        var sub = eT[i], dg = dT[i + 1] - lam, sup = i + 1 < n - 1 ? eT[i + 1] : 0, mult;
        if (Math.abs(cd) >= Math.abs(sub)) {
          if (cd === 0) cd = tiny;
          mult = sub / cd; u0[i] = cd; u1[i] = cs1; u2[i] = 0; piv[i] = 0; lm[i] = mult;
          cd = dg - mult * cs1; cs1 = sup;
        } else {
          mult = cd / sub; u0[i] = sub; u1[i] = dg; u2[i] = sup; piv[i] = 1; lm[i] = mult;
          cd = cs1 - mult * dg; cs1 = -mult * sup;
        }
      }
      u0[n - 1] = cd === 0 ? tiny : cd;
      var x = new Float64Array(n);
      for (i = 0; i < n; i++) { seed = (Math.imul(seed, 1103515245) + 12345) | 0; x[i] = ((seed >>> 8) / 16777216) - 0.5; }
      for (var it = 0; it < 4; it++) {
        for (i = 0; i < n - 1; i++) {
          if (!piv[i]) x[i + 1] -= lm[i] * x[i];
          else { var tmp = x[i]; x[i] = x[i + 1]; x[i + 1] = tmp - lm[i] * x[i]; }
        }
        x[n - 1] /= u0[n - 1];
        if (n > 1) x[n - 2] = (x[n - 2] - u1[n - 2] * x[n - 1]) / u0[n - 2];
        for (i = n - 3; i >= 0; i--) x[i] = (x[i] - u1[i] * x[i + 1] - u2[i] * x[i + 2]) / u0[i];
        for (var q = clusterStart; q < j; q++) {
          var y = vecs[q], dot = 0;
          for (i = 0; i < n; i++) dot += x[i] * y[i];
          for (i = 0; i < n; i++) x[i] -= dot * y[i];
        }
        var nx = 0; for (i = 0; i < n; i++) nx += x[i] * x[i];
        nx = Math.sqrt(nx);
        if (!(nx > 0)) { x.fill(0); x[j] = 1; nx = 1; }
        for (i = 0; i < n; i++) x[i] /= nx;
      }
      vecs.push(x);
    }
    /* Sign as LAPACK's dstein sets it, on the eigenvector of T: its largest-magnitude entry (the first,
       on a tie) is positive. Then back to the original basis as dormtr does: z = H(n-1) ... H(2) H(1) x. */
    var out = [];
    for (j = 0; j < vecs.length; j++) {
      var z = new Float64Array(vecs[j]), big = 0, bigAbs = -1;
      for (i = 0; i < n; i++) if (Math.abs(z[i]) > bigAbs) { bigAbs = Math.abs(z[i]); big = z[i]; }
      if (big < 0) for (i = 0; i < n; i++) z[i] = -z[i];
      for (I = 1; I <= n - 1; I++) {
        if (!taus[I - 1]) continue;
        var hv = refl[I - 1], sd = 0;
        for (t = 0; t < I; t++) sd += hv[t] * z[t];
        sd *= taus[I - 1];
        for (t = 0; t < I; t++) z[t] -= sd * hv[t];
      }
      var nz = 0;
      for (i = 0; i < n; i++) nz += z[i] * z[i];
      nz = Math.sqrt(nz);
      for (i = 0; i < n; i++) z[i] /= nz;
      out.push(z);
    }
    return { values: values, vectors: out };
  }

  /* --pca: top `count` eigenvalues and unit-norm eigenvectors of the relationship matrix. */
  function pca(ds, opts) {
    opts = opts || {};
    var R = grm(ds, opts), k = Math.min(opts.count || 20, R.n, R.markers), E = eigenTop(R.matrix, R.n, k);
    return { eigenvalues: Array.prototype.slice.call(E.values, 0, k), eigenvectors: E.vectors.slice(0, k), grm: R };
  }

  /* ====================================================================================
     5. Session: console, log, files
     ==================================================================================== */
  function Session(io) {
    this.io = io;
    this.pending = "";
    this.pendingStream = "stdout";
    this.logText = null;
    this.logName = null;
    this.outputs = [];
    this.silent = false;
    var now = typeof io.now === "function" ? io.now() : Date.now();
    this.now = now;
    var cwd = typeof io.cwd === "function" ? io.cwd() : io.cwd;
    this.cwd = cwd || DEFAULT_CWD;
  }
  Session.prototype.emit = function (text, stream) {
    if (this.silent && stream === "stdout") return;
    var parts = (this.pending + text).split("\n");
    this.pending = parts.pop();
    for (var i = 0; i < parts.length; i++) {
      if (stream === "stderr") this.io.print(parts[i], "stderr"); else this.io.print(parts[i]);
    }
  };
  Session.prototype.out = function (t) { this.emit(t, "stdout"); };
  Session.prototype.err = function (t) { this.emit(t, "stderr"); };
  Session.prototype.log = function (t) { if (this.logText !== null) this.logText += t; };
  Session.prototype.logprint = function (t) { this.log(t); this.out(t); };
  Session.prototype.logerrprint = function (t) { this.log(t); this.err(t); };
  Session.prototype.ww = function (t) { this.logprint(wordwrap(t, 0)); };
  Session.prototype.ww5 = function (t) { this.logprint(wordwrap(t, 5)); };
  Session.prototype.errww = function (t) { this.logerrprint(wordwrap(t, 0)); };
  Session.prototype.flush = function () { if (this.pending) { this.io.print(this.pending); this.pending = ""; } };
  Session.prototype.tryWrite = function (path, data) {
    var ok;
    try { ok = this.io.write(path, data); } catch (e) { ok = false; }
    if (ok === false) return false;
    if (this.outputs.indexOf(path) < 0) this.outputs.push(path);
    return true;
  };
  Session.prototype.write = function (path, data) {
    if (!this.tryWrite(path, data)) { this.errww("Error: Failed to open " + path + ".\n"); throw new PlinkExit(RET.OPEN_FAIL); }
  };
  Session.prototype.read = function (path, binary) {
    var d = null;
    try { d = this.io.read(path); } catch (e) { d = null; }
    if (d == null) return null;
    return binary ? textToBytes(d) : bytesToText(d);
  };
  Session.prototype.readOrFail = function (path, binary) {
    var d = this.read(path, binary);
    if (d == null) { this.errww("Error: Failed to open " + path + ".\n"); throw new PlinkExit(RET.OPEN_FAIL); }
    return d;
  };
  Session.prototype.fail = function (code, msg, wrap) { if (msg) { if (wrap) this.errww(msg); else this.logerrprint(msg); } throw new PlinkExit(code); };
  Session.prototype.finish = function (ok) {
    if (ok && this.removeAtEnd && typeof this.io.remove === "function") {
      var io = this.io;
      this.removeAtEnd.forEach(function (p) {
        try { if (typeof io.exists !== "function" || io.exists(p)) io.remove(p); } catch (e) { /* ignore */ }
      });
    }
    if (this.logText !== null) {
      this.logText += "\nEnd time: " + ctime(typeof this.io.now === "function" ? this.io.now() : Date.now());
      if (!this.tryWrite(this.logName, this.logText)) { this.flush(); this.err("Error: Failed to finish writing to log.\n"); }
    }
    this.flush();
  };

  /* ====================================================================================
     6. Command line
     ==================================================================================== */
  function isFlag(t) {
    if (typeof t !== "string" || t.charAt(0) !== "-") return false;
    var c = t.charCodeAt(1);
    if (t.length < 2) return false;
    return c > 57 || (c < 48 && c !== 46);
  }
  function flagName(t) { if (!isFlag(t)) return null; return t.charAt(1) === "-" ? t.slice(2) : t.slice(1); }
  function rangeMsg(typed, ct, min, max) {
    if (ct > max) return max > min ? "Error: " + typed + " accepts at most " + max + " parameter" + sp(max) + ".\n" : "Error: " + typed + " only accepts " + max + " parameter" + sp(max) + ".\n";
    if (ct < min) return min === 1 ? "Error: Missing " + typed + " parameter.\n" : "Error: " + typed + " requires " + (min < max ? "at least " : "") + min + " parameters.\n";
    return null;
  }

  function helpText(names) {
    var out = "";
    if (!names.length) {
      out += "\nIn the lab emulator, 'plink --help' lists only the flags it supports:\n\n";
      Object.keys(HELP).forEach(function (k) { out += HELP[k]; });
      return out + "\n";
    }
    names.forEach(function (raw) {
      var nm = raw.replace(/^-+/, "");
      if (HELP[nm]) out += "\n" + HELP[nm];
      else if (REAL_FLAGS[nm]) out += "\n--" + nm + " is a PLINK 1.9 flag that this lab emulator does not support.\n";
      else out += "\nNo help entry for '" + raw + "'.\n";
    });
    return out + "\n";
  }

  /* Supported flags and their parsers. Each parser gets (S, f, P, all) and fills P. */
  function parseFlags(S, sorted, P) {
    var ctx = { hasOut: !!P.outGiven };
    for (var q = 0; q < sorted.length; q++) {
      var f = sorted[q], nm = f.name, np = f.params.length, prm = f.params, msg;
      var need = function (min, max) { var e = rangeMsg(f.typed, np, min, max); if (e) { S.errww(e); S.logerrprint(ERRSTR_APPEND); throw new PlinkExit(RET.INVALID_CMDLINE); } };
      var noParams = function () { if (np) { S.logerrprint("Error: --" + nm + " doesn't accept parameters.\n" + ERRSTR_APPEND); throw new PlinkExit(RET.INVALID_CMDLINE); } };
      var bad = function (text) { S.errww(text); S.logerrprint(ERRSTR_APPEND); throw new PlinkExit(RET.INVALID_CMDLINE); };
      var badNoWrap = function (text) { S.logerrprint(text + ERRSTR_APPEND); throw new PlinkExit(RET.INVALID_CMDLINE); };
      var unsupported = function (what) {
        S.errww("Error: " + what + " is part of real PLINK 1.9 but not of this lab emulator, which supports only the commands of the practical (see 'plink --help').\n");
        throw new PlinkExit(RET.CALC_NOT_YET_SUPPORTED);
      };
      switch (nm) {
        case "out": break;
        case "bfile": need(0, 1); P.bfile = np ? prm[0] : "plink"; break;
        case "allow-no-sex": noParams(); P.allowNoSex = true; break;
        case "keep-allele-order": noParams(); P.keepAlleleOrder = true; break;
        case "nonfounders": noParams(); P.nonfounders = true; break;
        case "allow-extra-chr": need(0, 1); break;
        case "silent": noParams(); break;
        case "write-snplist": noParams(); P.calc.writeSnplist = true; break;
        case "make-bed":
          if (np) badNoWrap("Error: --make-bed doesn't accept parameters." + ((np === 1 && !ctx.hasOut) ? "  (Did you forget '--out'?)" : "") + "\n");
          P.calc.makeBed = true; break;
        case "missing":
          need(0, 1);
          if (np && prm[0] !== "gz") bad("Error: Invalid --missing parameter '" + prm[0] + "'.\n");
          if (np) unsupported("--missing gz");
          P.calc.missing = true; break;
        case "freq":
          need(0, 2);
          prm.forEach(function (x) {
            if (x === "counts" || x === "case-control" || x === "gz") unsupported("--freq " + x);
            else bad("Error: Invalid --freq parameter '" + x + "'.\n");
          });
          P.calc.freq = true; break;
        case "hardy":
          need(0, 2);
          prm.forEach(function (x) {
            if (x === "midp") P.hardyMidp = true;
            else if (x === "gz") unsupported("--hardy gz");
            else bad("Error: Invalid --hardy parameter '" + x + "'.\n");
          });
          P.calc.hardy = true; break;
        case "het":
          need(0, 2);
          prm.forEach(function (x) {
            if (x === "small-sample") P.hetSmall = true;
            else if (x === "gz") unsupported("--het gz");
            else bad("Error: Invalid --het parameter '" + x + "'.\n");
          });
          P.calc.het = true; break;
        case "geno": case "mind":
          need(0, 1);
          var gv = np ? scanDouble(prm[0]) : 0.1;
          if (gv === null) bad("Error: Invalid --" + nm + " parameter '" + prm[0] + "'.\n");
          if (gv < 0 || gv > 1 || gv !== gv) bad("Error: Invalid --" + nm + " parameter '" + prm[0] + "' (must be between 0 and 1).\n");
          P[nm] = gv; P.filterFlags = true; break;
        case "maf":
          need(0, 1);
          var mv = np ? scanDouble(prm[0]) : 0.01;
          if (mv === null) bad("Error: Invalid --maf parameter '" + prm[0] + "'.\n");
          if (mv <= 0) bad("Error: --maf parameter '" + prm[0] + "' too small (must be > 0).\n");
          if (mv > P.maxMaf) bad("Error: --maf parameter '" + prm[0] + "' too large (must be <= " + cG(P.maxMaf) + ").\n");
          P.maf = mv; P.filterFlags = true; break;
        case "max-maf":
          need(1, 1);
          var xv = scanDouble(prm[0]);
          if (xv === null) bad("Error: Invalid --max-maf parameter '" + prm[0] + "'.\n");
          if (xv < P.maf) bad("Error: --max-maf parameter '" + prm[0] + "' too small (must be >= " + cG(P.maf) + ").\n");
          if (xv >= 0.5) bad("Error: --max-maf parameter '" + prm[0] + "' too large (must be < 0.5).\n");
          P.maxMaf = xv; P.filterFlags = true; break;
        case "hwe":
          need(1, 3);
          var got = false;
          prm.forEach(function (x) {
            if (x === "midp") P.hweMidp = true;
            else if (x === "include-nonctrl") P.hweAll = true;
            else {
              var hv = scanDoubleStrict(x);
              if (hv === null || got) badNoWrap("Error: Invalid --hwe parameter sequence.\n");
              got = true;
              if (hv < 0 || hv >= 1) bad("Error: Invalid --hwe threshold '" + x + "' (must be between 0 and 1).\n");
              P.hwe = hv;
            }
          });
          if (!got) badNoWrap("Error: --hwe now requires a p-value threshold.\n");
          if (P.hweMidp && P.hwe >= 0.5) badNoWrap("Error: --hwe threshold must be smaller than 0.5 when using mid-p adjustment.\n");
          P.filterFlags = true; break;
        case "extract": case "exclude":
          need(1, 2);
          if (np === 2) { if (prm[0] === "range") unsupported("--" + nm + " range"); badNoWrap("Error: Invalid --" + nm + " parameter sequence.\n"); }
          P[nm] = prm[0]; P.filterFlags = true; break;
        case "keep": case "remove":
          need(1, 1); P[nm] = prm[0]; P.filterFlags = true; break;
        case "flip":
          need(1, 1); P.flip = prm[0]; P.filterFlags = true; break;
        case "update-ids":
          need(1, 1); P.updateIds = prm[0]; P.filterFlags = true; break;
        case "bmerge":
          need(1, 3);
          if (np === 2) badNoWrap("Error: --bmerge must have exactly 1 or 3 parameters.\n");
          if (np === 1) P.bmerge = [prm[0] + ".bed", prm[0] + ".bim", prm[0] + ".fam"];
          else P.bmerge = prm.slice(0, 3);
          P.calc.merge = true; break;
        case "genome":
          need(0, 5);
          prm.forEach(function (x) {
            if (x === "full") P.genomeFull = true;
            else if (x === "unbounded") P.genomeUnbounded = true;
            else if (x === "nudge") P.genomeNudge = true;
            else if (x === "rel-check") P.genomeRelCheck = true;
            else if (x === "gz") unsupported("--genome gz");
            else bad("Error: Invalid --genome parameter '" + x + "'.\n");
          });
          P.calc.genome = true; break;
        case "min": case "max":
          if (!P.calc.genome) badNoWrap("Error: --" + nm + " must be used with --genome.\n");
          need(1, 1);
          var tv = scanDouble(prm[0]);
          if (tv === null) bad("Error: Invalid --" + nm + " parameter '" + prm[0] + "'.\n");
          if (tv < -1 || tv > 1) badNoWrap("Error: --" + nm + " threshold must be between -1 and 1 inclusive.\n");
          if (nm === "min" && P.genomeMax != null && tv > P.genomeMax) badNoWrap("Error: --min value cannot be greater than --max value.\n");
          if (nm === "min") P.genomeMin = tv; else P.genomeMax = tv;
          break;
        case "pca":
          need(0, 4);
          var cntSeen = false;
          prm.forEach(function (x) {
            if (x === "header") P.pcaHeader = true;
            else if (x === "tabs") P.pcaTabs = true;
            else if (x === "var-wts") unsupported("--pca var-wts");
            else {
              var cv = scanPosint(x, true);
              if (cntSeen || cv === null) badNoWrap("Error: Invalid --pca parameter sequence.\n");
              if (cv > 8000) { S.logerrprint("Error: --pca does not support more than 8000 PCs.\n"); throw new PlinkExit(RET.INVALID_CMDLINE); }
              P.pcaCount = cv; cntSeen = true;
            }
          });
          P.calc.pca = true; break;
        case "indep-pairwise":
          if (P.calc.prune) { S.logerrprint("Error: Conflicting --indep... commands.\n"); throw new PlinkExit(RET.INVALID_CMDLINE); }
          need(3, 4);
          var wv = scanPosint(prm[0], false);
          if (wv === null || (wv === 1 && np === 3)) bad("Error: Invalid --indep-pairwise window size '" + prm[0] + "'.\n");
          var kbMode = false;
          if (np === 4) { if (prm[1].toUpperCase() !== "KB") badNoWrap("Error: Invalid --indep-pairwise parameter sequence.\n"); kbMode = true; }
          else if (prm[0].length > 2 && prm[0].slice(-2).toUpperCase() === "KB") kbMode = true;
          var stv = scanPosint(prm[np - 2], true);
          if (stv === null) bad("Error: Invalid increment '" + prm[np - 2] + "' for --indep-pairwise.\n");
          if (kbMode && stv > 1) S.errww("Warning: --indep-pairwise step size should be 1 when window size is in kb units.\n");
          var rv = scanDoubleStrict(prm[np - 1]);
          if (rv === null || rv < 0 || rv >= 1) bad("Error: Invalid --indep-pairwise r^2 threshold '" + prm[np - 1] + "'.\n");
          P.prune = { window: wv, step: stv, r2: rv, kb: kbMode };
          P.calc.prune = true; break;
        case "seed":
          if (!np) bad("Error: Missing --seed parameter.\n");
          prm.forEach(function (x) { if (!/^\d+$/.test(x) || +x > 4294967295) bad("Error: Invalid --seed parameter '" + x + "'.\n"); });
          P.seed = true; break;
        case "threads":
          need(1, 1);
          var th = scanPosint(prm[0], true);
          if (th === null) bad("Error: Invalid --threads parameter '" + prm[0] + "'.\n");
          P.threads = Math.min(th, 16384); break;
        case "memory":
          need(1, 1);
          var mm = scanPosint(prm[0], true);
          if (mm === null) bad("Error: Invalid --memory parameter '" + prm[0] + "'.\n");
          if (mm < 64) bad("Error: Invalid --memory parameter '" + prm[0] + "' (minimum 64).\n");
          P.memory = mm; break;
        default:
          if (PLINK2_FLAGS[nm]) { S.logerrprint(wordwrap("Error: Unrecognized flag (" + f.typed + ").  (This is PLINK 1.9, not 2.x.)\n", 0)); throw new PlinkExit(RET.INVALID_CMDLINE); }
          if (REAL_FLAGS[nm]) unsupported("--" + nm);
          S.errww("Error: Unrecognized flag ('" + f.typed + "').\n");
          S.logerrprint(ERRSTR_APPEND);
          throw new PlinkExit(RET.INVALID_CMDLINE);
      }
    }
  }

  /* ====================================================================================
     7. run(): the PLINK main program
     ==================================================================================== */
  function run(argv, io) {
    argv = (argv || []).map(String);
    var S = new Session(io), code;
    try { code = main(S, argv); }
    catch (e) {
      if (e instanceof PlinkExit) code = e.code;
      else {
        S.finish(false);
        throw e;
      }
    }
    S.finish(code === 0);
    return { code: code, outputs: S.outputs.slice() };
  }

  function main(S, argv) {
    var nArg = argv.length, i;
    if (!nArg) { S.out(BANNER + CMDLINE_FORMAT + COMMANDS_TEXT); return RET.NULL_CALC; }
    if (!isFlag(argv[0])) { S.out(BANNER); S.err("Error: First parameter must be a flag.\n" + ERRSTR_APPEND); return RET.INVALID_CMDLINE; }
    var wantVersion = false, flagCt = 0, silent = false;
    for (i = 0; i < nArg; i++) {
      var nm0 = flagName(argv[i]);
      if (nm0 === null) continue;
      if (nm0 === "help") {
        S.out(BANNER);
        if (i !== 0) S.out("--help present, ignoring other flags.\n");
        var names = (i === nArg - 1 && flagCt) ? argv.slice(0, i).filter(isFlag) : argv.slice(i + 1);
        S.out(helpText(names));
        return RET.SUCCESS;
      }
      if (nm0 === "h" || nm0 === "?") {
        S.out(BANNER);
        if (i !== 0) S.out("-" + nm0 + " present, ignoring other flags.\n");
        S.out(CMDLINE_FORMAT + COMMANDS_TEXT);
        return RET.SUCCESS;
      }
      if (nm0 === "version" || nm0 === "v" || nm0 === "V") wantVersion = true;
      if (nm0 === "silent") silent = true;
      flagCt++;
    }
    if (wantVersion) { S.out(VERSION + "\n"); return RET.SUCCESS; }
    S.silent = silent;
    S.out(BANNER);

    // collect flags with their parameters, then sort by name
    var flags = [], cur = null;
    for (i = 0; i < nArg; i++) {
      var nm = flagName(argv[i]);
      if (nm !== null) {
        if (nm === "") { S.err("Error: Unrecognized flag ('--').\n"); return RET.INVALID_CMDLINE; }
        cur = { name: nm, typed: argv[i], params: [] };
        flags.push(cur);
      } else cur.params.push(argv[i]);
    }
    var sorted = flags.slice().sort(function (a, b) { return strcmp(a.name, b.name); });
    for (i = 1; i < sorted.length; i++) if (sorted[i].name === sorted[i - 1].name) {
      S.err("Error: Duplicate --" + sorted[i].name + " flag.\n");
      return RET.INVALID_CMDLINE;
    }
    var outF = null, outname = "plink";
    sorted.forEach(function (f) { if (f.name === "out") outF = f; });
    if (outF) {
      var em = rangeMsg(outF.typed, outF.params.length, 1, 1);
      if (em) { S.err(wordwrap(em, 0) + ERRSTR_APPEND); return RET.INVALID_CMDLINE; }
      outname = outF.params[0];
    }
    var logName = outname + ".log";
    if (!S.tryWrite(logName, "")) {
      S.err("Error: Failed to open " + logName + ".  Try " + (logName.indexOf("plink.") === 0 ? "using --out.\n" : "changing the --out parameter.\n"));
      return RET.OPEN_FAIL;
    }
    S.logName = logName;
    S.logText = "";
    S.out("Logging to " + logName + ".\n");
    S.log(VERSION + "\n");
    var opt = "Options in effect:\n";
    sorted.forEach(function (f) { opt += "  --" + f.name + f.params.map(function (p) { return " " + p; }).join("") + "\n"; });
    S.logprint(opt + "\n");
    S.log("Hostname: " + HOSTNAME + "\nWorking directory: " + S.cwd + "\nStart time: " + ctime(S.now) + "\n");

    var P = { outname: outname, outGiven: !!outF, calc: {}, geno: 1, mind: 1, maf: 0, maxMaf: 0.5, hwe: 0, filterFlags: false, threads: THREADS };
    parseFlags(S, sorted, P);

    var c = P.calc, anyCalc = c.makeBed || c.freq || c.missing || c.hardy || c.prune || c.genome || c.het || c.pca || c.merge || c.writeSnplist;
    if (anyCalc && !(c.makeBed || c.hardy || c.prune || c.genome || c.het || c.pca || c.merge || c.writeSnplist) &&
        (P.geno !== 1 || P.hwe !== 0 || P.maf !== 0 || P.maxMaf !== 0.5)) {
      S.logerrprint("Warning: --freq and --missing complete BEFORE --geno, --hwe, and --maf in\nplink's order of operations.\n");
    }
    if (!anyCalc) {
      if (P.bfile != null) {
        S.logerrprint(P.filterFlags ? "Warning: No output requested.  (Did you forget --make-bed?)  Exiting.\n" : "Warning: No output requested.  Exiting.\n");
        S.out(CMDLINE_FORMAT + COMMANDS_TEXT);
        return RET.NULL_CALC;
      }
    }
    if (P.bfile == null) { S.logerrprint("Error: No input dataset.\n" + ERRSTR_APPEND); return RET.INVALID_CMDLINE; }
    if (!P.seed) S.log("Random number seed: " + Math.floor(S.now / 1000) + "\n");
    var ramMb = RAM_MB, reserve = P.memory || ramMb / 2;
    S.logprint(ramMb + " MB RAM detected; reserving " + reserve + " MB for main workspace.\n");

    return pipeline(S, P);
  }

  /* ---- input loading ---- */
  function loadFileset(S, bedName, bimName, famName, P) {
    var bed = S.read(bedName, true);
    if (bed == null) {
      var hint = /\.(bed|bim|fam)\.bed$/.test(bedName) ? " (--bfile expects a filename *prefix*; '.bed', '.bim', and '.fam' are automatically appended.)" : "";
      S.errww("Error: Failed to open " + bedName + "." + hint + "\n");
      throw new PlinkExit(RET.OPEN_FAIL);
    }
    var bimText = S.readOrFail(bimName, false), famText = S.readOrFail(famName, false);
    var b = parseBim(bimText);
    if (b.error) S.fail(RET.INVALID_FORMAT, b.error, b.ww);
    if (!b.snps.length) S.fail(RET.INVALID_FORMAT, "Error: No variants in .bim file.\n");
    S.logprint(b.snps.length + " variant" + sp(b.snps.length) + " loaded from .bim file.\n");
    var f = parseFam(famText);
    if (f.error) S.fail(RET.INVALID_FORMAT, f.error);
    var n = f.samples.length, males = 0, females = 0, amb = 0, seen = Object.create(null);
    for (var i = 0; i < n; i++) {
      var s = f.samples[i], key = s.fid + "\t" + s.iid;
      if (seen[key]) S.fail(RET.INVALID_FORMAT, "Error: Duplicate ID '" + s.fid + " " + s.iid + "'.\n", true);
      seen[key] = 1;
      if (s.sex === 1) males++; else if (s.sex === 2) females++; else amb++;
    }
    if (amb) {
      S.logprint(n + " " + people(n) + " (" + males + " male" + sp(males) + ", " + females + " female" + sp(females) + ", " + amb + " ambiguous) loaded from .fam.\n");
      var nosex = "";
      f.samples.forEach(function (s2) { if (!s2.sex) nosex += s2.fid + "\t" + s2.iid + "\n"; });
      S.write(P.outname + ".nosex", nosex);
      S.ww("Ambiguous sex ID" + sp(amb) + " written to " + P.outname + ".nosex .\n");
    } else {
      S.logprint(n + " " + people(n) + " (" + males + " male" + sp(males) + ", " + females + " female" + sp(females) + ") loaded from .fam.\n");
    }
    var phenoCt = f.samples.filter(function (s3) { return s3.phen !== -9; }).length;
    if (phenoCt) S.logprint(phenoCt + " phenotype value" + sp(phenoCt) + " loaded from .fam.\n");
    var msg = checkBed(bed, n, b.snps.length);
    return { snps: b.snps, samples: f.samples, phenoType: f.phenoType, bed: bed, bedMsg: msg, n: n, m: b.snps.length };
  }

  function readTokensFile(S, path) { return S.readOrFail(path, false); }

  /* ---- the main pipeline (plink() in PLINK 1.9) ---- */
  function pipeline(S, P) {
    var c = P.calc, input;
    var bedName = P.bfile + ".bed", bimName = P.bfile + ".bim", famName = P.bfile + ".fam";
    if (c.merge) {
      var mres = bmerge(S, P, bedName, bimName, famName);
      if (mres.done) return RET.SUCCESS;
      input = mres.fileset;
      S.logprint(input.m + " variant" + sp(input.m) + " loaded from .bim file.\n");
      reportFam(S, P, input);
    } else {
      input = loadFileset(S, bedName, bimName, famName, P);
    }
    var ds = { samples: input.samples.map(function (s) { return { fid: s.fid, iid: s.iid, pat: s.pat, mat: s.mat, sex: s.sex, phen: s.phen }; }),
      snps: input.snps, n: input.n, m: input.m, geno: null, phenoType: input.phenoType };
    var n = ds.n, m = ds.m, i, j;
    var mIn = new Uint8Array(m), sIn = new Uint8Array(n);
    mIn.fill(1); sIn.fill(1);

    // --flip
    if (P.flip != null) {
      var ftext = readTokensFile(S, P.flip), toks = splitTokens(ftext.replace(/\r?\n/g, " ")), idx = Object.create(null), seenF = Object.create(null), hit = 0, miss = 0, nonAcgt = 0;
      for (j = 0; j < m; j++) if (idx[ds.snps[j].id] === undefined) idx[ds.snps[j].id] = j;
      var COMP = { A: "T", T: "A", C: "G", G: "C", a: "t", t: "a", c: "g", g: "c" };
      toks.forEach(function (t) {
        if (seenF[t]) S.fail(RET.INVALID_FORMAT, "Error: Duplicate variant ID '" + t + "' in --flip file.\n", true);
        seenF[t] = 1;
        var jj = idx[t];
        if (jj === undefined) { miss++; return; }
        hit++;
        var s = ds.snps[jj], bad = false;
        var flipA = function (al) { if (al === "0") return al; if (COMP[al]) return COMP[al]; bad = true; return al; };
        s.a1 = flipA(s.a1); s.a2 = flipA(s.a2);
        if (bad) nonAcgt++;
      });
      S.logprint(miss ? "--flip: " + hit + " SNP" + sp(hit) + " flipped, " + miss + " SNP ID" + sp(miss) + " not present.\n" : "--flip: " + hit + " SNP" + sp(hit) + " flipped.\n");
      if (nonAcgt) S.logerrprint("Warning: " + nonAcgt + " variant" + sp(nonAcgt) + " had at least one non-A/C/G/T allele name.\n");
    }
    // --extract / --exclude
    [["extract", true], ["exclude", false]].forEach(function (pair) {
      var key = pair[0];
      if (P[key] == null) return;
      var text = readTokensFile(S, P[key]), list = splitTokens(text.replace(/\r?\n/g, " ")), want = Object.create(null), dups = 0;
      list.forEach(function (t) { if (want[t]) dups++; want[t] = 1; });
      for (var jj = 0; jj < m; jj++) {
        if (!mIn[jj]) continue;
        var named = !!want[ds.snps[jj].id];
        if (pair[1] ? !named : named) mIn[jj] = 0;
      }
      if (dups) S.logerrprint("Warning: At least " + dups + " duplicate ID" + sp(dups) + " in --" + key + " file.\n");
      var left = count(mIn);
      if (!left) S.fail(RET.ALL_MARKERS_EXCLUDED, "Error: No variants remaining after --" + key + ".\n");
      S.logprint("--" + key + ": " + left + " variant" + sp(left) + " remaining.\n");
    });
    // .bed checks
    if (input.bedMsg) S.fail(RET.INVALID_FORMAT, input.bedMsg);
    ds.geno = input.geno || decodeBed(input.bed, n, m);
    // --update-ids
    if (P.updateIds != null) {
      var ulines = splitLines(readTokensFile(S, P.updateIds)), byId = Object.create(null), seenU = Object.create(null), upd = 0, notThere = 0;
      for (i = 0; i < n; i++) byId[ds.samples[i].fid + "\t" + ds.samples[i].iid] = i;
      ulines.forEach(function (line, k) {
        var t = splitTokens(line);
        if (!t.length) return;
        if (t.length < 4) S.fail(RET.INVALID_FORMAT, "Error: Line " + (k + 1) + " of --update-ids file has fewer tokens than expected.\n");
        var key2 = t[0] + "\t" + t[1];
        if (seenU[key2]) S.fail(RET.INVALID_FORMAT, "Error: Duplicate sample ID '" + t[0] + " " + t[1] + "' in --update-ids file.\n", true);
        seenU[key2] = 1;
        if (t[3] === "0") S.fail(RET.INVALID_FORMAT, "Error: Invalid IID '0' on line " + (k + 1) + " of --update-ids file.\n");
        var ii = byId[key2];
        if (ii === undefined || !sIn[ii]) { notThere++; return; }
        ds.samples[ii].fid = t[2]; ds.samples[ii].iid = t[3]; upd++;
      });
      S.logprint("--update-ids: " + upd + " " + people(upd) + " updated" + (notThere ? ", " + notThere + " ID" + sp(notThere) + " not present" : "") + ".\n");
    }
    // --keep / --remove
    [["keep", true], ["remove", false]].forEach(function (pair) {
      var key = pair[0];
      if (P[key] == null) return;
      var lines = splitLines(readTokensFile(S, P[key])), want = Object.create(null), dups = 0;
      lines.forEach(function (line, k) {
        var t = splitTokens(line);
        if (!t.length) return;
        if (t.length < 2) S.fail(RET.INVALID_FORMAT, "Error: Line " + (k + 1) + " of --" + key + " file has fewer tokens than expected.\n");
        var id = t[0] + "\t" + t[1];
        if (want[id]) dups++;
        want[id] = 1;
      });
      for (var ii = 0; ii < n; ii++) {
        if (!sIn[ii]) continue;
        var named = !!want[ds.samples[ii].fid + "\t" + ds.samples[ii].iid];
        if (pair[1] ? !named : named) sIn[ii] = 0;
      }
      if (dups) S.logerrprint("Warning: At least " + dups + " duplicate ID" + sp(dups) + " in --" + key + " file.\n");
      var left = count(sIn);
      if (!left) S.fail(RET.ALL_SAMPLES_EXCLUDED, "Error: No people remaining after --" + key + ".\n");
      S.logprint("--" + key + ": " + left + " " + people(left) + " remaining.\n");
    });
    // ambiguous sex + phenotype
    if (!P.allowNoSex) {
      var uii = 0;
      for (i = 0; i < n; i++) if (sIn[i] && !ds.samples[i].sex && ds.samples[i].phen !== -9) uii++;
      if (uii) {
        var others = c.freq || c.missing || c.hardy || c.prune || c.genome || c.het || c.pca || c.writeSnplist;
        if (c.makeBed && others) S.fail(RET.INVALID_CMDLINE, "Error: When ambiguous-sex samples with phenotype data are present,\n--make-bed/--make-just-fam/--recode/--write-covar usually cannot be combined\nwith other commands.  Split them across multiple PLINK runs, or use\n--allow-no-sex/--must-have-sex.\n");
        if (!c.makeBed) for (i = 0; i < n; i++) if (sIn[i] && !ds.samples[i].sex) ds.samples[i].phen = -9;
        S.logerrprint("Warning: Ignoring phenotypes of missing-sex samples.  If you don't want those\nphenotypes to be ignored, use the --allow-no-sex flag.\n");
      }
    }
    // --mind
    if (P.mind < 1) {
      var mct = count(mIn), thresh = Math.trunc(P.mind * mct * (1 + SMALL_EPSILON)), removed = [], missC = new Int32Array(n);
      for (j = 0; j < m; j++) { if (!mIn[j]) continue; var bj = j * n; for (i = 0; i < n; i++) if (ds.geno[bj + i] < 0) missC[i]++; }
      for (i = 0; i < n; i++) if (sIn[i] && missC[i] > thresh) { removed.push(i); }
      if (removed.length) {
        S.write(P.outname + ".irem", removed.map(function (k) { return ds.samples[k].fid + "\t" + ds.samples[k].iid + "\n"; }).join(""));
        removed.forEach(function (k) { sIn[k] = 0; });
      }
      if (!count(sIn)) {
        S.logerrprint("Error: All people removed due to missing genotype data (--mind).\n");
        S.ww("IDs written to " + P.outname + ".irem .\n");
        throw new PlinkExit(RET.ALL_SAMPLES_EXCLUDED);
      }
      S.logprint(removed.length + " " + people(removed.length) + " removed due to missing genotype data (--mind).\n");
      if (removed.length) S.ww("ID" + sp(removed.length) + " written to " + P.outname + ".irem .\n");
    }
    var sIdx = indices(sIn), nS = sIdx.length;
    if (nS < 2 && (c.genome || c.pca)) S.fail(RET.INVALID_CMDLINE, "Error: At least 2 people required for pairwise analysis.\n");
    // threads
    if (P.threads > 1) S.logprint((c.genome || c.pca) ? "Using up to " + P.threads + " threads (change this with --threads).\n" : "Using 1 thread (no multithreaded calculations invoked).\n");
    else S.logprint("Using 1 thread.\n");
    if (c.pca && P.threads > 1 && THREADS >= 2 * P.threads) S.logerrprint("Warning: This run includes BLAS/LAPACK linear algebra operations which\ncurrently disregard the --threads limit.  If this is problematic, you may want\nto recompile against single-threaded BLAS/LAPACK.\n");

    // work on the included samples from here on
    var cur = subsetDataset(ds, sIdx, indices(mIn));
    var mIdx0 = indices(mIn);
    var fm = P.nonfounders ? allMask(cur.n) : founderMask(cur), nF = count(founderMask(cur));
    S.ww("Before main variant filters, " + nF + " founder" + sp(nF) + " and " + (cur.n - nF) + " nonfounder" + sp(cur.n - nF) + " present.\n");
    // allele frequencies (founders) and genotyping rate (all samples)
    S.logprint("Calculating allele frequencies...");
    var fr = alleleFreq(cur, { mask: fm }), a2 = fr.a2, rateSum = 0, M = cur.m, geno = cur.geno, N = cur.n;
    var rate = new Float64Array(M);
    for (j = 0; j < M; j++) {
      var nm = 0, base = j * N;
      for (i = 0; i < N; i++) if (geno[base + i] >= 0) nm++;
      var r = nm * (1 / N);
      if (r > 1 - SMALLISH_EPSILON) r = 1;
      rate[j] = r; rateSum += r;
    }
    S.logprint(" done.\n");
    var infix = nS < n ? "in remaining samples " : "";
    if (rateSum <= 0.9999995 * M) S.logprint("Total genotyping rate " + infix + "is " + cG(rateSum / M) + ".\n");
    else if (rateSum === M) S.logprint("Total genotyping rate " + infix + "is exactly 1.\n");
    else S.logprint("Total genotyping rate " + infix + "is in [0.9999995, 1).\n");
    // orientation: A1 becomes the minor allele unless --keep-allele-order
    var rev = new Uint8Array(M);
    if (!P.keepAlleleOrder) for (j = 0; j < M; j++) rev[j] = a2[j] < 0.5 ? 1 : 0;
    var maxsnp = calcMaxsnp(cur.snps, ds.snps);
    var maxfid = 4, maxiid = 4;
    cur.samples.forEach(function (s) { if (s.fid.length > maxfid) maxfid = s.fid.length + 2; if (s.iid.length > maxiid) maxiid = s.iid.length + 2; });
    var W = { maxsnp: maxsnp, maxfid: maxfid, maxiid: maxiid };

    if (c.freq) writeFreq(S, P, cur, a2, fr.nobs, rev, W);
    if (c.missing) writeMissing(S, P, cur, W);
    if (!(c.makeBed || c.hardy || c.prune || c.genome || c.het || c.pca || c.writeSnplist)) return RET.SUCCESS;

    var keep = new Uint8Array(M); keep.fill(1);
    if (P.geno < 1) {
      var gthr = (1.0 - P.geno) * (1 - SMALL_EPSILON), gone = 0;
      for (j = 0; j < M; j++) if (rate[j] < gthr) { keep[j] = 0; gone++; }
      if (gone === M) S.fail(RET.ALL_MARKERS_EXCLUDED, "Error: All variants excluded due to missing genotype data (--geno).\n");
      S.logprint(gone + " variant" + sp(gone) + " removed due to missing genotype data (--geno).\n");
    }
    var pheno = phenoInfo(cur);
    if (c.hardy) {
      writeHardy(S, P, cur, keep, rev, W);
      if (!(c.makeBed || c.prune || c.genome || c.het || c.pca || c.writeSnplist)) return RET.SUCCESS;
    }
    if (P.hwe > 0) {
      var useAll = P.hweAll || !pheno.cc || pheno.controls === 0;
      var hmask = new Uint8Array(cur.n);
      for (i = 0; i < cur.n; i++) hmask[i] = fm[i] && (useAll || cur.samples[i].phen === 1) ? 1 : 0;
      var hthr = P.hwe * (1 - SMALL_EPSILON), hgone = 0, minObs = Infinity, maxObs = 0;
      for (j = 0; j < M; j++) {
        if (!keep[j]) continue;
        var cc = genoCounts(cur, j, hmask), obs = cc[0] + cc[1] + cc[2];
        if (obs < minObs) minObs = obs; if (obs > maxObs) maxObs = obs;
        if (hweExact(cc[1], cc[0], cc[2], !!P.hweMidp) < hthr) { keep[j] = 0; hgone++; }
      }
      if (maxObs * 9 > minObs * 10) S.logerrprint("Warning: --hwe observation counts vary by more than 10%.  Consider using\n--geno, and/or applying different p-value thresholds to distinct subsets of\nyour data.\n");
      if (!count(keep)) S.fail(RET.ALL_MARKERS_EXCLUDED, "Error: All variants removed due to Hardy-Weinberg exact test (--hwe).\n");
      S.logprint("--hwe: " + hgone + " variant" + sp(hgone) + " removed due to Hardy-Weinberg exact test.\n");
    }
    if (P.maf > 0 || P.maxMaf < 0.5) {
      var lo = P.maf * (1 - SMALL_EPSILON), hi = P.maxMaf * (1 + SMALL_EPSILON), mgone = 0;
      for (j = 0; j < M; j++) {
        if (!keep[j]) continue;
        var mf = mafOf(a2[j]);
        if (mf < lo || mf > hi) { keep[j] = 0; mgone++; }
      }
      if (!count(keep)) S.fail(RET.ALL_MARKERS_EXCLUDED, "Error: All variants removed due to minor allele threshold(s)\n(--maf/--max-maf/--mac/--max-mac).\n");
      S.ww(mgone + " variant" + sp(mgone) + " removed due to minor allele threshold(s) (--maf/--max-maf/--mac/--max-mac).\n");
    }
    var kIdx = indices(keep);
    S.ww(kIdx.length + " variant" + sp(kIdx.length) + " and " + cur.n + " " + people(cur.n) + " pass filters and QC.\n");
    phenoSummary(S, pheno, cur.n);

    // final dataset for the commands
    var fin = subsetDataset(cur, null, kIdx);
    var fa2 = new Float64Array(kIdx.length), frev = new Uint8Array(kIdx.length);
    for (j = 0; j < kIdx.length; j++) { fa2[j] = a2[kIdx[j]]; frev[j] = rev[kIdx[j]]; }
    var ffm = P.nonfounders ? allMask(fin.n) : founderMask(fin);
    var outname = P.outname;

    if (c.pca) {
      var R = grm(fin, { mask: ffm, freqA2: fa2 });
      S.logprint("Relationship matrix calculation complete.\n");
      if (R.monomorphic) S.logerrprint("Warning: Monomorphic variant(s) present; this implies GRM-destabilizing very\nrare variants are also present.  You should almost certainly apply a MAF filter\nand rerun this calculation, instead of using results from the current run.\n");
      if (R.allMissing) S.logerrprint("Warning: Sample(s) present with no genotype data.  Use --mind to filter them\nout.\n");
      var pc = P.pcaCount || 20, autoCt = R.markers;
      if (pc > fin.n || pc > autoCt) {
        if (fin.n <= autoCt) { pc = fin.n; S.logerrprint("Warning: calculating " + pc + " PCs, since there are only " + pc + " samples.\n"); }
        else { pc = autoCt; S.logerrprint("Warning: calculating " + pc + " PCs, since there are only " + pc + " autosomal markers.\n"); }
      }
      var EV = eigenTop(R.matrix, R.n, pc), delim = P.pcaTabs ? "\t" : " ";
      var ev = "";
      for (var t = 0; t < pc; t++) ev += g6(EV.values[t]) + "\n";
      S.write(outname + ".eigenval", ev);
      var vec = P.pcaHeader ? "FID" + delim + "IID" + (function () { var h = ""; for (var u = 1; u <= pc; u++) h += delim + "PC" + u; return h; })() + "\n" : "";
      for (i = 0; i < fin.n; i++) {
        var line = fin.samples[i].fid + delim + fin.samples[i].iid;
        for (t = 0; t < pc; t++) line += delim + g6(EV.vectors[t][i]);
        vec += line + "\n";
      }
      S.write(outname + ".eigenvec", vec);
      S.ww("--pca: Results saved to " + outname + ".eigenval and " + outname + ".eigenvec .\n");
    }
    if (c.writeSnplist) {
      S.write(outname + ".snplist", fin.snps.map(function (s) { return s.id + "\n"; }).join(""));
      S.ww("List of variant IDs written to " + outname + ".snplist .\n");
    }
    if (c.makeBed) {
      S.ww5("--make-bed to " + outname + ".bed + " + outname + ".bim + " + outname + ".fam ... ");
      var bim = "";
      for (j = 0; j < fin.m; j++) bim += bimLine(fin.snps[j], frev[j]);
      var fam = fin.samples.map(function (s) { return famLine(s, fin.phenoType); }).join("");
      S.write(outname + ".bed", encodeBed(fin.geno, fin.n, fin.m, frev));
      S.write(outname + ".bim", bim);
      S.write(outname + ".fam", fam);
      S.logprint("done.\n");
    }
    if (c.prune) {
      if (count(ffm) < 2) {
        S.logerrprint("Warning: Skipping --indep-pairwise since there are less than two founders.\n(--make-founders may come in handy here.)\n");
      } else {
        var pr = indepPairwise(fin, { window: P.prune.window, step: P.prune.step, r2: P.prune.r2, kb: P.prune.kb, mask: ffm, freqA2: fa2 });
        var totPruned = 0;
        pr.perChrom.forEach(function (pc2) {
          S.logprint("Pruned " + pc2.pruned + " variant" + sp(pc2.pruned) + " from chromosome " + pc2.chr + ", leaving " + pc2.left + ".\n");
          totPruned += pc2.pruned;
        });
        var pin = "", pout = "";
        for (j = 0; j < fin.m; j++) { if (pr.pruned[j]) pout += fin.snps[j].id + "\n"; else pin += fin.snps[j].id + "\n"; }
        S.logprint("Pruning complete.  " + totPruned + " of " + fin.m + " variants removed.\n");
        S.write(outname + ".prune.in", pin);
        S.write(outname + ".prune.out", pout);
        S.ww("Marker lists written to " + outname + ".prune.in and " + outname + ".prune.out .\n");
      }
    }
    if (c.genome) writeGenome(S, P, fin, ffm, fa2, W, pheno);
    if (c.het) writeHet(S, P, fin, ffm, fa2, W);
    return RET.SUCCESS;
  }

  function count(mask) { var k = 0; for (var i = 0; i < mask.length; i++) if (mask[i]) k++; return k; }
  function indices(mask) { var a = []; for (var i = 0; i < mask.length; i++) if (mask[i]) a.push(i); return a; }
  function calcMaxsnp(snps, allSnps) {
    var maxLen = 0; allSnps.forEach(function (s) { if (s.id.length > maxLen) maxLen = s.id.length; });
    var w = 4;
    for (var j = 0; j < snps.length; j++) { var l = snps[j].id.length; if (l > w) { w = l + 2; if (w >= maxLen) return w; } }
    return w;
  }
  function phenoInfo(ds) {
    var nm = 0, cases = 0, controls = 0;
    ds.samples.forEach(function (s) { if (s.phen !== -9) { nm++; if (s.phen === 2) cases++; else if (s.phen === 1) controls++; } });
    return { nm: nm, cases: cases, controls: controls, cc: ds.phenoType !== "qt" };
  }
  function phenoSummary(S, ph, n) {
    if (!n) return;
    if (!ph.nm) S.logprint("Note: No phenotypes present.\n");
    else if (ph.cc) {
      var t = "Among remaining phenotypes, " + ph.cases + " " + (ph.cases === 1 ? "is a case" : "are cases") + " and " + ph.controls + " " + (ph.controls === 1 ? "is a control" : "are controls") + ".";
      if (ph.nm !== n) t += "  (" + (n - ph.nm) + " phenotype" + (n - ph.nm === 1 ? " is" : "s are") + " missing.)";
      S.ww(t + "\n");
    } else S.logprint("Phenotype data is quantitative.\n");
  }

  /* ---- report writers ---- */
  function chrW(chr) { return padL(String(chr), 4); }
  function writeFreq(S, P, ds, a2, nobs, rev, W) {
    var out = " CHR " + padL("SNP", W.maxsnp) + "   A1   A2          MAF  NCHROBS\n";
    for (var j = 0; j < ds.m; j++) {
      var s = ds.snps[j], f1 = rev[j] ? a2[j] : 1 - a2[j];
      out += chrW(s.chr) + " " + padL(s.id, W.maxsnp) + " " + padL(rev[j] ? s.a2 : s.a1, 4) + " " + padL(rev[j] ? s.a1 : s.a2, 4) + " " +
        (nobs[j] ? g4(f1, 12) : padL("NA", 12)) + " " + padL(nobs[j], 8) + "\n";
    }
    S.write(P.outname + ".frq", out);
    S.ww("--freq: Allele frequencies (" + (P.nonfounders ? "all samples" : "founders only") + ") written to " + P.outname + ".frq .\n");
  }
  function writeMissing(S, P, ds, W) {
    var mc = missingCounts(ds), n = ds.n, m = ds.m;
    var im = padL("FID", W.maxfid) + " " + padL("IID", W.maxiid) + " MISS_PHENO   N_MISS   N_GENO   F_MISS\n";
    for (var i = 0; i < n; i++) {
      var s = ds.samples[i];
      im += padL(s.fid, W.maxfid) + " " + padL(s.iid, W.maxiid) + "          " + (s.phen === -9 ? "Y" : "N") + " " + padL(mc.sample[i], 8) + " " + padL(m, 8) + " " + g4(mc.sample[i] / m, 8) + "\n";
    }
    var lm = " CHR " + padL("SNP", W.maxsnp) + "   N_MISS   N_GENO   F_MISS\n";
    for (var j = 0; j < m; j++) {
      lm += chrW(ds.snps[j].chr) + " " + padL(ds.snps[j].id, W.maxsnp) + " " + padL(mc.snp[j], 8) + " " + padL(n, 8) + " " + g4(mc.snp[j] / n, 8) + "\n";
    }
    S.write(P.outname + ".imiss", im);
    S.write(P.outname + ".lmiss", lm);
    S.ww("--missing: Sample missing data report written to " + P.outname + ".imiss, and variant-based missing data report written to " + P.outname + ".lmiss.\n");
  }
  function writeHardy(S, P, ds, keep, rev, W) {
    var name = P.outname + ".hwe";
    S.ww5("--hardy: Writing Hardy-Weinberg report (" + (P.nonfounders ? "all samples" : "founders only") + ") to " + name + " ... ");
    var sub = subsetDataset(ds, null, indices(keep)), rows = hardy(sub, { midp: !!P.hardyMidp, nonfounders: !!P.nonfounders });
    var kidx = indices(keep), out = " CHR " + padL("SNP", W.maxsnp) + "     TEST   A1   A2                 GENO   O(HET)   E(HET)            P \n";
    rows.forEach(function (row) {
      var j = kidx[row.snp], s = ds.snps[j], rv = rev[j], ct = row.counts;
      var genoTxt = rv ? ct[2] + "/" + ct[1] + "/" + ct[0] : ct[0] + "/" + ct[1] + "/" + ct[2];
      var stats = (ct[0] + ct[1] + ct[2]) ? g4(row.oHet, 8) + " " + g4(row.eHet, 8) + " " + g4(row.p, 12) : "     nan      nan          " + (P.hardyMidp ? "0.5" : "  1");
      out += chrW(s.chr) + " " + padL(s.id, W.maxsnp) + padL(row.test, 9) + " " + padL(rv ? s.a2 : s.a1, 4) + " " + padL(rv ? s.a1 : s.a2, 4) + " " + padL(genoTxt, 20) + " " + stats + "\n";
    });
    S.write(name, out);
    S.logprint("done.\n");
  }
  function writeHet(S, P, ds, fm, a2, W) {
    var res = het(ds, { mask: fm, freqA2: a2, smallSample: !!P.hetSmall });
    if (!res.markers) S.fail(RET.INVALID_CMDLINE, "Error: --het requires at least one polymorphic autosomal marker.\n");
    var out = padL("FID", W.maxfid) + " " + padL("IID", W.maxiid) + "       O(HOM)       E(HOM)        N(NM)            F\n";
    res.rows.forEach(function (r) {
      var s = ds.samples[r.i];
      out += padL(s.fid, W.maxfid) + " " + padL(s.iid, W.maxiid) + "   " +
        (r.nnm ? padL(r.ohom, 10) + " " + g4(r.ehom, 12) + "   " + padL(r.nnm, 10) + " " + g4(r.f, 12) : "         0            0            0          nan") + "\n";
    });
    S.write(P.outname + ".het", out);
    S.ww("--het" + (P.hetSmall ? " small-sample" : "") + ": " + res.markers + " variant" + sp(res.markers) + " scanned, report written to " + P.outname + ".het .\n");
  }
  /* expected PI_HAT from a pedigree (twice the kinship coefficient), for pairs in one family */
  function pedigreeKinship(samples) {
    var byIid = Object.create(null), memo = Object.create(null);
    samples.forEach(function (s, i) { byIid[s.fid + "\t" + s.iid] = i; });
    function par(i, which) { var s = samples[i], id = which ? s.mat : s.pat; if (id === "0") return -1; var k = byIid[s.fid + "\t" + id]; return k === undefined ? -1 : k; }
    function depth(i, seen) { seen = seen || {}; if (i < 0 || seen[i]) return 0; seen[i] = 1; return 1 + Math.max(depth(par(i, 0), seen), depth(par(i, 1), seen)); }
    function phi(a, b) {
      if (a < 0 || b < 0) return 0;
      var key = a < b ? a + "," + b : b + "," + a;
      if (memo[key] !== undefined) return memo[key];
      var v;
      if (a === b) v = 0.5 * (1 + phi(par(a, 0), par(a, 1)));
      else {
        var da = depth(a), db = depth(b);
        if (da < db) { var t = a; a = b; b = t; }
        v = 0.5 * (phi(par(a, 0), b) + phi(par(a, 1), b));
      }
      memo[key] = v;
      return v;
    }
    return function (i, k) { return 2 * phi(i, k); };
  }
  function writeGenome(S, P, ds, fm, a2, W, pheno) {
    var auto = 0; ds.snps.forEach(function (s) { if (isAutosome(s.chr)) auto++; });
    if (auto < ds.m) S.logprint("Excluding " + (ds.m - auto) + " variant" + sp(ds.m - auto) + " on non-autosomes from IBD calculation.\n");
    var res = genome(ds, { mask: fm, freqA2: a2, unbounded: !!P.genomeUnbounded, nudge: !!P.genomeNudge, min: P.genomeMin, max: P.genomeMax });
    S.logprint("IBD calculations complete.\n");
    var mf = W.maxfid, mi = W.maxiid, full = !!P.genomeFull;
    var out = padL(" FID1", mf) + padL(" IID1", mi) + padL(" FID2", mf) + padL(" IID2", mi) + " RT    EZ      Z0      Z1      Z2  PI_HAT PHE       DST     PPC   RATIO" +
      (full ? "    IBS0    IBS1    IBS2  HOMHOM  HETHET" : "") + "\n";
    var kin = null;
    res.pairs.forEach(function (p) {
      var A = ds.samples[p.i], B = ds.samples[p.k], rel;
      if (A.fid === B.fid) {
        var fa = fm[p.i], fb = fm[p.k], rt = "OT ";
        if (!fa && !fb && A.pat === B.pat && A.mat === B.mat) rt = "FS ";
        else if (!fa && !fb && (A.pat === B.pat || A.mat === B.mat)) rt = "HS ";
        else if (A.pat === B.iid || A.mat === B.iid || B.pat === A.iid || B.mat === A.iid) rt = "PO ";
        if (!kin) kin = pedigreeKinship(ds.samples);
        var ez = (fa && fb) ? 0 : kin(p.i, p.k);
        rel = rt + padL(g6(ez), 5);
      } else {
        if (P.genomeRelCheck) return;
        rel = "UN    NA";
      }
      var phe;
      if (pheno.cc) {
        var ca = A.phen === 2, cb = B.phen === 2;
        phe = (!ca && !cb) ? "  -1 " : (ca && cb) ? "   1 " : "   0 ";
      } else phe = "  NA ";
      var line = " " + padL(A.fid, mf - 1) + " " + padL(A.iid, mi - 1) + " " + padL(B.fid, mf - 1) + " " + padL(B.iid, mi - 1) + " " + rel +
        " " + f7p4(p.z0) + " " + f7p4(p.z1) + " " + f7p4(p.z2) + " " + f7p4(p.pihat) + phe + f9p6(p.dst) + " " +
        (p.ppc !== p.ppc ? "     NA " : f7p4(p.ppc) + " ") + (p.homhom ? f7p4(p.ratio) : "     NA");
      if (full) line += " " + padL(p.ibs0, 7) + " " + padL(p.ibs1, 7) + " " + padL(p.ibs2, 7) + " " + f7p4(p.homhom) + " " + f7p4(p.hethet);
      out += line + "\n";
    });
    S.write(P.outname + ".genome", out);
    S.ww("Finished writing " + P.outname + ".genome .\n");
  }

  /* ====================================================================================
     8. --bmerge
     ==================================================================================== */
  function famFields(S, text, which) {
    var f = parseFam(text);
    if (f.error) S.fail(RET.INVALID_FORMAT, f.error.replace(".fam file", "." + "fam file"));
    return f;
  }
  function bmerge(S, P, bedA, bimA, famA) {
    var c = P.calc, out = c.makeBed ? P.outname + "-merge" : P.outname;
    var bedB = P.bmerge[0], bimB = P.bmerge[1], famB = P.bmerge[2];
    // read both filesets (PLINK reads the .fam files first)
    var famTextA = S.readOrFail(famA, false), famTextB = S.readOrFail(famB, false);
    var fa = famFields(S, famTextA), fb = famFields(S, famTextB);
    var dichot = fa.phenoType === "cc" && fb.phenoType === "cc";
    var idx = Object.create(null), merged = [];
    function addSamples(list, tag) {
      var neu = 0;
      list.forEach(function (s, k) {
        var key = s.fid + "\t" + s.iid;
        if (idx[key] === undefined) { idx[key] = merged.length; merged.push({ fid: s.fid, iid: s.iid, pat: s.pat, mat: s.mat, sex: s.sex, phen: s.phen }); neu++; }
      });
      return neu;
    }
    addSamples(fa.samples);
    S.ww(fa.samples.length + " " + people(fa.samples.length) + " loaded from " + famA + ".\n");
    var newB = addSamples(fb.samples);
    S.ww(fb.samples.length + " " + people(fb.samples.length) + " to be merged from " + famB + ".\n");
    S.logprint("Of these, " + newB + " " + (newB === 1 ? "is" : "are") + " new, while " + (fb.samples.length - newB) + " " + (fb.samples.length - newB === 1 ? "is" : "are") + " present in the base dataset.\n");
    // natural sort of the merged samples by FID, IID
    var order = merged.map(function (s, k) { return k; });
    order.sort(function (x, y) { return natCompare(merged[x].fid + "\t" + merged[x].iid, merged[y].fid + "\t" + merged[y].iid); });
    var sorted = order.map(function (k) { return merged[k]; }), newPos = new Int32Array(merged.length);
    order.forEach(function (k, pos) { newPos[k] = pos; });
    var famOut = sorted.map(function (s) {
      var ph = s.phen === -9 ? "-9" : (dichot ? String(s.phen) : cG(s.phen));
      return s.fid + "\t" + s.iid + "\t" + s.pat + "\t" + s.mat + "\t" + s.sex + "\t" + ph + "\n";
    }).join("");
    // PLINK writes the merged .fam now; it stays behind if the merge fails, and with --make-bed the
    // merged fileset is temporary (deleted at the end of the run), so the emulator writes it only in
    // those cases where it would remain on disk.
    // .bim scan
    var bimTextA = S.readOrFail(bimA, false), bimTextB = S.readOrFail(bimB, false);
    var ba = parseBim(bimTextA), bb = parseBim(bimTextB);
    if (ba.error) S.fail(RET.INVALID_FORMAT, ba.error, ba.ww);
    if (bb.error) S.fail(RET.INVALID_FORMAT, bb.error, bb.ww);
    var vidx = Object.create(null), vars = [], dupFirst = false, nonBi = Object.create(null), nonBiList = [];
    var posWarn = 0, posWarnLog = [];
    function addVariants(list, first) {
      var neu = 0, seenHere = Object.create(null);
      list.forEach(function (s) {
        if (first && seenHere[s.id]) dupFirst = true;
        seenHere[s.id] = 1;
        var k = vidx[s.id];
        if (k === undefined) {
          vidx[s.id] = vars.length;
          vars.push({ id: s.id, chr: s.chr, bp: s.bp, cm: s.cm, al: [s.a1 === "0" ? null : s.a1, s.a2 === "0" ? null : s.a2] });
          neu++;
          return;
        }
        var v = vars[k];
        if (v.chr !== s.chr) S.errww("Warning: Multiple chromosomes seen for variant '" + s.id + "'.\n");
        else if (v.bp !== s.bp) {
          posWarn++;
          var w = "Warning: Multiple positions seen for variant '" + s.id + "'.\n";
          if (posWarn <= 3) S.logerrprint(w); else S.log(w);
        }
        [s.a1, s.a2].forEach(function (al) {
          if (al === "0") return;
          if (v.al[0] === al || v.al[1] === al) return;
          if (v.al[0] === null) v.al[0] = al;
          else if (v.al[1] === null) v.al[1] = al;
          else if (!nonBi[s.id]) { nonBi[s.id] = 1; nonBiList.push(s.id); }
        });
      });
      return neu;
    }
    var neuA = addVariants(ba.snps, true);
    if (dupFirst) S.logerrprint("Warning: First fileset to be merged contains duplicate variant ID(s).  Variants\nwith matching IDs are all merged together; if this is not what you want (e.g.\nyou have a bunch of novel variants, all with ID \".\"), assign distinct IDs to\nthem (with e.g. --set-missing-var-ids) before rerunning this merge.\n");
    S.ww(neuA + " marker" + sp(neuA) + " loaded from " + bimA + ".\n");
    var neuB = addVariants(bb.snps, false);
    S.ww(bb.snps.length + " marker" + sp(bb.snps.length) + " to be merged from " + bimB + ".\n");
    S.logprint("Of these, " + neuB + " " + (neuB === 1 ? "is" : "are") + " new, while " + (bb.snps.length - neuB) + " " + (bb.snps.length - neuB === 1 ? "is" : "are") + " present in the base dataset.\n");
    if (posWarn > 3) S.err((posWarn - 3) + " more multiple-position warning" + sp(posWarn - 3) + ": see log file.\n");
    if (nonBiList.length) {
      nonBiList.sort(strcmp);
      S.write(out + ".fam", famOut);
      S.write(out + ".missnp", nonBiList.map(function (x) { return x + "\n"; }).join(""));
      S.logerrprint("Error: " + nonBiList.length + " variant" + sp(nonBiList.length) + " with 3+ alleles present.\n* If you believe this is due to strand inconsistency, try --flip with\n  " + out + ".missnp.\n  (Warning: if the subsequent merge seems to work, strand errors involving SNPs\n  with A/T or C/G alleles probably remain in your data.  If LD between nearby\n  SNPs is high, --flip-scan should detect them.)\n* If you are dealing with genuine multiallelic variants, we recommend exporting\n  that subset of the data to VCF (via e.g. '--recode vcf'), merging with\n  another tool/script, and then importing the result; PLINK is not yet suited\n  to handling them.\nSee https://www.cog-genomics.org/plink/1.9/data#merge3 for more discussion.\n");
      throw new PlinkExit(RET.INVALID_FORMAT);
    }
    // sort variants: chromosome, position, then ID
    var vorder = vars.map(function (v, k) { return k; });
    vorder.sort(function (x, y) { var a = vars[x], b = vars[y]; return a.chr - b.chr || a.bp - b.bp || strcmp(a.id, b.id); });
    for (var q = 1; q < vorder.length; q++) {
      var va = vars[vorder[q - 1]], vb = vars[vorder[q]];
      if (va.chr === vb.chr && va.bp === vb.bp) {
        posWarn++;
        var w2 = "Warning: Variants '" + va.id + "' and '" + vb.id + "' have the same position.\n";
        if (posWarn <= 3) S.logerrprint(w2); else S.log(w2);
      }
    }
    var NS = sorted.length, NM = vars.length, vpos = new Int32Array(NM);
    vorder.forEach(function (k, pos) { vpos[k] = pos; });
    S.logprint("Performing single-pass merge (" + NS + " " + people(NS) + ", " + NM + " variant" + sp(NM) + ").\n");
    // genotypes: count of al[0] alleles, filled from each fileset (mode 1: missing never overwrites,
    // conflicting calls become missing)
    var G = new Int8Array(NS * NM); G.fill(-1);
    var written = new Uint8Array(NS * NM);
    function fill(bedName, bimSnps, famSamples, isFirst) {
      var bytes = S.read(bedName, true);
      if (bytes == null) { S.errww("Error: Failed to open " + bedName + ".\n"); throw new PlinkExit(RET.OPEN_FAIL); }
      var msg = checkBed(bytes, famSamples.length, bimSnps.length);
      if (msg) S.fail(RET.INVALID_FORMAT, msg);
      var gg = decodeBed(bytes, famSamples.length, bimSnps.length), nn = famSamples.length;
      var sMap = famSamples.map(function (s) { return newPos[idx[s.fid + "\t" + s.iid]]; });
      bimSnps.forEach(function (s, j) {
        var k = vidx[s.id], v = vars[k], col = vpos[k], same = (s.a1 === v.al[0]) || (s.a1 === "0" && s.a2 === v.al[1]) || (s.a2 === v.al[0] && false);
        var swap = !(s.a1 === v.al[0] || (s.a1 === "0" && s.a2 !== v.al[0]));
        for (var i = 0; i < nn; i++) {
          var g = gg[j * nn + i];
          if (g >= 0 && swap) g = 2 - g;
          var cell = col * NS + sMap[i];
          if (!written[cell]) { G[cell] = g; if (g >= 0 || isFirst) written[cell] = g >= 0 ? 1 : 0; }
          else if (g >= 0 && G[cell] !== g) { G[cell] = -1; }
        }
      });
    }
    fill(bedA, ba.snps, fa.samples, true);
    fill(bedB, bb.snps, fb.samples, false);
    // final orientation: A1 = the allele with fewer homozygous calls (unless --keep-allele-order)
    var snps = [], geno = new Int8Array(NS * NM);
    for (var pos = 0; pos < NM; pos++) {
      var v2 = vars[vorder[pos]], homFirst = 0, homSecond = 0, base = pos * NS;
      for (var i2 = 0; i2 < NS; i2++) { var gv = G[base + i2]; if (gv === 2) homFirst++; else if (gv === 0) homSecond++; }
      var a1 = v2.al[0] === null ? "0" : v2.al[0], a2 = v2.al[1] === null ? "0" : v2.al[1];
      var rv = !P.keepAlleleOrder && homSecond < homFirst;
      for (i2 = 0; i2 < NS; i2++) { var gx = G[base + i2]; geno[base + i2] = (rv && gx >= 0) ? 2 - gx : gx; }
      snps.push({ chr: v2.chr, id: v2.id, cm: v2.cm, bp: v2.bp, a1: rv ? a2 : a1, a2: rv ? a1 : a2 });
    }
    var bimOut = snps.map(function (s) { return s.chr + "\t" + s.id + "\t" + cG(s.cm) + "\t" + s.bp + "\t" + s.a1 + "\t" + s.a2 + "\n"; }).join("");
    var phenoType = dichot ? "cc" : "qt";
    if (!c.makeBed) {
      S.write(out + ".fam", famOut);
      S.write(out + ".bed", encodeBed(geno, NS, NM, null));
      S.write(out + ".bim", bimOut);
      S.ww("Merged fileset written to " + out + ".bed + " + out + ".bim + " + out + ".fam .\n");
      return { done: true };
    }
    // With --make-bed the merged fileset (<out>-merge.*) is the input of the rest of the run and is
    // deleted at the end; the emulator keeps it in memory, and removes any older <out>-merge.* files
    // (such as the .fam left by a failed merge) when the io offers remove().
    S.ww("Merged fileset written to " + out + ".bed + " + out + ".bim + " + out + ".fam .\n");
    S.removeAtEnd = [out + ".bed", out + ".bim", out + ".fam"];
    var famSamples = sorted.map(function (s) { return { fid: s.fid, iid: s.iid, pat: s.pat, mat: s.mat, sex: s.sex, phen: s.phen }; });
    return { done: false, fileset: { snps: snps, samples: famSamples, phenoType: phenoType, geno: geno, bed: null, bedMsg: null, n: NS, m: NM } };
  }
  function reportFam(S, P, fs) {
    var n = fs.n, males = 0, females = 0, amb = 0;
    fs.samples.forEach(function (s) { if (s.sex === 1) males++; else if (s.sex === 2) females++; else amb++; });
    if (amb) {
      S.logprint(n + " " + people(n) + " (" + males + " male" + sp(males) + ", " + females + " female" + sp(females) + ", " + amb + " ambiguous) loaded from .fam.\n");
      S.write(P.outname + ".nosex", fs.samples.filter(function (s) { return !s.sex; }).map(function (s) { return s.fid + "\t" + s.iid + "\n"; }).join(""));
      S.ww("Ambiguous sex ID" + sp(amb) + " written to " + P.outname + ".nosex .\n");
    } else S.logprint(n + " " + people(n) + " (" + males + " male" + sp(males) + ", " + females + " female" + sp(females) + ") loaded from .fam.\n");
    var ph = fs.samples.filter(function (s) { return s.phen !== -9; }).length;
    if (ph) S.logprint(ph + " phenotype value" + sp(ph) + " loaded from .fam.\n");
  }

  /* ====================================================================================
     9. Exports
     ==================================================================================== */
  var stats = {
    hweExact: hweExact,
    founderMask: founderMask,
    genoCounts: genoCounts,
    alleleFreq: alleleFreq,
    missingCounts: missingCounts,
    hardy: hardy,
    hardyStats: hardyStats,
    r2: r2,
    indepPairwise: indepPairwise,
    genome: genome,
    het: het,
    grm: grm,
    eigenSym: eigenSym,
    eigenTop: eigenTop,
    pca: pca,
    normdist: normdist,
    subsetDataset: subsetDataset
  };
  var format = { g4: g4, g6: g6, f7p4: f7p4, f9p6: f9p6, cG: cG, wordwrap: wordwrap, natCompare: natCompare };
  var PlinkCore = {
    version: VERSION,
    run: run,
    readBfile: readBfile,
    writeBfile: writeBfile,
    stats: stats,
    format: format,
    constants: { SMALL_EPSILON: SMALL_EPSILON, EPSILON: EPSILON, RET: RET }
  };
  if (typeof module !== "undefined" && module.exports) module.exports = PlinkCore;
  if (typeof window !== "undefined") window.PlinkCore = PlinkCore;
  else if (root) root.PlinkCore = PlinkCore;
})(this);
