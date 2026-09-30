import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cubeOrientationForValue, formatDiceExpression, settledCubeTransform } from '../js/dice-animation.js';
import {
  CATAN_DEFAULT_SETTLEMENT_SECONDS,
  CATAN_GAME_TTL_MS,
  CATAN_HISTOGRAM_MIN_ROLLS,
  advanceCatanSettlement,
  catanGameExpiresAt,
  catanSettlementRound,
  createCatanGame,
  currentCatanPlayer,
  isCatanGameExpired,
  rollCatanOrderTurn,
  rollCatanTurn,
  catanPlayerStats,
  catanSumProbabilities,
  catanSumHistogram,
} from '../js/dice.js';

/** Maps a target d6 face (1-6) to the `rand()` value that produces it via `rollDie`. */
function dieRandFor(value) {
  return (value - 1) / 6;
}

/** Returns a rand() stub that yields `values` in order, then throws if over-consumed. */
function sequenceRand(values) {
  let index = 0;
  return () => {
    if (index >= values.length) throw new Error('sequenceRand: exhausted');
    return values[index++];
  };
}

/** Drives a game through its turn-order roll-off, optionally with a scripted rand(). */
function resolveCatanOrder(game, rand = undefined) {
  while (game.orderPhase) rollCatanOrderTurn(game, Date.now(), rand);
}

/** Fast-forwards through the settlement-placement phase (no dice involved). */
function resolveCatanSettlements(game) {
  while (game.settlementPhase) advanceCatanSettlement(game);
}

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
  assert.equal(game.orderPhase, true);
  assert.deepEqual(game.orderPending, ['A', 'B', 'C']);
  assert.equal(game.settlementPhase, false);
  assert.equal(game.settlementSeconds, CATAN_DEFAULT_SETTLEMENT_SECONDS);
});

test('createCatanGame validates and falls back settlementSeconds', () => {
  assert.equal(createCatanGame(['A', 'B']).settlementSeconds, CATAN_DEFAULT_SETTLEMENT_SECONDS);
  assert.equal(createCatanGame(['A', 'B'], { settlementSeconds: 30 }).settlementSeconds, 30);
  assert.equal(createCatanGame(['A', 'B'], { settlementSeconds: -5 }).settlementSeconds, CATAN_DEFAULT_SETTLEMENT_SECONDS);
});

test('Catan turn order is decided by each player\'s first roll, highest first', () => {
  const game = createCatanGame(['A', 'B', 'C']);
  assert.equal(currentCatanPlayer(game), 'A');

  const rand = sequenceRand([
    dieRandFor(1), dieRandFor(3), // A rolls 4
    dieRandFor(3), dieRandFor(5), // B rolls 8
    dieRandFor(4), dieRandFor(6), // C rolls 10
  ]);
  rollCatanOrderTurn(game, 1_000, rand);
  assert.equal(currentCatanPlayer(game), 'B');
  rollCatanOrderTurn(game, 2_000, rand);
  assert.equal(currentCatanPlayer(game), 'C');
  rollCatanOrderTurn(game, 3_000, rand);

  assert.equal(game.orderPhase, false);
  assert.deepEqual(game.players, ['C', 'B', 'A']);
  assert.equal(game.orderRolls.length, 3);

  // Order-decision rolls never touch the analytics log.
  assert.equal(game.log.length, 0);
  catanPlayerStats(game).forEach((stats) => assert.equal(stats.rollCount, 0));
  assert.deepEqual(catanSumHistogram(game), new Array(11).fill(0));

  // Settlements still need placing before real rolls are allowed.
  assert.equal(game.settlementPhase, true);
  assert.throws(() => rollCatanTurn(game));
});

