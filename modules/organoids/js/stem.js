/* Volume XIII figures, Part II: neutral drift of stem cell clones in the crypt, and positional information from a
   morphogen gradient. */
(function () {
  const T = (g, x, y, s, fill, anchor, size) => OG.text(g, x, y, s, fill, anchor, size);

  /* ---------- Fig 3.1 Neutral drift in the crypt ---------- */
  (function () {
    const root = Lab.$('#fig-drift');
    if (!root) return;
    const cv = Lab.$('.drift-cv', root), svg = Lab.$('.drift-chart', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    const CRYPTS = 24, DAYS = 240, RUNS = 400, DT = 0.5;
    const st = { n: 14, k: 0.3 };
    let rings, day = 0, run = [], avg = [], r, running = false, raf = 0, playing = true, visible = false, ready = false, frame = 0;
    const COLS = () => [Lab.rgb('--s1'), Lab.rgb('--s2'), Lab.rgb('--s3'), Lab.rgb('--ink-3')];
    const mono = (ring) => ring.every((v) => v === ring[0]);
    // advance one ring by dt days: each cell divides at rate k and its daughter replaces a random neighbor
    function evolve(ring, dt, rand) {
      const n = ring.length; let t = -Math.log(rand()) / (n * st.k);
      while (t < dt) { const i = Math.floor(rand() * n), j = (i + (rand() < 0.5 ? 1 : n - 1)) % n; ring[j] = ring[i]; t += -Math.log(rand()) / (n * st.k); }
    }
    // the expected curve: share of crypts single-colored by each day, averaged over many simulated crypts
    function average() {
      const rand = Lab.rng(99), hits = new Array(DAYS + 1).fill(0);
      for (let c = 0; c < RUNS; c++) {
        const ring = Array.from({ length: st.n }, () => Math.floor(rand() * 4));
        let t = 0, n = ring.length;
        while (t <= DAYS && !mono(ring)) { t += -Math.log(rand()) / (n * st.k); const i = Math.floor(rand() * n), j = (i + (rand() < 0.5 ? 1 : n - 1)) % n; ring[j] = ring[i]; }
        for (let d = Math.ceil(t); d <= DAYS; d++) hits[d]++;
      }
      avg = hits.map((h, d) => [d, h / RUNS]);
    }
    function reset() {
      r = Lab.rng(5 + Math.floor(Math.random() * 1e6));
      rings = Array.from({ length: CRYPTS }, () => Array.from({ length: st.n }, () => Math.floor(r() * 4)));
      day = 0; run = [[0, rings.filter(mono).length / CRYPTS]];
    }
    function drawRings() {
      if (!cv.clientWidth) return;
      const narrow = cv.clientWidth < 380, cols = narrow ? 4 : 6, rows = CRYPTS / cols;
      const { ctx, w } = Lab.canvas(cv, (rows / cols) + 0.08), pal = Lab.palette(), C = COLS(), cell = w / cols;
      ctx.clearRect(0, 0, w, w);
      rings.forEach((ring, k) => {
        const cx = (k % cols + 0.5) * cell, cy = (Math.floor(k / cols) + 0.5) * cell + 18, R = cell * 0.4, n = ring.length;
        ctx.fillStyle = Lab.rgbStr(Lab.rgb('--paper-2'), 1); ctx.beginPath(); ctx.arc(cx, cy, R * 0.5, 0, 7); ctx.fill();
        for (let i = 0; i < n; i++) {
          const a0 = (i / n) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
          ctx.fillStyle = Lab.rgbStr(C[ring[i]], 0.9); ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1); ctx.arc(cx, cy, R * 0.55, a1, a0, true); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = pal.paper3; ctx.lineWidth = 1.2; ctx.stroke();
        }
        if (mono(ring)) { ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, R + 3, 0, 7); ctx.stroke(); }
      });
      ctx.fillStyle = pal.ink2; ctx.font = `11px ${Lab.css('--f-mono')}`; ctx.fillText(`day ${Math.round(day)} · ${rings.filter(mono).length} of ${CRYPTS} single-colored (ringed)`, 4, 12);
    }
    function drawChart() {
      const f = OG.frame(svg, { h: 300, m: { l: 44, r: 14, t: 30, b: 42 }, x: [0, DAYS], y: [0, 1], xt: [0, 30, 60, 90, 120, 150, 180, 210, 240], yt: [0, 0.25, 0.5, 0.75, 1], yf: (v) => Math.round(v * 100) + '%', xl: 'Days after labeling', yl: 'Crypts that are a single color' });
      Lab.svg('path', { d: OG.path(avg, f.X, f.Y), fill: 'none', stroke: f.pal.ink3, 'stroke-width': 1.6, 'stroke-dasharray': '5 4' }, f.g);
      Lab.svg('path', { d: OG.path(run, f.X, f.Y), fill: 'none', stroke: f.pal.s1, 'stroke-width': 2 }, f.g);
      const lp = run[run.length - 1]; Lab.svg('circle', { cx: f.X(lp[0]), cy: f.Y(lp[1]), r: 4, fill: f.pal.s1, stroke: f.pal.paper3, 'stroke-width': 2 }, f.g);
      const half = avg.find((p) => p[1] >= 0.5);
      if (half) { Lab.svg('circle', { cx: f.X(half[0]), cy: f.Y(0.5), r: 3.5, fill: f.pal.ink3 }, f.g); T(f.g, f.X(half[0]) + 8, f.Y(0.5) + 14, `half by day ${half[0]}`, f.pal.ink2, 'start', 10.5); }
      OG.hover(svg, f, 0, DAYS, (x, sx, sy, px) => { const d = Math.max(0, Math.min(DAYS, Math.round(x))), a = avg[d][1]; const rp = run.filter((p) => p[0] <= d).pop(); tip.show(px, f.Y(a) * sy - 8, `<b>day ${d}</b><br>average ${Math.round(a * 100)}%${rp && d <= day ? `<br>this run ${Math.round(rp[1] * 100)}%` : ''}`, f.Y(a) * sy + 12); }, () => tip.hide());
    }
    function readout() {
      const q = (p) => { const v = avg.find((a) => a[1] >= p); return v ? v[0] + ' d' : `&gt; ${DAYS} d`; };
      out.innerHTML = `<span>stem cells per crypt <b>${st.n}</b></span><span>mean time between replacements per cell <b>${(1 / st.k).toFixed(1)} days</b></span><span>10% / 50% / 90% of crypts single-colored by <b>${q(0.1)} / ${q(0.5)} / ${q(0.9)}</b></span>`;
    }
    const redraw = () => { if (!ready) return; drawRings(); drawChart(); readout(); };
    function tick() {
      if (!running) return;
      frame++;
      for (let s = 0; s < 2; s++) { rings.forEach((ring) => evolve(ring, DT, r)); day += DT; }
      run.push([day, rings.filter(mono).length / CRYPTS]); redraw();
      if (day >= DAYS) { setPlay(false); return; }
      raf = requestAnimationFrame(tick);
    }
    const playBtn = Lab.$('#dr-play', root);
    function setPlay(p) { playing = p; playBtn.textContent = p ? 'Pause' : 'Play'; playBtn.setAttribute('aria-pressed', p ? 'true' : 'false'); if (p && visible && !running) { running = true; raf = requestAnimationFrame(tick); } if (!p) { running = false; cancelAnimationFrame(raf); } }
    const runToEnd = () => { while (day < DAYS) { rings.forEach((ring) => evolve(ring, DT, r)); day += DT; if (Math.round(day) === day) run.push([day, rings.filter(mono).length / CRYPTS]); } };
    function restart() { reset(); if (Lab.reducedMotion) { runToEnd(); redraw(); } else { redraw(); setPlay(true); } }
    playBtn.addEventListener('click', () => { if (day >= DAYS) { restart(); return; } setPlay(!playing); });
    Lab.$('#dr-reset', root).addEventListener('click', restart);
    Lab.slider(Lab.$('#dr-n', root), (v) => String(v), (v) => { st.n = v; if (ready) { average(); restart(); } });
    Lab.slider(Lab.$('#dr-k', root), (v) => v.toFixed(2), (v) => { st.k = v; if (ready) { average(); restart(); } });
    average(); reset();
    ready = true;
    if (Lab.reducedMotion) { runToEnd(); playing = false; playBtn.textContent = 'Play'; }
    redraw();
    if (!Lab.reducedMotion) Lab.whenVisible(cv, () => { visible = true; if (playing && !running && day < DAYS) { running = true; raf = requestAnimationFrame(tick); } }, () => { visible = false; running = false; cancelAnimationFrame(raf); });
    Lab.onTheme(redraw); Lab.onResize(cv, redraw);
  })();

  /* ---------- Fig 4.1 Reading position from a morphogen gradient ---------- */
  (function () {
    const root = Lab.$('#fig-gradient');
    if (!root) return;
    const svg = Lab.$('.grad-chart', root), svgF = Lab.$('.grad-flags', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    const L = 300, SAMPLES = 16, CELLS = 60;
    // thresholds chosen so that, at λ = 60 µm and an average source, the boundaries fall at 100 and 200 µm
    const TH1 = Math.exp(-100 / 60), TH2 = Math.exp(-200 / 60);
    const st = { lam: 60, src: 0.2, cell: 0.08 };
    let ready = false;
    function sample() {
      const r = Lab.rng(21), rows = [];
      for (let s = 0; s < SAMPLES; s++) {
        const c0 = Math.exp(st.src * Lab.gauss(r)), fates = [];
        for (let i = 0; i < CELLS; i++) { const x = ((i + 0.5) / CELLS) * L, c = c0 * Math.exp(-x / st.lam) * Math.exp(st.cell * Lab.gauss(r)); fates.push(c > TH1 ? 0 : c > TH2 ? 1 : 2); }
        // first boundary: the first cell, from the source, that is not fate 0
        const b = fates.findIndex((f) => f !== 0);
        rows.push({ c0, fates, b1: b < 0 ? L : (b / CELLS) * L });
      }
      return rows;
    }
    function draw() {
      if (!ready) return;
      const rows = sample(), pal = Lab.palette(), C = [pal.s1, pal.s3, pal.s2];
      const f = OG.frame(svg, { h: 280, m: { l: 50, r: 14, t: 30, b: 42 }, x: [0, L], y: [0.003, 4], ylog: true, xt: [0, 50, 100, 150, 200, 250, 300], yt: [0.01, 0.1, 1], yf: (v) => String(v), xl: 'Distance from the source (µm)', yl: 'Morphogen concentration (log scale)' });
      [[TH1, 'threshold 1'], [TH2, 'threshold 2']].forEach(([th, lab]) => { Lab.svg('line', { x1: f.X(0), x2: f.X(L), y1: f.Y(th), y2: f.Y(th), stroke: f.pal.ink2, 'stroke-dasharray': '5 4' }, f.g); T(f.g, f.X(L) - 4, f.Y(th) - 6, lab, f.pal.ink2, 'end', 10.5); });
      rows.forEach((row) => { const pts = []; for (let x = 0; x <= L; x += 5) pts.push([x, Math.max(0.003, row.c0 * Math.exp(-x / st.lam))]); Lab.svg('path', { d: OG.path(pts, f.X, f.Y), fill: 'none', stroke: f.pal.s1, 'stroke-opacity': 0.45, 'stroke-width': 1.3 }, f.g); });
      const mean = []; for (let x = 0; x <= L; x += 5) mean.push([x, Math.max(0.003, Math.exp(-x / st.lam))]);
      Lab.svg('path', { d: OG.path(mean, f.X, f.Y), fill: 'none', stroke: f.pal.ink, 'stroke-width': 2 }, f.g);
      OG.hover(svg, f, 0, L, (x, sx, sy, px) => { const c = Math.exp(-x / st.lam); tip.show(px, f.Y(Math.max(0.003, c)) * sy - 8, `<b>${Math.round(x)} µm</b><br>average source: ${c.toPrecision(2)}<br>fate ${c > TH1 ? 1 : c > TH2 ? 2 : 3}`, f.Y(Math.max(0.003, c)) * sy + 12); }, () => tip.hide());
      // rows of cells, one per sample, drawn on the same x scale
      const W = f.W, rowH = 9, H = 30 + SAMPLES * (rowH + 3) + 10;
      svgF.setAttribute('viewBox', `0 0 ${W} ${H}`); svgF.setAttribute('height', H); svgF.innerHTML = '';
      const g = Lab.svg('g', {}, svgF), cw = (f.X(L) - f.X(0)) / CELLS;
      T(g, f.m.l, 16, 'Fate read by each cell, one row per sample', pal.ink2, 'start', 11);
      [['fate 1', 0], ['fate 2', 1], ['fate 3', 2]].forEach(([lab, k], i) => { const x = W - f.m.r - (3 - i) * 64; Lab.svg('rect', { x, y: 7, width: 10, height: 10, fill: C[k] }, g); T(g, x + 14, 16, lab, pal.ink2, 'start', 10.5); });
      rows.forEach((row, s) => { const y = 26 + s * (rowH + 3); row.fates.forEach((fa, i) => Lab.svg('rect', { x: f.X(0) + i * cw + 0.5, y, width: cw - 1, height: rowH, fill: C[fa] }, g)); });
      // spread of the first boundary across samples, against λ·δ
      const bs = rows.map((r0) => r0.b1), mu = bs.reduce((a, b) => a + b, 0) / bs.length, sd = Math.sqrt(bs.reduce((a, b) => a + (b - mu) ** 2, 0) / (bs.length - 1));
      Lab.svg('line', { x1: f.X(mu), x2: f.X(mu), y1: 22, y2: H - 4, stroke: pal.ink, 'stroke-dasharray': '3 3' }, g);
      out.innerHTML = `<span>decay length λ <b>${st.lam} µm</b></span><span>mean first boundary <b>${Math.round(mu)} µm</b></span><span>scatter of the first boundary across samples <b class="${sd > 15 ? 'warn' : ''}">${sd.toFixed(1)} µm</b></span><span>predicted from source variation, λ·δ <b>${(st.lam * st.src).toFixed(1)} µm</b></span>`;
    }
    Lab.slider(Lab.$('#gr-l', root), (v) => v + ' µm', (v) => { st.lam = v; draw(); });
    Lab.slider(Lab.$('#gr-n', root), (v) => Math.round(v * 100) + '%', (v) => { st.src = v; draw(); });
    Lab.slider(Lab.$('#gr-t', root), (v) => Math.round(v * 100) + '%', (v) => { st.cell = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();
})();
