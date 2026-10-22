import { loadJSON, saveJSON, KEYS } from './storage.js';
import {
  IDLE_ROTATION_DELAY_MS,
  IDLE_ROTATION_SPEED,
  SINGLE_SPIN_DURATION_MS,
  Wheel,
  expandInputSets,
  getSegmentArcs,
  pickSegmentIndex,
} from './wheel.js?v=11';
import { WheelBatchOverlay } from './wheel-batch.js?v=4';
import { batchVolumeScale } from './audio.js';
import { BatchResultOverlay, WheelCelebration, summarizeBatchResults } from './celebration.js';
import { createTracker, record, reset as resetTracker, toRows, rowsToCSV, ResponsiveHistogram } from './stats.js?v=2';

const PALETTE = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
export const PRESETS = {
  yesno: ['Yes', 'No'],
  yesnomaybe: ['Yes', 'No', 'Maybe'],
  headstails: ['Heads', 'Tails'],
  rps: ['Rock', 'Paper', 'Scissors'],
  mealtime: ['Pizza', 'Sushi', 'Tacos', 'Burgers', 'Salad', 'Pasta'],
  whogoesfirst: ['Player 1', 'Player 2', 'Player 3', 'Player 4'],
};

export function segmentsFromLabels(labels) {
  return labels.map((label, index) => ({ label, color: PALETTE[index % PALETTE.length], weight: 1 }));
}

function presetInputSetCount(labels) {
  return Math.min(5, Math.max(1, Math.floor(10 / labels.length)));
}

export function presetKeyForState(segments, inputSetCount, weightsEnabled) {
  if (weightsEnabled) return '';
  return Object.entries(PRESETS).find(([, labels]) => {
    const expected = segmentsFromLabels(labels);
    return Number(inputSetCount) === presetInputSetCount(labels)
      && segments.length === expected.length
      && segments.every((segment, index) => segment.label === expected[index].label
        && segment.color.toLowerCase() === expected[index].color
        && Number(segment.weight) === expected[index].weight);
  })?.[0] || '';
}

export function committedWheelWeight(value, fallback = 1) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : fallback;
}

