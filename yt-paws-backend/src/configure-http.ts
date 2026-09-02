import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { DecimalToNumberInterceptor } from './common/interceptors/decimal-to-number.interceptor';

export function configureHttp(app: NestExpressApplication) {
  app.set('trust proxy', 1);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
      },
    },
  }));
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',').map((value) => value.trim()).filter(Boolean);
  app.enableCors({ origin: allowedOrigins?.length ? allowedOrigins : process.env.NODE_ENV !== 'production' });
  app.useBodyParser('json', { limit: '1mb' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalInterceptors(new DecimalToNumberInterceptor());
}
