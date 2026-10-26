// Ambient idle rotation for the wheel. Starts only after a continuous,
// visible-page inactivity window, runs one gentle revolution per
// IDLE_ROTATION_SECONDS, and yields to any user activity or page departure.
// Timers and the animation loop are injectable so the timing is provable in
// Node without waiting two minutes.
import { IDLE_ROTATION_DELAY_MS, IDLE_ROTATION_SPEED } from './boundary.ts';

export type IdleState = 'idle' | 'armed' | 'rotating';

export interface IdleRotatorOptions {
  delayMs?: number;
  speed?: number;
  reducedMotion?: boolean | (() => boolean);
  isHidden?: () => boolean;
  onRotate?: (delta: number) => void;
  onStateChange?: (state: IdleState) => void;
  setTimeout?: (callback: () => void, ms: number) => number;
  clearTimeout?: (id: number) => void;
  requestAnimationFrame?: (callback: (time: number) => void) => number;
  cancelAnimationFrame?: (id: number) => void;
  now?: () => number;
}

export interface IdleRotator {
  arm(): void;
  stop(): void;
  dispose(): void;
  readonly state: IdleState;
}

export function createIdleRotator(
  options: IdleRotatorOptions = {},
): IdleRotator {
  const delayMs = options.delayMs ?? IDLE_ROTATION_DELAY_MS;
  const speed = options.speed ?? IDLE_ROTATION_SPEED;
  const isReduced = () =>
    typeof options.reducedMotion === 'function'
      ? options.reducedMotion()
      : Boolean(options.reducedMotion);
  const isHidden = () =>
    typeof options.isHidden === 'function' ? options.isHidden() : false;
  const setTimer =
    options.setTimeout ??
    ((callback, ms) => setTimeout(callback, ms) as unknown as number);
  const clearTimer = options.clearTimeout ?? ((id) => clearTimeout(id));
  const raf =
    options.requestAnimationFrame ??
    ((callback) => requestAnimationFrame(callback));
  const cancelRaf =
    options.cancelAnimationFrame ?? ((id) => cancelAnimationFrame(id));

  let state: IdleState = 'idle';
  let timer: number | null = null;
  let frame: number | null = null;
  let last: number | null = null;

  const setState = (next: IdleState) => {
    if (state === next) return;
    state = next;
    options.onStateChange?.(state);
  };

  const startRotation = () => {
    if (isReduced() || isHidden()) {
      setState('idle');
      return;
    }
    setState('rotating');
    last = null;
    const step = (time: number) => {
      if (state !== 'rotating') return;
      const now = time ?? (options.now ? options.now() : 0);
      if (last !== null) {
        const elapsed = Math.min(0.05, Math.max(0, (now - last) / 1000));
        options.onRotate?.(speed * elapsed);
      }
      last = now;
      frame = raf(step);
    };
    frame = raf(step);
  };

  const stop = () => {
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
    if (frame !== null) {
      cancelRaf(frame);
      frame = null;
    }
    last = null;
    setState('idle');
  };

  const arm = () => {
    stop();
    if (isReduced()) {
      setState('idle');
      return;
    }
    setState('armed');
    timer = setTimer(() => {
      timer = null;
      startRotation();
    }, delayMs);
  };

  const dispose = () => stop();

  return {
    arm,
    stop,
    dispose,
    get state() {
      return state;
    },
  };
}
