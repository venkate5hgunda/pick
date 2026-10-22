import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTracker, record, reset, toRows, rowsToCSV } from '../js/stats.js';

test('record increments count and total', () => {
  const t = createTracker();
  record(t, 'Yes');
  record(t, 'Yes');
  record(t, 'No');
  assert.equal(t.counts.Yes, 2);
  assert.equal(t.counts.No, 1);
  assert.equal(t.total, 3);
});

test('reset clears counts and total', () => {
  const t = createTracker({ Yes: 5 });
  reset(t);
  assert.deepEqual(t.counts, {});
  assert.equal(t.total, 0);
});

test('toRows computes percentages for given label order', () => {
  const t = createTracker();
  record(t, 'Yes');
  record(t, 'Yes');
  record(t, 'Yes');
  record(t, 'No');
  const rows = toRows(t, ['Yes', 'No']);
  assert.equal(rows[0].count, 3);
  assert.equal(rows[0].percent, 75);
  assert.equal(rows[1].count, 1);
  assert.equal(rows[1].percent, 25);
});

test('toRows handles zero total without dividing by zero', () => {
  const t = createTracker();
  const rows = toRows(t, ['Yes', 'No']);
  assert.deepEqual(rows.map((r) => r.percent), [0, 0]);
});

test('changing wheel labels retains historical categories and a complete denominator', () => {
  const tracker = createTracker({ Yes: 3, No: 1 });
  const rows = toRows(tracker, ['Heads', 'Tails']);
  assert.deepEqual(rows.map((row) => row.label), ['Heads', 'Tails', 'Yes', 'No']);
  assert.equal(rows.reduce((sum, row) => sum + row.percent, 0), 100);
});

test('duplicate labels are aggregated into one distribution row', () => {
  const tracker = createTracker({ Yes: 2 });
  assert.deepEqual(toRows(tracker, ['Yes', 'Yes']), [{ label: 'Yes', count: 2, percent: 100 }]);
});

test('prototype property names survive recording and storage as ordinary labels', () => {
  const tracker = createTracker();
  for (const label of ['constructor', '__proto__', 'toString']) record(tracker, label);
  const restored = createTracker(JSON.parse(JSON.stringify(tracker.counts)));
  assert.equal(Object.getPrototypeOf(restored.counts), Object.prototype);
  assert.deepEqual(toRows(restored).map((row) => row.count), [1, 1, 1]);
  assert.equal(restored.total, 3);
});

test('CSV escapes commas, quotes, and line breaks in labels', () => {
  assert.equal(
    rowsToCSV([{ label: 'Lunch, "maybe"\nTomorrow', count: 3, percent: 25 }]),
    'label,count,percent\r\n"Lunch, ""maybe""\nTomorrow",3,25.00',
  );
});
