import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { DecimalToNumberInterceptor } from './common/interceptors/decimal-to-number.interceptor';

async function bootstrap() {
  // rawBody is needed by the Stripe webhook handler to verify the request
  // signature before JSON-parsing the body.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  app.enableCors();
  // Backstop against oversized bodies (e.g. base64 photo payloads well past
  // the per-field DTO limits); the per-field checks are the real guard.
  app.useBodyParser('json', { limit: '8mb' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new DecimalToNumberInterceptor());
  await app.listen(3000);
}
bootstrap();