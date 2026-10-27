/* Chapters 1-2. Fig 1.1: Knudson's two-hit argument, as a Poisson cohort and a pair of age curves.
   Fig 2.1: the RAS switch as a two-state steady state, with measured mutant hydrolysis rates. */

/* ---------------------------------------------------------------- Fig 1.1 */
(function () {
  const root = Lab.$('#fig-knudson');
  if (!root) return;
  const cv = Lab.$('canvas.kn-cv', root), svg = Lab.$('svg.kn-chart', root);
  const out = Lab.$('.readouts', root), wrap = svg.parentElement, tip = Lab.tip(wrap);
  const COHORT = 48;              // the size of Knudson's series
  const T = 5;                    // years of retinal cell division available for a hit
  const OBS = { bilat: 15, unilat: 24 };   // observed median age at diagnosis, months
  let m = 3, N = 2e6, E = 10, ready = false;

  // Poisson variate with mean mu, from a seeded stream
  const pois = (r, mu) => { if (mu <= 0) return 0; const L = Math.exp(-mu); let k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; };

  const cohort = () => {
    const r = Lab.rng(1971);
    return Array.from({ length: COHORT }, () => [pois(r, m / 2), pois(r, m / 2)]);
  };

  // the model: carriers need one more hit, so the fraction of eventual cases still undiagnosed
  // falls exponentially; sporadic cases need two hits in one cell, so it falls as exp(-a t^2).
  const bRate = Math.log(20) / T;            // 95% of carriers diagnosed by age T
  const aRate = Math.log(20) / (T * T);
  const S1 = (t) => Math.exp(-bRate * t);
  const S2 = (t) => Math.exp(-aRate * t * t);
  const med1 = Math.log(2) / bRate;
  const med2 = Math.sqrt(Math.log(2) / aRate);

  function drawEyes() {
    if (!cv.clientWidth) return;
    const narrow = cv.clientWidth < 420;
    const { ctx, w, h } = Lab.canvas(cv, narrow ? 1.0 : 0.72), pal = Lab.palette();
    ctx.clearRect(0, 0, w, h);
    const accent = Lab.rgb('--accent'), signal = Lab.rgb('--signal'), grid = Lab.rgb('--grid'), ink3 = Lab.rgb('--ink-3');
    const data = cohort();
    const cols = narrow ? 6 : 8, rowsN = Math.ceil(COHORT / cols);
    const pad = 14, top = 26;
    const cw = (w - pad * 2) / cols, ch = Math.min((h - top - 34) / rowsN, cw * 0.72);
    const R = Math.min(cw * 0.17, ch * 0.34);
    let none = 0, uni = 0, bi = 0, tum = 0;
    data.forEach(([a, b], i) => {
      const cx = pad + (i % cols) * cw + cw / 2, cy = top + Math.floor(i / cols) * ch + ch / 2;
      const kind = a > 0 && b > 0 ? 2 : a + b > 0 ? 1 : 0;
      if (kind === 2) bi++; else if (kind === 1) uni++; else none++;
      tum += a + b;
      const col = kind === 2 ? signal : kind === 1 ? accent : grid;
      [a, b].forEach((n, side) => {
        const ex = cx + (side ? R * 1.18 : -R * 1.18);
        ctx.strokeStyle = Lab.rgbStr(kind ? col : ink3, kind ? 0.9 : 0.5); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(ex, cy, R, 0, 7); ctx.stroke();
        const rr = Lab.rng(100 + i * 7 + side);
        for (let k = 0; k < Math.min(n, 6); k++) {
          const ang = rr() * 6.28, rad = Math.sqrt(rr()) * R * 0.62;
          ctx.fillStyle = Lab.rgbStr(col, 0.95);
          ctx.beginPath(); ctx.arc(ex + Math.cos(ang) * rad, cy + Math.sin(ang) * rad, Math.max(1.4, R * 0.2), 0, 7); ctx.fill();
        }
      });
    });
    ctx.font = `11px ${Lab.css('--f-mono')}`;
    ctx.fillStyle = pal.ink3;
    ctx.fillText(`${COHORT} CARRIERS, ${tum} TUMOURS`, pad, 14);
    const key = [[grid, `${none} unaffected`], [accent, `${uni} one eye`], [signal, `${bi} both eyes`]];
    let kx = pad;
    const ky = h - 10;
    key.forEach(([c, t]) => {
      ctx.fillStyle = Lab.rgbStr(c, 1);
      ctx.beginPath(); ctx.arc(kx + 4, ky - 4, 4, 0, 7); ctx.fill();
      ctx.fillStyle = pal.ink2; ctx.fillText(t, kx + 13, ky);
      kx += ctx.measureText(t).width + 30;
    });
    return { none, uni, bi, tum };
  }

  function drawChart() {
    const f = CG.frame(svg, {
      h: 290, m: { l: 50, r: 16, t: 26, b: 42 }, x: [0, T], y: [0.02, 1], ylog: true,
      xt: [0, 1, 2, 3, 4, 5], yt: [0.02, 0.05, 0.1, 0.2, 0.5, 1],
      yf: (v) => (v >= 1 ? '100%' : (v * 100).toFixed(0) + '%'),
      xl: 'age, years', yl: 'eventual cases not yet diagnosed',
    });
    const pts1 = [], pts2 = [];
    for (let i = 0; i <= 120; i++) { const t = (i / 120) * T; pts1.push([t, Math.max(0.02, S1(t))]); pts2.push([t, Math.max(0.02, S2(t))]); }
    Lab.svg('path', { d: CG.path(pts2, f.X, f.Y), fill: 'none', stroke: f.pal.s2, 'stroke-width': 2 }, f.g);
    Lab.svg('path', { d: CG.path(pts1, f.X, f.Y), fill: 'none', stroke: f.pal.s1, 'stroke-width': 2 }, f.g);
    // the half-diagnosed line, and the two observed median ages marked on it
    Lab.svg('line', { x1: f.m.l, x2: f.W - f.m.r, y1: f.Y(0.5), y2: f.Y(0.5), stroke: f.pal.ink3, 'stroke-width': 1, 'stroke-dasharray': '4 3' }, f.g);
    CG.text(f.g, f.W - f.m.r - 2, f.Y(0.5) - 7, 'half diagnosed', f.pal.ink3, 'end', 10);
    [[OBS.bilat / 12, 'observed 15 mo', f.pal.s1, 'end'], [OBS.unilat / 12, 'observed 24 mo', f.pal.s2, 'start']].forEach(([t, lab, c, anch]) => {
      Lab.svg('circle', { cx: f.X(t), cy: f.Y(0.5), r: 4, fill: c, stroke: f.pal.paper, 'stroke-width': 1.2 }, f.g);
      CG.text(f.g, f.X(t) + (anch === 'end' ? -7 : 7), f.Y(0.5) + 16, lab, c, anch, 10);
    });
    // legend, in the empty lower-left corner
    [['one hit: carriers', f.pal.s1, 0.055], ['two hits: sporadic', f.pal.s2, 0.035]].forEach(([lab, c, y]) => {
      Lab.svg('line', { x1: f.m.l + 8, x2: f.m.l + 24, y1: f.Y(y), y2: f.Y(y), stroke: c, 'stroke-width': 2 }, f.g);
      CG.text(f.g, f.m.l + 30, f.Y(y) + 3.5, lab, c, 'start', 11);
    });
    CG.hover(svg, f, 0, T, (t, sx, sy, px) => {
      const tt = Math.max(0.05, Math.min(T, t));
      tip.show(px * sx, f.Y(Math.max(0.02, S1(tt))) * sy - 8,
        `<b>${(tt * 12).toFixed(0)} months</b><br>carriers left: ${(100 * S1(tt)).toFixed(1)}%<br>sporadic left: ${(100 * S2(tt)).toFixed(1)}%`,
        f.Y(0.02) * sy);
    }, () => tip.hide());
  }

  function render() {
    if (!ready) return;
    const c = drawEyes(); drawChart();
    const u = m / (N * T);                      // per cell per year, implied by m
    const freq = (m * m * E) / (2 * N);         // sporadic frequency per child
    out.innerHTML = [
      `<span>penetrance <b>${(100 * (1 - Math.exp(-m))).toFixed(1)}%</b></span>`,
      `<span>predicted one eye / both <b>${(100 * 2 * Math.exp(-m / 2) * (1 - Math.exp(-m / 2))).toFixed(0)}% / ${(100 * (1 - Math.exp(-m / 2)) ** 2).toFixed(0)}%</b></span>`,
      c ? `<span>this cohort <b>${c.none} / ${c.uni} / ${c.bi}</b></span>` : '',
      `<span>model median age, one hit / two <b>${(med1 * 12).toFixed(0)} / ${(med2 * 12).toFixed(0)} months</b></span>`,
      `<span>implied rate per cell per year <b>${CG.sci(u)}</b></span>`,
      `<span>predicted sporadic frequency <b>1 in ${CG.num(Math.round(1 / freq))}</b></span>`,
    ].join('');
  }

  Lab.slider(Lab.$('#kn-m', root), Lab.fmt.fixed(1), (v) => { m = v; render(); });
  Lab.slider(Lab.$('#kn-cells', root), (v) => CG.sci(Math.pow(10, v)), (v) => { N = Math.pow(10, v); render(); });
  Lab.slider(Lab.$('#kn-exp', root), (v) => (Math.pow(10, v) < 2 ? 'none' : '×' + CG.num(Math.pow(10, v))), (v) => { E = Math.pow(10, v); render(); });
  ready = true; render();
  Lab.onTheme(render); Lab.onResize(cv, render); Lab.onResize(svg, render);
})();

