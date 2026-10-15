/* Chapters 8–12: convolution, vanishing gradients, ImageNet, word vectors. */

/* ---------- Fig 8.1 Convolution: kernel sliding over an image ---------- */
(function () {
  const root = Lab.$('#fig-conv');
  if (!root) return;
  const cvIn = Lab.$('#conv-in', root), cvOut = Lab.$('#conv-out', root), calc = Lab.$('.conv-calc', root), kGrid = Lab.$('.kernel', root);
  const N = 16;
  const SEVEN = [
    '................', '................', '..############..', '..############..', '...........###..', '..........###...',
    '.........###....', '........###.....', '.......###......', '......###.......', '......###.......', '.....###........',
    '.....###........', '.....###........', '................', '................',
  ];
  let img = SEVEN.map((r) => r.split('').map((c) => (c === '#' ? 1 : 0)));
  const KERNELS = {
    'Vertical edges': [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]],
    'Horizontal edges': [[-1, -2, -1], [0, 0, 0], [1, 2, 1]],
    'Blur': [[1 / 9, 1 / 9, 1 / 9], [1 / 9, 1 / 9, 1 / 9], [1 / 9, 1 / 9, 1 / 9]],
    'Sharpen': [[0, -1, 0], [-1, 5, -1], [0, -1, 0]],
    'Outline': [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]],
    'Identity': [[0, 0, 0], [0, 1, 0], [0, 0, 0]],
  };
  let K = KERNELS['Vertical edges'].map((r) => [...r]);
  let focus = [7, 5];
  const kIns = [];
  for (let i = 0; i < 9; i++) {
    const inp = Lab.el('input', { type: 'number', step: '0.5', id: 'conv-k' + i, 'aria-label': `Kernel row ${Math.floor(i / 3) + 1} column ${(i % 3) + 1}` });
    inp.addEventListener('input', () => { K[Math.floor(i / 3)][i % 3] = parseFloat(inp.value) || 0; draw(); });
    kIns.push(inp); kGrid.appendChild(inp);
  }
  const syncK = () => kIns.forEach((inp, i) => { const v = K[Math.floor(i / 3)][i % 3]; inp.value = Math.abs(v - 1 / 9) < 1e-6 ? '0.111' : v; });
  const sel = Lab.$('#conv-kernel', root);
  Object.keys(KERNELS).forEach((k) => sel.appendChild(Lab.el('option', { value: k }, k)));
  sel.addEventListener('change', () => { K = KERNELS[sel.value].map((r) => [...r]); syncK(); draw(); });
  syncK();

  const px = (i, j) => (i < 0 || j < 0 || i >= N || j >= N ? 0 : img[i][j]);
  const conv = (i, j) => { let s = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) s += K[a + 1][b + 1] * px(i + a, j + b); return s; };

  function draw() {
    const pal = Lab.palette();
    const P = Lab.rgb('--paper-3'), I = Lab.rgb('--ink'), A = Lab.rgb('--s1'), B = Lab.rgb('--s2');
    const a = Lab.canvas(cvIn), c = a.w / N;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      a.ctx.fillStyle = Lab.rgbStr(Lab.mix(P, I, img[i][j] * 0.9));
      a.ctx.fillRect(j * c, i * c, c, c);
    }
    a.ctx.strokeStyle = pal.grid; a.ctx.lineWidth = 1;
    for (let k = 0; k <= N; k++) { a.ctx.beginPath(); a.ctx.moveTo(k * c, 0); a.ctx.lineTo(k * c, a.h); a.ctx.moveTo(0, k * c); a.ctx.lineTo(a.w, k * c); a.ctx.stroke(); }
    a.ctx.strokeStyle = pal.signal; a.ctx.lineWidth = 2.5;
    a.ctx.strokeRect((focus[1] - 1) * c, (focus[0] - 1) * c, 3 * c, 3 * c);

    const o = Lab.canvas(cvOut), d = o.w / N;
    const out = []; let mx = 1e-6;
    for (let i = 0; i < N; i++) { out.push([]); for (let j = 0; j < N; j++) { const v = conv(i, j); out[i].push(v); mx = Math.max(mx, Math.abs(v)); } }
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const v = out[i][j] / mx;
      o.ctx.fillStyle = Lab.rgbStr(Lab.mix(P, v >= 0 ? A : B, Math.min(1, Math.abs(v)) * 0.95));
      o.ctx.fillRect(j * d, i * d, d, d);
    }
    o.ctx.strokeStyle = pal.grid;
    for (let k = 0; k <= N; k++) { o.ctx.beginPath(); o.ctx.moveTo(k * d, 0); o.ctx.lineTo(k * d, o.h); o.ctx.moveTo(0, k * d); o.ctx.lineTo(o.w, k * d); o.ctx.stroke(); }
    o.ctx.strokeStyle = pal.ink; o.ctx.lineWidth = 2.5; o.ctx.strokeRect(focus[1] * d, focus[0] * d, d, d);

    // Spell out the dot product for the focused cell.
    const terms = [];
    for (let a2 = -1; a2 <= 1; a2++) for (let b2 = -1; b2 <= 1; b2++) {
      const k = K[a2 + 1][b2 + 1]; if (k === 0) continue;
      terms.push(`${+k.toFixed(2)}·${px(focus[0] + a2, focus[1] + b2)}`);
    }
    calc.innerHTML = `output[${focus[0]}, ${focus[1]}] = ${terms.join(' + ').replace(/\+ -/g, '− ') || '0'} = <b>${+out[focus[0]][focus[1]].toFixed(2)}</b>`;
  }
  function cell(cv, ev) { const r = cv.getBoundingClientRect(); return [Math.max(0, Math.min(N - 1, Math.floor(((ev.clientY - r.top) / r.height) * N))), Math.max(0, Math.min(N - 1, Math.floor(((ev.clientX - r.left) / r.width) * N)))]; }
  let painting = null;
  cvIn.style.touchAction = 'none'; cvOut.style.touchAction = 'none';
  cvIn.addEventListener('pointerdown', (ev) => { const [i, j] = cell(cvIn, ev); painting = img[i][j] ? 0 : 1; img[i][j] = painting; focus = [i, j]; cvIn.setPointerCapture(ev.pointerId); draw(); });
  cvIn.addEventListener('pointermove', (ev) => { if (painting === null) return; const [i, j] = cell(cvIn, ev); img[i][j] = painting; focus = [i, j]; draw(); });
  cvIn.addEventListener('pointerup', () => { painting = null; });
  cvOut.addEventListener('pointermove', (ev) => { focus = cell(cvOut, ev); draw(); });
  cvOut.addEventListener('pointerdown', (ev) => { focus = cell(cvOut, ev); draw(); });
  Lab.$('#conv-clear', root).addEventListener('click', () => { img = img.map((r) => r.map(() => 0)); draw(); });
  Lab.$('#conv-seven', root).addEventListener('click', () => { img = SEVEN.map((r) => r.split('').map((c) => (c === '#' ? 1 : 0))); draw(); });
  draw();
  Lab.onTheme(draw); Lab.onResize(cvIn, draw);
})();

