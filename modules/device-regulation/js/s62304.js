/* Volume X figure: IEC 62304 software safety classification (as amended in 2015) and the life-cycle
   activities each class requires. */
(function () {
  const root = Lab.$('#fig-62304');
  if (!root) return;
  const box = Lab.$('.qflow', root), res = Lab.$('.qresult', root), tbody = Lab.$('tbody', root), out = Lab.$('.readouts', root);
  // Decision steps from IEC 62304:2006+A1:2015, 4.3 (the probability of a software failure is taken as 1)
  const Q = {
    haz: { q: 'Can a failure of the software contribute to a hazardous situation?', opts: [['Yes', 'ext'], ['No', 'A']] },
    ext: { q: 'After counting risk control measures outside this software, such as a hardware interlock or an independent check, could that hazardous situation still lead to an unacceptable risk?', opts: [['Yes', 'sev'], ['No', 'A']] },
    sev: { q: 'What is the worst harm that could result?', opts: [['Non-serious injury', 'B'], ['Serious injury or death', 'C']] },
  };
  const CLS = {
    A: 'Class A: no injury or damage to health is possible.',
    B: 'Class B: non-serious injury is possible.',
    C: 'Class C: death or serious injury is possible.',
  };
  // Clause-level summary of which classes each activity applies to
  const ROWS = [
    ['5.1', 'Software development planning', 'ABC', ''],
    ['5.2', 'Software requirements analysis', 'ABC', ''],
    ['5.3', 'Architectural design, including requirements for SOUP and segregation of items', 'BC', ''],
    ['5.4', 'Detailed design of each software unit', 'C', 'dividing the architecture into units is required from class B'],
    ['5.5', 'Unit implementation and unit verification', 'BC', 'implementing each unit applies to every class; additional acceptance criteria apply to class C'],
    ['5.6', 'Integration and integration testing', 'BC', ''],
    ['5.7', 'Software system testing', 'ABC', 'required for class A since Amendment 1 (2015)'],
    ['5.8', 'Software release', 'ABC', 'some release tasks apply only from class B'],
    ['6', 'Software maintenance', 'ABC', ''],
    ['7', 'Software risk management', 'BC', 'analysing the safety effect of changes (7.4.1) applies to every class'],
    ['8', 'Configuration management, including identifying SOUP', 'ABC', ''],
    ['9', 'Problem resolution', 'ABC', ''],
  ];
  const PRESETS = {
    pump: { label: 'Infusion pump dose calculation', ans: { haz: 'Yes', ext: 'Yes', sev: 'Serious injury or death' } },
    limit: { label: 'Same, with an independent hardware dose limit', ans: { haz: 'Yes', ext: 'No' } },
    photo: { label: 'Wound photos shared for remote review', ans: { haz: 'Yes', ext: 'Yes', sev: 'Non-serious injury' } },
    log: { label: 'Device usage log for service engineers', ans: { haz: 'No' } },
  };
  let answers = { ...PRESETS.pump.ans };
  function walk() { let id = 'haz'; const path = []; while (Q[id]) { path.push(id); const a = answers[id]; if (!a) return { path, cls: null }; id = Q[id].opts.find((o) => o[0] === a)[1]; } return { path, cls: id }; }
  function render() {
    const { path, cls } = walk();
    box.innerHTML = '';
    path.forEach((id, i) => {
      const row = Lab.el('div', { class: 'qrow' });
      row.innerHTML = `<span class="qn">${i + 1}</span><p>${Q[id].q}</p>`;
      const ch = Lab.el('div', { class: 'chips' });
      Q[id].opts.forEach(([lab]) => {
        const b = Lab.el('button', { class: 'chip', type: 'button', 'aria-pressed': answers[id] === lab ? 'true' : 'false' }, lab);
        b.addEventListener('click', () => { answers[id] = lab; const keep = path.slice(0, i + 1); Object.keys(answers).forEach((k) => { if (!keep.includes(k)) delete answers[k]; }); answers[id] = lab; Lab.$$('[data-sp]', root).forEach((o) => o.setAttribute('aria-pressed', 'false')); render(); });
        ch.appendChild(b);
      });
      row.appendChild(ch); box.appendChild(row);
    });
    res.innerHTML = cls ? `<span class="label">Software safety class</span><h5>${CLS[cls]}</h5>` : '<span class="label">Software safety class</span><p class="muted">Answer the questions to classify the software.</p>';
    tbody.innerHTML = ROWS.map(([cl, name, cs, note]) => {
      const req = cls && cs.includes(cls);
      return `<tr class="${cls ? (req ? 'req' : 'noreq') : ''}"><td>${cl}</td><td>${name}${note ? `<span class="note">${note}</span>` : ''}</td>${['A', 'B', 'C'].map((c) => `<td class="mk${c === cls ? ' sel' : ''}">${cs.includes(c) ? '●' : '–'}</td>`).join('')}</tr>`;
    }).join('');
    const n = cls ? ROWS.filter((r) => r[2].includes(cls)).length : 0;
    out.innerHTML = cls ? `<span>activities required at the clause level <b>${n} of ${ROWS.length}</b></span><span>detailed design documented <b>${cls === 'C' ? 'yes' : 'no'}</b></span><span>unit verification <b>${cls === 'A' ? 'no' : 'yes'}</b></span>` : '';
  }
  const pre = Lab.$('.sp-presets', root);
  Object.entries(PRESETS).forEach(([k, p], i) => {
    const b = Lab.el('button', { class: 'chip', type: 'button', 'data-sp': k, 'aria-pressed': i === 0 ? 'true' : 'false' }, p.label);
    b.addEventListener('click', () => { answers = { ...p.ans }; Lab.$$('[data-sp]', root).forEach((o) => o.setAttribute('aria-pressed', o === b ? 'true' : 'false')); render(); });
    pre.appendChild(b);
  });
  render();
})();
