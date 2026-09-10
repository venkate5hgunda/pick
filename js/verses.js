// Hidden bible-verse easter egg. Curated references only (avoids landing on
// obscure genealogies), fetched live from the helloao.org Bible API with a
// bundled offline fallback so the egg still works if the network is down.
// This is *not* a "prediction" — just a random pick from a short curated list.

const API_ROOT = 'https://bible.helloao.org/api';
export const DEFAULT_TRANSLATION = 'BSB';

const DEFAULT_TRANSLATION_META = {
  id: DEFAULT_TRANSLATION,
  name: 'Berean Standard Bible',
  shortName: 'BSB',
  languageEnglishName: 'English',
  languageName: 'English',
  textDirection: 'ltr',
};

const REFERENCES = [
  { book: 'JHN', chapter: 3, verse: 16, label: 'John 3:16' },
  { book: 'PSA', chapter: 23, verse: 1, label: 'Psalm 23:1' },
  { book: 'PHP', chapter: 4, verse: 13, label: 'Philippians 4:13' },
  { book: 'JER', chapter: 29, verse: 11, label: 'Jeremiah 29:11' },
  { book: 'PRO', chapter: 3, verse: 5, label: 'Proverbs 3:5' },
  { book: 'ROM', chapter: 8, verse: 28, label: 'Romans 8:28' },
  { book: 'ISA', chapter: 41, verse: 10, label: 'Isaiah 41:10' },
  { book: 'JOS', chapter: 1, verse: 9, label: 'Joshua 1:9' },
  { book: 'PSA', chapter: 46, verse: 1, label: 'Psalm 46:1' },
  { book: 'MAT', chapter: 6, verse: 33, label: 'Matthew 6:33' },
  { book: 'GAL', chapter: 5, verse: 22, label: 'Galatians 5:22' },
  { book: '1CO', chapter: 13, verse: 4, label: '1 Corinthians 13:4' },
];

// Bundled fallback text, keyed by label, used only if the live fetch fails.
const FALLBACK_TEXT = {
  'John 3:16': 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
  'Psalm 23:1': 'The LORD is my shepherd; I shall not want.',
  'Philippians 4:13': 'I can do all things through Christ which strengtheneth me.',
  'Jeremiah 29:11': 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.',
  'Proverbs 3:5': 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.',
  'Romans 8:28': 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.',
  'Isaiah 41:10': 'Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee.',
  'Joshua 1:9': 'Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.',
  'Psalm 46:1': 'God is our refuge and strength, a very present help in trouble.',
  'Matthew 6:33': 'But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.',
  'Galatians 5:22': 'But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith,',
  '1 Corinthians 13:4': 'Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up,',
};

function pickRandomReference() {
  return REFERENCES[Math.floor(Math.random() * REFERENCES.length)];
}

let translationsPromise;

export async function getTranslations() {
  if (!translationsPromise) {
    translationsPromise = fetch(`${API_ROOT}/available_translations.json`, {
      signal: AbortSignal.timeout(6000),
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Bible API responded ${response.status}`);
        return response.json();
      })
      .then(({ translations }) => translations
        .filter((translation) => translation.availableFormats?.includes('json') && translation.numberOfBooks >= 66)
        .sort((left, right) => {
          const languageOrder = left.languageEnglishName.localeCompare(right.languageEnglishName);
          return languageOrder || left.name.localeCompare(right.name);
        }))
      .catch(() => [DEFAULT_TRANSLATION_META]);
  }
  return translationsPromise;
}

export function groupTranslationsByLanguage(translations) {
  return translations.reduce((groups, translation) => {
    const language = translation.languageEnglishName || translation.languageName || 'Other';
    if (!groups.has(language)) groups.set(language, []);
    groups.get(language).push(translation);
    return groups;
  }, new Map());
}

async function fetchVerseText(ref, translationId) {
  const url = `${API_ROOT}/${encodeURIComponent(translationId)}/${ref.book}/${ref.chapter}.json`;
  const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error(`Bible API responded ${res.status}`);
  const data = await res.json();
  const verse = data.chapter?.content?.find((c) => c.type === 'verse' && c.number === ref.verse);
  const text = verse?.content?.map((part) => (typeof part === 'string' ? part : part.text || '')).join(' ').trim();
  if (!text) throw new Error('Verse not found in response');
  return text;
}

/** Returns a random curated verse in the requested translation. */
export async function getRandomVerse(translationId = DEFAULT_TRANSLATION) {
  const ref = pickRandomReference();
  try {
    const text = await fetchVerseText(ref, translationId);
    return { label: ref.label, text, source: 'live', translationId };
  } catch {
    return {
      label: ref.label,
      text: FALLBACK_TEXT[ref.label],
      source: 'offline',
      translationId: DEFAULT_TRANSLATION,
    };
  }
}