/* ---------- Fig 10.1 Vanishing gradients through time ---------- */
(function () {
  const root = Lab.$('#fig-vanish');
  if (!root) return;
  const wrap = Lab.$('.chart-wrap', root), svg = Lab.$('svg', root), tip = Lab.tip(wrap);
  const st = { w: 0.9, d: 0.65, f: 0.97 };
  const T = 60, W = 640, H = 300, m = { l: 64, r: 120, t: 16, b: 40 };
  const x = Lab.scale(0, T, m.l, W - m.r), y = Lab.logScale(1e-12, 1e3, H - m.b, m.t);
  const series = () => [
    { name: 'Simple RNN', color: '--s1', f: (t) => (st.w * st.d) ** t },
    { name: 'LSTM cell path', color: '--s2', f: (t) => st.f ** t },
  ];
  function draw() {
    const pal = Lab.palette();
    svg.innerHTML = '';
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    [1e-12, 1e-9, 1e-6, 1e-3, 1, 1e3].forEach((v) => {
      Lab.svg('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), stroke: pal.grid, 'stroke-width': 1 }, svg);
      const t = Lab.svg('text', { x: m.l - 8, y: y(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: pal.ink3 }, svg);
      t.textContent = v === 1 ? '1' : '10' + String(Math.log10(v)).replace('-', '⁻').replace(/\d/g, (c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]);
    });
    [0, 10, 20, 30, 40, 50, 60].forEach((v) => {
      const t = Lab.svg('text', { x: x(v), y: H - m.b + 18, 'text-anchor': 'middle', 'font-size': 11, fill: pal.ink3 }, svg);
      t.textContent = v;
    });
    const xl = Lab.svg('text', { x: (m.l + W - m.r) / 2, y: H - 6, 'text-anchor': 'middle', 'font-size': 11, fill: pal.ink3 }, svg);
    xl.textContent = 'time steps back from the loss';
    Lab.svg('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, stroke: pal.ink3 }, svg);
    series().forEach((s) => {
      let d = '', last = null;
      for (let t = 0; t <= T; t++) {
        const v = Math.max(1e-12, Math.min(1e3, s.f(t)));
        d += (t ? 'L' : 'M') + x(t).toFixed(1) + ' ' + y(v).toFixed(1);
        last = [x(t), y(v), s.f(t)];
      }
      Lab.svg('path', { d, fill: 'none', stroke: pal[s.color === '--s1' ? 's1' : 's2'], 'stroke-width': 2 }, svg);
      Lab.svg('circle', { cx: last[0], cy: last[1], r: 4, fill: pal[s.color === '--s1' ? 's1' : 's2'] }, svg);
      const lb = Lab.svg('text', { x: last[0] + 8, y: last[1] + 4, 'font-size': 11.5, fill: pal.ink2 }, svg);
      lb.textContent = s.name;
    });
    // Hover layer
    const cross = Lab.svg('line', { y1: m.t, y2: H - m.b, stroke: pal.ink3, 'stroke-dasharray': '3 3', opacity: 0 }, svg);
    const hit = Lab.svg('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: 'transparent' }, svg);
    hit.addEventListener('pointermove', (ev) => {
      const r = svg.getBoundingClientRect();
      const sx = ((ev.clientX - r.left) / r.width) * W;
      const t = Math.max(0, Math.min(T, Math.round(((sx - m.l) / (W - m.l - m.r)) * T)));
      cross.setAttribute('x1', x(t)); cross.setAttribute('x2', x(t)); cross.setAttribute('opacity', 1);
      const [a, b] = series().map((s) => s.f(t));
      tip.show((x(t) / W) * r.width, (m.t / H) * r.height + 8, `t = ${t}<br>RNN ${a.toExponential(1)}<br>LSTM ${b.toExponential(1)}`);
    });
    hit.addEventListener('pointerleave', () => { cross.setAttribute('opacity', 0); tip.hide(); });
  }
  Lab.slider(Lab.$('#vg-w', root), Lab.fmt.fixed(2), (v) => { st.w = v; draw(); });
  Lab.slider(Lab.$('#vg-f', root), Lab.fmt.fixed(3), (v) => { st.f = v; draw(); });
  Lab.$('#vg-act', root).addEventListener('change', (e) => { st.d = parseFloat(e.target.value); draw(); });
  draw();
  Lab.onTheme(draw);
})();

/* ---------- Fig 11.1 ImageNet top-5 error ---------- */
(function () {
  const root = Lab.$('#fig-imagenet');
  if (!root) return;
  const wrap = Lab.$('.chart-wrap', root), svg = Lab.$('svg', root), tip = Lab.tip(wrap);
  const D = [
    { y: 2010, v: 28.2, n: 'NEC-UIUC', k: 'Hand-engineered features + SVM' },
    { y: 2011, v: 25.8, n: 'XRCE', k: 'Fisher vectors + SVM' },
    { y: 2012, v: 15.3, n: 'AlexNet', k: '8-layer CNN on two GPUs', hi: true },
    { y: 2013, v: 11.7, n: 'Clarifai', k: 'Refined CNN (ZFNet lineage)' },
    { y: 2014, v: 6.7, n: 'GoogLeNet', k: '22-layer Inception network' },
    { y: 2015, v: 3.57, n: 'ResNet', k: '152 layers with residual connections' },
    { y: 2016, v: 2.99, n: 'Trimps-Soushen', k: 'Ensemble of deep CNNs' },
    { y: 2017, v: 2.25, n: 'SENet', k: 'Squeeze-and-excitation blocks' },
  ];
  const W = 640, H = 300, m = { l: 44, r: 16, t: 20, b: 40 };
  const bw = (W - m.l - m.r) / D.length;
  const y = Lab.scale(0, 30, H - m.b, m.t);
  function draw() {
    const pal = Lab.palette();
    svg.innerHTML = ''; svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    [0, 10, 20, 30].forEach((v) => {
      Lab.svg('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), stroke: v ? pal.grid : pal.ink3 }, svg);
      const t = Lab.svg('text', { x: m.l - 8, y: y(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: pal.ink3 }, svg);
      t.textContent = v + '%';
    });
    D.forEach((d, i) => {
      const x0 = m.l + i * bw + bw * 0.22, w = bw * 0.56, top = y(d.v), base = y(0);
      const r = 4;
      Lab.svg('path', { d: `M${x0} ${base} V${top + r} Q${x0} ${top} ${x0 + r} ${top} H${x0 + w - r} Q${x0 + w} ${top} ${x0 + w} ${top + r} V${base} Z`, fill: d.hi ? pal.s1 : pal.rule }, svg);
      const t = Lab.svg('text', { x: x0 + w / 2, y: H - m.b + 18, 'text-anchor': 'middle', 'font-size': 11, fill: pal.ink3 }, svg);
      t.textContent = d.y;
      if (d.hi || i === 0 || i === D.length - 1 || d.n === 'ResNet') {
        const v = Lab.svg('text', { x: x0 + w / 2, y: top - 8, 'text-anchor': 'middle', 'font-size': 11.5, fill: pal.ink }, svg);
        v.textContent = d.v + '%';
      }
      const hit = Lab.svg('rect', { x: m.l + i * bw, y: m.t, width: bw, height: H - m.t - m.b, fill: 'transparent' }, svg);
      hit.addEventListener('pointermove', () => {
        const r = svg.getBoundingClientRect();
        tip.show(((x0 + w / 2) / W) * r.width, (top / H) * r.height, `${d.y} · ${d.n}<br>${d.v}% top-5 error<br>${d.k}`);
      });
      hit.addEventListener('pointerleave', () => tip.hide());
    });
    // Human reference (one annotator's estimate, Russakovsky et al. 2015)
    Lab.svg('line', { x1: m.l, x2: W - m.r, y1: y(5.1), y2: y(5.1), stroke: pal.signal, 'stroke-dasharray': '5 4', 'stroke-width': 1.5 }, svg);
    const hl = Lab.svg('text', { x: W - m.r, y: y(5.1) - 6, 'text-anchor': 'end', 'font-size': 11, fill: pal.ink2 }, svg);
    hl.textContent = 'one trained human ≈ 5.1%';
    const an = Lab.svg('text', { x: m.l + 2 * bw + bw * 0.78 + 6, y: y(15.3) + 4, 'font-size': 11, fill: pal.ink2 }, svg);
    an.textContent = '← first deep CNN';
  }
  draw();
  Lab.onTheme(draw);
})();

/* ---------- Fig 12.1 Word vectors: analogies as arithmetic ---------- */
(function () {
  const root = Lab.$('#fig-embed');
  if (!root) return;
  const svg = Lab.$('svg', root), ro = Lab.$('.readouts', root);
  // A hand-built 2-D illustration. Real embeddings have hundreds of dimensions.
  const g = [0.35, 1.5];   // "female" direction
  const roy = [3.1, 0.5];  // "royal" direction
  const cap = [1.3, -2.2]; // country → capital
  const ing = [0.9, 1.1];  // verb → -ing form
  const V = {};
  const put = (w, p, off = [0, 0]) => { V[w] = [p[0] + off[0], p[1] + off[1]]; };
  const jit = (k) => [((k * 37) % 7) / 40 - 0.08, ((k * 53) % 5) / 40 - 0.05];
  put('man', [-4.4, 1.1]); put('woman', V.man, g);
  put('boy', [-5.4, 0.3]); put('girl', V.boy, g);
  put('king', V.man, roy); V.king = [V.king[0] + jit(1)[0], V.king[1] + jit(1)[1]];
  put('queen', V.king, g); V.queen = [V.queen[0] + jit(2)[0], V.queen[1] + jit(2)[1]];
  put('prince', V.boy, roy); put('princess', V.prince, g);
  put('france', [1.4, 3.7]); put('paris', V.france, cap);
  put('italy', [2.7, 3.0]); put('rome', V.italy, cap); V.rome = [V.rome[0] + jit(3)[0], V.rome[1] + jit(3)[1]];
  put('japan', [4.0, 4.2]); put('tokyo', V.japan, cap);
  put('walk', [-1.6, -3.2]); put('walking', V.walk, ing);
  put('swim', [-0.2, -3.9]); put('swimming', V.swim, ing); V.swimming = [V.swimming[0] + jit(4)[0], V.swimming[1] + jit(4)[1]];
  put('run', [-2.9, -3.8]); put('running', V.run, ing);
  const Q = {
    'king − man + woman': ['king', 'man', 'woman'],
    'paris − france + italy': ['paris', 'france', 'italy'],
    'walking − walk + swim': ['walking', 'walk', 'swim'],
    'princess − girl + boy': ['princess', 'girl', 'boy'],
    'tokyo − japan + france': ['tokyo', 'japan', 'france'],
  };
  const sel = Lab.$('#emb-q', root);
  Object.keys(Q).forEach((k) => sel.appendChild(Lab.el('option', { value: k }, k)));
  const W = 640, H = 420, x = Lab.scale(-6.5, 6.5, 20, W - 20), y = Lab.scale(-6.5, 5.2, H - 16, 16);
  function draw() {
    const pal = Lab.palette();
    const [a, b, c] = Q[sel.value];
    const r = [V[a][0] - V[b][0] + V[c][0], V[a][1] - V[b][1] + V[c][1]];
    const ranked = Object.keys(V).filter((w) => ![a, b, c].includes(w)).map((w) => [w, Math.hypot(V[w][0] - r[0], V[w][1] - r[1])]).sort((p, q) => p[1] - q[1]);
    const ans = ranked[0][0];
    svg.innerHTML = ''; svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const defs = Lab.svg('defs', {}, svg);
    const mk = (id, col) => { const mm = Lab.svg('marker', { id, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs); Lab.svg('path', { d: 'M0 0 L10 5 L0 10 z', fill: col }, mm); };
    mk('arrA', pal.s1); mk('arrB', pal.s2);
    Lab.svg('line', { x1: x(0), x2: x(0), y1: 10, y2: H - 10, stroke: pal.grid }, svg);
    Lab.svg('line', { x1: 10, x2: W - 10, y1: y(0), y2: y(0), stroke: pal.grid }, svg);
    // b → a (the relation), then c → result (same relation, transplanted)
    const arrow = (p, q, col, id) => Lab.svg('line', { x1: x(p[0]), y1: y(p[1]), x2: x(q[0]), y2: y(q[1]), stroke: col, 'stroke-width': 2, 'marker-end': `url(#${id})` }, svg);
    arrow(V[b], V[a], pal.s1, 'arrA');
    arrow(V[c], r, pal.s2, 'arrB');
    Object.entries(V).forEach(([w, p]) => {
      const on = [a, b, c].includes(w), isAns = w === ans;
      Lab.svg('circle', { cx: x(p[0]), cy: y(p[1]), r: on || isAns ? 5 : 3.5, fill: isAns ? pal.s2 : on ? pal.ink : pal.ink3 }, svg);
      const t = Lab.svg('text', { x: x(p[0]) + 8, y: y(p[1]) + 4, 'font-size': on || isAns ? 13 : 11.5, fill: on || isAns ? pal.ink : pal.ink3, 'font-weight': isAns ? 600 : 400 }, svg);
      t.textContent = w;
    });
    Lab.svg('circle', { cx: x(r[0]), cy: y(r[1]), r: 9, fill: 'none', stroke: pal.s2, 'stroke-width': 1.5, 'stroke-dasharray': '3 2' }, svg);
    ro.innerHTML = `<span>${a} − ${b} + ${c} lands at (${r[0].toFixed(2)}, ${r[1].toFixed(2)})</span><span>nearest word: <b>${ans}</b> (distance ${ranked[0][1].toFixed(2)})</span><span>runner-up: ${ranked[1][0]} (${ranked[1][1].toFixed(2)})</span>`;
  }
  sel.addEventListener('change', draw);
  draw();
  Lab.onTheme(draw);
})();
