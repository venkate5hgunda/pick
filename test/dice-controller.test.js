import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as dice from '../js/dice.js';
import { twoDiceSumProbabilities } from '../js/random.js';
import { createTracker, record, reset, toRows } from '../js/stats.js';
import { KEYS } from '../js/storage.js';

function setup(game) {
  const state = { now: Date.now(), html: [] };
  state.rollStarted = new Promise((resolve) => { state.onRollStarted = resolve; });
  class Element {
    constructor() {
      this.children = [];
      this.listeners = {};
      this.value = '';
      this.hidden = false;
      this.disabled = false;
      this.classList = { toggle() {} };
    }
    addEventListener(name, listener) { (this.listeners[name] ||= []).push(listener); }
    append(...children) { this.children.push(...children); }
    appendChild(child) { this.append(child); }
    replaceChildren() { this.children = []; }
    querySelectorAll() { return this.children; }
    set innerHTML(value) { state.html.push(value); }
    async fire(name) { for (const listener of this.listeners[name] || []) await listener(); }
  }
  const elements = new Map();
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  get('catanPlayerCount').value = '2';
  const source = readFileSync(new URL('../js/dice-tab.js', import.meta.url), 'utf8')
    .replace(/^import\s[\s\S]*?from\s+['"][^'"]+['"];?\s*/gm, '')
    .replace(/^export /gm, '');
  runInNewContext(source + '\ninitDiceTab(audio);', {
    ...dice, KEYS, twoDiceSumProbabilities, createTracker, record, resetTracker: reset, toRows,
    document: { getElementById: get, querySelectorAll: () => [], querySelector: () => null, createElement: () => new Element() },
    window: { setTimeout: () => 1, setInterval: (fn) => { state.tick = fn; return 2; } },
    clearTimeout() {}, clearInterval() {},
    Date: class extends Date { static now() { return state.now; } },
    loadJSON: (key, fallback) => key === KEYS.CATAN_LOG ? game : fallback,
    saveJSON() {},
    openModal: (modal) => { modal.hidden = false; },
    closeModal: (modal) => { modal.hidden = true; },
    ResponsiveHistogram: class { render() {} },
    DiceAnimator: class { roll() { state.onRollStarted(); return new Promise((resolve) => { state.completeRoll = resolve; }); } },
    audio: { prepare: async () => {}, finish() {} },
  });
  return { get, state };
}

function orderedGame(names) {
  const game = dice.createCatanGame(names, { settlementSeconds: 10 });
  const samples = [0.99, 0.99, 0, 0];
  let next = 0;
  while (game.orderPhase) dice.rollCatanOrderTurn(game, Date.now(), () => samples[next++]);
  return game;
}

test('Catan player names stay text in recent rolls and analytics', async () => {
  const label = '<img src=x onerror="alert(1)">';
  const game = orderedGame([label, 'B']);
  while (game.settlementPhase) dice.advanceCatanSettlement(game);
  dice.rollCatanTurn(game, Date.now(), () => 0);
  const h = setup(game);
  assert.equal(h.get('catanShortLog').children[0].children[0].textContent, label);
  await h.get('catanExpandBtn').fire('click');
  assert.equal(h.get('catanPlayerStats').children[0].children[0].textContent, label);
  assert.equal(h.get('catanFullLog').children[0].children[0].textContent, label);
  assert.deepEqual(h.state.html, []);
});

test('new game during a pending roll prevents stale completion from touching cleared state', async () => {
  const game = orderedGame(['A', 'B']);
  while (game.settlementPhase) dice.advanceCatanSettlement(game);
  const h = setup(game);
  const pending = h.get('catanRollBtn').fire('click');
  await h.state.rollStarted;
  await h.get('catanNewGameBtn').fire('click');
  h.state.completeRoll();
  await pending;
  assert.equal(h.get('catanSetup').hidden, false);
  assert.equal(h.get('catanGame').hidden, true);
});

test('settlement countdown uses elapsed time even when interval callbacks are delayed', () => {
  const game = orderedGame(['A', 'B']);
  const h = setup(game);
  assert.equal(game.settlementIndex, 0);
  h.state.now += 10_000;
  h.state.tick();
  assert.equal(game.settlementIndex, 1);
});
