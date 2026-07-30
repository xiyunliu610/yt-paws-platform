import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, PaymentMethod, PaymentStatus, CheckoutAttemptStatus, Booking } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

// Postgres unique_violation, thrown by Prisma as P2002 — expected when two
// concurrent requests both pass the "no active payment yet" check and race
// to create one; the partial unique indexes on Payment (see schema.prisma)
// let only one of them win.
const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

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

  // Booking has no stored total; it's derived from the price/pricingUnit
  // snapshotted onto the booking at creation time (Booking.unitPrice), not
  // the service's current price — so an owner editing a price later can't
  // change what an already-placed booking owes.
  private computeAmount(booking: Booking): number {
    const unitPrice = Number(booking.unitPrice);
    if (booking.pricingUnit === 'per_day') {
      const days = Math.max(
        1,
        Math.ceil((booking.endDate.getTime() - booking.startDate.getTime()) / (24 * 60 * 60 * 1000)),
      );
      return unitPrice * days;
    }
    return unitPrice;
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

  // Shared by initiateStripe/initiateWechat: return the one "active" Payment
  // for this booking+method (see the partial unique indexes documented on
  // the Payment model), creating it if none exists. Two concurrent callers
  // can both pass the `findFirst` with nothing found — the loser's `create`
  // then hits the unique index and is caught here, re-reading the winner's
  // row instead of erroring or creating a duplicate.
  private async getOrCreateActivePayment(params: {
    bookingId: string;
    method: PaymentMethod;
    activeStatuses: PaymentStatus[];
    amount: number;
    referenceNote?: string;
  }) {
    const { bookingId, method, activeStatuses, amount, referenceNote } = params;
    const existing = await this.prisma.payment.findFirst({
      where: { bookingId, method, status: { in: activeStatuses } },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      return existing;
    }

    try {
      return await this.prisma.payment.create({ data: { bookingId, method, amount, referenceNote } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === UNIQUE_CONSTRAINT_VIOLATION) {
        const winner = await this.prisma.payment.findFirst({
          where: { bookingId, method, status: { in: activeStatuses } },
          orderBy: { createdAt: 'desc' },
        });
        if (winner) {
          return winner;
        }
      }
      throw err;
    }
  }

  // US-04.1: creates a Stripe Checkout Session (a Stripe-hosted payment
  // page) plus a matching StripeCheckoutAttempt, rather than a raw
  // PaymentIntent — chosen specifically so the app never needs a native
  // Stripe SDK / card form: the frontend just opens `checkoutUrl` in an
  // in-app browser (expo-web-browser's openAuthSessionAsync), which works
  // inside Expo Go. handleStripeWebhook is what actually marks the Payment
  // paid once Stripe confirms the charge; the frontend's post-redirect state
  // is a UX signal only, never a source of truth.
  //
  // Idempotent on the underlying Payment (reuses the existing pending stripe
  // Payment row rather than creating a new one on every retry, via
  // getOrCreateActivePayment), but each retry still needs its own Checkout
  // Session — Stripe Sessions expire and can't be reopened — so each retry
  // gets its own StripeCheckoutAttempt under that same Payment, rather than
  // overwriting a single "current session" field on it. That matters
  // because the old session stays payable until it expires: if it were
  // overwritten, a customer completing payment on an old tab would produce
  // a webhook event this service could no longer resolve back to a Payment.
  async initiateStripe(user: RequestingUser, bookingId: string, returnUrl: string) {
    const booking = await this.loadPayableBooking(user, bookingId);

    const payment = await this.getOrCreateActivePayment({
      bookingId,
      method: PaymentMethod.stripe,
      activeStatuses: [PaymentStatus.pending],
      amount: this.computeAmount(booking),
    });
    const amount = Number(payment.amount);

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

    await this.prisma.stripeCheckoutAttempt.create({
      data: { paymentId: payment.id, sessionId: session.id },
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
      const succeeded = event.type === 'checkout.session.completed';

      // Stripe retries webhook delivery until it gets a 2xx, so the same
      // event can arrive more than once. This `updateMany` is the atomic
      // guard: only the delivery that actually flips the attempt out of
      // `pending` proceeds past it, so two concurrent/duplicate deliveries
      // of the same event can't both act (and notify) on it.
      const claimed = await this.prisma.stripeCheckoutAttempt.updateMany({
        where: { sessionId: session.id, status: CheckoutAttemptStatus.pending },
        data: { status: succeeded ? CheckoutAttemptStatus.succeeded : CheckoutAttemptStatus.expired },
      });

      if (claimed.count === 1) {
        const attempt = await this.prisma.stripeCheckoutAttempt.findUnique({
          where: { sessionId: session.id },
          include: { payment: { include: { booking: true } } },
        });

        if (attempt) {
          const amount = Number(attempt.payment.amount);

          if (succeeded) {
            // Same atomic-guard pattern for the parent Payment: only the
            // request that actually moves it pending -> paid notifies.
            const advanced = await this.prisma.payment.updateMany({
              where: { id: attempt.paymentId, status: PaymentStatus.pending },
              data: { status: PaymentStatus.paid, verifiedAt: new Date() },
            });
            if (advanced.count === 1) {
              await this.notifications.notify(
                attempt.payment.booking.customerId,
                'Payment Successful',
                `Your payment of NZD ${amount.toFixed(2)} was successful.`,
              );
            }
          } else {
            // An expired session only fails the Payment if no other attempt
            // on it is still open — a retried initiateStripe call may have
            // handed the customer a fresh, still-payable Checkout link.
            const stillOpen = await this.prisma.stripeCheckoutAttempt.count({
              where: { paymentId: attempt.paymentId, status: CheckoutAttemptStatus.pending },
            });
            if (stillOpen === 0) {
              const advanced = await this.prisma.payment.updateMany({
                where: { id: attempt.paymentId, status: PaymentStatus.pending },
                data: { status: PaymentStatus.failed },
              });
              if (advanced.count === 1) {
                await this.notifications.notify(
                  attempt.payment.booking.customerId,
                  'Payment Failed',
                  `Your payment of NZD ${amount.toFixed(2)} could not be processed. Please try again.`,
                );
              }
            }
          }
        }
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

    const payment = await this.getOrCreateActivePayment({
      bookingId,
      method: PaymentMethod.wechat_qr,
      activeStatuses: [PaymentStatus.pending, PaymentStatus.pending_verification],
      amount: this.computeAmount(booking),
      referenceNote: `PAWS-${bookingId.slice(0, 8).toUpperCase()}`,
    });

    return {
      paymentId: payment.id,
      amount: Number(payment.amount),
      referenceNote: payment.referenceNote,
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

    // Atomic guard against a double-tap of "I've Paid" both passing the
    // status check above before either write lands.
    const advanced = await this.prisma.payment.updateMany({
      where: { id: paymentId, status: PaymentStatus.pending },
      data: { status: PaymentStatus.pending_verification },
    });
    if (advanced.count === 0) {
      throw new BadRequestException('This payment is not awaiting a WeChat transfer confirmation');
    }

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
      `A customer marked a NZD ${Number(payment.amount).toFixed(2)} WeChat transfer (ref ${payment.referenceNote}) as paid. Please verify it in Payment Verification.`,
    );

    const { booking: _booking, ...paymentFields } = payment;
    return { ...paymentFields, status: PaymentStatus.pending_verification };
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

    const verifiedAt = new Date();
    const advanced = await this.prisma.payment.updateMany({
      where: { id: paymentId, status: PaymentStatus.pending_verification },
      data: { status: PaymentStatus.paid, verifiedAt },
    });
    if (advanced.count === 0) {
      throw new BadRequestException('This payment is not awaiting verification');
    }

    // US-05.2
    await this.notifications.notify(
      payment.booking.customerId,
      'Payment Confirmed',
      `Your WeChat payment of NZD ${Number(payment.amount).toFixed(2)} has been confirmed. Thank you!`,
    );

    const { booking: _booking, ...paymentFields } = payment;
    return { ...paymentFields, status: PaymentStatus.paid, verifiedAt };
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
