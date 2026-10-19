/**
 * Nhập & làm sạch ngân hàng câu hỏi OpenJLPT (https://github.com/iamcheyan/jlpt-drill, MIT).
 *
 *   pnpm content:openjlpt                       # tải dữ liệu ở commit cố định
 *   pnpm content:openjlpt --from <dir/data>     # dùng bản clone sẵn có
 *
 * Dữ liệu gốc do AI sinh và khá nhiễu, nên script:
 *  - loại câu sinh từ template hỏng (vd "文脈に合う言葉を選びなさい：two people…"), bài đọc giữ chỗ, câu trùng;
 *  - sinh lại đáp án nhiễu cho 漢字読み theo kiểu bẫy JLPT (trường âm, っ, âm đục…);
 *  - sinh câu 表記 với đáp án nhiễu là chữ Hán đồng âm (dựa trên âm on của KANJIDIC);
 *  - bỏ 並べ替え, 文章の文法, 言い換え, 用法, 語形成: tỷ lệ lỗi cao (sai ngữ pháp, nhiều đáp án đúng,
 *    đáp án ngược) — các dạng này dùng đề GODA biên soạn;
 *  - bỏ lời giải tiếng Trung, đảo vị trí đáp án (cố định theo id).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { hashString, seededRandom, shuffle } from '../../src/common/utils/random.js';
import type { ContentFile, ContentPassage, ContentQuestion } from '../../src/jlpt/content.js';
import type { JlptLevel, QuestionType } from '../../src/generated/prisma/enums.js';
import { isHiragana, isKanji, readingMutations } from './kana.js';
import { alignReading, buildOnIndex, type KanjiData } from './kanji.js';

const OPENJLPT_COMMIT = 'd3e58db85a3496c5b13966028b6233565cbe7e57';
const OPENJLPT_RAW = `https://raw.githubusercontent.com/iamcheyan/jlpt-drill/${OPENJLPT_COMMIT}/data`;
const KANJI_DATA_URL =
  'https://raw.githubusercontent.com/davidluzgouveia/kanji-data/00fd7079c3890f430759536f91aa5e854ec0ca4f/kanji-jouyou.json';

const LEVELS: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
const FILES = [
  'vocab_reading',
  'vocab_kanji',
  'vocab_compound',
  'vocab_context',
  'vocab_synonym',
  'vocab_usage',
  'grammar_fill',
  'grammar_order',
  'grammar_passage',
  'reading_short',
  'reading_medium',
  'reading_long',
  'reading_search',
] as const;
type SourceFile = (typeof FILES)[number];

const READING_TYPES: Record<string, QuestionType> = {
  reading_short: 'READING_SHORT',
  reading_medium: 'READING_MEDIUM',
  reading_long: 'READING_LONG',  // N2: map sang 主張理解 (xem bên dưới)
  reading_search: 'INFO_RETRIEVAL',
};

/** Ký tự chỉ có trong tiếng Trung giản thể — dùng để nhận diện lời giải tiếng Trung. */
const CHINESE = /[这们选项为么说词语题译错确误义该请吗还对样让给过发现关经头买卖实东车门问间长见边认识读应从于级层厅码种类别处虽现]|，/;
/** Lời giải nhắc tới vị trí đáp án — sẽ sai sau khi đảo đáp án. */
const POSITIONAL = /选项|選択肢|[①②③④]|正解[はは為为：:\s]*[A-DＡ-Ｄ1-4１-４]|(^|\s)[A-D][.．:：、)]/;
const JUNK_OPTION = /^あ+$|^ー+$/;
const MAX_QUESTIONS_PER_PASSAGE = 4;

// ------------------------------------------------------------------ raw types

interface RawQuestion {
  id?: string;
  sentence?: string;
  target?: string;
  passage?: string;
  question?: string;
  options?: string[];
  answer?: number;
  explanation?: string;
  complete_sentence?: string;
  star_position?: number;
  blanks?: { num: number; options: string[]; answer: number }[];
  questions?: { question: string; options: string[]; answer: number; explanation?: string }[];
  verified?: boolean;
}

// ------------------------------------------------------------------ helpers

class Report {
  private counts = new Map<string, number>();
  add(key: string, n = 1) {
    this.counts.set(key, (this.counts.get(key) ?? 0) + n);
  }
  print(level: string) {
    const rows = [...this.counts].sort(([a], [b]) => a.localeCompare(b));
    console.log(`\n[${level}]`);
    for (const [key, n] of rows) console.log(`  ${key.padEnd(44)} ${n}`);
  }
}