/* ---------------------------------------------------------------- Fig 2.1 */
(function () {
  const root = Lab.$('#fig-ras');
  if (!root) return;
  const cv = Lab.$('canvas.ra-cv', root), svg = Lab.$('svg.ra-chart', root);
  const out = Lab.$('.readouts', root), wrap = svg.parentElement, tip = Lab.tip(wrap);
  const KI = CG.K.kIntrinsic, KG = CG.K.kGap;
  // intrinsic and GAP-stimulated hydrolysis as fractions of wild type (Hunter et al. 2015)
  const VAR = [
    { k: 'WT', n: 'wild type', fi: 1, fg: 1 },
    { k: 'G12D', n: 'G12D', fi: 0.279, fg: 0.0207 },
    { k: 'G12V', n: 'G12V', fi: 0.062, fg: 0.0056 },
    { k: 'Q61L', n: 'Q61L', fi: 0.011, fg: 0.0028 },
  ];
  let gap = 1, kex = 0.01, pick = 'G12V', ready = false;
  const khyd = (v, g) => KI * v.fi + g * KG * v.fg;
  const fGTP = (v, g, e) => e / (e + khyd(v, g));

  function drawCycle() {
    if (!cv.clientWidth) return;
    const narrow = cv.clientWidth < 420;
    const { ctx, w, h } = Lab.canvas(cv, narrow ? 0.82 : 0.56), pal = Lab.palette();
    ctx.clearRect(0, 0, w, h);
    const accent = Lab.rgb('--accent'), signal = Lab.rgb('--signal'), ink3 = Lab.rgb('--ink-3');
    const v = VAR.find((x) => x.k === pick);
    const f = fGTP(v, gap, kex), fw = fGTP(VAR[0], gap, kex);
    const bw = Math.min(w * 0.33, 128), bh = 46;
    const cy = h * 0.32;
    const lx = w * 0.5 - (narrow ? w * 0.24 : w * 0.2), rx = w * 0.5 + (narrow ? w * 0.24 : w * 0.2);
    const box = (x, label, sub, col, on) => {
      ctx.fillStyle = Lab.rgbStr(col, on ? 0.16 : 0.05);
      ctx.strokeStyle = Lab.rgbStr(col, on ? 1 : 0.4); ctx.lineWidth = on ? 2 : 1;
      ctx.beginPath(); ctx.roundRect(x - bw / 2, cy - bh / 2, bw, bh, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = on ? pal.ink : pal.ink3; ctx.textAlign = 'center';
      ctx.font = `500 13px ${Lab.css('--f-mono')}`; ctx.fillText(label, x, cy - 3);
      ctx.font = `11px ${Lab.css('--f-mono')}`; ctx.fillStyle = pal.ink3; ctx.fillText(sub, x, cy + 14);
      ctx.textAlign = 'left';
    };
    box(lx, 'RAS·GDP', 'off', ink3, f < 0.5);
    box(rx, 'RAS·GTP', 'on', signal, f >= 0.5);
    // arrows: exchange on top (left to right), hydrolysis below (right to left)
    const arc = (y, from, to, width, col, label) => {
      ctx.strokeStyle = Lab.rgbStr(col, 0.9); ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(from, cy + (y > 0 ? bh / 2 : -bh / 2));
      ctx.bezierCurveTo(from, cy + y, to, cy + y, to, cy + (y > 0 ? bh / 2 : -bh / 2));
      ctx.stroke();
      // an arrowhead pointing into the destination box, along the vertical
      const tipy = cy + (y > 0 ? bh / 2 : -bh / 2), dir = y > 0 ? -1 : 1;
      ctx.fillStyle = Lab.rgbStr(col, 0.9);
      ctx.beginPath();
      ctx.moveTo(to, tipy);
      ctx.lineTo(to - 5, tipy - dir * 9);
      ctx.lineTo(to + 5, tipy - dir * 9);
      ctx.closePath(); ctx.fill();
      ctx.font = `11px ${Lab.css('--f-mono')}`; ctx.fillStyle = pal.ink2; ctx.textAlign = 'center';
      ctx.fillText(label, (from + to) / 2, cy + y + (y > 0 ? 15 : -7));
      ctx.textAlign = 'left';
    };
    const kh = khyd(v, gap);
    arc(-bh * 0.9, lx, rx, Math.max(1.2, Math.min(7, 2 + 2 * Math.log10(kex / 1e-3))), accent, `exchange  ${CG.sci(kex)} s⁻¹`);
    arc(bh * 0.9, rx, lx, Math.max(1.2, Math.min(7, 2 + Math.log10(kh / 1e-4))), signal, `hydrolysis  ${CG.sci(kh)} s⁻¹`);

    // the active-fraction bars
    const by = h - 54, bwid = w - 40;
    ctx.font = `11px ${Lab.css('--f-mono')}`;
    [[fw, 'wild type', ink3], [f, v.n, signal]].forEach(([val, lab, col], i) => {
      const y = by + i * 22;
      ctx.fillStyle = Lab.rgbStr(Lab.rgb('--grid'), 1); ctx.fillRect(20, y, bwid, 11);
      ctx.fillStyle = Lab.rgbStr(col, 0.95); ctx.fillRect(20, y, Math.max(1, bwid * val), 11);
      ctx.fillStyle = pal.ink2;
      const txt = `${lab}  ${(100 * val).toFixed(1)}% active`;
      const tw = ctx.measureText(txt).width;
      const inside = bwid * val > tw + 14;
      ctx.fillStyle = inside ? pal.paper : pal.ink2;
      ctx.fillText(txt, inside ? 26 : 26 + bwid * val, y + 9);
    });
  }

  function drawChart() {
    const f = CG.frame(svg, {
      h: 290, m: { l: 48, r: 24, t: 26, b: 42 }, x: [1e-4, 1], y: [0, 1], xlog: true,
      xt: [1e-4, 1e-3, 1e-2, 1e-1, 1], yt: [0, 0.25, 0.5, 0.75, 1],
      xf: (v) => CG.sci(v), yf: (v) => (v * 100).toFixed(0) + '%',
      xl: 'GAP, relative to a resting cell', yl: 'RAS in the active GTP state',
    });
    const cols = [f.pal.ink3, f.pal.s1, f.pal.s2, f.pal.s3];
    VAR.forEach((v, i) => {
      const pts = [];
      for (let k = 0; k <= 160; k++) { const g = Math.pow(10, -4 + (k / 160) * 4); pts.push([g, fGTP(v, g, kex)]); }
      Lab.svg('path', { d: CG.path(pts, f.X, f.Y), fill: 'none', stroke: cols[i], 'stroke-width': v.k === pick ? 2.6 : 1.6, opacity: v.k === pick ? 1 : 0.75 }, f.g);
      // label each curve where it is half loaded, which is a different GAP level for each variant
      const gHalf = Math.max(1.2e-4, Math.min(0.8, (kex - KI * v.fi) / (KG * v.fg)));
      CG.text(f.g, f.X(gHalf), f.Y(fGTP(v, gHalf, kex)) - (i % 2 ? 24 : 9), v.n, cols[i], 'middle');
    });
    Lab.svg('line', { x1: f.X(gap), x2: f.X(gap), y1: f.m.t, y2: f.H - f.m.b, stroke: f.pal.rule, 'stroke-dasharray': '3 3' }, f.g);
    CG.hover(svg, f, 1e-4, 1, (g, sx, sy, px) => {
      const gg = Math.max(1e-4, Math.min(1, g));
      tip.show(px * sx, f.m.t * sy + 4,
        `<b>GAP ${CG.sci(gg)}</b><br>` + VAR.map((v) => `${v.n}: ${(100 * fGTP(v, gg, kex)).toFixed(1)}%`).join('<br>'),
        (f.H - f.m.b) * sy);
    }, () => tip.hide(), true);
  }

  function render() {
    if (!ready) return;
    drawCycle(); drawChart();
    const v = VAR.find((x) => x.k === pick);
    const f = fGTP(v, gap, kex), fw = fGTP(VAR[0], gap, kex);
    out.innerHTML = [
      `<span>active, wild type <b>${(100 * fw).toFixed(2)}%</b></span>`,
      `<span>active, ${v.n} <b>${(100 * f).toFixed(1)}%</b></span>`,
      `<span>ratio <b>${(f / fw).toFixed(1)}×</b></span>`,
      `<span>time to switch off, ${v.n} <b>${(1 / khyd(v, gap) < 60 ? (1 / khyd(v, gap)).toFixed(1) + ' s' : (1 / khyd(v, gap) / 60).toFixed(0) + ' min')}</b></span>`,
    ].join('');
  }

  Lab.slider(Lab.$('#ra-gap', root), (x) => CG.sci(Math.pow(10, x)), (x) => { gap = Math.pow(10, x); render(); });
  Lab.slider(Lab.$('#ra-ex', root), (x) => CG.sci(Math.pow(10, x)) + ' s⁻¹', (x) => { kex = Math.pow(10, x); render(); });
  const sel = Lab.$('#ra-var', root);
  sel.addEventListener('change', () => { pick = sel.value; render(); });
  ready = true; render();
  Lab.onTheme(render); Lab.onResize(cv, render); Lab.onResize(svg, render);
})();
