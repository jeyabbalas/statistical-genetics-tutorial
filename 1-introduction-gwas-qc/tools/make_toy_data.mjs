#!/usr/bin/env node
/* make_toy_data.mjs: generate the Lecture 1 toy study, its 1000-Genomes-like reference panel and
   their ground truth.

   The toy study is a simulated case-control study of coronary artery disease shaped like the PennCATH
   data of the practical (01_qc.Rmd of the DCEG Statistical Genetics Workshop), small enough to ship
   inside a web page. Every planted quality-control problem is recorded in data/truth.json, and
   data/README.md (the data card) explains the simulation.

   Usage, from the repository root:
     node 1-introduction-gwas-qc/tools/make_toy_data.mjs
         writes 1-introduction-gwas-qc/data/{toy,toy_1kg}.{bed,bim,fam}, the panel file,
         truth.json, grafanc_ref.json and 1-introduction-gwas-qc/assets/js/lab/toy-data.js
     node 1-introduction-gwas-qc/tools/make_toy_data.mjs --seed 7 --out DIR --no-js
         another random draw into DIR (used to check that the planted features do not depend on
         the luck of one seed)

   Deterministic: the same seed gives byte-identical files (seeded xoshiro128** streams; no clock,
   no Math.random). Needs Node 18 or later and assets/js/lab/plink-core.js: its writeBfile is the
   only .bed encoder of the lab, and its run() executes steps 1-5 of the practical on the new files
   so that truth.json can record what the lab will show (lab_view). Regenerate after changing
   plink-core.js. Check the result with tools/test_lab.mjs (sections D, F and I). The generated data
   are released under CC0 1.0. */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LECTURE = path.resolve(HERE, "..");
const require = createRequire(import.meta.url);
const PlinkCore = require(path.join(LECTURE, "assets", "js", "lab", "plink-core.js"));

/* ============================================================================================
   0. Command line
   ============================================================================================ */
const ARGS = process.argv.slice(2);
function option(name, dflt) { const i = ARGS.indexOf(name); return i >= 0 && i + 1 < ARGS.length ? ARGS[i + 1] : dflt; }
const DEFAULT_SEED = 20260909;
const SEED = Number(option("--seed", DEFAULT_SEED));
if (!Number.isInteger(SEED) || SEED < 0) throw new Error("--seed needs a non-negative integer");
const OUT_DIR = path.resolve(option("--out", path.join(LECTURE, "data")));
const JS_OUT = ARGS.includes("--no-js") ? null : path.resolve(option("--js", path.join(LECTURE, "assets", "js", "lab", "toy-data.js")));
const QUIET = ARGS.includes("--quiet");
function say(s) { if (!QUIET) process.stdout.write(s + "\n"); }

/* ============================================================================================
   1. Random numbers: xoshiro128** streams seeded from a string hash, and the distributions used
   ============================================================================================ */
function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}
function rotl(x, k) { return (x << k) | (x >>> (32 - k)); }
class Rng {
  constructor(label) {
    this.label = String(label);
    let x = hash32(this.label);
    const next = () => {
      x = (x + 0x9e3779b9) >>> 0;
      let z = x;
      z = Math.imul(z ^ (z >>> 16), 0x85ebca6b); z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
      return (z ^ (z >>> 16)) >>> 0;
    };
    this.s0 = next(); this.s1 = next(); this.s2 = next(); this.s3 = next();
    if ((this.s0 | this.s1 | this.s2 | this.s3) === 0) this.s0 = 1;
  }
  fork(name) { return new Rng(this.label + "/" + name); }
  next32() {
    const r = Math.imul(rotl(Math.imul(this.s1, 5), 7), 9) >>> 0;
    const t = this.s1 << 9;
    this.s2 ^= this.s0; this.s3 ^= this.s1; this.s1 ^= this.s2; this.s0 ^= this.s3;
    this.s2 ^= t; this.s3 = rotl(this.s3, 11);
    return r;
  }
  u() { return (this.next32() * 2097152 + (this.next32() >>> 11)) / 9007199254740992; }   // [0, 1), 53 bits
  int(n) { return Math.floor(this.u() * n); }
  uniform(a, b) { return a + (b - a) * this.u(); }
  normal() { let a = this.u(); while (a <= 0) a = this.u(); return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * this.u()); }
  exp(mean) { let a = this.u(); while (a <= 0) a = this.u(); return -Math.log(a) * mean; }
  gamma(shape) {                          // Marsaglia & Tsang (2000), with the shape < 1 boost
    if (shape < 1) { const g = this.gamma(shape + 1); return g * Math.pow(this.u(), 1 / shape); }
    const d = shape - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x, v;
      do { x = this.normal(); v = 1 + c * x; } while (v <= 0);
      v = v * v * v;
      const a = this.u();
      if (a < 1 - 0.0331 * x * x * x * x) return d * v;
      if (Math.log(a) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }
  beta(a, b) { const x = this.gamma(a), y = this.gamma(b); return x + y > 0 ? x / (x + y) : (this.u() < a / (a + b) ? 1 : 0); }
  dirichlet(alpha) {
    const g = new Float64Array(alpha.length); let s = 0;
    for (let i = 0; i < alpha.length; i++) { g[i] = alpha[i] > 0 ? this.gamma(alpha[i]) : 0; s += g[i]; }
    if (!(s > 0)) {                       // every component underflowed: keep the largest parameter
      let best = 0; for (let i = 1; i < alpha.length; i++) if (alpha[i] > alpha[best]) best = i;
      g.fill(0); g[best] = 1; return g;
    }
    for (let i = 0; i < g.length; i++) g[i] /= s;
    return g;
  }
  poisson(lambda) { const L = Math.exp(-lambda); let k = 0, p = 1; do { k++; p *= this.u(); } while (p > L); return k - 1; }
  pick(w) {                               // index drawn with probability proportional to w
    let tot = 0; for (let i = 0; i < w.length; i++) tot += w[i];
    let r = this.u() * tot, last = -1;
    for (let i = 0; i < w.length; i++) { if (w[i] > 0) { last = i; r -= w[i]; if (r < 0) return i; } }
    return last;
  }
  shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = this.int(i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
}

/* ============================================================================================
   2. Parameters (all in one place; copied into truth.json)
   ============================================================================================ */
const CONFIG = {
  seed: SEED,
  study: {
    n: 250, males: 167, cases: 83, controls: 84, missingPhenotype: 83, firstFid: 80001,
    europeanSubpopulations: { CEU: 0.5, GBR: 0.3, TSI: 0.2 },
    nonEuropean: [["YRI", 3], ["LWK", 1], ["CHB", 2], ["JPT", 1], ["CHS", 1], ["GIH", 1], ["PJL", 1], ["BEB", 1]],
    admixedAfricanFraction: [0.25, 0.45, 0.65, 0.85],
    admixedFirstGeneration: 1,            // one person with an African-like and a European-like parent
    admixedGenerations: 6,                // generations since admixture (ancestry tracts)
    firstCousins: false                   // optional third-degree pair; off because ~2,500 pruned SNPs cannot separate PI_HAT 0.125 from unrelated pairs
  },
  /* Planted relatives are redrawn (new meioses) until their realized IBD sharing is within these
     distances of its expectation, so that each pair is a typical member of its relationship class. */
  relatives: { fullSibTolerance: 0.03, halfSibTolerance: 0.01, inbredTolerance: 0.03, maxTries: 5000 },
  layout: {
    blocks: 80, blockLengthKb: [100, 420], snpSpacingMinBp: 1500, snpSpacingMeanExtraBp: 8500,
    blockMinDistanceKb: 1500, isolatedSnps: 1650, isolatedMinDistanceKb: 150, referenceOnlySnps: 30,
    longRangeRegion: { chr: 8, start: 8100000, end: 11900000, snps: 90, cladeTagSnps: 72 },
    causalBlock: { chr: 9, start: 21985000, lengthKb: 230 },
    snpTypes: { transition: 0.67, palindromic: 0.15, otherTransversion: 0.18 }
  },
  /* Ascertainment of array SNPs: the mean minor-allele frequency over the African, European and
     East Asian nodes must reach ascertainMinMaf and the European one ascertainMinEurMaf; SNPs with a
     European minor-allele frequency below ascertainFullEurMaf are kept with probability
     MAF / ascertainFullEurMaf (arrays favour SNPs that are common in the populations they were
     designed from). */
  founders: { perBlock: 10, rootDirichlet: 1.0, localTreeMeanKb: 35, ascertainMinMaf: 0.12, ascertainMinEurMaf: 0.03, ascertainFullEurMaf: 0.08, derivedIsAltProb: 0.9 },
  missingness: {
    baseRate: 0.0004, personLogitSd: 0.5, snpLogitSd: 0.6,
    degradedLogitOffsets: [4.0, 4.4, 4.8, 5.4], lowQualityLogitOffsets: [2.4, 2.45, 2.5],
    highMissingSnps: 90, highMissingRateRange: [0.04, 0.40], protectedSnpLogitOffset: -1.5
  },
  errors: { rate: 0.0008, degradedRate: 0.004 },
  hwe: { deficitHetMiscall: [0.97, 0.96, 0.95, 0.94], excessHomToHet: [0.97, 0.95], deficitMafRange: [0.45, 0.5], excessMafRange: [0.06, 0.14] },   // MAF of the controls' true genotypes
  contamination: { alpha: 0.29, intensityNoiseSd: 0.04, hetCallRange: [0.2, 0.8], noCallAtMixedSites: 0.006 },
  /* the causal SNP: the causal-block SNP whose European risk-allele frequency is closest to the target,
     among those within riskFrequencyRange (outside it the cases' heterozygote deficit is weak); if no
     SNP qualifies, the block's founder model is redrawn from a separate random stream */
  causal: { targetRiskFrequency: 0.22, riskFrequencyRange: [0.08, 0.32], penetrance: [0.01, 0.01, 0.20] },
  strand: { reverseFraction: 0.5, sharedPalindromic: 12, swappedPalindromic: 5, palindromicEurMafRange: [0.08, 0.30] },
  reference: { targetSharedSnps: 1150, ldR2Max: 0.2, ldWindowKb: 250, minPanelMaf: 0.05, longRangeSnps: 3 }
};

/* Population tree. Each branch applies Balding-Nichols drift with the given F to the frequencies of
   the founder haplotypes of every block (a Dirichlet draw; for any one SNP this is exactly the
   Balding-Nichols beta distribution). Leaves use 1000 Genomes population codes. An optional fourth
   element mixes other nodes into a node after its drift: the South Asian node is a West Eurasian
   branch with a share of ancestry from ASI, an East-Asian-related branch (the ANI-ASI model of
   South Asian history), so South-Asian-like people lie between European- and East-Asian-like
   people, as in 1000 Genomes. */
const TREE = [
  ["ROOT", null, 0],
  ["AFR", "ROOT", 0.012], ["OOA", "ROOT", 0.185],
  ["WEA", "OOA", 0.035], ["EAS", "OOA", 0.135], ["ASI", "EAS", 0.060],
  ["EUR", "WEA", 0.040], ["SAS", "WEA", 0.020, { ASI: 0.4 }], ["NAT", "EAS", 0.090],
  ["YRI", "AFR", 0.006], ["LWK", "AFR", 0.010],
  ["CEU", "EUR", 0.004], ["GBR", "EUR", 0.004], ["TSI", "EUR", 0.007],
  ["GIH", "SAS", 0.006], ["PJL", "SAS", 0.006], ["BEB", "SAS", 0.008],
  ["CHB", "EAS", 0.004], ["JPT", "EAS", 0.008], ["CHS", "EAS", 0.004]
];
const TREE_NAMES = {
  ROOT: "ancestral population", AFR: "African node", OOA: "out-of-Africa node", WEA: "West Eurasian node",
  EUR: "European node", SAS: "South Asian node (West Eurasian branch mixed with ASI)", EAS: "East Asian node",
  ASI: "ancestral-South-Indian-like node (East-Asian-related source of South Asian ancestry; not sampled)",
  NAT: "Native American node (source of AMR ancestry; not sampled)"
};
const ADMIXED_POPS = {                    // reference populations made as mixtures of tree populations
  ASW: { superPop: "AFR", sources: { YRI: 0.76, CEU: 0.24 }, generations: 7, concentration: 15 },
  MXL: { superPop: "AMR", sources: { TSI: 0.47, NAT: 0.48, YRI: 0.05 }, generations: 12, concentration: 15 },
  PUR: { superPop: "AMR", sources: { TSI: 0.68, NAT: 0.14, YRI: 0.18 }, generations: 12, concentration: 15 },
  CLM: { superPop: "AMR", sources: { TSI: 0.63, NAT: 0.27, YRI: 0.10 }, generations: 12, concentration: 15 }
};
const SUPER_OF = { YRI: "AFR", LWK: "AFR", ASW: "AFR", CEU: "EUR", GBR: "EUR", TSI: "EUR", GIH: "SAS", PJL: "SAS", BEB: "SAS",
  CHB: "EAS", JPT: "EAS", CHS: "EAS", MXL: "AMR", PUR: "AMR", CLM: "AMR" };
const ANCESTRY_OF = { ROOT: "AFR", AFR: "AFR", YRI: "AFR", LWK: "AFR", OOA: "EAS", WEA: "EUR", EUR: "EUR", CEU: "EUR", GBR: "EUR", TSI: "EUR",
  SAS: "SAS", ASI: "SAS", GIH: "SAS", PJL: "SAS", BEB: "SAS", EAS: "EAS", CHB: "EAS", JPT: "EAS", CHS: "EAS", NAT: "NAT" };
/* Li-Stephens copying: mean distance between switches of founder haplotype (population-scaled
   recombination). Shorter in African-like populations, so LD decays faster there. */
const SWITCH_MEAN_KB = { AFR: 18, EUR: 50, SAS: 47, EAS: 55, NAT: 60 };
/* Frequency of the inverted clade of the long-range LD region at the tree's nodes (leaves drift). */
const INVERSION_FREQ = { ROOT: 0.5, AFR: 0.58, OOA: 0.5, WEA: 0.47, EUR: 0.45, SAS: 0.42, EAS: 0.30, NAT: 0.25 };
const PANEL = [                           // the toy reference panel: [population, number of people]
  ["YRI", 12], ["LWK", 10], ["ASW", 8], ["MXL", 10], ["PUR", 10], ["CLM", 10], ["CHB", 10], ["JPT", 10], ["CHS", 10],
  ["CEU", 10], ["GBR", 10], ["TSI", 10], ["GIH", 10], ["PJL", 10], ["BEB", 10]
];

/* Chromosomes: [chr, GRCh37 length (bp), first and last SNP position (bp), SNP-free gap around the
   centromere or null, approximate sex-averaged genetic length (cM)]. First, last and gaps follow the
   extent of the real PennCATH .bim file. */
const CHROMS = [
  [1, 249250621, 600000, 249150000, [121300000, 144100000], 278], [2, 243199373, 50000, 243000000, [92300000, 95400000], 264],
  [3, 198022430, 100000, 197800000, [90300000, 93600000], 224], [4, 191154276, 60000, 190900000, [49600000, 52700000], 214],
  [5, 180915260, 50000, 180650000, [46400000, 49600000], 204], [6, 171115067, 220000, 170900000, [58800000, 62000000], 192],
  [7, 159138663, 50000, 159100000, [58000000, 61100000], 187], [8, 146364022, 170000, 146250000, [43800000, 46900000], 168],
  [9, 141213431, 60000, 141050000, [45400000, 66400000], 166], [10, 135534747, 150000, 135400000, [39100000, 42500000], 181],
  [11, 135006516, 200000, 134900000, [51600000, 54900000], 158], [12, 133851895, 170000, 133750000, [34800000, 37800000], 175],
  [13, 115169878, 19050000, 115050000, null, 126], [14, 107349540, 20220000, 107250000, null, 120],
  [15, 102531392, 20080000, 102380000, null, 141], [16, 90354753, 90000, 90150000, [35200000, 46500000], 134],
  [17, 81195210, 40000, 81030000, [22200000, 25300000], 129], [18, 78077248, 20000, 77990000, [15200000, 18500000], 118],
  [19, 59128983, 270000, 59080000, [24500000, 27800000], 108], [20, 63025520, 70000, 62900000, [26300000, 29400000], 108],
  [21, 48129895, 10920000, 48070000, [11200000, 14400000], 63], [22, 51304566, 16060000, 51200000, null, 74]
];
const COMP = { A: "T", T: "A", C: "G", G: "C" };

const rootRng = new Rng("lecture1-toy/" + SEED);
const RNG = {
  layout: rootRng.fork("layout"), model: rootRng.fork("model"), roles: rootRng.fork("roles"), people: rootRng.fork("people"),
  reference: rootRng.fork("reference"), snpRoles: rootRng.fork("snp-roles"), strand: rootRng.fork("strand"), calls: rootRng.fork("calls")
};

/* ============================================================================================
   3. Genome layout: dense blocks of SNPs (local LD), isolated SNPs, the long-range LD region and
   the block holding the causal SNP
   ============================================================================================ */
const reservedSpans = [
  { chr: CONFIG.layout.longRangeRegion.chr, start: CONFIG.layout.longRangeRegion.start - 300000, end: CONFIG.layout.longRangeRegion.end + 300000 },
  { chr: CONFIG.layout.causalBlock.chr, start: CONFIG.layout.causalBlock.start - 300000, end: CONFIG.layout.causalBlock.start + CONFIG.layout.causalBlock.lengthKb * 1000 + 300000 }
];
function intervalsOf(c) { return c[4] ? [[c[2], c[4][0]], [c[4][1], c[3]]] : [[c[2], c[3]]]; }
function accessibleLength(c) { return intervalsOf(c).reduce((s, iv) => s + iv[1] - iv[0], 0); }
function allocate(total, weights) {        // largest-remainder apportionment
  const W = weights.reduce((a, b) => a + b, 0), raw = weights.map(w => total * w / W), out = raw.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; k < left; k++) out[order[k][1]]++;
  return out;
}
function farFrom(spans, chr, s, e, gap) {
  for (const sp of spans) if (sp.chr === chr && s < sp.end + gap && e > sp.start - gap) return false;
  return true;
}
function blockPositions(start, end, rng) {
  const L = CONFIG.layout, pos = [];
  let p = start + Math.round(rng.uniform(0, 4000));
  while (p <= end) { pos.push(p); p += L.snpSpacingMinBp + Math.round(rng.exp(L.snpSpacingMeanExtraBp)); }
  return pos;
}

