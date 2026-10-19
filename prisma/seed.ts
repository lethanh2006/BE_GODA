/**
 * Nạp ngân hàng câu hỏi từ content/ vào database và dựng các đề thi.
 *   pnpm db:seed
 * Chạy lại an toàn: câu hỏi upsert theo id, câu không còn trong content bị ẩn (isActive=false)
 * thay vì xoá để giữ lịch sử làm bài.
 */
import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { hashString, seededRandom, shuffle } from '../src/common/utils/random.js';
import { BLUEPRINTS } from '../src/jlpt/blueprints.js';
import type { ContentFile, ContentQuestion } from '../src/jlpt/content.js';

const CONTENT_DIR = path.resolve(import.meta.dirname, '../content');
const CHUNK = 500;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function loadContent(): Promise<ContentFile[]> {
  const files: ContentFile[] = [];
  for (const dir of ['goda', 'openjlpt']) {
    const full = path.join(CONTENT_DIR, dir);
    const names = (await readdir(full).catch(() => [])).filter((n) => n.endsWith('.json')).sort();
    for (const name of names) {
      files.push(JSON.parse(await readFile(path.join(full, name), 'utf8')) as ContentFile);
    }
  }
  return files;
}

/** Kiểm tra dữ liệu trước khi nạp — lỗi ở đây là lỗi soạn đề, phải sửa trong content/. */
function validate(file: ContentFile, question: ContentQuestion, passageIds: Set<string>) {
  const where = `${file.source}/${file.level} ${question.id}`;
  const count = question.options.length;
  if (count < 3 || count > 4) throw new Error(`${where}: cần 3 hoặc 4 đáp án`);
  if (new Set(question.options).size !== count) throw new Error(`${where}: đáp án bị trùng`);
  if (question.answer < 0 || question.answer >= count) throw new Error(`${where}: answer ngoài khoảng`);
  if (question.passageId && !passageIds.has(question.passageId)) {
    throw new Error(`${where}: không tìm thấy bài đọc ${question.passageId}`);
  }
}

function finalOptions(file: ContentFile, question: ContentQuestion) {
  if (!file.answerFirst) return { options: question.options, answerIndex: question.answer };
  const order = shuffle(
    question.options.map((_, i) => i),
    seededRandom(hashString(question.id)),
  );
  return { options: order.map((i) => question.options[i]), answerIndex: order.indexOf(question.answer) };
}

interface QuestionRow {
  level: string;
  type: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string | null;
  passageId: string | null;
  passageOrder: number;
  source: string;
  isActive: boolean;
}

const fingerprint = (q: QuestionRow) =>
  JSON.stringify([
    q.level, q.type, q.prompt, q.options, q.answerIndex, q.explanation,
    q.passageId, q.passageOrder, q.source, q.isActive,
  ]);

async function seedQuestions(files: ContentFile[]) {
  const seenIds = new Set<string>();

  for (const file of files) {
    const passageIds = new Set(file.passages.map((p) => p.id));
    const passageOrder = new Map<string, number>();

    for (const passage of file.passages) {
      const data = { level: file.level, title: passage.title ?? null, content: passage.content, source: file.source };
      await prisma.passage.upsert({ where: { id: passage.id }, create: { id: passage.id, ...data }, update: data });
    }

    const rows = file.questions.map((question) => {
      validate(file, question, passageIds);
      if (seenIds.has(question.id)) throw new Error(`Trùng id câu hỏi: ${question.id}`);
      seenIds.add(question.id);
      const order = question.passageId ? (passageOrder.get(question.passageId) ?? 0) + 1 : 0;
      if (question.passageId) passageOrder.set(question.passageId, order);
      return {
        id: question.id,
        level: file.level,
        type: question.type,
        prompt: question.prompt,
        ...finalOptions(file, question),
        explanation: question.explanation ?? null,
        passageId: question.passageId ?? null,
        passageOrder: order,
        source: file.source,
        isActive: true,
      };
    });

    const existing = new Map(
      (
        await prisma.question.findMany({
          where: { id: { in: rows.map((r) => r.id) } },
          select: {
            id: true,
            level: true,
            type: true,
            prompt: true,
            options: true,
            answerIndex: true,
            explanation: true,
            passageId: true,
            passageOrder: true,
            source: true,
            isActive: true,
          },
        })
      ).map((q) => [q.id, fingerprint(q)]),
    );
    const fresh = rows.filter((r) => !existing.has(r.id));
    for (let i = 0; i < fresh.length; i += CHUNK) {
      await prisma.question.createMany({ data: fresh.slice(i, i + CHUNK) });
    }
    // Chỉ cập nhật câu thực sự thay đổi.
    const changed = rows.filter((r) => existing.has(r.id) && existing.get(r.id) !== fingerprint(r));
    for (const { id, ...data } of changed) {
      await prisma.question.update({ where: { id }, data });
    }
    console.log(
      `  ${file.source}/${file.level}${file.exam ? ` (đề ${file.exam.number})` : ''}: ` +
        `${rows.length} câu (${fresh.length} mới, ${changed.length} cập nhật)`,
    );
  }

  const { count } = await prisma.question.updateMany({
    where: { id: { notIn: [...seenIds] }, isActive: true },
    data: { isActive: false },
  });
  if (count) console.log(`  Ẩn ${count} câu không còn trong content/`);
}

