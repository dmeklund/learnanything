/* Volume XI shared core: an RK4 integrator, binding and selection helpers, and chart helpers. Exposed as window.IM. */
(function () {
  const IM = {};
  // Fourth-order Runge-Kutta for dy/dt = f(t, y), y an array; returns samples every `every` steps
  IM.rk4 = (f, y0, t0, t1, n, every = 1) => {
    const h = (t1 - t0) / n, out = [[t0, ...y0]]; let y = y0.slice(), t = t0;
    for (let i = 0; i < n; i++) {
      const k1 = f(t, y), k2 = f(t + h / 2, y.map((v, j) => v + (h / 2) * k1[j])), k3 = f(t + h / 2, y.map((v, j) => v + (h / 2) * k2[j])), k4 = f(t + h, y.map((v, j) => v + h * k3[j]));
      y = y.map((v, j) => Math.max(0, v + (h / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]))); t += h;
      if ((i + 1) % every === 0) out.push([t, ...y]);
    }
    return out;
  };
  IM.sup = (n) => String(n).replace(/[0-9-]/g, (c) => '\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079'['0123456789'.indexOf(c)] || '\u207b');
  IM.sci = (v) => { const e = Math.floor(Math.log10(v)), m = v / 10 ** e; return (m.toFixed(1) === '1.0' ? '' : m.toFixed(1) + '\u00d7') + '10' + IM.sup(e); };
  /* ---------- Chart helpers (same contract as earlier volumes) ---------- */
  IM.frame = (svg, o) => {
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
  IM.path = (pts, X, Y) => pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join('');
  IM.text = (g, x, y, s, fill, anchor = 'start', size = 11) => { const t = Lab.svg('text', { x, y, 'font-size': size, fill, 'text-anchor': anchor }, g); t.textContent = s; return t; };
  IM.hover = (svg, f, x0, x1, onMove, onLeave) => {
    const hit = Lab.svg('rect', { x: f.m.l, y: f.m.t, width: f.W - f.m.l - f.m.r, height: f.H - f.m.t - f.m.b, fill: 'transparent' }, svg);
    hit.addEventListener('mousemove', (e) => { const r = svg.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * f.W, t = (px - f.m.l) / (f.W - f.m.l - f.m.r); onMove(x0 + t * (x1 - x0), r.width / f.W, r.height / f.H, e.clientX - r.left, e.clientY - r.top); });
    hit.addEventListener('mouseleave', onLeave);
  };
  if (typeof window !== 'undefined') window.IM = IM;
  if (typeof module !== 'undefined') module.exports = IM;
})();