const segments = [];                      // {kind, chr, start, end, positions}
(function layout() {
  const rng = RNG.layout, L = CONFIG.layout, spans = reservedSpans.slice();
  const lens = CHROMS.map(accessibleLength);
  const nBlocks = allocate(L.blocks - 1, lens);         // the causal block is the extra one
  CHROMS.forEach((c, ci) => {
    for (let b = 0; b < nBlocks[ci]; b++) {
      for (let tries = 0; ; tries++) {
        if (tries > 5000) throw new Error("could not place a block on chromosome " + c[0]);
        const len = Math.round(rng.uniform(L.blockLengthKb[0], L.blockLengthKb[1]) * 1000);
        const ivs = intervalsOf(c), iv = ivs[rng.pick(ivs.map(v => Math.max(0, v[1] - v[0] - len)))];
        const s = Math.round(rng.uniform(iv[0], iv[1] - len)), e = s + len;
        if (!farFrom(spans, c[0], s, e, L.blockMinDistanceKb * 1000)) continue;
        spans.push({ chr: c[0], start: s, end: e });
        segments.push({ kind: "block", chr: c[0], start: s, end: e, positions: blockPositions(s, e, rng) });
        break;
      }
    }
  });
  const cb = L.causalBlock;
  segments.push({ kind: "causal-block", chr: cb.chr, start: cb.start, end: cb.start + cb.lengthKb * 1000, positions: blockPositions(cb.start, cb.start + cb.lengthKb * 1000, rng) });
  const lr = L.longRangeRegion, gaps = [];
  for (let k = 0; k < lr.snps; k++) gaps.push(8000 + rng.exp(34000));
  const tot = gaps.reduce((a, b) => a + b, 0), lrPos = [];
  let acc = 0;
  for (let k = 0; k < lr.snps; k++) { lrPos.push(Math.round(lr.start + (lr.end - lr.start) * acc / tot)); acc += gaps[k]; }
  segments.push({ kind: "long-range", chr: lr.chr, start: lr.start, end: lr.end, positions: lrPos });
  const blockSpans = spans.slice(), isoSpans = [];
  const nIso = allocate(L.isolatedSnps + L.referenceOnlySnps, lens);
  CHROMS.forEach((c, ci) => {
    for (let k = 0; k < nIso[ci]; k++) {
      for (let tries = 0; ; tries++) {
        if (tries > 5000) throw new Error("could not place an isolated SNP on chromosome " + c[0]);
        const ivs = intervalsOf(c), iv = ivs[rng.pick(ivs.map(v => v[1] - v[0]))];
        const p = Math.round(rng.uniform(iv[0], iv[1]));
        const g = L.isolatedMinDistanceKb * 1000;
        if (!farFrom(blockSpans, c[0], p, p, g) || !farFrom(isoSpans, c[0], p, p, g)) continue;
        isoSpans.push({ chr: c[0], start: p, end: p });
        segments.push({ kind: "isolated", chr: c[0], start: p, end: p, positions: [p] });
        break;
      }
    }
  });
  segments.sort((a, b) => a.chr - b.chr || a.start - b.start);
})();

/* SNP table (study and reference-only SNPs together, genome order) */
const CHR = [], BP = [], SEG = [];
segments.forEach((sg, si) => { sg.snps = []; sg.positions.forEach(p => { sg.snps.push(CHR.length); CHR.push(sg.chr); BP.push(p); SEG.push(si); }); });
const M = CHR.length;
const CHR_RANGE = {};
for (let j = 0; j < M; j++) { const r = CHR_RANGE[CHR[j]] || (CHR_RANGE[CHR[j]] = [j, j + 1]); r[1] = j + 1; }
for (let j = 1; j < M; j++) if (CHR[j] === CHR[j - 1] && BP[j] <= BP[j - 1]) throw new Error("positions not strictly increasing at SNP " + j);
const ID = []; for (let j = 0; j < M; j++) ID.push("tsnp" + String(j + 1).padStart(5, "0"));

/* ============================================================================================
   4. Founder-haplotype model: per block, K founder haplotypes; SNP alleles come from mutations on
   local genealogies of the founders; populations differ in how common each founder haplotype is
   ============================================================================================ */
