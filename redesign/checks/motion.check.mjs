import test from 'node:test';
import assert from 'node:assert/strict';
import {
  boundaryCrossingFractions,
  createSpinProfile,
  equalBoundaries,
  finalRotationForTarget,
  getSegmentArcs,
  IDLE_ROTATION_SECONDS,
  IDLE_ROTATION_SPEED,
  IDLE_ROTATION_DELAY_MS,
  segmentIndexAtPointer,
  sliceBoundaries,
  SINGLE_SPIN_DURATION_MS,
} from '../src/platform/boundary.ts';

const evenWheel = [{ weight: 1 }, { weight: 1 }];

test('the ticker crosses every boundary once during a single full revolution', () => {
  const crossings = boundaryCrossingFractions(0, -Math.PI * 2, 6);
  assert.equal(crossings.length, 6);
  assert.ok(crossings.every((fraction) => fraction > 0 && fraction <= 1));
});

test('the ticker follows weighted segment edges and ignores a static wheel', () => {
  const boundaries = [0, Math.PI / 3, Math.PI];
  assert.equal(
    boundaryCrossingFractions(0, -Math.PI * 2, boundaries).length,
    3,
  );
  assert.equal(boundaryCrossingFractions(0, 0, boundaries).length, 0);
});

test('boundaries derive from slice weights and the ring closes on a full turn', () => {
  const slices = [{ weight: 1 }, { weight: 3 }, { weight: 1 }];
  const arcs = getSegmentArcs(slices);
  assert.equal(arcs[0].angle, Math.PI * 2 * (1 / 5));
  assert.equal(arcs[1].angle, Math.PI * 2 * (3 / 5));
  assert.ok(Math.abs(arcs.at(-1).end - Math.PI * 2) < 1e-9);
  assert.deepEqual(
    sliceBoundaries(slices),
    arcs.map((arc) => arc.start),
  );
});

test('a spin lands on the exact center of the selected slice for even and uneven wheels', () => {
  const uneven = [
    { weight: 1 },
    { weight: 2 },
    { weight: 5 },
    { weight: 1 },
    { weight: 3 },
  ];
  for (const wheel of [
    evenWheel,
    uneven,
    ...Array.from({ length: 10 }, (_, i) => ({ weight: i + 1 })),
  ]) {
    for (let target = 0; target < wheel.length; target += 1) {
      const final = finalRotationForTarget(wheel, target, 5);
      assert.equal(
        segmentIndexAtPointer(wheel, final % (Math.PI * 2)),
        target,
        `wheel of ${wheel.length} (weights ${wheel.map((s) => s.weight).join(',')}) target ${target}`,
      );
    }
  }
});

test('out-of-range landing targets are rejected', () => {
  assert.throws(() => finalRotationForTarget(evenWheel, 99), RangeError);
});

test('the deceleration profile is monotonic, bounded and settles at one', () => {
  const profile = createSpinProfile(() => 0.5);
  assert.ok(Math.abs(profile(0)) < 1e-9);
  assert.ok(Math.abs(profile(1) - 1) < 1e-9);
  let previous = -Infinity;
  for (let i = 0; i <= 1000; i += 1) {
    const value = profile(i / 1000);
    assert.ok(value >= previous - 1e-9, 'profile must not run backwards');
    assert.ok(value <= 1 + 1e-9, 'profile must not overshoot');
    previous = value;
  }
});

test('the fast start outruns the slow crawl (decelerating)', () => {
  const profile = createSpinProfile(() => 0.5);
  assert.ok(profile(0.1) > profile(0.9) - 0.9, 'most motion happens early');
  // A large share of the arc is covered in the first third of the duration.
  assert.ok(profile(0.33) > 0.5);
});

test('idle timing matches the reference: two-minute delay, 240s per revolution', () => {
  assert.equal(IDLE_ROTATION_DELAY_MS, 2 * 60 * 1000);
  assert.equal(IDLE_ROTATION_SECONDS, 240);
  assert.ok(Math.abs(IDLE_ROTATION_SPEED - (Math.PI * 2) / 240) < 1e-12);
  assert.equal(SINGLE_SPIN_DURATION_MS, 7000);
});
