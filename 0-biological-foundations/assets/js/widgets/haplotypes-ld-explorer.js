/* ==========================================================================
   Lecture 0 · Page "haplotypes-ld" · Widget "LD and the GWAS peak"
   1. Simulates a population of chromosome copies (haplotypes) for 60 SNPs in a
      200-kb region. Each copy is a mosaic of a few ancestral haplotypes; switches
      between ancestral haplotypes happen mostly at recombination hotspots
      (a simplified "copying" model).
   2. Computes r² and D′ for every pair of SNPs from the 2×2 haplotype counts.
   3. Lets the reader choose a causal SNP, simulates a quantitative trait
      y = β·g + ε (ε ~ N(0,1)) for N people (pairs of haplotypes),
      fits one simple linear regression per SNP (t-test, df = N − 2) and draws a
      regional association plot colored by r².
   No libraries, no network. Works from file://. Also loadable in node for tests
   (module.exports = Core).
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
    function makeNormal(rng) {
      var spare = null;
      return function () {
        if (spare !== null) { var s = spare; spare = null; return s; }
        var u, v, q;
        do { u = 2 * rng() - 1; v = 2 * rng() - 1; q = u * u + v * v; } while (q >= 1 || q === 0);
        var f = Math.sqrt(-2 * Math.log(q) / q);
        spare = v * f;
        return u * f;
      };
    }
    function gammaSample(alpha, rng, normal) {
      if (alpha < 1) return gammaSample(alpha + 1, rng, normal) * Math.pow(rng(), 1 / alpha);
      var d = alpha - 1 / 3, c = 1 / Math.sqrt(9 * d);
      for (;;) {
        var x, v;
        do { x = normal(); v = 1 + c * x; } while (v <= 0);
        v = v * v * v;
        var u = rng();
        if (u < 1 - 0.0331 * x * x * x * x) return d * v;
        if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
      }
    }

    /* Random genealogy (Kingman coalescent) over F ancestral haplotypes.
       Returns the branches as {mask (which ancestral haplotypes sit below), len}. */
    function randomTree(F, rng) {
      var time = [], mask = [], active = [], i;
      for (i = 0; i < F; i++) { time[i] = 0; mask[i] = 1 << i; active.push(i); }
      var t = 0, id = F, branches = [];
      while (active.length > 1) {
        var k = active.length;
        t += -Math.log(1 - rng()) / (k * (k - 1) / 2);
        var a = Math.floor(rng() * k), b = Math.floor(rng() * (k - 1));
        if (b >= a) b++;
        var na = active[a], nb = active[b];
        branches.push({ mask: mask[na], len: t - time[na] });
        branches.push({ mask: mask[nb], len: t - time[nb] });
        time[id] = t; mask[id] = mask[na] | mask[nb];
        var next = [];
        for (i = 0; i < k; i++) if (i !== a && i !== b) next.push(active[i]);
        next.push(id); active = next; id++;
      }
      return branches;
    }

    var PRESETS = {
      // F = number of ancestral haplotypes; b = background switch intensity per kb;
      // hotspot intensities are multiplied by k. Calibrated so that mean r² falls
      // from about 0.35 (SNPs < 5 kb apart) to about 0.1 (20–40 kb) for "long",
      // and from about 0.25 to 0.05 for "short".
      long: { F: 10, b: 0.006, k: 1, alpha: 1.3, eps: 0.003 },
      short: { F: 24, b: 0.018, k: 3, alpha: 1.3, eps: 0.003 }
    };

    function simulatePopulation(o) {
      var rng = mulberry32(o.seed >>> 0), normal = makeNormal(rng);
      var M = o.M || 60, H = o.H || 4000, L = o.L || 200;
      var pr = PRESETS[o.preset || "long"];
      var F = o.F || pr.F, b = o.b != null ? o.b : pr.b, k = o.k || pr.k;
      var minFreq = o.minFreq || 0.04, eps = o.eps != null ? o.eps : pr.eps;
      var j, f, q, h;
      // SNP positions (kb), sorted, at least 0.6 kb apart
      var pos = new Float64Array(M), tmp = [];
      for (j = 0; j < M; j++) tmp.push(2 + rng() * (L - 4));
      tmp.sort(function (x, y) { return x - y; });
      for (j = 0; j < M; j++) { pos[j] = tmp[j]; if (j > 0 && pos[j] - pos[j - 1] < 0.6) pos[j] = pos[j - 1] + 0.6; }
      // three hotspots at random places in three windows, random intensities
      var windows = [[30, 60], [85, 115], [140, 170]], hot = [];
      for (q = 0; q < windows.length; q++) {
        var at = windows[q][0] + rng() * (windows[q][1] - windows[q][0]);
        hot.push({ at: at, H: (1.2 + 1.6 * rng()) * k, w: 0.6 });
      }
      function Lambda(x) {
        var s = b * x;
        for (var t = 0; t < hot.length; t++) s += hot[t].H / (1 + Math.exp(-(x - hot[t].at) / hot[t].w));
        return s;
      }
      function rate(x) { // derivative of Lambda: relative recombination intensity per kb
        var s = b;
        for (var t = 0; t < hot.length; t++) {
          var e = Math.exp(-(x - hot[t].at) / hot[t].w);
          s += hot[t].H * e / (hot[t].w * (1 + e) * (1 + e));
        }
        return s;
      }
      // ancestral-haplotype weights ~ Dirichlet(alpha)
      var w = new Float64Array(F), sw = 0;
      for (f = 0; f < F; f++) { w[f] = gammaSample(pr.alpha, rng, normal); sw += w[f]; }
      for (f = 0; f < F; f++) w[f] /= sw;
      var cw = new Float64Array(F), acc = 0;
      for (f = 0; f < F; f++) { acc += w[f]; cw[f] = acc; }
      cw[F - 1] = 1;
      // one genealogy per block between hotspots
      var blockOf = new Int32Array(M);
      for (j = 0; j < M; j++) { var bi = 0; for (q = 0; q < hot.length; q++) if (pos[j] > hot[q].at) bi++; blockOf[j] = bi; }
      var trees = [];
      for (q = 0; q <= hot.length; q++) trees.push(randomTree(F, rng));
      // which ancestral haplotypes carry allele 1 at each SNP (a mutation on one branch)
      var carry = new Int32Array(M);
      for (j = 0; j < M; j++) {
        var br = trees[blockOf[j]], tot = 0, chosen = -1;
        for (q = 0; q < br.length; q++) tot += br[q].len;
        for (var tries = 0; tries < 300 && chosen < 0; tries++) {
          var u = rng() * tot, c = 0, pick = br.length - 1;
          for (q = 0; q < br.length; q++) { c += br[q].len; if (u < c) { pick = q; break; } }
          var fr = 0;
          for (f = 0; f < F; f++) if (br[pick].mask & (1 << f)) fr += w[f];
          if (fr >= minFreq && fr <= 1 - minFreq) chosen = pick;
        }
        if (chosen < 0) { // fall back to the branch whose frequency is closest to 0.3
          var bd = 9;
          for (q = 0; q < br.length; q++) {
            var ff = 0;
            for (f = 0; f < F; f++) if (br[q].mask & (1 << f)) ff += w[f];
            if (Math.abs(ff - 0.3) < bd) { bd = Math.abs(ff - 0.3); chosen = q; }
          }
        }
        carry[j] = br[chosen].mask;
      }
      // probability of re-drawing the ancestral haplotype between consecutive SNPs
      var swp = new Float64Array(M);
      for (j = 1; j < M; j++) swp[j] = 1 - Math.exp(-(Lambda(pos[j]) - Lambda(pos[j - 1])));
      // haplotypes, column-major: hap[j*H + h]; fid = ancestral haplotype copied
      var hap = new Uint8Array(M * H), fid = new Uint8Array(M * H), cur = new Uint8Array(H);
      for (j = 0; j < M; j++) {
        var base = j * H, cm = carry[j], s = swp[j];
        for (h = 0; h < H; h++) {
          if (j === 0 || rng() < s) {
            var uu = rng(), ff2 = 0;
            while (ff2 < F - 1 && uu >= cw[ff2]) ff2++;
            cur[h] = ff2;
          }
          var al = (cm >> cur[h]) & 1;
          if (rng() < eps) al ^= 1;
          hap[base + h] = al; fid[base + h] = cur[h];
        }
      }
      return { M: M, H: H, F: F, L: L, pos: pos, hot: hot, w: w, hap: hap, fid: fid, carry: carry, rate: rate, Lambda: Lambda };
    }

    /* ---------- LD ---------- */
    // Two-locus haplotype table in Lecture 1 notation (slides 118–124):
    // nAG, nAg, naG, nag = counts of the four haplotypes.
    function ld2x2(nAG, nAg, naG, nag) {
      var n = nAG + nAg + naG + nag;
      if (!(n > 0)) return null;
      var pA = (nAG + nAg) / n, pG = (nAG + naG) / n, pAG = nAG / n;
      var D = pAG - pA * pG;
      var den = pA * (1 - pA) * pG * (1 - pG);
      var Dmax = D >= 0 ? Math.min(pA * (1 - pG), (1 - pA) * pG) : Math.min(pA * pG, (1 - pA) * (1 - pG));
      return {
        n: n, pA: pA, pa: 1 - pA, pG: pG, pg: 1 - pG, pAG: pAG,
        pAg: nAg / n, paG: naG / n, pag: nag / n,
        D: D, Dmax: Dmax,
        Dprime: Dmax > 0 ? D / Dmax : NaN,
        r: den > 0 ? D / Math.sqrt(den) : NaN,
        r2: den > 0 ? D * D / den : NaN
      };
    }

    function popcount(x) {
      x = x - ((x >>> 1) & 0x55555555);
      x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
      return (((x + (x >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24;
    }

    // r², signed r, signed D′ for every pair of SNPs, from the first nh haplotypes.
    function ldMatrix(pop, nh) {
      var M = pop.M, H = pop.H, W = Math.ceil(nh / 32), j, k, h, t;
      var bits = new Uint32Array(M * W), cnt = new Float64Array(M);
      for (j = 0; j < M; j++) {
        var base = j * H, c = 0;
        for (h = 0; h < nh; h++) if (pop.hap[base + h]) { bits[j * W + (h >>> 5)] |= (1 << (h & 31)); c++; }
        cnt[j] = c;
      }
      var r2 = new Float64Array(M * M), r = new Float64Array(M * M), dp = new Float64Array(M * M);
      for (j = 0; j < M; j++) {
        for (k = j; k < M; k++) {
          var n11 = 0;
          for (t = 0; t < W; t++) n11 += popcount(bits[j * W + t] & bits[k * W + t]);
          // allele 1 at SNP j plays "A", allele 1 at SNP k plays "G"
          var s = ld2x2(n11, cnt[j] - n11, cnt[k] - n11, nh - cnt[j] - cnt[k] + n11);
          var v2 = isFinite(s.r2) ? s.r2 : 0, v = isFinite(s.r) ? s.r : 0, vd = isFinite(s.Dprime) ? s.Dprime : 0;
          r2[j * M + k] = r2[k * M + j] = v2;
          r[j * M + k] = r[k * M + j] = v;
          dp[j * M + k] = dp[k * M + j] = vd;
        }
      }
      var freq = new Float64Array(M);
      for (j = 0; j < M; j++) freq[j] = cnt[j] / nh;
      return { M: M, r2: r2, r: r, dp: dp, freq: freq, nh: nh };
    }

    /* ---------- genotypes, trait, regression ---------- */
    function genotypes(pop, N) {
      var M = pop.M, H = pop.H, g = new Uint8Array(M * N);
      for (var j = 0; j < M; j++) {
        var hb = j * H, gb = j * N;
        for (var i = 0; i < N; i++) g[gb + i] = pop.hap[hb + 2 * i] + pop.hap[hb + 2 * i + 1];
      }
      return g;
    }

    // Centered genotype columns and their sums of squares (for fast repeated regressions).
    function centerGenotypes(g, N, M) {
      var gc = new Float64Array(M * N), Sxx = new Float64Array(M), mean = new Float64Array(M);
      for (var j = 0; j < M; j++) {
        var b = j * N, s = 0, i;
        for (i = 0; i < N; i++) s += g[b + i];
        var m = s / N, ss = 0;
        for (i = 0; i < N; i++) { var d = g[b + i] - m; gc[b + i] = d; ss += d * d; }
        Sxx[j] = ss; mean[j] = m;
      }
      return { gc: gc, Sxx: Sxx, mean: mean };
    }

    function simulateTrait(g, N, causal, beta, normal) {
      var y = new Float64Array(N), b = causal * N;
      for (var i = 0; i < N; i++) y[i] = beta * g[b + i] + normal();
      return y;
    }

    /* log Γ (Lanczos, g = 7) */
    var LG = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
      -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    function lgamma(x) {
      if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
      x -= 1;
      var a = LG[0], t = x + 7.5;
      for (var i = 1; i < 9; i++) a += LG[i] / (x + i);
      return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
    }
    // Continued fraction for the incomplete beta function (modified Lentz).
    function betacf(x, a, b) {
      var TINY = 1e-300, qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
      if (Math.abs(d) < TINY) d = TINY;
      d = 1 / d;
      var hh = d;
      for (var m = 1; m <= 20000; m++) {
        var m2 = 2 * m, aa = m * (b - m) * x / ((qam + m2) * (a + m2));
        d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY;
        c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY;
        d = 1 / d; hh *= d * c;
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
        d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY;
        c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY;
        d = 1 / d;
        var del = d * c; hh *= del;
        if (Math.abs(del - 1) < 1e-15) break;
      }
      return hh;
    }
    // natural log of the regularized incomplete beta I_x(a, b)
    function logIncBeta(x, a, b) {
      if (x <= 0) return -Infinity;
      if (x >= 1) return 0;
      var lbt = lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x);
      if (x < (a + 1) / (a + b + 2)) return lbt + Math.log(betacf(x, a, b)) - Math.log(a);
      var comp = Math.exp(lbt + Math.log(betacf(1 - x, b, a)) - Math.log(b));
      return Math.log1p(-comp);
    }
    // −log10 of the two-sided p-value of Student's t with df degrees of freedom
    function tMlog10P(t, df) {
      if (!isFinite(t)) return isNaN(t) ? 0 : Infinity;
      var x = df / (df + t * t);
      return -logIncBeta(x, df / 2, 0.5) / Math.LN10;
    }

    // One simple linear regression per SNP: y = a + b·g + e.
    function associate(cg, N, M, y) {
      var my = 0, i, j;
      for (i = 0; i < N; i++) my += y[i];
      my /= N;
      var Syy = 0;
      for (i = 0; i < N; i++) { var dy = y[i] - my; Syy += dy * dy; }
      var beta = new Float64Array(M), se = new Float64Array(M), t = new Float64Array(M), ml = new Float64Array(M), r2y = new Float64Array(M);
      var df = N - 2;
      for (j = 0; j < M; j++) {
        var Sxx = cg.Sxx[j];
        if (!(Sxx > 0)) { beta[j] = NaN; se[j] = NaN; t[j] = NaN; ml[j] = 0; continue; }
        var b = j * N, Sxy = 0;
        for (i = 0; i < N; i++) Sxy += cg.gc[b + i] * y[i];
        var bh = Sxy / Sxx, rss = Math.max(Syy - bh * Sxy, 1e-300);
        var s2 = rss / df;
        beta[j] = bh; se[j] = Math.sqrt(s2 / Sxx); t[j] = bh / se[j];
        ml[j] = tMlog10P(t[j], df);
        r2y[j] = Sxy * Sxy / (Sxx * Syy);
      }
      return { beta: beta, se: se, t: t, mlog10p: ml, r2y: r2y, df: df };
    }

    // Smallest |t| (largest r²) that reaches a given −log10 p for df degrees of freedom.
    function tThreshold(mlog10p, df) {
      var lo = 0, hi = 60;
      for (var it = 0; it < 80; it++) { var mid = (lo + hi) / 2; if (tMlog10P(mid, df) < mlog10p) lo = mid; else hi = mid; }
      return hi;
    }

    // Lead SNP of one simulated study (largest r² with y = smallest p), skipping `skip`.
    function leadOfStudy(cg, N, M, y, skip) {
      var best = -1, bv = -1;
      for (var j = 0; j < M; j++) {
        if (j === skip || !(cg.Sxx[j] > 0)) continue;
        var b = j * N, Sxy = 0;
        for (var i = 0; i < N; i++) Sxy += cg.gc[b + i] * y[i];
        var v = Sxy * Sxy / cg.Sxx[j];
        if (v > bv) { bv = v; best = j; }
      }
      return { lead: best, score: bv };
    }

    return {
      mulberry32: mulberry32, makeNormal: makeNormal, randomTree: randomTree, PRESETS: PRESETS,
      simulatePopulation: simulatePopulation, ld2x2: ld2x2, ldMatrix: ldMatrix, popcount: popcount,
      genotypes: genotypes, centerGenotypes: centerGenotypes, simulateTrait: simulateTrait,
      lgamma: lgamma, logIncBeta: logIncBeta, tMlog10P: tMlog10P, associate: associate,
      tThreshold: tThreshold, leadOfStudy: leadOfStudy
    };
  })();

  if (typeof module !== "undefined" && module.exports) module.exports = Core;
  if (typeof document === "undefined") return;

  /* ============================ User interface ============================ */
  var SVGNS = "http://www.w3.org/2000/svg";
  var NMAX = 10000, M = 60, L = 200, REPS = 200, MOSAIC_ROWS = 16;
  var GWS = -Math.log10(5e-8);

  function svg(tag, attrs, parent) {
    var n = document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function txt(parent, x, y, s, cls, extra) {
    var a = { x: x, y: y };
    if (cls) a["class"] = cls;
    if (extra) for (var k in extra) a[k] = extra[k];
    var t = svg("text", a, parent);
    t.textContent = s;
    return t;
  }
  function h(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
    if (html != null) n.innerHTML = html;
    return n;
  }
  var SUP = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻" };
  function sup(s) { return String(s).split("").map(function (c) { return SUP[c] || c; }).join(""); }
  function fmtP(ml) {
    if (!isFinite(ml)) return "< 10" + sup("-300");
    if (ml < 3) return (Math.pow(10, -ml)).toPrecision(2).replace(/^0\./, "0.");
    var e = Math.ceil(ml), m = Math.pow(10, e - ml);
    if (m >= 9.95) { m = 1; e -= 1; }
    return m.toFixed(1) + " × 10" + sup(-e);
  }
  function fmt(x, d) { return isFinite(x) ? x.toFixed(d) : "NA"; }
  function snpName(j) { return "SNP " + (j + 1); }

  // color helpers: hex <-> rgb, interpolation for the continuous heatmap ramp
  function hex2rgb(hx) {
    hx = hx.trim().replace("#", "");
    if (hx.length === 3) hx = hx.split("").map(function (c) { return c + c; }).join("");
    var n = parseInt(hx, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgb2hex(c) { return "#" + c.map(function (v) { var s = Math.round(Math.max(0, Math.min(255, v))).toString(16); return s.length < 2 ? "0" + s : s; }).join(""); }

  function init() {
    var rootEl = document.getElementById("w-ld-peak");
    if (!rootEl) return;
    var body = rootEl.querySelector(".widget-body");
    if (!body) return;

    var css = getComputedStyle(rootEl);
    function cssv(name, fb) { var v = css.getPropertyValue(name); return (v && v.trim()) || fb; }
    // r² colors (page CSS): five ordinal bins for points, ten-step ramp for the heatmap
    var BIN = [cssv("--ld1", "#f0a276"), cssv("--ld2", "#e37b49"), cssv("--ld3", "#cc572a"), cssv("--ld4", "#aa3e19"), cssv("--ld5", "#7e2b14")];
    var HM = ["#fff3e9", "#fbdcc7", "#f9c4a4", "#f2ab83", "#eb9163", "#e07747", "#d16033", "#b94c28", "#9c3c21", "#7e2e1d"].map(function (fb, k) { return cssv("--hm" + k, fb); });
    var QC = [cssv("--q1", "#4e79a7"), cssv("--q2", "#f28e2b"), cssv("--q3", "#59a14f"), cssv("--q4", "#e15759"), cssv("--q5", "#76b7b2"), cssv("--q6", "#edc948"), cssv("--q7", "#b07aa1")];
    var OTHER = "#cfd5dd";
    // continuous ramp: white at 0, HM[k] at (k + 0.5)/10, HM[9] at 1
    var stopV = [0], stopC = [hex2rgb("#ffffff")];
    HM.forEach(function (c, k) { stopV.push((k + 0.5) / 10); stopC.push(hex2rgb(c)); });
    stopV.push(1); stopC.push(hex2rgb(HM[9]));
    function ramp(v) {
      v = Math.max(0, Math.min(1, v));
      var i = 0;
      while (i < stopV.length - 2 && v > stopV[i + 1]) i++;
      var f = (v - stopV[i]) / (stopV[i + 1] - stopV[i]), a = stopC[i], b = stopC[i + 1];
      return rgb2hex([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]);
    }
    function binColor(v) { return BIN[Math.max(0, Math.min(4, Math.floor(v * 5 - 1e-9)))]; }

    /* ---------- state ---------- */
    var S = {
      popSeed: 20260909, preset: "long", N: 2000, beta: 0.25, causal: -1, hide: false,
      metric: "r2", colorBy: "causal", study: 0, reps: null, running: false
    };
    var pop, ld, g, cg, res, lead, foundRank;

    /* ---------- controls ---------- */
    body.innerHTML = "";
    var c1 = h("div", { "class": "controls" });
    var selCausal = h("select", { id: "hld-causal", "aria-label": "Causal SNP" });
    var lab1 = h("label", null, "Causal SNP "); lab1.appendChild(selCausal); c1.appendChild(lab1);
    var beta = h("input", { type: "range", id: "hld-beta", min: "0", max: "0.5", step: "0.01", value: String(S.beta), "aria-label": "Effect size beta" });
    var betaOut = h("output", { "for": "hld-beta", "class": "hld-out" }, S.beta.toFixed(2));
    var lab2 = h("label", null, "Effect size β "); lab2.appendChild(beta); lab2.appendChild(betaOut); c1.appendChild(lab2);
    var selN = h("select", { id: "hld-n", "aria-label": "Sample size" },
      [500, 1000, 2000, 5000, 10000].map(function (n) { return '<option value="' + n + '"' + (n === S.N ? " selected" : "") + ">" + n.toLocaleString("en-US") + " people</option>"; }).join(""));
    var lab3 = h("label", null, "Sample size "); lab3.appendChild(selN); c1.appendChild(lab3);
    body.appendChild(c1);

    var c2 = h("div", { "class": "controls" });
    var selPop = h("select", { id: "hld-pop", "aria-label": "Population" },
      '<option value="long">longer-range LD (fewer past recombinations)</option><option value="short">shorter-range LD (more past recombinations)</option>');
    var lab4 = h("label", null, "Population "); lab4.appendChild(selPop); c2.appendChild(lab4);
    var selMetric = h("select", { id: "hld-metric", "aria-label": "Heatmap measure" }, '<option value="r2">r²</option><option value="dp">|D′|</option>');
    var lab5 = h("label", null, "Heatmap shows "); lab5.appendChild(selMetric); c2.appendChild(lab5);
    var selColor = h("select", { id: "hld-colorby", "aria-label": "Color points by r-squared with" }, '<option value="causal">the causal SNP</option><option value="lead">the lead SNP</option>');
    var lab6 = h("label", null, "Color points by r² with "); lab6.appendChild(selColor); c2.appendChild(lab6);
    var chkHide = h("input", { type: "checkbox", id: "hld-hide" });
    var lab7 = h("label"); lab7.appendChild(chkHide); lab7.appendChild(document.createTextNode(" causal SNP not genotyped")); c2.appendChild(lab7);
    body.appendChild(c2);

    var c3 = h("div", { "class": "controls" });
    var bStudy = h("button", { "class": "btn primary", type: "button", id: "hld-study" }, "New study (new trait values)");
    var bRepeat = h("button", { "class": "btn", type: "button", id: "hld-repeat" }, "Repeat " + REPS + " studies");
    var bPop = h("button", { "class": "btn", type: "button", id: "hld-newpop" }, "New population");
    c3.appendChild(bStudy); c3.appendChild(bRepeat); c3.appendChild(bPop);
    body.appendChild(c3);

    var legend = h("div", { "class": "hld-legend", "aria-hidden": "true" });
    body.appendChild(legend);
    var plotWrap = h("div", { "class": "hld-plot" });
    body.appendChild(plotWrap);
    var tip = h("div", { "class": "hld-tip", role: "status" });
    plotWrap.appendChild(tip);
    var readout = h("div", { "class": "readout hld-readout", "aria-live": "polite" });
    body.appendChild(readout);
    var details = h("details", { "class": "hld-table" });
    details.appendChild(h("summary", null, "Show the results as a table"));
    var tableHost = h("div", { "class": "table-wrap" });
    details.appendChild(tableHost);
    body.appendChild(details);

    /* ---------- computation ---------- */
    function newPopulation() {
      pop = Core.simulatePopulation({ seed: S.popSeed, preset: S.preset, M: M, H: 2 * NMAX, L: L });
      // rank ancestral haplotypes by weight for coloring (top 7 get colors)
      var idx = []; for (var f = 0; f < pop.F; f++) idx.push(f);
      idx.sort(function (a, b) { return pop.w[b] - pop.w[a]; });
      foundRank = new Int32Array(pop.F);
      idx.forEach(function (f, r) { foundRank[f] = r; });
      newSample();
      if (S.causal < 0 || S.causal >= M) S.causal = defaultCausal();
      fillCausalSelect();
    }
    function newSample() {
      ld = Core.ldMatrix(pop, 2 * S.N);
      g = Core.genotypes(pop, S.N);
      cg = Core.centerGenotypes(g, S.N, M);
    }
    function defaultCausal() {
      // a common SNP with many strong proxies: gives a broad, instructive peak
      var best = 0, bs = -1;
      for (var j = 0; j < M; j++) {
        var f = ld.freq[j], maf = Math.min(f, 1 - f);
        if (maf < 0.2) continue;
        var s = 0;
        for (var k = 0; k < M; k++) if (k !== j && ld.r2[j * M + k] >= 0.5) s++;
        if (s > bs) { bs = s; best = j; }
      }
      return best;
    }
    function fillCausalSelect() {
      var html = "";
      for (var j = 0; j < M; j++) {
        html += '<option value="' + j + '"' + (j === S.causal ? " selected" : "") + ">" + snpName(j) + " · " + pop.pos[j].toFixed(1) + " kb · freq " + ld.freq[j].toFixed(2) + "</option>";
      }
      selCausal.innerHTML = html;
    }
    function runStudy() {
      var rng = Core.mulberry32((S.popSeed * 1000003 + S.study * 7919 + S.causal * 31 + S.N) >>> 0);
      var normal = Core.makeNormal(rng);
      var y = Core.simulateTrait(g, S.N, S.causal, S.beta, normal);
      res = Core.associate(cg, S.N, M, y);
      lead = -1; var bv = -1;
      for (var j = 0; j < M; j++) {
        if (S.hide && j === S.causal) continue;
        if (res.mlog10p[j] > bv) { bv = res.mlog10p[j]; lead = j; }
      }
    }

    /* ---------- drawing ---------- */
    var svgEl = null, geom = null;
    function layout() {
      var W = Math.max(320, Math.min(900, plotWrap.clientWidth || 800));
      var small = W < 560;
      var ml = small ? 38 : 46, mr = 12;
      var PW = W - ml - mr;
      var y0 = 14, regH = small ? 170 : 210;
      var stripY = y0 + regH + 30, stripH = 30;
      var recY = stripY + stripH + 14, recH = small ? 26 : 32;
      var axY = recY + recH + 2;
      var mosY = axY + 48, rowH = small ? 5 : 6, mosH = MOSAIC_ROWS * rowH;
      var conY = mosY + mosH + 8, conH = 26;
      var triY = conY + conH, s = PW / M, sq = 0.5;
      var triH = M * s / 2 * sq;
      var Ht = triY + triH + 16;
      return { W: W, H: Ht, small: small, ml: ml, mr: mr, PW: PW, y0: y0, regH: regH, stripY: stripY, stripH: stripH, recY: recY, recH: recH, axY: axY, mosY: mosY, rowH: rowH, mosH: mosH, conY: conY, conH: conH, triY: triY, s: s, sq: sq, triH: triH };
    }
    function xPos(kb) { return geom.ml + kb / L * geom.PW; }
    function xIdx(j) { return geom.ml + (j + 0.5) * geom.s; }

    function draw() {
      geom = layout();
      if (svgEl) svgEl.remove();
      svgEl = svg("svg", { viewBox: "0 0 " + geom.W + " " + geom.H, width: geom.W, height: geom.H, role: "img", "class": "hld-svg",
        "aria-label": "Regional association plot, recombination rate, haplotype mosaic and LD heatmap for 60 simulated SNPs" });
      plotWrap.insertBefore(svgEl, tip);
      drawRegional();
      drawStrip();
      drawRecombination();
      drawAxis();
      drawMosaic();
      drawHeatmap();
      drawLegend();
      updateReadout();
      updateTable();
    }

    var gReg = null;
    function drawRegional() {
      if (gReg) gReg.remove();
      gReg = svg("g", { "class": "hld-reg" }, svgEl);
      var G = geom, top = G.y0, H = G.regH, x0 = G.ml, x1 = G.ml + G.PW;
      var maxv = GWS + 1;
      for (var j = 0; j < M; j++) if (!(S.hide && j === S.causal) && isFinite(res.mlog10p[j])) maxv = Math.max(maxv, res.mlog10p[j]);
      var ymax = Math.ceil((maxv + 0.5) / 2) * 2;
      var step = ymax <= 12 ? 2 : ymax <= 30 ? 5 : ymax <= 60 ? 10 : ymax <= 150 ? 25 : 50;
      function Y(v) { return top + H - Math.min(v, ymax) / ymax * H; }
      for (var v = 0; v <= ymax + 1e-9; v += step) {
        svg("line", { x1: x0, x2: x1, y1: Y(v), y2: Y(v), stroke: "#e6e9ee", "stroke-width": 1 }, gReg);
        txt(gReg, x0 - 6, Y(v) + 4, String(v), "t-xs", { "text-anchor": "end" });
      }
      txt(gReg, 12, top + H / 2, "−log₁₀ p", "t-sm", { transform: "rotate(-90 12 " + (top + H / 2) + ")", "text-anchor": "middle" });
      svg("line", { x1: x0, x2: x1, y1: top + H, y2: top + H, stroke: "#b9c1cc", "stroke-width": 1 }, gReg);
      // genome-wide significance threshold
      svg("line", { x1: x0, x2: x1, y1: Y(GWS), y2: Y(GWS), stroke: "#8a93a0", "stroke-width": 1, "stroke-dasharray": "5 4" }, gReg);
      txt(gReg, x1 - 2, Y(GWS) - 4, "p = 5 × 10⁻⁸", "t-xs", { "text-anchor": "end" });
      // reference SNP for coloring
      var ref = S.colorBy === "lead" ? lead : S.causal;
      var order = [];
      for (j = 0; j < M; j++) if (!(S.hide && j === S.causal)) order.push(j);
      order.sort(function (a, b) { return ld.r2[ref * M + a] - ld.r2[ref * M + b]; }); // high r² drawn last (on top)
      order.forEach(function (j) {
        var cx = xPos(pop.pos[j]), cy = Y(res.mlog10p[j]);
        if (j === lead) return;
        var c = svg("circle", { cx: cx, cy: cy, r: G.small ? 4 : 4.5, fill: binColor(ld.r2[ref * M + j]), stroke: "#fff", "stroke-width": 1.5, "data-j": j, "class": "hld-pt" }, gReg);
        c.style.cursor = "pointer";
      });
      // causal SNP ring (or an x on the axis if not genotyped)
      var cxC = xPos(pop.pos[S.causal]);
      if (S.hide) {
        var yb = top + H;
        svg("path", { d: "M" + (cxC - 5) + "," + (yb - 5) + "l10,10m0,-10l-10,10", stroke: "#1d2127", "stroke-width": 2 }, gReg);
        txt(gReg, cxC, yb + 16, "causal SNP (not genotyped)", "t-xs", { "text-anchor": labelAnchor(cxC) });
      } else {
        var cyC = Y(res.mlog10p[S.causal]);
        svg("circle", { cx: cxC, cy: cyC, r: 9, fill: "none", stroke: "#1d2127", "stroke-width": 2 }, gReg);
      }
      // lead SNP diamond (drawn last)
      if (lead >= 0) {
        var lx = xPos(pop.pos[lead]), ly = Y(res.mlog10p[lead]), d = G.small ? 6 : 7;
        var dm = svg("path", { d: "M" + lx + "," + (ly - d) + "L" + (lx + d) + "," + ly + "L" + lx + "," + (ly + d) + "L" + (lx - d) + "," + ly + "Z",
          fill: "var(--mm)", stroke: "#fff", "stroke-width": 1.5, "data-j": lead, "class": "hld-pt" }, gReg);
        dm.style.cursor = "pointer";
      }
      // labels for lead and causal (avoid overlap)
      var labs = [];
      if (lead >= 0) labs.push({ j: lead, text: lead === S.causal ? "lead SNP = causal SNP" : "lead SNP", y: Y(res.mlog10p[lead]) });
      if (!S.hide && lead !== S.causal) labs.push({ j: S.causal, text: "causal SNP", y: Y(res.mlog10p[S.causal]) });
      labs.forEach(function (lb, i) {
        var lx2 = xPos(pop.pos[lb.j]), ly2 = lb.y - 14;
        if (ly2 < top + 8) ly2 = lb.y + 24;
        if (i === 1 && Math.abs(xPos(pop.pos[labs[0].j]) - lx2) < 90 && Math.abs(labs[0].y - lb.y) < 22) ly2 = lb.y + 26;
        txt(gReg, lx2, ly2, lb.text, "t-xs hld-lab", { "text-anchor": labelAnchor(lx2) });
      });
      // x hit area: hover/click
      gReg.addEventListener("mousemove", onPointHover);
      gReg.addEventListener("mouseleave", hideTip);
      gReg.addEventListener("click", onPointClick);
      gReg.__Y = Y;
    }
    function labelAnchor(x) { return x < geom.ml + 70 ? "start" : x > geom.ml + geom.PW - 70 ? "end" : "middle"; }

    function nearestPoint(evt) {
      var pt = toLocal(evt), best = -1, bd = 1e9;
      for (var j = 0; j < M; j++) {
        if (S.hide && j === S.causal) continue;
        var dx = xPos(pop.pos[j]) - pt.x, dy = gReg.__Y(res.mlog10p[j]) - pt.y, d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = j; }
      }
      return bd <= 14 * 14 ? best : -1;
    }
    function toLocal(evt) {
      var r = svgEl.getBoundingClientRect();
      return { x: (evt.clientX - r.left) * geom.W / r.width, y: (evt.clientY - r.top) * geom.H / r.height };
    }
    function onPointHover(evt) {
      var j = nearestPoint(evt);
      if (j < 0) { hideTip(); return; }
      showTip(evt, snpTip(j));
    }
    function onPointClick(evt) { var j = nearestPoint(evt); if (j >= 0) setCausal(j); }

    function snpTip(j) {
      var ref = S.causal, f = ld.freq[j];
      var lines = ["<b>" + snpName(j) + "</b> · " + pop.pos[j].toFixed(1) + " kb · allele-1 frequency " + f.toFixed(2)];
      if (!(S.hide && j === S.causal)) lines.push("β̂ = " + fmt(res.beta[j], 3) + " (SE " + fmt(res.se[j], 3) + ") · p = " + fmtP(res.mlog10p[j]));
      else lines.push("not genotyped in this study");
      if (j !== ref) lines.push("with the causal SNP: r² = " + ld.r2[ref * M + j].toFixed(2) + ", D′ = " + ld.dp[ref * M + j].toFixed(2));
      else lines.push("this is the causal SNP (true β = " + S.beta.toFixed(2) + ")");
      if (lead >= 0 && j !== lead && j !== ref) lines.push("with the lead SNP: r² = " + ld.r2[lead * M + j].toFixed(2));
      lines.push('<span class="hld-tip-hint">Click to make it the causal SNP</span>');
      return lines.join("<br>");
    }
    function showTip(evt, html) {
      tip.innerHTML = html;
      tip.style.display = "block";
      var wr = plotWrap.getBoundingClientRect();
      var x = evt.clientX - wr.left + 14, y = evt.clientY - wr.top + 14;
      var tw = tip.offsetWidth, th = tip.offsetHeight;
      if (x + tw > wr.width - 4) x = Math.max(4, evt.clientX - wr.left - tw - 14);
      if (y + th > wr.height - 4) y = Math.max(4, evt.clientY - wr.top - th - 14);
      tip.style.left = x + "px"; tip.style.top = y + "px";
    }
    function hideTip() { tip.style.display = "none"; }

    function drawStrip() {
      var G = geom, gS = svg("g", { "class": "hld-strip" }, svgEl);
      var top = G.stripY, H = G.stripH;
      svg("line", { x1: G.ml, x2: G.ml + G.PW, y1: top + H, y2: top + H, stroke: "#d9dee5", "stroke-width": 1 }, gS);
      if (!S.reps) {
        txt(gS, G.ml + G.PW / 2, top + H / 2 + 4, S.running ? "Running studies…" : G.small ? "“Repeat " + REPS + " studies” shows lead-SNP counts here" : "“Repeat " + REPS + " studies” shows here how often each SNP comes out as the lead SNP.", "t-xs", { "text-anchor": "middle" });
        return;
      }
      var cnt = S.reps.counts, mx = 0;
      for (var j = 0; j < M; j++) mx = Math.max(mx, cnt[j]);
      txt(gS, G.ml - 6, top + 9, "lead", "t-xs", { "text-anchor": "end" });
      txt(gS, G.ml - 6, top + 20, "share", "t-xs", { "text-anchor": "end" });
      var bw = Math.max(2, Math.min(8, G.PW / M * 0.6));
      for (j = 0; j < M; j++) {
        if (!cnt[j]) continue;
        var hh = cnt[j] / S.reps.n * H * 1.6;
        hh = Math.min(H - 2, Math.max(2, hh));
        var x = xPos(pop.pos[j]);
        svg("rect", { x: x - bw / 2, y: top + H - hh, width: bw, height: hh, rx: 1.5, fill: j === S.causal ? "#1d2127" : "var(--mm)" }, gS);
      }
      // label the most frequent lead
      var best = 0; for (j = 1; j < M; j++) if (cnt[j] > cnt[best]) best = j;
      var bx = xPos(pop.pos[best]);
      txt(gS, bx + (bx > G.ml + G.PW - 60 ? -8 : 8), top + 10, Math.round(100 * cnt[best] / S.reps.n) + "%", "t-xs", { "text-anchor": bx > G.ml + G.PW - 60 ? "end" : "start" });
    }

    function drawRecombination() {
      var G = geom, gR = svg("g", { "class": "hld-rec" }, svgEl);
      var top = G.recY, H = G.recH, n = 400, mx = 0, i, vals = [];
      for (i = 0; i <= n; i++) { var x = i / n * L, v = pop.rate(x); vals.push(v); if (v > mx) mx = v; }
      var d = "M" + G.ml + "," + (top + H);
      for (i = 0; i <= n; i++) d += "L" + (G.ml + i / n * G.PW).toFixed(1) + "," + (top + H - vals[i] / mx * (H - 2)).toFixed(1);
      d += "L" + (G.ml + G.PW) + "," + (top + H) + "Z";
      svg("path", { d: d, fill: "rgba(76,63,176,0.10)", stroke: "var(--mm)", "stroke-width": 1.2 }, gR);
      svg("line", { x1: G.ml, x2: G.ml + G.PW, y1: top + H, y2: top + H, stroke: "#b9c1cc", "stroke-width": 1 }, gR);
      txt(gR, G.ml + 4, top + 10, "recombination rate (relative; peaks = hotspots)", "t-xs", { style: "paint-order:stroke;stroke:#fff;stroke-width:3px;stroke-linejoin:round" });
    }

    function drawAxis() {
      var G = geom, gA = svg("g", { "class": "hld-axis" }, svgEl);
      var y = G.axY, tickStep = G.small ? 50 : 25;
      for (var kb = 0; kb <= L; kb += tickStep) {
        var x = xPos(kb);
        svg("line", { x1: x, x2: x, y1: y + 10, y2: y + 14, stroke: "#8a93a0", "stroke-width": 1 }, gA);
        txt(gA, x, y + 25, kb + (kb === L ? " kb" : ""), "t-xs", { "text-anchor": kb === L ? "end" : kb === 0 ? "start" : "middle" });
      }
      svg("line", { x1: G.ml, x2: G.ml + G.PW, y1: y + 10, y2: y + 10, stroke: "#b9c1cc", "stroke-width": 1 }, gA);
      for (var j = 0; j < M; j++) {
        var xs = xPos(pop.pos[j]);
        svg("line", { x1: xs, x2: xs, y1: y + 2, y2: y + 10, stroke: j === S.causal ? "#1d2127" : "#8a93a0", "stroke-width": j === S.causal ? 2 : 1 }, gA);
      }
    }

    function drawMosaic() {
      var G = geom, gM = svg("g", { "class": "hld-mosaic" }, svgEl);
      var top = G.mosY, rh = G.rowH;
      txt(gM, G.ml, top - 6, G.small ? MOSAIC_ROWS + " of " + (2 * S.N).toLocaleString("en-US") + " copies, colored by ancestral haplotype" : MOSAIC_ROWS + " of the " + (2 * S.N).toLocaleString("en-US") + " chromosome copies, colored by the ancestral haplotype each segment was copied from", "t-xs");
      var bounds = [0];
      for (var j = 1; j < M; j++) bounds.push((pop.pos[j - 1] + pop.pos[j]) / 2);
      bounds.push(L);
      for (var r = 0; r < MOSAIC_ROWS; r++) {
        var y = top + r * rh, start = 0;
        for (j = 1; j <= M; j++) {
          if (j === M || pop.fid[j * pop.H + r] !== pop.fid[start * pop.H + r]) {
            var f = pop.fid[start * pop.H + r], rk = foundRank[f];
            var x0 = xPos(bounds[start]), x1 = xPos(bounds[j]);
            svg("rect", { x: x0, y: y, width: Math.max(0.5, x1 - x0 - 0.6), height: rh - 1, fill: rk < 7 ? QC[rk] : OTHER }, gM);
            start = j;
          }
        }
        // allele at the causal SNP: filled dark = allele 1, open = allele 0
        var a = pop.hap[S.causal * pop.H + r], cx = xPos(pop.pos[S.causal]);
        svg("rect", { x: cx - 3, y: y - 0.5, width: 6, height: rh, fill: a ? "#1d2127" : "#fff", stroke: "#1d2127", "stroke-width": 0.8 }, gM);
      }
    }

    var gHeat = null;
    function drawHeatmap() {
      if (gHeat) gHeat.remove();
      var G = geom; gHeat = svg("g", { "class": "hld-heat" }, svgEl);
      var gC = svg("g", null, gHeat);
      // connectors from physical position to matrix column
      for (var j = 0; j < M; j++) {
        var xp = xPos(pop.pos[j]), xi = xIdx(j);
        svg("path", { d: "M" + xp + "," + G.conY + "L" + xp + "," + (G.conY + 4) + "L" + xi + "," + (G.conY + G.conH - 4) + "L" + xi + "," + (G.conY + G.conH), fill: "none",
          stroke: j === S.causal ? "#1d2127" : "#c3cad3", "stroke-width": j === S.causal ? 1.6 : 0.8 }, gC);
      }
      var mat = S.metric === "r2" ? ld.r2 : ld.dp, s = G.s, hs = s / 2, vs = s / 2 * G.sq, top = G.triY;
      var frag = document.createDocumentFragment();
      for (j = 0; j < M; j++) {
        for (var k = j + 1; k < M; k++) {
          var v = S.metric === "r2" ? mat[j * M + k] : Math.abs(mat[j * M + k]);
          var cx = G.ml + ((j + k) / 2 + 0.5) * s, cy = top + (k - j) * vs;
          var p = document.createElementNS(SVGNS, "path");
          p.setAttribute("d", "M" + cx.toFixed(2) + "," + (cy - vs).toFixed(2) + "L" + (cx + hs).toFixed(2) + "," + cy.toFixed(2) + "L" + cx.toFixed(2) + "," + (cy + vs).toFixed(2) + "L" + (cx - hs).toFixed(2) + "," + cy.toFixed(2) + "Z");
          p.setAttribute("fill", ramp(v));
          frag.appendChild(p);
        }
      }
      gHeat.appendChild(frag);
      // outline of the causal SNP's row and column (its LD with every other SNP)
      var c = S.causal, pts = [];
      var leftEnd = { x: G.ml + (c / 2 + 0.5) * s, y: top + c * vs }, rightEnd = { x: G.ml + ((c + M - 1) / 2 + 0.5) * s, y: top + (M - 1 - c) * vs };
      pts = "M" + (xIdx(c)) + "," + top + "L" + leftEnd.x + "," + (leftEnd.y) + "M" + xIdx(c) + "," + top + "L" + rightEnd.x + "," + rightEnd.y;
      svg("path", { d: pts, stroke: "#1d2127", "stroke-width": 1, "stroke-dasharray": "3 3", fill: "none" }, gHeat);
      txt(gHeat, G.ml + G.PW, top + G.triH - 4, (S.metric === "r2" ? "r²" : "|D′|") + (G.small ? " for every SNP pair (dashed: with causal SNP)" : " for every pair of SNPs (dashed: pairs with the causal SNP)"), "t-xs", { "text-anchor": "end" });
      gHeat.addEventListener("mousemove", onHeatHover);
      gHeat.addEventListener("mouseleave", hideTip);
      gHeat.addEventListener("click", onHeatClick);
    }
    function heatPair(evt) {
      var p = toLocal(evt), G = geom, s = G.s, vs = s / 2 * G.sq;
      if (p.y < G.triY - 2) {
        // connector zone: nearest column
        var jj = Math.round((p.x - G.ml) / s - 0.5);
        return jj >= 0 && jj < M ? { j: jj, k: jj } : null;
      }
      // invert: u = (j+k)/2 + 0.5, d = k - j
      var u = (p.x - G.ml) / s - 0.5, d = (p.y - G.triY) / vs;
      var jf = u - d / 2, kf = u + d / 2;
      var j = Math.round(jf), k = Math.round(kf);
      // pick the diamond containing the point (check neighbors)
      var best = null, bd = 9;
      for (var a = j - 1; a <= j + 1; a++) for (var b = k - 1; b <= k + 1; b++) {
        if (a < 0 || b >= M || b <= a) continue;
        var cx = G.ml + ((a + b) / 2 + 0.5) * s, cy = G.triY + (b - a) * vs;
        var dd = Math.abs(p.x - cx) / (s / 2) + Math.abs(p.y - cy) / vs;
        if (dd < bd) { bd = dd; best = { j: a, k: b }; }
      }
      return bd <= 1.05 ? best : null;
    }
    function onHeatHover(evt) {
      var pr = heatPair(evt);
      if (!pr) { hideTip(); return; }
      if (pr.j === pr.k) { showTip(evt, snpTip(pr.j)); return; }
      var j = pr.j, k = pr.k;
      showTip(evt, "<b>" + snpName(j) + " × " + snpName(k) + "</b> · " + (pop.pos[k] - pop.pos[j]).toFixed(1) + " kb apart<br>r² = " + ld.r2[j * M + k].toFixed(2) +
        " · r = " + ld.r[j * M + k].toFixed(2) + " · D′ = " + ld.dp[j * M + k].toFixed(2) + "<br>allele-1 frequencies " + ld.freq[j].toFixed(2) + " and " + ld.freq[k].toFixed(2));
    }
    function onHeatClick(evt) { var pr = heatPair(evt); if (pr && pr.j === pr.k) setCausal(pr.j); }

    function drawLegend() {
      var ref = S.colorBy === "lead" ? "lead" : "causal";
      var html = '<span class="hld-key">r² with the ' + ref + ' SNP:</span>';
      var labs = ["0–0.2", "0.2–0.4", "0.4–0.6", "0.6–0.8", "0.8–1"];
      for (var i = 0; i < 5; i++) html += '<span class="hld-sw"><i style="background:' + BIN[i] + '"></i>' + labs[i] + "</span>";
      html += '<span class="hld-sw"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M7,1L13,7L7,13L1,7Z" fill="var(--mm)"/></svg>lead SNP (smallest p)</span>';
      html += '<span class="hld-sw"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="#1d2127" stroke-width="2"/></svg>causal SNP (known only in a simulation)</span>';
      html += '<span class="hld-sw hld-grad"><span>heatmap ' + (S.metric === "r2" ? "r²" : "|D′|") + ' 0</span><i style="background:linear-gradient(90deg,#ffffff,' + HM.join(",") + ')"></i><span>1</span></span>';
      legend.innerHTML = html;
    }

    function updateReadout() {
      var c = S.causal, lines = [];
      var f = ld.freq[c];
      lines.push("Causal SNP (your choice): " + snpName(c) + " at " + pop.pos[c].toFixed(1) + " kb · allele-1 frequency " + f.toFixed(2) + " · true β = " + S.beta.toFixed(2) + (S.hide ? " · not genotyped" : ""));
      if (lead >= 0) {
        var same = lead === c;
        lines.push("Lead SNP (smallest p): " + snpName(lead) + " at " + pop.pos[lead].toFixed(1) + " kb · p = " + fmtP(res.mlog10p[lead]) +
          (same ? " · the lead SNP is the causal SNP in this study." : " · r² with the causal SNP = " + ld.r2[lead * M + c].toFixed(2) + " · the lead SNP is NOT the causal SNP."));
      }
      var sig = [], lo = 1e9, hi = -1;
      for (var j = 0; j < M; j++) {
        if (S.hide && j === c) continue;
        if (res.mlog10p[j] >= GWS) { sig.push(j); lo = Math.min(lo, pop.pos[j]); hi = Math.max(hi, pop.pos[j]); }
      }
      lines.push(sig.length > 1 ? "SNPs with p < 5 × 10⁻⁸: " + sig.length + " of " + (S.hide ? M - 1 : M) + ", spanning " + lo.toFixed(1) + "–" + hi.toFixed(1) + " kb (" + (hi - lo).toFixed(1) + " kb)."
        : sig.length === 1 ? "SNPs with p < 5 × 10⁻⁸: 1 of " + (S.hide ? M - 1 : M) + ", at " + lo.toFixed(1) + " kb."
        : "No SNP reaches p < 5 × 10⁻⁸ in this study (try a larger β or sample size).");
      if (S.reps) {
        var R = S.reps;
        lines.push("Across " + R.n + " repeat studies: lead SNP = causal SNP in " + Math.round(100 * R.same / R.n) + "%; lead SNP had r² ≥ 0.8 with the causal SNP in " +
          Math.round(100 * R.hiR2 / R.n) + "%; at least one SNP reached p < 5 × 10⁻⁸ in " + Math.round(100 * R.sig / R.n) + "%.");
      }
      readout.innerHTML = lines.map(function (s) { return "<div>" + s + "</div>"; }).join("");
    }

    function updateTable() {
      if (!details.open) return;
      var c = S.causal, rows = "";
      for (var j = 0; j < M; j++) {
        var hidden = S.hide && j === c;
        rows += "<tr" + (j === lead ? ' class="hld-lead-row"' : "") + "><td>" + (j + 1) + (j === c ? " (causal)" : "") + (j === lead ? " (lead)" : "") + '</td><td class="num">' + pop.pos[j].toFixed(1) +
          '</td><td class="num">' + ld.freq[j].toFixed(2) + '</td><td class="num">' + (hidden ? "–" : fmt(res.beta[j], 3)) + '</td><td class="num">' + (hidden ? "–" : fmt(res.se[j], 3)) +
          '</td><td class="num">' + (hidden ? "not genotyped" : fmtP(res.mlog10p[j])) + '</td><td class="num">' + ld.r2[c * M + j].toFixed(2) + "</td></tr>";
      }
      tableHost.innerHTML = '<table class="mono compact"><caption>Simulated association results (one row per SNP) <span class="illustrative">Simulated</span></caption><thead><tr><th>SNP</th><th class="num">position (kb)</th><th class="num">allele-1 freq</th><th class="num">β̂</th><th class="num">SE</th><th class="num">p</th><th class="num">r² with causal</th></tr></thead><tbody>' + rows + "</tbody></table>";
    }
    details.addEventListener("toggle", updateTable);

    /* ---------- actions ---------- */
    function setCausal(j) {
      if (j === S.causal) return;
      S.causal = j; S.reps = null; selCausal.value = String(j);
      runStudy(); draw();
    }
    function repeatStudies() {
      if (S.running) return;
      S.running = true; S.reps = null; bRepeat.disabled = true;
      var counts = new Int32Array(M), n = 0, same = 0, hiR2 = 0, sig = 0;
      var tThr = Core.tThreshold(GWS, S.N - 2), df = S.N - 2;
      var rng = Core.mulberry32((S.popSeed * 31 + S.causal * 101 + S.N + Math.round(S.beta * 1000) * 7 + 12345) >>> 0), normal = Core.makeNormal(rng);
      var skip = S.hide ? S.causal : -1, chunk = Math.max(5, Math.round(400000 / (S.N * M) * 10));
      drawStripOnly();
      function step() {
        var end = Math.min(REPS, n + chunk);
        for (; n < end; n++) {
          var y = Core.simulateTrait(g, S.N, S.causal, S.beta, normal);
          var my = 0, i; for (i = 0; i < S.N; i++) my += y[i]; my /= S.N;
          var Syy = 0; for (i = 0; i < S.N; i++) { var dy = y[i] - my; Syy += dy * dy; }
          var L1 = Core.leadOfStudy(cg, S.N, M, y, skip);
          counts[L1.lead]++;
          if (L1.lead === S.causal) same++;
          if (ld.r2[L1.lead * M + S.causal] >= 0.8) hiR2++;
          var r2 = L1.score / Syy, t2 = df * r2 / Math.max(1e-300, 1 - r2);
          if (Math.sqrt(t2) >= tThr) sig++;
        }
        if (n < REPS) { readout.firstChild && (bRepeat.textContent = "Running… " + n + "/" + REPS); setTimeout(step, 0); return; }
        S.reps = { counts: counts, n: REPS, same: same, hiR2: hiR2, sig: sig };
        S.running = false; bRepeat.disabled = false; bRepeat.textContent = "Repeat " + REPS + " studies";
        draw();
      }
      setTimeout(step, 0);
    }
    function drawStripOnly() { var old = svgEl.querySelector(".hld-strip"); if (old) old.remove(); drawStrip(); }

    selCausal.addEventListener("change", function () { setCausal(parseInt(selCausal.value, 10)); });
    beta.addEventListener("input", function () {
      S.beta = parseFloat(beta.value); betaOut.textContent = S.beta.toFixed(2); S.reps = null;
      runStudy(); draw();
    });
    selN.addEventListener("change", function () {
      S.N = parseInt(selN.value, 10); S.reps = null;
      newSample(); fillCausalSelect(); runStudy(); draw();
    });
    selPop.addEventListener("change", function () {
      S.preset = selPop.value; S.reps = null; S.causal = -1;
      newPopulation(); runStudy(); draw();
    });
    selMetric.addEventListener("change", function () { S.metric = selMetric.value; draw(); });
    selColor.addEventListener("change", function () { S.colorBy = selColor.value; draw(); });
    chkHide.addEventListener("change", function () { S.hide = chkHide.checked; S.reps = null; runStudy(); draw(); });
    bStudy.addEventListener("click", function () { S.study++; S.reps = null; runStudy(); draw(); });
    bRepeat.addEventListener("click", repeatStudies);
    bPop.addEventListener("click", function () {
      S.popSeed = (S.popSeed * 1103515245 + 12345) >>> 0; S.reps = null; S.causal = -1;
      newPopulation(); runStudy(); draw();
    });
    var rz = null;
    window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(function () { if (Math.abs((plotWrap.clientWidth || 0) - geom.W) > 8) draw(); }, 150); });

    newPopulation();
    runStudy();
    draw();
    rootEl.__hld = { S: S, Core: Core, get: function () { return { pop: pop, ld: ld, res: res, lead: lead }; } };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
