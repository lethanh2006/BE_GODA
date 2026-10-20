import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, type Relation } from 'typeorm';
import { Question } from './question.entity.js';
import { User } from './user.entity.js';

/** Thống kê từng câu theo người dùng — dùng cho "ôn câu sai" và "ưu tiên câu chưa làm". */
@Entity('user_question_stats')
@Index(['userId', 'lastCorrect'])
export class UserQuestionStat {
  @PrimaryColumn('uuid')
  userId: string;

  @PrimaryColumn('text')
  questionId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @ManyToOne(() => Question, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: Relation<Question>;

  @Column('int', { default: 0 })
  seenCount: number;

  @Column('int', { default: 0 })
  correctCount: number;

  @Column('boolean')
  lastCorrect: boolean;

  @Column('timestamptz')
  lastAnsweredAt: Date;
}
