/* Volume XIV, Chapter 8.
   Fig 8.1  A simulated g-2 run: positron counts with Poisson noise, and omega_a recovered by a real chi-squared fit.
   Fig 8.2  Published measurements and predictions of a_mu, and the 2025 Standard Model budget. */

/* ---------------------------------------------------------------- Fig 8.1 */
(function () {
  const root = Lab.$('#fig-wiggle');
  if (!root) return;
  const svgN = Lab.$('.wg-chart', root), svgC = Lab.$('.wg-chi', root);
  const out = Lab.$('.readouts', root), tip = Lab.tip(svgN.parentElement), tipC = Lab.tip(svgC.parentElement);
  const { e, mmu, taumu } = QD.K;
  const GAMMA = 29.3, TAU = GAMMA * taumu * 1e6;      // dilated lifetime in microseconds
  const AMU = 1.16592e-3, T0 = 30;                     // true value, and the start of the fit window in microseconds
  const st = { N: 1e7, A: 0.4, B: 1.45, T: 650 };
  let fit = null, ready = false;

  const omegaOf = (a, B) => (a * e * B) / mmu;         // rad/s
  const amuOf = (w, B) => (w * mmu) / (e * B);

  // build binned counts and fit omega by scanning chi-squared over a window set by the expected precision
  function run() {
    const w0 = omegaOf(AMU, st.B), phi = 2.1;
    const NB = Math.max(60, Math.min(1500, Math.round(st.T / 0.1492)));
    const dt = st.T / NB, t = new Float64Array(NB), n = new Float64Array(NB), ex = new Float64Array(NB);
    let wsum = 0;
    for (let i = 0; i < NB; i++) { t[i] = T0 + (i + 0.5) * dt; ex[i] = Math.exp(-(t[i] - T0) / TAU); wsum += ex[i]; }
    const scale = st.N / wsum;
    const r = Lab.rng(4133);
    for (let i = 0; i < NB; i++) {
      const mu = scale * ex[i] * (1 + st.A * Math.cos((w0 * t[i]) / 1e6 + phi));
      n[i] = QD.poisson(r, Math.max(0, mu));
    }
    // linear least squares in (p1, p2, p3) for the basis e^-t/tau * {1, cos wt, sin wt}
    const chi2 = (w) => {
      let a11 = 0, a12 = 0, a13 = 0, a22 = 0, a23 = 0, a33 = 0, b1 = 0, b2 = 0, b3 = 0, c0 = 0;
      for (let i = 0; i < NB; i++) {
        const s = Math.max(1, n[i]), iv = 1 / s, th = (w * t[i]) / 1e6;
        const f1 = ex[i], f2 = ex[i] * Math.cos(th), f3 = ex[i] * Math.sin(th);
        a11 += f1 * f1 * iv; a12 += f1 * f2 * iv; a13 += f1 * f3 * iv;
        a22 += f2 * f2 * iv; a23 += f2 * f3 * iv; a33 += f3 * f3 * iv;
        b1 += f1 * n[i] * iv; b2 += f2 * n[i] * iv; b3 += f3 * n[i] * iv;
        c0 += n[i] * n[i] * iv;
      }
      // solve the symmetric 3x3 system
      const M = [[a11, a12, a13], [a12, a22, a23], [a13, a23, a33]], v = [b1, b2, b3];
      for (let c = 0; c < 3; c++) {
        let p = c; for (let rr = c + 1; rr < 3; rr++) if (Math.abs(M[rr][c]) > Math.abs(M[p][c])) p = rr;
        if (p !== c) { const tmp = M[p]; M[p] = M[c]; M[c] = tmp; const tv = v[p]; v[p] = v[c]; v[c] = tv; }
        if (!M[c][c]) return { chi: Infinity, p: [0, 0, 0] };
        for (let rr = c + 1; rr < 3; rr++) { const f = M[rr][c] / M[c][c]; for (let k = c; k < 3; k++) M[rr][k] -= f * M[c][k]; v[rr] -= f * v[c]; }
      }
      const p = [0, 0, 0];
      for (let c = 2; c >= 0; c--) { let s = v[c]; for (let k = c + 1; k < 3; k++) s -= M[c][k] * p[k]; p[c] = s / M[c][c]; }
      return { chi: c0 - (p[0] * b1 + p[1] * b2 + p[2] * b3), p };
    };
    // expected statistical precision, used to size the scan
    const sigEst = Math.SQRT2 / (st.A * Math.sqrt(st.N) * TAU * 1e-6) * Math.max(1, (3 * TAU) / st.T);
    const half = Math.max(w0 * 2e-7, 9 * sigEst);
    const K = 161, scan = [];
    for (let i = 0; i < K; i++) { const w = w0 - half + (2 * half * i) / (K - 1); scan.push([w, chi2(w).chi]); }
    let best = 0; for (let i = 1; i < K; i++) if (scan[i][1] < scan[best][1]) best = i;
    let what = scan[best][0], sig = half / 3;
    if (best > 0 && best < K - 1) {
      const [x1, y1] = scan[best - 1], [x2, y2] = scan[best], [x3, y3] = scan[best + 1];
      const d = (y1 - 2 * y2 + y3);
      if (d > 0) {
        what = x2 - ((x3 - x1) / 2) * ((y3 - y1) / (2 * d));
        const curv = d / Math.pow(x3 - x2, 2);        // chi2 = curv * (w - what)^2 + const
        sig = Math.sqrt(1 / curv);
      }
    }
    const res = chi2(what);
    fit = { t, n, ex, NB, dt, w0, phi, what, sig, scan, p: res.p, chi: res.chi, TAUf: TAU };
  }

  function drawCounts() {
    if (!fit) return;
    // the counts chart shows the first part of the window, where individual cycles are still separable;
    // the fit itself always uses every bin
    const SHOW = Math.min(st.T, 70);
    const nShow = Math.max(2, Math.round(SHOW / fit.dt));
    let peak = 0, floor = Infinity;
    for (let i = 0; i < nShow; i++) { if (fit.n[i] > peak) peak = fit.n[i]; if (fit.n[i] > 0 && fit.n[i] < floor) floor = fit.n[i]; }
    peak = Math.max(10, peak * 1.6); floor = Math.max(0.5, (floor === Infinity ? peak * 0.1 : floor) * 0.7);
    const f = QD.frame(svgN, {
      h: 280, m: { l: 58, r: 26, t: 26, b: 42 }, x: [T0, T0 + SHOW], y: [floor, peak], ylog: true,
      xt: [T0, T0 + SHOW * 0.5, T0 + SHOW],
      yt: [1, 10, 1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8].filter((v) => v <= peak && v >= floor),
      xf: (v) => Math.round(v) + ' µs', yf: (v) => QD.sci(v),
      xl: 'time after injection', yl: 'positrons per bin',
    });
    const { X, Y, g, pal } = f;
    const series = (fn, col, width, dash) => {
      const pts = [];
      for (let i = 0; i < nShow; i++) { const v = fn(i); if (v > 0) pts.push([fit.t[i], v]); }
      Lab.svg('path', Object.assign({ d: QD.path(pts, X, Y), fill: 'none', stroke: col, 'stroke-width': width }, dash ? { 'stroke-dasharray': dash } : {}), g);
    };
    series((i) => fit.n[i], pal.ink3, 0.9);
    series((i) => { const th = (fit.what * fit.t[i]) / 1e6; return fit.ex[i] * (fit.p[0] + fit.p[1] * Math.cos(th) + fit.p[2] * Math.sin(th)); }, pal.accent, 1.4);
    series((i) => fit.ex[i] * fit.p[0], pal.s2, 1, '4 3');
    QD.text(g, f.W - f.m.r - 2, f.m.t + 10, 'exp(−t/γτ), γτ = 64.4 µs', pal.s2, 'end', 10);
    QD.text(g, f.m.l + 4, f.m.t + 10, `period ${(2 * Math.PI * 1e6 / fit.w0).toFixed(2)} µs`, pal.accent, 'start', 10);
    QD.text(g, f.m.l + 4, f.H - f.m.b - 6, `first ${Math.round(SHOW)} µs of a ${st.T} µs window`, pal.ink3, 'start', 10);
    QD.hover(svgN, f, T0, T0 + SHOW, (x, sx, sy, px, py) => {
      const i = Math.max(0, Math.min(nShow - 1, Math.round((x - T0) / fit.dt - 0.5)));
      tip.show(px, py - 8, `<b>${fit.t[i].toFixed(1)} µs</b><br>counted ${QD.num(fit.n[i])}<br>bin ${(fit.dt * 1000).toFixed(0)} ns`);
    }, () => tip.hide());
  }

  function drawChi() {
    if (!fit) return;
    const lo = fit.scan[0][0], hi = fit.scan[fit.scan.length - 1][0];
    let min = Infinity, max = -Infinity;
    fit.scan.forEach(([, c]) => { if (c < min) min = c; if (c > max) max = c; });
    const pad = Math.max(1, (max - min) * 0.08);
    const f = QD.frame(svgC, {
      h: 280, m: { l: 62, r: 14, t: 26, b: 42 }, x: [amuOf(lo, st.B) * 1e3, amuOf(hi, st.B) * 1e3], y: [min - pad, max + pad],
      xt: [amuOf(lo, st.B) * 1e3, amuOf(fit.w0, st.B) * 1e3, amuOf(hi, st.B) * 1e3],
      yt: [min, min + (max - min) / 2, max],
      xf: (v) => v.toPrecision(9), yf: (v) => Math.round(v).toLocaleString('en-US'),
      xl: 'trial a × 10³', yl: 'χ² of the fit',
    });
    const { X, Y, g, pal } = f;
    Lab.svg('path', { d: QD.path(fit.scan.map(([w, c]) => [amuOf(w, st.B) * 1e3, c]), X, Y), fill: 'none', stroke: pal.accent, 'stroke-width': 2 }, g);
    const aHat = amuOf(fit.what, st.B) * 1e3, aSig = amuOf(fit.sig, st.B) * 1e3;
    Lab.svg('line', { x1: X(AMU * 1e3), x2: X(AMU * 1e3), y1: f.m.t, y2: f.H - f.m.b, stroke: pal.s3, 'stroke-dasharray': '4 3' }, g);
    QD.text(g, X(AMU * 1e3) + 4, f.m.t + 10, 'true value', pal.s3, 'start', 10);
    Lab.svg('line', { x1: X(aHat), x2: X(aHat), y1: f.m.t, y2: f.H - f.m.b, stroke: pal.signal }, g);
    Lab.svg('rect', { x: Math.min(X(aHat - aSig), X(aHat + aSig)), y: f.m.t, width: Math.abs(X(aHat + aSig) - X(aHat - aSig)), height: f.H - f.m.b - f.m.t, fill: pal.signal, opacity: 0.16 }, g);
    QD.text(g, X(aHat) + 4, f.H - f.m.b - 6, 'fitted ±1σ', pal.signal, 'start', 10);
  }

  function readouts() {
    if (!fit) return;
    const aHat = amuOf(fit.what, st.B), aSig = amuOf(fit.sig, st.B);
    out.innerHTML = [
      ['precession frequency', (fit.w0 / 2 / Math.PI / 1e3).toFixed(2) + ' kHz'],
      ['bins fitted', fit.NB.toLocaleString('en-US')],
      ['fitted a<sub>µ</sub>', aHat.toPrecision(9)],
      ['statistical error', '± ' + aSig.toExponential(2)],
      ['precision', QD.num(Math.round((aSig / aHat) * 1e9)) + ' ppb'],
      ['pull from the true value', ((aHat - AMU) / aSig).toFixed(2) + 'σ'],
    ].map(([k, v]) => `<span>${k} <b>${v}</b></span>`).join('');
  }

  function all() { if (!ready) return; run(); drawCounts(); drawChi(); readouts(); }
  Lab.slider(Lab.$('#wg-n', root), (v) => QD.sci(Math.pow(10, v)), (v) => { st.N = Math.pow(10, v); all(); });
  Lab.slider(Lab.$('#wg-a', root), Lab.fmt.fixed(2), (v) => { st.A = v; all(); });
  Lab.slider(Lab.$('#wg-b', root), (v) => v.toFixed(2) + ' T', (v) => { st.B = v; all(); });
  Lab.slider(Lab.$('#wg-t', root), (v) => v + ' µs', (v) => { st.T = v; all(); });
  ready = true; all();
  Lab.onTheme(all); Lab.onResize(svgN, () => { drawCounts(); }); Lab.onResize(svgC, () => { drawChi(); });
})();

