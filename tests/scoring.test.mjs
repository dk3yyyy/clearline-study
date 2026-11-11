import test from 'node:test';
import assert from 'node:assert/strict';
import { requiredMarks, markPaper, hasPassed } from '../site/assets/scoring.js';

const question = (id, answer_index, unit = 'U1-COMMON', objective_id = 'U1-COMMON-S1-O1') => ({
  id, answer_index, unit, objective_id
});

test('requiredMarks matches the published mark for every confirmed paper', () => {
  const papers = [
    ['U1 common', 72, 70, 50],
    ['DS unit 2', 50, 70, 35],
    ['SO unit 2', 60, 70, 42],
    ['CCTV unit 2', 40, 70, 28],
    ['U3 conflict', 20, 70, 14],
    ['U4 physical intervention', 30, 80, 24]
  ];
  for (const [name, total, passMark, mark] of papers) {
    assert.equal(requiredMarks(total, passMark), mark, name);
  }
});

test('requiredMarks rounds down where the awarding organisation does', () => {
  // 70% of 72 is 50.4. Pearson publishes 50/72, so Math.ceil would be wrong.
  assert.equal(requiredMarks(72, 70), 50);
  assert.notEqual(requiredMarks(72, 70), Math.ceil((72 * 70) / 100));
});

test('requiredMarks handles empty and short papers', () => {
  assert.equal(requiredMarks(0, 70), 0);
  assert.equal(requiredMarks(1, 70), 1);
  assert.equal(requiredMarks(3, 100), 3);
});

test('a paper at the published mark passes, one mark below fails', () => {
  assert.equal(hasPassed(50, 72, 70), true);
  assert.equal(hasPassed(49, 72, 70), false);
  assert.equal(hasPassed(28, 40, 70), true);
  assert.equal(hasPassed(27, 40, 70), false);
  assert.equal(hasPassed(24, 30, 80), true);
  assert.equal(hasPassed(23, 30, 80), false);
});

test('50 out of 72 is 69% and still a pass', () => {
  assert.equal(Math.round((50 / 72) * 100), 69);
  assert.equal(hasPassed(50, 72, 70), true);
});

test('markPaper records only answered questions', () => {
  const questions = [question('q1', 1), question('q2', 2), question('q3', 0)];
  const marked = markPaper(questions, { q1: 1 });
  assert.equal(marked.total, 3);
  assert.equal(marked.correct, 1);
  assert.deepEqual(marked.records, [{ id: 'q1', selected: 1, correct: true }]);
});

test('markPaper treats null as unanswered', () => {
  const marked = markPaper([question('q1', 1)], { q1: null });
  assert.deepEqual(marked.records, []);
  assert.equal(marked.correct, 0);
  assert.equal(marked.total, 1);
});

test('markPaper records wrong answers', () => {
  const marked = markPaper([question('q1', 1)], { q1: 3 });
  assert.deepEqual(marked.records, [{ id: 'q1', selected: 3, correct: false }]);
  assert.equal(marked.correct, 0);
});

test('markPaper keeps option A: an answer of 0 is a real answer', () => {
  const marked = markPaper([question('q1', 0)], { q1: 0 });
  assert.deepEqual(marked.records, [{ id: 'q1', selected: 0, correct: true }]);
  assert.equal(marked.correct, 1);
});

test('markPaper counts blanks in unit and objective totals', () => {
  const questions = [
    question('q1', 1, 'U1-COMMON', 'o1'),
    question('q2', 1, 'DS-U2', 'o2'),
    question('q3', 1, 'DS-U2', 'o2')
  ];
  const marked = markPaper(questions, { q2: 1 });
  assert.deepEqual(marked.byUnit, {
    'U1-COMMON': { correct: 0, total: 1 },
    'DS-U2': { correct: 1, total: 2 }
  });
  assert.deepEqual(marked.byObjective, {
    o1: { correct: 0, total: 1 },
    o2: { correct: 1, total: 2 }
  });
});

test('markPaper survives an empty paper or missing answers object', () => {
  assert.deepEqual(markPaper([], {}), { correct: 0, total: 0, records: [], byUnit: {}, byObjective: {} });
  assert.deepEqual(markPaper([question('q1', 1)]).records, []);
});
