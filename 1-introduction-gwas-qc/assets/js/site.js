/* ==========================================================================
   Lecture 1 site script (works from file:// and from a server)
   Adapted from Lecture 0's site.js. Differences:
   - The glossary merges Lecture 0's entries (window.GLOSSARY_L0, saved by this lecture's glossary-data.js)
     with this lecture's entries (window.GLOSSARY_ENTRIES); an entry here overrides a Lecture 0 entry with
     the same id. The glossary page lists the terms used in this lecture, with a switch to show all.
   - Slide callouts link to this lecture's slide guide (SITE.slideGuide).
   - Tab sets (.tabset), copy buttons on code blocks (pre.code) and step navigation for the practical.
   Also: sidebar, per-page table of contents, pager, KaTeX math (assets/js/math.js of Lecture 0),
   glossary auto-linking with tooltips, glossary page, lightbox.
   ========================================================================== */
(function () {
  "use strict";

  var SITE = window.SITE || { parts: [], pages: {} };
  var USAGE = window.GLOSSARY_USAGE || {};
  var PAGE = (document.body && document.body.getAttribute("data-page")) || "";
  var L0_BASE = SITE.glossaryBase || "../0-biological-foundations/glossary.html";

  /* ---------------- Glossary: merge Lecture 0 and Lecture 1 ---------------- */
  var L0 = window.GLOSSARY_L0 || [];
  var L1 = window.GLOSSARY_ENTRIES || [];
  if (L0 === L1) L0 = []; // glossary-data.js of Lecture 1 not loaded: nothing to merge
  var GL = {}, ORDER = [];
  L0.forEach(function (e) {
    if (!e || !e.id) return;
    var c = {}; for (var k in e) c[k] = e[k];
    c._from = 0;
    if (!GL[c.id]) ORDER.push(c.id);
    GL[c.id] = c;
  });
  L1.forEach(function (e) {
    if (!e || !e.id) return;
    var c = {}; for (var k in e) c[k] = e[k];
    c._from = 1;
    c._overrides = !!GL[c.id];
    if (!GL[c.id]) ORDER.push(c.id);
    GL[c.id] = c;
  });
  var ENTRIES = ORDER.map(function (id) { return GL[id]; });

  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (html != null) n.innerHTML = html;
    return n;
  }
  function slugify(s) {
    return String(s).toLowerCase().replace(/<[^>]+>/g, "").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  }
  function stripTags(s) { return String(s || "").replace(/<[^>]+>/g, ""); }
  function store(key, val) {
    try { if (val === undefined) return localStorage.getItem(key); localStorage.setItem(key, val); } catch (e) {}
    return null;
  }

  /* ---------------- Navigation ---------------- */
  function orderedPages() {
    var out = [];
    (SITE.parts || []).forEach(function (p) { (p.pages || []).forEach(function (k) { if (SITE.pages[k]) out.push(k); }); });
    return out;
  }

  function ensureHeadingIds(article) {
    var used = {};
    article.querySelectorAll("h2, h3").forEach(function (h) {
      if (!h.id) {
        var base = slugify(h.textContent) || "section";
        var id = base, i = 2;
        while (document.getElementById(id) || used[id]) { id = base + "-" + i++; }
        h.id = id;
      }
      used[h.id] = true;
    });
  }

  function buildSidebar() {
    var side = document.getElementById("sidebar");
    if (!side) return;
    side.innerHTML = "";
    side.appendChild(el("a", { "class": "navlink", href: "../index.html" }, "← All lectures"));
    (SITE.parts || []).forEach(function (part) {
      var wrap = el("div", { "class": "part" });
      wrap.appendChild(el("div", { "class": "part-title" }, part.title));
      var ol = el("ol");
      (part.pages || []).forEach(function (key) {
        var pg = SITE.pages[key];
        if (!pg) return;
        var li = el("li");
        var a = el("a", { "class": "navlink", href: pg.file });
        a.innerHTML = '<span class="num">' + (pg.num != null ? pg.num : "") + '</span><span>' + pg.nav + "</span>";
        if (key === PAGE) a.setAttribute("aria-current", "page");
        li.appendChild(a);
        if (key === PAGE) {
          var article = document.querySelector("main article");
          if (article) {
            var hs = article.querySelectorAll("h2[id]");
            if (hs.length) {
              var toc = el("div", { "class": "toc", "aria-label": "On this page" });
              hs.forEach(function (h) {
                if (h.closest(".no-toc")) return;
                var t = el("a", { href: "#" + h.id });
                t.textContent = h.getAttribute("data-toc") || h.textContent.replace(/\s*(Core|Optional)\s*$/i, "");
                toc.appendChild(t);
              });
              li.appendChild(toc);
            }
          }
        }
        ol.appendChild(li);
      });
      wrap.appendChild(ol);
      side.appendChild(wrap);
    });
    var other = el("div", { "class": "part" });
    other.appendChild(el("div", { "class": "part-title" }, "Background"));
    other.appendChild(el("a", { "class": "navlink", href: "../0-biological-foundations/index.html" }, '<span class="num">0</span><span>Lecture 0 · Biological foundations</span>'));
    side.appendChild(other);
    var cur = side.querySelector('[aria-current="page"]');
    // Center the current page's link inside the sidebar without scrolling the page itself.
    if (cur) {
      try {
        var cr = cur.getBoundingClientRect(), sr = side.getBoundingClientRect();
        side.scrollTop += (cr.top - sr.top) - side.clientHeight / 2 + cr.height / 2;
      } catch (e) {}
    }
  }

  function scrollSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll(".sidebar .toc a"));
    if (!links.length || !("IntersectionObserver" in window)) return;
    var map = {};
    links.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var obs = new IntersectionObserver(function () {
      var hs = document.querySelectorAll("main article h2[id]");
      var active = null;
      for (var i = 0; i < hs.length; i++) {
        var r = hs[i].getBoundingClientRect();
        if (r.top < window.innerHeight * 0.35) active = hs[i].id;
      }
      links.forEach(function (a) { a.classList.remove("active"); });
      if (active && map[active]) map[active].classList.add("active");
    }, { rootMargin: "0px 0px -60% 0px" });
    document.querySelectorAll("main article h2[id]").forEach(function (h) { obs.observe(h); });
  }

  function buildPager() {
    var article = document.querySelector("main article");
    if (!article || article.querySelector(".pager") || PAGE === "") return;
    var order = orderedPages();
    var i = order.indexOf(PAGE);
    if (i < 0) return;
    var nav = el("nav", { "class": "pager", "aria-label": "Previous and next page" });
    if (i > 0) {
      var p = SITE.pages[order[i - 1]];
      nav.appendChild(el("a", { "class": "prev", href: p.file }, '<span class="dir">← Previous</span><span class="ttl">' + p.title + "</span>"));
    }
    if (i < order.length - 1) {
      var n = SITE.pages[order[i + 1]];
      nav.appendChild(el("a", { "class": "next", href: n.file }, '<span class="dir">Next →</span><span class="ttl">' + n.title + "</span>"));
    }
    article.appendChild(nav);
  }

  function buildFooter() {
    var main = document.querySelector("main");
    if (!main || main.querySelector(".site-footer")) return;
    main.appendChild(el("footer", { "class": "site-footer" },
      '<a href="../index.html">All lectures</a> · Lecture 1 · ' + (SITE.title || "") +
      ' · <a href="glossary.html">Glossary</a> · <a href="slide-guide.html">Slide guide</a> · <a href="resources.html">Learn more</a>' +
      ' · <a href="../0-biological-foundations/index.html">Lecture 0</a>' +
      '<br>Terms with a dotted underline show a definition on hover (tap on touch screens); click to open the glossary entry.'));
  }

  function mobileNav() {
    var btn = document.querySelector(".menu-btn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var open = document.body.classList.toggle("nav-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function (e) {
      if (!document.body.classList.contains("nav-open")) return;
      if (e.target.closest(".sidebar") && !e.target.closest("a")) return;
      if (e.target.closest(".menu-btn")) return;
      document.body.classList.remove("nav-open");
      btn.setAttribute("aria-expanded", "false");
    });
  }

  /* ---------------- Practical: step navigation ----------------
     <nav class="step-nav" data-step="3"></nav> anywhere in a practical page draws the eight QC steps
     with the current one highlighted. */
  var STEPS = [
    ["qc-missingness", "Missingness"], ["qc-hwe", "Hardy–Weinberg"], ["qc-ld-pruning", "LD pruning"],
    ["qc-relatedness", "Relatedness"], ["qc-heterozygosity", "Heterozygosity"], ["qc-pca", "PCA"],
    ["qc-reference-pca", "Reference PCA"], ["qc-grafanc", "GrafAnc"], ["qc-exercise", "Exercise"]
  ];
  function buildStepNav() {
    document.querySelectorAll("nav.step-nav").forEach(function (nav) {
      if (nav.childElementCount) return;
      nav.setAttribute("aria-label", "Quality-control steps");
      var cur = +(nav.getAttribute("data-step") || 0);
      var ol = el("ol");
      STEPS.forEach(function (s, i) {
        var pg = SITE.pages[s[0]];
        if (!pg) return;
        var li = el("li", { "class": (i + 1 === cur ? "current" : (i + 1 < cur ? "done" : "")) });
        var a = el("a", { href: pg.file }, '<span class="sn">' + (i < 8 ? i + 1 : "✓") + '</span><span class="sl">' + s[1] + "</span>");
        if (i + 1 === cur) a.setAttribute("aria-current", "step");
        li.appendChild(a);
        ol.appendChild(li);
      });
      nav.appendChild(ol);
    });
  }

  /* ---------------- Tab sets ----------------
     <div class="tabset" data-group="os">
       <section class="tab-panel" data-label="macOS"> … </section>
       <section class="tab-panel" data-label="Linux"> … </section>
     </div>
     Tab sets with the same data-group switch together, and the choice is remembered on this device. */
  function buildTabs() {
    var sets = document.querySelectorAll(".tabset");
    var n = 0;
    function select(group, label) {
      document.querySelectorAll('.tabset[data-group="' + group + '"]').forEach(function (s) { show(s, label); });
      if (group) store("tabs-" + group, label);
    }
    function show(set, label) {
      var panels = set.querySelectorAll(":scope > .tab-panel");
      var found = false;
      panels.forEach(function (p) { if (p.getAttribute("data-label") === label) found = true; });
      if (!found && panels.length) label = panels[0].getAttribute("data-label");
      panels.forEach(function (p) { p.hidden = p.getAttribute("data-label") !== label; });
      set.querySelectorAll(":scope > .tab-list > button").forEach(function (b) {
        var on = b.getAttribute("data-label") === label;
        b.setAttribute("aria-selected", on ? "true" : "false");
        b.tabIndex = on ? 0 : -1;
      });
    }
    sets.forEach(function (set) {
      var panels = set.querySelectorAll(":scope > .tab-panel");
      if (!panels.length || set.querySelector(":scope > .tab-list")) return;
      var list = el("div", { "class": "tab-list", role: "tablist" });
      var group = set.getAttribute("data-group") || "";
      panels.forEach(function (p) {
        var label = p.getAttribute("data-label") || "Tab";
        var id = "tab-" + (++n);
        p.id = p.id || id + "-panel";
        p.setAttribute("role", "tabpanel");
        var b = el("button", { type: "button", role: "tab", "data-label": label, "aria-controls": p.id, id: id });
        b.textContent = label;
        p.setAttribute("aria-labelledby", id);
        b.addEventListener("click", function () { if (group) select(group, label); else show(set, label); });
        b.addEventListener("keydown", function (e) {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          var bs = Array.prototype.slice.call(list.children);
          var i = bs.indexOf(b) + (e.key === "ArrowRight" ? 1 : -1);
          var t = bs[(i + bs.length) % bs.length];
          t.click(); t.focus();
        });
        list.appendChild(b);
      });
      set.insertBefore(list, set.firstChild);
      var saved = group ? store("tabs-" + group) : null;
      show(set, saved || set.getAttribute("data-default") || panels[0].getAttribute("data-label"));
    });
  }

  /* ---------------- Copy buttons on code blocks ----------------
     <pre class="code"> gets a Copy button. Lines in <span class="cm"> (comments) are copied too;
     a <span class="prompt">$ </span> at the start of a line is left out. */
  function buildCopyButtons(root) {
    (root || document).querySelectorAll("pre.code").forEach(function (pre) {
      if (pre.parentNode && pre.parentNode.classList && pre.parentNode.classList.contains("code-wrap")) return;
      var wrap = el("div", { "class": "code-wrap" });
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(pre);
      var b = el("button", { type: "button", "class": "copy-btn", "aria-label": "Copy code" }, "Copy");
      b.addEventListener("click", function () {
        var clone = pre.cloneNode(true);
        clone.querySelectorAll(".prompt, .no-copy").forEach(function (x) { x.remove(); });
        var text = clone.textContent.replace(/\n$/, "");
        var done = function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy"; }, 1400); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () { fallback(text); done(); });
        } else { fallback(text); done(); }
      });
      wrap.appendChild(b);
    });
    function fallback(text) {
      var ta = el("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      ta.remove();
    }
  }

  /* ---------------- Glossary auto-linking ---------------- */
  function pluralForms(s) {
    var out = [s];
    if (/[a-z]$/i.test(s)) {
      if (/[^aeiou]y$/i.test(s)) out.push(s.slice(0, -1) + "ies");
      else if (/(s|x|z|ch|sh)$/i.test(s)) out.push(s + "es");
      else out.push(s + "s");
    }
    return out;
  }

  var MATCHER = null;
  function buildMatcher() {
    var map = {};
    var keys = [];
    // Lecture 1 entries first, so a Lecture 1 term wins when both lectures match the same words.
    var ordered = ENTRIES.filter(function (e) { return e._from === 1; }).concat(ENTRIES.filter(function (e) { return e._from !== 1; }));
    ordered.forEach(function (e) {
      if (!e || e.auto === false) return;
      var pats = (e.match && e.match.length) ? e.match.slice() : [stripTags(e.term)];
      var all = [];
      pats.forEach(function (p) {
        if (!p) return;
        (e.noPlural ? [p] : pluralForms(p)).forEach(function (q) { all.push(q); });
      });
      all.forEach(function (p) {
        var variants = [p];
        if (!e.cs) {
          variants.push(p.charAt(0).toUpperCase() + p.slice(1));
          variants.push(p.charAt(0).toLowerCase() + p.slice(1));
        }
        variants.forEach(function (v) {
          if (!Object.prototype.hasOwnProperty.call(map, v)) { map[v] = e.id; keys.push(v); }
        });
      });
    });
    if (!keys.length) return null;
    keys.sort(function (a, b) { return b.length - a.length; });
    var esc = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); };
    var re;
    try {
      re = new RegExp("(?<![\\p{L}\\p{N}_\\-])(" + keys.map(esc).join("|") + ")(?![\\p{L}\\p{N}_]|-[\\p{L}\\p{N}])", "gu");
    } catch (err) {
      re = new RegExp("\\b(" + keys.map(esc).join("|") + ")\\b", "g");
    }
    return { re: re, map: map };
  }

  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, CODE: 1, PRE: 1, KBD: 1, SAMP: 1, A: 1, BUTTON: 1, INPUT: 1, TEXTAREA: 1, SELECT: 1, OPTION: 1, LABEL: 1, SVG: 1, svg: 1, MATH: 1, math: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1, SUMMARY: 1, NAV: 1, TH: 1, DFN: 1, Q: 1 };
  var SKIP_CLASSES = ["katex", "no-autolink", "widget", "readout", "callout-title", "fig-title", "sources", "file-label",
    "chips", "learn-more", "fig-credit", "lab", "terminal", "tab-list", "code-wrap", "step-nav", "eq-display",
    "code-label", "output-label", "eyebrow"];
  var BLOCK_SEL = "p, li, td, dd, dt, figcaption, blockquote, caption, .a, .gloss-def, div";

  function shouldSkip(node, root) {
    for (var n = node.parentNode; n && n !== root; n = n.parentNode) {
      if (n.nodeType !== 1) continue;
      if (SKIP_TAGS[n.tagName]) return true;
      if (n.classList) {
        for (var i = 0; i < SKIP_CLASSES.length; i++) if (n.classList.contains(SKIP_CLASSES[i])) return true;
      }
      if (n.hasAttribute && n.hasAttribute("data-no-autolink")) return true;
    }
    return false;
  }

  // Which occurrences get a glossary link. "section" (default): the first occurrence of a term in each
  // h2 section of running text (callout boxes count as part of their section), plus the first occurrence
  // in each self-contained element (figure caption, table, quiz question, mental-model box, tab panel).
  // "block": the first occurrence in every paragraph. Change with window.SITE.autolinkScope in pages.js.
  var SELF_CONTAINED = "figcaption, table, details, .mental-model, dl, .tab-panel";
  function autolink(root, opts) {
    if (!MATCHER || !root) return;
    opts = opts || {};
    var mode = opts.scope || (window.SITE && window.SITE.autolinkScope) || "section";
    var seen = new WeakMap();
    var once = {}, pageSeen = {};
    ((window.SITE && window.SITE.linkOncePerPage) || []).forEach(function (k) { once[k] = 1; });
    if (mode !== "section") once = {};
    var blockOf0 = function (node) {
      var b = node.parentNode && node.parentNode.closest ? node.parentNode.closest(BLOCK_SEL) : null;
      return b || node.parentNode;
    };
    var sectionOf = new Map();
    if (mode === "section") {
      var cur = {};
      Array.prototype.forEach.call(root.children, function (c) {
        if (c.tagName === "H2" || (c.querySelector && c.querySelector(":scope > h2"))) cur = {};
        sectionOf.set(c, cur);
      });
    }
    var blockOf = function (node) {
      if (mode !== "section") return blockOf0(node);
      var e = node.nodeType === 1 ? node : node.parentNode;
      var sc = e && e.closest ? e.closest(SELF_CONTAINED) : null;
      if (sc && root.contains(sc)) return sc;
      var top = e;
      while (top && top.parentNode && top.parentNode !== root) top = top.parentNode;
      return (top && sectionOf.get(top)) || blockOf0(node);
    };
    root.querySelectorAll("a.term").forEach(function (a) {
      var id = idFromHref(a.getAttribute("href"));
      if (once[id]) pageSeen[id] = 1;
      var b = blockOf(a.firstChild || a);
      if (!b) return;
      var s = seen.get(b) || new Set(); s.add(id); seen.set(b, s);
    });
    root.querySelectorAll("dfn").forEach(function (d) {
      var t = (d.textContent || "").trim();
      var id = d.getAttribute("data-term") || (d.id && GL[d.id] ? d.id : null) || MATCHER.map[t] || MATCHER.map[t.toLowerCase()];
      if (!id) return;
      var b = blockOf(d.firstChild || d);
      if (!b) return;
      var s = seen.get(b) || new Set(); s.add(id); seen.set(b, s);
    });
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !/\S/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        return shouldSkip(n, root) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (tn) {
      var text = tn.nodeValue;
      var re = MATCHER.re; re.lastIndex = 0;
      var m, last = 0, frag = null;
      var block = blockOf(tn);
      var s = seen.get(block) || new Set();
      while ((m = re.exec(text))) {
        var id = MATCHER.map[m[1]];
        if (!id || s.has(id) || id === opts.excludeId) continue;
        if (opts.excludeIn && opts.excludeIn(tn, id)) continue;
        if (once[id] && pageSeen[id]) continue;
        if (once[id]) pageSeen[id] = 1;
        s.add(id);
        if (!frag) frag = document.createDocumentFragment();
        frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        var a = document.createElement("a");
        a.className = "term";
        a.href = "glossary.html#" + id;
        a.textContent = m[1];
        frag.appendChild(a);
        last = m.index + m[1].length;
      }
      seen.set(block, s);
      if (frag) {
        frag.appendChild(document.createTextNode(text.slice(last)));
        tn.parentNode.replaceChild(frag, tn);
      }
    });
  }

  function idFromHref(h) {
    if (!h) return "";
    var i = h.indexOf("#");
    return i >= 0 ? decodeURIComponent(h.slice(i + 1)) : "";
  }

  /* ---------------- Tooltips ---------------- */
  var tip = null, tipFor = null, lastPointer = "mouse", hideTimer = null;
  function ensureTip() {
    if (tip) return tip;
    tip = el("div", { id: "term-tip", role: "tooltip" });
    document.body.appendChild(tip);
    tip.addEventListener("mouseenter", function () { clearTimeout(hideTimer); });
    tip.addEventListener("mouseleave", function () { scheduleHide(); });
    return tip;
  }
  function showTip(a) {
    var id = idFromHref(a.getAttribute("href"));
    var e = GL[id];
    ensureTip();
    clearTimeout(hideTimer);
    if (!e) {
      a.classList.add("missing");
      tip.innerHTML = '<span class="tt-term">' + (a.textContent || id) + "</span>Glossary entry not found (" + id + ").";
    } else {
      var touch = lastPointer === "touch";
      tip.innerHTML = '<span class="tt-term">' + e.term + "</span>" + e.short +
        (e.l1 ? '<br><span class="tt-l1">On the Lecture 1 slides: ' + e.l1 + "</span>" : "") +
        (touch ? '<span class="tt-hint"><a href="' + a.getAttribute("href") + '">Open glossary entry →</a></span>'
               : '<span class="tt-hint">Click for the glossary entry</span>');
      renderMath(tip);
    }
    tipFor = a;
    tip.classList.add("show");
    a.setAttribute("aria-describedby", "term-tip");
    positionTip(a);
  }
  function positionTip(a) {
    var r = a.getBoundingClientRect();
    var tw = tip.offsetWidth, th = tip.offsetHeight;
    var sx = window.scrollX || window.pageXOffset, sy = window.scrollY || window.pageYOffset;
    var left = r.left + sx + Math.min(r.width / 2, 40) - 20;
    left = Math.max(sx + 8, Math.min(left, sx + document.documentElement.clientWidth - tw - 8));
    var top = r.bottom + sy + 8;
    if (r.bottom + th + 16 > window.innerHeight && r.top - th - 8 > 56) top = r.top + sy - th - 8;
    tip.style.left = left + "px";
    tip.style.top = top + "px";
  }
  function hideTip() {
    if (!tip) return;
    tip.classList.remove("show");
    if (tipFor) tipFor.removeAttribute("aria-describedby");
    tipFor = null;
  }
  function scheduleHide() { clearTimeout(hideTimer); hideTimer = setTimeout(hideTip, 120); }

  function wireTooltips() {
    document.addEventListener("pointerdown", function (e) { lastPointer = e.pointerType || "mouse"; }, true);
    document.addEventListener("mouseover", function (e) {
      var a = e.target.closest && e.target.closest("a.term");
      if (a && lastPointer !== "touch") showTip(a);
    });
    document.addEventListener("mouseout", function (e) {
      var a = e.target.closest && e.target.closest("a.term");
      if (a && (!e.relatedTarget || !tip || !tip.contains(e.relatedTarget))) scheduleHide();
    });
    document.addEventListener("focusin", function (e) {
      var a = e.target.closest && e.target.closest("a.term");
      if (a) showTip(a);
    });
    document.addEventListener("focusout", function (e) {
      var a = e.target.closest && e.target.closest("a.term");
      if (a) scheduleHide();
    });
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a.term");
      if (!a) { if (tip && !tip.contains(e.target)) hideTip(); return; }
      if (lastPointer === "touch" && tipFor !== a) { e.preventDefault(); showTip(a); }
      try { sessionStorage.setItem("gloss-return", location.href); } catch (err) {}
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") { hideTip(); closeLightbox(); } });
    window.addEventListener("scroll", function () { if (tipFor) positionTip(tipFor); }, { passive: true });
    window.addEventListener("resize", function () { if (tipFor) positionTip(tipFor); });
  }

  /* ---------------- Glossary page ---------------- */
  function sortKey(e) { return stripTags(e.term).replace(/^[^\p{L}\p{N}]+/u, "").toLowerCase(); }
  function inLecture(e) { return e._from === 1 || !!(USAGE[e.id] && USAGE[e.id].length); }
  function renderGlossary() {
    var host = document.getElementById("glossary-list");
    if (!host) return;
    var entries = ENTRIES.slice().sort(function (a, b) { return sortKey(a).localeCompare(sortKey(b), "en", { sensitivity: "base" }); });
    var groups = {};
    entries.forEach(function (e) {
      var c = sortKey(e).charAt(0).toUpperCase();
      if (!/[A-Z]/.test(c)) c = "#";
      (groups[c] = groups[c] || []).push(e);
    });
    var letters = Object.keys(groups).sort(function (a, b) { return a === "#" ? -1 : b === "#" ? 1 : a.localeCompare(b); });
    var letterNav = document.getElementById("gloss-letters");
    var html = "";
    letters.forEach(function (L) {
      html += '<section class="gloss-group" data-letter="' + L + '"><h2 class="gloss-letter" id="letter-' + (L === "#" ? "num" : L) + '">' + L + "</h2>";
      groups[L].forEach(function (e) {
        var aka = (e.aka && e.aka.length) ? ' <span class="aka">(also: ' + e.aka.join("; ") + ")</span>" : "";
        var meta = [];
        if (e.l1) meta.push('<span class="l1badge">Lecture 1 slides: ' + e.l1 + "</span>");
        if (e.see && e.see.length) {
          var see = e.see.filter(function (s) { return GL[s]; });
          if (see.length) meta.push("See also: " + see.map(function (s) { return '<a href="#' + s + '">' + stripTags(GL[s].term) + "</a>"; }).join(", "));
        }
        if (USAGE[e.id] && USAGE[e.id].length) {
          meta.push("Used on: " + USAGE[e.id].filter(function (k) { return SITE.pages[k]; }).map(function (k) { return '<a href="' + SITE.pages[k].file + '">' + SITE.pages[k].nav + "</a>"; }).join(", "));
        }
        if (e._from === 0 || e._overrides) {
          meta.push('Lecture 0: <a href="' + L0_BASE + "#" + e.id + '">' + (e._overrides ? "the Lecture 0 entry" : "this entry in the Lecture 0 glossary") + "</a>");
        }
        if (e.links && e.links.length) {
          meta.push("Learn more: " + e.links.map(function (l) { return '<a href="' + l.u + '" target="_blank" rel="noopener">' + l.t + "</a>"; }).join(" · "));
        }
        var badge = e._from === 1 ? ' <span class="gl-new" title="Added in Lecture 1">Lecture 1</span>' : "";
        html += '<div class="gloss-entry' + (inLecture(e) ? " in-l1" : " only-l0") + '" id="' + e.id + '" data-search="' + (stripTags(e.term) + " " + (e.aka || []).join(" ") + " " + stripTags(e.short)).toLowerCase().replace(/"/g, "&quot;") + '">' +
          "<h3>" + e.term + aka + badge + "</h3>" +
          '<div class="gloss-def"><p>' + e.short + "</p>" + (e.long ? "<p>" + e.long + "</p>" : "") + "</div>" +
          (meta.length ? '<div class="meta">' + meta.join("<br>") + "</div>" : "") + "</div>";
      });
      html += "</section>";
    });
    host.innerHTML = html;
    renderMath(host);
    var count = document.getElementById("gloss-count");
    var countL1 = document.getElementById("gloss-count-l1");
    if (count) count.textContent = entries.length;
    if (countL1) countL1.textContent = entries.filter(inLecture).length;

    host.querySelectorAll(".gloss-entry").forEach(function (div) {
      var def = div.querySelector(".gloss-def");
      if (def) autolink(def, { excludeId: div.id, scope: "block" });
    });
    host.querySelectorAll("a.term").forEach(function (a) { a.setAttribute("href", "#" + idFromHref(a.getAttribute("href"))); });

    var input = document.getElementById("gloss-search");
    var scope = document.getElementById("gloss-scope"); // checkbox: show all Lecture 0 terms too
    function apply() {
      var q = input ? input.value.trim().toLowerCase() : "";
      var all = scope ? scope.checked : true;
      host.querySelectorAll(".gloss-entry").forEach(function (d) {
        var ok = (!q || d.getAttribute("data-search").indexOf(q) >= 0) && (all || d.classList.contains("in-l1"));
        d.style.display = ok ? "" : "none";
      });
      var shown = [];
      host.querySelectorAll(".gloss-group").forEach(function (g) {
        var any = Array.prototype.some.call(g.querySelectorAll(".gloss-entry"), function (d) { return d.style.display !== "none"; });
        g.style.display = any ? "" : "none";
        if (any) shown.push(g.getAttribute("data-letter"));
      });
      if (letterNav) letterNav.innerHTML = shown.map(function (L) { return '<a href="#letter-' + (L === "#" ? "num" : L) + '">' + L + "</a>"; }).join("");
    }
    if (input) input.addEventListener("input", apply);
    if (scope) scope.addEventListener("change", apply);
    apply();
    function goHash() {
      var id = idFromHref(location.hash);
      if (!id) return;
      var t = document.getElementById(id);
      if (t && t.classList.contains("gloss-entry") && t.style.display === "none") {
        if (scope && !t.classList.contains("in-l1")) scope.checked = true;
        if (input) input.value = "";
        apply();
      }
      if (t) {
        t.scrollIntoView({ block: "start" });
        host.querySelectorAll(".flash").forEach(function (x) { x.classList.remove("flash"); });
        if (t.classList.contains("gloss-entry")) t.classList.add("flash");
      }
    }
    window.addEventListener("hashchange", goHash);
    setTimeout(goHash, 0);

    var ret = null;
    try { ret = sessionStorage.getItem("gloss-return"); } catch (err) {}
    if (ret && ret.indexOf("glossary.html") < 0) {
      var b = el("button", { "class": "back-btn show", type: "button" }, "← Back to the lecture");
      b.addEventListener("click", function () { location.href = ret; });
      document.body.appendChild(b);
    }
  }

  /* ---------------- Lightbox ---------------- */
  var lb = null;
  function ensureLightbox() {
    if (!lb) {
      lb = el("div", { "class": "lightbox", role: "dialog", "aria-modal": "true", "aria-label": "Enlarged figure" });
      lb.innerHTML = '<div class="lb-node"></div><div class="lb-cap"></div>';
      lb.addEventListener("click", closeLightbox);
      document.body.appendChild(lb);
    }
    return lb;
  }
  function openLightboxNode(node, cap) {
    ensureLightbox();
    var box = lb.querySelector(".lb-node");
    box.innerHTML = "";
    box.appendChild(node);
    box.style.display = "block";
    var im = lb.querySelector("img");
    if (im) im.style.display = "none";
    lb.querySelector(".lb-cap").textContent = cap || "";
    lb.classList.add("show");
  }
  function openLightbox(src, cap) {
    ensureLightbox();
    lb.querySelector(".lb-node").style.display = "none";
    var im = lb.querySelector("img");
    if (!im) { im = el("img", { alt: "" }); lb.insertBefore(im, lb.firstChild); }
    im.style.display = "";
    im.src = src;
    im.alt = cap || "";
    lb.querySelector(".lb-cap").textContent = cap || "";
    lb.classList.add("show");
  }
  function closeLightbox() { if (lb) lb.classList.remove("show"); }
  function wireLightbox() {
    document.addEventListener("click", function (e) {
      if (!e.target.closest) return;
      var svg = e.target.closest("figure.fig > .fig-body > svg");
      if (svg && !svg.closest("figure.no-zoom") && !e.target.closest("a, button, input, select, label, .widget, [data-no-zoom]")) {
        var f = svg.closest("figure");
        var t = f && f.querySelector(".fig-title");
        var clone = svg.cloneNode(true);
        clone.removeAttribute("width"); clone.removeAttribute("height");
        clone.removeAttribute("id");
        Array.prototype.forEach.call(clone.querySelectorAll("[id]"), function (n) { n.removeAttribute("id"); });
        openLightboxNode(clone, t ? t.textContent : "");
        return;
      }
      var img = e.target.closest("figure.slide-thumb img, img.zoomable");
      if (!img) return;
      e.preventDefault();
      var full = img.getAttribute("data-full") || img.currentSrc || img.src;
      var fig = img.closest("figure");
      var cap = img.getAttribute("alt") || (fig && fig.querySelector("figcaption") ? fig.querySelector("figcaption").textContent : "");
      openLightbox(full, cap);
    });
  }

  /* ---------------- Slide callouts → slide guide ---------------- */
  // "Slide 83 · …" or "Slides 72–79 · …" in the title of a .callout.bridge gets a link to that slide in the guide.
  function linkSlideCallouts(root) {
    var guide = SITE.slideGuide || "slide-guide.html";
    if (PAGE === "slide-guide") return;
    var max = SITE.slideCount || 124;
    root.querySelectorAll(".callout.bridge").forEach(function (box) {
      var title = box.querySelector(".callout-title");
      if (!title || box.querySelector(".to-decoder")) return;
      var m = title.textContent.match(/\bSlides?\s+(\d{1,3})(\s*[–-]\s*\d{1,3})?/);
      if (!m || +m[1] < 1 || +m[1] > max) return;
      var label = m[2] ? "Slides " + m[1] + "–" + m[2].replace(/[\s–-]/g, "") : "Slide " + m[1];
      var p = el("p", { "class": "to-decoder" });
      p.appendChild(el("a", { href: guide + "#slide-" + m[1] }, label + " in the slide guide →"));
      box.appendChild(p);
    });
  }

  /* ---------------- Toy-data numbers ----------------
     <span data-card="geno_fail_001">…</span> is filled with the value of that key in window.TOY_CARD
     (assets/js/lab/data-card.js, written by the toy-data generator), so the text always matches the data.
     Integers get thousands separators; strings are shown as they are. */
  function fillDataCard(root) {
    var card = window.TOY_CARD;
    (root || document).querySelectorAll("[data-card]").forEach(function (n) {
      var k = n.getAttribute("data-card");
      if (!card || !Object.prototype.hasOwnProperty.call(card, k)) { n.classList.add("dc-missing"); return; }
      var v = card[k];
      var s = (typeof v === "number" && Math.round(v) === v) ? v.toLocaleString("en-US") : String(v);
      // Negative numbers get a true minus sign (U+2212), as in the page text.
      n.textContent = typeof v === "number" ? s.replace(/^-/, "\u2212") : s;
      n.classList.remove("dc-missing");
      n.classList.add("dc");
    });
  }

  /* ---------------- Math ---------------- */
  function renderMath(root) {
    if (window.LectureMath) window.LectureMath.render(root);
  }

  /* ---------------- Init ---------------- */
  function init() {
    var article = document.querySelector("main article");
    // data-card.js may load after this script (deferred scripts run in order), so fill again once all have run.
    fillDataCard(document);
    document.addEventListener("DOMContentLoaded", function () { fillDataCard(document); });
    window.addEventListener("load", function () { fillDataCard(document); });
    if (article) renderMath(article);
    if (article) ensureHeadingIds(article);
    if (article) linkSlideCallouts(article);
    buildSidebar();
    buildPager();
    buildFooter();
    buildStepNav();
    buildTabs();
    buildCopyButtons();
    mobileNav();
    scrollSpy();
    MATCHER = buildMatcher();
    if (PAGE === "glossary") renderGlossary();
    else if (article) autolink(article);
    wireTooltips();
    wireLightbox();
    // Scroll to a #hash again after the sidebar and math changed the layout.
    if (location.hash && PAGE !== "glossary") {
      var t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (t) setTimeout(function () { t.scrollIntoView({ block: "start" }); }, 0);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  // For widgets that add content dynamically.
  window.LectureSite = {
    autolink: function (root) { renderMath(root); autolink(root, { scope: "block" }); },
    renderMath: renderMath,
    copyButtons: buildCopyButtons,
    fillDataCard: fillDataCard,
    glossary: GL
  };
})();
