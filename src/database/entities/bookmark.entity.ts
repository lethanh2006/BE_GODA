import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { Question } from './question.entity.js';
import { User } from './user.entity.js';

@Entity('bookmarks')
@Index(['userId', 'createdAt'])
export class Bookmark {
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

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