/* ---------------------------------------------------------------- Fig 8.2 */
(function () {
  const root = Lab.$('#fig-hist');
  if (!root) return;
  const svg = Lab.$('.hi-chart', root), svgB = Lab.$('.hi-budget', root);
  const out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
  // published values of a_mu in units of 1e-11, with total uncertainties
  const ROWS = [
    { k: 'CERN III, 1979', v: 116592400, u: 850, kind: 'exp' },
    { k: 'BNL E821, 2006', v: 116592089, u: 63, kind: 'exp' },
    { k: 'Fermilab Run-1, 2021', v: 116592040, u: 54, kind: 'exp' },
    { k: 'Fermilab Run-1/2/3, 2023', v: 116592055, u: 24, kind: 'exp' },
    { k: 'Fermilab final, 2025', v: 116592070.5, u: 14.8, kind: 'exp' },
    { k: 'Experimental average', v: 116592071.5, u: 14.5, kind: 'avg' },
    { k: 'White paper 2020 (e⁺e⁻)', v: 116591810, u: 43, kind: 'th' },
    { k: 'White paper 2025 (lattice)', v: 116592033, u: 62, kind: 'th' },
  ];
  const BUDGET = [
    { k: 'QED, five loops', v: 116584718.8, u: 0.2 },
    { k: 'Electroweak', v: 154.4, u: 0.4 },
    { k: 'Hadronic vacuum polarization, LO', v: 7132, u: 61 },
    { k: 'Hadronic vacuum polarization, HO', v: -87.2, u: 1.8 },
    { k: 'Hadronic light-by-light', v: 115.5, u: 9.9 },
  ];
  const REF = { wp25: 116592033, wp20: 116591810, exp: 116592071.5 };
  const st = { ref: 'wp25', zoom: true };
  let ready = false;

  function drawChart() {
    const rows = ROWS.filter((r) => !(st.zoom && r.k.startsWith('CERN')));
    const ref = REF[st.ref];
    let lo = 0, hi = 0;
    rows.forEach((r) => { lo = Math.min(lo, r.v - r.u - ref); hi = Math.max(hi, r.v + r.u - ref); });
    const pad = Math.max(10, (hi - lo) * 0.12); lo -= pad; hi += pad;
    const H = 40 + rows.length * 30;
    const f = QD.frame(svg, {
      h: H, m: { l: 10, r: 16, t: 26, b: 40 }, x: [lo, hi], y: [0, 1],
      xt: [Math.round(lo), 0, Math.round(hi)], yt: [],
      xf: (v) => (v > 0 ? '+' : '') + v, xl: 'deviation from the reference, ×10⁻¹¹',
    });
    const { X, g, pal } = f;
    const y0 = f.m.t + 6, dy = (f.H - f.m.b - y0) / rows.length;
    Lab.svg('line', { x1: X(0), x2: X(0), y1: y0 - 4, y2: f.H - f.m.b, stroke: pal.ink3 }, g);
    rows.forEach((r, i) => {
      const y = y0 + dy * (i + 0.5), d = r.v - ref;
      const col = r.kind === 'th' ? pal.s2 : r.kind === 'avg' ? pal.accent : pal.s1;
      Lab.svg('line', { x1: X(d - r.u), x2: X(d + r.u), y1: y, y2: y, stroke: col, 'stroke-width': 2 }, g);
      [-1, 1].forEach((s) => Lab.svg('line', { x1: X(d + s * r.u), x2: X(d + s * r.u), y1: y - 4, y2: y + 4, stroke: col, 'stroke-width': 2 }, g));
      Lab.svg('circle', { cx: X(d), cy: y, r: r.kind === 'avg' ? 5 : 4, fill: col, stroke: pal.paper3, 'stroke-width': 1.4 }, g);
      // the label sits above its bar, pushed inside whichever edge it is nearest
      const right = X(d) > (f.m.l + f.W - f.m.r) / 2;
      const lx = right ? Math.min(f.W - f.m.r, X(d + r.u)) : Math.max(f.m.l, X(d - r.u));
      QD.text(g, lx, y - 7, r.k, pal.ink2, right ? 'end' : 'start', 11);
    });
    QD.hover(svg, f, lo, hi, (x, sx, sy, px, py) => {
      // nearest row by vertical position is not available from the hover helper, so report the reference and scale
      tip.show(px, py - 8, `<b>${(x > 0 ? '+' : '') + x.toFixed(0)} × 10⁻¹¹</b><br>${(Math.abs(x) / ref * 1e9).toFixed(0)} ppb of a<sub>µ</sub>`);
    }, () => tip.hide());
  }

  function drawBudget() {
    const f = QD.frame(svgB, {
      h: 250, m: { l: 10, r: 16, t: 26, b: 44 }, x: [0.1, 2e8], y: [0, 1], xlog: true,
      xt: [1, 1e2, 1e4, 1e6, 1e8], yt: [], xf: (v) => QD.sci(v), xl: 'contribution, ×10⁻¹¹ (logarithmic)',
    });
    const { X, g, pal } = f;
    const y0 = f.m.t + 2, dy = (f.H - f.m.b - y0) / BUDGET.length;
    BUDGET.forEach((b, i) => {
      const y = y0 + dy * i + dy * 0.42, h = dy * 0.34;
      const col = i === 0 ? pal.s1 : i === 1 ? pal.s3 : pal.s2;
      const xEnd = X(Math.abs(b.v));
      Lab.svg('rect', { x: X(0.1), y, width: Math.max(1, xEnd - X(0.1)), height: h, fill: col, opacity: 0.7 }, g);
      QD.text(g, X(0.1), y - 4, b.k, pal.ink2, 'start', 11);
      const txt = `${b.v > 0 ? '' : '−'}${QD.num(Math.abs(b.v))} ± ${b.u}`;
      const room = f.W - f.m.r - xEnd > 110;
      QD.text(g, room ? xEnd + 6 : xEnd - 6, y + h - 2, txt, room ? col : pal.paper3, room ? 'start' : 'end', 10);
    });
  }

  function readouts() {
    const diff = REF.exp - REF.wp25, u = Math.sqrt(14.5 * 14.5 + 62 * 62);
    out.innerHTML = [
      ['experiment − 2025 theory', '+' + diff.toFixed(0) + ' ± ' + u.toFixed(0) + ' × 10⁻¹¹'],
      ['that is', (diff / u).toFixed(1) + 'σ'],
      ['experiment − 2020 theory', '+' + (REF.exp - REF.wp20).toFixed(0) + ' × 10⁻¹¹'],
      ['QED share of the total', (BUDGET[0].v / REF.wp25 * 100).toFixed(3) + '%'],
      ['QED share of the uncertainty', '0.003%'],
      ['hadronic share of the uncertainty', ((61 * 61 + 9.9 * 9.9 + 1.8 * 1.8) / (62 * 62) * 100).toFixed(1) + '%'],
    ].map(([k, v]) => `<span>${k} <b>${v}</b></span>`).join('');
  }

  function all() { if (!ready) return; drawChart(); drawBudget(); readouts(); }
  Lab.$('#hi-ref', root).addEventListener('change', (e) => { st.ref = e.target.value; all(); });
  Lab.$('#hi-zoom', root).addEventListener('change', (e) => { st.zoom = e.target.checked; all(); });
  ready = true; all();
  Lab.onTheme(all); Lab.onResize(svg, drawChart); Lab.onResize(svgB, drawBudget);
})();
