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
import type { AttemptLayout } from '../../modules/attempts/attempt-layout.js';
import { ATTEMPT_MODE_COLUMN, ATTEMPT_STATUS_COLUMN, LEVEL_COLUMN, QUESTION_TYPE_COLUMN } from '../columns.js';
import { type AttemptMode, AttemptStatus, type JlptLevel, type QuestionType } from '../enums.js';
import { AttemptAnswer } from './attempt-answer.entity.js';
import { ExamSection } from './exam-section.entity.js';
import { Exam } from './exam.entity.js';
import { User } from './user.entity.js';

/** Một lượt làm bài (đề thi thử hoặc luyện tập). userId null = khách. */
@Entity('attempts')
@Index(['userId', 'status', 'submittedAt'])
export class Attempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User> | null;

  @Column(ATTEMPT_MODE_COLUMN)
  mode: AttemptMode;

  @Column({ ...ATTEMPT_STATUS_COLUMN, default: AttemptStatus.IN_PROGRESS })
  status: AttemptStatus;

  @Column(LEVEL_COLUMN)
  level: JlptLevel;

  @Column('text')
  title: string;

  @Index()
  @Column('uuid', { nullable: true })
  examId: string | null;

  @ManyToOne(() => Exam, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'exam_id' })
  exam: Relation<Exam> | null;

  @Column('uuid', { nullable: true })
  sectionId: string | null;

  @ManyToOne(() => ExamSection, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'section_id' })
  section: Relation<ExamSection> | null;

  /** Dạng bài khi luyện theo dạng (null = nhiều dạng). */
  @Column({ ...QUESTION_TYPE_COLUMN, nullable: true })
  questionType: QuestionType | null;

  /** Thứ tự câu hỏi cố định của lượt làm. */
  @Column('text', { array: true })
  questionIds: string[];

  /** Bố cục: [{ title, titleVi, durationMinutes, mondai: [{ number, type, questionIds }] }]. */
  @Column('jsonb')
  layout: AttemptLayout;

  @Column('boolean', { default: false })
  instantFeedback: boolean;

  @Column('int', { nullable: true })
  timeLimitSeconds: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  startedAt: Date;

  @Column('timestamptz', { nullable: true })
  submittedAt: Date | null;

  @Column('int', { nullable: true })
  timeSpentSeconds: number | null;

  @Column('int')
  totalCount: number;

  @Column('int', { nullable: true })
  correctCount: number | null;

  @Column('double precision', { nullable: true })
  scorePercent: number | null;

  @OneToMany(() => AttemptAnswer, (answer) => answer.attempt)
  answers: Relation<AttemptAnswer>[];
}
