// Pure random/probability helpers — no DOM, fully unit-testable.

/**
 * Returns a cryptographically strong random float in [0, 1).
 */
export function randomFloat() {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0] / 0x100000000;
}

/**
 * Picks an index from `weights` (array of non-negative numbers) proportional
 * to each weight. Throws if weights is empty or all-zero.
 */
export function weightedRandomIndex(weights, rand = randomFloat) {
  if (!Array.isArray(weights) || weights.length === 0) {
    throw new Error('weightedRandomIndex: weights must be a non-empty array');
  }
  const total = weights.reduce((sum, w) => sum + Math.max(0, w), 0);
  if (total <= 0) {
    throw new Error('weightedRandomIndex: weights must sum to a positive number');
  }
  let target = rand() * total;
  for (let i = 0; i < weights.length; i++) {
    target -= Math.max(0, weights[i]);
    if (target < 0) return i;
  }
  return weights.length - 1; // floating-point fallback
}

/**
 * Rolls a single die with `sides` faces, returning an integer in [1, sides].
 */
export function rollDie(sides, rand = randomFloat) {
  if (!Number.isInteger(sides) || sides < 2) {
    throw new Error('rollDie: sides must be an integer >= 2');
  }
  return Math.floor(rand() * sides) + 1;
}

/**
 * Rolls `count` dice with `sides` faces plus an optional flat `modifier`.
 * Returns { rolls: number[], total: number }.
 */
export function rollDice(sides, count, modifier = 0, rand = randomFloat) {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error('rollDice: count must be an integer >= 1');
  }
  const rolls = Array.from({ length: count }, () => rollDie(sides, rand));
  const total = rolls.reduce((sum, r) => sum + r, 0) + modifier;
  return { rolls, total };
}

export function createSlightlyLoadedD6Weights(maxDeviation, rand = randomFloat) {
  if (!Number.isFinite(maxDeviation) || maxDeviation <= 0 || maxDeviation >= 1) {
    throw new RangeError('createSlightlyLoadedD6Weights: maxDeviation must be between 0 and 1');
  }
  const samples = Array.from({ length: 6 }, () => rand() * 2 - 1);
  const mean = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
  let centered = samples.map((sample) => sample - mean);
  let largest = Math.max(...centered.map(Math.abs));
  if (largest < Number.EPSILON) {
    centered = [-1, 0.6, -0.2, 1, -0.6, 0.2];
    largest = 1;
  }
  return centered.map((deviation) => 1 + deviation / largest * maxDeviation);
}

export function rollWeightedD6(weights, rand = randomFloat) {
  if (!Array.isArray(weights) || weights.length !== 6) {
    throw new Error('rollWeightedD6: weights must contain six faces');
  }
  return weightedRandomIndex(weights, rand) + 1;
}

/** Theoretical probability of each sum (2..12) for 2 six-sided dice. */
export function twoDiceSumProbabilities(firstWeights = new Array(6).fill(1), secondWeights = new Array(6).fill(1)) {
  if (firstWeights.length !== 6 || secondWeights.length !== 6) {
    throw new Error('twoDiceSumProbabilities: each die must contain six weights');
  }
  const firstTotal = firstWeights.reduce((sum, weight) => sum + weight, 0);
  const secondTotal = secondWeights.reduce((sum, weight) => sum + weight, 0);
  const probabilities = new Array(11).fill(0);
  for (let first = 0; first < 6; first += 1) {
    for (let second = 0; second < 6; second += 1) {
      probabilities[first + second] += firstWeights[first] / firstTotal * secondWeights[second] / secondTotal;
    }
  }
  return probabilities;
}
