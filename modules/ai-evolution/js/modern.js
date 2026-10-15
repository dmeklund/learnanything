/* Chapters 13–15: attention, positional encoding, tokenization, sampling, scaling. */

/* ---------- Fig 13.1 Self-attention ---------- */
(function () {
  const root = Lab.$('#fig-attn');
  if (!root) return;
  const tokRow = Lab.$('.attn-tokens', root), mat = Lab.$('#attn-matrix', root), bars = Lab.$('.attn-bars', root), ro = Lab.$('.readouts', root);
  // Toy 4-d keys/queries. Dimensions loosely mean: [is-a-thing, animate, place, describes-a-state].
  const BASE = [
    ['The', [0.2, 0, 0, 0]], ['animal', [1, 1.6, 0, 0]], ["didn't", [0, 0, 0, 0.3]], ['cross', [0.3, 0.5, 0.5, 0]],
    ['the', [0.2, 0, 0, 0]], ['street', [1, 0, 1.6, 0]], ['because', [0, 0, 0, 0.2]], ['it', [0.6, 0.2, 0.2, 0]],
    ['was', [0, 0, 0, 0.5]], ['too', [0, 0, 0, 0.9]],
  ];
  const ENDINGS = { tired: [0, 0.8, 0, 1.4], wide: [0, 0, 0.8, 1.4] };
  const st = { end: 'tired', sel: 7, tau: 1, causal: false };
  function tokens() {
    const toks = [...BASE.map(([t, k]) => ({ t, k, q: k.map((v) => v * 0.7) })), { t: st.end, k: ENDINGS[st.end], q: null }];
    // Queries that carry the lesson: "it" asks for the thing the adjective could describe;
    // the adjective asks for a noun of the matching kind; the verb asks for its participants.
    const adj = ENDINGS[st.end];
    toks[7].q = [1.4, adj[1] * 2.4, adj[2] * 2.4, 0];
    toks[10].q = [1.2, adj[1] * 2, adj[2] * 2, 0];
    toks[3].q = [1.2, 0.9, 0.9, 0];
    return toks;
  }
  function attention() {
    const T = tokens(), d = 4, n = T.length;
    const A = [];
    for (let i = 0; i < n; i++) {
      const sc = T.map((tk, j) => (st.causal && j > i ? -Infinity : T[i].q.reduce((s, v, k) => s + v * tk.k[k], 0) / (Math.sqrt(d) * st.tau)));
      const mx = Math.max(...sc), ex = sc.map((s) => Math.exp(s - mx)), Z = ex.reduce((a, b) => a + b, 0);
      A.push({ scores: sc, w: ex.map((e) => e / Z) });
    }
    return { T, A };
  }
  function draw() {
    const pal = Lab.palette(), { T, A } = attention(), n = T.length;
    tokRow.innerHTML = '';
    T.forEach((tk, i) => {
      const b = Lab.el('button', { type: 'button', class: 'chip', 'aria-pressed': i === st.sel ? 'true' : 'false' }, tk.t);
      const wv = A[st.sel].w[i];
      if (i !== st.sel) b.style.boxShadow = `inset 0 -${Math.round(3 + wv * 24)}px 0 ${Lab.rgbStr(Lab.rgb('--signal'), 0.22 + wv * 0.6)}`;
      b.addEventListener('click', () => { st.sel = i; draw(); });
      tokRow.appendChild(b);
    });
    // Bars for the selected query row
    bars.innerHTML = '';
    const order = A[st.sel].w.map((w, j) => [w, j]).sort((a, b) => b[0] - a[0]);
    order.slice(0, 5).forEach(([w, j]) => {
      const row = Lab.el('div', { class: 'attn-bar' });
      row.innerHTML = `<span class="mono">${T[j].t}</span><span class="track"><span style="width:${(w * 100).toFixed(1)}%"></span></span><span class="mono tnum">${(w * 100).toFixed(1)}%</span>`;
      bars.appendChild(row);
    });
    // Matrix heatmap
    const { ctx, w } = Lab.canvas(mat);
    const lab = 70, c = (w - lab) / n;
    mat.style.height = lab + c * n + 'px';
    const { ctx: cx2 } = Lab.canvas(mat);
    cx2.clearRect(0, 0, w, lab + c * n);
    const P = Lab.rgb('--paper-3'), Acc = Lab.rgb('--s1');
    cx2.font = '11px ' + Lab.css('--f-mono');
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const v = A[i].w[j];
        cx2.fillStyle = isFinite(A[i].scores[j]) ? Lab.rgbStr(Lab.mix(P, Acc, Math.pow(v, 0.7))) : pal.paper2;
        cx2.fillRect(lab + j * c + 1, lab + i * c + 1, c - 2, c - 2);
      }
      cx2.fillStyle = i === st.sel ? pal.ink : pal.ink3;
      cx2.textAlign = 'right'; cx2.fillText(T[i].t, lab - 6, lab + i * c + c / 2 + 4);
      cx2.save(); cx2.translate(lab + i * c + c / 2 + 4, lab - 6); cx2.rotate(-Math.PI / 3); cx2.textAlign = 'left'; cx2.fillText(T[i].t, 0, 0); cx2.restore();
    }
    cx2.strokeStyle = pal.ink; cx2.lineWidth = 2; cx2.strokeRect(lab, lab + st.sel * c, c * n, c);
    void ctx;
    const top = order[0];
    ro.innerHTML = `<span>query: <b>${T[st.sel].t}</b></span><span>attends most to <b>${T[top[1]].t}</b> (${(top[0] * 100).toFixed(0)}%)</span><span>scale √d·τ = <b>${(2 * st.tau).toFixed(2)}</b></span>`;
  }
  Lab.$$('[data-end]', root).forEach((b) => b.addEventListener('click', () => {
    st.end = b.dataset.end;
    Lab.$$('[data-end]', root).forEach((o) => o.setAttribute('aria-pressed', o === b ? 'true' : 'false'));
    draw();
  }));
  Lab.slider(Lab.$('#attn-tau', root), Lab.fmt.fixed(2), (v) => { st.tau = v; draw(); });
  Lab.$('#attn-causal', root).addEventListener('change', (e) => { st.causal = e.target.checked; draw(); });
  draw();
  Lab.onTheme(draw); Lab.onResize(mat, draw);
})();

