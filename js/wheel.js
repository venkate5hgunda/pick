// Canvas wheel rendering + spin physics, plus the parallel mini-wheel batch
// simulation used by the "animated statistical run" feature.

import { weightedRandomIndex } from './random.js';

const TAU = Math.PI * 2;
export const IDLE_ROTATION_DELAY_MS = 2 * 60 * 1000;
export const IDLE_ROTATION_SECONDS = 240;
export const IDLE_ROTATION_SPEED = TAU / IDLE_ROTATION_SECONDS;
export const SINGLE_SPIN_DURATION_MS = 7000;
export const BATCH_SPIN_MIN_DURATION_MS = 6000;
export const BATCH_SPIN_MAX_DURATION_MS = 10000;

export function createSpinProfile(random = Math.random, sampleCount = 180) {
  const samples = Math.max(30, Math.trunc(sampleCount) || 180);
  const decayRate = 3.8 + random() * 0.8;
  const rippleAmount = 0.025 + random() * 0.04;
  const rippleCount = 2.5 + random() * 1.8;
  const ripplePhase = random() * TAU;
  const cumulative = [0];
  let total = 0;

  for (let index = 1; index <= samples; index += 1) {
    const progress = (index - 0.5) / samples;
    const drag = Math.exp(-decayRate * progress);
    const ripple = 1 + Math.sin(progress * TAU * rippleCount + ripplePhase)
      * Math.sin(progress * Math.PI) * rippleAmount;
    total += Math.max(0, drag * ripple);
    cumulative.push(total);
  }

  return (progress) => {
    const position = Math.max(0, Math.min(1, progress)) * samples;
    const lower = Math.min(samples - 1, Math.floor(position));
    const fraction = position - lower;
    const distance = cumulative[lower] + (cumulative[lower + 1] - cumulative[lower]) * fraction;
    return distance / total;
  };
}

export function contrastTextColor(hexColor) {
  const hex = hexColor.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(hex)) return '#ffffff';
  const channels = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  if (1.05 / (luminance + 0.05) >= 4.5) return '#ffffff';
  const darkLuminance = 0.014815238765286346; // #172036
  return (luminance + 0.05) / (darkLuminance + 0.05) >= 4.5 ? '#172036' : '#000000';
}

export function getSegmentArcs(segments) {
  const weights = segments.map((segment) => Math.max(1, Number(segment.weight) || 1));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = 0;
  return weights.map((weight) => {
    const start = cursor;
    const angle = TAU * weight / total;
    cursor += angle;
    return { start, end: cursor, center: start + angle / 2, angle };
  });
}

export function finalRotationForTarget(segments, targetIndex, fullSpins = 5) {
  const target = getSegmentArcs(segments)[targetIndex];
  if (!target) throw new RangeError('finalRotationForTarget: target index is outside the wheel');
  const turns = Math.max(1, Math.trunc(fullSpins) || 1);
  return -Math.PI / 2 - target.center - turns * TAU;
}

export function segmentIndexAtPointer(segments, rotation) {
  const pointerAngle = ((-Math.PI / 2 - rotation) % TAU + TAU) % TAU;
  const arcs = getSegmentArcs(segments);
  return arcs.findIndex(({ start, end }) => pointerAngle >= start && pointerAngle < end);
}

