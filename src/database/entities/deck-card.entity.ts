import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { Deck } from './deck.entity.js';

export interface DeckCardExample {
  /** Câu tiếng Nhật, chữ Hán có furigana dạng {漢字|かんじ}. */
  ja: string;
  vi: string | null;
}

/** Một thẻ trong bộ thẻ riêng, kèm lịch ôn FSRS (bộ thẻ chỉ có một chủ nên lưu thẳng trên thẻ). */
@Entity('deck_cards')
@Index(['deckId', 'sourceId'], { unique: true })
@Index(['deckId', 'position'])
@Index(['due'])
export class DeckCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  deckId: string;

  @ManyToOne(() => Deck, (deck) => deck.cards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deck_id' })
  deck: Relation<Deck>;

  @Column('text')
  sourceId: string;

  @Column('int')
  position: number;

  /** Mặt trước: từ hoặc chữ Hán, không furigana. */
  @Column('text')
  term: string;

  /** Từ có furigana dạng {漢字|かんじ}; null nếu không có chữ Hán. */
  @Column('text', { nullable: true })
  furigana: string | null;

  @Column('text')
  reading: string;

  @Column('text', { nullable: true })
  hanviet: string | null;

  @Column('text', { nullable: true })
  wordType: string | null;

  @Column('text')
  meaning: string;

  @Column('jsonb')
  examples: DeckCardExample[];

  /** Lịch ôn FSRS; due = null nghĩa là chưa học bài chứa thẻ này. */
  @Column('smallint', { default: 0 })
  state: number;

  @Column('timestamptz', { nullable: true })
  due: Date | null;

  @Column('double precision', { default: 0 })
  stability: number;

  @Column('double precision', { default: 0 })
  difficulty: number;

  @Column('int', { default: 0 })
  scheduledDays: number;

  @Column('int', { default: 0 })
  learningSteps: number;

  @Column('int', { default: 0 })
  reps: number;

  @Column('int', { default: 0 })
  lapses: number;

  @Column('timestamptz', { nullable: true })
  lastReview: Date | null;
}
