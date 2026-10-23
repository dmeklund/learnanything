/* Volume VIII figures, chapter 8: why the l1 norm gives sparse solutions, and the lasso path. */
(function () {
  const T = (g, x, y, s, fill, anchor, size) => CO.text(g, x, y, s, fill, anchor, size);

  /* ---------- Fig 8.1 Diamonds and circles ---------- */
  (function () {
    const root = Lab.$('#fig-l1');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root);
    const st = { tau: 1.2, ang: 15 };
    let ready = false;
    // least squares with an elongated, rotated quadratic; its unconstrained minimum sits at distance 2.6 from the origin
    const Q = (() => { const a = (25 * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), l1 = 1, l2 = 4; return [[l1 * c * c + l2 * s * s, (l1 - l2) * c * s], [(l1 - l2) * c * s, l1 * s * s + l2 * c * c]]; })();
    const centre = () => { const a = (st.ang * Math.PI) / 180; return [2.6 * Math.cos(a), 2.6 * Math.sin(a)]; };
    const fq = (x, y) => { const c = centre(), dx = x - c[0], dy = y - c[1]; return 0.5 * (Q[0][0] * dx * dx + 2 * Q[0][1] * dx * dy + Q[1][1] * dy * dy); };
    const solve = (proj) => { let w = [0, 0]; const c = centre(); for (let it = 0; it < 4000; it++) { const g = [Q[0][0] * (w[0] - c[0]) + Q[0][1] * (w[1] - c[1]), Q[1][0] * (w[0] - c[0]) + Q[1][1] * (w[1] - c[1])]; w = proj([w[0] - 0.2 * g[0], w[1] - 0.2 * g[1]], st.tau); } return w; };
    function draw() {
      if (!ready) return;
      const P = CO.plane(svg, [-3.2, 3.6], [-2.6, 3.6], 360, 14), { X, Y, g, pal } = P;
      [[-3, 0, 3.4, 0], [0, -2.4, 0, 3.4]].forEach(([a, b, c, d]) => Lab.svg('line', { x1: X(a), y1: Y(b), x2: X(c), y2: Y(d), stroke: pal.ink3 }, g));
      T(g, X(3.4), Y(0) - 6, 'w₁', pal.ink2, 'end'); T(g, X(0) + 6, Y(3.3), 'w₂', pal.ink2);
      const wl = solve(CO.projL1), wr = solve(CO.projL2), c = centre();
      // level sets of the loss through each solution
      [[fq(wl[0], wl[1]), pal.s2], [fq(wr[0], wr[1]), pal.s1]].forEach(([lv, col]) => {
        CO.contours(fq, -3.2, 3.6, -2.6, 3.6, 120, 110, [lv]).forEach((cc) => Lab.svg('path', { d: cc.segs.map(([p, q]) => `M${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}L${X(q[0]).toFixed(1)} ${Y(q[1]).toFixed(1)}`).join(''), stroke: col, 'stroke-opacity': 0.55, fill: 'none' }, g));
      });
      [0.4, 1.2, 2.6].forEach((lv) => CO.contours(fq, -3.2, 3.6, -2.6, 3.6, 120, 110, [lv]).forEach((cc) => Lab.svg('path', { d: cc.segs.map(([p, q]) => `M${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}L${X(q[0]).toFixed(1)} ${Y(q[1]).toFixed(1)}`).join(''), stroke: pal.rule, fill: 'none' }, g)));
      // the two balls
      const t = st.tau;
      Lab.svg('path', { d: `M${X(t)} ${Y(0)}L${X(0)} ${Y(t)}L${X(-t)} ${Y(0)}L${X(0)} ${Y(-t)}Z`, fill: Lab.rgbStr(Lab.rgb('--s2'), 0.12), stroke: pal.s2, 'stroke-width': 2 }, g);
      Lab.svg('circle', { cx: X(0), cy: Y(0), r: t * P.s, fill: 'none', stroke: pal.s1, 'stroke-width': 2, 'stroke-dasharray': '6 4' }, g);
      Lab.svg('circle', { cx: X(c[0]), cy: Y(c[1]), r: 4, fill: pal.ink }, g); T(g, X(c[0]) + 7, Y(c[1]) - 6, 'least squares, no constraint', pal.ink2, 'start', 10.5);
      Lab.svg('circle', { cx: X(wl[0]), cy: Y(wl[1]), r: 6, fill: pal.s2 }, g);
      Lab.svg('circle', { cx: X(wr[0]), cy: Y(wr[1]), r: 6, fill: pal.s1 }, g);
      T(g, 8, 16, 'solid diamond: |w₁| + |w₂| ≤ τ (lasso)', pal.ink2, 'start', 10.5);
      T(g, 8, 32, 'dashed circle: w₁² + w₂² ≤ τ² (ridge)', pal.ink2, 'start', 10.5);
      const z = (v) => (Math.abs(v) < 1e-6 ? '<b>0</b>' : v.toFixed(3));
      out.innerHTML = `<span>lasso solution <b>(${z(wl[0])}, ${z(wl[1])})</b></span><span>ridge solution <b>(${wr[0].toFixed(3)}, ${wr[1].toFixed(3)})</b></span><span>lasso is sparse <b>${Math.abs(wl[0]) < 1e-6 || Math.abs(wl[1]) < 1e-6 ? 'yes' : 'no'}</b></span>`;
    }
    Lab.slider(Lab.$('#l1-t', root), (v) => v.toFixed(2), (v) => { st.tau = v; draw(); });
    Lab.slider(Lab.$('#l1-a', root), (v) => v + '°', (v) => { st.ang = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();

  /* ---------- Fig 8.2 The lasso path ---------- */
  (function () {
    const root = Lab.$('#fig-path');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    // Synthetic regression: 60 samples, 10 features, three of them truly active
    const n = 60, p = 10, TRUE = [3, -2, 0, 0, 1.5, 0, 0, 0, 0, 0], r = Lab.rng(29);
    const X = Array.from({ length: n }, () => { const z = Lab.gauss(r); return Array.from({ length: p }, () => 0.6 * Lab.gauss(r) + 0.4 * z); });
    // standardize columns
    for (let j = 0; j < p; j++) { let m = 0, s = 0; X.forEach((row) => (m += row[j])); m /= n; X.forEach((row) => (s += (row[j] - m) ** 2)); s = Math.sqrt(s / n); X.forEach((row) => (row[j] = (row[j] - m) / s)); }
    const y = X.map((row) => row.reduce((t, x, j) => t + x * TRUE[j], 0) + 1.2 * Lab.gauss(r));
    const ym = y.reduce((t, v) => t + v, 0) / n; for (let i = 0; i < n; i++) y[i] -= ym;
    const lmax = Math.max(...Array.from({ length: p }, (_, j) => Math.abs(X.reduce((t, row, i) => t + row[j] * y[i], 0)) / n));
    const grid = [], paths = [];
    let b = null;
    for (let k = 0; k <= 80; k++) { const lam = lmax * Math.pow(10, -2.5 * (k / 80)); b = CO.lasso(X, y, lam, b); grid.push(lam); paths.push(b.slice()); }
    const st = { k: 40 };
    let ready = false;
    function draw() {
      if (!ready) return;
      const lo = Math.log10(grid[grid.length - 1]), hi = Math.log10(grid[0]);
      const allb = paths.flat(), ymin = Math.min(...allb) - 0.3, ymax = Math.max(...allb) + 0.3;
      const f = CO.frame(svg, { h: 330, m: { l: 40, r: 62, t: 30, b: 42 }, x: [hi, lo], y: [ymin, ymax], xt: [Math.ceil(lo), ...Array.from({ length: Math.floor(hi) - Math.ceil(lo) + 1 }, (_, i) => Math.ceil(lo) + i)].filter((v, i, a) => a.indexOf(v) === i), yt: [-2, -1, 0, 1, 2, 3].filter((v) => v >= ymin && v <= ymax), xf: (v) => '10' + (v < 0 ? '⁻' : '') + '⁰¹²³⁴⁵⁶⁷⁸⁹'[Math.abs(v)], xl: 'λ (penalty strength, decreasing →)', yl: 'Coefficient estimates' });
      Lab.svg('line', { x1: f.m.l, x2: f.W - f.m.r, y1: f.Y(0), y2: f.Y(0), stroke: f.pal.ink3 }, f.g);
      const col = (j) => (j === 0 ? f.pal.s1 : j === 1 ? f.pal.s2 : j === 4 ? f.pal.s3 : f.pal.ink3);
      for (let j = 0; j < p; j++) {
        const pts = paths.map((bb, k) => [Math.log10(grid[k]), bb[j]]);
        Lab.svg('path', { d: CO.path(pts, f.X, f.Y), fill: 'none', stroke: col(j), 'stroke-width': TRUE[j] ? 2.2 : 1, 'stroke-opacity': TRUE[j] ? 1 : 0.7 }, f.g);
        if (TRUE[j]) T(f.g, f.W - f.m.r + 4, f.Y(pts[pts.length - 1][1]) + 4, `x${j + 1}`, f.pal.ink2, 'start', 10.5);
      }
      T(f.g, f.W - f.m.r + 4, f.Y(0) + 16, '7 others', f.pal.ink3, 'start', 10.5);
      const lx = Math.log10(grid[st.k]);
      Lab.svg('line', { x1: f.X(lx), x2: f.X(lx), y1: f.m.t, y2: f.H - f.m.b, stroke: f.pal.ink2, 'stroke-dasharray': '3 3' }, f.g);
      CO.hover(svg, f, hi, lo, (lv, sx, sy, px) => { const k = Math.max(0, Math.min(80, Math.round(((hi - lv) / (hi - lo)) * 80))); const nz = paths[k].map((v, j) => (Math.abs(v) > 1e-9 ? `x${j + 1}: ${v.toFixed(2)}` : null)).filter(Boolean); tip.show(px, f.m.t * sy + 40, `<b>λ = ${grid[k].toPrecision(2)}</b><br>${nz.length ? nz.join('<br>') : 'all coefficients zero'}`, f.m.t * sy + 60); }, () => tip.hide());
      const bb = paths[st.k], nz = bb.map((v, j) => (Math.abs(v) > 1e-9 ? j : -1)).filter((j) => j >= 0);
      const fp = nz.filter((j) => !TRUE[j]).length, tp = nz.filter((j) => TRUE[j]).length;
      out.innerHTML = `<span>λ <b>${grid[st.k].toPrecision(2)}</b></span><span>nonzero coefficients <b>${nz.length}</b> of 10</span><span>true features kept <b>${tp} of 3</b></span><span>false features included <b>${fp}</b></span>`;
    }
    Lab.slider(Lab.$('#lp-l', root), (v) => (grid[v] ? grid[v].toPrecision(2) : ''), (v) => { st.k = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();
})();
