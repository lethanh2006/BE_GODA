import { readFileSync } from 'node:fs';

const data = JSON.parse(
  readFileSync(
    new URL('./data/hanviet-readings.json', import.meta.url),
    'utf8',
  ),
) as {
  characters: Record<string, string>;
  words: Record<string, string>;
};

/** Read the kanji in a word; kana is pronunciation, not part of its Han-Viet reading. */
export function hanVietOf(term: string): string | null {
  if (data.words[term]) return data.words[term];
  const characters = Array.from(term).filter(
    (char) => /\p{Script=Han}/u.test(char) && char !== '々',
  );
  if (!characters.length) return null;
  const parts = characters.map((char) => data.characters[char]);
  return parts.every(Boolean) ? parts.join(' ') : null;
}
