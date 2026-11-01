# Statistical genetics tutorials

A growing collection of statistical genetics tutorials for data scientists and
machine-learning researchers.

**Website:** https://jeyabbalas.github.io/statistical-genetics-tutorial/

## Lectures

0. [Biological foundations for statistical genetics](0-biological-foundations/index.html)
   — 13 topics covering the biological system and how it is measured, with
   interactive examples and UK Biobank as a running example.

The [course landing page](index.html) indexes the available lectures and study
resources. The Lecture 1 decoder inside Lecture 0 accompanies the source GWAS
lecture; a separate Lecture 1 tutorial has not been added yet.

## Preview and check

From the repository root:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000/. No build or package installation is needed.

```sh
python3 tools/check_links.py
python3 0-biological-foundations/tools/check_site.py
node tools/check_math.mjs
```

The first command checks local links, assets, and HTML/glossary anchors with the
GitHub Pages project prefix. The second checks Lecture 0 and rebuilds its glossary
usage index. Its optional `--links` flag checks external references over the
network; some publishers block automated requests. The third renders every TeX
expression on the site and in the glossary with the vendored KaTeX (it needs
Node.js, nothing else) and reports any that would not render.

## Writing math

Equations are written in TeX in the HTML and rendered in the browser by
[KaTeX](https://katex.org/), which is stored in
`0-biological-foundations/assets/vendor/katex/` so the pages also work offline.
`0-biological-foundations/assets/js/math.js` holds the settings and the shared
macros, and `site.js` renders each page before it links glossary terms.

- Inline math is `\( … \)` and display math is `\[ … \]`. Dollar signs are not
  math delimiters.
- Write TeX commands, not Unicode symbols: `\beta`, `\chi^2`, `-`, `\times`,
  `\approx`, `\le`, `\ne`, `\ell`, `\sqrt{…}`, `\tfrac{1}{2}`, and `'` for a prime.
  Words inside `\text{…}` may use any character.
- Inside TeX in an HTML file, write `<`, `>` and `&` as `&lt;`, `&gt;` and `&amp;`
  (including the `&` that aligns lines in `aligned`).
- Thousands separators need braces, `1{,}532`, and a percent sign needs a
  backslash, `5\%`.
- Estimates carry hats (`\hat{p}`, `\hat{\beta}`). Subscripts that are labels,
  such as allele names, are upright (`p_{\mathrm{C}}`, `F_{\mathrm{ST}}`);
  subscripts that are indices are italic (`n_{ij}`).
- Vectors and matrices are bold (`\mathbf{G}`, `\mathbf{c}_i`,
  `\boldsymbol{\gamma}`), and their entries are italic (`g_{ij}`). A transpose is
  `^{\top}`.
- Shared macros: `\E`, `\Var`, `\Cov`, `\SE`, `\logit`, `\median`, `\Bernoulli`,
  `\Binomial`, `\Multinomial`, `\Poisson`.
- Math is not rendered in headings, `<title>`, attributes (`alt`, `title`,
  `data-toc`, `aria-label`), SVG figures, `code` or `pre`, or widget readouts; use
  Unicode there (`r²`, `D′`, `θ`).
- Keep HTML tags and links out of a TeX expression. The browser splits the text at
  a tag, and the expression is then shown as raw TeX.
- In math mode, `p` is an allele frequency. Write p-values in words ("a p-value
  below 0.05") or as plain text, as in "p < 5 × 10⁻⁸", never in math mode.
- Plain numbers in running text stay as text ("766 people", "3.1 Gb"). Anything
  with a variable or an operator such as Σ, √ or log is math. Filter settings
  written as a software option would take them ("MAF ≥ 1%", "INFO > 0.3") and
  output column names (PI_HAT, BETA) also stay as text.

### Equation blocks

Every displayed equation sits in a block that defines each of its terms and then
explains the equation as a whole:

```html
<div class="eq-block">
  <div class="eq-display">\[ \SE(\hat{p}) = \sqrt{\frac{p(1 - p)}{2n}} \]</div>
  <dl class="eq-terms">
    <dt>\(p\)</dt><dd>Frequency of the allele in the population.</dd>
    <dt>\(n\)</dt><dd>Number of unrelated people in the sample.</dd>
  </dl>
  <p class="eq-intuition">Why the equation has this form.</p>
</div>
```

The stylesheet adds the "Terms" and "Intuition" labels.

- **Terms.** One `<dt>` per symbol or sub-expression, in the order a reader meets
  them. Say what the quantity is, what it is counted or measured over (people,
  allele copies, SNPs; a population or a sample), and its unit or range.
- **Intuition.** Explain why the equation has this form: where each factor or term
  comes from, what the extreme cases give, and how the result changes when an
  input changes. Use the quantities themselves, short derivations and worked
  numbers, not analogies.
- Keep each line of a display equation narrow enough for a phone (about 30
  rendered characters). Split a longer equation with
  `\begin{gathered} … \\ … \end{gathered}` or `aligned`.
- An inline formula needs the same care: define each new symbol in the same
  sentence or the one before it, and say what the formula means.

## Add a lecture

1. Add a numbered directory such as `1-topic-name/` containing `index.html` and its
   supporting pages and assets.
2. Add an entry to the lecture list in the root `index.html`, then update the
   available lecture count and the list in this README.
3. Reuse `0-biological-foundations/assets/css/site.css` for the shared design
   system, as the landing page does. Add a relative link back to `../index.html`.
   Copy the favicon links (`assets/icons/`) and, for pages with math, the KaTeX
   stylesheet and scripts and `math.js` from the `<head>` of a Lecture 0 page,
   adjusting the relative paths.
4. Run the checks above, commit, and push to `main`.

Keep internal links relative (for example, `dna.html`, `../index.html`, and
`../sources/DCEGStatGen_09sep26.pdf`). A path starting with `/` points to the
GitHub account's domain root and skips the repository name. External citations
should keep their full `https://` URLs.

## GitHub Pages

Publish from **Settings → Pages → Deploy from a branch → main → /(root)**.
The root `.nojekyll` file makes GitHub serve this static HTML site directly.
Subsequent pushes to `main` update the website automatically.

The lecture source PDF stays in `sources/`, so relative PDF links and slide
fragments can use the same directory structure locally and on GitHub Pages.

See [Lecture 0's README](0-biological-foundations/README.md) for its editing guide,
figure credits, and content notes.
