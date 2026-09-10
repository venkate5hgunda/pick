// Dice logic: standard N-die rolling, plus a Catan turn/log manager.
// Turn-management functions are pure (take/return state) so they're testable
// without touching localStorage or the DOM.

import {
  createSlightlyLoadedD6Weights,
  randomFloat,
  rollDice,
  rollWeightedD6,
  twoDiceSumProbabilities,
} from './random.js?v=2';

export const CATAN_GAME_TTL_MS = 60 * 60 * 1000;

export function rollStandard(sides, count, modifier) {
  return rollDice(sides, count, modifier);
}

/** Creates fresh Catan game state for `playerNames` (2-6 players). */
export function createCatanDiceWeights(rand = randomFloat) {
  const smallerDeviation = 0.04 + rand() * 0.03;
  const largerDeviation = 0.08 + rand() * 0.04;
  const deviations = rand() < 0.5
    ? [smallerDeviation, largerDeviation]
    : [largerDeviation, smallerDeviation];
  return deviations.map((deviation) => createSlightlyLoadedD6Weights(deviation, rand));
}

function validCatanDiceWeights(weights) {
  return Array.isArray(weights)
    && weights.length === 2
    && weights.every((die) => Array.isArray(die) && die.length === 6 && die.every((weight) => Number.isFinite(weight) && weight > 0));
}

export function createCatanGame(playerNames, { unfairDice = false, rand = randomFloat } = {}) {
  if (!Array.isArray(playerNames) || playerNames.length < 2 || playerNames.length > 6) {
    throw new Error('createCatanGame: expects 2-6 player names');
  }
  const loaded = Boolean(unfairDice);
  return {
    players: playerNames.slice(),
    unfairDice: loaded,
    diceWeights: loaded ? createCatanDiceWeights(rand) : null,
    turnIndex: 0,
    lastRollAt: null,
    log: [], // { player, die1, die2, sum, isRobber, timestamp }
  };
}

/** Rolls 2d6 for the current player, appends to the log, and advances the turn. */
export function rollCatanTurn(game, now = Date.now(), rand = randomFloat) {
  if (game.unfairDice && !validCatanDiceWeights(game.diceWeights)) {
    game.diceWeights = createCatanDiceWeights(rand);
  }
  const rolls = game.unfairDice
    ? [rollWeightedD6(game.diceWeights[0], rand), rollWeightedD6(game.diceWeights[1], rand)]
    : rollDice(6, 2, 0, rand).rolls;
  const total = rolls[0] + rolls[1];
  const [die1, die2] = rolls;
  const entry = {
    player: game.players[game.turnIndex],
    die1,
    die2,
    sum: total,
    isRobber: total === 7,
    timestamp: now,
  };
  game.log.push(entry);
  game.lastRollAt = now;
  game.turnIndex = (game.turnIndex + 1) % game.players.length;
  return entry;
}

export function catanSumProbabilities(game) {
  return game?.unfairDice && validCatanDiceWeights(game.diceWeights)
    ? twoDiceSumProbabilities(game.diceWeights[0], game.diceWeights[1])
    : twoDiceSumProbabilities();
}

export function catanGameExpiresAt(game) {
  const latestLogTimestamp = game?.log?.[game.log.length - 1]?.timestamp;
  const lastRollAt = Number(game?.lastRollAt ?? latestLogTimestamp);
  return Number.isFinite(lastRollAt) && lastRollAt > 0 ? lastRollAt + CATAN_GAME_TTL_MS : null;
}

export function isCatanGameExpired(game, now = Date.now()) {
  const expiresAt = catanGameExpiresAt(game);
  return expiresAt !== null && now >= expiresAt;
}

/** Per-player summary: rolls taken, robber count, average roll. */
export function catanPlayerStats(game) {
  return game.players.map((name) => {
    const rolls = game.log.filter((e) => e.player === name);
    const robberCount = rolls.filter((e) => e.isRobber).length;
    const avg = rolls.length ? rolls.reduce((s, e) => s + e.sum, 0) / rolls.length : 0;
    return { player: name, rollCount: rolls.length, robberCount, average: Math.round(avg * 100) / 100 };
  });
}

export const CATAN_HISTOGRAM_MIN_ROLLS = 5;

/** Frequency of each sum 2..12 across the Catan log, as an 11-length array. */
export function catanSumHistogram(game) {
  const counts = new Array(11).fill(0);
  game.log.forEach((e) => counts[e.sum - 2]++);
  return counts;
}
