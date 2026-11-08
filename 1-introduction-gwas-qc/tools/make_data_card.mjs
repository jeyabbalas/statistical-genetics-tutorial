#!/usr/bin/env node
/* make_data_card.mjs: run the practical's commands on the toy data with the lab's emulators and write
   the numbers pages quote (assets/js/lab/data-card.js: window.TOY_CARD, and window.TOY_PEOPLE with each
   toy person's simulated group and planted cause). Author: CORE.

   It also embeds the GrafAnc emulator's reference (built from data/grafanc_ref.json) into
   assets/js/lab/grafanc-core.js, so run it again whenever tools/make_toy_data.mjs has rewritten data/.

   Usage, from the repository root:
     node 1-introduction-gwas-qc/tools/make_data_card.mjs            writes both files
     node 1-introduction-gwas-qc/tools/make_data_card.mjs --check    writes nothing; exits 1 if either file is out of date
     node 1-introduction-gwas-qc/tools/make_data_card.mjs --data DIR --no-write   another data folder, print only

   The commands are those of the practical (01_qc.Rmd of the DCEG Statistical Genetics Workshop) with
   penncath replaced by toy and all_pops_1kgenomes_markersForPCA by toy_1kg, run in the lab's virtual
   file system layout (see LAB.md). The R summaries of the practical (counts below thresholds, the
   PI_HAT summary, heterozygosity outliers, GrafAnc group counts) are recomputed from the output files
   as R would read them. Every value comes from the emulators. For these commands the PLINK emulator
   writes the same files as real PLINK 1.9.0 (tools/real_plink_check.mjs; test_lab.mjs section J);
   real GrafAnc cannot run on the toy data, so the GrafAnc emulator was checked against it on the
   PennCATH data instead (assets/js/lab/CORE.md). data/README.md ("TOY_CARD keys") documents every
   key. */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LECTURE = path.resolve(HERE, "..");
const LAB = path.join(LECTURE, "assets", "js", "lab");
const PLINK_JS = path.join(LAB, "plink-core.js");
const GRAFANC_JS = path.join(LAB, "grafanc-core.js");
const CARD_JS = path.join(LAB, "data-card.js");
const require = createRequire(import.meta.url);

export const HOME = "/home/student";
export const WORK = HOME + "/statgen-workshop";
export const INPUT_DIR = WORK + "/data/inputs/penncath_withPheno";
export const REFERENCE_DIR = WORK + "/data/inputs/ref";
export const ANALYSIS_DIR = WORK + "/analysis";
const PANEL_NAME = "integrated_call_samples_v3.20130502.ALL.panel";
const FIXED_TIME = Date.UTC(2026, 8, 9, 14, 0, 0);    // log time stamps (the card does not use them)

/* ============================================================================================
   1. The GrafAnc emulator's reference, built from data/grafanc_ref.json
   ============================================================================================ */
const VERTEX_POPS = ["EUR", "AFR", "EAS"];                     // GrafAnc's vertex populations (European, African, East Asian)
const SUPER_CODES = { AFR: 100, EUR: 300, SAS: 400, EAS: 500, AMR: 600 };   // first digit of AncGroupID
const FREQ_SCALE = 10000, FREQ_MIN = 10, FREQ_MAX = 9990;      // 0.001 .. 0.999
function isPalindromic(a, b) { const s = a + b; return s === "AT" || s === "TA" || s === "CG" || s === "GC"; }
function b64Ints(values, bytesPer) {
  const buf = Buffer.alloc(values.length * bytesPer);
  values.forEach((v, i) => { if (bytesPer === 2) buf.writeUInt16LE(v, i * 2); else buf.writeInt32LE(v, i * 4); });
  return buf.toString("base64");
}
/* Populations of the panel file with their super-population: {pop: super_pop}. */
export function panelSuperPops(panelText) {
  const out = {};
  panelText.split("\n").slice(1).filter(l => l.trim()).forEach(l => { const f = l.split("\t"); out[f[1]] = f[2]; });
  return out;
}
/* The emulator's reference: the toy ancestry-SNP panel is every study SNP except the palindromic
   (A/T, C/G) ones, whose strand cannot be told from the alleles. Populations: the three vertex
   populations (the EUR, AFR and EAS nodes of the simulated tree), which give GD1-GD3 and Pe/Pf/Pa,
   then the 15 toy 1000 Genomes populations, which with the vertices are the candidates for the
   continental group in AncGroupID. Frequencies are kept inside [0.001, 0.999]. */
export function buildGrafancReference(g, superOf) {
  if (g.schema !== "lecture1-toy-grafanc-ref/1") throw new Error("grafanc_ref.json: unexpected schema " + g.schema);
  const panelPops = Object.keys(g.freq).filter(p => superOf[p] && SUPER_CODES[superOf[p]] && VERTEX_POPS.indexOf(p) < 0);
  const pops = VERTEX_POPS.concat(panelPops);
  for (const p of pops) if (!g.freq[p] || g.freq[p].length !== g.snps.length) throw new Error("grafanc_ref.json: no frequencies for " + p);
  const groups = pops.map(p => VERTEX_POPS.indexOf(p) >= 0 ? SUPER_CODES[p] : SUPER_CODES[superOf[p]]);
  const keep = [];
  g.snps.forEach((s, k) => { if (!isPalindromic(s.ref, s.alt) && s.chr >= 1 && s.chr <= 22) keep.push(k); });
  keep.sort((a, b) => g.snps[a].chr - g.snps[b].chr || g.snps[a].bp - g.snps[b].bp);
  const chrRuns = [], posDelta = [];
  let prev = 0, alleles = "";
  for (const k of keep) {
    const s = g.snps[k];
    if (!chrRuns.length || chrRuns[chrRuns.length - 1][0] !== s.chr) chrRuns.push([s.chr, 0]);
    chrRuns[chrRuns.length - 1][1]++;
    posDelta.push(s.bp - prev); prev = s.bp;
    alleles += s.ref + s.alt;
  }
  const af = {};
  for (const p of pops) af[p] = b64Ints(keep.map(k => Math.min(FREQ_MAX, Math.max(FREQ_MIN, Math.round(g.freq[p][k] * FREQ_SCALE)))), 2);
  return {
    format: "grafanc-lab-ref-1",
    source: "data/grafanc_ref.json (" + g.generator + ", seed " + g.seed + "): every non-palindromic study SNP; GRCh37 positions; alt-allele frequencies of the toy model",
    n: keep.length, pops, groups, chr: chrRuns, pos: b64Ints(posDelta, 4), alleles, scale: FREQ_SCALE, af
  };
}
const REF_RE = /\/\*GRAFANC-REF-BEGIN\*\/[\s\S]*?\/\*GRAFANC-REF-END\*\//;
export function embedReference(source, ref) {
  if (!REF_RE.test(source)) throw new Error("grafanc-core.js: reference markers not found");
  return source.replace(REF_RE, () => "/*GRAFANC-REF-BEGIN*/" + JSON.stringify(ref) + "/*GRAFANC-REF-END*/");
}
/* A fresh copy of a plain-script core from its source text (no require cache). */
function loadScript(source, filename) {
  const module = { exports: {} };
  new Function("module", "exports", "window", source + "\n//# sourceURL=" + filename)(module, module.exports, undefined);
  return module.exports;
}

