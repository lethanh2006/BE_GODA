import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { Authenticated, CurrentUser } from '../../common/auth/decorators.js';
import { GrammarAnswerDto } from './dto/grammar-answer.dto.js';
import { GrammarService } from './grammar.service.js';

@ApiTags('grammar')
@Controller('grammar/n4')
@Authenticated()
export class GrammarController {
  constructor(private readonly grammar: GrammarService) {}
  @Get() list(@CurrentUser() user: AuthUser) {
    return this.grammar.list(user.id);
  }
  @Get(':chapter') detail(
    @CurrentUser() user: AuthUser,
    @Param('chapter', ParseIntPipe) chapter: number,
  ) {
    return this.grammar.detail(user.id, chapter);
  }
  @Post(':chapter/answers') answer(
    @CurrentUser() user: AuthUser,
    @Param('chapter', ParseIntPipe) chapter: number,
    @Body() dto: GrammarAnswerDto,
  ) {
    return this.grammar.answer(user.id, chapter, dto);
  }
}
