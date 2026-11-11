import { Logger } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { ReviewLog } from '../../database/entities/index.js';
import { saveReviewLogs } from './review-log.js';

const USER = '6bcfb80f-87d2-4aef-b5eb-144703fd0920';
const log = {
  rating: 3,
  state: 2,
  stability: 4.5,
  difficulty: 5.1,
  scheduledDays: 4,
  lastReview: new Date('2026-11-01T00:00:00Z'),
  reviewedAt: new Date('2026-11-05T00:00:00Z'),
};

const repo = (insert: ReturnType<typeof vi.fn>) => ({ insert }) as unknown as Repository<ReviewLog>;

describe('saveReviewLogs', () => {
  it('ghi mỗi thẻ một dòng kèm người dùng, loại thẻ và loại sự kiện', async () => {
    const insert = vi.fn().mockResolvedValue({});
    await saveReviewLogs(repo(insert), USER, 'word', 'review', [
      { itemId: 'w1', log },
      { itemId: 'w2', log },
    ]);
    expect(insert).toHaveBeenCalledWith([
      { userId: USER, itemType: 'word', itemId: 'w1', kind: 'review', ...log },
      { userId: USER, itemType: 'word', itemId: 'w2', kind: 'review', ...log },
    ]);
  });

  it('không gọi database khi không có dòng nào', async () => {
    const insert = vi.fn();
    await saveReviewLogs(repo(insert), USER, 'deck_card', 'learn', []);
    expect(insert).not.toHaveBeenCalled();
  });

  it('lỗi database chỉ ghi cảnh báo, không ném ra ngoài', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const insert = vi.fn().mockRejectedValue(new Error('mất kết nối'));
    await expect(saveReviewLogs(repo(insert), USER, 'word', 'review', [{ itemId: 'w1', log }])).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('mất kết nối'));
    warn.mockRestore();
  });
});
