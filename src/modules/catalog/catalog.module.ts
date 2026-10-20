import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exam, Passage, Question } from '../../database/entities/index.js';
import { CatalogController } from './catalog.controller.js';
import { CatalogService } from './catalog.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Exam, Passage, Question])],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
