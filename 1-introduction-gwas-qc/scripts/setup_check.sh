#!/usr/bin/env bash
# setup_check.sh: check that this computer is ready for the Lecture 1 practical.
#
# Written for "Statistical genetics, Lecture 1", page "Set up your computer" (setup.html#scripts).
# The practical is the DCEG Statistical Genetics Workshop's Session 1 QC practical
# (src/01_qc.Rmd in https://github.com/DCEG-workshops/statgen_workshop_tutorial). This script is
# not part of the workshop's materials.
#
# Usage:   bash setup_check.sh           check programs, R packages, data files and their checksums
#          bash setup_check.sh --quick   the same without the checksums (they read 338 MB)
#
# Folders: STATGEN_DIR (default ~/statgen-workshop). If input_dir, reference_dir or analysis_dir
#          are already set, as on setup.html#layout, they are used instead.
#
# The script only reads: it installs, downloads and changes nothing. It ends with exit status 0 if
# PLINK 1.9, R with its packages, git, curl and the six data files are all in order, and 1 if not.
# GrafAnc, Docker and PLINK 2 are reported but optional.

set -u

had_input_dir="${input_dir:-}"
had_reference_dir="${reference_dir:-}"
had_analysis_dir="${analysis_dir:-}"
STATGEN_DIR="${STATGEN_DIR:-$HOME/statgen-workshop}"
input_dir="${input_dir:-$STATGEN_DIR/data/inputs/penncath_withPheno}"
reference_dir="${reference_dir:-$STATGEN_DIR/data/inputs/ref}"
analysis_dir="${analysis_dir:-$STATGEN_DIR/analysis}"
PLINK="${PLINK:-plink}"
GRAFANC_IMAGE="${GRAFANC_IMAGE:-ghcr.io/dceg-workshops/graftools:1.0.1}"

quick=0
case "${1:-}" in
  --quick) quick=1 ;;
  "") ;;
  *) echo "Usage: bash setup_check.sh [--quick]"; exit 2 ;;
esac

problems=0
ok()      { printf '  [ok]       %s\n' "$*"; }
note()    { printf '  [note]     %s\n' "$*"; }
missing() { printf '  [PROBLEM]  %s\n' "$*"; problems=$((problems + 1)); }
heading() { printf '\n%s\n' "$*"; }
have()    { command -v "$1" >/dev/null 2>&1; }
nbytes()  { wc -c < "$1" | tr -d ' '; }
sha256()  {
  if have sha256sum; then sha256sum "$1" | cut -d ' ' -f 1
  else shasum -a 256 "$1" | cut -d ' ' -f 1
  fi
}

# ---------------------------------------------------------------------------------------------
heading "This computer"
os="$(uname -s)"
arch="$(uname -m)"
case "$os" in
  Darwin) ok "macOS $(sw_vers -productVersion 2>/dev/null), processor $arch" ;;
  Linux)
    if grep -qi microsoft /proc/version 2>/dev/null; then ok "Linux under Windows (WSL), processor $arch"
    else ok "Linux, processor $arch"
    fi ;;
  *) note "$os, processor $arch: the instructions cover macOS, Linux and WSL" ;;
esac

ram_mb=""
if [ "$os" = Darwin ]; then
  ram_mb=$(( $(sysctl -n hw.memsize 2>/dev/null || echo 0) / 1048576 ))
elif [ -r /proc/meminfo ]; then
  ram_mb=$(( $(awk '/^MemTotal:/ { print $2 }' /proc/meminfo) / 1024 ))
fi
if [ -n "$ram_mb" ] && [ "$ram_mb" -gt 0 ]; then
  if [ "$ram_mb" -lt 4000 ]; then note "memory: ${ram_mb} MB; 4 GB or more is safer (setup.html#needs)"
  else ok "memory: ${ram_mb} MB"
  fi
fi

