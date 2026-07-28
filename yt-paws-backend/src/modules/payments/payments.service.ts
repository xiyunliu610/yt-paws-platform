import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentMethod, PaymentStatus, Service, Booking } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

interface RequestingUser {
  userId: string;
  role: string;
  businessId: string | null;
}

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private notifications: NotificationsService,
  ) {
    // Falls back to a placeholder so an unconfigured dev environment can
    // still boot; any actual Stripe call will fail with an auth error from
    // Stripe rather than crashing the app at startup.
    this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY') || 'sk_test_unconfigured');
  }

  // Booking has no stored total; it's derived from the service's price and
  // pricing model each time a payment is initiated (Service.pricingUnit).
  private computeAmount(booking: Booking, service: Service): number {
    if (service.pricingUnit === 'per_day') {
      const days = Math.max(
        1,
        Math.ceil((booking.endDate.getTime() - booking.startDate.getTime()) / (24 * 60 * 60 * 1000)),
      );
      return service.price * days;
    }
    return service.price;
  }

  private async loadPayableBooking(user: RequestingUser, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.customerId !== user.userId) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    const alreadyPaid = await this.prisma.payment.findFirst({
      where: { bookingId, status: PaymentStatus.paid },
    });
    if (alreadyPaid) {
      throw new BadRequestException('This booking has already been paid for');
    }

    return booking;
  }

  // US-04.1: creates a Stripe Checkout Session (a Stripe-hosted payment
  // page) plus a matching Payment record, rather than a raw PaymentIntent —
  // chosen specifically so the app never needs a native Stripe SDK / card
  // form: the frontend just opens `checkoutUrl` in an in-app browser
  // (expo-web-browser's openAuthSessionAsync), which works inside Expo Go.
  // handleStripeWebhook is what actually marks the Payment paid once Stripe
  // confirms the charge; the frontend's post-redirect state is a UX signal
  // only, never a source of truth.
  //
  // Idempotent like initiateWechat: reuses an existing pending stripe
  // Payment row rather than creating a new one on every retry, but each
  // retry still needs a *new* Checkout Session (Stripe Sessions expire and
  // can't be reopened), so providerRef is updated to the fresh session id.
  async initiateStripe(user: RequestingUser, bookingId: string, returnUrl: string) {
    const booking = await this.loadPayableBooking(user, bookingId);

    const existing = await this.prisma.payment.findFirst({
      where: { bookingId, method: PaymentMethod.stripe, status: PaymentStatus.pending },
      orderBy: { createdAt: 'desc' },
    });
    const amount = existing?.amount ?? this.computeAmount(booking, booking.service);

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'nzd',
            product_data: { name: booking.service.name },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${returnUrl}?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}?status=cancel`,
      metadata: { bookingId },
    });

    const payment = existing
      ? await this.prisma.payment.update({
          where: { id: existing.id },
          data: { providerRef: session.id },
        })
      : await this.prisma.payment.create({
          data: { bookingId, method: PaymentMethod.stripe, amount, providerRef: session.id },
        });

    return { paymentId: payment.id, amount, checkoutUrl: session.url };
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    // Checkout Sessions (not raw PaymentIntents) are what initiateStripe
    // creates now — see the comment there. `checkout.session.completed`
    // fires once the hosted page collects a successful payment;
    // `checkout.session.expired` fires if the customer abandons it (24h
    // default) without ever completing, which is the closest Checkout
    // equivalent to a PaymentIntent "failed" event.
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      const payment = await this.prisma.payment.findFirst({
        where: { providerRef: session.id },
        include: { booking: true },
      });
      if (payment) {
        const succeeded = event.type === 'checkout.session.completed';
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: succeeded
            ? { status: PaymentStatus.paid, verifiedAt: new Date() }
            : { status: PaymentStatus.failed },
        });

        // US-05.2
        await this.notifications.notify(
          payment.booking.customerId,
          succeeded ? 'Payment Successful' : 'Payment Failed',
          succeeded
            ? `Your payment of NZD ${payment.amount.toFixed(2)} was successful.`
            : `Your payment of NZD ${payment.amount.toFixed(2)} could not be processed. Please try again.`,
        );
      }
    }

    return { received: true };
  }

  // US-04.2: no official WeChat merchant API in V1, so this just returns the
  // business's static QR code image plus a reference note for the customer
  // to quote when they transfer manually.
  //
  // Idempotent by design: re-opening the payment screen (e.g. after
  // backgrounding the app mid-transfer) must not spawn a second payment row
  // for the same booking, so an existing pending/pending_verification
  // wechat_qr payment is reused instead of creating a new one each call.
  async initiateWechat(user: RequestingUser, bookingId: string) {
    const booking = await this.loadPayableBooking(user, bookingId);
    const business = await this.prisma.business.findUnique({ where: { id: booking.businessId } });

    const existing = await this.prisma.payment.findFirst({
      where: {
        bookingId,
        method: PaymentMethod.wechat_qr,
        status: { in: [PaymentStatus.pending, PaymentStatus.pending_verification] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      return {
        paymentId: existing.id,
        amount: existing.amount,
        referenceNote: existing.referenceNote,
        qrCodeUrl: business?.wechatQrCodeUrl ?? null,
        status: existing.status,
      };
    }

    const amount = this.computeAmount(booking, booking.service);
    const referenceNote = `PAWS-${bookingId.slice(0, 8).toUpperCase()}`;

    const payment = await this.prisma.payment.create({
      data: {
        bookingId,
        method: PaymentMethod.wechat_qr,
        amount,
        referenceNote,
      },
    });

    return {
      paymentId: payment.id,
      amount,
      referenceNote,
      qrCodeUrl: business?.wechatQrCodeUrl ?? null,
      status: payment.status,
    };
  }

  // Customer taps "I've Paid" after transferring manually outside the app.
  async markWechatPaid(user: RequestingUser, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { booking: true },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    if (payment.booking.customerId !== user.userId) {
      throw new ForbiddenException('You do not have access to this payment');
    }
    if (payment.method !== PaymentMethod.wechat_qr || payment.status !== PaymentStatus.pending) {
      throw new BadRequestException('This payment is not awaiting a WeChat transfer confirmation');
    }

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.pending_verification },
    });

    // US-05.2: confirms to the customer their "I've paid" tap registered,
    // and — the "notify the business to reconcile" step the architecture
    // doc flagged as unimplemented — tells the business it has a transfer
    // waiting on GET /payments/business (see verifyWechatPayment below).
    await this.notifications.notify(
      user.userId,
      'Payment Submitted',
      'Thanks — we\'ve recorded your WeChat transfer. The business will confirm receipt shortly.',
    );
    await this.notifications.notifyBusinessManagers(
      payment.booking.businessId,
      'WeChat Payment Awaiting Verification',
      `A customer marked a NZD ${payment.amount.toFixed(2)} WeChat transfer (ref ${payment.referenceNote}) as paid. Please verify it in Payment Verification.`,
    );

    return updated;
  }

  // US-04.2: the business owner reconciles the manual transfer and confirms
  // it. Restricted to owner/admin at the controller level (RolesGuard) since
  // staff don't have payment-verification permission (PRD User Roles).
  async verifyWechatPayment(user: RequestingUser, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { booking: true },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    if (!user.businessId || payment.booking.businessId !== user.businessId) {
      throw new ForbiddenException('You do not have access to this payment');
    }
    if (payment.status !== PaymentStatus.pending_verification) {
      throw new BadRequestException('This payment is not awaiting verification');
    }

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.paid, verifiedAt: new Date() },
    });

    // US-05.2
    await this.notifications.notify(
      payment.booking.customerId,
      'Payment Confirmed',
      `Your WeChat payment of NZD ${payment.amount.toFixed(2)} has been confirmed. Thank you!`,
    );

    return updated;
  }

  // Backs the owner-side Payment Verification screen: every payment for the
  // business, most recent first, so pending_verification WeChat transfers
  // (the ones needing action) are easy to spot alongside settled history.
  async findForBusiness(user: RequestingUser) {
    if (!user.businessId) {
      return [];
    }
    return this.prisma.payment.findMany({
      where: { booking: { businessId: user.businessId } },
      orderBy: { createdAt: 'desc' },
      include: {
        booking: {
          select: {
            id: true,
            startDate: true,
            service: { select: { name: true } },
            customer: { select: { name: true, email: true } },
          },
        },
      },
    });
  }

  // Lets the frontend poll a single payment's status after returning from
  // the Stripe Checkout browser session — the redirect itself is not proof
  // of payment (only the webhook is), so the app re-checks this instead of
  // trusting the `?status=success` query param.
  async findOne(user: RequestingUser, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    const booking = await this.prisma.booking.findUnique({ where: { id: payment.bookingId } });
    if (booking?.customerId !== user.userId) {
      throw new ForbiddenException('You do not have access to this payment');
    }
    return payment;
  }

  // US-04.3
  async findMine(user: RequestingUser) {
    return this.prisma.payment.findMany({
      where: { booking: { customerId: user.userId } },
      orderBy: { createdAt: 'desc' },
      include: {
        booking: { select: { id: true, startDate: true, service: { select: { name: true } } } },
      },
    });
  }
}
