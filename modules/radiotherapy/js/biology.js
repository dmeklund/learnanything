/* Volume VI, radiobiology figures: fractionation in the linear-quadratic model, and the therapeutic window. */
(function () {
  /* ---------- Fig 5.1 Fractionation and the linear-quadratic model ---------- */
  (function () {
    const root = Lab.$('#fig-lq');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    // Late-responding tissue: alpha/beta = 3 Gy. Tumor alpha/beta is adjustable. Alpha values are illustrative.
    const LATE = { a: 0.1, ab: 3 }, st = { d: 2, abT: 10 };
    const REF = { n: 30, d: 2 }; // the reference course: 60 Gy in 2 Gy fractions
    let ready = false;
    const aT = 0.3;
    const killPer = (a, ab, d) => a * d + (a / ab) * d * d; // -ln S for one fraction
    function draw() {
      if (!ready) return;
      // total dose that gives late tissue the same effect as the reference course
      const bedLateRef = REF.n * REF.d * (1 + REF.d / LATE.ab);
      const total = bedLateRef / (1 + st.d / LATE.ab), n = total / st.d;
      const bedT = total * (1 + st.d / st.abT), eqdT = bedT / (1 + 2 / st.abT);
      const refKillT = REF.n * killPer(aT, st.abT, REF.d), killT = n * killPer(aT, st.abT, st.d);
      const f = RT.frame(svg, { h: 340, m: { l: 52, r: 16, t: 30, b: 42 }, x: [0, 80], y: [1e-24, 1], ylog: true, xt: [0, 10, 20, 30, 40, 50, 60, 70, 80], yt: [1, 1e-6, 1e-12, 1e-18, 1e-24], yf: (v) => (v === 1 ? '1' : '10' + String(Math.round(Math.log10(v))).replace(/[0-9-]/g, (c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'['0123456789'.indexOf(c)] || '⁻')), xl: 'cumulative dose (Gy)', yl: 'Fraction of cells surviving' });
      const Yc = (v) => f.Y(Math.max(1e-24, v));
      // staircase: within each fraction the LQ shoulder, complete repair between fractions
      const stair = (a, ab) => {
        const pts = []; let lnS = 0, D = 0; const full = Math.floor(n), rem = n - full;
        for (let k = 0; k < full + (rem > 1e-6 ? 1 : 0); k++) {
          const dk = k < full ? st.d : rem * st.d;
          for (let i = 0; i <= 16; i++) { const x = (dk * i) / 16; pts.push([D + x, Math.exp(lnS - killPer(a, ab, x))]); }
          lnS -= killPer(a, ab, dk); D += dk;
        }
        return pts;
      };
      // reference end level for the tumor (60 Gy in 2 Gy fractions)
      Lab.svg('line', { x1: f.m.l, x2: f.W - f.m.r, y1: Yc(Math.exp(-refKillT)), y2: Yc(Math.exp(-refKillT)), stroke: f.pal.s1, 'stroke-dasharray': '5 4', 'stroke-opacity': 0.7 }, f.g);
      const tR = Lab.svg('text', { x: f.m.l + 6, y: Yc(Math.exp(-refKillT)) + 14, 'text-anchor': 'start', 'font-size': 10.5, fill: f.pal.ink3 }, f.g); tR.textContent = 'tumor, 60 Gy in 2 Gy fractions';
      const sT = stair(aT, st.abT), sL = stair(LATE.a, LATE.ab);
      Lab.svg('path', { d: RT.path(sL, f.X, Yc), fill: 'none', stroke: f.pal.s2, 'stroke-width': 2 }, f.g);
      Lab.svg('path', { d: RT.path(sT, f.X, Yc), fill: 'none', stroke: f.pal.s1, 'stroke-width': 2 }, f.g);
      const endT = sT[sT.length - 1], endL = sL[sL.length - 1];
      const lab = (p, s, dy) => { const t = Lab.svg('text', { x: Math.min(f.X(p[0]) + 6, f.W - f.m.r - 150), y: Yc(p[1]) + dy, 'font-size': 11, fill: f.pal.ink2 }, f.g); t.textContent = s; };
      lab(endL, 'late-responding tissue', -6);
      lab(endT, 'tumor', 14);
      const hit = Lab.svg('rect', { x: f.m.l, y: f.m.t, width: f.W - f.m.l - f.m.r, height: f.H - f.m.t - f.m.b, fill: 'transparent' }, svg);
      hit.addEventListener('mousemove', (e) => {
        const r = svg.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * f.W;
        const D = ((x - f.m.l) / (f.W - f.m.l - f.m.r)) * 80;
        const near = (pts) => pts.reduce((a, b) => (Math.abs(b[0] - D) < Math.abs(a[0] - D) ? b : a));
        const t = near(sT), l = near(sL);
        tip.show(e.clientX - r.left, (Yc(l[1]) / f.H) * r.height - 8, `<b>${D.toFixed(1)} Gy</b><br>tumor surviving ${Lab.fmt.sci(Math.max(1e-30, t[1]))}<br>late tissue ${Lab.fmt.sci(Math.max(1e-30, l[1]))}`, (Yc(l[1]) / f.H) * r.height + 12);
      });
      hit.addEventListener('mouseleave', () => tip.hide());
      const diff = (killT - refKillT) / Math.LN10;
      out.innerHTML = `<span>course for equal late effects <b>${n.toFixed(1)} × ${st.d} Gy = ${total.toFixed(1)} Gy</b></span><span>tumor EQD₂ <b>${eqdT.toFixed(1)} Gy</b></span><span>tumor cell kill vs. 2 Gy fractions <b class="${diff < 0 ? 'warn' : ''}">${diff >= 0 ? '+' : '−'}${Math.abs(diff).toFixed(1)} logs</b></span>`;
    }
    Lab.slider(Lab.$('#lq-d', root), (v) => v + ' Gy', (v) => { st.d = v; draw(); });
    Lab.slider(Lab.$('#lq-ab', root), (v) => v + ' Gy', (v) => { st.abT = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();

  /* ---------- Fig 6.1 Tumor control and complication probability ---------- */
  (function () {
    const root = Lab.$('#fig-tcp');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    const st = { D: 70, logN: 8, f: 0.85 };
    let ready = false;
    // TCP: Poisson statistics of surviving clonogens, with alpha varying between patients (normal, mean 0.25, sd 0.05 per Gy),
    // 2 Gy fractions with alpha/beta = 10 Gy. NTCP: Lyman model with Burman et al. (1991) rectum parameters
    // (TD50 = 80 Gy, m = 0.15) applied to an organ dose of f times the prescription.
    const ALPHA = { m: 0.25, s: 0.05 }, AB = 10, NT = { td50: 80, m: 0.15 };
    const gw = []; for (let k = -30; k <= 30; k++) { const z = k / 10; gw.push([z, Math.exp(-0.5 * z * z)]); }
    const gsum = gw.reduce((s, [, w]) => s + w, 0);
    const tcp = (D) => {
      const N = Math.pow(10, st.logN); let s = 0;
      gw.forEach(([z, w]) => { const a = Math.max(0, ALPHA.m + ALPHA.s * z); s += w * Math.exp(-N * Math.exp(-a * (1 + 2 / AB) * D)); });
      return s / gsum;
    };
    const ntcp = (D) => RT.phi((st.f * D - NT.td50) / (NT.m * NT.td50));
    function draw() {
      if (!ready) return;
      const f = RT.frame(svg, { h: 320, m: { l: 44, r: 16, t: 30, b: 42 }, x: [30, 120], y: [0, 1], xt: [30, 45, 60, 75, 90, 105, 120], yt: [0, 0.25, 0.5, 0.75, 1], yf: (v) => Math.round(v * 100) + '%', xl: 'prescribed dose, 2 Gy fractions (Gy)', yl: 'Probability' });
      const T = [], C = [], U = [];
      for (let D = 30; D <= 120; D += 0.5) { const t = tcp(D), c = ntcp(D); T.push([D, t]); C.push([D, c]); U.push([D, t * (1 - c)]); }
      Lab.svg('path', { d: RT.path(U, f.X, f.Y), fill: 'none', stroke: f.pal.s3, 'stroke-width': 2, 'stroke-dasharray': '6 4' }, f.g);
      Lab.svg('path', { d: RT.path(T, f.X, f.Y), fill: 'none', stroke: f.pal.s1, 'stroke-width': 2 }, f.g);
      Lab.svg('path', { d: RT.path(C, f.X, f.Y), fill: 'none', stroke: f.pal.s2, 'stroke-width': 2 }, f.g);
      // labels at the 50% crossing of each curve
      const half = (pts) => pts.find((p) => p[1] >= 0.5) || pts[pts.length - 1];
      const tl = half(T), cl = half(C);
      const L = (x, y, s, anc) => { const t = Lab.svg('text', { x, y, 'font-size': 11, fill: f.pal.ink2, 'text-anchor': anc }, f.g); t.textContent = s; };
      L(f.X(tl[0]) - 6, f.Y(0.5) - 8, 'tumor control', 'end');
      L(Math.min(f.X(cl[0]) + 6, f.W - f.m.r - 4), f.Y(0.5) + 16, 'complication', f.X(cl[0]) + 90 > f.W - f.m.r ? 'end' : 'start');
      const best = U.reduce((a, b) => (b[1] > a[1] ? b : a));
      L(f.X(best[0]) + 8, f.Y(best[1]) + 20, 'cure without complication', 'start');
      // prescription marker
      Lab.svg('line', { x1: f.X(st.D), x2: f.X(st.D), y1: f.m.t, y2: f.H - f.m.b, stroke: f.pal.ink2 }, f.g);
      const t0 = tcp(st.D), c0 = ntcp(st.D);
      [[t0, f.pal.s1], [c0, f.pal.s2], [t0 * (1 - c0), f.pal.s3]].forEach(([v, col]) => Lab.svg('circle', { cx: f.X(st.D), cy: f.Y(v), r: 5, fill: col, stroke: f.pal.paper, 'stroke-width': 2 }, f.g));
      const hit = Lab.svg('rect', { x: f.m.l, y: f.m.t, width: f.W - f.m.l - f.m.r, height: f.H - f.m.t - f.m.b, fill: 'transparent' }, svg);
      hit.addEventListener('mousemove', (e) => {
        const r = svg.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * f.W;
        const D = 30 + ((x - f.m.l) / (f.W - f.m.l - f.m.r)) * 90, t = tcp(D), c = ntcp(D);
        tip.show(e.clientX - r.left, (f.m.t / f.H) * r.height + 50, `<b>${D.toFixed(0)} Gy</b><br>tumor control ${Math.round(t * 100)}%<br>complication ${Math.round(c * 100)}%<br>cure without complication ${Math.round(t * (1 - c) * 100)}%`, 70);
      });
      hit.addEventListener('mouseleave', () => tip.hide());
      out.innerHTML = `<span>tumor control <b>${Math.round(t0 * 100)}%</b></span><span>complication <b>${Math.round(c0 * 100)}%</b></span><span>cure without complication <b>${Math.round(t0 * (1 - c0) * 100)}%</b></span><span>best dose for this plan <b>${best[0].toFixed(0)} Gy</b></span>`;
    }
    Lab.slider(Lab.$('#tc-d', root), (v) => v + ' Gy', (v) => { st.D = v; draw(); });
    Lab.slider(Lab.$('#tc-n', root), (v) => '10' + ['⁶', '⁷', '⁸', '⁹', '¹⁰'][Math.round(v) - 6], (v) => { st.logN = v; draw(); });
    Lab.slider(Lab.$('#tc-f', root), (v) => v + '%', (v) => { st.f = v / 100; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();
})();
