import { loadJSON, saveJSON, KEYS } from './storage.js';
import {
  DEFAULT_TRANSLATION,
  getRandomVerse,
  getTranslations,
  groupTranslationsByLanguage,
} from './verses.js';

export function initVerseModal() {
  const trigger = document.getElementById('easterEggBtn');
  const modal = document.getElementById('verseModal');
  const text = document.getElementById('verseText');
  const reference = document.getElementById('verseRef');
  const attribution = document.getElementById('verseTranslation');
  const versionSelect = document.getElementById('verseVersion');
  const anotherButton = document.getElementById('verseAnother');
  let translations = [];
  let selectedTranslation = loadJSON(KEYS.BIBLE_TRANSLATION, DEFAULT_TRANSLATION);

  async function populateTranslations() {
    versionSelect.disabled = true;
    versionSelect.innerHTML = '<option>Loading translations…</option>';
    translations = await getTranslations();
    const groups = groupTranslationsByLanguage(translations);
    versionSelect.replaceChildren();

    groups.forEach((versions, language) => {
      const group = document.createElement('optgroup');
      group.label = language;
      versions.forEach((version) => {
        const option = document.createElement('option');
        option.value = version.id;
        option.textContent = `${version.name} (${version.shortName})`;
        group.appendChild(option);
      });
      versionSelect.appendChild(group);
    });

    if (!translations.some((version) => version.id === selectedTranslation)) {
      selectedTranslation = translations[0]?.id || DEFAULT_TRANSLATION;
    }
    versionSelect.value = selectedTranslation;
    versionSelect.disabled = false;
  }

  async function showVerse() {
    anotherButton.disabled = true;
    text.textContent = 'Finding a verse…';
    reference.textContent = '';
    attribution.textContent = '';
    const verse = await getRandomVerse(selectedTranslation);
    const version = translations.find((item) => item.id === verse.translationId);
    text.textContent = `“${verse.text}”`;
    reference.textContent = verse.label;
    attribution.textContent = verse.source === 'offline'
      ? 'Offline fallback · Berean Standard Bible'
      : `${version?.name || verse.translationId} · ${version?.languageEnglishName || ''}`;
    anotherButton.disabled = false;
  }

  trigger.addEventListener('click', async () => {
    modal.hidden = false;
    if (!translations.length) await populateTranslations();
    await showVerse();
  });
  versionSelect.addEventListener('change', async () => {
    selectedTranslation = versionSelect.value;
    saveJSON(KEYS.BIBLE_TRANSLATION, selectedTranslation);
    await showVerse();
  });
  anotherButton.addEventListener('click', showVerse);
}