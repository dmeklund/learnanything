/* Shared helpers for Volume IV (sequencing) and the opening flow-cell figure. Exposes window.NG. */
(function () {
  const NG = {};
  NG.BASES = 'ACGT';
  NG.color = (b) => Lab.css('--base-' + b.toLowerCase());
  NG.rgb = (b) => Lab.rgb('--base-' + b.toLowerCase());
  NG.scope = () => ({ bg: Lab.css('--scope'), ink: Lab.css('--scope-ink'), ink2: Lab.css('--scope-ink-2') });
  // Random DNA with a given GC fraction (human genome average is about 41%).
  NG.randomSeq = (n, rng, gc = 0.41) => {
    let s = '';
    for (let i = 0; i < n; i++) {
      const r = rng();
      s += r < gc / 2 ? 'G' : r < gc ? 'C' : r < gc + (1 - gc) / 2 ? 'A' : 'T';
    }
    return s;
  };
  NG.comp = { A: 'T', C: 'G', G: 'C', T: 'A' };
  NG.phredChar = (q) => String.fromCharCode(33 + Math.max(0, Math.min(41, Math.round(q))));
  NG.qFromP = (p) => -10 * Math.log10(Math.max(1e-10, p));
  // Complementary error function (Abramowitz & Stegun 7.1.26), for Gaussian tail probabilities.
  NG.erfc = (x) => {
    const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  };
  NG.normTail = (z) => 0.5 * NG.erfc(z / Math.SQRT2);         // P(Z > z)
  // A row of base letters as HTML spans, colored by base.
  NG.spans = (s, cls = '') => [...s].map((b) => `<span class="nt nt-${b.toLowerCase()} ${cls}">${b}</span>`).join('');

  /* ---------- Hero: one tile of a patterned flow cell, imaged cycle by cycle ---------- */
  (function () {
    const root = Lab.$('#hero-flowcell');
    if (!root) return;
    const cv = Lab.$('canvas', root), read = Lab.$('.hero-read', root), cyc = Lab.$('.hero-cycle', root);
    const r = Lab.rng(42), L = 36, wells = [];
    // Hexagonal nanowell grid; about 75% of wells hold a cluster.
    const pitch = 0.042;
    for (let row = 0, y = pitch / 2; y < 1; row++, y += pitch * 0.866) {
      for (let x = (row % 2 ? pitch : pitch / 2); x < 2.6; x += pitch) {
        if (r() < 0.75) wells.push({ x, y, seq: NG.randomSeq(L, r), b: 0.55 + 0.45 * r(), q: Array.from({ length: L }, (_, i) => Math.max(8, 38 - i * 0.12 - (r() < 0.04 ? 20 * r() : 0))) });
      }
    }
    let cycle = 0, sel = wells[Math.floor(wells.length * 0.45)], timer = 0, aspect = 0.5;
    function draw() {
      const { ctx, w, h } = Lab.canvas(cv, aspect), S = NG.scope();
      ctx.fillStyle = S.bg; ctx.fillRect(0, 0, w, h);
      const scale = h, cols = {};
      NG.BASES.split('').forEach((b) => { cols[b] = NG.rgb(b); });
      ctx.globalCompositeOperation = 'lighter';
      wells.forEach((c) => {
        const x = c.x * scale, y = c.y * scale;
        if (x > w + 10) return;
        const base = c.seq[cycle], col = cols[base], a = c.b * 0.9, rad = pitch * scale * 0.42;
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, Lab.rgbStr(Lab.mix(col, [255, 255, 255], 0.35), a));
        g.addColorStop(0.5, Lab.rgbStr(col, a * 0.55));
        g.addColorStop(1, Lab.rgbStr(col, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = S.ink; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(sel.x * scale, sel.y * scale, pitch * scale * 0.62, 0, 7); ctx.stroke();
      ctx.font = `500 11px ${Lab.css('--f-mono')}`; ctx.fillStyle = S.ink2;
      ctx.fillText('tile 1101 · composite of four channels', 8, h - 8);
      cyc.textContent = `cycle ${cycle + 1} of ${L}`;
      // Qualities binned the way current instruments write them: F (Q37), : (Q25), , (Q11)
      const done = sel.seq.slice(0, cycle + 1), qs = sel.q.slice(0, cycle + 1).map((q) => (q >= 30 ? 'F' : q >= 20 ? ':' : ',')).join('');
      read.innerHTML = `<span class="fq-h">@tile1101:${Math.round(sel.x * 1e4)}:${Math.round(sel.y * 1e4)}</span><span>${NG.spans(done)}<span class="pend">${'·'.repeat(L - cycle - 1)}</span></span><span class="fq-h">+</span><span class="fq-q">${qs.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`;
    }
    function step() { cycle = (cycle + 1) % L; draw(); }
    function start() { if (Lab.reducedMotion || timer) return; timer = setInterval(step, 650); }
    function stop() { clearInterval(timer); timer = 0; }
    cv.addEventListener('click', (e) => {
      const rect = cv.getBoundingClientRect(), x = (e.clientX - rect.left) / rect.height, y = (e.clientY - rect.top) / rect.height;
      let best = sel, bd = Infinity;
      wells.forEach((c) => { const d = (c.x - x) ** 2 + (c.y - y) ** 2; if (d < bd) { bd = d; best = c; } });
      sel = best; draw();
    });
    if (Lab.reducedMotion) cycle = 11;
    draw();
    Lab.whenVisible(cv, start, stop);
    Lab.onTheme(draw); Lab.onResize(cv, draw);
  })();

  window.NG = NG;
})();
