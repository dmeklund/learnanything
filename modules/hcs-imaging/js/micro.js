/* Shared helpers for Volume V (microscopy and screening) and the opening plate figure. Exposes window.MX. */
(function () {
  const MX = {};

  /* ---- Optics ---- */
  // Bessel J1 by numerical integration: J1(x) = (1/pi) * integral_0^pi cos(t - x sin t) dt
  MX.j1 = (x) => {
    const n = 48; let s = 0;
    for (let i = 0; i <= n; i++) {
      const t = (Math.PI * i) / n, w = i === 0 || i === n ? 1 : i % 2 ? 4 : 2;
      s += w * Math.cos(t - x * Math.sin(t));
    }
    return (s * (Math.PI / n / 3)) / Math.PI;
  };
  // Airy intensity [2 J1(v) / v]^2 with v = 2 pi NA r / lambda; tabulated for speed.
  const AIRY_MAX = 40, AIRY_N = 4000, airyTab = new Float32Array(AIRY_N + 1);
  for (let i = 0; i <= AIRY_N; i++) { const v = (i / AIRY_N) * AIRY_MAX; airyTab[i] = v < 1e-6 ? 1 : Math.pow((2 * MX.j1(v)) / v, 2); }
  MX.airy = (v) => { v = Math.abs(v); if (v >= AIRY_MAX) return 0; const f = (v / AIRY_MAX) * AIRY_N, i = f | 0, a = f - i; return airyTab[i] * (1 - a) + airyTab[Math.min(AIRY_N, i + 1)] * a; };
  // Approximate RGB for a visible wavelength (nm), for drawing light of that color.
  MX.waveRGB = (nm) => {
    let r = 0, g = 0, b = 0;
    if (nm < 440) { r = -(nm - 440) / 60; b = 1; } else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
    else if (nm < 510) { g = 1; b = -(nm - 510) / 20; } else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
    else if (nm < 645) { r = 1; g = -(nm - 645) / 65; } else { r = 1; }
    const f = nm < 420 ? 0.3 + 0.7 * (nm - 380) / 40 : nm > 680 ? 0.3 + 0.7 * (750 - nm) / 70 : 1;
    return [255 * Math.max(0, r) * f, 255 * Math.max(0, g) * f, 255 * Math.max(0, b) * f].map((c) => Math.min(255, Math.max(30, c)));
  };

  /* ---- Images ---- */
  MX.film = () => ({ bg: Lab.css('--film'), ink: Lab.css('--film-ink'), ink2: Lab.css('--film-ink-2') });
  // Separable Gaussian blur of a w×h Float32Array.
  MX.blur = (src, w, h, sigma) => {
    if (sigma < 0.3) return Float32Array.from(src);
    const r = Math.ceil(3 * sigma), k = []; let ks = 0;
    for (let i = -r; i <= r; i++) { const v = Math.exp(-(i * i) / (2 * sigma * sigma)); k.push(v); ks += v; }
    for (let i = 0; i < k.length; i++) k[i] /= ks;
    const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let s = 0; for (let i = -r; i <= r; i++) { const xx = Math.min(w - 1, Math.max(0, x + i)); s += src[y * w + xx] * k[i + r]; }
      tmp[y * w + x] = s;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let s = 0; for (let i = -r; i <= r; i++) { const yy = Math.min(h - 1, Math.max(0, y + i)); s += tmp[yy * w + x] * k[i + r]; }
      out[y * w + x] = s;
    }
    return out;
  };
  // Poisson sample (exact for small means, normal approximation above 40).
  MX.poisson = (lam, rng) => {
    if (lam <= 0) return 0;
    if (lam > 40) return Math.max(0, Math.round(lam + Math.sqrt(lam) * Lab.gauss(rng)));
    const L = Math.exp(-lam); let k = 0, p = 1;
    do { k++; p *= rng(); } while (p > L);
    return k - 1;
  };
  // Draw channels (Float32Arrays in [0,1]) as an additive composite with given RGB colors.
  MX.composite = (ctx, chans, colors, w, h, dx, dy, dw, dh) => {
    if (!(dw >= 1 && dh >= 1)) return;
    const off = document.createElement('canvas'); off.width = w; off.height = h;
    const o = off.getContext('2d'), id = o.createImageData(w, h), bg = Lab.rgb('--film');
    for (let p = 0; p < w * h; p++) {
      let r = bg[0], g = bg[1], b = bg[2];
      chans.forEach((c, i) => { const v = Math.min(1, Math.max(0, c[p])); r += colors[i][0] * v; g += colors[i][1] * v; b += colors[i][2] * v; });
      id.data[p * 4] = Math.min(255, r); id.data[p * 4 + 1] = Math.min(255, g); id.data[p * 4 + 2] = Math.min(255, b); id.data[p * 4 + 3] = 255;
    }
    o.putImageData(id, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.drawImage(off, dx, dy, dw, dh);
  };
  MX.gray = (ctx, arr, w, h, map, dx, dy, dw, dh, tint) => MX.composite(ctx, [Float32Array.from(arr, map)], [tint || [255, 255, 255]], w, h, dx, dy, dw, dh);
  MX.channelRGB = (name) => Lab.rgb('--ch-' + name);

  /* ---- Synthetic cells ----
     Returns three channels for an N×N field: nuclei (DNA stain), actin, mitochondria.
     pheno in [0,1] enlarges nuclei and dims mitochondria, standing in for a compound's effect. */
  MX.cells = (N, seed, opts = {}) => {
    const r = Lab.rng(seed), count = opts.count ?? 14, pheno = opts.pheno ?? 0;
    const nuc = new Float32Array(N * N), act = new Float32Array(N * N), mit = new Float32Array(N * N), cells = [];
    for (let k = 0; k < count * 4 && cells.length < count; k++) {
      const x = 0.08 + 0.84 * r(), y = 0.08 + 0.84 * r();
      if (cells.some((c) => Math.hypot(c.x - x, c.y - y) < 0.17)) continue;
      cells.push({ x, y, rn: (0.045 + 0.015 * r()) * (1 + 0.45 * pheno), rc: 0.1 + 0.03 * r(), a: r() * Math.PI, e: 0.75 + 0.25 * r(), bright: 0.7 + 0.3 * r() });
    }
    const S = (v) => Math.round(v * N);
    cells.forEach((c) => {
      const ca = Math.cos(c.a), sa = Math.sin(c.a), x0 = S(c.x), y0 = S(c.y), R = S(c.rc * 1.4);
      for (let j = y0 - R; j <= y0 + R; j++) for (let i = x0 - R; i <= x0 + R; i++) {
        if (i < 0 || j < 0 || i >= N || j >= N) continue;
        const dx = i / N - c.x, dy = j / N - c.y, u = dx * ca + dy * sa, v = (-dx * sa + dy * ca) / c.e;
        const d = Math.hypot(u, v), p = j * N + i;
        if (d < c.rn) nuc[p] = Math.max(nuc[p], c.bright * (0.75 + 0.25 * Math.cos(d / c.rn * 2.2)));
        const th = Math.atan2(v, u), wob = c.rc * (1 + 0.09 * Math.sin(th * 3 + c.a * 3) + 0.05 * Math.sin(th * 5 + c.a));
        if (d < wob) act[p] = Math.max(act[p], 0.18 + 0.5 * Math.pow(d / wob, 3));
      }
      // Stress fibers: bright straight segments across the cell
      for (let f = 0; f < 5; f++) {
        const ang = c.a + (r() - 0.5) * 0.6, off = (r() - 0.5) * c.rc * 1.2, L = c.rc * 0.9;
        for (let t = -L; t <= L; t += 0.5 / N) {
          const i = S(c.x + Math.cos(ang) * t - Math.sin(ang) * off), j = S(c.y + Math.sin(ang) * t + Math.cos(ang) * off);
          if (i >= 0 && j >= 0 && i < N && j < N) act[j * N + i] = Math.min(1, act[j * N + i] + 0.35);
        }
      }
      // Mitochondria: short worms between nucleus and cell edge
      const nm = Math.round(28 * (1 - 0.6 * pheno));
      for (let m = 0; m < nm; m++) {
        const ang = r() * 2 * Math.PI, rad = c.rn * 1.15 + r() * (c.rc - c.rn * 1.15), dir = r() * Math.PI, len = 0.012 + 0.012 * r();
        for (let t = 0; t <= len; t += 0.4 / N) {
          const i = S(c.x + Math.cos(ang) * rad + Math.cos(dir) * t), j = S(c.y + Math.sin(ang) * rad + Math.sin(dir) * t);
          if (i >= 0 && j >= 0 && i < N && j < N) mit[j * N + i] = Math.min(1, mit[j * N + i] + 0.8 * (1 - 0.4 * pheno));
        }
      }
    });
    return { nuc: MX.blur(nuc, N, N, N / 260), act: MX.blur(act, N, N, N / 300), mit: MX.blur(mit, N, N, N / 220), cells };
  };

  /* ---------- Hero: a 384-well plate and one well's cells ---------- */
  (function () {
    const root = Lab.$('#hero-plate');
    if (!root) return;
    const wrap = Lab.$('.chart-wrap', root), svg = Lab.$('svg', root), cv = Lab.$('canvas', root), tip = Lab.tip(wrap), note = Lab.$('.hero-well', root);
    const ROWS = 16, COLS = 24, r = Lab.rng(2024), score = [];
    // Illustrative screen: controls in the outer columns, a few active compounds among the samples.
    for (let i = 0; i < ROWS; i++) for (let j = 0; j < COLS; j++) {
      let s;
      if (j < 2) s = 0.05 + 0.06 * r(); else if (j >= COLS - 2) s = 0.85 + 0.1 * r();
      else s = r() < 0.035 ? 0.55 + 0.4 * r() : Math.max(0, 0.08 + 0.07 * Lab.gauss(r));
      score.push(s);
    }
    let sel = 5 * COLS + 9; score[sel] = 0.82;
    const name = (k) => String.fromCharCode(65 + Math.floor(k / COLS)) + String(k % COLS + 1).padStart(2, '0');
    function drawPlate() {
      const pal = Lab.palette(), W = Math.max(280, Math.round(wrap.clientWidth || 500)), pad = 18, cw = (W - pad - 6) / COLS, H = Math.round(pad + cw * ROWS + 6);
      svg.innerHTML = ''; svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H);
      const lo = Lab.rgb('--paper-3'), hi = Lab.rgb('--s1');
      Lab.svg('rect', { x: 0.5, y: 0.5, width: W - 1, height: H - 1, rx: 8, fill: pal.paper2, stroke: pal.rule }, svg);
      for (let j = 0; j < COLS; j += 1) if (j === 0 || (j + 1) % (W < 420 ? 6 : 3) === 0) Lab.svg('text', { x: pad + (j + 0.5) * cw, y: 12, 'text-anchor': 'middle', 'font-size': 9, fill: pal.ink3 }, svg).textContent = j + 1;
      for (let i = 0; i < ROWS; i += 1) if (i % 3 === 0) Lab.svg('text', { x: 9, y: pad + (i + 0.5) * cw + 3, 'text-anchor': 'middle', 'font-size': 9, fill: pal.ink3 }, svg).textContent = String.fromCharCode(65 + i);
      score.forEach((s, k) => {
        const i = Math.floor(k / COLS), j = k % COLS, cx = pad + (j + 0.5) * cw, cy = pad + (i + 0.5) * cw;
        const c = Lab.svg('circle', { cx, cy, r: cw * 0.4, fill: Lab.rgbStr(Lab.mix(lo, hi, Math.min(1, s))), stroke: k === sel ? pal.ink : pal.rule, 'stroke-width': k === sel ? 2 : 0.6 }, svg);
        c.style.cursor = 'pointer';
        c.addEventListener('pointermove', () => { const sc = svg.getBoundingClientRect().width / W; tip.show(cx * sc, (cy - cw / 2) * sc, `<b>${name(k)}</b> · ${j < 2 ? 'negative control' : j >= COLS - 2 ? 'positive control' : 'compound'}<br>phenotype score ${s.toFixed(2)}`, (cy + cw / 2) * sc); });
        c.addEventListener('pointerleave', () => tip.hide());
        c.addEventListener('click', () => { sel = k; drawPlate(); drawWell(); });
      });
    }
    function drawWell() {
      const { ctx, w } = Lab.canvas(cv, 1), N = 220, s = score[sel];
      const C = MX.cells(N, 100 + sel, { count: 9, pheno: Math.min(1, s * 1.1) });
      ctx.fillStyle = MX.film().bg; ctx.fillRect(0, 0, w, w);
      MX.composite(ctx, [C.nuc, C.act, C.mit], [MX.channelRGB('dna'), MX.channelRGB('actin'), MX.channelRGB('mito')], N, N, 0, 0, w, w);
      const F = MX.film(); ctx.font = `500 11px ${Lab.css('--f-mono')}`;
      ctx.fillStyle = F.ink; ctx.fillText(`well ${name(sel)}`, 8, 16);
      ctx.fillStyle = F.ink2; ctx.fillText('DNA · actin · mitochondria', 8, w - 8);
      ctx.fillStyle = F.ink; ctx.fillRect(w - 58, w - 14, 46, 2); ctx.fillStyle = F.ink2; ctx.textAlign = 'right'; ctx.fillText('20 µm', w - 12, w - 20); ctx.textAlign = 'left';
      note.textContent = `${name(sel)}: score ${s.toFixed(2)}${s > 0.4 && sel % COLS < COLS - 2 && sel % COLS >= 2 ? ', a hit: nuclei enlarged, mitochondria sparse' : ''}`;
    }
    drawPlate(); drawWell();
    Lab.onTheme(() => { drawPlate(); drawWell(); }); Lab.onResize(wrap, () => { drawPlate(); drawWell(); });
  })();

  window.MX = MX;
})();