/* ============================================================================================
   2. A small in-memory file system with the io object the cores expect
   ============================================================================================ */
function normPath(p) {
  const out = [];
  for (const seg of p.split("/")) { if (!seg || seg === ".") continue; if (seg === "..") out.pop(); else out.push(seg); }
  return "/" + out.join("/");
}
export class MemFS {
  constructor() { this.files = new Map(); this.cwd = WORK; }
  abs(p) { return normPath(p.startsWith("/") ? p : this.cwd + "/" + p); }
  read(p) { const k = this.abs(p); return this.files.has(k) ? this.files.get(k) : null; }
  text(p) { const d = this.read(p); return d == null ? null : typeof d === "string" ? d : Buffer.from(d).toString("utf8"); }
  write(p, d) { this.files.set(this.abs(p), d); }
  exists(p) {
    const k = this.abs(p);
    if (this.files.has(k)) return true;
    const pre = k === "/" ? "/" : k + "/";
    for (const f of this.files.keys()) if (f.startsWith(pre)) return true;   // a folder holding files
    return false;
  }
  remove(p) { this.files.delete(this.abs(p)); }
  io(extra = {}) {
    const fsys = this, lines = [];
    return Object.assign({
      lines,
      read: p => fsys.read(p),
      write: (p, d) => { fsys.write(p, d); return true; },
      exists: p => fsys.exists(p),
      remove: p => fsys.remove(p),
      print: (line, stream) => { lines.push(stream === "stderr" ? "[stderr] " + line : line); },
      cwd: fsys.cwd,
      now: () => FIXED_TIME
    }, extra);
  }
}

/* ============================================================================================
   3. The practical, step by step
   ============================================================================================ */
export function practicalCommands() {
  const I = INPUT_DIR, R = REFERENCE_DIR, A = ANALYSIS_DIR;
  const Q = A + "/toy.geno0.01.mind0.01";
  const refSet = [R + "/toy_1kg.bed", R + "/toy_1kg.bim", R + "/toy_1kg.fam"];
  return [
    { key: "missing_raw", argv: ["--bfile", I + "/toy", "--missing", "--out", A + "/toy"] },
    { key: "geno", argv: ["--bfile", I + "/toy", "--geno", "0.01", "--make-bed", "--out", A + "/toy.geno0.01"] },
    { key: "missing_geno", argv: ["--bfile", A + "/toy.geno0.01", "--missing", "--out", A + "/toy.geno0.01"] },
    { key: "mind", argv: ["--bfile", A + "/toy.geno0.01", "--mind", "0.01", "--make-bed", "--out", Q] },
    { key: "hardy", argv: ["--bfile", Q, "--hardy", "--out", Q] },
    { key: "prune", argv: ["--bfile", Q, "--indep-pairwise", "50", "5", "0.3", "--out", Q] },
    { key: "genome", argv: ["--bfile", Q, "--extract", Q + ".prune.in", "--genome", "--out", Q + ".LD0.3"] },
    { key: "het", argv: ["--bfile", Q, "--het", "--extract", Q + ".prune.in", "--out", Q + ".LD0.3"] },
    { key: "pca", argv: ["--bfile", Q, "--extract", Q + ".prune.in", "--maf", "0.05", "--pca", "--out", Q + ".LD0.3"] },
    { key: "merge1", argv: ["--bfile", Q, "--bmerge", ...refSet, "--make-bed", "--out", Q + ".merge1kgenomes"], mayFail: true },
    { key: "flip", argv: ["--bfile", Q, "--flip", Q + ".merge1kgenomes-merge.missnp", "--make-bed", "--out", Q + "_flipSNPs"] },
    { key: "merge2", argv: ["--bfile", Q + "_flipSNPs", "--bmerge", ...refSet, "--make-bed", "--out", Q + ".merge1kgenomes"] },
    { key: "merged_pca", argv: ["--bfile", Q + ".merge1kgenomes", "--geno", "0.1", "--maf", "0.05", "--pca", "--out", Q + ".merge1kgenomes"] },
    { key: "akt", shell: "git clone https://github.com/Illumina/akt.git" },
    { key: "awk_update_ids", shell: "awk '{ gsub(\"\\\"\", \"\", $1); print ... }' toy.geno0.01.mind0.01.fam > toy.updateIDs.txt" },
    { key: "update_ids", argv: ["--bfile", Q, "--update-ids", A + "/toy.updateIDs.txt", "--make-bed", "--out", Q + ".uniqueIDs"] },
    { key: "grafanc_install", shell: "git clone https://github.com/jimmy-penn/grafanc.git; gunzip grafanc/cpp/data/AncSnpPopAFs.txt.gz" },
    { key: "grafanc", grafanc: [Q + ".uniqueIDs", A + "/toy_grafanc_out.txt"] },
    /* not in the practical (outputs named <Q>.extra.*): pruning at other settings, and the study PCA
       without LD pruning (the long-range LD region's effect) */
    { key: "prune_50_5_0_1", argv: ["--bfile", Q, "--indep-pairwise", "50", "5", "0.1", "--out", Q + ".extra.prune_50_5_0.1"], extra: true },
    { key: "prune_50_5_0_8", argv: ["--bfile", Q, "--indep-pairwise", "50", "5", "0.8", "--out", Q + ".extra.prune_50_5_0.8"], extra: true },
    { key: "prune_50_50_0_3", argv: ["--bfile", Q, "--indep-pairwise", "50", "50", "0.3", "--out", Q + ".extra.prune_50_50_0.3"], extra: true },
    { key: "prune_250kb_1_0_3", argv: ["--bfile", Q, "--indep-pairwise", "250kb", "1", "0.3", "--out", Q + ".extra.prune_250kb_1_0.3"], extra: true },
    { key: "pca_unpruned", argv: ["--bfile", Q, "--maf", "0.05", "--pca", "--out", Q + ".extra.noprune"], extra: true },
    { key: "freq_raw", argv: ["--bfile", I + "/toy", "--freq", "--out", A + "/toy.extra.raw"], extra: true },
    /* the worked solution of qc-exercise (Tasks 3, 4 and 6): its removal list, then its final command */
    { key: "exercise_lists", lists: true, extra: true },
    { key: "exercise_qc", argv: ["--bfile", Q, "--remove", A + "/toy.extra.exercise_remove.txt", "--hwe", "1e-6", "--make-bed", "--out", A + "/toy.extra.exercise_qc"], extra: true }
  ];
}

