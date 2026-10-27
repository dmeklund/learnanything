/* Volume XIV shared core: numeric helpers and chart primitives. Exposed as window.QD. */
(function () {
  const QD = {};
  // Poisson variate: Knuth's method for small means, a normal approximation for large ones
  QD.poisson = (r, mu) => {
    if (mu <= 0) return 0;
    if (mu > 40) return Math.max(0, Math.round(mu + Math.sqrt(mu) * Lab.gauss(r)));
    const L = Math.exp(-mu); let k = 0, p = 1;
    do { k++; p *= r(); } while (p > L);
    return k - 1;
  };
  // Log-normal variate with median m and coefficient of variation cv (approximately, for small cv)
  QD.lognorm = (r, m, cv) => m * Math.exp(Math.sqrt(Math.log(1 + cv * cv)) * Lab.gauss(r));
  // arcsinh scale: linear near zero, logarithmic far from it, so negative compensated values can be shown
  QD.asinhScale = (d0, d1, r0, r1, c) => { const f = (v) => Math.asinh(v / c), a = f(d0), b = f(d1); const s = (v) => r0 + ((f(v) - a) / (b - a)) * (r1 - r0); s.inv = (p) => c * Math.sinh(a + ((p - r0) / (r1 - r0)) * (b - a)); return s; };
  QD.sup = (n) => String(n).replace(/[0-9-]/g, (c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'['0123456789'.indexOf(c)] || '⁻');
  QD.sci = (v) => { if (v === 0) return '0'; const e = Math.floor(Math.log10(Math.abs(v))), m = v / 10 ** e; return (m.toFixed(1) === '1.0' ? '' : m.toFixed(1) + '×') + '10' + QD.sup(e); };
  QD.num = (v) => (Math.abs(v) >= 1e6 ? QD.sci(v) : Math.round(v).toLocaleString('en-US'));
  /* ---------- Chart helpers (same contract as earlier volumes) ---------- */
  QD.frame = (svg, o) => {
    const W = Math.max(280, svg.clientWidth || svg.parentElement.clientWidth || 600), H = o.h;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H); svg.innerHTML = '';
    const m = o.m, pal = Lab.palette();
    const mk = (kind, d0, d1, r0, r1) => (kind === 'log' ? Lab.logScale(d0, d1, r0, r1) : kind === 'asinh' ? QD.asinhScale(d0, d1, r0, r1, o.c || 100) : Lab.scale(d0, d1, r0, r1));
    const X = mk(o.xlog ? 'log' : o.xasinh ? 'asinh' : 'lin', o.x[0], o.x[1], m.l, W - m.r), Y = mk(o.ylog ? 'log' : o.yasinh ? 'asinh' : 'lin', o.y[0], o.y[1], H - m.b, m.t);
    const g = Lab.svg('g', {}, svg);
    (o.yt || []).forEach((v) => { Lab.svg('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), stroke: pal.grid }, g); const t = Lab.svg('text', { x: m.l - 6, y: Y(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: pal.ink3 }, g); t.textContent = o.yf ? o.yf(v) : v; });
    (o.xt || []).forEach((v) => { Lab.svg('line', { x1: X(v), x2: X(v), y1: m.t, y2: H - m.b, stroke: pal.grid }, g); const t = Lab.svg('text', { x: X(v), y: H - m.b + 16, 'text-anchor': 'middle', 'font-size': 11, fill: pal.ink3 }, g); t.textContent = o.xf ? o.xf(v) : v; });
    Lab.svg('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, stroke: pal.ink3 }, g);
    if (o.xl) { const t = Lab.svg('text', { x: W - m.r, y: H - m.b + 32, 'text-anchor': 'end', 'font-size': 11, fill: pal.ink2 }, g); t.textContent = o.xl; }
    if (o.yl) { const t = Lab.svg('text', { x: m.l, y: m.t - 10, 'font-size': 11, fill: pal.ink2 }, g); t.textContent = o.yl; }
    return { W, H, X, Y, g, pal, m };
  };
  QD.path = (pts, X, Y) => pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join('');
  QD.text = (g, x, y, s, fill, anchor = 'start', size = 11) => { const t = Lab.svg('text', { x, y, 'font-size': size, fill, 'text-anchor': anchor }, g); t.textContent = s; return t; };
  // transparent hit area over the plot; onMove gets the data x, the svg-to-pixel scale factors, and the pointer position in pixels
  QD.hover = (svg, f, x0, x1, onMove, onLeave, xlog) => {
    const hit = Lab.svg('rect', { x: f.m.l, y: f.m.t, width: f.W - f.m.l - f.m.r, height: f.H - f.m.t - f.m.b, fill: 'transparent' }, svg);
    hit.addEventListener('mousemove', (e) => { const r = svg.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * f.W, t = (px - f.m.l) / (f.W - f.m.l - f.m.r); const x = xlog ? Math.pow(10, Math.log10(x0) + t * (Math.log10(x1) - Math.log10(x0))) : x0 + t * (x1 - x0); onMove(x, r.width / f.W, r.height / f.H, e.clientX - r.left, e.clientY - r.top); });
    hit.addEventListener('mouseleave', onLeave);
  };
  // a dense dot plot drawn into a canvas laid over an SVG frame of the same size (the canvas ignores the pointer)
  QD.dots = (cv, W, H) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    return { ctx, plot: (list, X, Y, col, a, r) => { ctx.fillStyle = Lab.rgbStr(col, a); list.forEach((p) => ctx.fillRect(X(p[0]) - r / 2, Y(p[1]) - r / 2, r, r)); } };
  };
  /* ---------- Physical constants used across this volume (SI, eV, MHz) ---------- */
  QD.K = {
    hbar: 1.054571817e-34, c: 2.99792458e8, kB: 1.380649e-23, e: 1.602176634e-19,
    alpha: 7.2973525643e-3, alphaInvRb: 137.035999206, alphaInvCs: 137.035999046,
    mec2: 510998.95, mmuc2: 105.6583755e6, mtauc2: 1776.86e6, Ry: 13.605693122,
    re: 2.8179403262e-15, eV2MHz: 2.417989242e8, barn: 1e-28,
    mmu: 1.883531627e-28, taumu: 2.1969811e-6,
  };
  if (typeof window !== 'undefined') { window.QD = QD; window.QEDC = QD.K; }
  if (typeof module !== 'undefined') module.exports = QD;
})();
