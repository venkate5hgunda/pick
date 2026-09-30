import { loadJSON, saveJSON, KEYS } from './storage.js';

export function initSoundControl(motionAudio, haptics) {
  const toggle = document.getElementById('soundToggle');
  const apply = (enabled) => {
    motionAudio.setEnabled(enabled);
    haptics?.setEnabled(enabled);
    if (!enabled) haptics?.cancel();
    toggle.classList.toggle('is-muted', !enabled);
    const label = enabled ? 'Mute sounds' : 'Enable sounds';
    toggle.setAttribute('aria-label', label);
    toggle.dataset.tooltip = label;
  };

  apply(loadJSON(KEYS.SOUND_ENABLED, true));
  toggle.addEventListener('click', async () => {
    const enabled = toggle.classList.contains('is-muted');
    saveJSON(KEYS.SOUND_ENABLED, enabled);
    apply(enabled);
    if (enabled) await motionAudio.prepare();
  });

  // iOS/iPadOS WebKit only unlocks (and keeps unlocked) an AudioContext when
  // creation/resume ties back to a genuine user gesture. Priming on the very
  // first touch/pointer/key input anywhere on the page — before any specific
  // roll/spin button is pressed — gives every later cue the best chance of
  // actually being audible there, without waiting on a second interaction.
  const primeOnce = () => {
    motionAudio.prepare();
    document.removeEventListener('pointerdown', primeOnce);
    document.removeEventListener('touchend', primeOnce);
    document.removeEventListener('keydown', primeOnce);
  };
  document.addEventListener('pointerdown', primeOnce, { once: true, passive: true });
  document.addEventListener('touchend', primeOnce, { once: true, passive: true });
  document.addEventListener('keydown', primeOnce, { once: true });
}

export function initPrimaryTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const panels = {
    wheel: document.getElementById('tab-wheel'),
    dice: document.getElementById('tab-dice'),
  };

  function activate(tabName) {
    tabButtons.forEach((button) => {
      const active = button.dataset.tab === tabName;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    Object.entries(panels).forEach(([name, panel]) => {
      const wasHidden = panel.hidden;
      panel.hidden = name !== tabName;
      // Let listeners (e.g. the wheel's ResizeObserver-driven redraw) know a
      // panel just went from hidden -> visible, so anything that skipped
      // work while hidden (zero-size canvases, etc.) can redraw now that it
      // has real layout dimensions again.
      if (wasHidden && !panel.hidden) {
        panel.dispatchEvent(new CustomEvent('tab:shown', { bubbles: false }));
      }
    });
    saveJSON(KEYS.WHEEL_ACTIVE_TAB, tabName);
  }

  tabButtons.forEach((button) => button.addEventListener('click', () => activate(button.dataset.tab)));
  activate(loadJSON(KEYS.WHEEL_ACTIVE_TAB, 'wheel'));
}