/* ---------- Fig 13.2 Sinusoidal positional encoding ---------- */
(function () {
  const root = Lab.$('#fig-posenc');
  if (!root) return;
  const cv = Lab.$('canvas', root), ro = Lab.$('.readouts', root);
  const POS = 64, D = 64;
  const pe = (p, i) => { const k = Math.floor(i / 2), a = p / Math.pow(10000, (2 * k) / D); return i % 2 === 0 ? Math.sin(a) : Math.cos(a); };
  let hover = null;
  function draw() {
    const { ctx, w } = Lab.canvas(cv, 0.5);
    const h = w * 0.5, cw = w / POS, ch = h / D;
    const P = Lab.rgb('--paper-3'), A = Lab.rgb('--s1'), B = Lab.rgb('--s2');
    for (let p = 0; p < POS; p++) for (let i = 0; i < D; i++) {
      const v = pe(p, i);
      ctx.fillStyle = Lab.rgbStr(Lab.mix(P, v >= 0 ? A : B, Math.abs(v) * 0.9));
      ctx.fillRect(p * cw, i * ch, cw + 0.5, ch + 0.5);
    }
    if (hover) { ctx.strokeStyle = Lab.css('--ink'); ctx.lineWidth = 1.5; ctx.strokeRect(hover[0] * cw, 0, cw, h); }
  }
  cv.addEventListener('pointermove', (ev) => {
    const r = cv.getBoundingClientRect();
    const p = Math.floor(((ev.clientX - r.left) / r.width) * POS), i = Math.floor(((ev.clientY - r.top) / r.height) * D);
    hover = [p, i]; draw();
    ro.innerHTML = `<span>position <b>${p}</b></span><span>dimension <b>${i}</b></span><span>PE = <b>${pe(p, i).toFixed(3)}</b></span><span>wavelength ≈ <b>${(2 * Math.PI * Math.pow(10000, (2 * Math.floor(i / 2)) / D)).toFixed(1)}</b> positions</span>`;
  });
  cv.addEventListener('pointerleave', () => { hover = null; draw(); });
  draw();
  Lab.onTheme(draw); Lab.onResize(cv, draw);
})();

