/* Widget "PCs summarize the people you include" (page: population-structure, section #pca-limits).

   Simulated data (seeded): a pool of 400 people at 1,000 independent SNPs. Allele frequencies follow
   Balding–Nichols drift (from frequency p, a population that drifts by F gets Beta(p(1-F)/F, (1-p)(1-F)/F)):
   root p ~ Uniform(0.05, 0.95); the shared ancestor of A and B drifts 0.03 from the root, then A and B
   drift 0.03 each; C drifts 0.06 from the root. So A and B are close; C is farther from both.
   Pool: 120 people each from A, B and C; 30 admixed people whose allele copies come from A with probability
   qA ~ Uniform(0.15, 0.85) and otherwise from C; 10 full siblings whose two parents are from A (at each SNP a
   child receives one random allele from each parent). Optional LD block: 90 extra SNPs that all copy one
   haplotype dosage h ~ Binomial(2, 0.35) (same in every population), with 2% of the genotypes replaced by
   random values, so the 90 columns are almost identical (strong LD), as in an un-pruned inversion region.
   The reader chooses how many people from each group enter the analysis (the first n of each group).
   PCA, recomputed for the people included:
     p_j = allele frequency at SNP j among them (SNPs with p_j < 0.01 or > 0.99 are skipped);
     z_ij = (g_ij - 2 p_j) / sqrt(2 p_j (1 - p_j));   K = Z Z^T / m  (n x n);   K u_k = lambda_k u_k.
   Top eigenpairs by block power (orthogonal) iteration with Rayleigh–Ritz (block of 12 vectors; small
   eigenproblems by cyclic Jacobi), until the relative residual of the top 4 pairs is below 1e-7.
   Plotted coordinate of person i on PC k: u_ik * sqrt(lambda_k). Variance explained: lambda_k / trace(K).
   Because every column of Z has mean 0, the scores on each PC add up to 0 over the people included
   (McVean 2009): the larger a group, the closer its mean lies to 0.
   Vanilla JS, no libraries, no network; works from file://. The core is exported for Node tests. */
