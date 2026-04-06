/* ===== GLOSSARY DATA ===== */
const GLOSSARY = {
  "probable-cause": {
    term: "Probable Cause",
    def: "A reasonable belief, based on facts, that a crime has been committed and the suspect committed it. This is a lower standard than 'beyond a reasonable doubt' and is required for arrests, search warrants, and charging decisions."
  },
  "tro": {
    term: "Temporary Restraining Order (TRO)",
    def: "An emergency court order that temporarily prohibits a party from doing something (or requires them to do something) until a full hearing can be held. TROs are issued quickly, sometimes without notice to the other side."
  },
  "jurisdiction": {
    term: "Jurisdiction",
    def: "The authority of a court to hear and decide a case. A court must have jurisdiction over the type of case (subject matter jurisdiction) and over the people involved (personal jurisdiction). Filing in a court without jurisdiction means the case will be dismissed."
  },
  "statute-of-limitations": {
    term: "Statute of Limitations",
    def: "The legal deadline for filing a case. After this deadline passes, the case can never be filed. For example, many personal injury cases have a 2-3 year statute of limitations. Murder typically has no statute of limitations."
  },
  "nolo-contendere": {
    term: "Nolo Contendere (No Contest)",
    def: "A plea in which the defendant does not admit guilt but accepts the punishment as if they were guilty. The key advantage: unlike a guilty plea, a nolo contendere plea cannot be used as evidence against the defendant in a related civil lawsuit."
  },
  "brady-material": {
    term: "Brady Material",
    def: "Evidence in the possession of the prosecution that is favorable to the defendant — either because it suggests innocence (exculpatory) or because it undermines a prosecution witness (impeachment). The prosecution has a constitutional duty to disclose all Brady material. Named after Brady v. Maryland (1963)."
  },
  "miranda": {
    term: "Miranda Rights",
    def: "The rights that police must inform a suspect of before custodial interrogation: the right to remain silent, that anything said can be used against them, the right to an attorney, and the right to a free attorney if they cannot afford one. Named after Miranda v. Arizona (1966). Statements obtained without Miranda warnings may be suppressed."
  },
  "motion-in-limine": {
    term: "Motion in Limine",
    def: "A pre-trial motion asking the judge to rule on whether specific evidence should be admitted or excluded at trial. 'In limine' means 'at the threshold.' These motions are decided before the jury ever hears the evidence, preventing prejudice."
  },
  "motion-to-suppress": {
    term: "Motion to Suppress",
    def: "A defense motion asking the judge to exclude evidence that was obtained illegally — typically through an unconstitutional search, seizure, or interrogation. If granted, the prosecution cannot use that evidence at trial."
  },
  "sanctions": {
    term: "Sanctions",
    def: "Penalties imposed by the court for violating court rules or orders. Sanctions can include fines, adverse inference instructions (telling the jury to assume the missing evidence was unfavorable), exclusion of evidence, or even dismissal of the case."
  },
  "in-camera": {
    term: "In Camera",
    def: "Latin for 'in chambers.' An in camera review is when the judge privately examines evidence or documents without either party present, to decide whether the material should be disclosed or admitted."
  },
  "privilege": {
    term: "Privilege",
    def: "A legal right that protects certain communications from being disclosed in court. Common privileges include attorney-client privilege (conversations with your lawyer), spousal privilege, doctor-patient privilege, and the Fifth Amendment privilege against self-incrimination."
  },
  "spoliation": {
    term: "Spoliation",
    def: "The destruction, alteration, or failure to preserve evidence that is relevant to a legal proceeding. Once you know or should know that evidence may be needed for litigation, you must preserve it. Spoliation can result in severe sanctions."
  },
  "factual-basis": {
    term: "Factual Basis",
    def: "Before accepting a guilty plea, the judge must confirm that the facts of the case support the charge — that the defendant actually did what they are admitting to. The prosecution briefly states what they would prove at trial."
  },
  "plea-colloquy": {
    term: "Plea Colloquy",
    def: "The formal dialogue between the judge and the defendant during a guilty plea. The judge asks a series of questions to ensure the defendant understands the charges, the rights they are giving up, and the consequences of pleading guilty. Required by Federal Rule of Criminal Procedure 11."
  },
  "alford-plea": {
    term: "Alford Plea",
    def: "A guilty plea where the defendant does not admit to the crime but acknowledges that the prosecution has enough evidence to likely convict them at trial. Named after North Carolina v. Alford (1970). Not all jurisdictions allow Alford pleas."
  },
  "voir-dire": {
    term: "Voir Dire",
    def: "French for 'to speak the truth.' The process of questioning and selecting jurors for a trial. Attorneys and/or the judge ask potential jurors questions to identify biases and select an impartial jury."
  },
  "venire": {
    term: "Venire",
    def: "The pool of potential jurors summoned to the courthouse for jury selection. From this larger group, the final jury is selected through voir dire."
  },
  "peremptory-challenge": {
    term: "Peremptory Challenge",
    def: "The right to reject a potential juror without giving a reason. Each side has a limited number. Cannot be used to discriminate based on race, gender, or ethnicity (Batson v. Kentucky)."
  },
  "batson-challenge": {
    term: "Batson Challenge",
    def: "A challenge raised when one side believes the other is using peremptory strikes to remove jurors based on race, gender, or ethnicity. Named after Batson v. Kentucky (1986). Three steps: (1) show a pattern of discriminatory strikes, (2) the striking party must give a race-neutral reason, (3) the judge decides if the reason is genuine or pretextual."
  },
  "burden-of-proof": {
    term: "Burden of Proof",
    def: "The obligation to prove the claims in a case. In criminal cases, the prosecution must prove guilt 'beyond a reasonable doubt' (the highest standard). In civil cases, the plaintiff must prove their claims by a 'preponderance of the evidence' (more likely than not — essentially 51%)."
  },
  "hung-jury": {
    term: "Hung Jury",
    def: "A jury that cannot reach a unanimous verdict (or the required majority in jurisdictions that allow non-unanimous verdicts). When a jury is hopelessly deadlocked, the judge declares a mistrial. The case may be retried with a new jury."
  },
  "jnov": {
    term: "Judgment Notwithstanding the Verdict (JNOV)",
    def: "A judge's decision to override the jury's verdict because no reasonable jury could have reached that conclusion based on the evidence. Also called 'Judgment as a Matter of Law' in federal courts. This is a dramatic remedy used rarely."
  },
  "psi": {
    term: "Pre-Sentence Investigation (PSI)",
    def: "A report prepared by a probation officer after a guilty verdict or plea. It details the defendant's criminal history, personal background, the circumstances of the crime, and calculates the recommended sentencing guideline range. The judge relies heavily on this report at sentencing."
  },
  "allocution": {
    term: "Allocution",
    def: "The defendant's personal statement to the judge before sentencing. This is the defendant's opportunity to express remorse, explain their circumstances, and ask for leniency. It is a constitutional right in federal cases."
  },
  "plain-error": {
    term: "Plain Error",
    def: "An error so obvious and serious that an appellate court will notice it even though the attorney did not object at trial. To win on plain error, you must show the error was clear, affected the outcome, and seriously undermined the fairness of the proceedings. This is a very hard standard to meet."
  },
  "en-banc": {
    term: "En Banc",
    def: "French for 'on the bench.' When all judges of an appellate court hear a case together, instead of the usual 3-judge panel. En banc review is reserved for the most important cases or to resolve disagreements between panels."
  },
  "cert": {
    term: "Certiorari",
    def: "A writ (order) by which a higher court (usually the Supreme Court) agrees to review a lower court's decision. The Supreme Court grants 'cert' in only about 1% of cases that petition for review. Cases are selected based on importance, disagreement among lower courts, or significant constitutional questions."
  },
  "remittitur": {
    term: "Remittitur",
    def: "A judge's order reducing the amount of damages awarded by a jury when the judge finds the amount is excessive. The plaintiff can accept the reduced amount or request a new trial on damages."
  },
  "additur": {
    term: "Additur",
    def: "A judge's order increasing the amount of damages awarded by a jury when the judge finds the amount is inadequate. Not available in federal courts (violates the Seventh Amendment per Dimick v. Schiedt) but allowed in some state courts."
  }
};

