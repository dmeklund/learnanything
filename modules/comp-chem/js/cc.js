/* Volume VII shared core: small numerical methods for quantum chemistry and simulation.
   Symmetric eigensolvers, a 1-D Schrödinger solver, s-type Gaussian integrals, restricted
   Hartree–Fock for H2, a Kohn–Sham LDA atom, the LEPS surface, Hückel theory, chart frame.
   Atomic units (hartree, bohr) unless noted. Exposed as window.CC. */
(function () {
  const CC = {};

  /* ---------- Linear algebra ---------- */
  // Jacobi eigen-decomposition of a small symmetric matrix (array of rows). Returns ascending values and column vectors.
  CC.eigh = (M) => {
    const n = M.length, a = M.map((r) => r.slice()), v = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
    for (let sweep = 0; sweep < 100; sweep++) {
      let off = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += a[i][j] * a[i][j];
      if (off < 1e-22) break;
      for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-300) continue;
        const th = (a[q][q] - a[p][p]) / (2 * a[p][q]), t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1));
        const c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let k = 0; k < n; k++) { const akp = a[k][p], akq = a[k][q]; a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq; }
        for (let k = 0; k < n; k++) { const apk = a[p][k], aqk = a[q][k]; a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk; }
        for (let k = 0; k < n; k++) { const vkp = v[k][p], vkq = v[k][q]; v[k][p] = c * vkp - s * vkq; v[k][q] = s * vkp + c * vkq; }
      }
    }
    const idx = [...Array(n).keys()].sort((i, j) => a[i][i] - a[j][j]);
    return { values: idx.map((i) => a[i][i]), vectors: idx.map((i) => v.map((r) => r[i])) };
  };
  // Generalized symmetric problem H c = E S c by symmetric orthogonalization
  CC.geigh = (H, S) => {
    const n = H.length, s = CC.eigh(S);
    const X = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => s.vectors[j][i] / Math.sqrt(s.values[j])));
    const mul = (A, B) => A.map((r) => B[0].map((_, j) => r.reduce((t, x, k) => t + x * B[k][j], 0)));
    const T = (A) => A[0].map((_, j) => A.map((r) => r[j]));
    const Hp = mul(mul(T(X), H), X), e = CC.eigh(Hp);
    return { values: e.values, vectors: e.vectors.map((c) => X.map((r) => r.reduce((t, x, k) => t + x * c[k], 0))) };
  };

  /* ---------- 1-D Schrödinger equation by finite differences ----------
     -1/2 psi'' + V psi = E psi on a uniform grid with psi = 0 at the ends.
     Tridiagonal: eigenvalues by Sturm-sequence bisection, eigenvectors by inverse iteration. */
  CC.schrod1d = (V, x0, x1, n, k) => {
    const h = (x1 - x0) / (n + 1), d = new Float64Array(n), e = -0.5 / (h * h);
    const xs = new Float64Array(n);
    for (let i = 0; i < n; i++) { xs[i] = x0 + (i + 1) * h; d[i] = 1 / (h * h) + V(xs[i]); }
    const count = (lam) => { let c = 0, q = 1; for (let i = 0; i < n; i++) { q = d[i] - lam - (i ? (e * e) / q : 0); if (q === 0) q = 1e-300; if (q < 0) c++; } return c; };
    let lo = Infinity, hi = -Infinity; for (let i = 0; i < n; i++) { lo = Math.min(lo, d[i] - 2 * Math.abs(e)); hi = Math.max(hi, d[i] + 2 * Math.abs(e)); }
    const out = [];
    for (let j = 0; j < k; j++) {
      let a = lo, b = hi;
      for (let it = 0; it < 80; it++) { const m = (a + b) / 2; if (count(m) > j) b = m; else a = m; }
      const E = (a + b) / 2;
      // inverse iteration with a slightly shifted eigenvalue (Thomas algorithm)
      let y = new Float64Array(n).fill(1);
      for (let it = 0; it < 3; it++) {
        const c = new Float64Array(n), z = new Float64Array(n), sh = E - 1e-10;
        let den = d[0] - sh; c[0] = e / den; z[0] = y[0] / den;
        for (let i = 1; i < n; i++) { den = d[i] - sh - e * c[i - 1]; c[i] = e / den; z[i] = (y[i] - e * z[i - 1]) / den; }
        for (let i = n - 2; i >= 0; i--) z[i] -= c[i] * z[i + 1];
        let s = 0; for (let i = 0; i < n; i++) s += z[i] * z[i]; s = Math.sqrt(s * h);
        for (let i = 0; i < n; i++) z[i] /= s; y = z;
      }
      // sign convention: positive near the left
      let first = 0; for (let i = 0; i < n; i++) if (Math.abs(y[i]) > 1e-3) { first = y[i]; break; }
      if (first < 0) for (let i = 0; i < n; i++) y[i] = -y[i];
      out.push({ E, psi: y });
    }
    return { xs, h, states: out };
  };

  /* ---------- s-type Gaussian integrals (Szabo & Ostlund, Appendix A) ---------- */
  const boysF0 = (t) => (t < 1e-8 ? 1 - t / 3 : 0.5 * Math.sqrt(Math.PI / t) * CC.erf(Math.sqrt(t)));
  CC.erf = (x) => {
    // series for small x, continued fraction complement for large x (double precision)
    if (Math.abs(x) < 2.5) { let s = x, t = x, n = 0; const x2 = x * x; while (Math.abs(t) > 1e-17 * Math.abs(s)) { n++; t *= -x2 / n; s += t / (2 * n + 1); } return (2 / Math.sqrt(Math.PI)) * s; }
    const ax = Math.abs(x); let f = 0; for (let k = 60; k >= 1; k--) f = (k / 2) / (ax + f);
    const c = Math.exp(-ax * ax) / Math.sqrt(Math.PI) / (ax + f);
    return Math.sign(x) * (1 - c);
  };
  // primitive unnormalized Gaussians exp(-a|r-A|^2); A, B are [x, y, z]
  const d2 = (A, B) => (A[0] - B[0]) ** 2 + (A[1] - B[1]) ** 2 + (A[2] - B[2]) ** 2;
  const prim = {
    S: (a, A, b, B) => Math.pow(Math.PI / (a + b), 1.5) * Math.exp((-a * b / (a + b)) * d2(A, B)),
    T: (a, A, b, B) => { const p = a + b, mu = (a * b) / p, r2 = d2(A, B); return mu * (3 - 2 * mu * r2) * Math.pow(Math.PI / p, 1.5) * Math.exp(-mu * r2); },
    V: (a, A, b, B, C, Z) => {
      const p = a + b, P = [0, 1, 2].map((i) => (a * A[i] + b * B[i]) / p);
      return (-2 * Math.PI * Z / p) * Math.exp((-a * b / p) * d2(A, B)) * boysF0(p * d2(P, C));
    },
    ERI: (a, A, b, B, c, C, d, D) => {
      const p = a + b, q = c + d, P = [0, 1, 2].map((i) => (a * A[i] + b * B[i]) / p), Q = [0, 1, 2].map((i) => (c * C[i] + d * D[i]) / q);
      return (2 * Math.pow(Math.PI, 2.5) / (p * q * Math.sqrt(p + q))) * Math.exp((-a * b / p) * d2(A, B) - (c * d / q) * d2(C, D)) * boysF0((p * q / (p + q)) * d2(P, Q));
    },
  };
  CC.prim = prim;
  const norm = (a) => Math.pow((2 * a) / Math.PI, 0.75);
  // contracted basis function: { c: [...], a: [...], R: [x,y,z] } with normalized primitives
  CC.STO3G = { a: [2.227660, 0.405771, 0.109818], c: [0.154329, 0.535328, 0.444635] };
  CC.sto3g = (zeta, R) => ({ a: CC.STO3G.a.map((x) => x * zeta * zeta), c: CC.STO3G.c.slice(), R });
  const contract = (f, g, fn) => { let s = 0; for (let i = 0; i < f.a.length; i++) for (let j = 0; j < g.a.length; j++) s += f.c[i] * g.c[j] * norm(f.a[i]) * norm(g.a[j]) * fn(f.a[i], f.R, g.a[j], g.R); return s; };
  CC.overlap = (f, g) => contract(f, g, prim.S);
  CC.kinetic = (f, g) => contract(f, g, prim.T);
  CC.nuclear = (f, g, C, Z) => contract(f, g, (a, A, b, B) => prim.V(a, A, b, B, C, Z));
  CC.eri = (f, g, h, k) => {
    let s = 0;
    for (let i = 0; i < f.a.length; i++) for (let j = 0; j < g.a.length; j++) for (let l = 0; l < h.a.length; l++) for (let m = 0; m < k.a.length; m++)
      s += f.c[i] * g.c[j] * h.c[l] * k.c[m] * norm(f.a[i]) * norm(g.a[j]) * norm(h.a[l]) * norm(k.a[m]) * prim.ERI(f.a[i], f.R, g.a[j], g.R, h.a[l], h.R, k.a[m], k.R);
    return s;
  };

  /* ---------- Hydrogen atom in a basis of n s-Gaussians ---------- */
  CC.hAtom = (alphas) => {
    const O = [0, 0, 0], fs = alphas.map((a) => ({ a: [a], c: [1], R: O }));
    const S = fs.map((f) => fs.map((g) => CC.overlap(f, g)));
    const H = fs.map((f) => fs.map((g) => CC.kinetic(f, g) + CC.nuclear(f, g, O, 1)));
    const r = CC.geigh(H, S);
    return { E: r.values[0], c: r.vectors[0] };
  };

  /* ---------- Restricted Hartree–Fock for H2 (two basis functions) and minimal-basis full CI ---------- */
  CC.h2 = (R, zeta = 1.24) => {
    const A = [0, 0, 0], B = [0, 0, R], fs = [CC.sto3g(zeta, A), CC.sto3g(zeta, B)];
    const n = 2, S = [], Hc = [];
    for (let i = 0; i < n; i++) { S.push([]); Hc.push([]); for (let j = 0; j < n; j++) { S[i].push(CC.overlap(fs[i], fs[j])); Hc[i].push(CC.kinetic(fs[i], fs[j]) + CC.nuclear(fs[i], fs[j], A, 1) + CC.nuclear(fs[i], fs[j], B, 1)); } }
    const G = {}; const key = (i, j, k, l) => [i, j, k, l].join('');
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) for (let l = 0; l < n; l++) G[key(i, j, k, l)] = CC.eri(fs[i], fs[j], fs[k], fs[l]);
    const Vnn = 1 / R;
    // SCF from the core-Hamiltonian guess
    let P = [[0, 0], [0, 0]], E = 0, C, eps, iters = [];
    for (let it = 0; it < 60; it++) {
      const F = Hc.map((r, i) => r.map((h, j) => { let s = h; for (let k = 0; k < n; k++) for (let l = 0; l < n; l++) s += P[k][l] * (G[key(i, j, l, k)] - 0.5 * G[key(i, k, l, j)]); return s; }));
      const r = CC.geigh(F, S); C = r.vectors; eps = r.values;
      const Pn = [0, 1].map((i) => [0, 1].map((j) => 2 * C[0][i] * C[0][j]));
      let En = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) En += 0.5 * Pn[j][i] * (Hc[i][j] + F[i][j]);
      // energy with the new density uses the Fock built from it; recompute once for consistency below
      iters.push(En + Vnn);
      const dP = Math.max(...Pn.flat().map((x, k) => Math.abs(x - P.flat()[k])));
      P = Pn; E = En;
      if (dP < 1e-10 && it > 1) break;
    }
    const F = Hc.map((r, i) => r.map((h, j) => { let s = h; for (let k = 0; k < n; k++) for (let l = 0; l < n; l++) s += P[k][l] * (G[key(i, j, l, k)] - 0.5 * G[key(i, k, l, j)]); return s; }));
    let Ehf = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) Ehf += 0.5 * P[j][i] * (Hc[i][j] + F[i][j]);
    Ehf += Vnn;
    // MO integrals for the 2x2 CI between |g g| and |u u|
    const mo = (p, q, r2, s) => { let t = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) for (let l = 0; l < n; l++) t += C[p][i] * C[q][j] * C[r2][k] * C[s][l] * G[key(i, j, k, l)]; return t; };
    const h1 = (p) => { let t = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) t += C[p][i] * C[p][j] * Hc[i][j]; return t; };
    const Egg = 2 * h1(0) + mo(0, 0, 0, 0), Euu = 2 * h1(1) + mo(1, 1, 1, 1), K = mo(0, 1, 0, 1);
    const ci = CC.eigh([[Egg, K], [K, Euu]]);
    return { Ehf, Efci: ci.values[0] + Vnn, eps, iters, cci: ci.vectors[0] };
  };

  /* ---------- Kohn–Sham LDA atom (spherical, spin-unpolarized) ----------
     Logarithmic radial grid, Numerov shooting for each l, Hartree by radial Poisson integrals,
     Slater exchange and VWN (form V) correlation. */
  const VWN = { A: 0.0310907, x0: -0.10498, b: 3.72744, c: 12.9352 };
  const ecVWN = (rs) => {
    const { A, x0, b, c } = VWN, x = Math.sqrt(rs), X = (y) => y * y + b * y + c, Q = Math.sqrt(4 * c - b * b);
    const at = Math.atan(Q / (2 * x + b));
    return A * (Math.log((x * x) / X(x)) + (2 * b / Q) * at - (b * x0 / X(x0)) * (Math.log(((x - x0) ** 2) / X(x)) + (2 * (b + 2 * x0) / Q) * at));
  };
  const xcLDA = (n) => {
    if (n < 1e-30) return { e: 0, v: 0 };
    const rs = Math.cbrt(3 / (4 * Math.PI * n)), ex = -0.75 * Math.cbrt(3 * n / Math.PI), vx = -Math.cbrt(3 * n / Math.PI);
    const ec = ecVWN(rs), dr = rs * 1e-5, dec = (ecVWN(rs + dr) - ecVWN(rs - dr)) / (2 * dr);
    return { e: ex + ec, v: vx + ec - (rs / 3) * dec, ex, ec };
  };
  CC.xcLDA = xcLDA;
  CC.ELEMENTS = ['H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar'];
  CC.config = (Z) => {
    const shells = [[1, 0, 2], [2, 0, 2], [2, 1, 6], [3, 0, 2], [3, 1, 6]], out = []; let left = Z;
    for (const [n, l, cap] of shells) { if (left <= 0) break; const f = Math.min(cap, left); out.push({ n, l, f }); left -= f; }
    return out;
  };
  CC.ksAtom = (Z, opts = {}) => {
    const N = opts.N || 1400, rmin = 1e-6 / Z, rmax = opts.rmax || 40, h = Math.log(rmax / rmin) / (N - 1);
    const r = new Float64Array(N); for (let i = 0; i < N; i++) r[i] = rmin * Math.exp(i * h);
    const occ = CC.config(Z);
    let V = Float64Array.from(r, (x) => -Z / x); // start from the bare nucleus
    let rho = new Float64Array(N), hist = [], orbs = [];
    // Numerov on w = u / sqrt(r) with x = ln r: w'' = f w, f = 2 r^2 (V - E) + (l + 1/2)^2
    const shoot = (E, l, store) => {
      const f = new Float64Array(N); for (let i = 0; i < N; i++) f[i] = 2 * r[i] * r[i] * (V[i] - E) + (l + 0.5) ** 2;
      const g = (i) => 1 - (h * h / 12) * f[i];
      const w = store || new Float64Array(N);
      w[0] = Math.pow(r[0], l + 0.5); w[1] = Math.pow(r[1], l + 0.5);
      let nodes = 0;
      // stop where Numerov becomes unstable, deep in the classically forbidden region
      let iend = N - 1; for (let i = N - 1; i > 2; i--) if ((h * h / 12) * f[i] < 0.8) { iend = Math.min(N - 1, i + 1); break; }
      for (let i = 1; i < iend; i++) {
        w[i + 1] = ((12 - 10 * g(i)) * w[i] - g(i - 1) * w[i - 1]) / g(i + 1);
        if (w[i + 1] * w[i] < 0) nodes++;
        if (Math.abs(w[i + 1]) > 1e150) { for (let j = 0; j <= i + 1; j++) w[j] *= 1e-150; }
      }
      return { nodes, tail: w[iend] };
    };
    const solve = (n, l) => {
      const want = n - l - 1; let lo = -Z * Z / (2 * n * n) * 1.5 - 5, hi = 0;
      for (let it = 0; it < 80; it++) { const m = (lo + hi) / 2; const s = shoot(m, l); if (s.nodes > want) hi = m; else lo = m; }
      const E = (lo + hi) / 2;
      // wavefunction: integrate outward to the outermost turning point, inward from rmax, join
      const f = new Float64Array(N); for (let i = 0; i < N; i++) f[i] = 2 * r[i] * r[i] * (V[i] - E) + (l + 0.5) ** 2;
      const g = (i) => 1 - (h * h / 12) * f[i];
      let tp = N - 2; while (tp > 10 && f[tp] > 0) tp--; tp = Math.min(N - 20, Math.max(20, tp));
      const wo = new Float64Array(N); wo[0] = Math.pow(r[0], l + 0.5); wo[1] = Math.pow(r[1], l + 0.5);
      for (let i = 1; i < tp + 1; i++) wo[i + 1] = ((12 - 10 * g(i)) * wo[i] - g(i - 1) * wo[i - 1]) / g(i + 1);
      let iend = N - 1; for (let i = N - 1; i > tp + 2; i--) if ((h * h / 12) * f[i] < 0.8) { iend = Math.min(N - 1, i + 1); break; }
      const wi = new Float64Array(N); wi[iend] = 1e-30; wi[iend - 1] = 1e-30 * Math.exp(Math.sqrt(Math.max(1e-6, -2 * E)) * (r[iend] - r[iend - 1]));
      for (let i = iend - 1; i > tp - 1; i--) { wi[i - 1] = ((12 - 10 * g(i)) * wi[i] - g(i + 1) * wi[i + 1]) / g(i - 1); }
      const sc = wo[tp] / wi[tp], w = new Float64Array(N);
      for (let i = 0; i < N; i++) w[i] = i <= tp ? wo[i] : wi[i] * sc;
      // u = sqrt(r) w ; normalize ∫ u^2 dr = ∫ r^2 w^2 dx
      let s = 0; for (let i = 0; i < N; i++) s += w[i] * w[i] * r[i] * r[i] * h; s = Math.sqrt(s);
      const u = Float64Array.from(w, (x, i) => (x * Math.sqrt(r[i])) / s);
      return { E, u };
    };
    const integ = (fn) => { let s = 0; for (let i = 0; i < N; i++) s += fn(i) * r[i] * h; return s; }; // ∫ fn dr
    let Etot = 0, alpha = opts.mix || 0.35;
    for (let it = 0; it < (opts.maxit || 120); it++) {
      orbs = occ.map((o) => ({ ...o, ...solve(o.n, o.l) }));
      const rn = new Float64Array(N);
      orbs.forEach((o) => { for (let i = 0; i < N; i++) rn[i] += (o.f * o.u[i] * o.u[i]) / (4 * Math.PI * r[i] * r[i]); });
      const mixed = it === 0 ? rn : Float64Array.from(rho, (x, i) => (1 - alpha) * x + alpha * rn[i]);
      const drho = integ((i) => 4 * Math.PI * r[i] * r[i] * Math.abs(mixed[i] - rho[i]));
      rho = mixed;
      // Hartree potential
      const q = new Float64Array(N), out = new Float64Array(N);
      let acc = 0; for (let i = 0; i < N; i++) { acc += 4 * Math.PI * r[i] * r[i] * rho[i] * r[i] * h; q[i] = acc; }
      acc = 0; for (let i = N - 1; i >= 0; i--) { out[i] = acc; acc += 4 * Math.PI * r[i] * rho[i] * r[i] * h; }
      const VH = Float64Array.from(r, (x, i) => q[i] / x + out[i]);
      const xc = Array.from(rho, (n) => xcLDA(n));
      // total energy with this density
      const eig = orbs.reduce((s, o) => s + o.f * o.E, 0);
      const Vin = V, rhoOut = rn;
      // total energy of the output density: kinetic from the eigenvalues, then nuclear, Hartree, and xc terms
      const qo = new Float64Array(N), oo = new Float64Array(N);
      acc = 0; for (let i = 0; i < N; i++) { acc += 4 * Math.PI * r[i] * r[i] * rhoOut[i] * r[i] * h; qo[i] = acc; }
      acc = 0; for (let i = N - 1; i >= 0; i--) { oo[i] = acc; acc += 4 * Math.PI * r[i] * rhoOut[i] * r[i] * h; }
      const EHo = 0.5 * integ((i) => 4 * Math.PI * r[i] * r[i] * rhoOut[i] * (qo[i] / r[i] + oo[i]));
      const Exco = integ((i) => 4 * Math.PI * r[i] * r[i] * rhoOut[i] * xcLDA(rhoOut[i]).e);
      const Ekin = eig - integ((i) => 4 * Math.PI * r[i] * r[i] * rhoOut[i] * Vin[i]);
      const Ene = -Z * integ((i) => 4 * Math.PI * r[i] * rhoOut[i]);
      Etot = Ekin + Ene + EHo + Exco;
      hist.push({ E: Etot, drho });
      V = Float64Array.from(r, (x, i) => -Z / x + VH[i] + xc[i].v);
      if (drho < (opts.tol || 1e-9) && it > 3) break;
    }
    return { r, rho, orbs, E: Etot, hist, h, occ };
  };

  /* ---------- LEPS potential for collinear H + H2 (eV, Å) ---------- */
  CC.LEPS = { D: 4.746, beta: 1.942, re: 0.742, k: 0.135 };
  CC.leps = (r1, r2, P = CC.LEPS) => {
    const r3 = r1 + r2;
    const QJ = (r) => {
      const ex = Math.exp(-P.beta * (r - P.re));
      const E1 = P.D * (ex * ex - 2 * ex), E3 = (P.D / 2) * (ex * ex + 2 * ex);
      return [0.5 * (E1 * (1 + P.k) + E3 * (1 - P.k)), 0.5 * (E1 * (1 + P.k) - E3 * (1 - P.k))];
    };
    const [Q1, J1] = QJ(r1), [Q2, J2] = QJ(r2), [Q3, J3] = QJ(r3);
    return (Q1 + Q2 + Q3 - Math.sqrt(0.5 * ((J1 - J2) ** 2 + (J2 - J3) ** 2 + (J3 - J1) ** 2))) / (1 + P.k);
  };

  /* ---------- Hückel theory ---------- */
  CC.huckel = (nAtoms, bonds) => {
    const M = Array.from({ length: nAtoms }, () => new Array(nAtoms).fill(0));
    bonds.forEach(([i, j]) => { M[i][j] = -1; M[j][i] = -1; }); // energies in units of |beta| relative to alpha (beta < 0)
    return CC.eigh(M);
  };

  /* ---------- SVG chart frame (same contract as Volume VI) ---------- */
  CC.frame = (svg, o) => {
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
  CC.path = (pts, X, Y) => pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join('');
  // invisible hit rectangle over the plot area that reports the data-x under the pointer
  CC.hover = (svg, f, x0, x1, onMove, onLeave, log) => {
    const hit = Lab.svg('rect', { x: f.m.l, y: f.m.t, width: f.W - f.m.l - f.m.r, height: f.H - f.m.t - f.m.b, fill: 'transparent' }, svg);
    hit.addEventListener('mousemove', (e) => {
      const r = svg.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * f.W, t = (px - f.m.l) / (f.W - f.m.l - f.m.r);
      const x = log ? Math.pow(10, Math.log10(x0) + t * (Math.log10(x1) - Math.log10(x0))) : x0 + t * (x1 - x0);
      onMove(x, r.width / f.W, r.height / f.H, e.clientX - r.left, e.clientY - r.top);
    });
    hit.addEventListener('mouseleave', onLeave);
  };

  if (typeof window !== 'undefined') window.CC = CC;
  if (typeof module !== 'undefined') module.exports = CC;
})();
