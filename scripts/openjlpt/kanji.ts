import { isKanji, toHiragana, voice } from './kana.js';

export interface KanjiEntry {
  readings_on: string[] | null;
  readings_kun: string[] | null;
  jlpt_new: number | null;
  freq: number | null;
}

export type KanjiData = Record<string, KanjiEntry>;

interface ReadingOption {
  /** Cách đọc gốc (dùng để tìm chữ đồng âm). */
  base: string;
  /** Cách đọc thực tế trong từ (sau khi biến âm). */
  surface: string;
  kind: 'on' | 'kun';
}

/** Các biến thể của một âm khi ghép từ: rendaku (biến âm đục), sokuon (âm cuối thành っ). */
function variants(base: string, position: number, total: number): string[] {
  const forms = new Set([base]);
  if (position > 0) {
    for (const voiced of voice(base[0])) forms.add(voiced + base.slice(1));
  }
  if (position < total - 1 && base.length >= 2 && /[つくちき]$/.test(base)) {
    forms.add(base.slice(0, -1) + 'っ');
  }
  return [...forms];
}

function readingsOf(kanji: KanjiData, ch: string, position: number, total: number): ReadingOption[] {
  const entry = kanji[ch];
  if (!entry) return [];
  const out: ReadingOption[] = [];
  for (const on of entry.readings_on ?? []) {
    const base = toHiragana(on.replace(/[-.]/g, ''));
    for (const surface of variants(base, position, total)) out.push({ base, surface, kind: 'on' });
  }
  for (const kun of entry.readings_kun ?? []) {
    const base = kun.replace(/^-|-$/g, '').split('.')[0];
    if (!base) continue;
    for (const surface of variants(base, position, total)) out.push({ base, surface, kind: 'kun' });
  }
  return out;
}

export interface Segment {
  char: string;
  reading: string;
  base?: string;
  kind?: 'on' | 'kun';
}

/** Tách cách đọc của từ thành từng phần ứng với mỗi chữ (地下鉄 → ち|か|てつ). */
export function alignReading(word: string, reading: string, kanji: KanjiData): Segment[] | null {
  const chars = [...word];
  const kanjiCount = chars.filter(isKanji).length;

  const solve = (ci: number, ri: number, kanjiIndex: number): Segment[] | null => {
    if (ci === chars.length) return ri === reading.length ? [] : null;
    const ch = chars[ci];

    if (!isKanji(ch)) {
      const kana = toHiragana(ch);
      if (reading.startsWith(kana, ri)) {
        const rest = solve(ci + 1, ri + kana.length, kanjiIndex);
        return rest && [{ char: ch, reading: kana }, ...rest];
      }
      return null;
    }

    for (const option of readingsOf(kanji, ch, kanjiIndex, kanjiCount)) {
      if (!reading.startsWith(option.surface, ri)) continue;
      const rest = solve(ci + 1, ri + option.surface.length, kanjiIndex + 1);
      if (rest) {
        return [{ char: ch, reading: option.surface, base: option.base, kind: option.kind }, ...rest];
      }
    }
    return null;
  };

  return solve(0, 0, 0);
}

/** Chỉ mục: âm on → danh sách chữ Hán (ưu tiên chữ thông dụng). */
export function buildOnIndex(kanji: KanjiData): Map<string, string[]> {
  const index = new Map<string, { ch: string; freq: number }[]>();
  for (const [ch, entry] of Object.entries(kanji)) {
    // Chỉ dùng chữ có thứ hạng tần suất và 2 âm on chính — tránh âm đọc hiếm (vd 率 = しゅつ).
    if (entry.freq === null) continue;
    for (const on of (entry.readings_on ?? []).slice(0, 2)) {
      const base = toHiragana(on.replace(/[-.]/g, ''));
      const list = index.get(base) ?? [];
      list.push({ ch, freq: entry.freq });
      index.set(base, list);
    }
  }
  return new Map(
    [...index].map(([reading, list]) => [reading, list.sort((a, b) => a.freq - b.freq).map((x) => x.ch)]),
  );
}