async function seedExams(files: ContentFile[]) {
  // Gom các file cùng (cấp độ, số đề): vd n5-01.json + n5-01-listening.json.
  const groups = new Map<string, ContentFile[]>();
  for (const file of files.filter((f) => f.exam)) {
    const key = `${file.level}-${file.exam!.number}`;
    groups.set(key, [...(groups.get(key) ?? []), file]);
  }

  for (const group of groups.values()) {
    const { level } = group[0];
    const number = group[0].exam!.number;
    const head = group.find((f) => f.exam!.title);
    if (!head) throw new Error(`Đề ${level} số ${number}: chưa có file nào khai báo exam.title`);
    const blueprint = BLUEPRINTS[level];
    const slug = `${level.toLowerCase()}-de-${String(number).padStart(2, '0')}`;
    const questions = group.flatMap((f) => f.questions);
    const byType = new Map<string, ContentQuestion[]>();
    for (const question of questions) {
      byType.set(question.type, [...(byType.get(question.type) ?? []), question]);
    }

    const used = new Set<string>();
    const sections = blueprint.sections
      .map((section) => {
        if (!section.mondai.some((m) => byType.has(m.type))) {
          console.warn(`  ⚠ ${slug}: chưa có phần ${section.title}`);
          return null;
        }
        let mondaiNumber = 0;
        const items: { questionId: string; mondai: number }[] = [];
        for (const mondai of section.mondai) {
          const list = byType.get(mondai.type) ?? [];
          if (list.length === 0) {
            console.warn(`  ⚠ ${slug}: thiếu dạng ${mondai.type}`);
            continue;
          }
          if (list.length !== mondai.count) {
            console.warn(`  ⚠ ${slug}: ${mondai.type} có ${list.length} câu (chuẩn ${mondai.count})`);
          }
          mondaiNumber++;
          for (const question of list) {
            used.add(question.id);
            items.push({ questionId: question.id, mondai: mondaiNumber });
          }
        }
        return { section, items };
      })
      .filter((s) => s !== null);

    const unused = questions.filter((q) => !used.has(q.id));
    if (unused.length) {
      throw new Error(`${slug}: ${unused.length} câu có dạng không thuộc cấu trúc đề ${level} (${unused[0].type})`);
    }

    const { title, description } = head.exam!;
    const record = await prisma.exam.upsert({
      where: { slug },
      create: { slug, level, number, title: title!, description, source: head.source },
      update: { title: title!, description, number, published: true },
    });

    for (const [order, { section, items }] of sections.entries()) {
      // Giữ id phần thi ổn định để không làm mất liên kết với các lượt làm cũ.
      const saved = await prisma.examSection.upsert({
        where: { examId_order: { examId: record.id, order } },
        create: {
          examId: record.id,
          order,
          title: section.title,
          titleVi: section.titleVi,
          durationMinutes: section.durationMinutes,
        },
        update: { title: section.title, titleVi: section.titleVi, durationMinutes: section.durationMinutes },
      });
      await prisma.$transaction([
        prisma.examQuestion.deleteMany({ where: { sectionId: saved.id } }),
        prisma.examQuestion.createMany({
          data: items.map((item, index) => ({ sectionId: saved.id, order: index, ...item })),
        }),
      ]);
    }
    await prisma.examSection.deleteMany({ where: { examId: record.id, order: { gte: sections.length } } });
    console.log(`  Đề ${slug}: ${used.size} câu, ${sections.length} phần thi`);
  }
}

async function main() {
  const files = await loadContent();
  console.log(`Nạp ${files.length} file nội dung…`);
  await seedQuestions(files);
  console.log('Dựng đề thi…');
  await seedExams(files);
  console.log('Xong.');
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
