/**
 * Nạp bộ thẻ riêng từ file JSON vào một tài khoản (tài khoản phải đăng ký trước):
 *   pnpm decks:import <file.json> <email>
 * Chạy lại an toàn: bộ thẻ khớp theo key, thẻ khớp theo id; nội dung được cập nhật, lịch ôn giữ nguyên.
 * Thẻ không còn trong file bị xoá. File nguồn là nội dung riêng của người dùng, không đưa vào repo.
 */
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { DataSource, In, Not } from 'typeorm';
import { dataSourceOptions } from '../../src/database/data-source.js';
import { Deck, DeckCard, User } from '../../src/database/entities/index.js';
import type { DeckCardExample } from '../../src/database/entities/deck-card.entity.js';
import { JlptLevel } from '../../src/database/enums.js';

interface DeckFile {
  decks: {
    key: string;
    course: string;
    level: JlptLevel | null;
    chapter: number | null;
    title: string;
    kind: 'vocab' | 'kanji';
    cards: {
      id: string;
      term: string;
      furigana: string | null;
      reading: string;
      hanviet: string | null;
      wordType: string | null;
      meaning: string;
      examples: DeckCardExample[];
    }[];
  }[];
}

const CHUNK = 200;

function validate(file: DeckFile) {
  const keys = new Set<string>();
  for (const deck of file.decks) {
    if (!deck.key || keys.has(deck.key)) throw new Error(`Bộ thẻ thiếu key hoặc trùng key: ${deck.key}`);
    keys.add(deck.key);
    if (deck.level !== null && !Object.values(JlptLevel).includes(deck.level)) {
      throw new Error(`${deck.key}: level không hợp lệ`);
    }
    const ids = new Set(deck.cards.map((card) => card.id));
    if (ids.size !== deck.cards.length) throw new Error(`${deck.key}: id thẻ bị trùng`);
    for (const card of deck.cards) {
      if (!card.term || !card.meaning) throw new Error(`${deck.key}/${card.id}: thiếu mặt trước hoặc nghĩa`);
    }
  }
}

const [filePath, email] = process.argv.slice(2);
if (!filePath || !email) throw new Error('Cách dùng: pnpm decks:import <file.json> <email>');

const dataSource = new DataSource(dataSourceOptions(process.env.DATABASE_URL ?? ''));

async function main() {
  const file = JSON.parse(await readFile(filePath, 'utf8')) as DeckFile;
  validate(file);
  await dataSource.initialize();
  const user = await dataSource.getRepository(User).findOneBy({ email: email.trim().toLowerCase() });
  if (!user) throw new Error(`Chưa có tài khoản ${email}: hãy đăng ký trên web trước`);

  await dataSource.transaction(async (manager) => {
    const decks = manager.getRepository(Deck);
    const cards = manager.getRepository(DeckCard);
    await decks.upsert(
      file.decks.map((deck, position) => ({
        userId: user.id,
        sourceKey: deck.key,
        course: deck.course,
        level: deck.level,
        chapter: deck.chapter,
        title: deck.title,
        kind: deck.kind,
        position,
      })),
      ['userId', 'sourceKey'],
    );
    const saved = await decks.find({ where: { userId: user.id }, select: { id: true, sourceKey: true } });
    const deckIds = new Map(saved.map((deck) => [deck.sourceKey, deck.id]));

    let total = 0;
    for (const deck of file.decks) {
      const deckId = deckIds.get(deck.key)!;
      const rows = deck.cards.map((card, position) => ({
        deckId,
        sourceId: card.id,
        position,
        term: card.term,
        furigana: card.furigana,
        reading: card.reading,
        hanviet: card.hanviet,
        wordType: card.wordType,
        meaning: card.meaning,
        examples: card.examples,
      }));
      // upsert chỉ ghi các cột nội dung ở trên, lịch ôn FSRS của thẻ đã có không bị đụng tới.
      for (let i = 0; i < rows.length; i += CHUNK) await cards.upsert(rows.slice(i, i + CHUNK), ['deckId', 'sourceId']);
      await cards.delete({ deckId, sourceId: Not(In(deck.cards.map((card) => card.id))) });
      total += rows.length;
      console.log(`  ${deck.course} · ${deck.title}: ${rows.length} thẻ`);
    }
    console.log(`Đã nạp ${file.decks.length} bộ, ${total} thẻ cho ${user.email}.`);
  });
}

try {
  await main();
} finally {
  if (dataSource.isInitialized) await dataSource.destroy();
}
