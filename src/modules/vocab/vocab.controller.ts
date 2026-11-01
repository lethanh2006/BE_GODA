import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { Authenticated, CurrentUser } from '../../common/auth/decorators.js';
import { JlptLevel } from '../../database/enums.js';
import { AddWordsDto, ReviewDto, SetKnownDto } from './dto/study.dto.js';
import { StudyService, type WordStatus } from './study.service.js';
import { VocabService } from './vocab.service.js';

const WORD_STATUS = { due: 'due', learning: 'learning', mature: 'mature', known: 'known' } as const;

@ApiTags('vocab')
@Controller('vocab')
export class VocabController {
  constructor(private readonly vocab: VocabService) {}

  @Get('levels')
  levels(@CurrentUser() user?: AuthUser) {
    return this.vocab.levels(user?.id);
  }

  @Get('levels/:level/lessons')
  lessons(@Param('level', new ParseEnumPipe(JlptLevel)) level: JlptLevel, @CurrentUser() user?: AuthUser) {
    return this.vocab.lessons(level, user?.id);
  }

  @Get('levels/:level/lessons/:no')
  lesson(
    @Param('level', new ParseEnumPipe(JlptLevel)) level: JlptLevel,
    @Param('no', ParseIntPipe) no: number,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.vocab.lesson(level, no, user?.id);
  }
}

@ApiTags('study')
@Controller('study')
@Authenticated()
export class StudyController {
  constructor(private readonly study: StudyService) {}

  @Get('stats')
  stats(@CurrentUser() user: AuthUser) {
    return this.study.stats(user.id);
  }

  @Get('queue')
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'level', enum: JlptLevel, required: false })
  queue(
    @CurrentUser() user: AuthUser,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('level', new ParseEnumPipe(JlptLevel, { optional: true })) level?: JlptLevel,
  ) {
    return this.study.queue(user.id, Math.max(limit, 1), level);
  }

  @Post('review')
  review(@CurrentUser() user: AuthUser, @Body() dto: ReviewDto) {
    return this.study.review(user.id, dto.wordId, dto.rating);
  }

  @Get('words')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'status', enum: WORD_STATUS, required: false })
  @ApiQuery({ name: 'level', enum: JlptLevel, required: false })
  list(
    @CurrentUser() user: AuthUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('status', new ParseEnumPipe(WORD_STATUS, { optional: true })) status?: WordStatus,
    @Query('level', new ParseEnumPipe(JlptLevel, { optional: true })) level?: JlptLevel,
  ) {
    return this.study.list(user.id, Math.max(page, 1), status, level);
  }

  @Post('words')
  add(@CurrentUser() user: AuthUser, @Body() dto: AddWordsDto) {
    return this.study.addWords(user.id, dto.wordIds, dto.learned);
  }

  @Put('words/:id/known')
  @HttpCode(204)
  async setKnown(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SetKnownDto) {
    await this.study.setKnown(user.id, id, dto.known);
  }

  @Delete('words/:id')
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.study.removeWord(user.id, id);
  }
}
