/* Volume XII figures: scatter gating, photon statistics and resolution, compensation, spectral unmixing. */
(function () {
  const T = (g, x, y, s, fill, anchor, size) => FC.text(g, x, y, s, fill, anchor, size);
  const pct = (arr, q) => { const a = arr.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.max(0, Math.floor(q * a.length)))]; };

  /* ---------- Fig 2.1 Light scatter and gating ---------- */
  (function () {
    const root = Lab.$('#fig-scatter');
    if (!root) return;
    const svg = Lab.$('svg', root), cv = Lab.$('canvas', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    // illustrative populations in lysed whole blood, on linear 0-1023 scatter scales
    const POPS = [
      { id: 'lym', name: 'Lymphocytes', n: 0.3, fsc: [300, 28], ssc: [70, 14], gate: [220, 400, 25, 140] },
      { id: 'mono', name: 'Monocytes', n: 0.07, fsc: [470, 40], ssc: [210, 35], gate: [380, 600, 140, 300] },
      { id: 'gran', name: 'Granulocytes', n: 0.6, fsc: [540, 55], ssc: [600, 90], gate: [380, 800, 320, 950] },
      { id: 'debris', name: 'Debris and red cell ghosts', n: 0.03, fsc: [70, 35], ssc: [40, 25], gate: null },
    ];
    const ev = (() => { const r = Lab.rng(31), e = []; POPS.forEach((p, k) => { for (let i = 0; i < 6000 * p.n; i++) e.push([Math.max(1, p.fsc[0] + p.fsc[1] * Lab.gauss(r)), Math.max(1, p.ssc[0] * Math.exp((p.ssc[1] / p.ssc[0]) * Lab.gauss(r))), k]); }); return e; })();
    const st = { gate: 'lym' };
    function draw() {
      const f = FC.frame(svg, { h: 340, m: { l: 50, r: 16, t: 30, b: 42 }, x: [0, 1023], y: [0, 1023], xt: [0, 256, 512, 768, 1023], yt: [0, 256, 512, 768, 1023], xl: 'forward scatter (roughly, cell size)', yl: 'Side scatter (roughly, internal complexity)' });
      const layer = FC.dots(cv, f.W, f.H), P = POPS.find((p) => p.id === st.gate);
      const inG = (e) => P.gate && e[0] >= P.gate[0] && e[0] <= P.gate[1] && e[1] >= P.gate[2] && e[1] <= P.gate[3];
      layer.plot(ev.filter((e) => !inG(e)), f.X, f.Y, Lab.rgb('--ink-3'), 0.45, 2);
      layer.plot(ev.filter(inG), f.X, f.Y, Lab.rgb('--s1'), 0.75, 2.2);
      const g = P.gate; Lab.svg('rect', { x: f.X(g[0]), y: f.Y(g[3]), width: f.X(g[1]) - f.X(g[0]), height: f.Y(g[2]) - f.Y(g[3]), fill: 'none', stroke: f.pal.ink, 'stroke-width': 1.5, 'stroke-dasharray': '5 3' }, f.g);
      T(f.g, f.X(g[0]) + 4, f.Y(g[3]) - 6, P.name.toLowerCase(), f.pal.ink, 'start', 11);
      const cells = ev.filter((e) => e[2] !== 3), n = ev.filter(inG).length;
      FC.hover(svg, f, 0, 1023, () => {}, () => tip.hide());
      svg.lastChild.addEventListener('mousemove', (e) => { const r = svg.getBoundingClientRect(), px = (e.clientX - r.left) * (f.W / r.width), py = (e.clientY - r.top) * (f.H / r.height); let best = null, bd = 49; ev.forEach((x) => { const dd = (f.X(x[0]) - px) ** 2 + (f.Y(x[1]) - py) ** 2; if (dd < bd) { bd = dd; best = x; } }); if (best) tip.show(f.X(best[0]) * r.width / f.W, f.Y(best[1]) * r.height / f.H - 8, `<b>${POPS[best[2]].name}</b><br>FSC ${best[0].toFixed(0)}, SSC ${best[1].toFixed(0)}`, f.Y(best[1]) * r.height / f.H + 12); else tip.hide(); });
      out.innerHTML = `<span>events in gate <b>${n.toLocaleString('en-US')}</b></span><span>share of white cells <b>${((n / cells.length) * 100).toFixed(1)}%</b></span><span>events acquired <b>${ev.length.toLocaleString('en-US')}</b></span>`;
    }
    Lab.$$('[data-gate]', root).forEach((b) => b.addEventListener('click', () => { st.gate = b.dataset.gate; Lab.$$('[data-gate]', root).forEach((o) => o.setAttribute('aria-pressed', o === b ? 'true' : 'false')); draw(); }));
    draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();

  /* ---------- Fig 3.1 Photons, background, and resolution ---------- */
  (function () {
    const root = Lab.$('#fig-photons');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    const st = { dim: Math.log10(1500), q: 0.1, b: 100 };
    const AUTO = 300, BIO = 0.3, N = 6000; // autofluorescence of unstained cells and the cell-to-cell spread in staining
    let ready = false;
    // Each cell's light is converted to photoelectrons with efficiency Q (per fluorescent molecule equivalent);
    // the detector also collects B photoelectrons of background. Counts are Poisson; the instrument subtracts the
    // mean background and divides by Q to report molecules of equivalent fluorochrome (MESF).
    function sample(mesf, seed) {
      const r = Lab.rng(seed), v = [];
      for (let i = 0; i < N; i++) { const trueF = FC.lognorm(r, AUTO, BIO) + (mesf ? FC.lognorm(r, mesf, BIO) : 0); v.push((FC.poisson(r, st.q * trueF + st.b) - st.b) / st.q); }
      return v;
    }
    function hist(v, edges) { const h = new Array(edges.length - 1).fill(0); v.forEach((x) => { let lo = 0, hi = edges.length - 1; if (x < edges[0] || x >= edges[hi]) return; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (x >= edges[mid]) lo = mid; else hi = mid; } h[lo]++; }); return h; }
    function draw() {
      if (!ready) return;
      const dim = Math.pow(10, st.dim), neg = sample(0, 4), pos = sample(dim, 5);
      const C = 200, lo = -3000, hi = 1e5, S = FC.asinhScale(lo, hi, 0, 1, C), edges = []; for (let i = 0; i <= 160; i++) edges.push(S.inv(i / 160));
      const hn = hist(neg, edges), hp = hist(pos, edges), mx = Math.max(...hn, ...hp);
      const f = FC.frame(svg, { h: 300, m: { l: 46, r: 16, t: 30, b: 42 }, x: [lo, hi], xasinh: true, c: C, y: [0, mx * 1.08], xt: [-1000, 0, 1000, 1e4, 1e5], yt: [], xf: (v) => (v === 0 ? '0' : (v < 0 ? '−' : '') + FC.sci(Math.abs(v))), xl: 'fluorescence (molecules of equivalent fluorochrome, arcsinh scale)', yl: 'Cells' });
      const line = (h) => { const p = []; h.forEach((c, i) => { p.push([edges[i], c]); p.push([edges[i + 1], c]); }); return p; };
      [[hn, f.pal.s1, 'unstained'], [hp, f.pal.s2, 'dim stained']].forEach(([h, col]) => Lab.svg('path', { d: FC.path(line(h), f.X, f.Y) + `L${f.X(hi)} ${f.Y(0)}L${f.X(lo)} ${f.Y(0)}Z`, fill: col, 'fill-opacity': 0.2, stroke: col, 'stroke-width': 1.6 }, f.g));
      const mn = pct(neg, 0.5), mp = pct(pos, 0.5), rsd = pct(neg, 0.8413) - mn, si = (mp - mn) / (2 * rsd);
      T(f.g, f.X(mn), f.Y(Math.max(...hn)) - 8, 'unstained', f.pal.ink2, 'middle', 10.5);
      T(f.g, f.X(mp), f.Y(Math.max(...hp)) - 8, 'stained', f.pal.ink2, 'middle', 10.5);
      FC.hover(svg, f, 0, 1, (t, sx, sy, px) => { const x = S.inv((px / sx - f.m.l) / (f.W - f.m.l - f.m.r)); let i = edges.findIndex((e) => e > x) - 1; if (i < 0) i = 0; tip.show(px, f.m.t * sy + 30, `<b>${Math.round(x).toLocaleString('en-US')} MESF</b><br>unstained ${hn[i] || 0}, stained ${hp[i] || 0} cells`, f.m.t * sy + 50); }, () => tip.hide());
      out.innerHTML = `<span>photoelectrons from the stain <b>${FC.num(st.q * dim)}</b> per cell</span><span>spread of unstained cells (robust SD) <b>${FC.num(rsd)}</b> MESF</span><span>stain index <b class="${si < 2 ? 'warn' : ''}">${si.toFixed(1)}</b></span>`;
    }
    Lab.slider(Lab.$('#ph-d', root), (v) => FC.num(Math.pow(10, v)) + ' MESF', (v) => { st.dim = v; draw(); });
    Lab.slider(Lab.$('#ph-q', root), (v) => v.toFixed(2) + ' pe per MESF', (v) => { st.q = v; draw(); });
    Lab.slider(Lab.$('#ph-b', root), (v) => FC.num(v) + ' pe', (v) => { st.b = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();

  /* ---------- Fig 3.2 Compensation and spreading ---------- */
  (function () {
    const root = Lab.$('#fig-comp');
    if (!root) return;
    const svg = Lab.$('svg', root), cv = Lab.$('canvas', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    const st = { s: 0.2, comp: true };
    const Q = 0.1, SPE = 0.02, BIO = 0.25, EN = 40; // detection efficiency, PE spillover into the FITC detector, staining spread, electronic noise (MESF)
    // four illustrative populations: unstained, FITC only, PE only, both (true dye amounts)
    const POPS = [[150, 120, 0.4], [30000, 120, 0.25], [150, 8000, 0.2], [30000, 8000, 0.15]];
    let ready = false;
    function events() {
      const r = Lab.rng(9), e = [];
      POPS.forEach(([fi, pe, n], k) => { for (let i = 0; i < 5000 * n; i++) {
        const F = FC.lognorm(r, fi, BIO), P = FC.lognorm(r, pe, BIO);
        // detector signals: each detector sees its own dye plus spillover from the other, with Poisson photon noise
        const dF = FC.poisson(r, Q * (F + SPE * P)) / Q + EN * Lab.gauss(r), dP = FC.poisson(r, Q * (P + st.s * F)) / Q + EN * Lab.gauss(r);
        let x = dF, y = dP;
        if (st.comp) { const det = 1 - st.s * SPE; x = (dF - SPE * dP) / det; y = (dP - st.s * dF) / det; }
        e.push([x, y, k]);
      } });
      return e;
    }
    function draw() {
      if (!ready) return;
      const e = events(), C = 150, lim = [-2000, 2e5];
      const f = FC.frame(svg, { h: 360, m: { l: 52, r: 16, t: 30, b: 42 }, x: lim, y: lim, xasinh: true, yasinh: true, c: C, xt: [-1000, 0, 1000, 1e4, 1e5], yt: [-1000, 0, 1000, 1e4, 1e5], xf: (v) => (v === 0 ? '0' : (v < 0 ? '−' : '') + FC.sci(Math.abs(v))), yf: (v) => (v === 0 ? '0' : (v < 0 ? '−' : '') + FC.sci(Math.abs(v))), xl: 'FITC detector', yl: `PE detector (${st.comp ? 'compensated' : 'raw'})` });
      const layer = FC.dots(cv, f.W, f.H), cols = [Lab.rgb('--ink-3'), Lab.rgb('--s1'), Lab.rgb('--s2'), Lab.rgb('--s3')];
      [0, 1, 2, 3].forEach((k) => layer.plot(e.filter((x) => x[2] === k), f.X, f.Y, cols[k], 0.5, 2));
      const neg = e.filter((x) => x[2] === 0).map((x) => x[1]), fit = e.filter((x) => x[2] === 1).map((x) => x[1]);
      const rsdNeg = pct(neg, 0.8413) - pct(neg, 0.5), rsdF = pct(fit, 0.8413) - pct(fit, 0.5), medF = pct(fit, 0.5);
      const lab = (k, s) => { const pts = e.filter((x) => x[2] === k), mx = pct(pts.map((p) => p[0]), 0.995), my = pct(pts.map((p) => p[1]), 0.5), right = f.X(mx) + 8 + s.length * 6.4 < f.W - f.m.r; T(f.g, right ? f.X(mx) + 8 : f.X(pct(pts.map((p) => p[0]), 0.005)) - 8, f.Y(my) + 4, s, f.pal.ink2, right ? 'start' : 'end', 10.5); };
      lab(0, 'unstained'); lab(1, 'FITC only'); lab(2, 'PE only'); lab(3, 'both');
      FC.hover(svg, f, 0, 1, () => {}, () => tip.hide());
      svg.lastChild.addEventListener('mousemove', (ev) => { const r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) * (f.W / r.width), py = (ev.clientY - r.top) * (f.H / r.height); let best = null, bd = 49; e.forEach((x) => { const dd = (f.X(x[0]) - px) ** 2 + (f.Y(x[1]) - py) ** 2; if (dd < bd) { bd = dd; best = x; } }); if (best) tip.show(f.X(best[0]) * r.width / f.W, f.Y(best[1]) * r.height / f.H - 8, `<b>${['unstained', 'FITC only', 'PE only', 'both'][best[2]]}</b><br>FITC ${Math.round(best[0]).toLocaleString('en-US')}<br>PE ${Math.round(best[1]).toLocaleString('en-US')}`, f.Y(best[1]) * r.height / f.H + 12); else tip.hide(); });
      out.innerHTML = `<span>PE signal of FITC-only cells (median) <b class="${!st.comp && medF > 1000 ? 'warn' : ''}">${Math.round(medF).toLocaleString('en-US')}</b></span><span>their spread in PE (robust SD) <b>${Math.round(rsdF).toLocaleString('en-US')}</b></span><span>spread of unstained cells <b>${Math.round(rsdNeg).toLocaleString('en-US')}</b></span>`;
    }
    Lab.slider(Lab.$('#cp-s', root), (v) => Math.round(v * 100) + '%', (v) => { st.s = v; draw(); });
    Lab.$$('[data-comp]', root).forEach((b) => b.addEventListener('click', () => { st.comp = b.dataset.comp === '1'; Lab.$$('[data-comp]', root).forEach((o) => o.setAttribute('aria-pressed', o === b ? 'true' : 'false')); draw(); }));
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();

  /* ---------- Fig 7.1 Spectral signatures and unmixing ---------- */
  (function () {
    const root = Lab.$('#fig-spectral');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement), selA = Lab.$('#sp-a', root), selB = Lab.$('#sp-b', root);
    // detectors: a spectral analyzer with violet, blue, and red lasers, each followed by an array of emission channels
    const LASERS = [{ name: 'violet 405 nm', from: 420, n: 16 }, { name: 'blue 488 nm', from: 500, n: 14 }, { name: 'red 640 nm', from: 660, n: 8 }];
    const CH = []; LASERS.forEach((L, li) => { const step = (812 - L.from) / (L.n - 1); for (let i = 0; i < L.n; i++) CH.push({ laser: li, nm: Math.round(L.from + i * step) }); });
    // approximate excitation by each laser (relative) and emission peak and width (nm); illustrative shapes
    const DYES = {
      'BV421': [[1, 0.01, 0], 421, 16], 'BV510': [[1, 0.05, 0], 510, 26], 'BV605': [[0.9, 0.08, 0.01], 605, 20], 'FITC': [[0.04, 1, 0], 520, 22], 'BB515': [[0.07, 1, 0], 515, 20],
      'PE': [[0.06, 0.6, 0.01], 578, 18], 'PerCP-Cy5.5': [[0.08, 0.8, 0.06], 695, 26], 'PE-Cy5': [[0.05, 0.55, 0.35], 667, 20], 'PE-Cy7': [[0.04, 0.45, 0.05], 780, 24],
      'APC': [[0, 0.02, 1], 660, 18], 'Alexa Fluor 647': [[0, 0.01, 1], 668, 18], 'APC-Cy7': [[0, 0.01, 0.85], 780, 24],
    };
    const sig = (name) => { const [ex, pk, wd] = DYES[name]; const v = CH.map((c) => { const d = c.nm - pk, w = d > 0 ? wd * 1.7 : wd; return ex[c.laser] * Math.exp(-0.5 * (d / w) ** 2); }); const m = Math.max(...v); return v.map((x) => x / m); };
    Object.keys(DYES).forEach((k) => { selA.add(new Option(k, k)); selB.add(new Option(k, k)); });
    selA.value = 'APC'; selB.value = 'Alexa Fluor 647';
    function draw() {
      const a = sig(selA.value), b = sig(selB.value), n = CH.length;
      const dot = a.reduce((s, x, i) => s + x * b[i], 0), na = Math.hypot(...a), nb = Math.hypot(...b), c = dot / (na * nb);
      // for least-squares unmixing of two signatures with equal noise in every channel, each dye's noise grows by 1/√(1 − c²)
      const infl = 1 / Math.sqrt(Math.max(1e-6, 1 - c * c));
      // what a conventional instrument sees: one detector per dye, at the primary dye's peak channel
      const pa = a.indexOf(1), spill = b[pa];
      const f = FC.frame(svg, { h: 300, m: { l: 46, r: 16, t: 34, b: 46 }, x: [-0.5, n - 0.5], y: [0, 1.18], xt: [], yt: [0, 0.5, 1], yf: (v) => v, yl: 'Normalized signal in each detector' });
      let x0 = 0; LASERS.forEach((L, li) => { const xa = f.X(x0 - 0.5), xb = f.X(x0 + L.n - 0.5); if (li) Lab.svg('line', { x1: xa, x2: xa, y1: f.m.t, y2: f.H - f.m.b, stroke: f.pal.rule }, f.g); T(f.g, (xa + xb) / 2, f.m.t + 12, L.name, f.pal.ink3, 'middle', 10.5); T(f.g, xa + 2, f.H - f.m.b + 16, CH[x0].nm + ' nm', f.pal.ink3, 'start', 10); x0 += L.n; });
      T(f.g, f.W - f.m.r, f.H - f.m.b + 32, 'detector channels, grouped by laser, each labeled by its emission band', f.pal.ink2, 'end', 10.5);
      const bw = (f.X(1) - f.X(0)) * 0.38;
      a.forEach((v, i) => Lab.svg('rect', { x: f.X(i) - bw, y: f.Y(v), width: bw, height: f.Y(0) - f.Y(v), fill: f.pal.s1, rx: 1 }, f.g));
      b.forEach((v, i) => Lab.svg('rect', { x: f.X(i), y: f.Y(v), width: bw, height: f.Y(0) - f.Y(v), fill: f.pal.s2, rx: 1 }, f.g));
      T(f.g, f.X(pa) - bw - 4, f.Y(1) + 4, selA.value, f.pal.ink, 'end', 11);
      const pb = b.indexOf(1); T(f.g, f.X(pb) + bw + 4, f.Y(1) + 14, selB.value, f.pal.ink, 'start', 11);
      FC.hover(svg, f, -0.5, n - 0.5, (x, sx, sy, px) => { const i = Math.max(0, Math.min(n - 1, Math.round(x))); tip.show(px, f.m.t * sy + 30, `<b>${LASERS[CH[i].laser].name}, ${CH[i].nm} nm</b><br>${selA.value} ${a[i].toFixed(2)}<br>${selB.value} ${b[i].toFixed(2)}`, f.m.t * sy + 50); }, () => tip.hide());
      out.innerHTML = `<span>similarity (cosine) <b class="${c > 0.9 ? 'warn' : ''}">${c.toFixed(2)}</b></span><span>noise in each unmixed dye grows <b>${infl > 50 ? '&gt;50' : infl.toFixed(1)}×</b></span><span>${selB.value} in ${selA.value}'s peak detector <b>${Math.round(spill * 100)}%</b> of its own peak</span>`;
    }
    selA.addEventListener('change', draw); selB.addEventListener('change', draw);
    draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();
})();
