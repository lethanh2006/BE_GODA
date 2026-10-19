import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseEnumPipe,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { AttemptMode, AttemptStatus, JlptLevel } from '../../generated/prisma/enums.js';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { Authenticated, CurrentUser } from '../../common/auth/decorators.js';
import { MeService } from './me.service.js';

@ApiTags('me')
@Controller('me')
@Authenticated()
export class MeController {
  constructor(private readonly me: MeService) {}

  /** Thống kê học tập: tổng quan, theo cấp, theo dạng bài, hoạt động 30 ngày. */
  @Get('stats')
  stats(@CurrentUser() user: AuthUser) {
    return this.me.stats(user.id);
  }

  @Get('attempts')
  @ApiQuery({ name: 'status', enum: AttemptStatus, required: false })
  @ApiQuery({ name: 'level', enum: JlptLevel, required: false })
  @ApiQuery({ name: 'mode', enum: AttemptMode, required: false })
  history(
    @CurrentUser() user: AuthUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('status', new ParseEnumPipe(AttemptStatus, { optional: true })) status?: AttemptStatus,
    @Query('level', new ParseEnumPipe(JlptLevel, { optional: true })) level?: JlptLevel,
    @Query('mode', new ParseEnumPipe(AttemptMode, { optional: true })) mode?: AttemptMode,
  ) {
    return this.me.history(user.id, {
      page: Math.max(1, page),
      pageSize: Math.min(50, Math.max(1, pageSize)),
      status,
      level,
      mode,
    });
  }
}
