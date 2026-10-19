import { JlptLevel } from '../generated/prisma/enums.js';
import { QUESTION_TYPES, type SkillGroup } from './question-types.js';
import type { QuestionType } from '../generated/prisma/enums.js';

/** Nhóm điểm (得点区分) của JLPT. */
interface ScoreCategory {
  key: string;
  nameJa: string;
  nameVi: string;
  groups: SkillGroup[];
  maxScore: number;
  /** Điểm liệt (基準点). */
  minScore: number;
}

interface LevelScoring {
  categories: ScoreCategory[];
  /** Điểm đỗ tổng (合格点) trên thang 180 — tính cả phần nghe. */
  passTotal: number;
  listening: { maxScore: number; minScore: number };
}

const languageAndReading = (max: number, min: number): ScoreCategory[] => [
  {
    key: 'language_reading',
    nameJa: '言語知識（文字・語彙・文法）・読解',
    nameVi: 'Kiến thức ngôn ngữ – Đọc hiểu',
    groups: ['vocabulary', 'grammar', 'reading'],
    maxScore: max,
    minScore: min,
  },
];

const languageThenReading: ScoreCategory[] = [
  {
    key: 'language',
    nameJa: '言語知識（文字・語彙・文法）',
    nameVi: 'Kiến thức ngôn ngữ',
    groups: ['vocabulary', 'grammar'],
    maxScore: 60,
    minScore: 19,
  },
  {
    key: 'reading',
    nameJa: '読解',
    nameVi: 'Đọc hiểu',
    groups: ['reading'],
    maxScore: 60,
    minScore: 19,
  },
];

const SCORING: Record<JlptLevel, LevelScoring> = {
  N1: { categories: languageThenReading, passTotal: 100, listening: { maxScore: 60, minScore: 19 } },
  N2: { categories: languageThenReading, passTotal: 90, listening: { maxScore: 60, minScore: 19 } },
  N3: { categories: languageThenReading, passTotal: 95, listening: { maxScore: 60, minScore: 19 } },
  N4: { categories: languageAndReading(120, 38), passTotal: 90, listening: { maxScore: 60, minScore: 19 } },
  N5: { categories: languageAndReading(120, 38), passTotal: 80, listening: { maxScore: 60, minScore: 19 } },
};

export interface GradedItem {
  type: QuestionType;
  isCorrect: boolean;
}

export interface CategoryScore {
  key: string;
  nameJa: string;
  nameVi: string;
  correct: number;
  total: number;
  score: number;
  maxScore: number;
  minScore: number;
  passedMin: boolean;
}

export interface JlptEstimate {
  categories: CategoryScore[];
  score: number;
  maxScore: number;
  /** Ngưỡng đỗ quy đổi theo tỷ lệ trên phần đã thi (không có phần nghe). */
  passScore: number;
  passed: boolean;
  note: string;
}

/**
 * Ước tính điểm JLPT từ tỷ lệ đúng. Điểm thật là điểm quy đổi (尺度得点) nên đây chỉ là ước lượng,
 * và vì chưa có phần nghe, ngưỡng đỗ được quy đổi theo tỷ lệ trên tổng điểm các phần đã làm.
 */
export function estimateJlptScore(level: JlptLevel, items: GradedItem[]): JlptEstimate {
  const scoring = SCORING[level];
  const categories = scoring.categories
    .map((category) => {
      const relevant = items.filter((item) =>
        category.groups.includes(QUESTION_TYPES[item.type].group),
      );
      const correct = relevant.filter((item) => item.isCorrect).length;
      const total = relevant.length;
      const score = total ? Math.round((correct / total) * category.maxScore) : 0;
      return {
        key: category.key,
        nameJa: category.nameJa,
        nameVi: category.nameVi,
        correct,
        total,
        score,
        maxScore: category.maxScore,
        minScore: category.minScore,
        passedMin: score >= category.minScore,
      };
    })
    .filter((category) => category.total > 0);

  const score = categories.reduce((sum, c) => sum + c.score, 0);
  const maxScore = categories.reduce((sum, c) => sum + c.maxScore, 0);
  const fullMax = maxScore + scoring.listening.maxScore;
  const passScore = Math.ceil((scoring.passTotal / fullMax) * maxScore);

  return {
    categories,
    score,
    maxScore,
    passScore,
    passed: categories.length > 0 && score >= passScore && categories.every((c) => c.passedMin),
    note: `Điểm ước tính, chưa gồm phần Nghe hiểu (聴解). Điểm đỗ chính thức ${level}: ${scoring.passTotal}/180.`,
  };
}
