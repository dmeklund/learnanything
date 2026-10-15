/* Chapter 6: the computation graph, gradient descent and optimizers.
   Chapter 7: the network playground. */

/* ---------- Fig 6.1 Backprop through a single neuron ---------- */
(function () {
  const root = Lab.$('#fig-graph');
  if (!root) return;
  const svg = Lab.$('svg', root), ro = Lab.$('.readouts', root);
  const s = { x1: 1.0, x2: -0.5, w1: 0.8, w2: 0.4, b: -0.2, y: 1 };
  const hist = [];
  const ids = ['x1', 'x2', 'w1', 'w2', 'b', 'y'];
  const inputs = Object.fromEntries(ids.map((k) => [k, Lab.$('#g-' + k, root)]));
  const etaGet = Lab.slider(Lab.$('#g-eta', root), Lab.fmt.fixed(2));

  function compute() {
    const m1 = s.w1 * s.x1, m2 = s.w2 * s.x2, z = m1 + m2 + s.b;
    const a = 1 / (1 + Math.exp(-z)), L = 0.5 * (a - s.y) ** 2;
    // Backward pass: each local derivative times the gradient flowing in from above.
    const dL_da = a - s.y, da_dz = a * (1 - a), dL_dz = dL_da * da_dz;
    return {
      fwd: { m1, m2, z, a, L },
      grad: { L: 1, a: dL_da, z: dL_dz, m1: dL_dz, m2: dL_dz, b: dL_dz, w1: dL_dz * s.x1, w2: dL_dz * s.x2, x1: dL_dz * s.w1, x2: dL_dz * s.w2 },
      local: { da_dz },
    };
  }
  const NODES = [
    { id: 'x1', x: 60, y: 50, label: 'x₁', leaf: true }, { id: 'w1', x: 60, y: 130, label: 'w₁', leaf: true, param: true },
    { id: 'x2', x: 60, y: 230, label: 'x₂', leaf: true }, { id: 'w2', x: 60, y: 310, label: 'w₂', leaf: true, param: true },
    { id: 'm1', x: 230, y: 90, label: '×' }, { id: 'm2', x: 230, y: 270, label: '×' },
    { id: 'b', x: 230, y: 180, label: 'b', leaf: true, param: true },
    { id: 'z', x: 400, y: 180, label: '+' }, { id: 'a', x: 560, y: 180, label: 'σ' },
    { id: 'L', x: 740, y: 180, label: '½(a−y)²' }, { id: 'y', x: 740, y: 300, label: 'y', leaf: true },
  ];
  const EDGES = [['x1', 'm1'], ['w1', 'm1'], ['x2', 'm2'], ['w2', 'm2'], ['m1', 'z'], ['m2', 'z'], ['b', 'z'], ['z', 'a'], ['a', 'L'], ['y', 'L']];
  const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));

  function render() {
    const pal = Lab.palette();
    const { fwd, grad } = compute();
    const val = (id) => (id in fwd ? fwd[id] : s[id]);
    svg.innerHTML = '';
    EDGES.forEach(([a, b]) => {
      const A = byId[a], B = byId[b];
      Lab.svg('line', { x1: A.x + 34, y1: A.y, x2: B.x - 36, y2: B.y, stroke: pal.rule, 'stroke-width': 1.5 }, svg);
      Lab.svg('path', { d: `M${B.x - 36} ${B.y} l-8 -4 l0 8 z`, fill: pal.rule, transform: `rotate(${(Math.atan2(B.y - A.y, B.x - 36 - A.x - 34) * 180) / Math.PI} ${B.x - 36} ${B.y})` }, svg);
    });
    NODES.forEach((n) => {
      const g = Lab.svg('g', {}, svg);
      const wide = n.id === 'L' ? 56 : 34;
      Lab.svg('rect', { x: n.x - wide, y: n.y - 26, width: wide * 2, height: 52, rx: n.leaf ? 26 : 3, fill: pal.paper3, stroke: n.param ? pal.accent : pal.ink3, 'stroke-width': n.param ? 2 : 1.2 }, g);
      const t = Lab.svg('text', { x: n.x, y: n.y - 6, 'text-anchor': 'middle', 'font-size': 14, fill: pal.ink }, g);
      t.textContent = n.label;
      const v = Lab.svg('text', { x: n.x, y: n.y + 14, 'text-anchor': 'middle', 'font-size': 12.5, fill: pal.ink2 }, g);
      v.textContent = val(n.id).toFixed(3);
      if (n.id !== 'y') {
        const gr = Lab.svg('text', { x: n.x, y: n.y + 44, 'text-anchor': 'middle', 'font-size': 12, fill: pal.signal }, g);
        gr.textContent = '∂L = ' + (grad[n.id] ?? 0).toFixed(3);
      }
    });
    const lg = Lab.svg('text', { x: 400, y: 330, 'text-anchor': 'middle', 'font-size': 12, fill: pal.ink3 }, svg);
    lg.textContent = 'top: forward value · bottom (amber): gradient ∂L/∂node from the backward pass';
    ro.innerHTML = `<span>loss <b>${fwd.L.toFixed(4)}</b></span><span>∂L/∂w₁ <b>${grad.w1.toFixed(4)}</b></span><span>∂L/∂w₂ <b>${grad.w2.toFixed(4)}</b></span><span>∂L/∂b <b>${grad.b.toFixed(4)}</b></span><span>steps taken <b>${hist.length}</b></span>`;
  }
  Lab.$('#g-step', root).addEventListener('click', () => {
    const { grad } = compute(), eta = etaGet();
    hist.push(1);
    [['w1', grad.w1], ['w2', grad.w2], ['b', grad.b]].forEach(([k, g]) => {
      s[k] = Math.max(-3, Math.min(3, s[k] - eta * g));
      inputs[k].value = s[k];
      inputs[k].closest('.ctl').querySelector('output').textContent = s[k].toFixed(2);
    });
    render();
  });
  ids.forEach((k) => Lab.slider(inputs[k], Lab.fmt.fixed(2), (v) => { s[k] = v; render(); }));
  Lab.onTheme(render);
})();

