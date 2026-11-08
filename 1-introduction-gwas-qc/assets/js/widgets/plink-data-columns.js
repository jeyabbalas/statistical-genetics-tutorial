/* plink-data-columns.js — "Explore the columns of penncath.fam and penncath.bim"
   Shows real lines of the practical's .fam and .bim files. Hovering, focusing or tapping a cell shows what its
   column means (PLINK 1.9 file-format specification), which values the column allows, and what this
   particular value says. All counts quoted (people per code, SNP genotype counts, missing calls) were computed
   from the real files for this lecture: penncath.fam (1,401 lines) and penncath.bim/.bed (861,473 SNPs).
   No formulas; allele frequency = (2 × n(A1/A1) + n(A1/A2)) / (2 × number of people with a call). */
(function () {
  "use strict";
  var root = document.getElementById("w-columns");
  if (!root) return;
  var body = root.querySelector(".widget-body");
  if (!body) return;

  var FAM_COLS = [
    { name: "Family ID (FID)", what: "The family the person belongs to. PLINK identifies a person by the pair (FID, IID).",
      allowed: "Any text without spaces or tabs." },
    { name: "Individual ID (IID)", what: "The person's ID within the family.",
      allowed: "Any text without spaces; it cannot be 0. The pair (FID, IID) must be unique in the file." },
    { name: "Father (IID)", what: "The individual ID of the person's father, if he is in the same file and family.",
      allowed: "An IID in the same family, or 0 if the father is not in the file." },
    { name: "Mother (IID)", what: "The individual ID of the person's mother, if she is in the same file and family.",
      allowed: "An IID in the same family, or 0 if the mother is not in the file." },
    { name: "Sex", what: "The recorded sex, used by PLINK for the X and Y chromosomes and by sex checks.",
      allowed: "1 = male, 2 = female, 0 = unknown." },
    { name: "Phenotype", what: "One trait value per person. PLINK uses it when a command needs cases and controls (for example, the AFF and UNAFF rows of --hardy).",
      allowed: "Case–control: 1 = control, 2 = case, −9 or 0 = missing. Any other number makes PLINK treat the whole column as a quantitative trait, with −9 still meaning missing." }
  ];
  var BIM_COLS = [
    { name: "Chromosome", what: "The chromosome the variant is on.",
      allowed: "1–22, X, Y, XY (the pseudoautosomal region), MT, or 0 for unknown. PLINK 1.9 writes X, Y, XY and MT as 23, 24, 25 and 26 unless --output-chr says otherwise." },
    { name: "Variant ID", what: "The variant's name, here its dbSNP rsID. Commands such as --extract and --exclude find variants by this ID.",
      allowed: "Any text without spaces; it should be unique in the file." },
    { name: "Genetic position", what: "The position on the genetic map in morgans or centimorgans.",
      allowed: "A number; 0 means not given, and PLINK accepts 0 everywhere." },
    { name: "Base-pair position", what: "The 1-based coordinate on the chromosome, on the genome build the file was made with (GRCh37 here).",
      allowed: "A 1-based integer of at most 2,147,483,646; PLINK ignores variants with negative positions." },
    { name: "Allele 1 (A1)", what: "The allele whose copies the .bed codes count (code 00 = two copies). PLINK 1.9 makes it the minor (less frequent) allele each time it writes a fileset, unless --keep-allele-order is given.",
      allowed: "One or more letters; a placeholder when only one allele was seen (this file uses −9; PLINK 1.9 itself writes 0)." },
    { name: "Allele 2 (A2)", what: "The other allele; code 11 means two copies of it. Usually the major (more frequent) allele.",
      allowed: "One or more letters; a placeholder when no allele was seen at all." }
  ];

  var FAM_ROWS = [
    { line: 1, cells: ['"10002"', "1", "0", "0", "1", "1"] },
    { line: 2, cells: ['"10004"', "1", "0", "0", "2", "1"] },
    { line: 3, cells: ['"10005"', "1", "0", "0", "1", "2"] },
    { line: 4, cells: ['"10007"', "1", "0", "0", "1", "1"] },
    { line: 10, cells: ['"10013"', "1", "0", "0", "2", "-9"] },
    { line: 1401, cells: ['"11596"', "1", "0", "0", "1", "-9"] }
  ];
  var BIM_ROWS = [
    { line: 1, cells: ["1", "rs10458597", "0", "564621", "-9", "C"],
      snp: "Only C was seen: 1,398 people are C/C and 3 have no call, so A1 is the placeholder −9. A SNP with one observed allele (monomorphic in these people) carries no information for association or QC statistics." },
    { line: 2, cells: ["1", "rs12565286", "0", "721290", "G", "C"],
      snp: "1,247 people are C/C, 131 G/C and 6 G/G; 17 have no call. The frequency of A1 (G) is (2 × 6 + 131) / (2 × 1,384) = 0.052, so G is the minor allele, as PLINK 1.9 arranges." },
    { line: 4, cells: ["1", "rs3094315", "0", "752566", "C", "T"],
      snp: "Ensembl's GRCh37 record lists this SNP as G/A on the forward strand. penncath.bim gives the complementary letters, C and T: the array reports this SNP on the other strand. Step 7 of the practical deals with such differences." },
    { line: 6, cells: ["1", "rs11240776", "0", "765269", "G", "A"],
      snp: "132 of the 1,401 people (9.4%) have no call at this SNP, far above the practical's 1% limit: step 1 (--geno 0.01) removes it." },
    { line: 7, cells: ["1", "rs2980319", "0", "777122", "A", "T"],
      snp: "A and T are complementary bases, so this SNP reads A/T on both strands: its letters cannot show which strand they are on (a strand-ambiguous SNP). 128,999 of the file's 861,473 SNPs are A/T or C/G." },
    { line: 35786, cells: ["1", "rs9428247", "0", "118920492", "-9", "-9"],
      snp: "No one has a genotype call here (all 1,401 are missing), so neither allele is known and both columns hold the placeholder." },
    { line: 861473, cells: ["22", "rs28729663", "0", "51219006", "A", "G"],
      snp: "The last line of the file: 1,037 G/G, 336 A/G, 24 A/A and 4 missing; A1 (A) has frequency 0.137." }
  ];

  function famValueNote(c, v, row) {
    if (c === 0) return "This person's PennCATH study number. The quotation marks are stored in the file and are part of the ID as PLINK reads it. All 1,401 FIDs are different, so here the FID alone identifies a person.";
    if (c === 1) return "Every IID in penncath.fam is 1, so the IID alone identifies nobody. GrafAnc (step 8) needs unique IIDs, so the practical rewrites them as FID_IID, for example \"10002_1\", with --update-ids.";
    if (c === 2 || c === 3) return "0 for all 1,401 people: no parent is in the file. PLINK therefore counts everyone as a founder; its log says \"1401 founders and 0 nonfounders present\".";
    if (c === 4) return v === "1" ? "1 = male (937 of the 1,401 people)." : v === "2" ? "2 = female (464 of the 1,401 people)." : "0 = unknown.";
    if (c === 5) {
      var base = v === "1" ? "1 = control (470 people have this code)." : v === "2" ? "2 = case (463 people have this code)." : "−9 = missing (468 people have this code).";
      return base + " PLINK reads the column as case–control because it holds only 1, 2 and −9. What the codes stand for in this copy of PennCATH is discussed under “What column 6 holds” on this page.";
    }
    return "";
  }
  function bimValueNote(c, v, row) {
    if (c === 0) return v === "22" ? "Chromosome 22, the last autosome: 11,382 SNPs of this file. The file has only chromosomes 1–22 (no X, Y or MT)." : "Chromosome 1: 71,038 of the 861,473 SNPs. Lines are sorted by chromosome and then position.";
    if (c === 1) return "An rsID from dbSNP. All 861,473 IDs in this file are rsIDs.";
    if (c === 2) return "0 on every line of this file: no genetic map was attached. Commands of the practical do not need it.";
    if (c === 3) return "Position " + Number(v).toLocaleString("en-US") + " on chromosome " + row.cells[0] + " of GRCh37, the build of this file (the same SNP has a different number on GRCh38).";
    if (c === 4 || c === 5) return row.snp;
    return "";
  }

  var FILES = {
    fam: { label: "penncath.fam", cols: FAM_COLS, rows: FAM_ROWS, note: famValueNote,
           head: ["FID", "IID", "father", "mother", "sex", "phenotype"],
           intro: "1,401 lines, one per person, six columns separated by spaces, no header. Shown: lines 1–4, 10 and 1,401." },
    bim: { label: "penncath.bim", cols: BIM_COLS, rows: BIM_ROWS, note: bimValueNote,
           head: ["chr", "ID", "cM", "bp", "A1", "A2"],
           intro: "861,473 lines, one per SNP, six columns separated by tabs, no header. Shown: lines 1, 2, 4, 6, 7, 35,786 and 861,473." }
  };

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "class") e.className = attrs[k]; else e.setAttribute(k, attrs[k]);
    });
    if (text != null) e.textContent = text;
    return e;
  }

  var cur = "fam", sel = { r: 1, c: 4 };
  body.innerHTML = "";
  var switcher = el("div", { "class": "controls ce-switch", role: "group", "aria-label": "Choose a file" });
  var bFam = el("button", { type: "button", "class": "btn", "data-f": "fam" }, "penncath.fam");
  var bBim = el("button", { type: "button", "class": "btn", "data-f": "bim" }, "penncath.bim");
  switcher.appendChild(bFam); switcher.appendChild(bBim);
  body.appendChild(switcher);
  var intro = el("p", { "class": "note ce-intro" });
  body.appendChild(intro);
  var wrap = el("div", { "class": "ce-wrap" });
  var table = el("table", { "class": "ce-table" });
  wrap.appendChild(table);
  body.appendChild(wrap);
  var info = el("div", { "class": "ce-info", "aria-live": "polite" });
  body.appendChild(info);

  function build() {
    var F = FILES[cur];
    intro.textContent = F.intro;
    bFam.classList.toggle("primary", cur === "fam"); bFam.setAttribute("aria-pressed", cur === "fam");
    bBim.classList.toggle("primary", cur === "bim"); bBim.setAttribute("aria-pressed", cur === "bim");
    table.innerHTML = "";
    var thead = el("thead"), tr = el("tr");
    tr.appendChild(el("th", { scope: "col", "class": "ce-ln" }, "line"));
    F.head.forEach(function (h, c) { tr.appendChild(el("th", { scope: "col", "data-c": String(c) }, (c + 1) + " · " + h)); });
    thead.appendChild(tr); table.appendChild(thead);
    var tb = el("tbody");
    F.rows.forEach(function (row, r) {
      var trr = el("tr");
      trr.appendChild(el("th", { scope: "row", "class": "ce-ln" }, row.line.toLocaleString("en-US")));
      row.cells.forEach(function (v, c) {
        var td = el("td");
        var b = el("button", { type: "button", "class": "ce-cell", "data-r": String(r), "data-c": String(c),
                                "aria-label": F.label + ", line " + row.line + ", column " + (c + 1) + " (" + F.cols[c].name + "): " + v }, v);
        td.appendChild(b); trr.appendChild(td);
      });
      tb.appendChild(trr);
    });
    table.appendChild(tb);
    show();
    reveal();
  }

  /* On a narrow screen the table scrolls sideways: bring the selected cell into view inside it
     (only after building, so that hovering never moves the table, and without scrolling the page). */
  function reveal() {
    var b = table.querySelector(".ce-cell.sel");
    if (!b) return;
    var td = b.parentNode, left = td.offsetLeft, right = left + td.offsetWidth;
    if (right > wrap.scrollLeft + wrap.clientWidth) wrap.scrollLeft = right - wrap.clientWidth;
    else if (left < wrap.scrollLeft) wrap.scrollLeft = left;
  }

  function show() {
    var F = FILES[cur], row = F.rows[sel.r], col = F.cols[sel.c], v = row.cells[sel.c];
    table.querySelectorAll(".ce-cell").forEach(function (b) {
      var on = +b.getAttribute("data-r") === sel.r && +b.getAttribute("data-c") === sel.c;
      b.classList.toggle("sel", on);
      b.classList.toggle("col", +b.getAttribute("data-c") === sel.c);
    });
    table.querySelectorAll("thead th[data-c]").forEach(function (th) { th.classList.toggle("col", +th.getAttribute("data-c") === sel.c); });
    info.innerHTML = "";
    info.appendChild(el("p", { "class": "ce-title" }, F.label + " · column " + (sel.c + 1) + " · " + col.name));
    var p1 = el("p"); p1.appendChild(el("strong", null, "What it is. ")); p1.appendChild(document.createTextNode(col.what)); info.appendChild(p1);
    var p2 = el("p"); p2.appendChild(el("strong", null, "Allowed values. ")); p2.appendChild(document.createTextNode(col.allowed)); info.appendChild(p2);
    var p3 = el("p"); p3.appendChild(el("strong", null, "This cell (line " + row.line.toLocaleString("en-US") + "): ")); p3.appendChild(el("code", null, v));
    p3.appendChild(document.createTextNode(" — " + F.note(sel.c, v, row))); info.appendChild(p3);
  }

  function pick(b) {
    if (!b) return;
    sel = { r: +b.getAttribute("data-r"), c: +b.getAttribute("data-c") };
    show();
  }
  table.addEventListener("mouseover", function (e) { var b = e.target.closest(".ce-cell"); if (b) pick(b); });
  table.addEventListener("focusin", function (e) { pick(e.target.closest(".ce-cell")); });
  table.addEventListener("click", function (e) { pick(e.target.closest(".ce-cell")); });
  table.addEventListener("keydown", function (e) {
    var b = e.target.closest(".ce-cell");
    if (!b) return;
    var F = FILES[cur], r = +b.getAttribute("data-r"), c = +b.getAttribute("data-c");
    if (e.key === "ArrowRight") c = Math.min(5, c + 1); else if (e.key === "ArrowLeft") c = Math.max(0, c - 1);
    else if (e.key === "ArrowDown") r = Math.min(F.rows.length - 1, r + 1); else if (e.key === "ArrowUp") r = Math.max(0, r - 1);
    else return;
    e.preventDefault();
    var nb = table.querySelector('.ce-cell[data-r="' + r + '"][data-c="' + c + '"]');
    if (nb) nb.focus();
  });
  switcher.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-f]");
    if (!b || b.getAttribute("data-f") === cur) return;
    cur = b.getAttribute("data-f");
    sel = cur === "fam" ? { r: 1, c: 4 } : { r: 0, c: 4 };
    build();
  });
  build();
})();