(function () {
  "use strict";

  /* ================================================================== core */

  function mulberry32(a) {
    a = a >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function normalGen(rand) {
    var spare = null;
    return function () {
      if (spare !== null) { var s = spare; spare = null; return s; }
      var u = rand(); while (u <= 0) u = rand();
      var v = rand(), r = Math.sqrt(-2 * Math.log(u));
      spare = r * Math.sin(2 * Math.PI * v);
      return r * Math.cos(2 * Math.PI * v);
    };
  }
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
  function drift(rand, norm, p, F) {
    var k = (1 - F) / F;
    var x = rgamma(rand, norm, p * k), y = rgamma(rand, norm, (1 - p) * k);
    return Math.min(1 - 1e-9, Math.max(1e-9, x / (x + y)));
  }

  var POOL = { A: 120, B: 120, C: 120, AC: 30, FAM: 10 };
  var M_SNP = 1000, L_BLOCK = 90;
  var DRIFT = { AB: 0.03, A: 0.03, B: 0.03, C: 0.06 };

  /* Pool of simulated people. Allele frequencies at M_SNP independent SNPs: root p ~ U(0.05, 0.95);
     the ancestor of A and B drifts 0.03 from the root, then A and B drift 0.03 each; C drifts 0.06 from
     the root (Balding–Nichols). People: A, B, C unadmixed; "AC" admixed, each allele copy from A with
     probability qA ~ U(0.15, 0.85), else from C; "FAM" ten full siblings, children of two parents drawn
     from A (each child gets one random allele from each parent at each SNP).
     LD block: L_BLOCK extra SNPs that all copy one inversion-like haplotype dosage h ~ Binomial(2, 0.35),
     the same distribution in every population, with 2% of genotypes replaced by a random 0/1/2 value.
     Genotypes are stored person-major: g[person][snp], snps 0..M_SNP-1 then the block. */
  function simulatePool(seed) {
    var rand = mulberry32(seed), norm = normalGen(rand);
    var m = M_SNP, j, i;
    var fA = new Float64Array(m), fB = new Float64Array(m), fC = new Float64Array(m);
    for (j = 0; j < m; j++) {
      var p = 0.05 + 0.9 * rand();
      var ab = drift(rand, norm, p, DRIFT.AB);
      fA[j] = drift(rand, norm, ab, DRIFT.A);
      fB[j] = drift(rand, norm, ab, DRIFT.B);
      fC[j] = drift(rand, norm, p, DRIFT.C);
    }
    var people = [];
    function geno(fr, qa, fr2) {
      var g = new Uint8Array(m + L_BLOCK);
      for (var jj = 0; jj < m; jj++) {
        var c = 0;
        for (var h = 0; h < 2; h++) {
          var f = (fr2 && rand() >= qa) ? fr2[jj] : fr[jj];
          if (rand() < f) c++;
        }
        g[jj] = c;
      }
      return g;
    }
    function addBlock(g) {
      var hd = (rand() < 0.35 ? 1 : 0) + (rand() < 0.35 ? 1 : 0);
      for (var l = 0; l < L_BLOCK; l++) g[m + l] = rand() < 0.02 ? Math.floor(rand() * 3) : hd;
    }
    [["A", fA], ["B", fB], ["C", fC]].forEach(function (pr) {
      for (i = 0; i < POOL[pr[0]]; i++) { var g = geno(pr[1]); addBlock(g); people.push({ pop: pr[0], g: g }); }
    });
    for (i = 0; i < POOL.AC; i++) {
      var qa = 0.15 + 0.7 * rand();
      var g2 = geno(fA, qa, fC); addBlock(g2); people.push({ pop: "AC", qa: qa, g: g2 });
    }
    var mom = geno(fA), dad = geno(fA);
    for (i = 0; i < POOL.FAM; i++) {
      var g3 = new Uint8Array(m + L_BLOCK);
      for (j = 0; j < m; j++) {
        var a1 = mom[j] === 2 ? 1 : mom[j] === 0 ? 0 : (rand() < 0.5 ? 1 : 0);
        var a2 = dad[j] === 2 ? 1 : dad[j] === 0 ? 0 : (rand() < 0.5 ? 1 : 0);
        g3[j] = a1 + a2;
      }
      addBlock(g3);
      people.push({ pop: "FAM", g: g3 });
    }
    return { m: m, L: L_BLOCK, people: people };
  }

  /* Indices of the pool people included for given counts (the first nA of A, ...). */
  function selectPeople(pool, opts) {
    var want = { A: opts.nA, B: opts.nB, C: opts.nC, AC: opts.nAC || 0, FAM: opts.family ? POOL.FAM : 0 };
    var seen = { A: 0, B: 0, C: 0, AC: 0, FAM: 0 }, idx = [];
    pool.people.forEach(function (p, i) { if (seen[p.pop] < want[p.pop]) { seen[p.pop]++; idx.push(i); } });
    return idx;
  }

  /* Standardized genotypes and relationship matrix K = Z Z^T / m for the chosen people.
     z_ij = (g_ij - 2 p_j) / sqrt(2 p_j (1 - p_j)), p_j the allele frequency among the chosen people;
     SNPs with p_j outside [0.01, 0.99] in the chosen people are skipped. */
  function grm(pool, idx, withBlock) {
    var n = idx.length, mAll = pool.m + (withBlock ? pool.L : 0), i, j, l;
    var Z = new Float64Array(n * mAll), used = 0;
    var cnt = new Float64Array(mAll);
    for (i = 0; i < n; i++) { var g = pool.people[idx[i]].g; for (j = 0; j < mAll; j++) cnt[j] += g[j]; }
    var cols = [];
    for (j = 0; j < mAll; j++) {
      var p = cnt[j] / (2 * n);
      if (p < 0.01 || p > 0.99) continue;
      var sd = Math.sqrt(2 * p * (1 - p)), mu = 2 * p;
      cols.push([j, mu, sd]);
    }
    used = cols.length;
    for (i = 0; i < n; i++) {
      var gi = pool.people[idx[i]].g, oi = i * used;
      for (var c = 0; c < used; c++) { var cc = cols[c]; Z[oi + c] = (gi[cc[0]] - cc[1]) / cc[2]; }
    }
    var K = new Float64Array(n * n);
    for (i = 0; i < n; i++) {
      var o1 = i * used;
      for (l = 0; l <= i; l++) {
        var o2 = l * used, acc = 0;
        for (c = 0; c < used; c++) acc += Z[o1 + c] * Z[o2 + c];
        acc /= used;
        K[i * n + l] = acc; K[l * n + i] = acc;
      }
    }
    var trace = 0;
    for (i = 0; i < n; i++) trace += K[i * n + i];
    return { K: K, n: n, used: used, trace: trace };
  }

  /* Cyclic Jacobi for a small symmetric matrix (row-major b*b, modified in place).
     Returns { values (descending), vectors: Float64Array b*b, column c = eigenvector c }. */
  function jacobiEigen(A, b) {
    var V = new Float64Array(b * b), r, c, k;
    for (r = 0; r < b; r++) V[r * b + r] = 1;
    for (var sweep = 0; sweep < 100; sweep++) {
      var off = 0, tot = 0;
      for (r = 0; r < b; r++) for (c = 0; c < b; c++) { var x = A[r * b + c] * A[r * b + c]; tot += x; if (r !== c) off += x; }
      if (off <= 1e-30 * Math.max(tot, 1e-300)) break;
      for (var p = 0; p < b - 1; p++) {
        for (var q = p + 1; q < b; q++) {
          var apq = A[p * b + q];
          if (Math.abs(apq) < 1e-300) continue;
          var app = A[p * b + p], aqq = A[q * b + q];
          var theta = (aqq - app) / (2 * apq);
          var t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
          var cs = 1 / Math.sqrt(t * t + 1), sn = t * cs;
          for (k = 0; k < b; k++) {
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
    var vecs = new Float64Array(b * b);
    for (c = 0; c < b; c++) for (r = 0; r < b; r++) vecs[r * b + c] = V[r * b + idx[c]];
    return { values: vals, vectors: vecs };
  }

  function mgs(X, n, b) {                         // orthonormalize the b columns (column-major n x b)
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

  /* Top-k eigenpairs of a symmetric n x n matrix: block power (orthogonal) iteration with a block of
     b = k + extra vectors, Rayleigh–Ritz at every step, until the relative residual
     |K v - lambda v| / lambda_1 of the k wanted pairs is below tol. */
  function topEigen(K, n, k, seed, opts) {
    opts = opts || {};
    var b = Math.min(n, k + (opts.extra == null ? 8 : opts.extra));
    var maxIt = opts.maxIt || 500, tol = opts.tol || 1e-7;
    var rand = mulberry32(seed), norm = normalGen(rand);
    var V = new Float64Array(n * b), W = new Float64Array(n * b), i, c, r, l;
    for (i = 0; i < n * b; i++) V[i] = norm();
    mgs(V, n, b);
    function mult() {
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
    var Hm = new Float64Array(b * b), V2 = new Float64Array(n * b), W2 = new Float64Array(n * b);
    for (;;) {
      it++;
      for (r = 0; r < b; r++) for (c = r; c < b; c++) {
        var acc = 0, orr = r * n, oc2 = c * n;
        for (i = 0; i < n; i++) acc += V[orr + i] * W[oc2 + i];
        Hm[r * b + c] = acc; Hm[c * b + r] = acc;
      }
      var e = jacobiEigen(Hm, b);
      vals = e.values;
      V2.fill(0); W2.fill(0);
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
      res = 0;
      for (c = 0; c < k; c++) {
        var ss = 0, o3 = c * n;
        for (i = 0; i < n; i++) { var dl = W[o3 + i] - vals[c] * V[o3 + i]; ss += dl * dl; }
        res = Math.max(res, Math.sqrt(ss) / Math.max(Math.abs(vals[0]), 1e-300));
      }
      if (res < tol) { converged = true; break; }
      if (it >= maxIt) break;
      V.set(W); mgs(V, n, b); mult();
    }
    var vectors = [];
    for (c = 0; c < k; c++) vectors.push(V.slice(c * n, (c + 1) * n));
    return { vectors: vectors, values: vals.slice(0, k), allValues: vals.slice(), iterations: it, converged: converged, residual: res };
  }

  /* PCA of the chosen people: scores on PC k are u_ik * sqrt(lambda_k) (the person's coordinate along the
     axis, which does not shrink as people are added; PLINK writes u_ik). */
  function pca(pool, opts, nPC) {
    var idx = selectPeople(pool, opts);
    var g = grm(pool, idx, !!opts.ldBlock);
    var e = topEigen(g.K, g.n, nPC, 12345, { extra: 8 });
    var scores = e.vectors.map(function (v, k) {
      var s = Math.sqrt(Math.max(e.values[k], 0)), out = new Float64Array(g.n);
      for (var i = 0; i < g.n; i++) out[i] = v[i] * s;
      return out;
    });
    return { idx: idx, n: g.n, used: g.used, trace: g.trace, values: e.values, allValues: e.allValues,
             scores: scores, iterations: e.iterations, converged: e.converged, K: g.K };
  }

  var SEED = 4242;

  /* Eigenvector signs are arbitrary. With a previous result, each PC is flipped if needed so that the people
     present in both analyses keep scores of the same sign on average (positive dot product); otherwise
     (or if that dot product is 0) so that the sum of cubed scores is positive. */
  function alignSigns(res, prevRes) {
    var prevPos = null, k, i;
    if (prevRes) { prevPos = {}; prevRes.idx.forEach(function (pi, j) { prevPos[pi] = j; }); }
    for (k = 0; k < res.scores.length; k++) {
      var s = res.scores[k], d = 0;
      if (prevRes && prevRes.scores[k]) {
        for (i = 0; i < res.idx.length; i++) { var q = prevPos[res.idx[i]]; if (q !== undefined) d += s[i] * prevRes.scores[k][q]; }
      }
      if (d === 0) for (i = 0; i < s.length; i++) d += s[i] * s[i] * s[i];
      if (d < 0) for (i = 0; i < s.length; i++) s[i] = -s[i];
    }
  }

  var core = { mulberry32: mulberry32, simulatePool: simulatePool, selectPeople: selectPeople, grm: grm,
    jacobiEigen: jacobiEigen, topEigen: topEigen, pca: pca, alignSigns: alignSigns, POOL: POOL, SEED: SEED };
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  if (typeof document === "undefined") return;

  /* ================================================================== user interface */

  var NS = "http://www.w3.org/2000/svg";
  function S(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag);
    for (var a in attrs) if (attrs[a] != null) e.setAttribute(a, attrs[a]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function H(tag, attrs, parent, html) {
    var e = document.createElement(tag);
    for (var a in attrs) if (attrs[a] != null) e.setAttribute(a, attrs[a]);
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  }
  function fmt(x, d) { var s = x.toFixed(d); if (/^-0\.?0*$/.test(s)) s = s.slice(1); return s.charAt(0) === "-" ? "−" + s.slice(1) : (x > 0 && d >= 0 ? "+" + s : s); }
  function fmtU(x, d) { var s = x.toFixed(d); return s.charAt(0) === "-" ? "−" + s.slice(1) : s; }

  var POP_STYLE = {
    A: { color: "var(--q1)", label: "A" }, B: { color: "var(--q2)", label: "B" }, C: { color: "var(--q3)", label: "C" },
    AC: { color: "var(--q7)", label: "admixed A×C" }, FAM: { color: "var(--q4)", label: "family (siblings from A)" }
  };
  var PRESETS = [
    { label: "Equal: 60 / 60 / 60", nA: 60, nB: 60, nC: 60 },
    { label: "Mostly A: 120 / 15 / 15", nA: 120, nB: 15, nC: 15 },
    { label: "Mostly C: 15 / 15 / 120", nA: 15, nB: 15, nC: 120 }
  ];

  function init(root) {
    var body = root.querySelector(".widget-body");
    if (!body) return;
    body.innerHTML = "";
    var pool = simulatePool(SEED);
    var tracked = ["A", "B", "C"].map(function (p) {
      for (var i = 0; i < pool.people.length; i++) if (pool.people[i].pop === p) return i;
      return -1;
    });
    var state = { nA: 60, nB: 60, nC: 60, nAC: 0, family: false, ldBlock: false, axes: 0 };
    var prev = null, cur = null, prevTracked = null;

    var uid = root.id;
    function slider(parent, label, min, max, step, key) {
      var lab = H("label", { "for": uid + "-" + key }, parent);
      lab.appendChild(document.createTextNode(label + " "));
      var inp = H("input", { type: "range", id: uid + "-" + key, min: min, max: max, step: step, value: state[key] }, lab);
      var out = H("output", { "for": uid + "-" + key, "class": "ps-out" }, lab, String(state[key]));
      inp.addEventListener("input", function () { state[key] = +inp.value; out.textContent = inp.value; schedule(); });
      return { input: inp, out: out, key: key };
    }
    var c1 = H("div", { "class": "controls" }, body);
    var sl = [slider(c1, "People from A", 5, 120, 5, "nA"), slider(c1, "from B", 5, 120, 5, "nB"),
              slider(c1, "from C", 5, 120, 5, "nC"), slider(c1, "admixed A×C", 0, 30, 5, "nAC")];
    var c2 = H("div", { "class": "controls" }, body);
    PRESETS.forEach(function (pr) {
      var b = H("button", { type: "button", "class": "btn" }, c2, pr.label);
      b.addEventListener("click", function () {
        ["nA", "nB", "nC"].forEach(function (k) { state[k] = pr[k]; });
        sl.forEach(function (s) { s.input.value = state[s.key]; s.out.textContent = String(state[s.key]); });
        schedule(true);
      });
    });
    var c3 = H("div", { "class": "controls" }, body);
    function check(label, key) {
      var lab = H("label", {}, c3);
      var cb = H("input", { type: "checkbox" }, lab);
      lab.appendChild(document.createTextNode(" " + label));
      cb.addEventListener("change", function () { state[key] = cb.checked; schedule(true); });
    }
    check("Add a family: 10 siblings from A", "family");
    check("Include an un-pruned LD block (90 SNPs)", "ldBlock");
    var c4 = H("div", { "class": "controls" }, body);
    H("span", { "class": "ps-lab", id: uid + "-axlab" }, c4, "Axes:");
    var seg = H("div", { "class": "ps-seg", role: "group", "aria-labelledby": uid + "-axlab" }, c4);
    var axBtns = ["PC1 & PC2", "PC2 & PC3", "PC3 & PC4"].map(function (t, i) {
      var b = H("button", { type: "button", "class": "btn" + (i === 0 ? " primary" : ""), "aria-pressed": i === 0 ? "true" : "false" }, seg, t);
      b.addEventListener("click", function () {
        state.axes = i;
        axBtns.forEach(function (bb, j) { bb.classList.toggle("primary", j === i); bb.setAttribute("aria-pressed", j === i ? "true" : "false"); });
        draw();
      });
      return b;
    });

    var plotWrap = H("div", { "class": "ps-pca-plot" }, body);
    var svg = S("svg", { role: "img" }, plotWrap);
    var legend = H("div", { "class": "ps-legend" }, body);
    var screeWrap = H("div", { "class": "ps-scree" }, body);
    var scree = S("svg", { role: "img" }, screeWrap);
    var readout = H("div", { "class": "readout", "aria-live": "polite" }, body);
    H("p", { "class": "note" }, body,
      "Simulated data: " + M_SNP + " independent SNPs (plus the optional LD block). A and B split from each other " +
      "recently; C split from their ancestor earlier. Coordinates are the eigenvector entry × √eigenvalue, so they do " +
      "not shrink when people are added (PLINK's .eigenvec file holds the eigenvector alone). Signs are chosen to match " +
      "the previous view, because the sign of an eigenvector is arbitrary.");

    var timer = null;
    function schedule(now) {
      clearTimeout(timer);
      timer = setTimeout(compute, now ? 0 : 90);
    }

    function compute() {
      var res = pca(pool, state, 4);
      res.pops = res.idx.map(function (pi) { return pool.people[pi].pop; });
      alignSigns(res, cur, pool);
      if (cur) {
        prev = cur;
        prevTracked = tracked.map(function (pi) {
          var i = cur.idx.indexOf(pi);
          return i < 0 ? null : cur.scores.map(function (s) { return s[i]; });
        });
      }
      cur = res;
      draw();
    }

    function draw() {
      if (!cur) return;
      var a1 = state.axes, a2 = state.axes + 1;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var W = Math.max(300, Math.min(760, Math.round(plotWrap.clientWidth || 600)));
      var Hh = Math.round(Math.min(380, Math.max(280, W * 0.62)));
      svg.setAttribute("viewBox", "0 0 " + W + " " + Hh);
      svg.setAttribute("width", W); svg.setAttribute("height", Hh);
      var ML = 46, MR = 12, MT = 12, MB = 42, PW = W - ML - MR, PH = Hh - MT - MB;
      var xs = cur.scores[a1], ys = cur.scores[a2], n = cur.n, i;
      var pts = [];
      for (i = 0; i < n; i++) pts.push([xs[i], ys[i]]);
      if (prevTracked) prevTracked.forEach(function (pt) { if (pt) pts.push([pt[a1], pt[a2]]); });
      var xmin = 0, xmax = 0, ymin = 0, ymax = 0;
      pts.forEach(function (p) { xmin = Math.min(xmin, p[0]); xmax = Math.max(xmax, p[0]); ymin = Math.min(ymin, p[1]); ymax = Math.max(ymax, p[1]); });
      var px = (xmax - xmin) * 0.06 || 0.1, py = (ymax - ymin) * 0.08 || 0.1;
      xmin -= px; xmax += px; ymin -= py; ymax += py;
      function X(v) { return ML + (v - xmin) / (xmax - xmin) * PW; }
      function Y(v) { return MT + PH - (v - ymin) / (ymax - ymin) * PH; }
      S("rect", { x: ML, y: MT, width: PW, height: PH, style: "fill: none; stroke: var(--border)" }, svg);
      S("line", { x1: X(0), x2: X(0), y1: MT, y2: MT + PH, style: "stroke: var(--fg-faint); stroke-dasharray: 3 3" }, svg);
      S("line", { x1: ML, x2: ML + PW, y1: Y(0), y2: Y(0), style: "stroke: var(--fg-faint); stroke-dasharray: 3 3" }, svg);
      var tr = cur.trace;
      S("text", { x: ML + PW / 2, y: Hh - 8, "text-anchor": "middle", "class": "t-sm" }, svg,
        "PC" + (a1 + 1) + " (" + fmtU(100 * cur.values[a1] / tr, 1) + "% of variance)");
      S("text", { x: 14, y: MT + PH / 2, "text-anchor": "middle", "class": "t-sm", transform: "rotate(-90 14 " + (MT + PH / 2) + ")" }, svg,
        "PC" + (a2 + 1) + " (" + fmtU(100 * cur.values[a2] / tr, 1) + "%)");
      S("text", { x: X(0) + 4, y: MT + 13, "class": "t-xs" }, svg, "0");
      // points (family last so the diamonds stay visible)
      var order = [];
      for (i = 0; i < n; i++) order.push(i);
      order.sort(function (u, v) { return (cur.pops[u] === "FAM") - (cur.pops[v] === "FAM"); });
      order.forEach(function (j) {
        var st = POP_STYLE[cur.pops[j]], cx = X(xs[j]), cy = Y(ys[j]);
        if (cur.pops[j] === "FAM") {
          S("path", { d: "M" + cx.toFixed(1) + " " + (cy - 4.5).toFixed(1) + "l4.5 4.5l-4.5 4.5l-4.5 -4.5z", style: "fill: " + st.color + "; stroke: #fff; stroke-width: 0.8" }, svg);
        } else {
          S("circle", { cx: cx.toFixed(1), cy: cy.toFixed(1), r: 3.1, style: "fill: " + st.color + "; fill-opacity: 0.75" }, svg);
        }
      });
      // tracked people: previous position, arrow, current position
      tracked.forEach(function (pi, t) {
        var j = cur.idx.indexOf(pi);
        if (j < 0) return;
        var cx = X(xs[j]), cy = Y(ys[j]);
        var pp = prevTracked && prevTracked[t];
        if (pp) {
          var ox = X(pp[a1]), oy = Y(pp[a2]);
          if (Math.abs(ox - cx) + Math.abs(oy - cy) > 2) {
            S("line", { x1: ox.toFixed(1), y1: oy.toFixed(1), x2: cx.toFixed(1), y2: cy.toFixed(1), style: "stroke: var(--fg); stroke-width: 1.2; stroke-dasharray: 3 2" }, svg);
            S("circle", { cx: ox.toFixed(1), cy: oy.toFixed(1), r: 6, style: "fill: #fff; stroke: var(--fg); stroke-width: 1.2" }, svg);
          }
        }
        S("circle", { cx: cx.toFixed(1), cy: cy.toFixed(1), r: 7.5, style: "fill: " + POP_STYLE[pool.people[pi].pop].color + "; stroke: var(--fg); stroke-width: 2" }, svg);
        S("text", { x: cx.toFixed(1), y: (cy + 4).toFixed(1), "text-anchor": "middle", "class": "t-xs", style: "fill: #fff; font-weight: 700" }, svg, String(t + 1));
      });
      svg.setAttribute("aria-label", "Scatter plot of PC" + (a1 + 1) + " against PC" + (a2 + 1) + " for " + n + " simulated people.");

      // legend
      var present = {};
      cur.pops.forEach(function (p) { present[p] = (present[p] || 0) + 1; });
      var lg = "";
      ["A", "B", "C", "AC", "FAM"].forEach(function (p) {
        if (!present[p]) return;
        lg += '<span><span class="ps-dot' + (p === "FAM" ? " ps-dia" : "") + '" style="background:' + POP_STYLE[p].color + '"></span>' + POP_STYLE[p].label + " (" + present[p] + ")</span>";
      });
      lg += '<span><span class="ps-dot ps-ring"></span>tracked persons 1–3 (from A, B, C)' + (prevTracked ? "; white ring = position before your last change" : "") + "</span>";
      legend.innerHTML = lg;

      // scree
      while (scree.firstChild) scree.removeChild(scree.firstChild);
      var SW = Math.max(300, Math.min(760, Math.round(screeWrap.clientWidth || 600))), SH = 132, B0 = 106;
      scree.setAttribute("viewBox", "0 0 " + SW + " " + SH);
      scree.setAttribute("width", SW); scree.setAttribute("height", SH);
      var vals = cur.allValues.slice(0, 8).map(function (v) { return 100 * v / tr; });
      var vmax = Math.max(vals[0], 1), bw = (SW - 52) / 8;
      S("text", { x: 4, y: 13, "class": "t-sm" }, scree, "Variance explained by PC1–PC8 (eigenvalue ÷ trace)");
      vals.forEach(function (v, k) {
        var h = v / vmax * 70, x = 40 + k * bw;
        S("rect", { x: (x + bw * 0.15).toFixed(1), y: (B0 - h).toFixed(1), width: (bw * 0.7).toFixed(1), height: h.toFixed(1),
          style: "fill: " + (k === a1 || k === a2 ? "var(--accent)" : "var(--border-strong)") }, scree);
        S("text", { x: (x + bw / 2).toFixed(1), y: (B0 - 4 - h).toFixed(1), "text-anchor": "middle", "class": "t-xs" }, scree, fmtU(v, 1) + "%");
        S("text", { x: (x + bw / 2).toFixed(1), y: B0 + 16, "text-anchor": "middle", "class": "t-xs" }, scree, "PC" + (k + 1));
      });
      S("line", { x1: 40, x2: SW - 12, y1: B0, y2: B0, style: "stroke: var(--fg-muted)" }, scree);
      scree.setAttribute("aria-label", "Bar chart of the share of variance explained by the first eight principal components.");

      // readout
      var lines = [];
      lines.push(n + " simulated people · " + cur.used.toLocaleString("en-US") + " SNPs used (frequency between 0.01 and 0.99 among these people)");
      var means = {}, counts = {};
      cur.pops.forEach(function (p, j) { means[p] = (means[p] || 0) + xs[j]; counts[p] = (counts[p] || 0) + 1; });
      var parts = [], sum = 0;
      ["A", "B", "C", "AC", "FAM"].forEach(function (p) {
        if (!counts[p]) return;
        sum += means[p];
        parts.push(POP_STYLE[p].label.split(" (")[0] + ": mean " + fmt(means[p] / counts[p], 3) + " × " + counts[p] + " = " + fmt(means[p], 2));
      });
      lines.push("PC" + (a1 + 1) + " by group: " + parts.join(" · ") + " → total " + fmt(Math.abs(sum) < 5e-4 ? 0 : sum, 2));
      tracked.forEach(function (pi, t) {
        var j = cur.idx.indexOf(pi);
        if (j < 0) return;
        var s = "Person " + (t + 1) + " (" + pool.people[pi].pop + "): PC" + (a1 + 1) + " " + fmt(xs[j], 3) + ", PC" + (a2 + 1) + " " + fmt(ys[j], 3);
        var pp = prevTracked && prevTracked[t];
        if (pp) s += " (before: " + fmt(pp[a1], 3) + ", " + fmt(pp[a2], 3) + ")";
        lines.push(s);
      });
      if (state.ldBlock) {
        var best = blockCorr(cur);
        lines.push("LD block: PC" + (best.k + 1) + " has correlation " + fmtU(best.r, 2) + " with a person's genotype in the block");
      }
      if (state.family) {
        var fam = famShare(cur);
        lines.push("Family: PC" + (fam.k + 1) + " is the PC on which the ten siblings sit farthest from the other people (mean " + fmt(fam.mean, 3) + ")");
      }
      readout.innerHTML = lines.join("<br>");
    }

    function blockCorr(res) {
      var dose = res.idx.map(function (pi) { var g = pool.people[pi].g, s = 0; for (var l = 0; l < pool.L; l++) s += g[pool.m + l]; return s / pool.L; });
      var best = { k: 0, r: 0 };
      for (var k = 0; k < 4; k++) {
        var r = corr(dose, res.scores[k]);
        if (Math.abs(r) > Math.abs(best.r)) best = { k: k, r: Math.abs(r) };
      }
      return best;
    }
    function famShare(res) {
      var best = { k: 0, z: 0, mean: 0 };
      for (var k = 0; k < 4; k++) {
        var sf = 0, nf = 0, so = 0, no = 0;
        res.pops.forEach(function (p, j) { if (p === "FAM") { sf += res.scores[k][j]; nf++; } else { so += res.scores[k][j]; no++; } });
        var d = Math.abs(sf / nf - so / no) / Math.sqrt(res.values[k] / res.n);
        if (d > best.z) best = { k: k, z: d, mean: sf / nf };
      }
      return best;
    }
    function corr(a, b) {
      var n = a.length, ma = 0, mb = 0, sab = 0, saa = 0, sbb = 0, i;
      for (i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
      ma /= n; mb /= n;
      for (i = 0; i < n; i++) { var da = a[i] - ma, db = b[i] - mb; sab += da * db; saa += da * da; sbb += db * db; }
      return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : 0;
    }

    var rt = null;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(draw, 150); });
    compute();
  }

  function start() {
    var root = document.getElementById("w-pca-composition");
    if (root) init(root);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
