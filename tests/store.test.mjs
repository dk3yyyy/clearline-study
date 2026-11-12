import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeStore } from '../site/assets/store.js';

const answer = (selected, correct, at) => ({ selected, correct, at });

test('answers from both tabs survive a merge', () => {
  const a = { answers: { q1: answer(1, true, '2026-01-01T10:00:00.000Z') } };
  const b = { answers: { q2: answer(2, false, '2026-01-01T10:01:00.000Z') } };
  assert.deepEqual(Object.keys(mergeStore(a, b).answers).sort(), ['q1', 'q2']);
});

test('the newer answer wins for the same question', () => {
  const older = { answers: { q1: answer(1, true, '2026-01-01T10:00:00.000Z') } };
  const newer = { answers: { q1: answer(3, false, '2026-01-01T11:00:00.000Z') } };
  assert.equal(mergeStore(newer, older).answers.q1.selected, 3);
  assert.equal(mergeStore(older, newer).answers.q1.selected, 3);
});

test('an answer without a timestamp does not beat a dated one', () => {
  const dated = { answers: { q1: answer(1, true, '2026-01-01T10:00:00.000Z') } };
  const undated = { answers: { q1: answer(2, false) } };
  assert.equal(mergeStore(undated, dated).answers.q1.selected, 1);
  assert.equal(mergeStore(dated, undated).answers.q1.selected, 1);
});

test('a save from a stale tab cannot wipe answers it never saw', () => {
  // Tab A loaded before tab B answered. A still holds only q1.
  const tabA = { answers: { q1: answer(1, true, '2026-01-01T10:00:00.000Z') } };
  const tabB = { answers: { q1: answer(1, true, '2026-01-01T10:00:00.000Z'), q2: answer(0, true, '2026-01-01T10:05:00.000Z') } };
  const merged = mergeStore(tabA, tabB);
  assert.deepEqual(Object.keys(merged.answers).sort(), ['q1', 'q2']);
});

test('attempts are unioned, newest first, capped at 50', () => {
  const make = (i) => ({ id: 'attempt-' + i, correct: i, total: 20, date: new Date(2026, 0, 1, 0, i).toISOString() });
  const a = { attempts: [make(1), make(2)] };
  const b = { attempts: [make(2), make(3)] };
  const merged = mergeStore(a, b);
  assert.deepEqual(merged.attempts.map((x) => x.id), ['attempt-3', 'attempt-2', 'attempt-1']);

  const many = Array.from({ length: 60 }, (_, i) => ({ id: 'attempt-' + i, date: new Date(2026, 0, 1, 0, 0, i).toISOString() }));
  assert.equal(mergeStore({ attempts: many }, { attempts: [] }).attempts.length, 50);
});

test('reports deduplicate on question and time', () => {
  const report = { questionId: 'q1', at: '2026-01-01T10:00:00.000Z', reason: 'typo' };
  const merged = mergeStore({ reports: [report] }, { reports: [report] });
  assert.equal(merged.reports.length, 1);
});

test('studied and checklist flags union; the saving tab wins a conflict', () => {
  const a = { studied: { o1: true, o2: false }, checklist: { c1: true } };
  const b = { studied: { o1: false, o3: true }, checklist: { c2: true } };
  const merged = mergeStore(a, b);
  assert.deepEqual(merged.studied, { o1: true, o2: false, o3: true });
  assert.deepEqual(merged.checklist, { c1: true, c2: true });
});

test('a clear marker removes older reports from both tabs', () => {
  const oldReport = { questionId: 'q1', at: '2026-01-01T10:00:00.000Z', reason: 'typo' };
  const newerReport = { questionId: 'q2', at: '2026-01-01T12:00:00.000Z', reason: 'typo' };
  const cleared = { reports: [], reportsClearedAt: '2026-01-01T11:00:00.000Z' };
  const merged = mergeStore(cleared, { reports: [oldReport, newerReport], reportsClearedAt: '' });
  assert.deepEqual(merged.reports.map((r) => r.questionId), ['q2']);
  assert.equal(merged.reportsClearedAt, '2026-01-01T11:00:00.000Z');
});

test('merging tolerates malformed report and attempt fields', () => {
  const merged = mergeStore({ reports: {}, attempts: {} }, { reports: {}, attempts: {} });
  assert.deepEqual(merged.reports, []);
  assert.deepEqual(merged.attempts, []);
});

test('merging tolerates empty or missing stores', () => {
  assert.deepEqual(mergeStore({}, {}).answers, {});
  assert.deepEqual(mergeStore(undefined, undefined).attempts, []);
  assert.equal(mergeStore({ lastQual: 'DS' }, {}).lastQual, 'DS');
});
