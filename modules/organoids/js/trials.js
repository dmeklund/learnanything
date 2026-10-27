/* Volume XIII figures, Part III b: predictive values of an organoid drug test, and statistical power when organoids
   are grown in batches. */
(function () {
  const T = (g, x, y, s, fill, anchor, size) => OG.text(g, x, y, s, fill, anchor, size);
  const pct = (v) => Math.round(v * 100) + '%';
  // standard normal CDF (Abramowitz and Stegun 26.2.17) and its inverse by bisection
  const Phi = (z) => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), p = 0.3989423 * Math.exp(-z * z / 2) * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z >= 0 ? 1 - p : p; };
  const PhiInv = (p) => { let lo = -9, hi = 9; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (Phi(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; };

  /* ---------- Fig 6.2 Does the organoid predict the patient? ---------- */
  (function () {
    const root = Lab.$('#fig-predict');
    if (!root) return;
    const svg = Lab.$('.pred-chart', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    const N = 60;
    const st = { c: 0.7, p: 0.25, t: 0.55 };
    let ready = false;
    // each patient has a latent sensitivity z (standard normal). The patient responds if z is above the quantile set
    // by the response rate. The organoid's viability reflects the same z with correlation c, mapped onto 0.15–0.95.
    function cohort() {
      const r = Lab.rng(12), zc = PhiInv(1 - st.p), list = [];
      for (let i = 0; i < N; i++) {
        const z = Lab.gauss(r), e = Lab.gauss(r);
        const zo = st.c * z + Math.sqrt(1 - st.c * st.c) * e;
        list.push({ z, resp: z > zc, via: 0.15 + 0.8 * Phi(-zo), id: i });
      }
      return list;
    }
    function draw() {
      if (!ready) return;
      const list = cohort();
      const called = (o) => o.via < st.t;
      let tp = 0, fp = 0, tn = 0, fn = 0;
      list.forEach((o) => { if (called(o)) (o.resp ? tp++ : fp++); else (o.resp ? fn++ : tn++); });
      const f = OG.frame(svg, { h: 330, m: { l: 56, r: 16, t: 30, b: 56 }, x: [-0.5, N - 0.5], y: [0.1, 1], xt: [], yt: [0.2, 0.4, 0.6, 0.8, 1], yf: (v) => v.toFixed(1), xl: 'Patients, ordered by organoid viability', yl: 'Organoid viability under the drug (AUC)' });
      Lab.svg('line', { x1: f.X(-0.5), x2: f.X(N - 0.5), y1: f.Y(st.t), y2: f.Y(st.t), stroke: f.pal.ink, 'stroke-dasharray': '5 4', 'stroke-width': 1.4 }, f.g);
      T(f.g, f.X(-0.5) + 4, f.Y(st.t) - 7, 'cutoff: organoid called sensitive below this line', f.pal.ink2, 'start', 10.5);
      const sorted = list.slice().sort((a, b) => a.via - b.via);
      sorted.forEach((o, i) => {
        o.px = f.X(i); o.py = f.Y(o.via);
        Lab.svg('circle', { cx: o.px, cy: o.py, r: 4.2, fill: o.resp ? f.pal.s1 : f.pal.s2, 'fill-opacity': 0.85, stroke: f.pal.paper3, 'stroke-width': 1.2 }, f.g);
      });
      [['responded in the clinic', f.pal.s1, 0], ['did not respond', f.pal.s2, 1]].forEach(([lab, col, i]) => {
        const x = f.m.l + 2 + i * 180, y = f.H - 14;
        Lab.svg('circle', { cx: x + 5, cy: y - 4, r: 4.2, fill: col }, f.g); T(f.g, x + 14, y, lab, f.pal.ink2, 'start', 10.5);
      });
      OG.hover(svg, f, -0.5, N - 0.5, (x, sx, sy, px) => {
        const i = Math.max(0, Math.min(N - 1, Math.round(x))), o = sorted[i];
        tip.show(o.px * sx, o.py * sy - 8, `<b>patient ${o.id + 1}</b><br>organoid AUC ${o.via.toFixed(2)} · called ${o.via < st.t ? 'sensitive' : 'resistant'}<br>clinically ${o.resp ? 'responded' : 'did not respond'}`, o.py * sy + 12);
      }, () => tip.hide());
      const ppv = tp + fp ? tp / (tp + fp) : NaN, npv = tn + fn ? tn / (tn + fn) : NaN;
      const sens = tp + fn ? tp / (tp + fn) : NaN, spec = tn + fp ? tn / (tn + fp) : NaN;
      const fmt = (v) => (isNaN(v) ? 'n/a' : pct(v));
      out.innerHTML = `<span>responders in this cohort <b>${tp + fn} of ${N}</b></span><span>sensitivity <b>${fmt(sens)}</b></span><span>specificity <b>${fmt(spec)}</b></span>`
        + `<span>PPV <b class="${ppv < 0.6 ? 'warn' : ''}">${fmt(ppv)}</b></span><span>NPV <b>${fmt(npv)}</b></span>`;
    }
    Lab.slider(Lab.$('#pr-c', root), (v) => v.toFixed(2), (v) => { st.c = v; draw(); });
    Lab.slider(Lab.$('#pr-p', root), (v) => pct(v), (v) => { st.p = v; draw(); });
    Lab.slider(Lab.$('#pr-t', root), (v) => v.toFixed(2), (v) => { st.t = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();

  /* ---------- Fig 7.1 Organoids, batches and statistical power ---------- */
  (function () {
    const root = Lab.$('#fig-power');
    if (!root) return;
    const svg = Lab.$('.pw-chart', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    const MMAX = 60;
    const st = { b: 6, m: 20, rho: 0.3, d: 0.8 };
    let ready = false;
    // Power of a two-sample t-test on batch means. The variance of a batch mean is rho + (1-rho)/m, so the effect in
    // units of that standard deviation is d / sqrt(rho + (1-rho)/m), with 2(b-1) degrees of freedom.
    // Student t tail by its relation to the incomplete beta function, evaluated with a continued fraction.
    function betacf(a, b, x) {
      let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
      if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d; let h = d;
      for (let m = 1; m <= 200; m++) {
        const m2 = 2 * m;
        let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
        d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
        c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
        d = 1 / d; h *= d * c;
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
        d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
        c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
        d = 1 / d; const del = d * c; h *= del;
        if (Math.abs(del - 1) < 3e-12) break;
      }
      return h;
    }
    const lgamma = (z) => { const g = [676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]; if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z); z -= 1; let x = 0.99999999999980993; for (let i = 0; i < 8; i++) x += g[i] / (z + i + 1); const t = z + 7.5; return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x); };
    const betai = (a, b, x) => { if (x <= 0) return 0; if (x >= 1) return 1; const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x)); return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b; };
    const tTail = (t, v) => 0.5 * betai(v / 2, 0.5, v / (v + t * t)); // one-sided P(T > t)
    const tCrit = (p, v) => { let lo = 0, hi = 60; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (tTail(m, v) > p) lo = m; else hi = m; } return (lo + hi) / 2; };
    // Power with a normal approximation to the noncentral t: P(T > tcrit) with T centered on the noncentrality.
    const power = (d, n, v) => { const tc = tCrit(0.025, v), ncp = d * Math.sqrt(n / 2); return 1 - Phi(tc - ncp) + Phi(-tc - ncp); };
    const correct = (m) => { const vUnit = st.rho + (1 - st.rho) / m; return power(st.d / Math.sqrt(vUnit), st.b, 2 * (st.b - 1)); };
    const naive = (m) => power(st.d, st.b * m, 2 * (st.b * m - 1));
    function draw() {
      if (!ready) return;
      const f = OG.frame(svg, { h: 320, m: { l: 52, r: 16, t: 30, b: 56 }, x: [1, MMAX], y: [0, 1], xt: [1, 10, 20, 30, 40, 50, 60], yt: [0, 0.2, 0.4, 0.6, 0.8, 1], yf: (v) => pct(v), xl: 'Organoids measured per batch', yl: 'Power to detect the effect (two-sided, α = 0.05)' });
      [0.8].forEach((lv) => { Lab.svg('line', { x1: f.X(1), x2: f.X(MMAX), y1: f.Y(lv), y2: f.Y(lv), stroke: f.pal.ink3, 'stroke-dasharray': '2 3' }, f.g); T(f.g, f.X(MMAX) - 4, f.Y(lv) - 6, '80%', f.pal.ink3, 'end', 10.5); });
      const pc = [], pn = [];
      for (let m = 1; m <= MMAX; m++) { pc.push([m, correct(m)]); pn.push([m, naive(m)]); }
      Lab.svg('path', { d: OG.path(pn, f.X, f.Y), fill: 'none', stroke: f.pal.s2, 'stroke-width': 1.8, 'stroke-dasharray': '5 4' }, f.g);
      Lab.svg('path', { d: OG.path(pc, f.X, f.Y), fill: 'none', stroke: f.pal.s1, 'stroke-width': 2.2 }, f.g);
      // the ceiling that no number of organoids per batch can pass
      const ceil = power(st.d / Math.sqrt(st.rho || 1e-9), st.b, 2 * (st.b - 1));
      if (st.rho > 0.01 && ceil < 0.985 && ceil > 0.03) { Lab.svg('line', { x1: f.X(1), x2: f.X(MMAX), y1: f.Y(ceil), y2: f.Y(ceil), stroke: f.pal.s1, 'stroke-dasharray': '1 3' }, f.g); T(f.g, f.X(MMAX) - 4, f.Y(ceil) - 7, `ceiling with these ${st.b} batches: ${pct(ceil)}`, f.pal.ink2, 'end', 10.5); }
      Lab.svg('circle', { cx: f.X(st.m), cy: f.Y(correct(st.m)), r: 4.5, fill: f.pal.s1, stroke: f.pal.paper3, 'stroke-width': 2 }, f.g);
      [['batch means (correct)', f.pal.s1, 0], ['every organoid counted as independent', f.pal.s2, 1]].forEach(([lab, col, i]) => {
        const x = f.m.l + 2 + i * 160, y = f.H - 14;
        Lab.svg('line', { x1: x, x2: x + 14, y1: y - 4, y2: y - 4, stroke: col, 'stroke-width': 2, 'stroke-dasharray': i ? '5 4' : '' }, f.g);
        T(f.g, x + 19, y, lab, f.pal.ink2, 'start', 10.5);
      });
      OG.hover(svg, f, 1, MMAX, (x, sx, sy, px) => { const m = Math.max(1, Math.min(MMAX, Math.round(x))); tip.show(px, f.Y(correct(m)) * sy - 8, `<b>${m} per batch</b><br>correct ${pct(correct(m))}<br>if wrongly pooled ${pct(naive(m))}`, f.Y(correct(m)) * sy + 12); }, () => tip.hide());
      const meff = st.m / (1 + (st.m - 1) * st.rho);
      out.innerHTML = `<span>organoids measured <b>${st.b * st.m} per condition</b></span><span>effective organoids per batch <b>${meff.toFixed(1)}</b> of ${st.m}</span>`
        + `<span>power <b class="${correct(st.m) < 0.8 ? 'warn' : ''}">${pct(correct(st.m))}</b></span><span>power if the batches are ignored <b>${pct(naive(st.m))}</b></span>`;
    }
    Lab.slider(Lab.$('#pw-b', root), (v) => String(v), (v) => { st.b = v; draw(); });
    Lab.slider(Lab.$('#pw-m', root), (v) => String(v), (v) => { st.m = v; draw(); });
    Lab.slider(Lab.$('#pw-r', root), (v) => v.toFixed(2), (v) => { st.rho = v; draw(); });
    Lab.slider(Lab.$('#pw-d', root), (v) => v.toFixed(2), (v) => { st.d = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();
})();
