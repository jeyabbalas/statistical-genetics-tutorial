#!/usr/bin/env bash
# qc_pipeline.sh: the eight quality-control steps of the Lecture 1 practical, run with PLINK 1.9
# and GrafAnc on the PennCATH data, in the folder layout of setup.html.
#
# Written for "Statistical genetics, Lecture 1", page "Set up your computer" (setup.html#scripts).
# The steps, file names and thresholds follow the DCEG Statistical Genetics Workshop's Session 1
# practical, src/01_qc.Rmd in https://github.com/DCEG-workshops/statgen_workshop_tutorial; credit
# for the analysis belongs to the workshop. This script is not the workshop's code. It was run end
# to end on the PennCATH files with PLINK 1.9.0 (27 Sep 2026) on macOS, bash 3.2, GRAFANC_MODE=skip
# (November 2026); GrafAnc's Docker and Linux routes here have not been run. Read each step's .log
# file, and compare with the practical.
#
# Usage:   bash qc_pipeline.sh          run steps 1 to 8
#          bash qc_pipeline.sh 7 8      run only the steps listed (their inputs must already exist)
#
# Settings, as environment variables (default in brackets):
#   STATGEN_DIR    project folder [~/statgen-workshop]. If input_dir, reference_dir and analysis_dir
#                  are already set (setup.html#layout), they are used instead.
#   PLINK          the PLINK 1.9 program [plink]
#   PLINK_OPTS     extra flags for every PLINK run, for example "--memory 2000 --threads 2" []
#   GRAFANC_MODE   how to run GrafAnc in step 8: auto, native, docker or skip
#                  [auto: native on Linux, including WSL; docker on macOS]
#   GRAFANC        a GrafAnc program to use in native mode [the repository's bin/grafanc, cloned
#                  into analysis_dir if absent, as the practical does]
#   GRAFANC_IMAGE  the Docker image for docker mode [ghcr.io/dceg-workshops/graftools:1.0.1]
#   GRAFANC_OPTS   extra GrafAnc options, for example "--threads 2" []
#
# Example:  PLINK_OPTS="--memory 2000" GRAFANC_MODE=skip bash qc_pipeline.sh

set -euo pipefail

STATGEN_DIR="${STATGEN_DIR:-$HOME/statgen-workshop}"
input_dir="${input_dir:-$STATGEN_DIR/data/inputs/penncath_withPheno}"
reference_dir="${reference_dir:-$STATGEN_DIR/data/inputs/ref}"
analysis_dir="${analysis_dir:-$STATGEN_DIR/analysis}"
PLINK="${PLINK:-plink}"
PLINK_OPTS="${PLINK_OPTS:-}"
GRAFANC_MODE="${GRAFANC_MODE:-auto}"
GRAFANC_IMAGE="${GRAFANC_IMAGE:-ghcr.io/dceg-workshops/graftools:1.0.1}"
GRAFANC_OPTS="${GRAFANC_OPTS:-}"

# File-name prefixes, exactly as in the practical.
raw="$input_dir/penncath"                                  # the input fileset
ref="$reference_dir/all_pops_1kgenomes_markersForPCA"      # 1000 Genomes reference fileset
geno="$analysis_dir/penncath.geno0.01"                     # after the SNP missing-call filter
qc="$analysis_dir/penncath.geno0.01.mind0.01"              # after the sample filter: the QC'd set
merged="$qc.merge1kgenomes"                                # PennCATH and 1000 Genomes together

# 1000 Genomes table of sample, population and super-population. The practical clones the
# archived akt repository only to get this file; the identical file is on the 1000 Genomes site.
PANEL_URL="https://ftp.1000genomes.ebi.ac.uk/vol1/ftp/release/20130502/integrated_call_samples_v3.20130502.ALL.panel"
PANEL_SHA256="b4023dc6ee2d62ee89c8d4d347db4d348e65518d66d346574cdae7a4bbd76858"
panel="$analysis_dir/akt/data/integrated_call_samples_v3.20130502.ALL.panel"

log()  { printf '\n==> %s\n' "$*"; }
die()  { printf '\nERROR: %s\n' "$*" >&2; exit 1; }
need() { local f; for f in "$@"; do [ -e "$f" ] || die "missing $f (run the earlier steps first)"; done; }
sha256() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d ' ' -f 1
  else shasum -a 256 "$1" | cut -d ' ' -f 1
  fi
}
plink_run() {
  printf '+ %s %s %s\n' "$PLINK" "$*" "$PLINK_OPTS"
  # shellcheck disable=SC2086  # PLINK_OPTS is meant to be split into separate flags
  "$PLINK" "$@" $PLINK_OPTS
}

