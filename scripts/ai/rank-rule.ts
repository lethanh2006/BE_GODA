/**
 * Baseline của GĐ0: chạy bộ tra từ theo luật hiện tại (word-search.ts) trên bộ test, ghi thứ hạng ra file
 * để `ai/goda_ai/evaluate.py` tính điểm cùng một cách với các hệ thống AI.
 *   pnpm ai:rank-rule
 *   pnpm ai:rank-rule --queries ai/data/test-queries.jsonl --out ai/runs/rule.jsonl --k 10
 * Chỉ mục dựng từ content/vocab giống hệt dữ liệu production (23.237 từ), không cần database.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { indexEntry, searchEntries } from '../../src/modules/dictionary/word-search.js';
import { loadWordFiles } from '../vocab/words.js';

const AI_DIR = path.resolve(import.meta.dirname, '../../ai');
const { values } = parseArgs({
  options: {
    queries: { type: 'string', default: path.join(AI_DIR, 'data/test-queries.jsonl') },
    out: { type: 'string', default: path.join(AI_DIR, 'runs/rule.jsonl') },
    k: { type: 'string', default: '10' },
  },
});
const k = Number(values.k);

const entries = (await loadWordFiles()).flatMap((file) => file.rows).map(indexEntry);
const queries = (await readFile(values.queries, 'utf8'))
  .split('\n')
  .filter((line) => line.trim())
  .map((line) => JSON.parse(line) as { id: string; q: string });

const lines = queries.map(({ id, q }) => JSON.stringify({ id, ranked: searchEntries(entries, q, k).map((entry) => entry.id) }));
await mkdir(path.dirname(values.out), { recursive: true });
await writeFile(values.out, `${lines.join('\n')}\n`, 'utf8');
console.log(`Bộ tra theo luật: ${queries.length} câu trên ${entries.length} từ → ${path.relative(process.cwd(), values.out)}`);
