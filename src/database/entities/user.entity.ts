import { Check, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import { LEVEL_COLUMN, USER_ROLE_COLUMN } from '../columns.js';
import { type JlptLevel, UserRole } from '../enums.js';

@Entity('users')
@Unique('UQ_users_google_sub', ['googleSub'])
@Check('CHK_users_login_method', 'password_hash IS NOT NULL OR google_sub IS NOT NULL')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { unique: true })
  email: string;

  @Column('text', { nullable: true })
  passwordHash: string | null;

  @Column('text', { nullable: true })
  googleSub: string | null;

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
