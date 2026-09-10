// Thin localStorage wrapper — tolerates private-browsing / quota errors.

const PREFIX = 'pick:';

export function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveJSON(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false; // storage full / disabled — fail silently, state just won't persist
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

export const KEYS = {
  WHEEL_SEGMENTS: 'wheel.segments',
  WHEEL_INPUT_SETS: 'wheel.inputSets',
  WHEEL_WEIGHTS_ENABLED: 'wheel.weightsEnabled',
  WHEEL_STATS: 'wheel.stats',
  WHEEL_ACTIVE_TAB: 'ui.activeTab',
  DICE_MODE: 'dice.mode',
  DICE_STANDARD_STATS: 'dice.standard.stats',
  CATAN_PLAYERS: 'catan.players',
  CATAN_TURN_INDEX: 'catan.turnIndex',
  CATAN_LOG: 'catan.log',
  BIBLE_TRANSLATION: 'bible.translation',
  SOUND_ENABLED: 'ui.soundEnabled',
  THEME: 'ui.theme',
};
