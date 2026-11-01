/* ==========================================================================
   Lecture 0 · Page "haplotypes-ld" · Widget "LD calculator"
   Type the four two-locus haplotype counts (AG, Ag, aG, ag; Lecture 1 notation,
   slides 118–124) and see p_A, p_G, D, D_max, D′, r and r², plus a unit-square
   plot of P(G | A) and P(G | a). No libraries; works from file://.
   Also loadable in node for tests (module.exports = { compute }).
   ========================================================================== */
(function () {
  "use strict";

  function compute(nAG, nAg, naG, nag) {
    var n = nAG + nAg + naG + nag;
    if (!(n > 0)) return null;
    var pA = (nAG + nAg) / n, pG = (nAG + naG) / n, pAG = nAG / n;
    var pa = 1 - pA, pg = 1 - pG;
    var D = pAG - pA * pG;
    var Dmax = D >= 0 ? Math.min(pA * pg, pa * pG) : Math.min(pA * pG, pa * pg);
    var den = pA * pa * pG * pg;
    var lo = Math.min(pA, pa), hi = Math.min(pG, pg); // minor allele frequencies
    var m1 = Math.min(lo, hi), m2 = Math.max(lo, hi);
    return {
      n: n, pA: pA, pa: pa, pG: pG, pg: pg, pAG: pAG, D: D, Dmax: Dmax,
      Dprime: Dmax > 0 ? D / Dmax : NaN,
      r: den > 0 ? D / Math.sqrt(den) : NaN,
      r2: den > 0 ? D * D / den : NaN,
      GgivenA: pA > 0 ? nAG / (nAG + nAg) : NaN,
      Ggivena: pa > 0 ? naG / (naG + nag) : NaN,
      r2max: m2 > 0 && m1 > 0 ? m1 * (1 - m2) / ((1 - m1) * m2) : NaN
    };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { compute: compute };
  if (typeof document === "undefined") return;

  var SVGNS = "http://www.w3.org/2000/svg";
  function svg(tag, attrs, parent) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function txt(parent, x, y, s, cls, anchor) {
    var t = svg("text", { x: x, y: y, "class": cls || "t-xs" }, parent);
    if (anchor) t.setAttribute("text-anchor", anchor);
    t.textContent = s;
    return t;
  }
  function f(x, d) {
    if (!isFinite(x)) return "undefined";
    var s = x.toFixed(d);
    if (/^-0(\.0+)?$/.test(s)) s = s.slice(1);          // no "−0.000"
    return s.charAt(0) === "-" ? "−" + s.slice(1) : s; // typographic minus
  }
  function sub(a, b) { return a + "<sub>" + b + "</sub>"; }

  var PRESETS = [
    { label: "Slide 124 example", v: [8, 2, 0, 6] },
    { label: "No LD", v: [30, 20, 30, 20] },
    { label: "Weak LD", v: [35, 15, 25, 25] },
    { label: "Perfect LD (r² = 1)", v: [40, 0, 0, 60] },
    { label: "D′ = 1 but r² small", v: [5, 45, 0, 50] },
    { label: "Negative D", v: [0, 50, 40, 10] }
  ];

  function init() {
    var root = document.getElementById("w-ld-calc");
    if (!root) return;
    var body = root.querySelector(".widget-body");
    if (!body) return;
    body.innerHTML = "";

    var pre = document.createElement("div");
    pre.className = "controls";
    pre.appendChild(document.createTextNode("Presets: "));
    PRESETS.forEach(function (p, i) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "btn"; b.id = "ldc-preset-" + i; b.textContent = p.label;
      b.addEventListener("click", function () { setVals(p.v); });
      pre.appendChild(b);
    });
    body.appendChild(pre);

    var grid = document.createElement("div");
    grid.className = "ldc-grid";
    body.appendChild(grid);

    // input table: rows G, g; columns A, a (as on slides 118–124)
    var tblWrap = document.createElement("div");
    tblWrap.className = "ldc-table";
    tblWrap.innerHTML =
      '<table class="compact"><caption>Haplotype counts (type to change them)</caption>' +
      '<thead><tr><th></th><th class="num">A</th><th class="num">a</th><th class="num">total</th></tr></thead><tbody>' +
      '<tr><th>G</th><td class="num"><input type="number" min="0" step="1" id="ldc-AG" aria-label="count of haplotype AG"></td><td class="num"><input type="number" min="0" step="1" id="ldc-aG" aria-label="count of haplotype aG"></td><td class="num" id="ldc-nG"></td></tr>' +
      '<tr><th>g</th><td class="num"><input type="number" min="0" step="1" id="ldc-Ag" aria-label="count of haplotype Ag"></td><td class="num"><input type="number" min="0" step="1" id="ldc-ag" aria-label="count of haplotype ag"></td><td class="num" id="ldc-ng"></td></tr>' +
      '<tr><th>total</th><td class="num" id="ldc-nA"></td><td class="num" id="ldc-na"></td><td class="num" id="ldc-n"></td></tr>' +
      "</tbody></table>";
    grid.appendChild(tblWrap);

    var plotWrap = document.createElement("div");
    plotWrap.className = "ldc-plot";
    grid.appendChild(plotWrap);

    var readout = document.createElement("div");
    readout.className = "readout ldc-readout";
    readout.setAttribute("aria-live", "polite");
    body.appendChild(readout);

    var inputs = {
      AG: tblWrap.querySelector("#ldc-AG"), Ag: tblWrap.querySelector("#ldc-Ag"),
      aG: tblWrap.querySelector("#ldc-aG"), ag: tblWrap.querySelector("#ldc-ag")
    };
    Object.keys(inputs).forEach(function (k) { inputs[k].addEventListener("input", update); });

    function setVals(v) {
      inputs.AG.value = v[0]; inputs.Ag.value = v[1]; inputs.aG.value = v[2]; inputs.ag.value = v[3];
      update();
    }
    function val(el) { var x = parseFloat(el.value); return isFinite(x) && x >= 0 ? x : 0; }

    function update() {
      var AG = val(inputs.AG), Ag = val(inputs.Ag), aG = val(inputs.aG), ag = val(inputs.ag);
      var setCell = function (id, x) { tblWrap.querySelector(id).textContent = String(Math.round(x * 1000) / 1000); };
      setCell("#ldc-nG", AG + aG); setCell("#ldc-ng", Ag + ag); setCell("#ldc-nA", AG + Ag); setCell("#ldc-na", aG + ag); setCell("#ldc-n", AG + Ag + aG + ag);
      var s = compute(AG, Ag, aG, ag);
      drawPlot(s);
      if (!s) { readout.innerHTML = "<div>Enter at least one count above zero.</div>"; return; }
      var lines = [];
      lines.push("n = " + s.n + " chromosome copies · " + sub("p", "A") + " = " + f(s.pA, 3) + " · " + sub("p", "G") + " = " + f(s.pG, 3));
      lines.push(sub("p", "AG") + " = " + f(s.pAG, 4) + " observed vs " + sub("p", "A") + sub("p", "G") + " = " + f(s.pA * s.pG, 4) + " expected with no LD");
      lines.push("D = " + sub("p", "AG") + " − " + sub("p", "A") + sub("p", "G") + " = <b>" + f(s.D, 4) + "</b>" +
        (isFinite(s.GgivenA) && isFinite(s.Ggivena) ? " &nbsp;(= " + sub("p", "A") + sub("p", "a") + " × [P(G|A) − P(G|a)] = " + f(s.pA * s.pa, 4) + " × " + f(s.GgivenA - s.Ggivena, 3) + ")" : ""));
      if (isFinite(s.Dprime)) {
        lines.push((s.D >= 0 ? sub("D", "max") + " = min(" + sub("p", "A") + sub("p", "g") + ", " + sub("p", "a") + sub("p", "G") + ")" : "|" + sub("D", "min") + "| = min(" + sub("p", "A") + sub("p", "G") + ", " + sub("p", "a") + sub("p", "g") + ")") +
          " = " + f(s.Dmax, 4) + " → D′ = <b>" + f(s.Dprime, 3) + "</b>" + (Math.abs(Math.abs(s.Dprime) - 1) < 1e-12 ? " (one haplotype is missing)" : ""));
      } else lines.push("D′ is undefined: at least one SNP is monomorphic (only one allele present).");
      if (isFinite(s.r2)) {
        lines.push("r² = D² / (" + sub("p", "A") + sub("p", "a") + sub("p", "G") + sub("p", "g") + ") = <b>" + f(s.r2, 3) + "</b> (r = " + (s.r >= 0 ? "+" : "") + f(s.r, 3) + ") · highest r² possible with these allele frequencies: " + f(s.r2max, 3));
      } else lines.push("r² is undefined: at least one SNP is monomorphic.");
      readout.innerHTML = lines.map(function (l) { return "<div>" + l + "</div>"; }).join("");
    }

    function drawPlot(s) {
      plotWrap.innerHTML = "";
      var W = 280, H = 236, x0 = 40, y0 = 14, w = 200, h = 180;
      var g = svg("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "class": "ldc-svg",
        "aria-label": "Unit-square plot: column widths are the frequencies of A and a; the dark part of each column is the share of copies carrying G" }, plotWrap);
      if (!s) { txt(g, W / 2, H / 2, "no data", "t-sm", "middle"); return; }
      var wA = s.pA * w, labels = [];
      [[x0, wA, s.GgivenA, "A"], [x0 + wA, w - wA, s.Ggivena, "a"]].forEach(function (c) {
        if (c[1] <= 0.5) return;
        var fr = isFinite(c[2]) ? c[2] : 0;
        svg("rect", { x: c[0], y: y0, width: c[1] - 1, height: h * (1 - fr), fill: "var(--g0)" }, g);
        svg("rect", { x: c[0], y: y0 + h * (1 - fr), width: c[1] - 1, height: h * fr, fill: "var(--g2)" }, g);
        txt(g, c[0] + c[1] / 2, y0 + h + 14, c[3] + " (" + (c[3] === "A" ? s.pA : s.pa).toFixed(3) + ")", "t-xs", "middle");
        if (c[1] > 34 && isFinite(c[2])) labels.push([c[0] + c[1] / 2, fr]);
      });
      var yE = y0 + h * (1 - s.pG);
      svg("line", { x1: x0 - 4, x2: x0 + w + 4, y1: yE, y2: yE, stroke: "#1d2127", "stroke-width": 1.3, "stroke-dasharray": "5 3" }, g);
      // percent labels go on top of the p_G line; dark labels get a white halo so the line never strikes through them
      labels.forEach(function (l) {
        var fr = l[1], inside = fr > 0.12, yl = y0 + h * (1 - fr) + (inside ? 14 : -5);
        if (!inside && yE > yl - 10 && yE < yl + 3) yl = yE - 4; // keep the label clear of the p_G line
        var t = txt(g, l[0], yl, (fr * 100).toFixed(0) + "% G", "t-xs", "middle");
        t.setAttribute("style", (inside ? "fill:#fff;stroke:var(--g2)" : "fill:#1d2127;stroke:#fff") + ";paint-order:stroke;stroke-width:3px;stroke-linejoin:round");
      });
      txt(g, x0 + w + 6, yE + 4, "p", "t-xs");
      var tG = txt(g, x0 + w + 13, yE + 7, "G", "t-xs"); tG.setAttribute("style", "font-size:8px");
      txt(g, x0 - 6, y0 + 8, "1", "t-xs", "end");
      txt(g, x0 - 6, y0 + h, "0", "t-xs", "end");
      txt(g, x0, y0 + h + 30, "column width = allele frequency at SNP 1", "t-xs");
    }

    setVals(PRESETS[0].v);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
