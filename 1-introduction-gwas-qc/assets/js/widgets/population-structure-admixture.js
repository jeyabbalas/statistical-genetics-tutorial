/* Widget "Ancestry bar plots depend on K and on who is included" (page: population-structure, #model-based).

   Simulated data (seeded). 600 independent SNPs. Allele frequencies (Balding–Nichols drift: a population
   that drifts by F from frequency p gets a frequency ~ Beta(p(1-F)/F, (1-p)(1-F)/F), mean p, variance
   F p(1-p)): root p ~ Uniform(0.05, 0.95); populations A and B and the shared ancestor of C and D each
   drift by F = 0.15 from the root; C and D then drift a further F = 0.06 each, so D is a sister of C.
   People: 16 from each of A, B and C, 14 from D, and 14 admixed "A×B" people whose allele copies come
   from A with probability qA ~ Uniform(0.2, 0.8) and otherwise from B.
   Model (STRUCTURE / ADMIXTURE): g_ij ~ Binomial(2, sum_k q_ik f_kj).
   Fit: maximum likelihood by the EM algorithm of Tang et al. (2005), accelerated with SQUAREM
   (Varadhan & Roland 2008), from 3 random starts; the start with the highest log-likelihood is shown.
     E-step  a_ijk = g_ij q_ik f_kj / sum_l q_il f_lj            (expected copies of allele 1 from component k)
             b_ijk = (2 - g_ij) q_ik (1 - f_kj) / sum_l q_il (1 - f_lj)   (expected copies of allele 2)
     M-step  q_ik = sum_j (a_ijk + b_ijk) / (2m),   f_kj = sum_i a_ijk / sum_i (a_ijk + b_ijk)
             (the code divides by sum_k sum_j (a_ijk + b_ijk), which equals 2m, so rounding cannot move q_i off the simplex)
   Log-likelihood (without the binomial constants): sum_ij [ g_ij log s_ij + (2 - g_ij) log(1 - s_ij) ],
   s_ij = sum_k q_ik f_kj. A run stops when one SQUAREM cycle (3 EM steps) raises it by less than 1e-7 of
   its absolute value. Components are unlabeled. For display, component k's overlap with true source s is
   O_ks = sum_i qhat_ik q_is; a component takes the color of source s when s has at least 60% of the
   component's overlap and no other component overlaps s more; otherwise it gets a color not used for any
   source. Its label lists every source with at least 20% of its overlap (for example "A + B").
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
  function normalGen(rand) {                      // Box–Muller, both draws used
    var spare = null;
    return function () {
      if (spare !== null) { var s = spare; spare = null; return s; }
      var u = rand(); while (u <= 0) u = rand();
      var v = rand(), r = Math.sqrt(-2 * Math.log(u));
      spare = r * Math.sin(2 * Math.PI * v);
      return r * Math.cos(2 * Math.PI * v);
    };
  }
  function rgamma(rand, norm, a) {               // Gamma(a, 1): Marsaglia & Tsang (2000)
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
  function drift(rand, norm, p, F) {             // Balding–Nichols
    var k = (1 - F) / F;
    var x = rgamma(rand, norm, p * k), y = rgamma(rand, norm, (1 - p) * k);
    return Math.min(1 - 1e-9, Math.max(1e-9, x / (x + y)));
  }

  var GROUPS = [
    { key: "A", label: "A", n: 16 },
    { key: "B", label: "B", n: 16 },
    { key: "C", label: "C", n: 16 },
    { key: "AB", label: "A×B", n: 14 },
    { key: "D", label: "D", n: 14 }
  ];
  var SOURCES = ["A", "B", "C", "D"];
  var F_ROOT = 0.15, F_CD = 0.06, M_SNP = 600, SEED = 20260;

  function simulate(seed, m) {
    var rand = mulberry32(seed), norm = normalGen(rand);
    var f = {}, s, j, i;
    SOURCES.forEach(function (k) { f[k] = new Float64Array(m); });
    for (j = 0; j < m; j++) {
      var p = 0.05 + 0.9 * rand();
      f.A[j] = drift(rand, norm, p, F_ROOT);
      f.B[j] = drift(rand, norm, p, F_ROOT);
      var cd = drift(rand, norm, p, F_ROOT);
      f.C[j] = drift(rand, norm, cd, F_CD);
      f.D[j] = drift(rand, norm, cd, F_CD);
    }
    var people = [];
    GROUPS.forEach(function (g, gi) {
      for (i = 0; i < g.n; i++) {
        var q = { A: 0, B: 0, C: 0, D: 0 };
        if (g.key === "AB") { var a = 0.2 + 0.6 * rand(); q.A = a; q.B = 1 - a; }
        else q[g.key] = 1;
        people.push({ group: gi, q: q, g: new Uint8Array(m) });
      }
    });
    people.forEach(function (pp) {
      for (j = 0; j < m; j++) {
        var pr = 0;
        for (s = 0; s < 4; s++) pr += pp.q[SOURCES[s]] * f[SOURCES[s]][j];
        pp.g[j] = (rand() < pr ? 1 : 0) + (rand() < pr ? 1 : 0);
      }
    });
    var adm = people.filter(function (pp) { return GROUPS[pp.group].key === "AB"; });
    adm.sort(function (x, y) { return y.q.A - x.q.A; });  // admixed people ordered by true share from A
    var out = [], k2 = 0;
    people.forEach(function (pp) { if (GROUPS[pp.group].key === "AB") out.push(adm[k2++]); else out.push(pp); });
    return { m: m, f: f, people: out };
  }

  var FMIN = 1e-6, FMAX = 1 - 1e-6;
  function emInit(n, m, K, seed) {
    var rand = mulberry32(seed), Q = new Float64Array(n * K), F = new Float64Array(K * m), i, k, j;
    for (i = 0; i < n; i++) {                     // q_i ~ Dirichlet(1, ..., 1)
      var s = 0;
      for (k = 0; k < K; k++) { var e = -Math.log(1 - rand()); Q[i * K + k] = e; s += e; }
      for (k = 0; k < K; k++) Q[i * K + k] /= s;
    }
    for (k = 0; k < K; k++) for (j = 0; j < m; j++) F[k * m + j] = 0.2 + 0.6 * rand();
    return { Q: Q, F: F, ll: -Infinity, iters: 0 };
  }
  function makeWork(n, m, K) {
    return { Fa: new Float64Array(K * m), Fb: new Float64Array(K * m), acc: new Float64Array(K), Qn: new Float64Array(n * K) };
  }
  /* One EM update of st (Q, F) in place; returns the log-likelihood of the parameters before the update. */
  function emStep(G, n, m, K, st, work) {
    var Q = st.Q, F = st.F, i, j, k;
    var Fa = work.Fa, Fb = work.Fb, acc = work.acc, Qn = work.Qn;
    Fa.fill(0); Fb.fill(0);
    var ll = 0;
    for (i = 0; i < n; i++) {
      var oq = i * K, og = i * m;
      for (k = 0; k < K; k++) acc[k] = 0;
      for (j = 0; j < m; j++) {
        var g = G[og + j], sa = 0;
        for (k = 0; k < K; k++) sa += Q[oq + k] * F[k * m + j];
        var sb = 1 - sa;
        ll += (g ? g * Math.log(sa) : 0) + (g < 2 ? (2 - g) * Math.log(sb) : 0);
        var ga = g / sa, gb = (2 - g) / sb;
        for (k = 0; k < K; k++) {
          var fk = F[k * m + j], qk = Q[oq + k];
          var a = qk * fk * ga, b = qk * (1 - fk) * gb;
          acc[k] += a + b;
          Fa[k * m + j] += a;
          Fb[k * m + j] += b;
        }
      }
      var tot = 0;                                // = 2m in exact arithmetic; dividing by it keeps the row on the simplex
      for (k = 0; k < K; k++) tot += acc[k];
      for (k = 0; k < K; k++) Qn[oq + k] = acc[k] / tot;
    }
    Q.set(Qn);
    for (k = 0; k < K; k++) for (j = 0; j < m; j++) {
      var t = Fa[k * m + j] + Fb[k * m + j];
      var v = t > 0 ? Fa[k * m + j] / t : 0.5;
      F[k * m + j] = v < FMIN ? FMIN : v > FMAX ? FMAX : v;
    }
    return ll;
  }
  function logLik(G, n, m, K, Q, F) {
    var ll = 0;
    for (var i = 0; i < n; i++) for (var j = 0; j < m; j++) {
      var g = G[i * m + j], sa = 0;
      for (var k = 0; k < K; k++) sa += Q[i * K + k] * F[k * m + j];
      ll += (g ? g * Math.log(sa) : 0) + (g < 2 ? (2 - g) * Math.log(1 - sa) : 0);
    }
    return ll;
  }
  /* SQUAREM cycle (scheme S3): two EM steps give r = theta1 - theta0 and v = theta2 - theta1 - r; the point
     theta0 - 2 a r + a^2 v with a = -|r|/|v| (a <= -1; a = -1 gives theta2) is projected into the parameter
     space and followed by one EM step; it is kept only if its log-likelihood is at least that of theta1. */
  function project(Q, F, n, K, m) {
    var i, k;
    for (i = 0; i < n; i++) {
      var s = 0;
      for (k = 0; k < K; k++) { var v = Q[i * K + k]; if (!(v > 1e-6)) v = 1e-6; if (v > 1) v = 1; Q[i * K + k] = v; s += v; }
      for (k = 0; k < K; k++) Q[i * K + k] /= s;
    }
    for (k = 0; k < K * m; k++) { var f = F[k]; F[k] = !(f > FMIN) ? FMIN : f > FMAX ? FMAX : f; }
  }
  function makeBuf(n, m, K) {
    return { Q0: new Float64Array(n * K), Q1: new Float64Array(n * K), Q2: new Float64Array(n * K),
             F0: new Float64Array(K * m), F1: new Float64Array(K * m), F2: new Float64Array(K * m) };
  }
  function squaremCycle(G, n, m, K, st, work, buf) {
    var nq = n * K, nf = K * m, i, r, v;
    buf.Q0.set(st.Q); buf.F0.set(st.F);
    emStep(G, n, m, K, st, work);
    buf.Q1.set(st.Q); buf.F1.set(st.F);
    var ll1 = emStep(G, n, m, K, st, work);
    var rr = 0, vv = 0;
    for (i = 0; i < nq; i++) { r = buf.Q1[i] - buf.Q0[i]; v = st.Q[i] - buf.Q1[i] - r; rr += r * r; vv += v * v; }
    for (i = 0; i < nf; i++) { r = buf.F1[i] - buf.F0[i]; v = st.F[i] - buf.F1[i] - r; rr += r * r; vv += v * v; }
    var a = vv > 0 ? -Math.sqrt(rr / vv) : -1;
    if (a > -1) a = -1;
    buf.Q2.set(st.Q); buf.F2.set(st.F);
    if (a < -1) {
      for (i = 0; i < nq; i++) { r = buf.Q1[i] - buf.Q0[i]; v = buf.Q2[i] - buf.Q1[i] - r; st.Q[i] = buf.Q0[i] - 2 * a * r + a * a * v; }
      for (i = 0; i < nf; i++) { r = buf.F1[i] - buf.F0[i]; v = buf.F2[i] - buf.F1[i] - r; st.F[i] = buf.F0[i] - 2 * a * r + a * a * v; }
      project(st.Q, st.F, n, K, m);
      var llx = emStep(G, n, m, K, st, work);
      if (!(llx >= ll1)) { st.Q.set(buf.Q2); st.F.set(buf.F2); return ll1; }
      return llx;
    }
    return ll1;
  }
  /* Synchronous fit (used by the Node tests; the page runs the same cycles in time slices). */
  function fit(G, n, m, K, seeds, tolRel, maxCycles) {
    var best = null, lls = [];
    seeds.forEach(function (seed) {
      var st = emInit(n, m, K, seed), work = makeWork(n, m, K), buf = makeBuf(n, m, K), prev = -Infinity;
      for (var c = 1; c <= (maxCycles || 2000); c++) {
        var ll = squaremCycle(G, n, m, K, st, work, buf);
        st.iters = c;
        if (ll - prev < tolRel * Math.abs(ll)) break;
        prev = ll;
      }
      st.ll = logLik(G, n, m, K, st.Q, st.F);
      lls.push(st.ll);
      if (!best || st.ll > best.ll) best = st;
    });
    return { Q: best.Q, F: best.F, ll: best.ll, lls: lls };
  }
  /* Match components to sources: maximize sum_c M[c][match(c)], M[c][s] = sum_i qhat_ic q_is (brute force). */
  function matchComponents(Qhat, K, trueQ, nSrc) {
    var n = trueQ.length, M = [], c, s, i;
    for (c = 0; c < K; c++) {
      M.push([]);
      for (s = 0; s < nSrc; s++) { var v = 0; for (i = 0; i < n; i++) v += Qhat[i * K + c] * trueQ[i][s]; M[c].push(v); }
    }
    var best = null, bestV = -1;
    function rec(c2, used, assign, val) {
      if (c2 === K) { if (val > bestV + 1e-12) { bestV = val; best = assign.slice(); } return; }
      for (var s2 = 0; s2 < nSrc; s2++) if (!used[s2]) {
        used[s2] = true; assign.push(s2); rec(c2 + 1, used, assign, val + M[c2][s2]); assign.pop(); used[s2] = false;
      }
      assign.push(-1); rec(c2 + 1, used, assign, val); assign.pop();
    }
    rec(0, [], [], 0);
    return best;
  }

  /* Display rule for components (see the header comment). trueQ: one {A, B, C, D} object per person. */
  var SRC_COLOR = { A: "var(--q1)", B: "var(--q2)", C: "var(--q3)", D: "var(--q7)" };
  var EXTRA_COLORS = ["var(--q6)", "var(--q8)", "var(--q5)"];
  function describeComponents(Q, K, trueQ) {
    var O = [], c;
    for (c = 0; c < K; c++) {
      O.push({});
      SOURCES.forEach(function (src) {
        var v = 0;
        for (var i = 0; i < trueQ.length; i++) v += Q[i * K + c] * trueQ[i][src];
        O[c][src] = v;
      });
    }
    var info = [];
    for (c = 0; c < K; c++) {
      var tot = 0, top = null;
      SOURCES.forEach(function (src) { tot += O[c][src]; if (!top || O[c][src] > O[c][top]) top = src; });
      var parts = SOURCES.filter(function (src) { return tot > 0 && O[c][src] / tot >= 0.2; });
      info.push({ c: c, top: top, share: tot > 0 ? O[c][top] / tot : 0, label: parts.join(" + ") || "none", src: null, color: null });
    }
    var used = {};
    info.slice().sort(function (a, b) { return O[b.c][b.top] - O[a.c][a.top]; }).forEach(function (ci) {
      if (ci.share >= 0.6 && !used[ci.top]) { used[ci.top] = true; ci.color = SRC_COLOR[ci.top]; ci.src = ci.top; }
    });
    info.forEach(function (ci) { ci.order = ci.src ? SOURCES.indexOf(ci.src) : 4 + SOURCES.indexOf(ci.top); });
    info.sort(function (a, b) { return a.order - b.order || a.c - b.c; });
    var extra = 0;
    info.forEach(function (ci) { if (!ci.color) { ci.color = EXTRA_COLORS[extra % EXTRA_COLORS.length]; extra++; } });
    return info;
  }

  var core = { mulberry32: mulberry32, simulate: simulate, emInit: emInit, emStep: emStep, makeWork: makeWork,
    makeBuf: makeBuf, squaremCycle: squaremCycle, logLik: logLik, fit: fit, matchComponents: matchComponents,
    describeComponents: describeComponents, GROUPS: GROUPS, SOURCES: SOURCES, M_SNP: M_SNP, SEED: SEED };
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
  function fmtLL(x) { var s = Math.abs(x).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }); return (x < 0 ? "−" : "") + s; }
  function now() { return (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now(); }

  var STARTS = [101, 8020, 15939], TOL = 1e-7;

  function init(root) {
    var body = root.querySelector(".widget-body");
    if (!body) return;
    body.innerHTML = "";
    var sim = simulate(SEED, M_SNP), m = M_SNP;
    var state = { K: 3, on: { A: true, B: true, C: true, AB: true, D: true } };
    var cache = {}, job = null, jobId = 0, hoverI = -1, lastFit = null;

    var c1 = H("div", { "class": "controls" }, body);
    H("span", { "class": "ps-lab", id: root.id + "-klab" }, c1, "Components, K:");
    var kgroup = H("div", { "class": "ps-seg", role: "group", "aria-labelledby": root.id + "-klab" }, c1);
    var kbtn = {};
    [2, 3, 4].forEach(function (k) {
      kbtn[k] = H("button", { type: "button", "class": "btn", "aria-pressed": "false" }, kgroup, String(k));
      kbtn[k].addEventListener("click", function () { state.K = k; update(); });
    });
    var c2 = H("div", { "class": "controls" }, body);
    H("span", { "class": "ps-lab" }, c2, "Groups included:");
    var cb = {};
    var LABELS = { A: "A", B: "B", C: "C", AB: "A×B (admixed)", D: "D (sister of C)" };
    GROUPS.forEach(function (g) {
      var lab = H("label", {}, c2);
      cb[g.key] = H("input", { type: "checkbox" }, lab);
      cb[g.key].checked = true;
      lab.appendChild(document.createTextNode(" " + LABELS[g.key]));
      cb[g.key].addEventListener("change", function () { state.on[g.key] = cb[g.key].checked; update(); });
    });

    var plotWrap = H("div", { "class": "ps-admix-plot" }, body);
    var svg = S("svg", { role: "img" }, plotWrap);
    var hoverLine = H("div", { "class": "note ps-hover", "aria-live": "polite" }, body, "Point at (or tap) a bar to see that person's numbers.");
    var tableWrap = H("div", { "class": "ps-admix-table" }, body);
    var readout = H("div", { "class": "readout", "aria-live": "polite" }, body);
    H("p", { "class": "note" }, body,
      "Simulated data: " + M_SNP + " independent SNPs; " + GROUPS.map(function (g) { return g.n + " people in " + g.label; }).join(", ") +
      ". The fit is the maximum-likelihood fit of the STRUCTURE/ADMIXTURE model by the EM algorithm, best of " + STARTS.length + " random starts.");

    function included() {
      var idx = [];
      sim.people.forEach(function (p, i) { if (state.on[GROUPS[p.group].key]) idx.push(i); });
      return idx;
    }
    function keyOf() { return state.K + "|" + GROUPS.map(function (g) { return state.on[g.key] ? 1 : 0; }).join(""); }

    function update() {
      [2, 3, 4].forEach(function (k) {
        kbtn[k].setAttribute("aria-pressed", k === state.K ? "true" : "false");
        kbtn[k].classList.toggle("primary", k === state.K);
      });
      var idx = included();
      if (job) { job.cancelled = true; job = null; }
      var nGroups = GROUPS.filter(function (g) { return state.on[g.key]; }).length;
      if (nGroups < 1 || idx.length < 10) {
        lastFit = null; draw(idx, null);
        readout.innerHTML = "Include at least one group of people.";
        tableWrap.innerHTML = "";
        return;
      }
      var key = keyOf();
      if (cache[key]) { lastFit = cache[key]; draw(idx, cache[key]); report(idx, cache[key]); return; }
      lastFit = null;
      draw(idx, null);
      tableWrap.innerHTML = "";
      startJob(key, idx);
    }

    function startJob(key, idx) {
      var n = idx.length, K = state.K, G = new Uint8Array(n * m);
      idx.forEach(function (pi, i) { G.set(sim.people[pi].g, i * m); });
      var my = { id: ++jobId, cancelled: false };
      job = my;
      var s = 0, st = null, work = makeWork(n, m, K), buf = makeBuf(n, m, K), prev = -Infinity, cyc = 0;
      var best = null, lls = [];
      function slice() {
        if (my.cancelled) return;
        var t0 = now();
        while (now() - t0 < 30) {
          if (!st) { st = emInit(n, m, K, STARTS[s]); prev = -Infinity; cyc = 0; }
          var ll = squaremCycle(G, n, m, K, st, work, buf);
          cyc++;
          if (ll - prev < TOL * Math.abs(ll) || cyc >= 1500) {
            st.ll = logLik(G, n, m, K, st.Q, st.F);
            lls.push(st.ll);
            if (!best || st.ll > best.ll) best = { Q: st.Q.slice(), ll: st.ll };
            st = null; s++;
            if (s >= STARTS.length) {
              var res = { K: K, idx: idx, Q: best.Q, ll: best.ll, lls: lls };
              cache[key] = res;
              job = null;
              lastFit = res;
              draw(idx, res); report(idx, res);
              return;
            }
          } else prev = ll;
        }
        readout.innerHTML = "Fitting K = " + K + " to " + n + " people × " + m + " SNPs: start " + (s + 1) + " of " + STARTS.length + ", EM cycle " + cyc + " …";
        setTimeout(slice, 0);
      }
      readout.innerHTML = "Fitting K = " + K + " to " + n + " people × " + m + " SNPs …";
      setTimeout(slice, 20);
    }

    function componentInfo(idx, res) {
      return describeComponents(res.Q, res.K, idx.map(function (pi) { return sim.people[pi].q; }));
    }

    function draw(idx, res) {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var W = Math.max(300, Math.min(820, Math.round(plotWrap.clientWidth || 600)));
      var Hh = 236, ML = 4, MR = 4, top1 = 22, h1 = 16, top2 = 66, h2 = 132, labY = top2 + h2 + 18;
      svg.setAttribute("viewBox", "0 0 " + W + " " + Hh);
      svg.setAttribute("width", W);
      svg.setAttribute("height", Hh);
      var n = idx.length;
      var groupsOn = GROUPS.map(function (g, gi) { return gi; }).filter(function (gi) { return state.on[GROUPS[gi].key]; });
      var gap = 6, PW = W - ML - MR - gap * Math.max(0, groupsOn.length - 1);
      var bw = n ? PW / n : 0;
      S("text", { x: ML, y: 14, "class": "t-b" }, svg, "Truth (simulated ancestry)");
      S("text", { x: ML, y: top2 - 8, "class": "t-b" }, svg,
        res ? "Estimate with K = " + res.K + " (best of " + STARTS.length + " starts)" : "Estimate with K = " + state.K + ": fitting …");
      var info = res ? componentInfo(idx, res) : null;
      var x = ML, gPrev = -1, groupSpans = [];
      var xs = new Float64Array(n);
      idx.forEach(function (pi, i) {
        var p = sim.people[pi];
        if (p.group !== gPrev) {
          if (gPrev >= 0) x += gap;
          groupSpans.push({ g: p.group, x0: x });
          gPrev = p.group;
        }
        xs[i] = x;
        // truth strip
        var y = top1;
        SOURCES.forEach(function (s) {
          var v = p.q[s];
          if (v > 0) { S("rect", { x: x.toFixed(2), y: y.toFixed(2), width: (bw + 0.35).toFixed(2), height: (v * h1).toFixed(2), style: "fill: " + SRC_COLOR[s] }, svg); y += v * h1; }
        });
        // estimate
        if (info) {
          var y2 = top2;
          info.forEach(function (ci) {
            var v2 = res.Q[i * res.K + ci.c];
            if (v2 > 0.0005) S("rect", { x: x.toFixed(2), y: y2.toFixed(2), width: (bw + 0.35).toFixed(2), height: (v2 * h2).toFixed(2), style: "fill: " + ci.color }, svg);
            y2 += v2 * h2;
          });
        }
        x += bw;
        groupSpans[groupSpans.length - 1].x1 = x;
      });
      if (!info) S("rect", { x: ML, y: top2, width: W - ML - MR, height: h2, style: "fill: var(--bg-alt)" }, svg);
      groupSpans.forEach(function (gs) {
        S("text", { x: ((gs.x0 + gs.x1) / 2).toFixed(1), y: labY, "text-anchor": "middle", "class": "t" }, svg, GROUPS[gs.g].label);
      });
      if (hoverI >= 0 && hoverI < n) {
        S("rect", { x: xs[hoverI].toFixed(2), y: top1 - 2, width: Math.max(bw, 1.5).toFixed(2), height: (top2 + h2 - top1 + 4), style: "fill: none; stroke: var(--fg); stroke-width: 1.2" }, svg);
      }
      svg.setAttribute("aria-label", "Ancestry bar plot of " + n + " simulated people: true ancestry above, estimated proportions below" + (res ? " for K = " + res.K : "") + ".");
      svg._xs = xs; svg._bw = bw; svg._n = n; svg._idx = idx; svg._info = info; svg._res = res; svg._W = W;
    }

    function report(idx, res) {
      var info = componentInfo(idx, res);
      // table: mean estimated proportion per group and component
      var html = '<table class="compact"><thead><tr><th scope="col">Group</th><th scope="col" class="num">People</th>';
      info.forEach(function (ci, k) {
        html += '<th scope="col" class="num"><span class="ps-sw" style="background:' + ci.color + '"></span>' +
          "comp. " + (k + 1) + ' <span style="white-space:nowrap">(' + ci.label + ")</span></th>";
      });
      html += "</tr></thead><tbody>";
      GROUPS.forEach(function (g, gi) {
        if (!state.on[g.key]) return;
        var rows = [];
        idx.forEach(function (pi, i) { if (sim.people[pi].group === gi) rows.push(i); });
        html += "<tr><td>" + g.label + "</td><td class=\"num\">" + rows.length + "</td>";
        info.forEach(function (ci) {
          var s = 0;
          rows.forEach(function (i) { s += res.Q[i * res.K + ci.c]; });
          html += '<td class="num">' + Math.round(100 * s / rows.length) + "%</td>";
        });
        html += "</tr>";
      });
      html += "</tbody></table>";
      tableWrap.innerHTML = '<div class="table-wrap">' + html + "</div>";
      var lls = res.lls.map(fmtLL);
      readout.innerHTML = "K = " + res.K + " · " + idx.length + " simulated people × " + m + " SNPs<br>" +
        "Log-likelihood of the best start: " + fmtLL(res.ll) + "<br>" +
        "The " + STARTS.length + " starts ended at " + lls.slice(0, -1).join(", ") + " and " + lls[lls.length - 1] +
        "<br>A component gets a group's color when that group makes up at least 60% of it; yellow or brown marks a component that is a mix of groups or a second copy of one. Labels list the groups that make up at least 20% of each component.";
    }

    function hover(ev) {
      if (!svg._n) return;
      var r = svg.getBoundingClientRect();
      var x = (ev.clientX - r.left) * (svg._W / r.width);
      var xs = svg._xs, bw = svg._bw, found = -1;
      for (var i = 0; i < svg._n; i++) if (x >= xs[i] && x < xs[i] + bw) { found = i; break; }
      if (found === hoverI) return;
      hoverI = found;
      if (found < 0) return;
      var p = sim.people[svg._idx[found]];
      var truth = SOURCES.filter(function (s) { return p.q[s] > 0; }).map(function (s) { return s + " " + Math.round(100 * p.q[s]) + "%"; }).join(", ");
      var est = "";
      if (svg._info) {
        est = " · estimate: " + svg._info.map(function (ci, k) {
          return "comp. " + (k + 1) + " (" + ci.label + ") " + Math.round(100 * svg._res.Q[found * svg._res.K + ci.c]) + "%";
        }).join(", ");
      }
      hoverLine.textContent = "Person " + (found + 1) + " (group " + GROUPS[p.group].label + ") · truth: " + truth + est;
      draw(svg._idx, lastFit && lastFit.idx === svg._idx ? lastFit : svg._res);
    }
    svg.addEventListener("pointermove", hover);
    svg.addEventListener("pointerdown", hover);

    var rt = null;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () { draw(svg._idx || included(), svg._res || null); }, 150);
    });
    update();
  }

  function start() {
    var root = document.getElementById("w-admixture");
    if (root) init(root);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
