/* ShiftReady: an independent, source-linked SIA study site. Vanilla ES modules, no build step. */
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = (items) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
const unique = (items) => [...new Set(items)];
const normaliseText = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const storageKey = 'clearline-study-v1';
const shortUnitName = (id, fallback = '') => ({
  'U1-COMMON': 'U1 · Common', 'DS-U2': 'DS · Unit 2', 'U3-CONFLICT': 'U3 · Conflict', 'U4-PI': 'U4 · Physical intervention',
  'SO-U2': 'SO · Unit 2', 'CCTV-U2': 'CCTV · Unit 2', 'CP-MAIN': 'CP · Main', 'CP-PI': 'CP · Physical intervention',
  'CP-DSR': 'CP · Door supervision', 'CVIT': 'CViT', 'DS-REF': 'DS refresher', 'SG-REF': 'SG refresher', 'CP-REF': 'CP refresher', 'VI': 'Vehicle immobilisation'
})[id] || fallback;
const CONTENT_DATE = '2026-11-11';
const EXAM_KEY = 'shiftready-exam-v1';
const defaultStore = { answers: {}, studied: {}, reports: [], attempts: [], checklist: {} };

function loadStore() {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey) || '{}');
    return { ...defaultStore, ...raw, answers: raw.answers || {}, studied: raw.studied || {}, reports: raw.reports || [], attempts: raw.attempts || [], checklist: raw.checklist || {} };
  } catch {
    return structuredClone(defaultStore);
  }
}
const store = loadStore();
const saveStore = () => localStorage.setItem(storageKey, JSON.stringify(store));

function setTheme(theme, persist = true) {
  if (theme === 'dark' || theme === 'light') {
    document.documentElement.dataset.theme = theme;
    if (persist) localStorage.setItem('theme', theme);
  } else {
    document.documentElement.removeAttribute('data-theme');
    if (persist) localStorage.removeItem('theme');
  }
  updateThemeIcon();
}

function systemTheme() {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function currentTheme() {
  return document.documentElement.dataset.theme || systemTheme();
}

function updateThemeIcon() {
  const button = $('#theme-toggle');
  if (!button) return;
  const theme = currentTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  button.setAttribute('aria-label', `Switch to ${next} theme`);
  button.title = `Switch to ${next} theme`;
  const icon = button.querySelector('.theme-icon');
  if (icon) icon.textContent = theme === 'dark' ? '☀' : '☾';
}

let DATA = null;
let examState = null;
let practiceState = null;
let toastTimer = null;

function toast(message) {
  const node = $('#toast');
  if (!node) return;
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 2600);
}

