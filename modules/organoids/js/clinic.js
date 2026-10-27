/* Volume XIII figures, Part III a: forskolin-induced swelling of cystic fibrosis organoids, and selection of
   engineered tumor organoids by withdrawing niche factors. */
(function () {
  const T = (g, x, y, s, fill, anchor, size) => OG.text(g, x, y, s, fill, anchor, size);
  const pct = (v) => Math.round(v * 100) + '%';

  /* ---------- Fig 5.1 Forskolin-induced swelling ---------- */
  (function () {
    const root = Lab.$('#fig-fis');
    if (!root) return;
    const cv = Lab.$('.fis-cv', root), svg = Lab.$('.fis-chart', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    // CFTR activity as a fraction of a healthy channel, by genotype and treatment (illustrative values)
    const ACT = {
      wt: { none: 1, iva: 1.1, corr: 1, combo: 1.1 },
      f508: { none: 0.02, iva: 0.03, corr: 0.07, combo: 0.1 },
      g551: { none: 0.03, iva: 0.35, corr: 0.05, combo: 0.4 },
      rare: { none: 0.12, iva: 0.3, corr: 0.18, combo: 0.4 },
      none0: { none: 0, iva: 0, corr: 0, combo: 0 },
    };
    const NAMES = { none: 'untreated', iva: 'potentiator', corr: 'corrector', combo: 'corrector + potentiator' };
    const EC50 = 0.1, KR = 0.86, CAP = 2.2, RMAXR = 55; // µM forskolin, µm/min per unit activity, area limit, largest starting radius
    const st = { g: 'rare', d: 'combo', F: 0.128 };
    const r = Lab.rng(8), ORG = Array.from({ length: 15 }, () => ({ x: r(), y: r(), r0: 25 + 30 * r() }));
    // swelling rate: CFTR activity scaled by the forskolin dose-response curve, converted to radial growth
    const rate = (f) => KR * f * (st.F / (st.F + EC50));
    const relArea = (r0, f, t) => Math.min(CAP, ((r0 + rate(f) * t) / r0) ** 2);
    const meanCurve = (f) => { const pts = []; for (let t = 0; t <= 60; t += 1) pts.push([t, ORG.reduce((s, o) => s + relArea(o.r0, f, t), 0) / ORG.length]); return pts; };
    const auc = (pts) => pts.reduce((s, p, i) => (i ? s + ((p[1] + pts[i - 1][1]) / 2 - 1) * 100 * (p[0] - pts[i - 1][0]) : 0), 0);
    let ready = false;
    function draw() {
      if (!ready) return;
      const fT = ACT[st.g][st.d], f0 = ACT[st.g].none, pal = Lab.palette();
      if (cv.clientWidth) {
        const { ctx, w, h } = Lab.canvas(cv, 0.72); ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = Lab.rgbStr(Lab.rgb('--gel'), 0.3); ctx.fillRect(0, 0, w, h);
        const cw = w / 5, ch = (h - 26) / 3, maxR = Math.min(cw, ch) * 0.46;
        // scale the field so that the most swollen organoid fills its cell, with a floor so that weak swelling is still visible
        const grow = Math.max(1.4, relArea(RMAXR, fT, 60));
        const sc = maxR / (RMAXR * Math.sqrt(grow)), s1 = Lab.rgb('--s1');
        ORG.forEach((o, i) => {
          const col = i % 5, row = Math.floor(i / 5);
          const cx = (col + 0.5) * cw, cy = (row + 0.5) * ch + 4;
          const R0 = o.r0 * sc, R1 = R0 * Math.sqrt(relArea(o.r0, fT, 60));
          ctx.fillStyle = Lab.rgbStr(s1, 0.14); ctx.strokeStyle = Lab.rgbStr(s1, 1); ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.arc(cx, cy, R1, 0, 7); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = pal.ink3; ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
        });
        ctx.font = `11px ${Lab.css('--f-mono')}`; ctx.fillStyle = pal.ink2; ctx.fillText('dashed: 0 min · filled: 60 min', 8, h - 7);
        const bw = 100 * sc; ctx.strokeStyle = pal.ink2; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(w - 8 - bw, h - 11); ctx.lineTo(w - 8, h - 11); ctx.stroke();
        ctx.textAlign = 'right'; ctx.fillText('100 µm', w - 12 - bw, h - 7); ctx.textAlign = 'start';
      }
      const cT = meanCurve(fT), c0 = meanCurve(f0);
      const f = OG.frame(svg, { h: 290, m: { l: 50, r: 14, t: 30, b: 42 }, x: [0, 60], y: [0.9, 2.3], xt: [0, 10, 20, 30, 40, 50, 60], yt: [1, 1.5, 2], yf: (v) => Math.round(v * 100) + '%', xl: 'Minutes after forskolin', yl: 'Organoid area, relative to start' });
      Lab.svg('path', { d: OG.path(c0, f.X, f.Y), fill: 'none', stroke: f.pal.ink3, 'stroke-width': 1.6, 'stroke-dasharray': '5 4' }, f.g);
      Lab.svg('path', { d: OG.path(cT, f.X, f.Y), fill: 'none', stroke: f.pal.s1, 'stroke-width': 2 }, f.g);
      T(f.g, f.X(60) - 4, f.Y(cT[60][1]) - 8, NAMES[st.d], f.pal.ink2, 'end', 10.5);
      if (st.d !== 'none') T(f.g, f.X(60) - 4, f.Y(c0[60][1]) + (c0[60][1] > cT[60][1] - 0.1 ? 18 : -8), 'untreated', f.pal.ink3, 'end', 10.5);
      OG.hover(svg, f, 0, 60, (x, sx, sy, px) => { const i = Math.max(0, Math.min(60, Math.round(x))); tip.show(px, f.Y(cT[i][1]) * sy - 8, `<b>${i} min</b><br>${NAMES[st.d]} ${Math.round(cT[i][1] * 100)}%<br>untreated ${Math.round(c0[i][1] * 100)}%`, f.Y(cT[i][1]) * sy + 12); }, () => tip.hide());
      const aT = auc(cT), a0 = auc(c0), aW = auc(meanCurve(ACT.wt.none));
      out.innerHTML = `<span>CFTR activity <b>${pct(fT)} of normal</b></span><span>swelling AUC, ${NAMES[st.d]} <b>${Math.round(aT)}</b></span><span>untreated <b>${Math.round(a0)}</b></span><span>healthy control at this dose <b>${Math.round(aW)}</b></span>`;
    }
    Lab.$('#fs-g', root).addEventListener('change', (e) => { st.g = e.target.value; draw(); });
    Lab.$('#fs-d', root).addEventListener('change', (e) => { st.d = e.target.value; draw(); });
    // log-spaced forskolin slider: the input holds a log10 position, the output shows µM
    const fIn = Lab.$('#fs-f', root);
    fIn.min = Math.log10(0.008); fIn.max = Math.log10(5); fIn.step = 0.01; fIn.value = Math.log10(0.128);
    Lab.slider(fIn, (v) => { const x = 10 ** v; return (x < 0.1 ? x.toFixed(3) : x < 1 ? x.toFixed(2) : x.toFixed(1)) + ' µM'; }, (v) => { st.F = 10 ** v; draw(); });
    st.g = Lab.$('#fs-g', root).value; st.d = Lab.$('#fs-d', root).value;
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();

  /* ---------- Fig 6.1 Selecting engineered organoids by withdrawing niche factors ---------- */
  (function () {
    const root = Lab.$('#fig-select');
    if (!root) return;
    const svg = Lab.$('.sel-chart', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    const GENES = ['APC', 'KRAS', 'TP53', 'SMAD4'], MAXP = 8;
    const st = { wnt: false, egf: true, nog: true, nut: true, e: 0.15, p: 4 };
    let ready = false;
    // a genotype is a 4-bit mask: 1 APC lost, 2 KRAS activated, 4 TP53 lost, 8 SMAD4 lost.
    // APC loss replaces Wnt and R-spondin, KRAS replaces EGF, SMAD4 loss replaces Noggin, TP53 loss survives nutlin-3.
    const fits = (g) => (st.wnt || (g & 1)) && (st.egf || (g & 2)) && (st.nog || (g & 8)) && (!st.nut || (g & 4));
    const bits = (g) => (g & 1) + ((g >> 1) & 1) + ((g >> 2) & 1) + ((g >> 3) & 1);
    const label = (g) => (g === 0 ? 'unedited' : GENES.filter((_, i) => g & (1 << i)).join(' + '));
    // shares span many orders of magnitude: show a percentage when it is readable, otherwise scientific notation
    const fmtShare = (v) => (v >= 0.005 ? pct(v) : v < 2e-6 ? '< 10⁻⁵' : Lab.fmt.sci(v));
    function simulate() {
      let fr = []; for (let g = 0; g < 16; g++) fr.push(st.e ** bits(g) * (1 - st.e) ** (4 - bits(g)));
      const hist = [fr.slice()];
      for (let p = 1; p <= MAXP; p++) { const nx = fr.map((x, g) => x * (fits(g) ? 3 : 0.1)), s = nx.reduce((a, b) => a + b, 0); fr = nx.map((x) => x / s); hist.push(fr.slice()); }
      return hist;
    }
    function draw() {
      if (!ready) return;
      const hist = simulate(), MIN = 1e-6;
      // group the sixteen genotypes by how many of the four genes they carry
      const series = [0, 1, 2, 3, 4].map((k) => hist.map((fr, p) => [p, Math.max(MIN, fr.reduce((s, x, g) => (bits(g) === k ? s + x : s), 0))]));
      const f = OG.frame(svg, { h: 320, m: { l: 52, r: 128, t: 30, b: 42 }, x: [0, MAXP], y: [MIN, 1], ylog: true, xt: [0, 1, 2, 3, 4, 5, 6, 7, 8], yt: [1e-6, 1e-4, 1e-2, 1], yf: Lab.fmt.sci, xl: 'Passages in the selecting medium', yl: 'Share of the culture (log scale)' });
      const cols = [f.pal.ink3, f.pal.s3, f.pal.s2, f.pal.signal, f.pal.s1];
      Lab.svg('line', { x1: f.X(st.p), x2: f.X(st.p), y1: f.m.t, y2: f.H - f.m.b, stroke: f.pal.ink, 'stroke-dasharray': '3 3' }, f.g);
      series.forEach((pts, k) => Lab.svg('path', { d: OG.path(pts, f.X, f.Y), fill: 'none', stroke: cols[k], 'stroke-width': k === 4 ? 2.4 : 1.8 }, f.g));
      // end labels, pushed apart so that curves ending at similar shares do not overlap
      const labs = series.map((pts, k) => ({ k, y0: f.Y(pts[MAXP][1]), y: f.Y(pts[MAXP][1]) })).sort((a, b) => a.y - b.y);
      let prev = -Infinity;
      labs.forEach((l) => { l.y = Math.max(l.y, prev + 14, f.m.t + 6); prev = l.y; });
      const over = labs[labs.length - 1].y - (f.H - f.m.b);
      if (over > 0) labs.forEach((l) => { l.y -= over; });
      labs.forEach((l) => {
        T(f.g, f.W - f.m.r + 10, l.y + 4, `${l.k} mutation${l.k === 1 ? '' : 's'}`, f.pal.ink2, 'start', 10.5);
        Lab.svg('path', { d: `M${f.W - f.m.r} ${l.y0}L${f.W - f.m.r + 6} ${l.y}`, fill: 'none', stroke: cols[l.k], 'stroke-width': 1.6 }, f.g);
      });
      OG.hover(svg, f, 0, MAXP, (x, sx, sy, px) => {
        const p = Math.max(0, Math.min(MAXP, Math.round(x))), fr = hist[p];
        const rows = series.map((s, k) => `${k}: ${fmtShare(s[p][1])}`).join('<br>');
        void fr; tip.show(f.X(p) * sx, f.m.t * sy + 10, `<b>passage ${p}</b><br>${rows}`, f.m.t * sy + 10);
      }, () => tip.hide());
      const survivors = []; for (let g = 0; g < 16; g++) if (fits(g)) survivors.push(label(g));
      const quad = hist[st.p][15], top = (() => { let b = 0; for (let g = 1; g < 16; g++) if (hist[st.p][g] > hist[st.p][b]) b = g; return b; })();
      out.innerHTML = `<span>genotypes that can grow <b>${survivors.length === 16 ? 'all 16 (nothing is selected)' : survivors.length + ': ' + survivors.slice(0, 3).join(', ') + (survivors.length > 3 ? ', …' : '')}</b></span>`
        + `<span>at passage ${st.p}, quadruple mutants <b>${fmtShare(quad)}</b></span>`
        + `<span>most common genotype <b>${label(top)}</b></span>`;
    }
    Lab.$$('#se-med .chip', root).forEach((b) => b.addEventListener('click', () => {
      const key = b.dataset.f, on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', on ? 'true' : 'false'); st[key] = on; draw();
    }));
    Lab.slider(Lab.$('#se-e', root), (v) => pct(v), (v) => { st.e = v; draw(); });
    Lab.slider(Lab.$('#se-p', root), (v) => String(v), (v) => { st.p = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();
})();
