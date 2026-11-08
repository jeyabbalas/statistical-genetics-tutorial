#!/usr/bin/env node
/* test_lab.mjs: Node tests of the Lecture 1 lab's PLINK and GrafAnc emulators (assets/js/lab/plink-core.js,
   grafanc-core.js) and of the data card (assets/js/lab/data-card.js). Author: CORE.

   Usage, from the repository root:
     node 1-introduction-gwas-qc/tools/test_lab.mjs                every section; the data sections use data/
     node 1-introduction-gwas-qc/tools/test_lab.mjs --data DIR     the data sections use another folder
     node 1-introduction-gwas-qc/tools/test_lab.mjs --only A,C     some sections only
     node 1-introduction-gwas-qc/tools/test_lab.mjs --verbose      list every failure, not only the first ones

   Sections
     A  the exact Hardy-Weinberg test against exact enumeration (BigInt) and Wigginton et al. (2005)
     B  --genome on simulated relatives against their simulated IBD; IBS and PPC counts by brute force
     C  the relationship matrix behind --pca against its formula; three eigensolvers; the output files
     D  every planted feature of data/truth.json, recovered by the practical's commands (PlinkCore.run and
        GrafAncCore.run on an in-memory file system, through tools/make_data_card.mjs)
     E  data-card.js equal to what those commands produce; every card key a page uses exists
     F  readBfile/writeBfile round trips (random sets with odd sample counts and missing calls, data/)
     G  GrafAnc: geometry, %f formatting, scores of simulated populations, console messages, output file
     H  run time of each practical command
     I  the practical typed into the lab's shell (lab.js) writes the same files as section D
     J  the practical's exit codes, output files and logs equal real PLINK 1.9.0's, as recorded in
        tools/real-plink-1.9.0.json by tools/real_plink_check.mjs --write (which needs real PLINK)

   Writes nothing. Exits 1 when a check fails. Section C's eigenvector check uses values from LAPACK's dsyevr,
   the routine PLINK calls. The GrafAnc emulator was checked against the real program with GrafAnc's own
   reference on the PennCATH data (1-introduction-gwas-qc/assets/js/lab/CORE.md); no check here runs it. */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { MemFS, makeCard, readTable, ANALYSIS_DIR, INPUT_DIR, REFERENCE_DIR, WORK } from "./make_data_card.mjs";
import { FIXTURE, sha256, emulatorRecord, compareRecords } from "./real_plink_check.mjs";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const LECTURE = path.resolve(HERE, "..");
const LAB = path.join(LECTURE, "assets", "js", "lab");
const PlinkCore = require(path.join(LAB, "plink-core.js"));
const GrafAncCore = require(path.join(LAB, "grafanc-core.js"));
const S = PlinkCore.stats;

const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const DEFAULT_DATA = path.join(LECTURE, "data");
const DATA = path.resolve(opt("--data") || DEFAULT_DATA);
const ONLY = opt("--only") ? new Set(opt("--only").toUpperCase().split(",").map(s => s.trim())) : null;
const VERBOSE = args.includes("--verbose");
const DATA_FILES = ["toy.bed", "toy.bim", "toy.fam", "toy_1kg.bed", "toy_1kg.bim", "toy_1kg.fam",
  "integrated_call_samples_v3.20130502.ALL.panel", "truth.json", "grafanc_ref.json"];
const HAVE_DATA = DATA_FILES.every(f => fs.existsSync(path.join(DATA, f)));
const Q = ANALYSIS_DIR + "/toy.geno0.01.mind0.01";

/* ============================================================================================
   Harness
   ============================================================================================ */
const report = [];
let cur = null;
function check(name, ok, detail) {
  cur.n++;
  if (!ok) cur.fail.push(name + (detail === undefined ? "" : " [" + detail + "]"));
  return !!ok;
}
function note(line) { cur.notes.push(line); }
function skip(reason) { cur.skipped = reason; }
async function section(id, title, fn) {
  if (ONLY && !ONLY.has(id)) return;
  cur = { id, title, n: 0, fail: [], notes: [], skipped: null };
  const t0 = performance.now();
  try { await fn(); } catch (e) { cur.fail.push("exception: " + (e && e.stack || e)); }
  cur.ms = performance.now() - t0;
  report.push(cur);
  const status = cur.skipped && !cur.n ? "skipped (" + cur.skipped + ")" :
    cur.fail.length ? cur.fail.length + " of " + cur.n + " checks FAILED" : cur.n.toLocaleString("en-US") + " checks passed";
  console.log(id + "  " + title.padEnd(50) + status + "   " + (cur.ms / 1000).toFixed(1) + " s");
  for (const s of cur.notes) console.log("     " + s);
  const shown = VERBOSE ? cur.fail : cur.fail.slice(0, 15);
  for (const f of shown) console.log("   FAIL " + f);
  if (shown.length < cur.fail.length) console.log("   ... and " + (cur.fail.length - shown.length) + " more (--verbose lists them)");
}
const close = (a, b, tol) => Math.abs(a - b) <= tol;
const f3 = x => (typeof x === "number" ? x.toFixed(3) : String(x));

/* seeded random numbers */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function normal(rnd) { let u = 0; while (u === 0) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); }
function gamma(rnd, k) {          // Marsaglia and Tsang
  if (k < 1) return gamma(rnd, k + 1) * Math.pow(rnd(), 1 / k);
  const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x, v;
    do { x = normal(rnd); v = 1 + c * x; } while (v <= 0);
    v = v * v * v;
    const u = rnd();
    if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}
function beta(rnd, a, b) { const x = gamma(rnd, a), y = gamma(rnd, b); return x / (x + y); }

/* small data sets */
const BASES = ["A", "C", "G", "T"], COMP = { A: "T", T: "A", C: "G", G: "C" };
function allelePair(rnd, palindromicOk) {
  for (;;) {
    const a = BASES[Math.floor(rnd() * 4)], b = BASES[Math.floor(rnd() * 4)];
    if (a !== b && (palindromicOk || COMP[a] !== b)) return [a, b];
  }
}
function snpMap(rnd, m, chroms, gapMin, gapExtra) {
  const out = [], per = Math.ceil(m / chroms);
  let chr = 1, bp = 0;
  for (let j = 0; j < m; j++) {
    if (j && j % per === 0) { chr++; bp = 0; }
    bp += gapMin + Math.floor(rnd() * gapExtra);
    const [a1, a2] = allelePair(rnd, false);
    out.push({ chr, id: "s" + (j + 1), cm: 0, bp, a1, a2 });
  }
  return out;
}
const plainSamples = ids => ids.map(id => ({ fid: id, iid: "1", pat: "0", mat: "0", sex: 1, phen: -9 }));
function putSet(mem, prefix, ds) {
  const w = PlinkCore.writeBfile(ds);
  mem.write(prefix + ".bed", w.bed); mem.write(prefix + ".bim", w.bim); mem.write(prefix + ".fam", w.fam);
}
const getSet = (mem, prefix) => PlinkCore.readBfile(mem.read(prefix + ".bed"), mem.text(prefix + ".bim"), mem.text(prefix + ".fam"));
const lines = text => (text || "").split("\n").filter(l => l.trim() !== "");
const famKeys = text => lines(text).map(l => { const f = l.trim().split(/\s+/); return f[0] + " " + f[1]; });
const bimIds = text => lines(text).map(l => l.trim().split(/\s+/)[1]);
const idKey = s => s.fid + " " + s.iid;
const setEq = (a, b) => a.size === b.size && [...a].every(x => b.has(x));
const minus = (a, b) => [...a].filter(x => !b.has(x));
function mean(a) { return a.reduce((s, x) => s + x, 0) / a.length; }
function sd(a) { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); }
function pearson(x, y) {
  const mx = mean(x), my = mean(y);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  return sxy / Math.sqrt(sxx * syy);
}
function bytesOf(d) { return d == null ? null : typeof d === "string" ? Buffer.from(d, "utf8") : Buffer.from(d); }

/* The data run of tools/make_data_card.mjs: the practical's commands on DATA (sections D, E, H, I). */
let dataRun = null, dataRunError = null;
function getDataRun() {
  if (dataRun || dataRunError || !HAVE_DATA) return dataRun;
  try { dataRun = makeCard(DATA); } catch (e) { dataRunError = e; }
  return dataRun;
}

console.log("Lecture 1 lab tests: " + path.relative(process.cwd(), path.join(HERE, "test_lab.mjs")) +
  ", data " + (HAVE_DATA ? path.relative(process.cwd(), DATA) || "." : "not found (" + DATA + ")"));

/* ============================================================================================
   A. The exact Hardy-Weinberg test
   ============================================================================================ */
/* num/den (BigInt, 0 <= num <= den) as the nearest double, also far below 1e-300. */
function bigRatio(num, den) {
  if (num === 0n) return 0;
  const bits = x => x.toString(16).length * 4;
  const shift = Math.max(0, bits(den) - bits(num) + 72);
  let x = Number((num << BigInt(shift)) / den), s = shift;
  while (s > 1000) { x *= 2 ** -1000; s -= 1000; }
  return x * 2 ** -s;
}

