# Lecture 0 · Biological foundations for statistical genetics

A static website for the first lecture of a ten-lecture course in statistical genetics for data
scientists and machine-learning researchers. It prepares students for Lecture 1 ("Next Generation
Statistical Methods for Genome-Wide Association Studies — Course Overview and Intro", DCEG, 9 Sep 2026)
and for working with UK Biobank data.

## Open it
- Double-click `index.html` (works straight from disk, no server needed), or
- serve the folder: `python3 -m http.server -d 0-biological-foundations 8000` and open http://localhost:8000.

## Structure
| Path | What it is |
|---|---|
| `index.html` | Overview: the two mental models for the whole lecture, roadmap |
| `cells-chromosomes.html` … `the-data.html` | 13 topic pages (Part A: the biological system; Part B: measuring it) |
| `lecture-1-bridge.html` | Lecture 1 decoder: slide-by-slide map to the pages here |
| `glossary.html` | All definitions (rendered from `assets/js/glossary-data.js`) |
| `resources.html` | Curated "learn more" links |
| `assets/css/site.css` | Design system (colors, callouts, figures, widgets, equation blocks) |
| `assets/js/pages.js` | Navigation order and page titles (edit to add/remove/reorder pages) |
| `assets/js/site.js` | Sidebar, pager, math rendering, glossary auto-linking and tooltips, glossary page, lightbox |
| `assets/js/math.js` | KaTeX settings and shared macros for the TeX math on every page |
| `assets/vendor/katex/` | KaTeX 0.19.0, stored locally (see its README) |
| `assets/js/glossary-data.js` | Glossary entries (one object per term) |
| `assets/js/glossary-usage.js` | Generated "used on" index for the glossary page |
| `assets/js/widgets/` | Interactive figures, one file per widget |
| `assets/img/lecture1/` | Lecture 1 slide images used in "Lecture 1" callouts |
| `assets/img/lesk/` | Figures from Lesk, *Introduction to Genomics* (3rd ed., OUP 2017), chapter 1 |
| `assets/img/web/` | Openly licensed images (credits in each caption) |
| `tools/check_site.py` | Checks links, images and glossary ids; rebuilds `glossary-usage.js` |

## Editing
- **Remove or reorder a page:** edit the `parts` list in `assets/js/pages.js`.
- **Trim a page:** every section heading carries a *Core* or *Optional* tag; delete whole `<h2>` sections you
  will not cover. Figures are numbered automatically.
- **Glossary:** edit `assets/js/glossary-data.js`. Each entry has `id`, `term`, `short` (tooltip text), optional
  `long`, `l1` (Lecture 1 slides), `see`, `links`, and `match` (the words that are linked automatically;
  `cs: true` makes matching case-sensitive, `auto: false` turns automatic linking off for that entry).
  To link a word by hand: `<a class="term" href="glossary.html#ID">word</a>`. To stop auto-linking inside an
  element, add `class="no-autolink"`.
- **How many glossary links appear:** set in `assets/js/pages.js`. `autolinkScope: "section"` (default) links the
  first use of a term in each section, figure caption, table, quiz question and mental-model box; `"block"` links
  the first use in every paragraph. Ids listed in `linkOncePerPage` (DNA, gene, allele, …) are linked once per page.
- **Figures:** click any drawn figure to enlarge it (Esc closes). Shared helpers in `site.css`: `figure.fig.scroll-x`
  (keeps a minimum width on phones and scrolls sideways), `.only-wide` / `.only-narrow` (swap figure versions on
  phones), `table.stack` (tables become cards on phones; give every `td` a `data-label`).
- **Equations:** written in TeX (`\( … \)` inline, `\[ … \]` displayed) and rendered by KaTeX. Each displayed
  equation sits in an equation block that defines its terms and explains it; see "Writing math" in the
  [repository README](../README.md#writing-math). Check with `node tools/check_math.mjs` from the repository root.
- **Lecture 1 links:** every "Lecture 1" callout whose title names a slide gets a link to that slide in the decoder
  (added by `site.js`). Link to a slide by hand with `lecture-1-bridge.html#slide-N`.
- After editing, run `python3 0-biological-foundations/tools/check_site.py` (add `--links` to test external links)
  and `node tools/check_math.mjs`.

## Content notes
- Figures marked "Drawn for this lecture" are original inline SVG. Simulated or illustrative data are labeled
  as such; no participant-level UK Biobank data appear anywhere.
- Lecture 1 slide images and the Lesk figures are reproduced for teaching; check permissions before posting
  the site publicly. Images in `assets/img/web/` are openly licensed (public domain, CC0, CC BY or CC BY-SA); each
  caption carries its credit and licence.
- Time-sensitive facts were checked on 21 October 2026, notably UK Biobank data access (the Research Analysis
  Platform was suspended on 23 April 2026 and was still closed in mid-October 2026; see `the-data.html#access`),
  UK Biobank Showcase counts, GWAS Catalog counts and the GWAS Diversity Monitor. Re-check them before teaching.
- The HTML files are the source of truth; edit them directly.
