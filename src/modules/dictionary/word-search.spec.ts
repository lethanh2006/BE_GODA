import { indexEntry, parseQuery, rankEntry, searchEntries, type SearchEntry } from './word-search.js';

const make = (over: Partial<SearchEntry> & Pick<SearchEntry, 'id' | 'word' | 'reading'>): SearchEntry => ({
  romaji: '',
  level: 'N5',
  freq: 10,
  hanviet: null,
  meaningsVi: [],
  viSource: 'goda',
  meaningsEn: [],
  ...over,
});

const entries = [
  make({ id: 'gakkou', word: '学校', reading: 'がっこう', hanviet: 'học hiệu', meaningsVi: ['trường học'], meaningsEn: ['school'] }),
  make({ id: 'benkyou', word: '勉強', reading: 'べんきょう', hanviet: 'miễn cường', meaningsVi: ['học, học tập'], meaningsEn: ['to study'] }),
  make({ id: 'manabu', word: '学ぶ', reading: 'まなぶ', hanviet: 'học', meaningsVi: ['học, tiếp thu'], level: 'N3', freq: 20, meaningsEn: ['to learn'] }),
  make({ id: 'hora', word: '洞', reading: 'ほら', meaningsVi: ['hốc, hang'], level: 'N1', viSource: 'ovdp', meaningsEn: ['cave'] }),
  make({ id: 'koohii', word: 'コーヒー', reading: 'コーヒー', meaningsVi: ['cà phê'], meaningsEn: ['coffee'] }),
  make({ id: 'choc', word: 'チョコレート', reading: 'チョコレート', meaningsVi: ['sô-cô-la'], meaningsEn: ['chocolate'], freq: 1 }),
].map(indexEntry);

const ids = (q: string) => searchEntries(entries, q, 10).map((e) => e.id);

describe('tra từ', () => {
  it('khớp mặt chữ và cách đọc trước', () => {
    expect(ids('学校')[0]).toBe('gakkou');
    expect(ids('がっこう')[0]).toBe('gakkou');
    expect(ids('学')).toEqual(['gakkou', 'manabu']);
  });

  it('katakana và hiragana tra được lẫn nhau', () => {
    expect(ids('こーひー')[0]).toBe('koohii');
    expect(ids('ガッコウ')[0]).toBe('gakkou');
  });

  it('romaji, kể cả gõ thiếu trường âm', () => {
    expect(ids('gakkou')[0]).toBe('gakkou');
    expect(ids('benkyo')[0]).toBe('benkyou');
    expect(ids('koohii')[0]).toBe('koohii');
  });

  it('tiếng Việt có dấu không lẫn từ khác dấu', () => {
    const hits = ids('học');
    expect(hits).toContain('benkyou');
    expect(hits).toContain('manabu');
    expect(hits).not.toContain('hora');
  });

  it('tiếng Việt không dấu vẫn tra được', () => {
    expect(ids('truong hoc')[0]).toBe('gakkou');
    expect(ids('hoc')).toContain('hora');
  });

  it('âm Hán Việt', () => {
    expect(ids('học hiệu')[0]).toBe('gakkou');
    expect(ids('hoc hieu')[0]).toBe('gakkou');
  });

  it('tiếng Anh: không khớp đoạn giữa từ khi đã có khớp trọn từ', () => {
    expect(ids('school')[0]).toBe('gakkou');
    expect(ids('coffee')[0]).toBe('koohii');
    expect(ids('study')[0]).toBe('benkyou');
  });

  it('nghĩa soạn tay xếp trên nghĩa tự động cùng bậc', () => {
    const query = parseQuery('hoc');
    const hand = indexEntry(make({ id: 'a', word: 'A', reading: 'あ', meaningsVi: ['học'] }));
    const auto = indexEntry(make({ id: 'b', word: 'B', reading: 'い', meaningsVi: ['học'], viSource: 'ovdp' }));
    expect(rankEntry(hand, query)!).toBeLessThan(rankEntry(auto, query)!);
  });

  it('lọc theo cấp và chuỗi rỗng', () => {
    expect(searchEntries(entries, '学', 10, 'N3').map((e) => e.id)).toEqual(['manabu']);
    expect(searchEntries(entries, '   ', 10)).toEqual([]);
  });
});
