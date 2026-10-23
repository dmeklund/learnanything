/* Volume IX figures: a charge in electric and magnetic fields, and the field of a moving charge that suddenly stops. */
(function () {
  const T = (g, x, y, s, fill, anchor, size) => EM.text(g, x, y, s, fill, anchor, size);

  /* ---------- Fig 7.1 The Lorentz force ---------- */
  (function () {
    const root = Lab.$('#fig-lorentz');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root);
    const st = { B: 1, E: 0.3, v: 1 };
    let ready = false;
    function draw() {
      if (!ready) return;
      const W = Math.max(280, svg.clientWidth || 600), H = 340;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H); svg.innerHTML = '';
      const pal = Lab.palette(), g = Lab.svg('g', {}, svg), s = Math.min(W / 16, H / 9), X = (x) => 30 + x * s, Y = (y) => H / 2 - y * s;
      // background: B out of the page as a dot lattice, E as arrows
      for (let i = 0; i < W / s; i++) for (let j = -4; j <= 4; j++) if (st.B > 0.01) Lab.svg('circle', { cx: 30 + i * s, cy: Y(j), r: 1.4 + st.B, fill: pal.grid }, g);
      if (st.E > 0.01) for (let i = 1; i < W / s; i += 3) { Lab.svg('line', { x1: X(i), y1: Y(-3.5), x2: X(i), y2: Y(-3.5 + 0.6 + st.E), stroke: pal.ink3, 'stroke-width': 1.5, 'marker-end': 'url(#lz-ar)' }, g); }
      const defs = Lab.svg('defs', {}, svg), mk = Lab.svg('marker', { id: 'lz-ar', viewBox: '0 0 8 8', refX: 7, refY: 4, markerWidth: 6, markerHeight: 6, markerUnits: 'userSpaceOnUse', orient: 'auto' }, defs);
      Lab.svg('path', { d: 'M0 0L8 4L0 8z', fill: pal.ink3 }, mk);
      const dt = 0.01, n = 2600, pts = EM.boris([0, 0], [st.v, 0], [0, st.E], st.B, dt, n);
      const vis = []; for (const p of pts) { if (X(p[0]) > W + 10 || Math.abs(p[1]) > 4.3 || X(p[0]) < -10) break; vis.push(p); }
      Lab.svg('path', { d: EM.path(vis, X, Y), fill: 'none', stroke: pal.s2, 'stroke-width': 2 }, g);
      Lab.svg('circle', { cx: X(0), cy: Y(0), r: 5, fill: pal.s2 }, g);
      T(g, 8, 16, `B ${st.B > 0.01 ? 'out of the page (dots)' : 'off'}`, pal.ink2, 'start', 10.5);
      T(g, 8, 32, `E ${st.E > 0.01 ? 'upward (arrows)' : 'off'}`, pal.ink2, 'start', 10.5);
      T(g, X(0) + 8, Y(0) + 18, 'start', pal.ink2, 'start', 10.5);
      const r = st.B > 0.01 ? st.v / st.B : Infinity, drift = st.B > 0.01 ? st.E / st.B : NaN;
      out.innerHTML = `<span>radius of the circle with E off, mv/qB <b>${isFinite(r) ? r.toFixed(2) : '∞'}</b></span><span>period 2πm/qB <b>${st.B > 0.01 ? ((2 * Math.PI) / st.B).toFixed(2) : '∞'}</b></span><span>drift speed E/B <b>${isFinite(drift) ? drift.toFixed(2) : '—'}</b>, direction E × B</span>`;
    }
    Lab.slider(Lab.$('#lz-b', root), (v) => v.toFixed(2), (v) => { st.B = v; draw(); });
    Lab.slider(Lab.$('#lz-e', root), (v) => v.toFixed(2), (v) => { st.E = v; draw(); });
    Lab.slider(Lab.$('#lz-v', root), (v) => v.toFixed(2), (v) => { st.v = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();

  /* ---------- Fig 8.1 A charge that stops: the kink is the radiation ---------- */
  (function () {
    const root = Lab.$('#fig-kink');
    if (!root) return;
    const cv = Lab.$('canvas', root), out = Lab.$('.readouts', root);
    const st = { beta: 0.7, t: 1.6, stop: true };
    const TAU = 0.15; // duration of the deceleration (c = 1)
    function draw() {
      if (!cv.clientWidth) return;
      const narrow = cv.clientWidth < 560, { ctx, w, h } = Lab.canvas(cv, narrow ? 0.8 : 0.52), pal = Lab.palette();
      ctx.clearRect(0, 0, w, h);
      const s = Math.min(w / 7.6, h / 4.6), ox = w * 0.42, oy = h / 2, X = (x) => ox + x * s, Y = (y) => oy - y * s;
      const g = 1 / Math.sqrt(1 - st.beta * st.beta), NL = 28, t = st.t;
      // light spheres
      if (st.stop) {
        ctx.fillStyle = Lab.rgbStr(Lab.rgb('--s2'), 0.08); ctx.beginPath(); ctx.arc(X(0), Y(0), t * s, 0, 7); ctx.arc(X(0), Y(0), Math.max(0, t - TAU) * s, 0, 7, true); ctx.fill();
        ctx.strokeStyle = pal.rule; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(X(0), Y(0), t * s, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.strokeStyle = pal.ink2; ctx.lineWidth = 1.1;
      const far = 12;
      for (let k = 0; k < NL; k++) {
        const a = ((k + 0.5) / NL) * 2 * Math.PI; // rest-frame angle
        const th = Math.atan2(Math.sin(a) * g, Math.cos(a)); // lines of a moving charge crowd toward the perpendicular
        ctx.beginPath();
        if (!st.stop) {
          const px = st.beta * t; ctx.moveTo(X(px), Y(0)); ctx.lineTo(X(px + far * Math.cos(th)), Y(far * Math.sin(th)));
        } else {
          const r1 = Math.max(0, t - TAU), px = st.beta * t;
          // inner part: static field of the stopped charge
          ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(r1 * Math.cos(a)), Y(r1 * Math.sin(a)));
          // outer part: field of a charge still moving, pointing from where it would be now
          const dx = Math.cos(th), dy = Math.sin(th), b = px * dx, c2 = px * px - t * t, L = -b + Math.sqrt(b * b - c2);
          const sx = px + L * dx, sy = L * dy;
          ctx.lineTo(X(sx), Y(sy)); ctx.lineTo(X(sx + far * dx), Y(sy + far * dy));
        }
        ctx.stroke();
      }
      // the charge, and where it would have been
      ctx.fillStyle = pal.s2; ctx.beginPath(); ctx.arc(X(st.stop ? 0 : st.beta * t), Y(0), 6, 0, 7); ctx.fill();
      if (st.stop) { ctx.strokeStyle = pal.s2; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.arc(X(st.beta * t), Y(0), 5, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
      ctx.font = `11px ${Lab.css('--f-mono')}`; ctx.fillStyle = pal.ink2;
      ctx.fillText(st.stop ? 'charge stopped at the centre at time 0' : `charge moving right at ${st.beta.toFixed(2)}c`, 8, 16);
      if (st.stop) { ctx.fillText('dashed circle: light has travelled ct since the stop', 8, 32); ctx.fillText('dotted ring: where it would be now', X(st.beta * t) + 8, Y(0) + 18); }
      out.innerHTML = `<span>γ = 1/√(1 − β²) <b>${g.toFixed(2)}</b></span><span>field beside the charge vs. ahead of it <b>${(g ** 3).toFixed(1)}×</b> stronger (γ³)</span>${st.stop ? `<span>radius of the radiation shell <b>ct = ${t.toFixed(2)}</b></span>` : ''}`;
    }
    Lab.slider(Lab.$('#kk-b', root), (v) => v.toFixed(2) + 'c', (v) => { st.beta = v; draw(); });
    Lab.slider(Lab.$('#kk-t', root), (v) => v.toFixed(2), (v) => { st.t = v; draw(); });
    Lab.$$('[data-kk]', root).forEach((b) => b.addEventListener('click', () => { st.stop = b.dataset.kk === 'stop'; Lab.$$('[data-kk]', root).forEach((o) => o.setAttribute('aria-pressed', o === b ? 'true' : 'false')); draw(); }));
    draw();
    Lab.onTheme(draw); Lab.onResize(cv, draw);
  })();
})();
