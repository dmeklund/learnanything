/* Volume VII, Part II figures: a reaction on a potential energy surface, Metropolis Monte Carlo,
   and molecular dynamics. */
(function () {
  const lbl = (g, x, y, s, fill, anchor = 'start', size = 11) => { const t = Lab.svg('text', { x, y, 'font-size': size, fill, 'text-anchor': anchor }, g); t.textContent = s; return t; };
  const mono = () => Lab.css('--f-mono');

  /* ---------- Fig 6.1 H + H2 on the LEPS surface ---------- */
  (function () {
    const root = Lab.$('#fig-pes');
    if (!root) return;
    const cv = Lab.$('canvas', root), out = Lab.$('.readouts', root);
    const st = { Ec: 0.5, Ev: 0.27, phase: 0.25 };
    let ready = false, traj = null, raf = 0, prog = 1, bg = null;
    const R0 = 0.5, R1 = 3.0, MH = 1.00794, ACC = 9.648533e-3; // amu; eV/(Å·amu) to Å/fs²
    const V = (a, b) => CC.leps(a, b);
    let saddle = null;
    (() => { let best = 1e9, rb = 0; for (let r = 0.8; r < 1.1; r += 0.0005) { const v = V(r, r); if (v < best) { best = v; rb = r; } } saddle = { r: rb, E: best - V(0.7414, 20) }; })();
    function run() {
      // collinear A + BC with x1 < x2 < x3; r1 = AB, r2 = BC
      const De = -V(20, 0.7414);
      // BC stretched or compressed so that its vibrational energy is Ev (phase picks which turning point region)
      const Vbc = (r) => V(20, r) + De;
      let rt = 0.7414; if (st.Ev > 0) { const sgn = st.phase < 0.5 ? 1 : -1; let lo = 0.7414, hi = sgn > 0 ? 2.5 : 0.4; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (Vbc(m) < st.Ev) lo = m; else hi = m; } rt = lo; }
      let x = [0, 3.2, 3.2 + rt];
      const mu = (MH * 2 * MH) / (3 * MH), vrel = Math.sqrt((2 * st.Ec) / mu) * 0.09822694; // sqrt(eV/amu) in Å/fs
      let v = [vrel * (2 / 3), -vrel / 3, -vrel / 3];
      const force = (x) => {
        const r1 = x[1] - x[0], r2 = x[2] - x[1], h = 1e-5;
        const d1 = (V(r1 + h, r2) - V(r1 - h, r2)) / (2 * h), d2 = (V(r1, r2 + h) - V(r1, r2 - h)) / (2 * h);
        return [d1, -d1 + d2, -d2];
      };
      const dt = 0.05, path = [[x[1] - x[0], x[2] - x[1]]];
      let F = force(x), t = 0;
      while (t < 300) {
        for (let k = 0; k < 4; k++) {
          for (let i = 0; i < 3; i++) { v[i] += 0.5 * dt * (F[i] / MH) * ACC; x[i] += dt * v[i]; }
          F = force(x);
          for (let i = 0; i < 3; i++) v[i] += 0.5 * dt * (F[i] / MH) * ACC;
          t += dt;
        }
        const r1 = x[1] - x[0], r2 = x[2] - x[1]; path.push([r1, r2]);
        if (r1 > 3.4 || r2 > 3.4) break;
      }
      const last = path[path.length - 1];
      traj = { path, reactive: last[1] > last[0], t };
    }
    function paintBG(w, h, sq, x0, y0) {
      const off = document.createElement('canvas'), dpr = cv.width / w; off.width = cv.width; off.height = cv.height;
      const c = off.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = 120, img = c.createImageData(n, n), stops = [1, 2, 3, 4, 5].map((k) => Lab.rgb('--pes-' + k)), base = V(0.7414, 20);
      const grid = new Float32Array(n * n);
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const r1 = R0 + ((R1 - R0) * (i + 0.5)) / n, r2 = R0 + ((R1 - R0) * (j + 0.5)) / n, e = V(r1, r2) - base;
        grid[j * n + i] = e;
        const t = Math.max(0, Math.min(1, e / 4)), xk = t * 4, k = Math.min(3, Math.floor(xk)), fr = xk - k, a = stops[k], b = stops[k + 1];
        const o = ((n - 1 - j) * n + i) * 4; img.data[o] = a[0] + (b[0] - a[0]) * fr; img.data[o + 1] = a[1] + (b[1] - a[1]) * fr; img.data[o + 2] = a[2] + (b[2] - a[2]) * fr; img.data[o + 3] = 255;
      }
      const tmp = document.createElement('canvas'); tmp.width = n; tmp.height = n; tmp.getContext('2d').putImageData(img, 0, 0);
      c.imageSmoothingEnabled = true; c.drawImage(tmp, x0, y0, sq, sq);
      // contour lines every 0.25 eV up to 2.5 eV
      c.strokeStyle = Lab.rgbStr(Lab.rgb('--ink'), 0.28); c.lineWidth = 0.8;
      for (let lv = 0.25; lv <= 2.5; lv += 0.25) {
        const segs = []; const at = (i, j) => grid[j * n + i];
        for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
          const a = at(i, j), b = at(i + 1, j), cc = at(i + 1, j + 1), d = at(i, j + 1), idx = (a >= lv ? 1 : 0) | (b >= lv ? 2 : 0) | (cc >= lv ? 4 : 0) | (d >= lv ? 8 : 0);
          if (!idx || idx === 15) continue;
          const L = (p, q) => (lv - p) / (q - p), e = [[i + L(a, b), j], [i + 1, j + L(b, cc)], [i + L(d, cc), j + 1], [i, j + L(a, d)]];
          const T = { 1: [[0, 3]], 2: [[0, 1]], 3: [[1, 3]], 4: [[1, 2]], 5: [[0, 1], [2, 3]], 6: [[0, 2]], 7: [[2, 3]], 8: [[2, 3]], 9: [[0, 2]], 10: [[0, 3], [1, 2]], 11: [[1, 2]], 12: [[1, 3]], 13: [[0, 1]], 14: [[0, 3]] }[idx];
          T.forEach(([p, q]) => segs.push([e[p], e[q]]));
        }
        c.beginPath(); const s = sq / n;
        segs.forEach(([p, q]) => { c.moveTo(x0 + (p[0] + 0.5) * s, y0 + sq - (p[1] + 0.5) * s); c.lineTo(x0 + (q[0] + 0.5) * s, y0 + sq - (q[1] + 0.5) * s); });
        c.stroke();
      }
      return off;
    }
    function draw() {
      if (!ready) return;
      const narrow = (cv.clientWidth || 600) < 560;
      if (!cv.clientWidth) return;
      const { ctx, w, h } = Lab.canvas(cv, narrow ? 1.12 : 0.62), pal = Lab.palette();
      ctx.clearRect(0, 0, w, h);
      const sq = narrow ? w - 50 : h - 50, x0 = 44, y0 = 8;
      if (!bg || bg.w !== w || bg.theme !== pal.ink) bg = { img: paintBG(w, h, sq, x0, y0), w, theme: pal.ink };
      ctx.drawImage(bg.img, 0, 0, w, h);
      const X = Lab.scale(R0, R1, x0, x0 + sq), Y = Lab.scale(R0, R1, y0 + sq, y0);
      ctx.font = `11px ${mono()}`; ctx.fillStyle = pal.ink3; ctx.textAlign = 'center';
      [0.5, 1, 1.5, 2, 2.5, 3].forEach((v) => { ctx.fillText(v, X(v), y0 + sq + 14); ctx.textAlign = 'right'; ctx.fillText(v, x0 - 6, Y(v) + 4); ctx.textAlign = 'center'; });
      ctx.fillStyle = pal.ink2; ctx.fillText('A–B distance (Å)', x0 + sq / 2, y0 + sq + 30);
      ctx.save(); ctx.translate(12, y0 + sq / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('B–C distance (Å)', 0, 0); ctx.restore();
      // labels for valleys and saddle
      ctx.textAlign = 'left'; ctx.fillStyle = Lab.css('--pes-5');
      ctx.fillText('reactants: A + BC', X(1.9), Y(0.55));
      ctx.save(); ctx.translate(X(0.58), Y(2.95)); ctx.rotate(Math.PI / 2); ctx.fillText('products: AB + C', 0, 0); ctx.restore();
      ctx.strokeStyle = Lab.css('--pes-5'); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X(saddle.r), Y(saddle.r), 5, 0, 7); ctx.stroke();
      ctx.fillText('saddle point', X(saddle.r) + 9, Y(saddle.r) - 6);
      // trajectory
      if (traj) {
        const n = Math.max(2, Math.floor(traj.path.length * prog));
        ctx.strokeStyle = Lab.css('--s2'); ctx.lineWidth = 1.8; ctx.beginPath();
        for (let i = 0; i < n; i++) { const [a, b] = traj.path[i]; if (a > R1 || b > R1) continue; i ? ctx.lineTo(X(a), Y(b)) : ctx.moveTo(X(a), Y(b)); }
        ctx.stroke(); ctx.lineWidth = 1;
        const [a, b] = traj.path[n - 1];
        if (a <= R1 && b <= R1) { ctx.fillStyle = Lab.css('--s2'); ctx.beginPath(); ctx.arc(X(a), Y(b), 5, 0, 7); ctx.fill(); }
      }
      // three atoms on a line, at the current frame
      if (traj) {
        const [a, b] = traj.path[Math.max(0, Math.floor(traj.path.length * prog) - 1)];
        const bx = narrow ? 44 : x0 + sq + 30, by = narrow ? y0 + sq + 56 : y0 + 40, span = narrow ? w - 60 : w - bx - 12, sc = span / 7.5;
        const pos = [0, Math.min(3.5, a), Math.min(3.5, a) + Math.min(3.5, b)], off = bx + (span - pos[2] * sc) / 2;
        ctx.fillStyle = pal.ink2; ctx.textAlign = 'left'; ctx.fillText('the three atoms now', bx, by - 18);
        pos.forEach((p, i) => { ctx.fillStyle = [Lab.css('--s1'), pal.ink2, Lab.css('--s3')][i]; ctx.beginPath(); ctx.arc(off + p * sc, by, 9, 0, 7); ctx.fill(); ctx.fillStyle = pal.paper; ctx.textAlign = 'center'; ctx.fillText('ABC'[i], off + p * sc, by + 4); });
        if (prog >= 1) { ctx.fillStyle = pal.ink; ctx.textAlign = 'left'; ctx.fillText(traj.reactive ? 'Reaction: A–B formed, C left.' : 'No reaction: A bounced off.', bx, by + 34); }
      }
      out.innerHTML = `<span>barrier on this surface <b>${saddle.E.toFixed(2)} eV</b> (${(saddle.E * 23.06).toFixed(1)} kcal/mol)</span><span>saddle at <b>${saddle.r.toFixed(2)} Å</b> each bond</span><span>outcome <b>${traj ? (traj.reactive ? 'reactive' : 'non-reactive') : '…'}</b></span>`;
    }
    function launch() {
      run(); cancelAnimationFrame(raf);
      if (Lab.reducedMotion) { prog = 1; draw(); return; }
      prog = 0; const t0 = performance.now();
      const step = (now) => { prog = Math.min(1, (now - t0) / 2200); draw(); if (prog < 1) raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
    }
    Lab.slider(Lab.$('#pe-c', root), (v) => v.toFixed(2) + ' eV', (v) => { st.Ec = v; if (ready) { run(); prog = 1; draw(); } });
    Lab.slider(Lab.$('#pe-v', root), (v) => v.toFixed(2) + ' eV', (v) => { st.Ev = v; if (ready) { run(); prog = 1; draw(); } });
    Lab.slider(Lab.$('#pe-p', root), (v) => (v < 0.5 ? 'stretched' : 'compressed'), (v) => { st.phase = v; if (ready) { run(); prog = 1; draw(); } });
    Lab.$('#pe-go', root).addEventListener('click', launch);
    ready = true; run(); draw();
    Lab.onTheme(() => { bg = null; draw(); }); Lab.onResize(cv, () => { bg = null; draw(); });
  })();

  /* ---------- Fig 7.1 Metropolis sampling of butane's twist ---------- */
  (function () {
    const root = Lab.$('#fig-mc');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    // Ryckaert–Bellemans torsion for butane (kJ/mol), psi = phi - 180°
    const C = [9.28, 12.16, -13.12, -3.06, 26.24, -31.5];
    const U = (deg) => { const c = Math.cos(((deg - 180) * Math.PI) / 180); let s = 0, p = 1; for (const k of C) { s += k * p; p *= c; } return s; };
    const R = 8.314462618e-3;
    const st = { T: 300, step: 30, phi: 180, n: 0, acc: 0, hist: new Float64Array(72), trace: [] };
    let ready = false, raf = 0, running = false, rng = Lab.rng(11);
    const reset = () => { st.phi = 180; st.n = 0; st.acc = 0; st.hist.fill(0); st.trace = []; rng = Lab.rng(11); };
    const exact = () => { const p = new Float64Array(72); let z = 0; for (let i = 0; i < 72; i++) { let s = 0; for (let k = 0; k < 10; k++) s += Math.exp(-U(i * 5 + (k + 0.5) * 0.5) / (R * st.T)); p[i] = s; z += s; } return p.map((v) => v / z); };
    const isTrans = (phi) => phi > 120 && phi < 240;
    function steps(k) {
      for (let i = 0; i < k; i++) {
        const trial = (st.phi + (rng() * 2 - 1) * st.step + 360) % 360, dU = U(trial) - U(st.phi);
        if (dU <= 0 || rng() < Math.exp(-dU / (R * st.T))) { st.phi = trial; st.acc++; }
        st.n++; st.hist[Math.floor(st.phi / 5) % 72]++;
        if (st.n % 10 === 0) { st.trace.push(st.phi); if (st.trace.length > 300) st.trace.shift(); }
      }
    }
    function draw() {
      if (!ready) return;
      const W = Math.max(280, svg.clientWidth || 600), H = 380; svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H); svg.innerHTML = '';
      const pal = Lab.palette(), g = Lab.svg('g', {}, svg), m = { l: 48, r: 16 };
      const X = Lab.scale(0, 360, m.l, W - m.r), top = { t: 30, b: 220 }, bot = { t: 262, b: 344 };
      const ex = exact(), tot = st.n || 1, pmax = Math.max(...ex, ...Array.from(st.hist, (v) => v / tot)) * 1.1;
      const Y = Lab.scale(0, pmax, top.b, top.t), Yu = Lab.scale(0, 30, top.b, top.t);
      [0, 60, 120, 180, 240, 300, 360].forEach((v) => { Lab.svg('line', { x1: X(v), x2: X(v), y1: top.t, y2: bot.b, stroke: pal.grid }, g); lbl(g, X(v), bot.b + 16, v + '°', pal.ink3, 'middle'); });
      lbl(g, W - m.r, bot.b + 32, 'C–C–C–C dihedral angle', pal.ink2, 'end');
      lbl(g, m.l, top.t - 10, 'How often each angle is visited; dotted: torsion energy (kJ/mol, left scale)', pal.ink2);
      lbl(g, m.l, bot.t - 8, 'The walk over time (latest 3,000 steps)', pal.ink2);
      // energy profile, own scale on the left (kJ/mol)
      [0, 10, 20, 30].forEach((v) => lbl(g, m.l - 6, Yu(v) + 4, v, pal.ink3, 'end', 10.5));
      const up = []; for (let a = 0; a <= 360; a += 2) up.push([a, Math.min(30, U(a))]);
      Lab.svg('path', { d: up.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Yu(p[1]).toFixed(1)).join(''), fill: 'none', stroke: pal.ink3, 'stroke-width': 1.4, 'stroke-dasharray': '2 3' }, g);
      // histogram bars and exact distribution
      const bw = (X(5) - X(0)) - 1;
      st.hist.forEach((c, i) => { const v = c / tot; if (v > 0) Lab.svg('rect', { x: X(i * 5) + 0.5, y: Y(v), width: Math.max(1, bw), height: top.b - Y(v), fill: pal.s1, 'fill-opacity': 0.75 }, g); });
      Lab.svg('path', { d: Array.from(ex).map((v, i) => (i ? 'L' : 'M') + X(i * 5 + 2.5).toFixed(1) + ' ' + Y(v).toFixed(1)).join(''), fill: 'none', stroke: pal.s2, 'stroke-width': 2 }, g);
      lbl(g, X(185), Y(ex[37]) - 8, 'Boltzmann, exact', pal.ink2);
      lbl(g, X(60), top.t + 12, 'gauche', pal.ink3, 'middle', 10.5); lbl(g, X(300), top.t + 12, 'gauche', pal.ink3, 'middle', 10.5); lbl(g, X(120), top.t + 12, 'trans →', pal.ink3, 'middle', 10.5);
      // trace
      const Yt = Lab.scale(0, 360, bot.b, bot.t), tr = st.trace;
      tr.forEach((phi, i) => Lab.svg('circle', { cx: m.l + ((W - m.l - m.r) * i) / 300, cy: Yt(phi), r: 1.6, fill: pal.s3 }, g));
      [0, 180, 360].forEach((v) => lbl(g, m.l - 6, Yt(v) + 4, v + '°', pal.ink3, 'end', 10));
      const hit = Lab.svg('rect', { x: m.l, y: top.t, width: W - m.l - m.r, height: top.b - top.t, fill: 'transparent' }, svg);
      hit.addEventListener('mousemove', (e) => { const r = svg.getBoundingClientRect(), a = Math.max(0, Math.min(359, (((e.clientX - r.left) / r.width) * W - m.l) / (W - m.l - m.r) * 360)), i = Math.floor(a / 5); tip.show(e.clientX - r.left, (top.t / H) * r.height + 40, `<b>${i * 5}–${i * 5 + 5}°</b><br>energy ${U(i * 5 + 2.5).toFixed(1)} kJ/mol<br>sampled ${(st.hist[i] / tot * 100).toFixed(2)}%<br>exact ${(ex[i] * 100).toFixed(2)}%`, (top.t / H) * r.height + 60); });
      hit.addEventListener('mouseleave', () => tip.hide());
      let tS = 0, tE = 0; for (let i = 0; i < 72; i++) { if (isTrans(i * 5 + 2.5)) { tS += st.hist[i] / tot; tE += ex[i]; } }
      out.innerHTML = `<span>steps <b>${st.n.toLocaleString()}</b></span><span>moves accepted <b>${st.n ? Math.round((100 * st.acc) / st.n) : 0}%</b></span><span>trans, sampled <b>${(tS * 100).toFixed(1)}%</b></span><span>trans, exact <b>${(tE * 100).toFixed(1)}%</b></span>`;
    }
    const MAX = 200000;
    const loop = () => { if (!running) return; if (st.n < MAX) { steps(400); draw(); } raf = requestAnimationFrame(loop); };
    Lab.slider(Lab.$('#mc-t', root), (v) => v + ' K', (v) => { st.T = v; reset(); if (ready && (Lab.reducedMotion || !running)) { steps(40000); draw(); } });
    Lab.slider(Lab.$('#mc-s', root), (v) => v + '°', (v) => { st.step = v; reset(); if (ready && (Lab.reducedMotion || !running)) { steps(40000); draw(); } });
    Lab.$('#mc-r', root).addEventListener('click', () => { reset(); if (Lab.reducedMotion) steps(40000); draw(); });
    ready = true; steps(20000); draw();
    if (!Lab.reducedMotion) Lab.whenVisible(svg, () => { if (!running) { running = true; loop(); } }, () => { running = false; cancelAnimationFrame(raf); });
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();

  /* ---------- Fig 8.1 Molecular dynamics of a Lennard-Jones fluid in two dimensions ---------- */
  (function () {
    const root = Lab.$('#fig-md');
    if (!root) return;
    const cv = Lab.$('canvas', root), out = Lab.$('.readouts', root);
    // reduced units: sigma = 1, epsilon = 1, mass = 1; argon-like scale: epsilon/k = 120 K, sigma = 3.4 Å
    const COLS = 12, ROWS = 14, N = COLS * ROWS, RHO = 0.85, A = Math.sqrt(2 / (Math.sqrt(3) * RHO)), LX = COLS * A, LY = ROWS * A * Math.sqrt(3) / 2, RC = 2.5, DT = 0.005, EPSK = 120;
    const ecut = 4 * (Math.pow(RC, -12) - Math.pow(RC, -6));
    const st = { T: 40 };
    const x = new Float64Array(N), y = new Float64Array(N), vx = new Float64Array(N), vy = new Float64Array(N), fx = new Float64Array(N), fy = new Float64Array(N);
    const NB = 60, gr = new Float64Array(NB), GRMAX = 3.0; let grN = 0, Epot = 0, Tnow = 0, steps = 0;
    let running = false, raf = 0;
    // start on a triangular lattice with random velocities
    (() => {
      const r = Lab.rng(7);
      for (let i = 0; i < N; i++) { const c = i % COLS, rr = Math.floor(i / COLS); x[i] = (c + 0.25 + (rr % 2) * 0.5) * A; y[i] = (rr + 0.5) * A * Math.sqrt(3) / 2; vx[i] = Lab.gauss(r); vy[i] = Lab.gauss(r); }
      let px = 0, py = 0; for (let i = 0; i < N; i++) { px += vx[i]; py += vy[i]; } for (let i = 0; i < N; i++) { vx[i] -= px / N; vy[i] -= py / N; }
      rescale(st.T / EPSK);
    })();
    function rescale(Tt) { let k = 0; for (let i = 0; i < N; i++) k += vx[i] * vx[i] + vy[i] * vy[i]; const T = k / (2 * (N - 1)); const s = Math.sqrt(Tt / (T || 1)); for (let i = 0; i < N; i++) { vx[i] *= s; vy[i] *= s; } }
    function forces() {
      fx.fill(0); fy.fill(0); Epot = 0;
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        let dx = x[i] - x[j], dy = y[i] - y[j];
        dx -= LX * Math.round(dx / LX); dy -= LY * Math.round(dy / LY);
        const r2 = dx * dx + dy * dy;
        if (r2 < RC * RC) {
          const ir2 = 1 / r2, ir6 = ir2 * ir2 * ir2, f = 24 * ir2 * ir6 * (2 * ir6 - 1);
          fx[i] += f * dx; fy[i] += f * dy; fx[j] -= f * dx; fy[j] -= f * dy;
          Epot += 4 * ir6 * (ir6 - 1) - ecut;
        }
      }
    }
    forces();
    function advance(k) {
      for (let s = 0; s < k; s++) {
        for (let i = 0; i < N; i++) { vx[i] += 0.5 * DT * fx[i]; vy[i] += 0.5 * DT * fy[i]; x[i] = (x[i] + DT * vx[i] + LX) % LX; y[i] = (y[i] + DT * vy[i] + LY) % LY; }
        forces();
        for (let i = 0; i < N; i++) { vx[i] += 0.5 * DT * fx[i]; vy[i] += 0.5 * DT * fy[i]; }
        // Berendsen thermostat with a slow coupling, so heating and cooling take visible time
        let ke = 0; for (let i = 0; i < N; i++) ke += vx[i] * vx[i] + vy[i] * vy[i];
        Tnow = ke / (2 * (N - 1));
        const lam = Math.sqrt(1 + 0.004 * ((st.T / EPSK) / Tnow - 1)); for (let i = 0; i < N; i++) { vx[i] *= lam; vy[i] *= lam; }
        steps++;
      }
      // radial distribution function, decaying average
      for (let b = 0; b < NB; b++) gr[b] *= 0.9;
      grN = grN * 0.9 + 1;
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        let dx = x[i] - x[j], dy = y[i] - y[j]; dx -= LX * Math.round(dx / LX); dy -= LY * Math.round(dy / LY);
        const r = Math.sqrt(dx * dx + dy * dy); if (r < GRMAX) gr[Math.floor((r / GRMAX) * NB)] += 2;
      }
    }
    function draw() {
      const narrow = (cv.clientWidth || 600) < 560;
      const { ctx, w, h } = Lab.canvas(cv, narrow ? 1.7 : 0.5), pal = Lab.palette();
      if (!w) return;
      ctx.clearRect(0, 0, w, h);
      const sq = narrow ? w : h, s = sq / Math.max(LX, LY), bw = LX * s, bh = LY * s;
      ctx.fillStyle = pal.paper3; ctx.fillRect(0, 0, bw, bh); ctx.strokeStyle = pal.rule; ctx.strokeRect(0.5, 0.5, bw - 1, bh - 1);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, bw, bh); ctx.clip();
      const col = Lab.rgb('--s1');
      for (let i = 0; i < N; i++) {
        const sp = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]), t = Math.min(1, sp / 3);
        ctx.fillStyle = Lab.rgbStr(col, 0.35 + 0.65 * t);
        ctx.beginPath(); ctx.arc(x[i] * s, bh - y[i] * s, 0.5 * s * 0.92, 0, 7); ctx.fill();
      }
      ctx.restore();
      ctx.font = `11px ${mono()}`; ctx.fillStyle = pal.ink2; ctx.fillText(`${N} atoms, periodic box`, 6, bh + 14 > sq ? 14 : bh + 14);
      // g(r)
      const x0 = narrow ? 40 : sq + 52, y0 = narrow ? sq + 36 : 26, pw = w - x0 - 14, ph = (narrow ? h - sq - 36 : h - 26) - 42;
      const X = Lab.scale(0, GRMAX, x0, x0 + pw), Y = Lab.scale(0, 5, y0 + ph, y0);
      ctx.fillStyle = pal.ink2; ctx.textAlign = 'left'; ctx.fillText('Radial distribution function g(r)', x0, y0 - 10);
      ctx.strokeStyle = pal.grid; [0, 1, 2, 3, 4, 5].forEach((v) => { ctx.beginPath(); ctx.moveTo(x0, Y(v)); ctx.lineTo(x0 + pw, Y(v)); ctx.stroke(); ctx.fillStyle = pal.ink3; ctx.textAlign = 'right'; ctx.fillText(v, x0 - 6, Y(v) + 4); });
      ctx.textAlign = 'center'; [0, 1, 2, 3].forEach((v) => ctx.fillText((v * 3.4).toFixed(1), X(v), y0 + ph + 16));
      ctx.textAlign = 'left'; ctx.fillText('distance (Å, argon scale)', x0, y0 + ph + 32);
      ctx.strokeStyle = pal.s2; ctx.lineWidth = 2; ctx.beginPath();
      for (let b = 0; b < NB; b++) {
        const r0 = (b / NB) * GRMAX, r1 = ((b + 1) / NB) * GRMAX, area = Math.PI * (r1 * r1 - r0 * r0), v = grN ? gr[b] / (grN * N * RHO * area) : 0;
        const xm = X((r0 + r1) / 2); b ? ctx.lineTo(xm, Y(Math.min(5, v))) : ctx.moveTo(xm, Y(Math.min(5, v)));
      }
      ctx.stroke(); ctx.lineWidth = 1;
      ctx.strokeStyle = pal.ink3; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x0, Y(1)); ctx.lineTo(x0 + pw, Y(1)); ctx.stroke(); ctx.setLineDash([]);
      out.innerHTML = `<span>target <b>${st.T} K</b></span><span>current temperature <b>${Math.round(Tnow * EPSK)} K</b></span><span>potential energy per atom <b>${(Epot / N * EPSK * 8.314e-3).toFixed(2)} kJ/mol</b></span><span>simulated time <b>${(steps * DT * 2.15).toFixed(0)} ps</b></span>`;
    }
    const loop = () => { if (!running) return; advance(8); draw(); raf = requestAnimationFrame(loop); };
    Lab.slider(Lab.$('#md-t', root), (v) => v + ' K', (v) => { st.T = v; if (Lab.reducedMotion) { advance(600); draw(); } });
    // equilibrate so the first frame shows a settled state
    advance(400); draw();
    if (!Lab.reducedMotion) Lab.whenVisible(cv, () => { if (!running) { running = true; loop(); } }, () => { running = false; cancelAnimationFrame(raf); });
    Lab.onTheme(draw); Lab.onResize(cv, draw);
  })();
})();
