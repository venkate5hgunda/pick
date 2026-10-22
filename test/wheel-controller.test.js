import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createTracker, record, reset, toRows, rowsToCSV } from '../js/stats.js';
import { expandInputSets, getSegmentArcs } from '../js/wheel.js';
import { KEYS } from '../js/storage.js';

function setup(labels = ['Yes', 'No']) {
  const state = { recorded: [], batchShows: 0, html: [], wheelTarget: 0 };
  class Element {
    constructor(tag = 'div') {
      this.tag = tag;
      this.children = [];
      this.listeners = {};
      this.style = {};
      this.dataset = {};
      this.value = '';
      this.hidden = false;
      this.disabled = false;
      this.classList = { add() {}, remove() {}, contains: () => false, toggle() {} };
    }
    set innerHTML(value) { state.html.push(value); this.children = []; }
    append(...children) { this.children.push(...children); }
    appendChild(child) { this.append(child); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this[name] = value; }
    querySelectorAll() {
      const descendants = this.children.flatMap((child) => [child, ...child.querySelectorAll()]);
      return descendants.filter((child) => ['input', 'button'].includes(child.tag));
    }
    getBoundingClientRect() { return { width: 400, height: 400 }; }
    addEventListener(name, listener) { (this.listeners[name] ||= []).push(listener); }
    async fire(name) { for (const listener of this.listeners[name] || []) await listener(); }
  }
  const elements = new Map();
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  const context = {
    document: { hidden: false, getElementById: get, createElement: (tag) => new Element(tag), addEventListener() {} },
    window: { setTimeout: () => 1 }, clearTimeout() {}, requestAnimationFrame: () => 1,
    console: { error() {} }, AbortController,
    ResizeObserver: class { observe() {} },
    KEYS,
    loadJSON: (key, fallback) => key === KEYS.WHEEL_SEGMENTS
      ? labels.map((label) => ({ label, color: '#ef4444', weight: 1 }))
      : key === KEYS.WHEEL_INPUT_SETS ? 1 : fallback,
    saveJSON() {},
    IDLE_ROTATION_DELAY_MS: 120000, IDLE_ROTATION_SPEED: 0.02, SINGLE_SPIN_DURATION_MS: 7000,
    Wheel: class {
      setSegments() {}
      draw() {}
      stopIdleRotation() {}
      spinTo(index, duration, callback, { signal }) {
        return new Promise((resolve) => {
          state.completeSpin = () => resolve(true);
          signal.addEventListener('abort', () => resolve(false), { once: true });
        });
      }
    },
    WheelBatchOverlay: class {
      hide() {}
      run(segments, count, { signal }) {
        return new Promise((resolve) => {
          state.completeBatch = resolve;
          signal.addEventListener('abort', () => resolve(null), { once: true });
        });
      }
    },
    WheelCelebration: class { hide() {} show(label) { state.selected = label; } },
    BatchResultOverlay: class { hide() {} show() { state.batchShows += 1; } },
    expandInputSets, getSegmentArcs, pickSegmentIndex: () => state.wheelTarget,
    batchVolumeScale: () => 1, summarizeBatchResults() {},
    createTracker, resetTracker: reset, toRows, rowsToCSV,
    record: (tracker, label) => { state.recorded.push(label); record(tracker, label); },
    ResponsiveHistogram: class { render() {} },
  };
  const source = readFileSync(new URL('../js/wheel-tab.js', import.meta.url), 'utf8')
    .replace(/^import\s[\s\S]*?from\s+['"][^'"]+['"];?\s*/gm, '')
    .replace(/^export /gm, '');
  runInNewContext(source + '\ninitWheelTab(audio);', {
    ...context, audio: { beginWheel: async () => {}, finish() {}, syncWheel() {} },
  });
  return { get, state };
}

async function startAnimated(harness) {
  harness.get('animatedBatchCount').value = '2';
  const pending = harness.get('runAnimatedBatch').fire('click');
  await Promise.resolve();
  await Promise.resolve();
  return { pending };
}

test('spin locks all mutable options and records its starting snapshot', async () => {
  const h = setup(['Pizza', 'Sushi', 'Tacos']);
  h.state.wheelTarget = 2;
  const pending = h.get('spinBtn').fire('click');
  await Promise.resolve();
  assert.equal(h.get('presetSelect').disabled, true);
  assert.ok(h.get('segmentEditor').querySelectorAll().every((input) => input.disabled));
  // Even a programmatic change cannot change the completed spin's recorded label.
  h.get('presetSelect').value = 'yesno';
  await h.get('presetSelect').fire('change');
  h.state.completeSpin();
  await pending;
  assert.deepEqual(h.state.recorded, ['Tacos']);
  assert.equal(h.get('spinBtn').disabled, false);
});

test('back cancels an animated batch without adding results or reopening its summary', async () => {
  const h = setup();
  const { pending } = await startAnimated(h);
  assert.equal(h.get('presetSelect').disabled, true);
  await h.get('backToWheel').fire('click');
  h.state.completeBatch([0, 1]);
  await pending;
  assert.deepEqual(h.state.recorded, []);
  assert.equal(h.state.batchShows, 0);
  assert.equal(h.get('runAnimatedBatch').disabled, false);
  assert.equal(h.get('spinBtn').disabled, false);
});

test('animated batch records the snapshot used to draw its wheels', async () => {
  const h = setup(['Pizza', 'Sushi']);
  const { pending } = await startAnimated(h);
  h.get('presetSelect').value = 'yesno';
  await h.get('presetSelect').fire('change');
  h.state.completeBatch([0, 1]);
  await pending;
  assert.deepEqual(h.state.recorded, ['Pizza', 'Sushi']);
});

test('labels containing HTML and quotes remain text in the editor and statistics', async () => {
  const label = '<img src=x onerror="alert(1)">';
  const h = setup([label, 'Dinner "yes"']);
  assert.ok(h.get('segmentEditor').querySelectorAll().some((input) => input.value === label));
  assert.ok(h.state.html.every((html) => !html.includes(label) && !html.includes('Dinner')));
  h.get('fastBatchCount').value = '13';
  await h.get('runFastBatch').fire('click');
  assert.equal(h.get('wheelStatsTable').children[0].children[0].textContent, label);
});
