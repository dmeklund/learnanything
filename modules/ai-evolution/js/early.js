/* Chapters 1, 3, 4: the threshold neuron, the perceptron, and XOR. */

/* ---------- Fig 1.1 McCulloch–Pitts threshold unit ---------- */
(function () {
  const root = Lab.$('#fig-mcp');
  if (!root) return;
  const NAMES = {
    '0000': 'FALSE', '0001': 'AND', '0010': 'x₁ AND NOT x₂', '0011': 'x₁',
    '0100': 'x₂ AND NOT x₁', '0101': 'x₂', '0110': 'XOR', '0111': 'OR',
    '1000': 'NOR', '1001': 'XNOR', '1010': 'NOT x₂', '1011': 'x₁ OR NOT x₂',
    '1100': 'NOT x₁', '1101': 'NOT x₁ OR x₂', '1110': 'NAND', '1111': 'TRUE',
  };
  const found = new Set();
  const s = { w1: 1, w2: 1, th: 1.5, x1: 1, x2: 0 };
  const svg = Lab.$('svg', root), table = Lab.$('.tt tbody', root), fnEl = Lab.$('.fn-name', root), grid = Lab.$('.fn-grid', root), countEl = Lab.$('.fn-count', root);
  Object.keys(NAMES).forEach((k) => {
    const d = Lab.el('div', { class: 'chip', 'data-k': k, title: k.split('').join(' ') }, NAMES[k]);
    grid.appendChild(d);
  });
  const out = (x1, x2) => (s.w1 * x1 + s.w2 * x2 >= s.th ? 1 : 0);

  function drawSvg() {
    const pal = Lab.palette();
    svg.innerHTML = '';
    const sum = s.w1 * s.x1 + s.w2 * s.x2, y = sum >= s.th ? 1 : 0;
    const edge = (x1, y1, w, x) => {
      const col = w >= 0 ? pal.s1 : pal.s2;
      Lab.svg('line', { x1, y1, x2: 300, y2: 110, stroke: col, 'stroke-width': 1 + Math.abs(w) * 2.2, 'stroke-dasharray': w < 0 ? '6 4' : 'none', opacity: x ? 1 : 0.35 }, svg);
      const lx = (x1 + 300) / 2, ly = (y1 + 110) / 2 - 10;
      const t = Lab.svg('text', { x: lx, y: ly, 'text-anchor': 'middle', 'font-size': 13, fill: pal.ink2 }, svg);
      t.textContent = 'w = ' + w.toFixed(1);
    };
    edge(90, 50, s.w1, s.x1); edge(90, 170, s.w2, s.x2);
    [[90, 50, s.x1, 'x₁'], [90, 170, s.x2, 'x₂']].forEach(([cx, cy, v, n]) => {
      const g = Lab.svg('g', { style: 'cursor:pointer', tabindex: 0, role: 'button', 'aria-label': `Toggle ${n}` }, svg);
      Lab.svg('circle', { cx, cy, r: 26, fill: v ? pal.ink : pal.paper3, stroke: pal.ink, 'stroke-width': 1.5 }, g);
      const t = Lab.svg('text', { x: cx, y: cy + 5, 'text-anchor': 'middle', 'font-size': 16, fill: v ? pal.paper3 : pal.ink }, g);
      t.textContent = v;
      const l = Lab.svg('text', { x: cx - 40, y: cy + 5, 'text-anchor': 'end', 'font-size': 14, fill: pal.ink3 }, g);
      l.textContent = n;
      const toggle = () => { if (n === 'x₁') s.x1 ^= 1; else s.x2 ^= 1; render(); };
      g.addEventListener('click', toggle);
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    });
    Lab.svg('circle', { cx: 300, cy: 110, r: 46, fill: pal.paper3, stroke: pal.ink, 'stroke-width': 1.5 }, svg);
    const t1 = Lab.svg('text', { x: 300, y: 104, 'text-anchor': 'middle', 'font-size': 14, fill: pal.ink }, svg);
    t1.textContent = 'Σ = ' + sum.toFixed(1);
    const t2 = Lab.svg('text', { x: 300, y: 124, 'text-anchor': 'middle', 'font-size': 13, fill: pal.ink3 }, svg);
    t2.textContent = '≥ θ = ' + s.th.toFixed(1) + ' ?';
    Lab.svg('line', { x1: 346, y1: 110, x2: 446, y2: 110, stroke: pal.ink, 'stroke-width': 1.5 }, svg);
    Lab.svg('path', { d: 'M446 104 L456 110 L446 116 Z', fill: pal.ink }, svg);
    Lab.svg('circle', { cx: 492, cy: 110, r: 28, fill: y ? pal.accent : pal.paper3, stroke: pal.ink, 'stroke-width': 1.5 }, svg);
    const t3 = Lab.svg('text', { x: 492, y: 116, 'text-anchor': 'middle', 'font-size': 18, fill: y ? pal.paper3 : pal.ink }, svg);
    t3.textContent = y;
    const t4 = Lab.svg('text', { x: 492, y: 160, 'text-anchor': 'middle', 'font-size': 13, fill: pal.ink3 }, svg);
    t4.textContent = 'output y';
  }
  function render() {
    const key = [out(0, 0), out(0, 1), out(1, 0), out(1, 1)].join('');
    found.add(key);
    table.innerHTML = '';
    [[0, 0], [0, 1], [1, 0], [1, 1]].forEach(([a, b]) => {
      const tr = Lab.el('tr', { class: a === s.x1 && b === s.x2 ? 'hit' : '' });
      tr.innerHTML = `<td>${a}</td><td>${b}</td><td>${(s.w1 * a + s.w2 * b).toFixed(1)}</td><td>${out(a, b)}</td>`;
      table.appendChild(tr);
    });
    fnEl.textContent = NAMES[key];
    Lab.$$('.chip', grid).forEach((c) => {
      const on = found.has(c.dataset.k);
      c.style.background = on ? 'var(--accent)' : '';
      c.style.color = on ? 'var(--paper)' : '';
      c.style.borderColor = on ? 'var(--accent)' : '';
      c.style.outline = c.dataset.k === key ? '2px solid var(--ink)' : '';
    });
    countEl.textContent = `${found.size} of 16 found`;
    drawSvg();
  }
  const sl = (id, k) => Lab.slider(Lab.$(id, root), Lab.fmt.fixed(1), (v) => { s[k] = v; render(); });
  sl('#mcp-w1', 'w1'); sl('#mcp-w2', 'w2'); sl('#mcp-th', 'th');
  const PRESETS = { AND: [1, 1, 1.5], OR: [1, 1, 0.5], NAND: [-1, -1, -1.5], 'NOT x₁': [-1, 0, -0.5] };
  const pb = Lab.$('.presets', root);
  Object.entries(PRESETS).forEach(([n, [a, b, t]]) => {
    const btn = Lab.el('button', { type: 'button' }, n);
    btn.addEventListener('click', () => {
      [['#mcp-w1', a], ['#mcp-w2', b], ['#mcp-th', t]].forEach(([id, v]) => { const i = Lab.$(id, root); i.value = v; i.dispatchEvent(new Event('input')); });
    });
    pb.appendChild(btn);
  });
  Lab.onTheme(drawSvg);
})();

