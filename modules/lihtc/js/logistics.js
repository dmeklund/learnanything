/* Who does what: the parties map and the life of a deal. */
(function () {
  /* ---------- Fig 10.1 The parties and what flows between them ---------- */
  const root = Lab.$('#fig-parties');
  if (root) {
    const map = Lab.$('.parties-map', root), svg = Lab.$('svg', root), panel = Lab.$('.party-panel', root), list = Lab.$('.flow-list', root), head = Lab.$('.flow-head', root);
    const N = {
      irs: { t: 'IRS & Treasury', s: 'Writes the rules', d: 'Administers §42 through regulations, revenue rulings, and notices. Publishes each year\'s per-capita credit amount and the monthly applicable percentages. Receives Form 8609 from each building owner and Form 8823 noncompliance reports from state agencies. Investors claim credits on Form 8586.' },
      hfa: { t: 'State housing agency', s: 'Allocates the credits', d: 'Each state designates a housing credit agency, usually its housing finance agency (HFA). It writes the Qualified Allocation Plan, scores applications, reserves and allocates credits, underwrites each deal so it gets no more credit than it needs, issues Form 8609 after cost certification, and monitors compliance for at least the 15-year compliance period and the extended use term.' },
      local: { t: 'Local government', s: 'Land use and local money', d: 'Grants zoning, permits, and sometimes property tax abatements or payments in lieu of taxes (PILOT). Often contributes soft funds such as HOME or CDBG dollars, and many QAPs award points for local support or alignment with a community revitalization plan.' },
      inv: { t: 'Investors', s: 'Buy the credits', d: 'Mostly banks, which receive Community Reinvestment Act consideration for these investments, plus insurance companies and other corporations with predictable federal tax liability. They contribute equity in exchange for the credits and tax losses, and expect a modest, low-risk after-tax return.' },
      syn: { t: 'Syndicator', s: 'Packages deals for investors', d: 'Also called a fund sponsor. Finds deals, negotiates pricing and the partnership agreement, underwrites the developer, pools many properties into multi-investor or proprietary funds, and provides asset management for 15 years. Large investors sometimes invest directly instead.' },
      owner: { t: 'Owner partnership', s: 'Owns the building', d: 'A single-purpose limited partnership or LLC. The investor (or the syndicator\'s fund) is the limited partner with about 99.99% of the interests, and so receives nearly all the credits and losses. The developer\'s affiliate is the general partner with about 0.01% and control of day-to-day operations.' },
      dev: { t: 'Developer / GP', s: 'Puts the deal together', d: 'Controls the site, designs the project, assembles financing, applies to the HFA, guarantees construction completion and operating deficits, and earns a developer fee (often capped by the QAP at roughly 10 to 15% of costs, with part of it deferred and paid from cash flow). Can be a nonprofit or a for-profit firm.' },
      lend: { t: 'Lenders', s: 'Construction and permanent debt', d: 'A construction lender funds building costs before most equity arrives. A permanent lender, often through Fannie Mae, Freddie Mac, FHA, or a state program, provides the long-term mortgage sized to the restricted rents. In 4% deals, tax-exempt private activity bonds issued by a state or local issuer finance construction.' },
      soft: { t: 'Soft funders', s: 'Fill the gap', d: 'Public and philanthropic sources lent on deferred or cash-flow-contingent terms: HOME and CDBG funds, state housing trust funds, Federal Home Loan Bank Affordable Housing Program grants, and local bonds. A typical deal has several, each with its own application, rules, and regulatory agreement.' },
      build: { t: 'Design & construction', s: 'Architect and contractor', d: 'The architect and general contractor design and build to the HFA\'s design standards and the lenders\' and investor\'s requirements. Construction draws are reviewed by the lender and the investor\'s construction monitor.' },
      pros: { t: 'Attorneys & CPAs', s: 'Paperwork and certification', d: 'Tax counsel structures the partnership and gives opinions. The CPA prepares the cost certification that the HFA requires before issuing Form 8609, and the annual partnership tax returns and K-1s that carry the credits to investors.' },
      pm: { t: 'Property manager', s: 'Runs the building', d: 'Leases units, verifies every applicant\'s income and assets, recertifies tenants (annually in most programs), maintains files for audits, enforces rent limits, and reports to the HFA and the investor. Most compliance failures happen here.' },
      ten: { t: 'Tenants', s: 'The point of it all', d: 'Households with incomes at or below the designated limit, paying rent at or below the limit for their unit. LIHTC does not itself subsidize the tenant; a household with a voucher pays about 30% of its income and the voucher covers the rest.' },
      pha: { t: 'Housing authority', s: 'Vouchers', d: 'Public housing agencies administer Housing Choice Vouchers and project-based vouchers. LIHTC owners may not refuse applicants because they hold a voucher. Project-based vouchers are often what makes units affordable to the lowest-income households.' },
    };
    const MODES = {
      money: [['inv', 'syn', 'equity'], ['syn', 'owner', 'equity in installments'], ['lend', 'owner', 'loans'], ['owner', 'lend', 'debt service'], ['soft', 'owner', 'soft loans, grants'], ['owner', 'dev', 'developer fee'], ['owner', 'build', 'construction contract'], ['ten', 'pm', 'rent'], ['pha', 'pm', 'voucher payments'], ['pm', 'owner', 'net operating income'], ['local', 'owner', 'tax abatement'], ['owner', 'hfa', 'fees']],
      credits: [['irs', 'hfa', 'annual credit ceiling'], ['hfa', 'owner', 'allocation, Form 8609'], ['owner', 'syn', 'K-1: credits & losses'], ['syn', 'inv', 'credits passed through fund'], ['inv', 'irs', 'Form 8586 claim']],
      papers: [['dev', 'hfa', 'application under the QAP'], ['hfa', 'owner', 'carryover, extended use agreement'], ['syn', 'owner', 'partnership agreement'], ['dev', 'syn', 'guarantees'], ['pros', 'hfa', 'cost certification'], ['pm', 'hfa', 'tenant certifications, annual reports'], ['hfa', 'irs', 'Form 8823'], ['lend', 'owner', 'loan & regulatory agreements'], ['local', 'dev', 'zoning, permits']],
      oversight: [['hfa', 'pm', 'file audits, inspections'], ['syn', 'owner', 'asset management'], ['irs', 'hfa', 'regulations, audits'], ['lend', 'owner', 'loan servicing'], ['inv', 'syn', 'fund reporting'], ['soft', 'owner', 'program monitoring']],
    };
    const MODE_COL = { money: '--s2', credits: '--s1', papers: '--s3', oversight: '--ink-2' };
    const MODE_NAME = { money: 'Follow the money', credits: 'Follow the credits', papers: 'Follow the paperwork', oversight: 'Who watches whom' };
    // Grid positions as [column, row]. Fractional columns center a box between two others.
    const LAYOUTS = {
      wide: { cols: 5, pos: { irs: [2, 0], inv: [0, 1], syn: [1, 1], hfa: [3, 1], local: [4, 1], build: [0, 2], dev: [1, 2], owner: [2, 2], lend: [3, 2], soft: [4, 2], pros: [0, 3], ten: [1, 3], pm: [2, 3], pha: [3, 3] } },
      narrow: { cols: 2, pos: { irs: [0.5, 0], inv: [0, 1], hfa: [1, 1], syn: [0, 2], local: [1, 2], dev: [0, 3], soft: [1, 3], owner: [0.5, 4], build: [0, 5], lend: [1, 5], pros: [0, 6], pm: [1, 6], ten: [0, 7], pha: [1, 7] } },
    };
    let mode = 'money', sel = 'owner';
    const measure = document.createElement('canvas').getContext('2d');

    // Split a title into at most two lines that fit the box.
    function wrap(text, maxW, font) {
      measure.font = font;
      const words = text.split(' '), lines = [];
      let line = '';
      words.forEach((w) => {
        const t = line ? line + ' ' + w : w;
        if (measure.measureText(t).width <= maxW || !line) line = t;
        else { lines.push(line); line = w; }
      });
      lines.push(line);
      return lines;
    }
    const inside = (p, b, m) => p[0] > b.x - m && p[0] < b.x + b.w + m && p[1] > b.y - m && p[1] < b.y + b.h + m;
    const curve = (A, B, bend, n = 48) => {
      const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1;
      const cx = mx - (dy / L) * bend, cy = my + (dx / L) * bend, pts = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n, u = 1 - t;
        pts.push([u * u * A[0] + 2 * u * t * cx + t * t * B[0], u * u * A[1] + 2 * u * t * cy + t * t * B[1]]);
      }
      return pts;
    };

    function draw() {
      const pal = Lab.palette(), colVar = MODE_COL[mode], col = Lab.css(colVar);
      root.style.setProperty('--mode', `var(${colVar})`);
      const W = Math.max(300, Math.round(map.clientWidth || 600));
      const L = LAYOUTS[W >= 640 ? 'wide' : 'narrow'];
      const gap = W >= 640 ? 18 : 14, pad = 12;
      const boxW = Math.min(170, (W - 2 * pad - (L.cols - 1) * gap) / L.cols), boxH = 48;
      const x0 = (W - (L.cols * boxW + (L.cols - 1) * gap)) / 2;
      const rowH = W >= 640 ? 108 : 96;
      const rows = Math.max(...Object.values(L.pos).map((p) => p[1]));
      const H = 30 + rows * rowH + boxH + 30;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.setAttribute('height', H);
      svg.innerHTML = '';

      const box = {};
      Object.entries(L.pos).forEach(([k, [c, r]]) => {
        const cx = x0 + boxW / 2 + c * (boxW + gap), cy = 30 + boxH / 2 + r * rowH;
        box[k] = { x: cx - boxW / 2, y: cy - boxH / 2, w: boxW, h: boxH, c: [cx, cy] };
      });

      const edges = MODES[mode];
      const incident = (e) => !sel || e[0] === sel || e[1] === sel;
      const linked = new Set(); edges.forEach((e) => { if (incident(e)) { linked.add(e[0]); linked.add(e[1]); } });

      const defs = Lab.svg('defs', {}, svg);
      [['pa', col], ['pb', pal.rule]].forEach(([id, fill]) => {
        const mk = Lab.svg('marker', { id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
        Lab.svg('path', { d: 'M0 0 L10 5 L0 10 z', fill }, mk);
      });

      // Route each edge as a curve, bending it until it clears every box except its own two ends.
      const routed = edges.map(([a, b], i) => {
        const A = box[a], B = box[b], others = Object.entries(box).filter(([k]) => k !== a && k !== b).map(([, v]) => v);
        let best = null;
        for (const bend of [16, 56, -24, 96, -64, 136, -104, 176, -144]) {
          const pts = curve(A.c, B.c, bend);
          if (!pts.some((p) => others.some((o) => inside(p, o, 8)))) { best = pts; break; }
        }
        best = best || curve(A.c, B.c, 16);
        const trimmed = best.filter((p) => !inside(p, A, 3) && !inside(p, B, 6));
        return { a, b, i, pts: trimmed.length > 1 ? trimmed : best };
      });

      const edgeG = Lab.svg('g', {}, svg);
      routed.forEach((e) => {
        const on = incident(edges[e.i]);
        Lab.svg('path', { 'data-i': e.i, d: 'M' + e.pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L'), fill: 'none', stroke: on ? col : pal.rule, 'stroke-width': on ? 2 : 1.2, opacity: on ? 1 : 0.55, 'marker-end': `url(#${on ? 'pa' : 'pb'})` }, edgeG);
      });

      const titleFont = `600 13px ${Lab.css('--f-display')}`, smallFont = `600 11.5px ${Lab.css('--f-display')}`;
      Object.entries(box).forEach(([k, b]) => {
        const n = N[k], active = k === sel, faded = sel && !linked.has(k) && !active;
        const g = Lab.svg('g', { class: 'node', tabindex: 0, role: 'button', 'aria-pressed': active ? 'true' : 'false', 'aria-label': n.t + ': ' + n.s, opacity: faded ? 0.45 : 1 }, svg);
        Lab.svg('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 3, fill: active ? pal.ink : pal.paper3, stroke: active ? pal.ink : pal.ink3, 'stroke-width': 1.2 }, g);
        let font = titleFont, size = 13, lines = wrap(n.t, b.w - 16, font);
        if (lines.length > 2 || lines.some((l) => (measure.font = font, measure.measureText(l).width > b.w - 12))) { font = smallFont; size = 11.5; lines = wrap(n.t, b.w - 12, font); }
        const lh = size * 1.2, top = b.c[1] - ((lines.length - 1) * lh) / 2 + size * 0.36;
        lines.slice(0, 2).forEach((l, j) => {
          const t = Lab.svg('text', { x: b.c[0], y: top + j * lh, 'text-anchor': 'middle', 'font-size': size, 'font-weight': 600, style: `font-family:${Lab.css('--f-display')}`, fill: active ? pal.paper3 : pal.ink }, g);
          t.textContent = l;
        });
        const pick = () => { sel = sel === k ? null : k; draw(); const again = Lab.$(`.node[aria-label^="${n.t}:"]`, svg); again && again.focus({ preventScroll: true }); };
        g.addEventListener('click', pick);
        g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      });

      // Numbered markers at each visible edge's midpoint, nudged apart so none overlap each other or a box.
      const badges = routed.filter((e) => incident(edges[e.i])).map((e) => ({ i: e.i, p: [...e.pts[Math.floor(e.pts.length / 2)]] }));
      const R = 10;
      for (let it = 0; it < 60; it++) {
        badges.forEach((A, ia) => {
          badges.forEach((B, ib) => {
            if (ib <= ia) return;
            const dx = B.p[0] - A.p[0], dy = B.p[1] - A.p[1], d = Math.hypot(dx, dy) || 0.01;
            if (d < 2 * R + 4) { const push = (2 * R + 4 - d) / 2, ux = dx / d, uy = dy / d; A.p[0] -= ux * push; A.p[1] -= uy * push; B.p[0] += ux * push; B.p[1] += uy * push; }
          });
          Object.values(box).forEach((b) => {
            if (!inside(A.p, b, R + 2)) return;
            const dl = A.p[0] - (b.x - R - 2), dr = b.x + b.w + R + 2 - A.p[0], dt = A.p[1] - (b.y - R - 2), db = b.y + b.h + R + 2 - A.p[1];
            const m = Math.min(dl, dr, dt, db);
            if (m === dl) A.p[0] -= dl; else if (m === dr) A.p[0] += dr; else if (m === dt) A.p[1] -= dt; else A.p[1] += db;
          });
          A.p[0] = Math.max(R + 2, Math.min(W - R - 2, A.p[0])); A.p[1] = Math.max(R + 2, Math.min(H - R - 2, A.p[1]));
        });
      }
      badges.forEach(({ i, p }) => {
        const g = Lab.svg('g', { 'data-i': i, style: 'cursor:default' }, svg);
        Lab.svg('circle', { cx: p[0], cy: p[1], r: R, fill: col, stroke: pal.paper3, 'stroke-width': 2 }, g);
        const t = Lab.svg('text', { x: p[0], y: p[1] + 3.8, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 600, fill: pal.paper3 }, g);
        t.textContent = i + 1;
        g.addEventListener('pointerenter', () => hot(i)); g.addEventListener('pointerleave', () => hot(null));
      });

      const n = sel && N[sel];
      panel.innerHTML = n
        ? `<span class="label">${n.s}</span><h5>${n.t}</h5><p>${n.d}</p>`
        : `<span class="label">${MODE_NAME[mode]}</span><h5>All parties</h5><p>Select any party on the map to read its role and see only the flows it sends or receives.</p>`;
      head.textContent = n ? `${MODE_NAME[mode]} · flows involving ${n.t}` : `${MODE_NAME[mode]} · all flows`;
      list.innerHTML = edges.map(([a, b, l], i) => `<li data-i="${i}" class="${incident(edges[i]) ? '' : 'dim'}"><span class="n">${i + 1}</span><span><b>${N[a].t}</b> → <b>${N[b].t}</b>: ${l}</span></li>`).join('');
      if (!edges.some(incident)) list.innerHTML += '<li><span></span><span>No flows involve this party in this view. Try another view above.</span></li>';
      Lab.$$('li[data-i]', list).forEach((li) => {
        li.addEventListener('pointerenter', () => hot(+li.dataset.i));
        li.addEventListener('pointerleave', () => hot(null));
      });
    }
    // Emphasize one flow on the map and in the list.
    function hot(i) {
      Lab.$$('path[data-i]', svg).forEach((p) => {
        const on = i === null || +p.dataset.i === i;
        p.style.opacity = on ? '' : '0.2';
        p.style.strokeWidth = i !== null && +p.dataset.i === i ? '3.5' : '';
      });
      Lab.$$('g[data-i]', svg).forEach((g) => { g.style.opacity = i === null || +g.dataset.i === i ? '' : '0.3'; });
      Lab.$$('li[data-i]', list).forEach((li) => li.classList.toggle('hot', i !== null && +li.dataset.i === i));
    }
    Lab.$$('[data-mode]', root).forEach((b) => b.addEventListener('click', () => {
      mode = b.dataset.mode;
      Lab.$$('[data-mode]', root).forEach((o) => o.setAttribute('aria-pressed', o === b ? 'true' : 'false'));
      draw();
    }));
    draw(); Lab.onTheme(draw); Lab.onResize(map, draw);
  }

  /* ---------- Fig 11.1 The life of a 9% deal ---------- */
  const tl = Lab.$('#fig-timeline');
  if (tl) {
    const wrap = Lab.$('.chart-wrap', tl), svg = Lab.$('svg', tl), tip = Lab.tip(wrap);
    const VIEWS = {
      dev: {
        unit: 'months after the QAP is published', max: 48, ticks: [0, 6, 12, 18, 24, 30, 36, 42, 48], rows: [
          ['QAP published, application window', 0, 3, 'The agency publishes its Qualified Allocation Plan and application. Developers need site control, preliminary financing commitments, and local approvals before applying.'],
          ['Agency review and scoring', 3, 6, 'Staff score applications against the QAP, check threshold requirements, and underwrite costs and feasibility. Many states hold one round a year.'],
          ['Award (reservation of credits)', 6, 6, 'The board approves the ranked list. The developer gets a reservation letter, not yet an allocation.'],
          ['Carryover allocation', 11, 11, 'If the building will not be placed in service in the award year, the agency makes a carryover allocation by December 31.'],
          ['Investor and lender due diligence', 6, 17, 'Syndicator and lenders underwrite the deal; plans and specs are finalized; permits and remaining soft funds are secured.'],
          ['10% test deadline', 23, 23, 'Within 12 months of the carryover allocation, the owner must have incurred more than 10% of its reasonably expected basis.'],
          ['Financial closing', 17, 17, 'The partnership agreement, construction loan, and soft loans close together. The investor admits to the partnership and makes the first equity installment.'],
          ['Construction', 17, 35, 'Typically 14 to 24 months. Draws are reviewed by the lender and the investor\'s construction consultant.'],
          ['Placed-in-service deadline', 36, 36, 'A carryover building must be placed in service by the end of the second calendar year after the allocation year.'],
          ['Lease-up and stabilization', 35, 41, 'Every tenant\'s income is certified before move-in. The credit for the first year is prorated by the units occupied by qualified tenants each month.'],
          ['Cost certification and Form 8609', 41, 45, 'A CPA certifies final costs; the agency confirms the credit amount and issues Form 8609, which the owner needs to claim credits. Final equity installment.'],
        ],
        marks: [[17, '20%'], [35, '35%'], [41, '30%'], [45, '15%']],
      },
      life: {
        unit: 'years after the award', max: 34, ticks: [0, 5, 10, 15, 20, 25, 30], rows: [
          ['Development', 0, 3, 'Award through placed in service and lease-up.'],
          ['Credit period (10 years)', 3, 13, 'Credits are claimed annually, beginning the year the building is placed in service or, at the owner\'s election, the following year.'],
          ['Compliance period (15 years)', 3, 18, 'Federal compliance period. Noncompliance can trigger recapture of part of the credits already claimed.'],
          ['Year 15: investor exit', 18, 19, 'The investor\'s benefits are exhausted. It usually sells its interest to the general partner or a nonprofit with a right of first refusal, often for a nominal price plus taxes due.'],
          ['Extended use (at least 15 more years)', 18, 33, 'Rent and income limits continue under the recorded extended use agreement. Many states require longer terms, 30 to 55 years in total.'],
          ['Qualified contract option', 17, 18, 'After year 14, an owner can ask the agency to find a buyer at a formula price. If none is found within one year, the restrictions end after a three-year wind-down, unless the owner waived this right.'],
        ],
        marks: [],
      },
    };
    let view = 'dev';
    function draw() {
      const pal = Lab.palette(), V = VIEWS[view];
      const W = 760, lw = 236, rh = 26, top = 24, H = top + V.rows.length * rh + 44;
      svg.innerHTML = ''; svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const x = Lab.scale(0, V.max, lw, W - 16);
      V.ticks.forEach((v) => {
        Lab.svg('line', { x1: x(v), x2: x(v), y1: top - 6, y2: H - 30, stroke: pal.grid }, svg);
        const t = Lab.svg('text', { x: x(v), y: H - 14, 'text-anchor': 'middle', 'font-size': 11, fill: pal.ink3 }, svg); t.textContent = v;
      });
      const ul = Lab.svg('text', { x: W - 16, y: 12, 'text-anchor': 'end', 'font-size': 11, fill: pal.ink3 }, svg); ul.textContent = V.unit;
      V.rows.forEach(([name, a, b, desc], i) => {
        const y = top + i * rh;
        const t = Lab.svg('text', { x: lw - 10, y: y + 15, 'text-anchor': 'end', 'font-size': 11.5, fill: pal.ink2 }, svg); t.textContent = name;
        const milestone = a === b, deadline = /deadline/i.test(name);
        const col = deadline ? pal.s2 : /credit|8609|award|carryover|closing/i.test(name) ? pal.s1 : pal.ink3;
        if (milestone) {
          const cx = x(a), cy = y + 11;
          Lab.svg('path', { d: `M${cx} ${cy - 7} L${cx + 7} ${cy} L${cx} ${cy + 7} L${cx - 7} ${cy} Z`, fill: col, stroke: pal.paper3, 'stroke-width': 1.5 }, svg);
        } else {
          Lab.svg('rect', { x: x(a), y: y + 4, width: Math.max(3, x(b) - x(a) - 2), height: 15, rx: 3, fill: /Extended/.test(name) ? pal.rule : col }, svg);
        }
        const hit = Lab.svg('rect', { x: 0, y, width: W, height: rh, fill: 'transparent' }, svg);
        hit.addEventListener('pointermove', () => { const r = svg.getBoundingClientRect(); tip.show((x((a + b) / 2) / W) * r.width, (y / H) * r.height, `<b>${name}</b><br><span style="white-space:normal;display:block;max-width:260px">${desc}</span>`); });
        hit.addEventListener('pointerleave', () => tip.hide());
      });
      if (V.marks.length) {
        const y = top + V.rows.length * rh + 2;
        const t = Lab.svg('text', { x: lw - 10, y: y + 4, 'text-anchor': 'end', 'font-size': 11, fill: pal.ink3 }, svg); t.textContent = 'Equity installments (example)';
        V.marks.forEach(([m, lab]) => {
          Lab.svg('circle', { cx: x(m), cy: y, r: 4, fill: pal.s1 }, svg);
          const l = Lab.svg('text', { x: x(m) + 7, y: y + 4, 'font-size': 10.5, fill: pal.ink2 }, svg); l.textContent = lab;
        });
      }
    }
    Lab.$$('[data-view]', tl).forEach((b) => b.addEventListener('click', () => {
      view = b.dataset.view;
      Lab.$$('[data-view]', tl).forEach((o) => o.setAttribute('aria-pressed', o === b ? 'true' : 'false'));
      draw();
    }));
    draw(); Lab.onTheme(draw);
  }
})();
