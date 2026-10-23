/* Volume X figures: IVD clinical performance (sample size, predictive value) and software classification. */
(function () {
  const T = (g, x, y, s, fill, anchor, size) => RG.text(g, x, y, s, fill, anchor, size);
  const pct = (v, d = 1) => (v * 100).toFixed(d) + '%';

  /* ---------- Fig 4.1 How many positive samples? ---------- */
  (function () {
    const root = Lab.$('#fig-n');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    const st = { p: 0.95, target: 0.9 };
    let ready = false;
    function draw() {
      if (!ready) return;
      const f = RG.frame(svg, { h: 320, m: { l: 50, r: 16, t: 30, b: 42 }, x: [10, 2000], xlog: true, y: [0.6, 1], xt: [10, 30, 100, 300, 1000, 2000], yt: [0.6, 0.7, 0.8, 0.9, 1], yf: (v) => Math.round(v * 100) + '%', xl: 'number of positive samples tested', yl: 'Observed sensitivity and its 95% confidence interval' });
      const lo = [], hi = [];
      for (let i = 0; i <= 160; i++) { const n = 10 * Math.pow(200, i / 160), [a, b] = RG.wilson(st.p * n, n); lo.push([n, a]); hi.push([n, b]); }
      Lab.svg('path', { d: RG.path(lo, f.X, f.Y) + 'L' + hi.slice().reverse().map((p) => f.X(p[0]).toFixed(1) + ' ' + f.Y(p[1]).toFixed(1)).join('L') + 'Z', fill: Lab.rgbStr(Lab.rgb('--s1'), 0.14), stroke: 'none' }, f.g);
      Lab.svg('path', { d: RG.path(lo, f.X, f.Y), fill: 'none', stroke: f.pal.s1, 'stroke-width': 2 }, f.g);
      Lab.svg('line', { x1: f.m.l, x2: f.W - f.m.r, y1: f.Y(st.p), y2: f.Y(st.p), stroke: f.pal.ink2 }, f.g);
      Lab.svg('line', { x1: f.m.l, x2: f.W - f.m.r, y1: f.Y(st.target), y2: f.Y(st.target), stroke: f.pal.s2, 'stroke-dasharray': '6 4', 'stroke-width': 1.6 }, f.g);
      T(f.g, f.W - f.m.r - 4, f.Y(st.target) + 14, `acceptance: lower bound ≥ ${pct(st.target, 0)}`, f.pal.ink2, 'end', 10.5);
      T(f.g, f.X(12), f.Y(st.p) - 6, `observed ${pct(st.p)}`, f.pal.ink2, 'start', 10.5);
      T(f.g, f.X(14), f.Y(lo[8][1]) + 16, 'lower bound', f.pal.ink2, 'start', 10.5);
      const n = RG.sampleSize(st.p, st.target);
      if (n && n <= 2000) { Lab.svg('line', { x1: f.X(n), x2: f.X(n), y1: f.m.t, y2: f.H - f.m.b, stroke: f.pal.ink, 'stroke-dasharray': '3 3' }, f.g); T(f.g, f.X(n) + 5, f.m.t + 12, `${n} samples`, f.pal.ink, 'start', 11); }
      RG.hover(svg, f, 10, 2000, () => {}, () => tip.hide());
      const hit = svg.lastChild; hit.addEventListener('mousemove', (e) => { const r = svg.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * f.W, t = (px - f.m.l) / (f.W - f.m.l - f.m.r), nn = Math.round(10 * Math.pow(200, t)), [a, b] = RG.wilson(Math.round(st.p * nn), nn); tip.show(e.clientX - r.left, (f.Y(b) / f.H) * r.height - 8, `<b>${nn} positives</b><br>95% CI ${pct(a)}–${pct(b)}`, (f.Y(a) / f.H) * r.height + 12); });
      out.innerHTML = `<span>positive samples needed <b>${n ? n : 'more than 20,000'}</b></span><span>if the disease affects 5% of those enrolled, total enrolment <b>${n ? Math.ceil(n / 0.05).toLocaleString() : '—'}</b></span>`;
    }
    Lab.slider(Lab.$('#nn-p', root), (v) => pct(v, 1), (v) => { st.p = v; draw(); });
    Lab.slider(Lab.$('#nn-t', root), (v) => pct(v, 0), (v) => { st.target = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();

  /* ---------- Fig 4.2 Predictive value depends on prevalence ---------- */
  (function () {
    const root = Lab.$('#fig-ppv');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    const st = { se: 0.99, sp: 0.99, prev: 0.01 };
    let ready = false;
    function draw() {
      if (!ready) return;
      const f = RG.frame(svg, { h: 320, m: { l: 50, r: 16, t: 30, b: 42 }, x: [0.0001, 0.5], xlog: true, y: [0, 1], xt: [0.0001, 0.001, 0.01, 0.1, 0.5], yt: [0, 0.25, 0.5, 0.75, 1], xf: (v) => (v * 100 >= 1 ? v * 100 : +(v * 100).toPrecision(1)) + '%', yf: (v) => Math.round(v * 100) + '%', xl: 'prevalence: share of people tested who have the condition', yl: 'Chance that a result is right' });
      const P = [], N = [];
      for (let i = 0; i <= 160; i++) { const pr = 0.0001 * Math.pow(5000, i / 160); P.push([pr, RG.ppv(st.se, st.sp, pr)]); N.push([pr, RG.npv(st.se, st.sp, pr)]); }
      Lab.svg('path', { d: RG.path(N, f.X, f.Y), fill: 'none', stroke: f.pal.s3, 'stroke-width': 2 }, f.g);
      Lab.svg('path', { d: RG.path(P, f.X, f.Y), fill: 'none', stroke: f.pal.s1, 'stroke-width': 2.2 }, f.g);
      T(f.g, f.X(0.0003), f.Y(N[20][1]) + 16, 'negative result is right (NPV)', f.pal.ink2, 'start', 10.5);
      const lp = P.find((p) => p[1] > 0.5) || P[P.length - 1];
      T(f.g, f.X(lp[0]) + 8, f.Y(lp[1]) + 4, 'positive result is right (PPV)', f.pal.ink2, 'start', 10.5);
      Lab.svg('line', { x1: f.X(st.prev), x2: f.X(st.prev), y1: f.m.t, y2: f.H - f.m.b, stroke: f.pal.ink3, 'stroke-dasharray': '3 3' }, f.g);
      const ppv = RG.ppv(st.se, st.sp, st.prev), npv = RG.npv(st.se, st.sp, st.prev);
      Lab.svg('circle', { cx: f.X(st.prev), cy: f.Y(ppv), r: 5, fill: f.pal.s1, stroke: f.pal.paper, 'stroke-width': 2 }, f.g);
      RG.hover(svg, f, 0.0001, 0.5, () => {}, () => tip.hide());
      const hit = svg.lastChild; hit.addEventListener('mousemove', (e) => { const r = svg.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * f.W, t = (px - f.m.l) / (f.W - f.m.l - f.m.r), pr = 0.0001 * Math.pow(5000, t), v = RG.ppv(st.se, st.sp, pr); tip.show(e.clientX - r.left, (f.Y(v) / f.H) * r.height - 8, `<b>prevalence ${pct(pr, pr < 0.01 ? 2 : 1)}</b><br>PPV ${pct(v)}<br>NPV ${pct(RG.npv(st.se, st.sp, pr), 2)}`, (f.Y(v) / f.H) * r.height + 12); });
      const per = 10000, tp = st.se * st.prev * per, fp = (1 - st.sp) * (1 - st.prev) * per, fn = (1 - st.se) * st.prev * per;
      out.innerHTML = `<span>PPV <b>${pct(ppv)}</b></span><span>NPV <b>${pct(npv, 2)}</b></span><span>per 10,000 tested: true positives <b>${tp.toFixed(0)}</b>, false positives <b>${fp.toFixed(0)}</b>, missed cases <b>${fn.toFixed(1)}</b></span>`;
    }
    Lab.slider(Lab.$('#pv-se', root), (v) => pct(v, 1), (v) => { st.se = v; draw(); });
    Lab.slider(Lab.$('#pv-sp', root), (v) => pct(v, 1), (v) => { st.sp = v; draw(); });
    Lab.slider(Lab.$('#pv-pr', root), (v) => { const p = Math.pow(10, v); return pct(p, p < 0.01 ? 2 : 1); }, (v) => { st.prev = Math.pow(10, v); draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();

  /* ---------- Fig 5.1 Classifying software ---------- */
  (function () {
    const root = Lab.$('#fig-sw');
    if (!root) return;
    const grid = Lab.$('.swgrid', root), out = Lab.$('.readouts', root);
    const SIT = [['critical', 'Critical', 'life-threatening, or treatment is time-critical'], ['serious', 'Serious', 'moderate progression; intervention usually needed'], ['non', 'Non-serious', 'slow progression; not time-critical']];
    const SIG = [['treat', 'Treat or diagnose'], ['drive', 'Drive clinical management'], ['inform', 'Inform clinical management']];
    const IMDRF = { critical: { treat: 'IV', drive: 'III', inform: 'II' }, serious: { treat: 'III', drive: 'II', inform: 'I' }, non: { treat: 'II', drive: 'I', inform: 'I' } };
    const MDR = { critical: { treat: 'III', drive: 'IIb', inform: 'IIa' }, serious: { treat: 'IIb', drive: 'IIa', inform: 'IIa' }, non: { treat: 'IIa', drive: 'IIa', inform: 'IIa' } };
    const EX = { 'critical,treat': 'software that reads a head CT and recommends whether to give a clot-dissolving drug', 'critical,drive': 'software that flags a suspected stroke on CT so a specialist sees it sooner (computer-aided triage)', 'critical,inform': 'software that shows a trend of vital signs for an intensive-care nurse to review', 'serious,treat': 'software that diagnoses diabetic retinopathy from retinal photographs', 'non,inform': 'an app that reminds a patient of their physician’s rehabilitation plan', 'serious,drive': 'software that suggests an insulin dose for a clinician to confirm', 'non,treat': 'software that screens skin photos for benign conditions' };
    let sel = ['critical', 'treat'];
    function render() {
      grid.innerHTML = '<div></div>' + SIG.map((s) => `<div class="swh">${s[1]}</div>`).join('');
      SIT.forEach(([k, name, desc]) => {
        grid.insertAdjacentHTML('beforeend', `<div class="swr"><b>${name}</b><span>${desc}</span></div>`);
        SIG.forEach(([s]) => {
          const b = Lab.el('button', { type: 'button', class: 'swc', 'aria-pressed': sel[0] === k && sel[1] === s ? 'true' : 'false', 'data-l': IMDRF[k][s] }, `<span class="im">IMDRF ${IMDRF[k][s]}</span><span class="md">MDR ${MDR[k][s]}</span>`);
          b.addEventListener('click', () => { sel = [k, s]; render(); });
          grid.appendChild(b);
        });
      });
      const [k, s] = sel, ex = EX[k + ',' + s];
      out.innerHTML = `<span>IMDRF category <b>${IMDRF[k][s]}</b></span><span>EU MDR class under Rule 11 (MDCG 2019-11) <b>${MDR[k][s]}</b></span>${ex ? `<span>for example: ${ex}</span>` : ''}`;
    }
    render();
  })();
})();
