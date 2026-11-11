import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Kanji, UserWord, Word } from '../../database/entities/index.js';
import { DictionaryController } from './dictionary.controller.js';
import { DictionaryService } from './dictionary.service.js';
import { RelatedWordsService } from './related-words.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Word, Kanji, UserWord])],
  controllers: [DictionaryController],
  providers: [DictionaryService, RelatedWordsService],
})
export class DictionaryModule {}
