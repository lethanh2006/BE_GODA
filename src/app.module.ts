import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { type EnvironmentVariables, NodeEnv, validateEnv } from './config/env.validation.js';
import { dataSourceOptions } from './database/data-source.js';
import { AttemptsModule } from './modules/attempts/attempts.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { BookmarksModule } from './modules/bookmarks/bookmarks.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { DecksModule } from './modules/decks/decks.module.js';
import { DictionaryModule } from './modules/dictionary/dictionary.module.js';
import { ExamsModule } from './modules/exams/exams.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { MeModule } from './modules/me/me.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { VocabModule } from './modules/vocab/vocab.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        ...dataSourceOptions(config.get('DATABASE_URL', { infer: true })),
        // Render free không có shell hay pre-deploy command nên production tự áp migration khi khởi động.
        migrationsRun: config.get('NODE_ENV', { infer: true }) === NodeEnv.Production,
      }),
    }),
    AuthModule,
    UsersModule,
    CatalogModule,
    ExamsModule,
    AttemptsModule,
    MeModule,
    BookmarksModule,
    ReportsModule,
    DictionaryModule,
    VocabModule,
    DecksModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
