/* Chapters 8-10. Fig 8.1: variant allele frequencies converted to cancer cell fractions.
   Fig 9.1: the expected number of pre-existing resistant cells, after Bozic et al. (2013).
   Fig 10.1: the binomial sampling floor on detecting circulating tumour DNA. */

/* ---------------------------------------------------------------- Fig 8.1 */
(function () {
  const root = Lab.$('#fig-ccf');
  if (!root) return;
  const svg = Lab.$('svg.cc-vaf', root), cv = Lab.$('canvas.cc-cv', root);
  const out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
  const cnBox = Lab.$('#cc-cn', root);
  const NMUT = 1500;
  let rho = 0.65, depth = 150, sub = 0.45, ready = false;

  const simulate = () => {
    const r = Lab.rng(2012), list = [];
    const clones = [
      { ccf: 1, w: 0.55, n: 'clonal' },
      { ccf: sub, w: 0.3, n: 'subclone A' },
      { ccf: sub / 3, w: 0.15, n: 'subclone B' },
    ];
    for (let i = 0; i < NMUT; i++) {
      const u = r();
      let acc = 0, c = clones[0];
      for (const k of clones) { acc += k.w; if (u <= acc) { c = k; break; } }
      const gained = cnBox.checked && r() < 1 / 3;
      const nA = gained ? 2 : 1, nB = 1, m = 1;
      const tot = rho * (nA + nB) + 2 * (1 - rho);
      const vaf = (c.ccf * rho * m) / tot;
      const d = Math.max(4, Math.round(depth + Math.sqrt(depth) * Lab.gauss(r)));
      let alt = 0; for (let k = 0; k < d; k++) if (r() < vaf) alt++;
      const obs = alt / d;
      // the correction, using the copy number the caller believes (always 1+1 unless it is known)
      const assumed = cnBox.checked ? nA + nB : 2;
      const ccf = (obs * (rho * assumed + 2 * (1 - rho))) / (rho * m);
      list.push({ vaf: obs, ccf, clone: c.n, gained, d });
    }
    return list;
  };

  const hist = (vals, lo, hi, bins) => {
    const h = new Array(bins).fill(0);
    vals.forEach((v) => { const k = Math.floor(((v - lo) / (hi - lo)) * bins); if (k >= 0 && k < bins) h[k]++; });
    return h;
  };

  function drawHist(data) {
    const BINS = 32, XMAX = 1.6;
    const hv = hist(data.map((d) => d.vaf), 0, XMAX, BINS);
    const hc = hist(data.map((d) => d.ccf), 0, XMAX, BINS);
    const mv = Math.max(...hv, 1), mc = Math.max(...hc, 1);
    const f = CG.frame(svg, {
      h: 360, m: { l: 48, r: 16, t: 24, b: 48 }, x: [0, XMAX], y: [0, 1],
      xt: [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5], yt: [],
      xf: (v) => v.toFixed(2), xl: 'variant allele frequency (upper), cancer cell fraction (lower)',
    });
    const H = f.H - f.m.t - f.m.b, mid = f.m.t + H / 2;
    const bw = (f.X(XMAX) - f.X(0)) / BINS;
    // each half is scaled to its own tallest bin, so both are readable
    const bar = (h, mx, yBase, up, col) => h.forEach((n, i) => {
      if (!n) return;
      const bh = (n / mx) * (H / 2 - 20);
      Lab.svg('rect', { x: f.X(0) + i * bw + bw * 0.1, y: up ? yBase - bh : yBase, width: Math.max(0.8, bw * 0.8), height: bh, fill: col, opacity: 0.85 }, f.g);
    });
    bar(hv, mv, mid - 12, true, f.pal.s1);
    bar(hc, mc, mid + 12, false, f.pal.s2);
    Lab.svg('line', { x1: f.m.l, x2: f.W - f.m.r, y1: mid - 12, y2: mid - 12, stroke: f.pal.ink3 }, f.g);
    Lab.svg('line', { x1: f.m.l, x2: f.W - f.m.r, y1: mid + 12, y2: mid + 12, stroke: f.pal.ink3 }, f.g);
    CG.text(f.g, f.m.l + 4, f.m.t + 12, 'raw VAF', f.pal.s1);
    CG.text(f.g, f.W - f.m.r - 4, f.H - f.m.b - 22, 'corrected to CCF', f.pal.s2, 'end');
    // the true cancer cell fractions, marked under the lower histogram
    [[1, 'clonal'], [sub, 'A'], [sub / 3, 'B']].forEach(([c, lab]) => {
      Lab.svg('line', { x1: f.X(c), x2: f.X(c), y1: mid + 12, y2: f.H - f.m.b, stroke: f.pal.ink, 'stroke-width': 1, 'stroke-dasharray': '3 3' }, f.g);
      CG.text(f.g, f.X(c), f.H - f.m.b - 5, lab, f.pal.ink2, 'middle', 10);
    });
    CG.hover(svg, f, 0, XMAX, (x, sx, sy, px) => {
      const inVaf = data.filter((d) => Math.abs(d.vaf - x) < 0.02).length;
      const inCcf = data.filter((d) => Math.abs(d.ccf - x) < 0.02).length;
      tip.show(px * sx, (f.m.t + 14) * sy, `<b>${x.toFixed(3)}</b><br>mutations within 0.02: VAF ${inVaf}, CCF ${inCcf}`, (f.H - f.m.b) * sy);
    }, () => tip.hide());
  }

  function drawTree(data) {
    if (!cv.clientWidth) return;
    const narrow = cv.clientWidth < 420;
    const { ctx, w, h } = Lab.canvas(cv, narrow ? 0.9 : 0.62), pal = Lab.palette();
    ctx.clearRect(0, 0, w, h);
    const COL = [Lab.rgb('--s1'), Lab.rgb('--s2'), Lab.rgb('--s3')];
    const pad = 18, top = 34;
    const H = Math.max(60, h - top - 92);
    const W = w - pad * 2;
    const counts = ['clonal', 'subclone A', 'subclone B'].map((n) => data.filter((d) => d.clone === n).length);
    const widths = [W, W * sub, W * (sub / 3)];
    const alphas = [0.3, 0.42, 0.55];
    widths.forEach((wd, i) => { ctx.fillStyle = Lab.rgbStr(COL[i], alphas[i]); ctx.fillRect(pad, top, wd, H); });
    ctx.strokeStyle = Lab.rgbStr(Lab.rgb('--ink-3'), 0.5); ctx.lineWidth = 1;
    ctx.strokeRect(pad, top, W, H);
    widths.slice(1).forEach((wd) => { ctx.beginPath(); ctx.moveTo(pad + wd, top); ctx.lineTo(pad + wd, top + H); ctx.stroke(); });
    ctx.font = `11px ${Lab.css('--f-mono')}`;
    ctx.fillStyle = pal.ink3;
    ctx.fillText('width = share of the tumour\u2019s cells', pad, top - 12);
    // a key below the blocks, so no label has to fit inside a narrow strip
    const rows = [
      ['founding clone, in every cell', 1, counts[0]],
      ['subclone A', sub, counts[1]],
      ['subclone B, inside A', sub / 3, counts[2]],
    ];
    rows.forEach(([lab, ccf, n], i) => {
      const y = top + H + 20 + i * 18;
      ctx.fillStyle = Lab.rgbStr(COL[i], Math.max(0.5, alphas[i])); ctx.fillRect(pad, y - 9, 10, 10);
      ctx.fillStyle = pal.ink2;
      ctx.fillText(`${lab}  \u00b7  CCF ${ccf.toFixed(2)}  \u00b7  ${n} mut.`, pad + 17, y);
    });
    ctx.fillStyle = pal.ink3;
    ctx.fillText(`normal cells in the sample: ${(100 * (1 - rho)).toFixed(0)}%`, pad, top + H + 20 + 3 * 18 + 4);
  }

  function render() {
    if (!ready) return;
    const data = simulate();
    drawHist(data); drawTree(data);
    // how well separated the clonal and subclone-A peaks are, in units of the sampling noise
    const vClonal = rho / (rho * 2 + 2 * (1 - rho));
    const se = Math.sqrt((vClonal * (1 - vClonal)) / depth);
    const gap = (vClonal * (1 - sub)) / se;
    const seA = Math.sqrt((vClonal * sub * (1 - vClonal * sub)) / depth);
    const gapAB = (vClonal * sub * (2 / 3)) / seA;
    const mean = (n) => { const a = data.filter((d) => d.clone === n).map((d) => d.ccf); return a.reduce((x, y) => x + y, 0) / Math.max(1, a.length); };
    out.innerHTML = [
      `<span>clonal VAF expected <b>${vClonal.toFixed(3)}</b></span>`,
      `<span>recovered CCF, clonal / A / B <b>${mean('clonal').toFixed(2)} / ${mean('subclone A').toFixed(2)} / ${mean('subclone B').toFixed(2)}</b></span>`,
      `<span>separation, clonal from A <b>${gap.toFixed(1)}&sigma;</b></span>`,
      `<span>separation, A from B <b>${gapAB.toFixed(1)}&sigma;</b></span>`,
      Math.min(gap, gapAB) < 3 ? '<span class="warn">these peaks are not resolvable at this depth and purity</span>' : '',
      cnBox.checked ? '<span>copy number used in the correction, so the gained mutations come back to their true CCF</span>' : '',
    ].join('');
  }

  Lab.slider(Lab.$('#cc-pur', root), Lab.fmt.fixed(2), (v) => { rho = v; render(); });
  Lab.slider(Lab.$('#cc-dep', root), (v) => v.toFixed(0) + '×', (v) => { depth = v; render(); });
  Lab.slider(Lab.$('#cc-sub', root), Lab.fmt.fixed(2), (v) => { sub = v; render(); });
  cnBox.addEventListener('change', render);
  ready = true; render();
  Lab.onTheme(render); Lab.onResize(svg, render); Lab.onResize(cv, render);
})();

