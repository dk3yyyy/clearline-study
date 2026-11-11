/* Clearline Study: an independent, source-linked SIA study site. Vanilla ES modules, no build step. */
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
const storageKey = 'clearline-study-v1';
const shortUnitName = (id, fallback = '') => ({
  'U1-COMMON': 'U1 · Common', 'DS-U2': 'DS · Unit 2', 'U3-CONFLICT': 'U3 · Conflict', 'U4-PI': 'U4 · Physical intervention',
  'SO-U2': 'SO · Unit 2', 'CCTV-U2': 'CCTV · Unit 2', 'CP-MAIN': 'CP · Main', 'CP-PI': 'CP · Physical intervention',
  'CP-DSR': 'CP · Door supervision', 'CVIT': 'CViT', 'DS-REF': 'DS refresher', 'SG-REF': 'SG refresher', 'CP-REF': 'CP refresher', 'VI': 'Vehicle immobilisation'
})[id] || fallback;
const defaultStore = { theme: 'light', answers: {}, studied: {}, reports: [], attempts: [], checklist: {} };

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

function setTheme(theme) {
  store.theme = theme;
  document.documentElement.dataset.theme = theme;
  const button = $('#theme-toggle');
  if (button) {
    button.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    button.title = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
    const icon = button.querySelector('.theme-icon');
    if (icon) icon.textContent = theme === 'dark' ? '☀' : '☾';
  }
  saveStore();
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

function setActiveNav(section) {
  $$('.main-nav a').forEach((link) => link.removeAttribute('aria-current'));
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

function renderHome() {
  setActiveNav('home');
  const activeQuals = DATA.syllabus.qualifications;
  const totalQuestions = DATA.questions.length;
  const cards = activeQuals.map((qual) => {
    const qs = qualQuestions(qual);
    const progress = progressFor(qs);
    const best = bestScore(qual.id);
    return `<a class="qual-card" href="${href(`qual/${qual.id}`)}">
      <div class="qual-card-top"><span class="qual-code">${esc(qual.id)}</span><span class="qual-level">${esc(qual.level)}${best !== null ? ` · best ${best}%` : ''}</span></div>
      <h3>${esc(qual.name)}</h3>
      <p>${esc(qual.description)}</p>
      ${progressBar(progress.pct, `${qual.name} question progress`)}
      <div class="progress-meta"><span>${progress.answered}/${progress.total} questions</span><span>${progress.pct}%</span></div>
      <span class="qual-open">Open qualification →</span>
    </a>`;
  }).join('');

  $('#app').innerHTML = `<section class="hero"><div class="shell hero-grid">
    <div>
      <p class="kicker">SIA licence-linked study</p>
      <h1><span>Study the material.</span><span>Check the source.</span></h1>
      <p class="hero-lede">Independent study notes and practice questions for SIA licence-linked qualifications. Every answer points to the source document it came from.</p>
      <div class="hero-actions"><a class="button button-primary" href="${href('qual/DS')}">Open Door Supervisor</a><a class="button button-ghost" href="${href('practice/DS')}">Try a practice question</a></div>
      <p class="hero-facts"><span>Independent study aid</span><span>${totalQuestions} practice questions</span><span>Open Government Licence sources</span></p>
      <p class="hero-note">Draft question bank. Not affiliated with the SIA or any awarding organisation.</p>
    </div>
    <aside class="hero-panel">
      <p class="kicker">How this works</p>
      <h2>Read the objective. Then answer a question.</h2>
      <p>Common units are shared across qualifications, so your progress carries over to every qualification that includes them.</p>
      <div class="panel-rule"></div>
      <dl><dt>Shared units</dt><dd>Common knowledge and conflict management</dd><dt>Question format</dt><dd>Four options, one answer</dd><dt>Answers</dt><dd>Linked to the source</dd><dt>Progress</dt><dd>Stored in this browser</dd></dl>
    </aside>
  </div></section>
  <section class="page-section"><div class="shell">
    <div class="section-heading"><div><p class="section-label">Qualifications</p><h2>Choose the qualification you are studying.</h2></div><p>Door Supervisor currently has the most practice questions. Security Officer, CCTV, Close Protection, CViT (Cash and Valuables in Transit) and the refreshers share common units and follow the same practice format.</p></div>
    <div class="qual-grid">${cards}</div>
  </div></section>
  <section class="page-section"><div class="shell">
    <div class="section-heading"><div><p class="section-label">Choosing a qualification</p><h2>Which licence do I need?</h2></div><p>These are the four front-line routes most learners ask about. Check GOV.UK before you choose a training course.</p></div>
    <div class="qual-grid">
      <a class="qual-card" href="${href('qual/DS')}"><div class="qual-card-top"><span class="qual-code">DS</span><span class="qual-level">Venues and events</span></div><h3>Door supervision</h3><p>You control access, search customers and manage conflict at licenced premises.</p><span class="text-link">Read the qualification summary →</span></a>
      <a class="qual-card" href="${href('qual/SO')}"><div class="qual-card-top"><span class="qual-code">SO</span><span class="qual-level">Sites and buildings</span></div><h3>Security guarding</h3><p>You protect premises, people and property through access control, patrols and reporting.</p><span class="text-link">Read the qualification summary →</span></a>
      <a class="qual-card" href="${href('qual/CCTV')}"><div class="qual-card-top"><span class="qual-code">CCTV</span><span class="qual-level">Control room</span></div><h3>CCTV operator</h3><p>You operate public space surveillance equipment and preserve evidential material.</p><span class="text-link">Read the qualification summary →</span></a>
      <a class="qual-card" href="${href('qual/CP')}"><div class="qual-card-top"><span class="qual-code">CP</span><span class="qual-level">Protective operations</span></div><h3>Close protection</h3><p>You assess threat, plan movement and protect a principal in public and private settings.</p><span class="text-link">Read the qualification summary →</span></a>
    </div>
  </div></section>
  <section class="page-section"><div class="shell">
    <div class="section-heading"><div><p class="section-label">How it works</p><h2>Learn, practice, review.</h2></div><p>Work through the syllabus, answer questions with the source open, then use a timed mock to find the objectives that need another pass.</p></div>
    <div class="stat-strip"><div><strong>01</strong><span>Read the syllabus session by session</span></div><div><strong>02</strong><span>Answer practice questions with the source open</span></div><div><strong>03</strong><span>Take a timed mock and review every answer</span></div><div><strong>04</strong><span>Review the questions you missed</span></div></div>
  </div></section>`;
}

function renderQual(qualId) {
  const qual = qualById(qualId);
  if (!qual) return renderNotFound();
  setActiveNav('learn');
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
    <aside class="page-head-aside"><dl class="qual-stats"><div><dt>Units</dt><dd>${units.length}</dd></div><div><dt>Questions</dt><dd>${qs.length}</dd></div><div><dt>Progress</dt><dd>${progress.pct}%</dd></div><div><dt>Best attempt</dt><dd>${best === null ? '—' : `${best}%`}</dd></div></dl>${progressBar(progress.pct, `${qual.name} progress`)}<span class="small-note">${progress.answered} of ${progress.total} questions answered in this browser</span></aside></div>
  </div></section>
  <div class="shell"><nav class="tabs" aria-label="${esc(qual.name)} sections"><a class="tab" aria-current="page" href="${href(`qual/${qual.id}`)}">Overview</a><a class="tab" href="${href(`learn/${qual.id}`)}">Syllabus</a><a class="tab" href="${href(`practice/${qual.id}`)}">Practice</a><a class="tab" href="${href(`exam/${qual.id}`)}">Mock paper</a><a class="tab" href="${href(`checklists/${qual.id}`)}">Practical</a><a class="tab" href="${href('weak')}">Review</a></nav></div>
  <section class="page-section"><div class="shell overview-grid">
    <div><div class="section-heading"><div><p class="section-label">Units</p><h2>What this route covers.</h2></div></div><div class="unit-list">${rows || '<div class="empty-inline">No source-backed units are loaded for this route yet.</div>'}</div></div>
    <aside class="side-card"><p class="mini-label">Check your understanding</p><h3>${units.length ? 'Use the mock to see which objectives still need work.' : 'This qualification is in the syllabus, but it has no questions yet.'}</h3><p>${units.length ? 'The mock follows the published unit format where the source confirms it. If the question bank is shorter than the paper, the setup shows the actual count.' : 'The syllabus and source links are available. Questions will be added after the source material is reviewed.'}</p><a class="button button-primary" href="${href(`exam/${qual.id}`)}">Choose a mock paper</a><a class="button button-ghost" href="${href('weak')}">Review missed questions</a><p class="small-note">Progress is stored in this browser. No account required.</p></aside>
  </div></section>`;
}

function renderNotFound() {
  setActiveNav('');
  $('#app').innerHTML = `<section class="page-section"><div class="shell"><div class="empty-card"><h1>Page not found</h1><p>That route does not exist.</p><a class="button button-primary" href="${href('')}">Back to the home page</a></div></div></section>`;
}

function renderLearn(qualId) {
  const qual = qualById(qualId);
  if (!qual) return renderNotFound();
  setActiveNav('learn');
  const { query } = routeParts();
  const requestedUnit = query.get('unit');
  const units = qualUnits(qual);
  const activeUnit = units.find((u) => u.id === requestedUnit) || units[0];
  if (!activeUnit) {
    $('#app').innerHTML = `<section class="page-head"><div class="shell"><div class="breadcrumb"><a href="${href('')}">Home</a><span>/</span><a href="${href(`qual/${qual.id}`)}">${esc(qual.id)}</a></div><h1>${esc(qual.name)}</h1><p>${esc(qual.description)}</p></div></section><section class="page-section"><div class="shell"><div class="empty-card"><h2>No syllabus loaded</h2><p>This route is in the scaffold. Its source specification has not been added to the study tree yet.</p><a class="button button-primary" href="${href(`qual/${qual.id}`)}">Back to overview</a></div></div></section>`;
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
      return `<li class="objective"><button class="objective-check" type="button" data-studied="${esc(objective.id)}" aria-pressed="${done}" aria-label="Mark objective ${oi + 1} studied">${done ? '✓' : ''}</button><p>${esc(objective.text)}</p><div class="objective-actions">${hasQuestions ? `<a href="${href(`practice/${qual.id}?objective=${objective.id}`)}">Practice</a>` : ''}<a href="${esc(session.source.url)}" target="_blank" rel="noreferrer">Source</a></div></li>`;
    }).join('');
    return `<article class="session-block" id="${esc(session.id)}"><div class="session-title"><span class="session-number">${String(index + 1).padStart(2, '0')}</span><div><h2>${esc(session.title.replace(/^Session\s*\d+[a-c]?\s*:\s*/i, ''))}</h2><p>${esc(session.summary)}</p></div><a class="session-source" href="${esc(session.source.url)}" target="_blank" rel="noreferrer">Open specification</a></div><ul class="objectives">${objectives}</ul></article>`;
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
  setActiveNav('practice');
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
  renderPracticeQuestion();
}

function renderPracticeQuestion() {
  const stage = $('#practice-stage');
  if (!stage || !practiceState) return;
  const { qual, questions, index } = practiceState;
  if (index >= questions.length) {
    const answered = questions.filter((q) => store.answers[q.id]).length;
    const correct = questions.filter((q) => store.answers[q.id]?.correct).length;
    stage.innerHTML = `<div class="result-head"><div class="score-ring" style="--score:${Math.round((correct / questions.length) * 100)}"><strong>${correct}</strong><span>of ${questions.length}</span></div><div class="result-copy"><p class="kicker">Practice set complete</p><h1>${correct === questions.length ? 'All correct.' : 'Review the questions you missed.'}</h1><p>You answered ${answered} of ${questions.length}. Questions you missed are saved for review.</p></div></div><div class="result-grid"><div class="result-block"><h2>Next</h2><p>${correct === questions.length ? 'Take a timed mock to check your recall.' : 'Review the questions you missed, then try the set again.'}</p><div class="question-foot"><a class="button button-primary" href="${href(`exam/${qual.id}`)}">Open a mock paper</a><a class="button button-ghost" href="${href(`practice/${qual.id}?mode=weak`)}">Review missed questions</a></div></div><div class="result-block"><h2>Review</h2><p>Every answer is stored in this browser. There is no account and no upload.</p><a class="text-link" href="${href('reports')}">Question reports →</a></div></div>`;
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
  const feedback = revealed ? `<div class="feedback ${selected === correctIndex ? '' : 'bad'}"><h3>${selected === correctIndex ? 'Correct.' : 'Not correct.'}</h3><p>${esc(q.explanation)}</p><p class="citation">Source: “${esc(q.source_quote)}” ${obj ? `· <a href="${esc(obj.session.source.url)}" target="_blank" rel="noreferrer">${esc(obj.session.source.doc_title)}</a>` : ''}</p></div>` : '';
  stage.innerHTML = `<article class="question-card"><div class="question-card-inner"><div class="question-top"><span class="meta"><strong>${esc(q.unit)}</strong> · question ${index + 1} of ${questions.length}</span><span class="meta">${esc(shortUnitName(obj?.unit.id, obj?.unit.name || ''))}</span></div><h2 class="question-stem">${esc(q.stem)}</h2><div class="answer-list" role="group" aria-label="Answer options">${options}</div>${feedback}<div class="question-foot"><button class="button button-primary" type="button" id="next-practice" ${revealed ? '' : 'disabled'}>${index + 1 === questions.length ? 'Finish set' : 'Next question'} →</button><button class="report-link" type="button" data-report="${esc(q.id)}">Report an issue</button></div></div></article>`;
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

function renderExam(qualId) {
  const qual = qualById(qualId);
  if (!qual) return renderNotFound();
  setActiveNav('exam');
  if (examState && examState.qual.id === qual.id) {
    if (examState.finished) return renderExamResult();
    return renderExamQuestion();
  }
  const config = DATA.examFormats[qual.id];
  if (!config || !config.units.length) {
    $('#app').innerHTML = `<section class="exam-shell"><div class="shell"><div class="breadcrumb"><a href="${href('')}">Home</a><span>/</span><a href="${href(`qual/${qual.id}`)}">${esc(qual.id)}</a><span>/</span><span>Mock paper</span></div><div class="empty-card"><h2>No mock paper for this qualification yet.</h2><p>${esc(config?.source || 'The source does not publish a multiple-choice format for this qualification.')}</p><a class="button button-primary" href="${href(`qual/${qual.id}`)}">Back to overview</a></div></div></section>`;
    return;
  }
  const rows = config.units.map((format) => {
    const unit = unitById(format.unit);
    const available = unitQuestions(format.unit).length;
    const actual = Math.min(format.questions, available);
    const needed = Math.ceil((actual * format.pass_mark) / 100);
    return `<tr><td>${esc(unit?.name || format.unit)}</td><td>${format.questions}</td><td><strong>${actual}</strong>${available < format.questions ? ' <span class="pill">short bank</span>' : ''}</td><td>${format.minutes} min</td><td>${format.pass_mark}% <span class="small-note">${needed}/${actual}</span></td><td><button class="button button-primary button-small" type="button" data-start="${format.unit}">Start ${esc(shortUnitName(format.unit, format.unit))}</button></td></tr>`;
  }).join('');
  $('#app').innerHTML = `<section class="exam-shell"><div class="shell"><div class="breadcrumb"><a href="${href('')}">Home</a><span>/</span><a href="${href(`qual/${qual.id}`)}">${esc(qual.id)}</a><span>/</span><span>Mock paper</span></div><div class="exam-head"><div><p class="kicker">Mock paper</p><h1>Choose a paper.</h1><p>Choose a unit. The timer starts with the paper. Answers are not marked until you submit; the result shows unit and objective totals.</p><div class="exam-meta"><span class="pill">${config.units.length} papers</span><span class="pill">No feedback until you submit</span><span class="pill">Pass mark from the source</span></div></div></div><div class="exam-warning">${esc(config.source)}. Where a question bank is shorter than the published paper, the mock shows the available count before you start. The bank is still in draft, so check the source before relying on an answer.</div><div class="side-card"><div class="table-scroll"><table class="source-list"><thead><tr><th style="text-align:left">Unit</th><th>Official</th><th>This mock</th><th>Time</th><th>Pass</th><th></th></tr></thead><tbody>${rows}</tbody></table></div><p class="small-note" style="margin-top:12px">Time stays at the official paper length. The pass column shows the exact correct answers needed for the questions in this paper. A short bank is labelled before you start.</p></div></div></section>`;
  $$('[data-start]').forEach((button) => button.addEventListener('click', () => startExam(qual, button.dataset.start)));
}

function startExam(qual, unitId) {
  const format = formatFor(qual, unitId);
  if (!format) return;
  const bank = shuffle(unitQuestions(unitId));
  const questions = bank.slice(0, format.questions);
  if (!questions.length) { toast('No questions loaded for this unit yet.'); return; }
  examState = { qual, format, unit: unitById(unitId), questions, index: 0, answers: {}, startedAt: Date.now(), endsAt: Date.now() + format.minutes * 60 * 1000, finished: false, timer: null };
  examState.timer = setInterval(() => {
    if (!examState || examState.finished) return;
    if (Date.now() >= examState.endsAt) { toast('Time is up. Submitting the paper.'); submitExam(); return; }
    const timer = $('#exam-timer');
    if (timer) timer.textContent = formatTime(examState.endsAt - Date.now());
  }, 1000);
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
  $('#app').innerHTML = `<section class="exam-shell"><div class="shell"><div class="breadcrumb"><a href="${href('')}">Home</a><span>/</span><a href="${href(`qual/${qual.id}`)}">${esc(qual.id)}</a><span>/</span><span>Mock paper</span></div><div class="exam-head"><div><p class="kicker">${esc(unit.name)}</p><h1>${esc(format.questions)}-question paper.</h1><div class="exam-meta"><span class="pill timer" id="exam-timer">${formatTime(examState.endsAt - Date.now())}</span><span class="pill">${format.pass_mark}% pass · ${Math.ceil((questions.length * format.pass_mark) / 100)}/${questions.length}</span><span class="pill">${questions.length} available${questions.length < format.questions ? ` · ${format.questions - questions.length} short` : ''}</span></div></div><button class="button button-danger" type="button" id="submit-exam">Submit paper</button></div><div class="exam-layout"><div><div class="question-card"><div class="question-card-inner"><div class="question-top"><span class="meta"><strong>Question ${index + 1} of ${questions.length}</strong></span><span class="meta">No feedback until submission</span></div><h2 class="question-stem">${esc(q.stem)}</h2><div class="answer-list" role="group" aria-label="Answer options">${options}</div><div class="exam-actions"><button class="button button-ghost" type="button" id="prev-exam" ${index === 0 ? 'disabled' : ''}>← Previous</button><button class="button button-primary" type="button" id="next-exam">${index + 1 === questions.length ? 'Review paper' : 'Next question →'}</button></div><p class="exam-note">Answers are not saved as study progress until you submit. The timer runs for the official paper length.</p></div></div></div><aside class="exam-palette"><h2>Question map</h2><div class="palette-grid">${palette}</div><p class="exam-note">${Object.keys(answers).length} of ${questions.length} answered</p><button class="button button-ghost" type="button" id="submit-exam-side" style="width:100%;margin-top:12px">Submit paper</button></aside></div></div></section>`;
  $$('[data-exam-answer]').forEach((button) => button.addEventListener('click', () => {
    examState.answers[q.id] = Number(button.dataset.examAnswer);
    renderExamQuestion();
  }));
  $$('[data-index]').forEach((button) => button.addEventListener('click', () => { examState.index = Number(button.dataset.index); renderExamQuestion(); }));
  $('#prev-exam')?.addEventListener('click', () => { examState.index = Math.max(0, examState.index - 1); renderExamQuestion(); });
  $('#next-exam')?.addEventListener('click', () => { if (examState.index + 1 < questions.length) { examState.index += 1; renderExamQuestion(); } });
  $('#submit-exam')?.addEventListener('click', submitExam);
  $('#submit-exam-side')?.addEventListener('click', submitExam);
}

function submitExam() {
  if (!examState || examState.finished) return;
  const unanswered = examState.questions.length - Object.keys(examState.answers).length;
  if (unanswered > 0 && !window.confirm(`You have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. Submit anyway?`)) return;
  clearInterval(examState.timer);
  examState.finished = true;
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
  $('#app').innerHTML = `<section class="exam-shell"><div class="shell"><div class="result-head"><div class="score-ring" style="--score:${pct}"><strong>${pct}%</strong><span>${correct} of ${questions.length}</span></div><div class="result-copy"><p class="kicker">${esc(unit.name)} · mock result</p><h1>${passed ? 'Above the pass mark.' : 'Below the pass mark.'}</h1><p>${passed ? 'This attempt is above the published pass mark.' : `The published pass mark is ${examState.format.pass_mark}%. Review the paper and the objectives below.`}</p><div class="question-foot"><a class="button button-primary" href="${href(`practice/${qual.id}?unit=${unit.id}`)}">Practice this unit</a><button class="button button-ghost" type="button" id="new-mock">Try another paper</button><button class="button button-ghost" type="button" id="clear-exam">Paper setup</button></div></div></div><div class="result-grid"><div class="result-block"><h2>By unit</h2><ul class="breakdown-list">${unitRows}</ul><h2 style="margin-top:22px">Weakest objectives</h2><ul class="breakdown-list">${objectiveRows || '<li><span>No objective tags in this paper.</span></li>'}</ul></div><div class="result-block"><h2>Next step</h2><p>Questions you answered incorrectly are saved for review. The paper review below shows the correct answer and explanation for every question.</p><a class="text-link" href="${href('weak')}">Open the review list →</a></div></div><div class="review-list"><div class="section-heading"><div><p class="section-label">Review</p><h2>Every question.</h2></div><p>Explanations and source quotations are in practice mode. Open the syllabus if you need more context.</p></div>${review}</div></div></section>`;
  $('#clear-exam')?.addEventListener('click', () => { examState = null; renderExam(qual.id); });
  $('#new-mock')?.addEventListener('click', () => { examState = null; renderExam(qual.id); });
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
  $('#app').innerHTML = `<section class="page-head"><div class="shell"><div class="breadcrumb"><a href="${href('')}">Home</a><span>/</span><span>Weak spots</span></div><div class="page-head-grid"><div><p class="kicker">Review</p><h1>Questions to review.</h1><p>Questions you answered incorrectly are stored in this browser. Review them, then return to the syllabus or try another practice set.</p></div><aside class="page-head-aside"><dl class="qual-stats"><div><dt>Missed</dt><dd>${wrong.length}</dd></div><div><dt>Qualifications</dt><dd>${byQual.length}</dd></div></dl><a class="button button-primary" href="${href('practice/DS?mode=weak')}">Review Door Supervisor questions</a></aside></div></div></section><section class="page-section"><div class="shell">${rows ? `<div class="list-page">${rows}</div>` : `<div class="empty-card"><h2>Nothing to review yet.</h2><p>Practice a set or submit a mock paper. Questions you answer incorrectly will appear here.</p><a class="button button-primary" href="${href('practice/DS')}">Start practice</a></div>`}</div></section>`;
}

function renderReports() {
  setActiveNav('');
  const rows = store.reports.map((r) => `<div class="list-row"><div><h3>${esc(r.questionId)}</h3><p>${esc(r.reason)} · ${esc(new Date(r.at).toLocaleString())}${r.note ? ` · ${esc(r.note)}` : ''}</p></div><div class="list-row-actions"><span class="pill">${esc(r.unit || '')}</span></div></div>`).join('');
  $('#app').innerHTML = `<section class="page-head"><div class="shell"><div class="breadcrumb"><a href="${href('')}">Home</a><span>/</span><span>Question reports</span></div><div class="page-head-grid"><div><p class="kicker">Question quality</p><h1>Question reports.</h1><p>Reports stay in this browser until you export them. Nothing is sent anywhere automatically. Export the JSON and send it to the site owner for review.</p></div><aside class="page-head-aside"><dl class="qual-stats"><div><dt>Open reports</dt><dd>${store.reports.length}</dd></div><div><dt>Storage</dt><dd>Local</dd></div></dl><button class="button button-primary" type="button" id="export-reports" ${store.reports.length ? '' : 'disabled'}>Export JSON</button><button class="button button-ghost" type="button" id="clear-reports" ${store.reports.length ? '' : 'disabled'} style="margin-top:8px">Clear reports</button></aside></div></div></section><section class="page-section"><div class="shell">${rows ? `<div class="list-page">${rows}</div>` : '<div class="empty-card"><h2>Nothing reported.</h2><p>Use “Report an issue” under any practice question.</p></div>'}</div></section>`;
  $('#export-reports')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(store.reports, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'clearline-question-reports.json'; link.click();
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
  setActiveNav('learn');
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
  $('#app').innerHTML = `<section class="page-head"><div class="shell"><div class="breadcrumb"><a href="${href('')}">Home</a><span>/</span><span>About the sources</span></div><div class="page-head-grid"><div><p class="kicker">Open Government Licence</p><h1>Where the material comes from.</h1><p>The syllabus map and question bank are built from SIA specifications published on GOV.UK. Each practice question includes the source quotation behind its answer. The specification is always the authority.</p></div><aside class="page-head-aside"><p class="small-note">Last content build: ${esc(new Date().toISOString().slice(0, 10))}. Check the SIA for a newer specification before relying on a fact.</p></aside></div></div></section><section class="page-section"><div class="shell legal-copy"><h2>Attribution</h2><p>Contains public sector information licensed under the Open Government Licence v3.0. Sources include the Security Industry Authority, Home Office, Health and Safety Executive, NPSA and legislation.gov.uk. This site is not endorsed by or affiliated with the SIA or any awarding organisation.</p><h2>What is in scope</h2><p>The syllabus map covers the SIA licence-linked specifications in the supplied study pack: Door Supervisor, Security Officer, CCTV, Close Protection, CViT and the 2024/2025 refresher specifications. Shared units are stored once and tagged to every qualification they serve.</p><h2>What is not in scope</h2><p>This build does not copy questions or wording from awarding organisation sample papers or commercial mock-test sites. It does not teach physical intervention techniques. It does not replace the SIA specification, the awarding organisation’s assessment materials, or a qualified trainer.</p><h2>Question status</h2><p>Questions are drafted from the specifications and marked for human review where they touch use of force, arrest, physical intervention or first aid. Do not treat a draft question as an official exam question. If a question looks wrong, report it from practice mode and export the report JSON.</p></div></section>`;
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
  setTheme(store.theme || 'light');
  $('#theme-toggle')?.addEventListener('click', () => setTheme(store.theme === 'dark' ? 'light' : 'dark'));
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
