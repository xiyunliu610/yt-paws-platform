import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Application bootstrap (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('boots the real module graph and protects authenticated routes', () => {
    return request(app.getHttpServer())
      .get('/services')
      .expect(401);
  });

  it('serves the external support page without authentication', async () => {
    const response = await request(app.getHttpServer()).get('/support').expect(200);
    expect(response.text).toContain('Y&amp;T Paws Support');
  });

  afterEach(async () => {
    await app.close();
  });
});
