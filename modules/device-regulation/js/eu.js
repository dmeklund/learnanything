/* Volume X figures: the EU MDR and IVDR transition, and postmarket signal detection with a CUSUM. */
(function () {
  const T = (g, x, y, s, fill, anchor, size) => RG.text(g, x, y, s, fill, anchor, size);

  /* ---------- Fig 6.1 The EU transition ---------- */
  (function () {
    const root = Lab.$('#fig-eu');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    const D = (s) => new Date(s + 'T00:00:00Z').getTime();
    const ROWS = [
      { grp: 'MDR (Regulation 2017/745)', name: 'Class III and implantable IIb', a: '2021-05-26', b: '2027-12-31', note: 'legacy MDD/AIMDD devices, if conditions met (Regulation 2023/607)' },
      { grp: 'MDR (Regulation 2017/745)', name: 'All other classes', a: '2021-05-26', b: '2028-12-31', note: 'non-implantable IIb, IIa, sterile or measuring class I, and up-classified devices; if conditions met (Regulation 2023/607)' },
      { grp: 'IVDR (Regulation 2017/746)', name: 'Class D', a: '2022-05-26', b: '2027-12-31', note: 'legacy IVDD devices (Regulation 2024/1860)' },
      { grp: 'IVDR (Regulation 2017/746)', name: 'Class C', a: '2022-05-26', b: '2028-12-31', note: 'legacy IVDD devices (Regulation 2024/1860)' },
      { grp: 'IVDR (Regulation 2017/746)', name: 'Class B and sterile A', a: '2022-05-26', b: '2029-12-31', note: 'legacy IVDD devices (Regulation 2024/1860)' },
    ];
    const MARKS = [
      { d: '2017-05-25', t: 'MDR and IVDR enter into force' },
      { d: '2021-05-26', t: 'MDR applies' },
      { d: '2022-05-26', t: 'IVDR applies' },
      { d: '2024-05-26', t: 'last date to apply to a notified body for MDR legacy devices' },
      { d: '2025-05-26', t: 'IVDR-compliant quality system required for legacy IVDs' },
      { d: '2026-05-28', t: 'EUDAMED registration of actors and devices mandatory' },
    ];
    function draw() {
      const W = Math.max(280, svg.clientWidth || 600), narrow = W < 560, lab = narrow ? 0 : 230, H = narrow ? 420 : 330;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H); svg.innerHTML = '';
      const pal = Lab.palette(), g = Lab.svg('g', {}, svg), x0 = lab + 10, x1 = W - 16, X = Lab.scale(D('2017-01-01'), D('2030-06-30'), x0, x1);
      const rowH = narrow ? 48 : 34, top = 34;
      for (let y = 2017; y <= 2030; y++) { const x = X(D(y + '-01-01')); Lab.svg('line', { x1: x, x2: x, y1: top - 6, y2: top + ROWS.length * rowH + 4, stroke: pal.grid }, g); if (!narrow || y % 2 === 1) T(g, x + 2, top - 12, y, pal.ink3, 'start', 10.5); }
      ROWS.forEach((r, i) => {
        const y = top + i * rowH + (narrow ? 18 : 6), bx = X(D(r.a)), ex = X(D(r.b));
        if (narrow) T(g, x0, y - 4, `${r.grp.split(' ')[0]}: ${r.name}`, pal.ink2, 'start', 10.5);
        else { T(g, lab, y + 12, r.name, pal.ink, 'end', 11); if (i === 0 || ROWS[i - 1].grp !== r.grp) T(g, lab, y - 2, r.grp, pal.ink3, 'end', 9.5); }
        const bar = Lab.svg('rect', { x: bx, y, width: ex - bx, height: 16, rx: 2, fill: r.grp.startsWith('MDR') ? pal.s1 : pal.s3, 'fill-opacity': 0.8 }, g);
        T(g, ex + 4, y + 12, r.b.slice(0, 4), pal.ink2, 'start', 10);
        bar.addEventListener('mousemove', (e) => { const b = svg.getBoundingClientRect(); tip.show(e.clientX - b.left, (y / H) * b.height - 6, `<b>${r.grp.split(' ')[0]} ${r.name}</b><br>may stay on the market under the old directive until ${new Date(D(r.b)).toUTCString().slice(5, 16)}<br>${r.note}`, ((y + 20) / H) * b.height); });
        bar.addEventListener('mouseleave', () => tip.hide());
      });
      const my = top + ROWS.length * rowH + 22;
      MARKS.forEach((m, i) => {
        const x = X(D(m.d)), y = my + (i % 3) * 16;
        Lab.svg('line', { x1: x, x2: x, y1: top - 6, y2: y - 10, stroke: pal.ink3, 'stroke-dasharray': '2 3' }, g);
        const c = Lab.svg('circle', { cx: x, cy: y - 6, r: 5, fill: pal.s2 }, g);
        c.addEventListener('mousemove', (e) => { const b = svg.getBoundingClientRect(); tip.show(e.clientX - b.left, ((y - 12) / H) * b.height, `<b>${new Date(D(m.d)).toUTCString().slice(5, 16)}</b><br>${m.t}`, (y / H) * b.height); });
        c.addEventListener('mouseleave', () => tip.hide());
      });
      const now = Date.now(), nx = X(Math.min(D('2030-06-30'), Math.max(D('2017-01-01'), now)));
      Lab.svg('line', { x1: nx, x2: nx, y1: top - 6, y2: top + ROWS.length * rowH + 4, stroke: pal.ink, 'stroke-width': 1.5 }, g);
      T(g, nx + 4, top + ROWS.length * rowH + 2, 'today', pal.ink, 'start', 10.5);
      T(g, x0, H - 6, 'Bars: how long legacy devices may stay on the market. Dots: milestones (hover).', pal.ink3, 'start', 10);
      const left = ROWS.map((r) => ({ n: r.name, d: Math.ceil((D(r.b) - now) / 86400000) }));
      out.innerHTML = left.map((l, i) => `<span>${ROWS[i].grp.split(' ')[0]} ${l.n}: <b>${l.d > 0 ? l.d.toLocaleString() + ' days left' : 'ended'}</b></span>`).join('');
    }
    draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();

  /* ---------- Fig 7.1 Spotting a signal in complaint data ---------- */
  (function () {
    const root = Lab.$('#fig-cusum');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    const M0 = 4, MONTHS = 48, CHANGE = 24;
    const st = { mult: 1.75, h: 5, seed: 4 };
    let ready = false;
    function sim() { const r = Lab.rng(st.seed * 97 + 11); return Array.from({ length: MONTHS }, (_, i) => RG.poisson(i >= CHANGE ? M0 * st.mult : M0, r)); }
    // average months to a false alarm when nothing has changed, by simulation
    function falseAlarmMonths() {
      const r = Lab.rng(7), m1 = M0 * Math.max(1.25, st.mult), k = (m1 - M0) / Math.log(m1 / M0); let tot = 0;
      for (let run = 0; run < 400; run++) { let s = 0, t = 0; while (t < 2000) { t++; s = Math.max(0, s + RG.poisson(M0, r) - k); if (s > st.h) break; } tot += t; }
      return tot / 400;
    }
    function draw() {
      if (!ready) return;
      const xs = sim(), c = RG.cusum(xs, M0, M0 * Math.max(1.25, st.mult), st.h);
      const W = Math.max(280, svg.clientWidth || 600), H = 360; svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H); svg.innerHTML = '';
      const pal = Lab.palette(), g = Lab.svg('g', {}, svg), m = { l: 44, r: 16 }, X = Lab.scale(-0.5, MONTHS - 0.5, m.l, W - m.r);
      const top = { t: 30, b: 160 }, bot = { t: 200, b: 320 }, ymax = Math.max(14, ...xs) + 1, Y1 = Lab.scale(0, ymax, top.b, top.t);
      const smax = Math.max(st.h * 1.6, ...c.S) + 0.5, Y2 = Lab.scale(0, smax, bot.b, bot.t);
      T(g, m.l, top.t - 10, 'Complaints of one failure mode per month (dashed: baseline of 4)', pal.ink2);
      T(g, m.l, bot.t - 10, 'CUSUM statistic: accumulated excess over the baseline', pal.ink2);
      [0, 5, 10].forEach((v) => { Lab.svg('line', { x1: m.l, x2: W - m.r, y1: Y1(v), y2: Y1(v), stroke: pal.grid }, g); T(g, m.l - 6, Y1(v) + 4, v, pal.ink3, 'end', 10.5); });
      Lab.svg('rect', { x: X(CHANGE - 0.5), y: top.t, width: X(MONTHS - 0.5) - X(CHANGE - 0.5), height: bot.b - top.t, fill: Lab.css('--accent-wash') }, g);
      T(g, X(CHANGE - 0.5) + 4, top.t + 12, st.mult > 1 ? `rate ×${st.mult.toFixed(2)} from month ${CHANGE + 1}` : 'no change', pal.ink3, 'start', 10.5);
      const bw = X(1) - X(0) - 2;
      xs.forEach((x, i) => { const r = Lab.svg('rect', { x: X(i) - bw / 2, y: Y1(x), width: bw, height: top.b - Y1(x), fill: pal.s1, 'fill-opacity': 0.75 }, g); r.addEventListener('mousemove', (e) => { const b = svg.getBoundingClientRect(); tip.show(e.clientX - b.left, (Y1(x) / H) * b.height - 6, `<b>month ${i + 1}</b><br>${x} complaints<br>CUSUM ${c.S[i].toFixed(2)}`, (top.b / H) * b.height); }); r.addEventListener('mouseleave', () => tip.hide()); });
      Lab.svg('line', { x1: m.l, x2: W - m.r, y1: Y1(M0), y2: Y1(M0), stroke: pal.ink3, 'stroke-dasharray': '4 3' }, g);
      [0, st.h].forEach((v) => T(g, m.l - 6, Y2(v) + 4, v.toFixed(0), pal.ink3, 'end', 10.5));
      Lab.svg('line', { x1: m.l, x2: W - m.r, y1: Y2(st.h), y2: Y2(st.h), stroke: pal.s2, 'stroke-dasharray': '6 4', 'stroke-width': 1.5 }, g);
      T(g, W - m.r - 4, Y2(st.h) - 5, 'alarm threshold h', pal.ink2, 'end', 10.5);
      Lab.svg('path', { d: c.S.map((s, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y2(s).toFixed(1)).join(''), fill: 'none', stroke: pal.s2, 'stroke-width': 2 }, g);
      Lab.svg('line', { x1: m.l, x2: W - m.r, y1: bot.b, y2: bot.b, stroke: pal.ink3 }, g);
      for (let mth = 0; mth < MONTHS; mth += 6) T(g, X(mth), bot.b + 16, mth + 1, pal.ink3, 'middle', 10.5);
      T(g, W - m.r, bot.b + 32, 'month', pal.ink2, 'end', 10.5);
      if (c.alarm >= 0) { Lab.svg('circle', { cx: X(c.alarm), cy: Y2(c.S[c.alarm]), r: 6, fill: pal.s2, stroke: pal.paper, 'stroke-width': 2 }, g); T(g, X(c.alarm) + 8, Y2(c.S[c.alarm]) - 6, `alarm, month ${c.alarm + 1}`, pal.ink, 'start', 11); }
      const fa = falseAlarmMonths(), delay = c.alarm >= CHANGE ? c.alarm - CHANGE + 1 : null;
      out.innerHTML = `<span>alarm <b>${c.alarm < 0 ? 'none in 48 months' : c.alarm < CHANGE ? `month ${c.alarm + 1} (false alarm)` : `month ${c.alarm + 1}, ${delay} after the change`}</b></span><span>reference value k <b>${c.k.toFixed(2)}</b></span><span>average months between false alarms at this h <b>${fa > 1999 ? '> 2,000' : Math.round(fa)}</b></span>`;
    }
    Lab.slider(Lab.$('#cu-m', root), (v) => '×' + v.toFixed(2), (v) => { st.mult = v; draw(); });
    Lab.slider(Lab.$('#cu-h', root), (v) => v.toFixed(1), (v) => { st.h = v; draw(); });
    Lab.$('#cu-s', root).addEventListener('click', () => { st.seed++; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();
})();
