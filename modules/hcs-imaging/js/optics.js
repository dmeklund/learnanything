/* Volume V, optics figures: resolution, fluorescence filters, the confocal pinhole, optical sectioning. */
(function () {
  /* ---------- Fig 1.1 Two points and the diffraction limit ---------- */
  (function () {
    const root = Lab.$('#fig-airy');
    if (!root) return;
    const cv = Lab.$('canvas', root), out = Lab.$('.readouts', root);
    const st = { lam: 520, na: 0.75, d: 450 };
    let ready = false;
    function draw() {
      if (!ready) return;
      const { ctx, w, h } = Lab.canvas(cv, (cv.clientWidth || 600) < 560 ? 1.1 : 0.44), pal = Lab.palette(), F = MX.film();
      ctx.clearRect(0, 0, w, h);
      const narrow = w < 560, side = narrow ? Math.min(w, h * 0.5) : h, px = narrow ? (w - side) / 2 : 0;
      const span = 2000;                                         // nm across the image
      const k = (2 * Math.PI * st.na) / st.lam, N = 160, img = new Float32Array(N * N), col = MX.waveRGB(st.lam);
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const x = ((i + 0.5) / N - 0.5) * span, y = ((j + 0.5) / N - 0.5) * span;
        img[j * N + i] = MX.airy(k * Math.hypot(x - st.d / 2, y)) + MX.airy(k * Math.hypot(x + st.d / 2, y));
      }
      let mx = 0; for (const v of img) mx = Math.max(mx, v);
      ctx.fillStyle = F.bg; ctx.fillRect(px, 0, side, side);
      MX.gray(ctx, img, N, N, (v) => Math.pow(v / mx, 0.8), px, 0, side, side, col);
      ctx.fillStyle = F.ink; ctx.fillRect(px + side - 12 - (500 / span) * side, side - 12, (500 / span) * side, 2);
      ctx.font = `11px ${Lab.css('--f-mono')}`; ctx.fillStyle = F.ink2; ctx.textAlign = 'right'; ctx.fillText('500 nm', px + side - 12, side - 18); ctx.textAlign = 'left';
      // Line profile through both points
      const x0 = narrow ? 36 : side + 46, y0 = narrow ? side + 22 : 14, pw = w - x0 - 10, ph = (narrow ? h - side - 22 : h - 14) - 34;
      const X = (nm) => x0 + 12 + ((nm + span / 2) / span) * (pw - 24), Y = (v) => y0 + ph - v * ph;
      ctx.strokeStyle = pal.grid; [0, 0.5, 1].forEach((v) => { ctx.beginPath(); ctx.moveTo(x0, Y(v)); ctx.lineTo(x0 + pw, Y(v)); ctx.stroke(); ctx.fillStyle = pal.ink3; ctx.textAlign = 'right'; ctx.fillText(v, x0 - 6, Y(v) + 4); });
      ctx.textAlign = 'center'; [-1000, -500, 0, 500, 1000].forEach((nm) => ctx.fillText(nm, X(nm), y0 + ph + 16)); ctx.textAlign = 'left';
      ctx.fillText('position (nm)', x0, y0 + ph + 30);
      const prof = (x) => MX.airy(k * Math.abs(x - st.d / 2)) + MX.airy(k * Math.abs(x + st.d / 2));
      let pmx = 0; for (let x = -span / 2; x <= span / 2; x += 2) pmx = Math.max(pmx, prof(x));
      [[(x) => MX.airy(k * Math.abs(x - st.d / 2)), pal.ink3, 1], [(x) => MX.airy(k * Math.abs(x + st.d / 2)), pal.ink3, 1], [prof, pal.s1, 2.2]].forEach(([f, c, lw]) => {
        ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.setLineDash(lw < 2 ? [3, 3] : []); ctx.beginPath();
        for (let x = -span / 2; x <= span / 2; x += 4) { const yy = Y(f(x) / pmx); x === -span / 2 ? ctx.moveTo(X(x), yy) : ctx.lineTo(X(x), yy); }
        ctx.stroke();
      });
      ctx.setLineDash([]); ctx.lineWidth = 1;
      const rayl = (0.61 * st.lam) / st.na, abbe = st.lam / (2 * st.na), dip = 1 - prof(0) / pmx;
      ctx.strokeStyle = pal.accent; ctx.setLineDash([4, 3]);
      [-rayl / 2, rayl / 2].forEach((x) => { ctx.beginPath(); ctx.moveTo(X(x), y0); ctx.lineTo(X(x), y0 + ph); ctx.stroke(); });
      ctx.setLineDash([]); ctx.fillStyle = pal.ink2; ctx.fillText('Rayleigh separation', X(rayl / 2) + 4, y0 + 12);
      out.innerHTML = `<span>Rayleigh limit 0.61λ/NA <b>${rayl.toFixed(0)} nm</b></span><span>Abbe limit λ/2NA <b>${abbe.toFixed(0)} nm</b></span><span>dip between peaks <b>${Math.max(0, dip * 100).toFixed(0)}%</b></span><span>${dip > 0.25 ? '<b>resolved</b>' : dip > 0.02 ? 'barely separated' : '<b class="warn">one blur</b>'}</span>`;
    }
    Lab.slider(Lab.$('#ai-l', root), (v) => v + ' nm', (v) => { st.lam = v; draw(); });
    Lab.slider(Lab.$('#ai-na', root), (v) => v.toFixed(2), (v) => { st.na = v; draw(); });
    Lab.slider(Lab.$('#ai-d', root), (v) => v + ' nm', (v) => { st.d = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(cv, draw);
  })();

  /* ---------- Fig 2.1 Two dyes, two filters ---------- */
  (function () {
    const root = Lab.$('#fig-filters');
    if (!root) return;
    const wrap = Lab.$('.chart-wrap', root), svg = Lab.$('svg', root), tip = Lab.tip(wrap), out = Lab.$('.readouts', root);
    // Illustrative spectra shaped like EGFP (ex 488, em 507) and mCherry (ex 587, em 610).
    const sk = (l, peak, wl, wr) => Math.exp(-0.5 * Math.pow((l - peak) / (l < peak ? wl : wr), 2));
    const DYES = [
      { key: 's1', name: 'GFP', ex: (l) => sk(l, 488, 22, 9) + 0.15 * sk(l, 400, 12, 15), em: (l) => sk(l, 507, 9, 30) + 0.35 * sk(l, 545, 15, 40) },
      { key: 's2', name: 'mCherry', ex: (l) => sk(l, 587, 30, 14), em: (l) => sk(l, 610, 13, 32) + 0.2 * sk(l, 650, 20, 30) },
    ];
    const st = { c1: 525, w1: 50, c2: 630, w2: 60, l488: true, l561: true };
    let ready = false;
    function signals() {
      const lasers = [st.l488 && 488, st.l561 && 561].filter(Boolean);
      const chans = [[st.c1, st.w1], [st.c2, st.w2]];
      return DYES.map((d) => {
        const exc = lasers.reduce((a, l) => a + d.ex(l), 0);
        return chans.map(([c, wd]) => { let s = 0; for (let l = c - wd / 2; l <= c + wd / 2; l += 1) s += d.em(l); return s * exc; });
      });
    }
    function draw() {
      if (!ready) return;
      const pal = Lab.palette(), W = Math.max(300, Math.round(wrap.clientWidth || 640)), H = 240, L = 14, R = 14, T = 20, B = 36;
      svg.innerHTML = ''; svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H);
      const x = Lab.scale(380, 720, L, W - R), y = Lab.scale(0, 1.1, H - B, T);
      for (let l = 400; l <= 700; l += 50) {
        Lab.svg('line', { x1: x(l), x2: x(l), y1: T, y2: H - B, stroke: pal.grid }, svg);
        Lab.svg('text', { x: x(l), y: H - B + 16, 'text-anchor': 'middle', 'font-size': 11, fill: pal.ink3 }, svg).textContent = l;
      }
      Lab.svg('text', { x: W - R, y: H - 4, 'text-anchor': 'end', 'font-size': 11, fill: pal.ink3 }, svg).textContent = 'wavelength (nm)';
      [[st.c1, st.w1, 'green channel'], [st.c2, st.w2, 'red channel']].forEach(([c, wd, lab]) => {
        Lab.svg('rect', { x: x(c - wd / 2), y: T, width: x(c + wd / 2) - x(c - wd / 2), height: H - B - T, fill: pal.ink3, opacity: 0.14 }, svg);
        Lab.svg('text', { x: x(c), y: T - 6, 'text-anchor': 'middle', 'font-size': 10.5, fill: pal.ink2 }, svg).textContent = lab;
      });
      DYES.forEach((d) => {
        let pe = '', pm = `M${x(380)} ${y(0)}`;
        for (let l = 380; l <= 720; l += 2) { pe += (l === 380 ? 'M' : 'L') + x(l).toFixed(1) + ' ' + y(d.ex(l)).toFixed(1); pm += 'L' + x(l).toFixed(1) + ' ' + y(d.em(l)).toFixed(1); }
        pm += `L${x(720)} ${y(0)}Z`;
        Lab.svg('path', { d: pm, fill: pal[d.key], opacity: 0.28, stroke: pal[d.key], 'stroke-width': 2 }, svg);
        Lab.svg('path', { d: pe, fill: 'none', stroke: pal[d.key], 'stroke-width': 1.6, 'stroke-dasharray': '5 3' }, svg);
        let pk = 380, pv = 0; for (let l = 380; l <= 720; l++) if (d.em(l) > pv) { pv = d.em(l); pk = l; }
        Lab.svg('text', { x: x(pk) + 6, y: y(pv) - 4, 'font-size': 11.5, fill: pal.ink }, svg).textContent = d.name;
      });
      [[488, st.l488], [561, st.l561]].forEach(([l, on]) => {
        if (!on) return;
        Lab.svg('line', { x1: x(l), x2: x(l), y1: T, y2: H - B, stroke: pal.ink, 'stroke-width': 2 }, svg);
        Lab.svg('text', { x: x(l) - 4, y: H - B - 6, 'text-anchor': 'end', 'font-size': 10.5, fill: pal.ink }, svg).textContent = l + ' laser';
      });
      const hit = Lab.svg('rect', { x: L, y: T, width: W - L - R, height: H - B - T, fill: 'transparent' }, svg);
      hit.addEventListener('pointermove', (ev) => {
        const r = svg.getBoundingClientRect(), s = r.width / W, l = Math.round(380 + (((ev.clientX - r.left) / s - L) / (W - L - R)) * 340);
        tip.show(x(l) * s, T * s, `<b>${l} nm</b><br>GFP excitation ${DYES[0].ex(l).toFixed(2)}, emission ${DYES[0].em(l).toFixed(2)}<br>mCherry excitation ${DYES[1].ex(l).toFixed(2)}, emission ${DYES[1].em(l).toFixed(2)}`, (H - B) * s);
      });
      hit.addEventListener('pointerleave', () => tip.hide());
      const S = signals(), bt1 = S[0][0] ? S[1][0] / S[0][0] : 0, bt2 = S[1][1] ? S[0][1] / S[1][1] : Infinity;
      out.innerHTML = `<span>green channel: GFP <b>${S[0][0].toFixed(1)}</b>, mCherry bleed-through <b>${(bt1 * 100).toFixed(1)}%</b></span><span>red channel: mCherry <b>${S[1][1].toFixed(1)}</b>, GFP bleed-through <b class="${bt2 > 0.1 ? 'warn' : ''}">${isFinite(bt2) ? (bt2 * 100).toFixed(1) + '%' : '—'}</b></span>`;
    }
    Lab.slider(Lab.$('#fl-c1', root), (v) => v + ' nm', (v) => { st.c1 = v; draw(); });
    Lab.slider(Lab.$('#fl-w1', root), (v) => v + ' nm', (v) => { st.w1 = v; draw(); });
    Lab.slider(Lab.$('#fl-c2', root), (v) => v + ' nm', (v) => { st.c2 = v; draw(); });
    Lab.slider(Lab.$('#fl-w2', root), (v) => v + ' nm', (v) => { st.w2 = v; draw(); });
    Lab.$('#fl-488', root).addEventListener('change', (e) => { st.l488 = e.target.checked; draw(); });
    Lab.$('#fl-561', root).addEventListener('change', (e) => { st.l561 = e.target.checked; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(wrap, draw);
  })();

  /* Gaussian-beam model shared by the confocal figures (lengths in µm). */
  const beam = (na, lam, n = 1.33) => {
    const w0 = 0.42 * (lam / 1000) / na, zR = (Math.PI * w0 * w0 * n) / (lam / 1000);
    return { w0, zR, w: (z) => w0 * Math.sqrt(1 + (z / zR) ** 2), au: 1.22 * (lam / 1000) / na };
  };

  /* ---------- Fig 3.1 The pinhole ---------- */
  (function () {
    const root = Lab.$('#fig-pinhole');
    if (!root) return;
    const cv = Lab.$('canvas', root), out = Lab.$('.readouts', root);
    const st = { na: 1.2, au: 1, lam: 520 };
    let ready = false;
    function draw() {
      if (!ready) return;
      const { ctx, w, h } = Lab.canvas(cv, (cv.clientWidth || 600) < 560 ? 1.3 : 0.5), pal = Lab.palette(), F = MX.film();
      ctx.clearRect(0, 0, w, h);
      const B = beam(st.na, st.lam), P = (st.au * B.au) / 2;     // pinhole radius projected into the sample
      const narrow = w < 560, pw = narrow ? (w - 10) / 2 : Math.min(h * 0.62, (w * 0.5 - 20) / 2), ph = pw * 1.6, gx = narrow ? 0 : 0;
      const xr = 1.2, zr = 1.2 * 3 * B.zR / 1.6 * 1.6;           // half-widths in µm
      const N = 90, M = 144;
      const wf = new Float32Array(N * M), cf = new Float32Array(N * M);
      for (let j = 0; j < M; j++) {
        const z = ((j + 0.5) / M - 0.5) * 2 * zr, wz = B.w(z);
        for (let i = 0; i < N; i++) {
          const r = ((i + 0.5) / N - 0.5) * 2 * xr, ill = (B.w0 / wz) ** 2 * Math.exp((-2 * r * r) / (wz * wz));
          const det = (1 - Math.exp((-2 * P * P) / (wz * wz))) * Math.exp((-2 * r * r) / (wz * wz + P * P));
          wf[j * N + i] = ill; cf[j * N + i] = ill * det;
        }
      }
      let mw = 0, mc = 0; for (let p = 0; p < N * M; p++) { mw = Math.max(mw, wf[p]); mc = Math.max(mc, cf[p]); }
      const tint = Lab.rgb('--ch-actin');
      [[wf, mw, 'widefield'], [cf, mc, `confocal, ${st.au} AU`]].forEach(([a, m, lab], k) => {
        const x0 = gx + k * (pw + 10);
        ctx.fillStyle = F.bg; ctx.fillRect(x0, 18, pw, ph);
        MX.gray(ctx, a, N, M, (v) => Math.pow(v / m, 0.5), x0, 18, pw, ph, tint);
        ctx.fillStyle = pal.ink2; ctx.font = `11px ${Lab.css('--f-mono')}`; ctx.fillText(lab, x0, 12);
        ctx.fillStyle = F.ink2; ctx.fillText('x →', x0 + 6, 18 + ph - 8); ctx.fillText('z ↓', x0 + pw - 30, 18 + ph - 8);
      });
      // Plane response: signal from a thin fluorescent sheet at defocus z
      const px0 = narrow ? 34 : 2 * pw + 56, py0 = narrow ? ph + 50 : 26, cw = w - px0 - 12, chh = narrow ? h - ph - 92 : h - 70;
      const zmax = 4 * B.zR, X = (z) => px0 + ((z + zmax) / (2 * zmax)) * cw, Y = (v) => py0 + chh - v * chh;
      ctx.fillStyle = pal.ink2; ctx.fillText('Signal from a thin fluorescent plane at depth z', px0, py0 - 14);
      ctx.strokeStyle = pal.grid; [0, 0.5, 1].forEach((v) => { ctx.beginPath(); ctx.moveTo(px0, Y(v)); ctx.lineTo(px0 + cw, Y(v)); ctx.stroke(); ctx.fillStyle = pal.ink3; ctx.textAlign = 'right'; ctx.fillText(v, px0 - 6, Y(v) + 4); });
      ctx.textAlign = 'center'; [-zmax, -zmax / 2, 0, zmax / 2, zmax].forEach((z) => ctx.fillText(z.toFixed(1), X(z), py0 + chh + 16)); ctx.textAlign = 'left';
      ctx.fillText('z (µm)', px0, py0 + chh + 30);
      const plane = (z) => (1 - Math.exp(-(P * P) / B.w(z) ** 2)) / (1 - Math.exp(-(P * P) / B.w0 ** 2));
      [[() => 1, pal.ink3, 'widefield: every plane counts the same'], [plane, pal.s1, 'confocal']].forEach(([f, c, lab], k) => {
        ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath();
        for (let i = 0; i <= 200; i++) { const z = -zmax + (i / 200) * 2 * zmax; i ? ctx.lineTo(X(z), Y(f(z))) : ctx.moveTo(X(z), Y(f(z))); }
        ctx.stroke(); ctx.lineWidth = 1; ctx.fillStyle = pal.ink2; ctx.fillText(lab, k ? X(zmax * 0.25) + 6 : px0 + 4, k ? Y(f(zmax * 0.25)) : Y(1) + 14);
      });
      // Section thickness: full width at half maximum of the plane response
      let zh = 0; while (zh < 50 && plane(zh) > 0.5) zh += 0.005;
      const latW = 1.18 * B.w0, latC = 1.18 * Math.sqrt(1 / (1 / (B.w0 * B.w0) + 1 / (B.w0 * B.w0 + P * P)));
      const sig = 1 - Math.exp(-(P * P) / (B.w0 * B.w0));
      out.innerHTML = `<span>1 Airy unit <b>${(B.au * 1000).toFixed(0)} nm</b> in the sample</span><span>optical section (FWHM) <b>${zh < 50 ? (2 * zh).toFixed(2) + ' µm' : 'none'}</b></span><span>lateral FWHM <b>${(latC * 1000).toFixed(0)} nm</b> (widefield ${(latW * 1000).toFixed(0)})</span><span>light collected from the focus <b>${(sig * 100).toFixed(0)}%</b></span>`;
    }
    Lab.slider(Lab.$('#ph-au', root), (v) => v.toFixed(2) + ' AU', (v) => { st.au = v; draw(); });
    Lab.slider(Lab.$('#ph-na', root), (v) => v.toFixed(2), (v) => { st.na = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(cv, draw);
  })();

  /* ---------- Fig 3.2 Focusing through a thick sample ---------- */
  (function () {
    const root = Lab.$('#fig-section');
    if (!root) return;
    const cv = Lab.$('canvas', root), out = Lab.$('.readouts', root);
    const r = Lab.rng(9), objs = [];
    // Beads 1 to 3 µm across, scattered through a 40 µm thick sample in a 60 µm field.
    for (let i = 0; i < 70; i++) objs.push({ x: r() * 60, y: r() * 60, z: (r() - 0.5) * 40, rad: 0.5 + r(), b: 0.6 + 0.4 * r() });
    const st = { z0: 0, au: 1 };
    let ready = false;
    function render(confocal) {
      const N = 150, img = new Float32Array(N * N), B = beam(0.75, 520), P = (st.au * B.au) / 2, sc = N / 60;
      objs.forEach((o) => {
        const dz = o.z - st.z0, blurR = Math.sqrt(o.rad ** 2 + (Math.abs(dz) * 0.75 / 1.33) ** 2 + B.w0 ** 2);
        let wgt = (o.rad / blurR) ** 2;
        if (confocal) wgt *= (1 - Math.exp(-(P * P) / B.w(dz) ** 2)) / (1 - Math.exp(-(P * P) / (B.w0 * B.w0)));
        const s2 = (blurR * sc) ** 2 / 2, cx = o.x * sc, cy = o.y * sc, R = Math.ceil(Math.sqrt(s2) * 3);
        for (let j = Math.max(0, Math.floor(cy - R)); j < Math.min(N, cy + R); j++) for (let i = Math.max(0, Math.floor(cx - R)); i < Math.min(N, cx + R); i++)
          img[j * N + i] += o.b * wgt * Math.exp(-((i - cx) ** 2 + (j - cy) ** 2) / (2 * s2));
      });
      return img;
    }
    function draw() {
      if (!ready) return;
      const { ctx, w } = Lab.canvas(cv, (cv.clientWidth || 600) < 560 ? 2.1 : 0.54), pal = Lab.palette(), F = MX.film();
      ctx.clearRect(0, 0, w, cv.height);
      const narrow = w < 560, sq = narrow ? w : (w - 12) / 2, N = 150, tint = Lab.rgb('--ch-actin');
      const imgs = [render(false), render(true)];
      const inFocus = objs.filter((o) => Math.abs(o.z - st.z0) < 1.5).length;
      imgs.forEach((img, k) => {
        const x0 = narrow ? 0 : k * (sq + 12), y0 = narrow ? k * (sq + 26) + 18 : 18;
        let mx = 0; for (const v of img) mx = Math.max(mx, v);
        MX.gray(ctx, img, N, N, (v) => Math.min(1, v / Math.max(0.6, mx * 0.9)), x0, y0, sq, sq, tint);
        ctx.fillStyle = pal.ink2; ctx.font = `11px ${Lab.css('--f-mono')}`; ctx.fillText(k ? `confocal, ${st.au} AU pinhole` : 'widefield', x0, y0 - 6);
        ctx.fillStyle = F.ink; ctx.fillRect(x0 + sq - 12 - sq / 6, y0 + sq - 12, sq / 6, 2); ctx.fillStyle = F.ink2; ctx.textAlign = 'right'; ctx.fillText('10 µm', x0 + sq - 12, y0 + sq - 18); ctx.textAlign = 'left';
      });
      out.innerHTML = `<span>focal plane <b>${st.z0 > 0 ? '+' : ''}${st.z0} µm</b></span><span>beads within 1.5 µm of focus <b>${inFocus}</b> of ${objs.length}</span>`;
    }
    Lab.slider(Lab.$('#sc-z', root), (v) => (v > 0 ? '+' : '') + v + ' µm', (v) => { st.z0 = v; draw(); });
    Lab.slider(Lab.$('#sc-au', root), (v) => v.toFixed(1) + ' AU', (v) => { st.au = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(cv, draw);
  })();
})();
