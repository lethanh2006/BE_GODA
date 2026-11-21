import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../../database/data-source.js';
import {
  Deck,
  DeckCard,
  ReviewLog,
  User,
} from '../../database/entities/index.js';
import { DungMoriCatalog, DUNG_MORI_KEYS } from './dung-mori-catalog.js';
import { DecksService } from './decks.service.js';

// Chỉ chạy với database thử riêng; không đọc DATABASE_URL của ứng dụng.
const testUrl = process.env.TEST_DATABASE_URL;
describe.skipIf(!testUrl)('N4 Dũng Mori trên Postgres', () => {
  let db: DataSource;
  let catalog: DungMoriCatalog;
  let service: DecksService;
  let first: User;
  let second: User;

  beforeAll(async () => {
    if (!new URL(testUrl!).pathname.startsWith('/goda_decks_test')) {
      throw new Error(
        'TEST_DATABASE_URL phải trỏ tới database goda_decks_test* dành riêng cho kiểm thử',
      );
    }
    db = await new DataSource({
      ...dataSourceOptions(testUrl!),
      migrationsRun: true,
    }).initialize();
    catalog = new DungMoriCatalog(db);
    service = new DecksService(
      db.getRepository(Deck),
      db.getRepository(DeckCard),
      db.getRepository(ReviewLog),
    );
    [first, second] = await db.getRepository(User).save(
      ['first', 'second'].map((name) => ({
        email: `dungmori-${name}-${crypto.randomUUID()}@example.com`,
        passwordHash: 'test-only',
        displayName: name,
      })),
    );
  }, 30_000);

  afterAll(async () => {
    if (db?.isInitialized) {
      if (first && second)
        await db.getRepository(User).delete([first.id, second.id]);
      await db.destroy();
    }
  });

  it('provisions all lessons once under concurrent requests, separates private content and preserves old progress', async () => {
    // Mô phỏng bộ thẻ đã nhập vào tài khoản trước thay đổi này.
    const oldDeck = await db.getRepository(Deck).save({
      userId: first.id,
      sourceKey: DUNG_MORI_KEYS[0],
      course: 'Sơ cấp N4',
      level: null,
      chapter: 15,
      title: 'Từ vựng 15A',
      kind: 'vocab',
      position: 0,
    });
    const oldCard = await db.getRepository(DeckCard).save({
      deckId: oldDeck.id,
      sourceId: '115986',
      term: 'test',
      reading: 'test',
      meaning: 'test',
      position: 0,
      examples: [],
      due: new Date('2026-01-01T00:00:00Z'),
      reps: 8,
      stability: 4,
      difficulty: 5,
      state: 2,
      lastReview: new Date('2026-01-01T00:00:00Z'),
    });
    await db.getRepository(Deck).save({
      userId: first.id,
      sourceKey: 'private:test',
      course: 'Riêng',
      level: null,
      chapter: null,
      title: 'Bộ riêng',
      kind: 'vocab',
      position: 0,
    });
    await Promise.all([
      catalog.ensureForUser(first.id),
      catalog.ensureForUser(first.id),
      catalog.ensureForUser(second.id),
    ]);
    const a = await service.list(first.id, 'dung-mori-n4');
    const b = await service.list(second.id, 'dung-mori-n4');
    expect(a.decks).toHaveLength(63);
    expect(b.decks).toHaveLength(63);
    expect(b.decks.every((deck) => deck.level === 'N4')).toBe(true);
    expect(a.decks.reduce((sum, deck) => sum + deck.cards, 0)).toBe(1236);
    expect(b.decks.reduce((sum, deck) => sum + deck.cards, 0)).toBe(1236);
    expect(a.decks[0].id).toBe(oldDeck.id);
    expect(
      await db.getRepository(DeckCard).findOneByOrFail({ id: oldCard.id }),
    ).toMatchObject({ due: oldCard.due, reps: 8, stability: 4 });
    expect(
      (await service.list(first.id)).decks.map((deck) => deck.title),
    ).toEqual(['Bộ riêng']);
    expect((await service.list(second.id)).decks).toEqual([]);

    const detail = await service.detail(first.id, a.decks[0].id);
    expect(detail.collection).toBe('dung-mori-n4');
    expect(detail.prevId).toBeNull();
    expect(detail.nextId).toBe(a.decks[1].id);
    await service.markLearned(first.id, a.decks[0].id);
    expect(
      (await service.list(first.id, 'dung-mori-n4')).decks[0].learned,
    ).toBe(a.decks[0].cards);
    expect(
      (await service.list(second.id, 'dung-mori-n4')).decks[0].learned,
    ).toBe(0);
    expect((await service.queue(first.id, 20)).total).toBe(0);
    expect((await service.queue(first.id, 20, 'dung-mori-n4')).total).toBe(1);
    await expect(service.detail(second.id, a.decks[0].id)).rejects.toThrow(
      'Không tìm thấy bộ thẻ',
    );
    await expect(service.markLearned(second.id, a.decks[0].id)).rejects.toThrow(
      'Không tìm thấy bộ thẻ',
    );
    await expect(
      service.review(second.id, detail.cards[0].id, 3),
    ).rejects.toThrow();
    const saved = await service.list(first.id, 'dung-mori-n4');
    await catalog.ensureForUser(first.id);
    expect(await service.list(first.id, 'dung-mori-n4')).toEqual(saved);
  }, 30_000);

  it('upgrades a bookmarked kanji chapter, keeps retired progress and grades only vocabulary cards', async () => {
    const user = await db.getRepository(User).save({
      email: `kanji-upgrade-${crypto.randomUUID()}@example.com`,
      passwordHash: 'test-only',
      displayName: 'kanji-upgrade',
    });
    try {
      const oldDeck = await db.getRepository(Deck).save({
        userId: user.id,
        sourceKey: 'dungmori:14931',
        course: 'Sơ cấp N4',
        level: null,
        chapter: 15,
        title: 'Chữ Hán chương 15',
        kind: 'kanji',
        position: 2,
      });
      const old = await db.getRepository(DeckCard).save({
        deckId: oldDeck.id,
        sourceId: '159836',
        term: '力',
        reading: '',
        meaning: 'sức lực',
        examples: [],
        position: 0,
        due: new Date('2026-01-01T00:00:00Z'),
        reps: 9,
        stability: 12,
        difficulty: 4,
        state: 2,
      });
      const neverLearned = await db.getRepository(DeckCard).save({
        deckId: oldDeck.id,
        sourceId: '159837',
        term: '動',
        reading: '',
        meaning: 'chuyển động',
        examples: [],
        position: 1,
      });
      // The same source ID in a private deck is unrelated and remains visible/reviewable.
      const privateDeck = await db.getRepository(Deck).save({
        userId: user.id,
        sourceKey: 'private:collision',
        course: 'Riêng',
        level: null,
        chapter: null,
        title: 'Riêng',
        kind: 'kanji',
        position: 100,
      });
      const privateCard = await db.getRepository(DeckCard).save({
        deckId: privateDeck.id,
        sourceId: old.sourceId,
        term: '力',
        reading: 'ちから',
        meaning: 'sức mạnh',
        examples: [],
        position: 0,
        due: old.due,
      });
      await Promise.all([
        catalog.ensureForDeck(user.id, oldDeck.id),
        catalog.ensureForDeck(user.id, oldDeck.id),
      ]);
      const detail = await service.detail(user.id, oldDeck.id);
      expect(detail.cards).toHaveLength(21);
      expect(detail.cards.find((card) => card.term === '協力')).toMatchObject({
        reading: 'きょうりょく',
        speechText: 'きょうりょく',
        meaning: 'hợp tác, hiệp lực',
      });
      expect(detail.cards.some((card) => card.id === old.id)).toBe(false);
      expect(
        (await service.list(user.id, 'dung-mori-n4')).decks.find(
          (deck) => deck.id === oldDeck.id,
        ),
      ).toMatchObject({ cards: 21, learned: 0, due: 0 });
      expect((await service.queue(user.id, 50, 'dung-mori-n4')).total).toBe(0);
      expect(
        (await service.queue(user.id, 50)).cards.map((card) => card.id),
      ).toEqual([privateCard.id]);
      expect(
        (await service.detail(user.id, privateDeck.id)).cards.map(
          (card) => card.id,
        ),
      ).toEqual([privateCard.id]);
      await expect(service.review(user.id, old.id, 3)).rejects.toThrow();
      await expect(
        service.completePractice(user.id, oldDeck.id, {
          mode: 'matching',
          answers: [
            { cardId: old.id, answerId: old.id },
            ...detail.cards
              .slice(1)
              .map((card) => ({ cardId: card.id, answerId: card.id })),
          ],
        }),
      ).rejects.toThrow();
      expect(
        await service.completePractice(user.id, oldDeck.id, {
          mode: 'matching',
          answers: detail.cards.map((card) => ({
            cardId: card.id,
            answerId: card.id,
          })),
        }),
      ).toMatchObject({ correct: 21, total: 21, completed: true, learned: 21 });
      expect(
        await db.getRepository(DeckCard).findOneByOrFail({ id: old.id }),
      ).toMatchObject({ due: old.due, reps: 9, stability: 12 });
      expect(
        (
          await db
            .getRepository(DeckCard)
            .findOneByOrFail({ id: neverLearned.id })
        ).due,
      ).toBeNull();
      const wordBefore = await db
        .getRepository(DeckCard)
        .findOneByOrFail({ id: detail.cards[0].id });
      await catalog.ensureForUser(user.id);
      expect(
        await db.getRepository(DeckCard).findOneByOrFail({ id: wordBefore.id }),
      ).toMatchObject({
        sourceId: wordBefore.sourceId,
        due: wordBefore.due,
        reps: wordBefore.reps,
      });
      const learned = (await service.detail(user.id, oldDeck.id)).cards;
      expect(learned.every((card) => card.learned)).toBe(true);
      await service.review(user.id, privateCard.id, 3);
      await expect(service.detail(second.id, oldDeck.id)).rejects.toThrow();
    } finally {
      await db.getRepository(User).delete(user.id);
    }
  }, 30_000);
});
