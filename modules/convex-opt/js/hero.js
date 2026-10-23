/* Volume VIII hero: gradient descent with backtracking line search, started from points all around
   the edge of a map of a convex function. Every run ends at the same place. The function is the
   example of Boyd & Vandenberghe, Convex Optimization, §9.3: f = e^(x+3y-0.1) + e^(x-3y-0.1) + e^(-x-0.1). */
(function () {
  const root = Lab.$('#hero-bowl');
  if (!root) return;
  const cv = Lab.$('canvas', root);
  const f = (x, y) => Math.exp(x + 3 * y - 0.1) + Math.exp(x - 3 * y - 0.1) + Math.exp(-x - 0.1);
  const grad = (x, y) => { const a = Math.exp(x + 3 * y - 0.1), b = Math.exp(x - 3 * y - 0.1), c = Math.exp(-x - 0.1); return [a + b - c, 3 * a - 3 * b]; };
  const XR = [-2.6, 1.0], YR = [-0.9, 0.9];
  // starts evenly spaced around the boundary
  const starts = [];
  for (let i = 0; i < 9; i++) { const x = XR[0] + 0.1 + ((XR[1] - XR[0] - 0.2) * i) / 8; starts.push([x, YR[1] - 0.06], [x, YR[0] + 0.06]); }
  for (let j = 1; j < 4; j++) { const y = YR[0] + ((YR[1] - YR[0]) * j) / 4; starts.push([XR[0] + 0.06, y], [XR[1] - 0.06, y]); }
  // paths of steepest descent (gradient flow), integrated with short, length-limited steps
  const runs = starts.map((s) => {
    let x = s.slice(); const pts = [x.slice()];
    for (let k = 0; k < 3000; k++) {
      const g = grad(...x), n = Math.hypot(g[0], g[1]); if (n < 1e-3) break;
      const h = Math.min(0.012 / n, 0.08); x = [x[0] - h * g[0], x[1] - h * g[1]]; if (k % 3 === 0) pts.push(x.slice());
    }
    pts.push(x.slice());
    return pts;
  });
  let base = null, prog = 1, raf = 0, t0 = 0, running = false;
  function paintBase(w, h) {
    const off = document.createElement('canvas'), dpr = cv.width / w; off.width = cv.width; off.height = cv.height;
    const c = off.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const pal = Lab.palette(), sx = w / (XR[1] - XR[0]), sy = h / (YR[1] - YR[0]);
    const X = (x) => (x - XR[0]) * sx, Y = (y) => h - (y - YR[0]) * sy;
    const levels = []; for (let k = 0; k < 16; k++) levels.push(2.6 * Math.pow(1.22, k));
    const topo = Lab.css('--topo');
    CO.contours(f, XR[0], XR[1], YR[0], YR[1], 160, 80, levels).forEach((cc, k) => {
      c.strokeStyle = topo; c.globalAlpha = k % 4 === 0 ? 0.9 : 0.45; c.lineWidth = k % 4 === 0 ? 1.4 : 0.8; c.beginPath();
      cc.segs.forEach(([p, q]) => { c.moveTo(X(p[0]), Y(p[1])); c.lineTo(X(q[0]), Y(q[1])); }); c.stroke();
    });
    c.globalAlpha = 1;
    return { off, X, Y, pal };
  }
  function draw() {
    if (!cv.clientWidth) return;
    const { ctx, w, h } = Lab.canvas(cv, (cv.clientWidth || 800) < 560 ? 0.62 : 0.42);
    if (!base || base.w !== w || base.theme !== Lab.css('--paper')) base = { ...paintBase(w, h), w, theme: Lab.css('--paper') };
    ctx.clearRect(0, 0, w, h); ctx.drawImage(base.off, 0, 0, w, h);
    const { X, Y } = base, col = Lab.css('--s2'), ink = Lab.css('--ink');
    runs.forEach((pts) => {
      // the whole path at rest; a marble rolls along it while the hero is on screen
      ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.75;
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])))); ctx.stroke();
      ctx.globalAlpha = 1; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(pts[0][0]), Y(pts[0][1]), 3, 0, 7); ctx.fill();
      if (prog < 1) { const e = pts[Math.min(pts.length - 1, Math.floor(pts.length * prog))]; ctx.beginPath(); ctx.arc(X(e[0]), Y(e[1]), 4, 0, 7); ctx.fill(); }
    });
    const xm = -Math.log(2) / 2;
    ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(X(xm), Y(0), 5, 0, 7); ctx.fill();
    ctx.font = `12px ${Lab.css('--f-mono')}`; ctx.fillStyle = ink; ctx.fillText('the minimum', X(xm) + 9, Y(0) - 9);
  }
  const loop = (now) => {
    if (!running) return;
    const el = Math.max(0, now - t0) / 1000; prog = Math.min(1, (el % 6) / 4);
    draw(); raf = requestAnimationFrame(loop);
  };
  prog = 1; draw();
  if (!Lab.reducedMotion) Lab.whenVisible(cv, () => { if (!running) { running = true; t0 = performance.now(); raf = requestAnimationFrame(loop); } }, () => { running = false; cancelAnimationFrame(raf); prog = 1; });
  Lab.onTheme(() => { base = null; draw(); }); Lab.onResize(cv, () => { base = null; draw(); });
})();
