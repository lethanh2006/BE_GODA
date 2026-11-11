import 'reflect-metadata';
import { validateEnv } from './env.validation.js';

const base = { DATABASE_URL: 'postgresql://x:y@localhost:5432/z', JWT_SECRET: 'x'.repeat(32) };

describe('validateEnv: cờ RELATED_WORDS_ENABLED', () => {
  it.each([
    [undefined, false],
    ['false', false],
    ['0', false],
    ['true', true],
  ])('giá trị %s → %s', (value, expected) => {
    const env = validateEnv(value === undefined ? base : { ...base, RELATED_WORDS_ENABLED: value });
    expect(env.RELATED_WORDS_ENABLED).toBe(expected);
  });
});
