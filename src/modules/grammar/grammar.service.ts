import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { GrammarProgress } from '../../database/entities/grammar-progress.entity.js';
import {
  GRAMMAR_LESSONS,
  correctAnswer,
  publicLesson,
  questionsOf,
  validAnswer,
  type GrammarLesson,
} from './grammar-data.js';
import type { GrammarAnswerDto } from './dto/grammar-answer.dto.js';

function summarize(lesson: GrammarLesson, records: GrammarProgress[]) {
  const currentIds = new Set(
    questionsOf(lesson).map((question) => question.id),
  );
  const answers = records
    .filter(
      (row) => row.lessonId === lesson.id && currentIds.has(row.questionId),
    )
    .map((row) => ({
      questionId: row.questionId,
      correct: row.correct,
      attempts: row.attempts,
    }));
  const correct = answers.filter((answer) => answer.correct).length;
  return {
    total: currentIds.size,
    answered: answers.length,
    correct,
    wrong: answers.length - correct,
    completed: correct === currentIds.size,
    answers,
  };
}

@Injectable()
export class GrammarService {
  constructor(
    @InjectRepository(GrammarProgress)
    private readonly progress: Repository<GrammarProgress>,
  ) {}

  async list(userId: string) {
    const records = await this.progress.find({ where: { userId } });
    return {
      lessons: GRAMMAR_LESSONS.map((lesson) => ({
        id: lesson.id,
        chapter: lesson.chapter,
        title: lesson.title,
        description: lesson.description,
        patterns: lesson.patterns.map((pattern) => pattern.title),
        progress: summarize(lesson, records),
      })),
    };
  }

  private lesson(chapter: number) {
    const lesson = GRAMMAR_LESSONS.find((item) => item.chapter === chapter);
    if (!lesson) throw new NotFoundException('Không tìm thấy bài ngữ pháp N4');
    return lesson;
  }

  async detail(userId: string, chapter: number) {
    const lesson = this.lesson(chapter);
    const records = await this.progress.find({
      where: { userId, lessonId: lesson.id },
    });
    return { ...publicLesson(lesson), progress: summarize(lesson, records) };
  }

  async answer(userId: string, chapter: number, dto: GrammarAnswerDto) {
    const lesson = this.lesson(chapter);
    const question = questionsOf(lesson).find(
      (item) => item.id === dto.questionId,
    );
    if (!question || !validAnswer(question, dto.answer)) {
      throw new BadRequestException(
        'Câu trả lời không thuộc bài học hoặc chưa đủ lựa chọn',
      );
    }
    const correct = correctAnswer(question, dto.answer);
    // Atomic increment: simultaneous submissions never overwrite another attempt's count.
    await this.progress.query(
      `INSERT INTO grammar_progress
      (user_id, lesson_id, question_id, correct, attempts, last_answer, updated_at)
      VALUES ($1, $2, $3, $4, 1, $5::jsonb, now())
      ON CONFLICT (user_id, lesson_id, question_id) DO UPDATE SET
        correct = EXCLUDED.correct,
        attempts = grammar_progress.attempts + 1,
        last_answer = EXCLUDED.last_answer,
        updated_at = now()`,
      [userId, lesson.id, question.id, correct, JSON.stringify(dto.answer)],
    );
    const records = await this.progress.find({
      where: { userId, lessonId: lesson.id },
    });
    return {
      correct,
      expected: correct ? dto.answer : question.answer,
      explanation: question.explanation,
      progress: summarize(lesson, records),
    };
  }
}
