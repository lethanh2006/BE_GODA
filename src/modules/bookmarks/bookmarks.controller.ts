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
import { JlptLevel } from '../../generated/prisma/enums.js';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { Authenticated, CurrentUser } from '../../common/auth/decorators.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@ApiTags('bookmarks')
@Controller('bookmarks')
@Authenticated()
export class BookmarksController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiQuery({ name: 'level', enum: JlptLevel, required: false })
  async list(
    @CurrentUser() user: AuthUser,
    @Query('level', new ParseEnumPipe(JlptLevel, { optional: true })) level?: JlptLevel,
  ) {
    const bookmarks = await this.prisma.bookmark.findMany({
      where: { userId: user.id, ...(level && { question: { level } }) },
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        question: {
          include: { passage: { select: { id: true, title: true, content: true } } },
        },
      },
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
        passage: question.passage,
      },
    }));
  }

  @Put(':questionId')
  @HttpCode(204)
  async add(@CurrentUser() user: AuthUser, @Param('questionId') questionId: string) {
    const exists = await this.prisma.question.count({ where: { id: questionId } });
    if (!exists) throw new NotFoundException('Câu hỏi không tồn tại');
    await this.prisma.bookmark.upsert({
      where: { userId_questionId: { userId: user.id, questionId } },
      create: { userId: user.id, questionId },
      update: {},
    });
  }

  @Delete(':questionId')
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @Param('questionId') questionId: string) {
    await this.prisma.bookmark.deleteMany({ where: { userId: user.id, questionId } });
  }
}
