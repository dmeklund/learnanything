/* Hero: a 2-12-12-1 network learning to separate two interleaved spirals, live. */
(function () {
  const cv = Lab.$('#hero-canvas');
  if (!cv) return;
  const epochEl = Lab.$('#hero-epoch'), lossEl = Lab.$('#hero-loss');
  let net, data, X, Y, epoch, loss, running = false, visible = false;

  function reset() {
    const r = Lab.rng(7);
    data = NN.DATA.spiral(240, r, 0.025);
    X = data.map((p) => [p.x * 2, p.y * 2]);
    Y = data.map((p) => p.c);
    net = new NN.MLP([2, 12, 12, 1], 'tanh', Lab.rng(3));
    epoch = 0; loss = NaN;
  }
  function draw() {
    const { ctx, w, h } = Lab.canvas(cv);
    NN.paintField(ctx, 0, 0, w, h, (x, y) => net.predict([x * 2, y * 2]), 56);
    const pad = 0;
    NN.drawPoints(ctx, data, (x) => pad + ((x + 1) / 2) * (w - 2 * pad), (y) => pad + ((1 - y) / 2) * (h - 2 * pad), Math.max(2.4, w / 150));
    epochEl.textContent = String(epoch).padStart(4, '0');
    lossEl.textContent = isNaN(loss) ? '—' : loss.toFixed(3);
  }
  function tick() {
    if (!running) return;
    for (let k = 0; k < 4; k++) { loss = net.step(X, Y, 0.06, 0.9); epoch++; }
    draw();
    if (epoch < 3000 && loss > 0.02) requestAnimationFrame(tick);
    else running = false;
  }
  function start() { if (!running && visible && !Lab.reducedMotion) { running = true; requestAnimationFrame(tick); } }

  reset();
  if (Lab.reducedMotion) { for (let k = 0; k < 1500; k++) { loss = net.step(X, Y, 0.06, 0.9); epoch++; } }
  draw();
  Lab.whenVisible(cv, () => { visible = true; start(); }, () => { visible = false; running = false; });
  Lab.$('#hero-reset').addEventListener('click', () => {
    reset();
    if (Lab.reducedMotion) { for (let k = 0; k < 1500; k++) { loss = net.step(X, Y, 0.06, 0.9); epoch++; } }
    draw(); start();
  });
  Lab.onTheme(draw);
  Lab.onResize(cv, draw);
})();
