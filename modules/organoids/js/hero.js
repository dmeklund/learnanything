/* Volume XIII hero: fourteen days of an intestinal organoid. A single Lgr5 stem cell divides into a small cluster,
   the cluster hollows into a cyst, and from about day 4 buds grow out; stem cells and Paneth cells gather at the bud
   tips (the crypts) while dead cells are shed into the lumen. Shapes are schematic; the timeline follows Sato et al. 2009. */
(function () {
  const root = Lab.$('#hero-bud');
  if (!root) return;
  const cv = Lab.$('canvas', root);
  const r = Lab.rng(31);
  const DAYS = 14, PERIOD = 22, HOLD = 4; // seconds for 14 days, then a pause on the last frame
  const BUDS = [0, 1, 2, 3, 4, 5].map((i) => ({ a: (i / 6) * Math.PI * 2 + 0.4 + (r() - 0.5) * 0.5, t0: 4 + r() * 2.5, h: 0.45 + r() * 0.3 }));
  const DEBRIS = Array.from({ length: 90 }, () => ({ a: r() * Math.PI * 2, d: Math.sqrt(r()) * 0.75, t: 3 + r() * 11, s: 0.6 + r() * 0.8 }));
  const STAGES = [[0, 'A single Lgr5 stem cell in Matrigel, with EGF, Noggin and R-spondin'], [1.2, 'Divisions make a small cluster'], [2, 'The cluster opens a central lumen: a cyst'], [4.5, 'Buds start to grow out of the cyst wall'], [7, 'Stem cells and Paneth cells gather at the bud tips: crypts'], [10, 'Dead cells are shed into the lumen, as into the gut']];
  let t = DAYS, raf = 0, running = false, clock = (DAYS / DAYS) * PERIOD + HOLD * 0.5, last = 0;

  const radius = (d) => 0.075 + 0.15 * (1 - Math.exp(-Math.max(0, d - 1.6) / 5));
  const budH = (b, d) => (d < b.t0 ? 0 : b.h * (1 - Math.exp(-(d - b.t0) / 2.6)));
  // outer contour radius at angle th: the cyst radius plus finger-shaped buds (a flat-topped bump in angle)
  function rOut(th, d) {
    const R = radius(d); let k = 1;
    BUDS.forEach((b) => { const x = Math.abs(((th - b.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI), w = 0.26; k += budH(b, d) / (1 + (x / w) ** 6); });
    return R * k;
  }
  function draw() {
    if (!cv.clientWidth) return;
    const narrow = cv.clientWidth < 620;
    const { ctx, w, h } = Lab.canvas(cv, narrow ? 1.05 : 0.44), pal = Lab.palette();
    ctx.clearRect(0, 0, w, h);
    const s1 = Lab.rgb('--s1'), s2 = Lab.rgb('--s2'), gel = Lab.rgb('--gel'), ink3 = Lab.rgb('--ink-3'), p3 = Lab.rgb('--paper-3'), p2 = Lab.rgb('--paper-2');
    const S = narrow ? Math.min(w, h * 0.68) : Math.min(w * 0.58, h);
    const cx = narrow ? w / 2 : w * 0.31, cy = narrow ? h * 0.36 : h / 2;
    const d = t;
    // the gel dome
    const grd = ctx.createRadialGradient(cx, cy, S * 0.1, cx, cy, S * 0.5);
    grd.addColorStop(0, Lab.rgbStr(gel, 0.5)); grd.addColorStop(1, Lab.rgbStr(gel, 0));
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(cx, cy, S * 0.5, 0, 7); ctx.fill();
    const cw = 0.028; // cell width along the wall, as a fraction of S
    if (d < 2) {
      // cluster phase: 1, 2, 4, 8, 16 cells arranged around a growing circle
      const n = Math.min(16, 2 ** Math.floor(d / 0.4)), rho = n === 1 ? 0 : (cw * n) / (2 * Math.PI) * 0.9;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2, x = cx + Math.cos(a) * rho * S, y = cy + Math.sin(a) * rho * S;
        ctx.fillStyle = Lab.rgbStr(s1, 0.85); ctx.strokeStyle = pal.ink; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, (n === 1 ? 0.03 : 0.018) * S, 0, 7); ctx.fill(); ctx.stroke();
      }
    } else {
      const M = 720, TH = 0.036, pts = [];
      for (let i = 0; i <= M; i++) { const th = (i / M) * Math.PI * 2, ro = rOut(th, d); pts.push({ th, ro, ri: Math.max(ro - TH, ro * 0.55) }); }
      // lumen and shed cells
      ctx.fillStyle = Lab.rgbStr(p2, 1); ctx.beginPath();
      pts.forEach((p, i) => { const x = cx + Math.cos(p.th) * p.ri * S, y = cy + Math.sin(p.th) * p.ri * S; ctx[i ? 'lineTo' : 'moveTo'](x, y); }); ctx.fill();
      const R = radius(d);
      DEBRIS.forEach((q) => { if (q.t > d) return; ctx.fillStyle = Lab.rgbStr(ink3, 0.55); ctx.beginPath(); ctx.arc(cx + Math.cos(q.a) * q.d * (R - TH) * S, cy + Math.sin(q.a) * q.d * (R - TH) * S, q.s * 2.2, 0, 7); ctx.fill(); });
      // split the wall into cells of equal outer arc length
      const arc = [0]; for (let i = 1; i <= M; i++) { const a = pts[i - 1], b = pts[i]; arc.push(arc[i - 1] + Math.hypot(Math.cos(b.th) * b.ro - Math.cos(a.th) * a.ro, Math.sin(b.th) * b.ro - Math.sin(a.th) * a.ro)); }
      const L = arc[M], nCells = Math.max(16, Math.round(L / cw));
      let j = 0;
      for (let c = 0; c < nCells; c++) {
        const s0 = (c / nCells) * L, s1e = ((c + 1) / nCells) * L, poly = [];
        while (j < M && arc[j + 1] < s0) j++;
        let k = j; while (k < M && arc[k] < s1e) k++;
        for (let i = j; i <= k; i++) poly.push(pts[i]);
        const mid = pts[Math.round((j + k) / 2)];
        // cell type: in a bud tip, alternate stem and Paneth cells once the crypt matures
        let tip = 0; BUDS.forEach((b) => { const x = Math.abs(((mid.th - b.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI), bh = budH(b, d); if (x < 0.17 && bh > 0.2) tip = Math.max(tip, bh); });
        let col = p3, alpha = 1;
        if (d < 4.5 || tip) col = s1;
        if (tip && d > 7 && c % 3 === 1) col = s2;
        ctx.fillStyle = Lab.rgbStr(col, col === p3 ? 1 : 0.8); ctx.strokeStyle = Lab.rgbStr(ink3, 0.9); ctx.lineWidth = 0.8;
        ctx.beginPath();
        poly.forEach((p, i) => { const x = cx + Math.cos(p.th) * p.ro * S, y = cy + Math.sin(p.th) * p.ro * S; ctx[i ? 'lineTo' : 'moveTo'](x, y); });
        for (let i = poly.length - 1; i >= 0; i--) { const p = poly[i]; ctx.lineTo(cx + Math.cos(p.th) * p.ri * S, cy + Math.sin(p.th) * p.ri * S); }
        ctx.closePath(); ctx.globalAlpha = alpha; ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
        j = k;
      }
    }
    // text panel: day counter, stage, and a key
    const tx = narrow ? 16 : w * 0.64, ty = narrow ? h * 0.74 : h * 0.2;
    ctx.fillStyle = pal.accent; ctx.font = `600 ${narrow ? 34 : 46}px ${Lab.css('--f-display')}`;
    ctx.fillText(`Day ${Math.min(DAYS, Math.floor(d))}`, tx, ty);
    ctx.fillStyle = pal.ink2; ctx.font = `${narrow ? 13 : 14}px ${Lab.css('--f-body')}`;
    let stage = STAGES[0][1]; STAGES.forEach(([d0, s]) => { if (d >= d0) stage = s; });
    const maxW = narrow ? w - 32 : w - tx - 16, words = stage.split(' '); let line = '', ly = ty + 26;
    words.forEach((wd) => { const test = line ? line + ' ' + wd : wd; if (ctx.measureText(test).width > maxW) { ctx.fillText(line, tx, ly); ly += 19; line = wd; } else line = test; }); ctx.fillText(line, tx, ly);
    // progress bar over the 14 days
    const by = ly + 18, bw = Math.min(maxW, 260);
    ctx.fillStyle = pal.rule; ctx.fillRect(tx, by, bw, 3); ctx.fillStyle = pal.accent; ctx.fillRect(tx, by, bw * Math.min(1, d / DAYS), 3);
    ctx.font = `11px ${Lab.css('--f-mono')}`; ctx.fillStyle = pal.ink3;
    const key = [[s1, 0.8, 'stem cell (Lgr5)'], [s2, 0.8, 'Paneth cell'], [p3, 1, 'absorptive and other cells'], [ink3, 0.55, 'shed dead cells']];
    key.forEach(([c, a, label], i) => { const kx = tx + (narrow ? (i % 2) * (w / 2 - 8) : 0), ky = by + 24 + (narrow ? Math.floor(i / 2) : i) * 18; ctx.fillStyle = Lab.rgbStr(c, a); ctx.strokeStyle = pal.ink3; ctx.beginPath(); ctx.rect(kx, ky - 9, 11, 11); ctx.fill(); ctx.stroke(); ctx.fillStyle = pal.ink2; ctx.fillText(label, kx + 18, ky); });
  }
  const loop = (now) => {
    if (!running) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
    clock = (clock + dt) % (PERIOD + HOLD); t = Math.min(DAYS, (clock / PERIOD) * DAYS);
    draw(); raf = requestAnimationFrame(loop);
  };
  draw();
  if (!Lab.reducedMotion) Lab.whenVisible(cv, () => { if (!running) { running = true; last = 0; raf = requestAnimationFrame(loop); } }, () => { running = false; cancelAnimationFrame(raf); });
  Lab.onTheme(draw); Lab.onResize(cv, draw);
})();
