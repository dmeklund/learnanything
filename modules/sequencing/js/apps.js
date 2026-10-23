/* Volume IV, applications: counting chromosomes in cell-free DNA. */
(function () {
  /* ---------- Fig 13.1 Detecting trisomy 21 by counting reads ---------- */
  (function () {
    const root = Lab.$('#fig-nipt');
    if (!root) return;
    const wrap = Lab.$('.chart-wrap', root), svg = Lab.$('svg', root), tip = Lab.tip(wrap), out = Lab.$('.readouts', root);
    const PI0 = 0.0135, TECH = 0.002, NREF = 300;   // chr21 share of mapped reads; extra between-sample spread (illustrative)
    const st = { n: 1e7, ff: 0.1, tri: true };
    let ready = false;
    const gR = Lab.rng(4), gs = Array.from({ length: NREF * 2 + 2 }, () => Lab.gauss(gR));
    function draw() {
      if (!ready) return;
      const pal = Lab.palette(), W = Math.max(320, Math.round(wrap.clientWidth || 640)), H = 230, L = 16, R = 16, T = 26, B = 40;
      const cnt = Math.sqrt((PI0 * (1 - PI0)) / st.n);
      const frac = (i, mult) => PI0 * mult * (1 + TECH * gs[2 * i]) + cnt * gs[2 * i + 1];
      const ref = Array.from({ length: NREF }, (_, i) => frac(i, 1));
      const mean = ref.reduce((a, b) => a + b, 0) / NREF, sd = Math.sqrt(ref.reduce((a, b) => a + (b - mean) ** 2, 0) / (NREF - 1));
      const test = frac(NREF, st.tri ? 1 + st.ff / 2 : 1), z = (test - mean) / sd;
      svg.innerHTML = ''; svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H);
      const zmax = Math.max(6, Math.ceil(z + 2)), x = Lab.scale(-5, zmax, L, W - R);
      const bins = new Array(Math.ceil((zmax + 5) * 2)).fill(0);
      ref.forEach((v) => { const b = Math.floor(((v - mean) / sd + 5) * 2); if (b >= 0 && b < bins.length) bins[b]++; });
      const mx = Math.max(...bins), y = (c) => H - B - (c / mx) * (H - B - T);
      for (let zz = -4; zz <= zmax; zz += zmax > 20 ? 5 : 2) {
        Lab.svg('line', { x1: x(zz), x2: x(zz), y1: T, y2: H - B, stroke: pal.grid }, svg);
        Lab.svg('text', { x: x(zz), y: H - B + 16, 'text-anchor': 'middle', 'font-size': 11, fill: pal.ink3 }, svg).textContent = zz;
      }
      Lab.svg('text', { x: W - R, y: H - 6, 'text-anchor': 'end', 'font-size': 11, fill: pal.ink3 }, svg).textContent = 'chromosome 21 z-score';
      bins.forEach((c, b) => {
        if (!c) return;
        const z0 = b / 2 - 5, rr = Lab.svg('rect', { x: x(z0) + 0.5, y: y(c), width: Math.max(1, x(z0 + 0.5) - x(z0) - 1), height: H - B - y(c), rx: 1.5, fill: pal.s1, opacity: 0.75 }, svg);
        rr.addEventListener('pointermove', () => { const s = svg.getBoundingClientRect().width / W; tip.show(x(z0 + 0.25) * s, y(c) * s, `<b>z ${z0.toFixed(1)} to ${(z0 + 0.5).toFixed(1)}</b><br>${c} reference pregnancies`, (H - B) * s); });
        rr.addEventListener('pointerleave', () => tip.hide());
      });
      Lab.svg('line', { x1: x(3), x2: x(3), y1: T - 8, y2: H - B, stroke: pal.ink, 'stroke-dasharray': '4 3' }, svg);
      Lab.svg('text', { x: x(3) + 4, y: T - 12, 'font-size': 11, fill: pal.ink2 }, svg).textContent = 'z = 3 cutoff';
      const tx = x(Math.min(zmax, z));
      Lab.svg('line', { x1: tx, x2: tx, y1: T + 6, y2: H - B, stroke: pal.s2, 'stroke-width': 3 }, svg);
      Lab.svg('circle', { cx: tx, cy: T + 6, r: 6, fill: pal.s2, stroke: pal.paper3, 'stroke-width': 2 }, svg);
      Lab.svg('text', { x: tx + (tx > W * 0.75 ? -10 : 10), y: T + 10, 'text-anchor': tx > W * 0.75 ? 'end' : 'start', 'font-size': 11.5, fill: pal.ink }, svg).textContent = `this sample, z = ${z.toFixed(1)}`;
      const rel = sd / mean, ffMin = 2 * 3 * rel;
      out.innerHTML = `<span>chr21 reads <b>${Lab.fmt.si(test * st.n)}</b> of ${Lab.fmt.si(st.n)}</span><span>expected excess if trisomic <b>${(st.ff / 2 * 100).toFixed(1)}%</b></span><span>spread between samples <b>${(rel * 100).toFixed(2)}%</b></span><span>result <b class="${z > 3 ? 'warn' : ''}">${z > 3 ? 'high risk' : 'low risk'}</b></span><span>lowest detectable fetal fraction ≈ <b>${(ffMin * 100).toFixed(1)}%</b></span>`;
    }
    Lab.slider(Lab.$('#np-n', root), (v) => Lab.fmt.si(Math.pow(10, v)), (v) => { st.n = Math.pow(10, v); draw(); });
    Lab.slider(Lab.$('#np-ff', root), (v) => v + '%', (v) => { st.ff = v / 100; draw(); });
    Lab.$('#np-tri', root).addEventListener('change', (e) => { st.tri = e.target.checked; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(wrap, draw);
  })();
})();