const routeParts = () => {
  const raw = location.hash.replace(/^#\/?/, '') || '';
  const [path, query = ''] = raw.split('?');
  return { path: path.split('/').filter(Boolean), query: new URLSearchParams(query) };
};

function href(path) { return `#/${path.replace(/^\/+/, '')}`; }

function setActiveNav(section, qualId = '') {
  const requested = qualId || store.lastQual || 'DS';
  const candidate = qualById(requested);
  const id = candidate && candidate.units.length && qualQuestions(candidate).length ? requested : 'DS';
  const targets = { learn: `learn/${id}`, practice: `practice/${id}`, exam: `exam/${id}` };
  $$('.main-nav a[data-nav]').forEach((link) => {
    link.removeAttribute('aria-current');
    const target = targets[link.dataset.nav];
    if (target) link.setAttribute('href', href(target));
  });
  const link = $(`.main-nav a[data-nav="${section}"]`);
  if (link) link.setAttribute('aria-current', 'page');
}

function sourceLink(source) {
  if (!source) return '';
  return `<a href="${esc(source.url)}" target="_blank" rel="noreferrer">${esc(source.doc_title)}</a>`;
}

function unitById(id) { return DATA.syllabus.units[id]; }
function qualById(id) { return DATA.syllabus.qualifications.find((q) => q.id === id); }
function unitQuestions(unit) { return DATA.questions.filter((q) => q.unit === unit); }
function qualUnits(qual) { return (qual?.units || []).map(unitById).filter(Boolean); }
function qualQuestions(qual) { return unique(qualUnits(qual).flatMap((u) => unitQuestions(u.id))); }
function formatFor(qual, unit) { return DATA.examFormats[qual.id]?.units.find((u) => u.unit === unit); }

function progressFor(items) {
  const answered = items.filter((q) => store.answers[q.id]).length;
  return { answered, total: items.length, pct: items.length ? Math.round((answered / items.length) * 100) : 0 };
}

function unitProgress(unit) {
  const qs = unitQuestions(unit.id);
  const answered = qs.filter((q) => store.answers[q.id]);
  const objectiveIds = unique(unit.sessions.flatMap((s) => s.objectives.map((o) => o.id)));
  const studied = objectiveIds.filter((id) => store.studied[id]).length;
  return { ...progressFor(qs), studied, objectives: objectiveIds.length };
}

function scoreFor(attempt) { return attempt.total ? Math.round((attempt.correct / attempt.total) * 100) : 0; }
function bestScore(qualId) {
  const scores = store.attempts.filter((a) => a.qual === qualId).map(scoreFor);
  return scores.length ? Math.max(...scores) : null;
}

function progressBar(pct, label = '') {
  return `<div class="progress-line" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${esc(label)}"><span style="width:${pct}%"></span></div>`;
}

function questionById(id) { return DATA.questions.find((q) => q.id === id); }

function objectiveFor(question) {
  for (const unit of Object.values(DATA.syllabus.units)) {
    for (const session of unit.sessions) {
      const objective = session.objectives.find((o) => o.id === question.objective_id);
      if (objective) return { unit, session, objective };
    }
  }
  return null;
}

function objectiveIdsForQual(qual) {
  return unique(qualUnits(qual).flatMap((u) => u.sessions.flatMap((s) => s.objectives.map((o) => o.id))));
}

function studyPass(qual) {
  const units = qualUnits(qual);
  const questionCount = units.reduce((sum, unit) => sum + unitProgress(unit).total, 0);
  const ready = units.filter((unit) => unitProgress(unit).pct >= 70).length;
  const segments = units.map((unit) => `<span class="${unitProgress(unit).pct >= 70 ? 'done' : ''}"></span>`).join('');
  const detail = ready
    ? `${ready} of ${units.length} units with 70%+ of questions answered`
    : `${units.length} units. ${questionCount} practice questions.`;
  return `<div class="study-pass" aria-label="Study pass for ${esc(qual.name)}. ${detail}">
    <div class="study-pass-head"><div><span class="study-pass-kicker">Study pass</span><span class="study-pass-name">${esc(qual.name)}</span></div><span class="study-pass-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="#0B1220" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg></span></div>
    <p>${detail}</p>
    <div class="study-pass-segs" style="grid-template-columns:repeat(${Math.max(units.length, 1)},minmax(0,1fr))">${segments}</div>
    <div class="study-pass-foot"><span>${ready ? 'Continue where you left off' : 'Syllabus, sources and practice'}</span><a class="study-pass-link" href="${href(`qual/${qual.id}`)}">Open qualification</a></div>
  </div>`;
}

function renderHome() {
  setActiveNav('home');
  const activeQuals = DATA.syllabus.qualifications;
  const totalQuestions = DATA.questions.length;
  const cards = activeQuals.map((qual) => {
    const qs = qualQuestions(qual);
    const progress = progressFor(qs);
    const best = bestScore(qual.id);
    return `<a class="qual-card ${qual.id === 'DS' ? 'qual-card--featured' : ''}" href="${href(`qual/${qual.id}`)}">
      <div class="qual-card-top"><span class="qual-code">${esc(qual.id)}</span><span class="qual-level">${esc(qual.level)}${best !== null ? `<span class="qual-best">Best ${best}%</span>` : ''}</span></div>
      <h3>${esc(qual.name)}</h3>
      <p>${esc(qual.description)}</p>
      ${progress.total ? `${progressBar(progress.pct, `${qual.name} question progress`)}<div class="progress-meta"><span>${progress.answered}/${progress.total} questions</span><span>${progress.pct}%</span></div>` : '<p class="qual-empty">No questions in this bank yet</p>'}
      <span class="qual-open">Open qualification</span>
    </a>`;
  }).join('');

  $('#app').innerHTML = `<section class="hero"><div class="shell hero-grid">
    <div>
      <p class="kicker">SIA licence-linked study</p>
      <h1><span>Study the material.</span><span>Check the source.</span></h1>
      <p class="hero-lede">Independent study notes and practice questions for SIA licence-linked qualifications. Practice answers link to the SIA specification they were written from.</p>
      <div class="hero-actions"><a class="button button-primary" href="${href('qual/DS')}">Open Door Supervisor</a><a class="button button-ghost" href="${href('practice/DS')}">Start a practice set</a></div>
      <p class="hero-facts">Independent study aid. ${totalQuestions} practice questions. Open Government Licence sources.</p>
      <p class="hero-note">Draft question bank. Not affiliated with the SIA or any awarding organisation.</p>
    </div>
    <aside class="hero-panel">
      ${studyPass(qualById('DS'))}
      <p class="small-note" style="margin:14px 0 0">The pass shows questions answered, not an exam result. Shared units carry across qualifications.</p>
    </aside>
  </div></section>
  <section class="page-section"><div class="shell">
    <div class="section-heading"><div><h2>Choose the qualification you are studying.</h2></div><p>Door Supervisor currently has the most practice questions. Security Officer, CCTV, Close Protection, CViT (Cash and Valuables in Transit) and the refreshers share common units and follow the same practice format.</p></div>
    <div class="qual-grid">${cards}</div>
  </div></section>
  <section class="page-section"><div class="shell">
    <div class="section-heading"><div><h2>Learn, practice, review.</h2></div><p>Work through the syllabus, answer questions with the source open, then use a timed mock to find the objectives that need another pass.</p></div>
    <div class="stat-strip"><div><strong>01</strong><span>Read the syllabus session by session</span></div><div><strong>02</strong><span>Answer practice questions with the source open</span></div><div><strong>03</strong><span>Take a timed mock and review every answer</span></div><div><strong>04</strong><span>Review the questions you missed</span></div></div>
  </div></section>`;
}

function renderQual(qualId) {
  const qual = qualById(qualId);
  if (!qual) return renderNotFound();
  setActiveNav('learn', qual.id);
  store.lastQual = qual.id;
  saveStore();
  const qs = qualQuestions(qual);
  const progress = progressFor(qs);
  const best = bestScore(qual.id);
  const units = qualUnits(qual);
  const rows = units.map((unit, index) => {
    const up = unitProgress(unit);
    const exam = formatFor(qual, unit.id);
    return `<div class="unit-row">
      <span class="unit-row-index">${String(index + 1).padStart(2, '0')}</span>
      <div><h3>${esc(unit.name)}</h3><p>${esc(unit.sessions[0]?.summary || 'Syllabus, source links and practice coverage.')}</p><div class="unit-meta"><span>${unit.sessions.length} sessions</span><span>${up.total} questions</span><span>${up.studied}/${up.objectives} objectives studied</span>${exam ? `<span>${exam.questions}-question paper</span>` : ''}</div></div>
      <div class="unit-row-actions"><a class="button button-ghost button-small" href="${href(`learn/${qual.id}?unit=${unit.id}`)}">Syllabus</a><a class="button button-ghost button-small" href="${href(`practice/${qual.id}?unit=${unit.id}`)}">Practice</a><a class="button button-primary button-small" href="${href(`exam/${qual.id}?unit=${unit.id}`)}">Mock paper</a></div>
    </div>`;
  }).join('');

  $('#app').innerHTML = `<section class="page-head"><div class="shell">
    <div class="breadcrumb"><a href="${href('')}">Home</a><span>/</span><span>${esc(qual.id)}</span></div>
    <div class="page-head-grid"><div><p class="kicker">${esc(qual.level)}</p><h1>${esc(qual.name)}</h1><p>${esc(qual.description)}</p></div>
    <aside class="page-head-aside"><dl class="qual-stats"><div><dt>Units</dt><dd>${units.length}</dd></div><div><dt>Questions</dt><dd>${qs.length}</dd></div><div><dt>Progress</dt><dd>${progress.pct}%</dd></div><div><dt>Best attempt</dt><dd>${best === null ? '—' : `${best}%`}</dd></div></dl>${progressBar(progress.pct, `${qual.name} progress`)}<span class="small-note">${progress.total ? `${progress.answered} of ${progress.total} questions answered in this browser` : 'No questions in this bank yet.'}</span></aside></div>
  </div></section>
  <div class="shell"><nav class="tabs" aria-label="${esc(qual.name)} sections"><a class="tab" aria-current="page" href="${href(`qual/${qual.id}`)}">Overview</a><a class="tab" href="${href(`learn/${qual.id}`)}">Syllabus</a><a class="tab" href="${href(`practice/${qual.id}`)}">Practice</a><a class="tab" href="${href(`exam/${qual.id}`)}">Mock paper</a><a class="tab" href="${href(`checklists/${qual.id}`)}">Practical</a><a class="tab" href="${href('weak')}">Review</a></nav></div>
  <section class="page-section"><div class="shell overview-grid">
    <div><div class="section-heading"><div><p class="section-label">Units</p><h2>What this qualification covers.</h2></div></div><div class="unit-list">${rows || '<div class="empty-inline">No units are available for this qualification yet.</div>'}</div></div>
    <aside class="side-card"><p class="mini-label">Check your understanding</p><h3>${units.length ? 'Use the mock to see which objectives still need work.' : 'This qualification has no source-backed units in the question bank yet.'}</h3><p>${units.length ? 'The mock follows the published unit format where the source confirms it. If the question bank is shorter than the paper, the setup shows the actual count.' : 'There are no units or questions for this qualification yet.'}</p><a class="button button-primary" href="${href(`exam/${qual.id}`)}">Choose a mock paper</a><a class="button button-ghost" href="${href('weak')}">Review missed questions</a><p class="small-note">Progress is stored in this browser. No account required.</p></aside>
  </div></section>`;
}

function renderNotFound() {
  setActiveNav('');
  $('#app').innerHTML = `<section class="page-section"><div class="shell"><div class="empty-card"><h1>Page not found</h1><p>We could not find that page. Check the address, or start from the home page.</p><a class="button button-primary" href="${href('')}">Back to the home page</a></div></div></section>`;
}

function renderLearn(qualId) {
  const qual = qualById(qualId);
  if (!qual) return renderNotFound();
  setActiveNav('learn', qual.id);
  const { query } = routeParts();
  const requestedUnit = query.get('unit');
  const units = qualUnits(qual);
  const activeUnit = units.find((u) => u.id === requestedUnit) || units[0];
  if (!activeUnit) {
    $('#app').innerHTML = `<section class="page-head"><div class="shell"><div class="breadcrumb"><a href="${href('')}">Home</a><span>/</span><a href="${href(`qual/${qual.id}`)}">${esc(qual.id)}</a></div><h1>${esc(qual.name)}</h1><p>${esc(qual.description)}</p></div></section><section class="page-section"><div class="shell"><div class="empty-card"><h2>No syllabus loaded</h2><p>The syllabus for this qualification has not been added yet.</p><a class="button button-primary" href="${href(`qual/${qual.id}`)}">Back to overview</a></div></div></section>`;
    return;
  }
  const nav = units.map((u) => {
    const up = unitProgress(u);
    return `<a href="${href(`learn/${qual.id}?unit=${u.id}`)}" ${u.id === activeUnit.id ? 'aria-current="true"' : ''}><span>${esc(u.name)}</span><span>${up.studied}/${up.objectives}</span></a>`;
  }).join('');
  const sessions = activeUnit.sessions.map((session, index) => {
    const objectives = session.objectives.map((objective, oi) => {
      const done = !!store.studied[objective.id];
      const hasQuestions = DATA.questions.some((q) => q.objective_id === objective.id);
      return `<li class="objective"><button class="objective-check" type="button" data-studied="${esc(objective.id)}" aria-pressed="${done}" aria-label="Mark objective ${oi + 1} studied: ${esc(objective.text)}">${done ? '✓' : ''}</button><p>${esc(objective.text)}</p><div class="objective-actions">${hasQuestions ? `<a href="${href(`practice/${qual.id}?objective=${objective.id}`)}">Practice</a>` : ''}<a href="${esc(session.source.url)}" target="_blank" rel="noreferrer" aria-label="Open source: ${esc(session.title)}">Open specification</a></div></li>`;
    }).join('');
    return `<article class="session-block" id="${esc(session.id)}"><div class="session-title"><span class="session-number">${String(index + 1).padStart(2, '0')}</span><div><h2>${esc(session.title.replace(/^Session\s*\d+[a-c]?\s*:\s*/i, ''))}</h2><p>${esc(session.summary)}</p></div><a class="session-source" href="${esc(session.source.url)}" target="_blank" rel="noreferrer" aria-label="Open source: ${esc(session.title)}">Open specification</a></div><ul class="objectives">${objectives}</ul></article>`;
  }).join('');
  const up = unitProgress(activeUnit);
  $('#app').innerHTML = `<section class="page-head"><div class="shell"><div class="breadcrumb"><a href="${href('')}">Home</a><span>/</span><a href="${href(`qual/${qual.id}`)}">${esc(qual.id)}</a><span>/</span><span>Syllabus</span></div><div class="page-head-grid"><div><p class="kicker">Syllabus</p><h1>${esc(activeUnit.name)}</h1><p>Read the objective, then open the SIA specification to check the detail. Mark it studied when you have read the source.</p></div><aside class="page-head-aside"><dl class="qual-stats"><div><dt>Session</dt><dd>${activeUnit.sessions.length}</dd></div><div><dt>Objectives</dt><dd>${up.objectives}</dd></div><div><dt>Studied</dt><dd>${up.studied}</dd></div><div><dt>Questions</dt><dd>${up.total}</dd></div></dl>${progressBar(up.objectives ? Math.round((up.studied / up.objectives) * 100) : 0, 'Objectives studied')}</aside></div></div></section>
  <section class="page-section"><div class="shell learn-layout"><aside class="learn-nav"><h2>Units</h2>${nav}</aside><div>${sessions || '<div class="empty-inline">No sessions in this unit.</div>'}<p class="source-note">Source: ${sourceLink(activeUnit.sessions[0]?.source)}. Read the source before relying on a summary. The SIA specification is the authority.</p><div class="question-foot"><a class="button button-primary" href="${href(`practice/${qual.id}?unit=${activeUnit.id}`)}">Practice this unit</a><a class="button button-ghost" href="${href(`qual/${qual.id}`)}">Back to overview</a></div></div></div></section>`;
  $$('[data-studied]').forEach((button) => button.addEventListener('click', () => {
    const id = button.dataset.studied;
    const y = window.scrollY;
    store.studied[id] = !store.studied[id];
    saveStore();
    renderLearn(qual.id);
    window.scrollTo({ top: y, behavior: 'auto' });
  }));
}

function practiceQuestions(qual, query) {
  let pool = qualQuestions(qual);
  const unit = query.get('unit');
  const objective = query.get('objective');
  const mode = query.get('mode');
  if (unit) pool = pool.filter((q) => q.unit === unit);
  if (objective) pool = pool.filter((q) => q.objective_id === objective);
  if (mode === 'weak') {
    const wrong = new Set(Object.entries(store.answers).filter(([, a]) => a.correct === false).map(([id]) => id));
    pool = pool.filter((q) => wrong.has(q.id));
  }
  return shuffle(pool).slice(0, 20);
}

function renderPractice(qualId) {
  const qual = qualById(qualId);
  if (!qual) return renderNotFound();
  setActiveNav('practice', qual.id);
  const { query } = routeParts();
  const units = qualUnits(qual);
  const selectedUnit = query.get('unit') || '';
  const mode = query.get('mode') || '';
  const poolSize = practiceQuestions(qual, query).length;
  const options = units.map((u) => `<option value="${u.id}" ${u.id === selectedUnit ? 'selected' : ''}>${esc(shortUnitName(u.id, u.name))}</option>`).join('');
  $('#app').innerHTML = `<section class="practice-shell"><div class="shell">
    <div class="breadcrumb"><a href="${href('')}">Home</a><span>/</span><a href="${href(`qual/${qual.id}`)}">${esc(qual.id)}</a><span>/</span><span>Practice</span></div>
    <div class="practice-layout"><aside class="practice-aside"><p class="kicker">Practice</p><h1 style="font-size:clamp(2.2rem,4vw,3.6rem);margin-bottom:15px">Practice questions.</h1><p class="small-note" style="margin-bottom:22px">Answer at your own pace. Each answer shows an explanation and the source it came from. No timer.</p><div class="field"><label for="practice-unit">Unit</label><select id="practice-unit"><option value="">All units</option>${options}</select></div>${mode === 'weak' ? '<p class="empty-inline">Questions you answered incorrectly</p>' : ''}<button class="button button-primary" id="start-practice" type="button">Start practice</button><a class="button button-ghost" href="${href(`qual/${qual.id}`)}" style="margin-top:8px">Back to overview</a><p class="small-note" style="margin-top:16px">${poolSize ? `${poolSize} question${poolSize === 1 ? '' : 's'} available for this filter.` : 'No questions match this filter yet.'}</p><p class="small-note">Draft questions. Check the cited source and report an error if the answer is wrong.</p></aside><div id="practice-stage"><div class="empty-card"><h2>Choose a unit to start.</h2><p>Each set has up to 20 questions. Your answers are saved in this browser.</p></div></div></div>
  </div></section>`;
  $('#start-practice').addEventListener('click', () => {
    const unit = $('#practice-unit')?.value || '';
    const q = new URLSearchParams();
    if (unit) q.set('unit', unit);
    if (mode === 'weak') q.set('mode', 'weak');
    if (query.get('objective')) q.set('objective', query.get('objective'));
    startPractice(qual, q);
  });
  if (query.get('unit') || query.get('objective') || mode === 'weak') {
    startPractice(qual, query);
  }
}

function startPractice(qual, query) {
  const questions = practiceQuestions(qual, query);
  if (!questions.length) {
    $('#practice-stage').innerHTML = `<div class="empty-card"><h2>No questions in this filter yet.</h2><p>Read the syllabus for this unit, or choose another filter. The question bank is still being reviewed.</p><a class="button button-primary" href="${href(`learn/${qual.id}`)}">Open the syllabus</a></div>`;
    return;
  }
  practiceState = { qual, questions, index: 0, selected: null, revealed: false };
  const start = $('#start-practice');
  if (start) { start.disabled = true; start.textContent = 'Set in progress'; }
  const unitSelect = $('#practice-unit');
  if (unitSelect) unitSelect.disabled = true;
  renderPracticeQuestion();
}

function renderPracticeQuestion() {
  const stage = $('#practice-stage');
  if (!stage || !practiceState) return;
  const { qual, questions, index } = practiceState;
  if (index >= questions.length) {
    const answered = questions.filter((q) => store.answers[q.id]).length;
    const correct = questions.filter((q) => store.answers[q.id]?.correct).length;
    stage.innerHTML = `<div class="result-head"><div class="score-ring" style="--score:${Math.round((correct / questions.length) * 100)}"><strong>${correct}</strong><span>of ${questions.length}</span></div><div class="result-copy"><p class="kicker">Practice set complete</p><h1>${correct === questions.length ? 'All correct.' : 'Review the questions you missed.'}</h1><p>You answered ${answered} of ${questions.length}. Questions you missed are saved for review.</p></div></div><div class="result-grid"><div class="result-block"><h2>Next</h2><p>${correct === questions.length ? 'Take a timed mock to check your recall.' : 'Review the questions you missed, then try the set again.'}</p><div class="question-foot"><a class="button button-primary" href="${href(`exam/${qual.id}`)}">Open a mock paper</a><a class="button button-ghost" href="${href(`practice/${qual.id}?mode=weak`)}">Review missed questions</a></div></div><div class="result-block"><h2>Review</h2><p>Every answer is stored in this browser. There is no account and no upload.</p><a class="text-link" href="${href('reports')}">Question reports</a></div></div>`;
    return;
  }
  const q = questions[index];
  const answer = store.answers[q.id];
  const selected = practiceState.selected ?? (answer ? answer.selected : null);
  const revealed = practiceState.revealed || !!answer;
  const correctIndex = q.answer_index;
  const options = q.options.map((option, i) => {
    let cls = 'answer-option';
    let pressed = selected === i ? 'true' : 'false';
    if (revealed && i === correctIndex) cls += ' is-correct';
    if (revealed && selected === i && i !== correctIndex) cls += ' is-wrong';
    return `<button class="${cls}" type="button" data-answer="${i}" aria-pressed="${pressed}" ${revealed ? 'disabled' : ''}><span class="answer-key">${revealed && i === correctIndex ? '✓' : revealed && selected === i ? '×' : String.fromCharCode(65 + i)}</span><span>${esc(option)}</span></button>`;
  }).join('');
  const obj = objectiveFor(q);
  const feedback = revealed ? `<div class="feedback ${selected === correctIndex ? '' : 'bad'}" role="status" aria-live="polite"><h3>${selected === correctIndex ? 'Correct.' : 'Not correct.'}</h3><p>${esc(q.explanation)}</p><p class="citation">${obj && normaliseText(q.source_quote) === normaliseText(obj.objective.text) ? `Syllabus objective: ${esc(q.source_quote)}` : q.source_quote_exact === false ? `Source reference: ${esc(q.source_quote)}` : `Source: “${esc(q.source_quote)}”`} ${obj ? `· <a href="${esc(obj.session.source.url)}" target="_blank" rel="noreferrer">${esc(obj.session.source.doc_title)}</a>` : ''}</p></div>` : '';
  stage.innerHTML = `<article class="question-card"><div class="question-card-inner"><div class="question-top"><span class="meta"><strong>${esc(q.unit)}</strong> · question ${index + 1} of ${questions.length}</span><span class="meta">${esc(shortUnitName(obj?.unit.id, obj?.unit.name || ''))}</span></div><p class="draft-note">Draft question. Check the cited source before relying on it.</p><h2 class="question-stem">${esc(q.stem)}</h2><div class="answer-list" role="group" aria-label="Answer options">${options}</div>${feedback}<div class="question-foot"><button class="button button-primary" type="button" id="next-practice" ${revealed ? '' : 'disabled'}>${index + 1 === questions.length ? 'Finish set' : 'Next question'} →</button><button class="report-link" type="button" data-report="${esc(q.id)}">Report an issue</button></div></div></article>`;
  stage.querySelectorAll('[data-answer]').forEach((button) => {
    button.addEventListener('click', () => {
      if (practiceState.revealed) return;
      practiceState.selected = Number(button.dataset.answer);
      practiceState.revealed = true;
      const correct = practiceState.selected === q.answer_index;
      const existing = store.answers[q.id];
      store.answers[q.id] = { selected: practiceState.selected, correct, at: new Date().toISOString() };
      if (!existing || existing.correct !== correct) saveStore();
      renderPracticeQuestion();
    });
  });
  $('#next-practice')?.addEventListener('click', () => {
    practiceState.index += 1;
    practiceState.selected = null;
    practiceState.revealed = false;
    renderPracticeQuestion();
  });
  stage.querySelector('[data-report]')?.addEventListener('click', () => openReport(q.id));
}

function saveExamState() {
  if (!examState || examState.finished) return;
  try {
    const { timer, ...rest } = examState;
    sessionStorage.setItem(EXAM_KEY, JSON.stringify(rest));
  } catch (error) {
    // A private window can refuse storage; the paper still works without reload recovery.
  }
}

function restoreExamState(qualId) {
  try {
    const raw = sessionStorage.getItem(EXAM_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (saved?.qual?.id !== qualId || saved.finished) return null;
    return saved;
  } catch (error) {
    return null;
  }
}

function beginExamTimer() {
  if (!examState) return;
  clearInterval(examState.timer);
  examState.timer = setInterval(() => {
    if (!examState || examState.finished) return;
    if (Date.now() >= examState.endsAt) { toast('Time is up. Submitting the paper.'); submitExam(); return; }
    const remaining = examState.endsAt - Date.now();
    const timer = $('#exam-timer');
    if (timer) {
      timer.textContent = formatTime(remaining);
      timer.classList.toggle('warning', remaining <= 10 * 60 * 1000);
      timer.classList.toggle('critical', remaining <= 60 * 1000);
    }
    if (!examState.warned10 && remaining <= 10 * 60 * 1000) { examState.warned10 = true; toast('10 minutes left.'); }
    if (!examState.warned1 && remaining <= 60 * 1000) { examState.warned1 = true; toast('1 minute left.'); }
  }, 1000);
}

function renderExam(qualId) {
  const qual = qualById(qualId);
  if (!qual) return renderNotFound();
  setActiveNav('exam', qual.id);
  if (!examState) {
    const saved = restoreExamState(qual.id);
    if (saved) {
      examState = { ...saved, timer: null };
      if (Date.now() >= examState.endsAt) {
        submitExam();
        return;
      }
      beginExamTimer();
      renderExamQuestion();
      return;
    }
  }
  if (examState && examState.qual.id === qual.id) {
    if (examState.finished) return renderExamResult();
    return renderExamQuestion();
  }
  const config = DATA.examFormats[qual.id];
  if (!config || !config.units.length) {
    $('#app').innerHTML = `<section class="exam-shell"><div class="shell"><div class="breadcrumb"><a href="${href('')}">Home</a><span>/</span><a href="${href(`qual/${qual.id}`)}">${esc(qual.id)}</a><span>/</span><span>Mock paper</span></div><div class="empty-card"><h2>No mock paper for this qualification yet.</h2><p>${esc(config?.source || 'The source does not publish a multiple-choice format for this qualification.')}</p><a class="button button-primary" href="${href(`qual/${qual.id}`)}">Back to overview</a></div></div></section>`;
    return;
  }
  const confirmed = !/^unconfirmed|confirm against/i.test(config.source || '');
  const rows = config.units.map((format) => {
    const unit = unitById(format.unit);
    const available = unitQuestions(format.unit).length;
    const actual = Math.min(format.questions, available);
    const needed = Math.ceil((actual * format.pass_mark) / 100);
    return `<tr><td>${esc(unit?.name || format.unit)}</td><td>${format.questions}</td><td><strong>${actual}</strong>${available < format.questions ? ' <span class="pill">short bank</span>' : ''}</td><td>${format.minutes} min</td><td>${format.pass_mark}% <span class="small-note">${actual ? `${needed}/${actual}` : '—'}</span></td><td><button class="button button-primary button-small" type="button" data-start="${format.unit}" ${actual ? '' : 'disabled'}>${actual ? `Start ${esc(shortUnitName(format.unit, format.unit))}` : 'No questions yet'}</button></td></tr>`;
  }).join('');
  $('#app').innerHTML = `<section class="exam-shell"><div class="shell"><div class="breadcrumb"><a href="${href('')}">Home</a><span>/</span><a href="${href(`qual/${qual.id}`)}">${esc(qual.id)}</a><span>/</span><span>Mock paper</span></div><div class="exam-head"><div><p class="kicker">Mock paper</p><h1>Choose a paper.</h1><p>Choose a unit. The timer starts with the paper. Answers are not marked until you submit; the result shows unit and objective totals.</p><div class="exam-meta"><span class="pill">${config.units.length} paper${config.units.length === 1 ? '' : 's'}</span><span class="pill">No feedback until you submit</span><span class="pill">${confirmed ? 'Pass mark from the source' : 'Pass mark: format unconfirmed'}</span></div></div></div><div class="exam-warning">${esc(config.source)}. Where a question bank is shorter than the published paper, the mock shows the available count before you start. The bank is still in draft, so check the source before relying on an answer.</div><div class="side-card"><div class="table-scroll"><table class="source-list"><caption class="visually-hidden">Mock papers by unit</caption><thead><tr><th scope="col" style="text-align:left">Unit</th><th scope="col">Published</th><th scope="col">This mock</th><th scope="col">Time</th><th scope="col">Pass</th><th scope="col"><span class="visually-hidden">Action</span></th></tr></thead><tbody>${rows}</tbody></table></div><p class="small-note" style="margin-top:12px">${confirmed ? 'Time matches the published paper. The pass column shows the exact correct answers needed for the questions in this paper.' : 'The paper format for this qualification is unconfirmed. Treat the timer and pass mark as study settings.'} A short bank is labelled before you start.</p></div></div></section>`;
  $$('[data-start]').forEach((button) => button.addEventListener('click', () => startExam(qual, button.dataset.start)));
}

function startExam(qual, unitId) {
  const format = formatFor(qual, unitId);
  if (!format) return;
  const bank = shuffle(unitQuestions(unitId));
  const questions = bank.slice(0, format.questions);
  if (!questions.length) { toast('No questions loaded for this unit yet.'); return; }
  const config = DATA.examFormats[qual.id];
  examState = { qual, format, confirmed: !/^unconfirmed|confirm against/i.test(config?.source || ''), unit: unitById(unitId), questions, index: 0, answers: {}, startedAt: Date.now(), endsAt: Date.now() + format.minutes * 60 * 1000, finished: false, warned10: false, warned1: false, timer: null };
  saveExamState();
  beginExamTimer();
  renderExamQuestion();
}

function formatTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function renderExamQuestion() {
  if (!examState) return;
  const { qual, format, unit, questions, index, answers } = examState;
  const q = questions[index];
  const selected = answers[q.id];
  const palette = questions.map((item, i) => `<button class="palette-button ${answers[item.id] !== undefined ? 'answered' : ''}" type="button" data-index="${i}" aria-current="${i === index ? 'true' : 'false'}" aria-label="Question ${i + 1}${answers[item.id] !== undefined ? ', answered' : ''}">${i + 1}</button>`).join('');
  const options = q.options.map((option, i) => `<button class="answer-option" type="button" data-exam-answer="${i}" aria-pressed="${selected === i}"><span class="answer-key">${String.fromCharCode(65 + i)}</span><span>${esc(option)}</span></button>`).join('');
  $('#app').innerHTML = `<section class="exam-shell"><div class="shell"><div class="breadcrumb"><a href="${href('')}">Home</a><span>/</span><a href="${href(`qual/${qual.id}`)}">${esc(qual.id)}</a><span>/</span><span>Mock paper</span></div><div class="exam-head"><div><p class="kicker">${esc(unit.name)}</p><h1>${esc(questions.length)}-question mock paper.</h1><div class="exam-meta"><span class="pill timer" id="exam-timer">${formatTime(examState.endsAt - Date.now())}</span><span class="pill">${format.pass_mark}% mock pass · ${Math.ceil((questions.length * format.pass_mark) / 100)}/${questions.length}${examState.confirmed ? '' : ' · format unconfirmed'}</span><span class="pill">${questions.length} available${questions.length < format.questions ? ` · ${format.questions - questions.length} short` : ''}</span></div></div><button class="button button-danger" type="button" id="submit-exam">Submit paper</button></div><div class="exam-layout"><div><div class="question-card"><div class="question-card-inner"><div class="question-top"><span class="meta"><strong>Question ${index + 1} of ${questions.length}</strong></span><span class="meta">No feedback until submission</span></div><h2 class="question-stem">${esc(q.stem)}</h2><div class="answer-list" role="group" aria-label="Answer options">${options}</div><div class="exam-actions"><button class="button button-ghost" type="button" id="prev-exam" ${index === 0 ? 'disabled' : ''}>← Previous</button><button class="button button-primary" type="button" id="next-exam">${index + 1 === questions.length ? 'Submit paper' : 'Next question →'}</button></div><p class="exam-note">Answers are not saved as study progress until you submit. The timer runs for the paper length shown above.</p></div></div></div><aside class="exam-palette"><h2>Question map</h2><div class="palette-grid">${palette}</div><p class="exam-note">${Object.keys(answers).length} of ${questions.length} answered</p><button class="button button-ghost" type="button" id="submit-exam-side" style="width:100%;margin-top:12px">Submit paper</button></aside></div></div></section>`;
  $$('[data-exam-answer]').forEach((button) => button.addEventListener('click', () => {
    examState.answers[q.id] = Number(button.dataset.examAnswer);
    renderExamQuestion();
  }));
  $$('[data-index]').forEach((button) => button.addEventListener('click', () => { examState.index = Number(button.dataset.index); renderExamQuestion(); }));
  $('#prev-exam')?.addEventListener('click', () => { examState.index = Math.max(0, examState.index - 1); renderExamQuestion(); });
  $('#next-exam')?.addEventListener('click', () => { if (examState.index + 1 < questions.length) { examState.index += 1; renderExamQuestion(); } else { submitExam(); } });
  $('#submit-exam')?.addEventListener('click', submitExam);
  $('#submit-exam-side')?.addEventListener('click', submitExam);
  saveExamState();
}

function submitExam() {
  if (!examState || examState.finished) return;
  const unanswered = examState.questions.length - Object.keys(examState.answers).length;
  const message = unanswered > 0
    ? `You have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. They will be marked wrong. Submit the paper?`
    : 'Submit the paper? You cannot change your answers after this.';
  if (!window.confirm(message)) return;
  clearInterval(examState.timer);
  examState.finished = true;
  try { sessionStorage.removeItem(EXAM_KEY); } catch (error) {}
  let correct = 0;
  const byUnit = {};
  const byObjective = {};
  examState.questions.forEach((q) => {
    const selected = examState.answers[q.id];
    const isCorrect = selected === q.answer_index;
    if (isCorrect) correct += 1;
    store.answers[q.id] = { selected: selected ?? null, correct: isCorrect, at: new Date().toISOString(), exam: true };
    byUnit[q.unit] = byUnit[q.unit] || { correct: 0, total: 0 };
    byUnit[q.unit].total += 1;
    if (isCorrect) byUnit[q.unit].correct += 1;
    byObjective[q.objective_id] = byObjective[q.objective_id] || { correct: 0, total: 0 };
    byObjective[q.objective_id].total += 1;
    if (isCorrect) byObjective[q.objective_id].correct += 1;
  });
  const attempt = { id: `attempt-${Date.now()}`, qual: examState.qual.id, unit: examState.unit.id, correct, total: examState.questions.length, date: new Date().toISOString(), passMark: examState.format.pass_mark };
  store.attempts.unshift(attempt);
  store.attempts = store.attempts.slice(0, 50);
  saveStore();
  renderExamResult();
}

function renderExamResult() {
  if (!examState) return;
  const { qual, unit, questions, answers } = examState;
  const correct = questions.filter((q) => answers[q.id] === q.answer_index).length;
  const pct = Math.round((correct / questions.length) * 100);
  const passed = pct >= examState.format.pass_mark;
  const byUnit = {};
  questions.forEach((q) => {
    byUnit[q.unit] = byUnit[q.unit] || { correct: 0, total: 0 };
    byUnit[q.unit].total += 1;
    if (answers[q.id] === q.answer_index) byUnit[q.unit].correct += 1;
  });
  const unitRows = Object.entries(byUnit).map(([id, value]) => `<li><span>${esc(unitById(id)?.name || id)}</span><span>${value.correct}/${value.total}</span></li>`).join('');
  const byObjective = {};
  questions.forEach((q) => {
    byObjective[q.objective_id] = byObjective[q.objective_id] || { correct: 0, total: 0 };
    byObjective[q.objective_id].total += 1;
    if (answers[q.id] === q.answer_index) byObjective[q.objective_id].correct += 1;
  });
  const objectiveRows = Object.entries(byObjective).sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total)).slice(0, 6).map(([id, value]) => {
    const obj = objectiveFor({ objective_id: id });
    return `<li><span>${esc(obj?.objective.text || id)}</span><span>${value.correct}/${value.total}</span></li>`;
  }).join('');
  const review = questions.map((q, i) => {
    const selected = answers[q.id];
    const ok = selected === q.answer_index;
    return `<div class="review-item"><h3>${i + 1}. ${esc(q.stem)}</h3><p class="${ok ? 'review-answer' : 'review-wrong'}">${ok ? 'Correct' : `Your answer: ${selected === undefined ? 'not answered' : esc(q.options[selected])}`}</p>${ok ? '' : `<p>Correct answer: ${esc(q.options[q.answer_index])}</p>`}<p>${esc(q.explanation)}</p></div>`;
  }).join('');
  $('#app').innerHTML = `<section class="exam-shell"><div class="shell"><div class="result-head"><div class="score-ring" style="--score:${pct}"><strong>${pct}%</strong><span>${correct} of ${questions.length}</span></div><div class="result-copy"><p class="kicker">${esc(unit.name)} · mock result</p><h1>${passed ? 'Above the mock pass mark.' : 'Below the mock pass mark.'}</h1><p>${passed ? `This attempt is above the ${examState.format.pass_mark}% pass mark used for this mock.` : `This mock uses a ${examState.format.pass_mark}% pass mark. Review the paper and the objectives below.`}${examState.confirmed ? '' : ' The paper format is unconfirmed, so this is not a published exam result.'}</p><div class="question-foot"><a class="button button-primary" href="${href(`practice/${qual.id}?unit=${unit.id}`)}">Practice this unit</a><button class="button button-ghost" type="button" id="clear-exam">Choose another paper</button></div></div></div><div class="result-grid"><div class="result-block"><h2>By unit</h2><ul class="breakdown-list">${unitRows}</ul><h2 style="margin-top:22px">Objectives to revisit</h2><ul class="breakdown-list">${objectiveRows || '<li><span>No objective tags in this paper.</span></li>'}</ul></div><div class="result-block"><h2>Next step</h2><p>Questions you answered incorrectly are saved for review. The paper review below shows the correct answer and explanation for every question.</p><a class="text-link" href="${href('weak')}">Open the review list →</a></div></div><div class="review-list"><div class="section-heading"><div><p class="section-label">Review</p><h2>Every question.</h2></div><p>Explanations and source quotations are in practice mode. Open the syllabus if you need more context.</p></div>${review}</div></div></section>`;
  $('#clear-exam')?.addEventListener('click', () => { examState = null; renderExam(qual.id); });
  setTimeout(() => { const heading = $('#app h1'); if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus(); } }, 0);
}

