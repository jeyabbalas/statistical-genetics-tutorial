/* field-map-timeline.js — a filterable timeline of the traditions that formed genetic epidemiology
 * (Lecture 1, slides 26–28 and 39).
 *
 * No statistics are computed. Each event has a year, a tradition (the three boxes of slide 28,
 * plus epidemiology and the social context that slide 39 adds) and one or two sentences.
 * The overview strip places one dot per event: x = year on a linear axis from 1860 to 2030,
 * y = the lane of its tradition. The list below is the accessible version and shows the same
 * events in date order; the buttons switch traditions on and off.
 */
(function () {
  "use strict";
  var TRAD = [
    { id: "stat", label: "Mendelian & statistical genetics", short: "Mendelian & statistical", color: "#c0392b" },
    { id: "clin", label: "Clinical genetics", short: "Clinical", color: "#9a7426" },
    { id: "mol", label: "Molecular genetics & technology", short: "Molecular & technology", color: "#4f6b2a" },
    { id: "epi", label: "Epidemiology & genetic epidemiology", short: "Genetic epidemiology", color: "#2f6aa3" },
    { id: "soc", label: "Social context", short: "Social context", color: "#8e5ea2" }
  ];
  var EVENTS = [
    { y: 1866, d: "stat", t: "Mendel publishes his crosses of pea plants: discrete traits are passed on as units that separate in fixed ratios, such as 3 : 1.", s: "Mendel 1866" },
    { y: 1883, d: "soc", t: "Galton coins the word “eugenics” for a program of improving a population by controlling who has children.", s: "Galton 1883" },
    { y: 1886, d: "stat", t: "Galton measures the heights of parents and adult children and describes regression toward the mean, the start of the statistics of continuous traits.", s: "Galton 1886" },
    { y: 1900, d: "stat", t: "De Vries, Correns and Tschermak rediscover Mendel’s laws. Pearson publishes the chi-square goodness-of-fit test.", s: "Pearson 1900" },
    { y: 1902, d: "clin", t: "Garrod shows that alkaptonuria runs in families as a recessive trait, the first human disease explained by Mendel’s laws, and calls it an “inborn error of metabolism”.", s: "Garrod 1902, Lancet" },
    { y: 1905, d: "stat", t: "Bateson, Saunders and Punnett find the first case of linkage, in sweet peas: two traits inherited together more often than Mendel’s laws predict. Bateson names the new science “genetics”.", s: "Bateson et al. 1905" },
    { y: 1907, d: "soc", t: "Indiana passes the first compulsory sterilization law in the United States; more than 30 states follow.", s: "Indiana law of 1907" },
    { y: 1908, d: "stat", t: "Hardy and Weinberg independently show how allele frequencies give genotype frequencies in a randomly mating population: Hardy–Weinberg equilibrium.", s: "Hardy 1908, Science" },
    { y: 1908, d: "clin", t: "Garrod’s Croonian lectures, “Inborn errors of metabolism”, describe four such diseases; later he argues that the same chemical individuality explains different reactions to drugs and foods.", s: "Garrod 1908–1931" },
    { y: 1910, d: "mol", t: "Morgan finds a white-eyed fruit fly whose inheritance follows the X chromosome: genes lie on chromosomes. Sturtevant draws the first genetic map in 1913.", s: "Morgan 1910, Science" },
    { y: 1915, d: "mol", t: "Ernest Everett Just, a cell biologist who studied fertilization and the cell surface of marine eggs, receives the first Spingarn Medal; his book on the cell surface appears in 1939.", s: "Just 1939" },
    { y: 1918, d: "stat", t: "Fisher shows that many Mendelian genes of small effect produce continuous traits and the observed correlations between relatives, and introduces the term “variance”.", s: "Fisher 1918" },
    { y: 1921, d: "stat", t: "Wright publishes “Correlation and causation”: path analysis, which splits correlations along a diagram of causes.", s: "Wright 1921" },
    { y: 1924, d: "stat", t: "Haldane begins his mathematical theory of selection (1924–1932); with Fisher’s and Wright’s work it becomes the basis of the “modern synthesis” of genetics and evolution, named by Julian Huxley in 1942.", s: "Haldane 1924; Huxley 1942" },
    { y: 1927, d: "soc", t: "In Buck v. Bell the U.S. Supreme Court upholds compulsory sterilization, by 8 votes to 1.", s: "Buck v. Bell, 274 U.S. 200" },
    { y: 1931, d: "mol", t: "Creighton and McClintock show in maize that genetic crossing-over is a physical exchange between chromosomes; in 1950 McClintock describes transposable elements.", s: "Creighton & McClintock 1931; McClintock 1950" },
    { y: 1944, d: "mol", t: "Avery, MacLeod and McCarty show that DNA is the substance that transforms one bacterial type into another.", s: "Avery et al. 1944" },
    { y: 1947, d: "mol", t: "Marie Maynard Daly earns a PhD in chemistry at Columbia University, the first African American woman to do so in the United States; she goes on to study the proteins and nucleic acids of the cell nucleus, and later cholesterol and hypertension.", s: "Daly 1947" },
    { y: 1949, d: "clin", t: "Neel shows that sickle cell anemia is the homozygous form of the sickle cell trait; the same year Pauling and colleagues show that sickle hemoglobin is a different molecule.", s: "Neel 1949; Pauling et al. 1949" },
    { y: 1952, d: "mol", t: "Hershey and Chase show that the DNA of a bacterial virus, not its protein, enters the cell and directs new viruses. Franklin and Gosling record the X-ray image known as Photo 51.", s: "Hershey & Chase 1952" },
    { y: 1953, d: "mol", t: "Watson and Crick propose the double helix, built on X-ray data from Franklin, Gosling and Wilkins.", s: "Watson & Crick 1953" },
    { y: 1954, d: "epi", t: "Neel and Schull describe an “epidemiologic” approach to human genetics in their textbook Human Heredity.", s: "Duggal et al. 2019" },
    { y: 1955, d: "epi", t: "Morton introduces the LOD score for linkage in human families, with a threshold of 3.", s: "Morton 1955" },
    { y: 1959, d: "clin", t: "Vogel coins the word “pharmacogenetics” for inherited differences in the response to drugs.", s: "Vogel 1959" },
    { y: 1963, d: "clin", t: "Guthrie and Susi describe a blood-spot test for phenylketonuria in newborns; newborn screening spreads through the 1960s.", s: "Guthrie & Susi 1963" },
    { y: 1967, d: "epi", t: "Morton, Chung and Mi use the term “genetic epidemiology” in a study of families in Hawaii.", s: "Duggal et al. 2019" },
    { y: 1982, d: "epi", t: "Morton’s Outline of Genetic Epidemiology defines the field as the study of disease in groups of relatives and of inherited causes of disease in populations.", s: "Morton 1982" },
    { y: 1983, d: "epi", t: "Huntington disease is mapped to chromosome 4 by linkage to a DNA marker, before anything is known about the protein.", s: "Gusella et al. 1983" },
    { y: 1984, d: "epi", t: "The journal Genetic Epidemiology starts; Neel’s editorial in its first issue (quoted on slide 28) ties the field to multifactorial causation.", s: "Neel 1984" },
    { y: 1990, d: "epi", t: "Linkage in families with early-onset breast cancer places BRCA1 on chromosome 17q21 (LOD 5.98).", s: "Hall et al. 1990" },
    { y: 1990, d: "mol", t: "The Human Genome Project begins; a draft sequence is published in 2001 and a finished one in 2003.", s: "Lander et al. 2001" },
    { y: 1993, d: "epi", t: "Khoury, Beaty and Cohen publish Fundamentals of Genetic Epidemiology.", s: "Duggal et al. 2019" },
    { y: 2005, d: "mol", t: "The International HapMap Project publishes a map of common variation and its correlation (linkage disequilibrium) in 269 people from four populations.", s: "HapMap 2005" },
    { y: 2005, d: "epi", t: "One of the first GWAS, of 96 cases and 50 controls, finds a common variant in the complement factor H gene associated with age-related macular degeneration.", s: "Klein et al. 2005" },
    { y: 2007, d: "epi", t: "The Wellcome Trust Case Control Consortium studies 14,000 cases of seven diseases and 3,000 shared controls and reports 24 independent association signals.", s: "WTCCC 2007" },
    { y: 2008, d: "mol", t: "The 1000 Genomes Project begins; its final release (2015) describes 88 million variants in 2,504 people from 26 populations.", s: "1000 Genomes 2015" },
    { y: 2010, d: "epi", t: "UK Biobank finishes recruiting about 500,000 adults aged 40–69 (2006–2010); genotypes for all of them are released in 2017.", s: "Bycroft et al. 2018" },
    { y: 2016, d: "soc", t: "Popejoy and Fullerton report that 81% of the people in GWAS were of European ancestry, against 96% in 2009.", s: "Popejoy & Fullerton 2016" },
    { y: 2019, d: "soc", t: "Martin and colleagues show that polygenic scores built mostly from European-ancestry GWAS predict several times less accurately in other ancestries.", s: "Martin et al. 2019" },
    { y: 2020, d: "soc", t: "Several organizations, including Fisher’s Cambridge college, remove his name or image from awards and buildings because of his promotion of eugenics.", s: "Bodmer et al. 2021" },
    { y: 2022, d: "mol", t: "The Telomere-to-Telomere Consortium publishes the first complete sequence of a human genome.", s: "Nurk et al. 2022" },
    { y: 2022, d: "soc", t: "Carlson and colleagues describe how extremists misuse genetics papers and what researchers can do about it.", s: "Carlson et al. 2022" },
    { y: 2023, d: "soc", t: "The U.S. National Academies recommend how genetics research should describe populations, and against using race as a proxy for genetic ancestry.", s: "NASEM 2023" }
  ];
  var core = { TRAD: TRAD, EVENTS: EVENTS };
  if (typeof module !== "undefined" && module.exports) { module.exports = core; }
  if (typeof document === "undefined") return;

  var root = document.getElementById("w-timeline");
  if (!root) return;
  var body = root.querySelector(".widget-body");
  var NS = "http://www.w3.org/2000/svg";
  var Y0 = 1860, Y1 = 2030;
  var on = {}; TRAD.forEach(function (t) { on[t.id] = true; });
  var focus = null;

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function trad(id) { for (var i = 0; i < TRAD.length; i++) if (TRAD[i].id === id) return TRAD[i]; return null; }

  var btns = '<button type="button" class="btn tl-all" id="tl-all">Show all</button>';
  TRAD.forEach(function (t) {
    btns += '<button type="button" class="btn tl-btn" data-d="' + t.id + '" aria-pressed="true"><span class="tl-sw" style="background:' + t.color + '"></span>' + t.label + '</button>';
  });
  body.innerHTML =
    '<p class="note">' + EVENTS.length + ' events, ' + Y0 + '–' + (Y1 - 4) + '. Switch a tradition off or on; select a dot or a list item to read it.</p>' +
    '<div class="controls tl-controls" role="group" aria-label="Traditions to show">' + btns + '</div>' +
    '<svg id="tl-svg" viewBox="0 0 860 190" role="img" aria-label="Overview of the events: one row per tradition, one dot per event, years 1860 to 2030"></svg>' +
    '<div class="readout tl-focus" id="tl-focus" aria-live="polite"></div>' +
    '<p class="note" id="tl-count"></p>' +
    '<ol class="tl-list" id="tl-list"></ol>';

  function visible() { return EVENTS.filter(function (e) { return on[e.d]; }); }

  function draw() {
    var svg = body.querySelector("#tl-svg");
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var W = svg.getBoundingClientRect().width;
    if (!W || !isFinite(W)) W = 860;
    W = Math.round(Math.max(300, Math.min(860, W)));
    var lane = 30, top = 6, H = top + lane * TRAD.length + 28;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    var L = 18, R = W - 16;
    var sx = function (y) { return L + (y - Y0) / (Y1 - Y0) * (R - L); };
    TRAD.forEach(function (t, i) {
      var y = top + i * lane;
      el("rect", { x: L, y: y, width: R - L, height: lane - 2, fill: i % 2 ? "#f6f7f9" : "#fff" }, svg);
      var lab = el("text", { x: L + 4, y: y + 11, "class": "t-xs", fill: on[t.id] ? t.color : "#b9c1cc" }, svg);
      lab.textContent = t.short;
    });
    var bottom = top + lane * TRAD.length;
    el("line", { x1: L, x2: R, y1: bottom, y2: bottom, stroke: "#8a93a0" }, svg);
    var step = W < 520 ? 40 : 20;
    for (var yr = Y0; yr <= Y1; yr += step) {
      el("line", { x1: sx(yr), x2: sx(yr), y1: bottom, y2: bottom + 4, stroke: "#8a93a0" }, svg);
      var tx = el("text", { x: sx(yr), y: bottom + 16, "class": "t-xs", "text-anchor": "middle" }, svg);
      tx.textContent = String(yr);
    }
    EVENTS.forEach(function (e, k) {
      var i = TRAD.indexOf(trad(e.d));
      var c = el("circle", { cx: sx(e.y).toFixed(1), cy: top + i * lane + 20, r: focus === k ? 6.5 : 4.5,
        fill: on[e.d] ? trad(e.d).color : "#d9dee5", "fill-opacity": on[e.d] ? 0.85 : 0.6,
        stroke: focus === k ? "#1d2127" : "#fff", "stroke-width": focus === k ? 2 : 1, "class": "tl-dot" }, svg);
      if (on[e.d]) {
        c.style.cursor = "pointer";
        c.addEventListener("click", function () { setFocus(k, true); });
      }
    });
  }

  function list() {
    var v = visible();
    body.querySelector("#tl-count").textContent = "Showing " + v.length + " of " + EVENTS.length + " events.";
    var html = "";
    EVENTS.forEach(function (e, k) {
      if (!on[e.d]) return;
      var t = trad(e.d);
      html += '<li id="tl-e' + k + '"' + (focus === k ? ' class="tl-cur"' : "") + '><button type="button" class="tl-item" data-k="' + k + '"><span class="tl-year">' + e.y + '</span> <span class="tl-tag" style="border-color:' + t.color + ';color:' + t.color + '">' + t.short + "</span> " + e.t + ' <span class="tl-src">(' + e.s + ")</span></button></li>";
    });
    var ol = body.querySelector("#tl-list");
    ol.innerHTML = html;
    Array.prototype.forEach.call(ol.querySelectorAll(".tl-item"), function (b) {
      b.addEventListener("click", function () { setFocus(parseInt(b.getAttribute("data-k"), 10), false); });
    });
  }

  function showFocus() {
    var box = body.querySelector("#tl-focus");
    if (focus === null || !on[EVENTS[focus].d]) { box.textContent = "No event selected."; return; }
    var e = EVENTS[focus], t = trad(e.d);
    box.innerHTML = "<strong>" + e.y + " · " + t.label + "</strong><br>" + e.t + " (" + e.s + ")";
  }

  function setFocus(k, scroll) {
    focus = k;
    render();
    if (scroll) {
      var li = body.querySelector("#tl-e" + k);
      if (li && li.scrollIntoView) li.scrollIntoView({ block: "nearest" });
    }
  }

  function render() { draw(); list(); showFocus(); }

  Array.prototype.forEach.call(body.querySelectorAll(".tl-btn"), function (b) {
    b.addEventListener("click", function () {
      var d = b.getAttribute("data-d");
      on[d] = !on[d];
      b.setAttribute("aria-pressed", on[d] ? "true" : "false");
      render();
    });
  });
  body.querySelector("#tl-all").addEventListener("click", function () {
    TRAD.forEach(function (t) { on[t.id] = true; });
    Array.prototype.forEach.call(body.querySelectorAll(".tl-btn"), function (b) { b.setAttribute("aria-pressed", "true"); });
    render();
  });
  var lastW = 0, rt = null;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      var w = Math.round(body.querySelector("#tl-svg").getBoundingClientRect().width);
      if (Math.abs(w - lastW) > 4) { lastW = w; draw(); }
    }, 150);
  });
  focus = 0;
  render();
  lastW = Math.round(body.querySelector("#tl-svg").getBoundingClientRect().width);
})();
