import { Controller, Get, Param, ParseEnumPipe, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { JlptLevel } from '../../generated/prisma/enums.js';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { CurrentUser } from '../../common/auth/decorators.js';
import { ExamsService } from './exams.service.js';

@ApiTags('exams')
@Controller('exams')
export class ExamsController {
  constructor(private readonly exams: ExamsService) {}

  @Get()
  @ApiQuery({ name: 'level', enum: JlptLevel, required: false })
  list(
    @Query('level', new ParseEnumPipe(JlptLevel, { optional: true })) level?: JlptLevel,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.exams.list(level, user);
  }

  @Get(':slug')
  detail(@Param('slug') slug: string, @CurrentUser() user?: AuthUser) {
    return this.exams.detail(slug, user);
  }
}