const CARRIERS = new Int32Array(M);       // bit h set: founder haplotype h carries the derived allele
function freqOfMask(w, mask) { let f = 0; for (let h = 0; h < w.length; h++) if ((mask >>> h) & 1) f += w[h]; return f; }
function maf(f) { return f < 0.5 ? f : 1 - f; }
function randomTree(leaves, rng) {        // Kingman coalescent over the given founder indices
  let lin = leaves.map(h => ({ mask: 1 << h, t: 0 }));
  const branches = []; let t = 0;
  while (lin.length > 1) {
    const k = lin.length; t += rng.exp(2 / (k * (k - 1)));
    const a = rng.int(k); let b = rng.int(k - 1); if (b >= a) b++;
    const A = lin[a], B = lin[b];
    branches.push({ mask: A.mask, len: t - A.t }, { mask: B.mask, len: t - B.t });
    lin = lin.filter((_, i) => i !== a && i !== b); lin.push({ mask: A.mask | B.mask, t: t });
  }
  return branches;
}
function driftWeights(parent, F, rng) {
  const c = (1 - F) / F, alpha = new Float64Array(parent.length);
  for (let i = 0; i < parent.length; i++) alpha[i] = parent[i] * c;
  return rng.dirichlet(alpha);
}
function mixWeights(w, mix, all) {      // (1 - total share) * w + share * weights of each mixed-in node
  if (!mix) return w;
  let keep = 1; for (const s in mix) keep -= mix[s];
  const out = new Float64Array(w.length);
  for (let h = 0; h < w.length; h++) { out[h] = keep * w[h]; for (const s in mix) out[h] += mix[s] * all[s][h]; }
  return out;
}
function bnDraw(p, F, rng) { if (p <= 0 || p >= 1) return p; const c = (1 - F) / F; return rng.beta(p * c, (1 - p) * c); }
function isAscertained(seg, mask, rng) {
  const F = CONFIG.founders;
  const fA = freqOfMask(seg.weights.AFR, mask), fE = freqOfMask(seg.weights.EUR, mask), fS = freqOfMask(seg.weights.EAS, mask);
  const mE = maf(fE);
  if (maf((fA + fE + fS) / 3) < F.ascertainMinMaf || mE < F.ascertainMinEurMaf) return false;
  return mE >= F.ascertainFullEurMaf || rng.u() < mE / F.ascertainFullEurMaf;
}
function pickMutation(seg, branches, rng, test) {
  const lens = branches.map(b => b.len); let best = null, bestScore = -1;
  for (let tries = 0; tries < 400; tries++) {
    const mask = branches[rng.pick(lens)].mask;
    if (test(mask)) return mask;
    const s = maf(freqOfMask(seg.weights.EUR, mask)); if (s > bestScore) { bestScore = s; best = mask; }
  }
  return best;
}
(function founderModel() {
  const rng = RNG.model, F = CONFIG.founders;
  segments.forEach(seg => {
    seg.weights = {};
    if (seg.kind === "long-range") {
      // two clades of 6 founders each: 0-5 standard orientation, 6-11 inverted (no exchange between clades)
      seg.K = 12; seg.clade = new Uint8Array(12); for (let h = 6; h < 12; h++) seg.clade[h] = 1;
      const wS = { ROOT: rng.dirichlet(new Float64Array(6).fill(F.rootDirichlet)) }, wI = { ROOT: rng.dirichlet(new Float64Array(6).fill(F.rootDirichlet)) }, q = {};
      TREE.forEach(([pop, parent, f, mix]) => {
        if (parent) { wS[pop] = mixWeights(driftWeights(wS[parent], f, rng), mix, wS); wI[pop] = mixWeights(driftWeights(wI[parent], f, rng), mix, wI); }
        q[pop] = pop in INVERSION_FREQ ? INVERSION_FREQ[pop] : bnDraw(q[parent], f, rng);
        const w = new Float64Array(12);
        for (let h = 0; h < 6; h++) { w[h] = (1 - q[pop]) * wS[pop][h]; w[h + 6] = q[pop] * wI[pop][h]; }
        seg.weights[pop] = w;
      });
      seg.inversionFreq = q;
      const lr = CONFIG.layout.longRangeRegion, order = rng.shuffle(seg.snps.slice()), tags = new Set(order.slice(0, lr.cladeTagSnps));
      seg.tagSnps = seg.snps.filter(j => tags.has(j));
      const cladeMask = 0xfc0;
      let treeEnd = -1, branches = null, cladeOfTree = 0;
      seg.snps.forEach(j => {
        if (tags.has(j)) {
          let mask = cladeMask;
          if (rng.u() < 0.35) mask &= ~(1 << (6 + rng.int(6)));
          if (rng.u() < 0.15) mask |= 1 << rng.int(6);
          CARRIERS[j] = mask;
        } else {
          if (BP[j] > treeEnd) {
            cladeOfTree = rng.int(2);
            branches = randomTree([0, 1, 2, 3, 4, 5].map(h => h + 6 * cladeOfTree), rng);
            treeEnd = BP[j] + rng.exp(150000);
          }
          CARRIERS[j] = pickMutation(seg, branches, rng, m => maf(freqOfMask(seg.weights.EUR, m)) >= 0.03);
        }
      });
      return;
    }
    drawBlock(seg, rng);
  });
})();
function drawBlock(seg, rng) {             // founder weights by population and SNP carriers of one block
  const F = CONFIG.founders;
  seg.K = F.perBlock; seg.weights = {};
  seg.weights.ROOT = rng.dirichlet(new Float64Array(seg.K).fill(F.rootDirichlet));
  TREE.forEach(([pop, parent, f, mix]) => { if (parent) seg.weights[pop] = mixWeights(driftWeights(seg.weights[parent], f, rng), mix, seg.weights); });
  const leaves = []; for (let h = 0; h < seg.K; h++) leaves.push(h);
  let treeEnd = -1, branches = null;
  seg.snps.forEach(j => {
    if (BP[j] > treeEnd) { branches = randomTree(leaves, rng); treeEnd = BP[j] + rng.exp(F.localTreeMeanKb * 1000); }
    CARRIERS[j] = pickMutation(seg, branches, rng, m => isAscertained(seg, m, rng));
  });
}
function treeFreq(pop, j) { return freqOfMask(segments[SEG[j]].weights[pop], CARRIERS[j]); }
function popFreq(pop, j) {               // model frequency of the derived allele
  const ad = ADMIXED_POPS[pop];
  if (!ad) return treeFreq(pop, j);
  let f = 0; for (const s in ad.sources) f += ad.sources[s] * treeFreq(s, j);
  return f;
}

/* Alleles on the forward (GRCh37 +) strand */
const REF = [], ALT = [], DERIVED_IS_ALT = new Uint8Array(M), PALINDROMIC = new Uint8Array(M);
(function alleles() {
  const rng = RNG.model.fork("alleles"), T = CONFIG.layout.snpTypes;
  for (let j = 0; j < M; j++) {
    const r = rng.u();
    let pair;
    if (r < T.transition) pair = rng.u() < 0.5 ? ["A", "G"] : ["C", "T"];
    else if (r < T.transition + T.palindromic) { pair = rng.u() < 0.5 ? ["A", "T"] : ["C", "G"]; PALINDROMIC[j] = 1; }
    else pair = rng.u() < 0.5 ? ["A", "C"] : ["G", "T"];
    if (rng.u() < 0.5) pair.reverse();
    REF.push(pair[0]); ALT.push(pair[1]);
    DERIVED_IS_ALT[j] = rng.u() < CONFIG.founders.derivedIsAltProb ? 1 : 0;
  }
})();
function altFreq(pop, j) { const f = popFreq(pop, j); return DERIVED_IS_ALT[j] ? f : 1 - f; }

/* ============================================================================================
   5. Haplotypes: Li-Stephens copying within blocks; ancestry tracts for admixed people;
   meiosis with crossovers for relatives. A person is two arrays of founder-haplotype labels.
   ============================================================================================ */
const HAPS = [];                          // label -> Uint8Array(M) of derived-allele indicators
function sampleSegment(seg, pop, rng, out) {
  const w = seg.weights[pop], meanBp = SWITCH_MEAN_KB[ANCESTRY_OF[pop]] * 1000, snps = seg.snps;
  let h = rng.pick(w);
  for (let t = 0; t < snps.length; t++) {
    const j = snps[t];
    if (t > 0 && rng.u() < 1 - Math.exp(-(BP[j] - BP[snps[t - 1]]) / meanBp)) {
      if (seg.clade) { const c = seg.clade[h], wc = new Float64Array(w.length); for (let k = 0; k < w.length; k++) if (seg.clade[k] === c) wc[k] = w[k]; h = rng.pick(wc); }
      else h = rng.pick(w);
    }
    out[j] = (CARRIERS[j] >>> h) & 1;
  }
}
function makeTracts(props, generations, rng) {   // ancestry along each chromosome: [{start, pop}]
  const pops = Object.keys(props), w = pops.map(p => props[p]), tracts = {};
  CHROMS.forEach(c => {
    const n = rng.poisson(generations * c[5] / 100), cuts = [];
    for (let k = 0; k < n; k++) cuts.push(rng.uniform(0, c[1]));
    cuts.sort((a, b) => a - b);
    const list = [{ start: 0, pop: pops[rng.pick(w)] }];
    cuts.forEach(x => { const p = pops[rng.pick(w)]; if (p !== list[list.length - 1].pop) list.push({ start: x, pop: p }); });
    tracts[c[0]] = list;
  });
  return tracts;
}
function tractPop(tracts, chr, bp) { const L = tracts[chr]; let p = L[0].pop; for (const t of L) { if (t.start <= bp) p = t.pop; else break; } return p; }
function tractShares(tracts) {           // share of the genome (bp) in each ancestry
  const out = {}; let tot = 0;
  CHROMS.forEach(c => { const L = tracts[c[0]]; for (let k = 0; k < L.length; k++) { const e = k + 1 < L.length ? L[k + 1].start : c[1], len = e - L[k].start, a = ANCESTRY_OF[L[k].pop]; out[a] = (out[a] || 0) + len; tot += len; } });
  for (const a in out) out[a] /= tot;
  return out;
}
/* hapSpec: {pop} (one population) or {tracts} (ancestry tracts) */
function newHaplotype(hapSpec, rng) {
  const h = new Uint8Array(M);
  segments.forEach(seg => sampleSegment(seg, hapSpec.pop || tractPop(hapSpec.tracts, seg.chr, seg.start), rng, h));
  HAPS.push(h);
  return HAPS.length - 1;
}
function hapAncestry(hapSpec) { return hapSpec.pop ? { [ANCESTRY_OF[hapSpec.pop] || "AFR"]: 1 } : tractShares(hapSpec.tracts); }
function makeFounder(hapSpecs, rng) {
  const lab = hapSpecs.map(hs => new Int32Array(M).fill(newHaplotype(hs, rng)));
  const anc = {}; hapSpecs.forEach(hs => { const a = hapAncestry(hs); for (const k in a) anc[k] = (anc[k] || 0) + a[k] / 2; });
  const pop = hapSpecs[0].pop && hapSpecs.every(hs => hs.pop === hapSpecs[0].pop) ? hapSpecs[0].pop : null;
  return { lab, hapSpecs, ancestry: anc, pop };
}
function gamete(parent, rng) {
  const g = new Int32Array(M);
  CHROMS.forEach(c => {
    const n = rng.poisson(c[5] / 100), cuts = [];
    for (let k = 0; k < n; k++) cuts.push(rng.uniform(0, c[1]));
    cuts.sort((a, b) => a - b);
    let which = rng.u() < 0.5 ? 0 : 1, k = 0;
    const [j0, j1] = CHR_RANGE[c[0]];
    for (let j = j0; j < j1; j++) { while (k < cuts.length && cuts[k] < BP[j]) { which ^= 1; k++; } g[j] = parent.lab[which][j]; }
  });
  return g;
}
function makeChild(p1, p2, rng) {
  const anc = {}; [p1, p2].forEach(p => { for (const k in p.ancestry) anc[k] = (anc[k] || 0) + p.ancestry[k] / 2; });
  return { lab: [gamete(p1, rng), gamete(p2, rng)], ancestry: anc, pop: p1.pop === p2.pop ? p1.pop : null };
}
function allelesOf(person) {
  const a = new Uint8Array(M), b = new Uint8Array(M), [l0, l1] = person.lab;
  for (let j = 0; j < M; j++) { a[j] = HAPS[l0[j]][j]; b[j] = HAPS[l1[j]][j]; }
  return [a, b];
}
function realizedIbd(x, y, snps) {        // shares of SNPs where x and y share 0, 1 or 2 haplotypes IBD
  const k = [0, 0, 0];
  for (const j of snps) {
    const a = x.lab[0][j], b = x.lab[1][j], c = y.lab[0][j], d = y.lab[1][j];
    let s;
    if ((a === c && b === d) || (a === d && b === c)) s = 2; else if (a === c || a === d || b === c || b === d) s = 1; else s = 0;
    k[s]++;
  }
  const n = snps.length;
  return { k0: k[0] / n, k1: k[1] / n, k2: k[2] / n, pi_hat: (k[1] / 2 + k[2]) / n };
}
function autozygosity(x, snps) { let s = 0; for (const j of snps) if (x.lab[0][j] === x.lab[1][j]) s++; return s / snps.length; }

/* ============================================================================================
   6. SNP roles: causal SNP, reference-only SNPs, SNPs with high missingness, HWE artifacts
   ============================================================================================ */
const longRangeSeg = segments.find(s => s.kind === "long-range");
const causalSeg = segments.find(s => s.kind === "causal-block");
const IN_LONG_RANGE = new Uint8Array(M); longRangeSeg.snps.forEach(j => { IN_LONG_RANGE[j] = 1; });
const panelPops = PANEL.map(p => p[0]);
function panelMaf(j) { let f = 0; panelPops.forEach(p => { f += popFreq(p, j); }); return maf(f / panelPops.length); }
function eurMaf(j) { return maf(popFreq("EUR", j)); }

