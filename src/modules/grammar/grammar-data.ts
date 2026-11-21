import { readFileSync } from 'node:fs';

export interface GrammarQuestion {
  id: string;
  kind: 'choice' | 'order';
  prompt: string;
  translation: string;
  prefix: string;
  suffix: string;
  options: string[];
  answer: number[];
  acceptedAnswers?: number[][];
  explanation: string;
}
export interface GrammarPattern {
  id: string;
  title: string;
  usage: string;
  formula: string;
  pitfall: string;
  examples: { ja: string; vi: string }[];
  questions: GrammarQuestion[];
}
export interface GrammarLesson {
  id: string;
  chapter: number;
  title: string;
  description: string;
  sources: { title: string; url: string }[];
  patterns: GrammarPattern[];
}

export const GRAMMAR_LESSONS = JSON.parse(
  readFileSync(new URL('./data/n4-grammar.json', import.meta.url), 'utf8'),
) as GrammarLesson[];

export const questionsOf = (lesson: GrammarLesson) =>
  lesson.patterns.flatMap((pattern) => pattern.questions);
export function publicLesson(lesson: GrammarLesson) {
  return {
    ...lesson,
    patterns: lesson.patterns.map((pattern) => ({
      ...pattern,
      questions: pattern.questions.map(
        ({
          answer: _answer,
          acceptedAnswers: _accepted,
          explanation: _explanation,
          ...question
        }) => question,
      ),
    })),
  };
}
export function validAnswer(question: GrammarQuestion, answer: number[]) {
  return (
    Array.isArray(answer) &&
    answer.length ===
      (question.kind === 'choice' ? 1 : question.options.length) &&
    new Set(answer).size === answer.length &&
    answer.every(
      (index) =>
        Number.isInteger(index) &&
        index >= 0 &&
        index < question.options.length,
    )
  );
}
export const correctAnswer = (question: GrammarQuestion, answer: number[]) =>
  validAnswer(question, answer) &&
  [question.answer, ...(question.acceptedAnswers ?? [])].some((expected) =>
    expected.every((index, position) => answer[position] === index),
  );
