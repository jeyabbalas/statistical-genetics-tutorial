/* tools-plink-builder.js — "Build a PLINK 1.9 command" widget on tools.html (#plink-builder).

   The reader picks an input fileset, operations (filters, reports, data management) and an output
   prefix. The widget shows:
     - the command, with the flags in the order the reader ticked them (PLINK ignores that order);
     - the files PLINK reads and the files it writes (names from the PLINK 1.9 output file list,
       https://www.cog-genomics.org/plink/1.9/output);
     - the order in which PLINK applies the chosen operations, which is fixed by PLINK 1.9's order of
       operations (https://www.cog-genomics.org/plink/1.9/order), not by the command line;
     - what each chosen flag does, with its default (PLINK 1.9 documentation);
     - notes on interactions, for example that --mind runs before --geno within one command.
   Merge file names follow PLINK 1.9's source (plink.c): with --make-bed the merged fileset is first
   written as PREFIX-merge.* (deleted at the end) and a failed merge writes PREFIX-merge.missnp;
   without --make-bed the merge writes PREFIX.bed/.bim/.fam directly and a failure PREFIX.missnp.
   No genotype data are processed and nothing is computed from data. No libraries, no network.
   In Node (no document), the pure function build(state) is exposed as globalThis.PLINK_BUILDER_TEST. */
