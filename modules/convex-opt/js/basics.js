/* Volume VIII figures, chapters 1–4: Lagrange multipliers, gradient descent, the simplex method,
   and why convexity makes local minima global. */
(function () {
  const T = (g, x, y, s, fill, anchor, size) => CO.text(g, x, y, s, fill, anchor, size);

  /* ---------- Fig 1.1 A Lagrange multiplier ---------- */
  (function () {
    const root = Lab.$('#fig-lagrange');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root);
    // minimize f(x, y) = (x - 2)^2 + 3(y - 1.2)^2 on the circle x^2 + y^2 = r^2
    const f = (x, y) => (x - 2) ** 2 + 3 * (y - 1.2) ** 2, gf = (x, y) => [2 * (x - 2), 6 * (y - 1.2)];
    const st = { r: 1.5, th: 200 };
    let ready = false;
    const best = (r) => {
      let bt = 0, bv = Infinity; for (let i = 0; i < 720; i++) { const t = (i / 720) * 2 * Math.PI, v = f(r * Math.cos(t), r * Math.sin(t)); if (v < bv) { bv = v; bt = t; } }
      let lo = bt - 0.01, hi = bt + 0.01; for (let i = 0; i < 60; i++) { const a = lo + (hi - lo) / 3, b = hi - (hi - lo) / 3; if (f(r * Math.cos(a), r * Math.sin(a)) < f(r * Math.cos(b), r * Math.sin(b))) hi = b; else lo = a; }
      const t = (lo + hi) / 2; return { x: r * Math.cos(t), y: r * Math.sin(t), v: f(r * Math.cos(t), r * Math.sin(t)) };
    };
    function draw() {
      if (!ready) return;
      const P = CO.plane(svg, [-3, 4], [-2.6, 3], 360, 20), { X, Y, g, pal } = P;
      // level sets of f
      const lv = [0.25, 1, 2.25, 4, 6.25, 9, 12.25, 16, 20.25].map((v) => v);
      CO.contours(f, -7, 9, -5, 6, 140, 100, lv).forEach((c) => {
        const d = c.segs.map(([p, q]) => `M${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}L${X(q[0]).toFixed(1)} ${Y(q[1]).toFixed(1)}`).join('');
        Lab.svg('path', { d, stroke: pal.rule, fill: 'none' }, g);
      });
      Lab.svg('circle', { cx: X(2), cy: Y(1.2), r: 3, fill: pal.ink3 }, g); T(g, X(2) + 6, Y(1.2) - 6, 'unconstrained minimum', pal.ink3, 'start', 10.5);
      // constraint circle
      Lab.svg('circle', { cx: X(0), cy: Y(0), r: st.r * P.s, fill: 'none', stroke: pal.s1, 'stroke-width': 2.2 }, g);
      T(g, X(0), Y(-st.r) + 16, 'constraint x² + y² = r²', pal.ink2, 'middle');
      const arrow = (x, y, v, col, len) => {
        const n = Math.hypot(v[0], v[1]) || 1, ex = x + (v[0] / n) * len, ey = y + (v[1] / n) * len;
        Lab.svg('line', { x1: X(x), y1: Y(y), x2: X(ex), y2: Y(ey), stroke: col, 'stroke-width': 2, 'marker-end': `url(#lg-${col === pal.s2 ? 'a' : 'b'})` }, g);
      };
      const defs = Lab.svg('defs', {}, svg);
      [['a', pal.s2], ['b', pal.s1]].forEach(([id, col]) => { const mk = Lab.svg('marker', { id: 'lg-' + id, viewBox: '0 0 8 8', refX: 7, refY: 4, markerWidth: 7, markerHeight: 7, markerUnits: 'userSpaceOnUse', orient: 'auto' }, defs); Lab.svg('path', { d: 'M0 0L8 4L0 8z', fill: col }, mk); });
      // probe point
      const th = (st.th * Math.PI) / 180, px = st.r * Math.cos(th), py = st.r * Math.sin(th);
      arrow(px, py, gf(px, py).map((v) => -v), pal.s2, 0.9); arrow(px, py, [px, py], pal.s1, 0.9);
      Lab.svg('circle', { cx: X(px), cy: Y(py), r: 5, fill: pal.paper, stroke: pal.ink, 'stroke-width': 1.5 }, g);
      T(g, X(px) + 8, Y(py) + 14, 'probe', pal.ink2);
      // optimum
      const o = best(st.r), go = gf(o.x, o.y), nu = -(go[0] * 2 * o.x + go[1] * 2 * o.y) / (4 * st.r * st.r);
      arrow(o.x, o.y, go.map((v) => -v), pal.s2, 0.9); arrow(o.x, o.y, [o.x, o.y], pal.s1, 0.9);
      Lab.svg('circle', { cx: X(o.x), cy: Y(o.y), r: 6, fill: pal.s2 }, g);
      T(g, X(o.x) - 9, Y(o.y) + 18, 'constrained minimum', pal.ink, 'end');
      // legend
      Lab.svg('line', { x1: 8, x2: 22, y1: 12, y2: 12, stroke: pal.s2, 'stroke-width': 2 }, g); T(g, 26, 16, '−∇f, the downhill direction', pal.ink2, 'start', 10.5);
      Lab.svg('line', { x1: 8, x2: 22, y1: 28, y2: 28, stroke: pal.s1, 'stroke-width': 2 }, g); T(g, 26, 32, '∇h, normal to the constraint', pal.ink2, 'start', 10.5);
      // angle between -grad f and the normal at the probe
      const a = gf(px, py).map((v) => -v), cosang = (a[0] * px + a[1] * py) / (Math.hypot(...a) * Math.hypot(px, py));
      const h = 1e-4, dp = (best(st.r + h).v - best(st.r - h).v) / (2 * h);
      out.innerHTML = `<span>minimum <b>(${o.x.toFixed(2)}, ${o.y.toFixed(2)})</b>, f = <b>${o.v.toFixed(3)}</b></span><span>multiplier ν <b>${nu.toFixed(3)}</b></span><span>predicted df*/dr = −2rν <b>${(-2 * st.r * nu).toFixed(3)}</b></span><span>measured df*/dr <b>${dp.toFixed(3)}</b></span><span>angle at the probe <b>${((Math.acos(Math.max(-1, Math.min(1, Math.abs(cosang)))) * 180) / Math.PI).toFixed(0)}°</b></span>`;
    }
    Lab.slider(Lab.$('#lg-r', root), (v) => v.toFixed(2), (v) => { st.r = v; draw(); });
    Lab.slider(Lab.$('#lg-t', root), (v) => v + '°', (v) => { st.th = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();

  /* ---------- Fig 2.1 Gradient descent and momentum ---------- */
  (function () {
    const root = Lab.$('#fig-gd');
    if (!root) return;
    const [svgA, svgB] = Lab.$$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svgB.parentElement);
    const st = { kappa: 20, s: 1, m: 'gd' };
    let ready = false;
    const ROT = Math.PI / 6, c = Math.cos(ROT), sn = Math.sin(ROT);
    // f = 1/2 (u^2 + kappa v^2) in coordinates rotated by 30 degrees; L = kappa, mu = 1
    const run = (meth, kappa, s, iters = 200) => {
      const L = kappa, mu = 1;
      const grad = (x, y) => { const u = c * x + sn * y, v = -sn * x + c * y, gu = u, gv = kappa * v; return [c * gu - sn * gv, sn * gu + c * gv]; };
      const fv = (x, y) => { const u = c * x + sn * y, v = -sn * x + c * y; return 0.5 * (u * u + kappa * v * v); };
      let x = [-4, 2.6], prev = x.slice(); const pts = [x.slice()], err = [fv(...x)];
      const q = (Math.sqrt(kappa) - 1) / (Math.sqrt(kappa) + 1);
      for (let k = 0; k < iters; k++) {
        let nx;
        if (meth === 'gd') { const a = (s * 2) / (L + mu), g = grad(...x); nx = [x[0] - a * g[0], x[1] - a * g[1]]; }
        else if (meth === 'hb') { const a = (s * 4) / (Math.sqrt(L) + Math.sqrt(mu)) ** 2, b = q * q, g = grad(...x); nx = [x[0] - a * g[0] + b * (x[0] - prev[0]), x[1] - a * g[1] + b * (x[1] - prev[1])]; }
        else { const a = s / L, b = q, yv = [x[0] + b * (x[0] - prev[0]), x[1] + b * (x[1] - prev[1])], g = grad(...yv); nx = [yv[0] - a * g[0], yv[1] - a * g[1]]; }
        prev = x; x = nx; pts.push(x.slice()); err.push(fv(...x));
        if (!isFinite(err[err.length - 1]) || err[err.length - 1] > 1e8) break;
      }
      return { pts, err, fv };
    };
    function draw() {
      if (!ready) return;
      const R = run(st.m, st.kappa, st.s), P = CO.plane(svgA, [-5, 5], [-3.4, 3.4], 320, 12), { X, Y, g, pal } = P;
      const lv = [0.5, 2, 4.5, 8, 12.5, 18, 24.5].map((v) => v * Math.min(4, st.kappa / 5 + 0.2));
      CO.contours(R.fv, -5, 5, -3.4, 3.4, 90, 60, lv).forEach((cc) => Lab.svg('path', { d: cc.segs.map(([p, q]) => `M${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}L${X(q[0]).toFixed(1)} ${Y(q[1]).toFixed(1)}`).join(''), stroke: pal.rule, fill: 'none' }, g));
      const vis = R.pts.slice(0, 60).filter((p) => Math.abs(p[0]) < 8 && Math.abs(p[1]) < 8);
      Lab.svg('path', { d: CO.path(vis, X, Y), fill: 'none', stroke: pal.s2, 'stroke-width': 1.8 }, g);
      vis.forEach((p, i) => i < 30 && Lab.svg('circle', { cx: X(p[0]), cy: Y(p[1]), r: 2.4, fill: pal.s2 }, g));
      Lab.svg('circle', { cx: X(0), cy: Y(0), r: 4, fill: pal.ink }, g);
      T(g, 8, 16, 'first 60 steps', pal.ink2, 'start', 10.5);
      // convergence plot
      const f = CO.frame(svgB, { h: 320, m: { l: 52, r: 14, t: 30, b: 42 }, x: [0, 200], y: [1e-12, 1e4], ylog: true, xt: [0, 50, 100, 150, 200], yt: [1e-12, 1e-8, 1e-4, 1, 1e4], yf: (v) => Lab.fmt.sci(v).replace('10⁰', '1'), xl: 'iteration', yl: 'f(x) − f* (log scale)' });
      const meths = [['gd', 'gradient descent', f.pal.s1], ['hb', 'heavy ball', f.pal.s3], ['nest', 'Nesterov', f.pal.s2]];
      const curves = meths.map(([k, name, col]) => {
        const r = k === st.m ? R : run(k, st.kappa, st.s), pts = r.err.map((e, i) => [i, Math.max(1e-12, Math.min(1e4, e))]);
        Lab.svg('path', { d: CO.path(pts, f.X, f.Y), fill: 'none', stroke: col, 'stroke-width': k === st.m ? 2.4 : 1.2, 'stroke-opacity': k === st.m ? 1 : 0.6 }, f.g);
        const k12 = r.err.findIndex((e) => e < 1e-10);
        const lab = pts[Math.min(pts.length - 1, k12 > 0 ? k12 : 120)];
        T(f.g, Math.min(f.X(lab[0]) + 4, f.W - f.m.r - 90), f.Y(lab[1]) - 6 - 14 * meths.findIndex((mm) => mm[1] === name), name, f.pal.ink2, 'start', 10.5);
        return { name, r, hit: k12 };
      });
      CO.hover(svgB, f, 0, 200, (x, sx, sy, px) => { const i = Math.round(Math.max(0, x)); tip.show(px, f.m.t * sy + 40, `<b>step ${i}</b><br>${curves.map((c2) => `${c2.name}: ${c2.r.err[i] !== undefined ? Lab.fmt.sci(Math.max(1e-30, c2.r.err[i])) : 'diverged'}`).join('<br>')}`, f.m.t * sy + 60); }, () => tip.hide());
      const cur = curves.find((c2, i) => meths[i][0] === st.m), diverged = !isFinite(cur.r.err[cur.r.err.length - 1]) || cur.r.err[cur.r.err.length - 1] > 1e6;
      const rate = st.m === 'gd' ? (st.kappa - 1) / (st.kappa + 1) : (Math.sqrt(st.kappa) - 1) / (Math.sqrt(st.kappa) + 1);
      out.innerHTML = `<span>steps to reach 10⁻¹⁰ <b>${diverged ? 'diverges' : cur.hit > 0 ? cur.hit : '> 200'}</b></span><span>theory, error shrinks per step by <b>${(rate * rate).toFixed(3)}</b>${st.m === 'gd' ? ' ((κ−1)/(κ+1))²' : ' ≈ ((√κ−1)/(√κ+1))²'}</span>`;
    }
    Lab.slider(Lab.$('#gd-k', root), (v) => Math.round(Math.pow(10, v)) + '', (v) => { st.kappa = Math.round(Math.pow(10, v)); draw(); });
    Lab.slider(Lab.$('#gd-s', root), (v) => '×' + v.toFixed(2), (v) => { st.s = v; draw(); });
    Lab.$$('[data-gd]', root).forEach((b) => b.addEventListener('click', () => { st.m = b.dataset.gd; Lab.$$('[data-gd]', root).forEach((o) => o.setAttribute('aria-pressed', o === b ? 'true' : 'false')); draw(); }));
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svgA, draw);
  })();

  /* ---------- Fig 3.1 The simplex method on Wyndor Glass ---------- */
  (function () {
    const root = Lab.$('#fig-lp');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root), P = CO.WYNDOR, V = CO.vertices(P);
    const st = { ang: Math.atan2(5, 3) * 180 / Math.PI, step: 99 };
    let ready = false, timer = 0;
    function draw() {
      if (!ready) return;
      const th = (st.ang * Math.PI) / 180, c = [Math.cos(th), Math.sin(th)];
      const Pl = CO.plane(svg, [-0.8, 7.2], [-1.2, 8.4], 380, 26), { X, Y, g, pal } = Pl;
      // axes
      [[0, 0, 7, 0], [0, 0, 0, 8]].forEach(([a, b, cc, d]) => Lab.svg('line', { x1: X(a), y1: Y(b), x2: X(cc), y2: Y(d), stroke: pal.ink3 }, g));
      for (let i = 1; i <= 7; i++) T(g, X(i), Y(0) + 14, i, pal.ink3, 'middle', 10);
      for (let i = 2; i <= 8; i += 2) T(g, X(0) - 6, Y(i) + 4, i, pal.ink3, 'end', 10);
      T(g, X(7.1), Y(0) + 28, 'x: product 1 (batches/week)', pal.ink2, 'end', 10.5);
      T(g, X(0) + 6, Y(8.2), 'y: product 2', pal.ink2, 'start', 10.5);
      // feasible region
      Lab.svg('path', { d: V.map((v, i) => (i ? 'L' : 'M') + X(v.x) + ' ' + Y(v.y)).join('') + 'Z', fill: Lab.css('--accent-wash'), stroke: pal.ink2, 'stroke-width': 1.5 }, g);
      // constraint lines extended
      P.A.slice(0, 3).forEach((a, i) => {
        const b = P.b[i], pts = [];
        if (Math.abs(a[1]) < 1e-9) pts.push([b / a[0], -0.5], [b / a[0], 8.2]); else if (Math.abs(a[0]) < 1e-9) pts.push([-0.5, b / a[1]], [7, b / a[1]]); else pts.push([(b - a[1] * 8.2) / a[0], 8.2], [(b + a[1] * 0.5) / a[0], -0.5]);
        Lab.svg('line', { x1: X(pts[0][0]), y1: Y(pts[0][1]), x2: X(pts[1][0]), y2: Y(pts[1][1]), stroke: pal.rule, 'stroke-dasharray': '4 3' }, g);
      });
      T(g, X(4) + 4, Y(7.6), 'x ≤ 4', pal.ink3, 'start', 10); T(g, X(6.9), Y(6) - 5, '2y ≤ 12', pal.ink3, 'end', 10); T(g, X(5.1), Y(1.7), '3x + 2y ≤ 18', pal.ink3, 'start', 10);
      // objective level lines through each vertex on the path, and gradient arrow
      const start = V.findIndex((v) => Math.abs(v.x) < 1e-9 && Math.abs(v.y) < 1e-9), path = CO.simplexPath(V, c, start), shown = path.slice(0, Math.min(path.length, st.step + 1));
      const opt = V[path[path.length - 1]], val = (v) => c[0] * v.x + c[1] * v.y;
      const cp = Lab.svg('clipPath', { id: 'lp-clip' }, Lab.svg('defs', {}, svg)); Lab.svg('rect', { x: X(-0.5), y: Y(8.3), width: X(7.1) - X(-0.5), height: Y(-0.5) - Y(8.3) }, cp);
      const line = (k, col, dash) => { const d = [-c[1], c[0]], p0 = [k * c[0], k * c[1]]; Lab.svg('line', { x1: X(p0[0] - 12 * d[0]), y1: Y(p0[1] - 12 * d[1]), x2: X(p0[0] + 12 * d[0]), y2: Y(p0[1] + 12 * d[1]), stroke: col, 'stroke-width': 1.4, 'stroke-dasharray': dash, 'clip-path': 'url(#lp-clip)' }, g); };
      line(val(V[shown[shown.length - 1]]), pal.s2, '6 4');
      Lab.svg('path', { d: shown.map((k, i) => (i ? 'L' : 'M') + X(V[k].x) + ' ' + Y(V[k].y)).join(''), fill: 'none', stroke: pal.s1, 'stroke-width': 3 }, g);
      V.forEach((v, k) => Lab.svg('circle', { cx: X(v.x), cy: Y(v.y), r: shown.includes(k) ? 6 : 4, fill: shown.includes(k) ? pal.s1 : pal.paper, stroke: pal.s1, 'stroke-width': 1.5 }, g));
      V.forEach((v) => T(g, X(v.x) + 8, Y(v.y) - 8, `(${+v.x.toFixed(2)}, ${+v.y.toFixed(2)})`, pal.ink2, 'start', 10));
      // objective direction arrow
      const ax = 5.6, ay = 7.3, defs = Lab.svg('defs', {}, svg), mk = Lab.svg('marker', { id: 'lp-ar', viewBox: '0 0 8 8', refX: 7, refY: 4, markerWidth: 7, markerHeight: 7, markerUnits: 'userSpaceOnUse', orient: 'auto' }, defs);
      Lab.svg('path', { d: 'M0 0L8 4L0 8z', fill: pal.s2 }, mk);
      Lab.svg('line', { x1: X(ax), y1: Y(ay), x2: X(ax + c[0] * 0.9), y2: Y(ay + c[1] * 0.9), stroke: pal.s2, 'stroke-width': 2, 'marker-end': 'url(#lp-ar)' }, g);
      T(g, X(ax) - 4, Y(ay) + 14, 'better', pal.ink2, 'end', 10.5);
      const done = shown.length === path.length;
      // the actual Wyndor profit uses c = (3, 5); scale the shown objective so the default angle reports dollars in thousands
      const scale = Math.hypot(3, 5), profit = (v) => scale * val(v);
      out.innerHTML = `<span>simplex pivots <b>${shown.length - 1}${done ? '' : '…'}</b></span><span>best corner <b>(${+opt.x.toFixed(2)}, ${+opt.y.toFixed(2)})</b></span><span>objective there <b>${profit(opt).toFixed(1)}</b>${Math.abs(st.ang - Math.atan2(5, 3) * 180 / Math.PI) < 0.6 ? ' (Wyndor profit, $1000s/week)' : ''}</span>`;
    }
    const animate = () => {
      clearInterval(timer); st.step = 0; draw();
      if (Lab.reducedMotion) { st.step = 99; draw(); return; }
      timer = setInterval(() => { st.step++; draw(); if (st.step >= 6) clearInterval(timer); }, 700);
    };
    Lab.slider(Lab.$('#lp-a', root), (v) => v.toFixed(0) + '°', (v) => { st.ang = v; st.step = 99; draw(); });
    Lab.$('#lp-go', root).addEventListener('click', animate);
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();

  /* ---------- Fig 4.1 Local is global ---------- */
  (function () {
    const root = Lab.$('#fig-local');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    const st = { s: 0.3, a: -4, b: 3 };
    let ready = false;
    const f = (x) => 0.15 * x * x + st.s * Math.cos(2.5 * x), df = (x) => 0.3 * x - 2.5 * st.s * Math.sin(2.5 * x), d2 = (x) => 0.3 - 6.25 * st.s * Math.cos(2.5 * x);
    function draw() {
      if (!ready) return;
      const ys = []; for (let x = -6; x <= 6; x += 0.02) ys.push(f(x));
      const fr = CO.frame(svg, { h: 330, m: { l: 40, r: 14, t: 30, b: 42 }, x: [-6, 6], y: [Math.min(...ys) - 0.4, Math.max(...ys) + 0.2], xt: [-6, -4, -2, 0, 2, 4, 6], yt: [], xl: 'x', yl: 'f(x) = 0.15x² + s·cos(2.5x)' });
      const pts = []; for (let x = -6; x <= 6.001; x += 0.02) pts.push([x, f(x)]);
      // chord test: shade where the chord lies below the function
      const A = [st.a, f(st.a)], B = [st.b, f(st.b)], viol = [];
      for (let t = 0; t <= 1.0001; t += 0.005) { const x = A[0] + t * (B[0] - A[0]), ch = A[1] + t * (B[1] - A[1]); if (ch < f(x) - 1e-9) viol.push(x); }
      viol.forEach((x) => Lab.svg('line', { x1: fr.X(x), x2: fr.X(x), y1: fr.Y(f(x)), y2: fr.Y(A[1] + ((x - A[0]) / (B[0] - A[0])) * (B[1] - A[1])), stroke: fr.pal.s2, 'stroke-opacity': 0.35, 'stroke-width': 2 }, fr.g));
      Lab.svg('path', { d: CO.path(pts, fr.X, fr.Y), fill: 'none', stroke: fr.pal.ink, 'stroke-width': 2 }, fr.g);
      Lab.svg('line', { x1: fr.X(A[0]), y1: fr.Y(A[1]), x2: fr.X(B[0]), y2: fr.Y(B[1]), stroke: fr.pal.s2, 'stroke-width': 1.6 }, fr.g);
      [A, B].forEach((p) => Lab.svg('circle', { cx: fr.X(p[0]), cy: fr.Y(p[1]), r: 4, fill: fr.pal.s2 }, fr.g));
      // 40 gradient-descent runs from evenly spaced starts
      const ends = [];
      for (let k = 0; k < 40; k++) {
        let x = -5.8 + (11.6 * k) / 39; for (let it = 0; it < 4000; it++) x -= 0.05 * df(x);
        ends.push(x);
      }
      const mins = []; ends.forEach((x) => { const m = mins.find((q) => Math.abs(q.x - x) < 0.05); if (m) m.n++; else mins.push({ x, n: 1 }); });
      const glob = mins.reduce((a, b) => (f(b.x) < f(a.x) ? b : a));
      mins.forEach((m) => {
        Lab.svg('circle', { cx: fr.X(m.x), cy: fr.Y(f(m.x)), r: 4 + Math.sqrt(m.n) * 1.6, fill: m === glob ? fr.pal.s1 : fr.pal.s3, 'fill-opacity': 0.8 }, fr.g);
        T(fr.g, fr.X(m.x), fr.Y(f(m.x)) + 22, m.n, fr.pal.ink2, 'middle', 10.5);
      });
      CO.hover(svg, fr, -6, 6, (x, sx, sy, px) => tip.show(px, fr.Y(f(x)) * sy - 10, `<b>x = ${x.toFixed(2)}</b><br>f = ${f(x).toFixed(3)}<br>curvature f″ = ${d2(x).toFixed(2)}`, fr.Y(f(x)) * sy + 12), () => tip.hide());
      let minc = Infinity; for (let x = -6; x <= 6; x += 0.01) minc = Math.min(minc, d2(x));
      out.innerHTML = `<span>convex <b>${minc >= -1e-9 ? 'yes' : 'no'}</b> (smallest f″ = ${minc.toFixed(2)})</span><span>distinct minima found <b>${mins.length}</b></span><span>runs reaching the global minimum <b>${glob.n} of 40</b></span><span>chord below the curve <b>${viol.length ? 'yes' : 'never'}</b></span>`;
    }
    Lab.slider(Lab.$('#lc-s', root), (v) => v.toFixed(3), (v) => { st.s = v; draw(); });
    Lab.slider(Lab.$('#lc-a', root), (v) => v.toFixed(1), (v) => { st.a = v; draw(); });
    Lab.slider(Lab.$('#lc-b', root), (v) => v.toFixed(1), (v) => { st.b = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();
})();
