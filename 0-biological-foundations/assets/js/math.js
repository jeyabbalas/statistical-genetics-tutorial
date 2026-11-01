/* ==========================================================================
   Math rendering with KaTeX (assets/vendor/katex)
   Write inline math as \( ... \) and display math as \[ ... \] in the HTML.
   site.js renders the article before it links glossary terms, and renders tooltips
   and the glossary page after it builds them. README.md ("Writing math") gives the
   conventions; tools/check_math.mjs checks every expression with these settings.
   ========================================================================== */
(function () {
  "use strict";

  // Shared notation. Use these instead of spelling the operators out on each page.
  var MACROS = {
    "\\E": "\\operatorname{E}",               // expectation, E[X]
    "\\Var": "\\operatorname{Var}",           // variance
    "\\Cov": "\\operatorname{Cov}",           // covariance
    "\\SE": "\\operatorname{SE}",             // standard error
    "\\logit": "\\operatorname{logit}",
    "\\median": "\\operatorname{median}",
    "\\Bernoulli": "\\operatorname{Bernoulli}",
    "\\Binomial": "\\operatorname{Binomial}",
    "\\Multinomial": "\\operatorname{Multinomial}",
    "\\Poisson": "\\operatorname{Poisson}"
  };

  var OPTIONS = {
    delimiters: [
      { left: "\\[", right: "\\]", display: true },
      { left: "\\(", right: "\\)", display: false }
    ],
    ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "option", "svg"],
    ignoredClasses: ["no-math", "katex"],
    throwOnError: false,
    errorColor: "#b42318",
    strict: "ignore",
    macros: MACROS
  };

  // Browsers may break a line between an inline expression and punctuation touching it, leaving a lone
  // "." or "," at the start of a line (or a "(" at the end of one). Short expressions are kept on one line
  // with that punctuation; long ones stay free to break inside, so they never overflow a narrow screen.
  var OPEN = /[(\[{“‘]+$/, CLOSE = /^[.,;:!?)\]}”’%]+/, SHORT = 18; // rendered glyphs
  function glue(root) {
    Array.prototype.forEach.call(root.querySelectorAll(".katex"), function (k) {
      var w = k.parentNode; // auto-render wraps each expression in a plain <span>
      if (!w || w.tagName !== "SPAN" || w.className || w.childNodes.length !== 1) return;
      var html = k.querySelector(".katex-html");
      if (!html || html.textContent.length > SHORT) return;
      var prev = w.previousSibling, next = w.nextSibling;
      var open = prev && prev.nodeType === 3 && prev.nodeValue.match(OPEN);
      var close = next && next.nodeType === 3 && next.nodeValue.match(CLOSE);
      if (!open && !close) return;
      if (open) {
        prev.nodeValue = prev.nodeValue.slice(0, -open[0].length);
        w.insertBefore(document.createTextNode(open[0]), k);
      }
      if (close) {
        next.nodeValue = next.nodeValue.slice(close[0].length);
        w.appendChild(document.createTextNode(close[0]));
      }
      w.className = "math-glue";
    });
  }

  function render(root) {
    if (!root || typeof window.renderMathInElement !== "function") return false;
    try {
      window.renderMathInElement(root, OPTIONS);
      glue(root);
      return true;
    } catch (err) {
      if (window.console) console.error("Math rendering failed:", err);
      return false;
    }
  }

  window.LectureMath = { render: render, macros: MACROS, options: OPTIONS };
})();
