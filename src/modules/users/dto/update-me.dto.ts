import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { JlptLevel } from '../../../database/enums.js';

export class UpdateMeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  displayName?: string;

  @ApiPropertyOptional({ enum: JlptLevel, nullable: true })
  @IsOptional()
  @IsEnum(JlptLevel)
  targetLevel?: JlptLevel | null;
}
