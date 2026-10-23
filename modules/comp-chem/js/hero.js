/* Volume VII hero: the π molecular orbitals of naphthalene from Hückel theory (1931), computed on load.
   Circles on each carbon show the orbital coefficient (area) and sign (color); the ladder shows the energies. */
(function () {
  const root = Lab.$('#hero-mo');
  if (!root) return;
  const cv = Lab.$('canvas', root), cap = Lab.$('.hero-mo-cap', root);
  const P = [[0, 0.5], [0, -0.5], [-0.866, 1], [-1.732, 0.5], [-1.732, -0.5], [-0.866, -1], [0.866, 1], [1.732, 0.5], [1.732, -0.5], [0.866, -1]];
  const B = [[0, 1], [0, 2], [2, 3], [3, 4], [4, 5], [5, 1], [0, 6], [6, 7], [7, 8], [8, 9], [9, 1]];
  const Hs = [2, 3, 4, 5, 6, 7, 8, 9];
  const mo = CC.huckel(10, B); // values: x in E = alpha + x*|beta|... with beta < 0, low x = bonding
  const order = mo.values.map((v, i) => i); // ascending energy (bonding first)
  let sel = 4, hit = [], timer = 0, auto = !Lab.reducedMotion, fade = 1;
  function draw() {
    const { ctx, w, h } = Lab.canvas(cv, (cv.clientWidth || 800) < 560 ? 0.9 : 0.44), pal = Lab.palette();
    if (!w) return;
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 560, ladW = narrow ? w : Math.min(220, w * 0.28), molW = narrow ? w : w - ladW - 20, molH = narrow ? h * 0.62 : h;
    const sc = Math.min(molW / 5.2, molH / 3.6), cx = molW / 2, cy = molH / 2;
    const XY = ([a, b]) => [cx + a * sc, cy - b * sc];
    // skeleton
    ctx.strokeStyle = pal.ink3; ctx.lineWidth = 2;
    B.forEach(([i, j]) => { const [x1, y1] = XY(P[i]), [x2, y2] = XY(P[j]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); });
    ctx.lineWidth = 1.2;
    Hs.forEach((i) => { const [x, y] = XY(P[i]), d = Math.hypot(P[i][0], P[i][1]), ux = P[i][0] / d, uy = P[i][1] / d, hx = x + ux * sc * 0.55, hy = y - uy * sc * 0.55; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(hx, hy); ctx.stroke(); ctx.fillStyle = pal.ink3; ctx.font = `${Math.max(10, sc * 0.18)}px ${Lab.css('--f-mono')}`; ctx.textAlign = 'center'; ctx.fillText('H', hx + ux * 9, hy - uy * 9 + 4); });
    // orbital lobes
    const v = mo.vectors[order[sel]], pos = Lab.rgb('--s1'), neg = Lab.rgb('--s2');
    v.forEach((c, i) => {
      const [x, y] = XY(P[i]), r = Math.sqrt(Math.abs(c)) * sc * 0.62;
      if (r < 1.5) return;
      ctx.fillStyle = Lab.rgbStr(c > 0 ? pos : neg, 0.72 * fade); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      ctx.strokeStyle = Lab.rgbStr(c > 0 ? pos : neg, fade); ctx.lineWidth = 1.5; ctx.stroke();
    });
    ctx.fillStyle = pal.ink; P.forEach((p) => { const [x, y] = XY(p); ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); });
    // energy ladder
    const lx = narrow ? 20 : molW + 20, ly0 = narrow ? molH + 16 : 24, lh = narrow ? h - molH - 28 : h - 48;
    const vals = order.map((i) => mo.values[i]), Y = Lab.scale(Math.min(...vals) - 0.2, Math.max(...vals) + 0.2, ly0 + lh, ly0);
    ctx.font = `11px ${Lab.css('--f-mono')}`; ctx.textAlign = 'left';
    hit = [];
    if (narrow) {
      // horizontal ladder: energy runs left to right
      const Xn = Lab.scale(Math.min(...vals) - 0.2, Math.max(...vals) + 0.2, lx, w - 20), yy = ly0 + lh / 2;
      ctx.strokeStyle = pal.rule; ctx.beginPath(); ctx.moveTo(lx, yy + 14); ctx.lineTo(w - 20, yy + 14); ctx.stroke();
      ctx.fillStyle = pal.ink3; ctx.fillText('bonding ← energy → antibonding', lx, yy + 32);
      vals.forEach((e, k) => { const x = Xn(e) + (k > 0 && Math.abs(e - vals[k - 1]) < 0.05 ? 7 : 0); ctx.fillStyle = k === sel ? pal.ink : k < 5 ? pal.ink2 : pal.ink3; ctx.fillRect(x - 3, yy - 12, 6, 24); hit.push({ x0: x - 8, x1: x + 8, y0: yy - 16, y1: yy + 16, k }); });
    } else {
      ctx.fillStyle = pal.ink2; ctx.fillText('π orbital energies', lx, ly0 - 8);
      const groups = {};
      vals.forEach((e, k) => { const key = e.toFixed(3); (groups[key] = groups[key] || []).push(k); });
      Object.values(groups).forEach((ks) => ks.forEach((k, j) => {
        const e = vals[k], y = Y(e), x = lx + 10 + j * 46;
        ctx.strokeStyle = k === sel ? Lab.css('--accent') : pal.ink2; ctx.lineWidth = k === sel ? 4 : 2.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 36, y); ctx.stroke();
        if (k < 5) { ctx.fillStyle = pal.ink2; ctx.fillText('↑↓', x + 8, y - 4); }
        hit.push({ x0: x - 4, x1: x + 40, y0: y - 9, y1: y + 9, k });
      }));
      ctx.lineWidth = 1;
      ctx.fillStyle = pal.ink3; ctx.fillText('HOMO', lx + 108, Y(vals[4]) + 4); ctx.fillText('LUMO', lx + 108, Y(vals[5]) + 4);
    }
    const e = vals[sel], name = sel === 4 ? 'HOMO, ' : sel === 5 ? 'LUMO, ' : '';
    cap.textContent = `π orbital ${sel + 1} of 10 (${name}E = α ${e < 0 ? "+" : "−"} ${Math.abs(e).toFixed(3)}β). Color marks the sign of each coefficient; area, its size.`;
  }
  cv.addEventListener('click', (ev) => {
    const r = cv.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
    const t = hit.find((b) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1);
    if (t) { sel = t.k; auto = false; draw(); }
  });
  const tick = () => { if (!auto) return; sel = (sel + 1) % 10; draw(); };
  draw();
  if (auto) Lab.whenVisible(cv, () => { clearInterval(timer); timer = setInterval(tick, 2600); }, () => clearInterval(timer));
  Lab.onTheme(draw); Lab.onResize(cv, draw);
})();