/* ---------- Fig 6.2 Optimizers on a loss surface ---------- */
(function () {
  const root = Lab.$('#fig-descent');
  if (!root) return;
  const cv = Lab.$('canvas', root), ro = Lab.$('.opt-table tbody', root);
  const SURF = {
    ravine: { name: 'Ravine', f: (x, y) => 0.5 * (0.2 * x * x + 4 * y * y), g: (x, y) => [0.2 * x, 4 * y], lr: 0.22, min: [0, 0], start: [-1.8, 0.9], fmin: 0 },
    bowl: { name: 'Round bowl', f: (x, y) => 0.5 * (x * x + y * y), g: (x, y) => [x, y], lr: 0.1, min: [0, 0], start: [-1.6, 1.4], fmin: 0 },
    valleys: { name: 'Two valleys', f: (x, y) => (x * x - 1) ** 2 + 0.5 * y * y + 0.3 * x, g: (x, y) => [4 * x * (x * x - 1) + 0.3, y], lr: 0.05, start: [1.7, 1.6], fmin: -0.3 - 0.0225 },
    rosen: { name: 'Rosenbrock', f: (x, y) => (1 - x) ** 2 + 10 * (y - x * x) ** 2, g: (x, y) => [-2 * (1 - x) - 40 * x * (y - x * x), 20 * (y - x * x)], lr: 0.008, start: [-1.5, 1.8], fmin: 0 },
  };
  let surf = SURF.ravine, start = [...surf.start], paths = null, frame = 0, anim = null;
  const lrIn = Lab.$('#gd-lr', root);
  // Log-scale learning-rate slider: value is log10(lr).
  let ready = false;
  const lrGet = Lab.slider(lrIn, (v) => (10 ** v).toPrecision(2), () => { if (ready) restart(); });
  const OPT = [
    { key: 'sgd', name: 'Gradient descent', color: '--s1' },
    { key: 'mom', name: 'Momentum (β = 0.9)', color: '--s2' },
    { key: 'adam', name: 'Adam', color: '--s3' },
  ];
  function simulate() {
    const lr = 10 ** lrGet();
    const N = 160;
    return OPT.map((o) => {
      let [x, y] = start; const pts = [[x, y]];
      let v = [0, 0], m = [0, 0], s2 = [0, 0];
      for (let t = 1; t <= N; t++) {
        const g = surf.g(x, y);
        if (o.key === 'sgd') { x -= lr * g[0]; y -= lr * g[1]; }
        else if (o.key === 'mom') { v = [0.9 * v[0] - lr * g[0], 0.9 * v[1] - lr * g[1]]; x += v[0]; y += v[1]; }
        else {
          m = [0.9 * m[0] + 0.1 * g[0], 0.9 * m[1] + 0.1 * g[1]];
          s2 = [0.999 * s2[0] + 0.001 * g[0] ** 2, 0.999 * s2[1] + 0.001 * g[1] ** 2];
          const mh = [m[0] / (1 - 0.9 ** t), m[1] / (1 - 0.9 ** t)], sh = [s2[0] / (1 - 0.999 ** t), s2[1] / (1 - 0.999 ** t)];
          x -= (lr * mh[0]) / (Math.sqrt(sh[0]) + 1e-8); y -= (lr * mh[1]) / (Math.sqrt(sh[1]) + 1e-8);
        }
        if (!isFinite(x) || !isFinite(y) || Math.abs(x) > 50 || Math.abs(y) > 50) { pts.diverged = true; break; }
        pts.push([x, y]);
      }
      return pts;
    });
  }
  let field = null;
  function buildField() {
    const res = 160, P = Lab.rgb('--paper-3'), A = Lab.rgb('--accent'), I = Lab.rgb('--ink');
    const off = document.createElement('canvas'); off.width = res; off.height = res;
    const c = off.getContext('2d'), img = c.createImageData(res, res);
    let lo = Infinity, hi = -Infinity;
    const vals = new Float64Array(res * res);
    for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) {
      const x = -2 + (4 * (i + 0.5)) / res, y = 2 - (4 * (j + 0.5)) / res;
      const v = Math.log(surf.f(x, y) - surf.fmin + 0.02);
      vals[j * res + i] = v; lo = Math.min(lo, v); hi = Math.max(hi, v);
    }
    for (let k = 0; k < vals.length; k++) {
      const t = (vals[k] - lo) / (hi - lo);
      const band = (t * 14) % 1;
      let col = Lab.mix(A, P, 0.55 + 0.45 * t); // low loss = deeper cobalt
      if (band < 0.07) col = Lab.mix(col, I, 0.22); // contour line
      img.data.set([col[0], col[1], col[2], 255], k * 4);
    }
    c.putImageData(img, 0, 0);
    field = off;
  }
  function draw() {
    const { ctx, w, h } = Lab.canvas(cv);
    const pal = Lab.palette();
    if (!field) buildField();
    ctx.imageSmoothingEnabled = true; ctx.drawImage(field, 0, 0, w, h);
    const X = (x) => ((x + 2) / 4) * w, Y = (y) => ((2 - y) / 4) * h;
    if (surf.min) { ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.5; const [mx, my] = surf.min; ctx.beginPath(); ctx.moveTo(X(mx) - 6, Y(my)); ctx.lineTo(X(mx) + 6, Y(my)); ctx.moveTo(X(mx), Y(my) - 6); ctx.lineTo(X(mx), Y(my) + 6); ctx.stroke(); }
    if (!paths) return;
    paths.forEach((pts, k) => {
      const col = Lab.css(OPT[k].color), n = Math.min(frame, pts.length - 1);
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i <= n; i++) { const [x, y] = pts[i]; const cx = Math.max(-5, Math.min(w + 5, X(x))), cy = Math.max(-5, Math.min(h + 5, Y(y))); i ? ctx.lineTo(cx, cy) : ctx.moveTo(cx, cy); }
      ctx.stroke();
      const [x, y] = pts[n];
      ctx.beginPath(); ctx.arc(X(x), Y(y), 5, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = pal.paper3; ctx.stroke();
    });
    ctx.beginPath(); ctx.arc(X(start[0]), Y(start[1]), 6, 0, Math.PI * 2); ctx.fillStyle = pal.ink; ctx.fill();
    ro.innerHTML = paths.map((pts, k) => {
      const n = Math.min(frame, pts.length - 1), [x, y] = pts[n];
      const L = surf.f(x, y);
      const status = pts.diverged && frame >= pts.length - 1 ? 'diverged' : L.toFixed(4);
      return `<tr><td><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(${OPT[k].color});margin-right:8px"></i>${OPT[k].name}</td><td>${n}</td><td>${status}</td></tr>`;
    }).join('');
  }
  function restart() {
    if (anim) cancelAnimationFrame(anim);
    paths = simulate(); frame = Lab.reducedMotion ? 160 : 0;
    const loop = () => { frame += 2; draw(); if (frame < 160) anim = requestAnimationFrame(loop); };
    if (Lab.reducedMotion) draw(); else anim = requestAnimationFrame(loop);
  }
  cv.addEventListener('click', (ev) => {
    const r = cv.getBoundingClientRect();
    start = [((ev.clientX - r.left) / r.width) * 4 - 2, 2 - ((ev.clientY - r.top) / r.height) * 4];
    restart();
  });
  Lab.$('#gd-surface', root).addEventListener('change', (e) => {
    surf = SURF[e.target.value]; start = [...surf.start]; field = null;
    lrIn.value = Math.log10(surf.lr); lrIn.dispatchEvent(new Event('input'));
  });
  Lab.$('#gd-replay', root).addEventListener('click', restart);
  ready = true;
  lrIn.value = Math.log10(surf.lr); lrIn.dispatchEvent(new Event('input'));
  Lab.onTheme(() => { field = null; draw(); }); Lab.onResize(cv, draw);
})();

