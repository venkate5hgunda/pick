import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSlightlyLoadedD6Weights,
  weightedRandomIndex,
  rollDie,
  rollDice,
  rollWeightedD6,
  twoDiceSumProbabilities,
} from '../js/random.js';

test('weightedRandomIndex respects deterministic rand input', () => {
  const weights = [1, 1, 2]; // total 4 -> boundaries [0,1) [1,2) [2,4)
  assert.equal(weightedRandomIndex(weights, () => 0), 0);
  assert.equal(weightedRandomIndex(weights, () => 0.24), 0); // 0.24*4=0.96 -> idx0
  assert.equal(weightedRandomIndex(weights, () => 0.26), 1); // 1.04 -> idx1
  assert.equal(weightedRandomIndex(weights, () => 0.6), 2); // 2.4 -> idx2
  assert.equal(weightedRandomIndex(weights, () => 0.999999), 2);
});

test('weightedRandomIndex throws on empty or all-zero weights', () => {
  assert.throws(() => weightedRandomIndex([]));
  assert.throws(() => weightedRandomIndex([0, 0]));
});

test('rollDie stays within [1, sides]', () => {
  for (let i = 0; i < 200; i++) {
    const v = rollDie(6);
    assert.ok(v >= 1 && v <= 6);
  }
});

test('rollDie is deterministic with an injected rand', () => {
  assert.equal(rollDie(6, () => 0), 1);
  assert.equal(rollDie(6, () => 0.999), 6);
});

test('rollDice sums rolls plus modifier', () => {
  const { rolls, total } = rollDice(6, 3, 2, () => 0.5); // each die => floor(0.5*6)+1=4
  assert.deepEqual(rolls, [4, 4, 4]);
  assert.equal(total, 14);
});

test('slightly loaded d6 deviations are centered and bounded', () => {
  const samples = [0.1, 0.9, 0.2, 0.8, 0.3, 0.7];
  let index = 0;
  const weights = createSlightlyLoadedD6Weights(0.08, () => samples[index++]);
  assert.ok(Math.abs(weights.reduce((sum, weight) => sum + weight, 0) - 6) < 1e-12);
  assert.ok(weights.every((weight) => weight >= 0.92 && weight <= 1.08));
  assert.equal(weights.indexOf(Math.max(...weights)), 1);
  assert.equal(rollWeightedD6(weights, () => 0), 1);
  assert.equal(rollWeightedD6(weights, () => 0.999999), 6);
});

test('twoDiceSumProbabilities sums to 1 and peaks at 7', () => {
  const probs = twoDiceSumProbabilities();
  const sum = probs.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
  const maxIndex = probs.indexOf(Math.max(...probs));
  assert.equal(maxIndex + 2, 7);
});

test('twoDiceSumProbabilities supports distinct loaded profiles', () => {
  const probabilities = twoDiceSumProbabilities([2, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 2]);
  assert.ok(Math.abs(probabilities.reduce((sum, probability) => sum + probability, 0) - 1) < 1e-12);
  assert.notDeepEqual(probabilities, twoDiceSumProbabilities());
});