const causal = (function () {
  // the causal-block SNP whose European frequency of one allele is closest to the target (within range)
  const C = CONFIG.causal, inRange = f => f >= C.riskFrequencyRange[0] && f <= C.riskFrequencyRange[1];
  function pick() {
    let best = -1, bestD = 9, riskDerived = 1;
    causalSeg.snps.forEach(j => {
      if (PALINDROMIC[j]) return;
      const f = popFreq("EUR", j);
      if (inRange(f) && Math.abs(f - C.targetRiskFrequency) < bestD) { bestD = Math.abs(f - C.targetRiskFrequency); best = j; riskDerived = 1; }
      if (inRange(1 - f) && Math.abs(1 - f - C.targetRiskFrequency) < bestD) { bestD = Math.abs(1 - f - C.targetRiskFrequency); best = j; riskDerived = 0; }
    });
    return best < 0 ? null : { j: best, riskDerived };
  }
  let c = pick();
  for (let t = 1; !c && t <= 200; t++) { drawBlock(causalSeg, RNG.model.fork("causal-block-" + t)); causalSeg.redraws = t; c = pick(); }
  if (!c) throw new Error("no causal-block SNP with a European risk-allele frequency in " + C.riskFrequencyRange.join("-"));
  return c;
})();
const riskAllele = (causal.riskDerived ? DERIVED_IS_ALT[causal.j] : !DERIVED_IS_ALT[causal.j]) ? ALT[causal.j] : REF[causal.j];
function riskCount(alleles, j) { const d = alleles[0][j] + alleles[1][j]; return causal.riskDerived ? d : 2 - d; }
const PEN = CONFIG.causal.penetrance, PEN_MAX = Math.max(...PEN), PEN_MIN = Math.min(...PEN);

const REF_ONLY = new Uint8Array(M), HIGH_MISS = new Uint8Array(M), HWE_ARTIFACT = new Int8Array(M);   // 1 deficit, 2 excess
const SNP_LOGIT = new Float64Array(M), HWE_STRENGTH = new Float64Array(M), HIGH_MISS_TARGET = new Float64Array(M);
(function snpRoles() {
  const rng = RNG.snpRoles, Mi = CONFIG.missingness;
  // reference-only SNPs: isolated SNPs common in the panel
  const iso = rng.shuffle(segments.filter(s => s.kind === "isolated").map(s => s.snps[0]).filter(j => panelMaf(j) >= 0.1 && !PALINDROMIC[j]));
  iso.slice(0, CONFIG.layout.referenceOnlySnps).forEach(j => { REF_ONLY[j] = 1; });
  const ordinary = j => !REF_ONLY[j] && !IN_LONG_RANGE[j] && j !== causal.j;
  // per-SNP missingness (logit offsets); a few percent of SNPs fail often
  for (let j = 0; j < M; j++) SNP_LOGIT[j] = Mi.snpLogitSd * rng.normal();
  const mu = Math.log(Mi.baseRate / (1 - Mi.baseRate));
  const cand = rng.shuffle(Array.from({ length: M }, (_, j) => j).filter(ordinary));
  cand.slice(0, Mi.highMissingSnps).forEach(j => {
    const lo = Math.log(Mi.highMissingRateRange[0]), hi = Math.log(Mi.highMissingRateRange[1]);
    const rate = Math.exp(rng.uniform(lo, hi));
    HIGH_MISS[j] = 1; HIGH_MISS_TARGET[j] = rate; SNP_LOGIT[j] = Math.log(rate / (1 - rate)) - mu;
  });
  SNP_LOGIT[causal.j] = Mi.protectedSnpLogitOffset;
})();
const STUDY_SNPS = []; for (let j = 0; j < M; j++) if (!REF_ONLY[j]) STUDY_SNPS.push(j);

/* ============================================================================================
   7. People of the toy study
   ============================================================================================ */
const eurPops = Object.keys(CONFIG.study.europeanSubpopulations), eurW = eurPops.map(p => CONFIG.study.europeanSubpopulations[p]);
function eurLeaf(rng) { return eurPops[rng.pick(eurW)]; }
function eurSpec(rng, leaf) { const p = leaf || eurLeaf(rng); return [{ pop: p }, { pop: p }]; }
const rows = [];
(function roles() {
  const S = CONFIG.study, M_ = CONFIG.missingness;
  const add = (o) => rows.push(Object.assign({ role: "normal" }, o));
  add({ role: "duplicate", family: "DUP", copy: 1 }); add({ role: "duplicate", family: "DUP", copy: 2 });
  add({ role: "parent", family: "PO" }); add({ role: "offspring", family: "PO" });
  add({ role: "full_sibling", family: "FS", sib: 1 }); add({ role: "full_sibling", family: "FS", sib: 2 });
  add({ role: "half_sibling", family: "HS", sib: 1 }); add({ role: "half_sibling", family: "HS", sib: 2 });
  if (S.firstCousins) { add({ role: "first_cousin", family: "FC", sib: 1 }); add({ role: "first_cousin", family: "FC", sib: 2 }); }
  add({ role: "inbred", family: "INB" });
  add({ role: "contaminated" });
  M_.degradedLogitOffsets.forEach(o => add({ role: "degraded", logitOffset: o }));
  M_.lowQualityLogitOffsets.forEach(o => add({ role: "low_quality", logitOffset: o }));
  S.nonEuropean.forEach(([p, n]) => { for (let k = 0; k < n; k++) add({ pop: p }); });
  S.admixedAfricanFraction.forEach(a => add({ admixed: a }));
  for (let k = 0; k < S.admixedFirstGeneration; k++) add({ admixed: "first-generation" });
  while (rows.length < S.n) add({});
  if (rows.length !== S.n) throw new Error("too many special roles for n = " + S.n);
  const rng = RNG.roles;
  rng.shuffle(rows);
  // FIDs: increasing unique numbers with small gaps, as in PennCATH (10002, 10004, 10005, ...)
  let fid = S.firstFid - 1;
  rows.forEach(r => { fid += 1 + (rng.u() < 0.25 ? 1 + rng.int(2) : 0); r.fid = "\"" + fid + "\""; r.iid = "1"; });
  const sexes = rng.shuffle(Array.from({ length: S.n }, (_, i) => (i < S.males ? 1 : 2)));
  const classes = rng.shuffle(Array.from({ length: S.n }, (_, i) => (i < S.cases ? "case" : i < S.cases + S.controls ? "control" : "missing")));
  rows.forEach((r, i) => { r.sex = sexes[i]; r.cls = classes[i]; });
  const d1 = rows.find(r => r.role === "duplicate" && r.copy === 1), d2 = rows.find(r => r.role === "duplicate" && r.copy === 2);
  if (d2.sex !== d1.sex) {                // keep the planned number of males: swap sexes with an ordinary person
    const swap = rows.filter(r => r.role === "normal" && r.sex === d1.sex);
    swap[rng.int(swap.length)].sex = d2.sex;
    d2.sex = d1.sex;
  }
  if (d2.cls !== d1.cls) {                // the same for the phenotype class
    const swap = rows.filter(r => r.role === "normal" && r.cls === d1.cls);
    swap[rng.int(swap.length)].cls = d2.cls;
    d2.cls = d1.cls;
  }
})();

/* Draw a founder for a study row, conditioning its genotype at the causal block on the row's
   case/control class (rejection sampling: genotypes of cases are drawn in proportion to the
   penetrance, controls in proportion to 1 - penetrance). */
function resampleCausalBlock(person, rng) {
  person.lab.forEach((lab, k) => {
    const hs = person.hapSpecs[k], pop = hs.pop || tractPop(hs.tracts, causalSeg.chr, causalSeg.start);
    sampleSegment(causalSeg, pop, rng, HAPS[lab[0]]);
  });
}
function conditionOnClass(person, cls, rng) {
  if (cls === "missing") return;
  for (let tries = 0; tries < 10000; tries++) {
    const g = riskCount(allelesOf(person), causal.j), pen = PEN[g];
    const acc = cls === "case" ? pen / PEN_MAX : (1 - pen) / (1 - PEN_MIN);
    if (rng.u() < acc) return;
    resampleCausalBlock(person, rng);
  }
  throw new Error("rejection sampling at the causal SNP did not converge");
}
(function people() {
  const rng = RNG.people, S = CONFIG.study, R = CONFIG.relatives;
  // people outside the study (parents, spouses, the contaminant)
  const outside = (label, leaf) => { const p = makeFounder(eurSpec(rng, leaf), rng); p.label = label; return p; };
  // redraw the meioses until the realized IBD sharing is close to its expectation
  const typical = (make, ok, what) => {
    for (let t = 0; t < R.maxTries; t++) { const x = make(); if (ok(x)) return x; }
    throw new Error("could not draw a typical " + what);
  };
  rows.forEach(r => {
    if (["offspring", "full_sibling", "half_sibling", "first_cousin", "inbred"].includes(r.role)) return;
    if (r.role === "duplicate" && r.copy === 2) return;
    let specs;
    if (r.pop) specs = [{ pop: r.pop }, { pop: r.pop }];
    else if (r.admixed === "first-generation") specs = [{ pop: "YRI" }, { pop: "CEU" }];
    else if (r.admixed != null) specs = [0, 1].map(() => ({ tracts: makeTracts({ YRI: r.admixed, CEU: 1 - r.admixed }, S.admixedGenerations, rng) }));
    else specs = eurSpec(rng);
    r.person = makeFounder(specs, rng);
    conditionOnClass(r.person, r.cls, rng);
    if (r.role === "contaminated") r.contaminant = outside("contaminant of " + r.fid);
  });
  const byRole = (role) => rows.filter(r => r.role === role);
  const dupRows = byRole("duplicate");
  dupRows.find(r => r.copy === 2).person = dupRows.find(r => r.copy === 1).person;
  // every family comes from one European-like subpopulation
  const po = rows.find(r => r.role === "offspring"), par = rows.find(r => r.role === "parent");
  po.person = makeChild(par.person, outside("other parent of " + po.fid, par.person.pop), rng);
  const fsLeaf = eurLeaf(rng), fsP = [outside("parent 1 of the full siblings", fsLeaf), outside("parent 2 of the full siblings", fsLeaf)];
  const fsKids = typical(() => [makeChild(fsP[0], fsP[1], rng), makeChild(fsP[0], fsP[1], rng)], k => {
    const x = realizedIbd(k[0], k[1], STUDY_SNPS);
    return Math.abs(x.k0 - 0.25) <= R.fullSibTolerance && Math.abs(x.k2 - 0.25) <= R.fullSibTolerance;
  }, "full-sibling pair");
  byRole("full_sibling").forEach((r, k) => { r.person = fsKids[k]; });
  const hsLeaf = eurLeaf(rng), hsA = outside("shared parent of the half siblings", hsLeaf);
  const hsB = [1, 2].map(k => outside("other parent of half sibling " + k, hsLeaf));
  const hsKids = typical(() => [makeChild(hsA, hsB[0], rng), makeChild(hsA, hsB[1], rng)],
    k => Math.abs(realizedIbd(k[0], k[1], STUDY_SNPS).pi_hat - 0.25) <= R.halfSibTolerance, "half-sibling pair");
  byRole("half_sibling").forEach((r, k) => { r.person = hsKids[k]; });
  if (S.firstCousins) {
    const fcLeaf = eurLeaf(rng), g = [outside("grandparent 1 of the cousins", fcLeaf), outside("grandparent 2 of the cousins", fcLeaf)];
    const sibs = [makeChild(g[0], g[1], rng), makeChild(g[0], g[1], rng)];
    byRole("first_cousin").forEach((r, k) => { r.person = makeChild(sibs[k], outside("other parent of cousin " + (k + 1), fcLeaf), rng); });
  }
  const inLeaf = eurLeaf(rng), ig = [outside("grandparent 1 of the inbred person", inLeaf), outside("grandparent 2 of the inbred person", inLeaf)];
  rows.find(r => r.role === "inbred").person = typical(() => {
    const ip = [makeChild(ig[0], ig[1], rng), makeChild(ig[0], ig[1], rng)];
    return makeChild(ip[0], ip[1], rng);
  }, x => Math.abs(autozygosity(x, STUDY_SNPS) - 0.25) <= R.inbredTolerance, "inbred person");
  // phenotypes of relatives follow from their own genotype at the causal SNP
  rows.forEach(r => {
    if (!["offspring", "full_sibling", "half_sibling", "first_cousin", "inbred"].includes(r.role) || r.cls === "missing") return;
    r.cls = rng.u() < PEN[riskCount(allelesOf(r.person), causal.j)] ? "case" : "control";
  });
  rows.forEach(r => { r.phen = r.cls === "case" ? 2 : r.cls === "control" ? 1 : -9; });
})();