# ---------------------------------------------------------------------------------------------
step1() {
  log "Step 1 · missing calls: rates per SNP and per person, then the two filters"
  need "$raw.bed" "$raw.bim" "$raw.fam"
  plink_run --bfile "$raw" --missing --out "$analysis_dir/penncath"      # .lmiss and .imiss
  # SNPs first: a SNP that failed in many people would otherwise raise every person's rate.
  plink_run --bfile "$raw" --geno 0.01 --make-bed --out "$geno"
  plink_run --bfile "$geno" --missing --out "$geno"                       # people, re-checked
  plink_run --bfile "$geno" --mind 0.01 --make-bed --out "$qc"
}

step2() {
  log "Step 2 · Hardy-Weinberg exact tests (report only; nothing is removed)"
  need "$qc.bed"
  plink_run --bfile "$qc" --hardy --out "$qc"                             # .hwe: ALL, AFF, UNAFF rows
}

step3() {
  log "Step 3 · LD pruning: windows of 50 SNPs, step 5, r-squared above 0.3"
  need "$qc.bed"
  plink_run --bfile "$qc" --indep-pairwise 50 5 0.3 --out "$qc"          # .prune.in, .prune.out
}

step4() {
  log "Step 4 · relatedness (IBD) on the pruned SNPs"
  need "$qc.bed" "$qc.prune.in"
  plink_run --bfile "$qc" --extract "$qc.prune.in" --genome --out "$qc.LD0.3"   # .genome
}

step5() {
  log "Step 5 · heterozygosity on the pruned SNPs"
  need "$qc.bed" "$qc.prune.in"
  plink_run --bfile "$qc" --het --extract "$qc.prune.in" --out "$qc.LD0.3"      # .het
}

step6() {
  log "Step 6 · PCA of PennCATH alone (pruned SNPs with minor allele frequency 0.05 or more)"
  need "$qc.bed" "$qc.prune.in"
  plink_run --bfile "$qc" --extract "$qc.prune.in" --maf 0.05 --pca --out "$qc.LD0.3"   # .eigenvec, .eigenval
}

get_panel() {
  if [ -f "$panel" ] && [ "$(sha256 "$panel")" = "$PANEL_SHA256" ]; then return 0; fi
  mkdir -p "$(dirname "$panel")"
  echo "Downloading the 1000 Genomes population table (55 KB)"
  if curl -fsSL --retry 3 -o "$panel.part" "$PANEL_URL" && [ "$(sha256 "$panel.part")" = "$PANEL_SHA256" ]; then
    mv -f "$panel.part" "$panel"
  else
    rm -f "$panel.part"
    echo "Could not download $PANEL_URL. The practical's way also works:"
    echo "  cd \"$analysis_dir\" && git clone https://github.com/Illumina/akt.git"
  fi
}

step7() {
  log "Step 7 · merge with the 1000 Genomes reference, flip strands, PCA of the merged set"
  need "$qc.bed" "$ref.bed" "$ref.bim" "$ref.fam"
  rm -f "$merged.bed" "$merged.bim" "$merged.fam" "$merged-merge.missnp"
  # The first merge is expected to fail: PLINK lists the SNPs whose alleles conflict in
  # <out>-merge.missnp and exits with a non-zero status, which must not stop this script.
  plink_run --bfile "$qc" --bmerge "$ref.bed" "$ref.bim" "$ref.fam" --make-bed --out "$merged" || true
  if [ -s "$merged-merge.missnp" ]; then
    echo "$(wc -l < "$merged-merge.missnp" | tr -d ' ') SNPs listed in $merged-merge.missnp: flipping them in PennCATH and merging again"
    plink_run --bfile "$qc" --flip "$merged-merge.missnp" --make-bed --out "${qc}_flipSNPs"
    plink_run --bfile "${qc}_flipSNPs" --bmerge "$ref.bed" "$ref.bim" "$ref.fam" --make-bed --out "$merged" ||
      die "the second merge failed too; the SNPs now in $merged-merge.missnp conflict even after flipping (the practical expects this merge to succeed)"
  fi
  need "$merged.bed"
  plink_run --bfile "$merged" --geno 0.1 --maf 0.05 --pca --out "$merged"
  get_panel
}

