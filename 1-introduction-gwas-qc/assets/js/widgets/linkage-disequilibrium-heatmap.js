/* ==========================================================================
   Lecture 1 · Page "linkage-disequilibrium" · Widget "LD heatmaps of one region
   in two simulated populations"
   1. Simulates the ancestry of a 200-kb region for 200 chromosome copies
      (100 people) from each of two populations with the coalescent with
      recombination (Hudson's algorithm, tracked at 48 candidate SNP sites).
      Demography simplified from the out-of-Africa model of Gutenkunst et al.
      (2009), in generations before the present:
        "AFR-like": N = 12,300 back to 8,800 generations, then 7,300 (ancestral).
        "EUR-like": grows from 1,000 (848 generations ago) to 29,700 today
          (approximated by four constant-size epochs), N = 2,100 from 848 to
          5,600 generations ago (bottleneck), then merges into the AFR-like one.
        Migration between the two: 25 × 10⁻⁵ per lineage per generation during
          the bottleneck, 3 × 10⁻⁵ afterwards.
      Recombination map: 0.47 cM/Mb background plus four 2-kb hotspots of
      0.034 cM each (about 60% of the region's 0.23 cM, ≈ 1.13 cM/Mb overall).
   2. Places one mutation per site on a branch of that site's genealogy, chosen
      with probability proportional to branch length among branches that give a
      minor allele frequency ≥ 5% in both populations (so both heatmaps show the
      same SNPs).
   3. For every pair of SNPs in each population computes, from phased haplotypes,
      D = p_AG − p_A·p_G, D′ = D / D_max, r² = D² / (p_A p_a p_G p_g) and
      LOD = log10 L(estimated haplotype frequencies) / L(no LD); or, from unphased
      genotypes (people = consecutive pairs of copies), r² = squared Pearson
      correlation of allele counts (as plink --r2) and D′, LOD from EM haplotype
      frequencies (two starts; the higher likelihood is kept).
   4. Draws Haploview-style triangles (r²: white → black; D′/LOD: white D′ < 1 &
      LOD < 2, blue D′ = 1 & LOD < 2, pink to red D′ < 1 & LOD ≥ 2, bright red
      D′ = 1 & LOD ≥ 2) and counts greedy tag SNPs at r² ≥ 0.8.
   Seeded generator (mulberry32): the first view is the same for every reader.
   No libraries; works from file://. Loadable in node for tests (module.exports = Core).
   ========================================================================== */
