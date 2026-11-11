/**
 * Đọc từ vựng trong content/vocab thành đúng các dòng mà seed nạp vào bảng `words`.
 * Dùng chung cho `pnpm db:seed` và các script AI (scripts/ai/), để mọi nơi ghép nghĩa giống hệt nhau.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { JlptLevel } from '../../src/database/enums.js';
import { type ContentExample, type ContentWord, LESSON_SIZE } from '../../src/jlpt/vocab-content.js';

export const VOCAB_DIR = path.resolve(import.meta.dirname, '../../content/vocab');

export interface WordRow {
  id: string;
  word: string;
  reading: string;
  romaji: string;
  level: JlptLevel | null;
  pos: string[];
  meaningsVi: string[];
  /** "goda": soạn tay; "ovdp": lọc tự động; null: chưa có nghĩa tiếng Việt. */
  viSource: 'goda' | 'ovdp' | null;
  meaningsEn: string[];
  hanviet: string | null;
  freq: number;
  examples: ContentExample[];
  lessonNo: number | null;
  lessonOrder: number | null;
}

/** Nghĩa GODA soạn tay: mỗi dòng `từ|cách đọc|nghĩa; nghĩa`, cách đọc để trống nếu trùng mặt chữ. */
export async function loadManualMeanings(dir: string): Promise<Map<string, string[]>> {
  const meanings = new Map<string, string[]>();
  const names = (await readdir(dir)).filter((n) => /^vi-goda-.*\.txt$/.test(n)).sort();
  for (const name of names) {
    for (const line of (await readFile(path.join(dir, name), 'utf8')).split('\n')) {
      if (!line.trim()) continue;
      const [word, reading, text] = line.split('|');
      if (!text) throw new Error(`${name}: dòng sai định dạng: ${line}`);
      meanings.set(`${word}|${reading || word}`, text.split(';').map((s) => s.trim()).filter(Boolean));
    }
  }
  return meanings;
}

/** Mỗi file words-*.json thành một nhóm dòng; nghĩa soạn tay ưu tiên hơn nghĩa OVDP. */
export async function loadWordFiles(dir = VOCAB_DIR): Promise<{ name: string; rows: WordRow[] }[]> {
  const readJson = async <T>(name: string) => JSON.parse(await readFile(path.join(dir, name), 'utf8')) as T;
  const manual = await loadManualMeanings(dir);
  const ovdp = await readJson<Record<string, string[]>>('vi-ovdp.json');

  const toRow = (item: ContentWord, index: number): WordRow => {
    const handWritten = manual.get(`${item.word}|${item.reading}`);
    const auto = ovdp[item.id];
    return {
      id: item.id,
      word: item.word,
      reading: item.reading,
      romaji: item.romaji,
      level: item.level,
      pos: item.pos,
      meaningsVi: handWritten ?? auto ?? [],
      viSource: handWritten ? 'goda' : auto ? 'ovdp' : null,
      meaningsEn: item.en,
      hanviet: item.hanviet,
      freq: item.freq,
      examples: item.examples,
      lessonNo: item.level ? Math.floor(index / LESSON_SIZE) + 1 : null,
      lessonOrder: item.level ? index % LESSON_SIZE : null,
    };
  };

  const names = (await readdir(dir)).filter((n) => /^words-.*\.json$/.test(n)).sort();
  const files: { name: string; rows: WordRow[] }[] = [];
  for (const name of names) files.push({ name, rows: (await readJson<ContentWord[]>(name)).map(toRow) });
  return files;
}
