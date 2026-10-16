/* Who does what: the parties map and the life of a deal. */
(function () {
  /* ---------- Fig 10.1 The parties and what flows between them ---------- */
  const root = Lab.$('#fig-parties');
  if (root) {
    const svg = Lab.$('svg', root), panel = Lab.$('.party-panel', root);
    const N = {
      irs: { x: 450, y: 46, t: 'IRS & Treasury', s: 'Writes the rules', d: 'Administers §42 through regulations, revenue rulings, and notices. Publishes each year\'s per-capita credit amount and the monthly applicable percentages. Receives Form 8609 from each building owner and Form 8823 noncompliance reports from state agencies. Investors claim credits on Form 8586.' },
      hfa: { x: 650, y: 150, t: 'State housing agency', s: 'Allocates the credits', d: 'Each state designates a housing credit agency, usually its housing finance agency (HFA). It writes the Qualified Allocation Plan, scores applications, reserves and allocates credits, underwrites each deal so it gets no more credit than it needs, issues Form 8609 after cost certification, and monitors compliance for at least the 15-year compliance period and the extended use term.' },
      local: { x: 840, y: 270, t: 'Local government', s: 'Land use and local money', d: 'Grants zoning, permits, and sometimes property tax abatements or payments in lieu of taxes (PILOT). Often contributes soft funds such as HOME or CDBG dollars, and many QAPs award points for local support or alignment with a community revitalization plan.' },
      inv: { x: 90, y: 150, t: 'Investors', s: 'Buy the credits', d: 'Mostly banks, which receive Community Reinvestment Act consideration for these investments, plus insurance companies and other corporations with predictable federal tax liability. They contribute equity in exchange for the credits and tax losses, and expect a modest, low-risk after-tax return.' },
      syn: { x: 270, y: 150, t: 'Syndicator', s: 'Packages deals for investors', d: 'Also called a fund sponsor. Finds deals, negotiates pricing and the partnership agreement, underwrites the developer, pools many properties into multi-investor or proprietary funds, and provides asset management for 15 years. Large investors sometimes invest directly instead.' },
      owner: { x: 450, y: 270, t: 'Owner partnership', s: 'Owns the building', d: 'A single-purpose limited partnership or LLC. The investor (or the syndicator\'s fund) is the limited partner with about 99.99% of the interests, and so receives nearly all the credits and losses. The developer\'s affiliate is the general partner with about 0.01% and control of day-to-day operations.' },
      dev: { x: 240, y: 270, t: 'Developer / GP', s: 'Puts the deal together', d: 'Controls the site, designs the project, assembles financing, applies to the HFA, guarantees construction completion and operating deficits, and earns a developer fee (often capped by the QAP at roughly 10 to 15% of costs, with part of it deferred and paid from cash flow). Can be a nonprofit or a for-profit firm.' },
      lend: { x: 650, y: 380, t: 'Lenders', s: 'Construction and permanent debt', d: 'A construction lender funds building costs before most equity arrives. A permanent lender, often through Fannie Mae, Freddie Mac, FHA, or a state program, provides the long-term mortgage sized to the restricted rents. In 4% deals, tax-exempt private activity bonds issued by a state or local issuer finance construction.' },
      soft: { x: 840, y: 380, t: 'Soft funders', s: 'Fill the gap', d: 'Public and philanthropic sources lent on deferred or cash-flow-contingent terms: HOME and CDBG funds, state housing trust funds, Federal Home Loan Bank Affordable Housing Program grants, and local bonds. A typical deal has several, each with its own application, rules, and regulatory agreement.' },
      build: { x: 100, y: 380, t: 'Design & construction', s: 'Architect and contractor', d: 'The architect and general contractor design and build to the HFA\'s design standards and the lenders\' and investor\'s requirements. Construction draws are reviewed by the lender and the investor\'s construction monitor.' },
      pros: { x: 270, y: 470, t: 'Attorneys & CPAs', s: 'Paperwork and certification', d: 'Tax counsel structures the partnership and gives opinions. The CPA prepares the cost certification that the HFA requires before issuing Form 8609, and the annual partnership tax returns and K-1s that carry the credits to investors.' },
      pm: { x: 450, y: 470, t: 'Property manager', s: 'Runs the building', d: 'Leases units, verifies every applicant\'s income and assets, recertifies tenants (annually in most programs), maintains files for audits, enforces rent limits, and reports to the HFA and the investor. Most compliance failures happen here.' },
      ten: { x: 650, y: 470, t: 'Tenants', s: 'The point of it all', d: 'Households with incomes at or below the designated limit, paying rent at or below the limit for their unit. LIHTC does not itself subsidize the tenant; a household with a voucher pays about 30% of its income and the voucher covers the rest.' },
      pha: { x: 840, y: 470, t: 'Housing authority', s: 'Vouchers', d: 'Public housing agencies administer Housing Choice Vouchers and project-based vouchers. LIHTC owners may not refuse applicants because they hold a voucher. Project-based vouchers are often what makes units affordable to the lowest-income households.' },
    };
    const MODES = {
      money: [['inv', 'syn', 'equity'], ['syn', 'owner', 'equity in installments'], ['lend', 'owner', 'loans'], ['owner', 'lend', 'debt service'], ['soft', 'owner', 'soft loans, grants'], ['owner', 'dev', 'developer fee'], ['owner', 'build', 'construction contract'], ['ten', 'pm', 'rent'], ['pha', 'pm', 'voucher payments'], ['pm', 'owner', 'net operating income'], ['local', 'owner', 'tax abatement'], ['owner', 'hfa', 'fees']],
      credits: [['irs', 'hfa', 'annual credit ceiling'], ['hfa', 'owner', 'allocation, Form 8609'], ['owner', 'syn', 'K-1: credits & losses'], ['syn', 'inv', 'credits passed through fund'], ['inv', 'irs', 'Form 8586 claim']],
      papers: [['dev', 'hfa', 'application under the QAP'], ['hfa', 'owner', 'carryover, extended use agreement'], ['syn', 'owner', 'partnership agreement'], ['dev', 'syn', 'guarantees'], ['pros', 'hfa', 'cost certification'], ['pm', 'hfa', 'tenant certifications, annual reports'], ['hfa', 'irs', 'Form 8823'], ['lend', 'owner', 'loan & regulatory agreements'], ['local', 'dev', 'zoning, permits']],
      oversight: [['hfa', 'pm', 'file audits, inspections'], ['syn', 'owner', 'asset management'], ['irs', 'hfa', 'regulations, audits'], ['lend', 'owner', 'loan servicing'], ['inv', 'syn', 'fund reporting'], ['soft', 'owner', 'program monitoring']],
    };
    const MODE_COL = { money: '--s2', credits: '--s1', papers: '--s3', oversight: '--ink-2' };
    let mode = 'money', sel = 'owner';
    function draw() {
      const pal = Lab.palette(), col = Lab.css(MODE_COL[mode]);
      svg.innerHTML = '';
      const defs = Lab.svg('defs', {}, svg);
      const mk = Lab.svg('marker', { id: 'pa', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
      Lab.svg('path', { d: 'M0 0 L10 5 L0 10 z', fill: col }, mk);
      const mk2 = Lab.svg('marker', { id: 'pb', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
      Lab.svg('path', { d: 'M0 0 L10 5 L0 10 z', fill: pal.rule }, mk2);
      const edges = MODES[mode];
      const pairSeen = {};
      const labels = [];
      edges.forEach(([a, b, lab]) => {
        const A = N[a], B = N[b];
        const key = [a, b].sort().join('-');
        const bend = pairSeen[key] ? -28 : 28; pairSeen[key] = 1;
        const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy);
        const ux = dx / len, uy = dy / len;
        const sx = A.x + ux * 62, sy = A.y + uy * 30, ex = B.x - ux * 62, ey = B.y - uy * 30;
        const mx = (sx + ex) / 2 - uy * bend, my = (sy + ey) / 2 + ux * bend;
        const on = !sel || a === sel || b === sel;
        Lab.svg('path', { d: `M${sx} ${sy} Q${mx} ${my} ${ex} ${ey}`, fill: 'none', stroke: on ? col : pal.rule, 'stroke-width': on ? 2 : 1.2, 'marker-end': `url(#${on ? 'pa' : 'pb'})`, opacity: on ? 1 : 0.6 }, svg);
        if (on) labels.push([(sx + 2 * mx + ex) / 4, (sy + 2 * my + ey) / 4, lab]);
      });
      Object.entries(N).forEach(([k, n]) => {
        const g = Lab.svg('g', { tabindex: 0, role: 'button', 'aria-label': n.t, style: 'cursor:pointer' }, svg);
        const active = k === sel;
        Lab.svg('rect', { x: n.x - 72, y: n.y - 24, width: 144, height: 48, rx: 3, fill: active ? pal.ink : pal.paper3, stroke: active ? pal.ink : pal.ink3, 'stroke-width': 1.2 }, g);
        const t = Lab.svg('text', { x: n.x, y: n.y - 3, 'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 600, fill: active ? pal.paper3 : pal.ink }, g); t.textContent = n.t;
        const s = Lab.svg('text', { x: n.x, y: n.y + 13, 'text-anchor': 'middle', 'font-size': 10.5, fill: active ? pal.paper3 : pal.ink3 }, g); s.textContent = n.s;
        const pick = () => { sel = sel === k ? null : k; draw(); };
        g.addEventListener('click', pick);
        g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      });
      labels.forEach(([x, y, lab]) => {
        const t = Lab.svg('text', { x, y: y + 4, 'text-anchor': 'middle', 'font-size': 10.5, fill: pal.ink, stroke: pal.paper3, 'stroke-width': 4, 'paint-order': 'stroke', 'stroke-linejoin': 'round' }, svg);
        t.textContent = lab;
      });
      const n = sel && N[sel];
      panel.innerHTML = n
        ? `<span class="label">${n.s}</span><h5>${n.t}</h5><p>${n.d}</p><p class="sub">${edges.filter(([a, b]) => a === sel || b === sel).map(([a, b, l]) => (a === sel ? `→ ${N[b].t}: ${l}` : `← ${N[a].t}: ${l}`)).join('<br>') || 'No flows in this view.'}</p>`
        : '<p class="sub">Select any party to read its role and isolate its connections.</p>';
    }
    Lab.$$('[data-mode]', root).forEach((b) => b.addEventListener('click', () => {
      mode = b.dataset.mode;
      Lab.$$('[data-mode]', root).forEach((o) => o.setAttribute('aria-pressed', o === b ? 'true' : 'false'));
      draw();
    }));
    draw(); Lab.onTheme(draw);
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
