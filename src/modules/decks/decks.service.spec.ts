import { Rating } from 'ts-fsrs';
import type { Repository } from 'typeorm';
import type { Deck, DeckCard, ReviewLog } from '../../database/entities/index.js';
import { newCard, review } from '../vocab/scheduler.js';
import { DecksService } from './decks.service.js';

const USER = '6bcfb80f-87d2-4aef-b5eb-144703fd0920';
const T0 = new Date('2026-11-01T00:00:00Z');

function queryBuilder(raw: unknown[]) {
  const qb: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const step of ['update', 'set', 'where', 'returning']) qb[step] = vi.fn(() => qb);
  qb.execute = vi.fn().mockResolvedValue({ raw, affected: raw.length });
  return qb;
}

function setup() {
  const decks = { existsBy: vi.fn().mockResolvedValue(true) };
  const cards = { findOne: vi.fn(), update: vi.fn().mockResolvedValue({}), createQueryBuilder: vi.fn() };
  const reviewLogs = { insert: vi.fn().mockResolvedValue({}) };
  const service = new DecksService(
    decks as unknown as Repository<Deck>,
    cards as unknown as Repository<DeckCard>,
    reviewLogs as unknown as Repository<ReviewLog>,
  );
  return { service, cards, reviewLogs };
}

describe('DecksService ghi nhật ký ôn', () => {
  it('học xong bài: chỉ đưa thẻ chưa học vào lịch và ghi learn cho đúng các thẻ đó', async () => {
    const { service, cards, reviewLogs } = setup();
    const qb = queryBuilder([{ id: 'c1' }, { id: 'c2' }]);
    cards.createQueryBuilder.mockReturnValue(qb);

    await expect(service.markLearned(USER, 'deck-1')).resolves.toEqual({ learned: 2 });

    expect(qb.where).toHaveBeenCalledWith('"deck_id" = :id AND "due" IS NULL', { id: 'deck-1' });
    expect(qb.returning).toHaveBeenCalledWith(['id']);
    expect(reviewLogs.insert).toHaveBeenCalledWith([
      expect.objectContaining({ userId: USER, itemType: 'deck_card', itemId: 'c1', kind: 'learn', rating: Rating.Good, state: 0 }),
      expect.objectContaining({ itemId: 'c2', kind: 'learn' }),
    ]);
  });

  it('ôn thẻ: lưu lịch mới rồi ghi một dòng review', async () => {
    const { service, cards, reviewLogs } = setup();
    const before = review(newCard(T0), Rating.Good, T0);
    cards.findOne.mockResolvedValue({ id: 'c1', deckId: 'deck-1', ...before });

    await service.review(USER, 'c1', Rating.Again);

    expect(cards.update).toHaveBeenCalledWith({ id: 'c1' }, expect.objectContaining({ lapses: 1 }));
    expect(reviewLogs.insert).toHaveBeenCalledWith([
      expect.objectContaining({ itemType: 'deck_card', itemId: 'c1', kind: 'review', rating: Rating.Again, state: before.state, stability: before.stability }),
    ]);
  });
});
