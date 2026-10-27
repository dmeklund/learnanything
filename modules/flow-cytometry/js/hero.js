/* Volume XII hero: cells pushed into single file by hydrodynamic focusing cross a laser; each crossing makes a
   scatter pulse and a fluorescence pulse, and each pulse pair becomes one dot on a two-parameter plot. */
(function () {
  const root = Lab.$('#hero-flow');
  if (!root) return;
  const cv = Lab.$('canvas', root);
  const r = Lab.rng(12);
  // three illustrative populations: small dim, small bright, large dim
  const TYPES = [{ size: 0.55, fl: 0.06, w: 0.5 }, { size: 0.6, fl: 0.7, w: 0.3 }, { size: 1, fl: 0.12, w: 0.2 }];
  const cells = [], dots = [], TRACE = 360, scat = new Float32Array(TRACE), fluo = new Float32Array(TRACE);
  let tNext = 0, t = 0, raf = 0, running = false;
  const LASER = 0.36; // laser position as a fraction of the flow region
  function spawn() {
    const u = r(); let k = 0, acc = TYPES[0].w; while (u > acc && k < TYPES.length - 1) acc += TYPES[++k].w;
    const T = TYPES[k];
    cells.push({ x: -0.02, off: (r() - 0.5) * 2, size: T.size * (1 + 0.08 * Lab.gauss(r)), fl: T.fl * Math.exp(0.35 * Lab.gauss(r)), k, done: false });
  }
  // channel half-width (fraction of flow-region height) along x: wide where sheath and sample enter, narrow after the funnel
  const half = (x) => (x < 0.06 ? 0.42 : x > 0.24 ? 0.07 : 0.07 + 0.35 * (1 - (x - 0.06) / 0.18) ** 2);
  function step(dt) {
    t += dt; tNext -= dt;
    if (tNext <= 0) { spawn(); tNext = 0.22 + 0.5 * r(); }
    // speed rises as the channel narrows, so the cells spread apart along the stream
    cells.forEach((c) => { c.x += dt * 0.09 * (0.42 / half(Math.max(0, c.x))) ** 0.5; });
    let s = 0, f = 0;
    cells.forEach((c) => {
      const d = (c.x - LASER) / 0.012, g = Math.exp(-0.5 * d * d);
      s += g * c.size; f += g * c.fl;
      if (!c.done && c.x > LASER) { c.done = true; dots.push([c.size, c.fl, c.k]); if (dots.length > 900) dots.shift(); }
    });
    scat.copyWithin(0, 1); scat[TRACE - 1] = s; fluo.copyWithin(0, 1); fluo[TRACE - 1] = f;
    while (cells.length && cells[0].x > 1.05) cells.shift();
  }
  function draw() {
    if (!cv.clientWidth) return;
    const narrow = cv.clientWidth < 620;
    const { ctx, w, h } = Lab.canvas(cv, narrow ? 0.95 : 0.4), pal = Lab.palette();
    ctx.clearRect(0, 0, w, h);
    const s1 = Lab.rgb('--s1'), s2 = Lab.rgb('--s2'), ink = Lab.rgb('--ink'), laser = Lab.rgb('--laser');
    // layout: flow region and trace on the left (or top), dot plot on the right (or bottom)
    const F = narrow ? { x: 8, y: 8, w: w - 16, h: h * 0.32 } : { x: 8, y: 10, w: w * 0.6, h: h * 0.58 };
    const Tr = narrow ? { x: 8, y: h * 0.36, w: w - 16, h: h * 0.18 } : { x: 8, y: h * 0.7, w: w * 0.6, h: h * 0.26 };
    const D = narrow ? { x: 46, y: h * 0.6, w: w - 62, h: h * 0.33 } : { x: w * 0.68 + 30, y: 18, w: w * 0.32 - 46, h: h - 58 };
    const PX = (x) => F.x + x * F.w, PY = (y) => F.y + F.h / 2 + y * F.h;
    // channel walls
    ctx.strokeStyle = pal.ink3; ctx.lineWidth = 1.2;
    [1, -1].forEach((sgn) => { ctx.beginPath(); for (let i = 0; i <= 100; i++) { const x = i / 100; ctx[i ? 'lineTo' : 'moveTo'](PX(x), PY(sgn * half(x))); } ctx.stroke(); });
    // sample injection needle
    ctx.fillStyle = pal.ink3; ctx.fillRect(PX(0), PY(-0.02) - 1, PX(0.07) - PX(0), 3); ctx.fillRect(PX(0), PY(0.02) - 1, PX(0.07) - PX(0), 3);
    ctx.font = `11px ${Lab.css('--f-mono')}`; ctx.fillStyle = pal.ink3;
    ctx.fillText('sheath', PX(0.005), PY(-0.3)); ctx.fillText('sample', PX(0.005), PY(0.12)); ctx.fillText('sheath', PX(0.005), PY(0.36));
    // laser beam
    const lx = PX(LASER), grd = ctx.createLinearGradient(lx - 14, 0, lx + 14, 0);
    grd.addColorStop(0, Lab.rgbStr(laser, 0)); grd.addColorStop(0.5, Lab.rgbStr(laser, 0.55)); grd.addColorStop(1, Lab.rgbStr(laser, 0));
    ctx.fillStyle = grd; ctx.fillRect(lx - 14, F.y, 28, F.h);
    ctx.fillStyle = pal.ink2; ctx.fillText('laser', lx + 16, F.y + 12);
    // cells, drawn as circles whose radius is their size and whose fill is their fluorescence
    cells.forEach((c) => {
      if (c.x < 0) return;
      const y = c.off * Math.max(0.012, half(c.x) - 0.05) * 0.85, rad = 2.5 + 3.2 * c.size;
      const lit = Math.exp(-0.5 * ((c.x - LASER) / 0.02) ** 2);
      ctx.fillStyle = Lab.rgbStr(Lab.mix(Lab.rgb('--paper-3'), s2, Math.min(1, c.fl * 1.3)), 1);
      ctx.strokeStyle = Lab.rgbStr(Lab.mix(Lab.rgb('--ink-3'), ink, lit), 1); ctx.lineWidth = 1.2 + lit;
      ctx.beginPath(); ctx.arc(PX(c.x), PY(y), rad, 0, 7); ctx.fill(); ctx.stroke();
    });
    // detector traces
    ctx.strokeStyle = pal.rule; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(Tr.x, Tr.y + Tr.h); ctx.lineTo(Tr.x + Tr.w, Tr.y + Tr.h); ctx.stroke();
    [[scat, s1, 1.1], [fluo, s2, 1.1]].forEach(([arr, col, k]) => {
      ctx.strokeStyle = Lab.rgbStr(col, 1); ctx.lineWidth = 1.6; ctx.beginPath();
      for (let i = 0; i < TRACE; i++) { const x = Tr.x + (i / (TRACE - 1)) * Tr.w, y = Tr.y + Tr.h - Math.min(1, arr[i] / k) * (Tr.h - 14); ctx[i ? 'lineTo' : 'moveTo'](x, y); }
      ctx.stroke();
    });
    ctx.fillStyle = pal.ink2; ctx.fillText('detector signals: scatter (blue), fluorescence (vermilion)', Tr.x, Tr.y + 4);
    // dot plot
    ctx.strokeStyle = pal.ink3; ctx.beginPath(); ctx.moveTo(D.x, D.y); ctx.lineTo(D.x, D.y + D.h); ctx.lineTo(D.x + D.w, D.y + D.h); ctx.stroke();
    const DX = (v) => D.x + (v / 1.3) * D.w, DY = (v) => D.y + D.h - ((Math.log10(Math.max(0.01, v)) + 2) / 2.6) * D.h;
    dots.forEach((p, i) => { ctx.fillStyle = Lab.rgbStr(i === dots.length - 1 ? s2 : ink, i === dots.length - 1 ? 1 : 0.55); ctx.beginPath(); ctx.arc(DX(p[0]), DY(p[1]), i === dots.length - 1 ? 4 : 1.8, 0, 7); ctx.fill(); });
    ctx.fillStyle = pal.ink2; ctx.fillText('scatter (cell size) →', D.x + D.w - ctx.measureText('scatter (cell size) →').width, D.y + D.h + 16);
    ctx.save(); ctx.translate(D.x - 10, D.y + D.h); ctx.rotate(-Math.PI / 2); ctx.fillText('fluorescence (log) →', 0, 0); ctx.restore();
    ctx.fillStyle = pal.ink3; ctx.fillText(`${dots.length} cells measured`, D.x + 6, D.y + D.h - 8);
  }
  // pre-run so the hero is complete at rest: a stream of cells, full traces, and a populated dot plot
  for (let i = 0; i < 9000; i++) step(0.02);
  draw();
  const loop = () => { if (!running) return; step(0.016); step(0.016); draw(); raf = requestAnimationFrame(loop); };
  if (!Lab.reducedMotion) Lab.whenVisible(cv, () => { if (!running) { running = true; loop(); } }, () => { running = false; cancelAnimationFrame(raf); });
  Lab.onTheme(draw); Lab.onResize(cv, draw);
})();
