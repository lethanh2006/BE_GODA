import type { JlptLevel } from '../database/enums.js';

/** Mỗi bài học từ vựng gồm từng này từ, theo thứ tự trong file words-n*.json. */
export const LESSON_SIZE = 20;

/** Định dạng file trong content/vocab/ (sinh bằng pnpm content:vocab, nạp bằng pnpm db:seed). */

export interface ContentExample {
  ja: string;
  /** Câu có furigana dạng {漢字|かんじ}; null nếu nguồn không có. */
  furigana: string | null;
  en: string;
  tatoebaId: number | null;
}

export interface ContentWord {
  id: string;
  word: string;
  reading: string;
  romaji: string;
  /** null: từ thông dụng ngoài danh sách JLPT, chỉ để tra cứu. */
  level: JlptLevel | null;
  pos: string[];
  en: string[];
  hanviet: string | null;
  /** Hạng tần suất (nhỏ = phổ biến), 99 nếu không rõ. */
  freq: number;
  examples: ContentExample[];
}

export interface ContentKanji {
  char: string;
  level: JlptLevel;
  strokes: number;
  freq: number | null;
  radical: string | null;
  on: string[];
  kun: string[];
  en: string[];
  hanviet: string[];
}
