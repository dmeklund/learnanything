/* Volume V, detection figures: camera noise and deconvolution. */
(function () {
  /* ---------- Fig 4.1 Photons, cameras, and noise ---------- */
  (function () {
    const root = Lab.$('#fig-camera');
    if (!root) return;
    const cv = Lab.$('canvas', root), out = Lab.$('.readouts', root);
    // Representative specifications; real cameras vary by model and mode.
    const CAMS = {
      ccd: { name: 'Cooled CCD', qe: 0.65, read: 6, F: 1 },
      emccd: { name: 'EMCCD', qe: 0.95, read: 0.2, F: Math.SQRT2 },
      scmos: { name: 'sCMOS', qe: 0.82, read: 1.4, F: 1 },
    };
    const N = 128, base = MX.cells(N, 31, { count: 5 });
    const truth = Float32Array.from(base.act, (v, i) => Math.min(1, 0.85 * v + 0.6 * base.nuc[i]));
    const st = { photons: 50, bg: 0.3, cam: 'scmos' };
    let ready = false;
    const snr = (S, c) => { const e = c.qe * S, b = c.qe * st.bg; return e / Math.sqrt(c.F * c.F * (e + b) + c.read * c.read); };
    function draw() {
      if (!ready) return;
      const { ctx, w, h } = Lab.canvas(cv, (cv.clientWidth || 600) < 560 ? 1.55 : 0.5), pal = Lab.palette(), F = MX.film(), C = CAMS[st.cam];
      ctx.clearRect(0, 0, w, h);
      const narrow = w < 560, sq = narrow ? w : h;
      const r = Lab.rng(5), img = new Float32Array(N * N);
      for (let p = 0; p < N * N; p++) {
        const e = MX.poisson(C.qe * (truth[p] * st.photons + st.bg), r);
        // EM gain doubles the variance of the shot noise (excess noise factor F = √2)
        const amp = C.F > 1 ? e + Math.sqrt(e) * Lab.gauss(r) : e;
        img[p] = amp + C.read * Lab.gauss(r);
      }
      let lo = Infinity, hi = -Infinity; for (const v of img) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
      ctx.fillStyle = F.bg; ctx.fillRect(0, 0, sq, sq);
      MX.gray(ctx, img, N, N, (v) => (v - lo) / (hi - lo || 1), 0, 0, sq, sq, Lab.rgb('--ch-actin'));
      ctx.font = `11px ${Lab.css('--f-mono')}`; ctx.fillStyle = F.ink; ctx.fillText(C.name, 8, 16);
      ctx.fillStyle = F.ink2; ctx.fillText(`${st.photons} photons at the brightest pixel`, 8, sq - 8);
      // SNR versus photons for all three cameras
      const x0 = narrow ? 40 : sq + 52, y0 = narrow ? sq + 30 : 22, pw = w - x0 - 12, ph = (narrow ? h - sq - 30 : h - 22) - 40;
      const X = Lab.logScale(1, 10000, x0, x0 + pw), Y = Lab.logScale(0.1, 100, y0 + ph, y0);
      ctx.fillStyle = pal.ink2; ctx.fillText('Signal-to-noise ratio at one pixel', x0, y0 - 8);
      ctx.strokeStyle = pal.grid;
      [0.1, 1, 10, 100].forEach((v) => { ctx.beginPath(); ctx.moveTo(x0, Y(v)); ctx.lineTo(x0 + pw, Y(v)); ctx.stroke(); ctx.fillStyle = pal.ink3; ctx.textAlign = 'right'; ctx.fillText(v, x0 - 6, Y(v) + 4); });
      ctx.textAlign = 'center'; [[1, '1'], [10, '10'], [100, '100'], [1000, '1k'], [10000, '10k']].forEach(([v, t]) => ctx.fillText(t, X(v), y0 + ph + 16)); ctx.textAlign = 'left';
      ctx.fillText('photons arriving per pixel', x0, y0 + ph + 30);
      const cols = { ccd: pal.s3, emccd: pal.s2, scmos: pal.s1 }, ends = [];
      Object.entries(CAMS).forEach(([k, c]) => {
        ctx.strokeStyle = cols[k]; ctx.lineWidth = k === st.cam ? 2.6 : 1.4; ctx.beginPath();
        for (let i = 0; i <= 100; i++) { const S = Math.pow(10, i / 25); i ? ctx.lineTo(X(S), Y(snr(S, c))) : ctx.moveTo(X(S), Y(snr(S, c))); }
        ctx.stroke(); ends.push({ k, y: Y(snr(3, c)) });
      });
      ctx.lineWidth = 1;
      // Direct labels at 3 photons, where the curves separate most, nudged apart
      ends.sort((a, b) => a.y - b.y); for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 13) ends[i].y = ends[i - 1].y + 13;
      ends.forEach((e) => { ctx.fillStyle = pal.ink2; ctx.fillText(CAMS[e.k].name, X(3) + 6, e.y - 4); });
      // Ideal detector: SNR = sqrt(S)
      ctx.strokeStyle = pal.ink3; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(X(1), Y(1)); ctx.lineTo(X(10000), Y(100)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = pal.ink3; ctx.fillText('perfect detector, √N', X(120), Y(Math.sqrt(120)) - 10);
      ctx.fillStyle = cols[st.cam]; ctx.beginPath(); ctx.arc(X(st.photons), Y(snr(st.photons, C)), 5, 0, 7); ctx.fill();
      out.innerHTML = `<span>quantum efficiency <b>${Math.round(C.qe * 100)}%</b></span><span>read noise <b>${C.read} e⁻</b></span>${C.F > 1 ? '<span>excess noise factor <b>√2</b></span>' : ''}<span>SNR at the brightest pixel <b>${snr(st.photons, C).toFixed(1)}</b></span>`;
    }
    Lab.slider(Lab.$('#cm-n', root), (v) => Math.round(Math.pow(10, v)) + '', (v) => { st.photons = Math.round(Math.pow(10, v)); draw(); });
    Lab.$$('[data-cam]', root).forEach((b) => b.addEventListener('click', () => {
      st.cam = b.dataset.cam; Lab.$$('[data-cam]', root).forEach((o) => o.setAttribute('aria-pressed', o === b ? 'true' : 'false')); draw();
    }));
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(cv, draw);
  })();

  /* ---------- Fig 5.1 Richardson–Lucy deconvolution ---------- */
  (function () {
    const root = Lab.$('#fig-deconv');
    if (!root) return;
    const cv = Lab.$('canvas', root), out = Lab.$('.readouts', root), itIn = Lab.$('#dc-it', root);
    const N = 112, MAXIT = 120;
    // Ground truth: thin filaments and small puncta, finer than the blur.
    const truth = new Float32Array(N * N), r0 = Lab.rng(14);
    for (let f = 0; f < 9; f++) {
      let x = r0() * N, y = r0() * N, a = r0() * Math.PI * 2;
      for (let s = 0; s < 160; s++) { a += (r0() - 0.5) * 0.25; x += Math.cos(a) * 0.7; y += Math.sin(a) * 0.7; const i = Math.round(x), j = Math.round(y); if (i >= 0 && j >= 0 && i < N && j < N) truth[j * N + i] = 1; }
    }
    for (let p = 0; p < 40; p++) { const i = Math.floor(r0() * N), j = Math.floor(r0() * N); truth[j * N + i] = 1.6; }
    const st = { sigma: 2.4, photons: 100 };
    let stack = [], errs = [], blurred = null, ready = false;
    function compute() {
      const r = Lab.rng(3), b = MX.blur(truth, N, N, st.sigma);
      blurred = Float32Array.from(b, (v) => MX.poisson(v * st.photons + 2, r) / st.photons);
      let u = new Float32Array(N * N).fill(blurred.reduce((a, v) => a + v, 0) / (N * N));
      stack = [blurred]; errs = [];
      // Error against the object at one-pixel resolution, the finest detail the sampling can show.
      const ref = MX.blur(truth, N, N, 1);
      const err = (img) => { let s = 0, t = 0; for (let p = 0; p < N * N; p++) { s += (img[p] - ref[p]) ** 2; t += ref[p] ** 2; } return Math.sqrt(s / t); };
      errs.push(err(blurred));
      for (let k = 1; k <= MAXIT; k++) {
        // u <- u * ( (d / (u * h)) * h ), with a symmetric Gaussian PSF h
        const est = MX.blur(u, N, N, st.sigma), ratio = new Float32Array(N * N);
        for (let p = 0; p < N * N; p++) ratio[p] = blurred[p] / Math.max(1e-4, est[p]);
        const corr = MX.blur(ratio, N, N, st.sigma);
        const nu = new Float32Array(N * N); for (let p = 0; p < N * N; p++) nu[p] = u[p] * corr[p];
        u = nu; stack.push(u); errs.push(err(u));
      }
    }
    function draw() {
      if (!ready) return;
      const { ctx, w, h } = Lab.canvas(cv, (cv.clientWidth || 600) < 560 ? 1.2 : 0.3), pal = Lab.palette(), F = MX.film();
      ctx.clearRect(0, 0, w, h);
      const k = Math.min(MAXIT, parseInt(itIn.value, 10)), narrow = w < 560, gap = 10;
      const sq = narrow ? (w - gap) / 2 : Math.min(h - 20, (w * 0.72 - 2 * gap) / 3);
      const tint = Lab.rgb('--ch-actin'), panels = [[blurred, 'recorded (blurred, noisy)'], [stack[k], `deconvolved, ${k} iterations`], [truth, 'true object']];
      panels.forEach(([img, lab], i) => {
        const x0 = narrow ? (i % 2) * (sq + gap) : i * (sq + gap), y0 = narrow ? Math.floor(i / 2) * (sq + 26) + 16 : 16;
        let mx = 0; for (const v of img) mx = Math.max(mx, v);
        ctx.fillStyle = F.bg; ctx.fillRect(x0, y0, sq, sq);
        MX.gray(ctx, img, N, N, (v) => Math.min(1, v / (mx * 0.8)), x0, y0, sq, sq, tint);
        ctx.fillStyle = pal.ink2; ctx.font = `11px ${Lab.css('--f-mono')}`; ctx.fillText(lab, x0, y0 - 5);
      });
      // Error versus iterations
      const x0 = narrow ? sq + gap + 30 : 3 * (sq + gap) + 34, y0 = narrow ? sq + 26 + 16 + 10 : 26, pw = w - x0 - 8, ph = (narrow ? sq : sq - 20) - 30;
      const emax = Math.max(...errs), emin = Math.min(...errs), X = (i) => x0 + (i / MAXIT) * pw, Y = (e) => y0 + ph - ((e - emin * 0.9) / (emax - emin * 0.9)) * ph;
      ctx.fillStyle = pal.ink2; ctx.fillText('error vs. truth', x0, y0 - 10);
      ctx.strokeStyle = pal.grid; ctx.strokeRect(x0, y0, pw, ph);
      ctx.strokeStyle = pal.s1; ctx.lineWidth = 2; ctx.beginPath(); errs.forEach((e, i) => (i ? ctx.lineTo(X(i), Y(e)) : ctx.moveTo(X(i), Y(e)))); ctx.stroke(); ctx.lineWidth = 1;
      const best = errs.indexOf(emin);
      ctx.fillStyle = pal.s1; ctx.beginPath(); ctx.arc(X(k), Y(errs[k]), 4, 0, 7); ctx.fill();
      ctx.fillStyle = pal.ink3; ctx.textAlign = 'center'; ctx.fillText('0', x0, y0 + ph + 14); ctx.fillText(MAXIT, x0 + pw, y0 + ph + 14); ctx.fillText('iterations', x0 + pw / 2, y0 + ph + 14); ctx.textAlign = 'left';
      out.innerHTML = `<span>error <b>${(errs[k] * 100).toFixed(0)}%</b> of the object's energy</span><span>lowest error at <b>${best}</b> iterations</span><span>${k > best * 1.6 && best > 0 ? '<b class="warn">past the optimum: noise is being sharpened into speckles</b>' : 'iterating sharpens the image'}</span>`;
    }
    const redo = () => { if (!ready) return; compute(); draw(); };
    Lab.slider(Lab.$('#dc-s', root), (v) => v.toFixed(1) + ' px', (v) => { st.sigma = v; redo(); });
    Lab.slider(Lab.$('#dc-n', root), (v) => Math.round(Math.pow(10, v)) + '', (v) => { st.photons = Math.pow(10, v); redo(); });
    Lab.slider(itIn, (v) => v + '', () => draw());
    ready = true; compute(); draw();
    Lab.onTheme(draw); Lab.onResize(cv, draw);
  })();
})();
