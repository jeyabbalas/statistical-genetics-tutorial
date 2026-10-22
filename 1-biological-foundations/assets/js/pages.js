/* Site map: the single source of truth for navigation order and page titles.
   To remove a page from the lecture, delete its key from `parts` (and optionally from `pages`). */
window.SITE = {
  course: "Statistical genetics · Lecture 1",
  /* Glossary links: "section" = first use of a term in each section, figure caption, table, quiz question and
     mental-model box; "block" = first use in every paragraph (denser). */
  autolinkScope: "section",
  /* Very common terms: linked only at their first use on each page. Remove an id to link it per section. */
  linkOncePerPage: ["dna", "gene", "protein", "rna", "cell", "genome", "chromosome", "base", "base-pair", "nucleotide",
    "allele", "genotype", "genetic-variant", "snp", "locus", "gwas", "phenotype", "trait", "mutation",
    "heterozygous", "homozygous", "autosome"],
  title: "Biological foundations for statistical genetics",
  parts: [
    { title: "Start here", pages: ["index"] },
    { title: "Part A · The biological system", pages: [
      "cells-chromosomes", "dna", "genes-expression", "variation", "inheritance",
      "allele-frequencies", "haplotypes-ld", "ancestry", "genotype-to-phenotype"
    ] },
    { title: "Part B · Measuring the system", pages: [
      "uk-biobank", "samples-to-genotypes", "phenotypes", "the-data"
    ] },
    { title: "Wrap-up", pages: ["lecture-2-bridge", "glossary", "resources"] }
  ],
  pages: {
    "index":                 { file: "index.html",                 title: "Overview: two mental models for the whole lecture", nav: "Overview" },
    "cells-chromosomes":     { file: "cells-chromosomes.html",     title: "Cells, chromosomes, and the genome",                 nav: "Cells, chromosomes & the genome", num: 1 },
    "dna":                   { file: "dna.html",                   title: "DNA: the molecule, its strands, and its coordinates", nav: "DNA, strands & coordinates", num: 2 },
    "genes-expression":      { file: "genes-expression.html",      title: "Genes and gene expression",                          nav: "Genes & gene expression", num: 3 },
    "variation":             { file: "variation.html",             title: "Genetic variation: how genomes differ",              nav: "Genetic variation", num: 4 },
    "inheritance":           { file: "inheritance.html",           title: "Inheritance: from parents to children",              nav: "Inheritance & relatedness", num: 5 },
    "allele-frequencies":    { file: "allele-frequencies.html",    title: "Populations I: allele frequencies and Hardy–Weinberg equilibrium", nav: "Allele frequencies & HWE", num: 6 },
    "haplotypes-ld":         { file: "haplotypes-ld.html",         title: "Populations II: haplotypes and linkage disequilibrium", nav: "Haplotypes & LD", num: 7 },
    "ancestry":              { file: "ancestry.html",              title: "Populations III: ancestry, population structure, and population descriptors", nav: "Ancestry & structure", num: 8 },
    "genotype-to-phenotype": { file: "genotype-to-phenotype.html", title: "From genotype to phenotype",                         nav: "Genotype → phenotype", num: 9 },
    "uk-biobank":            { file: "uk-biobank.html",            title: "UK Biobank: who is in it and how they were recruited", nav: "UK Biobank: recruitment", num: 10 },
    "samples-to-genotypes":  { file: "samples-to-genotypes.html",  title: "From a blood sample to genotypes",                   nav: "Samples → genotypes", num: 11 },
    "phenotypes":            { file: "phenotypes.html",            title: "Measuring phenotypes",                               nav: "Measuring phenotypes", num: 12 },
    "the-data":              { file: "the-data.html",              title: "What genotype–phenotype data looks like",            nav: "What the data looks like", num: 13 },
    "lecture-2-bridge":      { file: "lecture-2-bridge.html",      title: "Lecture 2 decoder",                                  nav: "Lecture 2 decoder" },
    "glossary":              { file: "glossary.html",              title: "Glossary",                                           nav: "Glossary" },
    "resources":             { file: "resources.html",             title: "Learn more: curated resources",                      nav: "Learn more" }
  }
};
