/* Volume VIII figures, chapters 5–7: Lagrange duality, Markowitz portfolios, and the central path of an interior-point method. */
(function () {
  const T = (g, x, y, s, fill, anchor, size) => CO.text(g, x, y, s, fill, anchor, size);

  /* ---------- Fig 5.1 Weak and strong duality ---------- */
  (function () {
    const root = Lab.$('#fig-dual');
    if (!root) return;
    const [svgA, svgB] = Lab.$$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svgB.parentElement);
    const PROB = {
      convex: { f: (x) => x * x, name: 'f(x) = x²', xr: [-3, 3], yr: [-6, 9] },
      nonconvex: { f: (x) => x ** 4 - 4 * x * x + x, name: 'f(x) = x⁴ − 4x² + x', xr: [-2.6, 2.6], yr: [-8, 9] },
    };
    const st = { p: 'convex', b: 1, lam: 1 };
    let ready = false;
    const XS = []; for (let x = -4; x <= 4.0001; x += 0.004) XS.push(x);
    const pstar = (P) => { let v = Infinity, at = 0; XS.forEach((x) => { if (x >= st.b && P.f(x) < v) { v = P.f(x); at = x; } }); return { v, at }; };
    const gdual = (P, l) => { let v = Infinity, at = 0; XS.forEach((x) => { const L = P.f(x) + l * (st.b - x); if (L < v) { v = L; at = x; } }); return { v, at }; };
    function draw() {
      if (!ready) return;
      const P = PROB[st.p], ps = pstar(P), gl = gdual(P, st.lam);
      // left: primal with the Lagrangian for the chosen multiplier
      const fa = CO.frame(svgA, { h: 320, m: { l: 36, r: 12, t: 30, b: 42 }, x: P.xr, y: P.yr, xt: [-2, -1, 0, 1, 2], yt: [-6, -3, 0, 3, 6, 9].filter((v) => v >= P.yr[0]), xl: 'x', yl: P.name + ', subject to x ≥ b' });
      Lab.svg('rect', { x: fa.X(Math.max(P.xr[0], st.b)), y: fa.m.t, width: Math.max(0, fa.X(P.xr[1]) - fa.X(Math.max(P.xr[0], st.b))), height: fa.H - fa.m.t - fa.m.b, fill: Lab.css('--accent-wash') }, fa.g);
      T(fa.g, Math.min(fa.X(Math.max(P.xr[0], st.b)) + 4, fa.W - 60), fa.m.t + 14, 'feasible', fa.pal.ink3, 'start', 10.5);
      const clip = (pts) => pts.filter((p) => p[1] >= P.yr[0] - 2 && p[1] <= P.yr[1] + 2 && p[0] >= P.xr[0] && p[0] <= P.xr[1]);
      const fp = XS.map((x) => [x, P.f(x)]), lp = XS.map((x) => [x, P.f(x) + st.lam * (st.b - x)]);
      Lab.svg('path', { d: CO.path(clip(lp), fa.X, (v) => fa.Y(Math.max(P.yr[0], Math.min(P.yr[1], v)))), fill: 'none', stroke: fa.pal.s3, 'stroke-width': 1.6, 'stroke-dasharray': '6 4' }, fa.g);
      Lab.svg('path', { d: CO.path(clip(fp), fa.X, (v) => fa.Y(Math.max(P.yr[0], Math.min(P.yr[1], v)))), fill: 'none', stroke: fa.pal.ink, 'stroke-width': 2 }, fa.g);
      Lab.svg('circle', { cx: fa.X(ps.at), cy: fa.Y(ps.v), r: 5, fill: fa.pal.s1 }, fa.g);
      T(fa.g, fa.X(ps.at) + 7, fa.Y(ps.v) + 14, 'p*', fa.pal.ink2);
      if (gl.at >= P.xr[0] && gl.at <= P.xr[1] && gl.v >= P.yr[0]) { Lab.svg('circle', { cx: fa.X(gl.at), cy: fa.Y(gl.v), r: 4.5, fill: 'none', stroke: fa.pal.s3, 'stroke-width': 2 }, fa.g); T(fa.g, fa.X(gl.at) - 6, fa.Y(gl.v) + 16, 'min of L', fa.pal.ink2, 'end', 10.5); }
      T(fa.g, fa.W - fa.m.r - 4, fa.H - fa.m.b - 8, 'dashed: L(x, λ) = f(x) + λ(b − x)', fa.pal.ink3, 'end', 10.5);
      // right: the dual function
      const LMAX = 8, G = []; for (let l = 0; l <= LMAX + 1e-9; l += 0.04) G.push([l, gdual(P, l).v]);
      const lo = Math.min(...G.map((p) => p[1]), ps.v) - 0.8, hi = Math.max(ps.v, ...G.map((p) => p[1])) + 1.5;
      const fb = CO.frame(svgB, { h: 320, m: { l: 40, r: 12, t: 30, b: 42 }, x: [0, LMAX], y: [lo, hi], xt: [0, 2, 4, 6, 8], yt: [], xl: 'multiplier λ', yl: 'Dual function g(λ) = min over x of L(x, λ)' });
      Lab.svg('line', { x1: fb.m.l, x2: fb.W - fb.m.r, y1: fb.Y(ps.v), y2: fb.Y(ps.v), stroke: fb.pal.s1, 'stroke-dasharray': '5 4' }, fb.g);
      T(fb.g, fb.W - fb.m.r - 4, fb.Y(ps.v) - 6, `p* = ${ps.v.toFixed(2)}`, fb.pal.ink2, 'end', 10.5);
      Lab.svg('path', { d: CO.path(G, fb.X, fb.Y), fill: 'none', stroke: fb.pal.s3, 'stroke-width': 2 }, fb.g);
      const dstar = G.reduce((a, b) => (b[1] > a[1] ? b : a));
      Lab.svg('circle', { cx: fb.X(dstar[0]), cy: fb.Y(dstar[1]), r: 5, fill: fb.pal.s3 }, fb.g);
      T(fb.g, fb.X(dstar[0]) + 6, fb.Y(dstar[1]) + 16, 'd*', fb.pal.ink2);
      Lab.svg('circle', { cx: fb.X(st.lam), cy: fb.Y(gl.v), r: 5, fill: fb.pal.paper, stroke: fb.pal.ink, 'stroke-width': 1.5 }, fb.g);
      [[0, 1], [1, 1]].forEach(() => {});
      CO.hover(svgB, fb, 0, LMAX, (l, sx, sy, px) => { const v = gdual(P, l).v; tip.show(px, fb.Y(v) * sy - 8, `<b>λ = ${l.toFixed(2)}</b><br>g(λ) = ${v.toFixed(3)}<br>p* = ${ps.v.toFixed(3)}`, fb.Y(v) * sy + 12); }, () => tip.hide());
      const gap = ps.v - dstar[1];
      out.innerHTML = `<span>g(λ) at your λ <b>${gl.v.toFixed(3)}</b> ≤ p* <b>${ps.v.toFixed(3)}</b></span><span>best dual bound d* <b>${dstar[1].toFixed(3)}</b> at λ = ${dstar[0].toFixed(2)}</span><span>duality gap <b class="${gap > 0.01 ? 'warn' : ''}">${Math.max(0, gap).toFixed(3)}</b></span>`;
    }
    Lab.$$('[data-dp]', root).forEach((btn) => btn.addEventListener('click', () => { st.p = btn.dataset.dp; Lab.$$('[data-dp]', root).forEach((o) => o.setAttribute('aria-pressed', o === btn ? 'true' : 'false')); draw(); }));
    Lab.slider(Lab.$('#du-b', root), (v) => v.toFixed(1), (v) => { st.b = v; draw(); });
    Lab.slider(Lab.$('#du-l', root), (v) => v.toFixed(2), (v) => { st.lam = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svgB, draw);
  })();

  /* ---------- Fig 6.1 Markowitz's efficient frontier ---------- */
  (function () {
    const root = Lab.$('#fig-port');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    // Illustrative annual figures, not market data
    const A = [{ n: 'Bonds', mu: 0.03, s: 0.05 }, { n: 'Large stocks', mu: 0.065, s: 0.15 }, { n: 'Small stocks', mu: 0.085, s: 0.21 }, { n: 'Emerging markets', mu: 0.1, s: 0.27 }];
    const C = [[1, 0.1, 0.0, 0.05], [0.1, 1, 0.75, 0.6], [0.0, 0.75, 1, 0.6], [0.05, 0.6, 0.6, 1]];
    const S = A.map((a, i) => A.map((b, j) => C[i][j] * a.s * b.s)), mu = A.map((a) => a.mu), n = A.length;
    const st = { lg: 1, shorts: false };
    let ready = false;
    const risk = (w) => Math.sqrt(w.reduce((t, wi, i) => t + wi * w.reduce((u, wj, j) => u + S[i][j] * wj, 0), 0));
    const ret = (w) => w.reduce((t, wi, i) => t + wi * mu[i], 0);
    // maximize mu.w - (gamma/2) w.S.w over the budget set by projected gradient (long-only) or the closed form (shorts allowed)
    const solve = (gamma, shorts) => {
      if (shorts) {
        const inv = invert(S), a = inv.map((r) => r.reduce((t, x) => t + x, 0)), bvec = inv.map((r) => r.reduce((t, x, j) => t + x * mu[j], 0));
        const sa = a.reduce((t, x) => t + x, 0), sb = bvec.reduce((t, x) => t + x, 0), eta = (sb - gamma) / sa;
        return bvec.map((x, i) => (x - eta * a[i]) / gamma);
      }
      let w = new Array(n).fill(1 / n); const L = gamma * 0.3 + 1e-3;
      for (let it = 0; it < 3000; it++) { const g = w.map((_, i) => mu[i] - gamma * S[i].reduce((t, x, j) => t + x * w[j], 0)); w = CO.projSimplex(w.map((x, i) => x + g[i] / (L * 4))); }
      return w;
    };
    function invert(M) {
      const m = M.length, a = M.map((r, i) => [...r, ...Array.from({ length: m }, (_, j) => (i === j ? 1 : 0))]);
      for (let c = 0; c < m; c++) { let p = c; for (let r = c + 1; r < m; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r; [a[c], a[p]] = [a[p], a[c]]; const d = a[c][c]; for (let k = 0; k < 2 * m; k++) a[c][k] /= d; for (let r = 0; r < m; r++) if (r !== c) { const f = a[r][c]; for (let k = 0; k < 2 * m; k++) a[r][k] -= f * a[c][k]; } }
      return a.map((r) => r.slice(m));
    }
    const frontier = (shorts) => { const pts = []; for (let e = -1.6; e <= 3; e += 0.05) { const w = solve(Math.pow(10, e), shorts); pts.push([risk(w), ret(w)]); } return pts; };
    const FL = frontier(false), FS = frontier(true);
    function draw() {
      if (!ready) return;
      const gamma = Math.pow(10, st.lg), w = solve(gamma, st.shorts);
      const f = CO.frame(svg, { h: 400, m: { l: 44, r: 16, t: 30, b: 112 }, x: [0, 0.3], y: [0, 0.12], xt: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3], yt: [0, 0.03, 0.06, 0.09, 0.12], xf: (v) => Math.round(v * 100) + '%', yf: (v) => Math.round(v * 100) + '%', xl: 'risk: standard deviation of annual return', yl: 'Expected annual return' });
      const inside = (p) => p[0] <= 0.3 && p[1] <= 0.12 && p[1] >= 0;
      if (st.shorts) Lab.svg('path', { d: CO.path(FS.filter(inside), f.X, f.Y), fill: 'none', stroke: f.pal.s3, 'stroke-width': 2, 'stroke-dasharray': '6 4' }, f.g);
      Lab.svg('path', { d: CO.path(FL, f.X, f.Y), fill: 'none', stroke: f.pal.s1, 'stroke-width': 2.2 }, f.g);
      A.forEach((a) => { Lab.svg('circle', { cx: f.X(a.s), cy: f.Y(a.mu), r: 4.5, fill: f.pal.paper, stroke: f.pal.ink2, 'stroke-width': 1.5 }, f.g); const far = f.X(a.s) + 130 > f.W; T(f.g, f.X(a.s) + (far ? -7 : 7), f.Y(a.mu) + (far ? 16 : 4), a.n, f.pal.ink2, far ? 'end' : 'start', 10.5); });
      { const q = FL.reduce((a, b) => (Math.abs(b[0] - 0.1) < Math.abs(a[0] - 0.1) ? b : a)); T(f.g, f.X(q[0]) + 4, f.Y(q[1]) - 10, 'efficient frontier, no short sales', f.pal.ink2, 'start', 10.5); }
      if (st.shorts) T(f.g, f.X(0.22), f.Y(0.115), 'shorts allowed', f.pal.ink2, 'start', 10.5);
      const r = risk(w), m = ret(w);
      if (r <= 0.3 && m <= 0.12) Lab.svg('circle', { cx: f.X(r), cy: f.Y(m), r: 6.5, fill: f.pal.s2, stroke: f.pal.paper, 'stroke-width': 2 }, f.g);
      // weight bar
      const by = f.H - 56, bw = f.W - f.m.l - f.m.r; let x = f.m.l;
      T(f.g, f.m.l, by - 8, 'Portfolio weights', f.pal.ink2, 'start', 11);
      const cols = [f.pal.ink3, f.pal.s1, f.pal.s3, f.pal.s2];
      const pos = w.map((v) => Math.max(0, v)), tot = pos.reduce((t, v) => t + v, 0) || 1;
      w.forEach((v, i) => { const width = (Math.max(0, v) / tot) * bw; if (width > 0.5) { Lab.svg('rect', { x: x + 1, y: by, width: Math.max(0, width - 2), height: 18, fill: cols[i], rx: 2 }, f.g); if (width > 64) T(f.g, x + width / 2, by + 34, `${A[i].n.split(' ')[0]} ${Math.round(v * 100)}%`, f.pal.ink2, 'middle', 10); } x += width; });
      CO.hover(svg, f, 0, 0.3, (rx, sx, sy, px) => { const p = FL.reduce((a, b) => (Math.abs(b[0] - rx) < Math.abs(a[0] - rx) ? b : a)); tip.show(f.X(p[0]) * sx, f.Y(p[1]) * sy - 8, `<b>frontier</b><br>risk ${(p[0] * 100).toFixed(1)}%<br>return ${(p[1] * 100).toFixed(1)}%`, f.Y(p[1]) * sy + 12); }, () => tip.hide());
      out.innerHTML = `<span>expected return <b>${(m * 100).toFixed(2)}%</b></span><span>risk <b>${(r * 100).toFixed(2)}%</b></span>${w.map((v, i) => `<span>${A[i].n} <b class="${v < -0.001 ? 'warn' : ''}">${Math.round(v * 100)}%</b></span>`).join('')}`;
    }
    Lab.slider(Lab.$('#pf-g', root), (v) => Math.pow(10, v).toPrecision(2).replace(/\.0$/, ''), (v) => { st.lg = v; draw(); });
    Lab.$('#pf-s', root).addEventListener('change', (e) => { st.shorts = e.target.checked; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();

  /* ---------- Fig 7.1 The central path ---------- */
  (function () {
    const root = Lab.$('#fig-barrier');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root), P = CO.WYNDOR, V = CO.vertices(P), c = [3, 5];
    const st = { lt: -0.5 };
    let ready = false;
    const ac = CO.analyticCenter(P);
    const path = []; let x = ac;
    for (let e = -2.5; e <= 3.01; e += 0.05) { x = CO.barrierPoint(P, c, Math.pow(10, e), x).x; path.push({ e, x: x.slice() }); }
    const Fb = (t) => (a, b) => { let s = -t * (c[0] * a + c[1] * b); for (let i = 0; i < P.A.length; i++) { const r = P.b[i] - P.A[i][0] * a - P.A[i][1] * b; if (r <= 0) return NaN; s -= Math.log(r); } return s; };
    function draw() {
      if (!ready) return;
      const t = Math.pow(10, st.lt), cur = CO.barrierPoint(P, c, t, ac), F = Fb(t), fmin = F(cur.x[0], cur.x[1]);
      const Pl = CO.plane(svg, [-0.5, 5], [-0.5, 7], 360, 22), { X, Y, g, pal } = Pl;
      Lab.svg('path', { d: V.map((v, i) => (i ? 'L' : 'M') + X(v.x) + ' ' + Y(v.y)).join('') + 'Z', fill: Lab.css('--accent-wash'), stroke: pal.ink2, 'stroke-width': 1.5 }, g);
      const levels = [0.25, 1, 2.5, 5, 9, 15].map((d) => fmin + d);
      CO.contours(F, 0.001, 3.999, 0.001, 6.999, 90, 120, levels).forEach((cc) => Lab.svg('path', { d: cc.segs.map(([p, q]) => `M${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}L${X(q[0]).toFixed(1)} ${Y(q[1]).toFixed(1)}`).join(''), stroke: pal.rule, fill: 'none' }, g));
      Lab.svg('path', { d: CO.path(path.map((p) => p.x), X, Y), fill: 'none', stroke: pal.s1, 'stroke-width': 2.2 }, g);
      Lab.svg('circle', { cx: X(ac[0]), cy: Y(ac[1]), r: 4, fill: pal.ink3 }, g); T(g, X(ac[0]) + 8, Y(ac[1]) + 4, 'analytic center', pal.ink3, 'start', 10.5);
      Lab.svg('circle', { cx: X(2), cy: Y(6), r: 4, fill: pal.ink }, g); T(g, X(2) + 8, Y(6) - 6, 'optimum (2, 6)', pal.ink2, 'start', 10.5);
      Lab.svg('circle', { cx: X(cur.x[0]), cy: Y(cur.x[1]), r: 6.5, fill: pal.s2, stroke: pal.paper, 'stroke-width': 2 }, g);
      T(g, X(0.1), Y(-0.25), 'blue: central path; gray: level sets of the barrier problem at this t', pal.ink3, 'start', 10);
      const obj = c[0] * cur.x[0] + c[1] * cur.x[1];
      out.innerHTML = `<span>t <b>${t < 1 ? t.toFixed(3) : t.toFixed(t < 10 ? 2 : 0)}</b></span><span>point <b>(${cur.x[0].toFixed(3)}, ${cur.x[1].toFixed(3)})</b></span><span>profit <b>${obj.toFixed(3)}</b> of 36</span><span>gap <b>${(36 - obj).toFixed(3)}</b> ≤ m/t = <b>${(5 / t).toFixed(3)}</b></span><span>Newton steps from the center <b>${cur.steps}</b></span>`;
    }
    Lab.slider(Lab.$('#ba-t', root), (v) => { const t = Math.pow(10, v); return t < 1 ? t.toFixed(3) : t.toFixed(t < 10 ? 2 : 0); }, (v) => { st.lt = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();
})();
