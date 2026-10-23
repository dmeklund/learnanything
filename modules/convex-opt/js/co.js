/* Volume VIII shared core: small solvers for two-dimensional linear programs (vertices, simplex walk,
   log-barrier central path), projections onto the simplex and the l1 ball, lasso by coordinate descent,
   contour tracing, and the chart frame. Exposed as window.CO. */
(function () {
  const CO = {};

  /* ---------- Two-variable linear programs: constraints a·x <= b ---------- */
  // Wyndor Glass Co. (Hillier & Lieberman): maximize 3x + 5y subject to x <= 4, 2y <= 12, 3x + 2y <= 18, x, y >= 0
  CO.WYNDOR = { A: [[1, 0], [0, 2], [3, 2], [-1, 0], [0, -1]], b: [4, 12, 18, 0, 0], names: ['Plant 1 hours', 'Plant 2 hours', 'Plant 3 hours', 'x ≥ 0', 'y ≥ 0'] };
  // Vertices of the feasible polygon in counterclockwise order, each with the two constraints that meet there
  CO.vertices = (P) => {
    const { A, b } = P, V = [];
    for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) {
      const det = A[i][0] * A[j][1] - A[i][1] * A[j][0];
      if (Math.abs(det) < 1e-12) continue;
      const x = (b[i] * A[j][1] - A[i][1] * b[j]) / det, y = (A[i][0] * b[j] - b[i] * A[j][0]) / det;
      if (A.every((a, k) => a[0] * x + a[1] * y <= b[k] + 1e-9)) V.push({ x, y, act: [i, j] });
    }
    const cx = V.reduce((s, v) => s + v.x, 0) / V.length, cy = V.reduce((s, v) => s + v.y, 0) / V.length;
    V.sort((p, q) => Math.atan2(p.y - cy, p.x - cx) - Math.atan2(q.y - cy, q.x - cx));
    return V;
  };
  // Simplex walk for "maximize c·x": start at a vertex, move to the better neighbor with the largest gain
  CO.simplexPath = (V, c, start = 0) => {
    const val = (v) => c[0] * v.x + c[1] * v.y, n = V.length, path = [start];
    let k = start;
    for (let it = 0; it < n; it++) {
      const nb = [(k + 1) % n, (k + n - 1) % n].filter((j) => val(V[j]) > val(V[k]) + 1e-9);
      if (!nb.length) break;
      k = nb.reduce((a, j) => (val(V[j]) > val(V[a]) ? j : a));
      path.push(k);
    }
    return path;
  };
  // Point on the central path: minimize t*(-c·x) - sum log(b - a·x) by damped Newton from x0
  CO.barrierPoint = (P, c, t, x0) => {
    let x = x0.slice(), steps = 0;
    const F = (z) => { let s = -t * (c[0] * z[0] + c[1] * z[1]); for (let i = 0; i < P.A.length; i++) { const r = P.b[i] - P.A[i][0] * z[0] - P.A[i][1] * z[1]; if (r <= 0) return Infinity; s -= Math.log(r); } return s; };
    for (let it = 0; it < 80; it++) {
      let g0 = -t * c[0], g1 = -t * c[1], h00 = 0, h01 = 0, h11 = 0;
      for (let i = 0; i < P.A.length; i++) { const a = P.A[i], r = P.b[i] - a[0] * x[0] - a[1] * x[1]; g0 += a[0] / r; g1 += a[1] / r; h00 += (a[0] * a[0]) / (r * r); h01 += (a[0] * a[1]) / (r * r); h11 += (a[1] * a[1]) / (r * r); }
      const det = h00 * h11 - h01 * h01, dx = -(h11 * g0 - h01 * g1) / det, dy = -(-h01 * g0 + h00 * g1) / det;
      const dec = -(g0 * dx + g1 * dy); // Newton decrement squared
      if (dec / 2 < 1e-10) break;
      let s = 1; const f0 = F(x);
      while (F([x[0] + s * dx, x[1] + s * dy]) > f0 - 0.25 * s * dec && s > 1e-10) s *= 0.5;
      x = [x[0] + s * dx, x[1] + s * dy]; steps++;
    }
    return { x, steps };
  };
  CO.analyticCenter = (P) => CO.barrierPoint(P, [0, 0], 0, [0.5, 0.5]).x;

  /* ---------- Projections ---------- */
  // Euclidean projection onto the probability simplex {w >= 0, sum w = 1} (Held et al.; Duchi et al. 2008)
  CO.projSimplex = (v) => {
    const u = v.slice().sort((a, b) => b - a); let css = 0, rho = 0, th = 0;
    for (let i = 0; i < u.length; i++) { css += u[i]; const t = (css - 1) / (i + 1); if (u[i] - t > 0) { rho = i; th = t; } }
    return v.map((x) => Math.max(0, x - th));
  };
  // Projection onto the l1 ball of radius r
  CO.projL1 = (v, r) => {
    if (v.reduce((s, x) => s + Math.abs(x), 0) <= r) return v.slice();
    const a = CO.projSimplex(v.map((x) => Math.abs(x) / r)).map((x) => x * r);
    return v.map((x, i) => Math.sign(x) * a[i]);
  };
  CO.projL2 = (v, r) => { const n = Math.hypot(...v); return n <= r ? v.slice() : v.map((x) => (x * r) / n); };

  /* ---------- Lasso by cyclic coordinate descent (Friedman, Hastie & Tibshirani 2007) ----------
     minimize (1/2n)||y - X b||^2 + lambda ||b||_1, warm-started from b0 */
  CO.lasso = (X, y, lam, b0) => {
    const n = X.length, p = X[0].length, b = b0 ? b0.slice() : new Array(p).fill(0);
    const r = y.map((yi, i) => yi - X[i].reduce((s, x, j) => s + x * b[j], 0));
    const nrm = Array.from({ length: p }, (_, j) => X.reduce((s, row) => s + row[j] * row[j], 0) / n);
    for (let sweep = 0; sweep < 500; sweep++) {
      let dmax = 0;
      for (let j = 0; j < p; j++) {
        let rho = 0; for (let i = 0; i < n; i++) rho += X[i][j] * (r[i] + X[i][j] * b[j]);
        rho /= n;
        const nb = Math.sign(rho) * Math.max(0, Math.abs(rho) - lam) / nrm[j], d = nb - b[j];
        if (d !== 0) { for (let i = 0; i < n; i++) r[i] -= X[i][j] * d; b[j] = nb; dmax = Math.max(dmax, Math.abs(d)); }
      }
      if (dmax < 1e-9) break;
    }
    return b;
  };

  /* ---------- Contours (marching squares over a sampled function) ---------- */
  CO.contours = (f, x0, x1, y0, y1, nx, ny, levels) => {
    const G = new Float64Array((nx + 1) * (ny + 1));
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) G[j * (nx + 1) + i] = f(x0 + ((x1 - x0) * i) / nx, y0 + ((y1 - y0) * j) / ny);
    const T = { 1: [[0, 3]], 2: [[0, 1]], 3: [[1, 3]], 4: [[1, 2]], 5: [[0, 1], [2, 3]], 6: [[0, 2]], 7: [[2, 3]], 8: [[2, 3]], 9: [[0, 2]], 10: [[0, 3], [1, 2]], 11: [[1, 2]], 12: [[1, 3]], 13: [[0, 1]], 14: [[0, 3]] };
    return levels.map((lv) => {
      const segs = [];
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const a = G[j * (nx + 1) + i], b = G[j * (nx + 1) + i + 1], c = G[(j + 1) * (nx + 1) + i + 1], d = G[(j + 1) * (nx + 1) + i];
        if (![a, b, c, d].every(isFinite)) continue;
        const idx = (a >= lv ? 1 : 0) | (b >= lv ? 2 : 0) | (c >= lv ? 4 : 0) | (d >= lv ? 8 : 0);
        if (!idx || idx === 15) continue;
        const L = (p, q) => (lv - p) / (q - p), X = (u) => x0 + ((x1 - x0) * u) / nx, Y = (v) => y0 + ((y1 - y0) * v) / ny;
        const e = [[X(i + L(a, b)), Y(j)], [X(i + 1), Y(j + L(b, c))], [X(i + L(d, c)), Y(j + 1)], [X(i), Y(j + L(a, d))]];
        T[idx].forEach(([p, q]) => segs.push([e[p], e[q]]));
      }
      return { level: lv, segs };
    });
  };

  /* ---------- SVG chart frame (same contract as Volumes VI and VII) ---------- */
  CO.frame = (svg, o) => {
    const W = Math.max(280, svg.clientWidth || svg.parentElement.clientWidth || 600), H = o.h;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H);
    svg.innerHTML = '';
    const m = o.m, pal = Lab.palette();
    const X = (o.xlog ? Lab.logScale : Lab.scale)(o.x[0], o.x[1], m.l, W - m.r);
    const Y = (o.ylog ? Lab.logScale : Lab.scale)(o.y[0], o.y[1], H - m.b, m.t);
    const g = Lab.svg('g', {}, svg);
    (o.yt || []).forEach((v) => {
      Lab.svg('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), stroke: pal.grid }, g);
      const t = Lab.svg('text', { x: m.l - 6, y: Y(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: pal.ink3 }, g); t.textContent = o.yf ? o.yf(v) : v;
    });
    (o.xt || []).forEach((v) => {
      Lab.svg('line', { x1: X(v), x2: X(v), y1: m.t, y2: H - m.b, stroke: pal.grid }, g);
      const t = Lab.svg('text', { x: X(v), y: H - m.b + 16, 'text-anchor': 'middle', 'font-size': 11, fill: pal.ink3 }, g); t.textContent = o.xf ? o.xf(v) : v;
    });
    Lab.svg('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, stroke: pal.ink3 }, g);
    if (o.xl) { const t = Lab.svg('text', { x: W - m.r, y: H - m.b + 32, 'text-anchor': 'end', 'font-size': 11, fill: pal.ink2 }, g); t.textContent = o.xl; }
    if (o.yl) { const t = Lab.svg('text', { x: m.l, y: m.t - 10, 'font-size': 11, fill: pal.ink2 }, g); t.textContent = o.yl; }
    return { W, H, X, Y, g, pal, m };
  };
  CO.path = (pts, X, Y) => pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join('');
  CO.text = (g, x, y, s, fill, anchor = 'start', size = 11) => { const t = Lab.svg('text', { x, y, 'font-size': size, fill, 'text-anchor': anchor }, g); t.textContent = s; return t; };
  CO.hover = (svg, f, x0, x1, onMove, onLeave) => {
    const hit = Lab.svg('rect', { x: f.m.l, y: f.m.t, width: f.W - f.m.l - f.m.r, height: f.H - f.m.t - f.m.b, fill: 'transparent' }, svg);
    hit.addEventListener('mousemove', (e) => {
      const r = svg.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * f.W, t = (px - f.m.l) / (f.W - f.m.l - f.m.r);
      onMove(x0 + t * (x1 - x0), r.width / f.W, r.height / f.H, e.clientX - r.left, e.clientY - r.top);
    });
    hit.addEventListener('mouseleave', onLeave);
  };
  // A square-ish plotting box in an SVG for 2-D geometry: returns data->pixel maps with equal scales
  CO.plane = (svg, xr, yr, H, pad = 36) => {
    const W = Math.max(260, svg.clientWidth || svg.parentElement.clientWidth || 400);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H); svg.innerHTML = '';
    const sx = (W - 2 * pad) / (xr[1] - xr[0]), sy = (H - 2 * pad) / (yr[1] - yr[0]), s = Math.min(sx, sy);
    const ox = (W - s * (xr[1] - xr[0])) / 2, oy = (H - s * (yr[1] - yr[0])) / 2;
    return { W, H, s, X: (x) => ox + (x - xr[0]) * s, Y: (y) => H - oy - (y - yr[0]) * s, g: Lab.svg('g', {}, svg), pal: Lab.palette(), inv: (px, py) => [xr[0] + (px - ox) / s, yr[0] + (H - oy - py) / s] };
  };

  if (typeof window !== 'undefined') window.CO = CO;
  if (typeof module !== 'undefined') module.exports = CO;
})();
