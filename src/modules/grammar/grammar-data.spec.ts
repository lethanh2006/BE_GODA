import {
  GRAMMAR_LESSONS,
  publicLesson,
  questionsOf,
  validAnswer,
  correctAnswer,
} from './grammar-data.js';

describe('N4 practical grammar catalog', () => {
  it('covers every current N4 chapter with complete teaching and practice', () => {
    expect(GRAMMAR_LESSONS.map((lesson) => lesson.chapter)).toEqual(
      Array.from({ length: 19 }, (_, index) => index + 15),
    );
    const ids = new Set<string>();
    let patterns = 0;
    for (const lesson of GRAMMAR_LESSONS) {
      expect(lesson.sources.length).toBeGreaterThan(0);
      expect(
        lesson.sources.every((source) =>
          source.url.startsWith('https://dungmori.com/khoa-hoc/so-cap-n4/'),
        ),
      ).toBe(true);
      for (const pattern of lesson.patterns) {
        patterns++;
        for (const field of [
          pattern.title,
          pattern.usage,
          pattern.formula,
          pattern.pitfall,
        ])
          expect(field.trim().length).toBeGreaterThan(10);
        expect(pattern.examples).toHaveLength(2);
        expect(
          pattern.examples.every((example) => example.ja && example.vi),
        ).toBe(true);
        expect(
          pattern.questions.map((question) => question.kind).sort(),
        ).toEqual(['choice', 'order']);
        for (const question of pattern.questions) {
          expect(ids.has(question.id)).toBe(false);
          ids.add(question.id);
          expect(new Set(question.options).size).toBe(question.options.length);
          expect(question.options.length).toBeGreaterThanOrEqual(2);
          expect(question.explanation.trim().length).toBeGreaterThan(20);
          expect(validAnswer(question, question.answer)).toBe(true);
          expect(correctAnswer(question, question.answer)).toBe(true);
          for (const alternative of question.acceptedAnswers ?? []) {
            expect(validAnswer(question, alternative)).toBe(true);
            expect(correctAnswer(question, alternative)).toBe(true);
          }
          const wrong =
            question.kind === 'choice'
              ? [(question.answer[0] + 1) % question.options.length]
              : [...question.answer].reverse();
          expect(correctAnswer(question, wrong)).toBe(false);
        }
      }
    }
    expect(patterns).toBe(71);
    expect(ids.size).toBe(142);
  });

  it('never sends answer keys or grading explanations before a submission', () => {
    for (const lesson of GRAMMAR_LESSONS) {
      for (const pattern of publicLesson(lesson).patterns) {
        for (const question of pattern.questions) {
          expect(question).not.toHaveProperty('answer');
          expect(question).not.toHaveProperty('explanation');
          expect(question).not.toHaveProperty('acceptedAnswers');
        }
      }
    }
  });

  it('accepts natural alternative Japanese word orders without disclosing variants', () => {
    const lesson = GRAMMAR_LESSONS.find((item) => item.chapter === 17)!;
    const question = questionsOf(lesson).find(
      (item) => item.id === 'n4-17-quantity-order',
    )!;
    const natural = ['日本語を', '三時間も', '勉強', 'しました'].map((part) =>
      question.options.findIndex(
        (option) => option.replace(/\{([^|{}]+)\|[^|{}]+\}/g, '$1') === part,
      ),
    );
    expect(correctAnswer(question, natural)).toBe(true);
    const published = publicLesson(lesson)
      .patterns.flatMap((pattern) => pattern.questions)
      .find((item) => item.id === question.id)!;
    expect(published).not.toHaveProperty('acceptedAnswers');
  });

  it('rejects empty, out-of-range, fractional and duplicate answer indexes', () => {
    const [choice, order] = questionsOf(GRAMMAR_LESSONS[0]);
    for (const invalid of [[], [-1], [choice.options.length], [0.5], [0, 1]])
      expect(validAnswer(choice, invalid)).toBe(false);
    expect(validAnswer(order, Array(order.options.length).fill(0))).toBe(false);
    expect(validAnswer(order, order.answer.slice(1))).toBe(false);
  });
});
