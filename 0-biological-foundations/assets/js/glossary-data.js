/* Glossary entries (single source of truth for tooltips and the glossary page).
   Fields: id, term, aka[], short (HTML), long (HTML), l1 (Lecture 1 slides), see[] (ids), links[] ({t,u}),
   match[] (strings to auto-link), cs (case-sensitive), auto (false = never auto-link), noPlural. */
window.GLOSSARY_ENTRIES = [
 {
  "id": "zero-based-coordinates",
  "term": "1-based and 0-based coordinates",
  "aka": [
   "half-open interval",
   "fully closed interval"
  ],
  "short": "Two position-numbering conventions. 1-based, fully closed (VCF, PLINK, genome browsers): the first base is 1 and a region includes both ends. 0-based, half-open (BED, Python): the first base is 0 and the end is excluded.",
  "see": [
   "genomic-coordinate",
   "bed-format"
  ],
  "links": [
   {
    "t": "UCSC blog: coordinate counting systems",
    "u": "https://genome-blog.gi.ucsc.edu/blog/2016/12/12/the-ucsc-genome-browser-coordinate-counting-systems/"
   }
  ],
  "match": [
   "1-based",
   "0-based",
   "one-based",
   "zero-based",
   "half-open"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "dna"
 },
 {
  "id": "thousand-genomes",
  "term": "1000 Genomes Project (1KG)",
  "short": "An international project that sequenced 2,504 people from 26 populations in five continental super-populations (phase 3, 2015) and made the data public. The standard reference for ancestry, LD and imputation.",
  "long": "In 2022 the samples and 698 relatives were resequenced at 30× coverage (3,202 genomes, 602 trios). Population codes such as GBR, YRI and CHB appear in PCA plots and LD tools.",
  "l1": "slide 100",
  "see": [
   "super-population",
   "reference-population",
   "hapmap",
   "hgdp"
  ],
  "links": [
   {
    "t": "IGSR: 1000 Genomes population list",
    "u": "https://www.internationalgenome.org/data-portal/population"
   }
  ],
  "match": [
   "1000 Genomes",
   "1000 Genomes Project",
   "1KG",
   "1kGP"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "ancestry"
 },
 {
  "id": "five-prime-three-prime",
  "term": "5′ and 3′ ends",
  "aka": [
   "five-prime end",
   "three-prime end"
  ],
  "short": "The two ends of a DNA strand, named after the carbon atoms (5′ and 3′) of the sugar at each end. Sequences are written from 5′ (left) to 3′ (right), and new DNA grows 5′→3′.",
  "l1": "slides 57, 68",
  "see": [
   "strand",
   "antiparallel",
   "nucleotide"
  ],
  "match": [
   "5′ end",
   "3′ end",
   "5′ ends",
   "3′ ends",
   "5' end",
   "3' end",
   "five-prime end",
   "three-prime end"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "dna"
 },
 {
  "id": "five-prime-cap",
  "term": "5′ cap",
  "short": "A modified guanine (G) nucleotide added to the 5′ end of an mRNA. It protects the mRNA and helps ribosomes start translation.",
  "l1": "slide 62",
  "see": [
   "mrna",
   "poly-a-tail"
  ],
  "match": [
   "5′ cap",
   "5' cap"
  ],
  "cs": true,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "abo-blood-group",
  "term": "ABO blood group",
  "aka": [
   "ABO blood type"
  ],
  "short": "The blood types A, B, AB and O, set by the <em>ABO</em> gene. Of its three common alleles, A and B are codominant and O is recessive, so genotype AO gives type A.",
  "long": "The <em>ABO</em> gene on chromosome 9 encodes an enzyme that adds a sugar to a molecule on the surface of red blood cells: allele A adds one sugar, allele B a different one, and the common O allele makes an inactive enzyme. Lecture 1 uses <em>ABO</em> genotypes as its multi-allele example (slides 71, 73 and 76), and slide 90 maps the worldwide frequency of the B allele.",
  "l1": "slides 71, 73, 76, 90",
  "see": [
   "multiallelic",
   "codominant",
   "allele",
   "genotype-frequency"
  ],
  "match": [
   "ABO blood group",
   "ABO blood-group",
   "ABO blood type"
  ],
  "owner": "variation"
 },
 {
  "id": "accelerometer",
  "term": "accelerometer",
  "short": "A wearable sensor that records acceleration many times a second. About 100,000 UK Biobank participants wore one on the wrist for 7 days in 2013–2015, to measure physical activity objectively.",
  "see": [
   "imaging-study",
   "physical-measurement"
  ],
  "links": [
   {
    "t": "Doherty et al. (2017), PLoS One",
    "u": "https://doi.org/10.1371/journal.pone.0169649"
   }
  ],
  "match": [
   "accelerometer",
   "accelerometry"
  ],
  "cs": false,
  "auto": true,
  "owner": "uk-biobank"
 },
 {
  "id": "additive-model",
  "term": "additive genetic model",
  "aka": [
   "additive model",
   "additive coding"
  ],
  "short": "The standard association model, \\(y = \\alpha + \\beta g + \\text{covariates} + \\varepsilon\\): a person’s trait value \\(y\\) is an intercept \\(\\alpha\\), plus \\(\\beta\\) times \\(g\\), their number of effect-allele copies (0, 1 or 2), plus covariate terms and a residual \\(\\varepsilon\\). Each copy changes the mean trait value by the same amount, \\(\\beta\\).",
  "long": "Dominant coding (0, 1, 1) and recessive coding (0, 0, 1) are alternatives; additive coding is the default test in GWAS software.",
  "see": [
   "beta",
   "allele-dosage",
   "dominant",
   "recessive"
  ],
  "match": [
   "additive model",
   "additive genetic model"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "admixture",
  "term": "admixture (admixed)",
  "short": "Mixing of populations that had been separated for many generations, so that descendants carry chromosome segments inherited from each source population. Such people or populations are called admixed.",
  "long": "Admixture has happened repeatedly in human history. Estimated ancestry proportions describe genetic similarity to the chosen reference samples, and individuals vary widely around group averages.",
  "see": [
   "structure-admixture",
   "local-ancestry",
   "genetic-ancestry"
  ],
  "match": [
   "admixture",
   "admixed"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "ancestry"
 },
 {
  "id": "algorithmically-defined-outcome",
  "term": "algorithmically defined outcome (ADO)",
  "short": "A UK Biobank outcome, such as myocardial infarction, stroke or dementia, defined by combining self-report, hospital and death records with fixed code lists. The rules aim for a high positive predictive value.",
  "see": [
   "first-occurrence",
   "case-definition",
   "positive-predictive-value"
  ],
  "links": [
   {
    "t": "UK Biobank: Algorithmically-defined outcomes (PDF)",
    "u": "https://biobank.ndph.ox.ac.uk/showcase/ukb/docs/alg_outcome_main.pdf"
   }
  ],
  "match": [
   "algorithmically defined outcome",
   "algorithmically-defined outcome",
   "ADO"
  ],
  "cs": false,
  "auto": true,
  "owner": "phenotypes"
 },
 {
  "id": "aliquot",
  "term": "aliquot",
  "short": "A small portion of a sample split into its own tube, so that it can be stored and used separately from the rest. UK Biobank stored about 15 million aliquots of 1.4 ml.",
  "see": [
   "biobank",
   "plasma"
  ],
  "match": [
   "aliquot"
  ],
  "cs": false,
  "auto": true,
  "owner": "uk-biobank"
 },
 {
  "id": "allele",
  "term": "allele",
  "aka": [],
  "short": "One of the DNA sequences that occur at a locus. At a typical SNP there are two alleles, for example G and A; the <em>ABO</em> blood-group gene has three common alleles, A, B and O.",
  "l1": "slides 67–79",
  "see": [
   "locus",
   "genotype",
   "reference-allele",
   "effect-allele"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Allele",
    "u": "https://www.genome.gov/genetics-glossary/Allele"
   }
  ],
  "match": [
   "allele"
  ],
  "owner": "variation"
 },
 {
  "id": "allele-count",
  "term": "allele count",
  "short": "The number of copies of an allele in a sample: 2 for each person homozygous for it plus 1 for each heterozygote. Divided by \\(2n\\) for \\(n\\) people, it gives the allele frequency.",
  "long": "At an autosomal locus, \\(n\\) people carry \\(2n\\) allele copies, so the allele frequency is the allele count divided by \\(2n\\). PLINK 2 can write allele counts to an .acount file.",
  "l1": "slide 75",
  "see": [
   "allele-frequency",
   "genotype-frequency"
  ],
  "links": [
   {
    "t": "PLINK 2.0 file formats (.acount, .afreq)",
    "u": "https://www.cog-genomics.org/plink/2.0/formats"
   }
  ],
  "match": [
   "allele count"
  ],
  "owner": "allele-frequencies"
 },
 {
  "id": "allele-dosage",
  "term": "allele dosage (0/1/2 coding)",
  "aka": [
   "additive coding"
  ],
  "short": "Coding a genotype as the number of copies of one chosen allele: 0, 1 or 2. It turns genotypes into a numeric matrix for the additive model; imputed values can be fractional (dosages).",
  "see": [
   "genotype",
   "effect-allele",
   "dosage",
   "additive-model",
   "genotype-matrix"
  ],
  "match": [
   "allele dosage",
   "0/1/2 coding",
   "additive coding"
  ],
  "owner": "variation"
 },
 {
  "id": "allele-frequency",
  "term": "allele frequency",
  "short": "The fraction of all copies of a locus in a population that carry a given allele: the allele count divided by \\(2n\\) for \\(n\\) people (at an autosomal locus). A sample only estimates it.",
  "long": "An estimate \\(\\hat{p}\\) from \\(n\\) unrelated people counts \\(2n\\) allele copies; under Hardy–Weinberg proportions its standard error is \\(\\sqrt{p(1 - p)/(2n)}\\), where \\(p\\) is the frequency in the population. For a biallelic SNP, Lecture 1 writes \\(p\\) for the frequency of allele 1 and \\(q = 1 - p\\) for that of allele 2. A frequency means nothing until you say which allele, and in which population, it refers to. In a 0/1/2 genotype matrix, a column’s mean divided by 2 is the frequency of the counted allele.",
  "l1": "slides 75–78",
  "see": [
   "maf",
   "allele-count",
   "genotype-frequency",
   "hwe"
  ],
  "links": [
   {
    "t": "Scitable: The Hardy-Weinberg Principle",
    "u": "https://www.nature.com/scitable/knowledge/library/the-hardy-weinberg-principle-13235724/"
   },
   {
    "t": "Ensembl: population allele frequencies for rs4988235",
    "u": "https://www.ensembl.org/Homo_sapiens/Variation/Population?v=rs4988235"
   }
  ],
  "match": [
   "allele frequency"
  ],
  "owner": "allele-frequencies"
 },
 {
  "id": "allele-frequency-spectrum",
  "term": "allele frequency spectrum",
  "aka": [
   "site frequency spectrum",
   "SFS"
  ],
  "short": "The distribution of allele frequencies across all variant sites in a sample: how many sites have a minor allele frequency of 0.1%, 1%, 10%, and so on. In humans it is dominated by rare variants.",
  "long": "Most variant sites are rare, yet most of the variants in any one genome are common, because a person carries an allele of frequency f with probability about 2f. The excess of rare variants reflects recent explosive population growth.",
  "l1": "slide 88",
  "see": [
   "rare-variant",
   "common-variant",
   "maf"
  ],
  "links": [
   {
    "t": "1000 Genomes Project Consortium 2015: A global reference for human genetic variation",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC4750478/"
   }
  ],
  "match": [
   "allele frequency spectrum",
   "site frequency spectrum"
  ],
  "owner": "allele-frequencies"
 },
 {
  "id": "allele-swap",
  "term": "allele swap",
  "aka": [
   "allele switch"
  ],
  "short": "Changing which of a SNP’s two alleles is counted as the effect allele: each genotype dosage \\(g\\) (copies of the counted allele) becomes \\(2 - g\\), the per-allele effect \\(\\beta\\) becomes \\(-\\beta\\) and the counted allele’s frequency \\(p\\) becomes \\(1 - p\\). Not a strand flip.",
  "long": "A strand flip rewrites the letters of both alleles without changing which allele is counted; an allele swap changes which allele is counted. Harmonizing two files can need either or both.",
  "see": [
   "strand-flip",
   "harmonization",
   "effect-allele"
  ],
  "match": [
   "allele swap",
   "allele switch",
   "allele swapping"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "dna"
 },
 {
  "id": "alternative-allele",
  "term": "alternative allele (ALT)",
  "aka": [
   "alternate allele",
   "ALT",
   "non-reference allele"
  ],
  "short": "Any allele at a position that differs from the reference allele. In a VCF file the first ALT allele is coded 1, so the genotype 0/1 carries one reference and one alternative allele.",
  "l1": "slide 68",
  "see": [
   "reference-allele",
   "vcf"
  ],
  "match": [
   "alternative allele",
   "alternate allele",
   "ALT allele",
   "non-reference allele"
  ],
  "owner": "variation"
 },
 {
  "id": "alternative-splicing",
  "term": "alternative splicing",
  "short": "Splicing a pre-mRNA in more than one way, keeping different sets of exons, so one gene makes several transcripts and protein versions. About 95% of human multi-exon genes are alternatively spliced, often differing by tissue.",
  "see": [
   "splicing",
   "transcript"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Alternative splicing",
    "u": "https://www.genome.gov/genetics-glossary/Alternative-Splicing"
   }
  ],
  "match": [
   "alternative splicing",
   "alternatively spliced"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "alzheimers-disease",
  "term": "Alzheimer’s disease",
  "aka": [
   "Alzheimer disease"
  ],
  "short": "A degenerative brain disease that causes dementia, a gradual loss of memory, judgment and ability to function, usually after age 65. The <em>APOE</em> ε4 allele raises its risk.",
  "see": [
   "pleiotropy",
   "complex-trait"
  ],
  "links": [
   {
    "t": "MedlinePlus Genetics: Alzheimer disease",
    "u": "https://medlineplus.gov/genetics/condition/alzheimer-disease/"
   }
  ],
  "match": [
   "Alzheimer’s disease",
   "Alzheimer's disease",
   "Alzheimer disease"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "amino-acid",
  "term": "amino acid",
  "short": "One of the 20 kinds of small molecule that cells join into chains to make proteins. They differ in their side chain; each has a three-letter and a one-letter code (methionine: Met, M).",
  "long": "All amino acids share the same core (a central carbon atom carrying an amino group and a carboxyl group) and differ in the side chain attached to it, which gives each its chemical properties. Variant names use the codes: p.Glu7Val in <em>HBB</em> means that glutamic acid (Glu) at position 7 is replaced by valine (Val).",
  "l1": "slides 62–63, 74",
  "see": [
   "protein",
   "codon",
   "genetic-code"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Amino acids",
    "u": "https://www.genome.gov/genetics-glossary/Amino-Acids"
   }
  ],
  "match": [
   "amino acid"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "ancestral-allele",
  "term": "ancestral allele",
  "aka": [],
  "short": "The allele that existed before a mutation created the other one, inferred by comparing human DNA with that of other primates such as the chimpanzee. The allele created by the mutation is the derived allele.",
  "long": "Lecture 1 slide 111 (“new arrangements for ancestral alleles”) uses the phrase more loosely: the alleles carried on ancestors’ chromosomes, derived alleles included.",
  "see": [
   "derived-allele",
   "mutation"
  ],
  "match": [
   "ancestral allele"
  ],
  "noPlural": true,
  "owner": "variation"
 },
 {
  "id": "aneuploidy",
  "term": "aneuploidy",
  "aka": [
   "aneuploid"
  ],
  "short": "Having a number of chromosomes other than the usual 46, because a whole chromosome is gained or lost. Example: trisomy 21 (three copies of chromosome 21) causes most cases of Down syndrome.",
  "see": [
   "trisomy",
   "karyotype",
   "chromosome"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Aneuploidy",
    "u": "https://www.genome.gov/genetics-glossary/Aneuploidy"
   }
  ],
  "match": [
   "aneuploidy",
   "aneuploid"
  ],
  "noPlural": true,
  "owner": "variation"
 },
 {
  "id": "antiparallel",
  "term": "antiparallel",
  "short": "Running in opposite directions. The two strands of a DNA double helix are antiparallel: where one runs 5′→3′ from left to right, its partner runs 5′→3′ from right to left.",
  "l1": "slide 57 (“antisense (mirror image) copies”)",
  "see": [
   "strand",
   "reverse-complement",
   "five-prime-three-prime"
  ],
  "match": [
   "antiparallel",
   "anti-parallel"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "dna"
 },
 {
  "id": "array-index",
  "term": "array index",
  "short": "In UK Biobank, the index that separates several values of one data-field recorded at the same instance, such as the two blood pressure readings of Field 4080 (indices 0 and 1).",
  "long": "Other examples: up to 37 self-reported illnesses (Field 20002), up to 259 hospital diagnosis codes (Field 41270) and 40 genetic principal components (Field 22009, indices 1 to 40).",
  "see": [
   "data-field",
   "instance"
  ],
  "match": [
   "array index",
   "array indices",
   "array indexes"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "phenotypes"
 },
 {
  "id": "assessment-centre",
  "term": "assessment centre",
  "short": "One of the 22 temporary clinics in England, Scotland and Wales where UK Biobank participants had their baseline visit in 2006–2010 (Data-Field 54). Later visits used a repeat-assessment centre and four imaging centres.",
  "see": [
   "baseline",
   "touchscreen-questionnaire"
  ],
  "match": [
   "assessment centre",
   "assessment-centre",
   "assessment center"
  ],
  "cs": false,
  "auto": true,
  "owner": "uk-biobank"
 },
 {
  "id": "atac-seq",
  "term": "ATAC-seq",
  "aka": [
   "assay for transposase-accessible chromatin using sequencing"
  ],
  "short": "A laboratory method that maps open chromatin. The enzyme Tn5 transposase cuts DNA mainly where nucleosomes do not cover it and tags the cut ends; sequencing the tagged pieces shows which regions are accessible.",
  "long": "The name stands for assay for transposase-accessible chromatin using sequencing (Buenrostro et al. 2013). It works with 500 to 50,000 cells, far fewer than DNase-seq, the older method that maps DNase I hypersensitive sites.",
  "see": [
   "chromatin-accessibility",
   "dnase-hypersensitive-site",
   "nucleosome",
   "encode"
  ],
  "links": [
   {
    "t": "Buenrostro et al. 2013, the ATAC-seq method (Nature Methods; free author manuscript)",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3959825/"
   }
  ],
  "match": [
   "ATAC-seq",
   "ATAC-Seq",
   "ATAC sequencing"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "genes-expression"
 },
 {
  "id": "atherosclerosis",
  "term": "atherosclerosis",
  "aka": [
   "atherosclerotic"
  ],
  "short": "Build-up of plaque (cholesterol, fat, blood cells, calcium and other substances) inside arteries, which narrows them. It underlies coronary artery disease and most heart attacks; LDL cholesterol is a cause.",
  "see": [
   "ldl-cholesterol",
   "coronary-artery-disease",
   "myocardial-infarction"
  ],
  "links": [
   {
    "t": "MedlinePlus: Atherosclerosis",
    "u": "https://medlineplus.gov/atherosclerosis.html"
   }
  ],
  "match": [
   "atherosclerosis",
   "atherosclerotic"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "autosome",
  "term": "autosome",
  "aka": [
   "autosomal"
  ],
  "short": "Any of chromosomes 1–22, the chromosomes that are not sex chromosomes. Each body cell has two copies of every autosome, one from each parent.",
  "l1": "slides 59, 72, 79",
  "see": [
   "chromosome",
   "sex-chromosomes"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Autosome",
    "u": "https://www.genome.gov/genetics-glossary/Autosome"
   }
  ],
  "match": [
   "autosome",
   "autosomal"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "cells-chromosomes"
 },
 {
  "id": "b-allele-frequency",
  "term": "B allele frequency (BAF)",
  "aka": [
   "BAF"
  ],
  "short": "The share of the array signal at a SNP that comes from allele B, scaled so AA, AB and BB fall at 0, 0.5 and 1. A split or missing heterozygote band reveals copy-number changes.",
  "long": "Despite its name, BAF is not a population allele frequency, and it is unrelated to the “B allele frequency” of the ABO blood-group maps on Lecture 1 slide 90. Loss of one copy in a fraction \\(c\\) of cells moves the heterozygote band from 0.5 to \\((1 - c)/(2 - c)\\) and its mirror image \\(1/(2 - c)\\): averaged over cells, the allele that is lost is present in \\(1 - c\\) copies and both alleles together in \\(2 - c\\). At \\(c = 1\\) the bands reach 0 and 1.",
  "see": [
   "log-r-ratio",
   "mosaicism",
   "mosaic-chromosomal-alteration",
   "copy-number-variant"
  ],
  "links": [
   {
    "t": "Peiffer et al. 2006: Genomic profiling of chromosomal aberrations with genotyping arrays (BAF and LRR)",
    "u": "https://doi.org/10.1101/gr.5402306"
   },
   {
    "t": "Loh et al. 2018: Insights into clonal haematopoiesis from 8,342 mosaic chromosomal alterations",
    "u": "https://doi.org/10.1038/s41586-018-0321-x"
   }
  ],
  "match": [
   "B allele frequency",
   "BAF"
  ],
  "cs": true,
  "owner": "samples-to-genotypes"
 },
 {
  "id": "balancing-selection",
  "term": "balancing selection",
  "aka": [
   "heterozygote advantage"
  ],
  "short": "Natural selection that keeps two or more alleles in a population, as when heterozygotes survive and reproduce best. One copy of the sickle-cell allele HbS protects against severe malaria; two copies cause sickle cell disease.",
  "long": "Heterozygote advantage is one mechanism. Others are selection whose direction changes over time or place, and selection that favors whichever allele is rarer.",
  "see": [
   "natural-selection",
   "sickle-cell-trait"
  ],
  "links": [
   {
    "t": "Williams et al. 2005: Sickle cell trait and the risk of Plasmodium falciparum malaria",
    "u": "https://doi.org/10.1086/430744"
   }
  ],
  "match": [
   "balancing selection",
   "heterozygote advantage"
  ],
  "noPlural": true,
  "owner": "allele-frequencies"
 },
 {
  "id": "base",
  "term": "base",
  "aka": [
   "nucleobase",
   "adenine (A)",
   "cytosine (C)",
   "guanine (G)",
   "thymine (T)"
  ],
  "short": "The part of a nucleotide that varies: adenine (A), cytosine (C), guanine (G) or thymine (T) in DNA. The order of bases carries the genetic information; each pairs with a partner on the other strand.",
  "long": "RNA uses uracil (U) in place of thymine. A and G are purines (two rings); C and T are pyrimidines (one ring).",
  "l1": "slides 57–58",
  "see": [
   "base-pair",
   "nucleotide",
   "purine",
   "pyrimidine"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Thymine",
    "u": "https://www.genome.gov/genetics-glossary/Thymine"
   }
  ],
  "match": [
   "base",
   "nucleobase",
   "adenine",
   "cytosine",
   "guanine",
   "thymine"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "dna"
 },
 {
  "id": "base-pair",
  "term": "base pair (bp)",
  "aka": [
   "bp"
  ],
  "short": "Two bases on opposite DNA strands held together by hydrogen bonds: A with T, or C with G. The base pair is the unit of length for DNA (bp; 1 kb = 1,000 bp).",
  "l1": "slides 57–58",
  "see": [
   "complementary",
   "hydrogen-bond",
   "kilobase"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Base pair",
    "u": "https://www.genome.gov/genetics-glossary/Base-Pair"
   }
  ],
  "match": [
   "base pair",
   "base-pair"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "dna"
 },
 {
  "id": "baseline",
  "term": "baseline",
  "aka": [
   "baseline assessment"
  ],
  "short": "The first assessment of each participant in a cohort study, when exposures and characteristics are measured. In UK Biobank, the 2006–2010 assessment-centre visit (instance 0 of each Data-Field).",
  "see": [
   "follow-up",
   "prospective-cohort-study",
   "instance"
  ],
  "match": [
   "baseline assessment",
   "baseline visit",
   "baseline measurement"
  ],
  "cs": false,
  "auto": true,
  "owner": "uk-biobank"
 },
 {
  "id": "batch-effect",
  "term": "batch effect",
  "short": "A systematic difference between groups of samples processed together (a batch, plate, laboratory or date) that comes from the measurement process, not biology. If batch is correlated with case status, it can create false associations.",
  "long": "UK Biobank called genotypes in 106 batches and tested every marker for batch and plate effects, setting calls to missing within a batch when the test gave P &lt; 10<sup>−12</sup>. Randomizing samples to plates keeps batch from lining up with phenotypes.",
  "see": [
   "genotype-calling",
   "differential-missingness",
   "variant-qc",
   "qc"
  ],
  "links": [
   {
    "t": "Bycroft et al. 2018: The UK Biobank resource with deep phenotyping and genomic data",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC6786975/"
   },
   {
    "t": "Anderson et al. 2010: Data quality control in genetic case-control association studies",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3025522/"
   }
  ],
  "match": [
   "batch effect"
  ],
  "owner": "samples-to-genotypes"
 },
 {
  "id": "bed-format",
  "term": "BED format (genomic intervals)",
  "short": "A tab-separated text format for genomic intervals: chromosome, start, end, plus optional columns. Starts are 0-based and ends excluded (half-open). Not the same as PLINK's binary .bed genotype file.",
  "see": [
   "zero-based-coordinates",
   "plink-binary"
  ],
  "links": [
   {
    "t": "UCSC: BED format",
    "u": "https://genome.ucsc.edu/FAQ/FAQformat.html#format1"
   }
  ],
  "match": [
   "BED format",
   "BED file"
  ],
  "cs": true,
  "auto": true,
  "noPlural": false,
  "owner": "dna"
 },
 {
  "id": "bgen",
  "term": "BGEN",
  "aka": [
   "BGEN format"
  ],
  "short": "A compressed binary file format for genotype probabilities. For each person and variant it stores the probability of each genotype, so it can hold imputed data. UK Biobank distributes its imputed genotypes as BGEN files.",
  "long": "In BGEN version 1.2 as used by UK Biobank, each probability is stored in 8 bits (an integer from 0 to 255, divided by 255), and the probability of the third genotype is 1 minus the other two. A <code>.sample</code> file lists the people, and a <code>.bgi</code> index file lets tools such as bgenix read one region without scanning the whole file.",
  "see": [
   "genotype-probability",
   "dosage",
   "genotype-imputation",
   "plink-binary"
  ],
  "links": [
   {
    "t": "BGEN v1.2 specification (archived)",
    "u": "https://web.archive.org/web/20251015171235/https://www.chg.ox.ac.uk/~gav/bgen_format/spec/v1.2.html"
   },
   {
    "t": "BGEN in the UK Biobank",
    "u": "https://enkre.net/cgi-bin/code/bgen/wiki/?name=BGEN+in+the+UK+Biobank"
   }
  ],
  "match": [
   "BGEN"
  ],
  "cs": true,
  "auto": true,
  "noPlural": false,
  "owner": "the-data"
 },
 {
  "id": "biallelic",
  "term": "biallelic (diallelic)",
  "aka": [
   "diallelic"
  ],
  "short": "Having exactly two alleles. Most SNPs are biallelic because a second mutation at the same base is rare. A biallelic variant has three possible genotypes.",
  "l1": "slides 78, 82 (“diallelic”)",
  "see": [
   "multiallelic",
   "genotype"
  ],
  "match": [
   "biallelic",
   "diallelic",
   "bi-allelic"
  ],
  "noPlural": true,
  "owner": "variation"
 },
 {
  "id": "binary-trait",
  "term": "binary trait",
  "aka": [
   "case–control trait",
   "dichotomous trait"
  ],
  "short": "A trait with two values, such as having or not having coronary artery disease. People with the trait are cases and the others controls; association is usually tested with logistic regression.",
  "see": [
   "quantitative-trait",
   "odds-ratio",
   "liability-threshold-model"
  ],
  "match": [
   "binary trait",
   "case–control trait",
   "case-control trait",
   "dichotomous trait"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "biobank",
  "term": "biobank",
  "short": "A collection of biological samples, such as blood, urine or DNA, stored together with health and lifestyle data from the same people for future research.",
  "see": [
   "uk-biobank",
   "aliquot"
  ],
  "match": [
   "biobank"
  ],
  "cs": false,
  "auto": true,
  "owner": "uk-biobank"
 },
 {
  "id": "biomarker",
  "term": "biomarker",
  "short": "A measurable substance or property, for example in blood or urine, that reflects a biological state or disease process: cholesterol, glucose, a protein or a blood cell count.",
  "long": "In UK Biobank most biomarkers were measured years after collection on stored, frozen samples, so sample handling, assay limits and batches all affect the values.",
  "l1": "slide 25",
  "see": [
   "blood-biochemistry",
   "haematology",
   "metabolomics",
   "proteomics",
   "limit-of-detection"
  ],
  "match": [
   "biomarker"
  ],
  "cs": false,
  "auto": true,
  "owner": "phenotypes"
 },
 {
  "id": "blood-biochemistry",
  "term": "blood biochemistry",
  "aka": [
   "serum biochemistry",
   "clinical chemistry"
  ],
  "short": "Standard laboratory tests on the liquid part of blood, such as cholesterol, triglycerides, glucose, HbA1c, C-reactive protein, and liver and kidney markers. UK Biobank measured about 30 of them in nearly all participants.",
  "see": [
   "biomarker",
   "ldl-cholesterol",
   "haematology"
  ],
  "match": [
   "blood biochemistry",
   "serum biochemistry",
   "biochemistry panel"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "phenotypes"
 },
 {
  "id": "bmi",
  "term": "body mass index (BMI)",
  "short": "Weight in kilograms divided by the square of height in meters (kg/m²): a simple, widely used measure of body size. UK Biobank derives it from measured height and weight (Field 21001).",
  "see": [
   "physical-measurement",
   "quantitative-trait"
  ],
  "match": [
   "body mass index",
   "BMI"
  ],
  "cs": false,
  "auto": true,
  "owner": "phenotypes"
 },
 {
  "id": "bonferroni-correction",
  "term": "Bonferroni correction",
  "short": "Requiring a p-value below \\(0.05/m\\) when \\(m\\) tests are run. Each test of a true null hypothesis then gives a false positive with probability at most \\(0.05/m\\), so the probability of at least one false positive among the \\(m\\) tests is at most \\(m \\times 0.05/m = 0.05\\), whatever the correlation between the tests. The genome-wide threshold, 5 × 10<sup>−8</sup>, is 0.05 divided by about one million independent tests.",
  "long": "It is conservative when tests are correlated, as tests of nearby SNPs in LD are; GWAS therefore divide by the effective number of independent tests rather than by the number of variants tested.",
  "see": [
   "multiple-testing",
   "family-wise-error-rate",
   "genome-wide-significance",
   "effective-number-of-tests"
  ],
  "match": [
   "Bonferroni correction",
   "Bonferroni"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "the-data"
 },
 {
  "id": "buffy-coat",
  "term": "buffy coat",
  "short": "The pale layer between plasma and red blood cells in a centrifuged blood tube, under 1% of the volume. It holds the white blood cells and platelets and is the usual DNA source for genotyping.",
  "long": "UK Biobank extracted DNA from 850 µl of buffy coat per participant, giving 900 µl of DNA; 50 µl went to the genotyping laboratory and the rest was stored.",
  "see": [
   "white-blood-cell",
   "platelet",
   "dna-extraction",
   "whole-blood"
  ],
  "links": [
   {
    "t": "OpenStax Anatomy & Physiology 2e, 18.1: An overview of blood",
    "u": "https://openstax.org/books/anatomy-and-physiology-2e/pages/18-1-an-overview-of-blood"
   },
   {
    "t": "UK Biobank: DNA processing, from sample to genotyping laboratory (v2.0, PDF)",
    "u": "https://biobank.ndph.ox.ac.uk/ukb/ukb/docs/ukb_dna_processing.pdf"
   }
  ],
  "match": [
   "buffy coat"
  ],
  "owner": "samples-to-genotypes"
 },
 {
  "id": "c-reactive-protein",
  "term": "C-reactive protein (CRP)",
  "aka": [
   "CRP"
  ],
  "short": "A protein the liver makes in response to inflammation; its blood level is a common marker of inflammation. Mendelian randomization suggests that CRP itself does not cause coronary heart disease.",
  "l1": "slide 23",
  "see": [
   "mendelian-randomization",
   "biomarker"
  ],
  "links": [
   {
    "t": "MedlinePlus: C-Reactive Protein (CRP) Test",
    "u": "https://medlineplus.gov/lab-tests/c-reactive-protein-crp-test/"
   }
  ],
  "match": [
   "C-reactive protein",
   "CRP"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "call-rate",
  "term": "call rate",
  "short": "The fraction of genotypes called: for a SNP, the share of people with a call; for a person, the share of SNPs called. QC removes people and SNPs with low call rates, typically below 95–98%.",
  "long": "The call rate is 1 minus the missingness. In PLINK, <code>--missing</code> reports it, <code>--mind</code> filters people and <code>--geno</code> filters SNPs. A low call rate for a person usually means little or degraded DNA; for a SNP, poorly separated clusters.",
  "see": [
   "missingness",
   "no-call",
   "sample-qc",
   "variant-qc"
  ],
  "links": [
   {
    "t": "Anderson et al. 2010: Data quality control in genetic case-control association studies",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3025522/"
   },
   {
    "t": "PLINK 1.9: basic statistics (--missing, --check-sex, --het, --mendel)",
    "u": "https://www.cog-genomics.org/plink/1.9/basic_stats"
   }
  ],
  "match": [
   "call rate"
  ],
  "owner": "samples-to-genotypes"
 },
 {
  "id": "cancer-registry",
  "term": "cancer registry",
  "short": "A database that records every diagnosed cancer in a region, with date, site and tumor type. UK Biobank's linked registry data include cancers diagnosed as far back as the early 1970s.",
  "see": [
   "record-linkage",
   "death-registry"
  ],
  "match": [
   "cancer registry",
   "cancer registration"
  ],
  "cs": false,
  "auto": true,
  "owner": "uk-biobank"
 },
 {
  "id": "carrier",
  "term": "carrier",
  "short": "A person who carries a particular allele, usually one copy of a disease-causing variant. For a recessive condition a carrier is usually unaffected but passes the allele to each child with probability ½.",
  "see": [
   "recessive",
   "heterozygous",
   "penetrance"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Carrier",
    "u": "https://www.genome.gov/genetics-glossary/Carrier"
   }
  ],
  "match": [
   "carrier"
  ],
  "owner": "inheritance"
 },
 {
  "id": "case",
  "term": "case",
  "short": "In a study of a disease, a person who has the disease according to the study’s case definition; coded 1 in a binary phenotype column.",
  "long": "Who is a case depends on the definition: the codes, sources and time window used. Record-based definitions miss some true cases and count some people who never had the disease.",
  "see": [
   "control",
   "case-definition",
   "binary-trait"
  ],
  "match": [
   "case"
  ],
  "cs": false,
  "auto": false,
  "owner": "phenotypes"
 },
 {
  "id": "case-definition",
  "term": "case definition",
  "aka": [
   "phenotype definition",
   "phenotyping algorithm"
  ],
  "short": "The rule that decides from the available data who counts as a case, who counts as a control and who is left out: which codes, record sources, time window and exclusions.",
  "long": "Different case definitions for the same disease give different numbers of cases, different shares of true cases, and different association estimates.",
  "see": [
   "case",
   "control",
   "positive-predictive-value",
   "first-occurrence",
   "algorithmically-defined-outcome"
  ],
  "match": [
   "case definition",
   "phenotype definition",
   "phenotyping algorithm"
  ],
  "cs": false,
  "auto": true,
  "owner": "phenotypes"
 },
 {
  "id": "case-control-study",
  "term": "case–control study",
  "aka": [
   "case-control design"
  ],
  "short": "A study that selects people because they have the outcome (cases) or do not (controls) and compares their past exposures or genotypes. Efficient for rare diseases; it estimates odds ratios but not prevalence or incidence.",
  "long": "It cannot estimate prevalence or incidence because the design fixes the share of cases. The PennCATH data used in the Session 1 practical come from a case–control sample of coronary artery disease.",
  "see": [
   "case",
   "control",
   "odds-ratio",
   "cohort-study"
  ],
  "links": [
   {
    "t": "BMJ: Epidemiology for the uninitiated, ch. 8",
    "u": "https://www.bmj.com/about-bmj/resources-readers/publications/epidemiology-uninitiated/8-case-control-and-cross-sectional"
   }
  ],
  "match": [
   "case–control study",
   "case-control study",
   "case–control design",
   "case-control design",
   "case–control data",
   "case-control data"
  ],
  "cs": false,
  "auto": true,
  "owner": "uk-biobank"
 },
 {
  "id": "causal-variant",
  "term": "causal variant",
  "aka": [
   "causal SNP",
   "functional variant"
  ],
  "short": "A variant that itself affects the trait, rather than being associated only through LD. Most SNPs in a GWAS peak are associated only through LD; fine-mapping tries to find the causal ones.",
  "l1": "slide 49",
  "see": [
   "lead-variant",
   "fine-mapping",
   "credible-set",
   "ld"
  ],
  "match": [
   "causal variant",
   "causal SNP"
  ],
  "cs": false,
  "auto": true,
  "owner": "haplotypes-ld"
 },
 {
  "id": "cell",
  "term": "cell",
  "aka": [
   "cells"
  ],
  "short": "The smallest living unit of the body: a compartment enclosed by a membrane and filled with water, salts and large molecules. Most human cells have a nucleus holding the genome; red blood cells do not.",
  "long": "An adult body has about 28–37 trillion cells, depending on the study and on body size (Hatton et al. 2023). Most of them by count are red blood cells, which have no nucleus (about 84% in Sender et al. 2016).",
  "l1": "slides 63, 71",
  "see": [
   "nucleus",
   "cell-type",
   "tissue"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Cell",
    "u": "https://www.genome.gov/genetics-glossary/Cell"
   },
   {
    "t": "MedlinePlus Genetics: What is a cell?",
    "u": "https://medlineplus.gov/genetics/understanding/basics/cell/"
   }
  ],
  "match": [
   "cell"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "cells-chromosomes"
 },
 {
  "id": "cell-type",
  "term": "cell type",
  "short": "A class of cells with a characteristic shape and function, such as liver cells, white blood cells or nerve cells. Cell types share the same genome but use different subsets of their genes.",
  "see": [
   "cell",
   "tissue"
  ],
  "links": [
   {
    "t": "Human Protein Atlas: the tissue section",
    "u": "https://www.proteinatlas.org/humanproteome/tissue"
   }
  ],
  "match": [
   "cell type"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "cells-chromosomes"
 },
 {
  "id": "censoring",
  "term": "censoring",
  "short": "Follow-up that ends before the event is seen, because of death from another cause, loss to follow-up or the end of complete records. The censored time is a lower bound on the event time.",
  "long": "A censored time is not a missing value: survival methods use the fact that the event had not happened by then. In UK Biobank each record source has a censoring date up to which its data are thought to be mostly complete. UK Biobank does not cut the data at that date; analysts apply it themselves.",
  "see": [
   "time-to-event",
   "follow-up",
   "cox-regression"
  ],
  "match": [
   "censoring",
   "censored",
   "censoring date"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "phenotypes"
 },
 {
  "id": "centimorgan",
  "term": "centimorgan (cM)",
  "aka": [
   "cM",
   "morgan"
  ],
  "short": "The unit of genetic distance. Loci 1 cM apart are separated by a crossover in about 1% of transmissions; one morgan (100 cM) is the length with one crossover per transmitted copy on average.",
  "long": "Averaged over the genome, 1 cM corresponds to roughly 1 million base pairs (1.13 cM per Mb in the deCODE map; Kong et al. 2002), but local rates vary widely because of recombination hotspots. Column 3 of a PLINK .bim file holds this position and is often set to 0.",
  "see": [
   "genetic-map",
   "recombination-fraction",
   "recombination-hotspot"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Centimorgan",
    "u": "https://www.genome.gov/genetics-glossary/Centimorgan"
   }
  ],
  "match": [
   "centimorgan",
   "Centimorgan",
   "cM"
  ],
  "cs": true,
  "owner": "inheritance"
 },
 {
  "id": "central-dogma",
  "term": "central dogma of molecular biology",
  "short": "Crick's rule for the flow of sequence information in cells: DNA is copied into DNA and transcribed into RNA, and RNA is translated into protein; information does not flow from protein back to nucleic acid.",
  "l1": "slide 61",
  "see": [
   "transcription",
   "translation"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Central dogma",
    "u": "https://www.genome.gov/genetics-glossary/Central-Dogma"
   }
  ],
  "match": [
   "central dogma"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "centromere",
  "term": "centromere",
  "short": "The narrowed region of a chromosome where the fibers that separate chromosomes during cell division attach. It divides the chromosome into a short (p) arm and a long (q) arm.",
  "see": [
   "chromosome-arm",
   "telomere",
   "chromatid"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Centromere",
    "u": "https://www.genome.gov/genetics-glossary/Centromere"
   }
  ],
  "match": [
   "centromere"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "cells-chromosomes"
 },
 {
  "id": "chromatid",
  "term": "chromatid (sister chromatids)",
  "aka": [
   "sister chromatid"
  ],
  "short": "One of the two identical copies of a chromosome’s DNA made before cell division. The two sister chromatids are joined at the centromere until they separate into different cells.",
  "see": [
   "chromosome",
   "centromere",
   "mitosis",
   "meiosis"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Chromatid",
    "u": "https://www.genome.gov/genetics-glossary/Chromatid"
   }
  ],
  "match": [
   "chromatid",
   "sister chromatid"
  ],
  "owner": "inheritance"
 },
 {
  "id": "chromatin",
  "term": "chromatin",
  "short": "DNA together with the histones and other proteins bound to it: the material chromosomes are made of. How tightly chromatin is packed affects whether the genes in a region can be used.",
  "l1": "slide 63",
  "see": [
   "histone",
   "nucleosome"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Chromatin",
    "u": "https://www.genome.gov/genetics-glossary/Chromatin"
   }
  ],
  "match": [
   "chromatin"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "cells-chromosomes"
 },
 {
  "id": "chromatin-accessibility",
  "term": "chromatin accessibility",
  "aka": [
   "open chromatin"
  ],
  "short": "How exposed a stretch of DNA is to DNA-binding proteins. Active promoters and enhancers are open, with few nucleosomes; silent regions are closed. Accessibility differs between cell types and is measured by DNase-seq or ATAC-seq.",
  "l1": "slide 63",
  "see": [
   "chromatin",
   "nucleosome",
   "dnase-hypersensitive-site",
   "atac-seq"
  ],
  "links": [
   {
    "t": "ENCODE SCREEN: candidate regulatory elements",
    "u": "https://screen.encodeproject.org/"
   }
  ],
  "match": [
   "chromatin accessibility",
   "open chromatin",
   "accessible chromatin",
   "closed chromatin"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "chromosome",
  "term": "chromosome",
  "short": "One long DNA molecule together with the proteins that fold it. Human cells normally have 46 chromosomes in the nucleus: two copies of chromosomes 1–22 plus two sex chromosomes (XX or XY).",
  "l1": "slides 59, 60, 68",
  "see": [
   "autosome",
   "sex-chromosomes",
   "karyotype",
   "homologous-chromosomes"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Chromosome",
    "u": "https://www.genome.gov/genetics-glossary/Chromosome"
   },
   {
    "t": "MedlinePlus Genetics: What is a chromosome?",
    "u": "https://medlineplus.gov/genetics/understanding/basics/chromosome/"
   }
  ],
  "match": [
   "chromosome"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "cells-chromosomes"
 },
 {
  "id": "chromosome-arm",
  "term": "chromosome arm (p arm, q arm)",
  "aka": [
   "short arm (p)",
   "long arm (q)"
  ],
  "short": "One of the two parts of a chromosome on either side of the centromere: the short arm is called p and the long arm q. Band names include the arm, as in 12q24.12.",
  "l1": "slides 60, 68",
  "see": [
   "centromere",
   "cytogenetic-band"
  ],
  "links": [
   {
    "t": "MedlinePlus Genetics: How do geneticists indicate the location of a gene?",
    "u": "https://medlineplus.gov/genetics/understanding/howgeneswork/genelocation/"
   }
  ],
  "match": [
   "chromosome arm",
   "short arm",
   "long arm",
   "p arm",
   "q arm"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "cells-chromosomes"
 },
 {
  "id": "chromosome-territory",
  "term": "chromosome territory",
  "short": "The region of the nucleus that one chromosome occupies between cell divisions. The unwound chromosome stays within this region rather than spreading through the whole nucleus.",
  "see": [
   "chromatin",
   "nucleus"
  ],
  "links": [
   {
    "t": "Cremer & Cremer 2010, Chromosome territories",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC2829961/"
   }
  ],
  "match": [
   "chromosome territory"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "cells-chromosomes"
 },
 {
  "id": "cis-trans",
  "term": "cis and trans (regulatory effects)",
  "aka": [
   "cis-acting",
   "trans-acting"
  ],
  "short": "A cis effect acts on a nearby gene on the same DNA molecule, as an enhancer variant does. A trans effect acts from elsewhere in the genome, through a product such as a transcription factor.",
  "l1": "slide 62",
  "see": [
   "eqtl",
   "enhancer",
   "transcription-factor"
  ],
  "match": [
   "cis-acting",
   "trans-acting"
  ],
  "cs": true,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "cline",
  "term": "cline",
  "short": "A gradual change in allele frequency along a geographic axis. Human allele frequencies mostly change in clines rather than in sharp steps between groups, because people have mostly had children with partners from nearby.",
  "see": [
   "population-structure",
   "allele-frequency"
  ],
  "match": [
   "cline"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "ancestry"
 },
 {
  "id": "clinvar",
  "term": "ClinVar",
  "aka": [],
  "short": "NCBI's public archive of laboratory reports on whether specific variants cause disease, classified as pathogenic, likely pathogenic, uncertain significance, likely benign or benign.",
  "see": [
   "dbsnp",
   "gnomad"
  ],
  "links": [
   {
    "t": "ClinVar (NCBI)",
    "u": "https://www.ncbi.nlm.nih.gov/clinvar/"
   }
  ],
  "match": [
   "ClinVar"
  ],
  "owner": "variation"
 },
 {
  "id": "clonal-hematopoiesis",
  "term": "clonal hematopoiesis (CH)",
  "aka": [
   "clonal haematopoiesis"
  ],
  "short": "Blood production in which a measurable share of blood cells descends from one blood stem cell with a somatic mutation. It increases with age and is associated with later blood cancer and coronary heart disease.",
  "long": "Its best-studied form (CHIP) is defined by a somatic variant in a gene linked to blood cancer, found in at least 2% of the DNA copies in blood (a variant allele fraction of 2% or more), in a person without blood cancer. Large chromosome-level changes in blood clones, detected from array intensities, are mosaic chromosomal alterations.",
  "l1": "slide 53",
  "see": [
   "hematopoietic-stem-cell",
   "clone",
   "mosaicism",
   "variant-allele-fraction"
  ],
  "links": [
   {
    "t": "Jaiswal et al. 2014, Age-related clonal hematopoiesis associated with adverse outcomes (NEJM)",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC4306669/"
   }
  ],
  "match": [
   "clonal hematopoiesis",
   "clonal haematopoiesis"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "cells-chromosomes"
 },
 {
  "id": "clone",
  "term": "clone (of cells)",
  "aka": [
   "cell clone"
  ],
  "short": "A group of cells that all descend from one ancestral cell and therefore share its somatic mutations. In blood, a large clone is the basis of clonal hematopoiesis.",
  "see": [
   "somatic-mutation",
   "clonal-hematopoiesis"
  ],
  "match": [
   "clone"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "cells-chromosomes"
 },
 {
  "id": "cluster-plot",
  "term": "cluster plot",
  "short": "A scatter plot of the allele A intensity against the allele B intensity at one SNP, one point per person. A well-behaved SNP shows three tight clusters (AA, AB, BB) and few points between them.",
  "long": "Looking at the cluster plot of a strong association signal is a simple check that it is not a calling artifact, such as an extra cluster called differently in cases and controls.",
  "see": [
   "genotype-calling",
   "fluorescence-intensity",
   "no-call"
  ],
  "links": [
   {
    "t": "LaFramboise 2009: SNP arrays, a decade of advances (free full text)",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC2715261/"
   }
  ],
  "match": [
   "cluster plot"
  ],
  "owner": "samples-to-genotypes"
 },
 {
  "id": "cds",
  "term": "coding sequence (CDS)",
  "aka": [
   "CDS"
  ],
  "short": "The part of a transcript, from the start codon to the stop codon, that is translated into protein; it is usually split across several exons. In <em>HBB</em> it is 444 nucleotides (147 codons plus stop).",
  "l1": "slides 58, 62–63",
  "see": [
   "exon",
   "utr",
   "start-codon",
   "stop-codon"
  ],
  "match": [
   "coding sequence",
   "CDS"
  ],
  "cs": true,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "coding-strand",
  "term": "coding strand",
  "aka": [
   "sense strand"
  ],
  "short": "The DNA strand of a gene whose sequence matches its RNA (T in place of U). Codons and HGVS c. names are written on it. It can be either strand of the reference genome.",
  "long": "For a gene on the − strand, such as <em>HBB</em>, the coding sequence is the reverse complement of the reference (+ strand) sequence, so a variant’s alleles in a VCF (+ strand) and in its HGVS c. name (coding strand) are complementary.",
  "l1": "slide 62",
  "see": [
   "template-strand",
   "forward-strand",
   "reverse-strand"
  ],
  "match": [
   "coding strand",
   "sense strand"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "coding-variant",
  "term": "coding variant",
  "aka": [],
  "short": "A variant inside the protein-coding sequence of a gene: synonymous, missense, nonsense, frameshift, start-lost or in-frame. Coding sequence makes up only about 1.1–1.2% of the genome.",
  "l1": "slide 63",
  "see": [
   "noncoding-variant",
   "missense-variant",
   "variant-consequence"
  ],
  "match": [
   "coding variant"
  ],
  "owner": "variation"
 },
 {
  "id": "codominant",
  "term": "codominant",
  "aka": [
   "codominance"
  ],
  "short": "Describes two alleles that both show their effect in a heterozygote. In the ABO blood group, alleles A and B are codominant: a person with genotype A/B has blood group AB.",
  "l1": "slide 71",
  "see": [
   "dominant",
   "recessive"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Codominance",
    "u": "https://www.genome.gov/genetics-glossary/Codominance"
   }
  ],
  "match": [
   "codominant",
   "co-dominant",
   "codominance"
  ],
  "noPlural": true,
  "owner": "inheritance"
 },
 {
  "id": "codon",
  "term": "codon",
  "short": "A group of three consecutive bases in an mRNA (or in the coding sequence of the DNA) that specifies one amino acid or a stop signal. There are 64 codons.",
  "l1": "slides 62–63",
  "see": [
   "genetic-code",
   "reading-frame",
   "start-codon",
   "stop-codon"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Codon",
    "u": "https://www.genome.gov/genetics-glossary/Codon"
   }
  ],
  "match": [
   "codon"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "cohort-study",
  "term": "cohort study",
  "aka": [
   "cohort"
  ],
  "short": "A cohort is a defined group of people followed over time. A cohort study enrolls one without regard to the outcome, measures exposures and records outcomes as they occur, so it can estimate incidence.",
  "long": "It can also compare risks between exposure groups. In a prospective cohort, such as UK Biobank, exposures are measured before the outcomes happen.",
  "see": [
   "prospective-cohort-study",
   "case-control-study",
   "incidence",
   "follow-up"
  ],
  "links": [
   {
    "t": "BMJ: Epidemiology for the uninitiated, ch. 7",
    "u": "https://www.bmj.com/about-bmj/resources-readers/publications/epidemiology-uninitiated/7-longitudinal-studies"
   }
  ],
  "match": [
   "cohort study",
   "cohort"
  ],
  "cs": false,
  "auto": true,
  "owner": "uk-biobank"
 },
 {
  "id": "collider-bias",
  "term": "collider bias",
  "short": "A distorted association that appears when an analysis conditions on (selects on or adjusts for) a variable caused by both the exposure and the outcome. Taking part in a study can be such a variable.",
  "long": "Example: if smoking and poor health both make people less likely to volunteer, then among volunteers smokers tend to be healthier than smokers in general.",
  "see": [
   "selection-bias",
   "confounding"
  ],
  "links": [
   {
    "t": "Catalog of Bias: Collider bias",
    "u": "https://catalogofbias.org/biases/collider-bias/"
   },
   {
    "t": "Munafò et al. (2018), Collider scope",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC5837306/"
   }
  ],
  "match": [
   "collider bias",
   "collider"
  ],
  "cs": false,
  "auto": true,
  "owner": "uk-biobank"
 },
 {
  "id": "colocalization",
  "term": "colocalization",
  "aka": [
   "colocalization analysis"
  ],
  "short": "A test of whether two traits, for example a disease and a gene’s expression level, are associated in the same region because of one shared causal variant, rather than two different variants in LD.",
  "long": "Methods such as coloc (Giambartolomei et al. 2014) use both traits’ summary statistics for the region and report the posterior probability that a single variant underlies both signals. Colocalization with an eQTL points to a candidate gene but does not prove that the gene is causal. It is part of Session 4 of the course.",
  "l1": "slide 49",
  "see": [
   "fine-mapping",
   "eqtl",
   "causal-variant",
   "twas"
  ],
  "match": [
   "colocalization",
   "colocalization analysis"
  ],
  "noPlural": true,
  "owner": "haplotypes-ld"
 },
 {
  "id": "common-variant",
  "term": "common variant",
  "short": "A variant whose minor allele frequency is at least 5%. Common variants make up most of the differences between two unrelated genomes and are what genotyping arrays and GWAS mainly study.",
  "l1": "slide 88",
  "see": [
   "rare-variant",
   "low-frequency-variant",
   "maf"
  ],
  "links": [
   {
    "t": "1000 Genomes Project Consortium 2015: A global reference for human genetic variation",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC4750478/"
   }
  ],
  "match": [
   "common variant"
  ],
  "owner": "allele-frequencies"
 },
 {
  "id": "complementary",
  "term": "complementary base pairing",
  "aka": [
   "complementary strands"
  ],
  "short": "The pairing rule of DNA: A pairs only with T, and C only with G. Two strands whose bases pair at every position are complementary, so either strand fully determines the other.",
  "l1": "slides 57, 68",
  "see": [
   "base-pair",
   "reverse-complement",
   "strand"
  ],
  "match": [
   "complementary base pairing",
   "complementary",
   "base pairing",
   "base-pairing"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "dna"
 },
 {
  "id": "complex-trait",
  "term": "complex trait",
  "aka": [
   "multifactorial trait",
   "complex disease"
  ],
  "short": "A trait influenced by many genetic variants together with environmental factors, such as height, body mass index or coronary artery disease. Also called a multifactorial trait.",
  "l1": "slide 28 (“multifactorial causation”)",
  "see": [
   "polygenic",
   "monogenic",
   "gene-environment-interaction"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Complex Disease",
    "u": "https://www.genome.gov/genetics-glossary/Complex-Disease"
   },
   {
    "t": "MedlinePlus: What are complex or multifactorial disorders?",
    "u": "https://medlineplus.gov/genetics/understanding/mutationsanddisorders/complexdisorders/"
   }
  ],
  "match": [
   "complex trait",
   "multifactorial trait",
   "complex disease"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "compound-heterozygote",
  "term": "compound heterozygote",
  "aka": [
   "compound heterozygous"
  ],
  "short": "A person with two different disease-causing variants in the same gene, one on each copy, so neither copy works normally. For a recessive condition this has the same effect as two copies of one variant.",
  "see": [
   "recessive",
   "heterozygous",
   "loss-of-function"
  ],
  "match": [
   "compound heterozygote",
   "compound heterozygotes",
   "compound heterozygous",
   "compound heterozygosity"
  ],
  "noPlural": true,
  "owner": "inheritance"
 },
 {
  "id": "confounding",
  "term": "confounding (confounder)",
  "short": "Bias that arises when a third variable (a confounder) affects both the exposure and the outcome, so their association does not reflect the exposure’s causal effect. In genetic association studies, ancestry is the classic confounder.",
  "long": "Remedies include adjusting for the confounder (as a covariate), restricting or matching on it, and study designs that break the link, such as comparisons within families.",
  "l1": "slide 98",
  "see": [
   "population-stratification",
   "covariate"
  ],
  "match": [
   "confounding",
   "confounder"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "ancestry"
 },
 {
  "id": "consanguinity",
  "term": "consanguinity",
  "aka": [
   "consanguineous"
  ],
  "short": "Descent of two partners from a common ancestor, as with first cousins. Their children are more likely to inherit two copies of one rare recessive allele. Pedigrees show it as a double line between partners.",
  "see": [
   "pedigree",
   "recessive",
   "inbreeding-coefficient",
   "ibd"
  ],
  "match": [
   "consanguinity",
   "consanguineous"
  ],
  "noPlural": true,
  "owner": "inheritance"
 },
 {
  "id": "control",
  "term": "control",
  "short": "In a study of a disease, a person who does not meet the case definition and is used for comparison; coded 0 in a binary phenotype column.",
  "long": "In record-based studies a control has no qualifying record, which does not prove the absence of disease. Many definitions also exclude people with related diagnoses from the controls (see phecode). In a case–control study, controls are sampled from people without the disease.",
  "see": [
   "case",
   "case-definition"
  ],
  "match": [
   "control"
  ],
  "cs": false,
  "auto": false,
  "owner": "phenotypes"
 },
 {
  "id": "copy-number-variant",
  "term": "copy number variant (CNV)",
  "aka": [
   "CNV",
   "copy number variation"
  ],
  "short": "A segment of DNA, longer than 50 bases and often thousands of bases long, that is deleted or duplicated, so different people carry different numbers of copies of it.",
  "long": "Example: a protein-coding segment of the <em>LPA</em> gene (the kringle IV type 2 repeat) varies so much in copy number that it produces more than 40 sizes of the apolipoprotein(a) protein.",
  "l1": "slide 93",
  "see": [
   "structural-variant",
   "lipoprotein-a"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Copy Number Variation",
    "u": "https://www.genome.gov/genetics-glossary/Copy-Number-Variation"
   }
  ],
  "match": [
   "copy number variant",
   "copy-number variant",
   "copy number variation",
   "copy-number variation",
   "CNV"
  ],
  "owner": "variation"
 },
 {
  "id": "coronary-artery-disease",
  "term": "coronary artery disease (CAD)",
  "aka": [
   "coronary heart disease",
   "CHD",
   "CAD",
   "ischemic heart disease",
   "ischaemic heart disease"
  ],
  "short": "Narrowing of the arteries that supply the heart muscle by plaque (atherosclerosis). It can cause chest pain and heart attacks. Also called coronary heart disease (CHD); ICD-10 block I20–I25.",
  "l1": "slide 23",
  "see": [
   "atherosclerosis",
   "myocardial-infarction",
   "ldl-cholesterol"
  ],
  "links": [
   {
    "t": "MedlinePlus: Coronary Artery Disease",
    "u": "https://medlineplus.gov/coronaryarterydisease.html"
   }
  ],
  "match": [
   "coronary artery disease",
   "coronary heart disease",
   "CAD",
   "CHD"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "covariate",
  "term": "covariate",
  "short": "A variable included in a regression model alongside the variable being tested, so that its effect is accounted for. In a GWAS, typical covariates are age, sex, genotyping batch and genetic principal components.",
  "long": "Adjusting for a confounder, a variable that affects both the genotype frequencies and the outcome (for example genetic ancestry), prevents spurious associations. Adjusting for a variable that is itself affected by the outcome or by the genotype can introduce bias, so covariates are chosen before looking at results.",
  "l1": "slide 98",
  "see": [
   "confounding",
   "principal-component",
   "population-stratification"
  ],
  "match": [
   "covariate"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "the-data"
 },
 {
  "id": "cox-regression",
  "term": "Cox regression (proportional hazards model)",
  "short": "A regression model for time-to-event outcomes, including censored ones. It estimates hazard ratios: the factor by which a predictor, such as one more allele copy, multiplies the event rate among people still at risk.",
  "long": "It uses the follow-up time of censored people up to their censoring date. It assumes proportional hazards: the hazard ratio stays constant over follow-up time.",
  "see": [
   "time-to-event",
   "censoring",
   "hazard-ratio"
  ],
  "match": [
   "Cox regression",
   "Cox model",
   "Cox proportional hazards model",
   "proportional hazards model"
  ],
  "cs": false,
  "auto": true,
  "owner": "phenotypes"
 },
 {
  "id": "cpg-site",
  "term": "CpG site",
  "aka": [
   "CpG",
   "CpG island"
  ],
  "short": "A cytosine followed by a guanine on the same DNA strand (the p stands for the phosphate between them). Most CpG sites are methylated, but CpG islands (CpG-rich stretches) at many promoters usually are not.",
  "see": [
   "dna-methylation",
   "epigenetics"
  ],
  "match": [
   "CpG site",
   "CpG island",
   "CpG"
  ],
  "cs": true,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "credible-set",
  "term": "credible set",
  "aka": [
   "95% credible set"
  ],
  "short": "In fine-mapping, a small set of variants that contains a causal variant with a stated probability, often 95%. Shorter-range LD, as in samples from African populations, tends to give smaller credible sets.",
  "see": [
   "fine-mapping",
   "causal-variant"
  ],
  "match": [
   "credible set"
  ],
  "cs": false,
  "auto": true,
  "owner": "haplotypes-ld"
 },
 {
  "id": "crispr-cas9",
  "term": "CRISPR-Cas9",
  "aka": [
   "CRISPR"
  ],
  "short": "A genome-editing tool: the Cas9 enzyme, guided by a short RNA, cuts DNA at a chosen sequence. Exa-cel uses it to cut the erythroid enhancer of <em>BCL11A</em> in a patient’s blood stem cells.",
  "see": [
   "enhancer",
   "fetal-hemoglobin"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: CRISPR",
    "u": "https://www.genome.gov/genetics-glossary/CRISPR"
   }
  ],
  "match": [
   "CRISPR-Cas9",
   "CRISPR"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "genes-expression"
 },
 {
  "id": "cross-sectional-study",
  "term": "cross-sectional study",
  "short": "A study that measures exposures and outcomes at the same point in time. It estimates prevalence, but it cannot show whether the exposure came before the outcome.",
  "see": [
   "prevalence",
   "cohort-study",
   "case-control-study"
  ],
  "links": [
   {
    "t": "BMJ: Epidemiology for the uninitiated, ch. 8",
    "u": "https://www.bmj.com/about-bmj/resources-readers/publications/epidemiology-uninitiated/8-case-control-and-cross-sectional"
   }
  ],
  "match": [
   "cross-sectional study",
   "cross-sectional"
  ],
  "cs": false,
  "auto": true,
  "owner": "uk-biobank"
 },
 {
  "id": "crossover",
  "term": "crossover",
  "aka": [
   "crossover event"
  ],
  "short": "A point where the two copies of a chromosome exchange segments during meiosis. There, a transmitted chromosome switches from one of the parent’s copies to the other; a chromosome has only a few per transmission.",
  "see": [
   "recombination",
   "meiosis",
   "genetic-map",
   "centimorgan"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Crossing Over",
    "u": "https://www.genome.gov/genetics-glossary/Crossing-Over"
   }
  ],
  "match": [
   "crossover"
  ],
  "owner": "inheritance"
 },
 {
  "id": "cryptic-relatedness",
  "term": "cryptic relatedness",
  "short": "Relatedness between study participants that the investigators did not know about. It makes observations non-independent and can inflate association statistics, so quality control checks it from genotypes (for example with KING).",
  "see": [
   "kinship-coefficient",
   "ibd",
   "qc",
   "mixed-model"
  ],
  "match": [
   "cryptic relatedness"
  ],
  "noPlural": true,
  "owner": "inheritance"
 },
 {
  "id": "cytogenetic-band",
  "term": "cytogenetic band (cytoband)",
  "aka": [
   "cytoband",
   "chromosome band",
   "G-band"
  ],
  "short": "A light or dark stripe seen on a chromosome after staining. Bands are named by chromosome, arm, region and band, as in 8q24 (read “eight q two four”), giving a coarse location in the genome.",
  "long": "Numbers increase with distance from the centromere; digits after a decimal point name sub-bands (12q24.12). Light bands are richer in genes than dark bands.",
  "l1": "slide 60",
  "see": [
   "chromosome-arm",
   "ideogram",
   "karyotype"
  ],
  "links": [
   {
    "t": "MedlinePlus Genetics: How do geneticists indicate the location of a gene?",
    "u": "https://medlineplus.gov/genetics/understanding/howgeneswork/genelocation/"
   }
  ],
  "match": [
   "cytogenetic band",
   "cytoband",
   "chromosome band"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "cells-chromosomes"
 },
 {
  "id": "cytoplasm",
  "term": "cytoplasm",
  "short": "Everything inside a cell's outer membrane except the nucleus: a watery fluid that contains the mitochondria and the cell's other compartments.",
  "see": [
   "cell",
   "nucleus",
   "mitochondrion"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Cytoplasm",
    "u": "https://www.genome.gov/genetics-glossary/Cytoplasm"
   }
  ],
  "match": [
   "cytoplasm"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "cells-chromosomes"
 },
 {
  "id": "ld-d",
  "term": "D (LD coefficient)",
  "aka": [
   "δ",
   "LD coefficient"
  ],
  "short": "The basic measure of LD between two SNPs, one with alleles A and a, the other with alleles G and g: \\(D = p_{\\mathrm{AG}} - p_{\\mathrm{A}} p_{\\mathrm{G}}\\), the frequency of haplotypes carrying both A and G minus the product of the two allele frequencies, which is what that frequency would be if the alleles at the two SNPs were independent. \\(D = 0\\) means no LD; its sign and range depend on allele labels and frequencies.",
  "long": "Equivalent forms: \\(D = p_{\\mathrm{AG}} p_{\\mathrm{ag}} - p_{\\mathrm{Ag}} p_{\\mathrm{aG}} = p_{\\mathrm{A}} p_{\\mathrm{a}} [P(\\mathrm{G} \\mid \\mathrm{A}) - P(\\mathrm{G} \\mid \\mathrm{a})]\\). The last form shows that \\(D\\) is zero when allele G is equally common on haplotypes carrying A and on haplotypes carrying a, and that its sign says which of the two carries G more often. Under random mating, \\(D\\) is multiplied by \\(1 - \\theta\\) each generation, where \\(\\theta\\) is the recombination fraction between the SNPs.",
  "l1": "slides 118–120, 123–124",
  "see": [
   "d-prime",
   "r-squared",
   "ld"
  ],
  "match": [
   "LD coefficient"
  ],
  "cs": false,
  "auto": true,
  "owner": "haplotypes-ld"
 },
 {
  "id": "data-coding",
  "term": "data-coding",
  "short": "In UK Biobank, the lookup table that gives the meaning of each code stored in a categorical data-field, including special values such as −1 “Do not know” and −3 “Prefer not to answer”.",
  "see": [
   "data-field",
   "self-report"
  ],
  "match": [
   "data-coding",
   "data coding"
  ],
  "cs": false,
  "auto": true,
  "owner": "phenotypes"
 },
 {
  "id": "data-field",
  "term": "data-field (Field ID)",
  "aka": [
   "Field ID"
  ],
  "short": "In UK Biobank, one question, measurement or derived variable, identified by a numeric Field ID; for example, Field 21001 is body mass index. One data-field can fill several columns, one per instance and array index.",
  "see": [
   "instance",
   "array-index",
   "data-coding",
   "data-showcase"
  ],
  "match": [
   "data-field",
   "data field",
   "Field ID"
  ],
  "cs": false,
  "auto": true,
  "owner": "phenotypes"
 },
 {
  "id": "dbsnp",
  "term": "dbSNP",
  "aka": [],
  "short": "NCBI's public database of human genetic variants. It assigns rsIDs and lists each variant's alleles and positions on GRCh37 and GRCh38; build 157 holds about 1.2 billion reference SNP records.",
  "l1": "slides 68, 88",
  "see": [
   "rsid",
   "gnomad",
   "clinvar"
  ],
  "links": [
   {
    "t": "dbSNP (NCBI)",
    "u": "https://www.ncbi.nlm.nih.gov/snp/"
   }
  ],
  "match": [
   "dbSNP"
  ],
  "owner": "variation"
 },
 {
  "id": "de-novo-mutation",
  "term": "de novo mutation",
  "aka": [
   "de novo variant",
   "DNM"
  ],
  "short": "A variant present in a child but in neither parent: it arose in a parent's egg or sperm lineage. Whole-genome studies of families find about 70 per child, roughly 80% of them from the father.",
  "long": "In 1,548 Icelandic families the average was 70.3 de novo mutations per child; each extra year of the father's age added about 1.5, and each extra year of the mother's age about 0.4 (Jónsson et al. 2017).",
  "see": [
   "mutation",
   "germline",
   "trio"
  ],
  "links": [
   {
    "t": "Jónsson et al. 2017, Nature (1,548 trios)",
    "u": "https://doi.org/10.1038/nature24018"
   }
  ],
  "match": [
   "de novo mutation",
   "de novo variant"
  ],
  "owner": "variation"
 },
 {
  "id": "death-registry",
  "term": "death registry",
  "short": "The national record of deaths, with the date and the underlying and contributing causes coded in ICD-10. UK Biobank links it for all participants (Data-Fields 40000, 40001 and 40002).",
  "see": [
   "record-linkage",
   "cancer-registry"
  ],
  "match": [
   "death registry",
   "death registration",
   "death records"
  ],
  "cs": false,
  "auto": true,
  "owner": "uk-biobank"
 },
 {
  "id": "degree-of-relationship",
  "term": "degree of relationship",
  "aka": [
   "first-degree relative",
   "second-degree relative",
   "third-degree relative"
  ],
  "short": "A grouping of relatives by expected kinship. First-degree: parents, children, full siblings (kinship 1/4). Second-degree: half siblings, grandparents, aunts and uncles (1/8). Third-degree: first cousins (1/16). Each degree halves the expected kinship.",
  "see": [
   "kinship-coefficient",
   "ibd"
  ],
  "match": [
   "degree of relationship",
   "first-degree relative",
   "second-degree relative",
   "third-degree relative",
   "first-degree",
   "second-degree",
   "third-degree"
  ],
  "owner": "inheritance"
 },
 {
  "id": "derived-allele",
  "term": "derived allele",
  "aka": [],
  "short": "The allele that arose by mutation from the ancestral allele. It may be rare or common; at rs1427407, for example, the reference-genome allele T is the derived one.",
  "see": [
   "ancestral-allele",
   "mutation"
  ],
  "match": [
   "derived allele"
  ],
  "owner": "variation"
 },
 {
  "id": "differential-missingness",
  "term": "differential missingness",
  "aka": [
   "non-random missingness by case status"
  ],
  "short": "Missingness that differs between groups, especially cases and controls, for example because they were genotyped in different batches. It can create false associations, so variant QC tests it (PLINK <code>--test-missing</code>) and removes failing variants.",
  "long": "Anderson et al. remove SNPs whose missingness differs between cases and controls with P &lt; 10<sup>−5</sup>. It is not among the steps of the Session 1 practical, which notes that its steps are not an exhaustive production QC protocol.",
  "see": [
   "missingness",
   "batch-effect",
   "variant-qc",
   "case-control-study"
  ],
  "links": [
   {
    "t": "Anderson et al. 2010: Data quality control in genetic case-control association studies",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3025522/"
   },
   {
    "t": "PLINK 1.9: file formats (.imiss, .lmiss, .missing, .sexcheck)",
    "u": "https://www.cog-genomics.org/plink/1.9/formats"
   }
  ],
  "match": [
   "differential missingness"
  ],
  "noPlural": true,
  "owner": "samples-to-genotypes"
 },
 {
  "id": "diploid",
  "term": "diploid",
  "short": "Having two complete sets of chromosomes, one from each parent. Human body cells are diploid, with 2 × 23 = 46 chromosomes, so they carry two alleles at each autosomal position.",
  "l1": "slide 72",
  "see": [
   "haploid",
   "homologous-chromosomes"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Diploid",
    "u": "https://www.genome.gov/genetics-glossary/Diploid"
   }
  ],
  "match": [
   "diploid"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "cells-chromosomes"
 },
 {
  "id": "dizygotic-twins",
  "term": "dizygotic (fraternal) twins",
  "aka": [
   "DZ twins",
   "fraternal twins"
  ],
  "short": "Twins who develop from two eggs fertilized by two sperm. Genetically they are ordinary full siblings born at the same time, sharing on average half their genome identical by descent.",
  "see": [
   "monozygotic-twins",
   "twin-study",
   "ibd"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Fraternal Twins",
    "u": "https://www.genome.gov/genetics-glossary/Fraternal-Twins"
   }
  ],
  "match": [
   "dizygotic twins",
   "dizygotic twin",
   "dizygotic",
   "fraternal twins",
   "fraternal twin",
   "DZ twins",
   "DZ twin"
  ],
  "noPlural": true,
  "owner": "inheritance"
 },
 {
  "id": "dna",
  "term": "DNA",
  "aka": [
   "deoxyribonucleic acid"
  ],
  "short": "Deoxyribonucleic acid, the molecule that carries genetic information as the order of its bases. Two strands of nucleotides pair base by base (A with T, C with G) and wind into a double helix.",
  "long": "Each strand is read from its 5′ end to its 3′ end. The two strands run in opposite directions, so each is the reverse complement of the other. One copy of the human genome is about 3.1 billion base pairs of DNA.",
  "l1": "slides 57, 59–63",
  "see": [
   "strand",
   "nucleotide",
   "base-pair",
   "double-helix"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Deoxyribonucleic acid (DNA)",
    "u": "https://www.genome.gov/genetics-glossary/Deoxyribonucleic-Acid"
   }
  ],
  "match": [
   "DNA",
   "deoxyribonucleic acid"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "dna"
 },
 {
  "id": "dna-extraction",
  "term": "DNA extraction",
  "short": "The laboratory process that breaks cells open, removes proteins and other cell material, and leaves purified DNA in a small volume of liquid, ready for genotyping or sequencing.",
  "long": "The amount and quality of extracted DNA affect every later step: low or degraded DNA gives weak array signals and many no-calls. For about 3% of UK Biobank participants not enough DNA could be extracted, so they have no genotypes.",
  "see": [
   "buffy-coat",
   "genotyping",
   "call-rate"
  ],
  "links": [
   {
    "t": "UK Biobank: DNA processing, from sample to genotyping laboratory (v2.0, PDF)",
    "u": "https://biobank.ndph.ox.ac.uk/ukb/ukb/docs/ukb_dna_processing.pdf"
   }
  ],
  "match": [
   "DNA extraction"
  ],
  "noPlural": true,
  "owner": "samples-to-genotypes"
 },
 {
  "id": "dna-methylation",
  "term": "DNA methylation",
  "short": "Addition of a methyl group to a cytosine in DNA, in humans mostly at CpG sites. Methylation of a promoter usually goes with the gene not being transcribed; the pattern is copied when cells divide.",
  "long": "About 70–80% of CpG sites in the human genome are methylated, but the CpG islands at many promoters usually are not. Methylation can be measured in blood DNA with arrays or sequencing.",
  "l1": "slide 63",
  "see": [
   "cpg-site",
   "epigenetics"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Methylation",
    "u": "https://www.genome.gov/genetics-glossary/Methylation"
   }
  ],
  "match": [
   "DNA methylation",
   "methylation",
   "methylated"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "dna-polymerase",
  "term": "DNA polymerase",
  "short": "The enzyme that builds DNA during replication. It reads a template strand and adds nucleotides one at a time by the pairing rule, extending the new strand only at its 3′ end.",
  "see": [
   "dna-replication",
   "five-prime-three-prime"
  ],
  "match": [
   "DNA polymerase"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "dna"
 },
 {
  "id": "dna-replication",
  "term": "DNA replication",
  "short": "The copying of DNA before a cell divides. The two strands separate and each is a template: DNA polymerase builds a partner strand by the pairing rule, growing 5′→3′. Each copy keeps one original strand.",
  "long": "Copying is very accurate, and most errors are corrected at once. An error that escapes correction becomes a mutation, the source of genetic variation.",
  "l1": "slide 57 (“read or copied in the 5′ to 3′ direction”)",
  "see": [
   "dna-polymerase",
   "mutation",
   "strand"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: DNA replication",
    "u": "https://www.genome.gov/genetics-glossary/DNA-Replication"
   }
  ],
  "match": [
   "DNA replication"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "dna"
 },
 {
  "id": "dna-sequence",
  "term": "DNA sequence",
  "short": "The order of bases along a DNA strand, written 5′ to 3′ as a string of the letters A, C, G and T, for example ACGTTA. The term also means any stretch of DNA.",
  "l1": "slides 57–58, 63",
  "see": [
   "base",
   "reverse-complement",
   "fasta"
  ],
  "match": [
   "DNA sequence"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "dna"
 },
 {
  "id": "sequencing",
  "term": "DNA sequencing",
  "aka": [
   "sequencing"
  ],
  "short": "Determining the order of bases in DNA directly. In genetic studies it gives genotypes at almost every position, including rare variants that arrays and imputation miss.",
  "long": "Large cohorts use short-read sequencing of the exome (WES) or the whole genome (WGS); long-read sequencing is used for repeats, structural variants and phase. The cost of sequencing a human-sized genome fell from about $95 million in 2001 to about $525 in 2022 (NHGRI).",
  "l1": "slides 15, 114",
  "see": [
   "short-read-sequencing",
   "long-read-sequencing",
   "wes",
   "wgs",
   "variant-calling"
  ],
  "links": [
   {
    "t": "NHGRI: DNA Sequencing Fact Sheet",
    "u": "https://www.genome.gov/about-genomics/fact-sheets/DNA-Sequencing-Fact-Sheet"
   },
   {
    "t": "NHGRI: DNA Sequencing Costs: Data",
    "u": "https://www.genome.gov/about-genomics/fact-sheets/DNA-Sequencing-Costs-Data"
   }
  ],
  "match": [
   "DNA sequencing",
   "sequencing"
  ],
  "noPlural": true,
  "owner": "samples-to-genotypes"
 },
 {
  "id": "dnase-hypersensitive-site",
  "term": "DNase I hypersensitive site (DHS)",
  "aka": [
   "DHS"
  ],
  "short": "A short stretch of DNA that the enzyme DNase I cuts easily because it is not covered by nucleosomes. Such open sites mark active promoters, enhancers and other regulatory elements.",
  "see": [
   "chromatin-accessibility",
   "regulatory-element",
   "atac-seq"
  ],
  "links": [
   {
    "t": "ENCODE SCREEN: candidate regulatory elements",
    "u": "https://screen.encodeproject.org/"
   }
  ],
  "match": [
   "DNase I hypersensitive site",
   "DNase I hypersensitivity",
   "DHS"
  ],
  "cs": true,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "dominant",
  "term": "dominant",
  "aka": [
   "autosomal dominant"
  ],
  "short": "Describes an allele whose effect on a phenotype shows when a person carries one copy, so genotypes with 1 and 2 copies have the same or nearly the same phenotype. Huntington disease is an example.",
  "long": "Dominance describes an allele's relation to a particular phenotype, not the allele itself: the sickle cell allele is recessive for sickle cell disease but one copy already protects against severe malaria.",
  "l1": "slides 71, 83",
  "see": [
   "recessive",
   "codominant",
   "penetrance",
   "additive-model"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Dominant",
    "u": "https://www.genome.gov/genetics-glossary/Dominant"
   },
   {
    "t": "NHGRI Talking Glossary: Autosomal Dominant",
    "u": "https://www.genome.gov/genetics-glossary/Autosomal-Dominant"
   }
  ],
  "match": [
   "dominant",
   "autosomal dominant"
  ],
  "noPlural": true,
  "owner": "inheritance"
 },
 {
  "id": "dosage",
  "term": "dosage (imputed dosage)",
  "aka": [
   "imputed dosage",
   "expected allele count"
  ],
  "short": "The expected number of copies of an allele given the genotype probabilities: \\(0 \\cdot P(0) + 1 \\cdot P(1) + 2 \\cdot P(2) = P(1) + 2P(2)\\), a number between 0 and 2. Imputed genotypes are usually analyzed as dosages, which keep the imputation uncertainty.",
  "long": "A dosage is an expected value, not a measurement: every person carries 0, 1 or 2 copies. Association tests can use it in a regression in place of a 0/1/2 count. A hard call keeps only the most probable genotype instead.",
  "see": [
   "genotype-probability",
   "hard-call",
   "allele-dosage",
   "info-score",
   "bgen"
  ],
  "links": [
   {
    "t": "IMPUTE2 documentation (output files and the info metric)",
    "u": "https://mathgen.stats.ox.ac.uk/impute/impute_v2.html"
   },
   {
    "t": "Das et al. 2016: Next-generation genotype imputation service and methods",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC5157836/"
   }
  ],
  "match": [
   "dosage",
   "imputed dosage"
  ],
  "owner": "samples-to-genotypes"
 },
 {
  "id": "double-helix",
  "term": "double helix",
  "aka": [
   "double helices"
  ],
  "short": "The shape of double-stranded DNA: two strands wound around a common axis, with the base pairs stacked inside. Its common form is about 2 nm wide, with about 10.5 base pairs per turn.",
  "l1": "slide 68 (drawing)",
  "see": [
   "strand",
   "base-pair"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Double helix",
    "u": "https://www.genome.gov/genetics-glossary/Double-Helix"
   }
  ],
  "match": [
   "double helix",
   "double helices"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "dna"
 },
 {
  "id": "duplicate-sample",
  "term": "duplicate sample",
  "short": "The same person's DNA genotyped twice, on purpose (as a control) or by mistake. Duplicates agree at nearly every SNP (PI_HAT near 1), as do identical twins; one of each pair is removed before analysis.",
  "long": "Duplicates are found with the same identity-by-descent estimates used for relatives (PLINK <code>--genome</code>); Anderson et al. flag pairs with PI_HAT above 0.98. UK Biobank excluded 835 duplicate samples before release.",
  "see": [
   "pi-hat",
   "ibd",
   "monozygotic-twins",
   "kinship-coefficient",
   "sample-qc"
  ],
  "links": [
   {
    "t": "PLINK 1.9: identity by descent (--genome)",
    "u": "https://www.cog-genomics.org/plink/1.9/ibd"
   },
   {
    "t": "Anderson et al. 2010: Data quality control in genetic case-control association studies",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3025522/"
   }
  ],
  "match": [
   "duplicate sample"
  ],
  "owner": "samples-to-genotypes"
 },
 {
  "id": "d-prime",
  "term": "D′ (D prime)",
  "aka": [
   "D'",
   "D prime",
   "|D′|"
  ],
  "short": "\\(D\\) divided by its largest possible value given the allele frequencies; \\(|D'|\\) lies between 0 and 1. It equals 1 when one of the four two-SNP haplotypes is absent, which is common for rare alleles.",
  "long": "\\(D' = D/D_{\\max}\\), where \\(D_{\\max}\\) is the largest \\(|D|\\) that the allele frequencies allow for a \\(D\\) of that sign: \\(\\min(p_{\\mathrm{A}} p_{\\mathrm{g}}, p_{\\mathrm{a}} p_{\\mathrm{G}})\\) if \\(D &gt; 0\\) and \\(\\min(p_{\\mathrm{A}} p_{\\mathrm{G}}, p_{\\mathrm{a}} p_{\\mathrm{g}})\\) if \\(D &lt; 0\\). \\(|D'| = 1\\) means that at least one of the four haplotypes is absent, which is read as no evidence of historical recombination between the SNPs; it says nothing about how well one SNP predicts the other (that is <a href=\\\"glossary.html#r-squared\\\">\\(r^2\\)</a>). Estimates of \\(|D'|\\) are inflated in small samples and for rare alleles.",
  "l1": "slides 95, 120–124",
  "see": [
   "ld-d",
   "r-squared",
   "ld-block"
  ],
  "match": [
   "D′",
   "D'",
   "D prime"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "haplotypes-ld"
 },
 {
  "id": "effect-allele",
  "term": "effect allele",
  "aka": [
   "tested allele",
   "coded allele",
   "counted allele",
   "A1 (PLINK)"
  ],
  "short": "The allele whose copies are counted (0, 1 or 2) in the genotype coding; a reported effect size is the change in the trait per copy of it. Analysts or software defaults choose it.",
  "long": "PLINK counts the minor allele in your data by default (PLINK 1.9 calls it A1); add <code>--keep-allele-order</code> (PLINK 1.9) or <code>omit-ref</code> (PLINK 2 <code>--glm</code>) to count the ALT allele instead.",
  "see": [
   "other-allele",
   "allele-dosage",
   "effect-size",
   "risk-allele"
  ],
  "match": [
   "effect allele",
   "tested allele",
   "coded allele",
   "counted allele"
  ],
  "owner": "variation"
 },
 {
  "id": "effect-size",
  "term": "effect size",
  "short": "How much a genetic variant changes a trait. For a quantitative trait it is usually the per-allele slope \\(\\beta\\), in trait units or standard-deviation units; for a binary trait, the odds ratio or its logarithm.",
  "see": [
   "beta",
   "odds-ratio",
   "variance-explained"
  ],
  "match": [
   "effect size"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "effective-number-of-tests",
  "term": "effective number of independent tests",
  "aka": [
   "effective number of tests"
  ],
  "short": "The number of independent tests with the same family-wise error rate as a set of correlated tests. For common variants in samples labeled European, LD makes it about one million, hence 5 × 10<sup>−8</sup>.",
  "long": "Estimates: about 150 tests per 500 kb in the HapMap CEU and CHB+JPT samples and about 350 in YRI (HapMap 2005); \"a million independent tests genomewide in Europeans, and twice that number in Africans\" (Pe'er et al. 2008).",
  "l1": "slide 85",
  "see": [
   "genome-wide-significance",
   "multiple-testing",
   "ld",
   "family-wise-error-rate"
  ],
  "match": [
   "effective number of independent tests",
   "effective number of tests"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "haplotypes-ld"
 },
 {
  "id": "effective-population-size",
  "term": "effective population size (N<sub>e</sub>)",
  "aka": [
   "Ne",
   "N_e"
  ],
  "short": "The size of an idealized, randomly mating population that would show as much drift as the real one. A smaller \\(N_{\\mathrm{e}}\\) means more drift and longer-range LD: for two loci with recombination fraction \\(\\theta\\), the expected \\(r^2\\) is about \\(1/(1 + 4N_{\\mathrm{e}}\\theta)\\), which depends only on the product \\(N_{\\mathrm{e}}\\theta\\).",
  "long": "c is the recombination fraction between the two loci; the approximation is due to Sved (1971).",
  "see": [
   "genetic-drift",
   "ld",
   "bottleneck"
  ],
  "match": [
   "effective population size"
  ],
  "cs": false,
  "auto": true,
  "owner": "haplotypes-ld"
 },
 {
  "id": "eid",
  "term": "eid (participant ID)",
  "aka": [
   "encoded participant identifier",
   "participant ID"
  ],
  "short": "UK Biobank's participant identifier: the number that labels one participant in every table and genotype file of a project. Each access application receives its own set of eids, so they cannot be matched across projects.",
  "long": "On the Research Analysis Platform an eid is a 7-digit number, typically between 1,000,000 and 6,000,000. The participant table has one row per eid, and the same eids appear in the record tables, in PLINK <code>.fam</code> and BGEN <code>.sample</code> files and in pVCF headers, so joining on eid lines up one person's data. When participants withdraw, their data are removed from projects, and in genotype files their IDs are replaced by placeholders such as W000001.",
  "see": [
   "data-showcase",
   "rap",
   "participant-withdrawal",
   "genotype-matrix"
  ],
  "links": [
   {
    "t": "UKB-RAP documentation: Data structure",
    "u": "https://dnanexus.gitbook.io/uk-biobank-rap/getting-started/data-structure"
   },
   {
    "t": "UK Biobank data access guide: withdrawn participants",
    "u": "https://uk-biobank.gitbook.io/data-access-guide/withdrawn-participants"
   }
  ],
  "match": [
   "eid"
  ],
  "cs": true,
  "auto": true,
  "noPlural": false,
  "owner": "the-data"
 },
 {
  "id": "electronic-health-record",
  "term": "electronic health record (EHR)",
  "short": "A digital record of a person’s health care, such as diagnoses, procedures, prescriptions and test results, created in routine care, not for research. Its contents depend on who sought care and how it was coded.",
  "see": [
   "record-linkage",
   "hes",
   "primary-care-data",
   "icd-10"
  ],
  "match": [
   "electronic health record",
   "EHR"
  ],
  "cs": false,
  "auto": true,
  "owner": "uk-biobank"
 },
 {
  "id": "encode",
  "term": "ENCODE (Encyclopedia of DNA Elements)",
  "aka": [
   "Encyclopedia of DNA Elements",
   "ENCODE project"
  ],
  "short": "A research project that maps biochemical activity along the human genome, such as transcription, open chromatin and protein binding, in many cell types. Its 2020 registry lists 926,535 candidate regulatory elements covering 7.9% of it.",
  "long": "ENCODE combines assays such as RNA-seq, DNase-seq, ATAC-seq and ChIP-seq (which finds where a chosen protein binds DNA) across many cell types and tissues. Its registry of candidate cis-regulatory elements can be searched in SCREEN; later versions of the registry list more elements. Lecture 1 slide 92 shows HapMap data from the ENCODE pilot regions, about 1% of the genome.",
  "l1": "slide 92",
  "see": [
   "regulatory-element",
   "chromatin-accessibility",
   "dnase-hypersensitive-site",
   "atac-seq",
   "functional-genomics"
  ],
  "links": [
   {
    "t": "ENCODE portal",
    "u": "https://www.encodeproject.org/"
   },
   {
    "t": "ENCODE SCREEN: candidate regulatory elements",
    "u": "https://screen.encodeproject.org/"
   },
   {
    "t": "ENCODE Project Consortium 2020: Expanded encyclopaedias of DNA elements in the human and mouse genomes (Nature, free text)",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC7410828/"
   }
  ],
  "match": [
   "ENCODE",
   "Encyclopedia of DNA Elements"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "genes-expression"
 },
 {
  "id": "enhancer",
  "term": "enhancer",
  "short": "A regulatory element that binds transcription factors and increases a gene’s transcription. It can lie up to about 1 Mb from the gene, even inside another gene, and contacts the promoter through DNA looping.",
  "long": "Many enhancers are active in only some cell types. The erythroid enhancer of <em>BCL11A</em>, in its second intron, is active only in red-cell precursors; GWAS variants there change fetal hemoglobin levels.",
  "l1": "slides 62–63",
  "see": [
   "promoter",
   "transcription-factor",
   "regulatory-element",
   "cis-trans",
   "silencer"
  ],
  "links": [
   {
    "t": "Learn.Genetics: Anatomy of a gene",
    "u": "https://learn.genetics.utah.edu/content/basics/geneanatomy/"
   },
   {
    "t": "MedlinePlus Genetics: Can genes be turned on and off in cells?",
    "u": "https://medlineplus.gov/genetics/understanding/howgeneswork/geneonoff/"
   }
  ],
  "match": [
   "enhancer"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "vep",
  "term": "Ensembl Variant Effect Predictor (VEP)",
  "aka": [
   "VEP"
  ],
  "short": "A widely used tool from Ensembl that annotates each variant with its consequence for every overlapping gene, its HGVS names and known population frequencies.",
  "see": [
   "variant-consequence",
   "hgvs",
   "gnomad"
  ],
  "links": [
   {
    "t": "Ensembl VEP",
    "u": "https://www.ensembl.org/info/docs/tools/vep/index.html"
   }
  ],
  "match": [
   "Variant Effect Predictor",
   "VEP"
  ],
  "owner": "variation"
 },
 {
  "id": "enzyme",
  "term": "enzyme",
  "short": "A protein (or RNA) that speeds up a specific chemical reaction without being used up. ALDH2, for example, converts acetaldehyde from alcohol breakdown into acetate; MTHFR acts in folate metabolism.",
  "l1": "slide 74",
  "see": [
   "protein",
   "gene-symbol"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Enzyme",
    "u": "https://www.genome.gov/genetics-glossary/Enzyme"
   }
  ],
  "match": [
   "enzyme"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "epidemiology",
  "term": "epidemiology",
  "short": "The study of how often health-related states (diseases, measurements, behaviors) occur in specified populations and what determines them, and the use of that knowledge to control health problems.",
  "long": "Genetic epidemiology adds genetic variation to the determinants it studies. Most of UK Biobank's design follows from epidemiological ideas: a defined sampling frame, exposures measured before outcomes, and follow-up through health records.",
  "l1": "slide 11",
  "see": [
   "genetic-epidemiology",
   "cohort-study",
   "exposure",
   "outcome"
  ],
  "links": [
   {
    "t": "CDC: Principles of Epidemiology, Lesson 1 (archived)",
    "u": "https://archive.cdc.gov/www_cdc_gov/csels/dsepd/ss1978/lesson1/section7.html"
   }
  ],
  "match": [
   "epidemiology",
   "epidemiological",
   "epidemiologic"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "uk-biobank"
 },
 {
  "id": "epigenetics",
  "term": "epigenetics",
  "aka": [
   "epigenetic marks"
  ],
  "short": "Chemical marks on DNA or histones, such as DNA methylation, that change gene activity without changing the DNA sequence and that persist through cell division. They help each cell type keep its identity.",
  "l1": "slide 63",
  "see": [
   "dna-methylation",
   "histone",
   "chromatin-accessibility"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Epigenetics",
    "u": "https://www.genome.gov/genetics-glossary/Epigenetics"
   },
   {
    "t": "MedlinePlus Genetics: What is epigenetics?",
    "u": "https://medlineplus.gov/genetics/understanding/howgeneswork/epigenome/"
   }
  ],
  "match": [
   "epigenetics",
   "epigenetic"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "genes-expression"
 },
 {
  "id": "ethnicity",
  "term": "ethnicity",
  "short": "A sociopolitically constructed system for classifying people by claims of shared heritage, often based on cultural similarities such as language, religion or beliefs (NASEM 2023). Usually self-identified, as in UK Biobank field 21000.",
  "see": [
   "race",
   "population-descriptor"
  ],
  "match": [
   "ethnicity",
   "ethnic background",
   "ethnic group"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "ancestry"
 },
 {
  "id": "eugenics",
  "term": "eugenics",
  "short": "A movement, named by Francis Galton in 1883, to “improve” human populations by controlling who had children. It led to forced sterilization in the United States and elsewhere, and to mass murder in Nazi Germany.",
  "l1": "slides 40–41",
  "see": [
   "race",
   "population-descriptor"
  ],
  "links": [
   {
    "t": "NHGRI fact sheet: Eugenics and Scientific Racism",
    "u": "https://www.genome.gov/about-genomics/fact-sheets/Eugenics-and-Scientific-Racism"
   }
  ],
  "match": [
   "eugenics",
   "eugenicist"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "ancestry"
 },
 {
  "id": "exome",
  "term": "exome",
  "short": "The set of all exons in the genome: the parts of genes that remain in mature RNA. Its protein-coding part is only about 1% of the genome.",
  "long": "Whole-exome sequencing reads the exome. In UK Biobank's first 150,119 genomes, exome sequencing missed 10.7% of the variants in coding exons and most of those in untranslated regions, which genome sequencing reads.",
  "see": [
   "exon",
   "wes",
   "protein-coding-gene"
  ],
  "links": [
   {
    "t": "MedlinePlus: What are whole exome sequencing and whole genome sequencing?",
    "u": "https://medlineplus.gov/genetics/understanding/testing/sequencing/"
   }
  ],
  "match": [
   "exome"
  ],
  "owner": "samples-to-genotypes"
 },
 {
  "id": "exon",
  "term": "exon",
  "short": "A segment of a gene that is kept in the mature mRNA after splicing. Exons hold the coding sequence and the untranslated regions; together, the exons of all genes make up the exome.",
  "l1": "slide 62",
  "see": [
   "intron",
   "splicing",
   "cds",
   "utr"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Exon",
    "u": "https://www.genome.gov/genetics-glossary/Exon"
   }
  ],
  "match": [
   "exon"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "em-algorithm",
  "term": "expectation–maximization (EM) algorithm",
  "aka": [
   "EM algorithm",
   "EM"
  ],
  "short": "An iterative method for maximum-likelihood estimation with missing data. For haplotypes: guess the haplotype frequencies, compute expected haplotype counts given each person's genotypes, re-estimate the frequencies, and repeat until they stop changing.",
  "l1": "slides 114, 117",
  "see": [
   "phasing",
   "haplotype",
   "phase"
  ],
  "match": [
   "EM algorithm",
   "expectation–maximization",
   "expectation-maximization"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "haplotypes-ld"
 },
 {
  "id": "exposure",
  "term": "exposure",
  "short": "In epidemiology, any factor whose effect on an outcome is studied: a behavior (smoking), a measurement (LDL cholesterol), a treatment (a statin) or a genotype. In a GWAS, each variant is in turn the exposure.",
  "l1": "slide 22",
  "see": [
   "outcome",
   "confounding"
  ],
  "match": [
   "exposure"
  ],
  "cs": false,
  "auto": true,
  "owner": "uk-biobank"
 },
 {
  "id": "eqtl",
  "term": "expression quantitative trait locus (eQTL)",
  "aka": [
   "eQTL",
   "cis-eQTL",
   "trans-eQTL"
  ],
  "short": "A genetic variant whose genotype is associated with the expression level of a gene. Cis-eQTLs lie near the gene (GTEx: within 1 Mb of its start site); trans-eQTLs lie elsewhere in the genome.",
  "long": "eQTLs are found with the same regression as a GWAS, with one gene's normalized expression as the outcome and genotype (0, 1, 2) as the predictor, plus covariates such as sex, genotype principal components and hidden technical factors.",
  "l1": "slide 25",
  "see": [
   "cis-trans",
   "gtex",
   "twas",
   "pqtl"
  ],
  "links": [
   {
    "t": "GTEx Portal",
    "u": "https://gtexportal.org/home/"
   }
  ],
  "match": [
   "eQTL",
   "cis-eQTL",
   "trans-eQTL",
   "expression quantitative trait locus",
   "expression quantitative trait loci"
  ],
  "cs": true,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "familial-aggregation",
  "term": "familial aggregation",
  "short": "The observation that a trait or disease is more common among relatives of affected people than in the general population. It suggests, but does not prove, a genetic contribution, because relatives also share environments.",
  "l1": "slide 29",
  "see": [
   "heritability",
   "twin-study",
   "pedigree"
  ],
  "match": [
   "familial aggregation"
  ],
  "noPlural": true,
  "owner": "inheritance"
 },
 {
  "id": "familial-hypercholesterolemia",
  "term": "familial hypercholesterolemia (FH)",
  "aka": [
   "FH",
   "familial hypercholesterolaemia"
  ],
  "short": "An inherited condition with very high LDL cholesterol from birth, caused by variants in <em>LDLR</em>, <em>APOB</em>, <em>LDLRAP1</em> or <em>PCSK9</em>; about 1 in 200–250 people. Two variant copies cause a more severe form.",
  "see": [
   "monogenic",
   "ldl-cholesterol",
   "dominant"
  ],
  "links": [
   {
    "t": "MedlinePlus Genetics: Familial hypercholesterolemia",
    "u": "https://medlineplus.gov/genetics/condition/familial-hypercholesterolemia/"
   }
  ],
  "match": [
   "familial hypercholesterolemia",
   "familial hypercholesterolaemia"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "family-wise-error-rate",
  "term": "family-wise error rate (FWER)",
  "aka": [
   "familywise error rate",
   "family-wise false-positive rate"
  ],
  "short": "The probability of at least one false positive among a set (family) of tests. Genome-wide significance, 5 × 10<sup>−8</sup>, is set to keep it at about 0.05 across a GWAS of common variants.",
  "see": [
   "multiple-testing",
   "bonferroni-correction",
   "genome-wide-significance",
   "effective-number-of-tests"
  ],
  "match": [
   "family-wise error rate",
   "familywise error rate",
   "family-wise false-positive rate",
   "FWER"
  ],
  "noPlural": true,
  "owner": "the-data"
 },
 {
  "id": "fasta",
  "term": "FASTA format",
  "short": "A plain-text format for sequences: a header line starting with “&gt;”, followed by the sequence as letters (A, C, G, T, N). Reference genomes are distributed as FASTA files, one record per chromosome.",
  "see": [
   "reference-genome",
   "dna-sequence"
  ],
  "links": [
   {
    "t": "NCBI: FASTA format",
    "u": "https://www.ncbi.nlm.nih.gov/genbank/fastaformat/"
   }
  ],
  "match": [
   "FASTA"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "dna"
 },
 {
  "id": "fetal-hemoglobin",
  "term": "fetal hemoglobin (HbF)",
  "aka": [
   "HbF"
  ],
  "short": "The main hemoglobin before birth, with two α and two γ chains (α2γ2). It falls to 1–2% of hemoglobin after infancy; people who keep more HbF have milder sickle cell disease and β-thalassemia.",
  "l1": "slide 17",
  "see": [
   "hemoglobin",
   "hemoglobinopathy",
   "beta-thalassemia"
  ],
  "links": [
   {
    "t": "MedlinePlus Genetics: HBB gene",
    "u": "https://medlineplus.gov/genetics/gene/hbb/"
   }
  ],
  "match": [
   "fetal hemoglobin",
   "foetal haemoglobin",
   "HbF"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "genes-expression"
 },
 {
  "id": "fine-mapping",
  "term": "fine-mapping",
  "aka": [
   "statistical fine-mapping"
  ],
  "short": "Narrowing an association signal to the variants most likely to be causal. Statistical fine-mapping combines association statistics with the region’s LD matrix, giving each variant a probability of being causal and reporting a credible set.",
  "long": "Resolution is better where LD is shorter-range, for example when samples from African populations are included. Fine-mapping is Session 4 of the course.",
  "l1": "slides 37, 49",
  "see": [
   "credible-set",
   "causal-variant",
   "lead-variant",
   "ld-reference-panel"
  ],
  "links": [
   {
    "t": "Schaid, Chen & Larson 2018, statistical fine-mapping review",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC6050137/"
   }
  ],
  "match": [
   "fine-mapping",
   "fine mapping"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "haplotypes-ld"
 },
 {
  "id": "first-occurrence",
  "term": "first-occurrence fields",
  "aka": [
   "First Occurrences (UK Biobank category 1712)"
  ],
  "short": "UK Biobank fields giving, for each of more than 1,000 3-character ICD-10 codes, the first date it or a mapped code appears in primary care, hospital, death or self-report data, and the source.",
  "see": [
   "icd-10",
   "algorithmically-defined-outcome",
   "case-definition"
  ],
  "links": [
   {
    "t": "UK Biobank: First occurrence of health outcomes defined by 3-character ICD10 code (PDF)",
    "u": "https://biobank.ndph.ox.ac.uk/showcase/ukb/docs/first_occurrences_outcomes.pdf"
   }
  ],
  "match": [
   "first-occurrence field",
   "first occurrence field"
  ],
  "cs": false,
  "auto": true,
  "owner": "phenotypes"
 },
 {
  "id": "firth-correction",
  "term": "Firth correction",
  "aka": [
   "Firth logistic regression",
   "Firth’s penalized likelihood"
  ],
  "short": "A version of logistic regression with a penalty (Firth’s) that keeps estimates finite and p-values accurate when cases are few or a variant is rare. REGENIE applies it only to variants with small initial p-values.",
  "long": "Standard logistic regression can give inaccurate p-values, or no finite estimate, for rare variants in unbalanced case–control data. When the correction is requested, REGENIE applies it to variants whose first p-value is below 0.05, its default threshold (Mbatchou et al. 2021).",
  "see": [
   "regenie",
   "binary-trait",
   "saddle-point-approximation"
  ],
  "match": [
   "Firth correction",
   "Firth regression",
   "Firth"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "the-data"
 },
 {
  "id": "fixed-random-effects",
  "term": "fixed-effect and random-effects meta-analysis",
  "short": "Two ways to combine studies in a meta-analysis. A fixed-effect model assumes every study estimates the same true effect and weights each study’s estimate by \\(1/\\SE^2\\), the inverse of its squared standard error. A random-effects model lets the true effect differ between studies.",
  "long": "The conventional random-effects model adds the between-study variance to each study’s variance, which widens the confidence interval and usually lowers the power to find associations. Han and Eskin’s RE2 model (2011) can have more power than the fixed-effect model when effects differ between studies. The Session 2 practical compares all three in METASOFT.",
  "see": [
   "meta-analysis",
   "heterogeneity",
   "summary-statistics"
  ],
  "match": [
   "fixed-effect meta-analysis",
   "fixed-effect model",
   "fixed-effect",
   "random-effects meta-analysis",
   "random-effects model",
   "random-effects method"
  ],
  "owner": "the-data"
 },
 {
  "id": "flow-cell",
  "term": "flow cell",
  "short": "The glass slide with channels (lanes) inside a short-read sequencer. DNA fragments attach to its surface, are copied into clusters of identical molecules, and are imaged cycle by cycle as labeled bases are added.",
  "see": [
   "short-read-sequencing",
   "sequencing-read"
  ],
  "links": [
   {
    "t": "Illumina: Overview of sequencing by synthesis (video, 5 min)",
    "u": "https://www.youtube.com/watch?v=fCd6B5HRaZ8"
   },
   {
    "t": "Goodwin et al. 2016: Coming of age: ten years of next-generation sequencing technologies",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC10373632/"
   }
  ],
  "match": [
   "flow cell"
  ],
  "owner": "samples-to-genotypes"
 },
 {
  "id": "fluorescence-intensity",
  "term": "fluorescence intensity",
  "aka": [
   "signal intensity",
   "intensity"
  ],
  "short": "The brightness of light given off by a fluorescent dye, measured by a scanner. A genotyping array reports two intensities per SNP per person, one for each allele's dye; genotypes are called from them.",
  "long": "Raw intensities vary with the amount and quality of DNA, so callers usually work with the share of the signal from each allele. The intensities also carry copy-number information (log R ratio, B allele frequency).",
  "see": [
   "genotyping-array",
   "genotype-calling",
   "cluster-plot",
   "log-r-ratio",
   "b-allele-frequency"
  ],
  "links": [
   {
    "t": "LaFramboise 2009: SNP arrays, a decade of advances (free full text)",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC2715261/"
   },
   {
    "t": "Affymetrix Axiom array data sheet: assay chemistry (PDF)",
    "u": "https://documents.thermofisher.com/TFS-Assets/LSG/brochures/axiom_ceu_arrayplate_datasheet.pdf"
   }
  ],
  "match": [
   "fluorescence intensity",
   "fluorescence intensities",
   "signal intensity",
   "signal intensities"
  ],
  "noPlural": true,
  "owner": "samples-to-genotypes"
 },
 {
  "id": "follow-up",
  "term": "follow-up",
  "short": "The period after baseline during which a cohort’s outcomes are recorded, through repeat visits or linked health records. Each person’s follow-up ends at the event studied, death, loss to follow-up or the end of data.",
  "see": [
   "baseline",
   "record-linkage",
   "censoring",
   "person-time"
  ],
  "match": [
   "follow-up"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "uk-biobank"
 },
 {
  "id": "forward-genetics",
  "term": "forward genetics",
  "short": "Research that starts from a phenotype, such as a family with very low LDL cholesterol, and searches for the genetic variant that causes it (phenotype → genotype).",
  "l1": "slide 15",
  "see": [
   "reverse-genetics",
   "proband"
  ],
  "match": [
   "forward genetics"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "forward-strand",
  "term": "forward strand (+ strand)",
  "aka": [
   "plus strand",
   "+ strand"
  ],
  "short": "The strand of the reference genome that runs 5′→3′ from the tip of the short (p) arm, so positions increase along it. Reference sequences give this strand. Some files use “forward” in another sense.",
  "long": "In dbSNP and Illumina files, “forward” can mean the orientation of a SNP’s stored flanking sequence, which is not necessarily the + strand of the reference genome (Nelson et al. 2012).",
  "l1": "slide 68 (“the (+) strand of the human reference genome”)",
  "see": [
   "reverse-strand",
   "strand",
   "genomic-coordinate"
  ],
  "links": [
   {
    "t": "Nelson et al. (2012): Is ‘forward’ the same as ‘plus’?",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC6099125/"
   }
  ],
  "match": [
   "forward strand",
   "plus strand",
   "+ strand",
   "(+) strand",
   "positive strand"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "dna"
 },
 {
  "id": "founder-effect",
  "term": "founder effect",
  "short": "The change in allele frequencies when a new population is started by a small group whose frequencies differ, by chance, from those of the population they came from. The new population inherits the founders’ frequencies.",
  "long": "Founder effects explain why some disease variants are much more common in particular populations, for example three <em>BRCA1</em>/<em>BRCA2</em> variants carried by over 2% of Ashkenazi Jews.",
  "l1": "slide 97",
  "see": [
   "genetic-drift",
   "bottleneck"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Founder Effect",
    "u": "https://www.genome.gov/genetics-glossary/Founder-Effect"
   }
  ],
  "match": [
   "founder effect"
  ],
  "owner": "allele-frequencies"
 },
 {
  "id": "frameshift-variant",
  "term": "frameshift variant",
  "aka": [
   "frameshift"
  ],
  "short": "An insertion or deletion in coding sequence whose length is not a multiple of 3. It changes every codon after it, until a new stop codon appears by chance, and usually destroys the protein's function.",
  "see": [
   "reading-frame",
   "indel",
   "inframe-indel",
   "loss-of-function"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Frameshift Mutation",
    "u": "https://www.genome.gov/genetics-glossary/Frameshift-Mutation"
   }
  ],
  "match": [
   "frameshift variant",
   "frameshift"
  ],
  "owner": "variation"
 },
 {
  "id": "fst",
  "term": "F<sub>ST</sub> (fixation index)",
  "short": "The fraction of variation that lies between populations rather than within them: 0 if allele frequencies are identical, 1 if populations are fixed for different alleles. Human values are small; most variation lies within populations.",
  "long": "One common definition: \\(F_{\\mathrm{ST}} = 1 - H_{\\mathrm{within}}/H_{\\mathrm{between}}\\), where \\(H_{\\mathrm{within}}\\) is the probability that two allele copies drawn from the same population differ (averaged over the populations) and \\(H_{\\mathrm{between}}\\) the probability that two copies drawn from two different populations differ. It is 0 when the populations have the same allele frequencies and 1 when each population carries only one allele and they carry different ones. Values depend on the estimator and the SNPs used. Rosenberg et al. (2002) found 93–95% of human genetic variation within populations and 3–5% between major geographic groups; \\(F_{\\mathrm{ST}}\\) between two European populations is about 0.004.",
  "see": [
   "population-structure",
   "allele-frequency"
  ],
  "match": [
   "fixation index",
   "FST",
   "Fst"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "ancestry"
 },
 {
  "id": "functional-genomics",
  "term": "functional genomics",
  "short": "Research that measures what DNA sequences do, genome-wide: which genes are expressed in which cells, where regulatory elements and open chromatin lie, and how variants change them. It helps interpret non-coding GWAS signals.",
  "long": "Examples are RNA-seq and eQTL maps (GTEx), maps of open chromatin and regulatory elements (ENCODE), and experiments that test many variants at once. It is the topic of Session 9 of the course.",
  "l1": "slide 54",
  "see": [
   "gene-expression",
   "regulatory-element",
   "eqtl",
   "chromatin-accessibility",
   "encode"
  ],
  "match": [
   "functional genomics"
  ],
  "noPlural": true,
  "owner": "genes-expression"
 },
 {
  "id": "gain-of-function",
  "term": "gain-of-function",
  "aka": [
   "gain of function"
  ],
  "short": "Describes a variant that increases the activity of a gene’s product or gives it a new property. Example: some missense variants in <em>PCSK9</em> increase its activity and cause inherited high LDL cholesterol.",
  "see": [
   "loss-of-function",
   "dominant"
  ],
  "match": [
   "gain-of-function",
   "gain of function"
  ],
  "noPlural": true,
  "owner": "variation"
 },
 {
  "id": "gamete",
  "term": "gamete",
  "aka": [
   "egg",
   "sperm",
   "germ cell"
  ],
  "short": "An egg or a sperm cell. Gametes are haploid, carrying one copy of each chromosome, and fuse at fertilization to form a zygote.",
  "see": [
   "haploid",
   "zygote",
   "germline"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Gamete",
    "u": "https://www.genome.gov/genetics-glossary/Gamete"
   }
  ],
  "match": [
   "gamete"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "cells-chromosomes"
 },
 {
  "id": "gametic-disequilibrium",
  "term": "gametic disequilibrium",
  "aka": [
   "gametic phase disequilibrium"
  ],
  "short": "Non-random association of alleles at two loci on the same gamete, whatever its cause. LD measures compute it; it can arise between unlinked loci (for example after admixture) but persists only between linked loci.",
  "l1": "slide 115",
  "see": [
   "ld",
   "genetic-linkage",
   "admixture"
  ],
  "match": [
   "gametic disequilibrium",
   "gametic phase disequilibrium"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "haplotypes-ld"
 },
 {
  "id": "gencode",
  "term": "GENCODE",
  "short": "The reference annotation of human genes, also used by Ensembl: positions of genes, transcripts and exons on the reference genome. Release 50 (June 2026, GRCh38) lists 78,733 genes; release 19 was the last on GRCh37.",
  "see": [
   "gene-annotation",
   "transcript",
   "grch38"
  ],
  "links": [
   {
    "t": "GENCODE: human release statistics",
    "u": "https://www.gencodegenes.org/human/stats.html"
   }
  ],
  "match": [
   "GENCODE"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "genes-expression"
 },
 {
  "id": "gene",
  "term": "gene",
  "short": "A stretch of DNA that a cell copies (transcribes) into a working RNA molecule. For a protein-coding gene that RNA is translated into a protein; other genes make RNAs that work without being translated.",
  "long": "GENCODE release 50 (June 2026) lists 78,733 human genes, 19,442 of them protein-coding (20,107 including read-through genes). A gene consists of exons and introns; the regulatory elements that control it can lie far away.",
  "l1": "slides 15, 62, 71, 74, 88",
  "see": [
   "protein-coding-gene",
   "exon",
   "intron",
   "gene-expression"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Gene",
    "u": "https://www.genome.gov/genetics-glossary/Gene"
   },
   {
    "t": "MedlinePlus Genetics: What is a gene?",
    "u": "https://medlineplus.gov/genetics/understanding/basics/gene/"
   }
  ],
  "match": [
   "gene"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "gene-annotation",
  "term": "gene annotation",
  "short": "A catalog of where each gene, transcript, exon and coding sequence lies on a reference genome, usually distributed as a GTF or GFF file. GENCODE and RefSeq are the standard human annotations.",
  "see": [
   "gencode",
   "transcript",
   "reference-genome"
  ],
  "links": [
   {
    "t": "GENCODE: human release statistics",
    "u": "https://www.gencodegenes.org/human/stats.html"
   }
  ],
  "match": [
   "gene annotation",
   "genome annotation"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "gene-expression",
  "term": "gene expression",
  "short": "The making of a gene’s product: transcription into RNA and, for a protein-coding gene, translation into protein. A gene’s expression level, usually measured as its amount of RNA (RNA-seq), differs between cell types and tissues.",
  "l1": "slide 25",
  "see": [
   "gene-regulation",
   "rna-seq",
   "eqtl"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Gene expression",
    "u": "https://www.genome.gov/genetics-glossary/Gene-Expression"
   }
  ],
  "match": [
   "gene expression",
   "expression level"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "gene-flow",
  "term": "gene flow",
  "aka": [
   "migration"
  ],
  "short": "Movement of alleles between populations when people move and have children in the new population. It makes the populations’ allele frequencies more similar.",
  "long": "Populations with recent ancestry from several continents, such as the admixed American (AMR) samples of the 1000 Genomes Project, have intermediate frequencies at variants whose frequencies differ between continents.",
  "l1": "slide 97",
  "see": [
   "genetic-drift",
   "population"
  ],
  "links": [
   {
    "t": "Scitable: Natural Selection, Genetic Drift, and Gene Flow Do Not Act in Isolation in Natural Populations",
    "u": "https://www.nature.com/scitable/knowledge/library/natural-selection-genetic-drift-and-gene-flow-15186648/"
   }
  ],
  "match": [
   "gene flow"
  ],
  "noPlural": true,
  "owner": "allele-frequencies"
 },
 {
  "id": "gene-regulation",
  "term": "gene regulation",
  "short": "Control of when, where and how much a gene is expressed: by transcription factors acting on promoters and enhancers, by chromatin and DNA methylation, and by later steps such as splicing, translation and protein breakdown.",
  "l1": "slides 62–63",
  "see": [
   "transcription-factor",
   "enhancer",
   "dna-methylation",
   "chromatin-accessibility"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Gene regulation",
    "u": "https://www.genome.gov/genetics-glossary/Gene-Regulation"
   },
   {
    "t": "MedlinePlus Genetics: Can genes be turned on and off in cells?",
    "u": "https://medlineplus.gov/genetics/understanding/howgeneswork/geneonoff/"
   }
  ],
  "match": [
   "gene regulation",
   "regulation of gene expression"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "gene-symbol",
  "term": "gene symbol (HGNC)",
  "aka": [
   "HGNC symbol"
  ],
  "short": "The short official name of a gene, approved by the HUGO Gene Nomenclature Committee (HGNC), such as <em>HBB</em>. Gene symbols are written in italics; the same letters in roman type refer to the protein.",
  "see": [
   "gene",
   "protein"
  ],
  "links": [
   {
    "t": "HGNC: HUGO Gene Nomenclature Committee",
    "u": "https://www.genenames.org/"
   }
  ],
  "match": [
   "gene symbol"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "generalizability",
  "term": "generalizability",
  "aka": [
   "representativeness",
   "external validity"
  ],
  "short": "Whether a result found in one group of people holds in another group or in the target population. A study can be unrepresentative, for example healthier than average, and still give associations that generalize.",
  "l1": "slide 37",
  "see": [
   "healthy-volunteer-bias",
   "target-population"
  ],
  "match": [
   "generalizability",
   "generalizable",
   "representativeness"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "uk-biobank"
 },
 {
  "id": "genetic-ancestry",
  "term": "genetic ancestry",
  "short": "The paths through a person's family tree along which they inherited DNA from specific ancestors (NASEM 2023). It is never observed directly; studies infer it from genetic similarity to reference samples.",
  "long": "Only some genealogical ancestors are genetic ancestors: many generations back, most people in a family tree contributed no DNA to a given person. NASEM recommends describing results as genetic similarity to named reference samples rather than as membership of an ancestry group.",
  "see": [
   "genetic-similarity",
   "population-descriptor",
   "reference-population",
   "local-ancestry"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Genetic Ancestry",
    "u": "https://www.genome.gov/genetics-glossary/Genetic-Ancestry"
   }
  ],
  "match": [
   "genetic ancestry"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "ancestry"
 },
 {
  "id": "genetic-architecture",
  "term": "genetic architecture",
  "short": "The number of genetic variants that affect a trait, their allele frequencies, their effect sizes and how their effects combine.",
  "see": [
   "polygenic",
   "monogenic",
   "effect-size",
   "allele-frequency"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Genetic Architecture",
    "u": "https://www.genome.gov/genetics-glossary/Genetic-Architecture"
   }
  ],
  "match": [
   "genetic architecture"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "genetic-association",
  "term": "genetic association",
  "aka": [
   "association"
  ],
  "short": "A statistical relationship between a genetic variant and a trait: the trait differs on average between genotype groups (per-allele effect \\(\\beta \\ne 0\\)). An association need not be causal; linkage disequilibrium and confounding can produce one.",
  "l1": "slides 29, 48",
  "see": [
   "gwas",
   "ld",
   "confounding",
   "causal-variant"
  ],
  "match": [
   "genetic association"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "genetic-code",
  "term": "genetic code",
  "short": "The table that maps each of the 64 codons to one of 20 amino acids or to stop. It is redundant: most amino acids have several codons, which usually differ only in the third base.",
  "l1": "slide 62",
  "see": [
   "codon",
   "amino-acid",
   "synonymous-variant"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Genetic code",
    "u": "https://www.genome.gov/genetics-glossary/Genetic-Code"
   },
   {
    "t": "Learn.Genetics: Transcribe and translate a gene",
    "u": "https://learn.genetics.utah.edu/content/basics/txtl/"
   }
  ],
  "match": [
   "genetic code"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "genetic-drift",
  "term": "genetic drift",
  "short": "Random change in allele frequencies between generations, because each generation passes on only a finite sample of its parents’ alleles. It is fastest in small populations; eventually one allele reaches frequency 1.",
  "long": "Left to drift alone, an allele is eventually lost (frequency 0) or fixed (frequency 1); a new neutral allele becomes fixed with probability equal to its current frequency. In the Wright–Fisher model a population of \\(N\\) diploid people passes on \\(2N\\) allele copies, each drawn independently and carrying the allele with probability \\(p\\), its current frequency. The count in the next generation is then \\(\\Binomial(2N, p)\\), so the next frequency has mean \\(p\\) and standard deviation \\(\\sqrt{pq/(2N)}\\), with \\(q = 1 - p\\): no direction is favored, and the typical change grows as \\(N\\) shrinks.",
  "l1": "slide 97",
  "see": [
   "founder-effect",
   "bottleneck",
   "natural-selection"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Genetic Drift",
    "u": "https://www.genome.gov/genetics-glossary/Genetic-Drift"
   },
   {
    "t": "Scitable: Genetic Drift and Effective Population Size",
    "u": "https://www.nature.com/scitable/topicpage/genetic-drift-and-effective-population-size-772523/"
   }
  ],
  "match": [
   "genetic drift"
  ],
  "noPlural": true,
  "owner": "allele-frequencies"
 },
 {
  "id": "genetic-epidemiology",
  "term": "genetic epidemiology",
  "short": "The study of the role of genetic factors in health and disease in families and populations, and of how they interact with social and environmental factors.",
  "l1": "slides 11–14, 27–28, 93",
  "see": [
   "epidemiology",
   "gwas",
   "gene-environment-interaction"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Genetic Epidemiology",
    "u": "https://www.genome.gov/genetics-glossary/Genetic-Epidemiology"
   }
  ],
  "match": [
   "genetic epidemiology"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "genetic-linkage",
  "term": "genetic linkage",
  "aka": [
   "linked loci"
  ],
  "short": "The tendency of alleles at loci close together on the same chromosome to be inherited together, because crossovers rarely fall between them. Linked loci have a recombination fraction below 0.5.",
  "long": "Linkage concerns transmission within families. Linkage disequilibrium (LD) is a different concept: a correlation between alleles at nearby loci in a population. \"Record linkage\" on the UK Biobank pages means joining health records and is unrelated.",
  "l1": "slide 115",
  "see": [
   "recombination-fraction",
   "linkage-analysis",
   "independent-assortment",
   "ld"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Linkage",
    "u": "https://www.genome.gov/genetics-glossary/Linkage"
   }
  ],
  "match": [
   "genetic linkage",
   "linked loci",
   "linked locus"
  ],
  "noPlural": true,
  "owner": "inheritance"
 },
 {
  "id": "genetic-map",
  "term": "genetic map",
  "aka": [
   "linkage map",
   "recombination map"
  ],
  "short": "A list of positions along each chromosome in centimorgans, which measure how often crossovers occur between them. Phasing, imputation and shared-segment detection tools use it to convert base-pair positions into recombination distances.",
  "long": "The female map is longer than the male map (4,281 versus 2,590 cM for the autosomes in the deCODE map; Kong et al. 2002) because eggs carry more crossovers than sperm.",
  "see": [
   "centimorgan",
   "recombination-hotspot",
   "recombination"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Genetic Map",
    "u": "https://www.genome.gov/genetics-glossary/Genetic-Map"
   }
  ],
  "match": [
   "genetic map",
   "linkage map",
   "recombination map"
  ],
  "owner": "inheritance"
 },
 {
  "id": "genetic-marker",
  "term": "genetic marker",
  "aka": [
   "marker"
  ],
  "short": "A variant at a known position that is measured to follow a stretch of DNA or to test for association. The SNPs on genotyping arrays are the markers used in most GWAS.",
  "l1": "slides 82–83, 85, 112",
  "see": [
   "snp",
   "genotyping-array",
   "tag-snp"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Genetic Marker",
    "u": "https://www.genome.gov/genetics-glossary/Genetic-Marker"
   }
  ],
  "match": [
   "genetic marker"
  ],
  "owner": "variation"
 },
 {
  "id": "genetic-relationship-matrix",
  "term": "genetic relationship matrix (GRM)",
  "short": "An \\(n \\times n\\) matrix of genetic similarity between all pairs of the \\(n\\) people in a sample, computed from standardized genotypes. Its top eigenvectors are the principal components; mixed models use it as a covariance matrix.",
  "long": "With \\(\\mathbf{Z}\\) the \\(n \\times m\\) matrix of the people’s genotypes at \\(m\\) SNPs, each column standardized to mean 0 and variance 1, \\(\\mathbf{K} = \\mathbf{Z}\\mathbf{Z}^{\\top}/m\\). The entry for two people is the average, over SNPs, of the product of their standardized genotypes: it is near 0 for unrelated people and near twice their kinship coefficient for relatives (about 0.5 for first-degree relatives). Diagonal entries are near 1.",
  "see": [
   "pca",
   "principal-component",
   "mixed-model"
  ],
  "match": [
   "genetic relationship matrix",
   "Genetic relationship matrix",
   "GRM"
  ],
  "cs": true,
  "auto": true,
  "noPlural": false,
  "owner": "ancestry"
 },
 {
  "id": "genetic-sex",
  "term": "genetic sex",
  "short": "Sex inferred from genotype data, mainly from the heterozygosity of X-chromosome SNPs and the signal at Y-chromosome markers. In UK Biobank it is Field 22001; QC compares it with recorded sex (Field 31).",
  "long": "It describes the sex chromosomes detected (typically XX or XY), not gender identity. A mismatch with recorded sex can mean a sample mix-up, a data-entry error or a sex-chromosome difference such as XXY; Bycroft et al. (2018) report 378 such mismatches in UK Biobank.",
  "see": [
   "x-chromosome",
   "y-chromosome",
   "hemizygous"
  ],
  "links": [
   {
    "t": "UK Biobank Showcase: Field 22001 (Genetic sex)",
    "u": "https://biobank.ndph.ox.ac.uk/showcase/field.cgi?id=22001"
   }
  ],
  "match": [
   "genetic sex"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "cells-chromosomes"
 },
 {
  "id": "genetic-similarity",
  "term": "genetic similarity",
  "short": "A quantitative measure of how alike two people's genomes are, reflecting how much genetic ancestry they share (NASEM 2023). Computed from genotypes, for example as closeness on principal components or to named reference samples.",
  "long": "Example of precise wording: \"genetically similar to the 1000 Genomes GBR samples on the first 10 PCs\". Unlike group labels, this states what was measured and against which references.",
  "l1": "slides 98, 103",
  "see": [
   "genetic-ancestry",
   "pca",
   "reference-population"
  ],
  "links": [
   {
    "t": "Coop: Genetic similarity versus genetic ancestry groups (arXiv)",
    "u": "https://arxiv.org/abs/2207.11595"
   }
  ],
  "match": [
   "genetic similarity",
   "genetically similar"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "ancestry"
 },
 {
  "id": "genetic-variant",
  "term": "genetic variant",
  "aka": [
   "variant",
   "sequence variant"
  ],
  "short": "A position or stretch of the genome where the DNA sequence differs between people or from the reference genome. It is written as genome build, chromosome, position and alleles, for example chr12:111803962:G:A (GRCh38).",
  "long": "“Variant” is the neutral word for any difference, whatever its frequency or effect. Variants range in size from one base (SNVs) to whole chromosomes (aneuploidy).",
  "l1": "slides 15–16, 67–68, 93",
  "see": [
   "allele",
   "snp",
   "mutation",
   "polymorphism"
  ],
  "match": [
   "genetic variant",
   "sequence variant",
   "variant"
  ],
  "owner": "variation"
 },
 {
  "id": "transcriptome-imputation",
  "term": "genetically predicted expression (transcriptome imputation)",
  "aka": [
   "transcriptome imputation",
   "imputed gene expression",
   "predicted gene expression"
  ],
  "short": "A gene’s expression level predicted from a person’s genotypes with weights learned in a dataset with measured expression, such as GTEx; the input to a TWAS. Unlike genotype imputation, it predicts a trait, not genotypes.",
  "long": "Predicted expression is a weighted sum of a person’s genotypes near the gene, \\(\\hat{\\mathbf{e}} = \\mathbf{G}\\mathbf{w}\\): \\(\\mathbf{G}\\) holds genotype dosages (one row per person, one column per variant), \\(\\mathbf{w}\\) the per-variant weights from a model such as PrediXcan or FUSION trained in one tissue, and \\(\\hat{\\mathbf{e}}\\) the predicted expression of each person. It captures only the genetically determined part of expression, and it is less accurate in people less genetically similar to the training samples.",
  "l1": "slide 25",
  "see": [
   "twas",
   "eqtl",
   "gtex",
   "genotype-imputation"
  ],
  "match": [
   "genetically predicted expression",
   "transcriptome imputation",
   "imputed gene expression",
   "predicted gene expression",
   "predicted expression",
   "imputed expression",
   "expression imputation",
   "imputation of gene expression"
  ],
  "noPlural": true,
  "owner": "genes-expression"
 },
 {
  "id": "gene-environment-interaction",
  "term": "gene–environment interaction (G×E)",
  "aka": [
   "G×E",
   "GxE"
  ],
  "short": "When the effect of a genotype on a trait depends on an environmental exposure; modeled with a product term \\(g \\times E\\) of the genotype dosage \\(g\\) and the exposure \\(E\\). Example: the rs671 A allele raises esophageal cancer risk mainly in alcohol drinkers.",
  "l1": "slide 48 (Session 3)",
  "see": [
   "complex-trait",
   "exposure"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Gene-Environment Interaction",
    "u": "https://www.genome.gov/genetics-glossary/Gene-Environment-Interaction"
   }
  ],
  "match": [
   "gene–environment interaction",
   "gene-environment interaction",
   "G×E",
   "GxE"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "genome",
  "term": "genome",
  "short": "All of the DNA of an organism. For humans this usually means one set of the 23 nuclear chromosomes (about 3.1 billion base pairs in GRCh38), plus the mitochondrial DNA.",
  "long": "A body cell holds two sets, about 6 billion base pairs, or roughly 2 m of DNA.",
  "l1": "slides 58, 59",
  "see": [
   "chromosome",
   "mitochondrial-dna"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Genome",
    "u": "https://www.genome.gov/genetics-glossary/Genome"
   }
  ],
  "match": [
   "genome"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "cells-chromosomes"
 },
 {
  "id": "genome-browser",
  "term": "genome browser",
  "short": "A website that displays a reference genome and annotations (genes, variants, regulatory regions) along its coordinates. Two widely used ones are the UCSC Genome Browser and Ensembl; each view shows one build.",
  "see": [
   "reference-genome",
   "genome-build"
  ],
  "links": [
   {
    "t": "UCSC Genome Browser",
    "u": "https://genome.ucsc.edu/"
   },
   {
    "t": "Ensembl",
    "u": "https://www.ensembl.org/"
   }
  ],
  "match": [
   "genome browser"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "dna"
 },
 {
  "id": "genome-build",
  "term": "genome build",
  "aka": [
   "assembly",
   "assembly version"
  ],
  "short": "One released version of a reference genome, such as GRCh37 or GRCh38. Builds differ in sequence, so the same base can have different positions in different builds: always state the build with a position.",
  "l1": "slide 68 (“GRCh38/hg38”)",
  "see": [
   "grch37",
   "grch38",
   "t2t-chm13",
   "liftover"
  ],
  "match": [
   "genome build",
   "genome assembly",
   "assembly version"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "dna"
 },
 {
  "id": "gwas",
  "term": "genome-wide association study (GWAS)",
  "aka": [
   "GWAS",
   "genome-wide association scan"
  ],
  "short": "A study that tests millions of variants, one at a time, for association with a trait, usually by regressing the trait on genotype with covariates. The usual significance threshold is p &lt; 5 × 10⁻⁸.",
  "long": "The results, one row per variant with its effect size, standard error and p-value, are the summary statistics.",
  "l1": "slides 8, 17, 29, 31, 47 (Session 2)",
  "see": [
   "summary-statistics",
   "manhattan-plot",
   "genome-wide-significance",
   "genetic-association"
  ],
  "links": [
   {
    "t": "NHGRI: Genome-Wide Association Studies Fact Sheet",
    "u": "https://www.genome.gov/about-genomics/fact-sheets/Genome-Wide-Association-Studies-Fact-Sheet"
   },
   {
    "t": "NHGRI Talking Glossary: GWAS",
    "u": "https://www.genome.gov/genetics-glossary/Genome-Wide-Association-Studies-GWAS"
   }
  ],
  "match": [
   "GWAS",
   "genome-wide association study",
   "genome-wide association studies",
   "Genome-wide association study",
   "Genome-wide association studies"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "genome-wide-significance",
  "term": "genome-wide significance (p < 5 × 10⁻⁸)",
  "aka": [
   "genome-wide significance threshold"
  ],
  "short": "The conventional p-value threshold for declaring a GWAS association: 5 × 10⁻⁸. It is 0.05 divided by about one million, the estimated number of independent tests in a genome-wide study of common variants.",
  "long": "The one-million estimate (Pe'er et al. 2008; Dudbridge and Gusnanto 2008) comes from linkage disequilibrium in samples genetically similar to European reference populations. Where linkage disequilibrium is shorter, or when rare variants are included, there are more independent tests and a stricter threshold is appropriate.",
  "see": [
   "multiple-testing",
   "effective-number-of-tests",
   "manhattan-plot",
   "bonferroni-correction"
  ],
  "links": [
   {
    "t": "Pe'er et al. 2008, multiple testing burden for genome-wide association studies",
    "u": "https://doi.org/10.1002/gepi.20303"
   }
  ],
  "match": [
   "genome-wide significance",
   "genome-wide significant",
   "genome-wide-significant",
   "genome-wide significance threshold"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "the-data"
 },
 {
  "id": "genomic-coordinate",
  "term": "genomic coordinate",
  "aka": [
   "genomic position",
   "chromosome position"
  ],
  "short": "The address of a base pair: chromosome and position, counted from 1 along the + strand of a stated genome build, for example chr12:111,803,962 (GRCh38). A region is written chr:start-end.",
  "l1": "slide 68 (“chr12:111803962”)",
  "see": [
   "genome-build",
   "forward-strand",
   "zero-based-coordinates"
  ],
  "match": [
   "genomic coordinate",
   "genomic position",
   "genome coordinate",
   "base-pair position"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "dna"
 },
 {
  "id": "genomic-inflation",
  "term": "genomic inflation factor (λ, λGC)",
  "aka": [
   "lambda GC",
   "λGC",
   "inflation factor"
  ],
  "short": "The median of a GWAS’s 1-df \\(\\chi^2\\) statistics divided by 0.455, the median of the \\(\\chi^2_1\\) distribution that they follow when no variant is associated. Near 1 means no inflation; above 1 can mean confounding, such as population stratification, or many small true effects.",
  "long": "Devlin and Roeder (1999) proposed genomic control: dividing every \\(\\chi^2\\) statistic by \\(\\lambda\\) to remove uniform inflation. In large samples of polygenic traits \\(\\lambda\\) grows with sample size even without confounding (Yang et al. 2011); the intercept of LD score regression separates the two sources (Bulik-Sullivan et al. 2015).",
  "see": [
   "qq-plot",
   "population-stratification",
   "ld-score-regression"
  ],
  "links": [
   {
    "t": "Devlin and Roeder 1999, Genomic control for association studies",
    "u": "https://doi.org/10.1111/j.0006-341X.1999.00997.x"
   },
   {
    "t": "Yang et al. 2011, Genomic inflation factors under polygenic inheritance",
    "u": "https://doi.org/10.1038/ejhg.2011.39"
   }
  ],
  "match": [
   "genomic inflation factor",
   "genomic inflation",
   "inflation factor",
   "λGC",
   "lambda GC",
   "genomic control"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "the-data"
 },
 {
  "id": "genotype",
  "term": "genotype",
  "aka": [],
  "short": "The pair of alleles a person carries at a locus, one on each chromosome copy, for example G/A. Analyses usually code it as 0, 1 or 2 copies of one chosen allele.",
  "l1": "slides 70–77",
  "see": [
   "allele",
   "homozygous",
   "heterozygous",
   "allele-dosage"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Genotype",
    "u": "https://www.genome.gov/genetics-glossary/Genotype"
   }
  ],
  "match": [
   "genotype"
  ],
  "owner": "variation"
 },
 {
  "id": "genotype-calling",
  "term": "genotype calling",
  "short": "Turning raw measurements into genotypes. For arrays: clustering the two allele intensities of many people at one SNP and assigning each person to the AA, AB or BB cluster, or a no-call if none fits.",
  "long": "Calling is done SNP by SNP and batch by batch, using many samples together, so a shifted batch can be miscalled as a group. For sequencing data the equivalent step is variant calling.",
  "see": [
   "cluster-plot",
   "no-call",
   "call-rate",
   "batch-effect",
   "variant-calling"
  ],
  "links": [
   {
    "t": "LaFramboise 2009: SNP arrays, a decade of advances (free full text)",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC2715261/"
   }
  ],
  "match": [
   "genotype calling",
   "genotype call"
  ],
  "owner": "samples-to-genotypes"
 },
 {
  "id": "genotype-frequency",
  "term": "genotype frequency",
  "short": "The fraction of people in a population or sample who have a given genotype: \\(P_{ij} = n_{ij}/n\\), where \\(n_{ij}\\) is the number of people with genotype \\(ij\\) (alleles \\(i\\) and \\(j\\)) and \\(n\\) the number of people.",
  "long": "Under Hardy–Weinberg equilibrium the genotype frequencies of a biallelic SNP follow from the allele frequencies \\(p\\) and \\(q = 1 - p\\) alone: \\(p^2\\), \\(2pq\\) and \\(q^2\\).",
  "l1": "slides 72–74",
  "see": [
   "allele-frequency",
   "hwe"
  ],
  "links": [
   {
    "t": "Scitable: The Hardy-Weinberg Principle",
    "u": "https://www.nature.com/scitable/knowledge/library/the-hardy-weinberg-principle-13235724/"
   }
  ],
  "match": [
   "genotype frequency"
  ],
  "owner": "allele-frequencies"
 },
 {
  "id": "genotype-imputation",
  "term": "genotype imputation",
  "aka": [
   "imputation"
  ],
  "short": "Predicting genotypes at variants that were not measured, by matching each person's phased array haplotypes to a reference panel of sequenced haplotypes. The output is a probability for each genotype, usually summarized as a dosage.",
  "long": "Imputation works because of linkage disequilibrium: a stretch of haplotype that matches a reference haplotype at the array SNPs probably matches it at the variants in between. Accuracy falls for rare variants and for people less genetically similar to the panel’s samples. UK Biobank’s main imputation gives about 96 million variants. Not to be confused with transcriptome imputation in a TWAS, which predicts gene expression, not genotypes.",
  "l1": "slide 85",
  "see": [
   "reference-panel",
   "dosage",
   "info-score",
   "phasing",
   "transcriptome-imputation"
  ],
  "links": [
   {
    "t": "Das et al. 2016: Next-generation genotype imputation service and methods",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC5157836/"
   },
   {
    "t": "IMPUTE2 documentation (output files and the info metric)",
    "u": "https://mathgen.stats.ox.ac.uk/impute/impute_v2.html"
   },
   {
    "t": "Bycroft et al. 2018: The UK Biobank resource with deep phenotyping and genomic data",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC6786975/"
   }
  ],
  "match": [
   "genotype imputation",
   "imputation",
   "imputed genotype"
  ],
  "owner": "samples-to-genotypes"
 },
 {
  "id": "genotype-matrix",
  "term": "genotype matrix",
  "short": "A table of genotypes: one row per person, one column per variant. Each entry counts copies of one chosen allele (0, 1 or 2) or holds a fractional dosage after imputation; failed calls are missing.",
  "long": "The mean of a column is twice the frequency of the counted allele. Neighboring columns are correlated (linkage disequilibrium), and similar rows reflect relatedness or shared ancestry. Genome-wide matrices are too large to hold in memory, so software reads them a block of variants at a time from PLINK, BGEN or VCF files.",
  "see": [
   "allele-dosage",
   "dosage",
   "plink-binary",
   "covariate"
  ],
  "match": [
   "genotype matrix",
   "genotype matrices"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "the-data"
 },
 {
  "id": "genotype-probability",
  "term": "genotype probability",
  "aka": [
   "genotype probabilities",
   "posterior genotype probability"
  ],
  "short": "For one person at one imputed variant, the probabilities \\(P(0)\\), \\(P(1)\\) and \\(P(2)\\) of carrying 0, 1 or 2 copies of the counted allele; they sum to 1. BGEN and VCF files store them.",
  "long": "They are usually summarized as a dosage, \\(P(1) + 2P(2)\\), the expected number of copies of the counted allele, or as a hard call, the most probable genotype. Not to be confused with the genotype frequencies \\(p^2\\), \\(2pq\\) and \\(q^2\\) expected under Hardy–Weinberg equilibrium, which some texts also call genotype probabilities.",
  "see": [
   "dosage",
   "hard-call",
   "genotype-imputation",
   "bgen"
  ],
  "links": [
   {
    "t": "IMPUTE2 documentation (output files and the info metric)",
    "u": "https://mathgen.stats.ox.ac.uk/impute/impute_v2.html"
   }
  ],
  "match": [
   "genotype probability",
   "genotype probabilities"
  ],
  "noPlural": true,
  "owner": "samples-to-genotypes"
 },
 {
  "id": "gtex",
  "term": "Genotype-Tissue Expression project (GTEx)",
  "aka": [
   "GTEx"
  ],
  "short": "A reference atlas of gene expression in 54 tissues from 946 deceased donors whose genomes were sequenced, used to find eQTLs and to train TWAS models. Expression and eQTLs can be browsed at gtexportal.org.",
  "see": [
   "eqtl",
   "twas",
   "rna-seq"
  ],
  "links": [
   {
    "t": "GTEx Portal",
    "u": "https://gtexportal.org/home/"
   }
  ],
  "match": [
   "GTEx",
   "Genotype-Tissue Expression"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "genes-expression"
 },
 {
  "id": "genotyping",
  "term": "genotyping",
  "short": "Determining which alleles a person carries at chosen positions in the genome, most often with a genotyping array. More broadly, any method that yields genotypes, including sequencing.",
  "long": "In UK Biobank, “genotyped” usually means measured on the array (about 800,000 markers), as opposed to imputed or sequenced.",
  "l1": "slides 83, 114",
  "see": [
   "genotyping-array",
   "genotype-calling",
   "sequencing",
   "genotype"
  ],
  "links": [
   {
    "t": "NHGRI: DNA Microarray Technology Fact Sheet",
    "u": "https://www.genome.gov/about-genomics/fact-sheets/DNA-Microarray-Technology"
   }
  ],
  "match": [
   "genotyping"
  ],
  "noPlural": true,
  "owner": "samples-to-genotypes"
 },
 {
  "id": "genotyping-array",
  "term": "genotyping array (SNP array)",
  "aka": [
   "SNP array",
   "SNP chip",
   "chip",
   "microarray"
  ],
  "short": "A glass surface carrying hundreds of thousands of DNA probes, each matching the genome next to one chosen SNP. Hybridization and fluorescent dyes give two intensities per SNP per person, from which genotypes are called.",
  "long": "Array content is fixed in advance: tag SNPs that capture common variation through linkage disequilibrium, plus chosen coding and disease-related variants. Arrays are cheap and accurate for common variants, but unreliable for very rare ones and blind to variants they do not carry. Arrays from Affymetrix (Thermo Fisher) and Illumina use different chemistry but give the same kind of output.",
  "see": [
   "probe",
   "hybridization",
   "genotype-calling",
   "tag-snp",
   "axiom-array"
  ],
  "links": [
   {
    "t": "NHGRI: DNA Microarray Technology Fact Sheet",
    "u": "https://www.genome.gov/about-genomics/fact-sheets/DNA-Microarray-Technology"
   },
   {
    "t": "LaFramboise 2009: SNP arrays, a decade of advances (free full text)",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC2715261/"
   }
  ],
  "match": [
   "genotyping array",
   "SNP array",
   "SNP chip"
  ],
  "owner": "samples-to-genotypes"
 },
 {
  "id": "germline",
  "term": "germline",
  "aka": [
   "germ line"
  ],
  "short": "The cells that produce eggs or sperm, and the DNA they carry. Only germline DNA passes to children; a variant inherited through the germline is present in every cell of the child.",
  "see": [
   "somatic-cell",
   "somatic-mutation",
   "gamete"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Germ Line",
    "u": "https://www.genome.gov/genetics-glossary/germ-line"
   }
  ],
  "match": [
   "germline",
   "germ line",
   "germ-line"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "cells-chromosomes"
 },
 {
  "id": "gigabase",
  "term": "gigabase (Gb)",
  "aka": [
   "Gb"
  ],
  "short": "A unit of DNA length: 1 Gb = 1,000,000,000 (10<sup>9</sup>) base pairs. One copy of the human genome is about 3.1 Gb.",
  "see": [
   "base-pair",
   "megabase"
  ],
  "match": [
   "gigabase",
   "gigabases",
   "Gb"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "dna"
 },
 {
  "id": "gnomad",
  "term": "gnomAD",
  "aka": [
   "Genome Aggregation Database"
  ],
  "short": "The Genome Aggregation Database: allele frequencies from the exomes and genomes of 807,162 people (version 4), reported by genetic-ancestry group. Often used to judge whether a variant is rare.",
  "see": [
   "allele-frequency",
   "rare-variant",
   "dbsnp"
  ],
  "links": [
   {
    "t": "gnomAD browser",
    "u": "https://gnomad.broadinstitute.org/"
   }
  ],
  "match": [
   "gnomAD",
   "Genome Aggregation Database"
  ],
  "owner": "variation"
 },
 {
  "id": "grafanc",
  "term": "GRAF-pop / GrafAnc",
  "short": "Tools that place a person relative to reference populations by comparing their genotypes at a fixed set of ancestry-informative SNPs with reference allele frequencies. GrafAnc assigns 8 continental and 38 subcontinental groups.",
  "long": "GrafAnc is used in the Session 1 practical. GRAF-pop (NCBI; 10,000 SNPs, five reference populations) is used in dbGaP quality control. GrafAnc, developed at the University of Pennsylvania by GRAF-pop’s first author and colleagues, builds on it (282,424 SNPs, 26 reference populations) and produces 18 scores per person that do not depend on who else is in the study.",
  "l1": "slides 8, 98–99",
  "see": [
   "structure-admixture",
   "reference-population",
   "genetic-similarity"
  ],
  "links": [
   {
    "t": "GrafAnc documentation (GitHub)",
    "u": "https://github.com/jimmy-penn/grafanc"
   }
  ],
  "match": [
   "GrafAnc",
   "GRAF-pop",
   "GrafPop"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "ancestry"
 },
 {
  "id": "grch37",
  "term": "GRCh37 (hg19)",
  "aka": [
   "hg19",
   "GRCh37"
  ],
  "short": "Genome Reference Consortium human build 37, released in 2009; UCSC calls it hg19. UK Biobank array genotypes and its original imputed genotypes use GRCh37 positions. rs671 is at chr12:112,241,766 on this build.",
  "see": [
   "grch38",
   "genome-build",
   "liftover"
  ],
  "links": [
   {
    "t": "Genome Reference Consortium: human",
    "u": "https://www.ncbi.nlm.nih.gov/grc/human"
   }
  ],
  "match": [
   "GRCh37",
   "hg19"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "dna"
 },
 {
  "id": "grch38",
  "term": "GRCh38 (hg38)",
  "aka": [
   "hg38",
   "GRCh38"
  ],
  "short": "Genome Reference Consortium human build 38, released in December 2013 and the current standard; UCSC calls it hg38. Patch releases (latest GRCh38.p14) do not change positions. rs671 is at chr12:111,803,962 on this build.",
  "l1": "slide 68",
  "see": [
   "grch37",
   "t2t-chm13",
   "genome-build"
  ],
  "links": [
   {
    "t": "Genome Reference Consortium: human",
    "u": "https://www.ncbi.nlm.nih.gov/grc/human"
   }
  ],
  "match": [
   "GRCh38",
   "hg38"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "dna"
 },
 {
  "id": "gwas-catalog",
  "term": "GWAS Catalog",
  "aka": [
   "NHGRI-EBI GWAS Catalog"
  ],
  "short": "A curated public database of published genome-wide association results: which variants are associated with which traits, with their effect sizes and p-values.",
  "l1": "slide 37",
  "see": [
   "gwas",
   "summary-statistics"
  ],
  "links": [
   {
    "t": "GWAS Catalog (NHGRI-EBI)",
    "u": "https://www.ebi.ac.uk/gwas/"
   }
  ],
  "match": [
   "GWAS Catalog"
  ],
  "noPlural": true,
  "owner": "variation"
 },
 {
  "id": "summary-statistics",
  "term": "GWAS summary statistics",
  "aka": [
   "sumstats",
   "summary statistics"
  ],
  "short": "The per-variant results of a GWAS: for each variant its position, alleles, allele frequency, estimated effect, standard error, p-value and sample size. They contain no individual-level data and are often shared publicly.",
  "long": "Many later analyses need only summary statistics: meta-analysis, fine-mapping, LD score regression, Mendelian randomization and polygenic scores. Public collections include the GWAS Catalog's summary statistics and the Pan-UK Biobank results. Always check which allele the effect refers to and which genome build the positions use.",
  "see": [
   "gwas",
   "meta-analysis",
   "manhattan-plot",
   "effect-allele",
   "pan-ukbb"
  ],
  "links": [
   {
    "t": "GWAS Catalog: summary statistics",
    "u": "https://www.ebi.ac.uk/gwas/summary-statistics"
   },
   {
    "t": "Pan-UK Biobank",
    "u": "https://pan.ukbb.broadinstitute.org/"
   }
  ],
  "match": [
   "summary statistics",
   "summary-statistics",
   "sumstats",
   "summary statistic"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "the-data"
 },
 {
  "id": "haploid",
  "term": "haploid",
  "short": "Having one set of chromosomes. Human eggs and sperm are haploid, with 23 chromosomes each.",
  "see": [
   "diploid",
   "gamete"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Haploid",
    "u": "https://www.genome.gov/genetics-glossary/Haploid"
   }
  ],
  "match": [
   "haploid"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "cells-chromosomes"
 },
 {
  "id": "haplotype",
  "term": "haplotype",
  "aka": [
   "haplotypes"
  ],
  "short": "The sequence of alleles along one chromosome copy at a set of loci. A person has two haplotypes for each autosomal region, one on the maternal and one on the paternal copy.",
  "long": "In a haplotype matrix, each row is one chromosome copy and each column a SNP, with entries 1 (carries the counted allele) or 0. Adding a person's two rows gives their genotype dosages; the information lost in that sum is the <a href=\"glossary.html#phase\">phase</a>.",
  "l1": "slides 108, 112–114, 117, 121, 123–124",
  "see": [
   "phase",
   "phasing",
   "ld",
   "ld-block",
   "allele"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Haplotype",
    "u": "https://www.genome.gov/genetics-glossary/haplotype"
   }
  ],
  "match": [
   "haplotype"
  ],
  "cs": false,
  "auto": true,
  "owner": "haplotypes-ld"
 },
 {
  "id": "hrc",
  "term": "Haplotype Reference Consortium (HRC)",
  "aka": [
   "HRC"
  ],
  "short": "An imputation reference panel: 64,976 haplotypes from 32,488 people in 20 studies, mostly labeled European ancestry, at about 39 million SNPs. UK Biobank imputed with it, plus UK10K and 1000 Genomes for other variants.",
  "long": "At minor allele frequency 0.1%, imputation from an array of about 1 million SNPs reached \\(r^2 = 0.64\\) (squared correlation between imputed dosages and true genotypes) with the HRC, against 0.36 with 1000 Genomes.",
  "see": [
   "reference-panel",
   "genotype-imputation",
   "topmed",
   "thousand-genomes"
  ],
  "links": [
   {
    "t": "McCarthy et al. 2016: A reference panel of 64,976 haplotypes for genotype imputation",
    "u": "https://doi.org/10.1038/ng.3643"
   }
  ],
  "match": [
   "Haplotype Reference Consortium",
   "HRC"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "samples-to-genotypes"
 },
 {
  "id": "hard-call",
  "term": "hard call (best-guess genotype)",
  "aka": [
   "best-guess genotype"
  ],
  "short": "The single most probable genotype (0, 1 or 2) at an imputed variant. It discards the uncertainty that a dosage keeps; calls whose top probability is too low are often set to missing.",
  "long": "Example: \\(P(0) = 0.30\\), \\(P(1) = 0.55\\), \\(P(2) = 0.15\\) gives the hard call 1 but the dosage \\(0.55 + 2 \\times 0.15 = 0.85\\).",
  "see": [
   "dosage",
   "genotype-probability",
   "genotype-imputation"
  ],
  "links": [
   {
    "t": "IMPUTE2 documentation (output files and the info metric)",
    "u": "https://mathgen.stats.ox.ac.uk/impute/impute_v2.html"
   }
  ],
  "match": [
   "hard call",
   "best-guess genotype"
  ],
  "owner": "samples-to-genotypes"
 },
 {
  "id": "hwe",
  "term": "Hardy–Weinberg equilibrium (HWE)",
  "aka": [
   "Hardy-Weinberg equilibrium",
   "HWE",
   "Hardy–Weinberg proportions"
  ],
  "short": "The state in which genotype frequencies follow from allele frequencies as if each person’s two alleles were independent draws: \\(p^2\\), \\(2pq\\) and \\(q^2\\) for a biallelic SNP with allele frequencies \\(p\\) and \\(q = 1 - p\\). Random mating restores it in one generation.",
  "long": "Formal assumptions (slide 81): random mating, a very large population, discrete generations, equal allele frequencies in males and females, and no mutation, migration or selection. QC tests every SNP for HWE (chi-square with 1 degree of freedom, or the exact test PLINK uses); strong deviations point to genotyping error, duplicated sequence or pooled populations.",
  "l1": "slides 81–83",
  "see": [
   "random-mating",
   "genotype-frequency",
   "wahlund-effect",
   "heterozygosity"
  ],
  "links": [
   {
    "t": "Scitable: The Hardy-Weinberg Principle",
    "u": "https://www.nature.com/scitable/knowledge/library/the-hardy-weinberg-principle-13235724/"
   },
   {
    "t": "Wigginton et al. 2005: A note on exact tests of Hardy-Weinberg equilibrium",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC1199378/"
   }
  ],
  "match": [
   "Hardy–Weinberg equilibrium",
   "Hardy-Weinberg equilibrium",
   "Hardy–Weinberg proportions",
   "Hardy-Weinberg proportions",
   "HWE"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "allele-frequencies"
 },
 {
  "id": "harmonization",
  "term": "harmonization (allele harmonization)",
  "aka": [
   "harmonize"
  ],
  "short": "Making datasets comparable before combining them. For genetic variants: matching the genome build, the strand and the effect allele across files, by flipping strands, swapping alleles, or dropping SNPs that cannot be resolved.",
  "see": [
   "strand-flip",
   "allele-swap",
   "strand-ambiguous-snp",
   "summary-statistics"
  ],
  "links": [
   {
    "t": "TwoSampleMR: Harmonise data",
    "u": "https://mrcieu.github.io/TwoSampleMR/articles/harmonise.html"
   }
  ],
  "match": [
   "harmonization",
   "harmonize",
   "harmonizes",
   "harmonized",
   "harmonizing"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "dna"
 },
 {
  "id": "hazard-ratio",
  "term": "hazard ratio (HR)",
  "short": "The ratio of the rates at which an event occurs in two groups, for example smokers versus never-smokers, usually assumed constant during follow-up. 1 means no difference; 2 means the event happens twice as fast.",
  "see": [
   "incidence",
   "odds-ratio"
  ],
  "match": [
   "hazard ratio"
  ],
  "cs": false,
  "auto": true,
  "owner": "uk-biobank"
 },
 {
  "id": "hdl-cholesterol",
  "term": "HDL cholesterol",
  "aka": [
   "HDL-C",
   "high-density lipoprotein cholesterol"
  ],
  "short": "The cholesterol carried in the blood by high-density lipoprotein (HDL) particles. Higher levels go with fewer heart attacks in observational data, but Mendelian randomization suggests that raising HDL cholesterol does not lower risk.",
  "l1": "slide 23 (written “HLD”)",
  "see": [
   "lipoprotein",
   "ldl-cholesterol",
   "mendelian-randomization"
  ],
  "links": [
   {
    "t": "MedlinePlus: HDL, the “good” cholesterol",
    "u": "https://medlineplus.gov/hdlthegoodcholesterol.html"
   }
  ],
  "match": [
   "HDL cholesterol",
   "HDL-C"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "healthy-volunteer-bias",
  "term": "healthy volunteer bias",
  "short": "The tendency of health-study volunteers to be healthier and better off than the population they come from. UK Biobank participants smoke less, are less often obese and die less often than people their age.",
  "long": "It biases estimates of prevalence and incidence, and it can bias some exposure–outcome associations through selection (collider) bias.",
  "see": [
   "selection-bias",
   "generalizability"
  ],
  "links": [
   {
    "t": "Fry et al. (2017), Am J Epidemiol",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC5860371/"
   }
  ],
  "match": [
   "healthy volunteer bias",
   "healthy-volunteer bias",
   "healthy volunteer effect",
   "healthy volunteer selection bias"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "uk-biobank"
 },
 {
  "id": "haematology",
  "term": "hematology (complete blood count)",
  "aka": [
   "haematology",
   "full blood count"
  ],
  "short": "Counts and sizes of the cells in blood (red cells, each type of white cell, and platelets) together with hemoglobin. UK Biobank measured them on fresh blood, typically within 24 hours of the draw.",
  "see": [
   "biomarker",
   "blood-biochemistry"
  ],
  "match": [
   "hematology",
   "haematology",
   "complete blood count",
   "full blood count"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "phenotypes"
 },
 {
  "id": "hematopoietic-stem-cell",
  "term": "hematopoietic stem cell (HSC)",
  "aka": [
   "blood stem cell",
   "haematopoietic stem cell"
  ],
  "short": "A bone-marrow cell that divides both to renew itself and to produce every type of blood cell. An estimated 50,000–200,000 are actively making white blood cells at any time in an adult.",
  "see": [
   "clonal-hematopoiesis",
   "clone"
  ],
  "match": [
   "hematopoietic stem cell",
   "haematopoietic stem cell",
   "blood stem cell"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "cells-chromosomes"
 },
 {
  "id": "hemizygous",
  "term": "hemizygous",
  "short": "Having only one copy of a chromosome region instead of two. Males are hemizygous for most of the X chromosome (outside the pseudoautosomal regions), so they carry one allele at each such X variant.",
  "see": [
   "x-chromosome",
   "pseudoautosomal-region"
  ],
  "match": [
   "hemizygous",
   "hemizygosity"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "cells-chromosomes"
 },
 {
  "id": "hemoglobin",
  "term": "hemoglobin",
  "aka": [
   "haemoglobin",
   "HbA"
  ],
  "short": "The oxygen-carrying protein of red blood cells, made of four globin chains, each holding an iron-containing heme group. Adult hemoglobin (HbA) has two α and two β chains; β-globin is encoded by <em>HBB</em>.",
  "l1": "slide 17",
  "see": [
   "fetal-hemoglobin",
   "hemoglobinopathy",
   "sickle-cell-disease"
  ],
  "links": [
   {
    "t": "MedlinePlus Genetics: HBB gene",
    "u": "https://medlineplus.gov/genetics/gene/hbb/"
   }
  ],
  "match": [
   "hemoglobin",
   "haemoglobin"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "hemoglobinopathy",
  "term": "hemoglobinopathy",
  "short": "An inherited disorder of hemoglobin, caused by variants in a globin gene. Examples are sickle cell disease and β-thalassemia, both of which involve <em>HBB</em>.",
  "l1": "slides 17, 19, 28",
  "see": [
   "hemoglobin",
   "sickle-cell-disease",
   "beta-thalassemia"
  ],
  "links": [
   {
    "t": "MedlinePlus Genetics: Sickle cell disease",
    "u": "https://medlineplus.gov/genetics/condition/sickle-cell-disease/"
   },
   {
    "t": "MedlinePlus Genetics: Beta thalassemia",
    "u": "https://medlineplus.gov/genetics/condition/beta-thalassemia/"
   }
  ],
  "match": [
   "hemoglobinopathy",
   "hemoglobinopathies",
   "haemoglobinopathy",
   "haemoglobinopathies"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "genes-expression"
 },
 {
  "id": "heritability",
  "term": "heritability (h²)",
  "aka": [
   "h²",
   "narrow-sense heritability",
   "broad-sense heritability"
  ],
  "short": "The share of a trait’s variance, in a given population and environment, that is due to genetic differences between people. It describes variation in a population, not how genetic one person’s trait is.",
  "long": "Narrow-sense heritability, \\(h^2 = V_{\\mathrm{A}}/V_{\\mathrm{P}}\\), counts only the additive genetic variance \\(V_{\\mathrm{A}}\\); broad-sense heritability, \\(H^2 = V_{\\mathrm{G}}/V_{\\mathrm{P}}\\), counts all genetic variance \\(V_{\\mathrm{G}}\\), including dominance and interactions. \\(V_{\\mathrm{P}}\\) is the variance of the trait in the population. It is estimated from relatives (for example twin studies) or from SNPs (SNP-heritability).",
  "l1": "slides 29, 30, 50",
  "see": [
   "snp-heritability",
   "missing-heritability",
   "twin-study"
  ],
  "links": [
   {
    "t": "MedlinePlus: What is heritability?",
    "u": "https://medlineplus.gov/genetics/understanding/inheritance/heritability/"
   }
  ],
  "match": [
   "heritability"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "heterogeneity",
  "term": "heterogeneity (between studies)",
  "aka": [
   "between-study heterogeneity"
  ],
  "short": "In a meta-analysis, variation in the true effect between studies, seen as estimates that differ more than sampling error explains. Cochran’s \\(Q\\) tests for it; \\(I^2\\) estimates the share of the variation between the estimates that it accounts for.",
  "long": "It can arise from differences between studies in LD with the causal variant, in environments or in how the phenotype was measured. Random-effects models allow for it.",
  "see": [
   "meta-analysis",
   "fixed-random-effects"
  ],
  "match": [
   "between-study heterogeneity",
   "heterogeneity test",
   "heterogeneity testing",
   "test of heterogeneity",
   "test for heterogeneity"
  ],
  "owner": "the-data"
 },
 {
  "id": "heterozygosity",
  "term": "heterozygosity",
  "aka": [
   "heterozygosity rate"
  ],
  "short": "The fraction of genotypes that are heterozygous. At one SNP across people, its HWE expectation is 2pq (at most 0.5). Across many SNPs in one person it is the heterozygosity rate, a sample-QC metric.",
  "long": "Unusually high heterozygosity in a sample suggests DNA contamination; unusually low heterozygosity suggests related parents or poor DNA quality. Heterozygosity also differs with ancestry, so QC compares people within genetically similar groups or adjusts for ancestry, as UK Biobank did.",
  "l1": "slides 65, 70",
  "see": [
   "inbreeding-coefficient",
   "hwe",
   "heterozygous"
  ],
  "links": [
   {
    "t": "Anderson et al. 2010: Data quality control in genetic case-control association studies",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3025522/"
   }
  ],
  "match": [
   "heterozygosity rate",
   "heterozygosity"
  ],
  "noPlural": true,
  "owner": "allele-frequencies"
 },
 {
  "id": "heterozygous",
  "term": "heterozygous",
  "aka": [
   "heterozygote"
  ],
  "short": "Carrying two different alleles at a locus, for example G/A. Coded 1 in 0/1/2 genotype data.",
  "see": [
   "homozygous",
   "genotype",
   "heterozygosity"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Heterozygous",
    "u": "https://www.genome.gov/genetics-glossary/Heterozygous"
   }
  ],
  "match": [
   "heterozygous",
   "heterozygote"
  ],
  "owner": "variation"
 },
 {
  "id": "hgvs",
  "term": "HGVS nomenclature",
  "aka": [
   "HGVS"
  ],
  "short": "The standard way to name a sequence change relative to a named reference sequence: g. genomic, c. coding DNA (c.1 is the A of the ATG start codon), p. protein; for example NM_000518.5:c.20A>T, p.(Glu7Val).",
  "long": "Parentheses in p.(…) mean the protein change is predicted from DNA, not measured. Ter or * marks a stop codon; in a run of identical bases, a deletion or duplication is assigned to the most 3′ position (the 3′ rule).",
  "see": [
   "rsid",
   "variant-consequence",
   "mane-select"
  ],
  "links": [
   {
    "t": "HGVS Nomenclature",
    "u": "https://hgvs-nomenclature.org/stable/"
   }
  ],
  "match": [
   "HGVS"
  ],
  "owner": "variation"
 },
 {
  "id": "histone",
  "term": "histone",
  "short": "A small protein that binds DNA. Eight histones form the core of a nucleosome, around which DNA wraps; chemical marks on histones differ between genes that are in use and genes that are not.",
  "see": [
   "nucleosome",
   "chromatin"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Histone",
    "u": "https://www.genome.gov/genetics-glossary/Histone"
   }
  ],
  "match": [
   "histone"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "cells-chromosomes"
 },
 {
  "id": "homologous-chromosomes",
  "term": "homologous chromosomes",
  "aka": [
   "homologs"
  ],
  "short": "The two copies of the same chromosome in a diploid cell, one from each parent. They carry the same genes in the same order but differ in sequence at some positions.",
  "see": [
   "diploid",
   "chromatid"
  ],
  "links": [
   {
    "t": "MedlinePlus Genetics: How many chromosomes do people have?",
    "u": "https://medlineplus.gov/genetics/understanding/basics/howmanychromosomes/"
   }
  ],
  "match": [
   "homologous chromosome"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "cells-chromosomes"
 },
 {
  "id": "homozygous",
  "term": "homozygous",
  "aka": [
   "homozygote"
  ],
  "short": "Carrying two identical alleles at a locus, for example G/G or A/A. Coded 0 or 2 in 0/1/2 genotype data.",
  "l1": "slide 16",
  "see": [
   "heterozygous",
   "genotype"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Homozygous",
    "u": "https://www.genome.gov/genetics-glossary/Homozygous"
   }
  ],
  "match": [
   "homozygous",
   "homozygote"
  ],
  "owner": "variation"
 },
 {
  "id": "hes",
  "term": "Hospital Episode Statistics (HES)",
  "short": "NHS England's database of hospital activity. Its Admitted Patient Care records list each inpatient stay with diagnosis codes (ICD-10) and procedure codes (OPCS-4). UK Biobank holds them for participants in England from 1997.",
  "long": "Wales (Patient Episode Database for Wales, PEDW, from 1991; ICD-10 codes from 1999) and Scotland (Scottish Morbidity Records, SMR, from 1981; ICD-9 until 1996, ICD-10 since) supply equivalent records, according to UK Biobank’s data-providers table.",
  "see": [
   "record-linkage",
   "icd-10",
   "opcs-4"
  ],
  "links": [
   {
    "t": "UK Biobank: Hospital inpatient data (PDF)",
    "u": "https://biobank.ndph.ox.ac.uk/ukb/ukb/docs/HospitalEpisodeStatistics.pdf"
   }
  ],
  "match": [
   "Hospital Episode Statistics",
   "HES"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "uk-biobank"
 },
 {
  "id": "hgdp",
  "term": "Human Genome Diversity Project (HGDP)",
  "short": "A reference collection of cell lines and DNA from about 1,050 people in 52 populations worldwide (the HGDP-CEPH panel); 929 have high-coverage genomes. Often combined with 1000 Genomes as a reference for genetic similarity.",
  "see": [
   "thousand-genomes",
   "reference-population",
   "pan-ukbb"
  ],
  "match": [
   "HGDP",
   "Human Genome Diversity Project"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "ancestry"
 },
 {
  "id": "hybridization",
  "term": "hybridization",
  "short": "The binding of a single DNA strand to a strand with the complementary sequence (A with T, C with G). Genotyping arrays and exome capture use it to select specific sequences from a person’s DNA.",
  "long": "Hybridization depends on how well the two sequences match, so a second variant inside a probe's target can weaken binding and distort the signal for that SNP.",
  "see": [
   "complementary",
   "base-pair",
   "probe",
   "genotyping-array"
  ],
  "links": [
   {
    "t": "NHGRI: DNA Microarray Technology Fact Sheet",
    "u": "https://www.genome.gov/about-genomics/fact-sheets/DNA-Microarray-Technology"
   }
  ],
  "match": [
   "hybridization",
   "hybridize"
  ],
  "noPlural": true,
  "owner": "samples-to-genotypes"
 },
 {
  "id": "hydrogen-bond",
  "term": "hydrogen bond",
  "short": "A weak attraction between a hydrogen atom and a nearby oxygen or nitrogen atom. Two hydrogen bonds hold an A–T pair and three a C–G pair; being weak, they let strands separate and pair again.",
  "l1": "slides 57, 62",
  "see": [
   "base-pair",
   "complementary"
  ],
  "match": [
   "hydrogen bond"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "dna"
 },
 {
  "id": "ibs0",
  "term": "IBS0",
  "aka": [
   "opposite homozygotes"
  ],
  "short": "The fraction of SNPs where two people share no allele, such as AA and GG. It is near 0 for parent–child pairs but not for full siblings, so KING uses it to tell them apart.",
  "long": "A parent and child share one allele IBD at every locus, so opposite homozygotes arise only from genotyping errors; full siblings share no allele IBD in about a quarter of the genome.",
  "see": [
   "ibs",
   "kinship-coefficient",
   "ibd"
  ],
  "links": [
   {
    "t": "KING tutorial",
    "u": "https://www.kingrelatedness.com/manual.shtml"
   }
  ],
  "match": [
   "IBS0"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "inheritance"
 },
 {
  "id": "icd-10",
  "term": "ICD-10",
  "aka": [
   "International Classification of Diseases, 10th revision"
  ],
  "short": "The World Health Organization’s International Classification of Diseases, 10th revision: codes for diseases and causes of death, grouped into chapters and blocks, with 3-character categories (such as I21) and 4-character subcategories (such as I21.4).",
  "long": "UK hospital, death and cancer records use the WHO version. US clinical records use a different, more detailed version (ICD-10-CM). Older records use the previous revision, ICD-9.",
  "see": [
   "case-definition",
   "phecode",
   "opcs-4",
   "read-codes"
  ],
  "links": [
   {
    "t": "WHO ICD-10 browser (2019 version)",
    "u": "https://icd.who.int/browse10/2019/en"
   }
  ],
  "match": [
   "ICD-10",
   "ICD10",
   "International Classification of Diseases"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "phenotypes"
 },
 {
  "id": "ibd",
  "term": "identity by descent (IBD)",
  "aka": [
   "identical by descent",
   "IBD"
  ],
  "short": "Allele copies are identical by descent when both were inherited from the same copy in a recent common ancestor. Relatedness is measured by the genome fractions where people share 0, 1 or 2 IBD copies.",
  "long": "Contrast with identity by state (IBS), which only requires the same DNA sequence. IBD is estimated from genotypes, for example by PLINK <code>--genome</code> (Z0, Z1, Z2, PI_HAT) or by KING. Elsewhere in medicine IBD can also abbreviate inflammatory bowel disease.",
  "see": [
   "ibs",
   "kinship-coefficient",
   "pi-hat",
   "degree-of-relationship"
  ],
  "links": [
   {
    "t": "Thompson (2013), Identity by descent (Genetics, free via PMC)",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3664843/"
   },
   {
    "t": "PLINK 1.9: identity by descent",
    "u": "https://www.cog-genomics.org/plink/1.9/ibd"
   }
  ],
  "match": [
   "identity by descent",
   "identical by descent",
   "identity-by-descent",
   "identical-by-descent",
   "IBD"
  ],
  "noPlural": true,
  "owner": "inheritance"
 },
 {
  "id": "ibs",
  "term": "identity by state (IBS)",
  "aka": [
   "identical by state",
   "IBS"
  ],
  "short": "Allele copies are identical by state if they have the same sequence (at a SNP, the same base), whether or not they come from a shared ancestor. Unrelated people are often IBS at common SNPs.",
  "long": "IBD implies IBS (apart from new mutations), but not the reverse. Relatedness methods combine IBS counts across many SNPs with allele frequencies to estimate IBD.",
  "see": [
   "ibd",
   "ibs0"
  ],
  "match": [
   "identity by state",
   "identical by state",
   "identity-by-state",
   "identical-by-state",
   "IBS"
  ],
  "noPlural": true,
  "owner": "inheritance"
 },
 {
  "id": "ideogram",
  "term": "ideogram",
  "short": "A standard drawing of a chromosome that shows its pattern of light and dark bands, its centromere and its arms; used to show where genes and variants lie.",
  "see": [
   "cytogenetic-band",
   "karyotype"
  ],
  "links": [
   {
    "t": "MedlinePlus Genetics: How do geneticists indicate the location of a gene?",
    "u": "https://medlineplus.gov/genetics/understanding/howgeneswork/genelocation/"
   }
  ],
  "match": [
   "ideogram"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "cells-chromosomes"
 },
 {
  "id": "imaging-derived-phenotype",
  "term": "imaging-derived phenotype (IDP)",
  "short": "A number computed from a medical image by an automated pipeline, such as the volume of a brain region or liver fat content. UK Biobank provides thousands of them from its imaging visits.",
  "see": [
   "imaging-study",
   "quantitative-trait"
  ],
  "match": [
   "imaging-derived phenotype",
   "imaging derived phenotype"
  ],
  "cs": false,
  "auto": true,
  "owner": "phenotypes"
 },
 {
  "id": "inframe-indel",
  "term": "in-frame insertion or deletion",
  "aka": [
   "in-frame indel",
   "inframe deletion",
   "inframe insertion"
  ],
  "short": "An insertion or deletion of a multiple of 3 bases in coding sequence. It adds or removes whole amino acids but keeps the reading frame, so the rest of the protein is unchanged.",
  "see": [
   "indel",
   "frameshift-variant",
   "reading-frame"
  ],
  "match": [
   "in-frame insertion",
   "in-frame deletion",
   "in-frame indel",
   "inframe insertion",
   "inframe deletion"
  ],
  "owner": "variation"
 },
 {
  "id": "inbreeding-coefficient",
  "term": "inbreeding coefficient (F)",
  "short": "The probability that a person’s two alleles at a locus are identical by descent from an ancestor shared by both parents: 1/16 for a child of first cousins. PLINK --het estimates it from excess homozygosity.",
  "long": "A person’s inbreeding coefficient equals the kinship coefficient of their two parents. PLINK estimates it as \\(\\hat{F} = (O(\\mathrm{HOM}) - E(\\mathrm{HOM}))/(N(\\mathrm{NM}) - E(\\mathrm{HOM}))\\), where \\(O(\\mathrm{HOM})\\) is the person’s number of homozygous genotypes, \\(E(\\mathrm{HOM})\\) the number expected under Hardy–Weinberg equilibrium and \\(N(\\mathrm{NM})\\) the number of non-missing genotypes: the fraction of the expected heterozygous genotypes that are missing. \\(\\hat{F} &lt; 0\\) means more heterozygous genotypes than expected, a sign of sample contamination. At one SNP across \\(n\\) people, \\(\\hat{F} = 1 - (n_{12}/n)/(2\\hat{p}\\hat{q})\\), with \\(n_{12}\\) the number of heterozygous people, measures the departure from HWE.",
  "see": [
   "heterozygosity",
   "kinship-coefficient",
   "ibd",
   "consanguinity"
  ],
  "links": [
   {
    "t": "PLINK 1.9: basic statistics (--het)",
    "u": "https://www.cog-genomics.org/plink/1.9/basic_stats"
   },
   {
    "t": "Coop: Population and Quantitative Genetics (free lecture notes)",
    "u": "https://github.com/cooplab/popgen-notes"
   }
  ],
  "match": [
   "inbreeding coefficient"
  ],
  "owner": "allele-frequencies"
 },
 {
  "id": "incidence",
  "term": "incidence",
  "short": "How often new cases arise among people who did not have the condition. The incidence rate is the number of new cases divided by the person-time at risk; the cumulative incidence (risk) over a period is the number of new cases divided by the number of people at risk at its start.",
  "long": "Cases that arise after a participant's baseline visit are incident cases; conditions already present at baseline are prevalent.",
  "see": [
   "prevalence",
   "person-time",
   "cohort-study"
  ],
  "match": [
   "incidence",
   "incidence rate",
   "cumulative incidence"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "uk-biobank"
 },
 {
  "id": "incident-case",
  "term": "incident case",
  "short": "A person first diagnosed with the disease during follow-up (in UK Biobank, after the baseline visit). Incident cases are used to study what predicts new disease, often as a time-to-event outcome.",
  "see": [
   "prevalent-case",
   "incidence",
   "time-to-event"
  ],
  "match": [
   "incident case"
  ],
  "cs": false,
  "auto": true,
  "owner": "phenotypes"
 },
 {
  "id": "indel",
  "term": "indel",
  "aka": [
   "insertion/deletion",
   "short insertion or deletion"
  ],
  "short": "A short insertion or deletion of DNA bases, by convention fewer than 50. Inside a gene's coding sequence, an indel whose length is not a multiple of 3 shifts the reading frame.",
  "l1": "slide 93",
  "see": [
   "frameshift-variant",
   "inframe-indel",
   "structural-variant"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Insertion",
    "u": "https://www.genome.gov/genetics-glossary/Insertion"
   },
   {
    "t": "NHGRI Talking Glossary: Deletion",
    "u": "https://www.genome.gov/genetics-glossary/Deletion"
   }
  ],
  "match": [
   "indel"
  ],
  "owner": "variation"
 },
 {
  "id": "independent-assortment",
  "term": "independent assortment",
  "aka": [
   "Mendel's second law"
  ],
  "short": "Mendel's second law: alleles at loci on different chromosomes are passed on independently, because each chromosome pair separates independently during meiosis. Loci close together on one chromosome are the exception (genetic linkage).",
  "long": "With 23 chromosome pairs, a parent can produce 2<sup>23</sup> = 8,388,608 combinations of whole chromosomes, before crossing over creates further combinations.",
  "see": [
   "mendels-laws",
   "genetic-linkage",
   "meiosis"
  ],
  "match": [
   "independent assortment",
   "law of independent assortment",
   "Mendel's second law",
   "Mendel’s second law"
  ],
  "noPlural": true,
  "owner": "inheritance"
 },
 {
  "id": "info-score",
  "term": "INFO score (imputation quality)",
  "aka": [
   "INFO",
   "imputation R²",
   "Rsq",
   "imputation quality score"
  ],
  "short": "A per-variant measure of imputation quality from 0 to 1 that approximates the squared correlation between imputed dosages and true genotypes. IMPUTE reports INFO, minimac an estimated R²; filters at 0.3 or 0.5 are common.",
  "long": "A variant imputed with quality \\(r^2\\) (the squared correlation between its imputed dosages and the true genotypes) needs about \\(1/r^2\\) times as many people for the same power as a measured one: testing the dosage instead of the true genotype multiplies the expected association test statistic by about \\(r^2\\). UK Biobank distributes per-variant INFO scores and allele frequencies in a separate file (Resource 1967).",
  "see": [
   "genotype-imputation",
   "dosage",
   "r-squared",
   "maf"
  ],
  "links": [
   {
    "t": "IMPUTE2 documentation (output files and the info metric)",
    "u": "https://mathgen.stats.ox.ac.uk/impute/impute_v2.html"
   },
   {
    "t": "Das et al. 2016: Next-generation genotype imputation service and methods",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC5157836/"
   }
  ],
  "match": [
   "INFO score",
   "INFO",
   "imputation quality score",
   "Imputation quality score",
   "imputation quality",
   "Imputation quality"
  ],
  "cs": true,
  "owner": "samples-to-genotypes"
 },
 {
  "id": "informed-consent",
  "term": "informed consent",
  "aka": [
   "broad consent"
  ],
  "short": "A person’s voluntary agreement to join research after being told its purpose, procedures, risks and their right to withdraw. UK Biobank used broad consent: data and samples may be used for any health-related research.",
  "see": [
   "participant-withdrawal",
   "uk-biobank"
  ],
  "match": [
   "informed consent",
   "broad consent"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "uk-biobank"
 },
 {
  "id": "instance",
  "term": "instance",
  "short": "In UK Biobank, the index of the visit or repeat at which a value was collected. For assessment-centre visits: 0 baseline (2006–2010), 1 repeat (2012–13), 2 first imaging (from 2014), 3 repeat imaging (from 2019).",
  "see": [
   "data-field",
   "array-index",
   "baseline"
  ],
  "match": [
   "instance"
  ],
  "cs": false,
  "auto": false,
  "owner": "phenotypes"
 },
 {
  "id": "instrumental-variable",
  "term": "instrumental variable",
  "aka": [
   "instrument"
  ],
  "short": "A variable that is associated with an exposure, shares no common cause with the outcome, and affects the outcome only through the exposure. It allows a causal effect to be estimated despite unmeasured confounding.",
  "l1": "slide 22",
  "see": [
   "mendelian-randomization",
   "confounding"
  ],
  "match": [
   "instrumental variable"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "intergenic",
  "term": "intergenic",
  "aka": [],
  "short": "Lying between genes rather than within one. Most intergenic variants have no known function, but some sit in enhancers that control genes nearby or far away.",
  "see": [
   "noncoding-variant",
   "enhancer"
  ],
  "match": [
   "intergenic"
  ],
  "noPlural": true,
  "owner": "variation"
 },
 {
  "id": "hapmap",
  "term": "International HapMap Project",
  "short": "An international project that mapped common SNPs and LD in reference samples: 269 people from four populations in phase I (YRI, CEU, CHB, JPT; 2005) and 1,184 people from 11 populations in phase 3 (2010).",
  "l1": "slides 92, 95–96",
  "see": [
   "thousand-genomes",
   "reference-population"
  ],
  "match": [
   "HapMap",
   "International HapMap Project"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "ancestry"
 },
 {
  "id": "intron",
  "term": "intron",
  "short": "A segment of a gene between two exons. It is copied into pre-mRNA and then removed by splicing, so it is not translated. Introns can contain regulatory elements such as enhancers.",
  "l1": "slide 62",
  "see": [
   "exon",
   "splicing"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Intron",
    "u": "https://www.genome.gov/genetics-glossary/Intron"
   }
  ],
  "match": [
   "intron"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "inversion",
  "term": "inversion",
  "aka": [],
  "short": "A structural variant in which a segment of a chromosome is reversed end to end, so its sequence reads in the opposite orientation.",
  "l1": "slide 93",
  "see": [
   "structural-variant",
   "translocation"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Inversion",
    "u": "https://www.genome.gov/genetics-glossary/Inversion"
   }
  ],
  "match": [
   "inversion"
  ],
  "owner": "variation"
 },
 {
  "id": "karyotype",
  "term": "karyotype",
  "short": "A person's set of chromosomes, and the image used to show it: chromosomes from a dividing cell, stained and arranged in pairs by number. Written, for example, as 46,XX or 46,XY.",
  "l1": "slide 60",
  "see": [
   "chromosome",
   "cytogenetic-band"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Karyotype",
    "u": "https://www.genome.gov/genetics-glossary/Karyotype"
   },
   {
    "t": "Learn.Genetics: Make a Karyotype",
    "u": "https://learn.genetics.utah.edu/content/basics/karyotype/"
   }
  ],
  "match": [
   "karyotype"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "cells-chromosomes"
 },
 {
  "id": "kilobase",
  "term": "kilobase (kb)",
  "aka": [
   "kb"
  ],
  "short": "A unit of DNA length: 1 kb = 1,000 base pairs. For example, the <em>ALDH2</em> gene spans about 51 kb.",
  "see": [
   "base-pair",
   "megabase",
   "gigabase"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Kilobase",
    "u": "https://www.genome.gov/genetics-glossary/Kilobase"
   }
  ],
  "match": [
   "kilobase",
   "kilobases",
   "kb"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "dna"
 },
 {
  "id": "kinship-coefficient",
  "term": "kinship coefficient (φ)",
  "aka": [
   "coefficient of kinship",
   "kinship"
  ],
  "short": "The probability that alleles drawn at random from two people at the same locus, one from each, are identical by descent: half the proportion IBD. Parent–child and full siblings: 1/4; second-degree relatives: 1/8.",
  "long": "A person’s kinship with themselves (or with an identical twin) is 1/2, and a child’s inbreeding coefficient equals the kinship of its parents. KING and the UK Biobank relatedness file report kinship; PLINK's PI_HAT reports the proportion IBD, which is twice the kinship. KING's cut-offs between degrees are 0.354, 0.177, 0.0884 and 0.0442 (Manichaikul et al. 2010).",
  "see": [
   "ibd",
   "pi-hat",
   "degree-of-relationship",
   "ibs0"
  ],
  "links": [
   {
    "t": "KING tutorial",
    "u": "https://www.kingrelatedness.com/manual.shtml"
   }
  ],
  "match": [
   "kinship coefficient",
   "kinship coefficients",
   "coefficient of kinship",
   "kinship"
  ],
  "noPlural": true,
  "owner": "inheritance"
 },
 {
  "id": "lactase-persistence",
  "term": "lactase persistence",
  "short": "Continued production into adulthood of lactase, the enzyme that digests milk sugar (lactose). In studies of people from Europe it is strongly associated with the A allele of rs4988235 (−13910*T), near the lactase gene <em>LCT</em>.",
  "long": "rs4988235 is a regulatory variant about 14 kb upstream of <em>LCT</em>; −13910*T is its name on the gene’s strand. The allele became common in populations that kept dairy animals: its frequency is 0.51 in the 1000 Genomes EUR samples and 0 in the EAS samples. Other variants near <em>LCT</em> produce lactase persistence in some pastoralist populations in Africa.",
  "see": [
   "natural-selection",
   "regulatory-variant"
  ],
  "links": [
   {
    "t": "Tishkoff et al. 2007: Convergent adaptation of human lactase persistence in Africa and Europe",
    "u": "https://doi.org/10.1038/ng1946"
   },
   {
    "t": "Ensembl: population allele frequencies for rs4988235",
    "u": "https://www.ensembl.org/Homo_sapiens/Variation/Population?v=rs4988235"
   }
  ],
  "match": [
   "lactase persistence"
  ],
  "noPlural": true,
  "owner": "allele-frequencies"
 },
 {
  "id": "segregation",
  "term": "law of segregation",
  "aka": [
   "Mendel's first law",
   "Mendelian segregation"
  ],
  "short": "Mendel's first law: the two alleles a person carries at a locus separate during meiosis, so each sperm or egg receives exactly one of them, each with probability ½, independently for every child.",
  "long": "For a child of two heterozygous parents, the number of copies of an allele is the sum of two independent \\(\\Bernoulli(\\tfrac{1}{2})\\) draws, one per parent (1 if that parent transmits the allele), so it follows \\(\\Binomial(2, \\tfrac{1}{2})\\): 0, 1 or 2 copies with probabilities \\(\\tfrac{1}{4}\\), \\(\\tfrac{1}{2}\\) and \\(\\tfrac{1}{4}\\).",
  "see": [
   "mendels-laws",
   "meiosis",
   "punnett-square"
  ],
  "links": [
   {
    "t": "Scitable: Gregor Mendel and the Principles of Inheritance",
    "u": "https://www.nature.com/scitable/topicpage/gregor-mendel-and-the-principles-of-inheritance-593/"
   }
  ],
  "match": [
   "law of segregation",
   "Mendelian segregation",
   "segregation of alleles",
   "Mendel's first law",
   "Mendel’s first law"
  ],
  "noPlural": true,
  "owner": "inheritance"
 },
 {
  "id": "ld-block",
  "term": "LD block (haplotype block)",
  "aka": [
   "haplotype block"
  ],
  "short": "A stretch of the genome in which SNPs are in strong LD with each other and only a few common haplotypes occur, typically bounded by recombination hotspots. Blocks are shorter in samples from African populations.",
  "long": "In early studies, three to five common haplotypes captured about 90% of chromosomes in a typical block (Gabriel et al. 2002). On an \\(r^2\\) heatmap, blocks appear as dark triangles along the diagonal.",
  "see": [
   "ld",
   "recombination-hotspot",
   "haplotype",
   "tag-snp"
  ],
  "match": [
   "LD block",
   "haplotype block"
  ],
  "cs": false,
  "auto": true,
  "owner": "haplotypes-ld"
 },
 {
  "id": "ld-clumping",
  "term": "LD clumping",
  "aka": [
   "clumping"
  ],
  "short": "Grouping associated SNPs: take the SNP with the smallest p value, assign nearby SNPs in LD with it to its clump, and repeat. This gives one index SNP per association signal (PLINK <code>--clump</code>).",
  "long": "PLINK 1.9 defaults: index SNPs with p ≤ 10<sup>−4</sup>; clump members within 250 kb of the index SNP with \\(r^2 &gt; 0.5\\) to it. Clumping and p-value thresholding is a classic way to build polygenic scores.",
  "see": [
   "ld-pruning",
   "lead-variant",
   "polygenic-score"
  ],
  "match": [
   "LD clumping",
   "clumping"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "haplotypes-ld"
 },
 {
  "id": "ld-decay",
  "term": "LD decay",
  "aka": [
   "decay of LD"
  ],
  "short": "The decline of LD with growing distance between two loci, and over generations, as recombination breaks up ancestral haplotypes. Plots of average \\(r^2\\) against distance show it; it is fastest in samples from African populations.",
  "l1": "slides 86, 95–96",
  "see": [
   "ld",
   "recombination",
   "ld-block",
   "effective-population-size"
  ],
  "match": [
   "LD decay",
   "decay of LD"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "haplotypes-ld"
 },
 {
  "id": "ld-pruning",
  "term": "LD pruning",
  "aka": [
   "pruning"
  ],
  "short": "Thinning a set of SNPs so that no two nearby SNPs have \\(r^2\\) above a threshold, without looking at association results, for example with PLINK <code>--indep-pairwise 50 5 0.2</code>. Used before PCA and relatedness estimation.",
  "long": "Regions of long-range LD, such as the MHC, are usually removed as well. Compare <a href=\"glossary.html#ld-clumping\">LD clumping</a>, which uses p values.",
  "see": [
   "ld-clumping",
   "ld",
   "pca"
  ],
  "match": [
   "LD pruning",
   "LD-pruning",
   "LD-pruned",
   "pruning"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "haplotypes-ld"
 },
 {
  "id": "ld-reference-panel",
  "term": "LD reference panel",
  "aka": [
   "LD reference"
  ],
  "short": "Haplotypes or precomputed LD values from a reference sample such as 1000 Genomes, used when a study’s own genotypes are unavailable. It should be genetically similar to the study sample, because LD differs between populations.",
  "long": "Examples are the 1000 Genomes haplotypes and the LD matrices released by Pan-UK Biobank. Fine-mapping and conditional analyses from summary statistics are sensitive to mismatches between the reference and the study sample.",
  "see": [
   "reference-panel",
   "thousand-genomes",
   "fine-mapping",
   "ld-clumping"
  ],
  "match": [
   "LD reference panel",
   "LD reference"
  ],
  "cs": false,
  "auto": true,
  "owner": "haplotypes-ld"
 },
 {
  "id": "ld-score",
  "term": "LD score",
  "aka": [
   "LD Score"
  ],
  "short": "For a SNP \\(j\\), the sum of its \\(r^2\\) with every SNP \\(k\\) within 1 cM, itself included: \\(\\ell_j = \\sum_k r^2_{jk}\\), where the term for \\(k = j\\) is 1. It measures how much nearby variation the SNP tags. Used in LD score regression.",
  "see": [
   "ld-score-regression",
   "r-squared"
  ],
  "match": [
   "LD score",
   "LD Score"
  ],
  "cs": false,
  "auto": true,
  "owner": "haplotypes-ld"
 },
 {
  "id": "ld-score-regression",
  "term": "LD score regression (LDSC)",
  "aka": [
   "LDSC"
  ],
  "short": "Regressing GWAS \\(\\chi^2\\) statistics on LD scores. Polygenic signal rises with LD score, so the slope estimates SNP-heritability; population stratification raises \\(\\chi^2\\) roughly equally whatever a SNP’s LD score, giving an intercept above 1.",
  "long": "Model: \\(\\E[\\chi^2_j] = N h^2 \\ell_j / M + N a + 1\\) (Bulik-Sullivan et al. 2015), where \\(\\chi^2_j\\) is SNP \\(j\\)’s association statistic, \\(N\\) the sample size, \\(h^2\\) the SNP-heritability, \\(\\ell_j\\) the LD score, \\(M\\) the number of SNPs, and \\(N a\\) the contribution of confounding such as population stratification and cryptic relatedness. Each SNP explains on average \\(h^2/M\\) of the trait variance, and a SNP’s statistic picks up the effects of all the SNPs it tags, so its expected excess over 1 (the mean of \\(\\chi^2_1\\) under no association) grows in proportion to \\(\\ell_j\\). Covered in Session 5 of the course.",
  "see": [
   "ld-score",
   "snp-heritability",
   "population-stratification",
   "genomic-inflation"
  ],
  "links": [
   {
    "t": "Bulik-Sullivan et al. 2015, LD Score regression (Nat Genet)",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC4495769/"
   }
  ],
  "match": [
   "LD score regression",
   "LD Score regression",
   "LDSC"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "haplotypes-ld"
 },
 {
  "id": "ldl-cholesterol",
  "term": "LDL cholesterol",
  "aka": [
   "LDL-C",
   "low-density lipoprotein cholesterol"
  ],
  "short": "The cholesterol carried in the blood by low-density lipoprotein (LDL) particles, measured in mmol/L (UK Biobank Data-Field 30780) or mg/dL. High LDL cholesterol causes atherosclerosis and coronary artery disease.",
  "long": "1 mmol/L of cholesterol = 38.67 mg/dL.",
  "l1": "slides 15, 16, 32",
  "see": [
   "lipoprotein",
   "statin",
   "atherosclerosis",
   "hdl-cholesterol"
  ],
  "links": [
   {
    "t": "MedlinePlus: LDL, the “bad” cholesterol",
    "u": "https://medlineplus.gov/ldlthebadcholesterol.html"
   }
  ],
  "match": [
   "LDL cholesterol",
   "LDL-C",
   "low-density lipoprotein cholesterol"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "lead-variant",
  "term": "lead variant (lead SNP)",
  "aka": [
   "lead SNP",
   "index SNP",
   "index variant",
   "top SNP"
  ],
  "short": "The variant with the smallest p value in an associated region. It is often not causal: variants in high LD with the causal one have similar p values, and chance decides which is smallest.",
  "see": [
   "causal-variant",
   "fine-mapping",
   "regional-association-plot",
   "ld-clumping"
  ],
  "match": [
   "lead variant",
   "lead SNP",
   "index SNP",
   "index variant"
  ],
  "cs": false,
  "auto": true,
  "owner": "haplotypes-ld"
 },
 {
  "id": "loco",
  "term": "leave-one-chromosome-out (LOCO)",
  "aka": [
   "LOCO"
  ],
  "short": "Estimating the polygenic background term from all chromosomes except the one carrying the tested variant. Used by REGENIE and mixed-model programs, it stops that term from absorbing the variant’s own effect, which would lower power.",
  "see": [
   "regenie",
   "mixed-model"
  ],
  "links": [
   {
    "t": "REGENIE overview",
    "u": "https://rgcgithub.github.io/regenie/overview/"
   }
  ],
  "match": [
   "LOCO",
   "leave-one-chromosome-out"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "the-data"
 },
 {
  "id": "liability-threshold-model",
  "term": "liability threshold model",
  "short": "A model for yes/no diseases: each person has an unobserved, normally distributed liability (genetic plus environmental), and people whose liability exceeds a threshold become cases. The threshold is set by the disease prevalence.",
  "long": "Proposed for human diseases by Falconer (1965).",
  "see": [
   "binary-trait",
   "polygenic",
   "heritability"
  ],
  "match": [
   "liability threshold model",
   "liability-threshold model",
   "liability threshold"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "liftover",
  "term": "liftover",
  "aka": [
   "liftOver"
  ],
  "short": "Converting genomic coordinates from one genome build to another, for example GRCh37 to GRCh38, using a chain file of aligned blocks (tools: UCSC liftOver, CrossMap). Some positions fail to convert or change strand.",
  "see": [
   "genome-build",
   "grch37",
   "grch38"
  ],
  "links": [
   {
    "t": "UCSC liftOver",
    "u": "https://genome.ucsc.edu/cgi-bin/hgLiftOver"
   }
  ],
  "match": [
   "liftover",
   "lift over",
   "lift-over",
   "lifted over"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "dna"
 },
 {
  "id": "limit-of-detection",
  "term": "limit of detection (LOD)",
  "short": "The lowest amount of a substance that an assay can reliably distinguish from a blank sample. Values below it are flagged, set to a fixed value or left missing, and need special handling in analysis.",
  "see": [
   "biomarker",
   "olink",
   "proteomics"
  ],
  "match": [
   "limit of detection",
   "limits of detection",
   "detection limit",
   "detection limits"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "phenotypes"
 },
 {
  "id": "mixed-model",
  "term": "linear mixed model (LMM)",
  "aka": [
   "mixed model",
   "LMM"
  ],
  "short": "A regression model with fixed effects (the tested variant and covariates) plus a random effect whose correlation between two people follows their genetic similarity. In GWAS it handles relatedness and population structure.",
  "long": "The model is \\(\\mathbf{y} = \\mathbf{C}\\boldsymbol{\\alpha} + \\mathbf{g}_j\\beta_j + \\mathbf{u} + \\boldsymbol{\\varepsilon}\\), where \\(\\mathbf{y}\\) holds the people’s trait values, \\(\\mathbf{C}\\) their covariates (with a column of 1s for the intercept) with effects \\(\\boldsymbol{\\alpha}\\), \\(\\mathbf{g}_j\\) their genotype dosages at the tested variant \\(j\\) with effect \\(\\beta_j\\), \\(\\mathbf{u}\\) a random polygenic effect whose covariance between people is proportional to the genetic relationship matrix, and \\(\\boldsymbol{\\varepsilon}\\) independent noise. Modeling \\(\\mathbf{u}\\) accounts for the trait similarity that relatedness and population structure create, which would otherwise inflate the test statistics. Programs include BOLT-LMM, SAIGE (a generalized mixed model, often used for binary traits) and fastGWA. REGENIE reaches a similar result with ridge regression.",
  "see": [
   "genetic-relationship-matrix",
   "regenie",
   "loco",
   "covariate"
  ],
  "links": [
   {
    "t": "Yang et al. 2014, Advantages and pitfalls in the application of mixed-model association methods",
    "u": "https://doi.org/10.1038/ng.2876"
   }
  ],
  "match": [
   "linear mixed model",
   "mixed model",
   "mixed-model",
   "LMM"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "the-data"
 },
 {
  "id": "line-sine",
  "term": "LINEs and SINEs",
  "aka": [
   "LINE",
   "SINE",
   "long interspersed nuclear element",
   "short interspersed nuclear element"
  ],
  "short": "The two largest classes of transposable elements. LINEs (long interspersed nuclear elements, such as L1) make up 21.8% of the sequenced human genome; SINEs (short interspersed nuclear elements, such as Alu), 13.4%.",
  "long": "A full-length L1 element is about 6,000 bases long and encodes the proteins that copy it to new places; most copies are shortened and can no longer move. An Alu element is about 300 bases long and is copied by L1’s proteins. Percentages are of the ungapped GRCh38 sequence (UCSC RepeatMasker annotation).",
  "see": [
   "transposable-element",
   "genome",
   "structural-variant"
  ],
  "links": [
   {
    "t": "Hoyt et al. 2022, repeat elements of the complete human genome (Science, free text)",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC9301658/"
   }
  ],
  "match": [
   "LINE",
   "SINE",
   "long interspersed nuclear element",
   "short interspersed nuclear element"
  ],
  "cs": true,
  "owner": "genes-expression"
 },
 {
  "id": "linkage-analysis",
  "term": "linkage analysis (linkage study)",
  "aka": [
   "linkage study",
   "linkage scan"
  ],
  "short": "A family-based method that locates disease genes by testing whether a disease and marker alleles are passed down together more often than independent inheritance allows. Results are LOD scores; best for rare, high-penetrance variants.",
  "l1": "slides 29, 52",
  "see": [
   "lod-score",
   "genetic-linkage",
   "recombination-fraction",
   "pedigree"
  ],
  "links": [
   {
    "t": "Brown, Genomes 2nd ed., ch. 5: Mapping Genomes (NCBI Bookshelf)",
    "u": "https://www.ncbi.nlm.nih.gov/books/NBK21116/"
   }
  ],
  "match": [
   "linkage analysis",
   "linkage analyses",
   "linkage study",
   "linkage studies",
   "linkage scan",
   "linkage scans"
  ],
  "noPlural": true,
  "owner": "inheritance"
 },
 {
  "id": "ld",
  "term": "linkage disequilibrium (LD)",
  "aka": [
   "LD"
  ],
  "short": "Non-random association of alleles at two loci across a population’s chromosome copies, so the allele at one locus helps predict the other. In a genotype matrix it is correlation between columns, strongest for nearby variants.",
  "long": "LD arises when a new mutation occurs on one haplotype and is broken down by recombination: \\(D\\) is multiplied by \\(1 - \\theta\\) each generation, where \\(\\theta\\) is the recombination fraction; drift, bottlenecks, selection and admixture also shape it. Common measures are <a href=\\\"glossary.html#ld-d\\\">\\(D\\)</a>, <a href=\\\"glossary.html#d-prime\\\">\\(D'\\)</a> and <a href=\\\"glossary.html#r-squared\\\">\\(r^2\\)</a>. LD is not the same as genetic linkage.",
  "l1": "slides 65, 85–86, 94–97, 107–124",
  "see": [
   "haplotype",
   "r-squared",
   "ld-block",
   "ld-decay",
   "genetic-linkage"
  ],
  "links": [
   {
    "t": "Slatkin 2008, Linkage disequilibrium (Nat Rev Genet)",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC5124487/"
   }
  ],
  "match": [
   "linkage disequilibrium",
   "LD"
  ],
  "cs": false,
  "auto": true,
  "owner": "haplotypes-ld"
 },
 {
  "id": "lipoprotein",
  "term": "lipoprotein",
  "short": "A particle made of fats and proteins that carries cholesterol and other fats through the blood, which they cannot dissolve in. Types include low-density (LDL) and high-density (HDL) lipoproteins and lipoprotein(a).",
  "see": [
   "ldl-cholesterol",
   "hdl-cholesterol",
   "lipoprotein-a"
  ],
  "links": [
   {
    "t": "MedlinePlus: Cholesterol",
    "u": "https://medlineplus.gov/cholesterol.html"
   }
  ],
  "match": [
   "lipoprotein"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "lipoprotein-a",
  "term": "lipoprotein(a) [Lp(a)]",
  "aka": [
   "Lp(a)"
  ],
  "short": "An LDL-like particle with an extra protein, apolipoprotein(a), attached. Its blood level is more than 90% determined by variation in the <em>LPA</em> gene, and high levels cause atherosclerotic cardiovascular disease.",
  "l1": "slides 31–33 (the <em>LPA</em> gene)",
  "see": [
   "lipoprotein",
   "coronary-artery-disease"
  ],
  "match": [
   "lipoprotein(a)",
   "Lp(a)"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "local-ancestry",
  "term": "local ancestry",
  "short": "For an admixed person, the estimated source population of each segment of each chromosome, as opposed to genome-wide ancestry proportions. Estimated by comparing chromosome segments with reference samples.",
  "see": [
   "admixture",
   "genetic-ancestry"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Local Ancestry",
    "u": "https://www.genome.gov/genetics-glossary/Local-Ancestry"
   }
  ],
  "match": [
   "local ancestry"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "ancestry"
 },
 {
  "id": "locus",
  "term": "locus (plural loci)",
  "aka": [
   "loci"
  ],
  "short": "A specific position or stretch of the genome, identified by its chromosome and coordinates. A locus can be a single base or a whole gene.",
  "l1": "slides 63, 71–72, 75, 79, 89",
  "see": [
   "allele",
   "genomic-coordinate",
   "gene"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Locus",
    "u": "https://www.genome.gov/genetics-glossary/Locus"
   }
  ],
  "match": [
   "locus",
   "loci"
  ],
  "noPlural": true,
  "owner": "variation"
 },
 {
  "id": "locus-control-region",
  "term": "locus control region (LCR)",
  "aka": [
   "LCR"
  ],
  "short": "A group of five DNase I hypersensitive sites upstream of the β-globin gene cluster on chromosome 11 that acts as a strong enhancer for whichever globin gene is active in red-cell precursors.",
  "see": [
   "enhancer",
   "dnase-hypersensitive-site",
   "fetal-hemoglobin"
  ],
  "match": [
   "locus control region"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "lod-score",
  "term": "LOD score",
  "aka": [
   "logarithm of the odds"
  ],
  "short": "The base-10 logarithm of the likelihood ratio comparing linkage (recombination fraction below 0.5) with no linkage, from family data. A LOD of 3 or more (likelihood ratio 1000:1) was the classic threshold for declaring linkage.",
  "see": [
   "linkage-analysis",
   "recombination-fraction"
  ],
  "match": [
   "LOD score"
  ],
  "cs": true,
  "owner": "inheritance"
 },
 {
  "id": "log-r-ratio",
  "term": "log R ratio (LRR)",
  "aka": [
   "LRR"
  ],
  "short": "For one SNP in one sample, \\(\\log_2(R_{\\mathrm{obs}}/R_{\\mathrm{exp}})\\), where \\(R_{\\mathrm{obs}}\\) is the observed total array intensity and \\(R_{\\mathrm{exp}}\\) the intensity expected for its genotype. Values near 0 mean two copies; deletions give negative values and duplications positive ones.",
  "long": "The expected intensity is proportional to the number of copies, so the expected values are about \\(\\log_2(1/2) = -1\\) for one copy and \\(\\log_2(3/2) \\approx 0.58\\) for three; a change carried by only part of the cells shifts LRR less. Read together with the B allele frequency along a chromosome, it reveals copy-number changes and mosaicism.",
  "see": [
   "b-allele-frequency",
   "copy-number-variant",
   "mosaicism",
   "fluorescence-intensity"
  ],
  "links": [
   {
    "t": "Peiffer et al. 2006: Genomic profiling of chromosomal aberrations with genotyping arrays (BAF and LRR)",
    "u": "https://doi.org/10.1101/gr.5402306"
   },
   {
    "t": "LaFramboise 2009: SNP arrays, a decade of advances (free full text)",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC2715261/"
   }
  ],
  "match": [
   "log R ratio",
   "LRR"
  ],
  "owner": "samples-to-genotypes"
 },
 {
  "id": "long-read-sequencing",
  "term": "long-read sequencing",
  "aka": [
   "third-generation sequencing"
  ],
  "short": "Sequencing single DNA molecules thousands of bases long (PacBio HiFi, Oxford Nanopore). Long reads cross repeats, detect structural variants that short reads miss, and show phase directly, because one read spans several heterozygous sites.",
  "long": "PacBio HiFi reads are longer than 10,000 bases and more than 99% accurate; Oxford Nanopore reads are typically 10,000–100,000 bases, some over a million, with lower accuracy per read.",
  "l1": "slide 114",
  "see": [
   "short-read-sequencing",
   "structural-variant",
   "phase",
   "sequencing"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Long-Read DNA Sequencing",
    "u": "https://www.genome.gov/genetics-glossary/Long-Read-DNA-Sequencing"
   },
   {
    "t": "Logsdon et al. 2020: Long-read human genome sequencing and its applications",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC7877196/"
   }
  ],
  "match": [
   "long-read sequencing",
   "long read"
  ],
  "owner": "samples-to-genotypes"
 },
 {
  "id": "loss-of-function",
  "term": "loss-of-function (LoF)",
  "aka": [
   "LoF",
   "loss of function"
  ],
  "short": "Describes a variant that reduces or abolishes the activity of a gene's product. Nonsense, frameshift, start-lost and essential splice-site variants usually cause loss of function; some missense variants do too.",
  "long": "Losing one of two working copies is often tolerated, because the other copy still makes the product; some genes are exceptions (see dominance, page 5).",
  "l1": "slides 15–16",
  "see": [
   "gain-of-function",
   "nonsense-variant",
   "frameshift-variant",
   "recessive"
  ],
  "match": [
   "loss-of-function",
   "loss of function",
   "LoF"
  ],
  "noPlural": true,
  "owner": "variation"
 },
 {
  "id": "low-frequency-variant",
  "term": "low-frequency variant",
  "short": "A variant whose minor allele frequency is between 1% and 5%: more common than a rare variant, less common than a common variant.",
  "see": [
   "rare-variant",
   "common-variant",
   "maf"
  ],
  "links": [
   {
    "t": "1000 Genomes Project Consortium 2015: A global reference for human genetic variation",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC4750478/"
   }
  ],
  "match": [
   "low-frequency variant"
  ],
  "owner": "allele-frequencies"
 },
 {
  "id": "lysosome",
  "term": "lysosome",
  "short": "A compartment inside cells that breaks down proteins, fats and other molecules. LDL taken up by liver cells is digested in lysosomes; the PCSK9 protein sends LDL receptors there to be destroyed.",
  "see": [
   "cell",
   "receptor"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Lysosome",
    "u": "https://www.genome.gov/genetics-glossary/Lysosome"
   }
  ],
  "match": [
   "lysosome"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "major-allele",
  "term": "major allele",
  "aka": [],
  "short": "At a variant, the allele that is more frequent in a particular sample or population. Which allele is major can differ between populations.",
  "see": [
   "minor-allele",
   "maf"
  ],
  "match": [
   "major allele"
  ],
  "owner": "variation"
 },
 {
  "id": "mhc",
  "term": "major histocompatibility complex (MHC)",
  "aka": [
   "MHC",
   "HLA region",
   "human leukocyte antigen (HLA) region"
  ],
  "short": "A region of about 4 Mb on chromosome 6 (6p21.3) containing the HLA genes, which help the immune system recognize foreign proteins. It has extreme polymorphism, long-range LD and many disease associations.",
  "long": "The IPD-IMGT/HLA database lists tens of thousands of HLA alleles. The MHC is usually removed before PCA. UK Biobank provides imputed HLA alleles for 11 genes (data-field 22182).",
  "see": [
   "ld",
   "ld-pruning"
  ],
  "links": [
   {
    "t": "IPD-IMGT/HLA Database",
    "u": "https://www.ebi.ac.uk/ipd/imgt/hla/"
   }
  ],
  "match": [
   "major histocompatibility complex",
   "MHC",
   "HLA region"
  ],
  "cs": false,
  "auto": true,
  "owner": "haplotypes-ld"
 },
 {
  "id": "mane-select",
  "term": "MANE Select transcript",
  "aka": [
   "MANE Select"
  ],
  "short": "One representative transcript chosen for each protein-coding gene, identical in NCBI RefSeq and Ensembl, for example NM_000518.5 for <em>HBB</em>. Clinical reporting uses it, so HGVS c. and p. names usually refer to it.",
  "see": [
   "hgvs",
   "vep",
   "alternative-splicing"
  ],
  "links": [
   {
    "t": "NCBI: MANE (Matched Annotation from NCBI and EMBL-EBI)",
    "u": "https://www.ncbi.nlm.nih.gov/refseq/MANE/"
   }
  ],
  "match": [
   "MANE Select"
  ],
  "noPlural": true,
  "owner": "variation"
 },
 {
  "id": "manhattan-plot",
  "term": "Manhattan plot",
  "short": "The plot of GWAS results: one point per variant, with position on the x-axis (chromosomes laid end to end) and −log<sub>10</sub> of its p-value on the y-axis. Associated regions appear as columns of points rising above a genome-wide significance line.",
  "long": "Each column is a group of correlated variants (linkage disequilibrium) around a signal, so the highest point, the lead variant, is not necessarily the causal one. A regional association plot shows one column in detail.",
  "l1": "slide 31",
  "see": [
   "genome-wide-significance",
   "qq-plot",
   "regional-association-plot",
   "lead-variant"
  ],
  "match": [
   "Manhattan plot"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "the-data"
 },
 {
  "id": "material-transfer-agreement",
  "term": "Material Transfer Agreement (MTA)",
  "short": "A contract that sets the conditions for using shared research materials or data. Before UK Biobank grants access, the researcher’s institution signs one; it bans any attempt to identify a participant.",
  "see": [
   "rap",
   "uk-biobank",
   "data-showcase",
   "informed-consent"
  ],
  "match": [
   "Material Transfer Agreement",
   "material transfer agreement"
  ],
  "cs": true,
  "owner": "the-data"
 },
 {
  "id": "measurement-error",
  "term": "measurement error",
  "short": "The difference between a recorded and a true value. Random error varies between measurements; systematic error shifts values one way. Random error in an outcome costs power; in a predictor it biases slopes toward zero.",
  "see": [
   "regression-dilution",
   "misclassification"
  ],
  "match": [
   "measurement error"
  ],
  "cs": false,
  "auto": true,
  "owner": "phenotypes"
 },
 {
  "id": "megabase",
  "term": "megabase (Mb)",
  "aka": [
   "Mb"
  ],
  "short": "A unit of DNA length: 1 Mb = 1,000,000 base pairs. For example, chromosome 12 is 133.3 Mb long in GRCh38.",
  "see": [
   "base-pair",
   "kilobase",
   "gigabase"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Megabase",
    "u": "https://www.genome.gov/genetics-glossary/Megabase"
   }
  ],
  "match": [
   "megabase",
   "megabases",
   "Mb"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "dna"
 },
 {
  "id": "meiosis",
  "term": "meiosis",
  "short": "The cell division that makes sperm and eggs. DNA is copied once and the cell divides twice, giving four cells with 23 chromosomes each. Each chromosome combines segments of the parent’s two copies.",
  "long": "The segments switch at crossovers. Averaged over many families, a sperm carries about 27 crossovers across the 22 autosomes and an egg about 42 (Campbell et al. 2015, <em>Nature Communications</em>). Errors in meiosis cause aneuploidy, such as trisomy 21.",
  "l1": "slides 85, 111",
  "see": [
   "mitosis",
   "crossover",
   "recombination",
   "segregation",
   "gamete"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Meiosis",
    "u": "https://www.genome.gov/genetics-glossary/Meiosis"
   },
   {
    "t": "HHMI BioInteractive: Meiosis (animation)",
    "u": "https://www.biointeractive.org/classroom-resources/meiosis"
   }
  ],
  "match": [
   "meiosis",
   "meioses",
   "meiotic"
  ],
  "noPlural": true,
  "owner": "inheritance"
 },
 {
  "id": "mendels-laws",
  "term": "Mendel's laws",
  "aka": [
   "laws of inheritance"
  ],
  "short": "Two rules published by Gregor Mendel in 1866. Segregation: each parent passes on one of its two alleles at a locus, each with probability ½. Independent assortment: loci on different chromosomes are inherited independently.",
  "long": "Both rules follow from meiosis. Loci close together on the same chromosome are the main exception to independent assortment (genetic linkage).",
  "l1": "slides 28–29",
  "see": [
   "segregation",
   "independent-assortment",
   "genetic-linkage",
   "punnett-square"
  ],
  "links": [
   {
    "t": "Scitable: Gregor Mendel and the Principles of Inheritance",
    "u": "https://www.nature.com/scitable/topicpage/gregor-mendel-and-the-principles-of-inheritance-593/"
   },
   {
    "t": "NHGRI Talking Glossary: Mendelian Inheritance",
    "u": "https://www.genome.gov/genetics-glossary/Mendelian-Inheritance"
   }
  ],
  "match": [
   "Mendel's laws",
   "Mendel’s laws"
  ],
  "noPlural": true,
  "owner": "inheritance"
 },
 {
  "id": "mendelian-disease",
  "term": "Mendelian (single-gene) disease",
  "aka": [
   "single-gene disorder",
   "Mendelian disorder"
  ],
  "short": "A disease largely determined by the genotype at one gene, so it follows Mendel's laws in families, with a dominant, recessive or X-linked pattern. Examples: Huntington disease, cystic fibrosis, sickle cell disease.",
  "see": [
   "dominant",
   "recessive",
   "x-linked",
   "penetrance",
   "monogenic"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Mendelian Inheritance",
    "u": "https://www.genome.gov/genetics-glossary/Mendelian-Inheritance"
   }
  ],
  "match": [
   "Mendelian disease",
   "Mendelian disorder",
   "Mendelian condition",
   "single-gene disease",
   "single-gene disorder"
  ],
  "owner": "inheritance"
 },
 {
  "id": "mendelian-error",
  "term": "Mendelian error",
  "aka": [
   "Mendelian inconsistency"
  ],
  "short": "A genotype that is impossible under Mendel’s laws given the parents’ genotypes, such as an AA child of a BB parent. Errors clustering by variant suggest calling problems; by family, sample swaps or misattributed parentage.",
  "long": "PLINK's <code>--mendel</code> counts errors per family, per person and per variant; families or variants with many errors are investigated or removed.",
  "see": [
   "mendels-laws",
   "trio",
   "pedigree",
   "qc"
  ],
  "links": [
   {
    "t": "PLINK 1.9: basic statistics (--missing, --check-sex, --het, --mendel)",
    "u": "https://www.cog-genomics.org/plink/1.9/basic_stats"
   }
  ],
  "match": [
   "Mendelian error",
   "Mendelian inconsistency"
  ],
  "owner": "samples-to-genotypes"
 },
 {
  "id": "mendelian-randomization",
  "term": "Mendelian randomization (MR)",
  "aka": [
   "MR"
  ],
  "short": "Using genetic variants as instrumental variables to test whether an exposure, such as HDL cholesterol, causes an outcome, such as heart attack. Valid only if the variants meet three conditions: relevance, independence and exclusion restriction.",
  "long": "Relevance: the variants are associated with the exposure. Independence: they share no common cause with the outcome. Exclusion restriction: they affect the outcome only through the exposure (no pleiotropic path). The causal effect can be estimated by the Wald ratio \\(\\hat{\\beta}_{GY}/\\hat{\\beta}_{GX}\\): the estimated effect of the variant \\(G\\) on the outcome \\(Y\\) divided by its estimated effect on the exposure \\(X\\), both slopes from GWAS summary statistics. If the variant changes \\(Y\\) only through \\(X\\), its effect on \\(Y\\) is its effect on \\(X\\) times the causal effect of \\(X\\) on \\(Y\\), so the ratio recovers the causal effect.",
  "l1": "slides 22–24",
  "see": [
   "instrumental-variable",
   "pleiotropy",
   "reverse-causation",
   "confounding"
  ],
  "links": [
   {
    "t": "Sanderson et al. 2022, Mendelian randomization (free via PMC)",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC7614635/"
   }
  ],
  "match": [
   "Mendelian randomization"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "mrna",
  "term": "messenger RNA (mRNA)",
  "aka": [
   "mRNA"
  ],
  "short": "The processed RNA copy of a protein-coding gene, with introns removed and a cap and poly(A) tail added, that leaves the nucleus and is translated by ribosomes into protein.",
  "l1": "slides 61–62",
  "see": [
   "pre-mrna",
   "splicing",
   "translation"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Messenger RNA (mRNA)",
    "u": "https://www.genome.gov/genetics-glossary/Messenger-RNA"
   }
  ],
  "match": [
   "mRNA",
   "messenger RNA"
  ],
  "cs": true,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "meta-analysis",
  "term": "meta-analysis",
  "short": "Combining results of several studies of the same question into one estimate. In GWAS each study shares summary statistics, and each variant’s effect estimates are averaged with weights \\(1/\\SE^2\\) (the inverse of each estimate’s squared standard error), so no individual-level data are shared.",
  "long": "That weighting is the fixed-effect (inverse-variance) model; random-effects models allow the true effect to differ between studies. Before combining, every study's effect must refer to the same allele. Tools include METAL and METASOFT.",
  "l1": "slide 47",
  "see": [
   "summary-statistics",
   "effect-allele",
   "harmonization",
   "fixed-random-effects",
   "heterogeneity"
  ],
  "links": [
   {
    "t": "Evangelou and Ioannidis 2013, Meta-analysis methods for genome-wide association studies and beyond",
    "u": "https://doi.org/10.1038/nrg3472"
   },
   {
    "t": "Willer et al. 2010, METAL",
    "u": "https://doi.org/10.1093/bioinformatics/btq340"
   }
  ],
  "match": [
   "meta-analysis",
   "meta-analyses",
   "meta-analyze",
   "meta-analyzed",
   "meta-analyzes"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "the-data"
 },
 {
  "id": "metabolomics",
  "term": "metabolomics",
  "short": "Measuring many small molecules (metabolites) in a sample at once, such as lipids, fatty acids, amino acids and sugars. Each measured metabolite becomes its own phenotype column.",
  "see": [
   "nmr-metabolomics",
   "proteomics",
   "biomarker"
  ],
  "match": [
   "metabolomics",
   "metabolomic"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "phenotypes"
 },
 {
  "id": "minor-allele",
  "term": "minor allele",
  "aka": [],
  "short": "At a variant, the allele that is less frequent in a particular sample or population; its frequency is the minor allele frequency (MAF), at most 0.5. Which allele is minor can differ between populations.",
  "l1": "slides 78, 92",
  "see": [
   "major-allele",
   "maf",
   "effect-allele"
  ],
  "match": [
   "minor allele"
  ],
  "owner": "variation"
 },
 {
  "id": "maf",
  "term": "minor allele frequency (MAF)",
  "aka": [
   "MAF"
  ],
  "short": "The frequency of the less common allele of a biallelic SNP in a given sample or population: \\(\\mathrm{MAF} = \\min(p, q)\\), where \\(p\\) and \\(q = 1 - p\\) are the two allele frequencies, so it is never above 0.5. Which allele is minor can differ between populations.",
  "long": "MAF is not the same as the alternative-allele frequency or the effect-allele frequency. PLINK 1.9 --freq reports the frequency of A1 (usually the minor allele); PLINK 2 reports the ALT allele frequency. QC filters such as --maf 0.01 remove variants below a MAF threshold.",
  "l1": "slides 78, 85, 88",
  "see": [
   "allele-frequency",
   "rare-variant",
   "common-variant"
  ],
  "links": [
   {
    "t": "PLINK 1.9: basic statistics (--freq)",
    "u": "https://www.cog-genomics.org/plink/1.9/basic_stats"
   }
  ],
  "match": [
   "minor allele frequency",
   "Minor allele frequency",
   "MAF"
  ],
  "cs": true,
  "owner": "allele-frequencies"
 },
 {
  "id": "misclassification",
  "term": "misclassification",
  "short": "Measurement error in a categorical variable, such as a true case recorded as a control. When the errors do not depend on the genotype or exposure studied (non-differential), they usually bias odds ratios toward 1.",
  "see": [
   "measurement-error",
   "positive-predictive-value",
   "case-definition"
  ],
  "match": [
   "misclassification",
   "misclassified"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "phenotypes"
 },
 {
  "id": "missense-variant",
  "term": "missense variant",
  "aka": [
   "non-synonymous variant"
  ],
  "short": "A change in a codon that makes it encode a different amino acid, for example GAG → GTG (glutamic acid → valine) in sickle cell disease. Effects range from none to severe.",
  "l1": "slide 63",
  "see": [
   "synonymous-variant",
   "nonsense-variant",
   "codon"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Missense Mutation",
    "u": "https://www.genome.gov/genetics-glossary/Missense-Mutation"
   }
  ],
  "match": [
   "missense variant",
   "missense",
   "non-synonymous variant",
   "nonsynonymous variant",
   "non-synonymous"
  ],
  "owner": "variation"
 },
 {
  "id": "missing-data",
  "term": "missing data",
  "aka": [
   "missing value",
   "NA"
  ],
  "short": "Entries with no value. Why a value is missing (not asked, not measured, refused, failed QC, outside the measured subset) matters more than how many: it decides whether analyzing only complete records is biased.",
  "long": "Values can be missing completely at random, missing at random (the difference from observed values is explained by other observed data), or missing not at random.",
  "see": [
   "skip-logic",
   "selection-bias"
  ],
  "match": [
   "missing data",
   "missing value"
  ],
  "cs": false,
  "auto": true,
  "owner": "phenotypes"
 },
 {
  "id": "missing-heritability",
  "term": "missing heritability",
  "short": "The gap between heritability estimated from relatives, such as twins, and the variance explained by genome-wide significant SNPs. Much of it reflects many effects too small to detect and causal variants that arrays tag poorly.",
  "long": "For height around 2009, about 40 significant loci explained about 5% of the variance against a twin heritability of about 80% (Manolio et al., <em>Nature</em> 2009); all common SNPs together explained about 45% (Yang et al., <em>Nat Genet</em> 2010).",
  "see": [
   "heritability",
   "snp-heritability"
  ],
  "match": [
   "missing heritability"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "missingness",
  "term": "missingness (missing rate)",
  "aka": [
   "missing rate",
   "genotype missing rate"
  ],
  "short": "One minus the call rate: the fraction of genotypes that are missing for a person or for a SNP. It is usually the first number checked in quality control.",
  "long": "PLINK writes per-person missingness to <code>.imiss</code> and per-SNP missingness to <code>.lmiss</code>. Missingness that differs between groups (differential missingness) or that depends on the genotype itself (heterozygotes failing more often) biases what remains.",
  "see": [
   "call-rate",
   "no-call",
   "differential-missingness",
   "missing-data"
  ],
  "links": [
   {
    "t": "PLINK 1.9: file formats (.imiss, .lmiss, .missing, .sexcheck)",
    "u": "https://www.cog-genomics.org/plink/1.9/formats"
   },
   {
    "t": "Anderson et al. 2010: Data quality control in genetic case-control association studies",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3025522/"
   }
  ],
  "match": [
   "missingness",
   "missing rate",
   "genotype missing rate"
  ],
  "noPlural": true,
  "owner": "samples-to-genotypes"
 },
 {
  "id": "mitochondrial-dna",
  "term": "mitochondrial DNA (mtDNA)",
  "aka": [
   "mtDNA",
   "chrMT"
  ],
  "short": "The small circular DNA molecule inside mitochondria: 16,569 base pairs with 37 genes, present in hundreds to thousands of copies per cell and inherited from the mother. PLINK codes it as chromosome MT (26).",
  "see": [
   "mitochondrion",
   "genome"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Mitochondrial DNA",
    "u": "https://www.genome.gov/genetics-glossary/Mitochondrial-DNA"
   },
   {
    "t": "MedlinePlus Genetics: Mitochondrial DNA",
    "u": "https://medlineplus.gov/genetics/chromosome/mitochondrial-dna/"
   }
  ],
  "match": [
   "mitochondrial DNA",
   "mtDNA"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "cells-chromosomes"
 },
 {
  "id": "mitochondrion",
  "term": "mitochondrion",
  "aka": [
   "mitochondria (plural)"
  ],
  "short": "A small compartment in the cytoplasm that produces most of the cell's usable chemical energy. Each mitochondrion carries its own small circular DNA molecule, the mitochondrial DNA.",
  "see": [
   "mitochondrial-dna",
   "cytoplasm"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Mitochondria",
    "u": "https://www.genome.gov/genetics-glossary/Mitochondria"
   }
  ],
  "match": [
   "mitochondrion",
   "mitochondria"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "cells-chromosomes"
 },
 {
  "id": "mitosis",
  "term": "mitosis",
  "short": "The cell division used for growth and repair. The DNA is copied once and the cell divides once, giving two cells with the same 46 chromosomes as the original cell.",
  "see": [
   "meiosis",
   "chromatid",
   "cell"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Mitosis",
    "u": "https://www.genome.gov/genetics-glossary/Mitosis"
   }
  ],
  "match": [
   "mitosis",
   "mitoses",
   "mitotic"
  ],
  "noPlural": true,
  "owner": "inheritance"
 },
 {
  "id": "monogenic",
  "term": "monogenic",
  "aka": [
   "single-gene",
   "Mendelian trait"
  ],
  "short": "Caused mainly by variants in a single gene, usually with a large effect and a simple inheritance pattern. Example: familial hypercholesterolemia (very high LDL cholesterol from birth).",
  "see": [
   "polygenic",
   "mendelian-disease",
   "familial-hypercholesterolemia"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Mendelian Inheritance",
    "u": "https://www.genome.gov/genetics-glossary/Mendelian-Inheritance"
   }
  ],
  "match": [
   "monogenic"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "monomorphic",
  "term": "monomorphic",
  "short": "Describes a site where only one allele is observed in a given sample. A SNP that varies in one population can be monomorphic in another. Monomorphic SNPs carry no information for association or HWE tests.",
  "see": [
   "polymorphic",
   "maf"
  ],
  "match": [
   "monomorphic"
  ],
  "noPlural": true,
  "owner": "allele-frequencies"
 },
 {
  "id": "monozygotic-twins",
  "term": "monozygotic (identical) twins",
  "aka": [
   "MZ twins",
   "identical twins"
  ],
  "short": "Twins who develop from a single fertilized egg that splits in two, so their germline genomes are identical apart from a few new mutations. In genotype data they are indistinguishable from duplicate samples.",
  "see": [
   "dizygotic-twins",
   "zygote",
   "duplicate-sample",
   "twin-study"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Identical Twins",
    "u": "https://www.genome.gov/genetics-glossary/Identical-Twins"
   }
  ],
  "match": [
   "monozygotic twins",
   "monozygotic twin",
   "monozygotic",
   "identical twins",
   "identical twin",
   "MZ twins",
   "MZ twin"
  ],
  "noPlural": true,
  "owner": "inheritance"
 },
 {
  "id": "mosaic-chromosomal-alteration",
  "term": "mosaic chromosomal alteration (mCA)",
  "aka": [
   "mCA"
  ],
  "short": "A gain, loss or other change of a chromosome segment that is present in only a fraction of a person's cells. In UK Biobank, thousands were detected in blood DNA from genotyping-array signal intensities.",
  "see": [
   "mosaicism",
   "clonal-hematopoiesis",
   "mosaic-loss-of-y"
  ],
  "links": [
   {
    "t": "Loh et al. 2018, Insights about clonal hematopoiesis from 8,342 mosaic chromosomal alterations",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC6054542/"
   }
  ],
  "match": [
   "mosaic chromosomal alteration",
   "mCA"
  ],
  "cs": true,
  "auto": true,
  "noPlural": false,
  "owner": "cells-chromosomes"
 },
 {
  "id": "mosaic-loss-of-y",
  "term": "mosaic loss of Y (LOY)",
  "aka": [
   "loss of chromosome Y",
   "LOY"
  ],
  "short": "Loss of the Y chromosome in a fraction of a man's blood cells, the most common clonal change in blood. About 20% of the men in UK Biobank have detectable loss of Y.",
  "see": [
   "mosaicism",
   "y-chromosome",
   "clonal-hematopoiesis"
  ],
  "links": [
   {
    "t": "Thompson et al. 2019, Genetic predisposition to mosaic Y chromosome loss in blood",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC6887549/"
   }
  ],
  "match": [
   "mosaic loss of the Y chromosome",
   "mosaic loss of Y",
   "loss of Y",
   "LOY"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "cells-chromosomes"
 },
 {
  "id": "mosaicism",
  "term": "mosaicism",
  "aka": [
   "genetic mosaicism"
  ],
  "short": "The presence in one person of cells with different genomes, for example cells with and without a somatic variant or a lost chromosome. Common examples in blood are clonal hematopoiesis and mosaic loss of Y.",
  "l1": "slide 53",
  "see": [
   "somatic-mutation",
   "clonal-hematopoiesis",
   "mosaic-chromosomal-alteration",
   "mosaic-loss-of-y"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Mosaicism",
    "u": "https://www.genome.gov/genetics-glossary/Mosaicism"
   }
  ],
  "match": [
   "mosaicism",
   "genetic mosaicism"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "cells-chromosomes"
 },
 {
  "id": "multiallelic",
  "term": "multiallelic",
  "aka": [
   "multi-allelic"
  ],
  "short": "Having three or more alleles at one locus, such as the A, B and O alleles of the <em>ABO</em> gene. One 0/1/2 column cannot represent such a locus, so files split it into biallelic records.",
  "l1": "slides 71–73",
  "see": [
   "biallelic",
   "allele-dosage"
  ],
  "match": [
   "multiallelic",
   "multi-allelic"
  ],
  "noPlural": true,
  "owner": "variation"
 },
 {
  "id": "multiple-testing",
  "term": "multiple testing",
  "aka": [
   "multiple comparisons"
  ],
  "short": "Running many statistical tests. At p &lt; 0.05, 5% of tests with no true effect pass by chance, so a million such tests would give about 50,000 false positives; the per-test threshold must be stricter.",
  "long": "The Bonferroni correction divides the overall error rate (for example 0.05) by the number of tests. In GWAS the variants are correlated, so the divisor used is the effective number of independent tests, about one million for common variants, rather than the number of variants tested.",
  "see": [
   "genome-wide-significance",
   "effective-number-of-tests",
   "bonferroni-correction",
   "family-wise-error-rate"
  ],
  "match": [
   "multiple testing",
   "multiple-testing",
   "multiple comparisons"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "the-data"
 },
 {
  "id": "mutation",
  "term": "mutation",
  "aka": [],
  "short": "A change in a DNA sequence, from a copying error in DNA replication or damage by chemicals or radiation. Every variant began as a mutation in one person. Clinical reports prefer the neutral word “variant”.",
  "long": "Only mutations in the germline (the cells that give rise to eggs and sperm) can be inherited; mutations in other cells are somatic. Older texts use “mutation” for rare, often harmful variants and “polymorphism” for common ones.",
  "l1": "slides 15–16, 81, 85, 109, 112",
  "see": [
   "genetic-variant",
   "de-novo-mutation",
   "germline",
   "somatic-mutation"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Mutation",
    "u": "https://www.genome.gov/genetics-glossary/Mutation"
   }
  ],
  "match": [
   "mutation"
  ],
  "owner": "variation"
 },
 {
  "id": "myocardial-infarction",
  "term": "myocardial infarction (MI)",
  "aka": [
   "heart attack",
   "MI"
  ],
  "short": "A heart attack: part of the heart muscle dies because its blood supply is suddenly blocked, usually by a blood clot that forms where plaque has broken open. ICD-10 code I21.",
  "l1": "slides 23, 32–33",
  "see": [
   "coronary-artery-disease",
   "atherosclerosis"
  ],
  "links": [
   {
    "t": "MedlinePlus: Heart Attack",
    "u": "https://medlineplus.gov/heartattack.html"
   }
  ],
  "match": [
   "myocardial infarction",
   "heart attack"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "nhs",
  "term": "National Health Service (NHS)",
  "short": "The publicly funded health-care system of the United Kingdom, run separately in England, Scotland, Wales and Northern Ireland. About 98% of the UK population is registered with it.",
  "see": [
   "sampling-frame",
   "record-linkage"
  ],
  "match": [
   "National Health Service",
   "NHS"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "uk-biobank"
 },
 {
  "id": "natural-selection",
  "term": "natural selection",
  "aka": [
   "positive selection",
   "negative selection",
   "purifying selection"
  ],
  "short": "Change in allele frequency because an allele changes the chance of surviving and having children in a particular environment. Positive selection raises a beneficial allele’s frequency; negative (purifying) selection keeps harmful alleles rare.",
  "long": "Human examples: lactase persistence rose in populations that kept dairy animals; the sickle-cell allele persists where malaria is common (balancing selection); the Duffy-null allele, which protects against <em>Plasmodium vivax</em> malaria, is near fixation in many populations of sub-Saharan Africa.",
  "l1": "slides 83, 85, 97, 112",
  "see": [
   "balancing-selection",
   "genetic-drift",
   "lactase-persistence"
  ],
  "links": [
   {
    "t": "Scitable: Natural Selection, Genetic Drift, and Gene Flow Do Not Act in Isolation in Natural Populations",
    "u": "https://www.nature.com/scitable/knowledge/library/natural-selection-genetic-drift-and-gene-flow-15186648/"
   }
  ],
  "match": [
   "natural selection",
   "positive selection",
   "negative selection",
   "purifying selection"
  ],
  "noPlural": true,
  "owner": "allele-frequencies"
 },
 {
  "id": "nmr-metabolomics",
  "term": "NMR metabolomics (Nightingale Health)",
  "short": "A platform using nuclear magnetic resonance (NMR) spectroscopy to quantify 249 blood measures, mostly lipids in lipoprotein particles, fatty acids and small molecules such as amino acids. UK Biobank measured almost all baseline samples.",
  "see": [
   "metabolomics",
   "biomarker"
  ],
  "match": [
   "NMR metabolomics",
   "Nightingale Health"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "phenotypes"
 },
 {
  "id": "no-call",
  "term": "no-call",
  "aka": [
   "missing genotype call"
  ],
  "short": "A genotype that the calling software declines to assign, because the intensities do not fall clearly into one cluster or the signal is too weak. No-calls are the missing entries of an array genotype matrix.",
  "long": "A stricter confidence threshold gives fewer wrong calls but more no-calls. Heterozygotes sit between clusters, so they become no-calls more often than homozygotes, which can distort Hardy–Weinberg tests.",
  "see": [
   "genotype-calling",
   "call-rate",
   "missingness",
   "cluster-plot"
  ],
  "links": [
   {
    "t": "LaFramboise 2009: SNP arrays, a decade of advances (free full text)",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC2715261/"
   }
  ],
  "match": [
   "no-call"
  ],
  "owner": "samples-to-genotypes"
 },
 {
  "id": "non-coding-rna",
  "term": "non-coding RNA",
  "aka": [
   "ncRNA"
  ],
  "short": "An RNA that does its job without being translated into protein, for example transfer RNAs, ribosomal RNAs, microRNAs and long non-coding RNAs. GENCODE release 50 lists about 43,500 non-coding RNA genes.",
  "see": [
   "gene",
   "protein-coding-gene",
   "trna"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Non-coding DNA",
    "u": "https://www.genome.gov/genetics-glossary/Non-Coding-DNA"
   }
  ],
  "match": [
   "non-coding RNA",
   "noncoding RNA",
   "ncRNA"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "noncoding-variant",
  "term": "non-coding variant",
  "aka": [
   "noncoding variant"
  ],
  "short": "A variant outside protein-coding sequence: in an intron, an untranslated region, a regulatory element or intergenic DNA. Most variants, and most GWAS signals, are non-coding; some act by changing gene regulation.",
  "l1": "slides 61, 63",
  "see": [
   "regulatory-variant",
   "intergenic",
   "coding-variant"
  ],
  "match": [
   "non-coding variant",
   "noncoding variant"
  ],
  "owner": "variation"
 },
 {
  "id": "nonsense-variant",
  "term": "nonsense variant (stop-gained)",
  "aka": [
   "stop-gained variant"
  ],
  "short": "A change that turns an amino acid codon into a stop codon, for example GAG → TAG, so the protein is cut short. Usually a loss-of-function variant.",
  "l1": "slide 63",
  "see": [
   "stop-codon",
   "loss-of-function",
   "missense-variant"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Nonsense Mutation",
    "u": "https://www.genome.gov/genetics-glossary/Nonsense-Mutation"
   }
  ],
  "match": [
   "nonsense variant",
   "nonsense",
   "stop-gained",
   "stop gained"
  ],
  "owner": "variation"
 },
 {
  "id": "nucleosome",
  "term": "nucleosome",
  "short": "The packing unit of chromatin: about 147 base pairs of DNA wrapped almost twice (about 1.7 times) around a core of eight histone proteins. Neighboring nucleosomes are joined by 10–80 base pairs of linker DNA.",
  "see": [
   "histone",
   "chromatin"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Nucleosome",
    "u": "https://www.genome.gov/genetics-glossary/Nucleosome"
   }
  ],
  "match": [
   "nucleosome"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "cells-chromosomes"
 },
 {
  "id": "nucleotide",
  "term": "nucleotide",
  "short": "The repeating unit of DNA: a deoxyribose sugar, a phosphate group and one of four bases (A, C, G or T). Nucleotides join through their sugars and phosphates into a strand.",
  "long": "The sugar's five carbon atoms are numbered 1′ to 5′. The base is attached to carbon 1′ and the phosphate to carbon 5′; a phosphate links carbon 3′ of one sugar to carbon 5′ of the next.",
  "l1": "slides 57, 67–68, 71, 74",
  "see": [
   "base",
   "backbone",
   "strand"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Nucleotide",
    "u": "https://www.genome.gov/genetics-glossary/Nucleotide"
   }
  ],
  "match": [
   "nucleotide"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "dna"
 },
 {
  "id": "nucleus",
  "term": "nucleus",
  "aka": [
   "cell nucleus",
   "nuclei (plural)"
  ],
  "short": "The membrane-enclosed compartment inside a cell that holds the chromosomes, and therefore almost all of the cell's DNA. Human nuclei are typically 2–10 µm across.",
  "l1": "slide 60",
  "see": [
   "cell",
   "chromosome",
   "cytoplasm"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Nucleus",
    "u": "https://www.genome.gov/genetics-glossary/Nucleus"
   }
  ],
  "match": [
   "nucleus",
   "nuclei"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "cells-chromosomes"
 },
 {
  "id": "odds-ratio",
  "term": "odds ratio (OR)",
  "aka": [
   "OR"
  ],
  "short": "The factor by which the odds of disease are multiplied, usually per copy of the effect allele. The odds of an event with probability \\(\\pi\\) are \\(\\pi/(1 - \\pi)\\); \\(\\mathrm{OR} = 1\\) means no association.",
  "long": "Logistic regression models the log odds as \\(\\ln(\\pi/(1 - \\pi)) = \\alpha + \\beta g\\), with \\(g\\) the number of effect-allele copies. One more copy adds \\(\\beta\\) to the log odds, which multiplies the odds by \\(\\mathrm{OR} = e^{\\beta}\\); the slope \\(\\beta\\) is the log odds ratio.",
  "see": [
   "binary-trait",
   "beta",
   "effect-size"
  ],
  "match": [
   "odds ratio"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "olink",
  "term": "Olink (proximity extension assay)",
  "short": "A platform that measures thousands of proteins with antibody pairs carrying DNA tags. When both bind one protein, the tags join into a DNA sequence that is copied and counted. Results are relative levels (NPX).",
  "long": "NPX (normalized protein expression) is on a log<sub>2</sub> scale and is not an absolute concentration, so values are compared within a protein, not between proteins. UK Biobank’s first project used the Olink Explore 3072 panel and read the DNA sequences on an Illumina sequencer.",
  "see": [
   "proteomics",
   "limit-of-detection"
  ],
  "match": [
   "Olink"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "phenotypes"
 },
 {
  "id": "opcs-4",
  "term": "OPCS-4",
  "short": "The UK classification of surgical operations and procedures (OPCS Classification of Interventions and Procedures, version 4), used in hospital records alongside ICD-10 diagnosis codes.",
  "see": [
   "icd-10",
   "hes"
  ],
  "match": [
   "OPCS-4",
   "OPCS4"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "phenotypes"
 },
 {
  "id": "other-allele",
  "term": "other (non-effect) allele",
  "aka": [
   "non-effect allele"
  ],
  "short": "In association results, the allele that is not counted. Summary statistics should list both the effect allele and the other allele, so that results from different studies can be aligned.",
  "see": [
   "effect-allele",
   "summary-statistics"
  ],
  "match": [
   "non-effect allele"
  ],
  "owner": "variation"
 },
 {
  "id": "out-of-africa",
  "term": "out-of-Africa dispersal",
  "short": "The spread of modern humans from Africa to the rest of the world. Most ancestry of present-day populations outside Africa comes from an expansion out of Africa about 50,000–60,000 years ago.",
  "long": "Because the spread happened through a series of founder events, genetic diversity is highest in Africa and decreases with distance from Africa (serial founder effect).",
  "l1": "slide 93",
  "see": [
   "serial-founder-effect",
   "founder-effect"
  ],
  "match": [
   "out-of-Africa",
   "out of Africa"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "ancestry"
 },
 {
  "id": "outcome",
  "term": "outcome",
  "short": "The health-related state that a study tries to explain or predict, such as a heart attack, a diagnosis, death or a measured trait. In a GWAS the phenotype is the outcome.",
  "l1": "slides 22, 25",
  "see": [
   "exposure",
   "phenotype"
  ],
  "match": [
   "outcome"
  ],
  "cs": false,
  "auto": true,
  "owner": "uk-biobank"
 },
 {
  "id": "paired-end-read",
  "term": "paired-end read",
  "aka": [
   "read pair",
   "paired-end sequencing"
  ],
  "short": "Two reads from the two ends of the same DNA fragment. The pair’s orientation and approximate distance help place reads on the reference genome.",
  "long": "The unread middle of the fragment has a length known only approximately, from the fragment-length distribution. UK Biobank’s exomes were read as 75 + 75 bases and its genomes as 151 + 151 bases.",
  "see": [
   "sequencing-read",
   "read-alignment",
   "short-read-sequencing"
  ],
  "links": [
   {
    "t": "Goodwin et al. 2016: Coming of age: ten years of next-generation sequencing technologies",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC10373632/"
   },
   {
    "t": "Illumina: Overview of sequencing by synthesis (video, 5 min)",
    "u": "https://www.youtube.com/watch?v=fCd6B5HRaZ8"
   }
  ],
  "match": [
   "paired-end read",
   "paired-end sequencing",
   "read pair"
  ],
  "owner": "samples-to-genotypes"
 },
 {
  "id": "pan-ukbb",
  "term": "Pan-UK Biobank (Pan-UKBB)",
  "short": "A project that ran GWAS of 7,266 traits in UK Biobank within six groups defined by genetic similarity to HGDP and 1000 Genomes reference samples (EUR, CSA, AFR, EAS, MID, AMR) and then meta-analyzed them.",
  "long": "Groups were assigned by projecting participants onto reference PCs and using a random forest (probability &gt; 0.5); the authors stress that the groups do not imply discrete biological populations.",
  "see": [
   "genetic-similarity",
   "hgdp",
   "thousand-genomes"
  ],
  "links": [
   {
    "t": "Pan-UK Biobank",
    "u": "https://pan.ukbb.broadinstitute.org/"
   }
  ],
  "match": [
   "Pan-UKBB",
   "Pan-UK Biobank"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "ancestry"
 },
 {
  "id": "participant-withdrawal",
  "term": "participant withdrawal",
  "short": "A participant's decision to leave a study. UK Biobank offers three levels: no further contact, no further access, and no further use. Data of people who chose no further use must be removed from analyses.",
  "see": [
   "informed-consent",
   "eid"
  ],
  "match": [
   "participant withdrawal",
   "withdrawal",
   "withdrawn participant"
  ],
  "cs": false,
  "auto": true,
  "owner": "uk-biobank"
 },
 {
  "id": "pedigree",
  "term": "pedigree",
  "short": "A standardized diagram of a family: squares for males, circles for females, filled symbols for affected people, horizontal lines joining partners and vertical lines down to their children. Used to read inheritance patterns.",
  "see": [
   "proband",
   "consanguinity",
   "dominant",
   "recessive",
   "x-linked"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Pedigree",
    "u": "https://www.genome.gov/genetics-glossary/Pedigree"
   }
  ],
  "match": [
   "pedigree"
  ],
  "owner": "inheritance"
 },
 {
  "id": "penetrance",
  "term": "penetrance",
  "aka": [
   "incomplete penetrance",
   "reduced penetrance"
  ],
  "short": "The probability that a person with a given genotype shows the associated phenotype, P(phenotype | genotype). Penetrance below 100% (incomplete or reduced penetrance) means some people with the genotype never develop the trait.",
  "long": "Penetrance is often reported by age. For example, the cumulative risk of breast cancer by age 80 is about 72% for women carrying a disease-causing <em>BRCA1</em> variant and 69% for <em>BRCA2</em> (Kuchenbaecker et al. 2017, <em>JAMA</em>).",
  "l1": "slide 29",
  "see": [
   "dominant",
   "carrier",
   "mendelian-disease"
  ],
  "links": [
   {
    "t": "MedlinePlus Genetics: reduced penetrance and variable expressivity",
    "u": "https://medlineplus.gov/genetics/understanding/inheritance/penetranceexpressivity/"
   }
  ],
  "match": [
   "penetrance",
   "penetrant",
   "high-penetrance",
   "high-penetrant",
   "low-penetrance",
   "incomplete penetrance",
   "reduced penetrance"
  ],
  "noPlural": true,
  "owner": "inheritance"
 },
 {
  "id": "person-time",
  "term": "person-time",
  "aka": [
   "person-years"
  ],
  "short": "The total time that participants were followed while at risk of the outcome. For example, 1,000 people each followed for 10 years contribute 10,000 person-years. It is the denominator of an incidence rate.",
  "see": [
   "incidence",
   "follow-up"
  ],
  "match": [
   "person-time",
   "person-years",
   "person-year"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "uk-biobank"
 },
 {
  "id": "phase",
  "term": "phase (haplotype phase)",
  "aka": [
   "haplotype phase",
   "phased genotype",
   "unphased genotype"
  ],
  "short": "Which of a person’s alleles at different heterozygous sites lie on the same chromosome copy. Array genotypes are unphased: a person who is A/a and G/g could carry AG + ag or Ag + aG.",
  "long": "In VCF files, phased genotypes are written with \"|\" (0|1) and unphased ones with \"/\" (0/1). Phase is inferred by <a href=\"glossary.html#phasing\">phasing</a>.",
  "l1": "slides 113–114",
  "see": [
   "haplotype",
   "phasing",
   "heterozygous"
  ],
  "match": [
   "haplotype phase"
  ],
  "cs": false,
  "auto": false,
  "owner": "haplotypes-ld"
 },
 {
  "id": "phasing",
  "term": "phasing",
  "aka": [
   "haplotype phasing",
   "statistical phasing",
   "haplotype estimation"
  ],
  "short": "Inferring each person’s two haplotypes from their genotypes, using relatives (such as trios), statistical models of haplotypes shared in a population (SHAPEIT, Eagle, Beagle), or long sequencing reads spanning several heterozygous sites.",
  "long": "UK Biobank phased its array genotypes with SHAPEIT3 (487,442 participants); the phased haplotypes are data-field 22438 and were the input to imputation.",
  "l1": "slide 114",
  "see": [
   "phase",
   "haplotype",
   "em-algorithm",
   "genotype-imputation",
   "trio"
  ],
  "links": [
   {
    "t": "Browning & Browning 2011, Haplotype phasing: existing methods and new developments",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3217888/"
   }
  ],
  "match": [
   "phasing",
   "haplotype phasing",
   "statistical phasing"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "haplotypes-ld"
 },
 {
  "id": "phecode",
  "term": "phecode",
  "short": "A disease group that combines related diagnosis codes, used to test many diseases at once in a phenome-wide association study (PheWAS). Each phecode excludes people with related diagnoses from its controls.",
  "see": [
   "icd-10",
   "case-definition",
   "control"
  ],
  "match": [
   "phecode"
  ],
  "cs": false,
  "auto": true,
  "owner": "phenotypes"
 },
 {
  "id": "phenotype",
  "term": "phenotype",
  "aka": [
   "phenotypic trait"
  ],
  "short": "Any observable or measurable characteristic of a person, such as a blood test result, body measurement, diagnosis or behavior. In a data set, a phenotype is a column \\(y\\) with one value per person.",
  "l1": "slides 15, 16, 71",
  "see": [
   "trait",
   "genotype",
   "quantitative-trait",
   "binary-trait"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Phenotype",
    "u": "https://www.genome.gov/genetics-glossary/Phenotype"
   }
  ],
  "match": [
   "phenotype"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "physical-measurement",
  "term": "physical measurement",
  "short": "A measurement of the body taken by trained staff with an instrument and a written protocol, such as height, weight, blood pressure or grip strength.",
  "long": "Repeated readings at the same visit, such as the two blood pressure readings in UK Biobank, are stored as array indices of one data-field. Averaging them reduces random measurement error.",
  "see": [
   "bmi",
   "measurement-error",
   "array-index"
  ],
  "match": [
   "physical measurement"
  ],
  "cs": false,
  "auto": true,
  "owner": "phenotypes"
 },
 {
  "id": "pi-hat",
  "term": "PI_HAT (proportion IBD)",
  "aka": [
   "proportion IBD",
   "π̂"
  ],
  "short": "PLINK’s estimate of the proportion of the genome two people share identical by descent: \\(P(\\mathrm{IBD} = 2) + \\tfrac{1}{2} P(\\mathrm{IBD} = 1)\\), where \\(P(\\mathrm{IBD} = k)\\) is the estimated fraction of the genome at which they share \\(k\\) of their two allele copies IBD; sharing one copy counts one half. It is twice the kinship coefficient. About 1 for duplicates, 0.5 for first-degree and 0.25 for second-degree relatives.",
  "long": "Identical twins also give values near 1. PLINK <code>--genome</code> reports it with Z0, Z1 and Z2, the estimated probabilities of sharing 0, 1 or 2 alleles IBD. Estimates are biased when the sample mixes genetically different groups.",
  "see": [
   "ibd",
   "kinship-coefficient",
   "plink"
  ],
  "links": [
   {
    "t": "PLINK 1.9: identity by descent",
    "u": "https://www.cog-genomics.org/plink/1.9/ibd"
   }
  ],
  "match": [
   "PI_HAT",
   "proportion IBD"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "inheritance"
 },
 {
  "id": "plasma",
  "term": "plasma (blood plasma)",
  "aka": [
   "blood plasma"
  ],
  "short": "The liquid part of blood, about 55% of its volume: water carrying proteins, salts, nutrients and clotting factors. It forms the top layer when a tube of blood is spun in a centrifuge.",
  "long": "Plasma holds no cells, so it is not a source of a person's genomic DNA. It is the material for many blood measurements, such as the plasma proteins measured in part of UK Biobank (see the genes and gene expression page).",
  "see": [
   "whole-blood",
   "serum",
   "buffy-coat"
  ],
  "links": [
   {
    "t": "OpenStax Anatomy & Physiology 2e, 18.1: An overview of blood",
    "u": "https://openstax.org/books/anatomy-and-physiology-2e/pages/18-1-an-overview-of-blood"
   }
  ],
  "match": [
   "plasma",
   "blood plasma"
  ],
  "noPlural": true,
  "owner": "samples-to-genotypes"
 },
 {
  "id": "platelet",
  "term": "platelet (thrombocyte)",
  "aka": [
   "thrombocyte"
  ],
  "short": "A small fragment of a large bone-marrow cell that circulates in blood and helps it clot. Platelets have no nucleus, so they carry no nuclear DNA.",
  "long": "Platelets sit with the white blood cells in the buffy coat of a centrifuged blood sample.",
  "see": [
   "buffy-coat",
   "white-blood-cell",
   "whole-blood"
  ],
  "links": [
   {
    "t": "OpenStax Anatomy & Physiology 2e, 18.4: Leukocytes and platelets",
    "u": "https://openstax.org/books/anatomy-and-physiology-2e/pages/18-4-leukocytes-and-platelets"
   }
  ],
  "match": [
   "platelet",
   "thrombocyte"
  ],
  "owner": "samples-to-genotypes"
 },
 {
  "id": "pleiotropy",
  "term": "pleiotropy",
  "aka": [
   "pleiotropic"
  ],
  "short": "When one genetic variant affects two or more different traits. Example: the <em>APOE</em> ε4 allele raises LDL cholesterol and the risk of Alzheimer’s disease. Pleiotropy can break the assumptions of Mendelian randomization.",
  "see": [
   "mendelian-randomization",
   "instrumental-variable"
  ],
  "match": [
   "pleiotropy",
   "pleiotropic"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "plink",
  "term": "PLINK",
  "short": "Free command-line software for genotype data. It reads and writes PLINK filesets and other formats, filters people and variants, computes allele frequencies, relatedness and principal components, and tests variants for association.",
  "long": "PLINK 1.9 and PLINK 2.0 are developed by Christopher Chang and colleagues (Chang et al. 2015). PLINK 2.0 adds its own fileset (<code>.pgen</code>/<code>.pvar</code>/<code>.psam</code>), which can also store dosages. The Session 1 practical uses PLINK for quality control.",
  "l1": "slide 8",
  "see": [
   "plink-binary",
   "bgen",
   "vcf",
   "regenie"
  ],
  "links": [
   {
    "t": "PLINK 1.9 documentation",
    "u": "https://www.cog-genomics.org/plink/1.9/"
   },
   {
    "t": "PLINK 2.0 documentation",
    "u": "https://www.cog-genomics.org/plink/2.0/"
   }
  ],
  "match": [
   "PLINK"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "the-data"
 },
 {
  "id": "pgen",
  "term": "PLINK 2 fileset (.pgen/.pvar/.psam)",
  "aka": [
   "PGEN",
   "pgen/pvar/psam"
  ],
  "short": "PLINK 2’s binary genotype format: .pgen holds the genotypes, compressed and able to store dosages; .pvar lists the variants; .psam lists the people. It extends the .bed/.bim/.fam fileset to imputed and very large data.",
  "long": "PLINK 2 reads and writes it natively and can convert BGEN and VCF files to it; REGENIE reads it directly.",
  "see": [
   "plink",
   "plink-binary",
   "bgen",
   "dosage"
  ],
  "match": [
   "PLINK 2 fileset",
   "PLINK 2 binary fileset",
   "PGEN"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "the-data"
 },
 {
  "id": "plink-binary",
  "term": "PLINK binary fileset (.bed/.bim/.fam)",
  "aka": [
   "PLINK 1 binary format",
   "bed/bim/fam"
  ],
  "short": "Three files that together store genotype calls: <code>.fam</code> lists the people (one line each), <code>.bim</code> lists the variants and their alleles (one line each), and <code>.bed</code> holds the genotypes, packed at 2 bits per entry.",
  "long": "The <code>.bed</code> file starts with the bytes <code>6c 1b 01</code>, then stores one variant at a time, four people per byte. It holds only hard calls (0, 1, 2 or missing), not imputed dosages. It is unrelated to the BED text format for genomic intervals.",
  "see": [
   "plink",
   "genotype-matrix",
   "bgen",
   "bed-format"
  ],
  "links": [
   {
    "t": "PLINK 1.9: file formats",
    "u": "https://www.cog-genomics.org/plink/1.9/formats"
   }
  ],
  "match": [
   "PLINK binary fileset",
   "PLINK fileset",
   "binary fileset",
   "PLINK binary file"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "the-data"
 },
 {
  "id": "poly-a-tail",
  "term": "poly(A) tail",
  "short": "A run of adenine (A) nucleotides added to the 3′ end of an mRNA, just after a short signal (AAUAAA) in the 3′ UTR. It protects the mRNA and helps it be translated.",
  "l1": "slide 62",
  "see": [
   "mrna",
   "five-prime-cap",
   "utr"
  ],
  "match": [
   "poly(A) tail",
   "poly-A tail",
   "polyA tail"
  ],
  "cs": true,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "polygenic",
  "term": "polygenic",
  "aka": [
   "polygenicity"
  ],
  "short": "Influenced by many genetic variants, each with a small effect. Most common traits and diseases are polygenic.",
  "long": "Height is an extreme example: a GWAS of about 5.4 million people found 12,111 independent associated SNPs (Yengo et al., <em>Nature</em> 2022).",
  "l1": "slides 20, 37, 51",
  "see": [
   "monogenic",
   "complex-trait",
   "polygenic-score",
   "genetic-architecture"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Polygenic Trait",
    "u": "https://www.genome.gov/genetics-glossary/Polygenic-Trait"
   }
  ],
  "match": [
   "polygenic",
   "polygenicity"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "polygenic-score",
  "term": "polygenic score (PRS, PGS)",
  "aka": [
   "polygenic risk score",
   "PRS",
   "PGS",
   "genetic risk score"
  ],
  "short": "A weighted sum of a person’s effect-allele counts across many variants, with weights from a GWAS: \\(\\mathrm{PRS}_i = \\sum_j \\hat{\\beta}_j g_{ij}\\), where \\(g_{ij}\\) is person \\(i\\)’s number of effect-allele copies at variant \\(j\\) and \\(\\hat{\\beta}_j\\) the GWAS estimate of that variant’s per-allele effect. It is less accurate in people less genetically similar to the GWAS participants.",
  "long": "It ranks people by genetic predisposition; it does not predict any one person’s outcome with certainty. Accuracy falls with genetic distance from the GWAS sample, and most participants of large GWAS so far have been genetically similar to European reference samples.",
  "l1": "slides 20, 37, 51 (Session 6)",
  "see": [
   "polygenic",
   "gwas",
   "summary-statistics"
  ],
  "links": [
   {
    "t": "NHGRI: Polygenic Risk Scores",
    "u": "https://www.genome.gov/Health/Genomics-and-Medicine/Polygenic-risk-scores"
   },
   {
    "t": "NHGRI Talking Glossary: Polygenic Risk Score",
    "u": "https://www.genome.gov/genetics-glossary/Polygenic-Risk-Score-PRS"
   }
  ],
  "match": [
   "polygenic score",
   "polygenic risk score",
   "PRS",
   "PGS"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "polymorphic",
  "term": "polymorphic",
  "short": "Describes a site (locus) at which more than one allele is observed in a sample or population. Lecture 1 defines an allele as the sequence at a polymorphic locus.",
  "l1": "slides 71, 79",
  "see": [
   "monomorphic",
   "snp"
  ],
  "match": [
   "polymorphic"
  ],
  "noPlural": true,
  "owner": "allele-frequencies"
 },
 {
  "id": "polymorphism",
  "term": "polymorphism",
  "aka": [],
  "short": "A variant that is common in a population: by a traditional convention, its less common allele has a frequency of at least 1%. The single-base case is a single nucleotide polymorphism (SNP).",
  "long": "Because the 1% cut-off is arbitrary and differs between populations, clinical guidelines now prefer the word “variant” together with a stated frequency.",
  "l1": "slides 17, 65–68, 70, 78",
  "see": [
   "snp",
   "genetic-variant",
   "maf"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Polymorphism",
    "u": "https://www.genome.gov/genetics-glossary/Polymorphism"
   }
  ],
  "match": [
   "polymorphism"
  ],
  "owner": "variation"
 },
 {
  "id": "population",
  "term": "population",
  "short": "In genetics, a group of people who mostly have children with one another and so carry alleles in similar proportions. In epidemiology, the group a study is about, from which its sample is drawn.",
  "long": "A genetic population usually forms because its members live in the same region or share recent ancestors. Its boundaries are fuzzy: allele frequencies usually change gradually with geography. Population labels in reference panels (for example the 1000 Genomes super-populations) describe how samples were collected, not natural kinds. In epidemiology, the target population is the group the results should apply to; the people actually studied are the sample.",
  "l1": "slides 11, 72, 75, 89, 92–94, 97",
  "see": [
   "sample",
   "target-population",
   "allele-frequency",
   "genetic-drift"
  ],
  "links": [
   {
    "t": "NASEM (2023): Using Population Descriptors in Genetics and Genomics Research",
    "u": "https://www.nationalacademies.org/read/26902"
   }
  ],
  "match": [
   "population"
  ],
  "owner": "allele-frequencies"
 },
 {
  "id": "bottleneck",
  "term": "population bottleneck",
  "short": "A period when a population is very small. Drift is strong during it, so allele frequencies shift by chance and many rare alleles are lost, which reduces genetic diversity afterwards.",
  "l1": "slide 97",
  "see": [
   "founder-effect",
   "genetic-drift"
  ],
  "links": [
   {
    "t": "Scitable: Genetic Drift and Effective Population Size",
    "u": "https://www.nature.com/scitable/topicpage/genetic-drift-and-effective-population-size-772523/"
   }
  ],
  "match": [
   "population bottleneck",
   "bottleneck"
  ],
  "owner": "allele-frequencies"
 },
 {
  "id": "population-descriptor",
  "term": "population descriptor",
  "short": "A concept or classification scheme used to sort people into groups, such as race, ethnicity, geography or genetic similarity (NASEM 2023). Studies should say which descriptor they used, why, and how labels were assigned.",
  "l1": "slide 48",
  "see": [
   "race",
   "ethnicity",
   "genetic-similarity",
   "genetic-ancestry"
  ],
  "links": [
   {
    "t": "NASEM 2023: Using Population Descriptors in Genetics and Genomics Research",
    "u": "https://www.nationalacademies.org/read/26902"
   }
  ],
  "match": [
   "population descriptor"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "ancestry"
 },
 {
  "id": "population-stratification",
  "term": "population stratification",
  "short": "Confounding by ancestry in an association study: when allele frequencies and the trait both vary with genetic ancestry, SNPs with no effect appear associated. It is controlled with principal components, mixed models or family designs.",
  "long": "Detected as an excess of small p-values across the genome (QQ plot, genomic inflation factor \\(\\lambda\\)). Classic example: among people described as European American, an <em>LCT</em> variant appeared associated with height because both its frequency and average height vary across Europe (Campbell et al. 2005).",
  "see": [
   "confounding",
   "population-structure",
   "principal-component",
   "genomic-inflation"
  ],
  "links": [
   {
    "t": "Price et al. 2010, New approaches to population stratification (PMC)",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC2975875/"
   }
  ],
  "match": [
   "population stratification"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "ancestry"
 },
 {
  "id": "population-structure",
  "term": "population structure",
  "short": "Systematic differences in allele frequencies between subgroups of a sample, caused by shared ancestry within the subgroups. In a genotype matrix it makes rows correlated: people with more shared recent ancestry have more similar genotypes.",
  "long": "Population structure is usually continuous (clines) rather than a set of discrete groups. PCA and admixture models are the standard ways to describe it.",
  "l1": "slide 103",
  "see": [
   "pca",
   "fst",
   "population-stratification",
   "cline"
  ],
  "match": [
   "population structure"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "ancestry"
 },
 {
  "id": "positive-predictive-value",
  "term": "positive predictive value (PPV)",
  "short": "The share of people identified as cases by a test or case definition who truly have the disease. A PPV of 90% means that 1 in 10 of the identified cases is wrong.",
  "see": [
   "case-definition",
   "misclassification"
  ],
  "match": [
   "positive predictive value",
   "PPV"
  ],
  "cs": false,
  "auto": true,
  "owner": "phenotypes"
 },
 {
  "id": "pre-mrna",
  "term": "pre-mRNA",
  "aka": [
   "primary transcript"
  ],
  "short": "The first RNA copy of a gene, made by transcription, which still contains the introns. Splicing, a 5′ cap and a poly(A) tail turn it into mature mRNA.",
  "l1": "slide 62",
  "see": [
   "mrna",
   "splicing"
  ],
  "match": [
   "pre-mRNA",
   "primary transcript",
   "primary RNA transcript"
  ],
  "cs": true,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "prevalence",
  "term": "prevalence",
  "short": "The proportion of a group that has a condition at a given time: people with the condition divided by all in the group. It depends on both incidence and how long the condition lasts.",
  "see": [
   "incidence",
   "cross-sectional-study"
  ],
  "match": [
   "prevalence"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "uk-biobank"
 },
 {
  "id": "prevalent-case",
  "term": "prevalent case",
  "short": "A person who already had the disease at the start of follow-up (in UK Biobank, the baseline visit). Prevalent cases are survivors up to that point; studies of what predicts new disease exclude them.",
  "see": [
   "incident-case",
   "prevalence",
   "case-definition"
  ],
  "match": [
   "prevalent case"
  ],
  "cs": false,
  "auto": true,
  "owner": "phenotypes"
 },
 {
  "id": "primary-care-data",
  "term": "primary care (GP) records",
  "short": "Records kept by general practitioners (GPs, family doctors): diagnoses, symptoms, prescriptions and test results, coded in Read v2 or CTV3. In UK Biobank they cover about 45% of participants, up to 2016 or 2017.",
  "see": [
   "electronic-health-record",
   "read-codes"
  ],
  "links": [
   {
    "t": "UK Biobank: Primary care linked data (PDF)",
    "u": "https://biobank.ndph.ox.ac.uk/ukb/ukb/docs/primary_care_data.pdf"
   }
  ],
  "match": [
   "primary care data",
   "primary care records",
   "primary-care records",
   "GP records",
   "GP data"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "uk-biobank"
 },
 {
  "id": "principal-component",
  "term": "principal component (PC)",
  "short": "One axis found by PCA. In genotype data each person gets a score on each PC (PC1, PC2, …), and genetically similar people get similar scores. Adding top PCs as covariates adjusts for population stratification.",
  "long": "UK Biobank provides 40 genetic PCs per participant (field 22009). PLINK computes 20 (PLINK 1.9) or 10 (PLINK 2.0) by default and writes them to an .eigenvec file.",
  "l1": "slides 98, 102–105",
  "see": [
   "pca",
   "population-stratification",
   "covariate"
  ],
  "match": [
   "principal component",
   "Principal component",
   "PC"
  ],
  "cs": true,
  "auto": true,
  "noPlural": false,
  "owner": "ancestry"
 },
 {
  "id": "pca",
  "term": "principal component analysis (PCA)",
  "short": "A method that finds the directions of largest variance in a data matrix. Applied to standardized genotypes, its top components (eigenvectors of the genetic relationship matrix) summarize genetic similarity between the people in a sample.",
  "long": "Steps: LD-prune common SNPs; standardize each SNP column of the \\(n \\times m\\) genotype matrix (\\(n\\) people, \\(m\\) SNPs) to get \\(\\mathbf{Z}\\); form the \\(n \\times n\\) matrix \\(\\mathbf{K} = \\mathbf{Z}\\mathbf{Z}^{\\top}/m\\); take its top eigenvectors. PCs describe the sample analyzed; who is included changes the picture.",
  "l1": "slides 98, 102–105",
  "see": [
   "principal-component",
   "genetic-relationship-matrix",
   "population-structure"
  ],
  "links": [
   {
    "t": "PLINK 2.0 documentation: --pca",
    "u": "https://www.cog-genomics.org/plink/2.0/strat"
   }
  ],
  "match": [
   "PCA",
   "principal component analysis",
   "Principal component analysis",
   "principal components analysis",
   "Principal components analysis"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "ancestry"
 },
 {
  "id": "proband",
  "term": "proband",
  "aka": [
   "index case"
  ],
  "short": "The family member through whom a family first comes to the attention of researchers or clinicians, usually an affected person. Marked with an arrow in a pedigree.",
  "l1": "slide 15",
  "see": [
   "pedigree",
   "forward-genetics"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Proband",
    "u": "https://www.genome.gov/genetics-glossary/Proband"
   }
  ],
  "match": [
   "proband"
  ],
  "owner": "inheritance"
 },
 {
  "id": "probe",
  "term": "probe",
  "short": "A short single-stranded DNA sequence designed to match a target sequence, so that DNA from a sample binds (hybridizes) to it. On a genotyping array each probe matches the genome next to one SNP.",
  "long": "Exome sequencing also uses probes, in solution, to capture the DNA fragments that overlap exons.",
  "see": [
   "hybridization",
   "genotyping-array",
   "wes"
  ],
  "links": [
   {
    "t": "NHGRI: DNA Microarray Technology Fact Sheet",
    "u": "https://www.genome.gov/about-genomics/fact-sheets/DNA-Microarray-Technology"
   },
   {
    "t": "Affymetrix Axiom array data sheet: assay chemistry (PDF)",
    "u": "https://documents.thermofisher.com/TFS-Assets/LSG/brochures/axiom_ceu_arrayplate_datasheet.pdf"
   }
  ],
  "match": [
   "probe"
  ],
  "owner": "samples-to-genotypes"
 },
 {
  "id": "promoter",
  "term": "promoter",
  "short": "The stretch of DNA just before (upstream of) a gene’s transcription start site where RNA polymerase and its helper proteins bind. Variants in it can change how much the gene is transcribed.",
  "l1": "slides 62–63",
  "see": [
   "enhancer",
   "tss",
   "regulatory-element"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Promoter",
    "u": "https://www.genome.gov/genetics-glossary/Promoter"
   },
   {
    "t": "Learn.Genetics: Anatomy of a gene",
    "u": "https://learn.genetics.utah.edu/content/basics/geneanatomy/"
   }
  ],
  "match": [
   "promoter"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "prospective-cohort-study",
  "term": "prospective cohort study",
  "short": "A cohort study in which exposures are measured first, at baseline, and outcomes are recorded afterwards as they happen. UK Biobank is one: baseline visits in 2006–2010, outcomes from health records since.",
  "long": "In a retrospective cohort study, both exposures and outcomes are reconstructed from records that already exist.",
  "see": [
   "cohort-study",
   "baseline",
   "follow-up"
  ],
  "match": [
   "prospective cohort study",
   "prospective cohort",
   "prospective study"
  ],
  "cs": false,
  "auto": true,
  "owner": "uk-biobank"
 },
 {
  "id": "protein",
  "term": "protein",
  "short": "A chain of amino acids, folded into a specific three-dimensional shape, made by translating an mRNA. Proteins do most of the work in cells, as enzymes, receptors, transporters, signals, structural fibers and gene regulators.",
  "long": "The median human protein is about 430 amino acids long (one representative transcript per gene, GENCODE release 50). β-globin, made from <em>HBB</em>, has 147.",
  "l1": "slides 58, 61, 74",
  "see": [
   "amino-acid",
   "translation",
   "gene"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Protein",
    "u": "https://www.genome.gov/genetics-glossary/Protein"
   },
   {
    "t": "MedlinePlus Genetics: What are proteins and what do they do?",
    "u": "https://medlineplus.gov/genetics/understanding/howgeneswork/protein/"
   }
  ],
  "match": [
   "protein"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "pqtl",
  "term": "protein quantitative trait locus (pQTL)",
  "aka": [
   "pQTL"
  ],
  "short": "A genetic variant associated with the level of a protein, usually measured in blood plasma. UK Biobank's proteomics project mapped pQTLs for 2,923 plasma proteins in 54,219 participants.",
  "see": [
   "eqtl",
   "proteomics",
   "olink"
  ],
  "links": [
   {
    "t": "Sun et al. 2023, Plasma proteomic associations in UK Biobank (Nature, free text)",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC10567551/"
   }
  ],
  "match": [
   "pQTL",
   "protein quantitative trait locus",
   "protein quantitative trait loci"
  ],
  "cs": true,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "protein-coding-gene",
  "term": "protein-coding gene",
  "short": "A gene whose mRNA is translated into a protein. GENCODE release 50 lists 19,442 human protein-coding genes (20,107 including read-through genes); their coding sequence covers about 1.1–1.2% of the genome.",
  "long": "Lecture 1 (slide 58) quotes 1.5%, an older textbook value. The share depends on the annotation release and on whether one transcript per gene or all transcripts are counted.",
  "l1": "slide 58",
  "see": [
   "gene",
   "cds",
   "non-coding-rna"
  ],
  "links": [
   {
    "t": "GENCODE: human release statistics",
    "u": "https://www.gencodegenes.org/human/stats.html"
   }
  ],
  "match": [
   "protein-coding gene"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "proteomics",
  "term": "proteomics",
  "short": "Measuring many proteins in a sample at once. In UK Biobank’s first large project, the Olink platform measured 2,923 proteins in blood plasma from 54,219 participants.",
  "see": [
   "olink",
   "pqtl",
   "limit-of-detection",
   "protein"
  ],
  "match": [
   "proteomics",
   "proteomic"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "phenotypes"
 },
 {
  "id": "pseudoautosomal-region",
  "term": "pseudoautosomal region (PAR)",
  "aka": [
   "PAR1",
   "PAR2",
   "XY region"
  ],
  "short": "One of the two regions at the tips of the X and Y chromosomes (PAR1, PAR2) that both chromosomes share. Males therefore have two copies, as for autosomes; PLINK codes their variants as XY (25).",
  "long": "PAR1 (about 2.77 Mb) lies at the tips of the short arms and PAR2 (about 0.33 Mb) at the tips of the long arms. In male meiosis a crossover in PAR1 is needed for X and Y to separate correctly.",
  "see": [
   "x-chromosome",
   "y-chromosome",
   "hemizygous"
  ],
  "links": [
   {
    "t": "Mangs & Morris 2007, The human pseudoautosomal region (PAR)",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC2435358/"
   }
  ],
  "match": [
   "pseudoautosomal region"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "cells-chromosomes"
 },
 {
  "id": "pseudogene",
  "term": "pseudogene",
  "short": "A copy of a gene that can no longer make a working protein, for example <em>HBBP1</em> in the β-globin gene cluster. GENCODE release 50 lists 14,702 human pseudogenes.",
  "see": [
   "gene",
   "protein-coding-gene"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Pseudogene",
    "u": "https://www.genome.gov/genetics-glossary/Pseudogene"
   }
  ],
  "match": [
   "pseudogene"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "punnett-square",
  "term": "Punnett square",
  "short": "A table pairing each possible sperm allele with each egg allele to list a child’s possible genotypes and their probabilities. For two heterozygous parents it gives 0, 1 and 2 copies in the ratio 1:2:1.",
  "long": "A heterozygous parent transmits a given allele with probability \\(\\tfrac{1}{2}\\), a \\(\\Bernoulli(\\tfrac{1}{2})\\) draw, independently of the other parent. For two heterozygous parents the child’s number of copies of the allele is the sum of the two draws, \\(\\Binomial(2, \\tfrac{1}{2})\\): 0, 1 or 2 with probabilities \\(\\tfrac{1}{4}\\), \\(\\tfrac{1}{2}\\) and \\(\\tfrac{1}{4}\\).",
  "see": [
   "segregation",
   "mendels-laws",
   "genotype"
  ],
  "match": [
   "Punnett square"
  ],
  "owner": "inheritance"
 },
 {
  "id": "purine",
  "term": "purine",
  "short": "A base with two rings: adenine (A) or guanine (G). In DNA each purine pairs with a pyrimidine (A with T, G with C), so every base pair has the same width.",
  "see": [
   "pyrimidine",
   "base",
   "base-pair"
  ],
  "match": [
   "purine"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "dna"
 },
 {
  "id": "pvcf",
  "term": "pVCF (project-level VCF)",
  "aka": [
   "population-level VCF",
   "multi-sample VCF"
  ],
  "short": "A VCF with a column for every person in a study. Everyone is genotyped together, so every site has an entry for every person (a genotype call or a missing value).",
  "long": "Each pVCF file usually covers one genomic region. UK Biobank's exome sequencing (Field 23157) and genome sequencing (Field 24310) variant calls are provided as pVCF files on GRCh38, with PLINK and BGEN versions alongside.",
  "see": [
   "vcf",
   "wes",
   "wgs"
  ],
  "links": [
   {
    "t": "Backman et al. 2021, exome sequencing of 454,787 UK Biobank participants",
    "u": "https://doi.org/10.1038/s41586-021-04103-z"
   }
  ],
  "match": [
   "pVCF",
   "project-level VCF",
   "population-level VCF"
  ],
  "cs": true,
  "auto": true,
  "noPlural": false,
  "owner": "the-data"
 },
 {
  "id": "pyrimidine",
  "term": "pyrimidine",
  "short": "A base with one ring: cytosine (C) or thymine (T) in DNA. Each pyrimidine pairs with a purine (C with G, T with A).",
  "see": [
   "purine",
   "base",
   "base-pair"
  ],
  "match": [
   "pyrimidine"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "dna"
 },
 {
  "id": "qc",
  "term": "quality control (QC)",
  "aka": [
   "QC"
  ],
  "short": "The checks that remove or flag samples and variants whose genotypes are likely to be wrong, by comparing the data with what biology predicts: call rates, heterozygosity, sex, relatedness, ancestry, Hardy–Weinberg proportions and allele frequencies.",
  "long": "QC reads the genotype matrix in two directions: sample QC along the rows (people) and variant QC down the columns (variants). Thresholds differ between protocols; published values are typical choices, not universal rules.",
  "l1": "slides 8, 83, 98",
  "see": [
   "sample-qc",
   "variant-qc",
   "call-rate",
   "hwe",
   "heterozygosity"
  ],
  "links": [
   {
    "t": "Anderson et al. 2010: Data quality control in genetic case-control association studies",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3025522/"
   },
   {
    "t": "Marees et al. 2018: A tutorial on conducting GWAS: quality control and statistical analysis",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC6001694/"
   },
   {
    "t": "DCEG workshop, Session 1 practical: QC with PLINK",
    "u": "https://dceg-workshops.github.io/statistical_genetics_workshop/sessions/session_1/practical"
   }
  ],
  "match": [
   "quality control",
   "Quality control",
   "QC"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "samples-to-genotypes"
 },
 {
  "id": "qq-plot",
  "term": "quantile–quantile (QQ) plot",
  "aka": [
   "Q–Q plot"
  ],
  "short": "A plot of a GWAS’s sorted p-values, on a −log<sub>10</sub> scale, against those expected if no variant were associated. Points on the diagonal fit no association; a curve leaving the diagonal early suggests inflation.",
  "long": "A few points leaving the diagonal only at the top end are what true associations look like. A lift of the whole curve can come from confounding such as population stratification, but in large studies of polygenic traits many small true effects also lift it; LD score regression helps separate the two.",
  "see": [
   "genomic-inflation",
   "manhattan-plot",
   "ld-score-regression"
  ],
  "match": [
   "QQ plot",
   "Q–Q plot",
   "Q-Q plot",
   "QQ-plot",
   "quantile–quantile plot",
   "quantile-quantile plot"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "the-data"
 },
 {
  "id": "quantitative-trait",
  "term": "quantitative trait",
  "aka": [
   "continuous trait"
  ],
  "short": "A trait measured on a continuous scale, such as height (cm), body mass index or LDL cholesterol (mmol/L). Its association with a variant is usually tested with linear regression.",
  "l1": "slide 28 (“continuous traits”)",
  "see": [
   "binary-trait",
   "additive-model"
  ],
  "match": [
   "quantitative trait"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "race",
  "term": "race",
  "short": "A sociopolitically constructed system for classifying and ranking people by beliefs about shared ancestry based on perceived biological similarities. It is not a measure of, or proxy for, genetic variation (NASEM 2023).",
  "long": "Racial categories vary across countries and over time. Race can matter in research as a social exposure (for example to discrimination). NASEM recommends that genetics studies not use race as a proxy for genetic variation and not assign genetic ancestry labels on the basis of race.",
  "l1": "slide 40",
  "see": [
   "ethnicity",
   "population-descriptor",
   "genetic-similarity"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Race",
    "u": "https://www.genome.gov/genetics-glossary/Race"
   }
  ],
  "match": [
   "race"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "ancestry"
 },
 {
  "id": "random-mating",
  "term": "random mating",
  "short": "Mating in which people’s genotypes at a locus do not influence who has children with whom. A child’s two alleles at that locus are then independent draws from the population’s alleles, giving Hardy–Weinberg proportions.",
  "long": "Mating can be random at one locus and non-random at another, for example at loci that affect height (partners tend to be of similar height) or whose allele frequencies vary with genetic ancestry.",
  "l1": "slide 81",
  "see": [
   "hwe",
   "consanguinity",
   "wahlund-effect"
  ],
  "links": [
   {
    "t": "Scitable: The Hardy-Weinberg Principle",
    "u": "https://www.nature.com/scitable/knowledge/library/the-hardy-weinberg-principle-13235724/"
   }
  ],
  "match": [
   "random mating"
  ],
  "noPlural": true,
  "owner": "allele-frequencies"
 },
 {
  "id": "rank-inverse-normal-transformation",
  "term": "rank-based inverse normal transformation",
  "aka": [
   "RINT",
   "inverse normal transformation"
  ],
  "short": "Replacing each phenotype value by the standard normal quantile of its rank, making the column normally distributed. It removes skew and outlier influence; effects are then in SD units of the transformed trait.",
  "long": "A common formula is \\(\\Phi^{-1}((r - 3/8)/(n + 1/4))\\) for the value with rank \\(r\\) among \\(n\\) values (Blom’s offset), where \\(\\Phi^{-1}\\) is the inverse of the standard normal cumulative distribution function. The ranks become evenly spaced probabilities strictly between 0 and 1, so the smallest and largest values map to finite normal quantiles.",
  "see": [
   "quantitative-trait",
   "regenie"
  ],
  "match": [
   "rank-based inverse normal transformation",
   "rank inverse normal transformation",
   "inverse normal transformation"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "phenotypes"
 },
 {
  "id": "rare-variant",
  "term": "rare variant",
  "short": "A variant whose minor allele frequency is below 1% (the Lecture 1 cutoff; the 1000 Genomes Project used 0.5%). Most human variant sites are rare, and they are usually studied by sequencing.",
  "long": "Arrays measure few rare variants directly and imputation is less accurate for them, so they are usually studied by exome or genome sequencing and analyzed with gene-based tests that pool the rare variants of one gene (see rare-variant association study).",
  "l1": "slide 88",
  "see": [
   "low-frequency-variant",
   "common-variant",
   "allele-frequency-spectrum"
  ],
  "links": [
   {
    "t": "1000 Genomes Project Consortium 2015: A global reference for human genetic variation",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC4750478/"
   }
  ],
  "match": [
   "rare variant"
  ],
  "owner": "allele-frequencies"
 },
 {
  "id": "rare-variant-association-study",
  "term": "rare-variant association study",
  "aka": [
   "burden test",
   "gene-based test"
  ],
  "short": "A study that tests rare variants, usually found by sequencing, for association with a trait. Each is carried by few people, so a gene’s rare variants are usually tested together, as in a burden test.",
  "long": "A burden test counts each person’s qualifying rare alleles in a gene (for example predicted loss-of-function variants) and tests that count; variance-component tests such as SKAT allow effects in both directions.",
  "l1": "slides 29, 52 (Session 7)",
  "see": [
   "rare-variant",
   "gwas",
   "wes"
  ],
  "match": [
   "rare-variant association study",
   "rare variant association study",
   "burden test"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "sequencing-read",
  "term": "read (sequencing read)",
  "aka": [
   "sequencing read"
  ],
  "short": "The sequence of bases a sequencer reports for one DNA fragment: 50–300 bases for short-read instruments, thousands or more for long-read ones. Reads are aligned to the reference genome and counted to call genotypes.",
  "long": "Each read comes from one of the person's two chromosome copies, so at a heterozygous site about half the reads show each allele.",
  "see": [
   "paired-end-read",
   "read-alignment",
   "read-depth",
   "variant-calling"
  ],
  "links": [
   {
    "t": "Goodwin et al. 2016: Coming of age: ten years of next-generation sequencing technologies",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC10373632/"
   }
  ],
  "match": [
   "sequencing read"
  ],
  "auto": false,
  "owner": "samples-to-genotypes"
 },
 {
  "id": "read-alignment",
  "term": "read alignment (mapping)",
  "aka": [
   "read mapping",
   "mapping"
  ],
  "short": "Finding where in the reference genome each sequencing read, or read pair, comes from by matching its sequence. Reads from repeated sequences can match several places and are hard to place.",
  "long": "UK Biobank's exomes and genomes were aligned to GRCh38. Positions that are hard to map have lower depth and less reliable calls.",
  "see": [
   "reference-genome",
   "sequencing-read",
   "read-depth",
   "grch38"
  ],
  "links": [
   {
    "t": "Goodwin et al. 2016: Coming of age: ten years of next-generation sequencing technologies",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC10373632/"
   },
   {
    "t": "Van der Auwera et al. 2013: From FastQ data to high-confidence variant calls (GATK Best Practices)",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC4243306/"
   }
  ],
  "match": [
   "read alignment",
   "read mapping"
  ],
  "owner": "samples-to-genotypes"
 },
 {
  "id": "read-codes",
  "term": "Read codes",
  "aka": [
   "Read version 2",
   "CTV3"
  ],
  "short": "The coded vocabularies of UK primary care records before the move to SNOMED CT from 2018: Read version 2 and Clinical Terms Version 3 (CTV3). They code diagnoses, symptoms, test results and prescriptions.",
  "see": [
   "icd-10",
   "primary-care-data"
  ],
  "match": [
   "Read codes",
   "Read code",
   "Read version 2",
   "Read v2",
   "CTV3"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "phenotypes"
 },
 {
  "id": "read-depth",
  "term": "read depth (coverage)",
  "aka": [
   "coverage",
   "sequencing depth",
   "depth of coverage"
  ],
  "short": "The number of aligned reads covering a position; averaged over the genome, the total number of bases sequenced divided by the genome length (written, for example, 30×). Heterozygotes need enough depth to show both alleles.",
  "long": "At a heterozygous site covered by \\(d\\) reads, each read comes from either chromosome copy with probability \\(\\tfrac{1}{2}\\), independently, so the chance that all come from the same copy, and the site looks homozygous, is \\(2 \\times (\\tfrac{1}{2})^d\\): \\(\\tfrac{1}{8}\\) at \\(d = 4\\). UK Biobank genomes average 32.5× (at least 23.5× in every person); 95.8% of targeted exome bases were read at least 20 times.",
  "see": [
   "variant-calling",
   "wgs",
   "wes",
   "sequencing-read"
  ],
  "links": [
   {
    "t": "Illumina: Sequencing coverage for NGS experiments",
    "u": "https://www.illumina.com/science/technology/next-generation-sequencing/plan-experiments/coverage.html"
   }
  ],
  "match": [
   "read depth",
   "sequencing depth",
   "depth of coverage",
   "sequencing coverage"
  ],
  "noPlural": true,
  "owner": "samples-to-genotypes"
 },
 {
  "id": "reading-frame",
  "term": "reading frame",
  "short": "The way an mRNA's bases are grouped into consecutive codons, fixed by the start codon. Inserting or deleting a number of bases that is not a multiple of three shifts the frame (a frameshift).",
  "see": [
   "codon",
   "start-codon",
   "frameshift-variant"
  ],
  "links": [
   {
    "t": "Learn.Genetics: Transcribe and translate a gene",
    "u": "https://learn.genetics.utah.edu/content/basics/txtl/"
   }
  ],
  "match": [
   "reading frame"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "receptor",
  "term": "receptor",
  "short": "A protein that binds a specific molecule and responds to it, often sitting in the cell's outer membrane. The LDL receptor, for example, binds LDL particles in the blood and brings them into the cell.",
  "see": [
   "protein",
   "ldl-cholesterol"
  ],
  "links": [
   {
    "t": "MedlinePlus Genetics: What are proteins and what do they do?",
    "u": "https://medlineplus.gov/genetics/understanding/howgeneswork/protein/"
   }
  ],
  "match": [
   "receptor"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "recessive",
  "term": "recessive",
  "aka": [
   "autosomal recessive"
  ],
  "short": "Describes an allele whose effect on a phenotype shows only in people with two copies. People with one copy are carriers. Cystic fibrosis and sickle cell disease are recessive.",
  "l1": "slide 83",
  "see": [
   "dominant",
   "carrier",
   "codominant",
   "compound-heterozygote"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Recessive",
    "u": "https://www.genome.gov/genetics-glossary/Recessive"
   },
   {
    "t": "NHGRI Talking Glossary: Autosomal Recessive Disorder",
    "u": "https://www.genome.gov/genetics-glossary/Autosomal-Recessive-Disorder"
   }
  ],
  "match": [
   "recessive",
   "autosomal recessive"
  ],
  "noPlural": true,
  "owner": "inheritance"
 },
 {
  "id": "recombination",
  "term": "recombination (crossing over)",
  "aka": [
   "crossing over",
   "meiotic recombination"
  ],
  "short": "The exchange of matching segments between the two copies of a chromosome during meiosis. It creates chromosome copies with new combinations of alleles (recombinants) and lets alleles at distant positions be inherited separately.",
  "long": "Over many generations, recombination breaks chromosomes into ever shorter segments inherited from different ancestors, which is why correlation between alleles (linkage disequilibrium) fades with distance.",
  "l1": "slides 85, 111–112",
  "see": [
   "crossover",
   "recombination-fraction",
   "genetic-map",
   "recombination-hotspot",
   "meiosis"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Crossing Over",
    "u": "https://www.genome.gov/genetics-glossary/Crossing-Over"
   }
  ],
  "match": [
   "recombination",
   "crossing over",
   "crossing-over",
   "recombinant",
   "meiotic recombination"
  ],
  "owner": "inheritance"
 },
 {
  "id": "recombination-fraction",
  "term": "recombination fraction (θ)",
  "aka": [
   "recombination frequency",
   "theta"
  ],
  "short": "The probability that a gamete carries a new combination of a parent’s alleles at two loci (a recombinant). It is near 0 for close loci and 0.5 for unlinked loci.",
  "long": "A recombinant results from an odd number of crossovers between the two loci. If crossovers occur as a Poisson process (Haldane's model), the number between loci \\(d\\) morgans apart is \\(\\Poisson(d)\\), and the probability that it is odd is \\(\\theta = \\tfrac{1}{2}(1 - e^{-2d})\\). For small distances \\(\\theta \\approx d\\); as \\(d\\) grows, \\(\\theta\\) approaches \\(\\tfrac{1}{2}\\), the value for unlinked loci.",
  "l1": "slides 115, 122",
  "see": [
   "genetic-linkage",
   "centimorgan",
   "recombination",
   "linkage-analysis"
  ],
  "match": [
   "recombination fraction",
   "recombination frequency"
  ],
  "owner": "inheritance"
 },
 {
  "id": "recombination-hotspot",
  "term": "recombination hotspot",
  "short": "A short stretch of DNA, typically 1–2 kb, where crossovers occur far more often than nearby. In HapMap data about 60% of recombination fell in hotspots covering about 6% of the sequence.",
  "long": "PRDM9, a DNA-binding protein, is a major determinant of where hotspots lie in humans and mice (Baudat et al. 2010); people with different <em>PRDM9</em> alleles use partly different hotspots.",
  "see": [
   "genetic-map",
   "recombination",
   "centimorgan"
  ],
  "match": [
   "recombination hotspot",
   "recombination hot spot",
   "crossover hotspot"
  ],
  "owner": "inheritance"
 },
 {
  "id": "record-linkage",
  "term": "record linkage",
  "aka": [
   "data linkage"
  ],
  "short": "Joining records about the same person from different sources, such as study data with hospital, cancer and death records. UK Biobank follows participants’ health this way, using identifying details it never gives to researchers.",
  "see": [
   "electronic-health-record",
   "hes",
   "cancer-registry",
   "death-registry"
  ],
  "match": [
   "record linkage",
   "data linkage",
   "linked health records",
   "linked health data"
  ],
  "cs": false,
  "auto": true,
  "owner": "uk-biobank"
 },
 {
  "id": "red-blood-cell",
  "term": "red blood cell (erythrocyte)",
  "aka": [
   "erythrocyte",
   "red cell"
  ],
  "short": "The most common cell in blood; it carries oxygen bound to hemoglobin. Mature human red blood cells have expelled their nucleus, so they carry no nuclear DNA and cannot be used for genotyping.",
  "long": "Red blood cells make up about 45% of the volume of blood (roughly 36–50%, varying between people). They form the bottom layer of a centrifuged blood tube.",
  "l1": "slide 71",
  "see": [
   "white-blood-cell",
   "nucleus",
   "hemoglobin",
   "whole-blood"
  ],
  "links": [
   {
    "t": "OpenStax Anatomy & Physiology 2e, 18.1: An overview of blood",
    "u": "https://openstax.org/books/anatomy-and-physiology-2e/pages/18-1-an-overview-of-blood"
   }
  ],
  "match": [
   "red blood cell",
   "erythrocyte"
  ],
  "owner": "samples-to-genotypes"
 },
 {
  "id": "reference-allele",
  "term": "reference allele (REF)",
  "aka": [
   "REF"
  ],
  "short": "The allele found in the reference genome at a position, read on its forward (+) strand. It is not necessarily the common, ancestral or healthy allele: the reference sequence came from a few individuals.",
  "l1": "slides 67–68",
  "see": [
   "alternative-allele",
   "reference-genome",
   "forward-strand"
  ],
  "links": [
   {
    "t": "VCF version 4.3 specification",
    "u": "https://samtools.github.io/hts-specs/VCFv4.3.pdf"
   }
  ],
  "match": [
   "reference allele",
   "REF allele"
  ],
  "owner": "variation"
 },
 {
  "id": "reference-genome",
  "term": "reference genome",
  "aka": [
   "reference assembly",
   "human reference sequence"
  ],
  "short": "An agreed sequence for each chromosome, used as a common coordinate system; variants are described relative to it. The human reference is assembled from several donors’ DNA and is not a “healthy” or typical genome.",
  "long": "The human reference is haploid (one sequence per chromosome). At about two million positions it carries the less common allele. A “reference allele” is simply the base found in the reference.",
  "l1": "slide 68",
  "see": [
   "genome-build",
   "grch38",
   "reference-allele"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Human genome reference sequence",
    "u": "https://www.genome.gov/genetics-glossary/Human-Genome-Reference-Sequence"
   },
   {
    "t": "Genome Reference Consortium: human",
    "u": "https://www.ncbi.nlm.nih.gov/grc/human"
   }
  ],
  "match": [
   "reference genome",
   "reference assembly"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "dna"
 },
 {
  "id": "reference-panel",
  "term": "reference panel (haplotype reference panel)",
  "aka": [
   "haplotype reference panel",
   "imputation reference panel"
  ],
  "short": "A collection of haplotypes from sequenced people, used for phasing and genotype imputation, such as 1000 Genomes, HRC or TOPMed. Imputation works well only for its variants and for people genetically similar to its samples.",
  "long": "“Reference panel” is also used more loosely for any set of reference samples, such as the 1000 Genomes populations used to place study participants in a PCA (a reference population) or the HapMap panels on Lecture 1 slide 92; an LD reference panel is used to estimate LD for summary-statistic methods.",
  "see": [
   "genotype-imputation",
   "hrc",
   "topmed",
   "reference-population",
   "ld-reference-panel"
  ],
  "links": [
   {
    "t": "TOPMed Imputation Server: reference panels",
    "u": "https://topmedimpute.readthedocs.io/en/latest/reference-panels/"
   },
   {
    "t": "McCarthy et al. 2016: A reference panel of 64,976 haplotypes for genotype imputation",
    "u": "https://doi.org/10.1038/ng.3643"
   }
  ],
  "match": [
   "haplotype reference panel",
   "imputation reference panel"
  ],
  "owner": "samples-to-genotypes"
 },
 {
  "id": "reference-population",
  "term": "reference population (reference samples)",
  "short": "Public genotypes or genomes from people sampled at documented places, such as the 26 populations of 1000 Genomes. A study participant's genetic similarity is described relative to them.",
  "long": "Labels of reference samples describe how they were collected (a place and a self-identified group), not genetic boundaries. Not to be confused with a haplotype reference panel used for imputation, although the same data often serve both purposes.",
  "l1": "slides 92, 99, 101",
  "see": [
   "thousand-genomes",
   "hapmap",
   "hgdp",
   "genetic-similarity"
  ],
  "links": [
   {
    "t": "IGSR: 1000 Genomes population list",
    "u": "https://www.internationalgenome.org/data-portal/population"
   }
  ],
  "match": [
   "reference population",
   "reference sample"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "ancestry"
 },
 {
  "id": "regenie",
  "term": "REGENIE",
  "short": "Software for GWAS in large biobanks. Step 1 fits a whole-genome ridge regression predicting each person’s trait from their genotypes; step 2 tests each variant after removing that prediction, accounting for relatedness and population structure.",
  "long": "Developed by Mbatchou et al. (2021). Step 2 uses leave-one-chromosome-out predictions. It handles quantitative and binary traits (with Firth or saddle-point corrections for unbalanced case–control data), reads PLINK <code>.bed</code>, PLINK 2 <code>.pgen</code> and BGEN files, and writes one <code>.regenie</code> results file per trait. The Session 2 practical uses it.",
  "see": [
   "loco",
   "mixed-model",
   "plink",
   "bgen",
   "firth-correction"
  ],
  "links": [
   {
    "t": "REGENIE documentation",
    "u": "https://rgcgithub.github.io/regenie/"
   },
   {
    "t": "Mbatchou et al. 2021, Nature Genetics",
    "u": "https://doi.org/10.1038/s41588-021-00870-7"
   }
  ],
  "match": [
   "REGENIE",
   "Regenie"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "the-data"
 },
 {
  "id": "regional-association-plot",
  "term": "regional association plot (LocusZoom plot)",
  "aka": [
   "regional plot",
   "LocusZoom plot"
  ],
  "short": "A plot of −log<sub>10</sub> of the p-value against position for the variants in one region, each point colored by its \\(r^2\\) with the lead variant, plus recombination rate and genes. Made with tools such as LocusZoom.",
  "see": [
   "lead-variant",
   "r-squared",
   "manhattan-plot"
  ],
  "links": [
   {
    "t": "Pruim et al. 2010, LocusZoom (Bioinformatics)",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC2935401/"
   }
  ],
  "match": [
   "regional association plot",
   "regional plot",
   "LocusZoom plot"
  ],
  "cs": false,
  "auto": true,
  "owner": "haplotypes-ld"
 },
 {
  "id": "regression-dilution",
  "term": "regression dilution",
  "short": "The bias of an estimated association toward zero when an exposure is measured with random error or varies within a person. Repeat measurements in a subset of participants can estimate and correct it.",
  "see": [
   "measurement-error",
   "instance"
  ],
  "match": [
   "regression dilution",
   "regression dilution bias"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "uk-biobank"
 },
 {
  "id": "regulatory-element",
  "term": "regulatory element",
  "aka": [
   "cis-regulatory element"
  ],
  "short": "A DNA sequence that controls a gene’s expression, such as a promoter, an enhancer or a silencer, by binding transcription factors. ENCODE’s 2020 registry lists 926,535 candidate regulatory elements covering 7.9% of the genome.",
  "l1": "slide 63",
  "see": [
   "promoter",
   "enhancer",
   "silencer",
   "regulatory-variant",
   "encode"
  ],
  "links": [
   {
    "t": "ENCODE SCREEN: candidate regulatory elements",
    "u": "https://screen.encodeproject.org/"
   }
  ],
  "match": [
   "regulatory element",
   "regulatory region",
   "regulatory DNA",
   "regulatory sequence"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "regulatory-variant",
  "term": "regulatory variant",
  "aka": [],
  "short": "A variant that changes how much, when or where a gene is expressed, rather than the protein's sequence, for example by altering a promoter, an enhancer or a transcription-factor binding site.",
  "l1": "slide 63",
  "see": [
   "enhancer",
   "promoter",
   "noncoding-variant",
   "eqtl"
  ],
  "match": [
   "regulatory variant"
  ],
  "owner": "variation"
 },
 {
  "id": "reverse-causation",
  "term": "reverse causation",
  "short": "When the outcome causes the supposed exposure instead of the reverse, for example illness leading people to change their diet or stop drinking. Germline genotypes are fixed at conception, so diseases cannot change them.",
  "see": [
   "mendelian-randomization",
   "confounding"
  ],
  "match": [
   "reverse causation"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "reverse-complement",
  "term": "reverse complement",
  "short": "A DNA sequence with every base replaced by its pairing partner (A↔T, C↔G) and the order reversed. It is the partner strand written in the standard 5′→3′ direction: the reverse complement of ACCTGAG is CTCAGGT.",
  "long": "Formally, for a sequence \\(s = s_1 s_2 \\ldots s_n\\), \\(\\operatorname{rc}(s)_i = \\operatorname{comp}(s_{n+1-i})\\), where \\(\\operatorname{comp}\\) swaps A with T and C with G: position \\(i\\) of the result is the complement of the base at position \\(i\\) counted from the 3′ end of \\(s\\). Applying it twice returns the original, \\(\\operatorname{rc}(\\operatorname{rc}(s)) = s\\). Reversing alone, or complementing alone, does not give the partner strand.",
  "l1": "slides 57, 68–69",
  "see": [
   "complementary",
   "antiparallel",
   "strand"
  ],
  "match": [
   "reverse complement",
   "reverse-complement"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "dna"
 },
 {
  "id": "reverse-genetics",
  "term": "reverse genetics",
  "short": "Research that starts from a gene and studies what happens when it is altered, for example in people who carry loss-of-function variants (genotype → phenotype).",
  "l1": "slide 16",
  "see": [
   "forward-genetics",
   "loss-of-function"
  ],
  "match": [
   "reverse genetics"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "reverse-strand",
  "term": "reverse strand (− strand)",
  "aka": [
   "minus strand",
   "− strand"
  ],
  "short": "The strand of the reference genome complementary to the + strand. Read 5′→3′, it runs toward lower positions. Genes on the − strand have sequences that are reverse complements of the + strand.",
  "l1": "slide 68",
  "see": [
   "forward-strand",
   "strand",
   "reverse-complement"
  ],
  "match": [
   "reverse strand",
   "minus strand",
   "− strand",
   "(−) strand",
   "(-) strand",
   "negative strand"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "dna"
 },
 {
  "id": "ribosome",
  "term": "ribosome",
  "short": "A large complex of RNA and protein in the cytoplasm that carries out translation: it reads an mRNA codon by codon and links the amino acids brought by transfer RNAs into a protein chain.",
  "l1": "slides 61–62",
  "see": [
   "translation",
   "trna",
   "mrna"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Ribosome",
    "u": "https://www.genome.gov/genetics-glossary/Ribosome"
   }
  ],
  "match": [
   "ribosome"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "risk-allele",
  "term": "risk allele",
  "aka": [
   "protective allele"
  ],
  "short": "For a disease, the allele associated with higher risk; the other allele is then called protective. It depends on the outcome studied and need not be the minor, alternative or effect allele.",
  "see": [
   "effect-allele",
   "odds-ratio"
  ],
  "match": [
   "risk allele",
   "protective allele"
  ],
  "owner": "variation"
 },
 {
  "id": "rna",
  "term": "RNA",
  "aka": [
   "ribonucleic acid"
  ],
  "short": "Ribonucleic acid: a single chain of nucleotides copied from DNA, with ribose as its sugar and uracil (U) in place of thymine (T). Messenger RNA is translated into protein; other RNAs work without being translated.",
  "l1": "slides 61–62",
  "see": [
   "mrna",
   "transcription",
   "non-coding-rna"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Ribonucleic acid (RNA)",
    "u": "https://www.genome.gov/genetics-glossary/RNA-Ribonucleic-Acid"
   }
  ],
  "match": [
   "RNA",
   "ribonucleic acid"
  ],
  "cs": true,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "rna-polymerase",
  "term": "RNA polymerase",
  "short": "The enzyme that carries out transcription. It binds at a gene’s promoter, separates the DNA strands and builds an RNA complementary to the template strand, adding nucleotides to the RNA’s 3′ end.",
  "l1": "slide 62",
  "see": [
   "transcription",
   "promoter"
  ],
  "links": [
   {
    "t": "MedlinePlus Genetics: How do genes direct the production of proteins?",
    "u": "https://medlineplus.gov/genetics/understanding/howgeneswork/makingprotein/"
   }
  ],
  "match": [
   "RNA polymerase"
  ],
  "cs": true,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "rna-seq",
  "term": "RNA sequencing (RNA-seq)",
  "aka": [
   "RNA-seq"
  ],
  "short": "Measuring the RNA in a sample by copying it into DNA, sequencing millions of short pieces (reads), matching them to the genome and counting reads per gene. It gives an expression level for every gene.",
  "see": [
   "transcriptome",
   "tpm",
   "gene-expression"
  ],
  "links": [
   {
    "t": "NHGRI: Transcriptome fact sheet",
    "u": "https://www.genome.gov/about-genomics/fact-sheets/Transcriptome-Fact-Sheet"
   }
  ],
  "match": [
   "RNA-seq",
   "RNA sequencing"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "genes-expression"
 },
 {
  "id": "rsid",
  "term": "rsID",
  "aka": [
   "reference SNP ID",
   "refSNP number"
  ],
  "short": "An identifier such as rs671 that dbSNP assigns to a known variant position. It stays the same across genome builds but does not name an allele, and one rsID can cover several alternative alleles.",
  "l1": "slides 68–69",
  "see": [
   "dbsnp",
   "genomic-coordinate"
  ],
  "links": [
   {
    "t": "dbSNP (NCBI)",
    "u": "https://www.ncbi.nlm.nih.gov/snp/"
   }
  ],
  "match": [
   "rsID",
   "refSNP"
  ],
  "owner": "variation"
 },
 {
  "id": "r-squared",
  "term": "r² (LD measure)",
  "aka": [
   "r",
   "Δ²",
   "r2",
   "squared correlation"
  ],
  "short": "The squared correlation between the alleles at two SNPs across chromosome copies: \\(r^2 = D^2/(p_{\\mathrm{A}} p_{\\mathrm{a}} p_{\\mathrm{G}} p_{\\mathrm{g}})\\), with \\(D\\) the LD coefficient, \\(p_{\\mathrm{A}}\\) and \\(p_{\\mathrm{a}}\\) the allele frequencies at the first SNP and \\(p_{\\mathrm{G}}\\) and \\(p_{\\mathrm{g}}\\) those at the second. Testing a marker instead of the causal variant needs about \\(1/r^2\\) times as many people for equal power.",
  "long": "\\(r\\) is the Pearson correlation between two 0/1 columns of the haplotype matrix, one per SNP: their covariance is \\(D\\) and their variances are \\(p_{\\mathrm{A}} p_{\\mathrm{a}}\\) and \\(p_{\\mathrm{G}} p_{\\mathrm{g}}\\), which gives the formula above. \\(r^2\\) can reach 1 only when the two SNPs have equal minor allele frequencies. Under random mating, the correlation between two SNPs’ genotype dosages across people equals the haplotype \\(r\\) in the population, so \\(r^2\\) can be estimated from unphased genotypes; this genotype correlation is what PLINK <code>--r2</code> computes. For minor allele frequencies \\(m_1 \\le m_2\\), \\(r^2\\) cannot exceed \\(m_1(1 - m_2)/[(1 - m_1) m_2]\\), which equals 1 only when \\(m_1 = m_2\\).",
  "l1": "slides 85–86, 95–96, 120–124",
  "see": [
   "d-prime",
   "ld-d",
   "ld",
   "tag-snp"
  ],
  "match": [
   "r²"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "haplotypes-ld"
 },
 {
  "id": "saddle-point-approximation",
  "term": "saddle-point approximation (SPA)",
  "aka": [
   "saddlepoint approximation"
  ],
  "short": "A p-value calculation that stays accurate far into the tails when cases are few or a variant is rare, where the normal approximation is not. REGENIE offers it as an alternative to the Firth correction.",
  "long": "It approximates the distribution of the test statistic under no association from its cumulant-generating function, instead of assuming a normal distribution (Dey et al. 2017). Like the Firth correction, REGENIE applies it only to variants whose first p-value is small.",
  "see": [
   "firth-correction",
   "regenie",
   "binary-trait"
  ],
  "match": [
   "saddle-point approximation",
   "saddlepoint approximation",
   "saddle-point correction",
   "saddle-point"
  ],
  "owner": "the-data"
 },
 {
  "id": "sample",
  "term": "sample",
  "short": "In statistics, the people actually studied, drawn from a larger population. In the laboratory, material taken from a person, such as a tube of blood, or the DNA and genotype data derived from it.",
  "long": "Both senses appear on these pages. A statistical sample represents its population only if its members were selected in a way unrelated to what is studied; UK Biobank’s volunteers, 5.5% of the people invited, are healthier on average than the UK population. Sample QC removes problem laboratory samples, such as contaminated or duplicated DNA.",
  "see": [
   "population",
   "target-population",
   "healthy-volunteer-bias",
   "sample-qc"
  ],
  "auto": false,
  "owner": "allele-frequencies"
 },
 {
  "id": "sample-contamination",
  "term": "sample contamination",
  "aka": [
   "contamination"
  ],
  "short": "DNA from two or more people mixed in one sample. Wherever they differ, the mixture looks heterozygous, so a contaminated sample has unusually high heterozygosity and often a lower call rate; sample QC removes it.",
  "long": "Heterozygosity also varies with genetic ancestry, so outliers are judged among genetically similar people or after adjusting for ancestry, as UK Biobank did.",
  "see": [
   "heterozygosity",
   "sample-qc",
   "call-rate",
   "inbreeding-coefficient"
  ],
  "links": [
   {
    "t": "Anderson et al. 2010: Data quality control in genetic case-control association studies",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3025522/"
   },
   {
    "t": "PLINK 1.9: basic statistics (--missing, --check-sex, --het, --mendel)",
    "u": "https://www.cog-genomics.org/plink/1.9/basic_stats"
   }
  ],
  "match": [
   "sample contamination",
   "contamination",
   "contaminated sample"
  ],
  "noPlural": true,
  "owner": "samples-to-genotypes"
 },
 {
  "id": "sample-qc",
  "term": "sample QC (per-individual QC)",
  "aka": [
   "per-individual QC",
   "per-sample QC"
  ],
  "short": "Quality-control checks on each person, one row of the genotype matrix: call rate, heterozygosity, genetic versus recorded sex, duplicates and relatives, and genetic ancestry. Failing samples are removed or analyzed separately.",
  "long": "Typical thresholds: more than 2–5% missing genotypes; heterozygosity more than 3 standard deviations from the mean; PI_HAT above 0.1875–0.2 for related pairs. Anderson et al. run sample QC before variant QC so that a few bad samples do not cause good SNPs to be removed.",
  "see": [
   "qc",
   "variant-qc",
   "sex-check",
   "duplicate-sample",
   "sample-contamination"
  ],
  "links": [
   {
    "t": "Anderson et al. 2010: Data quality control in genetic case-control association studies",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3025522/"
   },
   {
    "t": "Marees et al. 2018: A tutorial on conducting GWAS: quality control and statistical analysis",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC6001694/"
   }
  ],
  "match": [
   "sample QC",
   "per-individual QC",
   "per-sample QC"
  ],
  "noPlural": true,
  "owner": "samples-to-genotypes"
 },
 {
  "id": "sampling-frame",
  "term": "sampling frame",
  "short": "The list or register from which a study's participants are drawn. UK Biobank's frame was NHS registration records of people aged 40–69 living within about 25 miles (40 km) of an assessment centre.",
  "see": [
   "target-population",
   "selection-bias",
   "nhs"
  ],
  "match": [
   "sampling frame"
  ],
  "cs": false,
  "auto": true,
  "owner": "uk-biobank"
 },
 {
  "id": "selection-bias",
  "term": "selection bias",
  "short": "Bias that arises when the people in an analysis are selected in a way related to both the exposure and the outcome, so the association among them differs from that in the target population.",
  "see": [
   "collider-bias",
   "healthy-volunteer-bias",
   "confounding"
  ],
  "links": [
   {
    "t": "Catalog of Bias: Volunteer bias",
    "u": "https://catalogofbias.org/biases/volunteer-bias/"
   }
  ],
  "match": [
   "selection bias"
  ],
  "cs": false,
  "auto": true,
  "owner": "uk-biobank"
 },
 {
  "id": "self-report",
  "term": "self-report",
  "aka": [
   "self-reported data"
  ],
  "short": "Information participants give about themselves in a questionnaire or interview, such as smoking, diet, past illnesses and medicines. It depends on memory, on what doctors told them and on willingness to answer.",
  "long": "In UK Biobank, self-report comes from the touchscreen questionnaire and the interview at each assessment visit, and from later online questionnaires. Special codes such as −1 (“Do not know”) and −3 (“Prefer not to answer”) must be recoded before analysis.",
  "l1": "slides 31–35 (margarine vs butter use)",
  "see": [
   "data-coding",
   "skip-logic",
   "misclassification",
   "touchscreen-questionnaire"
  ],
  "match": [
   "self-report",
   "self-reported",
   "self report"
  ],
  "cs": false,
  "auto": true,
  "owner": "phenotypes"
 },
 {
  "id": "serial-founder-effect",
  "term": "serial founder effect",
  "short": "Repeated founder effects along a migration route: each new population is founded by a small group from the previous one, carrying only part of its variation, so genetic diversity falls with distance from the origin.",
  "long": "In humans, heterozygosity falls steadily with distance from East Africa along likely migration routes (Ramachandran et al. 2005), consistent with the out-of-Africa dispersal.",
  "l1": "slide 93 (“consistent with out of Africa”)",
  "see": [
   "founder-effect",
   "out-of-africa",
   "heterozygosity"
  ],
  "match": [
   "serial founder effect"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "ancestry"
 },
 {
  "id": "serum",
  "term": "serum",
  "short": "The liquid that remains after blood has been allowed to clot: plasma without its clotting factors.",
  "long": "Like plasma, serum contains no cells and is used for blood measurements rather than for genotyping.",
  "see": [
   "plasma",
   "whole-blood"
  ],
  "links": [
   {
    "t": "OpenStax Anatomy & Physiology 2e, 18.1: An overview of blood",
    "u": "https://openstax.org/books/anatomy-and-physiology-2e/pages/18-1-an-overview-of-blood"
   }
  ],
  "match": [
   "serum"
  ],
  "noPlural": true,
  "owner": "samples-to-genotypes"
 },
 {
  "id": "sex-check",
  "term": "sex check",
  "aka": [
   "sex concordance check"
  ],
  "short": "A sample QC step that compares sex inferred from X-chromosome genotypes with recorded sex. Outside the pseudoautosomal regions males show almost no heterozygous X SNPs; a mismatch suggests a sample swap or labeling error.",
  "long": "PLINK's <code>--check-sex</code> computes an inbreeding coefficient F on the X chromosome and by default calls F &gt; 0.8 male and F &lt; 0.2 female. A mismatch can also reflect a sex-chromosome aneuploidy such as XXY, or a recorded sex that differs from genetic sex; UK Biobank found 378 participants whose genetic sex differed from their self-reported sex.",
  "see": [
   "genetic-sex",
   "x-chromosome",
   "pseudoautosomal-region",
   "aneuploidy",
   "sample-qc"
  ],
  "links": [
   {
    "t": "PLINK 1.9: basic statistics (--missing, --check-sex, --het, --mendel)",
    "u": "https://www.cog-genomics.org/plink/1.9/basic_stats"
   },
   {
    "t": "Anderson et al. 2010: Data quality control in genetic case-control association studies",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3025522/"
   }
  ],
  "match": [
   "sex check",
   "sex-check",
   "sex concordance"
  ],
  "owner": "samples-to-genotypes"
 },
 {
  "id": "sex-chromosomes",
  "term": "sex chromosomes",
  "short": "The X and Y chromosomes. Females typically have two X chromosomes and males one X and one Y. Apart from small shared regions at their tips (the pseudoautosomal regions), X and Y carry different genes.",
  "l1": "slide 59",
  "see": [
   "x-chromosome",
   "y-chromosome",
   "pseudoautosomal-region"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Sex Chromosome",
    "u": "https://www.genome.gov/genetics-glossary/Sex-Chromosome"
   }
  ],
  "match": [
   "sex chromosome"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "cells-chromosomes"
 },
 {
  "id": "short-tandem-repeat",
  "term": "short tandem repeat (STR)",
  "aka": [
   "microsatellite",
   "STR"
  ],
  "short": "A stretch of DNA in which a 1–6-base motif repeats back to back, such as CAGCAGCAG. Alleles differ in repeat number; long expansions of some cause disease, such as Huntington disease.",
  "long": "In the <em>HTT</em> gene the CAG repeat is normally present 10–35 times; people with Huntington disease have 36 to more than 120 copies (MedlinePlus Genetics).",
  "see": [
   "genetic-variant",
   "indel"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Microsatellite",
    "u": "https://www.genome.gov/genetics-glossary/Microsatellite"
   }
  ],
  "match": [
   "short tandem repeat",
   "microsatellite",
   "STR"
  ],
  "owner": "variation"
 },
 {
  "id": "short-read-sequencing",
  "term": "short-read sequencing",
  "aka": [
   "next-generation sequencing",
   "NGS",
   "second-generation sequencing"
  ],
  "short": "Sequencing millions of DNA fragments in parallel, each read for 50–300 bases, mostly on Illumina instruments. It is cheap and accurate (over 99.5% per base), but short reads often cannot be placed uniquely in repeats.",
  "long": "Steps on Illumina instruments (sequencing by synthesis): cut DNA into fragments of a few hundred bases, attach them to a flow cell, copy each into a cluster, then add labeled bases one cycle at a time and image them. UK Biobank’s exomes and genomes were sequenced on Illumina NovaSeq 6000 instruments.",
  "see": [
   "flow-cell",
   "paired-end-read",
   "read-alignment",
   "long-read-sequencing",
   "sequencing"
  ],
  "links": [
   {
    "t": "Goodwin et al. 2016: Coming of age: ten years of next-generation sequencing technologies",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC10373632/"
   },
   {
    "t": "Illumina: Overview of sequencing by synthesis (video, 5 min)",
    "u": "https://www.youtube.com/watch?v=fCd6B5HRaZ8"
   }
  ],
  "match": [
   "short-read sequencing",
   "next-generation sequencing",
   "second-generation sequencing",
   "NGS"
  ],
  "noPlural": true,
  "owner": "samples-to-genotypes"
 },
 {
  "id": "sickle-cell-disease",
  "term": "sickle cell disease",
  "aka": [
   "sickle cell anemia"
  ],
  "short": "An inherited blood disorder caused by two copies of the sickle hemoglobin variant (rs334, p.Glu7Val in <em>HBB</em>). Red blood cells deform into a sickle shape, block small blood vessels and break down early.",
  "l1": "slide 17",
  "see": [
   "sickle-cell-trait",
   "hemoglobin",
   "missense-variant",
   "fetal-hemoglobin"
  ],
  "links": [
   {
    "t": "MedlinePlus Genetics: Sickle cell disease",
    "u": "https://medlineplus.gov/genetics/condition/sickle-cell-disease/"
   }
  ],
  "match": [
   "sickle cell disease",
   "sickle-cell disease",
   "sickle cell anemia",
   "sickle cell"
  ],
  "noPlural": true,
  "owner": "variation"
 },
 {
  "id": "sickle-cell-trait",
  "term": "sickle cell trait",
  "aka": [
   "HbAS"
  ],
  "short": "Carrying one copy of the sickle hemoglobin variant (rs334) and one usual copy. It does not cause sickle cell disease and gives strong protection against severe malaria.",
  "see": [
   "sickle-cell-disease",
   "carrier",
   "balancing-selection"
  ],
  "match": [
   "sickle cell trait"
  ],
  "noPlural": true,
  "owner": "variation"
 },
 {
  "id": "silencer",
  "term": "silencer",
  "short": "A regulatory element that lowers a gene’s transcription when repressor proteins bind to it; the opposite of an enhancer. Like enhancers, silencers can lie far from their gene and work in only some cell types.",
  "see": [
   "enhancer",
   "regulatory-element",
   "transcription-factor",
   "promoter"
  ],
  "match": [
   "silencer"
  ],
  "owner": "genes-expression"
 },
 {
  "id": "snp",
  "term": "single nucleotide polymorphism (SNP)",
  "aka": [
   "SNP",
   "snip"
  ],
  "short": "A single-base position where people carry different bases, for example G or A, and the less common base has a frequency of at least 1%. Often used loosely for any single-base variant (SNV). Pronounced “snip”.",
  "l1": "slides 65–70, 78, 85, 88, 92–93, 95",
  "see": [
   "snv",
   "polymorphism",
   "allele",
   "genotyping-array"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Single Nucleotide Polymorphisms",
    "u": "https://www.genome.gov/genetics-glossary/Single-Nucleotide-Polymorphisms"
   }
  ],
  "match": [
   "SNP",
   "single nucleotide polymorphism",
   "Single nucleotide polymorphism",
   "single-nucleotide polymorphism",
   "Single-nucleotide polymorphism"
  ],
  "cs": true,
  "owner": "variation"
 },
 {
  "id": "snv",
  "term": "single nucleotide variant (SNV)",
  "aka": [
   "SNV"
  ],
  "short": "A variant in which one base is replaced by another, for example G → A, whatever its frequency. SNVs are the most numerous type of variant; a common SNV (frequency ≥1%) is a SNP.",
  "see": [
   "snp",
   "indel",
   "genetic-variant"
  ],
  "match": [
   "SNV",
   "single nucleotide variant",
   "Single nucleotide variant",
   "single-nucleotide variant",
   "Single-nucleotide variant"
  ],
  "cs": true,
  "owner": "variation"
 },
 {
  "id": "skip-logic",
  "term": "skip logic",
  "aka": [
   "routing"
  ],
  "short": "Questionnaire rules that show a question only after certain answers to earlier questions. A question that was skipped by design is empty because it was not asked, which is different from an unknown answer.",
  "see": [
   "self-report",
   "missing-data"
  ],
  "match": [
   "skip logic",
   "skip rule"
  ],
  "cs": false,
  "auto": true,
  "owner": "phenotypes"
 },
 {
  "id": "snp-heritability",
  "term": "SNP-heritability",
  "aka": [
   "h²_SNP",
   "SNP-based heritability"
  ],
  "short": "The share of trait variance explained by all genotyped (or imputed) common SNPs together, estimated in unrelated people with methods such as GCTA or LD score regression. Usually lower than twin-based heritability.",
  "l1": "slide 50 (“Heritability”, Session 5)",
  "see": [
   "heritability",
   "missing-heritability",
   "mixed-model"
  ],
  "match": [
   "SNP-heritability",
   "SNP heritability",
   "SNP-based heritability"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "somatic-cell",
  "term": "somatic cell",
  "short": "Any cell of the body other than eggs, sperm and the cells that make them. Changes to the DNA of somatic cells are not passed to children.",
  "see": [
   "germline",
   "somatic-mutation"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Somatic Cells",
    "u": "https://www.genome.gov/genetics-glossary/Somatic-Cells"
   }
  ],
  "match": [
   "somatic cell"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "cells-chromosomes"
 },
 {
  "id": "somatic-mutation",
  "term": "somatic mutation",
  "aka": [
   "somatic variant",
   "acquired variant"
  ],
  "short": "A change in DNA that arises in a body cell after fertilization. It is present only in that cell's descendants, can differ between tissues, and is not passed to children.",
  "see": [
   "somatic-cell",
   "germline",
   "mosaicism",
   "clone"
  ],
  "links": [
   {
    "t": "MedlinePlus Genetics: What is a gene variant and how do variants occur?",
    "u": "https://medlineplus.gov/genetics/understanding/mutationsanddisorders/genemutation/"
   }
  ],
  "match": [
   "somatic mutation",
   "somatic variant"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "cells-chromosomes"
 },
 {
  "id": "splice-variant",
  "term": "splice-site variant",
  "aka": [
   "splice variant"
  ],
  "short": "A change in the sequences at exon–intron boundaries (usually GT…AG at the intron ends) that mark where introns are removed. It can make the cell skip an exon or keep an intron.",
  "l1": "slide 63",
  "see": [
   "splicing",
   "exon",
   "intron",
   "loss-of-function"
  ],
  "match": [
   "splice-site variant",
   "splice site variant",
   "splice variant"
  ],
  "owner": "variation"
 },
 {
  "id": "spliceosome",
  "term": "spliceosome",
  "short": "A large complex of RNA and proteins in the nucleus that removes introns from pre-mRNA and joins the exons, recognizing short sequences at the intron ends (GU…AG).",
  "see": [
   "splicing",
   "intron"
  ],
  "links": [
   {
    "t": "DNA Learning Center: mRNA splicing (3D animation)",
    "u": "https://dnalc.cshl.edu/resources/3d/24-mrna-splicing.html"
   }
  ],
  "match": [
   "spliceosome"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "splicing",
  "term": "splicing",
  "short": "The removal of introns from pre-mRNA and the joining of exons, carried out by the spliceosome. Almost all introns start with GU and end with AG in the RNA (GT…AG in the DNA).",
  "l1": "slides 62–63",
  "see": [
   "alternative-splicing",
   "spliceosome",
   "intron",
   "splice-variant"
  ],
  "links": [
   {
    "t": "DNA Learning Center: mRNA splicing (3D animation)",
    "u": "https://dnalc.cshl.edu/resources/3d/24-mrna-splicing.html"
   }
  ],
  "match": [
   "splicing",
   "spliced"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "start-codon",
  "term": "start codon",
  "short": "The codon where translation begins, usually AUG (ATG in the DNA), which encodes methionine. It sets the reading frame for the rest of the coding sequence.",
  "l1": "slide 62",
  "see": [
   "codon",
   "reading-frame",
   "stop-codon"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Codon",
    "u": "https://www.genome.gov/genetics-glossary/Codon"
   }
  ],
  "match": [
   "start codon"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "start-lost-variant",
  "term": "start-lost variant",
  "aka": [
   "start-lost"
  ],
  "short": "A change to the ATG start codon of a gene, so translation cannot begin there. HGVS writes the protein change as p.(Met1?) because the outcome cannot be predicted from the DNA sequence alone.",
  "see": [
   "start-codon",
   "loss-of-function",
   "hgvs"
  ],
  "match": [
   "start-lost variant",
   "start-lost",
   "start lost"
  ],
  "owner": "variation"
 },
 {
  "id": "statin",
  "term": "statin",
  "short": "A drug that lowers LDL cholesterol by blocking HMG-CoA reductase, an enzyme the liver uses to make cholesterol. In UK Biobank, statin use is recorded in medication fields such as Data-Field 20003.",
  "l1": "slide 32",
  "see": [
   "ldl-cholesterol",
   "coronary-artery-disease"
  ],
  "links": [
   {
    "t": "MedlinePlus: Statins",
    "u": "https://medlineplus.gov/statins.html"
   }
  ],
  "match": [
   "statin"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "stop-codon",
  "term": "stop codon",
  "short": "One of the three codons UAA, UAG and UGA (TAA, TAG and TGA in the DNA) that end translation. A variant that creates an early stop codon is a nonsense variant.",
  "l1": "slides 62–63",
  "see": [
   "codon",
   "start-codon",
   "nonsense-variant"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Stop codon",
    "u": "https://www.genome.gov/genetics-glossary/Stop-Codon"
   }
  ],
  "match": [
   "stop codon"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "strand",
  "term": "strand",
  "short": "One of the two chains of nucleotides in a DNA molecule. Each strand has a direction, from its 5′ end to its 3′ end. The two strands are complementary and run in opposite directions.",
  "long": "In genetic data, alleles are always reported relative to one strand: usually the + strand of a stated reference genome build. A SNP that reads C/T on one strand reads G/A on the other.",
  "l1": "slides 57, 68–69",
  "see": [
   "forward-strand",
   "reverse-strand",
   "antiparallel",
   "five-prime-three-prime"
  ],
  "match": [
   "strand"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "dna"
 },
 {
  "id": "strand-flip",
  "term": "strand flip",
  "short": "Rewriting a SNP’s alleles as they read on the other strand (A↔T, C↔G), so C/T becomes G/A. It changes the letters, not the variant; it is needed when datasets report a SNP on different strands.",
  "long": "Not the same as an allele swap, which changes which allele is counted. PLINK 1.9's <code>--flip</code> applies strand flips to listed SNPs.",
  "l1": "slides 68–69",
  "see": [
   "allele-swap",
   "strand-ambiguous-snp",
   "harmonization"
  ],
  "match": [
   "strand flip",
   "strand flips",
   "strand-flip",
   "strand flipping"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "dna"
 },
 {
  "id": "strand-ambiguous-snp",
  "term": "strand-ambiguous (palindromic) SNP",
  "aka": [
   "palindromic SNP",
   "ambiguous SNP"
  ],
  "short": "A SNP with complementary alleles, A/T or C/G. It reads the same on both strands, so its alleles cannot show which strand a dataset used. Allele frequencies can often resolve it; otherwise it is dropped.",
  "long": "Frequencies help only when the minor allele frequency is clearly below 0.5 and similar in both datasets (TwoSampleMR’s default cutoff is 0.42). Strand annotation from the array manufacturer can also resolve it.",
  "l1": "slide 69",
  "see": [
   "strand-flip",
   "harmonization",
   "maf"
  ],
  "match": [
   "strand-ambiguous",
   "strand ambiguous",
   "palindromic SNP",
   "ambiguous SNP"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "dna"
 },
 {
  "id": "structural-variant",
  "term": "structural variant (SV)",
  "aka": [
   "structural variation"
  ],
  "short": "A rearrangement affecting more than about 50 bases: a large deletion, duplication or insertion (which change copy number), an inversion (a segment flipped end to end) or a translocation (a segment moved to another chromosome).",
  "long": "A typical genome carries about 2,100–2,500 structural variants, which together cover about 20 million bases (1000 Genomes Project, 2015). Many are hard to detect with short-read sequencing.",
  "l1": "slide 93",
  "see": [
   "copy-number-variant",
   "inversion",
   "translocation",
   "indel"
  ],
  "match": [
   "structural variant",
   "structural variation"
  ],
  "owner": "variation"
 },
 {
  "id": "structure-admixture",
  "term": "STRUCTURE / ADMIXTURE",
  "short": "Programs that model each person's genome as a mixture of K ancestral components, each with its own allele frequencies, and estimate each person's proportions. Results depend on K and on which samples are included.",
  "long": "STRUCTURE (Pritchard et al. 2000) samples the posterior by MCMC; ADMIXTURE (Alexander et al. 2009) maximizes the likelihood. Lawson et al. (2018) show that different histories can give identical bar plots.",
  "l1": "slides 98–101",
  "see": [
   "admixture",
   "grafanc",
   "pca"
  ],
  "links": [
   {
    "t": "Lawson et al. 2018: How not to over-interpret STRUCTURE/ADMIXTURE bar plots",
    "u": "https://www.nature.com/articles/s41467-018-05257-7"
   }
  ],
  "match": [
   "STRUCTURE",
   "ADMIXTURE"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "ancestry"
 },
 {
  "id": "backbone",
  "term": "sugar–phosphate backbone",
  "aka": [
   "phosphate backbone"
  ],
  "short": "The chain of alternating deoxyribose sugars and phosphate groups that forms each DNA strand. It is the same in every stretch of DNA; the bases attached to it carry the information.",
  "l1": "slide 57",
  "see": [
   "nucleotide",
   "strand"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Phosphate backbone",
    "u": "https://www.genome.gov/genetics-glossary/Phosphate-Backbone"
   }
  ],
  "match": [
   "sugar–phosphate backbone",
   "sugar-phosphate backbone",
   "phosphate backbone"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "dna"
 },
 {
  "id": "super-population",
  "term": "super-population",
  "short": "One of the five continental groupings of the 26 populations of 1000 Genomes: AFR (African), AMR (admixed American), EAS (East Asian), EUR (European) and SAS (South Asian). They are sampling categories, not natural divisions.",
  "long": "Each of the 26 populations is a sampling label: a place and often a self-identified group (for example GBR, British people sampled in England and Scotland). People in different super-populations overlap genetically, and variation within each one is large.",
  "see": [
   "thousand-genomes",
   "reference-population"
  ],
  "match": [
   "super-population"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "ancestry"
 },
 {
  "id": "synonymous-variant",
  "term": "synonymous variant",
  "aka": [
   "silent variant"
  ],
  "short": "A change in a codon that still encodes the same amino acid, for example CAT → CAC (both histidine), so the protein sequence is unchanged.",
  "l1": "slide 63",
  "see": [
   "missense-variant",
   "codon",
   "genetic-code"
  ],
  "match": [
   "synonymous variant",
   "synonymous",
   "silent variant"
  ],
  "owner": "variation"
 },
 {
  "id": "t2t-chm13",
  "term": "T2T-CHM13",
  "aka": [
   "hs1",
   "CHM13"
  ],
  "short": "The first complete, gapless human genome sequence, published in 2022 by the Telomere-to-Telomere Consortium. It adds nearly 200 million base pairs missing from earlier builds; version 2.0 includes a Y chromosome. UCSC calls it hs1.",
  "see": [
   "grch38",
   "genome-build"
  ],
  "links": [
   {
    "t": "Nurk et al. (2022), Science: The complete sequence of a human genome (free text)",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC9186530/"
   }
  ],
  "match": [
   "T2T-CHM13",
   "CHM13"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "dna"
 },
 {
  "id": "tag-snp",
  "term": "tag SNP",
  "aka": [
   "tagging SNP",
   "proxy SNP",
   "tagging"
  ],
  "short": "A genotyped SNP chosen because it is in high LD (often \\(r^2 \\ge 0.8\\)) with nearby SNPs that are not genotyped, so testing it also tests them indirectly. Genotyping arrays are designed around tag SNPs.",
  "l1": "slide 85",
  "see": [
   "ld",
   "r-squared",
   "genotyping-array",
   "genotype-imputation"
  ],
  "match": [
   "tag SNP",
   "tagging SNP",
   "proxy SNP"
  ],
  "cs": false,
  "auto": true,
  "owner": "haplotypes-ld"
 },
 {
  "id": "target-population",
  "term": "target population",
  "short": "In epidemiology, the group a study wants to draw conclusions about, for example all UK adults aged 40–69. Results transfer to it only if the sample is representative or its selection is accounted for.",
  "long": "Participants are a sample from it. Not to be confused with a population in the genetic sense (a group of people who mostly have children with one another), or with the source populations of an admixed group.",
  "see": [
   "sample",
   "sampling-frame",
   "selection-bias",
   "generalizability",
   "population"
  ],
  "match": [
   "target population"
  ],
  "cs": false,
  "auto": true,
  "owner": "uk-biobank"
 },
 {
  "id": "telomere",
  "term": "telomere",
  "short": "Either end of a chromosome: a long run of the repeated DNA sequence TTAGGG. Telomeres become slightly shorter each time a cell divides.",
  "l1": "slide 68",
  "see": [
   "centromere",
   "chromosome-arm"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Telomere",
    "u": "https://www.genome.gov/genetics-glossary/Telomere"
   }
  ],
  "match": [
   "telomere"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "cells-chromosomes"
 },
 {
  "id": "template-strand",
  "term": "template strand",
  "aka": [
   "antisense strand"
  ],
  "short": "The DNA strand of a gene that RNA polymerase reads during transcription. The RNA is complementary to it, so the RNA has the sequence of the other (coding) strand.",
  "l1": "slide 62",
  "see": [
   "coding-strand",
   "transcription"
  ],
  "match": [
   "template strand",
   "antisense strand"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "time-to-event",
  "term": "time-to-event outcome",
  "aka": [
   "survival outcome"
  ],
  "short": "An outcome recorded as a pair: the time from a starting point, such as the baseline visit, to the event or to the end of follow-up, and an indicator of whether the event was observed.",
  "long": "Time-to-event outcomes are analyzed with survival methods such as Cox regression, which use the follow-up time of censored people as well as the events.",
  "see": [
   "censoring",
   "cox-regression",
   "hazard-ratio",
   "incident-case"
  ],
  "match": [
   "time-to-event",
   "survival outcome"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "phenotypes"
 },
 {
  "id": "tissue",
  "term": "tissue",
  "short": "A group of cells that work together in the body, such as blood, liver or muscle. Gene activity is measured in a specific tissue, which matters for gene-expression studies.",
  "see": [
   "cell",
   "cell-type"
  ],
  "match": [
   "tissue"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "cells-chromosomes"
 },
 {
  "id": "top-bot",
  "term": "TOP/BOT strand (Illumina)",
  "aka": [
   "TOP strand",
   "BOT strand"
  ],
  "short": "Illumina’s strand convention for SNP alleles. A SNP with an A allele (A/C, A/G) is TOP and one with a T allele (T/C, T/G) is BOT; for A/T and C/G SNPs the neighboring bases decide.",
  "long": "It is defined from the SNP and its neighboring sequence, so it does not depend on the genome build, and it is not the same as the + strand of the reference genome.",
  "see": [
   "strand",
   "strand-ambiguous-snp"
  ],
  "links": [
   {
    "t": "Illumina technical note: “TOP/BOT” strand and “A/B” allele",
    "u": "https://www.illumina.com/documents/products/technotes/technote_topbot.pdf"
   }
  ],
  "match": [
   "TOP/BOT"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "dna"
 },
 {
  "id": "topmed",
  "term": "TOPMed (Trans-Omics for Precision Medicine)",
  "aka": [
   "Trans-Omics for Precision Medicine"
  ],
  "short": "A US National Heart, Lung, and Blood Institute program of deep whole-genome sequencing in people of diverse ancestries. Its imputation reference panel improves imputation of rare variants, especially in genomes labeled African ancestry.",
  "long": "The published panel has 97,256 genomes with 308 million variants; the TOPMed Imputation Server's release r3 has 133,597 samples. With it, imputation \\(r^2\\) for variants of frequency 0.1% rose from about 0.17 to 0.96 in genomes labeled African ancestry (Taliun et al. 2021). UK Biobank offers a TOPMed imputation on GRCh38 (Field 21007).",
  "see": [
   "reference-panel",
   "genotype-imputation",
   "hrc"
  ],
  "links": [
   {
    "t": "Taliun et al. 2021: Sequencing of 53,831 diverse genomes from the NHLBI TOPMed Program",
    "u": "https://doi.org/10.1038/s41586-021-03205-y"
   },
   {
    "t": "TOPMed Imputation Server: reference panels",
    "u": "https://topmedimpute.readthedocs.io/en/latest/reference-panels/"
   }
  ],
  "match": [
   "TOPMed"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "samples-to-genotypes"
 },
 {
  "id": "touchscreen-questionnaire",
  "term": "touchscreen questionnaire",
  "short": "The questionnaire that UK Biobank participants completed themselves on a touchscreen at the assessment centre, in about 30 minutes: sociodemographics, lifestyle and environment, early life, family history, psychosocial factors, health and medical history.",
  "see": [
   "assessment-centre",
   "self-report"
  ],
  "match": [
   "touchscreen questionnaire",
   "touch screen questionnaire",
   "touchscreen"
  ],
  "cs": false,
  "auto": true,
  "owner": "uk-biobank"
 },
 {
  "id": "townsend-index",
  "term": "Townsend deprivation index",
  "short": "A measure of how deprived a small area is, from four census measures: unemployment, households without a car, households not owner-occupied, and overcrowding. Each is converted to a z-score and summed; higher means more deprived.",
  "long": "UK Biobank assigns each participant the score of the census output area of their postcode at recruitment (Data-Field 22189, which replaced the retired Field 189).",
  "see": [
   "healthy-volunteer-bias",
   "confounding"
  ],
  "links": [
   {
    "t": "UK Biobank Data-Field 22189",
    "u": "https://biobank.ndph.ox.ac.uk/showcase/field.cgi?id=22189"
   }
  ],
  "match": [
   "Townsend deprivation index",
   "Townsend index",
   "Townsend score"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "uk-biobank"
 },
 {
  "id": "trait",
  "term": "trait",
  "short": "A characteristic that varies among people, such as height or whether a person has a disease. In genetics, “trait” and “phenotype” are used almost interchangeably.",
  "l1": "slides 28, 51",
  "see": [
   "phenotype",
   "complex-trait"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Trait",
    "u": "https://www.genome.gov/genetics-glossary/Trait"
   }
  ],
  "match": [
   "trait"
  ],
  "cs": false,
  "auto": false,
  "noPlural": false,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "transcript",
  "term": "transcript",
  "aka": [
   "isoform"
  ],
  "short": "One RNA product of a gene, defined by its exons. Through alternative splicing a gene can have several transcripts (isoforms); annotations such as GENCODE give each an identifier (ENST…).",
  "see": [
   "alternative-splicing",
   "mane-select",
   "gencode"
  ],
  "match": [
   "transcript",
   "isoform"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "transcription",
  "term": "transcription",
  "short": "The first step of gene expression: RNA polymerase copies a gene's DNA into RNA. It reads the template strand and makes RNA with the coding strand's sequence, with U in place of T.",
  "l1": "slides 61–62",
  "see": [
   "rna-polymerase",
   "template-strand",
   "coding-strand",
   "translation"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Transcription",
    "u": "https://www.genome.gov/genetics-glossary/Transcription"
   },
   {
    "t": "MedlinePlus Genetics: How do genes direct the production of proteins?",
    "u": "https://medlineplus.gov/genetics/understanding/howgeneswork/makingprotein/"
   }
  ],
  "match": [
   "transcription",
   "transcribed"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "transcription-factor",
  "term": "transcription factor",
  "aka": [
   "TF"
  ],
  "short": "A protein that binds a short, specific DNA sequence (a motif) in a promoter or enhancer and raises or lowers transcription of nearby genes. Humans have more than 1,600; examples are GATA1 and BCL11A.",
  "l1": "slide 62",
  "see": [
   "enhancer",
   "promoter",
   "gene-regulation"
  ],
  "links": [
   {
    "t": "MedlinePlus Genetics: Can genes be turned on and off in cells?",
    "u": "https://medlineplus.gov/genetics/understanding/howgeneswork/geneonoff/"
   }
  ],
  "match": [
   "transcription factor"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "tss",
  "term": "transcription start site (TSS)",
  "aka": [
   "TSS"
  ],
  "short": "The first base of a gene that is copied into RNA. The promoter lies just upstream of it; GTEx defines cis-eQTLs as variants within 1 Mb of it.",
  "see": [
   "promoter",
   "transcription"
  ],
  "match": [
   "transcription start site",
   "TSS"
  ],
  "cs": true,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "transcriptome",
  "term": "transcriptome",
  "short": "The complete set of RNA molecules in a cell or tissue sample at one time. Unlike the genome, it differs between cell types and changes with conditions; it is measured by RNA-seq.",
  "l1": "slide 25",
  "see": [
   "rna-seq",
   "gene-expression",
   "twas"
  ],
  "links": [
   {
    "t": "NHGRI: Transcriptome fact sheet",
    "u": "https://www.genome.gov/about-genomics/fact-sheets/Transcriptome-Fact-Sheet"
   }
  ],
  "match": [
   "transcriptome"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "twas",
  "term": "transcriptome-wide association study (TWAS)",
  "aka": [
   "TWAS"
  ],
  "short": "A gene-level test of whether genetically predicted expression of a gene is associated with a trait. Weights learned in a dataset with measured expression, such as GTEx, predict expression from genotypes in a GWAS sample.",
  "long": "Predicted expression is a weighted sum of genotypes, \\(\\hat{\\mathbf{e}} = \\mathbf{G}\\mathbf{w}\\), with \\(\\mathbf{G}\\) the genotype dosages and \\(\\mathbf{w}\\) the per-variant weights of an expression model. A TWAS association does not prove that the gene is causal: nearby genes can share eQTLs or have correlated eQTLs.",
  "l1": "slide 25",
  "see": [
   "transcriptome-imputation",
   "eqtl",
   "gtex",
   "gwas"
  ],
  "links": [
   {
    "t": "Wainberg et al. 2019, Opportunities and challenges for TWAS (Nat Genet, free text)",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC6777347/"
   }
  ],
  "match": [
   "TWAS",
   "transcriptome-wide association study",
   "transcriptome-wide association studies"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "genes-expression"
 },
 {
  "id": "tpm",
  "term": "transcripts per million (TPM)",
  "aka": [
   "TPM"
  ],
  "short": "A normalized expression unit: each gene’s read count divided by its length, rescaled so the values in a sample sum to one million. It estimates how many of every million transcripts came from that gene.",
  "see": [
   "rna-seq",
   "gene-expression"
  ],
  "match": [
   "TPM",
   "transcripts per million"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "genes-expression"
 },
 {
  "id": "trna",
  "term": "transfer RNA (tRNA)",
  "aka": [
   "tRNA"
  ],
  "short": "A short RNA that carries one kind of amino acid to the ribosome and pairs with a matching codon through its three-base anticodon.",
  "l1": "slide 62",
  "see": [
   "ribosome",
   "translation",
   "codon"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Transfer RNA (tRNA)",
    "u": "https://www.genome.gov/genetics-glossary/Transfer-RNA"
   }
  ],
  "match": [
   "tRNA",
   "transfer RNA"
  ],
  "cs": true,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "translation",
  "term": "translation",
  "short": "The step of gene expression in which a ribosome reads an mRNA codon by codon and joins the matching amino acids into a protein chain, from the start codon to a stop codon.",
  "l1": "slides 61–62",
  "see": [
   "ribosome",
   "codon",
   "genetic-code",
   "trna"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Translation",
    "u": "https://www.genome.gov/genetics-glossary/Translation"
   },
   {
    "t": "MedlinePlus Genetics: How do genes direct the production of proteins?",
    "u": "https://medlineplus.gov/genetics/understanding/howgeneswork/makingprotein/"
   }
  ],
  "match": [
   "translation"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "translocation",
  "term": "translocation",
  "aka": [],
  "short": "A structural variant in which a segment of one chromosome is moved to another chromosome.",
  "see": [
   "structural-variant",
   "inversion"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Translocation",
    "u": "https://www.genome.gov/genetics-glossary/Translocation"
   }
  ],
  "match": [
   "translocation"
  ],
  "owner": "variation"
 },
 {
  "id": "transposable-element",
  "term": "transposable element",
  "aka": [
   "transposon",
   "mobile element"
  ],
  "short": "A DNA sequence that can copy itself to new places in the genome. Copies of transposable elements, mostly LINEs and SINEs, make up about 48% of the sequenced human genome.",
  "l1": "slide 93",
  "see": [
   "genome",
   "structural-variant",
   "line-sine"
  ],
  "links": [
   {
    "t": "Hoyt et al. 2022, repeat elements of the complete human genome (Science, free text)",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC9301658/"
   }
  ],
  "match": [
   "transposable element",
   "transposon"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "triglycerides",
  "term": "triglyceride",
  "aka": [
   "triglycerides",
   "TG"
  ],
  "short": "The most common type of fat in the body. Triglycerides come from food and from extra calories, are stored in fat cells, and travel in the blood inside lipoproteins.",
  "see": [
   "lipoprotein",
   "ldl-cholesterol"
  ],
  "links": [
   {
    "t": "MedlinePlus: Triglycerides",
    "u": "https://medlineplus.gov/triglycerides.html"
   }
  ],
  "match": [
   "triglyceride"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "trio",
  "term": "trio (parents and child)",
  "aka": [
   "parent–offspring trio",
   "parent–child trio"
  ],
  "short": "Two parents and their child, genotyped together. A trio shows which allele the child received from each parent, which helps phasing, and exposes genotyping errors as Mendelian errors.",
  "see": [
   "mendelian-error",
   "phasing",
   "de-novo-mutation"
  ],
  "match": [
   "trio",
   "parent–offspring trio",
   "parent-offspring trio",
   "parent–child trio"
  ],
  "owner": "inheritance"
 },
 {
  "id": "trisomy",
  "term": "trisomy",
  "aka": [],
  "short": "Having three copies of a chromosome instead of two, a type of aneuploidy. Trisomy 21 causes most cases of Down syndrome.",
  "see": [
   "aneuploidy",
   "karyotype"
  ],
  "match": [
   "trisomy"
  ],
  "owner": "variation"
 },
 {
  "id": "twin-study",
  "term": "twin study",
  "short": "A study that compares how similar identical (monozygotic) and fraternal (dizygotic) twin pairs are for a trait to estimate heritability, for example with Falconer’s formula \\(h^2 \\approx 2(r_{\\mathrm{MZ}} - r_{\\mathrm{DZ}})\\), where \\(r_{\\mathrm{MZ}}\\) and \\(r_{\\mathrm{DZ}}\\) are the trait correlations within identical and within fraternal pairs. Identical twins share all their genetic variation and fraternal twins on average half of its additive part, so if genetic effects are additive and both kinds of pair share their environment equally, \\(r_{\\mathrm{MZ}} - r_{\\mathrm{DZ}} = h^2/2\\).",
  "long": "It assumes that both kinds of twin pairs share their environments to the same degree.",
  "see": [
   "heritability",
   "monozygotic-twins",
   "dizygotic-twins"
  ],
  "match": [
   "twin study"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "uk-biobank",
  "term": "UK Biobank (UKB)",
  "short": "A prospective cohort of 503,317 adults aged 40–69 recruited at 22 assessment centres in England, Scotland and Wales in 2006–2010, with baseline measurements, stored samples, genetic data and linked health records, available to approved researchers.",
  "long": "Recruitment targeted ages 40–69; actual ages at the first visit ranged from 37 to 73. About 9.2 million people were invited, and 5.5% took part.",
  "l1": "slides 31–35",
  "see": [
   "prospective-cohort-study",
   "biobank",
   "assessment-centre"
  ],
  "links": [
   {
    "t": "UK Biobank",
    "u": "https://www.ukbiobank.ac.uk/"
   },
   {
    "t": "Sudlow et al. (2015), PLoS Med",
    "u": "https://doi.org/10.1371/journal.pmed.1001779"
   }
  ],
  "match": [
   "UK Biobank",
   "UKB"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "uk-biobank"
 },
 {
  "id": "axiom-array",
  "term": "UK Biobank Axiom array",
  "short": "The custom Affymetrix (now Thermo Fisher) Axiom array used for most UK Biobank participants: 825,927 markers chosen for imputation, coding and disease-related variants. About 50,000 others were typed on the closely related UK BiLEVE array.",
  "long": "In the Axiom assay, a labeled probe is joined to the array probe only if it pairs with the base at the SNP, and its dye reports that base. Samples were processed 96 at a time on plates (94 participants plus two controls). The released data have 805,426 markers for 488,377 people, on GRCh37.",
  "see": [
   "genotyping-array",
   "probe",
   "genotype-calling",
   "uk-biobank"
  ],
  "links": [
   {
    "t": "Bycroft et al. 2018: The UK Biobank resource with deep phenotyping and genomic data",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC6786975/"
   },
   {
    "t": "Affymetrix Axiom array data sheet: assay chemistry (PDF)",
    "u": "https://documents.thermofisher.com/TFS-Assets/LSG/brochures/axiom_ceu_arrayplate_datasheet.pdf"
   }
  ],
  "match": [
   "UK Biobank Axiom array",
   "Axiom array"
  ],
  "owner": "samples-to-genotypes"
 },
 {
  "id": "data-showcase",
  "term": "UK Biobank Data Showcase",
  "aka": [
   "Showcase"
  ],
  "short": "UK Biobank's public online catalog of its data. Anyone can browse it without an account. For every data-field it lists the field ID, description, units, data-coding and participant counts, but it holds no individual-level data.",
  "long": "Use it to find field IDs and codings before you write any code: the column <code>p30780_i0</code> on the Research Analysis Platform is Field 30780 (LDL cholesterol) at instance 0, and the Showcase page for Field 30780 says how it was measured.",
  "see": [
   "data-field",
   "data-coding",
   "instance",
   "array-index",
   "eid"
  ],
  "links": [
   {
    "t": "UK Biobank Data Showcase",
    "u": "https://biobank.ndph.ox.ac.uk/showcase/"
   }
  ],
  "match": [
   "Data Showcase",
   "UK Biobank Showcase",
   "Showcase"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "the-data"
 },
 {
  "id": "imaging-study",
  "term": "UK Biobank imaging study",
  "short": "UK Biobank's imaging enhancement: since 2014, more than 100,000 participants have had brain, heart and abdominal MRI, a DXA scan, carotid ultrasound and an ECG at imaging centres (instance 2); repeat scans continue (instance 3).",
  "see": [
   "uk-biobank",
   "imaging-derived-phenotype"
  ],
  "links": [
   {
    "t": "Littlejohns et al. (2020), Nat Commun",
    "u": "https://doi.org/10.1038/s41467-020-15948-9"
   }
  ],
  "match": [
   "imaging study",
   "imaging visit",
   "imaging enhancement"
  ],
  "cs": false,
  "auto": true,
  "owner": "uk-biobank"
 },
 {
  "id": "rap",
  "term": "UK Biobank Research Analysis Platform (RAP)",
  "aka": [
   "UKB-RAP"
  ],
  "short": "UK Biobank's cloud computing platform, built by DNAnexus. Approved researchers analyze the data there: participant-level data stay on the platform, and only results, after checks, leave it.",
  "long": "It launched publicly in September 2021 and holds the participant table (as a database), the record tables and the genotype and sequence files, together with tools such as PLINK, REGENIE, bcftools, JupyterLab and RStudio. Access arrangements changed in 2026; check UK Biobank's pages for the current status.",
  "see": [
   "data-showcase",
   "eid",
   "uk-biobank",
   "material-transfer-agreement"
  ],
  "links": [
   {
    "t": "UK Biobank: Research Analysis Platform",
    "u": "https://www.ukbiobank.ac.uk/use-our-data/research-analysis-platform/"
   },
   {
    "t": "UKB-RAP documentation (DNAnexus)",
    "u": "https://dnanexus.gitbook.io/uk-biobank-rap"
   }
  ],
  "match": [
   "Research Analysis Platform",
   "UKB-RAP",
   "UK Biobank RAP",
   "RAP"
  ],
  "cs": true,
  "auto": true,
  "noPlural": true,
  "owner": "the-data"
 },
 {
  "id": "utr",
  "term": "untranslated region (UTR)",
  "aka": [
   "5′ UTR",
   "3′ UTR"
  ],
  "short": "An end of an mRNA that is not translated: the 5′ UTR before the start codon and the 3′ UTR after the stop codon. UTRs carry signals that affect translation and mRNA breakdown.",
  "l1": "slides 62–63",
  "see": [
   "exon",
   "cds",
   "mrna"
  ],
  "links": [
   {
    "t": "Learn.Genetics: Anatomy of a gene",
    "u": "https://learn.genetics.utah.edu/content/basics/geneanatomy/"
   }
  ],
  "match": [
   "UTR",
   "untranslated region",
   "5′ UTR",
   "3′ UTR"
  ],
  "cs": true,
  "auto": true,
  "noPlural": false,
  "owner": "genes-expression"
 },
 {
  "id": "variance-explained",
  "term": "variance explained",
  "aka": [
   "proportion of variance explained",
   "R²"
  ],
  "short": "The fraction of a trait’s variance accounted for by a variant or a model, written \\(R^2\\). For one variant with effect-allele frequency \\(p\\) and per-allele effect \\(\\beta\\) (trait in standard-deviation units), it is \\(2p(1 - p)\\beta^2\\): the variance of the genotype dosage, \\(2p(1 - p)\\) under Hardy–Weinberg equilibrium, times the squared effect of one copy.",
  "long": "A GWAS needs roughly \\(40/R^2\\) people for 80% power at a p-value threshold of 5 × 10⁻⁸. With \\(n\\) people the noncentrality of the test statistic is about \\(nR^2\\), and 80% power at that threshold needs it to reach \\((5.45 + 0.84)^2 \\approx 40\\), where 5.45 and 0.84 are the standard normal quantiles for the two-sided threshold and for 80% power.",
  "see": [
   "beta",
   "effect-size",
   "heritability"
  ],
  "match": [
   "variance explained"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "variant-allele-fraction",
  "term": "variant allele fraction (VAF)",
  "aka": [
   "VAF",
   "variant allele frequency (within a sample)"
  ],
  "short": "The fraction of a sample’s DNA copies, in practice of its sequencing reads, that carry a variant. Inherited variants give about 50% (heterozygous) or 100% (homozygous); a somatic variant in a clone usually gives less.",
  "long": "Clonal hematopoiesis is usually defined by a somatic variant with a VAF of at least 2% in blood. With genotyping arrays the corresponding quantity is the B allele frequency.",
  "see": [
   "somatic-mutation",
   "clonal-hematopoiesis",
   "clone"
  ],
  "match": [
   "variant allele fraction",
   "VAF"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "cells-chromosomes"
 },
 {
  "id": "variant-calling",
  "term": "variant calling",
  "short": "Deciding from aligned reads whether a person carries a variant at each position, and with which genotype. Callers weigh the reads showing each allele, base quality scores and error models, often jointly across many people.",
  "long": "UK Biobank called its genomes jointly across all participants with GraphTyper and, separately, person by person with DRAGEN. Output is usually a VCF file.",
  "see": [
   "read-depth",
   "sequencing-read",
   "genotype-calling",
   "vcf"
  ],
  "links": [
   {
    "t": "Van der Auwera et al. 2013: From FastQ data to high-confidence variant calls (GATK Best Practices)",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC4243306/"
   },
   {
    "t": "Goodwin et al. 2016: Coming of age: ten years of next-generation sequencing technologies",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC10373632/"
   }
  ],
  "match": [
   "variant calling",
   "variant caller"
  ],
  "owner": "samples-to-genotypes"
 },
 {
  "id": "variant-consequence",
  "term": "variant consequence (functional annotation)",
  "aka": [
   "functional annotation",
   "consequence annotation"
  ],
  "short": "A label for what a variant could do to each gene it overlaps, such as missense, synonymous, intronic or 5′ UTR, assigned by tools such as Ensembl VEP from its position and the genetic code.",
  "see": [
   "vep",
   "missense-variant",
   "coding-variant",
   "noncoding-variant"
  ],
  "links": [
   {
    "t": "Ensembl: calculated variant consequences",
    "u": "https://jun2026.archive.ensembl.org/info/genome/variation/prediction/predicted_data.html"
   }
  ],
  "match": [
   "variant consequence",
   "consequence annotation",
   "functional annotation"
  ],
  "owner": "variation"
 },
 {
  "id": "variant-qc",
  "term": "variant QC (per-marker QC)",
  "aka": [
   "SNP QC",
   "marker QC",
   "per-marker QC"
  ],
  "short": "Quality-control checks on each variant, one column of the genotype matrix: call rate, differential missingness, Hardy–Weinberg tests, minor allele frequency and batch effects. Failing variants are removed.",
  "long": "Typical thresholds: more than 2–5% missing; HWE P &lt; 10<sup>−6</sup> in controls (stricter in very large samples, because tiny departures become significant); MAF below 1–5%, depending on sample size.",
  "see": [
   "qc",
   "sample-qc",
   "differential-missingness",
   "hwe",
   "maf"
  ],
  "links": [
   {
    "t": "Anderson et al. 2010: Data quality control in genetic case-control association studies",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3025522/"
   },
   {
    "t": "Marees et al. 2018: A tutorial on conducting GWAS: quality control and statistical analysis",
    "u": "https://pmc.ncbi.nlm.nih.gov/articles/PMC6001694/"
   }
  ],
  "match": [
   "variant QC",
   "SNP QC",
   "marker QC",
   "per-marker QC"
  ],
  "noPlural": true,
  "owner": "samples-to-genotypes"
 },
 {
  "id": "vcf",
  "term": "VCF (Variant Call Format)",
  "short": "A tab-separated text format for variants: one line per variant with its position and alleles, one column per person with their genotype (such as 0/1) and optional fields such as dosage. Sequencing pipelines output it.",
  "long": "Files are usually compressed (<code>.vcf.gz</code>) and indexed. In the genotype field, 0 is the reference allele and 1 the first alternative allele; <code>/</code> separates unphased alleles, <code>|</code> phased ones, and <code>.</code> marks a missing call. BCF is the binary version.",
  "see": [
   "pvcf",
   "bgen",
   "plink-binary",
   "variant-calling"
  ],
  "links": [
   {
    "t": "VCF v4.3 specification (SAMtools/hts-specs)",
    "u": "https://samtools.github.io/hts-specs/VCFv4.3.pdf"
   }
  ],
  "match": [
   "VCF",
   "Variant Call Format"
  ],
  "cs": true,
  "auto": true,
  "noPlural": false,
  "owner": "the-data"
 },
 {
  "id": "wahlund-effect",
  "term": "Wahlund effect",
  "short": "The shortfall of heterozygotes in a sample that pools groups with different allele frequencies, even when each group is in Hardy–Weinberg equilibrium. The shortfall equals \\(2\\Var(q)\\), twice the variance of the allele frequency \\(q\\) across the groups.",
  "long": "The resulting \\(F\\), the shortfall divided by the expected heterozygote fraction \\(2\\bar{q}(1 - \\bar{q})\\), equals \\(\\Var(q)/(\\bar{q}(1 - \\bar{q}))\\), where \\(\\bar{q}\\) is the average allele frequency across the groups: the quantity population geneticists call \\(F_{\\mathrm{ST}}\\). It is one reason QC is run within groups of genetically similar people.",
  "see": [
   "hwe",
   "fst",
   "population-stratification"
  ],
  "links": [
   {
    "t": "Coop: Population and Quantitative Genetics (free lecture notes)",
    "u": "https://github.com/cooplab/popgen-notes"
   }
  ],
  "match": [
   "Wahlund effect"
  ],
  "noPlural": true,
  "owner": "allele-frequencies"
 },
 {
  "id": "white-blood-cell",
  "term": "white blood cell (leukocyte)",
  "aka": [
   "leukocyte",
   "white cell"
  ],
  "short": "Blood cells of the immune system. They are the only blood cells with a nucleus, so DNA for genotyping comes from them; a microliter of blood holds only about 5,000 to 10,000.",
  "long": "White blood cells carry the person's germline genome plus a few changes acquired during life. Because blood cells come from dividing stem cells, an acquired change can be carried by a large share of them (clonal hematopoiesis), which array intensities and sequencing can detect.",
  "see": [
   "buffy-coat",
   "red-blood-cell",
   "platelet",
   "nucleus",
   "clonal-hematopoiesis"
  ],
  "links": [
   {
    "t": "OpenStax Anatomy & Physiology 2e, 18.4: Leukocytes and platelets",
    "u": "https://openstax.org/books/anatomy-and-physiology-2e/pages/18-4-leukocytes-and-platelets"
   }
  ],
  "match": [
   "white blood cell",
   "leukocyte"
  ],
  "owner": "samples-to-genotypes"
 },
 {
  "id": "whole-blood",
  "term": "whole blood",
  "short": "Blood as it leaves the vein, before any separation: the liquid plasma carrying red blood cells, white blood cells and platelets. Genetic studies usually collect whole blood and extract DNA from its white blood cells.",
  "long": "Spun in a centrifuge, whole blood separates into plasma on top (about 55% of the volume), a thin buffy coat (under 1%) and packed red blood cells (about 45%). UK Biobank participants gave about 45–50 ml of blood at the assessment centre.",
  "see": [
   "plasma",
   "buffy-coat",
   "red-blood-cell",
   "white-blood-cell",
   "dna-extraction"
  ],
  "links": [
   {
    "t": "OpenStax Anatomy & Physiology 2e, 18.1: An overview of blood",
    "u": "https://openstax.org/books/anatomy-and-physiology-2e/pages/18-1-an-overview-of-blood"
   }
  ],
  "match": [
   "whole blood"
  ],
  "noPlural": true,
  "owner": "samples-to-genotypes"
 },
 {
  "id": "wes",
  "term": "whole-exome sequencing (WES)",
  "aka": [
   "exome sequencing",
   "WES"
  ],
  "short": "Sequencing only the DNA fragments that overlap exons, captured with probes: a small part of the genome, read deeply. It finds rare coding variants at lower cost than genome sequencing but misses most non-coding variation.",
  "long": "UK Biobank’s exomes (454,787 people in the 2021 analysis; over 470,000 in the final release) targeted about 39 million bases in 19,396 genes, with 95.8% of targeted bases read at least 20 times; the 2021 analysis found 12.3 million variants in the coding regions of 18,893 genes.",
  "see": [
   "exome",
   "wgs",
   "rare-variant",
   "probe",
   "rare-variant-association-study"
  ],
  "links": [
   {
    "t": "MedlinePlus: What are whole exome sequencing and whole genome sequencing?",
    "u": "https://medlineplus.gov/genetics/understanding/testing/sequencing/"
   },
   {
    "t": "Backman et al. 2021: Exome sequencing and analysis of 454,787 UK Biobank participants",
    "u": "https://doi.org/10.1038/s41586-021-04103-z"
   }
  ],
  "match": [
   "whole-exome sequencing",
   "exome sequencing",
   "WES"
  ],
  "owner": "samples-to-genotypes"
 },
 {
  "id": "wgs",
  "term": "whole-genome sequencing (WGS)",
  "aka": [
   "genome sequencing",
   "WGS"
  ],
  "short": "Sequencing all DNA fragments of a person's genome, typically to an average depth of 30× or more, giving genotypes at almost every position, including non-coding and structural variants.",
  "long": "UK Biobank sequenced 490,640 genomes to an average of 32.5× and found about 1.5 billion variants.",
  "see": [
   "wes",
   "read-depth",
   "structural-variant",
   "short-read-sequencing"
  ],
  "links": [
   {
    "t": "MedlinePlus: What are whole exome sequencing and whole genome sequencing?",
    "u": "https://medlineplus.gov/genetics/understanding/testing/sequencing/"
   },
   {
    "t": "UK Biobank WGS Consortium 2025: Whole-genome sequencing of 490,640 UK Biobank participants",
    "u": "https://doi.org/10.1038/s41586-025-09272-9"
   }
  ],
  "match": [
   "whole-genome sequencing",
   "genome sequencing",
   "WGS"
  ],
  "owner": "samples-to-genotypes"
 },
 {
  "id": "x-chromosome",
  "term": "X chromosome",
  "aka": [
   "chrX"
  ],
  "short": "One of the two sex chromosomes, 156.0 million base pairs long in GRCh38. Females typically have two copies and males one. PLINK codes it as chromosome 23 (X).",
  "see": [
   "sex-chromosomes",
   "hemizygous",
   "x-inactivation",
   "pseudoautosomal-region"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: X Chromosome",
    "u": "https://www.genome.gov/genetics-glossary/X-Chromosome"
   },
   {
    "t": "MedlinePlus Genetics: X chromosome",
    "u": "https://medlineplus.gov/genetics/chromosome/x/"
   }
  ],
  "match": [
   "X chromosome"
  ],
  "cs": true,
  "auto": true,
  "noPlural": false,
  "owner": "cells-chromosomes"
 },
 {
  "id": "x-inactivation",
  "term": "X-chromosome inactivation",
  "aka": [
   "X inactivation",
   "XCI",
   "lyonization"
  ],
  "short": "In female cells, the silencing of one of the two X chromosomes early in development, chosen at random in each cell and kept in its descendants. It affects gene expression, not genotype calls.",
  "long": "The silenced X is coated by RNA from the <em>XIST</em> gene and condenses into a compact body. About 15% of X genes escape inactivation to some degree (Carrel &amp; Willard, 2005).",
  "see": [
   "x-chromosome",
   "mosaicism"
  ],
  "links": [
   {
    "t": "MedlinePlus Genetics: X chromosome",
    "u": "https://medlineplus.gov/genetics/chromosome/x/"
   }
  ],
  "match": [
   "X-chromosome inactivation",
   "X chromosome inactivation",
   "X inactivation",
   "X-inactivation"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "cells-chromosomes"
 },
 {
  "id": "x-linked",
  "term": "X-linked inheritance",
  "aka": [
   "X-linked recessive",
   "X-linked dominant",
   "sex-linked"
  ],
  "short": "Inheritance of a trait whose gene is on the X chromosome. Males have one X, so one copy of an X-linked recessive allele affects them; fathers pass their X only to daughters. Example: hemophilia.",
  "see": [
   "x-chromosome",
   "hemizygous",
   "recessive",
   "pedigree"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: X-Linked",
    "u": "https://www.genome.gov/genetics-glossary/X-Linked"
   }
  ],
  "match": [
   "X-linked",
   "X-linked recessive",
   "X-linked dominant",
   "X-linked inheritance"
  ],
  "cs": true,
  "noPlural": true,
  "owner": "inheritance"
 },
 {
  "id": "y-chromosome",
  "term": "Y chromosome",
  "aka": [
   "chrY"
  ],
  "short": "The smaller sex chromosome, typically present in males. It carries <em>SRY</em>, the gene that directs male development. GRCh38 lists 57.2 million base pairs but lacks over half of its sequence. PLINK code: 24 (Y).",
  "see": [
   "sex-chromosomes",
   "pseudoautosomal-region",
   "mosaic-loss-of-y"
  ],
  "links": [
   {
    "t": "NHGRI Talking Glossary: Y Chromosome",
    "u": "https://www.genome.gov/genetics-glossary/Y-Chromosome"
   },
   {
    "t": "MedlinePlus Genetics: Y chromosome",
    "u": "https://medlineplus.gov/genetics/chromosome/y/"
   }
  ],
  "match": [
   "Y chromosome"
  ],
  "cs": true,
  "auto": true,
  "noPlural": false,
  "owner": "cells-chromosomes"
 },
 {
  "id": "zygote",
  "term": "zygote",
  "aka": [
   "fertilized egg"
  ],
  "short": "The single diploid cell formed when an egg and a sperm fuse at fertilization. Every cell of the body descends from it by cell division.",
  "see": [
   "gamete",
   "diploid"
  ],
  "match": [
   "zygote",
   "fertilized egg"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "cells-chromosomes"
 },
 {
  "id": "beta",
  "term": "β (beta, per-allele effect)",
  "aka": [
   "BETA",
   "per-allele effect"
  ],
  "short": "The slope from regressing a phenotype on genotype coded 0/1/2: the change in mean phenotype per copy of the effect allele (column BETA in GWAS output). Its sign depends on which allele is counted.",
  "long": "For a binary trait analyzed with logistic regression, \\(\\beta\\) is the log of the per-allele odds ratio. The estimate from data is written \\(\\hat{\\beta}\\) (beta-hat).",
  "see": [
   "effect-size",
   "effect-allele",
   "additive-model",
   "odds-ratio"
  ],
  "match": [
   "per-allele effect"
  ],
  "cs": false,
  "auto": true,
  "noPlural": false,
  "owner": "genotype-to-phenotype"
 },
 {
  "id": "beta-thalassemia",
  "term": "β-thalassemia",
  "aka": [
   "beta thalassemia"
  ],
  "short": "An inherited blood disorder caused by <em>HBB</em> variants that reduce or abolish β-globin production, leading to anemia; severe forms need regular blood transfusions. More fetal hemoglobin (HbF) makes it milder.",
  "l1": "slide 17",
  "see": [
   "hemoglobinopathy",
   "fetal-hemoglobin",
   "sickle-cell-disease"
  ],
  "links": [
   {
    "t": "MedlinePlus Genetics: Beta thalassemia",
    "u": "https://medlineplus.gov/genetics/condition/beta-thalassemia/"
   }
  ],
  "match": [
   "β-thalassemia",
   "beta thalassemia",
   "beta-thalassemia",
   "β-thalassaemia"
  ],
  "cs": false,
  "auto": true,
  "noPlural": true,
  "owner": "genes-expression"
 }
];
