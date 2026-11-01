/**
 * Dựng dữ liệu từ vựng và kanji vào content/vocab/ (xem content/README.md).
 *
 *   pnpm content:vocab                  # tải nguồn về .cache/vocab-sources rồi dựng
 *   pnpm content:vocab --from <dir>     # dùng thư mục nguồn có sẵn
 *
 * Nguồn: OpenJLPT (danh sách từ theo cấp, câu ví dụ, kanji), JMdict (từ thông dụng ngoài JLPT, tần suất),
 * OVDP (nghĩa tiếng Việt), Unihan (âm Hán Việt). Cần lệnh `unzip`, `tar` trên máy.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { gunzipSync } from 'node:zlib';
import { hashString } from '../../src/common/utils/random.js';
import type { JlptLevel } from '../../src/database/enums.js';
import { kanaToRomaji } from '../../src/jlpt/kana.js';
import type { ContentKanji, ContentWord } from '../../src/jlpt/vocab-content.js';
import { extractVietnamese, readStardict } from './ovdp.js';

const OPENJLPT_COMMIT = '0d1d3410bec90bd4098a7c72de820543cb4f707c';
const OPENJLPT_RAW = `https://raw.githubusercontent.com/evanclan/OpenJLPT/${OPENJLPT_COMMIT}/data/json`;
const JMDICT_TAG = '3.6.2+20261026175559';
const JMDICT_COMMON = `https://github.com/scriptin/jmdict-simplified/releases/download/${encodeURIComponent(JMDICT_TAG)}/jmdict-eng-common-${encodeURIComponent(JMDICT_TAG)}.json.tgz`;
const JMDICT_XML = 'http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz';
const OVDP_ZIP = 'https://sourceforge.net/projects/ovdp/files/Stardict/Japanese/NhatViet.zip/download';
const UNIHAN_ZIP = 'https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip';

const LEVELS: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
const OUT_DIR = path.resolve(import.meta.dirname, '../../content/vocab');
const MAX_EXAMPLES = 3;
const MAX_EN_SENSES = 4;
const KANJI_CHAR = /[㐀-鿿々]/;

const { values: args } = parseArgs({ options: { from: { type: 'string' } } });
const SOURCES = path.resolve(args.from ?? path.resolve(import.meta.dirname, '../../.cache/vocab-sources'));

async function download(url: string, file: string): Promise<string> {
  const target = path.join(SOURCES, file);
  if (existsSync(target)) return target;
  console.log(`Tải ${url}`);
  await mkdir(path.dirname(target), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  await writeFile(target, Buffer.from(await res.arrayBuffer()));
  return target;
}

interface OpenJlptWord {
  id: string;
  word: string;
  reading: string;
  meanings: string[];
  pos?: string[];
  jmdict_id?: number;
  examples?: { ja: string; furigana?: string; en: string; tatoeba_id?: number }[];
}

interface OpenJlptKanji {
  character: string;
  strokes: number;
  freq?: number | null;
  radical?: string;
  onyomi: string[];
  kunyomi: string[];
  meanings: string[];
}

interface JmdictWord {
  id: string;
  kanji: { text: string; common: boolean }[];
  kana: { text: string; common: boolean }[];
  sense: { partOfSpeech: string[]; gloss: { text: string }[] }[];
}

const openJlpt = async <T>(kind: 'vocab' | 'kanji', level: JlptLevel) =>
  JSON.parse(
    await readFile(await download(`${OPENJLPT_RAW}/${kind}/${level.toLowerCase()}.json`, `openjlpt/${kind}-${level}.json`), 'utf8'),
  ) as T[];

async function loadJmdictCommon(): Promise<JmdictWord[]> {
  const archive = await download(JMDICT_COMMON, 'jmdict/common.json.tgz');
  const dir = path.dirname(archive);
  execFileSync('tar', ['xzf', archive, '-C', dir]);
  const name = (await readdir(dir)).find((n) => n.startsWith('jmdict-eng-common') && n.endsWith('.json'));
  if (!name) throw new Error('Không thấy file JSON trong gói JMdict');
  return (JSON.parse(await readFile(path.join(dir, name), 'utf8')) as { words: JmdictWord[] }).words;
}

/** Hạng tần suất từ thẻ ưu tiên của JMdict: nfXX là nhóm 500 từ theo báo chí; số nhỏ = phổ biến hơn. */
async function loadFrequency(): Promise<Map<number, number>> {
  const xml = gunzipSync(await readFile(await download(JMDICT_XML, 'jmdict/JMdict_e.gz'))).toString('utf8');
  const ranks = new Map<number, number>();
  for (const entry of xml.split('<entry>').slice(1)) {
    const id = /<ent_seq>(\d+)<\/ent_seq>/.exec(entry)?.[1];
    if (!id) continue;
    let rank = 99;
    for (const [, tag] of entry.matchAll(/<(?:ke|re)_pri>([^<]+)</g)) {
      const nf = /^nf(\d+)$/.exec(tag);
      const value = nf ? Number(nf[1]) : /1$/.test(tag) ? 30 : /2$/.test(tag) ? 49 : 60;
      rank = Math.min(rank, value);
    }
    ranks.set(Number(id), rank);
  }
  return ranks;
}