/* HWE artifacts: SNPs whose genotype calls will be distorted (section 9). They are chosen among
   ordinary non-palindromic SNPs outside the causal block by the minor-allele frequency of the
   controls' true genotypes, so that the distortion is strong in the UNAFF rows of --hardy. */
(function hweArtifacts() {
  const rng = RNG.snpRoles.fork("hwe"), H = CONFIG.hwe, ctrl = rows.filter(r => r.cls === "control");
  const freq = new Float64Array(M);
  ctrl.forEach(r => { const [a, b] = allelesOf(r.person); for (let j = 0; j < M; j++) freq[j] += a[j] + b[j]; });
  for (let j = 0; j < M; j++) freq[j] /= 2 * ctrl.length;
  const causalBlock = new Set(causalSeg.snps);
  const used = new Set();
  const pickFrom = (lo, hi) => {
    const c = rng.shuffle(STUDY_SNPS.filter(j => !IN_LONG_RANGE[j] && !causalBlock.has(j) && !PALINDROMIC[j] && !HIGH_MISS[j] && !used.has(j) && maf(freq[j]) >= lo && maf(freq[j]) <= hi));
    if (!c.length) throw new Error("no candidate SNP for an HWE artifact with control MAF in [" + lo + ", " + hi + "]");
    used.add(c[0]); return c[0];
  };
  H.deficitHetMiscall.forEach(s => { const j = pickFrom(H.deficitMafRange[0], H.deficitMafRange[1]); HWE_ARTIFACT[j] = 1; HWE_STRENGTH[j] = s; });
  H.excessHomToHet.forEach(s => { const j = pickFrom(H.excessMafRange[0], H.excessMafRange[1]); HWE_ARTIFACT[j] = 2; HWE_STRENGTH[j] = s; });
  for (let j = 0; j < M; j++) if (HWE_ARTIFACT[j]) SNP_LOGIT[j] = CONFIG.missingness.protectedSnpLogitOffset;
})();

/* ============================================================================================
   8. The reference panel (toy_1kg): unrelated people from 15 populations
   ============================================================================================ */
const panelPeople = [];
(function panel() {
  const rng = RNG.reference;
  PANEL.forEach(([pop, n]) => {
    for (let k = 0; k < n; k++) {
      let specs;
      const ad = ADMIXED_POPS[pop];
      if (ad) {
        const srcs = Object.keys(ad.sources), alpha = srcs.map(s => ad.sources[s] * ad.concentration);
        const props = rng.dirichlet(alpha), pr = {}; srcs.forEach((s, i) => { pr[s] = props[i]; });
        specs = [0, 1].map(() => ({ tracts: makeTracts(pr, ad.generations, rng) }));
      } else specs = [{ pop }, { pop }];
      const person = makeFounder(specs, rng);
      panelPeople.push({ pop, superPop: SUPER_OF[pop], person, gender: null, sample: null });
    }
  });
  const order = rng.shuffle(panelPeople.map((_, i) => i));
  order.forEach((idx, k) => { panelPeople[idx].sample = "TG" + String(101 + k * 3 + rng.int(3)).padStart(5, "0"); });
  const genders = rng.shuffle(panelPeople.map((_, i) => (i % 2 ? "female" : "male")));
  panelPeople.forEach((p, i) => { p.gender = genders[i]; });
  panelPeople.sort((a, b) => (a.sample < b.sample ? -1 : 1));
})();

/* True genotypes as forward-strand ALT allele counts */
function altCounts(person) {
  const [a, b] = allelesOf(person), g = new Uint8Array(M);
  for (let j = 0; j < M; j++) { const d = a[j] + b[j]; g[j] = DERIVED_IS_ALT[j] ? d : 2 - d; }
  return g;
}
rows.forEach(r => { r.trueAlt = altCounts(r.person); if (r.contaminant) r.contaminantAlt = altCounts(r.contaminant); });
panelPeople.forEach(p => { p.trueAlt = altCounts(p.person); });

/* Reference SNP set: an LD-thinned set of common SNPs, as a 'markers for PCA' file would be */
const IN_REF = new Uint8Array(M);
(function referenceSnps() {
  const rng = RNG.reference.fork("snps"), C = CONFIG.reference, n = panelPeople.length;
  function r2(j, k) {
    let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
    for (const p of panelPeople) { const x = p.trueAlt[j], y = p.trueAlt[k]; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; }
    const cov = n * sxy - sx * sy, vx = n * sxx - sx * sx, vy = n * syy - sy * sy;
    return vx > 0 && vy > 0 ? cov * cov / (vx * vy) : 0;
  }
  const chosen = [];
  const fitsLd = j => { for (let t = chosen.length - 1; t >= 0; t--) { const k = chosen[t]; if (CHR[k] !== CHR[j] || BP[j] - BP[k] > C.ldWindowKb * 1000) continue; if (r2(j, k) > C.ldR2Max) return false; } return true; };
  const base = j => !REF_ONLY[j] && !HIGH_MISS[j] && !HWE_ARTIFACT[j] && !IN_LONG_RANGE[j] && panelMaf(j) >= C.minPanelMaf;
  const ordered = []; for (let j = 0; j < M; j++) if (base(j) && !PALINDROMIC[j]) ordered.push(j);
  ordered.forEach(j => { if (fitsLd(j)) chosen.push(j); chosen.sort((a, b) => a - b); });
  let shared = chosen.slice();
  const nNonPal = C.targetSharedSnps - CONFIG.strand.sharedPalindromic - C.longRangeSnps;
  if (shared.length > nNonPal) shared = rng.shuffle(shared).slice(0, nNonPal).sort((a, b) => a - b);
  shared.forEach(j => { IN_REF[j] = 1; });
  const pr = CONFIG.strand.palindromicEurMafRange;
  const palCand = rng.shuffle(Array.from({ length: M }, (_, j) => j).filter(j => base(j) && PALINDROMIC[j] && eurMaf(j) >= pr[0] && eurMaf(j) <= pr[1]));
  let nPal = 0;
  for (const j of palCand) {
    if (nPal >= CONFIG.strand.sharedPalindromic) break;
    let ok = true;
    for (let k = 0; k < M; k++) if (IN_REF[k] && CHR[k] === CHR[j] && Math.abs(BP[k] - BP[j]) <= C.ldWindowKb * 1000 && r2(j, k) > C.ldR2Max) { ok = false; break; }
    if (ok) { IN_REF[j] = 1; nPal++; }
  }
  if (nPal < CONFIG.strand.sharedPalindromic) throw new Error("not enough palindromic SNPs for the reference");
  rng.shuffle(longRangeSeg.tagSnps.filter(j => !PALINDROMIC[j])).slice(0, C.longRangeSnps).forEach(j => { IN_REF[j] = 1; });
  for (let j = 0; j < M; j++) if (REF_ONLY[j]) IN_REF[j] = 1;
})();

/* Strand: the study reports about half of its SNPs on the reverse strand (alleles complemented) */
const STUDY_FLIP = new Uint8Array(M);
const sharedPal = [];
(function strand() {
  const rng = RNG.strand;
  for (let j = 0; j < M; j++) if (!REF_ONLY[j]) STUDY_FLIP[j] = rng.u() < CONFIG.strand.reverseFraction ? 1 : 0;
  for (let j = 0; j < M; j++) if (IN_REF[j] && !REF_ONLY[j] && PALINDROMIC[j]) sharedPal.push(j);
  const swapped = new Set(rng.shuffle(sharedPal.slice()).slice(0, CONFIG.strand.swappedPalindromic));
  sharedPal.forEach(j => { STUDY_FLIP[j] = swapped.has(j) ? 1 : 0; });
  // SNPs shared with the reference panel (strand flips included) must survive --geno 0.01: like a
  // panel's markers for PCA, they are SNPs with good call rates (at most the protected missingness)
  for (let j = 0; j < M; j++) if (IN_REF[j] && !REF_ONLY[j]) SNP_LOGIT[j] = Math.min(SNP_LOGIT[j], CONFIG.missingness.protectedSnpLogitOffset);
})();

/* ============================================================================================
   9. Genotype calls of the study: contamination, probe artifacts, errors, missing calls
   ============================================================================================ */
(function calls() {
  const rng = RNG.calls, Mi = CONFIG.missingness, Ct = CONFIG.contamination;
  const mu = Math.log(Mi.baseRate / (1 - Mi.baseRate));
  // study-wide true allele frequencies decide which homozygote an artifact favours
  const altF = new Float64Array(M);
  for (let j = 0; j < M; j++) { let s = 0; rows.forEach(r => { s += r.trueAlt[j]; }); altF[j] = s / (2 * rows.length); }
  rows.forEach(r => {
    r.logit = r.logitOffset != null ? r.logitOffset : (r.role === "contaminated" ? 0 : Mi.personLogitSd * rng.normal());
    r.errorRate = r.role === "degraded" ? CONFIG.errors.degradedRate : CONFIG.errors.rate;
  });
  rows.forEach(r => {
    const call = new Int8Array(M).fill(-1);
    for (const j of STUDY_SNPS) {
      let g = r.trueAlt[j];
      if (r.contaminantAlt) {
        const g2 = r.contaminantAlt[j];
        if (g2 !== g) {
          const b = (1 - Ct.alpha) * g / 2 + Ct.alpha * g2 / 2 + Ct.intensityNoiseSd * rng.normal();
          g = b < Ct.hetCallRange[0] ? 0 : b > Ct.hetCallRange[1] ? 2 : 1;
          if (rng.u() < Ct.noCallAtMixedSites) g = -1;
        }
      }
      if (g >= 0 && HWE_ARTIFACT[j]) {
        const majorHom = altF[j] > 0.5 ? 2 : 0;
        if (HWE_ARTIFACT[j] === 1 && g === 1 && rng.u() < HWE_STRENGTH[j]) g = majorHom;          // het cluster merged into a homozygote
        else if (HWE_ARTIFACT[j] === 2 && g === majorHom && rng.u() < HWE_STRENGTH[j]) g = 1;     // second binding site adds the other allele
      }
      if (g >= 0 && rng.u() < r.errorRate) g = g === 1 ? (rng.u() < 0.5 ? 0 : 2) : 1;
      if (g >= 0) { const x = mu + r.logit + SNP_LOGIT[j]; if (rng.u() < 1 / (1 + Math.exp(-x))) g = -1; }
      call[j] = g;
    }
    r.call = call;
  });
})();

/* ============================================================================================
   10. PLINK datasets (A1 = minor allele, as PLINK writes it) and output files
   ============================================================================================ */
function studyAlleles(j) { return STUDY_FLIP[j] ? [COMP[REF[j]], COMP[ALT[j]]] : [REF[j], ALT[j]]; }
const study = (function () {
  const n = rows.length, m = STUDY_SNPS.length, geno = new Int8Array(n * m), snps = [];
  STUDY_SNPS.forEach((j, q) => {
    let alt = 0, obs = 0;
    rows.forEach(r => { const g = r.call[j]; if (g >= 0) { alt += g; obs += 2; } });
    const altIsA1 = obs === 0 || alt / obs <= 0.5, [sr, sa] = studyAlleles(j);
    snps.push({ chr: CHR[j], id: ID[j], cm: 0, bp: BP[j], a1: altIsA1 ? sa : sr, a2: altIsA1 ? sr : sa });
    rows.forEach((r, i) => { const g = r.call[j]; geno[q * n + i] = g < 0 ? -1 : (altIsA1 ? g : 2 - g); });
  });
  const samples = rows.map(r => ({ fid: r.fid, iid: r.iid, pat: "0", mat: "0", sex: r.sex, phen: r.phen }));
  return { samples, snps, n, m, geno, phenoType: "cc" };
})();
const REF_SNPS = []; for (let j = 0; j < M; j++) if (IN_REF[j]) REF_SNPS.push(j);
const reference = (function () {
  const n = panelPeople.length, m = REF_SNPS.length, geno = new Int8Array(n * m), snps = [];
  REF_SNPS.forEach((j, q) => {
    let alt = 0; panelPeople.forEach(p => { alt += p.trueAlt[j]; });
    const altIsA1 = alt / (2 * n) <= 0.5;
    snps.push({ chr: CHR[j], id: ID[j], cm: 0, bp: BP[j], a1: altIsA1 ? ALT[j] : REF[j], a2: altIsA1 ? REF[j] : ALT[j] });
    panelPeople.forEach((p, i) => { const g = p.trueAlt[j]; geno[q * n + i] = altIsA1 ? g : 2 - g; });
  });
  const samples = panelPeople.map(p => ({ fid: p.sample, iid: p.sample, pat: "0", mat: "0", sex: p.gender === "male" ? 1 : 2, phen: -9 }));
  return { samples, snps, n, m, geno, phenoType: "cc" };
})();

