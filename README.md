# LearnAnything

A library of long-form, interactive learning modules. Each module teaches one subject in encyclopedic depth: prose, the mathematics written out, charts, and hands-on figures you can run in the browser.

## Modules

| Vol. | Title | Folder | Contents |
|---|---|---|---|
| I | From Neuron to Transformer | `modules/ai-evolution/` | The evolution of AI from the 1943 threshold neuron to today's reasoning models. 18 chapters, 15 interactive figures, glossary, primary sources. |
| II | Section 42 | `modules/lihtc/` | The Low-Income Housing Tax Credit: history, credit mechanics and allocation, and how the parties to a deal interact. 16 chapters, 8 interactive figures, glossary, sources. |
| III | Echo, Slice, Spin | `modules/medical-imaging/` | Medical imaging: the history, physics, and mathematics of ultrasound, CT, and MRI. 17 chapters, 11 interactive figures, glossary, sources. |
| IV | Base Calls | `modules/sequencing/` | Next-generation DNA sequencing: chemistry, instruments, base quality, coverage, alignment, assembly, variant calling, long reads, and applications. 14 chapters, 9 interactive figures, glossary, sources. |
| V | Pinhole | `modules/hcs-imaging/` | Fluorescence, confocal, and high-content imaging: resolution, fluorescence, optical sectioning, detectors, deconvolution, plates and robots, segmentation, screen statistics, and Cell Painting. 10 chapters, 9 interactive figures, glossary, sources. |
| VI | Isodose | `modules/radiotherapy/` | Radiation therapy and medical physics: early X-ray and radium treatment, photon interactions, depth dose, cobalt and linac machines, cell survival and fractionation, tumor control and complication probability, inverse planning, protons, and dose verification. 11 chapters, 9 interactive figures, glossary, sources. |
| VII | Ab Initio | `modules/comp-chem/` | Computational chemistry: the Schrödinger equation, the chemical bond, Hartree–Fock and basis sets, electron correlation, density functional theory, reaction surfaces, Monte Carlo, molecular dynamics, force fields, and machine learning. 11 chapters, 9 interactive figures, glossary, sources. |
| VIII | Downhill | `modules/convex-opt/` | Convex optimization: Lagrange multipliers, gradient descent and momentum, linear programming and the simplex method, KKT conditions and convexity, duality, Markowitz portfolios, interior-point methods, the lasso and compressed sensing. 10 chapters, 9 interactive figures, glossary, sources. |
| IX | Field Lines | `modules/electrodynamics/` | Classical electrodynamics: Coulomb and Gauss, magnetostatics and Helmholtz coils, induction, Maxwell's equations and FDTD, Hertz and antenna arrays, the Lorentz force, moving charges and radiation. 8 chapters, 7 interactive figures, glossary, sources. |
| X | Cleared for Market | `modules/device-regulation/` | Medical device and IVD regulation: US classes and pathways, review timelines, quality systems and ISO 14971, IVD performance statistics and CLIA, software and AI, EU MDR and IVDR transition, postmarket surveillance, IEC 62304, and a table of key ISO and IEC standards. 11 chapters, 9 interactive figures, glossary, sources. |
| XI | Self and Nonself | `modules/immunobiology/` | Immunobiology: innate immunity and phagocytes, antibodies and avidity, clonal selection and affinity maturation, V(D)J recombination, T cells, MHC, and kinetic proofreading, thymic selection and regulatory T cells, memory, vaccines, and herd immunity. 9 chapters, 8 interactive figures, glossary, sources. |
| XII | Single File | `modules/flow-cytometry/` | Flow cytometry: Coulter counting and hydrodynamic focusing, pulse shape and doublet discrimination, light scatter and gating, photon statistics and stain index, compensation and spillover spreading, DNA cell-cycle analysis, droplet sorting, rare-event statistics and MRD, spectral, mass, and imaging cytometry. 10 chapters, 9 interactive figures, glossary, sources. |
| XIII | Budding | `modules/organoids/` | Organoids: cell sorting and the differential adhesion hypothesis, spheroids and basement-membrane gels, the oxygen diffusion limit, crypt organoids from single Lgr5 stem cells, neutral drift, pluripotent protocols and morphogen gradients, forskolin-induced swelling in cystic fibrosis, CRISPR-engineered tumor organoids and drug prediction, assembloids and chips, batch effects and power. 11 chapters, 8 interactive figures, glossary, sources. |
| XIV | Loops | `modules/qed/` | Quantum field theory and QED: quantizing the field and the Casimir force, the Dirac equation and the exact hydrogen levels, Klein–Nishina scattering, Shelter Island and Bethe's renormalized Lamb shift, amplitudes added as arrows, vacuum polarization and the running coupling, the five-loop electron anomaly against the Penning trap, the muon anomaly and its 2025 resolution, and what a magnetic moment can exclude. 9 chapters, 10 interactive figures, glossary, sources. |
| XV | Two Hits | `modules/cancer-genetics/` | Cancer genetics: the Philadelphia chromosome, Knudson's two-hit argument from the ages and tumour counts of children with retinoblastoma, oncogenes as switches deaf to their off signal, loss of heterozygosity read out of allele counts, the Armitage–Doll slope fitted to real SEER incidence curves, mismatch repair and microsatellite instability, COSMIC mutational signatures mixed and refitted, telling drivers from long late-replicating genes, clonal architecture from variant allele frequencies, pre-existing resistance to targeted therapy, and the sampling floor on circulating tumour DNA. 10 chapters, 11 interactive figures, glossary, sources. |

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
  medical-imaging/
    index.html              Volume III page; its <style> block overrides tokens for its own identity
    js/
      core.js               Shared imaging core: head phantom, CT and MR rendering, FFT, B-mode simulator
      ultrasound.js         A-line echoes, array beamforming, Doppler and aliasing, B-mode
      ct.js                 X-ray attenuation, reconstruction lab, window/level, dose chart
      mri.js                Bloch vector, T1/T2/FLAIR contrast, k-space sampling
      hero.js               Opening light box of four simulated studies
  sequencing/
    index.html              Volume IV page; its <style> block overrides tokens for its own identity
    js/
      seq.js                Shared helpers (base colors, random DNA, Phred) and the flow-cell hero
      history.js            Sanger gel and electropherogram, cost-per-genome chart
      chemistry.js          Sequencing-by-synthesis phasing model, FASTQ decoder
      analysis.js           Coverage (Lander-Waterman), BWT backward search, de Bruijn graph, pileup genotyping
      apps.js               Trisomy 21 detection by counting cell-free DNA reads
  hcs-imaging/
    index.html              Volume V page; dark-first, its <style> block overrides tokens in all three theme blocks
    js/
      micro.js              Shared helpers (Airy function, blur, Poisson, synthetic cells) and the plate hero
      optics.js             Airy resolution, fluorescence filters, confocal pinhole, optical sectioning
      detect.js             Camera noise and SNR, Richardson-Lucy deconvolution
      screen.js             Plate throughput, nucleus segmentation (Otsu, watershed), Z' and hit calling
  radiotherapy/
    index.html              Volume VI page; its <style> block overrides tokens, and dose images sit on dark film in both themes
    js/
      rt.js                 Shared physics: depth-dose models, Bragg curve, pencil-beam dose engine and optimizer, isodose contours, chart frame
      hero.js               Opening prostate plan with a turning gantry and room lasers
      physics.js            Radium needle spacing, Compton scattering, depth dose, penumbra
      biology.js            Linear-quadratic fractionation, tumor control and complication probability
      planning.js           Inverse planning with DVHs, spread-out Bragg peak, gamma analysis
  comp-chem/
    index.html              Volume VII page; its <style> block overrides tokens for a line-printer identity
    js/
      cc.js                 Shared numerics: eigensolvers, 1-D Schrödinger, Gaussian integrals, RHF/CI for H2, Kohn-Sham LDA atom, LEPS, Hückel, chart frame
      hero.js               Hückel π orbitals of naphthalene with a clickable energy ladder
      electrons.js          Grid Schrödinger solver, H2+ LCAO, Gaussian basis convergence, H2 dissociation, cost scaling, Kohn-Sham atom
      nuclei.js             H + H2 trajectories on a LEPS surface, Metropolis sampling of butane, Lennard-Jones molecular dynamics
  convex-opt/
    index.html              Volume VIII page; its <style> block overrides tokens for a topographic-map identity
    js/
      co.js                 Shared solvers: 2-D LP vertices and simplex walk, log-barrier Newton, simplex and l1-ball projections, lasso coordinate descent, contours, chart frame
      hero.js               Steepest-descent paths on Boyd & Vandenberghe's §9.3 example
      basics.js             Lagrange multiplier, gradient descent and momentum, simplex method, local-versus-global minima
      duality.js            Weak and strong duality, Markowitz frontier, central path
      sparsity.js           l1 versus l2 geometry, lasso path
  electrodynamics/
    index.html              Volume IX page; its <style> block overrides tokens for a Treatise-plate identity
    js/
      em.js                 Shared physics: point-charge fields and field lines, sphere flux, elliptic integrals and loop fields, 1-D and 2-D FDTD, Boris pusher, chart frame
      hero.js               2-D FDTD of two radiating antennas
      statics.js            Field lines with Gauss's law, Helmholtz coils
      dynamics.js           Falling magnet induction, light pulse at glass (FDTD), phased array
      particles.js          Lorentz-force trajectories, field of a moving and stopping charge
  device-regulation/
    index.html              Volume X page; its <style> block overrides tokens for a regulatory-docket identity
    js/
      rg.js                 Shared: Wilson intervals, sample size, predictive values, Poisson CUSUM, chart frame
      hero.js               Five products classified side by side in the US and EU
      us.js                 US pathway finder, FDA review clock, ISO 14971 risk matrix
      ivd.js                Sensitivity sample size, predictive value versus prevalence, IMDRF/MDR Rule 11 software grid
      eu.js                 EU MDR/IVDR transition timeline, CUSUM signal detection
      s62304.js             IEC 62304 safety classification and required activities by class
  immunobiology/
    index.html              Volume XI page; its <style> block overrides tokens for a stained-tissue identity
    js/
      im.js                 Shared: RK4 integrator, superscripts, chart frame
      hero.js               A lymphocyte repertoire in shape space, activated by a drifting antigen
      innate.js             Bacteria against neutrophils, antibody affinity and avidity
      adaptive.js           Affinity maturation, receptor diversity, kinetic proofreading, thymic selection
      vaccines.js           Primary and secondary responses, herd immunity in an SIR model
  flow-cytometry/
    index.html              Volume XII page; its <style> block overrides tokens for an instrument-readout identity
    js/
      fc.js                 Shared: Poisson and log-normal variates, arcsinh display scale, chart frame, dot-plot canvas layer
      hero.js               Cells focused into single file crossing a laser, with detector pulses and a growing dot plot
      fluidics.js           Hydrodynamic focusing (Poiseuille core width, position CV, coincidence), pulse shape and doublets
      optics.js             Scatter gating, photon statistics and stain index, compensation and spreading, spectral unmixing
      sorting.js            DNA content histogram (Dean-Jett model), droplet sorting (Rayleigh, Poisson aborts), rare events
  organoids/
    index.html              Volume XIII page; its <style> block overrides tokens for a culture-plate identity
    js/
      og.js                 Shared: random variates, chart frame, hover helper
      hero.js               Fourteen days of an intestinal organoid: one cell to a cyst to a budded crypt organoid
      assembly.js           Cell sorting in the cellular Potts model, oxygen diffusion and the anoxic core
      stem.js               Neutral drift of stem cell clones in the crypt, positional information from a gradient
      clinic.js             Forskolin-induced swelling, selection of engineered organoids by niche-factor withdrawal
      trials.js             Predictive values of an organoid drug test, statistical power with batch effects
  cancer-genetics/
    index.html              Volume XV page; its <style> block overrides tokens for a cytogenetics-bench identity
    js/
      cg.js                 Shared core: statistics (incomplete beta, Benjamini-Hochberg, non-negative least squares),
                            the COSMIC v3.4 signature matrix, the SEER incidence table, and chart helpers
      hero.js               Hero: a clone growing and sweeping as drivers accumulate
      hits.js               Figs 1.1 Knudson's two hits, 2.1 the RAS switch
      suppressor.js         Figs 3.1 allelic imbalance, 4.1 the multistage incidence slope
      mutator.js            Fig 5.1 a repeat tract drifting without mismatch repair
      catalogue.js          Figs 6.1 mutational signatures, 7.1 driver detection
      clinic.js             Figs 8.1 clonal architecture, 9.1 pre-existing resistance, 10.1 the ctDNA sampling floor
  qed/
    index.html              Volume XIV page; its <style> block overrides tokens for a physics-journal identity
    js/
      qd.js                 Shared: physical constants, chart frame, hover helper
      hero.js               An electron line gaining one photon arc per order, with the digits of g/2 catching up
      vacuum.js             Casimir pressure and the allowed mode comb, the n = 2 Dirac levels of a hydrogen-like ion
      scatter.js            Klein-Nishina differential and total cross sections, integrated numerically
      renorm.js             Bethe's 1947 Lamb shift, thin-film amplitude arrows, the running coupling and Uehling screening
      anomaly.js            The electron anomaly order by order against the trap, and the mass scale each lepton excludes
      muon.js               A simulated g-2 run fitted for the precession frequency, and the 1979-2025 record
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
- Volume III: https://claude.ai/artifact/AEkoRvyPZF4Q2pMSNZUbcs
- Volume IV: https://claude.ai/artifact/EngwarqMR8Ki5pMrJaCti8
- Volume V: https://claude.ai/artifact/CiEo7df8gc7RXFHLgAWyaa
- Volume VI: https://claude.ai/artifact/DuurmmhUDzrek6kk93wfwv
- Volume VII: https://claude.ai/artifact/S9VTvW28CRpqkibW5QXY2E
- Volume VIII: https://claude.ai/artifact/5u4kbf28cnuxXadyL9SJ5H
- Volume IX: https://claude.ai/artifact/4ZtGN4RbBwkP5MU3Muwpj8
- Volume X: https://claude.ai/artifact/DWpKi3wCBa7ZSpyeBXYWZe
- Volume XI: https://claude.ai/artifact/HNZj7UVRzMZxKL2qV95QkN
- Volume XII: https://claude.ai/artifact/EM3EzeEt612oDakpiEWDMj
- Volume XIII: https://claude.ai/artifact/UzFaHswAj7DkuMiJQpyEMW
- Volume XIV: https://claude.ai/artifact/AoHDAeJ6LLj543FDFRJuA5
- Volume XV: https://claude.ai/artifact/Hr8HcHnYy59SF6ynFnCZrp

