import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcryptjs';

jest.setTimeout(15000);
import { Role } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { DecimalToNumberInterceptor } from '../src/common/interceptors/decimal-to-number.interceptor';

describe('Booking-scoped care-details and report read permissions (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let ownerToken: string;
  let staff1Token: string; // assigned to the booking
  let staff2Token: string; // NOT assigned — should be denied
  let customerToken: string; // the booking's own customer
  let otherCustomerToken: string; // unrelated — should be denied

  let businessId: string;
  let bookingId: string;
  let allUserIds: string[];

  const ownerEmail = `bp_owner_${Date.now()}@example.com`;
  const staff1Email = `bp_staff1_${Date.now()}@example.com`;
  const staff2Email = `bp_staff2_${Date.now()}@example.com`;
  const customerEmail = `bp_customer_${Date.now()}@example.com`;
  const otherCustomerEmail = `bp_other_customer_${Date.now()}@example.com`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalInterceptors(new DecimalToNumberInterceptor());
    await app.init();

    prisma = moduleFixture.get(PrismaService);

    // Business/owner created directly via Prisma, not
    // POST /auth/register-business — that's bootstrap-only as of 2026-07-30
    // and rejects once a Business exists (true in this shared dev DB).
    const hashedPassword = await bcrypt.hash('password123', 10);
    const owner = await prisma.$transaction(async (tx) => {
      const business = await tx.business.create({ data: { name: 'Booking Perms Test Biz' } });
      return tx.user.create({
        data: { email: ownerEmail, password: hashedPassword, name: 'Owner', role: Role.owner, businessId: business.id },
      });
    });
    businessId = owner.businessId as string;

    const ownerRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: ownerEmail, password: 'password123' })
      .expect(201);
    ownerToken = ownerRes.body.token;

    const createStaff = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/auth/staff')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email, name: 'Staff' })
        .expect(201);
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: res.body.temporaryPassword })
        .expect(201);
      expect(loginRes.body.user.mustChangePassword).toBe(true);
      await request(app.getHttpServer())
        .get('/pets')
        .set('Authorization', `Bearer ${loginRes.body.token}`)
        .expect(403);
      const changed = await request(app.getHttpServer())
        .patch('/auth/change-password')
        .set('Authorization', `Bearer ${loginRes.body.token}`)
        .send({ currentPassword: res.body.temporaryPassword, newPassword: 'changed123' })
        .expect(200);
      expect(changed.body.user.mustChangePassword).toBe(false);
      return { userId: res.body.user.id as string, token: changed.body.token as string };
    };

    const staff1 = await createStaff(staff1Email);
    const staff2 = await createStaff(staff2Email);
    staff1Token = staff1.token;
    staff2Token = staff2.token;

    const customerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: customerEmail, password: 'password123', name: 'Customer' })
      .expect(201);
    customerToken = customerRes.body.token;

    const otherCustomerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: otherCustomerEmail, password: 'password123', name: 'Other Customer' })
      .expect(201);
    otherCustomerToken = otherCustomerRes.body.token;

    allUserIds = [owner.id, staff1.userId, staff2.userId, customerRes.body.user.id, otherCustomerRes.body.user.id];

    const serviceRes = await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Boarding', price: 50 })
      .expect(201);
    const serviceId = serviceRes.body.id;

    const petRes = await request(app.getHttpServer())
      .post('/pets')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ name: 'Rex', dietNotes: 'No chicken', personality: 'Shy around strangers' })
      .expect(201);
    const petId = petRes.body.id;

    const bookingRes = await request(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ serviceId, petId, startDate: '2027-06-01T00:00:00.000Z', endDate: '2027-06-02T00:00:00.000Z' })
      .expect(201);
    bookingId = bookingRes.body.id;

    await request(app.getHttpServer())
      .patch(`/bookings/${bookingId}/assign`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ staffId: staff1.userId })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'confirmed' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'in_progress' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/reports/${bookingId}`)
      .set('Authorization', `Bearer ${staff1Token}`)
      .send({ text: 'Had a great walk today.' })
      .expect(201);
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { userId: { in: allUserIds } } });
    await prisma.dailyReport.deleteMany({ where: { bookingId } });
    await prisma.booking.deleteMany({ where: { businessId } });
    await prisma.pet.deleteMany({
      where: { owner: { email: { in: [customerEmail, otherCustomerEmail] } } },
    });
    await prisma.service.deleteMany({ where: { businessId } });
    await prisma.user.deleteMany({
      where: { email: { in: [ownerEmail, staff1Email, staff2Email, customerEmail, otherCustomerEmail] } },
    });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.$disconnect();
    await app.close();
  });

  describe('GET /bookings/:id/care-details', () => {
    it('allows the booking customer and returns the pet care fields', async () => {
      const res = await request(app.getHttpServer())
        .get(`/bookings/${bookingId}/care-details`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);
      expect(res.body.pet.dietNotes).toBe('No chicken');
      expect(res.body.pet.personality).toBe('Shy around strangers');
      expect(res.body.pet.healthRecords).toEqual([]);
      expect(res.body.customer.email).toBe(customerEmail);
    });

    it('allows the assigned staff member', async () => {
      await request(app.getHttpServer())
        .get(`/bookings/${bookingId}/care-details`)
        .set('Authorization', `Bearer ${staff1Token}`)
        .expect(200);
    });

    it('allows the owner', async () => {
      await request(app.getHttpServer())
        .get(`/bookings/${bookingId}/care-details`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
    });

    it('denies a staff member who is not assigned to this booking', async () => {
      await request(app.getHttpServer())
        .get(`/bookings/${bookingId}/care-details`)
        .set('Authorization', `Bearer ${staff2Token}`)
        .expect(403);
    });

    it('denies an unrelated customer', async () => {
      await request(app.getHttpServer())
        .get(`/bookings/${bookingId}/care-details`)
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .expect(403);
    });
  });

  describe('GET /reports/:bookingId (read permission tightened to match write)', () => {
    it('allows the booking customer', async () => {
      const res = await request(app.getHttpServer())
        .get(`/reports/${bookingId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);
      expect(res.body.length).toBe(1);
    });

    it('allows the assigned staff member', async () => {
      await request(app.getHttpServer())
        .get(`/reports/${bookingId}`)
        .set('Authorization', `Bearer ${staff1Token}`)
        .expect(200);
    });

    it('allows the owner', async () => {
      await request(app.getHttpServer())
        .get(`/reports/${bookingId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
    });

    it('denies a staff member who is not assigned to this booking, even though they are in the same business', async () => {
      await request(app.getHttpServer())
        .get(`/reports/${bookingId}`)
        .set('Authorization', `Bearer ${staff2Token}`)
        .expect(403);
    });

    it('denies an unrelated customer', async () => {
      await request(app.getHttpServer())
        .get(`/reports/${bookingId}`)
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .expect(403);
    });
  });
});
