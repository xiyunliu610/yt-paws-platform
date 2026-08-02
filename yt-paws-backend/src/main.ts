import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { DecimalToNumberInterceptor } from './common/interceptors/decimal-to-number.interceptor';
import { validateProductionConfig } from './config/production-config';

async function bootstrap() {
  validateProductionConfig(process.env);
  // rawBody is needed by the Stripe webhook handler to verify the request
  // signature before JSON-parsing the body.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  app.set('trust proxy', 1);
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',').map((value) => value.trim()).filter(Boolean);
  app.enableCors({ origin: allowedOrigins?.length ? allowedOrigins : process.env.NODE_ENV !== 'production' });
  // Media uploads bypass this process via presigned object-storage URLs.
  app.useBodyParser('json', { limit: '1mb' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new DecimalToNumberInterceptor());
  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port');
  await app.listen(port, '0.0.0.0');
}
bootstrap();
