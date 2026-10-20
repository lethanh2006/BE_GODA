import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bookmark, Question } from '../../database/entities/index.js';
import { BookmarksController } from './bookmarks.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Bookmark, Question])],
  controllers: [BookmarksController],
})
export class BookmarksModule {}
