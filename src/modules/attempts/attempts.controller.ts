import { Body, Controller, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { Authenticated, CurrentUser } from '../../common/auth/decorators.js';
import { AttemptsService } from './attempts.service.js';
import {
  ClaimAttemptsDto,
  RevealAnswerDto,
  SaveAnswersDto,
  SubmitAttemptDto,
} from './dto/answer.dto.js';
import { CreateAttemptDto } from './dto/create-attempt.dto.js';

@ApiTags('attempts')
@Controller('attempts')
export class AttemptsController {
  constructor(private readonly attempts: AttemptsService) {}

  @Post()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  create(@Body() dto: CreateAttemptDto, @CurrentUser() user?: AuthUser) {
    return this.attempts.create(dto, user);
  }

  @Post('claim')
  @HttpCode(200)
  @Authenticated()
  claim(@Body() dto: ClaimAttemptsDto, @CurrentUser() user: AuthUser) {
    return this.attempts.claim(user, dto.attemptIds);
  }

  @Get(':id')
  view(@Param('id') id: string, @CurrentUser() user?: AuthUser) {
    return this.attempts.view(id, user);
  }

  @Put(':id/answers')
  saveAnswers(@Param('id') id: string, @Body() dto: SaveAnswersDto, @CurrentUser() user?: AuthUser) {
    return this.attempts.saveAnswers(id, user, dto.answers);
  }

  @Post(':id/reveal')
  @HttpCode(200)
  reveal(@Param('id') id: string, @Body() dto: RevealAnswerDto, @CurrentUser() user?: AuthUser) {
    return this.attempts.reveal(id, user, dto);
  }

  @Post(':id/submit')
  @HttpCode(200)
  submit(@Param('id') id: string, @Body() dto: SubmitAttemptDto, @CurrentUser() user?: AuthUser) {
    return this.attempts.submit(id, user, dto);
  }
}
