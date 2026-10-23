/* Volume VII, Part I figures: the Schrödinger equation, the chemical bond, basis sets,
   electron correlation, cost scaling, and a Kohn–Sham atom. */
(function () {
  const HA = 27.211386, BOHR = 0.529177; // eV per hartree, Å per bohr
  const lbl = (g, x, y, s, fill, anchor = 'start', size = 11) => { const t = Lab.svg('text', { x, y, 'font-size': size, fill, 'text-anchor': anchor }, g); t.textContent = s; return t; };

  /* ---------- Fig 1.1 Solving the Schrödinger equation in one dimension ---------- */
  (function () {
    const root = Lab.$('#fig-schrod');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement), pIn = Lab.$('#sc-p', root), pLab = Lab.$('label[for="sc-p"] span', root);
    const st = { mode: 'box', p: { box: 6, well: 0.25, morse: 0 }, k: 4 };
    let ready = false;
    // Each model returns: potential in eV on x in Å, mass in electron masses, domain, plotting ranges
    const MODELS = {
      box: { name: 'Electron in a box', param: 'Box width', unit: 'Å', min: 2, max: 20, step: 0.5, def: 6, k: 4,
        make: (L) => ({ m: 1, x0: 0, x1: L, V: () => 0, xr: [-0.05 * L, 1.5 * L], walls: true }) },
      well: { name: 'Proton in a double well', param: 'Barrier height', unit: 'eV', min: 0, max: 0.6, step: 0.01, def: 0.25, k: 4,
        make: (B) => ({ m: 1836.15, x0: -1.2, x1: 1.2, V: (x) => { const a = 0.35; return B * ((x * x - a * a) / (a * a)) ** 2; }, xr: [-0.8, 0.8] }) },
      morse: { name: 'Vibrating H₂ molecule', param: 'Show harmonic approximation', unit: '', min: 0, max: 1, step: 1, def: 0, k: 6,
        make: (harm) => {
          const D = 4.7476, a = 1.944, re = 0.7414; // Morse fit to H2: De, a from the measured vibrational frequency, re
          return { m: 918.576, x0: 0.25, x1: 3.5, V: harm ? (x) => D * a * a * (x - re) ** 2 - D : (x) => D * ((1 - Math.exp(-a * (x - re))) ** 2) - D, xr: [0.3, 2.6] };
        } },
    };
    function solve() {
      const M = MODELS[st.mode], P = M.make(st.p[st.mode]);
      // atomic units internally: x in bohr, V in hartree, kinetic term scaled by 1/m
      const n = 700, s = CC.schrod1d((xb) => P.V(xb * BOHR) / HA * P.m, P.x0 / BOHR, P.x1 / BOHR, n, M.k);
      // with V multiplied by m, eigenvalues come out as m*E; divide back
      s.states.forEach((t) => (t.E = (t.E / P.m) * HA));
      return { M, P, s };
    }
    function draw() {
      if (!ready) return;
      const { M, P, s } = solve();
      const Es = s.states.map((t) => t.E);
      const top = st.mode === 'box' ? Es[Es.length - 1] * 1.25 : st.mode === 'well' ? Math.max(st.p.well * 1.4, Es[Es.length - 1] * 1.15, 0.5) : 0.2;
      const bot = st.mode === 'morse' ? -4.9 : st.mode === 'box' ? -0.05 * top : -0.05 * top;
      const f = CC.frame(svg, { h: 340, m: { l: 52, r: 16, t: 30, b: 42 }, x: P.xr, y: [bot, top], xt: ticks(P.xr), yt: ticks([bot, top]), xf: (v) => +v.toFixed(2), yf: (v) => +v.toFixed(2), xl: 'position (Å)', yl: 'Energy (eV) and wavefunctions' });
      // potential
      const pts = []; for (let i = 0; i <= 300; i++) { const x = P.xr[0] + ((P.xr[1] - P.xr[0]) * i) / 300; let v = x < P.x0 || x > P.x1 ? Infinity : P.V(x); pts.push([x, Math.min(top, v)]); }
      if (P.walls) { Lab.svg('path', { d: `M${f.X(P.x0)} ${f.Y(top)}L${f.X(P.x0)} ${f.Y(0)}L${f.X(P.x1)} ${f.Y(0)}L${f.X(P.x1)} ${f.Y(top)}`, fill: 'none', stroke: f.pal.ink2, 'stroke-width': 2 }, f.g); }
      else Lab.svg('path', { d: CC.path(pts.filter((p) => isFinite(p[1])), f.X, f.Y), fill: 'none', stroke: f.pal.ink2, 'stroke-width': 2 }, f.g);
      // wavefunctions drawn at their energy, scaled for visibility
      let lastY = Infinity;
      s.states.forEach((t, k) => {
        let mx = 0; t.psi.forEach((v) => (mx = Math.max(mx, Math.abs(v))));
        const amp = (0.06 * (top - bot)) / mx, q = [];
        for (let i = 0; i < s.xs.length; i += 2) { const x = s.xs[i] * BOHR; if (x >= P.xr[0] && x <= P.xr[1]) q.push([x, t.E + amp * t.psi[i]]); }
        // energy level across the classically allowed region
        let a = null, b = null; for (let i = 0; i <= 600; i++) { const x = P.xr[0] + ((P.xr[1] - P.xr[0]) * i) / 600; if (x >= P.x0 && x <= P.x1 && P.V(x) <= t.E) { if (a === null) a = x; b = x; } }
        if (a !== null) Lab.svg('line', { x1: f.X(a), x2: f.X(b), y1: f.Y(t.E), y2: f.Y(t.E), stroke: f.pal.ink3, 'stroke-dasharray': '3 3' }, f.g);
        Lab.svg('path', { d: CC.path(q, f.X, f.Y), fill: 'none', stroke: k % 2 ? f.pal.s2 : f.pal.s1, 'stroke-width': 1.8 }, f.g);
        const ly = Math.min(f.Y(t.E) - 4, lastY - 13); lastY = ly;
        lbl(f.g, f.W - f.m.r - 4, ly, `n=${k}  ${t.E.toFixed(3)} eV`, f.pal.ink2, 'end', 10.5);
      });
      CC.hover(svg, f, P.xr[0], P.xr[1], (x, sx, sy, px) => {
        const v = x < P.x0 || x > P.x1 ? Infinity : P.V(x);
        tip.show(px, f.m.t * sy + 30, `<b>${x.toFixed(2)} Å</b><br>potential ${isFinite(v) ? v.toFixed(3) + ' eV' : 'wall'}`, f.m.t * sy + 50);
      }, () => tip.hide());
      let r = '';
      if (st.mode === 'box') { const L = st.p.box * 1e-10, ex = (6.62607015e-34 ** 2) / (8 * 9.1093837e-31 * L * L) / 1.602176634e-19; r = `<span>lowest level <b>${Es[0].toFixed(3)} eV</b></span><span>formula h²/8mL² <b>${ex.toFixed(3)} eV</b></span><span>E₁/E₀ <b>${(Es[1] / Es[0]).toFixed(2)}</b> (exact 4)</span>`; }
      else if (st.mode === 'well') r = `<span>tunneling splitting E₁ − E₀ <b>${((Es[1] - Es[0]) * 1000).toFixed(2)} meV</b></span><span>E₃ − E₂ <b>${((Es[3] - Es[2]) * 1000).toFixed(1)} meV</b></span>`;
      else { const w = (Es[1] - Es[0]) * 8065.54; r = `<span>zero-point energy <b>${(Es[0] + 4.7476).toFixed(3)} eV</b></span><span>first vibrational spacing <b>${Math.round(w)} cm⁻¹</b></span><span>spacing between levels 4 and 5 <b>${Math.round((Es[5] - Es[4]) * 8065.54)} cm⁻¹</b></span>`; }
      out.innerHTML = r;
    }
    function ticks([a, b]) { const span = b - a, raw = span / 5, p = Math.pow(10, Math.floor(Math.log10(raw))), st2 = [1, 2, 2.5, 5, 10].map((m) => m * p).find((m) => m >= raw); const t = []; for (let v = Math.ceil(a / st2) * st2; v <= b + 1e-9; v += st2) t.push(+v.toFixed(6)); return t; }
    const setMode = (k) => {
      st.mode = k; const M = MODELS[k];
      Lab.$$('[data-sc]', root).forEach((b) => b.setAttribute('aria-pressed', b.dataset.sc === k ? 'true' : 'false'));
      pLab.textContent = M.param; pIn.min = M.min; pIn.max = M.max; pIn.step = M.step; pIn.value = st.p[k];
      pIn.dispatchEvent(new Event('input'));
    };
    Lab.$$('[data-sc]', root).forEach((b) => b.addEventListener('click', () => setMode(b.dataset.sc)));
    Lab.slider(pIn, (v) => (st.mode === 'morse' ? (v ? 'on' : 'off') : v + ' ' + MODELS[st.mode].unit), (v) => { st.p[st.mode] = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();

  /* ---------- Fig 2.1 The hydrogen molecule ion, H2+, from two atomic orbitals ---------- */
  (function () {
    const root = Lab.$('#fig-h2p');
    if (!root) return;
    const [svgA, svgB] = Lab.$$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svgA.parentElement);
    const st = { R: 2.5, zeta: false };
    let ready = false;
    // Matrix elements for 1s orbitals with exponent 1 at separation w (bohr): S, Coulomb J, exchange K
    const ints = (w) => {
      const S = Math.exp(-w) * (1 + w + (w * w) / 3), K = Math.exp(-w) * (1 + w), J = 1 / w - Math.exp(-2 * w) * (1 + 1 / w);
      return { S, T: [0.5, -0.5 * S + K], V: [-1 - J, -2 * K] };
    };
    // E(R, zeta): kinetic scales as zeta^2, potential as zeta, at scaled separation w = zeta R
    const energy = (R, z, sgn) => { const I = ints(z * R); return (z * z * (I.T[0] + sgn * I.T[1]) + z * (I.V[0] + sgn * I.V[1])) / (1 + sgn * I.S) + 1 / R; };
    const bestZ = (R) => { let lo = 0.5, hi = 2.5; for (let i = 0; i < 60; i++) { const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3; if (energy(R, m1, 1) < energy(R, m2, 1)) hi = m2; else lo = m1; } return (lo + hi) / 2; };
    const curve = (sgn, opt) => { const p = []; for (let R = 0.8; R <= 8.001; R += 0.05) { const z = opt ? bestZ(R) : 1; p.push([R * BOHR, (energy(R, z, sgn) + 0.5) * HA]); } return p; };
    const min = (pts) => pts.reduce((a, b) => (b[1] < a[1] ? b : a));
    function drawEnergy() {
      const f = CC.frame(svgA, { h: 320, m: { l: 44, r: 16, t: 30, b: 42 }, x: [0.4, 4.2], y: [-3.5, 6], xt: [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4], yt: [-3, -2, -1, 0, 2, 4, 6], xl: 'distance between the protons (Å)', yl: 'Energy relative to H + H⁺ (eV)' });
      const bond = curve(1, false), anti = curve(-1, false);
      const clip = (p) => p.filter((q) => q[1] <= 6.2 && q[0] >= 0.4);
      Lab.svg('path', { d: CC.path(clip(anti), f.X, f.Y), fill: 'none', stroke: f.pal.s2, 'stroke-width': 2 }, f.g);
      Lab.svg('path', { d: CC.path(clip(bond), f.X, f.Y), fill: 'none', stroke: f.pal.s1, 'stroke-width': 2 }, f.g);
      let zc = null;
      if (st.zeta) { zc = curve(1, true); Lab.svg('path', { d: CC.path(clip(zc), f.X, f.Y), fill: 'none', stroke: f.pal.s3, 'stroke-width': 2, 'stroke-dasharray': '6 4' }, f.g); }
      // exact minimum (Born–Oppenheimer): 2.00 bohr, -2.79 eV
      const ex = [2.0 * BOHR, -2.79];
      Lab.svg('circle', { cx: f.X(ex[0]), cy: f.Y(ex[1]), r: 4.5, fill: 'none', stroke: f.pal.ink, 'stroke-width': 1.5 }, f.g);
      lbl(f.g, f.X(ex[0]) + 8, f.Y(ex[1]) + 4, 'exact minimum', f.pal.ink2);
      const mb = min(bond);
      lbl(f.g, f.X(2.6), f.Y(bond.find((p) => p[0] >= 2.6)[1]) + 18, 'bonding', f.pal.ink2);
      lbl(f.g, f.X(1.75), f.Y(anti.find((p) => p[0] >= 1.75)[1]) - 8, 'antibonding', f.pal.ink2);
      if (zc) lbl(f.g, f.X(0.62), f.Y(-0.4), 'bonding, best ζ', f.pal.ink2);
      const Ra = st.R * BOHR;
      Lab.svg('line', { x1: f.X(Ra), x2: f.X(Ra), y1: f.m.t, y2: f.H - f.m.b, stroke: f.pal.ink3, 'stroke-dasharray': '3 3' }, f.g);
      CC.hover(svgA, f, 0.4, 4.2, (x, sx, sy, px) => {
        const R = x / BOHR, b = (energy(R, 1, 1) + 0.5) * HA, a = (energy(R, 1, -1) + 0.5) * HA;
        tip.show(px, f.Y(Math.min(6, a)) * sy - 8, `<b>${x.toFixed(2)} Å</b><br>bonding ${b.toFixed(2)} eV<br>antibonding ${a.toFixed(2)} eV`, f.Y(b) * sy + 12);
      }, () => tip.hide());
      return { mb, zc };
    }
    function drawOrbitals() {
      // wavefunctions along the axis through both protons at the chosen separation
      const R = st.R, z = st.zeta ? bestZ(R) : 1, I = ints(z * R);
      const W = Math.max(260, svgB.clientWidth || 300), H = 320; svgB.setAttribute('viewBox', `0 0 ${W} ${H}`); svgB.setAttribute('height', H); svgB.innerHTML = '';
      const pal = Lab.palette(), g = Lab.svg('g', {}, svgB), half = Math.max(3, R / 2 + 2.5);
      const X = Lab.scale(-half, half, 20, W - 12), rows = [[1, 'bonding', 40, 150], [-1, 'antibonding', 190, 300]];
      rows.forEach(([sgn, name, y0, y1]) => {
        const N = 1 / Math.sqrt(2 * (1 + sgn * I.S)), phi = (x) => Math.sqrt(z ** 3 / Math.PI) * Math.exp(-z * Math.abs(x));
        const vals = []; for (let i = 0; i <= 240; i++) { const x = -half + (2 * half * i) / 240; vals.push([x, N * (phi(x + R / 2) + sgn * phi(x - R / 2))]); }
        const mx = Math.max(...vals.map((v) => Math.abs(v[1]))), mid = (y0 + y1) / 2, Y = (v) => mid - (v / mx) * (y1 - y0) * 0.45;
        Lab.svg('line', { x1: 20, x2: W - 12, y1: mid, y2: mid, stroke: pal.grid }, g);
        Lab.svg('path', { d: vals.map((v, i) => (i ? 'L' : 'M') + X(v[0]).toFixed(1) + ' ' + Y(v[1]).toFixed(1)).join(''), fill: 'none', stroke: sgn > 0 ? pal.s1 : pal.s2, 'stroke-width': 2 }, g);
        [-R / 2, R / 2].forEach((x) => Lab.svg('circle', { cx: X(x), cy: mid, r: 4, fill: pal.ink }, g));
        lbl(g, 20, y0 - 8, name + ' orbital along the axis', pal.ink2);
      });
      lbl(g, W - 12, H - 4, `protons ${(R * BOHR).toFixed(2)} Å apart`, pal.ink3, 'end', 10.5);
    }
    function draw() {
      if (!ready) return;
      const { mb, zc } = drawEnergy(); drawOrbitals();
      const R = st.R, eb = (energy(R, st.zeta ? bestZ(R) : 1, 1) + 0.5) * HA;
      const best = st.zeta ? min(zc) : mb;
      out.innerHTML = `<span>energy at ${(R * BOHR).toFixed(2)} Å <b>${eb.toFixed(2)} eV</b></span><span>model bond length <b>${best[0].toFixed(2)} Å</b> (exact 1.06)</span><span>model binding energy <b>${(-best[1]).toFixed(2)} eV</b> (exact 2.79)</span>${st.zeta ? `<span>best ζ here <b>${bestZ(R).toFixed(2)}</b></span>` : ''}`;
    }
    Lab.slider(Lab.$('#hp-r', root), (v) => (v * BOHR).toFixed(2) + ' Å', (v) => { st.R = v; draw(); });
    Lab.$('#hp-z', root).addEventListener('change', (e) => { st.zeta = e.target.checked; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svgA, draw);
  })();

  /* ---------- Fig 3.1 Building a hydrogen orbital from Gaussians ---------- */
  (function () {
    const root = Lab.$('#fig-basis');
    if (!root) return;
    const [svgA, svgB] = Lab.$$('svg', root), out = Lab.$('.readouts', root), tipA = Lab.tip(svgA.parentElement), tipB = Lab.tip(svgB.parentElement);
    // Exponents optimized variationally for the hydrogen atom (computed for this page; they reproduce Huzinaga's 1965 energies)
    const EXP = [[0.2829421], [0.2015296, 1.3325], [0.1513764, 0.6812892, 4.500362], [0.1219496, 0.444538, 1.962257, 13.0107], [0.1030724, 0.3272304, 1.164662, 5.123574, 34.06139], [0.08996902, 0.2585947, 0.8000103, 2.833054, 12.45241, 82.92158]];
    const sols = EXP.map((a) => ({ a, ...CC.hAtom(a) }));
    const st = { n: 3 };
    let ready = false;
    const psi = (s, r) => s.c.reduce((t, c, i) => t + c * Math.pow((2 * s.a[i]) / Math.PI, 0.75) * Math.exp(-s.a[i] * r * r), 0);
    const exact = (r) => Math.exp(-r) / Math.sqrt(Math.PI);
    function draw() {
      if (!ready) return;
      const s = sols[st.n - 1], sg = psi(s, 0) < 0 ? -1 : 1;
      const f = CC.frame(svgA, { h: 300, m: { l: 44, r: 14, t: 30, b: 42 }, x: [0, 4], y: [0, 0.62], xt: [0, 1, 2, 3, 4], yt: [0, 0.2, 0.4, 0.6], xf: (v) => v, yf: (v) => v.toFixed(1), xl: 'distance from the nucleus (bohr)', yl: 'Wavefunction ψ(r)' });
      const ex = [], ap = []; for (let i = 0; i <= 200; i++) { const r = (4 * i) / 200; ex.push([r, exact(r)]); ap.push([r, sg * psi(s, r)]); }
      Lab.svg('path', { d: CC.path(ex, f.X, f.Y), fill: 'none', stroke: f.pal.ink2, 'stroke-width': 1.6, 'stroke-dasharray': '5 4' }, f.g);
      Lab.svg('path', { d: CC.path(ap, f.X, f.Y), fill: 'none', stroke: f.pal.s1, 'stroke-width': 2.2 }, f.g);
      // individual Gaussians (scaled by coefficient)
      s.a.forEach((a, i) => { const q = []; for (let k = 0; k <= 200; k++) { const r = (4 * k) / 200; q.push([r, sg * s.c[i] * Math.pow((2 * a) / Math.PI, 0.75) * Math.exp(-a * r * r)]); } Lab.svg('path', { d: CC.path(q.filter((p) => p[1] <= 0.62), f.X, f.Y), fill: 'none', stroke: f.pal.s3, 'stroke-width': 1, 'stroke-opacity': 0.75 }, f.g); });
      lbl(f.g, f.X(1.25), f.Y(exact(1.25)) - 10, 'exact e^(−r)', f.pal.ink2);
      lbl(f.g, f.X(0.08), f.Y(0.6), `sum of ${st.n} Gaussian${st.n > 1 ? 's' : ''}`, f.pal.ink2);
      CC.hover(svgA, f, 0, 4, (r, sx, sy, px) => tipA.show(px, f.Y(exact(r)) * sy - 8, `<b>r = ${r.toFixed(2)}</b><br>exact ${exact(r).toFixed(3)}<br>Gaussian fit ${(sg * psi(s, r)).toFixed(3)}`, f.Y(exact(r)) * sy + 12), () => tipA.hide());
      // energy error vs number of Gaussians
      const g = CC.frame(svgB, { h: 300, m: { l: 52, r: 14, t: 30, b: 42 }, x: [0.5, 6.5], y: [1e-5, 0.2], ylog: true, xt: [1, 2, 3, 4, 5, 6], yt: [1e-4, 1e-3, 1e-2, 1e-1], yf: (v) => Lab.fmt.sci(v), xl: 'number of Gaussians', yl: 'Energy error (hartree)' });
      const pts = sols.map((t, i) => [i + 1, t.E + 0.5]);
      Lab.svg('path', { d: CC.path(pts, g.X, g.Y), fill: 'none', stroke: g.pal.s1, 'stroke-width': 2 }, g.g);
      pts.forEach((p, i) => Lab.svg('circle', { cx: g.X(p[0]), cy: g.Y(p[1]), r: i + 1 === st.n ? 6 : 4, fill: i + 1 === st.n ? g.pal.s1 : g.pal.paper, stroke: g.pal.s1, 'stroke-width': 2 }, g.g));
      const chem = 0.0016; // 1 kcal/mol
      Lab.svg('line', { x1: g.m.l, x2: g.W - g.m.r, y1: g.Y(chem), y2: g.Y(chem), stroke: g.pal.ink3, 'stroke-dasharray': '4 3' }, g.g);
      lbl(g.g, g.m.l + 4, g.Y(chem) + 14, 'chemical accuracy, 1 kcal/mol', g.pal.ink3, 'start', 10.5);
      CC.hover(svgB, g, 0.5, 6.5, (x, sx, sy, px) => { const k = Math.max(1, Math.min(6, Math.round(x))), e = sols[k - 1].E; tipB.show(g.X(k) * sx, g.Y(e + 0.5) * sy - 8, `<b>${k} Gaussian${k > 1 ? 's' : ''}</b><br>E = ${e.toFixed(6)} hartree<br>error ${((e + 0.5) * 627.5).toFixed(2)} kcal/mol`, g.Y(e + 0.5) * sy + 12); }, () => tipB.hide());
      out.innerHTML = `<span>energy <b>${s.E.toFixed(6)} Ha</b> (exact −0.5)</span><span>error <b>${((s.E + 0.5) * 627.5).toFixed(2)} kcal/mol</b></span><span>slope at the nucleus <b>0</b> (exact −1)</span>`;
    }
    Lab.slider(Lab.$('#bs-n', root), (v) => v + '', (v) => { st.n = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svgA, draw);
  })();

  /* ---------- Fig 4.1 Pulling H2 apart: Hartree–Fock versus full configuration interaction ---------- */
  (function () {
    const root = Lab.$('#fig-h2');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    const st = { R: 0.74 };
    let ready = false, data = null;
    // Morse curve from experiment: De = 4.7476 eV, re = 0.7414 Å, a = 1.944 per Å (from the 4401 cm-1 vibration)
    const morse = (x) => -1 - 0.174475 + 0.174475 * (1 - Math.exp(-1.944 * (x - 0.7414))) ** 2;
    function compute() {
      data = [];
      for (let x = 0.4; x <= 4.0001; x += 0.05) { const r = CC.h2(x / BOHR); data.push({ x, hf: r.Ehf, fci: r.Efci }); }
    }
    function draw() {
      if (!ready) return;
      if (!data) compute();
      const f = CC.frame(svg, { h: 340, m: { l: 52, r: 16, t: 30, b: 42 }, x: [0.4, 4], y: [-1.2, -0.5], xt: [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4], yt: [-1.2, -1.1, -1, -0.9, -0.8, -0.7, -0.6, -0.5], yf: (v) => v.toFixed(1), xl: 'H–H distance (Å)', yl: 'Total energy (hartree)' });
      const ms = []; for (let x = 0.45; x <= 4; x += 0.02) ms.push([x, morse(x)]);
      Lab.svg('line', { x1: f.m.l, x2: f.W - f.m.r, y1: f.Y(-1), y2: f.Y(-1), stroke: f.pal.ink3, 'stroke-dasharray': '2 3' }, f.g);
      lbl(f.g, f.W - f.m.r - 4, f.Y(-1) - 5, 'two hydrogen atoms, exact', f.pal.ink3, 'end', 10.5);
      Lab.svg('path', { d: CC.path(ms.filter((p) => p[1] < -0.5), f.X, f.Y), fill: 'none', stroke: f.pal.s3, 'stroke-width': 2, 'stroke-dasharray': '6 4' }, f.g);
      Lab.svg('path', { d: CC.path(data.map((d) => [d.x, d.fci]).filter((p) => p[1] < -0.5), f.X, f.Y), fill: 'none', stroke: f.pal.s2, 'stroke-width': 2 }, f.g);
      Lab.svg('path', { d: CC.path(data.map((d) => [d.x, d.hf]).filter((p) => p[1] < -0.5), f.X, f.Y), fill: 'none', stroke: f.pal.s1, 'stroke-width': 2 }, f.g);
      const at = (x) => data.reduce((a, b) => (Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a));
      lbl(f.g, f.X(2.4), f.Y(at(2.4).hf) - 8, 'Hartree–Fock', f.pal.ink2);
      lbl(f.g, f.X(1.9), f.Y(at(1.9).fci) - 8, 'full CI, same basis', f.pal.ink2);
      lbl(f.g, f.X(1.3), f.Y(morse(1.3)) + 18, 'experiment (Morse fit)', f.pal.ink2);
      Lab.svg('line', { x1: f.X(st.R), x2: f.X(st.R), y1: f.m.t, y2: f.H - f.m.b, stroke: f.pal.ink3, 'stroke-dasharray': '3 3' }, f.g);
      CC.hover(svg, f, 0.4, 4, (x, sx, sy, px) => { const d = at(x); tip.show(px, f.Y(d.hf) * sy - 10, `<b>${d.x.toFixed(2)} Å</b><br>Hartree–Fock ${d.hf.toFixed(4)}<br>full CI ${d.fci.toFixed(4)}<br>experiment ${morse(d.x).toFixed(4)}`, f.Y(d.fci) * sy + 12); }, () => tip.hide());
      const r = CC.h2(st.R / BOHR), w = r.cci[1] * r.cci[1];
      out.innerHTML = `<span>Hartree–Fock <b>${r.Ehf.toFixed(4)} Ha</b></span><span>full CI <b>${r.Efci.toFixed(4)} Ha</b></span><span>correlation energy <b>${((r.Efci - r.Ehf) * 627.5).toFixed(1)} kcal/mol</b></span><span>weight of the doubly excited configuration <b>${(w * 100).toFixed(1)}%</b></span><span>SCF cycles <b>${r.iters.length}</b></span>`;
    }
    Lab.slider(Lab.$('#h2-r', root), (v) => v.toFixed(2) + ' Å', (v) => { st.R = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();

  /* ---------- Fig 4.2 How cost grows with molecule size ---------- */
  (function () {
    const root = Lab.$('#fig-cost');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    // Formal scaling with system size N; every method is set to take 1 second for a 3-atom molecule.
    const M = [{ k: 'dft', name: 'DFT', p: 3, col: 'ink2' }, { k: 'hf', name: 'Hartree–Fock', p: 4, col: 's1' }, { k: 'mp2', name: 'MP2', p: 5, col: 's3' }, { k: 'cc', name: 'CCSD(T)', p: 7, col: 's2' }];
    const st = { speed: 0 };
    let ready = false;
    const DAY = 86400;
    const maxN = (p) => 3 * Math.pow((DAY * Math.pow(10, st.speed)), 1 / p);
    function draw() {
      if (!ready) return;
      const f = CC.frame(svg, { h: 330, m: { l: 52, r: 16, t: 30, b: 42 }, x: [3, 3000], xlog: true, y: [1, 1e18], ylog: true, xt: [3, 10, 30, 100, 300, 1000, 3000], yt: [1, 1e3, 1e6, 1e9, 1e12, 1e15, 1e18], yf: (v) => Lab.fmt.sci(v).replace('10⁰', '1'), xl: 'atoms in the molecule', yl: 'Relative cost (1 = a 3-atom molecule)' });
      const budget = DAY * Math.pow(10, st.speed);
      Lab.svg('line', { x1: f.m.l, x2: f.W - f.m.r, y1: f.Y(budget), y2: f.Y(budget), stroke: f.pal.ink3, 'stroke-dasharray': '5 4' }, f.g);
      lbl(f.g, f.m.l + 6, f.Y(budget) - 6, st.speed ? `one day on a computer 10${'⁰¹²³⁴⁵⁶⁷⁸⁹'[st.speed]}× faster` : 'one day, if the 3-atom job takes a second', f.pal.ink3, 'start', 10.5);
      M.forEach((m) => {
        const pts = []; for (let i = 0; i <= 60; i++) { const N = 3 * Math.pow(1000, i / 60); pts.push([N, Math.pow(N / 3, m.p)]); }
        Lab.svg('path', { d: CC.path(pts.filter((p) => p[1] <= 1e18), f.X, f.Y), fill: 'none', stroke: f.pal[m.col], 'stroke-width': 2, 'stroke-dasharray': m.k === 'dft' ? '6 4' : '' }, f.g);
        const N = Math.min(2500, 3 * Math.pow(1e18, 1 / m.p) * 0.8);
        lbl(f.g, f.X(N) - 4, f.Y(Math.pow(N / 3, m.p)) - 6, `${m.name} ∝ N${'⁰¹²³⁴⁵⁶⁷'[m.p]}`, f.pal.ink2, 'end');
      });
      CC.hover(svg, f, 3, 3000, (N, sx, sy, px) => tip.show(px, f.m.t * sy + 40, `<b>${Math.round(N)} atoms</b><br>${M.map((m) => `${m.name}: ${Lab.fmt.sci(Math.pow(N / 3, m.p))}`).join('<br>')}`, f.m.t * sy + 60), () => tip.hide(), true);
      out.innerHTML = M.map((m) => `<span>${m.name} in a day: <b>~${Math.round(maxN(m.p))} atoms</b></span>`).join('');
    }
    Lab.slider(Lab.$('#co-s', root), (v) => (v ? '10' + '⁰¹²³⁴⁵⁶⁷⁸⁹'[v] + '×' : '1×'), (v) => { st.speed = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();

  /* ---------- Fig 5.1 A Kohn–Sham atom ---------- */
  (function () {
    const root = Lab.$('#fig-ks');
    if (!root) return;
    const [svgA, svgB] = Lab.$$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svgA.parentElement);
    // Reference total energies (hartree): Hartree–Fock limit and exact nonrelativistic values for the ground states
    const HF = [-0.5, -2.86168, -7.43273, -14.57302, -24.52906, -37.68862, -54.40093, -74.80940, -99.40935, -128.54710, -161.85891, -199.61464, -241.87671, -288.85436, -340.71878, -397.50490, -459.48207, -526.81751];
    const EX = [-0.5, -2.90372, -7.47806, -14.66736, -24.65391, -37.8450, -54.5892, -75.0673, -99.7339, -128.9376, -162.2546, -200.0530, -242.3460, -289.3590, -341.2590, -398.1100, -460.1480, -527.5400];
    const cache = {};
    const st = { Z: 10 };
    let ready = false;
    const run = (Z) => { if (!cache[Z]) { const t = performance.now(); cache[Z] = CC.ksAtom(Z, { N: 1200 }); cache[Z].ms = performance.now() - t; } return cache[Z]; };
    function draw() {
      if (!ready) return;
      const A = run(st.Z), Z = st.Z;
      const rmax = 3.2;
      const f = CC.frame(svgA, { h: 320, m: { l: 44, r: 14, t: 30, b: 42 }, x: [0, rmax], y: [0, 1], xt: [0, 0.5, 1, 1.5, 2, 2.5, 3], yt: [], xl: 'distance from the nucleus (Å)', yl: 'Radial electron density 4πr²ρ(r)' });
      let mx = 0; const pts = [];
      for (let i = 0; i < A.r.length; i += 2) { const x = A.r[i] * BOHR; if (x > rmax) break; const v = 4 * Math.PI * A.r[i] * A.r[i] * A.rho[i]; pts.push([x, v]); mx = Math.max(mx, v); }
      const Y = (v) => f.Y(v / mx * 0.92);
      // shell contributions
      const cols = [f.pal.s1, f.pal.s2, f.pal.s3, f.pal.s1, f.pal.s2];
      A.orbs.forEach((o, k) => {
        const q = []; for (let i = 0; i < A.r.length; i += 2) { const x = A.r[i] * BOHR; if (x > rmax) break; q.push([x, o.f * o.u[i] * o.u[i]]); }
        Lab.svg('path', { d: q.map((p, i) => (i ? 'L' : 'M') + f.X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(''), fill: 'none', stroke: cols[k], 'stroke-width': 1.2, 'stroke-dasharray': k >= 3 ? '4 3' : '' }, f.g);
        let pk = q.reduce((a, b) => (b[1] > a[1] ? b : a));
        lbl(f.g, f.X(pk[0]) + 3, Y(pk[1]) - 5, o.n + 'spd'[o.l], f.pal.ink2, 'start', 10.5);
      });
      Lab.svg('path', { d: pts.map((p, i) => (i ? 'L' : 'M') + f.X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(''), fill: 'none', stroke: f.pal.ink, 'stroke-width': 2 }, f.g);
      lbl(f.g, f.W - f.m.r - 4, f.m.t + 4, 'black: total', f.pal.ink3, 'end', 10.5);
      CC.hover(svgA, f, 0, rmax, (x, sx, sy, px) => {
        const i = A.r.findIndex((r) => r * BOHR >= x); const v = 4 * Math.PI * A.r[i] * A.r[i] * A.rho[i] / BOHR;
        tip.show(px, Y(v * BOHR) * sy - 8, `<b>${x.toFixed(2)} Å</b><br>${v.toFixed(2)} electrons per Å`, Y(v * BOHR) * sy + 12);
      }, () => tip.hide());
      // orbital energy ladder
      const W = Math.max(220, svgB.clientWidth || 260), H = 320; svgB.setAttribute('viewBox', `0 0 ${W} ${H}`); svgB.setAttribute('height', H); svgB.innerHTML = '';
      const pal = Lab.palette(), g = Lab.svg('g', {}, svgB);
      const lo = Math.min(...A.orbs.map((o) => o.E)), LY = Lab.scale(Math.asinh(lo * 4), 0, H - 30, 30);
      const yv = (e) => LY(Math.asinh(e * 4));
      lbl(g, 8, 18, 'Kohn–Sham orbital energies', pal.ink2);
      Lab.svg('line', { x1: 8, x2: W - 8, y1: yv(0), y2: yv(0), stroke: pal.ink3, 'stroke-dasharray': '3 3' }, g);
      lbl(g, W - 8, yv(0) - 4, '0 (free electron)', pal.ink3, 'end', 10);
      A.orbs.forEach((o, k) => {
        const y = yv(o.E), x0 = 60 + (o.l ? 40 : 0), slots = o.l ? 3 : 1;
        for (let s = 0; s < slots; s++) Lab.svg('line', { x1: x0 + s * 24, x2: x0 + s * 24 + 18, y1: y, y2: y, stroke: cols[k], 'stroke-width': 3 }, g);
        lbl(g, 8, y + 4, o.n + 'spd'[o.l], pal.ink2);
        lbl(g, W - 8, y + 4, (o.E * HA).toFixed(1) + ' eV', pal.ink2, 'end', 10.5);
        lbl(g, x0 + slots * 24 + 2, y + 4, `×${o.f}`, pal.ink3, 'start', 10);
      });
      const E = A.E, hf = HF[Z - 1], ex = EX[Z - 1];
      out.innerHTML = `<span>${CC.ELEMENTS[Z - 1]}: LDA energy <b>${E.toFixed(3)} Ha</b></span><span>Hartree–Fock limit <b>${hf.toFixed(3)}</b></span><span>exact <b>${ex.toFixed(3)}</b></span><span>LDA error <b>${((E - ex) * 627.5).toFixed(0)} kcal/mol</b></span><span>correlation energy <b>${((ex - hf) * 627.5).toFixed(0)} kcal/mol</b></span><span>self-consistent in <b>${A.hist.length}</b> cycles, ${Math.round(A.ms)} ms</span>`;
    }
    Lab.slider(Lab.$('#ks-z', root), (v) => `${CC.ELEMENTS[v - 1]} (Z = ${v})`, (v) => { st.Z = v; draw(); });
    ready = true;
    Lab.whenVisible(root, () => { if (!cache[st.Z]) draw(); });
    draw();
    Lab.onTheme(draw); Lab.onResize(svgA, draw);
  })();
})();
