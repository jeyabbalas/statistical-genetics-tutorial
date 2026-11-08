/* Site map: the single source of truth for navigation order and page titles.
   To remove a page from the lecture, delete its key from `parts` (and optionally from `pages`). */
window.SITE = {
  lecture: 1,
  course: "Statistical genetics · Lecture 1",
  title: "Genetic epidemiology, GWAS and quality control",
  /* Glossary entries are merged: Lecture 0's entries (../0-biological-foundations/assets/js/glossary-data.js)
     first, then this lecture's (assets/js/glossary-data.js), which add terms and may override a Lecture 0
     entry by reusing its id. */
  glossaryBase: "../0-biological-foundations/glossary.html",
  /* Slide callouts ("Slides 72–79 · …") link to this page, which lists every slide of the lecture. */
  slideGuide: "slide-guide.html",
  slideCount: 124,
  slideImg: "../0-biological-foundations/assets/img/lecture1/slide-",
  /* Glossary links: "section" = first use of a term in each section, figure caption, table, quiz question and
     mental-model box; "block" = first use in every paragraph (denser). */
  autolinkScope: "section",
  /* Very common terms: linked only at their first use on each page. Remove an id to link it per section. */
  linkOncePerPage: ["dna", "gene", "protein", "rna", "cell", "genome", "chromosome", "base", "base-pair", "nucleotide",
    "allele", "genotype", "genetic-variant", "snp", "locus", "gwas", "phenotype", "trait", "mutation",
    "heterozygous", "homozygous", "autosome", "plink", "qc", "sample", "variant-qc", "sample-qc"],
  parts: [
    { title: "Start here", pages: ["index"] },
    { title: "Part A · Genetic epidemiology", pages: [
      "genetic-epidemiology", "field-map", "social-context"
    ] },
    { title: "Part B · A few basic definitions", pages: [
      "snp-data", "frequencies-hwe", "linkage-disequilibrium", "population-structure"
    ] },
    { title: "Part C · GWAS from start to finish", pages: [
      "gwas-design", "gwas-analysis", "gwas-applications"
    ] },
    { title: "Part D · Practical: quality control", pages: [
      "practical-overview", "plink-data", "tools", "setup",
      "qc-missingness", "qc-hwe", "qc-ld-pruning", "qc-relatedness", "qc-heterozygosity",
      "qc-pca", "qc-reference-pca", "qc-grafanc", "qc-exercise"
    ] },
    { title: "Wrap-up", pages: ["slide-guide", "glossary", "resources"] }
  ],
  pages: {
    "index":                  { file: "index.html",                  title: "Overview: genetic epidemiology, GWAS and quality control", nav: "Overview" },
    "genetic-epidemiology":   { file: "genetic-epidemiology.html",   title: "Genetic epidemiology: what it is and how it improves health", nav: "What genetic epidemiology does", num: 1 },
    "field-map":              { file: "field-map.html",              title: "The field map: history, subfields and the course", nav: "The field map & the course", num: 2 },
    "social-context":         { file: "social-context.html",         title: "Social context: what is studied, in whom, and how results are read", nav: "Social context", num: 3 },
    "snp-data":               { file: "snp-data.html",               title: "From molecules to SNP data: alleles, strands and names", nav: "From molecules to SNP data", num: 4 },
    "frequencies-hwe":        { file: "frequencies-hwe.html",        title: "Estimating frequencies and testing Hardy–Weinberg equilibrium", nav: "Frequencies & HWE tests", num: 5 },
    "linkage-disequilibrium": { file: "linkage-disequilibrium.html", title: "Linkage disequilibrium: from genotypes to haplotypes to r²", nav: "Linkage disequilibrium", num: 6 },
    "population-structure":   { file: "population-structure.html",   title: "Population structure: allele frequencies across populations, STRUCTURE and PCA", nav: "Population structure & PCA", num: 7 },
    "gwas-design":            { file: "gwas-design.html",            title: "Designing a GWAS and producing its data", nav: "GWAS design & data", num: 8 },
    "gwas-analysis":          { file: "gwas-analysis.html",          title: "Testing association and reading GWAS results", nav: "Association testing & results", num: 9 },
    "gwas-applications":      { file: "gwas-applications.html",      title: "Using GWAS results, sharing them, and their limits", nav: "Applications & limits", num: 10 },
    "practical-overview":     { file: "practical-overview.html",     title: "The practical: quality control of GWAS data with PLINK", nav: "Practical overview", num: 11 },
    "plink-data":             { file: "plink-data.html",             title: "The data: PLINK .bed, .bim and .fam files, inside out", nav: "PLINK files inside out", num: 12 },
    "tools":                  { file: "tools.html",                  title: "The tools: PLINK, R packages, GrafAnc and friends", nav: "The tools in detail", num: 13 },
    "setup":                  { file: "setup.html",                  title: "Run the practical on your own computer or in the cloud", nav: "Set up your computer", num: 14 },
    "qc-missingness":         { file: "qc-missingness.html",         title: "QC step 1: missing genotype calls", nav: "Step 1 · Missingness", num: 15 },
    "qc-hwe":                 { file: "qc-hwe.html",                 title: "QC step 2: Hardy–Weinberg equilibrium", nav: "Step 2 · Hardy–Weinberg", num: 16 },
    "qc-ld-pruning":          { file: "qc-ld-pruning.html",          title: "QC step 3: LD pruning", nav: "Step 3 · LD pruning", num: 17 },
    "qc-relatedness":         { file: "qc-relatedness.html",         title: "QC step 4: relatedness and identity by descent", nav: "Step 4 · Relatedness", num: 18 },
    "qc-heterozygosity":      { file: "qc-heterozygosity.html",      title: "QC step 5: heterozygosity", nav: "Step 5 · Heterozygosity", num: 19 },
    "qc-pca":                 { file: "qc-pca.html",                 title: "QC step 6: principal component analysis", nav: "Step 6 · PCA", num: 20 },
    "qc-reference-pca":       { file: "qc-reference-pca.html",       title: "QC step 7: merging with 1000 Genomes and reference-based PCA", nav: "Step 7 · Reference PCA", num: 21 },
    "qc-grafanc":             { file: "qc-grafanc.html",             title: "QC step 8: genetic ancestry assignment with GrafAnc", nav: "Step 8 · GrafAnc", num: 22 },
    "qc-exercise":            { file: "qc-exercise.html",            title: "Exercise: build a quality-controlled dataset", nav: "Exercise & full lab", num: 23 },
    "slide-guide":            { file: "slide-guide.html",            title: "Lecture 1 slide guide", nav: "Slide guide" },
    "glossary":               { file: "glossary.html",               title: "Glossary", nav: "Glossary" },
    "resources":              { file: "resources.html",              title: "Learn more: curated resources", nav: "Learn more" }
  }
};
