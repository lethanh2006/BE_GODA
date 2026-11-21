import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager, In } from 'typeorm';
import { Deck, DeckCard } from '../../database/entities/index.js';
import {
  DUNG_MORI_CATALOG as catalog,
  DUNG_MORI_KANJI_KEYS,
  DUNG_MORI_RETIRED_KANJI_IDS,
} from './dung-mori-data.js';

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

  /** Direct chapter links must upgrade before returning or grading their cards. */
  async ensureForDeck(userId: string, deckId: string) {
    const deck = await this.dataSource.getRepository(Deck).findOne({
      where: { id: deckId, userId },
      select: { sourceKey: true },
    });
    if (deck && isDungMoriDeck(deck.sourceKey))
      await this.ensureForUser(userId);
  }

  private async isComplete(manager: EntityManager, userId: string) {
    const [counts] = await manager.query<{ decks: number; cards: number }[]>(
      `SELECT COUNT(DISTINCT d.id)::int AS decks, COUNT(c.id)::int AS cards
         FROM decks d LEFT JOIN deck_cards c ON c.deck_id = d.id
          AND NOT (d.source_key = ANY($3::text[]) AND c.source_id = ANY($4::text[]))
        WHERE d.user_id = $1 AND d.source_key = ANY($2::text[])`,
      [
        userId,
        DUNG_MORI_KEYS,
        DUNG_MORI_KANJI_KEYS,
        DUNG_MORI_RETIRED_KANJI_IDS,
      ],
    );
    return counts.decks === catalog.decks.length && counts.cards === CARD_COUNT;
  }
}