## Design

The visual identity is an engineering notebook: a graph-paper background, a margin rail of chapter years, Bodoni Moda for display type (a Didone face, kin to the Computer Modern used in mathematical papers), IBM Plex Sans for body text, and IBM Plex Mono for labels and data. Light and dark themes both follow the reader's system setting. The chart palette (cobalt, amber, magenta) was checked for color-vision-deficiency separation in both themes.

Each volume can carry its own identity on top of the shared layout by overriding tokens in a `<style>` block on its page. Volume II uses ledger-ruled paper, Public Sans (the US government's typeface) for display, Source Serif 4 for body text, Internal Revenue Code section numbers in the margin rail, and a teal, ochre, and violet chart palette, also validated in both themes. Volume III is a radiology reading room: a voxel-dot ground, Archivo set narrow like scanner console labels, Newsreader for body text, medical images always on black film with viewer-style corner annotations, and a blue, vermilion, and trefoil-magenta palette validated in both themes. Volume IV is a sequencing core: a hexagonal nanowell ground like a patterned flow cell, Instrument Serif headlines, Source Sans for body text, JetBrains Mono for sequence, and four base colors (A, C, G, T) validated for color-vision deficiency in both themes and always shown with their letters. Volume XII is an instrument readout: cool steel paper, Chivo set heavy and uppercase for the title, Vollkorn body text, Chivo Mono for data, a 488 nm cyan accent with a laser token for the beam, and the validated blue, vermilion, and teal chart palette. Volume XIV is a mid-century physics journal: cool rag paper, Petrona for headings, Karla for reading, Space Mono for numbers, an ultramarine accent with an iron-red signal (the two inks a letterpress shop would have on the bed at once), a vacuum token for virtual pairs, and the validated blue, vermilion, and teal chart palette. Volume XV is a cytogenetics bench: cool grey card stock with a faint lavender cast, Newsreader for headings, Figtree for reading, IBM Plex Mono for data, a hematoxylin-violet accent with an eosin-rose signal, and the validated blue, vermilion, and teal chart palette. Volume XIII is a culture plate under the dissecting scope: paper tinted like phenol-red medium, Fraunces on its soft axis for headings, Hanken Grotesk body text, DM Mono for data, a deep medium-red accent with a gel token for the matrix, and the validated blue, vermilion, and teal chart palette. Volume XI is a stained tissue section: pale eosin-pink paper, hematoxylin purple for the accent, Gloock headings, Alegreya Sans body text, Azeret Mono for data, and the same validated blue, vermilion, and teal chart palette as Volumes VII and VIII. Volume X is a regulatory docket: a two-hole-punch margin, Zilla Slab headings like a government form, PT Serif body text, Courier Prime for typed data, and classifications shown as navy rubber stamps; risk zones are the only use of traffic-light colors. Volume IX takes the engraved plates of Maxwell's Treatise: fine black field lines, Cormorant Garamond headings, Libre Franklin body text, Overpass Mono for data, a brass accent, and positive and negative charge in vermilion and blue. Volume VIII is a topographic survey sheet: survey-brown contour rings behind the title, Young Serif headings, STIX Two Text (drawn to sit beside mathematics) for body text, Fragment Mono for data, and the same validated blue, vermilion, and teal palette as Volume VII. Volume VII is a 1970s line-printer printout: green-bar paper with sprocket holes, Martian Mono set condensed for headings and data, Crimson Pro for body text, orbital phases in blue and vermilion, and a blue, vermilion, and teal palette validated in both themes. Volume VI is a treatment bunker: cool concrete with isodose rings behind the title, a strip of caution tape, Big Shoulders Display (signage lettering) for headings, Spectral for body text, Red Hat Mono for data, dose washes on dark CT film in both themes, and a blue, amber, and magenta palette validated in both themes. Volume V is dark-first, like a fluorescence room: a stage-micrometer scale ruled across the ground, Bricolage Grotesque headings, Literata body text, Spline Sans Mono for data, conventional fluorescence channel colors on black, and a green, magenta, and blue chart palette. A dark-first module must restate its dark tokens inside site.css's dark selectors too, because those outrank a bare :root.

## Accuracy notes

Historical facts, dates, and figures in the text come from the primary sources listed at the end of each module. Some figures use hand-built toy values to make a mechanism visible: in Volume I, the word-vector map, the attention weights, and the next-token logits; in Volume II, the QAP applications and the deal and investor models, which use simplified assumptions; in Volume III, every image, which is simulated from a phantom with approximate tissue values; in Volume IV, the simulated reads, clusters, and cohorts; in Volume V, every image, spectrum, and screen; in Volume VI, the anatomy, dose distributions, and the tumor-control model, while the depth-dose curves are fitted to typical published beam data. Volume VII's figures run real calculations (Hartree–Fock, full CI, and Kohn–Sham energies were checked against Szabo & Ostlund and NIST reference data), with model systems as captions describe. Volume VIII's figures run the algorithms they describe; its portfolio inputs are illustrative and its lasso data synthetic. Volume IX solves the field equations directly (its FDTD reflection matches Fresnel's formula within 2%) in normalized units where captions say so. Volume X's regulatory facts were checked against primary sources (statutes, CFR sections, EU regulations, FDA and MDCG guidance) as of October 2026; its risk matrix and complaint data are illustrative. Volume XI's figures are illustrative models of real mechanisms (ODE infection and epidemic models, an evolutionary germinal-center simulation, kinetic proofreading), while its gene-segment counts come from IMGT. Volume XII's figures simulate real mechanisms (Poiseuille focusing, Poisson photon and drop statistics, least-squares unmixing) with illustrative cell populations and approximate dye spectra. Volume XIII's figures run the models they describe (a cellular Potts simulation, steady-state oxygen diffusion, neutral-drift Markov chains, exponential morphogen gradients, selection in a growing culture, and power from the noncentral t distribution); its oxygen parameters come from Magliaro et al. (2019) and the rest of its numbers are illustrative. Volume XIV's figures evaluate the formulas they describe from published constants (the Casimir pressure, the exact Dirac energies, the Klein–Nishina cross section integrated numerically over solid angle, Bethe's self-energy expression, thin-film amplitude sums, the one-loop vacuum polarization integral, the universal QED coefficients through five loops, and a least-squares fit of the anomalous precession frequency to simulated positron counts); its muon measurements and Standard Model budget are the published values from the 2025 white paper and the final Fermilab report. Volume XV's figures compute from real data and published constants where they can: the age-specific incidence curves are SEER 2013–2017 as printed in the Cancer Statistics Review, the 96-channel signature profiles are COSMIC v3.4 unchanged, the RAS mutant hydrolysis rates are Hunter et al. (2015), and the resistance model and its parameters are Bozic et al. (2013). Its read counts, mutation catalogues, driver cohorts and clonal structures are simulated from those models, as each caption states, and its microsatellite slippage rates are illustrative, chosen to reproduce the observed scale of indel burden. Volumes II–XV were fact-checked against primary sources after drafting (Volume V more lightly than the others). Each such figure's caption says so.
