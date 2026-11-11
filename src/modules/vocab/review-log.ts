import { Logger } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { ReviewItemType, ReviewKind, ReviewLog } from '../../database/entities/review-log.entity.js';
import type { ReviewLogFields } from './scheduler.js';

const logger = new Logger('ReviewLog');

export interface ReviewLogEntry {
  itemId: string;
  log: ReviewLogFields;
}

/**
 * Ghi nhật ký ôn sau khi đã lưu lịch ôn mới. Lỗi chỉ ghi cảnh báo, không ném ra:
 * thiếu một dòng nhật ký còn hơn làm hỏng lần ôn của người học.
 */
export async function saveReviewLogs(
  repo: Repository<ReviewLog>,
  userId: string,
  itemType: ReviewItemType,
  kind: ReviewKind,
  entries: ReviewLogEntry[],
): Promise<void> {
  if (entries.length === 0) return;
  try {
    await repo.insert(entries.map(({ itemId, log }) => ({ userId, itemType, itemId, kind, ...log })));
  } catch (error) {
    logger.warn(`Không ghi được ${entries.length} dòng nhật ký ôn: ${error instanceof Error ? error.message : String(error)}`);
  }
}
