/* Volume XI figures: affinity maturation, V(D)J diversity, kinetic proofreading, thymic selection. */
(function () {
  const T = (g, x, y, s, fill, anchor, size) => IM.text(g, x, y, s, fill, anchor, size);

  /* ---------- Fig 3.1 Clonal selection and affinity maturation ---------- */
  (function () {
    const root = Lab.$('#fig-gc');
    if (!root) return;
    const cv = Lab.$('canvas', root), svg = Lab.$('svg', root), out = Lab.$('.readouts', root);
    const st = { mut: 0.006, sel: 6, gen: 0 };
    const AG = [0.78, 0.72], SIG = 0.03, NPOP = 400, MAXGEN = 30;
    let pop = [], hist = [], timer = 0, rng = Lab.rng(5);
    // affinity falls off with distance in an abstract "shape space" of receptor binding sites
    const aff = (c) => Math.exp(-(((c[0] - AG[0]) ** 2 + (c[1] - AG[1]) ** 2) / (2 * SIG * SIG)));
    function reset() {
      rng = Lab.rng(5); const r0 = Lab.rng(17);
      // a naive repertoire: many clones scattered across shape space
      const naive = Array.from({ length: 300 }, () => [r0(), r0()]);
      // clonal selection: only the clones that bind the antigen at all are activated
      const act = naive.filter((c) => aff(c) > 0.01).sort((a, b) => aff(b) - aff(a)).slice(0, 12);
      st.naive = naive; pop = act.map((c) => c.slice()); st.gen = 0; hist = [stats()];
    }
    function stats() { const a = pop.map(aff); return { mean: a.reduce((s, x) => s + x, 0) / a.length, max: Math.max(...a) }; }
    function generation() {
      // each B cell divides with probability rising steeply with affinity (competition for T cell help), mutating as it does
      const w = pop.map((c) => Math.pow(aff(c), st.sel / 4) + 1e-6), sum = w.reduce((s, x) => s + x, 0), next = [];
      for (let i = 0; i < NPOP; i++) {
        let u = rng() * sum, k = 0; while (u > w[k] && k < w.length - 1) { u -= w[k]; k++; }
        const p = pop[k];
        next.push([Math.min(1, Math.max(0, p[0] + st.mut * Lab.gauss(rng))), Math.min(1, Math.max(0, p[1] + st.mut * Lab.gauss(rng)))]);
      }
      pop = next; st.gen++; hist.push(stats());
    }
    function draw() {
      if (!cv.clientWidth) return;
      const { ctx, w, h } = Lab.canvas(cv, 1), pal = Lab.palette();
      ctx.clearRect(0, 0, w, h); ctx.fillStyle = pal.paper3; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = pal.rule; ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
      const X = (x) => 10 + x * (w - 20), Y = (y) => h - 10 - y * (h - 20);
      // antigen footprint
      [3, 2, 1].forEach((k) => { ctx.strokeStyle = Lab.rgbStr(Lab.rgb('--s2'), 0.25 * (4 - k)); ctx.beginPath(); ctx.arc(X(AG[0]), Y(AG[1]), k * SIG * (w - 20), 0, 7); ctx.stroke(); });
      ctx.fillStyle = pal.ink3; st.naive.forEach((c) => { ctx.beginPath(); ctx.arc(X(c[0]), Y(c[1]), 1.6, 0, 7); ctx.fill(); });
      const col = Lab.rgb('--s1');
      pop.forEach((c) => { const a = aff(c); ctx.fillStyle = Lab.rgbStr(col, 0.25 + 0.7 * a); ctx.beginPath(); ctx.arc(X(c[0]), Y(c[1]), 3.2, 0, 7); ctx.fill(); });
      ctx.fillStyle = pal.s2; ctx.beginPath(); ctx.arc(X(AG[0]), Y(AG[1]), 5, 0, 7); ctx.fill();
      ctx.font = `11px ${Lab.css('--f-mono')}`; ctx.fillStyle = pal.ink2; ctx.fillText('gray: naive repertoire · blue: responding clones', 10, 16);
      ctx.fillText('antigen', X(AG[0]) - ctx.measureText('antigen').width - 4, Y(AG[1]) + 3.5 * SIG * (w - 20));
      // affinity over generations
      const f = IM.frame(svg, { h: Math.max(260, Math.round(w * 0.92)), m: { l: 46, r: 78, t: 30, b: 42 }, x: [0, MAXGEN], y: [0, 1], xt: [0, 10, 20, 30], yt: [0, 0.25, 0.5, 0.75, 1], yf: (v) => v.toFixed(2), xl: 'germinal-center generations', yl: 'Affinity for the antigen (1 = perfect fit)' });
      Lab.svg('path', { d: IM.path(hist.map((s, i) => [i, s.max]), f.X, f.Y), fill: 'none', stroke: f.pal.s3, 'stroke-width': 2 }, f.g);
      Lab.svg('path', { d: IM.path(hist.map((s, i) => [i, s.mean]), f.X, f.Y), fill: 'none', stroke: f.pal.s1, 'stroke-width': 2.2 }, f.g);
      const last = hist[hist.length - 1];
      T(f.g, f.X(hist.length - 1) + 6, f.Y(last.mean) + 14, 'average', f.pal.ink2, 'start', 10.5);
      T(f.g, f.X(hist.length - 1) + 6, f.Y(last.max) - 6, 'best clone', f.pal.ink2, 'start', 10.5);
      out.innerHTML = `<span>generation <b>${st.gen}</b></span><span>average affinity <b>${last.mean.toFixed(2)}</b> (started at ${hist[0].mean.toFixed(2)})</span><span>clones activated from the naive repertoire <b>12 of 300</b></span>`;
    }
    function run() {
      clearInterval(timer); reset();
      if (Lab.reducedMotion) { while (st.gen < MAXGEN) generation(); draw(); return; }
      draw(); timer = setInterval(() => { generation(); draw(); if (st.gen >= MAXGEN) clearInterval(timer); }, 160);
    }
    Lab.slider(Lab.$('#gc-m', root), (v) => v.toFixed(3), (v) => { st.mut = v; });
    Lab.slider(Lab.$('#gc-s', root), (v) => v.toFixed(0), (v) => { st.sel = v; });
    Lab.$('#gc-go', root).addEventListener('click', run);
    reset(); while (st.gen < MAXGEN) generation(); draw();
    Lab.onTheme(draw); Lab.onResize(cv, draw);
  })();

  /* ---------- Fig 4.1 Counting receptor diversity ---------- */
  (function () {
    const root = Lab.$('#fig-vdj');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root);
    // Approximate numbers of functional human gene segments (IMGT); ranges vary between people
    const LOCI = {
      bcr: { name: 'Antibody (B cell receptor)', chains: [{ n: 'heavy chain', seg: [['V', 40], ['D', 23], ['J', 6]] }, { n: 'light chain', seg: [['κ V×J', 36 * 5], ['or λ V×J', 31 * 4]], sum: true }] },
      tcr: { name: 'T cell receptor', chains: [{ n: 'β chain', seg: [['V', 45], ['D', 2], ['J', 13]] }, { n: 'α chain', seg: [['V', 45], ['J', 50]] }] },
    };
    const st = { loc: 'bcr', junc: 6 };
    let ready = false;
    function draw() {
      if (!ready) return;
      const L = LOCI[st.loc], c1 = L.chains[0].seg.reduce((p, s) => p * s[1], 1), c2 = L.chains[1].sum ? L.chains[1].seg.reduce((p, s) => p + s[1], 0) : L.chains[1].seg.reduce((p, s) => p * s[1], 1);
      const comb = c1 * c2, junc = Math.pow(10, st.junc), total = comb * junc;
      const W = Math.max(280, svg.clientWidth || 600), H = 240; svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H); svg.innerHTML = '';
      const pal = Lab.palette(), g = Lab.svg('g', {}, svg), m = { l: 16, r: 16 }, X = Lab.scale(0, 20, m.l, W - m.r);
      for (let e = 0; e <= 20; e += 2) { Lab.svg('line', { x1: X(e), x2: X(e), y1: 40, y2: 150, stroke: pal.grid }, g); T(g, X(e), 168, '10' + IM.sup(e), pal.ink3, 'middle', 10.5); }
      T(g, W - m.r, 186, 'number of distinct receptors (log scale)', pal.ink2, 'end', 10.5);
      const seg = [[Math.log10(c1), `${L.chains[0].n}: ${c1.toLocaleString()}`, pal.s1], [Math.log10(c2), `× ${L.chains[1].n}: ${c2.toLocaleString()}`, pal.s3], [st.junc, `× junctional diversity: 10${IM.sup(st.junc)}`, pal.s2]];
      let x = 0;
      seg.forEach(([len, lab, col], i) => {
        Lab.svg('rect', { x: X(x), y: 70, width: Math.max(1, X(x + len) - X(x) - 2), height: 40, fill: col, rx: 2, 'fill-opacity': 0.85 }, g);
        T(g, X(x) + 2, 62 - (i % 2) * 0 - i * 0, '', pal.ink2);
        T(g, X(x) + 4, 128 + i * 0 + (i === 1 ? 14 : 0) + (i === 2 ? 28 : 0), lab, pal.ink2, 'start', 10.5);
        x += len;
      });
      Lab.svg('line', { x1: X(12), x2: X(12), y1: 40, y2: 150, stroke: pal.ink, 'stroke-dasharray': '4 3', 'stroke-width': 1.5 }, g);
      T(g, X(12) + 4, 50, 'about 10¹² lymphocytes in a person', pal.ink, 'start', 10.5);
      T(g, m.l, 22, L.name, pal.ink, 'start', 12);
      out.innerHTML = `<span>from gene segments alone <b>${IM.sci(comb)}</b></span><span>with junctional diversity <b>${IM.sci(total)}</b></span>${st.loc === 'bcr' ? '<span>plus somatic hypermutation after activation</span>' : ''}`;
    }
    Lab.$$('[data-loc]', root).forEach((b) => b.addEventListener('click', () => { st.loc = b.dataset.loc; Lab.$$('[data-loc]', root).forEach((o) => o.setAttribute('aria-pressed', o === b ? 'true' : 'false')); draw(); }));
    Lab.slider(Lab.$('#vj-j', root), (v) => '10' + IM.sup(v), (v) => { st.junc = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();

  /* ---------- Fig 5.1 Kinetic proofreading ---------- */
  (function () {
    const root = Lab.$('#fig-kp');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    const st = { n: 5, kp: 1 };
    const KOFF_AG = 0.1, KOFF_SELF = 1; // per second: a foreign peptide stays bound ten times longer than a self peptide
    let ready = false;
    const p = (koff) => Math.pow(st.kp / (st.kp + koff), st.n);
    function draw() {
      if (!ready) return;
      const f = IM.frame(svg, { h: 320, m: { l: 56, r: 16, t: 30, b: 42 }, x: [0.01, 100], xlog: true, y: [1e-8, 1], ylog: true, xt: [0.01, 0.1, 1, 10, 100], yt: [1e-8, 1e-6, 1e-4, 1e-2, 1], xf: (v) => v + '/s', yf: (v) => (v === 1 ? '1' : IM.sci(v)), xl: 'off-rate of the peptide–MHC from the T cell receptor', yl: 'Chance a binding event completes the signaling steps' });
      const pts = []; for (let i = 0; i <= 200; i++) { const k = Math.pow(10, -2 + (4 * i) / 200); if (p(k) >= 1e-8) pts.push([k, p(k)]); }
      Lab.svg('path', { d: IM.path(pts, f.X, f.Y), fill: 'none', stroke: f.pal.s1, 'stroke-width': 2.2 }, f.g);
      [[KOFF_AG, 'foreign peptide', f.pal.s2], [KOFF_SELF, 'self peptide', f.pal.s3]].forEach(([k, name, col]) => {
        Lab.svg('circle', { cx: f.X(k), cy: f.Y(Math.max(1e-8, p(k))), r: 6, fill: col, stroke: f.pal.paper, 'stroke-width': 2 }, f.g);
        T(f.g, f.X(k) - 9, f.Y(Math.max(1e-8, p(k))) + 18, name, f.pal.ink2, 'end', 10.5);
      });
      IM.hover(svg, f, 0.01, 100, () => {}, () => tip.hide());
      const hit = svg.lastChild; hit.addEventListener('mousemove', (e) => { const r = svg.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * f.W, t = (px - f.m.l) / (f.W - f.m.l - f.m.r), k = Math.pow(10, -2 + 4 * t); tip.show(e.clientX - r.left, (f.Y(Math.max(1e-8, p(k))) / f.H) * r.height - 8, `<b>off-rate ${k.toPrecision(2)}/s</b><br>mean bound time ${(1 / k).toPrecision(2)} s<br>signal probability ${IM.sci(Math.max(1e-30, p(k)))}`, (f.Y(Math.max(1e-8, p(k))) / f.H) * r.height + 12); });
      const ratio = p(KOFF_AG) / p(KOFF_SELF);
      out.innerHTML = `<span>signaling steps N <b>${st.n}</b></span><span>foreign vs self, per binding event <b>${ratio < 1e4 ? ratio.toFixed(0) : IM.sci(ratio)}×</b></span><span>with no proofreading (N = 0) <b>1×</b>; binding strength alone gives 10×</span>`;
    }
    Lab.slider(Lab.$('#kp-n', root), (v) => v + '', (v) => { st.n = v; draw(); });
    Lab.slider(Lab.$('#kp-k', root), (v) => Math.pow(10, v).toPrecision(2) + '/s', (v) => { st.kp = Math.pow(10, v); draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();

  /* ---------- Fig 6.1 Thymic selection ---------- */
  (function () {
    const root = Lab.$('#fig-thymus');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    const st = { pos: 1.6, neg: 2.5 };
    let ready = false;
    const pdf = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    const cdf = (x) => { const t = 1 / (1 + 0.2316419 * Math.abs(x)), d = 0.3989423 * Math.exp((-x * x) / 2), q = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - q : q; };
    function draw() {
      if (!ready) return;
      const f = IM.frame(svg, { h: 300, m: { l: 40, r: 34, t: 30, b: 42 }, x: [-4, 4], y: [0, 0.5], xt: [-4, -2, 0, 2, 4], yt: [], xf: (v) => (v === -4 ? 'weaker' : v === 4 ? 'stronger' : ''), xl: 'strength of a thymocyte’s receptor for self peptide–MHC', yl: 'Share of new thymocytes' });
      const zone = (a, b, col, op) => { const pts = []; for (let x = a; x <= b + 1e-9; x += 0.02) pts.push([x, pdf(x)]); Lab.svg('path', { d: `M${f.X(a)} ${f.Y(0)}` + pts.map((p) => `L${f.X(p[0]).toFixed(1)} ${f.Y(p[1]).toFixed(1)}`).join('') + `L${f.X(b)} ${f.Y(0)}Z`, fill: col, 'fill-opacity': op }, f.g); };
      zone(-4, st.pos, f.pal.ink3, 0.25); zone(st.pos, st.neg, f.pal.s1, 0.75); zone(st.neg, 4, f.pal.s2, 0.6);
      const pts = []; for (let x = -4; x <= 4; x += 0.02) pts.push([x, pdf(x)]);
      Lab.svg('path', { d: IM.path(pts, f.X, f.Y), fill: 'none', stroke: f.pal.ink2, 'stroke-width': 1.5 }, f.g);
      [[st.pos, 'positive selection'], [st.neg, 'negative selection']].forEach(([x, s], i) => { Lab.svg('line', { x1: f.X(x), x2: f.X(x), y1: f.m.t, y2: f.H - f.m.b, stroke: f.pal.ink, 'stroke-dasharray': '4 3' }, f.g); const right = i ? f.X(x) + 6 + s.length * 6.6 < f.W - f.m.r : f.X(x) - 6 - s.length * 6.6 < f.m.l; T(f.g, f.X(x) + (right ? 6 : -6), f.m.t + 14 + i * 16, s, f.pal.ink2, right ? 'start' : 'end', 10.5); });
      const neglect = cdf(st.pos), survive = cdf(st.neg) - cdf(st.pos), deleted = 1 - cdf(st.neg);
      T(f.g, f.X(-1.2), f.Y(0.2), `die of neglect ${(neglect * 100).toFixed(1)}%`, f.pal.ink2, 'middle', 11);
      IM.hover(svg, f, -4, 4, (x, sx, sy, px) => tip.show(px, f.Y(pdf(x)) * sy - 10, `<b>${x < st.pos ? 'too weak: dies by neglect' : x < st.neg ? 'positively selected: survives' : 'too strong: deleted'}</b>`, f.Y(pdf(x)) * sy + 12), () => tip.hide());
      out.innerHTML = `<span>die by neglect <b>${(neglect * 100).toFixed(1)}%</b></span><span>survive to the periphery <b>${(survive * 100).toFixed(1)}%</b></span><span>deleted as self-reactive <b class="warn">${(deleted * 100).toFixed(1)}%</b></span>`;
    }
    Lab.slider(Lab.$('#th-p', root), (v) => v.toFixed(1), (v) => { st.pos = Math.min(v, st.neg - 0.1); draw(); });
    Lab.slider(Lab.$('#th-n', root), (v) => v.toFixed(1), (v) => { st.neg = Math.max(v, st.pos + 0.1); draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();
})();