/* ---------- Fig 14.1 Byte-pair encoding ---------- */
(function () {
  const root = Lab.$('#fig-bpe');
  if (!root) return;
  const ta = Lab.$('#bpe-text', root), out = Lab.$('.bpe-out', root), mergesEl = Lab.$('.bpe-merges', root), ro = Lab.$('.readouts', root), slider = Lab.$('#bpe-n', root);
  function learn(text, nMerges) {
    const words = {};
    text.toLowerCase().split(/\s+/).filter(Boolean).forEach((w) => { words[w] = (words[w] || 0) + 1; });
    let seqs = Object.entries(words).map(([w, c]) => ({ s: [...w, '▁'], c }));
    const merges = [];
    for (let m = 0; m < nMerges; m++) {
      const pairs = new Map();
      seqs.forEach(({ s, c }) => { for (let i = 0; i < s.length - 1; i++) { const k = s[i] + '\u0000' + s[i + 1]; pairs.set(k, (pairs.get(k) || 0) + c); } });
      let best = null, bc = 1;
      pairs.forEach((c, k) => { if (c > bc) { bc = c; best = k; } });
      if (!best) break;
      const [a, b] = best.split('\u0000');
      merges.push([a, b, bc]);
      seqs = seqs.map(({ s, c }) => {
        const n = [];
        for (let i = 0; i < s.length; i++) { if (i < s.length - 1 && s[i] === a && s[i + 1] === b) { n.push(a + b); i++; } else n.push(s[i]); }
        return { s: n, c };
      });
    }
    return { merges, seqs, words };
  }
  function render() {
    const n = parseInt(slider.value, 10);
    Lab.$('output', slider.closest('.ctl')).textContent = n;
    const { merges, seqs } = learn(ta.value, n);
    const map = Object.fromEntries(seqs.map(({ s }) => [s.join('').replace('▁', ''), s]));
    out.innerHTML = '';
    let count = 0;
    ta.value.toLowerCase().split(/\s+/).filter(Boolean).forEach((w) => {
      const grp = Lab.el('span', { class: 'bpe-word' });
      (map[w] || [...w]).forEach((t) => { grp.appendChild(Lab.el('span', { class: 'chip' }, t.replace('▁', '<span style="color:var(--ink-3)">▁</span>'))); count++; });
      out.appendChild(grp);
    });
    mergesEl.innerHTML = merges.length
      ? merges.map(([a, b, c], i) => `<li><span class="mono">${a.replace('▁', '▁')} + ${b} → <b>${(a + b)}</b></span> <span class="tnum" style="color:var(--ink-3)">×${c}</span></li>`).join('')
      : '<li style="color:var(--ink-3)">No merges yet. Every character is its own token.</li>';
    const vocab = new Set(); seqs.forEach(({ s }) => s.forEach((t) => vocab.add(t)));
    const chars = ta.value.toLowerCase().replace(/\s+/g, '').length;
    ro.innerHTML = `<span>tokens <b>${count}</b></span><span>characters <b>${chars}</b></span><span>chars per token <b>${(chars / Math.max(1, count)).toFixed(2)}</b></span><span>vocabulary in use <b>${vocab.size}</b></span>`;
  }
  slider.addEventListener('input', render);
  ta.addEventListener('input', render);
  render();
})();

