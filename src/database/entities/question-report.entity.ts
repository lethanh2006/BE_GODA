import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { REPORT_STATUS_COLUMN } from '../columns.js';
import { ReportStatus } from '../enums.js';
import { Question } from './question.entity.js';
import { User } from './user.entity.js';

@Entity('question_reports')
@Index(['status', 'createdAt'])
export class QuestionReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('text')
  questionId: string;

  @ManyToOne(() => Question, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: Relation<Question>;

  @Column('uuid', { nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User> | null;

  @Column('text')
  reason: string;

  @Column('text', { nullable: true })
  message: string | null;

  @Column({ ...REPORT_STATUS_COLUMN, default: ReportStatus.OPEN })
  status: ReportStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
