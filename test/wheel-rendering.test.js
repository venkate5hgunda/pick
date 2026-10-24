import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Wheel } from '../js/wheel.js';

function drawingEnvironment(t, dpr = 1) {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    value: { devicePixelRatio: dpr }, configurable: true,
  });
  t.after(() => {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else delete globalThis.window;
  });

  let layoutSize = 150;
  const arcs = [];
  const transforms = [];
  const ctx = Object.fromEntries([
    'clearRect', 'save', 'translate', 'rotate', 'beginPath', 'moveTo',
    'closePath', 'fill', 'stroke', 'fillText', 'restore',
  ].map((name) => [name, () => {}]));
  ctx.arc = (...args) => arcs.push(args);
  ctx.setTransform = (...args) => transforms.push(args);
  const canvas = {
    style: {}, width: 300, height: 150,
    getContext: () => ctx,
    // Model a CSS-sized canvas: an inline pixel size would override its
    // responsive box, reproducing the original first-measurement trap.
    getBoundingClientRect() {
      if (!layoutSize) return { width: 0, height: 0 };
      return {
        width: parseFloat(this.style.width) || layoutSize,
        height: parseFloat(this.style.height) || layoutSize,
      };
    },
  };
  const wheel = new Wheel(canvas, [{ label: 'Yes', color: '#ef4444', weight: 1 }]);
  return { canvas, wheel, arcs, transforms, resize: (size) => { layoutSize = size; } };
}

test('wheel fills its current layout after an initially small measurement and later resizes', (t) => {
  const h = drawingEnvironment(t, 3);
  for (const size of [150, 349, 276, 434]) {
    h.resize(size);
    h.wheel.draw();
    assert.equal(h.canvas.width, size * 3);
    assert.equal(h.canvas.height, size * 3);
    assert.equal(h.arcs.at(-1)[2], size / 2 - 4);
  }
  assert.deepEqual(h.canvas.style, {}, 'drawing must leave display dimensions responsive');
});

test('wheel keeps its bitmap while hidden and fills the new box when shown again', (t) => {
  const h = drawingEnvironment(t, 2);
  h.wheel.draw();
  const arcCount = h.arcs.length;
  h.resize(0);
  h.wheel.draw();
  assert.equal(h.canvas.width, 300);
  assert.equal(h.arcs.length, arcCount);
  h.resize(370);
  h.wheel.draw();
  assert.equal(h.canvas.width, 740);
  assert.equal(h.canvas.height, 740);
});

test('fractional CSS sizes use an equal high-DPI scale on both axes', (t) => {
  const h = drawingEnvironment(t, 2.75);
  h.resize(348.625);
  h.wheel.draw();
  const pixels = Math.round(348.625 * 2.75);
  assert.equal(h.canvas.width, pixels);
  assert.equal(h.canvas.height, pixels);
  assert.deepEqual(h.transforms.at(-1), [pixels / 348.625, 0, 0, pixels / 348.625, 0, 0]);
});
