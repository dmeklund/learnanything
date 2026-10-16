# LearnAnything

A library of long-form, interactive learning modules. Each module teaches one subject in encyclopedic depth: prose, the mathematics written out, charts, and hands-on figures you can run in the browser.

## Modules

| Vol. | Title | Folder | Contents |
|---|---|---|---|
| I | From Neuron to Transformer | `modules/ai-evolution/` | The evolution of AI from the 1943 threshold neuron to today's reasoning models. 18 chapters, 15 interactive figures, glossary, primary sources. |
| II | Section 42 | `modules/lihtc/` | The Low-Income Housing Tax Credit: history, credit mechanics and allocation, and how the parties to a deal interact. 16 chapters, 8 interactive figures, glossary, sources. |

## Viewing locally

The site is plain static HTML, CSS, and JavaScript, so there is no build step or install. Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

You need an internet connection for two things: Google Fonts, and MathJax (loaded from jsDelivr) to render the equations. Every interactive figure is self-contained and runs offline.

## Project layout

```
index.html                  Library home: the shelf of volumes
assets/
  css/site.css              Shared design system (tokens, layout, figure components)
  js/lab.js                 Shared figure toolkit (canvas, theme colors, sliders, charts, chapter rail)
modules/
  ai-evolution/
    index.html              The module page (all chapter text and figure markup)
    js/
      nn.js                 Small neural network with hand-written backprop, plus 2-D datasets
      hero.js               Opening figure: a network learning two spirals
      early.js              Ch. 1, 3, 4: threshold unit, perceptron, XOR
      learning.js           Ch. 6, 7: computation graph, optimizers, network playground
      deep.js               Ch. 8, 10, 11, 12: convolution, vanishing gradients, ImageNet, word vectors
      modern.js             Ch. 13, 14, 15: attention, positional encoding, BPE, sampling, scaling laws
  lihtc/
    index.html              Volume II page; its <style> block overrides tokens for its own identity
    js/
      deal.js               Capital stack, credit worksheet, applicable percentage, investor returns
      rules.js              Income/rent limits, income averaging, competitive QAP round
      logistics.js          Parties map, deal timeline
tools/
  build_artifact.py         Flattens one module into a folder that can be published as a claude.ai Artifact
```

## Publishing a module as an Artifact

The Artifact host wraps the page in its own `<html>/<head>/<body>` and only serves files that sit beside the page. `tools/build_artifact.py` handles both:

```sh
python3 tools/build_artifact.py ai-evolution /path/to/out
```

It strips the document wrapper, rewrites `../../assets/` paths to `assets/`, and copies the shared assets and the module's scripts alongside. Publish `out/index.html` with the other files attached as supporting files.

Published Artifacts:

- Volume I: https://claude.ai/artifact/TpLC7hJ5iBTAGpvEiUanpx
- Volume II: https://claude.ai/artifact/UHsxJDfySDCjcK1VhT76Zo

## Design

The visual identity is an engineering notebook: a graph-paper background, a margin rail of chapter years, Bodoni Moda for display type (a Didone face, kin to the Computer Modern used in mathematical papers), IBM Plex Sans for body text, and IBM Plex Mono for labels and data. Light and dark themes both follow the reader's system setting. The chart palette (cobalt, amber, magenta) was checked for color-vision-deficiency separation in both themes.

Each volume can carry its own identity on top of the shared layout by overriding tokens in a `<style>` block on its page. Volume II uses ledger-ruled paper, Public Sans (the US government's typeface) for display, Source Serif 4 for body text, Internal Revenue Code section numbers in the margin rail, and a teal, ochre, and violet chart palette, also validated in both themes.

## Accuracy notes

Historical facts, dates, and figures in the text come from the primary sources listed at the end of each module. Some figures use hand-built toy values to make a mechanism visible: in Volume I, the word-vector map, the attention weights, and the next-token logits; in Volume II, the QAP applications and the deal and investor models, which use simplified assumptions. Each such figure's caption says so.
