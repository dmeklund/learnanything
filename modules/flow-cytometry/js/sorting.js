/* Volume XII figures: DNA content and the cell cycle, droplet sorting, and rare-event statistics. */
(function () {
  const T = (g, x, y, s, fill, anchor, size) => FC.text(g, x, y, s, fill, anchor, size);

  /* ---------- Fig 4.1 DNA content and the cell cycle ---------- */
  (function () {
    const root = Lab.$('#fig-dna');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    const st = { cv: 0.04, s: 0.3, tumor: false };
    const G1 = 200, G2F = 0.12, NEV = 20000, DI = 1.15; // G1 channel, G2/M share, events, tumor DNA index
    let ready = false;
    // expected counts per channel: Gaussian G1 and G2 peaks (G2 at twice the DNA) and an S phase spread evenly
    // between them, every cell broadened by the same coefficient of variation (the model of Dean and Jett, 1974)
    const gauss = (x, m, s) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
    function cycle(x, g1, n) {
      const sd1 = st.cv * g1, sd2 = st.cv * 2 * g1, g1f = 1 - st.s - G2F;
      let sPart = 0; for (let k = 0; k < 40; k++) { const m = g1 + ((k + 0.5) / 40) * g1; sPart += gauss(x, m, st.cv * m) / 40; }
      return n * (g1f * gauss(x, g1, sd1) + G2F * gauss(x, 2 * g1, sd2) + st.s * sPart);
    }
    const dens = (x) => (st.tumor ? cycle(x, G1, NEV * 0.7) + cycle(x, G1 * DI, NEV * 0.3) : cycle(x, G1, NEV));
    function draw() {
      if (!ready) return;
      // a seeded sample of events, binned into 512 channels
      const r = Lab.rng(14), h = new Array(512).fill(0);
      const draw1 = (g1, n) => { for (let i = 0; i < n; i++) { const u = r(); let m; if (u < 1 - st.s - G2F) m = g1; else if (u < 1 - G2F) m = g1 * (1 + r()); else m = 2 * g1; const x = Math.round(m * (1 + st.cv * Lab.gauss(r))); if (x >= 0 && x < 512) h[x]++; } };
      if (st.tumor) { draw1(G1, NEV * 0.7); draw1(G1 * DI, NEV * 0.3); } else draw1(G1, NEV);
      const mx = Math.max(...h);
      const f = FC.frame(svg, { h: 300, m: { l: 46, r: 16, t: 30, b: 42 }, x: [0, 511], y: [0, mx * 1.1], xt: [0, 100, 200, 300, 400, 500], yt: [], xl: 'DNA content (propidium iodide fluorescence, channels)', yl: 'Cells per channel' });
      const bars = []; h.forEach((c, i) => { bars.push([i - 0.5, c]); bars.push([i + 0.5, c]); });
      Lab.svg('path', { d: FC.path(bars, f.X, f.Y) + `L${f.X(511.5)} ${f.Y(0)}L${f.X(-0.5)} ${f.Y(0)}Z`, fill: f.pal.s1, 'fill-opacity': 0.35, stroke: f.pal.s1, 'stroke-width': 1 }, f.g);
      const model = []; for (let x = 0; x < 512; x += 1) model.push([x, dens(x)]);
      Lab.svg('path', { d: FC.path(model, f.X, f.Y), fill: 'none', stroke: f.pal.ink, 'stroke-width': 1.4 }, f.g);
      T(f.g, f.X(G1), f.Y(Math.max(...h.slice(G1 - 10, G1 + 10))) - 8, 'G0/G1', f.pal.ink2, 'middle', 10.5);
      T(f.g, f.X(2 * G1), f.Y(Math.max(...h.slice(2 * G1 - 15, 2 * G1 + 15))) - 8, 'G2/M', f.pal.ink2, 'middle', 10.5);
      T(f.g, f.X(1.5 * G1), f.Y(dens(1.5 * G1)) - 14, 'S', f.pal.ink2, 'middle', 10.5);
      // the simplest estimate of S phase: the flat count density between the peaks, measured well clear of both
      // (two standard deviations), extended across the whole interval from G1 to G2
      const a = Math.ceil(G1 * (1 + 2 * st.cv)), b = Math.floor(2 * G1 * (1 - 2 * st.cv));
      let est = null; if (!st.tumor && b > a + 4) { let n = 0; for (let i = a; i <= b; i++) n += h[i]; est = ((n / (b - a + 1)) * G1) / NEV; Lab.svg('rect', { x: f.X(a), y: f.m.t, width: f.X(b) - f.X(a), height: f.H - f.m.t - f.m.b, fill: f.pal.s2, 'fill-opacity': 0.08 }, f.g); }
      // with a tumor population, are the two G1 peaks resolved (is there a dip between them)?
      let resolved = null; if (st.tumor) { const lo = dens(G1 * (1 + DI) / 2), p1 = dens(G1), p2 = dens(G1 * DI); resolved = lo < 0.9 * Math.min(p1, p2); }
      FC.hover(svg, f, 0, 511, (x, sx, sy, px) => { const i = Math.max(0, Math.min(511, Math.round(x))); tip.show(px, f.Y(h[i]) * sy - 8, `<b>channel ${i}</b><br>${h[i]} cells`, f.Y(h[i]) * sy + 12); }, () => tip.hide());
      const g1cv = `<span>G1 peak CV <b>${(st.cv * 100).toFixed(1)}%</b></span>`;
      out.innerHTML = st.tumor
        ? `${g1cv}<span>tumor G1 peak at DNA index ${DI} <b class="${resolved ? '' : 'warn'}">${resolved ? 'resolved from the normal peak' : 'merged with the normal peak'}</b></span>`
        : `${g1cv}<span>true S-phase share <b>${Math.round(st.s * 100)}%</b></span><span>simple estimate between the peaks <b class="${est !== null && Math.abs(est - st.s) > 0.03 ? 'warn' : ''}">${est === null ? 'no clear window' : Math.round(est * 100) + '%'}</b></span>`;
    }
    Lab.slider(Lab.$('#dn-cv', root), (v) => (v * 100).toFixed(1) + '%', (v) => { st.cv = v; draw(); });
    Lab.slider(Lab.$('#dn-s', root), (v) => Math.round(v * 100) + '%', (v) => { st.s = v; draw(); });
    Lab.$$('[data-tumor]', root).forEach((b) => b.addEventListener('click', () => { st.tumor = b.dataset.tumor === '1'; Lab.$$('[data-tumor]', root).forEach((o) => o.setAttribute('aria-pressed', o === b ? 'true' : 'false')); draw(); }));
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();

  /* ---------- Fig 5.1 Droplet sorting ---------- */
  (function () {
    const root = Lab.$('#fig-sort');
    if (!root) return;
    const svgS = Lab.$('.sort-stream', root), svg = Lab.$('.sort-chart', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    const st = { d: 70, psi: 70, rate: Math.log10(20000), env: 1 };
    const TARGET = 0.05; // the wanted cells are 5% of all events
    let ready = false;
    // Bernoulli: jet speed v = √(2ΔP/ρ). Rayleigh: a jet of diameter d breaks fastest at wavelength ≈ 4.51 d,
    // so the drive frequency is f = v / (4.51 d). Events arrive at random (Poisson), λ = rate / f per drop.
    const phys = () => { const v = Math.sqrt((2 * st.psi * 6894.76) / 1000), f = v / (4.51 * st.d * 1e-6); return { v, f }; };
    // purity mode: a wanted cell is sorted only if no other cell falls in its sort envelope of k drops
    const yieldAt = (rate, f, k) => Math.exp(-(rate / f) * k);
    function draw() {
      if (!ready) return;
      const { v, f } = phys(), rate = Math.pow(10, st.rate), lam = rate / f, y = yieldAt(rate, f, st.env);
      // the stream: 26 drops after break-off, with cells placed by a Poisson draw
      const W = Math.max(280, svgS.clientWidth || 600), H = 90; svgS.setAttribute('viewBox', `0 0 ${W} ${H}`); svgS.setAttribute('height', H); svgS.innerHTML = '';
      const pal = Lab.palette(), g = Lab.svg('g', {}, svgS), n = 26, dx = (W - 70) / n, r = Lab.rng(6);
      Lab.svg('rect', { x: 0, y: 34, width: 40, height: 22, fill: pal.paper3, stroke: pal.ink3 }, g); T(g, 20, 76, 'nozzle', pal.ink3, 'middle', 10);
      Lab.svg('rect', { x: 40, y: 41, width: 24, height: 8, fill: pal.rule }, g);
      const drops = []; for (let i = 0; i < n; i++) { const k = FC.poisson(r, lam), cells = []; for (let j = 0; j < k; j++) cells.push(r() < 0.35 ? 'want' : 'other'); drops.push(cells); }
      drops.forEach((cells, i) => {
        const cx = 70 + i * dx + dx / 2, want = cells.includes('want');
        let conflict = false; if (want) { for (let j = i - Math.floor((st.env - 1) / 2); j <= i + Math.ceil((st.env - 1) / 2); j++) { const c = drops[j] || []; const others = j === i ? cells.length - 1 : c.length; if (others > 0) conflict = true; } }
        Lab.svg('circle', { cx, cy: 45, r: Math.min(dx * 0.42, 13), fill: want ? (conflict ? pal.paper2 : pal.paper3) : pal.paper3, stroke: want ? (conflict ? pal.ink3 : pal.s1) : pal.rule, 'stroke-width': want ? 2 : 1, 'stroke-dasharray': want && conflict ? '3 2' : null }, g);
        cells.forEach((c, j) => Lab.svg('circle', { cx: cx + (j - (cells.length - 1) / 2) * 5, cy: 45, r: 2.6, fill: c === 'want' ? pal.s2 : pal.ink3 }, g));
      });
      T(g, 70, 16, 'drops after break-off (solid ring: wanted cell, sorted; dashed: wanted cell, aborted)', pal.ink2, 'start', 10.5);
      // efficiency versus event rate
      const c = FC.frame(svg, { h: 260, m: { l: 46, r: 16, t: 30, b: 42 }, x: [1000, 2e5], xlog: true, y: [0, 1], xt: [1000, 3000, 1e4, 3e4, 1e5], yt: [0, 0.25, 0.5, 0.75, 1], xf: (v) => FC.num(v), yf: (v) => Math.round(v * 100) + '%', xl: 'events per second', yl: 'Wanted cells actually sorted (purity mode)' });
      [1, 2, 3].forEach((k) => { const p = []; for (let i = 0; i <= 100; i++) { const x = Math.pow(10, 3 + (Math.log10(2e5) - 3) * i / 100); p.push([x, yieldAt(x, f, k)]); } Lab.svg('path', { d: FC.path(p, c.X, c.Y), fill: 'none', stroke: k === st.env ? c.pal.s1 : c.pal.ink3, 'stroke-width': k === st.env ? 2.2 : 1, 'stroke-dasharray': k === st.env ? null : '4 3' }, c.g); const e = p[78]; T(c.g, c.X(e[0]) + 4, c.Y(e[1]) - 5, `${k}-drop envelope`, k === st.env ? c.pal.ink : c.pal.ink3, 'start', 10.5); });
      Lab.svg('circle', { cx: c.X(rate), cy: c.Y(y), r: 5.5, fill: c.pal.s2, stroke: c.pal.paper, 'stroke-width': 2 }, c.g);
      FC.hover(svg, c, 1000, 2e5, (x, sx, sy, px) => tip.show(px, c.Y(yieldAt(x, f, st.env)) * sy - 8, `<b>${FC.num(x)} events/s</b><br>${(x / f).toFixed(2)} events per drop<br>sorted ${(yieldAt(x, f, st.env) * 100).toFixed(0)}%`, c.Y(yieldAt(x, f, st.env)) * sy + 12), () => tip.hide(), true);
      const perHour = rate * TARGET * y * 3600;
      out.innerHTML = `<span>jet speed <b>${v.toFixed(0)} m/s</b></span><span>drop frequency <b>${(f / 1000).toFixed(0)} kHz</b></span><span>events per drop <b>${lam.toFixed(2)}</b></span><span>wanted cells sorted <b class="${y < 0.7 ? 'warn' : ''}">${(y * 100).toFixed(0)}%</b>, about <b>${FC.num(perHour)}</b> per hour</span>`;
    }
    Lab.$$('[data-nozzle]', root).forEach((b) => b.addEventListener('click', () => { st.d = +b.dataset.nozzle; Lab.$$('[data-nozzle]', root).forEach((o) => o.setAttribute('aria-pressed', o === b ? 'true' : 'false')); draw(); }));
    Lab.slider(Lab.$('#so-p', root), (v) => v + ' psi', (v) => { st.psi = v; draw(); });
    Lab.slider(Lab.$('#so-r', root), (v) => FC.num(Math.pow(10, v)) + ' per s', (v) => { st.rate = v; draw(); });
    Lab.slider(Lab.$('#so-k', root), (v) => v + (v === 1 ? ' drop' : ' drops'), (v) => { st.env = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();

  /* ---------- Fig 6.1 How many events for a rare population ---------- */
  (function () {
    const root = Lab.$('#fig-rare');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    const st = { freq: -5, cv: 0.1, rate: Math.log10(10000) };
    const LOD = 20; // events of the rare population required to call it present
    let ready = false;
    // Counting is Poisson: r events of the rare population carry a CV of 1/√r, so a target CV needs r = 1/CV² events,
    // and the total to acquire is r divided by the population's frequency.
    function draw() {
      if (!ready) return;
      const fr = Math.pow(10, st.freq), rq = 1 / (st.cv * st.cv), total = rq / fr, tLod = LOD / fr, rate = Math.pow(10, st.rate);
      const f = FC.frame(svg, { h: 300, m: { l: 56, r: 16, t: 30, b: 42 }, x: [1e-7, 1e-2], xlog: true, y: [1e2, 1e10], ylog: true, xt: [1e-7, 1e-6, 1e-5, 1e-4, 1e-3, 1e-2], yt: [1e2, 1e4, 1e6, 1e8, 1e10], xf: (v) => FC.sci(v), yf: (v) => FC.sci(v), xl: 'frequency of the rare population among all events', yl: 'Total events to acquire' });
      const line = (k) => [[1e-7, k / 1e-7], [1e-2, k / 1e-2]].map(([x, y]) => [x, Math.min(1e10, Math.max(1e2, y))]);
      Lab.svg('path', { d: FC.path(line(LOD), f.X, f.Y), fill: 'none', stroke: f.pal.ink3, 'stroke-width': 1.4, 'stroke-dasharray': '5 4' }, f.g);
      const qp = []; for (let i = 0; i <= 50; i++) { const x = Math.pow(10, -7 + 5 * i / 50), y = rq / x; if (y <= 1e10 && y >= 1e2) qp.push([x, y]); }
      Lab.svg('path', { d: FC.path(qp, f.X, f.Y), fill: 'none', stroke: f.pal.s1, 'stroke-width': 2.2 }, f.g);
      T(f.g, f.X(1e-3), f.Y(LOD / 1e-3) + 16, `detect (${LOD} events)`, f.pal.ink3, 'start', 10.5);
      if (qp.length) { const lp = qp[Math.min(qp.length - 1, 38)]; T(f.g, f.X(lp[0]) + 6, f.Y(lp[1]) - 8, `quantify with CV ${Math.round(st.cv * 100)}%`, f.pal.ink2, 'start', 10.5); }
      if (total <= 1e10) Lab.svg('circle', { cx: f.X(fr), cy: f.Y(total), r: 5.5, fill: f.pal.s2, stroke: f.pal.paper, 'stroke-width': 2 }, f.g);
      FC.hover(svg, f, 1e-7, 1e-2, (x, sx, sy, px) => tip.show(px, f.Y(Math.min(1e10, rq / x)) * sy - 8, `<b>1 in ${FC.num(1 / x)}</b><br>detect: ${FC.num(LOD / x)} events<br>quantify: ${FC.num(rq / x)} events`, f.Y(Math.min(1e10, rq / x)) * sy + 12), () => tip.hide(), true);
      const secs = total / rate, tStr = secs < 120 ? secs.toFixed(0) + ' s' : secs < 7200 ? (secs / 60).toFixed(0) + ' min' : (secs / 3600).toFixed(1) + ' h';
      out.innerHTML = `<span>rare events needed <b>${FC.num(rq)}</b></span><span>total to acquire <b>${FC.num(total)}</b> (detection alone ${FC.num(tLod)})</span><span>acquisition time <b class="${secs > 3600 ? 'warn' : ''}">${tStr}</b></span>`;
    }
    Lab.slider(Lab.$('#ra-f', root), (v) => '1 in ' + FC.num(Math.pow(10, -v)), (v) => { st.freq = v; draw(); });
    Lab.slider(Lab.$('#ra-cv', root), (v) => Math.round(v * 100) + '%', (v) => { st.cv = v; draw(); });
    Lab.slider(Lab.$('#ra-r', root), (v) => FC.num(Math.pow(10, v)) + ' per s', (v) => { st.rate = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();
})();
