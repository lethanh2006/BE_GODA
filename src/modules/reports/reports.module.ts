import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question, QuestionReport } from '../../database/entities/index.js';
import { ReportsController } from './reports.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Question, QuestionReport])],
  controllers: [ReportsController],
})
export class ReportsModule {}
