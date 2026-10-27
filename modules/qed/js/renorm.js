/* Volume XIV, Part II figures.
   Fig 4.1  Bethe's 1947 non-relativistic self-energy estimate of the Lamb shift.
   Fig 5.1  Amplitudes added as arrows: reflection from a sheet of glass.
   Fig 6.1  One-loop vacuum polarization, in momentum space (the running coupling) and in position space (Uehling). */

/* ---------------------------------------------------------------- Fig 4.1 */
(function () {
  const root = Lab.$('#fig-bethe');
  if (!root) return;
  const cv = Lab.$('.be-cv', root), svg = Lab.$('.be-chart', root), wrap = svg.parentElement;
  const out = Lab.$('.readouts', root), tip = Lab.tip(wrap);
  const { alpha, mec2, Ry, eV2MHz } = QD.K;
  const MEAS = 1057.845;
  const st = { K: mec2, E: 17.8, n: 2 };
  let ready = false;

  // prefactor in MHz: 4 m c^2 alpha^5 / (3 pi n^3)
  const pre = (n) => (4 * mec2 * Math.pow(alpha, 5)) / (3 * Math.PI * n * n * n) * eV2MHz;
  const shift = (K, E, n) => pre(n) * Math.log(K / (E * Ry));
  const eFmt = (v) => (v >= 1e9 ? (v / 1e9).toPrecision(3) + ' GeV' : v >= 1e6 ? (v / 1e6).toPrecision(3) + ' MeV' : (v / 1e3).toPrecision(3) + ' keV');

  function drawCanvas() {
    if (!cv.clientWidth) return;
    const { ctx, w, h } = Lab.canvas(cv, cv.clientWidth < 520 ? 0.95 : 0.74), pal = Lab.palette();
    ctx.clearRect(0, 0, w, h);
    const accent = Lab.rgb('--accent'), signal = Lab.rgb('--signal'), ink3 = Lab.rgb('--ink-3');
    const pred = shift(st.K, st.E, st.n);
    // --- left: the subtraction, drawn as two bars running off the top and a finite remainder
    const bx = 22, bw = 30, base = h - 38, topClip = 26;
    ctx.font = `10px ${Lab.css('--f-mono')}`;
    [['bound', 0], ['free', 1]].forEach(([lab, i]) => {
      const x = bx + i * (bw + 14);
      ctx.fillStyle = Lab.rgbStr(ink3, 0.35);
      ctx.fillRect(x, topClip, bw, base - topClip);
      // a zigzag top edge: the bar runs off scale
      ctx.strokeStyle = pal.paper3; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let k = 0; k <= bw; k += 5) ctx.lineTo(x + k, topClip + (k % 10 ? 4 : 0));
      ctx.stroke();
      ctx.fillStyle = pal.ink3; ctx.textAlign = 'center';
      ctx.fillText(lab, x + bw / 2, base + 13);
    });
    ctx.fillStyle = pal.ink2; ctx.font = `13px ${Lab.css('--f-mono')}`;
    ctx.fillText('−', bx + bw + 7, (topClip + base) / 2);
    ctx.textAlign = 'left';
    ctx.font = `10px ${Lab.css('--f-mono')}`; ctx.fillStyle = pal.ink3;
    ctx.fillText('both infinite', bx, 18);
    // --- right: the level diagram
    const ax = bx + 2 * bw + 44, axr = w - 24, y0 = base, span = base - 44;
    const MAXM = 1600;
    const Y = (mhz) => y0 - (Math.max(0, Math.min(MAXM, mhz)) / MAXM) * span;
    ctx.strokeStyle = pal.grid; ctx.lineWidth = 1;
    [0, 400, 800, 1200, 1600].forEach((v) => {
      ctx.beginPath(); ctx.moveTo(ax, Y(v)); ctx.lineTo(axr, Y(v)); ctx.stroke();
      ctx.fillStyle = pal.ink3; ctx.textAlign = 'right'; ctx.font = `10px ${Lab.css('--f-mono')}`;
      ctx.fillText(String(v), ax - 4, Y(v) + 4); ctx.textAlign = 'left';
    });
    ctx.strokeStyle = Lab.rgbStr(ink3, 0.9); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ax, Y(0)); ctx.lineTo(axr, Y(0)); ctx.stroke();
    ctx.fillStyle = pal.ink2; ctx.font = `11px ${Lab.css('--f-mono')}`;
    ctx.fillText(`${st.n}P½, unshifted`, ax + 4, Y(0) - 6);
    // measured
    ctx.strokeStyle = Lab.rgbStr(signal, 1); ctx.setLineDash([5, 3]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ax, Y(MEAS)); ctx.lineTo(axr, Y(MEAS)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = pal.signal;
    ctx.fillText('measured in hydrogen, 1057.8 MHz', ax + 4, Y(MEAS) - 6);
    // predicted
    ctx.strokeStyle = Lab.rgbStr(accent, 1); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(ax, Y(pred)); ctx.lineTo(axr, Y(pred)); ctx.stroke();
    ctx.fillStyle = pal.accent;
    ctx.fillText(`${st.n}S½ predicted, ${pred.toFixed(0)} MHz`, ax + 4, Y(pred) + (pred > MEAS - 90 && pred < MEAS ? 16 : -6));
    ctx.fillStyle = pal.ink3; ctx.font = `10px ${Lab.css('--f-mono')}`;
    ctx.fillText('shift above 2P½, MHz', ax, h - 8);
  }

  function drawChart() {
    const K0 = 1e3, K1 = 1e10;
    const f = QD.frame(svg, {
      h: 280, m: { l: 50, r: 16, t: 26, b: 42 }, x: [K0, K1], y: [0, 1700], xlog: true,
      xt: [1e3, 1e5, 1e7, 1e9], yt: [0, 400, 800, 1200, 1600],
      xf: (v) => eFmt(v), xl: 'photon energy cutoff K', yl: 'predicted shift, MHz',
    });
    const { X, Y, g, pal } = f;
    Lab.svg('line', { x1: f.m.l, x2: f.W - f.m.r, y1: Y(MEAS), y2: Y(MEAS), stroke: pal.signal, 'stroke-dasharray': '4 3' }, g);
    QD.text(g, f.m.l + 4, Y(MEAS) - 5, 'measured, 1057.8 MHz', pal.signal, 'start', 10);
    Lab.svg('line', { x1: X(mec2), x2: X(mec2), y1: f.m.t, y2: f.H - f.m.b, stroke: pal.ink3, 'stroke-dasharray': '2 3' }, g);
    QD.text(g, X(mec2) + 4, f.m.t + 10, 'K = mc² ', pal.ink3, 'start', 10);
    const pts = [];
    for (let i = 0; i <= 140; i++) { const K = K0 * Math.pow(K1 / K0, i / 140); pts.push([K, Math.max(0, shift(K, st.E, st.n))]); }
    Lab.svg('path', { d: QD.path(pts, X, Y), fill: 'none', stroke: pal.accent, 'stroke-width': 2 }, g);
    Lab.svg('circle', { cx: X(st.K), cy: Y(Math.max(0, shift(st.K, st.E, st.n))), r: 4.5, fill: pal.accent, stroke: pal.paper3, 'stroke-width': 2 }, g);
    QD.hover(svg, f, K0, K1, (K, sx, sy, px, py) => {
      const k = Math.max(K0, Math.min(K1, K));
      tip.show(px, py - 8, `<b>K = ${eFmt(k)}</b><br>${shift(k, st.E, st.n).toFixed(1)} MHz<br>${(shift(k, st.E, st.n) / MEAS * 100).toFixed(1)}% of measured`);
    }, () => tip.hide(), true);
  }

  function readouts() {
    const pred = shift(st.K, st.E, st.n), p = pre(st.n);
    out.innerHTML = [
      ['prefactor 4mc²α⁵/3πn³', p.toFixed(1) + ' MHz'],
      ['log factor ln(K/⟨E⟩)', Math.log(st.K / (st.E * Ry)).toFixed(3)],
      ['predicted shift', pred.toFixed(1) + ' MHz'],
      [st.n === 2 ? 'against measured 1057.8' : 'n = 2 measured value', st.n === 2 ? (pred - MEAS).toFixed(1) + ' MHz' : 'n ≠ 2'],
      ['cost of doubling K', (p * Math.LN2).toFixed(0) + ' MHz'],
      ['cost of a factor of ten', (p * Math.LN10).toFixed(0) + ' MHz'],
    ].map(([a, b]) => `<span>${a} <b>${b}</b></span>`).join('');
  }

  function all() { if (!ready) return; drawCanvas(); drawChart(); readouts(); }
  Lab.slider(Lab.$('#be-k', root), (v) => eFmt(Math.pow(10, v)), (v) => { st.K = Math.pow(10, v); all(); });
  Lab.slider(Lab.$('#be-e', root), (v) => v.toFixed(1), (v) => { st.E = v; all(); });
  Lab.slider(Lab.$('#be-n', root), (v) => 'n = ' + v, (v) => { st.n = v; all(); });
  ready = true; all();
  Lab.onTheme(all); Lab.onResize(cv, all); Lab.onResize(svg, drawChart);
})();

