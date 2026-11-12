/* ShiftReady: an independent, source-linked SIA study site. Vanilla ES modules, no build step. */
import { requiredMarks, markPaper, hasPassed } from './scoring.js?v=20261112ap';
import { mergeStore } from './store.js?v=20261112ap';
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
/* Some objectives are whole scenario lists collapsed into one string — the
   largest is 3,391 characters, which renders as a 650px wall of text on the
   syllabus page. Show the opening and let the reader open the rest. */
function objectiveBody(text) {
  const raw = String(text ?? '');
  if (raw.length <= 240) return esc(raw);
  const head = raw.slice(0, 240).replace(/\s+\S*$/, '');
  const rest = raw.slice(head.length);
  return `${esc(head)}…<span class="objective-rest" hidden>${esc(rest)}</span><button class="objective-expand" type="button" aria-expanded="false">Show full objective</button>`;
}
const shortObjective = (text, limit = 120) => {
  const raw = String(text ?? '');
  return raw.length > limit ? `${raw.slice(0, limit - 1).trimEnd()}…` : raw;
};
const storageKey = 'clearline-study-v1';
const shortUnitName = (id, fallback = '') => ({
  'U1-COMMON': 'U1 · Common', 'DS-U2': 'DS · Unit 2', 'U3-CONFLICT': 'U3 · Conflict', 'U4-PI': 'U4 · Physical intervention',
  'SO-U2': 'SO · Unit 2', 'CCTV-U2': 'CCTV · Unit 2', 'CP-MAIN': 'CP · Main', 'CP-PI': 'CP · Physical intervention',
  'CP-DSR': 'CP · Door supervision', 'CVIT': 'CViT', 'DS-REF': 'DS refresher', 'SG-REF': 'SG refresher', 'CP-REF': 'CP refresher', 'VI': 'Vehicle immobilisation'
})[id] || fallback;
const CONTENT_DATE = '2026-11-11';
const DATA_VERSION = '20261112ap';
const EXAM_KEY = 'shiftready-exam-v1';
const PRACTICE_KEY = 'shiftready-practice-v1';
const defaultStore = { answers: {}, studied: {}, reports: [], attempts: [], checklist: {}, reportsClearedAt: '' };
const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const normaliseStore = (raw) => ({
  ...defaultStore,
  ...(isRecord(raw) ? raw : {}),
  answers: isRecord(raw?.answers) ? raw.answers : {},
  studied: isRecord(raw?.studied) ? raw.studied : {},
  reports: Array.isArray(raw?.reports) ? raw.reports : [],
  attempts: Array.isArray(raw?.attempts) ? raw.attempts : [],
  checklist: isRecord(raw?.checklist) ? raw.checklist : {},
  reportsClearedAt: typeof raw?.reportsClearedAt === 'string' ? raw.reportsClearedAt : ''
});

function loadStore() {
  try {
    return normaliseStore(JSON.parse(localStorage.getItem(storageKey) || '{}'));
  } catch {
    return structuredClone(defaultStore);
  }
}
const store = loadStore();
window.addEventListener('storage', (event) => {
  if (event.key !== storageKey) return;
  // Another tab saved; take its progress without disturbing the current view.
  Object.assign(store, mergeStore(store, loadStore()));
});
let storageWarned = false;
const saveStore = () => {
  try {
    // Merge with what is on disk so a second tab cannot overwrite answers this
    // tab never loaded.
    const merged = mergeStore(store, loadStore());
    Object.assign(store, merged);
    localStorage.setItem(storageKey, JSON.stringify(merged));
  } catch (error) {
    if (!storageWarned) {
      storageWarned = true;
      toast('Progress could not be saved in this browser.');
    }
  }
};