function renderWeak() {
  setActiveNav('weak');
  const wrongIds = Object.entries(store.answers).filter(([, a]) => a.correct === false).map(([id]) => id);
  const wrong = wrongIds.map(questionById).filter(Boolean);
  const byQual = DATA.syllabus.qualifications.map((qual) => {
    const applied = qualQuestions(qual).filter((q) => wrongIds.includes(q.id));
    return { qual, count: applied.length };
  }).filter((row) => row.count);
  const rows = byQual.map(({ qual, count }) => `<div class="list-row"><div><h3>${esc(qual.name)}</h3><p>${count} missed question${count === 1 ? '' : 's'} across ${qualUnits(qual).filter((u) => qualQuestions(qual).some((q) => q.unit === u.id && wrongIds.includes(q.id))).length} units.</p></div><div class="list-row-actions"><a class="button button-primary button-small" href="${href(`practice/${qual.id}?mode=weak`)}">Review</a><a class="button button-ghost button-small" href="${href(`qual/${qual.id}`)}">Open qualification</a></div></div>`).join('');
  $('#app').innerHTML = `<section class="page-head"><div class="shell"><div class="breadcrumb"><a href="${href('')}">Home</a><span>/</span><span>Review</span></div><div class="page-head-grid"><div><p class="kicker">Review</p><h1>Questions to review.</h1><p>Questions you answered incorrectly are stored in this browser. Review them, then return to the syllabus or try another practice set.</p></div><aside class="page-head-aside"><dl class="qual-stats"><div><dt>Missed</dt><dd>${wrong.length}</dd></div><div><dt>Qualifications</dt><dd>${byQual.length}</dd></div></dl><a class="button button-primary" href="${href('practice/DS?mode=weak')}">Review Door Supervisor questions</a></aside></div></div></section><section class="page-section"><div class="shell">${rows ? `<div class="list-page">${rows}</div>` : `<div class="empty-card"><h2>Nothing to review yet.</h2><p>Practice a set or submit a mock paper. Questions you answer incorrectly will appear here.</p><a class="button button-primary" href="${href('practice/DS')}">Start practice</a></div>`}</div></section>`;
}