const normalizeBlank = (s: string) => s.replace(/[（(]\s*[　 ]*\s*[)）]/g, '（　　）');
const compact = (s: string) => s.replace(/[\s　]/g, '');

/** Bỏ các câu tiếng Trung trong lời giải, giữ phần tiếng Nhật / tiếng Anh. */
function cleanExplanation(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const kept = text
    .replace(/【句子翻译】[^\n]*/g, '')
    .split(/(?<=[。\n])/)
    .map((part) => part.trim())
    .filter((part) => part && !CHINESE.test(part));
  const result = kept.join('').trim();
  return result.length >= 4 ? result : undefined;
}

function uniqueOptions(options: string[]): boolean {
  return new Set(options.map(compact)).size === options.length;
}

/** Đảo vị trí đáp án cố định theo id. */
function shuffled(id: string, options: string[], answer: number) {
  const order = shuffle(
    options.map((_, i) => i),
    seededRandom(hashString(id)),
  );
  return { options: order.map((i) => options[i]), answer: order.indexOf(answer) };
}

function makeQuestion(
  q: Omit<ContentQuestion, 'options' | 'answer'> & { options: string[]; answer: number },
  { keepExplanationOrder = false } = {},
): ContentQuestion {
  const { options, answer } = shuffled(q.id, q.options, q.answer);
  const explanation =
    !keepExplanationOrder && q.explanation && POSITIONAL.test(q.explanation) ? undefined : q.explanation;
  return { ...q, options, answer, ...(explanation ? { explanation } : { explanation: undefined }) };
}

function pickDistractors(id: string, candidates: string[], n: number): string[] {
  const random = seededRandom(hashString(`${id}:distractors`));
  return shuffle([...new Set(candidates)], random).slice(0, n);
}

// ------------------------------------------------------------------ loaders

async function loadJson<T>(from: string | undefined, url: string, local: string): Promise<T> {
  if (from) return JSON.parse(await readFile(path.join(from, local), 'utf8')) as T;
  const res = await fetch(url);
  if (res.status === 404) return { questions: [] } as T;
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return (await res.json()) as T;
}

