import { loadJSON, saveJSON, KEYS } from './storage.js';
import {
  IDLE_ROTATION_DELAY_MS,
  IDLE_ROTATION_SPEED,
  SINGLE_SPIN_DURATION_MS,
  Wheel,
  expandInputSets,
  getSegmentArcs,
  pickSegmentIndex,
} from './wheel.js?v=8';
import { WheelBatchOverlay } from './wheel-batch.js?v=3';
import { batchVolumeScale } from './audio.js';
import { BatchResultOverlay, WheelCelebration, summarizeBatchResults } from './celebration.js';
import { createTracker, record, reset as resetTracker, toRows, ResponsiveHistogram } from './stats.js';

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

export function initWheelTab(motionAudio) {
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
      row.innerHTML = `
        <input type="color" value="${segment.color}" aria-label="Color for ${segment.label}" title="Change ${segment.label} color">
        <input type="text" value="${segment.label}" aria-label="Label ${index + 1}">
        <input class="segment-weight" type="number" min="1" step="1" inputmode="numeric" value="${segment.weight}" aria-label="Weight for ${segment.label}" title="Relative weight">
        <button type="button" class="btn btn-ghost remove-segment" aria-label="Remove ${segment.label}" data-tooltip="Remove option">✕</button>`;
      const [colorInput, textInput, weightInput, removeButton] = row.children;
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
      weightInput.addEventListener('input', () => {
        segment.weight = Math.max(1, parseInt(weightInput.value, 10) || 1);
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
    statsTable.innerHTML = rows
      .map((row) => `<div class="stats-row"><span>${row.label}</span><span>${row.count} (${row.percent.toFixed(1)}%)</span></div>`)
      .join('') || '<p class="muted">No spins yet.</p>';
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

  async function spinWheel() {
    if (spinning) return;
    spinning = true;
    pauseIdleRotation();
    spinButton.disabled = true;
    spinSurface.disabled = true;
    result.textContent = '';
    celebration.hide();
    const sourceIndex = pickSegmentIndex(effectiveSegments());
    const targetIndex = (Math.floor(Math.random() * inputSetCount) * segments.length) + sourceIndex;
    const boundaries = getSegmentArcs(visualSegments()).map((arc) => arc.start);
    await motionAudio.beginWheel();
    wheel.spinTo(targetIndex, SINGLE_SPIN_DURATION_MS, () => {
      const label = segments[sourceIndex].label;
      result.textContent = `Selected: ${label}`;
      celebration.show(label, segments[sourceIndex].color);
      record(tracker, label);
      persistStats();
      refreshStats();
      spinning = false;
      spinButton.disabled = false;
      spinSurface.disabled = false;
      motionAudio.finish();
      if (navigator.vibrate) navigator.vibrate(60);
      armIdleRotation();
    }, { onFrame: ({ rotation, velocity }) => motionAudio.syncWheel(rotation, velocity, boundaries) });
  }

  spinButton.addEventListener('click', spinWheel);
  spinSurface.addEventListener('click', spinWheel);
  spinAgainButton.addEventListener('click', () => {
    celebration.hide();
    spinWheel();
  });

  runAnimatedButton.addEventListener('click', async () => {
    const count = Math.min(12, Math.max(2, parseInt(animatedCountInput.value, 10) || 2));
    animatedCountInput.value = count;
    backButton.hidden = false;
    runAnimatedButton.disabled = true;
    batchResultOverlay.hide();
    pauseIdleRotation();
    await motionAudio.beginWheel();
    const batchSegments = visualSegments();
    const boundaries = getSegmentArcs(batchSegments).map((arc) => arc.start);
    const volumeScales = Array.from({ length: count }, () => batchVolumeScale(count));
    const results = await batchOverlay.run(batchSegments, count, {
      onMotion: ({ rotation, velocity, wheelIndex }) =>
        motionAudio.syncWheel(rotation, velocity, boundaries, volumeScales[wheelIndex], `batch-${wheelIndex}`),
    });
    motionAudio.finish();
    results.forEach((index) => record(tracker, visualSegments()[index].label));
    batchResultOverlay.show(summarizeBatchResults(results, batchSegments), 'Animated batch');
    persistStats();
    refreshStats();
    runAnimatedButton.disabled = false;
  });

  runFastButton.addEventListener('click', () => {
    const count = Math.min(10000, Math.max(13, parseInt(fastCountInput.value, 10) || 13));
    fastCountInput.value = count;
    const results = [];
    for (let index = 0; index < count; index += 1) {
      const segmentIndex = pickSegmentIndex(effectiveSegments());
      results.push(segmentIndex);
      record(tracker, segments[segmentIndex].label);
    }
    persistStats();
    refreshStats();
    celebration.hide();
    batchResultOverlay.show(summarizeBatchResults(results, segments), 'Instant batch');
  });

  backButton.addEventListener('click', () => {
    batchResultOverlay.hide();
    batchOverlay.hide();
    backButton.hidden = true;
    armIdleRotation();
  });
  resetStatsButton.addEventListener('click', () => {
    resetTracker(tracker);
    persistStats();
    refreshStats();
  });
  exportStatsButton.addEventListener('click', () => {
    const rows = toRows(tracker, segments.map((segment) => segment.label));
    const csv = ['label,count,percent', ...rows.map((row) => `${row.label},${row.count},${row.percent.toFixed(2)}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = 'pick-wheel-stats.csv';
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  });

  new ResizeObserver(() => wheel.draw()).observe(stage);
  ['pointerdown', 'pointermove', 'keydown', 'wheel', 'scroll', 'touchstart'].forEach((eventName) => {
    document.addEventListener(eventName, noteActivity, { capture: true, passive: true });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseIdleRotation();
    else armIdleRotation();
  });
  renderEditor();
  syncPresetSelect();
  wheel.draw();
  armIdleRotation();
  refreshStats();
}