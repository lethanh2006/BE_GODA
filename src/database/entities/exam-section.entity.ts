import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
  Unique,
} from 'typeorm';
import { Exam } from './exam.entity.js';
import { ExamQuestion } from './exam-question.entity.js';

/** Một phần thi có giờ riêng, ví dụ 言語知識（文字・語彙）. */
@Entity('exam_sections')
@Unique(['examId', 'order'])
export class ExamSection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  examId: string;

  @ManyToOne(() => Exam, (exam) => exam.sections, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exam_id' })
  exam: Relation<Exam>;

  @Column('int')
  order: number;

  @Column('text')
  title: string;

  @Column('text')
  titleVi: string;

  @Column('int')
  durationMinutes: number;

  @OneToMany(() => ExamQuestion, (item) => item.section)
  questions: Relation<ExamQuestion>[];
}
