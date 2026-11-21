import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GrammarProgress } from '../../database/entities/grammar-progress.entity.js';
import { GrammarController } from './grammar.controller.js';
import { GrammarService } from './grammar.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([GrammarProgress])],
  controllers: [GrammarController],
  providers: [GrammarService],
})
export class GrammarModule {}
