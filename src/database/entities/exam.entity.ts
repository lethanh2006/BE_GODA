import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
  Unique,
} from 'typeorm';
import { LEVEL_COLUMN } from '../columns.js';
import type { JlptLevel } from '../enums.js';
import { ExamSection } from './exam-section.entity.js';

@Entity('exams')
@Unique(['level', 'number'])
export class Exam {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { unique: true })
  slug: string;

  @Column(LEVEL_COLUMN)
  level: JlptLevel;

  @Column('int')
  number: number;

  @Column('text')
  title: string;

  @Column('text', { nullable: true })
  description: string | null;

  @Column('text')
  source: string;

  @Column('boolean', { default: true })
  published: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => ExamSection, (section) => section.exam)
  sections: Relation<ExamSection>[];
}
