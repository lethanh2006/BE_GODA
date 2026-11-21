import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../../database/data-source.js';
import { GrammarProgress } from '../../database/entities/grammar-progress.entity.js';
import { User } from '../../database/entities/user.entity.js';
import { GrammarService } from './grammar.service.js';
import { GRAMMAR_LESSONS, questionsOf } from './grammar-data.js';

const testUrl = process.env.GRAMMAR_TEST_DATABASE_URL;
describe.skipIf(!testUrl)('N4 grammar progress on Postgres', () => {
  let db: DataSource;
  let service: GrammarService;
  let first: User;
  let second: User;
  beforeAll(async () => {
    if (!new URL(testUrl!).pathname.startsWith('/goda_grammar_test'))
      throw Error('A dedicated goda_grammar_test* database is required');
    db = await new DataSource({
      ...dataSourceOptions(testUrl!),
      migrationsRun: true,
    }).initialize();
    service = new GrammarService(db.getRepository(GrammarProgress));
    [first, second] = await db.getRepository(User).save(
      ['first', 'second'].map((name) => ({
        email: `grammar-${name}-${crypto.randomUUID()}@example.com`,
        displayName: name,
        passwordHash: 'test-only',
      })),
    );
  }, 30_000);
  afterAll(async () => {
    if (db?.isInitialized) {
      if (first && second)
        await db.getRepository(User).delete([first.id, second.id]);
      await db.destroy();
    }
  });

  it('grades server-side, remembers wrong questions, survives concurrent retries and isolates users', async () => {
    const lesson = GRAMMAR_LESSONS[0];
    const [question, order] = questionsOf(lesson);
    const before = await service.detail(first.id, 15);
    expect(before.progress).toMatchObject({
      answered: 0,
      correct: 0,
      total: 8,
    });
    expect(before.patterns[0].questions[0]).not.toHaveProperty('answer');
    const wrong = [(question.answer[0] + 1) % question.options.length];
    const feedback = await service.answer(first.id, 15, {
      questionId: question.id,
      answer: wrong,
    });
    expect(feedback).toMatchObject({
      correct: false,
      expected: question.answer,
      explanation: question.explanation,
      progress: { wrong: 1, correct: 0 },
    });
    expect((await service.detail(second.id, 15)).progress.answered).toBe(0);
    await Promise.all(
      Array.from({ length: 8 }, () =>
        service.answer(first.id, 15, {
          questionId: question.id,
          answer: question.answer,
        }),
      ),
    );
    const current = await service.detail(first.id, 15);
    expect(current.progress).toMatchObject({
      correct: 1,
      wrong: 0,
      answered: 1,
    });
    expect(current.progress.answers[0]).toMatchObject({
      questionId: question.id,
      attempts: 9,
      correct: true,
    });
    for (const answer of [[], [99], [0, 0], [0.5]]) {
      await expect(
        service.answer(first.id, 15, { questionId: question.id, answer }),
      ).rejects.toThrow();
    }
    await expect(
      service.answer(first.id, 15, {
        questionId: questionsOf(GRAMMAR_LESSONS[1])[0].id,
        answer: [0],
      }),
    ).rejects.toThrow();
    await expect(
      service.answer(first.id, 15, {
        questionId: order.id,
        answer: Array(order.options.length).fill(0),
      }),
    ).rejects.toThrow();
    expect(
      (await service.detail(first.id, 15)).progress.answers[0].attempts,
    ).toBe(9);
    await service.answer(first.id, 15, {
      questionId: order.id,
      answer: order.answer,
    });
    expect((await service.detail(first.id, 15)).progress.correct).toBe(2);
    for (const next of questionsOf(lesson).slice(2))
      await service.answer(first.id, 15, {
        questionId: next.id,
        answer: next.answer,
      });
    expect((await service.list(first.id)).lessons[0].progress).toMatchObject({
      completed: true,
      correct: 8,
      total: 8,
    });
    expect((await service.list(second.id)).lessons[0].progress).toMatchObject({
      completed: false,
      correct: 0,
    });
    await expect(service.detail(first.id, 99)).rejects.toThrow();
    await expect(
      service.answer(first.id, 99, {
        questionId: question.id,
        answer: question.answer,
      }),
    ).rejects.toThrow();
  }, 30_000);
});
