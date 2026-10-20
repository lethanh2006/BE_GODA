import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { JlptLevel, QuestionType } from '../../../database/enums.js';

export enum AttemptKind {
  /** Làm một đề thi thử có sẵn. */
  EXAM = 'exam',
  /** Đề ngẫu nhiên theo cấu trúc JLPT. */
  RANDOM_EXAM = 'random_exam',
  /** Luyện tập theo dạng bài. */
  PRACTICE = 'practice',
  /** Làm lại câu của một lượt trước. */
  RETRY = 'retry',
}

export enum PracticeFocus {
  /** Ưu tiên câu chưa làm, rồi câu làm sai. */
  SMART = 'smart',
  RANDOM = 'random',
  UNSEEN = 'unseen',
  MISTAKES = 'mistakes',
  BOOKMARKS = 'bookmarks',
}

export class CreateAttemptDto {
  @ApiProperty({ enum: AttemptKind })
  @IsEnum(AttemptKind)
  kind: AttemptKind;

  @ApiPropertyOptional({ description: 'kind=exam' })
  @ValidateIf((o: CreateAttemptDto) => o.kind === AttemptKind.EXAM)
  @IsString()
  examSlug?: string;

  @ApiPropertyOptional({ description: 'kind=exam: chỉ làm một phần thi' })
  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @ApiPropertyOptional({ enum: JlptLevel, description: 'kind=random_exam | practice' })
  @ValidateIf(
    (o: CreateAttemptDto) =>
      o.kind === AttemptKind.RANDOM_EXAM || (o.kind === AttemptKind.PRACTICE && o.level !== undefined),
  )
  @IsEnum(JlptLevel)
  level?: JlptLevel;

  @ApiPropertyOptional({ enum: QuestionType, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsEnum(QuestionType, { each: true })
  types?: QuestionType[];

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  count?: number;

  @ApiPropertyOptional({ enum: PracticeFocus, default: PracticeFocus.SMART })
  @IsOptional()
  @IsEnum(PracticeFocus)
  focus?: PracticeFocus;

  @ApiPropertyOptional({ description: 'Xem đáp án ngay sau mỗi câu' })
  @IsOptional()
  @IsBoolean()
  instantFeedback?: boolean;

  @ApiPropertyOptional({ minimum: 1, maximum: 240 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(240)
  timeLimitMinutes?: number;

  @ApiPropertyOptional({ description: 'kind=exam: làm đề ở chế độ luyện tập (không giờ, xem đáp án ngay)' })
  @IsOptional()
  @IsBoolean()
  practiceMode?: boolean;

  @ApiPropertyOptional({ description: 'kind=retry' })
  @ValidateIf((o: CreateAttemptDto) => o.kind === AttemptKind.RETRY)
  @IsUUID()
  fromAttemptId?: string;

  @ApiPropertyOptional({ enum: ['wrong', 'all'], default: 'wrong' })
  @IsOptional()
  @IsIn(['wrong', 'all'])
  retryScope?: 'wrong' | 'all';
}
