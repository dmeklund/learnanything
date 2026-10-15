/* Lab: small shared toolkit for interactive figures.
   Canvas setup, theme-aware colors, seeded randomness, controls, chart helpers. */
(function () {
  const Lab = {};
  const root = document.documentElement;

  /* ---- Theme ---- */
  Lab.css = (name) => getComputedStyle(root).getPropertyValue(name).trim();
  Lab.rgb = (name) => {
    let h = Lab.css(name).replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  Lab.mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  Lab.rgbStr = (c, alpha = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alpha})`;
  Lab.palette = () => ({
    paper: Lab.css('--paper'), paper2: Lab.css('--paper-2'), paper3: Lab.css('--paper-3'),
    grid: Lab.css('--grid'), rule: Lab.css('--rule'),
    ink: Lab.css('--ink'), ink2: Lab.css('--ink-2'), ink3: Lab.css('--ink-3'),
    accent: Lab.css('--accent'), signal: Lab.css('--signal'),
    s1: Lab.css('--s1'), s2: Lab.css('--s2'), s3: Lab.css('--s3'),
  });
  const themeFns = [];
  Lab.onTheme = (fn) => themeFns.push(fn);
  const fire = () => themeFns.forEach((f) => f());
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', fire);
  new MutationObserver(fire).observe(root, { attributes: true, attributeFilter: ['data-theme', 'class'] });

  Lab.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Canvas ---- */
  // Sizes a canvas to its CSS box at device pixel ratio; returns ctx in CSS pixels.
  Lab.canvas = (cv, aspect) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cv.clientWidth || cv.parentElement.clientWidth;
    const h = aspect ? Math.round(w * aspect) : (cv.clientHeight || w);
    if (aspect) cv.style.height = h + 'px';
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  };
  Lab.onResize = (el, fn) => {
    let last = 0;
    new ResizeObserver(() => {
      const w = el.clientWidth;
      if (Math.abs(w - last) > 1) { last = w; fn(); }
    }).observe(el);
  };
  // Run fn only while el is on screen (for animation loops).
  Lab.whenVisible = (el, onShow, onHide) => {
    new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? onShow() : onHide && onHide())), { rootMargin: '100px' }).observe(el);
  };

  /* ---- Randomness ---- */
  Lab.rng = (seed = 1) => () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  Lab.gauss = (r) => {
    let u = 0, v = 0;
    while (u === 0) u = r();
    while (v === 0) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  /* ---- DOM ---- */
  Lab.$ = (sel, ctx = document) => ctx.querySelector(sel);
  Lab.$$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  Lab.el = (tag, attrs = {}, html) => {
    const e = document.createElement(tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  };
  // Bind a range input to an <output> with a formatter; calls fn(value) on input.
  Lab.slider = (input, fmt, fn) => {
    const out = input.closest('.ctl')?.querySelector('output');
    const update = () => {
      const v = parseFloat(input.value);
      if (out) out.textContent = fmt ? fmt(v) : v;
      fn && fn(v);
    };
    input.addEventListener('input', update);
    update();
    return () => parseFloat(input.value);
  };
  Lab.fmt = {
    fixed: (d) => (v) => v.toFixed(d),
    si: (v) => {
      const a = Math.abs(v);
      if (a >= 1e12) return (v / 1e12).toPrecision(3).replace(/\.0+$/, '') + 'T';
      if (a >= 1e9) return (v / 1e9).toPrecision(3).replace(/\.0+$/, '') + 'B';
      if (a >= 1e6) return (v / 1e6).toPrecision(3).replace(/\.0+$/, '') + 'M';
      if (a >= 1e3) return (v / 1e3).toPrecision(3).replace(/\.0+$/, '') + 'k';
      return v.toPrecision(3);
    },
    sci: (v) => {
      const e = Math.floor(Math.log10(v));
      const m = v / 10 ** e;
      return (m.toFixed(1) === '1.0' ? '' : m.toFixed(1) + '×') + '10' + String(e).replace(/[0-9-]/g, (c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'['0123456789'.indexOf(c)] || '⁻');
    },
  };

  /* ---- Tooltip for chart wraps ---- */
  Lab.tip = (wrap) => {
    let t = wrap.querySelector('.tip');
    if (!t) { t = Lab.el('div', { class: 'tip', role: 'status' }); t.hidden = true; wrap.appendChild(t); }
    return {
      show(x, y, html) { t.innerHTML = html; t.hidden = false; t.style.left = x + 'px'; t.style.top = y + 'px'; },
      hide() { t.hidden = true; },
    };
  };

  /* ---- SVG ---- */
  const NS = 'http://www.w3.org/2000/svg';
  Lab.svg = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  Lab.scale = (d0, d1, r0, r1) => (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
  Lab.logScale = (d0, d1, r0, r1) => {
    const a = Math.log10(d0), b = Math.log10(d1);
    return (v) => r0 + ((Math.log10(v) - a) / (b - a)) * (r1 - r0);
  };

  /* ---- Chronology rail & reading progress ---- */
  Lab.rail = () => {
    const rail = Lab.$('.rail ol');
    const chapters = Lab.$$('.chapter[id]');
    if (!rail || !chapters.length) return;
    chapters.forEach((c) => {
      const li = Lab.el('li');
      const a = Lab.el('a', { href: '#' + c.id });
      a.innerHTML = `<span class="yr">${c.dataset.year || '§'}</span><span class="t">${c.dataset.short || ''}</span>`;
      li.appendChild(a); rail.appendChild(li);
    });
    const links = Lab.$$('a', rail);
    const setCurrent = (id) => links.forEach((a) => {
      const on = a.getAttribute('href') === '#' + id;
      a.setAttribute('aria-current', on ? 'true' : 'false');
      if (on && innerWidth <= 900) a.scrollIntoView({ block: 'nearest', inline: 'center' });
    });
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) setCurrent(e.target.id); });
    }, { rootMargin: '-30% 0px -65% 0px' });
    chapters.forEach((c) => io.observe(c));
    const bar = Lab.$('.progress');
    if (bar) {
      const upd = () => {
        const h = document.documentElement.scrollHeight - innerHeight;
        bar.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + '%';
      };
      addEventListener('scroll', upd, { passive: true }); upd();
    }
  };

  window.Lab = Lab;
})();