const studyFiles = PlinkCore.writeBfile(study), refFiles = PlinkCore.writeBfile(reference);

/* Realized summaries used in truth.json */
const snpMissing = new Int32Array(M), rowMissing = new Int32Array(rows.length), rowMissingAfterGeno = new Int32Array(rows.length);
STUDY_SNPS.forEach(j => { rows.forEach((r, i) => { if (r.call[j] < 0) { snpMissing[j]++; rowMissing[i]++; } }); });
const GENO_FAIL = new Uint8Array(M);
STUDY_SNPS.forEach(j => { if (snpMissing[j] / rows.length > 0.01) GENO_FAIL[j] = 1; });
const nAfterGeno = STUDY_SNPS.filter(j => !GENO_FAIL[j]).length;
STUDY_SNPS.forEach(j => { if (!GENO_FAIL[j]) rows.forEach((r, i) => { if (r.call[j] < 0) rowMissingAfterGeno[i]++; }); });

/* ============================================================================================
   11. Ground truth
   ============================================================================================ */
const r4 = x => Math.round(x * 10000) / 10000;
const r6 = x => Math.round(x * 1e6) / 1e6;
function fstHudson(p1, p2, snps) {
  let num = 0, den = 0;
  for (const j of snps) { const a = popFreq(p1, j), b = popFreq(p2, j); num += (a - b) * (a - b) - a * (1 - a) / 1e9 - b * (1 - b) / 1e9; den += a * (1 - b) + b * (1 - a); }
  return num / den;
}
const studyRowsOf = role => rows.filter(r => r.role === role);
const idOf = r => ({ fid: r.fid, iid: r.iid });
const ibdSnps = STUDY_SNPS;
function popLabel(r) {
  if (r.admixed != null) return { population: "ADMIXED", super_pop: "ADMIXED" };
  const p = r.person.pop;
  return { population: p, super_pop: SUPER_OF[p] };
}
function roundAnc(a) { const o = {}; Object.keys(a).sort().forEach(k => { if (a[k] > 0.00005) o[k] = r4(a[k]); }); return o; }

const pairs = [];
function addPair(a, b, relationship, expected) { pairs.push({ a: idOf(a), b: idOf(b), relationship, expected, realized: Object.fromEntries(Object.entries(realizedIbd(a.person, b.person, ibdSnps)).map(([k, v]) => [k, r4(v)])) }); }
(function relationPairs() {
  const d = studyRowsOf("duplicate"); addPair(d[0], d[1], "duplicate (same person genotyped twice)", { Z0: 0, Z1: 0, Z2: 1, PI_HAT: 1 });
  addPair(rows.find(r => r.role === "parent"), rows.find(r => r.role === "offspring"), "parent-offspring", { Z0: 0, Z1: 1, Z2: 0, PI_HAT: 0.5 });
  const fs = studyRowsOf("full_sibling"); addPair(fs[0], fs[1], "full siblings", { Z0: 0.25, Z1: 0.5, Z2: 0.25, PI_HAT: 0.5 });
  const hs = studyRowsOf("half_sibling"); addPair(hs[0], hs[1], "half siblings (second degree)", { Z0: 0.5, Z1: 0.5, Z2: 0, PI_HAT: 0.25 });
  if (CONFIG.study.firstCousins) { const fc = studyRowsOf("first_cousin"); addPair(fc[0], fc[1], "first cousins (third degree)", { Z0: 0.75, Z1: 0.25, Z2: 0, PI_HAT: 0.125 }); }
})();

const inbredRow = rows.find(r => r.role === "inbred");
const truthSamples = rows.map((r, i) => {
  const o = Object.assign({ fid: r.fid, iid: r.iid, row: i + 1, sex: r.sex, phenotype: r.phen }, popLabel(r), { ancestry: roundAnc(r.person.ancestry), role: r.role });
  if (r.admixed != null) o.admixture = r.admixed === "first-generation" ? "first generation: one African-like (YRI) parent, one European-like (CEU) parent" : "African-like (YRI) share " + r.admixed + " targeted; tracts from " + CONFIG.study.admixedGenerations + " generations of admixture";
  o.causal_risk_allele_count = riskCount(allelesOf(r.person), causal.j);
  o.missing_logit_offset = r4(r.logit);
  o.raw_missing_calls = rowMissing[i]; o.raw_f_miss = r6(rowMissing[i] / STUDY_SNPS.length);
  o.f_miss_after_geno = r6(rowMissingAfterGeno[i] / nAfterGeno);
  if (r.role === "duplicate") o.duplicate_of = idOf(rows.find(x => x.role === "duplicate" && x !== r));
  if (r.family) {
    const rel = pairs.filter(p => (p.a.fid === r.fid) || (p.b.fid === r.fid));
    if (rel.length) o.relatives = rel.map(p => ({ other: p.a.fid === r.fid ? p.b : p.a, relationship: p.relationship }));
  }
  if (r.role === "inbred") { o.parents = "full siblings (children of the same two founders), not in the study"; o.expected_F = 0.25; o.realized_autozygosity = r4(autozygosity(r.person, STUDY_SNPS)); }
  if (r.role === "contaminated") o.contamination = { contaminant: "a European-like person who is not in the study", contaminant_dna_share: CONFIG.contamination.alpha };
  if (r.role === "degraded") o.note = "degraded DNA: many missing calls (removed by --mind 0.01 after --geno 0.01)";
  if (r.role === "low_quality") o.note = "moderately low DNA quality: fails often at the weak SNPs, so its raw call rate is below 99% but its call rate after --geno 0.01 is above 99%";
  return o;
});

/* What the lab shows: steps 1-5 of the practical run on the files just made by the lab's PLINK
   emulator (plink-core.js, in memory). Recorded in truth.json as lab_view so that pages can explain
   the numbers learners will see (real PLINK 1.9.0 gives the same files; tools/real_plink_check.mjs). */
const LAB = (function labView() {
  const files = new Map(), W = "/lab", Q = W + "/toy.geno0.01.mind0.01", abs = p => (p.startsWith("/") ? p : W + "/" + p);
  const io = {
    cwd: W, read: p => (files.has(abs(p)) ? files.get(abs(p)) : null), write: (p, d) => { files.set(abs(p), d); return true; },
    exists: p => files.has(abs(p)), remove: p => { files.delete(abs(p)); }, print: () => {}, now: () => Date.UTC(2026, 8, 9, 14, 0, 0)
  };
  files.set(W + "/toy.bed", new Uint8Array(studyFiles.bed)); files.set(W + "/toy.bim", studyFiles.bim); files.set(W + "/toy.fam", studyFiles.fam);
  const plink = (...argv) => { const r = PlinkCore.run(argv, io); if (r.code !== 0) throw new Error("lab emulator: plink " + argv.join(" ") + " exited with code " + r.code); };
  const text = p => { const d = files.get(p); if (d == null) throw new Error("lab emulator wrote no " + p); return typeof d === "string" ? d : Buffer.from(d).toString("utf8"); };
  const table = p => {
    const L = text(p).split("\n").filter(l => l.trim()), h = L[0].trim().split(/\s+/);
    return L.slice(1).map(l => { const f = l.trim().split(/\s+/), o = {}; h.forEach((k, i) => { o[k] = f[i]; }); return o; });
  };
  plink("--bfile", W + "/toy", "--geno", "0.01", "--make-bed", "--out", W + "/toy.geno0.01");
  plink("--bfile", W + "/toy.geno0.01", "--mind", "0.01", "--make-bed", "--out", Q);
  plink("--bfile", Q, "--hardy", "--out", Q);
  plink("--bfile", Q, "--indep-pairwise", "50", "5", "0.3", "--out", Q);
  plink("--bfile", Q, "--extract", Q + ".prune.in", "--genome", "--out", Q + ".LD0.3");
  plink("--bfile", Q, "--het", "--extract", Q + ".prune.in", "--out", Q + ".LD0.3");
  const lines = p => text(p).split("\n").filter(l => l.trim()).length;
  return {
    qcPeople: lines(Q + ".fam"), qcSnps: lines(Q + ".bim"), pruneIn: lines(Q + ".prune.in"), pruneOut: lines(Q + ".prune.out"),
    hwe: table(Q + ".hwe"), genome: table(Q + ".LD0.3.genome"), het: table(Q + ".LD0.3.het")
  };
})();
const rowByFid = new Map(rows.map(r => [r.fid, r]));
const groupOf = r => (r.role === "contaminated" ? "CONTAMINATED" : popLabel(r).super_pop);
const labHardy = (function () {
  const unaff = LAB.hwe.filter(h => h.TEST === "UNAFF"), all = LAB.hwe.filter(h => h.TEST === "ALL");
  const special = j => HWE_ARTIFACT[j] || j === causal.j, idIndex = new Map(ID.map((id, j) => [id, j]));
  const pOf = (test, id) => Number(LAB.hwe.find(h => h.TEST === test && h.SNP === id).P);
  let minOther = null;
  unaff.forEach(h => { if (!special(idIndex.get(h.SNP)) && (!minOther || Number(h.P) < minOther.P)) minOther = { id: h.SNP, P: Number(h.P) }; });
  return {
    unaff_p_below_1e_8: unaff.filter(h => Number(h.P) < 1e-8).map(h => ({ id: h.SNP, P: Number(h.P) })),
    artifact_p: STUDY_SNPS.filter(j => HWE_ARTIFACT[j]).map(j => ({ id: ID[j], ALL: pOf("ALL", ID[j]), AFF: pOf("AFF", ID[j]), UNAFF: pOf("UNAFF", ID[j]) })),
    causal_p: { ALL: pOf("ALL", ID[causal.j]), AFF: pOf("AFF", ID[causal.j]), UNAFF: pOf("UNAFF", ID[causal.j]) },
    smallest_unaff_p_other_snps: minOther,
    all_rows_p_below_1e_8_other_snps: all.filter(h => Number(h.P) < 1e-8 && !special(idIndex.get(h.SNP))).map(h => {
      const j = idIndex.get(h.SNP);
      return { id: h.SNP, ALL: Number(h.P), UNAFF: pOf("UNAFF", h.SNP), alt: ALT[j], alt_freq_model: Object.fromEntries(["EUR", "AFR", "EAS", "SAS"].map(q => [q, r4(altFreq(q, j))])) };
    })
  };
})();
const labGenome = (function () {
  const plantedKey = new Map(pairs.map(p => [[p.a.fid, p.b.fid].sort().join(" "), p.relationship]));
  const planted = [], contaminated = [], above = { "0.1875": {}, "0.1": {} }, total = { "0.1875": 0, "0.1": 0 };
  let maxOther = null;
  LAB.genome.forEach(g => {
    const key = [g.FID1, g.FID2].sort().join(" "), pi = Number(g.PI_HAT);
    if (plantedKey.has(key)) { planted.push({ relationship: plantedKey.get(key), fid1: g.FID1, fid2: g.FID2, Z0: Number(g.Z0), Z1: Number(g.Z1), Z2: Number(g.Z2), PI_HAT: pi }); return; }
    const ga = groupOf(rowByFid.get(g.FID1)), gb = groupOf(rowByFid.get(g.FID2)), grp = [ga, gb].sort().join("-");
    for (const t of ["0.1875", "0.1"]) if (pi > Number(t)) { above[t][grp] = (above[t][grp] || 0) + 1; total[t]++; }
    if (ga === "CONTAMINATED" || gb === "CONTAMINATED") contaminated.push(pi);
    else if (!maxOther || pi > maxOther.PI_HAT) maxOther = { fid1: g.FID1, fid2: g.FID2, groups: grp, PI_HAT: pi };
  });
  const sortKeys = o => Object.fromEntries(Object.keys(o).sort().map(k => [k, o[k]]));
  contaminated.sort((a, b) => a - b);
  return {
    pairs: LAB.genome.length, planted,
    unrelated_pairs_above: { "0.1875": { total: total["0.1875"], by_group: sortKeys(above["0.1875"]) }, "0.1": { total: total["0.1"], by_group: sortKeys(above["0.1"]) } },
    contaminated_sample_pairs: {
      fid: rows.find(r => r.role === "contaminated").fid, n: contaminated.length, mean_PI_HAT: r4(contaminated.reduce((s, x) => s + x, 0) / contaminated.length), max_PI_HAT: contaminated[contaminated.length - 1],
      above_0_1875: contaminated.filter(x => x > 0.1875).length, above_0_1: contaminated.filter(x => x > 0.1).length
    },
    largest_other_unrelated_pair: maxOther
  };
})();
const labHet = (function () {
  const rate = LAB.het.map(h => (Number(h["N(NM)"]) - Number(h["O(HOM)"])) / Number(h["N(NM)"]));
  const mean = rate.reduce((s, x) => s + x, 0) / rate.length, sd = Math.sqrt(rate.reduce((s, x) => s + (x - mean) * (x - mean), 0) / (rate.length - 1));
  const who = (h, i) => { const r = rowByFid.get(h.FID); return { fid: h.FID, role: r.role, population: popLabel(r).population, F: Number(h.F), het_rate: r4(rate[i]) }; };
  return {
    het_rate_mean: r4(mean), het_rate_sd: r4(sd),
    outside_3_sd: LAB.het.map((h, i) => (Math.abs(rate[i] - mean) > 3 * sd ? who(h, i) : null)).filter(Boolean),
    abs_F_above_0_1: LAB.het.map((h, i) => (Math.abs(Number(h.F)) > 0.1 ? who(h, i) : null)).filter(Boolean),
    F_by_group: (function () {
      const g = {};
      LAB.het.forEach(h => { const k = groupOf(rowByFid.get(h.FID)); (g[k] = g[k] || []).push(Number(h.F)); });
      return Object.fromEntries(Object.keys(g).sort().map(k => [k, { n: g[k].length, mean: r4(g[k].reduce((a, b) => a + b, 0) / g[k].length), min: Math.min(...g[k]), max: Math.max(...g[k]) }]));
    })()
  };
})();

