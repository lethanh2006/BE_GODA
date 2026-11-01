import { foldLongVowels, kanaToRomaji, romajiToHiragana, toHiragana } from './kana.js';

describe('kanaToRomaji', () => {
  it.each([
    ['べんきょう', 'benkyou'],
    ['がっこう', 'gakkou'],
    ['しゃしん', 'shashin'],
    ['まっちゃ', 'matcha'],
    ['コーヒー', 'koohii'],
    ['パーティー', 'paatii'],
    ['つづく', 'tsuzuku'],
  ])('%s → %s', (kana, romaji) => {
    expect(kanaToRomaji(kana)).toBe(romaji);
  });
});

describe('romajiToHiragana', () => {
  it.each([
    ['sensei', 'せんせい'],
    ['benkyou', 'べんきょう'],
    ['gakkou', 'がっこう'],
    ['shashin', 'しゃしん'],
    ['sasin', 'さしん'],
    ['matcha', 'まっちゃ'],
    ['tsuzuku', 'つずく'],
    ['ohayou', 'おはよう'],
    ['konnichiwa', 'こんにちわ'],
    ['kin\'en', 'きんえん'],
    ['onna', 'おんな'],
    ['honn', 'ほん'],
    ['jisho', 'じしょ'],
    ['nihon', 'にほん'],
  ])('%s → %s', (romaji, kana) => {
    expect(romajiToHiragana(romaji)).toBe(kana);
  });

  it('trả về null khi không phải romaji', () => {
    expect(romajiToHiragana('xin chao')).toBeNull();
    expect(romajiToHiragana('học')).toBeNull();
    expect(romajiToHiragana('')).toBeNull();
  });
});

describe('foldLongVowels', () => {
  it('bỏ trường âm để gõ thiếu vẫn khớp', () => {
    expect(foldLongVowels('とうきょう')).toBe(foldLongVowels('ときょ'));
    expect(foldLongVowels('べんきょう')).toBe('べんきょ');
    expect(foldLongVowels(toHiragana('コーヒー'))).toBe('こひ');
    expect(foldLongVowels('せんせい')).toBe('せんせ');
    expect(foldLongVowels('つづく')).toBe(foldLongVowels('つずく'));
  });
});
