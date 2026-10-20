import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attempt, Exam, ExamQuestion } from '../../database/entities/index.js';
import { ExamsController } from './exams.controller.js';
import { ExamsService } from './exams.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Attempt, Exam, ExamQuestion])],
  controllers: [ExamsController],
  providers: [ExamsService],
})
export class ExamsModule {}
