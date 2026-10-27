/* Chapters 3-4. Fig 3.1: allele-specific read counts along a chromosome, and what purity does to them.
   Fig 4.1: the Armitage-Doll slope, fitted to real SEER age-specific incidence. */

/* ---------------------------------------------------------------- Fig 3.1 */
(function () {
  const root = Lab.$('#fig-loh');
  if (!root) return;
  const baf = Lab.$('svg.lo-baf', root), dep = Lab.$('svg.lo-dep', root);
  const out = Lab.$('.readouts', root);
  const tipB = Lab.tip(baf.parentElement), tipD = Lab.tip(dep.parentElement);
  const SEG = [
    { x0: 0, x1: 25, nA: 1, nB: 1, n: 'balanced 1+1' },
    { x0: 25, x1: 50, nA: 1, nB: 0, n: 'deletion 1+0' },
    { x0: 50, x1: 75, nA: 2, nB: 0, n: 'copy-neutral LOH 2+0' },
    { x0: 75, x1: 100, nA: 2, nB: 1, n: 'gain 2+1' },
  ];
  const NSITE = 320;
  let rho = 0.6, depth = 60, phi = 1, ready = false;

  const expect = (nA, nB) => {
    const tot = rho * phi * (nA + nB) + rho * (1 - phi) * 2 + (1 - rho) * 2;
    const b = rho * phi * nB + rho * (1 - phi) + (1 - rho);
    return { baf: b / tot, ratio: tot / 2 };
  };

  const sites = () => {
    const r = Lab.rng(1983), list = [];
    for (let i = 0; i < NSITE; i++) {
      const x = (i + 0.5) * (100 / NSITE) + (r() - 0.5) * (60 / NSITE);
      const s = SEG.find((g) => x >= g.x0 && x < g.x1) || SEG[3];
      const flip = r() < 0.5;
      const nA = flip ? s.nB : s.nA, nB = flip ? s.nA : s.nB;
      const e = expect(nA, nB);
      const d = Math.max(4, Math.round(depth * e.ratio + Math.sqrt(depth * e.ratio) * Lab.gauss(r)));
      let b = 0; for (let k = 0; k < d; k++) if (r() < e.baf) b++;
      list.push({ x, seg: s, b: b / d, d, ratio: d / depth, e });
    }
    return list;
  };

  function draw() {
    if (!ready) return;
    const data = sites();
    const bands = (f) => SEG.forEach((s, i) => {
      if (i % 2) Lab.svg('rect', { x: f.X(s.x0), y: f.m.t, width: f.X(s.x1) - f.X(s.x0), height: f.H - f.m.t - f.m.b, fill: f.pal.paper2 }, f.g);
      CG.text(f.g, (f.X(s.x0) + f.X(s.x1)) / 2, f.m.t + 14, s.n, f.pal.ink3, 'middle', 10);
    });

    const f1 = CG.frame(baf, {
      h: 250, m: { l: 46, r: 14, t: 42, b: 28 }, x: [0, 100], y: [0, 1],
      xt: [0, 25, 50, 75, 100], yt: [0, 0.25, 0.5, 0.75, 1],
      yf: (v) => v.toFixed(2), yl: 'B-allele frequency',
    });
    bands(f1);
    const s1 = Lab.rgb('--s1');
    data.forEach((p) => { Lab.svg('circle', { cx: f1.X(p.x), cy: f1.Y(p.b), r: 2, fill: Lab.rgbStr(s1, 0.55) }, f1.g); });
    SEG.forEach((s) => {
      [expect(s.nA, s.nB).baf, 1 - expect(s.nA, s.nB).baf].forEach((v) => {
        Lab.svg('line', { x1: f1.X(s.x0) + 1, x2: f1.X(s.x1) - 1, y1: f1.Y(v), y2: f1.Y(v), stroke: f1.pal.ink, 'stroke-width': 1.4, 'stroke-dasharray': '4 3' }, f1.g);
      });
    });

    const f2 = CG.frame(dep, {
      h: 210, m: { l: 46, r: 14, t: 42, b: 40 }, x: [0, 100], y: [0, 2],
      xt: [0, 25, 50, 75, 100], yt: [0, 0.5, 1, 1.5, 2],
      yf: (v) => v.toFixed(1), xl: 'position along the chromosome, Mb', yl: 'read depth ratio to normal',
    });
    bands(f2);
    data.forEach((p) => { Lab.svg('circle', { cx: f2.X(p.x), cy: f2.Y(Math.min(2, p.ratio)), r: 2, fill: Lab.rgbStr(s1, 0.45) }, f2.g); });
    SEG.forEach((s) => {
      Lab.svg('line', { x1: f2.X(s.x0) + 1, x2: f2.X(s.x1) - 1, y1: f2.Y(expect(s.nA, s.nB).ratio), y2: f2.Y(expect(s.nA, s.nB).ratio), stroke: f2.pal.ink, 'stroke-width': 1.4, 'stroke-dasharray': '4 3' }, f2.g);
    });
    Lab.svg('line', { x1: f2.m.l, x2: f2.W - f2.m.r, y1: f2.Y(1), y2: f2.Y(1), stroke: f2.pal.rule }, f2.g);

    const hit = (svg, f, tip, val) => CG.hover(svg, f, 0, 100, (x, sx, sy, px) => {
      const s = SEG.find((g) => x >= g.x0 && x < g.x1) || SEG[3];
      const e = expect(s.nA, s.nB);
      tip.show(px * sx, (f.m.t + 14) * sy, `<b>${s.n}</b><br>expected BAF ${e.baf.toFixed(3)} / ${(1 - e.baf).toFixed(3)}<br>expected depth ratio ${e.ratio.toFixed(3)}`, (f.H - f.m.b) * sy);
      void val;
    }, () => tip.hide());
    hit(baf, f1, tipB); hit(dep, f2, tipD);

    const del = expect(1, 0), cn = expect(2, 0);
    // how many standard errors separate the deletion band from the balanced one at this depth
    const se = Math.sqrt(0.25 / (depth * del.ratio));
    out.innerHTML = [
      `<span>deletion BAF <b>${del.baf.toFixed(3)}</b></span>`,
      `<span>copy-neutral LOH BAF <b>${cn.baf.toFixed(3)}</b></span>`,
      `<span>deletion depth ratio <b>${del.ratio.toFixed(2)}×</b></span>`,
      `<span>separation from balanced <b>${((0.5 - del.baf) / se).toFixed(1)}&sigma;</b></span>`,
      phi < 1 ? `<span class="warn">purity &rho;=${rho.toFixed(2)} and subclonality ${phi.toFixed(2)} act alike: effective <b>${(rho * phi).toFixed(2)}</b></span>` : '',
    ].join('');
  }

  Lab.slider(Lab.$('#lo-pur', root), Lab.fmt.fixed(2), (v) => { rho = v; draw(); });
  Lab.slider(Lab.$('#lo-dep', root), (v) => v.toFixed(0) + '×', (v) => { depth = v; draw(); });
  Lab.slider(Lab.$('#lo-sub', root), Lab.fmt.fixed(2), (v) => { phi = v; draw(); });
  ready = true; draw();
  Lab.onTheme(draw); Lab.onResize(baf, draw);
})();

