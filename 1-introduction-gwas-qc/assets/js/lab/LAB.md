# The Lecture 1 lab: terminal, files, charts and R console

The practical pages embed a lab: a terminal in which the reader types the practical's commands
(PLINK 1.9, GrafAnc and a small Unix shell) on a toy dataset, a panel showing the files those
commands write, chart helpers that widgets use to plot the files, and an optional R console (WebR)
that runs the practical's R code on the same files. Everything except the R console works offline
and from `file://`.

This file documents what page authors and widget authors may use. It covers the terminal, the
shell, the file system, the `Lab` API, the charts and the R console (files `lab.js`, `rlab.js` and
`../../css/lab.css`). The PLINK and GrafAnc emulators, the toy data and the data card are
documented in [CORE.md](CORE.md).

Contents: [Files and load order](#files-and-load-order) · [Markup](#markup) ·
[The reader's computer](#the-readers-computer) · [Commands](#commands) · [Keys](#keys-and-touch) ·
[Lab API](#the-lab-api) · [Charts](#charts-labplot) · [Widget example](#a-complete-widget) ·
[R console](#the-r-console) · [Contract changes](#changes-to-the-contract) · [Tests](#tests) ·
[Troubleshooting](#troubleshooting)

## Files and load order

Put these in the page's `<head>`, after the shared scripts (`site.js` and the rest of
`_template.html`), in this order:

```html
<link rel="stylesheet" href="assets/css/lab.css">
<script defer src="assets/js/lab/toy-data.js"></script>     <!-- window.TOY_FILES (CORE.md) -->
<script defer src="assets/js/lab/data-card.js"></script>    <!-- window.TOY_CARD (CORE.md) -->
<script defer src="assets/js/lab/plink-core.js"></script>   <!-- window.PlinkCore (CORE.md) -->
<script defer src="assets/js/lab/grafanc-core.js"></script> <!-- window.GrafAncCore (CORE.md) -->
<script defer src="assets/js/lab/lab.js"></script>          <!-- window.Lab, terminals, file panel, charts -->
<script defer src="assets/js/lab/rlab.js"></script>         <!-- R consoles; only on pages that have one -->
<!-- widget scripts that use Lab go after lab.js -->
<script defer src="assets/js/widgets/PAGEKEY-NAME.js"></script>
```

All are plain deferred scripts (no modules, no libraries). `lab.js` is about 300 kB (85 kB
compressed); `rlab.js` 18 kB. A page without a terminal or widget that uses the lab does not need
them. Every `div.lab` on the page is turned into a terminal when `lab.js` runs; every `div.rlab`
into an R console when `rlab.js` runs.

A working example of everything below is `_lab-test.html` (internal test page, not linked).

## Markup

### Terminal

```html
<div class="lab" id="lab-missing" data-title="Step 1 · missingness on the toy data">
<pre class="lab-setup">plink --bfile ${input_dir}/toy --geno 0.01 --make-bed --out ${analysis_dir}/toy.geno0.01</pre>
<pre class="lab-script">plink --bfile ${input_dir}/toy --missing --out ${analysis_dir}/toy
head ${analysis_dir}/toy.imiss
plink --bfile ${analysis_dir}/toy.geno0.01.mind0.01 \
      --extract ${analysis_dir}/toy.geno0.01.mind0.01.prune.in \
      --genome --out ${analysis_dir}/toy.geno0.01.mind0.01.LD0.3</pre>
</div>
```

| Part | Meaning |
|---|---|
| `div.lab` | One terminal. Give it an `id` (`lab-…`) so pages and tests can find it. |
| `data-title` | The text in the terminal's title bar. Default "Terminal". |
| `data-files` | Optional. `open` shows the file panel at start; a path (for example `${analysis_dir}/toy.geno0.01.bed`) shows the panel with that file open in the viewer. |
| `pre.lab-setup` | Optional. Commands that run silently when the page loads, before `Lab.ready`, to recreate the state left by earlier steps. They run in this terminal's session (a `cd` in them sets where the terminal starts). A one-line note above the terminal says they ran and expands to list them. A setup command that fails (exit code not 0, unless the line ends in `\|\| true`) marks the note "Setup failed", shows the output there and logs a console error, which the browser checks report. |
| `pre.lab-script` | Optional. The suggested commands, shown as numbered chips below the terminal. A click puts the command on the command line (the reader presses Enter or Run); **Run next** runs the first command not yet run. Chips get a check mark once their command has run in that terminal (typed or clicked). |

Writing `lab-setup` and `lab-script`:

- One command per line. A line ending in `\` continues on the next line. A multi-line `if … fi`,
  `for … done`, `while … done` or a quoted string that spans lines (the practical's `awk '{ … }'`)
  is kept together as one command. Blank lines and lines starting with `#` are skipped.
- Escape `<`, `>` and `&` in HTML (`&lt;`, `&gt;`, `&amp;`), as in any `pre`.
- Write commands exactly as the reader would type them on their own computer, with `toy` in place
  of `penncath` and the variables `${input_dir}`, `${reference_dir}` and `${analysis_dir}`.
- Without JavaScript the commands stay visible as plain text under the label "Lab terminal (needs
  JavaScript)".

### R console

```html
<div class="rlab" id="r-lmiss" data-title="Plot variant missingness in R" data-packages="data.table,ggplot2">
<pre class="lab-setup">plink --bfile ${input_dir}/toy --missing --out ${analysis_dir}/toy</pre>
<pre class="rlab-code">library(data.table)
library(ggplot2)
variant_miss &lt;- fread(file.path(analysis_dir, "toy.lmiss"))
ggplot(variant_miss, aes(x = F_MISS)) + geom_histogram(bins = 50)</pre>
</div>
```

| Part | Meaning |
|---|---|
| `div.rlab` | One R console: an editable code box, **Run in R**, **Copy code**, **Reset code**, and an output area (text and plots). |
| `data-title` | Title bar text. Default "R console". |
| `data-packages` | Comma-separated R packages installed before the first run. Default `data.table,dplyr,ggplot2,glue`. See [packages](#packages-and-the-tidyverse). |
| `data-width`, `data-height` | Optional size of R's plot device in pixels. By default plots are drawn at 80 % of the box width (at most 720 px wide on the page, height 0.64 × width) and shown 1.25 × larger, so R's text stays readable. |
| `pre.rlab-code` | The R code shown in the box. Escape `<` as `&lt;` (`variant_miss &lt;- fread(…)`). |
| `pre.lab-setup` | Optional shell commands run once (through `Lab.run`) before the first R run, so the files the code reads exist even if the reader skipped the terminal. |

Nothing is downloaded until the reader clicks **Run in R**. Details in [The R console](#the-r-console).

## The reader's computer

Each page has one in-memory file system and one shell. Every terminal on the page and every
`Lab.run` call use the same files and the same shell variables; each terminal keeps its own working
directory (like several terminal windows on one computer), and `Lab.run` always starts in
`~/statgen-workshop`. Commands from all terminals and `Lab.run` run one at a time, in the order
they were started. Command history (↑/↓, `history`) is shared by the page's terminals.

```
/home/student                                      $HOME (~)
└── statgen-workshop/                              where every terminal starts
    ├── data/inputs/penncath_withPheno/            $input_dir      toy.bed  toy.bim  toy.fam
    ├── data/inputs/ref/                           $reference_dir  toy_1kg.bed  toy_1kg.bim  toy_1kg.fam
    └── analysis/                                  $analysis_dir   outputs go here
/usr/local/bin/plink                               so that `which plink` works
/tmp/                                              scratch space
```

Variables at start: `HOME`, `USER=student`, `PWD`, `OLDPWD`, `PATH`, `SHELL`, `input_dir`,
`reference_dir`, `analysis_dir` (all exported). The prompt is `student@lab:~/statgen-workshop$`.
The layout mirrors the real setup (`~/statgen-workshop/data/inputs/penncath_withPheno/penncath.*`),
so lab commands and real commands differ only in the file prefix.

`git clone https://github.com/Illumina/akt.git` creates `akt/` with
`data/integrated_call_samples_v3.20130502.ALL.panel` (the toy panel). `git clone
https://github.com/jimmy-penn/grafanc.git` creates `grafanc/bin/grafanc` (runs the GrafAnc
emulator) and `grafanc/cpp/data/AncSnpPopAFs.txt.gz`; `gunzip` turns it into `AncSnpPopAFs.txt`.
Other repositories are refused with a note. Both clones also write a short README.md saying they
are stubs.

**Reset files** (in any terminal's title bar) puts back the files and shell variables as they were
when the page finished loading (after the setups) and sends every terminal back to its starting
directory. Nothing is kept when the page is reloaded.

Binary files (`.bed`, `.gz`) are kept as bytes; everything else as text. Sizes in `ls -l`, `du`
and the file panel are real byte counts.

## Commands

`help` in the terminal lists them and `help NAME` shows a command's options. Output follows GNU
coreutils and bash closely (column layout of `ls`, `wc` widths, `sort` key rules, error wording,
exit codes); options not listed print the real tool's "invalid option" error.

| Group | Commands |
|---|---|
| PLINK and GrafAnc | `plink` (PLINK 1.9 emulator, see CORE.md); `grafanc` and any path ending in `/grafanc` (GrafAnc emulator; reads `GRAFPATH` from exported variables); `git clone` (the two repositories above); `gunzip`, `gzip`, `zcat` |
| Files and folders | `ls [-l -h -a -A -1 -d -t -S -r -R -F]`, `cd` (`cd`, `cd -`, `cd ~`), `pwd`, `mkdir [-p]`, `rmdir`, `cp [-r]`, `mv`, `rm [-r -f]`, `touch`, `chmod` (only `+x` matters), `du [-s -h -a -c]`, `find PATH -name -type -maxdepth`, `tree [-L]`, `file` |
| Reading files | `cat [-n]`, `head`/`tail` (`-n N`, `-N`, `-n +N`, `-n -N`), `less` (prints the file), `wc [-l -w -c -m]`, `xxd [-l -s -c -g -b -p]`, `hexdump -C [-n]` |
| Text processing | `grep [-v -c -i -w -x -n -o -l -h -H -q -E -F -e -m]` (basic and extended regular expressions), `awk` (below), `sort [-n -g -h -V -r -u -f -b -s -t -k -o]`, `uniq [-c -d -u -i]`, `cut -f -d -s -c`, `tr [-d -s -c]`, `tee [-a]`, `seq` |
| Shell | `echo [-n -e]`, `printf`, `env`, `printenv`, `export`, `unset`, `set`, `which`, `type`, `command -v`, `history [-c]`, `clear`, `source`/`.`, `bash FILE`, `bash -c`, `test`/`[ ]`/`[[ ]]`, `read`, `sleep` (≤ 5 s), `true`, `false`, `exit`, `date`, `whoami`, `id`, `hostname`, `uname`, `basename`, `dirname`, `man` |
| Explained, not run | `module load …` (environment modules exist on HPC systems such as Biowulf; on your own computer you install PLINK once and it is on your PATH; here `plink` is already available), `sinteractive`, `sbatch`, `srun`, `squeue`, `salloc`, `swarm`, `scancel`, `sacct` (Slurm, explained), `Rscript`, `R` (point to the page's R console) |

Shell syntax: `'single'` and `"double"` quotes, `$'…'`, backslash escapes, `\` line continuation,
`#` comments, `;`, `&&`, `||`, pipes `|`, redirections `>`, `>>`, `<`, `2>`, `2>&1`, `&>`,
`/dev/null`, `$VAR`, `${VAR}`, `${VAR:-default}` and the other `${…}` forms, `$?`, `$#`, `$1…`,
`~`, globs `* ? […]`, `VAR=value`, `VAR=value command`, `export`, `$(command)`, backquotes,
`$((arithmetic))`, `if/elif/else/fi`, `for … in …; do … done`, `while`/`until`, `{ …; }`, `( … )`,
and scripts run with `bash FILE`, `./FILE` (after `chmod +x`) or `source FILE`. Not available:
job control (`&`, `fg`), here-documents, functions, `sed`, editors (`nano`, `vi`) and package
managers; each prints a short note saying what to use instead.

`awk` supports what the practical and typical QC one-liners need: patterns and ranges, `BEGIN`/`END`,
fields `$0 … $NF` (assignable), `NR`, `NF`, `FNR`, `FILENAME`, `FS` / `-F` (including tabs and
regular expressions), `OFS`, `ORS`, `-v`, `print` / `printf` (with `>` and `>>` to files),
variables, arrays (`in`, `delete`, `for (k in a)`), `if`/`while`/`for`/`do`/`break`/`continue`/
`next`/`exit`, user functions, and the built-ins `length`, `substr`, `index`, `split`, `sub`,
`gsub`, `match`, `sprintf`, `tolower`, `toupper`, `int`, `sqrt`, `exp`, `log`, `sin`, `cos`,
`atan2`, `rand`, `srand`. Numbers print with `%.6g` as in real awk.

**PLINK and GrafAnc output.** As in PLINK 1.9 (which writes errors and warnings with
`logerrprint()`, that is to `stderr`), the emulator's `Error:` and `Warning:` messages go to standard
error and everything else to standard output; so `2> file` captures the errors, `2>&1` merges them,
and a pipe such as `plink … | tail` still shows them. `GrafAncCore.run` always exits with 0 (upstream
GrafAnc 1.0.0 returns 1 on success and 0 on errors; the workshop's Docker build patches success to
0), so test for its output file rather than `$?`; all its console output, including its `ERROR:`
lines, goes to standard output except the option-parsing (getopt) messages, which go to standard
error.

Unknown commands print `bash: NAME: command not found` (exit 127), with a note when there is
something useful to say (for example `sed`, `nano`, `apt-get`, `sudo`, `docker`). Lab notes are
shown in grey italics and are never part of a command's output (`Lab.run`'s `stdout` does not
contain them, and redirecting stderr to a file drops them).

### What the terminal shows

Standard output in white; standard error in red, except warnings (a line starting `Warning`, and
the lines that continue it, as PLINK wraps long warnings) in yellow; lines of standard output
starting `Error:` red and `Warning:` yellow; `ls` colours directories blue and programs green; lab
notes grey italic. Long output lines scroll sideways, so PLINK's columns stay aligned; notes and
error messages wrap. One command shows at most about 400 kB of output (then a note suggests
`head`, `grep` or a redirect); the scrollback keeps the last 1.5 MB.

While `plink` or `grafanc` runs, the prompt is replaced by "running plink…".

### File panel

**Show files** opens a tree of `~` (and `/tmp` when it has files) with sizes. Files written by the
last command flash yellow. Click a file to view it:

- text files: the first 300 lines, in monospace, scrolling sideways;
- `.bed` files: the three-byte header `6c 1b 01` (the magic number `6c 1b`, then `01` for
  variant-major order), a size check
  (3 + variants × ⌈people / 4⌉ bytes), the first variant's first two bytes drawn as 2-bit codes
  and the first eight people's genotypes decoded with their alleles from the `.bim` (00 homozygous
  A1, 01 missing, 10 heterozygous, 11 homozygous A2), and a hex dump;
- other binary files (`.gz`): a hex dump and what the file is.

Every file has a **Download** button (a Blob URL, so it works from `file://`).

## Keys and touch

| Key | Action |
|---|---|
| Enter | Run the command. If it is unfinished (open quote, trailing `\`, `if` without `fi`) a new line is added instead, like bash's `>` prompt. |
| Shift+Enter | New line in the command. |
| ↑ / ↓ | Earlier / later commands (when the cursor is on the first / last line). |
| Tab | Complete a command name, a path (also after `${analysis_dir}/` and `~/`) or a `$variable`; when several names fit, list them. With an empty command line, Tab moves to the next control. |
| Esc, then Tab | Leave the terminal with the keyboard while a command is typed. |
| Ctrl-C | Stop: cancels the typed line (bash prints `^C`), or stops a running script between commands. |
| Ctrl-L | Clear the screen (same as `clear`). |
| Ctrl-U | Delete from the start of the line to the cursor. |
| Paste | A paste with several lines runs each complete command in order; an unfinished last line stays on the command line. |

The **Run** button next to the command line does what Enter does (for touch screens). On touch
devices, chips put the command on the line without opening the keyboard. Clicking the output (not
selecting text) moves the cursor to the command line. The output is a `role="log"` live region; all
buttons are real buttons with labels; the layout fits a 375 px screen.

## The Lab API

`window.Lab` exists as soon as `lab.js` has run. Widget scripts load after `lab.js` and wait for
`Lab.ready` before reading files.

### `Lab.ready`

A Promise resolved with `Lab` when the toy files are in the file system **and** every terminal's
`lab-setup` on the page has run. The `lab:ready` event fires on `document` at the same time.

```js
Lab.ready.then(function () { drawMyPlot(); });
```

### `Lab.fs`

Paths may be absolute, relative to `~/statgen-workshop`, or use `~`, `$VAR` and `${VAR}` with the
shell's variables (`"${analysis_dir}/toy.lmiss"`).

| Function | Returns |
|---|---|
| `read(path)` | the file's content: a string for text, a `Uint8Array` for `.bed` and `.gz`; `null` if missing |
| `readText(path)` / `readBytes(path)` | always a string / always a `Uint8Array` (`null` if missing) |
| `exists(path)`, `isFile(path)`, `isDir(path)` | `true` / `false` |
| `list(dir)` | sorted names in the directory, or `null` |
| `walk(dir)` | absolute paths of every file below `dir` |
| `size(path)` | bytes (a directory: the total of its files), or `null` |
| `write(path, data)` / `append(path, data)` | writes a string or `Uint8Array` (creating parent folders); fires `lab:fs-change` |
| `mkdir(path)` | creates the folder and its parents |
| `remove(path [, recursive=true])` | removes a file or folder; `false` if it was missing |
| `resolve(path)` | the absolute path |
| `download(path)` | offers the file as a download |

### `Lab.run(commandLine [, options])`

Runs a command line in the page's shell without a terminal and resolves to
`{code, stdout, stderr, outputs}`: the exit code, standard output, standard error (with lab notes),
and the absolute paths written or removed. It starts in `~/statgen-workshop`; a `cd` in it does not
move any terminal. Variables it sets stay set for the page. It waits for the page's other commands.

```js
Lab.run("plink --bfile ${input_dir}/toy --missing --out ${analysis_dir}/toy").then(function (res) {
  if (res.code !== 0) showError(res.stderr);   // PLINK writes its errors to stderr, as the real one does
});
```

Options: `cwd` (start directory), `onOutput(text, kind)` (streamed output; kind is `out`, `err`,
`info` or `note`), `onLong(name)` (called before `plink`/`grafanc` start), `columns` (width for
`ls`, default 100).

### `Lab.readTable(path [, options])`

Parses a whitespace-aligned PLINK table (or any whitespace-separated text file) and returns `null`
if the file does not exist. Throws for binary files.

```js
var t = Lab.readTable("${analysis_dir}/toy.lmiss");
t.header             // ["CHR", "SNP", "N_MISS", "N_GENO", "F_MISS"]
t.n                  // number of rows
t.rows[0]            // [1, "rs1000", 2, 120, 0.01667]
t.col("F_MISS")      // [0.01667, 0, …] (numbers); t.col(4) works too
t.objects()          // [{CHR: 1, SNP: "rs1000", …}, …]
t.numeric            // [true, false, true, true, true]
```

Columns where every value is a number (or `NA`, `nan`) become numbers; `NA`, `nan`, `NaN`, `-nan`
become `NaN`. Header detection follows R's `fread`: files PLINK writes without a header (`.fam`,
`.bim`, `.eigenvec`, `.eigenval`, `.prune.in`, `.prune.out`, `.missnp`, `.irem`, `.nosex`) get
`V1`, `V2`, …, so `t.col("V3")` is PC1 of an `.eigenvec`, as in the practical's R code
(`rename(PC1 = V3, PC2 = V4)`). Options: `header` (`true`, `false`, `"auto"`), `names` (array that
renames columns), `sep` (a string or RegExp instead of whitespace), `comment` (skip lines starting
with it). `Lab.parseTable(text, options)` does the same on a string.

With `sep` (for example `/\t/` for GrafAnc's tab-separated `toy_grafanc_out.txt`), each line is split
on the separator and every cell is trimmed, as R's `fread` does: GrafAnc pads its percentages
(`" 96.45"`), and they come back as numbers. An empty cell counts as `NA` (`NaN`) in a numeric column
and stays `""` in a text column; a leading or trailing tab marks an empty first or last field.

```js
var ga = Lab.parseTable(Lab.fs.readText("${analysis_dir}/toy_grafanc_out.txt"), { header: true, sep: /\t/ });
ga.col("Pe")         // [0, 96.45, 96.08, …] (numbers)
ga.col("Sample")[0]  // '"80001_1"' (PLINK keeps the quotes the practical's awk step puts in the IDs)
```

### Events

```js
document.addEventListener("lab:fs-change", function (e) {
  e.detail.paths    // absolute paths written or removed by one command (or by Reset)
  e.detail.source   // "terminal", "run" (Lab.run), "setup", "reset" or "api" (Lab.fs.write …)
  e.detail.command  // the command line, or null
});
document.addEventListener("lab:ready", function () { … });
```

### Other members

| Member | Meaning |
|---|---|
| `Lab.paths` | `{home, project, input_dir, reference_dir, analysis_dir}` (absolute) |
| `Lab.vars.get(name)`, `Lab.vars.set(name, value)`, `Lab.vars.all()` | the page's shell variables (`set` exports) |
| `Lab.terminals` | the page's terminal objects (each has `run(cmd)`, `runNext()`, `files.show(true)`, `files.view(path)`) |
| `Lab.history` | the commands typed in the page's terminals |
| `Lab.mount(el)` | turn a `div.lab` added after page load into a terminal (its setup runs at once) |
| `Lab.reset()` | what the Reset files button does; resolves to the restored paths |
| `Lab.plot` | the chart helpers below |
| `Lab.core` | the DOM-free core (`VFS`, `Shell`, `parseTable`, `runAwk`, `splitCommands`, …) for tests |
| `Lab.version` | `"1.0"` |

## Charts: `Lab.plot`

Small SVG charts in the site's style. Each draws at the pixel width of its container (so text
stays at 10–13 px on a phone), redraws when the container is resized, and returns a handle with
`update(data [, options])`, `destroy()` and `svg`. All charts take `xLabel`, `yLabel`, `title`,
`height` (px, or a function of the width), `note` (text under the chart) and `ariaLabel` (the
default describes the data); the SVG has `role="img"`. Colours come from the site tokens
(`--q1` … `--q8` for groups). `el` is an element or a CSS selector; its content is replaced.

### `Lab.plot.histogram(el, values, options)`

```js
var hist = Lab.plot.histogram("#w-miss-plot", t.col("F_MISS"), {
  bins: 40, xLabel: "F_MISS", unit: "variants",
  threshold: { value: 0.01, min: 0, max: 0.2, step: 0.005, label: "--geno", direction: "above", verb: "would be removed" },
  onThreshold: function (value, info) { /* info.count, info.total, info.fraction */ }
});
```

| Option | Meaning |
|---|---|
| `bins` / `binWidth` | number of equal bins (default 30) or their width |
| `domain` | `[min, max]` of the x axis (default: the data's range); values outside are counted in a note |
| `log` / `logX` / `logY` | `logX: true` (or `log: "x"`) bins log₁₀ of the values, with ticks at powers of ten (values ≤ 0 are left out and counted); `logY: true` (or `log: "y"`) uses a log scale for the counts |
| `threshold` | a number or `{value, min, max, step, label, direction, verb, format}`. Draws a red line the reader drags (mouse or touch) plus a labelled slider for the keyboard, colours the bars beyond it, and shows a readout "F_MISS > 0.01: 147 of 400 variants (36.8%) would be removed". `direction`: `"above"` (default, counts values > threshold) or `"below"` (counts values < threshold, e.g. HWE p-values). With `logX` the slider moves in log space. |
| `onThreshold(value, info)` | called when the threshold moves |
| `unit` | the word after the counts (default "values") |
| `lines` | fixed vertical lines: `[{x: 0.5, label: "mean + 3 SD"}]` |
| `key` | when values are objects, the property to plot |

Handle: `setThreshold(v)`, `getThreshold()`, `countBeyond(v)`, `update(values, options)`.
Missing values (`NaN`, `null`, `"NA"`) are skipped and counted in the note.

### `Lab.plot.scatter(el, points, options)`

```js
Lab.plot.scatter("#w-pca", pcs.rows.map(function (r) {
  return { x: r[2], y: r[3], group: superPop[r[1]] || "toy study", label: r[0] + " " + r[1] };
}), { xLabel: "PC1", yLabel: "PC2", equal: true, highlight: "toy study", legendTitle: "Super-population" });
```

Points are `{x, y, group, label}` objects or `[x, y, group, label]` arrays (other property names
with `xKey`, `yKey`, `groupKey`, `labelKey`).

| Option | Meaning |
|---|---|
| `groups` | group order (others follow in order of appearance); colours `--q1`, `--q2`, … in that order |
| `colors` | `{group: "css color"}` overrides |
| `legend` | `true`/`false` (default: shown when there is a named group). The legend's buttons hide and show groups. `legendTitle` labels it. |
| `highlight` | a group name or array drawn on top with larger, outlined points |
| `equal` | the same scale on both axes (for PCA: distances on the plot are true distances) |
| `refLines` | `[{x: 0}, {y: 0.1875, label: "PI_HAT = 0.1875"}, {slope: 1, intercept: 0}, {identity: true}]`; `{…, extend: false}` keeps the line from widening the axes; `color`, `dash: false` |
| `xDomain`, `yDomain` | fixed axis ranges |
| `r`, `opacity` | point radius (default 2.2–3.8 by number of points) and fill opacity |
| `tooltip(point)` | text shown on hover or tap (default: label, coordinates, group) |

Hover (mouse) or tap (touch) shows the nearest point's label. More than 3,000 points are drawn once
per pixel to keep the page fast.

### `Lab.plot.qq(el, pvalues, options)`

Q–Q plot of −log₁₀ p-values: observed against expected, where the expected value of the *i*-th
smallest of *n* p-values is −log₁₀((*i* − 0.5)/*n*), with the line *y* = *x*.

```js
Lab.plot.qq("#w-hwe-qq", rows.map(function (r) { return r.P; }), {
  labels: rows.map(function (r) { return r.SNP; }),
  refLines: [{ y: 8, label: "p = 1e-8 (--hwe)" }]
});
```

Options: `labels` (array parallel to the p-values, shown on hover), `refLines` (as for scatter;
horizontal lines widen the y axis so a threshold is visible even when no point reaches it),
`identityLabel`, `key` (when p-values are objects), plus the scatter options. P-values that are
missing or outside [0, 1] are skipped and counted; p = 0 is drawn at the smallest positive number.

### `Lab.plot.bar(el, data, options)`

```js
Lab.plot.bar("#w-removed", [["--geno 0.01", 147], ["--mind 0.01", 17], ["HWE p < 1e-8", 3]], { xLabel: "Removed" });
```

`data`: `[[label, value], …]`, `[{label, value, color}, …]` or `{label: value}`. Options:
`horizontal` (default: automatic, horizontal when labels are long or the box is narrow), `format(v)`,
`max`, `sort` (`"asc"`/`"desc"`), `color`. Values are printed at the bar ends.

`Lab.plot.color(i)` gives the i-th group colour, `Lab.plot.format(v)` the number format the charts
use (3 significant digits, e-notation below 0.001).

## A complete widget

```html
<div class="widget" id="w-geno">
  <div class="widget-head"><span class="badge">Interactive</span><span class="wtitle">How many variants does --geno remove? (toy data)</span></div>
  <div class="widget-body">
    <div class="controls">
      <button type="button" class="btn primary" id="w-geno-run">Run plink --missing</button>
      <span class="note" id="w-geno-status">Waiting for the lab…</span>
    </div>
    <div id="w-geno-plot"></div>
  </div>
</div>
```

```js
/* assets/js/widgets/qc-missingness-geno.js — loaded after lab.js */
(function () {
  "use strict";
  if (!window.Lab) return;
  var status = document.getElementById("w-geno-status");
  var hist = null;

  function draw() {
    var t = Lab.readTable("${analysis_dir}/toy.lmiss");
    if (!t) { status.textContent = "Run step 1 (plink --missing) in the terminal, or press the button."; return; }
    status.textContent = t.n + " variants in toy.lmiss.";
    if (hist) { hist.update(t.col("F_MISS")); return; }
    hist = Lab.plot.histogram("#w-geno-plot", t.col("F_MISS"), {
      bins: 40, xLabel: "F_MISS", unit: "variants",
      threshold: { value: 0.01, min: 0, max: 0.1, step: 0.005, label: "--geno", verb: "would be removed" }
    });
  }
  document.getElementById("w-geno-run").addEventListener("click", function () {
    status.textContent = "Running plink --missing…";
    Lab.run("plink --bfile ${input_dir}/toy --missing --out ${analysis_dir}/toy");   // lab:fs-change redraws
  });
  document.addEventListener("lab:fs-change", function (e) {
    if (e.detail.paths.some(function (p) { return /\/toy\.lmiss$/.test(p); })) draw();
  });
  Lab.ready.then(draw);
})();
```

A widget that only plots files should not run PLINK at page load; it waits for the reader (or a
`lab-setup` on the page) to create the file and redraws on `lab:fs-change`.

## The R console

`rlab.js` turns each `div.rlab` into an editable code box. On the first click of **Run in R**:

1. `rlab.js` imports WebR 0.6.0 (R 4.6.0 compiled to WebAssembly) from
   `https://webr.r-wasm.org/v0.6.0/webr.mjs` and starts it in a web worker;
2. installs the block's packages from `https://repo.r-wasm.org` (with progress in the box);
3. runs the block's `lab-setup` commands, if any;
4. copies every file under `/home/student` from the lab into R's file system at the same paths;
5. defines `input_dir`, `reference_dir` and `analysis_dir` and sets the working directory to
   `/home/student/statgen-workshop`;
6. runs the code as R would at the console (values print, as with autoprint), and shows the
   output, messages (brown), warnings, errors (red) and plots.

Later runs, in any block of the page, reuse the same R session (variables persist between blocks,
as in one R session) and copy only the files that changed since the last run (files removed in
the lab are removed in R too). A run waits for the one before it. Ctrl+Enter (Cmd+Enter) in the
code box runs it. `window.RLab` exposes `mount(el)`, `start()`, `sync()` and `webR` for tests.

**Measured** (Chrome, 2026-11-08, bytes transferred on a fast connection): R itself 14.3 MB from
webr.r-wasm.org; the four default packages with their dependencies 23.6 MB from repo.r-wasm.org
(ggplot2 alone 7.5 MB, data.table 2.4 MB, the repository index 1.5 MB). The first run took 7–10 s
including the downloads; later runs about 1 s. Slow connections and older phones take much longer;
the box says so after 20 s and gives up after 3 minutes.

### Packages and the tidyverse

The default packages are `data.table`, `dplyr`, `ggplot2` and `glue`: everything the practical's R
code uses. The practical's `01_qc.Rmd` starts with `library(tidyverse)`. The tidyverse metapackage
**is** available for WebR 0.6.0 and loads (tested: `library(tidyverse)` attaches dplyr, readr,
forcats, stringr, ggplot2, tibble, lubridate, tidyr and purrr), but with its dependencies it is a
76 MB download (stringi alone is 14 MB). So write R blocks with `library(dplyr)` and
`library(ggplot2)`. If a reader's code calls `library(tidyverse)` in a block that does not list it,
the console explains this and offers a button to download the tidyverse and run again; a block
can also list it in `data-packages` (the hint then quotes 76 MB).

### Limits

- Files go one way: R reads the lab's files, but files R writes (`fwrite`, `ggsave`) stay in R and
  do not appear in the terminal or the file panel.
- A running R command cannot be stopped (WebR uses its PostMessage channel because the site is not
  cross-origin isolated; WebR logs a console warning about it when R starts).
- Plots are images (canvas), drawn by R's WebR graphics device; there is no interactive graphics.
- The first run needs the network. From `file://` it works in Chrome (tested); other browsers may
  refuse to load the module into a page opened from a file. When R cannot be loaded or started,
  the box says why and tells the reader to copy the code into R or RStudio on their own computer;
  the rest of the lab keeps working.
- Each page starts a fresh R session; nothing is kept across pages or reloads.

## Changes to the contract

All backward compatible with `lab-contract.md`:

- `Lab.ready` resolves after the toy files are loaded **and** every `lab-setup` on the page has run
  (so widgets can read the files the setups create). A `lab:ready` event fires too.
- `Lab.run` resolves to `{code, stdout, stderr, outputs}` (`stderr` added) and takes an optional
  second argument (`cwd`, `onOutput`, `onLong`, `columns`); it always starts in `~/statgen-workshop`.
- `lab:fs-change` details also carry `source` and `command`.
- In `lab-script` and `lab-setup`, multi-line `if`/`for`/`while` blocks and quoted strings spanning
  lines are one command (needed for the practical's `awk` and GrafAnc install chunks).
- Terminals share files, variables and history; each keeps its own working directory.
- Added: `data-files` on `div.lab`; `pre.lab-setup`, `data-width` and `data-height` in `div.rlab`;
  `Lab.fs.readText/readBytes/isFile/isDir/walk/append/resolve/download`; `Lab.parseTable`,
  `Lab.vars`, `Lab.paths`, `Lab.mount`, `Lab.reset`, `Lab.terminals`, `Lab.history`, `Lab.core`;
  `Lab.plot.qq` and `Lab.plot.bar` options as above; `window.RLab`.
- The emulators' `io` object also has `argv0` (the program path as typed, after expansion, for
  example `/home/student/statgen-workshop/analysis/grafanc/bin/grafanc`; GrafAnc looks for
  `AncSnpPopAFs.txt` relative to it), `remove(path)` (deletes a file and returns `true`, or `false`
  when there is no such file; reported in `lab:fs-change` like a write; PLINK uses it to delete a
  stale `<out>-merge.fam` after a successful `--bmerge`), `list(path)`, `cwd` and `env`; and
  `print(line, "stderr")` writes the line to the command's standard error (`print(line)` to standard
  output).

## Tests

- **Node** (the shell without a browser): `require("…/assets/js/lab/lab.js")` returns the core
  (`VFS`, `Shell`, `seedFS`, `parseTable`, `splitCommands`, …). Seed a file system with
  `seedFS(fs, TOY_FILES)` and run commands with
  `new Shell({fs, files: TOY_FILES, plink: () => PlinkCore, grafanc: () => GrafAncCore}).run(cmd, {out})`.
- **Browser**: `_lab-test.html` has a terminal whose suggestions run steps 1–8 of the practical,
  a terminal with a setup, a widget using `Lab.run`, `Lab.readTable` and all four chart types,
  and an R console. Run the whole practical in headless Chrome with
  `node 1-introduction-gwas-qc/tools/browser_check.mjs --out "$SCRATCH/qa" --urls http://127.0.0.1:8765/1-introduction-gwas-qc/_lab-test.html --eval "const T = Lab.terminals[0]; while (T.nextSuggestion()) await T.runNext(); return T.suggestions.filter(s => s.done).length" --shots ".lab, .widget"`.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| The `div.lab` shows its commands as plain text under "Lab terminal (needs JavaScript)" | `lab.js` did not load or threw: check the script tag's path and the console. |
| The terminal says the toy data or the PLINK emulator did not load | `toy-data.js` or `plink-core.js` is missing or loads after `lab.js`; keep the order above. |
| "Setup failed" above a terminal | A `lab-setup` command exited with an error; expand the note to see PLINK's message (often a wrong prefix or a step missing before it). |
| A widget reads `null` | The file does not exist yet: wait for `Lab.ready`, and redraw on `lab:fs-change`. |
| A widget never redraws | It listens before `lab.js` loaded (`window.Lab` undefined): load the widget after `lab.js`. |
| `cut -f2` prints whole lines | PLINK aligns columns with spaces, not tabs; use `awk '{print $2}'` (the terminal says so too). |
| `check_links.py` reports a missing file in `assets/index.html` | A quoted string ending in `.js`, `.html`, `.css` … in a lab script is read as a link; avoid such literals in comments. |
| The R console fails at once | No network, or a browser that blocks loading WebR (some do from `file://`); the box shows the reason. Run the code in your own R. |
| An R block cannot find a file | The file is created by a command the reader has not run: add that command as a `pre.lab-setup` in the `div.rlab`. |
