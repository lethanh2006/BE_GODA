import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, type Repository } from 'typeorm';
import { Kanji, UserWord, Word } from '../../database/entities/index.js';
import type { JlptLevel } from '../../database/enums.js';
import { fold, indexEntry, type IndexedEntry, searchEntries } from './word-search.js';

const KANJI_CHAR = /[㐀-鿿]/g;
const LEVEL_ORDER: Record<string, number> = { N5: 0, N4: 1, N3: 2, N2: 3, N1: 4 };
const MAX_KANJI_WORDS = 40;

export const toSummary = (entry: IndexedEntry) => ({
  id: entry.id,
  word: entry.word,
  reading: entry.reading,
  romaji: entry.romaji,
  level: entry.level,
  hanviet: entry.hanviet,
  meaningsVi: entry.meaningsVi,
  viSource: entry.viSource,
  meaningsEn: entry.meaningsEn,
});

@Injectable()
export class DictionaryService {
  /** Chỉ mục trong bộ nhớ, dựng ở lần tra đầu tiên; dữ liệu từ vựng chỉ đổi khi seed (cần khởi động lại). */
  private index?: Promise<IndexedEntry[]>;
  private kanjiIndex?: Promise<(Kanji & { hvFold: string[] })[]>;

  constructor(
    @InjectRepository(Word) private readonly words: Repository<Word>,
    @InjectRepository(Kanji) private readonly kanji: Repository<Kanji>,
    @InjectRepository(UserWord) private readonly userWords: Repository<UserWord>,
  ) {}

  private entries(): Promise<IndexedEntry[]> {
    this.index ??= this.words
      .find({
        select: {
          id: true,
          word: true,
          reading: true,
          romaji: true,
          level: true,
          freq: true,
          hanviet: true,
          meaningsVi: true,
          viSource: true,
          meaningsEn: true,
        },
      })
      .then((rows) => rows.map(indexEntry))
      .catch((error: unknown) => {
        this.index = undefined;
        throw error;
      });
    return this.index;
  }

  private kanjiEntries() {
    this.kanjiIndex ??= this.kanji
      .find()
      .then((rows) => rows.map((row) => Object.assign(row, { hvFold: row.hanviet.map(fold) })))
      .catch((error: unknown) => {
        this.kanjiIndex = undefined;
        throw error;
      });
    return this.kanjiIndex;
  }

  private byIdIndex?: Promise<Map<string, IndexedEntry>>;

  private byId(): Promise<Map<string, IndexedEntry>> {
    this.byIdIndex ??= this.entries()
      .then((list) => new Map(list.map((entry) => [entry.id, entry])))
      .catch((error: unknown) => {
        this.byIdIndex = undefined;
        throw error;
      });
    return this.byIdIndex;
  }

  async search(q: string, limit: number, level?: JlptLevel) {
    const hits = searchEntries(await this.entries(), q, limit, level);
    return hits.map(toSummary);
  }

  async has(id: string): Promise<boolean> {
    return (await this.byId()).has(id);
  }

  /** Tóm tắt các từ theo đúng thứ tự id truyền vào; id không có trong từ điển bị bỏ qua. */
  async summaries(ids: string[]) {
    const byId = await this.byId();
    return ids.flatMap((id) => {
      const entry = byId.get(id);
      return entry ? [toSummary(entry)] : [];
    });
  }

  /** Tổng số mục, hiển thị ở trang từ điển. */
  async overview() {
    const entries = await this.entries();
    const kanji = await this.kanjiEntries();
    const levels = (['N5', 'N4', 'N3', 'N2', 'N1'] as JlptLevel[]).map((level) => ({
      level,
      words: entries.filter((e) => e.level === level).length,
      kanji: kanji.filter((k) => k.level === level).length,
    }));
    return { totalWords: entries.length, totalKanji: kanji.length, levels };
  }

  async word(id: string, userId?: string) {
    const word = await this.words.findOneBy({ id });
    if (!word) throw new NotFoundException('Không tìm thấy từ này');

    const chars = [...new Set(word.word.match(KANJI_CHAR) ?? [])];
    const kanji = chars.length ? await this.kanji.findBy({ char: In(chars) }) : [];
    const byChar = new Map(kanji.map((k) => [k.char, k]));
    const entries = await this.entries();
    const sameReading = entries
      .filter((e) => e.reading === word.reading && e.id !== word.id)
      .sort((a, b) => a.freq - b.freq)
      .slice(0, 6)
      .map(toSummary);
    const progress = userId ? await this.userWords.findOneBy({ userId, wordId: id }) : null;

    return {
      id: word.id,
      word: word.word,
      reading: word.reading,
      romaji: word.romaji,
      level: word.level,
      pos: word.pos,
      hanviet: word.hanviet,
      meaningsVi: word.meaningsVi,
      viSource: word.viSource,
      meaningsEn: word.meaningsEn,
      examples: word.examples,
      lessonNo: word.lessonNo,
      kanji: chars.flatMap((char) => {
        const row = byChar.get(char);
        return row ? [this.kanjiSummary(row)] : [];
      }),
      sameReading,
      progress: progress && { state: progress.state, due: progress.due, suspended: progress.suspended },
    };
  }

  private kanjiSummary(row: Kanji) {
    return {
      char: row.char,
      level: row.level,
      strokes: row.strokes,
      radical: row.radical,
      onyomi: row.onyomi,
      kunyomi: row.kunyomi,
      meaningsEn: row.meaningsEn,
      hanviet: row.hanviet,
    };
  }

  async kanjiDetail(char: string) {
    const row = await this.kanji.findOneBy({ char });
    if (!row) throw new NotFoundException('Không tìm thấy chữ Hán này');
    const entries = await this.entries();
    const words = entries
      .filter((e) => e.word.includes(char))
      .sort(
        (a, b) =>
          (LEVEL_ORDER[a.level ?? ''] ?? 9) - (LEVEL_ORDER[b.level ?? ''] ?? 9) ||
          a.freq - b.freq ||
          a.word.length - b.word.length,
      )
      .slice(0, MAX_KANJI_WORDS)
      .map(toSummary);
    return { ...this.kanjiSummary(row), words };
  }

  /** Danh sách kanji theo cấp, hoặc tìm theo mặt chữ / âm Hán Việt / nghĩa tiếng Anh. */
  async kanjiList(q?: string, level?: JlptLevel) {
    const all = await this.kanjiEntries();
    const needle = q?.trim();
    const folded = needle ? fold(needle) : '';
    const chars = needle ? new Set(needle.match(KANJI_CHAR) ?? []) : null;
    return all
      .filter((row) => !level || row.level === level)
      .filter((row) => {
        if (!needle) return true;
        if (chars?.size) return chars.has(row.char);
        return row.hvFold.includes(folded) || row.meaningsEn.some((m) => m.toLowerCase() === needle.toLowerCase());
      })
      .sort(
        (a, b) =>
          (LEVEL_ORDER[a.level] ?? 9) - (LEVEL_ORDER[b.level] ?? 9) || (a.freq ?? 9999) - (b.freq ?? 9999),
      )
      .slice(0, level ? 2000 : 120)
      .map((row) => ({ char: row.char, level: row.level, hanviet: row.hanviet.slice(0, 2), meaningsEn: row.meaningsEn.slice(0, 2) }));
  }
}
