/* Volume XIV, Part I figures.
   Fig 1.1  Casimir pressure between ideal mirrors, with the allowed mode comb between the plates.
   Fig 2.1  The n = 2 levels of a hydrogen-like ion from the exact Dirac formula, against the measured Lamb shift. */

/* ---------------------------------------------------------------- Fig 1.1 */
(function () {
  const root = Lab.$('#fig-casimir');
  if (!root) return;
  const cv = Lab.$('.ca-cv', root), svg = Lab.$('.ca-chart', root), wrap = svg.parentElement;
  const out = Lab.$('.readouts', root), tip = Lab.tip(wrap);
  const { hbar, c, kB } = QD.K;
  const press = (a) => (Math.PI * Math.PI * hbar * c) / (240 * Math.pow(a, 4)); // magnitude, Pa
  const ATM = 101325;
  const st = { a: 200e-9, area: 1, T: 300 };
  let ready = false;

  const nm = (a) => (a < 1e-6 ? (a * 1e9).toFixed(a < 1e-7 ? 1 : 0) + ' nm' : (a * 1e6).toPrecision(3) + ' µm');

  function drawCanvas() {
    if (!cv.clientWidth) return;
    const { ctx, w, h } = Lab.canvas(cv, cv.clientWidth < 520 ? 1.0 : 0.8), pal = Lab.palette();
    ctx.clearRect(0, 0, w, h);
    const accent = Lab.rgb('--accent'), ink3 = Lab.rgb('--ink-3'), vac = Lab.rgb('--vac');
    // --- top: the two plates and the first allowed modes
    const topH = h * 0.52, pad = 18;
    const gapPx = Math.max(40, Math.min(w * 0.34, 56 + 34 * (Math.log10(st.a) + 8))); // 10 nm -> narrow, 10 um -> wide
    const x0 = w / 2 - gapPx / 2, x1 = w / 2 + gapPx / 2, yMid = pad + topH * 0.44, amp = topH * 0.13;
    // continuum outside: many wavelengths, drawn faintly
    for (let k = 0; k < 7; k++) {
      const lam = 10 + k * 9, a2 = amp * (0.3 + 0.08 * k);
      ctx.strokeStyle = Lab.rgbStr(vac, 0.75); ctx.lineWidth = 1;
      [-1, 1].forEach((side) => {
        ctx.beginPath();
        const xa = side < 0 ? pad : x1 + 6, xb = side < 0 ? x0 - 6 : w - pad;
        for (let x = xa; x <= xb; x += 2) ctx[x === xa ? 'moveTo' : 'lineTo'](x, yMid + (k - 3) * amp * 0.52 + Math.sin((x / lam) * 6.283) * a2);
        ctx.stroke();
      });
    }
    // standing waves between the plates
    [1, 2, 3].forEach((n, i) => {
      ctx.strokeStyle = Lab.rgbStr(accent, 0.9 - i * 0.2); ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 1) {
        const u = (x - x0) / gapPx;
        ctx.lineTo(x, yMid + (i - 1) * amp * 0.9 + Math.sin(u * Math.PI * n) * amp * 0.42);
      }
      ctx.stroke();
    });
    // plates
    ctx.fillStyle = pal.ink;
    ctx.fillRect(x0 - 5, pad, 5, topH * 0.9); ctx.fillRect(x1, pad, 5, topH * 0.9);
    // arrows marking the gap
    ctx.strokeStyle = pal.ink2; ctx.lineWidth = 1;
    const ay = pad + topH * 0.9 + 12;
    ctx.beginPath(); ctx.moveTo(x0, ay); ctx.lineTo(x1, ay); ctx.stroke();
    [[x0, 1], [x1, -1]].forEach(([x, s]) => { ctx.beginPath(); ctx.moveTo(x, ay); ctx.lineTo(x + s * 5, ay - 3); ctx.lineTo(x + s * 5, ay + 3); ctx.closePath(); ctx.fillStyle = pal.ink2; ctx.fill(); });
    ctx.font = `11px ${Lab.css('--f-mono')}`; ctx.fillStyle = pal.ink2; ctx.textAlign = 'center';
    ctx.fillText('a = ' + nm(st.a), w / 2, ay + 15);
    ctx.textAlign = 'left';
    ctx.fillStyle = pal.ink3; ctx.font = `10px ${Lab.css('--f-mono')}`;
    ctx.fillText('all k allowed', pad, pad + 10);
    ctx.textAlign = 'right'; ctx.fillText('all k allowed', w - pad, pad + 10); ctx.textAlign = 'left';

    // --- bottom: the frequency comb inside vs the continuum outside
    const by = topH + 40, bh = h - by - 30;
    const f1 = c / (2 * st.a); // lowest allowed frequency, Hz
    const F0 = f1 / 4, F1 = f1 * 26;
    const Xf = Lab.logScale(F0, F1, pad + 52, w - pad - 6);
    ctx.strokeStyle = pal.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad + 52, by + bh); ctx.lineTo(w - pad - 6, by + bh); ctx.stroke();
    const e0 = Math.ceil(Math.log10(F0)), e1 = Math.floor(Math.log10(F1));
    for (let e = e0; e <= e1; e++) {
      const x = Xf(Math.pow(10, e));
      ctx.strokeStyle = pal.grid; ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x, by + bh); ctx.stroke();
      ctx.fillStyle = pal.ink3; ctx.font = `10px ${Lab.css('--f-mono')}`; ctx.textAlign = 'center';
      ctx.fillText('10' + QD.sup(e), x, by + bh + 13);
    }
    ctx.textAlign = 'left';
    // continuum band (outside the plates)
    ctx.fillStyle = Lab.rgbStr(vac, 0.9);
    ctx.fillRect(pad + 52, by + bh * 0.54, w - pad - 6 - pad - 52, bh * 0.22);
    ctx.fillStyle = pal.ink3; ctx.font = `10px ${Lab.css('--f-mono')}`;
    ctx.fillText('outside', pad, by + bh * 0.69 + 4);
    ctx.fillText('between', pad, by + bh * 0.24 + 4);
    // comb of allowed modes with k perpendicular to the plates
    ctx.strokeStyle = Lab.rgbStr(accent, 0.95); ctx.lineWidth = 1.5;
    for (let n = 1; n <= 26; n++) {
      const f = n * f1; if (f > F1) break;
      const x = Xf(f);
      ctx.beginPath(); ctx.moveTo(x, by + bh * 0.1); ctx.lineTo(x, by + bh * 0.38); ctx.stroke();
    }
    ctx.fillStyle = pal.accent; ctx.font = `10px ${Lab.css('--f-mono')}`;
    ctx.textAlign = 'center'; ctx.fillText('c/2a', Xf(f1), by + bh * 0.06); ctx.textAlign = 'left';
    ctx.fillStyle = pal.ink3;
    ctx.fillText('frequency, Hz', pad + 52, h - 4);
  }

  function drawChart() {
    const A0 = 1e-8, A1 = 1e-5;
    const f = QD.frame(svg, {
      h: 280, m: { l: 52, r: 14, t: 26, b: 42 }, x: [A0, A1], y: [1e-8, 1e6], xlog: true, ylog: true,
      xt: [1e-8, 1e-7, 1e-6, 1e-5], yt: [1e-8, 1e-6, 1e-4, 1e-2, 1, 1e2, 1e4, 1e6],
      xf: (v) => (v < 1e-6 ? v * 1e9 + ' nm' : v * 1e6 + ' µm'), yf: (v) => QD.sci(v),
      xl: 'plate separation', yl: 'Casimir pressure, Pa',
    });
    const { X, Y, g, pal } = f;
    // the ranges probed by the two classic experiments
    [[0.6e-6, 6e-6, 'Lamoreaux 1997', pal.s2], [0.1e-6, 0.9e-6, 'Mohideen & Roy 1998', pal.s1]].forEach(([a, b, lab, col], i) => {
      const yb = f.H - f.m.b - 12 - i * 26;
      Lab.svg('rect', { x: X(a), y: yb, width: X(Math.min(b, A1)) - X(a), height: 9, fill: col, opacity: 0.3 }, g);
      QD.text(g, X(a), yb - 3, lab, col, 'start', 9);
    });
    // one atmosphere
    Lab.svg('line', { x1: f.m.l, x2: f.W - f.m.r, y1: Y(ATM), y2: Y(ATM), stroke: pal.ink3, 'stroke-dasharray': '3 3' }, g);
    QD.text(g, f.m.l + 4, Y(ATM) - 5, '1 atmosphere', pal.ink3, 'start', 10);
    const pts = [];
    for (let i = 0; i <= 160; i++) { const a = A0 * Math.pow(A1 / A0, i / 160); pts.push([a, press(a)]); }
    Lab.svg('path', { d: QD.path(pts, X, Y), fill: 'none', stroke: pal.accent, 'stroke-width': 2 }, g);
    const mk = Lab.svg('circle', { cx: X(st.a), cy: Y(press(st.a)), r: 4.5, fill: pal.accent, stroke: pal.paper3, 'stroke-width': 2 }, g);
    QD.hover(svg, f, A0, A1, (a, sx, sy, px, py) => {
      const aa = Math.max(A0, Math.min(A1, a));
      tip.show(px, py - 8, `<b>${nm(aa)}</b><br>${QD.sci(press(aa))} Pa<br>${(press(aa) / ATM).toExponential(1)} atm`);
    }, () => tip.hide(), true);
    return mk;
  }

  function readouts() {
    const P = press(st.a), A = st.area * 1e-4;
    const aT = (hbar * c) / (kB * Math.max(1, st.T)); // separation where kT = hbar c / a
    const F = P * A;
    out.innerHTML = [
      ['Pressure', QD.sci(P) + ' Pa'],
      ['Fraction of 1 atm', P / ATM >= 0.01 ? (P / ATM).toPrecision(3) : QD.sci(P / ATM)],
      [`Force on ${st.area.toPrecision(2)} cm²`, F >= 1e-6 ? (F * 1e6).toPrecision(3) + ' µN' : (F * 1e9).toPrecision(3) + ' nN'],
      ['Equivalent weight', (F / 9.80665 * 1e6).toPrecision(3) + ' µg'],
      ['Lowest mode between plates', QD.sci(c / (2 * st.a)) + ' Hz'],
      ['Thermal photons matter below', nm(aT)],
    ].map(([k, v]) => `<span>${k} <b>${v}</b></span>`).join('');
  }

  function all() { if (!ready) return; drawCanvas(); drawChart(); readouts(); }
  Lab.slider(Lab.$('#ca-a', root), (v) => nm(Math.pow(10, v) * 1e-9), (v) => { st.a = Math.pow(10, v) * 1e-9; all(); });
  Lab.slider(Lab.$('#ca-area', root), Lab.fmt.fixed(2), (v) => { st.area = v; all(); });
  Lab.slider(Lab.$('#ca-t', root), (v) => (v === 0 ? '0 K' : v + ' K'), (v) => { st.T = v; all(); });
  ready = true; all();
  Lab.onTheme(all); Lab.onResize(cv, all); Lab.onResize(svg, drawChart);
})();

