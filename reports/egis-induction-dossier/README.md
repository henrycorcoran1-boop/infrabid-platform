# Egis Ireland · Roads & Urban Transportation · Induction Dossier

Source for `EgisIrelandRUTInductionDossier.pdf` — a 31-page A4 report rendered
from HTML by headless Chromium. Every graphic is inline SVG, so the PDF is
100% vector: no raster images, text stays selectable, and it prints at any size.

## Build

```bash
python3 build/make_map.py          # regenerate island geometry (only if geodata changes)
node build/render.mjs              # -> EgisIrelandRUTInductionDossier.pdf
node build/render.mjs --shots      # also write per-page PNG proofs to build/proofs/
```

`render.mjs` fails the build on console errors, failed requests, or any page
whose content overflows its fixed A4 box, and reports per-page slack so short
pages are visible rather than silently ragged.

Requires Playwright's Chromium (`/opt/node22/lib/node_modules/playwright`).

## Layout

| Path | What it is |
|---|---|
| `dossier.html` | The document. One `<section class="page">` per printed page. |
| `assets/styles.css` | Print stylesheet, brand tokens, page furniture. |
| `assets/charts.js` | Generic SVG chart toolkit (donut, bars, gantt, matrix, scatter, flow, corridor, cross-section…). |
| `assets/render-charts.js` | One block per figure — the data for every chart in the document. |
| `assets/map.js` | Portfolio map: projection, scheme positions, Network C corridors, key. |
| `assets/ireland_geo.js` | Generated island geometry (also emitted as `.json`). |
| `assets/egis_logo.json`, `egis-logo-*.svg` | The official Egis wordmark, split into mark and wordmark paths. |
| `build/make_map.py` | Projects Natural Earth 10m boundaries to SVG paths. |
| `build/render.mjs` | HTML → PDF, with the layout checks above. |

## Brand

Taken from the live Egis brand system rather than approximated:

- **Wordmark and symbol** — official Egis SVG paths, in two variants (petrol on
  light grounds, white on dark). Defined once as `<symbol>`s in `dossier.html`.
- **Lime `#ABC022`**, **petrol `#09212C`**, bright lime `#D5F311`, tints
  `#F6FCCF` / `#F0F9FA`.
- **EB Garamond** is genuinely part of the Egis brand system and is embedded.
- **Manrope** substitutes for **Codec Pro**, the licensed Egis display face,
  which cannot be embedded here. Swap it in from the internal brand portal
  before onward circulation — it is a one-line change in `styles.css`.

## Data palette

Categorical hues are assigned by entity, never cycled, and were validated with
the `dataviz` skill's checker rather than chosen by eye:

```
node scripts/validate_palette.js "#849a12,#1160c6,#c9401f,#b03a8e" --mode light --pairs all
```

All checks pass. The one warning (CVD separation 7.3, inside the 6–8 floor band)
is carried deliberately: every chart in the document ships a legend plus direct
labels, which is the secondary encoding that band requires.

There is no hover layer, because the output is a PDF. The dataviz interaction
requirement is met instead by direct labels on every mark and a table view of
the same data on the same or facing page.

## Derived figures

Three headline numbers are computed here rather than quoted from a source, and
each is captioned as derived in the document:

- **~320km** of mainline road and light rail — summed from the per-scheme
  lengths in section 08 and the live register. Associated roads, link roads and
  active travel provision are counted separately.
- **305 principal structures** (plus 78 culverts) — summed from the nine schemes
  that publish a structure count.
- **465 years** of stated experience across 17 named individuals — every figure
  is a floor, since "30 years and more" is counted as 30.

## Source

Content is carried over from the previous 22-page issue, which was assembled
from public sources only. Section 15 lists every link. Nothing was added to the
factual record in this edition; the changes are graphical, statistical and
structural. Two conflicts the previous issue did not flag are now shown
explicitly: the NDP components that sum to €265.4bn against a €275.4bn headline
(p22), and the ~470km against 328km operations footprint (p13).
