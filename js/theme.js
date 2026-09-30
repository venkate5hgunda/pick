import { loadJSON, saveJSON, KEYS } from './storage.js';

const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
const MODES = ['auto', 'light', 'dark'];
const MODE_LABELS = { auto: 'Auto', light: 'Light', dark: 'Dark' };

function effectiveTheme(mode) {
  if (mode === 'auto') return media && media.matches ? 'dark' : 'light';
  return mode;
}

function apply(mode) {
  const theme = effectiveTheme(mode);
  document.documentElement.setAttribute('data-theme', theme);
  window.dispatchEvent(new CustomEvent('pick:themechange', { detail: theme }));
  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.dataset.mode = mode;
    const label = `Theme: ${MODE_LABELS[mode]}${mode === 'auto' ? ` (${theme})` : ''}`;
    toggle.setAttribute('aria-label', label);
    toggle.dataset.tooltip = `${label} — click to change`;
  }
}

export function initTheme() {
  // 'auto' | 'light' | 'dark'; defaults to 'auto' unless the user has
  // explicitly overridden it before.
  let mode = loadJSON(KEYS.THEME, 'auto');
  if (!MODES.includes(mode)) mode = 'auto';
  apply(mode);

  if (media) {
    media.addEventListener('change', () => {
      // Only follow the OS when the user hasn't pinned an explicit mode.
      if (mode === 'auto') apply('auto');
    });
  }

  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
      saveJSON(KEYS.THEME, mode);
      apply(mode);
    });
  }
}
