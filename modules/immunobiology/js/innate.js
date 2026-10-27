/* Volume XI figures: the innate race against bacteria, and antibody binding with avidity. */
(function () {
  const T = (g, x, y, s, fill, anchor, size) => IM.text(g, x, y, s, fill, anchor, size);

  /* ---------- Fig 1.1 A race between bacteria and neutrophils ---------- */
  (function () {
    const root = Lab.$('#fig-race');
    if (!root) return;
    const svg = Lab.$('.race-b', root), svgN = Lab.$('.race-n', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement), tipN = Lab.tip(svgN.parentElement);
    const st = { b0: 4, a: 0.5 };
    let ready = false;
    // Bacteria B grow at r and are eaten by neutrophils N at a rate that saturates when bacteria swamp them;
    // neutrophils are recruited in proportion to the bacterial signal. Units: bacteria per site, neutrophil activity 0-1.
    const P = { r: 0.9, k: 3, Bs: 1e6, K: 100, d: 0.1, N0: 0.05, Bmax: 1e10 };
    const model = () => IM.rk4((t, [B, N]) => [B < 1 ? -B : P.r * B * (1 - B / P.Bmax) - (P.k * N * B) / (1 + B / P.Bs), (st.a * B) / (B + P.K) * (1 - N) - P.d * (N - P.N0)], [Math.pow(10, st.b0), P.N0], 0, 48, 4800, 20);
    const near = (o, t) => o.reduce((a, b) => (Math.abs(b[0] - t) < Math.abs(a[0] - t) ? b : a));
    function draw() {
      if (!ready) return;
      const o = model(), m = { l: 50, r: 16, t: 30, b: 42 };
      // two panels on one time axis: bacteria (log scale) above, neutrophil activity (0-100%) below
      const f = IM.frame(svg, { h: 260, m, x: [0, 48], y: [1, 1e10], ylog: true, xt: [0, 12, 24, 36, 48], yt: [1, 1e2, 1e4, 1e6, 1e8, 1e10], yf: (v) => (v === 1 ? '1' : IM.sci(v)), yl: 'Bacteria at the site (log scale)' });
      Lab.svg('path', { d: IM.path(o.map((p) => [p[0], Math.max(1, p[1])]), f.X, f.Y), fill: 'none', stroke: f.pal.s2, 'stroke-width': 2.2 }, f.g);
      const g = IM.frame(svgN, { h: 170, m, x: [0, 48], y: [0, 1], xt: [0, 12, 24, 36, 48], yt: [0, 0.5, 1], yf: (v) => Math.round(v * 100) + '%', xl: 'hours after infection', yl: 'Neutrophil activity at the site' });
      Lab.svg('path', { d: IM.path(o.map((p) => [p[0], p[2]]), g.X, g.Y), fill: 'none', stroke: f.pal.s1, 'stroke-width': 2.2 }, g.g);
      const end = o[o.length - 1][1], cleared = end < 1, won = end > 1e8;
      const show = (t, sx, sy, px) => { const p = near(o, t), html = `<b>${p[0].toFixed(0)} h</b><br>bacteria ${p[1] < 1 ? 'cleared' : IM.sci(p[1])}<br>neutrophil activity ${Math.round(p[2] * 100)}%`; tip.show(px, f.Y(Math.max(1, p[1])) * sy - 8, html, f.Y(Math.max(1, p[1])) * sy + 12); };
      IM.hover(svg, f, 0, 48, show, () => tip.hide());
      IM.hover(svgN, g, 0, 48, (t, sx, sy, px) => { const p = near(o, t); tipN.show(px, g.Y(p[2]) * sy - 8, `<b>${p[0].toFixed(0)} h</b><br>neutrophil activity ${Math.round(p[2] * 100)}%`, g.Y(p[2]) * sy + 12); }, () => tipN.hide());
      out.innerHTML = `<span>outcome after 48 hours <b class="${won ? 'warn' : ''}">${cleared ? 'infection cleared' : won ? 'bacteria overwhelm the response' : 'held in check, not cleared'}</b></span><span>peak bacterial load <b>${IM.sci(Math.max(...o.map((p) => p[1])))}</b></span>`;
    }
    Lab.slider(Lab.$('#rc-b', root), (v) => IM.sci(Math.pow(10, v)) + ' bacteria', (v) => { st.b0 = v; draw(); });
    Lab.slider(Lab.$('#rc-a', root), (v) => v.toFixed(2) + ' per hour', (v) => { st.a = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();

  /* ---------- Fig 2.1 Affinity and avidity ---------- */
  (function () {
    const root = Lab.$('#fig-bind');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    const st = { lkd: -8, valence: 2 };
    let ready = false;
    const CEFF = 1e-5; // effective local concentration of a second binding arm near its target, about 10 µM
    // Effective dissociation constant for multivalent binding to a dense surface: each extra arm that can reach
    // a neighbouring epitope multiplies the binding by (1 + Ceff/Kd). A deliberately simple model.
    const kdEff = (kd, n) => kd / Math.pow(1 + CEFF / kd, n - 1);
    const frac = (c, kd) => c / (c + kd);
    const fmtM = (v) => { const u = [[1e-3, 'mM'], [1e-6, 'µM'], [1e-9, 'nM'], [1e-12, 'pM'], [1e-15, 'fM'], [1e-18, 'aM']]; for (const [s, n] of u) if (v >= s * 0.999) return String(+(v / s).toPrecision(2)) + ' ' + n; return IM.sci(v) + ' M'; };
    function draw() {
      if (!ready) return;
      const kd = Math.pow(10, st.lkd), kde = kdEff(kd, st.valence);
      const f = IM.frame(svg, { h: 320, m: { l: 50, r: 16, t: 30, b: 42 }, x: [1e-14, 1e-4], xlog: true, y: [0, 1], xt: [1e-14, 1e-12, 1e-10, 1e-8, 1e-6, 1e-4], yt: [0, 0.25, 0.5, 0.75, 1], xf: fmtM, yf: (v) => Math.round(v * 100) + '%', xl: 'antibody concentration', yl: 'Share of target sites occupied' });
      const curve = (k) => { const p = []; for (let i = 0; i <= 200; i++) { const c = Math.pow(10, -14 + (10 * i) / 200); p.push([c, frac(c, k)]); } return p; };
      Lab.svg('line', { x1: f.m.l, x2: f.W - f.m.r, y1: f.Y(0.5), y2: f.Y(0.5), stroke: f.pal.ink3, 'stroke-dasharray': '3 3' }, f.g);
      Lab.svg('path', { d: IM.path(curve(kd), f.X, f.Y), fill: 'none', stroke: f.pal.s1, 'stroke-width': 2 }, f.g);
      if (st.valence > 1) Lab.svg('path', { d: IM.path(curve(Math.max(1e-16, kde)), f.X, f.Y), fill: 'none', stroke: f.pal.s2, 'stroke-width': 2.2 }, f.g);
      T(f.g, f.X(kd) + 8, f.Y(0.5) + 16, 'one arm (affinity)', f.pal.ink2, 'start', 10.5);
      if (st.valence > 1 && kde > 1e-14) T(f.g, f.X(kde) - 8, f.Y(0.5) - 8, `${st.valence} arms together (avidity)`, f.pal.ink2, 'end', 10.5);
      IM.hover(svg, f, 1e-14, 1e-4, () => {}, () => tip.hide());
      const hit = svg.lastChild; hit.addEventListener('mousemove', (e) => { const r = svg.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * f.W, t = (px - f.m.l) / (f.W - f.m.l - f.m.r), c = Math.pow(10, -14 + 10 * t); tip.show(e.clientX - r.left, f.m.t * (r.height / f.H) + 40, `<b>${fmtM(c)}</b><br>one arm: ${Math.round(frac(c, kd) * 100)}% occupied${st.valence > 1 ? `<br>${st.valence} arms: ${Math.round(frac(c, kde) * 100)}%` : ''}`, f.m.t * (r.height / f.H) + 60); });
      const koff = 1e5 * kd; // with a typical association rate of 10^5 per molar per second
      const half = Math.log(2) / koff;
      out.innerHTML = `<span>single-site K<sub>d</sub> <b>${fmtM(kd)}</b></span><span>effective K<sub>d</sub> with ${st.valence} arm${st.valence > 1 ? 's' : ''} <b>${fmtM(kde)}</b></span><span>one arm stays bound for a half-life of <b>${half < 60 ? half.toPrecision(2) + ' s' : half < 3600 ? (half / 60).toPrecision(2) + ' min' : (half / 3600).toPrecision(2) + ' h'}</b></span>`;
    }
    Lab.slider(Lab.$('#bd-k', root), (v) => fmtM(Math.pow(10, v)), (v) => { st.lkd = v; draw(); });
    Lab.$$('[data-val]', root).forEach((b) => b.addEventListener('click', () => { st.valence = +b.dataset.val; Lab.$$('[data-val]', root).forEach((o) => o.setAttribute('aria-pressed', o === b ? 'true' : 'false')); draw(); }));
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();
})();
