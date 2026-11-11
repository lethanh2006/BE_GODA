import { readFileSync } from 'node:fs';
import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager, In } from 'typeorm';
import { Deck, DeckCard } from '../../database/entities/index.js';
import type { DeckCardExample } from '../../database/entities/deck-card.entity.js';
import type { JlptLevel } from '../../database/enums.js';

interface CatalogDeck {
  key: string;
  course: string;
  level: JlptLevel;
  chapter: number;
  title: string;
  kind: 'vocab' | 'kanji';
  cards: {
    id: string;
    term: string;
    furigana: string | null;
    reading: string;
    hanviet: string | null;
    wordType: string | null;
    meaning: string;
    examples: DeckCardExample[];
  }[];
}

// Chỉ backend đọc dữ liệu; không đặt trong public/ hay gửi xuống trước khi xác thực.
const catalog = JSON.parse(
  readFileSync(new URL('./data/dung-mori-n4.json', import.meta.url), 'utf8'),
) as { decks: CatalogDeck[] };

export const DUNG_MORI_KEYS = catalog.decks.map((deck) => deck.key);
const DUNG_MORI_KEY_SET = new Set(DUNG_MORI_KEYS);
export const isDungMoriDeck = (sourceKey: string) =>
  DUNG_MORI_KEY_SET.has(sourceKey);
export type DeckCollection = 'private' | 'dung-mori-n4';
const CARD_COUNT = catalog.decks.reduce(
  (sum, deck) => sum + deck.cards.length,
  0,
);

/** Nội dung chung, bản thẻ và lịch FSRS riêng cho mỗi tài khoản. Tái dùng bản đã nhập trước đây. */
@Injectable()
export class DungMoriCatalog {
  constructor(private readonly dataSource: DataSource) {}

  async ensureForUser(userId: string) {
    if (await this.isComplete(this.dataSource.manager, userId)) return;
    await this.dataSource.transaction(async (manager) => {
      // Hai tab mở lần đầu cùng lúc vẫn chỉ tạo một bộ, trong một transaction.
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`dung-mori-n4:${userId}`],
      );
      if (await this.isComplete(manager, userId)) return;
      await manager
        .getRepository(Deck)
        .createQueryBuilder()
        .insert()
        .values(
          catalog.decks.map(({ key, cards: _cards, ...deck }, position) => ({
            ...deck,
            userId,
            sourceKey: key,
            position,
          })),
        )
        .orIgnore()
        .execute();
      const saved = await manager.getRepository(Deck).find({
        where: { userId, sourceKey: In(DUNG_MORI_KEYS) },
        select: { id: true, sourceKey: true },
      });
      const ids = new Map(saved.map((deck) => [deck.sourceKey, deck.id]));
      const rows = catalog.decks.flatMap((deck) =>
        deck.cards.map(({ id, ...card }, position) => ({
          ...card,
          deckId: ids.get(deck.key)!,
          sourceId: id,
          position,
        })),
      );
      for (let i = 0; i < rows.length; i += 200) {
        // Không cập nhật lịch ôn hoặc UUID của thẻ cũ.
        await manager
          .getRepository(DeckCard)
          .createQueryBuilder()
          .insert()
          .values(rows.slice(i, i + 200))
          .orIgnore()
          .execute();
      }
    });
  }

  private async isComplete(manager: EntityManager, userId: string) {
    const [counts] = await manager.query<{ decks: number; cards: number }[]>(
      `SELECT COUNT(DISTINCT d.id)::int AS decks, COUNT(c.id)::int AS cards
         FROM decks d LEFT JOIN deck_cards c ON c.deck_id = d.id
        WHERE d.user_id = $1 AND d.source_key = ANY($2::text[])`,
      [userId, DUNG_MORI_KEYS],
    );
    return counts.decks === catalog.decks.length && counts.cards === CARD_COUNT;
  }
}
