/* Volume XIII shared core: random variates and chart helpers. Exposed as window.OG. */
(function () {
  const OG = {};
  // Poisson variate: Knuth's method for small means, a normal approximation for large ones
  OG.poisson = (r, mu) => {
    if (mu <= 0) return 0;
    if (mu > 40) return Math.max(0, Math.round(mu + Math.sqrt(mu) * Lab.gauss(r)));
    const L = Math.exp(-mu); let k = 0, p = 1;
    do { k++; p *= r(); } while (p > L);
    return k - 1;
  };
  // Log-normal variate with median m and coefficient of variation cv (approximately, for small cv)
  OG.lognorm = (r, m, cv) => m * Math.exp(Math.sqrt(Math.log(1 + cv * cv)) * Lab.gauss(r));
  // arcsinh scale: linear near zero, logarithmic far from it, so negative compensated values can be shown
  OG.asinhScale = (d0, d1, r0, r1, c) => { const f = (v) => Math.asinh(v / c), a = f(d0), b = f(d1); const s = (v) => r0 + ((f(v) - a) / (b - a)) * (r1 - r0); s.inv = (p) => c * Math.sinh(a + ((p - r0) / (r1 - r0)) * (b - a)); return s; };
  OG.sup = (n) => String(n).replace(/[0-9-]/g, (c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'['0123456789'.indexOf(c)] || '⁻');
  OG.sci = (v) => { if (v === 0) return '0'; const e = Math.floor(Math.log10(Math.abs(v))), m = v / 10 ** e; return (m.toFixed(1) === '1.0' ? '' : m.toFixed(1) + '×') + '10' + OG.sup(e); };
  OG.num = (v) => (Math.abs(v) >= 1e6 ? OG.sci(v) : Math.round(v).toLocaleString('en-US'));
  /* ---------- Chart helpers (same contract as earlier volumes) ---------- */
  OG.frame = (svg, o) => {
    const W = Math.max(280, svg.clientWidth || svg.parentElement.clientWidth || 600), H = o.h;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H); svg.innerHTML = '';
    const m = o.m, pal = Lab.palette();
    const mk = (kind, d0, d1, r0, r1) => (kind === 'log' ? Lab.logScale(d0, d1, r0, r1) : kind === 'asinh' ? OG.asinhScale(d0, d1, r0, r1, o.c || 100) : Lab.scale(d0, d1, r0, r1));
    const X = mk(o.xlog ? 'log' : o.xasinh ? 'asinh' : 'lin', o.x[0], o.x[1], m.l, W - m.r), Y = mk(o.ylog ? 'log' : o.yasinh ? 'asinh' : 'lin', o.y[0], o.y[1], H - m.b, m.t);
    const g = Lab.svg('g', {}, svg);
    (o.yt || []).forEach((v) => { Lab.svg('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), stroke: pal.grid }, g); const t = Lab.svg('text', { x: m.l - 6, y: Y(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: pal.ink3 }, g); t.textContent = o.yf ? o.yf(v) : v; });
    (o.xt || []).forEach((v) => { Lab.svg('line', { x1: X(v), x2: X(v), y1: m.t, y2: H - m.b, stroke: pal.grid }, g); const t = Lab.svg('text', { x: X(v), y: H - m.b + 16, 'text-anchor': 'middle', 'font-size': 11, fill: pal.ink3 }, g); t.textContent = o.xf ? o.xf(v) : v; });
    Lab.svg('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, stroke: pal.ink3 }, g);
    if (o.xl) { const t = Lab.svg('text', { x: W - m.r, y: H - m.b + 32, 'text-anchor': 'end', 'font-size': 11, fill: pal.ink2 }, g); t.textContent = o.xl; }
    if (o.yl) { const t = Lab.svg('text', { x: m.l, y: m.t - 10, 'font-size': 11, fill: pal.ink2 }, g); t.textContent = o.yl; }
    return { W, H, X, Y, g, pal, m };
  };
  OG.path = (pts, X, Y) => pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join('');
  OG.text = (g, x, y, s, fill, anchor = 'start', size = 11) => { const t = Lab.svg('text', { x, y, 'font-size': size, fill, 'text-anchor': anchor }, g); t.textContent = s; return t; };
  // transparent hit area over the plot; onMove gets the data x, the svg-to-pixel scale factors, and the pointer position in pixels
  OG.hover = (svg, f, x0, x1, onMove, onLeave, xlog) => {
    const hit = Lab.svg('rect', { x: f.m.l, y: f.m.t, width: f.W - f.m.l - f.m.r, height: f.H - f.m.t - f.m.b, fill: 'transparent' }, svg);
    hit.addEventListener('mousemove', (e) => { const r = svg.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * f.W, t = (px - f.m.l) / (f.W - f.m.l - f.m.r); const x = xlog ? Math.pow(10, Math.log10(x0) + t * (Math.log10(x1) - Math.log10(x0))) : x0 + t * (x1 - x0); onMove(x, r.width / f.W, r.height / f.H, e.clientX - r.left, e.clientY - r.top); });
    hit.addEventListener('mouseleave', onLeave);
  };
  // a dense dot plot drawn into a canvas laid over an SVG frame of the same size (the canvas ignores the pointer)
  OG.dots = (cv, W, H) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    return { ctx, plot: (list, X, Y, col, a, r) => { ctx.fillStyle = Lab.rgbStr(col, a); list.forEach((p) => ctx.fillRect(X(p[0]) - r / 2, Y(p[1]) - r / 2, r, r)); } };
  };
  if (typeof window !== 'undefined') window.OG = OG;
  if (typeof module !== 'undefined') module.exports = OG;
})();