/* ---------------------------------------------------------------- Fig 2.1 */
(function () {
  const root = Lab.$('#fig-levels');
  if (!root) return;
  const cv = Lab.$('.lv-cv', root), svg = Lab.$('.lv-chart', root), wrap = svg.parentElement;
  const out = Lab.$('.readouts', root), tip = Lab.tip(wrap);
  const { alpha, mec2, Ry, eV2MHz } = QD.K;
  const st = { Z: 1, mode: 'fs' };
  let ready = false;

  // exact Dirac energy for a point nucleus
  const Edirac = (n, j, Z) => {
    const za = Z * alpha, gg = n - j - 0.5 + Math.sqrt((j + 0.5) * (j + 0.5) - za * za);
    return mec2 / Math.sqrt(1 + (za / gg) * (za / gg));
  };
  const fine = (Z) => (Edirac(2, 1.5, Z) - Edirac(2, 0.5, Z)) * eV2MHz;          // MHz
  const fineExp = (Z) => (mec2 * Math.pow(Z * alpha, 4) / 32) * eV2MHz;           // leading expansion
  const bohr = (n, Z) => -Ry * Z * Z / (n * n);
  // leading-order Bethe estimate of the 2S radiative shift, scaled to Z (crude at large Z)
  // The leading-log expression loses all meaning once the average excitation energy exceeds the cutoff,
  // which happens near Z = 47; beyond that the figure reports nothing rather than a negative shift.
  const lambCrude = (Z) => {
    const L = Math.log(mec2 / (16.64 * Ry * Z * Z));
    return L > 0 ? (4 * mec2 * Math.pow(alpha, 5) * Math.pow(Z, 4) / (3 * Math.PI * 8)) * L * eV2MHz : 0;
  };
  const LAMB_H = 1057.845;

  function drawCanvas() {
    if (!cv.clientWidth) return;
    const { ctx, w, h } = Lab.canvas(cv, cv.clientWidth < 520 ? 0.98 : 0.74), pal = Lab.palette();
    ctx.clearRect(0, 0, w, h);
    const accent = Lab.rgb('--accent'), signal = Lab.rgb('--signal');
    const fs = fine(st.Z), ex = fineExp(st.Z), lamb = st.Z === 1 ? LAMB_H : lambCrude(st.Z);
    const top = 26, bot = h - 34, span = bot - top;
    // The fine structure dwarfs the radiative shift, so the scale is broken: the lower 60% of the panel is
    // linear from zero to 1.5 times the radiative shift, and the fine-structure level sits above the break.
    const hiLow = Math.max(lamb * 1.5, fs * 1e-4);
    const yLow = (mhz) => bot - (Math.min(mhz, hiLow) / hiLow) * span * 0.58;
    const yBreak = bot - span * 0.68, yFS = bot - span * 0.86;
    const xa = 62, xb = w * 0.5, xc = w * 0.55, xd = w - 14;
    ctx.font = `11px ${Lab.css('--f-mono')}`;
    ctx.fillStyle = pal.ink3;
    ctx.fillText('DIRAC', xa, 14); ctx.fillText('MEASURED', xc, 14);
    const lvl = (x0, x1, y, label, col, dash, below) => {
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash(dash || []);
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = pal.ink2; ctx.font = `11px ${Lab.css('--f-mono')}`;
      ctx.fillText(label, x0 + 4, y + (below ? 14 : -6));
    };
    // the break
    ctx.strokeStyle = pal.rule; ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(xa - 10, yBreak); ctx.lineTo(xd, yBreak); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = pal.ink3; ctx.font = `10px ${Lab.css('--f-mono')}`;
    ctx.fillText('scale break', xa - 10, yBreak - 5);
    // above the break: the fine-structure partner
    lvl(xa, xb, yFS, '2P³⁄₂', Lab.rgbStr(accent, 0.75));
    lvl(xc, xd, yFS, '2P³⁄₂', Lab.rgbStr(signal, 0.6));
    ctx.textAlign = 'right'; ctx.fillStyle = pal.ink3; ctx.font = `10px ${Lab.css('--f-mono')}`;
    ctx.fillText(fs >= 1e6 ? QD.sci(fs / 1e3) + ' GHz' : (fs / 1e3).toFixed(2) + ' GHz', xa - 6, yFS + 4);
    ctx.textAlign = 'left';
    if (st.mode === 'fs') {
      lvl(xa, xa + (xb - xa) * 0.55, yFS + 18, `expansion, ${((ex / fs - 1) * 100).toFixed(3)}%`, Lab.rgbStr(accent, 0.35), [4, 3], true);
    } else {
      ctx.fillStyle = pal.ink3; ctx.font = `10px ${Lab.css('--f-mono')}`;
      ctx.fillText('Bohr: every n = 2 state degenerate', xa, yFS + 24);
    }
    // below the break: the pair the Dirac equation says are identical
    lvl(xa, xb, yLow(0), '2S½ = 2P½', Lab.rgbStr(accent, 1));
    lvl(xc, xd, yLow(0), '2P½', Lab.rgbStr(signal, 0.6), null, true);
    if (lamb > 0) {
      lvl(xc, xd, yLow(lamb), '2S½', Lab.rgbStr(signal, 1), [5, 3]);
      ctx.strokeStyle = pal.ink3; ctx.lineWidth = 1;
      const gx = xc - 10;
      ctx.beginPath(); ctx.moveTo(gx, yLow(0)); ctx.lineTo(gx, yLow(lamb)); ctx.stroke();
      ctx.fillStyle = pal.signal; ctx.font = `11px ${Lab.css('--f-mono')}`; ctx.textAlign = 'right';
      ctx.fillText(lamb >= 1e6 ? QD.sci(lamb / 1e3) + ' GHz' : lamb.toFixed(1) + ' MHz', gx - 4, (yLow(0) + yLow(lamb)) / 2 + 4);
      ctx.textAlign = 'left';
    } else {
      ctx.fillStyle = pal.signal; ctx.font = `11px ${Lab.css('--f-mono')}`; ctx.textAlign = 'right';
      ctx.fillText('beyond the formula', xc - 10, yLow(0) - 20); ctx.textAlign = 'left';
    }
    ctx.fillStyle = pal.ink3; ctx.font = `10px ${Lab.css('--f-mono')}`;
    ctx.fillText(`Z = ${st.Z}   ionisation energy ${QD.num(-bohr(1, st.Z))} eV`, xa, h - 8);
  }

  function drawChart() {
    const f = QD.frame(svg, {
      h: 280, m: { l: 56, r: 20, t: 26, b: 42 }, x: [1, 92], y: [1e2, 1e13], ylog: true,
      xt: [1, 20, 40, 60, 80], yt: [1e2, 1e5, 1e8, 1e11], yf: (v) => QD.sci(v),
      xl: 'nuclear charge Z', yl: 'splitting, MHz',
    });
    const { X, Y, g, pal } = f;
    const A = [], B = [];
    for (let Z = 1; Z <= 92; Z++) { A.push([Z, fine(Z)]); if (lambCrude(Z) > 0) B.push([Z, lambCrude(Z)]); }
    Lab.svg('path', { d: QD.path(A, X, Y), fill: 'none', stroke: pal.s1, 'stroke-width': 2 }, g);
    Lab.svg('path', { d: QD.path(B, X, Y), fill: 'none', stroke: pal.s2, 'stroke-width': 2, 'stroke-dasharray': '5 3' }, g);
    QD.text(g, X(92) - 4, Y(fine(92)) + 16, 'fine structure', pal.s1, 'end', 10);
    const last = B[B.length - 1];
    QD.text(g, X(last[0]) + 4, Y(last[1]) + 4, 'Lamb shift', pal.s2, 'start', 10);
    Lab.svg('circle', { cx: X(1), cy: Y(LAMB_H), r: 4, fill: pal.signal }, g);
    QD.text(g, X(1) + 7, Y(LAMB_H) + 4, 'hydrogen, measured', pal.signal, 'start', 10);
    Lab.svg('line', { x1: X(st.Z), x2: X(st.Z), y1: f.m.t, y2: f.H - f.m.b, stroke: pal.accent, opacity: 0.5 }, g);
    QD.hover(svg, f, 1, 92, (z, sx, sy, px, py) => {
      const Z = Math.max(1, Math.min(92, Math.round(z)));
      const lb = lambCrude(Z);
      tip.show(px, py - 8, `<b>Z = ${Z}</b><br>fine structure ${QD.sci(fine(Z))} MHz<br>Lamb shift ${lb > 0 ? QD.sci(lb) + ' MHz' : 'beyond the formula'}<br>${lb > 0 ? 'ratio ' + (lb / fine(Z) * 100).toFixed(1) + '%' : ''}`);
    }, () => tip.hide());
  }

  function readouts() {
    const fs = fine(st.Z), ex = fineExp(st.Z), lamb = st.Z === 1 ? LAMB_H : lambCrude(st.Z);
    out.innerHTML = [
      ['Dirac 2S½ − 2P½', 'exactly 0'],
      ['Dirac 2P³⁄₂ − 2P½', (fs >= 1e6 ? QD.sci(fs / 1e3) + ' GHz' : (fs / 1e3).toFixed(3) + ' GHz')],
      ['Expansion in (Zα)⁴', (ex >= 1e6 ? QD.sci(ex / 1e3) + ' GHz' : (ex / 1e3).toFixed(3) + ' GHz')],
      ['Expansion error', ((ex / fs - 1) * 100).toFixed(3) + '%'],
      [st.Z === 1 ? 'Measured Lamb shift' : 'Lamb shift, leading log', lamb > 0 ? (lamb >= 1e6 ? QD.sci(lamb / 1e3) + ' GHz' : lamb.toFixed(1) + ' MHz') : 'beyond the formula'],
      ['Lamb shift / fine structure', lamb > 0 ? (lamb / fs * 100).toFixed(2) + '%' : '—'],
    ].map(([k, v]) => `<span>${k} <b>${v}</b></span>`).join('');
  }

  function all() { if (!ready) return; drawCanvas(); drawChart(); readouts(); }
  Lab.slider(Lab.$('#lv-z', root), (v) => String(v), (v) => { st.Z = v; all(); });
  Lab.$('#lv-mode', root).addEventListener('change', (e) => { st.mode = e.target.value; all(); });
  ready = true; all();
  Lab.onTheme(all); Lab.onResize(cv, all); Lab.onResize(svg, drawChart);
})();
