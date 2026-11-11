import { Controller, DefaultValuePipe, Get, Param, ParseEnumPipe, ParseIntPipe, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { CurrentUser } from '../../common/auth/decorators.js';
import { JlptLevel } from '../../database/enums.js';
import { DictionaryService } from './dictionary.service.js';
import { RelatedWordsService } from './related-words.service.js';

@ApiTags('dictionary')
@Controller('dictionary')
export class DictionaryController {
  constructor(
    private readonly dictionary: DictionaryService,
    private readonly relatedWords: RelatedWordsService,
  ) {}

  @Get()
  overview() {
    return this.dictionary.overview();
  }

  /** Tra từ bằng chữ Nhật, romaji, tiếng Việt (có hoặc không dấu), âm Hán Việt hoặc tiếng Anh. */
  @Get('search')
  @ApiQuery({ name: 'q' })
  @ApiQuery({ name: 'level', enum: JlptLevel, required: false })
  @ApiQuery({ name: 'limit', required: false })
  search(
    @Query('q') q = '',
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
    @Query('level', new ParseEnumPipe(JlptLevel, { optional: true })) level?: JlptLevel,
  ) {
    return this.dictionary.search(q.slice(0, 100), Math.min(Math.max(limit, 1), 100), level);
  }

  @Get('words/:id')
  word(@Param('id') id: string, @CurrentUser() user?: AuthUser) {
    return this.dictionary.word(id, user?.id);
  }

  /** Từ liên quan để học tiếp: tính sẵn bằng model embedding (GĐ1 kế hoạch AI), công khai như từ điển. */
  @Get('words/:id/related')
  @ApiQuery({ name: 'limit', required: false })
  related(@Param('id') id: string, @Query('limit', new DefaultValuePipe(6), ParseIntPipe) limit: number) {
    return this.relatedWords.related(id, Math.min(Math.max(limit, 1), 12));
  }

  @Get('kanji')
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'level', enum: JlptLevel, required: false })
  kanjiList(
    @Query('q') q?: string,
    @Query('level', new ParseEnumPipe(JlptLevel, { optional: true })) level?: JlptLevel,
  ) {
    return this.dictionary.kanjiList(q?.slice(0, 50), level);
  }

  @Get('kanji/:char')
  kanji(@Param('char') char: string) {
    return this.dictionary.kanjiDetail(char);
  }
}
