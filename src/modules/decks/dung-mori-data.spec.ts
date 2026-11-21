import { readFileSync } from 'node:fs';
import {
  expandKanjiDeck,
  DUNG_MORI_CATALOG,
  DUNG_MORI_RETIRED_KANJI_IDS,
  isRetiredDungMoriCard,
  type CatalogDeck,
} from './dung-mori-data.js';

const source = JSON.parse(
  readFileSync(new URL('./data/dung-mori-n4.json', import.meta.url), 'utf8'),
) as { decks: CatalogDeck[] };
const chapter15 = source.decks.find((deck) => deck.key === 'dungmori:14931')!;

describe('N4 kanji vocabulary cards', () => {
  it('makes every vocabulary example a card with kana and a clean Vietnamese meaning', () => {
    const deck = expandKanjiDeck(chapter15);
    expect(deck.cards).toHaveLength(21);
    expect(deck.cards.find((card) => card.term === '協力')).toMatchObject({
      furigana: '{協|きょう}{力|りょく}',
      reading: 'きょうりょく',
      meaning: 'hợp tác, hiệp lực',
      hanviet: null,
    });
    expect(deck.cards.find((card) => card.term === '運動します')).toMatchObject(
      { reading: 'うんどうします', meaning: 'vận động, thể dục' },
    );
    expect(deck.cards.map((card) => card.id)).not.toContain('159836');
  });

  it('repairs readings embedded in the meaning and retains distinct readings of the same spelling', () => {
    const deck = DUNG_MORI_CATALOG.decks.find(
      (deck) => deck.chapter === 18 && deck.kind === 'kanji',
    )!;
    expect(deck.cards.find((card) => card.term === '切ります')).toMatchObject({
      reading: 'きります',
      meaning: 'cắt, cứa, ngắt nguồn điện, điện thoại',
    });
    expect(deck.cards.find((card) => card.term === '親切')).toMatchObject({
      reading: 'しんせつ',
    });
    expect(deck.cards.find((card) => card.term === '締め切り')).toMatchObject({
      reading: 'しめきり',
      meaning: 'hạn chót',
    });
    const homographs = DUNG_MORI_CATALOG.decks
      .find((deck) => deck.chapter === 27 && deck.kind === 'kanji')!
      .cards.filter((card) => card.term === '降ります');
    expect(homographs.map((card) => card.reading).sort()).toEqual([
      'おります',
      'ふります',
    ]);
    expect(new Set(homographs.map((card) => card.id)).size).toBe(2);
  });

  it('deduplicates term + reading, merges meanings and keeps IDs stable after parent reordering', () => {
    const first = chapter15.cards[0];
    const deck: CatalogDeck = {
      ...chapter15,
      cards: [
        { ...first, examples: [{ ja: '{力|ちから}', vi: 'sức mạnh' }] },
        {
          ...first,
          id: 'other-parent',
          examples: [{ ja: '{力|ちから}', vi: 'sức lực' }],
        },
      ],
    };
    const expanded = expandKanjiDeck(deck);
    expect(expanded.cards).toHaveLength(1);
    expect(expanded.cards[0].meaning).toBe('sức mạnh; sức lực');
    const reversed = expandKanjiDeck({
      ...chapter15,
      cards: [...chapter15.cards].reverse(),
    });
    expect(
      Object.fromEntries(reversed.cards.map((card) => [card.term, card.id])),
    ).toEqual(
      Object.fromEntries(
        expandKanjiDeck(chapter15).cards.map((card) => [card.term, card.id]),
      ),
    );
  });

  it('keeps vocabulary lessons intact and validates every expanded card in all 19 chapters', () => {
    expect(DUNG_MORI_CATALOG.decks).toHaveLength(63);
    const kanji = DUNG_MORI_CATALOG.decks.filter(
      (deck) => deck.kind === 'kanji',
    );
    expect(kanji).toHaveLength(19);
    for (const deck of DUNG_MORI_CATALOG.decks) {
      if (deck.kind === 'vocab') {
        expect(deck).toEqual(
          source.decks.find((item) => item.key === deck.key),
        );
        continue;
      }
      expect(new Set(deck.cards.map((card) => card.id)).size).toBe(
        deck.cards.length,
      );
      for (const card of deck.cards) {
        expect(card.term).not.toMatch(/[{}|<>]/);
        expect(card.reading).toMatch(/^[ぁ-ゖァ-ヶー\s（）()・]+$/u);
        expect(card.meaning).toBeTruthy();
        expect(card.meaning).not.toMatch(/[{}|<>ぁ-ゖァ-ヶ一-龯]/u);
      }
    }
    expect(DUNG_MORI_RETIRED_KANJI_IDS).toHaveLength(200);
    expect(isRetiredDungMoriCard('dungmori:14931', '159836')).toBe(true);
    expect(isRetiredDungMoriCard('private:test', '159836')).toBe(false);
    expect(isRetiredDungMoriCard('dungmori:11533', '159836')).toBe(false);
  });
});
