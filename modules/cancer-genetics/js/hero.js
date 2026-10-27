/* Volume XV hero: a clone under selection. A single cell divides into a population; every division
   adds passenger mutations at the per-division rate, and from time to time a driver appears whose
   descendants grow faster and sweep the population. The counters are the real quantities a
   sequencing study reports: mutations in the founding cell, mutations in the dominant clone, and
   how many of them are under selection. */
(function () {
  const root = Lab.$('#hero-clone');
  if (!root) return;
  const cv = Lab.$('canvas', root);
  const SEED = 20260426;
  const U = 1e-9;                        // point mutations per base per division (Bozic et al. 2013)
  const GENOME = 3.1e9;
  const PER_DIV = U * GENOME;            // about 3 mutations per division, genome-wide
  const N = 900;                         // cells drawn
  const COLS = 45;
  const DRIVERS = ['APC', 'KRAS', 'SMAD4', 'TP53'];
  const HOLD = 3.1;                      // seconds a stage is held

  // Build the whole history once, deterministically, so the picture is identical on every load.
  const build = () => {
    const r = Lab.rng(SEED);
        const stages = [];
    let gen = 0, clones = [{ id: 0, drv: 0, mut: Math.round(PER_DIV), frac: 1, born: 0 }];
    for (let s = 0; s < DRIVERS.length + 1; s++) {
      gen += s === 0 ? 24 : 16 + Math.floor(r() * 8);
      // every clone gains passengers with each division
      clones = clones.map((c) => ({ ...c, mut: c.mut + Math.round((s === 0 ? 24 : 16) * PER_DIV) }));
      if (s > 0) {
        const parent = clones[clones.length - 1];
        clones = clones.concat([{ id: s, drv: s, mut: parent.mut + Math.round(PER_DIV), frac: 0, born: gen }]);
      }
      // the newest clone sweeps: it takes a large share, the rest keep what is left
      const share = s === 0 ? [1] : [0.07, 0.11, 0.16, 0.66].slice(0, clones.length - 1).concat([0]);
      let rest = 1;
      if (s > 0) {
        const sweep = 0.52 + 0.1 * r();
        clones[clones.length - 1].frac = sweep;
        rest = 1 - sweep;
        const old = clones.slice(0, -1);
        const tot = old.reduce((a, c) => a + Math.max(0.02, c.frac), 0) || 1;
        old.forEach((c) => { c.frac = (Math.max(0.02, c.frac) / tot) * rest; });
      }
      void share;
      stages.push({ gen, clones: clones.map((c) => ({ ...c })) });
    }
    // assign each drawn cell to a clone, stage by stage, keeping cells in place where possible
    stages.forEach((st) => {
      const cells = new Array(N).fill(0);
      let i = 0;
      st.clones.forEach((c, ci) => { const n = Math.round(c.frac * N); for (let k = 0; k < n && i < N; k++, i++) cells[i] = ci; });
      while (i < N) { cells[i] = st.clones.length - 1; i++; }
      // lay the clones out as contiguous patches: score every position with a smooth field and
      // hand the lowest scores to the newest clone, so each sweep spreads from the same place
      const field = [];
      for (let k = 0; k < N; k++) {
        const x = (k % COLS) / COLS, y = Math.floor(k / COLS) / (N / COLS);
        field.push([k, Math.sin(6.1 * x + 1.3) * 0.6 + Math.sin(4.7 * y + 2.2) * 0.5 + Math.sin(3.1 * (x + y) + 0.4) * 0.4 + Math.sin(9.3 * (x - y) - 1.1) * 0.22]);
      }
      field.sort((a, b) => a[1] - b[1]);
      const order = cells.slice().sort((a, b) => b - a);
      field.forEach(([k], i) => { cells[k] = order[i]; });
      st.cells = cells;
    });
    return stages;
  };
  const STAGES = build();

  let clock = (STAGES.length - 1) * HOLD, running = false, raf = 0, last = 0;

  function draw() {
    if (!cv.clientWidth) return;
    const narrow = cv.clientWidth < 660;
    const { ctx, w, h } = Lab.canvas(cv, narrow ? 1.2 : 0.42), pal = Lab.palette();
    ctx.clearRect(0, 0, w, h);
    const accent = Lab.rgb('--accent'), signal = Lab.rgb('--signal'), ink3 = Lab.rgb('--ink-3'), grid = Lab.rgb('--grid');
    const si = Math.min(STAGES.length - 1, Math.floor(clock / HOLD));
    const st = STAGES[si];
    const frac = Math.min(1, (clock - si * HOLD) / (HOLD * 0.5));

    // the cell grid
    const gx0 = narrow ? 14 : 18, gw = narrow ? w - 28 : w * 0.49;
    const cell = gw / COLS, rows = Math.ceil(N / COLS);
    const gy0 = narrow ? 16 : Math.max(14, (h - rows * cell) / 2);
    for (let i = 0; i < N; i++) {
      const cx = gx0 + (i % COLS) * cell, cy = gy0 + Math.floor(i / COLS) * cell;
      const ci = st.cells[i];
      const prev = si > 0 ? STAGES[si - 1].cells[i] : 0;
      const t = ci === prev ? 1 : frac;
      const col = ci === 0 ? grid : Lab.mix(grid, ci === st.clones.length - 1 ? signal : accent, 0.25 + 0.75 * (ci / Math.max(1, st.clones.length - 1)));
      ctx.fillStyle = Lab.rgbStr(Lab.mix(ci === prev ? col : Lab.mix(grid, col, 0.3), col, t), 0.95);
      ctx.fillRect(cx + 0.6, cy + 0.6, cell - 1.2, cell - 1.2);
    }

    // the text column
    const tx = narrow ? 14 : w * 0.56, maxW = narrow ? w - 28 : w - tx - 16;
    let ty = narrow ? gy0 + rows * cell + 34 : Math.max(26, h * 0.2);
    const top = st.clones[st.clones.length - 1];
    ctx.fillStyle = pal.accent; ctx.font = `600 ${narrow ? 26 : 34}px ${Lab.css('--f-display')}`;
    ctx.fillText(si === 0 ? 'One cell' : `${si} driver${si > 1 ? 's' : ''}`, tx, ty);
    ctx.fillStyle = pal.ink2; ctx.font = `${narrow ? 12 : 13}px ${Lab.css('--f-body')}`;
    const msg = si === 0
      ? 'A clone of normal cells, dividing. Each division adds about three mutations somewhere in the genome, and none of them does anything.'
      : `${DRIVERS[si - 1]} has been hit: a mutation that helps. Its descendants grow faster than their neighbours and take over the tissue. Drivers so far: ${DRIVERS.slice(0, si).join(', ')}.`;
    const words = msg.split(' '); let line = '', ly = ty + 22;
    words.forEach((wd) => { const t2 = line ? line + ' ' + wd : wd; if (ctx.measureText(t2).width > maxW) { ctx.fillText(line, tx, ly); ly += 17; line = wd; } else line = t2; });
    ctx.fillText(line, tx, ly);

    // counters
    const rowsOut = [
      ['GENERATIONS', st.gen.toLocaleString('en-US')],
      ['MUTATIONS IN THE DOMINANT CLONE', top.mut.toLocaleString('en-US')],
      ['OF THOSE, UNDER SELECTION', String(si)],
    ];
    let ry = ly + 28;
    ctx.font = `11px ${Lab.css('--f-mono')}`;
    rowsOut.forEach(([k, v]) => {
      ctx.fillStyle = pal.ink3; ctx.fillText(k, tx, ry);
      ctx.fillStyle = si > 0 && k[0] === 'O' ? pal.signal : pal.ink;
      ctx.font = `500 ${narrow ? 17 : 20}px ${Lab.css('--f-mono')}`;
      ctx.fillText(v, tx, ry + 22);
      ctx.font = `11px ${Lab.css('--f-mono')}`;
      ry += 44;
    });
    ctx.fillStyle = Lab.rgbStr(ink3, 1);
    ctx.fillText('one square = one cell', gx0, gy0 + rows * cell + 16);
  }

  const loop = (now) => {
    if (!running) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
    clock = (clock + dt) % (STAGES.length * HOLD + 1.6);
    draw(); raf = requestAnimationFrame(loop);
  };
  draw();
  if (!Lab.reducedMotion) Lab.whenVisible(cv, () => { if (!running) { running = true; last = 0; raf = requestAnimationFrame(loop); } }, () => { running = false; cancelAnimationFrame(raf); });
  Lab.onTheme(draw); Lab.onResize(cv, draw);
})();
