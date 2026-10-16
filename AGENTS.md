# AGENTS.md

Guidance for coding agents working in this repository. Read README.md first for the layout.

## What this project is

A static website of encyclopedic, interactive learning modules. Each module is one long page with chapters, written-out math, and hand-built interactive figures. Quality bar: accurate, primary-sourced content and figures that teach a real mechanism. Do not add filler or decorative interactives.

## Hard constraints

- **No build step, no frameworks, no npm.** Plain HTML, CSS, and classic `<script>` files (not ES modules), so pages open from `file://` and publish as Artifacts unchanged.
- **External resources** are limited to Google Fonts and MathJax 3.2.2 from `cdn.jsdelivr.net`. Do not add other CDNs, remote images, or runtime `fetch` calls; the Artifact sandbox blocks them silently. Embed any data in the JS.
- **Math goes inline in HTML** as `\( … \)` and `\[ … \]`, rendered by MathJax (SVG output). The browser parses the HTML first, so **never write a raw `<` or `>` inside math.** Use `\lt` and `\gt` (for example `x_{\lt t}`); `x_{<t}` gets read as an HTML tag and the equation breaks. In prose outside math, use `&lt;` / `&gt;`.
- Do not put attributes or classes on `<body>`. The Artifact build strips the body tag, so anything on it is lost.

## Adding a module

1. Create `modules/<slug>/index.html` by copying the structure of `modules/ai-evolution/index.html`: masthead, `.module` grid with an empty `<nav class="rail"><ol></ol></nav>`, `<main class="content">`, a `.hero`, then `<section class="chapter">` elements.
2. Give each chapter an `id`, a `data-year` (or a short label such as `Pro` or `Ref`), and a `data-short` title. `Lab.rail()` builds the sidebar navigation from these attributes, so don't hand-write rail links.
3. Put figure scripts in `modules/<slug>/js/`, grouped by chapter range. Load `../../assets/js/lab.js` first, then your scripts, then call `Lab.rail()` at the end of the page.
4. Add a `.volume` link to the shelf in the root `index.html`, numbered with the next Roman numeral.
5. Update the module table in README.md.

## Writing a figure

Markup pattern:

```html
<figure class="bench" id="fig-something">
  <div class="bench-head"><span class="fig">Fig. 3.1</span><span class="label">Interactive</span><h4>Title</h4></div>
  <!-- .stage (responsive columns), .controls with .ctl blocks, canvas.plot or svg.plot, .readouts -->
  <figcaption class="caption">What to try, and what to notice.</figcaption>
</figure>
```

Script pattern: one IIFE per figure that looks up its root by id and returns early if it's missing.

```js
(function () {
  const root = Lab.$('#fig-something');
  if (!root) return;
  function draw() { /* read colors with Lab.palette() / Lab.rgb('--s1') at draw time */ }
  Lab.slider(Lab.$('#some-input', root), Lab.fmt.fixed(2), (v) => { /* update state */ draw(); });
  draw();
  Lab.onTheme(draw);            // redraw when light/dark changes
  Lab.onResize(canvas, draw);   // for canvases
})();
```

Rules:

- **Read colors from CSS tokens at draw time** (`Lab.palette()`, `Lab.rgb()`), never hard-coded hex values, and always register `Lab.onTheme(draw)`. Canvas and SVG output must be correct in both themes.
- `Lab.slider` calls its callback immediately on bind. Do not reference `const`/`let` variables declared later in the IIFE from that callback (temporal dead zone); bind sliders after everything they touch is defined, or guard with a `ready` flag.
- Use `Lab.canvas(cv)` for DPR-correct sizing. Animation loops must pause offscreen (`Lab.whenVisible`) and respect `Lab.reducedMotion`. With reduced motion, compute the end state and draw it once.
- Every figure must look complete on page load, with no blank canvas waiting for a click.
- Give every form control a stable `id` and a `<label for>`.
- Use seeded randomness (`Lab.rng(seed)`) for datasets so figures look the same on every load.
- If a figure uses illustrative rather than real data, say so in its caption.

## Charts

- Series colors in fixed order: `--s1` (cobalt), `--s2` (amber), `--s3` (magenta). These passed a color-vision-deficiency check in both themes; add a new hue only after re-validating.
- Use one y-axis per chart (no dual axes), gridlines in `--grid`, and text in ink tokens, never in a series color.
- Every SVG chart gets hover tooltips via `Lab.tip(wrap)` inside a `.chart-wrap`.
- Label only key points directly (first, last, or notable); put the rest in tooltips.

## Design system

All tokens live at the top of `assets/css/site.css`: light palette on `:root`, with dark overrides in both `@media (prefers-color-scheme: dark)` (guarded by `:not([data-theme="light"])`) and `[data-theme="dark"]`. Style components through tokens only, and define any new token in all three places. A module may give itself its own identity by overriding tokens (colors, `--f-display`, `--f-body`, `--rail`) in a `<style>` block on its page, after the `site.css` link; follow the same three-block light/dark pattern and validate any new chart palette. See `modules/lihtc/index.html`. Reuse the existing components (`.bench`, `.ctl`, `.readouts`, `.chip`, `.defn`, `.events`, `.glossary`, `.sources`) before writing new CSS. Keep running prose inside `.prose` (66ch measure).

## Writing style

- Plain, direct sentences in active voice. Avoid em-dash asides, "not X, but Y" constructions, and stock phrases.
- Introduce each idea historically (who, when, what problem), then give the math, then the figure, then the consequences.
- Every factual claim should be traceable to the module's sources list. When a number is uncertain or disputed, say so rather than rounding it into certainty.

## Verifying changes

- Syntax-check scripts: `for f in assets/js/lab.js modules/*/js/*.js; do node --check "$f"; done`
- Render headless and look for console errors (macOS):
  ```sh
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --window-size=1400,5000 \
    --virtual-time-budget=8000 --enable-logging=stderr --v=0 --screenshot=/tmp/shot.png \
    "file://$PWD/modules/ai-evolution/index.html" 2>&1 | grep -i console
  ```
- After changing a published module, rebuild with `tools/build_artifact.py` and republish to the same Artifact URL (listed in README.md).
