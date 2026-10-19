import { seededRandom } from '../common/utils/random.js';
import { pickQuestions, sortByTypeOrder, type CandidateQuestion } from './selection.js';

const q = (id: string, type: CandidateQuestion['type'], passageId: string | null = null, passageOrder = 0) => ({
  id,
  type,
  passageId,
  passageOrder,
});

describe('pickQuestions', () => {
  it('giữ các câu cùng bài đọc đi cùng nhau, đúng thứ tự', () => {
    const candidates = [
      q('p1-2', 'READING_MEDIUM', 'p1', 2),
      q('p1-1', 'READING_MEDIUM', 'p1', 1),
      q('p2-1', 'READING_MEDIUM', 'p2', 1),
      q('p2-2', 'READING_MEDIUM', 'p2', 2),
    ];
    const picked = pickQuestions(candidates, { count: 2, random: seededRandom(1) }).map((x) => x.id);
    expect([['p1-1', 'p1-2'], ['p2-1', 'p2-2']]).toContainEqual(picked);
  });

  it('ưu tiên câu có độ ưu tiên thấp hơn (chưa làm trước)', () => {
    const candidates = ['a', 'b', 'c', 'd'].map((id) => q(id, 'KANJI_READING'));
    const priority: Record<string, number> = { a: 2, b: 0, c: 1, d: 0 };
    const picked = pickQuestions(candidates, { count: 2, priorityOf: (id) => priority[id] });
    expect(picked.map((x) => x.id).sort()).toEqual(['b', 'd']);
  });

  it('bỏ qua câu bị loại trừ', () => {
    const candidates = ['a', 'b', 'c'].map((id) => q(id, 'KANJI_READING'));
    const picked = pickQuestions(candidates, { count: 3, exclude: new Set(['b']) });
    expect(picked.map((x) => x.id).sort()).toEqual(['a', 'c']);
  });
});

describe('sortByTypeOrder', () => {
  it('xếp theo thứ tự dạng bài của đề JLPT', () => {
    const sorted = sortByTypeOrder([q('1', 'READING_SHORT'), q('2', 'KANJI_READING'), q('3', 'GRAMMAR_FORM')]);
    expect(sorted.map((x) => x.type)).toEqual(['KANJI_READING', 'GRAMMAR_FORM', 'READING_SHORT']);
  });
});