test('Catan turn-order reroll dedupes ties among only the tied players', () => {
  const game = createCatanGame(['A', 'B', 'C']);
  const firstRoll = sequenceRand([
    dieRandFor(4), dieRandFor(5), // A rolls 9
    dieRandFor(3), dieRandFor(6), // B rolls 9 (tied with A)
    dieRandFor(2), dieRandFor(3), // C rolls 5
  ]);
  rollCatanOrderTurn(game, 1_000, firstRoll);
  rollCatanOrderTurn(game, 2_000, firstRoll);
  rollCatanOrderTurn(game, 3_000, firstRoll);

  // C is already settled (unique sum); only the tied A/B pair rerolls.
  assert.equal(game.orderPhase, true);
  assert.deepEqual(game.orderPending, ['A', 'B']);
  assert.equal(currentCatanPlayer(game), 'A');

  const tieBreak = sequenceRand([
    dieRandFor(3), dieRandFor(4), // A rerolls 7
    dieRandFor(1), dieRandFor(4), // B rerolls 5
  ]);
  rollCatanOrderTurn(game, 4_000, tieBreak);
  rollCatanOrderTurn(game, 5_000, tieBreak);

  assert.equal(game.orderPhase, false);
  assert.deepEqual(game.players, ['A', 'B', 'C']);
  assert.equal(game.orderRolls.filter((entry) => entry.player === 'A').length, 2);
  assert.equal(game.orderRolls.filter((entry) => entry.player === 'B').length, 2);
  assert.equal(game.orderRolls.filter((entry) => entry.player === 'C').length, 1);
  assert.equal(game.log.length, 0);
});

test('Catan settlement phase snakes through turn order, doubling up on the last roller', () => {
  const game = createCatanGame(['A', 'B', 'C'], { settlementSeconds: 45 });
  resolveCatanOrder(game, sequenceRand([
    dieRandFor(1), dieRandFor(3), // A: 4
    dieRandFor(3), dieRandFor(5), // B: 8
    dieRandFor(4), dieRandFor(6), // C: 10
  ]));
  assert.deepEqual(game.players, ['C', 'B', 'A']);
  assert.equal(game.settlementPhase, true);
  assert.equal(game.settlementSeconds, 45);
  assert.deepEqual(game.settlementSequence, ['C', 'B', 'A', 'A', 'B', 'C']);
  assert.equal(currentCatanPlayer(game), 'C');
  assert.equal(catanSettlementRound(game), 1);

  advanceCatanSettlement(game); // C's first settlement placed
  assert.equal(currentCatanPlayer(game), 'B');
  assert.equal(catanSettlementRound(game), 1);

  advanceCatanSettlement(game); // B's first
  assert.equal(currentCatanPlayer(game), 'A');
  assert.equal(catanSettlementRound(game), 1);

  advanceCatanSettlement(game); // A's first (last of the forward pass)
  assert.equal(currentCatanPlayer(game), 'A'); // same player goes again immediately
  assert.equal(catanSettlementRound(game), 2);

  advanceCatanSettlement(game); // A's second
  assert.equal(currentCatanPlayer(game), 'B');
  assert.equal(catanSettlementRound(game), 2);

  advanceCatanSettlement(game); // B's second
  assert.equal(currentCatanPlayer(game), 'C');

  advanceCatanSettlement(game); // C's second — phase ends
  assert.equal(game.settlementPhase, false);
  assert.equal(game.settlementSequence, null);
  assert.equal(game.turnIndex, 0);
  assert.equal(currentCatanPlayer(game), 'C');
  assert.throws(() => advanceCatanSettlement(game));
  assert.throws(() => rollCatanOrderTurn(game));
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

  resolveCatanOrder(game);
  resolveCatanSettlements(game);

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
  resolveCatanOrder(game, sequenceRand([
    dieRandFor(6), dieRandFor(6), // A rolls 12
    dieRandFor(1), dieRandFor(1), // B rolls 2
  ]));
  resolveCatanSettlements(game);
  assert.deepEqual(game.players, ['A', 'B']);

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
  resolveCatanOrder(game);
  resolveCatanSettlements(game);
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
  resolveCatanOrder(game);
  resolveCatanSettlements(game);
  for (let i = 0; i < 6; i++) rollCatanTurn(game);
  const stats = catanPlayerStats(game);
  assert.equal(stats.length, 2);
  assert.equal(stats[0].rollCount + stats[1].rollCount, 6);
  stats.forEach((s) => assert.ok(s.average >= 2 && s.average <= 12));
});

test('catanSumHistogram buckets sums 2..12 into 11 slots', () => {
  const game = createCatanGame(['A', 'B']);
  resolveCatanOrder(game);
  resolveCatanSettlements(game);
  for (let i = 0; i < 20; i++) rollCatanTurn(game);
  const hist = catanSumHistogram(game);
  assert.equal(hist.length, 11);
  assert.equal(hist.reduce((a, b) => a + b, 0), 20);
});