await section("A", "Hardy-Weinberg exact test (--hardy, --hwe)", () => {
  const hwe = S.hweExact, facts = [1n];
  const fact = k => { while (facts.length <= k) facts.push(facts[facts.length - 1] * BigInt(facts.length)); return facts[k]; };
  /* Every table of n people with nMinor copies of the rarer allele: h heterozygotes, r rare and c common
     homozygotes, with weight N(h) = n! 2^h / (r! h! c!) (Levene 1949); P(h) = N(h) / sum N. The exact
     p-value of an observed h is the total probability of the tables no more likely than it, and the
     mid-p value counts the tables exactly as likely at half weight. Exact integer arithmetic, so ties
     are exact. */
  const cache = new Map();
  function dist(n, nMinor) {
    const key = n + ":" + nMinor;
    if (cache.has(key)) return cache.get(key);
    const st = [];
    let h = nMinor % 2, r = (nMinor - h) / 2, c = n - h - r;
    let N = fact(n) * (1n << BigInt(h)) / (fact(r) * fact(h) * fact(c));
    for (;;) {
      st.push({ h, r, c, N });
      if (r === 0) break;
      N = N * 4n * BigInt(r) * BigInt(c) / (BigInt(h + 1) * BigInt(h + 2));
      h += 2; r--; c--;
    }
    let total = 0n;
    for (const s of st) total += s.N;
    const order = st.map((s, i) => i).sort((a, b) => (st[a].N < st[b].N ? -1 : st[a].N > st[b].N ? 1 : 0));
    let below = 0n;
    for (let q = 0; q < order.length;) {
      let e = q, eq = 0n;
      while (e < order.length && st[order[e]].N === st[order[q]].N) { eq += st[order[e]].N; e++; }
      for (let t = q; t < e; t++) {
        const s = st[order[t]];
        s.p = bigRatio(below + eq, total); s.midp = bigRatio(2n * below + eq, 2n * total); s.prob = bigRatio(s.N, total);
        s.ties = e - q;
      }
      below += eq; q = e;
    }
    const d = { states: st, total };
    cache.set(key, d);
    return d;
  }
  const same = (a, b) => (b < 1e-290 ? a < 1e-280 : Math.abs(a - b) <= 1e-9 * b);
  const state = (h, hom1, hom2) => {
    const n = h + hom1 + hom2, nMinor = 2 * Math.min(hom1, hom2) + h;
    return dist(n, nMinor).states[(h - nMinor % 2) / 2];
  };

  /* 1. every table with up to 50 people, both homozygote orders, p and mid-p */
  let tables = 0, ties = 0;
  for (let n = 0; n <= 50; n++) for (let h = 0; h <= n; h++) for (let r = 0; r + h <= n; r++) {
    const c = n - h - r, s = state(h, r, c);
    tables++; if (s.ties > 1) ties++;
    const p = hwe(h, r, c, false), mp = hwe(h, r, c, true);
    check("p-value of het " + h + ", hom " + r + "/" + c, same(p, s.p), p + " vs exact " + s.p);
    check("mid-p of het " + h + ", hom " + r + "/" + c, same(mp, s.midp), mp + " vs exact " + s.midp);
  }
  note(tables.toLocaleString("en-US") + " tables with 0-50 people (" + ties + " with exact ties) match exact enumeration, p and mid-p");

  /* 2. random larger tables, every heterozygote count, including rare variants */
  const rnd = mulberry32(11);
  let big = 0, maxN = 0;
  for (let t = 0; t < 30; t++) {
    const n = 60 + Math.floor(rnd() * 2940), nMinor = t < 10 ? 1 + Math.floor(rnd() * 12) : Math.floor(rnd() * (n + 1));
    maxN = Math.max(maxN, n);
    for (const s of dist(n, nMinor).states) {
      big++;
      const p = hwe(s.h, s.r, s.c, false), mp = hwe(s.h, s.c, s.r, true);
      check("p-value of het " + s.h + ", hom " + s.r + "/" + s.c, same(p, s.p), p + " vs exact " + s.p);
      check("mid-p of het " + s.h + ", hom " + s.c + "/" + s.r, same(mp, s.midp), mp + " vs exact " + s.midp);
    }
  }
  note(big.toLocaleString("en-US") + " more tables with up to " + maxN + " people match (relative error below 1e-9)");

  /* 3. the worked example of Wigginton, Cutler & Abecasis (2005, AJHG 76:887), Table 1: 100 people,
     21 copies of the minor allele; P(n_AB) and the exact-test p-value P_HWE, to 6 decimals */
  const T1 = [[5, "<.000001", "<.000001"], [7, 0.000001, 0.000001], [9, 0.000047, 0.000048], [11, 0.000870, 0.000919],
    [13, 0.009375, 0.010293], [15, 0.059283, 0.069576], [17, 0.214465, 0.284042], [19, 0.406355, 1.000000], [21, 0.309604, 0.593645]];
  const d21 = dist(100, 21);
  for (const [h, prob, phwe] of T1) {
    const r = (21 - h) / 2, c = 100 - h - r, s = d21.states[(h - 1) / 2], p = hwe(h, r, c);
    const ok6 = (x, v) => (v === "<.000001" ? x < 0.0000005 : Number(x.toFixed(6)) === v);
    check("Wigginton Table 1, n_AB = " + h + ": P(n_AB)", ok6(s.prob, prob), s.prob);
    check("Wigginton Table 1, n_AB = " + h + ": P_HWE", ok6(p, phwe), p);
  }
  /* the sizes of the rejection regions at alpha = 0.05 that the paper gives for 100 people */
  const region = (n, nMinor) => dist(n, nMinor).states.filter(s => hwe(s.h, s.r, s.c) <= 0.05);
  const size = st => st.reduce((a, s) => a + s.prob, 0);
  for (const [nMinor, rMin, value] of [[2, 1, 0.0050], [5, 1, 0.0499], [6, 2, 0.0011], [13, 2, 0.0482]]) {
    const reg = region(100, nMinor), all = dist(100, nMinor).states;
    check("Wigginton: " + nMinor + " copies, rejected tables are those with >= " + rMin + " minor homozygotes",
      reg.length === all.filter(s => s.r >= rMin).length && reg.every(s => s.r >= rMin), reg.map(s => s.r).join(","));
    /* the paper prints four decimals (0.04825 appears as .0482), so agreement within 0.00006 */
    check("Wigginton: " + nMinor + " copies, size of the test " + value, close(size(reg), value, 0.00006), size(reg));
  }
  const reg21 = region(100, 21);
  check("Wigginton: 21 copies, rejected when <= 13 heterozygotes", reg21.length === d21.states.filter(s => s.h <= 13).length && reg21.every(s => s.h <= 13), reg21.map(s => s.h).join(","));
  check("Wigginton: 21 copies, size 0.010", Number(size(reg21).toFixed(3)) === 0.010, size(reg21));
  check("Wigginton: probability of 21 heterozygotes 0.31", Number(d21.states[10].prob.toFixed(2)) === 0.31);
  note("Wigginton et al. (2005) Table 1 and the rejection-region sizes in its text are reproduced");

  /* 4. edge cases and PLINK's conventions */
  check("no genotypes: p = 1", hwe(0, 0, 0) === 1);
  check("no genotypes: mid-p = 0.5", hwe(0, 0, 0, true) === 0.5);
  check("monomorphic: p = 1, mid-p = 0.5", hwe(0, 57, 0) === 1 && hwe(0, 0, 57, true) === 0.5);
  check("the order of the homozygote counts does not matter", hwe(13, 4, 83) === hwe(13, 83, 4));
  check("an exact tie counts as no more likely (het 2, hom 1/3 has p = 1)", hwe(2, 1, 3) === 1, hwe(2, 1, 3));

  /* 5. --hardy rows: ALL (founders), AFF and UNAFF; counts, O(HET), E(HET), p */
  const r5 = mulberry32(12), n = 61, m = 40, snps = snpMap(r5, m, 2, 1000, 5000), geno = new Int8Array(n * m);
  for (let x = 0; x < n * m; x++) geno[x] = r5() < 0.05 ? -1 : Math.floor(r5() * 3);
  const samples = plainSamples(Array.from({ length: n }, (_, i) => "P" + i));
  samples.forEach((s, i) => { s.phen = [1, 2, -9][i % 3]; if (i === 5) { s.pat = "P1"; s.mat = "P2"; } });
  const ds = { samples, snps, n, m, geno, phenoType: "cc" }, rows = S.hardy(ds);
  check("--hardy gives 3 rows per SNP for case/control data", rows.length === 3 * m);
  let rowOk = 0;
  for (const row of rows) {
    const keep = i => i !== 5 && (row.test === "ALL" || samples[i].phen === (row.test === "AFF" ? 2 : 1));
    let a = 0, het = 0, b = 0;
    for (let i = 0; i < n; i++) if (keep(i)) { const g = geno[row.snp * n + i]; if (g === 2) a++; else if (g === 1) het++; else if (g === 0) b++; }
    const tot = a + het + b, pA1 = (2 * a + het) / (2 * tot);
    if (row.counts[0] === a && row.counts[1] === het && row.counts[2] === b && close(row.oHet, het / tot, 1e-15) &&
        close(row.eHet, 2 * pA1 * (1 - pA1), 1e-15) && row.p === hwe(het, a, b)) rowOk++;
  }
  check("--hardy counts (founders only), O(HET), E(HET) and p", rowOk === rows.length, rowOk + " of " + rows.length);
});

/* ============================================================================================
   B. --genome on simulated relatives
   ============================================================================================ */
await section("B", "--genome on simulated relatives", () => {
  /* 10,000 unlinked SNPs: the method-of-moments Z estimates then lie within about 0.06 of the simulated
     IBD shares (measured over 12 seeds; with 6,000 SNPs half-sibling Z1 errors reached 0.10) */
  const rnd = mulberry32(20261108), M = 10000;
  const snps = snpMap(rnd, M, 4, 20000, 40000);      // about 40 kb apart, so PPC's 500 kb gap matters
  const freq = Float64Array.from({ length: M }, () => 0.1 + 0.8 * rnd());
  let label = 0;
  /* a person = two haplotypes of alleles and of founder-haplotype labels (for the simulated IBD) */
  function founder() {
    const hap = [new Int8Array(M), new Int8Array(M)], lab = [new Int32Array(M).fill(label++), new Int32Array(M).fill(label++)];
    for (let j = 0; j < M; j++) { hap[0][j] = rnd() < freq[j] ? 1 : 0; hap[1][j] = rnd() < freq[j] ? 1 : 0; }
    return { hap, lab };
  }
  function gamete(p) {          // unlinked SNPs: each SNP comes from either parental haplotype
    const h = new Int8Array(M), l = new Int32Array(M);
    for (let j = 0; j < M; j++) { const k = rnd() < 0.5 ? 0 : 1; h[j] = p.hap[k][j]; l[j] = p.lab[k][j]; }
    return [h, l];
  }
  function child(a, b) { const [h1, l1] = gamete(a), [h2, l2] = gamete(b); return { hap: [h1, h2], lab: [l1, l2] }; }
  const people = [], add = (id, p) => { people.push({ id, p }); return p; };
  for (let i = 0; i < 140; i++) add("U" + i, founder());
  add("DUP", people[0].p);
  add("PO", child(people[1].p, founder()));
  const fa = founder(), mo = founder(); add("FS1", child(fa, mo)); add("FS2", child(fa, mo));
  const hp = founder(); add("HS1", child(hp, founder())); add("HS2", child(hp, founder()));
  const ga = founder(), gm = founder(), sib1 = child(ga, gm), sib2 = child(ga, gm);
  add("FC1", child(sib1, founder())); add("FC2", child(sib2, founder()));
  const n = people.length, geno = new Int8Array(n * M);
  for (let i = 0; i < n; i++) for (let j = 0; j < M; j++) {
    let g = people[i].p.hap[0][j] + people[i].p.hap[1][j];
    if (rnd() < 0.001) g = Math.floor(rnd() * 3);        // genotyping error
    if (rnd() < 0.01) g = -1;                            // missing call
    geno[j * n + i] = g;
  }
  const ds = { samples: plainSamples(people.map(x => x.id)), snps, n, m: M, geno, phenoType: "cc" };
  const idx = Object.fromEntries(people.map((x, i) => [x.id, i]));
  function realized(x, y) {
    const k = [0, 0, 0];
    for (let j = 0; j < M; j++) {
      const a0 = x.lab[0][j], a1 = x.lab[1][j], b0 = y.lab[0][j], b1 = y.lab[1][j];
      k[(a0 === b0 && a1 === b1) || (a0 === b1 && a1 === b0) ? 2 : (a0 === b0 || a0 === b1 || a1 === b0 || a1 === b1) ? 1 : 0]++;
    }
    return k.map(v => v / M);
  }
  const G = S.genome(ds), byPair = new Map(G.pairs.map(p => [p.i * n + p.k, p]));
  const pairOf = (a, b) => byPair.get(Math.min(idx[a], idx[b]) * n + Math.max(idx[a], idx[b]));
  check("every pair is reported", G.pairs.length === n * (n - 1) / 2, G.pairs.length);
  check("every SNP is used", G.markers === M, G.markers);
  const REL = [["U0", "DUP", "duplicate", [0, 0, 1]], ["U1", "PO", "parent-offspring", [0, 1, 0]],
    ["FS1", "FS2", "full siblings", [0.25, 0.5, 0.25]], ["HS1", "HS2", "half siblings", [0.5, 0.5, 0]],
    ["FC1", "FC2", "first cousins", [0.75, 0.25, 0]]];
  note("pair                 Z0    Z1    Z2  PI_HAT   simulated IBD k0, k1, k2, share   expected");
  for (const [a, b, name, E] of REL) {
    const p = pairOf(a, b), k = realized(people[idx[a]].p, people[idx[b]].p), piR = k[1] / 2 + k[2], piE = E[1] / 2 + E[2];
    check(name + ": Z0 within 0.08 of the simulated k0", close(p.z0, k[0], 0.08), f3(p.z0) + " vs " + f3(k[0]));
    check(name + ": Z1 within 0.08 of the simulated k1", close(p.z1, k[1], 0.08), f3(p.z1) + " vs " + f3(k[1]));
    check(name + ": Z2 within 0.05 of the simulated k2", close(p.z2, k[2], 0.05), f3(p.z2) + " vs " + f3(k[2]));
    check(name + ": PI_HAT within 0.04 of the simulated share", close(p.pihat, piR, 0.04), f3(p.pihat) + " vs " + f3(piR));
    check(name + ": PI_HAT near its expectation", close(p.pihat, piE, 0.06), f3(p.pihat) + " vs " + piE);
    note(name.padEnd(18) + [p.z0, p.z1, p.z2, p.pihat].map(v => v.toFixed(3).padStart(6)).join("") + "   " +
      [...k, piR].map(f3).join(" ") + "          " + E.join("/") + ", " + piE);
  }
  const un = G.pairs.filter(p => p.i < 140 && p.k < 140), pis = un.map(p => p.pihat);
  const meanUn = mean(pis), maxUn = Math.max(...pis), p99 = pis.slice().sort((x, y) => x - y)[Math.floor(0.99 * pis.length)];
  check("unrelated pairs: mean PI_HAT below 0.015 (PLINK clamps negative estimates to 0)", meanUn < 0.015, meanUn);
  check("unrelated pairs: 99% of PI_HAT below 0.06", p99 < 0.06, p99);
  check("unrelated pairs: every PI_HAT below 0.12", maxUn < 0.12, maxUn);
  check("Z0, Z1, Z2 lie in [0, 1] after PLINK's clamping", G.pairs.every(p => [p.z0, p.z1, p.z2].every(z => z >= 0 && z <= 1 + 1e-12)));
  note(un.length + " unrelated pairs: PI_HAT mean " + meanUn.toFixed(4) + ", 99th percentile " + p99.toFixed(4) + ", max " + maxUn.toFixed(4));

  /* IBS0/1/2, HETHET and HOMHOM (after each counted SNP, PPC skips SNPs within 500 kb) by brute force */
  const lead = new Int32Array(M);
  for (let q = 0; q < M; q++) { let r = q + 1; while (r < M && snps[r].chr === snps[q].chr && snps[r].bp <= snps[q].bp + 500000) r++; lead[q] = r; }
  function brute(a, b) {
    let nn = 0, i0 = 0, i1 = 0, i2 = 0, hh = 0, ho = 0, next = 0;
    for (let q = 0; q < M; q++) {
      const x = geno[q * n + a], y = geno[q * n + b];
      if (x < 0 || y < 0) continue;
      nn++;
      const d = Math.abs(x - y);
      if (d === 2) i0++; else if (d === 1) i1++; else i2++;
      if ((d === 2 || (x === 1 && y === 1)) && q >= next) { if (d === 2) ho++; else hh++; next = lead[q]; }
    }
    return { nn, i0, i1, i2, hh, ho };
  }
  const sample = REL.map(([a, b]) => [Math.min(idx[a], idx[b]), Math.max(idx[a], idx[b])]);
  for (let t = 0; t < 400; t++) { const a = Math.floor(rnd() * n); let b = Math.floor(rnd() * n); if (a === b) b = (b + 1) % n; sample.push([Math.min(a, b), Math.max(a, b)]); }
  let ibsOk = 0, derivOk = 0;
  for (const [a, b] of sample) {
    const p = byPair.get(a * n + b), x = brute(a, b);
    if (p.nn === x.nn && p.ibs0 === x.i0 && p.ibs1 === x.i1 && p.ibs2 === x.i2 && p.hethet === x.hh && p.homhom === x.ho) ibsOk++;
    const dst = (x.i2 + 0.5 * x.i1) / x.nn, dr = 1 / (x.hh + x.ho);
    const ppc = S.normdist((x.hh * dr - 0.666666) / Math.sqrt(0.2222222 * dr));
    if (close(p.dst, dst, 1e-12) && p.ppc === ppc && (x.ho ? p.ratio === x.hh / x.ho : p.ratio !== p.ratio)) derivOk++;
  }
  check("IBS0, IBS1, IBS2, HETHET, HOMHOM equal brute force", ibsOk === sample.length, ibsOk + " of " + sample.length);
  check("DST, PPC and RATIO follow from those counts", derivOk === sample.length, derivOk + " of " + sample.length);
  const filtered = S.genome(ds, { min: 0.2 });
  check("min PI_HAT filter keeps exactly the pairs at or above it",
    filtered.pairs.length === G.pairs.filter(p => p.pihat >= 0.2).length && filtered.pairs.every(p => p.pihat >= 0.2));

  /* the same through the command line: the .genome file */
  const mem = new MemFS();
  putSet(mem, "/w/rel", ds);
  const io = mem.io(), r = PlinkCore.run(["--bfile", "/w/rel", "--genome", "--out", "/w/rel"], io);
  check("plink --genome exits 0", r.code === 0, io.lines.join(" | "));
  const gt = readTable(mem.text("/w/rel.genome"));
  check(".genome has the PLINK 1.9 columns", gt.header.join(" ") === "FID1 IID1 FID2 IID2 RT EZ Z0 Z1 Z2 PI_HAT PHE DST PPC RATIO", gt.header.join(" "));
  check(".genome has one row per pair", gt.rows.length === G.pairs.length, gt.rows.length);
  const cols = ["Z0", "Z1", "Z2", "PI_HAT", "DST", "PPC"].map(c => gt.num(c)), keys = ["z0", "z1", "z2", "pihat", "dst", "ppc"];
  const fid1 = gt.col("FID1"), fid2 = gt.col("FID2");
  let fileOk = 0;
  gt.rows.forEach((row, t) => {
    const p = pairOf(fid1[t], fid2[t]);
    if (p && keys.every((k, c) => close(cols[c][t], p[k], 0.00005 + 1e-12))) fileOk++;
  });
  check(".genome values equal PlinkCore.stats.genome to 4 decimals", fileOk === gt.rows.length, fileOk + " of " + gt.rows.length);
});

