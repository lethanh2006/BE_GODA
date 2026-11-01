import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, type Repository } from 'typeorm';
import { UserWord, Word } from '../../database/entities/index.js';
import type { JlptLevel } from '../../database/enums.js';

const LEVELS: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
const PREVIEW_WORDS = 4;

/** Thông tin một từ khi học: thẻ ghi nhớ, bài học, hàng ôn. */
export const toWordCard = (word: Word) => ({
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
  example: word.examples[0] ?? null,
});

@Injectable()
export class VocabService {
  constructor(
    @InjectRepository(Word) private readonly words: Repository<Word>,
    @InjectRepository(UserWord) private readonly userWords: Repository<UserWord>,
  ) {}

  /** Số từ đã thêm vào sổ ôn của người dùng theo từng bài. */
  private async learnedByLesson(userId: string, level?: JlptLevel) {
    const query = this.userWords
      .createQueryBuilder('uw')
      .innerJoin('uw.word', 'w')
      .select('w.level', 'level')
      .addSelect('w.lessonNo', 'lessonNo')
      .addSelect('COUNT(*)::int', 'count')
      .where('uw.userId = :userId', { userId })
      .andWhere('w.level IS NOT NULL')
      .groupBy('w.level')
      .addGroupBy('w.lessonNo');
    if (level) query.andWhere('w.level = :level', { level });
    return query.getRawMany<{ level: JlptLevel; lessonNo: number; count: number }>();
  }

  async levels(userId?: string) {
    const rows = await this.words
      .createQueryBuilder('w')
      .select('w.level', 'level')
      .addSelect('COUNT(*)::int', 'words')
      .addSelect('MAX(w.lessonNo)::int', 'lessons')
      .where('w.level IS NOT NULL')
      .groupBy('w.level')
      .getRawMany<{ level: JlptLevel; words: number; lessons: number }>();
    const learned = userId ? await this.learnedByLesson(userId) : [];
    return LEVELS.map((level) => {
      const row = rows.find((r) => r.level === level);
      return {
        level,
        words: row?.words ?? 0,
        lessons: row?.lessons ?? 0,
        learned: learned.filter((l) => l.level === level).reduce((sum, l) => sum + l.count, 0),
      };
    });
  }

  async lessons(level: JlptLevel, userId?: string) {
    const rows = await this.words.find({
      where: { level },
      select: { word: true, lessonNo: true, lessonOrder: true },
      order: { lessonNo: 'ASC', lessonOrder: 'ASC' },
    });
    const learned = userId ? await this.learnedByLesson(userId, level) : [];
    const counts = new Map(learned.map((l) => [l.lessonNo, l.count]));
    const lessons = new Map<number, { no: number; words: number; preview: string[]; learned: number }>();
    for (const row of rows) {
      const no = row.lessonNo!;
      let lesson = lessons.get(no);
      if (!lesson) {
        lesson = { no, words: 0, preview: [], learned: counts.get(no) ?? 0 };
        lessons.set(no, lesson);
      }
      lesson.words++;
      if (lesson.preview.length < PREVIEW_WORDS) lesson.preview.push(row.word);
    }
    return [...lessons.values()];
  }

  async lesson(level: JlptLevel, no: number, userId?: string) {
    const words = await this.words.find({ where: { level, lessonNo: no }, order: { lessonOrder: 'ASC' } });
    if (words.length === 0) throw new NotFoundException('Bài học không tồn tại');
    const { total } = (await this.words
      .createQueryBuilder('w')
      .select('MAX(w.lessonNo)::int', 'total')
      .where('w.level = :level', { level })
      .getRawOne<{ total: number }>())!;
    const progress = userId
      ? await this.userWords.find({
          where: { userId, wordId: In(words.map((w) => w.id)) },
          select: { wordId: true, state: true, suspended: true },
        })
      : [];
    const byWord = new Map(progress.map((p) => [p.wordId, p]));
    return {
      level,
      no,
      totalLessons: total,
      words: words.map((word) => {
        const card = byWord.get(word.id);
        return { ...toWordCard(word), progress: card ? { state: card.state, suspended: card.suspended } : null };
      }),
    };
  }
}
