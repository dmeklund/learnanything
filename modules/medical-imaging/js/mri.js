/* Volume III, Part III figures: magnetic resonance imaging. */
(function () {
  const GAMMA = 42.577;                    // MHz per tesla, hydrogen nucleus

  /* ---------- Fig 12.1 Excite and relax: the Bloch vector ---------- */
  (function () {
    const root = Lab.$('#fig-bloch');
    if (!root) return;
    const cv = Lab.$('canvas', root), out = Lab.$('.readouts', root), tIn = Lab.$('#bl-t', root), playBtn = Lab.$('#bl-play', root);
    let tissue = 'wm', flip = 90, u = 0.42, lab = false, b0 = 1.5, raf = 0, playing = false, ready = false;
    const T = () => MI.tissues[tissue];
    const tmax = () => Math.min(15000, Math.max(800, 3 * T().t1));
    const timeOf = (uu) => (uu <= 0 ? 0 : Math.pow(10, uu * Math.log10(tmax())));
    function M(t) {
      const a = (flip * Math.PI) / 180, { t1, t2 } = T();
      const mz = 1 + (Math.cos(a) - 1) * Math.exp(-t / t1), mxy = Math.sin(a) * Math.exp(-t / t2);
      const ph = lab ? (2 * Math.PI * t) / Math.max(4, t2 / 3) : 0;
      return { x: mxy * Math.cos(ph), y: mxy * Math.sin(ph), z: mz, mxy, mz };
    }
    function draw() {
      if (!ready) return;
      const { ctx, w, h } = Lab.canvas(cv, w0() < 560 ? 1.25 : 0.5), pal = Lab.palette();
      ctx.clearRect(0, 0, w, h);
      const narrow = w < 560, side = narrow ? Math.min(w, h * 0.55) : Math.min(h, w * 0.42);
      // 3-D view
      const cx = (narrow ? w : side) / 2, cy = side / 2 + 6, R = side * 0.36, az = -0.62, el = 0.38;
      const P = (x, y, z) => {
        const X = x * Math.cos(az) - y * Math.sin(az), Yd = x * Math.sin(az) + y * Math.cos(az);
        return [cx + R * X, cy - R * (z * Math.cos(el) - Yd * Math.sin(el))];
      };
      ctx.strokeStyle = pal.rule; ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.beginPath();
      for (let i = 0; i <= 64; i++) { const a = (i / 64) * 2 * Math.PI, [px, py] = P(Math.cos(a), Math.sin(a), 0); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();
      ctx.font = `11px ${Lab.css('--f-mono')}`; ctx.fillStyle = pal.ink3;
      [[1.25, 0, 0, lab ? 'x' : "x'"], [0, 1.25, 0, lab ? 'y' : "y'"], [0, 0, 1.3, 'z  (B₀)']].forEach(([x, y, z, l]) => {
        const [ax, ay] = P(x, y, z), [ox, oy] = P(0, 0, 0);
        ctx.strokeStyle = pal.ink3; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ax, ay); ctx.stroke();
        ctx.fillText(l, ax + 4, ay + (z ? 0 : 12));
      });
      // Trail of the tip from the pulse to now
      const t = timeOf(u);
      ctx.strokeStyle = Lab.rgbStr(Lab.rgb('--s3'), 0.6); ctx.lineWidth = 1.2; ctx.beginPath();
      for (let i = 0; i <= 400; i++) { const m = M(t * Math.pow(i / 400, 2)), [px, py] = P(m.x, m.y, m.z); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
      const m = M(t), [ox, oy] = P(0, 0, 0), [tx, ty] = P(m.x, m.y, m.z);
      ctx.strokeStyle = pal.accent; ctx.fillStyle = pal.accent; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(tx, ty); ctx.stroke();
      const ang = Math.atan2(ty - oy, tx - ox); ctx.beginPath(); ctx.moveTo(tx, ty);
      ctx.lineTo(tx - 10 * Math.cos(ang - 0.4), ty - 10 * Math.sin(ang - 0.4)); ctx.lineTo(tx - 10 * Math.cos(ang + 0.4), ty - 10 * Math.sin(ang + 0.4)); ctx.fill();
      ctx.lineWidth = 1; ctx.fillStyle = pal.ink2; ctx.fillText('M', tx + 6, ty - 4);
      ctx.fillText(lab ? 'lab frame (precession slowed)' : 'rotating frame', narrow ? 4 : 4, 12);
      // Time plot with log time axis
      const px0 = narrow ? 40 : side + 50, py0 = narrow ? side + 26 : 18, pw = (narrow ? w - 12 : w - 10) - px0, ph = (narrow ? h - 30 : h - 40) - py0;
      const lt = Math.log10(tmax()), X = (tt) => px0 + (Math.log10(Math.max(1, tt)) / lt) * pw, Y = Lab.scale(-1, 1, py0 + ph, py0);
      ctx.strokeStyle = pal.grid; ctx.fillStyle = pal.ink3; ctx.textAlign = 'right';
      [-1, 0, 1].forEach((v) => { ctx.beginPath(); ctx.moveTo(px0, Y(v)); ctx.lineTo(px0 + pw, Y(v)); ctx.stroke(); ctx.fillText(v, px0 - 8, Y(v) + 4); });
      [1, 10, 100, 1000, 10000].filter((v) => v <= tmax()).forEach((v) => { ctx.textAlign = v === 1 ? 'left' : 'center'; ctx.beginPath(); ctx.moveTo(X(v), py0); ctx.lineTo(X(v), py0 + ph); ctx.stroke(); ctx.fillText(v >= 1000 ? v / 1000 + ' s' : v + ' ms', X(v), py0 + ph + 16); });
      ctx.textAlign = 'left';
      const mark = (tt, label) => { ctx.strokeStyle = pal.ink3; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(X(tt), py0); ctx.lineTo(X(tt), py0 + ph); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = pal.ink2; ctx.fillText(label, X(tt) + 3, Y(-0.85)); };
      mark(T().t2, 'T2'); mark(T().t1, 'T1');
      [['mz', pal.s2, 'Mz'], ['mxy', pal.s1, '|Mxy|']].forEach(([k, col, l]) => {
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
        for (let i = 0; i <= 200; i++) { const tt = Math.pow(10, (i / 200) * lt), v = M(tt)[k]; i ? ctx.lineTo(X(tt), Y(v)) : ctx.moveTo(X(tt), Y(v)); }
        ctx.stroke(); ctx.lineWidth = 1;
        const v = M(t)[k]; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(Math.max(1, t)), Y(v), 4, 0, 7); ctx.fill();
        const ev = M(tmax() * 0.8)[k]; ctx.fillStyle = pal.ink2; ctx.fillText(l, X(tmax() * 0.55), Y(ev) + (k === 'mz' ? -8 : 14));
      });
      ctx.fillStyle = pal.ink3; ctx.fillText('time after the pulse (log scale)', px0, h - 4);
      const f = GAMMA * b0;
      out.innerHTML = `<span>Larmor frequency at ${b0} T <b>${f.toFixed(1)} MHz</b></span><span>t <b>${t < 1 ? t.toFixed(1) : Math.round(t)} ms</b></span><span>Mz <b>${m.mz.toFixed(2)}</b></span><span>|Mxy| <b>${m.mxy.toFixed(2)}</b></span><span>T1 / T2 <b>${T().t1} / ${T().t2} ms</b></span>`;
    }
    const w0 = () => cv.clientWidth || 600;
    function play() {
      if (playing) { playing = false; cancelAnimationFrame(raf); playBtn.textContent = 'Play'; return; }
      if (Lab.reducedMotion) { tIn.value = 1; tIn.dispatchEvent(new Event('input')); return; }
      playing = true; playBtn.textContent = 'Pause';
      if (u >= 0.999) u = 0;
      let last = performance.now();
      const step = (now) => {
        if (!playing) return;
        u = Math.min(1, u + (now - last) / 7000); last = now;
        tIn.value = u; tIn.dispatchEvent(new Event('input'));
        if (u < 1) raf = requestAnimationFrame(step); else { playing = false; playBtn.textContent = 'Play'; }
      };
      raf = requestAnimationFrame(step);
    }
    Lab.$('#bl-tissue', root).addEventListener('change', (e) => { tissue = e.target.value; tIn.dispatchEvent(new Event('input')); });
    Lab.$('#bl-b0', root).addEventListener('change', (e) => { b0 = parseFloat(e.target.value); draw(); });
    Lab.$('#bl-lab', root).addEventListener('change', (e) => { lab = e.target.checked; draw(); });
    playBtn.addEventListener('click', play);
    Lab.slider(Lab.$('#bl-flip', root), (v) => v + '°', (v) => { flip = v; draw(); });
    Lab.slider(tIn, (v) => { const t = timeOf(v); return t < 1 ? t.toFixed(1) + ' ms' : t < 1000 ? Math.round(t) + ' ms' : (t / 1000).toFixed(2) + ' s'; }, (v) => { u = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(cv, draw);
  })();

  /* ---------- Fig 14.1 Choosing contrast with TR, TE, and TI ---------- */
  (function () {
    const root = Lab.$('#fig-contrast');
    if (!root) return;
    const cv = Lab.$('canvas', root), wrap = Lab.$('.chart-wrap', root), svg = Lab.$('svg', root), tip = Lab.tip(wrap), bars = Lab.$('.tissue-bars', root);
    const trIn = Lab.$('#ct-tr', root), teIn = Lab.$('#ct-te', root), tiIn = Lab.$('#ct-ti', root), irIn = Lab.$('#ct-ir', root);
    const PRESETS = { t1: [false, 500, 15, 0], t2: [false, 4000, 100, 0], pd: [false, 3000, 15, 0], flair: [true, 9000, 120, 2500] };
    const seq = { ir: false, tr: 500, te: 15, ti: 0 };
    const CURVES = [['csf', 's1'], ['wm', 's2'], ['fat', 's3']];
    const N = 192;
    let ready = false, pending = 0;
    const trOf = (u) => Math.round(Math.pow(10, 2 + u * 2) / 10) * 10, uOfTr = (tr) => (Math.log10(tr) - 2) / 2;
    function chart() {
      const pal = Lab.palette(), W = Math.max(300, Math.round(wrap.clientWidth || 600)), narrow = W < 560;
      const pw = narrow ? W - 50 : (W - 80) / 2, ph = 130, H = narrow ? 2 * (ph + 56) : ph + 56;
      svg.innerHTML = ''; svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H);
      const max = Math.max(...['csf', 'gm', 'wm', 'fat', 'lesion', 'blood'].map((k) => MI.mrSignal(MI.tissues[k], seq)));
      const panels = [
        { title: seq.ir ? 'Longitudinal recovery after inversion' : 'Longitudinal recovery between pulses', tmax: seq.ir ? Math.max(4000, seq.ti * 1.3) : Math.max(4000, seq.tr * 1.2), at: seq.ir ? seq.ti : seq.tr, atLabel: seq.ir ? 'TI' : 'TR',
          f: (t, T) => (seq.ir ? (1 - 2 * Math.exp(-t / T.t1) + Math.exp(-seq.tr / T.t1)) : (1 - Math.exp(-t / T.t1))) * T.pd, lo: seq.ir ? -1 : 0 },
        { title: 'Transverse decay after excitation', tmax: Math.max(300, seq.te * 1.5), at: seq.te, atLabel: 'TE',
          f: (t, T) => MI.mrSignal(T, { ...seq, te: t }) / 1, lo: 0 },
      ];
      panels.forEach((P, k) => {
        const x0 = narrow ? 40 : 40 + k * (pw + 40), y0 = narrow ? 20 + k * (ph + 56) : 20;
        const x = Lab.scale(0, P.tmax, x0, x0 + pw), y = Lab.scale(P.lo, 1, y0 + ph, y0);
        Lab.svg('text', { x: x0, y: y0 - 8, 'font-size': 11.5, fill: pal.ink2 }, svg).textContent = P.title;
        [P.lo, 0, 1].filter((v, i, a) => a.indexOf(v) === i).forEach((v) => {
          Lab.svg('line', { x1: x0, x2: x0 + pw, y1: y(v), y2: y(v), stroke: pal.grid }, svg);
          Lab.svg('text', { x: x0 - 6, y: y(v) + 4, 'text-anchor': 'end', 'font-size': 10.5, fill: pal.ink3 }, svg).textContent = v;
        });
        Lab.svg('text', { x: x0 + pw, y: y0 + ph + 16, 'text-anchor': 'end', 'font-size': 10.5, fill: pal.ink3 }, svg).textContent = `${P.tmax >= 1000 ? (P.tmax / 1000).toFixed(1) + ' s' : Math.round(P.tmax) + ' ms'}`;
        Lab.svg('text', { x: x0, y: y0 + ph + 16, 'font-size': 10.5, fill: pal.ink3 }, svg).textContent = '0';
        Lab.svg('line', { x1: x(P.at), x2: x(P.at), y1: y0, y2: y0 + ph, stroke: pal.ink, 'stroke-dasharray': '4 3' }, svg);
        Lab.svg('text', { x: x(P.at) + 4, y: y0 + ph - 4, 'font-size': 11, fill: pal.ink }, svg).textContent = P.atLabel;
        const ends = [];
        CURVES.forEach(([key, col]) => {
          const Tz = MI.tissues[key]; let d = '';
          for (let i = 0; i <= 120; i++) { const t = (i / 120) * P.tmax; d += (i ? 'L' : 'M') + x(t).toFixed(1) + ' ' + y(P.f(t, Tz)).toFixed(1); }
          Lab.svg('path', { d, fill: 'none', stroke: pal[col], 'stroke-width': 2 }, svg);
          Lab.svg('circle', { cx: x(P.at), cy: y(P.f(P.at, Tz)), r: 4, fill: pal[col], stroke: pal.paper3, 'stroke-width': 1.5 }, svg);
          ends.push({ y: y(P.f(P.tmax * 0.98, Tz)), name: Tz.name });
        });
        // Direct labels at the right end: keep them above the axis, then push apart upward.
        ends.sort((a, b) => b.y - a.y);
        ends.forEach((e) => { e.y = Math.min(e.y, y0 + ph - 6); });
        for (let i = 1; i < ends.length; i++) if (ends[i - 1].y - ends[i].y < 12) ends[i].y = ends[i - 1].y - 12;
        ends.forEach((e) => Lab.svg('text', { x: x0 + pw - 2, y: e.y - 4, 'text-anchor': 'end', 'font-size': 10.5, fill: pal.ink2 }, svg).textContent = e.name);
        const hit = Lab.svg('rect', { x: x0, y: y0, width: pw, height: ph, fill: 'transparent' }, svg);
        hit.addEventListener('pointermove', (ev) => {
          const r = svg.getBoundingClientRect(), s = r.width / W, px = (ev.clientX - r.left) / s, t = Math.max(0, Math.min(P.tmax, ((px - x0) / pw) * P.tmax));
          tip.show(px * s, y0 * s, `<b>${Math.round(t)} ms</b><br>` + CURVES.map(([key]) => `${MI.tissues[key].name} ${P.f(t, MI.tissues[key]).toFixed(2)}`).join('<br>'), (y0 + ph) * s);
        });
        hit.addEventListener('pointerleave', () => tip.hide());
      });
      bars.innerHTML = ['csf', 'gm', 'wm', 'lesion', 'blood', 'fat'].map((k) => {
        const v = Math.min(1, MI.mrSignal(MI.tissues[k], seq) / max), g = Math.round(v * 255);
        return `<div class="tbar"><i style="background:rgb(${g},${g},${g})"></i><span>${MI.tissues[k].name}</span><span class="track"><span style="width:${(v * 100).toFixed(0)}%"></span></span><b>${(v * 100).toFixed(0)}</b></div>`;
      }).join('');
    }
    function image() {
      const { ctx, w } = Lab.canvas(cv, 1), img = MI.mrImage(N, seq);
      ctx.fillStyle = MI.film().bg; ctx.fillRect(0, 0, w, w);
      MI.gray(ctx, img, N, N, (v) => Math.min(1, v), 0, 0, w, w);
      MI.overlay(ctx, 0, 0, w, w, { tl: ['MR · head', seq.ir ? 'inversion recovery' : 'spin echo'], bl: [`TR ${seq.tr}`, `TE ${seq.te}`].concat(seq.ir ? [`TI ${seq.ti}`] : []) });
    }
    function draw() { if (!ready) return; chart(); clearTimeout(pending); pending = setTimeout(image, 16); }
    function setPreset(p) {
      const [ir, tr, te, ti] = PRESETS[p];
      irIn.checked = ir; seq.ir = ir; tiIn.disabled = !ir;
      trIn.value = uOfTr(tr); teIn.value = te; tiIn.value = ti || 800;
      [trIn, teIn, tiIn].forEach((el) => el.dispatchEvent(new Event('input')));
      Lab.$$('[data-preset]', root).forEach((o) => o.setAttribute('aria-pressed', o.dataset.preset === p ? 'true' : 'false'));
    }
    const clearPreset = () => Lab.$$('[data-preset]', root).forEach((o) => o.setAttribute('aria-pressed', 'false'));
    Lab.$$('[data-preset]', root).forEach((b) => b.addEventListener('click', () => setPreset(b.dataset.preset)));
    irIn.addEventListener('change', () => { seq.ir = irIn.checked; tiIn.disabled = !seq.ir; clearPreset(); draw(); });
    Lab.slider(trIn, (u) => trOf(u) + ' ms', (u) => { seq.tr = trOf(u); draw(); });
    Lab.slider(teIn, (v) => v + ' ms', (v) => { seq.te = v; draw(); });
    Lab.slider(tiIn, (v) => v + ' ms', (v) => { seq.ti = v; draw(); });
    [trIn, teIn, tiIn].forEach((el) => el.addEventListener('pointerdown', clearPreset));
    ready = true; setPreset('t1');
    Lab.onTheme(draw); Lab.onResize(cv, draw);
  })();

  /* ---------- Fig 15.1 Filling k-space ---------- */
  (function () {
    const root = Lab.$('#fig-kspace');
    if (!root) return;
    const cv = Lab.$('canvas', root), out = Lab.$('.readouts', root), rIn = Lab.$('#ks-r', root);
    const N = 128, img = MI.mrImage(N, { ir: false, tr: 500, te: 15 }, 0.006, 4);
    const Kre = new Float64Array(N * N), Kim = new Float64Array(N * N);
    for (let i = 0; i < N * N; i++) Kre[i] = img[i];
    MI.fft2(Kre, Kim, N, false);
    let mode = 'full', frac = 0.15, ready = false;
    const r = Lab.rng(31), randLine = Array.from({ length: N }, () => r()), motionShift = Array.from({ length: N }, () => (r() < 0.35 ? 2 + 3 * r() : 0));
    function draw() {
      if (!ready) return;
      const { ctx, w } = Lab.canvas(cv, null), pal = Lab.palette();
      const narrow = w < 600, gap = 10, lab = 18, sq = narrow ? (w - gap) / 2 : (w - 2 * gap) / 3;
      const h = narrow ? 2 * (lab + sq) + gap : lab + sq;
      cv.style.height = h + 'px';
      const c = Lab.canvas(cv, null).ctx;
      c.clearRect(0, 0, w, h);
      // Apply the sampling pattern in centered k coordinates.
      const re = new Float64Array(N * N), im = new Float64Array(N * N), shown = new Float32Array(N * N);
      const lines = new Set();
      let kmax = 0;
      for (let ky = 0; ky < N; ky++) for (let kx = 0; kx < N; kx++) {
        const cx = kx < N / 2 ? kx : kx - N, cy = ky < N / 2 ? ky : ky - N, rad = Math.hypot(cx, cy) / (N / 2);
        let keep = true, phase = 0;
        if (mode === 'center') keep = rad <= frac;
        else if (mode === 'edges') keep = rad > frac;
        else if (mode === 'skip') keep = (cy & 1) === 0;
        else if (mode === 'random') keep = Math.abs(cy) < 6 || randLine[ky] < 0.42;
        else if (mode === 'motion') phase = (-2 * Math.PI * cx * motionShift[ky]) / N;
        const p = ky * N + kx;
        if (keep) {
          re[p] = Kre[p] * Math.cos(phase) - Kim[p] * Math.sin(phase);
          im[p] = Kre[p] * Math.sin(phase) + Kim[p] * Math.cos(phase);
          lines.add(ky);
        }
        const sy = (ky + N / 2) % N, sx = (kx + N / 2) % N, mag = Math.log10(1 + Math.hypot(re[p], im[p]));
        shown[sy * N + sx] = mag; kmax = Math.max(kmax, mag);
      }
      MI.fft2(re, im, N, true);
      const rec = new Float32Array(N * N);
      let se = 0; for (let i = 0; i < N * N; i++) { rec[i] = Math.hypot(re[i], im[i]); se += (rec[i] - img[i]) ** 2; }
      const P = [{ x: 0, y: lab }, { x: sq + gap, y: lab }, narrow ? { x: 0, y: 2 * lab + sq + gap } : { x: 2 * (sq + gap), y: lab }];
      c.font = `11px ${Lab.css('--f-mono')}`; c.fillStyle = pal.ink2;
      c.fillText('Image (T1-weighted)', P[0].x, P[0].y - 6); c.fillText('k-space (log |F|)', P[1].x, P[1].y - 6); c.fillText('Reconstruction', P[2].x, P[2].y - 6);
      MI.gray(c, img, N, N, (v) => Math.min(1, v), P[0].x, P[0].y, sq, sq);
      MI.gray(c, shown, N, N, (v) => Math.min(1, v / kmax), P[1].x, P[1].y, sq, sq);
      MI.gray(c, rec, N, N, (v) => Math.min(1, v), P[2].x, P[2].y, sq, sq);
      MI.overlay(c, P[1].x, P[1].y, sq, sq, { tl: ['kx →', 'ky ↓'] });
      MI.overlay(c, P[2].x, P[2].y, sq, sq, { bl: [`${lines.size} of ${N} lines`] });
      out.innerHTML = `<span>phase-encode lines acquired <b>${lines.size} / ${N}</b></span><span>scan time <b>${Math.round((lines.size / N) * 100)}%</b> of full</span><span>image error <b>${(Math.sqrt(se / (N * N)) * 100).toFixed(1)}%</b> RMS</span>`;
    }
    Lab.$$('[data-ks]', root).forEach((b) => b.addEventListener('click', () => {
      mode = b.dataset.ks;
      Lab.$$('[data-ks]', root).forEach((o) => o.setAttribute('aria-pressed', o === b ? 'true' : 'false'));
      rIn.disabled = !(mode === 'center' || mode === 'edges');
      draw();
    }));
    Lab.slider(rIn, (v) => Math.round(v * 100) + '%', (v) => { frac = v; draw(); });
    ready = true; rIn.disabled = true; draw();
    Lab.onTheme(draw); Lab.onResize(cv, draw);
  })();
})();
