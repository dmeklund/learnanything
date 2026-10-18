/* Volume III opening figure: four studies on the light box. */
(function () {
  const root = Lab.$('#hero-box');
  if (!root) return;
  const panels = Lab.$$('canvas', root);
  let B = null;
  const studies = {
    us: (ctx, w) => {
      B = B || MI.bmode({ f: 3.5, gain: 0, tgc: 1, dr: 60 });
      MI.drawSector(ctx, B, 0, 0, w, w);
      MI.overlay(ctx, 0, 0, w, w, { tl: ['US · liver', 'echoes'], bl: ['3.5 MHz'] });
    },
    ct: (ctx, w) => {
      MI.gray(ctx, MI.ctImage(192, 4, 3), 192, 192, MI.window(80, 40), 0, 0, w, w);
      MI.overlay(ctx, 0, 0, w, w, { tl: ['CT · head', 'attenuation'], bl: ['W 80', 'L 40'] });
    },
    t1: (ctx, w) => {
      MI.gray(ctx, MI.mrImage(192, { tr: 500, te: 15 }), 192, 192, (v) => Math.min(1, v), 0, 0, w, w);
      MI.overlay(ctx, 0, 0, w, w, { tl: ['MR · head', 'T1-weighted'], bl: ['TR 500', 'TE 15'] });
    },
    t2: (ctx, w) => {
      MI.gray(ctx, MI.mrImage(192, { tr: 4000, te: 100 }), 192, 192, (v) => Math.min(1, v), 0, 0, w, w);
      MI.overlay(ctx, 0, 0, w, w, { tl: ['MR · head', 'T2-weighted'], bl: ['TR 4000', 'TE 100'] });
    },
  };
  function draw() {
    panels.forEach((cv) => {
      const { ctx, w } = Lab.canvas(cv, 1);
      ctx.fillStyle = MI.film().bg; ctx.fillRect(0, 0, w, w);
      studies[cv.dataset.study](ctx, w);
    });
  }
  draw();
  Lab.onTheme(draw); Lab.onResize(root, draw);
})();