function renderReports() {
  setActiveNav('');
  const rows = store.reports.map((r) => `<div class="list-row"><div><h3>${esc(r.questionId)}</h3><p>${esc(r.reason)} · ${esc(new Date(r.at).toLocaleString())}${r.note ? ` · ${esc(r.note)}` : ''}</p></div><div class="list-row-actions"><span class="pill">${esc(r.unit || '')}</span></div></div>`).join('');
  $('#app').innerHTML = `<section class="page-head"><div class="shell"><div class="breadcrumb"><a href="${href('')}">Home</a><span>/</span><span>Question reports</span></div><div class="page-head-grid"><div><p class="kicker">Question quality</p><h1>Question reports.</h1><p>Reports stay in this browser until you export them. Nothing is sent anywhere automatically. Export the JSON if you want to keep or share a copy.</p></div><aside class="page-head-aside"><dl class="qual-stats"><div><dt>Open reports</dt><dd>${store.reports.length}</dd></div><div><dt>Storage</dt><dd>Local</dd></div></dl><button class="button button-primary" type="button" id="export-reports" ${store.reports.length ? '' : 'disabled'}>Export JSON</button><button class="button button-ghost" type="button" id="clear-reports" ${store.reports.length ? '' : 'disabled'} style="margin-top:8px">Clear reports</button></aside></div></div></section><section class="page-section"><div class="shell">${rows ? `<div class="list-page">${rows}</div>` : '<div class="empty-card"><h2>Nothing reported.</h2><p>Use “Report an issue” under any practice question.</p></div>'}</div></section>`;
  $('#export-reports')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(store.reports, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'shiftready-question-reports.json'; link.click();
    URL.revokeObjectURL(url);
    toast('Report export downloaded.');
  });
  $('#clear-reports')?.addEventListener('click', () => {
    if (!window.confirm('Clear all local reports? This cannot be undone.')) return;
    store.reports = []; saveStore(); renderReports(); toast('Reports cleared.');
  });
}

