import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { User } from './user.entity.js';

@Entity('grammar_progress')
@Check('CHK_grammar_progress_attempts', 'attempts > 0')
export class GrammarProgress {
  @PrimaryColumn('uuid') userId: string;
  @PrimaryColumn('text') lessonId: string;
  @PrimaryColumn('text') questionId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;
  @Column('boolean') correct: boolean;
  @Column('int', { default: 1 }) attempts: number;
  @Column('jsonb') lastAnswer: number[];
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
}
