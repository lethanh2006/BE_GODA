import { estimateJlptScore } from './scoring.js';

const items = (type: Parameters<typeof estimateJlptScore>[1][number]['type'], correct: number, total: number) =>
  Array.from({ length: total }, (_, i) => ({ type, isCorrect: i < correct }));

describe('estimateJlptScore', () => {
  it('N3: tách điểm Kiến thức ngôn ngữ và Đọc hiểu, mỗi phần tối đa 60', () => {
    const result = estimateJlptScore('N3', [
      ...items('KANJI_READING', 8, 10),
      ...items('GRAMMAR_FORM', 7, 10),
      ...items('READING_SHORT', 3, 4),
    ]);
    expect(result.categories.map((c) => [c.key, c.score, c.maxScore])).toEqual([
      ['language', 45, 60],
      ['reading', 45, 60],
    ]);
    // Ngưỡng đỗ 95/180 quy đổi trên 120 điểm đã thi.
    expect(result.passScore).toBe(64);
    expect(result.passed).toBe(true);
  });

  it('trượt khi một phần dưới điểm liệt dù tổng đủ', () => {
    const result = estimateJlptScore('N2', [...items('KANJI_READING', 20, 20), ...items('READING_SHORT', 1, 10)]);
    expect(result.score).toBeGreaterThanOrEqual(result.passScore);
    expect(result.categories.find((c) => c.key === 'reading')?.passedMin).toBe(false);
    expect(result.passed).toBe(false);
  });

  it('N5: gộp ngôn ngữ và đọc hiểu thành một phần 120 điểm', () => {
    const result = estimateJlptScore('N5', items('KANJI_READING', 5, 10));
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0]).toMatchObject({ key: 'language_reading', score: 60, maxScore: 120 });
  });
});
