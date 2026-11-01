/**
 * Xếp hạng kết quả tra từ (chạy trên chỉ mục trong bộ nhớ, khoảng 23.000 từ).
 *
 * Bậc nhỏ hơn = khớp tốt hơn:
 * 0 trùng mặt chữ hoặc cách đọc · 1 trùng romaji · 1.1 trùng nét nghĩa đầu tiên · 1.2 trùng âm Hán Việt ·
 * 1.5 trùng nét nghĩa khác · 2 mặt chữ / cách đọc bắt đầu bằng chuỗi gõ · 2.5 romaji bắt đầu bằng chuỗi gõ ·
 * 3 trùng trọn từ trong nghĩa tiếng Việt · 4 chứa trong mặt chữ / âm Hán Việt · 5 chứa trong cách đọc / nghĩa tiếng Việt ·
 * 5.5 trùng nét nghĩa tiếng Anh · 6 trùng trọn từ trong nghĩa tiếng Anh · 7 chứa trong nghĩa tiếng Anh.
 *
 * Gõ có dấu thì so cả dấu ("học" không ra "hốc"); gõ không dấu thì so sau khi bỏ dấu.
 */
import type { JlptLevel } from '../../database/enums.js';
import { foldLongVowels, romajiToHiragana, toHiragana } from '../../jlpt/kana.js';

export interface SearchEntry {
  id: string;
  word: string;
  reading: string;
  romaji: string;
  level: JlptLevel | null;
  freq: number;
  hanviet: string | null;
  meaningsVi: string[];
  viSource: string | null;
  meaningsEn: string[];
}

export interface IndexedEntry extends SearchEntry {
  hira: string;
  hiraFold: string;
  hvLower: string;
  hvFold: string;
  /** Từng nét nghĩa tiếng Việt, tách theo dấu phẩy, giữ dấu. */
  viSenses: string[];
  viSensesFold: string[];
  viLower: string;
  viFold: string;
  enSenses: string[];
  enLower: string;
}

/** Chữ thường, bỏ dấu tiếng Việt, đ → d, gộp khoảng trắng. */
export function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}

const lower = (text: string) => text.toLowerCase().normalize('NFC').replace(/\s+/g, ' ').trim();

/** Chuẩn hoá mỗi nét nghĩa: bỏ chú thích trong ngoặc để "(màu) xanh" vẫn khớp "xanh". */
const senseKey = (sense: string) => lower(sense.replace(/\([^)]*\)/g, ' '));

/** Tách từ theo khoảng trắng và dấu câu, kể cả chữ có dấu; dùng so khớp trọn từ. */
const asTokens = (text: string) => ` ${text.replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `;

export function indexEntry(entry: SearchEntry): IndexedEntry {
  const hira = toHiragana(entry.reading);
  const viSenses = entry.meaningsVi.flatMap((sense) => sense.split(/[,;]/)).map(senseKey).filter(Boolean);
  const viText = entry.meaningsVi.join(' ; ');
  const enText = entry.meaningsEn.join(' ; ');
  return {
    ...entry,
    hira,
    hiraFold: foldLongVowels(hira),
    hvLower: lower(entry.hanviet ?? ''),
    hvFold: fold(entry.hanviet ?? ''),
    viSenses,
    viSensesFold: viSenses.map(fold),
    viLower: asTokens(lower(viText)),
    viFold: asTokens(fold(viText)),
    enSenses: entry.meaningsEn.flatMap((sense) => sense.split(/[,;]/)).map((s) => lower(s).replace(/^to /, '')),
    enLower: asTokens(lower(enText)),
  };
}

const JAPANESE = /[぀-ヿ㐀-鿿ー々]/;

export interface SearchQuery {
  raw: string;
  japanese: boolean;
  /** Query đã đổi sang hiragana (từ katakana hoặc romaji), null nếu không đổi được. */
  hira: string | null;
  hiraFold: string | null;
  lower: string;
  folded: string;
  accented: boolean;
}

export function parseQuery(input: string): SearchQuery {
  const raw = input.normalize('NFC').trim();
  const japanese = JAPANESE.test(raw);
  const hira = japanese ? toHiragana(raw) : romajiToHiragana(raw);
  const low = lower(raw);
  const folded = fold(raw);
  return {
    raw,
    japanese,
    hira,
    hiraFold: hira ? foldLongVowels(hira) : null,
    lower: low,
    folded,
    accented: !japanese && low !== folded,
  };
}

/** Bậc khớp của một từ; null nếu không khớp. */
export function rankEntry(entry: IndexedEntry, query: SearchQuery): number | null {
  if (query.japanese) {
    if (entry.word === query.raw || entry.hira === query.hira) return 0;
    if (entry.word.startsWith(query.raw) || (query.hira && entry.hira.startsWith(query.hira))) return 2;
    if (entry.word.includes(query.raw)) return 4;
    if (query.hira && entry.hira.includes(query.hira)) return 5;
    return null;
  }

  // Romaji chỉ áp dụng khi gõ không dấu.
  if (!query.accented && query.hira && query.hiraFold) {
    if (entry.hira === query.hira || entry.hiraFold === query.hiraFold) return 1;
  }

  const senses = query.accented ? entry.viSenses : entry.viSensesFold;
  const target = query.accented ? query.lower : query.folded;
  // Nghĩa lọc tự động kém tin cậy hơn nghĩa soạn tay và âm Hán Việt nên xếp sau trong cùng bậc.
  const sourcePenalty = entry.viSource === 'goda' ? 0 : 0.2;
  const firstMatch = senses.indexOf(target);
  if (firstMatch === 0) return 1.1 + sourcePenalty;
  if ((query.accented ? entry.hvLower : entry.hvFold) === target && target) return 1.2;
  if (firstMatch > 0) return 1.5 + sourcePenalty;

  if (!query.accented && query.hiraFold && query.folded.length >= 2 && entry.hiraFold.startsWith(query.hiraFold)) {
    return 2.5;
  }

  const haystack = query.accented ? entry.viLower : entry.viFold;
  if (haystack.includes(` ${target} `)) return 3 + sourcePenalty;
  if ((query.accented ? entry.hvLower : entry.hvFold).includes(target)) return 4;
  if (target.length >= 2 && haystack.includes(target)) return 5 + sourcePenalty;

  if (query.accented) return null;
  if (entry.enSenses.includes(query.lower)) return 5.5;
  if (entry.enLower.includes(` ${query.lower} `)) return 6;
  if (query.lower.length >= 3 && entry.enLower.includes(query.lower)) return 7;
  return null;
}

const LEVEL_ORDER: Record<string, number> = { N5: 0, N4: 1, N3: 2, N2: 3, N1: 4 };

/** Trong cùng bậc: từ phổ biến trước, rồi từ thuộc JLPT cấp thấp, rồi từ ngắn. */
export function searchEntries(entries: IndexedEntry[], input: string, limit: number, level?: JlptLevel): IndexedEntry[] {
  const query = parseQuery(input);
  if (!query.raw) return [];
  const ranked: { entry: IndexedEntry; rank: number }[] = [];
  for (const entry of entries) {
    if (level && entry.level !== level) continue;
    const rank = rankEntry(entry, query);
    if (rank !== null) ranked.push({ entry, rank });
  }
  ranked.sort(
    (a, b) =>
      a.rank - b.rank ||
      a.entry.freq - b.entry.freq ||
      (LEVEL_ORDER[a.entry.level ?? ''] ?? 9) - (LEVEL_ORDER[b.entry.level ?? ''] ?? 9) ||
      a.entry.word.length - b.entry.word.length,
  );
  return ranked.slice(0, limit).map((r) => r.entry);
}
