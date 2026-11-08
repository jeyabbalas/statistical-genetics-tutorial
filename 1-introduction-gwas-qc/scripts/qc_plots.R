# qc_plots.R: the plots and counts of the Lecture 1 practical, made from the files that
# qc_pipeline.sh (or the practical's own commands) wrote to analysis_dir.
#
# Written for "Statistical genetics, Lecture 1", page "Set up your computer" (setup.html#scripts).
# The plots, counts and thresholds follow the DCEG Statistical Genetics Workshop's Session 1
# practical, src/01_qc.Rmd in https://github.com/DCEG-workshops/statgen_workshop_tutorial; credit
# for the analysis belongs to the workshop. The code was written for this site. It was run on the
# PennCATH results of qc_pipeline.sh and GrafAnc with R 4.6.2 (November 2026).
#
# Run:     Rscript qc_plots.R              (or source("qc_plots.R") in RStudio or Positron)
# Needs:   the R packages data.table, dplyr and ggplot2 (all three come with tidyverse)
# Folder:  the environment variable analysis_dir if set, else STATGEN_DIR/analysis,
#          else ~/statgen-workshop/analysis
# Output:  PNG files in analysis_dir/plots/, and counts printed in the console. Steps whose files
#          do not exist yet are skipped with a message. Nothing is removed or changed.

suppressPackageStartupMessages({
  library(data.table)
  library(dplyr)
  library(ggplot2)
})

env_or <- function(name, default) {
  value <- Sys.getenv(name)
  if (nzchar(value)) value else default
}
statgen_dir  <- env_or("STATGEN_DIR", path.expand("~/statgen-workshop"))
analysis_dir <- env_or("analysis_dir", file.path(statgen_dir, "analysis"))
if (!dir.exists(analysis_dir)) stop("analysis_dir does not exist: ", analysis_dir)
plot_dir <- file.path(analysis_dir, "plots")
dir.create(plot_dir, showWarnings = FALSE)
cat("Reading from", analysis_dir, "\nWriting plots to", plot_dir, "\n")

qc <- file.path(analysis_dir, "penncath.geno0.01.mind0.01")   # prefix of the QC'd fileset

# Read a PLINK report if it exists; otherwise say so and return NULL.
read_report <- function(file, ...) {
  if (!file.exists(file)) {
    message("Skipped: ", basename(file), " does not exist yet (run that step first).")
    return(NULL)
  }
  fread(file, ...)
}
save_plot <- function(plot, name, width = 6, height = 4.5) {
  out <- file.path(plot_dir, name)
  ggsave(out, plot, width = width, height = height, dpi = 150)
  cat("  saved", out, "\n")
}
heading <- function(text) cat("\n==", text, "==\n")

# --- Step 1: missing calls ---------------------------------------------------------------------
heading("Step 1 · missing calls")
snp_miss <- read_report(file.path(analysis_dir, "penncath.lmiss"))
if (!is.null(snp_miss)) {
  save_plot(
    ggplot(snp_miss, aes(x = F_MISS)) +
      geom_histogram(bins = 60) +
      geom_vline(xintercept = 0.01, linetype = "dashed") +
      labs(title = "Missing-call rate per SNP (before filtering)", x = "F_MISS", y = "SNPs") +
      theme_classic(),
    "1a_snp_missing_rate.png")
  cat("SNPs with F_MISS above 0.01 (removed by --geno 0.01):\n")
  print(count(snp_miss, above_0.01 = F_MISS > 0.01))
}
person_miss <- read_report(file.path(analysis_dir, "penncath.geno0.01.imiss"))
if (!is.null(person_miss)) {
  save_plot(
    ggplot(person_miss, aes(x = F_MISS)) +
      geom_histogram(bins = 60) +
      geom_vline(xintercept = 0.01, linetype = "dashed") +
      labs(title = "Missing-call rate per person (after the SNP filter)", x = "F_MISS", y = "People") +
      theme_classic(),
    "1b_person_missing_rate.png")
  cat("People with F_MISS above 0.01 (removed by --mind 0.01):\n")
  print(count(person_miss, above_0.01 = F_MISS > 0.01))
}

