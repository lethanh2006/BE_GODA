import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, type Repository } from 'typeorm';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { Attempt, Exam, ExamQuestion } from '../../database/entities/index.js';
import { AttemptMode, AttemptStatus, type JlptLevel } from '../../database/enums.js';
import { QUESTION_TYPES } from '../../jlpt/question-types.js';

@Injectable()
export class ExamsService {
  constructor(
    @InjectRepository(Exam) private readonly exams: Repository<Exam>,
    @InjectRepository(ExamQuestion) private readonly examQuestions: Repository<ExamQuestion>,
    @InjectRepository(Attempt) private readonly attempts: Repository<Attempt>,
  ) {}

  async list(level: JlptLevel | undefined, user: AuthUser | undefined) {
    const exams = await this.exams.find({
      where: { published: true, ...(level && { level }) },
      order: { level: 'ASC', number: 'ASC', sections: { order: 'ASC' } },
      relations: { sections: true },
    });
    const sectionIds = exams.flatMap((exam) => exam.sections.map((s) => s.id));
    const [counts, progress] = await Promise.all([
      this.examQuestions
        .createQueryBuilder('eq')
        .select('eq.sectionId', 'sectionId')
        .addSelect('COUNT(*)::int', 'count')
        .where('eq.sectionId = ANY(:sectionIds)', { sectionIds })
        .groupBy('eq.sectionId')
        .getRawMany<{ sectionId: string; count: number }>(),
      this.progress(user, exams.map((e) => e.id)),
    ]);
    const questionCount = new Map(counts.map((c) => [c.sectionId, c.count]));
    const countOf = (sectionId: string) => questionCount.get(sectionId) ?? 0;

    return exams.map((exam) => ({
      slug: exam.slug,
      level: exam.level,
      number: exam.number,
      title: exam.title,
      description: exam.description,
      source: exam.source,
      totalQuestions: exam.sections.reduce((sum, s) => sum + countOf(s.id), 0),
      totalMinutes: exam.sections.reduce((sum, s) => sum + s.durationMinutes, 0),
      sections: exam.sections.map((s) => ({
        id: s.id,
        order: s.order,
        title: s.title,
        titleVi: s.titleVi,
        durationMinutes: s.durationMinutes,
        questionCount: countOf(s.id),
      })),
      progress: progress.get(exam.id) ?? null,
    }));
  }

  async detail(slug: string, user: AuthUser | undefined) {
    const exam = await this.exams.findOne({
      where: { slug },
      order: { sections: { order: 'ASC', questions: { order: 'ASC' } } },
      relations: { sections: { questions: { question: true } } },
    });
    if (!exam || !exam.published) {
      throw new NotFoundException('Đề thi không tồn tại');
    }
    const progress = await this.progress(user, [exam.id]);
    const history = user
      ? await this.attempts.find({
          where: { userId: user.id, examId: exam.id, status: AttemptStatus.SUBMITTED },
          order: { submittedAt: 'DESC' },
          take: 10,
          select: {
            id: true,
            mode: true,
            title: true,
            submittedAt: true,
            correctCount: true,
            totalCount: true,
            scorePercent: true,
            timeSpentSeconds: true,
          },
        })
      : [];

    return {
      slug: exam.slug,
      level: exam.level,
      number: exam.number,
      title: exam.title,
      description: exam.description,
      source: exam.source,
      totalQuestions: exam.sections.reduce((sum, s) => sum + s.questions.length, 0),
      totalMinutes: exam.sections.reduce((sum, s) => sum + s.durationMinutes, 0),
      sections: exam.sections.map((section) => {
        const mondai: { number: number; type: string; nameJa: string; nameVi: string; count: number }[] = [];
        for (const item of section.questions) {
          const last = mondai.at(-1);
          if (last && last.number === item.mondai) {
            last.count++;
          } else {
            const meta = QUESTION_TYPES[item.question.type];
            mondai.push({ number: item.mondai, type: meta.type, nameJa: meta.nameJa, nameVi: meta.nameVi, count: 1 });
          }
        }
        return {
          id: section.id,
          order: section.order,
          title: section.title,
          titleVi: section.titleVi,
          durationMinutes: section.durationMinutes,
          questionCount: section.questions.length,
          mondai,
        };
      }),
      progress: progress.get(exam.id) ?? null,
      history,
    };
  }

  /** Tiến độ của user với từng đề: số lần làm, điểm cao nhất, lượt đang làm dở. */
  private async progress(user: AuthUser | undefined, examIds: string[]) {
    const result = new Map<
      string,
      { attemptCount: number; bestPercent: number | null; inProgressAttemptId: string | null }
    >();
    if (!user || examIds.length === 0) return result;

    const [submitted, open] = await Promise.all([
      // Chỉ tính lượt làm cả đề ở chế độ thi (không tính lượt làm một phần thi).
      this.attempts
        .createQueryBuilder('a')
        .select('a.examId', 'examId')
        .addSelect('COUNT(*)::int', 'attemptCount')
        .addSelect('MAX(a.scorePercent)', 'bestPercent')
        .where('a.userId = :userId', { userId: user.id })
        .andWhere('a.examId = ANY(:examIds)', { examIds })
        .andWhere('a.status = :status', { status: AttemptStatus.SUBMITTED })
        .andWhere('a.mode = :mode', { mode: AttemptMode.EXAM })
        .andWhere('a.sectionId IS NULL')
        .groupBy('a.examId')
        .getRawMany<{ examId: string; attemptCount: number; bestPercent: number | null }>(),
      this.attempts.find({
        where: { userId: user.id, examId: In(examIds), status: AttemptStatus.IN_PROGRESS },
        order: { startedAt: 'DESC' },
        select: { id: true, examId: true },
      }),
    ]);

    for (const examId of examIds) {
      const stats = submitted.find((s) => s.examId === examId);
      result.set(examId, {
        attemptCount: stats?.attemptCount ?? 0,
        bestPercent: stats?.bestPercent ?? null,
        inProgressAttemptId: open.find((o) => o.examId === examId)?.id ?? null,
      });
    }
    return result;
  }
}
