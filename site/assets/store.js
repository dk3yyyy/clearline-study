/* Progress store merging.
   Every tab keeps its own in-memory copy of the store and writes the whole
   object back on every change. With two tabs open, the second tab's answers
   were erased by the first tab's next save. Merge on write instead of
   overwriting, keeping the newest answer per question and the union of the
   rest.
   No DOM and no storage, so tests/store.test.mjs can import this directly. */

const timeOf = (entry) => Date.parse(entry?.at || entry?.date || '') || 0;

export function mergeStore(local, remote) {
  const mine = local || {};
  const theirs = remote || {};

  const answers = { ...(theirs.answers || {}) };
  for (const [id, entry] of Object.entries(mine.answers || {})) {
    const other = answers[id];
    if (!other) { answers[id] = entry; continue; }
    if (timeOf(entry) >= timeOf(other)) answers[id] = entry;
  }

  const attemptsById = new Map();
  const remoteAttempts = Array.isArray(theirs.attempts) ? theirs.attempts : [];
  const localAttempts = Array.isArray(mine.attempts) ? mine.attempts : [];
  for (const attempt of [...remoteAttempts, ...localAttempts]) {
    if (attempt?.id) attemptsById.set(attempt.id, attempt);
  }
  const attempts = [...attemptsById.values()]
    .sort((a, b) => timeOf(b) - timeOf(a))
    .slice(0, 50);

  const seenReports = new Set();
  const clearedAt = Math.max(
    Date.parse(mine.reportsClearedAt || '') || 0,
    Date.parse(theirs.reportsClearedAt || '') || 0
  );
  const reports = [...(Array.isArray(mine.reports) ? mine.reports : []), ...(Array.isArray(theirs.reports) ? theirs.reports : [])]
    .filter((report) => {
      if (!report || timeOf(report) <= clearedAt) return false;
      const key = `${report.questionId}|${report.at}`;
      if (seenReports.has(key)) return false;
      seenReports.add(key);
      return true;
    })
    .sort((a, b) => timeOf(b) - timeOf(a));

  return {
    ...theirs,
    ...mine,
    answers,
    attempts,
    reports,
    reportsClearedAt: clearedAt ? new Date(clearedAt).toISOString() : '',
    // A flag set in either tab stays set. Turning one off in the tab that is
    // saving wins, because that is the most recent deliberate action.
    studied: { ...(theirs.studied || {}), ...(mine.studied || {}) },
    checklist: { ...(theirs.checklist || {}), ...(mine.checklist || {}) }
  };
}
