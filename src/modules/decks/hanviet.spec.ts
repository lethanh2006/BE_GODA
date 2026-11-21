import { hanVietOf } from './hanviet.js';

describe('Han-Viet on vocabulary flashcards', () => {
  it.each([
    ['協力', 'HIỆP LỰC'],
    ['運動します', 'VẬN ĐỘNG'],
    ['自動', 'TỰ ĐỘNG'],
    ['動画', 'ĐỘNG HỌA'],
    ['写真', 'TẢ CHÂN'],
    ['音楽', 'ÂM NHẠC'],
    ['楽しい', 'LẠC'],
    ['お皿', 'MÃNH'],
    ['失敗', 'THẤT BẠI'],
  ])('reads %s as %s', (term, expected) =>
    expect(hanVietOf(term)).toBe(expected),
  );
  it('does not invent a reading for kana-only words or an unknown character', () => {
    expect(hanVietOf('ありがとう')).toBeNull();
    expect(hanVietOf('𠮷')).toBeNull();
  });
});
