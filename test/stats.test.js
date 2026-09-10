import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTracker, record, reset, toRows } from '../js/stats.js';

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
