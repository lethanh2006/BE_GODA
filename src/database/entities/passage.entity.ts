import { Column, Entity, PrimaryColumn } from 'typeorm';
import { LEVEL_COLUMN } from '../columns.js';
import type { JlptLevel } from '../enums.js';

/** Bài đọc / đoạn văn dùng chung cho nhiều câu hỏi (読解, 文章の文法, kịch bản 聴解). */
@Entity('passages')
export class Passage {
  @PrimaryColumn('text')
  id: string;

  @Column(LEVEL_COLUMN)
  level: JlptLevel;

  @Column('text', { nullable: true })
  title: string | null;

  @Column('text')
  content: string;

  @Column('text')
  source: string;
}
