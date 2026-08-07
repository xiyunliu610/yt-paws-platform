import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { DecimalToNumberInterceptor } from '../src/common/interceptors/decimal-to-number.interceptor';
import * as crypto from 'crypto';

process.env.EXPOSE_PASSWORD_RESET_TOKEN = 'true';

describe('Account security and deletion (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let businessId: string;
  let ownerId: string;
  let adminId: string;
  let staffId: string;
  let customerId: string;
  let resetUserId: string;
  let ownerToken: string;
  let adminToken: string;
  let staffToken: string;
  let customerToken: string;
  let resetUserToken: string;

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const emails = {
    owner: `security-owner-${suffix}@example.com`,
    admin: `security-admin-${suffix}@example.com`,
    staff: `security-staff-${suffix}@example.com`,
    customer: `security-customer-${suffix}@example.com`,
    reset: `security-reset-${suffix}@example.com`,
  };
  const password = 'Password123';

  async function login(email: string, suppliedPassword = password) {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: suppliedPassword })
      .expect(201);
    return response.body.token as string;
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication({ rawBody: true });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalInterceptors(new DecimalToNumberInterceptor());
    await app.init();
    prisma = module.get(PrismaService);

    const hash = await bcrypt.hash(password, 10);
    const business = await prisma.business.create({ data: { name: `Security Test ${suffix}` } });
    businessId = business.id;
    const [owner, admin, staff, customer, resetUser] = await Promise.all([
      prisma.user.create({ data: { email: emails.owner, password: hash, role: 'owner', businessId } }),
      prisma.user.create({ data: { email: emails.admin, password: hash, role: 'admin', businessId } }),
      prisma.user.create({ data: { email: emails.staff, password: hash, role: 'staff', businessId } }),
      prisma.user.create({ data: { email: emails.customer, password: hash, name: 'Delete Me' } }),
      prisma.user.create({ data: { email: emails.reset, password: hash, name: 'Reset Me' } }),
    ]);
    ownerId = owner.id;
    adminId = admin.id;
    staffId = staff.id;
    customerId = customer.id;
    resetUserId = resetUser.id;
    [ownerToken, adminToken, staffToken, customerToken, resetUserToken] = await Promise.all([
      login(emails.owner),
      login(emails.admin),
      login(emails.staff),
      login(emails.customer),
      login(emails.reset),
    ]);
  });

  afterAll(async () => {
    const userIds = [ownerId, adminId, staffId, customerId, resetUserId].filter(Boolean);
    await prisma.passwordResetToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.securityEvent.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.stripeCheckoutAttempt.deleteMany({ where: { payment: { booking: { businessId } } } });
    await prisma.payment.deleteMany({ where: { booking: { businessId } } });
    await prisma.dailyReport.deleteMany({ where: { booking: { businessId } } });
    await prisma.booking.deleteMany({ where: { businessId } });
    await prisma.petHealthRecord.deleteMany({ where: { pet: { ownerId: { in: userIds } } } });
    await prisma.pet.deleteMany({ where: { ownerId: { in: userIds } } });
    await prisma.service.deleteMany({ where: { businessId } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.business.delete({ where: { id: businessId } });
    await app.close();
  });

  describe('staff activation', () => {
    it('forbids changing your own status and forbids non-managers', async () => {
      await request(app.getHttpServer())
        .patch(`/auth/staff/${ownerId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ isActive: false })
        .expect(400);
      await request(app.getHttpServer())
        .patch(`/auth/staff/${staffId}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ isActive: false })
        .expect(403);
    });

    it('forbids deactivating the last active owner', async () => {
      await request(app.getHttpServer())
        .patch(`/auth/staff/${ownerId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(400);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: ownerId } })).isActive).toBe(true);
    });

    it('invalidates a staff JWT immediately after deactivation and supports reactivation', async () => {
      await request(app.getHttpServer())
        .patch(`/auth/staff/${staffId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ isActive: false })
        .expect(200);
      await request(app.getHttpServer())
        .get('/bookings/mine')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(401);
      await request(app.getHttpServer())
        .patch(`/auth/staff/${staffId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ isActive: true })
        .expect(200);
      staffToken = await login(emails.staff);
    });
  });

  describe('password sessions and reset tokens', () => {
    it('changes password, revokes the old JWT, and returns a replacement JWT', async () => {
      const response = await request(app.getHttpServer())
        .patch('/auth/change-password')
        .set('Authorization', `Bearer ${resetUserToken}`)
        .send({ currentPassword: password, newPassword: 'Changed123' })
        .expect(200);
      await request(app.getHttpServer())
        .get('/bookings/mine')
        .set('Authorization', `Bearer ${resetUserToken}`)
        .expect(401);
      await request(app.getHttpServer())
        .get('/bookings/mine')
        .set('Authorization', `Bearer ${response.body.token}`)
        .expect(200);
      await request(app.getHttpServer()).post('/auth/login').send({ email: emails.reset, password }).expect(401);
      resetUserToken = response.body.token;
    });

    it('does not reveal account existence and accepts a reset token only once', async () => {
      const unknown = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: `missing-${suffix}@example.com` })
        .expect(201);
      expect(unknown.body).toEqual({ accepted: true });

      const issued = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: emails.reset })
        .expect(201);
      expect(issued.body.accepted).toBe(true);
      expect(issued.body.resetToken).toEqual(expect.any(String));

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: issued.body.resetToken, newPassword: 'ResetAgain123' })
        .expect(201);
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: issued.body.resetToken, newPassword: 'ThirdPassword123' })
        .expect(400);
      await request(app.getHttpServer())
        .get('/bookings/mine')
        .set('Authorization', `Bearer ${resetUserToken}`)
        .expect(401);
      resetUserToken = await login(emails.reset, 'ResetAgain123');
    });

    it('rejects an expired reset token', async () => {
      const rawToken = crypto.randomBytes(32).toString('base64url');
      await prisma.passwordResetToken.create({
        data: {
          userId: resetUserId,
          tokenHash: crypto.createHash('sha256').update(rawToken).digest('hex'),
          expiresAt: new Date(Date.now() - 1000),
        },
      });
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: rawToken, newPassword: 'ExpiredToken123' })
        .expect(400);
    });

    it('rate-limits repeated reset requests without revealing account existence', async () => {
      const target = `rate-limit-${suffix}@example.com`;
      for (let attempt = 0; attempt < 3; attempt++) {
        await request(app.getHttpServer()).post('/auth/forgot-password').send({ email: target }).expect(201);
      }
      await request(app.getHttpServer()).post('/auth/forgot-password').send({ email: target }).expect(429);
    });

    it('locks an account after five consecutive invalid passwords', async () => {
      for (let attempt = 0; attempt < 5; attempt++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: emails.reset, password: 'WrongPassword123' })
          .expect(401);
      }
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: emails.reset, password: 'ResetAgain123' })
        .expect(401);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: resetUserId } })).lockedUntil).not.toBeNull();
    });
  });

  describe('account deletion and retention', () => {
    it('blocks deletion of the last active owner', async () => {
      await request(app.getHttpServer())
        .delete('/auth/account')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ password })
        .expect(400);
    });

    it('anonymizes personal/care data, revokes access, and retains financial records', async () => {
      const service = await prisma.service.create({ data: { businessId, name: 'Retained service', price: 80 } });
      const pet = await prisma.pet.create({
        data: { ownerId: customerId, name: 'Private Pet', photoUrl: 'data:image/png;base64,AA==' },
      });
      await prisma.petHealthRecord.create({ data: { petId: pet.id, type: 'private record', date: new Date() } });
      const booking = await prisma.booking.create({
        data: {
          businessId,
          customerId,
          assignedStaffId: staffId,
          petId: pet.id,
          serviceId: service.id,
          unitPrice: 80,
          pricingUnit: 'flat',
          startDate: new Date('2027-10-01T00:00:00Z'),
          endDate: new Date('2027-10-02T00:00:00Z'),
        },
      });
      const payment = await prisma.payment.create({
        data: { bookingId: booking.id, method: 'wechat_qr', amount: 80, status: 'paid', refundedById: customerId },
      });
      await prisma.dailyReport.create({
        data: { bookingId: booking.id, text: 'private report', mediaUrls: ['data:image/png;base64,AA=='] },
      });
      await prisma.notification.create({ data: { userId: customerId, title: 'Private', body: 'Private' } });

      await request(app.getHttpServer())
        .delete('/auth/account')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ password })
        .expect(200);
      await request(app.getHttpServer())
        .get('/bookings/mine')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(401);

      const deletedUser = await prisma.user.findUniqueOrThrow({ where: { id: customerId } });
      expect(deletedUser).toMatchObject({ isActive: false, name: null, phone: null, pushToken: null });
      expect(deletedUser.email).toBe(`deleted-${customerId}@deleted.invalid`);
      expect(deletedUser.deletedAt).not.toBeNull();
      expect(await prisma.petHealthRecord.count({ where: { petId: pet.id } })).toBe(0);
      expect(await prisma.notification.count({ where: { userId: customerId } })).toBe(0);
      expect(await prisma.securityEvent.count({
        where: {
          OR: [
            { userId: customerId },
            { emailHash: crypto.createHash('sha256').update(emails.customer).digest('hex') },
          ],
        },
      })).toBe(0);
      expect(await prisma.pet.findUniqueOrThrow({ where: { id: pet.id } })).toMatchObject({
        name: 'Deleted pet',
        photoUrl: null,
        dietNotes: null,
      });
      expect(await prisma.dailyReport.findFirstOrThrow({ where: { bookingId: booking.id } })).toMatchObject({
        text: null,
        mediaUrls: [],
      });
      expect(await prisma.booking.findUnique({ where: { id: booking.id } })).not.toBeNull();
      expect(await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).toMatchObject({
        amount: expect.anything(),
        refundedById: null,
      });
    });
  });
});