/* The removal list of qc-exercise's worked solution, computed as the page's awk programs compute it: people
   whose heterozygosity rate (N(NM) - O(HOM)) / N(NM) lies outside the mean +- 3 SD (fail_het.txt), plus, for
   each pair with PI_HAT > 0.1875 in which neither person is on that list, the person with the larger F_MISS
   in toy.geno0.01.imiss, the first of the pair on a tie (fail_related.txt); then sort -u of both lists. */
export function exerciseRemoveList(mem) {
  const A = ANALYSIS_DIR, Q = A + "/toy.geno0.01.mind0.01";
  const rows = p => mem.text(p).split("\n").slice(1).filter(l => l.trim() !== "").map(l => l.trim().split(/\s+/));
  const het = rows(Q + ".LD0.3.het").map(f => ({ id: f[0] + " " + f[1], r: (Number(f[4]) - Number(f[2])) / Number(f[4]) }));
  const n = het.length, m = het.reduce((s, x) => s + x.r, 0) / n, ss = het.reduce((s, x) => s + x.r * x.r, 0);
  const sdv = Math.sqrt((ss - n * m * m) / (n - 1));
  const failHet = new Set(het.filter(x => x.r < m - 3 * sdv || x.r > m + 3 * sdv).map(x => x.id));
  const fmiss = new Map(rows(A + "/toy.geno0.01.imiss").map(f => [f[0] + " " + f[1], Number(f[5])]));
  const failRel = new Set();
  for (const f of rows(Q + ".LD0.3.genome")) {
    if (!(Number(f[9]) > 0.1875)) continue;
    const a = f[0] + " " + f[1], b = f[2] + " " + f[3];
    if (failHet.has(a) || failHet.has(b)) continue;
    failRel.add(fmiss.get(a) >= fmiss.get(b) ? a : b);
  }
  return [...new Set([...failHet, ...failRel])].sort().join("\n") + "\n";
}
/* The practical's awk command, field by field (awk's default OFS is one space). */
export function awkUpdateIds(famText) {
  return famText.split("\n").filter(l => l.trim() !== "").map(l => {
    const f = l.trim().split(/[ \t]+/), f1 = f[0].replace(/"/g, "");
    return "\"" + f1 + "\" " + f[1] + " \"" + f1 + "\" \"" + f1 + "_" + f[1] + "\"";
  }).join("\n") + "\n";
}

export function setupFiles(dataDir) {
  const mem = new MemFS(), rd = name => fs.readFileSync(path.join(dataDir, name));
  mem.write(INPUT_DIR + "/toy.bed", new Uint8Array(rd("toy.bed")));
  mem.write(INPUT_DIR + "/toy.bim", rd("toy.bim").toString("utf8"));
  mem.write(INPUT_DIR + "/toy.fam", rd("toy.fam").toString("utf8"));
  mem.write(REFERENCE_DIR + "/toy_1kg.bed", new Uint8Array(rd("toy_1kg.bed")));
  mem.write(REFERENCE_DIR + "/toy_1kg.bim", rd("toy_1kg.bim").toString("utf8"));
  mem.write(REFERENCE_DIR + "/toy_1kg.fam", rd("toy_1kg.fam").toString("utf8"));
  mem.write(ANALYSIS_DIR + "/.keep", "");
  return { mem, panel: rd(PANEL_NAME).toString("utf8") };
}

/* Runs every step; returns the file system, the two cores and, per step, the console lines, exit code and
   time (ms). Card values come from each step's own console lines and output files, never from a .log
   (the practical reuses --out prefixes, so a later step overwrites an earlier step's log). */
export function runPractical(dataDir, PlinkCore, GrafAncCore) {
  const { mem, panel } = setupFiles(dataDir), steps = {};
  for (const c of practicalCommands()) {
    const t0 = performance.now();
    if (c.argv) {
      const io = mem.io(), r = PlinkCore.run(c.argv, io);
      steps[c.key] = { code: r.code, lines: io.lines, outputs: r.outputs };
      if (r.code !== 0 && !c.mayFail) throw new Error("step " + c.key + " failed (exit " + r.code + "):\n" + io.lines.join("\n"));
    } else if (c.lists) {
      mem.write(ANALYSIS_DIR + "/toy.extra.exercise_remove.txt", exerciseRemoveList(mem));
      steps[c.key] = { code: 0, lines: [] };
    } else if (c.key === "akt") {
      mem.write(ANALYSIS_DIR + "/akt/data/" + PANEL_NAME, panel);
      steps[c.key] = { code: 0, lines: [] };
    } else if (c.key === "awk_update_ids") {
      mem.write(ANALYSIS_DIR + "/toy.updateIDs.txt", awkUpdateIds(mem.text(ANALYSIS_DIR + "/toy.geno0.01.mind0.01.fam")));
      steps[c.key] = { code: 0, lines: [] };
    } else if (c.key === "grafanc_install") {
      mem.write(ANALYSIS_DIR + "/grafanc/bin/grafanc", "#!/bin/sh\n# lab stub\n");
      mem.write(ANALYSIS_DIR + "/grafanc/cpp/data/AncSnpPopAFs.txt", "# lab stub\n");
      steps[c.key] = { code: 0, lines: [] };
    } else if (c.grafanc) {
      const io = mem.io({ argv0: ANALYSIS_DIR + "/grafanc/bin/grafanc", env: { GRAFPATH: ANALYSIS_DIR + "/grafanc/cpp" } });
      const r = GrafAncCore.run(c.grafanc, io, { GRAFPATH: ANALYSIS_DIR + "/grafanc/cpp" });
      steps[c.key] = { code: r.code, lines: io.lines, outputs: r.outputs };
      if (!r.outputs.length) throw new Error("GrafAnc wrote no output:\n" + io.lines.join("\n"));
    }
    steps[c.key].ms = performance.now() - t0;
  }
  return { mem, steps, PlinkCore, GrafAncCore };
}

/* ============================================================================================
   4. Reading the outputs as R's fread would, and the practical's R summaries
   ============================================================================================ */
export function readTable(text) {
  const lines = text.split("\n").filter(l => l.trim() !== "");
  const header = lines[0].trim().split(/\s+/), rows = lines.slice(1).map(l => l.trim().split(/\s+/));
  const col = name => { const k = header.indexOf(name); if (k < 0) throw new Error("no column " + name); return rows.map(r => r[k]); };
  const num = name => col(name).map(v => v === "NA" || v === "nan" ? NaN : Number(v));
  return { header, rows, col, num };
}
function quantile7(sorted, p) {
  const h = (sorted.length - 1) * p, lo = Math.floor(h), hi = Math.min(sorted.length - 1, lo + 1);
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
}
function mean(a) { return a.reduce((s, x) => s + x, 0) / a.length; }
function sd(a) { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1)); }
function pearson(x, y) {
  const mx = mean(x), my = mean(y); let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  return sxy / Math.sqrt(sxx * syy);
}
const round = (x, d) => { const f = 10 ** d; return Math.round(x * f) / f; };
function lineCount(text) { return text ? text.split("\n").filter(l => l.trim() !== "").length : 0; }
function grab(lines, re, what) {
  for (const l of lines) { const m = re.exec(l); if (m) return m; }
  throw new Error("message not found: " + what);
}
function grabNum(lines, re, what) { return Number(grab(lines, re, what)[1]); }
function famCounts(text) {
  const rows = text.split("\n").filter(l => l.trim()).map(l => l.trim().split(/\s+/));
  return {
    n: rows.length, males: rows.filter(r => r[4] === "1").length, females: rows.filter(r => r[4] === "2").length,
    cases: rows.filter(r => r[5] === "2").length, controls: rows.filter(r => r[5] === "1").length,
    missing: rows.filter(r => r[5] !== "1" && r[5] !== "2").length
  };
}
const unquote = s => s.replace(/"/g, "");

export function computeCard(run, truth, versions) {
  const { mem, steps } = run, A = ANALYSIS_DIR, Q = A + "/toy.geno0.01.mind0.01", card = {};
  const T = p => { const t = mem.text(p); if (t == null) throw new Error("missing output " + p); return t; };

  /* --- the data --- */
  const fam0 = famCounts(T(INPUT_DIR + "/toy.fam")), bim0 = lineCount(T(INPUT_DIR + "/toy.bim"));
  Object.assign(card, {
    study_people: fam0.n, study_males: fam0.males, study_females: fam0.females, study_cases: fam0.cases,
    study_controls: fam0.controls, study_pheno_missing: fam0.missing, study_snps: bim0,
    study_chromosomes: new Set(T(INPUT_DIR + "/toy.bim").split("\n").filter(Boolean).map(l => l.split("\t")[0])).size
  });
  const refFam = famCounts(T(REFERENCE_DIR + "/toy_1kg.fam"));
  const panel = readTable(T(A + "/akt/data/" + PANEL_NAME));
  card.ref_people = refFam.n; card.ref_snps = lineCount(T(REFERENCE_DIR + "/toy_1kg.bim"));
  card.ref_populations = new Set(panel.col("pop")).size; card.ref_super_populations = new Set(panel.col("super_pop")).size;
  for (const sp of ["AFR", "AMR", "EAS", "EUR", "SAS"]) card["ref_" + sp.toLowerCase()] = panel.col("super_pop").filter(v => v === sp).length;
  const bySuper = truth.study.counts.by_super_population;
  card.sim_european_like = bySuper.EUR || 0; card.sim_african_like = bySuper.AFR || 0; card.sim_east_asian_like = bySuper.EAS || 0;
  card.sim_south_asian_like = bySuper.SAS || 0; card.sim_admixed = bySuper.ADMIXED || 0;
  card.sim_related_pairs = truth.features.d_relatedness.pairs.length;
  const maf = readTable(T(A + "/toy.extra.raw.frq")).num("MAF").filter(x => !isNaN(x));
  card.study_maf_lt_0_05 = maf.filter(x => x < 0.05).length;
  card.study_maf_lt_0_05_percent = round(100 * card.study_maf_lt_0_05 / maf.length, 1);
  const bm = truth.features.b_sample_missingness;
  card.sim_degraded_fids = bm.degraded.map(x => unquote(x.fid)).join(", ");
  card.sim_low_quality_fids = bm.low_quality.map(x => unquote(x.fid)).join(", ");
  card.sim_causal_snp = truth.features.causal_snp.id;

  /* --- the exercise's worked solution (qc-exercise Task 6) --- */
  card.exercise_removed = lineCount(T(A + "/toy.extra.exercise_remove.txt"));
  card.exercise_hwe_removed = grabNum(steps.exercise_qc.lines, /--hwe: (\d+) variants? removed/, "exercise --hwe");
  card.exercise_people = lineCount(T(A + "/toy.extra.exercise_qc.fam"));
  card.exercise_snps = lineCount(T(A + "/toy.extra.exercise_qc.bim"));

  /* --- step 1: missingness --- */
  card.raw_genotyping_rate = grabNum(steps.missing_raw.lines, /^Total genotyping rate is ([0-9.e-]+)\./, "genotyping rate");
  const lmiss = readTable(T(A + "/toy.lmiss")).num("F_MISS");
  card.lmiss_snps = lmiss.length;
  card.lmiss_gt_0_01 = lmiss.filter(x => x > 0.01).length;
  card.lmiss_le_0_01 = lmiss.length - card.lmiss_gt_0_01;
  card.lmiss_max = Math.max(...lmiss);
  const imissRaw = readTable(T(A + "/toy.imiss")).num("F_MISS");
  card.imiss_raw_gt_0_01 = imissRaw.filter(x => x > 0.01).length;
  card.geno_removed = grabNum(steps.geno.lines, /^(\d+) variants? removed due to missing genotype data \(--geno\)\./, "--geno removal");
  card.geno_snps_left = lineCount(T(A + "/toy.geno0.01.bim"));
  card.geno_people = lineCount(T(A + "/toy.geno0.01.fam"));
  const imissGeno = readTable(T(A + "/toy.geno0.01.imiss")).num("F_MISS");
  card.imiss_after_geno_gt_0_01 = imissGeno.filter(x => x > 0.01).length;
  card.imiss_after_geno_le_0_01 = imissGeno.length - card.imiss_after_geno_gt_0_01;
  card.mind_removed = grabNum(steps.mind.lines, /^(\d+) (?:person|people) removed due to missing genotype data \(--mind\)\./, "--mind removal");
  const famQ = famCounts(T(Q + ".fam"));
  Object.assign(card, {
    qc_people: famQ.n, qc_snps: lineCount(T(Q + ".bim")), qc_males: famQ.males, qc_females: famQ.females,
    qc_cases: famQ.cases, qc_controls: famQ.controls, qc_pheno_missing: famQ.missing
  });
  card.qc_genotyping_rate = grabNum(steps.mind.lines, /^Total genotyping rate in remaining samples is ([0-9.e-]+)\./, "genotyping rate after --mind");

  /* --- step 2: Hardy-Weinberg --- */
  const hwe = readTable(T(Q + ".hwe")), test = hwe.col("TEST"), P = hwe.num("P"), snp = hwe.col("SNP");
  const pOf = t => P.filter((p, i) => test[i] === t);
  const un = pOf("UNAFF");
  card.hwe_rows = test.length; card.hwe_unaff_rows = un.length;
  card.hwe_unaff_p_lt_1e8 = un.filter(p => p < 1e-8).length;
  card.hwe_unaff_p_ge_1e8 = un.length - card.hwe_unaff_p_lt_1e8;
  card.hwe_unaff_p_lt_1e6 = un.filter(p => p < 1e-6).length;
  card.hwe_unaff_p_lt_1e3 = un.filter(p => p < 1e-3).length;
  card.hwe_aff_p_lt_1e8 = pOf("AFF").filter(p => p < 1e-8).length;
  card.hwe_all_p_lt_1e8 = pOf("ALL").filter(p => p < 1e-8).length;
  const hc = truth.features.c_hardy_weinberg, plantedHwe = hc.heterozygote_deficit.concat(hc.heterozygote_excess).map(x => x.id);
  card.hwe_planted = plantedHwe.length;
  card.hwe_planted_deficit = hc.heterozygote_deficit.length; card.hwe_planted_excess = hc.heterozygote_excess.length;
  card.hwe_planted_ids = plantedHwe.join(", ");
  card.hwe_planted_deficit_ids = hc.heterozygote_deficit.map(x => x.id).join(", ");
  card.hwe_planted_excess_ids = hc.heterozygote_excess.map(x => x.id).join(", ");
  card.hwe_planted_unaff_p_lt_1e8 = plantedHwe.filter(id => P.some((p, i) => snp[i] === id && test[i] === "UNAFF" && p < 1e-8)).length;
  const causal = truth.features.causal_snp.id, hweRow = (id, t) => hwe.rows.find((r, i) => snp[i] === id && test[i] === t);
  const pcol = hwe.header.indexOf("P");
  if (hweRow(causal, "AFF")) {
    card.hwe_causal_aff_p = hweRow(causal, "AFF")[pcol]; card.hwe_causal_unaff_p = hweRow(causal, "UNAFF")[pcol];
    card.hwe_causal_all_p = hweRow(causal, "ALL")[pcol];
  }
  /* SNPs below 1e-8 in the ALL rows but not in the UNAFF rows (the causal SNP can be one); truth.json lists
     the unplanted ones as stratification_examples (pooling ancestries: a Wahlund effect). Always present:
     a count of 0 and an empty list when there are none. */
  const unaff8 = new Set(snp.filter((id, i) => test[i] === "UNAFF" && P[i] < 1e-8));
  const allOnly = snp.filter((id, i) => test[i] === "ALL" && P[i] < 1e-8 && !unaff8.has(id));
  card.hwe_all_only_p_lt_1e8 = allOnly.length;
  card.hwe_all_only_ids = allOnly.join(", ");
  const strat = (hc.stratification_examples || []).map(x => x.id).filter(id => hweRow(id, "ALL"));
  card.hwe_stratification_snps = strat.length;
  card.hwe_stratification_ids = strat.join(", ");

  /* --- step 3: LD pruning (and, not in the practical, other settings on the same input) --- */
  card.prune_in = lineCount(T(Q + ".prune.in")); card.prune_out = lineCount(T(Q + ".prune.out"));
  card.prune_in_50_5_0_1 = lineCount(T(Q + ".extra.prune_50_5_0.1.prune.in"));
  card.prune_in_50_5_0_8 = lineCount(T(Q + ".extra.prune_50_5_0.8.prune.in"));
  card.prune_in_50_50_0_3 = lineCount(T(Q + ".extra.prune_50_50_0.3.prune.in"));
  card.prune_in_250kb_1_0_3 = lineCount(T(Q + ".extra.prune_250kb_1_0.3.prune.in"));
  {
    const qds = run.PlinkCore.readBfile(mem.read(Q + ".bed"), T(Q + ".bim"), T(Q + ".fam"));
    const fr = run.PlinkCore.stats.alleleFreq(qds);
    let mono = 0;
    for (let j = 0; j < qds.m; j++) if (fr.nobs[j] > 0 && (fr.a2[j] === 0 || fr.a2[j] === 1)) mono++;
    card.prune_input_monomorphic = mono;
  }

  /* --- step 4: relatedness --- */
  card.genome_snps = grabNum(steps.genome.lines, /^(\d+) variants? and \d+ (?:person|people) pass filters and QC\./, "--genome variants");
  const gen = readTable(T(Q + ".LD0.3.genome")), pihat = gen.num("PI_HAT");
  const ps = pihat.slice().sort((a, b) => a - b);
  card.genome_pairs = pihat.length;
  card.pihat_min = round(ps[0], 4); card.pihat_q1 = round(quantile7(ps, 0.25), 4); card.pihat_median = round(quantile7(ps, 0.5), 4);
  card.pihat_mean = round(mean(pihat), 4); card.pihat_q3 = round(quantile7(ps, 0.75), 4); card.pihat_max = round(ps[ps.length - 1], 4);
  card.pairs_pihat_gt_0_9 = pihat.filter(x => x > 0.9).length;
  card.pairs_pihat_gt_0_1875 = pihat.filter(x => x > 0.1875).length;
  card.pairs_pihat_gt_0_1 = pihat.filter(x => x > 0.1).length;
  const g = { F1: gen.col("FID1"), I1: gen.col("IID1"), F2: gen.col("FID2"), I2: gen.col("IID2"), Z0: gen.num("Z0"), Z1: gen.num("Z1"), Z2: gen.num("Z2") };
  const relKey = rel => /^duplicate/.test(rel) ? "duplicate" : /^parent/.test(rel) ? "parent_offspring" : /^full/.test(rel) ? "full_sibs" : /^half/.test(rel) ? "half_sibs" : /^first cousin/.test(rel) ? "first_cousins" : null;
  for (const pr of truth.features.d_relatedness.pairs) {
    const k = relKey(pr.relationship); if (!k) continue;
    const i = g.F1.findIndex((f, r) => (f === pr.a.fid && g.I1[r] === pr.a.iid && g.F2[r] === pr.b.fid && g.I2[r] === pr.b.iid) ||
                                       (f === pr.b.fid && g.I1[r] === pr.b.iid && g.F2[r] === pr.a.fid && g.I2[r] === pr.a.iid));
    if (i < 0) { card["ibd_" + k + "_in_qc"] = "no"; continue; }
    card["ibd_" + k + "_fids"] = unquote(g.F1[i]) + " and " + unquote(g.F2[i]);
    card["ibd_" + k + "_pihat"] = pihat[i]; card["ibd_" + k + "_z0"] = g.Z0[i]; card["ibd_" + k + "_z1"] = g.Z1[i]; card["ibd_" + k + "_z2"] = g.Z2[i];
  }

  /* --- step 5: heterozygosity --- */
  card.het_snps = grabNum(steps.het.lines, /^(\d+) variants? and \d+ (?:person|people) pass filters and QC\./, "--het variants");
  const het = readTable(T(Q + ".LD0.3.het")), NM = het.num("N(NM)"), OH = het.num("O(HOM)"), F = het.num("F"), hf = het.col("FID");
  const rate = NM.map((n, i) => (n - OH[i]) / n), m = mean(rate), s = sd(rate);
  card.het_people = rate.length;
  card.het_rate_mean = round(m, 4); card.het_rate_sd = round(s, 4);
  card.het_rate_min = round(Math.min(...rate), 4); card.het_rate_max = round(Math.max(...rate), 4);
  const out3 = rate.map((r, i) => (r < m - 3 * s || r > m + 3 * s) ? i : -1).filter(i => i >= 0);
  const outF = F.map((f, i) => (f > 0.1 || f < -0.1) ? i : -1).filter(i => i >= 0);
  card.het_outliers_3sd = out3.length;
  card.het_outliers_3sd_low = out3.filter(i => rate[i] < m).length; card.het_outliers_3sd_high = out3.length - card.het_outliers_3sd_low;
  card.het_outliers_3sd_fids = out3.map(i => unquote(hf[i])).join(", ");
  card.het_f_abs_gt_0_1 = outF.length;
  card.het_f_gt_0_1 = outF.filter(i => F[i] > 0.1).length; card.het_f_lt_minus_0_1 = outF.filter(i => F[i] < -0.1).length;
  card.het_f_fids = outF.map(i => unquote(hf[i])).join(", ");
  card.het_both_rules = out3.filter(i => outF.includes(i)).length;
  const fidRow = id => hf.indexOf(id.fid);
  const e = truth.features.e_heterozygosity;
  if (fidRow(e.contaminated) >= 0) { const i = fidRow(e.contaminated); card.het_contaminated_fid = unquote(hf[i]); card.het_contaminated_f = F[i]; card.het_contaminated_rate = round(rate[i], 4); }
  if (fidRow(e.inbred) >= 0) { const i = fidRow(e.inbred); card.het_inbred_fid = unquote(hf[i]); card.het_inbred_f = F[i]; card.het_inbred_rate = round(rate[i], 4); }

  /* --- step 6: study PCA (and the unpruned PCA of the long-range LD region) --- */
  card.pca_snps = grabNum(steps.pca.lines, /^(\d+) variants? and \d+ (?:person|people) pass filters and QC\./, "--pca variants");
  card.pca_maf_removed = grabNum(steps.pca.lines, /^(\d+) variants? removed due to minor allele threshold/, "--maf removal");
  const eigval = T(Q + ".LD0.3.eigenval").split("\n").filter(Boolean).map(Number);
  card.pca_eigenvalues = eigval.length;
  for (let k = 0; k < 4; k++) card["pca_eigenval_" + (k + 1)] = round(eigval[k], 3);
  const lr = truth.features.long_range_ld_region, copies = lr.inverted_clade_copies_by_row;
  const fidToCopies = new Map(truth.study.samples.map((smp, i) => [smp.fid, copies[i]]));
  const pcCorr = file => {
    const rows = T(file).split("\n").filter(Boolean).map(l => l.trim().split(/\s+/));
    const y = rows.map(r => fidToCopies.get(r[0])), out = [];
    for (let k = 2; k < rows[0].length; k++) out.push(Math.abs(pearson(rows.map(r => Number(r[k])), y)));
    return out;
  };
  const rPruned = pcCorr(Q + ".LD0.3.eigenvec"), rUnpruned = pcCorr(Q + ".extra.noprune.eigenvec");
  const best = a => a.reduce((b, v, i) => v > a[b] ? i : b, 0);
  card.pca_unpruned_snps = grabNum(steps.pca_unpruned.lines, /^(\d+) variants? and \d+ (?:person|people) pass filters and QC\./, "unpruned --pca variants");
  card.pca_unpruned_inversion_pc = best(rUnpruned) + 1; card.pca_unpruned_inversion_r = round(rUnpruned[best(rUnpruned)], 2);
  card.pca_pruned_inversion_pc = best(rPruned) + 1; card.pca_pruned_inversion_r = round(rPruned[best(rPruned)], 2);
  const lrSet = new Set(lr.snps), qcBim = T(Q + ".bim").split("\n").filter(Boolean).map(l => l.split("\t")[1]);
  const inPrune = file => T(file).split("\n").filter(id => lrSet.has(id.trim())).length;
  card.long_range_chr = lr.chr; card.long_range_start_bp = lr.start; card.long_range_end_bp = lr.end;
  card.long_range_start_mb = round(lr.start / 1e6, 1); card.long_range_end_mb = round(lr.end / 1e6, 1);
  card.long_range_snps = lr.snps.length;
  card.long_range_snps_bim = T(INPUT_DIR + "/toy.bim").split("\n").filter(Boolean).map(l => l.split("\t"))
    .filter(f => Number(f[0]) === lr.chr && Number(f[3]) >= lr.start && Number(f[3]) <= lr.end).length;
  card.long_range_snps_qc = qcBim.filter(id => lrSet.has(id)).length;
  card.long_range_snps_prune_in = inPrune(Q + ".prune.in");
  card.long_range_snps_prune_in_250kb = inPrune(Q + ".extra.prune_250kb_1_0.3.prune.in");

  /* --- step 7: merge with the toy reference panel --- */
  const m1 = steps.merge1.lines;
  card.merge1_exit_code = steps.merge1.code;
  card.merge1_missnp = lineCount(mem.text(Q + ".merge1kgenomes-merge.missnp") || "");
  /* "Of these, N are new, while M are present in the base dataset." comes twice: people, then variants */
  const ofThese = m1.map(l => /^Of these, (\d+) (?:is|are) new, while (\d+) (?:is|are) present in the base dataset\.$/.exec(l)).filter(Boolean);
  if (ofThese.length < 2) throw new Error("merge counts not found");
  card.merge1_ref_only_snps = Number(ofThese[1][1]); card.merge1_shared_snps = Number(ofThese[1][2]);
  card.flip_snps = grabNum(steps.flip.lines, /^--flip: (\d+) SNPs? flipped/, "--flip count");
  const mm = grab(steps.merge2.lines, /^Performing single-pass merge \((\d+) (?:person|people), (\d+) variants?\)\./, "merge size");
  card.merge2_people = Number(mm[1]); card.merge2_snps = Number(mm[2]);
  card.merged_geno_removed = grabNum(steps.merged_pca.lines, /^(\d+) variants? removed due to missing genotype data \(--geno\)\./, "merged --geno");
  card.merged_maf_removed = (() => { try { return grabNum(steps.merged_pca.lines, /^(\d+) variants? removed due to minor allele threshold/, "merged --maf"); } catch (err) { return 0; } })();
  const mp = grab(steps.merged_pca.lines, /^(\d+) variants? and (\d+) (?:person|people) pass filters and QC\./, "merged pca");
  card.merged_pca_snps = Number(mp[1]); card.merged_pca_people = Number(mp[2]);
  const fm = truth.features.f_reference_merge;
  card.sim_palindromic_swapped = fm.palindromic_shared_strand_swapped.length;
  card.sim_palindromic_swapped_ids = fm.palindromic_shared_strand_swapped.map(x => x.id).join(", ");

  /* --- step 8: GrafAnc --- */
  card.update_ids_people = grabNum(steps.update_ids.lines, /^--update-ids: (\d+) (?:person|people) updated/, "--update-ids");
  const gl = steps.grafanc.lines;
  card.grafanc_ref_snps = grabNum(gl, /^Total (\d+) SNPs in .*AncSnpPopAFs\.txt$/, "GrafAnc reference size");
  const gb = grab(gl, /^Total (\d+) SNPs in bim file\. (\d+) SNPs are ancestry SNPs\.$/, "GrafAnc bim summary");
  card.grafanc_bim_snps = Number(gb[1]); card.grafanc_anc_snps = Number(gb[2]);
  card.grafanc_used_snps = grabNum(gl, /^\t(\d+) SNPs have expected alleles/, "GrafAnc SNPs used");
  const ga = readTable(T(A + "/toy_grafanc_out.txt")), grp = ga.num("AncGroupID");
  card.grafanc_samples = grp.length;
  const names = { 1: "afr", 2: "men", 3: "eur", 4: "sas", 5: "eas", 6: "amr", 7: "ocn", 8: "mix" };
  for (const d of Object.keys(names)) card["grafanc_" + names[d]] = grp.filter(x => Math.floor(x / 100) === Number(d)).length;
  card.grafanc_eur_percent = round(100 * card.grafanc_eur / grp.length, 1);

  card.plink_version = versions.plink; card.grafanc_version = versions.grafanc;
  card.card_source = "Computed by tools/make_data_card.mjs with the lab's PLINK and GrafAnc emulators. For these commands the PLINK emulator writes the same files as real PLINK 1.9.0; real GrafAnc cannot run on the toy data, and the GrafAnc emulator was checked against it on the PennCATH data.";
  return card;
}

/* ============================================================================================
   5. data-card.js
   ============================================================================================ */
/* Each toy person's simulated group and planted cause, from truth.json, keyed by the FID of toy.fam
   (quotes included): {group: population code or "ADMIXED", super: super-population or "ADMIXED",
   planted: truth.json's role ("duplicate", "parent", "offspring", "full_sibling", "half_sibling",
   "first_cousin", "contaminated", "inbred", "degraded", "low_quality") or null, ancestry: admixture
   proportions (admixed people only), pair: the FID of the other member of a planted relative pair}. */
export function peopleTable(truth) {
  const pairOf = new Map();
  for (const pr of truth.features.d_relatedness.pairs) { pairOf.set(pr.a.fid, pr.b.fid); pairOf.set(pr.b.fid, pr.a.fid); }
  const out = {};
  for (const smp of truth.study.samples) {
    const e = { group: smp.population, super: smp.super_pop, planted: smp.role && smp.role !== "normal" ? smp.role : null };
    if (smp.super_pop === "ADMIXED" && smp.ancestry) e.ancestry = smp.ancestry;
    if (pairOf.has(smp.fid)) e.pair = pairOf.get(smp.fid);
    out[smp.fid] = e;
  }
  return out;
}

export function cardScript(card, seed, people) {
  const body = Object.keys(card).map(k => "  " + JSON.stringify(k) + ": " + JSON.stringify(card[k])).join(",\n");
  const folk = Object.keys(people || {}).map(k => "  " + JSON.stringify(k) + ": " + JSON.stringify(people[k])).join(",\n");
  return "/* data-card.js: GENERATED by 1-introduction-gwas-qc/tools/make_data_card.mjs (toy data seed " + seed + "); do not edit.\n" +
    "   window.TOY_CARD: numbers about the Lecture 1 toy data and its quality control under the practical's\n" +
    "   commands and thresholds, computed by running the lab's PLINK and GrafAnc emulators on data/.\n" +
    "   For these commands the PLINK emulator writes the same files as real PLINK 1.9.0; the GrafAnc emulator\n" +
    "   was checked against real GrafAnc on the PennCATH data (assets/js/lab/CORE.md).\n" +
    "   Pages write <span data-card=\"key\">?</span>.\n" +
    "   window.TOY_PEOPLE: each toy person's simulated group and planted cause (spoilers), keyed by the FID of\n" +
    "   toy.fam with its quotes. Both are documented in data/README.md (\"TOY_CARD keys\"). */\n" +
    "var TOY_CARD = {\n" + body + "\n};\n" +
    "var TOY_PEOPLE = {\n" + folk + "\n};\n" +
    "if (typeof window !== \"undefined\") { window.TOY_CARD = TOY_CARD; window.TOY_PEOPLE = TOY_PEOPLE; }\n" +
    "if (typeof module !== \"undefined\") module.exports = { TOY_CARD: TOY_CARD, TOY_PEOPLE: TOY_PEOPLE };\n";
}

export function makeCard(dataDir, opts = {}) {
  const gref = JSON.parse(fs.readFileSync(path.join(dataDir, "grafanc_ref.json"), "utf8"));
  const truth = JSON.parse(fs.readFileSync(path.join(dataDir, "truth.json"), "utf8"));
  const ref = buildGrafancReference(gref, panelSuperPops(fs.readFileSync(path.join(dataDir, PANEL_NAME), "utf8")));
  const grafSource = embedReference(fs.readFileSync(GRAFANC_JS, "utf8"), ref);
  const PlinkCore = loadScript(fs.readFileSync(PLINK_JS, "utf8"), PLINK_JS);
  const GrafAncCore = loadScript(grafSource, GRAFANC_JS);
  const run = runPractical(dataDir, PlinkCore, GrafAncCore);
  const card = computeCard(run, truth, { plink: PlinkCore.version, grafanc: GrafAncCore.version });
  const people = peopleTable(truth);
  return { card, people, script: cardScript(card, truth.seed, people), grafSource, run, truth, ref, PlinkCore, GrafAncCore };
}

function main() {
  const args = process.argv.slice(2), opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
  const dataDir = path.resolve(opt("--data") || path.join(LECTURE, "data"));
  const t0 = Date.now(), res = makeCard(dataDir);
  if (args.includes("--check")) {
    const stale = [];
    if (!fs.existsSync(GRAFANC_JS) || fs.readFileSync(GRAFANC_JS, "utf8") !== res.grafSource) stale.push(path.relative(process.cwd(), GRAFANC_JS));
    if (!fs.existsSync(CARD_JS) || fs.readFileSync(CARD_JS, "utf8") !== res.script) stale.push(path.relative(process.cwd(), CARD_JS));
    if (stale.length) { console.log("out of date: " + stale.join(", ") + " (run node 1-introduction-gwas-qc/tools/make_data_card.mjs)"); process.exit(1); }
    console.log("data-card.js and the GrafAnc reference are up to date (" + Object.keys(res.card).length + " keys)");
    return;
  }
  if (!args.includes("--no-write")) {
    fs.writeFileSync(GRAFANC_JS, res.grafSource);
    fs.writeFileSync(CARD_JS, res.script);
    console.log("wrote " + path.relative(process.cwd(), CARD_JS) + " (" + Object.keys(res.card).length + " keys) and the reference in " + path.relative(process.cwd(), GRAFANC_JS) + " (" + res.ref.n + " SNPs)");
  }
  for (const [k, v] of Object.entries(res.card)) console.log("  " + k + " = " + JSON.stringify(v));
  console.log("done in " + (Date.now() - t0) + " ms");
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