const shared = STUDY_SNPS.filter(j => IN_REF[j]);
const flipNeeded = shared.filter(j => STUDY_FLIP[j] && !PALINDROMIC[j]);
const expectedMissnp = flipNeeded.filter(j => !GENO_FAIL[j]);
const palSwapped = sharedPal.filter(j => STUDY_FLIP[j]), palOk = sharedPal.filter(j => !STUDY_FLIP[j]);
const tagIds = longRangeSeg.tagSnps;

const truth = {
  schema: "lecture1-toy-truth/1",
  about: "Ground truth of the Lecture 1 toy data: a simulated PennCATH-like case-control study of coronary artery disease (toy.*) and a 1000-Genomes-like reference panel (toy_1kg.*). See data/README.md.",
  generator: "1-introduction-gwas-qc/tools/make_toy_data.mjs",
  seed: SEED,
  licence: "CC0 1.0",
  conventions: {
    snp_ids: "tsnp + 5 digits, numbered in genome order over all study and reference SNPs; not dbSNP rsIDs",
    study_sample_ids: "FID = a unique number from " + CONFIG.study.firstFid + " written in literal double quotes, IID = 1 (the PennCATH convention); PAT = MAT = 0 for everyone, relatives included",
    reference_sample_ids: "TG + 5 digits; FID = IID = the panel's sample value; they are not 1000 Genomes IDs",
    positions: "GRCh37-like base-pair positions on chromosomes 1-22; the cM column is 0",
    alleles: "ref/alt are forward-strand (GRCh37 + strand) alleles, as in toy_1kg.bim; toy.bim reports the SNPs listed in features.f_reference_merge.study_reverse_strand_count on the reverse strand (complemented alleles)",
    genotypes_in_files: "A1 is the minor allele of each file (as PLINK writes it); the .bed counts A1 alleles",
    keys: "people are keyed by the exact FID and IID strings of toy.fam (quotes included); SNPs by their toy.bim ID"
  },
  params: CONFIG,
  population_model: {
    tree: TREE.map(([code, parent, F, mix]) => Object.assign({ code, parent, F, name: TREE_NAMES[code] || code + " (1000 Genomes population code)" }, mix ? { mixed_in_after_drift: mix } : {})),
    admixed_populations: ADMIXED_POPS,
    li_stephens_mean_switch_distance_kb: SWITCH_MEAN_KB,
    long_range_region_inverted_clade_frequency: Object.fromEntries(Object.entries(longRangeSeg.inversionFreq).map(([k, v]) => [k, r4(v)])),
    fst_hudson_study_snps: {
      "AFR-EUR": r4(fstHudson("AFR", "EUR", STUDY_SNPS)), "EAS-EUR": r4(fstHudson("EAS", "EUR", STUDY_SNPS)), "EUR-SAS": r4(fstHudson("EUR", "SAS", STUDY_SNPS)),
      "AFR-EAS": r4(fstHudson("AFR", "EAS", STUDY_SNPS)), "AFR-SAS": r4(fstHudson("AFR", "SAS", STUDY_SNPS)), "EAS-SAS": r4(fstHudson("EAS", "SAS", STUDY_SNPS)),
      "CEU-TSI": r4(fstHudson("CEU", "TSI", STUDY_SNPS))
    }
  },
  study: {
    files: "toy.bed, toy.bim, toy.fam",
    n: rows.length, m: STUDY_SNPS.length,
    counts: {
      males: rows.filter(r => r.sex === 1).length, females: rows.filter(r => r.sex === 2).length,
      cases: rows.filter(r => r.phen === 2).length, controls: rows.filter(r => r.phen === 1).length, missing_phenotype: rows.filter(r => r.phen === -9).length,
      by_population: rows.reduce((o, r) => { const p = popLabel(r).population; o[p] = (o[p] || 0) + 1; return o; }, {}),
      by_super_population: rows.reduce((o, r) => { const p = popLabel(r).super_pop; o[p] = (o[p] || 0) + 1; return o; }, {})
    },
    samples: truthSamples
  },
  reference: {
    files: "toy_1kg.bed, toy_1kg.bim, toy_1kg.fam, integrated_call_samples_v3.20130502.ALL.panel",
    n: panelPeople.length, m: REF_SNPS.length,
    samples: panelPeople.map(p => ({ sample: p.sample, pop: p.pop, super_pop: p.superPop, gender: p.gender, ancestry: roundAnc(p.person.ancestry) }))
  },
  features: {
    a_variant_missingness: {
      planted_snps: STUDY_SNPS.filter(j => HIGH_MISS[j]).map(j => ({ id: ID[j], target_rate_normal_samples: r4(HIGH_MISS_TARGET[j]), raw_f_miss: r6(snpMissing[j] / rows.length) })),
      other_snps_failing_geno: STUDY_SNPS.filter(j => GENO_FAIL[j] && !HIGH_MISS[j]).map(j => ({ id: ID[j], raw_f_miss: r6(snpMissing[j] / rows.length) })),
      geno_0_01_removes: STUDY_SNPS.filter(j => GENO_FAIL[j]).length,
      intended: "--geno 0.01 on toy removes every planted SNP (call rate below 99%) plus a few ordinary SNPs whose sporadic missing calls happen to exceed 1% (2.5 of 250 people, so 3 or more missing calls)"
    },
    b_sample_missingness: {
      degraded: studyRowsOf("degraded").map(idOf),
      low_quality: studyRowsOf("low_quality").map(idOf),
      mind_after_geno_removes: rows.filter((r, i) => rowMissingAfterGeno[i] / nAfterGeno > 0.01).map(idOf),
      mind_on_raw_data_would_remove: rows.filter((r, i) => rowMissing[i] / STUDY_SNPS.length > 0.01).map(idOf),
      intended: "after --geno 0.01, --mind 0.01 removes exactly the degraded samples; --mind 0.01 on the raw data would also remove the low-quality samples (and any ordinary person just above 1%), whose missing calls sit mostly in the SNPs that --geno removes. This is why the practical filters SNPs first."
    },
    c_hardy_weinberg: {
      heterozygote_deficit: STUDY_SNPS.filter(j => HWE_ARTIFACT[j] === 1).map(j => ({ id: ID[j], mechanism: "clustering error: a share of true heterozygotes is called as the common homozygote", het_miscall_share: HWE_STRENGTH[j] })),
      heterozygote_excess: STUDY_SNPS.filter(j => HWE_ARTIFACT[j] === 2).map(j => ({ id: ID[j], mechanism: "the probe also binds a second genomic location fixed for the minor allele, so most common-allele homozygotes are called heterozygous", hom_to_het_share: HWE_STRENGTH[j] })),
      causal_snp: ID[causal.j],
      stratification_examples: labHardy.all_rows_p_below_1e_8_other_snps,
      intended: "the six artifact SNPs have UNAFF exact-test p < 1e-8 (also in the ALL and AFF rows); the causal SNP departs from HWE in the AFF rows (heterozygote deficit among cases) but not in the UNAFF rows; no other SNP reaches UNAFF p < 1e-8. The SNPs in stratification_examples (not planted) reach p < 1e-8 in the ALL rows only: their allele frequencies differ strongly between the European-like majority and the other ancestries, and pooling populations gives a heterozygote deficit (Wahlund effect). Exact p-values from the lab emulator: lab_view.hardy"
    },
    causal_snp: {
      id: ID[causal.j], chr: CHR[causal.j], bp: BP[causal.j], forward_strand_risk_allele: riskAllele,
      study_strand_risk_allele: STUDY_FLIP[causal.j] ? COMP[riskAllele] : riskAllele,
      risk_allele_frequency_model: { EUR: r4(causal.riskDerived ? popFreq("EUR", causal.j) : 1 - popFreq("EUR", causal.j)), AFR: r4(causal.riskDerived ? popFreq("AFR", causal.j) : 1 - popFreq("AFR", causal.j)), EAS: r4(causal.riskDerived ? popFreq("EAS", causal.j) : 1 - popFreq("EAS", causal.j)), SAS: r4(causal.riskDerived ? popFreq("SAS", causal.j) : 1 - popFreq("SAS", causal.j)) },
      model: "penetrance (risk of CAD) by number of risk alleles: " + PEN.join(", ") + " (nearly recessive, genotype relative risk 20 for two copies); cases are drawn in proportion to penetrance and controls in proportion to 1 - penetrance; deliberately exaggerated so that " + rows.filter(r => r.phen === 2).length + " cases show the effect (real CAD variants have odds ratios of about 1.1-1.3 per allele)",
      block_snps: causalSeg.snps.filter(j => !REF_ONLY[j]).map(j => ID[j]),
      block_redraws: causalSeg.redraws || 0
    },
    d_relatedness: {
      pairs,
      note: "realized = shares of study SNPs where the two people carry 0, 1 or 2 haplotypes inherited from the same founder haplotype (simulated meiosis with Poisson crossovers)",
      unrelated_pairs: "counts of unplanted pairs above PI_HAT 0.1875 and 0.1, by the groups of the two people, are in lab_view.genome.unrelated_pairs_above",
      intended: "--genome on the LD-pruned QC'd data shows the duplicate (PI_HAT near 1), the parent-offspring pair (Z1 near 1), the full siblings (Z0, Z1, Z2 near 0.25, 0.5, 0.25) and the half siblings (Z0, Z1 near 0.5, PI_HAT near 0.25, above every unplanted pair that does not involve the contaminated sample). The contaminated sample has PI_HAT of about 0.17 with everyone (up to about 0.27), so it makes up the unplanted pairs above 0.1875: a DNA mixture has extra heterozygous calls and therefore almost never shows opposite homozygotes (IBS0) with anyone, which the method-of-moments estimator reads as shared ancestry. One person related to everybody points to contamination, which --het confirms. Other unplanted pairs reach PI_HAT of about 0.15-0.19 through estimation noise with about 2,500 pruned SNPs (most pairs above 0.1 are such noise), which is why no pair more distant than half siblings was planted"
    },
    e_heterozygosity: {
      contaminated: idOf(rows.find(r => r.role === "contaminated")),
      inbred: idOf(inbredRow), inbred_realized_autozygosity: r4(autozygosity(inbredRow.person, STUDY_SNPS)),
      contamination_model: "DNA mixture: B-allele signal b = (1 - alpha) g1/2 + alpha g2/2 + noise (alpha " + CONFIG.contamination.alpha + ", noise SD " + CONFIG.contamination.intensityNoiseSd + "); called heterozygous when " + CONFIG.contamination.hetCallRange[0] + " < b < " + CONFIG.contamination.hetCallRange[1] + "; a call at a site where the two genotypes differ is missing with probability " + CONFIG.contamination.noCallAtMixedSites,
      ancestry_effect: "F in --het compares each person's homozygosity with what the allele frequencies of the whole, mostly European-like sample predict. Admixed people have negative F: their two haplotypes come partly from different populations, so they are heterozygous more often than European frequencies predict. East-Asian-like people have positive F: drift since the out-of-Africa split left them less heterozygous at these SNPs. African-like and South-Asian-like people have F near 0 (African-like people are more diverse overall, but the SNPs were chosen to be common in Europeans). Values by group: lab_view.het.F_by_group",
      intended: "both rules flag the contaminated sample (F far below -0.1; heterozygosity rate far above the mean + 3 SD; its raw missingness is also raised, but stays below 1%) and the inbred person (F near 0.25; rate far below the mean - 3 SD). The two rules nearly coincide: 3 SD of the heterozygosity rate is about 0.04-0.045, which is about 0.12 in F units, so they differ only for people with |F| between 0.1 and about 0.12, such as admixed people with large African-like shares and ordinary people who pass |F| = 0.1 by chance with about 2,500 pruned SNPs. The contamination also lowers the sample's IBS0 with everyone, which raises its PI_HAT in --genome (see d_relatedness). Exact lists from the lab emulator: lab_view.het"
    },
    f_reference_merge: {
      shared_snps: shared.length, reference_only_snps: STUDY_SNPS.length ? REF_SNPS.filter(j => REF_ONLY[j]).map(j => ID[j]) : [],
      study_only_snps: STUDY_SNPS.length - shared.length,
      study_reverse_strand_count: STUDY_SNPS.filter(j => STUDY_FLIP[j]).length,
      study_reverse_strand_snps_note: "for these SNPs toy.bim lists the complement of the forward-strand alleles; only the shared ones matter for --bmerge",
      flip_needed_shared_nonpalindromic: flipNeeded.map(j => ID[j]),
      expected_missnp: expectedMissnp.map(j => ID[j]),
      palindromic_shared_strand_swapped: palSwapped.map(j => ({ id: ID[j], forward_alleles: REF[j] + "/" + ALT[j], study_alleles: studyAlleles(j).join("/"), eur_alt_freq_model: r4(altFreq("EUR", j)) })),
      palindromic_shared_same_strand: palOk.map(j => ID[j]),
      intended: "--bmerge of the QC'd study with toy_1kg fails with 'variants with 3+ alleles present' and writes <out>-merge.missnp listing expected_missnp; after --flip with that list the merge succeeds; the strand-swapped A/T and C/G SNPs merge silently with their alleles exchanged (their study allele frequencies mirror the reference's); after the merge, --geno 0.1 drops every SNP that is in only one fileset"
    },
    g_ancestry: {
      intended: "GrafAnc (lab emulator) assigns the European-like people to EUR, African-like to AFR, East-Asian-like to EAS and South-Asian-like to SAS; South-Asian-like people lie between the EUR and EAS vertices (their ASI ancestry); admixed people lie between EUR and AFR in GD1/GD2, at positions that follow their African-like share, so their group depends on that share. In the merged PCA with toy_1kg, the admixed people lie between the EUR and AFR clusters and the South-Asian-like people between EUR and EAS in the same way",
      study_by_super_population: rows.reduce((o, r) => { const p = popLabel(r).super_pop; o[p] = (o[p] || 0) + 1; return o; }, {})
    },
    long_range_ld_region: {
      chr: longRangeSeg.chr, start: longRangeSeg.start, end: longRangeSeg.end,
      model: "two haplotype clades (standard and inverted orientation, as at the 8p23.1 inversion) with no recombination between clades; " + tagIds.length + " SNPs tag the clade, the rest vary within one clade",
      snps: longRangeSeg.snps.map(j => ID[j]), clade_tag_snps: tagIds.map(j => ID[j]),
      in_reference: longRangeSeg.snps.filter(j => IN_REF[j]).map(j => ID[j]),
      inverted_clade_copies_by_row: invertedCopies(),
      intended: "in an unpruned study PCA (--maf 0.05 --pca without --extract) one of the top PCs sorts people by the number of inverted copies (0, 1, 2); after LD pruning only a few region SNPs remain, and the region no longer drives any of the top PCs (at most a weak echo on a late PC)"
    }
  },
  lab_view: {
    about: "Steps 1-5 of the practical run on toy.* inside the generator by the lab's PLINK emulator (assets/js/lab/plink-core.js): --geno 0.01, then --mind 0.01, --hardy, --indep-pairwise 50 5 0.3, and --genome and --het with --extract of the pruned SNPs. These are the numbers the in-browser lab shows; real PLINK 1.9.0 gives the same (tools/real_plink_check.mjs). Regenerate the data if plink-core.js changes.",
    after_qc: { people: LAB.qcPeople, snps: LAB.qcSnps },
    prune: { prune_in: LAB.pruneIn, prune_out: LAB.pruneOut, removed_share: r4(LAB.pruneOut / LAB.qcSnps) },
    hardy: labHardy,
    genome: labGenome,
    het: labHet
  }
};
function invertedCopies() {             // per study row: haplotypes carrying most clade-tag alleles
  return rows.map(r => {
    const [a, b] = allelesOf(r.person); let sa = 0, sb = 0;
    for (const j of tagIds) { sa += a[j]; sb += b[j]; }
    return (sa > tagIds.length / 2 ? 1 : 0) + (sb > tagIds.length / 2 ? 1 : 0);
  });
}

