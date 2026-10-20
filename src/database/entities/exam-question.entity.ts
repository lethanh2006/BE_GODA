import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, type Relation } from 'typeorm';
import { ExamSection } from './exam-section.entity.js';
import { Question } from './question.entity.js';

@Entity('exam_questions')
@Index(['sectionId', 'order'])
export class ExamQuestion {
  @PrimaryColumn('uuid')
  sectionId: string;

  @PrimaryColumn('text')
  questionId: string;

  @ManyToOne(() => ExamSection, (section) => section.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'section_id' })
  section: Relation<ExamSection>;

  @ManyToOne(() => Question, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: Relation<Question>;

  @Column('int')
  order: number;

  /** Số thứ tự 問題 trong phần thi. */
  @Column('int')
  mondai: number;
}
