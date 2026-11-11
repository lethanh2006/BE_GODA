import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { User } from './user.entity.js';

/** Loại thẻ được ôn: từ trong sổ từ (`user_words`) hoặc thẻ trong bộ thẻ riêng (`deck_cards`). */
export type ReviewItemType = 'word' | 'deck_card';
/** `review`: người học tự chấm khi ôn. `learn`: học xong bài, hệ thống chấm "Nhớ" lần đầu. */
export type ReviewKind = 'review' | 'learn';

/**
 * Nhật ký ôn tập: mỗi lần chấm một thẻ ghi một dòng, không sửa, không xoá.
 * `user_words` và `deck_cards` chỉ giữ trạng thái MỚI NHẤT của thẻ (ghi đè sau mỗi lần ôn), nên muốn train lại
 * tham số FSRS cho người học GODA thì cần bảng này. Các cột trạng thái lưu thẻ TRƯỚC lần ôn, giống `ReviewLog`
 * của ts-fsrs.
 */
@Entity('review_logs')
@Index(['userId', 'reviewedAt'])
@Index(['itemType', 'itemId'])
export class ReviewLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column('text')
  itemType: ReviewItemType;

  /** `words.id` hoặc `deck_cards.id`; không đặt khoá ngoại vì trỏ tới hai bảng. */
  @Column('text')
  itemId: string;

  @Column('text')
  kind: ReviewKind;

  /** Điểm chấm theo ts-fsrs: 1 Quên, 2 Khó, 3 Nhớ, 4 Dễ. */
  @Column('smallint')
  rating: number;

  /** Trạng thái FSRS trước lần ôn: 0 mới, 1 đang học, 2 ôn tập, 3 học lại. */
  @Column('smallint')
  state: number;

  @Column('double precision')
  stability: number;

  @Column('double precision')
  difficulty: number;

  /** Khoảng cách (ngày) đã hẹn ở lần ôn trước. */
  @Column('int')
  scheduledDays: number;

  /** Lần ôn trước; null nếu đây là lần đầu. Khoảng cách thật = reviewedAt − lastReview. */
  @Column('timestamptz', { nullable: true })
  lastReview: Date | null;

  @Column('timestamptz')
  reviewedAt: Date;
}
