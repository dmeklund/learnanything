/* Volume XI figures: primary and secondary responses, and herd immunity in an SIR epidemic. */
(function () {
  const T = (g, x, y, s, fill, anchor, size) => IM.text(g, x, y, s, fill, anchor, size);

  /* ---------- Fig 7.1 Primary and secondary responses ---------- */
  (function () {
    const root = Lab.$('#fig-memory');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    const st = { boost: 60 };
    let ready = false;
    // Responding B cells start from a small naive clone (primary) or a larger memory pool (secondary), expand
    // after a lag, then contract; antibody is made in proportion to them and decays with a half-life of about three weeks.
    const response = (t0, X0, lag, grow) => (t) => { const s = t - t0 - lag; if (s < 0) return 0; return s < grow ? X0 * Math.exp(1.2 * s) : X0 * Math.exp(1.2 * grow) * Math.exp(-0.25 * (s - grow)); };
    function series() {
      const prim = response(0, 1, 4, 7), sec = response(st.boost, 60, 2, 6.5), dec = Math.log(2) / 21;
      let A = 0; const pts = [];
      for (let t = 0; t <= 200; t += 0.25) { A += 0.25 * (0.02 * (prim(t) + sec(t)) - dec * A); pts.push([t, Math.max(1e-2, A)]); }
      return pts;
    }
    function draw() {
      if (!ready) return;
      const pts = series();
      const f = IM.frame(svg, { h: 300, m: { l: 50, r: 16, t: 30, b: 42 }, x: [0, 200], y: [0.1, 1e6], ylog: true, xt: [0, 30, 60, 90, 120, 150, 180], yt: [0.1, 10, 1e3, 1e5], yf: (v) => (v < 1 ? v : IM.sci(v)), xl: 'days after the first exposure', yl: 'Antibody level (arbitrary units, log scale)' });
      Lab.svg('line', { x1: f.X(st.boost), x2: f.X(st.boost), y1: f.m.t, y2: f.H - f.m.b, stroke: f.pal.ink3, 'stroke-dasharray': '3 3' }, f.g);
      T(f.g, f.X(st.boost) + 4, f.m.t + 12, 'second exposure', f.pal.ink3, 'start', 10.5);
      T(f.g, f.X(1) + 4, f.m.t + 12, 'first exposure', f.pal.ink3, 'start', 10.5);
      Lab.svg('path', { d: IM.path(pts.filter((p) => p[1] >= 0.1), f.X, f.Y), fill: 'none', stroke: f.pal.s1, 'stroke-width': 2.2 }, f.g);
      const pk1 = pts.filter((p) => p[0] < st.boost).reduce((a, b) => (b[1] > a[1] ? b : a)), pk2 = pts.filter((p) => p[0] >= st.boost).reduce((a, b) => (b[1] > a[1] ? b : a));
      [pk1, pk2].forEach((p, i) => { Lab.svg('circle', { cx: f.X(p[0]), cy: f.Y(p[1]), r: 5, fill: f.pal.s2, stroke: f.pal.paper, 'stroke-width': 2 }, f.g); T(f.g, f.X(p[0]) + 8, f.Y(p[1]) - 6, i ? 'secondary peak' : 'primary peak', f.pal.ink2, 'start', 10.5); });
      IM.hover(svg, f, 0, 200, (t, sx, sy, px) => { const p = pts.reduce((a, b) => (Math.abs(b[0] - t) < Math.abs(a[0] - t) ? b : a)); tip.show(px, (f.Y(p[1]) / f.H) * (sy * f.H) - 8, `<b>day ${p[0].toFixed(0)}</b><br>antibody ${p[1] < 1 ? p[1].toFixed(2) : IM.sci(p[1])}`, f.Y(p[1]) * sy + 12); }, () => tip.hide());
      out.innerHTML = `<span>primary peak on day <b>${pk1[0].toFixed(0)}</b></span><span>secondary peak <b>${(pk2[0] - st.boost).toFixed(0)} days</b> after re-exposure</span><span>secondary peak is <b>${(pk2[1] / pk1[1]).toFixed(0)}×</b> higher</span>`;
    }
    Lab.slider(Lab.$('#mm-b', root), (v) => 'day ' + v, (v) => { st.boost = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();

  /* ---------- Fig 7.2 Herd immunity ---------- */
  (function () {
    const root = Lab.$('#fig-herd');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    const st = { r0: 3, cov: 0.5, ve: 0.9 };
    let ready = false;
    const GAMMA = 1 / 7; // a week infectious
    function sim(cov) {
      const imm = cov * st.ve, beta = st.r0 * GAMMA;
      return IM.rk4((t, [S, I, R]) => [-beta * S * I, beta * S * I - GAMMA * I, GAMMA * I], [1 - imm - 1e-4, 1e-4, imm], 0, 365, 3650, 10);
    }
    function draw() {
      if (!ready) return;
      const o = sim(st.cov), base = sim(0);
      const f = IM.frame(svg, { h: 300, m: { l: 46, r: 16, t: 30, b: 42 }, x: [0, 365], y: [0, 0.35], xt: [0, 60, 120, 180, 240, 300, 360], yt: [0, 0.1, 0.2, 0.3], yf: (v) => Math.round(v * 100) + '%', xl: 'days', yl: 'Share of the population infectious at once' });
      Lab.svg('path', { d: IM.path(base.map((p) => [p[0], Math.min(0.35, p[2])]), f.X, f.Y), fill: 'none', stroke: f.pal.ink3, 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }, f.g);
      Lab.svg('path', { d: IM.path(o.map((p) => [p[0], Math.min(0.35, p[2])]), f.X, f.Y), fill: 'none', stroke: f.pal.s2, 'stroke-width': 2.2 }, f.g);
      const pkb = base.reduce((a, b) => (b[2] > a[2] ? b : a));
      T(f.g, f.X(pkb[0]) + 8, f.Y(Math.min(0.34, pkb[2])) + 4, 'no vaccination', f.pal.ink3, 'start', 10.5);
      const pk = o.reduce((a, b) => (b[2] > a[2] ? b : a));
      if (pk[2] > 0.002) T(f.g, f.X(pk[0]) + 8, f.Y(pk[2]) - 8, `${Math.round(st.cov * 100)}% vaccinated`, f.pal.ink2, 'start', 10.5);
      IM.hover(svg, f, 0, 365, (t, sx, sy, px) => { const p = o.reduce((a, b) => (Math.abs(b[0] - t) < Math.abs(a[0] - t) ? b : a)); tip.show(px, f.m.t * sy + 40, `<b>day ${p[0].toFixed(0)}</b><br>infectious ${(p[2] * 100).toFixed(2)}%<br>ever infected ${((p[3] - st.cov * st.ve) * 100).toFixed(1)}%`, f.m.t * sy + 60); }, () => tip.hide());
      const pc = (1 - 1 / st.r0) / st.ve, final = o[o.length - 1][3] - st.cov * st.ve, finalB = base[base.length - 1][3];
      out.innerHTML = `<span>herd immunity threshold (1 − 1/R₀)/efficacy <b>${pc > 1 ? 'unreachable' : Math.round(pc * 100) + '%'}</b></span><span>share ever infected <b class="${final > 0.05 ? 'warn' : ''}">${(final * 100).toFixed(1)}%</b> (vs ${(finalB * 100).toFixed(0)}% with no vaccine)</span>`;
    }
    Lab.slider(Lab.$('#hd-r', root), (v) => v.toFixed(1), (v) => { st.r0 = v; draw(); });
    Lab.slider(Lab.$('#hd-c', root), (v) => Math.round(v * 100) + '%', (v) => { st.cov = v; draw(); });
    Lab.slider(Lab.$('#hd-e', root), (v) => Math.round(v * 100) + '%', (v) => { st.ve = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();
})();
