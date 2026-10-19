import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ enum: ['ok', 'degraded'] })
  status: 'ok' | 'degraded';

  @ApiProperty({ enum: ['up', 'down'] })
  database: 'up' | 'down';

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  timestamp: string;
}
