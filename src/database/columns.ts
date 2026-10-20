import type { ColumnOptions } from 'typeorm';
import { AttemptMode, AttemptStatus, JlptLevel, QuestionType, ReportStatus, UserRole } from './enums.js';

/** Khai báo cột enum dùng chung một kiểu ENUM trong PostgreSQL cho mọi bảng. */
const enumColumn = (values: Record<string, string>, enumName: string) =>
  ({ type: 'enum', enum: Object.values(values), enumName }) satisfies ColumnOptions;

export const LEVEL_COLUMN = enumColumn(JlptLevel, 'jlpt_level');
export const QUESTION_TYPE_COLUMN = enumColumn(QuestionType, 'question_type');
export const USER_ROLE_COLUMN = enumColumn(UserRole, 'user_role');
export const ATTEMPT_MODE_COLUMN = enumColumn(AttemptMode, 'attempt_mode');
export const ATTEMPT_STATUS_COLUMN = enumColumn(AttemptStatus, 'attempt_status');
export const REPORT_STATUS_COLUMN = enumColumn(ReportStatus, 'report_status');
