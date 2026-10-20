import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { Attempt } from './attempt.entity.js';
import { Question } from './question.entity.js';

@Entity('attempt_answers')
@Index(['questionId'])
export class AttemptAnswer {
  @PrimaryColumn('uuid')
  attemptId: string;

  @PrimaryColumn('text')
  questionId: string;

  @ManyToOne(() => Attempt, (attempt) => attempt.answers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attempt_id' })
  attempt: Relation<Attempt>;

  @ManyToOne(() => Question, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: Relation<Question>;

  @Column('int', { nullable: true })
  selectedIndex: number | null;

  @Column('boolean', { nullable: true })
  isCorrect: boolean | null;

  @Column('boolean', { default: false })
  flagged: boolean;

  /** Đã xem đáp án (chế độ luyện tập phản hồi ngay) — không cho đổi đáp án nữa. */
  @Column('boolean', { default: false })
  revealed: boolean;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
