import { initTheme } from './theme.js';
import { loadJSON, KEYS } from './storage.js';
import { MotionAudio } from './audio.js?v=3';
import { Haptics } from './haptics.js';
import { initModalDismissal } from './modal.js';
import { initPrimaryTabs, initSoundControl } from './ui-controller.js?v=3';
import { initWheelTab } from './wheel-tab.js?v=12';
import { initDiceTab } from './dice-tab.js?v=7';
import { initVerseModal } from './verse-modal.js';
import { initTooltips } from './tooltip.js';

initTheme();

const soundEnabled = loadJSON(KEYS.SOUND_ENABLED, true);
const motionAudio = new MotionAudio(soundEnabled);
const haptics = new Haptics(soundEnabled);

initSoundControl(motionAudio, haptics);
initModalDismissal();
initPrimaryTabs();
initWheelTab(motionAudio, haptics);
initDiceTab(motionAudio, haptics);
initVerseModal();
initTooltips();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .catch((error) => console.error('Pick! offline installation failed:', error));
  });
}