async function loadOvdp(): Promise<Map<string, string[]>> {
  const archive = await download(OVDP_ZIP, 'ovdp/NhatViet.zip');
  const dir = path.dirname(archive);
  execFileSync('unzip', ['-qo', archive, '-d', dir]);
  const base = path.join(dir, 'NhatViet/star_nhatviet');
  return readStardict(await readFile(`${base}.idx`), await readFile(`${base}.dict`));
}

/** Âm Hán Việt theo Unihan; chữ giản lược kiểu Nhật (学, 国) tra qua biến thể (學, 國). */
async function loadHanViet(): Promise<Map<string, string[]>> {
  const archive = await download(UNIHAN_ZIP, 'unihan/Unihan.zip');
  const dir = path.dirname(archive);
  execFileSync('unzip', ['-qo', archive, '-d', dir]);
  const rows = async (file: string) =>
    (await readFile(path.join(dir, file), 'utf8'))
      .split('\n')
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => l.split('\t'));
  const fromCode = (code: string) => String.fromCodePoint(parseInt(code.split('<')[0].slice(2), 16));

  const readings = new Map<string, string[]>();
  for (const [code, key, value] of await rows('Unihan_Readings.txt')) {
    if (key === 'kVietnamese') readings.set(fromCode(code), value.split(/\s+/));
  }
  const variantKeys = new Set(['kTraditionalVariant', 'kZVariant', 'kSemanticVariant', 'kSimplifiedVariant']);
  for (const [code, key, value] of await rows('Unihan_Variants.txt')) {
    if (!variantKeys.has(key)) continue;
    const char = fromCode(code);
    if (readings.has(char)) continue;
    const found = value.split(/\s+/).map(fromCode).find((v) => readings.has(v));
    if (found) readings.set(char, readings.get(found)!);
  }
  // Âm soạn tay có ưu tiên cao nhất: bù chữ Unihan thiếu và đưa âm thông dụng lên đầu.
  const manual = JSON.parse(await readFile(path.join(OUT_DIR, 'hanviet-goda.json'), 'utf8')) as Record<string, string>;
  for (const [char, value] of Object.entries(manual)) readings.set(char, value.split(/\s+/));
  return readings;
}

const dedupeEnglish = (senses: string[]) => [...new Set(senses.map((s) => s.trim()).filter(Boolean))];

const stableKey = (id: string) => hashString(id) >>> 0;

/** Âm Hán Việt của từ: lấy âm đầu của từng chữ Hán, thiếu chữ nào thì bỏ cả từ để tránh hiện âm cụt. */
function wordHanViet(word: string, readings: Map<string, string[]>): string | null {
  const chars = [...word].filter((ch) => KANJI_CHAR.test(ch) && ch !== '々');
  if (chars.length === 0) return null;
  const parts = chars.map((ch) => readings.get(ch)?.[0]);
  return parts.every(Boolean) ? parts.join(' ') : null;
}

