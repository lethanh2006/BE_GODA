import type { QuestionType } from '../../generated/prisma/enums.js';

export interface LayoutMondai {
  number: number;
  type: QuestionType;
  title?: string;
  questionIds: string[];
}

export interface LayoutSection {
  title: string;
  titleVi: string;
  durationMinutes: number | null;
  mondai: LayoutMondai[];
}

export type AttemptLayout = LayoutSection[];

/** Gom các câu liên tiếp cùng dạng thành từng 問題, đánh số từ 1. */
export function groupIntoMondai(questions: { id: string; type: QuestionType }[]): LayoutMondai[] {
  const mondai: LayoutMondai[] = [];
  for (const question of questions) {
    const last = mondai.at(-1);
    if (last && last.type === question.type) {
      last.questionIds.push(question.id);
    } else {
      mondai.push({ number: mondai.length + 1, type: question.type, questionIds: [question.id] });
    }
  }
  return mondai;
}

export function layoutQuestionIds(layout: AttemptLayout): string[] {
  return layout.flatMap((section) => section.mondai.flatMap((m) => m.questionIds));
}
