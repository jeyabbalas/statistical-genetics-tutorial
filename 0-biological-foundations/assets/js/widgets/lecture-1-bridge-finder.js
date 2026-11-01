/* Lecture 1 decoder: slide finder.
   Type a Lecture 1 slide number; the widget finds the row of the slide-by-slide tables on this page
   (tr[data-slides]) that covers it and shows the slide, what it says and where to read about it.
   Also answers deep links of the form lecture-1-bridge.html#slide-86.
   Vanilla JS, no network, no libraries. Does nothing if #w-finder is absent. */
(function () {
  "use strict";

  var MAX_SLIDE = 124;

  // "57" -> [[57,57]]; "58-59" -> [[58,59]]; "9,43,55" -> [[9,9],[43,43],[55,55]]
  function parseRanges(s) {
    var out = [];
    String(s || "").split(",").forEach(function (part) {
      var m = part.trim().match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
      if (m) {
        var a = parseInt(m[1], 10), b = m[2] ? parseInt(m[2], 10) : a;
        out.push([Math.min(a, b), Math.max(a, b)]);
      }
    });
    return out;
  }

  function pad3(n) { return (n < 10 ? "00" : n < 100 ? "0" : "") + n; }

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text != null) e.textContent = text;
    return e;
  }

  function appendClone(target, cell) {
    if (!cell) return;
    Array.prototype.forEach.call(cell.childNodes, function (n) { target.appendChild(n.cloneNode(true)); });
  }

  function init() {
    var root = document.getElementById("w-finder");
    if (!root) return;
    var form = root.querySelector("form");
    var input = root.querySelector("input");
    var out = root.querySelector(".readout");
    if (!form || !input || !out) return;

    var rows = Array.prototype.slice.call(document.querySelectorAll("tr[data-slides]")).map(function (tr) {
      if (!tr.id) tr.id = "slides-" + tr.getAttribute("data-slides").replace(/[^0-9]+/g, "-");
      return { tr: tr, ranges: parseRanges(tr.getAttribute("data-slides")) };
    });

    function find(n) {
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i].ranges;
        for (var j = 0; j < r.length; j++) if (n >= r[j][0] && n <= r[j][1]) return rows[i];
      }
      return null;
    }

    function flash(tr) {
      Array.prototype.forEach.call(document.querySelectorAll("tr.hit"), function (x) { x.classList.remove("hit"); });
      tr.classList.add("hit");
    }

    function show(n) {
      out.innerHTML = "";
      if (!(n >= 1 && n <= MAX_SLIDE) || Math.floor(n) !== n) {
        out.appendChild(el("p", null, "Lecture 1 has slides 1 to " + MAX_SLIDE + ". Type a whole number in that range."));
        return;
      }
      var hit = find(n);
      var grid = el("div", { "class": "fd-grid" });
      var fig = el("figure", { "class": "slide-thumb" });
      fig.appendChild(el("img", { src: "assets/img/lecture1/slide-" + pad3(n) + ".jpg", alt: "Lecture 1, slide " + n }));
      fig.appendChild(el("figcaption", null, "Slide " + n + " · click to enlarge"));
      grid.appendChild(fig);
      var info = el("div", { "class": "fd-info" });
      if (!hit) {
        info.appendChild(el("p", null, "Slide " + n + " is not in the tables yet."));
      } else {
        var table = hit.tr.closest("table");
        var blockId = table ? table.getAttribute("data-block-id") : "";
        var blockName = table ? table.getAttribute("data-block") : "";
        var cells = hit.tr.querySelectorAll("td");
        var where = el("p", { "class": "fd-where" });
        where.appendChild(document.createTextNode("Slide " + n + " is in "));
        var a = el("a", { href: "#" + blockId }, blockName || "this page");
        where.appendChild(a);
        where.appendChild(document.createTextNode(" (row " + (cells[0] ? cells[0].textContent.trim() : "") + ")."));
        info.appendChild(where);
        var what = el("p", { "class": "fd-what" });
        appendClone(what, cells[1]);
        info.appendChild(what);
        var read = el("p", { "class": "fd-read" });
        read.appendChild(el("strong", null, "Read here: "));
        appendClone(read, cells[2]);
        info.appendChild(read);
        var go = el("a", { href: "#" + hit.tr.id, "class": "fd-go" }, "Show this row in its table");
        go.addEventListener("click", function () { flash(hit.tr); });
        var p = el("p");
        p.appendChild(go);
        info.appendChild(p);
      }
      grid.appendChild(info);
      out.appendChild(grid);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = String(input.value || "").trim();
      show(v === "" ? NaN : Number(v));
    });

    var m = (location.hash || "").match(/^#slide-(\d{1,3})$/);
    if (m) {
      input.value = m[1];
      show(parseInt(m[1], 10));
      try { root.scrollIntoView({ block: "start" }); } catch (err) { root.scrollIntoView(); }
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
