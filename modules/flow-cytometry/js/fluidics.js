/* Volume XII figures: hydrodynamic focusing, and pulse shape with doublet discrimination. */
(function () {
  const T = (g, x, y, s, fill, anchor, size) => FC.text(g, x, y, s, fill, anchor, size);

  /* ---------- Fig 1.1 Hydrodynamic focusing ---------- */
  (function () {
    const root = Lab.$('#fig-focus');
    if (!root) return;
    const svgA = Lab.$('.focus-full', root), svgB = Lab.$('.focus-zoom', root), out = Lab.$('.readouts', root);
    const tipA = Lab.tip(svgA.parentElement), tipB = Lab.tip(svgB.parentElement);
    const R = 125, QTOT = 10000, W1 = 30, TAU = 10e-6; // channel radius (µm), total flow (µL/min), beam 1/e² half-width across the stream (µm), coincidence window (s)
    const st = { q: 35, conc: 3 };
    let ready = false;
    // In Poiseuille flow the share of the volume flow inside radius r is 2(r/R)² − (r/R)⁴; the sample fills the
    // central core carrying share q of the flow, so its radius solves that equation: (r/R)² = 1 − √(1 − q).
    const coreR = (q) => R * Math.sqrt(1 - Math.sqrt(1 - q));
    // intensity CV from cells spread across the core in a Gaussian beam: sample positions uniformly over the core disk
    const pos = (() => { const r = Lab.rng(3), p = []; while (p.length < 3000) { const x = 2 * r() - 1, y = 2 * r() - 1; if (x * x + y * y <= 1) p.push([x, y]); } return p; })();
    function stats() {
      const rc = coreR(st.q / QTOT), I = pos.map(([x]) => Math.exp((-2 * (x * rc) ** 2) / (W1 * W1)));
      const m = I.reduce((a, b) => a + b, 0) / I.length, sd = Math.sqrt(I.reduce((a, b) => a + (b - m) ** 2, 0) / I.length);
      const rate = Math.pow(10, st.conc) * st.q / 60; // cells/µL × µL/min → cells per second
      return { rc, cv: sd / m, rate, coinc: 1 - Math.exp(-2 * rate * TAU) };
    }
    function draw() {
      if (!ready) return;
      const s = stats(), vrel = (x) => Math.max(0, 1 - (x / R) ** 2);
      // full channel: the parabolic velocity profile, with the sample core shaded
      const a = FC.frame(svgA, { h: 200, m: { l: 46, r: 16, t: 30, b: 40 }, x: [-R, R], y: [0, 1.05], xt: [-125, -60, 0, 60, 125], yt: [0, 0.5, 1], yf: (v) => Math.round(v * 100) + '%', xf: (v) => v + ' µm', yl: 'Flow speed across the whole channel (share of the center speed)' });
      Lab.svg('rect', { x: a.X(-s.rc), y: a.m.t, width: Math.max(1.5, a.X(s.rc) - a.X(-s.rc)), height: a.H - a.m.t - a.m.b, fill: a.pal.s2, 'fill-opacity': 0.75 }, a.g);
      const pts = []; for (let x = -R; x <= R; x += 2) pts.push([x, vrel(x)]);
      Lab.svg('path', { d: FC.path(pts, a.X, a.Y), fill: 'none', stroke: a.pal.s1, 'stroke-width': 2 }, a.g);
      T(a.g, a.X(s.rc) + 6, a.Y(0.2), `sample core, ${(2 * s.rc).toFixed(1)} µm wide`, a.pal.ink2, 'start', 10.5);
      T(a.g, a.X(-R) + 4, a.Y(0.12), 'wall', a.pal.ink3, 'start', 10.5); T(a.g, a.X(R) - 4, a.Y(0.12), 'wall', a.pal.ink3, 'end', 10.5);
      FC.hover(svgA, a, -R, R, (x, sx, sy, px) => tipA.show(px, a.Y(vrel(x)) * sy - 8, `<b>${x.toFixed(0)} µm from center</b><br>speed ${(vrel(x) * 100).toFixed(1)}% of center${Math.abs(x) <= s.rc ? '<br>inside the sample core' : ''}`, a.Y(vrel(x)) * sy + 12), () => tipA.hide());
      // zoom on the center: the core, the laser's intensity profile, and where cells sit
      const Z = 40, b = FC.frame(svgB, { h: 220, m: { l: 46, r: 16, t: 30, b: 42 }, x: [-Z, Z], y: [0, 1.05], xt: [-40, -20, 0, 20, 40], yt: [0, 0.5, 1], yf: (v) => Math.round(v * 100) + '%', xf: (v) => v + ' µm', xl: 'distance across the stream', yl: 'Zoom on the center: laser intensity across the stream' });
      Lab.svg('rect', { x: b.X(-s.rc), y: b.m.t, width: Math.max(1.5, b.X(s.rc) - b.X(-s.rc)), height: b.H - b.m.t - b.m.b, fill: b.pal.s2, 'fill-opacity': 0.18 }, b.g);
      const beam = (x) => Math.exp((-2 * x * x) / (W1 * W1));
      const bp = []; for (let x = -Z; x <= Z; x += 0.5) bp.push([x, beam(x)]);
      Lab.svg('path', { d: FC.path(bp, b.X, b.Y), fill: 'none', stroke: b.pal.s1, 'stroke-width': 2 }, b.g);
      const cr = Lab.rng(8); for (let i = 0; i < 70; i++) { const x = (2 * cr() - 1) * s.rc; Lab.svg('circle', { cx: b.X(x), cy: b.Y(beam(x)), r: 3, fill: b.pal.s2, stroke: b.pal.paper, 'stroke-width': 1 }, b.g); }
      T(b.g, b.X(-Z) + 4, b.Y(0.5), `beam 1/e² half-width ${W1} µm`, b.pal.ink2, 'start', 10.5);
      FC.hover(svgB, b, -Z, Z, (x, sx, sy, px) => tipB.show(px, b.Y(beam(x)) * sy - 8, `<b>${x.toFixed(1)} µm</b><br>laser intensity ${(beam(x) * 100).toFixed(1)}%`, b.Y(beam(x)) * sy + 12), () => tipB.hide());
      out.innerHTML = `<span>core diameter <b>${(2 * s.rc).toFixed(1)} µm</b></span><span>signal spread from position alone (CV) <b class="${s.cv > 0.03 ? 'warn' : ''}">${(s.cv * 100).toFixed(2)}%</b></span><span>event rate <b>${FC.num(s.rate)}/s</b></span><span>two cells in the beam at once <b class="${s.coinc > 0.05 ? 'warn' : ''}">${(s.coinc * 100).toFixed(1)}%</b> of events</span>`;
    }
    Lab.slider(Lab.$('#fo-q', root), (v) => v + ' µL/min', (v) => { st.q = v; draw(); });
    Lab.slider(Lab.$('#fo-c', root), (v) => FC.num(Math.pow(10, v)) + ' per µL', (v) => { st.conc = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svgA, draw);
  })();

  /* ---------- Fig 1.2 Pulse shape and doublets ---------- */
  (function () {
    const root = Lab.$('#fig-pulse');
    if (!root) return;
    const svgP = Lab.$('.pulse-trace', root), svgD = Lab.$('.pulse-dots', root), cv = Lab.$('.pulse-dots-cv', root), out = Lab.$('.readouts', root);
    const tipP = Lab.tip(svgP.parentElement), tipD = Lab.tip(svgD.parentElement);
    const st = { beam: 8 };
    const D = 10; // cell diameter, µm
    let ready = false;
    // events: 85% single cells and 15% pairs stuck together; each has a size jitter and, for pairs, a random tilt to the flow
    const ev = (() => { const r = Lab.rng(21), e = []; for (let i = 0; i < 1600; i++) { const dbl = r() < 0.15; e.push({ dbl, s1: 1 + 0.07 * Lab.gauss(r), s2: 1 + 0.07 * Lab.gauss(r), cos: Math.abs(Math.cos(r() * Math.PI)), n1: Lab.gauss(r), n2: Lab.gauss(r) }); } return e; })();
    // A cell is modeled as a Gaussian of SD D/4 crossing a beam whose 1/e² half-height along the flow is b, so the
    // pulse is a Gaussian of SD σ = √((b/2)² + (D/4)²). A pair is two such pulses separated by D·cos(tilt).
    const sig = () => Math.sqrt((st.beam / 2) ** 2 + (D / 4) ** 2);
    const pulse = (x, sep, a1, a2) => { const s = sig(); return (a1 * Math.exp(-0.5 * ((x + sep / 2) / s) ** 2) + a2 * Math.exp(-0.5 * ((x - sep / 2) / s) ** 2)) / (s * Math.sqrt(2 * Math.PI)); };
    function measure(e) {
      const sep = e.dbl ? D * e.cos : 0, a1 = e.s1 ** 3, a2 = e.dbl ? e.s2 ** 3 : 0;
      let h = 0; for (let x = -40; x <= 40; x += 0.25) h = Math.max(h, pulse(x, sep, a1, a2));
      // electronic and optical noise of a few percent on each measurement
      return [(a1 + a2) * (1 + 0.04 * e.n1), h * (1 + 0.04 * e.n2)];
    }
    function draw() {
      if (!ready) return;
      const s = sig(), h1 = 1 / (s * Math.sqrt(2 * Math.PI));
      const p = FC.frame(svgP, { h: 280, m: { l: 46, r: 14, t: 30, b: 42 }, x: [-30, 30], y: [0, 2.15 * h1], xt: [-30, -15, 0, 15, 30], yt: [0, h1, 2 * h1], yf: (v) => (v / h1).toFixed(0) + '×', xf: (v) => v + ' µm', xl: 'position of the event relative to the beam', yl: 'Detector signal (single-cell height = 1×)' });
      const tr = (sep, a2) => { const pts = []; for (let x = -30; x <= 30; x += 0.25) pts.push([x, pulse(x, sep, 1, a2)]); return pts; };
      Lab.svg('path', { d: FC.path(tr(0, 0), p.X, p.Y), fill: p.pal.s1, 'fill-opacity': 0.12, stroke: p.pal.s1, 'stroke-width': 2 }, p.g);
      Lab.svg('path', { d: FC.path(tr(D, 1), p.X, p.Y), fill: 'none', stroke: p.pal.s2, 'stroke-width': 2.2 }, p.g);
      const pk = tr(D, 1).reduce((a, b) => (b[1] > a[1] ? b : a));
      T(p.g, p.X(pk[0]) + 8, p.Y(pk[1]) - 6, 'two cells in line', p.pal.ink2, 'start', 10.5);
      T(p.g, p.X(-s * 1.2) - 4, p.Y(h1 * 0.6), 'one cell', p.pal.ink2, 'end', 10.5);
      FC.hover(svgP, p, -30, 30, (x, sx, sy, px) => tipP.show(px, p.m.t * sy + 30, `<b>${x.toFixed(1)} µm</b><br>single ${(pulse(x, 0, 1, 0) / h1).toFixed(2)}×<br>pair ${(pulse(x, D, 1, 1) / h1).toFixed(2)}×`, p.m.t * sy + 50), () => tipP.hide());
      // area versus height for every event
      const m = ev.map((e) => ({ dbl: e.dbl, v: measure(e) }));
      const ratios = m.filter((x) => !x.dbl).map((x) => x.v[0] / x.v[1]).sort((a, b) => a - b), med = ratios[ratios.length >> 1], gateR = med * 1.18;
      const d = FC.frame(svgD, { h: 280, m: { l: 46, r: 14, t: 30, b: 42 }, x: [0, 2.6], y: [0, 3.2], xt: [0, 1, 2], yt: [0, 1, 2, 3], xf: (v) => v + '×', yf: (v) => v + '×', xl: 'pulse height', yl: 'Pulse area (single cell = 1×)' });
      const XH = (v) => d.X(v / h1), YA = (v) => d.Y(v);
      const layer = FC.dots(cv, d.W, d.H);
      layer.plot(m.filter((x) => !x.dbl).map((x) => [x.v[1], x.v[0]]), XH, YA, Lab.rgb('--s1'), 0.55, 2.6);
      layer.plot(m.filter((x) => x.dbl).map((x) => [x.v[1], x.v[0]]).filter((p) => p[0] / h1 < 2.6 && p[1] < 3.2), XH, YA, Lab.rgb('--s2'), 0.8, 2.6);
      // singlet gate: area no more than 18% above what a single cell of that height gives
      Lab.svg('path', { d: `M${d.X(0)} ${d.Y(0)}L${d.X(Math.min(2.6, 3.2 / (gateR * h1)))} ${d.Y(Math.min(3.2, 2.6 * gateR * h1))}`, stroke: d.pal.ink, 'stroke-dasharray': '5 3', 'stroke-width': 1.5, fill: 'none' }, d.g);
      T(d.g, d.X(2.5), d.Y(0.25), 'singlet gate (below the line)', d.pal.ink2, 'end', 10.5);
      const kept = m.filter((x) => !x.dbl && x.v[0] / x.v[1] <= gateR).length / m.filter((x) => !x.dbl).length;
      const leak = m.filter((x) => x.dbl && x.v[0] / x.v[1] <= gateR).length / m.filter((x) => x.dbl).length;
      FC.hover(svgD, d, 0, 2.6, () => {}, () => tipD.hide());
      svgD.lastChild.addEventListener('mousemove', (e) => { const r = svgD.getBoundingClientRect(), px = (e.clientX - r.left) * (d.W / r.width), py = (e.clientY - r.top) * (d.H / r.height); let best = null, bd = 64; m.forEach((x) => { const dd = (XH(x.v[1]) - px) ** 2 + (YA(x.v[0]) - py) ** 2; if (dd < bd) { bd = dd; best = x; } }); if (best) tipD.show(XH(best.v[1]) * r.width / d.W, YA(best.v[0]) * r.height / d.H - 8, `<b>${best.dbl ? 'two cells stuck together' : 'single cell'}</b><br>height ${(best.v[1] / h1).toFixed(2)}×, area ${best.v[0].toFixed(2)}×`, YA(best.v[0]) * r.height / d.H + 12); else tipD.hide(); });
      out.innerHTML = `<span>pulse width (FWHM) <b>${(2.355 * s).toFixed(1)} µm</b> of travel</span><span>single cells kept <b>${(kept * 100).toFixed(0)}%</b></span><span>pairs that slip through the gate <b class="${leak > 0.2 ? 'warn' : ''}">${(leak * 100).toFixed(0)}%</b></span>`;
    }
    Lab.slider(Lab.$('#pu-b', root), (v) => v + ' µm', (v) => { st.beam = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svgP, draw); Lab.onResize(svgD, draw);
  })();
})();
