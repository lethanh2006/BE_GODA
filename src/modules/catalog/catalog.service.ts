import { Injectable } from '@nestjs/common';
import type { JlptLevel, QuestionType } from '../../generated/prisma/enums.js';
import { BLUEPRINTS, LEVELS } from '../../jlpt/blueprints.js';
import { QUESTION_TYPES, QUESTION_TYPE_ORDER, SKILL_GROUPS } from '../../jlpt/question-types.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const [questionCounts, examCounts, passageCounts] = await Promise.all([
      this.prisma.question.groupBy({
        by: ['level', 'type'],
        where: { isActive: true },
        _count: { _all: true },
      }),
      this.prisma.exam.groupBy({
        by: ['level'],
        where: { published: true },
        _count: { _all: true },
      }),
      this.prisma.passage.groupBy({ by: ['level'], _count: { _all: true } }),
    ]);

    const count = (level: JlptLevel, type: QuestionType) =>
      questionCounts.find((c) => c.level === level && c.type === type)?._count._all ?? 0;

    const levels = LEVELS.map((level) => {
      const blueprint = BLUEPRINTS[level];
      const types = QUESTION_TYPE_ORDER.map((type) => ({ type, count: count(level, type) })).filter(
        (t) => t.count > 0,
      );
      return {
        level,
        totalQuestions: types.reduce((sum, t) => sum + t.count, 0),
        passageCount: passageCounts.find((p) => p.level === level)?._count._all ?? 0,
        examCount: examCounts.find((e) => e.level === level)?._count._all ?? 0,
        questionTypes: types,
        examMinutes: blueprint.sections.reduce((sum, s) => sum + s.durationMinutes, 0),
        examQuestions: blueprint.sections.reduce(
          (sum, s) => sum + s.mondai.reduce((n, m) => n + m.count, 0),
          0,
        ),
      };
    });

    return {
      levels,
      questionTypes: QUESTION_TYPE_ORDER.map((type) => QUESTION_TYPES[type]),
      skillGroups: SKILL_GROUPS,
    };
  }
}
