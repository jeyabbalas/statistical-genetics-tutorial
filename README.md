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
```

The first command checks local links, assets, and HTML/glossary anchors with the
GitHub Pages project prefix. The second checks Lecture 0 and rebuilds its glossary
usage index. Its optional `--links` flag checks external references over the
network; some publishers block automated requests.

## Add a lecture

1. Add a numbered directory such as `1-topic-name/` containing `index.html` and its
   supporting pages and assets.
2. Add an entry to the lecture list in the root `index.html`, then update the
   available lecture count and the list in this README.
3. Reuse `0-biological-foundations/assets/css/site.css` for the shared design
   system, as the landing page does. Add a relative link back to `../index.html`.
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
