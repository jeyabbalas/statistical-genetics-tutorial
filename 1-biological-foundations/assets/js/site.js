/* ==========================================================================
   Lecture 1 site script (no dependencies; works from file:// and from a server)
   - Builds the sidebar navigation, per-page table of contents and the pager
   - Links glossary terms automatically and shows definition tooltips
   - Renders the glossary page from assets/js/glossary-data.js
   - Opens slide thumbnails and zoomable images in a lightbox
   ========================================================================== */
(function () {
  "use strict";

  var SITE = window.SITE || { parts: [], pages: {} };
  var ENTRIES = window.GLOSSARY_ENTRIES || [];
  var USAGE = window.GLOSSARY_USAGE || {};
  var PAGE = (document.body && document.body.getAttribute("data-page")) || "";

  var GL = {};
  ENTRIES.forEach(function (e) { if (e && e.id) GL[e.id] = e; });

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
    var cur = side.querySelector('[aria-current="page"]');
    if (cur && cur.scrollIntoView) { try { cur.scrollIntoView({ block: "center" }); } catch (e) {} }
  }

  function scrollSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll(".sidebar .toc a"));
    if (!links.length || !("IntersectionObserver" in window)) return;
    var map = {};
    links.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var visible = {};
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting; });
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
      '<a href="../index.html">All lectures</a> · Lecture 1 · ' + (SITE.title || "") + ' · <a href="glossary.html">Glossary</a> · <a href="lecture-2-bridge.html">Lecture 2 decoder</a> · <a href="resources.html">Learn more</a>' +
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
    ENTRIES.forEach(function (e) {
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

  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, CODE: 1, PRE: 1, KBD: 1, SAMP: 1, A: 1, BUTTON: 1, INPUT: 1, TEXTAREA: 1, SELECT: 1, OPTION: 1, LABEL: 1, SVG: 1, svg: 1, MATH: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1, SUMMARY: 1, NAV: 1, TH: 1, DFN: 1, Q: 1 };
  var BLOCK_SEL = "p, li, td, dd, dt, figcaption, blockquote, caption, .a, .gloss-def, div";

  function shouldSkip(node, root) {
    for (var n = node.parentNode; n && n !== root; n = n.parentNode) {
      if (n.nodeType !== 1) continue;
      if (SKIP_TAGS[n.tagName]) return true;
      if (n.classList && (n.classList.contains("no-autolink") || n.classList.contains("widget") || n.classList.contains("readout") || n.classList.contains("callout-title") || n.classList.contains("fig-title") || n.classList.contains("sources") || n.classList.contains("file-label") || n.classList.contains("chips") || n.classList.contains("learn-more") || n.classList.contains("fig-credit"))) return true;
      if (n.hasAttribute && n.hasAttribute("data-no-autolink")) return true;
    }
    return false;
  }

  // Which occurrences get a glossary link.  "section" (default): the first occurrence of a term in each
  // h2 section of running text (callout boxes count as part of their section), plus the first occurrence
  // in each self-contained element (figure caption,
  // table, quiz question, mental-model box).  "block": the first occurrence in every paragraph.
  // Change with window.SITE.autolinkScope in pages.js.
  var SELF_CONTAINED = "figcaption, table, details, .mental-model, dl";
  function autolink(root, opts) {
    if (!MATCHER || !root) return;
    opts = opts || {};
    var mode = opts.scope || (window.SITE && window.SITE.autolinkScope) || "section";
    var seen = new WeakMap();
    // very common terms (window.SITE.linkOncePerPage) get one link per page
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
    // A <dfn> defines a term in place: treat it as that block's mention so the term is not linked again there.
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
        (e.l2 ? '<br><span class="tt-l2">Appears in Lecture 2: ' + e.l2 + "</span>" : "") +
        (touch ? '<span class="tt-hint"><a href="' + a.getAttribute("href") + '">Open glossary entry →</a></span>'
               : '<span class="tt-hint">Click for the glossary entry</span>');
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
        if (e.l2) meta.push('<span class="l2badge">Lecture 2: ' + e.l2 + "</span>");
        if (e.see && e.see.length) {
          meta.push("See also: " + e.see.filter(function (s) { return GL[s]; }).map(function (s) { return '<a href="#' + s + '">' + stripTags(GL[s].term) + "</a>"; }).join(", "));
        }
        if (USAGE[e.id] && USAGE[e.id].length) {
          meta.push("Used on: " + USAGE[e.id].filter(function (k) { return SITE.pages[k]; }).map(function (k) { return '<a href="' + SITE.pages[k].file + '">' + SITE.pages[k].nav + "</a>"; }).join(", "));
        }
        if (e.links && e.links.length) {
          meta.push("Learn more: " + e.links.map(function (l) { return '<a href="' + l.u + '" target="_blank" rel="noopener">' + l.t + "</a>"; }).join(" · "));
        }
        html += '<div class="gloss-entry" id="' + e.id + '" data-search="' + (stripTags(e.term) + " " + (e.aka || []).join(" ") + " " + stripTags(e.short)).toLowerCase().replace(/"/g, "&quot;") + '">' +
          "<h3>" + e.term + aka + "</h3>" +
          '<div class="gloss-def"><p>' + e.short + "</p>" + (e.long ? "<p>" + e.long + "</p>" : "") + "</div>" +
          (meta.length ? '<div class="meta">' + meta.join("<br>") + "</div>" : "") + "</div>";
      });
      html += "</section>";
    });
    host.innerHTML = html;
    if (letterNav) letterNav.innerHTML = letters.map(function (L) { return '<a href="#letter-' + (L === "#" ? "num" : L) + '">' + L + "</a>"; }).join("");
    var count = document.getElementById("gloss-count");
    if (count) count.textContent = entries.length;

    // Link terms inside definitions to their own entries (never to the entry itself).
    host.querySelectorAll(".gloss-entry").forEach(function (div) {
      var def = div.querySelector(".gloss-def");
      if (def) autolink(def, { excludeId: div.id, scope: "block" });
    });
    host.querySelectorAll("a.term").forEach(function (a) { a.setAttribute("href", "#" + idFromHref(a.getAttribute("href"))); });

    var input = document.getElementById("gloss-search");
    if (input) {
      input.addEventListener("input", function () {
        var q = input.value.trim().toLowerCase();
        host.querySelectorAll(".gloss-entry").forEach(function (d) {
          d.style.display = (!q || d.getAttribute("data-search").indexOf(q) >= 0) ? "" : "none";
        });
        host.querySelectorAll(".gloss-group").forEach(function (g) {
          var any = Array.prototype.some.call(g.querySelectorAll(".gloss-entry"), function (d) { return d.style.display !== "none"; });
          g.style.display = any ? "" : "none";
        });
      });
    }
    function goHash() {
      var id = idFromHref(location.hash);
      if (!id) return;
      var t = document.getElementById(id);
      if (t) {
        t.scrollIntoView({ block: "start" });
        host.querySelectorAll(".flash").forEach(function (x) { x.classList.remove("flash"); });
        if (t.classList.contains("gloss-entry")) t.classList.add("flash");
      }
    }
    window.addEventListener("hashchange", goHash);
    setTimeout(goHash, 0);

    // "Back to where you were" button
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
    lb.querySelector("img").alt = cap || "";
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
        // drop ids so the page has no duplicates; url(#…) references still resolve to the original figure
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

  /* ---------------- Lecture 2 callouts → decoder rows ---------------- */
  // "Slide 83 · …" or "Slides 72–79 · …" in a callout title gets a link to that slide on the decoder page.
  function linkBridgeCallouts(root) {
    if (PAGE === "lecture-2-bridge") return;
    root.querySelectorAll(".callout.bridge").forEach(function (box) {
      var title = box.querySelector(".callout-title");
      if (!title || box.querySelector(".to-decoder")) return;
      var m = title.textContent.match(/\bSlides?\s+(\d{1,3})(\s*[–-]\s*\d{1,3})?/);
      if (!m || +m[1] < 1 || +m[1] > 124) return;
      var label = m[2] ? "Slides " + m[1] + "–" + m[2].replace(/[\s–-]/g, "") : "Slide " + m[1];
      var p = el("p", { "class": "to-decoder" });
      p.appendChild(el("a", { href: "lecture-2-bridge.html#slide-" + m[1] }, label + " in the Lecture 2 decoder →"));
      box.appendChild(p);
    });
  }

  /* ---------------- Init ---------------- */
  function init() {
    var article = document.querySelector("main article");
    if (article) ensureHeadingIds(article);
    if (article) linkBridgeCallouts(article);
    buildSidebar();
    buildPager();
    buildFooter();
    mobileNav();
    scrollSpy();
    MATCHER = buildMatcher();
    if (PAGE === "glossary") renderGlossary();
    else if (article) autolink(article);
    wireTooltips();
    wireLightbox();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  // Expose for widgets that add content dynamically.
  window.LectureSite = { autolink: function (root) { autolink(root, { scope: "block" }); }, glossary: GL };
})();