# --- Step 2: Hardy-Weinberg tests, UNAFF rows -----------------------------------------------------
heading("Step 2 · Hardy-Weinberg exact tests")
hwe <- read_report(paste0(qc, ".hwe"))
if (!is.null(hwe)) {
  # PLINK writes up to three rows per SNP: ALL, AFF (phenotype code 2, PLINK's cases) and
  # UNAFF (code 1, PLINK's controls). The practical tests the UNAFF rows, because a true
  # association with the phenotype can distort genotype frequencies among cases. In this copy
  # of PennCATH the codes do not mean "with" and "without" coronary artery disease; see
  # plink-data.html#phenotype-column on the site.
  hwe_unaff <- filter(hwe, TEST == "UNAFF")
  save_plot(
    ggplot(hwe_unaff, aes(x = P)) +
      geom_histogram(bins = 50, boundary = 0) +
      labs(title = "HWE exact-test p-values, UNAFF rows (phenotype code 1)", x = "P", y = "SNPs") +
      theme_classic(),
    "2_hwe_p_unaff.png")
  cat("SNPs whose UNAFF-row HWE p-value is below 1e-8:\n")
  print(count(hwe_unaff, below_1e_8 = P < 1e-8))
}

# --- Step 3: LD pruning ----------------------------------------------------------------------------
heading("Step 3 · LD pruning")
for (suffix in c(".prune.in", ".prune.out")) {
  f <- paste0(qc, suffix)
  if (file.exists(f)) cat(basename(f), ":", length(readLines(f)), "SNPs\n")
  else message("Skipped: ", basename(f), " does not exist yet.")
}

# --- Step 4: relatedness ----------------------------------------------------------------------------
heading("Step 4 · relatedness (IBD)")
ibd <- read_report(paste0(qc, ".LD0.3.genome"))
if (!is.null(ibd)) {
  cat("PI_HAT over all", nrow(ibd), "pairs of people:\n")
  print(summary(ibd$PI_HAT))
  # Unrelated pairs sit near Z0 = 1, Z1 = 0; parent-child pairs near Z0 = 0, Z1 = 1.
  save_plot(
    ggplot(ibd, aes(x = Z0, y = Z1)) +
      geom_point(size = 0.4, alpha = 0.3) +
      coord_cartesian(xlim = c(0, 1), ylim = c(0, 1)) +
      labs(title = "Each pair of people: Z0 against Z1") +
      theme_classic(),
    "4_ibd_z0_z1.png")
}

# --- Step 5: heterozygosity -------------------------------------------------------------------------
heading("Step 5 · heterozygosity")
het <- read_report(paste0(qc, ".LD0.3.het"))
if (!is.null(het)) {
  # Observed heterozygosity rate: the share of a person's non-missing genotypes that are heterozygous.
  het <- mutate(het, het_rate = (`N(NM)` - `O(HOM)`) / `N(NM)`)
  center <- mean(het$het_rate)
  spread <- sd(het$het_rate)
  save_plot(
    ggplot(het, aes(x = het_rate)) +
      geom_histogram(bins = 50) +
      geom_vline(xintercept = center + c(-3, 3) * spread, linetype = "dashed") +
      labs(title = "Heterozygosity rate per person (dashed: mean ± 3 SD)", x = "het_rate", y = "People") +
      theme_classic(),
    "5_heterozygosity_rate.png")
  cat("People more than 3 standard deviations from the mean heterozygosity rate:\n")
  print(filter(het, abs(het_rate - center) > 3 * spread))
  cat("People with |F| > 0.1:\n")
  print(filter(het, abs(F) > 0.1))
}

