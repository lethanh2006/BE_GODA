import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserWord, Word } from '../../database/entities/index.js';
import { StudyService } from './study.service.js';
import { StudyController, VocabController } from './vocab.controller.js';
import { VocabService } from './vocab.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Word, UserWord])],
  controllers: [VocabController, StudyController],
  providers: [VocabService, StudyService],
})
export class VocabModule {}
