# Lecture 1 toy data: data card

This folder holds the toy dataset of the Lecture 1 lab: a simulated case–control study of coronary
artery disease (CAD) shaped like the PennCATH data of the practical (`toy.*`), a small
1000-Genomes-like reference panel (`toy_1kg.*` and its panel file), and the ground truth of the
simulation (`truth.json`, `grafanc_ref.json`). Every person and every genotype is simulated. No
real person's data are included, and the sample and SNP IDs are deliberately fake.

The files were written by `../tools/make_toy_data.mjs` (seed 20260909). The lab loads the same
bytes from `../assets/js/lab/toy-data.js`.

All results below come from the lab's emulators (`../assets/js/lab/plink-core.js` and
`grafanc-core.js`) or from the simulation itself. **Real PLINK 1.9.0 gives the same results:** run
on these files, the practical's commands write files identical, byte for byte, to the emulator's (see
"Running real PLINK 1.9 on these files"). Real GrafAnc cannot be run on them, so the GrafAnc results
are the emulator's.

## Files

| File | Contents | Bytes |
|---|---|---:|
| `toy.bed`, `toy.bim`, `toy.fam` | the study: 250 people × 3,925 SNPs, PLINK 1 binary fileset | 247,278 / 108,608 / 4,583 |
| `toy_1kg.bed`, `toy_1kg.bim`, `toy_1kg.fam` | the reference panel: 150 people × 1,180 SNPs | 44,843 / 32,660 / 3,750 |
| `integrated_call_samples_v3.20130502.ALL.panel` | population labels of the panel (`sample pop super_pop gender`, tab-separated, same layout as the 1000 Genomes file of that name) | 3,328 |
| `truth.json` | ground truth: every person, every planted problem, and what the lab shows (schema below) | 163,943 |
| `grafanc_ref.json` | model allele frequencies of every study SNP, for the GrafAnc emulator (schema below) | 794,645 |
| `../assets/js/lab/toy-data.js` | the seven PLINK and panel files above as `window.TOY_FILES` for the browser lab | 575,657 |

## truth.json

Schema `lecture1-toy-truth/1`. People are keyed by the exact FID and IID strings of `toy.fam`,
quotes included (FID `"\"80048\""`, IID `"1"`). SNPs are keyed by their `toy.bim` ID.