# Free space on the disk that holds (or will hold) the project folder.
probe="$STATGEN_DIR"
while [ ! -d "$probe" ] && [ "$probe" != "/" ]; do probe="$(dirname "$probe")"; done
free_kb="$(df -Pk "$probe" 2>/dev/null | awk 'NR == 2 { print $4 }')"
if [ -n "$free_kb" ]; then
  free_gb="$(awk -v k="$free_kb" 'BEGIN { printf "%.1f", k / 1048576 }')"
  if [ "$free_kb" -lt 5242880 ]; then note "free disk space: ${free_gb} GB; plan for 5 GB (setup.html#needs)"
  else ok "free disk space: ${free_gb} GB"
  fi
fi

# ---------------------------------------------------------------------------------------------
heading "Folder variables (setup.html#layout)"
for pair in "input_dir|$had_input_dir|$input_dir" "reference_dir|$had_reference_dir|$reference_dir" \
            "analysis_dir|$had_analysis_dir|$analysis_dir"; do
  name="${pair%%|*}"; rest="${pair#*|}"; was="${rest%%|*}"; now="${rest#*|}"
  if [ -n "$was" ]; then ok "$name=$was"
  else note "$name is not set in this terminal; this check uses $now"
  fi
done
case "$STATGEN_DIR" in
  *" "*) missing "the project folder contains a space; the practical's commands do not quote paths" ;;
esac

# ---------------------------------------------------------------------------------------------
heading "PLINK 1.9 (setup.html#plink)"
if have "$PLINK"; then
  where="$(command -v "$PLINK")"
  version="$("$PLINK" --version 2>&1 | head -n 1)"
  case "$version" in
    *"PLINK v1.9"*) ok "$version ($where)" ;;
    *"PLINK v2"*)   missing "$where is PLINK 2; the practical needs PLINK 1.9 under the name plink" ;;
    "")             missing "$where did not run; on macOS see setup.html#troubleshooting (quarantine)" ;;
    *)              missing "$where is not PLINK 1.9 (it printed: $version). PuTTY also installs a program called plink." ;;
  esac
elif have plink1.9; then
  missing "PLINK 1.9 is installed as plink1.9; make it available as plink:  ln -s \"$(command -v plink1.9)\" \"$STATGEN_DIR/tools/plink\""
else
  missing "plink not found on PATH; install it (setup.html#plink) or add its folder to PATH"
fi
if have plink2; then ok "PLINK 2 (optional): $(plink2 --version 2>&1 | head -n 1)"; fi

# ---------------------------------------------------------------------------------------------
heading "R and packages (setup.html#r)"
if have Rscript; then
  ok "$(Rscript --version 2>&1 | head -n 1)"
  report="$(Rscript -e 'for (p in c("tidyverse", "data.table", "glue", "dplyr", "ggplot2", "rmarkdown")) cat(p, if (requireNamespace(p, quietly = TRUE)) format(packageVersion(p)) else "MISSING", "\n")' 2>/dev/null)"
  while read -r pkg ver; do
    [ -z "$pkg" ] && continue
    if [ "$ver" = MISSING ]; then
      if [ "$pkg" = rmarkdown ]; then note "R package rmarkdown is not installed (needed only to knit the .Rmd outside RStudio)"
      else missing "R package $pkg is not installed: install.packages(\"$pkg\")"
      fi
    else ok "R package $pkg $ver"
    fi
  done <<EOF
$report
EOF
else
  missing "R (Rscript) not found on PATH; install R (setup.html#r)"
fi

# ---------------------------------------------------------------------------------------------
heading "Other programs"
if have git; then ok "$(git --version)"; else missing "git not found (setup.html#git)"; fi
if have curl; then ok "$(curl --version | head -n 1 | cut -d ' ' -f 1-2)"; else missing "curl not found"; fi
if have unzip; then ok "unzip"; else note "unzip not found (needed only to unpack the PLINK zip file)"; fi

# ---------------------------------------------------------------------------------------------
heading "GrafAnc, for step 8 only (setup.html#grafanc)"
grafanc_ready=0
if [ -n "${GRAFANC:-}" ]; then
  if [ -x "$GRAFANC" ]; then ok "GRAFANC=$GRAFANC"; grafanc_ready=1; else note "GRAFANC=$GRAFANC is not an executable file"; fi
