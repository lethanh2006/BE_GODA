import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { Authenticated, CurrentUser } from '../../common/auth/decorators.js';
import { DecksService } from './decks.service.js';
import { CompleteDeckPracticeDto, ReviewDeckCardDto } from './dto/deck.dto.js';
import { DungMoriCatalog } from './dung-mori-catalog.js';

enum Collection {
  Private = 'private',
  DungMoriN4 = 'dung-mori-n4',
}

/** Mọi nội dung bộ thẻ đều yêu cầu đăng nhập, tiến độ chỉ chủ tài khoản xem và ôn được. */
@ApiTags('decks')
@Controller('decks')
@Authenticated()
export class DecksController {
  constructor(
    private readonly decks: DecksService,
    private readonly catalog: DungMoriCatalog,
  ) {}

  @Get()
  @ApiQuery({ name: 'collection', required: false, enum: Collection })
  async list(
    @CurrentUser() user: AuthUser,
    @Query(
      'collection',
      new DefaultValuePipe(Collection.Private),
      new ParseEnumPipe(Collection),
    )
    collection: Collection,
  ) {
    if (collection === Collection.DungMoriN4)
      await this.catalog.ensureForUser(user.id);
    return this.decks.list(user.id, collection);
  }

  @Get('queue')
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'collection', required: false, enum: Collection })
  async queue(
    @CurrentUser() user: AuthUser,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query(
      'collection',
      new DefaultValuePipe(Collection.Private),
      new ParseEnumPipe(Collection),
    )
    collection: Collection,
  ) {
    if (collection === Collection.DungMoriN4)
      await this.catalog.ensureForUser(user.id);
    return this.decks.queue(user.id, Math.max(limit, 1), collection);
  }

  @Post('review')
  review(@CurrentUser() user: AuthUser, @Body() dto: ReviewDeckCardDto) {
    return this.decks.review(user.id, dto.cardId, dto.rating);
  }

  @Get(':id')
  detail(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.decks.detail(user.id, id);
  }

  @Post(':id/practice')
  practice(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteDeckPracticeDto,
  ) {
    return this.decks.completePractice(user.id, id, dto);
  }

  @Post(':id/learned')
  learned(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.decks.markLearned(user.id, id);
  }
}
