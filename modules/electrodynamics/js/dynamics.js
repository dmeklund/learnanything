/* Volume IX figures: Faraday induction, a 1-D FDTD light pulse at a glass surface, and a phased antenna array. */
(function () {
  const T = (g, x, y, s, fill, anchor, size) => EM.text(g, x, y, s, fill, anchor, size);

  /* ---------- Fig 4.1 A magnet falling through a coil ---------- */
  (function () {
    const root = Lab.$('#fig-induct');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    const MU0 = 4e-7 * Math.PI, M = 1.0, N = 200, G = 9.81; // dipole moment (A m^2) of a small neodymium magnet; turns
    const st = { h: 0.2, a: 0.015 };
    let ready = false;
    const phi = (z) => (MU0 * M * st.a * st.a) / (2 * Math.pow(st.a * st.a + z * z, 1.5));
    const dphi = (z) => (-1.5 * MU0 * M * st.a * st.a * z) / Math.pow(st.a * st.a + z * z, 2.5);
    function draw() {
      if (!ready) return;
      // free fall from rest at height h above the coil centre, followed until 10 cm below it
      const tEnd = Math.sqrt((2 * (st.h + 0.1)) / G), pts = [];
      for (let i = 0; i <= 1200; i++) { const t = (tEnd * i) / 1200, z = st.h - 0.5 * G * t * t, v = -G * t; pts.push({ t, z, f: N * phi(z), e: -N * dphi(z) * v }); }
      const tc = Math.sqrt((2 * st.h) / G), win = Math.max(0.02, 6 * st.a / (G * tc)), t0 = Math.max(0, tc - win), t1 = Math.min(tEnd, tc + win);
      const vis = pts.filter((p) => p.t >= t0 && p.t <= t1);
      const fmax = Math.max(...vis.map((p) => p.f)), emax = Math.max(...vis.map((p) => Math.abs(p.e)));
      const W = Math.max(280, svg.clientWidth || 600), H = 380; svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H); svg.innerHTML = '';
      const pal = Lab.palette(), g = Lab.svg('g', {}, svg), m = { l: 58, r: 70 }, X = Lab.scale(t0, t1, m.l, W - m.r);
      const top = { t: 30, b: 150 }, bot = { t: 200, b: 340 };
      const Y1 = Lab.scale(0, fmax * 1.1, top.b, top.t), Y2 = Lab.scale(-emax * 1.15, emax * 1.15, bot.b, bot.t);
      T(g, m.l, top.t - 10, 'Magnetic flux through the coil (µWb·turns)', pal.ink2);
      T(g, m.l, bot.t - 10, 'Voltage across the coil, EMF = −N dΦ/dt (mV)', pal.ink2);
      [0, 0.5, 1].forEach((v) => { const y = Y1(v * fmax); Lab.svg('line', { x1: m.l, x2: W - m.r, y1: y, y2: y, stroke: pal.grid }, g); T(g, m.l - 6, y + 4, (v * fmax * 1e6).toFixed(0), pal.ink3, 'end', 10.5); });
      [-1, 0, 1].forEach((v) => { const y = Y2(v * emax); Lab.svg('line', { x1: m.l, x2: W - m.r, y1: y, y2: y, stroke: v ? pal.grid : pal.ink3 }, g); T(g, m.l - 6, y + 4, (v * emax * 1e3).toFixed(0), pal.ink3, 'end', 10.5); });
      const ticks = 5; for (let k = 0; k <= ticks; k++) { const t = t0 + ((t1 - t0) * k) / ticks; T(g, X(t), bot.b + 16, ((t - tc) * 1000).toFixed(0), pal.ink3, 'middle', 10.5); }
      T(g, W - m.r, bot.b + 32, 'milliseconds from the moment the magnet is at the coil centre', pal.ink2, 'end', 10.5);
      Lab.svg('path', { d: vis.map((p, i) => (i ? 'L' : 'M') + X(p.t).toFixed(1) + ' ' + Y1(p.f).toFixed(1)).join(''), fill: 'none', stroke: pal.s1, 'stroke-width': 2 }, g);
      Lab.svg('path', { d: vis.map((p, i) => (i ? 'L' : 'M') + X(p.t).toFixed(1) + ' ' + Y2(p.e).toFixed(1)).join(''), fill: 'none', stroke: pal.s2, 'stroke-width': 2 }, g);
      Lab.svg('line', { x1: X(tc), x2: X(tc), y1: top.t, y2: bot.b, stroke: pal.ink3, 'stroke-dasharray': '3 3' }, g);
      const ext = (arr) => arr.reduce((a, b) => (Math.abs(b.e) > Math.abs(a.e) ? b : a));
      const pk1 = ext(vis.filter((p) => p.t < tc)), pk2 = ext(vis.filter((p) => p.t > tc));
      T(g, X(pk1.t) - 8, Y2(pk1.e) + (pk1.e < 0 ? 4 : -6), 'entering', pal.ink2, 'end', 10.5); T(g, X(pk2.t) + 8, Y2(pk2.e) + (pk2.e < 0 ? 14 : 4), 'leaving', pal.ink2, 'start', 10.5);
      const cross = Lab.svg('line', { y1: top.t, y2: bot.b, stroke: pal.ink3, visibility: 'hidden' }, g);
      const hit = Lab.svg('rect', { x: m.l, y: top.t, width: W - m.l - m.r, height: bot.b - top.t, fill: 'transparent' }, svg);
      hit.addEventListener('mousemove', (e) => { const r = svg.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * W, t = t0 + ((px - m.l) / (W - m.l - m.r)) * (t1 - t0), p = vis.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a)); cross.setAttribute('x1', X(p.t)); cross.setAttribute('x2', X(p.t)); cross.setAttribute('visibility', 'visible'); tip.show(e.clientX - r.left, (top.t / H) * r.height + 40, `<b>${((p.t - tc) * 1000).toFixed(1)} ms</b><br>magnet ${(p.z * 100).toFixed(1)} cm from centre<br>flux ${(p.f * 1e6).toFixed(1)} µWb<br>EMF ${(p.e * 1e3).toFixed(1)} mV`, (top.t / H) * r.height + 60); });
      hit.addEventListener('mouseleave', () => { tip.hide(); cross.setAttribute('visibility', 'hidden'); });
      let area = 0, half = 0; for (let i = 1; i < pts.length; i++) { const d = 0.5 * (pts[i].e + pts[i - 1].e) * (pts[i].t - pts[i - 1].t); area += d; if (pts[i].t <= tc) half += d; }
      const fmt = (e) => (e > 0 ? '+' : '−') + Math.abs(e * 1e3).toFixed(0);
      out.innerHTML = `<span>speed at the coil <b>${(G * tc).toFixed(2)} m/s</b></span><span>peak EMF entering <b>${fmt(pk1.e)} mV</b></span><span>leaving <b>${fmt(pk2.e)} mV</b></span><span>net ∫EMF dt, as a share of one pulse <b>${Math.abs((area / half) * 100).toFixed(1)}%</b></span>`;
    }
    Lab.slider(Lab.$('#in-h', root), (v) => v + ' cm', (v) => { st.h = v / 100; draw(); });
    Lab.slider(Lab.$('#in-a', root), (v) => v.toFixed(1) + ' cm', (v) => { st.a = v / 100; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();

  /* ---------- Fig 5.1 A light pulse meets glass ---------- */
  (function () {
    const root = Lab.$('#fig-fdtd');
    if (!root) return;
    const cv = Lab.$('canvas', root), out = Lab.$('.readouts', root);
    const N = 1500, I = 820, SRC = 160, LAM = 60, PER = 2 * LAM, WID = 150; // wavelength in cells; at Courant number 0.5 the period is 2 * LAM steps
    const st = { n: 1.5, coat: false };
    let sim = null, raf = 0, running = false, Rnum = 0;
    const src = { i: SRC, v: (t) => Math.exp(-(((t - 4 * WID) / WID) ** 2)) * Math.sin((2 * Math.PI * t) / PER) * 0.5 };
    const epsFor = (NN, II) => {
      const e = new Float64Array(NN).fill(1), n2 = st.n * st.n;
      for (let i = II; i < NN; i++) e[i] = n2;
      if (st.coat) { const nc = Math.sqrt(st.n), q = Math.round(LAM / (4 * nc)); for (let i = II - q; i < II; i++) e[i] = nc * nc; e[II - q] = (1 + nc * nc) / 2; e[II] = (nc * nc + n2) / 2; }
      else e[II] = (1 + n2) / 2;
      return e;
    };
    // measure the reflected energy fraction in a long separate run
    function measure() {
      const NN = 6400, II = 3200, s = EM.fdtd1(NN, epsFor(NN, II)); let E0 = 0;
      const T1 = Math.round(8 * WID + (II - SRC) * 0.4), T2 = Math.round(8 * WID + (II - SRC) * 2 + (II - SRC) * 1.1);
      for (let t = 0; t < T2; t++) { s.step({ i: SRC, v: src.v }); if (t === T1) { E0 = 0; for (let i = 0; i < II - 60; i++) E0 += s.E[i] ** 2 + s.H[i] ** 2; } }
      let Er = 0; for (let i = 0; i < II - 60; i++) Er += s.E[i] ** 2 + s.H[i] ** 2;
      return Er / E0;
    }
    function reset() { sim = EM.fdtd1(N, epsFor(N, I)); Rnum = measure(); }
    function draw() {
      if (!sim || !cv.clientWidth) return;
      const { ctx, w, h } = Lab.canvas(cv, cv.clientWidth < 560 ? 0.6 : 0.34), pal = Lab.palette();
      ctx.clearRect(0, 0, w, h);
      const X = (i) => (i / (N - 1)) * w, mid = h * 0.55, A = h * 0.38;
      ctx.fillStyle = Lab.css('--accent-wash'); ctx.fillRect(X(I), 8, w - X(I), h - 16);
      if (st.coat) { const nc = Math.sqrt(st.n), q = Math.round(LAM / (4 * nc)); ctx.fillStyle = Lab.rgbStr(Lab.rgb('--s3'), 0.25); ctx.fillRect(X(I - q), 8, X(I) - X(I - q), h - 16); }
      ctx.strokeStyle = pal.grid; ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(w, mid); ctx.stroke();
      ctx.strokeStyle = pal.s2; ctx.lineWidth = 1.8; ctx.beginPath();
      for (let i = 0; i < N; i++) { const y = mid - A * sim.E[i] / 0.5; i ? ctx.lineTo(X(i), y) : ctx.moveTo(X(i), y); }
      ctx.stroke(); ctx.lineWidth = 1;
      ctx.font = `11px ${Lab.css('--f-mono')}`; ctx.fillStyle = pal.ink2;
      ctx.fillText('vacuum', 8, 20); ctx.fillText(`glass, n = ${st.n.toFixed(2)}`, X(I) + 8, 20);
      if (st.coat) ctx.fillText('coating', X(I) - 60, h - 14);
      ctx.fillStyle = pal.ink3; ctx.fillText(`electric field, time step ${sim.t}`, 8, h - 12);
      const F = ((st.n - 1) / (st.n + 1)) ** 2;
      out.innerHTML = `<span>reflected energy, simulated <b>${(Rnum * 100).toFixed(1)}%</b></span><span>Fresnel formula ((n−1)/(n+1))², bare surface <b>${(F * 100).toFixed(1)}%</b></span><span>speed in the glass <b>c / ${st.n.toFixed(2)}</b></span>`;
    }
    const loop = () => { if (!running) return; for (let k = 0; k < 6; k++) { sim.step(src); } if (sim.t > 4200) sim = EM.fdtd1(N, epsFor(N, I)); draw(); raf = requestAnimationFrame(loop); };
    Lab.slider(Lab.$('#fd-n', root), (v) => v.toFixed(2), (v) => { st.n = v; reset(); if (Lab.reducedMotion || !running) { for (let t = 0; t < 3000; t++) sim.step(src); } draw(); });
    Lab.$('#fd-c', root).addEventListener('change', (e) => { st.coat = e.target.checked; reset(); if (Lab.reducedMotion || !running) { for (let t = 0; t < 3000; t++) sim.step(src); } draw(); });
    // the slider binding above already ran the first frame to the moment the two pulses have separated
    draw();
    if (!Lab.reducedMotion) Lab.whenVisible(cv, () => { if (!running) { running = true; loop(); } }, () => { running = false; cancelAnimationFrame(raf); });
    Lab.onTheme(draw); Lab.onResize(cv, draw);
  })();

  /* ---------- Fig 6.1 A phased array ---------- */
  (function () {
    const root = Lab.$('#fig-array');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root);
    const st = { n: 4, d: 0.5, ph: 0 };
    let ready = false;
    const pattern = (th) => { // th from the array axis; returns normalized power
      const psi = 2 * Math.PI * st.d * Math.cos(th) + (st.ph * Math.PI) / 180; let re = 0, im = 0;
      for (let k = 0; k < st.n; k++) { re += Math.cos(k * psi); im += Math.sin(k * psi); }
      return (re * re + im * im) / (st.n * st.n);
    };
    function draw() {
      if (!ready) return;
      const W = Math.max(280, svg.clientWidth || 600), H = Math.min(380, Math.round(W * 0.62)) + 30;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H); svg.innerHTML = '';
      const pal = Lab.palette(), g = Lab.svg('g', {}, svg), cx = W / 2, cy = H - 40, R = Math.min(W / 2 - 30, H - 70);
      // upper half-plane polar grid (the pattern is symmetric about the array axis)
      [0.25, 0.5, 0.75, 1].forEach((r) => Lab.svg('path', { d: `M${cx - r * R} ${cy}A${r * R} ${r * R} 0 0 1 ${cx + r * R} ${cy}`, fill: 'none', stroke: pal.grid }, g));
      [0, 30, 60, 90, 120, 150, 180].forEach((a) => { const t = (a * Math.PI) / 180; Lab.svg('line', { x1: cx, y1: cy, x2: cx + R * Math.cos(t), y2: cy - R * Math.sin(t), stroke: pal.grid }, g); T(g, cx + (R + 14) * Math.cos(t), cy - (R + 14) * Math.sin(t) + 4, a + '°', pal.ink3, 'middle', 10); });
      const pts = []; let best = 0, bestTh = 0;
      for (let i = 0; i <= 720; i++) { const th = (i / 720) * Math.PI, p = pattern(th); if (p > best) { best = p; bestTh = th; } pts.push([cx + R * p * Math.cos(th), cy - R * p * Math.sin(th)]); }
      Lab.svg('path', { d: pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('') + 'Z', fill: Lab.rgbStr(Lab.rgb('--s1'), 0.14), stroke: pal.s1, 'stroke-width': 2 }, g);
      // elements along the axis
      const span = Math.min(R * 0.8, 24 * (st.n - 1));
      for (let k = 0; k < st.n; k++) { const x = cx - span / 2 + (st.n > 1 ? (span * k) / (st.n - 1) : span / 2); Lab.svg('circle', { cx: x, cy, r: 4, fill: pal.s2 }, g); }
      T(g, cx, cy + 22, `${st.n} antenna${st.n > 1 ? 's' : ''} along this axis`, pal.ink2, 'middle', 10.5);
      // lobes: local maxima above half the peak
      const lob = []; for (let i = 1; i < 720; i++) { const a = pattern(((i - 1) / 720) * Math.PI), b = pattern((i / 720) * Math.PI), c = pattern(((i + 1) / 720) * Math.PI); if (b >= a && b > c && b > 0.5) lob.push(i / 4); }
      let lo = bestTh, hi = bestTh; while (lo > 0 && pattern(lo) > 0.5) lo -= 0.001; while (hi < Math.PI && pattern(hi) > 0.5) hi += 0.001;
      out.innerHTML = `<span>main beam at <b>${((bestTh * 180) / Math.PI).toFixed(0)}°</b> from the axis</span><span>half-power width <b>${(((hi - lo) * 180) / Math.PI).toFixed(0)}°</b></span><span>strong lobes <b>${lob.length}</b>${st.d > 0.5 && lob.length > 1 ? ' (grating lobes)' : ''}</span>`;
    }
    Lab.slider(Lab.$('#ar-n', root), (v) => v + '', (v) => { st.n = v; draw(); });
    Lab.slider(Lab.$('#ar-d', root), (v) => v.toFixed(2) + ' λ', (v) => { st.d = v; draw(); });
    Lab.slider(Lab.$('#ar-p', root), (v) => v + '°', (v) => { st.ph = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();
})();
