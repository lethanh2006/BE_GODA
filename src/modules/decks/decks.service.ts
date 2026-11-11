import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Rating } from 'ts-fsrs';
import { Deck, DeckCard, ReviewLog } from '../../database/entities/index.js';
import type { JlptLevel } from '../../database/enums.js';
import { saveReviewLogs } from '../vocab/review-log.js';
import { type CardFields, newCard, preview, reviewWithLog } from '../vocab/scheduler.js';

const QUEUE_LIMIT = 50;

/** Lịch ôn của thẻ ở dạng scheduler cần; thẻ chưa học coi như đến hạn ngay. */
const scheduleOf = (card: DeckCard, now: Date): CardFields => ({
  state: card.state,
  due: card.due ?? now,
  stability: card.stability,
  difficulty: card.difficulty,
  scheduledDays: card.scheduledDays,
  learningSteps: card.learningSteps,
  reps: card.reps,
  lapses: card.lapses,
  lastReview: card.lastReview,
});

const toCardView = (card: DeckCard) => ({
  id: card.id,
  term: card.term,
  furigana: card.furigana,
  reading: card.reading,
  hanviet: card.hanviet,
  wordType: card.wordType,
  meaning: card.meaning,
  examples: card.examples,
  learned: card.due !== null,
});

@Injectable()
export class DecksService {
  constructor(
    @InjectRepository(Deck) private readonly decks: Repository<Deck>,
    @InjectRepository(DeckCard) private readonly cards: Repository<DeckCard>,
    @InjectRepository(ReviewLog) private readonly reviewLogs: Repository<ReviewLog>,
  ) {}

  async list(userId: string) {
    const rows = await this.decks.query<
      {
        id: string;
        course: string;
        level: JlptLevel | null;
        chapter: number | null;
        title: string;
        kind: string;
        cards: number;
        learned: number;
        due: number;
      }[]
    >(
      `SELECT d.id, d.course, d.level, d.chapter, d.title, d.kind,
              COUNT(c.id)::int AS cards,
              COUNT(c.due)::int AS learned,
              COUNT(*) FILTER (WHERE c.due <= now())::int AS due
         FROM decks d LEFT JOIN deck_cards c ON c.deck_id = d.id
        WHERE d.user_id = $1
        GROUP BY d.id
        ORDER BY d.position`,
      [userId],
    );
    return { due: rows.reduce((sum, row) => sum + row.due, 0), decks: rows };
  }

  async detail(userId: string, id: string) {
    const deck = await this.decks.findOne({
      where: { id, userId },
      relations: { cards: true },
      order: { cards: { position: 'ASC' } },
    });
    if (!deck) throw new NotFoundException('Không tìm thấy bộ thẻ');
    const siblings = await this.decks.find({ where: { userId }, select: { id: true }, order: { position: 'ASC' } });
    const index = siblings.findIndex((d) => d.id === id);
    return {
      id: deck.id,
      course: deck.course,
      level: deck.level,
      chapter: deck.chapter,
      title: deck.title,
      kind: deck.kind,
      prevId: siblings[index - 1]?.id ?? null,
      nextId: siblings[index + 1]?.id ?? null,
      cards: deck.cards.map(toCardView),
    };
  }

  /** Học xong bài: thẻ chưa học vào lịch ôn như đã chấm "Nhớ" lần đầu; thẻ đã có lịch giữ nguyên. */
  async markLearned(userId: string, id: string) {
    if (!(await this.decks.existsBy({ id, userId }))) throw new NotFoundException('Không tìm thấy bộ thẻ');
    const now = new Date();
    const { next, log } = reviewWithLog(newCard(now), Rating.Good, now);
    const result = await this.cards
      .createQueryBuilder()
      .update()
      .set(next)
      .where('"deck_id" = :id AND "due" IS NULL', { id })
      .returning(['id'])
      .execute();
    const learned = ((result.raw ?? []) as { id: string }[]).map((row) => row.id);
    await saveReviewLogs(this.reviewLogs, userId, 'deck_card', 'learn', learned.map((itemId) => ({ itemId, log })));
    return { learned: result.affected ?? learned.length };
  }

  async queue(userId: string, limit: number) {
    const now = new Date();
    const [rows, total] = await this.cards
      .createQueryBuilder('c')
      .innerJoinAndSelect('c.deck', 'd')
      .where('d.userId = :userId AND c.due <= :now', { userId, now })
      .orderBy('c.due', 'ASC')
      .take(Math.min(limit, QUEUE_LIMIT))
      .getManyAndCount();
    return {
      total,
      cards: rows.map((row) => ({
        ...toCardView(row),
        deckTitle: row.deck.title,
        state: row.state,
        preview: preview(scheduleOf(row, now), now),
      })),
    };
  }

  async review(userId: string, cardId: string, rating: 1 | 2 | 3 | 4) {
    const card = await this.cards.findOne({ where: { id: cardId, deck: { userId } } });
    if (!card?.due) throw new NotFoundException('Thẻ này chưa có trong lịch ôn');
    const now = new Date();
    const { next, log } = reviewWithLog(scheduleOf(card, now), rating, now);
    await this.cards.update({ id: cardId }, next);
    await saveReviewLogs(this.reviewLogs, userId, 'deck_card', 'review', [{ itemId: cardId, log }]);
    return { due: next.due, state: next.state };
  }
}
