/* Volume IV, history figures: Sanger reads and the cost of a genome. */
(function () {
  /* ---------- Fig 2.1 Chain termination: gel and capillary ---------- */
  (function () {
    const root = Lab.$('#fig-sanger');
    if (!root) return;
    const cv = Lab.$('canvas', root), out = Lab.$('.readouts', root), seqIn = Lab.$('#sg-seq', root);
    let seq = '', offset = 0, ready = false;
    const N = 30;
    const clean = () => (seqIn.value.toUpperCase().replace(/[^ACGT]/g, '') || 'GATTACA').slice(0, N);
    function draw() {
      if (!ready) return;
      const { ctx, w, h } = Lab.canvas(cv, (cv.clientWidth || 600) < 560 ? 1.05 : 0.5), pal = Lab.palette(), S = NG.scope();
      ctx.clearRect(0, 0, w, h);
      const narrow = w < 560, gw = narrow ? w : Math.min(240, w * 0.3), gh = narrow ? h * 0.48 : h;
      const ex = narrow ? 0 : gw + 18, ey = narrow ? gh + 14 : 0, ew = narrow ? w : w - ex, eh = narrow ? h - gh - 14 : h;
      const n = seq.length, rng = Lab.rng(7 + offset);
      // Gel: four lanes, smallest fragments run farthest. Migration falls with log(size).
      ctx.fillStyle = S.bg; ctx.fillRect(0, 0, gw, gh);
      const lanes = ['G', 'A', 'T', 'C'], lw = (gw - 40) / 4, top = 26, bot = gh - 10;
      // Fixed pixels per unit of log(size), set so the first 30 bases fill the gel; later bases crowd together.
      const K = (bot - top - 8) / (Math.log(n + 20) - Math.log(21));
      const gy = (len) => bot - 4 - K * (Math.log(len + 20) - Math.log(offset + 21));
      ctx.font = `600 11px ${Lab.css('--f-mono')}`; ctx.textAlign = 'center';
      lanes.forEach((b, i) => {
        const x = 30 + i * lw + lw / 2;
        ctx.fillStyle = NG.color(b); ctx.fillText('dd' + b, x, 16);
        ctx.fillStyle = Lab.rgbStr(Lab.rgb('--scope-ink'), 0.06); ctx.fillRect(x - lw * 0.38, top, lw * 0.76, bot - top);
      });
      for (let i = 0; i < n; i++) {
        const len = offset + i + 1, li = lanes.indexOf(seq[i]), x = 30 + li * lw + lw / 2, y = gy(len);
        const thick = Math.max(1.2, 3.2 - offset / 400);
        ctx.fillStyle = Lab.rgbStr(Lab.mix(NG.rgb(seq[i]), [255, 255, 255], 0.25), 0.65 + 0.35 * rng());
        ctx.fillRect(x - lw * 0.34, y - thick / 2, lw * 0.68, thick);
      }
      ctx.fillStyle = S.ink2; ctx.textAlign = 'left'; ctx.font = `10.5px ${Lab.css('--f-mono')}`;
      ctx.fillText('−', 6, top + 8); ctx.fillText('+', 6, bot - 2);
      ctx.save(); ctx.translate(14, (top + bot) / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText('read upward', 0, 0); ctx.restore();
      // Capillary electropherogram: one peak per fragment length, width growing with length.
      ctx.fillStyle = pal.paper3; ctx.fillRect(ex, ey, ew, eh); ctx.strokeStyle = pal.rule; ctx.strokeRect(ex + 0.5, ey + 0.5, ew - 1, eh - 1);
      const pad = 10, px0 = ex + pad, pw = ew - 2 * pad, base = ey + eh - 22, peakTop = ey + 34;
      const sp = pw / (n + 1), sig = (0.22 + offset * 0.0011 + offset * offset * 1.1e-6) * sp;
      const heights = Array.from(seq, () => 0.55 + 0.45 * rng());
      lanes.forEach((b) => {
        ctx.strokeStyle = NG.color(b); ctx.lineWidth = 1.6; ctx.beginPath();
        for (let x = 0; x <= pw; x += 1) {
          let v = 0;
          for (let i = 0; i < n; i++) if (seq[i] === b) { const d = x - (i + 1) * sp; v += heights[i] * Math.exp(-(d * d) / (2 * sig * sig)) * Math.min(1, 0.4 * sp / sig + 0.2); }
          const y = base - Math.min(1.1, v) * (base - peakTop);
          x ? ctx.lineTo(px0 + x, y) : ctx.moveTo(px0 + x, y);
        }
        ctx.stroke();
      });
      ctx.lineWidth = 1;
      // Base calls above each peak position, and the position scale beneath
      ctx.font = `600 ${Math.min(13, Math.max(9, sp * 0.8))}px ${Lab.css('--f-mono')}`; ctx.textAlign = 'center';
      const resolved = sig / sp < 0.42;
      for (let i = 0; i < n; i++) { ctx.fillStyle = resolved ? NG.color(seq[i]) : pal.ink3; ctx.fillText(resolved ? seq[i] : 'N', px0 + (i + 1) * sp, ey + 20); }
      ctx.font = `10.5px ${Lab.css('--f-mono')}`; ctx.fillStyle = pal.ink3;
      [0, Math.floor(n / 2), n - 1].forEach((i) => ctx.fillText(offset + i + 1, px0 + (i + 1) * sp, ey + eh - 6));
      out.innerHTML = `<span>bases <b>${offset + 1}–${offset + n}</b> of the read</span><span>peak width / spacing <b>${(sig / sp).toFixed(2)}</b></span><span>${resolved ? 'peaks resolved' : '<b class="warn">peaks merge: calls become N</b>'}</span>`;
    }
    seqIn.addEventListener('input', () => { seq = clean(); draw(); });
    Lab.slider(Lab.$('#sg-off', root), (v) => (v + 1) + '', (v) => { offset = v; draw(); });
    seq = clean(); ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(cv, draw);
  })();

  /* ---------- Fig 4.1 Cost per genome ---------- */
  (function () {
    const root = Lab.$('#fig-cost');
    if (!root) return;
    const wrap = Lab.$('.chart-wrap', root), svg = Lab.$('svg', root), tip = Lab.tip(wrap);
    // Cost per genome from NHGRI's Genome Sequencing Program table (May 2022 release), to three significant figures.
    const DATA = [[2001.67, 95300000], [2002.17, 70200000], [2002.67, 61400000], [2003.17, 53800000], [2003.75, 40200000], [2004.00, 28800000], [2004.25, 20400000], [2004.50, 19900000], [2004.75, 18500000], [2005.00, 17500000], [2005.25, 16200000], [2005.50, 16200000], [2005.75, 13800000], [2006.00, 12600000], [2006.25, 11700000], [2006.50, 11500000], [2006.75, 10500000], [2007.00, 9410000], [2007.25, 9050000], [2007.50, 8930000], [2007.75, 7150000], [2008.00, 3060000], [2008.25, 1350000], [2008.50, 752000], [2008.75, 343000], [2009.00, 233000], [2009.25, 155000], [2009.50, 108000], [2009.75, 70300], [2010.00, 46800], [2010.25, 31500], [2010.50, 31100], [2010.75, 29100], [2011.00, 21000], [2011.25, 16700], [2011.50, 10500], [2011.75, 7740], [2012.00, 7670], [2012.25, 5900], [2012.50, 5980], [2012.75, 6620], [2013.00, 5670], [2013.25, 5550], [2013.50, 5550], [2013.75, 5100], [2014.00, 4010], [2014.25, 4920], [2014.50, 4900], [2014.75, 5730], [2015.00, 3970], [2015.25, 4210], [2015.50, 1360], [2015.75, 1250], [2016.33, 1180], [2016.58, 1510], [2016.83, 1360], [2017.08, 1020], [2017.33, 1330], [2017.58, 1130], [2017.83, 1840], [2018.08, 1230], [2018.33, 1460], [2018.58, 1470], [2018.83, 1390], [2019.08, 993], [2019.33, 606], [2019.58, 942], [2019.83, 695], [2020.08, 645], [2020.33, 702], [2020.58, 689], [2020.83, 512], [2021.08, 851], [2021.33, 454], [2021.58, 562], [2021.83, 552], [2022.08, 525], [2022.33, 525]];
    const NGS = 2008.0;
    function draw() {
      const pal = Lab.palette(), W = Math.max(320, Math.round(wrap.clientWidth || 640)), H = Math.round(Math.min(360, W * 0.56));
      const L = 58, R = 16, T = 16, B = 34;
      svg.innerHTML = ''; svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H);
      const x = Lab.scale(2001, 2022.8, L, W - R), y = Lab.logScale(100, 1e8, H - B, T);
      [100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8].forEach((v) => {
        Lab.svg('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: pal.grid }, svg);
        Lab.svg('text', { x: L - 6, y: y(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: pal.ink3 }, svg).textContent = '$' + Lab.fmt.si(v).replace('.00', '');
      });
      for (let yr = 2002; yr <= 2022; yr += W < 520 ? 5 : 4) Lab.svg('text', { x: x(yr), y: H - B + 16, 'text-anchor': 'middle', 'font-size': 11, fill: pal.ink3 }, svg).textContent = yr;
      // Moore's law reference: halving every two years from the 2001 cost
      let d = '';
      for (let yr = 2001.7; yr <= 2022.4; yr += 0.25) d += (d ? 'L' : 'M') + x(yr).toFixed(1) + ' ' + y(95e6 * Math.pow(0.5, (yr - 2001.7) / 2)).toFixed(1);
      Lab.svg('path', { d, fill: 'none', stroke: pal.ink3, 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }, svg);
      Lab.svg('text', { x: x(2016.5), y: y(95e6 * Math.pow(0.5, (2016.5 - 2001.7) / 2)) - 8, 'font-size': 11, fill: pal.ink2, 'text-anchor': 'middle' }, svg).textContent = "Moore's law pace";
      Lab.svg('line', { x1: x(NGS), x2: x(NGS), y1: T, y2: H - B, stroke: pal.ink3, 'stroke-dasharray': '2 3' }, svg);
      Lab.svg('text', { x: x(NGS) + 5, y: T + 10, 'font-size': 11, fill: pal.ink2 }, svg).textContent = 'second-generation instruments take over';
      d = DATA.map(([t, v], i) => (i ? 'L' : 'M') + x(t).toFixed(1) + ' ' + y(v).toFixed(1)).join('');
      Lab.svg('path', { d, fill: 'none', stroke: pal.s1, 'stroke-width': 2 }, svg);
      DATA.forEach(([t, v], i) => {
        Lab.svg('circle', { cx: x(t), cy: y(v), r: 2.5, fill: pal.s1, stroke: pal.paper3, 'stroke-width': 1.5 }, svg);
        const hit = Lab.svg('circle', { cx: x(t), cy: y(v), r: 12, fill: 'transparent' }, svg);
        hit.addEventListener('pointermove', () => { const s = svg.getBoundingClientRect().width / W; tip.show(x(t) * s, y(v) * s, `<b>${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Math.round((t % 1) * 12)]} ${Math.floor(t)}</b><br>$${v >= 1e5 ? Lab.fmt.si(v) : Math.round(v).toLocaleString('en-US')} per genome`, y(v) * s + 14); });
        hit.addEventListener('pointerleave', () => tip.hide());
        if (i === 0 || i === DATA.length - 1) Lab.svg('text', { x: x(t) + (i ? -6 : 6), y: y(v) + (i ? 18 : -8), 'text-anchor': i ? 'end' : 'start', 'font-size': 11.5, fill: pal.ink }, svg).textContent = '$' + Lab.fmt.si(v);
      });
    }
    draw(); Lab.onTheme(draw); Lab.onResize(wrap, draw);
  })();
})();