/* ---------------------------------------------------------------- Fig 9.1 */
(function () {
  const root = Lab.$('#fig-resistance');
  if (!root) return;
  const svg = Lab.$('svg.re-chart', root), cv = Lab.$('canvas.re-cv', root);
  const out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
  const K = CG.K;
  const S = (K.bBozic - K.dBozic) / K.bBozic;      // net growth fraction
  let M = 1e10, n = 50, u = 1e-9, nx = 0, ready = false;

  const muOf = (m) => u * S * Math.log(Math.max(2, m * S));
  const expected = (m, drugs) => {
    const mu = muOf(m);
    const indep = m * Math.pow(n, drugs) * Math.pow(mu, drugs);
    const cross = drugs > 1 ? m * nx * mu : 0;      // one mutation that covers every drug
    return indep + cross;
  };
  const pCure = (m, drugs) => Math.exp(-expected(m, drugs));

  function drawChart() {
    const f = CG.frame(svg, {
      h: 330, m: { l: 52, r: 74, t: 26, b: 44 }, x: [1e5, 1e12], y: [0, 1], xlog: true,
      xt: [1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12], yt: [0, 0.25, 0.5, 0.75, 1],
      xf: (v) => CG.sci(v), yf: (v) => (v * 100).toFixed(0) + '%',
      xl: 'tumour cells at the start of treatment', yl: 'chance no resistant cell exists yet',
    });
    const cols = [f.pal.s2, f.pal.s1, f.pal.s3];
    const labs = [];
    [1, 2, 3].forEach((d, i) => {
      const pts = [];
      for (let k = 0; k <= 160; k++) { const m = Math.pow(10, 5 + (k / 160) * 7); pts.push([m, pCure(m, d)]); }
      Lab.svg('path', { d: CG.path(pts, f.X, f.Y), fill: 'none', stroke: cols[i], 'stroke-width': d === 3 ? 1.6 : 2, 'stroke-dasharray': d === 3 ? '5 3' : '' }, f.g);
      labs.push({ y: Math.max(f.m.t + 10, Math.min(f.H - f.m.b, f.Y(pCure(1e12, d)) + 4)), t: `${d} drug${d > 1 ? 's' : ''}`, c: cols[i] });
    });
    labs.sort((a, b) => a.y - b.y);
    for (let i = 1; i < labs.length; i++) if (labs[i].y - labs[i - 1].y < 14) labs[i].y = labs[i - 1].y + 14;
    labs.forEach((l) => CG.text(f.g, f.W - f.m.r + 4, l.y, l.t, l.c, 'start', 10));
    Lab.svg('line', { x1: f.X(M), x2: f.X(M), y1: f.m.t, y2: f.H - f.m.b, stroke: f.pal.rule, 'stroke-dasharray': '3 3' }, f.g);
    // where a tumour becomes detectable on a scan, about a centimetre across
    Lab.svg('line', { x1: f.X(1e9), x2: f.X(1e9), y1: f.m.t, y2: f.H - f.m.b, stroke: f.pal.ink3, 'stroke-width': 1, 'stroke-dasharray': '1 4' }, f.g);
    CG.text(f.g, f.X(1e9) + 5, f.m.t + 12, '1 cm lesion', f.pal.ink3, 'start', 10);
    CG.hover(svg, f, 1e5, 1e12, (m, sx, sy, px) => {
      const mm = Math.max(1e5, Math.min(1e12, m));
      tip.show(px * sx, (f.m.t + 14) * sy,
        `<b>${CG.sci(mm)} cells</b><br>` + [1, 2, 3].map((d) => `${d} drug${d > 1 ? 's' : ''}: ${(100 * pCure(mm, d)).toFixed(d === 1 ? 4 : 2)}% cure`).join('<br>'),
        (f.H - f.m.b) * sy);
    }, () => tip.hide(), true);
  }

  function drawCourse() {
    if (!cv.clientWidth) return;
    const narrow = cv.clientWidth < 420;
    const { ctx, w, h } = Lab.canvas(cv, narrow ? 0.8 : 0.58), pal = Lab.palette();
    ctx.clearRect(0, 0, w, h);
    const s1 = Lab.rgb('--s1'), s2 = Lab.rgb('--s2'), grid = Lab.rgb('--grid'), ink3 = Lab.rgb('--ink-3');
    const pad = 52, top = 26, bot = 40;
    const W = w - pad - 16, H = h - top - bot;
    // sensitive cells die at the treatment death rate; the resistant clone keeps growing
    const dTreat = 0.17, net = K.bBozic - K.dBozic;
    const R0 = Math.max(1e-9, expected(M, 1));
    const DAYS = 1500;
    const burden = (t) => M * Math.exp(-(dTreat - K.bBozic) * t) + R0 * Math.exp(net * t);
    const yLo = Math.log10(Math.max(1e-2, Math.min(R0, burden(0), ...Array.from({ length: 200 }, (_, i) => burden((i / 199) * DAYS))))) - 0.4;
    const yHi = Math.log10(M) + 0.6;
    const X = (t) => pad + (t / DAYS) * W;
    const Y = (v) => top + H - ((Math.log10(Math.max(Math.pow(10, yLo), v)) - yLo) / (yHi - yLo)) * H;
    ctx.strokeStyle = Lab.rgbStr(grid, 1); ctx.lineWidth = 1;
    for (let e = Math.ceil(yLo); e <= Math.floor(yHi); e++) {
      const y = Y(Math.pow(10, e));
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - 16, y); ctx.stroke();
      ctx.font = `10px ${Lab.css('--f-mono')}`; ctx.fillStyle = pal.ink3; ctx.textAlign = 'right';
      ctx.fillText(CG.sci(Math.pow(10, e)), pad - 6, y + 3); ctx.textAlign = 'left';
    }
    const line = (fn, col, wd, alpha, dash) => {
      ctx.strokeStyle = Lab.rgbStr(col, alpha); ctx.lineWidth = wd; ctx.setLineDash(dash || []);
      ctx.beginPath();
      for (let i = 0; i <= 300; i++) { const t = (i / 300) * DAYS; const y = Y(fn(t)); if (i) ctx.lineTo(X(t), y); else ctx.moveTo(X(t), y); }
      ctx.stroke(); ctx.setLineDash([]);
    };
    // total burden underneath, then the two populations that make it up
    line(burden, s1, 5, 0.42);
    line((t) => M * Math.exp(-(dTreat - K.bBozic) * t), ink3, 1.4, 0.9, [4, 3]);
    line((t) => R0 * Math.exp(net * t), s2, 1.8, 0.95);
    ctx.font = `11px ${Lab.css('--f-mono')}`;
    ctx.fillStyle = pal.ink3; ctx.fillText('sensitive cells', X(DAYS * 0.09), Y(M * Math.exp(-(dTreat - K.bBozic) * DAYS * 0.09)) + 16);
    ctx.fillStyle = pal.s2; ctx.fillText('resistant clone', X(DAYS * 0.62), Y(R0 * Math.exp(net * DAYS * 0.62)) + 17);
    ctx.fillStyle = pal.s1; ctx.fillText('total burden', X(DAYS * 0.3), Y(burden(DAYS * 0.3)) - 9);
    // time to the nadir and to relapse back to the starting size
    let nadirT = 0, nadirV = burden(0);
    for (let i = 0; i <= DAYS; i++) { const v = burden(i); if (v < nadirV) { nadirV = v; nadirT = i; } }
    const VISIBLE = 1e9;
    let relapse = DAYS; for (let i = nadirT; i <= DAYS; i++) if (burden(i) >= VISIBLE) { relapse = i; break; }
    [[nadirT, 'nadir'], [relapse, 'back to 1 cm']].forEach(([t, lab]) => {
      if (t <= 0 || t >= DAYS) return;
      ctx.strokeStyle = Lab.rgbStr(ink3, 0.6); ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X(t), top); ctx.lineTo(X(t), top + H); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = pal.ink3;
      const txt = `${lab} ${(t / 30).toFixed(0)} mo`;
      const tw = ctx.measureText(txt).width;
      ctx.fillText(txt, Math.min(w - 16 - tw, X(t) + 4), top + 12);
    });
    ctx.fillStyle = pal.ink3;
    ctx.fillText('months of treatment', pad, h - 8);
    ctx.textAlign = 'right';
    for (const mo of [0, 12, 24, 36, 48]) if (mo * 30 <= DAYS) ctx.fillText(String(mo), X(mo * 30) + 8, h - 24);
    ctx.textAlign = 'left';
    return { nadirT, nadirV, relapse };
  }

  function render() {
    if (!ready) return;
    drawChart(); const c = drawCourse();
    const X1 = expected(M, 1), X2 = expected(M, 2), X3 = expected(M, 3);
    out.innerHTML = [
      `<span>cells already resistant to one drug <b>${X1 < 0.01 ? X1.toExponential(1) : CG.num(X1)}</b></span>`,
      `<span>chance of cure, 1 / 2 / 3 drugs <b>${(100 * Math.exp(-X1)).toFixed(2)}% / ${(100 * Math.exp(-X2)).toFixed(2)}% / ${(100 * Math.exp(-X3)).toFixed(2)}%</b></span>`,
      `<span>effective per-site rate <span class="nocase">&mu;</span> <b>${CG.sci(muOf(M))}</b></span>`,
      c && c.relapse < 1500 ? `<span>back to a 1 cm lesion <b>${(c.relapse / 30).toFixed(0)} months</b></span>` : '<span>still below 1 cm at 50 months</span>',
      nx > 0 ? `<span class="warn">${nx} mutation${nx > 1 ? 's' : ''} confer${nx > 1 ? '' : 's'} resistance to every drug, so adding drugs buys nothing</span>` : '',
    ].join('');
  }

  Lab.slider(Lab.$('#re-m', root), (v) => CG.sci(Math.pow(10, v)), (v) => { M = Math.pow(10, v); render(); });
  Lab.slider(Lab.$('#re-n', root), (v) => String(v), (v) => { n = v; render(); });
  Lab.slider(Lab.$('#re-u', root), (v) => CG.sci(Math.pow(10, v)), (v) => { u = Math.pow(10, v); render(); });
  Lab.slider(Lab.$('#re-x', root), (v) => (v === 0 ? 'none' : String(v)), (v) => { nx = v; render(); });
  ready = true; render();
  Lab.onTheme(render); Lab.onResize(svg, render); Lab.onResize(cv, render);
})();

