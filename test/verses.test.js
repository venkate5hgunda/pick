import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupTranslationsByLanguage } from '../js/verses.js';

test('translations are grouped by their English language name', () => {
  const translations = [
    { id: 'eng_one', languageEnglishName: 'English' },
    { id: 'spa_one', languageEnglishName: 'Spanish' },
    { id: 'eng_two', languageEnglishName: 'English' },
  ];

  const groups = groupTranslationsByLanguage(translations);

  assert.deepEqual(groups.get('English').map(({ id }) => id), ['eng_one', 'eng_two']);
  assert.deepEqual(groups.get('Spanish').map(({ id }) => id), ['spa_one']);
});

test('translations with missing language metadata use the Other group', () => {
  const groups = groupTranslationsByLanguage([{ id: 'unknown' }]);
  assert.equal(groups.get('Other')[0].id, 'unknown');
});