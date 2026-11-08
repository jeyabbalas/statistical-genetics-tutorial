/* ==========================================================================
   Lecture 1 · Page "linkage-disequilibrium" · Widget "LD decay over
   generations and distance"
   Inputs: physical distance between two SNPs (kb), local recombination rate
   (cM per Mb), number of generations t, and D′ at the start (D′₀).
     map distance            d = rate × distance, in centimorgans (cM); 100 cM = 1 Morgan
     Haldane's map function  θ = ½ · (1 − e^(−2d)), d in Morgans (crossovers as a Poisson process)
     decay of LD             D_t = (1 − θ)^t · D₀, so D′_t = (1 − θ)^t · D′₀ while allele
                             frequencies stay fixed; r²_t = (1 − θ)^(2t) · r²₀
     half-life               t½ = ln 2 / −ln(1 − θ) ≈ 0.69 / θ generations
   Panels: D′ against generations; D′ (and r² for SNPs with equal allele
   frequencies, where r² = D′²) against distance; θ against map distance.
   Deterministic: infinite population, random mating, no drift, mutation,
   selection or migration. No libraries; works from file://. Loadable in node
   for tests (module.exports = Core).
   ========================================================================== */
(function () {
  "use strict";

  var Core = {
    theta: function (dMorgans) { return 0.5 * (1 - Math.exp(-2 * dMorgans)); },
    morgansFromTheta: function (th) { return th >= 0.5 ? Infinity : -0.5 * Math.log(1 - 2 * th); },
    retained: function (th, t) { return Math.pow(1 - th, t); },
    halfLife: function (th) { return th <= 0 ? Infinity : Math.log(2) / -Math.log(1 - th); },
    kbFromSlider: function (v) { return Math.pow(10, v / 25); },            // 0..100 → 1 kb .. 10,000 kb
    genFromSlider: function (v) { return v <= 0 ? 0 : Math.round(Math.pow(10, v / 25)); } // 0..100 → 0, 1 .. 10,000
  };
  if (typeof module !== "undefined" && module.exports) module.exports = Core;
  if (typeof document === "undefined") return;

  var SVGNS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
    if (html != null) n.innerHTML = html;
    return n;
  }
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
  function grp(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function sig(x, n) { // n significant digits, plain decimals
    if (!isFinite(x)) return "∞";
    if (x === 0) return "0";
    var d = Math.max(0, n - 1 - Math.floor(Math.log10(Math.abs(x))));
    return d > 0 ? x.toFixed(Math.min(d, 8)) : grp(Math.round(x));
  }
  function kbLabel(kb) { return kb >= 1000 ? sig(kb / 1000, 3) + " Mb" : sig(kb, 3) + " kb"; }

  var RATES = [
    { v: 0.1, label: "0.1 cM/Mb (little recombination)" },
    { v: 0.5, label: "0.5 cM/Mb" },
    { v: 1.13, label: "1.13 cM/Mb (genome average)" },
    { v: 3, label: "3 cM/Mb" },
    { v: 10, label: "10 cM/Mb (many hotspots)" }
  ];

  function init() {
    var root = document.getElementById("w-ld-decay");
    if (!root) return;
    var body = root.querySelector(".widget-body");
    body.innerHTML = "";
    var S = { dist: 50, rate: 1.13, gen: 75, d0: 1 }; // slider positions: 50 → 100 kb; 75 → 1,000 generations

    var c1 = el("div", { "class": "controls" });
    var sD = el("input", { type: "range", min: "0", max: "100", step: "1", value: String(S.dist), id: "ldd-dist", "aria-label": "Distance between the SNPs" });
    var oD = el("output", { "for": "ldd-dist", "class": "ldd-out" });
    var lD = el("label", null, "Distance "); lD.appendChild(sD); lD.appendChild(oD); c1.appendChild(lD);
    var selR = el("select", { id: "ldd-rate", "aria-label": "Recombination rate" });
    RATES.forEach(function (r) { var o = el("option", { value: String(r.v) }, r.label); if (r.v === S.rate) o.selected = true; selR.appendChild(o); });
    var lR = el("label", null, "Rate "); lR.appendChild(selR); c1.appendChild(lR);
    body.appendChild(c1);
    var c2 = el("div", { "class": "controls" });
    var sG = el("input", { type: "range", min: "0", max: "100", step: "1", value: String(S.gen), id: "ldd-gen", "aria-label": "Generations since the LD arose" });
    var oG = el("output", { "for": "ldd-gen", "class": "ldd-out" });
    var lG = el("label", null, "Generations "); lG.appendChild(sG); lG.appendChild(oG); c2.appendChild(lG);
    var s0 = el("input", { type: "range", min: "0.05", max: "1", step: "0.05", value: String(S.d0), id: "ldd-d0", "aria-label": "D prime at the start" });
    var o0 = el("output", { "for": "ldd-d0", "class": "ldd-out" });
    var l0 = el("label", null, "D′ at the start "); l0.appendChild(s0); l0.appendChild(o0); c2.appendChild(l0);
    body.appendChild(c2);

    var panels = el("div", { "class": "ldd-panels" });
    var pA = el("div", { "class": "ldd-panel" }), pB = el("div", { "class": "ldd-panel" }), pC = el("div", { "class": "ldd-panel ldd-wide" });
    pA.appendChild(el("div", { "class": "ldd-ptitle" }, "D′ over generations"));
    pB.appendChild(el("div", { "class": "ldd-ptitle" }, "D′ and r² against distance, after the chosen number of generations"));
    pC.appendChild(el("div", { "class": "ldd-ptitle" }, "Haldane’s map function: recombination fraction θ against map distance"));
    function sw(color, dashed) { return '<span class="ldd-sw' + (dashed ? " ldd-dash" : "") + '" style="border-color:' + color + '"></span>'; }
    var kA = el("div", { "class": "ldd-key" });
    var kB = el("div", { "class": "ldd-key" }, sw("var(--accent)") + "D′ · " + sw("var(--q2)", true) + "r² for equal allele frequencies (r² = D′²)");
    var kC = el("div", { "class": "ldd-key" }, sw("var(--q3)") + "Haldane: θ = ½(1 − e<sup>−2d</sup>) · " + sw("var(--fg-faint)", true) + "θ = d, close to Haldane only for small d");
    var hA = el("div"), hB = el("div"), hC = el("div");
    pA.appendChild(kA); pB.appendChild(kB); pC.appendChild(kC);
    pA.appendChild(hA); pB.appendChild(hB); pC.appendChild(hC);
    panels.appendChild(pA); panels.appendChild(pB); panels.appendChild(pC);
    body.appendChild(panels);
    var out = el("div", { "class": "readout ldd-readout", "aria-live": "polite" });
    body.appendChild(out);

    function state() {
      var kb = Core.kbFromSlider(S.dist), cM = S.rate * kb / 1000, th = Core.theta(cM / 100), t = Core.genFromSlider(S.gen);
      return { kb: kb, cM: cM, th: th, t: t, keep: Core.retained(th, t) };
    }
    function widthOf(host, fallback) { return Math.max(270, Math.min(host.clientWidth || fallback, 900)); }

    // generic axes on log10 scales
    function frame(host, W, H, opt) {
      var s = svg("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, role: "img", "aria-label": opt.aria }, host);
      var ml = opt.ml || 44, mr = 14, mt = 10, mb = 40, PW = W - ml - mr, PH = H - mt - mb;
      svg("line", { x1: ml, x2: ml + PW, y1: mt + PH, y2: mt + PH, stroke: "var(--border-strong)" }, s);
      svg("line", { x1: ml, x2: ml, y1: mt, y2: mt + PH, stroke: "var(--border-strong)" }, s);
      return { s: s, ml: ml, mt: mt, PW: PW, PH: PH, W: W, H: H };
    }

    function drawA(st) {
      hA.innerHTML = "";
      var W = widthOf(hA, 400), H = 230, F = frame(hA, W, H, { aria: "D prime against generations on a logarithmic axis, for the chosen distance and for reference distances" });
      var s = F.s, xmax = Math.log10(10001); // log10(1 + t), t up to 10,000
      function X(t) { return F.ml + F.PW * Math.log10(1 + t) / xmax; }
      function Y(v) { return F.mt + F.PH * (1 - v); }
      [0, 10, 100, 1000, 10000].forEach(function (t) {
        svg("line", { x1: X(t), x2: X(t), y1: F.mt + F.PH, y2: F.mt + F.PH + 4, stroke: "var(--border-strong)" }, s);
        txt(s, X(t), F.mt + F.PH + 15, grp(t), "t-xs", t === 0 ? "start" : (t === 10000 ? "end" : "middle"));
      });
      [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
        svg("line", { x1: F.ml - 4, x2: F.ml, y1: Y(v), y2: Y(v), stroke: "var(--border-strong)" }, s);
        if (v > 0) svg("line", { x1: F.ml, x2: F.ml + F.PW, y1: Y(v), y2: Y(v), stroke: "var(--border)", "stroke-dasharray": "2 3" }, s);
        txt(s, F.ml - 7, Y(v) + 3.5, String(v), "t-xs", "end");
      });
      txt(s, F.ml + F.PW / 2, H - 6, "generations (logarithmic axis)", "t-xs", "middle");
      var yl = txt(s, 12, F.mt + F.PH / 2, "D′", "t-xs", "middle"); yl.setAttribute("transform", "rotate(-90 12 " + (F.mt + F.PH / 2) + ")");
      function curve(kb, stroke, width, dash) {
        var th = Core.theta(S.rate * kb / 1000 / 100), d = "";
        for (var i = 0; i <= 200; i++) { var t = Math.pow(10, xmax * i / 200) - 1; d += (i ? "L" : "M") + X(t).toFixed(1) + " " + Y(S.d0 * Core.retained(th, t)).toFixed(1); }
        var a = { d: d, fill: "none", stroke: stroke, "stroke-width": width }; if (dash) a["stroke-dasharray"] = dash;
        svg("path", a, s);
        return th;
      }
      [[10, "10 kb"], [100, "100 kb"], [1000, "1 Mb"]].forEach(function (r) {
        var th = curve(r[0], "var(--border-strong)", 1.2, "4 3");
        var th2 = th, tLab = Math.min(9000, Math.max(3, Core.halfLife(th2) * 0.9)), yv = S.d0 * Core.retained(th2, tLab);
        txt(s, X(tLab) + 3, Y(yv) - 4, r[1], "t-xs");
      });
      curve(st.kb, "var(--accent)", 2.4);
      var y = Y(S.d0 * st.keep);
      svg("line", { x1: X(st.t), x2: X(st.t), y1: F.mt, y2: F.mt + F.PH, stroke: "var(--accent)", "stroke-opacity": 0.35 }, s);
      svg("circle", { cx: X(st.t), cy: y, r: 5, fill: "var(--accent)" }, s);
      kA.innerHTML = sw("var(--accent)") + "your distance, " + kbLabel(st.kb) + " · " + sw("var(--border-strong)", true) + "10 kb, 100 kb and 1 Mb, for reference";
    }

    function drawB(st) {
      hB.innerHTML = "";
      var W = widthOf(hB, 400), H = 230, F = frame(hB, W, H, { aria: "D prime and r squared against distance on a logarithmic axis after the chosen number of generations" });
      var s = F.s, x0 = 0, x1 = 4; // log10 kb from 1 kb to 10 Mb
      function X(kb) { return F.ml + F.PW * (Math.log10(kb) - x0) / (x1 - x0); }
      function Y(v) { return F.mt + F.PH * (1 - v); }
      [[1, "1 kb"], [10, "10 kb"], [100, "100 kb"], [1000, "1 Mb"], [10000, "10 Mb"]].forEach(function (p) {
        svg("line", { x1: X(p[0]), x2: X(p[0]), y1: F.mt + F.PH, y2: F.mt + F.PH + 4, stroke: "var(--border-strong)" }, s);
        txt(s, X(p[0]), F.mt + F.PH + 15, p[1], "t-xs", p[0] === 1 ? "start" : (p[0] === 10000 ? "end" : "middle"));
      });
      [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
        svg("line", { x1: F.ml - 4, x2: F.ml, y1: Y(v), y2: Y(v), stroke: "var(--border-strong)" }, s);
        if (v > 0) svg("line", { x1: F.ml, x2: F.ml + F.PW, y1: Y(v), y2: Y(v), stroke: "var(--border)", "stroke-dasharray": "2 3" }, s);
        txt(s, F.ml - 7, Y(v) + 3.5, String(v), "t-xs", "end");
      });
      txt(s, F.ml + F.PW / 2, H - 6, "distance between the SNPs (logarithmic axis)", "t-xs", "middle");
      var dD = "", dR = "";
      for (var i = 0; i <= 200; i++) {
        var kb = Math.pow(10, x0 + (x1 - x0) * i / 200), th = Core.theta(S.rate * kb / 1000 / 100), v = S.d0 * Core.retained(th, st.t);
        dD += (i ? "L" : "M") + X(kb).toFixed(1) + " " + Y(v).toFixed(1);
        dR += (i ? "L" : "M") + X(kb).toFixed(1) + " " + Y(v * v).toFixed(1);
      }
      svg("path", { d: dR, fill: "none", stroke: "var(--q2)", "stroke-width": 2, "stroke-dasharray": "5 3" }, s);
      svg("path", { d: dD, fill: "none", stroke: "var(--accent)", "stroke-width": 2.4 }, s);
      var v0 = S.d0 * st.keep;
      svg("circle", { cx: X(st.kb), cy: Y(v0), r: 5, fill: "var(--accent)" }, s);
      svg("circle", { cx: X(st.kb), cy: Y(v0 * v0), r: 4, fill: "var(--q2)" }, s);
    }

    function drawC(st) {
      hC.innerHTML = "";
      var W = widthOf(hC, 800), H = 210, F = frame(hC, W, H, { ml: 54, aria: "Recombination fraction theta against map distance on logarithmic axes: theta equals d for small distances and approaches one half for large distances" });
      var s = F.s, x0 = -3, x1 = 3, y0 = -5, y1 = Math.log10(0.5); // d from 0.001 to 1,000 cM; θ from 1e-5 to 0.5
      function X(cM) { return F.ml + F.PW * (Math.log10(cM) - x0) / (x1 - x0); }
      function Y(th) { return F.mt + F.PH * (1 - (Math.log10(th) - y0) / (y1 - y0)); }
      [0.001, 0.01, 0.1, 1, 10, 100, 1000].forEach(function (v) {
        svg("line", { x1: X(v), x2: X(v), y1: F.mt + F.PH, y2: F.mt + F.PH + 4, stroke: "var(--border-strong)" }, s);
        txt(s, X(v), F.mt + F.PH + 15, (v < 1 ? String(v) : grp(v)), "t-xs", v === 0.001 ? "start" : (v === 1000 ? "end" : "middle"));
      });
      [[0.00001, "0.00001"], [0.001, "0.001"], [0.1, "0.1"], [0.5, "0.5"]].forEach(function (p) {
        svg("line", { x1: F.ml - 4, x2: F.ml, y1: Y(p[0]), y2: Y(p[0]), stroke: "var(--border-strong)" }, s);
        svg("line", { x1: F.ml, x2: F.ml + F.PW, y1: Y(p[0]), y2: Y(p[0]), stroke: "var(--border)", "stroke-dasharray": "2 3" }, s);
        txt(s, F.ml - 7, Y(p[0]) + 3.5, p[1], "t-xs", "end");
      });
      txt(s, F.ml + F.PW / 2, H - 6, "map distance d in cM (logarithmic axis)", "t-xs", "middle");
      var yl = txt(s, 12, F.mt + F.PH / 2, "θ", "t-xs", "middle"); yl.setAttribute("transform", "rotate(-90 12 " + (F.mt + F.PH / 2) + ")");
      var dI = "", dH = "";
      for (var i = 0; i <= 240; i++) {
        var cM = Math.pow(10, x0 + (x1 - x0) * i / 240);
        if (cM / 100 <= 0.5) dI += (dI ? "L" : "M") + X(cM).toFixed(1) + " " + Y(cM / 100).toFixed(1);
        dH += (i ? "L" : "M") + X(cM).toFixed(1) + " " + Y(Core.theta(cM / 100)).toFixed(1);
      }
      svg("path", { d: dI, fill: "none", stroke: "var(--fg-faint)", "stroke-width": 1.4, "stroke-dasharray": "4 3" }, s);
      svg("path", { d: dH, fill: "none", stroke: "var(--q3)", "stroke-width": 2.4 }, s);
      if (st.cM >= 0.001 && st.cM <= 1000) svg("circle", { cx: X(st.cM), cy: Y(st.th), r: 5, fill: "var(--accent)" }, s);
    }

    function readout(st) {
      var hl = Core.halfLife(st.th);
      out.innerHTML =
        kbLabel(st.kb) + " × " + S.rate + " cM/Mb = " + sig(st.cM, 3) + " cM, so d = " + sig(st.cM / 100, 3) + " Morgans and θ = ½(1 − e<sup>−2d</sup>) = " + sig(st.th, 3) + ".<br>" +
        "Each generation keeps a fraction 1 − θ = " + (1 - st.th).toFixed(st.th < 0.001 ? 6 : 4) + " of D. After " + grp(st.t) + " generation" + (st.t === 1 ? "" : "s") +
        ": (1 − θ)<sup>t</sup> = " + sig(st.keep, 3) + ", so D′ = " + S.d0.toFixed(2) + " × " + sig(st.keep, 3) + " = " + sig(S.d0 * st.keep, 3) +
        " and r² falls to " + sig(st.keep * st.keep, 3) + " of its starting value.<br>" +
        "Half of D is gone after ln 2 / −ln(1 − θ) = " + (isFinite(hl) ? grp(Math.round(hl)) : "∞") + " generations" + (st.th < 0.05 ? " (≈ 0.69/θ)" : "") + ".";
    }

    function update() {
      S.dist = +sD.value; S.rate = +selR.value; S.gen = +sG.value; S.d0 = +s0.value;
      var st = state();
      oD.textContent = kbLabel(st.kb);
      oG.textContent = grp(st.t);
      o0.textContent = S.d0.toFixed(2);
      drawA(st); drawB(st); drawC(st); readout(st);
    }
    [sD, sG, s0].forEach(function (x) { x.addEventListener("input", update); });
    selR.addEventListener("change", update);
    var rz;
    window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(update, 150); });
    update();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
