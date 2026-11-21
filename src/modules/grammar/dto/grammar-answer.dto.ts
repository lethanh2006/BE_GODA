import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class GrammarAnswerDto {
  @IsString() @MaxLength(100) questionId: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @IsInt({ each: true })
  @Min(0, { each: true })
  answer: number[];
}
