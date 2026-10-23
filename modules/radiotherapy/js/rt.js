/* Volume VI shared core: depth-dose models, the Bragg curve, a pencil-beam dose engine with
   a simple fluence optimizer, isodose contouring, and dose color wash. Exposed as window.RT. */
(function () {
  const RT = {};
  const erf = (x) => {
    // Abramowitz & Stegun 7.1.26
    const s = Math.sign(x); x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  };
  RT.erf = erf;
  RT.phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));

  /* ---------- Photon depth dose ----------
     D(d) = [s + (1 - s)(1 - e^{-d/b})] e^{-mu d} ((f + d0) / (f + d))^2
     Build-up (b), effective attenuation (mu), and surface dose (s) are fitted so that each beam
     reproduces typical published values for a 10 x 10 cm field: depth of maximum and the
     percentage depth dose at 10 cm at the standard source-surface distance. */
  RT.PHOTON = {
    co60: { name: 'Cobalt-60', short: 'Co-60', ssd: 80, s: 0.3, b: 0.105, mu: 0.039, dmax: 0.5, pdd10: 55.6 },
    mv6: { name: '6 MV', short: '6 MV', ssd: 100, s: 0.16, b: 0.395, mu: 0.0304, dmax: 1.5, pdd10: 67.0 },
    mv18: { name: '18 MV', short: '18 MV', ssd: 100, s: 0.1, b: 1.035, mu: 0.022, dmax: 3.2, pdd10: 79.0 },
  };
  RT.photonRaw = (k, d, ssd) => {
    const p = RT.PHOTON[k], f = ssd || p.ssd;
    return (p.s + (1 - p.s) * (1 - Math.exp(-d / p.b))) * Math.exp(-p.mu * d) * Math.pow(f / (f + d), 2);
  };
  // Percent depth dose normalized to the curve's own maximum
  RT.photonPDD = (k, ssd) => {
    let mx = 0;
    for (let d = 0; d <= 6; d += 0.01) mx = Math.max(mx, RT.photonRaw(k, d, ssd));
    return (d) => (100 * RT.photonRaw(k, d, ssd)) / mx;
  };
  // In-patient attenuation along a parallel beam (no inverse square), max-normalized: used by the dose engine
  RT.tissue6 = (() => {
    const p = RT.PHOTON.mv6;
    const g = (d) => (p.s + (1 - p.s) * (1 - Math.exp(-d / p.b))) * Math.exp(-p.mu * d);
    let mx = 0; for (let d = 0; d <= 6; d += 0.01) mx = Math.max(mx, g(d));
    return (d) => g(d) / mx;
  })();

  /* ---------- Electron depth dose (rules of thumb) ----------
     R50 = E/2.33 cm, practical range Rp = 1.271 R50 - 0.23 cm, surface dose rising with energy,
     a bremsstrahlung tail of a few percent beyond Rp. */
  RT.electron = (E) => {
    const R50 = E / 2.33, Rp = 1.271 * R50 - 0.23;
    const sig = (2 * (Rp - R50)) / Math.sqrt(2 * Math.PI);
    const ds = Math.min(0.93, 0.7 + 0.012 * E);
    const c = R50 / 4.2;
    const X = 0.0022 * E;
    const raw = (d) => (ds + (1 - ds) * (1 - Math.exp(-d / c))) * (1 - RT.phi((d - R50) / sig) * 1) + X * RT.phi((d - Rp + 0.2) / 0.25) * Math.exp(-0.03 * Math.max(0, d - Rp));
    let mx = 0; for (let d = 0; d <= Rp; d += 0.01) mx = Math.max(mx, raw(d));
    return { R50, Rp, X, f: (d) => (100 * raw(d)) / mx };
  };

  /* ---------- Proton Bragg curve (after Bortfeld 1997) ----------
     Range-energy rule R = alpha E^p (water: alpha = 0.0022 cm MeV^-p, p = 1.77). Without straggling,
     dose ~ (R - z)^(1/p - 1) + (beta + gamma beta p)(R - z)^(1/p), where the second term is the dose
     from protons lost to nuclear interactions (beta = 0.012 per cm, gamma = 0.6 of their energy
     deposited locally). Range straggling sigma ~ 0.012 R^0.935 cm plus a
     1% energy spread, applied by Gaussian convolution. */
  RT.BK = { alpha: 0.0022, p: 1.77, beta: 0.012 };
  RT.range = (E) => RT.BK.alpha * Math.pow(E, RT.BK.p);
  RT.energyFor = (R) => Math.pow(R / RT.BK.alpha, 1 / RT.BK.p);
  RT.bragg = (R, dz, zmax) => {
    const { alpha, p, beta } = RT.BK, q = 1 / p - 1, n = Math.round(zmax / dz) + 1;
    const E0 = RT.energyFor(R);
    const sE = 0.01 * E0 * alpha * p * Math.pow(E0, p - 1);
    const sig = Math.sqrt(Math.pow(0.012 * Math.pow(R, 0.935), 2) + sE * sE);
    const raw = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const a = i * dz, b = a + dz;
      if (a >= R) break;
      const lo = Math.max(0, a), hi = Math.min(R, b);
      // bin average of (R - z)^q, plus the nuclear term at the bin center
      const avg = (Math.pow(R - lo, q + 1) - Math.pow(R - hi, q + 1)) / ((q + 1) * dz);
      const zc = (lo + hi) / 2;
      raw[i] = (avg + (beta + 0.6 * beta * p) * Math.pow(R - zc, q + 1) * ((hi - lo) / dz)) / (1 + beta * R);
    }
    const k = Math.ceil((3 * sig) / dz), ker = [];
    for (let j = -k; j <= k; j++) ker.push(Math.exp(-0.5 * Math.pow((j * dz) / sig, 2)));
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) { let s = 0, ws = 0; for (let j = -k; j <= k; j++) { const m = i + j; if (m >= 0 && m < n) { s += raw[m] * ker[j + k]; ws += ker[j + k]; } } out[i] = s / ws; }
    return { d: out, sigma: sig, E0 };
  };

  /* ---------- Phantoms ----------
     World coordinates in cm, isocenter at the origin, y anterior (up on screen).
     Structures are predicates on (x, y). */
  RT.inEllipse = (cx, cy, a, b) => (x, y) => ((x - cx) / a) ** 2 + ((y - cy) / b) ** 2 <= 1;
  RT.inCircle = (cx, cy, r) => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

  /* ---------- Pencil-beam dose engine ----------
     Parallel beams at gantry angles; each beam is split into beamlets of width w.
     Dose to a voxel from beamlet j: tissue6(depth) x lateral profile (a blurred slab plus a broad
     scatter tail). Depth is measured along the beam from the elliptical body surface. */
  RT.engine = (opt) => {
    const { nx, ny, h, x0, y0, body, bodyA, bodyB, angles, w, half } = opt;
    const nb = Math.round((2 * half) / w);
    const vox = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const x = x0 + (i + 0.5) * h, y = y0 + (j + 0.5) * h;
      if (body(x, y)) vox.push(j * nx + i);
    }
    const NV = vox.length, NB = angles.length * nb;
    const A = new Float32Array(NB * NV);
    const s2 = Math.SQRT2;
    angles.forEach((deg, bi) => {
      const th = (deg * Math.PI) / 180, sx = Math.sin(th), sy = Math.cos(th);
      for (let v = 0; v < NV; v++) {
        const p = vox[v], x = x0 + ((p % nx) + 0.5) * h, y = y0 + (Math.floor(p / nx) + 0.5) * h;
        // distance from (x, y) toward the source to the ellipse surface
        const aa = (sx / bodyA) ** 2 + (sy / bodyB) ** 2, bb = 2 * ((x * sx) / bodyA ** 2 + (y * sy) / bodyB ** 2), cc = (x / bodyA) ** 2 + (y / bodyB) ** 2 - 1;
        const depth = (-bb + Math.sqrt(Math.max(0, bb * bb - 4 * aa * cc))) / (2 * aa);
        const att = RT.tissue6(depth);
        const u = x * sy - y * sx, sig = 0.3 + 0.012 * depth;
        for (let k = 0; k < nb; k++) {
          const uc = -half + (k + 0.5) * w, du = u - uc;
          if (Math.abs(du) > 9) continue;
          const core = 0.5 * (erf((du + w / 2) / (s2 * sig)) - erf((du - w / 2) / (s2 * sig)));
          const tail = (w / (2.2 * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * (du / 2.2) ** 2);
          A[(bi * nb + k) * NV + v] = att * (0.86 * core + 0.14 * tail);
        }
      }
    });
    return { nx, ny, h, x0, y0, vox, NV, NB, nb, A, angles, w, half };
  };
  RT.dose = (E, wts) => {
    const D = new Float32Array(E.NV);
    for (let b = 0; b < E.NB; b++) { const wt = wts[b]; if (!wt) continue; const off = b * E.NV; for (let v = 0; v < E.NV; v++) D[v] += wt * E.A[off + v]; }
    return D;
  };
  // Open fields shaped to the target's projection (3-D conformal), equal beam weights, mean target dose 1
  RT.conformal = (E, target) => {
    const wts = new Float32Array(E.NB);
    E.angles.forEach((deg, bi) => {
      const th = (deg * Math.PI) / 180, sx = Math.sin(th), sy = Math.cos(th);
      for (let k = 0; k < E.nb; k++) {
        const uc = -E.half + (k + 0.5) * E.w;
        for (let v = 0; v < E.NV; v++) {
          if (!target[v]) continue;
          const p = E.vox[v], x = E.x0 + ((p % E.nx) + 0.5) * E.h, y = E.y0 + (Math.floor(p / E.nx) + 0.5) * E.h;
          if (Math.abs(x * sy - y * sx - uc) <= E.w / 2 + 0.25) { wts[bi * E.nb + k] = 1; break; }
        }
      }
    });
    RT.normalize(E, wts, target);
    return wts;
  };
  RT.normalize = (E, wts, target) => {
    const D = RT.dose(E, wts); let s = 0, n = 0;
    for (let v = 0; v < E.NV; v++) if (target[v]) { s += D[v]; n++; }
    const k = n && s ? n / s : 1; for (let b = 0; b < E.NB; b++) wts[b] *= k;
  };
  /* Optimizer: projected, diagonally preconditioned gradient descent with an exact line search
     on a piecewise-quadratic objective. roles[v]: 1 target, 2 organ at risk, 0 other tissue.
     goals: weights wT, wO, wN; organ-at-risk limit `oar`; other-tissue limit `normal`. */
  RT.optimizer = (E, roles, goals) => {
    const wts = new Float32Array(E.NB).fill(0.05);
    const diag = new Float32Array(E.NB);
    for (let b = 0; b < E.NB; b++) { let s = 0; const off = b * E.NV; for (let v = 0; v < E.NV; v++) s += E.A[off + v] * E.A[off + v]; diag[b] = s + 1e-6; }
    let D = RT.dose(E, wts);
    const g = new Float32Array(E.NV), W = new Float32Array(E.NV), gw = new Float32Array(E.NB), p = new Float32Array(E.NB);
    const op = {
      wts,
      get D() { return D; },
      loss: 0,
      step(iters, goalsNow) {
        const G = goalsNow || goals;
        for (let it = 0; it < iters; it++) {
          let L = 0;
          for (let v = 0; v < E.NV; v++) {
            const d = D[v], r = roles[v];
            let wv = 0, dv = 0;
            if (r === 1) { wv = G.wT * (d < 1 ? 1.6 : 1); dv = d - 1; }
            else if (r === 2) { if (d > G.oar) { wv = G.wO; dv = d - G.oar; } }
            else if (d > G.normal) { wv = G.wN; dv = d - G.normal; }
            W[v] = wv; g[v] = wv * dv; L += wv * dv * dv;
          }
          op.loss = L;
          let num = 0;
          for (let b = 0; b < E.NB; b++) {
            let s = 0; const off = b * E.NV;
            for (let v = 0; v < E.NV; v++) s += E.A[off + v] * g[v];
            gw[b] = s;
            let pb = -s / diag[b];
            if (wts[b] <= 0 && pb < 0) pb = 0;
            p[b] = pb; num -= s * pb;
          }
          const q = RT.dose(E, p);
          let c = 0; for (let v = 0; v < E.NV; v++) c += W[v] * q[v] * q[v];
          if (!(num > 0) || !(c > 0)) break;
          const alpha = num / c;
          for (let b = 0; b < E.NB; b++) wts[b] = Math.max(0, wts[b] + alpha * p[b]);
          D = RT.dose(E, wts);
        }
        return D;
      },
    };
    return op;
  };
  // Cumulative dose-volume histogram: fraction of the structure receiving at least each dose level
  RT.dvh = (D, mask, dmax = 1.3, bins = 130) => {
    const h = new Float64Array(bins + 1); let n = 0;
    for (let v = 0; v < D.length; v++) if (mask[v]) { n++; const k = Math.min(bins, Math.floor((D[v] / dmax) * bins)); h[k]++; }
    const out = []; let acc = n;
    for (let k = 0; k <= bins; k++) { out.push([(k / bins) * dmax, n ? acc / n : 0]); acc -= h[k]; }
    return out;
  };
  // Dose received by at least fraction q of a structure (for example D95)
  RT.dq = (D, mask, q) => {
    const a = []; for (let v = 0; v < D.length; v++) if (mask[v]) a.push(D[v]);
    a.sort((x, y) => y - x); return a.length ? a[Math.min(a.length - 1, Math.floor(q * a.length))] : 0;
  };

  /* ---------- Isodose contours (marching squares) ---------- */
  RT.contour = (F, nx, ny, level) => {
    const segs = [];
    const at = (i, j) => F[j * nx + i];
    const lerp = (a, b) => (level - a) / (b - a);
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
      const idx = (a >= level ? 1 : 0) | (b >= level ? 2 : 0) | (c >= level ? 4 : 0) | (d >= level ? 8 : 0);
      if (idx === 0 || idx === 15) continue;
      const e = [
        [i + lerp(a, b), j], [i + 1, j + lerp(b, c)], [i + lerp(d, c), j + 1], [i, j + lerp(a, d)],
      ];
      const T = { 1: [[0, 3]], 2: [[0, 1]], 3: [[1, 3]], 4: [[1, 2]], 5: [[0, 1], [2, 3]], 6: [[0, 2]], 7: [[2, 3]], 8: [[2, 3]], 9: [[0, 2]], 10: [[0, 3], [1, 2]], 11: [[1, 2]], 12: [[1, 3]], 13: [[0, 1]], 14: [[0, 3]] }[idx];
      T.forEach(([p, q]) => segs.push([e[p], e[q]]));
    }
    return segs;
  };

  /* ---------- Color wash for dose on dark film ---------- */
  RT.wash = () => [1, 2, 3, 4, 5].map((k) => (typeof Lab !== 'undefined' ? Lab.rgb('--wash-' + k) : [0, 0, 0]));
  RT.washAt = (stops, t) => {
    const x = Math.max(0, Math.min(1, t)) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x));
    const f = x - i, a = stops[i], b = stops[i + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  };
  // Paint a dose grid (full nx*ny array, NaN outside the body) over the current canvas region.
  RT.paintDose = (ctx, F, nx, ny, X, Y, W, H, opts = {}) => {
    const lo = opts.lo ?? 0.1, hi = opts.hi ?? 1.05, alpha = opts.alpha ?? 0.72, stops = RT.wash();
    const c = document.createElement('canvas'); c.width = nx; c.height = ny;
    const g = c.getContext('2d'), img = g.createImageData(nx, ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const v = F[j * nx + i], o = ((ny - 1 - j) * nx + i) * 4;
      if (!(v >= lo)) continue;
      const t = (v - lo) / (hi - lo), col = RT.washAt(stops, t);
      img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255 * alpha * Math.min(1, 0.45 + t);
    }
    g.putImageData(img, 0, 0);
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(c, X, Y, W, H); ctx.restore();
  };
  // Stroke an isodose line; grid (i, j) maps to canvas via the same box used by paintDose
  RT.strokeContour = (ctx, F, nx, ny, level, X, Y, W, H) => {
    const segs = RT.contour(F, nx, ny, level), sx = W / nx, sy = H / ny;
    ctx.beginPath();
    segs.forEach(([p, q]) => { ctx.moveTo(X + (p[0] + 0.5) * sx, Y + H - (p[1] + 0.5) * sy); ctx.lineTo(X + (q[0] + 0.5) * sx, Y + H - (q[1] + 0.5) * sy); });
    ctx.stroke();
  };

  /* ---------- SVG chart frame ----------
     Clears the svg, sizes its viewBox to the rendered width, draws gridlines and tick labels.
     o: { h, m: {l, r, t, b}, x: [d0, d1], y: [d0, d1], xlog, ylog, xt: [...], yt: [...], xf, yf, xl, yl } */
  RT.frame = (svg, o) => {
    const W = Math.max(280, svg.clientWidth || svg.parentElement.clientWidth || 600), H = o.h;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H);
    svg.innerHTML = '';
    const m = o.m, pal = Lab.palette();
    const X = (o.xlog ? Lab.logScale : Lab.scale)(o.x[0], o.x[1], m.l, W - m.r);
    const Y = (o.ylog ? Lab.logScale : Lab.scale)(o.y[0], o.y[1], H - m.b, m.t);
    const g = Lab.svg('g', {}, svg);
    (o.yt || []).forEach((v) => {
      Lab.svg('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), stroke: pal.grid }, g);
      const t = Lab.svg('text', { x: m.l - 6, y: Y(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: pal.ink3 }, g); t.textContent = o.yf ? o.yf(v) : v;
    });
    (o.xt || []).forEach((v) => {
      Lab.svg('line', { x1: X(v), x2: X(v), y1: m.t, y2: H - m.b, stroke: pal.grid }, g);
      const t = Lab.svg('text', { x: X(v), y: H - m.b + 16, 'text-anchor': 'middle', 'font-size': 11, fill: pal.ink3 }, g); t.textContent = o.xf ? o.xf(v) : v;
    });
    Lab.svg('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, stroke: pal.ink3 }, g);
    if (o.xl) { const t = Lab.svg('text', { x: W - m.r, y: H - m.b + 32, 'text-anchor': 'end', 'font-size': 11, fill: pal.ink2 }, g); t.textContent = o.xl; }
    if (o.yl) { const t = Lab.svg('text', { x: m.l, y: m.t - 10, 'font-size': 11, fill: pal.ink2 }, g); t.textContent = o.yl; }
    return { W, H, X, Y, g, pal, m };
  };
  RT.path = (pts, X, Y) => pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join('');

  if (typeof window !== 'undefined') window.RT = RT;
  if (typeof module !== 'undefined') module.exports = RT;
})();
