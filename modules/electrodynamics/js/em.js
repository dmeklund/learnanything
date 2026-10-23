/* Volume IX shared core: point-charge fields and field-line tracing, complete elliptic integrals
   for current loops, a 1-D and a 2-D finite-difference time-domain (Yee) solver, the Boris particle
   pusher, and the chart frame. Exposed as window.EM. */
(function () {
  const EM = {};

  /* ---------- Point charges in a plane (3-D Coulomb fields, arbitrary units) ---------- */
  EM.field = (Q, x, y) => {
    let ex = 0, ey = 0;
    for (const q of Q) { const dx = x - q.x, dy = y - q.y, r2 = dx * dx + dy * dy + 1e-9, r3 = r2 * Math.sqrt(r2); ex += (q.q * dx) / r3; ey += (q.q * dy) / r3; }
    return [ex, ey];
  };
  EM.potential = (Q, x, y) => Q.reduce((s, q) => s + q.q / Math.hypot(x - q.x, y - q.y), 0);
  // Trace a field line with RK4 on the unit direction field; stops near a charge of opposite sign or outside the box
  EM.trace = (Q, x0, y0, dir, box, h = 0.01, maxN = 3000) => {
    const pts = [[x0, y0]]; let x = x0, y = y0;
    const u = (x, y) => { const [ex, ey] = EM.field(Q, x, y), n = Math.hypot(ex, ey) || 1; return [(dir * ex) / n, (dir * ey) / n]; };
    for (let i = 0; i < maxN; i++) {
      const k1 = u(x, y), k2 = u(x + (h / 2) * k1[0], y + (h / 2) * k1[1]), k3 = u(x + (h / 2) * k2[0], y + (h / 2) * k2[1]), k4 = u(x + h * k3[0], y + h * k3[1]);
      x += (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); y += (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
      pts.push([x, y]);
      if (x < box[0] || x > box[1] || y < box[2] || y > box[3]) break;
      if (Q.some((q) => Math.hypot(x - q.x, y - q.y) < 0.04 && q.q * dir < 0)) break;
    }
    return pts;
  };
  // Flux of E through a sphere (centre in the plane) by midpoint quadrature; returns flux / 4π, which equals the enclosed charge
  EM.sphereFlux = (Q, cx, cy, R, nt = 48, np = 96) => {
    let s = 0;
    for (let i = 0; i < nt; i++) {
      const th = ((i + 0.5) / nt) * Math.PI, st = Math.sin(th), ct = Math.cos(th);
      for (let j = 0; j < np; j++) {
        const ph = ((j + 0.5) / np) * 2 * Math.PI, nx = st * Math.cos(ph), ny = st * Math.sin(ph), nz = ct;
        const px = cx + R * nx, py = cy + R * ny, pz = R * nz;
        let ex = 0, ey = 0, ez = 0;
        for (const q of Q) { const dx = px - q.x, dy = py - q.y, dz = pz, r2 = dx * dx + dy * dy + dz * dz, r3 = r2 * Math.sqrt(r2); ex += (q.q * dx) / r3; ey += (q.q * dy) / r3; ez += (q.q * dz) / r3; }
        s += (ex * nx + ey * ny + ez * nz) * R * R * st * (Math.PI / nt) * ((2 * Math.PI) / np);
      }
    }
    return s / (4 * Math.PI);
  };

  /* ---------- Complete elliptic integrals by the arithmetic-geometric mean ---------- */
  EM.ellipKE = (m) => {
    // m = k^2
    let a = 1, b = Math.sqrt(1 - m), c = Math.sqrt(m), sum = 0.5 * c * c, pow = 0.5;
    for (let i = 0; i < 30 && Math.abs(c) > 1e-15; i++) { const an = (a + b) / 2, bn = Math.sqrt(a * b); c = (a - b) / 2; pow *= 2; sum += pow * c * c; a = an; b = bn; }
    const K = Math.PI / (2 * a);
    return { K, E: K * (1 - sum) };
  };
  // Flux function psi = rho * A_phi of a circular loop of radius a at height z0 carrying unit current (mu0/4pi = 1 units).
  // Contours of psi are magnetic field lines in the meridian plane.
  EM.loopPsi = (a, z0, rho, z) => {
    const r = Math.abs(rho); if (r < 1e-9) return 0;
    const dz = z - z0, m = (4 * a * r) / ((a + r) ** 2 + dz * dz);
    if (m >= 1) return 0;
    const { K, E } = EM.ellipKE(m), k = Math.sqrt(m);
    const Aphi = (4 / k) * Math.sqrt(a / r) * ((1 - m / 2) * K - E);
    return Math.sign(rho) * r * Aphi;
  };
  // Axial field of a loop (unit current, mu0/4pi = 1): B = 2 pi a^2 / (a^2 + dz^2)^(3/2)
  EM.loopBz = (a, z0, z) => (2 * Math.PI * a * a) / Math.pow(a * a + (z - z0) ** 2, 1.5);

  /* ---------- 1-D FDTD (Yee 1966) in normalized units, Courant number 0.5 ---------- */
  EM.fdtd1 = (N, epsr) => {
    const E = new Float64Array(N), H = new Float64Array(N), S = 0.5;
    let e1 = 0; // boundary memory for the left absorbing boundary
    return {
      E, H, t: 0,
      step(src) {
        for (let i = 0; i < N - 1; i++) H[i] += S * (E[i + 1] - E[i]);
        const left = E[1];
        for (let i = 1; i < N; i++) E[i] += (S / epsr[i]) * (H[i] - H[i - 1]);
        if (src) E[src.i] += src.v(this.t);
        E[0] = e1; e1 = left; // exact one-way boundary for S = 0.5 in vacuum: E0(n+1) = E1(n-1)
        this.t++;
      },
    };
  };

  /* ---------- 2-D FDTD, TM mode (Ez, Hx, Hy), with an absorbing border of graded loss ---------- */
  EM.fdtd2 = (nx, ny, border = 14) => {
    const Ez = new Float32Array(nx * ny), Hx = new Float32Array(nx * ny), Hy = new Float32Array(nx * ny), damp = new Float32Array(nx * ny), S = 0.5;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const d = Math.min(i, j, nx - 1 - i, ny - 1 - j), t = Math.max(0, (border - d) / border);
      damp[j * nx + i] = 1 - 0.35 * t * t;
    }
    return {
      Ez, nx, ny, t: 0,
      step(srcs) {
        for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
          const k = j * nx + i;
          Hx[k] = (Hx[k] - S * (Ez[k + nx] - Ez[k])) * damp[k];
          Hy[k] = (Hy[k] + S * (Ez[k + 1] - Ez[k])) * damp[k];
        }
        for (let j = 1; j < ny; j++) for (let i = 1; i < nx; i++) {
          const k = j * nx + i;
          Ez[k] = (Ez[k] + S * (Hy[k] - Hy[k - 1] - Hx[k] + Hx[k - nx])) * damp[k];
        }
        srcs.forEach((s) => { Ez[s.j * nx + s.i] += s.v(this.t); });
        this.t++;
      },
    };
  };

  /* ---------- Boris pusher for a charge in uniform E (in the plane) and B (out of the plane), q/m = 1 ---------- */
  EM.boris = (x, v, E, Bz, dt, n) => {
    const pts = [[x[0], x[1]]]; let [px, py] = x, [vx, vy] = v;
    for (let k = 0; k < n; k++) {
      const vmx = vx + 0.5 * dt * E[0], vmy = vy + 0.5 * dt * E[1];
      const t = 0.5 * dt * Bz, s = (2 * t) / (1 + t * t);
      const vpx = vmx + vmy * t, vpy = vmy - vmx * t;
      const vplx = vmx + vpy * s, vply = vmy - vpx * s;
      vx = vplx + 0.5 * dt * E[0]; vy = vply + 0.5 * dt * E[1];
      px += dt * vx; py += dt * vy; pts.push([px, py]);
    }
    return pts;
  };

  /* ---------- Chart helpers (same contract as earlier volumes) ---------- */
  EM.frame = (svg, o) => {
    const W = Math.max(280, svg.clientWidth || svg.parentElement.clientWidth || 600), H = o.h;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H); svg.innerHTML = '';
    const m = o.m, pal = Lab.palette();
    const X = (o.xlog ? Lab.logScale : Lab.scale)(o.x[0], o.x[1], m.l, W - m.r), Y = (o.ylog ? Lab.logScale : Lab.scale)(o.y[0], o.y[1], H - m.b, m.t);
    const g = Lab.svg('g', {}, svg);
    (o.yt || []).forEach((v) => { Lab.svg('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), stroke: pal.grid }, g); const t = Lab.svg('text', { x: m.l - 6, y: Y(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: pal.ink3 }, g); t.textContent = o.yf ? o.yf(v) : v; });
    (o.xt || []).forEach((v) => { Lab.svg('line', { x1: X(v), x2: X(v), y1: m.t, y2: H - m.b, stroke: pal.grid }, g); const t = Lab.svg('text', { x: X(v), y: H - m.b + 16, 'text-anchor': 'middle', 'font-size': 11, fill: pal.ink3 }, g); t.textContent = o.xf ? o.xf(v) : v; });
    Lab.svg('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, stroke: pal.ink3 }, g);
    if (o.xl) { const t = Lab.svg('text', { x: W - m.r, y: H - m.b + 32, 'text-anchor': 'end', 'font-size': 11, fill: pal.ink2 }, g); t.textContent = o.xl; }
    if (o.yl) { const t = Lab.svg('text', { x: m.l, y: m.t - 10, 'font-size': 11, fill: pal.ink2 }, g); t.textContent = o.yl; }
    return { W, H, X, Y, g, pal, m };
  };
  EM.path = (pts, X, Y) => pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join('');
  EM.text = (g, x, y, s, fill, anchor = 'start', size = 11) => { const t = Lab.svg('text', { x, y, 'font-size': size, fill, 'text-anchor': anchor }, g); t.textContent = s; return t; };
  EM.hover = (svg, f, x0, x1, onMove, onLeave) => {
    const hit = Lab.svg('rect', { x: f.m.l, y: f.m.t, width: f.W - f.m.l - f.m.r, height: f.H - f.m.t - f.m.b, fill: 'transparent' }, svg);
    hit.addEventListener('mousemove', (e) => { const r = svg.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * f.W, t = (px - f.m.l) / (f.W - f.m.l - f.m.r); onMove(x0 + t * (x1 - x0), r.width / f.W, r.height / f.H, e.clientX - r.left, e.clientY - r.top); });
    hit.addEventListener('mouseleave', onLeave);
  };
  // Diverging color for a signed field value in [-1, 1]: blue for negative, vermilion for positive, paper at zero
  EM.diverge = () => { const n = Lab.rgb('--s1'), p = Lab.rgb('--s2'), z = Lab.rgb('--paper'); return (v) => { const t = Math.max(-1, Math.min(1, v)); return t < 0 ? Lab.mix(z, n, -t) : Lab.mix(z, p, t); }; };

  if (typeof window !== 'undefined') window.EM = EM;
  if (typeof module !== 'undefined') module.exports = EM;
})();
