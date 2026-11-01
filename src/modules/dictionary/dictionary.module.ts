import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Kanji, UserWord, Word } from '../../database/entities/index.js';
import { DictionaryController } from './dictionary.controller.js';
import { DictionaryService } from './dictionary.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Word, Kanji, UserWord])],
  controllers: [DictionaryController],
  providers: [DictionaryService],
})
export class DictionaryModule {}
