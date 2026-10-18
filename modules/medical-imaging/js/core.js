/* Shared imaging core for Volume III: tissue properties, a head phantom rendered as
   CT or MR, a 2-D FFT, and a simplified ultrasound B-mode simulator. Exposes window.MI. */
(function () {
  const MI = {};

  /* ---- Tissues of the head phantom ----
     hu: CT number. pd: relative proton density. t1, t2: relaxation times in ms at 1.5 T.
     Approximate textbook values; published measurements vary widely with field strength,
     method, and patient. */
  MI.tissues = {
    air:    { name: 'Air',               hu: -1000, pd: 0,    t1: 1,    t2: 1 },
    fat:    { name: 'Scalp fat',         hu: -90,   pd: 0.9,  t1: 260,  t2: 80 },
    bone:   { name: 'Skull',             hu: 1200,  pd: 0.05, t1: 300,  t2: 1 },
    csf:    { name: 'CSF',               hu: 8,     pd: 1.0,  t1: 4000, t2: 2000 },
    gm:     { name: 'Gray matter',       hu: 38,    pd: 0.82, t1: 1100, t2: 95 },
    wm:     { name: 'White matter',      hu: 28,    pd: 0.7,  t1: 650,  t2: 72 },
    lesion: { name: 'Lesion with edema', hu: 18,    pd: 0.88, t1: 1400, t2: 150 },
    blood:  { name: 'Acute hematoma',    hu: 70,    pd: 0.8,  t1: 1000, t2: 45 },
  };
  MI.tissueKeys = Object.keys(MI.tissues);

  /* Ellipses in image coordinates on [-1, 1]: x right, y down. Painted in order; a later
     ellipse overrides earlier ones. `clip` limits painting to inside another ellipse. */
  const E = (x, y, a, b, deg, tissue, clip) => ({ x, y, a, b, t: deg * Math.PI / 180, tissue, clip });
  const skullOuter = E(0, 0, 0.69, 0.92, 0);
  const skullInner = E(0, 0, 0.635, 0.865, 0);
  MI.head = [
    E(0, 0, 0.74, 0.97, 0, 'fat'),
    { ...skullOuter, tissue: 'bone' },
    E(0, -0.8, 0.13, 0.05, 0, 'air', skullOuter),            // frontal sinus
    { ...skullInner, tissue: 'csf' },                          // thin subarachnoid space
    E(-0.52, 0.02, 0.2, 0.5, 0, 'blood', skullInner),          // subdural hematoma (crescent once brain is drawn)
    E(0.035, 0, 0.6, 0.845, 0, 'gm', skullInner),              // brain, pushed right by the hematoma
    E(0.04, 0.02, 0.5, 0.73, 0, 'wm'),
    E(-0.13, -0.05, 0.09, 0.3, 14, 'csf'),                     // lateral ventricles
    E(0.2, -0.05, 0.1, 0.32, -14, 'csf'),
    E(0.04, 0.3, 0.045, 0.06, 0, 'csf'),                       // third ventricle
    E(0.34, -0.42, 0.13, 0.1, 25, 'lesion'),
    E(0.36, 0.48, 0.05, 0.05, 0, 'gm'),                        // small deep gray nucleus
  ];
  const inside = (e, x, y) => {
    const dx = x - e.x, dy = y - e.y, c = Math.cos(e.t), s = Math.sin(e.t);
    const u = dx * c + dy * s, v = -dx * s + dy * c;
    return (u * u) / (e.a * e.a) + (v * v) / (e.b * e.b) <= 1;
  };
  MI.FOV = 1.12;                            // image half-width in phantom units, leaving a dark margin
  MI.tissueAt = (x, y) => {
    for (let i = MI.head.length - 1; i >= 0; i--) {
      const e = MI.head[i];
      if (inside(e, x, y) && (!e.clip || inside(e.clip, x, y))) return e.tissue;
    }
    return 'air';
  };
  // Render an N×N map of value(tissue), averaging ss×ss subsamples per pixel.
  const labelCache = {};
  MI.labels = (N, ss = 2) => {
    const key = N + ':' + ss;
    if (labelCache[key]) return labelCache[key];
    const idx = new Uint8Array(N * N * ss * ss);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      for (let b = 0; b < ss; b++) for (let a = 0; a < ss; a++) {
        const x = (((i + (a + 0.5) / ss) / N) * 2 - 1) * MI.FOV, y = (((j + (b + 0.5) / ss) / N) * 2 - 1) * MI.FOV;
        idx[(j * N + i) * ss * ss + b * ss + a] = MI.tissueKeys.indexOf(MI.tissueAt(x, y));
      }
    }
    return (labelCache[key] = { idx, N, ss });
  };
  MI.render = (N, valueOf, ss = 2) => {
    const L = MI.labels(N, ss), k = ss * ss, vals = MI.tissueKeys.map((t) => valueOf(MI.tissues[t], t));
    const out = new Float32Array(N * N);
    for (let p = 0; p < N * N; p++) {
      let s = 0;
      for (let q = 0; q < k; q++) s += vals[L.idx[p * k + q]];
      out[p] = s / k;
    }
    return out;
  };

  /* ---- CT ---- */
  MI.MU_WATER = 0.19;                       // cm^-1, water near 70 keV
  MI.huToMu = (hu) => MI.MU_WATER * (1 + hu / 1000);
  MI.muToHu = (mu) => 1000 * (mu / MI.MU_WATER - 1);
  // CT image in HU with seeded noise.
  MI.ctImage = (N, noise = 4, seed = 7) => {
    const img = MI.render(N, (t) => t.hu, 3), r = Lab.rng(seed);
    for (let p = 0; p < img.length; p++) if (img[p] > -900) img[p] += noise * Lab.gauss(r);
    return img;
  };
  MI.window = (W, L) => (hu) => Math.min(1, Math.max(0, (hu - (L - W / 2)) / W));

  /* ---- MR signal equations ----
     Spin echo: S = PD (1 - e^{-TR/T1}) e^{-TE/T2}
     Inversion recovery (magnitude): S = PD |1 - 2 e^{-TI/T1} + e^{-TR/T1}| e^{-TE/T2} */
  MI.mrSignal = (t, seq) => {
    const { tr, te, ti } = seq;
    const rec = seq.ir ? Math.abs(1 - 2 * Math.exp(-ti / t.t1) + Math.exp(-tr / t.t1)) : 1 - Math.exp(-tr / t.t1);
    return t.pd * rec * Math.exp(-te / t.t2);
  };
  MI.mrImage = (N, seq, noise = 0.012, seed = 11) => {
    const img = MI.render(N, (t) => MI.mrSignal(t, seq), 2), r = Lab.rng(seed);
    let max = 0;
    ['csf', 'gm', 'wm', 'fat', 'lesion', 'blood'].forEach((k) => { max = Math.max(max, MI.mrSignal(MI.tissues[k], seq)); });
    for (let p = 0; p < img.length; p++) {
      const re = img[p] / max + noise * Lab.gauss(r), im = noise * Lab.gauss(r);
      img[p] = Math.hypot(re, im) / 1.02;               // magnitude image: Rician noise floor
    }
    return img;
  };

  /* ---- Drawing grayscale arrays ---- */
  // Draws a w×h array to a canvas region through map(v) -> [0,1]. Medical images stay on black film.
  MI.gray = (ctx, arr, w, h, map, dx, dy, dw, dh, tint) => {
    if (!(dw >= 1 && dh >= 1)) return;                     // hidden or not laid out yet
    const off = document.createElement('canvas'); off.width = w; off.height = h;
    const o = off.getContext('2d'), id = o.createImageData(w, h);
    const [tr, tg, tb] = tint || [255, 255, 255];
    for (let p = 0; p < w * h; p++) {
      const g = map(arr[p]);
      id.data[p * 4] = g * tr; id.data[p * 4 + 1] = g * tg; id.data[p * 4 + 2] = g * tb; id.data[p * 4 + 3] = 255;
    }
    o.putImageData(id, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(off, dx, dy, dw, dh);
  };
  MI.film = () => ({ bg: Lab.css('--film'), ink: Lab.css('--film-ink'), ink2: Lab.css('--film-ink-2') });

  /* ---- FFT (radix-2, in place) ---- */
  MI.fft1 = (re, im, inv) => {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = (2 * Math.PI / len) * (inv ? 1 : -1), wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const a = i + k, b = a + len / 2;
          const xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
          re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
          const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
        }
      }
    }
    if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  };
  MI.fft2 = (re, im, N, inv) => {
    const r = new Float64Array(N), i_ = new Float64Array(N);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) { r[x] = re[y * N + x]; i_[x] = im[y * N + x]; }
      MI.fft1(r, i_, inv);
      for (let x = 0; x < N; x++) { re[y * N + x] = r[x]; im[y * N + x] = i_[x]; }
    }
    for (let x = 0; x < N; x++) {
      for (let y = 0; y < N; y++) { r[y] = re[y * N + x]; i_[y] = im[y * N + x]; }
      MI.fft1(r, i_, inv);
      for (let y = 0; y < N; y++) { re[y * N + x] = r[y]; im[y * N + x] = i_[y]; }
    }
  };

  /* ---- Ultrasound ----
     Acoustic properties: Z in MRayl, c in m/s, alpha in dB/cm/MHz. Approximate values after
     Bushberg et al., The Essential Physics of Medical Imaging; measured values vary. */
  MI.acoustic = {
    water:  { name: 'Water / gel', z: 1.48, c: 1480, a: 0.0022, scat: 0 },
    air:    { name: 'Air',         z: 0.0004, c: 330, a: 12,   scat: 0 },
    fat:    { name: 'Fat',         z: 1.34, c: 1450, a: 0.6,  scat: 0.45 },
    muscle: { name: 'Muscle',      z: 1.71, c: 1600, a: 1.0,  scat: 0.6 },
    liver:  { name: 'Liver',       z: 1.65, c: 1555, a: 0.5,  scat: 1.0 },
    kidney: { name: 'Kidney',      z: 1.63, c: 1565, a: 0.5,  scat: 0.7 },
    blood:  { name: 'Blood',       z: 1.65, c: 1560, a: 0.18, scat: 0.03 },
    bone:   { name: 'Bone',        z: 7.8,  c: 4080, a: 15,   scat: 1.2 },
    skin:   { name: 'Skin',        z: 1.62, c: 1540, a: 0.8,  scat: 1.5 },
    fascia: { name: 'Fascia',      z: 1.75, c: 1600, a: 1.0,  scat: 2.6 },
    fluid:  { name: 'Cyst fluid',  z: 1.50, c: 1500, a: 0.02, scat: 0.01 },
    calc:   { name: 'Calcification', z: 6.0, c: 3500, a: 15,  scat: 3 },
    hyper:  { name: 'Echogenic lesion', z: 1.66, c: 1560, a: 0.6, scat: 2.3 },
  };

  /* Abdominal scene for the B-mode simulator. d = depth along the beam (cm) from the skin;
     x, z = lateral and axial position (cm). Layers follow the probe face; structures do not. */
  const circ = (x, z, cx, cz, rx, rz) => ((x - cx) / rx) ** 2 + ((z - cz) / (rz || rx)) ** 2 <= 1;
  MI.abdomenAt = (x, z, d) => {
    if (d < 0.25) return 'skin';
    if (d < 1.4) return (Math.abs(d - 0.8 - 0.08 * Math.sin(x * 3)) < 0.03) ? 'fascia' : 'fat';
    if (d < 2.4) return 'muscle';
    if (d < 2.55) return 'fascia';
    const dia = 13.2 + 0.05 * x * x;
    if (z > dia + 0.25) return 'air';
    if (z > dia) return 'fascia';
    if (circ(x, z, -2.6, 7.2, 0.75, 0.7)) return 'blood';
    if (circ(x, z, 2.4, 9.2, 1.35, 1.2)) return 'fluid';
    if (circ(x, z, -0.6, 11.2, 0.45, 0.35)) return 'calc';
    if (circ(x, z, 2.8, 5.0, 0.85, 0.75)) return 'hyper';
    return 'liver';
  };

  /* Simulates a curvilinear-probe B-mode image.
     opts: f (MHz), gain (dB), tgc (0..1 fraction of average attenuation compensated),
     dr (display dynamic range, dB), depth (cm). Returns polar envelope data in display units [0,1]. */
  MI.bmode = (opts) => {
    const f = opts.f, depth = opts.depth || 16, L = 160, S = 420, R0 = 4, half = 34 * Math.PI / 180;
    const dz = depth / S, rnd = Lab.rng(21);
    // Fixed scatterer field so the anatomy is the same at every frequency.
    if (!MI._scat || MI._scat.n !== L * S) {
      const re = new Float32Array(L * S), im = new Float32Array(L * S);
      for (let i = 0; i < L * S; i++) { re[i] = Lab.gauss(rnd); im[i] = Lab.gauss(rnd); }
      MI._scat = { re, im, n: L * S };
    }
    const sc = MI._scat, lam = 0.154 / f;                       // wavelength in cm
    const re = new Float32Array(L * S), im = new Float32Array(L * S);
    const tissueLine = [];
    for (let l = 0; l < L; l++) {
      const th = -half + (2 * half * l) / (L - 1), sn = Math.sin(th), cs = Math.cos(th);
      let attDb = 0, trans = 1, prev = null;
      for (let s = 0; s < S; s++) {
        const d = (s + 0.5) * dz, x = (R0 + d) * sn, z = (R0 + d) * cs - R0;
        const key = MI.abdomenAt(x, z, d), t = MI.acoustic[key];
        let spec = 0;
        if (prev && prev !== t) {
          const r = (t.z - prev.z) / (t.z + prev.z);
          spec = Math.abs(r) * 28;                          // specular echoes dwarf diffuse scatter
          trans *= 1 - r * r;
        }
        const amp = Math.pow(10, -attDb / 20) * trans, i = l * S + s;
        re[i] = amp * (t.scat * sc.re[i] + spec);
        im[i] = amp * (t.scat * sc.im[i]);
        attDb += 2 * t.a * f * dz;                             // round trip
        prev = t;
      }
      tissueLine.push(prev);
    }
    // Axial PSF: pulse of about two cycles; envelope FWHM ~ one wavelength.
    const sigA = Math.max(0.6, (lam * 1.0) / 2.355 / dz);
    const ka = []; for (let k = -Math.ceil(3 * sigA); k <= Math.ceil(3 * sigA); k++) ka.push([k, Math.exp(-(k * k) / (2 * sigA * sigA))]);
    const na = Math.sqrt(ka.reduce((q, [, w]) => q + w * w, 0));
    const r2 = new Float32Array(L * S), i2 = new Float32Array(L * S);
    for (let l = 0; l < L; l++) for (let s = 0; s < S; s++) {
      let a = 0, b = 0;
      for (const [k, w] of ka) { const q = s + k; if (q < 0 || q >= S) continue; a += w * re[l * S + q]; b += w * im[l * S + q]; }
      r2[l * S + s] = a / na; i2[l * S + s] = b / na;
    }
    // Lateral PSF: about lambda * F-number, widening away from the focus at 6 cm.
    const dth = (2 * half) / (L - 1), out = new Float32Array(L * S), nr = Lab.rng(5);
    const tgcSlope = 2 * 0.55 * f * (opts.tgc ?? 1);            // dB per cm compensated
    for (let s = 0; s < S; s++) {
      const d = (s + 0.5) * dz, fwhm = lam * (2.2 + 3 * Math.abs(d - 6) / 6) + 0.02;
      const sig = Math.max(0.5, fwhm / 2.355 / ((R0 + d) * dth)), kw = Math.ceil(3 * sig);
      const gain = Math.pow(10, (opts.gain - 30 + Math.min(55, tgcSlope * d)) / 20);   // TGC amplifiers top out
      for (let l = 0; l < L; l++) {
        let a = 0, b = 0, ws = 0;
        for (let k = -kw; k <= kw; k++) {
          const q = l + k; if (q < 0 || q >= L) continue;
          const w = Math.exp(-(k * k) / (2 * sig * sig)); ws += w * w;
          a += w * r2[q * S + s]; b += w * i2[q * S + s];
        }
        // Receiver noise is added before the TGC amplifier, so TGC amplifies it too.
        a = a / Math.sqrt(ws) + 0.0009 * Lab.gauss(nr); b = b / Math.sqrt(ws) + 0.0009 * Lab.gauss(nr);
        const db = 20 * Math.log10(Math.hypot(a, b) * gain + 1e-9);
        out[l * S + s] = Math.min(1, Math.max(0, (db + opts.dr) / opts.dr));
      }
    }
    return { out, L, S, R0, half, depth };
  };
  // Scan-convert polar B-mode data onto a canvas region (sector on black).
  MI.drawSector = (ctx, B, x0, y0, w, h) => {
    const px = Math.round(w), py = Math.round(h);
    if (!(px >= 1 && py >= 1)) return { scale: 1, cx: 0, cy: 0 };
    const off = document.createElement('canvas'); off.width = px; off.height = py;
    const o = off.getContext('2d'), id = o.createImageData(px, py);
    const span = B.R0 + B.depth, scale = Math.min(py / (B.depth + B.R0 * (1 - Math.cos(B.half)) + 0.4), px / (2 * span * Math.sin(B.half) + 0.4));
    const cx = px / 2, cy = -B.R0 * Math.cos(B.half) * scale + 0.2 * scale;
    const fc = Lab.rgb('--film');
    for (let j = 0; j < py; j++) for (let i = 0; i < px; i++) {
      const X = (i - cx) / scale, Y = (j - cy) / scale;
      const r = Math.hypot(X, Y), th = Math.atan2(X, Y), d = r - B.R0;
      let g = -1;
      if (d >= 0 && d < B.depth && Math.abs(th) <= B.half) {
        const lf = ((th + B.half) / (2 * B.half)) * (B.L - 1), sf = d / (B.depth / B.S) - 0.5;
        const l0 = Math.floor(lf), s0 = Math.max(0, Math.floor(sf)), a = lf - l0, b = Math.max(0, sf - s0);
        const l1 = Math.min(B.L - 1, l0 + 1), s1 = Math.min(B.S - 1, s0 + 1), o2 = B.out, S = B.S;
        g = (1 - a) * ((1 - b) * o2[l0 * S + s0] + b * o2[l0 * S + s1]) + a * ((1 - b) * o2[l1 * S + s0] + b * o2[l1 * S + s1]);
      }
      const k = (j * px + i) * 4;
      if (g < 0) { id.data[k] = fc[0]; id.data[k + 1] = fc[1]; id.data[k + 2] = fc[2]; }
      else { const v = g * 255; id.data[k] = v; id.data[k + 1] = v; id.data[k + 2] = v; }
      id.data[k + 3] = 255;
    }
    o.putImageData(id, 0, 0);
    ctx.drawImage(off, x0, y0, w, h);
    return { scale, cx: x0 + cx * (w / px), cy: y0 + cy * (h / py) };
  };

  /* Overlay text in the corners of an image panel, the way a viewer annotates a study. */
  MI.overlay = (ctx, x, y, w, h, corners) => {
    const F = MI.film(), fs = Math.max(9, Math.min(11, w / 26));
    ctx.font = `500 ${fs}px ${Lab.css('--f-mono')}`;
    const pad = 6, lh = fs * 1.3;
    const put = (lines, ax, ay, align) => {
      ctx.textAlign = align;
      (lines || []).forEach((t, i) => {
        ctx.fillStyle = i === 0 ? F.ink : F.ink2;
        const yy = ay === 'top' ? y + pad + fs + i * lh : y + h - pad - (lines.length - 1 - i) * lh;
        ctx.fillText(t, ax === 'left' ? x + pad : x + w - pad, yy);
      });
    };
    put(corners.tl, 'left', 'top', 'left'); put(corners.tr, 'right', 'top', 'right');
    put(corners.bl, 'left', 'bottom', 'left'); put(corners.br, 'right', 'bottom', 'right');
    ctx.textAlign = 'left';
  };

  window.MI = MI;
})();
