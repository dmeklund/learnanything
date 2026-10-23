/* Volume IV, analysis figures: coverage, alignment, assembly, variant calling. */
(function () {
  /* ---------- Fig 8.1 Coverage and the Lander–Waterman model ---------- */
  (function () {
    const root = Lab.$('#fig-coverage');
    if (!root) return;
    const cv = Lab.$('canvas', root), out = Lab.$('.readouts', root);
    const G = 20000, st = { c: 3, len: 150, bias: false };
    let ready = false;
    // A smooth random "coverage propensity" along the genome, standing in for GC and PCR bias.
    const prop = (() => {
      const r = Lab.rng(12), p = new Float64Array(G);
      let v = 0;
      for (let i = 0; i < G; i++) { v = 0.995 * v + 0.1 * Lab.gauss(r); p[i] = v; }
      let mx = 0; for (let i = 0; i < G; i++) { p[i] = Math.exp(0.9 * p[i] / 1.4); mx = Math.max(mx, p[i]); }
      const cum = new Float64Array(G); let s = 0; for (let i = 0; i < G; i++) { s += p[i]; cum[i] = s; }
      return { cum, total: s };
    })();
    function simulate() {
      const n = Math.max(1, Math.round((st.c * G) / st.len)), r = Lab.rng(3), diff = new Int32Array(G + 1);
      for (let k = 0; k < n; k++) {
        let s;
        if (st.bias) {
          const u = r() * prop.total; let lo = 0, hi = G - 1;
          while (lo < hi) { const m = (lo + hi) >> 1; if (prop.cum[m] < u) lo = m + 1; else hi = m; }
          s = lo;
        } else s = Math.floor(r() * G);
        // Circular genome so the ends behave like the middle
        diff[s]++; const e = s + st.len;
        if (e <= G) diff[e]--; else { diff[G]--; diff[0]++; diff[e - G]--; }
      }
      const depth = new Int32Array(G); let d = 0;
      for (let i = 0; i < G; i++) { d += diff[i]; depth[i] = d; }
      return { n, depth };
    }
    const poisson = (k, lam) => { let lp = -lam + k * Math.log(lam); for (let i = 2; i <= k; i++) lp -= Math.log(i); return Math.exp(lp); };
    function draw() {
      if (!ready) return;
      const { ctx, w, h } = Lab.canvas(cv, (cv.clientWidth || 600) < 560 ? 0.9 : 0.46), pal = Lab.palette(), S = simulate();
      ctx.clearRect(0, 0, w, h);
      const padL = 40, padR = 10, pw = w - padL - padR, t1 = 20, h1 = h * 0.4, t2 = t1 + h1 + 52, h2 = h - t2 - 24;
      const cMean = (S.n * st.len) / G, ymax = Math.max(4, Math.ceil(cMean * 2.6));
      ctx.font = `11px ${Lab.css('--f-mono')}`; ctx.fillStyle = pal.ink2; ctx.fillText(`Depth along a ${G / 1000} kb genome`, padL, t1 - 6);
      ctx.fillStyle = Lab.rgbStr(Lab.rgb('--s1'), 0.85); ctx.beginPath(); ctx.moveTo(padL, t1 + h1);
      const step = G / pw;
      for (let px = 0; px <= pw; px++) {
        let m = 0; const a = Math.floor(px * step), b = Math.min(G, Math.floor((px + 1) * step));
        for (let i = a; i < Math.max(a + 1, b); i++) m += S.depth[Math.min(G - 1, i)];
        m /= Math.max(1, b - a);
        ctx.lineTo(padL + px, t1 + h1 - Math.min(1, m / ymax) * h1);
      }
      ctx.lineTo(padL + pw, t1 + h1); ctx.closePath(); ctx.fill();
      // Uncovered stretches
      let gaps = 0, zero = 0;
      ctx.fillStyle = pal.s3;
      for (let i = 0; i < G; i++) {
        if (S.depth[i] === 0) { zero++; if (i === 0 || S.depth[i - 1] > 0) gaps++; ctx.fillRect(padL + i / step, t1 + h1 + 4, Math.max(1, 1 / step), 8); }
      }
      ctx.strokeStyle = pal.ink3; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(padL, t1 + h1 - (cMean / ymax) * h1); ctx.lineTo(padL + pw, t1 + h1 - (cMean / ymax) * h1); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = pal.ink3; ctx.textAlign = 'right'; ctx.fillText(ymax + '×', padL - 6, t1 + 8); ctx.fillText('0', padL - 6, t1 + h1); ctx.textAlign = 'left';
      ctx.fillStyle = pal.ink2; ctx.fillText('uncovered', padL, t1 + h1 + 24);
      // Histogram of depth versus Poisson
      const kmax = Math.max(6, Math.ceil(cMean + 4 * Math.sqrt(cMean) + 2)), hist = new Float64Array(kmax + 1);
      for (let i = 0; i < G; i++) hist[Math.min(kmax, S.depth[i])]++;
      let hmax = 0; for (let k = 0; k <= kmax; k++) { hist[k] /= G; hmax = Math.max(hmax, hist[k], poisson(k, cMean)); }
      ctx.fillStyle = pal.ink2; ctx.fillText('Fraction of bases at each depth: simulated (bars) and Poisson (dots)', padL, t2 - 8);
      const bw = pw / (kmax + 1);
      for (let k = 0; k <= kmax; k++) {
        const hh = (hist[k] / hmax) * h2;
        ctx.fillStyle = k === 0 ? pal.s3 : Lab.rgbStr(Lab.rgb('--s1'), 0.55); ctx.fillRect(padL + k * bw + 1, t2 + h2 - hh, Math.max(1, bw - 2), hh);
        const pv = poisson(k, cMean); ctx.fillStyle = pal.ink; ctx.beginPath(); ctx.arc(padL + (k + 0.5) * bw, t2 + h2 - (pv / hmax) * h2, 3, 0, 7); ctx.fill();
      }
      ctx.fillStyle = pal.ink3; ctx.textAlign = 'center';
      for (let k = 0; k <= kmax; k += Math.max(1, Math.ceil(kmax / 12))) ctx.fillText(k, padL + (k + 0.5) * bw, t2 + h2 + 14);
      ctx.textAlign = 'left';
      const pz = Math.exp(-cMean);
      out.innerHTML = `<span>reads <b>${Lab.fmt.si(S.n)}</b></span><span>mean depth <b>${cMean.toFixed(1)}×</b></span><span>uncovered <b>${(100 * zero / G).toFixed(2)}%</b> (Poisson ${(100 * pz).toPrecision(2)}%)</span><span>gaps <b>${gaps}</b> (Lander–Waterman ≈ ${(S.n * pz).toPrecision(2)})</span>`;
    }
    Lab.slider(Lab.$('#cv-c', root), (v) => v + '×', (v) => { st.c = v; draw(); });
    Lab.slider(Lab.$('#cv-l', root), (v) => v + ' bp', (v) => { st.len = v; draw(); });
    Lab.$('#cv-bias', root).addEventListener('change', (e) => { st.bias = e.target.checked; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(cv, draw);
  })();

  /* ---------- Fig 9.1 Burrows–Wheeler backward search ---------- */
  (function () {
    const root = Lab.$('#fig-bwt');
    if (!root) return;
    const tIn = Lab.$('#bw-text', root), pIn = Lab.$('#bw-pat', root), sIn = Lab.$('#bw-step', root), tbl = Lab.$('.bwt-table', root), steps = Lab.$('.bwt-steps', root), out = Lab.$('.readouts', root);
    function build() {
      const T = (tIn.value.toUpperCase().replace(/[^ACGT]/g, '').slice(0, 20) || 'GATTACA') + '$';
      const n = T.length, rows = [];
      for (let i = 0; i < n; i++) rows.push({ i, rot: T.slice(i) + T.slice(0, i) });
      rows.sort((a, b) => (a.rot < b.rot ? -1 : a.rot > b.rot ? 1 : 0));
      const L = rows.map((r) => r.rot[n - 1]).join(''), F = rows.map((r) => r.rot[0]).join('');
      const C = {}; let acc = 0;
      ['$', 'A', 'C', 'G', 'T'].forEach((c) => { C[c] = acc; acc += [...T].filter((x) => x === c).length; });
      const occ = (c, k) => { let s = 0; for (let j = 0; j < k; j++) if (L[j] === c) s++; return s; };
      return { T, n, rows, L, F, C, occ };
    }
    function draw() {
      const B = build(), P = pIn.value.toUpperCase().replace(/[^ACGT]/g, '').slice(0, 8) || 'A';
      sIn.max = P.length;
      const stepN = Math.min(P.length, parseInt(sIn.value, 10));
      Lab.$('output', sIn.closest('.ctl')).textContent = `${stepN} of ${P.length}`;
      // Backward search: process the pattern from its last character.
      let sp = 0, ep = B.n; const hist = [{ c: '', sp, ep }];
      for (let k = P.length - 1; k >= 0 && sp < ep; k--) {
        const c = P[k]; sp = B.C[c] + B.occ(c, sp); ep = B.C[c] + B.occ(c, ep); hist.push({ c, sp, ep });
      }
      const cur = hist[Math.min(stepN, hist.length - 1)], done = P.slice(P.length - stepN);
      tbl.innerHTML = `<table class="data bwt"><thead><tr><th>Row</th><th>SA</th><th>F</th><th>Sorted rotation</th><th>L</th></tr></thead><tbody>${B.rows.map((r, j) => {
        const on = j >= cur.sp && j < cur.ep, mid = r.rot.slice(1, -1);
        const lead = on && done.length ? `<b class="hit">${r.rot.slice(0, done.length)}</b>${r.rot.slice(done.length, -1)}` : `<span class="F">${r.rot[0]}</span>${mid}`;
        return `<tr class="${on ? 'in' : ''}"><td>${j}</td><td>${r.i}</td><td>${r.rot[0]}</td><td class="rot">${lead}</td><td class="Lc">${r.rot[B.n - 1]}</td></tr>`;
      }).join('')}</tbody></table>`;
      steps.innerHTML = hist.slice(0, stepN + 1).map((s, k) => k === 0
        ? `<li>Start with every row: range [0, ${B.n}).</li>`
        : `<li>Prepend <b>${s.c}</b>: rows [${B.C[s.c]} + occ(${s.c}, ${hist[k - 1].sp}), ${B.C[s.c]} + occ(${s.c}, ${hist[k - 1].ep})) = <b>[${s.sp}, ${s.ep})</b> → ${Math.max(0, s.ep - s.sp)} match${s.ep - s.sp === 1 ? '' : 'es'} of “${P.slice(P.length - k)}”</li>`).join('');
      const final = hist[hist.length - 1], found = hist.length - 1 === P.length && final.ep > final.sp;
      const pos = found ? B.rows.slice(final.sp, final.ep).map((r) => r.i).sort((a, b) => a - b) : [];
      out.innerHTML = `<span>BWT (column L) <b class="mono">${B.L}</b></span><span>“${P}” occurs <b>${pos.length}</b> time${pos.length === 1 ? '' : 's'}${pos.length ? ` at position ${pos.join(', ')}` : ''}</span>`;
    }
    [tIn, pIn].forEach((el) => el.addEventListener('input', () => { sIn.value = sIn.max = (pIn.value.replace(/[^ACGTacgt]/g, '').length || 1); draw(); }));
    sIn.addEventListener('input', draw);
    draw();
  })();

  /* ---------- Fig 10.1 Assembly with a de Bruijn graph ---------- */
  (function () {
    const root = Lab.$('#fig-dbg');
    if (!root) return;
    const wrap = Lab.$('.chart-wrap', root), svg = Lab.$('svg', root), tip = Lab.tip(wrap), tIn = Lab.$('#db-text', root), out = Lab.$('.readouts', root);
    let k = 5, ready = false;
    const longestRepeat = (s) => {
      let best = 0;
      for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) { let l = 0; while (j + l < s.length && s[i + l] === s[j + l]) l++; best = Math.max(best, l); }
      return best;
    };
    function draw() {
      if (!ready) return;
      const pal = Lab.palette(), s = tIn.value.toUpperCase().replace(/[^ACGT]/g, '').slice(0, 60);
      const W = Math.max(300, Math.round(wrap.clientWidth || 640));
      svg.innerHTML = '';
      if (s.length < k) { svg.setAttribute('viewBox', `0 0 ${W} 60`); svg.setAttribute('height', 60); out.innerHTML = '<span>Enter a sequence longer than k.</span>'; return; }
      // Nodes are (k-1)-mers; each k-mer in the sequence is an edge.
      const order = [], idx = new Map(), edges = new Map();
      for (let i = 0; i + k - 1 <= s.length; i++) { const m = s.slice(i, i + k - 1); if (!idx.has(m)) { idx.set(m, order.length); order.push(m); } }
      for (let i = 0; i + k <= s.length; i++) {
        const a = idx.get(s.slice(i, i + k - 1)), b = idx.get(s.slice(i + 1, i + k)), key = a + '>' + b;
        edges.set(key, { a, b, n: (edges.get(key)?.n || 0) + 1, kmer: s.slice(i, i + k) });
      }
      const outd = new Array(order.length).fill(0), ind = new Array(order.length).fill(0);
      edges.forEach((e) => { outd[e.a]++; ind[e.b]++; });
      const branch = order.map((_, i) => outd[i] > 1 || ind[i] > 1);
      // Serpentine layout in order of first appearance along the sequence.
      const fs = 11, cw = 6.9, nodeW = (k - 1) * cw + 12, gapX = 26, perRow = Math.max(2, Math.floor((W - 20 + gapX) / (nodeW + gapX))), rowH = 120, top = 104;
      const rows = Math.ceil(order.length / perRow), H = top + (rows - 1) * rowH + 30;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H);
      const used = perRow * (nodeW + gapX) - gapX, ox = (W - Math.min(used, order.length * (nodeW + gapX) - gapX)) / 2;
      const pos = order.map((_, i) => {
        const r = Math.floor(i / perRow), c = i % perRow, cc = r % 2 ? perRow - 1 - c : c;
        return { x: ox + cc * (nodeW + gapX) + nodeW / 2, y: top + r * rowH };
      });
      const defs = Lab.svg('defs', {}, svg);
      const mk = Lab.svg('marker', { id: 'dbg-arrow', viewBox: '0 0 8 8', refX: 7, refY: 4, markerWidth: 8, markerHeight: 8, markerUnits: 'userSpaceOnUse', orient: 'auto-start-reverse' }, defs);
      Lab.svg('path', { d: 'M0 0 L8 4 L0 8 Z', fill: pal.ink3 }, mk);
      const mk2 = Lab.svg('marker', { id: 'dbg-arrow2', viewBox: '0 0 8 8', refX: 7, refY: 4, markerWidth: 8, markerHeight: 8, markerUnits: 'userSpaceOnUse', orient: 'auto-start-reverse' }, defs);
      Lab.svg('path', { d: 'M0 0 L8 4 L0 8 Z', fill: pal.accent }, mk2);
      edges.forEach((e) => {
        const A = pos[e.a], Bp = pos[e.b], back = e.b <= e.a || Math.abs(e.b - e.a) > 1;
        const dx = Bp.x - A.x, dy = Bp.y - A.y, len = Math.hypot(dx, dy) || 1;
        const trim = (p, q, d) => ({ x: p.x + (q.x - p.x) * d, y: p.y + (q.y - p.y) * d });
        let d;
        if (e.a === e.b) d = `M${A.x - 8} ${A.y - 11} C${A.x - 30} ${A.y - 50} ${A.x + 30} ${A.y - 50} ${A.x + 8} ${A.y - 11}`;
        else if (!back) {
          const ux = dx / len, uy = dy / len, hx = Math.abs(ux) > 0.5 ? nodeW / 2 + 2 : 13, p0 = { x: A.x + ux * hx, y: A.y + uy * (Math.abs(uy) > 0.5 ? 13 : hx) }, p1 = { x: Bp.x - ux * hx, y: Bp.y - uy * (Math.abs(uy) > 0.5 ? 13 : hx) };
          d = `M${p0.x} ${p0.y} L${p1.x} ${p1.y}`;
        } else {
          // Edges that jump back or across rows curve above the row
          const bend = Math.min(90, 26 + len * 0.18), mx = (A.x + Bp.x) / 2, my = Math.min(A.y, Bp.y) - bend;
          const p0 = trim(A, { x: mx, y: my }, 13 / Math.hypot(mx - A.x, my - A.y)), p1 = trim(Bp, { x: mx, y: my }, 13 / Math.hypot(mx - Bp.x, my - Bp.y));
          d = `M${p0.x} ${p0.y} Q${mx} ${my} ${p1.x} ${p1.y}`;
        }
        const hot = branch[e.a] || branch[e.b];
        const path = Lab.svg('path', { d, fill: 'none', stroke: back ? pal.accent : pal.ink3, 'stroke-width': e.n > 1 ? 2.5 : 1.3, 'marker-end': `url(#${back ? 'dbg-arrow2' : 'dbg-arrow'})`, opacity: hot || !back ? 1 : 0.8 }, svg);
        path.addEventListener('pointermove', (ev) => { const r = svg.getBoundingClientRect(), sc = r.width / W; tip.show(ev.clientX - r.left, ev.clientY - r.top, `<b>${e.kmer}</b><br>k-mer seen ${e.n} time${e.n > 1 ? 's' : ''}`); });
        path.addEventListener('pointerleave', () => tip.hide());
      });
      order.forEach((m, i) => {
        const p = pos[i];
        Lab.svg('rect', { x: p.x - nodeW / 2, y: p.y - 11, width: nodeW, height: 22, rx: 4, fill: branch[i] ? pal.accent : pal.paper3, stroke: branch[i] ? pal.accent : pal.rule }, svg);
        const t = Lab.svg('text', { x: p.x, y: p.y + 4, 'text-anchor': 'middle', 'font-size': fs, fill: branch[i] ? pal.paper3 : pal.ink }, svg); t.textContent = m;
      });
      const R = longestRepeat(s), nb = branch.filter(Boolean).length;
      out.innerHTML = `<span>nodes <b>${order.length}</b></span><span>distinct edges <b>${edges.size}</b></span><span>branching nodes <b>${nb}</b></span><span>longest repeat <b>${R} bp</b>, resolved once k ≥ <b>${R + 2}</b></span><span>${nb ? '<b class="warn">ambiguous: more than one way to walk the graph</b>' : '<b>one path: the sequence is reconstructed</b>'}</span>`;
    }
    tIn.addEventListener('input', draw);
    Lab.slider(Lab.$('#db-k', root), (v) => v, (v) => { k = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(wrap, draw);
  })();

  /* ---------- Fig 11.1 Calling a genotype from a pileup ---------- */
  (function () {
    const root = Lab.$('#fig-pileup');
    if (!root) return;
    const view = Lab.$('.pileup', root), post = Lab.$('.gt-bars', root), out = Lab.$('.readouts', root);
    const ref = NG.randomSeq(31, Lab.rng(8)), C = 15, refB = ref[C], alt = refB === 'A' ? 'G' : refB === 'G' ? 'A' : refB === 'C' ? 'T' : 'C';
    const st = { d: 8, gt: 1, e: 0.01, seed: 1 };
    const PRIOR = [0.9985, 0.001, 0.0005];        // a common prior for a random human site
    function draw() {
      const r = Lab.rng(100 + st.seed), reads = [];
      for (let i = 0; i < st.d; i++) {
        const start = C - Math.floor(r() * 20) - 2, hap = st.gt === 2 || (st.gt === 1 && r() < 0.5) ? 'alt' : 'ref';
        let s = '';
        for (let j = start; j < start + 24; j++) {
          if (j < 0 || j >= ref.length) { s += ' '; continue; }
          let b = j === C && hap === 'alt' ? alt : ref[j];
          if (r() < st.e) { const o = 'ACGT'.replace(b, ''); b = o[Math.floor(r() * 3)]; }
          s += b;
        }
        reads.push({ start, s });
      }
      reads.sort((a, b) => a.start - b.start);
      const row = (cells) => `<div class="pu-row">${cells}</div>`;
      const refRow = row([...ref].map((b, j) => `<span class="pu ${j === C ? 'ctr' : ''}"><span class="nt nt-${b.toLowerCase()}">${b}</span></span>`).join(''));
      const readRows = reads.map((rd) => row([...ref].map((rb, j) => {
        const k = j - rd.start, b = k >= 0 && k < rd.s.length ? rd.s[k] : ' ';
        const cls = j === C ? 'pu ctr' : 'pu';
        if (b === ' ') return `<span class="${cls}"></span>`;
        if (b === rb) return `<span class="${cls} m">·</span>`;
        return `<span class="${cls} x"><span class="nt nt-${b.toLowerCase()}">${b}</span></span>`;
      }).join(''))).join('');
      view.innerHTML = `<div class="pu-lab">reference</div>${refRow}<div class="pu-lab">${st.d} reads (· = matches reference)</div>${readRows}`;
      // Genotype likelihoods from the bases observed at the center position
      const obs = reads.map((rd) => rd.s[C - rd.start]).filter((b) => b && b !== ' ');
      const p = (o, x) => (o === x ? 1 - st.e : st.e / 3);
      const ll = [0, 0.5, 1].map((f) => obs.reduce((a, o) => a + Math.log10(f * p(o, alt) + (1 - f) * p(o, refB)), 0));
      const lp = ll.map((l, i) => l + Math.log10(PRIOR[i])), mx = Math.max(...lp), z = lp.reduce((a, l) => a + Math.pow(10, l - mx), 0);
      const P = lp.map((l) => Math.pow(10, l - mx) / z), best = P.indexOf(Math.max(...P));
      const llmx = Math.max(...ll), PL = ll.map((l) => Math.round(-10 * (l - llmx)));
      const names = [`${refB}/${refB} (0/0)`, `${refB}/${alt} (0/1)`, `${alt}/${alt} (1/1)`];
      post.innerHTML = names.map((n, i) => `<div class="gt${i === best ? ' best' : ''}${i === st.gt ? ' truth' : ''}"><span>${n}${i === st.gt ? ' · true' : ''}</span><span class="track"><span style="width:${(P[i] * 100).toFixed(1)}%"></span></span><b>${(P[i] * 100).toFixed(P[i] > 0.999 || P[i] < 0.001 ? 2 : 1)}%</b><span class="pl">PL ${PL[i]}</span></div>`).join('');
      const nAlt = obs.filter((b) => b === alt).length, gq = Math.min(99, Math.round(-10 * Math.log10(Math.max(1e-10, 1 - P[best]))));
      out.innerHTML = `<span>alt reads <b>${nAlt} of ${obs.length}</b></span><span>call <b>${names[best]}</b></span><span>genotype quality <b>GQ ${gq}</b></span><span>${best === st.gt ? 'correct call' : '<b class="warn">wrong call</b>'}</span>`;
    }
    Lab.slider(Lab.$('#pu-d', root), (v) => v + '×', (v) => { st.d = v; draw(); });
    Lab.slider(Lab.$('#pu-e', root), (v) => v.toFixed(1) + '%', (v) => { st.e = v / 100; draw(); });
    Lab.$('#pu-gt', root).addEventListener('change', (e) => { st.gt = parseInt(e.target.value, 10); draw(); });
    Lab.$('#pu-new', root).addEventListener('click', () => { st.seed++; draw(); });
    draw();
    Lab.onTheme(draw);
  })();
})();
