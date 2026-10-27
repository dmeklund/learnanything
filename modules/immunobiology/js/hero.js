/* Volume XI hero: a lymphocyte repertoire in "shape space". Each dot is a clone with a different receptor;
   an antigen drifts through, and only the few clones whose receptors fit it are activated and multiply. */
(function () {
  const root = Lab.$('#hero-rep');
  if (!root) return;
  const cv = Lab.$('canvas', root);
  const r = Lab.rng(23), N = 1400;
  const clones = Array.from({ length: N }, () => ({ x: r(), y: r(), a: 0, kids: [] }));
  let t = 0, raf = 0, running = false;
  const ag = (t) => [0.5 + 0.34 * Math.sin(t * 0.37), 0.5 + 0.3 * Math.sin(t * 0.53 + 1.1)];
  function step(dt) {
    t += dt; const [ax, ay] = ag(t);
    clones.forEach((c) => {
      const d2 = (c.x - ax) ** 2 + (c.y - ay) ** 2, fit = Math.exp(-d2 / (2 * 0.045 * 0.045));
      c.a = Math.min(1, c.a * Math.exp(-0.25 * dt) + fit * dt * 1.5);
      if (c.a > 0.35 && c.kids.length < 8 && r() < c.a * dt * 2) { const ang = r() * 6.283, rr = 0.006 + 0.012 * c.kids.length / 8; c.kids.push([Math.cos(ang) * rr, Math.sin(ang) * rr]); }
      if (c.a < 0.08 && c.kids.length && r() < dt * 0.6) c.kids.pop();
    });
  }
  function draw() {
    if (!cv.clientWidth) return;
    const { ctx, w, h } = Lab.canvas(cv, cv.clientWidth < 560 ? 0.75 : 0.42), pal = Lab.palette();
    ctx.clearRect(0, 0, w, h);
    const X = (x) => 6 + x * (w - 12), Y = (y) => 6 + y * (h - 12);
    const s1 = Lab.rgb('--s1'), s2 = Lab.rgb('--s2'), ink3 = Lab.rgb('--ink-3');
    const [ax, ay] = ag(t);
    const grd = ctx.createRadialGradient(X(ax), Y(ay), 0, X(ax), Y(ay), 0.12 * w);
    grd.addColorStop(0, Lab.rgbStr(s2, 0.18)); grd.addColorStop(1, Lab.rgbStr(s2, 0));
    ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
    clones.forEach((c) => {
      const col = c.a > 0.05 ? Lab.mix(s1, s2, Math.min(1, c.a)) : ink3;
      ctx.fillStyle = Lab.rgbStr(col, c.a > 0.05 ? 0.85 : 0.35);
      ctx.beginPath(); ctx.arc(X(c.x), Y(c.y), 1.5 + 2.5 * c.a, 0, 7); ctx.fill();
      c.kids.forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(X(c.x + dx), Y(c.y + dy), 1.6, 0, 7); ctx.fill(); });
    });
    // the antigen, drawn as a small spiky particle
    ctx.save(); ctx.translate(X(ax), Y(ay)); ctx.strokeStyle = pal.ink; ctx.fillStyle = pal.paper; ctx.lineWidth = 1.5;
    for (let k = 0; k < 10; k++) { const an = (k / 10) * 6.283; ctx.beginPath(); ctx.moveTo(Math.cos(an) * 7, Math.sin(an) * 7); ctx.lineTo(Math.cos(an) * 12, Math.sin(an) * 12); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.font = `11px ${Lab.css('--f-mono')}`; ctx.fillStyle = pal.ink2;
    ctx.fillText(w < 560 ? 'an antigen activates the few clones that fit' : `${N.toLocaleString()} clones, each with a different receptor; an antigen activates the few that fit`, 10, h - 10);
  }
  // settle into a representative frame so the hero is complete at rest
  for (let i = 0; i < 260; i++) step(0.05);
  draw();
  const loop = () => { if (!running) return; step(0.03); draw(); raf = requestAnimationFrame(loop); };
  if (!Lab.reducedMotion) Lab.whenVisible(cv, () => { if (!running) { running = true; loop(); } }, () => { running = false; cancelAnimationFrame(raf); });
  Lab.onTheme(draw); Lab.onResize(cv, draw);
})();
