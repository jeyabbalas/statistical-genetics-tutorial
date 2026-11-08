/* field-map-framework.js — interactive field map of genetic epidemiology (Lecture 1, slide 29).
 *
 * No statistics are computed here. The widget lays out the nine boxes of slide 29, highlights
 * the boxes that each session uses (slides 45–54), and shows the details of one box. The details
 * are read from the static table #fm-table on the page (one <tr data-box="…"> per box), so the
 * table stays the single source of the text and the page reads the same without JavaScript.
 */
(function () {
  "use strict";
  if (typeof document === "undefined") return;
  var root = document.getElementById("w-framework");
  if (!root) return;
  var body = root.querySelector(".widget-body");

  var BOXES = [
    { id: "molecular", name: "Molecular genetics", row: "top" },
    { id: "mendelian", name: "Mendelian genetics", row: "top" },
    { id: "familial", name: "Familial aggregation, heritability", row: "top" },
    { id: "popgen", name: "Population genetics", row: "top" },
    { id: "linkage", name: "Linkage studies", row: "bottom" },
    { id: "gwas", name: "Genome-wide association studies (GWAS)", row: "bottom" },
    { id: "post", name: "Post-GWAS studies", row: "bottom" },
    { id: "rvas", name: "Rare variant association studies", row: "bottom" },
    { id: "social", name: "Social factors", row: "side" }
  ];
  var NOT_COVERED = ["molecular", "mendelian", "familial", "linkage"];
  var SESSIONS = [
    { n: 1, date: "9 September", title: "Introduction", slide: 46, on: ["popgen", "gwas"], gray: [],
      text: "Basic concepts of population genetics, and the data management, quality control and quality assessment that come before any GWAS test." },
    { n: 2, date: "16 September", title: "Basic GWAS analyses", slide: 47, on: ["gwas"], gray: [],
      text: "Association testing, meta-analysis, visualization and annotation of GWAS results." },
    { n: 3, date: "30 September", title: "Population descriptors and gene–environment interactions", slide: 48, on: ["gwas", "post", "social"], gray: ["molecular"],
      text: "Population descriptors and gene–environment interactions; molecular genetics is shown in gray as background." },
    { n: 4, date: "7 October", title: "Fine-mapping and colocalization", slide: 49, on: ["gwas", "post"], gray: [],
      text: "Methods to prioritize the likely causal variants behind an association: statistical fine-mapping and colocalization." },
    { n: 5, date: "14 October", title: "Post-GWAS analyses", slide: 50, on: ["gwas", "post"], gray: [],
      text: "Heritability, functional enrichment and integrative analyses such as TWAS: the biological mechanisms behind associations." },
    { n: 6, date: "28 October", title: "Polygenic risk scores", slide: 51, on: ["gwas", "post"], gray: [],
      text: "Predicting future or latent trait values from many variants at once." },
    { n: 7, date: "4 November", title: "Rare variants", slide: 52, on: ["popgen", "gwas", "post", "rvas"], gray: ["linkage"],
      text: "Hypothesis-driven and agnostic association studies of rare variants; linkage studies are shown in gray as their predecessor." },
    { n: 8, date: "18 November", title: "Genetic mosaicism and clonal hematopoiesis", slide: 53, on: ["gwas", "post", "rvas"], gray: [],
      text: "Genetic changes acquired after conception in some of a person’s cells, such as the expanded blood-cell clones of clonal hematopoiesis." },
    { n: 9, date: "2 December", title: "Functional genomics", slide: 54, on: ["molecular", "gwas", "post", "rvas"], gray: [],
      text: "Laboratory and genomic methods that show how a variant changes what a gene does: the step between genotype and trait." }
  ];

  var opts = '<option value="none">Nothing: show every box</option>' +
    '<option value="covered">What the course covers and leaves out (slide 45)</option>';
  SESSIONS.forEach(function (s) {
    opts += '<option value="s' + s.n + '">Session ' + s.n + ' · ' + s.date + ' · ' + s.title + '</option>';
  });

  var grid = '<div class="fm-label fm-label-top">Foundations: how variation is inherited and distributed</div>' +
    '<div class="fm-label fm-label-bottom">Designs that link genetic variation to disease</div>';
  BOXES.forEach(function (b) {
    grid += '<button type="button" class="fm-box fm-' + b.row + '" id="fm-b-' + b.id + '" data-id="' + b.id + '" aria-pressed="false">' + b.name + '</button>';
  });

  body.innerHTML =
    '<div class="controls fm-controls"><label class="fm-pick"><span>Highlight</span> <select id="fm-sel">' + opts + '</select></label></div>' +
    '<p class="note fm-snote" id="fm-snote" aria-live="polite"></p>' +
    '<div class="fm-grid" role="group" aria-label="The nine boxes of the field map; choose one to see its details">' + grid + '</div>' +
    '<p class="note fm-legend" aria-hidden="true"><span class="fm-li"><span class="fm-sw fm-sw-on"></span>used in the highlighted session</span> <span class="fm-li"><span class="fm-sw fm-sw-gray"></span>not covered explicitly, or shown only as background</span> <span class="fm-li"><span class="fm-sw fm-sw-sel"></span>box whose details are shown</span></p>' +
    '<div class="fm-detail" id="fm-detail" aria-live="polite"></div>';

  var state = { sel: "none", box: "gwas" };
  var buttons = {};
  Array.prototype.forEach.call(body.querySelectorAll(".fm-box"), function (btn) { buttons[btn.getAttribute("data-id")] = btn; });

  function sessionUsing(id) {
    var out = [];
    SESSIONS.forEach(function (s) { if (s.on.indexOf(id) >= 0) out.push(s.n); });
    return out;
  }

  function renderDetail() {
    var box = null;
    BOXES.forEach(function (b) { if (b.id === state.box) box = b; });
    var row = document.querySelector('#fm-table tr[data-box="' + state.box + '"]');
    var html = '<p class="fm-dtitle"><strong>' + box.name + '</strong></p>';
    if (row) {
      var cells = row.querySelectorAll("td");
      var cap = cells[0] ? cells[0].querySelector(".fm-cap") : null;
      if (cap) html += '<p class="fm-dcap">' + cap.innerHTML + "</p>";
      html += '<dl class="fm-dl">';
      for (var i = 1; i < cells.length; i++) {
        html += "<dt>" + (cells[i].getAttribute("data-label") || "") + "</dt><dd>" + cells[i].innerHTML + "</dd>";
      }
      html += "</dl>";
    }
    var used = sessionUsing(state.box);
    html += '<p class="note">On slides 46–54 this box is highlighted for ' +
      (used.length ? (used.length === 1 ? "Session " : "Sessions ") + used.join(", ") : "no session") +
      (NOT_COVERED.indexOf(state.box) >= 0 ? "; slide 45 grays it out as a topic the course will not cover explicitly." : ".") + "</p>";
    body.querySelector("#fm-detail").innerHTML = html;
  }

  function render() {
    var on = [], gray = [], note = "";
    if (state.sel === "covered") {
      BOXES.forEach(function (b) { if (NOT_COVERED.indexOf(b.id) < 0) on.push(b.id); });
      gray = NOT_COVERED.slice();
      note = "Slide 45: “We will not explicitly cover the greyed out topics”: molecular genetics, Mendelian genetics, familial aggregation and heritability, and linkage studies. Every session builds on GWAS.";
    } else if (state.sel.charAt(0) === "s") {
      var s = SESSIONS[parseInt(state.sel.slice(1), 10) - 1];
      on = s.on.slice(); gray = s.gray.slice();
      note = "Session " + s.n + " (" + s.date + ", slide " + s.slide + "): " + s.text;
    } else {
      note = "Choose a box to see its question, design, data, statistic and an example, or highlight what a session uses.";
    }
    BOXES.forEach(function (b) {
      var btn = buttons[b.id];
      btn.classList.toggle("fm-on", on.indexOf(b.id) >= 0);
      btn.classList.toggle("fm-gray", gray.indexOf(b.id) >= 0);
      btn.classList.toggle("fm-dim", state.sel !== "none" && on.indexOf(b.id) < 0 && gray.indexOf(b.id) < 0);
      btn.classList.toggle("fm-sel", b.id === state.box);
      btn.setAttribute("aria-pressed", b.id === state.box ? "true" : "false");
    });
    body.querySelector("#fm-snote").textContent = note;
    renderDetail();
  }

  body.querySelector("#fm-sel").addEventListener("change", function (e) { state.sel = e.target.value; render(); });
  BOXES.forEach(function (b) {
    buttons[b.id].addEventListener("click", function () { state.box = b.id; render(); });
  });
  render();
})();
