import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CompleteDeckPracticeDto } from './deck.dto.js';

const id = '6bcfb80f-87d2-4aef-b5eb-144703fd0920';
const valid = { mode: 'matching', answers: [{ cardId: id, answerId: id }] };
const check = (body: unknown) =>
  validate(plainToInstance(CompleteDeckPracticeDto, body), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

describe('CompleteDeckPracticeDto', () => {
  it('accepts a valid submission', async () => {
    expect(await check(valid)).toEqual([]);
  });
  it.each([
    { ...valid, mode: 'unknown' },
    { ...valid, answers: [] },
    { ...valid, answers: [{ cardId: 'not-uuid', answerId: id }] },
    { ...valid, answers: [{ cardId: id }] },
    { ...valid, answers: [{ cardId: id, answerId: id, correct: true }] },
    { ...valid, answers: Array.from({ length: 2001 }, () => valid.answers[0]) },
  ])('rejects malformed request bodies', async (body) => {
    expect((await check(body)).length).toBeGreaterThan(0);
  });
});
