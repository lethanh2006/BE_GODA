import { parseRelatedWordsArtifact } from './related-words.js';

const valid = () => ({
  schemaVersion: 1,
  modelId: 'intfloat/multilingual-e5-small',
  modelRevision: 'abc123',
  textTemplate: 'word-v1',
  corpusSha256: 'f'.repeat(64),
  generatedAt: '2026-11-11T00:00:00Z',
  neighbors: { w1: [['w2', 0.91], ['w3', 0.88]], w2: [['w1', 0.91]] },
});

describe('parseRelatedWordsArtifact', () => {
  it('đọc file hợp lệ thành Map id → gợi ý theo điểm giảm dần', () => {
    const artifact = parseRelatedWordsArtifact(valid());
    expect(artifact.modelId).toBe('intfloat/multilingual-e5-small');
    expect(artifact.neighbors.get('w1')).toEqual([
      { id: 'w2', score: 0.91 },
      { id: 'w3', score: 0.88 },
    ]);
  });

  it.each([
    ['không phải object', () => []],
    ['schemaVersion lạ', () => ({ ...valid(), schemaVersion: 2 })],
    ['thiếu modelId', () => ({ ...valid(), modelId: '' })],
    ['thiếu neighbors', () => ({ ...valid(), neighbors: undefined })],
    ['tự gợi ý chính nó', () => ({ ...valid(), neighbors: { w1: [['w1', 0.9]] } })],
    ['gợi ý trùng', () => ({ ...valid(), neighbors: { w1: [['w2', 0.9], ['w2', 0.8]] } })],
    ['điểm NaN', () => ({ ...valid(), neighbors: { w1: [['w2', Number.NaN]] } })],
    ['điểm ngoài [-1, 1]', () => ({ ...valid(), neighbors: { w1: [['w2', 1.5]] } })],
    ['không xếp giảm dần', () => ({ ...valid(), neighbors: { w1: [['w2', 0.5], ['w3', 0.9]] } })],
    ['sai dạng [id, score]', () => ({ ...valid(), neighbors: { w1: [{ id: 'w2', score: 0.9 }] } })],
  ])('từ chối file %s', (_label, make) => {
    expect(() => parseRelatedWordsArtifact(make())).toThrow();
  });
});
