import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { LEVEL_COLUMN, QUESTION_TYPE_COLUMN } from '../columns.js';
import type { JlptLevel, QuestionType } from '../enums.js';
import { Passage } from './passage.entity.js';

@Entity('questions')
@Index(['level', 'type', 'isActive'])
export class Question {
  @PrimaryColumn('text')
  id: string;

  @Column(LEVEL_COLUMN)
  level: JlptLevel;

  @Column(QUESTION_TYPE_COLUMN)
  type: QuestionType;

  /** Đề bài. Quy ước: 《...》 là phần gạch chân, （\u3000） là chỗ trống, ★ là ô cần chọn (並べ替え). */
  @Column('text')
  prompt: string;

  @Column('text', { array: true })
  options: string[];

  @Column('int')
  answerIndex: number;

  @Column('text', { nullable: true })
  explanation: string | null;

  @Index()
  @Column('text', { nullable: true })
  passageId: string | null;

  @ManyToOne(() => Passage, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'passage_id' })
  passage: Relation<Passage> | null;

  @Column('int', { default: 0 })
  passageOrder: number;

  /** Nguồn dữ liệu: "goda" (biên soạn gốc) | "openjlpt". */
  @Column('text')
  source: string;

  @Column('boolean', { default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
