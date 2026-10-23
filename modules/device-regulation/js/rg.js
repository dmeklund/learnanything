/* Volume X shared core: binomial confidence intervals, predictive values, a Poisson CUSUM, and chart helpers.
   Exposed as window.RG. */
(function () {
  const RG = {};

  /* ---------- Statistics ---------- */
  // Wilson score interval for x successes in n trials (z = 1.96 for 95%)
  RG.wilson = (x, n, z = 1.959964) => {
    if (!n) return [0, 1];
    const p = x / n, d = 1 + (z * z) / n, c = p + (z * z) / (2 * n), h = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
    return [(c - h) / d, (c + h) / d];
  };
  // Smallest number of positive samples for which the Wilson lower bound, at the expected observed rate, clears the target
  RG.sampleSize = (pExp, target, nMax = 20000) => {
    for (let n = 5; n <= nMax; n++) { const x = Math.round(pExp * n); if (RG.wilson(x, n)[0] >= target) return n; }
    return null;
  };
  RG.ppv = (se, sp, prev) => (se * prev) / (se * prev + (1 - sp) * (1 - prev));
  RG.npv = (se, sp, prev) => (sp * (1 - prev)) / (sp * (1 - prev) + (1 - se) * prev);
  // Poisson random numbers (Knuth for small means, normal approximation above 30)
  RG.poisson = (lam, r) => {
    if (lam > 30) return Math.max(0, Math.round(lam + Math.sqrt(lam) * Lab.gauss(r)));
    const L = Math.exp(-lam); let k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1;
  };
  // One-sided Poisson CUSUM (Lucas 1985) for a shift from mean m0 to m1: S = max(0, S + x - k), k = (m1 - m0) / ln(m1 / m0)
  RG.cusum = (xs, m0, m1, h) => {
    const k = (m1 - m0) / Math.log(m1 / m0); let s = 0, alarm = -1; const S = [];
    xs.forEach((x, i) => { s = Math.max(0, s + x - k); S.push(s); if (alarm < 0 && s > h) alarm = i; });
    return { S, alarm, k };
  };

  /* ---------- Chart helpers (same contract as earlier volumes) ---------- */
  RG.frame = (svg, o) => {
    const W = Math.max(280, svg.clientWidth || svg.parentElement.clientWidth || 600), H = o.h;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H); svg.innerHTML = '';
    const m = o.m, pal = Lab.palette();
    const X = (o.xlog ? Lab.logScale : Lab.scale)(o.x[0], o.x[1], m.l, W - m.r), Y = (o.ylog ? Lab.logScale : Lab.scale)(o.y[0], o.y[1], H - m.b, m.t);
    const g = Lab.svg('g', {}, svg);
    (o.yt || []).forEach((v) => { Lab.svg('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), stroke: pal.grid }, g); const t = Lab.svg('text', { x: m.l - 6, y: Y(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: pal.ink3 }, g); t.textContent = o.yf ? o.yf(v) : v; });
    (o.xt || []).forEach((v) => { Lab.svg('line', { x1: X(v), x2: X(v), y1: m.t, y2: H - m.b, stroke: pal.grid }, g); const t = Lab.svg('text', { x: X(v), y: H - m.b + 16, 'text-anchor': 'middle', 'font-size': 11, fill: pal.ink3 }, g); t.textContent = o.xf ? o.xf(v) : v; });
    Lab.svg('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, stroke: pal.ink3 }, g);
    if (o.xl) { const t = Lab.svg('text', { x: W - m.r, y: H - m.b + 32, 'text-anchor': 'end', 'font-size': 11, fill: pal.ink2 }, g); t.textContent = o.xl; }
    if (o.yl) { const t = Lab.svg('text', { x: m.l, y: m.t - 10, 'font-size': 11, fill: pal.ink2 }, g); t.textContent = o.yl; }
    return { W, H, X, Y, g, pal, m };
  };
  RG.path = (pts, X, Y) => pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join('');
  RG.text = (g, x, y, s, fill, anchor = 'start', size = 11) => { const t = Lab.svg('text', { x, y, 'font-size': size, fill, 'text-anchor': anchor }, g); t.textContent = s; return t; };
  RG.hover = (svg, f, x0, x1, onMove, onLeave) => {
    const hit = Lab.svg('rect', { x: f.m.l, y: f.m.t, width: f.W - f.m.l - f.m.r, height: f.H - f.m.t - f.m.b, fill: 'transparent' }, svg);
    hit.addEventListener('mousemove', (e) => { const r = svg.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * f.W, t = (px - f.m.l) / (f.W - f.m.l - f.m.r); onMove(x0 + t * (x1 - x0), r.width / f.W, r.height / f.H, e.clientX - r.left, e.clientY - r.top); });
    hit.addEventListener('mouseleave', onLeave);
  };

  if (typeof window !== 'undefined') window.RG = RG;
  if (typeof module !== 'undefined') module.exports = RG;
})();
