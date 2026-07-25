import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentMethod, PaymentStatus, Service, Booking } from '@prisma/client';

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

  // US-04.1: creates a Stripe PaymentIntent plus a matching Payment record.
  // handleStripeWebhook is what actually marks the Payment paid once Stripe
  // confirms the charge.
  async initiateStripe(user: RequestingUser, bookingId: string) {
    const booking = await this.loadPayableBooking(user, bookingId);
    const amount = this.computeAmount(booking, booking.service);

    const intent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'nzd',
      metadata: { bookingId },
    });

    const payment = await this.prisma.payment.create({
      data: {
        bookingId,
        method: PaymentMethod.stripe,
        amount,
        providerRef: intent.id,
      },
    });

    return { paymentId: payment.id, amount, clientSecret: intent.client_secret };
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    if (event.type === 'payment_intent.succeeded' || event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const payment = await this.prisma.payment.findFirst({ where: { providerRef: intent.id } });
      if (payment) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data:
            event.type === 'payment_intent.succeeded'
              ? { status: PaymentStatus.paid, verifiedAt: new Date() }
              : { status: PaymentStatus.failed },
        });
      }
    }

    return { received: true };
  }

  // US-04.2: no official WeChat merchant API in V1, so this just returns the
  // business's static QR code image plus a reference note for the customer
  // to quote when they transfer manually.
  async initiateWechat(user: RequestingUser, bookingId: string) {
    const booking = await this.loadPayableBooking(user, bookingId);
    const amount = this.computeAmount(booking, booking.service);
    const business = await this.prisma.business.findUnique({ where: { id: booking.businessId } });

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

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.pending_verification },
    });
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

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.paid, verifiedAt: new Date() },
    });
  }

  // US-04.3
  async findMine(user: RequestingUser) {
    return this.prisma.payment.findMany({
      where: { booking: { customerId: user.userId } },
      orderBy: { createdAt: 'desc' },
      include: { booking: { select: { id: true, serviceId: true, startDate: true } } },
    });
  }
}
