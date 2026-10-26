import test from 'node:test';
import assert from 'node:assert/strict';
import { createIdleRotator } from '../src/platform/idle.ts';
import {
  IDLE_ROTATION_DELAY_MS,
  IDLE_ROTATION_SECONDS,
} from '../src/platform/boundary.ts';

// A deterministic clock: arm() schedules a timer we can fire, and the rotation
// loop uses rAF callbacks we advance by 50ms steps (the per-frame clamp).
function clock() {
  let timerCb = null;
  let frameCb = null;
  let t = 0;
  return {
    fireTimer() {
      const cb = timerCb;
      timerCb = null;
      cb?.();
    },
    advance(ms) {
      t += ms;
      frameCb?.(t);
    },
    createIdle(options = {}) {
      const state = { onRotate: options.onRotate };
      return createIdleRotator({
        ...options,
        now: () => t,
        setTimeout: (cb) => {
          timerCb = cb;
          return 1;
        },
        clearTimeout: () => {
          timerCb = null;
        },
        requestAnimationFrame: (cb) => {
          frameCb = cb;
          return 1;
        },
        cancelAnimationFrame: () => {
          frameCb = null;
        },
        onStateChange: (s) => (state.current = s),
      });
    },
  };
}

test('idle rotation begins after the two-minute delay and runs one revolution per 240s', () => {
  const env = clock();
  let total = 0;
  const rot = env.createIdle({ onRotate: (d) => (total += d) });
  assert.equal(rot.state, 'idle');
  rot.arm();
  assert.equal(rot.state, 'armed');
  assert.equal(rot.state === 'rotating', false);
  env.fireTimer();
  assert.equal(rot.state, 'rotating');
  // 240s of 50ms frames == 4800 deltas of speed*0.05 == exactly one revolution.
  for (let i = 0; i < 4800; i += 1) env.advance(50);
  assert.ok(
    Math.abs(total - Math.PI * 2) / (Math.PI * 2) < 0.02,
    'one gentle revolution per 240s',
  );
  rot.stop();
  assert.equal(rot.state, 'idle');
});

test('activity re-arms the idle window instead of interrupting rotation abruptly', () => {
  const env = clock();
  const rot = env.createIdle();
  rot.arm();
  env.fireTimer();
  assert.equal(rot.state, 'rotating');
  rot.arm(); // a user action
  assert.equal(rot.state, 'armed');
  env.fireTimer();
  assert.equal(rot.state, 'rotating');
});

test('reduced motion never starts ambient rotation', () => {
  const env = clock();
  const rot = env.createIdle({ reducedMotion: true });
  rot.arm();
  assert.equal(rot.state, 'idle');
  env.fireTimer();
  assert.equal(rot.state, 'idle');
});

test('a hidden page holds the idle rotation until it returns', () => {
  const env = clock();
  let hidden = false;
  const rot = env.createIdle({ isHidden: () => hidden });
  rot.arm();
  hidden = true;
  env.fireTimer();
  assert.equal(rot.state, 'idle');
  hidden = false;
  rot.arm();
  env.fireTimer();
  assert.equal(rot.state, 'rotating');
});

test('the reference constants are two minutes and 240 seconds', () => {
  assert.equal(IDLE_ROTATION_DELAY_MS, 120000);
  assert.equal(IDLE_ROTATION_SECONDS, 240);
});
