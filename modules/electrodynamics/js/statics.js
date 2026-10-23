/* Volume IX figures: electrostatics (field lines, equipotentials, Gauss's law) and magnetostatics (Helmholtz coils). */
(function () {
  const T = (g, x, y, s, fill, anchor, size) => EM.text(g, x, y, s, fill, anchor, size);

  /* ---------- Fig 1.1 Field lines and Gauss's law ---------- */
  (function () {
    const root = Lab.$('#fig-charges');
    if (!root) return;
    const cv = Lab.$('canvas', root), out = Lab.$('.readouts', root);
    const PRE = {
      dipole: [{ x: -1, y: 0, q: 1 }, { x: 1, y: 0, q: -1 }],
      like: [{ x: -1, y: 0, q: 1 }, { x: 1, y: 0, q: 1 }],
      unequal: [{ x: -1, y: 0, q: 2 }, { x: 1, y: 0, q: -1 }],
      three: [{ x: -1.4, y: -0.4, q: 1 }, { x: 0, y: 0.7, q: -1 }, { x: 1.4, y: -0.4, q: 1 }],
    };
    let Q = PRE.dipole.map((q) => ({ ...q })), G = { x: -1, y: 0, r: 0.6 }, show = { gauss: true }, ready = false, drag = null, view = null;
    const BOX = [-3.2, 3.2, -2.1, 2.1];
    function draw() {
      if (!ready || !cv.clientWidth) return;
      const narrow = cv.clientWidth < 560, { ctx, w, h } = Lab.canvas(cv, narrow ? 0.9 : 0.6), pal = Lab.palette();
      const s = Math.min(w / (BOX[1] - BOX[0]), h / (BOX[3] - BOX[2])), ox = w / 2, oy = h / 2;
      const X = (x) => ox + x * s, Y = (y) => oy - y * s; view = { s, ox, oy };
      ctx.clearRect(0, 0, w, h);
      // equipotentials
      const nx = 130, ny = 90, x0 = -w / 2 / s, x1 = w / 2 / s, y0 = -h / 2 / s, y1 = h / 2 / s, Vg = new Float64Array((nx + 1) * (ny + 1));
      for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) Vg[j * (nx + 1) + i] = EM.potential(Q, x0 + ((x1 - x0) * i) / nx, y0 + ((y1 - y0) * j) / ny);
      ctx.strokeStyle = Lab.rgbStr(Lab.rgb('--s3'), 0.6); ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      [-4, -2, -1, -0.5, -0.25, 0.25, 0.5, 1, 2, 4].forEach((lv) => {
        ctx.beginPath();
        for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
          const a = Vg[j * (nx + 1) + i], b = Vg[j * (nx + 1) + i + 1], c = Vg[(j + 1) * (nx + 1) + i + 1], d = Vg[(j + 1) * (nx + 1) + i];
          const idx = (a >= lv ? 1 : 0) | (b >= lv ? 2 : 0) | (c >= lv ? 4 : 0) | (d >= lv ? 8 : 0); if (!idx || idx === 15) continue;
          const L = (p, q) => (lv - p) / (q - p), px = (u) => X(x0 + ((x1 - x0) * u) / nx), py = (v) => Y(y0 + ((y1 - y0) * v) / ny);
          const e = [[px(i + L(a, b)), py(j)], [px(i + 1), py(j + L(b, c))], [px(i + L(d, c)), py(j + 1)], [px(i), py(j + L(a, d))]];
          ({ 1: [[0, 3]], 2: [[0, 1]], 3: [[1, 3]], 4: [[1, 2]], 5: [[0, 1], [2, 3]], 6: [[0, 2]], 7: [[2, 3]], 8: [[2, 3]], 9: [[0, 2]], 10: [[0, 3], [1, 2]], 11: [[1, 2]], 12: [[1, 3]], 13: [[0, 1]], 14: [[0, 3]] })[idx].forEach(([p, q]) => { ctx.moveTo(e[p][0], e[p][1]); ctx.lineTo(e[q][0], e[q][1]); });
        }
        ctx.stroke();
      });
      ctx.setLineDash([]);
      // field lines: from positive charges (or from negatives, backwards, if there are none)
      const pos = Q.filter((q) => q.q > 0), seeds = pos.length ? pos : Q.filter((q) => q.q < 0), dir = pos.length ? 1 : -1, box = [x0 - 0.5, x1 + 0.5, y0 - 0.5, y1 + 0.5];
      ctx.strokeStyle = pal.ink2; ctx.lineWidth = 1.1;
      seeds.forEach((q) => {
        const n = Math.round(10 * Math.abs(q.q));
        for (let k = 0; k < n; k++) {
          const a = ((k + 0.5) / n) * 2 * Math.PI, pts = EM.trace(Q, q.x + 0.05 * Math.cos(a), q.y + 0.05 * Math.sin(a), dir, box, 0.02, 1500);
          ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])))); ctx.stroke();
          // small arrowhead partway along
          const m = Math.min(pts.length - 2, 25); if (m > 2) { const [ax, ay] = pts[m], [bx, by] = pts[m + 1], an = Math.atan2(Y(by) - Y(ay), X(bx) - X(ax)) + (dir < 0 ? Math.PI : 0); ctx.save(); ctx.translate(X(ax), Y(ay)); ctx.rotate(an); ctx.fillStyle = pal.ink2; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-3, 3); ctx.lineTo(-3, -3); ctx.fill(); ctx.restore(); }
        }
      });
      // Gaussian sphere
      if (show.gauss) { ctx.strokeStyle = Lab.css('--accent'); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(G.x), Y(G.y), G.r * s, 0, 7); ctx.stroke(); ctx.fillStyle = Lab.css('--accent'); ctx.font = `11px ${Lab.css('--f-mono')}`; ctx.fillText('Gaussian sphere', X(G.x) - G.r * s, Y(G.y) - G.r * s - 6); }
      // charges
      Q.forEach((q) => {
        ctx.fillStyle = q.q > 0 ? pal.s2 : pal.s1; ctx.beginPath(); ctx.arc(X(q.x), Y(q.y), 7 + 2 * Math.abs(q.q), 0, 7); ctx.fill();
        ctx.fillStyle = pal.paper; ctx.font = `600 13px ${Lab.css('--f-mono')}`; ctx.textAlign = 'center'; ctx.fillText((q.q > 0 ? '+' : '−') + (Math.abs(q.q) > 1 ? Math.abs(q.q) : ''), X(q.x), Y(q.y) + 4.5); ctx.textAlign = 'left';
      });
      const flux = show.gauss ? EM.sphereFlux(Q, G.x, G.y, G.r, 36, 72) : 0, enc = Q.filter((q) => Math.hypot(q.x - G.x, q.y - G.y) < G.r).reduce((t, q) => t + q.q, 0);
      out.innerHTML = show.gauss ? `<span>charge inside the sphere <b>${enc > 0 ? '+' : ''}${enc}</b></span><span>flux through it ÷ 4π (computed) <b>${flux >= 0 ? '+' : ''}${flux.toFixed(3)}</b></span><span>drag charges or the sphere</span>` : '<span>drag the charges</span>';
    }
    const toWorld = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left - view.ox) / view.s, -(e.clientY - r.top - view.oy) / view.s]; };
    cv.addEventListener('pointerdown', (e) => {
      if (!view) return; const [x, y] = toWorld(e);
      const hit = Q.find((q) => Math.hypot(q.x - x, q.y - y) < 0.25);
      if (hit) drag = hit; else if (show.gauss && Math.abs(Math.hypot(G.x - x, G.y - y) - G.r) < 0.25 || Math.hypot(G.x - x, G.y - y) < G.r) drag = G;
      if (drag) { cv.setPointerCapture(e.pointerId); e.preventDefault(); }
    });
    cv.addEventListener('pointermove', (e) => { if (!drag) return; const [x, y] = toWorld(e); drag.x = Math.max(-3, Math.min(3, x)); drag.y = Math.max(-2, Math.min(2, y)); draw(); });
    cv.addEventListener('pointerup', () => (drag = null));
    Lab.$$('[data-ch]', root).forEach((b) => b.addEventListener('click', () => { Q = PRE[b.dataset.ch].map((q) => ({ ...q })); Lab.$$('[data-ch]', root).forEach((o) => o.setAttribute('aria-pressed', o === b ? 'true' : 'false')); draw(); }));
    Lab.$('#ch-g', root).addEventListener('change', (e) => { show.gauss = e.target.checked; draw(); });
    Lab.slider(Lab.$('#ch-r', root), (v) => v.toFixed(2), (v) => { G.r = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(cv, draw);
  })();

  /* ---------- Fig 3.1 Helmholtz coils ---------- */
  (function () {
    const root = Lab.$('#fig-helm');
    if (!root) return;
    const cv = Lab.$('canvas', root), svg = Lab.$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    const st = { d: 1.0, two: true };
    let ready = false;
    const coils = () => (st.two ? [st.d / 2, -st.d / 2] : [0]);
    const psi = (r, z) => coils().reduce((s, z0) => s + EM.loopPsi(1, z0, r, z), 0);
    const Bz = (z) => coils().reduce((s, z0) => s + EM.loopBz(1, z0, z), 0);
    function draw() {
      if (!ready || !cv.clientWidth) return;
      const { ctx, w, h } = Lab.canvas(cv, 1.0), pal = Lab.palette();
      ctx.clearRect(0, 0, w, h);
      const R = 2.2, s = w / (2 * R), X = (r) => w / 2 + r * s, Y = (z) => h / 2 - z * s;
      // field lines: contours of psi through evenly spaced points on the midplane
      const nx = 140, ny = 140, G = new Float64Array((nx + 1) * (ny + 1));
      for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) G[j * (nx + 1) + i] = psi(-R + (2 * R * i) / nx, -R + (2 * R * j) / ny);
      const levels = []; for (let k = 1; k <= 9; k++) { const v = psi(0.1 * k, 0); levels.push(v, -v); }
      ctx.strokeStyle = pal.ink2; ctx.lineWidth = 1.1; ctx.beginPath();
      levels.forEach((lv) => {
        for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
          const a = G[j * (nx + 1) + i], b = G[j * (nx + 1) + i + 1], c = G[(j + 1) * (nx + 1) + i + 1], d = G[(j + 1) * (nx + 1) + i];
          const idx = (a >= lv ? 1 : 0) | (b >= lv ? 2 : 0) | (c >= lv ? 4 : 0) | (d >= lv ? 8 : 0); if (!idx || idx === 15) continue;
          const L = (p, q) => (lv - p) / (q - p), px = (u) => X(-R + (2 * R * u) / nx), py = (v) => Y(-R + (2 * R * v) / ny);
          const e = [[px(i + L(a, b)), py(j)], [px(i + 1), py(j + L(b, c))], [px(i + L(d, c)), py(j + 1)], [px(i), py(j + L(a, d))]];
          ({ 1: [[0, 3]], 2: [[0, 1]], 3: [[1, 3]], 4: [[1, 2]], 5: [[0, 1], [2, 3]], 6: [[0, 2]], 7: [[2, 3]], 8: [[2, 3]], 9: [[0, 2]], 10: [[0, 3], [1, 2]], 11: [[1, 2]], 12: [[1, 3]], 13: [[0, 1]], 14: [[0, 3]] })[idx].forEach(([p, q]) => { ctx.moveTo(e[p][0], e[p][1]); ctx.lineTo(e[q][0], e[q][1]); });
        }
      });
      ctx.stroke();
      // the uniform region tested by the readout
      ctx.fillStyle = Lab.css('--accent-wash'); ctx.fillRect(X(-0.25), Y(0.25), 0.5 * s, 0.5 * s);
      // coil cross sections: current out of the page on the right, into the page on the left
      coils().forEach((z0) => {
        [[1, '•'], [-1, '×']].forEach(([r, sym]) => { ctx.fillStyle = pal.paper; ctx.strokeStyle = pal.s2; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(r), Y(z0), 8, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = pal.s2; ctx.font = `700 12px ${Lab.css('--f-mono')}`; ctx.textAlign = 'center'; ctx.fillText(sym, X(r), Y(z0) + 4); });
      });
      ctx.textAlign = 'left'; ctx.fillStyle = pal.ink3; ctx.font = `11px ${Lab.css('--f-mono')}`; ctx.fillText('side view: the axis runs up the middle', 8, 16);
      // axial field
      const f = EM.frame(svg, { h: Math.max(300, Math.round(w * 0.8)), m: { l: 46, r: 14, t: 30, b: 42 }, x: [-2, 2], y: [0, 1.25], xt: [-2, -1, 0, 1, 2], yt: [0, 0.25, 0.5, 0.75, 1, 1.25], yf: (v) => v.toFixed(2), xl: 'position along the axis (coil radii)', yl: 'Field on the axis, relative to the centre' });
      const c0 = Bz(0), pts = []; for (let z = -2; z <= 2.001; z += 0.02) pts.push([z, Bz(z) / c0]);
      const ref = []; for (let z = -2; z <= 2.001; z += 0.02) ref.push([z, (EM.loopBz(1, 0.5, z) + EM.loopBz(1, -0.5, z)) / (2 * EM.loopBz(1, 0.5, 0))]);
      if (st.two && Math.abs(st.d - 1) > 0.01) Lab.svg('path', { d: EM.path(ref.filter((p) => p[1] <= 1.25), f.X, f.Y), fill: 'none', stroke: f.pal.ink3, 'stroke-dasharray': '5 4' }, f.g);
      Lab.svg('path', { d: EM.path(pts.filter((p) => p[1] <= 1.25), f.X, f.Y), fill: 'none', stroke: f.pal.s1, 'stroke-width': 2.2 }, f.g);
      Lab.svg('rect', { x: f.X(-0.25), y: f.m.t, width: f.X(0.25) - f.X(-0.25), height: f.H - f.m.t - f.m.b, fill: Lab.css('--accent-wash') }, f.g);
      if (st.two && Math.abs(st.d - 1) > 0.01) T(f.g, f.X(1.1), f.Y(0.62), 'dashed: spacing = radius', f.pal.ink3, 'start', 10.5);
      EM.hover(svg, f, -2, 2, (z, sx, sy, px) => tip.show(px, f.Y(Math.min(1.2, Bz(z) / c0)) * sy - 8, `<b>z = ${z.toFixed(2)} R</b><br>field ${(Bz(z) / c0 * 100).toFixed(1)}% of centre`, f.Y(Bz(z) / c0) * sy + 12), () => tip.hide());
      let mn = Infinity, mx = -Infinity; for (let z = -0.25; z <= 0.2501; z += 0.005) { const v = Bz(z); mn = Math.min(mn, v); mx = Math.max(mx, v); }
      // physical scale: 100 turns, 10 cm radius, 1 A
      const mu0 = 4e-7 * Math.PI, Bc = (mu0 * 100 * 1 / (4 * Math.PI)) * c0 / 0.1 * 1e6;
      out.innerHTML = `<span>variation within ±¼ radius of the centre <b>${((mx - mn) / c0 * 100).toFixed(st.two && Math.abs(st.d - 1) < 0.02 ? 3 : 1)}%</b></span><span>centre field for 100 turns, 10 cm radius, 1 A <b>${Bc.toFixed(0)} µT</b></span>`;
    }
    Lab.slider(Lab.$('#hz-d', root), (v) => v.toFixed(2) + ' R', (v) => { st.d = v; draw(); });
    Lab.$('#hz-two', root).addEventListener('change', (e) => { st.two = e.target.checked; Lab.$('#hz-d', root).disabled = !st.two; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(cv, draw);
  })();
})();
