/** Lịch ôn tập ngắt quãng bằng thuật toán FSRS. */
import { type Card, createEmptyCard, fsrs, type Grade, Rating, State } from 'ts-fsrs';
import type { UserWord } from '../../database/entities/index.js';

/**
 * Tắt các bước học trong ngày: thẻ chỉ được tạo sau khi người học đã qua bài học và bài kiểm tra,
 * nên lần ôn đầu tiên tính theo ngày thay vì sau vài phút.
 */
const scheduler = fsrs({ enable_short_term: false, request_retention: 0.9, maximum_interval: 365 });

export type CardFields = Pick<
  UserWord,
  'state' | 'due' | 'stability' | 'difficulty' | 'scheduledDays' | 'learningSteps' | 'reps' | 'lapses' | 'lastReview'
>;

const toCard = (row: CardFields): Card => ({
  ...createEmptyCard(row.due),
  due: row.due,
  stability: row.stability,
  difficulty: row.difficulty,
  scheduled_days: row.scheduledDays,
  learning_steps: row.learningSteps,
  reps: row.reps,
  lapses: row.lapses,
  state: row.state as State,
  last_review: row.lastReview ?? undefined,
});

const fromCard = (card: Card): CardFields => ({
  state: card.state,
  due: card.due,
  stability: card.stability,
  difficulty: card.difficulty,
  scheduledDays: card.scheduled_days,
  learningSteps: card.learning_steps,
  reps: card.reps,
  lapses: card.lapses,
  lastReview: card.last_review ?? null,
});

/** Thẻ mới tinh, đến hạn ngay. */
export const newCard = (now: Date): CardFields => fromCard(createEmptyCard(now));

export const review = (row: CardFields, rating: Grade, now: Date): CardFields =>
  fromCard(scheduler.next(toCard(row), now, rating).card);

/** Lịch ôn tiếp theo cho cả 4 lựa chọn, hiển thị trên nút đánh giá. */
export function preview(row: CardFields, now: Date) {
  const result = scheduler.repeat(toCard(row), now);
  return {
    again: result[Rating.Again].card.due,
    hard: result[Rating.Hard].card.due,
    good: result[Rating.Good].card.due,
    easy: result[Rating.Easy].card.due,
  };
}

/** Đã nhớ chắc: khoảng cách ôn từ 21 ngày trở lên. */
export const MATURE_DAYS = 21;
