import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { DecimalToNumberInterceptor } from './common/interceptors/decimal-to-number.interceptor';

async function bootstrap() {
  if (process.env.NODE_ENV === 'production') {
    if (process.env.EXPOSE_PASSWORD_RESET_TOKEN === 'true') {
      throw new Error('EXPOSE_PASSWORD_RESET_TOKEN must never be enabled in production');
    }
    const required = [
      'JWT_SECRET',
      'PUBLIC_WEB_URL',
      'SUPPORT_EMAIL',
      'CORS_ORIGINS',
      'RESEND_API_KEY',
      'MAIL_FROM',
      'OBJECT_STORAGE_BUCKET',
      'OBJECT_STORAGE_PUBLIC_URL',
      'OBJECT_STORAGE_ACCESS_KEY_ID',
      'OBJECT_STORAGE_SECRET_ACCESS_KEY',
    ];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length) throw new Error(`Missing required production configuration: ${missing.join(', ')}`);
  }
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
  await app.listen(3000);
}
bootstrap();
