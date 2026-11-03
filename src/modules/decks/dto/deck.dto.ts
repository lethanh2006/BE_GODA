import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsUUID } from 'class-validator';

export class ReviewDeckCardDto {
  @ApiProperty()
  @IsUUID()
  cardId: string;

  /** 1 Quên, 2 Khó, 3 Nhớ, 4 Dễ. */
  @ApiProperty({ enum: [1, 2, 3, 4] })
  @IsIn([1, 2, 3, 4])
  rating: 1 | 2 | 3 | 4;
}
