import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class ReviewDeckCardDto {
  @ApiProperty()
  @IsUUID()
  cardId: string;

  /** 1 Quên, 2 Khó, 3 Nhớ, 4 Dễ. */
  @ApiProperty({ enum: [1, 2, 3, 4] })
  @IsIn([1, 2, 3, 4])
  rating: 1 | 2 | 3 | 4;
}

export class DeckPracticeAnswerDto {
  @ApiProperty()
  @IsUUID()
  cardId: string;

  @ApiProperty()
  @IsUUID()
  answerId: string;
}

export class CompleteDeckPracticeDto {
  @ApiProperty({ enum: ['matching', 'listening'] })
  @IsIn(['matching', 'listening'])
  mode: 'matching' | 'listening';

  @ApiProperty({ type: [DeckPracticeAnswerDto], minItems: 1, maxItems: 2000 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => DeckPracticeAnswerDto)
  answers: DeckPracticeAnswerDto[];
}
