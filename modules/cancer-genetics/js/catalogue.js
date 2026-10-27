/* Chapters 6-7. Fig 6.1: real COSMIC v3.4 signatures, mixed and then refitted by non-negative
   least squares. Fig 7.1: the binomial test for a driver gene, with and without a covariate model
   for the background mutation rate. */

/* ---------------------------------------------------------------- Fig 6.1 */
(function () {
  const root = Lab.$('#fig-sigs');
  if (!root) return;
  const cv = Lab.$('canvas.sg-cv', root), svg = Lab.$('svg.sg-fit', root);
  const out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
  const NAMES = Object.keys(CG.SIG);
  const BG = 'SBS5', BGW = 0.2;                 // the clock-like background every tumour carries
  const A = []; for (let i = 0; i < 96; i++) A.push(NAMES.map((n) => CG.SIG[n][i]));
  const selA = Lab.$('#sg-a', root), selB = Lab.$('#sg-b', root);
  NAMES.forEach((n) => {
    [selA, selB].forEach((s) => s.appendChild(Lab.el('option', { value: n }, `${n} · ${CG.SIGNOTE[n][0]}`)));
  });
  selA.value = 'SBS4'; selB.value = 'SBS1';
  let w1 = 0.6, N = 3000, ready = false;

  const pois = (r, mu) => {
    if (mu <= 0) return 0;
    if (mu > 30) return Math.max(0, Math.round(mu + Math.sqrt(mu) * Lab.gauss(r)));
    const L = Math.exp(-mu); let k = 0, p = 1;
    do { k++; p *= r(); } while (p > L);
    return k - 1;
  };

  const truth = () => {
    const t = {};
    const a = selA.value, b = selB.value;
    const add = (k, v) => { t[k] = (t[k] || 0) + v; };
    add(a, (1 - BGW) * w1); add(b, (1 - BGW) * (1 - w1)); add(BG, BGW);
    return t;
  };

  const sample = () => {
    const t = truth(), exp = new Array(96).fill(0);
    Object.keys(t).forEach((k) => { for (let i = 0; i < 96; i++) exp[i] += t[k] * N * CG.SIG[k][i]; });
    const r = Lab.rng(2013);
    return { obs: exp.map((v) => pois(r, v)), exp, t };
  };

  function drawSpectrum(obs) {
    if (!cv.clientWidth) return;
    const narrow = cv.clientWidth < 460;
    const { ctx, w, h } = Lab.canvas(cv, narrow ? 0.72 : 0.42), pal = Lab.palette();
    ctx.clearRect(0, 0, w, h);
    const accent = Lab.rgb('--accent'), grid = Lab.rgb('--grid');
    const pad = 36, top = 26, bot = 30;
    const plotW = w - pad - 12, plotH = h - top - bot;
    const bw = plotW / 96;
    const mx = Math.max(1, ...obs);
    for (let s = 0; s < 6; s++) {
      const x0 = pad + s * 16 * bw;
      if (s % 2) { ctx.fillStyle = Lab.rgbStr(grid, 0.45); ctx.fillRect(x0, top, 16 * bw, plotH); }
      ctx.font = `500 11px ${Lab.css('--f-mono')}`; ctx.fillStyle = pal.ink2; ctx.textAlign = 'center';
      ctx.fillText(CG.SUBS[s], x0 + 8 * bw, top - 8);
    }
    ctx.textAlign = 'left';
    obs.forEach((v, i) => {
      const x = pad + i * bw, bh = (v / mx) * plotH;
      ctx.fillStyle = Lab.rgbStr(accent, 0.9);
      ctx.fillRect(x + bw * 0.12, top + plotH - bh, Math.max(1, bw * 0.76), bh);
    });
    ctx.strokeStyle = Lab.rgbStr(Lab.rgb('--ink-3'), 0.5); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, top + plotH); ctx.lineTo(w - 12, top + plotH); ctx.stroke();
    ctx.font = `10px ${Lab.css('--f-mono')}`; ctx.fillStyle = pal.ink3;
    ctx.save(); ctx.translate(pad - 8, top + plotH / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center';
    ctx.fillText('mutations', 0, 0); ctx.restore();
    ctx.textAlign = 'right'; ctx.fillText(String(mx), pad - 6, top + 8); ctx.textAlign = 'left';
    ctx.fillText('96 trinucleotide channels, grouped by substitution class', pad, h - 8);
  }

  function drawFit(fit, t, cos) {
    const rows = NAMES.map((n, j) => ({ n, fit: fit[j], tru: t[n] || 0 }))
      .filter((d) => d.fit > 0.015 || d.tru > 0.005)
      .sort((a, b) => Math.max(b.fit, b.tru) - Math.max(a.fit, a.tru));
    const f = CG.frame(svg, {
      h: 84 + rows.length * 30, m: { l: 80, r: 58, t: 36, b: 42 }, x: [0, Math.max(0.7, Math.max(...rows.map((d) => Math.max(d.fit, d.tru))) * 1.12)], y: [0, 1],
      xt: [0, 0.2, 0.4, 0.6, 0.8], xf: (v) => (v * 100).toFixed(0) + '%', xl: 'share of the catalogue',
    });
    const s1 = f.pal.s1, s2 = f.pal.s2;
    rows.forEach((d, i) => {
      const y = f.m.t + 4 + i * 30;
      CG.text(f.g, f.m.l - 8, y + 16, d.n, d.tru > 0.005 ? f.pal.ink : f.pal.s2, 'end');
      Lab.svg('rect', { x: f.m.l, y, width: Math.max(0.5, f.X(d.tru) - f.m.l), height: 10, fill: s1, opacity: 0.85 }, f.g);
      Lab.svg('rect', { x: f.m.l, y: y + 12, width: Math.max(0.5, f.X(d.fit) - f.m.l), height: 10, fill: s2, opacity: 0.85 }, f.g);
      CG.text(f.g, Math.max(f.X(d.tru), f.X(d.fit)) + 6, y + 16, `${(100 * d.fit).toFixed(0)}%`, f.pal.ink2);
    });
    Lab.svg('rect', { x: f.m.l, y: f.m.t - 17, width: 14, height: 7, fill: s1, opacity: 0.85 }, f.g);
    CG.text(f.g, f.m.l + 19, f.m.t - 10, 'generated', s1, 'start', 10);
    Lab.svg('rect', { x: f.m.l + 92, y: f.m.t - 17, width: 14, height: 7, fill: s2, opacity: 0.85 }, f.g);
    CG.text(f.g, f.m.l + 111, f.m.t - 10, 'recovered', s2, 'start', 10);
    void cos;
    const hit = Lab.svg('rect', { x: f.m.l, y: f.m.t, width: f.W - f.m.l - f.m.r, height: f.H - f.m.t - f.m.b, fill: 'transparent' }, svg);
    hit.addEventListener('mousemove', (e) => {
      const r = svg.getBoundingClientRect(), py = ((e.clientY - r.top) / r.height) * f.H;
      const i = Math.floor((py - f.m.t - 4) / 30);
      if (i < 0 || i >= rows.length) { tip.hide(); return; }
      const d = rows[i];
      tip.show(e.clientX - r.left, (f.m.t + 4 + i * 30) * (r.height / f.H),
        `<b>${d.n} · ${CG.SIGNOTE[d.n][0]}</b><br>${CG.SIGNOTE[d.n][1]}<br>generated ${(100 * d.tru).toFixed(1)}%, recovered ${(100 * d.fit).toFixed(1)}%`,
        (f.m.t + 24 + i * 30) * (r.height / f.H));
    });
    hit.addEventListener('mouseleave', () => tip.hide());
  }

  function render() {
    if (!ready) return;
    const { obs, t } = sample();
    drawSpectrum(obs);
    const x = CG.nnls(A, obs);
    const tot = x.reduce((a, b) => a + b, 0) || 1;
    const fit = x.map((v) => v / tot);
    const rec = new Array(96).fill(0);
    for (let i = 0; i < 96; i++) for (let j = 0; j < NAMES.length; j++) rec[i] += A[i][j] * x[j];
    const cos = CG.cosine(obs, rec);
    drawFit(fit, t, cos);
    const spurious = NAMES.filter((n, j) => fit[j] > 0.02 && !(t[n] > 0.005));
    const missed = Object.keys(t).filter((n) => t[n] > 0.05 && fit[NAMES.indexOf(n)] < 0.5 * t[n]);
    out.innerHTML = [
      `<span>mutations in the catalogue <b>${CG.num(N)}</b></span>`,
      `<span>cosine similarity of the refit <b>${cos.toFixed(4)}</b></span>`,
      `<span>largest error in a true weight <b>${(100 * Math.max(...Object.keys(t).map((n) => Math.abs(fit[NAMES.indexOf(n)] - t[n])))).toFixed(1)} points</b></span>`,
      spurious.length ? `<span class="warn">signatures invented by the fit <b>${spurious.join(', ')}</b></span>` : '<span>no spurious signatures</span>',
      missed.length ? `<span class="warn">lost by the fit <b>${missed.join(', ')}</b></span>` : '',
    ].join('');
  }

  [selA, selB].forEach((s) => s.addEventListener('change', render));
  Lab.slider(Lab.$('#sg-w', root), (v) => v.toFixed(0) + '%', (v) => { w1 = v / 100; render(); });
  Lab.slider(Lab.$('#sg-n', root), (v) => CG.num(Math.round(Math.pow(10, v))), (v) => { N = Math.round(Math.pow(10, v)); render(); });
  ready = true; render();
  Lab.onTheme(render); Lab.onResize(cv, render); Lab.onResize(svg, render);
})();

