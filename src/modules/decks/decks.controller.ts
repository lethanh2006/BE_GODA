import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { Authenticated, CurrentUser } from '../../common/auth/decorators.js';
import { DecksService } from './decks.service.js';
import { CompleteDeckPracticeDto, ReviewDeckCardDto } from './dto/deck.dto.js';

/** Bộ thẻ riêng: chỉ chủ bộ thẻ xem và ôn được. */
@ApiTags('decks')
@Controller('decks')
@Authenticated()
export class DecksController {
  constructor(private readonly decks: DecksService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.decks.list(user.id);
  }

  @Get('queue')
  @ApiQuery({ name: 'limit', required: false })
  queue(
    @CurrentUser() user: AuthUser,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.decks.queue(user.id, Math.max(limit, 1));
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
