import {
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseEnumPipe,
  Put,
  Query,
} from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { Authenticated, CurrentUser } from '../../common/auth/decorators.js';
import { Bookmark, Question } from '../../database/entities/index.js';
import { JlptLevel } from '../../database/enums.js';

@ApiTags('bookmarks')
@Controller('bookmarks')
@Authenticated()
export class BookmarksController {
  constructor(
    @InjectRepository(Bookmark) private readonly bookmarks: Repository<Bookmark>,
    @InjectRepository(Question) private readonly questions: Repository<Question>,
  ) {}

  @Get()
  @ApiQuery({ name: 'level', enum: JlptLevel, required: false })
  async list(
    @CurrentUser() user: AuthUser,
    @Query('level', new ParseEnumPipe(JlptLevel, { optional: true })) level?: JlptLevel,
  ) {
    const bookmarks = await this.bookmarks.find({
      where: { userId: user.id, ...(level && { question: { level } }) },
      order: { createdAt: 'DESC' },
      take: 500,
      relations: { question: { passage: true } },
    });
    return bookmarks.map(({ question, createdAt }) => ({
      createdAt,
      question: {
        id: question.id,
        level: question.level,
        type: question.type,
        prompt: question.prompt,
        options: question.options,
        answerIndex: question.answerIndex,
        explanation: question.explanation,
        source: question.source,
        passage: question.passage && {
          id: question.passage.id,
          title: question.passage.title,
          content: question.passage.content,
        },
      },
    }));
  }

  @Put(':questionId')
  @HttpCode(204)
  async add(@CurrentUser() user: AuthUser, @Param('questionId') questionId: string) {
    if (!(await this.questions.existsBy({ id: questionId }))) {
      throw new NotFoundException('Câu hỏi không tồn tại');
    }
    await this.bookmarks
      .createQueryBuilder()
      .insert()
      .values({ userId: user.id, questionId })
      .orIgnore()
      .execute();
  }

  @Delete(':questionId')
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @Param('questionId') questionId: string) {
    await this.bookmarks.delete({ userId: user.id, questionId });
  }
}
