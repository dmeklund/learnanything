/* Volume X figures: the US pathway finder, the FDA review clock, and an ISO 14971 risk matrix. */
(function () {
  const T = (g, x, y, s, fill, anchor, size) => RG.text(g, x, y, s, fill, anchor, size);

  /* ---------- Fig 1.1 Which US pathway? ---------- */
  (function () {
    const root = Lab.$('#fig-path');
    if (!root) return;
    const box = Lab.$('.qflow', root), res = Lab.$('.qresult', root);
    // Each question: id, text, yes/no next step (question id or result id)
    const Q = {
      device: { q: 'Is the product intended to diagnose, cure, mitigate, treat, or prevent disease, or to affect the body’s structure or function, without achieving its main purpose through chemical action or metabolism?', yes: 'reg', no: 'R_not' },
      reg: { q: 'Does an FDA classification regulation already cover this type of device?', yes: 'cls', no: 'pred' },
      cls: { q: 'Does that regulation place it in Class III?', yes: 'R_pma', no: 'exempt' },
      exempt: { q: 'Is the device type exempt from premarket notification (many Class I and some Class II types are)?', yes: 'R_exempt', no: 'R_510k' },
      pred: { q: 'Is there a legally marketed predicate with the same intended use and similar technology?', yes: 'R_510k', no: 'risk' },
      risk: { q: 'Can general and special controls give reasonable assurance of safety and effectiveness (low to moderate risk)?', yes: 'R_denovo', no: 'hud' },
      hud: { q: 'Is it for a rare disease or condition affecting no more than 8,000 people a year in the United States?', yes: 'R_hde', no: 'R_pma' },
    };
    const R = {
      R_not: { t: 'Probably not a device', d: 'It may be a drug, a biologic, a combination product, or a general wellness product. FDA’s Office of Combination Products and the 513(g) request for information exist to settle doubtful cases.' },
      R_exempt: { t: 'Exempt: register and list', d: 'No premarket submission. The manufacturer registers its establishment, lists the device, and follows general controls: labeling, adverse event reporting, and (unless also exempted) the quality management system regulation.' },
      R_510k: { t: '510(k) premarket notification', d: 'Show substantial equivalence to a predicate: the same intended use, and either the same technological characteristics or differences that raise no new questions of safety and effectiveness. FDA’s goal is a decision within 90 FDA days.' },
      R_denovo: { t: 'De Novo classification request', d: 'A new type of low- to moderate-risk device with no predicate. If granted, FDA creates a new classification regulation with special controls, and the device becomes a predicate for later 510(k)s. Goal: 150 FDA days.' },
      R_pma: { t: 'Premarket approval (PMA)', d: 'The most demanding route: valid scientific evidence, usually including clinical studies, that the device is safe and effective, plus a review of manufacturing and often an advisory panel. Goal: 180 FDA days for the decision.' },
      R_hde: { t: 'Humanitarian Device Exemption', d: 'After the device is designated a Humanitarian Use Device, the HDE requires evidence of safety and probable benefit rather than proof of effectiveness, with limits on profit and oversight by an institutional review board where it is used.' },
    };
    let path = ['device'], answers = {};
    function render() {
      box.innerHTML = '';
      path.forEach((id, i) => {
        if (!Q[id]) return;
        const row = Lab.el('div', { class: 'qrow' });
        row.innerHTML = `<span class="qn">${i + 1}</span><p>${Q[id].q}</p>`;
        const ch = Lab.el('div', { class: 'chips' });
        ['yes', 'no'].forEach((a) => {
          const b = Lab.el('button', { class: 'chip', type: 'button', 'aria-pressed': answers[id] === a ? 'true' : 'false' }, a === 'yes' ? 'Yes' : 'No');
          b.addEventListener('click', () => { answers[id] = a; path = path.slice(0, i + 1); let next = Q[id][a]; path.push(next); render(); });
          ch.appendChild(b);
        });
        row.appendChild(ch); box.appendChild(row);
      });
      const last = path[path.length - 1];
      if (R[last]) { res.hidden = false; res.innerHTML = `<span class="label">Likely route</span><h5>${R[last].t}</h5><p>${R[last].d}</p>`; }
      else { res.hidden = false; res.innerHTML = '<span class="label">Likely route</span><p class="muted">Answer the questions to see where a device would go.</p>'; }
    }
    // open with an example already answered: a new AI triage tool with no predicate
    answers = { device: 'yes', reg: 'no', pred: 'no', risk: 'yes' }; path = ['device', 'reg', 'pred', 'risk', 'R_denovo'];
    render();
    Lab.$('#pa-reset', root).addEventListener('click', () => { answers = {}; path = ['device']; render(); });
  })();

  /* ---------- Fig 2.1 The review clock ---------- */
  (function () {
    const root = Lab.$('#fig-clock');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    const GOAL = { k510: { name: '510(k)', goal: 90, first: 60 }, denovo: { name: 'De Novo', goal: 150, first: 120 }, pma: { name: 'PMA', goal: 180, first: 90 } };
    const st = { p: 'k510', rounds: 1, resp: 60 };
    let ready = false;
    function draw() {
      if (!ready) return;
      const G = GOAL[st.p], segs = [];
      // FDA review time: the first cycle to the substantive interaction, the rest of the goal spread over later cycles
      let t = 0, fda = 0;
      const fdaCycles = st.rounds ? [G.first, ...Array(st.rounds).fill((G.goal - G.first) / st.rounds)] : [G.goal];
      fdaCycles.forEach((d, i) => {
        segs.push({ who: 'fda', a: t, b: t + d, label: i === 0 ? 'FDA review' : 'FDA review of the response' }); t += d; fda += d;
        if (i < st.rounds) { segs.push({ who: 'hold', a: t, b: t + st.resp, label: 'on hold: sponsor answers the request' }); t += st.resp; }
      });
      const W = Math.max(280, svg.clientWidth || 600), H = 150; svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H); svg.innerHTML = '';
      const pal = Lab.palette(), g = Lab.svg('g', {}, svg), m = { l: 16, r: 16 }, maxT = Math.max(360, Math.ceil(t / 60) * 60), X = Lab.scale(0, maxT, m.l, W - m.r);
      for (let d = 0; d <= maxT; d += 60) { Lab.svg('line', { x1: X(d), x2: X(d), y1: 30, y2: 96, stroke: pal.grid }, g); T(g, X(d), 112, d, pal.ink3, 'middle', 10.5); }
      T(g, W - m.r, 130, 'calendar days from submission', pal.ink2, 'end', 10.5);
      segs.forEach((s) => {
        const r = Lab.svg('rect', { x: X(s.a), y: 44, width: Math.max(1, X(s.b) - X(s.a) - 1), height: 34, rx: 2, fill: s.who === 'fda' ? pal.s1 : Lab.css('--hold'), stroke: s.who === 'fda' ? 'none' : pal.ink3, 'stroke-dasharray': s.who === 'fda' ? '' : '3 3' }, g);
        r.addEventListener('mousemove', (e) => { const b = svg.getBoundingClientRect(); tip.show(e.clientX - b.left, (44 / H) * b.height - 6, `<b>${s.label}</b><br>days ${Math.round(s.a)}–${Math.round(s.b)} (${Math.round(s.b - s.a)} days)`, (80 / H) * b.height); });
        r.addEventListener('mouseleave', () => tip.hide());
      });
      Lab.svg('line', { x1: X(t), x2: X(t), y1: 30, y2: 96, stroke: pal.ink, 'stroke-width': 2 }, g);
      T(g, X(t) + (X(t) > W - 120 ? -6 : 6), 26, `decision, day ${Math.round(t)}`, pal.ink, X(t) > W - 120 ? 'end' : 'start', 11);
      T(g, m.l, 16, 'blue: FDA days on the clock · dashed: clock stopped', pal.ink2, 'start', 10.5);
      out.innerHTML = `<span>FDA days used <b>${Math.round(fda)}</b> (MDUFA goal ${G.goal})</span><span>days on hold <b>${st.rounds * st.resp}</b></span><span>calendar days to decision <b>${Math.round(t)}</b></span>`;
    }
    Lab.$$('[data-ck]', root).forEach((b) => b.addEventListener('click', () => { st.p = b.dataset.ck; Lab.$$('[data-ck]', root).forEach((o) => o.setAttribute('aria-pressed', o === b ? 'true' : 'false')); draw(); }));
    Lab.slider(Lab.$('#ck-r', root), (v) => v + '', (v) => { st.rounds = v; draw(); });
    Lab.slider(Lab.$('#ck-d', root), (v) => v + ' days', (v) => { st.resp = v; draw(); });
    ready = true; draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();

  /* ---------- Fig 3.1 Risk management (ISO 14971) ---------- */
  (function () {
    const root = Lab.$('#fig-risk');
    if (!root) return;
    const svg = Lab.$('svg', root), out = Lab.$('.readouts', root), tip = Lab.tip(svg.parentElement);
    // Illustrative hazards for an insulin pump: severity 1–5, probability 1–5 before controls
    const HZ = [
      { id: 'A', name: 'Over-delivery from a software fault', s: 5, p: 3 },
      { id: 'B', name: 'Blocked tubing goes unnoticed', s: 4, p: 4 },
      { id: 'C', name: 'Battery dies mid-dose', s: 3, p: 3 },
      { id: 'D', name: 'User enters a dose in the wrong units', s: 4, p: 3 },
      { id: 'E', name: 'Infusion-site infection', s: 3, p: 2 },
    ];
    // Controls, in the ISO 14971 order of priority; each lowers the probability of some hazards
    const CTRL = [
      { id: 'c1', name: 'Independent hardware limit on dose rate', kind: 'inherent safety by design', fx: { A: 2 } },
      { id: 'c2', name: 'Occlusion pressure sensor and alarm', kind: 'protective measure', fx: { B: 2 } },
      { id: 'c3', name: 'Battery gauge with early warning', kind: 'protective measure', fx: { C: 2 } },
      { id: 'c4', name: 'Dose entry confirmation screen', kind: 'protective measure', fx: { D: 1, A: 0 } },
      { id: 'c5', name: 'Warnings in the instructions and training', kind: 'information for safety', fx: { D: 1, E: 1 } },
    ];
    const on = new Set(['c1']);
    const SEV = ['negligible', 'minor', 'serious', 'critical', 'catastrophic'], PROB = ['improbable', 'remote', 'occasional', 'probable', 'frequent'];
    const zone = (s, p) => (s * p >= 12 ? 2 : s * p >= 6 ? 1 : 0); // an illustrative acceptability policy
    function draw() {
      const W = Math.max(280, svg.clientWidth || 600), cell = Math.min(64, (W - 120) / 5), H = cell * 5 + 70;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H); svg.innerHTML = '';
      const pal = Lab.palette(), g = Lab.svg('g', {}, svg), x0 = 104, y0 = 10;
      const fills = [Lab.css('--zone-ok'), Lab.css('--zone-alarp'), Lab.css('--zone-no')];
      for (let s = 1; s <= 5; s++) for (let p = 1; p <= 5; p++) Lab.svg('rect', { x: x0 + (s - 1) * cell, y: y0 + (5 - p) * cell, width: cell - 2, height: cell - 2, fill: fills[zone(s, p)], rx: 2 }, g);
      SEV.forEach((n, i) => T(g, x0 + i * cell + cell / 2, y0 + 5 * cell + 14, n, pal.ink3, 'middle', 9.5));
      T(g, x0 + 2.5 * cell, y0 + 5 * cell + 32, 'severity of harm →', pal.ink2, 'middle', 10.5);
      PROB.forEach((n, i) => T(g, x0 - 6, y0 + (4 - i) * cell + cell / 2 + 4, n, pal.ink3, 'end', 9.5));
      const res = HZ.map((h) => { let p = h.p; CTRL.forEach((c) => { if (on.has(c.id) && c.fx[h.id]) p -= c.fx[h.id]; }); return { ...h, pr: Math.max(1, p) }; });
      // markers, offset when several share a cell
      const cnt = {};
      res.forEach((h) => {
        const key = h.s + ',' + h.pr, k = (cnt[key] = (cnt[key] || 0) + 1) - 1, cx = x0 + (h.s - 1) * cell + cell / 2 + (k % 2 ? 12 : -12) * (k ? 1 : 0), cy = y0 + (5 - h.pr) * cell + cell / 2 + (k > 1 ? 12 : 0);
        if (h.pr < h.p) { const oy = y0 + (5 - h.p) * cell + cell / 2; Lab.svg('line', { x1: cx, y1: oy, x2: cx, y2: cy - 11, stroke: pal.ink3, 'stroke-dasharray': '2 3' }, g); Lab.svg('circle', { cx, cy: oy, r: 4, fill: 'none', stroke: pal.ink3 }, g); }
        const c = Lab.svg('circle', { cx, cy, r: 11, fill: pal.paper, stroke: pal.ink, 'stroke-width': 1.5 }, g);
        T(g, cx, cy + 4, h.id, pal.ink, 'middle', 11);
        c.addEventListener('mousemove', (e) => { const b = svg.getBoundingClientRect(); tip.show(e.clientX - b.left, e.clientY - b.top - 10, `<b>${h.id}. ${h.name}</b><br>severity: ${SEV[h.s - 1]}<br>probability: ${PROB[h.p - 1]} → ${PROB[h.pr - 1]}`, e.clientY - b.top + 14); });
        c.addEventListener('mouseleave', () => tip.hide());
      });
      const nz = [0, 0, 0]; res.forEach((h) => nz[zone(h.s, h.pr)]++);
      out.innerHTML = `<span>acceptable <b>${nz[0]}</b></span><span>reduce as far as possible <b>${nz[1]}</b></span><span>unacceptable without a benefit-risk argument <b class="${nz[2] ? 'warn' : ''}">${nz[2]}</b></span>`;
    }
    const list = Lab.$('.ctrl-list', root);
    CTRL.forEach((c) => {
      const lab = Lab.el('label', { class: 'check' }, `<input type="checkbox" id="rk-${c.id}"${on.has(c.id) ? ' checked' : ''}> ${c.name} <span class="kind">${c.kind}</span>`);
      lab.querySelector('input').addEventListener('change', (e) => { e.target.checked ? on.add(c.id) : on.delete(c.id); draw(); });
      list.appendChild(lab);
    });
    draw();
    Lab.onTheme(draw); Lab.onResize(svg, draw);
  })();
})();
