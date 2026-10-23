/* Volume IX hero: Maxwell's equations solved live on a grid (2-D FDTD, Yee's scheme). Two antennas
   half a wavelength apart oscillate in phase; their waves interfere into beams. Blue and vermilion
   are opposite signs of the electric field pointing out of the page. */
(function () {
  const root = Lab.$('#hero-waves');
  if (!root) return;
  const cv = Lab.$('canvas', root);
  const NX = 240, NY = 110, LAM = 22, sim = EM.fdtd2(NX, NY, 16);
  // sources oscillate with a period of 2 * LAM time steps; at Courant number 0.5 that gives a wavelength of LAM cells
  const srcs = [-0.5, 0.5].map((k) => ({ i: Math.round(NX * 0.32), j: Math.round(NY / 2 + k * LAM * 0.5), v: (t) => 0.6 * Math.sin((Math.PI * t) / LAM) * Math.min(1, t / 40) }));
  for (let t = 0; t < 520; t++) sim.step(srcs);
  const off = document.createElement('canvas'); off.width = NX; off.height = NY;
  const octx = off.getContext('2d'), img = octx.createImageData(NX, NY);
  let raf = 0, running = false;
  function draw() {
    if (!cv.clientWidth) return;
    const { ctx, w, h } = Lab.canvas(cv, (NY - 2 * 14) / (NX - 2 * 14));
    const col = EM.diverge();
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const v = Math.tanh(sim.Ez[j * NX + i] / 0.12), c = col(v), o = ((NY - 1 - j) * NX + i) * 4;
      img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
    }
    octx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    // crop the absorbing border
    ctx.drawImage(off, 14, 14, NX - 28, NY - 28, 0, 0, w, h);
    const sx = w / (NX - 28), sy = h / (NY - 28);
    ctx.fillStyle = Lab.css('--ink');
    srcs.forEach((s) => { ctx.beginPath(); ctx.arc((s.i - 14) * sx, h - (s.j - 14) * sy, 3.5, 0, 7); ctx.fill(); });
    ctx.font = `11px ${Lab.css('--f-mono')}`; ctx.fillStyle = Lab.css('--ink-2');
    ctx.fillText('two antennas, ½ wavelength apart, in phase', 10, 18);
  }
  const loop = () => { if (!running) return; sim.step(srcs); sim.step(srcs); draw(); raf = requestAnimationFrame(loop); };
  draw();
  if (!Lab.reducedMotion) Lab.whenVisible(cv, () => { if (!running) { running = true; loop(); } }, () => { running = false; cancelAnimationFrame(raf); });
  Lab.onTheme(draw); Lab.onResize(cv, draw);
})();
