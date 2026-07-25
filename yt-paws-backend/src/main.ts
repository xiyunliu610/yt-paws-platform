import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody is needed by the Stripe webhook handler to verify the request
  // signature before JSON-parsing the body.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.enableCors();
  await app.listen(3000);
}
bootstrap();