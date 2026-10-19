import { Injectable, NotFoundException } from '@nestjs/common';
import { AttemptMode, AttemptStatus, type JlptLevel } from '../../generated/prisma/enums.js';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { QUESTION_TYPES } from '../../jlpt/question-types.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(level: JlptLevel | undefined, user: AuthUser | undefined) {
    const exams = await this.prisma.exam.findMany({
      where: { published: true, ...(level && { level }) },
      orderBy: [{ level: 'asc' }, { number: 'asc' }],
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: { _count: { select: { questions: true } } },
        },
      },
    });
    const progress = await this.progress(user, exams.map((e) => e.id));

    return exams.map((exam) => ({
      slug: exam.slug,
      level: exam.level,
      number: exam.number,
      title: exam.title,
      description: exam.description,
      source: exam.source,
      totalQuestions: exam.sections.reduce((sum, s) => sum + s._count.questions, 0),
      totalMinutes: exam.sections.reduce((sum, s) => sum + s.durationMinutes, 0),
      sections: exam.sections.map((s) => ({
        id: s.id,
        order: s.order,
        title: s.title,
        titleVi: s.titleVi,
        durationMinutes: s.durationMinutes,
        questionCount: s._count.questions,
      })),
      progress: progress.get(exam.id) ?? null,
    }));
  }

  async detail(slug: string, user: AuthUser | undefined) {
    const exam = await this.prisma.exam.findUnique({
      where: { slug },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            questions: {
              orderBy: { order: 'asc' },
              select: { mondai: true, question: { select: { type: true, passageId: true } } },
            },
          },
        },
      },
    });
    if (!exam || !exam.published) {
      throw new NotFoundException('Đề thi không tồn tại');
    }
    const progress = await this.progress(user, [exam.id]);
    const history = user
      ? await this.prisma.attempt.findMany({
          where: { userId: user.id, examId: exam.id, status: AttemptStatus.SUBMITTED },
          orderBy: { submittedAt: 'desc' },
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
      this.prisma.attempt.groupBy({
        by: ['examId'],
        where: {
          userId: user.id,
          examId: { in: examIds },
          status: AttemptStatus.SUBMITTED,
          mode: AttemptMode.EXAM,
          sectionId: null,
        },
        _count: { _all: true },
        _max: { scorePercent: true },
      }),
      this.prisma.attempt.findMany({
        where: { userId: user.id, examId: { in: examIds }, status: AttemptStatus.IN_PROGRESS },
        orderBy: { startedAt: 'desc' },
        select: { id: true, examId: true },
      }),
    ]);

    for (const examId of examIds) {
      const stats = submitted.find((s) => s.examId === examId);
      result.set(examId, {
        attemptCount: stats?._count._all ?? 0,
        bestPercent: stats?._max.scorePercent ?? null,
        inProgressAttemptId: open.find((o) => o.examId === examId)?.id ?? null,
      });
    }
    return result;
  }
}