(function () {
  "use strict";

  /* ---------------- Data: filesets, files and flags ---------------- */
  var QC = "${analysis_dir}/penncath.geno0.01.mind0.01";
  var REF = "${reference_dir}/all_pops_1kgenomes_markersForPCA";
  var INPUTS = [
    { id: "raw", path: "${input_dir}/penncath", label: "penncath — the raw input (1,401 people, 861,473 SNPs)" },
    { id: "geno", path: "${analysis_dir}/penncath.geno0.01", label: "penncath.geno0.01 — after the variant missingness filter" },
    { id: "qc", path: QC, label: "penncath.geno0.01.mind0.01 — after both missingness filters" },
    { id: "flip", path: QC + "_flipSNPs", label: "…_flipSNPs — strand-flipped for the merge" },
    { id: "merged", path: QC + ".merge1kgenomes", label: "….merge1kgenomes — PennCATH + 1000 Genomes" },
    { id: "unique", path: QC + ".uniqueIDs", label: "….uniqueIDs — unique IDs for GrafAnc" },
    { id: "toy", path: "${input_dir}/toy", label: "toy — the in-browser lab's dataset" }
  ];
  var FILE_CHOICES = {
    extract: [QC + ".prune.in"],
    remove: ["${analysis_dir}/samples_to_remove.txt"],
    bmerge: [REF],
    flip: [QC + ".merge1kgenomes-merge.missnp"],
    updateIds: ["${analysis_dir}/penncath.updateIDs.txt"]
  };

  // stage = position in PLINK 1.9's order of operations (only relative order matters).
  var FLAGS = {
    bmerge: { flag: "--bmerge", group: "data", stage: 20, doc: "https://www.cog-genomics.org/plink/1.9/data#merge",
      what: "Merges a second binary fileset (here the 1000 Genomes reference panel) into the input: the result has the union of the people and the union of the variants. If a variant would end up with more than two alleles, the merge fails: PLINK lists those variants in a .missnp file and exits with an error status.",
      def: "Takes a fileset prefix, or the three file names .bed .bim .fam (the practical writes the three names)." },
    flip: { flag: "--flip", group: "data", stage: 40, doc: "https://www.cog-genomics.org/plink/1.9/data#flip",
      what: "Rewrites the alleles of the listed variants on the other DNA strand: A↔T and C↔G. The file has one variant ID per line.",
      def: "The flip lasts only for this run unless --make-bed saves the result." },
    extract: { flag: "--extract", group: "filter", stage: 50, doc: "https://www.cog-genomics.org/plink/1.9/filter#snp",
      what: "Keeps only the variants whose IDs are listed in the file (one ID per line); every other variant is dropped for this run.",
      def: "No default; the practical passes the .prune.in list from --indep-pairwise." },
    updateIds: { flag: "--update-ids", group: "data", stage: 60, doc: "https://www.cog-genomics.org/plink/1.9/data#update_indiv",
      what: "Replaces sample IDs. Each line of the file has four fields: old family ID, old within-family ID, new family ID, new within-family ID.",
      def: "Cannot be combined with --update-parents or --update-sex. Saved only with --make-bed." },
    remove: { flag: "--remove", group: "filter", stage: 70, doc: "https://www.cog-genomics.org/plink/1.9/filter#indiv",
      what: "Drops the people listed in the file (family ID and within-family ID on each line). --keep does the opposite.",
      def: "No default. You write this file yourself in the exercise." },
    mind: { flag: "--mind", group: "filter", stage: 80, num: "mind", doc: "https://www.cog-genomics.org/plink/1.9/filter#missing",
      what: "Removes people whose missing-call rate (the share of variants with no genotype call) is greater than the threshold. If anyone is removed, their IDs are written to PREFIX.irem.",
      def: "Default threshold 0.1 when no number is given. The practical uses 0.01." },
    missing: { flag: "--missing", group: "report", stage: 100, doc: "https://www.cog-genomics.org/plink/1.9/basic_stats#missing",
      what: "Writes two reports: PREFIX.imiss with one row per person and PREFIX.lmiss with one row per variant, each with the number of missing calls (N_MISS) and the missing rate (F_MISS). It removes nothing.",
      def: "No parameters." },
    geno: { flag: "--geno", group: "filter", stage: 110, num: "geno", doc: "https://www.cog-genomics.org/plink/1.9/filter#missing",
      what: "Removes variants whose missing-call rate (the share of people with no call) is greater than the threshold.",
      def: "Default threshold 0.1 when no number is given. The practical uses 0.01, and 0.1 after the merge." },
    hardy: { flag: "--hardy", group: "report", stage: 120, doc: "https://www.cog-genomics.org/plink/1.9/basic_stats#hardy",
      what: "Writes PREFIX.hwe: for each variant, the genotype counts, observed and expected heterozygosity and the Hardy–Weinberg exact-test p-value. With a case/control phenotype there are three rows per variant: ALL, AFF (phenotype code 2, cases) and UNAFF (code 1, controls). It removes nothing.",
      def: "Uses founders only." },
    hwe: { flag: "--hwe", group: "filter", stage: 121, num: "hwe", doc: "https://www.cog-genomics.org/plink/1.9/filter#hwe",
      what: "Removes variants whose Hardy–Weinberg exact-test p-value is below the threshold. With a case/control phenotype, only the controls (code 1) are tested unless you add the 'include-nonctrl' modifier.",
      def: "Needs a threshold. Not used in the practical's main steps; the exercise asks you to choose one." },
    maf: { flag: "--maf", group: "filter", stage: 130, num: "maf", doc: "https://www.cog-genomics.org/plink/1.9/filter#maf",
      what: "Removes variants whose minor allele frequency, computed in founders, is below the threshold.",
      def: "Default threshold 0.01 when no number is given. The practical uses 0.05 before PCA." },
    pca: { flag: "--pca", group: "report", stage: 140, num: "pca", optionalNum: true, doc: "https://www.cog-genomics.org/plink/1.9/strat#pca",
      what: "Computes principal components of the variance-standardized genetic relationship matrix. Writes PREFIX.eigenvec (family ID, individual ID, then one column per component, no header line) and PREFIX.eigenval (one eigenvalue per line).",
      def: "Default 20 components. Add 'header' to get a header line in .eigenvec." },
    makeBed: { flag: "--make-bed", group: "data", stage: 150, doc: "https://www.cog-genomics.org/plink/1.9/data#make_bed",
      what: "Writes the people and variants that are left after every filter as a new binary fileset PREFIX.bed, PREFIX.bim and PREFIX.fam.",
      def: "No parameters. Without it (or another output command), filters have no lasting effect." },
    indep: { flag: "--indep-pairwise", group: "report", stage: 160, doc: "https://www.cog-genomics.org/plink/1.9/ld#indep",
      what: "LD pruning: moves a window of W variants along each chromosome, S variants at a time, and inside each window drops one variant from every pair with r² greater than the threshold. Writes the kept IDs to PREFIX.prune.in and the dropped IDs to PREFIX.prune.out. It does not change the data in this run.",
      def: "Three parameters: window size (variants, or kb with a 'kb' suffix), step (variants) and r² threshold. Uses founders only." },
    genome: { flag: "--genome", group: "report", stage: 170, doc: "https://www.cog-genomics.org/plink/1.9/ibd",
      what: "Estimates identity by descent for every pair of people and writes PREFIX.genome: one row per pair with Z0, Z1, Z2 and PI_HAT. For n people that is n(n − 1)/2 rows.",
      def: "Uses autosomes only. Does not account for LD, so the practical runs it on the pruned variants." },
    het: { flag: "--het", group: "report", stage: 180, doc: "https://www.cog-genomics.org/plink/1.9/basic_stats#ibc",
      what: "Writes PREFIX.het: for each person, the observed number of homozygous genotypes O(HOM), the number expected from the allele frequencies E(HOM), the number of non-missing genotypes N(NM) and the inbreeding estimate F = (O(HOM) − E(HOM)) / (N(NM) − E(HOM)).",
      def: "Uses autosomes only. Does not account for LD, so the practical runs it on the pruned variants." }
  };
  var GROUPS = [
    { id: "filter", title: "Filters (remove people or variants)", keys: ["geno", "mind", "maf", "hwe", "extract", "remove"] },
    { id: "report", title: "Reports (write a table, change nothing)", keys: ["missing", "hardy", "indep", "genome", "het", "pca"] },
    { id: "data", title: "Data management", keys: ["makeBed", "bmerge", "flip", "updateIds"] }
  ];
  var DEFAULT_PARAMS = { geno: "0.01", mind: "0.01", maf: "0.05", hwe: "1e-6", pca: "", ipW: "50", ipS: "5", ipR: "0.3",
    extract: FILE_CHOICES.extract[0], remove: FILE_CHOICES.remove[0], bmerge: FILE_CHOICES.bmerge[0],
    flip: FILE_CHOICES.flip[0], updateIds: FILE_CHOICES.updateIds[0] };

  var PRESETS = [
    { id: "s1a", label: "Step 1 · missingness report", input: "raw", sel: ["missing"], out: "${analysis_dir}/penncath" },
    { id: "s1b", label: "Step 1 · variant filter --geno 0.01", input: "raw", sel: ["geno", "makeBed"], out: "${analysis_dir}/penncath.geno0.01" },
    { id: "s1c", label: "Step 1 · sample filter --mind 0.01", input: "geno", sel: ["mind", "makeBed"], out: QC },
    { id: "both", label: "Not in the practical · --geno and --mind in one command", input: "raw", sel: ["geno", "mind", "makeBed"], out: "${analysis_dir}/penncath.onepass" },
    { id: "s2", label: "Step 2 · Hardy–Weinberg report", input: "qc", sel: ["hardy"], out: QC },
    { id: "s3", label: "Step 3 · LD pruning", input: "qc", sel: ["indep"], out: QC },
    { id: "s4", label: "Step 4 · relatedness (IBD)", input: "qc", sel: ["extract", "genome"], out: QC + ".LD0.3" },
    { id: "s5", label: "Step 5 · heterozygosity", input: "qc", sel: ["het", "extract"], out: QC + ".LD0.3" },
    { id: "s6", label: "Step 6 · PCA of PennCATH", input: "qc", sel: ["extract", "maf", "pca"], out: QC + ".LD0.3" },
    { id: "s7a", label: "Step 7 · first merge with 1000 Genomes", input: "qc", sel: ["bmerge", "makeBed"], out: QC + ".merge1kgenomes" },
    { id: "s7b", label: "Step 7 · flip the conflicting SNPs", input: "qc", sel: ["flip", "makeBed"], out: QC + "_flipSNPs" },
    { id: "s7c", label: "Step 7 · merge again", input: "flip", sel: ["bmerge", "makeBed"], out: QC + ".merge1kgenomes" },
    { id: "s7d", label: "Step 7 · PCA of the merged data", input: "merged", sel: ["geno", "maf", "pca"], out: QC + ".merge1kgenomes", params: { geno: "0.1" } },
    { id: "s8", label: "Step 8 · unique IDs for GrafAnc", input: "qc", sel: ["updateIds", "makeBed"], out: QC + ".uniqueIDs" },
    { id: "s9", label: "Exercise · HWE filter and sample removal", input: "qc", sel: ["hwe", "remove", "makeBed"], out: QC + ".clean" }
  ];

  /* ---------------- Pure logic ---------------- */
  function inputPath(id) {
    for (var i = 0; i < INPUTS.length; i++) if (INPUTS[i].id === id) return INPUTS[i].path;
    return INPUTS[2].path;
  }
  function has(state, k) { return state.sel.indexOf(k) >= 0; }
  function numOK(v, lo, hi, openLo) {
    var x = Number(v);
    if (String(v).trim() === "" || !isFinite(x)) return false;
    return (openLo ? x > lo : x >= lo) && x <= hi;
  }
  function flagText(state, k) {
    var p = state.params, f = FLAGS[k];
    switch (k) {
      case "geno": case "mind": case "maf": case "hwe": return f.flag + " " + String(p[k]).trim();
      case "pca": return String(p.pca).trim() ? "--pca " + String(p.pca).trim() : "--pca";
      case "indep": return "--indep-pairwise " + [p.ipW, p.ipS, p.ipR].map(function (s) { return String(s).trim(); }).join(" ");
      case "extract": return "--extract " + p.extract;
      case "remove": return "--remove " + p.remove;
      case "flip": return "--flip " + p.flip;
      case "updateIds": return "--update-ids " + p.updateIds;
      case "bmerge": return "--bmerge " + p.bmerge + ".bed " + p.bmerge + ".bim " + p.bmerge + ".fam";
      default: return f.flag;
    }
  }
  function suggestOut(state) {
    var inp = inputPath(state.input);
    var base = inp.replace("${input_dir}/", "${analysis_dir}/");
    if (has(state, "bmerge")) return base.replace(/_flipSNPs$/, "") + ".merge1kgenomes";
    if (has(state, "flip") && has(state, "makeBed")) return base + "_flipSNPs";
    if (has(state, "updateIds") && has(state, "makeBed")) return base + ".uniqueIDs";
    var p = state.params, s = base;
    if (has(state, "makeBed")) {
      if (has(state, "geno")) s += ".geno" + String(p.geno).trim();
      if (has(state, "mind")) s += ".mind" + String(p.mind).trim();
      if (has(state, "maf")) s += ".maf" + String(p.maf).trim();
      if (has(state, "hwe")) s += ".hwe" + String(p.hwe).trim();
      if (has(state, "remove")) s += ".clean";
    }
    if (has(state, "extract") && (has(state, "genome") || has(state, "het") || has(state, "pca"))) s += ".LD0.3";
    return s;
  }

  function build(state) {
    var p = state.params;
    var bfile = inputPath(state.input);
    var out = String(state.out || "").trim();
    var outName = out || "plink";
    var problems = [], notes = [];

    // Validate parameters of chosen flags.
    if (has(state, "geno") && !numOK(p.geno, 0, 1)) problems.push("--geno needs a missing-rate threshold between 0 and 1, for example 0.01.");
    if (has(state, "mind") && !numOK(p.mind, 0, 1)) problems.push("--mind needs a missing-rate threshold between 0 and 1, for example 0.01.");
    if (has(state, "maf") && !numOK(p.maf, 0, 0.5)) problems.push("--maf needs a minor allele frequency between 0 and 0.5, for example 0.05.");
    if (has(state, "hwe") && !numOK(p.hwe, 0, 1, true)) problems.push("--hwe needs a p-value threshold above 0 and at most 1, for example 1e-6.");
    if (has(state, "pca") && String(p.pca).trim() !== "" && !(/^\d+$/.test(String(p.pca).trim()) && +p.pca >= 1)) problems.push("--pca takes a whole number of components (at least 1), or nothing for the default of 20.");
    if (has(state, "indep")) {
      if (!/^\d+(kb)?$/.test(String(p.ipW).trim()) || parseInt(p.ipW, 10) < 2) problems.push("The --indep-pairwise window must be a whole number of variants of at least 2 (or a size in kb, such as 500kb).");
      if (!/^\d+$/.test(String(p.ipS).trim()) || +p.ipS < 1) problems.push("The --indep-pairwise step must be a whole number of variants, at least 1.");
      if (!numOK(p.ipR, 0, 1, true)) problems.push("The --indep-pairwise r² threshold must be above 0 and at most 1.");
    }
    if (/\s/.test(out)) problems.push("The output prefix contains a space. The shell would split it into two words; use a name without spaces (or put it in double quotes).");

    // The command, in the order the reader ticked the flags.
    var parts = ["plink", "--bfile " + bfile];
    state.sel.forEach(function (k) { parts.push(flagText(state, k)); });
    if (out) parts.push("--out " + out);
    var lines = [parts[0] + " " + parts[1]];
    for (var i = 2; i < parts.length; i++) lines.push("      " + parts[i]);
    var command = lines.join(" \\\n");

    // Files read.
    var reads = [
      { name: bfile + ".bed", why: "genotypes (--bfile)" },
      { name: bfile + ".bim", why: "variant table (--bfile)" },
      { name: bfile + ".fam", why: "people table (--bfile)" }
    ];
    if (has(state, "bmerge")) ["bed", "bim", "fam"].forEach(function (x) { reads.push({ name: p.bmerge + "." + x, why: "fileset merged in (--bmerge)" }); });
    if (has(state, "flip")) reads.push({ name: p.flip, why: "variant IDs to flip (--flip)" });
    if (has(state, "extract")) reads.push({ name: p.extract, why: "variant IDs to keep (--extract)" });
    if (has(state, "updateIds")) reads.push({ name: p.updateIds, why: "old and new IDs (--update-ids)" });
    if (has(state, "remove")) reads.push({ name: p.remove, why: "people to drop (--remove)" });

    // Files written.
    var O = outName, writes = [];
    writes.push({ name: O + ".log", why: "always: the command, the counts and any warnings" });
    var mergeOnly = has(state, "bmerge") && state.sel.length === 1;
    if (has(state, "bmerge")) {
      if (has(state, "makeBed")) {
        writes.push({ name: O + "-merge.bed / .bim / .fam", why: "the merged fileset, written first and deleted at the end once --make-bed has written the final files", tmp: true });
        writes.push({ name: O + "-merge.missnp", why: "only if the merge fails: the variants with more than two alleles; no fileset is written then", cond: true });
      } else {
        writes.push({ name: O + ".bed / .bim / .fam", why: "the merged fileset (--bmerge writes it even without --make-bed)" });
        writes.push({ name: O + ".missnp", why: "only if the merge fails: the variants with more than two alleles", cond: true });
      }
    }
    if (has(state, "mind")) writes.push({ name: O + ".irem", why: "only if --mind removes at least one person: their IDs", cond: true });
    if (has(state, "missing")) { writes.push({ name: O + ".imiss", why: "missing calls per person" }); writes.push({ name: O + ".lmiss", why: "missing calls per variant" }); }
    if (has(state, "hardy")) writes.push({ name: O + ".hwe", why: "Hardy–Weinberg report, one row per variant and group" });
    if (has(state, "pca")) { writes.push({ name: O + ".eigenvec", why: "principal-component scores per person (no header)" }); writes.push({ name: O + ".eigenval", why: "eigenvalues" }); }
    if (has(state, "makeBed")) { ["bed", "bim", "fam"].forEach(function (x) { writes.push({ name: O + "." + x, why: "the new fileset (--make-bed)" }); }); }
    if (has(state, "indep")) { writes.push({ name: O + ".prune.in", why: "IDs of variants kept by pruning" }); writes.push({ name: O + ".prune.out", why: "IDs of variants pruned away" }); }
    if (has(state, "genome")) writes.push({ name: O + ".genome", why: "one row per pair of people" });
    if (has(state, "het")) writes.push({ name: O + ".het", why: "one row per person" });
    writes.push({ name: O + ".nosex", why: "automatic, only if some people have no recorded sex", cond: true });

    // What counts as output? Filters alone write nothing but the log.
    var outputs = ["missing", "hardy", "pca", "makeBed", "indep", "genome", "het", "bmerge"];
    var anyOutput = state.sel.some(function (k) { return outputs.indexOf(k) >= 0; });
    if (!anyOutput) {
      notes.push({ level: "bad", text: "Nothing in this command writes a result. PLINK would apply the filters, print \"Warning: No output requested. (Did you forget --make-bed?) Exiting.\" and write only the .log file." });
    }

    // Order of application.
    var steps = [];
    steps.push({ stage: 10, flags: out ? "--out" : "(no --out)", text: "Start the log " + O + ".log; every output file gets the prefix " + O + "." });
    state.sel.forEach(function (k) { steps.push({ stage: FLAGS[k].stage, key: k, flags: flagText(state, k) }); });
    steps.push({ stage: 30, flags: "--bfile", text: has(state, "bmerge") ? "Read the merged fileset (not the original input) for everything that follows." : "Read " + bfile + ".bed, .bim and .fam." });
    var usesFreq = ["maf", "pca", "het", "genome"].some(function (k) { return has(state, k); });
    if (usesFreq) steps.push({ stage: 90, flags: "(automatic)", text: "Compute allele frequencies in the founders that remain; --maf, --pca, --het and --genome use them." });
    steps.sort(function (a, b) { return a.stage - b.stage; });
    var stepText = {
      bmerge: "Merge first, before the input is read: union of people and of variants. A failed merge stops PLINK here.",
      flip: "Swap A↔T and C↔G for the listed variants.",
      extract: "Keep only the listed variants.",
      updateIds: "Replace the family and individual IDs.",
      remove: "Drop the listed people.",
      mind: "Compute each person's missing-call rate over the variants left now, and drop people above the threshold.",
      missing: "Write the missingness reports (after --mind, before --geno).",
      geno: "Compute each variant's missing-call rate over the people left now, and drop variants above the threshold.",
      hardy: "Write the Hardy–Weinberg report for the variants left now.",
      hwe: "Drop variants with an exact-test p-value below the threshold (controls only in case/control data).",
      maf: "Drop variants with minor allele frequency below the threshold.",
      pca: "Compute the relationship matrix and its top principal components from the people and variants left now.",
      makeBed: "Write the remaining data as a new fileset.",
      indep: "Prune for LD and write the keep/drop lists (the data are not changed).",
      genome: "Estimate IBD for every pair of people.",
      het: "Count observed and expected homozygous genotypes per person."
    };
    steps.forEach(function (s) { if (s.key) s.text = stepText[s.key]; });

    // Interaction notes.
    if (has(state, "geno") && has(state, "mind")) notes.push({ level: "warn", text: "--mind runs before --geno inside one command, whatever order you type. Each person's missing rate is then computed over all variants, including the poorly genotyped ones that --geno is about to drop, so more people can fail. The practical runs --geno and --mind as two commands so that bad variants go first." });
    if (has(state, "missing") && (has(state, "geno") || has(state, "mind"))) notes.push({ level: "info", text: "The --missing reports describe the data after --mind and before --geno." });
    if (has(state, "hardy") && has(state, "hwe")) notes.push({ level: "info", text: "The .hwe report is written before the --hwe filter removes anything, so it lists every variant." });
    if (has(state, "hwe")) notes.push({ level: "info", text: "PennCATH's phenotype column uses case/control codes, so --hwe tests only the people coded 1, PLINK's controls (add 'include-nonctrl' to test everyone). What the codes stand for in this copy: plink-data.html, section 'What column 6 holds'." });
    if (has(state, "flip") && !has(state, "makeBed")) notes.push({ level: "warn", text: "--flip without --make-bed changes the alleles only inside this run; nothing is saved." });
    if (has(state, "updateIds") && !has(state, "makeBed")) notes.push({ level: "warn", text: "--update-ids without --make-bed changes the IDs only inside this run; nothing is saved." });
    if (has(state, "updateIds") && has(state, "remove")) notes.push({ level: "info", text: "IDs are updated before --remove is applied, so the remove file must use the new IDs." });
    if (has(state, "indep") && has(state, "makeBed")) notes.push({ level: "info", text: "--indep-pairwise does not filter: the new fileset keeps every variant. Use the .prune.in list with --extract in a later command." });
    ["genome", "het", "pca"].forEach(function (k) {
      if (has(state, k) && !has(state, "extract") && state.input !== "merged") notes.push({ level: "warn", text: FLAGS[k].flag + " without --extract uses every variant. Variants in strong LD then count many times over; the practical restricts this step to the pruned list (.prune.in)." });
    });
    if (has(state, "pca") && !has(state, "maf")) notes.push({ level: "info", text: "Without --maf, rare variants enter the PCA; the practical adds --maf 0.05." });
    if (has(state, "bmerge") && !mergeOnly && !has(state, "makeBed")) notes.push({ level: "info", text: "The merged fileset is written as " + O + ".bed/.bim/.fam and the other operations then run on it." });
    if (has(state, "bmerge")) notes.push({ level: "info", text: "When the merge fails, PLINK exits with an error status. In a script that stops at the first error, write the first attempt as plink … || true, as the practical does, or test for the .missnp file." });
    if (has(state, "genome") && state.input === "merged") notes.push({ level: "warn", text: "IBD across the merged set compares PennCATH people with 1000 Genomes people on the few shared variants; the practical runs --genome on PennCATH alone." });
    if (has(state, "makeBed") && out && out === bfile) notes.push({ level: "warn", text: "The output prefix equals the input prefix. PLINK 1.9 first renames the input files with a trailing ~ (penncath.bed~ …) so that it can write the new ones. Prefer a new name that records the step." });
    if (!out) notes.push({ level: "info", text: "Without --out, every file is named plink.* in the working directory, and the next run overwrites them." });
    if (state.input === "toy") notes.push({ level: "info", text: "The toy fileset is the in-browser lab's dataset; the same command runs there with toy file names." });

    return { command: command, reads: reads, writes: writes, steps: steps, notes: notes, problems: problems, outName: O, anyOutput: anyOutput };
  }

  if (typeof document === "undefined") {
    globalThis.PLINK_BUILDER_TEST = { build: build, suggestOut: suggestOut, FLAGS: FLAGS, PRESETS: PRESETS, DEFAULT_PARAMS: DEFAULT_PARAMS };
    return;
  }

  /* ---------------- DOM ---------------- */
  var root = document.getElementById("w-plink-builder");
  if (!root) return;
  var body = root.querySelector(".widget-body");
  if (!body) return;

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function copyParams() { var o = {}; for (var k in DEFAULT_PARAMS) o[k] = DEFAULT_PARAMS[k]; return o; }

  var state = { input: "qc", sel: [], params: copyParams(), out: "", outEdited: false };

  var paramInputs = {
    geno: '<input type="number" step="0.005" min="0" max="1" data-p="geno" aria-label="--geno threshold" style="width:6.2em">',
    mind: '<input type="number" step="0.005" min="0" max="1" data-p="mind" aria-label="--mind threshold" style="width:6.2em">',
    maf: '<input type="number" step="0.01" min="0" max="0.5" data-p="maf" aria-label="--maf threshold" style="width:6.2em">',
    hwe: '<input type="text" data-p="hwe" aria-label="--hwe p-value threshold" style="width:6.2em" inputmode="decimal">',
    pca: '<input type="number" step="1" min="1" data-p="pca" aria-label="number of principal components (empty means 20)" placeholder="20" style="width:4.6em">',
    indep: '<input type="text" data-p="ipW" aria-label="window size" style="width:3.6em"> <input type="text" data-p="ipS" aria-label="step" style="width:2.8em"> <input type="text" data-p="ipR" aria-label="r-squared threshold" style="width:3.6em">'
  };
  var fileLabels = { extract: "list of variant IDs", remove: "list of people (FID IID)", bmerge: "fileset prefix", flip: ".missnp list", updateIds: "four-column ID file" };

  var html = '';
  html += '<div class="pb-row"><label class="pb-field"><span>Preset</span><select data-role="preset" aria-label="Load a command from the practical"><option value="">Load a command from the practical…</option>';
  PRESETS.forEach(function (p) { html += '<option value="' + p.id + '">' + esc(p.label) + '</option>'; });
  html += '</select></label></div>';
  html += '<div class="pb-row"><label class="pb-field"><span>Input <code>--bfile</code></span><select data-role="input" aria-label="Input fileset">';
  INPUTS.forEach(function (f) { html += '<option value="' + f.id + '">' + esc(f.label) + '</option>'; });
  html += '</select></label></div>';
  html += '<div class="pb-groups">';
  GROUPS.forEach(function (g) {
    html += '<fieldset class="pb-group"><legend>' + esc(g.title) + '</legend>';
    g.keys.forEach(function (k) {
      var f = FLAGS[k];
      html += '<div class="pb-opt"><label><input type="checkbox" data-flag="' + k + '"> <code>' + f.flag + '</code></label>';
      if (paramInputs[k]) html += ' <span class="pb-par">' + paramInputs[k] + '</span>';
      if (FILE_CHOICES[k]) html += ' <span class="pb-file muted">' + esc(fileLabels[k]) + '</span>';
      html += '</div>';
    });
    html += '</fieldset>';
  });
  html += '</div>';
  html += '<div class="pb-row"><label class="pb-field pb-out"><span>Output <code>--out</code></span><input type="text" data-role="out" aria-label="Output prefix" spellcheck="false" autocomplete="off"></label> <button type="button" class="btn" data-role="suggest">Suggest a name</button> <button type="button" class="btn" data-role="clear">Clear</button></div>';
  html += '<div class="pb-results" aria-live="polite">';
  html += '<div class="pb-block"><div class="pb-h">The command</div><pre class="code pb-cmd" data-role="cmd"></pre><div class="pb-problems" data-role="problems"></div></div>';
  html += '<div class="pb-two"><div class="pb-block"><div class="pb-h">PLINK reads</div><ul class="pb-files" data-role="reads"></ul></div>';
  html += '<div class="pb-block"><div class="pb-h">PLINK writes</div><ul class="pb-files" data-role="writes"></ul></div></div>';
  html += '<div class="pb-block"><div class="pb-h">The order PLINK applies them</div><ol class="pb-steps" data-role="steps"></ol></div>';
  html += '<div class="pb-block" data-role="notes-wrap"><div class="pb-h">Notes</div><ul class="pb-notes" data-role="notes"></ul></div>';
  html += '<div class="pb-block"><div class="pb-h">What each flag does</div><dl class="pb-doc" data-role="doc"></dl></div>';
  html += '</div>';
  body.innerHTML = html;

  var $ = function (sel) { return body.querySelector(sel); };
  var presetSel = $('[data-role="preset"]'), inputSel = $('[data-role="input"]'), outInp = $('[data-role="out"]');

  function syncControls() {
    inputSel.value = state.input;
    body.querySelectorAll("input[data-flag]").forEach(function (cb) { cb.checked = state.sel.indexOf(cb.getAttribute("data-flag")) >= 0; });
    body.querySelectorAll("input[data-p]").forEach(function (inp) { inp.value = state.params[inp.getAttribute("data-p")]; });
    outInp.value = state.out;
  }

  function render() {
    if (!state.outEdited) { state.out = suggestOut(state); outInp.value = state.out; }
    var r = build(state);
    // Command with highlighted flags (escape first, then mark flags).
    var cmdHtml = esc(r.command).replace(/(^|\s)(--[a-z0-9-]+)/g, '$1<span class="flag">$2</span>');
    $('[data-role="cmd"]').innerHTML = cmdHtml;
    $('[data-role="problems"]').innerHTML = r.problems.map(function (t) { return '<p class="pb-bad">' + esc(t) + '</p>'; }).join("");
    $('[data-role="reads"]').innerHTML = r.reads.map(function (f) { return '<li><code>' + esc(f.name) + '</code> <span class="muted">' + esc(f.why) + '</span></li>'; }).join("");
    $('[data-role="writes"]').innerHTML = r.writes.map(function (f) { return '<li' + (f.cond || f.tmp ? ' class="pb-cond"' : '') + '><code>' + esc(f.name) + '</code> <span class="muted">' + esc(f.why) + '</span></li>'; }).join("");
    $('[data-role="steps"]').innerHTML = r.steps.map(function (s) { return '<li><code>' + esc(s.flags) + '</code> — ' + esc(s.text) + '</li>'; }).join("");
    var nw = $('[data-role="notes-wrap"]');
    nw.hidden = !r.notes.length;
    $('[data-role="notes"]').innerHTML = r.notes.map(function (n) { return '<li class="pb-' + n.level + '">' + esc(n.text) + '</li>'; }).join("");
    var docKeys = state.sel.slice();
    var doc = '<dt><code>--bfile</code></dt><dd>Reads the binary fileset PREFIX.bed, PREFIX.bim and PREFIX.fam; give the prefix without an extension. <a href="https://www.cog-genomics.org/plink/1.9/input#bed" target="_blank" rel="noopener">Docs</a></dd>';
    docKeys.forEach(function (k) {
      var f = FLAGS[k];
      doc += '<dt><code>' + f.flag + '</code></dt><dd>' + esc(f.what) + ' <span class="muted">' + esc(f.def) + '</span> <a href="' + f.doc + '" target="_blank" rel="noopener">Docs</a></dd>';
    });
    doc += '<dt><code>--out</code></dt><dd>Sets the prefix of every output file, including the log; the default is <code>plink</code>. <a href="https://www.cog-genomics.org/plink/1.9/general_usage#out" target="_blank" rel="noopener">Docs</a></dd>';
    $('[data-role="doc"]').innerHTML = doc;
  }

  body.addEventListener("change", function (e) {
    var t = e.target;
    if (t === presetSel) {
      var p = null;
      PRESETS.forEach(function (x) { if (x.id === t.value) p = x; });
      if (p) {
        state.params = copyParams();
        if (p.params) for (var k in p.params) state.params[k] = p.params[k];
        state.input = p.input;
        state.sel = p.sel.slice();
        state.out = p.out;
        state.outEdited = true;
        syncControls();
        render();
      }
      return;
    }
    if (t === inputSel) { state.input = t.value; render(); return; }
    if (t.hasAttribute("data-flag")) {
      var key = t.getAttribute("data-flag");
      var i = state.sel.indexOf(key);
      if (t.checked && i < 0) state.sel.push(key);
      if (!t.checked && i >= 0) state.sel.splice(i, 1);
      presetSel.value = "";
      render();
    }
  });
  body.addEventListener("input", function (e) {
    var t = e.target;
    if (t.hasAttribute("data-p")) { state.params[t.getAttribute("data-p")] = t.value; render(); }
    else if (t === outInp) { state.out = t.value; state.outEdited = true; render(); }
  });
  body.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("button") : null;
    if (!t) return;
    if (t.getAttribute("data-role") === "suggest") { state.outEdited = false; render(); }
    if (t.getAttribute("data-role") === "clear") {
      state = { input: "qc", sel: [], params: copyParams(), out: "", outEdited: false };
      presetSel.value = "";
      syncControls();
      render();
    }
  });

  // First view: the practical's first sample-filter command.
  (function () {
    var p = PRESETS[2];
    state.input = p.input; state.sel = p.sel.slice(); state.out = p.out; state.outEdited = true;
    presetSel.value = p.id;
    syncControls();
    render();
  })();
  if (window.LectureSite && window.LectureSite.copyButtons) window.LectureSite.copyButtons(body);
})();