fi
bin="$analysis_dir/grafanc/bin/grafanc"
if [ -f "$bin" ]; then
  if [ "$os" = Linux ]; then
    if have ldd && ldd "$bin" 2>/dev/null | grep -q 'not found'; then
      note "$bin needs libraries that are missing: $(ldd "$bin" | awk '/not found/ { print $1 }' | tr '\n' ' ')(install libhts3t64 or libhts3)"
    else
      ok "GrafAnc program from the repository: $bin"; grafanc_ready=1
    fi
  else
    note "$bin is a Linux program; on $os use the Docker image instead"
  fi
  if [ -f "$analysis_dir/grafanc/cpp/data/AncSnpPopAFs.txt.gz" ]; then
    note "the reference table is still compressed: gunzip \"$analysis_dir/grafanc/cpp/data/AncSnpPopAFs.txt.gz\""
  fi
fi
if have docker; then
  if docker info >/dev/null 2>&1; then
    if docker image inspect "$GRAFANC_IMAGE" >/dev/null 2>&1; then ok "Docker image $GRAFANC_IMAGE is present"; grafanc_ready=1
    else note "Docker runs; the GrafAnc image is not downloaded yet: docker pull --platform linux/amd64 $GRAFANC_IMAGE"
    fi
  else
    note "docker is installed but not running (start Docker Desktop)"
  fi
fi
if [ "$grafanc_ready" -eq 0 ]; then note "GrafAnc is not set up yet; steps 1 to 7 do not need it"; fi

# ---------------------------------------------------------------------------------------------
heading "Data files (setup.html#data)"
while read -r path size sum; do
  [ -z "$path" ] && continue
  case "$path" in
    ref/*) file="$reference_dir/${path#ref/}" ;;
    *)     file="$input_dir/${path#penncath_withPheno/}" ;;
  esac
  if [ ! -f "$file" ]; then missing "$file is missing (bash download_data.sh)"; continue; fi
  got="$(nbytes "$file")"
  if [ "$got" != "$size" ]; then missing "$file has $got bytes, expected $size (incomplete download?)"; continue; fi
  case "$file" in
    *.bed)
      magic="$(head -c 3 "$file" | od -An -tx1 | tr -d ' \n')"
      if [ "$magic" != 6c1b01 ]; then missing "$file does not start with the .bed signature 6c 1b 01"; continue; fi ;;
  esac
  if [ "$quick" -eq 1 ]; then ok "$(basename "$file"): $size bytes (checksum not checked)"; continue; fi
  if [ "$(sha256 "$file")" = "$sum" ]; then ok "$(basename "$file"): $size bytes, SHA-256 matches"
  else missing "$file: SHA-256 does not match; download it again"
  fi
done <<'EOF'
penncath_withPheno/penncath.bed 302377026 b98881c0a0f5218ab059813ccf1d0a2ce1dbc624162fbbd5726a989b7c5fc09e
penncath_withPheno/penncath.bim 24051506 7a3a31ed769d183d4d5d9a3b195f0dcd5f536b326069ceb773c24fe6df088ed7
penncath_withPheno/penncath.fam 25686 33c244871b843eded61506751ce3767fec091ae3625f43919802a3ba55d185ef
ref/all_pops_1kgenomes_markersForPCA.bed 10948743 c97e9898fa175fc3cf9f20e1f7aac9d267822ad38c7a21169cffd150d55c63a0
ref/all_pops_1kgenomes_markersForPCA.bim 484892 ac89fec20d885873bb8b25cb2171b265818fdef5fbccdbd33f224788af1aa2e5
ref/all_pops_1kgenomes_markersForPCA.fam 62600 fbda960fb539b8091b6e661fe228b8c92e5d733c60aa425c61ef9e2239608f9d
EOF

# ---------------------------------------------------------------------------------------------
echo
if [ "$problems" -eq 0 ]; then
  echo "Ready: PLINK 1.9, R and its packages, git, curl and the data are in order."
  exit 0
fi
echo "$problems problem(s) found; see the [PROBLEM] lines above and setup.html#troubleshooting."
exit 1
