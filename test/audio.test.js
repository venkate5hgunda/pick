import { test } from 'node:test';
import assert from 'node:assert/strict';
import { batchVolumeScale, boundaryCrossingFractions } from '../js/audio.js';

test('parallel wheel volume decreases as wheel count grows', () => {
  assert.ok(batchVolumeScale(12, () => 0.5) < batchVolumeScale(2, () => 0.5));
});

test('parallel wheels receive bounded uneven volume scales', () => {
  const quiet = batchVolumeScale(8, () => 0);
  const loud = batchVolumeScale(8, () => 1);
  assert.ok(quiet > 0);
  assert.ok(loud > quiet);
  assert.ok(loud < 0.25);
});

test('wheel ticks once for every edge crossed between animation frames', () => {
  const crossings = boundaryCrossingFractions(0, -Math.PI * 2, 6);
  assert.equal(crossings.length, 6);
  assert.ok(crossings.every((fraction) => fraction > 0 && fraction <= 1));
});

test('wheel crossing detection follows weighted segment boundaries', () => {
  const boundaries = [0, Math.PI / 3, Math.PI];
  assert.equal(boundaryCrossingFractions(0, -Math.PI * 2, boundaries).length, 3);
  assert.equal(boundaryCrossingFractions(0, 0, boundaries).length, 0);
});