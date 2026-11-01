/* Widget "Structure, PCA and stratification" (page: ancestry).
   1. Simulates genotypes (0/1/2) for n people at m independent SNPs.
      Allele frequencies drift away from an ancestral frequency p0 ~ Uniform(0.05, 0.95) under the
      Balding–Nichols model: a population that has drifted by F has frequency ~ Beta(p(1-F)/F, (1-p)(1-F)/F)
      (mean p, variance F p (1-p)). Two population histories:
        "groups": a tree. Group A drifts by F from the ancestor; the ancestor of B and C drifts by F/2,
                  then B and C each drift by a further F/2. So PC1 separates A from B+C and PC2 separates B from C.
        "grid":   people sampled at 5 x 3 locations on a map. The west and east halves drift by F from the ancestor
                  and each corner drifts a further F/2; the frequency at a location is the bilinear interpolation of
                  the four corner frequencies (a smooth cline, steeper from west to east than from north to south).
      Genotypes are two independent draws (Hardy–Weinberg within each location).
   2. PCA: the first M_PCA SNPs (MAF >= 1% in the sample) are standardized, z = (g - 2p)/sqrt(2p(1-p)),
      the n x n genetic relationship matrix K = Z Z^T / m is formed and its top eigenvectors are found by
      block power iteration (orthogonal iteration with Rayleigh–Ritz), stopping when the residual
      ||K v - theta v|| / theta_1 < 1e-5 for PC1 and PC2 (or after 150 iterations). Simulated SNPs are independent, so no LD pruning is needed.
   3. Trait: y = environment + noise (noise ~ N(0, 1)); NO SNP affects it (unless "add a real causal SNP").
      "groups": people in group C get +d.  "grid": the environment rises linearly by d from the west edge to the east edge.
   4. Association: for every SNP, ordinary least squares y ~ 1 + g (+ PC1 [+ PC2]), Wald t test with
      n - k - 2 degrees of freedom (k = number of PCs), exact two-sided Student-t p-value (computed in log space).
      Genomic inflation lambda = median(t^2) / 0.4549364 (the median of a chi-square with 1 df).
   Vanilla JS, no libraries, no network; works from file://. The statistics core is exported for node tests. */
