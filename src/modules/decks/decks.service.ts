import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, type Repository } from 'typeorm';
import { Rating } from 'ts-fsrs';
import { Deck, DeckCard, ReviewLog } from '../../database/entities/index.js';
import type { JlptLevel } from '../../database/enums.js';
import type { CompleteDeckPracticeDto } from './dto/deck.dto.js';
import { saveReviewLogs } from '../vocab/review-log.js';
import {
  DUNG_MORI_KEYS,
  isDungMoriDeck,
  type DeckCollection,
} from './dung-mori-catalog.js';
import {
  DUNG_MORI_KANJI_KEYS,
  DUNG_MORI_RETIRED_KANJI_IDS,
  isRetiredDungMoriCard,
} from './dung-mori-data.js';
import {
  type CardFields,
  newCard,
  preview,
  reviewWithLog,
} from '../vocab/scheduler.js';

const QUEUE_LIMIT = 50;
const activeCards = (deck: Deck) =>
  deck.cards.filter(
    (card) => !isRetiredDungMoriCard(deck.sourceKey, card.sourceId),
  );

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

const speechText = (text: string) =>
  text
    .replace(/\{([^|{}]+)\|([^|{}]+)\}/g, '$2')
    .replace(/[（()）]/g, '')
    .trim();

const toCardView = (card: DeckCard) => ({
  id: card.id,
  term: card.term,
  furigana: card.furigana,
  reading: card.reading,
  hanviet: card.hanviet,
  wordType: card.wordType,
  meaning: card.meaning,
  speechText: speechText(card.reading || card.furigana || card.term),
  examples: card.examples.map((example) => ({
    ...example,
    speechText: example.ja.replace(/\{([^|{}]+)\|([^|{}]+)\}/g, '$1').trim(),
  })),
  learned: card.due !== null,
});

@Injectable()
export class DecksService {
  constructor(
    @InjectRepository(Deck) private readonly decks: Repository<Deck>,
    @InjectRepository(DeckCard) private readonly cards: Repository<DeckCard>,
    @InjectRepository(ReviewLog)
    private readonly reviewLogs: Repository<ReviewLog>,
  ) {}