/* ---------------------------------------------------------------- Fig 7.1 */
(function () {
  const root = Lab.$('#fig-drivers');
  if (!root) return;
  const sc = Lab.$('svg.dr-chart', root), qs = Lab.$('svg.dr-q', root);
  const out = Lab.$('.readouts', root);
  const tipS = Lab.tip(sc.parentElement), tipQ = Lab.tip(qs.parentElement);
  const cov = Lab.$('#dr-cov', root);
  const NGENE = 20000;                   // the real number of tests a study performs
  const ALPHA = 0.1;
  let T = 400, mu = 1e-6, ready = false;

  // the real covariate effect: late-replicating, lowly expressed regions mutate more
  const covOf = (g) => Math.exp(1.2 * (g.rt - 0.5) - 0.8 * (g.expr - 0.5));
  const MEANCOV = CG.GENES.reduce((a, g) => a + covOf(g), 0) / CG.GENES.length;

  const pois = (r, m) => {
    if (m <= 0) return 0;
    if (m > 30) return Math.max(0, Math.round(m + Math.sqrt(m) * Lab.gauss(r)));
    const L = Math.exp(-m); let k = 0, p = 1;
    do { k++; p *= r(); } while (p > L);
    return k - 1;
  };

  const build = () => {
    const r = Lab.rng(2013);
    const rows = CG.GENES.map((g) => {
      const lamTrue = T * mu * covOf(g) * g.len;
      const obs = Math.min(T, pois(r, lamTrue) + Math.round((g.exc * T) / 400));
      const lamModel = T * mu * (cov.checked ? covOf(g) : MEANCOV) * g.len;
      const q = 1 - Math.exp(-lamModel / T);
      const p = Math.max(1e-300, CG.binomUpper(obs, T, q));
      return { ...g, obs, lamTrue, lamModel, p };
    });
    // Benjamini-Hochberg over all NGENE tests: the rank of a small p among 20,000 mostly null
    // tests is about 1 + (NGENE - shown) * p, which is enough to place these genes.
    const sorted = rows.slice().sort((a, b) => a.p - b.p);
    sorted.forEach((d, i) => {
      const rank = Math.max(i + 1, 1 + (NGENE - rows.length) * d.p);
      d.q = Math.min(1, (d.p * NGENE) / rank);
    });
    let floor = 1;
    for (let i = sorted.length - 1; i >= 0; i--) { floor = Math.min(floor, sorted[i].q); sorted[i].q = floor; }
    return rows;
  };

  // the observed count at which a gene with expected count lam reaches p = ALPHA / NGENE
  const boundary = (lam) => {
    const target = ALPHA / NGENE;
    let k = Math.max(1, Math.ceil(lam));
    while (k < T && CG.poisUpper(k, lam) > target) k++;
    return k;
  };

  function drawScatter(rows) {
    const f = CG.frame(sc, {
      h: 330, m: { l: 52, r: 70, t: 26, b: 44 }, x: [0.03, 300], y: [0.3, 400], xlog: true, ylog: true,
      xt: [0.1, 1, 10, 100], yt: [1, 10, 100],
      xf: (v) => String(v), yf: (v) => String(v),
      xl: 'mutations expected under the background model', yl: 'tumours with a mutation',
    });
    // the diagonal and the significance boundary
    const diag = [], bnd = [];
    for (let i = 0; i <= 90; i++) { const l = Math.pow(10, -1.5 + (i / 90) * 3.98); diag.push([l, Math.max(0.3, l)]); bnd.push([l, boundary(l)]); }
    Lab.svg('path', { d: CG.path(diag, f.X, f.Y), fill: 'none', stroke: f.pal.rule, 'stroke-width': 1.2 }, f.g);
    Lab.svg('path', { d: CG.path(bnd, f.X, f.Y), fill: 'none', stroke: f.pal.ink, 'stroke-width': 1.5, 'stroke-dasharray': '6 4' }, f.g);
    // place the gene labels so they do not sit on top of one another
    const placed = [];
    const free = (x, y, w) => !placed.some((b) => x < b.x + b.w + 3 && b.x < x + w + 3 && Math.abs(y - b.y) < 11);
    rows.forEach((d) => {
      const col = d.drv ? f.pal.s1 : d.len > 8000 ? f.pal.s2 : f.pal.ink3;
      const cx = f.X(Math.max(0.03, d.lamModel)), cy = f.Y(Math.max(0.3, d.obs));
      Lab.svg('circle', { cx, cy, r: 4, fill: col, stroke: f.pal.paper, 'stroke-width': 1 }, f.g);
      if (!(d.q < ALPHA || d.len > 20000 || d.drv)) return;
      const w = d.g.length * 5.6;
      const spots = [[cx + 7, cy + 3.5, 'start'], [cx - 7 - w, cy + 3.5, 'start'], [cx - w / 2, cy - 9, 'start'], [cx - w / 2, cy + 15, 'start'], [cx + 7, cy - 9, 'start'], [cx + 7, cy + 15, 'start']];
      const spot = spots.find(([x, y]) => free(x, y, w) && x > f.m.l && x + w < f.W - f.m.r) || spots[0];
      placed.push({ x: spot[0], y: spot[1], w });
      CG.text(f.g, spot[0], spot[1], d.g, col, 'start', 10);
    });
    const ly = f.H - f.m.b, lx = f.W - f.m.r - 4;
    CG.text(f.g, lx, ly - 40, 'cancer genes', f.pal.s1, 'end', 10);
    CG.text(f.g, lx, ly - 26, 'long, late-replicating, silent', f.pal.s2, 'end', 10);
    Lab.svg('line', { x1: lx - 112, x2: lx - 94, y1: ly - 16, y2: ly - 16, stroke: f.pal.ink, 'stroke-width': 1.5, 'stroke-dasharray': '6 4' }, f.g);
    CG.text(f.g, lx, ly - 12, 'significance boundary', f.pal.ink, 'end', 10);
    const hit = Lab.svg('rect', { x: f.m.l, y: f.m.t, width: f.W - f.m.l - f.m.r, height: f.H - f.m.t - f.m.b, fill: 'transparent' }, sc);
    hit.addEventListener('mousemove', (e) => {
      const r = sc.getBoundingClientRect(), sx = r.width / f.W, sy = r.height / f.H;
      let best = null, bd = 1e9;
      rows.forEach((d) => {
        const dx = f.X(Math.max(0.03, d.lamModel)) * sx - (e.clientX - r.left), dy = f.Y(Math.max(0.3, d.obs)) * sy - (e.clientY - r.top);
        const dd = dx * dx + dy * dy;
        if (dd < bd) { bd = dd; best = d; }
      });
      if (!best || bd > 900) { tipS.hide(); return; }
      tipS.show(f.X(Math.max(0.03, best.lamModel)) * sx, f.Y(Math.max(0.3, best.obs)) * sy - 8,
        `<b>${best.g}</b><br>${CG.num(best.len)} coding bases<br>expected ${best.lamModel.toFixed(2)}, observed ${best.obs}<br>q = ${best.q < 1e-4 ? best.q.toExponential(1) : best.q.toFixed(4)}`,
        f.Y(Math.max(0.3, best.obs)) * sy + 14);
    });
    hit.addEventListener('mouseleave', () => tipS.hide());
  }

  function drawQ(rows) {
    const ranked = rows.slice().sort((a, b) => a.q - b.q).slice(0, 16);
    const XMAX = Math.max(4, Math.min(15, -Math.log10(Math.max(1e-40, ranked[0].q)) * 1.1));
    const step = XMAX > 12 ? 5 : 2;
    const ticks = []; for (let v = 0; v <= XMAX; v += step) ticks.push(v);
    const f = CG.frame(qs, {
      h: 300, m: { l: 74, r: 24, t: 26, b: 42 }, x: [0, XMAX], y: [0, 1],
      xt: ticks, xf: (v) => String(v),
      xl: 'minus log10 of q, corrected for 20,000 genes',
    });
    const bh = (f.H - f.m.t - f.m.b) / ranked.length;
    ranked.forEach((d, i) => {
      const y = f.m.t + i * bh;
      const col = d.drv ? f.pal.s1 : d.len > 8000 ? f.pal.s2 : f.pal.ink3;
      const v = Math.max(0, Math.min(XMAX, -Math.log10(Math.max(1e-40, d.q))));
      const full = -Math.log10(Math.max(1e-300, d.q)) > XMAX;
      Lab.svg('rect', { x: f.m.l, y: y + 1.5, width: Math.max(0.5, f.X(v) - f.m.l), height: bh - 3, fill: col, opacity: 0.85 }, f.g);
      if (full) CG.text(f.g, f.X(XMAX) - 4, y + bh / 2 + 3.5, 'off scale', f.pal.paper, 'end', 9);
      CG.text(f.g, f.m.l - 7, y + bh / 2 + 3.5, d.g, f.pal.ink2, 'end', 10);
    });
    if (XMAX > 1) {
      Lab.svg('line', { x1: f.X(1), x2: f.X(1), y1: f.m.t, y2: f.H - f.m.b, stroke: f.pal.ink, 'stroke-dasharray': '4 3' }, f.g);
      CG.text(f.g, f.X(1) + 5, f.m.t - 8, 'q = 0.1', f.pal.ink);
    }
    const hit = Lab.svg('rect', { x: f.m.l, y: f.m.t, width: f.W - f.m.l - f.m.r, height: f.H - f.m.t - f.m.b, fill: 'transparent' }, qs);
    hit.addEventListener('mousemove', (e) => {
      const r = qs.getBoundingClientRect(), i = Math.floor((((e.clientY - r.top) / r.height) * f.H - f.m.t) / bh);
      if (i < 0 || i >= ranked.length) { tipQ.hide(); return; }
      const d = ranked[i];
      tipQ.show(e.clientX - r.left, (f.m.t + i * bh) * (r.height / f.H),
        `<b>${d.g}</b><br>${d.drv ? 'a real cancer gene' : 'not a cancer gene'}<br>q = ${d.q < 1e-4 ? d.q.toExponential(2) : d.q.toFixed(4)}`,
        (f.m.t + (i + 1) * bh) * (r.height / f.H));
    });
    hit.addEventListener('mouseleave', () => tipQ.hide());
  }

  function render() {
    if (!ready) return;
    const rows = build();
    drawScatter(rows); drawQ(rows);
    const hits = rows.filter((d) => d.q < ALPHA);
    const fp = hits.filter((d) => !d.drv);
    const tp = hits.filter((d) => d.drv);
    const ttn = rows.find((d) => d.g === 'TTN');
    out.innerHTML = [
      `<span>cancer genes recovered <b>${tp.length} of ${rows.filter((d) => d.drv).length}</b></span>`,
      fp.length ? `<span class="warn">false positives <b>${fp.map((d) => d.g).join(', ')}</b></span>` : '<span>no false positives</span>',
      `<span>TTN: expected <b>${ttn.lamModel.toFixed(1)}</b>, observed <b>${ttn.obs}</b>, q <b>${ttn.q < 1e-3 ? ttn.q.toExponential(1) : ttn.q.toFixed(3)}</b></span>`,
      `<span>covariate spread in the background rate <b>${(Math.max(...CG.GENES.map(covOf)) / Math.min(...CG.GENES.map(covOf))).toFixed(1)}×</b></span>`,
      `<span>cohort <b>${CG.num(T)} tumours</b></span>`,
    ].join('');
  }

  cov.addEventListener('change', render);
  Lab.slider(Lab.$('#dr-t', root), (v) => CG.num(Math.round(Math.pow(10, v))), (v) => { T = Math.round(Math.pow(10, v)); render(); });
  Lab.slider(Lab.$('#dr-mu', root), (v) => CG.sci(Math.pow(10, v)), (v) => { mu = Math.pow(10, v); render(); });
  ready = true; render();
  Lab.onTheme(render); Lab.onResize(sc, render);
})();
