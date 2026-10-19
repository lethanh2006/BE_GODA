import type { QuestionType } from '../generated/prisma/enums.js';
import { shuffle } from '../common/utils/random.js';
import { QUESTION_TYPE_ORDER } from './question-types.js';

export interface CandidateQuestion {
  id: string;
  type: QuestionType;
  passageId: string | null;
  passageOrder: number;
}

/** Một "khối" câu hỏi: câu lẻ, hoặc tất cả câu của cùng một bài đọc. */
interface Unit {
  type: QuestionType;
  questions: CandidateQuestion[];
  priority: number;
}

export interface PickOptions {
  count: number;
  random?: () => number;
  /** Độ ưu tiên của từng câu, số nhỏ được chọn trước (vd 0 = chưa làm, 1 = làm sai, 2 = làm đúng). */
  priorityOf?: (questionId: string) => number;
  /** Loại các câu đã dùng (vd khi ghép nhiều đề không trùng nhau). */
  exclude?: ReadonlySet<string>;
}

function toUnits(candidates: CandidateQuestion[], priorityOf?: (id: string) => number): Unit[] {
  const byPassage = new Map<string, CandidateQuestion[]>();
  const units: Unit[] = [];

  for (const question of candidates) {
    if (question.passageId) {
      const group = byPassage.get(question.passageId) ?? [];
      group.push(question);
      byPassage.set(question.passageId, group);
    } else {
      units.push({ type: question.type, questions: [question], priority: 0 });
    }
  }
  for (const group of byPassage.values()) {
    group.sort((a, b) => a.passageOrder - b.passageOrder);
    units.push({ type: group[0].type, questions: group, priority: 0 });
  }
  for (const unit of units) {
    unit.priority = priorityOf
      ? Math.min(...unit.questions.map((question) => priorityOf(question.id)))
      : 0;
  }
  return units;
}

/**
 * Chọn khoảng `count` câu, giữ nguyên các câu cùng bài đọc với nhau.
 * Khối cuối có thể làm vượt `count` một chút; nếu chỉ còn khối quá lớn thì vẫn lấy khối đầu tiên.
 */
export function pickQuestions(
  candidates: CandidateQuestion[],
  { count, random = Math.random, priorityOf, exclude }: PickOptions,
): CandidateQuestion[] {
  const available = exclude ? candidates.filter((q) => !exclude.has(q.id)) : candidates;
  const units = shuffle(toUnits(available, priorityOf), random).sort(
    (a, b) => a.priority - b.priority,
  );

  const picked: CandidateQuestion[] = [];
  for (const unit of units) {
    if (picked.length >= count) break;
    const remaining = count - picked.length;
    if (unit.questions.length > remaining && picked.length > 0) {
      // Bài đọc quá dài so với số câu còn thiếu: thử khối khác nhỏ hơn.
      continue;
    }
    picked.push(...unit.questions);
  }
  return picked;
}

/** Sắp câu theo thứ tự dạng bài chuẩn của đề JLPT, giữ thứ tự tương đối trong cùng dạng. */
export function sortByTypeOrder<T extends { type: QuestionType }>(questions: T[]): T[] {
  return questions
    .map((question, index) => ({ question, index }))
    .sort(
      (a, b) =>
        QUESTION_TYPE_ORDER.indexOf(a.question.type) - QUESTION_TYPE_ORDER.indexOf(b.question.type) ||
        a.index - b.index,
    )
    .map(({ question }) => question);
}