const writeLines = (file: string, rows: unknown[]) =>
  writeFile(path.join(OUT_DIR, file), `[\n${rows.map((r) => JSON.stringify(r)).join(',\n')}\n]\n`);

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const [frequency, ovdp, hanViet, common] = await Promise.all([
    loadFrequency(),
    loadOvdp(),
    loadHanViet(),
    loadJmdictCommon(),
  ]);

  const seenPair = new Set<string>();
  const seenJmdict = new Set<number>();
  const viById: Record<string, string[]> = {};

  const finish = (word: Omit<ContentWord, 'hanviet' | 'romaji'>) => {
    const vi = extractVietnamese(ovdp.get(word.word) ?? [], word.word, word.reading, word.pos);
    const fallback = vi.length ? vi : extractVietnamese(ovdp.get(word.reading) ?? [], word.word, word.reading, word.pos);
    if (fallback.length) viById[word.id] = fallback;
    return { ...word, romaji: kanaToRomaji(word.reading), hanviet: wordHanViet(word.word, hanViet) } satisfies ContentWord;
  };

  // N5 trước: từ trùng giữa các cấp được xếp vào cấp thấp nhất.
  for (const level of LEVELS) {
    const rows = await openJlpt<OpenJlptWord>('vocab', level);
    const words: ContentWord[] = [];
    for (const row of rows) {
      const pair = `${row.word}|${row.reading}`;
      if (seenPair.has(pair)) continue;
      seenPair.add(pair);
      if (row.jmdict_id) seenJmdict.add(row.jmdict_id);
      words.push(
        finish({
          id: row.id,
          word: row.word,
          reading: row.reading,
          level,
          pos: row.pos ?? [],
          en: dedupeEnglish(row.meanings).slice(0, MAX_EN_SENSES),
          freq: row.jmdict_id ? (frequency.get(row.jmdict_id) ?? 99) : 99,
          examples: (row.examples ?? []).slice(0, MAX_EXAMPLES).map((e) => ({
            ja: e.ja,
            furigana: e.furigana ?? null,
            en: e.en,
            tatoebaId: e.tatoeba_id ?? null,
          })),
        }),
      );
    }
    // Thứ tự trong file là thứ tự học: từ phổ biến trước, cùng nhóm thì trộn cố định theo id
    // (danh sách gốc xếp theo bảng chữ cái, học liền nhau rất dễ lẫn).
    words.sort((a, b) => a.freq - b.freq || stableKey(a.id) - stableKey(b.id));
    await writeLines(`words-${level.toLowerCase()}.json`, words);
    console.log(`${level}: ${words.length} từ`);
  }

  // Từ thông dụng ngoài danh sách JLPT — chỉ để tra cứu.
  const extras: ContentWord[] = [];
  for (const row of common) {
    if (seenJmdict.has(Number(row.id))) continue;
    const reading = row.kana[0]?.text;
    if (!reading) continue;
    const word = (row.kanji.find((k) => k.common) ?? row.kanji[0])?.text ?? reading;
    const pair = `${word}|${reading}`;
    if (seenPair.has(pair)) continue;
    seenPair.add(pair);
    extras.push(
      finish({
        id: `jm${row.id}`,
        word,
        reading,
        level: null,
        pos: [...new Set(row.sense.flatMap((s) => s.partOfSpeech))].slice(0, 4),
        en: dedupeEnglish(row.sense.map((s) => s.gloss.map((g) => g.text).join(', '))).slice(0, MAX_EN_SENSES),
        freq: frequency.get(Number(row.id)) ?? 99,
        examples: [],
      }),
    );
  }
  extras.sort((a, b) => a.freq - b.freq || stableKey(a.id) - stableKey(b.id));
  await writeLines('words-common.json', extras);
  console.log(`Ngoài JLPT: ${extras.length} từ`);

  const kanji: ContentKanji[] = [];
  const seenKanji = new Set<string>();
  const missing: string[] = [];
  for (const level of LEVELS) {
    for (const row of await openJlpt<OpenJlptKanji>('kanji', level)) {
      if (seenKanji.has(row.character)) continue;
      seenKanji.add(row.character);
      const hv = hanViet.get(row.character) ?? [];
      if (hv.length === 0) missing.push(row.character);
      kanji.push({
        char: row.character,
        level,
        strokes: row.strokes,
        freq: row.freq ?? null,
        radical: row.radical ?? null,
        on: row.onyomi,
        kun: row.kunyomi,
        en: row.meanings,
        hanviet: hv,
      });
    }
  }
  await writeLines('kanji.json', kanji);
  console.log(`Kanji: ${kanji.length}, thiếu Hán Việt: ${missing.length} ${missing.join('')}`);

  await writeFile(path.join(OUT_DIR, 'vi-ovdp.json'), `{\n${Object.entries(viById).map(([id, vi]) => `${JSON.stringify(id)}:${JSON.stringify(vi)}`).join(',\n')}\n}\n`);
  console.log(`Có nghĩa tiếng Việt (OVDP): ${Object.keys(viById).length}`);
}

await main();
