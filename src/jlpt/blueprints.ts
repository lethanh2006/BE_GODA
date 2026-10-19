import { JlptLevel, QuestionType } from '../generated/prisma/enums.js';

export interface MondaiBlueprint {
  type: QuestionType;
  /** Số câu hỏi của 問題 này. */
  count: number;
  /** Tên hiển thị riêng nếu khác tên dạng bài mặc định. */
  title?: string;
}

export interface SectionBlueprint {
  title: string;
  titleVi: string;
  durationMinutes: number;
  mondai: MondaiBlueprint[];
}

export interface LevelBlueprint {
  level: JlptLevel;
  sections: SectionBlueprint[];
}

const listening = (durationMinutes: number, mondai: MondaiBlueprint[]): SectionBlueprint => ({
  title: '聴解',
  titleVi: 'Nghe hiểu',
  durationMinutes,
  mondai,
});

const { N1, N2, N3, N4, N5 } = JlptLevel;
const T = QuestionType;

/**
 * Cấu trúc đề theo format JLPT hiện hành (từ kỳ 12/2020).
 * Số câu mỗi 問題 là con số tiêu biểu; đề thật có thể chênh lệch 1–2 câu.
 */
export const BLUEPRINTS: Record<JlptLevel, LevelBlueprint> = {
  N5: {
    level: N5,
    sections: [
      {
        title: '言語知識（文字・語彙）',
        titleVi: 'Kiến thức ngôn ngữ (Chữ – Từ vựng)',
        durationMinutes: 20,
        mondai: [
          { type: T.KANJI_READING, count: 7 },
          { type: T.ORTHOGRAPHY, count: 5 },
          { type: T.CONTEXT, count: 6 },
          { type: T.PARAPHRASE, count: 3 },
        ],
      },
      {
        title: '言語知識（文法）・読解',
        titleVi: 'Kiến thức ngôn ngữ (Ngữ pháp) – Đọc hiểu',
        durationMinutes: 40,
        mondai: [
          { type: T.GRAMMAR_FORM, count: 9 },
          { type: T.SENTENCE_ORDER, count: 4 },
          { type: T.TEXT_GRAMMAR, count: 4 },
          { type: T.READING_SHORT, count: 2 },
          { type: T.READING_MEDIUM, count: 2 },
          { type: T.INFO_RETRIEVAL, count: 1 },
        ],
      },
      listening(30, [
        { type: T.LISTEN_TASK, count: 7 },
        { type: T.LISTEN_POINT, count: 6 },
        { type: T.LISTEN_UTTERANCE, count: 5 },
        { type: T.LISTEN_RESPONSE, count: 6 },
      ]),
    ],
  },
  N4: {
    level: N4,
    sections: [
      {
        title: '言語知識（文字・語彙）',
        titleVi: 'Kiến thức ngôn ngữ (Chữ – Từ vựng)',
        durationMinutes: 25,
        mondai: [
          { type: T.KANJI_READING, count: 7 },
          { type: T.ORTHOGRAPHY, count: 5 },
          { type: T.CONTEXT, count: 8 },
          { type: T.PARAPHRASE, count: 4 },
          { type: T.USAGE, count: 4 },
        ],
      },
      {
        title: '言語知識（文法）・読解',
        titleVi: 'Kiến thức ngôn ngữ (Ngữ pháp) – Đọc hiểu',
        durationMinutes: 55,
        mondai: [
          { type: T.GRAMMAR_FORM, count: 13 },
          { type: T.SENTENCE_ORDER, count: 4 },
          { type: T.TEXT_GRAMMAR, count: 4 },
          { type: T.READING_SHORT, count: 3 },
          { type: T.READING_MEDIUM, count: 3 },
          { type: T.INFO_RETRIEVAL, count: 2 },
        ],
      },
      listening(35, [
        { type: T.LISTEN_TASK, count: 8 },
        { type: T.LISTEN_POINT, count: 7 },
        { type: T.LISTEN_UTTERANCE, count: 5 },
        { type: T.LISTEN_RESPONSE, count: 8 },
      ]),
    ],
  },
  N3: {
    level: N3,
    sections: [
      {
        title: '言語知識（文字・語彙）',
        titleVi: 'Kiến thức ngôn ngữ (Chữ – Từ vựng)',
        durationMinutes: 30,
        mondai: [
          { type: T.KANJI_READING, count: 8 },
          { type: T.ORTHOGRAPHY, count: 6 },
          { type: T.CONTEXT, count: 11 },
          { type: T.PARAPHRASE, count: 5 },
          { type: T.USAGE, count: 5 },
        ],
      },
      {
        title: '言語知識（文法）・読解',
        titleVi: 'Kiến thức ngôn ngữ (Ngữ pháp) – Đọc hiểu',
        durationMinutes: 70,
        mondai: [
          { type: T.GRAMMAR_FORM, count: 13 },
          { type: T.SENTENCE_ORDER, count: 5 },
          { type: T.TEXT_GRAMMAR, count: 5 },
          { type: T.READING_SHORT, count: 4 },
          { type: T.READING_MEDIUM, count: 6 },
          { type: T.READING_LONG, count: 4 },
          { type: T.INFO_RETRIEVAL, count: 2 },
        ],
      },
      listening(40, [
        { type: T.LISTEN_TASK, count: 6 },
        { type: T.LISTEN_POINT, count: 6 },
        { type: T.LISTEN_SUMMARY, count: 3 },
        { type: T.LISTEN_UTTERANCE, count: 4 },
        { type: T.LISTEN_RESPONSE, count: 9 },
      ]),
    ],
  },
  N2: {
    level: N2,
    sections: [
      {
        title: '言語知識（文字・語彙・文法）・読解',
        titleVi: 'Kiến thức ngôn ngữ (Chữ – Từ vựng – Ngữ pháp) – Đọc hiểu',
        durationMinutes: 105,
        mondai: [
          { type: T.KANJI_READING, count: 5 },
          { type: T.ORTHOGRAPHY, count: 5 },
          { type: T.WORD_FORMATION, count: 3 },
          { type: T.CONTEXT, count: 7 },
          { type: T.PARAPHRASE, count: 5 },
          { type: T.USAGE, count: 5 },
          { type: T.GRAMMAR_FORM, count: 12 },
          { type: T.SENTENCE_ORDER, count: 5 },
          { type: T.TEXT_GRAMMAR, count: 5 },
          { type: T.READING_SHORT, count: 5 },
          { type: T.READING_MEDIUM, count: 9 },
          { type: T.READING_INTEGRATED, count: 2 },
          { type: T.READING_THEMATIC, count: 3 },
          { type: T.INFO_RETRIEVAL, count: 2 },
        ],
      },
      listening(50, [
        { type: T.LISTEN_TASK, count: 5 },
        { type: T.LISTEN_POINT, count: 6 },
        { type: T.LISTEN_SUMMARY, count: 5 },
        { type: T.LISTEN_RESPONSE, count: 12 },
        { type: T.LISTEN_INTEGRATED, count: 4 },
      ]),
    ],
  },
  N1: {
    level: N1,
    sections: [
      {
        title: '言語知識（文字・語彙・文法）・読解',
        titleVi: 'Kiến thức ngôn ngữ (Chữ – Từ vựng – Ngữ pháp) – Đọc hiểu',
        durationMinutes: 110,
        mondai: [
          { type: T.KANJI_READING, count: 6 },
          { type: T.CONTEXT, count: 7 },
          { type: T.PARAPHRASE, count: 6 },
          { type: T.USAGE, count: 6 },
          { type: T.GRAMMAR_FORM, count: 10 },
          { type: T.SENTENCE_ORDER, count: 5 },
          { type: T.TEXT_GRAMMAR, count: 5 },
          { type: T.READING_SHORT, count: 4 },
          { type: T.READING_MEDIUM, count: 9 },
          { type: T.READING_LONG, count: 4 },
          { type: T.READING_INTEGRATED, count: 2 },
          { type: T.READING_THEMATIC, count: 4 },
          { type: T.INFO_RETRIEVAL, count: 2 },
        ],
      },
      listening(55, [
        { type: T.LISTEN_TASK, count: 6 },
        { type: T.LISTEN_POINT, count: 7 },
        { type: T.LISTEN_SUMMARY, count: 6 },
        { type: T.LISTEN_RESPONSE, count: 14 },
        { type: T.LISTEN_INTEGRATED, count: 4 },
      ]),
    ],
  },
};

export const LEVELS: JlptLevel[] = [N5, N4, N3, N2, N1];
