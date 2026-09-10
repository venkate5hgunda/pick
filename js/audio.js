const BATCH_VOLUME_FALLOFF = 0.7;
const TAU = Math.PI * 2;
const POINTER_ANGLE = -Math.PI / 2;

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function equalBoundaries(sliceCount) {
  const count = Math.max(1, Math.trunc(sliceCount) || 1);
  return Array.from({ length: count }, (_, index) => index * TAU / count);
}

export function boundaryCrossingFractions(previousRotation, rotation, boundariesOrCount) {
  if (!Number.isFinite(previousRotation) || !Number.isFinite(rotation) || previousRotation === rotation) return [];
  const boundaries = Array.isArray(boundariesOrCount) ? boundariesOrCount : equalBoundaries(boundariesOrCount);
  const start = POINTER_ANGLE - previousRotation;
  const end = POINTER_ANGLE - rotation;
  const low = Math.min(start, end);
  const high = Math.max(start, end);
  const crossings = [];

  boundaries.forEach((rawBoundary) => {
    const boundary = ((rawBoundary % TAU) + TAU) % TAU;
    const firstTurn = Math.floor((low - boundary) / TAU) + 1;
    const lastTurn = Math.floor((high - boundary) / TAU);
    for (let turn = firstTurn; turn <= lastTurn; turn += 1) {
      const crossing = boundary + turn * TAU;
      const fraction = (crossing - start) / (end - start);
      if (fraction > 0 && fraction <= 1) crossings.push(fraction);
    }
  });

  return crossings.sort((left, right) => left - right);
}

export function batchVolumeScale(wheelCount, random = Math.random) {
  const count = Math.max(2, Math.trunc(wheelCount) || 2);
  const variation = 0.62 + Math.max(0, Math.min(1, random())) * 0.26;
  return variation / (count ** BATCH_VOLUME_FALLOFF);
}

export class MotionAudio {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.context = null;
    this.master = null;
    this.noiseBuffer = null;
    this.wheelRotations = new Map();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  async prepare() {
    if (!this.enabled) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createDynamicsCompressor();
      this.master.threshold.value = -12;
      this.master.knee.value = 16;
      this.master.ratio.value = 7;
      this.master.attack.value = 0.002;
      this.master.release.value = 0.16;
      this.master.connect(this.context.destination);
      this.noiseBuffer = this.createNoiseBuffer();
    }
    if (this.context.state === 'suspended') await this.context.resume();
  }

  beginWheel() {
    this.wheelRotations.clear();
    return this.prepare();
  }

  syncWheel(rotation, velocity, boundariesOrCount, volumeScale = 1, channel = 'main') {
    if (!this.context || !this.enabled) return;
    const previousRotation = this.wheelRotations.get(channel);
    this.wheelRotations.set(channel, rotation);
    if (previousRotation === undefined || velocity < 0.12) return;
    const crossings = boundaryCrossingFractions(previousRotation, rotation, boundariesOrCount);
    const scale = clamp(volumeScale, 0.06, 1);
    crossings.slice(0, 16).forEach((fraction, index) => {
      const delay = Math.min(0.03, fraction * 0.014 + index * 0.0015);
      this.wheelTick(velocity, scale, delay);
    });
  }

  impact(intensity = 0.5) {
    if (!this.context || !this.enabled) return;
    const strength = clamp(intensity, 0.08, 1);
    const now = this.context.currentTime;
    this.noiseBurst({
      start: now,
      duration: 0.028 + strength * 0.05,
      volume: 0.035 + strength * 0.11,
      filterType: 'bandpass',
      frequency: 650 + strength * 1450,
      q: 0.7,
    });
    this.resonance({
      start: now,
      frequency: 92 + strength * 42,
      endFrequency: 58 + strength * 20,
      duration: 0.09 + strength * 0.08,
      volume: 0.018 + strength * 0.065,
      type: 'sine',
    });
    this.resonance({
      start: now + 0.002,
      frequency: 430 + strength * 290,
      endFrequency: 280 + strength * 160,
      duration: 0.035 + strength * 0.025,
      volume: 0.012 + strength * 0.034,
      type: 'triangle',
    });
  }

  finish() {
    if (!this.context || !this.enabled) return;
    const now = this.context.currentTime;
    this.chime(523.25, now, 0.11);
    this.chime(659.25, now + 0.075, 0.085);
    this.chime(783.99, now + 0.15, 0.075);
  }

  createNoiseBuffer() {
    const frameCount = Math.ceil(this.context.sampleRate * 0.25);
    const buffer = this.context.createBuffer(1, frameCount, this.context.sampleRate);
    const samples = buffer.getChannelData(0);
    let previous = 0;
    for (let index = 0; index < frameCount; index += 1) {
      const white = Math.random() * 2 - 1;
      previous = previous * 0.32 + white * 0.68;
      samples[index] = previous;
    }
    return buffer;
  }

  wheelTick(velocity, volumeScale, delay = 0) {
    const speed = clamp(velocity / 22, 0, 1);
    const start = this.context.currentTime + delay;
    const variation = 0.92 + Math.random() * 0.16;
    this.noiseBurst({
      start,
      duration: 0.012 + (1 - speed) * 0.012,
      volume: (0.018 + speed * 0.038) * volumeScale,
      filterType: 'bandpass',
      frequency: (1800 + speed * 2600) * variation,
      q: 1.1 + speed * 1.6,
    });
    this.resonance({
      start,
      frequency: (760 + speed * 510) * variation,
      endFrequency: 410 + speed * 260,
      duration: 0.022 + (1 - speed) * 0.018,
      volume: (0.012 + speed * 0.026) * volumeScale,
      type: 'triangle',
    });
  }

  noiseBurst({ start, duration, volume, filterType, frequency, q }) {
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = filterType;
    filter.frequency.setValueAtTime(frequency, start);
    filter.Q.setValueAtTime(q, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(start);
    source.stop(start + duration + 0.01);
  }

  resonance({ start, frequency, endFrequency = frequency, duration, volume, type = 'sine' }) {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
  }

  chime(frequency, start, volume) {
    this.resonance({ start, frequency, endFrequency: frequency * 0.997, duration: 0.42, volume, type: 'sine' });
    this.resonance({ start, frequency: frequency * 2.01, endFrequency: frequency * 2, duration: 0.19, volume: volume * 0.23, type: 'sine' });
    this.noiseBurst({ start, duration: 0.014, volume: volume * 0.22, filterType: 'highpass', frequency: 3600, q: 0.5 });
  }
}