function renderChecklists(qualId) {
  const qual = qualById(qualId);
  if (!qual) return renderNotFound();
  setActiveNav('learn', qual.id);
  const units = qualUnits(qual).filter((u) => DATA.checklists[u.id]);
  if (!units.length) {
    $('#app').innerHTML = `<section class="page-head"><div class="shell"><div class="breadcrumb"><a href="${href('')}">Home</a><span>/</span><a href="${href(`qual/${qual.id}`)}">${esc(qual.id)}</a></div><h1>Practical checklists</h1></div></section><section class="page-section"><div class="shell"><div class="empty-card"><h2>No practical checklist yet.</h2><p>Practical assessment areas are added when the spec gives enough detail to list them without teaching the technique.</p><a class="button button-primary" href="${href(`qual/${qual.id}`)}">Back to overview</a></div></div></section>`;
    return;
  }
  const blocks = units.map((unit) => {
    const items = DATA.checklists[unit.id].map((item, i) => {
      const id = `${unit.id}-${i}`;
      const checked = !!store.checklist[id];
      return `<li><input type="checkbox" id="${esc(id)}" data-check="${esc(id)}" ${checked ? 'checked' : ''}><label for="${esc(id)}"><strong>${esc(item.title)}</strong><span>${esc(item.note)}</span></label></li>`;
    }).join('');
    return `<div class="session-block"><div class="session-title"><span class="session-number">·</span><div><h2>${esc(unit.name)}</h2><p>Practical areas are assessed in class by a qualified trainer. This list is for preparation, not a substitute for the assessment.</p></div></div><ul class="checklist">${items}</ul></div>`;
  }).join('');
  $('#app').innerHTML = `<section class="page-head"><div class="shell"><div class="breadcrumb"><a href="${href('')}">Home</a><span>/</span><a href="${href(`qual/${qual.id}`)}">${esc(qual.id)}</a><span>/</span><span>Practical</span></div><div class="page-head-grid"><div><p class="kicker">Practical preparation</p><h1>What you will be asked to show.</h1><p>Tick these off before the practical day. The checklist is knowledge preparation only; physical intervention techniques must be learned from a qualified trainer.</p></div><aside class="page-head-aside"><p class="small-note">The practical is not simulated on this site. The site helps you arrive prepared.</p></aside></div></div></section><section class="page-section"><div class="shell">${blocks}</div></section>`;
  $$('[data-check]').forEach((input) => input.addEventListener('change', () => { store.checklist[input.dataset.check] = input.checked; saveStore(); }));
}