/* ---------------------------------------------------------------- Fig 4.1 */
(function () {
  const root = Lab.$('#fig-multistage');
  if (!root) return;
  const svg = Lab.$('svg.ms-chart', root), out = Lab.$('.readouts', root);
  const tip = Lab.tip(svg.parentElement);
  const sel = Lab.$('#ms-site', root), all = Lab.$('#ms-all', root);
  CG.SITES.forEach((s, i) => { const o = Lab.el('option', { value: String(i) }, s.n); sel.appendChild(o); });
  let site = 0, lo = 7, hi = 16, ready = false;

  const fit = (s, i0, i1) => {
    const xs = [], ys = [];
    for (let i = i0; i <= i1; i++) { const r = s.r[i]; if (r != null && r > 0) { xs.push(Math.log(CG.AGEMID[i])); ys.push(Math.log(r)); } }
    const n = xs.length;
    if (n < 3) return null;
    const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
    const b = sxy / sxx;
    return { b, a: my - b * mx, n, r2: syy > 0 ? (sxy * sxy) / (sxx * syy) : 0 };
  };

  function draw() {
    if (!ready) return;
    const f = CG.frame(svg, {
      h: 380, m: { l: 54, r: 90, t: 28, b: 46 }, x: [2, 90], y: [0.05, 600], xlog: true, ylog: true,
      xt: [2, 5, 10, 20, 40, 80], yt: [0.1, 1, 10, 100],
      xf: (v) => String(v), yf: (v) => (v < 1 ? v.toFixed(1) : String(v)),
      xl: 'age, years', yl: 'new cases per 100,000 per year',
    });
    const cols = [f.pal.s1, f.pal.s2, f.pal.s3, f.pal.accent, f.pal.signal, f.pal.ink3, f.pal.ink2, Lab.css('--band')];
    const showAll = all.checked;
    // the fit window
    Lab.svg('rect', {
      x: f.X(CG.AGEMID[Math.min(lo, hi - 2)]), y: f.m.t,
      width: Math.max(2, Math.min(f.W - f.m.r, f.X(CG.AGEMID[Math.max(hi, lo + 2)])) - f.X(CG.AGEMID[Math.min(lo, hi - 2)])),
      height: f.H - f.m.t - f.m.b, fill: f.pal.accent, opacity: 0.07,
    }, f.g);

    const i0 = Math.min(lo, hi - 2), i1 = Math.max(hi, lo + 2);
    const labels = [];
    CG.SITES.forEach((s, i) => {
      const on = i === site;
      if (!showAll && !on) return;
      const pts = [];
      s.r.forEach((v, k) => { if (v != null && v > 0.05) pts.push([CG.AGEMID[k], v]); });
      Lab.svg('path', { d: CG.path(pts, f.X, f.Y), fill: 'none', stroke: cols[i], 'stroke-width': on ? 2 : 1.2, opacity: on ? 1 : 0.45 }, f.g);
      if (on) pts.forEach((p) => Lab.svg('circle', { cx: f.X(p[0]), cy: f.Y(p[1]), r: 2.8, fill: cols[i] }, f.g));
      const lastp = pts[pts.length - 1];
      if (lastp) labels.push({ x: f.X(lastp[0]) + 6, y: f.Y(lastp[1]) + 4, t: s.n.split(' ')[0], c: cols[i], on });
    });
    // push the right-edge labels apart so they do not stack on one another
    labels.sort((a, b) => a.y - b.y);
    for (let i = 1; i < labels.length; i++) if (labels[i].y - labels[i - 1].y < 13) labels[i].y = labels[i - 1].y + 13;
    const over = labels.length ? labels[labels.length - 1].y - (f.H - f.m.b) : 0;
    if (over > 0) labels.forEach((l) => { l.y -= over; });
    labels.forEach((l) => CG.text(f.g, l.x, l.y, l.t, l.c, 'start', l.on ? 11 : 10));

    const F = fit(CG.SITES[site], i0, i1);
    if (F) {
      const x0 = CG.AGEMID[i0], x1 = CG.AGEMID[i1];
      // the fitted line, clipped to the plotted range at both ends
      const at = (x) => Math.exp(F.a + F.b * Math.log(x));
      const clip = (x) => { let v = at(x); if (v > 600) x = Math.exp((Math.log(600) - F.a) / F.b); if (at(x) < 0.05) x = Math.exp((Math.log(0.05) - F.a) / F.b); return Math.max(2, Math.min(90, x)); };
      const xa = clip(x0 * 0.8), xb = clip(Math.min(90, x1 * 1.25));
      const line = [[xa, at(xa)], [xb, at(xb)]];
      Lab.svg('path', { d: CG.path(line, f.X, f.Y), fill: 'none', stroke: f.pal.ink, 'stroke-width': 1.4, 'stroke-dasharray': '6 4' }, f.g);
    }
    CG.hover(svg, f, 2, 90, (x, sx, sy, px) => {
      let k = 0; CG.AGEMID.forEach((a, i) => { if (Math.abs(Math.log(a) - Math.log(x)) < Math.abs(Math.log(CG.AGEMID[k]) - Math.log(x))) k = i; });
      const rows = (showAll ? CG.SITES : [CG.SITES[site]]).map((s) => `${s.n}: ${s.r[k] == null ? '—' : s.r[k].toFixed(1)}`).join('<br>');
      tip.show(px * sx, (f.m.t + 10) * sy, `<b>ages ${CG.AGEBAND[k]}</b><br>${rows}`, (f.H - f.m.b) * sy);
    }, () => tip.hide(), true);

    const s = CG.SITES[site];
    out.innerHTML = [
      `<span>fit window <b>ages ${CG.AGEBAND[i0].split('-')[0]}–${CG.AGEBAND[i1].split('-')[1]}</b></span>`,
      F ? `<span>slope <b>${F.b.toFixed(2)}</b></span>` : '<span class="warn">too few bands to fit</span>',
      F ? `<span>implied steps <span class="nocase">k</span> <b>${F.b > 0 ? (F.b + 1).toFixed(1) : 'none'}</b></span>` : '',
      F ? `<span>R² <b>${F.r2.toFixed(3)}</b></span>` : '',
      F && F.b <= 0.5 ? '<span class="warn">incidence does not rise with age here; the multistage model does not apply</span>' : '',
      F && F.r2 < 0.95 && F.b > 0.5 ? '<span class="warn">a poor straight line: the exponent is not constant over this window</span>' : '',
      `<span>site <b>${s.n}</b></span>`,
    ].join('');
  }

  sel.addEventListener('change', () => { site = parseInt(sel.value, 10); draw(); });
  all.addEventListener('change', draw);
  Lab.slider(Lab.$('#ms-lo', root), (v) => CG.AGEBAND[v].split('-')[0], (v) => { lo = v; draw(); });
  Lab.slider(Lab.$('#ms-hi', root), (v) => CG.AGEBAND[v].split('-')[1], (v) => { hi = v; draw(); });
  ready = true; draw();
  Lab.onTheme(draw); Lab.onResize(svg, draw);
})();
