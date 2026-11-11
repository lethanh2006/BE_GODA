import { Rating } from 'ts-fsrs';
import type { Repository } from 'typeorm';
import type {
  Deck,
  DeckCard,
  ReviewLog,
} from '../../database/entities/index.js';
import { newCard, review } from '../vocab/scheduler.js';
import { DecksService } from './decks.service.js';

const USER = '6bcfb80f-87d2-4aef-b5eb-144703fd0920';
const T0 = new Date('2026-11-01T00:00:00Z');

function queryBuilder(raw: unknown[]) {
  const qb: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const step of ['update', 'set', 'where', 'returning'])
    qb[step] = vi.fn(() => qb);
  qb.execute = vi.fn().mockResolvedValue({ raw, affected: raw.length });
  return qb;
}

function setup() {
  const decks = {
    existsBy: vi.fn().mockResolvedValue(true),
    findOne: vi.fn(),
    find: vi.fn().mockResolvedValue([]),
  };
  const cards = {
    findOne: vi.fn(),
    update: vi.fn().mockResolvedValue({}),
    createQueryBuilder: vi.fn(),
  };
  const reviewLogs = { insert: vi.fn().mockResolvedValue({}) };
  const service = new DecksService(
    decks as unknown as Repository<Deck>,
    cards as unknown as Repository<DeckCard>,
    reviewLogs as unknown as Repository<ReviewLog>,
  );
  return { service, decks, cards, reviewLogs };
}

describe('DecksService ghi nhật ký ôn', () => {
  it('học xong bài: chỉ đưa thẻ chưa học vào lịch và ghi learn cho đúng các thẻ đó', async () => {
    const { service, cards, reviewLogs } = setup();
    const qb = queryBuilder([{ id: 'c1' }, { id: 'c2' }]);
    cards.createQueryBuilder.mockReturnValue(qb);

    await expect(service.markLearned(USER, 'deck-1')).resolves.toEqual({
      learned: 2,
    });

    expect(qb.where).toHaveBeenCalledWith('"deck_id" = :id AND "due" IS NULL', {
      id: 'deck-1',
    });
    expect(qb.returning).toHaveBeenCalledWith(['id']);
    expect(reviewLogs.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: USER,
        itemType: 'deck_card',
        itemId: 'c1',
        kind: 'learn',
        rating: Rating.Good,
        state: 0,
      }),
      expect.objectContaining({ itemId: 'c2', kind: 'learn' }),
    ]);
  });

  it('ôn thẻ: lưu lịch mới rồi ghi một dòng review', async () => {
    const { service, cards, reviewLogs } = setup();
    const before = review(newCard(T0), Rating.Good, T0);
    cards.findOne.mockResolvedValue({ id: 'c1', deckId: 'deck-1', ...before });

    await service.review(USER, 'c1', Rating.Again);

    expect(cards.update).toHaveBeenCalledWith(
      { id: 'c1' },
      expect.objectContaining({ lapses: 1 }),
    );
    expect(reviewLogs.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        itemType: 'deck_card',
        itemId: 'c1',
        kind: 'review',
        rating: Rating.Again,
        state: before.state,
        stability: before.stability,
      }),
    ]);
  });
});

describe('DecksService practice', () => {
  const entries = [
    {
      id: 'c1',
      term: '失敗',
      reading: 'しっぱい',
      furigana: '{失敗|しっぱい}',
      meaning: 'thất bại',
      examples: [{ ja: 'きっと{失敗|しっぱい}する。', vi: null }],
      due: null,
    },
    {
      id: 'c2',
      term: '成功',
      reading: 'せいこう',
      meaning: 'thành công',
      examples: [],
      due: null,
    },
    {
      id: 'c3',
      term: 'ミス',
      reading: '',
      meaning: 'thất bại',
      examples: [],
      due: null,
    },
  ];
  function practiceSetup() {
    const ctx = setup();
    ctx.decks.findOne.mockResolvedValue({ id: 'deck-1', cards: entries });
    ctx.cards.createQueryBuilder.mockReturnValue(queryBuilder([{ id: 'c1' }]));
    return ctx;
  }
  const answers = [
    { cardId: 'c1', answerId: 'c3' },
    { cardId: 'c2', answerId: 'c2' },
    { cardId: 'c3', answerId: 'c1' },
  ];

  it('returns speech text without ruby markup, including full example sentences', async () => {
    const { service } = practiceSetup();
    const detail = await service.detail(USER, 'deck-1');
    expect(detail.cards[0].speechText).toBe('しっぱい');
    expect(detail.cards[0].examples[0].speechText).toBe('きっと失敗する。');
    expect(detail.cards[2].speechText).toBe('ミス');
  });

  it.each(['matching', 'listening'] as const)(
    'enrolls complete %s practice and accepts equivalent meanings',
    async (mode) => {
      const { service, decks } = practiceSetup();
      await expect(
        service.completePractice(USER, 'deck-1', { mode, answers }),
      ).resolves.toEqual({ correct: 3, total: 3, completed: true, learned: 1 });
      expect(decks.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'deck-1', userId: USER } }),
      );
    },
  );

  it('does not enroll incorrect answers', async () => {
    const { service, cards } = practiceSetup();
    const wrong = answers.map((a) => ({ ...a, answerId: 'c1' }));
    await expect(
      service.completePractice(USER, 'deck-1', {
        mode: 'listening',
        answers: wrong,
      }),
    ).resolves.toEqual({ correct: 2, total: 3, completed: false, learned: 0 });
    expect(cards.createQueryBuilder).not.toHaveBeenCalled();
  });

  it.each([
    answers.slice(1),
    [answers[0], answers[0], answers[2]],
    [{ cardId: 'foreign', answerId: 'c1' }, ...answers.slice(1)],
    [{ cardId: 'c1', answerId: 'foreign' }, ...answers.slice(1)],
  ])('rejects missing, duplicate or foreign cards', async (invalid) => {
    const { service, cards } = practiceSetup();
    await expect(
      service.completePractice(USER, 'deck-1', {
        mode: 'matching',
        answers: invalid,
      }),
    ).rejects.toThrow();
    expect(cards.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('rejects empty decks', async () => {
    const { service, decks, cards } = practiceSetup();
    decks.findOne.mockResolvedValue({ id: 'deck-1', cards: [] });
    await expect(
      service.completePractice(USER, 'deck-1', {
        mode: 'matching',
        answers: [],
      }),
    ).rejects.toThrow();
    expect(cards.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('does not disclose another user’s deck', async () => {
    const { service, decks, cards } = practiceSetup();
    decks.findOne.mockResolvedValue(null);
    await expect(
      service.completePractice(USER, 'deck-1', { mode: 'matching', answers }),
    ).rejects.toThrow('Không tìm thấy bộ thẻ');
    expect(cards.createQueryBuilder).not.toHaveBeenCalled();
  });
});