/* ============================================================================================
   12. Write the files
   ============================================================================================ */
function compactJson(value, indent = "") {   // objects indented, arrays of scalars on one line
  const next = indent + " ";
  if (Array.isArray(value)) {
    if (value.every(v => v === null || typeof v !== "object")) return "[" + value.map(v => JSON.stringify(v)).join(", ") + "]";
    return "[\n" + value.map(v => next + compactJson(v, next)).join(",\n") + "\n" + indent + "]";
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    if (!keys.length) return "{}";
    if (keys.every(k => value[k] === null || typeof value[k] !== "object") && keys.length <= 8) return "{" + keys.map(k => JSON.stringify(k) + ": " + JSON.stringify(value[k])).join(", ") + "}";
    return "{\n" + keys.map(k => next + JSON.stringify(k) + ": " + compactJson(value[k], next)).join(",\n") + "\n" + indent + "}";
  }
  return JSON.stringify(value);
}
fs.mkdirSync(OUT_DIR, { recursive: true });
const files = {};
function writeOut(name, data) { const p = path.join(OUT_DIR, name); fs.writeFileSync(p, data); files[name] = { bytes: fs.statSync(p).size }; }
writeOut("toy.bed", Buffer.from(studyFiles.bed)); writeOut("toy.bim", studyFiles.bim); writeOut("toy.fam", studyFiles.fam);
writeOut("toy_1kg.bed", Buffer.from(refFiles.bed)); writeOut("toy_1kg.bim", refFiles.bim); writeOut("toy_1kg.fam", refFiles.fam);
const panelText = "sample\tpop\tsuper_pop\tgender\n" + panelPeople.map(p => [p.sample, p.pop, p.superPop, p.gender].join("\t")).join("\n") + "\n";
writeOut("integrated_call_samples_v3.20130502.ALL.panel", panelText);

const freqPops = ["EUR", "AFR", "EAS", "SAS", "AMR"].concat(PANEL.map(p => p[0]));
function grafFreq(pop, j) {
  if (pop === "AMR") return (altFreq("MXL", j) + altFreq("PUR", j) + altFreq("CLM", j)) / 3;
  return altFreq(pop, j);
}
const grafRef = {
  schema: "lecture1-toy-grafanc-ref/1",
  about: "Model allele frequencies of the toy simulation for every SNP of toy.bim, for the GrafAnc emulator. freq[POP][k] is the frequency of snps[k].alt in population POP.",
  alleles: "ref and alt are forward-strand (GRCh37 +) alleles as in toy_1kg.bim, before the study's deliberate strand flips; toy.bim lists some SNPs on the reverse strand (complemented alleles).",
  populations: "EUR, AFR, EAS and SAS are the continental nodes of the simulated population tree; AMR is the mean of MXL, PUR and CLM; the others are the simulated 1000 Genomes populations of the toy panel (ASW, MXL, PUR and CLM are admixed: source frequencies weighted by their mean ancestry shares).",
  generator: "1-introduction-gwas-qc/tools/make_toy_data.mjs", seed: SEED,
  snps: STUDY_SNPS.map(j => ({ id: ID[j], chr: CHR[j], bp: BP[j], ref: REF[j], alt: ALT[j] })),
  freq: Object.fromEntries(freqPops.map(p => [p, STUDY_SNPS.map(j => r4(grafFreq(p, j)))]))
};
writeOut("grafanc_ref.json", "{\n" + Object.keys(grafRef).map(k => {
  if (k === "snps") return " \"snps\": [\n" + grafRef.snps.map(s => "  " + JSON.stringify(s)).join(",\n") + "\n ]";
  if (k === "freq") return " \"freq\": {\n" + Object.keys(grafRef.freq).map(p => "  " + JSON.stringify(p) + ": " + JSON.stringify(grafRef.freq[p])).join(",\n") + "\n }";
  return " " + JSON.stringify(k) + ": " + JSON.stringify(grafRef[k]);
}).join(",\n") + "\n}\n");
truth.files = Object.assign({}, files);
writeOut("truth.json", compactJson(truth) + "\n");

if (JS_OUT) {
  const entries = [
    ["data/inputs/penncath_withPheno/toy.bed", { b64: Buffer.from(studyFiles.bed).toString("base64") }],
    ["data/inputs/penncath_withPheno/toy.bim", { text: studyFiles.bim }],
    ["data/inputs/penncath_withPheno/toy.fam", { text: studyFiles.fam }],
    ["data/inputs/ref/toy_1kg.bed", { b64: Buffer.from(refFiles.bed).toString("base64") }],
    ["data/inputs/ref/toy_1kg.bim", { text: refFiles.bim }],
    ["data/inputs/ref/toy_1kg.fam", { text: refFiles.fam }],
    ["_panel/integrated_call_samples_v3.20130502.ALL.panel", { text: panelText }]
  ];
  const js = "/* toy-data.js: GENERATED by 1-introduction-gwas-qc/tools/make_toy_data.mjs (seed " + SEED + "); do not edit.\n" +
    "   The Lecture 1 toy study (toy.*) and toy reference panel (toy_1kg.*) as PLINK 1 binary files for the\n" +
    "   in-browser lab, plus the panel file for the 'git clone akt' stub. window.TOY_FILES maps a path relative\n" +
    "   to /home/student/statgen-workshop to {b64: base64 bytes} or {text: file text}; paths starting with \"_\"\n" +
    "   are stub material, not placed in the file system at start. The same files are in data/ (data card:\n" +
    "   data/README.md). Simulated data, CC0 1.0. */\n" +
    "var TOY_FILES = {\n" + entries.map(([k, v]) => "  " + JSON.stringify(k) + ": " + JSON.stringify(v)).join(",\n") + "\n};\n" +
    "if (typeof window !== \"undefined\") window.TOY_FILES = TOY_FILES;\n" +
    "if (typeof module !== \"undefined\") module.exports = TOY_FILES;\n";
  fs.mkdirSync(path.dirname(JS_OUT), { recursive: true });
  fs.writeFileSync(JS_OUT, js);
  files["toy-data.js"] = { bytes: fs.statSync(JS_OUT).size };
}
say("toy study: " + study.n + " people x " + study.m + " SNPs; reference: " + reference.n + " people x " + reference.m + " SNPs (seed " + SEED + ")");
say("files in " + OUT_DIR + ": " + Object.entries(files).map(([k, v]) => k + " " + v.bytes).join(", "));
