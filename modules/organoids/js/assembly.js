/* Volume XIII figures, Part I: cell sorting in the cellular Potts model, and oxygen diffusion into an organoid. */
(function () {
  const T = (g, x, y, s, fill, anchor, size) => OG.text(g, x, y, s, fill, anchor, size);

  /* ---------- Fig 1.1 Sorting by differential adhesion (cellular Potts model) ---------- */
  (function () {
    const root = Lab.$('#fig-cpm');
    if (!root) return;
    const cv = Lab.$('.cpm-cv', root), svg = Lab.$('.cpm-chart', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    const G = 112, N = G * G, A = 20, LAM = 2, MAX = 2000;
    const st = { jdl: 11, T: 8 };
    // contact energies by type: 0 medium, 1 dark, 2 light (Graner and Glazier 1992)
    const J = [[0, 16, 16], [16, 2, 11], [16, 11, 14]];
    const NB = [-G - 1, -G, -G + 1, -1, 1, G - 1, G, G + 1];
    let sigma, type, area, mcs = 0, hist = [], r, running = false, raf = 0, playing = true, ready = false;

    function init() {
      r = Lab.rng(7 + Math.floor(Math.random() * 1e6));
      sigma = new Int32Array(N); type = [0]; area = [0]; mcs = 0; hist = [];
      // tile a disk with 4×5 blocks, each a cell of random type
      const c = G / 2, rad = Math.sqrt((360 * A) / Math.PI);
      let id = 0; const cells = [];
      for (let y = 2; y < G - 6; y += 5) for (let x = 2; x < G - 5; x += 4) if (Math.hypot(x + 2 - c, y + 2.5 - c) < rad) cells.push([x, y]);
      const types = cells.map((_, i) => (i % 2 ? 1 : 2));
      for (let i = types.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [types[i], types[j]] = [types[j], types[i]]; }
      cells.forEach(([x0, y0], i) => { id++; type.push(types[i]); area.push(0); for (let y = y0; y < y0 + 5; y++) for (let x = x0; x < x0 + 4; x++) { sigma[y * G + x] = id; area[id]++; } });
      hist.push([0, hetero().share]);
    }
    // one Monte Carlo step: N copy attempts with Metropolis acceptance
    function step() {
      const Jdl = st.jdl, temp = st.T; J[1][2] = J[2][1] = Jdl;
      for (let a = 0; a < N; a++) {
        const x = 1 + Math.floor(r() * (G - 2)), y = 1 + Math.floor(r() * (G - 2)), i = y * G + x;
        const n = i + NB[Math.floor(r() * 8)], si = sigma[i], sn = sigma[n];
        if (si === sn) continue;
        const ti = type[si], tn = type[sn];
        let dH = 0;
        for (let k = 0; k < 8; k++) { const sk = sigma[i + NB[k]], tk = type[sk]; if (sk !== si) dH -= J[ti][tk]; if (sk !== sn) dH += J[tn][tk]; }
        if (si) dH += LAM * (1 - 2 * (area[si] - A));
        if (sn) dH += LAM * (1 + 2 * (area[sn] - A));
        if (dH <= 0 || r() < Math.exp(-dH / temp)) { sigma[i] = sn; if (si) area[si]--; if (sn) area[sn]++; }
      }
      mcs++;
    }
    // share of dark-cell boundary (4-neighbor edges to other cells or medium) that touches light cells,
    // and the mean distance of dark and light pixels from the aggregate's center
    function hetero() {
      let dl = 0, dAll = 0, sx = 0, sy = 0, n = 0;
      for (let y = 1; y < G - 1; y++) for (let x = 1; x < G - 1; x++) {
        const i = y * G + x, s = sigma[i]; if (!s) continue; sx += x; sy += y; n++;
        if (type[s] !== 1) continue;
        [i - 1, i + 1, i - G, i + G].forEach((k) => { const sk = sigma[k]; if (sk === s) return; dAll++; if (type[sk] === 2) dl++; });
      }
      const cx = sx / n, cy = sy / n; let rd = 0, nd = 0, rl = 0, nl = 0;
      for (let y = 1; y < G - 1; y++) for (let x = 1; x < G - 1; x++) { const s = sigma[y * G + x]; if (!s) continue; const d = Math.hypot(x - cx, y - cy); if (type[s] === 1) { rd += d; nd++; } else { rl += d; nl++; } }
      return { share: dAll ? dl / dAll : 0, rd: rd / nd, rl: rl / nl };
    }
    function drawGrid() {
      if (!cv.clientWidth) return;
      const { ctx, w } = Lab.canvas(cv, 1), px = w / G, pal = Lab.palette();
      const dark = Lab.rgbStr(Lab.rgb('--s1')), light = Lab.rgbStr(Lab.mix(Lab.rgb('--s2'), Lab.rgb('--paper-3'), 0.35));
      ctx.fillStyle = pal.paper3; ctx.fillRect(0, 0, w, w);
      for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) { const s = sigma[y * G + x]; if (!s) continue; ctx.fillStyle = type[s] === 1 ? dark : light; ctx.fillRect(x * px, y * px, px + 0.5, px + 0.5); }
      // membranes: a line wherever two neighboring pixels belong to different cells
      ctx.strokeStyle = pal.paper3; ctx.lineWidth = Math.max(0.6, px * 0.28); ctx.beginPath();
      for (let y = 0; y < G - 1; y++) for (let x = 0; x < G - 1; x++) {
        const s = sigma[y * G + x];
        if (s !== sigma[y * G + x + 1] && (s || sigma[y * G + x + 1])) { ctx.moveTo((x + 1) * px, y * px); ctx.lineTo((x + 1) * px, (y + 1) * px); }
        if (s !== sigma[(y + 1) * G + x] && (s || sigma[(y + 1) * G + x])) { ctx.moveTo(x * px, (y + 1) * px); ctx.lineTo((x + 1) * px, (y + 1) * px); }
      }
      ctx.stroke();
      ctx.fillStyle = pal.ink2; ctx.font = `11px ${Lab.css('--f-mono')}`; ctx.fillText(`step ${mcs}`, 8, 16);
    }
    function drawChart() {
      const f = OG.frame(svg, { h: 300, m: { l: 44, r: 14, t: 30, b: 42 }, x: [0, MAX], y: [0, 0.7], xt: [0, 500, 1000, 1500, 2000], yt: [0, 0.2, 0.4, 0.6], yf: (v) => Math.round(v * 100) + '%', xl: 'Monte Carlo steps', yl: 'Dark-cell boundary touching light cells' });
      Lab.svg('path', { d: OG.path(hist, f.X, f.Y), fill: 'none', stroke: f.pal.s1, 'stroke-width': 2 }, f.g);
      const lastP = hist[hist.length - 1];
      Lab.svg('circle', { cx: f.X(lastP[0]), cy: f.Y(lastP[1]), r: 4, fill: f.pal.s1, stroke: f.pal.paper3, 'stroke-width': 2 }, f.g);
      OG.hover(svg, f, 0, MAX, (x, sx, sy, px) => { let best = hist[0]; hist.forEach((p) => { if (Math.abs(p[0] - x) < Math.abs(best[0] - x)) best = p; }); tip.show(f.X(best[0]) * sx, f.Y(best[1]) * sy - 8, `<b>step ${best[0]}</b><br>${Math.round(best[1] * 100)}% heterotypic`, f.Y(best[1]) * sy + 12); }, () => tip.hide());
    }
    function readout() {
      const h = hetero();
      const verdict = st.jdl < 8 ? 'heterotypic contact is cheapest: the cells stay mixed' : st.jdl <= 16 ? 'J<sub>dd</sub> &lt; J<sub>dl</sub> &lt; J<sub>ll</sub>: dark cells sort inward, light cells cover them' : 'J<sub>dl</sub> above the medium energy: the two types pull apart';
      out.innerHTML = `<span>step <b>${mcs}</b></span><span>dark boundary touching light <b>${Math.round(h.share * 100)}%</b></span><span>mean distance from center, dark / light <b>${h.rd.toFixed(1)} / ${h.rl.toFixed(1)} px</b></span><span>prediction <b>${verdict}</b></span>`;
    }
    const redraw = () => { if (!ready) return; drawGrid(); drawChart(); readout(); };
    function tick() {
      if (!running) return;
      const t0 = performance.now(), m0 = mcs;
      while (mcs < MAX && mcs - m0 < 8 && performance.now() - t0 < 14) { step(); if (mcs % 10 === 0) hist.push([mcs, hetero().share]); }
      redraw();
      if (mcs >= MAX) { setPlay(false); return; }
      raf = requestAnimationFrame(tick);
    }
    const playBtn = Lab.$('#cp-play', root);
    let visible = false;
    function setPlay(p) { playing = p; playBtn.textContent = p ? 'Pause' : 'Play'; playBtn.setAttribute('aria-pressed', p ? 'true' : 'false'); if (p && visible && !running && mcs < MAX) { running = true; raf = requestAnimationFrame(tick); } if (!p) { running = false; cancelAnimationFrame(raf); } }
    playBtn.addEventListener('click', () => { if (mcs >= MAX) { init(); } setPlay(!playing || mcs === 0); });
    Lab.$('#cp-reset', root).addEventListener('click', () => { init(); redraw(); if (Lab.reducedMotion) { while (mcs < 1500) { step(); if (mcs % 10 === 0) hist.push([mcs, hetero().share]); } redraw(); } else setPlay(true); });
    Lab.slider(Lab.$('#cp-j', root), (v) => String(v), (v) => { st.jdl = v; if (ready) { readout(); if (mcs >= MAX) { init(); redraw(); setPlay(true); } } });
    Lab.slider(Lab.$('#cp-t', root), (v) => String(v), (v) => { st.T = v; });
    init();
    ready = true;
    if (Lab.reducedMotion) { while (mcs < 1500) { step(); if (mcs % 10 === 0) hist.push([mcs, hetero().share]); } playing = false; playBtn.textContent = 'Play'; }
    redraw();
    if (!Lab.reducedMotion) Lab.whenVisible(cv, () => { visible = true; if (playing && !running && mcs < MAX) { running = true; raf = requestAnimationFrame(tick); } }, () => { visible = false; running = false; cancelAnimationFrame(raf); });
    Lab.onTheme(redraw); Lab.onResize(cv, redraw);
  })();

  /* ---------- Fig 2.1 Oxygen inside an organoid ---------- */
  (function () {
    const root = Lab.$('#fig-oxygen');
    if (!root) return;
    const cv = Lab.$('.oxy-cv', root), svg = Lab.$('.oxy-chart', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    const D = 1.07e-9, HYP = 0.04, RMAX = 1200; // m²/s, mol/m³, µm
    const st = { R: 500, Q: 6.9e-3, O: 21 };
    let ready = false;
    // steady state with zero-order uptake: a parabola, or a parabola-plus-1/r profile around an anoxic core of radius r0
    function solve() {
      const R = st.R * 1e-6, C0 = 0.2 * st.O / 21, k = st.Q / (6 * D);
      const Rstar = Math.sqrt(C0 / k);
      let r0 = 0;
      if (R > Rstar) { let lo = 0, hi = R; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (k * (R * R - 3 * m * m + 2 * m ** 3 / R) - C0 > 0) lo = m; else hi = m; } r0 = (lo + hi) / 2; }
      const C = (rm) => { const x = Math.abs(rm) * 1e-6; if (x <= r0) return 0; return r0 ? k * (x * x + 2 * r0 ** 3 / x - 3 * r0 * r0) : C0 - k * (R * R - x * x); };
      // radius inside which cells are hypoxic
      let rh = 0; if (C(0) < HYP) { let lo = 0, hi = st.R; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (C(m) < HYP) lo = m; else hi = m; } rh = (lo + hi) / 2; }
      return { C0, Rstar: Rstar * 1e6, r0: r0 * 1e6, rh, C };
    }
    function draw() {
      if (!ready) return;
      const s = solve(), pal = Lab.palette();
      // cross-section, drawn to a fixed scale so that the organoid's size is visible
      if (cv.clientWidth) {
        const { ctx, w, h } = Lab.canvas(cv, 1); ctx.clearRect(0, 0, w, h);
        const cx = w / 2, cy = h / 2, sc = (w * 0.46) / RMAX, s1 = Lab.rgb('--s1'), p3 = Lab.rgb('--paper-3'), ink3 = Lab.rgb('--ink-3');
        ctx.fillStyle = Lab.rgbStr(Lab.rgb('--gel'), 0.35); ctx.beginPath(); ctx.arc(cx, cy, w * 0.49, 0, 7); ctx.fill();
        for (let i = 80; i >= 1; i--) { const rr = (i / 80) * st.R, c = s.C(rr); ctx.fillStyle = c <= 0 ? Lab.rgbStr(ink3, 0.6) : Lab.rgbStr(Lab.mix(p3, s1, Math.min(1, c / 0.38) * 0.9 + 0.1), 1); ctx.beginPath(); ctx.arc(cx, cy, rr * sc, 0, 7); ctx.fill(); }
        ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, st.R * sc, 0, 7); ctx.stroke();
        if (s.rh > 0) { ctx.setLineDash([4, 3]); ctx.strokeStyle = pal.s2; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(cx, cy, s.rh * sc, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
        // the critical radius for an anoxic core, as a faint reference circle
        if (s.Rstar < RMAX) { ctx.setLineDash([2, 4]); ctx.strokeStyle = pal.ink3; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, s.Rstar * sc, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
        ctx.font = `11px ${Lab.css('--f-mono')}`; ctx.fillStyle = pal.ink2;
        ctx.fillText('1 mm', 10, h - 12); ctx.strokeStyle = pal.ink2; ctx.beginPath(); ctx.moveTo(10, h - 24); ctx.lineTo(10 + 1000 * sc, h - 24); ctx.stroke();
        if (s.r0 > 0) { ctx.fillStyle = pal.paper3; ctx.textAlign = 'center'; ctx.fillText('anoxic', cx, cy + 4); ctx.textAlign = 'start'; }
        if (s.Rstar < RMAX) { ctx.fillStyle = pal.ink3; ctx.fillText('R* (dotted)', w - 84, 16); }
        if (s.rh > 0) { ctx.fillStyle = pal.ink2; ctx.fillText('hypoxic (dashed)', w - 112, 32); }
      }
      const f = OG.frame(svg, { h: 300, m: { l: 50, r: 14, t: 30, b: 42 }, x: [-RMAX, RMAX], y: [0, 0.4], xt: [-1200, -600, 0, 600, 1200], yt: [0, 0.1, 0.2, 0.3, 0.4], xf: (v) => String(v), yf: (v) => v.toFixed(1), xl: 'Position across the organoid (µm)', yl: 'Oxygen (mol/m³)' });
      Lab.svg('line', { x1: f.X(-RMAX), x2: f.X(RMAX), y1: f.Y(HYP), y2: f.Y(HYP), stroke: f.pal.s2, 'stroke-dasharray': '5 4', 'stroke-width': 1.4 }, f.g);
      T(f.g, f.X(-RMAX) + 4, f.Y(HYP) - 6, 'hypoxic threshold 0.04', f.pal.ink2, 'start', 10.5);
      Lab.svg('line', { x1: f.X(-RMAX), x2: f.X(RMAX), y1: f.Y(s.C0), y2: f.Y(s.C0), stroke: f.pal.ink3, 'stroke-dasharray': '2 3' }, f.g);
      T(f.g, f.X(RMAX) - 4, f.Y(s.C0) - 6, `medium ${s.C0.toFixed(2)}`, f.pal.ink2, 'end', 10.5);
      const pts = []; for (let i = 0; i <= 400; i++) { const x = -st.R + (2 * st.R * i) / 400; pts.push([x, s.C(x)]); }
      Lab.svg('path', { d: OG.path(pts, f.X, f.Y), fill: 'none', stroke: f.pal.s1, 'stroke-width': 2 }, f.g);
      [-st.R, st.R].forEach((x) => Lab.svg('line', { x1: f.X(x), x2: f.X(x), y1: f.m.t, y2: f.H - f.m.b, stroke: f.pal.ink3, 'stroke-width': 1 }, f.g));
      OG.hover(svg, f, -RMAX, RMAX, (x, sx, sy, px) => { if (Math.abs(x) > st.R) { tip.hide(); return; } const c = s.C(x); tip.show(px, f.Y(c) * sy - 8, `<b>${Math.round(Math.abs(x))} µm from center</b><br>${c.toFixed(3)} mol/m³${c < HYP ? (c <= 0 ? ' · anoxic' : ' · hypoxic') : ''}`, f.Y(c) * sy + 12); }, () => tip.hide());
      const viable = 1 - (s.rh / st.R) ** 3;
      out.innerHTML = `<span>surface oxygen <b>${s.C0.toFixed(3)} mol/m³</b></span><span>largest radius without an anoxic core <b>${Math.round(s.Rstar)} µm</b></span><span>anoxic core <b class="${s.r0 > 0 ? 'warn' : ''}">${s.r0 > 0 ? Math.round(s.r0) + ' µm radius' : 'none'}</b></span><span>volume above the hypoxic threshold <b class="${viable < 0.9 ? 'warn' : ''}">${Math.round(viable * 100)}%</b></span>`;
    }
    Lab.slider(Lab.$('#ox-r', root), (v) => v + ' µm', (v) => { st.R = v; draw(); });
    Lab.slider(Lab.$('#ox-q', root), (v) => v.toFixed(1) + '×10⁻³ mol/m³/s', (v) => { st.Q = v * 1e-3; draw(); });
    Lab.slider(Lab.$('#ox-o', root), (v) => v + '%', (v) => { st.O = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();
})();
