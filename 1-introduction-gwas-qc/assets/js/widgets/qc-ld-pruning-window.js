/* QC step 3 · The sliding-window LD pruning of plink --indep-pairwise, one decision at a time.
   Simulates genotypes for a stretch of SNPs with blocks of LD, computes r² of allele counts for every pair, and
   runs the greedy pruning that PLINK 1.9 runs (plink_ld.c, ld_prune): within each window, the first pair with
   r² above the threshold loses its SNP with the lower minor allele frequency (the later SNP on a tie), passes
   repeat until no pair in the window exceeds the threshold, and the window then moves on by the step.
   The core (simulate, pairR2, pruneEvents) has no DOM and is exported for Node tests. */
(function (root) {
  "use strict";

  /* ---------------- core ---------------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Genotypes of n people at m SNPs, SNP-major (g[j * n + i] = copies of allele 1, 0–2), from a mosaic model:
     each chromosome copy is a patchwork of K ancestral haplotypes, switching at recombination points, which are
     rare inside blocks and frequent at a few hotspots. SNPs whose allele 1 sits on the same ancestral
     haplotypes are in strong LD; a few rare SNPs arise by new mutation and are in LD with nothing. */
  function simulate(seed, m, n) {
    m = m || 48; n = n || 300;
    var rnd = mulberry32(seed), K = 10, k, j, i;
    var w = [], tot = 0;
    for (k = 0; k < K; k++) { w.push(0.35 + rnd()); tot += w[k]; }
    var cum = [], c = 0;
    for (k = 0; k < K; k++) { c += w[k] / tot; cum.push(c); }
    function pick() { var u = rnd(); for (var q = 0; q < K; q++) if (u < cum[q]) return q; return K - 1; }
    var anc = new Uint8Array(K * m), rare = [], prev = null;
    for (j = 0; j < m; j++) {
      var set;
      if (j > 0 && rnd() < 0.07) { rare.push(true); prev = null; continue; }
      rare.push(false);
      var u = rnd();
      if (prev && u < 0.42) set = prev.slice();
      else if (prev && u < 0.68) {
        set = prev.slice();
        var flip = Math.floor(rnd() * K);
        var at = set.indexOf(flip);
        if (at >= 0 && set.length > 1) set.splice(at, 1); else if (at < 0 && set.length < 5) set.push(flip);
      } else {
        var size = 1 + Math.floor(rnd() * 5), pool = [];
        for (k = 0; k < K; k++) pool.push(k);
        set = [];
        for (var s = 0; s < size; s++) set.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
      }
      set.forEach(function (q) { anc[q * m + j] = 1; });
      prev = set;
    }
    var sw = new Float64Array(m);
    for (j = 1; j < m; j++) sw[j] = 0.015;
    for (var hs = 0; hs < 3; hs++) sw[4 + Math.floor(rnd() * (m - 8))] = 0.7;
    var g = new Uint8Array(m * n);
    for (i = 0; i < 2 * n; i++) {
      var cur = pick();
      for (j = 0; j < m; j++) {
        if (j > 0 && rnd() < sw[j]) cur = pick();
        var a;
        if (rare[j]) a = rnd() < 0.03 ? 1 : 0;
        else { a = anc[cur * m + j]; if (rnd() < 0.008) a = 1 - a; }
        g[j * n + (i >> 1)] += a;
      }
    }
    var ids = [];
    for (j = 0; j < m; j++) ids.push("snp" + (j < 9 ? "0" : "") + (j + 1));
    return { m: m, n: n, g: g, ids: ids, missing: 255 };
  }

  /* Per-SNP minor allele frequency and monomorphic flag, and r² of allele counts for every pair (people with a
     call at both SNPs), as PLINK computes it for --indep-pairwise. Code 255 marks a missing call. */
  function pairR2(data) {
    var m = data.m, n = data.n, g = data.g, MISS = data.missing == null ? 255 : data.missing;
    var maf = new Float64Array(m), mono = [], j, k, i;
    for (j = 0; j < m; j++) {
      var s = 0, cnt = 0, lo = 3, hi = -1;
      for (i = 0; i < n; i++) {
        var x = g[j * n + i];
        if (x === MISS) continue;
        s += x; cnt++;
        if (x < lo) lo = x; if (x > hi) hi = x;
      }
      var p = cnt ? s / (2 * cnt) : 0;
      maf[j] = Math.min(p, 1 - p);
      mono.push(cnt < 2 || lo === hi);
    }
    var r2 = new Float64Array(m * m);
    for (j = 0; j < m; j++) {
      r2[j * m + j] = 1;
      for (k = j + 1; k < m; k++) {
        var nn = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
        for (i = 0; i < n; i++) {
          var a = g[j * n + i], b = g[k * n + i];
          if (a === MISS || b === MISS) continue;
          nn++; sx += a; sy += b; sxx += a * a; syy += b * b; sxy += a * b;
        }
        var cov = nn * sxy - sx * sy, vx = nn * sxx - sx * sx, vy = nn * syy - sy * sy;
        var v = vx > 0 && vy > 0 ? (cov * cov) / (vx * vy) : 0;
        r2[j * m + k] = r2[k * m + j] = v;
      }
    }
    return { m: m, maf: maf, mono: mono, r2: r2 };
  }

  /* The pruning, as a list of events: {type: "mono", j}, {type: "window", start, end}, {type: "prune", i, j, r2,
     drop, keep}, {type: "clear", start, end}. Windows cover SNP indices [start, end) and move by `step`.
     Equivalent to PLINK 1.9's ld_prune for --indep-pairwise with a window in variant counts and a step no larger
     than the window (the view keeps it so). */
  function pruneEvents(st, win, step, thr) {
    var m = st.m, pruned = [], events = [], j;
    for (j = 0; j < m; j++) { pruned.push(!!st.mono[j]); if (st.mono[j]) events.push({ type: "mono", j: j }); }
    var start = 0, w = 0;
    while (start < m) {
      var end = Math.min(m, start + win), any;
      w++;
      events.push({ type: "window", start: start, end: end, w: w });
      do {
        any = false;
        for (var i = start; i < end - 1; i++) {
          if (pruned[i]) continue;
          for (j = i + 1; j < end; j++) {
            if (pruned[j]) continue;
            var v = st.r2[i * m + j];
            if (v > thr) {
              var drop = st.maf[i] < (1 - 1e-12) * st.maf[j] ? i : j;
              pruned[drop] = true; any = true;
              events.push({ type: "prune", i: i, j: j, r2: v, drop: drop, keep: drop === i ? j : i, w: w });
              break;
            }
          }
        }
      } while (any);
      events.push({ type: "clear", start: start, end: end, w: w });
      if (end >= m) break;
      start += step;
    }
    return { events: events, pruned: pruned, windows: w };
  }

  /* Pairs of kept SNPs that still exceed the threshold: no window contained both. */
  function leftoverPairs(st, pruned, thr) {
    var out = [], m = st.m;
    for (var i = 0; i < m; i++) {
      if (pruned[i]) continue;
      for (var j = i + 1; j < m; j++) if (!pruned[j] && st.r2[i * m + j] > thr) out.push([i, j]);
    }
    return out;
  }

  var core = { mulberry32: mulberry32, simulate: simulate, pairR2: pairR2, pruneEvents: pruneEvents, leftoverPairs: leftoverPairs };
  if (typeof module !== "undefined" && module.exports) { module.exports = core; return; }
  if (!root.document) return;

  /* ---------------- view ---------------- */
  var SVGNS = "http://www.w3.org/2000/svg";
  var widget = document.getElementById("w-prune-window");
  if (!widget) return;
  var body = widget.querySelector(".widget-body");

  function el(tag, attrs, parent, text) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function sv(tag, attrs, parent, text) {
    var e = document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function slider(parent, label, min, max, step, value, fmt) {
    var lab = el("label", { "class": "pw-ctl" }, parent, label + " ");
    var inp = el("input", { type: "range", min: min, max: max, step: step, value: value }, lab);
    var out = el("output", { "class": "pw-val" }, lab, fmt(value));
    inp.addEventListener("input", function () { out.textContent = fmt(inp.value); });
    return inp;
  }
  function f2(x) { return Number(x).toFixed(2); }
  function name(j) { return "SNP " + (j + 1); }
  /* r² as a grey level, white for 0 and black for 1, as in the heatmaps of the LD page (Haploview's scheme). */
  function grey(v) { var g = Math.round(255 * (1 - Math.max(0, Math.min(1, v)))); return "rgb(" + g + "," + g + "," + g + ")"; }
  function diamond(cx, cy, hw, hh) {
    return "M" + cx.toFixed(1) + "," + (cy - hh).toFixed(1) + "L" + (cx + hw).toFixed(1) + "," + cy.toFixed(1) +
      "L" + cx.toFixed(1) + "," + (cy + hh).toFixed(1) + "L" + (cx - hw).toFixed(1) + "," + cy.toFixed(1) + "Z";
  }

  body.textContent = "";
  el("p", { "class": "note" }, body,
     "A simulated stretch of 48 SNPs genotyped in 300 people, with blocks of strong LD separated by recombination hotspots. " +
     "Top row: the SNPs in order, with a bar for each SNP's minor allele frequency (MAF). Below: one diamond per pair of SNPs, " +
     "below and between the two, shaded by their r². The purple box is the current window.");
  var row1 = el("div", { "class": "controls" }, body);
  var inWin = slider(row1, "Window (SNPs)", 4, 48, 1, 12, function (v) { return String(v); });
  var inStep = slider(row1, "Step (SNPs)", 1, 12, 1, 3, function (v) { return String(v); });
  var inThr = slider(row1, "r² threshold", 0.05, 0.95, 0.05, 0.3, f2);
  /* The step stays no larger than the window: with a larger step PLINK leaves some SNPs outside every window. */
  function clampStep() {
    var w = Number(inWin.value);
    if (Number(inStep.value) > w) { inStep.value = String(w); inStep.parentNode.querySelector("output").textContent = String(w); }
  }
  inWin.addEventListener("input", clampStep);
  inStep.addEventListener("input", clampStep);
  var row2 = el("div", { "class": "controls" }, body);
  var bPlay = el("button", { type: "button", "class": "btn primary" }, row2, "Play");
  var bNext = el("button", { type: "button", "class": "btn" }, row2, "Next decision");
  var bEnd = el("button", { type: "button", "class": "btn" }, row2, "Run to the end");
  var bRestart = el("button", { type: "button", "class": "btn" }, row2, "Restart");
  var bNew = el("button", { type: "button", "class": "btn" }, row2, "New simulated stretch");
  var chart = el("div", { "class": "pw-chart" }, body);
  var legend = el("p", { "class": "note pw-legend" }, body);
  var status = el("div", { "class": "readout pw-status", "aria-live": "polite" }, body);
  var lists = el("div", { "class": "readout pw-lists" }, body);

  var seed = 20261108, data, st, run, pos = 0, timer = null;

  function load() { data = simulate(seed); st = pairR2(data); }
  function compute() { run = pruneEvents(st, Number(inWin.value), Number(inStep.value), Number(inThr.value)); }
  /* State after the first k events. */
  function stateAt(k) {
    var pr = [], win = null, last = null;
    for (var j = 0; j < st.m; j++) pr.push(false);
    for (var e = 0; e < k; e++) {
      var ev = run.events[e];
      if (ev.type === "mono") pr[ev.j] = true;
      else if (ev.type === "window") win = ev;
      else if (ev.type === "prune") pr[ev.drop] = true;
      last = ev;
    }
    return { pruned: pr, win: win, cur: last && last.type === "prune" ? last : null, last: last };
  }

  function draw() {
    var S = stateAt(pos), m = st.m, thr = Number(inThr.value), done = pos >= run.events.length;
    var W = Math.max(280, Math.min(860, chart.clientWidth || 700));
    var L = 6, R = 6, dx = (W - L - R) / m;
    var xs = function (j) { return L + dx * (j + 0.5); };
    var yS = 30, yB0 = 42, yB1 = 76, yT = 96, hh = Math.max(2.2, dx * 0.36), hw = dx / 2;
    var H = yT + (m - 1) * hh + hh + 30;
    var left = done ? leftoverPairs(st, S.pruned, thr) : [];
    chart.textContent = "";
    var kept = S.pruned.filter(function (x) { return !x; }).length;
    var svg = sv("svg", { width: W, height: H, viewBox: "0 0 " + W + " " + H, role: "img",
      "aria-label": "LD pruning of " + m + " simulated SNPs with a window of " + inWin.value + " SNPs, a step of " + inStep.value +
        " and an r² threshold of " + f2(thr) + ": " + kept + " SNPs kept so far." }, chart);
    // the current window: a box around its SNPs and the outline of its pairs in the triangle
    if (S.win) {
      var x0 = L + dx * S.win.start, x1 = L + dx * S.win.end;
      sv("rect", { x: x0, y: 14, width: x1 - x0, height: yB1 - 14 + 6, rx: 4, fill: "var(--mm-soft)", stroke: "var(--mm)", "stroke-width": 1.2 }, svg);
      var lab = "window " + S.win.w + ": SNPs " + (S.win.start + 1) + "–" + S.win.end;
      var right = x0 + 150 > W;
      sv("text", { x: right ? Math.min(x1, W - 2) : Math.max(x0, 2), y: 10, "class": "t-xs", "text-anchor": right ? "end" : "start",
                   style: "fill: var(--mm); font-weight: 600" }, svg, lab);
    }
    // MAF bars and SNP dots
    for (var j = 0; j < m; j++) {
      var bh = (yB1 - yB0) * st.maf[j] / 0.5, x = xs(j), gone = S.pruned[j];
      var isCur = S.cur && (S.cur.i === j || S.cur.j === j);
      sv("rect", { x: x - dx * 0.32, y: yB1 - bh, width: dx * 0.64, height: Math.max(0.5, bh),
                   fill: gone ? "var(--g0)" : "var(--g1)", stroke: gone ? "var(--fg-faint)" : "var(--g2)", "stroke-width": 0.6 }, svg);
      var r = Math.max(2, Math.min(5.5, dx * 0.34));
      var dot = sv("circle", { cx: x, cy: yS, r: r, fill: gone ? "var(--bg)" : "var(--g2)",
                               stroke: isCur ? "var(--accent)" : (gone ? "var(--fg-faint)" : "var(--g2)"), "stroke-width": isCur ? 2.2 : 1 }, svg);
      sv("title", null, dot, name(j) + " · MAF " + f2(st.maf[j]) + (gone ? " · removed" : " · kept") + (st.mono[j] ? " (monomorphic)" : ""));
      if (gone) {
        var d = Math.max(2, Math.min(4.5, dx * 0.3));
        sv("path", { d: "M" + (x - d) + "," + (yS - d) + "L" + (x + d) + "," + (yS + d) + "M" + (x + d) + "," + (yS - d) + "L" + (x - d) + "," + (yS + d),
                     stroke: "var(--pitfall)", "stroke-width": 1.5 }, svg);
      }
    }
    sv("line", { x1: L, x2: W - R, y1: yB1, y2: yB1, stroke: "var(--fg-faint)" }, svg);
    var every = dx < 9 ? 12 : dx < 14 ? 6 : 4;
    for (j = 0; j < m; j++) if ((j + 1) % every === 0 || j === 0)
      sv("text", { x: xs(j), y: yB1 + 12, "class": "t-xs", "text-anchor": "middle" }, svg, String(j + 1));
    // the triangle of r²: pair (i, k) sits below the midpoint of SNPs i and k, lower for pairs further apart
    var inWin2 = function (i, k) { return S.win && i >= S.win.start && k < S.win.end; };
    var cells = sv("g", null, svg), marks = sv("g", null, svg);
    for (var i = 0; i < m; i++) {
      for (var k = i + 1; k < m; k++) {
        var v = st.r2[i * m + k], cx = (xs(i) + xs(k)) / 2, cy = yT + (k - i) * hh;
        var faded = S.pruned[i] || S.pruned[k];
        var cell = sv("path", { d: diamond(cx, cy, hw, hh), fill: grey(v), "fill-opacity": faded ? 0.25 : 1 }, cells);
        sv("title", null, cell, name(i) + " and " + name(k) + ": r² = " + v.toFixed(3) + (faded ? " (one of the two is removed)" : ""));
        if (!faded && v > thr && inWin2(i, k))
          sv("path", { d: diamond(cx, cy, hw - 0.6, hh - 0.6), fill: "none", stroke: "var(--pitfall)", "stroke-width": 1.4 }, marks);
      }
    }
    left.forEach(function (p) {
      var cx = (xs(p[0]) + xs(p[1])) / 2, cy = yT + (p[1] - p[0]) * hh;
      sv("path", { d: diamond(cx, cy, hw + 1, hh + 1), fill: "none", stroke: "var(--q2)", "stroke-width": 1.6, "stroke-dasharray": "2 1.5" }, marks);
    });
    if (S.win) {
      var a = S.win.start, b = S.win.end - 1;
      var pts = [[xs(a) - hw, yT], [xs(b) + hw, yT], [(xs(a) + xs(b)) / 2, yT + (b - a) * hh + hh]];
      if (b > a) sv("polygon", { points: pts.map(function (q) { return q[0].toFixed(1) + "," + q[1].toFixed(1); }).join(" "),
                                fill: "none", stroke: "var(--mm)", "stroke-width": 1.4 }, marks);
    }
    if (S.cur) {
      var ci = S.cur.i, ck = S.cur.j, ccx = (xs(ci) + xs(ck)) / 2, ccy = yT + (ck - ci) * hh;
      sv("path", { d: diamond(ccx, ccy, hw + 1.5, hh + 1.5), fill: "none", stroke: "var(--accent)", "stroke-width": 2.2 }, marks);
      sv("line", { x1: xs(ci), y1: yS + 7, x2: ccx, y2: ccy - hh, stroke: "var(--accent)", "stroke-width": 0.9, "stroke-dasharray": "3 2" }, marks);
      sv("line", { x1: xs(ck), y1: yS + 7, x2: ccx, y2: ccy - hh, stroke: "var(--accent)", "stroke-width": 0.9, "stroke-dasharray": "3 2" }, marks);
    }
    // scale: grey levels from r² = 0 to 1, with the threshold marked
    var ly = H - 12, gx = L + 2;
    sv("text", { x: gx, y: ly, "class": "t-xs" }, svg, "r² 0");
    for (var q = 0; q < 10; q++)
      sv("rect", { x: gx + 30 + q * 9, y: ly - 9, width: 9, height: 10, fill: grey((q + 0.5) / 10), stroke: "var(--fg-faint)", "stroke-width": 0.3 }, svg);
    sv("text", { x: gx + 125, y: ly, "class": "t-xs" }, svg, "1");
    var tx = gx + 30 + 90 * thr;
    sv("path", { d: "M" + tx + "," + (ly + 6) + "l-4,6h8z", fill: "var(--pitfall)" }, svg);
    sv("text", { x: gx + 138, y: ly, "class": "t-xs" }, svg, "▲ threshold " + f2(thr));
    legend.textContent = "Red outline: a pair in the window with r² above the threshold. Blue: the pair being decided. " +
      "✕: a removed SNP (its pairs fade)." + (done ? " Orange dashes: kept SNPs that are still correlated, because no window contained both." : "");
    describe(S, left);
  }

  function describe(S, left) {
    var ev = S.last, m = st.m, thr = f2(inThr.value), txt;
    var kept = S.pruned.filter(function (x) { return !x; }).length;
    var done = pos >= run.events.length;
    if (!ev) txt = "Press Play, or Next decision, to start the first window at SNP 1.";
    else if (ev.type === "mono") txt = name(ev.j) + " is monomorphic (everyone has the same genotype): PLINK removes it before any pair is checked.";
    else if (ev.type === "window") txt = "Window " + ev.w + " covers SNPs " + (ev.start + 1) + "–" + ev.end +
      (ev.w > 1 ? ": it moved " + inStep.value + " SNP" + (Number(inStep.value) === 1 ? "" : "s") + ". Only pairs with the new SNPs can still exceed the threshold."
                : ". Its pairs are checked in order: SNP 1 with each later SNP, then SNP 2, and so on.");
    else if (ev.type === "prune") {
      var tie = Math.abs(st.maf[ev.i] - st.maf[ev.j]) <= 1e-12 * st.maf[ev.j];
      txt = name(ev.i) + " and " + name(ev.j) + ": r² = " + ev.r2.toFixed(2) + " > " + thr + ". " + name(ev.drop) + " is removed: " +
        (tie ? "the two minor allele frequencies are equal, so the later SNP goes."
             : "its minor allele frequency is lower (" + f2(st.maf[ev.drop]) + " against " + f2(st.maf[ev.keep]) + ").");
    } else txt = "No pair of remaining SNPs in window " + ev.w + " has r² above " + thr + "." + (ev.end >= m ? " The window has reached the last SNP: pruning is finished." : "");
    status.textContent = txt + "\nKept so far: " + kept + " of " + m + " SNPs" + (done ? " (final)." : ".");
    lists.textContent = "";
    lists.hidden = !done;
    if (done) {
      var keep = [], out = [];
      for (var j = 0; j < m; j++) (S.pruned[j] ? out : keep).push(data.ids[j]);
      lists.textContent = ".prune.in  (" + keep.length + "): " + keep.join(" ") + "\n.prune.out (" + out.length + "): " + out.join(" ") + "\n" +
        (left.length ? left.length + " pair" + (left.length === 1 ? "" : "s") + " of kept SNPs still " + (left.length === 1 ? "has" : "have") + " r² > " + thr +
          ": no window contained both, so they were never compared (SNPs " + left.slice(0, 4).map(function (p) { return (p[0] + 1) + "–" + (p[1] + 1); }).join(", ") + (left.length > 4 ? ", …" : "") + ")."
          : "No pair of kept SNPs has r² > " + thr + ", at any distance.");
    }
    bPlay.textContent = timer ? "Pause" : "Play";
    bNext.disabled = bEnd.disabled = done;
  }

  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  function next() {
    if (pos < run.events.length) pos++;
    if (pos >= run.events.length) stop();
    draw();
  }
  bPlay.addEventListener("click", function () {
    if (timer) { stop(); draw(); return; }
    if (pos >= run.events.length) pos = 0;
    timer = setInterval(next, 800);
    next();
  });
  bNext.addEventListener("click", function () { stop(); next(); });
  bEnd.addEventListener("click", function () { stop(); pos = run.events.length; draw(); });
  bRestart.addEventListener("click", function () { stop(); pos = 0; draw(); });
  bNew.addEventListener("click", function () { stop(); seed += 1; load(); compute(); pos = 0; draw(); });
  [inWin, inStep, inThr].forEach(function (inp) {
    inp.addEventListener("change", function () { stop(); compute(); pos = run.events.length; draw(); });
  });
  var rt = null, lastW = 0;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () { var w = chart.clientWidth; if (w !== lastW) { lastW = w; draw(); } }, 150);
  });

  load(); compute(); draw();
  lastW = chart.clientWidth;
})(typeof window !== "undefined" ? window : this);
