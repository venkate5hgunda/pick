import { loadJSON, saveJSON, KEYS } from './storage.js';

export function initSoundControl(motionAudio) {
  const toggle = document.getElementById('soundToggle');
  const apply = (enabled) => {
    motionAudio.setEnabled(enabled);
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
      panel.hidden = name !== tabName;
    });
    saveJSON(KEYS.WHEEL_ACTIVE_TAB, tabName);
  }

  tabButtons.forEach((button) => button.addEventListener('click', () => activate(button.dataset.tab)));
  activate(loadJSON(KEYS.WHEEL_ACTIVE_TAB, 'wheel'));
}