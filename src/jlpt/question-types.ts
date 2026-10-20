import { QuestionType } from '../database/enums.js';

export type SkillGroup = 'vocabulary' | 'grammar' | 'reading' | 'listening';

export interface QuestionTypeMeta {
  type: QuestionType;
  group: SkillGroup;
  nameJa: string;
  nameVi: string;
  /** Lời dẫn đề bài theo phong cách JLPT. */
  instruction: string;
  instructionVi: string;
  /** Dạng bài có bài đọc (hoặc script nghe) đi kèm. */
  hasPassage: boolean;
  /** Dạng nghe mà các lựa chọn được đọc to, không in sẵn (như đề thật). */
  spokenOptions: boolean;
}

const meta = (
  m: Omit<QuestionTypeMeta, 'hasPassage' | 'spokenOptions'> & { hasPassage?: boolean; spokenOptions?: boolean },
) => ({ hasPassage: false, spokenOptions: false, ...m }) satisfies QuestionTypeMeta;

const LISTEN_FIRST = 'まず質問を聞いてください。それから話を聞いて、1から4の中から、最もよいものを一つえらんでください。';

export const QUESTION_TYPES: Record<QuestionType, QuestionTypeMeta> = {
  KANJI_READING: meta({
    type: QuestionType.KANJI_READING,
    group: 'vocabulary',
    nameJa: '漢字読み',
    nameVi: 'Cách đọc Kanji',
    instruction: '＿＿＿のことばの読み方として最もよいものを、1・2・3・4から一つえらびなさい。',
    instructionVi: 'Chọn cách đọc đúng của từ được gạch chân.',
  }),
  ORTHOGRAPHY: meta({
    type: QuestionType.ORTHOGRAPHY,
    group: 'vocabulary',
    nameJa: '表記',
    nameVi: 'Cách viết Kanji',
    instruction: '＿＿＿のことばを漢字で書くとき、最もよいものを、1・2・3・4から一つえらびなさい。',
    instructionVi: 'Chọn cách viết Kanji đúng của từ được gạch chân.',
  }),
  WORD_FORMATION: meta({
    type: QuestionType.WORD_FORMATION,
    group: 'vocabulary',
    nameJa: '語形成',
    nameVi: 'Cấu tạo từ',
    instruction: '（　　）に入れるのに最もよいものを、1・2・3・4から一つえらびなさい。',
    instructionVi: 'Chọn tiền tố/hậu tố phù hợp để tạo thành từ.',
  }),
  CONTEXT: meta({
    type: QuestionType.CONTEXT,
    group: 'vocabulary',
    nameJa: '文脈規定',
    nameVi: 'Điền từ theo ngữ cảnh',
    instruction: '（　　）に入れるのに最もよいものを、1・2・3・4から一つえらびなさい。',
    instructionVi: 'Chọn từ phù hợp nhất để điền vào chỗ trống.',
  }),
  PARAPHRASE: meta({
    type: QuestionType.PARAPHRASE,
    group: 'vocabulary',
    nameJa: '言い換え類義',
    nameVi: 'Từ đồng nghĩa',
    instruction: '＿＿＿に意味が最も近いものを、1・2・3・4から一つえらびなさい。',
    instructionVi: 'Chọn từ/cụm từ có nghĩa gần nhất với phần gạch chân.',
  }),
  USAGE: meta({
    type: QuestionType.USAGE,
    group: 'vocabulary',
    nameJa: '用法',
    nameVi: 'Cách dùng từ',
    instruction: 'つぎのことばの使い方として最もよいものを、1・2・3・4から一つえらびなさい。',
    instructionVi: 'Chọn câu dùng từ đã cho đúng nhất.',
  }),
  GRAMMAR_FORM: meta({
    type: QuestionType.GRAMMAR_FORM,
    group: 'grammar',
    nameJa: '文法形式の判断',
    nameVi: 'Chọn ngữ pháp',
    instruction: 'つぎの文の（　　）に入れるのに最もよいものを、1・2・3・4から一つえらびなさい。',
    instructionVi: 'Chọn mẫu ngữ pháp phù hợp để điền vào chỗ trống.',
  }),
  SENTENCE_ORDER: meta({
    type: QuestionType.SENTENCE_ORDER,
    group: 'grammar',
    nameJa: '文の組み立て',
    nameVi: 'Sắp xếp câu (★)',
    instruction: 'つぎの文の　★　に入る最もよいものを、1・2・3・4から一つえらびなさい。',
    instructionVi: 'Sắp xếp các vế thành câu đúng và chọn vế nằm ở vị trí ★.',
  }),
  TEXT_GRAMMAR: meta({
    type: QuestionType.TEXT_GRAMMAR,
    group: 'grammar',
    nameJa: '文章の文法',
    nameVi: 'Ngữ pháp trong đoạn văn',
    instruction: 'つぎの文章を読んで、文章全体の内容を考えて、（　　）に入る最もよいものを、1・2・3・4から一つえらびなさい。',
    instructionVi: 'Đọc đoạn văn và chọn từ/mẫu câu phù hợp cho từng chỗ trống.',
    hasPassage: true,
  }),
  READING_SHORT: meta({
    type: QuestionType.READING_SHORT,
    group: 'reading',
    nameJa: '内容理解（短文）',
    nameVi: 'Đọc hiểu đoạn ngắn',
    instruction: 'つぎの文章を読んで、質問に答えなさい。答えは、1・2・3・4から最もよいものを一つえらびなさい。',
    instructionVi: 'Đọc đoạn văn ngắn và trả lời câu hỏi.',
    hasPassage: true,
  }),
  READING_MEDIUM: meta({
    type: QuestionType.READING_MEDIUM,
    group: 'reading',
    nameJa: '内容理解（中文）',
    nameVi: 'Đọc hiểu đoạn vừa',
    instruction: 'つぎの文章を読んで、質問に答えなさい。答えは、1・2・3・4から最もよいものを一つえらびなさい。',
    instructionVi: 'Đọc đoạn văn độ dài trung bình và trả lời câu hỏi.',
    hasPassage: true,
  }),
  READING_LONG: meta({
    type: QuestionType.READING_LONG,
    group: 'reading',
    nameJa: '内容理解（長文）',
    nameVi: 'Đọc hiểu đoạn dài',
    instruction: 'つぎの文章を読んで、質問に答えなさい。答えは、1・2・3・4から最もよいものを一つえらびなさい。',
    instructionVi: 'Đọc đoạn văn dài và trả lời câu hỏi.',
    hasPassage: true,
  }),
  READING_INTEGRATED: meta({
    type: QuestionType.READING_INTEGRATED,
    group: 'reading',
    nameJa: '統合理解',
    nameVi: 'Đọc hiểu tổng hợp (A–B)',
    instruction: 'つぎのAとBの文章を読んで、後の質問に答えなさい。答えは、1・2・3・4から最もよいものを一つえらびなさい。',
    instructionVi: 'Đọc và so sánh hai văn bản A, B rồi trả lời câu hỏi.',
    hasPassage: true,
  }),
  READING_THEMATIC: meta({
    type: QuestionType.READING_THEMATIC,
    group: 'reading',
    nameJa: '主張理解（長文）',
    nameVi: 'Đọc hiểu quan điểm tác giả',
    instruction: 'つぎの文章を読んで、後の質問に答えなさい。答えは、1・2・3・4から最もよいものを一つえらびなさい。',
    instructionVi: 'Đọc bài luận dài và nắm bắt quan điểm của tác giả.',
    hasPassage: true,
  }),
  INFO_RETRIEVAL: meta({
    type: QuestionType.INFO_RETRIEVAL,
    group: 'reading',
    nameJa: '情報検索',
    nameVi: 'Tìm kiếm thông tin',
    instruction: '右のページを見て、下の質問に答えなさい。答えは、1・2・3・4から最もよいものを一つえらびなさい。',
    instructionVi: 'Đọc thông báo/tờ rơi và tìm thông tin cần thiết.',
    hasPassage: true,
  }),
  LISTEN_TASK: meta({
    type: QuestionType.LISTEN_TASK,
    group: 'listening',
    nameJa: '課題理解',
    nameVi: 'Hiểu nhiệm vụ',
    instruction: LISTEN_FIRST,
    instructionVi: 'Nghe câu hỏi, rồi nghe hội thoại và chọn việc nhân vật sẽ làm (tiếp theo).',
    hasPassage: true,
  }),
  LISTEN_POINT: meta({
    type: QuestionType.LISTEN_POINT,
    group: 'listening',
    nameJa: 'ポイント理解',
    nameVi: 'Hiểu điểm chính',
    instruction: LISTEN_FIRST,
    instructionVi: 'Nghe câu hỏi, rồi nghe hội thoại và nắm bắt chi tiết quan trọng (lý do, cảm xúc…).',
    hasPassage: true,
  }),
  LISTEN_SUMMARY: meta({
    type: QuestionType.LISTEN_SUMMARY,
    group: 'listening',
    nameJa: '概要理解',
    nameVi: 'Hiểu khái quát',
    instruction: 'まず話を聞いてください。それから、質問と選択肢を聞いて、1から4の中から、最もよいものを一つえらんでください。',
    instructionVi: 'Nghe đoạn nói và nắm ý chính. Câu hỏi và các lựa chọn được đọc sau đoạn nói.',
    hasPassage: true,
    spokenOptions: true,
  }),
  LISTEN_UTTERANCE: meta({
    type: QuestionType.LISTEN_UTTERANCE,
    group: 'listening',
    nameJa: '発話表現',
    nameVi: 'Diễn đạt bằng lời',
    instruction: 'つぎの場面で、何と言いますか。1から3の中から、最もよいものを一つえらんでください。',
    instructionVi: 'Nghe tình huống và chọn câu nói phù hợp. Các lựa chọn được đọc to.',
    hasPassage: true,
    spokenOptions: true,
  }),
  LISTEN_RESPONSE: meta({
    type: QuestionType.LISTEN_RESPONSE,
    group: 'listening',
    nameJa: '即時応答',
    nameVi: 'Phản xạ nhanh',
    instruction: 'まず文を聞いてください。それから、その返事を聞いて、1から3の中から、最もよいものを一つえらんでください。',
    instructionVi: 'Nghe một câu nói ngắn và chọn câu đáp lại phù hợp nhất.',
    hasPassage: true,
    spokenOptions: true,
  }),
  LISTEN_INTEGRATED: meta({
    type: QuestionType.LISTEN_INTEGRATED,
    group: 'listening',
    nameJa: '統合理解',
    nameVi: 'Nghe hiểu tổng hợp',
    instruction: '長めの話を聞きます。まず話を聞いてください。それから、質問を聞いて、1から4の中から、最もよいものを一つえらんでください。',
    instructionVi: 'Nghe đoạn hội thoại dài, tổng hợp nhiều thông tin để trả lời.',
    hasPassage: true,
  }),
};

export const SKILL_GROUPS: Record<SkillGroup, { nameJa: string; nameVi: string }> = {
  vocabulary: { nameJa: '文字・語彙', nameVi: 'Chữ – Từ vựng' },
  grammar: { nameJa: '文法', nameVi: 'Ngữ pháp' },
  reading: { nameJa: '読解', nameVi: 'Đọc hiểu' },
  listening: { nameJa: '聴解', nameVi: 'Nghe hiểu' },
};

export const QUESTION_TYPE_ORDER = Object.keys(QUESTION_TYPES) as QuestionType[];
