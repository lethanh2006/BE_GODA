import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class AddWordsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  wordIds: string[];

  /** true: người học vừa qua bài học, xem như đã chấm "Nhớ" lần đầu nên hẹn ôn sau vài ngày. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  learned?: boolean;
}

export class ReviewDto {
  @ApiProperty()
  @IsString()
  wordId: string;

  /** 1 Quên, 2 Khó, 3 Nhớ, 4 Dễ. */
  @ApiProperty({ enum: [1, 2, 3, 4] })
  @IsIn([1, 2, 3, 4])
  rating: 1 | 2 | 3 | 4;
}

export class SetKnownDto {
  @ApiProperty()
  @IsBoolean()
  known: boolean;
}