function renderAbout() {
  setActiveNav('');
  $('#app').innerHTML = `<section class="page-head"><div class="shell"><div class="breadcrumb"><a href="${href('')}">Home</a><span>/</span><span>About the sources</span></div><div class="page-head-grid"><div><p class="kicker">Open Government Licence</p><h1>Where the material comes from.</h1><p>The syllabus map and question bank are built from SIA specifications published on GOV.UK. Each practice answer names the specification it came from. Where the wording matches the linked PDF it is shown as a quotation; otherwise it is a reference to check. The specification is always the authority.</p></div><aside class="page-head-aside"><p class="small-note">Question bank last edited: ${esc(CONTENT_DATE)}. Check the SIA for a newer specification before relying on a fact.</p></aside></div></div></section><section class="page-section"><div class="shell legal-copy"><h2>Attribution</h2><p>Contains public sector information licensed under the Open Government Licence v3.0. Sources include the Security Industry Authority. The current question bank draws on SIA specifications only. This site is not endorsed by or affiliated with the SIA or any awarding organisation.</p><h2>What is in scope</h2><p>The syllabus map covers the SIA licence-linked specifications in this site: Door Supervisor, Security Officer, CCTV, Close Protection, CViT and the 2024/2025 refresher specifications. Shared units are stored once and tagged to every qualification they serve.</p><h2>What is not in scope</h2><p>This build does not copy questions or wording from awarding organisation sample papers or commercial mock-test sites. It does not teach physical intervention techniques. It does not replace the SIA specification, the awarding organisation’s assessment materials, or a qualified trainer.</p><h2>Question status</h2><p>Questions are drafted from the specifications and marked for human review where they touch use of force, arrest, physical intervention or first aid. Do not treat a draft question as an official exam question. If a question looks wrong, report it from practice mode and export the report JSON.</p></div></section>`;
}