/* ---------- Fig 7.1 Network playground ---------- */
(function () {
  const root = Lab.$('#fig-playground');
  if (!root) return;
  const cv = Lab.$('#pg-canvas', root), lossCv = Lab.$('#pg-loss', root), neurons = Lab.$('.pg-neurons', root), ro = Lab.$('.readouts', root);
  const st = { data: 'circle', layers: 2, width: 6, act: 'tanh', lr: 0.08, feats: false, noise: 0.05 };
  let net, pts, X, Y, epoch = 0, loss = NaN, hist = [], running = false, visible = false;

  const feat = (x, y) => (st.feats ? [x * 2, y * 2, 4 * x * x, 4 * y * y, 4 * x * y] : [x * 2, y * 2]);
  function reset() {
    pts = NN.DATA[st.data](200, Lab.rng(st.data.length * 13 + 5), st.noise);
    X = pts.map((p) => feat(p.x, p.y)); Y = pts.map((p) => p.c);
    const sizes = [X[0].length, ...Array(st.layers).fill(st.width), 1];
    net = new NN.MLP(sizes, st.act, Lab.rng(42));
    epoch = 0; loss = NaN; hist = [];
    buildNeurons(); draw();
  }
  function buildNeurons() {
    neurons.innerHTML = '';
    for (let j = 0; j < st.width; j++) {
      const c = Lab.el('canvas', { width: 64, height: 64, 'aria-label': `Hidden neuron ${j + 1}, layer 1` });
      neurons.appendChild(c);
    }
  }
  function drawNeurons() {
    const cs = Lab.$$('canvas', neurons);
    const nIn = net.sizes[0];
    cs.forEach((c, j) => {
      const ctx = c.getContext('2d');
      const f = (x, y) => {
        const a = feat(x, y);
        let s = net.b[0][j];
        for (let i = 0; i < nIn; i++) s += net.W[0][j * nIn + i] * a[i];
        const v = NN.ACT[st.act].f(s);
        return st.act === 'tanh' ? (v + 1) / 2 : st.act === 'relu' ? Math.min(1, 0.5 + v / 4) : v;
      };
      NN.paintField(ctx, 0, 0, 64, 64, f, 24);
    });
  }
  function drawLoss() {
    const { ctx, w, h } = Lab.canvas(lossCv);
    const pal = Lab.palette();
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = pal.paper3; ctx.fillRect(0, 0, w, h);
    if (hist.length < 2) return;
    const max = Math.max(0.75, ...hist);
    const X = (i) => 4 + (i / (hist.length - 1)) * (w - 8), Yy = (v) => h - 4 - (v / max) * (h - 12);
    ctx.beginPath(); hist.forEach((v, i) => (i ? ctx.lineTo(X(i), Yy(v)) : ctx.moveTo(X(i), Yy(v))));
    ctx.lineTo(X(hist.length - 1), h); ctx.lineTo(X(0), h); ctx.closePath();
    ctx.fillStyle = Lab.rgbStr(Lab.rgb('--accent'), 0.12); ctx.fill();
    ctx.beginPath(); hist.forEach((v, i) => (i ? ctx.lineTo(X(i), Yy(v)) : ctx.moveTo(X(i), Yy(v))));
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.stroke();
    const lx = X(hist.length - 1), ly = Yy(hist[hist.length - 1]);
    ctx.beginPath(); ctx.arc(lx, ly, 3.5, 0, Math.PI * 2); ctx.fillStyle = pal.accent; ctx.fill();
  }
  function draw() {
    const { ctx, w, h } = Lab.canvas(cv);
    NN.paintField(ctx, 0, 0, w, h, (x, y) => net.predict(feat(x, y)), 64);
    NN.drawPoints(ctx, pts, (x) => ((x + 1) / 2) * w, (y) => ((1 - y) / 2) * h, 3.4);
    drawNeurons(); drawLoss();
    const acc = pts.filter((p, i) => (net.predict(X[i]) > 0.5 ? 1 : 0) === p.c).length / pts.length;
    ro.innerHTML = `<span>epoch <b>${epoch}</b></span><span>loss <b>${isNaN(loss) ? '—' : loss.toFixed(3)}</b></span><span>accuracy <b>${(acc * 100).toFixed(0)}%</b></span><span>parameters <b>${net.paramCount}</b></span>`;
  }
  function tick() {
    if (!running || !visible) return;
    for (let k = 0; k < 3; k++) { loss = net.step(X, Y, st.lr, 0.9); epoch++; }
    if (epoch % 6 === 0) { hist.push(loss); if (hist.length > 400) hist = hist.filter((_, i) => i % 2 === 0); }
    draw();
    requestAnimationFrame(tick);
  }
  const playBtn = Lab.$('#pg-play', root);
  function setRunning(on) {
    running = on; playBtn.textContent = on ? 'Pause' : 'Train'; playBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on) requestAnimationFrame(tick);
  }
  playBtn.addEventListener('click', () => setRunning(!running));
  Lab.$('#pg-step', root).addEventListener('click', () => { setRunning(false); for (let k = 0; k < 30; k++) { loss = net.step(X, Y, st.lr, 0.9); epoch++; } hist.push(loss); draw(); });
  Lab.$('#pg-reset', root).addEventListener('click', () => { reset(); });
  Lab.$$('[data-set]', root).forEach((b) => b.addEventListener('click', () => {
    st.data = b.dataset.set;
    Lab.$$('[data-set]', root).forEach((o) => o.setAttribute('aria-pressed', o === b ? 'true' : 'false'));
    reset();
  }));
  Lab.slider(Lab.$('#pg-layers', root), (v) => v, (v) => { if (st.layers !== v) { st.layers = v; if (net) reset(); } });
  Lab.slider(Lab.$('#pg-width', root), (v) => v, (v) => { if (st.width !== v) { st.width = v; if (net) reset(); } });
  Lab.slider(Lab.$('#pg-lr', root), Lab.fmt.fixed(2), (v) => { st.lr = v; });
  Lab.$('#pg-act', root).addEventListener('change', (e) => { st.act = e.target.value; reset(); });
  Lab.$('#pg-feats', root).addEventListener('change', (e) => { st.feats = e.target.checked; reset(); });
  reset();
  Lab.whenVisible(cv, () => { visible = true; if (running) requestAnimationFrame(tick); }, () => { visible = false; });
  Lab.onTheme(draw); Lab.onResize(cv, draw);
})();
