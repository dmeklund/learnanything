/* Volume III, Part I figures: ultrasound. */
(function () {
  const C0 = 1540;                         // m/s, the speed every scanner assumes

  /* ---------- Fig 3.1 One line of echoes (A-mode) ---------- */
  (function () {
    const root = Lab.$('#fig-amode');
    if (!root) return;
    const cv = Lab.$('canvas', root), tbody = Lab.$('tbody', root), out = Lab.$('.readouts', root);
    const PRESETS = {
      abdomen: [['water', 0.5], ['fat', 1.5], ['muscle', 1.2], ['liver', 5], ['kidney', 3.8]],
      airgap: [['air', 0.05], ['fat', 1.5], ['muscle', 1.2], ['liver', 5], ['kidney', 3.8]],
      bone: [['water', 0.5], ['fat', 1.0], ['muscle', 2.5], ['bone', 1.0], ['muscle', 4]],
    };
    let preset = 'abdomen', f = 3.5, tgc = false, ready = false;
    const NOISE = -100;                    // receiver noise floor, dB re transmitted pulse
    const SCAT = -52;                      // diffuse backscatter from liver-like tissue, dB

    function model() {
      const layers = PRESETS[preset].map(([k, d]) => ({ k, d, t: MI.acoustic[k] }));
      let depth = 0, time = 0, trans = 1, att = 0;
      const echoes = [], regions = [];
      layers.forEach((L, i) => {
        if (i > 0) {
          const P = layers[i - 1].t, r = (L.t.z - P.z) / (L.t.z + P.z), R = r * r;
          echoes.push({ from: P.name, to: L.t.name, R, time, shown: (C0 / 1e4) * time / 2, depth,
            level: 20 * Math.log10(Math.abs(r) * trans + 1e-12) - att });
          trans *= 1 - R;
        }
        regions.push({ ...L, z0: depth, shown0: (C0 / 1e4) * time / 2, trans, att });
        depth += L.d; time += (2 * L.d) / (L.t.c / 1e4); att += 2 * L.t.a * f * L.d;
        regions[regions.length - 1].shown1 = (C0 / 1e4) * time / 2;
        regions[regions.length - 1].att1 = att;
      });
      return { layers, echoes, regions, depth, time };
    }

    function draw() {
      if (!ready) return;
      const { ctx, w, h } = Lab.canvas(cv, (cv.clientWidth || 600) < 560 ? 0.8 : 0.5), pal = Lab.palette(), M = model();
      ctx.clearRect(0, 0, w, h);
      const padL = 46, padR = 14, barH = 34, top = 10, plotT = top + barH + 18, plotB = h - 40;
      const xMax = Math.ceil(M.depth);
      const x = Lab.scale(0, xMax, padL, w - padR), y = Lab.scale(0, -120, plotT, plotB);
      const tg = (d) => (tgc ? 2 * 0.55 * f * d : 0);
      // Layer bar
      ctx.font = `11px ${Lab.css('--f-mono')}`;
      M.regions.forEach((R, i) => {
        const x0 = x(R.z0), x1 = x(R.z0 + R.d);
        const g = { water: 0.08, air: 0.0, fat: 0.35, muscle: 0.5, liver: 0.62, kidney: 0.55, bone: 0.95 }[R.k] ?? 0.5;
        const bg = Lab.mix(Lab.rgb('--paper-3'), Lab.rgb('--ink-3'), g);
        ctx.fillStyle = Lab.rgbStr(bg);
        ctx.fillRect(x0, top, Math.max(1, x1 - x0), barH);
        const lum = (0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2]) / 255;
        ctx.fillStyle = lum > 0.45 ? Lab.css('--film') : '#FFFFFF';
        const name = R.t.name.split(' ')[0];
        if (ctx.measureText(name).width < x1 - x0 - 6) ctx.fillText(name, x0 + 4, top + barH / 2 + 4);
        if (i) { ctx.fillStyle = pal.ink; ctx.fillRect(x0 - 0.5, top, 1, barH); }
      });
      ctx.strokeStyle = pal.rule; ctx.strokeRect(padL + 0.5, top + 0.5, x(xMax) - padL - 1, barH - 1);
      // Grid and axes
      ctx.strokeStyle = pal.grid; ctx.lineWidth = 1; ctx.fillStyle = pal.ink3; ctx.textAlign = 'right';
      for (let db = 0; db >= -120; db -= 20) {
        ctx.beginPath(); ctx.moveTo(padL, y(db)); ctx.lineTo(w - padR, y(db)); ctx.stroke();
        ctx.fillText(db, padL - 6, y(db) + 4);
      }
      ctx.textAlign = 'center';
      for (let d = 0; d <= xMax; d += xMax > 10 ? 2 : 1) ctx.fillText(d, x(d), plotB + 16);
      ctx.textAlign = 'left';
      ctx.fillText('displayed depth (cm), assuming c = 1540 m/s', padL, h - 4);
      // Noise floor
      ctx.strokeStyle = pal.ink3; ctx.setLineDash([4, 4]); ctx.beginPath();
      for (let px = padL; px <= w - padR; px += 4) { const d = (px - padL) / (w - padR - padL) * xMax; const v = Math.min(0, NOISE + tg(d)); px === padL ? ctx.moveTo(px, y(v)) : ctx.lineTo(px, y(v)); }
      ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = pal.ink2; ctx.fillText('noise floor', w - padR - 80, y(Math.min(-2, NOISE + tg(xMax))) + 14 > plotB ? y(Math.min(-2, NOISE + tg(xMax))) - 6 : y(Math.min(-2, NOISE + tg(xMax))) + 14);
      // Diffuse backscatter from inside each tissue
      const r = Lab.rng(3);
      ctx.fillStyle = Lab.rgbStr(Lab.rgb('--s1'), 0.28);
      M.regions.forEach((R) => {
        if (!R.t.scat) return;
        ctx.beginPath(); ctx.moveTo(x(R.shown0), y(-120));
        const n = Math.max(2, Math.round((x(R.shown1) - x(R.shown0)) / 3));
        for (let i = 0; i <= n; i++) {
          const u = i / n, d = R.shown0 + u * (R.shown1 - R.shown0);
          const lvl = SCAT + 20 * Math.log10(R.t.scat) + 20 * Math.log10(R.trans) - (R.att + u * (R.att1 - R.att)) + 5 * Lab.gauss(r) + tg(d);
          ctx.lineTo(x(d), y(Math.max(-120, Math.min(0, Math.max(lvl, NOISE + tg(d))))));
        }
        ctx.lineTo(x(R.shown1), y(-120)); ctx.closePath(); ctx.fill();
      });
      // Specular echoes at interfaces
      const lam = 0.154 / f;
      M.echoes.forEach((E) => {
        const lvl = Math.min(0, E.level + tg(E.shown)), xx = x(E.shown), wpx = Math.max(2, (x(lam) - x(0)) * 1.2);
        ctx.fillStyle = pal.s2; ctx.beginPath(); ctx.moveTo(xx - wpx, y(-120)); ctx.lineTo(xx, y(lvl)); ctx.lineTo(xx + wpx, y(-120)); ctx.fill();
        if (lvl > NOISE + tg(E.shown)) { ctx.beginPath(); ctx.arc(xx, y(lvl), 3, 0, 7); ctx.fill(); }
      });
      // Table
      tbody.innerHTML = M.echoes.map((E) => {
        const vis = E.level + tg(E.shown) > NOISE + tg(E.shown);
        return `<tr${vis ? '' : ' class="lost"'}><td>${E.from} → ${E.to}</td><td>${E.R < 0.001 ? (E.R * 100).toFixed(4) : (E.R * 100).toFixed(2)}%</td><td>${E.time.toFixed(1)}</td><td>${E.shown.toFixed(2)} <span class="sub">(true ${E.depth.toFixed(2)})</span></td><td>${E.level.toFixed(0)}</td></tr>`;
      }).join('');
      const lost = M.echoes.filter((E) => E.level <= NOISE).length;
      out.innerHTML = `<span>wavelength <b>${(lam * 10).toFixed(2)} mm</b></span><span>round trip to the last layer <b>${M.time.toFixed(0)} µs</b></span><span>pulses per second possible <b>${Lab.fmt.si(1e6 / M.time)}</b></span><span>echoes below the noise floor <b>${lost}</b></span>`;
    }

    Lab.$$('[data-preset]', root).forEach((b) => b.addEventListener('click', () => {
      preset = b.dataset.preset;
      Lab.$$('[data-preset]', root).forEach((o) => o.setAttribute('aria-pressed', o === b ? 'true' : 'false'));
      draw();
    }));
    Lab.$('#am-tgc', root).addEventListener('change', (e) => { tgc = e.target.checked; draw(); });
    Lab.slider(Lab.$('#am-f', root), (v) => v.toFixed(1) + ' MHz', (v) => { f = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(cv, draw);
  })();

  /* ---------- Fig 4.1 Steering and focusing with an array ---------- */
  (function () {
    const root = Lab.$('#fig-beam');
    if (!root) return;
    const cv = Lab.$('canvas', root), out = Lab.$('.readouts', root);
    const F = 1.5, LAM = 0.154 / F, CCM = 0.154;            // MHz; cm; cm per µs
    const W = 6, D = 7, NE = 32;                            // field width and depth in cm
    let focus = 4, steer = 0, focusOn = true, wide = false, mode = 'pulse', t = 0, raf = 0, running = false, ready = false;
    let cache = null;

    function elements() {
      const pitch = wide ? 2 * LAM : LAM / 2, n = wide ? 12 : NE;
      const xs = []; for (let i = 0; i < n; i++) xs.push((i - (n - 1) / 2) * pitch);
      const th = steer * Math.PI / 180, fx = focus * Math.sin(th), fz = focus * Math.cos(th);
      let delays;
      if (focusOn) {
        const r = xs.map((x) => Math.hypot(x - fx, fz)), rmax = Math.max(...r);
        delays = r.map((ri) => (rmax - ri) / CCM);
      } else {
        // Steer only: a linear delay ramp tilts a plane wave.
        const d = xs.map((x) => (x * Math.sin(th)) / CCM), m = Math.min(...d);
        delays = d.map((v) => v - m);
      }
      return { xs, delays, fx, fz, pitch, aperture: xs[xs.length - 1] - xs[0] + pitch };
    }

    let geom = null;
    // Per-pixel, per-element travel times and spreading factors, reused every frame.
    function geometry(E, gw, gh) {
      const key = [gw, gh, wide].join();
      if (geom && geom.key === key) return geom;
      const n = E.xs.length, tr = new Float32Array(gw * gh * n), amp = new Float32Array(gw * gh * n);
      for (let j = 0; j < gh; j++) {
        const z = ((j + 0.5) / gh) * D;
        for (let i = 0; i < gw; i++) {
          const x = ((i + 0.5) / gw - 0.5) * W, b = (j * gw + i) * n;
          for (let e = 0; e < n; e++) { const r = Math.hypot(x - E.xs[e], z) + 1e-3; tr[b + e] = r / CCM; amp[b + e] = 1 / Math.sqrt(r); }
        }
      }
      return (geom = { key, tr, amp, n });
    }
    const SIG = 0.9 / F, STEP = 0.004, HALF = 3 * SIG, PULSE = new Float32Array(Math.ceil((2 * HALF) / STEP) + 2);
    for (let k = 0; k < PULSE.length; k++) { const tau = -HALF + k * STEP; PULSE[k] = Math.cos(2 * Math.PI * F * tau) * Math.exp(-(tau * tau) / (SIG * SIG)); }

    function field(E, gw, gh) {
      const vals = new Float32Array(gw * gh), G = geometry(E, gw, gh), n = G.n;
      if (mode === 'beam') {
        const w = 2 * Math.PI * F;                             // phase per microsecond
        for (let p = 0; p < gw * gh; p++) {
          let re = 0, im = 0;
          for (let e = 0; e < n; e++) { const ph = w * (G.tr[p * n + e] + E.delays[e]); re += G.amp[p * n + e] * Math.cos(ph); im -= G.amp[p * n + e] * Math.sin(ph); }
          vals[p] = re * re + im * im;
        }
      } else {
        for (let p = 0; p < gw * gh; p++) {
          let s = 0;
          for (let e = 0; e < n; e++) {
            const tau = t - E.delays[e] - G.tr[p * n + e];
            if (tau <= -HALF || tau >= HALF) continue;
            s += PULSE[((tau + HALF) / STEP) | 0] * G.amp[p * n + e];
          }
          vals[p] = s;
        }
      }
      return vals;
    }

    function draw() {
      if (!ready) return;
      const { ctx, w, h } = Lab.canvas(cv, 0.62), pal = Lab.palette(), E = elements();
      if (w < 120) return;
      const top = 40, fh = h - top - 6, fw = Math.min(w - 104, fh * (W / D));
      const fx0 = (w - fw) / 2, gw = Math.round(Math.min(170, fw / 2)), gh = Math.round(gw * (fh / fw));
      ctx.fillStyle = pal.paper3; ctx.fillRect(0, 0, w, h);
      const key = mode === 'beam' ? [focus, steer, focusOn, wide, gw, gh].join() : null;
      let vals;
      if (key && cache && cache.key === key) vals = cache.vals; else { vals = field(E, gw, gh); if (key) cache = { key, vals }; }
      const off = document.createElement('canvas'); off.width = gw; off.height = gh;
      const o = off.getContext('2d'), id = o.createImageData(gw, gh);
      const neg = Lab.rgb('--s1'), pos = Lab.rgb('--s2'), mid = Lab.rgb('--paper-3'), hot = Lab.rgb('--accent');
      let max = 0; for (let p = 0; p < vals.length; p++) max = Math.max(max, Math.abs(vals[p]));
      const scale = max || 1;
      for (let p = 0; p < vals.length; p++) {
        let c;
        if (mode === 'beam') {
          const db = 10 * Math.log10(vals[p] / max + 1e-9), u = Math.max(0, 1 + db / 30);
          c = Lab.mix(mid, hot, u);
        } else {
          // Compress the range so single wavelets stay visible next to the focus.
          const v = vals[p] / scale;
          c = Lab.mix(mid, v > 0 ? pos : neg, Math.min(1, Math.pow(Math.abs(v), 0.45) * 1.15));
        }
        id.data[p * 4] = c[0]; id.data[p * 4 + 1] = c[1]; id.data[p * 4 + 2] = c[2]; id.data[p * 4 + 3] = 255;
      }
      o.putImageData(id, 0, 0);
      ctx.imageSmoothingEnabled = true; ctx.drawImage(off, fx0, top, fw, fh);
      const X = (x) => fx0 + (x / W + 0.5) * fw, Z = (z) => top + (z / D) * fh;
      // Depth ticks
      ctx.fillStyle = pal.ink3; ctx.font = `10.5px ${Lab.css('--f-mono')}`; ctx.textAlign = 'right';
      for (let z = 2; z < D; z += 2) { ctx.fillText(z + ' cm', fx0 - 6, Z(z) + 4); ctx.fillRect(fx0 - 4, Z(z), 4, 1); }
      ctx.strokeStyle = pal.rule; ctx.strokeRect(fx0 + 0.5, top + 0.5, fw - 1, fh - 1);
      // Elements with their delay bars
      const maxDelay = Math.max(...E.delays, 0.001), ew = Math.max(1.5, (E.pitch / W) * fw * 0.8);
      E.xs.forEach((x, n) => {
        const bh = (E.delays[n] / maxDelay) * 22;
        ctx.fillStyle = pal.s3; ctx.fillRect(X(x) - ew / 2, top - 6 - bh, ew, bh);
        ctx.fillStyle = pal.ink; ctx.fillRect(X(x) - ew / 2, top - 5, ew, 5);
      });
      ctx.textAlign = 'right'; ctx.fillStyle = pal.ink3;
      ctx.fillText('firing delay', X(E.xs[0]) - ew - 6, top - 10);
      ctx.textAlign = 'left';
      // Focus marker
      if (focusOn) {
        ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.5; const fxp = X(E.fx), fzp = Z(E.fz);
        ctx.beginPath(); ctx.moveTo(fxp - 6, fzp); ctx.lineTo(fxp + 6, fzp); ctx.moveTo(fxp, fzp - 6); ctx.lineTo(fxp, fzp + 6); ctx.stroke(); ctx.lineWidth = 1;
      }
      const fnum = focus / E.aperture;
      out.innerHTML = `<span>elements <b>${E.xs.length}</b></span><span>pitch <b>${(E.pitch * 10).toFixed(2)} mm</b> (${wide ? '2' : '½'}λ)</span><span>aperture <b>${(E.aperture * 10).toFixed(1)} mm</b></span><span>f-number <b>${fnum.toFixed(1)}</b></span><span>focal spot ≈ λ·F# <b>${(LAM * fnum * 10).toFixed(1)} mm</b></span>`;
    }

    const tEnd = () => Math.max(...elements().delays) + (D * 1.4) / CCM;
    const tFocus = () => { const E = elements(); return Math.max(...E.xs.map((x) => Math.hypot(x - E.fx, E.fz))) / CCM; };
    function loop() {
      if (!running) return;
      t += 0.12; if (t > tEnd()) t = 0;
      draw(); raf = requestAnimationFrame(loop);
    }
    function start() { if (running || mode !== 'pulse' || Lab.reducedMotion) return; running = true; raf = requestAnimationFrame(loop); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    Lab.$$('[data-bmode]', root).forEach((b) => b.addEventListener('click', () => {
      mode = b.dataset.bmode;
      Lab.$$('[data-bmode]', root).forEach((o) => o.setAttribute('aria-pressed', o === b ? 'true' : 'false'));
      if (mode === 'beam') { stop(); draw(); } else { draw(); start(); }
    }));
    Lab.$('#bf-focus', root).addEventListener('change', (e) => { focusOn = e.target.checked; Lab.$('#bf-depth', root).disabled = !focusOn; draw(); });
    Lab.$('#bf-wide', root).addEventListener('change', (e) => { wide = e.target.checked; draw(); });
    Lab.slider(Lab.$('#bf-depth', root), (v) => v.toFixed(1) + ' cm', (v) => { focus = v; if (!running) t = tFocus(); draw(); });
    Lab.slider(Lab.$('#bf-steer', root), (v) => v.toFixed(0) + '°', (v) => { steer = v; if (!running) t = tFocus(); draw(); });
    ready = true;
    t = tFocus();                          // the first frame shows the pulse arriving at the focus
    draw();
    Lab.whenVisible(cv, start, stop);
    Lab.onTheme(draw); Lab.onResize(cv, draw);
  })();

  /* ---------- Fig 5.1 Doppler shift and aliasing ---------- */
  (function () {
    const root = Lab.$('#fig-doppler');
    if (!root) return;
    const cv = Lab.$('canvas', root), out = Lab.$('.readouts', root);
    let f0 = 5, vp = 100, ang = 60, prf = 8, ready = false;
    const period = 0.85;
    // Normalized arterial waveform: sharp systolic peak, brief reversal, low diastolic flow.
    const wave = (t) => {
      const u = (t % period) / period;
      return Math.exp(-(((u - 0.12) / 0.055) ** 2)) - 0.18 * Math.exp(-(((u - 0.3) / 0.04) ** 2)) + 0.12 * Math.exp(-(((u - 0.45) / 0.08) ** 2)) + 0.06;
    };
    function draw() {
      if (!ready) return;
      const { ctx, w, h } = Lab.canvas(cv, (cv.clientWidth || 600) < 560 ? 1.15 : 0.46), pal = Lab.palette(), F = MI.film();
      if (w < 120) return;
      const narrow = w < 560, gw = narrow ? w : w * 0.34, sw = narrow ? w : w - gw - 16;
      const gh = narrow ? h * 0.42 : h, sx = narrow ? 0 : gw + 16, sy = narrow ? gh + 10 : 0, sh = narrow ? h - gh - 10 : h;
      ctx.clearRect(0, 0, w, h);
      // Geometry sketch
      ctx.fillStyle = pal.paper3; ctx.fillRect(0, 0, gw, gh); ctx.strokeStyle = pal.rule; ctx.strokeRect(0.5, 0.5, gw - 1, gh - 1);
      const vy = gh * 0.66, vh = Math.min(28, gh * 0.18);
      ctx.fillStyle = Lab.rgbStr(Lab.rgb('--s2'), 0.16); ctx.fillRect(0, vy - vh / 2, gw, vh);
      ctx.strokeStyle = pal.ink3; ctx.beginPath(); ctx.moveTo(0, vy - vh / 2); ctx.lineTo(gw, vy - vh / 2); ctx.moveTo(0, vy + vh / 2); ctx.lineTo(gw, vy + vh / 2); ctx.stroke();
      ctx.fillStyle = pal.ink2; ctx.font = `11px ${Lab.css('--f-mono')}`;
      ctx.fillText('flow →', 8, vy + vh / 2 + 14);
      const th = ang * Math.PI / 180, gx = gw * 0.55, L = Math.min(gw, gh) * 0.62;
      const px = gx - Math.cos(th) * L, py = vy - Math.sin(th) * L;
      ctx.strokeStyle = pal.s1; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(gx, vy); ctx.stroke(); ctx.lineWidth = 1;
      ctx.save(); ctx.translate(px, py); ctx.rotate(th); ctx.fillStyle = pal.ink; ctx.fillRect(-14, -9, 18, 18); ctx.restore();
      ctx.strokeStyle = pal.ink; ctx.strokeRect(gx - 5, vy - 5, 10, 10);
      ctx.strokeStyle = pal.ink3; ctx.beginPath(); ctx.arc(gx, vy, 26, Math.PI, Math.PI + th); ctx.stroke();
      ctx.fillStyle = pal.ink; ctx.fillText('θ = ' + ang + '°', gx - 70, vy - 30 < py + 10 ? vy - 8 : vy - 30);
      // Spectral display on black
      const pad = 34;
      ctx.fillStyle = F.bg; ctx.fillRect(sx, sy, sw, sh);
      const iw = Math.max(40, Math.round(sw - pad - 8)), ih = Math.max(40, Math.round(sh - 30));
      const off = document.createElement('canvas'); off.width = iw; off.height = ih;
      const o = off.getContext('2d'), id = o.createImageData(iw, ih);
      const fd = (v) => (2 * f0 * 1e6 * (v / 100) * Math.cos(th)) / C0 / 1000;    // kHz
      const nyq = prf / 2, rr = Lab.rng(9), T = 2.4;
      for (let i = 0; i < iw; i++) {
        const tt = (i / iw) * T, v = vp * wave(tt), fc = fd(v), spread = Math.abs(fc) * 0.12 + 0.08;
        const col = new Float32Array(ih);
        for (let k = 0; k < 40; k++) {
          // Velocities in the sample volume fill a band just below the peak.
          let fk = fc * (0.78 + 0.22 * rr()) + spread * Lab.gauss(rr) * 0.5;
          fk = ((((fk + nyq) % prf) + prf) % prf) - nyq;            // aliasing: wrap into ±PRF/2
          const row = Math.round((0.5 - fk / prf) * (ih - 1));
          if (row >= 0 && row < ih) col[row] += 1;
        }
        for (let j = 0; j < ih; j++) {
          const g = Math.min(1, (col[j] + (j > 0 ? col[j - 1] * 0.5 : 0) + (j < ih - 1 ? col[j + 1] * 0.5 : 0)) / 5) * 0.95 + 0.03 * rr();
          const p = (j * iw + i) * 4; id.data[p] = id.data[p + 1] = id.data[p + 2] = g * 255; id.data[p + 3] = 255;
        }
      }
      o.putImageData(id, 0, 0);
      const ix = sx + pad, iy = sy + 10;
      ctx.drawImage(off, ix, iy, iw, ih);
      ctx.strokeStyle = F.ink2; ctx.beginPath(); ctx.moveTo(ix, iy + ih / 2); ctx.lineTo(ix + iw, iy + ih / 2); ctx.stroke();
      ctx.fillStyle = F.ink2; ctx.textAlign = 'right'; ctx.font = `10.5px ${Lab.css('--f-mono')}`;
      [nyq, 0, -nyq].forEach((v, i) => ctx.fillText((v > 0 ? '+' : '') + v.toFixed(1), ix - 4, iy + (i * ih) / 2 + (i === 0 ? 8 : i === 2 ? -2 : 4)));
      ctx.textAlign = 'left';
      ctx.fillStyle = F.ink2; ctx.fillText('time (2.4 s) →   vertical: Doppler shift (kHz)', ix, sy + sh - 6);
      // Readouts
      const fpk = fd(vp), vmax = (C0 * prf * 1000) / (4 * f0 * 1e6 * Math.cos(th)) * 100;
      const err = (Math.cos(th) / Math.cos(Math.min(89.9, ang + 5) * Math.PI / 180) - 1) * 100;
      const alias = Math.abs(fpk * 1.0) > nyq;
      out.innerHTML = `<span>peak shift <b>${fpk.toFixed(2)} kHz</b></span><span>Nyquist limit <b>±${nyq.toFixed(1)} kHz</b></span><span>fastest measurable <b>${vmax.toFixed(0)} cm/s</b></span><span>deepest gate at this PRF <b>${((C0 / (2 * prf * 1000)) * 100).toFixed(1)} cm</b></span><span>error if θ is off by 5° <b>${err.toFixed(0)}%</b></span><span>${alias ? '<b class="warn">aliasing</b>' : 'no aliasing'}</span>`;
    }
    Lab.slider(Lab.$('#dp-f', root), (v) => v.toFixed(1) + ' MHz', (v) => { f0 = v; draw(); });
    Lab.slider(Lab.$('#dp-v', root), (v) => v.toFixed(0) + ' cm/s', (v) => { vp = v; draw(); });
    Lab.slider(Lab.$('#dp-a', root), (v) => v.toFixed(0) + '°', (v) => { ang = v; draw(); });
    Lab.slider(Lab.$('#dp-prf', root), (v) => v.toFixed(1) + ' kHz', (v) => { prf = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(cv, draw);
  })();

  /* ---------- Fig 6.1 B-mode image formation ---------- */
  (function () {
    const root = Lab.$('#fig-bmode');
    if (!root) return;
    const cv = Lab.$('canvas', root), out = Lab.$('.readouts', root);
    const opts = { f: 3.5, gain: 0, tgc: 1, dr: 60 };
    let ready = false, B = null, pending = 0;
    function compute() { B = MI.bmode(opts); }
    function draw() {
      if (!ready) return;
      const { ctx, w, h } = Lab.canvas(cv, 0.78), F = MI.film();
      ctx.fillStyle = F.bg; ctx.fillRect(0, 0, w, h);
      const g = MI.drawSector(ctx, B, 0, 0, w - 34, h);
      // Depth scale in a strip along the right edge, clear of the image
      ctx.fillStyle = F.ink2; ctx.font = `10.5px ${Lab.css('--f-mono')}`; ctx.textAlign = 'right';
      for (let d = 2; d <= 16; d += 2) { const yy = g.cy + (B.R0 + d) * g.scale; if (yy < h - 4) { ctx.fillRect(w - 6, yy, 5, 1); ctx.fillText(d, w - 9, yy + 4); } }
      ctx.textAlign = 'left';
      MI.overlay(ctx, 0, 0, w, h, { tl: ['US · curved array', `${opts.f.toFixed(1)} MHz`], bl: [`gain ${opts.gain} dB`, `TGC ${Math.round(opts.tgc * 100)}%`, `DR ${opts.dr} dB`], tr: ['depth, cm'] });
      const lam = 0.154 / opts.f, pen = 60 / (2 * 0.55 * opts.f);
      out.innerHTML = `<span>wavelength <b>${(lam * 10).toFixed(2)} mm</b></span><span>axial resolution ≈ <b>${(lam * 10).toFixed(2)} mm</b></span><span>depth for 60 dB round-trip loss <b>${pen.toFixed(1)} cm</b></span>`;
    }
    const redo = () => { clearTimeout(pending); pending = setTimeout(() => { compute(); draw(); }, 30); };
    Lab.slider(Lab.$('#bm-f', root), (v) => v.toFixed(1) + ' MHz', (v) => { opts.f = v; if (ready) redo(); });
    Lab.slider(Lab.$('#bm-gain', root), (v) => (v > 0 ? '+' : '') + v + ' dB', (v) => { opts.gain = v; if (ready) redo(); });
    Lab.slider(Lab.$('#bm-tgc', root), (v) => Math.round(v * 100) + '%', (v) => { opts.tgc = v; if (ready) redo(); });
    Lab.slider(Lab.$('#bm-dr', root), (v) => v + ' dB', (v) => { opts.dr = v; if (ready) redo(); });
    compute(); ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(cv, draw);
  })();
})();