/* ---------- Fig 3.1 Perceptron learning rule ---------- */
(function () {
  const root = Lab.$('#fig-perceptron');
  if (!root) return;
  const cv = Lab.$('canvas', root);
  const ro = Lab.$('.readouts', root);
  let pts, w, b, prev, hit, updates, idx, cleanRun, timer = null, addClass = 1;
  const lrIn = Lab.$('#pc-lr', root);
  const lr = Lab.slider(lrIn, Lab.fmt.fixed(2));

  function reset() {
    const r = Lab.rng(11);
    pts = [];
    while (pts.length < 34) {
      const x = r() * 1.8 - 0.9, y = r() * 1.8 - 0.9;
      const m = 0.55 * x - 0.8 * y + 0.12;
      if (Math.abs(m) < 0.12) continue;
      pts.push({ x, y, c: m > 0 ? 1 : 0 });
    }
    w = [-0.4, 0.5]; b = 0.3; prev = null; hit = null; updates = 0; idx = 0; cleanRun = 0;
    stop(); draw();
  }
  const yOf = (p) => (p.c ? 1 : -1);
  const pred = (p) => (w[0] * p.x + w[1] * p.y + b >= 0 ? 1 : -1);
  // Advance to the next misclassified point and correct it. Returns false when converged.
  function step() {
    for (let k = 0; k < pts.length; k++) {
      const p = pts[idx]; idx = (idx + 1) % pts.length;
      if (pred(p) !== yOf(p)) {
        prev = { w: [...w], b };
        const e = lr() * yOf(p);
        w = [w[0] + e * p.x, w[1] + e * p.y]; b += e;
        hit = p; updates++; cleanRun = 0;
        draw(); return true;
      }
      cleanRun++;
    }
    hit = null; prev = null; draw(); return false;
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; } Lab.$('#pc-run', root).textContent = 'Run'; }
  function run() {
    if (timer) return stop();
    Lab.$('#pc-run', root).textContent = 'Pause';
    timer = setInterval(() => { if (!step() || updates > 2000) stop(); }, Lab.reducedMotion ? 30 : 160);
  }

  function lineEnds(W, B) {
    // Intersect w·x + b = 0 with the square [-1,1]².
    const out = [];
    const [a, c] = W;
    if (Math.abs(c) > 1e-9) { [-1, 1].forEach((x) => { const y = -(a * x + B) / c; if (y >= -1 && y <= 1) out.push([x, y]); }); }
    if (Math.abs(a) > 1e-9) { [-1, 1].forEach((y) => { const x = -(c * y + B) / a; if (x >= -1 && x <= 1) out.push([x, y]); }); }
    return out.slice(0, 2);
  }
  function draw() {
    const { ctx, w: W, h: H } = Lab.canvas(cv);
    const pal = Lab.palette();
    const X = (x) => ((x + 1) / 2) * W, Y = (y) => ((1 - y) / 2) * H;
    NN.paintField(ctx, 0, 0, W, H, (x, y) => (w[0] * x + w[1] * y + b >= 0 ? 0.8 : 0.2), 96);
    if (prev) {
      const e = lineEnds(prev.w, prev.b);
      if (e.length === 2) { ctx.setLineDash([5, 5]); ctx.strokeStyle = pal.ink3; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(e[0][0]), Y(e[0][1])); ctx.lineTo(X(e[1][0]), Y(e[1][1])); ctx.stroke(); ctx.setLineDash([]); }
    }
    const e = lineEnds(w, b);
    if (e.length === 2) {
      ctx.strokeStyle = pal.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(e[0][0]), Y(e[0][1])); ctx.lineTo(X(e[1][0]), Y(e[1][1])); ctx.stroke();
      // Weight vector drawn from the boundary's midpoint: it points toward class A.
      const mx = (e[0][0] + e[1][0]) / 2, my = (e[0][1] + e[1][1]) / 2;
      const n = Math.hypot(w[0], w[1]) || 1, L = 0.28;
      const tx = mx + (w[0] / n) * L, ty = my + (w[1] / n) * L;
      ctx.strokeStyle = pal.accent; ctx.fillStyle = pal.accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(X(mx), Y(my)); ctx.lineTo(X(tx), Y(ty)); ctx.stroke();
      const ang = Math.atan2(Y(ty) - Y(my), X(tx) - X(mx));
      ctx.beginPath(); ctx.moveTo(X(tx), Y(ty));
      ctx.lineTo(X(tx) - 9 * Math.cos(ang - 0.4), Y(ty) - 9 * Math.sin(ang - 0.4));
      ctx.lineTo(X(tx) - 9 * Math.cos(ang + 0.4), Y(ty) - 9 * Math.sin(ang + 0.4)); ctx.closePath(); ctx.fill();
      ctx.font = '12px ' + Lab.css('--f-mono'); ctx.fillText('w', X(tx) + 6, Y(ty) - 6);
    }
    NN.drawPoints(ctx, pts, X, Y, 4.5);
    if (hit) { ctx.strokeStyle = pal.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(hit.x), Y(hit.y), 11, 0, Math.PI * 2); ctx.stroke(); }
    const wrong = pts.filter((p) => pred(p) !== yOf(p)).length;
    ro.innerHTML = `<span>w = (<b>${w[0].toFixed(2)}</b>, <b>${w[1].toFixed(2)}</b>)</span><span>b = <b>${b.toFixed(2)}</b></span><span>updates <b>${updates}</b></span><span>misclassified <b>${wrong}</b></span>` +
      (wrong === 0 ? '<span style="color:var(--accent)">converged</span>' : updates > 2000 ? '<span style="color:var(--signal)">no separating line found</span>' : '');
  }
  cv.addEventListener('click', (ev) => {
    const r = cv.getBoundingClientRect();
    pts.push({ x: ((ev.clientX - r.left) / r.width) * 2 - 1, y: 1 - ((ev.clientY - r.top) / r.height) * 2, c: addClass });
    draw();
  });
  Lab.$('#pc-step', root).addEventListener('click', () => { stop(); step(); });
  Lab.$('#pc-run', root).addEventListener('click', run);
  Lab.$('#pc-reset', root).addEventListener('click', reset);
  Lab.$$('[data-add]', root).forEach((btn) => btn.addEventListener('click', () => {
    addClass = +btn.dataset.add;
    Lab.$$('[data-add]', root).forEach((o) => o.setAttribute('aria-pressed', o === btn ? 'true' : 'false'));
  }));
  reset();
  Lab.onTheme(draw); Lab.onResize(cv, draw);
})();

