import { Rating } from 'ts-fsrs';
import { newCard, preview, review, reviewWithLog } from './scheduler.js';

const DAY = 86_400_000;
const NOW = new Date('2026-11-01T00:00:00Z');

describe('lịch ôn FSRS', () => {
  it('thẻ mới đến hạn ngay', () => {
    expect(newCard(NOW).due).toEqual(NOW);
    expect(newCard(NOW).reps).toBe(0);
  });

  it('chấm càng tốt, lần ôn sau càng xa', () => {
    const { again, hard, good, easy } = preview(newCard(NOW), NOW);
    expect(hard.getTime()).toBeGreaterThanOrEqual(again.getTime());
    expect(good.getTime()).toBeGreaterThan(hard.getTime());
    expect(easy.getTime()).toBeGreaterThan(good.getTime());
  });

  it('nhớ liên tiếp thì khoảng cách tăng dần', () => {
    const first = review(newCard(NOW), Rating.Good, NOW);
    const second = review(first, Rating.Good, first.due);
    const gap = (card: { due: Date; lastReview: Date | null }) => card.due.getTime() - card.lastReview!.getTime();
    expect(gap(first)).toBeGreaterThanOrEqual(DAY);
    expect(gap(second)).toBeGreaterThan(gap(first));
    expect(second.reps).toBe(2);
  });

  it('quên thì tăng số lần quên và ôn lại sớm', () => {
    const learned = review(review(newCard(NOW), Rating.Good, NOW), Rating.Good, new Date(NOW.getTime() + 3 * DAY));
    const forgot = review(learned, Rating.Again, learned.due);
    expect(forgot.lapses).toBe(1);
    expect(forgot.due.getTime() - learned.due.getTime()).toBeLessThanOrEqual(2 * DAY);
  });

  it('giữ nguyên kết quả khi đọc lại từ các trường đã lưu', () => {
    const card = review(newCard(NOW), Rating.Good, NOW);
    const roundTrip = JSON.parse(JSON.stringify(card), (key, value: unknown) =>
      key === 'due' || key === 'lastReview' ? new Date(value as string) : value,
    ) as typeof card;
    expect(review(roundTrip, Rating.Good, card.due)).toEqual(review(card, Rating.Good, card.due));
  });

  it('nhật ký ôn chụp thẻ TRƯỚC lần ôn, lịch mới nằm ở next', () => {
    const first = review(newCard(NOW), Rating.Good, NOW);
    const later = new Date(first.due.getTime() + DAY);
    const { next, log } = reviewWithLog(first, Rating.Hard, later);
    expect(log).toEqual({
      rating: Rating.Hard,
      state: first.state,
      stability: first.stability,
      difficulty: first.difficulty,
      scheduledDays: first.scheduledDays,
      lastReview: first.lastReview,
      reviewedAt: later,
    });
    expect(next).toEqual(review(first, Rating.Hard, later));
    expect(next.stability).not.toBe(log.stability);
  });

  it('thẻ mới: nhật ký ghi trạng thái 0 và chưa có lần ôn trước', () => {
    const { log } = reviewWithLog(newCard(NOW), Rating.Good, NOW);
    expect(log).toMatchObject({ rating: Rating.Good, state: 0, stability: 0, difficulty: 0, lastReview: null });
  });
});
