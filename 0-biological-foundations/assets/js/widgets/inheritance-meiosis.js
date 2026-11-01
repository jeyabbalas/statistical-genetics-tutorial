/* Widget: "Meiosis and sibling sharing simulator" (page: inheritance.html)
   Root element: <div class="widget" id="w-meiosis">.
   Model (stated in the widget note):
   - One autosome. Each parent carries two copies, labeled by the grandparent they came from.
   - A transmitted copy (sperm or egg) starts on a random one of the parent's two copies and switches
     copy at each crossover. Number of crossovers ~ Poisson(map length in Morgans); positions uniform
     along the chromosome (no crossover interference: Haldane's model).
   - Map lengths are sex-specific (father: male map; mother: female map), from the refined genetic maps
     of Bherer et al. 2017 (Nat Commun 8:14994). Physical lengths: GRCh38 (Ensembl).
   - Grandparents and parents are unrelated, so two people share a segment identical by descent (IBD)
     only where they carry copies of the same grandparental chromosome.
   Vanilla JS, no dependencies, works from file://. Core functions are exported for node tests. */
(function () {
  "use strict";

  /* ---------------- Data ---------------- */
  // [chromosome, GRCh38 length (bp), female map length (cM), male map length (cM)]
  var CHR = [
    ["1", 248956422, 327.9, 195.6], ["2", 242193529, 310.7, 186.7], ["3", 198295559, 269.2, 164.5],
    ["4", 190214555, 256.3, 144.1], ["5", 181538259, 246.8, 145.8], ["6", 170805979, 232.4, 135.3],
    ["7", 159345973, 218.7, 133.4], ["8", 145138636, 202.9, 117.1], ["9", 138394717, 186.3, 122.0],
    ["10", 133797422, 203.9, 127.3], ["11", 135086622, 189.1, 118.0], ["12", 133275309, 196.1, 129.2],
    ["13", 114364328, 150.5, 99.7], ["14", 107043718, 135.6, 96.3], ["15", 101991189, 138.6, 98.2],
    ["16", 90338345, 150.6, 99.5], ["17", 83257441, 149.4, 101.0], ["18", 80373285, 138.2, 94.7],
    ["19", 58617616, 115.4, 91.7], ["20", 64444167, 119.1, 94.5], ["21", 46709983, 72.6, 50.3],
    ["22", 50818468, 76.3, 61.0]
  ];
  var TOTAL_BP = CHR.reduce(function (s, c) { return s + c[1]; }, 0);

  /* ---------------- Random numbers (seeded) ---------------- */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function poisson(lambda, rnd) {
    // Knuth's method; fine for the small means used here (< 4)
    var L = Math.exp(-lambda), k = 0, p = 1;
    do { k++; p *= rnd(); } while (p > L);
    return k - 1;
  }

  /* ---------------- Meiosis model ---------------- */
  // A transmitted copy: {start: 0|1, cuts: [sorted positions in (0,1)]}.
  // Origin 0 = the parent's copy from his/her father (grandfather), 1 = from his/her mother (grandmother).
  function makeGamete(mapMorgans, rnd) {
    var k = poisson(mapMorgans, rnd), cuts = [];
    for (var i = 0; i < k; i++) cuts.push(rnd());
    cuts.sort(function (a, b) { return a - b; });
    return { start: rnd() < 0.5 ? 0 : 1, cuts: cuts };
  }
  function originAt(g, x) {
    var n = 0;
    for (var i = 0; i < g.cuts.length && g.cuts[i] <= x; i++) n++;
    return (g.start + n) % 2;
  }
  function segmentsOf(g) {
    var out = [], a = 0, o = g.start;
    for (var i = 0; i < g.cuts.length; i++) { out.push([a, g.cuts[i], o]); a = g.cuts[i]; o = 1 - o; }
    out.push([a, 1, o]);
    return out;
  }
  function makeChild(chrIndex, rnd) {
    var c = CHR[chrIndex];
    return { pat: makeGamete(c[3] / 100, rnd), mat: makeGamete(c[2] / 100, rnd) };
  }
  // IBD segments between two people on one chromosome: [[from, to, nShared], ...]
  //   FS: full siblings (same father and mother) -> compare paternal copies and maternal copies
  //   HS: half siblings with the same father -> compare paternal copies only
  //   PO: parent and child -> the child's paternal copy is always one of the father's two copies
  function ibdSegments(c1, c2, type) {
    if (type === "PO") return [[0, 1, 1]];
    var gs = type === "FS" ? [c1.pat, c2.pat, c1.mat, c2.mat] : [c1.pat, c2.pat];
    var pts = [0, 1];
    gs.forEach(function (g) { pts = pts.concat(g.cuts); });
    pts.sort(function (a, b) { return a - b; });
    var out = [];
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1];
      if (b - a <= 0) continue;
      var m = (a + b) / 2;
      var s = (originAt(c1.pat, m) === originAt(c2.pat, m) ? 1 : 0);
      if (type === "FS") s += (originAt(c1.mat, m) === originAt(c2.mat, m) ? 1 : 0);
      if (out.length && out[out.length - 1][2] === s) out[out.length - 1][1] = b;
      else out.push([a, b, s]);
    }
    return out;
  }
  function summarize(segs) {
    var k = [0, 0, 0];
    segs.forEach(function (s) { k[s[2]] += s[1] - s[0]; });
    return { k0: k[0], k1: k[1], k2: k[2], pi: k[1] / 2 + k[2] };
  }
  // One pair, all 22 autosomes. Returns per-chromosome summaries and the genome-wide (bp-weighted) summary.
  function simulatePairGenome(type, rnd) {
    var per = [], g = { k0: 0, k1: 0, k2: 0, pi: 0 };
    for (var i = 0; i < CHR.length; i++) {
      var c1 = makeChild(i, rnd), c2 = makeChild(i, rnd);
      var s = summarize(ibdSegments(c1, c2, type));
      per.push(s);
      var w = CHR[i][1] / TOTAL_BP;
      g.k0 += w * s.k0; g.k1 += w * s.k1; g.k2 += w * s.k2; g.pi += w * s.pi;
    }
    return { per: per, genome: g };
  }
  // Theory for this model (telegraph process): Var of the fraction of a chromosome on which two
  // gametes from the same parent carry the same grandparental copy; r = switching rate = 2 x map (Morgans).
  function varSame(mapMorgans) {
    var r = 2 * mapMorgans;
    return 1 / (4 * r) - (1 - Math.exp(-2 * r)) / (8 * r * r);
  }
  function theorySD(type, chrIndex) {
    function v(i) {
      if (type === "PO") return 0;
      var vp = varSame(CHR[i][3] / 100), vm = varSame(CHR[i][2] / 100);
      return type === "FS" ? (vp + vm) / 4 : vp / 4;
    }
    if (chrIndex != null) return Math.sqrt(v(chrIndex));
    var tot = 0;
    for (var i = 0; i < CHR.length; i++) { var w = CHR[i][1] / TOTAL_BP; tot += w * w * v(i); }
    return Math.sqrt(tot);
  }
  function expectedPi(type) { return type === "HS" ? 0.25 : 0.5; }
  function meanSD(xs) {
    var n = xs.length, m = 0, v = 0;
    xs.forEach(function (x) { m += x; }); m /= n;
    xs.forEach(function (x) { v += (x - m) * (x - m); });
    return { mean: m, sd: Math.sqrt(v / (n - 1)) };
  }

  var core = {
    CHR: CHR, TOTAL_BP: TOTAL_BP, mulberry32: mulberry32, poisson: poisson, makeGamete: makeGamete,
    originAt: originAt, segmentsOf: segmentsOf, makeChild: makeChild, ibdSegments: ibdSegments,
    summarize: summarize, simulatePairGenome: simulatePairGenome, theorySD: theorySD, varSame: varSame,
    expectedPi: expectedPi, meanSD: meanSD
  };
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  if (typeof document === "undefined") return;

  /* ---------------- DOM rendering ---------------- */
  var SVGNS = "http://www.w3.org/2000/svg";
  var SEED = 20261021;
  var NREP = 500;
  var COL = {
    pat: ["var(--pat)", "var(--pat-fill)"],          // father's copies: from paternal grandfather / grandmother
    mat: ["var(--mat)", "var(--mat-fill)"],          // mother's copies: from maternal grandfather / grandmother
    other: ["var(--fg-faint)", "var(--bg-sunk)"],    // another (unrelated) mother, for half siblings
    ibd: ["var(--g0)", "var(--g1)", "var(--g2)"]
  };
  var GP = { pat: ["paternal grandfather", "paternal grandmother"], mat: ["maternal grandfather", "maternal grandmother"] };

  function svgEl(tag, attrs, text) {
    var n = document.createElementNS(SVGNS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }
  function fmtMb(x, chrIndex) { return (x * CHR[chrIndex][1] / 1e6).toFixed(1); }
  function pct(x) { return Math.round(100 * x) + "%"; }

  function init() {
    var root = document.getElementById("w-meiosis");
    if (!root) return;
    var body = root.querySelector(".widget-body");
    if (!body) return;

    var selChr = root.querySelector("#w-meiosis-chr");
    var selPair = root.querySelector("#w-meiosis-pair");
    var host = root.querySelector("#w-meiosis-main");
    var out = root.querySelector("#w-meiosis-readout");
    var histHost = root.querySelector("#w-meiosis-hist");
    var histOut = root.querySelector("#w-meiosis-hist-readout");
    if (!selChr || !selPair || !host || !out || !histHost || !histOut) return;

    // populate chromosome menu
    if (!selChr.options.length) {
      CHR.forEach(function (c, i) {
        var o = document.createElement("option");
        o.value = String(i);
        o.textContent = "Chromosome " + c[0];
        selChr.appendChild(o);
      });
    }

    var rnd, state;
    function reset() {
      rnd = mulberry32(SEED);
      selChr.value = "0";
      selPair.value = "FS";
      state = { chr: 0, type: "FS", c1: null, c2: null, highlight: null, note: "", hist: null };
      newChildren();
      runHist();
      draw();
    }
    function newChildren() {
      state.c1 = makeChild(state.chr, rnd);
      state.c2 = makeChild(state.chr, rnd);
      state.highlight = null;
      state.note = "";
    }

    function draw() {
      drawMain();
      drawHist();
    }

    /* ----- main panel ----- */
    function drawMain() {
      var W = Math.max(300, Math.round(host.clientWidth || 640));
      var narrow = W < 560;
      var labelW = narrow ? 66 : 112;
      var rightW = narrow ? 6 : 150;
      var x0 = labelW, x1 = W - rightW, bw = x1 - x0;
      var barH = 12, step = 18;
      var type = state.type, ci = state.chr;
      var isPO = type === "PO", isHS = type === "HS";

      var rows = [];
      var y = 14;
      // parents
      rows.push({ group: "Father", y: y, segs: [[0, 1, 0]], pal: COL.pat, note: "copy from his father" }); y += step;
      rows.push({ group: "", y: y, segs: [[0, 1, 1]], pal: COL.pat, note: "copy from his mother" }); y += step + 8;
      rows.push({ group: "Mother", y: y, segs: [[0, 1, 0]], pal: COL.mat, note: "copy from her father" }); y += step;
      rows.push({ group: "", y: y, segs: [[0, 1, 1]], pal: COL.mat, note: "copy from her mother" }); y += step;
      var sep1 = y + 4; y += 18;
      // child 1
      rows.push({ group: isPO ? "Child" : "Child 1", y: y, segs: segmentsOf(state.c1.pat), pal: COL.pat, cuts: state.c1.pat.cuts,
                  note: "sperm · " + state.c1.pat.cuts.length + " crossover" + (state.c1.pat.cuts.length === 1 ? "" : "s"), key: "c1pat" }); y += step;
      rows.push({ group: "", y: y, segs: segmentsOf(state.c1.mat), pal: COL.mat, cuts: state.c1.mat.cuts,
                  note: "egg · " + state.c1.mat.cuts.length + " crossover" + (state.c1.mat.cuts.length === 1 ? "" : "s"), key: "c1mat" }); y += step + 8;
      if (!isPO) {
        rows.push({ group: "Child 2", y: y, segs: segmentsOf(state.c2.pat), pal: COL.pat, cuts: state.c2.pat.cuts,
                    note: "sperm · " + state.c2.pat.cuts.length + " crossover" + (state.c2.pat.cuts.length === 1 ? "" : "s"), key: "c2pat" }); y += step;
        rows.push({ group: "", y: y, segs: segmentsOf(state.c2.mat), pal: isHS ? COL.other : COL.mat, cuts: state.c2.mat.cuts,
                    note: (isHS ? "egg of another mother" : "egg · " + state.c2.mat.cuts.length + " crossover" + (state.c2.mat.cuts.length === 1 ? "" : "s")), key: "c2mat" }); y += step;
      }
      var sep2 = y + 4; y += 18;
      var ibdY = y;
      var segs = ibdSegments(state.c1, state.c2, type);
      var sum = summarize(segs);
      y += 16 + 8;
      var axisY = y;
      var H = axisY + 30;

      var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, role: "img",
        "aria-label": "Simulated transmission of chromosome " + CHR[ci][0] + ". " + (isPO ? "Father and child" : "The two children") +
          " share 0, 1 and 2 copies identical by descent on " + pct(sum.k0) + ", " + pct(sum.k1) + " and " + pct(sum.k2) + " of the chromosome." });

      // separators
      [sep1, sep2].forEach(function (sy) { svg.appendChild(svgEl("line", { x1: 4, x2: W - 4, y1: sy, y2: sy, stroke: "var(--border)", "stroke-width": 1 })); });

      rows.forEach(function (r) {
        if (r.group) svg.appendChild(svgEl("text", { x: 4, y: r.y + barH - 1, "class": narrow ? "t-sm" : "t-b" }, r.group));
        var g = svgEl("g");
        r.segs.forEach(function (s) {
          g.appendChild(svgEl("rect", { x: (x0 + s[0] * bw).toFixed(2), y: r.y, width: Math.max(0.5, (s[1] - s[0]) * bw).toFixed(2), height: barH, fill: r.pal[s[2]] }));
        });
        g.appendChild(svgEl("rect", { x: x0, y: r.y, width: bw, height: barH, rx: 3, fill: "none", stroke: "var(--fg-muted)", "stroke-width": 0.8 }));
        if (state.highlight && r.key === state.highlight) {
          g.appendChild(svgEl("rect", { x: x0 - 3, y: r.y - 3, width: bw + 6, height: barH + 6, rx: 5, fill: "none", stroke: "var(--accent)", "stroke-width": 2 }));
        }
        (r.cuts || []).forEach(function (c) {
          var cx = x0 + c * bw;
          g.appendChild(svgEl("line", { x1: cx, x2: cx, y1: r.y - 3, y2: r.y + barH + 3, stroke: "var(--fg)", "stroke-width": 1.6 }));
        });
        svg.appendChild(g);
        if (!narrow) svg.appendChild(svgEl("text", { x: x1 + 10, y: r.y + barH - 2, "class": "t-sm" }, r.note));
      });

      // IBD track
      svg.appendChild(svgEl("text", { x: 4, y: ibdY + 12, "class": narrow ? "t-sm" : "t-b" }, narrow ? "Shared" : "Shared IBD"));
      segs.forEach(function (s) {
        svg.appendChild(svgEl("rect", { x: (x0 + s[0] * bw).toFixed(2), y: ibdY, width: Math.max(0.5, (s[1] - s[0]) * bw).toFixed(2), height: 16, fill: COL.ibd[s[2]] }));
        var wpx = (s[1] - s[0]) * bw;
        if (wpx > 16) svg.appendChild(svgEl("text", { x: (x0 + (s[0] + s[1]) / 2 * bw).toFixed(1), y: ibdY + 12, "text-anchor": "middle",
          "class": "t-sm", style: "fill:" + (s[2] === 2 ? "var(--bg)" : "var(--fg)") + ";font-weight:700" }, String(s[2])));
      });
      svg.appendChild(svgEl("rect", { x: x0, y: ibdY, width: bw, height: 16, rx: 3, fill: "none", stroke: "var(--fg-muted)", "stroke-width": 0.8 }));
      if (!narrow) {
        svg.appendChild(svgEl("text", { x: x1 + 10, y: ibdY + 6, "class": "t-sm" }, "IBD0 " + pct(sum.k0) + " · IBD1 " + pct(sum.k1)));
        svg.appendChild(svgEl("text", { x: x1 + 10, y: ibdY + 20, "class": "t-sm" }, "IBD2 " + pct(sum.k2)));
      }

      // axis in Mb
      var L = CHR[ci][1] / 1e6;
      var stepMb = L > 150 ? 50 : (L > 80 ? 25 : 10);
      svg.appendChild(svgEl("line", { x1: x0, x2: x1, y1: axisY, y2: axisY, stroke: "var(--fg-faint)", "stroke-width": 1 }));
      for (var t = 0; t <= L + 1e-9; t += stepMb) {
        var tx = x0 + t / L * bw;
        if (x1 - tx < (narrow ? 22 : 30) && t > 0) continue;
        svg.appendChild(svgEl("line", { x1: tx, x2: tx, y1: axisY, y2: axisY + 4, stroke: "var(--fg-faint)" }));
        svg.appendChild(svgEl("text", { x: tx, y: axisY + 15, "text-anchor": "middle", "class": "t-sm" }, String(t)));
      }
      svg.appendChild(svgEl("line", { x1: x1, x2: x1, y1: axisY, y2: axisY + 4, stroke: "var(--fg-faint)" }));
      svg.appendChild(svgEl("text", { x: x1, y: axisY + 15, "text-anchor": narrow ? "end" : "middle", "class": "t-sm" }, L.toFixed(0)));
      svg.appendChild(svgEl("text", { x: x0, y: axisY + 28, "class": "t-sm" }, "Position on chromosome " + CHR[ci][0] + " (Mb, GRCh38)"));

      host.innerHTML = "";
      host.appendChild(svg);

      // text readout
      var c = CHR[ci];
      var lines = [];
      lines.push("Chromosome " + c[0] + ": map length " + c[3].toFixed(0) + " cM in sperm, " + c[2].toFixed(0) + " cM in eggs → on average " +
        (c[3] / 100).toFixed(1) + " crossovers per sperm and " + (c[2] / 100).toFixed(1) + " per egg.");
      if (state.note) lines.push(state.note);
      if (isPO) {
        lines.push("Father and child share exactly one copy IBD along the whole chromosome (IBD1 = 100%): the child's paternal copy is always made of segments of the father's own two copies, so at every position it matches one of them.");
      } else {
        lines.push((isHS ? "Half siblings" : "These siblings") + " share 0 copies on " + pct(sum.k0) + ", 1 copy on " + pct(sum.k1) + " and 2 copies on " + pct(sum.k2) +
          " of the chromosome → proportion IBD = IBD1/2 + IBD2 = " + sum.pi.toFixed(2) + " (kinship = " + (sum.pi / 2).toFixed(3) + ").");
      }
      out.innerHTML = lines.map(function (s) { return "<div>" + s + "</div>"; }).join("");
    }

    /* ----- histogram ----- */
    function runHist() {
      var chrVals = [], genVals = [], k = [0, 0, 0];
      for (var r = 0; r < NREP; r++) {
        var res = simulatePairGenome(state.type, rnd);
        chrVals.push(res.per[state.chr].pi);
        genVals.push(res.genome.pi);
        k[0] += res.genome.k0; k[1] += res.genome.k1; k[2] += res.genome.k2;
      }
      state.hist = { chr: state.chr, type: state.type, chrVals: chrVals, genVals: genVals, k: k.map(function (x) { return x / NREP; }) };
    }

    function drawHist() {
      var h = state.hist;
      if (!h) return;
      var W = Math.max(300, Math.round(histHost.clientWidth || 640));
      var narrow = W < 560;
      var padL = narrow ? 10 : 16, padR = narrow ? 10 : 16;
      var x0 = padL, x1 = W - padR, bw = x1 - x0;
      var panelH = 74, gap = 34, top = 22;
      var H = top + 2 * panelH + gap + 40;
      var nb = 50;
      var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, role: "img",
        "aria-label": "Histograms of the proportion of the genome shared identical by descent in " + NREP + " simulated pairs." });

      function panel(vals, py, label, theory) {
        var counts = new Array(nb).fill(0);
        vals.forEach(function (v) { var b = Math.min(nb - 1, Math.max(0, Math.floor(v * nb + 1e-7))); counts[b]++; });  // 1e-7 absorbs rounding, so exact 0.5 values share one bin
        var maxC = Math.max.apply(null, counts) || 1;
        var ms = meanSD(vals);
        svg.appendChild(svgEl("text", { x: x0, y: py - 8, "class": "t-b" }, label));
        var stat = "mean " + ms.mean.toFixed(3) + " · SD " + ms.sd.toFixed(3) + (narrow ? "" : " (model theory: " + theory.toFixed(3) + ")");
        svg.appendChild(svgEl("text", { x: x1, y: py - 8, "text-anchor": "end", "class": "t-sm" }, stat));
        svg.appendChild(svgEl("line", { x1: x0, x2: x1, y1: py + panelH, y2: py + panelH, stroke: "var(--fg-faint)" }));
        for (var i = 0; i < nb; i++) {
          if (!counts[i]) continue;
          var hh = counts[i] / maxC * (panelH - 6);
          svg.appendChild(svgEl("rect", { x: (x0 + i / nb * bw + 0.5).toFixed(2), y: (py + panelH - hh).toFixed(2), width: Math.max(1, bw / nb - 1).toFixed(2), height: hh.toFixed(2), fill: "var(--accent)", "fill-opacity": 0.75 }));
        }
        var ex = expectedPi(h.type);
        var exX = x0 + ex * bw;
        svg.appendChild(svgEl("line", { x1: exX, x2: exX, y1: py - 2, y2: py + panelH, stroke: "var(--fg)", "stroke-dasharray": "4 3", "stroke-width": 1.2 }));
      }
      var cname = "Chromosome " + CHR[h.chr][0] + " only";
      panel(h.chrVals, top, cname, theorySD(h.type, h.chr));
      panel(h.genVals, top + panelH + gap, "All 22 autosomes", theorySD(h.type, null));
      // shared x axis ticks
      var ay = top + 2 * panelH + gap;
      for (var t = 0; t <= 10; t++) {
        var tx = x0 + t / 10 * bw;
        svg.appendChild(svgEl("line", { x1: tx, x2: tx, y1: ay, y2: ay + 4, stroke: "var(--fg-faint)" }));
        if (!narrow || t % 2 === 0) svg.appendChild(svgEl("text", { x: tx, y: ay + 16, "text-anchor": "middle", "class": "t-sm" }, (t / 10).toFixed(1)));
      }
      svg.appendChild(svgEl("text", { x: (x0 + x1) / 2, y: ay + 32, "text-anchor": "middle", "class": "t-sm" },
        narrow ? "Proportion shared IBD (dashed: expected)" : "Proportion shared IBD (IBD1/2 + IBD2); dashed line = expected value"));
      histHost.innerHTML = "";
      histHost.appendChild(svg);

      var who = h.type === "FS" ? "full-sibling pairs" : (h.type === "HS" ? "half-sibling pairs" : "parent–child pairs");
      histOut.innerHTML = "<div>" + NREP + " simulated " + who + ", all 22 autosomes: average IBD0 / IBD1 / IBD2 = " +
        h.k[0].toFixed(3) + " / " + h.k[1].toFixed(3) + " / " + h.k[2].toFixed(3) + ".</div>" +
        // on narrow screens the histogram labels omit the theoretical SD, so give it here
        (narrow ? "<div>Model theory SD: chromosome " + CHR[h.chr][0] + " " + theorySD(h.type, h.chr).toFixed(3) +
          "; all 22 autosomes " + theorySD(h.type, null).toFixed(3) + ".</div>" : "");
    }

    /* ----- actions ----- */
    function describeGamete(g, which) {
      var parts = segmentsOf(g).map(function (s) {
        return fmtMb(s[0], state.chr) + "–" + fmtMb(s[1], state.chr) + " Mb from the " + GP[which][s[2]] + "'s copy";
      });
      var n = g.cuts.length;
      return "New " + (which === "pat" ? "sperm" : "egg") + " for " + (state.type === "PO" ? "the child" : "child 1") + ": " + n + " crossover" + (n === 1 ? "" : "s") + ". " + parts.join("; ") + ".";
    }
    function onSperm() {
      var c = CHR[state.chr];
      state.c1.pat = makeGamete(c[3] / 100, rnd);
      state.highlight = "c1pat";
      state.note = describeGamete(state.c1.pat, "pat");
      drawMain();
    }
    function onEgg() {
      var c = CHR[state.chr];
      state.c1.mat = makeGamete(c[2] / 100, rnd);
      state.highlight = "c1mat";
      state.note = describeGamete(state.c1.mat, "mat");
      drawMain();
    }
    function onChildren() { newChildren(); drawMain(); }
    function onRepeat() { runHist(); drawHist(); }

    function bind(id, fn) { var b = root.querySelector(id); if (b) b.addEventListener("click", fn); }
    bind("#w-meiosis-sperm", onSperm);
    bind("#w-meiosis-egg", onEgg);
    bind("#w-meiosis-kids", onChildren);
    bind("#w-meiosis-repeat", onRepeat);
    bind("#w-meiosis-reset", reset);
    selChr.addEventListener("change", function () {
      state.chr = parseInt(selChr.value, 10) || 0;
      newChildren(); runHist(); draw();
    });
    selPair.addEventListener("change", function () {
      state.type = selPair.value;
      state.highlight = null; state.note = "";
      runHist(); draw();
    });
    var lastW = 0, timer = null;
    window.addEventListener("resize", function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var w = host.clientWidth;
        if (Math.abs(w - lastW) > 8) { lastW = w; draw(); }
      }, 120);
    });

    reset();
    lastW = host.clientWidth;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