/* ---------------------------------------------------------------- Fig 5.1 */
(function () {
  const root = Lab.$('#fig-arrows');
  if (!root) return;
  const cv = Lab.$('.ar-cv', root), svg = Lab.$('.ar-chart', root), wrap = svg.parentElement;
  const out = Lab.$('.readouts', root), tip = Lab.tip(wrap);
  const st = { d: 210, lam: 550, n: 1.5, k: 2 };
  let ready = false;

  const rOf = (n) => (n - 1) / (n + 1);
  const phase = (d, lam, n) => (4 * Math.PI * n * d) / lam;
  // amplitudes at normal incidence: term 0 is the front-surface reflection, term m has m round trips inside
  function terms(d, lam, n, k) {
    const r = rOf(n), phi = phase(d, lam, n), list = [{ re: -r, im: 0, mag: r }];
    for (let m = 1; m < k; m++) {
      const mag = (1 - r * r) * Math.pow(r, 2 * m - 1);
      list.push({ re: mag * Math.cos(m * phi), im: mag * Math.sin(m * phi), mag });
    }
    return list;
  }
  const sum = (list) => list.reduce((a, t) => ({ re: a.re + t.re, im: a.im + t.im }), { re: 0, im: 0 });
  const Rpart = (d, lam, n, k) => { const s = sum(terms(d, lam, n, k)); return s.re * s.re + s.im * s.im; };
  const Rexact = (d, lam, n) => { const r = rOf(n), c = Math.cos(phase(d, lam, n)); return (2 * r * r * (1 - c)) / (1 + Math.pow(r, 4) - 2 * r * r * c); };
  const Rincoh = (n, k) => terms(0, 1, n, k).reduce((a, t) => a + t.mag * t.mag, 0);

  function drawCanvas() {
    if (!cv.clientWidth) return;
    const narrow = cv.clientWidth < 560;
    const { ctx, w, h } = Lab.canvas(cv, narrow ? 0.98 : 0.74), pal = Lab.palette();
    ctx.clearRect(0, 0, w, h);
    const accent = Lab.rgb('--accent'), signal = Lab.rgb('--signal'), ink3 = Lab.rgb('--ink-3'), vac = Lab.rgb('--vac');
    const list = terms(st.d, st.lam, st.n, st.k), s = sum(list);
    // --- the glass sheet, with the first two paths drawn at a slant so they can be told apart
    const gx = 14, gw = narrow ? w - 28 : w * 0.44;
    const gy = 14, gh = narrow ? h * 0.30 : h * 0.74;
    const t1 = gy + gh * 0.38, t2 = gy + gh * 0.66;
    ctx.fillStyle = Lab.rgbStr(vac, 0.75); ctx.fillRect(gx, t1, gw, t2 - t1);
    ctx.strokeStyle = pal.ink2; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx, t1); ctx.lineTo(gx + gw, t1); ctx.moveTo(gx, t2); ctx.lineTo(gx + gw, t2); ctx.stroke();
    ctx.font = `10px ${Lab.css('--f-mono')}`; ctx.fillStyle = pal.ink3; ctx.textAlign = 'right';
    ctx.fillText(`glass, n = ${st.n.toFixed(2)}, d = ${st.d} nm`, gx + gw - 6, (t1 + t2) / 2 + 4);
    ctx.textAlign = 'left';
    const x0 = gx + gw * 0.26, slant = Math.min(gw * 0.11, (t2 - t1) * 1.6);
    const ray = (pts, col, wdt) => {
      ctx.strokeStyle = col; ctx.lineWidth = wdt;
      ctx.beginPath(); pts.forEach((p, i) => ctx[i ? 'lineTo' : 'moveTo'](p[0], p[1])); ctx.stroke();
    };
    ray([[x0 - slant * 1.5, gy], [x0, t1]], Lab.rgbStr(ink3, 0.9), 1.6);
    ray([[x0, t1], [x0 + slant * 1.5, gy]], Lab.rgbStr(accent, 1), 2.2);
    ray([[x0, t1], [x0 + slant, t2], [x0 + 2 * slant, t1], [x0 + 3.5 * slant, gy]], Lab.rgbStr(accent, 0.55), 1.8);
    if (st.k > 2) ray([[x0 + 2 * slant, t1], [x0 + 3 * slant, t2], [x0 + 4 * slant, t1], [x0 + 5.5 * slant, gy]], Lab.rgbStr(accent, 0.3), 1.5);
    ctx.fillStyle = pal.ink3;
    ctx.fillText('in', x0 - slant * 1.5 - 14, gy + 4);
    ctx.fillStyle = pal.accent;
    ctx.fillText('1', x0 + slant * 1.5 + 3, gy + 4);
    ctx.fillText('2', x0 + 3.5 * slant + 3, gy + 4);
    if (st.k > 2) ctx.fillText('3', x0 + 5.5 * slant + 3, gy + 4);
    // --- the Argand diagram
    const ax = narrow ? w * 0.46 : gx + gw + (w - gx - gw) * 0.48;
    const ay = narrow ? h * 0.60 : gy + gh * 0.46;
    const span = narrow ? Math.min(w * 0.33, h * 0.2) : Math.min((w - gx - gw) * 0.40, gh * 0.36);
    const SC = span / 0.42;
    ctx.strokeStyle = pal.grid; ctx.lineWidth = 1;
    [0.1, 0.2, 0.3, 0.4].forEach((v) => { ctx.beginPath(); ctx.arc(ax, ay, v * SC, 0, 7); ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(ax - span, ay); ctx.lineTo(ax + span, ay); ctx.moveTo(ax, ay - span); ctx.lineTo(ax, ay + span); ctx.stroke();
    const head = (x, y, ang, col, len) => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x - Math.cos(ang - 0.4) * len, y - Math.sin(ang - 0.4) * len);
      ctx.lineTo(x - Math.cos(ang + 0.4) * len, y - Math.sin(ang + 0.4) * len);
      ctx.closePath(); ctx.fill();
    };
    let px = ax, py = ay;
    list.forEach((t, i) => {
      const nx = px + t.re * SC, ny = py - t.im * SC;
      const col = Lab.rgbStr(accent, i === 0 ? 1 : Math.max(0.3, 0.85 - i * 0.1));
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
      head(nx, ny, Math.atan2(ny - py, nx - px), col, 5);
      px = nx; py = ny;
    });
    ctx.strokeStyle = Lab.rgbStr(signal, 1); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(px, py); ctx.stroke();
    head(px, py, Math.atan2(py - ay, px - ax), Lab.rgbStr(signal, 1), 7);
    ctx.font = `10px ${Lab.css('--f-mono')}`; ctx.fillStyle = pal.ink3;
    ctx.fillText('amplitudes added head to tail', ax - span, ay - span - 8);
    ctx.font = `11px ${Lab.css('--f-mono')}`; ctx.fillStyle = pal.signal;
    ctx.fillText(`resultant |A| = ${Math.hypot(s.re, s.im).toFixed(3)}`, ax - span, ay + span + 16);
    ctx.fillStyle = pal.ink; ctx.font = `12px ${Lab.css('--f-mono')}`;
    ctx.fillText(`|A|² = ${(Rpart(st.d, st.lam, st.n, st.k) * 100).toFixed(2)}%`, ax - span, ay + span + 33);
  }

  function drawChart() {
    const f = QD.frame(svg, {
      h: 280, m: { l: 48, r: 16, t: 26, b: 42 }, x: [0, 800], y: [0, 0.18],
      xt: [0, 200, 400, 600, 800], yt: [0, 0.04, 0.08, 0.12, 0.16],
      yf: (v) => (v * 100).toFixed(0) + '%', xl: 'glass thickness, nm', yl: 'reflection probability',
    });
    const { X, Y, g, pal } = f;
    const inc = Rincoh(st.n, st.k);
    Lab.svg('line', { x1: f.m.l, x2: f.W - f.m.r, y1: Y(inc), y2: Y(inc), stroke: pal.ink3, 'stroke-dasharray': '4 3' }, g);
    QD.text(g, f.m.l + 4, Y(inc) + 13, 'if probabilities were added', pal.ink3, 'start', 10);
    const ex = [], ap = [];
    for (let i = 0; i <= 320; i++) { const d = (i / 320) * 800; ex.push([d, Rexact(d, st.lam, st.n)]); ap.push([d, Rpart(d, st.lam, st.n, st.k)]); }
    Lab.svg('path', { d: QD.path(ex, X, Y), fill: 'none', stroke: pal.s1, 'stroke-width': 2 }, g);
    if (st.k < 12) Lab.svg('path', { d: QD.path(ap, X, Y), fill: 'none', stroke: pal.s2, 'stroke-width': 1.5, 'stroke-dasharray': '5 3' }, g);
    QD.text(g, f.W - f.m.r - 2, f.m.t + 10, 'exact', pal.s1, 'end', 10);
    if (st.k < 12) QD.text(g, f.W - f.m.r - 2, f.m.t + 23, `${st.k} arrows`, pal.s2, 'end', 10);
    Lab.svg('circle', { cx: X(st.d), cy: Y(Rpart(st.d, st.lam, st.n, st.k)), r: 4.5, fill: pal.accent, stroke: pal.paper3, 'stroke-width': 2 }, g);
    QD.hover(svg, f, 0, 800, (d, sx, sy, px, py) => {
      const dd = Math.max(0, Math.min(800, d));
      tip.show(px, py - 8, `<b>${dd.toFixed(0)} nm</b><br>exact ${(Rexact(dd, st.lam, st.n) * 100).toFixed(2)}%<br>${st.k} arrows ${(Rpart(dd, st.lam, st.n, st.k) * 100).toFixed(2)}%`);
    }, () => tip.hide());
  }

  function readouts() {
    const r = rOf(st.n), phi = phase(st.d, st.lam, st.n);
    const Rk = Rpart(st.d, st.lam, st.n, st.k), Re = Rexact(st.d, st.lam, st.n);
    out.innerHTML = [
      ['single-surface amplitude r', r.toFixed(4)],
      ['single-surface probability r²', (r * r * 100).toFixed(2) + '%'],
      ['phase between arrows', (phi / (2 * Math.PI)).toFixed(3) + ' × 2π'],
      [`probability with ${st.k} arrows`, (Rk * 100).toFixed(3) + '%'],
      ['exact', (Re * 100).toFixed(3) + '%'],
      ['largest possible', (4 * r * r / Math.pow(1 + r * r, 2) * 100).toFixed(2) + '%'],
      ['if probabilities were added', (Rincoh(st.n, st.k) * 100).toFixed(2) + '%'],
    ].map(([a, b]) => `<span>${a} <b>${b}</b></span>`).join('');
  }

  function all() { if (!ready) return; drawCanvas(); drawChart(); readouts(); }
  Lab.slider(Lab.$('#ar-d', root), (v) => v + ' nm', (v) => { st.d = v; all(); });
  Lab.slider(Lab.$('#ar-l', root), (v) => v + ' nm', (v) => { st.lam = v; all(); });
  Lab.slider(Lab.$('#ar-n', root), Lab.fmt.fixed(2), (v) => { st.n = v; all(); });
  Lab.slider(Lab.$('#ar-k', root), (v) => String(v), (v) => { st.k = v; all(); });
  ready = true; all();
  Lab.onTheme(all); Lab.onResize(cv, all); Lab.onResize(svg, drawChart);
})();

