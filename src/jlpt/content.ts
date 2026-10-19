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
  /**
   * Câu hỏi trong file thuộc đề thi số `exam.number` của cấp độ, được xếp vào đề theo cấu trúc JLPT.
   * Nhiều file có thể cùng góp vào một đề (vd tách phần 聴解 ra file riêng); chỉ cần một file khai báo title.
   */
  exam?: ContentExam;
  passages: ContentPassage[];
  questions: ContentQuestion[];
}

export interface ContentExam {
  number: number;
  title?: string;
  description?: string;
}

export interface ContentPassage {
  id: string;
  title?: string;
  /**
   * Bài đọc, hoặc script bài nghe: mỗi dòng「話者：lời thoại」(ナレーター / 男 / 女 / tên nhân vật).
   * Dòng không có「：」được đọc bằng giọng người dẫn.
   */
  content: string;
}

export interface ContentQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  /** 4 lựa chọn (3 với 発話表現 / 即時応答). */
  options: string[];
  answer: number;
  explanation?: string;
  passageId?: string;
}
