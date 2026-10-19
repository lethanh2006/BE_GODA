import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import type { EnvironmentVariables } from './config/env.validation.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<EnvironmentVariables, true>);

  app.setGlobalPrefix('api');
  // API chỉ trả JSON; tắt CSP để Swagger UI tải được script của nó.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());
  app.enableCors({
    origin: config
      .get('CORS_ORIGIN', { infer: true })
      .split(',')
      .map((origin) => origin.trim()),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('GODA JLPT API')
    .setDescription('API cho web luyện đề JLPT')
    .setVersion('0.1.0')
    .addCookieAuth('goda_token')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, () =>
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();