/* ---------- Fig 14.2 Next-token sampling: temperature & top-p ---------- */
(function () {
  const root = Lab.$('#fig-sample');
  if (!root) return;
  const list = Lab.$('.dist', root), ro = Lab.$('.readouts', root), tally = Lab.$('.tally', root);
  const LOGITS = [['mat', 4.1], ['floor', 3.3], ['couch', 3.0], ['bed', 2.7], ['windowsill', 2.3], ['roof', 2.0], ['chair', 1.9], ['keyboard', 1.6], ['table', 1.5], ['grass', 1.1], ['fence', 0.9], ['moon', -0.6]];
  const st = { T: 1, p: 0.9 };
  let counts = {};
  function dist() {
    const z = LOGITS.map(([, l]) => l / st.T), mx = Math.max(...z), e = z.map((v) => Math.exp(v - mx)), S = e.reduce((a, b) => a + b, 0);
    const pr = e.map((v) => v / S);
    const order = pr.map((p, i) => [p, i]).sort((a, b) => b[0] - a[0]);
    const keep = new Set(); let cum = 0;
    for (const [p, i] of order) { keep.add(i); cum += p; if (cum >= st.p) break; }
    const kept = [...keep].reduce((s, i) => s + pr[i], 0);
    return { pr, keep, final: pr.map((p, i) => (keep.has(i) ? p / kept : 0)) };
  }
  function draw() {
    const { pr, keep, final } = dist();
    list.innerHTML = '';
    LOGITS.forEach(([t], i) => {
      const row = Lab.el('div', { class: 'attn-bar' + (keep.has(i) ? '' : ' cut') });
      row.innerHTML = `<span class="mono">${t}</span><span class="track"><span style="width:${(final[i] * 100).toFixed(1)}%"></span><i style="left:${(pr[i] * 100).toFixed(1)}%"></i></span><span class="mono tnum">${keep.has(i) ? (final[i] * 100).toFixed(1) + '%' : 'cut'}</span>`;
      list.appendChild(row);
    });
    const H = -final.reduce((s, p) => s + (p > 0 ? p * Math.log2(p) : 0), 0);
    ro.innerHTML = `<span>candidates kept <b>${keep.size}</b> of ${LOGITS.length}</span><span>entropy <b>${H.toFixed(2)}</b> bits</span>`;
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    tally.innerHTML = total ? `<span class="label">Last ${total} samples</span> ` + Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<span class="chip">${k} ×${v}</span>`).join('') : '<span class="label">Press Sample to draw continuations</span>';
  }
  function sample() {
    const { final } = dist();
    counts = {};
    for (let k = 0; k < 40; k++) {
      let r = Math.random(), i = 0;
      while (i < final.length - 1 && r > final[i]) { r -= final[i]; i++; }
      counts[LOGITS[i][0]] = (counts[LOGITS[i][0]] || 0) + 1;
    }
    draw();
  }
  Lab.slider(Lab.$('#smp-T', root), Lab.fmt.fixed(2), (v) => { st.T = v; counts = {}; draw(); });
  Lab.slider(Lab.$('#smp-p', root), Lab.fmt.fixed(2), (v) => { st.p = v; counts = {}; draw(); });
  Lab.$('#smp-go', root).addEventListener('click', sample);
})();

/* ---------- Fig 15.1 Parameter counts over time ---------- */
(function () {
  const root = Lab.$('#fig-params');
  if (!root) return;
  const wrap = Lab.$('.chart-wrap', root), svg = Lab.$('svg', root), tip = Lab.tip(wrap);
  const D = [
    [1998, 6e4, 'LeNet-5', 'Handwritten digit CNN'],
    [2012, 6.1e7, 'AlexNet', 'ImageNet-winning CNN'],
    [2014, 1.38e8, 'VGG-16', 'Very deep CNN'],
    [2017, 2.13e8, 'Transformer (big)', 'Attention Is All You Need'],
    [2018, 3.4e8, 'BERT-Large', 'Bidirectional encoder'],
    [2019, 1.5e9, 'GPT-2', 'Decoder-only language model'],
    [2019.6, 1.1e10, 'T5-11B', 'Text-to-text transformer'],
    [2020.4, 1.75e11, 'GPT-3', 'Few-shot in-context learning'],
    [2021.9, 2.8e11, 'Gopher', 'DeepMind language model'],
    [2022.25, 7e10, 'Chinchilla', 'Smaller, trained on 4× more data'],
    [2022.3, 5.4e11, 'PaLM', 'Google, 6,144 TPU v4 chips'],
    [2023.15, 6.5e10, 'LLaMA-65B', 'Open weights, 1.4T tokens'],
    [2024.55, 4.05e11, 'Llama 3.1 405B', 'Open weights, 15T+ tokens'],
    [2024.98, 6.71e11, 'DeepSeek-V3', 'Mixture of experts, 37B active per token'],
  ];
  const LABEL = new Set(['LeNet-5', 'AlexNet', 'GPT-2', 'GPT-3', 'Chinchilla', 'DeepSeek-V3']);
  const W = 640, H = 340, m = { l: 56, r: 24, t: 20, b: 36 };
  const x = Lab.scale(1996, 2026, m.l, W - m.r), y = Lab.logScale(1e4, 1e12, H - m.b, m.t);
  function draw() {
    const pal = Lab.palette();
    svg.innerHTML = ''; svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    [1e4, 1e6, 1e8, 1e10, 1e12].forEach((v) => {
      Lab.svg('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), stroke: pal.grid }, svg);
      const t = Lab.svg('text', { x: m.l - 8, y: y(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: pal.ink3 }, svg);
      t.textContent = Lab.fmt.si(v);
    });
    [2000, 2005, 2010, 2015, 2020, 2025].forEach((v) => {
      const t = Lab.svg('text', { x: x(v), y: H - m.b + 18, 'text-anchor': 'middle', 'font-size': 11, fill: pal.ink3 }, svg);
      t.textContent = v;
    });
    Lab.svg('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, stroke: pal.ink3 }, svg);
    D.forEach(([yr, p, n, k]) => {
      Lab.svg('circle', { cx: x(yr), cy: y(p), r: 5, fill: n === 'Chinchilla' ? pal.s2 : pal.s1, stroke: pal.paper3, 'stroke-width': 2 }, svg);
      if (LABEL.has(n)) {
        const right = yr < 2021;
        const t = Lab.svg('text', { x: x(yr) + (right ? 9 : -9), y: y(p) + (n === 'Chinchilla' ? 16 : 4), 'text-anchor': right ? 'start' : 'end', 'font-size': 11.5, fill: pal.ink2 }, svg);
        t.textContent = n;
      }
      const hit = Lab.svg('circle', { cx: x(yr), cy: y(p), r: 13, fill: 'transparent' }, svg);
      hit.addEventListener('pointermove', () => { const r = svg.getBoundingClientRect(); tip.show((x(yr) / W) * r.width, (y(p) / H) * r.height, `${n} · ${Math.floor(yr)}<br>${Lab.fmt.si(p)} parameters<br>${k}`); });
      hit.addEventListener('pointerleave', () => tip.hide());
    });
  }
  draw();
  Lab.onTheme(draw);
})();

/* ---------- Fig 15.2 Compute-optimal scaling (Chinchilla) ---------- */
(function () {
  const root = Lab.$('#fig-chinchilla');
  if (!root) return;
  const wrap = Lab.$('.chart-wrap', root), svg = Lab.$('svg', root), ro = Lab.$('.readouts', root), tip = Lab.tip(wrap);
  // Hoffmann et al. (2022), fitted parametric loss: L(N, D) = E + A/N^α + B/D^β
  const E = 1.69, A = 406.4, B = 410.7, al = 0.34, be = 0.28;
  const L = (N, Dt) => E + A / N ** al + B / Dt ** be;
  const Cs = [1e19, 1e20, 1e21, 1e22, 1e23, 1e24, 1e25];
  let logC = 23;
  const W = 640, H = 340, m = { l: 48, r: 24, t: 20, b: 40 };
  const x = Lab.logScale(1e7, 1e13, m.l, W - m.r), y = Lab.scale(1.8, 4.0, H - m.b, m.t);
  function curve(C) {
    const pts = [];
    for (let e = 7; e <= 13.001; e += 0.05) { const N = 10 ** e, Dt = C / (6 * N); pts.push([N, L(N, Dt), Dt]); }
    return pts;
  }
  const opt = (pts) => pts.reduce((a, b) => (b[1] < a[1] ? b : a));
  function draw() {
    const pal = Lab.palette(), C = 10 ** logC;
    svg.innerHTML = ''; svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    [2, 2.5, 3, 3.5, 4].forEach((v) => {
      Lab.svg('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), stroke: pal.grid }, svg);
      const t = Lab.svg('text', { x: m.l - 8, y: y(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: pal.ink3 }, svg);
      t.textContent = v.toFixed(1);
    });
    [1e7, 1e8, 1e9, 1e10, 1e11, 1e12, 1e13].forEach((v) => {
      const t = Lab.svg('text', { x: x(v), y: H - m.b + 18, 'text-anchor': 'middle', 'font-size': 11, fill: pal.ink3 }, svg);
      t.textContent = Lab.fmt.si(v);
    });
    const xl = Lab.svg('text', { x: (m.l + W - m.r) / 2, y: H - 4, 'text-anchor': 'middle', 'font-size': 11, fill: pal.ink3 }, svg);
    xl.textContent = 'parameters N (log scale) · y: predicted loss (nats/token)';
    const clip = (pts) => pts.filter((p) => p[1] <= 4.0);
    const optPts = [];
    Cs.forEach((c) => {
      const pts = clip(curve(c));
      const d = pts.map((p, i) => (i ? 'L' : 'M') + x(p[0]).toFixed(1) + ' ' + y(p[1]).toFixed(1)).join('');
      Lab.svg('path', { d, fill: 'none', stroke: pal.rule, 'stroke-width': 1.5 }, svg);
      optPts.push(opt(curve(c)));
    });
    Lab.svg('path', { d: optPts.map((p, i) => (i ? 'L' : 'M') + x(p[0]).toFixed(1) + ' ' + y(p[1]).toFixed(1)).join(''), fill: 'none', stroke: pal.s2, 'stroke-width': 1.5, 'stroke-dasharray': '4 4' }, svg);
    const cur = clip(curve(C));
    Lab.svg('path', { d: cur.map((p, i) => (i ? 'L' : 'M') + x(p[0]).toFixed(1) + ' ' + y(p[1]).toFixed(1)).join(''), fill: 'none', stroke: pal.s1, 'stroke-width': 2.5 }, svg);
    const o = opt(curve(C));
    Lab.svg('circle', { cx: x(o[0]), cy: y(o[1]), r: 6, fill: pal.s1, stroke: pal.paper3, 'stroke-width': 2 }, svg);
    const lbl = Lab.svg('text', { x: x(o[0]), y: y(o[1]) + 22, 'text-anchor': 'middle', 'font-size': 11.5, fill: pal.ink }, svg);
    lbl.textContent = 'optimum';
    const ol = Lab.svg('text', { x: x(optPts[0][0]) - 4, y: y(optPts[0][1]) - 10, 'font-size': 11, fill: pal.ink2 }, svg);
    ol.textContent = 'compute-optimal frontier';
    ro.innerHTML = `<span>budget C = <b>${Lab.fmt.sci(C)}</b> FLOPs</span><span>best N ≈ <b>${Lab.fmt.si(o[0])}</b> params</span><span>D ≈ <b>${Lab.fmt.si(o[2])}</b> tokens</span><span>tokens / param ≈ <b>${(o[2] / o[0]).toFixed(0)}</b></span><span>predicted loss <b>${o[1].toFixed(3)}</b></span>`;
    const hit = Lab.svg('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: 'transparent' }, svg);
    const dot = Lab.svg('circle', { r: 4, fill: pal.ink, opacity: 0 }, svg);
    hit.addEventListener('pointermove', (ev) => {
      const r = svg.getBoundingClientRect(), sx = ((ev.clientX - r.left) / r.width) * W;
      const N = 10 ** (7 + ((sx - m.l) / (W - m.l - m.r)) * 6), Dt = C / (6 * N), l = L(N, Dt);
      if (l > 4) { dot.setAttribute('opacity', 0); tip.hide(); return; }
      dot.setAttribute('cx', x(N)); dot.setAttribute('cy', y(l)); dot.setAttribute('opacity', 1);
      tip.show((x(N) / W) * r.width, (y(l) / H) * r.height, `N = ${Lab.fmt.si(N)}, D = ${Lab.fmt.si(Dt)}<br>loss ${l.toFixed(3)}`);
    });
    hit.addEventListener('pointerleave', () => { dot.setAttribute('opacity', 0); tip.hide(); });
  }
  Lab.slider(Lab.$('#ch-c', root), (v) => Lab.fmt.sci(10 ** v), (v) => { logC = v; draw(); });
  Lab.onTheme(draw);
})();
