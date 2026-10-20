import path from 'node:path';
import type { DataSourceOptions } from 'typeorm';
import { ENTITIES } from './entities/index.js';
import { SnakeNamingStrategy } from './naming.strategy.js';

// Chạy bằng tsx (CLI, seed) thì nạp migration .ts trong src/, chạy bản build thì nạp .js trong dist/.
const MIGRATION_EXT = import.meta.filename.endsWith('.ts') ? 'ts' : 'js';

export function dataSourceOptions(url: string): DataSourceOptions {
  return {
    type: 'postgres',
    url,
    entities: ENTITIES,
    migrations: [path.join(import.meta.dirname, `migrations/*.${MIGRATION_EXT}`)],
    namingStrategy: new SnakeNamingStrategy(),
    // gen_random_uuid() có sẵn từ PostgreSQL 13.
    uuidExtension: 'pgcrypto',
  };
}
