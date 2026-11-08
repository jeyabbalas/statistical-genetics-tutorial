/* Who is in GWAS (social-context.html, #w-represent).
   Data: the NHGRI-EBI GWAS Catalog ancestry file (gwas-catalog-ancestry.tsv, release of 2 November 2026), discovery
   (initial) stage only. Each row of that file gives, for one study accession, a number of individuals and the
   Catalog's "broad ancestral category". Rows were grouped as follows before embedding here:
     - one category -> its group (South Asian, Central Asian, South East Asian and "Asian unspecified" -> "South Asian
       and other Asian"; "African American or Afro-Caribbean", "Sub-Saharan African" and "African unspecified" ->
       "African, African American or Afro-Caribbean"; "Native American", "Aboriginal Australian", "Other admixed
       ancestry" and "Other" -> "Other");
     - several categories in one row -> "Multiple"; "NR" (not reported) -> not reported.
   Two counting rules, by year of publication:
     per study:        sum of individuals over all study accessions (a cohort analyzed for 1,000 traits counts 1,000 times);
     per publication:  within each PubMed ID, the largest number of individuals in each group, then summed over
                       publications (the same cohort still counts again in every new publication).
   Shares are computed among individuals with a reported category: share_g = n_g / sum of n over the 9 groups.
   Cumulative view: counts summed from 2005 up to the year shown. 2026 covers 1 January - 2 November. */
