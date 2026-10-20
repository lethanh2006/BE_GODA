import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { FindOptionsWhere, Repository } from 'typeorm';
import { Attempt, AttemptAnswer, UserQuestionStat } from '../../database/entities/index.js';
import {
  AttemptStatus,
  type AttemptMode,
  type JlptLevel,
  type QuestionType,
} from '../../database/enums.js';
import { QUESTION_TYPES } from '../../jlpt/question-types.js';

/** Người dùng chủ yếu ở Việt Nam: tính "ngày học" theo UTC+7. */
const TZ_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const dayKey = (date: Date) => new Date(date.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);

interface TypeStatRow {
  level: JlptLevel;
  type: QuestionType;
  answered: number;
  correct: number;
  questions: number;
  mistakes: number;
}

export interface HistoryQuery {
  page: number;
  pageSize: number;
  status?: AttemptStatus;
  level?: JlptLevel;
  mode?: AttemptMode;
}

@Injectable()
export class MeService {
  constructor(
    @InjectRepository(Attempt) private readonly attempts: Repository<Attempt>,
    @InjectRepository(UserQuestionStat) private readonly questionStats: Repository<UserQuestionStat>,
  ) {}

  async stats(userId: string) {
    const since = new Date(Date.now() - 365 * DAY_MS);
    const [totals, typeRows, recentAttempts, activity, inProgress] = await Promise.all([
      this.attempts
        .createQueryBuilder('a')
        .select('COUNT(*)::int', 'attempts')
        .addSelect('COALESCE(SUM(a.timeSpentSeconds), 0)::int', 'studySeconds')
        .where('a.userId = :userId', { userId })
        .andWhere('a.status = :status', { status: AttemptStatus.SUBMITTED })
        .getRawOne<{ attempts: number; studySeconds: number }>(),
      this.questionStats
        .createQueryBuilder('s')
        .innerJoin('s.question', 'q')
        .select('q.level', 'level')
        .addSelect('q.type', 'type')
        .addSelect('SUM(s.seenCount)::int', 'answered')
        .addSelect('SUM(s.correctCount)::int', 'correct')
        .addSelect('COUNT(*)::int', 'questions')
        .addSelect('(COUNT(*) FILTER (WHERE NOT s.lastCorrect))::int', 'mistakes')
        .where('s.userId = :userId', { userId })
        .groupBy('q.level')
        .addGroupBy('q.type')
        .getRawMany<TypeStatRow>(),
      this.history(userId, { page: 1, pageSize: 5, status: AttemptStatus.SUBMITTED }),
      this.attempts
        .createQueryBuilder('a')
        .select('a.submittedAt', 'submittedAt')
        .addSelect('a.correctCount', 'correctCount')
        .addSelect('a.timeSpentSeconds', 'timeSpentSeconds')
        // Chỉ đếm câu đã trả lời (bỏ qua câu để trống).
        .addSelect(
          (sub) =>
            sub
              .select('COUNT(*)::int')
              .from(AttemptAnswer, 'aa')
              .where('aa.attemptId = a.id')
              .andWhere('aa.selectedIndex IS NOT NULL'),
          'answered',
        )
        .where('a.userId = :userId', { userId })
        .andWhere('a.status = :status', { status: AttemptStatus.SUBMITTED })
        .andWhere('a.submittedAt >= :since', { since })
        .getRawMany<{
          submittedAt: Date;
          correctCount: number | null;
          timeSpentSeconds: number | null;
          answered: number;
        }>(),
      this.attempts.find({
        where: { userId, status: AttemptStatus.IN_PROGRESS },
        order: { startedAt: 'DESC' },
        take: 5,
        select: { id: true, title: true, level: true, mode: true, startedAt: true, totalCount: true },
      }),
    ]);

    const byLevel = new Map<JlptLevel, { level: JlptLevel; answered: number; correct: number; mistakes: number }>();
    for (const row of typeRows) {
      const entry = byLevel.get(row.level) ?? { level: row.level, answered: 0, correct: 0, mistakes: 0 };
      entry.answered += row.answered;
      entry.correct += row.correct;
      entry.mistakes += row.mistakes;
      byLevel.set(row.level, entry);
    }

    const days = new Map<string, { date: string; questions: number; correct: number; seconds: number }>();
    for (const attempt of activity) {
      const key = dayKey(attempt.submittedAt);
      const entry = days.get(key) ?? { date: key, questions: 0, correct: 0, seconds: 0 };
      entry.questions += attempt.answered;
      entry.correct += attempt.correctCount ?? 0;
      entry.seconds += attempt.timeSpentSeconds ?? 0;
      days.set(key, entry);
    }

    const today = Date.now();
    const last30 = Array.from({ length: 30 }, (_, i) => {
      const key = dayKey(new Date(today - (29 - i) * DAY_MS));
      return days.get(key) ?? { date: key, questions: 0, correct: 0, seconds: 0 };
    });

    // Chuỗi ngày học liên tiếp, tính tới hôm nay (hoặc hôm qua nếu hôm nay chưa học).
    let streak = 0;
    for (let offset = days.has(dayKey(new Date(today))) ? 0 : 1; ; offset++) {
      if (!days.has(dayKey(new Date(today - offset * DAY_MS)))) break;
      streak++;
    }

    const answered = typeRows.reduce((sum, r) => sum + r.answered, 0);
    const correct = typeRows.reduce((sum, r) => sum + r.correct, 0);

    return {
      totals: {
        attempts: totals?.attempts ?? 0,
        answered,
        correct,
        accuracy: answered ? correct / answered : null,
        studySeconds: totals?.studySeconds ?? 0,
        distinctQuestions: typeRows.reduce((sum, r) => sum + r.questions, 0),
        mistakes: typeRows.reduce((sum, r) => sum + r.mistakes, 0),
        streakDays: streak,
      },
      byLevel: [...byLevel.values()],
      byType: typeRows
        .map((row) => ({
          ...row,
          nameJa: QUESTION_TYPES[row.type].nameJa,
          nameVi: QUESTION_TYPES[row.type].nameVi,
          accuracy: row.answered ? row.correct / row.answered : null,
        }))
        .sort((a, b) => (a.accuracy ?? 1) - (b.accuracy ?? 1)),
      activity: last30,
      recentAttempts: recentAttempts.items,
      inProgress,
    };
  }

  async history(userId: string, query: HistoryQuery) {
    const where: FindOptionsWhere<Attempt> = {
      userId,
      ...(query.status && { status: query.status }),
      ...(query.level && { level: query.level }),
      ...(query.mode && { mode: query.mode }),
    };
    const [items, total] = await Promise.all([
      this.attempts.find({
        where,
        order: { startedAt: 'DESC' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        relations: { exam: true },
        select: {
          id: true,
          title: true,
          mode: true,
          status: true,
          level: true,
          startedAt: true,
          submittedAt: true,
          totalCount: true,
          correctCount: true,
          scorePercent: true,
          timeSpentSeconds: true,
          exam: { id: true, slug: true },
        },
      }),
      this.attempts.countBy(where),
    ]);
    return {
      items: items.map(({ exam, ...item }) => ({ ...item, examSlug: exam?.slug ?? null })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
}
