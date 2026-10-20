import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { DataSource, In, IsNull, type Repository } from 'typeorm';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { assertOwner } from '../../common/utils/http.js';
import {
  Attempt,
  AttemptAnswer,
  Bookmark,
  Exam,
  Question,
  UserQuestionStat,
} from '../../database/entities/index.js';
import {
  AttemptMode,
  AttemptStatus,
  type JlptLevel,
  type QuestionType,
} from '../../database/enums.js';
import { BLUEPRINTS } from '../../jlpt/blueprints.js';
import { QUESTION_TYPES } from '../../jlpt/question-types.js';
import { estimateJlptScore } from '../../jlpt/scoring.js';
import { pickQuestions, sortByTypeOrder, type CandidateQuestion } from '../../jlpt/selection.js';
import {
  groupIntoMondai,
  layoutQuestionIds,
  type AttemptLayout,
  type LayoutSection,
} from './attempt-layout.js';
import type { AnswerInputDto, RevealAnswerDto, SubmitAttemptDto } from './dto/answer.dto.js';
import { AttemptKind, PracticeFocus, type CreateAttemptDto } from './dto/create-attempt.dto.js';

const DEFAULT_PRACTICE_COUNT = 20;
/** Cho phép nộp/lưu trễ một chút sau khi hết giờ (độ trễ mạng, auto-submit). */
const DEADLINE_GRACE_SECONDS = 120;

interface NewAttempt {
  mode: AttemptMode;
  level: JlptLevel;
  title: string;
  layout: AttemptLayout;
  instantFeedback: boolean;
  timeLimitSeconds: number | null;
  examId?: string;
  sectionId?: string;
  questionType?: QuestionType;
}

