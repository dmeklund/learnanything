/* Volume XIV.
   Fig 7.1  The electron anomaly order by order, against the measurement, with the fine-structure constant as the limit.
   Fig 9.1  What a lepton anomaly excludes: the dimensional estimate delta a = C m^2 / Lambda^2. */

/* ---------------------------------------------------------------- Fig 7.1 */
(function () {
  const root = Lab.$('#fig-series');
  if (!root) return;
  const svg = Lab.$('.se-chart', root), wrap = svg.parentElement;
  const out = Lab.$('.readouts', root), panel = Lab.$('#se-digits', root), tip = Lab.tip(wrap);
  // universal QED coefficients of (alpha/pi)^n
  const C = [0.5, -0.328478965579193, 1.181241456587200, -1.912245764926445, 5.887];
  const C5U = 0.055;                                        // uncertainty on the fifth-order coefficient
  const MASSDEP = 2.7474e-12, HAD = 1.6927e-12, HADU = 0.0120e-12, WEAK = 0.03053e-12;
  const AEXP = 1.15965218059e-3, AEXPU = 1.3e-13;
  const ALPHAS = {
    rb: { ainv: 137.035999206, u: 0.000000011, label: 'rubidium' },
    cs: { ainv: 137.035999046, u: 0.000000027, label: 'caesium' },
  };
  const st = { n: 5, a: 'rb', extra: true };
  let ready = false;

  const sup = QD.sup;
  const calc = (n, extra, ainv) => {
    const x = 1 / ainv / Math.PI; let s = 0;
    for (let i = 0; i < n && i < C.length; i++) s += C[i] * Math.pow(x, i + 1);
    return s + (extra ? MASSDEP + HAD + WEAK : 0);
  };
  const theoryU = (ainv, u, extra) => {
    const x = 1 / ainv / Math.PI;
    const fromAlpha = AEXP * (u / ainv);                     // a_e is proportional to alpha at leading order
    const fromC5 = C5U * Math.pow(x, 5);
    return Math.sqrt(fromAlpha * fromAlpha + fromC5 * fromC5 + (extra ? HADU * HADU : 0));
  };
  const group = (s) => { const p = s.split('.'); return p[0] + '.' + (p[1].match(/.{1,3}/g) || []).join(' '); };

  function digits() {
    const A = ALPHAS[st.a];
    const meas = group((1 + AEXP).toFixed(14));
    const pred = group((1 + calc(st.n, st.extra, A.ainv)).toFixed(14));
    const mark = (txt) => {
      let html = '', diverged = false;
      for (let i = 0; i < txt.length; i++) {
        const ch = txt[i];
        if (ch !== meas[i]) diverged = true;
        html += ch === ' ' ? ' ' : `<span class="${diverged ? 'no' : 'ok'}">${ch}</span>`;
      }
      return html;
    };
    // count the decimal digits that agree; the leading 1 is not in question
    let agree = 0;
    for (let i = meas.indexOf('.') + 1; i < pred.length && pred[i] === meas[i]; i++) if (pred[i] !== ' ') agree++;
    panel.innerHTML = [
      `<div><span class="lbl">g/2 calculated </span>${mark(pred)}</div>`,
      `<div><span class="lbl">g/2 measured   </span>${meas}  <span class="lbl">(13)</span></div>`,
      `<div><span class="lbl">digits agreeing</span> <span class="ok">${agree}</span></div>`,
      `<div><span class="lbl">α from         </span>${A.label} recoil, α⁻¹ = ${A.ainv.toFixed(9)}</div>`,
    ].join('');
  }

  function drawChart() {
    const A = ALPHAS[st.a];
    const f = QD.frame(svg, {
      h: 290, m: { l: 62, r: 16, t: 26, b: 44 }, x: [-0.5, 5.6], y: [1e-15, 3e-3], ylog: true,
      xt: [0, 1, 2, 3, 4, 5], yt: [1e-14, 1e-12, 1e-10, 1e-8, 1e-6, 1e-4],
      xf: (v) => (v === 0 ? 'Dirac' : v + ' loop' + (v > 1 ? 's' : '')), yf: (v) => QD.sci(v),
      xl: 'orders of α included', yl: '| calculated − measured |',
    });
    const { X, Y, g, pal } = f;
    // the two floors: the experiment, and the fine-structure constant
    const tu = theoryU(A.ainv, A.u, st.extra);
    [[AEXPU, 'trap, ' + QD.sci(AEXPU), pal.s3, -5], [tu, 'α, ' + QD.sci(tu), pal.s2, 12]].forEach(([v, lab, col, dy]) => {
      Lab.svg('rect', { x: f.m.l, y: Y(v), width: f.W - f.m.l - f.m.r, height: f.H - f.m.b - Y(v), fill: col, opacity: 0.1 }, g);
      Lab.svg('line', { x1: f.m.l, x2: f.W - f.m.r, y1: Y(v), y2: Y(v), stroke: col, 'stroke-dasharray': '4 3' }, g);
      QD.text(g, f.m.l + 4, Y(v) + dy, lab, col, 'start', 10);
    });
    // the staircase of partial sums
    const pts = [];
    for (let n = 0; n <= 5; n++) pts.push([n, Math.max(1.1e-15, Math.abs(calc(n, st.extra, A.ainv) - AEXP))]);
    Lab.svg('path', { d: QD.path(pts, X, Y), fill: 'none', stroke: pal.accent, 'stroke-width': 2 }, g);
    pts.forEach((p, i) => {
      const on = i <= st.n;
      Lab.svg('circle', { cx: X(p[0]), cy: Y(p[1]), r: i === st.n ? 5.5 : 4, fill: on ? pal.accent : pal.paper3, stroke: pal.accent, 'stroke-width': 1.6 }, g);
      if (i === st.n) QD.text(g, Math.min(X(p[0]), f.W - f.m.r - 30), Y(p[1]) - 12, QD.sci(p[1]), pal.accent, 'middle', 10);
    });
    QD.hover(svg, f, -0.5, 5.6, (x, sx, sy, px, py) => {
      const n = Math.max(0, Math.min(5, Math.round(x)));
      const d = Math.abs(calc(n, st.extra, A.ainv) - AEXP);
      tip.show(px, py - 8, `<b>${n === 0 ? 'Dirac' : n + ' loop' + (n > 1 ? 's' : '')}</b><br>gap ${QD.sci(d)}<br>relative ${QD.sci(d / AEXP)}`);
    }, () => tip.hide());
  }

  function readouts() {
    const A = ALPHAS[st.a];
    const a = calc(st.n, st.extra, A.ainv), d = AEXP - a;
    const tu = theoryU(A.ainv, A.u, st.extra);
    const sig = d / Math.sqrt(AEXPU * AEXPU + tu * tu);
    out.innerHTML = [
      ['a<sub>e</sub> calculated × 10¹²', (a * 1e12).toFixed(3)],
      ['a<sub>e</sub> measured × 10¹²', (AEXP * 1e12).toFixed(3) + ' ± 0.130'],
      ['difference × 10¹²', (d * 1e12).toFixed(3)],
      ['theory uncertainty × 10¹²', tu.toFixed !== undefined ? (tu * 1e12).toFixed(3) : '', ''],
      ['discrepancy', (sig >= 0 ? '+' : '') + sig.toFixed(1) + 'σ'],
      ['largest term left out', st.n >= 5 ? '—' : QD.sci(Math.abs(C[st.n] * Math.pow(1 / A.ainv / Math.PI, st.n + 1)))],
    ].filter((x) => x[1] !== '').map(([k, v]) => `<span>${k} <b>${v}</b></span>`).join('');
  }

  function all() { if (!ready) return; digits(); drawChart(); readouts(); }
  Lab.slider(Lab.$('#se-n', root), (v) => (v === 0 ? 'none' : v + ' of 5'), (v) => { st.n = v; all(); });
  Lab.$('#se-alpha', root).addEventListener('change', (e) => { st.a = e.target.value; all(); });
  Lab.$('#se-extra', root).addEventListener('change', (e) => { st.extra = e.target.checked; all(); });
  ready = true; all();
  Lab.onTheme(all); Lab.onResize(svg, drawChart);
})();