export function initWheelTab(motionAudio, haptics) {
  const canvas = document.getElementById('wheelCanvas');
  const spinSurface = document.getElementById('wheelSpinSurface');
  const editor = document.getElementById('segmentEditor');
  const addButton = document.getElementById('addSegmentBtn');
  const presetSelect = document.getElementById('presetSelect');
  const inputSetSelect = document.getElementById('inputSetCount');
  const weightToggle = document.getElementById('weightToggle');
  const spinButton = document.getElementById('spinBtn');
  const spinAgainButton = document.getElementById('spinAgainBtn');
  const result = document.getElementById('wheelResult');
  const stage = document.getElementById('wheelStage');
  const resultOverlay = document.getElementById('wheelResultOverlay');
  const batchResultElement = document.getElementById('batchResultOverlay');
  const miniGrid = document.getElementById('miniWheelGrid');
  const pointer = document.getElementById('wheelPointer');
  const batchStatus = document.getElementById('batchStatus');
  const animatedCountInput = document.getElementById('animatedBatchCount');
  const fastCountInput = document.getElementById('fastBatchCount');
  const runAnimatedButton = document.getElementById('runAnimatedBatch');
  const runFastButton = document.getElementById('runFastBatch');
  const backButton = document.getElementById('backToWheel');
  const statsCanvas = document.getElementById('wheelHistogram');
  const statsTable = document.getElementById('wheelStatsTable');
  const resetStatsButton = document.getElementById('wheelStatsReset');
  const exportStatsButton = document.getElementById('wheelStatsExport');

  let segments = loadJSON(KEYS.WHEEL_SEGMENTS, null) || segmentsFromLabels(PRESETS.yesno);
  segments = segments.map((segment) => ({ ...segment, weight: Math.max(1, Math.round(Number(segment.weight) || 1)) }));
  let inputSetCount = loadJSON(KEYS.WHEEL_INPUT_SETS, 5);
  let weightsEnabled = loadJSON(KEYS.WHEEL_WEIGHTS_ENABLED, false);
  const tracker = createTracker(loadJSON(KEYS.WHEEL_STATS, {}));
  const wheel = new Wheel(canvas, visualSegments());
  const celebration = new WheelCelebration(stage, resultOverlay);
  const batchResultOverlay = new BatchResultOverlay(batchResultElement);
  const batchOverlay = new WheelBatchOverlay({ stage, mainElement: spinSurface, pointer, grid: miniGrid, status: batchStatus });
  const histogram = new ResponsiveHistogram(statsCanvas);
  let spinning = false;
  let activeRun = null;
  let idleTimer = null;
  let activityFrame = null;

  function pauseIdleRotation() {
    clearTimeout(idleTimer);
    idleTimer = null;
    wheel.stopIdleRotation();
  }

  function armIdleRotation() {
    pauseIdleRotation();
    if (document.hidden || spinning || stage.classList.contains('is-batch-mode')) return;
    idleTimer = window.setTimeout(() => {
      idleTimer = null;
      if (!document.hidden && !spinning && !stage.classList.contains('is-batch-mode')) {
        wheel.startIdleRotation(IDLE_ROTATION_SPEED);
      }
    }, IDLE_ROTATION_DELAY_MS);
  }

  function noteActivity() {
    if (activityFrame !== null) return;
    activityFrame = requestAnimationFrame(() => {
      activityFrame = null;
      armIdleRotation();
    });
  }

  function effectiveSegments() {
    return segments.map((segment) => ({ ...segment, weight: weightsEnabled ? segment.weight : 1 }));
  }

  function visualSegments() {
    return expandInputSets(effectiveSegments(), inputSetCount);
  }

  function refreshWheel() {
    wheel.setSegments(visualSegments());
    refreshStats();
  }

  function persistSegments() {
    saveJSON(KEYS.WHEEL_SEGMENTS, segments);
  }

  function persistStats() {
    saveJSON(KEYS.WHEEL_STATS, tracker.counts);
  }

  function syncPresetSelect() {
    presetSelect.value = presetKeyForState(segments, inputSetCount, weightsEnabled);
  }

  function renderEditor() {
    editor.classList.toggle('weights-enabled', weightsEnabled);
    editor.innerHTML = `
      <div class="segment-editor-header" aria-hidden="true">
        <span>Color</span><span>Option</span><span class="weight-column">Weight</span><span></span>
      </div>`;
    segments.forEach((segment, index) => {
      const row = document.createElement('div');
      row.className = 'segment-row';
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = segment.color;
      colorInput.setAttribute('aria-label', `Color for ${segment.label}`);
      colorInput.title = `Change ${segment.label} color`;
      const textInput = document.createElement('input');
      textInput.type = 'text';
      textInput.value = segment.label;
      textInput.setAttribute('aria-label', `Label ${index + 1}`);
      const weightInput = document.createElement('input');
      weightInput.className = 'segment-weight';
      weightInput.type = 'number';
      weightInput.min = '1';
      weightInput.step = '1';
      weightInput.inputMode = 'numeric';
      weightInput.value = String(segment.weight);
      weightInput.setAttribute('aria-label', `Weight for ${segment.label}`);
      weightInput.title = 'Relative weight';
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'btn btn-ghost remove-segment';
      removeButton.textContent = '✕';
      removeButton.setAttribute('aria-label', `Remove ${segment.label}`);
      removeButton.dataset.tooltip = 'Remove option';
      row.append(colorInput, textInput, weightInput, removeButton);
      colorInput.addEventListener('input', () => {
        segment.color = colorInput.value;
        persistSegments();
        refreshWheel();
        syncPresetSelect();
      });
      textInput.addEventListener('input', () => {
        segment.label = textInput.value || '—';
        persistSegments();
        refreshWheel();
        syncPresetSelect();
      });
      weightInput.addEventListener('blur', () => {
        segment.weight = committedWheelWeight(weightInput.value);
        weightInput.value = String(segment.weight);
        persistSegments();
        refreshWheel();
        syncPresetSelect();
      });
      removeButton.addEventListener('click', () => {
        if (segments.length <= 2) return;
        segments.splice(index, 1);
        persistSegments();
        refreshWheel();
        renderEditor();
        syncPresetSelect();
      });
      editor.appendChild(row);
    });
  }

  function refreshStats() {
    const rows = toRows(tracker, segments.map((segment) => segment.label));
    histogram.render(rows);
    statsTable.replaceChildren();
    rows.forEach((row) => {
      const item = document.createElement('div');
      item.className = 'stats-row';
      const label = document.createElement('span');
      label.textContent = row.label;
      const value = document.createElement('span');
      value.textContent = `${row.count} (${row.percent.toFixed(1)}%)`;
      item.append(label, value);
      statsTable.appendChild(item);
    });
  }

  addButton.addEventListener('click', () => {
    segments.push({ label: `Option ${segments.length + 1}`, color: PALETTE[segments.length % PALETTE.length], weight: 1 });
    persistSegments();
    refreshWheel();
    renderEditor();
    syncPresetSelect();
  });

  inputSetSelect.value = String(inputSetCount);
  inputSetSelect.addEventListener('change', () => {
    inputSetCount = Number(inputSetSelect.value);
    saveJSON(KEYS.WHEEL_INPUT_SETS, inputSetCount);
    refreshWheel();
    syncPresetSelect();
  });

  weightToggle.checked = weightsEnabled;
  weightToggle.addEventListener('change', () => {
    weightsEnabled = weightToggle.checked;
    saveJSON(KEYS.WHEEL_WEIGHTS_ENABLED, weightsEnabled);
    renderEditor();
    refreshWheel();
    syncPresetSelect();
  });

  presetSelect.addEventListener('change', () => {
    const labels = PRESETS[presetSelect.value];
    if (!labels) return;
    segments = segmentsFromLabels(labels);
    inputSetCount = presetInputSetCount(labels);
    weightsEnabled = false;
    inputSetSelect.value = String(inputSetCount);
    weightToggle.checked = false;
    persistSegments();
    saveJSON(KEYS.WHEEL_INPUT_SETS, inputSetCount);
    saveJSON(KEYS.WHEEL_WEIGHTS_ENABLED, weightsEnabled);
    refreshWheel();
    renderEditor();
    syncPresetSelect();
  });

  function setBusy(busy) {
    spinning = busy;
    [spinButton, spinSurface, runAnimatedButton, runFastButton, addButton, presetSelect, inputSetSelect, weightToggle,
      ...editor.querySelectorAll('input, button')].forEach((control) => { control.disabled = busy; });
  }

  function beginRun() {
    const run = new AbortController();
    activeRun = run;
    setBusy(true);
    pauseIdleRotation();
    return run;
  }

  function finishRun(run) {
    if (activeRun !== run) return;
    activeRun = null;
    setBusy(false);
    armIdleRotation();
  }

  function restoreRegularMode() {
    activeRun?.abort();
    activeRun = null;
    setBusy(false);
    batchResultOverlay.hide();
    celebration.hide();
    batchOverlay.hide();
    backButton.hidden = true;
    armIdleRotation();
  }

  async function spinWheel() {
    if (activeRun) return;
    restoreRegularMode();
    const run = beginRun();
    const options = effectiveSegments();
    const slices = expandInputSets(options, inputSetCount);
    result.textContent = '';
    try {
      const sourceIndex = pickSegmentIndex(options);
      const targetIndex = Math.floor(Math.random() * inputSetCount) * options.length + sourceIndex;
      const boundaries = getSegmentArcs(slices).map((arc) => arc.start);
      await motionAudio.beginWheel();
      if (run.signal.aborted) return;
      const completed = await wheel.spinTo(targetIndex, SINGLE_SPIN_DURATION_MS, null, {
        signal: run.signal,
        onFrame: ({ rotation, velocity }) => motionAudio.syncWheel(rotation, velocity, boundaries),
      });
      if (!completed || run.signal.aborted) return;
      const selected = options[sourceIndex];
      result.textContent = `Selected: ${selected.label}`;
      celebration.show(selected.label, selected.color);
      record(tracker, selected.label);
      persistStats();
      refreshStats();
      motionAudio.finish();
      haptics?.impact(0.6);
    } catch (error) {
      result.textContent = 'The spin could not finish. Please try again.';
      console.error('Wheel spin failed:', error);
    } finally {
      finishRun(run);
    }
  }

  spinButton.addEventListener('click', spinWheel);
  spinSurface.addEventListener('click', spinWheel);
  spinAgainButton.addEventListener('click', spinWheel);

  runAnimatedButton.addEventListener('click', async () => {
    if (activeRun) return;
    restoreRegularMode();
    const run = beginRun();
    const count = Math.min(12, Math.max(2, parseInt(animatedCountInput.value, 10) || 2));
    animatedCountInput.value = count;
    backButton.hidden = false;
    const batchSegments = visualSegments();
    try {
      await motionAudio.beginWheel();
      if (run.signal.aborted) return;
      const boundaries = getSegmentArcs(batchSegments).map((arc) => arc.start);
      const volumeScales = Array.from({ length: count }, () => batchVolumeScale(count));
      const results = await batchOverlay.run(batchSegments, count, {
        signal: run.signal,
        onMotion: ({ rotation, velocity, wheelIndex }) =>
          motionAudio.syncWheel(rotation, velocity, boundaries, volumeScales[wheelIndex], `batch-${wheelIndex}`),
      });
      if (!results || run.signal.aborted) return;
      motionAudio.finish();
      results.forEach((index) => record(tracker, batchSegments[index].label));
      batchResultOverlay.show(summarizeBatchResults(results, batchSegments), 'Animated batch');
      persistStats();
      refreshStats();
    } catch (error) {
      batchOverlay.hide();
      backButton.hidden = true;
      result.textContent = 'The batch could not finish. Please try again.';
      console.error('Wheel batch failed:', error);
    } finally {
      finishRun(run);
    }
  });

  runFastButton.addEventListener('click', () => {
    if (activeRun) return;
    restoreRegularMode();
    const count = Math.min(10000, Math.max(13, parseInt(fastCountInput.value, 10) || 13));
    fastCountInput.value = count;
    const options = effectiveSegments();
    const results = [];
    for (let index = 0; index < count; index += 1) {
      const segmentIndex = pickSegmentIndex(options);
      results.push(segmentIndex);
      record(tracker, options[segmentIndex].label);
    }
    persistStats();
    refreshStats();
    backButton.hidden = false;
    batchResultOverlay.show(summarizeBatchResults(results, options), 'Instant batch');
  });

  backButton.addEventListener('click', restoreRegularMode);
  resetStatsButton.addEventListener('click', () => {
    resetTracker(tracker);
    persistStats();
    refreshStats();
  });
  exportStatsButton.addEventListener('click', () => {
    const rows = toRows(tracker, segments.map((segment) => segment.label));
    const csv = rowsToCSV(rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = 'pick-wheel-stats.csv';
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  });

  // The decorative circular border/shadow (`.wheel-stage::before`/`::after`)
  // is sized as a percentage of `.wheel-stage`'s own box, while the canvas
  // (inside it) is independently pinned to an exact square by Wheel.draw().
  // Relying on CSS `aspect-ratio: 1` alone for `.wheel-stage` is subject to
  // the same per-axis clientWidth/clientHeight rounding quirks that caused
  // the earlier canvas-distortion bug — so the stage box and the canvas
  // square could each round to a *different* "square", making the ring
  // border and the wheel disc mismatch in size/shape. Pin `.wheel-stage`
  // itself to a measured, guaranteed-equal width/height so every descendant
  // (border pseudo-elements and canvas alike) shares the exact same square.
  function syncStageSquare() {
    // Clear any previous pin first so the natural CSS sizing (width: 100%,
    // aspect-ratio: 1, max-width) can respond to the current viewport size
    // before we measure and re-pin — otherwise a stale pinned px value would
    // prevent the stage from ever shrinking again on a narrower viewport.
    stage.style.width = '';
    stage.style.height = '';
    const rect = stage.getBoundingClientRect();
    const size = Math.floor(Math.min(rect.width, rect.height));
    if (size < 16) return false; // hidden tab / not laid out yet
    stage.style.width = `${size}px`;
    stage.style.height = `${size}px`;
    return true;
  }

  new ResizeObserver(() => {
    syncStageSquare();
    wheel.draw();
  }).observe(stage);
  // Belt-and-suspenders: force a redraw as soon as this tab panel is shown
  // again, rather than relying solely on the ResizeObserver noticing the
  // hidden -> visible size change (draw() itself now also skips no-op work
  // while the panel is hidden, see wheel.js).
  document.getElementById('tab-wheel')?.addEventListener('tab:shown', () => {
    syncStageSquare();
    wheel.draw();
  });
  ['pointerdown', 'pointermove', 'keydown', 'wheel', 'scroll', 'touchstart'].forEach((eventName) => {
    document.addEventListener(eventName, noteActivity, { capture: true, passive: true });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseIdleRotation();
    else armIdleRotation();
  });
  renderEditor();
  syncPresetSelect();
  syncStageSquare();
  wheel.draw();
  armIdleRotation();
  refreshStats();
}