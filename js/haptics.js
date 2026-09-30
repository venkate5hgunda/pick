// Thin wrapper around the Vibration API.
//
// Platform reality check: the Vibration API is a Web spec that WebKit has
// never implemented on iOS/iPadOS — Safari, Chrome, Firefox, and every other
// browser on iOS all run on WebKit there, so `navigator.vibrate` is simply
// `undefined` on every iOS browser, with no workaround available from web
// content (there is no "haptics" fallback API either). This module degrades
// silently on those platforms instead of throwing; callers still get the
// audio cue as the primary feedback channel everywhere.

function supportsVibration() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

/** Maps a 0..1 impact intensity to a short vibration pattern (ms), stronger hits buzz a touch longer. */
export function hapticPatternForIntensity(intensity = 0.5) {
  const strength = Math.max(0, Math.min(1, intensity));
  return [Math.round(18 + strength * 42)];
}

export class Haptics {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.supported = supportsVibration();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  pulse(pattern) {
    if (!this.enabled || !this.supported) return false;
    try {
      return navigator.vibrate(pattern);
    } catch {
      return false; // some browsers throw outside a user gesture — fail silently
    }
  }

  impact(intensity = 0.5) {
    return this.pulse(hapticPatternForIntensity(intensity));
  }

  cancel() {
    if (!this.supported) return;
    try {
      navigator.vibrate(0);
    } catch {
      /* ignore */
    }
  }
}
