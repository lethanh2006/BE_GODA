import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Exam, Passage, Question } from '../../database/entities/index.js';
import type { JlptLevel, QuestionType } from '../../database/enums.js';
import { BLUEPRINTS, LEVELS } from '../../jlpt/blueprints.js';
import { QUESTION_TYPES, QUESTION_TYPE_ORDER, SKILL_GROUPS } from '../../jlpt/question-types.js';

interface LevelCount {
  level: JlptLevel;
  count: number;
}

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Question) private readonly questions: Repository<Question>,
    @InjectRepository(Exam) private readonly exams: Repository<Exam>,
    @InjectRepository(Passage) private readonly passages: Repository<Passage>,
  ) {}

  async overview() {
    const [questionCounts, examCounts, passageCounts] = await Promise.all([
      this.questions
        .createQueryBuilder('q')
        .select('q.level', 'level')
        .addSelect('q.type', 'type')
        .addSelect('COUNT(*)::int', 'count')
        .where('q.isActive = true')
        .groupBy('q.level')
        .addGroupBy('q.type')
        .getRawMany<LevelCount & { type: QuestionType }>(),
      this.exams
        .createQueryBuilder('e')
        .select('e.level', 'level')
        .addSelect('COUNT(*)::int', 'count')
        .where('e.published = true')
        .groupBy('e.level')
        .getRawMany<LevelCount>(),
      this.passages
        .createQueryBuilder('p')
        .select('p.level', 'level')
        .addSelect('COUNT(*)::int', 'count')
        .groupBy('p.level')
        .getRawMany<LevelCount>(),
    ]);

    const count = (level: JlptLevel, type: QuestionType) =>
      questionCounts.find((c) => c.level === level && c.type === type)?.count ?? 0;

    const levels = LEVELS.map((level) => {
      const blueprint = BLUEPRINTS[level];
      const types = QUESTION_TYPE_ORDER.map((type) => ({ type, count: count(level, type) })).filter(
        (t) => t.count > 0,
      );
      return {
        level,
        totalQuestions: types.reduce((sum, t) => sum + t.count, 0),
        passageCount: passageCounts.find((p) => p.level === level)?.count ?? 0,
        examCount: examCounts.find((e) => e.level === level)?.count ?? 0,
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
