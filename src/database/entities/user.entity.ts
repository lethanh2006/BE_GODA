import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { LEVEL_COLUMN, USER_ROLE_COLUMN } from '../columns.js';
import { type JlptLevel, UserRole } from '../enums.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { unique: true })
  email: string;

  @Column('text')
  passwordHash: string;

  @Column('text')
  displayName: string;

  @Column({ ...USER_ROLE_COLUMN, default: UserRole.USER })
  role: UserRole;

  @Column({ ...LEVEL_COLUMN, nullable: true })
  targetLevel: JlptLevel | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
