/* Volume V, screening figures: plate throughput, segmentation, screen statistics. */
(function () {
  /* ---------- Fig 6.1 How long does a plate take? ---------- */
  (function () {
    const root = Lab.$('#fig-plate');
    if (!root) return;
    const wrap = Lab.$('.chart-wrap', root), svg = Lab.$('svg', root), out = Lab.$('.readouts', root);
    // ANSI/SLAS footprint 127.76 × 85.48 mm. Well pitch and approximate imageable well-bottom area per format.
    const FMT = { 96: { rows: 8, cols: 12, pitch: 9, well: 6.4, round: true }, 384: { rows: 16, cols: 24, pitch: 4.5, well: 3.6, round: false }, 1536: { rows: 32, cols: 48, pitch: 2.25, well: 1.6, round: false } };
    const AF = { laser: { name: 'laser, every site', site: 0.06, well: 0 }, laserWell: { name: 'laser, once per well', site: 0, well: 0.06 }, image: { name: 'image-based, every site', site: 1.5, well: 0 } };
    const st = { fmt: 384, sites: 4, ch: 4, exp: 100, af: 'laser', mag: 20 };
    let ready = false;
    function calc() {
      const F = FMT[st.fmt], wells = F.rows * F.cols, fov = (2048 * 6.5e-3) / st.mag;     // mm, 2048-pixel sensor with 6.5 µm pixels
      const A = AF[st.af], perSite = st.ch * (st.exp / 1000 + 0.03) + A.site + 0.12;      // exposure + filter/readout, focus, site move
      const perWell = st.sites * perSite + A.well + 0.25;
      const tPlate = wells * perWell, imgs = wells * st.sites * st.ch, gb = (imgs * 2048 * 2048 * 2) / 1e9;
      const wellArea = F.round ? Math.PI * (F.well / 2) ** 2 : F.well * F.well, cover = Math.min(1, (st.sites * fov * fov) / wellArea);
      return { F, wells, fov, perSite, tPlate, imgs, gb, cover, perDay: 86400 / tPlate };
    }
    function draw() {
      if (!ready) return;
      const pal = Lab.palette(), C = calc(), F = C.F, W = Math.max(300, Math.round(wrap.clientWidth || 640)), narrow = W < 560;
      const pw = narrow ? W - 4 : W * 0.62, s = pw / 127.76, ph = 85.48 * s, H = narrow ? ph + 16 + Math.min(W, 260) : ph + 4;
      svg.innerHTML = ''; svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H);
      Lab.svg('rect', { x: 1, y: 1, width: pw - 2, height: ph - 2, rx: 3 * s, fill: pal.paper2, stroke: pal.ink3 }, svg);
      // A1 sits 14.38 mm from the left edge and 11.24 mm from the top for the 96 format; others share the same center.
      const x0 = 127.76 / 2 - ((F.cols - 1) * F.pitch) / 2, y0 = 85.48 / 2 - ((F.rows - 1) * F.pitch) / 2, hot = Math.floor(F.rows / 2) * F.cols + Math.floor(F.cols / 2);
      for (let i = 0; i < F.rows; i++) for (let j = 0; j < F.cols; j++) {
        const cx = (x0 + j * F.pitch) * s, cy = (y0 + i * F.pitch) * s, r = (F.well / 2) * s, on = i * F.cols + j === hot;
        const a = { fill: on ? pal.s1 : pal.paper3, stroke: pal.rule, 'stroke-width': 0.6 };
        if (F.round) Lab.svg('circle', { cx, cy, r, ...a }, svg); else Lab.svg('rect', { x: cx - r, y: cy - r, width: 2 * r, height: 2 * r, rx: r * 0.15, ...a }, svg);
      }
      // Zoom on one well with its imaging sites drawn to scale
      const zs = narrow ? Math.min(W, 260) - 20 : Math.min(W - pw - 24, ph - 20), zx = narrow ? (W - zs) / 2 : pw + 16, zy = narrow ? ph + 26 : 10, k = zs / (F.well * 1.15);
      const zc = { x: zx + zs / 2, y: zy + zs / 2 };
      if (F.round) Lab.svg('circle', { cx: zc.x, cy: zc.y, r: (F.well / 2) * k, fill: pal.paper3, stroke: pal.ink3 }, svg);
      else Lab.svg('rect', { x: zc.x - (F.well / 2) * k, y: zc.y - (F.well / 2) * k, width: F.well * k, height: F.well * k, fill: pal.paper3, stroke: pal.ink3 }, svg);
      const g = Math.ceil(Math.sqrt(st.sites)), f = C.fov * k;
      for (let n = 0; n < st.sites; n++) {
        const gi = n % g, gj = Math.floor(n / g), rowsUsed = Math.ceil(st.sites / g);
        Lab.svg('rect', { x: zc.x + (gi - g / 2) * f + 1, y: zc.y + (gj - rowsUsed / 2) * f + 1, width: f - 2, height: f - 2, fill: pal.s1, opacity: 0.35, stroke: pal.s1 }, svg);
      }
      Lab.svg('text', { x: zc.x, y: zy + zs + 2, 'text-anchor': 'middle', 'font-size': 11, fill: pal.ink2 }, svg).textContent = `one well, ${st.sites} field${st.sites > 1 ? 's' : ''} at ${st.mag}×`;
      const t = C.tPlate, tt = t < 3600 ? `${(t / 60).toFixed(0)} min` : `${(t / 3600).toFixed(1)} h`;
      out.innerHTML = `<span>images per plate <b>${C.imgs.toLocaleString('en-US')}</b></span><span>time per plate <b>${tt}</b></span><span>plates per day <b>${C.perDay.toFixed(1)}</b></span><span>raw data per plate <b>${C.gb < 1000 ? C.gb.toFixed(0) + ' GB' : (C.gb / 1000).toFixed(2) + ' TB'}</b></span><span>per day <b>${((C.gb * C.perDay) / 1000).toFixed(1)} TB</b></span><span>field of view <b>${(C.fov * 1000).toFixed(0)} µm</b>, well area imaged <b>${Math.round(C.cover * 100)}%</b></span>`;
    }
    Lab.$$('[data-fmt]', root).forEach((b) => b.addEventListener('click', () => { st.fmt = +b.dataset.fmt; Lab.$$('[data-fmt]', root).forEach((o) => o.setAttribute('aria-pressed', o === b ? 'true' : 'false')); draw(); }));
    Lab.slider(Lab.$('#pl-s', root), (v) => v, (v) => { st.sites = v; draw(); });
    Lab.slider(Lab.$('#pl-c', root), (v) => v, (v) => { st.ch = v; draw(); });
    Lab.slider(Lab.$('#pl-e', root), (v) => v + ' ms', (v) => { st.exp = v; draw(); });
    Lab.$('#pl-af', root).addEventListener('change', (e) => { st.af = e.target.value; draw(); });
    Lab.$('#pl-m', root).addEventListener('change', (e) => { st.mag = +e.target.value; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(wrap, draw);
  })();

  /* ---------- Fig 7.1 Finding nuclei ---------- */
  (function () {
    const root = Lab.$('#fig-seg');
    if (!root) return;
    const cv = Lab.$('canvas', root), out = Lab.$('.readouts', root), tIn = Lab.$('#sg-t', root);
    const N = 200, r = Lab.rng(61), nuclei = [];
    // Nuclei, some deliberately touching in pairs and triples, as in a dense culture.
    while (nuclei.length < 36) {
      const rad = 6 + 3 * r(), x = 12 + r() * (N - 24), y = 12 + r() * (N - 24);
      if (nuclei.some((n) => Math.hypot(n.x - x, n.y - y) < n.rad + rad + 3)) continue;
      nuclei.push({ x, y, rad, e: 0.75 + 0.25 * r(), a: r() * Math.PI, b: 0.55 + 0.45 * r() });
      if (r() < 0.35 && nuclei.length < 36) {
        const ang = r() * Math.PI * 2, rad2 = 6 + 3 * r(), d = (rad + rad2) * 0.82, x2 = x + Math.cos(ang) * d, y2 = y + Math.sin(ang) * d;
        if (x2 > 10 && y2 > 10 && x2 < N - 10 && y2 < N - 10 && !nuclei.slice(0, -1).some((n) => Math.hypot(n.x - x2, n.y - y2) < n.rad + rad2 + 3)) nuclei.push({ x: x2, y: y2, rad: rad2, e: 0.8 + 0.2 * r(), a: r() * Math.PI, b: 0.55 + 0.45 * r() });
      }
    }
    const raw = new Float32Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      let v = 0.08 + 0.12 * (i / N) * (j / N);                   // uneven illumination
      nuclei.forEach((n) => {
        const dx = i - n.x, dy = j - n.y, c = Math.cos(n.a), s = Math.sin(n.a), u = dx * c + dy * s, w = (-dx * s + dy * c) / n.e, d = Math.hypot(u, w) / n.rad;
        if (d < 1.2) v += n.b * Math.max(0, Math.min(1, (1.1 - d) * 4)) * (0.85 + 0.15 * Math.cos(i * 0.9 + j * 0.7));
      });
      raw[j * N + i] = v;
    }
    const img = MX.blur(raw, N, N, 1.1); for (let p = 0; p < N * N; p++) img[p] = Math.max(0, img[p] + 0.03 * Lab.gauss(r));
    let mx = 0; for (const v of img) mx = Math.max(mx, v); for (let p = 0; p < N * N; p++) img[p] /= mx;
    // Otsu's threshold: maximize between-class variance over a 256-bin histogram.
    const hist = new Array(256).fill(0); img.forEach((v) => hist[Math.min(255, Math.floor(v * 256))]++);
    const otsu = (() => { let sum = 0; hist.forEach((c, i) => (sum += i * c)); let sB = 0, wB = 0, best = 0, t = 0; for (let i = 0; i < 256; i++) { wB += hist[i]; if (!wB) continue; const wF = N * N - wB; if (!wF) break; sB += i * hist[i]; const mB = sB / wB, mF = (sum - sB) / wF, b = wB * wF * (mB - mF) ** 2; if (b > best) { best = b; t = i; } } return (t + 0.5) / 256; })();
    const st = { split: false, min: 20 };
    let ready = false;
    function segment(t) {
      const lab = new Int32Array(N * N), mask = new Uint8Array(N * N);
      for (let p = 0; p < N * N; p++) mask[p] = img[p] > t ? 1 : 0;
      let n = 0; const sizes = [0];
      const nb4 = [1, -1, N, -N];
      for (let p = 0; p < N * N; p++) if (mask[p] && !lab[p]) {
        n++; let size = 0; const q = [p]; lab[p] = n;
        while (q.length) { const c = q.pop(); size++; for (const d of nb4) { const m = c + d; if (m < 0 || m >= N * N || !mask[m] || lab[m] || (Math.abs(d) === 1 && Math.floor(m / N) !== Math.floor(c / N))) continue; lab[m] = n; q.push(m); } }
        sizes.push(size);
      }
      for (let p = 0; p < N * N; p++) if (lab[p] && sizes[lab[p]] < st.min) { lab[p] = 0; mask[p] = 0; }
      if (!st.split) return lab;
      // Watershed on the distance transform: seeds at distance peaks, then flood downhill.
      const D = new Float32Array(N * N);
      for (let p = 0; p < N * N; p++) D[p] = mask[p] ? 1e9 : 0;
      for (let pass = 0; pass < 2; pass++) {
        const ys = pass ? [...Array(N).keys()].reverse() : [...Array(N).keys()];
        ys.forEach((y) => { const xs = pass ? [...Array(N).keys()].reverse() : [...Array(N).keys()]; xs.forEach((x) => {
          const p = y * N + x; if (!mask[p]) return;
          const nbr = pass ? [[1, 0, 1], [0, 1, 1], [1, 1, 1.4], [-1, 1, 1.4]] : [[-1, 0, 1], [0, -1, 1], [-1, -1, 1.4], [1, -1, 1.4]];
          nbr.forEach(([dx, dy, c]) => { const xx = x + dx, yy = y + dy; const v = xx < 0 || yy < 0 || xx >= N || yy >= N ? 0 : D[yy * N + xx]; D[p] = Math.min(D[p], v + c); });
        }); });
      }
      const seeds = [];
      for (let y = 3; y < N - 3; y++) for (let x = 3; x < N - 3; x++) {
        const p = y * N + x; if (D[p] < 2.5) continue;
        let isMax = true; for (let dy = -3; dy <= 3 && isMax; dy++) for (let dx = -3; dx <= 3; dx++) if (D[p + dy * N + dx] > D[p]) { isMax = false; break; }
        if (isMax) seeds.push(p);
      }
      seeds.sort((a, b) => D[b] - D[a]);
      const kept = []; seeds.forEach((p) => { if (!kept.some((k) => Math.hypot((k % N) - (p % N), Math.floor(k / N) - Math.floor(p / N)) < Math.max(5, D[k] * 0.9))) kept.push(p); });
      const out2 = new Int32Array(N * N); kept.forEach((p, i) => { out2[p] = i + 1; });
      const order = []; for (let p = 0; p < N * N; p++) if (mask[p]) order.push(p);
      order.sort((a, b) => D[b] - D[a]);
      for (let pass = 0; pass < 8; pass++) {
        let changed = false;
        order.forEach((p) => {
          if (out2[p]) return; let best = 0, bd = -1;
          for (const d of [1, -1, N, -N, N + 1, N - 1, -N + 1, -N - 1]) { const m = p + d; if (m >= 0 && m < N * N && out2[m] && D[m] > bd) { bd = D[m]; best = out2[m]; } }
          if (best) { out2[p] = best; changed = true; }
        });
        if (!changed) break;
      }
      return out2;
    }
    function draw() {
      if (!ready) return;
      const t = parseFloat(tIn.value), lab = segment(t);
      const { ctx, w, h } = Lab.canvas(cv, (cv.clientWidth || 600) < 560 ? 1.45 : 0.62), pal = Lab.palette(), F = MX.film();
      ctx.clearRect(0, 0, w, h);
      const narrow = w < 560, sq = narrow ? w : h;
      MX.gray(ctx, img, N, N, (v) => Math.min(1, v * 1.1), 0, 0, sq, sq, MX.channelRGB('dna'));
      // Outlines: pixels whose label differs from a neighbor
      const sc = sq / N, acc = Lab.rgbStr(Lab.rgb('--film-ink'), 0.9);
      ctx.fillStyle = acc;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const l = lab[y * N + x]; if (!l) continue;
        if ((x && lab[y * N + x - 1] !== l) || (x < N - 1 && lab[y * N + x + 1] !== l) || (y && lab[(y - 1) * N + x] !== l) || (y < N - 1 && lab[(y + 1) * N + x] !== l)) ctx.fillRect(x * sc, y * sc, Math.max(1, sc * 0.8), Math.max(1, sc * 0.8));
      }
      // Score against the true nuclei
      const objs = new Map();
      nuclei.forEach((n, k) => { const l = lab[Math.round(n.y) * N + Math.round(n.x)]; if (l) objs.set(l, (objs.get(l) || 0) + 1); });
      const all = new Set(); for (const l of lab) if (l) all.add(l);
      const merged = [...objs.values()].filter((c) => c > 1).length, missed = nuclei.filter((n) => !lab[Math.round(n.y) * N + Math.round(n.x)]).length;
      const extra = [...all].filter((l) => !objs.has(l)).length, correct = [...objs.values()].filter((c) => c === 1).length;
      nuclei.forEach((n) => {
        const l = lab[Math.round(n.y) * N + Math.round(n.x)], ok = l && objs.get(l) === 1;
        ctx.fillStyle = ok ? Lab.css('--film-ink') : Lab.css('--s3'); ctx.beginPath(); ctx.arc(n.x * sc, n.y * sc, ok ? 1.6 : 3.2, 0, 7); ctx.fill();
      });
      // Histogram with the threshold
      const x0 = narrow ? 10 : sq + 24, y0 = narrow ? sq + 30 : 30, hw = w - x0 - 10, hh = narrow ? h - sq - 70 : h * 0.5;
      ctx.fillStyle = pal.ink2; ctx.font = `11px ${Lab.css('--f-mono')}`; ctx.fillText('Pixel intensity histogram (log counts)', x0, y0 - 10);
      const lm = Math.log10(1 + Math.max(...hist));
      hist.forEach((c, i) => { const bh = (Math.log10(1 + c) / lm) * hh; ctx.fillStyle = i / 256 > t ? pal.s1 : pal.ink3; ctx.fillRect(x0 + (i / 256) * hw, y0 + hh - bh, Math.max(1, hw / 256), bh); });
      [[t, pal.ink, 'threshold'], [otsu, pal.s2, 'Otsu']].forEach(([v, c, l], k) => { ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + v * hw, y0 - 2); ctx.lineTo(x0 + v * hw, y0 + hh); ctx.stroke(); ctx.fillStyle = pal.ink2; ctx.fillText(l, x0 + v * hw + 4, y0 + 10 + k * 13); });
      ctx.lineWidth = 1; ctx.fillStyle = pal.ink3; ctx.fillText('dark', x0, y0 + hh + 14); ctx.textAlign = 'right'; ctx.fillText('bright', x0 + hw, y0 + hh + 14); ctx.textAlign = 'left';
      out.innerHTML = `<span>objects found <b>${all.size}</b> (true nuclei ${nuclei.length})</span><span>correct <b>${correct}</b></span><span>merged <b class="${merged ? 'warn' : ''}">${merged}</b></span><span>missed <b class="${missed ? 'warn' : ''}">${missed}</b></span><span>spurious <b>${extra}</b></span>`;
    }
    Lab.slider(tIn, (v) => v.toFixed(3), () => draw());
    Lab.slider(Lab.$('#sg-min', root), (v) => v + ' px', (v) => { st.min = v; draw(); });
    Lab.$('#sg-split', root).addEventListener('change', (e) => { st.split = e.target.checked; draw(); });
    Lab.$('#sg-otsu', root).addEventListener('click', () => { tIn.value = otsu.toFixed(3); tIn.dispatchEvent(new Event('input')); });
    ready = true; tIn.value = otsu.toFixed(3); tIn.dispatchEvent(new Event('input'));
    Lab.onTheme(draw); Lab.onResize(cv, draw);
  })();

  /* ---------- Fig 8.1 Controls, Z′, and hits ---------- */
  (function () {
    const root = Lab.$('#fig-zprime');
    if (!root) return;
    const wrap = Lab.$('.chart-wrap', root), svg = Lab.$('svg', root), tip = Lab.tip(wrap), out = Lab.$('.readouts', root);
    const ROWS = 16, COLS = 24, r = Lab.rng(88), noise = Array.from({ length: ROWS * COLS }, () => Lab.gauss(r));
    const hitEffect = Array.from({ length: ROWS * COLS }, (_, k) => { const j = k % COLS; return j >= 2 && j < COLS - 2 && r() < 0.03 ? 0.4 + 0.6 * r() : 0; });
    const st = { win: 2, cv: 6, edge: false, correct: false };
    let ready = false;
    const kind = (k) => { const j = k % COLS; return j < 2 ? 'neg' : j >= COLS - 2 ? 'pos' : 'sample'; };
    const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length, sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)); };
    const median = (a) => { const b = [...a].sort((x, y) => x - y); return b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2; };
    function model() {
      const mn = 100, mp = 100 * (1 + st.win), raw = [];
      for (let k = 0; k < ROWS * COLS; k++) {
        const i = Math.floor(k / COLS), j = k % COLS, edge = i === 0 || j === 0 || i === ROWS - 1 || j === COLS - 1;
        let mu = kind(k) === 'pos' ? mp : mn + hitEffect[k] * (mp - mn);
        if (st.edge && edge) mu *= 1.18;                         // evaporation concentrates the outer wells
        raw.push(mu * (1 + (st.cv / 100) * noise[k]));
      }
      let v = raw;
      if (st.correct) {
        // Subtract each row's and column's sample median: a simple form of positional correction.
        const sm = median(raw.filter((_, k) => kind(k) === 'sample'));
        const rowM = [...Array(ROWS)].map((_, i) => median(raw.filter((_, k) => Math.floor(k / COLS) === i && kind(k) === 'sample')) - sm);
        const colM = [...Array(COLS)].map((_, j) => (j < 2 || j >= COLS - 2 ? 0 : median(raw.filter((_, k) => k % COLS === j)) - sm));
        v = raw.map((x, k) => x - rowM[Math.floor(k / COLS)] - (kind(k) === 'sample' ? colM[k % COLS] : 0));
      }
      const neg = v.filter((_, k) => kind(k) === 'neg'), pos = v.filter((_, k) => kind(k) === 'pos');
      const mN = mean(neg), mP = mean(pos), sN = sd(neg), sP = sd(pos);
      const act = v.map((x) => (100 * (x - mN)) / (mP - mN));
      const z = 1 - (3 * (sP + sN)) / Math.abs(mP - mN), thr = (100 * 3 * sN) / (mP - mN);
      return { act, z, thr };
    }
    function draw() {
      if (!ready) return;
      const pal = Lab.palette(), M = model(), W = Math.max(300, Math.round(wrap.clientWidth || 640)), narrow = W < 600;
      const pw = narrow ? W : W * 0.55, cw = (pw - 20) / COLS, ph = cw * ROWS + 18, hx = narrow ? 0 : pw + 24, hy = narrow ? ph + 30 : 18, hwid = narrow ? W : W - hx - 4, hh = 170;
      const H = narrow ? hy + hh + 40 : Math.max(ph, hy + hh + 40);
      svg.innerHTML = ''; svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H);
      const lo = Lab.rgb('--paper-3'), hi = Lab.rgb('--s1');
      M.act.forEach((a, k) => {
        const i = Math.floor(k / COLS), j = k % COLS, cx = 18 + (j + 0.5) * cw, cy = 16 + (i + 0.5) * cw, called = kind(k) === 'sample' && a > M.thr;
        const c = Lab.svg('rect', { x: cx - cw * 0.44, y: cy - cw * 0.44, width: cw * 0.88, height: cw * 0.88, rx: 1.5, fill: Lab.rgbStr(Lab.mix(lo, hi, Math.max(0, Math.min(1, a / 100)))), stroke: called ? pal.ink : pal.rule, 'stroke-width': called ? 1.6 : 0.5 }, svg);
        c.addEventListener('pointermove', () => { const s = svg.getBoundingClientRect().width / W; tip.show(cx * s, (cy - cw / 2) * s, `<b>${String.fromCharCode(65 + i)}${j + 1}</b> · ${kind(k) === 'neg' ? 'negative control' : kind(k) === 'pos' ? 'positive control' : 'compound'}<br>activity ${a.toFixed(0)}%${called ? ' · called a hit' : ''}${hitEffect[k] ? ' · true active' : ''}`, (cy + cw / 2) * s); });
        c.addEventListener('pointerleave', () => tip.hide());
      });
      Lab.svg('text', { x: 18, y: 10, 'font-size': 10.5, fill: pal.ink3 }, svg).textContent = 'neg';
      Lab.svg('text', { x: 18 + (COLS - 2) * cw, y: 10, 'font-size': 10.5, fill: pal.ink3 }, svg).textContent = 'pos';
      // Activity histogram by well type
      const x = Lab.scale(-60, Math.max(160, 100 * 1.2), hx + 4, hx + hwid - 4), bins = 44, bw = (x(200) - x(-60)) / bins;
      const groups = [['neg', pal.ink3, 'negative controls'], ['sample', pal.s1, 'compounds'], ['pos', pal.s2, 'positive controls']];
      const counts = groups.map(([g]) => { const c = new Array(bins).fill(0); M.act.forEach((a, k) => { if (kind(k) !== g) return; const b = Math.floor((a + 60) / 260 * bins); if (b >= 0 && b < bins) c[b]++; }); return c; });
      const cm = Math.max(...counts.map((c) => Math.max(...c)));
      const Y = (v) => hy + hh - (Math.sqrt(v) / Math.sqrt(cm)) * hh;
      groups.forEach(([g, col], gi) => counts[gi].forEach((c, b) => { if (!c) return; Lab.svg('rect', { x: x(-60 + (b * 260) / bins) + 0.5, y: Y(c), width: Math.max(1, (x(200) - x(-60)) / bins - 1), height: hy + hh - Y(c), fill: col, opacity: 0.8 }, svg); }));
      [0, 50, 100, 150].forEach((v) => Lab.svg('text', { x: x(v), y: hy + hh + 14, 'text-anchor': 'middle', 'font-size': 10.5, fill: pal.ink3 }, svg).textContent = v + '%');
      Lab.svg('line', { x1: x(M.thr), x2: x(M.thr), y1: hy - 4, y2: hy + hh, stroke: pal.ink, 'stroke-dasharray': '4 3' }, svg);
      Lab.svg('text', { x: x(M.thr) + 4, y: hy + 6, 'font-size': 10.5, fill: pal.ink2 }, svg).textContent = 'hit cutoff';
      Lab.svg('text', { x: hx + hwid - 4, y: hy + hh + 28, 'text-anchor': 'end', 'font-size': 10.5, fill: pal.ink3 }, svg).textContent = 'activity, % of positive control (√ counts)';
      const called = M.act.filter((a, k) => kind(k) === 'sample' && a > M.thr).length, tp = M.act.filter((a, k) => kind(k) === 'sample' && a > M.thr && hitEffect[k]).length, actives = hitEffect.filter(Boolean).length;
      const zq = M.z >= 0.5 ? 'excellent assay' : M.z > 0 ? 'marginal' : 'controls overlap';
      out.innerHTML = `<span>Z′ <b class="${M.z < 0.5 ? 'warn' : ''}">${M.z.toFixed(2)}</b> (${zq})</span><span>hits called <b>${called}</b></span><span>true actives found <b>${tp} of ${actives}</b></span><span>false positives <b class="${called - tp ? 'warn' : ''}">${called - tp}</b></span>`;
    }
    Lab.slider(Lab.$('#zp-w', root), (v) => Math.round(v * 100) + '%', (v) => { st.win = v; draw(); });
    Lab.slider(Lab.$('#zp-cv', root), (v) => v + '%', (v) => { st.cv = v; draw(); });
    Lab.$('#zp-edge', root).addEventListener('change', (e) => { st.edge = e.target.checked; draw(); });
    Lab.$('#zp-fix', root).addEventListener('change', (e) => { st.correct = e.target.checked; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(wrap, draw);
  })();
})();