/* ---------------------------------------------------------------- Fig 9.1 */
(function () {
  const root = Lab.$('#fig-reach');
  if (!root) return;
  const cv = Lab.$('.re-cv', root), svg = Lab.$('.re-chart', root), wrap = svg.parentElement;
  const out = Lab.$('.readouts', root), tip = Lab.tip(wrap);
  const M = { e: 0.51099895e-3, mu: 0.1056583755, tau: 1.77686 };    // GeV
  const TAU_SENS = 3e-2;                                              // the tau anomaly is only bounded at the percent level
  const st = { C: 1, de: 2.3e-13, dm: 6.3e-10 };
  let ready = false;

  const reach = (m, d) => m / Math.sqrt(d / st.C);
  const gev = (v) => (v >= 1e3 ? (v / 1e3).toPrecision(3) + ' TeV' : v.toPrecision(3) + ' GeV');

  function drawChart() {
    const L0 = 1, L1 = 1e5;
    const f = QD.frame(svg, {
      h: 290, m: { l: 58, r: 54, t: 26, b: 44 }, x: [L0, L1], y: [1e-14, 1e-1], xlog: true, ylog: true,
      xt: [1, 10, 1e2, 1e3, 1e4, 1e5], yt: [1e-14, 1e-12, 1e-10, 1e-8, 1e-6, 1e-4, 1e-2],
      xf: (v) => (v >= 1e3 ? v / 1e3 + ' TeV' : v + ' GeV'), yf: (v) => QD.sci(v),
      xl: 'mass of the new particle Λ', yl: 'contribution to the lepton anomaly',
    });
    const { X, Y, g, pal } = f;
    const SETS = [
      ['electron', M.e, st.de, pal.s1],
      ['muon', M.mu, st.dm, pal.s2],
      ['tau', M.tau, TAU_SENS, pal.s3],
    ];
    SETS.forEach(([nm, m, d, col]) => {
      const pts = [];
      for (let i = 0; i <= 100; i++) { const L = L0 * Math.pow(L1 / L0, i / 100); pts.push([L, st.C * (m * m) / (L * L)]); }
      Lab.svg('path', { d: QD.path(pts.filter((p) => p[1] <= 0.1 && p[1] >= 1e-14), X, Y), fill: 'none', stroke: col, 'stroke-width': 2 }, g);
      Lab.svg('line', { x1: f.m.l, x2: f.W - f.m.r, y1: Y(d), y2: Y(d), stroke: col, 'stroke-dasharray': '4 3', opacity: 0.8 }, g);
      QD.text(g, f.W - f.m.r + 3, Y(d) + 4, nm, col, 'start', 10);
      const L = reach(m, d);
      if (L >= L0 && L <= L1) {
        Lab.svg('circle', { cx: X(L), cy: Y(d), r: 4.5, fill: col, stroke: pal.paper3, 'stroke-width': 1.6 }, g);
        QD.text(g, X(L), Y(d) - 9, gev(L), col, 'middle', 10);
      }
    });
    QD.hover(svg, f, L0, L1, (L, sx, sy, px, py) => {
      const l = Math.max(L0, Math.min(L1, L));
      tip.show(px, py - 8, `<b>Λ = ${gev(l)}</b><br>electron ${QD.sci(st.C * M.e * M.e / (l * l))}<br>muon ${QD.sci(st.C * M.mu * M.mu / (l * l))}<br>tau ${QD.sci(st.C * M.tau * M.tau / (l * l))}`);
    }, () => tip.hide(), true);
  }

  function drawCanvas() {
    if (!cv.clientWidth) return;
    const { ctx, w, h } = Lab.canvas(cv, cv.clientWidth < 520 ? 0.8 : 0.62), pal = Lab.palette();
    ctx.clearRect(0, 0, w, h);
    const rows = [
      ['electron g/2', reach(M.e, st.de), Lab.rgb('--s1')],
      ['muon g−2', reach(M.mu, st.dm), Lab.rgb('--s2')],
      ['tau g−2', reach(M.tau, TAU_SENS), Lab.rgb('--s3')],
    ];
    const refs = [['LEP, 209 GeV', 209], ['LHC, 13.6 TeV', 13600]];
    const L0 = 1, L1 = 1e5, m = { l: 92, r: 58, t: 26, b: 34 };
    const X = Lab.logScale(L0, L1, m.l, w - m.r);
    ctx.font = `10px ${Lab.css('--f-mono')}`;
    [1, 10, 1e2, 1e3, 1e4, 1e5].forEach((v) => {
      ctx.strokeStyle = pal.grid; ctx.beginPath(); ctx.moveTo(X(v), m.t - 6); ctx.lineTo(X(v), h - m.b); ctx.stroke();
      ctx.fillStyle = pal.ink3; ctx.textAlign = 'center';
      ctx.fillText(v >= 1e3 ? v / 1e3 + ' TeV' : v + ' GeV', X(v), h - m.b + 14); ctx.textAlign = 'left';
    });
    refs.forEach(([lab, v], i) => {
      ctx.strokeStyle = pal.ink3; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(X(v), m.t - 6); ctx.lineTo(X(v), h - m.b); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = pal.ink3; ctx.textAlign = 'center';
      ctx.fillText(lab, X(v), m.t - 10 + i * 0); ctx.textAlign = 'left';
    });
    const bh = (h - m.t - m.b) / rows.length;
    rows.forEach(([lab, L, col], i) => {
      const y = m.t + i * bh + bh * 0.22, hh = bh * 0.46;
      ctx.fillStyle = Lab.rgbStr(col, 0.75);
      const x1 = X(Math.max(L0, Math.min(L1, L)));
      ctx.fillRect(m.l, y, Math.max(1, x1 - m.l), hh);
      ctx.fillStyle = pal.ink2; ctx.font = `11px ${Lab.css('--f-mono')}`; ctx.textAlign = 'right';
      ctx.fillText(lab, m.l - 6, y + hh * 0.75); ctx.textAlign = 'left';
      ctx.fillStyle = Lab.rgbStr(col, 1); ctx.fillText(gev(L), x1 + 5, y + hh * 0.75);
    });
    ctx.fillStyle = pal.ink3; ctx.font = `10px ${Lab.css('--f-mono')}`;
    ctx.fillText('mass scale excluded, for C = ' + (st.C >= 0.01 ? st.C.toPrecision(2) : QD.sci(st.C)), m.l, h - 4);
  }

  function readouts() {
    out.innerHTML = [
      ['electron reach', gev(reach(M.e, st.de))],
      ['muon reach', gev(reach(M.mu, st.dm))],
      ['tau reach', gev(reach(M.tau, TAU_SENS))],
      ['muon advantage from mass alone', '×' + Math.round((M.mu / M.e) * (M.mu / M.e)).toLocaleString('en-US')],
      ['electron sensitivity', QD.sci(st.de)],
      ['muon sensitivity', QD.sci(st.dm)],
    ].map(([k, v]) => `<span>${k} <b>${v}</b></span>`).join('');
  }

  function all() { if (!ready) return; drawChart(); drawCanvas(); readouts(); }
  Lab.slider(Lab.$('#re-c', root), (v) => (Math.pow(10, v) >= 0.01 ? Math.pow(10, v).toPrecision(2) : QD.sci(Math.pow(10, v))), (v) => { st.C = Math.pow(10, v); all(); });
  Lab.slider(Lab.$('#re-e', root), (v) => QD.sci(Math.pow(10, v)), (v) => { st.de = Math.pow(10, v); all(); });
  Lab.slider(Lab.$('#re-m', root), (v) => QD.sci(Math.pow(10, v)), (v) => { st.dm = Math.pow(10, v); all(); });
  ready = true; all();
  Lab.onTheme(all); Lab.onResize(cv, all); Lab.onResize(svg, drawChart);
})();