/* ---------- Fig 4.1 XOR: no single line works; a hidden layer bends the space ---------- */
(function () {
  const root = Lab.$('#fig-xor');
  if (!root) return;
  const cvA = Lab.$('#xor-input', root), cvB = Lab.$('#xor-hidden', root), scoreEl = Lab.$('.xor-score', root);
  const P = [{ x: 0, y: 0, c: 0 }, { x: 0, y: 1, c: 1 }, { x: 1, y: 0, c: 1 }, { x: 1, y: 1, c: 0 }];
  const handles = [{ x: -0.1, y: 0.35 }, { x: 1.1, y: 0.75 }];
  const D0 = -0.3, D1 = 1.3;
  let drag = -1, best = 0;
  const sgm = (z) => 1 / (1 + Math.exp(-z));
  const H = (p) => ({ x: sgm(20 * p.x + 20 * p.y - 10), y: sgm(-20 * p.x - 20 * p.y + 30), c: p.c, src: p });

  function side(p) {
    const [a, b] = handles;
    return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) > 0;
  }
  function score() {
    const s = P.filter((p) => side(p) === !!p.c).length;
    return Math.max(s, 4 - s);
  }
  function frame(cv) {
    const { ctx, w, h } = Lab.canvas(cv);
    const X = Lab.scale(D0, D1, 0, w), Y = Lab.scale(D0, D1, h, 0);
    return { ctx, w, h, X, Y };
  }
  function axes(f, xl, yl) {
    const pal = Lab.palette(), { ctx, X, Y, w, h } = f;
    ctx.fillStyle = pal.paper3; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = pal.grid; ctx.lineWidth = 1;
    [0, 1].forEach((v) => { ctx.beginPath(); ctx.moveTo(X(v), 0); ctx.lineTo(X(v), h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, Y(v)); ctx.lineTo(w, Y(v)); ctx.stroke(); });
    ctx.fillStyle = pal.ink3; ctx.font = '12px ' + Lab.css('--f-mono');
    ctx.fillText(xl, w - ctx.measureText(xl).width - 8, Y(0) - 8);
    ctx.save(); ctx.translate(X(0) + 16, 10); ctx.fillText(yl, 0, 6); ctx.restore();
  }
  function labelPts(f, pts, lab) {
    const pal = Lab.palette();
    NN.drawPoints(f.ctx, pts, f.X, f.Y, 7);
    f.ctx.fillStyle = pal.ink2; f.ctx.font = '12px ' + Lab.css('--f-mono');
    pts.forEach((p, i) => f.ctx.fillText(lab(p, i), f.X(p.x) + 11, f.Y(p.y) + 18));
  }
  function drawA() {
    const f = frame(cvA), pal = Lab.palette();
    axes(f, 'x₁', 'x₂');
    const [a, b] = handles;
    // Extend the user's line across the plot and shade the half-plane that best matches.
    const dx = b.x - a.x, dy = b.y - a.y;
    const s = P.filter((p) => side(p) === !!p.c).length;
    const aSide = s >= 2; // which side of the line is predicted class A
    const { ctx, X, Y, w, h } = f;
    ctx.save(); ctx.beginPath();
    const far = 10;
    const p1 = { x: a.x - dx * far, y: a.y - dy * far }, p2 = { x: a.x + dx * far, y: a.y + dy * far };
    const nx = -dy * far, ny = dx * far; // left normal
    const sign = aSide ? 1 : -1;
    ctx.moveTo(X(p1.x), Y(p1.y)); ctx.lineTo(X(p2.x), Y(p2.y));
    ctx.lineTo(X(p2.x + sign * nx), Y(p2.y + sign * ny)); ctx.lineTo(X(p1.x + sign * nx), Y(p1.y + sign * ny)); ctx.closePath();
    ctx.fillStyle = Lab.rgbStr(Lab.rgb('--s1'), 0.12); ctx.fill(); ctx.restore();
    ctx.strokeStyle = pal.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(X(p1.x), Y(p1.y)); ctx.lineTo(X(p2.x), Y(p2.y)); ctx.stroke();
    labelPts(f, P, (p) => `(${p.x},${p.y})`);
    handles.forEach((hd) => {
      ctx.beginPath(); ctx.arc(X(hd.x), Y(hd.y), 8, 0, Math.PI * 2);
      ctx.fillStyle = pal.paper3; ctx.fill(); ctx.strokeStyle = pal.ink; ctx.lineWidth = 2; ctx.stroke();
    });
    const sc = score(); best = Math.max(best, sc);
    scoreEl.innerHTML = `This line classifies <b>${sc} of 4</b> correctly. Best so far: <b>${best} of 4</b>.`;
    void w; void h;
  }
  function drawB() {
    const f = frame(cvB), pal = Lab.palette();
    axes(f, 'h₁ = OR', 'h₂ = NAND');
    const { ctx, X, Y } = f;
    // Separating line h1 + h2 = 1.5, class A above.
    ctx.save(); ctx.beginPath();
    ctx.moveTo(X(D0), Y(1.5 - D0)); ctx.lineTo(X(D1), Y(1.5 - D1)); ctx.lineTo(X(D1), Y(D1)); ctx.lineTo(X(D0), Y(D1)); ctx.closePath();
    ctx.fillStyle = Lab.rgbStr(Lab.rgb('--s1'), 0.12); ctx.fill(); ctx.restore();
    ctx.strokeStyle = pal.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(D0), Y(1.5 - D0)); ctx.lineTo(X(D1), Y(1.5 - D1)); ctx.stroke();
    const hp = P.map(H);
    const seen = {};
    labelPts(f, hp, (p) => {
      const k = Math.round(p.x) + ',' + Math.round(p.y);
      const lab = `(${p.src.x},${p.src.y})`;
      seen[k] = (seen[k] || 0) + 1;
      return seen[k] > 1 ? '' : hp.filter((q) => Math.round(q.x) + ',' + Math.round(q.y) === k).map((q) => `(${q.src.x},${q.src.y})`).join(' & ') || lab;
    });
  }
  function toData(cv, ev) {
    const r = cv.getBoundingClientRect();
    return { x: D0 + ((ev.clientX - r.left) / r.width) * (D1 - D0), y: D1 - ((ev.clientY - r.top) / r.height) * (D1 - D0) };
  }
  cvA.addEventListener('pointerdown', (ev) => {
    const p = toData(cvA, ev);
    let bi = -1, bd = 0.12;
    handles.forEach((hd, i) => { const d = Math.hypot(hd.x - p.x, hd.y - p.y); if (d < bd) { bd = d; bi = i; } });
    drag = bi < 0 ? (Math.hypot(handles[0].x - p.x, handles[0].y - p.y) < Math.hypot(handles[1].x - p.x, handles[1].y - p.y) ? 0 : 1) : bi;
    cvA.setPointerCapture(ev.pointerId);
    handles[drag] = p; drawA();
  });
  cvA.addEventListener('pointermove', (ev) => { if (drag < 0) return; handles[drag] = toData(cvA, ev); drawA(); });
  cvA.addEventListener('pointerup', () => { drag = -1; });
  cvA.style.touchAction = 'none';
  const draw = () => { drawA(); drawB(); };
  draw();
  Lab.onTheme(draw); Lab.onResize(cvA, draw);
})();
