/** Kiểu enum dùng chung cho entity, DTO và domain. Mỗi enum là một kiểu ENUM trong PostgreSQL. */

export const JlptLevel = {
  N5: 'N5',
  N4: 'N4',
  N3: 'N3',
  N2: 'N2',
  N1: 'N1',
} as const;
export type JlptLevel = (typeof JlptLevel)[keyof typeof JlptLevel];

/** Dạng bài (mondai) theo cấu trúc đề JLPT. */
export const QuestionType = {
  KANJI_READING: 'KANJI_READING', // 漢字読み
  ORTHOGRAPHY: 'ORTHOGRAPHY', // 表記
  WORD_FORMATION: 'WORD_FORMATION', // 語形成
  CONTEXT: 'CONTEXT', // 文脈規定
  PARAPHRASE: 'PARAPHRASE', // 言い換え類義
  USAGE: 'USAGE', // 用法
  GRAMMAR_FORM: 'GRAMMAR_FORM', // 文の文法1（文法形式の判断）
  SENTENCE_ORDER: 'SENTENCE_ORDER', // 文の文法2（文の組み立て）
  TEXT_GRAMMAR: 'TEXT_GRAMMAR', // 文章の文法
  READING_SHORT: 'READING_SHORT', // 内容理解（短文）
  READING_MEDIUM: 'READING_MEDIUM', // 内容理解（中文）
  READING_LONG: 'READING_LONG', // 内容理解（長文）
  READING_INTEGRATED: 'READING_INTEGRATED', // 統合理解
  READING_THEMATIC: 'READING_THEMATIC', // 主張理解（長文）
  INFO_RETRIEVAL: 'INFO_RETRIEVAL', // 情報検索
  LISTEN_TASK: 'LISTEN_TASK', // 課題理解
  LISTEN_POINT: 'LISTEN_POINT', // ポイント理解
  LISTEN_SUMMARY: 'LISTEN_SUMMARY', // 概要理解
  LISTEN_UTTERANCE: 'LISTEN_UTTERANCE', // 発話表現
  LISTEN_RESPONSE: 'LISTEN_RESPONSE', // 即時応答
  LISTEN_INTEGRATED: 'LISTEN_INTEGRATED', // 統合理解
} as const;
export type QuestionType = (typeof QuestionType)[keyof typeof QuestionType];

export const UserRole = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const AttemptMode = {
  /** Làm đề thi thử (có giờ, chấm cuối bài). */
  EXAM: 'EXAM',
  /** Luyện tập (có thể xem đáp án ngay). */
  PRACTICE: 'PRACTICE',
} as const;
export type AttemptMode = (typeof AttemptMode)[keyof typeof AttemptMode];

export const AttemptStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED',
} as const;
export type AttemptStatus = (typeof AttemptStatus)[keyof typeof AttemptStatus];

export const ReportStatus = {
  OPEN: 'OPEN',
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED',
} as const;
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];
