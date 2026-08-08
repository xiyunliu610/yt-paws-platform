import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { configureHttp } from './../src/configure-http';
import type { NestExpressApplication } from '@nestjs/platform-express';

describe('Application bootstrap (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureHttp(app as NestExpressApplication);
    prisma = moduleFixture.get(PrismaService);
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
    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('exposes liveness and database readiness probes', async () => {
    await request(app.getHttpServer()).get('/health/live').expect(200, { status: 'ok' });
    await request(app.getHttpServer()).get('/health/ready').expect(200, { status: 'ok', database: 'reachable' });
  });

  it('enforces the V1 single-business invariant in PostgreSQL', async () => {
    let bootstrapBusinessId: string | undefined;
    if (await prisma.business.count() === 0) {
      bootstrapBusinessId = (await prisma.business.create({ data: { name: 'Singleton bootstrap fixture' } })).id;
    }
    await expect(prisma.business.create({ data: { name: 'Must never be inserted' } })).rejects.toMatchObject({
      code: 'P2002',
    });
    if (bootstrapBusinessId) await prisma.business.delete({ where: { id: bootstrapBusinessId } });
  });

  it('allows exactly one winner across concurrent business bootstrap requests', async () => {
    expect(await prisma.business.count()).toBe(0);
    const suffix = Date.now();
    const responses = await Promise.all([
      request(app.getHttpServer()).post('/auth/register-business').send({
        businessName: 'Concurrent A', email: `bootstrap-a-${suffix}@example.com`,
        password: 'password123', name: 'Owner A',
      }),
      request(app.getHttpServer()).post('/auth/register-business').send({
        businessName: 'Concurrent B', email: `bootstrap-b-${suffix}@example.com`,
        password: 'password123', name: 'Owner B',
      }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 403]);
    expect(await prisma.business.count()).toBe(1);
    const business = await prisma.business.findFirstOrThrow();
    await prisma.user.deleteMany({ where: { businessId: business.id } });
    await prisma.business.delete({ where: { id: business.id } });
  });

  afterEach(async () => {
    await app.close();
  });
});
