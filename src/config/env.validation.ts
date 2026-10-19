import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsInt()
  @Min(0)
  @Max(65535)
  PORT: number = 4000;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  /** Danh sách origin được phép gọi API, phân tách bằng dấu phẩy. */
  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN: string = 'http://localhost:3000';

  @IsString()
  @MinLength(32)
  JWT_SECRET: string;

  @IsInt()
  @Min(1)
  JWT_EXPIRES_DAYS: number = 30;

  /** Bật khi chạy HTTPS (production). */
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  COOKIE_SECURE: boolean = false;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const env = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(env);

  if (errors.length > 0) {
    throw new Error(`Invalid environment variables:\n${errors.toString()}`);
  }
  return env;
}