@Injectable()
export class AttemptsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Attempt) private readonly attempts: Repository<Attempt>,
    @InjectRepository(AttemptAnswer) private readonly answers: Repository<AttemptAnswer>,
    @InjectRepository(Question) private readonly questions: Repository<Question>,
    @InjectRepository(Exam) private readonly exams: Repository<Exam>,
    @InjectRepository(UserQuestionStat) private readonly stats: Repository<UserQuestionStat>,
    @InjectRepository(Bookmark) private readonly bookmarks: Repository<Bookmark>,
  ) {}

  // ---------------------------------------------------------------- create

  async create(dto: CreateAttemptDto, user: AuthUser | undefined) {
    const draft = await this.buildDraft(dto, user);
    const questionIds = layoutQuestionIds(draft.layout);
    if (questionIds.length === 0) {
      throw new BadRequestException('Không tìm thấy câu hỏi phù hợp với lựa chọn của bạn');
    }

    const attempt = await this.attempts.save(
      this.attempts.create({
        userId: user?.id ?? null,
        mode: draft.mode,
        level: draft.level,
        title: draft.title,
        examId: draft.examId ?? null,
        sectionId: draft.sectionId ?? null,
        questionType: draft.questionType ?? null,
        questionIds,
        layout: draft.layout,
        instantFeedback: draft.instantFeedback,
        timeLimitSeconds: draft.timeLimitSeconds,
        totalCount: questionIds.length,
      }),
    );
    return { id: attempt.id };
  }

  private buildDraft(dto: CreateAttemptDto, user: AuthUser | undefined): Promise<NewAttempt> {
    switch (dto.kind) {
      case AttemptKind.EXAM:
        return this.draftFromExam(dto);
      case AttemptKind.RANDOM_EXAM:
        return this.draftRandomExam(dto.level!, user);
      case AttemptKind.PRACTICE:
        return this.draftPractice(dto, user);
      case AttemptKind.RETRY:
        return this.draftRetry(dto, user);
    }
  }

  private async draftFromExam(dto: CreateAttemptDto): Promise<NewAttempt> {
    const exam = await this.exams.findOne({
      where: { slug: dto.examSlug },
      order: { sections: { order: 'ASC', questions: { order: 'ASC' } } },
      relations: { sections: { questions: { question: true } } },
    });
    if (!exam || !exam.published) {
      throw new NotFoundException('Đề thi không tồn tại');
    }

    const sections = dto.sectionId
      ? exam.sections.filter((section) => section.id === dto.sectionId)
      : exam.sections;
    if (sections.length === 0) {
      throw new NotFoundException('Phần thi không tồn tại');
    }

    const layout: AttemptLayout = sections.map((section) => {
      const mondai: LayoutSection['mondai'] = [];
      for (const item of section.questions) {
        const last = mondai.at(-1);
        if (last && last.number === item.mondai) {
          last.questionIds.push(item.questionId);
        } else {
          mondai.push({ number: item.mondai, type: item.question.type, questionIds: [item.questionId] });
        }
      }
      return {
        title: section.title,
        titleVi: section.titleVi,
        durationMinutes: section.durationMinutes,
        mondai,
      };
    });

    const practice = dto.practiceMode === true;
    const minutes = sections.reduce((sum, section) => sum + section.durationMinutes, 0);
    const sectionTitle = dto.sectionId ? ` · ${sections[0].title}` : '';

    return {
      mode: practice ? AttemptMode.PRACTICE : AttemptMode.EXAM,
      level: exam.level,
      title: `${exam.title}${sectionTitle}`,
      layout,
      instantFeedback: practice,
      timeLimitSeconds: practice ? null : minutes * 60,
      examId: exam.id,
      sectionId: dto.sectionId,
    };
  }

  private async draftRandomExam(level: JlptLevel, user: AuthUser | undefined): Promise<NewAttempt> {
    const blueprint = BLUEPRINTS[level];
    const types = blueprint.sections.flatMap((section) => section.mondai.map((m) => m.type));
    const candidates = await this.candidates(level, types);
    const priorityOf = await this.priorityFn(user, candidates);
    const used = new Set<string>();

    const layout: AttemptLayout = blueprint.sections.map((section) => {
      let number = 0;
      const mondai: LayoutSection['mondai'] = [];
      for (const item of section.mondai) {
        const picked = pickQuestions(
          candidates.filter((q) => q.type === item.type),
          { count: item.count, priorityOf, exclude: used },
        );
        if (picked.length === 0) continue;
        picked.forEach((q) => used.add(q.id));
        mondai.push({ number: ++number, type: item.type, title: item.title, questionIds: picked.map((q) => q.id) });
      }
      return {
        title: section.title,
        titleVi: section.titleVi,
        durationMinutes: section.durationMinutes,
        mondai,
      };
    });

    const minutes = blueprint.sections.reduce((sum, s) => sum + s.durationMinutes, 0);
    return {
      mode: AttemptMode.EXAM,
      level,
      title: `Đề ngẫu nhiên JLPT ${level}`,
      layout: layout.filter((section) => section.mondai.length > 0),
      instantFeedback: false,
      timeLimitSeconds: minutes * 60,
    };
  }

  private async draftPractice(dto: CreateAttemptDto, user: AuthUser | undefined): Promise<NewAttempt> {
    const focus = dto.focus ?? PracticeFocus.SMART;
    const count = dto.count ?? DEFAULT_PRACTICE_COUNT;
    const needsUser = focus === PracticeFocus.MISTAKES || focus === PracticeFocus.BOOKMARKS;
    if (needsUser && !user) {
      throw new BadRequestException('Vui lòng đăng nhập để ôn câu sai / câu đã lưu');
    }
    if (!dto.level && !needsUser) {
      throw new BadRequestException('Vui lòng chọn cấp độ');
    }

    let candidates = await this.candidates(dto.level, dto.types);
    if (focus === PracticeFocus.MISTAKES) {
      const wrong = await this.stats.find({
        where: { userId: user!.id, lastCorrect: false },
        select: { userId: true, questionId: true },
      });
      const ids = new Set(wrong.map((w) => w.questionId));
      // Ôn câu sai: chỉ lấy đúng các câu đã sai, kể cả khi chúng thuộc bài đọc.
      candidates = candidates.filter((q) => ids.has(q.id)).map((q) => ({ ...q, passageId: null }));
    } else if (focus === PracticeFocus.BOOKMARKS) {
      const saved = await this.bookmarks.find({
        where: { userId: user!.id },
        select: { userId: true, questionId: true },
      });
      const ids = new Set(saved.map((b) => b.questionId));
      candidates = candidates.filter((q) => ids.has(q.id)).map((q) => ({ ...q, passageId: null }));
    }

    const priorityOf =
      focus === PracticeFocus.RANDOM ? undefined : await this.priorityFn(user, candidates);
    if (focus === PracticeFocus.UNSEEN && priorityOf) {
      candidates = candidates.filter((q) => priorityOf(q.id) === 0);
    }

    const picked = sortByTypeOrder(pickQuestions(candidates, { count, priorityOf }));
    const singleType = dto.types?.length === 1 ? dto.types[0] : undefined;
    const levelLabel = dto.level ? ` ${dto.level}` : '';
    const focusLabel: Record<PracticeFocus, string> = {
      [PracticeFocus.SMART]: 'Luyện tập',
      [PracticeFocus.RANDOM]: 'Luyện tập ngẫu nhiên',
      [PracticeFocus.UNSEEN]: 'Luyện câu mới',
      [PracticeFocus.MISTAKES]: 'Ôn câu sai',
      [PracticeFocus.BOOKMARKS]: 'Ôn câu đã lưu',
    };
    const typeLabel = singleType ? ` · ${QUESTION_TYPES[singleType].nameJa}` : '';

    return {
      mode: AttemptMode.PRACTICE,
      level: dto.level ?? (await this.dominantLevel(picked)),
      title: `${focusLabel[focus]}${levelLabel}${typeLabel}`,
      layout: [
        {
          title: '練習',
          titleVi: 'Luyện tập',
          durationMinutes: dto.timeLimitMinutes ?? null,
          mondai: groupIntoMondai(picked),
        },
      ],
      instantFeedback: dto.instantFeedback ?? true,
      timeLimitSeconds: dto.timeLimitMinutes ? dto.timeLimitMinutes * 60 : null,
      questionType: singleType,
    };
  }

  private async draftRetry(dto: CreateAttemptDto, user: AuthUser | undefined): Promise<NewAttempt> {
    const source = await this.attempts.findOne({
      where: { id: dto.fromAttemptId },
      relations: { answers: true },
    });
    assertOwner(source, user, 'Lượt làm bài');
    if (source.status !== AttemptStatus.SUBMITTED) {
      throw new BadRequestException('Lượt làm bài này chưa nộp');
    }

    const scope = dto.retryScope ?? 'wrong';
    const correct = new Set(source.answers.filter((a) => a.isCorrect).map((a) => a.questionId));
    const ids = scope === 'all' ? source.questionIds : source.questionIds.filter((id) => !correct.has(id));
    if (ids.length === 0) {
      throw new BadRequestException('Bạn đã làm đúng tất cả các câu 🎉');
    }

    const questions = await this.questions.find({
      where: { id: In(ids) },
      select: { id: true, type: true },
    });
    const byId = new Map(questions.map((q) => [q.id, q]));
    const ordered = ids.map((id) => byId.get(id)).filter((q) => q !== undefined);

    return {
      mode: AttemptMode.PRACTICE,
      level: source.level,
      title: `${scope === 'wrong' ? 'Làm lại câu sai' : 'Làm lại'} · ${source.title}`,
      layout: [
        { title: '練習', titleVi: 'Luyện tập', durationMinutes: null, mondai: groupIntoMondai(ordered) },
      ],
      instantFeedback: dto.instantFeedback ?? true,
      timeLimitSeconds: null,
    };
  }

  private candidates(level?: JlptLevel, types?: QuestionType[]): Promise<CandidateQuestion[]> {
    return this.questions.find({
      where: {
        isActive: true,
        ...(level && { level }),
        ...(types?.length && { type: In(types) }),
      },
      select: { id: true, type: true, passageId: true, passageOrder: true },
    });
  }

  /** 0 = chưa làm, 1 = lần gần nhất làm sai, 2 = lần gần nhất làm đúng. */
  private async priorityFn(user: AuthUser | undefined, candidates: CandidateQuestion[]) {
    if (!user) return undefined;
    const stats = await this.stats
      .createQueryBuilder('s')
      .select(['s.questionId', 's.lastCorrect'])
      .where('s.userId = :userId', { userId: user.id })
      .andWhere('s.questionId = ANY(:ids)', { ids: candidates.map((q) => q.id) })
      .getMany();
    const tier = new Map(stats.map((s) => [s.questionId, s.lastCorrect ? 2 : 1]));
    return (id: string) => tier.get(id) ?? 0;
  }

  private async dominantLevel(picked: CandidateQuestion[]): Promise<JlptLevel> {
    const top = await this.questions
      .createQueryBuilder('q')
      .select('q.level', 'level')
      .where('q.id = ANY(:ids)', { ids: picked.map((q) => q.id) })
      .groupBy('q.level')
      .orderBy('COUNT(*)', 'DESC')
      .limit(1)
      .getRawOne<{ level: JlptLevel }>();
    return top?.level ?? 'N5';
  }

  // ---------------------------------------------------------------- read

  async view(id: string, user: AuthUser | undefined) {
    const attempt = await this.attempts.findOne({
      where: { id },
      relations: { answers: true, exam: true },
    });
    assertOwner(attempt, user, 'Lượt làm bài');

    const questions = await this.questions.find({
      where: { id: In(attempt.questionIds) },
      relations: { passage: true },
    });
    const bookmarked = user
      ? new Set(
          (
            await this.bookmarks.find({
              where: { userId: user.id, questionId: In(attempt.questionIds) },
              select: { userId: true, questionId: true },
            })
          ).map((b) => b.questionId),
        )
      : new Set<string>();

    const submitted = attempt.status === AttemptStatus.SUBMITTED;
    const answers = new Map(attempt.answers.map((a) => [a.questionId, a]));
    const byId = new Map(questions.map((q) => [q.id, q]));
    const passages: Record<string, { id: string; title: string | null; content: string }> = {};

    const items = attempt.questionIds.flatMap((questionId) => {
      const question = byId.get(questionId);
      if (!question) return [];
      if (question.passage) {
        const { id, title, content } = question.passage;
        passages[id] = { id, title, content };
      }
      const answer = answers.get(questionId);
      const showKey = submitted || answer?.revealed === true;
      return [
        {
          id: question.id,
          type: question.type,
          prompt: question.prompt,
          options: question.options,
          passageId: question.passageId,
          source: question.source,
          selectedIndex: answer?.selectedIndex ?? null,
          flagged: answer?.flagged ?? false,
          revealed: answer?.revealed ?? false,
          bookmarked: bookmarked.has(questionId),
          ...(showKey && {
            answerIndex: question.answerIndex,
            explanation: question.explanation,
            isCorrect: answer?.selectedIndex != null && answer.selectedIndex === question.answerIndex,
          }),
        },
      ];
    });

    const layout = (attempt.layout as unknown as AttemptLayout).map((section) => ({
      ...section,
      mondai: section.mondai.map((m) => ({
        ...m,
        nameJa: m.title ?? QUESTION_TYPES[m.type].nameJa,
        nameVi: QUESTION_TYPES[m.type].nameVi,
        instruction: QUESTION_TYPES[m.type].instruction,
        instructionVi: QUESTION_TYPES[m.type].instructionVi,
      })),
    }));

    return {
      id: attempt.id,
      mode: attempt.mode,
      status: attempt.status,
      level: attempt.level,
      title: attempt.title,
      examSlug: attempt.exam?.slug ?? null,
      instantFeedback: attempt.instantFeedback,
      timeLimitSeconds: attempt.timeLimitSeconds,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      timeSpentSeconds: attempt.timeSpentSeconds,
      serverNow: new Date(),
      isOwner: attempt.userId !== null && attempt.userId === user?.id,
      sections: layout,
      passages,
      questions: items,
      result: submitted ? this.summarize(attempt, items) : null,
    };
  }

  private summarize(
    attempt: Attempt,
    items: { type: QuestionType; selectedIndex: number | null; isCorrect?: boolean }[],
  ) {
    const byType = new Map<QuestionType, { correct: number; total: number; answered: number }>();
    for (const item of items) {
      const entry = byType.get(item.type) ?? { correct: 0, total: 0, answered: 0 };
      entry.total++;
      if (item.selectedIndex !== null) entry.answered++;
      if (item.isCorrect) entry.correct++;
      byType.set(item.type, entry);
    }

    return {
      correctCount: attempt.correctCount ?? 0,
      totalCount: attempt.totalCount,
      answeredCount: items.filter((item) => item.selectedIndex !== null).length,
      scorePercent: attempt.scorePercent ?? 0,
      byType: [...byType.entries()].map(([type, stats]) => ({
        type,
        nameJa: QUESTION_TYPES[type].nameJa,
        nameVi: QUESTION_TYPES[type].nameVi,
        group: QUESTION_TYPES[type].group,
        ...stats,
      })),
      estimate:
        attempt.mode === AttemptMode.EXAM
          ? estimateJlptScore(
              attempt.level,
              items.map((item) => ({ type: item.type, isCorrect: item.isCorrect === true })),
            )
          : null,
    };
  }

  // ---------------------------------------------------------------- write

  async saveAnswers(id: string, user: AuthUser | undefined, inputs: AnswerInputDto[]) {
    const attempt = await this.loadOpenAttempt(id, user);
    await this.applyAnswers(attempt, inputs);
    return { savedAt: new Date() };
  }

  async reveal(id: string, user: AuthUser | undefined, dto: RevealAnswerDto) {
    const attempt = await this.loadOpenAttempt(id, user);
    if (!attempt.instantFeedback) {
      throw new BadRequestException('Chế độ thi không xem được đáp án trước khi nộp bài');
    }
    if (!attempt.questionIds.includes(dto.questionId)) {
      throw new BadRequestException('Câu hỏi không thuộc lượt làm bài này');
    }

    const question = await this.questions.findOneOrFail({
      where: { id: dto.questionId },
      select: { id: true, answerIndex: true, explanation: true, options: true },
    });
    const existing = await this.answers.findOneBy({ attemptId: id, questionId: dto.questionId });

    let selectedIndex = dto.selectedIndex;
    if (existing?.revealed && existing.selectedIndex !== null) {
      selectedIndex = existing.selectedIndex;
    } else {
      if (selectedIndex >= question.options.length) {
        throw new BadRequestException('Đáp án không hợp lệ');
      }
      const isCorrect = selectedIndex === question.answerIndex;
      await this.answers.upsert(
        { attemptId: id, questionId: dto.questionId, selectedIndex, isCorrect, revealed: true },
        ['attemptId', 'questionId'],
      );
      // Ghi thống kê ngay để câu sai được ôn lại kể cả khi người học thoát mà không nộp bài.
      if (attempt.userId) {
        await this.recordStats(attempt.userId, [{ questionId: dto.questionId, selectedIndex, isCorrect }], new Date());
      }
    }

    return {
      questionId: dto.questionId,
      selectedIndex,
      answerIndex: question.answerIndex,
      explanation: question.explanation,
      isCorrect: selectedIndex === question.answerIndex,
    };
  }

  async submit(id: string, user: AuthUser | undefined, dto: SubmitAttemptDto) {
    const attempt = await this.attempts.findOneBy({ id });
    assertOwner(attempt, user, 'Lượt làm bài');
    if (attempt.status === AttemptStatus.SUBMITTED) {
      return { id: attempt.id, status: attempt.status };
    }
    if (dto.answers?.length) {
      await this.applyAnswers(attempt, dto.answers, { ignoreDeadline: true });
    }

    const [questions, answers] = await Promise.all([
      this.questions.find({
        where: { id: In(attempt.questionIds) },
        select: { id: true, answerIndex: true },
      }),
      this.answers.findBy({ attemptId: id }),
    ]);
    const key = new Map(questions.map((q) => [q.id, q.answerIndex]));
    const graded = answers.map((answer) => ({
      questionId: answer.questionId,
      selectedIndex: answer.selectedIndex,
      revealed: answer.revealed,
      isCorrect: answer.selectedIndex !== null && answer.selectedIndex === key.get(answer.questionId),
    }));
    const correctCount = graded.filter((g) => g.isCorrect).length;

    const now = new Date();
    const elapsed = Math.round((now.getTime() - attempt.startedAt.getTime()) / 1000);
    const timeSpentSeconds = attempt.timeLimitSeconds
      ? Math.min(elapsed, attempt.timeLimitSeconds)
      : elapsed;

    const claimed = await this.dataSource.transaction(async (manager) => {
      // Chống nộp 2 lần đồng thời: chỉ chuyển trạng thái khi vẫn đang IN_PROGRESS.
      const { affected } = await manager.update(
        Attempt,
        { id, status: AttemptStatus.IN_PROGRESS },
        {
          status: AttemptStatus.SUBMITTED,
          submittedAt: now,
          timeSpentSeconds,
          correctCount,
          scorePercent: attempt.totalCount ? (correctCount / attempt.totalCount) * 100 : 0,
        },
      );
      if (!affected) return false;

      for (const isCorrect of [true, false]) {
        const questionIds = graded.filter((g) => g.isCorrect === isCorrect).map((g) => g.questionId);
        if (questionIds.length === 0) continue;
        await manager.update(AttemptAnswer, { attemptId: id, questionId: In(questionIds) }, { isCorrect });
      }
      return true;
    });

    if (claimed && attempt.userId) {
      // Câu đã xem đáp án được ghi thống kê lúc xem rồi.
      await this.recordStats(attempt.userId, graded.filter((g) => !g.revealed), now);
    }
    return { id, status: AttemptStatus.SUBMITTED };
  }

  /** Gắn các lượt làm bài lúc chưa đăng nhập vào tài khoản. */
  async claim(user: AuthUser, attemptIds: string[]) {
    // Bỏ qua id không phải UUID (vd lượt làm cũ còn lưu trong trình duyệt).
    const ids = attemptIds.filter((id) => isUUID(id));
    const guestAttempts = await this.attempts.find({
      where: { id: In(ids), userId: IsNull() },
      relations: { answers: true },
    });
    if (guestAttempts.length === 0) {
      return { claimed: 0 };
    }

    await this.attempts.update(
      { id: In(guestAttempts.map((a) => a.id)), userId: IsNull() },
      { userId: user.id },
    );
    for (const attempt of guestAttempts) {
      // Bài đã nộp: tính mọi câu. Bài đang làm: chỉ tính câu đã xem đáp án (lúc nộp sẽ bỏ qua các câu này).
      const answers =
        attempt.status === AttemptStatus.SUBMITTED ? attempt.answers : attempt.answers.filter((a) => a.revealed);
      const graded = answers.map((a) => ({
        questionId: a.questionId,
        selectedIndex: a.selectedIndex,
        isCorrect: a.isCorrect === true,
      }));
      await this.recordStats(user.id, graded, attempt.submittedAt ?? new Date());
    }
    return { claimed: guestAttempts.length };
  }

  private async recordStats(
    userId: string,
    graded: { questionId: string; selectedIndex: number | null; isCorrect: boolean }[],
    at: Date,
  ) {
    const answered = graded.filter((g) => g.selectedIndex !== null);
    if (answered.length === 0) return;
    // Đã có thống kê thì cộng dồn số lần làm / số lần đúng (query builder không hỗ trợ cộng dồn khi upsert).
    await this.dataSource.query(
      `INSERT INTO user_question_stats
         (user_id, question_id, seen_count, correct_count, last_correct, last_answered_at)
       SELECT $1::uuid, t.question_id, 1, CASE WHEN t.is_correct THEN 1 ELSE 0 END, t.is_correct, $4::timestamptz
       FROM unnest($2::text[], $3::boolean[]) AS t(question_id, is_correct)
       ON CONFLICT (user_id, question_id) DO UPDATE SET
         seen_count = user_question_stats.seen_count + 1,
         correct_count = user_question_stats.correct_count + EXCLUDED.correct_count,
         last_correct = EXCLUDED.last_correct,
         last_answered_at = EXCLUDED.last_answered_at`,
      [userId, answered.map((g) => g.questionId), answered.map((g) => g.isCorrect), at],
    );
  }

  private async loadOpenAttempt(id: string, user: AuthUser | undefined) {
    const attempt = await this.attempts.findOneBy({ id });
    assertOwner(attempt, user, 'Lượt làm bài');
    if (attempt.status === AttemptStatus.SUBMITTED) {
      throw new ConflictException('Bài đã được nộp');
    }
    return attempt;
  }

  private async applyAnswers(
    attempt: Attempt,
    inputs: AnswerInputDto[],
    { ignoreDeadline = false } = {},
  ) {
    if (!ignoreDeadline && attempt.timeLimitSeconds) {
      const deadline =
        attempt.startedAt.getTime() + (attempt.timeLimitSeconds + DEADLINE_GRACE_SECONDS) * 1000;
      if (Date.now() > deadline) {
        throw new ConflictException('Đã hết giờ làm bài');
      }
    }

    const allowed = new Set(attempt.questionIds);
    const valid = inputs.filter((input) => allowed.has(input.questionId));
    if (valid.length === 0) return;

    const existing = await this.answers.find({
      where: { attemptId: attempt.id, questionId: In(valid.map((v) => v.questionId)) },
      select: { attemptId: true, questionId: true, revealed: true },
    });
    const locked = new Set(existing.filter((e) => e.revealed).map((e) => e.questionId));

    // upsert chỉ ghi đè các cột có giá trị, nên gom các dòng cùng tập cột vào một câu lệnh.
    const groups = new Map<string, Partial<AttemptAnswer>[]>();
    for (const input of valid) {
      // Câu đã xem đáp án thì không cho đổi lựa chọn, chỉ cho đánh dấu.
      const selection = locked.has(input.questionId) || input.selectedIndex === undefined
        ? {}
        : { selectedIndex: input.selectedIndex };
      const flag = input.flagged === undefined ? {} : { flagged: input.flagged };
      const row = { attemptId: attempt.id, questionId: input.questionId, ...selection, ...flag };
      const shape = Object.keys(row).join();
      groups.set(shape, [...(groups.get(shape) ?? []), row]);
    }
    await this.dataSource.transaction(async (manager) => {
      for (const rows of groups.values()) {
        await manager.upsert(AttemptAnswer, rows, ['attemptId', 'questionId']);
      }
    });
  }
}
