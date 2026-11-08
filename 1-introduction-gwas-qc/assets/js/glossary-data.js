/* Lecture 1 glossary entries. Lecture 0's entries are loaded first (../0-biological-foundations/assets/js/
   glossary-data.js); the next line keeps them, and site.js merges both lists (an entry here with the same id
   as a Lecture 0 entry overrides it). Fields: id, term, aka[], short (HTML), long (HTML), l1 (Lecture 1
   slides), see[] (ids), links[] ({t,u}), match[] (strings to auto-link), cs (case-sensitive), auto (false =
   never auto-link), noPlural, owner (page key). Generated from assets/js/glossary-parts/*.json by
   tools/build_glossary.py; edit the parts, then rebuild. */
window.GLOSSARY_L0 = window.GLOSSARY_ENTRIES || [];
window.GLOSSARY_ENTRIES = [
 {
  "id": "absolute-risk",
  "term": "Absolute risk",
  "aka": [
   "cumulative risk"
  ],
  "short": "The probability that a person develops a disease over a stated period, such as 10 years or a lifetime. Unlike a relative risk or an odds ratio, it depends on how common the disease is, and it is what a person needs in order to make a decision.",
  "long": "<p>A relative risk of 3 means 3% instead of 1% for a rare disease but 30% instead of 10% for a common one. The absolute risk of people with a high polygenic score therefore depends both on the score’s relative risk and on the incidence of the disease at their age, sex and ancestry. Risk models such as BOADICEA combine a polygenic score with family history and other risk factors and turn the result into an absolute risk for one person.</p>",
  "l1": "Slide 51 (Session 6 covers polygenic risk scores); page 10 (from relative to absolute risk); page 1 (risk-stratified screening).",
  "see": [
   "relative-risk",
   "odds-ratio",
   "prevalence",
   "incidence",
   "polygenic-score",
   "risk-stratified-screening",
   "boadicea"
  ],
  "links": [
   {
    "t": "Lewis & Vassos 2020, Genome Med: polygenic risk scores, from research tools to clinical instruments",
    "u": "https://doi.org/10.1186/s13073-020-00742-5"
   }
  ],
  "match": [
   "absolute risk"
  ],
  "owner": "gwas-applications"
 },
 {
  "id": "admixture-proportion",
  "term": "admixture proportion (ancestry proportion)",
  "aka": [
   "ancestry proportion",
   "Q matrix",
   "global ancestry proportion"
  ],
  "short": "In STRUCTURE-type models, the fraction of a person's allele copies that the model assigns to each of K fitted ancestral components. A person's K proportions are non-negative and add up to 1; they depend on K and on which people are analyzed.",
  "long": "<p>The model draws each allele copy of person \\(i\\) from component \\(k\\) with probability \\(q_{ik}\\), so the genotype at SNP \\(j\\) is \\(\\Binomial(2, \\sum_k q_{ik} f_{kj})\\), where \\(f_{kj}\\) is the component's allele frequency. ADMIXTURE writes the estimates to its <code>.Q</code> file (one row per person, one column per component), and bar plots draw each row as one stacked bar.</p><p>A proportion is a property of the fit, not of the person's family tree: with a different \\(K\\), different reference samples or a population missing from the sample, the same person gets different proportions (Lawson et al. 2018).</p>",
  "l1": "Slides 99–101; the bar plots of slide 100; the ADMIXTURE widget on page 7.",
  "see": [
   "structure-admixture",
   "admixture",
   "local-ancestry",
   "genetic-ancestry"
  ],
  "links": [
   {
    "t": "Lawson, van Dorp & Falush 2018, how not to over-interpret STRUCTURE and ADMIXTURE bar plots",
    "u": "https://doi.org/10.1038/s41467-018-05257-7"
   },
   {
    "t": "Alexander, Novembre & Lange 2009 (ADMIXTURE)",
    "u": "https://doi.org/10.1101/gr.094052.109"
   }
  ],
  "match": [
   "admixture proportion",
   "admixture proportions",
   "ancestry proportion",
   "ancestry proportions"
  ],
  "noPlural": true,
  "owner": "population-structure"
 },
 {
  "id": "akt",
  "term": "akt (Ancestry and Kinship Toolkit)",
  "short": "Illumina's command-line program for ancestry and relatedness from sequencing data. The practical runs none of it: it clones the akt repository only for the 1000 Genomes sample panel file stored there.",
  "see": [
   "git",
   "thousand-genomes",
   "super-population"
  ],
  "links": [
   {
    "t": "Arthur et al. 2017",
    "u": "https://doi.org/10.1093/bioinformatics/btw576"
   },
   {
    "t": "github.com/Illumina/akt",
    "u": "https://github.com/Illumina/akt"
   }
  ],
  "match": [
   "akt",
   "Ancestry and Kinship Toolkit"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "tools"
 },
 {
  "id": "alkaptonuria",
  "term": "Alkaptonuria",
  "aka": [],
  "short": "A rare inherited disorder in which homogentisic acid, formed when the amino acids phenylalanine and tyrosine are broken down, cannot be broken down further; it is excreted in the urine, which darkens on standing.",
  "long": "<p>In 1902 Archibald Garrod noted that alkaptonuria was common among the children of first-cousin marriages and interpreted it as a recessive Mendelian trait: the first human disease explained by Mendel’s laws. He later counted it among the inborn errors of metabolism. The gene, <em>HGD</em>, which encodes the enzyme homogentisate 1,2-dioxygenase, was identified in 1996.</p>",
  "l1": "Slide 28: Garrod’s work on alkaptonuria began clinical genetics (page 2).",
  "see": [
   "inborn-error-of-metabolism",
   "recessive",
   "mendelian-genetics",
   "enzyme"
  ],
  "links": [
   {
    "t": "Fernández-Cañón et al. 1996, Nature Genetics",
    "u": "https://doi.org/10.1038/ng0996-19"
   }
  ],
  "match": [
   "alkaptonuria"
  ],
  "noPlural": true,
  "owner": "field-map"
 },
 {
  "id": "allele-coding",
  "term": "Allele coding",
  "aka": [
   "genotype coding",
   "counted-allele convention"
  ],
  "short": "The rule that turns genotypes into numbers: usually the count, 0, 1 or 2, of one chosen allele (the counted allele). Which allele is counted differs between files and programs, so the rule must travel with the numbers.",
  "long": "<p>At a SNP with alleles C and T, counting C codes the genotypes TT, CT and CC as 0, 1 and 2; counting T codes them as 2, 1 and 0. PLINK 1.9 counts its A1 allele (made the minor allele when it writes a fileset), a VCF's dosage counts ALT, and PLINK 2's <code>--export A</code> counts REF by default.</p><p>Switching the counted allele replaces each count g by 2 − g, the allele frequency p by 1 − p, a regression slope β by −β (the intercept α by α + 2β), and an odds ratio by its reciprocal; fit statistics and p-values do not change. Other codings exist for other models: dominant coding (1 if at least one copy, else 0) and recessive coding (1 only for two copies).</p>",
  "l1": "Page 4 shows which allele each file format counts and lets you switch the counted allele in a small dataset.",
  "see": [
   "allele-dosage",
   "allele-swap",
   "plink-a1",
   "effect-allele",
   "minor-allele",
   "reference-allele"
  ],
  "links": [
   {
    "t": "PLINK 1.9: --recode A and --keep-allele-order",
    "u": "https://www.cog-genomics.org/plink/1.9/data#recode"
   },
   {
    "t": "PLINK 2.0: --export A counts REF by default",
    "u": "https://www.cog-genomics.org/plink/2.0/data#export"
   }
  ],
  "match": [
   "allele coding",
   "genotype coding",
   "counted allele",
   "counted alleles"
  ],
  "owner": "snp-data"
 },
 {
  "id": "antigen",
  "term": "Antigen",
  "aka": [],
  "short": "A molecular structure that the immune system can recognize. The A and B antigens are sugars on the surface of red blood cells that define the ABO blood groups.",
  "long": "<p>A person makes antibodies against the ABO antigens they lack: a group O person makes anti-A and anti-B antibodies. A blood test detects antigens, so it sees blood groups, not genotypes: it cannot tell AA from AO.</p>",
  "l1": "Slide 71 and page 5 (the ABO blood group).",
  "see": [
   "abo-blood-group",
   "codominant"
  ],
  "links": [],
  "match": [
   "antigen"
  ],
  "owner": "frequencies-hwe"
 },
 {
  "id": "assortative-mating",
  "term": "Assortative mating",
  "aka": [
   "cross-trait assortative mating"
  ],
  "short": "The tendency of people to choose partners who resemble them in a trait, such as height or education, more than random pairs do. It correlates alleles that affect the trait within the children’s genomes and so changes GWAS estimates, heritabilities and genetic correlations.",
  "long": "<p>If tall people tend to have tall partners, their children inherit height-raising alleles from both parents together, so such alleles at different loci become correlated. A GWAS of unrelated people then picks up part of the effects of other loci at each SNP, and estimates of heritability from unrelated people are biased. In cross-trait assortative mating, one trait of a person correlates with a different trait of the partner; the children then carry alleles for both traits together, which creates a genetic correlation between the traits without any shared biology. Within-family designs remove these effects.</p>",
  "l1": "Page 10 (genetic correlation, and direct effects, indirect effects and assortative mating).",
  "see": [
   "genetic-correlation",
   "within-family-gwas",
   "direct-genetic-effect",
   "snp-heritability",
   "ld"
  ],
  "links": [
   {
    "t": "Border et al. 2022, Science: cross-trait assortative mating inflates genetic correlation estimates",
    "u": "https://doi.org/10.1126/science.abo2059"
   },
   {
    "t": "Border et al. 2022, Nat Commun: assortative mating biases marker-based heritability estimators",
    "u": "https://doi.org/10.1038/s41467-022-28294-9"
   }
  ],
  "match": [
   "assortative mating",
   "cross-trait assortative mating"
  ],
  "owner": "gwas-applications"
 },
 {
  "id": "auc",
  "term": "AUC (area under the ROC curve)",
  "aka": [
   "area under the curve",
   "C statistic",
   "concordance statistic"
  ],
  "short": "A measure of how well a score separates people who have or will get a disease from those who do not: the probability that a randomly chosen case has a higher score than a randomly chosen non-case. 0.5 is no better than chance; 1 is perfect separation.",
  "long": "<p>The AUC is the area under the ROC curve, which plots the true-positive rate against the false-positive rate as the cut-off moves. It does not depend on how common the disease is, which makes it easy to compare across studies but says nothing about absolute risk: when a disease is rare, even a score with a high AUC gives most people who test positive a low risk. Wray and colleagues showed how the AUC of a polygenic score follows from the variance it explains on the liability scale and the prevalence, so the SNP-heritability sets a ceiling on the AUC of any polygenic score.</p>",
  "l1": "Slide 51 (Session 6 covers polygenic risk scores); page 10 (the accuracy of polygenic scores) and its widget.",
  "see": [
   "roc-curve",
   "sensitivity-specificity",
   "polygenic-score",
   "absolute-risk",
   "liability-scale",
   "net-reclassification-index"
  ],
  "links": [
   {
    "t": "Wray et al. 2010, PLoS Genet: the genetic interpretation of area under the ROC curve",
    "u": "https://doi.org/10.1371/journal.pgen.1000864"
   }
  ],
  "match": [
   "AUC",
   "area under the ROC curve",
   "area under the receiver operating characteristic curve",
   "area under the curve"
  ],
  "owner": "gwas-applications"
 },
 {
  "id": "balding-nichols-model",
  "term": "Balding–Nichols model",
  "short": "A model of allele frequencies in related populations: each population’s frequency is drawn around a shared ancestral frequency p, with variance F<sub>ST</sub> · p(1 − p).",
  "long": "<p>Each population’s allele frequency follows a beta distribution with mean p and variance F<sub>ST</sub> · p(1 − p), so populations differ more when F<sub>ST</sub> is larger. Balding and Nichols introduced it in 1995 for forensic inference from DNA profiles, to allow for differentiation between populations; it is also a common way to simulate population structure, as on pages 3 and 7.</p>",
  "l1": "Page 3, stratification simulator; page 7, simulated populations.",
  "see": [
   "fst",
   "population-stratification"
  ],
  "links": [
   {
    "t": "Balding & Nichols 1995",
    "u": "https://doi.org/10.1007/BF01441146"
   }
  ],
  "match": [
   "Balding–Nichols model",
   "Balding-Nichols model"
  ],
  "noPlural": true,
  "owner": "social-context"
 },
 {
  "id": "barycentric-coordinates",
  "term": "Barycentric coordinates",
  "short": "Three weights that add up to 1 and express a point in the plane of a triangle as a weighted average of the triangle's corners. Inside the triangle all three lie between 0 and 1; outside it, at least one is negative.",
  "l1": "GrafAnc's Pe, Pf and Pa are 100 times a person's barycentric coordinates in its European–African–East Asian triangle, with negative weights set to 0 and the rest rescaled.",
  "see": [
   "grafanc"
  ],
  "match": [
   "barycentric coordinate"
  ],
  "owner": "tools"
 },
 {
  "id": "bayes-factor",
  "term": "Bayes factor",
  "aka": [
   "approximate Bayes factor",
   "ABF"
  ],
  "short": "The ratio of how probable the data are under one hypothesis to how probable they are under another, for example under ‘this SNP has an effect’ against ‘no effect’. Multiplying the prior odds by the Bayes factor gives the posterior odds.",
  "long": "<p>Wakefield’s approximate Bayes factor needs only a SNP’s z-score, the sampling variance \\(V = \\mathrm{SE}^2\\) of its estimate and a prior variance \\(W\\) for true effects: \\(\\mathrm{ABF} = \\sqrt{V/(V+W)}\\,\\exp\\!\\big(z^2 W/(2(V+W))\\big)\\). It grows very quickly with \\(|z|\\), so in a fine-mapped region the SNPs with the largest z-scores receive almost all of the posterior probability. Unlike a p-value, it depends on the prior variance and on the sample size through \\(V\\).</p>",
  "l1": "Slide 49 (Session 4 covers fine-mapping and colocalization); page 9 (fine-mapping).",
  "see": [
   "posterior-inclusion-probability",
   "fine-mapping",
   "credible-set",
   "z-score",
   "colocalization"
  ],
  "links": [
   {
    "t": "Wakefield 2009, Genet Epidemiol: Bayes factors for genome-wide association studies",
    "u": "https://doi.org/10.1002/gepi.20359"
   }
  ],
  "match": [
   "Bayes factor",
   "approximate Bayes factor",
   "ABF"
  ],
  "owner": "gwas-analysis"
 },
 {
  "id": "bcftools",
  "term": "bcftools",
  "aka": [
   "BCFtools"
  ],
  "short": "A command-line program for VCF and BCF files: viewing, filtering, merging, querying and summarizing variant calls. It is built on the htslib library.",
  "l1": "The practical loads the Biowulf bcftools module before GrafAnc but never runs bcftools; page 13 explains the most likely reason.",
  "see": [
   "htslib",
   "vcf",
   "grafanc"
  ],
  "links": [
   {
    "t": "Danecek et al. 2021",
    "u": "https://doi.org/10.1093/gigascience/giab008"
   },
   {
    "t": "bcftools manual",
    "u": "https://samtools.github.io/bcftools/bcftools.html"
   }
  ],
  "match": [
   "bcftools"
  ],
  "noPlural": true,
  "owner": "tools"
 },
 {
  "id": "bermuda-principles",
  "term": "Bermuda Principles",
  "aka": [
   "Bermuda Accord"
  ],
  "short": "Rules agreed in Bermuda in February 1996 by the publicly funded centers of the Human Genome Project: DNA sequence should be released into public databases within 24 hours of assembly, free of restrictions. They set the norm of rapid, open release of genomic data.",
  "long": "<p>The Fort Lauderdale Agreement of 2003 extended rapid release to other large community resource projects, while asking users to respect the data producers’ right to publish the first analyses. Consortia and the open release of GWAS summary statistics build on these agreements. The reading dates the principles to 1997, the year of a second Bermuda meeting that reaffirmed them.</p>",
  "l1": "Page 10 (data sharing).",
  "see": [
   "fair-principles",
   "summary-statistics",
   "ga4gh"
  ],
  "links": [
   {
    "t": "Maxson Jones, Ankeny & Cook-Deegan 2018, J Hist Biol: the Bermuda Triangle",
    "u": "https://doi.org/10.1007/s10739-018-9538-7"
   }
  ],
  "match": [
   "Bermuda Principles",
   "Bermuda Accord"
  ],
  "noPlural": true,
  "owner": "gwas-applications"
 },
 {
  "id": "bim-file",
  "term": ".bim file (PLINK variant file)",
  "aka": [
   "PLINK extended map file"
  ],
  "short": "The text file of a PLINK binary fileset that lists the variants, one line each in the order their genotypes are stored in the .bed file. It has no header and six columns: chromosome, variant ID, genetic position, base-pair position, allele 1 (A1) and allele 2 (A2).",
  "long": "<p>The genetic position (in morgans or centimorgans) is often 0. The base-pair position is 1-based on the genome build the data were made on. A1 is the allele whose copies PLINK counts; PLINK 1.9 makes it the minor (less frequent) allele whenever it writes a fileset, unless told to keep the order. A SNP at which only one allele was seen has a placeholder in the A1 column.</p><p>As with the .fam file, the line number is the link to the genotypes: line <em>j</em> of the .bim file describes the <em>j</em>th block of the .bed file.</p>",
  "l1": "The practical's <code>penncath.bim</code> has 861,473 lines; page 12 shows them column by column.",
  "see": [
   "plink-binary",
   "fam-file",
   "plink-a1",
   "snp-major",
   "genome-build"
  ],
  "links": [
   {
    "t": "PLINK 1.9 file formats: .bim",
    "u": "https://www.cog-genomics.org/plink/1.9/formats#bim"
   }
  ],
  "match": [
   ".bim file",
   "bim file"
  ],
  "owner": "plink-data"
 },
 {
  "id": "binomial-distribution",
  "term": "Binomial distribution",
  "aka": [],
  "short": "The distribution of the number of successes in N independent trials that each succeed with the same probability p. Its mean is Np and its variance Np(1 − p).",
  "long": "<p>Under Hardy–Weinberg proportions the number of copies of an allele among \\(2n\\) allele copies is binomial with \\(N = 2n\\), and a person's genotype, 0, 1 or 2 copies, is binomial with \\(N = 2\\), which gives \\(q^2\\), \\(2pq\\) and \\(p^2\\) (slide 82). With more than two alleles the multinomial distribution takes its place.</p>",
  "l1": "Slide 82; page 5 uses it for the likelihood and the standard error of an allele frequency.",
  "see": [
   "hwe",
   "standard-error",
   "maximum-likelihood-estimate"
  ],
  "links": [],
  "match": [
   "binomial distribution"
  ],
  "owner": "frequencies-hwe"
 },
 {
  "id": "bioconda",
  "term": "Bioconda",
  "short": "A channel (a collection of conda packages) for bioinformatics software, including PLINK, bcftools and htslib.",
  "see": [
   "conda"
  ],
  "links": [
   {
    "t": "Grüning et al. 2018",
    "u": "https://doi.org/10.1038/s41592-018-0046-7"
   },
   {
    "t": "bioconda.github.io",
    "u": "https://bioconda.github.io/"
   }
  ],
  "match": [
   "Bioconda"
  ],
  "noPlural": true,
  "owner": "tools"
 },
 {
  "id": "boadicea",
  "term": "BOADICEA",
  "aka": [
   "Breast and Ovarian Analysis of Disease Incidence and Carrier Estimation Algorithm",
   "CanRisk"
  ],
  "short": "A model that computes a woman’s risk of breast and ovarian cancer from her family history, rare variants in genes such as BRCA1 and BRCA2, a polygenic score, questionnaire risk factors and mammographic density. Clinicians use it through the CanRisk web tool.",
  "long": "<p>BOADICEA models the family’s cancers as the result of rare high-risk variants plus a polygenic component and combines that with the woman’s own risk factors as relative risks on population cancer rates. The 2019 version (Lee et al.) added a 313-SNP polygenic score, questionnaire risk factors and mammographic density; with all of them, predicted lifetime risks in the UK range from 2.8% (1st percentile) to 30.6% (99th percentile).</p>",
  "l1": "Slide 20 is a figure from the paper that describes this version of BOADICEA.",
  "see": [
   "risk-stratified-screening",
   "polygenic-score",
   "brca1-brca2"
  ],
  "links": [
   {
    "t": "Lee et al. 2019, Genetics in Medicine",
    "u": "https://doi.org/10.1038/s41436-018-0406-9"
   },
   {
    "t": "CanRisk tool",
    "u": "https://www.canrisk.org/"
   }
  ],
  "match": [
   "BOADICEA",
   "CanRisk"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "genetic-epidemiology"
 },
 {
  "id": "bolt-lmm",
  "term": "BOLT-LMM",
  "aka": [],
  "short": "A program for GWAS with a linear mixed model in very large samples such as UK Biobank. It never builds the genetic relationship matrix, and its prior lets a few SNPs have larger effects, which raises power for many traits.",
  "long": "<p>BOLT-LMM fits the polygenic background with iterative algorithms whose running time grows roughly as the number of SNPs times the number of people to the power 1.5, far more slowly than methods that build and decompose the full relationship matrix. Its Bayesian mixture prior (most SNPs with tiny effects, a few with larger ones) predicts the background better than the standard model of equal small effects when a trait has some loci of larger effect. It treats a disease as a 0/1 quantitative trait; its authors consider this well calibrated in UK Biobank when at least 10% of people are cases, and recommend SAIGE or REGENIE for rarer diseases.</p>",
  "l1": "Page 9 (relatedness and mixed models); page 8 lists it among association tools.",
  "see": [
   "mixed-model",
   "genetic-relationship-matrix",
   "loco",
   "saige",
   "regenie"
  ],
  "links": [
   {
    "t": "Loh et al. 2015, Nat Genet",
    "u": "https://doi.org/10.1038/ng.3190"
   },
   {
    "t": "Loh et al. 2018, Nat Genet: mixed-model association for biobank-scale datasets",
    "u": "https://doi.org/10.1038/s41588-018-0144-6"
   },
   {
    "t": "BOLT-LMM manual",
    "u": "https://alkesgroup.broadinstitute.org/BOLT-LMM/BOLT-LMM_manual.html"
   }
  ],
  "match": [
   "BOLT-LMM"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "gwas-analysis"
 },
 {
  "id": "brca1-brca2",
  "term": "BRCA1 and BRCA2",
  "aka": [
   "BRCA genes"
  ],
  "short": "Two genes whose proteins help repair broken DNA. Pathogenic variants in either gene, carried by about 1 in 400 people, raise the risk of breast cancer by age 80 to about 70% and of ovarian cancer to 17% (BRCA2) or 44% (BRCA1).",
  "long": "<p>The risks to age 80 come from a prospective study of 6,036 <em>BRCA1</em> and 3,820 <em>BRCA2</em> carriers (Kuchenbaecker et al. 2017): breast cancer 72% and 69%, ovarian cancer 44% and 17%. For comparison, about 13% of women in the United States develop breast cancer and about 1.1% ovarian cancer in their lifetime. Carriers are found by testing people with a strong family history and, increasingly, by testing their relatives once a variant is known in the family. The prevalence is higher in some groups, for example about 2% of people of Ashkenazi Jewish ancestry, because of founder variants.</p>",
  "l1": "Slide 19: “Predictive: screening those with rare risk variants – BRCA1/BRCA2”.",
  "see": [
   "penetrance",
   "risk-stratified-screening",
   "lynch-syndrome"
  ],
  "links": [
   {
    "t": "NCI fact sheet: BRCA gene changes",
    "u": "https://www.cancer.gov/about-cancer/causes-prevention/genetics/brca-fact-sheet"
   },
   {
    "t": "Kuchenbaecker et al. 2017, JAMA",
    "u": "https://doi.org/10.1001/jama.2017.7112"
   }
  ],
  "match": [
   "BRCA1",
   "BRCA2",
   "BRCA1/BRCA2",
   "BRCA1/2"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "genetic-epidemiology"
 },
 {
  "id": "candidate-gene",
  "term": "Candidate gene (candidate gene study)",
  "aka": [
   "candidate gene study",
   "candidate-gene association study"
  ],
  "short": "A gene suspected, from its known biology or its position near an association, of influencing a trait. A candidate gene study tests variants in a few such genes chosen in advance; most of its reported associations with complex traits failed to replicate.",
  "long": "<p>Before genome-wide arrays, studies picked genes by hypothesis and genotyped a handful of variants, often in a few hundred people. Small samples, lenient thresholds and the publication of positive results produced many false positives: a review of 166 associations studied three or more times found only 6 consistently replicated, and a 2019 study of up to 443,264 people found no support for 18 widely studied candidate genes for depression. A GWAS tests the whole genome without a prior choice, with a threshold that allows for the number of tests. After a GWAS, the genes near an associated locus are again called candidate genes: candidates for the causal gene, to be tested by fine-mapping, colocalization and experiments.</p>",
  "l1": "Page 8 (what a GWAS is); page 2 (agnostic designs); page 1 (candidate genes from TWAS).",
  "see": [
   "gwas",
   "replication",
   "multiple-testing",
   "type-1-error",
   "post-gwas-studies"
  ],
  "links": [
   {
    "t": "Hirschhorn et al. 2002, Genet Med: a comprehensive review of genetic association studies",
    "u": "https://doi.org/10.1097/00125817-200203000-00002"
   },
   {
    "t": "Border et al. 2019, Am J Psychiatry: no support for historical candidate gene hypotheses for depression",
    "u": "https://doi.org/10.1176/appi.ajp.2018.18070881"
   }
  ],
  "match": [
   "candidate gene",
   "candidate gene study",
   "candidate-gene study",
   "candidate-gene"
  ],
  "owner": "gwas-design"
 },
 {
  "id": "checksum",
  "term": "Checksum (SHA-256, MD5)",
  "aka": [
   "hash"
  ],
  "short": "A fixed-length number computed from every byte of a file and written in hexadecimal digits: 64 for SHA-256, 32 for MD5. If a download's SHA-256 checksum equals the published one, the file arrived complete and unchanged.",
  "long": "<p>On macOS run <code>shasum -a 256 FILE</code>, on Linux and WSL <code>sha256sum FILE</code>. Changing a single byte of the file changes the checksum completely, and two different files with the same SHA-256 checksum have never been found. MD5 is an older, shorter checksum that still detects accidental damage such as a truncated download.</p>",
  "match": [
   "checksum",
   "SHA-256",
   "MD5"
  ],
  "owner": "setup"
 },
 {
  "id": "chi-square-distribution",
  "term": "Chi-square distribution",
  "aka": [
   "χ² distribution"
  ],
  "short": "The distribution of a sum of squares of independent standard normal variables; the number of squares is its degrees of freedom. With 1 degree of freedom, 5% of it lies above 3.84.",
  "long": "<p>Pearson's chi-square statistic follows it approximately when the null hypothesis is true and the expected counts are large. The 5% cutoffs are 3.84 (1 degree of freedom), 5.99 (2) and 7.81 (3).</p>",
  "l1": "Page 5 reads Hardy–Weinberg p-values from it; association tests with 1 degree of freedom use the same distribution.",
  "see": [
   "chi-square-test",
   "degrees-of-freedom",
   "normal-distribution"
  ],
  "links": [],
  "match": [
   "chi-square distribution",
   "chi-squared distribution"
  ],
  "owner": "frequencies-hwe"
 },
 {
  "id": "chi-square-test",
  "term": "Chi-square test (Pearson's)",
  "aka": [
   "Pearson's chi-square test",
   "χ² test"
  ],
  "short": "A test that compares observed counts with the counts expected under a null hypothesis through X² = Σ(O − E)²/E, and reads the p-value from a chi-square distribution. The approximation needs expected counts of about 5 or more.",
  "long": "<p>For Hardy–Weinberg proportions at a SNP the expected counts are \\(n\\hat{p}^2\\), \\(2n\\hat{p}\\hat{q}\\) and \\(n\\hat{q}^2\\), and the statistic has 1 degree of freedom. For the MTHFR counts of slide 74, \\(X^2 = 0.47\\) and the p-value is 0.49. When an allele is rare the expected number of rare homozygotes is far below 5 and the test gives far too many small p-values, which is why PLINK reports the exact test.</p>",
  "l1": "Page 5 computes it for MTHFR and ABO and compares it with the exact test.",
  "see": [
   "exact-test",
   "chi-square-distribution",
   "degrees-of-freedom",
   "expected-count",
   "hwe"
  ],
  "links": [
   {
    "t": "Wigginton et al. 2005: when the chi-square HWE test misleads",
    "u": "https://doi.org/10.1086/429864"
   }
  ],
  "match": [
   "chi-square test",
   "chi-squared test",
   "chi-square goodness-of-fit test"
  ],
  "owner": "frequencies-hwe"
 },
 {
  "id": "chromosome-conformation-capture",
  "term": "Chromosome conformation capture (3C, Hi-C)",
  "aka": [
   "3C",
   "4C",
   "5C",
   "Hi-C",
   "promoter capture Hi-C"
  ],
  "short": "A family of laboratory methods that measure which parts of the genome touch each other inside the nucleus. They can show that an enhancer containing a GWAS variant loops to the promoter of a particular gene, sometimes far away.",
  "long": "<p>Cells are treated with formaldehyde so that DNA segments in contact are cross-linked; the DNA is cut, the cross-linked ends are joined, and the joined pieces are sequenced. 3C tests one chosen pair of sites, 4C one site against all others, 5C many against many, and Hi-C all pairs across the genome; capture Hi-C enriches contacts that involve promoters. A contact supports, but does not prove, that the enhancer regulates that gene.</p>",
  "l1": "Slide 54 (Session 9 covers functional genomics); page 9 (functional follow-up).",
  "see": [
   "enhancer",
   "promoter",
   "chromatin",
   "eqtl"
  ],
  "links": [
   {
    "t": "Lieberman-Aiden et al. 2009, Science: Hi-C",
    "u": "https://doi.org/10.1126/science.1181369"
   },
   {
    "t": "Rao et al. 2014, Cell: a 3D map of the human genome at kilobase resolution",
    "u": "https://doi.org/10.1016/j.cell.2014.11.021"
   }
  ],
  "match": [
   "chromosome conformation capture",
   "Hi-C",
   "promoter capture Hi-C"
  ],
  "noPlural": true,
  "owner": "gwas-analysis"
 },
 {
  "id": "clinical-genetics",
  "term": "Clinical genetics",
  "aka": [
   "medical genetics"
  ],
  "short": "The medical field that diagnoses inherited diseases in patients and their families, works out how they are inherited, and advises families about risks and options.",
  "long": "<p>Clinical genetics began with physicians who followed rare diseases through families and measured their chemistry, such as Garrod’s work on alkaptonuria and other inborn errors of metabolism (1902–1909) and Neel’s on sickle cell anemia (1949). It brought to genetic epidemiology the study of patients with well-defined diagnoses and of the families they come from.</p>",
  "l1": "Slide 28: one of the three traditions joined in genetic epidemiology, represented by Garrod and Neel (page 2).",
  "see": [
   "inborn-error-of-metabolism",
   "hemoglobinopathy",
   "sickle-cell-disease",
   "pharmacogenetics",
   "pedigree"
  ],
  "links": [],
  "match": [
   "clinical genetics",
   "medical genetics"
  ],
  "owner": "field-map"
 },
 {
  "id": "clumping-and-thresholding",
  "term": "Clumping and thresholding (C+T)",
  "aka": [
   "C+T",
   "P+T",
   "pruning and thresholding"
  ],
  "short": "The simplest way to build a polygenic score: keep the most significant SNP in each LD block (clumping), keep only those with p-values below a threshold (thresholding), and weight each by its GWAS effect estimate.",
  "long": "<p>Several thresholds are usually tried (for example 5 × 10⁻⁸, 10⁻⁵, 0.001, 0.05, 0.5 and 1), and the one whose score predicts best in a validation sample is chosen; accuracy must then be measured in a separate test sample, or the choice inflates it. C+T discards SNPs in LD with a stronger one and uses estimates that are not shrunk, so methods that model LD and shrink effects jointly, such as LDpred2 and PRS-CS, usually predict better, especially for highly polygenic traits.</p>",
  "l1": "Slide 51 (Session 6 covers polygenic risk scores; its practical compares C+T with LDpred2); page 10 (methods for polygenic scores).",
  "see": [
   "polygenic-score",
   "ld-clumping",
   "ldpred",
   "prs-cs",
   "winners-curse"
  ],
  "links": [
   {
    "t": "Choi, Mak & O’Reilly 2020, Nat Protoc: a guide to performing polygenic risk score analyses",
    "u": "https://doi.org/10.1038/s41596-020-0353-1"
   },
   {
    "t": "Choi & O’Reilly 2019, GigaScience: PRSice-2",
    "u": "https://doi.org/10.1093/gigascience/giz082"
   }
  ],
  "match": [
   "clumping and thresholding",
   "C+T",
   "P+T",
   "pruning and thresholding"
  ],
  "noPlural": true,
  "owner": "gwas-applications"
 },
 {
  "id": "coalescence-time",
  "term": "coalescence time",
  "aka": [
   "time to the most recent common ancestor",
   "TMRCA"
  ],
  "short": "For two allele copies, the number of generations back to their most recent common ancestor copy. Copies from the same population usually coalesce more recently than copies from different populations.",
  "long": "<p>In a Wright–Fisher population of \\(N\\) people two copies coalesce with probability \\(1/(2N)\\) per generation, so their expected coalescence time is \\(2N\\) generations. McVean (2009) showed that the expected entries of the genetic relationship matrix, and therefore the PCs, are determined by the average coalescence times between pairs of people relative to the sample average, which is why the positions on a PC plot depend on how many people from each population are sampled.</p>",
  "l1": "Page 7, what PCs depend on.",
  "see": [
   "coalescent",
   "genetic-drift",
   "pca"
  ],
  "links": [
   {
    "t": "McVean 2009, A genealogical interpretation of PCA",
    "u": "https://doi.org/10.1371/journal.pgen.1000686"
   }
  ],
  "match": [
   "coalescence time",
   "coalescence times"
  ],
  "noPlural": true,
  "owner": "population-structure"
 },
 {
  "id": "coalescent",
  "term": "coalescent",
  "aka": [
   "coalescent simulation",
   "coalescent with recombination"
  ],
  "short": "A model that traces the ancestry of sampled chromosome copies backward in time: two lineages merge (coalesce) with probability 1/(2N) per generation in a population of N people, and recombination splits a lineage in two. It is the usual way to simulate genetic data quickly.",
  "long": "<p>Instead of simulating every person in every generation, a coalescent simulation follows only the ancestors of the sample, then places mutations on the branches of the resulting genealogy; copies below a mutated branch carry the new allele. Hudson's program ms (2002) is the classic implementation; the LD heatmap widget on page 6 uses the same algorithm.</p>",
  "l1": "Page 6, the heatmap widget's simulation.",
  "see": [
   "genetic-drift",
   "effective-population-size",
   "recombination"
  ],
  "match": [
   "coalescent"
  ],
  "owner": "linkage-disequilibrium"
 },
 {
  "id": "cochran-q",
  "term": "Cochran’s Q (heterogeneity statistic)",
  "aka": [
   "Cochran's Q",
   "Q statistic",
   "I²"
  ],
  "short": "A test of whether several estimates of the same quantity differ by more than their standard errors allow: the weighted sum of squared differences between each estimate and their inverse-variance-weighted average.",
  "long": "<p>For \\(K\\) estimates \\(\\hat{\\beta}_k\\) with standard errors \\(s_k\\), \\(Q = \\sum_k w_k (\\hat{\\beta}_k - \\hat{\\beta}_{\\mathrm{IVW}})^2\\), with weights \\(w_k = 1/s_k^2\\) and \\(\\hat{\\beta}_{\\mathrm{IVW}}\\) the inverse-variance-weighted average of the estimates. If all \\(K\\) estimates share one true value, \\(Q\\) follows a chi-square distribution with \\(K - 1\\) degrees of freedom, so it is about \\(K - 1\\) on average. \\(I^2 = \\max\\big(0, (Q - (K-1))/Q\\big)\\) is the share of the variation beyond chance: 0% for consistent cohorts. In meta-analysis a large \\(Q\\) points to differences between cohorts (in phenotype, ancestry or errors); in Mendelian randomization it points to SNPs with pleiotropic effects.</p>",
  "l1": "Page 9 (meta-analysis and the forest plot) and page 10 (the Mendelian randomization widget reports it).",
  "see": [
   "heterogeneity",
   "inverse-variance-weighting",
   "meta-analysis",
   "chi-square-distribution",
   "horizontal-pleiotropy"
  ],
  "links": [
   {
    "t": "Higgins & Thompson 2002, Stat Med: quantifying heterogeneity in a meta-analysis",
    "u": "https://doi.org/10.1002/sim.1186"
   }
  ],
  "match": [
   "Cochran’s Q",
   "Cochran's Q",
   "Cochran’s heterogeneity statistic",
   "I²"
  ],
  "noPlural": true,
  "owner": "gwas-analysis"
 },
 {
  "id": "conda",
  "term": "conda",
  "aka": [
   "mamba",
   "Miniforge"
  ],
  "short": "A package and environment manager that installs programs and libraries, not only Python packages, into separate environments: folders that each hold their own versions. mamba is a faster program with the same commands.",
  "see": [
   "bioconda"
  ],
  "links": [
   {
    "t": "conda documentation",
    "u": "https://docs.conda.io/"
   }
  ],
  "match": [
   "conda",
   "mamba"
  ],
  "noPlural": true,
  "owner": "tools"
 },
 {
  "id": "conditional-analysis",
  "term": "Conditional analysis",
  "aka": [
   "conditional and joint analysis",
   "GCTA-COJO",
   "stepwise conditional analysis"
  ],
  "short": "Re-testing the SNPs of an associated region with the lead SNP’s genotype added as a covariate. A SNP that stays significant carries an independent (secondary) signal; one that loses its association was associated only through LD with the lead SNP.",
  "long": "<p>Repeating the step with the most significant remaining SNP each time, until none passes the threshold, is stepwise conditional analysis; the number of steps estimates the number of independent signals, but the result depends on the order of selection. GCTA-COJO (conditional and joint analysis) does the same from summary statistics and LD from a reference sample, so it can be applied to a meta-analysis without individual data. Conditional analysis counts signals but does not say which SNP in each signal is causal; Bayesian fine-mapping does that.</p>",
  "l1": "Slide 49 (Session 4 covers fine-mapping); page 9 (from loci to causal variants); page 6 (LD and fine-mapping).",
  "see": [
   "fine-mapping",
   "lead-variant",
   "ld",
   "credible-set",
   "ld-reference-panel",
   "susie"
  ],
  "links": [
   {
    "t": "Yang et al. 2012, Nat Genet: conditional and joint analysis (GCTA-COJO)",
    "u": "https://doi.org/10.1038/ng.2213"
   }
  ],
  "match": [
   "conditional analysis",
   "conditional analyses",
   "conditional and joint analysis",
   "GCTA-COJO"
  ],
  "noPlural": true,
  "owner": "gwas-analysis"
 },
 {
  "id": "confidence-interval",
  "term": "Confidence interval",
  "aka": [
   "CI"
  ],
  "short": "A range computed from the data by a rule that captures the true value in a stated share of samples, usually 95%. The usual 95% interval is the estimate plus or minus 1.96 standard errors.",
  "long": "<p>The 95% describes the rule, not one interval: a given interval either contains the true value or does not. For the MTHFR frequency of C, \\(0.664 \\pm 1.96 \\times 0.0121\\) gives 0.641 to 0.688. For rare alleles this plus-or-minus (Wald) interval can extend below 0 and contains the true value too rarely; Wilson's interval is better.</p>",
  "l1": "Page 5 computes intervals for allele frequencies and shows how often they contain the true value.",
  "see": [
   "standard-error",
   "wald-interval",
   "wilson-interval"
  ],
  "links": [],
  "match": [
   "confidence interval"
  ],
  "owner": "frequencies-hwe"
 },
 {
  "id": "controlled-access",
  "term": "Controlled access",
  "aka": [
   "managed access",
   "data access committee"
  ],
  "short": "A way of sharing data that could identify people: researchers apply, a data access committee checks that the proposed use matches the participants’ consent and the data’s restrictions, and approved users sign an agreement on security and use.",
  "long": "<p>Individual-level genotypes are always shared this way, because a person’s genotypes at a modest number of independent SNPs identify them uniquely. Summary statistics were moved behind controlled access by the NIH in 2008 and opened again for most studies in 2018; summary results of sensitive studies, such as those of stigmatizing traits or of small or isolated communities, stay controlled. Repositories with controlled access include dbGaP, the European Genome-phenome Archive and UK Biobank’s access system.</p>",
  "l1": "Page 10 (privacy and controlled access).",
  "see": [
   "dbgap",
   "data-use-limitation",
   "informed-consent",
   "summary-statistics",
   "fair-principles"
  ],
  "links": [
   {
    "t": "Homer et al. 2008, PLoS Genet",
    "u": "https://doi.org/10.1371/journal.pgen.1000167"
   },
   {
    "t": "Lin, Owen & Altman 2004, Science: genomic research and human subject privacy",
    "u": "https://doi.org/10.1126/science.1095019"
   }
  ],
  "match": [
   "controlled access",
   "controlled-access",
   "managed access",
   "data access committee"
  ],
  "owner": "gwas-applications"
 },
 {
  "id": "coronary-angiography",
  "term": "coronary angiography (cardiac catheterization)",
  "aka": [
   "angiogram",
   "cardiac catheterization"
  ],
  "short": "An X-ray examination of the arteries that supply the heart. A thin tube (catheter) is passed through a blood vessel to the heart, contrast dye is injected, and the X-ray images show where and how much each coronary artery is narrowed.",
  "long": "<p>The narrowing (stenosis) of each vessel is read from the images as the percentage by which its diameter is reduced. Studies such as PennCATH use these readings to define cases (for example, at least one vessel narrowed by 50% or more) and controls (no vessel narrowed by 10% or more), which is a more direct measure of coronary atherosclerosis than a diagnosis code.</p>",
  "l1": "The PennCATH cases and controls were defined from coronary angiograms (page 11).",
  "see": [
   "coronary-artery-disease",
   "atherosclerosis",
   "stenosis",
   "case-definition"
  ],
  "links": [
   {
    "t": "NHLBI: Cardiac catheterization",
    "u": "https://www.nhlbi.nih.gov/health/cardiac-catheterization"
   },
   {
    "t": "MedlinePlus: Coronary angiography",
    "u": "https://medlineplus.gov/ency/article/003876.htm"
   }
  ],
  "match": [
   "coronary angiography",
   "angiography",
   "angiogram",
   "angiographic",
   "cardiac catheterization",
   "catheterization"
  ],
  "owner": "practical-overview"
 },
 {
  "id": "covariance-matrix",
  "term": "covariance matrix",
  "aka": [
   "variance–covariance matrix"
  ],
  "short": "A square table with the covariance of every pair of variables; the diagonal holds the variances. For a data matrix whose columns are centered, it is the transpose of the matrix times the matrix, divided by the number of rows minus 1.",
  "long": "<p>For centered data \\(\\mathbf{X}\\) (\\(n\\) rows, \\(d\\) columns), \\(\\mathbf{C} = \\mathbf{X}^{\\top}\\mathbf{X}/(n - 1)\\) is \\(d \\times d\\). PCA is its eigendecomposition: the eigenvectors are the directions of the principal components and the eigenvalues their variances. Genotype PCA usually works with the \\(n \\times n\\) person-by-person matrix \\(\\mathbf{Z}\\mathbf{Z}^{\\top}/m\\) instead (the genetic relationship matrix), which gives the same components through the singular value decomposition.</p>",
  "l1": "Slide 102 (PCA in general); page 7, PCA in general.",
  "see": [
   "pca",
   "eigenvector",
   "genetic-relationship-matrix",
   "singular-value-decomposition"
  ],
  "links": [
   {
    "t": "Jolliffe & Cadima 2016, Principal component analysis: a review",
    "u": "https://doi.org/10.1098/rsta.2015.0202"
   }
  ],
  "match": [
   "covariance matrix",
   "covariance matrices"
  ],
  "noPlural": true,
  "owner": "population-structure"
 },
 {
  "id": "cpu-architecture",
  "term": "Processor architecture (x86_64, arm64)",
  "aka": [
   "CPU architecture",
   "Apple Silicon",
   "amd64",
   "aarch64"
  ],
  "short": "The instruction set a processor understands. A program is compiled for one: x86_64 (also called amd64) for Intel and AMD processors, or arm64 (aarch64) for Apple Silicon Macs and some cloud machines. A program built for the other one does not run, or runs only under translation.",
  "see": [
   "rosetta-2",
   "docker"
  ],
  "match": [
   "processor architecture",
   "CPU architecture",
   "Apple Silicon"
  ],
  "noPlural": true,
  "owner": "setup"
 },
 {
  "id": "cross-validation",
  "term": "cross-validation",
  "aka": [
   "k-fold cross-validation",
   "CV error"
  ],
  "short": "Judging a model by how well it predicts data it was not fitted to: split the data into parts (folds), fit on all but one part, predict the held-out part, and repeat for each part. The average prediction error compares models, for example different numbers of components K.",
  "long": "<p>ADMIXTURE's <code>--cv</code> option (5 folds by default) hides a fifth of the observed genotypes at a time, refits the model and predicts each hidden genotype from \\(2\\sum_k q_{ik}f_{kj}\\); the screen output reports \"CV error (K=…)\". A lower error suggests a better \\(K\\), but in human data, where populations are connected by migration and clines, there is usually no single true \\(K\\).</p>",
  "l1": "Slide 99 (choosing K); page 7, choosing K.",
  "see": [
   "admixture-proportion",
   "structure-admixture"
  ],
  "links": [
   {
    "t": "Alexander & Lange 2011, Enhancements to the ADMIXTURE algorithm",
    "u": "https://doi.org/10.1186/1471-2105-12-246"
   }
  ],
  "match": [
   "cross-validation",
   "cross validation",
   "CV error"
  ],
  "noPlural": true,
  "owner": "population-structure"
 },
 {
  "id": "data-table",
  "term": "data.table",
  "short": "An R package for large tables. Its fread() reads delimited text files quickly and detects their format, and its syntax DT[i, j, by] selects rows, computes on columns and groups in one expression.",
  "l1": "Every R step of the practical reads PLINK's reports with <code>fread()</code>.",
  "see": [
   "tidyverse"
  ],
  "links": [
   {
    "t": "Introduction to data.table",
    "u": "https://rdatatable.gitlab.io/data.table/articles/datatable-intro.html"
   }
  ],
  "match": [
   "data.table"
  ],
  "noPlural": true,
  "owner": "tools"
 },
 {
  "id": "data-use-limitation",
  "term": "Data use limitation (DUL)",
  "aka": [
   "DUL",
   "consent group"
  ],
  "short": "A short statement, based on participants’ informed consent, of what a shared genomic dataset may be used for.",
  "long": "<p>NIH’s standard categories are general research use; health/medical/biomedical research, which excludes the study of population origins or ancestry; disease-specific research, for example on diabetes and related conditions; and other, customized limits. Modifiers such as use by not-for-profit organizations only can be added. Researchers who receive a controlled-access dataset must keep to its limitation.</p>",
  "l1": "Page 3, Consent and data sharing.",
  "see": [
   "dbgap",
   "informed-consent"
  ],
  "links": [
   {
    "t": "NIH points to consider on data use limitations (2015)",
    "u": "https://www.grants.nih.gov/sites/default/files/flmngr/NIH_PTC_in_Developing_DUL_Statements.pdf"
   }
  ],
  "match": [
   "data use limitation",
   "data use limitations"
  ],
  "noPlural": true,
  "owner": "social-context"
 },
 {
  "id": "dbgap",
  "term": "dbGaP (database of Genotypes and Phenotypes)",
  "aka": [
   "database of Genotypes and Phenotypes"
  ],
  "short": "NIH’s controlled-access repository for individual-level genotype and phenotype data. Researchers apply for access to a dataset and must keep to its data use limitation.",
  "long": "<p>Under the NIH Genomic Data Sharing Policy, investigators funded by NIH deposit genomic data in an NIH-designated repository such as dbGaP. Each dataset is divided into consent groups, and each group carries a data use limitation based on what its participants agreed to.</p>",
  "l1": "Page 3, Consent and data sharing; page 22 (GRAF-pop was written for dbGaP).",
  "see": [
   "data-use-limitation",
   "informed-consent"
  ],
  "links": [
   {
    "t": "dbGaP",
    "u": "https://www.ncbi.nlm.nih.gov/gap/"
   }
  ],
  "match": [
   "dbGaP"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "social-context"
 },
 {
  "id": "degrees-of-freedom",
  "term": "Degrees of freedom (df)",
  "aka": [
   "df"
  ],
  "short": "The number of independent ways the data can depart from the null hypothesis; it picks the chi-square distribution that gives the p-value. For a test of fit it is the number of categories, minus 1, minus the number of parameters estimated from the data.",
  "long": "<p>A Hardy–Weinberg test at a SNP has 3 genotype counts that add up to \\(n\\) and one allele frequency estimated from the same data: \\(3 - 1 - 1 = 1\\) degree of freedom. With \\(K\\) alleles there are \\(K(K - 1)/2\\): 3 for the ABO blood group. The 5% cutoff of the chi-square distribution is 3.84 with 1 degree of freedom and 7.81 with 3.</p>",
  "l1": "Page 5 explains why the HWE test has 1 degree of freedom at a SNP.",
  "see": [
   "chi-square-test",
   "chi-square-distribution"
  ],
  "links": [],
  "match": [
   "degrees of freedom",
   "degree of freedom"
  ],
  "noPlural": true,
  "owner": "frequencies-hwe"
 },
 {
  "id": "differential-error",
  "term": "differential genotyping error",
  "aka": [
   "differential error",
   "differential bias"
  ],
  "short": "A genotyping error whose rate or direction differs between cases and controls, for example because they were genotyped in different laboratories, batches or arrays. It creates allele-frequency differences between the groups that an association test cannot tell apart from a real effect.",
  "long": "<p>Errors that hit cases and controls alike (non-differential) cost power but create no false signal. A differential error of \\(\\Delta\\) in allele frequency gives an allelic test statistic of about \\(n\\Delta^2/[\\bar{p}(1-\\bar{p})]\\) with \\(n\\) people per group, so it grows with sample size: at an allele frequency of 0.3, an error of one percentage point that is invisible with 1,000 people per group reaches genome-wide significance with about 62,000. Clayton et al. (2005) traced part of the inflated test statistics of a type 1 diabetes study to case and control DNA from two laboratories. QC looks for such errors with tests of differential missingness and of batch and plate effects.</p>",
  "l1": "Page 11 shows why differential errors make QC come before association testing.",
  "see": [
   "batch-effect",
   "differential-missingness",
   "misclassification",
   "genomic-inflation"
  ],
  "links": [
   {
    "t": "Clayton et al. 2005, Nat Genet: population structure, differential bias and genomic control",
    "u": "https://doi.org/10.1038/ng1653"
   },
   {
    "t": "Pluzhnikov et al. 2010, AJHG: Spoiling the whole bunch",
    "u": "https://doi.org/10.1016/j.ajhg.2010.06.005"
   }
  ],
  "match": [
   "differential genotyping errors",
   "differential genotyping error",
   "differential errors",
   "differential error"
  ],
  "noPlural": true,
  "owner": "practical-overview"
 },
 {
  "id": "direct-genetic-effect",
  "term": "Direct genetic effect",
  "aka": [],
  "short": "The effect of an allele in a person’s own genome on that person’s own trait, as opposed to the effects of relatives’ alleles acting through the environment they provide (indirect genetic effects).",
  "long": "<p>A GWAS of unrelated people estimates the direct effect plus indirect genetic effects, confounding by ancestry and the correlations between alleles created by assortative mating. Comparing siblings, or adjusting for the parents’ genotypes in trios, isolates the direct effect. For molecular traits the two kinds of estimate agree; for behavioral and social traits such as educational attainment, the direct effect is a much smaller part of the population estimate.</p>",
  "l1": "Page 10 (direct effects, indirect effects and assortative mating); page 8 (families as a study design).",
  "see": [
   "indirect-genetic-effect",
   "within-family-gwas",
   "assortative-mating",
   "population-stratification"
  ],
  "links": [
   {
    "t": "Howe et al. 2022, Nat Genet: within-sibship GWAS",
    "u": "https://doi.org/10.1038/s41588-022-01062-7"
   }
  ],
  "match": [
   "direct genetic effect"
  ],
  "owner": "gwas-applications"
 },
 {
  "id": "docker",
  "term": "Docker",
  "aka": [
   "container",
   "container image"
  ],
  "short": "Software that runs a program inside a container: an isolated process with its own Linux file system, created from an image that bundles the program with everything it needs. On macOS and Windows, Docker Desktop runs containers inside a Linux virtual machine.",
  "long": "<p><code>docker run --rm -v HOSTFOLDER:/work IMAGE COMMAND</code> starts a container from <code>IMAGE</code>, runs <code>COMMAND</code> in it with the host folder visible as <code>/work</code>, and deletes the container afterwards. An image is built for one processor architecture; <code>--platform linux/amd64</code> runs an Intel image on Apple Silicon under emulation.</p>",
  "l1": "The workshop publishes a Docker image with GrafAnc, <code>ghcr.io/dceg-workshops/graftools</code>.",
  "see": [
   "cpu-architecture",
   "wsl"
  ],
  "links": [
   {
    "t": "docs.docker.com",
    "u": "https://docs.docker.com/"
   }
  ],
  "match": [
   "Docker",
   "Docker container",
   "Docker image",
   "container image"
  ],
  "owner": "tools"
 },
 {
  "id": "double-heterozygote",
  "term": "double heterozygote",
  "aka": [
   "double-heterozygous genotype"
  ],
  "short": "A person who is heterozygous at both of two SNPs, for example Aa and Gg. Their genotypes do not show the phase: they carry either AG and ag, or Ag and aG.",
  "long": "<p>In the 3 × 3 table of two-SNP genotype counts, the double heterozygotes are the center cell, and they are the only people whose haplotypes the table leaves open: anyone homozygous at either SNP has known haplotypes. The EM algorithm assigns each double heterozygote to AG + ag with probability \\(w = p_{\\mathrm{AG}}p_{\\mathrm{ag}}/(p_{\\mathrm{AG}}p_{\\mathrm{ag}} + p_{\\mathrm{Ag}}p_{\\mathrm{aG}})\\). On slide 117, 5 of the 8 people are double heterozygotes.</p>",
  "l1": "Slides 114 and 117.",
  "see": [
   "phase",
   "em-algorithm",
   "haplotype-frequency"
  ],
  "match": [
   "double heterozygote",
   "double-heterozygote"
  ],
  "owner": "linkage-disequilibrium"
 },
 {
  "id": "dplyr",
  "term": "dplyr",
  "short": "The tidyverse package for manipulating tables. Each operation is a function named by a verb, such as filter() to keep rows, mutate() to add a column, count() to count groups and left_join() to combine two tables.",
  "see": [
   "tidyverse",
   "pipe-r"
  ],
  "links": [
   {
    "t": "dplyr.tidyverse.org",
    "u": "https://dplyr.tidyverse.org/"
   }
  ],
  "match": [
   "dplyr"
  ],
  "noPlural": true,
  "owner": "tools"
 },
 {
  "id": "drug-repurposing",
  "term": "Drug repurposing",
  "aka": [
   "drug repositioning"
  ],
  "short": "Using a drug already approved for one disease to treat another. Because its safety in people is known, it can reach patients faster than a new compound; GWAS can suggest candidates when a disease’s associated genes encode the targets of existing drugs.",
  "long": "<p>A rheumatoid arthritis GWAS pointed to CDK4 and CDK6, whose proteins are targets of drugs approved for cancer. Resources such as Open Targets and GREP link GWAS genes to drug targets, compounds and indications, so that such matches can be searched systematically.</p>",
  "l1": "Page 10 (outlook: drugs).",
  "see": [
   "drug-target",
   "open-targets"
  ],
  "links": [
   {
    "t": "Okada et al. 2014, Nature: genetics of rheumatoid arthritis contributes to biology and drug discovery",
    "u": "https://doi.org/10.1038/nature12873"
   },
   {
    "t": "Pushpakom et al. 2019, Nat Rev Drug Discov: drug repurposing",
    "u": "https://doi.org/10.1038/nrd.2018.168"
   }
  ],
  "match": [
   "drug repurposing",
   "drug repositioning",
   "repurposing"
  ],
  "owner": "gwas-applications"
 },
 {
  "id": "drug-target",
  "term": "Drug target",
  "aka": [
   "therapeutic target",
   "target (of a drug)"
  ],
  "short": "The molecule in the body, usually a protein, that a drug binds in order to change its activity. Example: evolocumab binds the protein PCSK9, so PCSK9 is its drug target.",
  "long": "<p>Most drugs that fail in development fail because acting on the chosen target does not change the disease, or because it causes harm. Human genetics gives evidence on both before a drug exists: people who carry a loss-of-function variant in the gene that encodes a protein show what a lifetime of lower activity of that protein does. If carriers are healthy and have less of the disease, a drug that blocks the protein is more likely to be safe and effective.</p><p>Across drug-development programs, targets with human genetic support were about 2.6 times as likely to lead to an approved drug as targets without it (Minikel et al. 2024), confirming an earlier estimate that genetic support could double the success rate (Nelson et al. 2015).</p>",
  "l1": "Slides 15–17: ANGPTL3, PCSK9 and BCL11A became drug targets through genetic studies (page 1).",
  "see": [
   "loss-of-function",
   "forward-genetics",
   "reverse-genetics",
   "monoclonal-antibody"
  ],
  "links": [
   {
    "t": "Minikel et al. 2024, Nature",
    "u": "https://doi.org/10.1038/s41586-024-07316-0"
   },
   {
    "t": "Nelson et al. 2015, Nature Genetics",
    "u": "https://doi.org/10.1038/ng.3314"
   }
  ],
  "match": [
   "drug target",
   "therapeutic target"
  ],
  "owner": "genetic-epidemiology"
 },
 {
  "id": "eigenvalue",
  "term": "eigenvalue",
  "aka": [
   "eigenvalues"
  ],
  "short": "The number by which a square matrix stretches one of its eigenvectors. In PCA it is the variance of the data along that principal component, so an eigenvalue divided by the sum of all eigenvalues is the component's share of the variance.",
  "long": "<p>If \\(\\mathbf{A}\\mathbf{v} = \\ell\\mathbf{v}\\), then \\(\\ell\\) is the eigenvalue of the eigenvector \\(\\mathbf{v}\\). The eigenvalues of a covariance matrix are non-negative and add up to its trace, the total variance. For the genetic relationship matrix of \\(n\\) people the trace is close to \\(n\\), so a component's share of the genotype variance is about \\(\\ell_k/n\\). PLINK writes the top eigenvalues to its <code>.eigenval</code> file; dividing one of them by the sum of only those reported overstates its share.</p><p>Worked example (page 7): a relationship matrix of six people has eigenvalues 5.173, 1.184, 0.800, 0.408, 0 and 0; their sum, 7.566, is the trace, so PC1 captures 68.4% of the variance.</p>",
  "l1": "Slides 102–103; PLINK's .eigenval file in QC step 6; scree plots for choosing the number of PCs.",
  "see": [
   "eigenvector",
   "pca",
   "scree-plot",
   "tracy-widom-test"
  ],
  "links": [
   {
    "t": "Patterson et al. 2006, Population structure and eigenanalysis",
    "u": "https://doi.org/10.1371/journal.pgen.0020190"
   }
  ],
  "match": [
   "eigenvalue",
   "eigenvalues"
  ],
  "noPlural": true,
  "owner": "population-structure"
 },
 {
  "id": "eigenvector",
  "term": "eigenvector",
  "aka": [
   "eigenvectors"
  ],
  "short": "A direction that a square matrix only stretches: multiplying the eigenvector by the matrix gives the same vector times a number, the eigenvalue. In PCA the eigenvectors of the covariance or relationship matrix are the principal components.",
  "long": "<p>For a square matrix \\(\\mathbf{A}\\), a vector \\(\\mathbf{v} \\ne \\mathbf{0}\\) with \\(\\mathbf{A}\\mathbf{v} = \\ell\\mathbf{v}\\) is an eigenvector and \\(\\ell\\) its eigenvalue. A symmetric matrix such as a covariance matrix or the genetic relationship matrix has a full set of perpendicular eigenvectors, usually scaled to length 1. In genotype PCA, each eigenvector of the \\(n \\times n\\) relationship matrix holds one score per person: PLINK writes them, one column per component, to its <code>.eigenvec</code> file. The sign of an eigenvector is arbitrary (\\(-\\mathbf{v}\\) is also an eigenvector), so the same analysis run twice can mirror a PC plot.</p>",
  "l1": "Slides 102–103 and the PCA sections of page 7; PLINK's .eigenvec file in QC step 6.",
  "see": [
   "eigenvalue",
   "pca",
   "principal-component",
   "genetic-relationship-matrix",
   "singular-value-decomposition"
  ],
  "links": [
   {
    "t": "PLINK 1.9: --pca",
    "u": "https://www.cog-genomics.org/plink/1.9/strat#pca"
   }
  ],
  "match": [
   "eigenvector",
   "eigenvectors"
  ],
  "noPlural": true,
  "owner": "population-structure"
 },
 {
  "id": "environment-variable",
  "term": "Environment variable",
  "short": "A named value that a running program passes on to every program it starts, such as PATH or HOME. In bash, export NAME=value sets one and ${NAME} reads it; in R, Sys.setenv() and Sys.getenv() do the same.",
  "l1": "The practical sets <code>input_dir</code>, <code>reference_dir</code> and <code>analysis_dir</code> in R with <code>Sys.setenv()</code> so that every bash chunk can use them, and sets <code>GRAFPATH</code> for GrafAnc.",
  "see": [
   "shell",
   "path-variable",
   "r-markdown"
  ],
  "match": [
   "environment variable"
  ],
  "owner": "tools"
 },
 {
  "id": "essentialism",
  "term": "Essentialism (typological thinking)",
  "aka": [
   "typological thinking",
   "essentialist theories of race"
  ],
  "short": "The assumption that humans fall into a few distinct, internally uniform, ranked and unchanging groups, each with a fixed nature.",
  "long": "<p>Slide 40 places essentialist theories of “race” in the 18th and 19th centuries, before eugenics. The 2023 National Academies report on population descriptors calls this assumption typological thinking and recommends that genetics research avoid it (its recommendation 2).</p>",
  "l1": "Slide 40; page 3, Eugenics and the misuse of genetics.",
  "see": [
   "eugenics",
   "population-descriptor",
   "race"
  ],
  "links": [
   {
    "t": "NASEM 2023 report",
    "u": "https://doi.org/10.17226/26902"
   }
  ],
  "match": [
   "essentialism",
   "essentialist",
   "typological thinking"
  ],
  "noPlural": true,
  "owner": "social-context"
 },
 {
  "id": "exact-test",
  "term": "Exact test",
  "aka": [
   "exact HWE test"
  ],
  "short": "A test whose p-value adds the exact probabilities of all possible outcomes, given fixed totals, that are no more probable than the observed one, instead of using a large-sample approximation. PLINK's Hardy–Weinberg test is an exact test that holds the number of people and the allele counts fixed.",
  "long": "<p>Given \\(n\\) people carrying \\(m_1\\) copies of allele 1, the probability of \\(n_{12}\\) heterozygotes under Hardy–Weinberg proportions is \\(2^{n_{12}}\\, n!\\, m_1!\\, m_2!/(n_{11}!\\, n_{12}!\\, n_{22}!\\, (2n)!)\\) (Levene 1949). Only a few tables are possible when an allele is rare, so the test is conservative and has a smallest attainable p-value: with 2 copies of an allele among 100 people it is 0.005. The mid-p value makes it less conservative.</p>",
  "l1": "Slide 83 and the practical's <code>--hardy</code> output use the exact HWE test; page 5 derives it and QC step 2 reads its output.",
  "see": [
   "hwe",
   "chi-square-test",
   "mid-p-value",
   "p-value"
  ],
  "links": [
   {
    "t": "Wigginton, Cutler & Abecasis 2005",
    "u": "https://doi.org/10.1086/429864"
   }
  ],
  "match": [
   "exact test",
   "exact HWE test"
  ],
  "owner": "frequencies-hwe"
 },
 {
  "id": "expected-count",
  "term": "Expected count",
  "aka": [
   "expected frequency"
  ],
  "short": "The number of observations that a null hypothesis predicts in a category: the total number times the category's probability. Under Hardy–Weinberg proportions the expected number of heterozygotes among n people is 2npq.",
  "long": "<p>Expected counts need not be whole numbers. For the 766 MTHFR genotypes of slide 74 they are 338.2 CC, 341.5 CT and 86.2 TT, against 334, 350 and 82 observed. The chi-square approximation is trusted when every expected count is at least about 5; at a SNP with a rare allele the expected number of rare homozygotes is often far below 1.</p>",
  "l1": "Page 5 computes expected genotype counts; PLINK's .hwe report gives the expected heterozygote frequency as E(HET).",
  "see": [
   "chi-square-test",
   "hwe"
  ],
  "links": [],
  "match": [
   "expected count"
  ],
  "owner": "frequencies-hwe"
 },
 {
  "id": "fair-principles",
  "term": "FAIR principles",
  "aka": [
   "FAIR"
  ],
  "short": "Guidelines that research data and code should be findable, accessible, interoperable and reusable, with the identifiers and metadata that let people and computers find and reuse them.",
  "long": "<p>The principles were published by Wilkinson and colleagues in 2016. For GWAS they mean, for example, summary statistics deposited in a public catalog in a standard format that states the genome build, the effect allele and the sample, and analysis pipelines whose software versions and parameters are recorded so that others can rerun them. Sharing must also respect participants’ consent and privacy.</p>",
  "l1": "The workshop website asks for GWAS pipelines that follow the FAIR principles (page 2).",
  "see": [
   "summary-statistics",
   "gwas-catalog"
  ],
  "links": [
   {
    "t": "Wilkinson et al. 2016, Scientific Data",
    "u": "https://doi.org/10.1038/sdata.2016.18"
   }
  ],
  "match": [
   "FAIR principles",
   "FAIR"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "field-map"
 },
 {
  "id": "false-discovery-rate",
  "term": "False discovery rate (FDR)",
  "aka": [
   "FDR",
   "Benjamini–Hochberg procedure"
  ],
  "short": "The expected share of false positives among the results declared significant. Controlling it at 5% allows more discoveries than controlling the family-wise error rate, which limits the chance of even one false positive.",
  "long": "<p>The Benjamini–Hochberg procedure sorts the \\(m\\) p-values, finds the largest \\(k\\) for which the \\(k\\)-th smallest p-value is at most \\(0.05\\,k/m\\), and declares the \\(k\\) smallest significant. With a million tests the smallest p-value must still be below 5 × 10⁻⁸, but the 100th smallest only needs to be below 5 × 10⁻⁶. GWAS use the family-wise threshold 5 × 10⁻⁸ for discovery; FDR control is common in gene-level, molecular QTL and gene-set analyses.</p>",
  "l1": "Page 9 (the genome-wide threshold): the reading calls 5 × 10⁻⁸ a false discovery rate, but it controls the family-wise error rate.",
  "see": [
   "family-wise-error-rate",
   "multiple-testing",
   "bonferroni-correction",
   "type-1-error",
   "genome-wide-significance"
  ],
  "links": [
   {
    "t": "Benjamini & Hochberg 1995, J R Stat Soc B",
    "u": "https://doi.org/10.1111/j.2517-6161.1995.tb02031.x"
   }
  ],
  "match": [
   "false discovery rate",
   "FDR"
  ],
  "owner": "gwas-analysis"
 },
 {
  "id": "fam-file",
  "term": ".fam file (PLINK sample file)",
  "aka": [
   "PLINK sample information file"
  ],
  "short": "The text file of a PLINK binary fileset that lists the people, one line each in the order their genotypes are stored in the .bed file. It has no header and six columns: family ID, individual ID, father's ID, mother's ID, sex and phenotype.",
  "long": "<p>The six columns are separated by spaces or tabs. Sex is coded 1 = male, 2 = female, 0 = unknown. A case–control phenotype is coded 1 = control, 2 = case, and −9 or 0 = missing; any other number makes PLINK read the column as a quantitative trait. Parents are given by their individual IDs, or 0 when they are not in the file.</p><p>The line number is what links a person to the genotypes: the first line of the .fam file is the first person in every SNP block of the .bed file. Sorting or editing the .fam file by hand therefore attaches genotypes to the wrong people.</p>",
  "l1": "The practical's <code>penncath.fam</code> has 1,401 lines; page 12 shows them column by column.",
  "see": [
   "plink-binary",
   "bim-file",
   "family-id",
   "individual-id",
   "plink-a1"
  ],
  "links": [
   {
    "t": "PLINK 1.9 file formats: .fam",
    "u": "https://www.cog-genomics.org/plink/1.9/formats#fam"
   }
  ],
  "match": [
   ".fam file",
   "fam file"
  ],
  "owner": "plink-data"
 },
 {
  "id": "family-id",
  "term": "family ID (FID)",
  "aka": [
   "FID"
  ],
  "short": "The first column of a PLINK .fam file: a label shared by the members of one family. Together with the individual ID it identifies a person; in studies of unrelated people it is often the person's own study ID.",
  "long": "<p>PLINK identifies a person by the pair (FID, IID), so two people may share an IID if their FIDs differ. Files of keep, remove and update lists therefore start with these two columns. Some PLINK reports join the two with an underscore (FID_IID), which is why the PLINK documentation advises against underscores inside IDs.</p>",
  "l1": "In <code>penncath.fam</code> the FID is the person's study number, written with quotation marks as part of the ID (\"10002\").",
  "see": [
   "individual-id",
   "fam-file"
  ],
  "links": [
   {
    "t": "PLINK 1.9 file formats: .fam",
    "u": "https://www.cog-genomics.org/plink/1.9/formats#fam"
   }
  ],
  "match": [
   "family ID",
   "family IDs",
   "FID",
   "FIDs"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "plink-data"
 },
 {
  "id": "finemap",
  "term": "FINEMAP",
  "aka": [],
  "short": "A Bayesian fine-mapping program that works from GWAS summary statistics and an LD matrix. It searches over configurations of a few causal variants in a region and reports each SNP’s posterior inclusion probability and the probability of each number of causal variants.",
  "long": "<p>Testing every combination of causal SNPs is impossible in large regions, so FINEMAP uses a shotgun stochastic search that concentrates on the configurations with high posterior probability. Like other summary-statistic methods, it needs an LD matrix that matches the GWAS sample; LD from a different reference panel can produce confident but wrong results.</p>",
  "l1": "Slide 49 (Session 4 covers fine-mapping); page 9 (fine-mapping); page 8 lists it among tools.",
  "see": [
   "fine-mapping",
   "posterior-inclusion-probability",
   "credible-set",
   "susie",
   "ld-reference-panel"
  ],
  "links": [
   {
    "t": "Benner et al. 2016, Bioinformatics",
    "u": "https://doi.org/10.1093/bioinformatics/btw018"
   }
  ],
  "match": [
   "FINEMAP"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "gwas-analysis"
 },
 {
  "id": "founder",
  "term": "founder (in a PLINK fileset)",
  "aka": [
   "nonfounder",
   "founders only"
  ],
  "short": "In a PLINK fileset, a person whose father and mother IDs (columns 3 and 4 of the .fam file) are both 0, meaning unknown. PLINK computes allele frequencies, Hardy–Weinberg tests and LD from founders only.",
  "long": "<p>A person with a father or mother ID filled in is a nonfounder, even if that parent is not in the fileset. <code>--make-founders</code> clears parent IDs that point to people who are absent, so those people count as founders, and <code>--nonfounders</code> makes <code>--freq</code>, <code>--maf</code>, <code>--hardy</code> and <code>--hwe</code> count everyone. Counting founders only keeps alleles that relatives share by descent from being counted more than once, which would bias allele frequencies and the Hardy–Weinberg test.</p><p>In a study of unrelated people every person is a founder: PennCATH's log reports 1,401 founders and 0 nonfounders.</p>",
  "l1": "Page 16 (QC step 2): <code>--hardy</code> and <code>--hwe</code> count founders only. Page 17 (QC step 3): <code>--indep-pairwise</code> computes r² in founders.",
  "see": [
   "plink-binary",
   "hwe",
   "ld-pruning"
  ],
  "links": [
   {
    "t": "PLINK 1.9: --nonfounders and --make-founders",
    "u": "https://www.cog-genomics.org/plink/1.9/filter#nonfounders"
   }
  ],
  "match": [
   "founder",
   "nonfounder"
  ],
  "auto": false,
  "owner": "qc-hwe"
 },
 {
  "id": "four-gamete-test",
  "term": "four-gamete test",
  "aka": [
   "four-gamete rule"
  ],
  "short": "If each of two SNPs arose by a single mutation, all four of their haplotypes can appear only after a crossover between them. Seeing all four in a sample is therefore evidence that recombination happened in the sample's history.",
  "long": "<p>Proposed by Hudson and Kaplan (1985) to count the minimum number of recombination events in a sample of sequences. A pair with only three haplotypes has \\(|D'| = 1\\). Haploview offers a four-gamete rule for defining haplotype blocks and a four-gamete color scheme for LD heatmaps.</p>",
  "l1": "Page 6, origins section (slides 109–111).",
  "see": [
   "d-prime",
   "recombination",
   "ld-block"
  ],
  "links": [
   {
    "t": "Hudson & Kaplan 1985",
    "u": "https://doi.org/10.1093/genetics/111.1.147"
   }
  ],
  "match": [
   "four-gamete test",
   "four-gamete rule"
  ],
  "owner": "linkage-disequilibrium"
 },
 {
  "id": "fusion-twas",
  "term": "FUSION",
  "aka": [
   "FUSION TWAS software"
  ],
  "short": "Software for a transcriptome-wide association study from GWAS summary statistics: it combines a gene’s expression weights with the GWAS z-scores of the same variants, using an LD reference panel, into one z-score per gene.",
  "long": "<p>FUSION (Gusev et al. 2016) fits several prediction models per gene (best single eQTL, BLUP, BSLMM, lasso, elastic net) in a reference dataset, keeps the one with the best cross-validated accuracy, and reports for each gene TWAS.Z and TWAS.P together with the model’s cross-validated R².</p>",
  "l1": "Slide 25 (TWAS); covered in Session 5.",
  "see": [
   "twas",
   "transcriptome-imputation",
   "predixcan",
   "summary-statistics"
  ],
  "links": [
   {
    "t": "FUSION documentation (Gusev lab)",
    "u": "http://gusevlab.org/projects/fusion/"
   },
   {
    "t": "Gusev et al. 2016, Nature Genetics",
    "u": "https://doi.org/10.1038/ng.3506"
   }
  ],
  "match": [
   "FUSION"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "genetic-epidemiology"
 },
 {
  "id": "ga4gh",
  "term": "GA4GH (Global Alliance for Genomics and Health)",
  "aka": [
   "Global Alliance for Genomics and Health"
  ],
  "short": "An international standards organization, founded in 2013, that writes technical standards and policy frameworks so that genomic and health data can be shared responsibly across institutions and countries.",
  "long": "<p>Its products include file formats and interfaces maintained with the community (such as VCF and htsget), the Beacon protocol for asking whether a database holds a given variant, the Data Use Ontology for recording consent restrictions, and the Framework for Responsible Sharing of Genomic and Health-Related Data.</p>",
  "l1": "Page 10 (data sharing).",
  "see": [
   "bermuda-principles",
   "fair-principles",
   "vcf",
   "controlled-access"
  ],
  "links": [
   {
    "t": "GA4GH",
    "u": "https://www.ga4gh.org/"
   },
   {
    "t": "Rehm et al. 2021, Cell Genomics: GA4GH policies and standards",
    "u": "https://doi.org/10.1016/j.xgen.2021.100029"
   }
  ],
  "match": [
   "GA4GH",
   "Global Alliance for Genomics and Health"
  ],
  "noPlural": true,
  "owner": "gwas-applications"
 },
 {
  "id": "gdpr",
  "term": "GDPR (General Data Protection Regulation)",
  "aka": [
   "General Data Protection Regulation"
  ],
  "short": "The European Union’s data protection law, applied since May 2018. It treats genetic data as a special category of personal data, requires a legal basis such as consent to process it, and restricts transfers to countries without equivalent protection.",
  "long": "<p>Pseudonymized genotypes still count as personal data under the GDPR, because a person can be re-identified from them. This complicates sharing individual-level data between European and other studies, and has led consortia to share summary statistics, to run analyses where the data are held (federated analysis) or to use controlled-access repositories inside the EU.</p>",
  "l1": "Page 10 (privacy).",
  "see": [
   "controlled-access",
   "informed-consent",
   "summary-statistics"
  ],
  "links": [
   {
    "t": "Regulation (EU) 2016/679, EUR-Lex",
    "u": "https://eur-lex.europa.eu/eli/reg/2016/679/oj"
   },
   {
    "t": "Peloquin et al. 2020, Eur J Hum Genet: GDPR challenges to secondary research uses of data",
    "u": "https://doi.org/10.1038/s41431-020-0596-x"
   }
  ],
  "match": [
   "GDPR",
   "General Data Protection Regulation"
  ],
  "noPlural": true,
  "owner": "gwas-applications"
 },
 {
  "id": "gene-counting",
  "term": "Gene counting",
  "aka": [],
  "short": "An iterative method for estimating allele frequencies when some genotypes cannot be told apart, as with ABO blood groups: split each ambiguous group into genotypes by their Hardy–Weinberg frequencies, count alleles, and repeat. It is an EM algorithm.",
  "long": "<p>Described by Ceppellini, Siniscalco and Smith in 1955. For the 3,117 people of slide 73, grouped by blood group, it converges in 10 rounds from equal starting values to allele frequencies of 0.286 (A), 0.103 (B) and 0.612 (O). The same idea estimates haplotype frequencies from genotypes.</p>",
  "l1": "Page 5 explains it and runs it step by step in a widget.",
  "see": [
   "em-algorithm",
   "abo-blood-group",
   "hwe",
   "maximum-likelihood-estimate"
  ],
  "links": [
   {
    "t": "Ceppellini, Siniscalco & Smith 1955",
    "u": "https://doi.org/10.1111/j.1469-1809.1955.tb01360.x"
   }
  ],
  "match": [
   "gene counting"
  ],
  "owner": "frequencies-hwe"
 },
 {
  "id": "gene-set-analysis",
  "term": "Gene-set analysis",
  "aka": [
   "pathway analysis",
   "gene-set enrichment analysis",
   "MAGMA"
  ],
  "short": "A test of whether the genes near a trait’s associated variants fall more often than expected in a predefined set of genes, such as a biological pathway or the genes expressed specifically in one tissue or cell type.",
  "long": "<p>Genes differ in length and in the number of SNPs and the LD around them, so naive counts are biased toward large genes. MAGMA first computes a gene-level association statistic from all SNPs in and near each gene, allowing for LD, and then regresses those statistics on membership of each gene set, with gene size and SNP density as covariates. Sets come from resources such as Gene Ontology, KEGG and Reactome, or from lists of genes specifically expressed in a cell type.</p>",
  "l1": "Slide 54 (Session 9 covers functional genomics); page 9 (from variants to genes and pathways).",
  "see": [
   "post-gwas-studies",
   "gene",
   "cell-type",
   "tissue",
   "false-discovery-rate"
  ],
  "links": [
   {
    "t": "de Leeuw et al. 2015, PLoS Comput Biol: MAGMA",
    "u": "https://doi.org/10.1371/journal.pcbi.1004219"
   }
  ],
  "match": [
   "gene-set analysis",
   "gene set analysis",
   "gene-set test",
   "pathway analysis",
   "MAGMA"
  ],
  "owner": "gwas-analysis"
 },
 {
  "id": "genetic-correlation",
  "term": "Genetic correlation",
  "aka": [
   "rg",
   "SNP-based genetic correlation"
  ],
  "short": "The correlation, from −1 to 1, between the effects of genetic variants on two traits: how far the alleles that raise one trait also raise (or lower) the other. It can be estimated from the GWAS summary statistics of the two traits.",
  "long": "<p>Cross-trait LD score regression regresses the product of the two traits’ z-scores at each SNP on the SNP’s LD score; the slope gives the genetic covariance, which divided by the square root of the product of the two SNP-heritabilities gives \\(r_g\\). People included in both GWAS shift only the intercept, so overlapping samples do not bias it. Genetic correlations are high among psychiatric disorders and among metabolic traits, but a genetic correlation does not show that one trait causes the other: horizontal or LD-induced pleiotropy, cross-trait assortative mating and residual stratification can also produce it.</p>",
  "l1": "Slide 50 (Session 5 covers heritability and other post-GWAS analyses); page 10 (genetic architecture), with the cross-trait LD score regression equation.",
  "see": [
   "ld-score-regression",
   "snp-heritability",
   "pleiotropy",
   "vertical-pleiotropy",
   "local-genetic-correlation",
   "assortative-mating",
   "mendelian-randomization"
  ],
  "links": [
   {
    "t": "Bulik-Sullivan et al. 2015, Nat Genet: an atlas of genetic correlations",
    "u": "https://doi.org/10.1038/ng.3406"
   }
  ],
  "match": [
   "genetic correlation"
  ],
  "owner": "gwas-applications"
 },
 {
  "id": "genetic-determinism",
  "term": "Genetic determinism",
  "aka": [],
  "short": "The belief that a person’s genes fix their traits, so that environment, behavior or treatment cannot change them. For complex traits it is wrong: heritability is below 1, polygenic scores predict individuals poorly, and genetic effects depend on the environment.",
  "long": "<p>Polygenic scores invite determinism because they attach a single number to a person. A heritability of 0.8 for height describes variation in one population and environment, not how much of one person’s height is genetic, and average adult height rose by up to 20 cm in some countries between people born in 1896 and in 1996 without any change in genes. Communicating a score as a probability, with its uncertainty and what can be done about the risk, counters the misreading.</p>",
  "l1": "Slide 48 (Session 3 adds social factors to the map); page 10 (ethical questions).",
  "see": [
   "heritability",
   "polygenic-score",
   "gene-environment-interaction",
   "absolute-risk"
  ],
  "links": [
   {
    "t": "NCD Risk Factor Collaboration 2016, eLife: a century of trends in adult human height",
    "u": "https://doi.org/10.7554/eLife.13410"
   }
  ],
  "match": [
   "genetic determinism"
  ],
  "owner": "gwas-applications"
 },
 {
  "id": "genotype-relative-risk",
  "term": "Genotype relative risk",
  "aka": [],
  "short": "The risk of a disease for people with a given genotype divided by the risk for people with a reference genotype, usually no copy of the risk allele.",
  "long": "<p>Patterns of genotype relative risks define genetic models: multiplicative (1, r, r²), recessive (1, 1, r) and dominant (1, r, r). Among cases, a multiplicative pattern keeps Hardy–Weinberg proportions, while recessive and dominant patterns produce too many homozygotes or heterozygotes, which is why quality control tests Hardy–Weinberg equilibrium in controls.</p>",
  "l1": "Page 5 uses it to show why QC tests the controls.",
  "see": [
   "relative-risk",
   "hwe",
   "recessive",
   "dominant"
  ],
  "links": [],
  "match": [
   "genotype relative risk"
  ],
  "owner": "frequencies-hwe"
 },
 {
  "id": "ggplot2",
  "term": "ggplot2",
  "short": "The tidyverse plotting package. A plot is built from a table, aesthetic mappings (which column sets the x position, the y position or the color) and layers such as geom_histogram() or geom_point(), joined with +.",
  "see": [
   "tidyverse"
  ],
  "links": [
   {
    "t": "Wickham 2010, A layered grammar of graphics",
    "u": "https://doi.org/10.1198/jcgs.2009.07098"
   },
   {
    "t": "ggplot2.tidyverse.org",
    "u": "https://ggplot2.tidyverse.org/"
   }
  ],
  "match": [
   "ggplot2"
  ],
  "noPlural": true,
  "owner": "tools"
 },
 {
  "id": "git",
  "term": "git",
  "aka": [
   "repository",
   "git clone"
  ],
  "short": "A version-control program that records the history of a set of files; such a set together with its history is a repository. git clone URL copies a repository, history included, into a new folder.",
  "l1": "The practical clones two repositories: akt (for the 1000 Genomes panel file) and GrafAnc.",
  "see": [
   "akt",
   "grafanc"
  ],
  "links": [
   {
    "t": "git-scm.com",
    "u": "https://git-scm.com/"
   }
  ],
  "match": [
   "git"
  ],
  "noPlural": true,
  "owner": "tools"
 },
 {
  "id": "glue-r",
  "term": "glue (R package)",
  "short": "An R package that builds text from a template: glue(\"{n} variants\") replaces {n} with the value of the R variable n.",
  "see": [
   "tidyverse"
  ],
  "links": [
   {
    "t": "glue.tidyverse.org",
    "u": "https://glue.tidyverse.org/"
   }
  ],
  "match": [
   "glue"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "tools"
 },
 {
  "id": "grafpop",
  "term": "GRAF-pop",
  "aka": [
   "GrafPop"
  ],
  "short": "NCBI's program, published in 2019, that infers a person's genetic ancestry from genotypes without principal component analysis. It measures the person's genetic distance to each of several reference populations from their allele frequencies and places the person on a fixed triangle with European, African and East Asian corners. dbGaP uses it in quality control; GrafAnc grew out of it.",
  "long": "<p>The distance to a population is the negative logarithm of the probability of the person's genotypes under Hardy–Weinberg proportions with that population's allele frequencies, averaged over SNPs, so genotypes that are rare in a population push the distance up. The European, African and East Asian distances give the person three weights that sum to 1 and are read as ancestry proportions (Pe, Pf and Pa). Applied to fixed corner coordinates, the weights give the scores GD1 and GD2; GD3 is the distance of the person's point from the plane of the triangle. Because the corners are fixed, people genotyped on different SNPs can be plotted together.</p><p>GRAF-pop used 10,000 SNPs and five reference populations whose allele frequencies came from dbGaP participants. Since 2018 dbGaP has used it to find inconsistencies between the populations that studies report and those that the genotypes predict. GrafAnc, released in 2025 by GRAF-pop's first author and colleagues, keeps the distances and the triangle and uses 282,424 SNPs, 26 reference populations and 8 continental groups.</p>",
  "l1": "Page 22 (QC step 8): the distances, the triangle and how GrafAnc builds on them.",
  "see": [
   "grafanc",
   "reference-population",
   "genetic-similarity",
   "structure-admixture"
  ],
  "links": [
   {
    "t": "Jin et al. 2019, G3",
    "u": "https://doi.org/10.1534/g3.118.200925"
   }
  ],
  "match": [
   "GRAF-pop",
   "GrafPop"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "qc-grafanc"
 },
 {
  "id": "greml",
  "term": "GREML (genomic-relatedness-based restricted maximum likelihood)",
  "aka": [
   "GCTA-GREML",
   "GREML-LDMS"
  ],
  "short": "A method that estimates SNP-heritability from the genotypes of unrelated people: it measures how much more similar in a trait pairs of people are when they share slightly more alleles across all SNPs, with a linear mixed model fitted by restricted maximum likelihood.",
  "long": "<p>The model is \\(\\mathrm{Var}(\\mathbf{y}) = \\sigma^2_{\\mathrm{A}}\\boldsymbol{\\psi} + \\sigma^2_{\\mathrm{e}}\\mathbf{I}\\), where \\(\\mathbf{y}\\) holds the trait values, \\(\\boldsymbol{\\psi}\\) is the genetic relationship matrix, \\(\\mathbf{I}\\) the identity matrix, \\(\\sigma^2_{\\mathrm{A}}\\) the variance explained by the SNPs and \\(\\sigma^2_{\\mathrm{e}}\\) the residual variance, and \\(h^2_{\\mathrm{SNP}} = \\sigma^2_{\\mathrm{A}}/(\\sigma^2_{\\mathrm{A}} + \\sigma^2_{\\mathrm{e}})\\). In 2010 it gave 0.45 for height from 294,831 SNPs in 3,925 people, when the significant SNPs known then explained about 5%: much of the missing heritability lay in many SNPs with effects too small to pass the threshold. GREML-LDMS fits SNPs in groups by frequency and LD; with whole-genome sequences of 25,465 unrelated people it estimated heritabilities of 0.68 for height and 0.30 for body mass index.</p>",
  "l1": "Slide 50 (Session 5 covers heritability); page 10 (SNP-heritability).",
  "see": [
   "snp-heritability",
   "genetic-relationship-matrix",
   "mixed-model",
   "missing-heritability",
   "ld-score-regression",
   "heritability"
  ],
  "links": [
   {
    "t": "Yang et al. 2010, Nat Genet: common SNPs explain a large proportion of the heritability for height",
    "u": "https://doi.org/10.1038/ng.608"
   },
   {
    "t": "Yang et al. 2011, Am J Hum Genet: GCTA",
    "u": "https://doi.org/10.1016/j.ajhg.2010.11.011"
   },
   {
    "t": "Wainschtein et al. 2022, Nat Genet: heritability from whole-genome sequences",
    "u": "https://doi.org/10.1038/s41588-021-00997-7"
   }
  ],
  "match": [
   "GREML",
   "GCTA-GREML",
   "GREML-LDMS"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "gwas-applications"
 },
 {
  "id": "gwas-ssf",
  "term": "GWAS-SSF (GWAS summary statistics format)",
  "aka": [
   "GWAS Catalog summary statistics format"
  ],
  "short": "The GWAS Catalog’s standard tab-separated format for GWAS summary statistics, with mandatory columns in a fixed order, so that results from different studies can be read the same way.",
  "long": "<p>The eight mandatory columns are chromosome, base_pair_location, effect_allele, other_allele, an effect (beta, odds_ratio, hazard_ratio or z-score), standard_error, effect_allele_frequency and the p-value (p_value or neg_log_10_p_value). Encouraged columns include variant_id, rs_id, info, the confidence limits and the sample size n. Fixed column names and an explicit effect allele prevent the most common error in reusing summary statistics: combining studies whose effects refer to different alleles.</p>",
  "l1": "Page 9 (summary statistics) shows three rows in the format; page 10 (databases of summary statistics).",
  "see": [
   "summary-statistics",
   "gwas-catalog",
   "harmonization",
   "effect-allele",
   "vcf"
  ],
  "links": [
   {
    "t": "GWAS Catalog: summary statistics format",
    "u": "https://www.ebi.ac.uk/gwas/docs/summary-statistics-format"
   },
   {
    "t": "Hayhurst et al. 2022, bioRxiv: a community-driven GWAS summary statistics standard",
    "u": "https://doi.org/10.1101/2022.07.15.500230"
   }
  ],
  "match": [
   "GWAS-SSF"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "gwas-analysis"
 },
 {
  "id": "h3k27ac",
  "term": "H3K27ac (a histone mark of active enhancers)",
  "aka": [
   "histone H3 lysine 27 acetylation"
  ],
  "short": "A chemical mark, an acetyl group on lysine 27 of histone H3, found at active enhancers and promoters. Maps of H3K27ac in a cell type show which regulatory elements are active there.",
  "long": "<p>It is measured by ChIP-seq: DNA bound to histones that carry the mark is pulled down with an antibody and sequenced, giving peaks over active elements. Together with open chromatin from ATAC-seq, it is used to ask whether a fine-mapped GWAS variant lies in an element active in a cell type relevant to the trait, and to raise that variant’s prior probability in fine-mapping.</p>",
  "l1": "Slide 54 (Session 9 covers functional genomics); page 9 (Fig. 3c of the reading, redrawn).",
  "see": [
   "histone",
   "enhancer",
   "promoter",
   "atac-seq",
   "chromatin-accessibility"
  ],
  "links": [
   {
    "t": "Creyghton et al. 2010, PNAS: H3K27ac separates active from poised enhancers",
    "u": "https://doi.org/10.1073/pnas.1016071107"
   }
  ],
  "match": [
   "H3K27ac"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "gwas-analysis"
 },
 {
  "id": "haplotype-frequency",
  "term": "haplotype frequency",
  "aka": [
   "two-locus haplotype frequency"
  ],
  "short": "The fraction of chromosome copies in a population that carry a given combination of alleles at two or more loci, for example A at one SNP and G at the next. For two SNPs the four haplotype frequencies add up to 1, and their sums along rows and columns are the allele frequencies.",
  "long": "<p>For SNPs with alleles A/a and G/g the four frequencies are \\(p_{\\mathrm{AG}}, p_{\\mathrm{Ag}}, p_{\\mathrm{aG}}, p_{\\mathrm{ag}}\\) (in the course's general notation \\(p_{11}, p_{12}, p_{21}, p_{22}\\)), with \\(p_{\\mathrm{A}} = p_{\\mathrm{AG}} + p_{\\mathrm{Ag}}\\) and \\(p_{\\mathrm{G}} = p_{\\mathrm{AG}} + p_{\\mathrm{aG}}\\). Every LD measure is computed from them. Genotype data do not show haplotypes, so the frequencies are estimated, usually by maximum likelihood with the EM algorithm. Example (slide 117): 8 AG, 2 Ag, 0 aG and 6 ag copies among 16 give 0.500, 0.125, 0 and 0.375.</p>",
  "l1": "Slides 113, 117–118; the EM widget on page 6.",
  "see": [
   "haplotype",
   "em-algorithm",
   "ld-d",
   "double-heterozygote"
  ],
  "match": [
   "haplotype frequency"
  ],
  "owner": "linkage-disequilibrium"
 },
 {
  "id": "haploview",
  "term": "Haploview",
  "aka": [],
  "short": "Free software from the Broad Institute (2005) for displaying LD and haplotype blocks. Its triangle of colored diamonds and its D′/LOD and r² color schemes are still the usual way to draw LD heatmaps.",
  "long": "<p>Haploview estimates two-SNP haplotype frequencies, computes \\(D'\\), \\(r^2\\) and LOD for each pair, and defines blocks with the Gabriel et al. rule, a four-gamete rule or a solid-spine rule. It is no longer developed, but its displays are copied by many tools.</p>",
  "l1": "Page 6, LD heatmaps.",
  "see": [
   "ld-heatmap",
   "ld-block"
  ],
  "links": [
   {
    "t": "Barrett et al. 2005",
    "u": "https://doi.org/10.1093/bioinformatics/bth457"
   }
  ],
  "match": [
   "Haploview"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "linkage-disequilibrium"
 },
 {
  "id": "heterozygosity-rate",
  "term": "Heterozygosity rate (het_rate)",
  "aka": [
   "het_rate",
   "observed heterozygosity rate"
  ],
  "short": "The share of a person's genotype calls that are heterozygous: the number of heterozygous calls divided by the number of non-missing calls. Unusually high values suggest contaminated DNA; low values suggest related parents or poor DNA; genetic ancestry can move it either way.",
  "long": "<p>In the practical it is computed from PLINK's <code>.het</code> file as \\(h_i = (N_i - O_i)/N_i\\), where \\(N_i\\) is <code>N(NM)</code>, the person's non-missing calls at non-monomorphic autosomal SNPs, and \\(O_i\\) is <code>O(HOM)</code>, how many of them are homozygous.</p><p>The rate has no fixed expected value: each SNP contributes its own \\(2pq\\), so the average depends on which SNPs are used (around 0.3 to 0.4 for SNPs with common alleles). It is therefore judged against the sample, usually by flagging people more than 3 standard deviations from the mean. It is tied to PLINK's inbreeding coefficient estimate by \\(\\hat{F}_i = 1 - h_i/\\bar{H}_i\\), where \\(\\bar{H}_i\\) is the average of \\(2\\hat{p}\\hat{q}\\) over the person's called SNPs, so the two order people the same way; the usual rules (mean ± 3 SD of \\(h\\), |F| &gt; 0.1) cut in different places.</p>",
  "l1": "Page 19 (QC step 5): the practical's het_rate, the mean ± 3 SD rule and its relation to F.",
  "see": [
   "heterozygosity",
   "inbreeding-coefficient",
   "sample-contamination",
   "method-of-moments"
  ],
  "links": [
   {
    "t": "PLINK 1.9: --het",
    "u": "https://www.cog-genomics.org/plink/1.9/basic_stats#ibc"
   },
   {
    "t": "Anderson et al. 2010, Nature Protocols",
    "u": "https://doi.org/10.1038/nprot.2010.116"
   }
  ],
  "match": [
   "heterozygosity rate"
  ],
  "owner": "qc-heterozygosity"
 },
 {
  "id": "homebrew",
  "term": "Homebrew",
  "aka": [
   "brew"
  ],
  "short": "A package manager for macOS and Linux that installs command-line programs with brew install. Its formula plink1 installs PLINK 1.9.",
  "links": [
   {
    "t": "brew.sh",
    "u": "https://brew.sh/"
   }
  ],
  "match": [
   "Homebrew"
  ],
  "noPlural": true,
  "owner": "tools"
 },
 {
  "id": "horizontal-pleiotropy",
  "term": "Horizontal pleiotropy",
  "aka": [
   "directional pleiotropy"
  ],
  "short": "When a genetic variant used as an instrument affects the outcome through a path that does not pass through the exposure. It breaks the third assumption of Mendelian randomization (exclusion restriction) and biases the estimate.",
  "long": "<p>Vertical pleiotropy, where the variant changes the exposure and the exposure then changes other traits, is not a problem: those effects are part of the causal effect being estimated. Horizontal pleiotropy is a second, separate path from the variant to the outcome. With one variant it cannot be detected from the data; with many variants, methods such as MR-Egger and the weighted median look for it (page 10).</p>",
  "l1": "Slide 22, Assumption 3 (no arrow from the variant directly to the outcome).",
  "see": [
   "pleiotropy",
   "mendelian-randomization",
   "instrumental-variable"
  ],
  "links": [],
  "match": [
   "horizontal pleiotropy",
   "horizontally pleiotropic"
  ],
  "noPlural": true,
  "owner": "genetic-epidemiology"
 },
 {
  "id": "htslib",
  "term": "htslib",
  "aka": [
   "HTSlib"
  ],
  "short": "A C library for reading and writing high-throughput sequencing file formats such as SAM, BAM, CRAM, VCF and BCF. bcftools and samtools are built on it, and GrafAnc uses it to read VCF input.",
  "see": [
   "bcftools",
   "vcf",
   "grafanc"
  ],
  "links": [
   {
    "t": "Bonfield et al. 2021",
    "u": "https://doi.org/10.1093/gigascience/giab007"
   },
   {
    "t": "htslib.org",
    "u": "https://www.htslib.org/"
   }
  ],
  "match": [
   "htslib"
  ],
  "noPlural": true,
  "owner": "tools"
 },
 {
  "id": "human-genome-project",
  "term": "Human Genome Project",
  "aka": [],
  "short": "The international public project (1990–2003) that determined the sequence of the human genome; a draft was published in 2001 and a finished sequence in 2003.",
  "long": "<p>Francis Collins directed the U.S. genome institute at the National Institutes of Health from 1993, and Eric Lander’s center at the Whitehead Institute was the largest contributor to the draft sequence. The project produced the reference sequence against which variants are named and positioned, in genome builds such as GRCh37 and GRCh38. The HapMap and 1000 Genomes projects followed and cataloged common variation; the Telomere-to-Telomere Consortium closed the remaining gaps in 2022.</p>",
  "l1": "Slide 28: Collins and Lander are listed for the Human Genome Project, the HapMap and high-throughput genotyping and sequencing (page 2).",
  "see": [
   "genome",
   "hapmap",
   "thousand-genomes",
   "sequencing"
  ],
  "links": [
   {
    "t": "Lander et al. 2001, Nature",
    "u": "https://doi.org/10.1038/35057062"
   }
  ],
  "match": [
   "Human Genome Project"
  ],
  "noPlural": true,
  "owner": "field-map"
 },
 {
  "id": "imputation-server",
  "term": "Imputation server",
  "aka": [
   "Michigan Imputation Server",
   "TOPMed Imputation Server"
  ],
  "short": "A web service that phases and imputes genotypes uploaded by a researcher against a large reference panel and returns the imputed files, such as the Michigan and TOPMed Imputation Servers.",
  "long": "<p>The servers run the steps of Box 2 of the reading as one pipeline: checks of the uploaded files against the panel (build, strand, allele frequencies), phasing, imputation with Minimac and a quality report. They give access to reference panels that cannot be downloaded, such as the TOPMed panel. The price is sending genotypes to a third party, which the participants’ consent and the data-access agreement must allow.</p>",
  "l1": "Page 8 (the imputation workflow).",
  "see": [
   "genotype-imputation",
   "reference-panel",
   "topmed",
   "hrc",
   "phasing",
   "info-score"
  ],
  "links": [
   {
    "t": "Das et al. 2016, Nat Genet: next-generation genotype imputation service and methods",
    "u": "https://doi.org/10.1038/ng.3656"
   },
   {
    "t": "Michigan Imputation Server",
    "u": "https://imputationserver.sph.umich.edu/"
   },
   {
    "t": "TOPMed Imputation Server",
    "u": "https://imputation.biodatacatalyst.nhlbi.nih.gov/"
   }
  ],
  "match": [
   "imputation server",
   "Michigan Imputation Server",
   "TOPMed Imputation Server"
  ],
  "owner": "gwas-design"
 },
 {
  "id": "inborn-error-of-metabolism",
  "term": "Inborn error of metabolism",
  "aka": [
   "inherited metabolic disorder"
  ],
  "short": "A disease caused by an inherited defect in an enzyme or transporter of a metabolic pathway, so that a substance builds up or a product is missing. Archibald Garrod introduced the term in 1908.",
  "long": "<p>Garrod studied alkaptonuria, in which urine turns black on standing, and noticed in 1902 that it was more common among children of parents who were first cousins, as Mendel’s recessive inheritance predicts. In his 1908 Croonian Lectures he proposed that such diseases are inherited blocks in chemical pathways, decades before genes were known to encode enzymes. Phenylketonuria and maple syrup urine disease are examples on today’s newborn screening panels.</p>",
  "l1": "Slide 28 credits Garrod with “inborn errors of metabolism”; slide 19’s newborn screening panel is mostly made of them.",
  "see": [
   "phenylketonuria",
   "newborn-screening",
   "mendelian-disease"
  ],
  "links": [],
  "match": [
   "inborn error of metabolism",
   "inborn errors of metabolism"
  ],
  "noPlural": true,
  "owner": "genetic-epidemiology"
 },
 {
  "id": "indirect-genetic-effect",
  "term": "Indirect genetic effect (genetic nurture)",
  "aka": [
   "genetic nurture",
   "dynastic effect"
  ],
  "short": "An effect of a relative’s genotype, usually a parent’s, on a person’s trait through the environment the relative provides. Parents’ alleles that were not transmitted to a child can still affect the child this way.",
  "long": "<p>In 21,637 Icelanders with at least one genotyped parent, a polygenic score for educational attainment built from the alleles the parents did not transmit still predicted the child’s education, with an effect 29.9% as large as that of the transmitted alleles. Children inherit half of each parent’s alleles, so in a GWAS of unrelated people the indirect effects of the parents’ copies are added to the direct effect estimated for each allele.</p>",
  "l1": "Page 10 (direct effects, indirect effects and assortative mating); page 8 (families as a study design).",
  "see": [
   "direct-genetic-effect",
   "within-family-gwas",
   "polygenic-score",
   "assortative-mating"
  ],
  "links": [
   {
    "t": "Kong et al. 2018, Science: the nature of nurture",
    "u": "https://doi.org/10.1126/science.aan6877"
   }
  ],
  "match": [
   "indirect genetic effect",
   "indirect effect",
   "genetic nurture",
   "dynastic effect"
  ],
  "owner": "gwas-applications"
 },
 {
  "id": "individual-id",
  "term": "individual ID (IID)",
  "aka": [
   "within-family ID",
   "IID"
  ],
  "short": "The second column of a PLINK .fam file: the person's ID within their family. It cannot be 0, and the pair (family ID, individual ID) must be unique in a fileset.",
  "long": "<p>Programs that ignore the family ID, such as GrafAnc, need the individual ID alone to be unique. The practical's step 8 therefore rewrites the IDs with <code>plink --update-ids</code>, which reads a file of four columns: old FID, old IID, new FID, new IID.</p>",
  "l1": "Every IID in <code>penncath.fam</code> is 1; step 8 of the practical builds unique IIDs such as \"10002_1\".",
  "see": [
   "family-id",
   "fam-file"
  ],
  "links": [
   {
    "t": "PLINK 1.9: --update-ids",
    "u": "https://www.cog-genomics.org/plink/1.9/data#update_indiv"
   }
  ],
  "match": [
   "individual ID",
   "individual IDs",
   "within-family ID",
   "within-family IDs",
   "IID",
   "IIDs"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "plink-data"
 },
 {
  "id": "inverse-variance-weighting",
  "term": "Inverse-variance weighting (IVW)",
  "aka": [
   "IVW",
   "inverse-variance-weighted average"
  ],
  "short": "Combining several estimates of the same quantity in a weighted average in which each estimate’s weight is one over its squared standard error, so precise estimates count more. It is the standard fixed-effect meta-analysis and the main estimator of two-sample Mendelian randomization.",
  "long": "<p>For estimates \\(\\hat{\\beta}_k\\) with standard errors \\(s_k\\), the combined estimate is \\(\\sum_k w_k \\hat{\\beta}_k / \\sum_k w_k\\) with \\(w_k = 1/s_k^2\\), and its standard error is \\(1/\\sqrt{\\sum_k w_k}\\). Two cohorts with standard errors 0.02 and 0.04 get weights 2,500 and 625, so the first counts four times as much, and the combined standard error is \\(1/\\sqrt{3{,}125} = 0.018\\). In Mendelian randomization the averaged quantities are the per-SNP Wald ratios. Cochran’s Q checks whether the estimates differ more than their standard errors allow.</p>",
  "l1": "Page 9 (meta-analysis) and page 10 (Mendelian randomization, with a widget).",
  "see": [
   "meta-analysis",
   "fixed-random-effects",
   "cochran-q",
   "mendelian-randomization",
   "wald-ratio",
   "standard-error"
  ],
  "links": [
   {
    "t": "Willer, Li & Abecasis 2010, Bioinformatics: METAL",
    "u": "https://doi.org/10.1093/bioinformatics/btq340"
   },
   {
    "t": "Burgess, Butterworth & Thompson 2013, Genet Epidemiol: Mendelian randomization with summarized data",
    "u": "https://doi.org/10.1002/gepi.21758"
   }
  ],
  "match": [
   "inverse-variance weighting",
   "inverse-variance-weighted",
   "inverse-variance weighted",
   "inverse variance weighting",
   "IVW"
  ],
  "owner": "gwas-analysis"
 },
 {
  "id": "island-model",
  "term": "island model",
  "aka": [
   "Wright's island model"
  ],
  "short": "Wright's model of migration: many populations of N people each receive, every generation, a fraction m of their parents from a common pool. Drift and migration balance at an F_ST of about 1/(1 + 4Nm).",
  "long": "<p>Two copies sampled from one population share an ancestral copy with probability \\(F_{t+1} = 1/(2N) + (1 - 1/2N)(1 - m)^2 F_t\\), which levels off at \\(F^{*} \\approx 1/(1 + 4Nm)\\). Only the number of migrants per generation, \\(Nm\\), matters: one migrant per generation holds \\(F_{\\mathrm{ST}}\\) near 0.2 whatever the population size. When migrants come mainly from neighbors (isolation by distance), the same balance produces clines.</p>",
  "l1": "Slides 89–91 and 97 (migration); the drift widget on page 7 has a migration slider.",
  "see": [
   "gene-flow",
   "fst",
   "cline",
   "wright-fisher-model"
  ],
  "links": [
   {
    "t": "Wright 1931, Evolution in Mendelian populations",
    "u": "https://doi.org/10.1093/genetics/16.2.97"
   }
  ],
  "match": [
   "island model",
   "island models"
  ],
  "noPlural": true,
  "owner": "population-structure"
 },
 {
  "id": "isolated-population",
  "term": "Isolated population (population isolate)",
  "aka": [
   "population isolate",
   "founder population"
  ],
  "short": "A population that began from a small number of founders and then had little exchange with other populations for many generations, such as the Finnish, Icelandic or Sardinian populations. Some variants that are rare elsewhere have drifted to higher frequency there, so they are easier to study.",
  "long": "<p>The founder event and isolation have several consequences for GWAS. Some variants that are rare elsewhere can be tested in thousands rather than hundreds of thousands of people; FinnGen, for example, found associations with variants enriched in Finland. LD extends over longer stretches, which makes imputation accurate when members of the population are in the reference panel. Many participants are related, so mixed models are used. A finding may be hard to replicate elsewhere if the variant is rare in other populations.</p>",
  "l1": "Page 8 (populations used in GWAS); page 6 (LD in isolated populations); page 10 (who is studied).",
  "see": [
   "founder-effect",
   "bottleneck",
   "genetic-drift",
   "ld",
   "rare-variant",
   "mixed-model"
  ],
  "links": [
   {
    "t": "Kurki et al. 2023, Nature: FinnGen provides genetic insights from a well-phenotyped isolated population",
    "u": "https://doi.org/10.1038/s41586-022-05473-8"
   },
   {
    "t": "Sidore et al. 2015, Nat Genet: genome sequencing of Sardinians",
    "u": "https://doi.org/10.1038/ng.3368"
   }
  ],
  "match": [
   "isolated population",
   "population isolate"
  ],
  "owner": "gwas-design"
 },
 {
  "id": "king",
  "term": "KING (kinship estimation software)",
  "aka": [
   "KING-robust",
   "Kinship-based INference for Genome-wide association studies"
  ],
  "short": "A program, and a kinship estimator, that infers relatives from genotypes without using allele frequencies, so that differences in ancestry between people barely affect it. PLINK 2 implements its \"KING-robust\" estimator.",
  "long": "<p>For two people A and B, the KING-robust estimate of the kinship coefficient compares the number of SNPs at which both are heterozygous with twice the number at which they are opposite homozygotes, divided by the numbers of heterozygous SNPs of the two people. For unrelated people from one population the numerator has expected value 0 at every SNP, whatever the allele frequency; duplicates get ½, first-degree relatives ¼, second-degree ⅛, third-degree 1/16.</p><p>The usual cut-offs, 0.354, 0.177, 0.0884 and 0.0442, lie halfway on a logarithmic scale between successive degrees. The estimate is a kinship coefficient, half of PLINK 1.9's <code>PI_HAT</code>. PLINK 2's <code>--make-king-table</code> writes the estimates to a <code>.kin0</code> file and <code>--king-cutoff</code> picks people to remove so that no close relatives remain. The estimator underestimates kinship for relatives whose parents come from very different populations.</p>",
  "l1": "Page 18 (QC step 4), section on KING kinship with PLINK 2.",
  "see": [
   "kinship-coefficient",
   "pi-hat",
   "degree-of-relationship",
   "population-structure"
  ],
  "links": [
   {
    "t": "Manichaikul et al. 2010, Bioinformatics",
    "u": "https://doi.org/10.1093/bioinformatics/btq559"
   },
   {
    "t": "PLINK 2.0: KING-robust kinship estimator",
    "u": "https://www.cog-genomics.org/plink/2.0/distance"
   }
  ],
  "match": [
   "KING",
   "KING-robust"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "qc-relatedness"
 },
 {
  "id": "ld-heatmap",
  "term": "LD heatmap",
  "aka": [
   "LD plot",
   "Haploview plot"
  ],
  "short": "A picture of the LD between every pair of SNPs in a region: the SNPs in genome order along the top and one colored diamond per pair below them, usually colored by r² (white 0 to black 1) or by D′ and LOD.",
  "long": "<p>The pair of SNPs \\(i\\) and \\(j\\) sits where the diagonal down to the right from SNP \\(i\\) meets the diagonal down to the left from SNP \\(j\\), so it is half of the LD matrix rotated by 45°. LD blocks appear as dark (or red) triangles along the top, separated by pale stripes where recombination hotspots lie. The layout comes from Haploview; LDlink's LDmatrix draws the same information as a square.</p>",
  "l1": "Slides 95–96 show summaries of the same information; page 6 has an interactive heatmap for two simulated populations.",
  "see": [
   "ld-block",
   "r-squared",
   "d-prime",
   "haploview",
   "ld-matrix"
  ],
  "match": [
   "LD heatmap"
  ],
  "owner": "linkage-disequilibrium"
 },
 {
  "id": "ld-matrix",
  "term": "LD matrix",
  "aka": [
   "correlation matrix of variants"
  ],
  "short": "The M × M matrix of correlations r (or r²) between every pair of M variants, symmetric with ones on the diagonal. Fine-mapping, conditional analysis and LD score methods take it from the GWAS sample or from a reference panel of matching ancestry.",
  "long": "<p>Its size grows as \\(M^2\\): 10,000 variants need \\(10^8\\) entries, about 800 MB in double precision. Signed \\(r\\) depends on which allele is counted at each variant, so the matrix must use the same allele coding as the summary statistics. <code>plink --r2 square</code> writes one for the selected variants.</p>",
  "l1": "Page 6, LD in the data.",
  "see": [
   "ld-heatmap",
   "ld-reference-panel",
   "fine-mapping",
   "ld-score"
  ],
  "match": [
   "LD matrix",
   "LD matrices"
  ],
  "owner": "linkage-disequilibrium"
 },
 {
  "id": "ldlink",
  "term": "LDlink",
  "aka": [],
  "short": "A free web application from the US National Cancer Institute's Division of Cancer Epidemiology and Genetics that computes LD for chosen variants in the 1000 Genomes populations. Modules include LDpair (two variants), LDmatrix (a heatmap) and LDproxy (proxies within 500 kb).",
  "long": "<p>LDlink works on genome builds GRCh37 and GRCh38. Besides LD it links variants and their proxies to GWAS Catalog traits (LDtrait) and gene expression (LDexpress), prunes variant lists (SNPclip) and finds arrays that contain variants (SNPchip). An API, used by the R package LDlinkR, needs a registered access token.</p>",
  "l1": "Page 6, reference panels and the Run-it exercise.",
  "see": [
   "thousand-genomes",
   "ld-reference-panel",
   "ld-heatmap"
  ],
  "links": [
   {
    "t": "LDlink",
    "u": "https://ldlink.nih.gov/"
   },
   {
    "t": "Machiela & Chanock 2015",
    "u": "https://doi.org/10.1093/bioinformatics/btv402"
   }
  ],
  "match": [
   "LDlink",
   "LDpair",
   "LDmatrix",
   "LDproxy",
   "LDpop"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "linkage-disequilibrium"
 },
 {
  "id": "ldpred",
  "term": "LDpred (LDpred2)",
  "aka": [
   "LDpred2"
  ],
  "short": "A Bayesian method for polygenic scores that re-estimates the effects of all SNPs jointly from GWAS summary statistics and LD from a reference panel, shrinking them according to a prior on how many SNPs are causal and how much heritability they explain.",
  "long": "<p>Where C+T keeps one SNP per LD block, LDpred spreads the signal of a block over its correlated SNPs in proportion to the evidence, and shrinks noisy estimates toward zero. LDpred2 (2020) either estimates the prior’s parameters from the data (LDpred2-auto) or chooses them in a validation sample (LDpred2-grid); it is implemented in the R package bigsnpr.</p>",
  "l1": "Slide 51 (Session 6 covers polygenic risk scores; its practical compares LDpred2 with C+T); page 10 (methods for polygenic scores).",
  "see": [
   "polygenic-score",
   "clumping-and-thresholding",
   "prs-cs",
   "ld-reference-panel",
   "snp-heritability"
  ],
  "links": [
   {
    "t": "Vilhjálmsson et al. 2015, Am J Hum Genet: LDpred",
    "u": "https://doi.org/10.1016/j.ajhg.2015.09.001"
   },
   {
    "t": "Privé, Arbel & Vilhjálmsson 2020, Bioinformatics: LDpred2",
    "u": "https://doi.org/10.1093/bioinformatics/btaa1029"
   }
  ],
  "match": [
   "LDpred",
   "LDpred2"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "gwas-applications"
 },
 {
  "id": "li-stephens-model",
  "term": "Li–Stephens model",
  "aka": [
   "Li and Stephens model",
   "haplotype copying model"
  ],
  "short": "A model that describes a person’s haplotype as a mosaic of pieces copied from haplotypes in a reference panel, switching to another reference haplotype where recombination has occurred, with occasional mismatches. Most phasing and imputation programs are built on it.",
  "long": "<p>Proposed by Na Li and Matthew Stephens in 2003, it is a hidden Markov model: the hidden state at each SNP is the reference haplotype being copied. The probability of switching between neighboring SNPs grows with the genetic distance between them and falls as the panel grows (with more haplotypes, a close match lasts longer); a small mismatch probability allows for mutation and genotyping error. Given the typed alleles, the forward–backward algorithm gives, at every untyped SNP, the probability of copying each reference haplotype; adding up the haplotypes that carry each allele gives the imputed genotype probabilities and the dosage.</p>",
  "l1": "Page 8 (genotype imputation) draws the copying model and lets you run a simplified version.",
  "see": [
   "genotype-imputation",
   "phasing",
   "reference-panel",
   "haplotype",
   "recombination",
   "dosage"
  ],
  "links": [
   {
    "t": "Li & Stephens 2003, Genetics",
    "u": "https://doi.org/10.1093/genetics/165.4.2213"
   }
  ],
  "match": [
   "Li–Stephens model",
   "Li and Stephens model",
   "Li–Stephens",
   "Li-Stephens"
  ],
  "noPlural": true,
  "owner": "gwas-design"
 },
 {
  "id": "liability-scale",
  "term": "Liability scale",
  "aka": [],
  "short": "Expressing the heritability of a disease, or the variance a polygenic score explains, on the scale of the unobserved, normally distributed liability of the threshold model rather than on the observed 0/1 scale. Unlike the observed-scale value, it does not depend on the share of cases in the sample.",
  "long": "<p>A case–control sample with 50% cases gives a much larger observed-scale value than a population sample with 1% cases, for the same genetic effects. For heritability, Lee and colleagues gave the conversion: multiply the observed-scale value by \\(K^2(1-K)^2/\\big(z^2 P(1-P)\\big)\\), where \\(K\\) is the population prevalence, \\(P\\) the share of cases in the sample and \\(z\\) the height of the standard normal density at the liability threshold. A similar conversion applies to the \\(R^2\\) of a polygenic score.</p>",
  "l1": "Page 10 (the accuracy of polygenic scores).",
  "see": [
   "liability-threshold-model",
   "prevalence",
   "snp-heritability",
   "auc",
   "variance-explained"
  ],
  "links": [
   {
    "t": "Lee et al. 2011, Am J Hum Genet: estimating missing heritability for disease from GWAS",
    "u": "https://doi.org/10.1016/j.ajhg.2011.02.002"
   },
   {
    "t": "Lee et al. 2012, Genet Epidemiol: a better coefficient of determination for genetic profile analysis",
    "u": "https://doi.org/10.1002/gepi.21614"
   }
  ],
  "match": [
   "liability scale"
  ],
  "owner": "gwas-applications"
 },
 {
  "id": "likelihood",
  "term": "likelihood (log-likelihood)",
  "aka": [
   "likelihood function",
   "log-likelihood"
  ],
  "short": "The probability of the observed data under a model, read as a function of the model's unknown parameters. Its logarithm, the log-likelihood, turns a product over people into a sum; the parameter values that maximize it are the maximum-likelihood estimates.",
  "long": "<p>For two SNPs under random mating, a person with haplotypes AG and Ag has probability \\(2p_{\\mathrm{AG}}p_{\\mathrm{Ag}}\\), and a double heterozygote \\(2p_{\\mathrm{AG}}p_{\\mathrm{ag}} + 2p_{\\mathrm{Ag}}p_{\\mathrm{aG}}\\). Multiplying over people gives the likelihood of the four haplotype frequencies. A likelihood is not a probability distribution over the parameters, and only differences or ratios of likelihoods for the same data are meaningful: a log-likelihood higher by 2.6 means the data are \\(e^{2.6} \\approx 14\\) times more probable.</p>",
  "l1": "The EM section and widget on page 6; allele frequencies on page 5.",
  "see": [
   "em-algorithm",
   "haplotype-frequency"
  ],
  "match": [
   "likelihood",
   "log-likelihood"
  ],
  "owner": "linkage-disequilibrium"
 },
 {
  "id": "linear-regression",
  "term": "Linear regression",
  "aka": [
   "least squares",
   "ordinary least squares",
   "OLS"
  ],
  "short": "A model in which the expected value of an outcome is a straight-line function of one or more predictors; the coefficients are chosen to minimize the sum of squared differences between observed and predicted values. In a GWAS of a quantitative trait, the slope on genotype is the SNP’s effect.",
  "long": "<p>For one SNP, \\(y_i = \\alpha_0 + \\beta x_i + \\varepsilon_i\\), with \\(y_i\\) the trait value of person \\(i\\), \\(x_i\\) the number of copies (0, 1 or 2) of the effect allele, \\(\\alpha_0\\) the intercept, \\(\\beta\\) the slope and \\(\\varepsilon_i\\) the part of the trait the line does not explain. The least-squares slope is the covariance of genotype and trait divided by the variance of genotype, and its standard error is \\(\\hat{\\sigma}/\\sqrt{\\sum_i (x_i - \\bar{x})^2}\\), where \\(\\hat{\\sigma}\\) is the standard deviation of the residuals and \\(\\bar{x}\\) the mean genotype. Covariates such as age, sex and principal components enter as further predictors, so the slope is estimated holding them fixed.</p>",
  "l1": "Slide 47 (Session 2 runs these tests); page 9 (the association test) derives it and fits it in a widget.",
  "see": [
   "additive-model",
   "logistic-regression",
   "z-score",
   "standard-error",
   "covariate",
   "mixed-model"
  ],
  "links": [],
  "match": [
   "linear regression",
   "least squares",
   "least-squares"
  ],
  "owner": "gwas-analysis"
 },
 {
  "id": "linkage-equilibrium",
  "term": "linkage equilibrium",
  "aka": [
   "no LD"
  ],
  "short": "The absence of LD: the alleles at two loci occur together on chromosome copies as often as independence predicts, so each haplotype frequency is the product of its two allele frequencies and D = 0.",
  "long": "<p>Two loci in linkage equilibrium can still be close together and linked; equilibrium describes the population's haplotype frequencies, not the distance. Recombination moves a population toward linkage equilibrium by a factor \\(1 - \\theta\\) per generation, and drift moves it away again.</p>",
  "l1": "Page 6, measures and decay sections.",
  "see": [
   "ld",
   "ld-d",
   "haplotype-frequency"
  ],
  "match": [
   "linkage equilibrium"
  ],
  "owner": "linkage-disequilibrium"
 },
 {
  "id": "local-genetic-correlation",
  "term": "Local genetic correlation",
  "aka": [
   "regional genetic correlation"
  ],
  "short": "A genetic correlation estimated within one region of the genome instead of across the whole genome. Two traits can share effects in the same direction in some regions and in opposite directions in others, which a genome-wide value averages away.",
  "long": "<p>Methods such as ρ-HESS, SUPERGNOVA and LAVA estimate it from summary statistics and LD, in blocks of roughly one to two megabases chosen so that LD between blocks is weak. A region with a strong local correlation points to shared biology there; a genome-wide correlation near zero can hide strong local correlations of opposite signs.</p>",
  "l1": "Slide 50 (Session 5 covers post-GWAS analyses); page 10 (genetic correlation).",
  "see": [
   "genetic-correlation",
   "ld-score-regression",
   "pleiotropy"
  ],
  "links": [
   {
    "t": "Werme et al. 2022, Nat Genet: LAVA",
    "u": "https://doi.org/10.1038/s41588-022-01017-y"
   },
   {
    "t": "Zhang et al. 2021, Genome Biol: SUPERGNOVA",
    "u": "https://doi.org/10.1186/s13059-021-02478-w"
   }
  ],
  "match": [
   "local genetic correlation"
  ],
  "owner": "gwas-applications"
 },
 {
  "id": "lod",
  "term": "LOD (log of the odds)",
  "aka": [
   "log10 likelihood ratio"
  ],
  "short": "The base-10 logarithm of a likelihood ratio: how many times more probable the data are under one hypothesis than another, on a log scale. In LD heatmaps it compares the estimated haplotype frequencies with no LD; LOD 2 means 100 times more probable.",
  "long": "<p>Haploview's standard LD colors combine \\(D'\\) with this LOD: white for \\(D' &lt; 1\\) and LOD below 2, blue for \\(D' = 1\\) and LOD below 2, pink to red for \\(D' &lt; 1\\) and LOD at least 2, bright red for \\(D' = 1\\) and LOD at least 2. In family linkage studies the same idea is the <a href=\"glossary.html#lod-score\">LOD score</a>, which compares linkage with no linkage.</p>",
  "l1": "Page 6, LD heatmaps.",
  "see": [
   "lod-score",
   "ld-heatmap",
   "likelihood"
  ],
  "match": [
   "LOD"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "linkage-disequilibrium"
 },
 {
  "id": "logistic-regression",
  "term": "Logistic regression",
  "aka": [
   "logit model"
  ],
  "short": "A regression model for a yes/no outcome, such as case or control: the log of the odds of being a case is a straight-line function of the predictors. In a GWAS, the exponential of the genotype coefficient is the odds ratio per copy of the effect allele.",
  "long": "<p>The model is \\(\\ln\\big(P/(1-P)\\big) = \\alpha_0 + \\beta x\\), where \\(P\\) is the probability of being a case and \\(x\\) the number of copies of the effect allele. Its coefficients are maximum-likelihood estimates, found by iteration; \\(\\hat{\\beta} = 0.18\\) means an odds ratio of \\(e^{0.18} = 1.20\\) per allele. When cases are few and the variant is rare, the usual Wald test gives too many small p-values, which is why Firth’s correction or the saddle-point approximation (SAIGE, REGENIE) are used.</p>",
  "l1": "Slide 47 (Session 2 runs these tests); page 9 (the association test for diseases).",
  "see": [
   "odds-ratio",
   "linear-regression",
   "maximum-likelihood-estimate",
   "firth-correction",
   "saddle-point-approximation",
   "binary-trait"
  ],
  "links": [],
  "match": [
   "logistic regression"
  ],
  "owner": "gwas-analysis"
 },
 {
  "id": "long-range-ld-region",
  "term": "long-range LD region",
  "aka": [
   "region of long-range LD",
   "high-LD region"
  ],
  "short": "A stretch of the genome, several million base pairs long, in which SNPs far apart stay correlated. Such regions can dominate principal components, so they are often excluded before PCA and relatedness estimation, in addition to LD pruning.",
  "long": "<p>Price et al. (2008) found 24 autosomal regions, each spanning more than 2 Mb, whose SNPs drove top principal components of 327 European Americans genotyped on an Illumina 550K array, and saw them again in larger samples. They include the region of the MHC on chromosome 6 (25.5–33.5 Mb) and regions on chromosomes 8 (112–115 Mb) and 11 (46–57 Mb). Inversions are one known cause, because they suppress viable recombination inside the inverted segment.</p><p>Pruning in windows of tens of SNPs compares only nearby SNPs, so it thins these regions but leaves SNPs that are correlated over longer distances. The published coordinates belong to the genome build of the paper, which it does not name; check the build of the data before excluding them with <code>--exclude range</code>.</p>",
  "l1": "Page 17 (QC step 3) explains why pruning leaves these regions and how to exclude them; page 7 (population structure) shows what they do to principal components.",
  "see": [
   "ld-pruning",
   "mhc",
   "inversion",
   "pca"
  ],
  "links": [
   {
    "t": "Price et al. 2008, Long-range LD can confound genome scans in admixed populations",
    "u": "https://doi.org/10.1016/j.ajhg.2008.06.005"
   }
  ],
  "match": [
   "long-range LD regions",
   "long-range LD region",
   "regions of long-range LD",
   "region of long-range LD",
   "long-range LD"
  ],
  "noPlural": true,
  "owner": "qc-ld-pruning"
 },
 {
  "id": "lynch-syndrome",
  "term": "Lynch syndrome",
  "aka": [
   "hereditary nonpolyposis colorectal cancer",
   "HNPCC"
  ],
  "short": "An inherited condition caused by a pathogenic variant in one of the DNA mismatch-repair genes (MLH1, MSH2, MSH6, PMS2) or EPCAM. Carriers have high risks of colorectal and endometrial cancer; about 1 in 279 people carry such a variant.",
  "long": "<p>Mismatch repair corrects errors made when DNA is copied; tumors in carriers accumulate many small errors, which is how Lynch syndrome is often first suspected from a tumor test. Carriers are offered colonoscopy every one to two years, which finds and removes precancerous polyps. The carrier frequency of 1 in 279 is an estimate for the general population (Win et al. 2017): 1 in 1,946 for <em>MLH1</em>, 1 in 2,841 for <em>MSH2</em>, 1 in 758 for <em>MSH6</em> and 1 in 714 for <em>PMS2</em>.</p>",
  "l1": "Slide 19: “Lynch Syndrome/HNPCC”.",
  "see": [
   "brca1-brca2",
   "penetrance"
  ],
  "links": [
   {
    "t": "Win et al. 2017, Cancer Epidemiol Biomarkers Prev",
    "u": "https://doi.org/10.1158/1055-9965.EPI-16-0693"
   },
   {
    "t": "MedlinePlus Genetics: Lynch syndrome",
    "u": "https://medlineplus.gov/genetics/condition/lynch-syndrome/"
   }
  ],
  "match": [
   "Lynch syndrome",
   "HNPCC",
   "hereditary nonpolyposis colorectal cancer"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "genetic-epidemiology"
 },
 {
  "id": "mammographic-density",
  "term": "Mammographic density",
  "aka": [
   "breast density"
  ],
  "short": "The share of the breast that appears white on a mammogram (glandular and connective tissue) rather than dark (fat). Higher density raises the risk of breast cancer and makes tumors harder to see on the image.",
  "long": "<p>Density is reported on a scale such as the BI-RADS categories or as a percentage of the breast area. It is one of the strongest risk factors for breast cancer that is not genetic in the usual sense, although density is itself partly heritable. Risk models such as BOADICEA use it as one input next to questionnaire risk factors and a polygenic score.</p>",
  "l1": "Slide 20 (“MD” in the legend).",
  "see": [
   "risk-stratified-screening",
   "boadicea"
  ],
  "links": [
   {
    "t": "Boyd et al. 2007, New England Journal of Medicine",
    "u": "https://doi.org/10.1056/NEJMoa062790"
   }
  ],
  "match": [
   "mammographic density",
   "breast density"
  ],
  "noPlural": true,
  "owner": "genetic-epidemiology"
 },
 {
  "id": "map-function",
  "term": "map function (Haldane's)",
  "aka": [
   "Haldane map function",
   "Kosambi map function"
  ],
  "short": "A formula that converts map distance d (expected crossovers between two loci, in morgans) into the recombination fraction θ. Haldane's map function, which assumes crossovers occur independently, is θ = (1 − e^(−2d))/2.",
  "long": "<p>Under Haldane's assumption the number of crossovers between two loci is Poisson with mean \\(d\\), and \\(\\theta\\) is the probability that it is odd: \\(\\theta = \\tfrac{1}{2}(1 - e^{-2d})\\), inverted by \\(d = -\\tfrac{1}{2}\\ln(1 - 2\\theta)\\). For small distances \\(\\theta \\approx d\\) (1 cM gives 0.0099); for large ones \\(\\theta\\) approaches 0.5 (100 cM gives 0.432). Kosambi's map function allows for crossover interference.</p>",
  "l1": "Page 6, decay section and widget.",
  "see": [
   "recombination-fraction",
   "centimorgan",
   "genetic-map",
   "recombination-rate"
  ],
  "match": [
   "map function",
   "Haldane's map function"
  ],
  "owner": "linkage-disequilibrium"
 },
 {
  "id": "massively-parallel-reporter-assay",
  "term": "Massively parallel reporter assay (MPRA)",
  "aka": [
   "MPRA"
  ],
  "short": "A laboratory experiment that tests thousands of short DNA sequences at once for their ability to switch on a reporter gene in cells, each sequence tagged with its own barcode. Testing both alleles of each variant shows which variants change regulatory activity.",
  "long": "<p>Each candidate sequence (for example 150 base pairs around a GWAS variant, with one or the other allele) is placed next to a minimal promoter and a reporter gene carrying a unique barcode. After the library is put into cells, sequencing counts each barcode in the RNA and in the DNA; their ratio measures the sequence’s activity. A difference between the two alleles marks a variant with a regulatory effect in that cell type, though measured outside its normal place in the genome.</p>",
  "l1": "Slide 54 (Session 9 covers functional genomics); page 9 (functional follow-up).",
  "see": [
   "enhancer",
   "promoter",
   "eqtl",
   "crispr-cas9",
   "fine-mapping"
  ],
  "links": [
   {
    "t": "Tewhey et al. 2016, Cell",
    "u": "https://doi.org/10.1016/j.cell.2016.04.027"
   }
  ],
  "match": [
   "massively parallel reporter assay",
   "MPRA"
  ],
  "owner": "gwas-analysis"
 },
 {
  "id": "maximum-likelihood-estimate",
  "term": "Maximum-likelihood estimate (MLE)",
  "aka": [
   "maximum-likelihood estimation",
   "MLE"
  ],
  "short": "The value of an unknown parameter that makes the observed data most probable under a model. For an allele frequency it is the allele count divided by the number of allele copies.",
  "long": "<p>It is found by maximizing the likelihood or the log-likelihood, often by setting the derivative to zero: for the binomial likelihood of an allele count this gives \\(\\hat{p} = (2n_{11} + n_{12})/2n\\). When no formula exists, an iterative method such as the EM algorithm (gene counting for ABO blood groups) finds it. In large samples the estimate is close to normal, with variance equal to one over the curvature of the log-likelihood at its peak.</p>",
  "l1": "Page 5 derives the allele-frequency estimate as a maximum-likelihood estimate; page 6 estimates haplotype frequencies the same way.",
  "see": [
   "likelihood",
   "em-algorithm",
   "standard-error"
  ],
  "links": [],
  "match": [
   "maximum-likelihood estimate",
   "maximum likelihood estimate",
   "maximum-likelihood estimation",
   "maximum likelihood estimation"
  ],
  "owner": "frequencies-hwe"
 },
 {
  "id": "mcmc",
  "term": "Markov chain Monte Carlo (MCMC)",
  "aka": [
   "MCMC"
  ],
  "short": "A simulation method for Bayesian models: it produces a long sequence of parameter values in which each value depends on the previous one and values appear in proportion to their posterior probability, so averages over the sequence estimate the parameters and their uncertainty.",
  "long": "<p>STRUCTURE (Pritchard et al. 2000) uses MCMC to sample admixture proportions and component allele frequencies from their posterior distribution, which takes much longer than ADMIXTURE's maximum-likelihood fit but gives a spread of plausible values. The first part of the sequence (burn-in) is discarded because it still depends on the starting values.</p>",
  "l1": "Slide 99 (STRUCTURE); page 7, fitting the model.",
  "see": [
   "structure-admixture",
   "likelihood",
   "em-algorithm"
  ],
  "links": [
   {
    "t": "Pritchard, Stephens & Donnelly 2000 (STRUCTURE)",
    "u": "https://doi.org/10.1093/genetics/155.2.945"
   }
  ],
  "match": [
   "Markov chain Monte Carlo",
   "MCMC"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "population-structure"
 },
 {
  "id": "mendelian-genetics",
  "term": "Mendelian genetics",
  "aka": [],
  "short": "The study of how traits controlled by single genes pass from parents to children, following Mendel’s laws of segregation and independent assortment.",
  "long": "<p>Mendel (1866) crossed pea plants and found that discrete traits pass on as units that separate in fixed ratios, such as 3 : 1 among the offspring of two heterozygous parents. After his laws were rediscovered in 1900, Bateson, Punnett and others extended them, and Garrod showed in 1902 that a human disease, alkaptonuria, follows them. Diseases caused by a variant in one gene with near-complete penetrance are still called Mendelian diseases.</p><p>Slide 45 grays the box out, but Hardy–Weinberg tests and relatedness checks in the practical rest on its laws.</p>",
  "l1": "Slides 28–29 and 45: Mendel heads the list on slide 28, and Mendelian genetics is a foundation box of the field map (page 2).",
  "see": [
   "mendels-laws",
   "segregation",
   "recessive",
   "dominant",
   "penetrance"
  ],
  "links": [],
  "match": [
   "Mendelian genetics"
  ],
  "owner": "field-map"
 },
 {
  "id": "method-of-moments",
  "term": "Method of moments",
  "aka": [
   "moment estimator",
   "method-of-moments estimator"
  ],
  "short": "A way to estimate unknown parameters: write the expected values of statistics you can observe as functions of the parameters, set them equal to the observed values and solve.",
  "long": "<p>Example: among the \\(2n\\) allele copies of \\(n\\) people, the expected count of allele 1 is \\(2np\\); setting it equal to the observed count \\(2n_{11} + n_{12}\\) gives \\(\\hat{p} = (2n_{11} + n_{12})/(2n)\\).</p><p>PLINK's <code>--genome</code> uses the method of moments to estimate a pair's IBD fractions: the expected fractions of SNPs at which the pair shares 0, 1 or 2 alleles by state are written in terms of \\(k_0, k_1, k_2\\) and solved for them, giving <code>Z0</code>, <code>Z1</code> and <code>Z2</code>. <code>--het</code> also calls its inbreeding coefficient F a method-of-moments estimate: the observed number of homozygous genotypes is set equal to its expected value. Moment estimators are quick to compute but can fall outside the parameter's range (an estimated probability above 1 or below 0), which is why PLINK clips <code>Z0</code>, <code>Z1</code> and <code>Z2</code>.</p>",
  "l1": "Page 18 (QC step 4) derives PLINK's IBD estimator; page 19 (QC step 5) uses the same idea for F.",
  "see": [
   "ibd",
   "ibs",
   "pi-hat",
   "inbreeding-coefficient"
  ],
  "links": [
   {
    "t": "Purcell et al. 2007, PLINK (IBD estimation)",
    "u": "https://doi.org/10.1086/519795"
   },
   {
    "t": "PLINK 1.9: identity by descent",
    "u": "https://www.cog-genomics.org/plink/1.9/ibd"
   }
  ],
  "match": [
   "method of moments",
   "method-of-moments",
   "moment estimator"
  ],
  "owner": "qc-relatedness"
 },
 {
  "id": "mid-p-value",
  "term": "mid-p value",
  "aka": [
   "mid-p",
   "midp"
  ],
  "short": "For a test on counts: the probability of every outcome less likely than the one observed, plus half the probability of the outcomes exactly as likely. It is always a little smaller than the ordinary exact p-value.",
  "long": "<p>An exact test on counts, such as the Hardy–Weinberg exact test, can produce only a limited set of p-values. The ordinary exact p-value counts the observed outcome in full, so under the null hypothesis it falls below a level such as 0.05 less often than 5% of the time: the test is conservative. Counting the outcomes tied with the observed one at half weight brings the rate closer to the nominal level (Graffelman and Moreno 2013).</p><p>PLINK 1.9 computes it with the <code>midp</code> modifier of <code>--hardy</code> and <code>--hwe</code>, and its documentation recommends it. A SNP with only one allele has a single possible outcome, so its exact p-value is 1 and its mid-p value 0.5.</p>",
  "l1": "Page 16 (QC step 2): the widget shows both p-values, and the example filter is <code>--hwe 1e-6 midp</code>.",
  "see": [
   "hwe"
  ],
  "links": [
   {
    "t": "Graffelman & Moreno 2013, The mid p-value in exact tests for Hardy-Weinberg equilibrium",
    "u": "https://doi.org/10.1515/sagmb-2012-0039"
   },
   {
    "t": "PLINK 1.9: --hwe",
    "u": "https://www.cog-genomics.org/plink/1.9/filter#hwe"
   }
  ],
  "match": [
   "mid-p value",
   "mid-p"
  ],
  "owner": "qc-hwe"
 },
 {
  "id": "minor-allele-count",
  "term": "Minor allele count (MAC)",
  "aka": [
   "MAC"
  ],
  "short": "The number of copies of the less common allele of a variant in a sample: 2N times the minor allele frequency for N people. Association tests are stable only when this count, not just the frequency, is large enough.",
  "long": "<p>With 1,000 people, a variant with minor allele frequency 1% has about 20 copies; with 500,000 people, a variant at 0.1% has about 1,000. The large-sample approximations behind association p-values need enough copies in the sample (and, for a disease, enough among the cases), so analysis pipelines filter on a minimum count, for example with PLINK 2’s <code>--mac</code>, rather than only on frequency. This is why what counts as a common variant depends on the sample size.</p>",
  "l1": "Slide 52 (Session 7 covers rare-variant association studies); page 8 (Box 1: what counts as a common variant).",
  "see": [
   "maf",
   "rare-variant",
   "low-frequency-variant",
   "rare-variant-association-study"
  ],
  "links": [],
  "match": [
   "minor allele count"
  ],
  "owner": "gwas-design"
 },
 {
  "id": "modern-synthesis",
  "term": "Modern synthesis",
  "aka": [
   "evolutionary synthesis"
  ],
  "short": "The joining, from about 1918 to the 1940s, of Mendelian genetics with Darwin’s theory of evolution by natural selection, through the mathematical population genetics of Fisher, Wright and Haldane.",
  "long": "<p>Before the synthesis, followers of Mendel, who studied discrete traits, and biometricians such as Pearson, who studied continuous traits, disagreed about how inheritance works. Fisher (1918) showed that many Mendelian genes of small effect produce continuous variation and the observed correlations between relatives; Fisher, Wright and Haldane then worked out how selection, drift and mutation change allele frequencies. Julian Huxley’s book <em>Evolution: The Modern Synthesis</em> (1942) gave the movement its name.</p>",
  "l1": "Slide 28: Fisher, Wright and Haldane are listed for “the modern synthesis” (page 2).",
  "see": [
   "population-genetics",
   "natural-selection",
   "genetic-drift",
   "mendelian-genetics"
  ],
  "links": [],
  "match": [
   "modern synthesis"
  ],
  "noPlural": true,
  "owner": "field-map"
 },
 {
  "id": "molecular-genetics",
  "term": "Molecular genetics",
  "aka": [],
  "short": "The study of genes at the level of molecules: how DNA is copied, how genes are transcribed and translated into proteins, how their activity is regulated, and how variants change these steps.",
  "long": "<p>Molecular genetics grew from the findings that genes lie on chromosomes (Morgan, 1910), that DNA carries genetic information (Avery, MacLeod and McCarty, 1944; Hershey and Chase, 1952) and that DNA is a double helix (Watson and Crick, 1953). Its technologies, from DNA markers to genotyping arrays and sequencing, produce the data that genetic epidemiology analyzes.</p><p>Slide 45 grays the box out as a topic the course does not cover explicitly; Session 9 (functional genomics) returns to it.</p>",
  "l1": "Slides 28–29 and 45: one of the three traditions behind genetic epidemiology and a foundation box of the field map (page 2).",
  "see": [
   "dna",
   "double-helix",
   "chromosome",
   "functional-genomics"
  ],
  "links": [
   {
    "t": "Ingles, Basic concepts of molecular genetics, in Thomas 2004",
    "u": "https://doi.org/10.1093/oso/9780195159394.003.0002"
   }
  ],
  "match": [
   "molecular genetics"
  ],
  "owner": "field-map"
 },
 {
  "id": "molecular-qtl",
  "term": "Molecular QTL (molQTL)",
  "aka": [
   "molQTL",
   "xQTL",
   "sQTL",
   "mQTL",
   "caQTL"
  ],
  "short": "A genetic variant associated with a molecular measurement, such as a gene’s expression (eQTL), its splicing (sQTL), a protein level (pQTL), chromatin accessibility (caQTL) or DNA methylation (mQTL).",
  "long": "<p>Molecular traits sit closer to the DNA than diseases do, so their QTLs often have large effects and can be found in a few hundred samples. When a GWAS signal and a molecular QTL share the same causal variant (colocalization), the molecular trait suggests the gene and the mechanism through which the variant acts. GTEx mapped eQTLs and sQTLs in 49 tissues; eQTLGen mapped eQTLs in the blood of more than 31,000 people. Catalogs still miss many cell types, developmental stages and conditions, so a GWAS variant without a known QTL may act where nobody has measured.</p>",
  "l1": "Slides 49 and 54 (Sessions 4 and 9: colocalization and functional genomics); page 9 (from variants to genes).",
  "see": [
   "eqtl",
   "pqtl",
   "colocalization",
   "gtex",
   "splicing",
   "dna-methylation",
   "chromatin-accessibility"
  ],
  "links": [
   {
    "t": "GTEx Consortium 2020, Science",
    "u": "https://doi.org/10.1126/science.aaz1776"
   },
   {
    "t": "Võsa et al. 2021, Nat Genet: eQTLGen",
    "u": "https://doi.org/10.1038/s41588-021-00913-z"
   }
  ],
  "match": [
   "molecular QTL",
   "molQTL",
   "xQTL",
   "sQTL",
   "mQTL",
   "caQTL"
  ],
  "owner": "gwas-analysis"
 },
 {
  "id": "monoclonal-antibody",
  "term": "Monoclonal antibody",
  "aka": [
   "mAb"
  ],
  "short": "An antibody made in the laboratory from cells that all descend from one cell, so every molecule binds the same site on one target protein. Many drugs are monoclonal antibodies, for example evolocumab and alirocumab, which bind PCSK9.",
  "long": "<p>Antibodies are Y-shaped proteins of the immune system that bind other molecules tightly and specifically. A therapeutic antibody that binds a protein in the blood can stop it from binding its partner: evolocumab and alirocumab stop PCSK9 from binding the LDL receptor, and evinacumab blocks ANGPTL3. Antibodies are given by injection, every few weeks for these drugs.</p>",
  "l1": "The drugs that followed the PCSK9 and ANGPTL3 discoveries (slides 15–16) are monoclonal antibodies.",
  "see": [
   "drug-target"
  ],
  "links": [],
  "match": [
   "monoclonal antibody",
   "monoclonal antibodies"
  ],
  "noPlural": true,
  "owner": "genetic-epidemiology"
 },
 {
  "id": "mr-egger",
  "term": "MR-Egger regression",
  "aka": [
   "MR-Egger",
   "Egger regression"
  ],
  "short": "A Mendelian randomization method that regresses the SNPs’ effects on the outcome on their effects on the exposure without forcing the line through zero. The slope estimates the causal effect even when SNPs have direct effects on the outcome, provided those effects are independent of the SNPs’ strength; an intercept away from zero signals directional pleiotropy.",
  "long": "<p>The SNPs are first oriented so that every effect on the exposure is positive. The independence condition is called InSIDE (instrument strength independent of direct effect). The price of the free intercept is precision: the standard error of the MR-Egger slope is usually much larger than that of the inverse-variance-weighted estimate, and the method needs SNPs whose effects on the exposure differ in size. It borrows its idea from Egger’s test for small-study bias in meta-analysis.</p>",
  "l1": "Page 10 (Mendelian randomization) and its widget; page 1 introduces Mendelian randomization.",
  "see": [
   "mendelian-randomization",
   "inverse-variance-weighting",
   "horizontal-pleiotropy",
   "weighted-median-estimator",
   "instrumental-variable"
  ],
  "links": [
   {
    "t": "Bowden, Davey Smith & Burgess 2015, Int J Epidemiol",
    "u": "https://doi.org/10.1093/ije/dyv080"
   }
  ],
  "match": [
   "MR-Egger",
   "MR-Egger regression",
   "Egger regression"
  ],
  "noPlural": true,
  "owner": "gwas-applications"
 },
 {
  "id": "net-reclassification-index",
  "term": "Net reclassification index (NRI)",
  "aka": [
   "NRI",
   "net reclassification improvement"
  ],
  "short": "A measure of how much adding a new predictor, such as a polygenic score, to a risk model moves people into more appropriate risk categories: the share of future cases moved up minus the share moved down, plus the share of non-cases moved down minus the share moved up.",
  "long": "<p>If adding a score moves 10% of future cases up and 4% down, and 6% of non-cases down and 5% up, the NRI is \\((0.10 - 0.04) + (0.06 - 0.05) = 0.07\\). It depends on the chosen risk categories, and its two parts should be reported separately, because the same total can come from very different effects on cases and on non-cases.</p>",
  "l1": "Page 10 (from relative to absolute risk).",
  "see": [
   "absolute-risk",
   "auc",
   "polygenic-score"
  ],
  "links": [
   {
    "t": "Pencina et al. 2008, Stat Med",
    "u": "https://doi.org/10.1002/sim.2929"
   }
  ],
  "match": [
   "net reclassification index",
   "net reclassification improvement",
   "NRI"
  ],
  "owner": "gwas-applications"
 },
 {
  "id": "newborn-screening",
  "term": "Newborn screening",
  "aka": [
   "neonatal screening",
   "heel-prick test"
  ],
  "short": "Testing every baby shortly after birth, usually from drops of blood dried on filter paper, for treatable conditions that cause no symptoms at first, so that treatment can start before harm is done.",
  "long": "<p>In the United States, the American College of Medical Genetics (ACMG) recommended in 2006 a uniform panel of 29 core conditions, chosen by scoring each candidate on whether a test exists, whether treatment helps, and how well the condition is understood; 25 further conditions are found as by-products. The federal Recommended Uniform Screening Panel that grew from it lists 38 core and 26 secondary conditions since infantile Krabbe disease was added in July 2024.</p><p>Most of these tests measure metabolites or proteins, not DNA: tandem mass spectrometry for amino acids and acylcarnitines, immunoassays for hormones, separation of hemoglobin types. DNA is tested as a second step for some conditions such as cystic fibrosis. A positive screen is not a diagnosis; the baby is recalled for confirmatory testing.</p>",
  "l1": "Slide 19: “Diagnostic: screening newborns – Amer. College of Med. Genetics: screen for 29 conditions”.",
  "see": [
   "phenylketonuria",
   "inborn-error-of-metabolism",
   "tandem-mass-spectrometry",
   "hemoglobinopathy"
  ],
  "links": [
   {
    "t": "ACMG Newborn Screening Expert Group 2006, Pediatrics",
    "u": "https://doi.org/10.1542/peds.2005-2633I"
   },
   {
    "t": "HRSA: Recommended Uniform Screening Panel",
    "u": "https://www.hrsa.gov/advisory-committees/heritable-disorders/rusp"
   }
  ],
  "match": [
   "newborn screening",
   "neonatal screening",
   "screening newborns"
  ],
  "noPlural": true,
  "owner": "genetic-epidemiology"
 },
 {
  "id": "noncentrality-parameter",
  "term": "Noncentrality parameter (λ)",
  "aka": [
   "non-centrality parameter",
   "NCP"
  ],
  "short": "A number that measures how far a true effect moves a test statistic away from its distribution under the null hypothesis. For a test with 1 degree of freedom the average of z² is 1 + λ, and the power depends only on λ and the threshold.",
  "long": "<p>For a quantitative trait, \\(\\lambda \\approx N \\cdot 2p(1-p)\\beta^2/\\sigma^2\\), with \\(N\\) people, effect-allele frequency \\(p\\), effect \\(\\beta\\) per allele and trait variance \\(\\sigma^2\\): roughly the number of people times the share of the trait’s variance that the SNP explains, so doubling \\(N\\) doubles \\(\\lambda\\). At the genome-wide threshold (\\(|z| > 5.45\\)), 80% power needs \\(\\sqrt{\\lambda} = 5.45 + 0.84 = 6.29\\), so \\(\\lambda \\approx 39.6\\). A measured SNP in LD \\(r^2\\) with the causal SNP has noncentrality \\(r^2 \\lambda\\). This \\(\\lambda\\) is not the genomic inflation factor \\(\\lambda_{\\mathrm{GC}}\\), which shares the letter.</p>",
  "l1": "Page 8 (power calculator, tag SNPs and unscreened controls); page 9 (where the z of an associated SNP is centered).",
  "see": [
   "statistical-power",
   "chi-square-distribution",
   "tag-snp",
   "genomic-inflation"
  ],
  "links": [
   {
    "t": "Sham & Purcell 2014, Nat Rev Genet",
    "u": "https://doi.org/10.1038/nrg3706"
   }
  ],
  "match": [
   "noncentrality parameter",
   "non-centrality parameter",
   "noncentrality"
  ],
  "owner": "gwas-design"
 },
 {
  "id": "normal-distribution",
  "term": "Normal distribution",
  "aka": [
   "Gaussian distribution"
  ],
  "short": "The bell-shaped distribution described by a mean and a standard deviation; 95% of its values lie within 1.96 standard deviations of the mean. Sums of many independent pieces, such as binomial counts with many trials, are close to normal.",
  "long": "<p>The standard normal distribution has mean 0 and standard deviation 1. Squaring a standard normal variable gives the chi-square distribution with 1 degree of freedom, which is why the 5% cutoff 3.84 equals \\(1.96^2\\).</p>",
  "l1": "Page 5 uses it for confidence intervals and compares it with simulated allele frequencies.",
  "see": [
   "standard-deviation",
   "confidence-interval",
   "chi-square-distribution"
  ],
  "links": [],
  "match": [
   "normal distribution",
   "Gaussian distribution"
  ],
  "owner": "frequencies-hwe"
 },
 {
  "id": "null-hypothesis",
  "term": "Null hypothesis",
  "aka": [
   "H0"
  ],
  "short": "The precise statement about a population that a statistical test looks for evidence against, for example that a SNP's genotype frequencies are p², 2pq and q². A test cannot prove it; it can only show that the data would be unusual if it were true.",
  "long": "<p>A test asks how probable data at least as extreme as the observed data would be if the null hypothesis were true; that probability is the p-value. Rejecting the null hypothesis whenever the p-value falls below a significance level fixed in advance keeps the rate of false positives at that level. In Lecture 1 the null hypotheses are Hardy–Weinberg proportions at a SNP (QC step 2) and no association between a SNP and the trait (the GWAS itself).</p>",
  "l1": "Page 5 builds the Hardy–Weinberg test from its null hypothesis; association tests use the null hypothesis of no association at every SNP.",
  "see": [
   "test-statistic",
   "p-value",
   "significance-level",
   "hwe"
  ],
  "links": [
   {
    "t": "OpenIntro Statistics (free textbook), chapter on foundations for inference",
    "u": "https://www.openintro.org/book/os/"
   }
  ],
  "match": [
   "null hypothesis",
   "null hypotheses"
  ],
  "noPlural": true,
  "owner": "frequencies-hwe"
 },
 {
  "id": "open-targets",
  "term": "Open Targets",
  "aka": [
   "Open Targets Platform",
   "Open Targets Genetics"
  ],
  "short": "A public–private partnership and free online platform that collects evidence linking genes and their proteins to diseases, including GWAS associations, to help choose drug targets.",
  "long": "<p>The Platform scores each target–disease pair from genetic associations, somatic mutations, known drugs, expression, animal models and the literature. Its genetics component assigns each GWAS locus to its likely causal genes with a locus-to-gene model that combines fine-mapping, molecular QTLs, chromatin interactions and distance.</p>",
  "l1": "Page 10 (outlook: drugs); page 1 (drug targets).",
  "see": [
   "drug-target",
   "drug-repurposing",
   "fine-mapping",
   "molecular-qtl",
   "post-gwas-studies"
  ],
  "links": [
   {
    "t": "Open Targets Platform",
    "u": "https://platform.opentargets.org/"
   },
   {
    "t": "Ochoa et al. 2021, Nucleic Acids Res",
    "u": "https://doi.org/10.1093/nar/gkaa1027"
   },
   {
    "t": "Mountjoy et al. 2021, Nat Genet: locus-to-gene",
    "u": "https://doi.org/10.1038/s41588-021-00945-5"
   }
  ],
  "match": [
   "Open Targets",
   "Open Targets Platform",
   "Open Targets Genetics"
  ],
  "noPlural": true,
  "owner": "gwas-applications"
 },
 {
  "id": "p-value",
  "term": "p-value",
  "aka": [
   "P value"
  ],
  "short": "The probability, if the null hypothesis were true, of a test statistic at least as extreme as the one observed. A small p-value means that the data would be unusual under the null hypothesis; it is not the probability that the null hypothesis is true.",
  "long": "<p>When the null hypothesis is true, a continuous test's p-value is equally likely to fall anywhere between 0 and 1, so a share \\(t\\) of tests fall below any threshold \\(t\\); for a discrete test, such as the exact HWE test, at most that share. Across \\(M\\) tests about \\(Mt\\) fall below \\(t\\) by chance, which is why genome-wide work uses thresholds such as 10⁻⁶ for QC and 5 × 10⁻⁸ for association. On this site \\(p\\) in an equation is an allele frequency, so p-values are written in words.</p>",
  "l1": "The P column of PLINK's .hwe report (QC step 2) and of association results; page 5 explains how it is computed.",
  "see": [
   "null-hypothesis",
   "significance-level",
   "mid-p-value",
   "multiple-testing",
   "qq-plot"
  ],
  "links": [
   {
    "t": "Wasserstein & Lazar 2016: the ASA statement on p-values",
    "u": "https://doi.org/10.1080/00031305.2016.1154108"
   }
  ],
  "match": [
   "p-value",
   "p value"
  ],
  "owner": "frequencies-hwe"
 },
 {
  "id": "path-analysis",
  "term": "Path analysis",
  "short": "Sewall Wright’s method (1921) of splitting correlations along a diagram of causes. Along a single chain of causes, the effects multiply.",
  "long": "<p>If a variant affects a trait only through LDL cholesterol, its effect on the trait is its effect on LDL times the effect of LDL on the trait. The same product underlies the Wald ratio of Mendelian randomization (page 1) and the test of the margarine example (page 3).</p>",
  "l1": "Page 2, timeline (1921); page 3, Margarine versus butter.",
  "see": [
   "mendelian-randomization",
   "wald-ratio"
  ],
  "links": [],
  "match": [
   "path analysis"
  ],
  "noPlural": true,
  "owner": "social-context"
 },
 {
  "id": "path-variable",
  "term": "PATH (program search path)",
  "short": "The environment variable that lists, in order, the folders in which the shell looks for a program when you type its name. A program outside these folders gives \"command not found\" unless you type its full path.",
  "long": "<p>Show it with <code>echo $PATH</code>; <code>which plink</code> shows which file the name <code>plink</code> runs. <code>export PATH=\"$HOME/statgen-workshop/tools:$PATH\"</code> adds a folder for the current session; put that line in the shell's start-up file (<code>~/.zshrc</code> on macOS, <code>~/.bashrc</code> on Linux) to keep it.</p>",
  "see": [
   "environment-variable",
   "shell"
  ],
  "match": [
   "PATH"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "tools"
 },
 {
  "id": "pc-projection",
  "term": "projection onto principal components",
  "aka": [
   "PC projection",
   "projected PCs"
  ],
  "short": "Placing new people on principal components computed from other people (for example a reference panel) by multiplying their standardized genotypes by the SNP weights. The axes then do not depend on the new people, but projected scores shrink toward the origin.",
  "long": "<p>For a new person with standardized genotypes \\(z_j\\) (standardized with the reference allele frequencies), the coordinate on component \\(k\\) is \\(\\sum_j z_j v_{jk}/\\sqrt{m}\\), on the scale of \\(\\mathbf{u}_k\\sqrt{\\ell_k}\\). Because the weights were fitted to the reference people, new people sit closer to the origin than reference people from the same population (shrinkage), more so on later components (Privé et al. 2020). PLINK 1.9 projects with <code>--pca-cluster-names</code>; PLINK 2 with <code>--pca allele-wts</code> followed by <code>--score</code>.</p>",
  "l1": "QC step 7 (reference-based PCA); page 7, projection.",
  "see": [
   "snp-loading",
   "pca",
   "thousand-genomes"
  ],
  "links": [
   {
    "t": "Privé et al. 2020, best practices for PCA of population genetic data",
    "u": "https://doi.org/10.1093/bioinformatics/btaa520"
   },
   {
    "t": "PLINK 2.0: PCA projection with --score",
    "u": "https://www.cog-genomics.org/plink/2.0/score"
   }
  ],
  "match": [
   "PC projection",
   "projection onto",
   "project onto",
   "projected onto",
   "projected coordinates",
   "projected scores"
  ],
  "noPlural": true,
  "owner": "population-structure"
 },
 {
  "id": "penncath",
  "term": "PennCATH",
  "aka": [
   "PennCATH study",
   "Penn catheterization study"
  ],
  "short": "A hospital-based study of coronary artery disease at the University of Pennsylvania, of patients who had cardiac catheterization in 1998–2003. Genotype data on 1,401 of its participants (861,473 SNPs) are a widely used teaching dataset and the data of the Session 1 practical.",
  "long": "<p>The genotyped subset was a case–control study nested in the cohort. Cases had at least one coronary artery narrowed by 50% or more at an early age (men 60 or younger, women 65 or younger); controls had less than 10% narrowing in every vessel (men older than 40, women older than 45). The publications describe the participants as white or of European ancestry. PennCATH was one of the discovery studies of Reilly et al. 2011 (<em>Lancet</em>), and its genotypes, measured on the Affymetrix 6.0 array, were later released for teaching with Reed et al. 2015 (<em>Statistics in Medicine</em>).</p>",
  "l1": "Slide 8 and the practical: <code>penncath.bed</code>, <code>.bim</code> and <code>.fam</code> (page 11 describes the dataset; page 12 opens the files).",
  "see": [
   "coronary-artery-disease",
   "case-control-study",
   "plink-binary",
   "coronary-angiography"
  ],
  "links": [
   {
    "t": "Reilly et al. 2011, Lancet",
    "u": "https://doi.org/10.1016/S0140-6736(10)61996-4"
   },
   {
    "t": "Reed et al. 2015, Stat Med",
    "u": "https://doi.org/10.1002/sim.6605"
   }
  ],
  "match": [
   "PennCATH"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "practical-overview"
 },
 {
  "id": "pgs-catalog",
  "term": "PGS Catalog",
  "aka": [
   "Polygenic Score Catalog"
  ],
  "short": "An open database of published polygenic scores, run by EMBL-EBI and partners. For each score it gives the scoring file (variants, effect alleles and weights), how the score was developed and each published evaluation of its accuracy, with the ancestry of the samples.",
  "long": "<p>Its release of 23 October 2026 held 7,029 scores for 820 traits from 850 publications. Scoring files can be applied to new genotype data with PLINK’s <code>--score</code> or the catalog’s own pipeline, pgsc_calc. A score’s reported accuracy holds for the population in which it was evaluated; the catalog’s ancestry information shows how far that population is from the one in which the score will be used.</p>",
  "l1": "Slide 51 (Session 6 covers polygenic risk scores); page 10 (polygenic scores).",
  "see": [
   "polygenic-score",
   "gwas-catalog",
   "summary-statistics"
  ],
  "links": [
   {
    "t": "PGS Catalog",
    "u": "https://www.pgscatalog.org/"
   },
   {
    "t": "Lambert et al. 2021, Nat Genet",
    "u": "https://doi.org/10.1038/s41588-021-00783-5"
   },
   {
    "t": "Lambert et al. 2024, Nat Genet: pgsc_calc",
    "u": "https://doi.org/10.1038/s41588-024-01937-x"
   }
  ],
  "match": [
   "PGS Catalog",
   "Polygenic Score Catalog"
  ],
  "noPlural": true,
  "owner": "gwas-applications"
 },
 {
  "id": "pharmacogenetics",
  "term": "Pharmacogenetics",
  "aka": [
   "pharmacogenomics"
  ],
  "short": "The study of inherited differences in how people respond to drugs, in benefit or in side effects.",
  "long": "<p>The idea goes back to Garrod, who argued that the chemical individuality behind inborn errors of metabolism also explains why people react differently to drugs and foods. Friedrich Vogel named the field in 1959, after inherited differences in the response to several drugs had been described in the 1950s. Genome-wide studies of drug response are often called pharmacogenomics.</p>",
  "l1": "Slide 28: listed with Garrod under clinical genetics (page 2).",
  "see": [
   "clinical-genetics",
   "inborn-error-of-metabolism",
   "drug-target"
  ],
  "links": [],
  "match": [
   "pharmacogenetics",
   "pharmacogenomics"
  ],
  "noPlural": true,
  "owner": "field-map"
 },
 {
  "id": "phenylketonuria",
  "term": "Phenylketonuria",
  "aka": [
   "PKU"
  ],
  "short": "An inherited recessive disease, caused by variants in the gene PAH, in which the amino acid phenylalanine cannot be broken down and builds up in the blood, damaging the developing brain. A diet low in phenylalanine started soon after birth prevents the damage.",
  "long": "<p>Phenylketonuria was the first condition screened for in all newborns, because a cheap blood test can find it before symptoms appear and because early treatment works. It is also the textbook example that a strongly genetic disease can be prevented by changing the environment (the diet).</p>",
  "l1": "Slide 19 lists phenylketonuria (PKU) among the newborn screening conditions.",
  "see": [
   "newborn-screening",
   "inborn-error-of-metabolism",
   "mendelian-disease"
  ],
  "links": [
   {
    "t": "MedlinePlus Genetics: phenylketonuria",
    "u": "https://medlineplus.gov/genetics/condition/phenylketonuria/"
   }
  ],
  "match": [
   "phenylketonuria",
   "PKU"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "genetic-epidemiology"
 },
 {
  "id": "pipe-r",
  "term": "Pipe operator (R)",
  "aka": [
   "%>%",
   "|>"
  ],
  "short": "An R operator that passes the value on its left as the first argument of the function call on its right, so x %>% f(y) means f(x, y). %>% comes with the tidyverse; |> is built into R since version 4.1.",
  "see": [
   "dplyr",
   "tidyverse"
  ],
  "match": [
   "pipe operator"
  ],
  "owner": "tools"
 },
 {
  "id": "plink-a1",
  "term": "A1 and A2 (PLINK allele columns)",
  "aka": [
   "allele 1 and allele 2 in PLINK"
  ],
  "short": "PLINK's names for the two alleles of a SNP: A1 is column 5 of the .bim file and A2 column 6. PLINK counts copies of A1 (0, 1 or 2), and PLINK 1.9 makes A1 the minor allele whenever it writes a fileset, unless --keep-allele-order is given.",
  "long": "<p>A1 is not the reference-genome allele, not necessarily the allele that raises risk, and not fixed: if filtering changes which allele is rarer, the next <code>--make-bed</code> swaps A1 and A2 for that SNP and the 0/1/2 counts become 2/1/0. Compare results across files by checking the A1 column, not by assuming it.</p><p>Other software names the same two columns differently (for example a0/a1 in pandas-plink and alt/ref in the R package genio), and some count the second allele by default.</p>",
  "l1": "Output files of the practical (.hwe, and .frq if you run --freq) report A1 and A2 for every SNP.",
  "see": [
   "bim-file",
   "minor-allele",
   "effect-allele",
   "reference-allele"
  ],
  "links": [
   {
    "t": "PLINK 1.9: --keep-allele-order",
    "u": "https://www.cog-genomics.org/plink/1.9/data#ax_allele"
   }
  ],
  "match": [
   "A1",
   "A2"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "plink-data"
 },
 {
  "id": "population-genetics",
  "term": "Population genetics",
  "aka": [],
  "short": "The study of how allele and genotype frequencies are distributed within and among populations, and of how mutation, genetic drift, migration, natural selection and mating patterns change them over generations.",
  "long": "<p>Population genetics supplies the expectations that GWAS quality control and analysis test against: Hardy–Weinberg proportions of genotypes, the decay of linkage disequilibrium with distance along the genome, and differences in allele frequency between populations, summarized by F<sub>ST</sub> or by principal components. Its mathematical theory was built by Fisher, Wright and Haldane in the 1920s and 1930s.</p><p>On the field map of slide 29 it is the foundation box captioned “The distribution of genetic variation among human populations”; Sessions 1 and 7 highlight it.</p>",
  "l1": "Slide 29: one of the four foundation boxes of the field map; Sessions 1 and 7 highlight it (page 2).",
  "see": [
   "hwe",
   "fst",
   "genetic-drift",
   "natural-selection",
   "modern-synthesis"
  ],
  "links": [
   {
    "t": "1000 Genomes Project Consortium 2015, Nature",
    "u": "https://doi.org/10.1038/nature15393"
   }
  ],
  "match": [
   "population genetics"
  ],
  "owner": "field-map"
 },
 {
  "id": "post-gwas-studies",
  "term": "Post-GWAS studies",
  "aka": [
   "post-GWAS analyses"
  ],
  "short": "Analyses that start from GWAS results to find the causal variants and genes behind an association, the mechanism by which they act, and what the associations predict or imply.",
  "long": "<p>They include statistical fine-mapping (which variant in an associated region is causal), colocalization (whether two traits, such as a disease and the expression of a gene, share a causal variant), transcriptome-wide association studies, estimates of SNP heritability and of its enrichment in classes of variants, polygenic scores, and Mendelian randomization. Most of them need only GWAS summary statistics plus reference data such as a linkage disequilibrium panel or gene expression measurements.</p><p>On the field map the box is captioned “Understanding biologic mechanisms behind genetic associations”; Sessions 3–9 highlight it.</p>",
  "l1": "Slide 29: the third design box of the field map; Sessions 3–9 highlight it (page 2).",
  "see": [
   "fine-mapping",
   "colocalization",
   "twas",
   "snp-heritability",
   "polygenic-score",
   "mendelian-randomization",
   "summary-statistics"
  ],
  "links": [
   {
    "t": "Visscher et al. 2017, American Journal of Human Genetics",
    "u": "https://doi.org/10.1016/j.ajhg.2017.06.005"
   }
  ],
  "match": [
   "post-GWAS studies",
   "post-GWAS study",
   "post-GWAS analyses",
   "post-GWAS analysis"
  ],
  "noPlural": true,
  "owner": "field-map"
 },
 {
  "id": "posterior-inclusion-probability",
  "term": "Posterior inclusion probability (PIP)",
  "aka": [
   "PIP"
  ],
  "short": "In Bayesian fine-mapping, the probability that a given SNP is a causal variant in its region, given the association statistics, the LD between SNPs and the model’s assumptions.",
  "long": "<p>Under the simplest assumptions (exactly one causal variant in the region, every SNP equally likely to be it beforehand), each SNP’s PIP is its Bayes factor divided by the sum of the Bayes factors of all SNPs in the region, and the PIPs sum to 1. Two SNPs in perfect LD get the same PIP, because the data cannot tell them apart. Methods that allow several causal variants, such as FINEMAP and SuSiE, give PIPs that can sum to more than 1 over a region: about the expected number of causal variants. A 95% credible set collects SNPs in order of decreasing PIP until their PIPs sum to 0.95.</p>",
  "l1": "Slide 49 (Session 4 covers fine-mapping); page 9 (fine-mapping) computes PIPs in a widget.",
  "see": [
   "fine-mapping",
   "credible-set",
   "bayes-factor",
   "susie",
   "finemap"
  ],
  "links": [
   {
    "t": "Schaid, Chen & Larson 2018, Nat Rev Genet: statistical fine-mapping",
    "u": "https://doi.org/10.1038/s41576-018-0016-z"
   }
  ],
  "match": [
   "posterior inclusion probability",
   "PIP"
  ],
  "owner": "gwas-analysis"
 },
 {
  "id": "predixcan",
  "term": "PrediXcan",
  "aka": [
   "S-PrediXcan"
  ],
  "short": "A method and software for a transcriptome-wide association study: it predicts each gene’s expression from genotypes with weights trained in a reference dataset such as GTEx, and tests the predicted expression for association with a trait. S-PrediXcan does the same from GWAS summary statistics.",
  "long": "<p>PrediXcan (Gamazon et al. 2015) trains an elastic-net regression of a gene’s measured expression on the variants within 1 Mb of the gene in a reference dataset, then applies the weights to people who have genotypes and a trait but no expression data.</p>",
  "l1": "Slide 25 (TWAS); covered in Session 5.",
  "see": [
   "twas",
   "transcriptome-imputation",
   "gtex",
   "fusion-twas"
  ],
  "links": [
   {
    "t": "Gamazon et al. 2015, Nature Genetics",
    "u": "https://doi.org/10.1038/ng.3367"
   }
  ],
  "match": [
   "PrediXcan",
   "S-PrediXcan"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "genetic-epidemiology"
 },
 {
  "id": "preregistration",
  "term": "Preregistration (and registered reports)",
  "aka": [
   "pre-registration",
   "registered report",
   "HARKing"
  ],
  "short": "Publicly recording a study’s hypotheses, data and analysis plan, with a date, before analyzing the data. It separates planned from exploratory analyses and prevents choosing the analysis after seeing the results.",
  "long": "<p>Plans can be deposited at the Open Science Framework, under an embargo if needed. In a registered report, a journal reviews the introduction and methods before the results exist and commits to publishing the paper if the plan is followed, whatever the results. Both protect against hypothesizing after the results are known (HARKing) and against trying many analyses and reporting the one that worked, practices that inflate the type 1 error rate. A GWAS already tests every variant in a predefined way, so preregistration matters most for follow-up analyses with many choices, such as polygenic score, Mendelian randomization and gene-set analyses.</p>",
  "l1": "Page 10 (sharing results).",
  "see": [
   "type-1-error",
   "multiple-testing",
   "fair-principles"
  ],
  "links": [
   {
    "t": "Nosek et al. 2018, PNAS: the preregistration revolution",
    "u": "https://doi.org/10.1073/pnas.1708274114"
   },
   {
    "t": "Open Science Framework registries",
    "u": "https://osf.io/registries"
   }
  ],
  "match": [
   "preregistration",
   "pre-registration",
   "preregistered",
   "registered report",
   "HARKing"
  ],
  "owner": "gwas-applications"
 },
 {
  "id": "proxy-phenotype",
  "term": "Proxy phenotype (and GWAS by proxy)",
  "aka": [
   "GWAS by proxy",
   "GWAX",
   "proxy-phenotype method"
  ],
  "short": "An easier-to-measure trait that is correlated with the trait of interest and is analyzed in its place to reach a larger sample, for example educational attainment as a proxy for cognitive performance.",
  "long": "<p>A proxy has genetic influences of its own, so a locus found for the proxy has to be confirmed for the target trait. In GWAS by proxy, people without a diagnosis count as partial cases when a parent or sibling has the disease, from family history reported by the participants; this adds power for diseases of late onset, such as Alzheimer’s disease, that many participants are too young to have developed, but relies on the accuracy of what participants report.</p>",
  "l1": "Page 8 (selecting study populations).",
  "see": [
   "phenotype",
   "statistical-power",
   "misclassification"
  ],
  "links": [
   {
    "t": "Liu, Erlich & Pickrell 2017, Nat Genet: case–control association mapping by proxy",
    "u": "https://doi.org/10.1038/ng.3766"
   },
   {
    "t": "Rietveld et al. 2014, PNAS: the proxy-phenotype method",
    "u": "https://doi.org/10.1073/pnas.1404623111"
   }
  ],
  "match": [
   "proxy phenotype",
   "proxy-phenotype",
   "GWAS by proxy",
   "GWAX"
  ],
  "owner": "gwas-design"
 },
 {
  "id": "prs-cs",
  "term": "PRS-CS",
  "aka": [
   "PRS-CSx"
  ],
  "short": "A Bayesian method for polygenic scores that, like LDpred, re-estimates all SNP effects jointly from summary statistics and an LD reference, using a continuous shrinkage prior that shrinks small effects strongly and large effects little.",
  "long": "<p>The continuous prior adapts to different genetic architectures without a grid of assumed causal fractions. PRS-CSx extends it to several GWAS of different ancestries at once, sharing information across them, which improves scores for populations with smaller GWAS.</p>",
  "l1": "Slide 51 (Session 6 covers polygenic risk scores); page 10 (methods for polygenic scores).",
  "see": [
   "polygenic-score",
   "ldpred",
   "clumping-and-thresholding",
   "ld-reference-panel"
  ],
  "links": [
   {
    "t": "Ge et al. 2019, Nat Commun: PRS-CS",
    "u": "https://doi.org/10.1038/s41467-019-09718-5"
   },
   {
    "t": "Ruan et al. 2022, Nat Genet: PRS-CSx",
    "u": "https://doi.org/10.1038/s41588-022-01054-7"
   }
  ],
  "match": [
   "PRS-CS",
   "PRS-CSx"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "gwas-applications"
 },
 {
  "id": "r-markdown",
  "term": "R Markdown",
  "aka": [
   "Rmd",
   "Quarto",
   "knitting"
  ],
  "short": "A file format (.Rmd) that mixes text with chunks of R, bash or other code. Knitting the file runs the chunks in order and writes a report with the code, its output and the plots. Quarto is Posit's newer system for the same kind of document.",
  "long": "<p>All R chunks of a document share one R session, but each bash chunk runs as a new bash process, so variables set in one bash chunk are gone in the next; values that every chunk needs are set in R with <code>Sys.setenv()</code>.</p>",
  "l1": "The practical, <code>01_qc.Rmd</code>, is an R Markdown document with R and bash chunks.",
  "see": [
   "environment-variable",
   "rstudio"
  ],
  "links": [
   {
    "t": "R Markdown Cookbook: run shell scripts",
    "u": "https://bookdown.org/yihui/rmarkdown-cookbook/eng-bash.html"
   },
   {
    "t": "quarto.org",
    "u": "https://quarto.org/"
   }
  ],
  "match": [
   "R Markdown",
   "Quarto",
   "knitting",
   "knitted"
  ],
  "noPlural": true,
  "owner": "tools"
 },
 {
  "id": "randomized-controlled-trial",
  "term": "Randomized controlled trial",
  "aka": [
   "RCT",
   "randomized trial"
  ],
  "short": "A study that assigns participants at random to a treatment or to a control (placebo or usual care) and compares their outcomes. Randomization makes the groups alike on average in every other factor, measured or not, so a difference in outcomes can be attributed to the treatment.",
  "long": "<p>Randomized controlled trials are the reference standard for causal questions in medicine, but they are expensive, usually last a few years, and can only test treatments that exist. Mendelian randomization uses the random assortment of alleles at conception as a substitute for random assignment, which is why its results are often compared with trial results (slide 23).</p>",
  "l1": "Slide 23: Mendelian randomization results for CRP and HDL cholesterol are “consistent with clinical trials”.",
  "see": [
   "mendelian-randomization",
   "confounding"
  ],
  "links": [],
  "match": [
   "randomized controlled trial",
   "randomised controlled trial",
   "randomized trial",
   "randomised trial"
  ],
  "owner": "genetic-epidemiology"
 },
 {
  "id": "recombination-rate",
  "term": "recombination rate (cM/Mb)",
  "aka": [
   "local recombination rate"
  ],
  "short": "Map distance per unit of physical distance, usually in centimorgans per megabase. The human genome average is about 1.13 cM/Mb, but local rates vary by orders of magnitude, with most crossovers in short hotspots.",
  "long": "<p>Multiplying the physical distance between two SNPs by the local rate gives their map distance, and a map function turns that into a recombination fraction: 100 kb at 1.13 cM/Mb is 0.113 cM, so \\(\\theta \\approx 0.00113\\). Regional association plots and LDproxy draw the local rate under the data, because LD changes most where the rate is high.</p>",
  "l1": "Page 6, decay section; recombination track of the heatmap widget.",
  "see": [
   "recombination-hotspot",
   "genetic-map",
   "map-function"
  ],
  "match": [
   "recombination rate"
  ],
  "owner": "linkage-disequilibrium"
 },
 {
  "id": "recurrence-risk-ratio",
  "term": "Recurrence risk ratio",
  "aka": [
   "λs",
   "sibling recurrence risk ratio"
  ],
  "short": "The risk of a disease in relatives of an affected person divided by the risk in the general population; for siblings it is written λs. A value well above 1 shows that the disease clusters in families.",
  "long": "<p>Clustering in families can come from shared genes or from shared environments, so a high recurrence risk ratio is evidence for, not proof of, genetic influence. Risch (1990) showed how the ratios for different kinds of relatives constrain the genetic models that can explain a disease and set the power of linkage studies.</p>",
  "l1": "Slide 29: a statistic of the familial aggregation box of the field map (page 2).",
  "see": [
   "familial-aggregation",
   "heritability",
   "twin-study",
   "linkage-analysis"
  ],
  "links": [
   {
    "t": "Risch 1990, American Journal of Human Genetics",
    "u": "https://pubmed.ncbi.nlm.nih.gov/2301392/"
   }
  ],
  "match": [
   "recurrence risk ratio",
   "recurrence risk ratios",
   "sibling recurrence risk"
  ],
  "noPlural": true,
  "owner": "field-map"
 },
 {
  "id": "regression-toward-the-mean",
  "term": "Regression toward the mean",
  "aka": [
   "regression to the mean"
  ],
  "short": "The tendency of an extreme measurement to be followed, in a relative or in a repeat measurement, by one closer to the average, because part of what made the first value extreme is not shared.",
  "long": "<p>Galton (1886) found that the adult children of very tall parents are on average tall, but less tall than their parents, and that the children of very short parents are less short. The slope of the children’s heights on the parents’ heights is below 1, and this “regression” gave linear regression its name. The same effect explains why the first estimate of a GWAS effect that passed a strict threshold tends to be larger than in replication studies (the winner’s curse).</p>",
  "l1": "Slide 28: Galton is listed for continuous traits; his study of heights introduced regression (page 2).",
  "see": [
   "heritability"
  ],
  "links": [],
  "match": [
   "regression toward the mean",
   "regression to the mean"
  ],
  "noPlural": true,
  "owner": "field-map"
 },
 {
  "id": "relative-risk",
  "term": "Relative risk",
  "aka": [
   "risk ratio",
   "RR"
  ],
  "short": "The risk of an outcome in one group divided by the risk in a reference group. A relative risk of 2 means twice the risk of the reference group; by itself it does not say how large either risk is.",
  "long": "<p>A relative risk of 2 turns a 1% risk into 2% and a 10% risk into about 20%. Decisions about screening or treatment depend on the absolute risk, so risk models multiply relative risks from several factors (family history, a polygenic score, breast density) onto a baseline risk and convert the result to a probability. When the outcome is rare, the odds ratio is close to the relative risk.</p>",
  "l1": "Slide 20: the risk model combines relative risks from several sources into one lifetime risk.",
  "see": [
   "odds-ratio",
   "hazard-ratio",
   "risk-stratified-screening"
  ],
  "links": [],
  "match": [
   "relative risk",
   "risk ratio"
  ],
  "owner": "genetic-epidemiology"
 },
 {
  "id": "replication",
  "term": "Replication (of an association)",
  "aka": [
   "replication study",
   "replication sample",
   "replication cohort"
  ],
  "short": "Testing an association found in one sample (the discovery sample) again in independent people, for the same trait, the same allele and the same direction of effect. An association that replicates is unlikely to be a chance finding or an artifact of one study.",
  "long": "<p>A working group of the US National Cancer Institute and National Human Genome Research Institute listed what a convincing replication needs: an independent sample large enough to detect the effect, the same or a very similar phenotype, a similar population, the same SNP (or one in strong LD with it), and an effect in the same direction and of similar size. Because significant discovery estimates are inflated (the winner’s curse), a replication planned on the discovery estimate is underpowered; the replication estimate itself is unbiased. Replication in people of other ancestries also tests whether a finding generalizes, and their different LD can help to locate the causal variant.</p><p>The replication sample must not contain the discovery sample’s people or their relatives (page 18).</p>",
  "l1": "Page 9 (meta-analysis and replication); page 10 (the winner’s curse); page 18 (relatedness between cohorts).",
  "see": [
   "winners-curse",
   "meta-analysis",
   "genome-wide-significance",
   "type-1-error",
   "statistical-power"
  ],
  "links": [
   {
    "t": "NCI-NHGRI Working Group on Replication in Association Studies 2007, Nature: replicating genotype–phenotype associations",
    "u": "https://doi.org/10.1038/447655a"
   },
   {
    "t": "Kraft, Zeggini & Ioannidis 2009, Stat Sci: replication in genome-wide association studies",
    "u": "https://doi.org/10.1214/09-STS290"
   }
  ],
  "match": [
   "replication",
   "replication study",
   "replication sample",
   "replication cohort",
   "replicated"
  ],
  "owner": "gwas-design"
 },
 {
  "id": "risk-stratified-screening",
  "term": "Risk-stratified screening",
  "aka": [
   "risk-based screening",
   "stratified screening"
  ],
  "short": "Screening in which the age to start, the interval between tests or the kind of test depends on each person’s estimated risk, instead of being the same for everyone of a given age. The risk is computed from factors such as family history, questionnaire answers, breast density, a polygenic score and rare variants.",
  "long": "<p>Breast cancer is the main example. A model such as BOADICEA turns a woman’s risk factors into an absolute lifetime risk, and the risk is compared with thresholds. In England, NICE guidance uses lifetime risk from age 20: below 17% is near-population risk, 17% to below 30% moderate, and 30% or more high, each with its own screening advice. With a 313-SNP polygenic score added to the other factors, Lee et al. (2019) estimated that 14.7% of women in the UK would be at moderate and 1.1% at high risk.</p><p>Whether risk-stratified screening improves outcomes compared with age-based screening is the subject of randomized trials such as WISDOM (United States) and MyPeBS (Europe).</p>",
  "l1": "Slide 20 shows the BOADICEA risk curves of Lee et al. (2019).",
  "see": [
   "boadicea",
   "polygenic-score",
   "mammographic-density",
   "relative-risk",
   "brca1-brca2"
  ],
  "links": [
   {
    "t": "Lee et al. 2019, Genetics in Medicine",
    "u": "https://doi.org/10.1038/s41436-018-0406-9"
   },
   {
    "t": "CanRisk tool",
    "u": "https://www.canrisk.org/"
   }
  ],
  "match": [
   "risk-stratified screening",
   "risk stratified screening",
   "risk-based screening"
  ],
  "noPlural": true,
  "owner": "genetic-epidemiology"
 },
 {
  "id": "roc-curve",
  "term": "ROC curve (receiver operating characteristic curve)",
  "aka": [
   "receiver operating characteristic curve"
  ],
  "short": "A plot of a score’s true-positive rate (the share of cases above a cut-off) against its false-positive rate (the share of non-cases above it), for every possible cut-off. The closer the curve comes to the top-left corner, the better the score separates cases from non-cases.",
  "long": "<p>Each point is one cut-off. Calling everyone high-risk gives the point (1, 1), calling no one gives (0, 0), and a useless score follows the diagonal between them. For a published coronary artery disease score, a cut-off with a false-positive rate of 5% detects only about 15% of future cases, although the people with the highest scores have several times the average risk. The area under the curve (AUC) summarizes the whole curve in one number.</p>",
  "l1": "Slide 51 (Session 6 covers polygenic risk scores); page 10 (the accuracy of polygenic scores; from relative to absolute risk).",
  "see": [
   "auc",
   "sensitivity-specificity",
   "absolute-risk",
   "polygenic-score",
   "net-reclassification-index"
  ],
  "links": [
   {
    "t": "Wald & Old 2019, Genet Med: the illusion of polygenic disease risk prediction",
    "u": "https://doi.org/10.1038/s41436-018-0418-5"
   }
  ],
  "match": [
   "ROC curve",
   "receiver operating characteristic curve",
   "receiver operating characteristic"
  ],
  "owner": "gwas-applications"
 },
 {
  "id": "rosetta-2",
  "term": "Rosetta 2",
  "short": "Apple software that translates programs built for Intel (x86_64) processors so that they run on Apple Silicon Macs, more slowly than programs built for Apple Silicon. Apple says it is available through macOS 27; from macOS 28 it will be limited to certain older games.",
  "see": [
   "cpu-architecture"
  ],
  "links": [
   {
    "t": "Apple: using Intel-based apps on a Mac with Apple silicon",
    "u": "https://support.apple.com/en-us/102527"
   }
  ],
  "match": [
   "Rosetta 2",
   "Rosetta"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "setup"
 },
 {
  "id": "rstudio",
  "term": "RStudio",
  "aka": [
   "RStudio Desktop",
   "RStudio Server",
   "Positron"
  ],
  "short": "A program for working in R, with panes for scripts, the R console, a terminal, plots and files; it knits R Markdown documents. Its maker, Posit, also offers Positron, a newer editor for R and Python.",
  "l1": "On Biowulf the practical runs in RStudio Server started from NIH HPC OnDemand; on your own computer RStudio Desktop does the same job.",
  "see": [
   "r-markdown",
   "terminal"
  ],
  "links": [
   {
    "t": "posit.co/download/rstudio-desktop",
    "u": "https://posit.co/download/rstudio-desktop/"
   },
   {
    "t": "positron.posit.co",
    "u": "https://positron.posit.co/"
   }
  ],
  "match": [
   "RStudio",
   "Positron"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "setup"
 },
 {
  "id": "runs-of-homozygosity",
  "term": "Run of homozygosity (ROH)",
  "aka": [
   "runs of homozygosity",
   "ROH",
   "autozygous segment"
  ],
  "short": "A long stretch of a chromosome in which a person is homozygous at every SNP, usually because both copies of the stretch were inherited from one ancestor of both parents. The share of the genome in long runs estimates the inbreeding coefficient.",
  "long": "<p>Short runs occur in everyone, by chance and because of distant shared ancestry. Long runs, several megabases or more, come from a recent ancestor of both parents: the more recent the ancestor, the longer the runs, because fewer crossovers have cut the shared stretch. A child of first cousins is expected to have about 1/16 of the autosomes, roughly 180 megabases, in such runs.</p><p>\\(F_{\\mathrm{ROH}}\\), the total length of runs above a minimum length divided by the length of the autosomes, estimates the inbreeding coefficient and, unlike the single number from <code>--het</code>, shows where the homozygosity lies. PLINK 1.9's <code>--homozyg</code> finds runs; by default it reports runs of at least 100 SNPs and 1,000 kb with at least one SNP per 50 kb.</p>",
  "l1": "Page 19 (QC step 5), optional section on runs of homozygosity.",
  "see": [
   "inbreeding-coefficient",
   "consanguinity",
   "ibd",
   "heterozygosity-rate"
  ],
  "links": [
   {
    "t": "Ceballos et al. 2018, Nature Reviews Genetics",
    "u": "https://doi.org/10.1038/nrg.2017.109"
   },
   {
    "t": "McQuillan et al. 2008, AJHG",
    "u": "https://doi.org/10.1016/j.ajhg.2008.08.007"
   },
   {
    "t": "PLINK 1.9: runs of homozygosity",
    "u": "https://www.cog-genomics.org/plink/1.9/ibd#homozyg"
   }
  ],
  "match": [
   "run of homozygosity",
   "runs of homozygosity"
  ],
  "noPlural": true,
  "owner": "qc-heterozygosity"
 },
 {
  "id": "saige",
  "term": "SAIGE",
  "aka": [
   "Scalable and Accurate Implementation of GEneralized mixed model"
  ],
  "short": "A program for GWAS of diseases in large biobanks. It fits a logistic mixed model, so relatives can stay in the analysis, and computes p-values with the saddle-point approximation, which stays accurate when cases are far fewer than controls.",
  "long": "<p>Step 1 fits the null model (covariates and a random polygenic effect, without the tested SNP) once; step 2 tests each SNP using that fit. For a disease with 1 case per 100 people or fewer, the normal approximation behind standard tests gives far too many small p-values for low-frequency SNPs; the saddle-point approximation corrects this. SAIGE-GENE extends the method to rare-variant tests of whole genes.</p>",
  "l1": "Page 9 (relatedness and mixed models); page 8 lists it among association tools.",
  "see": [
   "mixed-model",
   "saddle-point-approximation",
   "regenie",
   "bolt-lmm",
   "logistic-regression",
   "loco"
  ],
  "links": [
   {
    "t": "Zhou et al. 2018, Nat Genet",
    "u": "https://doi.org/10.1038/s41588-018-0184-y"
   },
   {
    "t": "SAIGE documentation",
    "u": "https://saigegit.github.io/SAIGE-doc/"
   }
  ],
  "match": [
   "SAIGE",
   "SAIGE-GENE"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "gwas-analysis"
 },
 {
  "id": "sampling-distribution",
  "term": "Sampling distribution",
  "aka": [],
  "short": "The distribution of an estimate or test statistic over repeated samples of the same size from the same population. The standard deviation of an estimate's sampling distribution is its standard error.",
  "long": "<p>A test's null distribution is the sampling distribution of its statistic when the null hypothesis is true. The sampling widget on page 5 draws 2,000 samples to show the sampling distribution of an allele frequency.</p>",
  "l1": "Page 5 simulates the sampling distribution of an allele frequency.",
  "see": [
   "standard-error",
   "null-hypothesis"
  ],
  "links": [],
  "match": [
   "sampling distribution",
   "null distribution"
  ],
  "owner": "frequencies-hwe"
 },
 {
  "id": "scree-plot",
  "term": "scree plot",
  "aka": [],
  "short": "A plot of the eigenvalues of a PCA in decreasing order. Components that reflect real structure stand above a smooth floor of small eigenvalues produced by noise; the bend where the floor starts suggests how many components to keep.",
  "long": "<p>For genotype data, plot \\(\\ell_k\\) (or \\(\\ell_k\\) divided by the trace) against \\(k\\). The floor is not flat: random genotypes also give a decreasing sequence of eigenvalues, so a formal test (Tracy–Widom) or a look at what each component separates is used alongside the plot.</p>",
  "l1": "Page 7, how many PCs; the PCA widget shows the top 8 eigenvalues as a bar chart.",
  "see": [
   "eigenvalue",
   "tracy-widom-test",
   "pca"
  ],
  "links": [
   {
    "t": "Privé et al. 2020",
    "u": "https://doi.org/10.1093/bioinformatics/btaa520"
   }
  ],
  "match": [
   "scree plot",
   "scree plots"
  ],
  "noPlural": true,
  "owner": "population-structure"
 },
 {
  "id": "sensitivity-specificity",
  "term": "Sensitivity and specificity",
  "aka": [
   "true-positive rate",
   "detection rate",
   "false-positive rate"
  ],
  "short": "Two measures of a test, or of a score with a cut-off. Sensitivity (the true-positive or detection rate) is the share of people with the condition who test positive; specificity is the share of people without it who test negative, and one minus specificity is the false-positive rate.",
  "long": "<p>Moving the cut-off trades one for the other: a lower cut-off detects more cases but flags more people without the condition. The ROC curve plots sensitivity against the false-positive rate for every cut-off. Neither measure depends on how common the condition is, but the share of positives who truly have it (the positive predictive value) does: in newborn screening for a condition with 1 case in 25,000 births, a false-positive rate of 0.05% gives about 12 false positives for every true one.</p>",
  "l1": "Page 10 (the accuracy of polygenic scores); page 1 (newborn screening).",
  "see": [
   "roc-curve",
   "auc",
   "positive-predictive-value",
   "absolute-risk",
   "newborn-screening"
  ],
  "links": [
   {
    "t": "Altman & Bland 1994, BMJ: diagnostic tests 1, sensitivity and specificity",
    "u": "https://doi.org/10.1136/bmj.308.6943.1552"
   }
  ],
  "match": [
   "sensitivity and specificity",
   "true-positive rate",
   "false-positive rate",
   "detection rate"
  ],
  "owner": "gwas-applications"
 },
 {
  "id": "shell",
  "term": "Shell (bash, zsh)",
  "aka": [
   "command line"
  ],
  "short": "The program that reads each command line, replaces variables with their values, splits the line into words, and starts the program named by the first word with the other words as its arguments. bash is the usual shell on Linux; zsh is the default in macOS terminals.",
  "long": "<p>Before running anything the shell joins lines that end in a backslash, substitutes variables such as <code>${analysis_dir}</code>, splits the result at spaces, and searches the folders listed in <code>PATH</code> for the program. The program never sees the variable names, only the resulting words.</p>",
  "l1": "The practical's code chunks marked <code>{bash}</code> are run by bash.",
  "see": [
   "terminal",
   "path-variable",
   "environment-variable"
  ],
  "match": [
   "shell",
   "bash",
   "zsh"
  ],
  "owner": "tools"
 },
 {
  "id": "significance-level",
  "term": "Significance level (α)",
  "aka": [
   "alpha",
   "level of significance"
  ],
  "short": "The p-value threshold, chosen before the test, below which the null hypothesis is rejected. It is the largest acceptable probability of a false positive for one test, often 0.05.",
  "long": "<p>Running many tests multiplies the expected number of false positives, so genome-wide work uses much smaller levels: 10⁻⁶ or less for the Hardy–Weinberg filter in QC, and 5 × 10⁻⁸ for association.</p>",
  "l1": "Page 5 introduces it with the Hardy–Weinberg test.",
  "see": [
   "p-value",
   "null-hypothesis",
   "multiple-testing",
   "bonferroni-correction"
  ],
  "links": [],
  "match": [
   "significance level",
   "level of significance"
  ],
  "owner": "frequencies-hwe"
 },
 {
  "id": "singleton",
  "term": "singleton",
  "aka": [
   "singleton variant"
  ],
  "short": "A variant whose minor allele is seen exactly once in a sample: one copy in one person. Large sequencing samples contain many singletons, because most variants arose recently and are rare.",
  "long": "<p>In a population of constant size the expected number of variant sites whose derived allele appears in \\(i\\) of the \\(2n\\) sampled copies is proportional to \\(1/i\\), so singletons are the most common class. Human samples have even more, because the population grew rapidly in recent history (Keinan &amp; Clark 2012). Whether a variant is a singleton depends on the sample: it may be common elsewhere.</p>",
  "l1": "Slide 88 (the allele frequency spectrum); page 7.",
  "see": [
   "allele-frequency-spectrum",
   "rare-variant",
   "derived-allele"
  ],
  "links": [
   {
    "t": "Keinan & Clark 2012, excess of rare variants",
    "u": "https://doi.org/10.1126/science.1217283"
   }
  ],
  "match": [
   "singleton",
   "singletons"
  ],
  "noPlural": true,
  "owner": "population-structure"
 },
 {
  "id": "singular-value-decomposition",
  "term": "singular value decomposition (SVD)",
  "aka": [
   "SVD"
  ],
  "short": "The factorization of any matrix into an orthonormal matrix, a diagonal matrix of non-negative singular values and another orthonormal matrix. For a genotype matrix it gives the person scores and the SNP weights of PCA at once.",
  "long": "<p>\\(\\mathbf{Z} = \\mathbf{U}\\mathbf{S}\\mathbf{V}^{\\top}\\): the columns of \\(\\mathbf{U}\\) (people) are the eigenvectors of \\(\\mathbf{Z}\\mathbf{Z}^{\\top}\\), the columns of \\(\\mathbf{V}\\) (SNPs) the eigenvectors of \\(\\mathbf{Z}^{\\top}\\mathbf{Z}\\), and the eigenvalues of \\(\\mathbf{Z}\\mathbf{Z}^{\\top}/m\\) are \\(s_k^2/m\\). Large-sample PCA software (PLINK 2's <code>approx</code> mode, FlashPCA2, bigsnpr) computes the top singular vectors directly with randomized or iterative algorithms.</p>",
  "l1": "Page 7, the same components from the people-by-people matrix.",
  "see": [
   "pca",
   "eigenvector",
   "snp-loading",
   "covariance-matrix"
  ],
  "links": [
   {
    "t": "PLINK 2.0: --pca approx",
    "u": "https://www.cog-genomics.org/plink/2.0/strat#pca"
   }
  ],
  "match": [
   "singular value decomposition",
   "SVD"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "population-structure"
 },
 {
  "id": "skat",
  "term": "SKAT (sequence kernel association test)",
  "aka": [
   "sequence kernel association test"
  ],
  "short": "A test of whether a set of rare variants, usually those in one gene, is associated with a trait. A burden test adds up each person's rare alleles and tests the total; SKAT lets each variant's effect differ in size and direction.",
  "long": "<p>SKAT (Wu and colleagues, 2011) treats the variants' effects as random draws with mean zero and tests whether their variance is greater than zero. It keeps its power when some variants raise the trait and others lower it, where a burden test loses power; a burden test is more powerful when nearly all the variants act in the same direction. SKAT-O combines the two tests. Session 7 of the workshop covers both.</p>",
  "see": [
   "rare-variant-association-study"
  ],
  "links": [
   {
    "t": "Wu et al. 2011, Am J Hum Genet: the sequence kernel association test",
    "u": "https://doi.org/10.1016/j.ajhg.2011.05.029"
   }
  ],
  "match": [
   "SKAT",
   "sequence kernel association test"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "field-map"
 },
 {
  "id": "snp-ascertainment-bias",
  "term": "SNP ascertainment bias",
  "aka": [
   "ascertainment bias (of SNPs)",
   "SNP ascertainment"
  ],
  "short": "The distortion in a set of SNPs that comes from how the SNPs were chosen. Genotyping arrays carry SNPs first discovered in a limited set of people and populations, so array SNPs tend to be common in several populations and rare SNPs are underrepresented.",
  "long": "<p>Before an array is designed, its SNPs have to be discovered, usually by sequencing a modest number of people from a few populations, and then selected, often for being common in those populations. A SNP that is rare, or common only in a population that was not sequenced, has little chance of being chosen. Compared with whole-genome sequences, array data therefore have fewer rare alleles, allele frequencies shifted toward intermediate values, and SNPs that are older and shared by several populations. Statistics that depend on the allele frequency spectrum, such as estimates of population history, are biased unless the ascertainment is modeled. The lab's toy data imitate the effect by keeping a simulated SNP only if its minor allele is common enough.</p>",
  "l1": "Page 11 (the toy data's simulation): the toy study keeps mostly common SNPs, like an array.",
  "see": [
   "allele-frequency-spectrum",
   "maf",
   "genotyping-array"
  ],
  "links": [
   {
    "t": "Lachance and Tishkoff 2013, BioEssays",
    "u": "https://doi.org/10.1002/bies.201300014"
   },
   {
    "t": "Clark et al. 2005, Genome Research",
    "u": "https://doi.org/10.1101/gr.4107905"
   }
  ],
  "match": [
   "SNP ascertainment bias",
   "SNP ascertainment"
  ],
  "noPlural": true,
  "owner": "practical-overview"
 },
 {
  "id": "snp-loading",
  "term": "SNP loading (SNP weight)",
  "aka": [
   "variant weight",
   "allele weight",
   "loadings"
  ],
  "short": "How much one SNP contributes to a principal component: the SNP's entry in the component's direction vector. A person's score is the weighted sum of their standardized genotypes, so the weights are what projection uses.",
  "long": "<p>In \\(\\mathbf{Z} = \\mathbf{U}\\mathbf{S}\\mathbf{V}^{\\top}\\), column \\(k\\) of \\(\\mathbf{V}\\) holds the SNP weights of component \\(k\\). Plotting them along the genome shows what a component captures: weights spread over the whole genome indicate population structure, weights concentrated in one region indicate a region of long-range LD. PLINK 1.9 writes them with <code>--pca var-wts</code>, PLINK 2 with <code>--pca allele-wts</code>.</p>",
  "l1": "Page 7, the worked PCA example and projection.",
  "see": [
   "pc-projection",
   "singular-value-decomposition",
   "pca",
   "ld-pruning"
  ],
  "links": [
   {
    "t": "PLINK 2.0: --pca allele-wts and --score",
    "u": "https://www.cog-genomics.org/plink/2.0/score"
   }
  ],
  "match": [
   "SNP loading",
   "SNP loadings",
   "SNP weight",
   "SNP weights",
   "variant weights",
   "allele weights"
  ],
  "noPlural": true,
  "owner": "population-structure"
 },
 {
  "id": "snp-major",
  "term": "SNP-major order",
  "aka": [
   "variant-major order",
   "locus-major order"
  ],
  "short": "A layout of a genotype file in which all people's genotypes for the first SNP are stored together, then all people's genotypes for the second SNP, and so on. PLINK 1 .bed files use it; reading one SNP means reading one contiguous block.",
  "long": "<p>The alternative, sample-major (individual-major) order, stores all SNPs of the first person, then all SNPs of the second person. Old PLINK versions could write it; the third byte of a .bed file says which layout follows (01 = SNP-major). PLINK 1.9 converts a sample-major file to SNP-major when it reads one.</p><p>SNP-major order suits association testing and SNP QC, which go through the data one SNP at a time: each SNP's block of ⌈<em>n</em>/4⌉ bytes can be read with one seek and one read.</p>",
  "l1": "The third byte of <code>penncath.bed</code> is 01: the file is SNP-major (page 12).",
  "see": [
   "plink-binary",
   "bim-file",
   "genotype-matrix"
  ],
  "links": [
   {
    "t": "PLINK 1.9 file formats: .bed",
    "u": "https://www.cog-genomics.org/plink/1.9/formats#bed"
   }
  ],
  "match": [
   "SNP-major",
   "variant-major",
   "sample-major"
  ],
  "owner": "plink-data"
 },
 {
  "id": "standard-deviation",
  "term": "Standard deviation (SD)",
  "aka": [
   "SD"
  ],
  "short": "A measure of spread: the square root of the variance, the average squared distance of values from their mean. It is in the same units as the values.",
  "long": "<p>The standard deviation of an estimate over repeated samples is called its standard error.</p>",
  "l1": "Page 5 compares the standard deviation of simulated allele frequencies with the standard-error formula.",
  "see": [
   "variance",
   "standard-error"
  ],
  "links": [],
  "match": [
   "standard deviation"
  ],
  "owner": "frequencies-hwe"
 },
 {
  "id": "standard-error",
  "term": "Standard error (SE)",
  "aka": [
   "SE"
  ],
  "short": "The standard deviation of an estimate over repeated samples of the same size from the same population: how much the estimate would vary from one sample to the next. For an allele frequency in Hardy–Weinberg proportions it is √(p(1 − p)/2n).",
  "long": "<p>For MTHFR (1,532 allele copies, frequency of C 0.664) the standard error is \\(\\sqrt{0.664 \\times 0.336/1{,}532} = 0.012\\). It shrinks with the square root of the sample size: four times as many people halve it. A shortfall of heterozygotes \\(F\\) multiplies the variance by \\(1 + F\\). In association results the SE column plays the same role for an effect estimate.</p>",
  "l1": "Page 5 derives the standard error of an allele frequency and simulates it.",
  "see": [
   "standard-deviation",
   "sampling-distribution",
   "confidence-interval"
  ],
  "links": [],
  "match": [
   "standard error"
  ],
  "owner": "frequencies-hwe"
 },
 {
  "id": "statistical-power",
  "term": "Statistical power",
  "aka": [
   "power"
  ],
  "short": "The probability that a study detects an effect that truly exists: that a variant with a given true effect reaches the significance threshold. It rises with the number of people, the size of the effect and the allele frequency.",
  "long": "<p>Power is one minus the probability of a type 2 error. For one SNP it depends only on the noncentrality parameter \\(\\lambda\\) and the threshold: at \\(5 \\times 10^{-8}\\), 80% power needs \\(\\lambda \\approx 39.6\\). For a quantitative trait \\(\\lambda \\approx N \\cdot 2p(1-p)\\beta^2/\\sigma^2\\), with \\(N\\) people, effect-allele frequency \\(p\\), effect \\(\\beta\\) per allele and trait variance \\(\\sigma^2\\), so a SNP with \\(p = 0.3\\) and \\(\\beta = 0.05\\) standard deviations needs about \\(39.6/(0.42 \\times 0.0025) \\approx 38{,}000\\) people.</p><p>Power is computed before a study, to choose its size, with tools such as the Genetic Power Calculator, CaTS or the GAS Power Calculator. A study with low power misses most real effects, and the effects it does find are overestimated (the winner’s curse).</p>",
  "l1": "Page 8 (how many people) derives power from the noncentrality parameter and has a power calculator; page 10 shows how low power inflates significant estimates.",
  "see": [
   "type-1-error",
   "type-2-error",
   "noncentrality-parameter",
   "significance-level",
   "genome-wide-significance",
   "effect-size",
   "winners-curse"
  ],
  "links": [
   {
    "t": "Sham & Purcell 2014, Nat Rev Genet: statistical power and significance testing in large-scale genetic studies",
    "u": "https://doi.org/10.1038/nrg3706"
   },
   {
    "t": "Purcell, Cherny & Sham 2003, Bioinformatics: Genetic Power Calculator",
    "u": "https://doi.org/10.1093/bioinformatics/19.1.149"
   }
  ],
  "match": [
   "statistical power",
   "power"
  ],
  "owner": "gwas-design"
 },
 {
  "id": "stenosis",
  "term": "stenosis",
  "aka": [
   "arterial narrowing"
  ],
  "short": "Narrowing of a blood vessel. In coronary angiography it is reported as the percentage reduction of an artery's inner diameter at its narrowest point, for example 50% stenosis.",
  "see": [
   "coronary-angiography",
   "atherosclerosis"
  ],
  "match": [
   "stenosis"
  ],
  "noPlural": true,
  "owner": "practical-overview"
 },
 {
  "id": "suggestive-significance",
  "term": "Suggestive significance (p < 1 × 10⁻⁵)",
  "aka": [
   "suggestive threshold",
   "suggestive line"
  ],
  "short": "A looser p-value threshold, usually 1 × 10⁻⁵, often drawn as a second line on Manhattan plots. SNPs between it and 5 × 10⁻⁸ are worth following up in more people but are not evidence of association.",
  "long": "<p>With about a million independent tests, about 10 SNPs with no effect fall below 1 × 10⁻⁵ by chance alone in every GWAS, so most suggestive hits in a small study are false positives. The threshold is useful for choosing SNPs to test in a replication sample or to carry into a meta-analysis.</p>",
  "l1": "Page 9 (the genome-wide threshold and the Manhattan plot, dashed line).",
  "see": [
   "genome-wide-significance",
   "manhattan-plot",
   "replication",
   "multiple-testing"
  ],
  "links": [],
  "match": [
   "suggestive significance",
   "suggestive threshold",
   "suggestive line",
   "suggestive association"
  ],
  "owner": "gwas-analysis"
 },
 {
  "id": "susie",
  "term": "SuSiE (sum of single effects)",
  "aka": [
   "SuSiE-RSS",
   "susieR"
  ],
  "short": "A Bayesian fine-mapping method that models a region’s association as a sum of a few single effects, each due to one causal variant. It returns a credible set for each effect and a posterior inclusion probability for each SNP.",
  "long": "<p>Each single effect is fitted as if it were the only causal variant, given the current fits of the others, and the fits are repeated in turn until they settle (iterative Bayesian stepwise selection). Because each effect gets its own credible set, SuSiE shows directly how many independent signals a region holds and how precisely each is located. SuSiE-RSS runs it from summary statistics and an LD matrix, which must match the GWAS sample closely.</p>",
  "l1": "Slide 49 (Session 4 covers fine-mapping); page 9 (fine-mapping); page 6 (LD).",
  "see": [
   "fine-mapping",
   "credible-set",
   "posterior-inclusion-probability",
   "finemap",
   "conditional-analysis"
  ],
  "links": [
   {
    "t": "Wang et al. 2020, J R Stat Soc B: SuSiE",
    "u": "https://doi.org/10.1111/rssb.12388"
   },
   {
    "t": "Zou et al. 2022, PLoS Genet: SuSiE-RSS",
    "u": "https://doi.org/10.1371/journal.pgen.1010299"
   }
  ],
  "match": [
   "SuSiE",
   "SuSiE-RSS"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "gwas-analysis"
 },
 {
  "id": "tandem-mass-spectrometry",
  "term": "Tandem mass spectrometry",
  "aka": [
   "MS/MS"
  ],
  "short": "A laboratory method that sorts molecules by mass twice in a row, so that dozens of metabolites, such as amino acids and acylcarnitines, can be measured at once in one dried blood spot. It lets newborn screening test for many inborn errors of metabolism with one assay.",
  "long": "<p>In the first stage the instrument selects molecules of a given mass; they are broken into fragments, and the second stage measures the fragments. Each metabolite has a characteristic pair of masses, so many can be counted in a single run of a few minutes. On slide 19, 20 of the 29 core conditions are found by MS/MS: 9 organic acid conditions and 5 fatty acid oxidation disorders from the acylcarnitine profile, and 6 amino acid disorders.</p>",
  "l1": "Slide 19, the table’s “MS/MS” columns.",
  "see": [
   "newborn-screening",
   "inborn-error-of-metabolism"
  ],
  "links": [],
  "match": [
   "tandem mass spectrometry",
   "MS/MS"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "genetic-epidemiology"
 },
 {
  "id": "terminal",
  "term": "Terminal",
  "aka": [
   "terminal window"
  ],
  "short": "A window in which you type commands as text and read their text output. The program inside it that reads and runs each command is the shell.",
  "long": "<p>macOS has the Terminal app; Windows has Windows Terminal, which can open a Linux shell under WSL; RStudio and Positron have a Terminal tab. Every line of the practical's bash chunks can be typed into a terminal, one command at a time.</p>",
  "l1": "The practical's bash chunks run as if typed in a terminal; page 13 shows how the shell turns one line into a program run.",
  "see": [
   "shell",
   "environment-variable",
   "working-directory"
  ],
  "match": [
   "terminal"
  ],
  "owner": "tools"
 },
 {
  "id": "test-statistic",
  "term": "Test statistic",
  "aka": [],
  "short": "A number computed from the data that measures how far they are from what the null hypothesis predicts, such as Pearson's chi-square statistic. Its distribution when the null hypothesis is true turns it into a p-value.",
  "long": "<p>For a Hardy–Weinberg test at a SNP, \\(X^2 = \\sum (O - E)^2/E\\) compares observed with expected genotype counts; it equals \\(n\\hat{F}^2\\), the number of people times the squared shortfall of heterozygotes. For the MTHFR counts of slide 74, \\(X^2 = 0.47\\). Association tests use other statistics, such as a z-score, with the same logic.</p>",
  "l1": "Page 5 computes Pearson's statistic for MTHFR and the ABO blood group.",
  "see": [
   "null-hypothesis",
   "p-value",
   "chi-square-test"
  ],
  "links": [],
  "match": [
   "test statistic"
  ],
  "owner": "frequencies-hwe"
 },
 {
  "id": "tidyverse",
  "term": "tidyverse",
  "short": "A collection of R packages that share one design for working with tables and plots. library(tidyverse) loads the core nine: ggplot2, dplyr, tidyr, readr, purrr, tibble, stringr, forcats and lubridate.",
  "l1": "The practical loads it at the start of each R section and uses dplyr and ggplot2 from it.",
  "see": [
   "dplyr",
   "ggplot2",
   "pipe-r",
   "data-table"
  ],
  "links": [
   {
    "t": "tidyverse.org",
    "u": "https://www.tidyverse.org/"
   },
   {
    "t": "Wickham et al. 2019, Welcome to the tidyverse",
    "u": "https://doi.org/10.21105/joss.01686"
   }
  ],
  "match": [
   "tidyverse"
  ],
  "owner": "tools"
 },
 {
  "id": "tracy-widom-test",
  "term": "Tracy–Widom test",
  "aka": [
   "Tracy-Widom test",
   "twstats"
  ],
  "short": "A test of whether the largest remaining eigenvalue of a genotype PCA is larger than expected if there were no population structure, using the Tracy–Widom distribution of the largest eigenvalue of a random matrix.",
  "long": "<p>Patterson, Price and Reich (2006) introduced it for genotype data; EIGENSOFT's <code>twstats</code> program applies it to each eigenvalue in turn. In large samples it declares many components significant, including components produced by long-range LD or by relatives, so significance alone does not say that a component reflects ancestry.</p>",
  "l1": "Page 7, how many PCs.",
  "see": [
   "eigenvalue",
   "scree-plot",
   "pca"
  ],
  "links": [
   {
    "t": "Patterson, Price & Reich 2006",
    "u": "https://doi.org/10.1371/journal.pgen.0020190"
   }
  ],
  "match": [
   "Tracy–Widom test",
   "Tracy-Widom test",
   "Tracy–Widom",
   "Tracy-Widom"
  ],
  "noPlural": true,
  "owner": "population-structure"
 },
 {
  "id": "transition",
  "term": "Transition (base change)",
  "aka": [
   "transition mutation"
  ],
  "short": "A single-base change between the two purines, A and G, or between the two pyrimidines, C and T. Transitions arise more often than other base changes, so most SNPs are A/G or C/T.",
  "long": "<p>The other base changes, a purine replaced by a pyrimidine or the reverse, are transversions. In the PennCATH array data, 575,207 of the 835,319 SNPs with two alleles (69%) are transitions.</p><p>A transition can always be strand-aligned from its letters: the complement of A/G is T/C, a different pair.</p>",
  "l1": "Page 4 counts the allele pairs of all PennCATH SNPs.",
  "see": [
   "transversion",
   "purine",
   "pyrimidine",
   "snv"
  ],
  "links": [],
  "match": [
   "transition",
   "transitions"
  ],
  "auto": false,
  "noPlural": true,
  "owner": "snp-data"
 },
 {
  "id": "transmission-disequilibrium-test",
  "term": "Transmission disequilibrium test (TDT)",
  "aka": [
   "TDT"
  ],
  "short": "A family-based association test. In trios of two parents and an affected child, it counts how often parents who carry one copy of each allele pass each allele to the child; without association each allele is passed half the time, whatever the family’s ancestry.",
  "long": "<p>Let \\(b\\) be the number of heterozygous parents who transmitted allele A and \\(c\\) the number who transmitted the other allele. The statistic \\((b - c)^2/(b + c)\\) follows a chi-square distribution with 1 degree of freedom when there is no linkage or no association. With 60 transmissions of A against 40 it is \\(20^2/100 = 4.0\\), p ≈ 0.046. Which allele a parent transmits is decided at meiosis, so differences in allele frequency between populations cannot create a signal: the test is immune to population stratification, at the cost of genotyping parents.</p>",
  "l1": "Page 8 (families as a study design).",
  "see": [
   "trio",
   "population-stratification",
   "linkage-analysis",
   "chi-square-test",
   "within-family-gwas"
  ],
  "links": [
   {
    "t": "Spielman, McGinnis & Ewens 1993, Am J Hum Genet",
    "u": "https://pubmed.ncbi.nlm.nih.gov/8447318/"
   }
  ],
  "match": [
   "transmission disequilibrium test",
   "transmission/disequilibrium test",
   "TDT"
  ],
  "owner": "gwas-design"
 },
 {
  "id": "transversion",
  "term": "Transversion (base change)",
  "aka": [
   "transversion mutation"
  ],
  "short": "A single-base change from a purine (A or G) to a pyrimidine (C or T) or back: A/C, A/T, G/C or G/T. The A/T and C/G transversions are the SNPs whose letters read the same on both strands.",
  "long": "<p>Transversions are less frequent than transitions. In the PennCATH array data, 260,112 of the 835,319 SNPs with two alleles are transversions, and 128,999 of them are A/T or C/G: strand-ambiguous SNPs that can be aligned between files only by their allele frequencies.</p>",
  "l1": "Page 4 counts the allele pairs of all PennCATH SNPs.",
  "see": [
   "transition",
   "strand-ambiguous-snp",
   "purine",
   "pyrimidine"
  ],
  "links": [],
  "match": [
   "transversion",
   "transversions"
  ],
  "auto": false,
  "noPlural": true,
  "owner": "snp-data"
 },
 {
  "id": "type-1-error",
  "term": "Type 1 error (false positive)",
  "aka": [
   "type I error",
   "false positive"
  ],
  "short": "Rejecting a null hypothesis that is true: in a GWAS, declaring that a variant is associated with a trait when it is not. For one test its probability is the significance level α.",
  "long": "<p>The opposite mistake, missing a real association, is a type 2 error. Each test of a variant with no effect has probability \\(\\alpha\\) of a type 1 error, so a million such tests at \\(\\alpha = 0.05\\) would give about 50,000 false positives. GWAS therefore use \\(5 \\times 10^{-8}\\) per test, which keeps the probability of even one false positive across the genome near 5% (the family-wise error rate). Choosing among many analyses after seeing the results, or forming the hypothesis after the results are known, raises the real type 1 error rate above the stated \\(\\alpha\\).</p>",
  "l1": "Page 5 meets it with the Hardy–Weinberg test; page 8 defines both kinds of error before computing power; page 9 explains the genome-wide threshold; page 10 (preregistration).",
  "see": [
   "type-2-error",
   "significance-level",
   "p-value",
   "null-hypothesis",
   "family-wise-error-rate",
   "multiple-testing"
  ],
  "links": [],
  "match": [
   "type 1 error",
   "type I error",
   "type 1 error rate",
   "type I error rate"
  ],
  "owner": "gwas-design"
 },
 {
  "id": "type-2-error",
  "term": "Type 2 error (false negative)",
  "aka": [
   "type II error",
   "false negative"
  ],
  "short": "Failing to reject a null hypothesis that is false: in a GWAS, missing an association that exists. Its probability is one minus the power.",
  "long": "<p>For a variant with a given true effect, the probability of a type 2 error falls as the sample grows. Most real effects on complex traits are small, so even large GWAS commit many type 2 errors: they find the variants with the largest effects first, and many variants with smaller effects stay below the threshold, which is part of the missing heritability.</p>",
  "l1": "Page 8 (how many people: sample size and statistical power).",
  "see": [
   "type-1-error",
   "statistical-power",
   "missing-heritability"
  ],
  "links": [
   {
    "t": "Sham & Purcell 2014, Nat Rev Genet",
    "u": "https://doi.org/10.1038/nrg3706"
   }
  ],
  "match": [
   "type 2 error",
   "type II error"
  ],
  "owner": "gwas-design"
 },
 {
  "id": "variance",
  "term": "Variance",
  "aka": [],
  "short": "A measure of spread: the average squared distance of values from their mean. Its square root is the standard deviation.",
  "long": "<p>A binomial count of \\(N\\) trials with success probability \\(p\\) has variance \\(Np(1 - p)\\). A person's number of copies of an allele has variance \\(2pq\\) in Hardy–Weinberg proportions and \\(2pq(1 + F)\\) when heterozygotes fall short by \\(F\\).</p>",
  "l1": "Page 5 derives the variance of an allele-frequency estimate.",
  "see": [
   "standard-deviation",
   "standard-error",
   "variance-explained"
  ],
  "links": [],
  "match": [
   "variance"
  ],
  "owner": "frequencies-hwe"
 },
 {
  "id": "vertical-pleiotropy",
  "term": "Vertical pleiotropy",
  "aka": [
   "mediated pleiotropy"
  ],
  "short": "Association of a variant with two traits because the variant affects one trait, which in turn causes the other. It is the pattern Mendelian randomization relies on, unlike horizontal pleiotropy, in which the variant affects the two traits through separate paths.",
  "long": "<p>A variant that raises LDL cholesterol is also associated with coronary artery disease because LDL cholesterol causes the disease: the variant’s effect on the disease runs through LDL. If all variants act this way, the ratio of each variant’s effects on the two traits is the same for every variant and equals the causal effect, which is what Mendelian randomization estimates.</p>",
  "l1": "Page 10 (four kinds of pleiotropy, figure); page 1 (Mendelian randomization).",
  "see": [
   "horizontal-pleiotropy",
   "pleiotropy",
   "mendelian-randomization",
   "wald-ratio",
   "genetic-correlation"
  ],
  "links": [
   {
    "t": "Hemani, Bowden & Davey Smith 2018, Hum Mol Genet: the role of pleiotropy in Mendelian randomization",
    "u": "https://doi.org/10.1093/hmg/ddy163"
   }
  ],
  "match": [
   "vertical pleiotropy"
  ],
  "owner": "gwas-applications"
 },
 {
  "id": "wald-interval",
  "term": "Wald interval",
  "aka": [],
  "short": "The confidence interval estimate ± 1.96 standard errors, with the standard error computed at the estimate. It is accurate for common alleles in large samples but fails for rare ones: it can extend below 0.",
  "long": "<p>For 3 copies of an allele among 200 copies it runs from −0.002 to 0.032; with no copies it collapses to the single value 0. Wilson's interval avoids both problems.</p>",
  "l1": "Page 5 compares it with Wilson's interval in a simulation.",
  "see": [
   "confidence-interval",
   "wilson-interval",
   "standard-error"
  ],
  "links": [
   {
    "t": "Brown, Cai & DasGupta 2001",
    "u": "https://doi.org/10.1214/ss/1009213286"
   }
  ],
  "match": [
   "Wald interval",
   "Wald confidence interval"
  ],
  "owner": "frequencies-hwe"
 },
 {
  "id": "wald-ratio",
  "term": "Wald ratio",
  "aka": [
   "ratio estimate",
   "ratio of coefficients"
  ],
  "short": "The Mendelian randomization estimate of a causal effect from one genetic variant: the variant’s effect on the outcome divided by its effect on the exposure.",
  "long": "<p>If a variant changes the exposure by β<sub>GX</sub> per allele and the outcome by β<sub>GY</sub> per allele, and it affects the outcome only through the exposure, then one unit of exposure changes the outcome by β<sub>GY</sub> / β<sub>GX</sub>. Example: an allele that raises LDL cholesterol by 0.10 mmol/L and raises the log odds of coronary disease by 0.05 gives 0.05 / 0.10 = 0.5 per mmol/L, an odds ratio of e<sup>0.5</sup> ≈ 1.65 per mmol/L.</p><p>Its standard error is approximately SE(β̂<sub>GY</sub>) / |β̂<sub>GX</sub>|, so a variant with a small effect on the exposure gives an imprecise ratio. Named after Abraham Wald’s 1940 method for fitting a line when both variables are measured with error.</p>",
  "l1": "Slide 22 (Mendelian randomization); page 1 derives it and lets you simulate it.",
  "see": [
   "mendelian-randomization",
   "instrumental-variable",
   "weak-instrument",
   "horizontal-pleiotropy"
  ],
  "links": [
   {
    "t": "Burgess, Small & Thompson 2017, Stat Methods Med Res (review of MR estimators)",
    "u": "https://doi.org/10.1177/0962280215597579"
   }
  ],
  "match": [
   "Wald ratio",
   "Wald ratios",
   "Wald estimate"
  ],
  "noPlural": true,
  "owner": "genetic-epidemiology"
 },
 {
  "id": "weak-instrument",
  "term": "Weak instrument",
  "aka": [
   "weak instrument bias"
  ],
  "short": "An instrumental variable, such as a genetic variant, that explains so little of the exposure’s variation that Mendelian randomization estimates become imprecise and biased. It is usually flagged by a first-stage F statistic below 10.",
  "long": "<p>For one variant the F statistic is the squared z-score of its association with the exposure, (β̂<sub>GX</sub> / SE)<sup>2</sup>; it grows with the sample size and with the variance of the exposure the variant explains. When F is small, chance correlation between the variant and the confounders in the sample is not small compared with the variant’s true effect. In one-sample Mendelian randomization (exposure and outcome measured in the same people) the bias then pulls the estimate toward the confounded observational estimate; in two-sample designs it pulls the estimate toward zero.</p>",
  "l1": "Not on the slides; page 1’s Mendelian randomization simulator lets you weaken the instrument and watch the bias appear.",
  "see": [
   "instrumental-variable",
   "wald-ratio",
   "mendelian-randomization"
  ],
  "links": [
   {
    "t": "Burgess & Thompson 2011, Int J Epidemiol",
    "u": "https://doi.org/10.1093/ije/dyr036"
   }
  ],
  "match": [
   "weak instrument",
   "weak-instrument bias",
   "weak instrument bias"
  ],
  "owner": "genetic-epidemiology"
 },
 {
  "id": "weighted-median-estimator",
  "term": "Weighted median estimator",
  "aka": [
   "weighted median"
  ],
  "short": "A Mendelian randomization estimate: the median of the per-SNP causal estimates (Wald ratios), each weighted by its precision. It stays close to the true effect if at least half of the total weight comes from SNPs that are valid instruments.",
  "long": "<p>The ratios are sorted, their weights accumulated, and the estimate is the ratio at which the cumulative weight reaches 50% (interpolating between neighbors). A few strongly pleiotropic SNPs therefore move it little, whatever the direction of their effects. It is more precise than MR-Egger but less precise than the inverse-variance-weighted estimate when all SNPs are valid, and its standard error is obtained by bootstrapping.</p>",
  "l1": "Page 10 (Mendelian randomization).",
  "see": [
   "mendelian-randomization",
   "wald-ratio",
   "mr-egger",
   "inverse-variance-weighting",
   "horizontal-pleiotropy"
  ],
  "links": [
   {
    "t": "Bowden et al. 2016, Genet Epidemiol",
    "u": "https://doi.org/10.1002/gepi.21965"
   }
  ],
  "match": [
   "weighted median estimator",
   "weighted median",
   "weighted-median"
  ],
  "owner": "gwas-applications"
 },
 {
  "id": "wilson-interval",
  "term": "Wilson score interval",
  "aka": [
   "Wilson interval"
  ],
  "short": "A confidence interval for a proportion that keeps every value for which the observed proportion lies within 1.96 standard errors computed at that value. It never leaves the range 0 to 1 and stays close to 95% coverage for rare alleles.",
  "long": "<p>Its center is \\((m + 1.92)/(N + 3.84)\\) for \\(m\\) successes in \\(N\\) trials, the estimate pulled toward 0.5. For 3 copies of an allele among 200 copies it runs from 0.005 to 0.043, and for 0 copies from 0 to 0.019. Proposed by E. B. Wilson in 1927.</p>",
  "l1": "Page 5 gives its formula and simulates its coverage.",
  "see": [
   "confidence-interval",
   "wald-interval"
  ],
  "links": [
   {
    "t": "Wilson 1927",
    "u": "https://doi.org/10.1080/01621459.1927.10502953"
   }
  ],
  "match": [
   "Wilson score interval",
   "Wilson interval",
   "Wilson’s score interval",
   "Wilson’s interval",
   "Wilson's interval"
  ],
  "owner": "frequencies-hwe"
 },
 {
  "id": "winners-curse",
  "term": "Winner’s curse",
  "aka": [
   "winner's curse",
   "Beavis effect"
  ],
  "short": "The overestimation of the effects of variants that were selected because they passed a significance threshold. Among SNPs with the same true effect, those whose estimates happened to come out too large are the ones that pass, so significant estimates are biased upward, most strongly when power is low.",
  "long": "<p>For a SNP whose expected z-score is \\(\\mu\\), the significant z-scores average \\(\\mu + \\phi(c-\\mu)/Q(c-\\mu)\\), where \\(c\\) is the critical value, \\(\\phi\\) the standard normal density and \\(Q(x)\\) the probability that a standard normal value exceeds \\(x\\). With \\(\\mu = 4.5\\) and \\(c = 5.45\\), only 17% of such SNPs pass, and their estimates average 1.33 times the truth; with \\(\\mu = 7\\), almost all pass and the excess is 2%. The bias carries into everything built on discovery estimates: replication studies planned on them are underpowered, and polygenic scores and Mendelian randomization estimates that use one sample for both selection and estimation are distorted. Estimates from an independent replication sample are unbiased.</p>",
  "l1": "Page 10 (what a GWAS cannot tell us) derives it and simulates it.",
  "see": [
   "replication",
   "statistical-power",
   "effect-size",
   "genome-wide-significance",
   "polygenic-score"
  ],
  "links": [
   {
    "t": "Göring, Terwilliger & Blangero 2001, Am J Hum Genet",
    "u": "https://doi.org/10.1086/324471"
   },
   {
    "t": "Kraft 2008, Epidemiology: curses, winner’s and otherwise, in genetic epidemiology",
    "u": "https://doi.org/10.1097/EDE.0b013e318181b865"
   }
  ],
  "match": [
   "winner’s curse",
   "winner's curse"
  ],
  "noPlural": true,
  "owner": "gwas-applications"
 },
 {
  "id": "within-family-gwas",
  "term": "Within-family GWAS (within-sibship GWAS)",
  "aka": [
   "within-sibship GWAS",
   "sibling GWAS"
  ],
  "short": "A GWAS that compares relatives, usually siblings, instead of unrelated people: differences in a trait between siblings are regressed on differences in their genotypes. Siblings share their parents, their ancestry and much of their environment, so the estimate is free of confounding by these and measures the direct genetic effect.",
  "long": "<p>Which allele of each parent a sibling inherits is random, so the difference in genotype between siblings works like a randomized experiment. The cost is precision: \\(n\\) sibling pairs carry as much genotype variation as \\(n\\) unrelated people, not the \\(2n\\) people genotyped. In 178,086 siblings from 19 cohorts, within-sibship estimates were smaller than population estimates for height, educational attainment, age at first birth, number of children, cognitive ability, depressive symptoms and smoking, while molecular traits such as LDL cholesterol gave consistent estimates.</p>",
  "l1": "Page 10 (direct effects, indirect effects and assortative mating), with the within-sibship model; page 8 (families as a study design).",
  "see": [
   "direct-genetic-effect",
   "indirect-genetic-effect",
   "assortative-mating",
   "population-stratification",
   "transmission-disequilibrium-test"
  ],
  "links": [
   {
    "t": "Howe et al. 2022, Nat Genet: within-sibship GWAS",
    "u": "https://doi.org/10.1038/s41588-022-01062-7"
   },
   {
    "t": "Brumpton et al. 2020, Nat Commun: within-family Mendelian randomization",
    "u": "https://doi.org/10.1038/s41467-020-17117-4"
   }
  ],
  "match": [
   "within-family GWAS",
   "within-sibship GWAS",
   "within-family analysis",
   "within-family analyses",
   "within-family design",
   "within-family MR",
   "within-sibship"
  ],
  "noPlural": true,
  "owner": "gwas-applications"
 },
 {
  "id": "working-directory",
  "term": "Working directory",
  "aka": [
   "current directory"
  ],
  "short": "The folder a program is running in. A relative path such as analysis/penncath.imiss is looked up from it; cd changes it in the shell and setwd() in R.",
  "see": [
   "shell",
   "environment-variable"
  ],
  "match": [
   "working directory"
  ],
  "owner": "tools"
 },
 {
  "id": "wright-fisher-model",
  "term": "Wright–Fisher model",
  "aka": [
   "Wright-Fisher model",
   "Wright–Fisher population"
  ],
  "short": "The simplest model of genetic drift: each generation has N people (2N allele copies), and every copy of the next generation is drawn at random from the copies of the current one, so the next allele count is binomial with 2N trials.",
  "long": "<p>With frequency \\(p_t\\) in generation \\(t\\), the next count is \\(\\Binomial(2N, p_t)\\): the frequency keeps its mean and changes by a random amount with variance \\(p_t(1 - p_t)/(2N)\\). Populations that split from one ancestor drift apart, with \\(\\Var(p_t) = p_0(1 - p_0)F_t\\) and \\(F_t = 1 - (1 - 1/2N)^t\\). Generations do not overlap and there is no selection, mutation or migration; real populations are described by the effective population size, the \\(N\\) of a Wright–Fisher population that drifts at the same rate.</p>",
  "l1": "Slide 97 (drift); the drift widget on page 7.",
  "see": [
   "genetic-drift",
   "effective-population-size",
   "fst",
   "island-model"
  ],
  "links": [
   {
    "t": "Coop, Population and quantitative genetics notes",
    "u": "https://github.com/cooplab/popgen-notes"
   }
  ],
  "match": [
   "Wright–Fisher model",
   "Wright-Fisher model",
   "Wright–Fisher population",
   "Wright-Fisher population"
  ],
  "noPlural": true,
  "owner": "population-structure"
 },
 {
  "id": "wsl",
  "term": "WSL (Windows Subsystem for Linux)",
  "short": "A Windows feature that runs a Linux system, such as Ubuntu, inside Windows. Linux programs such as PLINK and GrafAnc run in its terminal, and the Windows C: drive appears inside it as /mnt/c.",
  "long": "<p>Install it with <code>wsl --install</code> in an administrator PowerShell window (Windows 10 version 2004 or later, or Windows 11) and restart. Keep the practical's files inside the Linux file system (for example <code>~/statgen-workshop</code>); reading large files from <code>/mnt/c</code> is much slower.</p>",
  "see": [
   "shell",
   "terminal",
   "docker"
  ],
  "links": [
   {
    "t": "Microsoft: install WSL",
    "u": "https://learn.microsoft.com/en-us/windows/wsl/install"
   }
  ],
  "match": [
   "WSL",
   "Windows Subsystem for Linux"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "setup"
 },
 {
  "id": "z-score",
  "term": "z-score (Wald statistic)",
  "aka": [
   "z-statistic",
   "Wald statistic",
   "Wald test"
  ],
  "short": "An estimate divided by its standard error: how many standard errors it lies from zero. If the true effect is zero it follows the standard normal distribution, so |z| = 1.96 gives p = 0.05 and |z| = 5.45 gives p = 5 × 10⁻⁸.",
  "long": "<p>GWAS summary statistics report \\(z = \\hat{\\beta}/\\mathrm{SE}(\\hat{\\beta})\\) for each SNP, or enough to compute it; its square is the chi-square statistic with 1 degree of freedom. Its sign shows which allele raises the trait, so z-scores from different studies can be combined or correlated only after their effect alleles are aligned. Methods that work from summary statistics, such as LD score regression, fine-mapping, TWAS and Mendelian randomization, take z-scores as input.</p><p>Outside genetics, a z-score is any value expressed in standard deviations from a mean.</p>",
  "l1": "Page 9 (the association test); page 10 (cross-trait LD score regression and the winner’s curse); page 1 (TWAS).",
  "see": [
   "standard-error",
   "p-value",
   "normal-distribution",
   "test-statistic",
   "summary-statistics",
   "harmonization"
  ],
  "links": [],
  "match": [
   "z-score",
   "z score",
   "z-statistic",
   "z statistic",
   "Wald statistic",
   "Wald test"
  ],
  "owner": "gwas-analysis"
 }
];
