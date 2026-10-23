/* Volume X hero: the same question, two jurisdictions. Pick a product and see how the US and the EU classify it
   and which route it takes to market. */
(function () {
  const root = Lab.$('#hero-cases');
  if (!root) return;
  const tabs = Lab.$('.case-tabs', root), card = Lab.$('.case-card', root);
  const CASES = [
    { id: 'tongue', name: 'Tongue depressor', what: 'A wooden blade to hold the tongue down during an examination.',
      us: { cls: 'Class I', route: 'Exempt from 510(k)', basis: '21 CFR 880.6230; general controls only' },
      eu: { cls: 'Class I', route: 'Self-declared conformity', basis: 'MDR Annex VIII, Rule 5: transient use through a body orifice' } },
    { id: 'condom', name: 'Condom', what: 'A sheath for contraception and for preventing sexually transmitted infections.',
      us: { cls: 'Class II', route: '510(k)', basis: '21 CFR 884.5300; special controls, including labeling' },
      eu: { cls: 'Class IIb', route: 'Notified body', basis: 'MDR Rule 14: devices for contraception or preventing sexually transmitted infections' } },
    { id: 'glucose', name: 'Home blood glucose meter', what: 'A meter and test strips a person with diabetes uses to check their own blood sugar.',
      us: { cls: 'Class II', route: '510(k)', basis: '21 CFR 862.1345, glucose test system' },
      eu: { cls: 'Class C', route: 'Notified body', basis: 'IVDR Rule 4: devices for self-testing (blood glucose is not among the class B exceptions)' } },
    { id: 'triage', name: 'AI stroke triage software', what: 'Software that flags a suspected large-vessel stroke on a CT scan and alerts a specialist.',
      us: { cls: 'Class II', route: 'De Novo, then 510(k)', basis: 'Viz.ai ContaCT, De Novo granted February 2018, created the radiological computer-aided triage type' },
      eu: { cls: 'Class IIb (typical)', route: 'Notified body', basis: 'MDR Rule 11 with MDCG 2019-11: critical condition, drives clinical management' } },
    { id: 'pacer', name: 'Implantable pacemaker', what: 'A battery-powered pulse generator implanted to pace the heart.',
      us: { cls: 'Class III', route: 'Premarket approval (PMA)', basis: '21 CFR 870.3610' },
      eu: { cls: 'Class III', route: 'Notified body, with expert panel review possible', basis: 'MDR Rule 8: active implantable devices' } },
  ];
  let sel = 3;
  function render() {
    tabs.innerHTML = '';
    CASES.forEach((c, i) => { const b = Lab.el('button', { type: 'button', class: 'chip', 'aria-pressed': i === sel ? 'true' : 'false' }, c.name); b.addEventListener('click', () => { sel = i; render(); }); tabs.appendChild(b); });
    const c = CASES[sel];
    card.innerHTML = `<p class="case-what">${c.what}</p>
      <div class="juris"><div><span class="label">United States · FDA</span><b class="stamp">${c.us.cls}</b><span class="route">${c.us.route}</span><span class="basis">${c.us.basis}</span></div>
      <div><span class="label">European Union · ${c.eu.cls.startsWith('Class C') ? 'IVDR' : 'MDR'}</span><b class="stamp">${c.eu.cls}</b><span class="route">${c.eu.route}</span><span class="basis">${c.eu.basis}</span></div></div>`;
  }
  render();
})();
