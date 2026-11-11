/**
 * Xuất từ vựng cho các script AI (Python trong ai/), mỗi dòng một từ dạng JSON (JSONL).
 *   pnpm ai:export-words                 # từ JLPT N5–N1 → ai/data/words.jsonl
 *   pnpm ai:export-words --all           # thêm cả từ thông dụng ngoài JLPT
 *   pnpm ai:export-words --out <file>
 * Đọc thẳng content/vocab bằng cùng hàm với seed, không cần database.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { loadWordFiles } from '../vocab/words.js';

const { values } = parseArgs({
  options: {
    out: { type: 'string', default: path.resolve(import.meta.dirname, '../../ai/data/words.jsonl') },
    all: { type: 'boolean', default: false },
  },
});

const rows = (await loadWordFiles()).flatMap((file) => file.rows).filter((row) => values.all || row.level !== null);
const lines = rows.map((row) =>
  JSON.stringify({
    id: row.id,
    word: row.word,
    reading: row.reading,
    romaji: row.romaji,
    level: row.level,
    pos: row.pos,
    meaningsVi: row.meaningsVi,
    viSource: row.viSource,
    meaningsEn: row.meaningsEn,
    hanviet: row.hanviet,
    freq: row.freq,
    lessonNo: row.lessonNo,
    lessonOrder: row.lessonOrder,
  }),
);

await mkdir(path.dirname(values.out), { recursive: true });
await writeFile(values.out, `${lines.join('\n')}\n`, 'utf8');

const count = (pick: (row: (typeof rows)[number]) => string) =>
  Object.entries(Object.groupBy(rows, pick)).map(([key, group]) => `${key}: ${group?.length ?? 0}`).join(' · ');
console.log(`Đã ghi ${rows.length} từ vào ${path.relative(process.cwd(), values.out)}`);
console.log(`  theo cấp: ${count((row) => row.level ?? 'ngoài JLPT')}`);
console.log(`  nguồn nghĩa Việt: ${count((row) => row.viSource ?? 'chưa có')}`);
