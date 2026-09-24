import { initTheme } from './theme.js';
import { loadJSON, KEYS } from './storage.js';
import { MotionAudio } from './audio.js?v=2';
import { initModalDismissal } from './modal.js';
import { initPrimaryTabs, initSoundControl } from './ui-controller.js';
import { initWheelTab } from './wheel-tab.js?v=10';
import { initDiceTab } from './dice-tab.js?v=5';
import { initVerseModal } from './verse-modal.js';
import { initTooltips } from './tooltip.js';

initTheme();

const motionAudio = new MotionAudio(loadJSON(KEYS.SOUND_ENABLED, true));

initSoundControl(motionAudio);
initModalDismissal();
initPrimaryTabs();
initWheelTab(motionAudio);
initDiceTab(motionAudio);
initVerseModal();
initTooltips();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .catch((error) => console.error('Pick! offline installation failed:', error));
  });
}
