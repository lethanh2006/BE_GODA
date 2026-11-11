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
    const oldDeck = await db
      .getRepository(Deck)
      .save({
        userId: first.id,
        sourceKey: DUNG_MORI_KEYS[0],
        course: 'Sơ cấp N4',
        level: null,
        chapter: 15,
        title: 'Từ vựng 15A',
        kind: 'vocab',
        position: 0,
      });
    const oldCard = await db
      .getRepository(DeckCard)
      .save({
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
    await db
      .getRepository(Deck)
      .save({
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
    expect(a.decks.reduce((sum, deck) => sum + deck.cards, 0)).toBe(965);
    expect(b.decks.reduce((sum, deck) => sum + deck.cards, 0)).toBe(965);
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
});