(function () {
  "use strict";
  var YEARS = []; for (var y = 2005; y <= 2026; y++) YEARS.push(y);
  var GROUPS = ["European", "East Asian", "South Asian and other Asian", "African, African American or Afro-Caribbean",
    "Hispanic or Latin American", "Greater Middle Eastern", "Oceanian", "Other", "Multiple"];
  var COLORS = ["#4f81bd", "#e15759", "#59a14f", "#b07aa1", "#f28e2b", "#c9a227", "#76b7b2", "#9c755f", "#9aa3ad"];
  // columns: the 9 groups above, then "not reported"
  var DATA = {
    pub: [[890,0,1,0,0,0,0,141,0,0],[3861,0,226,920,0,0,0,0,0,694],[197836,288,737,0,561,0,0,1102,0,22816],[738588,6345,3706,1909,40,0,2346,4637,4761,2096],[1242193,42506,17890,11232,2421,0,4168,12159,24023,5691],[2116710,152276,15956,25733,2204,266,0,5407,69784,40946],[2241995,225143,80790,140957,10039,189,576,4470,1759,45923],[2345354,393941,25781,157847,12886,1949,85,1705,97283,114235],[3115113,261413,29885,197269,33137,1985,0,8934,5866,250079],[3027358,426996,51877,128801,41628,3518,311,10661,22948,65738],[4646088,271062,86182,105903,38117,2509,336,9283,18051,306827],[9421174,343528,70695,221259,244101,14759,3694,4407,3468,572525],[13648558,678169,130908,358676,282762,1307,2229,1856,161576,1696763],[37617927,1059249,103622,417781,213262,4308,6,15584,321288,3430571],[47752038,2351653,117578,748614,347932,5362,8241,11521,1190379,6219542],[51735893,3161803,194429,584733,322315,18687,5040,25509,2853158,4604446],[75840039,2936428,258389,761251,616408,25535,4581,40811,3157170,8893763],[91942681,5823309,563057,2263104,1683081,18099,4744,25728,16011728,12910789],[97257702,5471998,537346,2461247,1325566,15583,285,29506,2893180,6547869],[85541162,5229766,226564,1545600,1244704,15147,0,119222,4470000,4696498],[66455599,4587436,501828,2141806,883024,37369,1274,57480,5458553,5365739],[53650110,6453363,215298,1990950,1026922,8163,5786,13157,5331511,2347197]],
    study: [[890,0,1,0,0,0,0,141,0,0],[3861,0,226,920,0,0,0,0,0,694],[256888,288,737,0,561,0,0,1102,0,34029],[998437,6345,3706,3069,40,0,2346,4637,4761,3798],[1518150,51348,17890,11232,2421,0,4168,12159,24023,47415],[2746215,256711,15956,27733,2204,266,0,5415,71260,60252],[2858351,282561,106648,171046,10039,189,576,4472,1759,45923],[3033105,428909,28656,284400,44242,1949,85,1706,172501,114385],[4444923,292161,38875,244539,45958,1985,0,9838,5866,596547],[7003361,493571,84101,180274,51503,4214,622,14399,23418,127004],[11785946,505318,252520,189832,107368,3504,672,12693,37703,442815],[30185149,629377,180489,539196,472520,19190,3694,4802,3468,2327804],[33102067,1246894,445642,869563,704154,3034,2229,4643,201004,3239759],[686200117,7075025,295574,1511597,674722,8713,18,56473,577275,7309741],[131755729,4848140,383718,2780313,1588375,6557,57205,27632,2099397,13119533],[242899467,23307847,967428,2331846,1485952,135846,19557,137491,12821410,7802024],[3804853564,78714452,3893203,5092878,3343693,172462,9022,81464,8875763,84080684],[675166862,39365717,2024398,17757186,3903290,3847906,14059,36775,64994573,21997346],[639630726,41300548,2319819,6192039,2794556,32280,610,31986,13637211,16855784],[2235490279,74418245,6086370,354865893,149243467,44529,0,249748,4636384,8065069],[2252559733,264711446,25064254,25492854,6658407,565840,1274,1599386,27102909,23219300],[1876075359,227169160,38563454,10525365,3794572,757633,17342,13301,33241281,21435631]]
  };

  function rows(rule, cumulative) {
    var src = DATA[rule], out = [], acc = null;
    for (var i = 0; i < YEARS.length; i++) {
      var r = src[i].slice();
      if (cumulative) { acc = acc ? acc.map(function (v, k) { return v + r[k]; }) : r.slice(); r = acc.slice(); }
      var reported = 0; for (var k = 0; k < 9; k++) reported += r[k];
      out.push({ year: YEARS[i], counts: r.slice(0, 9), reported: reported, nr: r[9],
        shares: r.slice(0, 9).map(function (v) { return reported ? v / reported : 0; }) });
    }
    return out;
  }
  var core = { YEARS: YEARS, GROUPS: GROUPS, DATA: DATA, rows: rows };
  if (typeof module !== "undefined" && module.exports) { module.exports = core; }
  if (typeof document === "undefined") return;

  /* ------------------------------------------------------------------ UI */
  var root = document.getElementById("w-represent");
  if (!root) return;
  var body = root.querySelector(".widget-body");
  var state = { rule: "pub", cum: false, year: 2026 };

  function millions(v) {
    if (v >= 1e9) return (v / 1e9).toFixed(v >= 1e10 ? 1 : 2) + " billion";
    if (v >= 1e6) return (v / 1e6).toFixed(v >= 1e8 ? 0 : 1) + " million";
    return Math.round(v).toLocaleString("en-US");
  }
  function pct(v) {
    if (v > 0 && v < 0.0005) return "&lt;0.1%";
    return (100 * v).toFixed(v >= 0.1 ? 0 : 1) + "%";
  }

  var legend = GROUPS.map(function (g, k) {
    return '<span class="rp-li"><i class="rp-sw" style="background:' + COLORS[k] + '"></i>' + g + '</span>';
  }).join(" ");
  body.innerHTML =
    '<p class="note">GWAS Catalog, discovery stage, by year of publication (release of 2 November 2026). Each bar shows how the participants with a reported category divide among the Catalog’s broad ancestral categories, and the percentage at the right is the European share. Select a year to see the numbers.</p>' +
    '<div class="controls rp-controls" role="group" aria-label="Counting rule">' +
      '<button type="button" class="btn" data-rule="pub" aria-pressed="true">Per publication</button>' +
      '<button type="button" class="btn" data-rule="study" aria-pressed="false">Per study (each trait counted)</button>' +
    '</div>' +
    '<div class="controls rp-controls" role="group" aria-label="Annual or cumulative">' +
      '<button type="button" class="btn" data-cum="0" aria-pressed="true">Each year</button>' +
      '<button type="button" class="btn" data-cum="1" aria-pressed="false">Cumulative since 2005</button>' +
    '</div>' +
    '<p class="note rp-legend" aria-hidden="true">' + legend + '</p>' +
    '<ol class="rp-bars" id="rp-bars"></ol>' +
    '<div class="readout rp-readout" id="rp-readout" aria-live="polite"></div>';

  function render() {
    var data = rows(state.rule, state.cum);
    var html = "";
    data.forEach(function (d) {
      if (!d.reported) return;
      var segs = d.shares.map(function (s, k) {
        return s > 0 ? '<span class="rp-seg" style="width:' + (100 * s).toFixed(3) + '%;background:' + COLORS[k] + '"></span>' : "";
      }).join("");
      html += '<li' + (d.year === state.year ? ' class="rp-cur"' : "") + '><button type="button" class="rp-row" data-year="' + d.year + '" aria-pressed="' + (d.year === state.year) + '">' +
        '<span class="rp-year">' + d.year + '</span><span class="rp-bar" aria-hidden="true">' + segs + '</span>' +
        '<span class="rp-eu">' + pct(d.shares[0]) + ' Eur.</span></button></li>';
    });
    body.querySelector("#rp-bars").innerHTML = html;
    var d = data[YEARS.indexOf(state.year)];
    var lines = GROUPS.map(function (g, k) {
      return '<tr><td><i class="rp-sw" style="background:' + COLORS[k] + '"></i>' + g + '</td><td>' + millions(d.counts[k]) + '</td><td>' + pct(d.shares[k]) + '</td></tr>';
    }).join("");
    body.querySelector("#rp-readout").innerHTML =
      '<p><strong>' + (state.cum ? "2005–" + d.year : d.year) + (d.year === 2026 ? " (to 2 November)" : "") + ', ' +
      (state.rule === "pub" ? "per publication" : "per study") + ':</strong> ' + millions(d.reported) + ' participants with a reported category; ' +
      millions(d.nr) + ' more not reported (left out of the shares).</p>' +
      '<table class="rp-table"><thead><tr><th scope="col">Category</th><th scope="col">Participants</th><th scope="col">Share</th></tr></thead><tbody>' + lines + '</tbody></table>';
    Array.prototype.forEach.call(body.querySelectorAll("[data-rule]"), function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-rule") === state.rule)); });
    Array.prototype.forEach.call(body.querySelectorAll("[data-cum]"), function (b) { b.setAttribute("aria-pressed", String((b.getAttribute("data-cum") === "1") === state.cum)); });
  }
  body.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b || !body.contains(b)) return;
    if (b.hasAttribute("data-rule")) state.rule = b.getAttribute("data-rule");
    else if (b.hasAttribute("data-cum")) state.cum = b.getAttribute("data-cum") === "1";
    else if (b.hasAttribute("data-year")) state.year = Number(b.getAttribute("data-year"));
    else return;
    render();
  });
  render();
})();
