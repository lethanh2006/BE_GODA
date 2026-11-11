import { Logger, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import type { DictionaryService } from './dictionary.service.js';
import { RelatedWordsService } from './related-words.service.js';

const artifact = JSON.stringify({
  schemaVersion: 1,
  modelId: 'intfloat/multilingual-e5-small',
  modelRevision: 'abc123',
  textTemplate: 'word-v1',
  corpusSha256: 'f'.repeat(64),
  generatedAt: '2026-11-11T00:00:00Z',
  neighbors: { w1: [['w2', 0.91], ['gone', 0.9], ['w3', 0.88]] },
});

const summary = (id: string) => ({ id, word: id, reading: id, romaji: id, level: 'N5', hanviet: null, meaningsVi: [], viSource: 'goda', meaningsEn: [] });

function setup(enabled: boolean, read: () => Promise<string> = async () => artifact) {
  const known = new Set(['w1', 'w2', 'w3']);
  const dictionary = {
    has: vi.fn(async (id: string) => known.has(id)),
    summaries: vi.fn(async (ids: string[]) => ids.filter((id) => known.has(id)).map(summary)),
  };
  const config = { get: vi.fn(() => enabled) };
  const service = new RelatedWordsService(
    config as unknown as ConfigService<EnvironmentVariables, true>,
    dictionary as unknown as DictionaryService,
  );
  const reader = vi.spyOn(service, 'readArtifact').mockImplementation(read);
  return { service, reader };
}

describe('RelatedWordsService', () => {
  it('cờ tắt: trả disabled và không đọc file', async () => {
    const { service, reader } = setup(false);
    await expect(service.related('w1', 6)).resolves.toEqual({ status: 'disabled', source: null, items: [] });
    expect(reader).not.toHaveBeenCalled();
  });

  it('cờ bật: giữ thứ tự gợi ý, bỏ id không còn trong từ điển, cắt theo limit', async () => {
    const { service } = setup(true);
    const result = await service.related('w1', 1);
    expect(result.status).toBe('ready');
    expect(result.items.map((item) => item.id)).toEqual(['w2']);
    expect((await service.related('w1', 6)).items.map((item) => item.id)).toEqual(['w2', 'w3']);
    expect(result.source).toEqual({ modelId: 'intfloat/multilingual-e5-small', generatedAt: '2026-11-11T00:00:00Z' });
  });

  it('chỉ đọc file một lần dù nhiều request cùng lúc', async () => {
    const { service, reader } = setup(true);
    await Promise.all([service.related('w1', 6), service.related('w2', 6), service.related('w3', 6)]);
    expect(reader).toHaveBeenCalledTimes(1);
  });

  it('từ có thật nhưng không có gợi ý: ready với danh sách rỗng', async () => {
    const { service } = setup(true);
    await expect(service.related('w3', 6)).resolves.toMatchObject({ status: 'ready', items: [] });
  });

  it('thiếu hoặc hỏng file: unavailable, ghi log một lần, không ném lỗi', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const { service } = setup(true, async () => {
      throw new Error('ENOENT');
    });
    await expect(service.related('w1', 6)).resolves.toEqual({ status: 'unavailable', source: null, items: [] });
    await service.related('w2', 6);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('từ không tồn tại: 404, kể cả khi cờ tắt', async () => {
    const { service } = setup(false);
    await expect(service.related('nope', 6)).rejects.toBeInstanceOf(NotFoundException);
  });
});
