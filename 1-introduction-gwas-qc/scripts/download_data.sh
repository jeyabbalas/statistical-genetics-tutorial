#!/usr/bin/env bash
# download_data.sh: download the practical's six input files from the workshop's Google Drive
# folder into the folder layout of setup.html, and check the size and SHA-256 checksum of each.
#
# Written for "Statistical genetics, Lecture 1", page "Set up your computer" (setup.html#data).
# The files are the DCEG Statistical Genetics Workshop's Session 1 data (PennCATH and a 1000
# Genomes reference panel); this script only fetches them from the workshop's shared folder:
# https://drive.google.com/drive/folders/1kVJH4tM8R8O0hITnvifCV-hoai-Mgn-b
#
# Usage:   bash download_data.sh           download the files that are missing or wrong, then check
#          bash download_data.sh --check   only check the files that are already there
#
# Folder:  STATGEN_DIR (default ~/statgen-workshop). The files go to
#          STATGEN_DIR/data/inputs/penncath_withPheno/ and STATGEN_DIR/data/inputs/ref/.
# Needs:   curl, or gdown (pip install gdown) as a fallback; about 340 MB of free disk.
#
# An interrupted download is kept as FILE.part and resumed on the next run. A file is moved to its
# final name only after its size and checksum match the values below, which come from the
# workshop's files as downloaded in November 2026.

set -euo pipefail

STATGEN_DIR="${STATGEN_DIR:-$HOME/statgen-workshop}"
inputs="$STATGEN_DIR/data/inputs"

check_only=0
case "${1:-}" in
  --check) check_only=1 ;;
  "") ;;
  *) echo "Usage: bash download_data.sh [--check]"; exit 2 ;;
esac

have()   { command -v "$1" >/dev/null 2>&1; }
nbytes() { wc -c < "$1" | tr -d ' '; }
sha256() {
  if have sha256sum; then sha256sum "$1" | cut -d ' ' -f 1
  else shasum -a 256 "$1" | cut -d ' ' -f 1
  fi
}
# True if the file starts like a web page: Google Drive answers with one when a download is refused.
is_html() { LC_ALL=C head -c 512 "$1" 2>/dev/null | grep -qi -e '<html' -e '<!doctype'; }
# 0 if FILE has SIZE bytes and SHA-256 SUM.
matches() { [ -f "$1" ] && [ "$(nbytes "$1")" = "$2" ] && [ "$(sha256 "$1")" = "$3" ]; }

fetch_curl() {   # Drive file id, destination
  have curl || return 1
  curl -fL --retry 3 --retry-delay 5 -C - -o "$2" \
    "https://drive.usercontent.google.com/download?id=$1&export=download&confirm=t" </dev/null
}
fetch_gdown() {  # Drive file id, destination
  have gdown || return 1
  gdown "$1" -O "$2" </dev/null
}

get_one() {      # relative path, bytes, sha256, Drive file id
  local rel="$1" size="$2" sum="$3" id="$4"
  local dest="$inputs/$rel" part="$inputs/$rel.part" attempt
  mkdir -p "$(dirname "$dest")"
  if matches "$dest" "$size" "$sum"; then echo "[ok]      $rel"; return 0; fi
  if [ "$check_only" -eq 1 ]; then
    if [ -f "$dest" ]; then echo "[wrong]   $rel: $(nbytes "$dest") bytes or checksum differs (expected $size bytes)"
    else echo "[missing] $rel"
    fi
    return 1
  fi
  # A wrong or partial copy under the final name becomes the .part file, so curl can resume it.
  if [ -f "$dest" ]; then mv -f "$dest" "$part"; fi
  for attempt in 1 2; do
    if [ -f "$part" ] && { is_html "$part" || [ "$(nbytes "$part")" -gt "$size" ]; }; then rm -f "$part"; fi
    echo "Downloading $rel ($size bytes), attempt $attempt"
    if [ "$attempt" -eq 1 ]; then fetch_curl "$id" "$part" || fetch_gdown "$id" "$part" || true
    else fetch_gdown "$id" "$part" || fetch_curl "$id" "$part" || true
    fi
    if matches "$part" "$size" "$sum"; then mv -f "$part" "$dest"; echo "[ok]      $rel"; return 0; fi
    if [ -f "$part" ] && is_html "$part"; then
      echo "  Google Drive sent a web page instead of the file. This happens when a shared file has"
      echo "  been downloaded many times in one day; try again later, or download it in a browser."
    fi
    # A complete file with the wrong checksum cannot be repaired by resuming: start again.
    if [ -f "$part" ] && [ "$(nbytes "$part")" -ge "$size" ]; then rm -f "$part"; fi
  done
  echo "[FAILED]  $rel; download it in a browser from the shared folder (setup.html#data)"
  return 1
}

if ! have curl && ! have gdown && [ "$check_only" -eq 0 ]; then
  echo "Neither curl nor gdown is installed; install curl (setup.html#git) or download in a browser."
  exit 1
fi

failed=0
# relative path                                bytes      SHA-256                                                           Google Drive file id
while read -r rel size sum id; do
  [ -z "$rel" ] && continue
  get_one "$rel" "$size" "$sum" "$id" || failed=$((failed + 1))
done <<'EOF'
penncath_withPheno/penncath.bed 302377026 b98881c0a0f5218ab059813ccf1d0a2ce1dbc624162fbbd5726a989b7c5fc09e 1BzzNvW6kpRCgBoMqb-XTaEioTeWhPX6E
penncath_withPheno/penncath.bim 24051506 7a3a31ed769d183d4d5d9a3b195f0dcd5f536b326069ceb773c24fe6df088ed7 1nkCwwWpIkYvmYGdQM1K6PfErHXEyHlYH
penncath_withPheno/penncath.fam 25686 33c244871b843eded61506751ce3767fec091ae3625f43919802a3ba55d185ef 1Ti4I_QuuQje1ZG1uZ9yx1HOq5dmHmkr1
ref/all_pops_1kgenomes_markersForPCA.bed 10948743 c97e9898fa175fc3cf9f20e1f7aac9d267822ad38c7a21169cffd150d55c63a0 1xljnuC31_NAJ4ROlNizMJbw0BW27GQvq
ref/all_pops_1kgenomes_markersForPCA.bim 484892 ac89fec20d885873bb8b25cb2171b265818fdef5fbccdbd33f224788af1aa2e5 1VOAxnOkweda76YqRI13UPt26f-IA8zyn
ref/all_pops_1kgenomes_markersForPCA.fam 62600 fbda960fb539b8091b6e661fe228b8c92e5d733c60aa425c61ef9e2239608f9d 1zpDNUDUDIpcQU9SDiFsBwbAI2SiVs2d7
EOF

echo
if [ "$failed" -eq 0 ]; then
  echo "All six files are present and match their checksums, in $inputs"
else
  echo "$failed file(s) missing or wrong."
  exit 1
fi
