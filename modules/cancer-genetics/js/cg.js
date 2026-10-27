/* Volume XV shared core: random variates and chart helpers. Exposed as window.CG. */
(function () {
  const CG = {};
  // Poisson variate: Knuth's method for small means, a normal approximation for large ones
  CG.poisson = (r, mu) => {
    if (mu <= 0) return 0;
    if (mu > 40) return Math.max(0, Math.round(mu + Math.sqrt(mu) * Lab.gauss(r)));
    const L = Math.exp(-mu); let k = 0, p = 1;
    do { k++; p *= r(); } while (p > L);
    return k - 1;
  };
  // Log-normal variate with median m and coefficient of variation cv (approximately, for small cv)
  CG.lognorm = (r, m, cv) => m * Math.exp(Math.sqrt(Math.log(1 + cv * cv)) * Lab.gauss(r));
  // arcsinh scale: linear near zero, logarithmic far from it, so negative compensated values can be shown
  CG.asinhScale = (d0, d1, r0, r1, c) => { const f = (v) => Math.asinh(v / c), a = f(d0), b = f(d1); const s = (v) => r0 + ((f(v) - a) / (b - a)) * (r1 - r0); s.inv = (p) => c * Math.sinh(a + ((p - r0) / (r1 - r0)) * (b - a)); return s; };
  CG.sup = (n) => String(n).replace(/[0-9-]/g, (c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'['0123456789'.indexOf(c)] || '⁻');
  CG.sci = (v) => { if (v === 0) return '0'; const e = Math.floor(Math.log10(Math.abs(v))), m = v / 10 ** e; return (m.toFixed(1) === '1.0' ? '' : m.toFixed(1) + '×') + '10' + CG.sup(e); };
  CG.num = (v) => (Math.abs(v) >= 1e6 ? CG.sci(v) : Math.round(v).toLocaleString('en-US'));
  /* ---------- Chart helpers (same contract as earlier volumes) ---------- */
  CG.frame = (svg, o) => {
    const W = Math.max(280, svg.clientWidth || svg.parentElement.clientWidth || 600), H = o.h;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H); svg.innerHTML = '';
    const m = o.m, pal = Lab.palette();
    const mk = (kind, d0, d1, r0, r1) => (kind === 'log' ? Lab.logScale(d0, d1, r0, r1) : kind === 'asinh' ? CG.asinhScale(d0, d1, r0, r1, o.c || 100) : Lab.scale(d0, d1, r0, r1));
    const X = mk(o.xlog ? 'log' : o.xasinh ? 'asinh' : 'lin', o.x[0], o.x[1], m.l, W - m.r), Y = mk(o.ylog ? 'log' : o.yasinh ? 'asinh' : 'lin', o.y[0], o.y[1], H - m.b, m.t);
    const g = Lab.svg('g', {}, svg);
    (o.yt || []).forEach((v) => { Lab.svg('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), stroke: pal.grid }, g); const t = Lab.svg('text', { x: m.l - 6, y: Y(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: pal.ink3 }, g); t.textContent = o.yf ? o.yf(v) : v; });
    (o.xt || []).forEach((v) => { Lab.svg('line', { x1: X(v), x2: X(v), y1: m.t, y2: H - m.b, stroke: pal.grid }, g); const t = Lab.svg('text', { x: X(v), y: H - m.b + 16, 'text-anchor': 'middle', 'font-size': 11, fill: pal.ink3 }, g); t.textContent = o.xf ? o.xf(v) : v; });
    Lab.svg('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, stroke: pal.ink3 }, g);
    if (o.xl) { const t = Lab.svg('text', { x: W - m.r, y: H - m.b + 32, 'text-anchor': 'end', 'font-size': 11, fill: pal.ink2 }, g); t.textContent = o.xl; }
    if (o.yl) { const t = Lab.svg('text', { x: m.l, y: m.t - 10, 'font-size': 11, fill: pal.ink2 }, g); t.textContent = o.yl; }
    return { W, H, X, Y, g, pal, m };
  };
  CG.path = (pts, X, Y) => pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join('');
  CG.text = (g, x, y, s, fill, anchor = 'start', size = 11) => { const t = Lab.svg('text', { x, y, 'font-size': size, fill, 'text-anchor': anchor }, g); t.textContent = s; return t; };
  // transparent hit area over the plot; onMove gets the data x, the svg-to-pixel scale factors, and the pointer position in pixels
  CG.hover = (svg, f, x0, x1, onMove, onLeave, xlog) => {
    const hit = Lab.svg('rect', { x: f.m.l, y: f.m.t, width: f.W - f.m.l - f.m.r, height: f.H - f.m.t - f.m.b, fill: 'transparent' }, svg);
    hit.addEventListener('mousemove', (e) => { const r = svg.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * f.W, t = (px - f.m.l) / (f.W - f.m.l - f.m.r); const x = xlog ? Math.pow(10, Math.log10(x0) + t * (Math.log10(x1) - Math.log10(x0))) : x0 + t * (x1 - x0); onMove(x, r.width / f.W, r.height / f.H, e.clientX - r.left, e.clientY - r.top); });
    hit.addEventListener('mouseleave', onLeave);
  };
  // a dense dot plot drawn into a canvas laid over an SVG frame of the same size (the canvas ignores the pointer)
  CG.dots = (cv, W, H) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    return { ctx, plot: (list, X, Y, col, a, r) => { ctx.fillStyle = Lab.rgbStr(col, a); list.forEach((p) => ctx.fillRect(X(p[0]) - r / 2, Y(p[1]) - r / 2, r, r)); } };
  };

  /* ---------- Statistics ---------- */
  // log Gamma, Lanczos
  CG.lgamma = (x) => {
    const g = [676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
      12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - CG.lgamma(1 - x);
    x -= 1; let a = 0.99999999999980993; const t = x + 7.5;
    for (let i = 0; i < 8; i++) a += g[i] / (x + i + 1);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  };
  CG.lchoose = (n, k) => CG.lgamma(n + 1) - CG.lgamma(k + 1) - CG.lgamma(n - k + 1);
  /* Regularized incomplete beta I_x(a,b), by the modified Lentz continued fraction
     of Numerical Recipes section 6.4. Used for exact binomial tail probabilities. */
  CG.betacf = (a, b, x) => {
    const TINY = 1e-300, EPS = 3e-16, qab = a + b, qap = a + 1, qam = a - 1;
    let c = 1, d = 1 - (qab * x) / qap;
    if (Math.abs(d) < TINY) d = TINY;
    d = 1 / d; let h = d;
    for (let m = 1; m <= 300; m++) {
      const m2 = 2 * m;
      let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY;
      c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY;
      d = 1 / d; h *= d * c;
      aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY;
      c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY;
      d = 1 / d; const del = d * c; h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  };
  CG.betai = (a, b, x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const bt = Math.exp(CG.lgamma(a + b) - CG.lgamma(a) - CG.lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? (bt * CG.betacf(a, b, x)) / a : 1 - (bt * CG.betacf(b, a, 1 - x)) / b;
  };
  // P(X >= k) for X ~ Binomial(n, p)
  CG.binomUpper = (k, n, p) => (k <= 0 ? 1 : k > n ? 0 : CG.betai(k, n - k + 1, p));
  CG.binomPmf = (k, n, p) => (k < 0 || k > n ? 0 : Math.exp(CG.lchoose(n, k) + (p > 0 ? k * Math.log(p) : (k ? -Infinity : 0)) + (p < 1 ? (n - k) * Math.log(1 - p) : (n - k ? -Infinity : 0))));
  // P(X >= k) for X ~ Poisson(mu)
  CG.poisUpper = (k, mu) => { if (k <= 0) return 1; let s = 0, t = Math.exp(-mu); for (let i = 0; i < k; i++) { s += t; t *= mu / (i + 1); } return Math.max(0, 1 - s); };
  // Benjamini-Hochberg: returns q values in the input order
  CG.bh = (p) => {
    const n = p.length, ord = p.map((v, i) => i).sort((a, b) => p[a] - p[b]), q = new Array(n);
    let prev = 1;
    for (let r = n - 1; r >= 0; r--) { const i = ord[r]; prev = Math.min(prev, (p[i] * n) / (r + 1)); q[i] = prev; }
    return q;
  };
  // Non-negative least squares, Lawson-Hanson, for decomposing a mutation catalogue
  CG.nnls = (A, y, maxIter = 60) => {
    const m = A.length, n = A[0].length;
    const x = new Array(n).fill(0), P = new Array(n).fill(false);
    const resid = () => { const r = new Array(m); for (let i = 0; i < m; i++) { let s = 0; for (let j = 0; j < n; j++) s += A[i][j] * x[j]; r[i] = y[i] - s; } return r; };
    for (let it = 0; it < maxIter; it++) {
      const r = resid();
      let best = -1, bv = 1e-10;
      for (let j = 0; j < n; j++) { if (P[j]) continue; let w = 0; for (let i = 0; i < m; i++) w += A[i][j] * r[i]; if (w > bv) { bv = w; best = j; } }
      if (best < 0) break;
      P[best] = true;
      // least squares on the passive set, by normal equations with Gaussian elimination
      for (let inner = 0; inner < 30; inner++) {
        const act = []; for (let j = 0; j < n; j++) if (P[j]) act.push(j);
        const k = act.length, M = [], v = [];
        for (let a = 0; a < k; a++) {
          M.push(new Array(k).fill(0));
          let s = 0; for (let i = 0; i < m; i++) s += A[i][act[a]] * y[i]; v.push(s);
          for (let b = 0; b < k; b++) { let t = 0; for (let i = 0; i < m; i++) t += A[i][act[a]] * A[i][act[b]]; M[a][b] = t; }
        }
        for (let a = 0; a < k; a++) M[a][a] += 1e-9;
        const z = CG.solve(M, v);
        if (!z) { P[best] = false; break; }
        let neg = -1, alpha = 1;
        for (let a = 0; a < k; a++) if (z[a] <= 0) { const j = act[a]; const d = x[j] - z[a]; const t = d > 0 ? x[j] / d : 0; if (neg < 0 || t < alpha) { alpha = t; neg = j; } }
        if (neg < 0) { for (let j = 0; j < n; j++) x[j] = 0; act.forEach((j, a) => { x[j] = z[a]; }); break; }
        const old = act.map((j) => x[j]);
        act.forEach((j, a) => { x[j] = old[a] + alpha * (z[a] - old[a]); });
        P[neg] = false; x[neg] = 0;
      }
    }
    return x;
  };
  // dense linear solve with partial pivoting; null if singular
  CG.solve = (M, v) => {
    const n = v.length, A = M.map((r, i) => r.concat([v[i]]));
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      if (Math.abs(A[p][c]) < 1e-14) return null;
      [A[c], A[p]] = [A[p], A[c]];
      for (let r = 0; r < n; r++) { if (r === c) continue; const f = A[r][c] / A[c][c]; for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k]; }
    }
    return A.map((r, i) => r[n] / r[i]);
  };
  CG.cosine = (a, b) => { let d = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return na && nb ? d / Math.sqrt(na * nb) : 0; };

  /* ---------- Age-specific cancer incidence, SEER 18 registries, 2013-2017 ----------
     Rates per 100 000 per year, by five-year age band. Taken from the SEER Cancer
     Statistics Review 1975-2017, tables 3.7, 4.11, 6.10, 13.11, 15.10, 22.7, 25.7 and 26.7
     (incidence, all races, both sexes except where noted). Null where SEER suppresses the
     rate because there were too few cases. The first band is 1-4; 85+ is left out because
     it is open-ended. */
  CG.AGEMID = [2.5, 7.5, 12.5, 17.5, 22.5, 27.5, 32.5, 37.5, 42.5, 47.5, 52.5, 57.5, 62.5, 67.5, 72.5, 77.5, 82.5];
  CG.AGEBAND = ['1-4', '5-9', '10-14', '15-19', '20-24', '25-29', '30-34', '35-39', '40-44', '45-49', '50-54', '55-59', '60-64', '65-69', '70-74', '75-79', '80-84'];
  CG.SITES = [
    { k: 'crc', n: 'Colon and rectum', r: [null, 0.1, 0.5, 1.1, 1.8, 3.1, 6.1, 10.8, 19.4, 33.3, 61.8, 67.8, 88.2, 118.1, 146.2, 188.3, 234.6] },
    { k: 'lung', n: 'Lung and bronchus', r: [0.1, null, 0.1, 0.1, 0.3, 0.6, 1.2, 2.6, 6.3, 16.5, 42.6, 84.6, 134.6, 215.5, 318.8, 390.5, 406.5] },
    { k: 'panc', n: 'Pancreas', r: [null, null, 0.1, 0.1, 0.2, 0.3, 0.8, 1.4, 2.8, 5.9, 11.8, 20.6, 32.6, 48.3, 64.3, 82.4, 95.6] },
    { k: 'breast', n: 'Breast (women)', r: [null, null, null, 0.2, 1.6, 10.0, 29.4, 64.4, 130.7, 197.1, 236.4, 269.0, 342.3, 426.5, 470.2, 458.9, 413.5] },
    { k: 'leuk', n: 'Leukaemia', r: [9.0, 4.2, 3.4, 3.2, 2.9, 3.0, 3.7, 4.4, 6.0, 8.6, 12.9, 18.3, 27.7, 39.9, 55.0, 71.0, 84.2] },
    { k: 'brain', n: 'Brain and nervous system', r: [4.3, 3.5, 2.9, 2.3, 2.2, 2.8, 3.4, 3.8, 4.2, 5.5, 7.4, 10.0, 12.6, 15.8, 18.8, 21.1, 22.4] },
    { k: 'thy', n: 'Thyroid', r: [null, 0.2, 1.0, 3.3, 7.3, 12.0, 17.6, 22.2, 24.4, 26.1, 27.5, 28.4, 27.9, 30.2, 26.2, 23.8, 17.8] },
    { k: 'testis', n: 'Testis (men)', r: [0.3, null, 0.2, 3.7, 10.9, 15.1, 15.2, 12.5, 8.4, 6.4, 4.7, 3.3, 2.3, 1.5, 1.2, 0.9, 1.1] },
  ];

  /* ---------- A gene list for the driver-detection figure ----------
     len is the coding length in bases (CCDS consensus coding sequence, rounded);
     expr is relative expression (1 = high, 0 = silent) and rt is replication timing
     (0 = very early, 1 = very late), the two covariates MutSigCV uses; drv marks the
     genes that really are cancer genes, and exc is the excess of mutations attributable
     to selection in a cohort of this size. */
  CG.GENES = [
    { g: 'TP53', len: 1182, expr: 0.9, rt: 0.15, drv: 1, exc: 120 },
    { g: 'KRAS', len: 570, expr: 0.8, rt: 0.2, drv: 1, exc: 70 },
    { g: 'PIK3CA', len: 3207, expr: 0.7, rt: 0.3, drv: 1, exc: 55 },
    { g: 'APC', len: 8538, expr: 0.7, rt: 0.35, drv: 1, exc: 60 },
    { g: 'PTEN', len: 1212, expr: 0.8, rt: 0.3, drv: 1, exc: 30 },
    { g: 'BRAF', len: 2301, expr: 0.7, rt: 0.3, drv: 1, exc: 28 },
    { g: 'IDH1', len: 1245, expr: 0.8, rt: 0.2, drv: 1, exc: 12 },
    { g: 'NRAS', len: 570, expr: 0.8, rt: 0.2, drv: 1, exc: 9 },
    { g: 'SMAD4', len: 1659, expr: 0.7, rt: 0.35, drv: 1, exc: 10 },
    { g: 'RB1', len: 2787, expr: 0.6, rt: 0.45, drv: 1, exc: 12 },
    { g: 'ARID1A', len: 6858, expr: 0.6, rt: 0.4, drv: 1, exc: 14 },
    { g: 'TTN', len: 101862, expr: 0.05, rt: 0.95, drv: 0, exc: 0 },
    { g: 'MUC16', len: 43530, expr: 0.05, rt: 0.9, drv: 0, exc: 0 },
    { g: 'OBSCN', len: 24315, expr: 0.1, rt: 0.9, drv: 0, exc: 0 },
    { g: 'RYR2', len: 14904, expr: 0.05, rt: 0.95, drv: 0, exc: 0 },
    { g: 'CSMD3', len: 11316, expr: 0.1, rt: 0.95, drv: 0, exc: 0 },
    { g: 'OR4C3', len: 933, expr: 0.0, rt: 0.9, drv: 0, exc: 0 },
    { g: 'OR8U1', len: 936, expr: 0.0, rt: 0.9, drv: 0, exc: 0 },
    { g: 'OR2T4', len: 981, expr: 0.0, rt: 0.85, drv: 0, exc: 0 },
    { g: 'DNAH5', len: 13947, expr: 0.15, rt: 0.8, drv: 0, exc: 0 },
    { g: 'LRP1B', len: 13617, expr: 0.1, rt: 0.9, drv: 0, exc: 0 },
    { g: 'ZFHX4', len: 10911, expr: 0.2, rt: 0.75, drv: 0, exc: 0 },
    { g: 'GAPDH', len: 1008, expr: 1.0, rt: 0.05, drv: 0, exc: 0 },
    { g: 'ACTB', len: 1128, expr: 1.0, rt: 0.05, drv: 0, exc: 0 },
  ];

  /* ---------- Constants used across the figures ---------- */
  CG.K = {
    genome: 3.1e9,           // haploid human genome, bases
    exome: 3.3e7,            // coding bases captured by a typical exome kit
    pgPerGenome: 3.3,        // mass of one haploid genome, picograms
    uBozic: 1e-9,            // point mutation rate per base per cell division (Bozic et al. 2013)
    bBozic: 0.14,            // birth rate per cell per day
    dBozic: 0.13,            // death rate per cell per day
    kIntrinsic: 3.4e-4,      // intrinsic Ras GTP hydrolysis, per second
    kGap: 19,                // GAP-stimulated Ras GTP hydrolysis, per second
  };

  /* ---------- COSMIC v3.4 single-base-substitution reference signatures (GRCh37) ----------
     The 96 channels are held in the order used for signature plots: the six substitution
     classes C>A, C>G, C>T, T>A, T>C, T>G, and within each class the sixteen trinucleotide
     contexts, 5' base varying slowly and 3' base quickly. Values are parts per 100 000. */
  CG.SUBS = ['C>A', 'C>G', 'C>T', 'T>A', 'T>C', 'T>G'];
  CG.BASES = ['A', 'C', 'G', 'T'];
  CG.channel = (i) => CG.BASES[((i % 16) / 4) | 0] + '[' + CG.SUBS[(i / 16) | 0] + ']' + CG.BASES[i % 4];
  CG.SIGRAW = {
    SBS1: [89,228,18,128,31,179,9,0,158,34,59,0,7,253,0,1,186,122,12,114,2,8,35,0,1,16,17,0,0,20,7,156,2500,632,36506,958,200,27,19603,20,444,9,21804,4,111,4,11002,0,80,223,114,18,4,39,32,26,8,13,25,26,672,0,3,225,109,304,11,574,0,250,36,4,105,190,117,7,26,339,42,433,17,21,27,11,4,21,13,17,0,0,35,1,0,6,58,0],
    SBS2: [0,15,5,10,21,10,0,42,9,0,1,5,64,17,9,44,0,13,2,9,0,35,5,6,7,26,0,13,0,10,4,118,6,138,3,186,432,17,277,145,0,0,0,5,53602,9730,4420,30001,10,88,3,0,24,24,15,0,0,13,6,6,42,19,5,21,6,2,1,16,30,3,0,19,0,3,11,1,0,4,12,4,24,7,0,0,15,16,12,20,21,13,4,0,2,7,10,0],
    SBS13: [182,72,26,35,140,97,0,0,95,45,16,6,7900,2940,1210,3550,387,95,26,400,561,65,49,640,150,48,24,270,31699,6350,1380,36898,718,0,30,32,2,135,199,145,718,92,18,127,693,448,119,142,0,7,59,61,21,34,23,52,1,13,5,36,30,23,19,6,191,14,43,96,5,12,0,11,29,18,19,0,2,2,10,53,6,0,8,32,4,0,0,6,9,0,43,0,18,0,4,2],
    SBS3: [2081,1651,175,1220,2251,2531,251,1541,713,1090,143,1000,841,1681,141,997,1971,1170,25,1741,1931,1411,150,2231,1271,863,242,1471,1331,2031,52,2351,1421,1240,257,1210,1611,2021,224,2301,1641,1341,53,1130,576,1331,99,817,549,721,964,611,794,1781,1321,1271,706,748,1160,1230,651,1050,671,1301,1651,776,1230,1731,883,1451,1010,1581,998,564,1090,1020,1521,899,693,1391,395,260,630,397,437,704,1070,703,442,234,1090,583,725,628,805,1050],
    SBS4: [4220,3330,1560,2950,8069,7969,2450,6899,3160,3480,1530,2120,3980,4690,1090,4130,689,284,128,355,783,687,340,682,529,575,330,304,358,595,183,338,870,418,78,425,1270,1150,331,1600,409,446,48,381,374,699,28,722,942,353,1240,421,1440,1220,3250,1180,922,360,1310,552,888,431,954,562,795,71,500,156,518,236,550,256,290,118,237,75,241,50,174,64,105,16,142,22,87,44,379,120,60,25,243,25,38,17,232,57],
    SBS5: [1200,944,185,661,743,614,346,649,1020,765,234,682,786,917,230,1270,1010,570,172,1010,696,907,249,953,468,508,151,672,781,760,171,1250,3259,1790,618,2200,1940,1900,1750,2310,1940,2160,1230,1860,2030,2300,1590,2100,738,693,912,620,354,519,501,430,367,291,411,322,631,414,479,875,4619,1340,3819,3829,1330,1040,2080,1490,1410,794,1500,1370,1800,971,1270,1850,386,260,794,483,259,461,613,730,252,171,530,235,522,656,694,1350],
    SBS6: [43,52,5,18,182,409,165,961,43,91,36,123,36,50,20,75,47,29,0,25,4,4,8,1,2,69,0,32,5,11,0,13,6414,2291,12007,2131,1361,1481,12207,1381,9365,11106,17810,7444,1201,1051,5203,699,10,55,0,166,7,55,12,18,5,49,20,25,45,11,3,43,221,113,424,50,166,103,532,127,257,111,245,91,148,109,213,174,3,20,11,39,5,78,92,130,4,21,27,79,11,29,32,101],
    SBS7a: [7,18,7,25,46,24,0,37,4,14,4,0,39,64,3,61,6,2,5,10,0,13,8,10,2,3,5,4,0,5,1,28,12,1771,0,742,5003,5534,671,5664,8,1171,1,1611,23815,33122,7415,10707,194,67,59,371,18,26,11,37,40,22,29,31,36,39,0,80,49,23,19,62,45,26,10,182,10,7,7,81,215,60,32,81,47,25,28,31,8,17,0,3,9,12,33,84,13,12,0,8],
    SBS9: [56,409,43,305,480,192,137,306,772,668,17,856,1700,246,44,2730,484,196,136,641,89,154,44,303,136,283,52,857,269,200,40,563,810,542,438,649,724,876,651,1110,698,653,476,1070,427,733,326,546,1270,282,276,1890,479,313,531,444,265,212,79,256,2600,185,1670,1700,2030,1050,1430,2900,1370,1530,1540,3290,952,978,631,986,1400,1360,931,3840,4510,693,533,2390,2600,741,1420,5650,830,585,397,1940,6569,862,1090,6389],
    SBS10a: [219,177,15,1700,318,20,5,1730,121,44,1,1110,9401,997,116,67005,0,2,0,0,5,0,2,3,2,8,0,4,6,0,0,5,104,83,557,299,4,0,0,10,4,1250,1490,1350,37,276,279,2280,5,19,0,666,0,0,0,38,0,0,7,43,204,36,69,529,75,362,214,336,12,4,105,0,220,628,0,529,73,517,36,325,192,124,32,922,16,0,5,130,20,83,0,221,269,0,2,1890],
    SBS11: [15,55,9,27,62,99,1,15,17,41,1,0,18,94,0,5,17,29,6,54,26,18,1,1,5,11,0,19,2,22,0,19,2584,14721,759,10916,408,12618,92,6519,1973,11516,178,6970,979,15823,0,11917,42,44,4,0,18,21,31,16,0,38,12,16,19,20,20,67,114,94,32,119,33,71,13,8,81,86,56,24,11,47,16,11,22,5,18,29,0,0,0,13,10,0,13,15,9,7,10,6],
    SBS17b: [61,13,6,46,27,4,0,18,100,0,9,53,1,0,10,257,15,4,0,32,19,5,0,19,6,6,0,0,16,6,2,150,57,7,29,15,46,6,54,14,6,16,85,0,11,60,6,89,6,29,7,63,9,224,72,779,10,35,24,158,119,24,0,131,10,25,0,54,65,646,392,1830,6,150,101,147,106,110,121,100,141,448,99,6910,205,3140,1370,54996,28,625,148,11399,1,875,478,12199],
    SBS18: [5153,1581,243,2141,7405,1961,1201,3632,10907,1731,756,6234,7385,4363,1271,12208,173,259,192,408,61,226,358,379,64,134,64,123,214,464,90,318,921,465,1221,798,1171,676,1681,665,969,818,1481,669,1141,1141,1181,375,249,88,260,785,54,306,321,226,160,195,183,346,1081,273,179,710,202,209,208,424,39,246,162,256,71,226,398,315,180,618,326,337,72,86,199,184,11,199,293,414,87,4,583,214,70,210,145,516],
    SBS22a: [605,9,79,173,182,438,14,11,223,171,52,55,79,175,0,40,167,19,24,6,104,78,24,32,140,92,21,45,358,153,39,39,177,22,141,62,120,315,43,159,239,185,0,175,160,133,4,0,6370,704,6043,250,12801,5527,16802,6070,5339,1016,3768,946,7094,2406,7379,3023,2492,90,773,75,674,134,203,54,72,124,58,85,457,0,123,0,232,5,294,4,491,88,803,120,158,24,45,2,500,77,561,60],
    SBS31: [953,1849,166,628,1069,1159,33,2789,1309,2149,97,351,186,938,95,449,832,316,300,378,205,186,85,342,183,751,46,336,40,292,42,424,1769,928,759,1009,4118,16391,820,14492,680,1139,197,570,748,2459,841,1949,786,607,503,416,2059,2109,1869,3098,190,291,577,79,670,375,327,888,2039,740,812,847,815,990,446,1379,453,657,513,469,459,1029,401,1209,368,248,402,78,197,143,150,95,30,87,255,281,225,238,535,730],
  };
  CG.SIG = {}; Object.keys(CG.SIGRAW).forEach((k) => { const s = CG.SIGRAW[k].reduce((a, b) => a + b, 0); CG.SIG[k] = CG.SIGRAW[k].map((v) => v / s); });
  /* Proposed aetiologies, abbreviated from the COSMIC catalogue */
  CG.SIGNOTE = {
    SBS1: ['Clock-like', 'Spontaneous deamination of 5-methylcytosine at CpG, giving C>T at ACG, CCG, GCG and TCG. Accumulates with age in every tissue.'],
    SBS2: ['APOBEC', 'APOBEC3 cytidine deaminases acting on single-stranded DNA, giving C>T at TCA and TCT.'],
    SBS13: ['APOBEC', 'The same deamination read through by an error-prone polymerase, giving C>G rather than C>T.'],
    SBS3: ['BRCA1/2 loss', 'Failure of homologous-recombination repair. Nearly flat across all 96 channels, which is why it is hard to call.'],
    SBS4: ['Tobacco smoking', 'Bulky guanine adducts from benzo[a]pyrene, read as C>A.'],
    SBS5: ['Clock-like', 'Cause unknown. Present in every cancer and every normal tissue, and close to flat.'],
    SBS6: ['Mismatch-repair loss', 'Defective mismatch repair; found in microsatellite-unstable tumours.'],
    SBS7a: ['Ultraviolet light', 'Pyrimidine dimers at adjacent pyrimidines, giving C>T at TCC and CCC.'],
    SBS9: ['Polymerase eta', 'Somatic hypermutation in lymphoid cells; found in chronic lymphocytic leukaemia and lymphoma.'],
    SBS10a: ['POLE proofreading loss', 'An exonuclease-domain mutant DNA polymerase epsilon: TCT>TAT and TCG>TTG, at enormous rates.'],
    SBS11: ['Temozolomide', 'Alkylating chemotherapy, seen in treated gliomas.'],
    SBS17b: ['Unknown', 'T>G at CTT. Associated with 5-fluorouracil treatment and with oesophageal cancer.'],
    SBS18: ['Reactive oxygen', 'Damage by reactive oxygen species; also seen when the base-excision gene MUTYH is lost.'],
    SBS22a: ['Aristolochic acid', 'A herbal remedy taken in parts of Asia. Almost pure T>A at CTG.'],
    SBS31: ['Platinum chemotherapy', 'Cisplatin and carboplatin adducts, found only after treatment.'],
  };

  if (typeof window !== 'undefined') window.CG = CG;
  if (typeof module !== 'undefined') module.exports = CG;
})();