export class Wheel {
  constructor(canvas, segments) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.segments = segments;
    this.rotation = 0; // radians
    this._raf = null;
    this._idleRaf = null;
    this._idleLastFrame = null;
  }

  setSegments(segments) {
    this.segments = segments;
    this.draw();
  }

  draw() {
    const { canvas, ctx, segments, rotation } = this;
    const dpr = window.devicePixelRatio || 1;
    // CSS owns the display size; only resize the bitmap here. Pinning the
    // canvas to its first measured CSS size traps it at a small initial box
    // and prevents it from filling the enclosure after layout or rotation.
    const rect = canvas.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    // Hidden tabs have no layout box. Leave their last drawing intact until
    // the resize observer or tab-activation hook redraws the visible canvas.
    if (size < 16) return;
    const pixels = Math.round(size * dpr);
    canvas.width = pixels;
    canvas.height = pixels;
    const scale = pixels / size;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 4;
    const arcs = getSegmentArcs(segments);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    segments.forEach((seg, i) => {
      const { start, end, center, angle } = arcs[i];
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, start, end);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.stroke();

      ctx.save();
      ctx.rotate(center);
      ctx.textAlign = 'right';
      ctx.fillStyle = seg.textColor || contrastTextColor(seg.color);
      const arcWidth = r * 0.72 * angle;
      const labelWidthFactor = Math.max(3, seg.label.length * 0.58);
      const fontSize = Math.max(7, Math.min(17, size / 16, arcWidth / labelWidthFactor));
      ctx.font = `700 ${fontSize}px Fredoka, sans-serif`;
      ctx.shadowColor = ctx.fillStyle === '#ffffff' ? 'rgba(0,0,0,.38)' : 'rgba(255,255,255,.32)';
      ctx.shadowBlur = size < 180 ? 2 : 0;
      ctx.fillText(seg.label, r - Math.max(6, size * 0.025), 4, r * 0.62);
      ctx.restore();
    });

    ctx.restore();

    // outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.stroke();
  }

  startIdleRotation(speed = IDLE_ROTATION_SPEED) {
    if (this._idleRaf || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this._idleLastFrame = performance.now();
    const step = (now) => {
      const elapsedSeconds = Math.min(0.05, (now - this._idleLastFrame) / 1000);
      this._idleLastFrame = now;
      this.rotation = (this.rotation - speed * elapsedSeconds) % TAU;
      this.draw();
      this._idleRaf = requestAnimationFrame(step);
    };
    this._idleRaf = requestAnimationFrame(step);
  }

  stopIdleRotation() {
    cancelAnimationFrame(this._idleRaf);
    this._idleRaf = null;
    this._idleLastFrame = null;
  }

  /** Spins to land on `targetIndex`, calling onDone(targetIndex) when settled. */
  spinTo(targetIndex, durationMs, onDone, { onFrame, signal } = {}) {
    this._cancelSpin?.();
    this.stopIdleRotation();
    if (signal?.aborted) return Promise.resolve(false);
    const extraSpins = 5 + Math.floor(Math.random() * 2);
    const finalRotation = finalRotationForTarget(this.segments, targetIndex, extraSpins);
    const startRotation = this.rotation;
    const delta = finalRotation - startRotation;
    const start = performance.now();
    const spinProgress = createSpinProfile();
    let previousRotation = startRotation;
    let previousTime = start;

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        cancelAnimationFrame(this._raf);
        this._raf = null;
        this._cancelSpin = null;
        signal?.removeEventListener('abort', cancel);
      };
      const cancel = () => {
        cleanup();
        resolve(false);
      };
      this._cancelSpin = cancel;
      signal?.addEventListener('abort', cancel, { once: true });
      const step = (now) => {
        if (signal?.aborted) { cancel(); return; }
        try {
          const t = Math.min(1, (now - start) / durationMs);
          this.rotation = startRotation + delta * spinProgress(t);
          this.draw();
          const elapsedSeconds = Math.max(0.001, (now - previousTime) / 1000);
          const velocity = Math.abs(this.rotation - previousRotation) / elapsedSeconds;
          onFrame?.({ rotation: this.rotation, velocity, progress: t });
          previousRotation = this.rotation;
          previousTime = now;
          if (t < 1) this._raf = requestAnimationFrame(step);
          else {
            this.rotation = finalRotation % TAU;
            cleanup();
            onDone?.(targetIndex);
            resolve(true);
          }
        } catch (error) {
          cleanup();
          reject(error);
        }
      };
      this._raf = requestAnimationFrame(step);
    });
  }
}

/** Picks a weighted-random segment index for the given segments. */
export function pickSegmentIndex(segments) {
  return weightedRandomIndex(segments.map((s) => s.weight));
}

export function expandInputSets(segments, setCount) {
  const count = Math.min(5, Math.max(1, Math.trunc(setCount) || 1));
  return Array.from({ length: count }, (_, setIndex) =>
    segments.map((segment, sourceIndex) => ({ ...segment, sourceIndex, setIndex })))
    .flat();
}

export function miniWheelGridDimensions(count) {
  const wheelCount = Math.min(12, Math.max(2, Math.trunc(count) || 2));
  const columns = Math.ceil(Math.sqrt(wheelCount));
  return { columns, rows: Math.ceil(wheelCount / columns) };
}

/**
 * Runs `count` (<=12) mini wheels in parallel inside `gridEl`, each an
 * independent canvas sized to fit the grid. Resolves with an array of chosen
 * segment indices once every mini wheel has landed.
 */
export function runMiniWheelBatch(gridEl, segments, count, {
  minDuration = BATCH_SPIN_MIN_DURATION_MS,
  maxDuration = BATCH_SPIN_MAX_DURATION_MS,
  onMotion,
  signal,
} = {}) {
  gridEl.innerHTML = '';
  const { columns, rows } = miniWheelGridDimensions(count);
  gridEl.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
  gridEl.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;

  return new Promise((resolve, reject) => {
    const timers = [];
    const results = new Array(count).fill(null);
    // A local signal also stops sibling wheels if one animation fails.
    const controller = new AbortController();
    let settled = 0;
    let finished = false;
    const cleanup = () => {
      finished = true;
      timers.forEach(clearTimeout);
      signal?.removeEventListener('abort', cancel);
      controller.abort();
    };
    const cancel = () => {
      if (finished) return;
      cleanup();
      resolve(null);
    };
    if (signal?.aborted) { cancel(); return; }
    signal?.addEventListener('abort', cancel, { once: true });
    for (let i = 0; i < count; i += 1) {
      const cell = document.createElement('div');
      cell.className = 'mini-wheel-cell';
      const canvas = document.createElement('canvas');
      canvas.className = 'mini-wheel-canvas';
      cell.appendChild(canvas);
      gridEl.appendChild(cell);
      const wheel = new Wheel(canvas, segments);
      wheel.draw();
      const targetIndex = pickSegmentIndex(segments);
      const duration = minDuration + Math.random() * (maxDuration - minDuration);
      timers.push(setTimeout(() => {
        if (finished) return;
        wheel.spinTo(targetIndex, duration, null, {
          signal: controller.signal,
          onFrame: (motion) => onMotion?.({ ...motion, wheelIndex: i, wheelCount: count }),
        }).then((completed) => {
          if (finished || !completed) return;
          results[i] = targetIndex;
          settled += 1;
          if (settled === count) {
            cleanup();
            resolve(results);
          }
        }).catch((error) => {
          if (finished) return;
          cleanup();
          reject(error);
        });
      }, Math.random() * 150));
    }
  });
}
