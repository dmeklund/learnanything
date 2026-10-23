/* Volume IV, chemistry figures: sequencing by synthesis and base quality. */
(function () {
  /* ---------- Fig 6.1 Phasing: why reads have a length limit ---------- */
  (function () {
    const root = Lab.$('#fig-sbs');
    if (!root) return;
    const cv = Lab.$('canvas', root), out = Lab.$('.readouts', root);
    const LMAX = 300, tmpl = NG.randomSeq(LMAX + 2, Lab.rng(5)), noiseDraw = [];
    const nr = Lab.rng(77);
    for (let i = 0; i < LMAX * 4; i++) noiseDraw.push(Lab.gauss(nr));
    const st = { p: 0.003, q: 0.0015, sigma: 0.05, len: 150, fix: false };
    let ready = false;
    const DECAY = 0.004;                  // fraction of signal lost per cycle (dye and strand loss)

    function simulate() {
      const { p, q, sigma, len, fix } = st;
      let w = new Float64Array(LMAX + 3); w[0] = 1;
      const cyc = [];
      for (let k = 1; k <= len; k++) {
        const nw = new Float64Array(LMAX + 3), I = { A: 0, C: 0, G: 0, T: 0 };
        let inPhase = 0;
        for (let j = 0; j <= LMAX; j++) {
          if (!w[j]) continue;
          nw[j] += w[j] * p;                                   // lag: no base added, no new dye
          const one = w[j] * (1 - p - q), two = w[j] * q;
          nw[j + 1] += one; nw[j + 2] += two;
          // Off-phase strands report the wrong position; correction removes most of their signal.
          const k1 = j + 1 === k ? 1 : fix ? 0.1 : 1, k2 = j + 2 === k ? 1 : fix ? 0.1 : 1;
          I[tmpl[j]] += one * k1; I[tmpl[j + 1]] += two * k2;
          if (j + 1 === k) inPhase += one;
          if (j + 2 === k) inPhase += two;
        }
        w = nw;
        const amp = Math.pow(1 - DECAY, k);
        NG.BASES.split('').forEach((b) => { I[b] *= amp; });
        const t = tmpl[k - 1];
        let perr = 0;
        NG.BASES.split('').forEach((b) => { if (b !== t) perr += NG.normTail((I[t] - I[b]) / (sigma * Math.SQRT2)); });
        perr = Math.min(0.75, perr);
        // One noisy realisation of the read, for the strip of calls.
        let call = 'A', best = -Infinity;
        NG.BASES.split('').forEach((b, bi) => { const v = I[b] + sigma * noiseDraw[(k - 1) * 4 + bi]; if (v > best) { best = v; call = b; } });
        cyc.push({ I, t, perr, q: Math.min(41, NG.qFromP(perr)), call, inPhase: inPhase * amp });
      }
      return cyc;
    }

    function draw() {
      if (!ready) return;
      const { ctx, w, h } = Lab.canvas(cv, (cv.clientWidth || 600) < 560 ? 0.95 : 0.52), pal = Lab.palette();
      const C = simulate(), L = st.len;
      ctx.clearRect(0, 0, w, h);
      const padL = 40, padR = 10, x0 = padL, pw = w - padL - padR, bw = pw / L;
      const t1 = 18, h1 = h * 0.38, t2 = t1 + h1 + 30, h2 = h * 0.26, t3 = t2 + h2 + 26, h3 = 14;
      ctx.font = `11px ${Lab.css('--f-mono')}`; ctx.fillStyle = pal.ink2;
      ctx.fillText('Four-channel intensity per cycle (in-phase signal outlined)', x0, t1 - 6);
      // Stacked channel intensities
      const ymax = 1;
      C.forEach((c, i) => {
        let y = t1 + h1;
        ['A', 'C', 'G', 'T'].forEach((b) => {
          const hh = (c.I[b] / ymax) * h1;
          ctx.fillStyle = NG.color(b); ctx.fillRect(x0 + i * bw, y - hh, Math.max(0.6, bw - (bw > 3 ? 1 : 0)), hh); y -= hh;
        });
      });
      ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.2; ctx.beginPath();
      C.forEach((c, i) => { const yy = t1 + h1 - c.inPhase * h1; i ? ctx.lineTo(x0 + (i + 0.5) * bw, yy) : ctx.moveTo(x0 + (i + 0.5) * bw, yy); });
      ctx.stroke(); ctx.lineWidth = 1;
      ctx.fillStyle = pal.ink3; ctx.textAlign = 'right'; ctx.fillText('1.0', x0 - 6, t1 + 4); ctx.fillText('0', x0 - 6, t1 + h1); ctx.textAlign = 'left';
      // Quality per cycle
      ctx.fillStyle = pal.ink2; ctx.fillText('Predicted base quality (Phred Q)', x0, t2 - 8);
      const qy = (q) => t2 + h2 - (q / 41) * h2;
      ctx.strokeStyle = pal.grid; [0, 20, 30, 40].forEach((q) => { ctx.beginPath(); ctx.moveTo(x0, qy(q)); ctx.lineTo(x0 + pw, qy(q)); ctx.stroke(); ctx.fillStyle = pal.ink3; ctx.textAlign = 'right'; ctx.fillText(q, x0 - 6, qy(q) + 4); });
      ctx.textAlign = 'left';
      ctx.strokeStyle = pal.ink3; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(x0, qy(30)); ctx.lineTo(x0 + pw, qy(30)); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = pal.s1; ctx.lineWidth = 2; ctx.beginPath();
      C.forEach((c, i) => { i ? ctx.lineTo(x0 + (i + 0.5) * bw, qy(c.q)) : ctx.moveTo(x0 + (i + 0.5) * bw, qy(c.q)); });
      ctx.stroke(); ctx.lineWidth = 1;
      // One simulated read: calls, with errors marked
      ctx.fillStyle = pal.ink2; ctx.fillText('One simulated read (errors marked above)', x0, t3 - 6);
      let errs = 0;
      C.forEach((c, i) => {
        ctx.fillStyle = NG.color(c.call); ctx.fillRect(x0 + i * bw, t3, Math.max(0.6, bw - (bw > 3 ? 1 : 0)), h3);
        if (c.call !== c.t) { errs++; ctx.fillStyle = pal.ink; ctx.fillRect(x0 + i * bw - 0.5, t3 - 5, Math.max(1.5, bw), 4); }
      });
      ctx.fillStyle = pal.ink3; ctx.textAlign = 'center';
      for (let k = 0; k <= L; k += L > 160 ? 50 : 25) ctx.fillText(k || 1, x0 + Math.max(0, k - 0.5) * bw, t3 + h3 + 14);
      ctx.textAlign = 'left';
      const q30 = C.filter((c) => c.q >= 30).length, first = C.findIndex((c) => c.q < 30), exp = C.reduce((a, c) => a + c.perr, 0);
      out.innerHTML = `<span>cycles at Q30 or better <b>${Math.round((q30 / L) * 100)}%</b></span><span>first cycle below Q30 <b>${first < 0 ? 'none' : first + 1}</b></span><span>expected errors per read <b>${exp.toFixed(2)}</b></span><span>errors in this read <b>${errs}</b></span>`;
    }
    Lab.slider(Lab.$('#sb-p', root), (v) => v.toFixed(2) + '%', (v) => { st.p = v / 100; draw(); });
    Lab.slider(Lab.$('#sb-q', root), (v) => v.toFixed(2) + '%', (v) => { st.q = v / 100; draw(); });
    Lab.slider(Lab.$('#sb-n', root), (v) => v.toFixed(3), (v) => { st.sigma = v; draw(); });
    Lab.slider(Lab.$('#sb-l', root), (v) => v + ' cycles', (v) => { st.len = v; draw(); });
    Lab.$('#sb-fix', root).addEventListener('change', (e) => { st.fix = e.target.checked; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(cv, draw);
  })();

  /* ---------- Fig 7.1 Reading a FASTQ record ---------- */
  (function () {
    const root = Lab.$('#fig-fastq');
    if (!root) return;
    const ta = Lab.$('#fq-in', root), view = Lab.$('.fq-view', root), out = Lab.$('.readouts', root);
    function draw() {
      const lines = ta.value.replace(/\r/g, '').split('\n').filter((l, i) => i < 4);
      const [head, seq = '', plus = '', qual = ''] = lines;
      if (!head || head[0] !== '@' || plus[0] !== '+' || seq.length !== qual.length || !seq.length) {
        view.innerHTML = '<p class="fq-err">A FASTQ record has four lines: a header starting with @, the bases, a line starting with +, and one quality character per base. Check that the quality line is as long as the sequence.</p>';
        out.innerHTML = ''; return;
      }
      const qs = [...qual].map((c) => c.charCodeAt(0) - 33);
      const cells = [...seq.toUpperCase()].map((b, i) => {
        const q = qs[i], hgt = Math.max(2, Math.min(42, q)) / 42 * 100;
        return `<div class="fq-cell${q < 20 ? ' low' : ''}" title="position ${i + 1}: ${b}, '${qual[i]}' = ${qual.charCodeAt(i)} − 33 = Q${q}, P(error) = ${Math.pow(10, -q / 10).toPrecision(2)}"><span class="fq-bar"><i style="height:${hgt}%"></i></span><span class="nt nt-${b.toLowerCase()}">${b}</span><span class="fq-ch">${qual[i].replace(/&/, '&amp;').replace(/</, '&lt;')}</span></div>`;
      }).join('');
      view.innerHTML = `<div class="fq-cells">${cells}</div>`;
      const mean = qs.reduce((a, b) => a + b, 0) / qs.length, expErr = qs.reduce((a, q) => a + Math.pow(10, -q / 10), 0);
      const parts = head.slice(1).split(/[: ]/);
      out.innerHTML = `<span>length <b>${seq.length}</b></span><span>mean quality <b>Q${mean.toFixed(1)}</b></span><span>bases at Q30+ <b>${Math.round((qs.filter((q) => q >= 30).length / qs.length) * 100)}%</b></span><span>expected errors <b>${expErr.toFixed(2)}</b></span>` + (parts.length >= 7 ? `<span>instrument <b>${parts[0]}</b> · lane <b>${parts[3]}</b> · tile <b>${parts[4]}</b> · x,y <b>${parts[5]},${parts[6]}</b></span>` : '');
    }
    ta.addEventListener('input', draw);
    draw();
  })();
})();