/* ============================================================================================
   C. Relationship matrix and PCA
   ============================================================================================ */
function jacobiEigen(Ain, n) {         // cyclic Jacobi rotations: an independent symmetric eigensolver
  const A = Float64Array.from(Ain), V = new Float64Array(n * n);
  for (let i = 0; i < n; i++) V[i * n + i] = 1;
  let scale = 0;
  for (let i = 0; i < n * n; i++) scale = Math.max(scale, Math.abs(A[i]));
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p * n + q] ** 2;
    if (off <= (1e-17 * scale) ** 2) break;
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
      const apq = A[p * n + q];
      if (Math.abs(apq) < 1e-300) continue;
      const theta = (A[q * n + q] - A[p * n + p]) / (2 * apq);
      const t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const x = A[k * n + p], y = A[k * n + q]; A[k * n + p] = c * x - s * y; A[k * n + q] = s * x + c * y; }
      for (let k = 0; k < n; k++) { const x = A[p * n + k], y = A[q * n + k]; A[p * n + k] = c * x - s * y; A[q * n + k] = s * x + c * y; }
      for (let k = 0; k < n; k++) { const x = V[k * n + p], y = V[k * n + q]; V[k * n + p] = c * x - s * y; V[k * n + q] = s * x + c * y; }
    }
  }
  const order = [...Array(n).keys()].sort((a, b) => A[b * n + b] - A[a * n + a]);
  return { values: order.map(i => A[i * n + i]), vectors: order.map(i => Float64Array.from({ length: n }, (_, k) => V[k * n + i])) };
}
const dot = (u, v) => { let s = 0; for (let i = 0; i < u.length; i++) s += u[i] * v[i]; return s; };
function randomOrthogonal(rnd, n) {
  const Qm = [];
  for (let c = 0; c < n; c++) {
    let v = Float64Array.from({ length: n }, () => normal(rnd));
    for (let pass = 0; pass < 2; pass++) for (const u of Qm) { const d = dot(u, v); for (let i = 0; i < n; i++) v[i] -= d * u[i]; }
    const nv = Math.sqrt(dot(v, v)); v = v.map(x => x / nv);
    Qm.push(v);
  }
  return Qm;     // columns
}
function eigenChecks(name, A, n, E, k, tol) {
  let orth = 0, resid = 0;
  for (let a = 0; a < k; a++) {
    for (let b = a; b < k; b++) orth = Math.max(orth, Math.abs(dot(E.vectors[a], E.vectors[b]) - (a === b ? 1 : 0)));
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = 0; j < n; j++) s += A[i * n + j] * E.vectors[a][j];
      resid = Math.max(resid, Math.abs(s - E.values[a] * E.vectors[a][i]));
    }
  }
  check(name + ": eigenvectors orthonormal", orth < tol, orth);
  check(name + ": A v = lambda v", resid < tol, resid);
  return { orth, resid };
}

await section("C", "relationship matrix and PCA (--pca)", () => {
  const rnd = mulberry32(5), n = 90, M = 2000, F = 0.05;
  const snps = snpMap(rnd, M, 4, 5000, 20000);
  const p0 = Array.from({ length: M }, () => 0.05 + 0.9 * rnd());
  const pk = [0, 1, 2].map(() => p0.map(p => beta(rnd, p * (1 - F) / F, (1 - p) * (1 - F) / F)));
  const pop = i => i % 3, geno = new Int8Array(n * M);
  for (let j = 0; j < M; j++) for (let i = 0; i < n; i++) {
    const p = pk[pop(i)][j];
    geno[j * n + i] = rnd() < 0.005 ? -1 : (rnd() < p ? 1 : 0) + (rnd() < p ? 1 : 0);
  }
  for (let i = 0; i < n; i++) geno[7 * n + i] = i === 3 ? -1 : 2;        // a monomorphic SNP
  const ds = { samples: plainSamples(Array.from({ length: n }, (_, i) => "P" + i)), snps, n, m: M, geno, phenoType: "cc" };

  /* the relationship matrix, from its formula */
  const R = S.grm(ds), A = R.matrix, p2 = new Float64Array(M);
  for (let j = 0; j < M; j++) {
    let a = 0, t = 0;
    for (let i = 0; i < n; i++) { const g = geno[j * n + i]; if (g >= 0) { a += 2 - g; t += 2; } }
    p2[j] = a / t;                       // frequency of A2
  }
  let worst = 0;
  for (let i = 0; i < n; i++) for (let k = i; k < n; k++) {
    let s = 0, cnt = 0;
    for (let j = 0; j < M; j++) {
      const gi = geno[j * n + i], gk = geno[j * n + k];
      if (gi < 0 || gk < 0) continue;
      cnt++;
      const p = p2[j], xi = 2 - gi, xk = 2 - gk, poly = p > 0 && p < 1;
      // diagonal: 1 + Fhat1, the mean of (x - 2p)^2 / (2p(1-p)), PLINK 1.9.0's default ("plink --help make-rel");
      // a monomorphic SNP adds 0 (infinity for a person who carries the absent allele)
      if (i === k) s += poly ? (xi - 2 * p) ** 2 / (2 * p * (1 - p)) : (xi === (p === 0 ? 0 : 2) ? 0 : Infinity);
      else if (poly) s += (xi - 2 * p) * (xk - 2 * p) / (2 * p * (1 - p));
    }
    worst = Math.max(worst, Math.abs(A[i * n + k] - s / cnt), Math.abs(A[k * n + i] - s / cnt));
  }
  check("relationship matrix equals its formula (diagonal 1 + Fhat1, pairwise non-missing SNPs)", worst < 1e-12, worst);
  check("the monomorphic SNP is noticed", R.monomorphic === true);
  /* PLINK 1.9 works through SNPs in windows of 20 and pads the last window with frequency-0 entries, which its
     monomorphic check also counts: the warning appears when the SNP count is not a multiple of 20 */
  const g2 = geno.slice();
  for (let j = 0; j < M; j++) {          // make every SNP polymorphic (the simulation leaves a rare one monomorphic)
    let a = 0, t = 0;
    for (let i = 0; i < n; i++) { const g = g2[j * n + i]; if (g >= 0) { a += g; t += 2; } }
    if (a === 0 || a === t) { g2[j * n] = 1; g2[j * n + 1] = 1; }
  }
  const noMono = { ...ds, geno: g2 }, cut = M - 7;
  const odd = { ...ds, geno: g2.slice(0, cut * n), snps: snps.slice(0, cut), m: cut };
  check("monomorphic warning: off for 2000 polymorphic SNPs, on for 1993 (not a multiple of 20)", S.grm(noMono).monomorphic === false && S.grm(odd).monomorphic === true);

  /* three eigensolvers on it: tred2/tql2 (eigenSym), bisection and inverse iteration (eigenTop), Jacobi */
  const E1 = S.eigenSym(A, n), E2 = S.eigenTop(A, n, 20), E3 = jacobiEigen(A, n);
  const lmax = Math.abs(E1.values[0]);
  let dv = 0;
  for (let i = 0; i < n; i++) dv = Math.max(dv, Math.abs(E1.values[i] - E2.values[i]), Math.abs(E1.values[i] - E3.values[i]));
  check("eigenvalues agree across the three solvers", dv < 1e-10 * lmax, dv);
  let dvec = 0, compared = 0;
  for (let a = 0; a < 20; a++) {
    const gap = Math.min(a > 0 ? E1.values[a - 1] - E1.values[a] : Infinity, E1.values[a] - E1.values[a + 1]);
    if (gap < 1e-6 * lmax) continue;
    compared++;
    dvec = Math.max(dvec, 1 - Math.abs(dot(E1.vectors[a], E2.vectors[a])), 1 - Math.abs(dot(E1.vectors[a], E3.vectors[a])));
  }
  check("top-20 eigenvectors agree across the three solvers", dvec < 1e-10 && compared > 15, dvec + " over " + compared);
  eigenChecks("eigenTop, relationship matrix", A, n, E2, 20, 1e-10);
  eigenChecks("eigenSym, relationship matrix", A, n, E1, n, 1e-10);
  let rec = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    let s = 0;
    for (let a = 0; a < n; a++) s += E1.values[a] * E1.vectors[a][i] * E1.vectors[a][j];
    rec = Math.max(rec, Math.abs(s - A[i * n + j]));
  }
  check("reconstruction V diag(lambda) V' = A", rec < 1e-10 * lmax, rec);
  /* signs: eigenTop must return the eigenvectors LAPACK's dsyevr returns, signs included, for the call PLINK 1.9
     makes (jobz 'V', range 'I', uplo 'U', abstol -1). Reference values from dsyevr in Apple's Accelerate (the
     library the macOS PLINK 1.9.0 build links), for A[i][j] = ((7i + 7j + 3ij) mod 11 - 5)/4 + (i == j ? i : 0). */
  const LAPACK = [
    [8, 5, [
      [8.2464631201020797, [-0.098241361241630076, 0.18551997538094395, 0.040689293253323391, -0.058236028913283999, -0.35503151251093279, 0.28247446748198268, -0.63195204008275119, -0.58794671476862614]],
      [6.3724763768413935, [-0.15148396113049667, -0.094783700223758788, 0.052118601389575858, -0.36184844964106599, -0.26408733280411678, 0.17934349339200514, -0.42839174908453842, 0.74094015407474534]],
      [4.9302982890234057, [-0.074459732130495032, -0.20424556857769272, -0.46385541771089334, -0.27952652048372462, 0.19299627705011274, 0.73640873935169149, 0.26347735620205681, -0.10235653488648282]],
      [3.9625026007413986, [-0.01069041191603223, -0.11125641401947411, 0.40717304287527201, 0.018124340471069089, -0.70390024191975842, 0.22307869865349741, 0.5241195874132839, -0.038057175313861491]],
      [2.7263023663258839, [0.0057537055353541131, 0.36338879534307922, -0.39043744875469044, -0.64608170712426827, -0.26665625283912636, -0.41142205122176145, 0.21166500958528139, -0.11347584292956242]],
    ]],
    [12, 6, [
      [11.254019330477432, [0.016284470262091604, -0.048953681791186136, -0.1177016189154254, 0.11865271851696099, 0.17786556999793166, -0.10500089342061299, 0.35181814833335112, 0.023957076013079202, -0.48784274598491095, 0.016140052888718896, 0.20888729309390569, 0.72146376723264827]],
      [10.567336647091702, [-0.011806432193407003, 0.18291748423191978, 0.17074862275579705, -0.076612948259132868, -0.20864686083642761, -0.13036660605108988, -0.18829189866917276, -0.073870283673949419, 0.18312106295827907, 0.84445384955572522, -0.012279009011093545, 0.2883593970928201]],
      [9.9757348860701303, [0.026838864848056775, 0.031563570233395295, -0.065238134967765982, -0.081238272560440111, 0.17068836431927858, -0.18202619626859071, 0.081980000308273474, 0.40728525436993396, 0.13650589042526906, 0.13868735461133877, 0.80396672784324252, -0.26139462989228923]],
      [8.8604946955296047, [0.10795664346639196, -0.050680558181588752, -0.058985130804549937, -0.1541865420629405, -0.088888073404906343, 0.21102372022745378, -0.018542216098902994, -0.28290356187316701, -0.72169408877472396, 0.30299787539752471, 0.11478298586759453, -0.44708899051686418]],
      [6.9628436723267892, [-0.12580803416550254, 0.2267528914184132, -0.16440312329936363, 0.067215709884611813, -0.06465206188833561, 0.16776866520495021, -0.52739074078988435, -0.51759102703439319, 0.07218995977881891, -0.24757771968648104, 0.45744405520506304, 0.21697987482243641]],
      [5.87485380403385, [-0.19558677631707205, -0.15361212429025656, -0.088520680925768466, -0.37068101409004189, -0.2625523320842082, 0.41122973956785114, -0.37076973485948711, 0.57920304373584863, -0.16531911056380469, -0.059691649237347384, -0.027584486870259838, 0.22419725661083523]],
    ]],
  ];
  let lapackWorst = 0;
  for (const [m, kk, ref] of LAPACK) {
    const Am = new Float64Array(m * m);
    for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) Am[i * m + j] = (((i * 7 + j * 7 + i * j * 3) % 11) - 5) / 4 + (i === j ? i : 0);
    const Em = S.eigenTop(Am, m, kk);
    ref.forEach(([val, vecRef], a) => {
      lapackWorst = Math.max(lapackWorst, Math.abs(Em.values[a] - val));
      vecRef.forEach((x, i) => { lapackWorst = Math.max(lapackWorst, Math.abs(Em.vectors[a][i] - x)); });
    });
  }
  check("eigenvalues and eigenvectors, signs included, equal LAPACK dsyevr's (8 x 8 top 5, 12 x 12 top 6)", lapackWorst < 1e-12, lapackWorst);

  /* repeated eigenvalues: eigenTop must return an orthonormal basis of each repeated eigenspace */
  const r2 = mulberry32(6), m2 = 40, Qm = randomOrthogonal(r2, m2);
  const D = [5, 5, 5, 3, 3, 1].concat(Array.from({ length: m2 - 6 }, () => 0.9 * r2()));
  const B = new Float64Array(m2 * m2);
  for (let i = 0; i < m2; i++) for (let j = 0; j < m2; j++) { let s = 0; for (let a = 0; a < m2; a++) s += D[a] * Qm[a][i] * Qm[a][j]; B[i * m2 + j] = s; }
  for (let i = 0; i < m2; i++) for (let j = 0; j < i; j++) { const v = (B[i * m2 + j] + B[j * m2 + i]) / 2; B[i * m2 + j] = B[j * m2 + i] = v; }
  const EB = S.eigenTop(B, m2, 6);
  check("repeated eigenvalues 5, 5, 5, 3, 3, 1 found", [5, 5, 5, 3, 3, 1].every((v, a) => close(EB.values[a], v, 1e-12)), Array.from(EB.values.slice(0, 6)).join(","));
  eigenChecks("eigenTop, repeated eigenvalues", B, m2, EB, 6, 1e-12);
  let sub = 0;
  for (const [lo, hi] of [[0, 3], [3, 5]]) for (let i = 0; i < m2; i++) for (let j = 0; j < m2; j++) {
    let pe = 0, pt = 0;
    for (let a = lo; a < hi; a++) { pe += EB.vectors[a][i] * EB.vectors[a][j]; pt += Qm[a][i] * Qm[a][j]; }
    sub = Math.max(sub, Math.abs(pe - pt));
  }
  check("repeated eigenvalues: the eigenspaces are the right ones", sub < 1e-10, sub);
  const E22 = S.eigenTop(new Float64Array([2, 1, 1, 2]), 2, 2), E11 = S.eigenTop(new Float64Array([4]), 1, 1);
  check("2 x 2 and 1 x 1 matrices", close(E22.values[0], 3, 1e-15) && close(E22.values[1], 1, 1e-15) && E11.values[0] === 4 && E11.vectors[0][0] === 1);

  /* --pca through the command line: .eigenval and .eigenvec */
  const P = S.pca(ds, { count: 20 }), mem = new MemFS();
  putSet(mem, "/w/pc", ds);
  const io = mem.io(), r = PlinkCore.run(["--bfile", "/w/pc", "--pca", "--out", "/w/pc"], io);
  check("plink --pca exits 0", r.code === 0, io.lines.join(" | "));
  const ev = lines(mem.text("/w/pc.eigenval")).map(Number), vec = lines(mem.text("/w/pc.eigenvec")).map(l => l.trim().split(/\s+/));
  check(".eigenval has 20 values equal to the top eigenvalues (6 significant digits)", ev.length === 20 && ev.every((v, a) => close(v, P.eigenvalues[a], 1e-5 * Math.abs(P.eigenvalues[a]))));
  check(".eigenvec has FID, IID and 20 PCs for each person", vec.length === n && vec.every(row => row.length === 22));
  let vecOk = 0;
  vec.forEach((row, i) => { if (row.slice(2).every((x, a) => close(Number(x), P.eigenvectors[a][i], 1e-6 + 1e-5 * Math.abs(P.eigenvectors[a][i])))) vecOk++; });
  check(".eigenvec values equal the eigenvectors (6 significant digits)", vecOk === n, vecOk + " of " + n);
  check("the eigenvalues are those of the relationship matrix", P.eigenvalues.every((v, a) => close(v, E1.values[a], 1e-10 * lmax)));
  const r2of = pc => { const y = P.eigenvectors[pc], mu = mean(y), gm = [0, 1, 2].map(g => mean(y.filter((v, i) => pop(i) === g))); let sb = 0, st = 0; y.forEach((v, i) => { sb += (gm[pop(i)] - mu) ** 2; st += (v - mu) ** 2; }); return sb / st; };
  check("PC1 and PC2 separate the three simulated populations (R^2 > 0.9)", r2of(0) > 0.9 && r2of(1) > 0.9, r2of(0).toFixed(3) + ", " + r2of(1).toFixed(3));
  note("eigenvalues agree to " + dv.toExponential(1) + " (three solvers); orthonormal and A v = lambda v to 1e-10; PC1/PC2 R^2 on population " + r2of(0).toFixed(2) + "/" + r2of(1).toFixed(2));
});

