/**
 * DataSource cho TypeORM CLI (migration:run, migration:generate…), xem scripts trong package.json.
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from './src/database/data-source.js';

export default new DataSource(dataSourceOptions(process.env.DATABASE_URL ?? ''));
