import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { validateProductionConfig } from './config/production-config';
import { configureHttp } from './configure-http';

async function bootstrap() {
  validateProductionConfig(process.env);
  // rawBody is needed by the Stripe webhook handler to verify the request
  // signature before JSON-parsing the body.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  configureHttp(app);
  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port');
  await app.listen(port, '0.0.0.0');
}
bootstrap();