/* ============================================================================================
   D. Planted features of the toy data, recovered by the practical's commands
   ============================================================================================ */
await section("D", "planted features of the toy data (truth.json)", () => {
  if (!HAVE_DATA) return skip("no data in " + DATA);
  const res = getDataRun();
  if (!check("the practical's commands run on the toy data", !!res, dataRunError && dataRunError.message)) return;
  const { run, truth, card } = res, mem = run.mem, T = p => mem.text(p), F = truth.features;
  const steps = run.steps;
  for (const k of Object.keys(steps)) check("step " + k + " exit code", steps[k].code === (k === "merge1" ? 3 : 0), steps[k].code);

  /* (a) variant missingness: --geno 0.01 removes the planted SNPs */
  const a = F.a_variant_missingness, lm = readTable(T(ANALYSIS_DIR + "/toy.lmiss"));
  const fmiss = new Map(lm.col("SNP").map((id, i) => [id, Number(lm.col("F_MISS")[i])]));
  const removed = new Set(minus(new Set(bimIds(T(INPUT_DIR + "/toy.bim"))), new Set(bimIds(T(ANALYSIS_DIR + "/toy.geno0.01.bim")))));
  const planted = a.planted_snps.map(s => s.id);
  check("(a) every planted SNP has F_MISS > 0.01", planted.every(id => fmiss.get(id) > 0.01));
  check("(a) --geno 0.01 removes every planted SNP", planted.every(id => removed.has(id)), minus(new Set(planted), removed).join(","));
  check("(a) --geno 0.01 removes geno_0_01_removes SNPs", removed.size === a.geno_0_01_removes, removed.size + " vs " + a.geno_0_01_removes);
  check("(a) removed = planted + other_snps_failing_geno", setEq(removed, new Set(planted.concat((a.other_snps_failing_geno || []).map(s => s.id)))));
  note("(a) --geno 0.01 removes " + removed.size + " SNPs: the " + planted.length + " planted ones and " + (removed.size - planted.length) + " with sporadic missing calls");

  /* (b) sample missingness: --mind 0.01 after --geno removes the degraded samples */
  const b = F.b_sample_missingness;
  const gone = new Set(minus(new Set(famKeys(T(ANALYSIS_DIR + "/toy.geno0.01.fam"))), new Set(famKeys(T(Q + ".fam")))));
  check("(b) --mind 0.01 after --geno removes mind_after_geno_removes", setEq(gone, new Set(b.mind_after_geno_removes.map(idKey))), [...gone].join(","));
  check("(b) those are the degraded samples", setEq(gone, new Set(b.degraded.map(idKey))));
  const im = readTable(T(ANALYSIS_DIR + "/toy.imiss")), imK = im.rows.map(r => r[0] + " " + r[1]), imF = im.num("F_MISS");
  const rawFail = new Set(imK.filter((k, i) => imF[i] > 0.01));
  check("(b) on the raw data F_MISS > 0.01 flags mind_on_raw_data_would_remove", setEq(rawFail, new Set(b.mind_on_raw_data_would_remove.map(idKey))), [...rawFail].join(","));
  check("(b) the low-quality samples fail only before --geno", b.low_quality.every(s => rawFail.has(idKey(s)) && !gone.has(idKey(s))));
  note("(b) --mind 0.01 removes " + gone.size + " degraded samples after --geno; on the raw data " + rawFail.size + " samples have F_MISS > 0.01");

  /* (c) Hardy-Weinberg: artifacts below 1e-8 in UNAFF; the causal SNP departs in AFF only */
  const c = F.c_hardy_weinberg, hw = readTable(T(Q + ".hwe"));
  const hsnp = hw.col("SNP"), htest = hw.col("TEST"), hp = hw.num("P"), ho = hw.num("O(HET)"), he = hw.num("E(HET)");
  const row = (id, t) => { for (let i = 0; i < hsnp.length; i++) if (hsnp[i] === id && htest[i] === t) return i; return -1; };
  for (const s of c.heterozygote_deficit) for (const t of ["UNAFF", "AFF", "ALL"]) {
    const i = row(s.id, t);
    check("(c) deficit SNP " + s.id + " " + t + ": p < 1e-8 and O(HET) < E(HET)", i >= 0 && hp[i] < 1e-8 && ho[i] < he[i], i >= 0 ? hp[i] : "missing");
  }
  for (const s of c.heterozygote_excess) for (const t of ["UNAFF", "AFF", "ALL"]) {
    const i = row(s.id, t);
    check("(c) excess SNP " + s.id + " " + t + ": p < 1e-8 and O(HET) > E(HET)", i >= 0 && hp[i] < 1e-8 && ho[i] > he[i], i >= 0 ? hp[i] : "missing");
  }
  const art = new Set(c.heterozygote_deficit.concat(c.heterozygote_excess).map(s => s.id));
  const un8 = new Set(hsnp.filter((id, i) => htest[i] === "UNAFF" && hp[i] < 1e-8));
  check("(c) no other SNP has UNAFF p < 1e-8", minus(un8, art).length === 0, minus(un8, art).join(","));
  const ca = row(c.causal_snp, "AFF"), cu = row(c.causal_snp, "UNAFF");
  check("(c) causal SNP: AFF p < 1e-3 with a heterozygote deficit", ca >= 0 && hp[ca] < 1e-3 && ho[ca] < he[ca], ca >= 0 ? hp[ca] : "missing");
  check("(c) causal SNP: UNAFF p > 1e-3 (kept by an HWE filter in controls)", cu >= 0 && hp[cu] > 1e-3, cu >= 0 ? hp[cu] : "missing");
  const strat = (c.stratification_examples || []).map(s => s.id);
  for (const id of strat) {
    const a = row(id, "ALL"), u = row(id, "UNAFF");
    check("(c) stratification SNP " + id + ": ALL p < 1e-8 with a heterozygote deficit, UNAFF p >= 1e-8",
      a >= 0 && u >= 0 && hp[a] < 1e-8 && ho[a] < he[a] && hp[u] >= 1e-8, a >= 0 && u >= 0 ? hp[a] + " / " + hp[u] : "missing");
  }
  const all8 = new Set(hsnp.filter((id, i) => htest[i] === "ALL" && hp[i] < 1e-8));
  const explained = new Set([...art, ...strat, c.causal_snp]);
  check("(c) every SNP with ALL p < 1e-8 is planted, the causal SNP or listed in stratification_examples", minus(all8, explained).length === 0, minus(all8, explained).join(","));
  note("(c) UNAFF p < 1e-8: " + un8.size + " SNPs (" + c.heterozygote_deficit.length + " deficit, " + c.heterozygote_excess.length +
    " excess); causal " + c.causal_snp + " AFF p " + (ca >= 0 ? hw.rows[ca][hw.header.indexOf("P")] : "-") + ", UNAFF p " + (cu >= 0 ? hw.rows[cu][hw.header.indexOf("P")] : "-") +
    "; below 1e-8 in ALL only: " + (minus(all8, un8).join(", ") || "none"));

  /* (d) relatedness: the planted pairs stand out in --genome on the pruned QC'd data */
  const gen = readTable(T(Q + ".LD0.3.genome"));
  const g1 = gen.rows.map(r => r[0] + " " + r[1]), g2 = gen.rows.map(r => r[2] + " " + r[3]);
  const gz = ["Z0", "Z1", "Z2", "PI_HAT"].map(k => gen.num(k));
  const findPair = (x, y) => g1.findIndex((k, i) => (k === x && g2[i] === y) || (k === y && g2[i] === x));
  const plantedRows = new Set(), contam = idKey(F.e_heterozygosity.contaminated);
  const pairRule = rel => /^duplicate/.test(rel) ? (z => z[3] > 0.9) : /^parent/.test(rel) ? (z => z[1] > 0.8) :
    /^full/.test(rel) ? (z => z[0] > 0.1 && z[0] < 0.4 && z[1] > 0.35 && z[1] < 0.65 && z[2] > 0.1 && z[2] < 0.4) :
    /^half/.test(rel) ? (z => z[3] > 0.17 && z[3] < 0.33 && z[2] < 0.1) : /^first cousin/.test(rel) ? (z => z[3] > 0.06 && z[3] < 0.19) : (() => false);
  for (const pr of F.d_relatedness.pairs) {
    const i = findPair(idKey(pr.a), idKey(pr.b));
    if (!check("(d) " + pr.relationship + ": pair in the .genome file", i >= 0)) continue;
    plantedRows.add(i);
    const z = gz.map(col => col[i]), E = pr.expected, re = pr.realized;
    check("(d) " + pr.relationship + ": Z0, Z1, Z2, PI_HAT in the expected class", pairRule(pr.relationship)(z), z.map(f3).join(" "));
    check("(d) " + pr.relationship + ": PI_HAT within 0.1 of " + E.PI_HAT, close(z[3], E.PI_HAT, 0.1), f3(z[3]));
    if (re && re.k1 !== undefined) check("(d) " + pr.relationship + ": PI_HAT within 0.06 of the simulated share", close(z[3], re.k1 / 2 + re.k2, 0.06), f3(z[3]) + " vs " + f3(re.k1 / 2 + re.k2));
    note("(d) " + pr.relationship.split(" (")[0].padEnd(24) + "Z0 Z1 Z2 PI_HAT " + z.map(f3).join(" ") + "  (expected " + [E.Z0, E.Z1, E.Z2, E.PI_HAT].join(" ") + ")");
  }
  const others = gz[3].filter((v, i) => !plantedRows.has(i) && g1[i] !== contam && g2[i] !== contam);
  const minPlanted = Math.min(...[...plantedRows].map(i => gz[3][i])), maxOther = Math.max(...others);
  check("(d) every planted pair has a higher PI_HAT than every other pair without the contaminated sample", minPlanted > maxOther, f3(minPlanted) + " vs " + f3(maxOther));
  const withContam = gz[3].filter((v, i) => (g1[i] === contam || g2[i] === contam) && v > 0.1875).length;
  note("(d) other pairs without the contaminated sample: max PI_HAT " + f3(maxOther) + "; pairs with the contaminated sample above 0.1875: " + withContam);

  /* (e) heterozygosity: the contaminated and the inbred person, under both rules */
  const e = F.e_heterozygosity, het = readTable(T(Q + ".LD0.3.het"));
  const hk = het.rows.map(r => r[0] + " " + r[1]), NM = het.num("N(NM)"), OH = het.num("O(HOM)"), Fh = het.num("F");
  const rate = NM.map((v, i) => (v - OH[i]) / v), mu = mean(rate), s3 = 3 * sd(rate);
  const ic = hk.indexOf(idKey(e.contaminated)), ib = hk.indexOf(idKey(e.inbred));
  check("(e) contaminated: F < -0.1 and rate above mean + 3 SD", ic >= 0 && Fh[ic] < -0.1 && rate[ic] > mu + s3, ic >= 0 ? f3(Fh[ic]) + ", " + f3(rate[ic]) : "missing");
  check("(e) inbred: F > 0.1 and rate below mean - 3 SD", ib >= 0 && Fh[ib] > 0.1 && rate[ib] < mu - s3, ib >= 0 ? f3(Fh[ib]) + ", " + f3(rate[ib]) : "missing");
  if (ib >= 0 && e.inbred_realized_autozygosity != null) check("(e) inbred: F within 0.1 of the simulated autozygosity", close(Fh[ib], e.inbred_realized_autozygosity, 0.1), f3(Fh[ib]) + " vs " + e.inbred_realized_autozygosity);
  const sdSet = new Set(hk.filter((k, i) => Math.abs(rate[i] - mu) > s3)), fSet = new Set(hk.filter((k, i) => Math.abs(Fh[i]) > 0.1));
  /* whether the two rules flag the same people is a property of the draw (truth.json: they "nearly
     coincide"), not a planted feature, so it is reported, not tested */
  const onlySd = minus(sdSet, fSet).map(k => k.split(" ")[0]), onlyF = minus(fSet, sdSet).map(k => k.split(" ")[0]);
  note("(e) contaminated F " + (ic >= 0 ? f3(Fh[ic]) : "-") + ", inbred F " + (ib >= 0 ? f3(Fh[ib]) : "-") + "; +/-3 SD flags " + sdSet.size + ", |F| > 0.1 flags " + fSet.size +
    (setEq(sdSet, fSet) ? " (the same people)" : "; only +/-3 SD: " + (onlySd.join(", ") || "none") + "; only |F|: " + (onlyF.join(", ") || "none")));

  /* (f) the merge with the reference panel */
  const f = F.f_reference_merge, m1 = steps.merge1.lines;
  check("(f) first --bmerge fails with 'variants with 3+ alleles present'", m1.some(l => /^\[stderr\] Error: \d+ variants? with 3\+ alleles present\.$/.test(l)), m1.filter(l => /Error/.test(l)).join(" | "));
  const missnp = new Set(lines(T(Q + ".merge1kgenomes-merge.missnp")).map(l => l.trim()));
  check("(f) -merge.missnp lists expected_missnp", setEq(missnp, new Set(f.expected_missnp)), missnp.size + " vs " + f.expected_missnp.length);
  check("(f) --flip flips them", card.flip_snps === f.expected_missnp.length, card.flip_snps);
  const qcPeople = famKeys(T(Q + ".fam")).length, qcSnps = bimIds(T(Q + ".bim")).length;
  check("(f) second merge: QC'd people + reference people", card.merge2_people === qcPeople + truth.reference.n, card.merge2_people);
  const union = new Set(bimIds(T(Q + ".bim")).concat(bimIds(T(REFERENCE_DIR + "/toy_1kg.bim"))));
  check("(f) second merge: the union of the QC'd and the reference SNPs", card.merge2_snps === union.size, card.merge2_snps + " vs " + union.size);
  const mds = getSet(mem, Q + ".merge1kgenomes");
  const panel = readTable(T(ANALYSIS_DIR + "/akt/data/integrated_call_samples_v3.20130502.ALL.panel"));
  const eurRef = new Set(panel.col("sample").filter((s, i) => panel.col("super_pop")[i] === "EUR"));
  const isStudy = mds.samples.map(s => s.fid.charAt(0) === "\""), isEur = mds.samples.map(s => eurRef.has(s.iid));
  const freqA1 = (j, keep) => { let a1 = 0, t = 0; for (let i = 0; i < mds.n; i++) { const g = mds.geno[j * mds.n + i]; if (keep[i] && g >= 0) { a1 += g; t += 2; } } return a1 / t; };
  const snpIdx = new Map(mds.snps.map((s, j) => [s.id, j]));
  let mirrored = 0;
  for (const s of f.palindromic_shared_strand_swapped) {
    const j = snpIdx.get(s.id);
    if (j === undefined) { check("(f) strand-swapped palindromic SNP " + s.id + " is in the merged set", false); continue; }
    const fs_ = freqA1(j, isStudy), fr = freqA1(j, isEur);
    if (check("(f) strand-swapped palindromic SNP " + s.id + ": study frequency mirrors the reference EUR one", Math.abs(fs_ - (1 - fr)) < Math.abs(fs_ - fr), f3(fs_) + " vs " + f3(fr))) mirrored++;
  }
  note("(f) missnp " + missnp.size + ", merged " + card.merge2_people + " people x " + card.merge2_snps + " SNPs; " + mirrored + " of " +
    f.palindromic_shared_strand_swapped.length + " strand-swapped A/T or C/G SNPs merge silently with mirrored frequencies");

  /* (g) GrafAnc */
  const ga = readTable(T(ANALYSIS_DIR + "/toy_grafanc_out.txt"));
  const bySample = new Map(truth.study.samples.map(s => [s.fid.replace(/"/g, "") + "_" + s.iid, s]));
  const grp = ga.num("AncGroupID"), pf = ga.num("Pf"), pa = ga.num("Pa"), names = ga.col("Sample").map(x => x.replace(/"/g, ""));
  check("(g) GrafAnc scores every QC'd person", grp.length === qcPeople, grp.length);
  const conf = {}, expect = { EUR: 300, AFR: 100, EAS: 500, SAS: 400 };
  const afr = [], afrTrue = [], eas = [], easTrue = [];   /* Pa: people without South Asian ancestry, whom GrafAnc puts partly towards East Asia */
  names.forEach((nm, i) => {
    const s = bySample.get(nm);
    if (!s) return;
    const lab = s.super_pop;
    (conf[lab] = conf[lab] || {})[grp[i]] = (conf[lab][grp[i]] || 0) + 1;
    afr.push(pf[i]); afrTrue.push(100 * ((s.ancestry && s.ancestry.AFR) || 0));
    if (!(s.ancestry && s.ancestry.SAS)) { eas.push(pa[i]); easTrue.push(100 * ((s.ancestry && s.ancestry.EAS) || 0)); }
  });
  for (const lab of Object.keys(expect)) {
    if (!conf[lab]) continue;
    const tot = Object.values(conf[lab]).reduce((x, y) => x + y, 0), hit = conf[lab][expect[lab]] || 0;
    const need = lab === "EUR" ? Math.ceil(0.98 * tot) : tot;
    check("(g) " + lab + "-like people in AncGroupID " + expect[lab], hit >= need, hit + " of " + tot + " " + JSON.stringify(conf[lab]));
  }
  const rAfr = pearson(afr, afrTrue), rEas = pearson(eas, easTrue);
  check("(g) Pf follows the simulated African ancestry (r > 0.95)", rAfr > 0.95, rAfr);
  check("(g) Pa follows the simulated East Asian ancestry, South Asians aside (r > 0.95)", rEas > 0.95, rEas);
  note("(g) AncGroupID by simulated group: " + Object.entries(conf).map(([k, v]) => k + " " + JSON.stringify(v)).join("; "));
  note("(g) r(Pf, African ancestry) " + rAfr.toFixed(3) + ", r(Pa, East Asian ancestry; South Asians aside) " + rEas.toFixed(3));

  /* long-range LD region (8p23.1-like inversion). Its eigenvalue is close to that of the African axis, so in
     other seeds the two can mix across PC1 and PC2: test the multiple correlation of the inverted-copy count
     with PC1 and PC2 together (regression on both), and report the single best PC. */
  const lr = F.long_range_ld_region, copiesOf = new Map(truth.study.samples.map((s, i) => [s.fid, lr.inverted_clade_copies_by_row[i]]));
  const ev = lines(T(Q + ".extra.noprune.eigenvec")).map(l => l.trim().split(/\s+/));
  const yv = ev.map(r => copiesOf.get(r[0])), p1 = ev.map(r => Number(r[2])), p2 = ev.map(r => Number(r[3]));
  const r1 = pearson(p1, yv), r2 = pearson(p2, yv), r12 = pearson(p1, p2);
  const R12 = Math.sqrt((r1 * r1 + r2 * r2 - 2 * r1 * r2 * r12) / (1 - r12 * r12));
  check("(h) unpruned PCA: PC1 and PC2 together follow the inversion (multiple R > 0.9)", R12 > 0.9, R12.toFixed(3));
  check("(h) pruned PCA: no PC follows it (|r| < 0.5)", card.pca_pruned_inversion_r < 0.5, card.pca_pruned_inversion_r);
  check("(h) pruning keeps few of the region's SNPs", card.long_range_snps_prune_in < 0.25 * card.long_range_snps_qc, card.long_range_snps_prune_in + " of " + card.long_range_snps_qc);
  /* qc-pca.html says the toy PCAs of steps 6 and 7 print PLINK 1.9.0's monomorphic-variant warning (SNP counts
     not multiples of 20), and that the toy data have no monomorphic SNP */
  const warned = k => (steps[k].lines || []).some(l => /Monomorphic variant\(s\) present/.test(l));
  check("steps 6 and 7: the PCA prints the monomorphic warning (SNP counts not multiples of 20)",
    warned("pca") && warned("merged_pca") && card.pca_snps % 20 !== 0 && card.merged_pca_snps % 20 !== 0, card.pca_snps + ", " + card.merged_pca_snps);
  note("(h) inversion: unpruned PC1+PC2 multiple R " + R12.toFixed(2) + ", best single PC" + card.pca_unpruned_inversion_pc + " |r| " + card.pca_unpruned_inversion_r + ", pruned max |r| " + card.pca_pruned_inversion_r +
    "; region SNPs " + card.long_range_snps_qc + " after QC, " + card.long_range_snps_prune_in + " in prune.in");
  check("causal SNP passes QC", bimIds(T(Q + ".bim")).includes(F.causal_snp.id));
});

/* ============================================================================================
   E. The data card
   ============================================================================================ */
await section("E", "data card (data-card.js)", () => {
  if (!HAVE_DATA) return skip("no data in " + DATA);
  const res = getDataRun();
  if (!check("the practical's commands run on the toy data", !!res, dataRunError && dataRunError.message)) return;
  const { card, truth } = res;
  check("study counts agree with truth.json", card.study_people === truth.study.n && card.study_snps === truth.study.m, card.study_people + " x " + card.study_snps);
  check("reference counts agree with truth.json", card.ref_people === truth.reference.n && card.ref_snps === truth.reference.m, card.ref_people + " x " + card.ref_snps);
  check("relatives agree with truth.json", card.sim_related_pairs === truth.features.d_relatedness.pairs.length);
  check("the card says how it was checked against real PLINK", /same files as real PLINK 1\.9\.0/.test(card.card_source));
  if (DATA !== DEFAULT_DATA) { note("--data given: the repository's data-card.js is not compared"); return; }
  const cardFile = path.join(LAB, "data-card.js"), grafFile = path.join(LAB, "grafanc-core.js");
  if (!check("data-card.js exists", fs.existsSync(cardFile))) return;
  const text = fs.readFileSync(cardFile, "utf8");
  check("data-card.js is what tools/make_data_card.mjs writes now", text === res.script, "run node 1-introduction-gwas-qc/tools/make_data_card.mjs");
  check("grafanc-core.js holds the reference built from data/grafanc_ref.json", fs.readFileSync(grafFile, "utf8") === res.grafSource, "run node 1-introduction-gwas-qc/tools/make_data_card.mjs");
  const { TOY_CARD, TOY_PEOPLE } = require(cardFile);
  const keys = new Set(Object.keys(card));
  check("data-card.js has the same keys as the commands' card", setEq(new Set(Object.keys(TOY_CARD)), keys), minus(keys, new Set(Object.keys(TOY_CARD))).concat(minus(new Set(Object.keys(TOY_CARD)), keys)).join(","));
  let same = 0;
  for (const k of keys) if (JSON.stringify(TOY_CARD[k]) === JSON.stringify(card[k])) same++; else check("TOY_CARD." + k, false, JSON.stringify(TOY_CARD[k]) + " vs " + JSON.stringify(card[k]));
  check("every TOY_CARD value equals what the commands produce", same === keys.size, same + " of " + keys.size);
  check("data-card.js says how it was checked against real PLINK", /same\s+files\s+as\s+real\s+PLINK\s+1\.9\.0/.test(text));
  /* TOY_PEOPLE: one entry per toy.fam person, keyed by the FID with its quotes; planted causes agree with the features */
  const famFids = lines(fs.readFileSync(path.join(DATA, "toy.fam"), "utf8")).map(l => l.trim().split(/\s+/)[0]);
  check("TOY_PEOPLE has one entry per toy.fam FID", TOY_PEOPLE && setEq(new Set(Object.keys(TOY_PEOPLE)), new Set(famFids)) && famFids.length === truth.study.n);
  const F = truth.features, roleOf = fid => TOY_PEOPLE[fid] && TOY_PEOPLE[fid].planted;
  check("TOY_PEOPLE: the contaminated and the inbred person", roleOf(F.e_heterozygosity.contaminated.fid) === "contaminated" && roleOf(F.e_heterozygosity.inbred.fid) === "inbred");
  check("TOY_PEOPLE: the degraded samples", F.b_sample_missingness.degraded.every(x => roleOf(x.fid) === "degraded"));
  check("TOY_PEOPLE: every planted relative names the other member of its pair", F.d_relatedness.pairs.every(pr => TOY_PEOPLE[pr.a.fid].pair === pr.b.fid && TOY_PEOPLE[pr.b.fid].pair === pr.a.fid));
  check("TOY_PEOPLE: admixed people carry their proportions", Object.values(TOY_PEOPLE).filter(e => e.super === "ADMIXED").every(e => e.ancestry && close(Object.values(e.ancestry).reduce((a, b) => a + b, 0), 1, 0.01)));
  check("TOY_PEOPLE equals what make_data_card.mjs builds", JSON.stringify(TOY_PEOPLE) === JSON.stringify(res.people));
  /* every <… data-card="KEY"> in the lecture's pages names a key (HTML comments, notes to writers, are skipped) */
  const used = new Map();
  (function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === "node_modules" || ent.name.startsWith(".")) continue;
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (/\.html?$/.test(ent.name)) for (const m of fs.readFileSync(p, "utf8").replace(/<!--[\s\S]*?-->/g, "").matchAll(/data-card="([^"]+)"/g)) {
        if (!used.has(m[1])) used.set(m[1], new Set());
        used.get(m[1]).add(path.relative(LECTURE, p));
      }
    }
  })(LECTURE);
  for (const [k, files] of used) check("card key used by a page exists: " + k, keys.has(k), [...files].join(", "));
  /* every key is documented in data/README.md, section "TOY_CARD keys" */
  const readme = fs.existsSync(path.join(DATA, "README.md")) ? fs.readFileSync(path.join(DATA, "README.md"), "utf8") : "";
  const at = readme.search(/^#+ *TOY_CARD keys/m);
  if (check("data/README.md has a \"TOY_CARD keys\" section", at >= 0)) {
    const sec = readme.slice(at).replace(/^#+ *TOY_CARD keys[^\n]*\n/, "").split(/^## /m)[0];
    const generic = k => k.replace(/^ibd_(duplicate|parent_offspring|full_sibs|half_sibs|first_cousins)_/, "ibd_REL_");
    const undocumented = [...keys].filter(k => !sec.includes("`" + k + "`") && !sec.includes("`" + generic(k) + "`"));
    check("every card key is documented in data/README.md", undocumented.length === 0, undocumented.join(", "));
  }
  note(keys.size + " card keys; " + used.size + " distinct keys used by the pages");
});

/* ============================================================================================
   F. readBfile / writeBfile round trips
   ============================================================================================ */
await section("F", "PLINK binary files: read and write round trips", () => {
  const rnd = mulberry32(3);
  let sets = 0;
  for (const n of [1, 2, 3, 4, 5, 6, 7, 9, 13, 250, 251]) for (const m of [1, 2, 37]) {
    sets++;
    const qt = (n + m) % 4 === 0, snps = [], samples = [], geno = new Int8Array(n * m);
    for (let j = 0; j < m; j++) { const [a1, a2] = allelePair(rnd, true); snps.push({ chr: 1 + Math.floor(rnd() * 22), id: "rs" + Math.floor(rnd() * 1e8), cm: rnd() < 0.5 ? 0 : Math.round(rnd() * 1e4) / 100, bp: 1 + Math.floor(rnd() * 2e8), a1, a2 }); }
    for (let i = 0; i < n; i++) samples.push({ fid: "\"" + (80001 + i) + "\"", iid: rnd() < 0.5 ? "1" : "S" + i, pat: rnd() < 0.2 ? "\"80001\"" : "0", mat: "0", sex: [0, 1, 2][Math.floor(rnd() * 3)], phen: qt ? (rnd() < 0.1 ? -9 : Math.round(rnd() * 400 - 200) / 8) : [1, 2, -9][Math.floor(rnd() * 3)] });
    for (let x = 0; x < n * m; x++) geno[x] = rnd() < 0.1 ? -1 : Math.floor(rnd() * 3);
    const ds = { samples, snps, n, m, geno, phenoType: qt ? "qt" : "cc" };
    const w = PlinkCore.writeBfile(ds), back = PlinkCore.readBfile(w.bed, w.bim, w.fam), w2 = PlinkCore.writeBfile(back);
    const bpr = (n + 3) >> 2;
    let pad = true;
    if (n % 4) for (let j = 0; j < m; j++) if (w.bed[3 + j * bpr + bpr - 1] >> ((n % 4) * 2)) pad = false;
    const tag = n + " x " + m + (qt ? " (quantitative)" : "");
    check(tag + ": .bed size and magic number", w.bed.length === 3 + bpr * m && w.bed[0] === 0x6c && w.bed[1] === 0x1b && w.bed[2] === 1);
    check(tag + ": padding bits are zero", pad);
    check(tag + ": genotypes", back.geno.every((g, x) => g === geno[x]));
    check(tag + ": variants", back.snps.every((s, j) => ["chr", "id", "cm", "bp", "a1", "a2"].every(k => String(s[k]) === String(snps[j][k]))));
    check(tag + ": samples", back.samples.every((s, i) => ["fid", "iid", "pat", "mat", "sex", "phen"].every(k => s[k] === samples[i][k])) && back.phenoType === ds.phenoType);
    check(tag + ": write(read(files)) gives the same files", Buffer.compare(Buffer.from(w2.bed), Buffer.from(w.bed)) === 0 && w2.bim === w.bim && w2.fam === w.fam);
  }
  note(sets + " random sets (1-251 people, missing calls, odd sample counts) round-trip exactly");
  if (!HAVE_DATA) return note("no data in " + DATA + ": data/ round trips skipped");
  for (const name of ["toy", "toy_1kg"]) {
    const bed = fs.readFileSync(path.join(DATA, name + ".bed")), bim = fs.readFileSync(path.join(DATA, name + ".bim"), "utf8"), fam = fs.readFileSync(path.join(DATA, name + ".fam"), "utf8");
    const ds = PlinkCore.readBfile(new Uint8Array(bed), bim, fam), w = PlinkCore.writeBfile(ds);
    check(name + ".bed is identical after reading and writing", Buffer.compare(Buffer.from(w.bed), bed) === 0);
    check(name + ".bim is identical after reading and writing", w.bim === bim);
    check(name + ".fam has the same records after reading and writing", JSON.stringify(famKeys(w.fam)) === JSON.stringify(famKeys(fam)) &&
      JSON.stringify(lines(w.fam).map(l => l.trim().split(/\s+/))) === JSON.stringify(lines(fam).map(l => l.trim().split(/\s+/))));
    /* plink --make-bed with no filter keeps the set (A1 is already each file's minor allele) */
    const mem = new MemFS();
    mem.write("/w/x.bed", new Uint8Array(bed)); mem.write("/w/x.bim", bim); mem.write("/w/x.fam", fam);
    const io = mem.io(), r = PlinkCore.run(["--bfile", "/w/x", "--make-bed", "--out", "/w/y"], io);
    check(name + ": plink --make-bed exits 0", r.code === 0, io.lines.join(" | "));
    const yb = bimIds(mem.text("/w/y.bim")), swapped = lines(mem.text("/w/y.bim")).filter((l, j) => l !== lines(bim)[j]).length;
    check(name + ": plink --make-bed writes the same .bim (no allele swapped)", swapped === 0 && yb.length === ds.m, swapped + " lines differ");
    check(name + ": plink --make-bed writes the same .bed", Buffer.compare(bytesOf(mem.read("/w/y.bed")), bed) === 0);
  }
  /* the lab's copy of the files (toy-data.js) is data/ */
  const toyJs = fs.existsSync(path.join(DATA, "toy-data.js")) ? path.join(DATA, "toy-data.js") : path.join(LAB, "toy-data.js");
  if (!fs.existsSync(toyJs)) return note("no toy-data.js: its comparison with data/ skipped");
  const TOY_FILES = require(toyJs), where = {
    "data/inputs/penncath_withPheno/toy.bed": "toy.bed", "data/inputs/penncath_withPheno/toy.bim": "toy.bim", "data/inputs/penncath_withPheno/toy.fam": "toy.fam",
    "data/inputs/ref/toy_1kg.bed": "toy_1kg.bed", "data/inputs/ref/toy_1kg.bim": "toy_1kg.bim", "data/inputs/ref/toy_1kg.fam": "toy_1kg.fam",
    "_panel/integrated_call_samples_v3.20130502.ALL.panel": "integrated_call_samples_v3.20130502.ALL.panel" };
  for (const [rel, file] of Object.entries(where)) {
    const e = TOY_FILES[rel];
    const got = e ? (e.b64 != null ? Buffer.from(e.b64, "base64") : Buffer.from(String(e.text), "utf8")) : null;
    check("toy-data.js " + rel + " equals data/" + file, got && Buffer.compare(got, fs.readFileSync(path.join(DATA, file))) === 0);
  }
  note("toy-data.js (" + path.relative(LECTURE, toyJs) + ") holds the files of " + path.relative(process.cwd(), DATA));
});

/* ============================================================================================
   G. GrafAnc
   ============================================================================================ */
/* glibc printf("%w.df") of a double, from its exact binary value (BigInt), ties to even */
function printfF(x, w, d) {
  let s;
  if (x !== x) s = "nan";
  else if (!isFinite(x)) s = x > 0 ? "inf" : "-inf";
  else {
    const neg = x < 0 || Object.is(x, -0), dv = new DataView(new ArrayBuffer(8));
    dv.setFloat64(0, Math.abs(x));
    const hi = dv.getUint32(0), lo = dv.getUint32(4), ex = (hi >>> 20) & 0x7ff;
    let mant = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo), e2;
    if (ex === 0) e2 = -1074; else { mant |= 1n << 52n; e2 = ex - 1075; }
    let num = mant * 10n ** BigInt(d), den = 1n;              // |x| 10^d = num / den
    if (e2 >= 0) num <<= BigInt(e2); else den <<= BigInt(-e2);
    let q = num / den;
    const rem2 = 2n * (num - q * den);
    if (rem2 > den || (rem2 === den && q % 2n === 1n)) q += 1n;
    let digits = q.toString();
    if (d) { digits = digits.padStart(d + 1, "0"); digits = digits.slice(0, -d) + "." + digits.slice(-d); }
    s = (neg ? "-" : "") + digits;
  }
  return s.padStart(w, " ");
}

await section("G", "GrafAnc emulator", () => {
  const T = GrafAncCore.stats.transform, AFR = GrafAncCore.constants.AFR_POSITION;
  const rnd = mulberry32(17);
  const rd = () => ({ e: 1 + rnd(), f: 1 + rnd(), a: 1 + rnd() });
  const dist3 = (P, Q2) => Math.hypot(P.x - Q2.x, P.y - Q2.y, P.z - Q2.z);
  let geo = 0, bary = 0, aff = 0, proj = 0;
  for (let t = 0; t < 500; t++) {
    const e = rd(), f = rd(), a = rd(), g = T(e, f, a, e);
    const pt = d => ({ x: d.a, y: d.e, z: d.f });
    geo = Math.max(geo, Math.abs(g.F.x - AFR.x), Math.abs(g.F.y - AFR.y), Math.abs(g.F.z), Math.abs(g.A.y - AFR.y), Math.abs(g.A.z), Math.abs(g.E.z),
      Math.abs(dist3(g.E, g.F) - dist3(pt(e), pt(f))), Math.abs(dist3(g.E, g.A) - dist3(pt(e), pt(a))), Math.abs(dist3(g.F, g.A) - dist3(pt(f), pt(a))));
    if (!(g.E.y > AFR.y && g.A.x > AFR.x)) geo = Infinity;
    for (const [s, wv] of [[e, [1, 0, 0]], [f, [0, 1, 0]], [a, [0, 0, 1]]]) { const h = T(e, f, a, s); bary = Math.max(bary, Math.abs(h.eWt - wv[0]), Math.abs(h.fWt - wv[1]), Math.abs(h.aWt - wv[2])); }
    const we = rnd() * 1.4 - 0.2, wf = rnd() * (1 - we), wa = 1 - we - wf;
    const mix = { e: we * e.e + wf * f.e + wa * a.e, f: we * e.f + wf * f.f + wa * a.f, a: we * e.a + wf * f.a + wa * a.a };
    const h = T(e, f, a, mix);
    aff = Math.max(aff, Math.abs(h.eWt - we), Math.abs(h.fWt - wf), Math.abs(h.aWt - wa), Math.abs(h.S.z));
    /* moving the sample off the plane of the three vertices changes GD3 only */
    const u = { x: f.a - e.a, y: f.e - e.e, z: f.f - e.f }, v = { x: a.a - e.a, y: a.e - e.e, z: a.f - e.f };
    const nrm = { x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x }, L = Math.hypot(nrm.x, nrm.y, nrm.z);
    const off = { a: mix.a + 0.05 * nrm.x / L, e: mix.e + 0.05 * nrm.y / L, f: mix.f + 0.05 * nrm.z / L }, h2 = T(e, f, a, off);
    proj = Math.max(proj, Math.abs(h2.eWt - we), Math.abs(h2.fWt - wf), Math.abs(Math.abs(h2.S.z) - 0.05));
  }
  /* GrafAnc's PI is 3.1415926, so its "- 90 degrees" turns 2.7e-8 rad too little: the triangle lies in
     z = 0 only to about 3e-8, in the emulator as in GrafAnc */
  check("rotation: F at (1.08, 1.10, 0), A on y = 1.10, triangle in z = 0 (to 1e-7), distances kept", geo < 1e-7, geo);
  check("barycentric weights are (1,0,0), (0,1,0), (0,0,1) at the vertices", bary < 1e-12, bary);
  check("a mixture of the vertex distances gets its mixing weights back (to 1e-7)", aff < 1e-7, aff);
  check("a step off the plane changes GD3 only (to 1e-7)", proj < 1e-7, proj);

  /* printf %7.6f and %6.2f, including exact ties (odd multiples of 2^-(d+1)) and negative zero */
  const fx = GrafAncCore.format.fixed;
  let fmtBad = [], fmt = 0;
  const tryOne = (x, w, d) => { fmt++; const a = fx(x, w, d), b = printfF(x, w, d); if (a !== b && fmtBad.length < 5) fmtBad.push(x + ": " + a + " vs " + b); };
  for (let t = 0; t < 4000; t++) {
    tryOne((rnd() - 0.3) * 200, 6, 2); tryOne(rnd() * 3, 7, 6);
    tryOne((2 * Math.floor(rnd() * 40000) + 1) / 8 * (rnd() < 0.3 ? -1 : 1), 6, 2);       // ties at 2 decimals
    tryOne((2 * Math.floor(rnd() * 400000) + 1) / 128, 7, 6);                             // ties at 6 decimals
  }
  for (const [x, w, d] of [[0, 6, 2], [-0, 6, 2], [-0.001, 6, 2], [100, 6, 2], [0.0078125, 7, 6], [12.125, 6, 2], [12.375, 6, 2], [1e-7, 7, 6], [99.995, 6, 2]]) tryOne(x, w, d);
  check("%f formatting equals exact glibc rounding", fmtBad.length === 0, fmtBad.join("; "));
  check("known values: 0.0078125 -> 0.007812, 12.125 -> 12.12, -0 -> -0.00", fx(0.0078125, 7, 6) === "0.007812" && fx(12.125, 6, 2) === " 12.12" && fx(-0, 6, 2) === " -0.00");

  /* a synthetic reference: vertex populations EUR, AFR, EAS and a South-Asian-like population */
  const m = 3000, Fd = 0.12, ref = { n: m, pops: ["EUR", "AFR", "EAS", "SAS"], chr: [], pos: [], alleles: "", scale: 10000, af: { EUR: [], AFR: [], EAS: [], SAS: [] } };
  const rs = [], clamp = p => Math.min(0.999, Math.max(0.001, p));
  let chr = 1, bp = 0, prev = 0;
  for (let j = 0; j < m; j++) {
    if (j && j % 600 === 0) { chr++; bp = 0; }
    bp += 3000 + Math.floor(rnd() * 30000);
    if (!ref.chr.length || ref.chr[ref.chr.length - 1][0] !== chr) ref.chr.push([chr, 0]);
    ref.chr[ref.chr.length - 1][1]++;
    ref.pos.push(bp - prev); prev = bp;
    const [rA, aA] = allelePair(rnd, false), p0 = 0.05 + 0.9 * rnd(), fr = {};
    for (const p of ["EUR", "AFR", "EAS"]) fr[p] = clamp(beta(rnd, p0 * (1 - Fd) / Fd, (1 - p0) * (1 - Fd) / Fd));
    fr.SAS = clamp(0.6 * fr.EUR + 0.4 * fr.EAS + 0.03 * normal(rnd));
    for (const p of ref.pops) ref.af[p].push(Math.round(fr[p] * 10000));
    ref.alleles += rA + aA;
    rs.push({ chr, bp, ref: rA, alt: aA });
  }
  const R = GrafAncCore.setReference(ref);
  const vx = GrafAncCore.stats.vertices();
  check("reference: vertex triangle with F at (1.08, 1.10) and E above it", close(vx.F.x, 1.08, 1e-12) && close(vx.F.y, 1.10, 1e-12) && vx.E.y > 1.10 && vx.A.x > 1.08 && close(vx.A.y, 1.10, 1e-12));
  /* people: 20 from each population and 20 half-European, half-African; the PLINK set mixes allele
     orders and strands (A1 = alt, A1 = ref, both alleles complemented) */
  const groups = ["EUR", "AFR", "EAS", "SAS", "MIX"], per = 20, n = groups.length * per, snps = [], geno = new Int8Array(n * m);
  const af = p => ref.af[p].map(v => v / 10000);
  const fq = { EUR: af("EUR"), AFR: af("AFR"), EAS: af("EAS"), SAS: af("SAS") };
  for (let j = 0; j < m; j++) {
    const u = rnd(), s = rs[j];
    const mode = u < 0.45 ? 0 : u < 0.9 ? 1 : 2;          // 0: A1 = alt; 1: A1 = ref; 2: A1 = complement of alt
    snps.push({ chr: s.chr, id: "g" + j, cm: 0, bp: s.bp, a1: mode === 0 ? s.alt : mode === 1 ? s.ref : COMP[s.alt], a2: mode === 0 ? s.ref : mode === 1 ? s.alt : COMP[s.ref], mode });
    for (let i = 0; i < n; i++) {
      const gname = groups[Math.floor(i / per)], p = gname === "MIX" ? 0.5 * fq.EUR[j] + 0.5 * fq.AFR[j] : fq[gname][j];
      const alt = (rnd() < p ? 1 : 0) + (rnd() < p ? 1 : 0);
      geno[j * n + i] = rnd() < 0.01 ? -1 : mode === 1 ? 2 - alt : alt;
    }
  }
  const ds = { samples: plainSamples(Array.from({ length: n }, (_, i) => groups[Math.floor(i / per)] + i)), snps: snps.map(({ mode, ...s }) => s), n, m, geno, phenoType: "cc" };
  ds.samples.forEach(s => { s.iid = s.fid; });
  const sc = GrafAncCore.stats.scores(ds);
  check("every SNP matches the reference (same order, swapped, other strand)", sc.match.numBimAncSnps === m && sc.match.numGoodAncSnps === m, sc.match.numGoodAncSnps);
  check("GRCh37 positions are used", sc.match.mode === 1);
  const want = { EUR: [300, "pe"], AFR: [100, "pf"], EAS: [500, "pa"], SAS: [400, null] };
  for (const gname of groups) {
    const rr = sc.results.filter((x, i) => groups[Math.floor(i / per)] === gname);
    if (gname === "MIX") {
      check("half European, half African: Pe and Pf between 30 and 70, Pa below 15", rr.every(x => x.pe > 30 && x.pe < 70 && x.pf > 30 && x.pf < 70 && x.pa < 15), rr.map(x => x.pe.toFixed(0) + "/" + x.pf.toFixed(0)).join(" "));
      note("GrafAnc, synthetic reference: half-European/half-African people get Pe " + mean(rr.map(x => x.pe)).toFixed(1) + ", Pf " + mean(rr.map(x => x.pf)).toFixed(1));
      continue;
    }
    const [code, comp] = want[gname];
    check(gname + " people get AncGroupID " + code, rr.every(x => x.group === code), rr.map(x => x.group).join(","));
    if (comp) check(gname + " people get " + comp + " above 90", rr.every(x => x[comp] > 90), rr.map(x => x[comp].toFixed(1)).join(","));
  }
  /* the command line on the same set: console messages in order; output file = stats.scores table */
  const mem = new MemFS(), A = ANALYSIS_DIR;
  putSet(mem, A + "/sim", ds);
  mem.write(A + "/grafanc/bin/grafanc", "#!/bin/sh\n");
  mem.write(A + "/grafanc/cpp/data/AncSnpPopAFs.txt", "stub\n");
  const io = mem.io({ argv0: A + "/grafanc/bin/grafanc" }), r = GrafAncCore.run([A + "/sim", A + "/sim_out.txt"], io, { GRAFPATH: A + "/grafanc/cpp" });
  const flow = [/^Checking file .*\/analysis\/sim$/, new RegExp("^Total " + m + " SNPs in .*AncSnpPopAFs\\.txt$"), new RegExp("^Total " + n + " samples in fam file .*sim\\.fam\\.$"),
    new RegExp("^Total " + m + " SNPs in bim file\\. " + m + " SNPs are ancestry SNPs\\.$"), /^\tGRCh 37 chromosome positions are used to find ancestry SNPs\.$/,
    new RegExp("^\\t" + m + " SNPs have expected alleles and will be used for ancestry inference\\.$"), /^Available memory: 17100 MB$/, /^Maximum 8000 MB will be used\.$/,
    new RegExp("^Bim file has " + m + " SNPs\\. " + m + " SNPs are GrafAnc ancestry SNPs\\.$"), new RegExp("^Read genotypes of " + n + " samples from bed file\\.$"),
    /^\tCalculated scores for 100 of total 100 samples$/, new RegExp("^Saved population results of " + n + " samples to .*sim_out\\.txt\\.$"), /^Time used: .*microseconds$/];
  let at = 0;
  for (const l of io.lines) if (at < flow.length && flow[at].test(l)) at++;
  check("grafanc prints GrafAnc 1.0.0's messages in order", at === flow.length, "stopped before " + (flow[at] || "") + " in: " + io.lines.join(" | "));
  check("grafanc exits 0 and writes the output file", r.code === 0 && r.outputs.length === 1);
  check("the output file equals stats.scores (header, %7.6f/%6.2f columns, NA scores)", mem.text(A + "/sim_out.txt") === sc.table);
  check("output header", sc.table.split("\n")[0] === GrafAncCore.format.header && sc.table.split("\n")[0].split("\t").length === 27);
  /* a few error paths */
  const runLines = (argv, env, extra) => { const io2 = mem.io(extra || {}); const r2 = GrafAncCore.run(argv, io2, env); return { r: r2, lines: io2.lines }; };
  const u = runLines([A + "/sim"], {});
  check("fewer than 2 arguments: the usage text, exit 0, no output", /^GrafAnc 1\.0\.0 \(05\/18\/2025\)/.test(u.lines[0]) && u.r.code === 0 && !u.r.outputs.length, u.lines[0]);
  const mis = runLines([A + "/nope", A + "/x.txt"], { GRAFPATH: A + "/grafanc/cpp" });
  check("missing input: GrafAnc's ERROR line, exit 0", mis.lines.some(l => l === "ERROR: Genotype file " + A + "/nope doesn't exist!") && mis.r.code === 0);
  const nog = runLines([A + "/sim", A + "/x.txt"], {});
  check("no GRAFPATH and no program path: reference file not found", nog.lines.some(l => /^ERROR: didn't find file AncSnpPopAFs\.txt/.test(l)) && !nog.r.outputs.length);
  const opt2 = runLines([A + "/sim", A + "/x.txt", "--threads", "4", "--bogus"], { GRAFPATH: A + "/grafanc/cpp" });
  check("options: unknown option to stderr, --threads 4 launches 4 threads", opt2.lines.includes("[stderr] grafanc: unrecognized option '--bogus'") && opt2.lines.includes("Launching 4 threads to calculate ancestry scores."), opt2.lines.join(" | "));
  /* the toy reference, when data/ is there */
  const res = getDataRun();
  if (res) {
    const G = res.GrafAncCore, v = G.stats.vertices(), info = G.reference();
    check("toy reference: vertex triangle with F at (1.08, 1.10) and E above it", close(v.F.x, 1.08, 1e-12) && close(v.F.y, 1.10, 1e-12) && v.E.y > 1.10 && v.A.x > 1.08);
    const uds = getSet(res.run.mem, Q + ".uniqueIDs");
    check("toy data: the GrafAnc output file equals stats.scores on the uniqueIDs set", res.run.mem.text(ANALYSIS_DIR + "/toy_grafanc_out.txt") === G.stats.scores(uds).table);
    note("toy reference: " + info.snps + " SNPs, " + info.populations.length + " populations; triangle E (" + v.E.x.toFixed(3) + ", " + v.E.y.toFixed(3) +
      "), F (" + v.F.x.toFixed(2) + ", " + v.F.y.toFixed(2) + "), A (" + v.A.x.toFixed(3) + ", " + v.A.y.toFixed(3) + ")");
  }
  note(fmt.toLocaleString("en-US") + " %f conversions equal exact glibc rounding; 500 random triangles; " + n + " simulated people");
});

/* ============================================================================================
   H. Run time of the practical's commands
   ============================================================================================ */
await section("H", "run time of the practical's commands (Node)", () => {
  const res = getDataRun();
  if (!res) return skip(HAVE_DATA ? "the data run failed" : "no data in " + DATA);
  const st = res.run.steps, timed = Object.keys(st).filter(k => st[k].ms !== undefined && (st[k].outputs || []).length);
  for (const k of timed) check(k + " under 1 s", st[k].ms < 1000, st[k].ms.toFixed(0) + " ms");
  const total = timed.reduce((s, k) => s + st[k].ms, 0);
  note(timed.map(k => k + " " + st[k].ms.toFixed(0)).join(", ") + " ms; total " + (total / 1000).toFixed(1) + " s");
});

/* ============================================================================================
   I. The practical in the lab's shell
   ============================================================================================ */
await section("I", "the practical typed into the lab shell (lab.js)", async () => {
  const res = getDataRun();
  if (!res) return skip(HAVE_DATA ? "the data run failed" : "no data in " + DATA);
  const toyJs = fs.existsSync(path.join(DATA, "toy-data.js")) ? path.join(DATA, "toy-data.js") : path.join(LAB, "toy-data.js");
  const labJs = path.join(LAB, "lab.js");
  if (!fs.existsSync(toyJs) || !fs.existsSync(labJs)) return skip("no toy-data.js or lab.js");
  const LabCore = require(labJs), TOY_FILES = require(toyJs);
  const vfs = new LabCore.VFS();
  LabCore.seedFS(vfs, TOY_FILES);
  const sh = new LabCore.Shell({ fs: vfs, files: TOY_FILES, plink: () => res.PlinkCore, grafanc: () => res.GrafAncCore });
  const P = "${analysis_dir}/toy.geno0.01.mind0.01", REF = "${reference_dir}/toy_1kg";
  /* the bash chunks of 01_qc.Rmd, with penncath -> toy and all_pops_1kgenomes_markersForPCA -> toy_1kg */
  const chunks = [
    ["list-input-directory", "ls ${input_dir}"],
    ["check-plink", "which plink\nplink --version"],
    ["view-fam", "head ${input_dir}/toy.fam"],
    ["run-missing", "plink --bfile ${input_dir}/toy --missing --out ${analysis_dir}/toy"],
    ["filter-geno", "plink --bfile ${input_dir}/toy --geno 0.01 --make-bed --out ${analysis_dir}/toy.geno0.01"],
    ["sample-missing", "plink --bfile ${analysis_dir}/toy.geno0.01 --missing --out ${analysis_dir}/toy.geno0.01"],
    ["filter-mind", "plink --bfile ${analysis_dir}/toy.geno0.01 --mind 0.01 --make-bed --out " + P],
    ["run-hwe", "plink --bfile " + P + " --hardy --out " + P],
    ["ld-pruning", "plink --bfile " + P + " --indep-pairwise 50 5 0.3 --out " + P],
    ["ibd-check", "plink --bfile " + P + " \\\n      --extract " + P + ".prune.in \\\n      --genome --out " + P + ".LD0.3"],
    ["het-check", "plink --bfile " + P + " --het \\\n      --extract " + P + ".prune.in \\\n      --out " + P + ".LD0.3"],
    ["simple-pca", "plink --bfile " + P + " \\\n      --extract " + P + ".prune.in \\\n      --maf 0.05 --pca --out " + P + ".LD0.3"],
    ["merge-1kg", "plink --bfile " + P + " \\\n      --bmerge " + REF + ".bed \\\n      " + REF + ".bim \\\n      " + REF + ".fam \\\n      --make-bed --out " + P + ".merge1kgenomes || true"],
    ["flip-snps", "plink --bfile " + P + " \\\n      --flip " + P + ".merge1kgenomes-merge.missnp \\\n      --make-bed \\\n      --out " + P + "_flipSNPs"],
    ["remerge-1kg", "plink --bfile " + P + "_flipSNPs \\\n      --bmerge " + REF + ".bed \\\n      " + REF + ".bim \\\n      " + REF + ".fam \\\n      --make-bed --out " + P + ".merge1kgenomes"],
    ["merged-pca", "plink --bfile " + P + ".merge1kgenomes \\\n      --geno 0.1 --maf 0.05 --pca \\\n      --out " + P + ".merge1kgenomes"],
    ["clone-akt", "cd ${analysis_dir}\ngit clone https://github.com/Illumina/akt.git"],
    ["grafanc-uniqueids", "awk '{\n    gsub(\"\\\"\", \"\", $1);\n    print \"\\\"\" $1 \"\\\"\", $2, \"\\\"\" $1 \"\\\"\", \"\\\"\" $1 \"_\" $2 \"\\\"\"\n}' " + P + ".fam > ${analysis_dir}/toy.updateIDs.txt\n\n" +
      "plink --bfile " + P + " --update-ids \\\n     ${analysis_dir}/toy.updateIDs.txt --make-bed \\\n     --out " + P + ".uniqueIDs"],
    ["grafanc-install", "# Clone GrafAnc (skip if already present)\nif [ ! -d \"${analysis_dir}/grafanc\" ]; then\n    cd ${analysis_dir}\n    git clone https://github.com/jimmy-penn/grafanc.git\nfi\n\n" +
      "# GrafAnc's reference SNP panel ships gzipped and must be decompressed once\nif [ -f \"${analysis_dir}/grafanc/cpp/data/AncSnpPopAFs.txt.gz\" ]; then\n    gunzip ${analysis_dir}/grafanc/cpp/data/AncSnpPopAFs.txt.gz\nfi\n\nls ${analysis_dir}/grafanc/bin/"],
    ["run-grafanc", "module load bcftools/1.23\nexport GRAFPATH=${analysis_dir}/grafanc/cpp\n\n${analysis_dir}/grafanc/bin/grafanc \\\n    " + P + ".uniqueIDs \\\n    ${analysis_dir}/toy_grafanc_out.txt\n\nhead ${analysis_dir}/toy_grafanc_out.txt"]
  ];
  const times = [];
  for (const [name, src] of chunks) {
    let out = "", err = "";
    const t0 = performance.now();
    const r = await sh.run(src, { out: (s, kind) => { if (kind === "out") out += s; else if (kind === "err") err += s; } });
    times.push(name + " " + (performance.now() - t0).toFixed(0));
    check("chunk " + name + " exits 0", r.code === 0, r.code + ": " + err.slice(0, 300));
    check("chunk " + name + " has no internal error", !/internal error/.test(err + out), err.slice(0, 300));
    if (name === "run-grafanc") check("head shows GrafAnc's header", out.split("\n").some(l => l.startsWith("Sample\tSNPs\tGD1\tGD2\tGD3\tEA1")), out.slice(0, 200));
    if (name === "merge-1kg") check("the first merge reports the 3+ allele error on stderr", /variants? with 3\+ alleles present/.test(err), err.slice(0, 200));
  }
  /* the files: every output of the practical (section D's run) is in the shell's file system, byte for byte */
  let same = 0, compared = 0;
  const differ = [];
  for (const [p, data] of res.run.mem.files) {
    if (!p.startsWith(ANALYSIS_DIR + "/") || /\.log$|\/\.keep$|\.extra\.|\/akt\/|\/grafanc\//.test(p)) continue;
    compared++;
    const a = bytesOf(data), b = bytesOf(vfs.read(p));
    if (b && Buffer.compare(a, b) === 0) same++; else differ.push(path.basename(p));
  }
  check("every output file equals the in-memory run's (logs excepted)", same === compared && compared > 30, differ.slice(0, 10).join(", ") + " (" + same + " of " + compared + ")");
  note(compared + " output files identical to section D's run; chunk times (ms): " + times.join(", "));
});

/* ============================================================================================
   J. The practical's results equal real PLINK 1.9.0's (recorded by tools/real_plink_check.mjs --write)
   ============================================================================================ */
await section("J", "the practical against real PLINK 1.9.0 (recorded)", () => {
  if (!fs.existsSync(FIXTURE)) return skip("no " + path.relative(process.cwd(), FIXTURE));
  const real = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
  const sameData = Object.entries(real.data).every(([f, h]) => fs.existsSync(path.join(DATA, f)) && sha256(fs.readFileSync(path.join(DATA, f))) === h);
  if (!sameData) return skip("the recorded run used other data files than " + path.relative(process.cwd(), DATA));
  const emu = emulatorRecord(DATA, PlinkCore), diffs = compareRecords(emu, real.steps);
  let files = 0, logs = 0;
  for (const k of Object.keys(real.steps)) { files += Object.keys(real.steps[k].files).length; if (real.steps[k].log) logs++; }
  check("every step's exit code, output files (SHA-256) and normalized .log equal real PLINK's", diffs.length === 0, diffs.slice(0, 8).join("; "));
  /* the comparison notices a planted difference */
  const planted = JSON.parse(JSON.stringify(emu));
  planted.pca.files["toy.geno0.01.mind0.01.LD0.3.eigenvec"] = "0".repeat(64);
  planted.merge1.exit = 0;
  check("a planted difference is reported", compareRecords(planted, real.steps).length === 2);
  note(Object.keys(real.steps).length + " steps, " + files + " files and " + logs + " logs equal " + real.program + " (" + real.platform + ", recorded " + real.recorded + ")");
});

/* ============================================================================================
   Summary
   ============================================================================================ */
const total = report.reduce((s, r) => s + r.n, 0), failed = report.reduce((s, r) => s + r.fail.length, 0);
const skipped = report.filter(r => r.skipped && !r.n).map(r => r.id);
console.log("\n" + (failed ? "FAILED: " + failed + " of " + total.toLocaleString("en-US") + " checks" : "All " + total.toLocaleString("en-US") + " checks passed") +
  (skipped.length ? "; skipped sections " + skipped.join(", ") : "") + ".");
process.exit(failed ? 1 : 0);