function setTheme(theme, persist = true) {
  if (theme === 'dark' || theme === 'light') {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#F6F7F9' : '#0B1220');
    if (persist) { try { localStorage.setItem('theme', theme); } catch (error) {} }
  } else {
    document.documentElement.removeAttribute('data-theme');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', systemTheme() === 'light' ? '#F6F7F9' : '#0B1220');
    if (persist) { try { localStorage.removeItem('theme'); } catch (error) {} }
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
  const baseId = candidate && candidate.units.length ? requested : 'DS';
  const practiceId = candidate && qualQuestions(candidate).length ? requested : 'DS';
  const targets = { learn: `learn/${baseId}`, practice: `practice/${practiceId}`, exam: `exam/${practiceId}` };
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
function bestAttempt(qualId) {
  return store.attempts
    .filter((a) => a.qual === qualId)
    .sort((a, b) => scoreFor(b) - scoreFor(a) || (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0))[0] || null;
}
function bestScore(qualId) {
  const attempt = bestAttempt(qualId);
  return attempt ? scoreFor(attempt) : null;
}
function bestLabel(qualId) {
  const attempt = bestAttempt(qualId);
  if (!attempt) return '';
  const unit = shortUnitName(attempt.unit, attempt.unit || '');
  return `Best attempt: ${scoreFor(attempt)}% · ${unit} (${attempt.correct}/${attempt.total})`;
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
  const randomPool = DATA.questions.filter((q) => q.objective_id && (q.qualifications || []).some((id) => qualById(id)));
  const randomQuestion = randomPool[Math.floor(Math.random() * randomPool.length)];
  const randomQual = randomQuestion?.qualifications?.find((id) => qualById(id)) || 'DS';
  const randomHref = randomQuestion ? href(`practice/${randomQual}?objective=${encodeURIComponent(randomQuestion.objective_id)}`) : href('practice/DS');
  const coreIds = new Set(['DS', 'SO', 'CCTV', 'CP', 'CVIT']);
  const core = activeQuals.filter((qual) => coreIds.has(qual.id));
  const refreshers = activeQuals.filter((qual) => qual.id.endsWith('-REF') || qual.id === 'EFAW');
  const legacy = activeQuals.filter((qual) => !coreIds.has(qual.id) && !qual.id.endsWith('-REF') && qual.id !== 'EFAW');

  const card = (qual) => {
    const questions = qualQuestions(qual);
    const progress = progressFor(questions);
    const best = bestScore(qual.id);
    const started = progress.answered > 0;
    return `<a class="qual-card ${qual.id === 'DS' ? 'qual-card--featured' : ''}" href="${href(`qual/${qual.id}`)}">
      <div class="qual-card-top"><span class="qual-code">${esc(qual.id)}</span><span class="qual-level">${esc(qual.level)}${best !== null ? `<span class="qual-best">${esc(bestLabel(qual.id))}</span>` : ''}</span></div>
      <h3>${esc(qual.name)}</h3>
      <p>${esc(qual.description)}</p>
      <div class="qual-meta"><span>${questions.length} questions</span><span>${started ? `${progress.answered} answered` : (questions.length ? 'Not started' : 'Content in progress')}</span></div>
      ${started ? progressBar(progress.pct, `${qual.name} question progress`) : ''}
    </a>`;
  };

  const row = (qual) => {
    const questions = qualQuestions(qual);
    const progress = progressFor(questions);
    return `<a class="refresher-row" href="${href(`qual/${qual.id}`)}">
      <span class="qual-code">${esc(qual.id)}</span>
      <span class="refresher-copy"><strong>${esc(qual.name)}</strong><span>${esc(qual.description)}</span></span>
      <span class="refresher-meta">${questions.length ? `${questions.length} questions` : 'No questions yet'}<span>${questions.length ? (progress.answered ? `${progress.answered} answered` : 'Not started') : '—'}</span></span>
    </a>`;
  };

  $('#app').innerHTML = `<section class="hero"><div class="shell hero-grid">
    <div>
      <p class="kicker">SIA licence-linked study</p>
      <h1><span>Study the material.</span><span>Check the source.</span></h1>
      <p class="hero-lede">Independent syllabus maps, source links and practice questions for SIA licence-linked qualifications.</p>
      <div class="hero-actions"><a class="button button-primary" href="#choose" id="choose-link">Choose a qualification</a><a class="button button-ghost" href="${href('qual/DS')}">Open Door Supervisor</a></div>
      <p class="hero-facts">Independent study aid. ${totalQuestions} practice questions. Open Government Licence sources.</p>
    </div>
  </div></section>
  <section class="page-section" id="choose"><div class="shell">
    <div class="section-heading"><div><p class="section-label">Start here</p><h2>Choose the qualification you are studying.</h2></div><p>Start with the licence you need. Refreshers and supporting modules are grouped below; every card opens its syllabus and practice.</p></div>
    <h3 class="group-heading">Licence-linked qualifications</h3>
    <div class="qual-grid qual-grid--core">${core.map(card).join('')}</div>
    <h3 class="group-heading">Refreshers and supporting modules</h3>
    <div class="refresher-grid">${refreshers.map(row).join('')}</div>
    ${legacy.length ? `<p class="legacy-note">${legacy.map((qual) => `<span class="qual-code">${esc(qual.id)}</span> ${esc(qual.name)} <span>${esc(qual.description)}</span> <a href="${href(`qual/${qual.id}`)}">Open qualification</a>`).join('')}</p>` : ''}
    <p class="hero-random"><a href="${randomHref}">Try a random question →</a></p>
    <p class="hero-note">Draft question bank. Not affiliated with the SIA or any awarding organisation.</p>
  </div></section>
  <section class="page-section"><div class="shell home-pass-section"><div>${studyPass(qualById('DS'))}</div><p class="small-note">The pass shows questions answered, not an exam result. Shared units carry across qualifications.</p></div></section>
  <section class="page-section"><div class="shell">
    <div class="section-heading"><div><h2>Learn, practice, review.</h2></div><p>Work through the syllabus, answer questions with the source open, then use a timed mock to find the objectives that need another pass.</p></div>
    <div class="stat-strip"><div><strong>01</strong><span>Read the syllabus session by session</span></div><div><strong>02</strong><span>Answer practice questions with the source open</span></div><div><strong>03</strong><span>Take a timed mock and review every answer</span></div><div><strong>04</strong><span>Drill the questions you missed</span></div></div>
  </div></section>`;
  $('#choose-link')?.addEventListener('click', (event) => {
    event.preventDefault();
    $('#choose')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
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
      <div class="unit-row-actions"><a class="button button-ghost button-small" href="${href(`learn/${qual.id}?unit=${unit.id}`)}">Syllabus</a>${up.total ? `<a class="button button-ghost button-small" href="${href(`practice/${qual.id}?unit=${unit.id}`)}">Practice</a>` : ''}${exam && up.total ? `<a class="button button-primary button-small" href="${href(`exam/${qual.id}?unit=${unit.id}`)}">Mock paper</a>` : `<span class="pill">Content in progress</span>`}</div>
    </div>`;
  }).join('');

  $('#app').innerHTML = `<section class="page-head"><div class="shell">
    <div class="breadcrumb"><a href="${href('')}">Home</a><span>/</span><span>${esc(qual.id)}</span></div>
    <div class="page-head-grid"><div><p class="kicker">${esc(qual.level)}</p><h1>${esc(qual.name)}</h1><p>${esc(qual.description)}</p><p class="small-note">Law covered: England and Wales.</p></div>
    <aside class="page-head-aside"><dl class="qual-stats"><div><dt>Units</dt><dd>${units.length}</dd></div><div><dt>Questions</dt><dd>${qs.length}</dd></div><div><dt>Questions answered</dt><dd>${progress.pct}%</dd></div><div><dt>Best attempt</dt><dd>${best === null ? '—' : `${best}%`}</dd></div></dl>${progressBar(progress.pct, `${qual.name} questions answered`)}<span class="small-note">${progress.total ? `${progress.answered} of ${progress.total} questions answered in this browser` : 'No questions in this bank yet.'}${best !== null ? ` ${esc(bestLabel(qual.id))}.` : ''}</span></aside></div>
  </div></section>
  <div class="shell"><nav class="tabs" aria-label="${esc(qual.name)} sections"><a class="tab" aria-current="page" href="${href(`qual/${qual.id}`)}">Overview</a><a class="tab" href="${href(`learn/${qual.id}`)}">Syllabus</a><a class="tab" href="${href(`practice/${qual.id}`)}">Practice</a><a class="tab" href="${href(`exam/${qual.id}`)}">Mock paper</a><a class="tab" href="${href(`checklists/${qual.id}`)}">Practical</a><a class="tab" href="${href('weak')}">Weak spots</a></nav></div>
  <section class="page-section"><div class="shell overview-grid">
    <div><div class="section-heading"><div><p class="section-label">Units</p><h2>What this qualification covers.</h2></div></div><div class="unit-list">${rows || '<div class="empty-inline">No units are available for this qualification yet.</div>'}</div></div>
    <aside class="side-card"><p class="mini-label">Check your understanding</p><h3>${units.length && qs.length ? 'Use the mock to see which objectives still need work.' : 'This qualification is still being built from source-backed units.'}</h3><p>${units.length && qs.length ? 'The mock follows the published unit format where the source confirms it. If the question bank is shorter than the paper, the setup shows the actual count.' : 'There are no questions for this qualification yet. Read the syllabus or open the specification while the bank is reviewed.'}</p>${units.length && qs.length ? `<a class="button button-primary" href="${href(`exam/${qual.id}`)}">Choose a mock paper</a><a class="button button-ghost" href="${href('weak')}">Open weak spots</a>` : `<a class="button button-primary" href="${href(`learn/${qual.id}`)}">Read the syllabus</a><a class="button button-ghost" href="${href(`qual/${qual.id}`)}">Back to overview</a>`}<p class="small-note">Progress is stored in this browser. No account required.</p></aside>
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
  const unitOptions = units.map((u) => `<option value="${u.id}" ${u.id === activeUnit.id ? 'selected' : ''}>${esc(u.name)} (${unitProgress(u).studied}/${unitProgress(u).objectives})</option>`).join('');
  const unitHasObjectives = activeUnit.sessions.some((section) => (section.objectives || []).length);
  const sessions = activeUnit.sessions.map((session, index) => {
    const objectives = session.objectives.map((objective, oi) => {
      const done = !!store.studied[objective.id];
      const hasQuestions = DATA.questions.some((q) => q.objective_id === objective.id);
      return `<li class="objective"><button class="objective-check" type="button" data-studied="${esc(objective.id)}" aria-pressed="${done}"><span aria-hidden="true">${done ? '✓' : ''}</span><span class="visually-hidden">Mark objective ${oi + 1} studied: ${esc(shortObjective(objective.text))}</span></button><p>${objectiveBody(objective.text)}</p><div class="objective-actions">${hasQuestions ? `<a href="${href(`practice/${qual.id}?objective=${objective.id}`)}">Practice</a>` : ''}<a href="${esc(session.source.url)}" target="_blank" rel="noreferrer" aria-label="Open specification: ${esc(session.title)}">Open specification</a></div></li>`;
    }).join('');
    return `<article class="session-block" id="${esc(session.id)}"><div class="session-title"><span class="session-number">${String(index + 1).padStart(2, '0')}</span><div><h2>${esc(session.title.replace(/^Session\s*\d+[a-c]?\s*:\s*/i, ''))}</h2><p>${esc(session.summary)}</p></div><a class="session-source" href="${esc(session.source.url)}" target="_blank" rel="noreferrer" aria-label="Open specification: ${esc(session.title)}">Open specification</a></div>${session.objectives.length ? `<ul class="objectives">${objectives}</ul>` : unitHasObjectives ? '<p class="empty-inline">No objectives are mapped for this session yet.</p>' : ''}</article>`;
  }).join('');
  const up = unitProgress(activeUnit);
  $('#app').innerHTML = `<section class="page-head"><div class="shell"><div class="breadcrumb"><a href="${href('')}">Home</a><span>/</span><a href="${href(`qual/${qual.id}`)}">${esc(qual.id)}</a><span>/</span><span>Syllabus</span></div><div class="page-head-grid"><div><p class="kicker">Syllabus</p><h1>${esc(activeUnit.name)}</h1><p>Read the objective, then open the SIA specification to check the detail. Mark it studied when you have read the source.</p></div><aside class="page-head-aside learn-stats"><dl class="qual-stats"><div><dt>Session</dt><dd>${activeUnit.sessions.length}</dd></div><div><dt>Objectives</dt><dd>${up.objectives}</dd></div><div><dt>Studied</dt><dd>${up.studied}</dd></div><div><dt>Questions</dt><dd>${up.total}</dd></div></dl>${progressBar(up.objectives ? Math.round((up.studied / up.objectives) * 100) : 0, 'Objectives studied')}</aside></div></div></section>
  <section class="page-section"><div class="shell learn-layout"><aside class="learn-nav"><h2>Units</h2>${nav}</aside><div><div class="mobile-unit field"><label for="learn-unit">Unit</label><select id="learn-unit">${unitOptions}</select></div>${unitHasObjectives ? '' : '<p class="empty-inline">The objectives for this unit have not been mapped yet. The session list below links to the specification.</p>'}${sessions || '<div class="empty-inline">No sessions in this unit.</div>'}<p class="source-note">Source: ${sourceLink(activeUnit.sessions[0]?.source)}. Read the source before relying on a summary. The SIA specification is the authority.</p><div class="question-foot"><a class="button button-primary" href="${href(`practice/${qual.id}?unit=${activeUnit.id}`)}">Practice this unit</a><a class="button button-ghost" href="${href(`qual/${qual.id}`)}">Back to overview</a></div></div></div></section>`;
  $$('.objective-expand').forEach((button) => button.addEventListener('click', () => {
    const rest = button.previousElementSibling;
    if (!rest) return;
    const opening = rest.hidden;
    rest.hidden = !opening;
    button.setAttribute('aria-expanded', String(opening));
    button.textContent = opening ? 'Show less' : 'Show full objective';
  }));
  $('#learn-unit')?.addEventListener('change', (event) => {
    location.hash = `#/learn/${qual.id}?unit=${encodeURIComponent(event.target.value)}`;
  });
  $$('[data-studied]').forEach((button) => button.addEventListener('click', () => {
    const id = button.dataset.studied;
    const y = window.scrollY;
    store.studied[id] = !store.studied[id];
    saveStore();
    renderLearn(qual.id);
    window.scrollTo({ top: y, behavior: 'auto' });
    document.querySelector(`[data-studied="${id}"]`)?.focus({ preventScroll: true });
  }));
}

function practicePool(qual, query) {
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
  return pool;
}

function practiceQuestions(qual, query) {
  return shuffle(practicePool(qual, query)).slice(0, 20);
}

function practiceSignature(qual, query) {
  const params = new URLSearchParams(query);
  params.delete('resume');
  if (params.get('objective')) params.delete('unit');
  params.sort();
  return `${qual.id}?${params.toString()}`;
}

function savePracticeState() {
  if (!practiceState) return;
  try {
    sessionStorage.setItem(PRACTICE_KEY, JSON.stringify({
      signature: practiceState.signature,
      qualId: practiceState.qual.id,
      questionIds: practiceState.questions.map((q) => q.id),
      index: practiceState.index,
      selected: practiceState.selected,
      revealed: practiceState.revealed
    }));
  } catch (error) {
    // A private window can refuse storage; the set still works without recovery.
  }
}

function restorePracticeState(qual, query) {
  try {
    const raw = sessionStorage.getItem(PRACTICE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (saved?.signature !== practiceSignature(qual, query)) return null;
    const questions = (saved.questionIds || []).map(questionById).filter(Boolean);
    if (!questions.length) return null;
    return { qual, questions, index: Math.min(saved.index || 0, questions.length), selected: saved.selected ?? null, revealed: !!saved.revealed, signature: saved.signature };
  } catch (error) {
    return null;
  }
}

function clearPracticeState() {
  try { sessionStorage.removeItem(PRACTICE_KEY); } catch (error) {}
}

function renderPractice(qualId) {
  const qual = qualById(qualId);
  if (!qual) return renderNotFound();
  if (practiceState && practiceState.qual.id !== qual.id) practiceState = null;
  setActiveNav('practice', qual.id);
  const { query } = routeParts();
  const units = qualUnits(qual);
  const objectiveId = query.get('objective') || '';
  const objectiveUnit = objectiveId ? units.find((u) => u.sessions.some((s) => s.objectives.some((o) => o.id === objectiveId))) : null;
  const selectedUnit = query.get('unit') || objectiveUnit?.id || '';
  const mode = query.get('mode') || '';
  const poolSize = practicePool(qual, query).length;
  const objectiveText = objectiveId ? units.flatMap((u) => u.sessions.flatMap((s) => s.objectives)).find((o) => o.id === objectiveId)?.text : '';
  const options = units.map((u) => `<option value="${u.id}" ${u.id === selectedUnit ? 'selected' : ''}>${esc(shortUnitName(u.id, u.name))}</option>`).join('');
  $('#app').innerHTML = `<section class="practice-shell"><div class="shell">
    <div class="breadcrumb"><a href="${href('')}">Home</a><span>/</span><a href="${href(`qual/${qual.id}`)}">${esc(qual.id)}</a><span>/</span><span>Practice</span></div>
    <div class="practice-layout"><aside class="practice-aside"><p class="kicker">Practice</p><h2 class="practice-title">Practice questions.</h2><p class="small-note" style="margin-bottom:22px">Answer at your own pace. Each answer shows an explanation and the source it came from. No timer. England and Wales law.</p><div class="field"><label for="practice-unit">Unit</label><select id="practice-unit"><option value="">All units</option>${options}</select></div>${objectiveText ? `<p class="small-note objective-chip">Objective: ${esc(shortObjective(objectiveText, 160))} <a href="${href(`practice/${qual.id}`)}">Clear</a></p>` : ''}${mode === 'weak' ? '<p class="empty-inline">Questions you answered incorrectly</p>' : ''}<button class="button button-primary" id="start-practice" type="button" ${poolSize ? '' : 'disabled'}>Start practice</button><a class="text-link" href="${href(`qual/${qual.id}`)}" style="display:inline-block;margin-top:14px">Back to overview</a><p class="small-note" style="margin-top:16px">${poolSize ? `${poolSize} question${poolSize === 1 ? '' : 's'} in this filter.` : 'No questions match this filter yet.'}</p><p class="small-note">Draft questions. Check the cited source and report an error if the answer is wrong.</p></aside><div id="practice-stage"><div class="empty-card"><h1 class="visually-hidden">Practice questions.</h1><h2>${poolSize ? 'Start when you are ready.' : 'No questions in this filter yet.'}</h2><p>${poolSize ? 'All units is already selected, or choose one unit above. Each set uses up to 20 questions.' : 'Choose another unit, or read the syllabus while the bank is being reviewed.'}</p></div></div></div>
  </div></section>`;
  const restored = !practiceState && !query.get('new') ? restorePracticeState(qual, query) : null;
  if (restored) {
    practiceState = restored;
    $('.practice-aside')?.classList.add('is-running');
    const start = $('#start-practice');
    if (start) {
      start.hidden = true;
      start.insertAdjacentHTML('afterend', `<p class="small-note set-status" role="status">Set running · ${restored.questions.length} questions</p>`);
    }
    const unitSelect = $('#practice-unit');
    if (unitSelect) unitSelect.disabled = true;
    renderPracticeQuestion();
    focusQuestion();
    return;
  }
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
  practiceState = { qual, questions, index: 0, selected: null, revealed: false, signature: practiceSignature(qual, query) };
  try {
    const target = `#/practice/${qual.id}${query.toString() ? `?${query.toString()}` : ''}`;
    if (location.hash !== target) history.replaceState(null, '', target);
  } catch (error) {}
  savePracticeState();
  $('.practice-aside')?.classList.add('is-running');
  const start = $('#start-practice');
  if (start) {
    start.hidden = true;
    start.insertAdjacentHTML('afterend', `<p class="small-note set-status" role="status">Set running · ${questions.length} questions</p>`);
  }
  const unitSelect = $('#practice-unit');
  if (unitSelect) unitSelect.disabled = true;
  renderPracticeQuestion();
  focusQuestion();
}

function renderPracticeQuestion() {
  const stage = $('#practice-stage');
  if (!stage || !practiceState) return;
  const { qual, questions, index } = practiceState;
  if (index >= questions.length) {
    const answered = questions.filter((q) => store.answers[q.id]).length;
    const correct = questions.filter((q) => store.answers[q.id]?.correct).length;
    const perfect = correct === questions.length;
    stage.innerHTML = `<div class="result-head"><div class="score-ring" style="--score:${Math.round((correct / questions.length) * 100)}"><strong>${correct}</strong><span>of ${questions.length}</span></div><div class="result-copy"><p class="kicker">Practice set complete</p><h1>${perfect ? 'All correct.' : 'Review the questions you missed.'}</h1><p>You answered ${answered} of ${questions.length}. ${perfect ? 'Nothing was missed in this set.' : 'Questions you missed are saved for review.'}</p></div></div><div class="result-grid"><div class="result-block"><h2>Next</h2><p>${perfect ? 'Try another set or a timed mock to check your recall.' : 'Drill the questions you missed, then try the set again.'}</p><div class="question-foot"><a class="button button-primary" href="${href(`exam/${qual.id}`)}">Open a mock paper</a>${perfect ? `<a class="button button-ghost" href="${href(`practice/${qual.id}?new=1`)}">Start another set</a>` : `<a class="button button-ghost" href="${href(`practice/${qual.id}?mode=weak`)}">Drill missed questions</a>`}</div></div><div class="result-block"><h2>Review</h2><p>Every answer is stored in this browser. There is no account and no upload.</p><a class="text-link" href="${href('reports')}">Question reports</a></div></div>`;
    announcePractice('Practice set complete.');
    setTimeout(() => { const heading = stage.querySelector('h1'); if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); } }, 0);
    return;
  }
  const q = questions[index];
  const answer = store.answers[q.id];
  const selected = practiceState.selected;
  const revealed = practiceState.revealed;
  const correctIndex = q.answer_index;
  const options = q.options.map((option, i) => {
    let cls = 'answer-option';
    let pressed = selected === i ? 'true' : 'false';
    if (revealed && i === correctIndex) cls += ' is-correct';
    if (revealed && selected === i && i !== correctIndex) cls += ' is-wrong';
    const letter = String.fromCharCode(65 + i);
    const mark = revealed && i === correctIndex ? '✓' : revealed && selected === i ? '×' : '';
    const stateLabel = revealed ? (i === correctIndex ? 'Correct answer. ' : selected === i ? 'Your answer, incorrect. ' : '') : '';
    return `<button class="${cls}" type="button" data-answer="${i}" aria-pressed="${pressed}" ${revealed ? 'disabled' : ''}><span class="answer-key" aria-hidden="true">${letter}${mark}</span><span class="visually-hidden">${stateLabel}</span><span>${esc(option)}</span></button>`;
  }).join('');
  const obj = objectiveFor(q);
  const source = q.source || (obj ? obj.session.source : null);
  const quoteIsObjective = obj && normaliseText(q.source_quote) === normaliseText(obj.objective.text);
  const quoteWords = String(q.source_quote || '').trim().split(/\s+/).filter(Boolean).length;
  const quoteIsAnswer = normaliseText(q.source_quote) === normaliseText(q.options[q.answer_index]);
  const citationLabel = quoteIsObjective ? 'Syllabus objective' : quoteIsAnswer || quoteWords <= 4 ? 'Answer reference' : 'Source';
  const sourceDetail = q.source_section ? ` · ${esc(q.source_section)}` : '';
  const feedback = revealed ? `<div class="feedback ${selected === correctIndex ? '' : 'bad'}"><h3>${selected === correctIndex ? 'Correct.' : 'Not correct.'}</h3><p>${esc(q.explanation)}</p><p class="citation">${citationLabel}: “${esc(q.source_quote)}”${sourceDetail} ${source ? `· <a href="${esc(source.url)}" target="_blank" rel="noreferrer">${esc(source.title || source.doc_title)}</a>` : ''}</p></div>` : '';
  stage.innerHTML = `<article class="question-card"><h1 class="visually-hidden">Question ${index + 1} of ${questions.length}.</h1><div class="question-card-inner"><div class="question-top"><span class="meta"><strong>${esc(q.unit)}</strong> · question ${index + 1} of ${questions.length}</span><span class="meta">${esc(shortUnitName(obj?.unit.id, obj?.unit.name || ''))}</span></div><p class="draft-note">Draft question. Check the cited source before relying on it.${q.requires_human_review ? ' This topic is awaiting subject review.' : ''}</p><h2 class="question-stem" tabindex="-1">${esc(q.stem)}</h2><div class="answer-list" role="group" aria-label="Answer options">${options}</div>${feedback}<div class="question-foot"><button class="button button-primary" type="button" id="next-practice" ${revealed ? '' : 'disabled'}>${index + 1 === questions.length ? 'Finish set' : 'Next question'} →</button><button class="report-link" type="button" data-report="${esc(q.id)}">Report an issue</button></div></div></article>`;
  stage.querySelectorAll('[data-answer]').forEach((button) => {
    button.addEventListener('click', () => {
      if (practiceState.revealed) return;
      practiceState.selected = Number(button.dataset.answer);
      practiceState.revealed = true;
      const correct = practiceState.selected === q.answer_index;
      const existing = store.answers[q.id];
      store.answers[q.id] = { selected: practiceState.selected, correct, at: new Date().toISOString() };
      if (!existing || existing.correct !== correct) saveStore();
      savePracticeState();
      renderPracticeQuestion();
      announcePractice(`${correct ? 'Correct.' : 'Not correct.'} ${q.explanation}`);
      setTimeout(() => $('#next-practice')?.focus({ preventScroll: true }), 0);
    });
  });
  $('#next-practice')?.addEventListener('click', () => {
    practiceState.index += 1;
    practiceState.selected = null;
    practiceState.revealed = false;
    savePracticeState();
    renderPracticeQuestion();
    if (practiceState.index < practiceState.questions.length) focusQuestion();
  });
  stage.querySelector('[data-report]')?.addEventListener('click', () => openReport(q.id));
}

function announcePractice(message) {
  const region = $('#practice-status');
  if (region) region.textContent = message;
}

function focusQuestion() {
  setTimeout(() => $('#practice-stage .question-stem')?.focus({ preventScroll: true }), 0);
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

function restoreExamState(qualId, unitId = '') {
  try {
    const raw = sessionStorage.getItem(EXAM_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (saved?.qual?.id !== qualId || saved.finished) return null;
    if (unitId && saved.unit?.id !== unitId) return null;
    return saved;
  } catch (error) {
    return null;
  }
}

function beginExamTimer() {
  if (!examState || examState.paused) return;
  clearInterval(examState.timer);
  examState.timer = setInterval(() => {
    if (!examState || examState.finished) return;
    if (Date.now() >= examState.endsAt) { toast('Time is up. Submitting the paper.'); submitExam(true); return; }
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
  const requestedUnit = routeParts().query.get('unit');
  const requestedIsPaper = Boolean(requestedUnit && formatFor(qual, requestedUnit) && unitQuestions(requestedUnit).length);
  if (!examState) {
    const saved = restoreExamState(qual.id, requestedUnit || '');
    if (saved) {
      examState = { ...saved, timer: null };
      if (!examState.paused && Date.now() >= examState.endsAt) {
        toast('Time is up. The paper was submitted.');
        submitExam(true);
        return;
      }
      beginExamTimer();
    }
  }
  if (examState && examState.qual.id === qual.id) {
    if (!examState.finished && !examState.timer && !examState.paused) beginExamTimer();
    if (requestedIsPaper && requestedUnit !== examState.unit.id) {
      // A named paper wins over one left in progress, but never silently.
      if (!examState.finished && !confirmPaperSwap(examState, qual, requestedUnit)) {
        syncExamUrl(examState);
        return renderExamQuestion();
      }
      abandonExam();
    } else {
      if (examState.finished) return renderExamResult();
      return renderExamQuestion();
    }
  }
  const config = DATA.examFormats[qual.id];
  if (!qualQuestions(qual).length) {
    $('#app').innerHTML = `<section class="exam-shell"><div class="shell"><div class="breadcrumb"><a href="${href('')}">Home</a><span>/</span><a href="${href(`qual/${qual.id}`)}">${esc(qual.id)}</a><span>/</span><span>Mock paper</span></div><div class="empty-card"><h1 class="empty-card-title">No mock paper for this qualification yet.</h1><p>The question bank for ${esc(qual.name)} is still being built. Read the syllabus or open the specification instead.</p><a class="button button-primary" href="${href(`learn/${qual.id}`)}">Open the syllabus</a></div></div></section>`;
    return;
  }
  if (!examState && requestedIsPaper) {
    startExam(qual, requestedUnit);
    return;
  }
  if (!config || !config.units.length) {
    $('#app').innerHTML = `<section class="exam-shell"><div class="shell"><div class="breadcrumb"><a href="${href('')}">Home</a><span>/</span><a href="${href(`qual/${qual.id}`)}">${esc(qual.id)}</a><span>/</span><span>Mock paper</span></div><div class="empty-card"><h1 class="empty-card-title">No mock paper for this qualification yet.</h1><p>${esc(config?.source || 'The source does not publish a multiple-choice format for this qualification.')}</p><a class="button button-primary" href="${href(`qual/${qual.id}`)}">Back to overview</a></div></div></section>`;
    return;
  }
  const confirmed = !/^unconfirmed|confirm against/i.test(config.source || '');
  const rows = config.units.map((format) => {
    const unit = unitById(format.unit);
    const available = unitQuestions(format.unit).length;
    const actual = Math.min(format.questions, available);
    const needed = requiredMarks(actual, format.pass_mark, format.pass_answers, format.questions);
    return `<tr><td data-label="Unit">${esc(unit?.name || format.unit)}</td><td data-label="Published">${format.questions}</td><td data-label="This mock"><strong>${actual}</strong>${available < format.questions ? ' <span class="pill">short bank</span>' : ''}</td><td data-label="Time">${format.minutes} min</td><td data-label="Pass">${format.pass_mark}% <span class="small-note">${actual ? `${needed}/${actual}` : '—'}</span></td><td data-label="Action"><button class="button button-primary button-small" type="button" data-start="${format.unit}" ${actual ? '' : 'disabled'}>${actual ? `Start ${esc(shortUnitName(format.unit, format.unit))}` : 'No questions yet'}</button></td></tr>`;
  }).join('');
  $('#app').innerHTML = `<section class="exam-shell"><div class="shell"><div class="breadcrumb"><a href="${href('')}">Home</a><span>/</span><a href="${href(`qual/${qual.id}`)}">${esc(qual.id)}</a><span>/</span><span>Mock paper</span></div><div class="exam-head"><div><p class="kicker">Mock paper</p><h1>Choose a paper.</h1><p>Choose a unit. The timer starts with the paper. Answers are not marked until you submit; the result shows unit and objective totals.</p><div class="exam-meta"><span class="pill">${config.units.length} paper${config.units.length === 1 ? '' : 's'}</span><span class="pill">No feedback until you submit</span><span class="pill">${confirmed ? 'Pass mark from the source' : 'Pass mark: format unconfirmed'}</span></div></div></div><div class="exam-warning">${esc(config.source)}. Where a question bank is shorter than the published paper, the mock shows the available count before you start. The bank is still in draft, so check the source before relying on an answer.</div><div class="side-card"><div class="table-scroll"><table class="source-list"><caption class="visually-hidden">Mock papers by unit</caption><thead><tr><th scope="col" style="text-align:left">Unit</th><th scope="col">Published</th><th scope="col">This mock</th><th scope="col">Time</th><th scope="col">Pass</th><th scope="col"><span class="visually-hidden">Action</span></th></tr></thead><tbody>${rows}</tbody></table></div><p class="small-note" style="margin-top:12px">${confirmed ? 'Time matches the published paper. The pass column shows the exact correct answers needed for the questions in this paper.' : 'The paper format for this qualification is unconfirmed. Treat the timer and pass mark as study settings.'} A short bank is labelled before you start.</p></div></div></section>`;
  $$('[data-start]').forEach((button) => button.addEventListener('click', () => startExam(qual, button.dataset.start)));
}

function startExam(qual, unitId) {
  const format = formatFor(qual, unitId);
  if (!format) return;
  if (examState && !examState.finished && (examState.qual.id !== qual.id || examState.unit.id !== unitId)) {
    if (!confirmPaperSwap(examState, qual, unitId)) return;
    abandonExam();
  }
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

function toggleExamPause() {
  if (!examState || examState.finished) return;
  if (examState.paused) {
    examState.endsAt = Date.now() + (examState.pausedRemaining || 0);
    examState.paused = false;
    examState.pausedRemaining = null;
    beginExamTimer();
  } else {
    examState.pausedRemaining = Math.max(0, examState.endsAt - Date.now());
    examState.paused = true;
    clearInterval(examState.timer);
    examState.timer = null;
  }
  saveExamState();
  renderExamQuestion();
  toast(examState.paused ? 'Timer paused.' : 'Timer resumed.');
}

function addExamTime() {
  if (!examState || examState.finished || examState.extraTime) return;
  examState.extraTime = true;
  if (examState.paused) examState.pausedRemaining = (examState.pausedRemaining || 0) + examState.format.minutes * 60 * 1000 * 0.25;
  else examState.endsAt += examState.format.minutes * 60 * 1000 * 0.25;
  saveExamState();
  renderExamQuestion();
  toast('25% extra time added.');
}

function abandonExam() {
  if (examState?.timer) clearInterval(examState.timer);
  examState = null;
  try { sessionStorage.removeItem(EXAM_KEY); } catch (error) {}
}

function syncExamUrl(state) {
  if (!state) return;
  const target = `#/exam/${state.qual.id}?unit=${state.unit.id}`;
  if (location.hash === target) return;
  try { history.replaceState(null, '', target); } catch (error) {}
}

function confirmPaperSwap(state, qual, nextUnitId) {
  const sameQual = state.qual.id === qual.id;
  const live = shortUnitName(state.unit.id, state.unit.name || state.unit.id) + (sameQual ? '' : ` (${state.qual.id})`);
  const wanted = shortUnitName(nextUnitId, nextUnitId) + (sameQual ? '' : ` (${qual.id})`);
  return window.confirm(`A ${live} paper is in progress. Start the ${wanted} paper instead? The answers on the current paper will be discarded.`);
}

function renderExamQuestion() {
  if (!examState) return;
  const { qual, format, unit, questions, index, answers } = examState;
  const q = questions[index];
  const selected = answers[q.id];
  const palette = questions.map((item, i) => `<button class="palette-button ${answers[item.id] !== undefined ? 'answered' : ''}" type="button" data-index="${i}" aria-current="${i === index ? 'true' : 'false'}" aria-label="Question ${i + 1}${answers[item.id] !== undefined ? ', answered' : ''}">${i + 1}</button>`).join('');
  const options = q.options.map((option, i) => `<button class="answer-option" type="button" data-exam-answer="${i}" aria-pressed="${selected === i}"><span class="answer-key">${String.fromCharCode(65 + i)}</span><span>${esc(option)}</span></button>`).join('');
  const timerText = examState.paused ? `PAUSED ${formatTime(examState.pausedRemaining)}` : formatTime(examState.endsAt - Date.now());
  $('#app').innerHTML = `<section class="exam-shell"><div class="shell"><div class="breadcrumb"><a href="${href('')}">Home</a><span>/</span><a href="${href(`qual/${qual.id}`)}">${esc(qual.id)}</a><span>/</span><span>Mock paper</span></div><div class="exam-head"><div><p class="kicker">${esc(unit.name)}</p><h1>${esc(questions.length)}-question mock paper.</h1><div class="exam-meta"><span class="pill timer" id="exam-timer" ${examState.paused ? 'data-paused="true"' : ''}>${timerText}</span><span class="pill">${format.pass_mark}% mock pass · ${requiredMarks(questions.length, format.pass_mark, format.pass_answers, format.questions)}/${questions.length}${examState.confirmed ? '' : ' · format unconfirmed'}</span><span class="pill">${questions.length} available${questions.length < format.questions ? ` · ${format.questions - questions.length} short` : ''}</span></div></div><div class="exam-head-actions"><button class="button button-ghost button-small" type="button" id="pause-exam">${examState.paused ? 'Resume timer' : 'Pause timer'}</button><button class="button button-ghost button-small" type="button" id="extra-exam" ${examState.extraTime ? 'disabled' : ''}>+25% time</button><button class="button button-ghost button-small" type="button" id="abandon-exam">Abandon paper</button><button class="button button-danger" type="button" id="submit-exam">Submit paper</button></div></div><div class="exam-layout"><div><div class="question-card"><div class="question-card-inner"><div class="question-top"><span class="meta"><strong>Question ${index + 1} of ${questions.length}</strong></span><span class="meta">No feedback until submission</span></div><h2 class="question-stem" tabindex="-1">${esc(q.stem)}</h2><div class="answer-list" role="group" aria-label="Answer options">${options}</div><div class="exam-actions"><button class="button button-ghost" type="button" id="prev-exam" ${index === 0 ? 'disabled' : ''}>← Previous</button><button class="button button-primary" type="button" id="next-exam">${index + 1 === questions.length ? 'Submit paper' : 'Next question →'}</button></div><p class="exam-note">Answers are not saved as study progress until you submit. The timer runs for the paper length shown above.</p></div></div></div><aside class="exam-palette"><h2>Question map</h2><div class="palette-grid">${palette}</div><p class="exam-note">${Object.keys(answers).length} of ${questions.length} answered</p><button class="button button-ghost" type="button" id="submit-exam-side" style="width:100%;margin-top:12px">Submit paper</button></aside></div></div></section>`;
  $$('[data-exam-answer]').forEach((button) => button.addEventListener('click', () => {
    examState.answers[q.id] = Number(button.dataset.examAnswer);
    renderExamQuestion();
    setTimeout(() => $('#next-exam')?.focus(), 0);
  }));
  $$('[data-index]').forEach((button) => button.addEventListener('click', () => { examState.index = Number(button.dataset.index); renderExamQuestion(); }));
  $('#prev-exam')?.addEventListener('click', () => { examState.index = Math.max(0, examState.index - 1); renderExamQuestion(); });
  $('#next-exam')?.addEventListener('click', () => { if (examState.index + 1 < questions.length) { examState.index += 1; renderExamQuestion(); } else { submitExam(); } });
  $('#submit-exam')?.addEventListener('click', () => submitExam());
  $('#submit-exam-side')?.addEventListener('click', () => submitExam());
  $('#pause-exam')?.addEventListener('click', toggleExamPause);
  $('#extra-exam')?.addEventListener('click', addExamTime);
  $('#abandon-exam')?.addEventListener('click', () => {
    if (!window.confirm('Abandon this paper? The answers on it will not be recorded.')) return;
    const target = `#/exam/${qual.id}`;
    abandonExam();
    if (location.hash === target) renderExam(qual.id);
    else location.hash = target;
  });
  saveExamState();
  setTimeout(() => $('#app .question-stem')?.focus({ preventScroll: true }), 0);
}

function askConfirm({ title, message, confirmLabel = 'Continue' }) {
  const dialog = $('#confirm-dialog');
  if (!dialog) return Promise.resolve(window.confirm(message));
  $('#confirm-title').textContent = title;
  $('#confirm-message').textContent = message;
  $('#confirm-ok').textContent = confirmLabel;
  dialog.returnValue = '';
  return new Promise((resolve) => {
    const onClose = () => {
      dialog.removeEventListener('close', onClose);
      resolve(dialog.returnValue === 'confirm');
    };
    dialog.addEventListener('close', onClose);
    dialog.showModal();
    $('#confirm-cancel')?.focus();
  });
}

async function submitExam(force = false) {
  if (!examState || examState.finished) return;
  if (force) {
    const dialog = $('#confirm-dialog');
    if (dialog?.open) dialog.close();
  }
  const unanswered = examState.questions.length - Object.keys(examState.answers).length;
  const message = unanswered > 0
    ? `You have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. They will be marked wrong.`
    : 'You cannot change your answers after this.';
  if (!force) {
    const ok = await askConfirm({ title: 'Submit paper?', message, confirmLabel: 'Submit paper' });
    if (!ok || !examState || examState.finished) return;
  }
  clearInterval(examState.timer);
  examState.finished = true;
  try { sessionStorage.removeItem(EXAM_KEY); } catch (error) {}
  const marked = markPaper(examState.questions, examState.answers);
  const at = new Date().toISOString();
  marked.records.forEach((record) => {
    store.answers[record.id] = { selected: record.selected, correct: record.correct, at, exam: true };
  });
  const attempt = { id: `attempt-${Date.now()}`, qual: examState.qual.id, unit: examState.unit.id, correct: marked.correct, total: marked.total, date: at, passMark: examState.format.pass_mark, questionIds: examState.questions.map((q) => q.id), answers: { ...examState.answers } };
  store.attempts.unshift(attempt);
  store.attempts = store.attempts.slice(0, 50);
  saveStore();
  renderExamResult();
}

function renderExamResult() {
  if (!examState) return;
  const { qual, unit, questions, answers } = examState;
  // The paper is over, so drop the paper from the address bar. A reload then
  // shows the paper chooser instead of silently starting a fresh paper.
  try { if (location.hash !== `#/exam/${qual.id}`) history.replaceState(null, '', `#/exam/${qual.id}`); } catch (error) {}
  const marked = markPaper(questions, answers);
  const correct = marked.correct;
  const pct = Math.round((correct / questions.length) * 100);
  const needed = requiredMarks(questions.length, examState.format.pass_mark, examState.format.pass_answers, examState.format.questions);
  const passed = hasPassed(correct, questions.length, examState.format.pass_mark, examState.format.pass_answers, examState.format.questions);
  const unitRows = Object.entries(marked.byUnit).map(([id, value]) => `<li><span>${esc(unitById(id)?.name || id)}</span><span>${value.correct}/${value.total}</span></li>`).join('');
  const objectiveEntries = Object.entries(marked.byObjective).sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total));
  const objectiveRows = objectiveEntries.filter(([, value]) => value.correct < value.total).slice(0, 6).map(([id, value]) => {
    const obj = objectiveFor({ objective_id: id });
    return `<li><span>${esc(shortObjective(obj?.objective.text || id, 180))}</span><span>${value.correct}/${value.total}</span></li>`;
  }).join('');
  const allObjectiveRows = objectiveEntries.filter(([, value]) => value.correct < value.total).map(([id, value]) => {
    const obj = objectiveFor({ objective_id: id });
    return `<li><span>${esc(shortObjective(obj?.objective.text || id, 180))}</span><span>${value.correct}/${value.total}</span></li>`;
  }).join('');
  const revisitCount = objectiveEntries.filter(([, value]) => value.correct < value.total).length;
  const review = questions.map((q, i) => {
    const selected = answers[q.id];
    const ok = selected === q.answer_index;
    return `<div class="review-item"><h3>${i + 1}. ${esc(q.stem)}</h3><p class="${ok ? 'review-answer' : 'review-wrong'}">${ok ? 'Correct' : `Your answer: ${selected === undefined ? 'not answered' : esc(q.options[selected])}`}</p>${ok ? '' : `<p>Correct answer: ${esc(q.options[q.answer_index])}</p>`}<p>${esc(q.explanation)}</p></div>`;
  }).join('');
  $('#app').innerHTML = `<section class="exam-shell"><div class="shell"><div class="result-head"><div class="score-ring" style="--score:${pct}"><strong>${pct}%</strong><span>${correct} of ${questions.length}</span></div><div class="result-copy"><p class="kicker">${esc(unit.name)} · mock result</p><h1>${passed ? 'Above the mock pass mark.' : 'Below the mock pass mark.'}</h1><p>${passed ? `This attempt is above the ${examState.format.pass_mark}% pass mark used for this mock (${needed} of ${questions.length}).` : `This mock uses a ${examState.format.pass_mark}% pass mark: ${needed} of ${questions.length}. Review the paper and the objectives below.`}${questions.length < examState.format.questions ? ` This paper had ${questions.length} of the ${examState.format.questions} published questions, so the result is not comparable with an SIA exam result.` : ''}${examState.confirmed ? '' : ' The paper format is unconfirmed, so this is not a published exam result.'} Draft questions; this is not an SIA assessment.</p><div class="question-foot"><a class="button button-primary" href="${href(`practice/${qual.id}?unit=${unit.id}`)}">Practice this unit</a><button class="button button-ghost" type="button" id="clear-exam">Choose another paper</button></div></div></div><div class="result-grid"><div class="result-block"><h2>By unit</h2><ul class="breakdown-list">${unitRows}</ul><h2 style="margin-top:22px">Objectives to revisit</h2>${revisitCount ? `<p class="small-note">${Math.min(6, revisitCount)} of ${revisitCount} objectives shown.</p><ul class="breakdown-list">${objectiveRows}</ul>${revisitCount > 6 ? `<details class="objective-details"><summary>Show all ${revisitCount} objectives</summary><ul class="breakdown-list">${allObjectiveRows}</ul></details>` : ''}` : '<p>No objectives to revisit. Every marked answer was correct.</p>'}</div><div class="result-block"><h2>Next step</h2>${revisitCount ? `<p>Questions you answered incorrectly are saved for review. The paper review below shows the correct answer and explanation for every question.</p><a class="text-link" href="${href('weak')}">Open weak spots →</a>` : `<p>You answered every question correctly. Try another paper or return to the syllabus to keep the material fresh.</p><a class="text-link" href="${href(`practice/${qual.id}?unit=${unit.id}`)}">Practice this unit again →</a>`}</div></div><div class="review-list"><div class="section-heading"><div><p class="section-label">Review</p><h2>Every question.</h2></div><p>Explanations and source quotations are in practice mode. Open the syllabus if you need more context.</p></div>${review}</div></div></section>`;
  $('#clear-exam')?.addEventListener('click', () => { abandonExam(); renderExam(qual.id); });
  setTimeout(normaliseLandmarks, 0);
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
  const rows = byQual.map(({ qual, count }) => {
    const unitCount = qualUnits(qual).filter((u) => qualQuestions(qual).some((q) => q.unit === u.id && wrongIds.includes(q.id))).length;
    return `<div class="list-row"><div><h3>${esc(qual.name)}</h3><p>${count} missed question${count === 1 ? '' : 's'} across ${unitCount} unit${unitCount === 1 ? '' : 's'}.</p></div><div class="list-row-actions"><a class="button button-primary button-small" href="${href(`practice/${qual.id}?mode=weak`)}">Drill missed questions</a><a class="button button-ghost button-small" href="${href(`qual/${qual.id}`)}">Open qualification</a></div></div>`;
  }).join('');
  $('#app').innerHTML = `<section class="page-head"><div class="shell"><div class="breadcrumb"><a href="${href('')}">Home</a><span>/</span><span>Weak spots</span></div><div class="page-head-grid"><div><p class="kicker">Weak spots</p><h1>Questions to work on.</h1><p>Questions you answered incorrectly are stored in this browser. Drill them, then return to the syllabus or try another practice set.</p></div><aside class="page-head-aside"><dl class="qual-stats"><div><dt>Missed</dt><dd>${wrong.length}</dd></div><div><dt>Qualifications</dt><dd>${byQual.length}</dd></div></dl>${byQual[0] ? `<a class="button button-primary" href="${href(`practice/${byQual[0].qual.id}?mode=weak`)}">Drill ${esc(byQual[0].qual.name)} questions</a>` : ''}</aside></div></div></section><section class="page-section"><div class="shell">${rows ? `<div class="list-page">${rows}</div>` : `<div class="empty-card"><h2>Nothing to drill yet.</h2><p>Practice a set or submit a mock paper. Questions you answer incorrectly will appear here.</p><a class="button button-primary" href="${href('practice/DS')}">Start practice</a></div>`}</div></section>`;
}

function renderReports() {
  setActiveNav('');
  const rows = store.reports.map((r) => `<div class="list-row"><div><h3>${esc(r.questionId)}</h3><p>${esc(r.reason)} · ${esc(new Date(r.at).toLocaleString())}${r.note ? ` · ${esc(r.note)}` : ''}</p></div><div class="list-row-actions"><span class="pill">${esc(r.unit || '')}</span></div></div>`).join('');
  const attemptRows = store.attempts.slice(0, 8).map((attempt) => {
    const score = attempt.total ? Math.round((attempt.correct / attempt.total) * 100) : 0;
    return `<div class="list-row"><div><h3>${esc(attempt.qual)} · ${esc(shortUnitName(attempt.unit, attempt.unit))}</h3><p>${score}% · ${attempt.correct}/${attempt.total} · ${esc(new Date(attempt.date).toLocaleString())}</p></div><div class="list-row-actions"><span class="pill">${score >= (attempt.passMark || 70) ? 'above pass mark' : 'below pass mark'}</span></div></div>`;
  }).join('');
  $('#app').innerHTML = `<section class="page-head"><div class="shell"><div class="breadcrumb"><a href="${href('')}">Home</a><span>/</span><span>Question reports</span></div><div class="page-head-grid"><div><p class="kicker">Question quality</p><h1>Question reports.</h1><p>Reports stay in this browser until you export them. Nothing is sent anywhere automatically. Export the JSON if you want to keep or share a copy.</p></div><aside class="page-head-aside"><dl class="qual-stats"><div><dt>Saved reports</dt><dd>${store.reports.length}</dd></div><div><dt>Storage</dt><dd>Local</dd></div></dl><button class="button button-primary" type="button" id="export-reports" ${store.reports.length ? '' : 'disabled'}>Export JSON</button><button class="button button-ghost" type="button" id="clear-reports" ${store.reports.length ? '' : 'disabled'} style="margin-top:8px">Clear reports</button></aside></div></div></section><section class="page-section"><div class="shell">${rows ? `<div class="list-page">${rows}</div>` : '<div class="empty-card"><h2>Nothing reported.</h2><p>Use “Report an issue” under any practice question.</p></div>'}</div></section><section class="page-section"><div class="shell"><div class="section-heading"><div><h2>Recent mock attempts.</h2></div><p>Stored in this browser. The review list only keeps the questions you answered incorrectly.</p></div>${attemptRows ? `<div class="list-page">${attemptRows}</div>` : '<p class="empty-note">No mock attempts yet.</p>'}</div></section>`;
  $('#export-reports')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(store.reports, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'shiftready-question-reports.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Report export downloaded.');
  });
  $('#clear-reports')?.addEventListener('click', () => {
    if (!window.confirm('Clear all local reports? This cannot be undone.')) return;
    store.reports = [];
    store.reportsClearedAt = new Date().toISOString();
    saveStore();
    renderReports();
    toast('Reports cleared.');
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
  const sources = [];
  const seen = new Set();
  for (const unit of Object.values(DATA.syllabus.units)) {
    for (const session of unit.sessions) {
      const source = session.source;
      if (!source?.url || seen.has(source.url)) continue;
      seen.add(source.url);
      sources.push(source);
    }
  }
  sources.sort((a, b) => String(a.doc_title || '').localeCompare(String(b.doc_title || '')));
  const sourceRows = sources.map((source) => `<li><a href="${esc(source.url)}" target="_blank" rel="noreferrer">${esc(source.doc_title || source.doc_id)}</a></li>`).join('');
  $('#app').innerHTML = `<section class="page-head"><div class="shell"><div class="breadcrumb"><a href="${href('')}">Home</a><span>/</span><span>About the sources</span></div><div class="page-head-grid"><div><p class="kicker">Open Government Licence</p><h1>Where the material comes from.</h1><p>The syllabus map and question bank are built from SIA specifications published on GOV.UK. Each practice answer names the specification it came from. Where the wording matches the linked PDF it is shown as a quotation; otherwise it is a reference to check. The specification is always the authority.</p></div><aside class="page-head-aside"><p class="small-note">Content reviewed 11 November 2026. Check the SIA for a newer specification before relying on a fact.</p></aside></div></div></section><section class="page-section"><div class="shell legal-copy"><h2>Specifications used</h2><ul class="source-index">${sourceRows}</ul><h2>Attribution</h2><p>Contains public sector information licensed under the Open Government Licence v3.0. Sources include the Security Industry Authority, Home Office, legislation.gov.uk, Health and Safety Executive and Information Commissioner’s Office. The current question bank draws on those sources. This site is not endorsed by or affiliated with the SIA or any awarding organisation.</p><h2>What is in scope</h2><p>The syllabus map covers the SIA licence-linked specifications in this site: Door Supervisor, Security Officer, CCTV, Close Protection, CViT and the 2024/2025 refresher specifications. Shared units are stored once and tagged to every qualification they serve.</p><h2>Law and jurisdiction</h2><p>The questions describe England and Wales law. Arrest powers, licensing and some first-aid duties differ in Scotland and Northern Ireland. Check the law that applies where you work before relying on an answer.</p><h2>What is not in scope</h2><p>This build does not copy questions or wording from awarding organisation sample papers or commercial mock-test sites. It does not teach physical intervention techniques. It does not replace the SIA specification, the awarding organisation’s assessment materials, or a qualified trainer.</p><h2>Question status</h2><p>All current questions are drafts. Some are flagged for priority human review, but the semantic grounding check has not been run and a flag is not an approval. Do not treat any question as an official exam question. If a question looks wrong, report it from practice mode and export the report JSON.</p></div></section>`;
}

function openReport(questionId) {
  const q = questionById(questionId);
  const dialog = $('#report-dialog');
  if (!q || !dialog) return;
  $('#report-question').textContent = q.stem;
  $('#report-reason').value = '';
  $('#report-note').value = '';
  $('#report-reason').removeAttribute('aria-invalid');
  const error = $('#report-reason-error');
  if (error) error.hidden = true;
  dialog.dataset.question = questionId;
  dialog.returnValue = '';
  dialog.showModal();
}

function setupDialogFocus(dialog) {
  if (!dialog) return;
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const focusable = $$('button, select, textarea, input, a[href]', dialog).filter((node) => !node.disabled && !node.hidden && node.getClientRects().length);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

function setupReportDialog() {
  const dialog = $('#report-dialog');
  if (!dialog) return;
  setupDialogFocus(dialog);
  $('#report-reason')?.addEventListener('change', () => {
    const error = $('#report-reason-error');
    if (error) error.hidden = true;
    $('#report-reason')?.removeAttribute('aria-invalid');
  });
  $('#report-form').addEventListener('submit', (event) => {
    if (event.submitter?.value === 'cancel') return;
    event.preventDefault();
    const reason = $('#report-reason').value;
    const error = $('#report-reason-error');
    if (!reason) {
      $('#report-reason').setAttribute('aria-invalid', 'true');
      if (error) error.hidden = false;
      $('#report-reason').focus();
      return;
    }
    const q = questionById(dialog.dataset.question);
    store.reports.unshift({ questionId: dialog.dataset.question, unit: q?.unit || '', reason, note: $('#report-note').value.trim(), at: new Date().toISOString() });
    saveStore();
    dialog.close();
    $('#report-note').value = '';
    $('#report-reason').value = '';
    $('#report-reason').removeAttribute('aria-invalid');
    if (error) error.hidden = true;
    toast('Report saved locally. Export it from Question reports.');
  });
}

function setupMobileMenu() {
  const button = $('#mobile-menu');
  const nav = $('#main-nav');
  if (!button || !nav) return;
  const links = $$('a', nav);
  const closeMenu = (restoreFocus = true) => {
    button.setAttribute('aria-expanded', 'false'); button.textContent = 'Menu';
    nav.classList.remove('mobile-open'); document.body.classList.remove('menu-open');
    if (restoreFocus) button.focus({ preventScroll: true });
  };
  const openMenu = () => {
    button.setAttribute('aria-expanded', 'true');
    button.textContent = 'Close';
    nav.classList.add('mobile-open');
    document.body.classList.add('menu-open');
    setTimeout(() => links[0]?.focus({ preventScroll: true }), 0);
  };
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    if (open) openMenu(); else closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (!nav.classList.contains('mobile-open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [button, ...links];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!nav.classList.contains('mobile-open')) return;
    if (nav.contains(event.target) || button.contains(event.target)) return;
    closeMenu(false);
  });
  links.forEach((link) => link.addEventListener('click', () => closeMenu(false)));
  window.addEventListener('hashchange', () => closeMenu(false));
}

function setupSkipLink() {
  const link = $('.skip-link');
  const main = $('#app');
  if (!link || !main) return;
  link.addEventListener('click', (event) => {
    event.preventDefault();
    main.focus({ preventScroll: true });
    main.scrollIntoView();
  });
}

function setupTheme() {
  let saved = null;
  try { saved = localStorage.getItem('theme'); } catch (error) {}
  setTheme(saved === 'dark' || saved === 'light' ? saved : null, false);
  $('#theme-toggle')?.addEventListener('click', () => setTheme(currentTheme() === 'dark' ? 'light' : 'dark'));
  let textSize = '100';
  try { textSize = localStorage.getItem('textSize') || '100'; } catch (error) {}
  if (!['100', '112', '125'].includes(textSize)) textSize = '100';
  document.documentElement.dataset.textSize = textSize;
}

function setupSettings() {
  const dialog = $('#settings-dialog');
  const button = $('#settings-toggle');
  if (!dialog || !button) return;
  setupDialogFocus(dialog);
  let storedTheme = 'system';
  try { storedTheme = localStorage.getItem('theme') || 'system'; } catch (error) {}
  button.addEventListener('click', () => {
    const theme = $('#settings-theme');
    const text = $('#settings-text');
    if (theme) theme.value = ['dark', 'light'].includes(storedTheme) ? storedTheme : 'system';
    if (text) text.value = document.documentElement.dataset.textSize || '100';
    dialog.showModal();
  });
  $('#settings-theme')?.addEventListener('change', (event) => {
    const value = event.target.value;
    storedTheme = value;
    setTheme(value === 'system' ? null : value);
  });
  $('#settings-text')?.addEventListener('change', (event) => {
    const value = event.target.value;
    document.documentElement.dataset.textSize = value;
    try { localStorage.setItem('textSize', value); } catch (error) {}
  });
  $('#reset-progress')?.addEventListener('click', () => {
    if (!window.confirm('Reset all progress, reports and checklist ticks in this browser? This cannot be undone.')) return;
    try {
      localStorage.removeItem(storageKey);
      sessionStorage.removeItem(EXAM_KEY);
      sessionStorage.removeItem(PRACTICE_KEY);
    } catch (error) {}
    dialog.close();
    location.reload();
  });
}

async function loadData() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  const load = async (url, optional = false) => {
    const full = `${url}?v=${DATA_VERSION}`;
    try {
      const res = await fetch(full, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (error) {
      if (optional) return null;
      throw new Error(`${full}: ${error.name === 'AbortError' ? 'timed out' : error.message}`);
    }
  };
  try {
    const [syllabus, examFormats, questions, checklists] = await Promise.all([
      load('./data/syllabus.json'),
      load('./data/exam_formats.json'),
      load('./data/questions.json'),
      load('./data/checklists.json', true)
    ]);
    if (!Array.isArray(questions)) throw new Error('./data/questions.json: expected an array');
    DATA = { syllabus, examFormats, questions, checklists: checklists || {} };
  } finally {
    clearTimeout(timeout);
  }
}

function normaliseLandmarks() {
  $$('#app aside').forEach((node, index) => {
    node.setAttribute('role', 'region');
    if (!node.hasAttribute('aria-label')) {
      const heading = node.querySelector('h1, h2, h3, .mini-label');
      node.setAttribute('aria-label', heading?.textContent?.trim() || `Page details ${index + 1}`);
    }
  });
}

function render() {
  if (!DATA) return;
  setTimeout(normaliseLandmarks, 0);
  const { path } = routeParts();
  const [section, id] = path;
  const labels = { '': 'Home', qual: 'Qualification overview', learn: 'Syllabus', practice: 'Practice', exam: 'Mock paper', checklists: 'Practical checklist', weak: 'Weak spots', reports: 'Question reports', about: 'About the sources' };
  const qual = id ? qualById(id) : null;
  document.title = `${labels[section || ''] || 'Page not found'}${qual ? ` · ${qual.id}` : ''} · ShiftReady`;
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
  setupSettings();
  setupSkipLink();
  setupMobileMenu();
  setupReportDialog();
  setupDialogFocus($('#confirm-dialog'));
  try {
    await loadData();
    render();
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  } catch (error) {
    $('#app').innerHTML = `<section class="page-section"><div class="shell"><div class="empty-card"><h1>The study data could not load.</h1><p>${esc(error.message)}</p><p>Check your connection, then try again.</p><button class="button button-primary" type="button" id="retry-load">Try again</button></div></div></section>`;
    $('#retry-load')?.addEventListener('click', () => location.reload());
  }
}

window.addEventListener('hashchange', () => {
  // A modal left open across a route change would sit over the wrong page and,
  // for the submit dialog, resolve against an exam that no longer exists.
  $$('dialog[open]').forEach((dialog) => dialog.close());
  const parts = routeParts();
  const examQual = parts.path[0] === 'exam' ? parts.path[1] : null;
  if (examState && !examQual) { clearInterval(examState.timer); examState = null; }
  else if (examState && examQual !== examState.qual.id) { clearInterval(examState.timer); examState.timer = null; }
  render();
  $('#app')?.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'auto' });
});

window.addEventListener('beforeunload', () => { if (examState?.timer) clearInterval(examState.timer); });

init();
