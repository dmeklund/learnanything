/* Chapter 5, Fig 5.1: a mononucleotide repeat tract drifting when mismatch repair is gone.
   The tract length performs a biased random walk, one step per slippage event that goes unrepaired.
   Slippage rates rise steeply with tract length, which is why clinical panels use long tracts. */
(function () {
  const root = Lab.$('#fig-msi');
  if (!root) return;
  const cv = Lab.$('canvas.mi-cv', root), svg = Lab.$('svg.mi-chart', root);
  const out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
  // slippage probability per division for a tract of L units, before repair
  const pSlip = (L) => Math.min(0.2, 2e-6 * Math.exp(0.42 * (L - 6)));
  const PINS = 0.4;                       // slippage contracts more often than it expands
  const STUT = [1, 0.26, 0.09, 0.03];     // the assay's own stutter, toward shorter fragments
  // a model genome of mononucleotide tracts, geometric in length
  const TRACTS = [];
  for (let L = 7; L <= 30; L++) TRACTS.push([L, 1.2e6 * Math.exp(-0.55 * (L - 7)) * 0.42]);
  const SUMNP = TRACTS.reduce((a, [L, n]) => a + n * pSlip(L), 0);
  const NTRACT = TRACTS.reduce((a, [, n]) => a + n, 0);
  const MARKERS = 5;                      // the Bethesda panel
  let repair = 1, divs = 400, L0 = 26, ready = false;

  const eps = () => Math.pow(10, -3 * repair);     // working repair cuts slippage a thousandfold
  const lam = () => divs * pSlip(L0) * eps();

  // distribution of the net length change after a Poisson number of biased +/-1 steps
  const dist = () => {
    const l = lam(), KMAX = Math.max(8, Math.min(80, Math.ceil(l + 6 * Math.sqrt(l) + 4)));
    const D = new Map();
    let pk = Math.exp(-l);
    for (let k = 0; k <= KMAX; k++) {
      if (k > 0) pk *= l / k;
      if (pk < 1e-12 && k > l) break;
      for (let ins = 0; ins <= k; ins++) {
        const w = Math.exp(CG.lchoose(k, ins) + (ins ? ins * Math.log(PINS) : 0) + (k - ins ? (k - ins) * Math.log(1 - PINS) : 0));
        const d = ins - (k - ins);
        D.set(d, (D.get(d) || 0) + pk * w);
      }
    }
    return D;
  };

  const withStutter = (D) => {
    const O = new Map();
    D.forEach((p, d) => STUT.forEach((s, j) => O.set(d - j, (O.get(d - j) || 0) + p * s)));
    let tot = 0; O.forEach((v) => { tot += v; });
    O.forEach((v, k) => O.set(k, v / tot));
    return O;
  };

  function drawTrace() {
    if (!cv.clientWidth) return;
    const narrow = cv.clientWidth < 420;
    const { ctx, w, h } = Lab.canvas(cv, narrow ? 1.05 : 0.78), pal = Lab.palette();
    ctx.clearRect(0, 0, w, h);
    const s1 = Lab.rgb('--s1'), s2 = Lab.rgb('--s2'), ink3 = Lab.rgb('--ink-3');
    const D = withStutter(dist()), N = withStutter(new Map([[0, 1]]));
    const LOW = -14, HIGH = 6, span = HIGH - LOW;
    const pad = 40, plotW = w - pad - 14;
    const bw = plotW / (span + 1);
    const panel = (yTop, yH, M, col, label) => {
      let mx = 0; M.forEach((v) => { if (v > mx) mx = v; });
      ctx.strokeStyle = Lab.rgbStr(ink3, 0.3); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad, yTop + yH); ctx.lineTo(w - 14, yTop + yH); ctx.stroke();
      for (let d = LOW; d <= HIGH; d++) {
        const p = M.get(d) || 0;
        if (p / mx < 0.004) continue;
        const x = pad + (d - LOW) * bw, bh = (p / mx) * (yH - 8);
        ctx.fillStyle = Lab.rgbStr(col, 0.85);
        ctx.fillRect(x + bw * 0.18, yTop + yH - bh, bw * 0.64, bh);
      }
      ctx.font = `11px ${Lab.css('--f-mono')}`;
      ctx.fillStyle = pal.ink2; ctx.fillText(label, pad, yTop + 11);
    };
    const yH = (h - 54) / 2;
    // the germline length, as a reference running through both panels
    const gx = pad + (0 - LOW) * bw + bw / 2;
    ctx.strokeStyle = Lab.rgbStr(ink3, 0.45); ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(gx, 14); ctx.lineTo(gx, 14 + 2 * yH + 16); ctx.stroke(); ctx.setLineDash([]);
    panel(14, yH, N, s1, 'NORMAL TISSUE');
    panel(14 + yH + 16, yH, D, s2, 'TUMOUR');
    ctx.font = `10px ${Lab.css('--f-mono')}`; ctx.fillStyle = pal.ink3; ctx.textAlign = 'center';
    ctx.fillText('germline', gx, 10); ctx.textAlign = 'left';
    // the length axis
    ctx.font = `10px ${Lab.css('--f-mono')}`; ctx.fillStyle = pal.ink3; ctx.textAlign = 'center';
    for (let d = LOW; d <= HIGH; d += 2) {
      const x = pad + (d - LOW) * bw + bw / 2;
      ctx.fillText(String(L0 + d), x, h - 18);
    }
    ctx.textAlign = 'left';
    ctx.fillText(`fragment length, adenines (tract of ${L0})`, pad, h - 4);
  }

  function drawChart() {
    const f = CG.frame(svg, {
      h: 290, m: { l: 56, r: 16, t: 26, b: 44 }, x: [0, 100], y: [0.5, 1e5], ylog: true,
      xt: [0, 25, 50, 75, 100], yt: [1, 10, 100, 1000, 1e4, 1e5],
      yf: (v) => CG.num(v), xf: (v) => v + '%',
      xl: 'mismatch repair still working', yl: 'indels per genome in this clone',
    });
    const pts = [];
    for (let i = 0; i <= 100; i++) {
      const rr = i / 100, e = Math.pow(10, -3 * rr);
      pts.push([i, Math.max(0.5, divs * e * SUMNP)]);
    }
    Lab.svg('path', { d: CG.path(pts, f.X, f.Y), fill: 'none', stroke: f.pal.s2, 'stroke-width': 2 }, f.g);
    // the rough level at which a clinical panel calls MSI-high
    const thresh = 1000;
    Lab.svg('line', { x1: f.m.l, x2: f.W - f.m.r, y1: f.Y(thresh), y2: f.Y(thresh), stroke: f.pal.ink3, 'stroke-dasharray': '4 3' }, f.g);
    CG.text(f.g, f.W - f.m.r - 4, f.Y(thresh) - 6, 'about where a panel calls MSI-high', f.pal.ink3, 'end');
    const cur = Math.max(0.5, divs * eps() * SUMNP);
    Lab.svg('circle', { cx: f.X(repair * 100), cy: f.Y(cur), r: 4.5, fill: f.pal.signal }, f.g);
    CG.hover(svg, f, 0, 100, (x, sx, sy, px) => {
      const rr = Math.max(0, Math.min(100, x)) / 100, e = Math.pow(10, -3 * rr);
      const pm = 1 - Math.exp(-divs * pSlip(L0) * e);
      tip.show(px * sx, f.Y(Math.max(0.5, divs * e * SUMNP)) * sy - 8,
        `<b>${(rr * 100).toFixed(0)}% repair</b><br>indels ${CG.num(divs * e * SUMNP)}<br>chance this marker has shifted ${(100 * pm).toFixed(1)}%`,
        (f.H - f.m.b) * sy);
    }, () => tip.hide());
  }

  function render() {
    if (!ready) return;
    drawTrace(); drawChart();
    const pe = pSlip(L0) * eps();
    const pShift = 1 - Math.exp(-divs * pe);
    const pMSI = CG.binomUpper(2, MARKERS, pShift);
    const D = dist();
    let mean = 0; D.forEach((p, d) => { mean += p * d; });
    let v2 = 0; D.forEach((p, d) => { v2 += p * (d - mean) ** 2; });
    out.innerHTML = [
      `<span>slippage per division, bare <b>${CG.sci(pSlip(L0))}</b></span>`,
      `<span>after repair <b>${CG.sci(pe)}</b></span>`,
      `<span>mean length change <b>${mean.toFixed(2)}</b></span>`,
      `<span>spread <b>&plusmn;${Math.sqrt(v2).toFixed(2)}</b></span>`,
      `<span>chance this marker shifts <b>${(100 * pShift).toFixed(1)}%</b></span>`,
      `<span>chance 2 of 5 markers shift <b>${(100 * pMSI).toFixed(1)}%</b></span>`,
      `<span>indels in this clone <b>${CG.num(divs * eps() * SUMNP)}</b></span>`,
      pShift < 0.05 ? '<span class="warn">this marker is uninformative at these settings</span>' : '',
    ].join('');
  }

  Lab.slider(Lab.$('#mi-eff', root), (v) => v.toFixed(0) + '%', (v) => { repair = v / 100; render(); });
  Lab.slider(Lab.$('#mi-div', root), (v) => CG.num(v), (v) => { divs = v; render(); });
  Lab.slider(Lab.$('#mi-len', root), (v) => String(v), (v) => { L0 = v; render(); });
  ready = true;
  void NTRACT;
  render();
  Lab.onTheme(render); Lab.onResize(cv, render); Lab.onResize(svg, render);
})();