(function () {
  "use strict";

  /* ======================= Core (pure functions) ======================= */
  var Core = (function () {
    function mulberry32(a) {
      return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    function harmonicGrowth(Nnow, g, a, b) { // N(t) = Nnow·e^(−g t) backwards in time; harmonic mean on [a, b)
      return (g * (b - a) * Nnow) / (Math.exp(g * b) - Math.exp(g * a));
    }
    function demography() {
      var e1 = [], b = [0, 212, 424, 636, 848];
      for (var i = 0; i < 4; i++) e1.push({ start: b[i], v: harmonicGrowth(29700, 0.004, b[i], b[i + 1]) });
      e1.push({ start: 848, v: 2100 });
      return { pop0: [{ start: 0, v: 12300 }, { start: 8800, v: 7300 }], pop1: e1, split: 5600,
        mig: [{ start: 0, v: 3e-5 }, { start: 848, v: 25e-5 }] };
    }
    function valueAt(E, t) { var v = E[0].v; for (var i = 0; i < E.length; i++) if (t >= E[i].start) v = E[i].v; return v; }
    function nextBoundary(dem, t) {
      var b = Infinity;
      [dem.pop0, dem.pop1, dem.mig].forEach(function (E) { E.forEach(function (e) { if (e.start > t + 1e-9 && e.start < b) b = e.start; }); });
      if (dem.split > t + 1e-9 && dem.split < b) b = dem.split;
      return b;
    }
    function makeMap(rng, L) {
      var hs = [], tries = 0;
      while (hs.length < 4 && tries < 1000) {
        tries++;
        var c = 15000 + Math.floor(rng() * (L - 30000)), ok = true;
        for (var i = 0; i < hs.length; i++) if (Math.abs(hs[i].center - c) < 25000) ok = false;
        if (ok) hs.push({ center: c, width: 2000, cM: 0.0339 });
      }
      hs.sort(function (a, b) { return a.center - b.center; });
      return { L: L, bg: 0.47, hotspots: hs };
    }
    function cumMorgans(map, x) {
      var cM = map.bg * x / 1e6;
      map.hotspots.forEach(function (h) {
        var a = h.center - h.width / 2, b = h.center + h.width / 2;
        if (x > a) cM += h.cM * Math.min(1, (x - a) / (b - a));
      });
      return cM / 100;
    }
    function simulate(opt) {
      var rng = mulberry32(opt.seed >>> 0), L = opt.L || 200000, S = opt.sites || 48;
      var n0 = opt.n0 || 200, n1 = opt.n1 || 200, n = n0 + n1, minMaf = opt.minMaf == null ? 0.05 : opt.minMaf;
      var map = makeMap(rng, L), dem = demography();
      var pos = [], used = {};
      while (pos.length < S) { var p = 1000 + Math.floor(rng() * (L - 2000)); if (!used[p]) { used[p] = 1; pos.push(p); } }
      pos.sort(function (a, b) { return a - b; });
      var gpos = pos.map(function (x) { return cumMorgans(map, x); });
      var nTime = [], nL = [], nR = [], nC = [], nC0 = [], nC1 = [], i, s;
      for (i = 0; i < n; i++) { nTime.push(0); nL.push(-1); nR.push(-1); nC.push(1); nC0.push(i < n0 ? 1 : 0); nC1.push(i < n0 ? 0 : 1); }
      var branches = []; for (s = 0; s < S; s++) branches.push([]);
      var lin = [];
      for (i = 0; i < n; i++) { var a0 = new Int32Array(S); for (s = 0; s < S; s++) a0[s] = i; lin.push({ pop: i < n0 ? 0 : 1, anc: a0, lo: 0, hi: S - 1 }); }
      function fixBounds(l) { var lo = -1, hi = -1; for (var q = 0; q < S; q++) if (l.anc[q] >= 0) { if (lo < 0) lo = q; hi = q; } l.lo = lo; l.hi = hi; }
      function span(l) { return gpos[l.hi] - gpos[l.lo]; }
      var t = 0, guard = 0;
      while (lin.length > 0 && guard++ < 2000000) {
        var k0 = 0, k1 = 0, Rr = 0;
        for (i = 0; i < lin.length; i++) { if (lin[i].pop === 0) k0++; else k1++; Rr += span(lin[i]); }
        var before = t < dem.split;
        var c0 = k0 * (k0 - 1) / 2 / (2 * valueAt(dem.pop0, t));
        var c1 = before ? k1 * (k1 - 1) / 2 / (2 * valueAt(dem.pop1, t)) : 0;
        var mg = before ? valueAt(dem.mig, t) : 0, m0 = k0 * mg, m1 = k1 * mg;
        var lam = Rr + c0 + c1 + m0 + m1;
        var dt = -Math.log(1 - rng()) / lam, nb = nextBoundary(dem, t);
        if (t + dt >= nb) { t = nb; if (Math.abs(t - dem.split) < 1e-9) lin.forEach(function (l) { l.pop = 0; }); continue; }
        t += dt;
        var u = rng() * lam;
        if (u < Rr) { // recombination in one lineage, uniform on the genetic span of its ancestral material
          var v = rng() * Rr, acc = 0, idx;
          for (idx = 0; idx < lin.length; idx++) { acc += span(lin[idx]); if (acc >= v) break; }
          if (idx >= lin.length) idx = lin.length - 1;
          var l = lin[idx], bp = gpos[l.lo] + rng() * (gpos[l.hi] - gpos[l.lo]), kk = l.lo;
          while (kk < l.hi - 1 && gpos[kk + 1] < bp) kk++;
          var a2 = new Int32Array(S); a2.fill(-1);
          for (s = kk + 1; s <= l.hi; s++) { a2[s] = l.anc[s]; l.anc[s] = -1; }
          var nl = { pop: l.pop, anc: a2, lo: 0, hi: 0 };
          fixBounds(l); fixBounds(nl);
          if (nl.lo >= 0) lin.push(nl);
        } else if (u < Rr + c0 + c1) { // coalescence of two lineages in one population
          var pp = (u - Rr < c0) ? 0 : 1, ids = [];
          for (i = 0; i < lin.length; i++) if (lin[i].pop === pp) ids.push(i);
          var i1 = Math.floor(rng() * ids.length), i2 = Math.floor(rng() * (ids.length - 1));
          if (i2 >= i1) i2++;
          var A = lin[ids[i1]], B = lin[ids[i2]], lo = Math.min(A.lo, B.lo), hi = Math.max(A.hi, B.hi);
          for (s = lo; s <= hi; s++) {
            var x = A.anc[s], y = B.anc[s];
            if (x >= 0 && y >= 0) {
              var id = nTime.length;
              nTime.push(t); nL.push(x); nR.push(y); nC.push(nC[x] + nC[y]); nC0.push(nC0[x] + nC0[y]); nC1.push(nC1[x] + nC1[y]);
              branches[s].push(x, t - nTime[x], y, t - nTime[y]);
              A.anc[s] = (nC[id] === n) ? -1 : id;
            } else if (y >= 0) A.anc[s] = y;
          }
          fixBounds(A);
          var rm = [ids[i2]]; if (A.lo < 0) rm.push(ids[i1]);
          rm.sort(function (p1, p2) { return p2 - p1; });
          rm.forEach(function (r) { lin.splice(r, 1); });
        } else { // migration of one lineage (backwards in time)
          var from = (u - Rr - c0 - c1 < m0) ? 0 : 1, js = [];
          for (i = 0; i < lin.length; i++) if (lin[i].pop === from) js.push(i);
          lin[js[Math.floor(rng() * js.length)]].pop = 1 - from;
        }
      }
      var H = [], keep = [];
      for (s = 0; s < S; s++) {
        var br = branches[s], tot = 0, cand = [];
        for (var j = 0; j < br.length; j += 2) {
          var ch = br[j], f0 = nC0[ch] / n0, f1 = nC1[ch] / n1;
          if (f0 >= minMaf && f0 <= 1 - minMaf && f1 >= minMaf && f1 <= 1 - minMaf) { cand.push(ch, br[j + 1]); tot += br[j + 1]; }
        }
        if (!(tot > 0)) continue;
        var w = rng() * tot, ac = 0, pick = cand[0];
        for (j = 0; j < cand.length; j += 2) { ac += cand[j + 1]; if (ac >= w) { pick = cand[j]; break; } }
        var h = new Uint8Array(n), stack = [pick];
        while (stack.length) { var z = stack.pop(); if (z < n) h[z] = 1; else { stack.push(nL[z]); stack.push(nR[z]); } }
        H.push(h); keep.push(pos[s]);
      }
      return { H: H, pos: keep, map: map, n0: n0, n1: n1 };
    }

    /* --- two-SNP statistics --- */
    function fromHaps(c) { // c = [AG, Ag, aG, ag] counts of chromosome copies
      var N = c[0] + c[1] + c[2] + c[3];
      var p = [c[0] / N, c[1] / N, c[2] / N, c[3] / N];
      var pA = p[0] + p[1], pG = p[0] + p[2], pa = 1 - pA, pg = 1 - pG, D = p[0] * p[3] - p[1] * p[2];
      var Dmax = D >= 0 ? Math.min(pA * pg, pa * pG) : Math.min(pA * pG, pa * pg), den = pA * pa * pG * pg;
      var q = [pA * pG, pA * pg, pa * pG, pa * pg], lod = 0;
      for (var h = 0; h < 4; h++) if (c[h] > 0) lod += c[h] * (Math.log(p[h]) - Math.log(q[h]));
      return { r2: den > 0 ? D * D / den : NaN, Dp: Dmax > 0 ? D / Dmax : NaN, lod: lod / Math.LN10, pA: pA, pG: pG };
    }
    function hapCounts(h1, h2, from, to) {
      var c = [0, 0, 0, 0];
      for (var i = from; i < to; i++) c[(1 - h1[i]) * 2 + (1 - h2[i])]++; // derived allele coded A / G
      return c;
    }
    function emLL(p, k) {
      function xl(c, v) { return c === 0 ? 0 : (v > 0 ? c * Math.log(v) : -Infinity); }
      return xl(k[0], p[0]) + xl(k[1], p[1]) + xl(k[2], p[2]) + xl(k[3], p[3]) + xl(k[4], 2 * p[0] * p[3] + 2 * p[1] * p[2]);
    }
    function emFit(k, N, p) {
      for (var it = 0; it < 500; it++) {
        var a = p[0] * p[3], b = p[1] * p[2], w = (a + b) > 0 ? a / (a + b) : 0.5;
        var q = [(k[0] + k[4] * w) / N, (k[1] + k[4] * (1 - w)) / N, (k[2] + k[4] * (1 - w)) / N, (k[3] + k[4] * w) / N];
        var d = Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]) + Math.abs(q[2] - p[2]) + Math.abs(q[3] - p[3]);
        p = q; if (d < 1e-10) break;
      }
      return p;
    }
    function fromGenos(h1, h2, from, to) {
      var m = (to - from) / 2, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, k = [0, 0, 0, 0, 0]; // known AG, Ag, aG, ag; double hets
      for (var i = 0; i < m; i++) {
        var a1 = h1[from + 2 * i], a2 = h1[from + 2 * i + 1], b1 = h2[from + 2 * i], b2 = h2[from + 2 * i + 1];
        var x = a1 + a2, y = b1 + b2;
        sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y;
        if (x === 1 && y === 1) k[4]++;
        else { k[(1 - a1) * 2 + (1 - b1)]++; k[(1 - a2) * 2 + (1 - b2)]++; } // phase is irrelevant unless both SNPs are heterozygous
      }
      var cov = sxy / m - sx * sy / m / m, vx = sxx / m - sx * sx / m / m, vy = syy / m - sy * sy / m / m;
      var r2 = (vx > 0 && vy > 0) ? cov * cov / (vx * vy) : NaN;
      var N = 2 * m, pA = (k[0] + k[1] + k[4]) / N, pG = (k[0] + k[2] + k[4]) / N, pa = 1 - pA, pg = 1 - pG;
      var lo = Math.max(0, pA + pG - 1), hi = Math.min(pA, pG), best = null, bestLL = -Infinity;
      [lo + 0.05 * (hi - lo), hi - 0.05 * (hi - lo)].forEach(function (x0) {
        var p = emFit(k, N, [x0, pA - x0, pG - x0, 1 - pA - pG + x0]), ll = emLL(p, k);
        if (ll > bestLL) { bestLL = ll; best = p; }
      });
      var D = best[0] * best[3] - best[1] * best[2];
      var Dmax = D >= 0 ? Math.min(pA * pg, pa * pG) : Math.min(pA * pG, pa * pg);
      var ll0 = emLL([pA * pG, pA * pg, pa * pG, pa * pg], k);
      return { r2: r2, Dp: Dmax > 0 ? D / Dmax : NaN, lod: (bestLL - ll0) / Math.LN10, pA: pA, pG: pG };
    }
    function matrices(sim, mode) {
      var M = sim.H.length, out = [];
      [[0, sim.n0], [sim.n0, sim.n0 + sim.n1]].forEach(function (rg) {
        var r2 = [], dp = [], lod = [], maf = [];
        for (var i = 0; i < M; i++) {
          r2.push(new Float64Array(M)); dp.push(new Float64Array(M)); lod.push(new Float64Array(M));
          var c = 0; for (var q = rg[0]; q < rg[1]; q++) c += sim.H[i][q];
          var fr = c / (rg[1] - rg[0]); maf.push(Math.min(fr, 1 - fr));
          r2[i][i] = 1; dp[i][i] = 1; lod[i][i] = Infinity;
        }
        for (i = 0; i < M; i++) for (var j = i + 1; j < M; j++) {
          var st = mode === "geno" ? fromGenos(sim.H[i], sim.H[j], rg[0], rg[1]) : fromHaps(hapCounts(sim.H[i], sim.H[j], rg[0], rg[1]));
          r2[i][j] = r2[j][i] = st.r2; dp[i][j] = dp[j][i] = st.Dp; lod[i][j] = lod[j][i] = st.lod;
        }
        out.push({ r2: r2, dp: dp, lod: lod, maf: maf });
      });
      return out;
    }
    /* Greedy tagging: repeatedly pick the SNP that captures the most uncaptured SNPs at r² ≥ th */
    function greedyTags(r2, th) {
      var M = r2.length, done = new Uint8Array(M), left = M, ntag = 0;
      while (left > 0) {
        var best = -1, bc = -1;
        for (var i = 0; i < M; i++) {
          var c = 0;
          for (var j = 0; j < M; j++) if (!done[j] && (i === j || r2[i][j] >= th)) c++;
          if (c > bc) { bc = c; best = i; }
        }
        for (j = 0; j < M; j++) if (!done[j] && (best === j || r2[best][j] >= th)) { done[j] = 1; left--; }
        ntag++;
      }
      return ntag;
    }
    function meanR2(r2, pos, a, b) {
      var s = 0, c = 0;
      for (var i = 0; i < pos.length; i++) for (var j = i + 1; j < pos.length; j++) {
        var d = pos[j] - pos[i]; if (d >= a && d < b && isFinite(r2[i][j])) { s += r2[i][j]; c++; }
      }
      return c ? s / c : NaN;
    }
    return { mulberry32: mulberry32, demography: demography, cumMorgans: cumMorgans, simulate: simulate, fromHaps: fromHaps,
      hapCounts: hapCounts, fromGenos: fromGenos, matrices: matrices, greedyTags: greedyTags, meanR2: meanR2 };
  })();

  if (typeof module !== "undefined" && module.exports) module.exports = Core;
  if (typeof document === "undefined") return;

  /* ======================= Display ======================= */
  var SVGNS = "http://www.w3.org/2000/svg";
  var POPS = [
    { name: "AFR-like", desc: "larger population with a longer history" },
    { name: "EUR-like", desc: "went through an out-of-Africa bottleneck" }
  ];
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
  function f(x, d) {
    if (!isFinite(x)) return x === Infinity ? "∞" : "undefined";
    var s = x.toFixed(d);
    if (/^-0(\.0+)?$/.test(s)) s = s.slice(1);
    return s.charAt(0) === "-" ? "−" + s.slice(1) : s;
  }
  function kb(x) { return (x / 1000).toFixed(1) + " kb"; }
  function cellColor(mode, r2, dp, lod) {
    if (mode === "r2") { var g = Math.round(255 * (1 - Math.max(0, Math.min(1, isFinite(r2) ? r2 : 0)))); return "rgb(" + g + "," + g + "," + g + ")"; }
    var a = Math.abs(dp), one = a > 0.9995;
    if (!(lod >= 2)) return one ? "rgb(192,192,255)" : "#ffffff";
    if (one) return "rgb(255,0,0)";
    var gb = Math.round(224 * (1 - a)); return "rgb(255," + gb + "," + gb + ")";
  }

  function init() {
    var root = document.getElementById("w-ld-heatmap");
    if (!root) return;
    var body = root.querySelector(".widget-body");
    body.innerHTML = "";
    var S = { seed: 11, mode: "r2", est: "hap", sel: null, sim: null, mats: null };

    var c1 = el("div", { "class": "controls" });
    var selM = el("select", { id: "ldh-measure", "aria-label": "Measure shown" }, '<option value="r2">r² (white 0 → black 1)</option><option value="dp">D′ with LOD (Haploview colors)</option>');
    var lM = el("label", null, "Show "); lM.appendChild(selM); c1.appendChild(lM);
    var selE = el("select", { id: "ldh-est", "aria-label": "Estimate from" }, '<option value="hap">phased haplotypes</option><option value="geno">unphased genotypes (as PLINK)</option>');
    var lE = el("label", null, "Estimate from "); lE.appendChild(selE); c1.appendChild(lE);
    var bNew = el("button", { type: "button", "class": "btn" }, "New region");
    c1.appendChild(bNew);
    body.appendChild(c1);
    var legend = el("div", { "class": "ldh-legend note" });
    body.appendChild(legend);
    var panels = el("div", { "class": "ldh-panels" });
    body.appendChild(panels);
    var hover = el("div", { "class": "readout ldh-hover", "aria-live": "polite" });
    body.appendChild(hover);
    var summary = el("div", { "class": "readout ldh-summary" });
    body.appendChild(summary);
    body.appendChild(el("p", { "class": "note" }, "Simulated data. Hover over or tap a diamond to see that pair in both populations; or focus a heatmap with the Tab key and move with the arrow keys. Each population: 100 simulated people (200 chromosome copies)."));

    var geoms = [];
    function compute() {
      S.sim = Core.simulate({ seed: S.seed, sites: 48, n0: 200, n1: 200, L: 200000, minMaf: 0.05 });
      recompute();
    }
    function recompute() {
      S.mats = Core.matrices(S.sim, S.est);
      var M = S.sim.pos.length;
      if (!S.sel || S.sel[1] >= M) S.sel = [Math.max(0, Math.floor(M / 2) - 3), Math.floor(M / 2)];
      draw();
    }
    function drawLegend() {
      if (S.mode === "r2") legend.innerHTML = 'Color: <span class="ldh-sw" style="background:#fff"></span> r² = 0 · <span class="ldh-sw" style="background:rgb(128,128,128)"></span> 0.5 · <span class="ldh-sw" style="background:#000"></span> 1 (shades of gray in between).';
      else legend.innerHTML = 'Color: <span class="ldh-sw" style="background:#fff"></span> D′ &lt; 1, LOD &lt; 2 · <span class="ldh-sw" style="background:rgb(192,192,255)"></span> D′ = 1, LOD &lt; 2 · <span class="ldh-sw" style="background:rgb(255,150,150)"></span> D′ &lt; 1, LOD ≥ 2 (deeper red for larger D′) · <span class="ldh-sw" style="background:rgb(255,0,0)"></span> D′ = 1, LOD ≥ 2.';
    }
    function draw() {
      drawLegend();
      panels.innerHTML = ""; geoms = [];
      var M = S.sim.pos.length, avail = panels.clientWidth || 640, wide = avail >= 660;
      var W = Math.max(260, Math.floor(wide ? (avail - 18) / 2 : avail));
      for (var p = 0; p < 2; p++) {
        var box = el("div", { "class": "ldh-panel" });
        box.style.width = W + "px"; box.style.maxWidth = "100%";   // long titles wrap instead of widening the panel
        box.appendChild(el("div", { "class": "ldh-ptitle" }, "<b>" + POPS[p].name + "</b> population (simulated): " + POPS[p].desc));
        panels.appendChild(box);
        geoms.push(drawPanel(box, p, W, M));
      }
      drawSummary(); drawHover();
    }
    function drawPanel(box, p, W, M) {
      var ml = 8, mr = 8, PW = W - ml - mr, cs = PW / M, trackH = 34, top0 = 20, axisY = top0 + trackH + 14, triTop = axisY + 30;
      var H = Math.ceil(triTop + cs * (M - 1) / 2 + cs / 2 + 8);
      var s = svg("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, role: "img", tabindex: "0", "class": "ldh-svg",
        "aria-label": "LD heatmap for the " + POPS[p].name + " population: one diamond per pair of " + M + " SNPs; use arrow keys to move between pairs" }, box);
      var map = S.sim.map, L = map.L;
      function X(bp) { return ml + PW * bp / L; }
      // recombination track
      txt(s, ml, 12, "recombination rate (simulated map)", "t-xs");
      svg("line", { x1: X(0), x2: X(L), y1: top0 + trackH, y2: top0 + trackH, stroke: "var(--border-strong)" }, s);
      svg("rect", { x: X(0), y: top0 + trackH - 2, width: PW, height: 2, fill: "var(--q3)", "fill-opacity": 0.6 }, s);
      map.hotspots.forEach(function (h) {
        var x0 = X(h.center - h.width / 2), w = Math.max(2.5, X(h.center + h.width / 2) - x0);
        svg("rect", { x: x0, y: top0 + 2, width: w, height: trackH - 2, fill: "var(--q3)" }, s);
      });
      // position axis
      svg("line", { x1: X(0), x2: X(L), y1: axisY, y2: axisY, stroke: "var(--fg-muted)" }, s);
      [0, 50000, 100000, 150000, 200000].forEach(function (b) {
        svg("line", { x1: X(b), x2: X(b), y1: axisY - 3, y2: axisY + 3, stroke: "var(--fg-muted)" }, s);
      });
      txt(s, X(0), axisY - 6, "0", "t-xs", "start");
      txt(s, X(L), axisY - 6, "200 kb", "t-xs", "end");
      txt(s, X(100000), axisY - 6, "100 kb", "t-xs", "middle");
      var colX = []; for (var i = 0; i < M; i++) colX.push(ml + cs * (i + 0.5));
      var conn = svg("g", { stroke: "var(--border-strong)", "stroke-width": 0.7 }, s);
      for (i = 0; i < M; i++) svg("line", { x1: X(S.sim.pos[i]), y1: axisY, x2: colX[i], y2: triTop - 2 }, conn);
      // cells
      var mat = S.mats[p], g = svg("g", null, s), half = cs / 2, strokeOn = cs >= 9;
      for (i = 0; i < M; i++) for (var j = i + 1; j < M; j++) {
        var cx = ml + cs * ((i + j) / 2 + 0.5), cy = triTop + (j - i) * half;
        var a = { d: "M" + cx.toFixed(2) + " " + (cy - half).toFixed(2) + "l" + half.toFixed(2) + " " + half.toFixed(2) + "l" + (-half).toFixed(2) + " " + half.toFixed(2) + "l" + (-half).toFixed(2) + " " + (-half).toFixed(2) + "z",
          fill: cellColor(S.mode, mat.r2[i][j], mat.dp[i][j], mat.lod[i][j]) };
        if (strokeOn) { a.stroke = "#d8dce2"; a["stroke-width"] = 0.5; }
        svg("path", a, g);
      }
      var hl = svg("path", { d: "", fill: "none", stroke: "var(--accent)", "stroke-width": 2.2 }, s);
      var G = { s: s, ml: ml, cs: cs, triTop: triTop, M: M, hl: hl, p: p };
      function pick(evt) {
        var r = s.getBoundingClientRect(), sc = W / r.width;
        var px = (evt.clientX - r.left) * sc, py = (evt.clientY - r.top) * sc;
        var a1 = (px - ml) / cs - 0.5, b1 = (py - triTop) / half;
        var ii = Math.round(a1 - b1 / 2), jj = Math.round(a1 + b1 / 2);
        if (ii >= 0 && jj < M && ii < jj) { S.sel = [ii, jj]; drawHover(); }
      }
      s.addEventListener("pointermove", pick);
      s.addEventListener("pointerdown", pick);
      s.addEventListener("keydown", function (e) {
        var ii = S.sel[0], jj = S.sel[1];
        if (e.key === "ArrowLeft") { ii--; jj--; } else if (e.key === "ArrowRight") { ii++; jj++; }
        else if (e.key === "ArrowDown") { ii--; jj++; } else if (e.key === "ArrowUp") { if (jj - ii > 1) { ii++; jj--; } }
        else return;
        e.preventDefault();
        if (ii >= 0 && jj < M && ii < jj) { S.sel = [ii, jj]; drawHover(); }
      });
      return G;
    }
    function drawHover() {
      if (!S.sel) return;
      var i = S.sel[0], j = S.sel[1], pos = S.sim.pos;
      geoms.forEach(function (G) {
        var half = G.cs / 2, cx = G.ml + G.cs * ((i + j) / 2 + 0.5), cy = G.triTop + (j - i) * half;
        G.hl.setAttribute("d", "M" + cx + " " + (cy - half) + "l" + half + " " + half + "l" + (-half) + " " + half + "l" + (-half) + " " + (-half) + "z");
      });
      var nh = 0; S.sim.map.hotspots.forEach(function (h) { if (h.center > pos[i] && h.center < pos[j]) nh++; });
      var html = "<b>SNP " + (i + 1) + "</b> (" + kb(pos[i]) + ") and <b>SNP " + (j + 1) + "</b> (" + kb(pos[j]) + "): " + kb(pos[j] - pos[i]) + " apart, " +
        (nh === 0 ? "no hotspot" : nh === 1 ? "1 hotspot" : nh + " hotspots") + " between them.";
      for (var p = 0; p < 2; p++) {
        var m = S.mats[p];
        html += "<br>" + POPS[p].name + ": r² " + f(m.r2[i][j], 2) + ", D′ " + f(m.dp[i][j], 2) + ", LOD " + f(m.lod[i][j], 1) +
          " · minor allele frequencies " + f(m.maf[i], 2) + " and " + f(m.maf[j], 2);
      }
      if (S.est === "geno") html += "<br><span class=\"note\">From genotypes: r² is the squared correlation of allele counts; D′ and LOD come from EM haplotype frequencies.</span>";
      hover.innerHTML = html;
    }
    function drawSummary() {
      var pos = S.sim.pos, M = pos.length, rows = "";
      for (var p = 0; p < 2; p++) {
        var m = S.mats[p];
        rows += "<tr><th scope=\"row\">" + POPS[p].name + "</th><td>" + Core.greedyTags(m.r2, 0.8) + " of " + M + "</td><td>" + f(Core.meanR2(m.r2, pos, 0, 10000), 2) +
          "</td><td>" + f(Core.meanR2(m.r2, pos, 10000, 50000), 2) + "</td><td>" + f(Core.meanR2(m.r2, pos, 50000, 1e9), 2) + "</td></tr>";
      }
      summary.innerHTML = '<table class="compact ldh-table"><thead><tr><th scope="col">Population</th><th scope="col">Tag SNPs needed (r² ≥ 0.8)</th><th scope="col">Mean r², pairs &lt; 10 kb apart</th><th scope="col">10–50 kb</th><th scope="col">&gt; 50 kb</th></tr></thead><tbody>' + rows + "</tbody></table>";
    }
    selM.addEventListener("change", function () { S.mode = selM.value; draw(); });
    selE.addEventListener("change", function () { S.est = selE.value; recompute(); });
    bNew.addEventListener("click", function () { S.seed = (S.seed * 48271 + 7) % 2147483647; S.sel = null; compute(); });
    var rz, lastW = panels.clientWidth;
    window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(function () { if (Math.abs(panels.clientWidth - lastW) > 8) { lastW = panels.clientWidth; draw(); } }, 150); });
    compute();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