/* ===== PHASE ACCORDION TOGGLE ===== */
function togglePhase(hdr) {
  const card = hdr.closest('.phase-card');
  const body = card.querySelector('.phase-body');
  if (!body) return;

  if (card.classList.contains('open')) {
    body.style.maxHeight = body.scrollHeight + 'px';
    requestAnimationFrame(() => { body.style.maxHeight = '0px'; });
    card.classList.remove('open');
  } else {
    card.classList.add('open');
    body.style.maxHeight = body.scrollHeight + 'px';
    body.addEventListener('transitionend', function handler() {
      if (card.classList.contains('open')) body.style.maxHeight = 'none';
      body.removeEventListener('transitionend', handler);
    });
  }
}

/* ===== GLOSSARY MODAL ===== */
const modalOverlay = document.getElementById('glossaryModal');
const modalTerm = document.getElementById('modalTerm');
const modalDef = document.getElementById('modalDef');
const closeModal = document.getElementById('closeModal');

document.addEventListener('click', (e) => {
  const term = e.target.closest('.term[data-term]');
  if (term) {
    e.preventDefault();
    const key = term.dataset.term;
    const entry = GLOSSARY[key];
    if (entry) {
      modalTerm.textContent = entry.term;
      modalDef.textContent = entry.def;
      modalOverlay.classList.add('show');
    }
  }
});

