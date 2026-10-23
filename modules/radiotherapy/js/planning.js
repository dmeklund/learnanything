/* Volume VI, planning and delivery figures: inverse-planned IMRT, the spread-out Bragg peak, gamma analysis. */
(function () {
  const film = () => ({ bg: Lab.css('--film'), ink: Lab.css('--film-ink'), ink2: Lab.css('--film-ink-2'), tissue: Lab.rgb('--film-tissue') });
  const mono = () => Lab.css('--f-mono');

  /* ---------- Fig 7.1 Inverse planning around a C-shaped target ---------- */
  (function () {
    const root = Lab.$('#fig-imrt');
    if (!root) return;
    const cv = Lab.$('canvas', root), svg = Lab.$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    const RX = 50; // prescription, Gy
    const G = { nx: 64, ny: 46, h: 0.5, x0: -16, y0: -11.5, bodyA: 14, bodyB: 10 };
    const CY = -1.5;
    const body = RT.inEllipse(0, 0, G.bodyA, G.bodyB), core = RT.inCircle(0, CY, 1.0);
    const ptv = (x, y) => { const r = Math.hypot(x, y - CY); if (r < 1.5 || r > 3.7) return false; const a = Math.atan2(y - CY, x); return !(a < -Math.PI / 2 + 0.75 && a > -Math.PI / 2 - 0.75); };
    const st = { n: 7, mode: 'imrt', pri: 1, iter: 0 };
    const MAXIT = 160;
    let E, roles, T, O, N, opt, D, raf = 0, ready = false;
    function build() {
      const angles = Array.from({ length: st.n }, (_, i) => (i * 360) / st.n);
      E = RT.engine({ ...G, body, angles, w: 0.5, half: 5 });
      roles = new Uint8Array(E.NV); T = new Uint8Array(E.NV); O = new Uint8Array(E.NV); N = new Uint8Array(E.NV);
      E.vox.forEach((p, v) => {
        const x = G.x0 + ((p % G.nx) + 0.5) * G.h, y = G.y0 + (Math.floor(p / G.nx) + 0.5) * G.h;
        if (ptv(x, y)) { roles[v] = 1; T[v] = 1; } else if (core(x, y)) { roles[v] = 2; O[v] = 1; } else N[v] = 1;
      });
    }
    const goals = () => ({ wT: 1, wO: 2 * st.pri, wN: 0.05, oar: 0.25, normal: 0.5 });
    function plan() {
      cancelAnimationFrame(raf);
      build();
      if (st.mode === 'conf') { D = RT.dose(E, RT.conformal(E, T)); st.iter = 0; draw(); return; }
      opt = RT.optimizer(E, roles, goals()); st.iter = 0; D = opt.D;
      const finish = () => { const w = opt.wts; RT.normalize(E, w, T); D = RT.dose(E, w); };
      if (Lab.reducedMotion) { opt.step(MAXIT); st.iter = MAXIT; finish(); draw(); return; }
      const tick = () => {
        opt.step(8); st.iter += 8;
        D = opt.D;
        if (st.iter >= MAXIT) { finish(); draw(); return; }
        draw(); raf = requestAnimationFrame(tick);
      };
      tick();
    }
    function full() { const F = new Float32Array(G.nx * G.ny).fill(NaN); E.vox.forEach((p, v) => (F[p] = D[v])); return F; }
    function drawPlan(ctx, X0, Y0, Wd, Hd) {
      const Fm = film(), F = full();
      ctx.fillStyle = Fm.bg; ctx.fillRect(X0, Y0, Wd, Hd);
      const sx = Wd / (G.nx * G.h), sy = Hd / (G.ny * G.h);
      const P = (x, y) => [X0 + (x - G.x0) * sx, Y0 + Hd - (y - G.y0) * sy];
      // CT-like body
      const [cx, cy] = P(0, 0);
      ctx.fillStyle = Lab.rgbStr(Fm.tissue); ctx.beginPath(); ctx.ellipse(cx, cy, G.bodyA * sx, G.bodyB * sy, 0, 0, 7); ctx.fill();
      RT.paintDose(ctx, F, G.nx, G.ny, X0, Y0, Wd, Hd, { lo: 0.2, hi: 1.05, alpha: 0.75 });
      // structures
      ctx.lineWidth = 1.5; ctx.strokeStyle = Fm.ink;
      const [ox, oy] = P(0, CY);
      ctx.beginPath(); ctx.arc(ox, oy, 1.0 * sx, 0, 7); ctx.stroke();
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); const a0 = -Math.PI / 2 + 0.75, a1 = 3 * Math.PI / 2 - 0.75;
      ctx.arc(ox, oy, 3.7 * sx, -a0, -a1, true); ctx.arc(ox, oy, 1.5 * sx, -a1, -a0, false); ctx.closePath(); ctx.stroke();
      ctx.setLineDash([]); ctx.lineWidth = 1;
      // isodose lines at 95% and 50%
      ctx.strokeStyle = Lab.css('--wash-5'); ctx.lineWidth = 1.4; RT.strokeContour(ctx, F.map((v) => (v >= 0 ? v : 0)), G.nx, G.ny, 0.95, X0, Y0, Wd, Hd);
      ctx.strokeStyle = Lab.css('--wash-2'); RT.strokeContour(ctx, F.map((v) => (v >= 0 ? v : 0)), G.nx, G.ny, 0.5, X0, Y0, Wd, Hd);
      ctx.lineWidth = 1;
      // beam directions
      E.angles.forEach((deg) => {
        const t = (deg * Math.PI) / 180;
        const [x1, y1] = P((G.bodyA + 0.4) * Math.sin(t), (G.bodyB + 0.4) * Math.cos(t)), [x2, y2] = P((G.bodyA + 1.4) * Math.sin(t), (G.bodyB + 1.4) * Math.cos(t));
        ctx.strokeStyle = Fm.ink2; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.lineWidth = 1;
      });
      ctx.font = `11px ${mono()}`; ctx.fillStyle = Fm.ink; ctx.textAlign = 'right';
      ctx.fillText(st.mode === 'conf' ? 'open fields' : `iteration ${st.iter}`, X0 + Wd - 8, Y0 + 16); ctx.textAlign = 'left';
      ctx.fillStyle = Fm.ink2; ctx.fillText('lines: 95% and 50% of prescription', X0 + 8, Y0 + Hd - 8);
    }
    function drawDVH() {
      const f = RT.frame(svg, { h: 300, m: { l: 44, r: 16, t: 30, b: 42 }, x: [0, 1.25 * RX], y: [0, 1], xt: [0, 10, 20, 30, 40, 50, 60], yt: [0, 0.25, 0.5, 0.75, 1], yf: (v) => Math.round(v * 100) + '%', xl: 'dose (Gy)', yl: 'Volume receiving at least this dose' });
      const sets = [[T, f.pal.s1, 'target', 0.5], [O, f.pal.s2, 'core', 0.85], [N, f.pal.s3, 'other tissue', 0.2]];
      const curves = sets.map(([M, col, name, lv]) => {
        const h = RT.dvh(D, M, 1.25, 125).map(([d, v]) => [d * RX, v]);
        Lab.svg('path', { d: RT.path(h, f.X, f.Y), fill: 'none', stroke: col, 'stroke-width': 2 }, f.g);
        return { h, name, lv };
      });
      // direct labels where each curve crosses 50% volume (nudged apart)
      curves.forEach((c) => {
        const p = c.h.find((q) => q[1] <= c.lv) || c.h[c.h.length - 1];
        const t = Lab.svg('text', { x: Math.min(f.X(p[0]) + 6, f.W - f.m.r - 80), y: f.Y(c.lv) - 4, 'font-size': 11, fill: f.pal.ink2 }, f.g); t.textContent = c.name;
      });
      const hit = Lab.svg('rect', { x: f.m.l, y: f.m.t, width: f.W - f.m.l - f.m.r, height: f.H - f.m.t - f.m.b, fill: 'transparent' }, svg);
      hit.addEventListener('mousemove', (e) => {
        const r = svg.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * f.W;
        const d = ((x - f.m.l) / (f.W - f.m.l - f.m.r)) * 1.25 * RX;
        const rows = curves.map((c) => { const p = c.h.reduce((a, b) => (Math.abs(b[0] - d) < Math.abs(a[0] - d) ? b : a)); return `${c.name}: ${Math.round(p[1] * 100)}%`; });
        tip.show(e.clientX - r.left, (f.m.t / f.H) * r.height + 50, `<b>≥ ${d.toFixed(0)} Gy</b><br>${rows.join('<br>')}`, 70);
      });
      hit.addEventListener('mouseleave', () => tip.hide());
    }
    function draw() {
      if (!ready || !D) return;
      const { ctx, w, h } = Lab.canvas(cv, (G.ny / G.nx));
      ctx.clearRect(0, 0, w, h);
      drawPlan(ctx, 0, 0, w, h);
      drawDVH();
      let omax = 0; for (let v = 0; v < E.NV; v++) if (O[v]) omax = Math.max(omax, D[v]);
      const d95 = RT.dq(D, T, 0.95) * RX, d2 = RT.dq(D, T, 0.02) * RX;
      out.innerHTML = `<span>target D95 <b>${d95.toFixed(1)} Gy</b></span><span>target D2 <b>${d2.toFixed(1)} Gy</b></span><span>core maximum <b class="${omax * RX > 25 ? 'warn' : ''}">${(omax * RX).toFixed(1)} Gy</b></span>`;
    }
    Lab.$$('[data-nb]', root).forEach((b) => b.addEventListener('click', () => { st.n = +b.dataset.nb; Lab.$$('[data-nb]', root).forEach((o) => o.setAttribute('aria-pressed', o === b ? 'true' : 'false')); plan(); }));
    Lab.$$('[data-mode]', root).forEach((b) => b.addEventListener('click', () => { st.mode = b.dataset.mode; Lab.$$('[data-mode]', root).forEach((o) => o.setAttribute('aria-pressed', o === b ? 'true' : 'false')); Lab.$('#im-pri', root).disabled = st.mode === 'conf'; plan(); }));
    let tmr = 0;
    Lab.slider(Lab.$('#im-pri', root), (v) => '×' + Math.pow(10, v).toPrecision(2).replace(/\.0$/, ''), (v) => { st.pri = Math.pow(10, v); if (ready) { clearTimeout(tmr); tmr = setTimeout(plan, 120); } });
    ready = true;
    // compute the finished plan synchronously so the figure is complete on load
    build(); opt = RT.optimizer(E, roles, goals()); opt.step(MAXIT); st.iter = MAXIT; RT.normalize(E, opt.wts, T); D = RT.dose(E, opt.wts);
    draw();
    Lab.onTheme(draw); Lab.onResize(cv, draw);
  })();

  /* ---------- Fig 8.1 Spread-out Bragg peak ---------- */
  (function () {
    const root = Lab.$('#fig-sobp');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    const st = { Rd: 16, Wm: 6, err: 0, photon: true };
    let ready = false;
    const DZ = 0.05, ZMAX = 30, NZ = Math.round(ZMAX / DZ) + 1;
    const cache = new Map();
    const peak = (R) => { const k = R.toFixed(3); if (!cache.has(k)) { cache.set(k, RT.bragg(R, DZ, ZMAX).d); if (cache.size > 300) cache.delete(cache.keys().next().value); } return cache.get(k); };
    function solve() {
      const step = 0.4, K = Math.max(1, Math.round(st.Wm / step) + 1);
      const Rs = Array.from({ length: K }, (_, k) => st.Rd - k * step).filter((r) => r > 1);
      const P = Rs.map(peak), w = new Float64Array(Rs.length);
      const zi = (z) => Math.round(z / DZ);
      // back-to-front: each peak tops up the dose at its own peak depth to 1
      Rs.forEach((R, k) => {
        let mx = 0, im = 0; P[k].forEach((v, i) => { if (v > mx) { mx = v; im = i; } });
        let cur = 0; for (let j = 0; j < k; j++) cur += w[j] * P[j][im];
        w[k] = Math.max(0, (1 - cur) / mx);
      });
      // refine: multiplicative updates toward a flat plateau over the modulation region
      const lo = zi(st.Rd - st.Wm), hi = zi(st.Rd - 0.25);
      for (let it = 0; it < 40; it++) {
        const D = new Float64Array(NZ); P.forEach((p, k) => { for (let i = 0; i < NZ; i++) D[i] += w[k] * p[i]; });
        P.forEach((p, k) => { let num = 0, den = 0; for (let i = lo; i <= hi; i++) { num += p[i]; den += p[i] * D[i]; } if (den > 0) w[k] *= Math.pow(num / den, 0.7); });
      }
      return { Rs, P, w };
    }
    function draw() {
      if (!ready) return;
      const { Rs, P, w } = solve();
      const D = new Float64Array(NZ); P.forEach((p, k) => { for (let i = 0; i < NZ; i++) D[i] += w[k] * p[i]; });
      // normalize to the plateau mean
      const lo = Math.round((st.Rd - st.Wm) / DZ), hi = Math.round((st.Rd - 0.25) / DZ);
      let m = 0; for (let i = lo; i <= hi; i++) m += D[i]; m /= hi - lo + 1;
      const pts = [], shifted = [];
      const sh = Math.round((st.err / 10) / DZ);
      for (let i = 0; i < NZ; i++) { pts.push([i * DZ, (100 * D[i]) / m]); const j = i - sh; shifted.push([i * DZ, j >= 0 && j < NZ ? (100 * D[j]) / m : (100 * D[0]) / m]); }
      const f = RT.frame(svg, { h: 330, m: { l: 40, r: 16, t: 30, b: 42 }, x: [0, ZMAX], y: [0, 130], xt: [0, 5, 10, 15, 20, 25, 30], yt: [0, 25, 50, 75, 100, 125], yf: (v) => v + '%', xl: 'depth in water (cm)', yl: 'Dose relative to the plateau' });
      // target region
      Lab.svg('rect', { x: f.X(st.Rd - st.Wm), y: f.m.t, width: f.X(st.Rd) - f.X(st.Rd - st.Wm), height: f.H - f.m.t - f.m.b, fill: Lab.css('--accent-wash') }, f.g);
      const tt = Lab.svg('text', { x: (f.X(st.Rd - st.Wm) + f.X(st.Rd)) / 2, y: f.m.t + 14, 'text-anchor': 'middle', 'font-size': 11, fill: f.pal.ink2 }, f.g); tt.textContent = 'target';
      // pristine peaks
      P.forEach((p, k) => { const q = []; for (let i = 0; i < NZ; i += 2) q.push([i * DZ, (100 * w[k] * p[i]) / m]); Lab.svg('path', { d: RT.path(q, f.X, f.Y), fill: 'none', stroke: f.pal.s3, 'stroke-opacity': 0.35, 'stroke-width': 1 }, f.g); });
      // photon comparison: one 6 MV field, normalized to 100% at mid-target (parallel beam)
      if (st.photon) {
        const mid = st.Rd - st.Wm / 2, k = 100 / RT.tissue6(mid), q = [];
        for (let z = 0; z <= ZMAX; z += 0.1) q.push([z, k * RT.tissue6(z)]);
        Lab.svg('path', { d: RT.path(q, f.X, (v) => f.Y(Math.min(130, v))), fill: 'none', stroke: f.pal.s1, 'stroke-width': 2, 'stroke-dasharray': '6 4' }, f.g);
        const t = Lab.svg('text', { x: f.X(20.5), y: f.Y(Math.min(126, k * RT.tissue6(20.5))) + 24, 'font-size': 11, fill: f.pal.ink2 }, f.g); t.textContent = 'one photon beam';
      }
      if (st.err) Lab.svg('path', { d: RT.path(shifted.filter((_, i) => i % 2 === 0), f.X, f.Y), fill: 'none', stroke: f.pal.s2, 'stroke-width': 2 }, f.g);
      Lab.svg('path', { d: RT.path(pts.filter((_, i) => i % 2 === 0), f.X, f.Y), fill: 'none', stroke: f.pal.s3, 'stroke-width': 2.4 }, f.g);
      const lb = Lab.svg('text', { x: Math.min(f.X(st.Rd) + 6, f.W - f.m.r - 120), y: f.Y(108), 'font-size': 11, fill: f.pal.ink2 }, f.g); lb.textContent = 'spread-out Bragg peak';
      if (st.err) { const t = Lab.svg('text', { x: Math.min(f.X(st.Rd + st.err / 10) + 6, f.W - f.m.r - 4), y: f.Y(60), 'font-size': 11, fill: f.pal.ink2, 'text-anchor': f.X(st.Rd + st.err / 10) + 140 > f.W ? 'end' : 'start' }, f.g); t.textContent = `range ${st.err > 0 ? 'overshoot' : 'undershoot'} ${Math.abs(st.err)} mm`; }
      const hit = Lab.svg('rect', { x: f.m.l, y: f.m.t, width: f.W - f.m.l - f.m.r, height: f.H - f.m.t - f.m.b, fill: 'transparent' }, svg);
      hit.addEventListener('mousemove', (e) => {
        const r = svg.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * f.W;
        const z = Math.max(0, Math.min(ZMAX, ((x - f.m.l) / (f.W - f.m.l - f.m.r)) * ZMAX)), i = Math.round(z / DZ);
        const ph = st.photon ? `<br>photon beam ${Math.round((100 / RT.tissue6(st.Rd - st.Wm / 2)) * RT.tissue6(z))}%` : '';
        tip.show(e.clientX - r.left, (f.Y(Math.min(125, pts[i][1])) / f.H) * r.height - 8, `<b>${z.toFixed(1)} cm</b><br>protons ${Math.round(pts[i][1])}%${st.err ? `<br>with range error ${Math.round(shifted[i][1])}%` : ''}${ph}`, (f.Y(pts[i][1]) / f.H) * r.height + 12);
      });
      hit.addEventListener('mouseleave', () => tip.hide());
      // distal falloff 80% to 20%
      let z80 = 0, z20 = 0; for (let i = hi; i < NZ; i++) { if (!z80 && pts[i][1] < 80) z80 = pts[i][0]; if (!z20 && pts[i][1] < 20) { z20 = pts[i][0]; break; } }
      const beyond = Math.round(shifted[Math.min(NZ - 1, Math.round((st.Rd + 0.5) / DZ))][1]);
      out.innerHTML = `<span>pristine peaks <b>${Rs.length}</b></span><span>entrance dose <b>${Math.round(pts[0][1])}%</b></span><span>distal falloff, 80% to 20% <b>${((z20 - z80) * 10).toFixed(1)} mm</b></span><span>dose 5 mm past the target <b class="${beyond > 30 ? 'warn' : ''}">${beyond}%</b></span>`;
    }
    Lab.slider(Lab.$('#sb-r', root), (v) => v + ' cm', (v) => { st.Rd = v; draw(); });
    Lab.slider(Lab.$('#sb-w', root), (v) => v + ' cm', (v) => { st.Wm = v; draw(); });
    Lab.slider(Lab.$('#sb-e', root), (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + ' mm', (v) => { st.err = v; draw(); });
    Lab.$('#sb-ph', root).addEventListener('change', (e) => { st.photon = e.target.checked; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();

  /* ---------- Fig 9.1 Gamma analysis ---------- */
  (function () {
    const root = Lab.$('#fig-gamma');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    const st = { shift: 1.5, derr: 1, dta: 2, dd: 3 };
    let ready = false;
    // A modulated profile like one row of an IMRT field: segments of different intensity, blurred by the beam penumbra.
    const XS = 1; // mm sampling
    const xs = []; for (let x = -80; x <= 80; x += XS) xs.push(x);
    const segs = [[-62, -40, 0.55], [-40, -18, 1.0], [-18, -6, 0.35], [-6, 14, 0.85], [14, 30, 0.62], [30, 58, 0.95]];
    const ideal = (x) => segs.reduce((s, [a, b, v]) => s + v * 0.5 * (RT.erf((x - a) / 4.2) - RT.erf((x - b) / 4.2)), 0) + 0.03;
    const ref = xs.map(ideal), rmax = Math.max(...ref);
    const noise = (() => { const r = Lab.rng(61); return xs.map(() => Lab.gauss(r) * 0.006); })();
    function draw() {
      if (!ready) return;
      const meas = xs.map((x, i) => ideal(x - st.shift) * (1 + st.derr / 100) + noise[i] * rmax);
      // global gamma, 10% low-dose threshold, search over reference points within 3 x DTA
      const gam = meas.map((m, i) => {
        if (m < 0.1 * rmax) return null;
        let best = Infinity; const R = Math.ceil((3 * st.dta) / XS);
        for (let j = Math.max(0, i - R); j <= Math.min(xs.length - 1, i + R); j++) {
          const dx = (xs[j] - xs[i]) / st.dta, dD = (m - ref[j]) / ((st.dd / 100) * rmax);
          best = Math.min(best, dx * dx + dD * dD);
        }
        return Math.sqrt(best);
      });
      const ddOnly = meas.map((m, i) => (m < 0.1 * rmax ? null : Math.abs(m - ref[i]) / ((st.dd / 100) * rmax)));
      const val = gam.filter((g) => g !== null), pass = val.filter((g) => g <= 1).length / val.length;
      const passDD = ddOnly.filter((g) => g !== null && g <= 1).length / val.length;
      const W = Math.max(280, svg.clientWidth || 600), H = 380;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H); svg.innerHTML = '';
      const pal = Lab.palette(), m = { l: 44, r: 16 }, X = Lab.scale(-80, 80, m.l, W - m.r);
      const top = { t: 30, b: 210 }, bot = { t: 250, b: 340 };
      const Y1 = Lab.scale(0, 1.15, top.b, top.t), Y2 = Lab.scale(0, 2, bot.b, bot.t);
      const g = Lab.svg('g', {}, svg);
      const T = (x, y, s, o = {}) => { const t = Lab.svg('text', { x, y, 'font-size': 11, fill: o.fill || pal.ink3, 'text-anchor': o.a || 'start' }, g); t.textContent = s; return t; };
      [0, 0.5, 1].forEach((v) => { Lab.svg('line', { x1: m.l, x2: W - m.r, y1: Y1(v), y2: Y1(v), stroke: pal.grid }, g); T(m.l - 6, Y1(v) + 4, Math.round(v * 100) + '%', { a: 'end' }); });
      [0, 1, 2].forEach((v) => { Lab.svg('line', { x1: m.l, x2: W - m.r, y1: Y2(v), y2: Y2(v), stroke: v === 1 ? pal.ink3 : pal.grid, 'stroke-dasharray': v === 1 ? '4 3' : '' }, g); T(m.l - 6, Y2(v) + 4, v, { a: 'end' }); });
      [-80, -40, 0, 40, 80].forEach((v) => T(X(v), bot.b + 16, v, { a: 'middle' }));
      T(W - m.r, bot.b + 32, 'position across the field (mm)', { a: 'end', fill: pal.ink2 });
      T(m.l, top.t - 10, 'Dose profile: planned and measured', { fill: pal.ink2 });
      T(m.l, bot.t - 10, 'Gamma at each measured point (pass if ≤ 1)', { fill: pal.ink2 });
      const line = (vals, Y, col, wdt, dash) => Lab.svg('path', { d: vals.map((v, i) => (i ? 'L' : 'M') + X(xs[i]).toFixed(1) + ' ' + Y(v).toFixed(1)).join(''), fill: 'none', stroke: col, 'stroke-width': wdt, 'stroke-dasharray': dash || '' }, g);
      line(ref.map((v) => v / rmax), Y1, pal.s1, 2);
      line(meas.map((v) => v / rmax), Y1, pal.s2, 1.6, '5 3');
      T(X(62), Y1(ref[xs.indexOf(50)] / rmax) - 10, 'planned', { fill: pal.ink2 });
      T(X(-78), Y1(0.12), 'dashed: measured', { fill: pal.ink2 });
      // gamma bars
      gam.forEach((gv, i) => {
        if (gv === null || i % 2) return;
        const v = Math.min(2, gv);
        Lab.svg('line', { x1: X(xs[i]), x2: X(xs[i]), y1: Y2(0), y2: Y2(v), stroke: gv > 1 ? pal.s2 : pal.ink3, 'stroke-width': gv > 1 ? 2 : 1.2 }, g);
      });
      const cross = Lab.svg('line', { y1: top.t, y2: bot.b, stroke: pal.ink3, 'stroke-dasharray': '3 3', visibility: 'hidden' }, g);
      const hit = Lab.svg('rect', { x: m.l, y: top.t, width: W - m.l - m.r, height: bot.b - top.t, fill: 'transparent' }, svg);
      hit.addEventListener('mousemove', (e) => {
        const r = svg.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * W;
        const i = Math.max(0, Math.min(xs.length - 1, Math.round((((x - m.l) / (W - m.l - m.r)) * 160) / XS)));
        cross.setAttribute('x1', X(xs[i])); cross.setAttribute('x2', X(xs[i])); cross.setAttribute('visibility', 'visible');
        const gv = gam[i];
        tip.show((X(xs[i]) / W) * r.width, (Y1(Math.max(ref[i], meas[i]) / rmax) / H) * r.height - 10, `<b>${xs[i]} mm</b><br>planned ${Math.round((100 * ref[i]) / rmax)}%, measured ${Math.round((100 * meas[i]) / rmax)}%<br>${gv === null ? 'below 10% threshold' : `gamma ${gv.toFixed(2)} ${gv <= 1 ? 'pass' : 'fail'}`}`, (Y1(0) / H) * r.height);
      });
      hit.addEventListener('mouseleave', () => { tip.hide(); cross.setAttribute('visibility', 'hidden'); });
      const verdict = pass >= 0.95 ? 'within tolerance' : pass >= 0.9 ? 'investigate' : 'action needed';
      out.innerHTML = `<span>gamma pass rate <b class="${pass < 0.95 ? 'warn' : ''}">${(pass * 100).toFixed(1)}%</b></span><span>dose-difference test alone <b>${(passDD * 100).toFixed(1)}%</b></span><span>TG-218: <b>${verdict}</b></span>`;
    }
    Lab.slider(Lab.$('#gm-s', root), (v) => v.toFixed(1) + ' mm', (v) => { st.shift = v; draw(); });
    Lab.slider(Lab.$('#gm-e', root), (v) => (v > 0 ? '+' : '') + v + '%', (v) => { st.derr = v; draw(); });
    Lab.slider(Lab.$('#gm-dta', root), (v) => v + ' mm', (v) => { st.dta = v; draw(); });
    Lab.slider(Lab.$('#gm-dd', root), (v) => v + '%', (v) => { st.dd = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();
})();