async function loadLevel(level: JlptLevel, from: string | undefined) {
  const dir = level.toLowerCase();
  const data = {} as Record<SourceFile, RawQuestion[]>;
  for (const file of FILES) {
    try {
      const json = await loadJson<{ questions: RawQuestion[] }>(
        from,
        `${OPENJLPT_RAW}/${dir}/${file}.json`,
        `${dir}/${file}.json`,
      );
      data[file] = json.questions ?? [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') data[file] = [];
      else throw error;
    }
  }
  return data;
}

// ------------------------------------------------------------------ converters

interface WordEntry {
  word: string;
  reading: string;
  sentence: string;
  meaning?: string;
  sourceId: string;
}

/** 漢字読み: câu có 《từ》, cách đọc đúng lấy từ đáp án gốc. */
function readWordEntries(items: RawQuestion[], report: Report): WordEntry[] {
  const entries: WordEntry[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const match = item.sentence?.match(/《([^》]+)》/g);
    const reading = item.options?.[item.answer ?? -1];
    if (!item.id || !match || match.length !== 1 || !reading || !isHiragana(reading)) {
      report.add('vocab_reading: dropped (malformed)');
      continue;
    }
    const word = match[0].slice(1, -1);
    if (![...word].some(isKanji) || (item.target && item.target !== word)) {
      report.add('vocab_reading: dropped (target mismatch)');
      continue;
    }
    // Đối chiếu với lời giải 「X」の読みは「Y」 nếu có.
    const stated = item.explanation?.match(/「([^」]+)」の読みは「([^」]+)」/);
    if (stated && (stated[1] !== word || stated[2] !== reading)) {
      report.add('vocab_reading: dropped (explanation mismatch)');
      continue;
    }
    if (seen.has(item.sentence!)) {
      report.add('vocab_reading: dropped (duplicate)');
      continue;
    }
    seen.add(item.sentence!);
    const meaning = item.explanation?.match(/意味：([A-Za-z][^（(。\n]*)/)?.[1]?.trim();
    entries.push({ word, reading, sentence: item.sentence!, meaning, sourceId: item.id });
  }
  return entries;
}

function kanjiReadingQuestion(entry: WordEntry, original: RawQuestion | undefined): ContentQuestion | null {
  const id = `oj-${entry.sourceId}`;
  const reading = entry.reading;
  // Giữ tối đa 1 đáp án nhiễu gốc nếu trông hợp lý (cùng âm đầu, độ dài tương đương, không phải kiểu "…お" rác).
  const originals = (original?.options ?? []).filter(
    (o) =>
      o !== reading &&
      isHiragana(o) &&
      !JUNK_OPTION.test(o) &&
      o[0] === reading[0] &&
      Math.abs(o.length - reading.length) <= 2 &&
      !o.startsWith(reading) &&
      !reading.startsWith(o) &&
      !(o.endsWith('お') && reading.startsWith(o.slice(0, -1))),
  );
  const mutations = readingMutations(reading);
  // Ưu tiên đa dạng kiểu bẫy: mỗi loại một phương án; âm mũi ん chỉ dùng khi thiếu.
  const byKind = new Map<string, string[]>();
  for (const m of mutations) byKind.set(m.kind, [...(byKind.get(m.kind) ?? []), m.value]);
  const random = seededRandom(hashString(id));
  const preferred = shuffle([...byKind].filter(([kind]) => kind !== 'nasal'), random).map(
    ([, list]) => shuffle(list, random)[0],
  );
  const rest = shuffle(mutations.map((m) => m.value), random);
  const pool = [...new Set([...originals.slice(0, 1), ...preferred, ...rest])];
  const distractors = pool.filter((p) => p !== reading).slice(0, 3);
  if (distractors.length < 3) return null;

  return makeQuestion({
    id,
    type: 'KANJI_READING',
    prompt: entry.sentence,
    options: [entry.reading, ...distractors],
    answer: 0,
    explanation: `「${entry.word}」đọc là「${entry.reading}」.${entry.meaning ? ` Nghĩa: ${entry.meaning}.` : ''}`,
  });
}

/** 表記: thay 1–2 chữ Hán bằng chữ đồng âm (vd かいけつ → 解決 / 改決 / 解結 / 改結). */
function orthographyQuestion(
  entry: WordEntry,
  kanji: KanjiData,
  onIndex: Map<string, string[]>,
  knownWords: Set<string>,
): ContentQuestion | null {
  const kanjiChars = [...entry.word].filter(isKanji);
  if (kanjiChars.length < 2 || entry.word.includes('々')) return null;
  const segments = alignReading(entry.word, entry.reading, kanji);
  if (!segments) return null;

  const random = seededRandom(hashString(`${entry.sourceId}:hyouki`));
  const substitutes = segments.map((segment) => {
    if (!segment.base || segment.kind !== 'on') return [];
    return (onIndex.get(segment.base) ?? []).filter((ch) => ch !== segment.char).slice(0, 12);
  });
  const positions = substitutes.map((list, i) => (list.length ? i : -1)).filter((i) => i >= 0);
  if (positions.length === 0) return null;

  const build = (changes: Map<number, string>) =>
    segments.map((segment, i) => changes.get(i) ?? segment.char).join('');

  const candidates = new Set<string>();
  for (let tries = 0; tries < 40 && candidates.size < 6; tries++) {
    const changes = new Map<number, string>();
    const chosen = shuffle(positions, random).slice(0, positions.length > 1 && random() < 0.4 ? 2 : 1);
    for (const position of chosen) {
      const list = substitutes[position];
      changes.set(position, list[Math.floor(random() * Math.min(list.length, 6))]);
    }
    const candidate = build(changes);
    if (candidate !== entry.word && !knownWords.has(candidate)) candidates.add(candidate);
  }
  const distractors = [...candidates].slice(0, 3);
  if (distractors.length < 3) return null;

  const id = `oj-${entry.sourceId}-hyouki`;
  return makeQuestion({
    id,
    type: 'ORTHOGRAPHY',
    prompt: entry.sentence.replace(`《${entry.word}》`, `《${entry.reading}》`),
    options: [entry.word, ...distractors],
    answer: 0,
    explanation: `「${entry.reading}」viết là「${entry.word}」.${entry.meaning ? ` Nghĩa: ${entry.meaning}.` : ''}`,
  });
}

function simpleQuestion(
  item: RawQuestion,
  type: QuestionType,
  report: Report,
  label: string,
): ContentQuestion | null {
  const options = item.options?.map((o) => o.trim());
  if (!item.id || !options || options.length !== 4 || item.answer === undefined || item.answer < 0 || item.answer > 3) {
    report.add(`${label}: dropped (malformed)`);
    return null;
  }
  if (!uniqueOptions(options) || options.some((o) => JUNK_OPTION.test(o) || !o)) {
    report.add(`${label}: dropped (bad options)`);
    return null;
  }
  const prompt = normalizeBlank(item.sentence ?? '');
  if (!prompt) {
    report.add(`${label}: dropped (no prompt)`);
    return null;
  }
  return makeQuestion({
    id: `oj-${item.id}`,
    type,
    prompt,
    options,
    answer: item.answer,
    explanation: cleanExplanation(item.explanation),
  });
}

function grammarFillQuestion(item: RawQuestion, report: Report): ContentQuestion | null {
  const question = simpleQuestion(item, 'GRAMMAR_FORM', report, 'grammar_fill');
  if (!question) return null;
  if (!question.prompt.includes('（　　）')) {
    report.add('grammar_fill: dropped (no blank)');
    return null;
  }
  if (item.complete_sentence) {
    const filled = compact(question.prompt.replace('（　　）', item.options![item.answer!]));
    if (filled !== compact(item.complete_sentence)) {
      report.add('grammar_fill: dropped (answer ≠ complete sentence)');
      return null;
    }
  }
  const point = item.explanation?.match(/文法点：([^\n]+)/)?.[1]?.trim();
  if (!question.explanation && point && !CHINESE.test(point)) {
    question.explanation = `Ngữ pháp: ${point}`;
  }
  if (item.complete_sentence && question.explanation) {
    question.explanation = `${compact(item.complete_sentence)}\n${question.explanation}`;
  }
  return question;
}

function readingSet(item: RawQuestion, type: QuestionType, report: Report, label: string, level: JlptLevel) {
  const content = item.passage?.trim();
  if (!content) {
    report.add(`${label}: dropped (malformed)`);
    return null;
  }
  if (/練習用文章|番目の文章です/.test(content)) {
    report.add(`${label}: dropped (placeholder passage)`);
    return null;
  }
  const subs = [
    ...(item.question && item.options
      ? [{ question: item.question, options: item.options, answer: item.answer ?? -1, explanation: item.explanation }]
      : []),
    ...(item.questions ?? []),
  ];
  // Một số mục không có id: tạo id ổn định từ nội dung bài đọc.
  const sourceId = item.id ?? `${level.toLowerCase()}-${label}-h${hashString(content).toString(36)}`;

  const passage: ContentPassage = { id: `oj-${sourceId}`, content };
  const questions: ContentQuestion[] = [];
  const seenAnswers = new Set<string>();
  subs.forEach((sub, index) => {
    if (questions.length >= MAX_QUESTIONS_PER_PASSAGE) return;
    const options = sub.options.map((o) => o.replace(/^[A-DＡ-Ｄ][.．、]\s*/, '').trim());
    const stated = sub.explanation?.match(/正解[はは為为：:\s]*([A-DＡ-Ｄ])/)?.[1];
    if (options.length !== 4 || sub.answer < 0 || sub.answer > 3 || !uniqueOptions(options)) {
      report.add(`${label}: dropped question (malformed)`);
      return;
    }
    if (stated && 'ABCDＡＢＣＤ'.indexOf(stated) % 4 !== sub.answer) {
      report.add(`${label}: dropped question (explanation contradicts answer)`);
      return;
    }
    // Cùng một bài đọc hay có câu hỏi lặp lại với cùng đáp án đúng.
    const answerKey = compact(options[sub.answer]);
    if (seenAnswers.has(answerKey)) {
      report.add(`${label}: dropped question (duplicate in passage)`);
      return;
    }
    seenAnswers.add(answerKey);
    questions.push({
      ...makeQuestion({
        id: `oj-${sourceId}-q${index + 1}`,
        type,
        prompt: sub.question.trim(),
        options,
        answer: sub.answer,
        explanation: cleanExplanation(sub.explanation),
      }),
      passageId: passage.id,
    });
  });
  if (questions.length === 0) return null;
  return { passage, questions };
}

// ------------------------------------------------------------------ main

async function main() {
  const { values } = parseArgs({
    options: {
      from: { type: 'string' },
      kanji: { type: 'string' },
      out: { type: 'string', default: 'content/openjlpt' },
    },
  });

  const kanji = values.kanji
    ? (JSON.parse(await readFile(values.kanji, 'utf8')) as KanjiData)
    : ((await (await fetch(KANJI_DATA_URL)).json()) as KanjiData);
  const onIndex = buildOnIndex(kanji);
  await mkdir(values.out!, { recursive: true });

  for (const level of LEVELS) {
    const raw = await loadLevel(level, values.from);
    const report = new Report();
    const questions: ContentQuestion[] = [];
    const passages: ContentPassage[] = [];
    const seenPrompts = new Set<string>();
    const seenIds = new Set<string>();
    const push = (question: ContentQuestion | null, label: string) => {
      if (!question) return;
      if (CHINESE.test(question.prompt) || question.options.some((o) => CHINESE.test(o))) {
        report.add(`${label}: dropped (chinese text)`);
        return;
      }
      const key = `${question.type}:${compact(question.prompt)}:${question.options.map(compact).sort().join('|')}`;
      if (!question.passageId && seenPrompts.has(key)) {
        report.add(`${label}: dropped (duplicate)`);
        return;
      }
      if (seenIds.has(question.id)) {
        report.add(`${label}: dropped (duplicate id)`);
        return;
      }
      seenPrompts.add(key);
      seenIds.add(question.id);
      questions.push(question);
      report.add(`${label}: kept`);
    };

    // 文字・語彙 -------------------------------------------------------------
    const words = readWordEntries(raw.vocab_reading, report);
    const originals = new Map(raw.vocab_reading.map((q) => [q.id, q]));
    const knownWords = new Set(words.map((w) => w.word));

    // N2 có bộ 表記 riêng (câu thật); các cấp khác: tách 1/2 số câu 漢字読み sang 表記.
    const n2Kanji =
      level === 'N2'
        ? raw.vocab_kanji.flatMap((item) => {
            const target = item.sentence?.match(/《([^》]+)》/)?.[1];
            const word = item.options?.[item.answer ?? -1];
            return item.id && target && word && isHiragana(target)
              ? [{ word, reading: target, sentence: item.sentence!.replace(`《${target}》`, `《${word}》`), sourceId: item.id }]
              : [];
          })
        : [];

    words.forEach((entry, index) => {
      const useForOrthography = level !== 'N2' && index % 2 === 1;
      const orthography = useForOrthography ? orthographyQuestion(entry, kanji, onIndex, knownWords) : null;
      if (orthography) {
        push(orthography, 'ORTHOGRAPHY (from vocab_reading)');
      } else {
        const question = kanjiReadingQuestion(entry, originals.get(entry.sourceId));
        if (!question) report.add('vocab_reading: dropped (no distractors)');
        push(question, 'KANJI_READING');
      }
    });
    for (const entry of n2Kanji) {
      const question = orthographyQuestion(entry, kanji, onIndex, knownWords);
      if (!question) report.add('vocab_kanji: dropped (no homophone distractors)');
      push(question, 'ORTHOGRAPHY');
    }

    for (const item of raw.vocab_context) {
      if (item.sentence?.includes('文脈に合う言葉を選びなさい') || /[A-Za-z]{2,}/.test(item.sentence ?? '')) {
        report.add('vocab_context: dropped (broken template)');
        continue;
      }
      push(simpleQuestion(item, 'CONTEXT', report, 'vocab_context'), 'CONTEXT');
    }
    for (const file of ['vocab_synonym', 'vocab_usage', 'vocab_compound'] as const) {
      report.add(`${file}: skipped (unreliable)`, raw[file].length);
    }

    // 文法 ---------------------------------------------------------------------
    for (const item of raw.grammar_fill) push(grammarFillQuestion(item, report), 'GRAMMAR_FORM');
    report.add('grammar_order: skipped (unreliable)', raw.grammar_order.length);
    report.add('grammar_passage: skipped (unreliable)', raw.grammar_passage.length);

    const seenPassages = new Set<string>();
    const addSet = (set: { passage: ContentPassage; questions: ContentQuestion[] } | null, label: string) => {
      if (!set) return;
      if (CHINESE.test(set.passage.content)) {
        report.add(`${label}: dropped passage (chinese text)`);
        return;
      }
      const key = compact(set.passage.content);
      if (seenPassages.has(key)) {
        report.add(`${label}: dropped (duplicate passage)`);
        return;
      }
      const before = questions.length;
      set.questions.forEach((q) => push(q, label));
      if (questions.length === before) return;
      seenPassages.add(key);
      passages.push(set.passage);
    };

    // 読解 ---------------------------------------------------------------------
    for (const [file, baseType] of Object.entries(READING_TYPES)) {
      // Bài dài của N2 là dạng nghị luận "筆者の考え" → khớp 主張理解 trong cấu trúc đề N2.
      const type = level === 'N2' && baseType === 'READING_LONG' ? 'READING_THEMATIC' : baseType;
      for (const item of raw[file as SourceFile]) addSet(readingSet(item, type, report, file, level), type);
    }

    const file: ContentFile = { source: 'openjlpt', level, answerFirst: false, passages, questions };
    await writeFile(path.join(values.out!, `${level.toLowerCase()}.json`), JSON.stringify(file, null, 1) + '\n');
    report.print(level);
    console.log(`  → ${questions.length} câu, ${passages.length} bài đọc`);
  }
}

await main();
