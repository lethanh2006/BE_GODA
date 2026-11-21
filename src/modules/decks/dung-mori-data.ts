import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { hanVietOf } from './hanviet.js';
import type { DeckCardExample } from '../../database/entities/deck-card.entity.js';
import type { JlptLevel } from '../../database/enums.js';

export interface CatalogCard {
  id: string;
  term: string;
  furigana: string | null;
  reading: string;
  hanviet: string | null;
  wordType: string | null;
  meaning: string;
  examples: DeckCardExample[];
}

export interface CatalogDeck {
  key: string;
  course: string;
  level: JlptLevel;
  chapter: number;
  title: string;
  kind: 'vocab' | 'kanji';
  cards: CatalogCard[];
}

const plain = (text: string) =>
  text.replace(/\{([^|{}]+)\|[^|{}]+\}/g, '$1').trim();
const readingOf = (text: string) =>
  text
    .replace(/\{[^|{}]+\|([^|{}]+)\}/g, '$1')
    .replace(/[~〜\s]/g, '')
    .replace(/[/／]/g, '・')
    .trim();

/** Some source rows put ruby + a hyphen in the Vietnamese field without spaces. */
function wordExample(example: DeckCardExample) {
  const embedded = /^(.+?)\s*[-–—]\s*(.+)$/u.exec(example.vi ?? '');
  if (embedded && plain(embedded[1]) === plain(example.ja)) {
    return { ja: embedded[1].trim(), vi: embedded[2].trim() };
  }
  return { ja: example.ja.trim(), vi: example.vi?.trim() ?? '' };
}

/** One card per spelling + reading per chapter. Homographs with different readings stay distinct. */
export function expandKanjiDeck(deck: CatalogDeck): CatalogDeck {
  if (deck.kind !== 'kanji') return deck;
  const words = new Map<string, CatalogCard>();
  for (const parent of deck.cards) {
    for (const raw of parent.examples) {
      const example = wordExample(raw);
      example.ja = example.ja.replace(
        '{親|しん}[{切|せつ}',
        '{親|しん}{切|せつ}',
      );
      const term = plain(example.ja);
      const reading = readingOf(example.ja);
      if (!term || !example.vi || /[\p{Script=Han}{}|<>]/u.test(reading)) {
        throw new Error(
          `${deck.key}/${parent.id}: invalid kanji vocabulary example`,
        );
      }
      const key = `${term}\0${reading}`;
      const existing = words.get(key);
      if (existing) {
        const meanings = new Set([...existing.meaning.split('; '), example.vi]);
        existing.meaning = [...meanings].join('; ');
        continue;
      }
      // Independent from the source parent/index: reordering never resets a word's FSRS schedule.
      const digest = createHash('sha256')
        .update(key)
        .digest('hex')
        .slice(0, 24);
      words.set(key, {
        id: `kanji-word:${digest}`,
        term,
        furigana: example.ja === term ? null : example.ja,
        reading,
        hanviet: hanVietOf(term),
        wordType: null,
        meaning: example.vi,
        examples: [],
      });
    }
  }
  return { ...deck, cards: [...words.values()] };
}

// Source content is backend-only and remains behind authenticated deck endpoints.
const source = JSON.parse(
  readFileSync(new URL('./data/dung-mori-n4.json', import.meta.url), 'utf8'),
) as { decks: CatalogDeck[] };
export const DUNG_MORI_KANJI_KEYS = source.decks
  .filter((deck) => deck.kind === 'kanji')
  .map((deck) => deck.key);
export const DUNG_MORI_RETIRED_KANJI_IDS = source.decks
  .filter((deck) => deck.kind === 'kanji')
  .flatMap((deck) => deck.cards.map((card) => card.id));
const kanjiKeys = new Set(DUNG_MORI_KANJI_KEYS);
const retiredIds = new Set(DUNG_MORI_RETIRED_KANJI_IDS);
export const isRetiredDungMoriCard = (sourceKey: string, sourceId: string) =>
  kanjiKeys.has(sourceKey) && retiredIds.has(sourceId);
export const DUNG_MORI_CATALOG = { decks: source.decks.map(expandKanjiDeck) };