  async list(userId: string, collection: DeckCollection = 'private') {
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
          AND NOT (d.source_key = ANY($4::text[]) AND c.source_id = ANY($5::text[]))
        WHERE d.user_id = $1 AND (d.source_key = ANY($2::text[])) = $3
        GROUP BY d.id
        ORDER BY d.position`,
      [
        userId,
        DUNG_MORI_KEYS,
        collection === 'dung-mori-n4',
        DUNG_MORI_KANJI_KEYS,
        DUNG_MORI_RETIRED_KANJI_IDS,
      ],
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
    const collection = isDungMoriDeck(deck.sourceKey)
      ? 'dung-mori-n4'
      : 'private';
    const siblings = await this.decks.find({
      where: {
        userId,
        sourceKey:
          collection === 'dung-mori-n4'
            ? In(DUNG_MORI_KEYS)
            : Not(In(DUNG_MORI_KEYS)),
      },
      select: { id: true },
      order: { position: 'ASC' },
    });
    const index = siblings.findIndex((d) => d.id === id);
    return {
      id: deck.id,
      collection,
      course: deck.course,
      level: deck.level,
      chapter: deck.chapter,
      title: deck.title,
      kind: deck.kind,
      prevId: siblings[index - 1]?.id ?? null,
      nextId: siblings[index + 1]?.id ?? null,
      cards: activeCards(deck).map(toCardView),
    };
  }

  /** Kiểm tra toàn bộ thẻ bằng dữ liệu của chủ bộ thẻ trước khi đưa vào lịch ôn. */
  async completePractice(
    userId: string,
    id: string,
    dto: CompleteDeckPracticeDto,
  ) {
    const deck = await this.decks.findOne({
      where: { id, userId },
      relations: { cards: true },
    });
    if (!deck) throw new NotFoundException('Không tìm thấy bộ thẻ');
    const cards = activeCards(deck);
    const byId = new Map(cards.map((card) => [card.id, card]));
    const submitted = new Set(dto.answers.map((answer) => answer.cardId));
    if (
      !cards.length ||
      dto.answers.length !== cards.length ||
      submitted.size !== cards.length
    ) {
      throw new BadRequestException('Cần hoàn thành mỗi thẻ đúng một lần');
    }
    let correct = 0;
    for (const answer of dto.answers) {
      const card = byId.get(answer.cardId);
      const choice = byId.get(answer.answerId);
      if (!card || !choice)
        throw new BadRequestException('Thẻ không thuộc bài học này');
      // Hai thẻ có cùng nghĩa đều là lựa chọn hợp lệ.
      if (card.meaning.trim() === choice.meaning.trim()) correct++;
    }
    const completed = correct === cards.length;
    const { learned } = completed
      ? await this.markLearned(userId, id)
      : { learned: 0 };
    return { correct, total: cards.length, completed, learned };
  }

  /** Học xong bài: thẻ chưa học vào lịch ôn như đã chấm "Nhớ" lần đầu; thẻ đã có lịch giữ nguyên. */
  async markLearned(userId: string, id: string) {
    const deck = await this.decks.findOne({
      where: { id, userId },
      select: { sourceKey: true },
    });
    if (!deck) throw new NotFoundException('Không tìm thấy bộ thẻ');
    const now = new Date();
    const { next, log } = reviewWithLog(newCard(now), Rating.Good, now);
    const update = this.cards
      .createQueryBuilder()
      .update()
      .set(next)
      .where('"deck_id" = :id AND "due" IS NULL', { id });
    if (DUNG_MORI_KANJI_KEYS.includes(deck.sourceKey)) {
      update.andWhere('"source_id" NOT IN (:...retiredIds)', {
        retiredIds: DUNG_MORI_RETIRED_KANJI_IDS,
      });
    }
    const result = await update.returning(['id']).execute();
    const learned = ((result.raw ?? []) as { id: string }[]).map(
      (row) => row.id,
    );
    await saveReviewLogs(
      this.reviewLogs,
      userId,
      'deck_card',
      'learn',
      learned.map((itemId) => ({ itemId, log })),
    );
    return { learned: result.affected ?? learned.length };
  }

  async queue(
    userId: string,
    limit: number,
    collection: DeckCollection = 'private',
  ) {
    const now = new Date();
    const [rows, total] = await this.cards
      .createQueryBuilder('c')
      .innerJoinAndSelect('c.deck', 'd')
      .where('d.userId = :userId AND c.due <= :now', { userId, now })
      .andWhere('(d.sourceKey IN (:...keys)) = :shared', {
        keys: DUNG_MORI_KEYS,
        shared: collection === 'dung-mori-n4',
      })
      .andWhere(
        'NOT (d.sourceKey IN (:...kanjiKeys) AND c.sourceId IN (:...retiredIds))',
        {
          kanjiKeys: DUNG_MORI_KANJI_KEYS,
          retiredIds: DUNG_MORI_RETIRED_KANJI_IDS,
        },
      )
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
    const card = await this.cards.findOne({
      where: { id: cardId, deck: { userId } },
      relations: { deck: true },
    });
    if (!card?.due || isRetiredDungMoriCard(card.deck.sourceKey, card.sourceId))
      throw new NotFoundException('Thẻ này chưa có trong lịch ôn');
    const now = new Date();
    const { next, log } = reviewWithLog(scheduleOf(card, now), rating, now);
    await this.cards.update({ id: cardId }, next);
    await saveReviewLogs(this.reviewLogs, userId, 'deck_card', 'review', [
      { itemId: cardId, log },
    ]);
    return { due: next.due, state: next.state };
  }
}