closeModal.addEventListener('click', () => modalOverlay.classList.remove('show'));
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) modalOverlay.classList.remove('show');
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') modalOverlay.classList.remove('show');
});

/* ===== POPULATE GLOSSARY LIST ===== */
(function() {
  const list = document.getElementById('glossaryList');
  if (!list) return;
  const sorted = Object.entries(GLOSSARY).sort((a, b) => a[1].term.localeCompare(b[1].term));
  sorted.forEach(([key, val]) => {
    const item = document.createElement('div');
    item.style.cssText = 'margin-bottom:12px;padding:8px 12px;background:var(--bg-surface);border-radius:var(--radius);border:1px solid var(--border);';
    item.innerHTML = `<strong class="term" data-term="${key}" style="color:var(--accent);cursor:pointer;">${val.term}</strong><br><span style="font-size:0.88rem;color:var(--text-muted);">${val.def}</span>`;
    list.appendChild(item);
  });
})();

/* ===== CASE TYPE TOGGLE (Criminal / Civil) ===== */
const caseToggleGroup = document.getElementById('caseToggle');
let currentCase = 'criminal';
if (caseToggleGroup) {
  caseToggleGroup.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      caseToggleGroup.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCase = btn.dataset.case;
      applyCaseFilter();
    });
  });
  applyCaseFilter();
}
function applyCaseFilter() {
  document.querySelectorAll('.criminal-only').forEach(el => {
    el.style.display = currentCase === 'civil' ? 'none' : '';
  });
  document.querySelectorAll('.civil-only').forEach(el => {
    el.style.display = currentCase === 'criminal' ? 'none' : '';
  });
}

/* ===== ROLE / PERSPECTIVE SELECTOR ===== */
const roleSelect = document.getElementById('roleSelect');
if (roleSelect) {
  roleSelect.addEventListener('change', applyRoleFilter);
  applyRoleFilter();
}
function applyRoleFilter() {
  const val = roleSelect ? roleSelect.value : 'observer';
  // Remove previous highlights
  document.querySelectorAll('.section-block[data-role]').forEach(el => {
    el.classList.remove('role-highlight');
  });
  // Highlight matching role blocks
  if (val !== 'observer' && val !== 'all') {
    document.querySelectorAll(`.section-block[data-role="${val}"]`).forEach(el => {
      el.classList.add('role-highlight');
    });
  }
}

/* ===== SEARCH ===== */
const searchInput = document.getElementById('searchInput');
const searchClearBtn = document.getElementById('clearSearch');

if (searchInput) {
  searchInput.addEventListener('input', debounce(doSearch, 300));
}
if (searchClearBtn) {
  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearch();
  });
}