function openReport(questionId) {
  const q = questionById(questionId);
  const dialog = $('#report-dialog');
  if (!q || !dialog) return;
  $('#report-question').textContent = q.stem;
  dialog.dataset.question = questionId;
  dialog.showModal();
}

function setupReportDialog() {
  const dialog = $('#report-dialog');
  if (!dialog) return;
  $('#report-form').addEventListener('submit', (event) => {
    if (event.submitter?.value === 'cancel') return;
    event.preventDefault();
    const reason = $('#report-reason').value;
    if (!reason) return;
    const q = questionById(dialog.dataset.question);
    store.reports.unshift({ questionId: dialog.dataset.question, unit: q?.unit || '', reason, note: $('#report-note').value.trim(), at: new Date().toISOString() });
    saveStore();
    dialog.close();
    $('#report-note').value = '';
    $('#report-reason').value = '';
    toast('Report saved locally. Export it from Question reports.');
  });
}

function setupMobileMenu() {
  const button = $('#mobile-menu');
  const nav = $('#main-nav');
  if (!button || !nav) return;
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    button.textContent = open ? 'Close' : 'Menu';
    nav.classList.toggle('mobile-open', open);
    document.body.classList.toggle('menu-open', open);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('mobile-open')) {
      button.setAttribute('aria-expanded', 'false'); button.textContent = 'Menu';
      nav.classList.remove('mobile-open'); document.body.classList.remove('menu-open');
    }
  });
  $$('a', nav).forEach((link) => link.addEventListener('click', () => {
    button.setAttribute('aria-expanded', 'false');
    button.textContent = 'Menu';
    nav.classList.remove('mobile-open');
    document.body.classList.remove('menu-open');
  }));
}

