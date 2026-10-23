/* Volume VI hero: an inverse-planned prostate treatment on an axial slice, with the gantry turning
   through its seven beam angles and the room lasers crossing at the isocenter. */
(function () {
  const root = Lab.$('#hero-plan');
  if (!root) return;
  const cv = Lab.$('canvas', root);
  const G = { nx: 76, ny: 54, h: 0.5, x0: -19, y0: -13.5, bodyA: 17, bodyB: 11.5 };
  const S = {
    ptv: RT.inEllipse(0, -1.4, 2.9, 2.5),
    rectum: RT.inCircle(0, -5.1, 1.5),
    bladder: RT.inEllipse(0, 2.9, 3.6, 2.3),
    femL: RT.inCircle(-9.6, -1.6, 2.4),
    femR: RT.inCircle(9.6, -1.6, 2.4),
  };
  const angles = [0, 51.4, 102.9, 154.3, 205.7, 257.1, 308.6];
  const E = RT.engine({ ...G, body: RT.inEllipse(0, 0, G.bodyA, G.bodyB), angles, w: 0.5, half: 6 });
  const roles = new Uint8Array(E.NV), T = new Uint8Array(E.NV);
  E.vox.forEach((p, v) => {
    const x = G.x0 + ((p % G.nx) + 0.5) * G.h, y = G.y0 + (Math.floor(p / G.nx) + 0.5) * G.h;
    if (S.ptv(x, y)) { roles[v] = 1; T[v] = 1; } else if (S.rectum(x, y) || S.bladder(x, y) || S.femL(x, y) || S.femR(x, y)) roles[v] = 2;
  });
  const opt = RT.optimizer(E, roles, { wT: 1, wO: 1.2, wN: 0.06, oar: 0.35, normal: 0.45 });
  opt.step(140); RT.normalize(E, opt.wts, T);
  const D = RT.dose(E, opt.wts), F = new Float32Array(G.nx * G.ny);
  E.vox.forEach((p, v) => (F[p] = D[v]));
  let base = null, gantry = 0, raf = 0, running = false;
  function paintBase() {
    const { ctx, w, h } = Lab.canvas(cv, 0.62);
    const dpr = cv.width / w;
    const off = document.createElement('canvas'); off.width = cv.width; off.height = cv.height;
    const c = off.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const fm = { bg: Lab.css('--film'), ink: Lab.css('--film-ink'), ink2: Lab.css('--film-ink-2') };
    c.fillStyle = fm.bg; c.fillRect(0, 0, w, h);
    // fit the grid into the frame, keeping aspect
    const sc = Math.min(w / (G.nx * G.h), h / (G.ny * G.h)), Wd = G.nx * G.h * sc, Hd = G.ny * G.h * sc, X0 = (w - Wd) / 2, Y0 = (h - Hd) / 2;
    const P = (x, y) => [X0 + (x - G.x0) * sc, Y0 + Hd - (y - G.y0) * sc];
    const tone = (n) => Lab.rgbStr(Lab.rgb(n));
    const ell = (cx, cy, a, b, fill) => { const [px, py] = P(cx, cy); c.fillStyle = fill; c.beginPath(); c.ellipse(px, py, a * sc, b * sc, 0, 0, 7); c.fill(); };
    ell(0, 0, G.bodyA, G.bodyB, tone('--film-fat'));
    ell(0, 0, G.bodyA - 1.6, G.bodyB - 1.4, tone('--film-tissue'));
    ell(0, 2.9, 3.6, 2.3, tone('--film-fluid'));
    ell(-9.6, -1.6, 2.4, 2.4, tone('--film-bone')); ell(9.6, -1.6, 2.4, 2.4, tone('--film-bone'));
    ell(-9.6, -1.6, 1.6, 1.6, tone('--film-marrow')); ell(9.6, -1.6, 1.6, 1.6, tone('--film-marrow'));
    ell(0, -5.1, 0.7, 0.6, fm.bg);
    c.save(); c.translate(X0, Y0); RT.paintDose(c, F, G.nx, G.ny, 0, 0, Wd, Hd, { lo: 0.25, hi: 1.05, alpha: 0.6 }); c.restore();
    c.lineWidth = 1.5;
    c.strokeStyle = Lab.css('--wash-5'); RT.strokeContour(c, F, G.nx, G.ny, 0.95, X0, Y0, Wd, Hd);
    c.strokeStyle = Lab.css('--wash-3'); RT.strokeContour(c, F, G.nx, G.ny, 0.5, X0, Y0, Wd, Hd);
    c.lineWidth = 1; c.strokeStyle = fm.ink2; c.setLineDash([3, 3]);
    [[0, -1.4, 2.9, 2.5], [0, -5.1, 1.5, 1.5], [0, 2.9, 3.6, 2.3]].forEach(([x, y, a, b]) => { const [px, py] = P(x, y); c.beginPath(); c.ellipse(px, py, a * sc, b * sc, 0, 0, 7); c.stroke(); });
    c.setLineDash([]);
    const fs = Math.max(10, Math.min(12, w / 60));
    c.font = `${fs}px ${Lab.css('--f-mono')}`; c.fillStyle = fm.ink;
    const lab = (x, y, s, al) => { const [px, py] = P(x, y); c.textAlign = al || 'left'; c.fillText(s, px, py); };
    lab(3.4, -0.6, 'target'); lab(2.0, -6.3, 'rectum'); lab(4.0, 4.6, 'bladder'); lab(9.6, -4.9, 'femoral head', 'center');
    c.textAlign = 'left'; c.fillStyle = fm.ink2;
    c.fillText('AXIAL · PELVIS · 7 FIELDS', 10, 18);
    c.fillText('isodose 95% · 50%', 10, h - 10);
    base = { off, w, h, P, sc, X0, Y0, Wd, Hd };
  }
  function frame() {
    if (!cv.clientWidth) return;
    if (!base) paintBase();
    const { ctx, w, h } = Lab.canvas(cv, 0.62);
    ctx.drawImage(base.off, 0, 0, w, h);
    const { P, sc } = base, [cx, cy] = P(0, 0);
    // room lasers through the isocenter
    ctx.globalAlpha = 0.55; ctx.lineWidth = 1;
    ctx.strokeStyle = Lab.css('--laser-r'); ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
    ctx.strokeStyle = Lab.css('--laser-g'); ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
    ctx.globalAlpha = 1;
    // gantry head and the beam it is delivering
    const t = (gantry * Math.PI) / 180, R = (G.bodyB + 0.9) * sc;
    const hx = cx + R * 1.25 * Math.sin(t), hy = cy - R * Math.cos(t);
    const near = angles.reduce((a, b) => (Math.abs(((b - gantry + 540) % 360) - 180) < Math.abs(((a - gantry + 540) % 360) - 180) ? b : a));
    const on = Math.abs(((near - gantry + 540) % 360) - 180) < 9;
    if (on) {
      const [tx, ty] = P(0, -1.4), half = 3.2 * sc, px = Math.cos(t), py = Math.sin(t);
      ctx.fillStyle = Lab.rgbStr(Lab.rgb('--wash-4'), 0.16);
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx + half * px, ty + half * py); ctx.lineTo(tx - half * px, ty - half * py); ctx.closePath(); ctx.fill();
    }
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(t);
    ctx.fillStyle = Lab.css('--film-ink-2'); ctx.fillRect(-14, -7, 28, 14);
    ctx.fillStyle = on ? Lab.css('--wash-4') : Lab.css('--film'); ctx.fillRect(-6, 4, 12, 3);
    ctx.restore();
  }
  function loop() { if (!running) return; gantry = (gantry + 0.35) % 360; frame(); raf = requestAnimationFrame(loop); }
  const redraw = () => { base = null; frame(); };
  frame();
  if (!Lab.reducedMotion) Lab.whenVisible(cv, () => { if (!running) { running = true; loop(); } }, () => { running = false; cancelAnimationFrame(raf); });
  Lab.onTheme(redraw); Lab.onResize(cv, redraw);
})();
