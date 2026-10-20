import { JlptLevel } from '../database/enums.js';
import { QUESTION_TYPES, type SkillGroup } from './question-types.js';
import type { QuestionType } from '../database/enums.js';

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
  /** Điểm đỗ tổng (合格点) trên thang 180. */
  passTotal: number;
}

const languageAndReading: ScoreCategory = {
  key: 'language_reading',
  nameJa: '言語知識（文字・語彙・文法）・読解',
  nameVi: 'Kiến thức ngôn ngữ – Đọc hiểu',
  groups: ['vocabulary', 'grammar', 'reading'],
  maxScore: 120,
  minScore: 38,
};

const language: ScoreCategory = {
  key: 'language',
  nameJa: '言語知識（文字・語彙・文法）',
  nameVi: 'Kiến thức ngôn ngữ',
  groups: ['vocabulary', 'grammar'],
  maxScore: 60,
  minScore: 19,
};

const reading: ScoreCategory = {
  key: 'reading',
  nameJa: '読解',
  nameVi: 'Đọc hiểu',
  groups: ['reading'],
  maxScore: 60,
  minScore: 19,
};

const listening: ScoreCategory = {
  key: 'listening',
  nameJa: '聴解',
  nameVi: 'Nghe hiểu',
  groups: ['listening'],
  maxScore: 60,
  minScore: 19,
};

const SCORING: Record<JlptLevel, LevelScoring> = {
  N1: { categories: [language, reading, listening], passTotal: 100 },
  N2: { categories: [language, reading, listening], passTotal: 90 },
  N3: { categories: [language, reading, listening], passTotal: 95 },
  N4: { categories: [languageAndReading, listening], passTotal: 90 },
  N5: { categories: [languageAndReading, listening], passTotal: 80 },
};

const FULL_SCALE = 180;

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
 * Ước tính điểm JLPT từ tỷ lệ đúng. Điểm thật là điểm quy đổi (尺度得点) nên đây chỉ là ước lượng.
 * Khi lượt làm thiếu một số phần (vd chỉ làm phần nghe), ngưỡng đỗ được quy đổi theo tỷ lệ trên các phần đã làm.
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
  const passScore = Math.ceil((scoring.passTotal / FULL_SCALE) * maxScore);
  const missing = scoring.categories.filter((c) => !categories.some((done) => done.key === c.key));

  return {
    categories,
    score,
    maxScore,
    passScore,
    passed: categories.length > 0 && score >= passScore && categories.every((c) => c.passedMin),
    note: missing.length
      ? `Điểm ước tính, chưa gồm phần ${missing.map((c) => c.nameVi).join(', ')} — ngưỡng đỗ được quy đổi theo tỷ lệ. Điểm đỗ chính thức ${level}: ${scoring.passTotal}/${FULL_SCALE}.`
      : `Điểm ước tính theo tỷ lệ câu đúng (điểm JLPT thật là điểm quy đổi). Điểm đỗ chính thức ${level}: ${scoring.passTotal}/${FULL_SCALE}.`,
  };
}
