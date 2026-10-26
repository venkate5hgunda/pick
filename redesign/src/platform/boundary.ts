// Pure wheel motion math. Framework-agnostic and injectable so the exact
// landing, boundary ticks and deceleration profile are provable in Node,
// independent of frame rate or any canvas/audio. Ports the physics from the
// original js/wheel.js and js/audio.js so the redesign stays behaviorally
// faithful to the reference implementation.
const TAU = Math.PI * 2;
export const POINTER_ANGLE = -Math.PI / 2;
export const SINGLE_SPIN_DURATION_MS = 7000;
export const REDUCED_SPIN_DURATION_MS = 450;
export const IDLE_ROTATION_DELAY_MS = 2 * 60 * 1000;
export const IDLE_ROTATION_SECONDS = 240;
export const IDLE_ROTATION_SPEED = TAU / IDLE_ROTATION_SECONDS;

export interface Weighted {
  weight: number;
}

export interface SegmentArc {
  start: number;
  end: number;
  center: number;
  angle: number;
}

/** Even boundaries for an equal-weight wheel, in rising order from 0. */
export function equalBoundaries(sliceCount: number): number[] {
  const count = Math.max(1, Math.trunc(sliceCount) || 1);
  return Array.from({ length: count }, (_, index) => (index * TAU) / count);
}

/**
 * Arcs for every slice, weights clamped to a floor of one so the total is
 * always positive and the ring closes on TAU.
 */
export function getSegmentArcs(segments: Weighted[]): SegmentArc[] {
  const weights = segments.map((segment) =>
    Math.max(1, Number(segment.weight) || 1),
  );
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = 0;
  return weights.map((weight) => {
    const start = cursor;
    const angle = (TAU * weight) / total;
    cursor += angle;
    return { start, end: cursor, center: start + angle / 2, angle };
  });
}

/** Boundary angles (the leading edge of each slice) used by the ticker. */
export function sliceBoundaries(segments: Weighted[]): number[] {
  return getSegmentArcs(segments).map((arc) => arc.start);
}

/** Index of the slice currently under the top pointer for a given rotation. */
export function segmentIndexAtPointer(
  segments: Weighted[],
  rotation: number,
): number {
  const pointerAngle = (((POINTER_ANGLE - rotation) % TAU) + TAU) % TAU;
  const arcs = getSegmentArcs(segments);
  return arcs.findIndex(
    ({ start, end }) => pointerAngle >= start && pointerAngle < end,
  );
}

/**
 * Absolute rotation that parks the pointer exactly on the center of
 * `targetIndex`, spun a few full turns for suspense. Interpolating the
 * current rotation toward this value lands precisely regardless of weight.
 */
export function finalRotationForTarget(
  segments: Weighted[],
  targetIndex: number,
  fullSpins = 5,
): number {
  const target = getSegmentArcs(segments)[targetIndex];
  if (!target)
    throw new RangeError(
      'finalRotationForTarget: target index is outside the wheel',
    );
  const turns = Math.max(1, Math.trunc(fullSpins) || 1);
  return POINTER_ANGLE - target.center - turns * TAU;
}

/**
 * Fractions in (0, 1] of the way between two rotations where the pointer
 * crossed each boundary. Every edge crossed between frames is returned, so
 * the ticker naturally slows as the wheel decelerates.
 */
export function boundaryCrossingFractions(
  previousRotation: number,
  rotation: number,
  boundariesOrCount: number | number[],
): number[] {
  if (
    !Number.isFinite(previousRotation) ||
    !Number.isFinite(rotation) ||
    previousRotation === rotation
  )
    return [];
  const boundaries = Array.isArray(boundariesOrCount)
    ? boundariesOrCount
    : equalBoundaries(boundariesOrCount);
  const start = POINTER_ANGLE - previousRotation;
  const end = POINTER_ANGLE - rotation;
  const low = Math.min(start, end);
  const high = Math.max(start, end);
  const crossings: number[] = [];

  boundaries.forEach((rawBoundary) => {
    const boundary = ((rawBoundary % TAU) + TAU) % TAU;
    const firstTurn = Math.floor((low - boundary) / TAU) + 1;
    const lastTurn = Math.floor((high - boundary) / TAU);
    for (let turn = firstTurn; turn <= lastTurn; turn += 1) {
      const crossing = boundary + turn * TAU;
      const fraction = (crossing - start) / (end - start);
      if (fraction > 0 && fraction <= 1) crossings.push(fraction);
    }
  });

  return crossings.sort((left, right) => left - right);
}

/**
 * A decelerating spin profile: a fast initial impulse with natural ripple and
 * a suspenseful final crawl. Returns 0..1 for a normalized progress and is
 * monotonic non-decreasing. Randomness is injected so the curve is replayable.
 */
export function createSpinProfile(
  random: () => number = Math.random,
  sampleCount = 180,
) {
  const samples = Math.max(30, Math.trunc(sampleCount) || 180);
  const decayRate = 3.8 + random() * 0.8;
  const rippleAmount = 0.025 + random() * 0.04;
  const rippleCount = 2.5 + random() * 1.8;
  const ripplePhase = random() * TAU;
  const cumulative = [0];
  let total = 0;

  for (let index = 1; index <= samples; index += 1) {
    const progress = (index - 0.5) / samples;
    const drag = Math.exp(-decayRate * progress);
    const ripple =
      1 +
      Math.sin(progress * TAU * rippleCount + ripplePhase) *
        Math.sin(progress * Math.PI) *
        rippleAmount;
    total += Math.max(0, drag * ripple);
    cumulative.push(total);
  }

  return (progress: number): number => {
    const position = Math.max(0, Math.min(1, progress)) * samples;
    const lower = Math.min(samples - 1, Math.floor(position));
    const fraction = position - lower;
    const distance =
      cumulative[lower] +
      (cumulative[lower + 1] - cumulative[lower]) * fraction;
    return distance / total;
  };
}
