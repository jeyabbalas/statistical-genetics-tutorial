# The PLINK and GrafAnc emulators, the toy files and the data card

This file documents the code behind the lab's `plink` and `grafanc` commands and the numbers that pages
quote about the toy data. [LAB.md](LAB.md) documents the terminal, the shell and the `Lab` API that
pages use; page authors normally need only the [data card](#the-data-card).

Contents: [Files](#files) · [Regenerating](#regenerating) · [What has been checked](#what-has-been-checked) ·
[PlinkCore](#plinkcore-plink-corejs) · [GrafAncCore](#grafanccore-grafanc-corejs) ·
[Toy files](#the-toy-files-toy-datajs) · [Data card](#the-data-card) · [Tests](#tests)

## Files

| File | Contents | Made by |
|---|---|---|
| `plink-core.js` | `window.PlinkCore`: an emulator of the PLINK 1.9 command line | written by hand |
| `grafanc-core.js` | `window.GrafAncCore`: an emulator of GrafAnc 1.0.0; its reference sits between `/*GRAFANC-REF-BEGIN*/` and `/*GRAFANC-REF-END*/` | written by hand; the reference part comes from `tools/make_data_card.mjs` |
| `data-card.js` | `window.TOY_CARD` (named numbers) and `window.TOY_PEOPLE` (each toy person's simulated group and planted cause) | `tools/make_data_card.mjs`; never edit by hand |
| `toy-data.js` | `window.TOY_FILES`: the toy PLINK files for the lab's file system | `tools/make_toy_data.mjs` |
| `../../../tools/make_data_card.mjs` | runs the practical's commands on `data/` with the two emulators; writes `data-card.js` and the GrafAnc reference | |
| `../../../tools/test_lab.mjs` | the Node tests of all of the above | |

All four scripts are plain deferred scripts (no modules, no network, no libraries). Each sets its
`window` global in a page and `module.exports` in Node, and works from `file://`. LAB.md gives their
load order.

## Regenerating

From the repository root, whenever `tools/make_toy_data.mjs` has rewritten `data/` or an emulator has
changed:

```bash
node 1-introduction-gwas-qc/tools/make_data_card.mjs           # writes data-card.js and the reference in grafanc-core.js
node 1-introduction-gwas-qc/tools/test_lab.mjs                 # all tests (a few seconds); exits 1 on a failure
node 1-introduction-gwas-qc/tools/make_data_card.mjs --check   # writes nothing; exits 1 if either file is out of date
```

`make_data_card.mjs --data DIR --no-write` prints the card for another data folder, and
`test_lab.mjs --data DIR` runs the data tests on it (useful while the data are being changed). If the
card gains keys, add them to the "TOY_CARD keys" table in `data/README.md`; `test_lab.mjs` reports keys
that the table lacks.

## What has been checked

Both emulators follow the programs' source code: PLINK 1.9 (`chrchang/plink-ng`, the 1.9 tree) and
GrafAnc 1.0.0 of 05/18/2025 (`jimmy-penn/grafanc`). Both were then checked against the real programs on
macOS (arm64) in November 2026.

- PLINK, toy data: real PLINK 1.9.0 (27 Sep 2026). The practical's 21 PLINK commands (with the extra
  pruning settings, the unpruned PCA, `--freq` and the exercise's final command) give the same exit codes,
  byte-identical output files and the same `.log` files, apart from the lines that name the program,
  computer, folder, times, random seed, memory and threads. The console text also matches, apart from
  those lines and from line wrapping where paths differ in length. Every terminal on the nine practical
  pages, typed into the lab's shell and into bash with real PLINK and macOS awk, writes the same 180 files.
  `tools/real_plink_check.mjs` repeats the comparison of the practical (it needs real PLINK; `--write`
  records `tools/real-plink-1.9.0.json`), and `test_lab.mjs` section J checks the emulator against that
  record. The comparison led to three fixes: the diagonal of the relationship matrix (1 + Fhat1, PLINK's
  default; it had been Fhat3), the condition for the "Monomorphic variant(s) present" warning, and the
  eigenvector signs (both below).
- PLINK, PennCATH: the practical run with real PLINK 1.9.0 (`scripts/qc_pipeline.sh`) gives the PennCATH
  counts that the pages quote.
- GrafAnc: built from the source the workshop uses (commit b5e51c7 with the workshop's output patch; on
  macOS, `GetAvailableMemoryInMb` and `GetExecutablePath` replaced). Given GrafAnc's own reference
  (`setReference`: 282,424 SNPs, 26 populations, the first three renamed EUR, AFR and EAS), the emulator
  gives the same SNP counts, GD1-GD3, Pe, Pf, Pa and RawPe, RawPf, RawPa as the real program for all 1,380
  PennCATH people after QC. That needed one fix: the emulator had clamped reference frequencies to
  [0.001, 0.999] at run time, which GrafAnc does not do. Its usage text and console layout, including the
  duplicate-ID warning, match the real program's. Real GrafAnc cannot run on the toy data: it finds 1
  ancestry SNP and stops ("Ancestry inference not done due to lack of genotyped ancestry SNPs"), so the
  toy GrafAnc numbers in `data-card.js` are the emulator's.

`test_lab.mjs` checks the statistics against independent computations:

- exact enumeration for the Hardy-Weinberg test, plus the worked example of Wigginton et al. 2005
- simulated relatives for `--genome`
- three eigensolvers for `--pca`
- exact decimal rounding for GrafAnc's `%f` output
- the toy data's planted features

## PlinkCore (`plink-core.js`)

### `PlinkCore.run(argv, io)` → `{code, outputs}`

`argv` holds the arguments after `plink`, as strings. `code` is PLINK's exit code:

| Code | Meaning |
|---|---|
| 0 | success |
| 2 | a file could not be opened |
| 3 | invalid input, including `--bmerge`'s "variants with 3+ alleles present" |
| 4 | a real PLINK 1.9 flag that the lab does not support |
| 5 | invalid command line |
| 10 | no output requested |

`outputs` lists the paths written, as the command gave them.

| `io` member | Required | Use |
|---|---|---|
| `read(path)` | yes | file contents as a string or `Uint8Array`, or `null` if there is no such file; `.bed` files are read as bytes |
| `write(path, data)` | yes | `data` is a string, or a `Uint8Array` for `.bed`; returning `false` or throwing means failure (`Error: Failed to open …`, exit 2) |
| `exists(path)` | yes | |
| `print(line, stream)` | yes | one console line without its newline; `stream` is `"stderr"` for the `Error:` and `Warning:` lines (PLINK's `logerrprint()`), absent otherwise |
| `remove(path)` | no | deletes the leftover `<out>-merge.*` files after a `--bmerge … --make-bed` run, as PLINK does |
| `cwd` | no | a string or a function; the working directory written in the log (default `/home/student/statgen-workshop`) |
| `now()` | no | milliseconds since 1970, for the log's start and end times (default `Date.now()`) |

The `io` resolves relative paths; the emulator passes them on unchanged.

### Other members

- `version`: `"PLINK v1.9.0-toy 64-bit (lab emulator)"`.
- `readBfile(bed, bim, fam)` → a Dataset. It throws an `Error` with PLINK's message when the input is
  bad.
- `writeBfile(ds)` → `{bed: Uint8Array, bim: string, fam: string}`. The `.fam` is space-separated.
- A Dataset is `{samples, snps, n, m, geno, phenoType}`:
  - `samples`: `{fid, iid, pat, mat, sex, phen}`, with `sex` 0, 1 or 2 and `phen` −9 when missing.
  - `snps`: `{chr, id, cm, bp, a1, a2}`, with `chr` 1–26 (X = 23, Y = 24, XY = 25, MT = 26).
  - `geno`: an `Int8Array`, SNP-major: `geno[j*n + i]` is person `i`'s count of `snps[j].a1`, or −1
    when missing.
  - `phenoType`: `"cc"` or `"qt"`.
- `format`: PLINK's number formatting, `g4`, `g6`, `f7p4`, `f9p6`, `cG`, `wordwrap` and `natCompare`.
- `constants`: `SMALL_EPSILON`, `EPSILON` and `RET`, the exit codes.

`stats` holds the statistics as pure functions on Datasets. The commands use them, and widgets and
tests may call them:

| Function | Returns |
|---|---|
| `hweExact(hets, hom1, hom2, midp)` | the exact HWE p-value (mid-p if `midp`), with PLINK 1.9's ties and its 2^-83 scaling |
| `founderMask(ds)` | `Uint8Array`, 1 for people with no parents in the file |
| `genoCounts(ds, j, mask)` | `[homA1, het, homA2, missing]` at SNP `j` |
| `alleleFreq(ds, {mask, nonfounders})` | `{a2: Float64Array, nobs: Int32Array}`: the frequency of `a2` (0.5 when nothing is observed) |
| `missingCounts(ds)` | `{snp: Int32Array, sample: Int32Array}` |
| `hardyStats(counts, midp)` | `{counts, oHet, eHet, p}` for one group |
| `hardy(ds, {nonfounders, midp})` | rows `{snp, test, counts, oHet, eHet, p}` (ALL, AFF and UNAFF, or ALL(NP) or ALL(QT)) |
| `r2(ds, j, k, mask)` | r² of allele counts over people observed at both SNPs |
| `indepPairwise(ds, {window, step, r2, kb, mask, nonfounders, freqA2})` | `{pruned: Uint8Array, perChrom}` |
| `genome(ds, {mask, nonfounders, freqA2, unbounded, nudge, min, max, pairs})` | `{pairs, expected, markers}`; each pair is `{i, k, z0, z1, z2, pihat, ibs0, ibs1, ibs2, hethet, homhom, nn, ppc, dst, ratio}` |
| `het(ds, {mask, freqA2, smallSample})` | `{rows: [{i, ohom, ehom, nnm, f}], markers}` |
| `grm(ds, {mask, freqA2})` | `{n, matrix (row-major Float64Array), monomorphic, allMissing, markers}`: the relationship matrix behind `--pca`; `monomorphic` is also true when the SNP count is not a multiple of 20 |
| `eigenSym(A, n)` | `{values, vectors}`: all eigenpairs, by Householder reduction and QL iteration |
| `eigenTop(A, n, k)` | `{values (all), vectors (top k)}`, by bisection and inverse iteration |
| `pca(ds, {count})` | `{eigenvalues, eigenvectors, grm}` |
| `normdist(z)` | PLINK's normal CDF (used for PPC) |
| `subsetDataset(ds, sampleIdx, snpIdx)` | a new Dataset |

### Flags

- Commands:
  - `--make-bed`, `--freq`, `--missing`, `--hardy [midp]`
  - `--indep-pairwise W[kb] S r2`
  - `--genome [full] [unbounded] [nudge] [rel-check]`, with `--min`/`--max`
  - `--het [small-sample]`
  - `--pca [count] [header] [tabs]`
  - `--bmerge` (one prefix or three files)
  - `--write-snplist`
- Filters: `--geno`, `--mind`, `--maf`, `--max-maf`, `--hwe p [midp] [include-nonctrl]`,
  `--extract`, `--exclude`, `--keep`, `--remove`.
- Changes: `--flip`, `--update-ids`.
- Other: `--bfile`, `--out`, `--allow-no-sex`, `--keep-allele-order`, `--nonfounders`,
  `--allow-extra-chr` (no effect), `--silent`, `--seed`, `--threads`, `--memory`, `--version`,
  `--help [flags]`.

The order of operations and the choice of samples follow PLINK 1.9:

- `--freq` and `--missing` report before `--geno`, `--hwe` and `--maf` filter.
- `--mind` comes before `--geno`.
- Allele frequencies and HWE use founders only.
- A1 becomes the minor allele unless `--keep-allele-order`.

Other flags are rejected:

- Any other real PLINK 1.9 flag gets "is part of real PLINK 1.9 but not of this lab emulator" (exit 4).
- A PLINK 2 flag such as `--pfile` gets "(This is PLINK 1.9, not 2.x.)".
- Anything else is an unrecognized flag, as in PLINK.

### Known differences from PLINK 1.9

- The emulator supports only the commands above, which the practical needs. The `gz` modifiers,
  `--freq counts`/`case-control` and `--pca var-wts` are refused.
- Input must be a binary fileset with a variant-major `.bed`. There is no `--file`, `--vcf` or
  `--bcf`.
- `--bmerge` merges two binary filesets in the default mode only. `--merge-list` and `--merge-mode`
  are not available.
- The machine is fixed:
  - "16384 MB RAM detected; reserving 8192 MB for main workspace."
  - up to 8 threads
  - host name `statgen-lab`
- Sex chromosomes are read (codes 23–26), but haploid handling is not emulated. For example, there
  are no heterozygous-haploid warnings and no X-specific HWE. `--genome`, `--het` and `--pca` use
  autosomes, as PLINK does. The toy data are autosomal.
- `--pca` uses its own eigensolver, written to follow what PLINK's LAPACK call (`dsyevr`, jobz 'V',
  range 'I', uplo 'U') does for a subset of eigenvalues: Householder reduction to tridiagonal form as
  `dsytrd` does it with uplo 'U', bisection and inverse iteration, `dstein`'s sign rule (the largest entry
  of each tridiagonal eigenvector positive, the first on a tie), then the back-transformation. The
  eigenvalues and eigenvectors, signs included, therefore match real PLINK's up to rounding in the last
  digits (the files are identical on the toy data); `test_lab.mjs` section C compares with `dsyevr`.
- `--pca` prints "Warning: Monomorphic variant(s) present; ..." when a SNP is monomorphic or when the
  number of autosomal SNPs is not a multiple of 20, as real PLINK 1.9.0 does: PLINK fills its last
  window of 20 SNPs with frequency-0 entries, which its monomorphic check counts (`plink_calc.c`). PLINK
  1.9 versions before 23 Sep 2026 do not print the warning.

## GrafAncCore (`grafanc-core.js`)

### `GrafAncCore.run(argv, io, env)` → `{code: 0, outputs}`

`argv` holds the arguments after the program path: the input PLINK prefix (or one of its
`.bed/.bim/.fam` paths), the output file, then options (`--threads N`, `--maxmem MB`,
`--samples N`). `env` holds the exported shell variables; only `GRAFPATH` is used.

`io` is as for PlinkCore, plus these members:

- `argv0`: the program path as typed (for example `/home/student/statgen-workshop/analysis/grafanc/bin/grafanc`
  or `grafanc/bin/grafanc`), used to find the reference as GrafAnc does.
- `nowMicros()` or `now()`, optional: used for "Time used".

The exit code is always 0 (see below). Console output goes to stdout, except the option-parsing
(getopt) messages, which go to stderr.

GrafAnc looks for `AncSnpPopAFs.txt` in this order:

1. the current folder
2. `<program folder>/data/`
3. `<program folder>/`
4. `<program folder>/../cpp/data/`
5. `<program folder>/cpp/data/`
6. `$GRAFPATH/data/`
7. `$GRAFPATH/`

Only the file's presence matters (the lab's copy is a stub): the frequencies are embedded in
`grafanc-core.js`.

### Other members

- `version`: `"GrafAnc 1.0.0 (05/18/2025), lab emulator"`.
- `setReference(data)` replaces the embedded reference (tests use it); `reference()` →
  `{snps, populations, groups, vertexDistances}`.
- `stats.scores(ds, R?)` → `{match, results, table}`.
  - Each result is `{name, snps, het, dists, set, gd1, gd2, gd3, pe, pf, pa, rawPe, rawPf, rawPa,
    weights, group}`.
  - `table` is the text of the output file.
- `stats.matchSnps(snps, R?)` → `{numBimSnps, numBimAncSnps, numGoodAncSnps, numDupAncSnps, numSwaps,
  mode, ancIds, matches}`.
  - `mode` is 0 for RS IDs, 1 for GRCh37 and 2 for GRCh38.
  - Each entry of `matches` is 1 (same alleles), 2 (swapped), −1 (other strand) or −2 (other strand,
    swapped).
- `stats.transform(eDist, fDist, aDist, sDist)` → `{E, F, A, S, eWt, fWt, aWt}`: GrafAnc's rotation
  of the three vertex populations and a sample. Each argument is `{e, f, a}`, the genetic distances
  to the European, African and East Asian reference populations.
- `stats.vertices(R?)` → `{E, F, A}`: the triangle in GD1/GD2/GD3 coordinates.
- `stats.continentOf(groupId)` → `"AFR"`, `"MEN"`, `"EUR"`, `"SAS"`, `"EAS"`, `"AMR"`, `"OCN"` or
  `"MIX"`.
- `stats.prepareReference(data)`.
- `format.fixed(x, w, d)` is C's `printf("%w.df")` with glibc's round-half-to-even. Also `format.header`
  and `format.resultLine(result)`.
- `constants`: `MIN_ANC_SNPS` (100), `SCORE_NAMES`, `CONTINENT_CODES` and `AFR_POSITION` (1.08,
  1.10, 0).

The reference format is `"grafanc-lab-ref-1"`. The comment above `EMBEDDED_REF` in the source
describes it.

### What follows GrafAnc 1.0.0

- Messages: the console messages, warnings and errors, including the duplicate-sample warning, the
  `.bed` size warning, the "Available memory" lines and the thread and progress lines.
- SNP matching: by RS ID, GRCh37 or GRCh38 position, whichever finds most. Alleles may be the same,
  swapped or on the other strand; multi-character alleles and duplicate entries are counted.
- Scores, with the same precision as the C++:
  - the genetic distances in single precision
  - the vertex populations' expected distances in double precision
  - the rotation with GrafAnc's π of 3.1415926, so the triangle is flat only to about 3·10⁻⁸
  - the barycentric weights
  - Pe, Pf and Pa as the clipped weights, normalised; RawPe, RawPf and RawPa as the raw weights × 100
- The output table: GrafAnc's header, `%7.6f` and `%6.2f` columns, and every sample with at least
  100 genotyped ancestry SNPs, as the workshop's build writes them.
- `--threads` is capped at the machine's 8 CPUs. `--maxmem` has a minimum of 100, and `--samples` is
  rounded down to hundreds.
- "Time used" includes GrafAnc's carry quirk.

### Known differences from GrafAnc 1.0.0

- **Reference.** GrafAnc ships 282,424 ancestry SNPs with allele frequencies of 26 real populations.
  The lab instead uses the toy model's frequencies for every non-palindromic toy study SNP (a few
  thousand). The frequencies are kept within [0.001, 0.999] when `make_data_card.mjs` builds the
  reference; like GrafAnc, the emulator does not clamp frequencies when it runs. The populations are:
  - the three vertex populations (the European, African and East Asian nodes of the simulated
    population tree)
  - the 15 toy 1000 Genomes populations

  "Total N SNPs in …AncSnpPopAFs.txt" reports the toy count.
- **The 15 subcontinental scores** (`EA1`–`EA4`, `AF1`–`AF3`, `EU1`–`EU3`, `SA1`–`SA2`,
  `IC1`–`IC3`) need GrafAnc's real reference populations, so they are written as `NA`.
- **AncGroupID** is continental only: `100` AFR, `300` EUR, `400` SAS, `500` EAS, `600` AMR, or `800`
  for multiple ancestry. GrafAnc's decision tree needs the subcontinental scores and gives finer codes
  such as `303`. The lab keeps the tree's conditions on Pe, Pf and Pa:
  - `800` when Pa > 15 and Pf > 15
  - South Asia only when Pf < 15
  - East Asia only when Pa > 40

  Otherwise a person gets the continental group of the toy reference population (vertex or panel)
  with the smallest genetic distance.
- **Geometry and noise.** The toy populations differ less than real ones, so the toy triangle is
  smaller than GrafAnc's, and GD1/GD2 values are not comparable with real GrafAnc plots. With a few
  thousand SNPs instead of 282,424, Pe, Pf and Pa are noisier.
- **Input.** VCF input is not emulated; the emulator says so.
- **Exit code.** GrafAnc 1.0.0 returns 1 after a successful run and 0 after an error. The workshop's
  Docker build patches success to 0. The lab always returns 0, so a script should test for the output
  file rather than `$?`.
- **Machine.** The memory probe always reports 17100 MB, and the machine has 8 CPUs.

## The toy files (`toy-data.js`)

`window.TOY_FILES` maps a path relative to `/home/student/statgen-workshop` to `{b64: …}` (bytes) or
`{text: …}`. It holds:

- `data/inputs/penncath_withPheno/toy.{bed,bim,fam}`
- `data/inputs/ref/toy_1kg.{bed,bim,fam}`
- `_panel/integrated_call_samples_v3.20130502.ALL.panel`, which the lab's `git clone … akt` stub
  writes to `akt/data/`. Paths that start with `_` are not placed in the file system at the start.

The files are the same as those in `data/`. `tools/make_toy_data.mjs` writes both, and `data/README.md`
describes the simulation. `test_lab.mjs` checks that the two copies are the same.

## The data card

`tools/make_data_card.mjs` runs the practical's commands from `01_qc.Rmd`, with `penncath` replaced
by `toy` and `all_pops_1kgenomes_markersForPCA` by `toy_1kg`. It uses the two emulators, on an
in-memory file system laid out like the lab's:

- `$input_dir`: `data/inputs/penncath_withPheno`
- `$reference_dir`: `data/inputs/ref`
- `$analysis_dir`: `analysis`

The lab's `git clone`, `awk` and `gunzip` stubs are reproduced. A few commands that are not in the
practical also run, with outputs named `toy.geno0.01.mind0.01.extra.*`:

- pruning at other settings
- the PCA without LD pruning

The script recomputes the practical's R summaries from the output files as R's `fread` would read
them:

- counts below thresholds
- the PI_HAT summary (R's `summary()`, type-7 quantiles)
- the heterozygosity outliers
- the GrafAnc group counts

Each count comes from the console output of the step that produced it, or from line counts of its
output files, never from a `.log`. The practical reuses `--out` prefixes, so a later step overwrites an
earlier step's log.

**`window.TOY_CARD`** is a flat object of named values (numbers, or strings for IDs and p-values as
PLINK prints them). Pages write `<span data-card="KEY">?</span>`, and `site.js` fills it in.
`data/README.md` ("TOY_CARD keys") lists every key with its meaning and the command it comes from. The
key families are:

| Topic | Keys |
|---|---|
| Data | `study_*`, `ref_*`, `sim_*` |
| Missingness (step 1) | `raw_genotyping_rate`, `lmiss_*`, `imiss_*`, `geno_*`, `mind_*`, `qc_*` |
| HWE (step 2) | `hwe_*`, including `hwe_planted*` (the planted artifacts), `hwe_all_only_*` (SNPs below 1e-8 in the ALL rows only) and `hwe_stratification_*` (the unplanted ones among those) |
| LD pruning (step 3) | `prune_*`, `prune_in_<settings>`, `prune_input_monomorphic`, `long_range_*` |
| Relatedness (step 4) | `genome_*`, `pihat_*`, `pairs_pihat_gt_*`, `ibd_<relationship>_{fids,pihat,z0,z1,z2}` |
| Heterozygosity (step 5) | `het_*` |
| PCA (step 6) | `pca_*` |
| Merge and reference PCA (step 7) | `merge1_*`, `flip_snps`, `merge2_*`, `merged_*`, `sim_palindromic_swapped` |
| GrafAnc (step 8) | `update_ids_people`, `grafanc_*` |
| Provenance | `plink_version`, `grafanc_version`, `card_source` |

**`window.TOY_PEOPLE`** holds each toy person's simulated group and planted cause, for the reveal
controls of the plots (these are spoilers). It is keyed by the FID of `toy.fam`, quotes included, as
in `'"80001"'`. Each entry is `{group, super, planted, ancestry?, pair?}`:

- `group`: the population code (`CEU`, `GBR`, `TSI`, `YRI`, `LWK`, `CHB`, `JPT`, `CHS`, `GIH`, `PJL`,
  `BEB`) or `ADMIXED`.
- `super`: `EUR`, `AFR`, `EAS`, `SAS` or `ADMIXED`.
- `planted`: the person's role in `truth.json`, or `null`. The roles are `duplicate`, `parent`,
  `offspring`, `full_sibling`, `half_sibling`, `contaminated`, `inbred`, `degraded` and `low_quality`.
- `ancestry`: admixed people only, their proportions, for example `{AFR: 0.58, EUR: 0.42}`.
- `pair`: the FID of the other member of a planted relative pair.

In Node, `require("…/data-card.js")` returns `{TOY_CARD, TOY_PEOPLE}`.

## Tests

`node 1-introduction-gwas-qc/tools/test_lab.mjs` runs ten sections and prints one line per section.
The `--only A,C` option runs some sections, and `--verbose` lists every failure.

| Section | Checks |
|---|---|
| A | `hweExact` against exact enumeration with BigInt: every table with up to 50 people, both p-value and mid-p, and random tables with up to 3,000 people. Also Wigginton et al. (2005) Table 1, the rejection regions in its text, and the `--hardy` rows. |
| B | `--genome` on simulated relatives (duplicate, parent and offspring, full and half siblings, first cousins, unrelated people; 10,000 unlinked SNPs) against their simulated IBD sharing. IBS0, IBS1, IBS2, HETHET and HOMHOM against brute force, and the `.genome` file against `stats.genome`. |
| C | The relationship matrix against its formula (diagonal 1 + Fhat1) and the monomorphic-warning rule. Eigenvalues and eigenvectors from `eigenSym`, `eigenTop` and a Jacobi solver written in the test, `eigenTop` against LAPACK `dsyevr`'s values and signs, orthonormality, Av = λv, reconstruction, repeated eigenvalues, and the `.eigenval` and `.eigenvec` files. |
| D | Every planted feature in `data/truth.json`, recovered by the practical's commands under the practical's thresholds. |
| E | `data-card.js` equals what the commands produce; every `data-card` key a page uses exists; `TOY_PEOPLE` agrees with `truth.json`. |
| F | `readBfile`/`writeBfile` round trips (odd sample counts, missing calls, quantitative phenotypes), `data/` files rewritten byte for byte, `plink --make-bed`, and `toy-data.js` against `data/`. |
| G | GrafAnc geometry, barycentric weights, `%f` formatting against exact decimal rounding, scores of simulated populations and mixtures, the console messages and the output file, error paths. |
| H | Each practical command runs in under 1 s in Node. |
| I | The practical typed into the lab's shell (`lab.js`) writes the same files as section D. |
| J | The practical's exit codes, output files (SHA-256) and normalized logs equal real PLINK 1.9.0's, as recorded in `tools/real-plink-1.9.0.json` by `tools/real_plink_check.mjs --write`. |
