/**
 * Đọc từ điển Nhật–Việt OVDP (định dạng StarDict) và lọc lấy nghĩa dùng được.
 *
 * Mục trong OVDP có hai kiểu:
 *  - "@cách đọc\n- nghĩa\n- nghĩa": do người biên soạn, sạch.
 *  - "- {cách đọc}\n- {english} , nghĩa của từ tiếng Anh": ghép máy qua từ điển Anh–Việt, chứa toàn bộ
 *    nghĩa của từ tiếng Anh (kể cả nghĩa không liên quan), nên chỉ giữ vài nét đầu đúng từ loại.
 */

/** Đọc cặp .idx/.dict của StarDict thành map từ khoá → các mục. */
export function readStardict(idx: Buffer, dict: Buffer): Map<string, string[]> {
  const entries = new Map<string, string[]>();
  let i = 0;
  while (i < idx.length) {
    const end = idx.indexOf(0, i);
    const key = idx.toString('utf8', i, end);
    const offset = idx.readUInt32BE(end + 1);
    const size = idx.readUInt32BE(end + 5);
    i = end + 9;
    const body = dict.toString('utf8', offset, offset + size);
    const list = entries.get(key);
    if (list) list.push(body);
    else entries.set(key, [body]);
  }
  return entries;
}

const MAX_SENSES = 3;
const MAX_SEGMENTS_PER_SENSE = 3;
const MAX_SEGMENT_LENGTH = 32;

/** Động từ / tính từ tiếng Nhật không nên nhận nghĩa danh từ của từ tiếng Anh ("meet" → "cuộc gặp gỡ"). */
const NOUN_MARKER = /^(sự|cuộc|cái|điều|việc|người|con|chiếc|vật|đồ|tính|lòng|nỗi|niềm|ngành|nghề|môn|bộ|tình trạng)\s/;
/** Danh từ tiếng Nhật không nên nhận nghĩa động từ dạng "làm cho…". */
const VERB_MARKER = /^(làm|làm cho|khiến|bắt|đặt|gây|trở nên)\s/;
/** Đoạn còn sót thành ngữ tiếng Anh (kiểu "my pretty con nhỏ của tôi"). */
const ENGLISH_WORDS = new Set(['the', 'of', 'my', 'your', 'one', 'with', 'for', 'out', 'up', 'off', 'by', 'from', 'is', 'it']);
const hasEnglish = (text: string) => text.toLowerCase().split(/\s+/).some((token) => ENGLISH_WORDS.has(token));

const stripParens = (text: string) => {
  let current = text;
  for (let i = 0; i < 3; i++) {
    const next = current.replace(/\([^()]*\)/g, ' ');
    if (next === current) break;
    current = next;
  }
  // Nhãn "(xem) heart": phần sau "xem" là từ tiếng Anh tham chiếu, không phải nghĩa.
  return current.replace(/\s+/g, ' ').trim();
};

const tidySegment = (segment: string) =>
  segment
    .replace(/^[\s,.;:+\-–*!]+|[\s,.;:+\-–*!]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Tách nét nghĩa, bỏ đoạn quá dài, còn tiếng Anh, hoặc sai từ loại. */
function segmentsOf(text: string, pos: string[]): string[] {
  const isVerbOrAdj = pos.some((p) => p.startsWith('v') || p.startsWith('adj-i'));
  const isNoun = pos.some((p) => p === 'n') && !isVerbOrAdj;
  const raw = stripParens(text)
    .split(/[;,]/)
    .map(tidySegment)
    .filter((s) => s.length > 0 && s.length <= MAX_SEGMENT_LENGTH)
    .filter((s) => !hasEnglish(s) && !/[{}=@]/.test(s) && !s.includes('xem'));
  const typed = raw.filter((s) => {
    if (isVerbOrAdj) return !NOUN_MARKER.test(s);
    if (isNoun) return !VERB_MARKER.test(s);
    return true;
  });
  // Lọc từ loại làm rỗng thì thà giữ nghĩa gốc còn hơn không có gì.
  return typed.length ? typed : raw;
}

interface Section {
  /** Cách đọc / mặt chữ ở đầu mục (rỗng nếu mục không ghi). */
  head: string[];
  lines: string[];
}

function splitSections(body: string): Section[] {
  const sections: Section[] = [];
  let current: Section | null = null;
  for (const line of body.split('\n').map((l) => l.trim())) {
    if (!line) continue;
    const at = /^@(.+)$/.exec(line);
    const braced = /^-\s*\{([^}]*)\}\s*$/.exec(line);
    // "- {たべる}": cách đọc thì mở mục mới; "- {general idea}" (không có nghĩa kèm) là từ tiếng Anh, bỏ qua.
    const head = at?.[1] ?? (braced && /[぀-ヿ㐀-鿿]/.test(braced[1]) ? braced[1] : null);
    if (head) {
      if (current && current.lines.length === 0) current.head.push(...splitHead(head));
      else sections.push((current = { head: splitHead(head), lines: [] }));
      continue;
    }
    if (braced) continue;
    if (!current) sections.push((current = { head: [], lines: [] }));
    current.lines.push(line);
  }
  return sections;
}

const splitHead = (head: string) =>
  head
    .split(/[\/／・、,（）()\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

const isKana = (text: string) => /^[぀-ヿー]+$/.test(text);

/** Mục này có nói về đúng từ cần tìm không (khớp cách đọc, hoặc khớp mặt chữ khi từ khoá là kana). */
function sectionMatches(section: Section, word: string, reading: string): boolean {
  if (section.head.length === 0) return true;
  if (section.head.includes(reading) || section.head.includes(word)) return true;
  // Mục ghi cả cách đọc lẫn chữ Hán khác cách đọc → mục của từ đồng tự khác âm (題 "@ぎょう").
  if (!isKana(word)) return !section.head.some(isKana);
  // Từ khoá kana, mục ghi chữ Hán ("あそこ" → "@彼処"): chấp nhận.
  return section.head.every((h) => !isKana(h));
}

/**
 * Lấy các nét nghĩa tiếng Việt cho một từ.
 * @param bodies các mục trong OVDP của từ khoá
 * @param pos từ loại theo JMdict, dùng để loại nghĩa sai từ loại
 */
export function extractVietnamese(bodies: string[], word: string, reading: string, pos: string[]): string[] {
  const senses: string[] = [];
  const seen = new Set<string>();
  for (const body of bodies) {
    for (const section of splitSections(body)) {
      if (!sectionMatches(section, word, reading)) continue;
      for (const line of section.lines) {
        // "=例文 +: bản dịch" là câu ví dụ, "* tính từ" là nhãn từ loại.
        if (!line.startsWith('-')) continue;
        const english = /^-\s*\{([^}]*)\}\s*,?\s*(.*)$/.exec(line);
        const text = english ? english[2] : line.slice(1);
        const segments = segmentsOf(text, pos)
          .filter((s) => !seen.has(s.toLowerCase()))
          .slice(0, MAX_SEGMENTS_PER_SENSE);
        if (segments.length === 0) continue;
        segments.forEach((s) => seen.add(s.toLowerCase()));
        senses.push(segments.join(', '));
        if (senses.length >= MAX_SENSES) return senses;
      }
    }
  }
  return senses;
}
