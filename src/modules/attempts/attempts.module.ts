import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attempt, AttemptAnswer, Bookmark, Exam, Question, UserQuestionStat } from '../../database/entities/index.js';
import { AttemptsController } from './attempts.controller.js';
import { AttemptsService } from './attempts.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Attempt, AttemptAnswer, Bookmark, Exam, Question, UserQuestionStat])],
  controllers: [AttemptsController],
  providers: [AttemptsService],
})
export class AttemptsModule {}
