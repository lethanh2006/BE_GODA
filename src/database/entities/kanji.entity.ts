import { Column, Entity, PrimaryColumn } from 'typeorm';
import { LEVEL_COLUMN } from '../columns.js';
import type { JlptLevel } from '../enums.js';

@Entity('kanji')
export class Kanji {
  @PrimaryColumn('text')
  char: string;

  @Column(LEVEL_COLUMN)
  level: JlptLevel;

  @Column('int')
  strokes: number;

  @Column('int', { nullable: true })
  freq: number | null;

  @Column('text', { nullable: true })
  radical: string | null;

  @Column('text', { array: true })
  onyomi: string[];

  @Column('text', { array: true })
  kunyomi: string[];

  @Column('text', { array: true })
  meaningsEn: string[];

  @Column('text', { array: true })
  hanviet: string[];
}
