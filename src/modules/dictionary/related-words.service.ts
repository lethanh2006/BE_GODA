import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { DictionaryService } from './dictionary.service.js';
import { parseRelatedWordsArtifact, type RelatedWordsArtifact } from './related-words.js';

/** Đường dẫn cố định, không nhận từ người dùng. Trong Docker: /app/assets/ai/related-words.v1.json. */
export const RELATED_WORDS_FILE = path.resolve(process.cwd(), 'assets/ai/related-words.v1.json');

export type RelatedWordsStatus = 'ready' | 'disabled' | 'unavailable';

/**
 * "Từ liên quan để học tiếp": đọc danh sách tính sẵn bằng model embedding (GĐ1 trong kế hoạch AI).
 * Tắt bằng cờ RELATED_WORDS_ENABLED; file thiếu hoặc lỗi thì trả "unavailable", không làm hỏng trang từ điển.
 */
@Injectable()
export class RelatedWordsService {
  private readonly logger = new Logger(RelatedWordsService.name);
  private artifact?: Promise<RelatedWordsArtifact | null>;

  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly dictionary: DictionaryService,
  ) {}

  async related(wordId: string, limit: number) {
    if (!(await this.dictionary.has(wordId))) throw new NotFoundException('Không tìm thấy từ này');
    if (!this.config.get('RELATED_WORDS_ENABLED', { infer: true })) return this.empty('disabled');

    const artifact = await this.load();
    if (!artifact) return this.empty('unavailable');
    const ids = (artifact.neighbors.get(wordId) ?? []).map((neighbor) => neighbor.id);
    return {
      status: 'ready' as RelatedWordsStatus,
      source: { modelId: artifact.modelId, generatedAt: artifact.generatedAt },
      // Id không còn trong từ điển (dữ liệu đã seed lại) bị bỏ qua, không bù bằng từ khác.
      items: (await this.dictionary.summaries(ids)).slice(0, limit),
    };
  }

  private empty(status: RelatedWordsStatus) {
    return { status, source: null, items: [] };
  }

  /** Nạp một lần cho cả tiến trình; lỗi chỉ ghi log một lần. Sửa file thì phải khởi động lại server. */
  private load(): Promise<RelatedWordsArtifact | null> {
    this.artifact ??= this.readArtifact()
      .then((raw) => {
        const artifact = parseRelatedWordsArtifact(JSON.parse(raw));
        this.logger.log(`Đã nạp từ liên quan cho ${artifact.neighbors.size} từ (${artifact.modelId}, ${artifact.generatedAt})`);
        return artifact;
      })
      .catch((error: unknown) => {
        this.logger.warn(`Không dùng được ${RELATED_WORDS_FILE}: ${error instanceof Error ? error.message : String(error)}`);
        return null;
      });
    return this.artifact;
  }

  readArtifact(): Promise<string> {
    return readFile(RELATED_WORDS_FILE, 'utf8');
  }
}
