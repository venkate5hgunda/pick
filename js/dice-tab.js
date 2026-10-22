import { openModal, closeModal } from './modal.js?v=2';
import { loadJSON, saveJSON, KEYS } from './storage.js';
import { createTracker, record, reset as resetTracker, toRows, ResponsiveHistogram } from './stats.js?v=2';
import {
  rollStandard,
  createCatanGame,
  currentCatanPlayer,
  rollCatanOrderTurn,
  rollCatanTurn,
  catanSettlementRound,
  advanceCatanSettlement,
  catanPlayerStats,
  catanSumProbabilities,
  catanSumHistogram,
  catanGameExpiresAt,
  isCatanGameExpired,
  CATAN_HISTOGRAM_MIN_ROLLS,
} from './dice.js?v=6';
import { twoDiceSumProbabilities } from './random.js?v=2';
import { DiceAnimator } from './dice-animation.js?v=4';

const DIE_SIDES = 6;

function bindArenaRoll(container, roll) {
  container.addEventListener('click', (event) => {
    if (event.target.closest?.('.dice-arena')) roll();
  });
  container.addEventListener('keydown', (event) => {
    if (!event.target.closest?.('.dice-arena') || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    roll();
  });
}

export function initDiceTab(motionAudio, haptics) {
  const modeButtons = document.querySelectorAll('.mode-btn');
  const panels = {
    standard: document.getElementById('dicePanel-standard'),
    catan: document.getElementById('dicePanel-catan'),
  };

  modeButtons.forEach((button) => button.addEventListener('click', () => {
    modeButtons.forEach((item) => item.classList.toggle('is-active', item === button));
    Object.entries(panels).forEach(([name, panel]) => {
      panel.hidden = name !== button.dataset.mode;
    });
    saveJSON(KEYS.DICE_MODE, button.dataset.mode);
  }));

  const savedButton = document.querySelector(`.mode-btn[data-mode="${loadJSON(KEYS.DICE_MODE, 'standard')}"]`);
  savedButton?.click();
  initStandardDice(motionAudio, haptics);
  initCatanMode(motionAudio, haptics);
}

function initStandardDice(motionAudio, haptics) {
  const countInput = document.getElementById('diceCount');
  const modifierInput = document.getElementById('diceModifier');
  const rollButton = document.getElementById('rollDiceBtn');
  const result = document.getElementById('diceResult');
  const histogram = new ResponsiveHistogram(document.getElementById('diceHistogram'));
  const resetButton = document.getElementById('diceStatsReset');
  const tracker = createTracker(loadJSON(KEYS.DICE_STANDARD_STATS, {}));
  const animator = new DiceAnimator(result, {
    onImpact: (intensity) => { motionAudio.impact(intensity); haptics?.impact(intensity); },
  });

  function refresh() {
    histogram.render(toRows(tracker).sort((left, right) => Number(left.label) - Number(right.label)));
  }

  async function roll() {
    if (rollButton.disabled) return;
    rollButton.disabled = true;
    const count = Math.min(10, Math.max(1, parseInt(countInput.value, 10) || 1));
    const modifier = parseInt(modifierInput.value, 10) || 0;
    countInput.value = count;
    const { rolls, total } = rollStandard(DIE_SIDES, count, modifier);
    await motionAudio.prepare();
    await animator.roll(rolls, DIE_SIDES, { modifier, total });
    motionAudio.finish();
    rollButton.disabled = false;
    record(tracker, String(total));
    saveJSON(KEYS.DICE_STANDARD_STATS, tracker.counts);
    refresh();
  }

  rollButton.addEventListener('click', roll);
  bindArenaRoll(result, roll);

  resetButton.addEventListener('click', () => {
    resetTracker(tracker);
    saveJSON(KEYS.DICE_STANDARD_STATS, tracker.counts);
    refresh();
  });
  refresh();
}

function initCatanMode(motionAudio, haptics) {
  const playerCountSelect = document.getElementById('catanPlayerCount');
  const nameInputs = document.getElementById('catanNameInputs');
  const setup = document.getElementById('catanSetup');
  const gamePanel = document.getElementById('catanGame');
  const startButton = document.getElementById('catanStartBtn');
  const unfairDiceInput = document.getElementById('catanUnfairDice');
  const settlementSecondsInput = document.getElementById('catanSettlementSeconds');
  const turnLabel = document.getElementById('catanTurnLabel');
  const currentPlayer = document.getElementById('catanCurrentPlayer');
  const orderBanner = document.getElementById('catanOrderBanner');
  const rollButton = document.getElementById('catanRollBtn');
  const rollDisplay = document.getElementById('catanRollDisplay');
  const shortLog = document.getElementById('catanShortLog');
  const expandButton = document.getElementById('catanExpandBtn');
  const newGameButton = document.getElementById('catanNewGameBtn');
  const analyticsModal = document.getElementById('catanAnalyticsModal');
  const playerStats = document.getElementById('catanPlayerStats');
  const histogramGate = document.getElementById('catanHistogramGate');
  const histogramCanvas = document.getElementById('catanHistogramCanvas');
  const fullLog = document.getElementById('catanFullLog');
  const settlementModal = document.getElementById('catanSettlementModal');
  const settlementRoundLabel = document.getElementById('catanSettlementRoundLabel');
  const settlementPlayerEl = document.getElementById('catanSettlementPlayer');
  const settlementTimerEl = document.getElementById('catanSettlementTimer');
  const settlementNextBtn = document.getElementById('catanSettlementNextBtn');
  const animator = new DiceAnimator(rollDisplay, {
    onImpact: (intensity) => { motionAudio.impact(intensity); haptics?.impact(intensity); },
  });
  const histogram = new ResponsiveHistogram(histogramCanvas, { theoretical: twoDiceSumProbabilities() });
  let game = loadJSON(KEYS.CATAN_LOG, null);
  let expirationTimer = null;
  let settlementIntervalId = null;
  let settlementRemaining = 0;
  let settlementDeadline = 0;
  let gameGeneration = 0;

  function resetExpiredGame() {
    if (!game?.players?.length || !isCatanGameExpired(game)) return false;
    clearInterval(settlementIntervalId);
    gameGeneration += 1;
    game = createCatanGame(game.players, { unfairDice: game.unfairDice, settlementSeconds: game.settlementSeconds });
    saveJSON(KEYS.CATAN_LOG, game);
    rollDisplay.replaceChildren();
    return true;
  }

  function scheduleExpiration() {
    clearTimeout(expirationTimer);
    const expiresAt = catanGameExpiresAt(game);
    if (expiresAt === null) return;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      if (resetExpiredGame()) showGame();
      return;
    }
    expirationTimer = window.setTimeout(() => {
      if (resetExpiredGame()) showGame();
    }, remaining);
  }

  function renderNameInputs() {
    const count = parseInt(playerCountSelect.value, 10);
    nameInputs.replaceChildren();
    for (let index = 1; index <= count; index += 1) {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = `Player ${index} (optional name)`;
      nameInputs.appendChild(input);
    }
  }

  function renderTurn() {
    currentPlayer.textContent = currentCatanPlayer(game);
    turnLabel.textContent = game.orderPhase ? 'Rolling for turn order:' : 'Current turn:';
    rollButton.textContent = game.orderPhase ? 'Roll for turn order' : 'Roll';
  }

  function renderOrderBanner() {
    if (game.orderPhase) {
      const tieBreak = game.orderQueue[0]?.length < game.players.length;
      orderBanner.hidden = false;
      orderBanner.textContent = tieBreak
        ? `Tie! ${game.orderQueue[0].join(' & ')} roll again to break it.`
        : 'Everyone rolls once — highest total goes first.';
    } else if (!game.settlementPhase && game.log.length === 0) {
      orderBanner.hidden = false;
      orderBanner.textContent = `Turn order: ${game.players.join(' → ')}`;
    } else {
      orderBanner.hidden = true;
    }
  }

  function renderShortLog() {
    const source = game.orderPhase ? game.orderRolls : game.log;
    const recent = source.slice(-5).reverse();
    shortLog.replaceChildren();
    recent.forEach((entry) => {
      const item = document.createElement('li');
      item.className = entry.isRobber ? 'is-robber' : '';
      const name = document.createElement('span');
      name.textContent = entry.player;
      const value = document.createElement('span');
      value.textContent = `${entry.die1}+${entry.die2} = ${entry.sum}${entry.isRobber ? ' 🥷' : ''}`;
      item.append(name, value);
      shortLog.appendChild(item);
    });
    if (!recent.length) {
      const item = document.createElement('li');
      item.className = 'muted';
      item.textContent = 'No rolls yet.';
      shortLog.appendChild(item);
    }
  }

  function updateSettlementTimerDisplay() {
    const minutes = Math.floor(settlementRemaining / 60);
    const seconds = settlementRemaining % 60;
    settlementTimerEl.textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;
    settlementTimerEl.classList.toggle('is-urgent', settlementRemaining <= 10);
  }

  function renderSettlementModal() {
    settlementRoundLabel.textContent = catanSettlementRound(game) === 2 ? 'Second settlement' : 'First settlement';
    settlementPlayerEl.textContent = currentCatanPlayer(game);
  }

  function startSettlementTimer() {
    clearInterval(settlementIntervalId);
    settlementRemaining = game.settlementSeconds;
    settlementDeadline = Date.now() + settlementRemaining * 1000;
    updateSettlementTimerDisplay();
    settlementIntervalId = window.setInterval(() => {
      settlementRemaining = Math.max(0, Math.ceil((settlementDeadline - Date.now()) / 1000));
      updateSettlementTimerDisplay();
      if (settlementRemaining <= 0) completeSettlementTurn();
    }, 1000);
  }

  function completeSettlementTurn() {
    clearInterval(settlementIntervalId);
    settlementIntervalId = null;
    if (!game?.settlementPhase) return;
    advanceCatanSettlement(game);
    saveJSON(KEYS.CATAN_LOG, game);
    if (game.settlementPhase) {
      renderSettlementModal();
      startSettlementTimer();
    } else {
      showGame();
    }
  }

  function openSettlementModal() {
    renderSettlementModal();
    openModal(settlementModal);
    startSettlementTimer();
  }

  function refreshPhaseUI() {
    if (game.settlementPhase) {
      rollButton.disabled = true;
      openSettlementModal();
    } else {
      clearInterval(settlementIntervalId);
      rollButton.disabled = false;
      closeModal(settlementModal);
    }
  }

  function showGame() {
    setup.hidden = true;
    gamePanel.hidden = false;
    renderTurn();
    renderShortLog();
    renderOrderBanner();
    refreshPhaseUI();
  }

  function openAnalytics() {
    if (!game) return;
    openModal(analyticsModal);
    playerStats.replaceChildren();
    catanPlayerStats(game).forEach((stats) => {
      const row = document.createElement('div');
      row.className = 'row';
      const player = document.createElement('span');
      player.textContent = stats.player;
      const summary = document.createElement('span');
      summary.textContent = `${stats.rollCount} ${stats.rollCount === 1 ? 'roll' : 'rolls'} · ${stats.robberCount} ${stats.robberCount === 1 ? 'robber' : 'robbers'} · avg ${stats.average}`;
      row.append(player, summary);
      playerStats.appendChild(row);
    });

    if (game.log.length < CATAN_HISTOGRAM_MIN_ROLLS) {
      histogramGate.textContent = `Log ${CATAN_HISTOGRAM_MIN_ROLLS - game.log.length} more roll(s) to unlock the histogram.`;
      histogramCanvas.hidden = true;
    } else {
      histogramGate.textContent = '';
      histogramCanvas.hidden = false;
      const counts = catanSumHistogram(game);
      const total = counts.reduce((sum, count) => sum + count, 0);
      histogram.render(counts.map((count, index) => ({
        label: String(index + 2),
        count,
        percent: total ? count / total * 100 : 0,
      })), { theoretical: catanSumProbabilities(game) });
    }

    fullLog.replaceChildren();
    game.log.slice().reverse().forEach((entry) => {
      const row = document.createElement('div');
      row.className = 'row';
      const player = document.createElement('span');
      player.textContent = entry.player;
      const roll = document.createElement('span');
      roll.textContent = `${entry.die1}+${entry.die2}=${entry.sum}${entry.isRobber ? ' 🥷' : ''}`;
      row.append(player, roll);
      fullLog.appendChild(row);
    });
    if (!game.log.length) fullLog.textContent = 'No rolls yet.';
  }

  playerCountSelect.addEventListener('change', renderNameInputs);
  startButton.addEventListener('click', () => {
    const names = Array.from(nameInputs.querySelectorAll('input')).map((input, index) => input.value.trim() || `Player ${index + 1}`);
    const settlementSeconds = parseInt(settlementSecondsInput.value, 10);
    gameGeneration += 1;
    game = createCatanGame(names, { unfairDice: unfairDiceInput.checked, settlementSeconds });
    saveJSON(KEYS.CATAN_LOG, game);
    scheduleExpiration();
    showGame();
  });
  async function roll() {
    if (!game || rollButton.disabled) return;
    rollButton.disabled = true;
    const entry = game.orderPhase ? rollCatanOrderTurn(game) : rollCatanTurn(game);
    saveJSON(KEYS.CATAN_LOG, game);
    scheduleExpiration();
    const generation = gameGeneration;
    await motionAudio.prepare();
    if (generation !== gameGeneration) return;
    await animator.roll([entry.die1, entry.die2], DIE_SIDES, { total: entry.sum, suffix: entry.isRobber ? ' · Robber!' : '' });
    if (generation !== gameGeneration) return;
    motionAudio.finish();
    renderTurn();
    renderShortLog();
    renderOrderBanner();
    refreshPhaseUI();
    rollButton.disabled = game.settlementPhase;
  }

  rollButton.addEventListener('click', roll);
  bindArenaRoll(rollDisplay, roll);
  settlementNextBtn.addEventListener('click', completeSettlementTurn);
  newGameButton.addEventListener('click', () => {
    clearTimeout(expirationTimer);
    clearInterval(settlementIntervalId);
    gameGeneration += 1;
    game = null;
    saveJSON(KEYS.CATAN_LOG, null);
    setup.hidden = false;
    gamePanel.hidden = true;
    closeModal(settlementModal);
    rollDisplay.replaceChildren();
  });
  expandButton.addEventListener('click', openAnalytics);

  renderNameInputs();
  resetExpiredGame();
  if (game?.players?.length) {
    showGame();
    scheduleExpiration();
  }
}