/* ---------------------------------------------------------------- Fig 6.1 */
(function () {
  const root = Lab.$('#fig-running');
  if (!root) return;
  const cv = Lab.$('.ru-cv', root), svg = Lab.$('.ru-chart', root), wrap = svg.parentElement;
  const out = Lab.$('.readouts', root), tip = Lab.tip(wrap);
  const { alpha, alphaInvRb } = QD.K;
  const AINV = 137.035999177;
  const MZ = 91.1876, DAHAD_MZ = 0.02766; // measured hadronic running at the Z, used to normalise the quark model
  const LEP = [['e', 0.51099895e-3], ['µ', 0.1056583755], ['τ', 1.77686]];           // GeV
  const QRK = [['u', 0.30, 4 / 9], ['d', 0.30, 1 / 9], ['s', 0.50, 1 / 9], ['c', 1.50, 4 / 9], ['b', 4.50, 1 / 9]];
  const st = { Q: Math.pow(10, 1.96), mode: 'all' };
  let ready = false;

  // one-loop vacuum polarization for one fermion: (alpha/pi) * integral 2x(1-x) ln(1 + x(1-x)Q^2/m^2)
  function pi1(Q, m, col) {
    const N = 120; let s = 0;
    for (let i = 0; i <= N; i++) {
      const x = i / N, wt = i === 0 || i === N ? 1 : i % 2 ? 4 : 2;
      s += wt * 2 * x * (1 - x) * Math.log(1 + (x * (1 - x) * Q * Q) / (m * m));
    }
    return (alpha / Math.PI) * col * (s / N / 3);
  }
  const dalLep = (Q) => LEP.reduce((a, [, m]) => a + pi1(Q, m, 1), 0);
  const dalQrkRaw = (Q) => QRK.reduce((a, [, m, q]) => a + pi1(Q, m, 3 * q), 0);
  const QNORM = DAHAD_MZ / dalQrkRaw(MZ);
  const dalQrk = (Q) => QNORM * dalQrkRaw(Q);
  const dal = (Q) => dalLep(Q) + (st.mode === 'all' ? dalQrk(Q) : 0);
  const ainvOf = (Q) => AINV * (1 - dal(Q));
  // Landau pole from the asymptotic form: (alpha/3pi) * sum N q^2 [ln Q^2/m^2 - 5/3] = 1
  function poleExp() {
    let cSum = 0, mSum = 0;
    LEP.forEach(([, m]) => { cSum += 1; mSum += Math.log(m * m); });
    if (st.mode === 'all') QRK.forEach(([, m, q]) => { cSum += QNORM * 3 * q; mSum += QNORM * 3 * q * Math.log(m * m); });
    const lnQ2 = (3 * Math.PI / alpha + mSum + (5 / 3) * cSum) / cSum;
    return lnQ2 / 2 / Math.LN10; // log10 of Q in GeV
  }

  // Uehling: potential relative to Coulomb, 1 + (2 alpha / 3 pi) * chi(r)
  const LAMC = 386.1592e-15; // m, electron Compton wavelength (reduced)
  function chi(rm) {
    const N = 2000, T = 70; let s = 0;
    for (let i = 1; i <= N; i++) {
      const t = 1 + ((T - 1) * i) / N;
      s += Math.exp((-2 * rm * t) / LAMC) * (1 + 1 / (2 * t * t)) * (Math.sqrt(t * t - 1) / (t * t));
    }
    return (s * (T - 1)) / N;
  }
  const enh = (rm) => (2 * alpha) / (3 * Math.PI) * chi(rm);

  function drawCanvas() {
    if (!cv.clientWidth) return;
    const { ctx, w, h } = Lab.canvas(cv, cv.clientWidth < 520 ? 0.95 : 0.78), pal = Lab.palette();
    ctx.clearRect(0, 0, w, h);
    const accent = Lab.rgb('--accent');
    const m = { l: 52, r: 16, t: 26, b: 36 };
    const R0 = 1e-15, R1 = 2e-12, Y0 = 1e-7, Y1 = 1e-2;
    const X = Lab.logScale(R0, R1, m.l, w - m.r), Y = Lab.logScale(Y0, Y1, h - m.b, m.t);
    ctx.font = `10px ${Lab.css('--f-mono')}`;
    [1e-7, 1e-6, 1e-5, 1e-4, 1e-3, 1e-2].forEach((v) => {
      ctx.strokeStyle = pal.grid; ctx.beginPath(); ctx.moveTo(m.l, Y(v)); ctx.lineTo(w - m.r, Y(v)); ctx.stroke();
      ctx.fillStyle = pal.ink3; ctx.textAlign = 'right'; ctx.fillText(QD.sci(v), m.l - 5, Y(v) + 4); ctx.textAlign = 'left';
    });
    [1e-15, 1e-14, 1e-13, 1e-12].forEach((v) => {
      ctx.strokeStyle = pal.grid; ctx.beginPath(); ctx.moveTo(X(v), m.t); ctx.lineTo(X(v), h - m.b); ctx.stroke();
      ctx.fillStyle = pal.ink3; ctx.textAlign = 'center'; ctx.fillText(v * 1e15 + ' fm', X(v), h - m.b + 14); ctx.textAlign = 'left';
    });
    // the Compton wavelength
    ctx.strokeStyle = pal.ink3; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(X(LAMC), m.t); ctx.lineTo(X(LAMC), h - m.b); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = pal.ink3; ctx.textAlign = 'right';
    ctx.fillText('ħ/mc = 386 fm', X(LAMC) - 4, m.t + 10); ctx.textAlign = 'left';
    ctx.strokeStyle = Lab.rgbStr(accent, 1); ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= 90; i++) {
      const rr = R0 * Math.pow(R1 / R0, i / 90), v = Math.max(Y0, Math.min(Y1, enh(rr)));
      ctx[i ? 'lineTo' : 'moveTo'](X(rr), Y(v));
    }
    ctx.stroke();
    ctx.fillStyle = pal.ink2; ctx.font = `11px ${Lab.css('--f-mono')}`;
    ctx.fillText('V(r) / Coulomb − 1', m.l, 16);
    ctx.font = `10px ${Lab.css('--f-mono')}`; ctx.fillStyle = pal.ink3;
    ctx.fillText('distance from the charge', m.l, h - 6);
  }

  function drawChart() {
    const Q0 = 1e-4, Q1 = 1e3;
    const f = QD.frame(svg, {
      h: 280, m: { l: 50, r: 22, t: 26, b: 42 }, x: [Q0, Q1], y: [125.4, 137.8], xlog: true,
      xt: [1e-4, 1e-2, 1, 1e2], yt: [126, 128, 130, 132, 134, 136],
      xf: (v) => (v >= 1 ? v + ' GeV' : v * 1e3 + ' MeV'), yl: 'α⁻¹ at momentum transfer Q', xl: 'momentum transfer Q',
    });
    const { X, Y, g, pal } = f;
    const pts = [];
    for (let i = 0; i <= 180; i++) { const Q = Q0 * Math.pow(Q1 / Q0, i / 180); pts.push([Q, ainvOf(Q)]); }
    Lab.svg('path', { d: QD.path(pts, X, Y), fill: 'none', stroke: pal.accent, 'stroke-width': 2 }, g);
    Lab.svg('line', { x1: f.m.l, x2: f.W - f.m.r, y1: Y(AINV), y2: Y(AINV), stroke: pal.ink3, 'stroke-dasharray': '3 3' }, g);
    QD.text(g, f.m.l + 4, Y(AINV) - 5, 'α⁻¹ = 137.036 at Q → 0', pal.ink3, 'start', 10);
    LEP.forEach(([nm, m2]) => {
      if (m2 < Q0) return;
      Lab.svg('line', { x1: X(m2), x2: X(m2), y1: f.m.t, y2: f.H - f.m.b, stroke: pal.grid }, g);
      QD.text(g, X(m2) + 3, f.H - f.m.b - 4, nm, pal.ink3, 'start', 10);
    });
    Lab.svg('line', { x1: X(MZ), x2: X(MZ), y1: f.m.t, y2: f.H - f.m.b, stroke: pal.s2, 'stroke-dasharray': '2 3' }, g);
    QD.text(g, X(MZ) - 4, f.H - f.m.b - 16, 'M', pal.s2, 'end', 10);
    QD.text(g, X(MZ) - 1, f.H - f.m.b - 16, 'Z', pal.s2, 'start', 8);
    Lab.svg('circle', { cx: X(st.Q), cy: Y(ainvOf(st.Q)), r: 4.5, fill: pal.accent, stroke: pal.paper3, 'stroke-width': 2 }, g);
    QD.hover(svg, f, Q0, Q1, (Q, sx, sy, px, py) => {
      const q = Math.max(Q0, Math.min(Q1, Q));
      tip.show(px, py - 8, `<b>Q = ${q < 1 ? (q * 1e3).toPrecision(3) + ' MeV' : q.toPrecision(3) + ' GeV'}</b><br>α⁻¹ = ${ainvOf(q).toFixed(3)}<br>Δα = ${dal(q).toExponential(2)}`);
    }, () => tip.hide(), true);
  }

  function readouts() {
    const q = st.Q;
    out.innerHTML = [
      ['α⁻¹ at this Q', ainvOf(q).toFixed(3)],
      ['Δα from leptons', dalLep(q).toExponential(3)],
      ['Δα from quarks', st.mode === 'all' ? dalQrk(q).toExponential(3) : 'excluded'],
      ['α⁻¹ at the Z mass', ainvOf(MZ).toFixed(2)],
      ['coupling stronger than at Q → 0 by', ((AINV / ainvOf(q) - 1) * 100).toFixed(2) + '%'],
      ['Landau pole', '10' + QD.sup(Math.round(poleExp())) + ' GeV'],
    ].map(([a, b]) => `<span>${a} <b>${b}</b></span>`).join('');
  }

  function all() { if (!ready) return; drawCanvas(); drawChart(); readouts(); }
  Lab.slider(Lab.$('#ru-q', root), (v) => (Math.pow(10, v) >= 1 ? Math.pow(10, v).toPrecision(3) + ' GeV' : (Math.pow(10, v) * 1e3).toPrecision(3) + ' MeV'), (v) => { st.Q = Math.pow(10, v); all(); });
  Lab.$('#ru-mode', root).addEventListener('change', (e) => { st.mode = e.target.value; all(); });
  ready = true; all();
  Lab.onTheme(all); Lab.onResize(cv, all); Lab.onResize(svg, drawChart);
})();