| Key | Contents |
|---|---|
| `schema`, `about`, `generator`, `seed`, `licence` | identification |
| `conventions` | ID formats, coordinates, allele and strand conventions |
| `params` | every simulation setting (the generator's `CONFIG` object) |
| `population_model` | `tree` (nodes, parents, drift F, mixtures), `admixed_populations`, `li_stephens_mean_switch_distance_kb`, `long_range_region_inverted_clade_frequency`, `fst_hudson_study_snps` |
| `study` | `n`, `m`, `counts` (sex, phenotype, population and super-population counts) and `samples` (one entry per `toy.fam` line, in file order) |
| `reference` | `n`, `m` and `samples`: `sample`, `pop`, `super_pop`, `gender`, `ancestry` |
| `features` | one entry per planted problem: the IDs involved and `intended`, the outcome the practical's commands should give (details below) |
| `lab_view` | steps 1–5 of the practical run on `toy.*` by the lab's PLINK emulator inside the generator: `after_qc`, `prune`, `hardy`, `genome`, `het`. These are the numbers the lab shows. They need regenerating if `plink-core.js` changes |
| `files` | byte sizes of the files in this folder |

Fields of each `study.samples` entry:

- `fid`, `iid`, `row` (1-based line in `toy.fam`), `sex` (1 male, 2 female), `phenotype` (1
  control, 2 case, −9 missing).
- `population`: a 1000 Genomes population code (CEU, GBR, TSI, YRI, LWK, CHB, JPT, CHS, GIH, PJL,
  BEB) or `ADMIXED`. `super_pop` is EUR, AFR, EAS, SAS or ADMIXED.
- `ancestry`: the simulated ancestry proportions (AFR, EUR, EAS, SAS).
- `role`: `normal`, `duplicate`, `parent`, `offspring`, `full_sibling`, `half_sibling`, `inbred`,
  `contaminated`, `degraded` or `low_quality`.
- `causal_risk_allele_count`; `missing_logit_offset`; `raw_missing_calls`; `raw_f_miss`; and
  `f_miss_after_geno` (the share of missing calls among the SNPs that pass `--geno 0.01`).
- Fields that only some people have: `admixture` (how the admixed person was made), `duplicate_of`,
  `relatives` (the other person and the relationship), `parents`, `expected_F` and
  `realized_autozygosity` (the inbred person), `contamination` and `note`.

`features`:

- `a_variant_missingness`: `planted_snps` (`id`, target rate, `raw_f_miss`),
  `other_snps_failing_geno`, `geno_0_01_removes`.
- `b_sample_missingness`: `degraded`, `low_quality`, `mind_after_geno_removes`,
  `mind_on_raw_data_would_remove`.
- `c_hardy_weinberg`: `heterozygote_deficit`, `heterozygote_excess` (each with its mechanism and
  strength), `causal_snp`, `stratification_examples` (SNPs that reach p < 1e-8 in the ALL rows
  only; there are none in this draw).
- `causal_snp`: `id`, `chr`, `bp`, the risk allele on the forward and the study strand,
  `risk_allele_frequency_model` by continent, `model`, `block_snps`, `block_redraws`.
- `d_relatedness`: `pairs`, each with `a`, `b`, `relationship`, `expected` (Z0, Z1, Z2, PI_HAT)
  and `realized` (k0, k1, k2 and pi_hat: the shares of study SNPs where the two people carry 0, 1 or
  2 haplotypes inherited from the same founder haplotype).
- `e_heterozygosity`: `contaminated`, `inbred`, `inbred_realized_autozygosity`,
  `contamination_model`, `ancestry_effect`.
- `f_reference_merge`: `shared_snps`, `reference_only_snps`, `study_only_snps`,
  `study_reverse_strand_count`, `flip_needed_shared_nonpalindromic`, `expected_missnp`,
  `palindromic_shared_strand_swapped`, `palindromic_shared_same_strand`.
- `g_ancestry`: `study_by_super_population`.
- `long_range_ld_region`: `chr`, `start`, `end`, `snps`, `clade_tag_snps`, `in_reference` and
  `inverted_clade_copies_by_row` (0, 1 or 2 per `toy.fam` line).

`lab_view`:

- `after_qc`: people and SNPs after `--geno 0.01` and then `--mind 0.01`.
- `prune`: `prune_in`, `prune_out` and `removed_share` from `--indep-pairwise 50 5 0.3`.
- `hardy`: `unaff_p_below_1e_8`, `artifact_p`, `causal_p`, `smallest_unaff_p_other_snps`,
  `all_rows_p_below_1e_8_other_snps`.
- `genome`: `planted` (Z0, Z1, Z2 and PI_HAT of each planted pair);
  `unrelated_pairs_above["0.1875"|"0.1"]`, each with a `total` and `by_group`;
  `contaminated_sample_pairs`; and `largest_other_unrelated_pair`. Groups are the super-population
  labels, with the contaminated sample shown as `CONTAMINATED`.
- `het`: `het_rate_mean`, `het_rate_sd`, `outside_3_sd`, `abs_F_above_0_1` (each person with role,
  population, F and heterozygosity rate) and `F_by_group`.

## grafanc_ref.json

Schema `lecture1-toy-grafanc-ref/1`:

- `snps`: `{id, chr, bp, ref, alt}` for every `toy.bim` SNP, in `toy.bim` order. `ref` and `alt`
  are forward-strand alleles as in `toy_1kg.bim`, before the study's deliberate strand flips.
- `freq`: `{POP: [frequency of alt for each SNP]}` for EUR, AFR, EAS, SAS and AMR, and for the 15
  panel populations, to 4 decimals. These are model frequencies, not frequencies counted in the
  sampled panel. AMR is the mean of MXL, PUR and CLM.

## What the toy study is, and why

The practical runs PLINK quality control (QC) on PennCATH: 1,401 people × 861,473 SNPs. That is far
too large to ship inside a web page and run in a browser. The toy study keeps PennCATH's file
conventions (quoted numeric FIDs, IID 1, no parents, phenotype 1/2/−9, GRCh37-like positions on
chromosomes 1–22). It is small enough that each QC command runs in well under a second. Each QC
step of the practical has something real to find in it, and the cause is known exactly. The files
are ordinary PLINK files, so the same commands also run with real PLINK (see the last section).

| | Toy study | Reference panel |
|---|---|---|
| People | 250: 167 male, 83 female; 81 cases, 86 controls, 83 missing phenotype | 150: 30 each of AFR, AMR, EAS, EUR, SAS |
| SNPs | 3,925 | 1,180 (1,150 shared with the study, 30 only in the panel) |

Study ancestry (simulated):

- European-like: 234 (CEU 108, GBR 77, TSI 49).
- African-like: 4 (YRI 3, LWK 1).
- East-Asian-like: 4 (CHB 2, JPT 1, CHS 1).
- South-Asian-like: 3 (GIH, PJL, BEB, one each).
- Admixed African–European: 5.

Panel: YRI 12, LWK 10, ASW 8, MXL 10, PUR 10, CLM 10, CHB 10, JPT 10, CHS 10, CEU 10, GBR 10,
TSI 10, GIH 10, PJL 10, BEB 10. Panel IDs are `TG` plus 5 digits.

## How the data were simulated

The generator uses no libraries and draws every random number from seeded xoshiro128** streams.
The same seed gives byte-identical files.

### Populations and allele frequencies

Each SNP's allele frequencies come from a population tree. Along each branch, frequencies drift by
the Balding–Nichols model: a frequency `p` in the parent population becomes a draw from
`Beta(p(1−F)/F, (1−F)(1−p)/F)` in the child. Here `F` is the branch's drift. The child's
frequency has mean `p` and variance `F p (1−p)`, so a larger F means larger frequency differences
between populations. In the generator the drift acts on the frequencies of a block's founder
haplotypes (a Dirichlet draw with the same parameters). For any single SNP this is exactly the
Balding–Nichols draw.

| Branch | F | Branch | F |
|---|---:|---|---:|
| root → AFR | 0.012 | WEA → EUR | 0.040 |
| root → out-of-Africa (OOA) | 0.185 | WEA → SAS (then mixed with ASI) | 0.020 |
| OOA → West Eurasian (WEA) | 0.035 | EAS → NAT | 0.090 |
| OOA → EAS | 0.135 | leaves (CEU, YRI, …) | 0.004–0.010 |
| EAS → ASI | 0.060 | | |

- **South Asian ancestry.** After its drift, the South Asian node takes 40% of its founder-haplotype
  frequencies from ASI, an East-Asian-related branch. This follows the model of South Asian history
  in which a West-Eurasian-related source (ANI) mixed with a deeply diverged source (ASI). It puts
  South-Asian-like people between European- and East-Asian-like people in PCA and in GrafAnc.
- **Admixed reference populations.** ASW, MXL, PUR and CLM are mixtures of tree populations, made
  from ancestry tracts. ASW is 76% YRI and 24% CEU. MXL, PUR and CLM mix TSI, NAT (a Native American
  node that is not sampled) and YRI.

Hudson F_ST between continental nodes, computed from the model frequencies over the study SNPs. The
drifts were chosen so that AFR–EUR, EAS–EUR, AFR–EAS and EUR–SAS are close to values reported for
1000 Genomes super-populations:

| AFR–EUR | EAS–EUR | EUR–SAS | AFR–EAS | AFR–SAS | EAS–SAS | CEU–TSI |
|---:|---:|---:|---:|---:|---:|---:|
| 0.135 | 0.107 | 0.044 | 0.166 | 0.124 | 0.037 | 0.006 |

**Allele-frequency spectrum.** Genotyping arrays favor SNPs that are common in the populations they
were designed for. The toy imitates this with an ascertainment rule. A SNP is kept only if:

- the minor-allele frequency (MAF) of its frequency averaged over the African, European and East
  Asian nodes is at least 0.12;
- its European MAF is at least 0.03;
- and, when its European MAF is below 0.08, a coin toss with probability (European MAF)/0.08 keeps
  it.

When none of 400 candidate mutations for a SNP passes, the candidate with the highest European MAF
is used. That is why 30 SNPs have a European MAF below 0.03. No study SNP is monomorphic.

| MAF in the study | < 0.01 | 0.01–0.05 | 0.05–0.1 | 0.1–0.2 | 0.2–0.3 | 0.3–0.4 | 0.4–0.5 |
|---|---:|---:|---:|---:|---:|---:|---:|
| SNPs | 1 | 49 | 315 | 887 | 887 | 963 | 823 |
| Share of SNPs | 0.03% | 1.25% | 8.0% | 22.6% | 22.6% | 24.5% | 21.0% |

MAF here is PLINK's founder MAF from `--freq` on the raw study (all 250 people are founders); the
bins include their lower edge. So 50 SNPs (1.3%) have MAF below 0.05 (`study_maf_lt_0_05`).

### SNP layout, haplotypes and linkage disequilibrium

- **Blocks.** 2,155 SNPs lie in 80 blocks of 100–420 kb, with SNPs 1.5 kb plus an exponential extra
  gap (mean 8.5 kb) apart (median spacing 6.9 kb). This makes `--indep-pairwise 50 5 0.3` remove
  about a third of the SNPs; SNPs spread evenly across the genome would be in almost no LD.
- **Isolated SNPs.** 1,650 SNPs are at least 150 kb from any other SNP.
- **Long-range region.** 90 SNPs in a long-range LD region on chromosome 8 (8.1–11.9 Mb; below).
- **Causal block.** 30 SNPs in a 230 kb causal block on chromosome 9 at 21.99 Mb (near the 9p21 CAD
  locus).
- **Reference-only SNPs.** 30 isolated SNPs exist only in the panel.
- Positions are GRCh37-like and fall within the first and last positions of each chromosome in
  PennCATH.

Each block has 10 founder haplotypes. Along a block, local genealogies of the founders change every
35 kb on average (Kingman coalescent trees). Each SNP is a mutation dropped on a branch of the local
tree, so all founders below that branch carry the derived allele. A population's haplotypes are
mosaics of the block's founders, copied in the style of Li and Stephens: the copied founder switches
on average every 18 kb in African-like populations, 47–60 kb in the others. The founder is drawn
with that population's drifted founder frequencies. So LD decays faster in African-like people, as
in real data. Mean r² between SNP pairs with MAF ≥ 0.05 in the European-like people, by distance:
0.58 (≤ 5 kb), 0.47 (≤ 10 kb), 0.34 (≤ 20 kb), 0.18 (≤ 40 kb), 0.06 (≤ 80 kb), 0.02 (≤ 160 kb).

Admixed study people carry ancestry tracts:

- four were made from 6 generations of African–European admixture, aiming at African-like shares
  of 0.25, 0.45, 0.65 and 0.85 (realized shares 0.27, 0.41, 0.64 and 0.88);
- one is first generation (one YRI-like parent, one CEU-like parent; share 0.50).

### Relatives and meiosis

Relatives are made by simulated meiosis. Each parent passes on one gamete, built with a Poisson
number of crossovers per chromosome (rate set by the chromosome's genetic length). The generator
records which founder haplotype each allele came from, so the realized identity-by-descent (IBD) is
known exactly. A relative's meioses were redrawn until the realized IBD over the study SNPs was
typical of the relationship:

- full siblings: k0 and k2 within 0.03 of 0.25;
- half siblings: realized PI_HAT within 0.01 of 0.25;
- the inbred person: autozygosity within 0.03 of 0.25.

This makes the planted relatives typical draws rather than lucky or unlucky ones. Their parents and
grandparents are simulated but not in the study, and PAT and MAT are 0 for everyone, so relatives
are hidden as in PennCATH. Every family comes from one European-like population.

### Genotype calls: contamination, artifacts, errors, missing calls

- **Contamination.** Sample 80291's DNA is a mixture with an unrelated European-like person who is
  not in the study (contaminant share α = 0.29). Where the two genotypes differ, the array's B-allele
  signal is `b = (1 − α) g1/2 + α g2/2 + e`:
  - `g1` and `g2` are the two people's counts of the B allele (0, 1 or 2);
  - `e` is normal noise with SD 0.04.

  The call is heterozygous when 0.2 < b < 0.8, otherwise homozygous; 0.6% of such calls are
  missing. The result is extra heterozygous calls, not random noise.
- **Hardy–Weinberg artifacts.** Four SNPs have a clustering error that calls 94–97% of true
  heterozygotes as the common homozygote (a heterozygote deficit). Two SNPs act as if the probe also
  bound a second genomic location fixed for the minor allele, so 95–97% of common-allele homozygotes
  are called heterozygous (an excess). They were chosen by the minor-allele frequency of the
  controls' true genotypes (0.45–0.5 for deficits, 0.06–0.14 for excesses) so that the distortion is
  strong in the controls.
- **Errors.** Each call flips to a wrong genotype with probability 0.0008 (0.004 for degraded
  samples).
- **Missing calls.** A call is missing with probability `logistic(μ + u_i + v_j)`:
  - `μ = logit(0.0004)` is the base rate;
  - `u_i` is the person's offset: normal with SD 0.5, or +4.0 to +5.4 for the four degraded
    samples and +2.4 to +2.5 for the three low-quality samples;
  - `v_j` is the SNP's offset: normal with SD 0.6.

  90 SNPs get offsets that give missing rates of 4–40%. The SNPs shared with the panel, the causal
  SNP and the HWE artifact SNPs have offsets capped at −1.5, so they pass `--geno 0.01`. This keeps
  every strand-flipped SNP in the QC'd data.

### Phenotype and the causal SNP

The causal SNP is tsnp02258 (chr9:22,015,591). Its risk allele is C on both strands, with a model
European frequency of 0.21. Penetrance (risk of CAD) is 0.01, 0.01 and 0.20 for 0, 1 and 2 risk
alleles: nearly recessive, with a genotype relative risk of 20 for two copies. Real CAD variants
have odds ratios of about 1.1–1.3 per allele; the effect is exaggerated on purpose so that 81 cases
show it.

Cases and controls were assigned first. Each person's genotypes in the causal block were then drawn
in proportion to the penetrance (cases) or to 1 − penetrance (controls), by rejection sampling.
Relatives' genotypes come from meiosis instead, so their case or control status was drawn from their
own genotype with the penetrance. That made most of them controls, which is why the study has 81
cases and 86 controls rather than the planned 83 and 84. Phenotype −9 (83 people) is independent of
genotype.

If the causal block has no SNP with a European risk-allele frequency between 0.08 and 0.32, its
founder model is redrawn from a separate random stream. Outside that range the cases' heterozygote
deficit is weak. That was not needed for this seed.

### The reference panel

Panel people are drawn from the same model as the study (same tree, same founders), so study and
panel frequencies agree. The 1,150 shared SNPs are an LD-thinned set (r² ≤ 0.2 within 250 kb in the
panel) of SNPs with panel MAF ≥ 0.05, as a "markers for PCA" file would be. It includes 12 A/T or
C/G SNPs and only 3 SNPs of the chromosome 8 region. `toy_1kg.fam` has FID = IID = the panel
`sample` value, PAT = MAT = 0, phenotype −9, and sex from the panel's `gender` column.

## Planted features, step by step

Every number here comes from the lab's emulators run on these files, or from the simulation. The
emulator numbers are in the `lab_view` and `features` entries of `truth.json`, or in the data card's
pipeline (`tools/make_data_card.mjs`). FIDs are written without their quotes.

### Step 1. Missingness (`--missing`, `--geno 0.01`, then `--mind 0.01`)

- **SNPs.** 90 SNPs have planted missing rates (raw F_MISS 0.040–0.464). `--geno 0.01` removes 118
  SNPs: the 90 planted ones and 28 ordinary SNPs whose sporadic missing calls happen to reach 3–5 of
  250 people (F_MISS > 0.01). The weakest planted SNP has 10 missing calls; the threshold is 3. That
  leaves 3,807 SNPs.
- **Samples.** After `--geno`, `--mind 0.01` removes exactly the 4 degraded samples: 80007, 80124,
  80184 and 80320, with F_MISS 0.019–0.067 after `--geno`. That leaves 246 people.
- **Why the order matters.** On the raw data, `--mind 0.01` would also remove:
  - the 3 low-quality samples (80112, 80242, 80341; raw F_MISS 0.019, against 0.003–0.005 after
    `--geno`), whose missing calls sit mostly in the SNPs that `--geno` removes;
  - one ordinary person (80222, raw F_MISS 0.0107).

  This is why the practical filters SNPs first.
- The contaminated sample has raised missingness (raw 0.008) but stays below 1%.

### Step 2. Hardy–Weinberg equilibrium (`--hardy`, UNAFF rows, p < 1e-8)

| SNP | Planted problem | UNAFF p | AFF p | ALL p |
|---|---|---:|---:|---:|
| tsnp00172 | heterozygote deficit (97% of heterozygotes miscalled) | 2.0e-21 | 7.5e-13 | 3.8e-47 |
| tsnp00487 | heterozygote deficit (96%) | 1.8e-15 | 4.2e-17 | 7.7e-46 |
| tsnp00673 | heterozygote deficit (94%) | 5.3e-14 | 6.8e-20 | 2.5e-49 |
| tsnp01414 | heterozygote deficit (95%) | 6.0e-16 | 6.1e-16 | 1.9e-42 |
| tsnp03803 | heterozygote excess (97% of common homozygotes called heterozygous) | 5.9e-20 | 5.5e-17 | 1.2e-56 |
| tsnp03832 | heterozygote excess (95%) | 9.5e-15 | 1.1e-20 | 2.2e-50 |
| tsnp02258 | the causal SNP (not an artifact) | 0.74 | 3.0e-10 | 3.8e-12 |

- Exactly 6 SNPs have UNAFF p < 1e-8. The smallest UNAFF p of any other SNP is 8.8e-4 (tsnp02300),
  so the margin is more than ten orders of magnitude.
- The causal SNP shows why QC uses the controls. Cases are enriched for risk homozygotes: 44 CC, 12
  heterozygotes and 25 non-risk homozygotes. That is a heterozygote deficit in the AFF and ALL rows,
  but the controls are in equilibrium.
- At p < 1e-3, the UNAFF rows add one ordinary SNP, tsnp02300 (p = 8.8e-4). This matters for the
  practical's closing exercise, which asks for a threshold.

### Step 3. LD pruning (`--indep-pairwise 50 5 0.3`)

2,410 SNPs are kept (`prune.in`) and 1,397 removed (`prune.out`): 36.7% of the QC'd SNPs. Of the 87
QC'd SNPs in the chromosome 8 region, 11 are kept.

### Step 4. Relatedness (`--genome` on the pruned SNPs)

| Pair (FIDs) | Planted relationship | Z0 | Z1 | Z2 | PI_HAT | Realized PI_HAT |
|---|---|---:|---:|---:|---:|---:|
| 80105, 80313 | duplicate (same person, independent missing calls and errors) | 0.000 | 0.002 | 0.998 | 0.999 | 1 |
| 80068, 80081 | parent and offspring | 0.011 | 0.923 | 0.066 | 0.527 | 0.5 |
| 80066, 80338 | full siblings | 0.178 | 0.534 | 0.288 | 0.555 | 0.513 |
| 80090, 80210 | half siblings (second degree) | 0.564 | 0.436 | 0.000 | 0.218 | 0.243 |

PI_HAT here is PLINK's method-of-moments estimate from about 2,400 SNPs. It scatters around the
realized sharing by a few hundredths.

Unrelated pairs above the practical's thresholds, by the groups of the two people (30,135 pairs in
all):

| Threshold | Unplanted pairs above it | Groups involved |
|---|---:|---|
| PI_HAT > 0.1875 | 104 | all 104 involve the contaminated sample 80291 (with European-like people) |
| PI_HAT > 0.1 | 464 | 233 involve 80291 (228 with European-like, 3 with admixed and 2 with South-Asian-like people); 230 are European-like pairs; 1 is an East-Asian-like pair |

- **The contaminated sample.** 80291 has PI_HAT 0.175 on average with the other 245 people
  (maximum 0.263). The mixture adds heterozygous calls, so 80291 almost never has opposite
  homozygous genotypes (IBS0) with anyone. The method-of-moments estimator reads the missing IBS0 as
  shared ancestry. One person who seems related to everybody points to contamination, and step 5
  confirms it. Any extra heterozygosity has this side effect, so it cannot be removed without making
  the contamination undetectable in step 5. These pairs reach the half siblings' PI_HAT.
- **The other pairs.** Leaving out the contaminated sample, the largest unplanted PI_HAT is 0.153
  (80198 and 80286, both European-like). That is 0.065 below the half siblings. Estimation noise
  with about 2,400 SNPs puts most unrelated pairs between 0 and 0.15.
- **No cousins.** A first-cousin pair (expected PI_HAT 0.125) would sit inside that noise, so none
  was planted.

### Step 5. Heterozygosity (`--het` on the pruned SNPs)

The heterozygosity rate is (N(NM) − O(HOM)) / N(NM). Its mean is 0.3613 and its SD 0.0142, so
the ±3 SD band is 0.319–0.404. PLINK's F is (O(HOM) − E(HOM)) / (N(NM) − E(HOM)), where E(HOM)
is the expected number of homozygous genotypes from the sample's allele frequencies.

| FID | Who | F | Rate | ±3 SD | \|F\| > 0.1 |
|---|---|---:|---:|:---:|:---:|
| 80048 | inbred (child of two full siblings; realized autozygosity 0.228) | 0.277 | 0.265 | yes | yes |
| 80291 | contaminated | −0.235 | 0.453 | yes | yes |
| 80265 | admixed, first generation | −0.140 | 0.418 | yes | yes |
| 80185 | East-Asian-like (CHB) | 0.1003 | 0.330 | no | yes |
| 80201 | admixed, African-like share 0.41 | −0.0991 | 0.403 | no | no |

- **Why ancestry moves F.** F is measured against the allele frequencies of a mostly European-like
  sample, so ancestry moves it:
  - admixed people have negative F (mean −0.084), because their two haplotypes partly come from
    different populations;
  - East-Asian-like people have positive F (mean 0.076, up to 0.100), because drift left them less
    heterozygous at these SNPs;
  - African-like (mean −0.031) and South-Asian-like (−0.013) people are near 0.
- **The two rules nearly coincide.** 3 SD of the rate is about 0.12 in F units, so they differ only
  for people with |F| between 0.1 and about 0.12. In this draw, |F| > 0.1 adds one person, 80185
  (F = 0.1003). 80201 just misses both rules: F = −0.0991, and a rate 0.0008 below the upper limit
  of the band. Both people are within about one genotype call of a cutoff. That is the practical's
  point about sensitivity to the choice of metric and threshold.

### Step 6. PCA of the study (`--pca`)

- **Pruned SNPs** (`--extract prune.in --maf 0.05`; 2,368 SNPs). PC1 separates African-like
  people (eigenvalue 6.11). PC2 separates East-Asian-like people, with South-Asian-like people
  between them and the European-like people (3.07). The chromosome 8 region drives none of the top
  PCs; its largest correlation is r = 0.30, on PC12.
- **Unpruned SNPs** (`--maf 0.05` without `--extract`; 3,750 SNPs). PC1 still separates
  African-like people (6.31). PC2 (5.45) sorts people by their number of inverted copies in the
  chromosome 8 region: correlation r = 0.98 with the copy count.
- **The chromosome 8 region.** It imitates the 8p23.1 inversion: two haplotype clades (standard
  and inverted) with no recombination between them. 72 of its 90 SNPs tag the clade, and the rest
  vary within one clade. The inverted clade has a frequency of about 0.5 in the study; 62, 132 and
  56 people carry 0, 1 and 2 inverted copies. Pruning keeps only 11 of its
  SNPs, so the PC disappears.

### Step 7. Merging with the reference panel (`--bmerge`, `--flip`)

- **Reverse strand.** `toy.bim` lists 1,963 of its SNPs on the reverse strand (alleles
  complemented), as Affymetrix-style data can.
- **The first merge fails.** 591 of these SNPs are shared with the panel and are not A/T or C/G.
  The first `--bmerge` of the QC'd study with `toy_1kg` fails with "Error: 591 variants with 3+
  alleles present." and writes those 591 SNPs to `-merge.missnp`.
- **The second merge works.** After `--flip` with that list, it merges 396 people × 3,837 SNPs.
- **Silent swaps.** 5 shared A/T or C/G SNPs are on the opposite strand in the study: tsnp00492,
  tsnp00605, tsnp00705, tsnp01504 and tsnp01772. They merge without any message, with their alleles
  exchanged, and their study allele frequencies mirror the panel's (for example 0.18 against 0.75).
  The other 7 shared A/T or C/G SNPs are on the same strand.
- **The merged PCA.** `--geno 0.1` removes the 2,687 SNPs that are in only one fileset, and
  `--maf 0.05` removes 1, leaving 1,149 SNPs for the merged PCA. Study people fall on their
  populations' panel clusters; admixed people lie between EUR and AFR, and South-Asian-like people
  between EUR and EAS.

### Step 8. GrafAnc (lab emulator)

On the 246 QC'd people:

| Group | People |
|---|---:|
| EUR | 230 (all European-like) |
| AFR | 7: the 4 African-like people and 3 admixed people (African-like shares 0.50, 0.64, 0.88) |
| EAS | 4 |
| SAS | 3 |
| AMR | 2: the admixed people with African-like shares 0.27 and 0.41 |

- **No misassignments.** Every person who is not admixed is in their own group.
- **Admixed people.** Their Pf follows their African-like share.
- **South-Asian-like people.** Their Pe/Pf/Pa are about 42–46 / 6–8 / 47–51, between the E and A
  vertices.
- **Spread of the European-like people.** Over the normal European-like people, RawPe, RawPf and
  RawPa have SDs of 5.2, 4.3 and 5.8.
- **Triangle vertices** (GD1, GD2): E (1.504, 1.380), F (1.08, 1.10), A (1.734, 1.10).

## How the toy data differ from PennCATH

- **Phenotype meaning.** In Breheny's teaching copy of PennCATH, codes 1 (470 people) and 2 (463)
  both have CAD = 1 in the clinical table, and the 468 people coded −9 have CAD = 0 (see
  [What column 6 holds in this copy of PennCATH](../plink-data.html#phenotype-column)). The toy
  phenotype is a simulated CAD case–control status (1 control, 2 case, −9 unknown, independent of
  genotype), so it does not reproduce that coding.
- **−9 as an allele name.** The real `penncath.bim` writes −9 as the allele name of 26,153
  monomorphic SNPs (one SNP has −9 in both allele columns). This quirk is deliberately not
  reproduced: every toy SNP has two A/C/G/T alleles, and none is monomorphic.
- **Size.** 250 people × 3,925 SNPs instead of 1,401 × 861,473. The dense LD blocks make the
  pruning step meaningful at this size.
- **Allele frequencies.** The spectrum is shifted towards common SNPs: 50 of the 3,925 toy SNPs
  (1.3%) have MAF below 0.05. In PennCATH it is about a quarter: 213,108 of the 861,472 SNPs with a frequency
  (24.7%), counting the 26,153 monomorphic SNPs, or 22.4% of the polymorphic ones.
- **Missingness.** In PennCATH, `--geno 0.01` removes 291,750 of 861,473 SNPs (33.9%), far more than
  the 3% it removes from the toy.
- The two PennCATH figures come from real PLINK 1.9.0 (`--freq`, `--geno 0.01`) run on the real
  files.
- **Ancestry.** 16 people (6%) are not European-like, chosen so that each ancestry group has at
  least 3 people.
- **Relatives.** The planted relatives are first and second degree only; the duplicate is a separate
  FID. Relatedness is hidden (PAT = MAT = 0), as in PennCATH.
- **Effect size.** The causal effect is far larger than any real CAD variant.
- **IDs.** SNP IDs (`tsnp` plus 5 digits) are not rsIDs, and sample IDs start at 80001.
- **South Asian position.** South-Asian-like people sit about halfway between European- and
  East-Asian-like people (EUR–SAS F_ST 0.044, EAS–SAS 0.037). In 1000 Genomes they sit closer to
  Europeans.

## Robustness across seeds

The generator was run with seeds 1–20, and the lab's data tests (`../tools/test_lab.mjs --data DIR
--only D`) were run on each. The duplicate, the parent–offspring and half-sibling classes, the step
1 counts, the six HWE SNPs, the causal SNP, the strand flips and the GrafAnc groups of non-admixed
people held in every seed, apart from these exceptions:

- **Inversion on one PC.** In 9 of 20 seeds the chromosome 8 region does not reach r > 0.9 with a
  single PC (r = 0.73–0.88). Its eigenvalue is close to that of the African-ancestry axis, so the two
  mix across PC1 and PC2. PC1 and PC2 together still capture it (multiple correlation 0.99 in each
  of those seeds). In this draw it is clean, on PC2. A region of about 110 SNPs would put it on PC1
  in 19 of 20 seeds, but would add noise to GrafAnc, so 90 SNPs were kept.
- **Heterozygosity rules.** In 4 of 20 seeds the two rules flag the same people.
- **Full-sibling estimate.** In 1 seed the full siblings' Z estimates left their expected class
  because of estimation noise.
- **GrafAnc Pa.** In 1 seed r(Pa, East Asian share) was 0.947 against the test's 0.95.

The contaminated sample's highest PI_HAT (0.23–0.29 across the seeds) was above the half siblings'
in 11 of 20 seeds. A smaller contaminant share would separate them, but then the contaminated sample
would no longer stand out in step 5. Leaving out the contaminated sample, the half siblings were at
least 0.06 above every unrelated pair in every seed.

## Regenerating and checking

From the repository root, with Node 18 or later:

```bash
node 1-introduction-gwas-qc/tools/make_toy_data.mjs        # rewrites data/ and assets/js/lab/toy-data.js
node 1-introduction-gwas-qc/tools/test_lab.mjs --only D,F,I # checks the planted features and the lab
node 1-introduction-gwas-qc/tools/make_toy_data.mjs --seed 7 --out /tmp/toy7 --no-js   # another draw
```

The same seed gives byte-identical files. The generator runs steps 1–5 of the practical with the
lab's PLINK emulator to fill `lab_view`, so regenerate after any change to `plink-core.js`, then
rebuild the data card (`tools/make_data_card.mjs`).

Numbers on the pages come from the card through `data-card` spans and follow a new draw. A few
statements describe this draw (seed 20260909) in words instead, and need rechecking after any other
draw:

- qc-missingness: three missing calls already fail a SNP at `--geno 0.01` (250 people). Given
  `--geno` and `--mind` in one command, PLINK applies `--mind` first; that removes more people and
  fewer SNPs than the practical's two steps (8 and 99 against 4 and 118 in this draw).
- qc-hwe: the one extra SNP that a 10⁻³ threshold would remove is an ordinary SNP, not a planted one.
- qc-ld-pruning: chromosome 8 keeps the lowest share of its SNPs after pruning.
- qc-relatedness: almost every unrelated pair above 0.1875 involves the contaminated sample 80291.
- qc-heterozygosity: |F| > 0.1 adds 80185 by a margin of about one genotype, and 80201 just misses
  both rules (F = −0.0991; its rate is 0.0008 below the upper ±3 SD limit).
- qc-reference-pca: question 7 (the merged PCA without `--geno 0.1`) describes PC3 against PC4: one
  axis follows the chromosome 8 inversion among study people, the other separates the study's
  African-like and admixed people from every reference person.
- qc-grafanc: the plane widget's default, Pe below 80%, flags exactly the 16 people drawn from
  non-European populations or made admixed; at 90% European-like people join them.
- qc-exercise: everyone outside GrafAnc's EUR group was drawn from a non-European population or made
  admixed; the admixed person removed by the ±3 SD rule and the East-Asian-like person with
  |F| > 0.1 are on both the ancestry flag list and Task 3's lists.

## Running real PLINK 1.9 on these files

The files are standard PLINK 1 binary filesets, so the practical's commands run on them with the
prefix changed. For example:

```bash
plink --bfile toy --geno 0.01 --make-bed --out toy.geno0.01
plink --bfile toy.geno0.01 --mind 0.01 --make-bed --out toy.geno0.01.mind0.01
plink --bfile toy.geno0.01.mind0.01 --hardy --out toy.geno0.01.mind0.01
plink --bfile toy.geno0.01.mind0.01 --indep-pairwise 50 5 0.3 --out toy.geno0.01.mind0.01
plink --bfile toy.geno0.01.mind0.01 --extract toy.geno0.01.mind0.01.prune.in --genome --out toy.geno0.01.mind0.01.LD0.3
plink --bfile toy.geno0.01.mind0.01 --het --extract toy.geno0.01.mind0.01.prune.in --out toy.geno0.01.mind0.01.LD0.3
plink --bfile toy.geno0.01.mind0.01 --bmerge toy_1kg --make-bed --out toy.merge1kgenomes
```

**Real PLINK 1.9.0 was run on these files** (the release of 27 September 2026, on macOS, in November
2026). For every command of the practical, and for the extra pruning settings, the unpruned PCA,
`--freq` and the exercise's final command, it wrote files identical, byte for byte, to the emulator's,
`.eigenvec` signs included, with the same exit codes (the first merge fails by design). Its logs
differ only in the lines that name the program version, computer, folder, times, random seed, memory
and threads. `../tools/real_plink_check.mjs` repeats the comparison with your own copy of PLINK, and
`../tools/real-plink-1.9.0.json` records the checksums. PLINK 1.9.0's `--pca` also warns that
monomorphic variants are present whenever the number of SNPs is not a multiple of 20, even though no
SNP in these files is monomorphic; step 6 of the practical explains the warning.

Real GrafAnc is no use on these files. It matches SNPs to its own 282,424 ancestry SNPs by rs number,
or by GRCh37 or GRCh38 position and alleles. The toy SNPs have made-up IDs (`tsnp…`) at simulated
positions: run on the toy study after QC, it finds 1 ancestry SNP and stops with "Ancestry inference
not done due to lack of genotyped ancestry SNPs". Step 8 works only in the lab's emulator, whose
reference is built from `grafanc_ref.json`. The emulator itself was checked against real GrafAnc,
with GrafAnc's own reference, on the PennCATH data (`../assets/js/lab/CORE.md`).

## Licence

The toy data and this card are released under CC0 1.0 (public domain dedication). They are
simulated and contain no information about real people.

## TOY_CARD keys

`../assets/js/lab/data-card.js` defines `window.TOY_CARD`, the numbers that pages quote about these
files. A page writes `<span data-card="KEY">?</span>`. `../tools/make_data_card.mjs` computes the
values. It runs the practical's commands (`01_qc.Rmd`, with `penncath` → `toy` and
`all_pops_1kgenomes_markersForPCA` → `toy_1kg`) with the lab's PLINK and GrafAnc emulators on the
files in this folder, then recomputes the practical's R summaries from the output files.

Every value below comes from the emulators. The PLINK values equal real PLINK 1.9.0's, whose output
files are identical; the GrafAnc values have no real counterpart, because real GrafAnc cannot run on
these files. `../assets/js/lab/CORE.md` lists how the emulators differ from the real programs.

Each count comes from the console output of the step that produced it, or from line counts of its
output files, never from a `.log`: the practical reuses `--out` prefixes, so a later step overwrites
an earlier step's log. After `make_toy_data.mjs` has rewritten this folder, run, from the repository
root:

```bash
node 1-introduction-gwas-qc/tools/make_data_card.mjs   # rewrites data-card.js and the reference in grafanc-core.js
node 1-introduction-gwas-qc/tools/test_lab.mjs         # all tests, including that every key below is documented
```

In the tables, `Q` stands for `toy.geno0.01.mind0.01`, the practical's QC'd set. Counts are numbers.
IDs and p-values are strings, as PLINK prints them. Lists of IDs are comma-separated, and empty when
there are none.

### The data

| Key | Meaning |
|---|---|
| `study_people`, `study_males`, `study_females` | people in `toy.fam`, by its sex column |
| `study_cases`, `study_controls`, `study_pheno_missing` | phenotype 2, 1 and missing (−9) in `toy.fam` |
| `study_snps`, `study_chromosomes` | variants and distinct chromosomes in `toy.bim` |
| `ref_people`, `ref_snps` | people in `toy_1kg.fam`, variants in `toy_1kg.bim` |
| `ref_populations`, `ref_super_populations` | distinct `pop` and `super_pop` values in the panel file |
| `ref_afr`, `ref_amr`, `ref_eas`, `ref_eur`, `ref_sas` | reference people per super-population |
| `sim_european_like`, `sim_african_like`, `sim_east_asian_like`, `sim_south_asian_like`, `sim_admixed` | study people per simulated group (`truth.json`) |
| `sim_related_pairs` | planted relative pairs |
| `study_maf_lt_0_05`, `study_maf_lt_0_05_percent` | SNPs in `toy.bim` with founder MAF below 0.05 (`--freq` on the raw data), and their share in % |
| `sim_degraded_fids`, `sim_low_quality_fids` | FIDs of the planted degraded and low-quality samples (`truth.json`) |
| `sim_causal_snp` | ID of the simulated causal SNP |

### Step 1: missingness

| Key | Meaning |
|---|---|
| `raw_genotyping_rate` | "Total genotyping rate is …" of `plink --bfile toy --missing` |
| `lmiss_snps`, `lmiss_gt_0_01`, `lmiss_le_0_01`, `lmiss_max` | rows of `toy.lmiss`; those with F_MISS > 0.01 and ≤ 0.01; the largest F_MISS |
| `imiss_raw_gt_0_01` | people in `toy.imiss` with F_MISS > 0.01 (whom `--mind 0.01` would remove from the raw data) |
| `geno_removed` | "N variants removed due to missing genotype data (--geno)." of the `--geno 0.01` step |
| `geno_snps_left`, `geno_people` | lines of `toy.geno0.01.bim` and `.fam` |
| `imiss_after_geno_gt_0_01`, `imiss_after_geno_le_0_01` | people in `toy.geno0.01.imiss` with F_MISS > 0.01 and ≤ 0.01 |
| `mind_removed` | "N people removed due to missing genotype data (--mind)." of the `--mind 0.01` step |
| `qc_people`, `qc_snps`, `qc_males`, `qc_females`, `qc_cases`, `qc_controls`, `qc_pheno_missing` | the QC'd set `Q` (`.fam` and `.bim`) |
| `qc_genotyping_rate` | "Total genotyping rate in remaining samples is …" of the `--mind` step |

### Step 2: Hardy-Weinberg equilibrium

| Key | Meaning |
|---|---|
| `hwe_rows`, `hwe_unaff_rows` | rows of `Q.hwe`, all and `TEST == "UNAFF"` |
| `hwe_unaff_p_lt_1e8`, `hwe_unaff_p_ge_1e8` | UNAFF rows with P < 1e-8 and ≥ 1e-8 (the practical's question) |
| `hwe_unaff_p_lt_1e6`, `hwe_unaff_p_lt_1e3` | UNAFF rows with P < 1e-6 and < 1e-3 (the thresholds of the discussion question) |
| `hwe_aff_p_lt_1e8`, `hwe_all_p_lt_1e8` | AFF and ALL rows with P < 1e-8 |
| `hwe_causal_aff_p`, `hwe_causal_unaff_p`, `hwe_causal_all_p` | P of the causal SNP in its AFF, UNAFF and ALL rows, as printed |
| `hwe_planted`, `hwe_planted_deficit`, `hwe_planted_excess` | planted genotyping artifacts: all, heterozygote deficit, heterozygote excess |
| `hwe_planted_ids`, `hwe_planted_deficit_ids`, `hwe_planted_excess_ids` | their IDs, comma-separated |
| `hwe_planted_unaff_p_lt_1e8` | planted artifacts whose UNAFF P is below 1e-8 |
| `hwe_all_only_p_lt_1e8`, `hwe_all_only_ids` | SNPs with P < 1e-8 in their ALL row but not in their UNAFF row (the causal SNP can be one of them): count and IDs |
| `hwe_stratification_snps`, `hwe_stratification_ids` | the unplanted SNPs among those (`stratification_examples` in `truth.json`: allele frequencies that differ between ancestries, so pooling them gives a heterozygote deficit, the Wahlund effect): count and IDs |

### Step 3: LD pruning

| Key | Meaning |
|---|---|
| `prune_in`, `prune_out` | lines of `Q.prune.in` and `Q.prune.out` (`--indep-pairwise 50 5 0.3`) |
| `prune_in_50_5_0_1`, `prune_in_50_5_0_8`, `prune_in_50_50_0_3`, `prune_in_250kb_1_0_3` | `.prune.in` lines at `50 5 0.1`, `50 5 0.8`, `50 50 0.3` and `250kb 1 0.3`, same input (not in the practical) |
| `prune_input_monomorphic` | SNPs of `Q` that are monomorphic among founders |
| `long_range_chr`, `long_range_start_bp`, `long_range_end_bp`, `long_range_start_mb`, `long_range_end_mb` | the planted long-range LD region (an inversion-like region): chromosome, start and end |
| `long_range_snps`, `long_range_snps_bim`, `long_range_snps_qc` | its SNPs: in `truth.json`, in `toy.bim` and in `Q` |
| `long_range_snps_prune_in`, `long_range_snps_prune_in_250kb` | its SNPs kept by pruning at `50 5 0.3` and at `250kb 1 0.3` |

### Step 4: relatedness

| Key | Meaning |
|---|---|
| `genome_snps` | variants used by `--genome` ("N variants and M people pass filters and QC.") |
| `genome_pairs` | rows of `Q.LD0.3.genome` |
| `pihat_min`, `pihat_q1`, `pihat_median`, `pihat_mean`, `pihat_q3`, `pihat_max` | R's `summary(ibd$PI_HAT)`, 4 decimals |
| `pairs_pihat_gt_0_9`, `pairs_pihat_gt_0_1875`, `pairs_pihat_gt_0_1` | pairs with PI_HAT above 0.9, 0.1875 and 0.1 |
| `ibd_REL_fids`, `ibd_REL_pihat`, `ibd_REL_z0`, `ibd_REL_z1`, `ibd_REL_z2` | the planted pair of each relationship, with REL one of `duplicate`, `parent_offspring`, `full_sibs` and `half_sibs`: the two FIDs without quotes ("80105 and 80313"), PI_HAT, Z0, Z1 and Z2 of its row in `Q.LD0.3.genome` |
| `ibd_REL_in_qc` | `"no"` when one of the pair did not pass QC; the other keys of that REL are then absent (none in these data) |

### Step 5: heterozygosity

| Key | Meaning |
|---|---|
| `het_snps`, `het_people` | variants used by `--het`; rows of `Q.LD0.3.het` |
| `het_rate_mean`, `het_rate_sd`, `het_rate_min`, `het_rate_max` | the practical's het_rate = (N(NM) − O(HOM)) / N(NM), 4 decimals |
| `het_outliers_3sd`, `het_outliers_3sd_low`, `het_outliers_3sd_high`, `het_outliers_3sd_fids` | people outside mean ± 3 SD of het_rate: all, below, above, their FIDs |
| `het_f_abs_gt_0_1`, `het_f_gt_0_1`, `het_f_lt_minus_0_1`, `het_f_fids` | people with \|F\| > 0.1, F > 0.1, F < −0.1, their FIDs |
| `het_both_rules` | people flagged by both rules |
| `het_contaminated_fid`, `het_contaminated_f`, `het_contaminated_rate` | the planted contaminated sample: FID, F, het_rate |
| `het_inbred_fid`, `het_inbred_f`, `het_inbred_rate` | the planted inbred person: FID, F, het_rate |

### Step 6: PCA of the study

| Key | Meaning |
|---|---|
| `pca_snps`, `pca_maf_removed` | variants used by `--pca`, and variants removed by its `--maf 0.05` |
| `pca_eigenvalues`, `pca_eigenval_1`, `pca_eigenval_2`, `pca_eigenval_3`, `pca_eigenval_4` | lines of `Q.LD0.3.eigenval`; the first four, 3 decimals |
| `pca_unpruned_snps` | variants of a PCA without LD pruning (`--maf 0.05 --pca`, not in the practical) |
| `pca_unpruned_inversion_pc`, `pca_unpruned_inversion_r` | in that PCA, the PC most correlated with each person's number of inverted copies of the long-range region, and \|r\| (2 decimals) |
| `pca_pruned_inversion_pc`, `pca_pruned_inversion_r` | the same in the practical's pruned PCA |

### Step 7: merge with the reference panel, and its PCA

| Key | Meaning |
|---|---|
| `merge1_exit_code`, `merge1_missnp` | exit code of the first `--bmerge` (3: variants with 3+ alleles) and lines of its `-merge.missnp` |
| `merge1_ref_only_snps`, `merge1_shared_snps` | "Of these, N are new, while M are present in the base dataset." (variants) |
| `flip_snps` | "--flip: N SNPs flipped." |
| `merge2_people`, `merge2_snps` | "Performing single-pass merge (N people, M variants)." of the second merge |
| `merged_geno_removed`, `merged_maf_removed`, `merged_pca_snps`, `merged_pca_people` | the merged PCA (`--geno 0.1 --maf 0.05 --pca`): variants removed by each filter, variants and people used |
| `sim_palindromic_swapped` | shared A/T or C/G SNPs whose strand differs between study and panel (`truth.json`); the merge cannot see them |
| `sim_palindromic_swapped_ids` | their IDs |

### Step 8: GrafAnc

| Key | Meaning |
|---|---|
| `update_ids_people` | "--update-ids: N people updated." |
| `grafanc_ref_snps` | "Total N SNPs in …AncSnpPopAFs.txt" (the emulator's toy reference) |
| `grafanc_bim_snps`, `grafanc_anc_snps`, `grafanc_used_snps` | "Total N SNPs in bim file. M SNPs are ancestry SNPs." and "N SNPs have expected alleles …" |
| `grafanc_samples` | rows of `toy_grafanc_out.txt` |
| `grafanc_afr`, `grafanc_men`, `grafanc_eur`, `grafanc_sas`, `grafanc_eas`, `grafanc_amr`, `grafanc_ocn`, `grafanc_mix` | people per continental group (`AncGroupID %/% 100` = 1 … 8, as in the practical's R code) |
| `grafanc_eur_percent` | share of `grafanc_eur`, 1 decimal |

### The exercise's worked solution

The removal list is built as qc-exercise's awk programs build it (heterozygosity rate outside mean ± 3 SD;
for each pair with PI_HAT > 0.1875 and no heterozygosity failure, the person with the larger F_MISS), then
its final command runs: `--bfile Q --remove … --hwe 1e-6 --make-bed` (outputs `toy.extra.exercise_*`).

| Key | Meaning |
|---|---|
| `exercise_removed` | lines of the removal list (`toy.remove.txt` on the page) |
| `exercise_hwe_removed` | "--hwe: N variants removed due to Hardy-Weinberg exact test." |
| `exercise_people`, `exercise_snps` | lines of the cleaned fileset's .fam and .bim (`toy.qc` on the page) |

### Provenance

| Key | Meaning |
|---|---|
| `plink_version`, `grafanc_version` | the emulators' version strings |
| `card_source` | how the card was made, and how it was checked against real PLINK and GrafAnc |

### TOY_PEOPLE

`data-card.js` also defines `window.TOY_PEOPLE`: each study person's simulated group and planted
problem, for plots that reveal them on request (these are spoilers). It is keyed by the FID of
`toy.fam`, quotes included (`'"80001"'`). Each entry is `{group, super, planted, ancestry?, pair?}`:

- `group`: the population (`CEU`, `GBR`, `TSI`, `YRI`, `LWK`, `CHB`, `JPT`, `CHS`, `GIH`, `PJL`,
  `BEB`) or `ADMIXED`.
- `super`: `EUR`, `AFR`, `EAS`, `SAS` or `ADMIXED`.
- `planted`: the person's role in `truth.json` (`duplicate`, `parent`, `offspring`, `full_sibling`,
  `half_sibling`, `contaminated`, `inbred`, `degraded` or `low_quality`), or `null` for everyone else.
- `ancestry`: admixed people only, their proportions, such as `{AFR: 0.5, EUR: 0.5}`.
- `pair`: planted relatives only, the FID of the other member of the pair, quotes included.

In Node, `require("…/data-card.js")` returns `{TOY_CARD, TOY_PEOPLE}`.
