/* Volume VI, physics figures: radium implants, Compton scattering, depth dose, penumbra. */
(function () {
  const film = () => ({ bg: Lab.css('--film'), ink: Lab.css('--film-ink'), ink2: Lab.css('--film-ink-2') });
  const mono = () => Lab.css('--f-mono');

  /* ---------- Fig 1.1 Spacing radium needles (Manchester planar implant) ---------- */
  (function () {
    const root = Lab.$('#fig-radium');
    if (!root) return;
    const cv = Lab.$('canvas', root), out = Lab.$('.readouts', root);
    const st = { L: 4, fp: 0.4 };
    let ready = false;
    const H = 0.5; // treatment plane 5 mm from the implant
    function segments() {
      const a = st.L / 2, m = Math.max(1, Math.round(st.L) - 1), per = 4 * st.L;
      const dp = st.fp / per, dc = (1 - st.fp) / (m * st.L);
      const s = [[-a, -a, a, -a, dp], [-a, a, a, a, dp], [-a, -a, -a, a, dp], [a, -a, a, a, dp]];
      for (let k = 1; k <= m; k++) { const x = -a + (k * st.L) / (m + 1); s.push([x, -a, x, a, dc]); }
      return s;
    }
    function doseAt(segs, px, py) {
      let D = 0;
      for (const [x1, y1, x2, y2, d] of segs) {
        const n = 40, len = Math.hypot(x2 - x1, y2 - y1) / n;
        for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t; D += (d * len) / ((x - px) ** 2 + (y - py) ** 2 + H * H); }
      }
      return D;
    }
    function draw() {
      if (!ready) return;
      const narrow = (cv.clientWidth || 600) < 560;
      const { ctx, w, h } = Lab.canvas(cv, narrow ? 1.6 : 0.5), pal = Lab.palette(), F = film();
      ctx.clearRect(0, 0, w, h);
      const sq = narrow ? w : h, segs = segments();
      const ext = st.L / 2 + 1.5, n = 64, step = (2 * ext) / n;
      const grid = new Float32Array(n * n);
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) grid[j * n + i] = doseAt(segs, -ext + (i + 0.5) * step, -ext + (j + 0.5) * step);
      // statistics over the area, 5 mm inside its edge
      const a = st.L / 2 - 0.5; let sum = 0, cnt = 0, mn = Infinity, mx = -Infinity;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const x = -ext + (i + 0.5) * step, y = -ext + (j + 0.5) * step;
        if (Math.abs(x) <= a && Math.abs(y) <= a) { const v = grid[j * n + i]; sum += v; cnt++; mn = Math.min(mn, v); mx = Math.max(mx, v); }
      }
      const mean = sum / cnt; for (let k = 0; k < grid.length; k++) grid[k] /= mean;
      ctx.fillStyle = F.bg; ctx.fillRect(0, 0, sq, sq);
      RT.paintDose(ctx, grid, n, n, 0, 0, sq, sq, { lo: 0.35, hi: 1.35, alpha: 0.9 });
      const P = (x, y) => [((x + ext) / (2 * ext)) * sq, sq - ((y + ext) / (2 * ext)) * sq];
      ctx.lineWidth = 1.4; ctx.strokeStyle = F.ink; ctx.setLineDash([]);
      RT.strokeContour(ctx, grid, n, n, 1.1, 0, 0, sq, sq);
      ctx.setLineDash([4, 3]); RT.strokeContour(ctx, grid, n, n, 0.9, 0, 0, sq, sq); ctx.setLineDash([]);
      // needles: line width proportional to linear activity
      const dmax = Math.max(...segs.map((s) => s[4]));
      segs.forEach(([x1, y1, x2, y2, d]) => { const [u1, v1] = P(x1, y1), [u2, v2] = P(x2, y2); ctx.strokeStyle = F.ink2; ctx.lineWidth = 1 + 3 * (d / dmax); ctx.beginPath(); ctx.moveTo(u1, v1); ctx.lineTo(u2, v2); ctx.stroke(); });
      ctx.lineWidth = 1;
      ctx.font = `11px ${mono()}`; ctx.fillStyle = F.ink;
      ctx.fillText('dose 5 mm from the implant', 8, 16);
      ctx.fillStyle = F.ink2; ctx.fillText('solid +10%   dashed −10%', 8, sq - 8);
      // profile through the middle
      const x0 = narrow ? 40 : sq + 52, y0 = narrow ? sq + 34 : 26, pw = w - x0 - 12, ph = (narrow ? h - sq - 34 : h - 26) - 42;
      const X = Lab.scale(-ext, ext, x0, x0 + pw), Y = Lab.scale(0, 1.6, y0 + ph, y0);
      ctx.fillStyle = pal.ink2; ctx.fillText('Relative dose across the middle', x0, y0 - 10);
      ctx.fillStyle = Lab.css('--accent-wash'); ctx.fillRect(X(-st.L / 2), Y(1.1), X(st.L / 2) - X(-st.L / 2), Y(0.9) - Y(1.1));
      ctx.strokeStyle = pal.grid;
      [0, 0.5, 1, 1.5].forEach((v) => { ctx.beginPath(); ctx.moveTo(x0, Y(v)); ctx.lineTo(x0 + pw, Y(v)); ctx.stroke(); ctx.fillStyle = pal.ink3; ctx.textAlign = 'right'; ctx.fillText(v.toFixed(1), x0 - 6, Y(v) + 4); });
      ctx.textAlign = 'center';
      for (let c = -Math.floor(ext); c <= ext; c += 2) ctx.fillText(c, X(c), y0 + ph + 16);
      ctx.textAlign = 'left'; ctx.fillText('cm from center', x0, y0 + ph + 32);
      ctx.strokeStyle = pal.s1; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= 160; i++) { const x = -ext + (2 * ext * i) / 160, v = doseAt(segs, x, 0) / mean; i ? ctx.lineTo(X(x), Y(v)) : ctx.moveTo(X(x), Y(v)); }
      ctx.stroke(); ctx.lineWidth = 1;
      ctx.strokeStyle = pal.ink3; ctx.setLineDash([3, 3]);
      [-st.L / 2, st.L / 2].forEach((x) => { ctx.beginPath(); ctx.moveTo(X(x), y0); ctx.lineTo(X(x), y0 + ph); ctx.stroke(); });
      ctx.setLineDash([]); ctx.fillStyle = pal.ink3; ctx.fillText('implant edge', X(st.L / 2) + 4, y0 + 12);
      const area = st.L * st.L, rule = area < 25 ? '2/3' : area <= 100 ? '1/2' : '1/3';
      const dev = ((mx - mn) / (mx + mn)) * 100;
      out.innerHTML = `<span>area <b>${area.toFixed(area % 1 ? 2 : 0)} cm²</b></span><span>needles <b>${segs.length}</b></span><span>dose varies <b>±${dev.toFixed(1)}%</b> across the area</span><span>Manchester rule for this area: <b>${rule}</b> on the edge</span>`;
    }
    Lab.slider(Lab.$('#rd-l', root), (v) => v.toFixed(1) + ' cm', (v) => { st.L = v; draw(); });
    Lab.slider(Lab.$('#rd-p', root), (v) => v + '%', (v) => { st.fp = v / 100; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(cv, draw);
  })();

  /* ---------- Fig 2.1 Compton scattering (Klein–Nishina) ---------- */
  (function () {
    const root = Lab.$('#fig-compton');
    if (!root) return;
    const [svgA, svgB] = Lab.$$('svg', root), out = Lab.$('.readouts', root);
    const tipA = Lab.tip(svgA.parentElement), tipB = Lab.tip(svgB.parentElement);
    const ME = 511;
    const st = { E: 1250 };
    let ready = false;
    const P = (eps, th) => 1 / (1 + eps * (1 - Math.cos(th)));
    const kn = (eps, th) => { const p = P(eps, th); return 0.5 * p * p * (p + 1 / p - Math.sin(th) ** 2); };
    // mean fraction of the photon's energy given to the electron, and total cross-section relative to Thomson
    const moments = (E) => {
      const eps = E / ME; let s = 0, t = 0;
      for (let i = 0; i < 720; i++) { const th = ((i + 0.5) / 720) * Math.PI, wgt = kn(eps, th) * Math.sin(th); s += wgt; t += wgt * (1 - P(eps, th)); }
      const dth = Math.PI / 720;
      return { frac: t / s, sig: (2 * Math.PI * s * dth) / ((8 * Math.PI) / 3) };
    };
    const fracCurve = []; for (let i = 0; i <= 120; i++) { const E = Math.pow(10, 1 + (i / 120) * 3.3); fracCurve.push([E, moments(E).frac]); }
    const fmtE = (E) => (E >= 1000 ? (E / 1000).toPrecision(3).replace(/\.?0+$/, '') + ' MeV' : Math.round(E) + ' keV');
    function drawPolar() {
      const W = Math.max(260, svgA.clientWidth || 300), H = Math.min(300, Math.round(W * 0.82));
      svgA.setAttribute('viewBox', `0 0 ${W} ${H}`); svgA.setAttribute('height', H); svgA.innerHTML = '';
      const pal = Lab.palette(), cx = W * 0.5, cy = H * 0.52, R = Math.min(W * 0.4, H * 0.42);
      const g = Lab.svg('g', {}, svgA);
      [0.25, 0.5, 0.75, 1].forEach((r) => Lab.svg('circle', { cx, cy, r: r * R, fill: 'none', stroke: pal.grid }, g));
      [0, 45, 90, 135].forEach((a) => { const t = (a * Math.PI) / 180; Lab.svg('line', { x1: cx - R * Math.cos(t), y1: cy - R * Math.sin(t), x2: cx + R * Math.cos(t), y2: cy + R * Math.sin(t), stroke: pal.grid }, g); });
      // incoming photon
      Lab.svg('line', { x1: 4, y1: cy, x2: cx - 6, y2: cy, stroke: pal.ink2, 'stroke-width': 1.5, 'marker-end': 'url(#cmp-arrow)' }, g);
      const defs = Lab.svg('defs', {}, svgA), mk = Lab.svg('marker', { id: 'cmp-arrow', viewBox: '0 0 8 8', refX: 7, refY: 4, markerWidth: 7, markerHeight: 7, markerUnits: 'userSpaceOnUse', orient: 'auto' }, defs);
      Lab.svg('path', { d: 'M0 0L8 4L0 8z', fill: pal.ink2 }, mk);
      const t1 = Lab.svg('text', { x: 4, y: cy - 22, 'font-size': 11, fill: pal.ink2 }, g); t1.textContent = 'photon in';
      const curve = (eps, col, wdt, dash) => {
        const pts = []; for (let i = 0; i <= 360; i++) { const th = (i / 360) * 2 * Math.PI, r = kn(eps, th) * R; pts.push([cx + r * Math.cos(th), cy - r * Math.sin(th)]); }
        Lab.svg('path', { d: pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('') + 'Z', fill: 'none', stroke: col, 'stroke-width': wdt, 'stroke-dasharray': dash || '' }, g);
      };
      curve(10 / ME, pal.ink3, 1.2, '4 3');
      curve(st.E / ME, pal.s1, 2.2);
      const lab = (x, y, s, c, anc) => { const t = Lab.svg('text', { x, y, 'font-size': 11, fill: c, 'text-anchor': anc || 'start' }, g); t.textContent = s; };
      lab(cx + R + 4, cy + 14, '0°', pal.ink3); lab(cx, cy - R - 6, '90°', pal.ink3, 'middle'); lab(cx - R - 4, cy + 14, '180°', pal.ink3, 'end');
      lab(W - 6, H - 8, 'dashed: 10 keV', pal.ink3, 'end');
      const hit = Lab.svg('rect', { x: 0, y: 0, width: W, height: H, fill: 'transparent' }, svgA);
      hit.addEventListener('mousemove', (e) => {
        const r = svgA.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * H;
        let th = Math.atan2(-(y - cy), x - cx); th = Math.abs(th);
        const eps = st.E / ME, Ep = st.E * P(eps, th);
        tipA.show(e.clientX - r.left, e.clientY - r.top - 8, `<b>${Math.round((th * 180) / Math.PI)}°</b> scattered photon ${fmtE(Ep)}<br>electron gets ${fmtE(st.E - Ep)}`, e.clientY - r.top + 12);
      });
      hit.addEventListener('mouseleave', () => tipA.hide());
    }
    function drawFrac() {
      const f = RT.frame(svgB, { h: 300, m: { l: 44, r: 14, t: 30, b: 40 }, x: [10, 20000], xlog: true, y: [0, 0.7], xt: [10, 100, 1000, 10000], yt: [0, 0.2, 0.4, 0.6], xf: fmtE, yf: (v) => Math.round(v * 100) + '%', xl: 'photon energy', yl: 'Average share of energy given to the electron' });
      Lab.svg('path', { d: RT.path(fracCurve, f.X, f.Y), fill: 'none', stroke: f.pal.s1, 'stroke-width': 2 }, f.g);
      const m = moments(st.E);
      Lab.svg('circle', { cx: f.X(st.E), cy: f.Y(m.frac), r: 5, fill: f.pal.s1, stroke: f.pal.paper, 'stroke-width': 2 }, f.g);
      // reference energies: above the curve for the first two, below it for the last
      [[60, 'diagnostic X-ray', -1], [1250, 'cobalt-60', -1], [2000, '6 MV beam, average', 1]].forEach(([E, s, dir]) => {
        const y = f.Y(fracCurve.reduce((a, b) => (Math.abs(b[0] - E) < Math.abs(a[0] - E) ? b : a))[1]);
        Lab.svg('line', { x1: f.X(E), x2: f.X(E), y1: y + dir * 4, y2: y + dir * 22, stroke: f.pal.ink3 }, f.g);
        const t = Lab.svg('text', { x: f.X(E) + (dir > 0 ? 4 : 0), y: y + dir * 22 + (dir > 0 ? 12 : -4), 'text-anchor': dir > 0 ? 'start' : 'middle', 'font-size': 10.5, fill: f.pal.ink3 }, f.g); t.textContent = s;
      });
      const hit = Lab.svg('rect', { x: f.m.l, y: f.m.t, width: f.W - f.m.l - f.m.r, height: f.H - f.m.t - f.m.b, fill: 'transparent' }, svgB);
      hit.addEventListener('mousemove', (e) => {
        const r = svgB.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * f.W;
        const E = Math.pow(10, 1 + ((x - f.m.l) / (f.W - f.m.l - f.m.r)) * Math.log10(2000));
        const mm = moments(E);
        tipB.show(((f.X(E)) / f.W) * r.width, (f.Y(mm.frac) / f.H) * r.height - 8, `<b>${fmtE(E)}</b> electron gets ${Math.round(mm.frac * 100)}% on average`, (f.Y(mm.frac) / f.H) * r.height + 12);
      });
      hit.addEventListener('mouseleave', () => tipB.hide());
      out.innerHTML = `<span>photon energy <b>${fmtE(st.E)}</b></span><span>photon scattered at 90° keeps <b>${fmtE(st.E * P(st.E / ME, Math.PI / 2))}</b></span><span>electron's average share <b>${Math.round(m.frac * 100)}%</b></span><span>cross-section vs. low energy <b>${Math.round(m.sig * 100)}%</b></span>`;
    }
    function draw() { if (!ready) return; drawPolar(); drawFrac(); }
    const inp = Lab.$('#cp-e', root);
    Lab.slider(inp, (v) => fmtE(Math.pow(10, v)), (v) => { st.E = Math.pow(10, v); draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svgB, draw);
  })();

  /* ---------- Fig 3.1 Depth dose for photons, electrons, protons ---------- */
  (function () {
    const root = Lab.$('#fig-depth');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    const st = { ph: 'mv6', E: 12, P: 150, ssd: 100, show: { ph: true, el: true, pr: true } };
    let ready = false;
    const ZMAX = 30, DZ = 0.05;
    function curves() {
      const pdd = RT.photonPDD(st.ph, st.ssd), el = RT.electron(st.E), R = RT.range(st.P), br = RT.bragg(R, DZ, ZMAX + 1);
      let bm = 0; br.d.forEach((v) => (bm = Math.max(bm, v)));
      const ph = [], ee = [], pr = [];
      for (let i = 0; i * DZ <= ZMAX + 1e-9; i++) {
        const z = i * DZ; ph.push([z, pdd(z)]); ee.push([z, el.f(z)]); pr.push([z, (100 * br.d[i]) / bm]);
      }
      return { ph, ee, pr, el, R };
    }
    const at = (c, z) => c[Math.max(0, Math.min(c.length - 1, Math.round(z / DZ)))][1];
    function draw() {
      if (!ready) return;
      const c = curves();
      const f = RT.frame(svg, { h: 340, m: { l: 40, r: 16, t: 30, b: 42 }, x: [0, ZMAX], y: [0, 110], xt: [0, 5, 10, 15, 20, 25, 30], yt: [0, 20, 40, 60, 80, 100], yf: (v) => v + '%', xl: 'depth in water (cm)', yl: 'Dose relative to each beam’s maximum' });
      const series = [['ph', c.ph, f.pal.s1, RT.PHOTON[st.ph].name + ' photons'], ['el', c.ee, f.pal.s2, st.E + ' MeV electrons'], ['pr', c.pr, f.pal.s3, st.P + ' MeV protons']];
      const labels = [];
      series.forEach(([k, pts, col, name]) => {
        if (!st.show[k]) return;
        Lab.svg('path', { d: RT.path(pts.filter((p, i) => i % 2 === 0 || p[0] > c.R - 2), f.X, f.Y), fill: 'none', stroke: col, 'stroke-width': 2, 'stroke-linejoin': 'round' }, f.g);
        // label: photons near the right end, electrons just past their range, protons at the peak
        let lx, ly;
        if (k === 'ph') { lx = 24; ly = at(pts, 24) + 6; }
        else if (k === 'el') { lx = c.el.Rp + 0.6; ly = 22; }
        else { lx = Math.min(ZMAX - 0.5, c.R + 0.5); ly = 104; }
        labels.push({ x: f.X(lx), y: f.Y(ly), name, anchor: k === 'pr' && c.R > 22 ? 'end' : 'start' });
      });
      labels.sort((a, b) => a.y - b.y);
      for (let i = 1; i < labels.length; i++) if (Math.abs(labels[i].x - labels[i - 1].x) < 120 && labels[i].y - labels[i - 1].y < 14) labels[i].y = labels[i - 1].y + 14;
      labels.forEach((l) => { const t = Lab.svg('text', { x: l.x, y: l.y, 'font-size': 11, fill: f.pal.ink2, 'text-anchor': l.anchor }, f.g); t.textContent = l.name; });
      const cross = Lab.svg('line', { y1: f.m.t, y2: f.H - f.m.b, stroke: f.pal.ink3, 'stroke-dasharray': '3 3', visibility: 'hidden' }, f.g);
      const hit = Lab.svg('rect', { x: f.m.l, y: f.m.t, width: f.W - f.m.l - f.m.r, height: f.H - f.m.t - f.m.b, fill: 'transparent' }, svg);
      hit.addEventListener('mousemove', (e) => {
        const r = svg.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * f.W;
        const z = Math.max(0, Math.min(ZMAX, ((x - f.m.l) / (f.W - f.m.l - f.m.r)) * ZMAX));
        cross.setAttribute('x1', f.X(z)); cross.setAttribute('x2', f.X(z)); cross.setAttribute('visibility', 'visible');
        const rows = series.filter(([k]) => st.show[k]).map(([k, pts, , name]) => `${name}: <b>${Math.round(at(pts, z))}%</b>`);
        tip.show((f.X(z) / f.W) * r.width, (f.m.t / f.H) * r.height + 40, `<b>${z.toFixed(1)} cm</b><br>${rows.join('<br>')}`, 60);
      });
      hit.addEventListener('mouseleave', () => { tip.hide(); cross.setAttribute('visibility', 'hidden'); });
      // readouts
      let dmax = 0, pm = 0; c.ph.forEach(([z, v]) => { if (v > pm) { pm = v; dmax = z; } });
      let r90 = 0; for (let i = 0; i < c.ee.length; i++) { if (c.ee[i][1] >= 99.9) r90 = 0; if (c.ee[i][0] > 0.3 && c.ee[i][1] >= 90) r90 = c.ee[i][0]; if (c.ee[i][0] > c.el.Rp) break; }
      let peak = 0, pv = 0; c.pr.forEach(([z, v]) => { if (v > pv) { pv = v; peak = z; } });
      out.innerHTML = `<span>photons: peak at <b>${dmax.toFixed(1)} cm</b>, <b>${Math.round(at(c.ph, 10))}%</b> at 10 cm</span><span>electrons: 90% dose to <b>${r90.toFixed(1)} cm</b>, practical range <b>${c.el.Rp.toFixed(1)} cm</b></span><span>protons: peak at <b>${peak.toFixed(1)} cm</b>, entrance <b>${Math.round(c.pr[0][1])}%</b> of peak</span>`;
    }
    Lab.$$('[data-ph]', root).forEach((b) => b.addEventListener('click', () => {
      st.ph = b.dataset.ph; Lab.$$('[data-ph]', root).forEach((o) => o.setAttribute('aria-pressed', o === b ? 'true' : 'false'));
      const ssdIn = Lab.$('#dd-ssd', root); ssdIn.value = RT.PHOTON[st.ph].ssd; ssdIn.dispatchEvent(new Event('input'));
    }));
    [['#dd-showph', 'ph'], ['#dd-showel', 'el'], ['#dd-showpr', 'pr']].forEach(([id, k]) => Lab.$(id, root).addEventListener('change', (e) => { st.show[k] = e.target.checked; draw(); }));
    Lab.slider(Lab.$('#dd-ssd', root), (v) => v + ' cm', (v) => { st.ssd = v; draw(); });
    Lab.slider(Lab.$('#dd-e', root), (v) => v + ' MeV', (v) => { st.E = v; draw(); });
    Lab.slider(Lab.$('#dd-p', root), (v) => v + ' MeV', (v) => { st.P = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();

  /* ---------- Fig 4.1 Penumbra: source size and geometry ---------- */
  (function () {
    const root = Lab.$('#fig-penumbra');
    if (!root) return;
    const cv = Lab.$('canvas', root), out = Lab.$('.readouts', root);
    const PRE = { co60: { s: 2.0, ssd: 80, sdd: 55, sig0: 0.15 }, linac: { s: 0.2, ssd: 100, sdd: 60, sig0: 0.22 } };
    const st = { s: 2.0, ssd: 80, sdd: 55, d: 5, sig0: 0.15 };
    let ready = false;
    const inputs = { s: Lab.$('#pn-s', root), ssd: Lab.$('#pn-ssd', root), sdd: Lab.$('#pn-sdd', root), d: Lab.$('#pn-d', root) };
    // Profile across the field edge at depth d: a linear ramp the width of the geometric penumbra
    // (uniform source seen past the jaw edge) blurred by lateral electron and scatter transport.
    const profile = (x) => {
      const P = (st.s * (st.ssd + st.d - st.sdd)) / st.sdd, sig = st.sig0 + 0.02 * st.d;
      // convolve ramp with Gaussian numerically
      let s = 0, ws = 0;
      for (let k = -40; k <= 40; k++) {
        const u = (k / 40) * 3 * sig, wgt = Math.exp(-0.5 * (u / sig) ** 2), xx = x - u;
        const ramp = P > 1e-6 ? Math.max(0, Math.min(1, 0.5 - xx / P)) : xx < 0 ? 1 : 0;
        s += wgt * ramp; ws += wgt;
      }
      return { v: s / ws, P };
    };
    function draw() {
      if (!ready) return;
      const narrow = (cv.clientWidth || 600) < 560;
      const { ctx, w, h } = Lab.canvas(cv, narrow ? 1.5 : 0.48), pal = Lab.palette();
      ctx.clearRect(0, 0, w, h);
      ctx.font = `11px ${mono()}`;
      // geometry diagram
      const dw = narrow ? w : Math.round(w * 0.42), dh = narrow ? Math.round(w * 0.78) : h;
      const top = 18, bot = dh - 22, zmax = 130 + 20; // cm from source
      const Z = (z) => top + (z / zmax) * (bot - top);
      const ax = dw * 0.36; // field edge column; field is to the left
      const sx = (x) => ax + x * (dw * 0.09); // lateral cm scale (exaggerated)
      const sHalf = st.s / 2;
      // source
      ctx.fillStyle = pal.s2; ctx.fillRect(sx(-sHalf - 3), Z(0) - 4, Math.max(2, sx(sHalf - 3) - sx(-sHalf - 3)), 8);
      ctx.fillStyle = pal.ink2; ctx.textAlign = 'left'; ctx.fillText(`source ${st.s.toFixed(1)} cm`, sx(sHalf - 3) + 8, Z(0) + 4);
      // jaw
      ctx.fillStyle = pal.ink3; ctx.fillRect(ax, Z(st.sdd) - 7, dw - ax - 8, 14);
      ctx.fillStyle = pal.ink2; ctx.fillText('jaw', dw - 40, Z(st.sdd) - 11);
      // patient surface and depth line
      ctx.fillStyle = Lab.css('--accent-wash'); ctx.fillRect(4, Z(st.ssd), dw - 8, bot - Z(st.ssd));
      ctx.strokeStyle = pal.rule; ctx.beginPath(); ctx.moveTo(4, Z(st.ssd)); ctx.lineTo(dw - 4, Z(st.ssd)); ctx.stroke();
      ctx.fillStyle = pal.ink2; ctx.fillText('skin', 8, Z(st.ssd) - 5);
      const zd = st.ssd + st.d;
      ctx.setLineDash([3, 3]); ctx.strokeStyle = pal.ink3; ctx.beginPath(); ctx.moveTo(4, Z(zd)); ctx.lineTo(dw - 4, Z(zd)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = pal.ink3; ctx.fillText(`depth ${st.d} cm`, 8, Z(zd) + 14);
      // rays from each source edge past the jaw edge (source center is 3 cm left of the edge column, schematic)
      const srcC = -3;
      const ray = (xs) => { const t = (zd - 0) / st.sdd; const xj = 0; return xs + (xj - xs) * t; };
      const xa = ray(srcC - sHalf), xb = ray(srcC + sHalf);
      ctx.fillStyle = Lab.rgbStr(Lab.rgb('--s2'), 0.22);
      ctx.beginPath(); ctx.moveTo(sx(0), Z(st.sdd)); ctx.lineTo(sx(xa), Z(zd)); ctx.lineTo(sx(xb), Z(zd)); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = pal.s2; ctx.lineWidth = 1.2;
      [[srcC - sHalf, xa], [srcC + sHalf, xb]].forEach(([xs, xe]) => { ctx.beginPath(); ctx.moveTo(sx(xs), Z(0)); ctx.lineTo(sx(xe), Z(zd)); ctx.stroke(); });
      ctx.lineWidth = 1;
      ctx.fillStyle = pal.ink2; ctx.textAlign = 'center';
      ctx.fillText('penumbra', (sx(xa) + sx(xb)) / 2, Z(zd) + 28 > bot ? Z(zd) - 6 : Z(zd) + 28);
      ctx.textAlign = 'left';
      // profile chart
      const x0 = narrow ? 44 : dw + 52, y0 = narrow ? dh + 30 : 26, pw = w - x0 - 14, ph = (narrow ? h - dh - 30 : h - 26) - 42;
      const X = Lab.scale(-3, 3, x0, x0 + pw), Y = Lab.scale(0, 1.05, y0 + ph, y0);
      ctx.fillStyle = pal.ink2; ctx.fillText('Dose across the field edge', x0, y0 - 10);
      ctx.strokeStyle = pal.grid;
      [0, 0.2, 0.5, 0.8, 1].forEach((v) => { ctx.beginPath(); ctx.moveTo(x0, Y(v)); ctx.lineTo(x0 + pw, Y(v)); ctx.stroke(); ctx.fillStyle = pal.ink3; ctx.textAlign = 'right'; ctx.fillText(Math.round(v * 100) + '%', x0 - 6, Y(v) + 4); });
      ctx.textAlign = 'center'; [-3, -2, -1, 0, 1, 2, 3].forEach((v) => ctx.fillText(v, X(v), y0 + ph + 16));
      ctx.textAlign = 'left'; ctx.fillText('cm from the field edge (inside ← → outside)', x0, y0 + ph + 32);
      ctx.strokeStyle = pal.s1; ctx.lineWidth = 2; ctx.beginPath();
      const pts = []; for (let i = 0; i <= 240; i++) { const x = -3 + (6 * i) / 240, v = profile(x).v; pts.push([x, v]); i ? ctx.lineTo(X(x), Y(v)) : ctx.moveTo(X(x), Y(v)); }
      ctx.stroke(); ctx.lineWidth = 1;
      const cross = (lv) => { for (let i = 1; i < pts.length; i++) if (pts[i - 1][1] >= lv && pts[i][1] < lv) return pts[i - 1][0] + ((pts[i - 1][1] - lv) / (pts[i - 1][1] - pts[i][1])) * (pts[i][0] - pts[i - 1][0]); return 0; };
      const x80 = cross(0.8), x20 = cross(0.2);
      ctx.fillStyle = Lab.css('--accent-wash'); ctx.fillRect(X(x80), y0, X(x20) - X(x80), ph);
      const P = profile(0).P;
      out.innerHTML = `<span>geometric penumbra <b>${(P * 10).toFixed(1)} mm</b></span><span>measured width, 80% to 20% <b>${((x20 - x80) * 10).toFixed(1)} mm</b></span>`;
    }
    const setPreset = (k) => {
      const p = PRE[k]; st.sig0 = p.sig0;
      [['s', p.s], ['ssd', p.ssd], ['sdd', p.sdd]].forEach(([n, v]) => { inputs[n].value = v; inputs[n].dispatchEvent(new Event('input')); });
      Lab.$$('[data-pn]', root).forEach((o) => o.setAttribute('aria-pressed', o.dataset.pn === k ? 'true' : 'false'));
    };
    Lab.$$('[data-pn]', root).forEach((b) => b.addEventListener('click', () => setPreset(b.dataset.pn)));
    Lab.slider(inputs.s, (v) => v.toFixed(1) + ' cm', (v) => { st.s = v; draw(); });
    Lab.slider(inputs.ssd, (v) => v + ' cm', (v) => { st.ssd = v; if (st.sdd > v - 10) { inputs.sdd.value = v - 10; inputs.sdd.dispatchEvent(new Event('input')); } draw(); });
    Lab.slider(inputs.sdd, (v) => v + ' cm', (v) => { st.sdd = Math.min(v, st.ssd - 10); draw(); });
    Lab.slider(inputs.d, (v) => v + ' cm', (v) => { st.d = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(cv, draw);
  })();
})();
