import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class AnswerInputDto {
  @ApiProperty()
  @IsString()
  questionId: string;

  @ApiPropertyOptional({ nullable: true, minimum: 0, maximum: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  selectedIndex?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  flagged?: boolean;
}

export class SaveAnswersDto {
  @ApiProperty({ type: [AnswerInputDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => AnswerInputDto)
  answers: AnswerInputDto[];
}

export class SubmitAttemptDto {
  @ApiPropertyOptional({ type: [AnswerInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => AnswerInputDto)
  answers?: AnswerInputDto[];
}

export class RevealAnswerDto {
  @ApiProperty()
  @IsString()
  questionId: string;

  @ApiProperty({ minimum: 0, maximum: 3 })
  @IsInt()
  @Min(0)
  @Max(3)
  selectedIndex: number;
}

export class ClaimAttemptsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  attemptIds: string[];
}
