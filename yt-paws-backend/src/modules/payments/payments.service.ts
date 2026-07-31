import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
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
      where: { bookingId, status: { in: [PaymentStatus.paid, PaymentStatus.refund_pending] } },
    });
    if (alreadyPaid) {
      throw new BadRequestException('This booking has already been paid for');
    }

    // A `pending_verification` WeChat payment means the customer has
    // already claimed (via markWechatPaid) that real money has moved
    // outside the app, awaiting the owner's confirmation. Letting them
    // start a *different* payment method on top of that is exactly how a
    // booking ends up with two real payments — see
    // payment_booking_paid_unique on the Payment model. `pending` (not yet
    // claimed) payments aren't blocked here; initiateStripe/initiateWechat
    // instead cancel the other method's still-`pending` attempt when the
    // customer switches, since nothing's actually been paid yet.
    const awaitingVerification = await this.prisma.payment.findFirst({
      where: { bookingId, status: PaymentStatus.pending_verification },
    });
    if (awaitingVerification) {
      throw new BadRequestException(
        'A payment for this booking is already awaiting verification — wait for it to be confirmed before trying another payment method',
      );
    }

    return booking;
  }

  // Called by initiateStripe/initiateWechat before creating their own
  // Payment: if the customer had started paying via the *other* method and
  // abandoned it without completing (still `pending`, nothing claimed or
  // captured yet), switching methods should void that attempt rather than
  // leave both alive — two simultaneously "active" payments for the same
  // booking, one per method, is exactly the setup for a double payment (see
  // payment_booking_paid_unique). Already-`pending_verification` WeChat
  // payments are never touched here — loadPayableBooking blocks switching
  // methods in that case instead of silently cancelling a claimed payment.
  //
  // Marking the local Payment `cancelled` isn't enough on its own for a
  // Stripe payment: the actual Checkout Session stays open and payable on
  // Stripe's side (sessions default to a 24h expiry, not "expires the
  // moment we stop caring locally") — a customer could still complete
  // payment on an old, still-open tab after switching to WeChat, and the
  // resulting real charge needs to land somewhere, not vanish. This
  // proactively expires the Stripe side too; handleStripeWebhook also has
  // a fallback for the case where this call doesn't win the race (the
  // customer pays in the gap before the expire request lands, or the
  // Stripe API call itself fails).
  private async cancelOtherPendingMethodPayments(bookingId: string, keepMethod: PaymentMethod) {
    const toCancel = await this.prisma.payment.findMany({
      where: { bookingId, method: { not: keepMethod }, status: PaymentStatus.pending },
      include: { checkoutAttempts: { where: { status: CheckoutAttemptStatus.pending } } },
    });
    if (toCancel.length === 0) {
      return;
    }

    await this.prisma.payment.updateMany({
      where: { id: { in: toCancel.map((p) => p.id) } },
      data: { status: PaymentStatus.cancelled },
    });

    // Best-effort: a session that's already expired/completed on Stripe's
    // side (or an unconfigured/invalid API key in dev) throws here — that
    // must not block the method switch itself.
    const sessionIds = toCancel.flatMap((p) => p.checkoutAttempts.map((a) => a.sessionId));
    await Promise.all(
      sessionIds.map((sessionId) => this.stripe.checkout.sessions.expire(sessionId).catch(() => undefined)),
    );
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

  // Last-resort backstop for any case where real money moved (Stripe
  // charged the card, or the owner is confirming a real WeChat transfer)
  // but the atomic pending -> paid transition didn't happen — either
  // payment_booking_paid_unique caught a true cross-method race, or (see
  // handleStripeWebhook) the Payment had already been cancelled locally
  // (customer switched method) by the time Stripe told us the old session
  // was paid anyway. Either way this can't be silently discarded: marks
  // the payment `cancelled` (a no-op if it already was) rather than `paid`,
  // to keep revenue reporting correct, and notifies the business to refund
  // it manually.
  private async handleDuplicatePaymentRace(payment: {
    id: string;
    bookingId: string;
    method: PaymentMethod;
    amount: Prisma.Decimal;
    referenceNote: string | null;
  }, businessId: string) {
    await this.prisma.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.cancelled } });
    await this.notifications.notifyBusinessManagers(
      businessId,
      'Duplicate Payment Received — Refund Needed',
      `A ${payment.method} payment of NZD ${Number(payment.amount).toFixed(2)}${payment.referenceNote ? ` (ref ${payment.referenceNote})` : ''} for booking ${payment.bookingId} was received after another payment method had already been confirmed for the same booking. It was NOT recorded as paid, to avoid double-counting revenue — please refund it manually.`,
    );
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
    await this.cancelOtherPendingMethodPayments(bookingId, PaymentMethod.stripe);

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

    if (event.type === 'refund.updated' || event.type === 'refund.created' || event.type === 'refund.failed') {
      const refund = event.data.object as Stripe.Refund;
      const paymentId = refund.metadata?.paymentId;
      if (paymentId) {
        await this.applyStripeRefundState(paymentId, refund);
      }
      return { received: true };
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

      // For a completed session, `payment_intent` is the id of the charge
      // this Session created — captured now because refundPayment needs it
      // later and has no other way to get it (Stripe refunds a
      // PaymentIntent, not a Checkout Session).
      const paymentIntentId = succeeded
        ? typeof session.payment_intent === 'string'
          ? session.payment_intent
          : (session.payment_intent?.id ?? null)
        : null;

      // Stripe retries webhook delivery until it gets a 2xx, so the same
      // event can arrive more than once. This `updateMany` is the atomic
      // guard: only the delivery that actually flips the attempt out of
      // `pending` proceeds past it, so two concurrent/duplicate deliveries
      // of the same event can't both act (and notify) on it.
      const claimed = await this.prisma.stripeCheckoutAttempt.updateMany({
        where: { sessionId: session.id, status: CheckoutAttemptStatus.pending },
        data: {
          status: succeeded ? CheckoutAttemptStatus.succeeded : CheckoutAttemptStatus.expired,
          ...(paymentIntentId ? { paymentIntentId } : {}),
        },
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
            try {
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
              } else {
                // Stripe confirmed a real charge, but the Payment wasn't
                // `pending` anymore — most likely it was already cancelled
                // locally (the customer switched to WeChat and this old
                // session got paid anyway, faster than
                // cancelOtherPendingMethodPayments's Stripe-side expire
                // call could land) rather than a same-booking race caught
                // by the unique index below. Money moved either way.
                await this.handleDuplicatePaymentRace(attempt.payment, attempt.payment.booking.businessId);
              }
            } catch (err) {
              if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === UNIQUE_CONSTRAINT_VIOLATION) {
                // payment_booking_paid_unique: a WeChat payment for this
                // booking was already confirmed paid. Stripe has already
                // captured the charge — this needs a manual refund.
                await this.handleDuplicatePaymentRace(attempt.payment, attempt.payment.booking.businessId);
              } else {
                throw err;
              }
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
    await this.cancelOtherPendingMethodPayments(bookingId, PaymentMethod.wechat_qr);
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
    try {
      const advanced = await this.prisma.payment.updateMany({
        where: { id: paymentId, status: PaymentStatus.pending_verification },
        data: { status: PaymentStatus.paid, verifiedAt },
      });
      if (advanced.count === 0) {
        throw new BadRequestException('This payment is not awaiting verification');
      }
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === UNIQUE_CONSTRAINT_VIOLATION) {
        // payment_booking_paid_unique: a Stripe payment for this booking
        // was already confirmed paid (e.g. its webhook landed between this
        // payment reaching pending_verification and the owner clicking
        // verify — loadPayableBooking only blocks *starting* a second
        // method, not this). The owner is asserting a real WeChat transfer
        // was received, so it can't be silently dropped either.
        await this.handleDuplicatePaymentRace(payment, payment.booking.businessId);
        throw new BadRequestException(
          'Another payment method for this booking was already confirmed paid. This WeChat payment was recorded as cancelled — refund it manually.',
        );
      }
      throw err;
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

  private async notifyRefundedPayment(paymentId: string, reason: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { booking: true },
    });
    if (!payment) return;
    await this.notifications.notify(
      payment.booking.customerId,
      'Payment Refunded',
      `Your payment of NZD ${Number(payment.amount).toFixed(2)} has been refunded. Reason: ${reason}`,
    );
  }

  private async applyStripeRefundState(paymentId: string, refund: Stripe.Refund) {
    const paymentIntentId =
      typeof refund.payment_intent === 'string' ? refund.payment_intent : refund.payment_intent?.id;
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        method: PaymentMethod.stripe,
        checkoutAttempts: {
          some: { status: CheckoutAttemptStatus.succeeded, paymentIntentId },
        },
      },
    });
    // Metadata is useful for recovery, but never trust it alone: a signed
    // Stripe event must also reference this Payment's captured PaymentIntent.
    if (!payment || !paymentIntentId) return null;

    if (refund.status === 'succeeded') {
      const advanced = await this.prisma.payment.updateMany({
        where: { id: paymentId, status: PaymentStatus.refund_pending },
        data: { status: PaymentStatus.refunded, refundedAt: new Date(), stripeRefundId: refund.id },
      });
      if (advanced.count === 1) {
        await this.notifyRefundedPayment(paymentId, payment.refundReason ?? 'Refund approved');
      }
    } else if (refund.status === 'failed' || refund.status === 'canceled') {
      await this.prisma.payment.updateMany({
        where: { id: paymentId, status: PaymentStatus.refund_pending },
        data: {
          status: PaymentStatus.paid,
          refundReason: null,
          refundedById: null,
          stripeRefundId: refund.id,
        },
      });
    } else {
      await this.prisma.payment.updateMany({
        where: { id: paymentId, status: PaymentStatus.refund_pending },
        data: { stripeRefundId: refund.id },
      });
    }
    return this.prisma.payment.findUnique({ where: { id: paymentId } });
  }

  private isAmbiguousStripeError(error: unknown) {
    return error instanceof Stripe.errors.StripeConnectionError || error instanceof Stripe.errors.StripeAPIError;
  }

  // Owner/admin initiates a refund. V1 only supports refunding a Payment in
  // full — no partial-amount refunds, which keeps this a single state
  // transition instead of needing its own running-total bookkeeping. Does
  // *not* touch Booking.status: refunding and cancelling are independent
  // actions an owner takes separately (e.g. PATCH /bookings/:id/cancel),
  // since not every refund implies the booking itself is off.
  //
  // Stripe uses three steps: `paid -> refund_pending` is claimed atomically
  // *before* calling out to Stripe (so only the request that wins the claim
  // ever calls the refund API, and payment_booking_paid_unique — which now
  // also covers refund_pending — keeps this booking's "one payment holding
  // the money" slot reserved for the whole window, not just released the
  // moment the claim lands); then Stripe is called with an idempotency key
  // (a retried request can't double-refund the same charge); then the
  // payment is finalized to `refunded`, or rolled back to `paid` only if
  // Stripe definitively rejects it — at which point rolling back can't collide with a *new*
  // payment having become `paid` in the interim, because refund_pending
  // blocked that the whole time.
  //
  // Unknown network/API outcomes remain refund_pending. Refund webhooks and
  // reconcileRefund recover that state with the same idempotency key.
  // WeChat has no external call, so its paid -> refunded transition is one
  // atomic database write and cannot be stranded in refund_pending.
  async refundPayment(user: RequestingUser, paymentId: string, reason: string) {
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

    if (payment.method === PaymentMethod.wechat_qr) {
      const refundedAt = new Date();
      const changed = await this.prisma.payment.updateMany({
        where: { id: paymentId, status: PaymentStatus.paid },
        data: {
          status: PaymentStatus.refunded,
          refundReason: reason,
          refundedById: user.userId,
          refundedAt,
        },
      });
      if (changed.count === 0) {
        throw new BadRequestException('Only a paid payment can be refunded (it may already be refunded)');
      }
      await this.notifyRefundedPayment(paymentId, reason);
      return this.prisma.payment.findUnique({ where: { id: paymentId } });
    }

    const succeededAttempt = await this.prisma.stripeCheckoutAttempt.findFirst({
      where: { paymentId: payment.id, status: CheckoutAttemptStatus.succeeded },
      orderBy: { createdAt: 'desc' },
    });
    if (!succeededAttempt?.paymentIntentId) {
      throw new BadRequestException('No Stripe charge found for this payment');
    }

    const claimed = await this.prisma.payment.updateMany({
      where: { id: paymentId, status: PaymentStatus.paid },
      data: { status: PaymentStatus.refund_pending, refundReason: reason, refundedById: user.userId },
    });
    if (claimed.count === 0) {
      throw new BadRequestException('Only a paid payment can be refunded (it may already be refunded)');
    }

    let refund: Stripe.Refund;
    try {
      refund = await this.stripe.refunds.create(
        { payment_intent: succeededAttempt.paymentIntentId, metadata: { paymentId: payment.id } },
        { idempotencyKey: `refund_${payment.id}` },
      );
    } catch (err) {
      if (this.isAmbiguousStripeError(err)) {
        throw new ServiceUnavailableException(
          'Stripe refund result is unknown and is being kept pending; reconcile it before retrying',
        );
      }
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.paid, refundReason: null, refundedById: null },
      });
      const message = err instanceof Error ? err.message : 'unknown error';
      throw new BadRequestException(`Stripe refund failed: ${message}`);
    }

    return this.applyStripeRefundState(paymentId, refund);
  }

  async reconcileRefund(user: RequestingUser, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { booking: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (!user.businessId || payment.booking.businessId !== user.businessId) {
      throw new ForbiddenException('You do not have access to this payment');
    }
    if (payment.method !== PaymentMethod.stripe || payment.status !== PaymentStatus.refund_pending) {
      throw new BadRequestException('Only a pending Stripe refund can be reconciled');
    }

    let refund: Stripe.Refund | undefined;
    if (payment.stripeRefundId) {
      refund = await this.stripe.refunds.retrieve(payment.stripeRefundId);
    } else {
      const attempt = await this.prisma.stripeCheckoutAttempt.findFirst({
        where: { paymentId, status: CheckoutAttemptStatus.succeeded },
        orderBy: { createdAt: 'desc' },
      });
      if (!attempt?.paymentIntentId) throw new BadRequestException('No Stripe charge found for this payment');
      try {
        // Reusing the original idempotency key is the authoritative recovery
        // operation: Stripe returns the first request's result if it landed,
        // or safely creates it now if the earlier request never arrived.
        refund = await this.stripe.refunds.create(
          { payment_intent: attempt.paymentIntentId, metadata: { paymentId } },
          { idempotencyKey: `refund_${paymentId}` },
        );
      } catch (error) {
        if (this.isAmbiguousStripeError(error)) {
          throw new ServiceUnavailableException('Stripe refund status is still unavailable; it remains pending');
        }
        await this.prisma.payment.update({
          where: { id: paymentId },
          data: { status: PaymentStatus.paid, refundReason: null, refundedById: null },
        });
        const message = error instanceof Error ? error.message : 'unknown error';
        throw new BadRequestException(`Stripe refund failed: ${message}`);
      }
    }
    return this.applyStripeRefundState(paymentId, refund);
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
