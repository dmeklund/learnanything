/* Volume XIV, Fig 3.1: the Klein-Nishina cross section for a photon scattering off a free electron.
   The differential cross section is the 1929 formula; the total is obtained by integrating it over solid angle
   with Simpson's rule, so the curve and the number in the readout come from the same expression. */
(function () {
  const root = Lab.$('#fig-kn');
  if (!root) return;
  const cv = Lab.$('.kn-cv', root), svg = Lab.$('.kn-chart', root), wrap = svg.parentElement;
  const out = Lab.$('.readouts', root), tip = Lab.tip(wrap);
  const { re, mec2, barn } = QD.K;
  const SIGT = (8 * Math.PI / 3) * re * re;          // Thomson, m^2
  const st = { E: 120e3, th: 90 };                    // eV, degrees
  let ready = false;

  const kappa = (E) => E / mec2;
  const P = (E, th) => 1 / (1 + kappa(E) * (1 - Math.cos(th)));
  // dsigma/dOmega in units of r_e^2 per steradian
  const dkn = (E, th) => { const p = P(E, th); return 0.5 * p * p * (p + 1 / p - Math.sin(th) * Math.sin(th)); };
  const dth = (th) => 0.5 * (1 + Math.cos(th) * Math.cos(th));
  // total cross section, m^2, by Simpson over theta
  function total(E) {
    const N = 1200; let s = 0;
    for (let i = 0; i <= N; i++) {
      const th = (i / N) * Math.PI, w = i === 0 || i === N ? 1 : i % 2 ? 4 : 2;
      s += w * dkn(E, th) * Math.sin(th);
    }
    return 2 * Math.PI * re * re * s * (Math.PI / N) / 3;
  }
  const meanCos = (E) => {
    const N = 1200; let a = 0, b = 0;
    for (let i = 0; i <= N; i++) {
      const th = (i / N) * Math.PI, w = i === 0 || i === N ? 1 : i % 2 ? 4 : 2;
      const f = dkn(E, th) * Math.sin(th);
      a += w * f * Math.cos(th); b += w * f;
    }
    return a / b;
  };
  const eFmt = (E) => (E >= 1e6 ? (E / 1e6).toPrecision(3) + ' MeV' : E >= 1e3 ? (E / 1e3).toPrecision(3) + ' keV' : E.toPrecision(3) + ' eV');

  function drawCanvas() {
    if (!cv.clientWidth) return;
    const { ctx, w, h } = Lab.canvas(cv, cv.clientWidth < 520 ? 0.95 : 0.78), pal = Lab.palette();
    ctx.clearRect(0, 0, w, h);
    const accent = Lab.rgb('--accent'), ink3 = Lab.rgb('--ink-3');
    const cx = w * 0.56, cy = h * 0.52, R = Math.min(w * 0.36, h * 0.42);
    // the scale is set by the Thomson maximum, which is 1 in these units
    const maxv = 1;
    const rad = (v) => (v / maxv) * R;
    // polar grid
    ctx.strokeStyle = pal.grid; ctx.lineWidth = 1;
    [0.25, 0.5, 0.75, 1].forEach((f) => { ctx.beginPath(); ctx.arc(cx, cy, R * f, 0, 7); ctx.stroke(); });
    for (let a = 0; a < 360; a += 30) {
      const t = (a * Math.PI) / 180;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(t) * R, cy + Math.sin(t) * R); ctx.stroke();
    }
    ctx.font = `10px ${Lab.css('--f-mono')}`; ctx.fillStyle = pal.ink3;
    ctx.fillText('0°', cx + R + 5, cy + 4);
    ctx.textAlign = 'right'; ctx.fillText('180°', cx - R - 5, cy + 16); ctx.textAlign = 'left';
    ctx.fillText('90°', cx + 4, cy - R - 5);
    // incoming photon, drawn just above the axis so it does not sit on the 180 degree label
    ctx.strokeStyle = Lab.rgbStr(ink3, 0.8); ctx.lineWidth = 1.5;
    const px0 = 12, px1 = cx - R - 10;
    ctx.beginPath();
    for (let x = px0; x < px1; x += 1.5) ctx.lineTo(x, cy - 6 + Math.sin(x / 4) * 3);
    ctx.lineTo(px1 + 5, cy - 6);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px1 + 6, cy - 6); ctx.lineTo(px1, cy - 9.5); ctx.lineTo(px1, cy - 2.5); ctx.closePath();
    ctx.fillStyle = Lab.rgbStr(ink3, 0.8); ctx.fill();
    ctx.fillStyle = pal.ink3; ctx.fillText('photon', px0, cy - 16);
    // the two curves, mirrored top and bottom (azimuthal symmetry)
    const curve = (fn, col, dash, width) => {
      ctx.strokeStyle = col; ctx.lineWidth = width; ctx.setLineDash(dash);
      ctx.beginPath();
      for (let i = 0; i <= 180; i++) {
        const th = (i * Math.PI) / 180, v = rad(fn(th));
        ctx.lineTo(cx + Math.cos(th) * v, cy - Math.sin(th) * v);
      }
      for (let i = 180; i >= 0; i--) {
        const th = (i * Math.PI) / 180, v = rad(fn(th));
        ctx.lineTo(cx + Math.cos(th) * v, cy + Math.sin(th) * v);
      }
      ctx.stroke(); ctx.setLineDash([]);
    };
    curve(dth, Lab.rgbStr(ink3, 0.75), [4, 3], 1.2);
    curve((th) => dkn(st.E, th), Lab.rgbStr(accent, 1), [], 2);
    // the marked angle
    const tm = (st.th * Math.PI) / 180, vm = rad(dkn(st.E, tm));
    ctx.strokeStyle = pal.signal; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(tm) * R * 1.08, cy - Math.sin(tm) * R * 1.08); ctx.stroke();
    ctx.fillStyle = pal.signal;
    ctx.beginPath(); ctx.arc(cx + Math.cos(tm) * vm, cy - Math.sin(tm) * vm, 4, 0, 7); ctx.fill();
    // key
    ctx.font = `10px ${Lab.css('--f-mono')}`;
    [['Klein–Nishina', pal.accent], ['Thomson, any energy', pal.ink3]].forEach(([lab, col], i) => {
      ctx.fillStyle = col; ctx.fillRect(10, 14 + i * 15 - 7, 10, 2.5);
      ctx.fillStyle = pal.ink2; ctx.fillText(lab, 25, 14 + i * 15);
    });
    ctx.fillStyle = pal.ink3;
    ctx.fillText('radius = dσ/dΩ, in units of the squared classical electron radius, per sr', 10, h - 8);
  }

  function drawChart() {
    const E0 = 1e3, E1 = 1e8;
    const f = QD.frame(svg, {
      h: 280, m: { l: 54, r: 34, t: 26, b: 42 }, x: [E0, E1], y: [1e-3, 1], xlog: true, ylog: true,
      xt: [1e3, 1e4, 1e5, 1e6, 1e7, 1e8], yt: [1e-3, 1e-2, 1e-1, 1],
      xf: (v) => (v >= 1e6 ? v / 1e6 + ' MeV' : v / 1e3 + ' keV'), yf: (v) => QD.sci(v),
      xl: 'photon energy', yl: 'total cross section, barn',
    });
    const { X, Y, g, pal } = f;
    Lab.svg('line', { x1: f.m.l, x2: f.W - f.m.r, y1: Y(SIGT / barn), y2: Y(SIGT / barn), stroke: pal.ink3, 'stroke-dasharray': '3 3' }, g);
    QD.text(g, f.m.l + 4, Y(SIGT / barn) - 5, 'Thomson, 0.665 barn', pal.ink3, 'start', 10);
    const pts = [];
    for (let i = 0; i <= 120; i++) { const E = E0 * Math.pow(E1 / E0, i / 120); pts.push([E, total(E) / barn]); }
    Lab.svg('path', { d: QD.path(pts, X, Y), fill: 'none', stroke: pal.accent, 'stroke-width': 2 }, g);
    Lab.svg('circle', { cx: X(st.E), cy: Y(total(st.E) / barn), r: 4.5, fill: pal.accent, stroke: pal.paper3, 'stroke-width': 2 }, g);
    QD.hover(svg, f, E0, E1, (E, sx, sy, px, py) => {
      const e = Math.max(E0, Math.min(E1, E));
      tip.show(px, py - 8, `<b>${eFmt(e)}</b><br>σ = ${(total(e) / barn).toPrecision(3)} barn<br>σ/σ<sub>T</sub> = ${(total(e) / SIGT).toPrecision(3)}`);
    }, () => tip.hide(), true);
  }

  function readouts() {
    const k = kappa(st.E), back = st.E / (1 + 2 * k), edge = st.E - back;
    const tm = (st.th * Math.PI) / 180;
    out.innerHTML = [
      ['σ', (total(st.E) / barn).toPrecision(4) + ' barn'],
      ['σ / σ<sub>Thomson</sub>', (total(st.E) / SIGT).toPrecision(3)],
      ['mean cos θ', meanCos(st.E).toFixed(3)],
      [`scattered energy at ${st.th}°`, eFmt(st.E * P(st.E, tm))],
      [`dσ/dΩ at ${st.th}°, relative to Thomson`, (dkn(st.E, tm) / dth(tm)).toPrecision(3)],
      ['backscattered photon', eFmt(back)],
      ['Compton edge', eFmt(edge)],
    ].map(([a, b]) => `<span>${a} <b>${b}</b></span>`).join('');
  }

  function all() { if (!ready) return; drawCanvas(); drawChart(); readouts(); }
  Lab.slider(Lab.$('#kn-e', root), (v) => eFmt(Math.pow(10, v) * 1e3), (v) => { st.E = Math.pow(10, v) * 1e3; all(); });
  Lab.slider(Lab.$('#kn-th', root), (v) => v + '°', (v) => { st.th = v; all(); });
  ready = true; all();
  Lab.onTheme(all); Lab.onResize(cv, all); Lab.onResize(svg, drawChart);
})();
