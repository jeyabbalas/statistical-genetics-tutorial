# KaTeX 0.19.0 (vendored)

[KaTeX](https://katex.org/) renders the TeX math on these pages. It is stored here, rather than
loaded from a CDN, so the pages also work offline and straight from disk.

| File | Source in the `katex@0.19.0` npm package |
|---|---|
| `katex.min.js` | `dist/katex.min.js` |
| `contrib/auto-render.min.js` | `dist/contrib/auto-render.min.js` |
| `katex.min.css` | `dist/katex.min.css`, reduced to WOFF2 fonts (see below) |
| `fonts/*.woff2` | `dist/fonts/*.woff2` |
| `LICENSE` | `LICENSE` (MIT) |

Every current browser reads WOFF2, so the WOFF and TTF copies of the fonts are left out, and
their `url(...)` entries are removed from `katex.min.css`.

To update, download the new version, copy the files above, and reduce the stylesheet the same way:

```sh
npm pack katex@VERSION && tar -xzf katex-VERSION.tgz
sed -E 's/,url\(fonts\/[A-Za-z0-9_-]+\.woff\) format\("woff"\),url\(fonts\/[A-Za-z0-9_-]+\.ttf\) format\("truetype"\)//g' \
  package/dist/katex.min.css > katex.min.css
```

Then run `node tools/check_math.mjs` from the repository root to re-render every expression on the site.
