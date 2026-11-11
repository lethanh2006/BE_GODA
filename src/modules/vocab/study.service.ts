import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, type Repository } from 'typeorm';
import { Rating } from 'ts-fsrs';
import { ReviewLog, UserWord, Word } from '../../database/entities/index.js';
import type { JlptLevel } from '../../database/enums.js';
import { saveReviewLogs } from './review-log.js';
import { MATURE_DAYS, newCard, preview, reviewWithLog } from './scheduler.js';
import { toWordCard } from './vocab.service.js';

const QUEUE_LIMIT = 50;
const PAGE_SIZE = 50;
/** Ngày học tính theo giờ Việt Nam. */
const TIME_ZONE = 'Asia/Ho_Chi_Minh';

export type WordStatus = 'due' | 'learning' | 'mature' | 'known';

@Injectable()
export class StudyService {
  constructor(
    @InjectRepository(UserWord) private readonly userWords: Repository<UserWord>,
    @InjectRepository(Word) private readonly words: Repository<Word>,
    @InjectRepository(ReviewLog) private readonly reviewLogs: Repository<ReviewLog>,
  ) {}

  /**
   * Thêm từ vào sổ ôn. Từ đã có giữ nguyên lịch ôn, không bị đặt lại.
   * `learned`: vừa học xong bài, coi như đã chấm "Nhớ" lần đầu và ghi nhật ký `learn` cho các từ mới thêm.
   */
  async addWords(userId: string, wordIds: string[], learned = false) {
    const ids = [...new Set(wordIds)];
    const known = await this.words.find({ where: { id: In(ids) }, select: { id: true } });
    if (known.length === 0) throw new NotFoundException('Không tìm thấy từ này');
    const now = new Date();
    const first = learned ? reviewWithLog(newCard(now), Rating.Good, now) : null;
    const result = await this.userWords
      .createQueryBuilder()
      .insert()
      .values(known.map(({ id }) => ({ userId, wordId: id, ...(first?.next ?? newCard(now)) })))
      .orIgnore()
      .returning(['wordId'])
      .execute();
    // ON CONFLICT DO NOTHING: chỉ những từ thật sự được thêm mới có trong `raw`.
    const added = ((result.raw ?? []) as { word_id: string }[]).map((row) => row.word_id);
    if (first) {
      await saveReviewLogs(this.reviewLogs, userId, 'word', 'learn', added.map((itemId) => ({ itemId, log: first.log })));
    }
    return { added: added.length };
  }

  async removeWord(userId: string, wordId: string) {
    await this.userWords.delete({ userId, wordId });
  }

  /** Đánh dấu "Đã biết": từ chưa có trong sổ thì thêm vào rồi ẩn khỏi hàng ôn. */
  async setKnown(userId: string, wordId: string, known: boolean) {
    await this.addWords(userId, [wordId]);
    await this.userWords.update({ userId, wordId }, { suspended: known });
  }

  async queue(userId: string, limit: number, level?: JlptLevel) {
    const now = new Date();
    const query = this.userWords
      .createQueryBuilder('uw')
      .innerJoinAndSelect('uw.word', 'w')
      .where('uw.userId = :userId AND uw.suspended = false AND uw.due <= :now', { userId, now })
      .orderBy('uw.due', 'ASC')
      .take(Math.min(limit, QUEUE_LIMIT));
    if (level) query.andWhere('w.level = :level', { level });
    const [rows, total] = await query.getManyAndCount();
    return {
      total,
      cards: rows.map((row) => ({
        ...toWordCard(row.word),
        state: row.state,
        reps: row.reps,
        preview: preview(row, now),
      })),
    };
  }

  async review(userId: string, wordId: string, rating: 1 | 2 | 3 | 4) {
    const row = await this.userWords.findOneBy({ userId, wordId });
    if (!row) throw new NotFoundException('Từ này chưa có trong sổ ôn');
    const { next, log } = reviewWithLog(row, rating, new Date());
    await this.userWords.update({ userId, wordId }, next);
    await saveReviewLogs(this.reviewLogs, userId, 'word', 'review', [{ itemId: wordId, log }]);
    return { due: next.due, state: next.state };
  }

  async stats(userId: string) {
    const [row] = await this.userWords.query<
      {
        total: number;
        due: number;
        learning: number;
        mature: number;
        known: number;
        reviewed_today: number;
      }[]
    >(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE NOT suspended AND due <= now())::int AS due,
              COUNT(*) FILTER (WHERE NOT suspended AND scheduled_days < $2)::int AS learning,
              COUNT(*) FILTER (WHERE NOT suspended AND scheduled_days >= $2)::int AS mature,
              COUNT(*) FILTER (WHERE suspended)::int AS known,
              COUNT(*) FILTER (
                WHERE last_review >= date_trunc('day', now() AT TIME ZONE '${TIME_ZONE}') AT TIME ZONE '${TIME_ZONE}'
              )::int AS reviewed_today
         FROM user_words WHERE user_id = $1`,
      [userId, MATURE_DAYS],
    );
    const byLevel = await this.userWords.query<{ level: JlptLevel; total: number; due: number }[]>(
      `SELECT w.level, COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE NOT uw.suspended AND uw.due <= now())::int AS due
         FROM user_words uw JOIN words w ON w.id = uw.word_id
        WHERE uw.user_id = $1 AND w.level IS NOT NULL
        GROUP BY w.level`,
      [userId],
    );
    const upcoming = await this.userWords.query<{ day: string; count: number }[]>(
      `SELECT to_char(due AT TIME ZONE '${TIME_ZONE}', 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
         FROM user_words
        WHERE user_id = $1 AND NOT suspended AND due > now() AND due < now() + interval '7 days'
        GROUP BY 1 ORDER BY 1`,
      [userId],
    );
    return {
      total: row.total,
      due: row.due,
      learning: row.learning,
      mature: row.mature,
      known: row.known,
      reviewedToday: row.reviewed_today,
      byLevel,
      upcoming,
    };
  }

  /** Sổ từ: danh sách từ đã thêm, lọc theo trạng thái và cấp. */
  async list(userId: string, page: number, status?: WordStatus, level?: JlptLevel) {
    const query = this.userWords
      .createQueryBuilder('uw')
      .innerJoinAndSelect('uw.word', 'w')
      .where('uw.userId = :userId', { userId })
      .orderBy('uw.createdAt', 'DESC')
      .addOrderBy('uw.wordId', 'ASC')
      .skip((page - 1) * PAGE_SIZE)
      .take(PAGE_SIZE);
    if (level) query.andWhere('w.level = :level', { level });
    if (status === 'due') query.andWhere('uw.suspended = false AND uw.due <= now()');
    if (status === 'learning') query.andWhere('uw.suspended = false AND uw.scheduledDays < :mature', { mature: MATURE_DAYS });
    if (status === 'mature') query.andWhere('uw.suspended = false AND uw.scheduledDays >= :mature', { mature: MATURE_DAYS });
    if (status === 'known') query.andWhere('uw.suspended = true');
    const [rows, total] = await query.getManyAndCount();
    return {
      total,
      page,
      pageSize: PAGE_SIZE,
      items: rows.map((row) => ({
        ...toWordCard(row.word),
        due: row.due,
        suspended: row.suspended,
        scheduledDays: row.scheduledDays,
      })),
    };
  }
}
