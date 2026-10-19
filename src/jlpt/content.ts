import type { JlptLevel, QuestionType } from '../generated/prisma/enums.js';

/** Định dạng file nội dung trong thư mục content/ — được seed nạp vào database. */
export interface ContentFile {
  source: 'goda' | 'openjlpt';
  level: JlptLevel;
  /**
   * true: đáp án đúng luôn được viết ở vị trí đầu tiên, seed sẽ đảo vị trí đáp án (cố định theo id).
   * false: `answer` là vị trí cuối cùng.
   */
  answerFirst: boolean;
  /** File là một đề thi hoàn chỉnh: toàn bộ câu hỏi trong file được xếp vào đề theo cấu trúc JLPT. */
  exam?: ContentExam;
  passages: ContentPassage[];
  questions: ContentQuestion[];
}

export interface ContentExam {
  number: number;
  title: string;
  description?: string;
}

export interface ContentPassage {
  id: string;
  title?: string;
  content: string;
}

export interface ContentQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options: string[];
  answer: number;
  explanation?: string;
  passageId?: string;
}
