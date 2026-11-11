import { Rating } from 'ts-fsrs';
import type { Repository } from 'typeorm';
import type { ReviewLog, UserWord, Word } from '../../database/entities/index.js';
import { newCard, review } from './scheduler.js';
import { StudyService } from './study.service.js';

const USER = '6bcfb80f-87d2-4aef-b5eb-144703fd0920';
const T0 = new Date('2026-11-01T00:00:00Z');

/** Query builder giả: mọi bước trả lại chính nó, `execute` trả `raw` cho trước. */
function queryBuilder(raw: unknown[]) {
  const qb: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const step of ['insert', 'values', 'orIgnore', 'returning']) qb[step] = vi.fn(() => qb);
  qb.execute = vi.fn().mockResolvedValue({ raw, affected: raw.length });
  return qb;
}

function setup() {
  const userWords = { findOneBy: vi.fn(), update: vi.fn().mockResolvedValue({}), createQueryBuilder: vi.fn() };
  const words = { find: vi.fn() };
  const reviewLogs = { insert: vi.fn().mockResolvedValue({}) };
  const service = new StudyService(
    userWords as unknown as Repository<UserWord>,
    words as unknown as Repository<Word>,
    reviewLogs as unknown as Repository<ReviewLog>,
  );
  return { service, userWords, words, reviewLogs };
}

describe('StudyService ghi nhật ký ôn', () => {
  it('ôn một từ: lưu lịch mới trước, rồi ghi một dòng review với trạng thái trước khi ôn', async () => {
    const { service, userWords, reviewLogs } = setup();
    const before = review(newCard(T0), Rating.Good, T0);
    userWords.findOneBy.mockResolvedValue({ userId: USER, wordId: 'w1', ...before });

    const result = await service.review(USER, 'w1', Rating.Hard);

    expect(userWords.update).toHaveBeenCalledWith({ userId: USER, wordId: 'w1' }, expect.objectContaining({ due: result.due }));
    expect(reviewLogs.insert).toHaveBeenCalledWith([
      {
        userId: USER,
        itemType: 'word',
        itemId: 'w1',
        kind: 'review',
        rating: Rating.Hard,
        state: before.state,
        stability: before.stability,
        difficulty: before.difficulty,
        scheduledDays: before.scheduledDays,
        lastReview: before.lastReview,
        reviewedAt: expect.any(Date),
      },
    ]);
    expect(userWords.update.mock.invocationCallOrder[0]).toBeLessThan(reviewLogs.insert.mock.invocationCallOrder[0]);
  });

  it('học xong bài: chỉ ghi learn cho từ vừa được thêm, bỏ qua từ đã có trong sổ', async () => {
    const { service, userWords, words, reviewLogs } = setup();
    words.find.mockResolvedValue([{ id: 'w1' }, { id: 'w2' }]);
    const qb = queryBuilder([{ word_id: 'w2' }]);
    userWords.createQueryBuilder.mockReturnValue(qb);

    await expect(service.addWords(USER, ['w1', 'w2'], true)).resolves.toEqual({ added: 1 });

    expect(qb.returning).toHaveBeenCalledWith(['wordId']);
    expect(reviewLogs.insert).toHaveBeenCalledWith([
      expect.objectContaining({ itemType: 'word', itemId: 'w2', kind: 'learn', rating: Rating.Good, state: 0, lastReview: null }),
    ]);
  });

  it('thêm từ vào sổ mà không qua bài học thì không ghi nhật ký', async () => {
    const { service, userWords, words, reviewLogs } = setup();
    words.find.mockResolvedValue([{ id: 'w1' }]);
    userWords.createQueryBuilder.mockReturnValue(queryBuilder([{ word_id: 'w1' }]));

    await expect(service.addWords(USER, ['w1'])).resolves.toEqual({ added: 1 });
    expect(reviewLogs.insert).not.toHaveBeenCalled();
  });
});
