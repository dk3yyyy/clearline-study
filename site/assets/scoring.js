/* Pure marking rules for the study app.
   No DOM and no storage, so tests/scoring.test.mjs can import this file directly.
   Loaded by app.js; bump the ?v= in that import when this file changes. */

/* Awarding organisations publish the pass as a mark, not a rounded percentage.
   50/72 is 69.4%, which rounds to 69 and would fail if compared as a percentage. */
export function requiredMarks(total, passMark) {
  if (!total) return 0;
  return Math.min(total, Math.max(1, Math.round((total * passMark) / 100)));
}

/* Mark a paper. Only answered questions become records, because a blank answer
   is not evidence of study: storing it inflated progress and filled the review
   list with questions the learner never attempted. Unit and objective totals
   still count the whole paper, blanks included. */
export function markPaper(questions, answers = {}) {
  const records = [];
  const byUnit = {};
  const byObjective = {};
  let correct = 0;

  for (const question of questions || []) {
    const raw = answers[question.id];
    const answered = raw !== undefined && raw !== null;
    const isCorrect = answered && raw === question.answer_index;
    if (isCorrect) correct += 1;
    if (answered) records.push({ id: question.id, selected: raw, correct: isCorrect });

    if (question.unit) {
      if (!byUnit[question.unit]) byUnit[question.unit] = { correct: 0, total: 0 };
      byUnit[question.unit].total += 1;
      if (isCorrect) byUnit[question.unit].correct += 1;
    }
    if (question.objective_id) {
      if (!byObjective[question.objective_id]) byObjective[question.objective_id] = { correct: 0, total: 0 };
      byObjective[question.objective_id].total += 1;
      if (isCorrect) byObjective[question.objective_id].correct += 1;
    }
  }

  return { correct, total: (questions || []).length, records, byUnit, byObjective };
}

/* Did a paper pass, using the published mark rather than a rounded percentage. */
export function hasPassed(correct, total, passMark) {
  return correct >= requiredMarks(total, passMark);
}
