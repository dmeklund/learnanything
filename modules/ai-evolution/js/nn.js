/* A small multilayer perceptron with hand-written backpropagation.
   Used by the hero figure and the network playground. */
(function () {
  const ACT = {
    tanh: { f: (x) => Math.tanh(x), d: (y) => 1 - y * y },
    relu: { f: (x) => (x > 0 ? x : 0), d: (y) => (y > 0 ? 1 : 0) },
    sigmoid: { f: (x) => 1 / (1 + Math.exp(-x)), d: (y) => y * (1 - y) },
  };

  class MLP {
    constructor(sizes, act = 'tanh', rng = Math.random) {
      this.sizes = sizes; this.act = act;
      this.W = []; this.b = []; this.vW = []; this.vb = [];
      for (let l = 0; l < sizes.length - 1; l++) {
        const nIn = sizes[l], nOut = sizes[l + 1];
        const scale = act === 'relu' ? Math.sqrt(2 / nIn) : Math.sqrt(1 / nIn);
        const W = new Float64Array(nIn * nOut);
        for (let i = 0; i < W.length; i++) W[i] = Lab.gauss(rng) * scale;
        const b = new Float64Array(nOut);
        if (act === 'relu') b.fill(0.05);
        this.W.push(W); this.b.push(b);
        this.vW.push(new Float64Array(W.length)); this.vb.push(new Float64Array(nOut));
      }
    }
    get paramCount() { return this.W.reduce((s, w) => s + w.length, 0) + this.b.reduce((s, b) => s + b.length, 0); }
    forward(x) {
      const acts = [x];
      const L = this.W.length;
      for (let l = 0; l < L; l++) {
        const a = acts[l], nIn = this.sizes[l], nOut = this.sizes[l + 1], W = this.W[l], b = this.b[l];
        const f = l === L - 1 ? ACT.sigmoid.f : ACT[this.act].f;
        const z = new Float64Array(nOut);
        for (let j = 0; j < nOut; j++) {
          let s = b[j];
          for (let i = 0; i < nIn; i++) s += W[j * nIn + i] * a[i];
          z[j] = f(s);
        }
        acts.push(z);
      }
      return acts;
    }
    predict(x) { const a = this.forward(x); return a[a.length - 1][0]; }
    // One step of gradient descent with momentum on binary cross-entropy.
    step(X, Y, lr, mom = 0.9) {
      const L = this.W.length;
      const gW = this.W.map((w) => new Float64Array(w.length));
      const gb = this.b.map((b) => new Float64Array(b.length));
      let loss = 0;
      for (let n = 0; n < X.length; n++) {
        const acts = this.forward(X[n]);
        const out = acts[L][0], y = Y[n];
        loss -= y * Math.log(out + 1e-9) + (1 - y) * Math.log(1 - out + 1e-9);
        let delta = [out - y]; // dL/dz for sigmoid + cross-entropy
        for (let l = L - 1; l >= 0; l--) {
          const nIn = this.sizes[l], nOut = this.sizes[l + 1], a = acts[l], W = this.W[l];
          for (let j = 0; j < nOut; j++) {
            gb[l][j] += delta[j];
            for (let i = 0; i < nIn; i++) gW[l][j * nIn + i] += delta[j] * a[i];
          }
          if (l > 0) {
            const d = ACT[this.act].d;
            const nd = new Array(nIn);
            for (let i = 0; i < nIn; i++) {
              let s = 0;
              for (let j = 0; j < nOut; j++) s += W[j * nIn + i] * delta[j];
              nd[i] = s * d(a[i]);
            }
            delta = nd;
          }
        }
      }
      const m = X.length;
      for (let l = 0; l < L; l++) {
        const W = this.W[l], vW = this.vW[l], g = gW[l];
        for (let i = 0; i < W.length; i++) { vW[i] = mom * vW[i] - (lr * g[i]) / m; W[i] += vW[i]; }
        const b = this.b[l], vb = this.vb[l], h = gb[l];
        for (let j = 0; j < b.length; j++) { vb[j] = mom * vb[j] - (lr * h[j]) / m; b[j] += vb[j]; }
      }
      return loss / m;
    }
  }

  /* Datasets on [-1, 1]². Label 1 is class A, 0 is class B. */
  const DATA = {
    circle(n, r, noise) {
      const pts = [];
      for (let k = 0; k < n; k++) {
        const inner = k % 2 === 0;
        const rad = inner ? r() * 0.45 : 0.65 + r() * 0.3;
        const t = r() * Math.PI * 2;
        pts.push({ x: rad * Math.cos(t) + Lab.gauss(r) * noise, y: rad * Math.sin(t) + Lab.gauss(r) * noise, c: inner ? 1 : 0 });
      }
      return pts;
    },
    xor(n, r, noise) {
      const pts = [];
      for (let k = 0; k < n; k++) {
        let x = r() * 2 - 1, y = r() * 2 - 1;
        x += x > 0 ? 0.05 : -0.05; y += y > 0 ? 0.05 : -0.05;
        pts.push({ x: x + Lab.gauss(r) * noise, y: y + Lab.gauss(r) * noise, c: x * y > 0 ? 1 : 0 });
      }
      return pts;
    },
    gauss(n, r, noise) {
      const pts = [];
      for (let k = 0; k < n; k++) {
        const c = k % 2;
        const s = 0.18 + noise;
        pts.push({ x: (c ? 0.4 : -0.4) + Lab.gauss(r) * s, y: (c ? 0.35 : -0.35) + Lab.gauss(r) * s, c });
      }
      return pts;
    },
    spiral(n, r, noise) {
      const pts = [];
      for (let k = 0; k < n; k++) {
        const c = k % 2;
        const t = (Math.floor(k / 2) / (n / 2)) * 1.75 * Math.PI;
        const rad = 0.08 + (t / (1.75 * Math.PI)) * 0.85;
        const a = t + (c ? Math.PI : 0);
        pts.push({ x: rad * Math.cos(a) + Lab.gauss(r) * noise, y: rad * Math.sin(a) + Lab.gauss(r) * noise, c });
      }
      return pts;
    },
  };

  /* Paint a classifier's output over [-1,1]² into a canvas region.
     f(x, y) returns P(class A). Colors: class A = --s1, class B = --s2, 0.5 = paper. */
  function paintField(ctx, x0, y0, w, h, f, res = 48) {
    const A = Lab.rgb('--s1'), B = Lab.rgb('--s2'), P = Lab.rgb('--paper-3');
    const off = document.createElement('canvas');
    off.width = res; off.height = res;
    const octx = off.getContext('2d');
    const img = octx.createImageData(res, res);
    for (let j = 0; j < res; j++) {
      for (let i = 0; i < res; i++) {
        const x = -1 + (2 * (i + 0.5)) / res, y = 1 - (2 * (j + 0.5)) / res;
        const p = f(x, y);
        const t = Math.min(1, Math.abs(p - 0.5) * 2);
        const c = Lab.mix(P, p > 0.5 ? A : B, 0.12 + t * 0.38);
        const o = (j * res + i) * 4;
        img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, x0, y0, w, h);
  }

  function drawPoints(ctx, pts, toX, toY, size = 3.2) {
    const pal = Lab.palette();
    for (const p of pts) {
      ctx.beginPath();
      if (p.c) ctx.arc(toX(p.x), toY(p.y), size, 0, Math.PI * 2);
      else { const s = size * 0.9; ctx.rect(toX(p.x) - s, toY(p.y) - s, 2 * s, 2 * s); }
      ctx.fillStyle = p.c ? pal.s1 : pal.s2;
      ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = pal.paper3; ctx.stroke();
    }
  }

  window.NN = { MLP, DATA, paintField, drawPoints, ACT };
})();
