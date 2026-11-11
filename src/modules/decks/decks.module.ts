import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Deck, DeckCard, ReviewLog } from '../../database/entities/index.js';
import { DecksController } from './decks.controller.js';
import { DecksService } from './decks.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Deck, DeckCard, ReviewLog])],
  controllers: [DecksController],
  providers: [DecksService],
})
export class DecksModule {}
