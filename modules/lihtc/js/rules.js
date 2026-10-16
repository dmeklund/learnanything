/* §42(g) income and rent limits, income averaging, and the competitive 9% round. */
(function () {
  // HUD's household-size adjustments relative to the four-person limit.
  const ADJ = { 1: 0.70, 2: 0.80, 3: 0.90, 4: 1.00, 5: 1.08, 6: 1.16, 7: 1.24, 8: 1.32 };
  const roundUp50 = (v) => Math.ceil(v / 50) * 50;
  const limit = (ami, pct, size) => roundUp50(ami * (pct / 100) * ADJ[size]);
  // Rents assume 1.5 persons per bedroom (1 person for an efficiency); 1.5 persons averages the 1- and 2-person limits.
  const imputed = (br) => (br === 0 ? 1 : 1.5 * br);
  const limitFor = (ami, pct, persons) => {
    const lo = Math.floor(persons), hi = Math.ceil(persons);
    return lo === hi ? limit(ami, pct, lo) : (limit(ami, pct, lo) + limit(ami, pct, hi)) / 2;
  };
  const maxRent = (ami, pct, br) => Math.floor((limitFor(ami, pct, imputed(br)) * 0.3) / 12);
  window.LIRules = { limit, maxRent, imputed };
  const $ = (v) => '$' + Math.round(v).toLocaleString();

  /* ---------- Fig 7.1 Rent and income limits ---------- */
  const root = Lab.$('#fig-rents');
  if (root) {
    const st = { ami: 100000, pct: 60, ua: 150, size: 3, income: 32000 };
    const tbody = Lab.$('.rent-table tbody', root), hh = Lab.$('.hh-out', root);
    let ready = false;
    function draw() {
      if (!ready) return;
      tbody.innerHTML = [0, 1, 2, 3, 4].map((br) => {
        const lim = limitFor(st.ami, st.pct, imputed(br)), g = maxRent(st.ami, st.pct, br);
        return `<tr><td>${br === 0 ? 'Studio' : br + ' BR'}</td><td>${imputed(br)}</td><td>${$(lim)}</td><td>${$(g)}</td><td>${$(st.ua)}</td><td><b>${$(Math.max(0, g - st.ua))}</b></td></tr>`;
      }).join('');
      const levels = [20, 30, 40, 50, 60, 70, 80];
      const qual = levels.find((p) => st.income <= limit(st.ami, p, st.size));
      const chips = levels.map((p) => {
        const L = limit(st.ami, p, st.size), ok = st.income <= L;
        return `<span class="chip ${ok ? 'on' : ''}" title="${p}% AMI limit for ${st.size} people: ${$(L)}">${p}% · ${$(L)}</span>`;
      }).join('');
      const br = Math.max(0, Math.min(4, Math.ceil((st.size - 1) / 2)));
      const rent60 = maxRent(st.ami, 60, br);
      const burden = (rent60 * 12) / st.income;
      hh.innerHTML = `<div class="chips">${chips}</div>
        <p>${qual ? `This household qualifies for units designated at <b>${qual}% of AMI</b> or higher.` : '<b>Over income</b> for every designation, including 80%.'}</p>
        <p>A ${br === 0 ? 'studio' : br + '-bedroom'} unit at the 60% rent limit costs ${$(rent60)}/month gross, which is <b class="${burden > 0.5 ? 'warn' : burden > 0.3 ? 'caution' : ''}">${(burden * 100).toFixed(0)}% of this household's income</b>. ${burden > 0.5 ? 'HUD calls more than 50% a severe cost burden.' : burden > 0.3 ? 'Above 30% counts as cost-burdened.' : ''}</p>`;
    }
    const bind = (id, k, fmt) => Lab.slider(Lab.$(id, root), fmt, (v) => { st[k] = v; draw(); });
    bind('#rl-ami', 'ami', $); bind('#rl-pct', 'pct', (v) => v + '%'); bind('#rl-ua', 'ua', $);
    bind('#rl-size', 'size', (v) => v + (v === 1 ? ' person' : ' people')); bind('#rl-inc', 'income', $);
    ready = true; draw();
  }

  /* ---------- Fig 7.2 Income averaging ---------- */
  const avg = Lab.$('#fig-averaging');
  if (avg) {
    const TIERS = [20, 30, 40, 50, 60, 70, 80];
    const counts = { 20: 0, 30: 10, 40: 0, 50: 10, 60: 20, 70: 10, 80: 10 };
    const grid = Lab.$('.unit-grid', avg), ro = Lab.$('.readouts', avg), ctl = Lab.$('.tier-ctls', avg), legend = Lab.$('.legend', avg);
    const AMI = 100000, UA = 150;
    const color = (p) => Lab.rgbStr(Lab.mix(Lab.rgb('--paper-3'), Lab.rgb('--s1'), 0.18 + ((p - 20) / 60) * 0.82));
    let ready = false;
    TIERS.forEach((p) => {
      const d = Lab.el('div', { class: 'ctl' });
      d.innerHTML = `<label for="ia-${p}">${p}% AMI <output>${counts[p]}</output></label><input type="range" id="ia-${p}" min="0" max="40" step="1" value="${counts[p]}">`;
      ctl.appendChild(d);
      Lab.slider(Lab.$('input', d), (v) => v, (v) => { counts[p] = v; draw(); });
    });
    function draw() {
      if (!ready) return;
      const n = TIERS.reduce((s, p) => s + counts[p], 0);
      const mean = n ? TIERS.reduce((s, p) => s + p * counts[p], 0) / n : 0;
      grid.innerHTML = '';
      TIERS.forEach((p) => { for (let i = 0; i < counts[p]; i++) { const c = Lab.el('span', { title: `Unit designated at ${p}% AMI` }); c.style.background = color(p); grid.appendChild(c); } });
      legend.innerHTML = TIERS.map((p) => `<span><i style="background:${color(p)};border-radius:2px"></i>${p}%</span>`).join('');
      const rent = (p) => Math.max(0, maxRent(AMI, p, 2) - UA);
      const rev = TIERS.reduce((s, p) => s + counts[p] * rent(p), 0), base = n * rent(60);
      const deep = counts[20] + counts[30];
      const ok = mean <= 60 + 1e-9;
      ro.innerHTML = `<span>units <b>${n}</b></span><span>average designation <b class="${ok ? '' : 'warn'}">${mean.toFixed(1)}%</b> ${ok ? '✓ meets the 60% test' : '✗ exceeds 60%'}</span><span>units at ≤30% AMI <b>${deep}</b></span><span>rent revenue vs. all-60% <b>${base ? ((rev / base) * 100).toFixed(1) : 0}%</b></span>`;
    }
    ready = true; draw(); Lab.onTheme(draw);
  }

  /* ---------- Fig 9.1 A competitive 9% round ---------- */
  const qap = Lab.$('#fig-qap');
  if (qap) {
    const APPS = [
      { n: 'Riverside Commons', d: 'Urban family, near transit', u: 80, req: 1.6, opp: 3, deep: 7, cost: 6, ready: 9, np: false },
      { n: 'Elm Street Seniors', d: 'Suburban, age 62+', u: 60, req: 1.1, opp: 8, deep: 3, cost: 7, ready: 8, np: false },
      { n: 'Harbor View', d: 'Supportive housing, formerly homeless', u: 45, req: 1.2, opp: 4, deep: 10, cost: 3, ready: 6, np: true },
      { n: 'Prairie Rose', d: 'Rural family', u: 32, req: 0.7, opp: 5, deep: 4, cost: 8, ready: 7, np: true },
      { n: 'Northgate Lofts', d: 'Historic mill conversion', u: 70, req: 1.5, opp: 6, deep: 5, cost: 2, ready: 5, np: false },
      { n: 'Cedar Ridge', d: 'Family, high-opportunity suburb', u: 72, req: 1.5, opp: 10, deep: 4, cost: 5, ready: 4, np: false },
      { n: 'Main Street Revitalization', d: 'Mixed-use, qualified census tract', u: 50, req: 1.0, opp: 2, deep: 6, cost: 7, ready: 9, np: true },
      { n: 'Lakeside Family', d: 'Garden apartments, suburban edge', u: 90, req: 1.7, opp: 6, deep: 5, cost: 9, ready: 7, np: false },
    ];
    const W = { opp: 5, deep: 5, cost: 5, ready: 5 };
    const CEIL = 5.0, NP = 0.1;
    const tbody = Lab.$('tbody', qap), ro = Lab.$('.readouts', qap);
    let ready = false;
    function run() {
      if (!ready) return;
      const sw = W.opp + W.deep + W.cost + W.ready || 1;
      const scored = APPS.map((a) => ({ ...a, score: (100 * (a.opp * W.opp + a.deep * W.deep + a.cost * W.cost + a.ready * W.ready)) / (10 * sw) }))
        .sort((a, b) => b.score - a.score || a.req - b.req);
      let npLeft = CEIL * NP, left = CEIL - npLeft;
      // The nonprofit set-aside is filled first, from nonprofit applications in rank order.
      scored.forEach((a) => { a.status = 'unfunded'; });
      scored.filter((a) => a.np).forEach((a) => { if (a.req <= npLeft + 1e-9) { a.status = 'set-aside'; npLeft -= a.req; } });
      left += npLeft;
      scored.forEach((a) => { if (a.status === 'unfunded' && a.req <= left + 1e-9) { a.status = 'funded'; left -= a.req; } });
      tbody.innerHTML = scored.map((a, i) => `<tr class="${a.status === 'unfunded' ? 'cut' : ''}"><td>${i + 1}</td><td><b>${a.n}</b>${a.np ? ' <span class="np">NP</span>' : ''}<br><span class="sub">${a.d}</span></td><td>${a.score.toFixed(1)}</td><td>${a.u}</td><td>$${a.req.toFixed(1)}M</td><td><span class="status ${a.status}">${a.status === 'set-aside' ? 'Funded · nonprofit set-aside' : a.status === 'funded' ? 'Funded' : 'Not funded'}</span></td></tr>`).join('');
      const f = scored.filter((a) => a.status !== 'unfunded');
      const units = f.reduce((s, a) => s + a.u, 0), cr = f.reduce((s, a) => s + a.req, 0);
      ro.innerHTML = `<span>requested <b>$${APPS.reduce((s, a) => s + a.req, 0).toFixed(1)}M</b> vs. available <b>$${CEIL.toFixed(1)}M</b></span><span>projects funded <b>${f.length}</b></span><span>units <b>${units}</b></span><span>annual credit per unit <b>$${Math.round((cr * 1e6) / units).toLocaleString()}</b></span><span>unused <b>$${(CEIL - cr).toFixed(1)}M</b></span>`;
    }
    ['opp', 'deep', 'cost', 'ready'].forEach((k) => Lab.slider(Lab.$('#qp-' + k, qap), (v) => v, (v) => { W[k] = v; run(); }));
    ready = true; run();
  }
})();