/* ---------------------------------------------------------------- Fig 10.1 */
(function () {
  const root = Lab.$('#fig-ctdna');
  if (!root) return;
  const svg = Lab.$('svg.cd-chart', root), cv = Lab.$('canvas.cd-cv', root);
  const out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
  const NG_PER_ML = 10;                       // nanograms of cell-free DNA per millilitre of plasma
  const PANELS = [1, 16, 500];
  const KMIN = 2;                             // detection calls for at least two mutant molecules
  let f0 = 1e-5, sites = 16, ml = 10, err = 1e-8, ready = false;

  const genomes = () => (ml * NG_PER_ML * 1000) / CG.K.pgPerGenome;
  const pDetect = (frac, s) => {
    const N = Math.round(genomes() * s);
    if (N < KMIN) return 0;
    return CG.binomUpper(KMIN, N, Math.min(0.5, frac / 2));
  };
  const pFalse = (s) => {
    const N = Math.round(genomes() * s);
    return N < KMIN ? 0 : CG.binomUpper(KMIN, N, err);
  };

  function drawChart() {
    const f = CG.frame(svg, {
      h: 330, m: { l: 52, r: 68, t: 26, b: 44 }, x: [1e-6, 0.1], y: [0, 1], xlog: true,
      xt: [1e-6, 1e-5, 1e-4, 1e-3, 1e-2, 0.1], yt: [0, 0.25, 0.5, 0.75, 1],
      xf: (v) => CG.sci(v), yf: (v) => (v * 100).toFixed(0) + '%',
      xl: 'tumour fraction of the cell-free DNA', yl: 'chance of calling the tumour present',
    });
    const cols = [f.pal.ink3, f.pal.s1, f.pal.s2];
    const curves = PANELS.map((s, i) => ({ s, c: cols[i] }));
    if (!PANELS.includes(sites)) curves.push({ s: sites, c: f.pal.accent });
    const labs = [];
    curves.forEach(({ s, c }) => {
      const pts = [];
      for (let k = 0; k <= 160; k++) { const x = Math.pow(10, -6 + (k / 160) * 5); pts.push([x, pDetect(x, s)]); }
      const on = s === sites;
      Lab.svg('path', { d: CG.path(pts, f.X, f.Y), fill: 'none', stroke: c, 'stroke-width': on ? 2.6 : 1.6, opacity: on ? 1 : 0.7 }, f.g);
      // label each curve where it crosses half, which is a different fraction for each panel size
      let xh = 0.1;
      for (let k = 0; k <= 200; k++) { const x = Math.pow(10, -6 + (k / 200) * 5); if (pDetect(x, s) >= 0.5) { xh = x; break; } }
      labs.push({ x: f.X(xh), y: f.Y(0.5) - 9, t: `${CG.num(s)} site${s > 1 ? 's' : ''}`, c, w: (String(s).length + 6) * 5.6 });
    });
    labs.sort((a, b) => a.x - b.x);
    for (let i = 1; i < labs.length; i++) if (labs[i].x - labs[i - 1].x < (labs[i].w + labs[i - 1].w) / 2 + 8) labs[i].y = labs[i - 1].y - 15;
    labs.forEach((l) => CG.text(f.g, l.x, Math.max(f.m.t + 10, l.y), l.t, l.c, 'middle', 10));
    Lab.svg('line', { x1: f.m.l, x2: f.W - f.m.r, y1: f.Y(0.5), y2: f.Y(0.5), stroke: f.pal.grid }, f.g);
    // the false-positive level for the chosen panel
    const fp = pFalse(sites);
    Lab.svg('line', { x1: f.m.l, x2: f.W - f.m.r, y1: f.Y(fp), y2: f.Y(fp), stroke: f.pal.signal, 'stroke-width': 1.2, 'stroke-dasharray': '5 3' }, f.g);
    CG.text(f.g, f.m.l + 4, f.Y(fp) + (fp > 0.85 ? 15 : -6), `false positives from error: ${(100 * fp).toFixed(fp < 0.01 ? 4 : 1)}%`, f.pal.signal, 'start', 10);
    Lab.svg('line', { x1: f.X(f0), x2: f.X(f0), y1: f.m.t, y2: f.H - f.m.b, stroke: f.pal.rule, 'stroke-dasharray': '3 3' }, f.g);
    CG.hover(svg, f, 1e-6, 0.1, (x, sx, sy, px) => {
      const xx = Math.max(1e-6, Math.min(0.1, x));
      tip.show(px * sx, (f.m.t + 14) * sy,
        `<b>tumour fraction ${CG.sci(xx)}</b><br>` + PANELS.map((s) => `${s} site${s > 1 ? 's' : ''}: ${(100 * pDetect(xx, s)).toFixed(1)}%`).join('<br>'),
        (f.H - f.m.b) * sy);
    }, () => tip.hide(), true);
  }

  function drawTube() {
    if (!cv.clientWidth) return;
    const narrow = cv.clientWidth < 420;
    const { ctx, w, h } = Lab.canvas(cv, narrow ? 0.95 : 0.66), pal = Lab.palette();
    ctx.clearRect(0, 0, w, h);
    const grid = Lab.rgb('--grid'), signal = Lab.rgb('--signal'), s1 = Lab.rgb('--s1');
    const pad = 16, top = 30;
    const GE = genomes();
    // a grid of 2000 squares, each standing for the same number of molecules
    const cols = narrow ? 40 : 60, rowsN = 22;
    const cellW = (w - pad * 2) / cols, cellH = Math.min((h - top - 42) / rowsN, cellW);
    const total = cols * rowsN;
    const perCell = GE / total;
    const tumourCells = Math.round((f0 * total));
    const expMut = GE * sites * (f0 / 2);
    for (let i = 0; i < total; i++) {
      const x = pad + (i % cols) * cellW, y = top + Math.floor(i / cols) * cellH;
      ctx.fillStyle = Lab.rgbStr(i < tumourCells ? s1 : grid, i < tumourCells ? 0.9 : 0.8);
      ctx.fillRect(x + 0.5, y + 0.5, cellW - 1, cellH - 1);
    }
    ctx.font = `11px ${Lab.css('--f-mono')}`; ctx.fillStyle = pal.ink3;
    ctx.fillText(`${CG.num(Math.round(GE))} genome copies in ${ml} mL, one square ≈ ${perCell < 1 ? perCell.toFixed(2) : CG.num(Math.round(perCell))}`, pad, 16);
    const y0 = top + rowsN * cellH + 20;
    ctx.fillStyle = Lab.rgbStr(s1, 0.9); ctx.fillRect(pad, y0 - 9, 9, 9);
    ctx.fillStyle = pal.ink2;
    ctx.fillText(tumourCells >= 1 ? `tumour-derived, ${(100 * f0).toFixed(f0 < 1e-3 ? 4 : 2)}%` : `tumour-derived: less than one square at ${(100 * f0).toFixed(4)}%`, pad + 15, y0);
    ctx.fillStyle = pal.ink3;
    ctx.font = `11px ${Lab.css('--f-mono')}`;
    ctx.fillText(`tracking ${CG.num(sites)} site${sites > 1 ? 's' : ''} gives ${CG.num(Math.round(GE * sites))} molecules in all`, pad, y0 + 20);
    ctx.fillStyle = Lab.rgbStr(signal, 1);
    ctx.font = `500 15px ${Lab.css('--f-mono')}`;
    ctx.fillText(`${expMut < 10 ? expMut.toFixed(2) : CG.num(Math.round(expMut))} mutant molecules expected`, pad, y0 + 42);
  }

  function render() {
    if (!ready) return;
    drawChart(); drawTube();
    const GE = genomes();
    const yieldMol = GE * sites * (f0 / 2);
    const p = pDetect(f0, sites), fp = pFalse(sites);
    // the fraction at which this panel reaches 95% detection
    let lod = null;
    for (let k = 0; k <= 200; k++) { const x = Math.pow(10, -7 + (k / 200) * 6); if (pDetect(x, sites) >= 0.95) { lod = x; break; } }
    out.innerHTML = [
      `<span>genome copies available <b>${CG.num(Math.round(GE))}</b></span>`,
      `<span>mutant molecules expected <b>${yieldMol < 10 ? yieldMol.toFixed(2) : CG.num(Math.round(yieldMol))}</b></span>`,
      `<span>chance of detection <b>${(100 * p).toFixed(1)}%</b></span>`,
      `<span>limit of detection at 95% <b>${lod ? CG.sci(lod) : 'not reached'}</b></span>`,
      `<span>false positive from error alone <b>${(100 * fp).toFixed(fp < 0.01 ? 3 : 1)}%</b></span>`,
      fp > 0.01 ? '<span class="warn">the error floor is now above the signal: this panel would call healthy plasma positive</span>' : '',
    ].join('');
  }

  Lab.slider(Lab.$('#cd-f', root), (v) => CG.sci(Math.pow(10, v)), (v) => { f0 = Math.pow(10, v); render(); });
  Lab.slider(Lab.$('#cd-s', root), (v) => CG.num(Math.max(1, Math.round(Math.pow(10, v)))), (v) => { sites = Math.max(1, Math.round(Math.pow(10, v))); render(); });
  Lab.slider(Lab.$('#cd-ml', root), (v) => v.toFixed(1) + ' mL', (v) => { ml = v; render(); });
  Lab.slider(Lab.$('#cd-err', root), (v) => CG.sci(Math.pow(10, v)), (v) => { err = Math.pow(10, v); render(); });
  ready = true; render();
  Lab.onTheme(render); Lab.onResize(svg, render); Lab.onResize(cv, render);
})();
