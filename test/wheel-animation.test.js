import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Wheel, runMiniWheelBatch } from '../js/wheel.js';

function animationEnvironment(t) {
  const frames = new Map();
  const timers = new Map();
  let next = 0;
  const replace = (key, value) => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
    t.after(() => {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    });
  };
  replace('requestAnimationFrame', (callback) => { frames.set(++next, callback); return next; });
  replace('cancelAnimationFrame', (id) => frames.delete(id));
  replace('setTimeout', (callback) => { timers.set(++next, callback); return next; });
  replace('clearTimeout', (id) => timers.delete(id));
  class Element {
    constructor() { this.style = {}; this.children = []; }
    appendChild(child) { this.children.push(child); }
    getContext() { return {}; }
  }
  replace('document', { createElement: () => new Element() });
  const draw = Wheel.prototype.draw;
  Wheel.prototype.draw = () => {};
  t.after(() => { Wheel.prototype.draw = draw; });
  return { frames, timers, Element };
}

const segments = [{ label: 'Yes', weight: 1 }, { label: 'No', weight: 1 }];

test('aborting a single spin settles its promise and removes the animation frame', async (t) => {
  const env = animationEnvironment(t);
  const controller = new AbortController();
  const wheel = new Wheel(new env.Element(), segments);
  let completed = false;
  const pending = wheel.spinTo(0, 7000, () => { completed = true; }, { signal: controller.signal });
  assert.equal(env.frames.size, 1);
  controller.abort();
  assert.equal(await pending, false);
  assert.equal(env.frames.size, 0);
  assert.equal(completed, false);
});

test('aborting a batch clears its delayed starts without recording partial results', async (t) => {
  const env = animationEnvironment(t);
  const controller = new AbortController();
  const pending = runMiniWheelBatch(new env.Element(), segments, 2, { signal: controller.signal });
  assert.equal(env.timers.size, 2);
  controller.abort();
  assert.equal(await pending, null);
  assert.equal(env.timers.size, 0);
  assert.equal(env.frames.size, 0);
});

test('aborting a running batch cancels every wheel frame', async (t) => {
  const env = animationEnvironment(t);
  const controller = new AbortController();
  const pending = runMiniWheelBatch(new env.Element(), segments, 2, { signal: controller.signal });
  for (const [id, start] of [...env.timers]) {
    env.timers.delete(id);
    start();
  }
  assert.equal(env.frames.size, 2);
  controller.abort();
  assert.equal(await pending, null);
  assert.equal(env.frames.size, 0);
});
