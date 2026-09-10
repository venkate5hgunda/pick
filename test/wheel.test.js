import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeBatchResults } from '../js/celebration.js';
import { presetKeyForState, segmentsFromLabels, PRESETS } from '../js/wheel-tab.js';
import {
  BATCH_SPIN_MAX_DURATION_MS,
  BATCH_SPIN_MIN_DURATION_MS,
  IDLE_ROTATION_DELAY_MS,
  IDLE_ROTATION_SECONDS,
  IDLE_ROTATION_SPEED,
  SINGLE_SPIN_DURATION_MS,
  contrastTextColor,
  createSpinProfile,
  expandInputSets,
  finalRotationForTarget,
  getSegmentArcs,
  miniWheelGridDimensions,
  segmentIndexAtPointer,
} from '../js/wheel.js';

test('input sets repeat visual slices without losing source option identity', () => {
  const options = [
    { label: 'Yes', color: '#0a0', weight: 2 },
    { label: 'No', color: '#a00', weight: 1 },
  ];

  const slices = expandInputSets(options, 3);

  assert.equal(slices.length, 6);
  assert.deepEqual(slices.map(({ label }) => label), ['Yes', 'No', 'Yes', 'No', 'Yes', 'No']);
  assert.deepEqual(slices.map(({ sourceIndex }) => sourceIndex), [0, 1, 0, 1, 0, 1]);
  assert.deepEqual(slices.map(({ setIndex }) => setIndex), [0, 0, 1, 1, 2, 2]);
});

test('input set count is clamped from one to five', () => {
  assert.equal(expandInputSets([{ label: 'A' }], 0).length, 1);
  assert.equal(expandInputSets([{ label: 'A' }], 99).length, 5);
});

test('preset selection is derived from the complete wheel state', () => {
  const yesNo = segmentsFromLabels(PRESETS.yesno);
  assert.equal(presetKeyForState(yesNo, 5, false), 'yesno');
  assert.equal(presetKeyForState(yesNo, 4, false), '');
  assert.equal(presetKeyForState(yesNo, 5, true), '');
  assert.equal(presetKeyForState(yesNo.map((segment, index) => index ? segment : { ...segment, label: 'Absolutely' }), 5, false), '');
  assert.equal(presetKeyForState(yesNo.map((segment, index) => index ? segment : { ...segment, color: '#ffffff' }), 5, false), '');
  assert.equal(presetKeyForState(yesNo.map((segment, index) => index ? segment : { ...segment, weight: 2 }), 5, false), '');
});

test('mini-wheel grids adapt rows and columns without stretching cells', () => {
  assert.deepEqual(miniWheelGridDimensions(2), { columns: 2, rows: 1 });
  assert.deepEqual(miniWheelGridDimensions(5), { columns: 3, rows: 2 });
  assert.deepEqual(miniWheelGridDimensions(8), { columns: 3, rows: 3 });
  assert.deepEqual(miniWheelGridDimensions(12), { columns: 4, rows: 3 });
});

test('wheel text color maintains contrast against light and dark slices', () => {
  assert.equal(contrastTextColor('#ffd23f'), '#172036');
  assert.equal(contrastTextColor('#172036'), '#ffffff');
});

test('weighted wheel arcs are proportional and cover the full circle', () => {
  const arcs = getSegmentArcs([{ weight: 1 }, { weight: 3 }]);
  assert.equal(arcs[1].angle / arcs[0].angle, 3);
  assert.ok(Math.abs(arcs[1].end - Math.PI * 2) < Number.EPSILON * 10);
});

test('pointer resolves to every selected weighted segment after whole extra spins', () => {
  const segments = [
    { weight: 1 },
    { weight: 9 },
    { weight: 2 },
    { weight: 17 },
    { weight: 1 },
    { weight: 4 },
  ];
  segments.forEach((_, targetIndex) => {
    [4, 5, 6, 7].forEach((fullSpins) => {
      const rotation = finalRotationForTarget(segments, targetIndex, fullSpins);
      assert.equal(segmentIndexAtPointer(segments, rotation), targetIndex);
    });
  });
});

test('final wheel rotation rejects an invalid target', () => {
  assert.throws(() => finalRotationForTarget([{ weight: 1 }], 2), RangeError);
});

test('physical spin profile is monotonic and lands exactly', () => {
  const profile = createSpinProfile(() => 0.5, 120);
  const values = Array.from({ length: 101 }, (_, index) => profile(index / 100));
  assert.equal(values[0], 0);
  assert.equal(values.at(-1), 1);
  assert.ok(values.every((value, index) => index === 0 || value >= values[index - 1]));
  assert.ok(profile(1) - profile(0.95) > 0.001, 'wheel should remain visibly in motion near the end');
});

test('single and statistical wheel durations create a suspenseful finish', () => {
  assert.equal(SINGLE_SPIN_DURATION_MS, 7_000);
  assert.equal(BATCH_SPIN_MIN_DURATION_MS, 6_000);
  assert.equal(BATCH_SPIN_MAX_DURATION_MS, 10_000);
});

test('idle wheel waits two minutes and takes four minutes per revolution', () => {
  assert.equal(IDLE_ROTATION_DELAY_MS, 120_000);
  assert.equal(IDLE_ROTATION_SECONDS, 240);
  assert.ok(Math.abs((Math.PI * 2) / IDLE_ROTATION_SPEED - 240) < Number.EPSILON * 10);
});

test('batch result summary highlights one unique dominant option', () => {
  const segments = [
    { label: 'Yes', color: '#0a0' },
    { label: 'No', color: '#a00' },
    { label: 'Yes', color: '#0a0' },
    { label: 'No', color: '#a00' },
  ];
  const summary = summarizeBatchResults([0, 2, 3], segments);
  assert.equal(summary.total, 3);
  assert.deepEqual(summary.rows.map(({ label, count }) => ({ label, count })), [
    { label: 'Yes', count: 2 },
    { label: 'No', count: 1 },
  ]);
  assert.equal(summary.dominant.label, 'Yes');
});

test('batch result summary does not declare a dominant option for a tie', () => {
  const segments = [{ label: 'Yes', color: '#0a0' }, { label: 'No', color: '#a00' }];
  const summary = summarizeBatchResults([0, 1], segments);
  assert.equal(summary.dominant, null);
  assert.deepEqual(summary.rows.map(({ percent }) => percent), [50, 50]);
});