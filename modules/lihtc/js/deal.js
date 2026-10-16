/* Deal math: the hero capital stack, the credit calculator, the applicable
   percentage, and the investor's return. */
(function () {
  const money = (v, d = 1) => {
    const a = Math.abs(v), s = v < 0 ? '−' : '';
    if (a >= 1e6) return s + '$' + (a / 1e6).toFixed(d) + 'M';
    if (a >= 1e3) return s + '$' + Math.round(a / 1e3).toLocaleString() + 'k';
    return s + '$' + Math.round(a).toLocaleString();
  };
  const dollars = (v) => (v < 0 ? '−$' : '$') + Math.round(Math.abs(v)).toLocaleString();
  // Annual debt-service constant for a fully amortizing monthly-pay loan.
  const constant = (rate, years) => { const r = rate / 12, n = years * 12; return (12 * r) / (1 - Math.pow(1 + r, -n)); };

  /* A simplified sources-and-uses model of one LIHTC deal. */
  function deal(p) {
    const tdc = p.units * p.tdcPerUnit;
    const land = tdc * p.landPct, nonBasis = tdc * p.nonBasisPct;
    const eligible = tdc - land - nonBasis;
    const boosted = eligible * (p.boost ? 1.3 : 1);
    const qualified = boosted * p.lowIncPct;
    const rate = p.type === '4' ? 0.04 : 0.09;
    const annualMax = qualified * rate;
    const equityMax = annualMax * 10 * p.price;
    const noi = p.units * p.rent * 12 * 0.95 - p.units * p.opex;
    const loan = Math.max(0, noi / p.dscr / constant(p.rate, 35));
    // §42(m)(2): the agency may allocate no more credit than the deal needs to be feasible.
    const need = Math.max(0, tdc - loan);
    const equity = Math.min(equityMax, need);
    const annual = equity / p.price / 10;
    const gap = Math.max(0, tdc - loan - equity);
    return { tdc, land, nonBasis, eligible, boosted, qualified, rate, annualMax, equityMax, noi, loan, equity, annual, gap, trimmed: equityMax > need + 1, bondTest: 0.25 * (eligible + land) };
  }
  window.LI = { money, dollars, deal, constant };

  /* Two stacked bars, uses over sources, drawn into an SVG. */
  function stackSvg(svg, d, opts = {}) {
    const pal = Lab.palette();
    const W = 640, H = opts.compact ? 170 : 190, x0 = 92, x1 = W - 12, bh = 40;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = '';
    const x = Lab.scale(0, d.tdc, x0, x1);
    const rows = [
      { y: 26, label: 'Uses', segs: [['Land', d.land, pal.rule, pal.ink], ['Depreciable costs (eligible basis)', d.eligible, pal.ink3, pal.paper3], ['Other costs', d.nonBasis, pal.rule, pal.ink]] },
      { y: 26 + bh + 48, label: 'Sources', segs: [['Tax credit equity', d.equity, pal.s1, pal.paper3], ['Permanent loan', d.loan, pal.s2, pal.paper3], ['Gap', d.gap, pal.s3, pal.paper3]] },
    ];
    rows.forEach((r) => {
      const t = Lab.svg('text', { x: 0, y: r.y + bh / 2 + 4, 'font-size': 12, fill: pal.ink2 }, svg); t.textContent = r.label;
      let acc = 0;
      r.segs.forEach(([name, v, fill, ink]) => {
        if (v <= 0) return;
        const a = x(acc), b = x(acc + v), w = Math.max(0, b - a - 2);
        Lab.svg('rect', { x: a, y: r.y, width: w, height: bh, fill, rx: 2 }, svg);
        if (w > 64) {
          const lt = Lab.svg('text', { x: a + 8, y: r.y + 17, 'font-size': 11, fill: ink }, svg); lt.textContent = w > 150 ? name : name.split(' ')[0];
          const vt = Lab.svg('text', { x: a + 8, y: r.y + 32, 'font-size': 12, 'font-weight': 600, fill: ink }, svg); vt.textContent = money(v);
        }
        acc += v;
      });
    });
    const tot = Lab.svg('text', { x: x1, y: 16, 'text-anchor': 'end', 'font-size': 11, fill: pal.ink3 }, svg);
    tot.textContent = 'Total development cost ' + money(d.tdc);
    if (!opts.compact) {
      const gy = 26 + 2 * bh + 48 + 26;
      const g = Lab.svg('text', { x: x0, y: gy, 'font-size': 11.5, fill: pal.ink2 }, svg);
      g.textContent = d.gap > 0 ? `Gap of ${money(d.gap)} must come from soft loans, grants, or a deferred developer fee.` : 'No gap: equity and debt cover the full cost.';
    }
  }
  window.LI.stackSvg = stackSvg;

  /* ---------- Hero ---------- */
  const heroSvg = Lab.$('#hero-stack');
  if (heroSvg) {
    const P = { units: 60, tdcPerUnit: 400000, landPct: 0.06, nonBasisPct: 0.045, type: '9', boost: false, lowIncPct: 1, price: 0.88, rent: 1100, opex: 6800, rate: 0.065, dscr: 1.2 };
    const draw = () => stackSvg(heroSvg, deal(P), { compact: true });
    draw(); Lab.onTheme(draw);
  }

  /* ---------- Fig 8.2 Credit calculator ---------- */
  const root = Lab.$('#fig-calc');
  if (root) {
    const P = { units: 60, tdcPerUnit: 400000, landPct: 0.06, nonBasisPct: 0.045, type: '9', boost: false, lowIncPct: 1, price: 0.88, rent: 1100, opex: 6800, rate: 0.065, dscr: 1.2 };
    const lines = Lab.$('.form-lines tbody', root), svg = Lab.$('svg', root), ro = Lab.$('.readouts', root);
    let ready = false;
    function draw() {
      if (!ready) return;
      const d = deal(P);
      const L = [
        ['1', 'Total development cost', dollars(d.tdc)],
        ['2', 'Less land', '(' + dollars(d.land) + ')'],
        ['3', 'Less non-depreciable costs (reserves, syndication, perm loan fees)', '(' + dollars(d.nonBasis) + ')'],
        ['4', 'Eligible basis', dollars(d.eligible), 'sub'],
        ['5', P.boost ? 'Basis boost for QCT or DDA (× 130%)' : 'No basis boost (× 100%)', dollars(d.boosted)],
        ['6', `Applicable fraction (× ${(P.lowIncPct * 100).toFixed(0)}%)`, ''],
        ['7', 'Qualified basis', dollars(d.qualified), 'sub'],
        ['8', `Applicable percentage (× ${P.type === '4' ? '4' : '9'}%)`, ''],
        ['9', 'Maximum annual credit', dollars(d.annualMax), 'sub'],
        ['10', 'Credit needed to fill the gap after debt (§42(m)(2))', dollars((Math.max(0, d.tdc - d.loan)) / P.price / 10)],
        ['11', 'Annual credit allocated (lesser of 9 and 10)', dollars(d.annual), 'sub'],
        ['12', `Ten-year credits × price $${P.price.toFixed(2)} = equity`, dollars(d.equity), 'total'],
      ];
      lines.innerHTML = L.map(([n, t, v, c]) => `<tr class="${c || ''}"><td class="ln">${n}</td><td>${t}</td><td>${v}</td></tr>`).join('');
      stackSvg(svg, d);
      ro.innerHTML = `<span>NOI <b>${money(d.noi, 2)}</b>/yr</span><span>supportable loan <b>${money(d.loan)}</b></span><span>equity per unit <b>${money(d.equity / P.units)}</b></span>` +
        (d.trimmed ? `<span style="color:var(--signal)">Credits trimmed: basis supports ${money(d.equityMax)} of equity but the deal needs only ${money(d.equity)}</span>` : '') +
        (P.type === '4' ? `<span>bond test: at least <b>${money(d.bondTest)}</b> of tax-exempt bonds (25% of basis + land)</span>` : '');
    }
    const bind = (id, key, fmt, tf = (v) => v) => Lab.slider(Lab.$(id, root), fmt, (v) => { P[key] = tf(v); draw(); });
    bind('#dc-units', 'units', (v) => v);
    bind('#dc-tdc', 'tdcPerUnit', (v) => money(v * 1000), (v) => v * 1000);
    bind('#dc-lif', 'lowIncPct', (v) => v + '%', (v) => v / 100);
    bind('#dc-price', 'price', (v) => '$' + v.toFixed(2));
    bind('#dc-rent', 'rent', (v) => '$' + v.toLocaleString());
    bind('#dc-rate', 'rate', (v) => v.toFixed(2) + '%', (v) => v / 100);
    Lab.$('#dc-type', root).addEventListener('change', (e) => { P.type = e.target.value; draw(); });
    Lab.$('#dc-boost', root).addEventListener('change', (e) => { P.boost = e.target.checked; draw(); });
    ready = true; draw(); Lab.onTheme(draw);
  }

  /* ---------- Fig 8.1 Floating applicable percentage vs the fixed floors ---------- */
  const ap = Lab.$('#fig-applicable');
  if (ap) {
    const wrap = Lab.$('.chart-wrap', ap), svg = Lab.$('svg', ap), ro = Lab.$('.readouts', ap), tip = Lab.tip(wrap);
    // Treasury sets the rate so ten annual credits have present value 70% (or 30%) of qualified basis,
    // discounting at 72% of the average long- and mid-term AFR.
    const pct = (pv, afr) => { const d = 0.72 * afr; return (pv * d) / (1 - Math.pow(1 + d, -10)); };
    let afr = 0.045;
    const W = 640, H = 300, m = { l: 48, r: 108, t: 16, b: 40 };
    const x = Lab.scale(0.005, 0.08, m.l, W - m.r), y = Lab.scale(0, 0.11, H - m.b, m.t);
    function draw() {
      const pal = Lab.palette();
      svg.innerHTML = ''; svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      [0, 0.02, 0.04, 0.06, 0.08, 0.10].forEach((v) => {
        Lab.svg('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), stroke: v ? pal.grid : pal.ink3 }, svg);
        const t = Lab.svg('text', { x: m.l - 8, y: y(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: pal.ink3 }, svg); t.textContent = (v * 100).toFixed(0) + '%';
      });
      [0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08].forEach((v) => {
        const t = Lab.svg('text', { x: x(v), y: H - m.b + 18, 'text-anchor': 'middle', 'font-size': 11, fill: pal.ink3 }, svg); t.textContent = (v * 100).toFixed(0) + '%';
      });
      const xl = Lab.svg('text', { x: (m.l + W - m.r) / 2, y: H - 4, 'text-anchor': 'middle', 'font-size': 11, fill: pal.ink3 }, svg); xl.textContent = 'average applicable federal rate (AFR)';
      [[0.7, 0.09, pal.s1, '70% PV (new construction)', '9% floor'], [0.3, 0.04, pal.s2, '30% PV (acquisition, bonds)', '4% floor']].forEach(([pv, floor, col, name, fname]) => {
        let d = '';
        for (let a = 0.005; a <= 0.0801; a += 0.0025) d += (d ? 'L' : 'M') + x(a).toFixed(1) + ' ' + y(pct(pv, a)).toFixed(1);
        Lab.svg('path', { d, fill: 'none', stroke: col, 'stroke-width': 2 }, svg);
        Lab.svg('line', { x1: m.l, x2: W - m.r, y1: y(floor), y2: y(floor), stroke: col, 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }, svg);
        const fl = Lab.svg('text', { x: W - m.r + 6, y: y(floor) + 4, 'font-size': 11, fill: pal.ink2 }, svg); fl.textContent = fname;
        const ey = y(pct(pv, 0.08));
        const nl = Lab.svg('text', { x: W - m.r + 6, y: ey + (pv > 0.5 ? -6 : 14), 'font-size': 11, fill: pal.ink2 }, svg); nl.textContent = pv > 0.5 ? 'floating 70%' : 'floating 30%';
        const p = pct(pv, afr);
        Lab.svg('circle', { cx: x(afr), cy: y(p), r: 5, fill: col, stroke: pal.paper3, 'stroke-width': 2 }, svg);
      });
      Lab.svg('line', { x1: x(afr), x2: x(afr), y1: m.t, y2: H - m.b, stroke: pal.ink3, 'stroke-dasharray': '2 3' }, svg);
      const p9 = pct(0.7, afr), p4 = pct(0.3, afr);
      ro.innerHTML = `<span>discount rate 72% × AFR = <b>${(0.72 * afr * 100).toFixed(2)}%</b></span><span>floating "9%" rate <b>${(p9 * 100).toFixed(2)}%</b></span><span>floating "4%" rate <b>${(p4 * 100).toFixed(2)}%</b></span><span>extra credit from the 9% floor <b>${p9 < 0.09 ? '+' + ((0.09 / p9 - 1) * 100).toFixed(0) + '%' : 'none'}</b></span>`;
      const hit = Lab.svg('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: 'transparent' }, svg);
      hit.addEventListener('pointermove', (ev) => {
        const r = svg.getBoundingClientRect(), sx = ((ev.clientX - r.left) / r.width) * W;
        const a = 0.005 + ((sx - m.l) / (W - m.l - m.r)) * 0.075;
        tip.show((sx / W) * r.width, (y(pct(0.7, a)) / H) * r.height, `AFR ${(a * 100).toFixed(2)}%<br>70% PV → ${(pct(0.7, a) * 100).toFixed(2)}%<br>30% PV → ${(pct(0.3, a) * 100).toFixed(2)}%`);
      });
      hit.addEventListener('pointerleave', () => tip.hide());
    }
    Lab.slider(Lab.$('#ap-afr', ap), (v) => v.toFixed(2) + '%', (v) => { afr = v / 100; draw(); });
    Lab.onTheme(draw);
  }

  /* ---------- Fig 12.1 The investor's return ---------- */
  const inv = Lab.$('#fig-investor');
  if (inv) {
    const wrap = Lab.$('.chart-wrap', inv), svg = Lab.$('svg', inv), ro = Lab.$('.readouts', inv), tip = Lab.tip(wrap);
    const st = { price: 0.88, loss: 0.05, tax: 0.21, staged: true };
    const CRED = 1e6; // $1M of credits a year for 10 years
    function flows() {
      const eq = st.price * CRED * 10;
      const pay = st.staged ? [[0, 0.2], [1, 0.45], [2, 0.35]] : [[0, 1]];
      const f = new Array(17).fill(0).map(() => ({ paid: 0, credit: 0, loss: 0 }));
      pay.forEach(([t, s]) => { f[t].paid += eq * s; });
      // Credits begin in year 2 (placed in service), first year prorated by lease-up; simplified here to full years 2–11.
      for (let t = 2; t <= 11; t++) f[t].credit = CRED;
      for (let t = 2; t <= 16; t++) f[t].loss = eq * st.loss * st.tax;
      return { eq, f };
    }
    const irr = (cf) => {
      let lo = -0.5, hi = 0.5;
      const npv = (r) => cf.reduce((s, c, t) => s + c / Math.pow(1 + r, t), 0);
      for (let k = 0; k < 80; k++) { const mid = (lo + hi) / 2; npv(mid) > 0 ? (lo = mid) : (hi = mid); }
      return (lo + hi) / 2;
    };
    const W = 640, H = 300, m = { l: 56, r: 16, t: 16, b: 36 };
    function draw() {
      const pal = Lab.palette(), { eq, f } = flows();
      const cf = f.map((v) => v.credit + v.loss - v.paid), r = irr(cf);
      svg.innerHTML = ''; svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const maxNeg = Math.max(...f.map((v) => v.paid)), maxPos = Math.max(...f.map((v) => v.credit + v.loss));
      const y = Lab.scale(-maxNeg * 1.05, maxPos * 1.15, H - m.b, m.t), bw = (W - m.l - m.r) / f.length;
      const step = maxNeg > 4e6 ? 2e6 : 1e6;
      for (let v = -Math.floor(maxNeg / step) * step; v <= maxPos * 1.15; v += step) {
        Lab.svg('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), stroke: v === 0 ? pal.ink3 : pal.grid }, svg);
        const t = Lab.svg('text', { x: m.l - 8, y: y(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: pal.ink3 }, svg); t.textContent = money(v, 0);
      }
      f.forEach((v, t) => {
        const cx = m.l + t * bw + bw * 0.18, w = bw * 0.64;
        if (v.paid) Lab.svg('rect', { x: cx, y: y(0), width: w, height: y(-v.paid) - y(0), fill: pal.ink3, rx: 2 }, svg);
        if (v.credit) Lab.svg('rect', { x: cx, y: y(v.credit), width: w, height: y(0) - y(v.credit), fill: pal.s1, rx: 2 }, svg);
        if (v.loss) Lab.svg('rect', { x: cx, y: y(v.credit + v.loss), width: w, height: y(v.credit) - y(v.credit + v.loss) - 1, fill: pal.s2, rx: 2 }, svg);
        const lt = Lab.svg('text', { x: cx + w / 2, y: H - m.b + 18, 'text-anchor': 'middle', 'font-size': 10.5, fill: pal.ink3 }, svg); lt.textContent = t;
        const hit = Lab.svg('rect', { x: m.l + t * bw, y: m.t, width: bw, height: H - m.t - m.b, fill: 'transparent' }, svg);
        hit.addEventListener('pointermove', () => { const rr = svg.getBoundingClientRect(); tip.show(((cx + w / 2) / W) * rr.width, (y(v.credit + v.loss) / H) * rr.height, `Year ${t}<br>equity paid ${money(v.paid, 2)}<br>credits ${money(v.credit, 2)}<br>loss benefit ${money(v.loss, 2)}`); });
        hit.addEventListener('pointerleave', () => tip.hide());
      });
      const tot = f.reduce((s, v) => s + v.credit + v.loss, 0);
      ro.innerHTML = `<span>equity paid <b>${money(eq)}</b></span><span>benefits received <b>${money(tot)}</b></span><span>after-tax IRR <b>${(r * 100).toFixed(1)}%</b></span>`;
    }
    Lab.slider(Lab.$('#iv-price', inv), (v) => '$' + v.toFixed(2), (v) => { st.price = v; draw(); });
    Lab.slider(Lab.$('#iv-loss', inv), (v) => v.toFixed(1) + '%', (v) => { st.loss = v / 100; draw(); });
    Lab.$('#iv-tax', inv).addEventListener('change', (e) => { st.tax = parseFloat(e.target.value); draw(); });
    Lab.$('#iv-staged', inv).addEventListener('change', (e) => { st.staged = e.target.checked; draw(); });
    Lab.onTheme(draw);
  }
})();
