import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import Stripe from 'stripe';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { DecimalToNumberInterceptor } from '../src/common/interceptors/decimal-to-number.interceptor';

// handleStripeWebhook reads this at call time; must be set before the app
// (and its ConfigModule) is created, and stay stable for constructEvent to
// verify signatures generated with the same secret below.
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_e2e_secret';

describe('Payments correctness (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const stripe = new Stripe('sk_test_unconfigured');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

  let ownerToken: string;
  let ownerId: string;
  let customerToken: string;
  let customerId: string;
  let serviceId: string;
  let businessId: string;
  let petId: string;

  const ownerEmail = `e2e_owner_${Date.now()}@example.com`;
  const customerEmail = `e2e_customer_${Date.now()}@example.com`;

  function signedWebhook(sessionId: string, type: string) {
    const payload = JSON.stringify({
      id: `evt_test_${Math.random().toString(36).slice(2)}`,
      object: 'event',
      type,
      data: { object: { id: sessionId, object: 'checkout.session' } },
    });
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });
    return { payload, header };
  }

  function postWebhook(payload: string, header: string) {
    // Not .send(Buffer.from(payload)): superagent's node client only skips
    // JSON-(re)serializing string bodies (see _end() in
    // superagent/lib/node/index.js) — a Buffer with a JSON content-type
    // still gets run through JSON.stringify(), corrupting the exact bytes
    // constructEvent needs to verify the signature against. A plain string
    // body is sent byte-for-byte as-is.
    return request(app.getHttpServer())
      .post('/payments/stripe/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', header)
      .send(payload);
  }

  // Each call needs its own non-overlapping date range — bookings.service's
  // conflict check (a pet can't be in two places at once) would otherwise
  // reject the second+ booking made for the same test pet.
  let nextBookingDay = 1;
  async function createBooking() {
    const day = nextBookingDay++;
    const start = new Date(Date.UTC(2027, 0, day)).toISOString();
    const end = new Date(Date.UTC(2027, 0, day + 1)).toISOString();
    const res = await request(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ serviceId, petId, startDate: start, endDate: end })
      .expect(201);
    return res.body as { id: string; unitPrice: number };
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // Mirrors main.ts's bootstrap() — TestingModule doesn't pick that up
    // automatically, so the global pipe/interceptor are wired up here too.
    app = moduleFixture.createNestApplication({ rawBody: true });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalInterceptors(new DecimalToNumberInterceptor());
    await app.init();

    prisma = moduleFixture.get(PrismaService);

    // Not POST /auth/register-business: it's bootstrap-only as of
    // 2026-07-30 (rejects once a Business exists, which it does in any
    // real environment), so test fixtures create the Business/owner
    // directly instead, then log in through the normal endpoint.
    const hashedPassword = await bcrypt.hash('password123', 10);
    const owner = await prisma.$transaction(async (tx) => {
      const business = await tx.business.create({ data: { name: 'E2E Test Biz (fixture)' } });
      return tx.user.create({
        data: { email: ownerEmail, password: hashedPassword, name: 'Owner', role: Role.owner, businessId: business.id },
      });
    });
    businessId = owner.businessId as string;
    ownerId = owner.id;

    const ownerRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: ownerEmail, password: 'password123' })
      .expect(201);
    ownerToken = ownerRes.body.token;

    const serviceRes = await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Grooming', price: 60 })
      .expect(201);
    serviceId = serviceRes.body.id;

    const customerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: customerEmail, password: 'password123', name: 'Customer' })
      .expect(201);
    customerToken = customerRes.body.token;
    customerId = customerRes.body.user.id;

    const petRes = await request(app.getHttpServer())
      .post('/pets')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ name: 'Rex' })
      .expect(201);
    petId = petRes.body.id;
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { userId: { in: [customerId, ownerId] } } });
    await prisma.stripeCheckoutAttempt.deleteMany({ where: { payment: { booking: { customerId } } } });
    await prisma.payment.deleteMany({ where: { booking: { customerId } } });
    await prisma.booking.deleteMany({ where: { customerId } });
    await prisma.pet.deleteMany({ where: { ownerId: customerId } });
    await prisma.service.deleteMany({ where: { businessId } });
    await prisma.user.deleteMany({ where: { email: { in: [ownerEmail, customerEmail] } } });
    await prisma.business.delete({ where: { id: businessId } });
    // PrismaService has no onModuleDestroy hook to close its pg Pool
    // adapter, so app.close() alone leaves an open handle behind.
    await prisma.$disconnect();
    await app.close();
  });

  it('rejects invalid/unexpected input via the global DTO validation', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'not-an-email', password: 'short', name: 'X', extraField: 'nope' })
      .expect(400);

    expect(res.body.message).toEqual(
      expect.arrayContaining([
        expect.stringContaining('email'),
        expect.stringContaining('extraField'),
      ]),
    );
  });

  it('snapshots price at booking time — a later Service price change does not affect an existing booking', async () => {
    const booking = await createBooking();
    expect(booking.unitPrice).toBe(60);

    await prisma.service.update({ where: { id: serviceId }, data: { price: 999 } });
    try {
      const wechat = await request(app.getHttpServer())
        .post(`/payments/wechat/${booking.id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(201);
      expect(wechat.body.amount).toBe(60);
    } finally {
      await prisma.service.update({ where: { id: serviceId }, data: { price: 60 } });
    }
  });

  it('dedupes concurrent WeChat payment initiation to a single Payment row', async () => {
    const booking = await createBooking();

    const results = await Promise.all(
      Array.from({ length: 10 }).map(() =>
        request(app.getHttpServer())
          .post(`/payments/wechat/${booking.id}`)
          .set('Authorization', `Bearer ${customerToken}`)
          .expect(201),
      ),
    );

    const paymentIds = new Set(results.map((r) => r.body.paymentId));
    expect(paymentIds.size).toBe(1);

    const rowCount = await prisma.payment.count({ where: { bookingId: booking.id } });
    expect(rowCount).toBe(1);
  });

  describe('Stripe webhook', () => {
    it('resolves an older still-open session after a retry has created a newer one, and only notifies once across duplicate deliveries', async () => {
      const booking = await createBooking();
      const payment = await prisma.payment.create({
        data: { bookingId: booking.id, method: 'stripe', amount: 60, status: 'pending' },
      });
      const oldAttempt = await prisma.stripeCheckoutAttempt.create({
        data: { paymentId: payment.id, sessionId: `cs_test_old_${payment.id}` },
      });
      const newAttempt = await prisma.stripeCheckoutAttempt.create({
        data: { paymentId: payment.id, sessionId: `cs_test_new_${payment.id}` },
      });

      const { payload, header } = signedWebhook(oldAttempt.sessionId, 'checkout.session.completed');

      // Delivered twice — Stripe retries a webhook until it gets a 2xx.
      await postWebhook(payload, header).expect(201);
      await postWebhook(payload, header).expect(201);

      const updatedPayment = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      expect(updatedPayment.status).toBe('paid');

      const updatedOldAttempt = await prisma.stripeCheckoutAttempt.findUniqueOrThrow({
        where: { id: oldAttempt.id },
      });
      expect(updatedOldAttempt.status).toBe('succeeded');

      // The newer attempt was never touched by the old session's webhook.
      const untouchedNewAttempt = await prisma.stripeCheckoutAttempt.findUniqueOrThrow({
        where: { id: newAttempt.id },
      });
      expect(untouchedNewAttempt.status).toBe('pending');

      const successNotifications = await prisma.notification.count({
        where: { userId: customerId, title: 'Payment Successful' },
      });
      expect(successNotifications).toBe(1);
    });

    it('only fails the Payment on expiry if no other attempt is still open', async () => {
      const booking = await createBooking();
      const payment = await prisma.payment.create({
        data: { bookingId: booking.id, method: 'stripe', amount: 60, status: 'pending' },
      });
      const onlyAttempt = await prisma.stripeCheckoutAttempt.create({
        data: { paymentId: payment.id, sessionId: `cs_test_solo_${payment.id}` },
      });

      const { payload, header } = signedWebhook(onlyAttempt.sessionId, 'checkout.session.expired');
      await postWebhook(payload, header).expect(201);

      const updatedPayment = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      expect(updatedPayment.status).toBe('failed');

      const failureNotifications = await prisma.notification.count({
        where: { userId: customerId, title: 'Payment Failed' },
      });
      expect(failureNotifications).toBe(1);
    });
  });

  describe('cross-method double payment prevention', () => {
    it('cancels an abandoned pending payment when the customer switches method', async () => {
      const booking = await createBooking();

      const wechat = await request(app.getHttpServer())
        .post(`/payments/wechat/${booking.id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(201);

      // Stripe API call itself will fail (no real key in this environment)
      // — that's fine, the cancel-on-switch runs before it.
      await request(app.getHttpServer())
        .post(`/payments/stripe/${booking.id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ returnUrl: 'exp://test/redirect' });

      const abandonedWechat = await prisma.payment.findUniqueOrThrow({ where: { id: wechat.body.paymentId } });
      expect(abandonedWechat.status).toBe('cancelled');
    });

    it('blocks starting a different payment method while one is awaiting verification', async () => {
      const booking = await createBooking();

      const wechat = await request(app.getHttpServer())
        .post(`/payments/wechat/${booking.id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(201);
      await request(app.getHttpServer())
        .patch(`/payments/${wechat.body.paymentId}/mark-paid`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/payments/stripe/${booking.id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ returnUrl: 'exp://test/redirect' })
        .expect(400);
    });

    it('backstops a true race (webhook + owner verification landing on two different methods for the same booking) without ever leaving two paid rows', async () => {
      const booking = await createBooking();

      // WeChat "wins" the race first.
      const wechatPayment = await prisma.payment.create({
        data: { bookingId: booking.id, method: 'wechat_qr', amount: 60, status: 'paid', verifiedAt: new Date() },
      });

      // A Stripe payment for the same booking is still in flight — this can
      // only happen at the DB level in this test because it's simulating
      // the narrow window loadPayableBooking's pending_verification check
      // doesn't cover (both methods reaching a terminal state almost
      // simultaneously), not because the app would normally allow it.
      const stripePayment = await prisma.payment.create({
        data: { bookingId: booking.id, method: 'stripe', amount: 60, status: 'pending' },
      });
      const attempt = await prisma.stripeCheckoutAttempt.create({
        data: { paymentId: stripePayment.id, sessionId: `cs_test_race_${stripePayment.id}` },
      });

      const { payload, header } = signedWebhook(attempt.sessionId, 'checkout.session.completed');
      await postWebhook(payload, header).expect(201);

      const updatedStripePayment = await prisma.payment.findUniqueOrThrow({ where: { id: stripePayment.id } });
      expect(updatedStripePayment.status).toBe('cancelled');

      const updatedWechatPayment = await prisma.payment.findUniqueOrThrow({ where: { id: wechatPayment.id } });
      expect(updatedWechatPayment.status).toBe('paid');

      const paidCount = await prisma.payment.count({ where: { bookingId: booking.id, status: 'paid' } });
      expect(paidCount).toBe(1);

      const refundNotifications = await prisma.notification.count({
        where: { userId: ownerId, title: 'Duplicate Payment Received — Refund Needed' },
      });
      expect(refundNotifications).toBe(1);
    });
  });
});
