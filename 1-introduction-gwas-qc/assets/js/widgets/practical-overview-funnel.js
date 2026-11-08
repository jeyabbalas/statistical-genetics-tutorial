/* practical-overview-funnel.js — "The toy data through the eight steps"
   A funnel of the lab's toy dataset through the practical's QC steps: for each step, how many people and SNPs
   go in, how many are removed, and how many are only flagged or listed (the practical removes nothing after
   step 1; the reader decides in the exercise). Clicking a row shows the step's command, output file and page.

   Numbers come only from window.TOY_CARD (assets/js/lab/data-card.js, loaded before this script; each key is
   documented in data/README.md, "TOY_CARD keys"). The widget never shows a number for the real PennCATH data.
   A number whose key is missing shows as "?".
   Arithmetic: people after step 1 = study_people − mind_removed; SNPs after step 1 = study_snps − geno_removed.
   Later steps do not change these counts; their numbers are flags (HWE, relatedness, heterozygosity), lists
   (LD pruning, the merge with the reference) or a group count (GrafAnc). */
(function () {
  "use strict";
  var root = document.getElementById("w-funnel");
  if (!root) return;
  var body = root.querySelector(".widget-body");
  if (!body) return;

  var KEYS = {
    people: "study_people",
    snps: "study_snps",
    geno: "geno_removed",
    mind: "mind_removed",
    hwe: "hwe_unaff_p_lt_1e8",
    pruneIn: "prune_in",
    pruneOut: "prune_out",
    related: "pairs_pihat_gt_0_1875",
    het3sd: "het_outliers_3sd",
    hetF: "het_f_abs_gt_0_1",
    overlap: "merge1_shared_snps",
    missnp: "merge1_missnp",
    grafEur: "grafanc_eur",
    grafPct: "grafanc_eur_percent"
  };

  function card(name) {
    var c = window.TOY_CARD;
    if (!c || !KEYS[name]) return null;
    var v = c[KEYS[name]];
    if (typeof v === "number" && isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && !isNaN(+v)) return +v;
    return null;
  }
  function fmt(v) { return v === null ? "?" : v.toLocaleString("en-US"); }
  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "class") e.className = attrs[k]; else e.setAttribute(k, attrs[k]);
    });
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }

  /* One row per stage. who: which column the stage acts on; kind: removes, flags or lists. */
  var STAGES = [
    { step: "", title: "The toy study", who: "both", kind: "start",
      cmd: "toy.bed  toy.bim  toy.fam", out: "data/inputs/penncath_withPheno/",
      text: "Everything the lab starts with: one line per person in toy.fam and one line per SNP in toy.bim.", page: "#toy-data" },
    { step: "1", title: "Missingness: SNPs (--geno 0.01)", who: "snps", kind: "remove", key: "geno",
      cmd: "plink --bfile ${input_dir}/toy --geno 0.01 --make-bed --out ${analysis_dir}/toy.geno0.01",
      out: "toy.geno0.01.bed/.bim/.fam",
      text: "SNPs with more than 1% of calls missing are removed first, so that a few bad SNPs do not push people over the person-level threshold.",
      page: "qc-missingness.html" },
    { step: "1", title: "Missingness: people (--mind 0.01)", who: "people", kind: "remove", key: "mind",
      cmd: "plink --bfile ${analysis_dir}/toy.geno0.01 --mind 0.01 --make-bed --out ${analysis_dir}/toy.geno0.01.mind0.01",
      out: "toy.geno0.01.mind0.01.bed/.bim/.fam (+ .irem)",
      text: "People with more than 1% of their remaining calls missing are removed. The result is the fileset every later step reads.",
      page: "qc-missingness.html" },
    { step: "2", title: "Hardy–Weinberg (p < 1e-8 in controls)", who: "snps", kind: "flag", key: "hwe",
      cmd: "plink --bfile ${analysis_dir}/toy.geno0.01.mind0.01 --hardy --out ${analysis_dir}/toy.geno0.01.mind0.01",
      out: "toy.geno0.01.mind0.01.hwe",
      text: "The practical counts SNPs whose exact test in the controls (UNAFF rows) gives a p-value below 1e-8; removing them with --hwe is left to the exercise.",
      page: "qc-hwe.html" },
    { step: "3", title: "LD pruning (r² > 0.3)", who: "snps", kind: "list", key: "pruneIn", key2: "pruneOut",
      cmd: "plink --bfile ${analysis_dir}/toy.geno0.01.mind0.01 --indep-pairwise 50 5 0.3 --out ${analysis_dir}/toy.geno0.01.mind0.01",
      out: "toy.geno0.01.mind0.01.prune.in / .prune.out",
      text: "No SNP is removed from the fileset: the step lists a subset of roughly independent SNPs (.prune.in) that steps 4–6 use.",
      page: "qc-ld-pruning.html" },
    { step: "4", title: "Relatedness (PI_HAT > 0.1875)", who: "people", kind: "flag", key: "related", unit: "pairs",
      cmd: "plink --bfile … --extract ….prune.in --genome --out ${analysis_dir}/toy.geno0.01.mind0.01.LD0.3",
      out: "toy.geno0.01.mind0.01.LD0.3.genome",
      text: "Pairs of people whose estimated share of the genome inherited from recent common ancestors (PI_HAT) is above 0.1875, halfway between the values expected for second-degree (0.25) and third-degree (0.125) relatives; the practical asks you to choose the threshold. One person can appear in many pairs. Removing one person per pair, or keeping them for a model that allows relatedness, is the reader's decision.",
      page: "qc-relatedness.html" },
    { step: "5", title: "Heterozygosity (±3 SD; |F| > 0.1)", who: "people", kind: "flag", key: "het3sd", key2: "hetF",
      cmd: "plink --bfile … --extract ….prune.in --het --out ${analysis_dir}/toy.geno0.01.mind0.01.LD0.3",
      out: "toy.geno0.01.mind0.01.LD0.3.het",
      text: "People whose share of heterozygous calls is unusually high (possible contamination) or low (possible inbreeding), by the two rules the practical compares.",
      page: "qc-heterozygosity.html" },
    { step: "6", title: "PCA", who: "people", kind: "look",
      cmd: "plink --bfile … --extract ….prune.in --maf 0.05 --pca --out ${analysis_dir}/toy.geno0.01.mind0.01.LD0.3",
      out: "toy.geno0.01.mind0.01.LD0.3.eigenvec / .eigenval",
      text: "No count: the output is a plot of the people on the first principal components, inspected for clusters and outliers.",
      page: "qc-pca.html" },
    { step: "7", title: "Reference PCA (merge with toy_1kg)", who: "snps", kind: "merge", key: "overlap", key2: "missnp",
      cmd: "plink --bfile ${analysis_dir}/toy.geno0.01.mind0.01 --bmerge ${reference_dir}/toy_1kg.bed … --make-bed --out ….merge1kgenomes",
      out: "….merge1kgenomes-merge.missnp, then ….merge1kgenomes.eigenvec",
      text: "The first merge attempt lists SNPs whose alleles disagree with the reference (.missnp); after --flip, the merged fileset is analyzed with PCA next to the reference people.",
      page: "qc-reference-pca.html" },
    { step: "8", title: "GrafAnc (EUR group)", who: "people", kind: "count", key: "grafEur", key2: "grafPct",
      cmd: "${analysis_dir}/grafanc/bin/grafanc ${analysis_dir}/toy.geno0.01.mind0.01.uniqueIDs ${analysis_dir}/toy_grafanc_out.txt",
      out: "toy_grafanc_out.txt",
      text: "GrafAnc places each person relative to reference populations and assigns an ancestry group (AncGroupID). The practical's R code counts the people in each group; the count shown is the European (EUR) group, the one the practical reports for PennCATH. The step page compares the groups with the PCA.",
      page: "qc-grafanc.html" }
  ];

  var state = { sel: 1 };
  var hasCard = !!window.TOY_CARD;

  var status = el("p", { "class": "note fn-status" });
  var grid = el("div", { "class": "fn-grid" });
  var detail = el("div", { "class": "fn-detail", "aria-live": "polite" });
  body.appendChild(status);
  body.appendChild(grid);
  body.appendChild(detail);

  /* frac: the part of the starting count still present (null = unknown, drawn hatched grey).
     flagFrac: the part flagged, drawn hatched at the right end of the filled part, at least 6 px wide so that
     a handful of flagged people or SNPs stays visible. */
  function bar(frac, flagFrac) {
    var b = el("span", { "class": "fn-bar" });
    var f = el("span", { "class": "fn-fill" });
    var w = frac === null ? 1 : Math.max(0, Math.min(1, frac));
    f.style.width = (w * 100).toFixed(2) + "%";
    if (frac === null) f.classList.add("unknown");
    b.appendChild(f);
    if (flagFrac && frac !== null) {
      var g = el("span", { "class": "fn-flag" });
      var fw = (Math.min(w, flagFrac) * 100).toFixed(2) + "%";
      g.style.width = "max(6px, " + fw + ")";
      g.style.left = "calc(" + (w * 100).toFixed(2) + "% - max(6px, " + fw + "))";
      b.appendChild(g);
    }
    return b;
  }

  function render() {
    var P0 = card("people"), S0 = card("snps"), geno = card("geno"), mind = card("mind");
    var S1 = S0 !== null && geno !== null ? S0 - geno : null;
    var P1 = P0 !== null && mind !== null ? P0 - mind : null;
    status.textContent = hasCard
      ? "Numbers from the lab's toy data (its data card). Bars show what is left of the starting people and SNPs; the hatched part is flagged, not removed."
      : "The toy data's numbers appear here when the lab's data card is loaded; until then they show as ?.";
    grid.innerHTML = "";
    var head = el("div", { "class": "fn-row fn-head", "aria-hidden": "true" });
    head.appendChild(el("span", { "class": "fn-lab" }, "Step"));
    head.appendChild(el("span", { "class": "fn-col" }, "People"));
    head.appendChild(el("span", { "class": "fn-col" }, "SNPs"));
    grid.appendChild(head);

    STAGES.forEach(function (st, k) {
      var row = el("button", { type: "button", "class": "fn-row" + (state.sel === k ? " sel" : ""), "data-k": String(k),
                               "aria-pressed": state.sel === k ? "true" : "false" });
      var lab = el("span", { "class": "fn-lab" });
      if (st.step) lab.appendChild(el("span", { "class": "fn-step" }, st.step));
      lab.appendChild(document.createTextNode(st.title));
      row.appendChild(lab);
      var pc = el("span", { "class": "fn-col fn-people" }), sc = el("span", { "class": "fn-col fn-snps" });
      var v = st.key ? card(st.key) : null, v2 = st.key2 ? card(st.key2) : null;
      var pNow = k === 0 ? P0 : (k >= 2 ? P1 : P0);
      var sNow = k === 0 ? S0 : S1;

      function fill(cell, total, start, who) {
        var t = el("span", { "class": "fn-txt" });
        var acts = st.who === who || st.who === "both";
        if (k === 0) {
          t.textContent = fmt(total) + (who === "people" ? " people" : " SNPs");
          cell.appendChild(bar(total === null ? null : 1));
        } else if (acts && st.kind === "remove") {
          var after = who === "people" ? P1 : S1;
          t.textContent = "−" + fmt(v) + " → " + fmt(after);
          cell.appendChild(bar(after !== null && start ? after / start : null));
        } else if (acts && st.kind === "flag") {
          var unit = st.unit === "pairs" ? " pairs" : "";
          t.textContent = st.key2 ? "flagged " + fmt(v) + " (±3 SD), " + fmt(v2) + " (|F| > 0.1)" : "flagged " + fmt(v) + unit;
          var base = who === "people" ? P1 : S1;
          var ff = st.unit === "pairs" || v === null || !base ? null : v / start;
          cell.appendChild(bar(base !== null && start ? base / start : null, ff));
        } else if (acts && st.kind === "list") {
          t.textContent = "listed " + fmt(v) + " in .prune.in, " + fmt(v2) + " in .prune.out";
          cell.appendChild(bar(v !== null && start ? v / start : null));
        } else if (acts && st.kind === "merge") {
          t.textContent = "shared with the reference " + fmt(v) + "; in .missnp " + fmt(v2);
          cell.appendChild(bar(v !== null && start ? v / start : null));
        } else if (acts && st.kind === "count") {
          t.textContent = "assigned EUR: " + fmt(v) + " of " + fmt(total) + (v2 !== null ? " (" + fmt(v2) + "%)" : "");
          cell.appendChild(bar(total !== null && start ? total / start : null));
        } else if (acts && st.kind === "look") {
          t.textContent = "no count: look at the plot";
          cell.appendChild(bar(total !== null && start ? total / start : null));
        } else {
          t.textContent = fmt(total);
          t.classList.add("muted");
          cell.appendChild(bar(total !== null && start ? total / start : null));
          cell.classList.add("idle");
        }
        cell.insertBefore(t, cell.firstChild);
      }
      fill(pc, pNow, P0, "people");
      fill(sc, sNow, S0, "snps");
      row.appendChild(pc); row.appendChild(sc);
      grid.appendChild(row);
    });
    renderDetail();
  }

  function renderDetail() {
    var st = STAGES[state.sel];
    detail.innerHTML = "";
    detail.appendChild(el("p", { "class": "fn-dtitle" }, (st.step ? "Step " + st.step + " · " : "") + st.title));
    detail.appendChild(el("p", null, st.text));
    var c = el("p");
    c.appendChild(el("strong", null, st.step ? "Command (lab): " : "Files: "));
    c.appendChild(el("code", null, st.cmd));
    detail.appendChild(c);
    var o = el("p");
    o.appendChild(el("strong", null, st.step ? "Writes: " : "Folder: "));
    o.appendChild(el("code", null, st.out));
    detail.appendChild(o);
    var l = el("p");
    var a = el("a", { href: st.page }, st.step ? "Go to the step's page →" : "What the toy data contain →");
    l.appendChild(a);
    detail.appendChild(l);
  }

  grid.addEventListener("click", function (e) {
    var r = e.target.closest("button.fn-row");
    if (!r) return;
    state.sel = +r.getAttribute("data-k");
    grid.querySelectorAll("button.fn-row").forEach(function (b) {
      var on = +b.getAttribute("data-k") === state.sel;
      b.classList.toggle("sel", on); b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    renderDetail();
  });

  render();
  /* If the data card loads after this script (it is a separate deferred file), draw again. */
  if (!hasCard) {
    window.addEventListener("load", function () { if (window.TOY_CARD) { hasCard = true; render(); } });
  }
})();