function setupTheme() {
  const saved = localStorage.getItem('theme');
  setTheme(saved === 'dark' || saved === 'light' ? saved : null, false);
  $('#theme-toggle')?.addEventListener('click', () => setTheme(currentTheme() === 'dark' ? 'light' : 'dark'));
}

async function loadData() {
  const urls = ['./data/syllabus.json', './data/exam_formats.json', './data/questions.json', './data/checklists.json'];
  const responses = await Promise.all(urls.map(async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    return res.json();
  }));
  DATA = { syllabus: responses[0], examFormats: responses[1], questions: Array.isArray(responses[2]) ? responses[2] : [], checklists: responses[3] || {} };
}

function render() {
  const { path } = routeParts();
  const [section, id] = path;
  if (!section) return renderHome();
  if (section === 'qual') return renderQual(id || 'DS');
  if (section === 'learn') return renderLearn(id || 'DS');
  if (section === 'practice') return renderPractice(id || 'DS');
  if (section === 'exam') return renderExam(id || 'DS');
  if (section === 'checklists') return renderChecklists(id || 'DS');
  if (section === 'weak') return renderWeak();
  if (section === 'reports') return renderReports();
  if (section === 'about') return renderAbout();
  return renderNotFound();
}

async function init() {
  setupTheme();
  setupMobileMenu();
  setupReportDialog();
  try {
    await loadData();
    render();
  } catch (error) {
    $('#app').innerHTML = `<section class="page-section"><div class="shell"><div class="empty-card"><h2>The study data could not load.</h2><p>${esc(error.message)}</p><p>Check your connection and try again.</p></div></div></section>`;
  }
}

window.addEventListener('hashchange', () => {
  if (examState && !location.hash.startsWith('#/exam/')) { clearInterval(examState.timer); examState = null; }
  render();
  $('#app')?.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'auto' });
});

window.addEventListener('beforeunload', () => { if (examState?.timer) clearInterval(examState.timer); });

init();
