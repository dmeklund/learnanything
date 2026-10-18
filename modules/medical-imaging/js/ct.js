/* Volume III, Part II figures: X-rays and computed tomography. */
(function () {
  /* ---------- Fig 1.1 Attenuation versus photon energy ---------- */
  (function () {
    const root = Lab.$('#fig-atten');
    if (!root) return;
    const wrap = Lab.$('.chart-wrap', root), svg = Lab.$('svg', root), tip = Lab.tip(wrap), out = Lab.$('.readouts', root);
    // Mass attenuation coefficients (cm^2/g), NIST XCOM / Hubbell & Seltzer tables.
    const E = [20, 30, 40, 50, 60, 80, 100, 150];
    const SERIES = [
      { key: 's2', name: 'Cortical bone', rho: 1.92, mu: [4.001, 1.331, 0.6655, 0.4242, 0.3148, 0.2229, 0.1855, 0.148] },
      { key: 's1', name: 'Water (soft tissue)', rho: 1.0, mu: [0.8096, 0.3756, 0.2683, 0.2269, 0.2059, 0.1837, 0.1707, 0.1505] },
    ];
    const muAt = (S, e) => {
      let i = 0; while (i < E.length - 2 && e > E[i + 1]) i++;
      const u = Math.log(e / E[i]) / Math.log(E[i + 1] / E[i]);
      return S.rho * Math.exp(Math.log(S.mu[i]) + u * (Math.log(S.mu[i + 1]) - Math.log(S.mu[i])));
    };
    let energy = 60, ready = false;
    function draw() {
      if (!ready) return;
      const pal = Lab.palette(), W = Math.max(320, Math.round(wrap.clientWidth || 640)), H = Math.round(Math.min(340, W * 0.55));
      const L = 52, R = W < 520 ? 16 : 150, T = 14, B = 38;
      svg.innerHTML = ''; svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H);
      const x = Lab.scale(20, 150, L, W - R), y = Lab.logScale(0.1, 10, H - B, T);
      [0.1, 0.2, 0.5, 1, 2, 5, 10].forEach((v) => {
        Lab.svg('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: pal.grid }, svg);
        Lab.svg('text', { x: L - 6, y: y(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: pal.ink3 }, svg).textContent = v;
      });
      [20, 40, 60, 80, 100, 120, 150].forEach((v) => {
        Lab.svg('text', { x: x(v), y: H - B + 16, 'text-anchor': 'middle', 'font-size': 11, fill: pal.ink3 }, svg).textContent = v;
      });
      Lab.svg('text', { x: W - R, y: H - 6, 'text-anchor': 'end', 'font-size': 11, fill: pal.ink3 }, svg).textContent = 'photon energy (keV)';
      Lab.svg('text', { x: L, y: T - 2, 'font-size': 11, fill: pal.ink3 }, svg).textContent = 'μ (per cm)';
      Lab.svg('line', { x1: x(energy), x2: x(energy), y1: T, y2: H - B, stroke: pal.ink3, 'stroke-dasharray': '3 3' }, svg);
      SERIES.forEach((S) => {
        let d = '';
        for (let e = 20; e <= 150; e += 1) d += (e === 20 ? 'M' : 'L') + x(e).toFixed(1) + ' ' + y(muAt(S, e)).toFixed(1);
        Lab.svg('path', { d, fill: 'none', stroke: pal[S.key], 'stroke-width': 2 }, svg);
        Lab.svg('circle', { cx: x(energy), cy: y(muAt(S, energy)), r: 4.5, fill: pal[S.key], stroke: pal.paper3, 'stroke-width': 2 }, svg);
        const lx = W < 520 ? x(150) - 4 : x(150) + 8, ly = y(muAt(S, 150)) + (S.key === 's2' ? -8 : 14);
        Lab.svg('text', { x: lx, y: W < 520 ? y(muAt(S, 110)) - 10 : ly, 'text-anchor': W < 520 ? 'end' : 'start', 'font-size': 11.5, fill: pal.ink2 }, svg).textContent = S.name;
      });
      const hit = Lab.svg('rect', { x: L, y: T, width: W - R - L, height: H - B - T, fill: 'transparent' }, svg);
      hit.addEventListener('pointermove', (ev) => {
        const r = svg.getBoundingClientRect(), px = ((ev.clientX - r.left) / r.width) * W;
        const e = Math.round(Math.min(150, Math.max(20, 20 + ((px - L) / (W - R - L)) * 130)));
        const s = r.width / W;
        tip.show(x(e) * s, y(muAt(SERIES[0], e)) * s, `<b>${e} keV</b><br>bone μ = ${muAt(SERIES[0], e).toFixed(2)} /cm<br>water μ = ${muAt(SERIES[1], e).toFixed(3)} /cm`, y(muAt(SERIES[1], e)) * s + 8);
      });
      hit.addEventListener('pointerleave', () => tip.hide());
      const mb = muAt(SERIES[0], energy), mw = muAt(SERIES[1], energy);
      out.innerHTML = `<span>through 1 cm bone <b>${(Math.exp(-mb) * 100).toFixed(1)}%</b> passes</span><span>through 1 cm water <b>${(Math.exp(-mw) * 100).toFixed(1)}%</b> passes</span><span>through 20 cm water <b>${(Math.exp(-20 * mw) * 100).toPrecision(2)}%</b> passes</span><span>bone / water μ <b>${(mb / mw).toFixed(1)}×</b></span>`;
    }
    Lab.slider(Lab.$('#at-e', root), (v) => v + ' keV', (v) => { energy = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(wrap, draw);
  })();

  /* ---------- Fig 9.1 Projections, sinogram, reconstruction ---------- */
  (function () {
    const root = Lab.$('#fig-recon');
    if (!root) return;
    const cv = Lab.$('canvas', root), out = Lab.$('.readouts', root), scanBtn = Lab.$('#rc-scan', root);
    const N = 128, D = 183, C = (D - 1) / 2, A = 180, FOV = 24, PS = FOV / N;   // pixel size in cm
    const mu = MI.render(N, (t) => MI.huToMu(t.hu), 2);
    const huTrue = MI.render(N, (t) => t.hu, 2);
    // Noise-free line integrals for all 180 angles, in units of mu * pixels.
    const sino = new Float32Array(A * D);
    (function () {
      const c0 = (N - 1) / 2;
      const at = (x, y) => {
        const i = Math.floor(x), j = Math.floor(y), a = x - i, b = y - j;
        if (i < 0 || j < 0 || i >= N - 1 || j >= N - 1) return 0;
        const p = j * N + i;
        return (1 - a) * (1 - b) * mu[p] + a * (1 - b) * mu[p + 1] + (1 - a) * b * mu[p + N] + a * b * mu[p + N + 1];
      };
      for (let k = 0; k < A; k++) {
        const th = (k * Math.PI) / A, c = Math.cos(th), s = Math.sin(th);
        for (let b = 0; b < D; b++) {
          const sv = b - C; let sum = 0;
          for (let t = -C; t <= C; t++) sum += at(c0 + sv * c - t * s, c0 + sv * s + t * c);
          sino[k * D + b] = sum;
        }
      }
    })();
    const kernel = (type) => {
      const h = new Float32Array(2 * D - 1);
      for (let n = -(D - 1); n <= D - 1; n++) {
        let v;
        if (type === 'ramlak') v = n === 0 ? 0.25 : n % 2 ? -1 / (Math.PI * Math.PI * n * n) : 0;
        else v = -2 / (Math.PI * Math.PI * (4 * n * n - 1));          // Shepp-Logan
        h[n + D - 1] = v;
      }
      return h;
    };
    const kernels = { ramlak: kernel('ramlak'), shepp: kernel('shepp') };
    let K = 180, filter = 'ramlak', photons = 6.5, recon = null, used = [], noisy = null, anim = 0, rafId = 0, ready = false;

    function makeNoisy() {
      const I0 = Math.pow(10, photons), r = Lab.rng(17);
      noisy = new Float32Array(A * D);
      for (let i = 0; i < A * D; i++) {
        const pcm = sino[i] * PS, mean = I0 * Math.exp(-pcm);
        const n = Math.max(1, mean + Math.sqrt(mean) * Lab.gauss(r));
        noisy[i] = -Math.log(n / I0) / PS;
      }
    }
    function angleList(k) { const a = []; for (let i = 0; i < k; i++) a.push(Math.round((i * A) / k) % A); return a; }
    function backproject(list, upto) {
      const img = new Float32Array(N * N), c0 = (N - 1) / 2, q = new Float32Array(D);
      const h = kernels[filter];
      for (let m = 0; m < upto; m++) {
        const k = list[m], th = (k * Math.PI) / A, c = Math.cos(th), s = Math.sin(th);
        const p = noisy.subarray(k * D, k * D + D);
        if (filter === 'none') q.set(p);
        else for (let b = 0; b < D; b++) { let acc = 0; for (let j = 0; j < D; j++) acc += p[j] * h[b - j + D - 1]; q[b] = acc; }
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const sv = (x - c0) * c + (y - c0) * s + C, b0 = Math.floor(sv), f = sv - b0;
          if (b0 < 0 || b0 >= D - 1) continue;
          img[y * N + x] += q[b0] * (1 - f) + q[b0 + 1] * f;
        }
      }
      const sc = Math.PI / Math.max(1, list.length);
      for (let i = 0; i < img.length; i++) img[i] *= sc;
      return img;
    }
    function reconstruct(upto) {
      used = angleList(K);
      recon = backproject(used, upto ?? used.length);
    }
    function draw(scanAngle) {
      if (!ready) return;
      const { ctx, w } = Lab.canvas(cv, null), F = MI.film(), pal = Lab.palette();
      const narrow = w < 600, gap = 10, lab = 18;
      const sq = narrow ? (w - gap) / 2 : (w - 2 * gap) / 3;
      const h = narrow ? lab + sq + gap + lab + sq * 0.62 : lab + sq;
      cv.style.height = h + 'px';
      const c2 = Lab.canvas(cv, null).ctx;
      c2.clearRect(0, 0, w, h);
      const P = [{ x: 0, y: lab }, { x: narrow ? 0 : sq + gap, y: narrow ? lab + sq + gap + lab : lab }, { x: narrow ? sq + gap : 2 * (sq + gap), y: lab }];
      const sinoW = narrow ? w : sq, sinoH = narrow ? sq * 0.62 : sq;
      const win = MI.window(200, 40);
      c2.font = `11px ${Lab.css('--f-mono')}`; c2.fillStyle = pal.ink2;
      c2.fillText('Object (μ map)', P[0].x, P[0].y - 6);
      c2.fillText('Sinogram: angle →, detector ↓', P[1].x, P[1].y - 6);
      c2.fillText(filter === 'none' ? 'Plain back-projection' : 'Filtered back-projection', P[2].x, P[2].y - 6);
      MI.gray(c2, huTrue, N, N, win, P[0].x, P[0].y, sq, sq);
      // Gantry: parallel rays at the current angle
      const th = ((scanAngle ?? used[used.length - 1] ?? 0) * Math.PI) / A, cx = P[0].x + sq / 2, cy = P[0].y + sq / 2;
      c2.save(); c2.beginPath(); c2.rect(P[0].x, P[0].y, sq, sq); c2.clip();
      c2.strokeStyle = Lab.rgbStr(Lab.rgb('--s2'), 0.55); c2.lineWidth = 1;
      for (let i = -5; i <= 5; i++) {
        const sv = (i / 5) * sq * 0.48, ox = cx + sv * Math.cos(th), oy = cy + sv * Math.sin(th);
        c2.beginPath(); c2.moveTo(ox + sq * Math.sin(th), oy - sq * Math.cos(th)); c2.lineTo(ox - sq * Math.sin(th), oy + sq * Math.cos(th)); c2.stroke();
      }
      c2.restore();
      // Sinogram: unused angles stay dark
      const sImg = new Float32Array(A * D), have = new Set(scanAngle != null ? used.slice(0, anim) : used);
      let smax = 0; for (let i = 0; i < A * D; i++) smax = Math.max(smax, sino[i]);
      for (let k = 0; k < A; k++) if (have.has(k)) for (let b = 0; b < D; b++) sImg[b * A + k] = noisy[k * D + b] / smax;
      MI.gray(c2, sImg, A, D, (v) => Math.max(0, Math.min(1, v)), P[1].x, P[1].y, sinoW, sinoH);
      // Reconstruction
      if (filter === 'none') {
        let lo = Infinity, hi = -Infinity; for (const v of recon) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
        MI.gray(c2, recon, N, N, (v) => (v - lo) / (hi - lo || 1), P[2].x, P[2].y, sq, sq);
      } else MI.gray(c2, recon, N, N, (v) => win(MI.muToHu(v)), P[2].x, P[2].y, sq, sq);
      MI.overlay(c2, P[0].x, P[0].y, sq, sq, { bl: ['W 200 L 40'] });
      MI.overlay(c2, P[2].x, P[2].y, sq, sq, { bl: [filter === 'none' ? 'auto scaled' : 'W 200 L 40', `${have.size} views`] });
      if (filter !== 'none' && scanAngle == null) {
        // Noise: spread of reconstructed values over pixels that are pure white matter.
        let s1 = 0, s2 = 0, n = 0;
        for (let i = 0; i < N * N; i++) if (huTrue[i] === MI.tissues.wm.hu) { const v = MI.muToHu(recon[i]); s1 += v; s2 += v * v; n++; }
        const sd = Math.sqrt(Math.max(0, s2 / n - (s1 / n) ** 2));
        out.innerHTML = `<span>views <b>${K}</b></span><span>photons per ray <b>${Lab.fmt.si(Math.pow(10, photons))}</b></span><span>noise in white matter <b>${sd.toFixed(0)} HU</b> (σ)</span><span>gray–white difference <b>10 HU</b></span>`;
      } else if (scanAngle == null) out.innerHTML = `<span>views <b>${K}</b></span><span>Without the filter every point spreads into a 1/r halo; the image is too blurred to give HU.</span>`;
    }
    function scan() {
      cancelAnimationFrame(rafId);
      used = angleList(K);
      if (Lab.reducedMotion) { reconstruct(); draw(); return; }
      anim = 0; scanBtn.disabled = true;
      const img = new Float32Array(N * N);
      const step = () => {
        const per = Math.max(1, Math.round(K / 60));
        for (let r = 0; r < per && anim < used.length; r++) {
          const one = backproject([used[anim]], 1);
          for (let i = 0; i < img.length; i++) img[i] += one[i] / used.length;   // backproject() scaled by pi/1; rescale to pi/K
          anim++;
        }
        recon = img;
        draw(used[anim - 1]);
        if (anim < used.length) rafId = requestAnimationFrame(step); else { scanBtn.disabled = false; draw(); }
      };
      rafId = requestAnimationFrame(step);
    }
    const redo = () => { if (!ready) return; reconstruct(); draw(); };
    Lab.slider(Lab.$('#rc-k', root), (v) => v.toFixed(0), (v) => { K = v; redo(); });
    Lab.slider(Lab.$('#rc-i', root), (v) => Lab.fmt.si(Math.pow(10, v)), (v) => { photons = v; if (ready) { makeNoisy(); redo(); } });
    Lab.$('#rc-filter', root).addEventListener('change', (e) => { filter = e.target.value; redo(); });
    scanBtn.addEventListener('click', scan);
    makeNoisy(); reconstruct(); ready = true; draw();
    Lab.onTheme(() => draw()); Lab.onResize(cv, () => draw());
  })();

  /* ---------- Fig 10.1 Window and level ---------- */
  (function () {
    const root = Lab.$('#fig-window');
    if (!root) return;
    const cv = Lab.$('canvas', root), wrap = Lab.$('.chart-wrap', root), svg = Lab.$('svg', root), tip = Lab.tip(wrap), out = Lab.$('.readouts', root), hu = Lab.$('.hu-read', root);
    const N = 256, img = MI.ctImage(N, 4, 3);
    const PRESETS = { brain: [80, 40], subdural: [215, 75], soft: [400, 40], bone: [1800, 400], lung: [1500, -600] };
    const wIn = Lab.$('#wl-w', root), lIn = Lab.$('#wl-l', root);
    let W = 80, L = 40, ready = false;
    const toW = (u) => Math.round(Math.pow(4000, u)), fromW = (w) => Math.log(w) / Math.log(4000);
    function draw() {
      if (!ready) return;
      const { ctx, w } = Lab.canvas(cv, 1), F = MI.film(), pal = Lab.palette();
      ctx.fillStyle = F.bg; ctx.fillRect(0, 0, w, w);
      MI.gray(ctx, img, N, N, MI.window(W, L), 0, 0, w, w);
      MI.overlay(ctx, 0, 0, w, w, { tl: ['CT · head', 'axial'], bl: [`W ${W}`, `L ${L}`] });
      // Histogram over [L - W, L + W], so the window always fills the middle half.
      const SW = Math.max(280, Math.round(wrap.clientWidth || 360)), SH = 180, padL = 8, padR = 8, T = 22, B = 34;
      svg.innerHTML = ''; svg.setAttribute('viewBox', `0 0 ${SW} ${SH}`); svg.setAttribute('height', SH);
      const lo = L - W, hi = L + W, nb = 64, bins = new Float32Array(nb);
      for (let p = 0; p < img.length; p++) { const b = Math.floor(((img[p] - lo) / (hi - lo)) * nb); if (b >= 0 && b < nb) bins[b]++; }
      const mx = Math.log10(1 + Math.max(...bins));
      const x = Lab.scale(lo, hi, padL, SW - padR), bw = (SW - padL - padR) / nb;
      for (let b = 0; b < nb; b++) {
        const v = Math.log10(1 + bins[b]) / (mx || 1), bh = v * (SH - T - B);
        const r = Lab.svg('rect', { x: padL + b * bw + 0.5, y: SH - B - bh, width: Math.max(1, bw - 1), height: bh, fill: pal.ink3, opacity: 0.55 }, svg);
        const h0 = lo + (b / nb) * (hi - lo), h1 = h0 + (hi - lo) / nb;
        r.addEventListener('pointermove', () => { const s = svg.getBoundingClientRect().width / SW; tip.show((padL + (b + 0.5) * bw) * s, (SH - B - bh) * s, `<b>${Math.round(h0)} to ${Math.round(h1)} HU</b><br>${Lab.fmt.si(bins[b])} pixels · shown ${Math.round(MI.window(W, L)((h0 + h1) / 2) * 100)}% gray`); });
        r.addEventListener('pointerleave', () => tip.hide());
      }
      // Display ramp: black below L - W/2, white above L + W/2
      const y0 = SH - B, y1 = T;
      Lab.svg('path', { d: `M${padL} ${y0} L${x(L - W / 2)} ${y0} L${x(L + W / 2)} ${y1} L${SW - padR} ${y1}`, fill: 'none', stroke: pal.accent, 'stroke-width': 2 }, svg);
      Lab.svg('text', { x: x(L + W / 2) + 4, y: y1 + 12, 'font-size': 11, fill: pal.ink2 }, svg).textContent = 'white';
      Lab.svg('text', { x: x(L - W / 2) - 4, y: y0 - 6, 'font-size': 11, fill: pal.ink2, 'text-anchor': 'end' }, svg).textContent = 'black';
      [lo, L, hi].forEach((v, i) => Lab.svg('text', { x: x(v), y: SH - B + 16, 'text-anchor': ['start', 'middle', 'end'][i], 'font-size': 11, fill: pal.ink3 }, svg).textContent = Math.round(v));
      Lab.svg('text', { x: SW / 2, y: SH - 4, 'text-anchor': 'middle', 'font-size': 11, fill: pal.ink3 }, svg).textContent = 'Hounsfield units (log pixel counts)';
      const grays = ['wm', 'gm', 'lesion', 'blood', 'csf'].map((k) => `${MI.tissues[k].name} ${Math.round(MI.window(W, L)(MI.tissues[k].hu) * 100)}%`);
      out.innerHTML = `<span>each gray step spans <b>${(W / 256).toFixed(W < 256 ? 2 : 1)} HU</b></span>` + grays.map((g) => `<span>${g.replace(/(\d+%)$/, '<b>$1</b>')}</span>`).join('');
    }
    function set(w, l) { W = w; L = l; wIn.value = fromW(w); lIn.value = l; wIn.dispatchEvent(new Event('input')); lIn.dispatchEvent(new Event('input')); }
    Lab.$$('[data-wl]', root).forEach((b) => b.addEventListener('click', () => {
      const [w, l] = PRESETS[b.dataset.wl]; set(w, l);
      Lab.$$('[data-wl]', root).forEach((o) => o.setAttribute('aria-pressed', o === b ? 'true' : 'false'));
    }));
    Lab.slider(wIn, (u) => toW(u) + ' HU', (u) => { W = toW(u); draw(); });
    Lab.slider(lIn, (v) => v + ' HU', (v) => { L = v; draw(); });
    cv.addEventListener('pointermove', (e) => {
      const r = cv.getBoundingClientRect(), i = Math.floor(((e.clientX - r.left) / r.width) * N), j = Math.floor(((e.clientY - r.top) / r.height) * N);
      if (i >= 0 && j >= 0 && i < N && j < N) {
        const t = MI.tissueAt(((i + 0.5) / N * 2 - 1) * MI.FOV, ((j + 0.5) / N * 2 - 1) * MI.FOV);
        hu.innerHTML = `pixel value <b>${Math.round(img[j * N + i])} HU</b> · ${MI.tissues[t].name}`;
      }
    });
    cv.addEventListener('pointerleave', () => { hu.textContent = 'Point at the image to read a pixel value.'; });
    ready = true; set(80, 40);
    Lab.onTheme(draw); Lab.onResize(cv, draw);
  })();

  /* ---------- Fig 11.1 Effective dose ---------- */
  (function () {
    const root = Lab.$('#fig-dose');
    if (!root) return;
    const wrap = Lab.$('.chart-wrap', root), svg = Lab.$('svg', root), tip = Lab.tip(wrap);
    // Average adult effective doses, Mettler et al. (2008); background from NCRP Report 160.
    const ROWS = [
      ['Dental X-ray (intraoral)', 0.005, 'x'],
      ['Chest X-ray (PA)', 0.02, 'x'],
      ['Chest X-ray (PA and lateral)', 0.1, 'x'],
      ['Screening mammogram', 0.4, 'x'],
      ['Lumbar spine X-ray', 1.5, 'x'],
      ['Head CT', 2, 'ct'],
      ['Natural background, one year (US)', 3.1, 'bg'],
      ['Chest CT', 7, 'ct'],
      ['Abdomen CT', 8, 'ct'],
      ['Coronary CT angiography', 16, 'ct'],
    ];
    function draw() {
      const pal = Lab.palette(), W = Math.max(320, Math.round(wrap.clientWidth || 640)), narrow = W < 560;
      const rh = narrow ? 40 : 28, labW = narrow ? 0 : 230, T = 8, B = 36, H = T + ROWS.length * rh + B;
      svg.innerHTML = ''; svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H);
      const x = Lab.logScale(0.001, 30, labW + 6, W - 48);
      [0.001, 0.01, 0.1, 1, 10].forEach((v) => {
        Lab.svg('line', { x1: x(v), x2: x(v), y1: T, y2: H - B + 4, stroke: pal.grid }, svg);
        Lab.svg('text', { x: x(v), y: H - B + 18, 'text-anchor': 'middle', 'font-size': 11, fill: pal.ink3 }, svg).textContent = v;
      });
      Lab.svg('text', { x: W - 8, y: H - 4, 'text-anchor': 'end', 'font-size': 11, fill: pal.ink3 }, svg).textContent = 'effective dose (mSv, log scale)';
      ROWS.forEach(([name, v, kind], i) => {
        const y = T + i * rh, by = narrow ? y + 18 : y + 6, bh = narrow ? 14 : rh - 12;
        const col = kind === 'ct' ? pal.s1 : kind === 'bg' ? pal.s2 : pal.ink3;
        Lab.svg('text', narrow ? { x: x(0.001), y: y + 13, 'font-size': 11.5, fill: pal.ink2 } : { x: labW, y: by + bh / 2 + 4, 'text-anchor': 'end', 'font-size': 11.5, fill: pal.ink2 }, svg).textContent = name;
        Lab.svg('rect', { x: x(0.001), y: by, width: Math.max(2, x(v) - x(0.001)), height: bh, rx: 2, fill: col }, svg);
        Lab.svg('text', { x: x(v) + 5, y: by + bh / 2 + 4, 'font-size': 11, fill: pal.ink }, svg).textContent = v;
        const hit = Lab.svg('rect', { x: 0, y, width: W, height: rh, fill: 'transparent' }, svg);
        hit.addEventListener('pointermove', () => {
          const s = svg.getBoundingClientRect().width / W;
          tip.show(x(v) * s, by * s, `<b>${name}</b><br>${v} mSv · ${(v / 0.02).toFixed(v < 0.02 ? 2 : 0)} chest X-rays · ${(v / 3.1 * 365).toFixed(0)} days of background`, (by + bh) * s);
        });
        hit.addEventListener('pointerleave', () => tip.hide());
      });
    }
    draw(); Lab.onTheme(draw); Lab.onResize(wrap, draw);
  })();
})();