function debounce(fn, ms) {
  let t;
  return function(...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
}

function doSearch() {
  clearSearch();
  const q = searchInput.value.trim().toLowerCase();
  if (q.length < 2) return;

  // Escape regex special chars
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${escaped})`, 'gi');

  const main = document.querySelector('main');
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, null);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  let matchCount = 0;
  textNodes.forEach(node => {
    if (node.parentElement.closest('script, style, .phase-hdr')) return;
    const text = node.textContent;
    if (!re.test(text)) return;
    re.lastIndex = 0;

    const frag = document.createDocumentFragment();
    let lastIdx = 0;
    let match;
    while ((match = re.exec(text)) !== null) {
      if (match.index > lastIdx) frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
      const mark = document.createElement('mark');
      mark.className = 'search-highlight';
      mark.textContent = match[1];
      frag.appendChild(mark);
      lastIdx = re.lastIndex;
      matchCount++;
    }
    if (lastIdx < text.length) frag.appendChild(document.createTextNode(text.slice(lastIdx)));
    node.parentNode.replaceChild(frag, node);
  });

  // Open parent accordions for first match
  const firstMark = main.querySelector('mark.search-highlight');
  if (firstMark) {
    let el = firstMark;
    while (el) {
      if (el.classList && el.classList.contains('phase-card') && !el.classList.contains('open')) {
        const hdr = el.querySelector('.phase-hdr');
        if (hdr) togglePhase(hdr);
      }
      el = el.parentElement;
    }
    setTimeout(() => firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' }), 400);
  }
}

function clearSearch() {
  document.querySelectorAll('mark.search-highlight').forEach(mark => {
    const parent = mark.parentNode;
    parent.replaceChild(document.createTextNode(mark.textContent), mark);
    parent.normalize();
  });
}

/* ===== SIDEBAR NAVIGATION ===== */
document.querySelectorAll('.sidebar a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const id = link.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (!target) return;

    // Open the phase
    const card = target.querySelector('.phase-card') || target.closest('.phase-card');
    if (card && !card.classList.contains('open')) {
      const hdr = card.querySelector('.phase-hdr');
      if (hdr) togglePhase(hdr);
    }
    // Open parent phase if sub-phase
    const parentCard = target.closest('.phase > .phase-card');
    if (parentCard && !parentCard.classList.contains('open')) {
      const hdr = parentCard.querySelector(':scope > .phase-hdr');
      if (hdr) togglePhase(hdr);
    }

    setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);

    // Update active state
    document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
    link.classList.add('active');
  });
});

/* ===== PHASE PROGRESS BAR ===== */
const progressBtns = document.querySelectorAll('#phaseProgress button[data-target]');
progressBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.target;
    const target = document.getElementById(id);
    if (!target) return;

    const card = target.querySelector('.phase-card');
    if (card && !card.classList.contains('open')) {
      const hdr = card.querySelector('.phase-hdr');
      if (hdr) togglePhase(hdr);
    }
    setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);

    progressBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

/* ===== THEME TOGGLE (Dark/Light) ===== */
const themeToggleGroup = document.getElementById('themeToggle');
if (themeToggleGroup) {
  themeToggleGroup.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      themeToggleGroup.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (btn.dataset.theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    });
  });
}

/* ===== SIDEBAR TOGGLE (Mobile) ===== */
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.querySelector('.sidebar');
if (sidebarToggle && sidebar) {
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });
  // Close sidebar when clicking a link on mobile
  sidebar.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      if (window.innerWidth <= 900) sidebar.classList.remove('open');
    });
  });
}

/* ===== SCROLL SPY — Track active section ===== */
const phases = document.querySelectorAll('.phase[id]');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
      const link = document.querySelector(`.sidebar a[href="#${id}"]`);
      if (link) link.classList.add('active');

      progressBtns.forEach(b => b.classList.remove('active'));
      const progBtn = document.querySelector(`#phaseProgress button[data-target="${id}"]`);
      if (progBtn) progBtn.classList.add('active');
    }
  });
}, { rootMargin: '-20% 0px -70% 0px' });

phases.forEach(phase => observer.observe(phase));

/* ===== INIT ===== */
console.log('%c⚖️ Court Procedure Algorithm Guide loaded!', 'color:#5eead4; font-size:16px; font-weight:bold');
