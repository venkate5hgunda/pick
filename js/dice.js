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

function ensureCatanDiceWeights(game, rand) {
  if (game.unfairDice && !validCatanDiceWeights(game.diceWeights)) {
    game.diceWeights = createCatanDiceWeights(rand);
  }
}

function rollCatanDicePair(game, rand) {
  ensureCatanDiceWeights(game, rand);
  return game.unfairDice
    ? [rollWeightedD6(game.diceWeights[0], rand), rollWeightedD6(game.diceWeights[1], rand)]
    : rollDice(6, 2, 0, rand).rolls;
}

/** Groups `{ player, sum }` entries into arrays of player names, ranked by descending sum. */
function groupByDescendingSum(entries) {
  const bySum = new Map();
  entries.forEach(({ player, sum }) => {
    if (!bySum.has(sum)) bySum.set(sum, []);
    bySum.get(sum).push(player);
  });
  return [...bySum.keys()].sort((left, right) => right - left).map((sum) => bySum.get(sum));
}

/**
 * Advances the turn-order queue: settled (unique-sum) groups move into `orderFinal`,
 * and the next tied group (if any) becomes `orderPending` for its next roll-off.
 * Ends the order phase once every group is fully resolved.
 */
function advanceCatanOrderQueue(game) {
  while (game.orderQueue.length && game.orderQueue[0].length === 1) {
    game.orderFinal.push(game.orderQueue.shift()[0]);
  }
  if (game.orderQueue.length === 0) {
    game.players = game.orderFinal;
    game.orderPhase = false;
    game.orderPending = [];
    // Standard Catan "snake" placement order: forward through turn order for each
    // player's first settlement, then back through it for the second, so whoever
    // rolls first also places both of their settlements back-to-back.
    game.settlementPhase = true;
    game.settlementSequence = [...game.orderFinal, ...game.orderFinal.slice().reverse()];
    game.settlementIndex = 0;
    game.turnIndex = 0;
    return;
  }
  game.orderPending = game.orderQueue[0].slice();
}

export const CATAN_DEFAULT_SETTLEMENT_SECONDS = 60;

/** Creates fresh Catan game state for `playerNames` (2-6 players). */
export function createCatanGame(playerNames, { unfairDice = false, settlementSeconds = CATAN_DEFAULT_SETTLEMENT_SECONDS, rand = randomFloat } = {}) {
  if (!Array.isArray(playerNames) || playerNames.length < 2 || playerNames.length > 6) {
    throw new Error('createCatanGame: expects 2-6 player names');
  }
  const loaded = Boolean(unfairDice);
  const seconds = Number.isFinite(settlementSeconds) && settlementSeconds > 0
    ? settlementSeconds
    : CATAN_DEFAULT_SETTLEMENT_SECONDS;
  return {
    players: playerNames.slice(),
    unfairDice: loaded,
    diceWeights: loaded ? createCatanDiceWeights(rand) : null,
    turnIndex: 0,
    lastRollAt: null,
    log: [], // { player, die1, die2, sum, isRobber, timestamp }
    // Turn order is decided by each player's first roll; ties reroll only among
    // the tied players until every rank is unique. These rolls are kept out of
    // `log` so they never factor into per-player analytics.
    orderPhase: true,
    orderRolls: [], // { player, die1, die2, sum, timestamp }
    orderQueue: [playerNames.slice()],
    orderFinal: [],
    orderPending: playerNames.slice(),
    orderAttempt: [], // { player, sum } rolls collected for the current roll-off
    // Once turn order is set, players place two settlements each in "snake" order
    // (forward, then reverse) before real rolling begins. `settlementSeconds` is a
    // configurable, per-settlement countdown surfaced by the UI's guided pop-up.
    settlementPhase: false,
    settlementSequence: null,
    settlementIndex: 0,
    settlementSeconds: seconds,
  };
}

/** Returns whose turn it is: deciding order, placing a settlement, or rolling. */
export function currentCatanPlayer(game) {
  if (game.orderPhase) return game.orderPending[0];
  if (game.settlementPhase) return game.settlementSequence[game.settlementIndex];
  return game.players[game.turnIndex];
}

/** 1 during the forward placement pass, 2 during the reverse pass, null outside the phase. */
export function catanSettlementRound(game) {
  if (!game.settlementPhase) return null;
  return game.settlementIndex < game.players.length ? 1 : 2;
}

/**
 * Marks the current player's settlement as placed (called on timer expiry or a
 * manual "next" action) and advances to the next spot in the snake order. Ends
 * the phase and resets `turnIndex` to the first roller once both passes finish.
 */
export function advanceCatanSettlement(game) {
  if (!game.settlementPhase) {
    throw new Error('advanceCatanSettlement: game is not in the settlement-placement phase');
  }
  game.settlementIndex += 1;
  if (game.settlementIndex >= game.settlementSequence.length) {
    game.settlementPhase = false;
    game.settlementSequence = null;
    game.settlementIndex = 0;
    game.turnIndex = 0;
  }
}

/**
 * Rolls 2d6 for the next player still deciding turn order. Once every player in the
 * current tie group has rolled, ties (if any) are dequeued for a reroll among just
 * those players, and the phase ends once every rank is unique.
 */
export function rollCatanOrderTurn(game, now = Date.now(), rand = randomFloat) {
  if (!game.orderPhase) {
    throw new Error('rollCatanOrderTurn: turn order has already been decided');
  }
  const [die1, die2] = rollCatanDicePair(game, rand);
  const player = game.orderPending.shift();
  const sum = die1 + die2;
  const entry = { player, die1, die2, sum, timestamp: now };
  game.orderRolls.push(entry);
  game.orderAttempt.push({ player, sum });
  game.lastRollAt = now;
  if (game.orderPending.length === 0) {
    game.orderQueue.shift();
    game.orderQueue.unshift(...groupByDescendingSum(game.orderAttempt));
    game.orderAttempt = [];
    advanceCatanOrderQueue(game);
  }
  return entry;
}

/** Rolls 2d6 for the current player, appends to the log, and advances the turn. */
export function rollCatanTurn(game, now = Date.now(), rand = randomFloat) {
  if (game.orderPhase) {
    throw new Error('rollCatanTurn: turn order has not been decided yet');
  }
  if (game.settlementPhase) {
    throw new Error('rollCatanTurn: settlements have not been placed yet');
  }
  const rolls = rollCatanDicePair(game, rand);
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
