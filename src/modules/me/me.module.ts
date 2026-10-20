import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attempt, UserQuestionStat } from '../../database/entities/index.js';
import { MeController } from './me.controller.js';
import { MeService } from './me.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Attempt, UserQuestionStat])],
  controllers: [MeController],
  providers: [MeService],
})
export class MeModule {}