(function () {
  "use strict";

  /* ================================================================== statistics core */

  function mulberry32(a) {
    a = a >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function normalGen(rand) {            // Box–Muller, both draws used
    var spare = null;
    return function () {
      if (spare !== null) { var s = spare; spare = null; return s; }
      var u = rand(); while (u <= 0) u = rand();
      var v = rand(), r = Math.sqrt(-2 * Math.log(u));
      spare = r * Math.sin(2 * Math.PI * v);
      return r * Math.cos(2 * Math.PI * v);
    };
  }

  /* Gamma(shape a, scale 1): Marsaglia & Tsang (2000); shape < 1 via the boost Gamma(a+1) * U^(1/a). */
  function rgamma(rand, norm, a) {
    if (a < 1) {
      var u0 = rand(); while (u0 <= 0) u0 = rand();
      return rgamma(rand, norm, a + 1) * Math.pow(u0, 1 / a);
    }
    var d = a - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) {
      var x, v;
      do { x = norm(); v = 1 + c * x; } while (v <= 0);
      v = v * v * v;
      var u = rand();
      if (u < 1 - 0.0331 * x * x * x * x) return d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }
  function rbeta(rand, norm, a, b) {
    var x = rgamma(rand, norm, a), y = rgamma(rand, norm, b);
    return x / (x + y);
  }
  /* Balding–Nichols: frequency after drift F from frequency p (F = 0 returns p). */
  function drift(rand, norm, p, F) {
    if (F <= 0) return p;
    var k = (1 - F) / F;
    var q = rbeta(rand, norm, p * k, (1 - p) * k);
    return Math.min(1, Math.max(0, q));
  }

  var GRID_COLS = 5, GRID_ROWS = 3;

  /* Simulate people and genotypes.
     opts: { n, m, mode: "groups" | "grid", F, seed }
     Returns G (Uint8Array, SNP-major: G[j * n + i]), group (0/1/2 for "groups"; location index for "grid"),
     gx, gy (map coordinates in [0, 1]), and the ancestral frequencies. */
  function simulate(opts) {
    var n = opts.n, m = opts.m, F = Math.max(0, Math.min(0.5, opts.F || 0));
    var rand = mulberry32(opts.seed), norm = normalGen(rand);
    var G = new Uint8Array(n * m);
    var group = new Uint8Array(n), gx = new Float64Array(n), gy = new Float64Array(n);
    var i, j;
    if (opts.mode === "grid") {
      var L = GRID_COLS * GRID_ROWS;
      for (i = 0; i < n; i++) {
        var loc = Math.floor(i * L / n);
        group[i] = loc;
        gx[i] = (loc % GRID_COLS) / (GRID_COLS - 1);
        gy[i] = Math.floor(loc / GRID_COLS) / (GRID_ROWS - 1);
      }
    } else {
      for (i = 0; i < n; i++) { group[i] = Math.min(2, Math.floor(i * 3 / n)); gx[i] = group[i] / 2; gy[i] = 0; }
    }
    var p0 = new Float64Array(m), pLoc = new Float64Array(GRID_COLS * GRID_ROWS);
    for (j = 0; j < m; j++) {
      var p = 0.05 + 0.9 * rand();
      p0[j] = p;
      var off = j * n;
      if (opts.mode === "grid") {
        // West and east halves drift by F from the ancestor; each corner then drifts a further F/2,
        // so frequencies change more from west to east than from north to south.
        // corners: (0,0) west-north, (1,0) east-north, (0,1) west-south, (1,1) east-south
        var cW = drift(rand, norm, p, F), cE = drift(rand, norm, p, F);
        var c00 = drift(rand, norm, cW, F / 2), c01 = drift(rand, norm, cW, F / 2),
            c10 = drift(rand, norm, cE, F / 2), c11 = drift(rand, norm, cE, F / 2);
        for (var l = 0; l < GRID_COLS * GRID_ROWS; l++) {
          var x = (l % GRID_COLS) / (GRID_COLS - 1), y = Math.floor(l / GRID_COLS) / (GRID_ROWS - 1);
          pLoc[l] = (1 - x) * (1 - y) * c00 + x * (1 - y) * c10 + (1 - x) * y * c01 + x * y * c11;
        }
        for (i = 0; i < n; i++) {
          var q = pLoc[group[i]];
          G[off + i] = (rand() < q ? 1 : 0) + (rand() < q ? 1 : 0);
        }
      } else {
        var pA = drift(rand, norm, p, F), pBC = drift(rand, norm, p, F / 2);
        var pB = drift(rand, norm, pBC, F / 2), pC = drift(rand, norm, pBC, F / 2);
        var pg = [pA, pB, pC];
        for (i = 0; i < n; i++) {
          var r = pg[group[i]];
          G[off + i] = (rand() < r ? 1 : 0) + (rand() < r ? 1 : 0);
        }
      }
    }
    return { n: n, m: m, mode: opts.mode, F: F, G: G, group: group, gx: gx, gy: gy, p0: p0 };
  }

  /* Small symmetric eigenproblem (cyclic Jacobi). A: array of b*b (row-major), modified in place.
     Returns { values: [...] (descending), vectors: b*b column-major sorted to match }. */
  function jacobiEigen(A, b) {
    var V = new Float64Array(b * b), r, c, k;
    for (r = 0; r < b; r++) V[r * b + r] = 1;
    for (var sweep = 0; sweep < 60; sweep++) {
      var off = 0;
      for (r = 0; r < b; r++) for (c = r + 1; c < b; c++) off += A[r * b + c] * A[r * b + c];
      if (off < 1e-30) break;
      for (var p = 0; p < b - 1; p++) {
        for (var q = p + 1; q < b; q++) {
          var apq = A[p * b + q];
          if (Math.abs(apq) < 1e-300) continue;
          var app = A[p * b + p], aqq = A[q * b + q];
          var theta = (aqq - app) / (2 * apq);
          var t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
          var cs = 1 / Math.sqrt(t * t + 1), sn = t * cs;
          for (k = 0; k < b; k++) {           // rotate rows/cols p and q
            var akp = A[k * b + p], akq = A[k * b + q];
            A[k * b + p] = cs * akp - sn * akq;
            A[k * b + q] = sn * akp + cs * akq;
          }
          for (k = 0; k < b; k++) {
            var apk = A[p * b + k], aqk = A[q * b + k];
            A[p * b + k] = cs * apk - sn * aqk;
            A[q * b + k] = sn * apk + cs * aqk;
          }
          for (k = 0; k < b; k++) {
            var vkp = V[k * b + p], vkq = V[k * b + q];
            V[k * b + p] = cs * vkp - sn * vkq;
            V[k * b + q] = sn * vkp + cs * vkq;
          }
        }
      }
    }
    var idx = [];
    for (k = 0; k < b; k++) idx.push(k);
    idx.sort(function (u, v) { return A[v * b + v] - A[u * b + u]; });
    var vals = idx.map(function (k2) { return A[k2 * b + k2]; });
    var vecs = new Float64Array(b * b);         // column c = eigenvector c (sorted)
    for (c = 0; c < b; c++) for (r = 0; r < b; r++) vecs[r * b + c] = V[r * b + idx[c]];
    return { values: vals, vectors: vecs };
  }

  /* Orthonormalize the b columns of an n x b column-major block X in place (modified Gram–Schmidt). */
  function mgs(X, n, b) {
    for (var c = 0; c < b; c++) {
      var oc = c * n, i, s;
      for (var d = 0; d < c; d++) {
        var od = d * n; s = 0;
        for (i = 0; i < n; i++) s += X[oc + i] * X[od + i];
        for (i = 0; i < n; i++) X[oc + i] -= s * X[od + i];
      }
      s = 0;
      for (i = 0; i < n; i++) s += X[oc + i] * X[oc + i];
      s = Math.sqrt(s) || 1;
      for (i = 0; i < n; i++) X[oc + i] /= s;
    }
  }

  /* Standardized genetic relationship matrix from SNPs [0, mUse) with sample MAF >= minMaf. */
  function grm(sim, mUse, minMaf) {
    var n = sim.n, G = sim.G, used = 0, i, l, c;
    mUse = Math.min(mUse, sim.m);
    var Z = new Float64Array(n * mUse);                  // person-major: Z[i * mUse + c]
    for (var j = 0; j < mUse; j++) {
      var off = j * n, s = 0;
      for (i = 0; i < n; i++) s += G[off + i];
      var p = s / (2 * n);
      if (p < minMaf || p > 1 - minMaf) continue;
      var sd = Math.sqrt(2 * p * (1 - p)), mu = 2 * p;
      var z = [(0 - mu) / sd, (1 - mu) / sd, (2 - mu) / sd];
      for (i = 0; i < n; i++) Z[i * mUse + used] = z[G[off + i]];
      used++;
    }
    var K = new Float64Array(n * n);
    if (used === 0) return { K: K, used: 0 };
    for (i = 0; i < n; i++) {
      var oi = i * mUse;
      for (l = 0; l <= i; l++) {
        var ol = l * mUse, acc = 0;
        for (c = 0; c < used; c++) acc += Z[oi + c] * Z[ol + c];
        acc /= used;
        K[i * n + l] = acc; K[l * n + i] = acc;
      }
    }
    return { K: K, used: used };
  }

  /* Top-k eigenpairs of a symmetric n x n matrix by block power iteration with Rayleigh–Ritz.
     Returns { vectors: [Float64Array(n) ...], values, iterations, converged, residual }. */
  function topEigen(K, n, k, seed, opts) {
    opts = opts || {};
    var b = Math.min(n, k + (opts.extra == null ? 3 : opts.extra));
    var maxIt = opts.maxIt || 150, tol = opts.tol || 1e-5;
    var rand = mulberry32(seed), norm = normalGen(rand);
    var V = new Float64Array(n * b), W = new Float64Array(n * b), i, c, r, l;
    for (i = 0; i < n * b; i++) V[i] = norm();
    mgs(V, n, b);
    function mult() {                                     // W = K V
      for (c = 0; c < b; c++) {
        var oc = c * n;
        for (i = 0; i < n; i++) {
          var oi = i * n, acc = 0;
          for (l = 0; l < n; l++) acc += K[oi + l] * V[oc + l];
          W[oc + i] = acc;
        }
      }
    }
    mult();
    var it = 0, converged = false, vals = null, res = Infinity;
    var H = new Float64Array(b * b), V2 = new Float64Array(n * b), W2 = new Float64Array(n * b);
    while (true) {
      it++;
      for (r = 0; r < b; r++) for (c = r; c < b; c++) {   // H = V^T K V
        var acc = 0, orr = r * n, oc2 = c * n;
        for (i = 0; i < n; i++) acc += V[orr + i] * W[oc2 + i];
        H[r * b + c] = acc; H[c * b + r] = acc;
      }
      var e = jacobiEigen(H, b);
      vals = e.values;
      V2.fill(0); W2.fill(0);                             // Ritz vectors V S and their images W S
      for (c = 0; c < b; c++) {
        var oc = c * n;
        for (r = 0; r < b; r++) {
          var s = e.vectors[r * b + c];
          if (s === 0) continue;
          var orow = r * n;
          for (i = 0; i < n; i++) { V2[oc + i] += s * V[orow + i]; W2[oc + i] += s * W[orow + i]; }
        }
      }
      V.set(V2); W.set(W2);
      res = 0;                                            // relative residuals of the wanted pairs
      for (c = 0; c < k; c++) {
        var ss = 0, o3 = c * n;
        for (i = 0; i < n; i++) { var dlt = W[o3 + i] - vals[c] * V[o3 + i]; ss += dlt * dlt; }
        res = Math.max(res, Math.sqrt(ss) / Math.max(Math.abs(vals[0]), 1e-300));
      }
      if (res < tol) { converged = true; break; }
      if (it >= maxIt) break;
      V.set(W); mgs(V, n, b); mult();                     // power step
    }
    var vectors = [];
    for (c = 0; c < k; c++) vectors.push(V.slice(c * n, (c + 1) * n));
    return { vectors: vectors, values: vals.slice(0, k), allValues: vals, iterations: it, converged: converged, residual: res };
  }

  /* PCA of the simulated genotypes. Signs are fixed for a stable display:
     "groups": group A has negative PC1, group C has a larger PC2 than group B;
     "grid":   PC1 increases from west to east, PC2 from north to south (when they align with the map). */
  function pca(sim, opts) {
    opts = opts || {};
    var t0 = now();
    var g = grm(sim, opts.mPCA || 1000, opts.minMaf == null ? 0.01 : opts.minMaf);
    var n = sim.n, trace = 0;
    for (var i = 0; i < n; i++) trace += g.K[i * n + i];
    var t1 = now();
    var eig = topEigen(g.K, n, 2, (opts.seed || 1) ^ 0x5bd1e995, opts);
    var t2 = now();
    var pcs = eig.vectors.map(function (v) {             // scale to unit variance across people
      var out = new Float64Array(n), sc = Math.sqrt(n);
      for (var i2 = 0; i2 < n; i2++) out[i2] = v[i2] * sc;
      return out;
    });
    function corr(a, b2) {
      var ma = 0, mb = 0, sab = 0, saa = 0, sbb = 0, k;
      for (k = 0; k < n; k++) { ma += a[k]; mb += b2[k]; }
      ma /= n; mb /= n;
      for (k = 0; k < n; k++) { var da = a[k] - ma, db = b2[k] - mb; sab += da * db; saa += da * da; sbb += db * db; }
      return (saa > 0 && sbb > 0) ? sab / Math.sqrt(saa * sbb) : 0;
    }
    if (sim.mode === "grid") {
      var cx1 = corr(pcs[0], sim.gx), cy1 = corr(pcs[0], sim.gy), cx2 = corr(pcs[1], sim.gx), cy2 = corr(pcs[1], sim.gy);
      if ((Math.abs(cx1) >= Math.abs(cy1) ? cx1 : cy1) < 0) flip(pcs[0]);
      if ((Math.abs(cy2) >= Math.abs(cx2) ? cy2 : cx2) < 0) flip(pcs[1]);
    } else {
      var a1 = groupMean(pcs[0], sim.group, 0);
      if (a1 > 0) flip(pcs[0]);
      if (groupMean(pcs[1], sim.group, 2) < groupMean(pcs[1], sim.group, 1)) flip(pcs[1]);
    }
    return {
      pcs: pcs, values: eig.values, allValues: eig.allValues, trace: trace, used: g.used,
      varExplained: eig.values.map(function (v) { return trace > 0 ? v / trace : 0; }),
      iterations: eig.iterations, converged: eig.converged, residual: eig.residual,
      msGrm: t1 - t0, msEig: t2 - t1
    };
  }
  function flip(v) { for (var i = 0; i < v.length; i++) v[i] = -v[i]; }
  function groupMean(v, group, k) {
    var s = 0, c = 0;
    for (var i = 0; i < v.length; i++) if (group[i] === k) { s += v[i]; c++; }
    return c ? s / c : 0;
  }
  function now() { return (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now(); }

  /* Trait with NO genetic effect: y = environment + N(0, 1).
     opts: { d, seed, causal: { j, beta } (optional) } */
  function simulateTrait(sim, opts) {
    var n = sim.n, rand = mulberry32(opts.seed), norm = normalGen(rand);
    var y = new Float64Array(n), d = opts.d || 0, i;
    for (i = 0; i < n; i++) {
      var env = sim.mode === "grid" ? d * sim.gx[i] : (sim.group[i] === 2 ? d : 0);
      y[i] = env + norm();
    }
    if (opts.causal) {
      var j = opts.causal.j, off = j * n, mean = 0;
      for (i = 0; i < n; i++) mean += sim.G[off + i];
      mean /= n;
      for (i = 0; i < n; i++) y[i] += opts.causal.beta * (sim.G[off + i] - mean);
    }
    return y;
  }

  /* Student t helpers (log space so tiny p-values do not underflow) */
  var LZ = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
            -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  function lgamma(x) {
    if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
    x -= 1;
    var a = LZ[0], t = x + 7.5;
    for (var i = 1; i < 9; i++) a += LZ[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }
  function betacf(a, b, x) {
    var MAXIT = 10000, EPS = 1e-15, FPMIN = 1e-300;
    var qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    var h = d;
    for (var m = 1; m <= MAXIT; m++) {
      var m2 = 2 * m, aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      var del = d * c; h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  }
  /* ln I_x(a, b), with xc = 1 - x passed separately for accuracy */
  function logIbeta(x, xc, a, b) {
    if (x <= 0) return -Infinity;
    if (xc <= 0) return 0;
    var lbt = lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(xc);
    if (x < (a + 1) / (a + b + 2)) return lbt + Math.log(betacf(a, b, x) / a);
    var comp = Math.exp(lbt) * betacf(b, a, xc) / b;
    return Math.log1p(-Math.min(comp, 1 - 1e-16));
  }
  /* log10 of the two-sided p-value of Student t with df degrees of freedom */
  function log10PvalT(t, df) {
    if (!isFinite(t)) return -Infinity;
    var t2 = t * t;
    if (t2 === 0) return 0;
    return logIbeta(df / (df + t2), t2 / (df + t2), df / 2, 0.5) / Math.LN10;
  }

  var CHISQ1_MEDIAN = 0.45493642311957283;              // qchisq(0.5, df = 1)

  /* One linear regression per SNP: y ~ 1 + g + covariates (Frisch–Waugh–Lovell: residualize y and g on the
     covariates, then regress residual on residual). Returns per-SNP log10 p, t^2, beta and lambda. */
  function associate(sim, y, covs) {
    var n = sim.n, m = sim.m, G = sim.G, i, j, c;
    covs = covs || [];
    var nq = covs.length + 1;
    var Q = new Float64Array(n * nq);                     // orthonormal basis of [1, covs...]
    for (i = 0; i < n; i++) Q[i] = 1;
    for (c = 0; c < covs.length; c++) Q.set(covs[c], (c + 1) * n);
    mgs(Q, n, nq);
    var ry = Float64Array.from(y);
    for (c = 0; c < nq; c++) {
      var oc = c * n, s = 0;
      for (i = 0; i < n; i++) s += Q[oc + i] * y[i];
      for (i = 0; i < n; i++) ry[i] -= s * Q[oc + i];
    }
    var ryry = 0;
    for (i = 0; i < n; i++) ryry += ry[i] * ry[i];
    var df = n - nq - 1;
    var log10p = new Float64Array(m), chi2 = new Float64Array(m), beta = new Float64Array(m), ok = new Uint8Array(m);
    var qg = new Float64Array(nq);
    for (j = 0; j < m; j++) {
      var off = j * n, gg = 0, gry = 0;
      for (c = 0; c < nq; c++) qg[c] = 0;
      for (i = 0; i < n; i++) {
        var gi = G[off + i];
        if (gi === 0) continue;
        gg += gi * gi; gry += gi * ry[i];
        for (c = 0; c < nq; c++) qg[c] += gi * Q[c * n + i];
      }
      var rgrg = gg;
      for (c = 0; c < nq; c++) rgrg -= qg[c] * qg[c];
      if (!(rgrg > 1e-8 * Math.max(gg, 1))) { log10p[j] = NaN; chi2[j] = NaN; continue; }
      var b = gry / rgrg;
      var rss = Math.max(ryry - b * gry, 1e-300);
      var se = Math.sqrt(rss / df / rgrg);
      var t = b / se;
      beta[j] = b; chi2[j] = t * t; log10p[j] = log10PvalT(t, df); ok[j] = 1;
    }
    var chis = [];
    for (j = 0; j < m; j++) if (ok[j]) chis.push(chi2[j]);
    chis.sort(function (a, b2) { return a - b2; });
    var k = chis.length, med = k ? (k % 2 ? chis[(k - 1) / 2] : 0.5 * (chis[k / 2 - 1] + chis[k / 2])) : NaN;
    return { log10p: log10p, chi2: chi2, beta: beta, ok: ok, df: df, nTests: k, lambda: med / CHISQ1_MEDIAN };
  }

  var Core = {
    mulberry32: mulberry32, normalGen: normalGen, rgamma: rgamma, rbeta: rbeta, drift: drift,
    simulate: simulate, grm: grm, topEigen: topEigen, jacobiEigen: jacobiEigen, mgs: mgs, pca: pca,
    simulateTrait: simulateTrait, associate: associate, log10PvalT: log10PvalT, lgamma: lgamma,
    CHISQ1_MEDIAN: CHISQ1_MEDIAN, GRID_COLS: GRID_COLS, GRID_ROWS: GRID_ROWS
  };
  if (typeof module !== "undefined" && module.exports) module.exports = Core;
  if (typeof document === "undefined") return;

  /* ================================================================== drawing helpers */

  var NS = "http://www.w3.org/2000/svg";
  function S(tag, attrs, parent, text) {
    var el = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) el.setAttribute(k, attrs[k]);
    if (text != null) el.textContent = text;
    if (parent) parent.appendChild(el);
    return el;
  }
  function H(tag, attrs, parent, html) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) el.setAttribute(k, attrs[k]);
    if (html != null) el.innerHTML = html;
    if (parent) parent.appendChild(el);
    return el;
  }
  function clear(svg) { while (svg.firstChild) svg.removeChild(svg.firstChild); }
  function fmtInt(x) { return Math.round(x).toLocaleString("en-US"); }
  function fmtNum(x, d) { var s = x.toFixed(d); return s.charAt(0) === "-" ? "−" + s.slice(1) : s; }
  function niceStep(span, target) {
    var raw = span / target, p10 = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p10;
    return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p10;
  }
  function cssVar(name, fallback) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    } catch (e) { return fallback; }
  }
  function hexToRgb(h) {
    h = h.replace("#", "");
    if (h.length === 3) h = h.replace(/(.)/g, "$1$1");
    var v = parseInt(h, 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function rgb(c) { return "rgb(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + ")"; }

  var GROUP_NAMES = ["A", "B", "C"];
  var M_TOTAL = 5000, M_PCA = 1000;
  var CAUSAL_BETA = 0.5;

  /* ================================================================== widget */

  function build(root) {
    var body = root.querySelector(".widget-body") || root;
    body.innerHTML = "";
    var COL = {
      g: [cssVar("--q1", "#4e79a7"), cssVar("--q2", "#f28e2b"), cssVar("--q3", "#59a14f")],
      west: hexToRgb(cssVar("--q1", "#4e79a7")), east: hexToRgb(cssVar("--q2", "#f28e2b")),
      fg: cssVar("--fg", "#1d2127"), muted: cssVar("--fg-muted", "#5a6370"),
      grid: "#eef1f4", axis: "#b9c1cc", hit: cssVar("--pitfall", "#b42318"), accent: cssVar("--accent", "#0a62c2")
    };
    function personColor(sim, i) {
      if (sim.mode !== "grid") return COL.g[sim.group[i]];
      var base = mix(COL.west, COL.east, sim.gx[i]);
      return rgb(mix(base, [20, 24, 32], 0.42 * sim.gy[i]));   // south = darker
    }
    function locColor(col, row) {
      var base = mix(COL.west, COL.east, col / (GRID_COLS - 1));
      return rgb(mix(base, [20, 24, 32], 0.42 * row / (GRID_ROWS - 1)));
    }

    var state = { mode: "groups", F: 0.03, d: 0.8, n: 300, cov: 0, causal: false, seed: 20261021 };

    /* ---- controls */
    var c1 = H("div", { "class": "controls pca-controls" }, body);
    var lMode = H("label", null, c1, "<span>Population history</span>");
    var selMode = H("select", { "aria-label": "Population history used for the simulation" }, lMode);
    H("option", { value: "groups" }, selMode, "Three groups (A split off first)");
    H("option", { value: "grid" }, selMode, "Smooth cline on a 5 × 3 map");
    var lN = H("label", null, c1, "<span>People <i>n</i></span>");
    var selN = H("select", { "aria-label": "Number of people n" }, lN);
    [150, 300, 600].forEach(function (v) { H("option", { value: String(v) }, selN, String(v)); });

    var c2 = H("div", { "class": "controls pca-controls" }, body);
    var lF = H("label", null, c2, '<span>Genetic differentiation <i>F</i><sub>ST</sub></span>');
    var rF = H("input", { type: "range", min: "0", max: "0.1", step: "0.005", "aria-label": "Genetic differentiation F_ST (Balding–Nichols drift parameter)" }, lF);
    var oF = H("output", { "class": "pca-val" }, lF);
    var lD = H("label", null, c2, "<span>Environmental trait difference</span>");
    var rD = H("input", { type: "range", min: "0", max: "1.5", step: "0.1", "aria-label": "Environmental difference in the trait, in standard deviations" }, lD);
    var oD = H("output", { "class": "pca-val" }, lD);

    var c3 = H("div", { "class": "controls pca-controls" }, body);
    var fs = H("fieldset", { "class": "pca-cov" }, c3, "<legend>Covariates in each SNP test</legend>");
    var covInputs = [];
    [["none", 0], ["PC1", 1], ["PC1 + PC2", 2]].forEach(function (o) {
      var lab = H("label", null, fs);
      var inp = H("input", { type: "radio", name: "pca-cov", value: String(o[1]) }, lab);
      lab.appendChild(document.createTextNode(" " + o[0]));
      covInputs.push(inp);
    });
    var lC = H("label", { "class": "pca-check" }, c3);
    var cbC = H("input", { type: "checkbox" }, lC);
    lC.appendChild(document.createTextNode(" add one real causal SNP (β = " + CAUSAL_BETA + " SD per allele)"));
    var btn = H("button", { type: "button", "class": "btn primary" }, c3, "Re-sample people");

    /* ---- panels */
    var grid = H("div", { "class": "pca-grid" }, body);
    var pA = H("div", { "class": "pca-panel" }, grid), pB = H("div", { "class": "pca-panel" }, grid), pC = H("div", { "class": "pca-panel" }, grid);
    var svgPCA = S("svg", { viewBox: "0 0 300 300", role: "img", "aria-label": "Scatter plot of PC1 against PC2 for the simulated people" }, pA);
    var svgY = S("svg", { viewBox: "0 0 300 300", role: "img", "aria-label": "The simulated trait by group or map position" }, pB);
    var svgQQ = S("svg", { viewBox: "0 0 300 300", role: "img", "aria-label": "Quantile–quantile plot of the SNP association p-values" }, pC);
    var out = H("div", { "class": "readout pca-readout", "aria-live": "polite" }, body);

    /* ---- state <-> controls */
    function sync() {
      selMode.value = state.mode; selN.value = String(state.n);
      rF.value = String(state.F); oF.textContent = state.F.toFixed(3);
      rD.value = String(state.d); oD.textContent = state.d.toFixed(1) + " SD";
      covInputs.forEach(function (inp) { inp.checked = (+inp.value === state.cov); });
      cbC.checked = state.causal;
    }
    var cache = { sim: null, pca: null, key: "" };
    var pending = 0;
    function schedule(level) {                 // level 2: new genotypes; 1: new trait; 0: new tests only
      pending = Math.max(pending, level + 1);
      (window.requestAnimationFrame || setTimeout)(function () {
        if (!pending) return;
        var lv = pending - 1; pending = 0;
        render(lv);
      });
    }
    selMode.addEventListener("change", function () { state.mode = selMode.value; schedule(2); });
    selN.addEventListener("change", function () { state.n = +selN.value; schedule(2); });
    rF.addEventListener("input", function () { state.F = +rF.value; oF.textContent = state.F.toFixed(3); });
    rF.addEventListener("change", function () { state.F = +rF.value; schedule(2); });
    rD.addEventListener("input", function () { state.d = +rD.value; oD.textContent = state.d.toFixed(1) + " SD"; schedule(1); });
    covInputs.forEach(function (inp) { inp.addEventListener("change", function () { if (inp.checked) { state.cov = +inp.value; schedule(0); } }); });
    cbC.addEventListener("change", function () { state.causal = cbC.checked; schedule(1); });
    btn.addEventListener("click", function () { state.seed = (Math.imul(state.seed, 1103515245) + 12345) >>> 0; schedule(2); });

    var trait = null;
    function render(level) {
      var key = state.mode + "|" + state.n + "|" + state.F + "|" + state.seed;
      var t0 = now();
      if (level >= 2 || !cache.sim || cache.key !== key) {
        cache.sim = simulate({ n: state.n, m: M_TOTAL, mode: state.mode, F: state.F, seed: state.seed });
        cache.pca = pca(cache.sim, { mPCA: M_PCA, seed: state.seed });
        cache.key = key;
        level = 2;
      }
      var sim = cache.sim, pc = cache.pca;
      if (level >= 1 || !trait) {
        trait = simulateTrait(sim, { d: state.d, seed: (state.seed ^ 0x9e3779b9) >>> 0,
                                     causal: state.causal ? { j: M_TOTAL - 1, beta: CAUSAL_BETA } : null });
      }
      var covs = pc.pcs.slice(0, state.cov);
      var as = associate(sim, trait, covs);
      var ms = now() - t0;
      drawPCA(sim, pc);
      drawTrait(sim, trait);
      drawQQ(as);
      writeReadout(sim, pc, as, ms, level);
    }

    /* ---- panel 1: PC1 vs PC2 */
    function drawPCA(sim, pc) {
      clear(svgPCA);
      var W = 300, Hh = 300, L = 36, R = 10, T = 26, B = sim.mode === "grid" ? 72 : 58;
      var pw = W - L - R, ph = Hh - T - B, n = sim.n;
      var x = pc.pcs[0], y = pc.pcs[1], lim = 0;
      for (var i = 0; i < n; i++) lim = Math.max(lim, Math.abs(x[i]), Math.abs(y[i]));
      lim = Math.max(2.5, Math.ceil(lim * 1.08 * 2) / 2);
      var X = function (v) { return L + pw * (v + lim) / (2 * lim); };
      var Y = function (v) { return T + ph * (lim - v) / (2 * lim); };
      S("text", { x: 4, y: 15, "class": "t-b" }, svgPCA, "1 · PCA of the genotypes");
      S("rect", { x: L, y: T, width: pw, height: ph, fill: "#fff", stroke: COL.axis }, svgPCA);
      S("line", { x1: X(0), x2: X(0), y1: T, y2: T + ph, stroke: COL.grid }, svgPCA);
      S("line", { x1: L, x2: L + pw, y1: Y(0), y2: Y(0), stroke: COL.grid }, svgPCA);
      var g = S("g", null, svgPCA);
      for (i = 0; i < n; i++) {
        S("circle", { cx: X(x[i]).toFixed(1), cy: Y(y[i]).toFixed(1), r: n > 400 ? 2.4 : 3, fill: personColor(sim, i), "fill-opacity": 0.85, stroke: "#fff", "stroke-width": 0.5 }, g);
      }
      var ve = pc.varExplained;
      S("text", { x: L + pw / 2, y: T + ph + 16, "text-anchor": "middle", "class": "t-sm" }, svgPCA,
        "PC1 (" + (100 * ve[0]).toFixed(1) + "% of genotype variance)");
      S("text", { x: 12, y: T + ph / 2, "text-anchor": "middle", "class": "t-sm", transform: "rotate(-90 12 " + (T + ph / 2) + ")" }, svgPCA,
        "PC2 (" + (100 * ve[1]).toFixed(1) + "%)");
      var ly = T + ph + 36;
      if (sim.mode === "grid") {
        S("text", { x: L, y: ly + 4, "class": "t-sm" }, svgPCA, "Sampling map (color = location):");
        var mx = L + 186, cw = 13, chh = 10;
        for (var r = 0; r < GRID_ROWS; r++) for (var c = 0; c < GRID_COLS; c++) {
          S("rect", { x: mx + c * (cw + 2), y: ly - 8 + r * (chh + 2), width: cw, height: chh, rx: 2, fill: locColor(c, r) }, svgPCA);
        }
        S("text", { x: mx - 4, y: ly + 30, "class": "t-xs" }, svgPCA, "west");
        S("text", { x: mx + GRID_COLS * (cw + 2) - 2, y: ly + 30, "text-anchor": "end", "class": "t-xs" }, svgPCA, "east");
      } else {
        var lx = L;
        for (var k = 0; k < 3; k++) {
          S("circle", { cx: lx + 5, cy: ly, r: 5, fill: COL.g[k] }, svgPCA);
          S("text", { x: lx + 14, y: ly + 4, "class": "t-sm" }, svgPCA, "Group " + GROUP_NAMES[k]);
          lx += 80;
        }
      }
    }

    /* ---- panel 2: the trait (environment only) */
    function drawTrait(sim, y) {
      clear(svgY);
      var W = 300, Hh = 300, L = 36, R = 10, T = 26, B = 58;
      var pw = W - L - R, ph = Hh - T - B, n = sim.n, i;
      var lo = -3.5, hi = 3.5;
      for (i = 0; i < n; i++) { lo = Math.min(lo, y[i]); hi = Math.max(hi, y[i]); }
      lo = Math.floor(lo); hi = Math.ceil(hi);
      var nCat = sim.mode === "grid" ? GRID_COLS : 3;
      var X = function (k) { return L + pw * (k + 0.5) / nCat; };
      var Y = function (v) { return T + ph * (hi - v) / (hi - lo); };
      S("text", { x: 4, y: 15, "class": "t-b" }, svgY, state.causal ? "2 · The trait (one SNP affects it)" : "2 · The trait (no SNP affects it)");
      var step = niceStep(hi - lo, 5);
      for (var v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) {
        S("line", { x1: L, x2: L + pw, y1: Y(v), y2: Y(v), stroke: v === 0 ? COL.axis : COL.grid }, svgY);
        S("text", { x: L - 5, y: Y(v) + 4, "text-anchor": "end", "class": "t-xs" }, svgY, fmtNum(v, 0));
      }
      var rand = mulberry32(12345), sums = new Float64Array(nCat), cnt = new Float64Array(nCat);
      var g = S("g", null, svgY);
      for (i = 0; i < n; i++) {
        var k = sim.mode === "grid" ? Math.round(sim.gx[i] * (GRID_COLS - 1)) : sim.group[i];
        sums[k] += y[i]; cnt[k]++;
        var jx = X(k) + (rand() - 0.5) * pw / nCat * 0.6;
        S("circle", { cx: jx.toFixed(1), cy: Y(y[i]).toFixed(1), r: 2.2, fill: personColor(sim, i), "fill-opacity": 0.7 }, g);
      }
      for (var k2 = 0; k2 < nCat; k2++) {
        if (!cnt[k2]) continue;
        var mY = Y(sums[k2] / cnt[k2]), half = pw / nCat * 0.38;
        S("line", { x1: X(k2) - half, x2: X(k2) + half, y1: mY, y2: mY, stroke: COL.fg, "stroke-width": 2.5 }, svgY);
        S("text", { x: X(k2), y: T + ph + 16, "text-anchor": "middle", "class": "t-sm" }, svgY,
          sim.mode === "grid" ? String(k2 + 1) : "Group " + GROUP_NAMES[k2]);
      }
      S("text", { x: 12, y: T + ph / 2, "text-anchor": "middle", "class": "t-sm", transform: "rotate(-90 12 " + (T + ph / 2) + ")" }, svgY, "trait value (SD units)");
      S("text", { x: L + pw / 2, y: T + ph + 34, "text-anchor": "middle", "class": "t-xs" }, svgY,
        sim.mode === "grid" ? "map column, west (1) → east (5)" : "black bar = group mean");
      S("text", { x: L + pw / 2, y: T + ph + 48, "text-anchor": "middle", "class": "t-xs" }, svgY,
        state.d === 0 ? "no environmental difference" :
        (sim.mode === "grid" ? "environment raises the trait by " + state.d.toFixed(1) + " SD from west to east"
                             : "environment raises the trait by " + state.d.toFixed(1) + " SD in group C"));
    }

    /* ---- panel 3: QQ plot */
    function drawQQ(as) {
      clear(svgQQ);
      var W = 300, Hh = 300, L = 36, R = 10, T = 26, B = 58;
      var pw = W - L - R, ph = Hh - T - B;
      var pts = [], j;
      for (j = 0; j < as.log10p.length; j++) if (as.ok[j]) pts.push({ v: -as.log10p[j], j: j });
      pts.sort(function (a, b) { return b.v - a.v; });
      var M = pts.length;
      var maxE = -Math.log10(0.5 / M);
      var maxO = 0;
      for (j = 0; j < M; j++) maxO = Math.max(maxO, pts[j].v);
      var hiX = Math.ceil(maxE), hiY = Math.max(hiX, Math.ceil(Math.min(maxO, 40)));
      var X = function (v) { return L + pw * v / hiX; };
      var Y = function (v) { return T + ph * (1 - Math.min(v, hiY) / hiY); };
      S("text", { x: 4, y: 15, "class": "t-b" }, svgQQ, "3 · QQ plot of " + fmtInt(M) + " SNP tests");
      S("rect", { x: L, y: T, width: pw, height: ph, fill: "#fff", stroke: COL.axis }, svgQQ);
      var sy = niceStep(hiY, 5);
      for (var v = 0; v <= hiY + 1e-9; v += sy) {
        S("line", { x1: L, x2: L + pw, y1: Y(v), y2: Y(v), stroke: COL.grid }, svgQQ);
        S("text", { x: L - 5, y: Y(v) + 4, "text-anchor": "end", "class": "t-xs" }, svgQQ, String(v));
      }
      for (var u = 0; u <= hiX; u++) S("text", { x: X(u), y: T + ph + 13, "text-anchor": "middle", "class": "t-xs" }, svgQQ, String(u));
      S("line", { x1: X(0), y1: Y(0), x2: X(Math.min(hiX, hiY)), y2: Y(Math.min(hiX, hiY)), stroke: COL.muted, "stroke-dasharray": "4 3" }, svgQQ);
      var g = S("g", null, svgQQ), causalPt = null, lineD = "";
      for (var r = 0; r < M; r++) {
        var e = -Math.log10((r + 0.5) / M), o = pts[r].v;
        var isC = state.causal && pts[r].j === M_TOTAL - 1;
        if (isC) { causalPt = { x: X(e), y: Y(o) }; continue; }
        if (e > 1.2 || o > 2 || r % 8 === 0) {
          S("circle", { cx: X(e).toFixed(1), cy: Y(o).toFixed(1), r: 2.3, fill: COL.accent, "fill-opacity": 0.75 }, g);
        } else {
          lineD += (lineD ? "L" : "M") + X(e).toFixed(1) + "," + Y(o).toFixed(1);
        }
      }
      if (lineD) S("path", { d: lineD, fill: "none", stroke: COL.accent, "stroke-width": 2.5, "stroke-opacity": 0.75 }, g);
      if (causalPt) {
        S("circle", { cx: causalPt.x, cy: causalPt.y, r: 4.5, fill: COL.hit, stroke: "#fff", "stroke-width": 1 }, svgQQ);
        S("text", { x: causalPt.x - 8, y: Math.max(T + 12, causalPt.y + 4), "text-anchor": "end", "class": "t-xs", fill: COL.hit }, svgQQ, "the real causal SNP");
      }
      S("text", { x: L + pw / 2, y: T + ph + 30, "text-anchor": "middle", "class": "t-sm" }, svgQQ, "expected −log₁₀ p (if no SNP mattered)");
      S("text", { x: 12, y: T + ph / 2, "text-anchor": "middle", "class": "t-sm", transform: "rotate(-90 12 " + (T + ph / 2) + ")" }, svgQQ, "observed −log₁₀ p");
      var lam = as.lambda, bad = lam > 1.2, warn = lam > 1.1 && !bad;
      S("rect", { x: L + 8, y: T + 8, width: 104, height: 24, rx: 5, fill: bad ? "#fef3f2" : warn ? "#fff7e8" : "#edf9f2",
                  stroke: bad ? "#f3b7b1" : warn ? "#f0d29e" : "#b9e3cb" }, svgQQ);
      S("text", { x: L + 16, y: T + 25, "class": "t-b", style: "fill:" + (bad ? "#8f1c13" : warn ? "#7a4705" : "#145a37") }, svgQQ, "λ = " + lam.toFixed(2));
      S("text", { x: L + pw / 2, y: T + ph + 46, "text-anchor": "middle", "class": "t-xs" }, svgQQ,
        state.cov === 0 ? "model: trait ~ SNP" : state.cov === 1 ? "model: trait ~ SNP + PC1" : "model: trait ~ SNP + PC1 + PC2");
    }

    function writeReadout(sim, pc, as, ms, level) {
      var nSig = 0, nGws = 0;
      for (var j = 0; j < as.log10p.length; j++) {
        if (!as.ok[j] || (state.causal && j === M_TOTAL - 1)) continue;
        if (as.log10p[j] < -3) nSig++;
        if (as.log10p[j] < -7.30103) nGws++;
      }
      var nNull = as.nTests - (state.causal ? 1 : 0);
      var expected = nNull * 0.001;
      var lam = as.lambda;
      var verdict = lam > 1.2 ? "inflated: many tests are confounded" : lam > 1.1 ? "mildly inflated: possibly chance, possibly confounding" :
                    lam < 0.9 ? "below 1: sampling noise" : "close to 1: no sign of inflation";
      var lines = [
        "<b>Genomic inflation λ = " + lam.toFixed(2) + "</b> (" + verdict + "). With " + fmtInt(as.nTests) +
          " SNPs, λ fluctuates by up to about ±0.1 from sample to sample even when nothing is wrong.",
        "SNPs with p &lt; 0.001: <b>" + fmtInt(nSig) + "</b> (≈ " + expected.toFixed(0) + " expected by chance; none of them affects the trait)" +
          (nGws ? " · p &lt; 5 × 10⁻⁸: <b>" + nGws + "</b>" : "") + ".",
        "PCA: " + fmtInt(pc.used) + " SNPs (MAF ≥ 1%), " + sim.n + " × " + sim.n + " relationship matrix, block power iteration " +
          (pc.converged ? "converged in " + pc.iterations + " iterations" : "stopped after " + pc.iterations + " iterations (no dominant axes: the top eigenvalues are nearly equal)") +
          ". PC1 and PC2 explain " + (100 * pc.varExplained[0]).toFixed(1) + "% and " + (100 * pc.varExplained[1]).toFixed(1) + "% of the variance. " +
          (level >= 2 ? "Simulation + PCA + " : "") + fmtInt(as.nTests) + " regressions: " + Math.round(ms) + " ms."
      ];
      out.innerHTML = lines.map(function (s) { return "<div>" + s + "</div>"; }).join("");
    }

    sync();
    render(2);
  }

  function init() { var root = document.getElementById("w-pca"); if (root) build(root); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