run_grafanc() {   # input prefix, output file (both in analysis_dir)
  local prefix="$1" out="$2" mode="$GRAFANC_MODE" bin
  if [ "$mode" = auto ]; then
    if [ "$(uname -s)" = Linux ]; then mode=native; else mode=docker; fi
  fi
  rm -f "$out"
  case "$mode" in
    skip)
      echo "GRAFANC_MODE=skip: GrafAnc was not run."
      return 0 ;;
    native)
      bin="${GRAFANC:-$analysis_dir/grafanc/bin/grafanc}"
      if [ -z "${GRAFANC:-}" ] && [ ! -d "$analysis_dir/grafanc" ]; then
        (cd "$analysis_dir" && git clone https://github.com/jimmy-penn/grafanc.git)
      fi
      # GrafAnc's reference table ships compressed and must be decompressed once.
      if [ -f "$analysis_dir/grafanc/cpp/data/AncSnpPopAFs.txt.gz" ]; then
        gunzip -f "$analysis_dir/grafanc/cpp/data/AncSnpPopAFs.txt.gz"
      fi
      [ -x "$bin" ] || die "GrafAnc program $bin not found or not executable (setup.html#grafanc)"
      # GRAFPATH tells GrafAnc where to find data/AncSnpPopAFs.txt. The unpatched program exits
      # with status 1 even after a successful run, so success is judged by the output file below.
      # shellcheck disable=SC2086  # GRAFANC_OPTS is meant to be split into separate options
      GRAFPATH="${GRAFPATH:-$analysis_dir/grafanc/cpp}" "$bin" "$prefix" "$out" $GRAFANC_OPTS || true
      ;;
    docker)
      command -v docker >/dev/null 2>&1 || die "docker not found: install Docker Desktop, or set GRAFANC_MODE=skip (setup.html#grafanc)"
      # The image's working folder is /work; mounting analysis_dir there lets GrafAnc read and
      # write the files by name. --user makes the output file belong to you.
      # shellcheck disable=SC2086
      docker run --rm --platform linux/amd64 --user "$(id -u):$(id -g)" \
        -v "$analysis_dir":/work "$GRAFANC_IMAGE" \
        grafanc "$(basename "$prefix")" "$(basename "$out")" $GRAFANC_OPTS || true
      ;;
    *) die "GRAFANC_MODE must be auto, native, docker or skip, not '$mode'" ;;
  esac
  [ -s "$out" ] || die "GrafAnc wrote no output to $out (setup.html#troubleshooting)"
  echo "GrafAnc wrote $(( $(wc -l < "$out") - 1 )) result rows to $out"
}

step8() {
  log "Step 8 · unique sample IDs, then GrafAnc"
  need "$qc.bed" "$qc.fam"
  # PennCATH's family IDs are quoted strings such as "10002" and every individual ID is 1.
  # GrafAnc needs unique IDs, so the new individual ID joins the two: "10002" 1 -> "10002" "10002_1".
  # Each line: old family ID, old individual ID, new family ID, new individual ID.
  awk '{ fid = $1; gsub(/"/, "", fid); printf "%s %s \"%s\" \"%s_%s\"\n", $1, $2, fid, fid, $2 }' \
    "$qc.fam" > "$analysis_dir/penncath.updateIDs.txt"
  plink_run --bfile "$qc" --update-ids "$analysis_dir/penncath.updateIDs.txt" --make-bed --out "$qc.uniqueIDs"
  run_grafanc "$qc.uniqueIDs" "$analysis_dir/penncath_grafanc_out.txt"
}

# ---------------------------------------------------------------------------------------------
command -v "$PLINK" >/dev/null 2>&1 || die "PLINK 1.9 ('$PLINK') not found on PATH (setup.html#plink)"
plink_version="$("$PLINK" --version 2>&1 || true)"
case "$plink_version" in
  *"PLINK v1.9"*) ;;
  *) die "'$PLINK' is not PLINK 1.9; it printed: $plink_version" ;;
esac
mkdir -p "$analysis_dir"

echo "PLINK:         $(command -v "$PLINK") (${plink_version%%$'\n'*})"
echo "input_dir:     $input_dir"
echo "reference_dir: $reference_dir"
echo "analysis_dir:  $analysis_dir"

steps="${*:-1 2 3 4 5 6 7 8}"
for s in $steps; do
  case "$s" in
    [1-8]) "step$s" ;;
    *) die "unknown step '$s'; give step numbers from 1 to 8" ;;
  esac
done

log "Done in ${SECONDS} s. The analysis folder now uses $(du -sh "$analysis_dir" | cut -f 1)."
echo "Next: Rscript qc_plots.R   (plots and counts; setup.html#scripts)"
