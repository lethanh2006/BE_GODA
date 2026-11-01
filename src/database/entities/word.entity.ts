import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { LEVEL_COLUMN } from '../columns.js';
import type { JlptLevel } from '../enums.js';
import type { ContentExample } from '../../jlpt/vocab-content.js';

@Entity('words')
@Index(['level', 'lessonNo', 'lessonOrder'])
export class Word {
  @PrimaryColumn('text')
  id: string;

  @Index()
  @Column('text')
  word: string;

  @Column('text')
  reading: string;

  @Column('text')
  romaji: string;

  /** null: từ thông dụng ngoài danh sách JLPT, chỉ để tra cứu, không có trong bài học. */
  @Column({ ...LEVEL_COLUMN, nullable: true })
  level: JlptLevel | null;

  /** Từ loại theo mã JMdict (n, v5u, adj-i…). */
  @Column('text', { array: true })
  pos: string[];

  @Column('text', { array: true })
  meaningsVi: string[];

  /** Nguồn nghĩa tiếng Việt: "goda" (soạn tay), "ovdp" (lọc tự động, có thể chưa chính xác), null nếu chưa có. */
  @Column('text', { nullable: true })
  viSource: string | null;

  @Column('text', { array: true })
  meaningsEn: string[];

  @Column('text', { nullable: true })
  hanviet: string | null;

  /** Hạng tần suất (nhỏ = phổ biến), 99 nếu không rõ. */
  @Column('int')
  freq: number;

  @Column('jsonb')
  examples: ContentExample[];

  @Column('int', { nullable: true })
  lessonNo: number | null;

  @Column('int', { nullable: true })
  lessonOrder: number | null;
}
