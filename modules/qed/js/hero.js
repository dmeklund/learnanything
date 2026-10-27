/* Volume XIV hero: an electron dressed in loops. Every few seconds one more order of perturbation theory is added:
   another photon loop is drawn around the electron, and the calculated digits of g/2 advance to match the measurement.
   The numbers are the real ones, from the universal QED coefficients plus the lepton, hadron and weak terms. */
(function () {
  const root = Lab.$('#hero-vac');
  if (!root) return;
  const cv = Lab.$('canvas', root);
  const r = Lab.rng(7);
  // universal QED coefficients C_n of (alpha/pi)^n, then the non-universal terms lumped into one step
  const C = [0.5, -0.328478965579193, 1.181241456587200, -1.912245764926445, 5.887];
  const EXTRA = 2.7474e-12 + 1.6927e-12 + 0.03053e-12; // muon and tau loops, hadrons, weak
  const AINV = 137.035999206, X = 1 / AINV / Math.PI;
  const MEAS = '1.00115965218059';
  const partial = (n) => { let s = 0; for (let i = 0; i < n && i < C.length; i++) s += C[i] * Math.pow(X, i + 1); return 1 + s + (n > C.length ? EXTRA : 0); };
  const STAGES = [
    { n: 0, t: 'Dirac, 1928: a point electron with no field', l: 0 },
    { n: 1, t: 'One loop. Schwinger, 1948: α/2π', l: 1 },
    { n: 2, t: 'Two loops, 7 diagrams. Petermann and Sommerfield, 1957', l: 2 },
    { n: 3, t: 'Three loops, 72 diagrams. Laporta and Remiddi, 1996', l: 3 },
    { n: 4, t: 'Four loops, 891 diagrams. Laporta, 2017', l: 4 },
    { n: 5, t: 'Five loops, 12 672 diagrams. Twenty years of integration', l: 5 },
    { n: 6, t: 'Plus muon, tau, hadron and weak loops: the Standard Model', l: 5 },
  ];
  const HOLD = 2.6; // seconds per stage
  // Each order adds one photon arc springing from the electron line and landing back on it.
  // Widths and heights are fixed so the picture is the same on every load.
  const ARCS = [
    { c: 0.50, w: 0.16, h: 0.26, up: 1, cyc: 7, bubble: 0 },
    { c: 0.28, w: 0.11, h: 0.17, up: -1, cyc: 5, bubble: 0 },
    { c: 0.73, w: 0.12, h: 0.19, up: -1, cyc: 6, bubble: 1 },
    { c: 0.46, w: 0.30, h: 0.40, up: 1, cyc: 12, bubble: 0 },
    { c: 0.64, w: 0.08, h: 0.12, up: 1, cyc: 4, bubble: 0 },
  ];
  const PAIRS = Array.from({ length: 26 }, () => ({ x: r(), y: r(), t0: r() * 6, life: 0.7 + r() * 1.3, s: 1.6 + r() * 2.4 }));
  let stage = STAGES.length - 1, clock = (STAGES.length - 1) * HOLD, running = false, raf = 0, last = 0;

  function group(s) {
    const [a, b] = s.split('.');
    return a + '.' + (b.match(/.{1,3}/g) || []).join(' ');
  }
  function digitRow(ctx, x, y, label, value, w) {
    const pal = Lab.palette();
    ctx.font = `11px ${Lab.css('--f-mono')}`;
    ctx.fillStyle = pal.ink3; ctx.fillText(label, x, y);
    ctx.font = `${w}px ${Lab.css('--f-mono')}`;
    const txt = group(value), ref = group(MEAS);
    let cx = x, diverged = false;
    for (let i = 0; i < txt.length; i++) {
      const ch = txt[i];
      if (ch !== ref[i]) diverged = true;
      ctx.fillStyle = ch === ' ' ? pal.ink3 : diverged ? pal.ink3 : pal.accent;
      ctx.fillText(ch, cx, y + w + 4);
      cx += ctx.measureText(ch).width;
    }
    return y + w + 4;
  }

  function draw() {
    if (!cv.clientWidth) return;
    const narrow = cv.clientWidth < 660;
    const { ctx, w, h } = Lab.canvas(cv, narrow ? 1.12 : 0.40), pal = Lab.palette();
    ctx.clearRect(0, 0, w, h);
    const accent = Lab.rgb('--accent'), signal = Lab.rgb('--signal'), vac = Lab.rgb('--vac'), ink3 = Lab.rgb('--ink-3');
    const st = STAGES[Math.min(STAGES.length - 1, Math.floor(stage))];
    const frac = Math.min(1, (clock - Math.floor(stage) * HOLD) / (HOLD * 0.45));
    const T = clock;
    // the diagram panel
    const dx0 = narrow ? 16 : 20, dx1 = narrow ? w - 16 : w * 0.52;
    const dy = narrow ? h * 0.26 : h * 0.46, DW = dx1 - dx0;
    const unit = Math.min(DW, narrow ? h * 0.44 : h * 0.86);

    // the vacuum: short-lived pairs flickering in and out
    PAIRS.forEach((p) => {
      const ph = ((T + p.t0) % 3.4) / 3.4;
      if (ph > p.life / 3.4) return;
      const a = Math.sin((ph / (p.life / 3.4)) * Math.PI) * 0.55;
      ctx.strokeStyle = Lab.rgbStr(vac, a); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(dx0 + p.x * DW, dy + (p.y - 0.5) * unit * 1.1, p.s, 0, 7); ctx.stroke();
    });

    // the electron line
    ctx.strokeStyle = Lab.rgbStr(signal, 1); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(dx0, dy); ctx.lineTo(dx1, dy); ctx.stroke();
    const arrow = (x, y, ang, col, len) => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x - Math.cos(ang - 0.42) * len, y - Math.sin(ang - 0.42) * len);
      ctx.lineTo(x - Math.cos(ang + 0.42) * len, y - Math.sin(ang + 0.42) * len);
      ctx.closePath(); ctx.fill();
    };
    arrow(dx0 + DW * 0.17, dy, 0, Lab.rgbStr(signal, 1), 8);
    arrow(dx1 - 2, dy, 0, Lab.rgbStr(signal, 1), 8);
    ctx.font = `11px ${Lab.css('--f-mono')}`; ctx.fillStyle = pal.ink3;
    ctx.fillText('electron', dx0, dy + 22);

    // the external field, entering from below at the middle vertex
    const vx = dx0 + DW * 0.5;
    ctx.strokeStyle = Lab.rgbStr(ink3, 0.9); ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let y = dy + unit * 0.30; y > dy + 4; y -= 2) ctx.lineTo(vx + Math.sin((y - dy) / 5) * 4, y);
    ctx.stroke();
    ctx.fillStyle = pal.ink3; ctx.textAlign = 'center';
    ctx.fillText('B', vx, dy + unit * 0.30 + 14); ctx.textAlign = 'left';
    ctx.fillStyle = Lab.rgbStr(signal, 1);
    ctx.beginPath(); ctx.arc(vx, dy, 3.5, 0, 7); ctx.fill();

    // one photon arc per order included
    for (let i = 0; i < st.l; i++) {
      const A = ARCS[i], grow = i === st.l - 1 ? frac : 1;
      const x1 = dx0 + (A.c - A.w) * DW, x2 = dx0 + (A.c + A.w) * DW;
      const hh = A.h * unit * 0.5 * grow * A.up;
      ctx.strokeStyle = Lab.rgbStr(accent, 0.85 * Math.min(1, grow + 0.3)); ctx.lineWidth = 1.6;
      ctx.beginPath();
      const N = 130;
      for (let k = 0; k <= N; k++) {
        const u = k / N;
        const bx = x1 + (x2 - x1) * u, by = dy - Math.sin(u * Math.PI) * hh;
        // the squiggle runs perpendicular to the arc, fading to zero at both ends
        const amp = Math.sin(u * Math.PI) * unit * 0.013;
        const nx = -Math.cos(u * Math.PI) * Math.PI * hh, ny = x2 - x1;
        const len = Math.hypot(nx, ny) || 1;
        const off = Math.sin(u * A.cyc * Math.PI * 2 + T * 1.6) * amp;
        ctx.lineTo(bx + (nx / len) * off, by + (ny / len) * off);
      }
      ctx.stroke();
      // the pair bubble inside one of the arcs
      if (A.bubble && grow > 0.9) {
        const bx = (x1 + x2) / 2, by = dy - hh * 0.9;
        ctx.strokeStyle = Lab.rgbStr(signal, 0.8); ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.ellipse(bx, by, (x2 - x1) * 0.14, Math.abs(hh) * 0.16, 0, 0, 7); ctx.stroke();
      }
      ctx.fillStyle = Lab.rgbStr(signal, 1);
      [x1, x2].forEach((x) => { ctx.beginPath(); ctx.arc(x, dy, 2.6, 0, 7); ctx.fill(); });
    }

    // the text column
    const tx = narrow ? 16 : w * 0.56, maxW = narrow ? w - 32 : w - tx - 16;
    let ty = narrow ? h * 0.58 : h * 0.17;
    ctx.fillStyle = pal.accent; ctx.font = `600 ${narrow ? 26 : 34}px ${Lab.css('--f-display')}`;
    ctx.fillText(st.n === 0 ? 'No loops' : st.n > C.length ? 'Everything' : `${st.n} loop${st.n > 1 ? 's' : ''}`, tx, ty);
    ctx.fillStyle = pal.ink2; ctx.font = `${narrow ? 12 : 13}px ${Lab.css('--f-body')}`;
    const words = st.t.split(' '); let line = '', ly = ty + 20;
    words.forEach((wd) => { const t2 = line ? line + ' ' + wd : wd; if (ctx.measureText(t2).width > maxW) { ctx.fillText(line, tx, ly); ly += 17; line = wd; } else line = t2; });
    ctx.fillText(line, tx, ly);
    const dw = Math.max(10, Math.min(15, maxW / 20));
    let dyT = ly + 22;
    dyT = digitRow(ctx, tx, dyT, 'CALCULATED', partial(st.n).toFixed(14), dw);
    dyT = digitRow(ctx, tx, dyT + 16, 'MEASURED  (13)', MEAS, dw);
    ctx.font = `10px ${Lab.css('--f-mono')}`; ctx.fillStyle = pal.ink3;
    ctx.fillText('g/2 for one electron in a trap', tx, dyT + 20);
  }

  const loop = (now) => {
    if (!running) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
    clock = (clock + dt) % (STAGES.length * HOLD + 2.2);
    stage = Math.min(STAGES.length - 1, clock / HOLD);
    draw(); raf = requestAnimationFrame(loop);
  };
  draw();
  if (!Lab.reducedMotion) Lab.whenVisible(cv, () => { if (!running) { running = true; last = 0; raf = requestAnimationFrame(loop); } }, () => { running = false; cancelAnimationFrame(raf); });
  Lab.onTheme(draw); Lab.onResize(cv, draw);
})();