# --- Step 6: PCA of PennCATH alone ------------------------------------------------------------------
heading("Step 6 · PCA of PennCATH")
name_pcs <- function(eigenvec) {
  # .eigenvec has no header: family ID, individual ID, then one column per principal component.
  setnames(eigenvec, c("FID", "IID", paste0("PC", seq_len(ncol(eigenvec) - 2))))
  eigenvec
}
pca <- read_report(paste0(qc, ".LD0.3.eigenvec"))
if (!is.null(pca)) {
  pca <- name_pcs(pca)
  save_plot(ggplot(pca, aes(x = PC1, y = PC2)) + geom_point(size = 0.8) +
              labs(title = "PennCATH alone: PC1 against PC2") + theme_classic(),
            "6a_pca_pc1_pc2.png")
  save_plot(ggplot(pca, aes(x = PC2, y = PC3)) + geom_point(size = 0.8) +
              labs(title = "PennCATH alone: PC2 against PC3") + theme_classic(),
            "6b_pca_pc2_pc3.png")
}

# --- Step 7: PCA with the 1000 Genomes reference ------------------------------------------------------
heading("Step 7 · PCA with 1000 Genomes")
merged_pca <- read_report(paste0(qc, ".merge1kgenomes.eigenvec"))
# The panel's header line ends with two extra tabs (6 names over 4 columns of data); header = TRUE
# with fill = TRUE reads it without a warning (fill = TRUE alone would read the header as data).
panel <- read_report(file.path(analysis_dir, "akt", "data", "integrated_call_samples_v3.20130502.ALL.panel"),
                     header = TRUE, fill = TRUE)
if (!is.null(merged_pca) && !is.null(panel)) {
  merged_pca <- name_pcs(merged_pca)
  merged_pca[, FID := as.character(FID)]
  # 1000 Genomes people have their sample name as family ID; PennCATH people find no match.
  both <- left_join(merged_pca, select(panel, sample, pop, super_pop), by = c("FID" = "sample"))
  reference_people <- filter(both, !is.na(super_pop))
  study_people <- filter(both, is.na(super_pop))
  cat(nrow(reference_people), "1000 Genomes people and", nrow(study_people), "PennCATH people in the PCA\n")
  pc_plot <- function(x, y) {
    ggplot(mapping = aes(x = .data[[x]], y = .data[[y]])) +
      geom_point(data = reference_people, aes(colour = super_pop), size = 0.8, alpha = 0.5) +
      geom_point(data = study_people, colour = "black", size = 0.8) +
      labs(title = paste0("PennCATH (black) with 1000 Genomes: ", x, " against ", y),
           x = x, y = y, colour = "1000 Genomes\nsuper-population") +
      theme_classic()
  }
  save_plot(pc_plot("PC1", "PC2"), "7a_pca_with_1kg_pc1_pc2.png", width = 7)
  save_plot(pc_plot("PC2", "PC3"), "7b_pca_with_1kg_pc2_pc3.png", width = 7)
}

# --- Step 8: GrafAnc --------------------------------------------------------------------------------
heading("Step 8 · GrafAnc ancestry groups")
graf <- read_report(file.path(analysis_dir, "penncath_grafanc_out.txt"))
if (!is.null(graf)) {
  # The hundreds digit of AncGroupID is the continental group (GrafAnc documentation).
  continental <- c("1" = "AFR", "2" = "MEN", "3" = "EUR", "4" = "SAS",
                   "5" = "EAS", "6" = "AMR", "7" = "OCN", "8" = "MIX")
  graf <- mutate(graf, ContinentalGroup = unname(continental[as.character(AncGroupID %/% 100)]))
  save_plot(
    ggplot(graf, aes(x = GD1, y = GD2, colour = ContinentalGroup)) +
      geom_point(alpha = 0.6) +
      labs(title = "GrafAnc: GD1 against GD2", colour = "GrafAnc group") +
      theme_classic(),
    "8_grafanc_gd1_gd2.png")
  cat("People per GrafAnc continental group:\n")
  print(count(graf, ContinentalGroup, sort = TRUE))
  cat("People per GrafAnc group code, with percentages:\n")
  print(mutate(count(graf, AncGroupID, ContinentalGroup, sort = TRUE),
               percent = round(100 * n / sum(n), 1)))
}

cat("\nDone. Ancestry groups from PCA and GrafAnc are similarities to reference samples,",
    "\nnot statements about anyone's race, ethnicity or identity.\n")
