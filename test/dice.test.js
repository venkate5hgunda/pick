import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cubeOrientationForValue, formatDiceExpression, settledCubeTransform } from '../js/dice-animation.js';
import {
  CATAN_GAME_TTL_MS,
  CATAN_HISTOGRAM_MIN_ROLLS,
  catanGameExpiresAt,
  createCatanGame,
  isCatanGameExpired,
  rollCatanTurn,
  catanPlayerStats,
  catanSumProbabilities,
  catanSumHistogram,
} from '../js/dice.js';

test('Catan histogram unlocks after five rolls', () => {
  assert.equal(CATAN_HISTOGRAM_MIN_ROLLS, 5);
});

test('dice result expression includes every die and the modifier', () => {
  assert.equal(formatDiceExpression([3, 4], 0, 7), '3 + 4 = 7');
  assert.equal(formatDiceExpression([6, 2], 3, 11), '6 + 2 + 3 = 11');
  assert.equal(formatDiceExpression([5, 1], -2, 4), '5 + 1 − 2 = 4');
});

test('every d6 value maps to a unique settled cube orientation', () => {
  const orientations = Array.from({ length: 6 }, (_, index) => cubeOrientationForValue(index + 1));
  assert.equal(new Set(orientations.map(String)).size, 6);
  assert.throws(() => cubeOrientationForValue(7), RangeError);
});

test('settled cube selects its face before rotating in the table plane', () => {
  assert.equal(settledCubeTransform(1, 90), 'rotateZ(90deg) rotateX(0deg) rotateY(0deg)');
  assert.equal(settledCubeTransform(2, 90), 'rotateZ(90deg) rotateX(0deg) rotateY(-90deg)');
  assert.equal(settledCubeTransform(3, 270), 'rotateZ(270deg) rotateX(-90deg) rotateY(0deg)');
  assert.equal(settledCubeTransform(4, 180), 'rotateZ(180deg) rotateX(90deg) rotateY(0deg)');
  assert.equal(settledCubeTransform(5, 90), 'rotateZ(90deg) rotateX(0deg) rotateY(90deg)');
  assert.equal(settledCubeTransform(6, 270), 'rotateZ(270deg) rotateX(0deg) rotateY(180deg)');
});

test('createCatanGame validates player count', () => {
  assert.throws(() => createCatanGame(['A']));
  assert.throws(() => createCatanGame(['A', 'B', 'C', 'D', 'E', 'F', 'G']));
  const game = createCatanGame(['A', 'B', 'C']);
  assert.equal(game.players.length, 3);
  assert.equal(game.turnIndex, 0);
  assert.deepEqual(game.log, []);
  assert.equal(game.unfairDice, false);
});

test('Catan loaded dice are opt-in and deterministic', () => {
  const samples = [0.5, 0.5, 0.25, 0.1, 0.9, 0.2, 0.8, 0.3, 0.7, 0.8, 0.1, 0.4, 0.9, 0.2, 0.6];
  let sampleIndex = 0;
  const game = createCatanGame(['A', 'B'], { unfairDice: true, rand: () => samples[sampleIndex++] });
  assert.equal(game.unfairDice, true);
  assert.equal(game.diceWeights.length, 2);
  assert.notDeepEqual(game.diceWeights[0], game.diceWeights[1]);
  const deviations = game.diceWeights.map((weights) => Math.max(...weights.map((weight) => Math.abs(weight - 1))));
  assert.notEqual(deviations[0], deviations[1]);
  assert.equal(game.diceWeights[0].indexOf(Math.max(...game.diceWeights[0])), 1);
  assert.equal(game.diceWeights[1].indexOf(Math.max(...game.diceWeights[1])), 3);
  const retainedWeights = structuredClone(game.diceWeights);
  const lowEntry = rollCatanTurn(game, 1_000, () => 0);
  const highEntry = rollCatanTurn(game, 2_000, () => 0.999999);
  assert.deepEqual([lowEntry.die1, lowEntry.die2], [1, 1]);
  assert.deepEqual([highEntry.die1, highEntry.die2], [6, 6]);
  assert.deepEqual(game.diceWeights, retainedWeights);
  assert.ok(Math.abs(catanSumProbabilities(game).reduce((sum, probability) => sum + probability, 0) - 1) < 1e-12);
});

test('new loaded Catan games regenerate both dice profiles', () => {
  const sequence = (offset) => {
    let index = 0;
    return () => ((index++ * 0.173 + offset) % 1);
  };
  const first = createCatanGame(['A', 'B'], { unfairDice: true, rand: sequence(0.11) });
  const second = createCatanGame(['A', 'B'], { unfairDice: true, rand: sequence(0.47) });
  assert.notDeepEqual(first.diceWeights, second.diceWeights);
});

test('rollCatanTurn logs an entry and advances turn order', () => {
  const game = createCatanGame(['A', 'B']);
  const entry = rollCatanTurn(game, 1_000);
  assert.equal(entry.player, 'A');
  assert.equal(entry.sum, entry.die1 + entry.die2);
  assert.equal(entry.isRobber, entry.sum === 7);
  assert.equal(game.turnIndex, 1);
  assert.equal(game.log.length, 1);
  assert.equal(game.lastRollAt, 1_000);

  rollCatanTurn(game);
  assert.equal(game.turnIndex, 0); // wraps back to player A
  assert.equal(game.log.length, 2);
});

test('Catan game expires one hour after its latest roll', () => {
  const game = createCatanGame(['A', 'B']);
  rollCatanTurn(game, 10_000);
  assert.equal(catanGameExpiresAt(game), 10_000 + CATAN_GAME_TTL_MS);
  assert.equal(isCatanGameExpired(game, 10_000 + CATAN_GAME_TTL_MS - 1), false);
  assert.equal(isCatanGameExpired(game, 10_000 + CATAN_GAME_TTL_MS), true);
});

test('Catan expiry supports saved games created before lastRollAt', () => {
  const game = createCatanGame(['A', 'B']);
  delete game.lastRollAt;
  game.log.push({ timestamp: 25_000 });
  assert.equal(catanGameExpiresAt(game), 25_000 + CATAN_GAME_TTL_MS);
});

test('catanPlayerStats aggregates rolls per player', () => {
  const game = createCatanGame(['A', 'B']);
  for (let i = 0; i < 6; i++) rollCatanTurn(game);
  const stats = catanPlayerStats(game);
  assert.equal(stats.length, 2);
  assert.equal(stats[0].rollCount + stats[1].rollCount, 6);
  stats.forEach((s) => assert.ok(s.average >= 2 && s.average <= 12));
});

test('catanSumHistogram buckets sums 2..12 into 11 slots', () => {
  const game = createCatanGame(['A', 'B']);
  for (let i = 0; i < 20; i++) rollCatanTurn(game);
  const hist = catanSumHistogram(game);
  assert.equal(hist.length, 11);
  assert.equal(hist.reduce((a, b) => a + b, 0), 20);
});
