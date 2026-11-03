import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { LEVEL_COLUMN } from '../columns.js';
import type { JlptLevel } from '../enums.js';
import { DeckCard } from './deck-card.entity.js';
import { User } from './user.entity.js';

/**
 * Bộ thẻ riêng của một người dùng (ví dụ thẻ theo bài của khoá học họ đang theo), nạp bằng `pnpm decks:import`.
 * Chỉ chủ bộ thẻ xem được.
 */
@Entity('decks')
@Index(['userId', 'sourceKey'], { unique: true })
@Index(['userId', 'position'])
export class Deck {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  /** Khoá ổn định từ file nguồn, để nạp lại thì cập nhật thay vì tạo trùng. */
  @Column('text')
  sourceKey: string;

  /** Tên khoá học hoặc nhóm lớn, ví dụ "Sơ cấp N4". */
  @Column('text')
  course: string;

  @Column({ ...LEVEL_COLUMN, nullable: true })
  level: JlptLevel | null;

  @Column('int', { nullable: true })
  chapter: number | null;

  @Column('text')
  title: string;

  /** "vocab" hoặc "kanji". */
  @Column('text')
  kind: string;

  @Column('int')
  position: number;

  @OneToMany(() => DeckCard, (card) => card.deck)
  cards: Relation<DeckCard[]>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
