/* Widget "Slide finder" (page: slide-guide).
   Type a Lecture 1 slide number (1–124) or step with the arrows; the widget finds the row of the slide tables on
   this page (tr[data-slides]) that covers the slide and shows the slide image, what it shows, where Lecture 1
   explains it and where Lecture 0 gives the background. Deep links of the form slide-guide.html#slide-86 open the
   finder at that slide and highlight its row. Plain script, no network, no libraries; works from file://. */
(function () {
  "use strict";

  var MAX_SLIDE = 124;
  var IMG = "../0-biological-foundations/assets/img/lecture1/slide-";

  function pad3(n) { return (n < 10 ? "00" : n < 100 ? "0" : "") + n; }

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

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text != null) e.textContent = text;
    return e;
  }

  function cloneChildren(target, cell) {
    if (!cell) return;
    Array.prototype.forEach.call(cell.childNodes, function (n) { target.appendChild(n.cloneNode(true)); });
  }

  function init() {
    var root = document.getElementById("w-finder");
    if (!root) return;
    var body = root.querySelector(".widget-body");
    var rows = Array.prototype.slice.call(document.querySelectorAll("tr[data-slides]"));
    var index = {};
    rows.forEach(function (tr) {
      parseRanges(tr.getAttribute("data-slides")).forEach(function (r) {
        for (var k = r[0]; k <= r[1]; k++) if (!index[k]) index[k] = tr;
      });
    });

    var controls = el("div", { "class": "controls" });
    var prev = el("button", { "class": "btn", type: "button", "aria-label": "Previous slide" }, "←");
    var label = el("label", null, "Slide ");
    var input = el("input", { type: "number", min: "1", max: String(MAX_SLIDE), value: "1", inputmode: "numeric", style: "width:5.5em", "aria-label": "Slide number" });
    label.appendChild(input);
    var next = el("button", { "class": "btn", type: "button", "aria-label": "Next slide" }, "→");
    var of = el("span", { "class": "note" }, "of " + MAX_SLIDE);
    controls.appendChild(prev); controls.appendChild(label); controls.appendChild(next); controls.appendChild(of);
    body.appendChild(controls);

    var out = el("div", { "class": "finder-out", "aria-live": "polite" });
    body.appendChild(out);

    function show(n, scroll) {
      n = Math.max(1, Math.min(MAX_SLIDE, Math.round(n) || 1));
      input.value = n;
      out.innerHTML = "";
      var fig = el("figure", { "class": "finder-slide" });
      var img = el("img", { src: IMG + pad3(n) + ".jpg", alt: "Lecture 1, slide " + n, loading: "lazy" });
      fig.appendChild(img);
      fig.appendChild(el("figcaption", null, "Lecture 1 · slide " + n));
      out.appendChild(fig);
      var tr = index[n];
      var info = el("div", { "class": "finder-info" });
      if (tr) {
        var cells = tr.querySelectorAll("td");
        var blk = tr.closest("table");
        info.appendChild(el("p", { "class": "finder-block" }, (blk && blk.getAttribute("data-block")) || ""));
        var p1 = el("p"); p1.appendChild(el("strong", null, "On the slide. ")); cloneChildren(p1, cells[1]); info.appendChild(p1);
        var p2 = el("p"); p2.appendChild(el("strong", null, "Explained in Lecture 1: ")); cloneChildren(p2, cells[2]); info.appendChild(p2);
        var p3 = el("p"); p3.appendChild(el("strong", null, "Background in Lecture 0: ")); cloneChildren(p3, cells[3]); info.appendChild(p3);
        var jump = el("a", { href: "#" + (tr.id || "") }, "Show this row in the tables below");
        jump.addEventListener("click", function (ev) {
          ev.preventDefault();
          flash(tr);
          tr.scrollIntoView({ block: "center" });
        });
        if (tr.id) info.appendChild(jump);
      }
      out.appendChild(info);
      if (scroll) root.scrollIntoView({ block: "start" });
    }

    function flash(tr) {
      document.querySelectorAll("tr.flash-row").forEach(function (x) { x.classList.remove("flash-row"); });
      tr.classList.add("flash-row");
    }

    prev.addEventListener("click", function () { show(+input.value - 1); });
    next.addEventListener("click", function () { show(+input.value + 1); });
    input.addEventListener("change", function () { show(+input.value); });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") show(+input.value); });

    function fromHash() {
      var m = (location.hash || "").match(/^#slide-(\d+)$/);
      if (!m) return false;
      var n = parseInt(m[1], 10);
      show(n, false);
      var tr = index[n];
      if (tr) {
        flash(tr);
        setTimeout(function () { tr.scrollIntoView({ block: "center" }); }, 50);
      }
      return true;
    }
    window.addEventListener("hashchange", fromHash);
    if (!fromHash()) show(1, false);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
