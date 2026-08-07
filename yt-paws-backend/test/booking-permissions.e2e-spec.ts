import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcryptjs';

jest.setTimeout(15000);
import { PaymentMethod, PaymentStatus, Role } from '@prisma/client';
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
  let serviceId: string;
  let petId: string;
  let allUserIds: string[];
  let staff1Id: string;
  let staff2Id: string;

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
    staff1Id = staff1.userId;
    staff2Id = staff2.userId;
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
    serviceId = serviceRes.body.id;

    const petRes = await request(app.getHttpServer())
      .post('/pets')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ name: 'Rex', dietNotes: 'No chicken', personality: 'Shy around strangers' })
      .expect(201);
    petId = petRes.body.id;

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
    await prisma.stripeCheckoutAttempt.deleteMany({ where: { payment: { booking: { businessId } } } });
    await prisma.payment.deleteMany({ where: { booking: { businessId } } });
    await prisma.booking.deleteMany({ where: { businessId } });
    await prisma.petHealthRecord.deleteMany({ where: { pet: { owner: { email: { in: [customerEmail, otherCustomerEmail] } } } } });
    await prisma.pet.deleteMany({
      where: { owner: { email: { in: [customerEmail, otherCustomerEmail] } } },
    });
    await prisma.service.deleteMany({ where: { businessId } });
    await prisma.user.deleteMany({
      where: { email: { in: [ownerEmail, staff1Email, staff2Email, customerEmail, otherCustomerEmail] } },
    });
    await prisma.business.delete({ where: { id: businessId } });
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

  describe('core service, pet, notification, cancellation and capacity flows', () => {
    const createPet = async (name: string) => {
      const response = await request(app.getHttpServer()).post('/pets')
        .set('Authorization', `Bearer ${customerToken}`).send({ name }).expect(201);
      return response.body.id as string;
    };

    const createBooking = (targetPetId: string, startDate: string | Date, endDate: string | Date) =>
      request(app.getHttpServer()).post('/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ serviceId, petId: targetPetId, startDate, endDate });

    it('treats a null service capacity as unlimited', async () => {
      await request(app.getHttpServer()).patch(`/services/${serviceId}`)
        .set('Authorization', `Bearer ${ownerToken}`).send({ maxConcurrentBookings: null }).expect(200);
      const secondPetId = await createPet('Unlimited-capacity pet');
      await createBooking(secondPetId, '2027-06-01T12:00:00.000Z', '2027-06-02T12:00:00.000Z')
        .expect(201);
    });

    it('rejects an overlapping second booking at capacity one but permits a non-overlapping booking', async () => {
      await request(app.getHttpServer()).patch(`/services/${serviceId}`)
        .set('Authorization', `Bearer ${ownerToken}`).send({ maxConcurrentBookings: 1 }).expect(200);
      const overlapPetId = await createPet('Capacity-one overlap pet');
      await createBooking(overlapPetId, '2027-06-01T12:00:00.000Z', '2027-06-02T12:00:00.000Z')
        .expect(409);
      const nonOverlapPetId = await createPet('Non-overlap pet');
      await createBooking(nonOverlapPetId, '2027-07-01T00:00:00.000Z', '2027-07-02T00:00:00.000Z')
        .expect(201);
    });

    it('releases service capacity immediately after a permitted cancellation', async () => {
      const firstPetId = await createPet('Released-capacity pet one');
      const secondPetId = await createPet('Released-capacity pet two');
      const first = await createBooking(firstPetId, '2027-08-01T00:00:00.000Z', '2027-08-02T00:00:00.000Z')
        .expect(201);
      await createBooking(secondPetId, '2027-08-01T12:00:00.000Z', '2027-08-02T12:00:00.000Z')
        .expect(409);
      await request(app.getHttpServer()).patch(`/bookings/${first.body.id}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`).expect(200);
      await createBooking(secondPetId, '2027-08-01T12:00:00.000Z', '2027-08-02T12:00:00.000Z')
        .expect(201);
    });

    it('enforces staff capacity and allows reassignment to available staff', async () => {
      await request(app.getHttpServer()).patch(`/services/${serviceId}`)
        .set('Authorization', `Bearer ${ownerToken}`).send({ maxConcurrentBookings: null }).expect(200);
      await request(app.getHttpServer()).patch(`/auth/staff/${staff1Id}/capacity`)
        .set('Authorization', `Bearer ${ownerToken}`).send({ maxConcurrentBookings: 1 }).expect(200);
      const targetPetId = await createPet('Staff-capacity pet');
      const target = await createBooking(targetPetId, '2027-06-01T12:00:00.000Z', '2027-06-02T12:00:00.000Z')
        .expect(201);
      await request(app.getHttpServer()).patch(`/bookings/${target.body.id}/assign`)
        .set('Authorization', `Bearer ${ownerToken}`).send({ staffId: staff1Id }).expect(409);
      const reassigned = await request(app.getHttpServer()).patch(`/bookings/${target.body.id}/assign`)
        .set('Authorization', `Bearer ${ownerToken}`).send({ staffId: staff2Id }).expect(200);
      expect(reassigned.body.assignedStaffId).toBe(staff2Id);
    });

    it('supports pet health records and protects them from unrelated customers', async () => {
      const record = await request(app.getHttpServer()).post(`/pets/${petId}/health-records`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ type: 'vaccination', date: '2026-01-01T00:00:00.000Z', notes: 'Current' }).expect(201);
      expect(record.body.petId).toBe(petId);
      await request(app.getHttpServer()).get(`/pets/${petId}/health-records`)
        .set('Authorization', `Bearer ${otherCustomerToken}`).expect(403);
    });

    it('records and marks booking notifications read', async () => {
      const list = await request(app.getHttpServer()).get('/notifications/mine')
        .set('Authorization', `Bearer ${customerToken}`).expect(200);
      expect(list.body.length).toBeGreaterThan(0);
      const unread = list.body.find((item: { readAt: string | null }) => !item.readAt);
      await request(app.getHttpServer()).patch(`/notifications/${unread.id}/read`)
        .set('Authorization', `Bearer ${customerToken}`).expect(200);
    });

    it('allows cancellation before 24 hours and rejects it inside the window for owner and customer alike', async () => {
      await request(app.getHttpServer()).patch(`/services/${serviceId}`)
        .set('Authorization', `Bearer ${ownerToken}`).send({ maxConcurrentBookings: null }).expect(200);
      const far = await createBooking(petId, new Date(Date.now() + 72 * 3600000), new Date(Date.now() + 73 * 3600000)).expect(201);
      await request(app.getHttpServer()).patch(`/bookings/${far.body.id}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`).expect(200);
      const near = await createBooking(petId, new Date(Date.now() + 2 * 3600000), new Date(Date.now() + 3 * 3600000)).expect(201);
      await request(app.getHttpServer()).patch(`/bookings/${near.body.id}/cancel`)
        .set('Authorization', `Bearer ${ownerToken}`).expect(400);
    });

    it('rejects cancellation at the exact 24-hour cutoff', async () => {
      const startDate = new Date(Date.now() + 24 * 3600000);
      const boundary = await createBooking(
        await createPet('Cancellation-boundary pet'),
        startDate,
        new Date(startDate.getTime() + 3600000),
      ).expect(201);
      // By the time the request reaches the service it is at, or a few
      // milliseconds beyond, the exact start-minus-24-hours boundary.
      await request(app.getHttpServer()).patch(`/bookings/${boundary.body.id}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`).expect(400);
    });

    it('cancels a paid booking without changing its Payment status', async () => {
      const paidBooking = await createBooking(
        await createPet('Paid-cancellation pet'),
        '2027-11-01T00:00:00.000Z',
        '2027-11-01T01:00:00.000Z',
      ).expect(201);
      const payment = await prisma.payment.create({
        data: {
          bookingId: paidBooking.body.id,
          method: PaymentMethod.wechat_qr,
          amount: 50,
          status: PaymentStatus.paid,
        },
      });
      await request(app.getHttpServer()).patch(`/bookings/${paidBooking.body.id}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`).expect(200);
      const unchanged = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      expect(unchanged.status).toBe(PaymentStatus.paid);
      expect(unchanged.refundedAt).toBeNull();
    });
  });
});
