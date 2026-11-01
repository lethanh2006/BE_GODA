import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, type Relation } from 'typeorm';
import { User } from './user.entity.js';
import { Word } from './word.entity.js';

/** Thẻ ôn tập ngắt quãng của từng người dùng; các trường lịch ôn theo FSRS. */
@Entity('user_words')
@Index(['userId', 'suspended', 'due'])
export class UserWord {
  @PrimaryColumn('uuid')
  userId: string;

  @PrimaryColumn('text')
  wordId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @ManyToOne(() => Word, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'word_id' })
  word: Relation<Word>;

  /** Trạng thái FSRS: 0 mới, 1 đang học, 2 ôn tập, 3 học lại. */
  @Column('smallint')
  state: number;

  @Column('timestamptz')
  due: Date;

  @Column('double precision')
  stability: number;

  @Column('double precision')
  difficulty: number;

  @Column('int')
  scheduledDays: number;

  @Column('int')
  learningSteps: number;

  @Column('int')
  reps: number;

  @Column('int')
  lapses: number;

  @Column('timestamptz', { nullable: true })
  lastReview: Date | null;

  /** Người dùng bấm "Đã biết từ này": không đưa vào hàng ôn. */
  @Column('boolean', { default: false })
  suspended: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
