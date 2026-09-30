import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hapticPatternForIntensity, Haptics } from '../js/haptics.js';

test('haptic pattern duration grows with impact intensity', () => {
  const soft = hapticPatternForIntensity(0)[0];
  const hard = hapticPatternForIntensity(1)[0];
  assert.ok(soft < hard);
});

test('haptic pattern intensity is clamped to a sane range', () => {
  assert.deepEqual(hapticPatternForIntensity(-5), hapticPatternForIntensity(0));
  assert.deepEqual(hapticPatternForIntensity(50), hapticPatternForIntensity(1));
});

test('Haptics reports unsupported when navigator.vibrate is absent', () => {
  const haptics = new Haptics(true);
  assert.equal(haptics.supported, typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function');
  assert.equal(haptics.impact(0.5), false);
});

test('Haptics.pulse is a no-op while disabled even if vibrate is supported', () => {
  const haptics = new Haptics(false);
  haptics.supported = true;
  let called = false;
  Object.defineProperty(globalThis, 'navigator', { value: { vibrate: () => { called = true; return true; } }, configurable: true });
  assert.equal(haptics.pulse([10]), false);
  assert.equal(called, false);
});

test('Haptics.pulse calls navigator.vibrate with the given pattern when enabled and supported', () => {
  const haptics = new Haptics(true);
  haptics.supported = true;
  let receivedPattern = null;
  Object.defineProperty(globalThis, 'navigator', { value: { vibrate: (pattern) => { receivedPattern = pattern; return true; } }, configurable: true });
  assert.equal(haptics.pulse([25]), true);
  assert.deepEqual(receivedPattern, [25]);
});

test('Haptics.pulse fails silently if navigator.vibrate throws', () => {
  const haptics = new Haptics(true);
  haptics.supported = true;
  Object.defineProperty(globalThis, 'navigator', { value: { vibrate: () => { throw new Error('blocked'); } }, configurable: true });
  assert.equal(haptics.pulse([10]), false);
});
