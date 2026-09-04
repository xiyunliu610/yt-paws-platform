import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaymentMethod,
  PaymentStatus,
  PoliAttemptStatus,
  PoliTransactionAttempt,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OperationalAlertsService } from '../operations/operational-alerts.service';
import {
  isAllowedPaymentReturnUrl,
  PaymentsService,
  RequestingUser,
} from '../payments/payments.service';
import { PoliApiRequestError, PoliApiService } from './poli-api.service';
import { PoliInitiateTransactionResponse } from './poli-api.types';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
const ACTIVE_ATTEMPT_STATUSES: PoliAttemptStatus[] = [
  PoliAttemptStatus.pending,
  PoliAttemptStatus.payment_pending,
];

export function mapPoliProviderStatus(status: string): PoliAttemptStatus {
  switch (status.trim().toLowerCase()) {
    case 'completed':
      return PoliAttemptStatus.succeeded;
    case 'paymentpending':
      return PoliAttemptStatus.payment_pending;
    case 'cancelled':
      return PoliAttemptStatus.cancelled;
    case 'failed':
      return PoliAttemptStatus.failed;
    case 'receiptunverified':
      return PoliAttemptStatus.receipt_unverified;
    case 'timedout':
      return PoliAttemptStatus.timed_out;
    default:
      // Initiated, FinancialInstitutionSelected, EulaAccepted, InProcess and
      // Unknown are all non-terminal. An unrecognised future value is also
      // kept non-paid until POLi documents it.
      return PoliAttemptStatus.pending;
  }
}

export function extractPoliToken(navigateUrl: string): string | null {
  try {
    const url = new URL(navigateUrl);
    if (
      url.protocol !== 'https:' ||
      (!url.hostname.endsWith('.paywithpoli.com') &&
        url.hostname !== 'paywithpoli.com')
    ) {
      return null;
    }
    return url.searchParams.get('Token') ?? url.searchParams.get('token');
  } catch {
    return null;
  }
}

@Injectable()
export class PoliService {
  constructor(
    private readonly api: PoliApiService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly notifications: NotificationsService,
    private readonly alerts: OperationalAlertsService,
  ) {}

  getConfigurationStatus() {
    return this.api.getConfigurationStatus();
  }

  isAvailable() {
    return {
      available:
        this.api.getConfigurationStatus().configured &&
        this.getPublicBaseUrl(false) !== null,
    };
  }

  async initiate(user: RequestingUser, bookingId: string, returnUrl: string) {
    if (
      !isAllowedPaymentReturnUrl(
        returnUrl,
        this.configService.get<string>('NODE_ENV'),
        this.configService.get<string>('PUBLIC_WEB_URL'),
      )
    ) {
      throw new BadRequestException('Payment return URL is not allowed');
    }

    const publicBaseUrl = this.getPublicBaseUrl(true)!;
    const { payment } = await this.payments.preparePoliPayment(user, bookingId);

    const existing = await this.findActiveAttempt(payment.id);
    if (existing) {
      return this.toInitiationResponse(payment, existing);
    }

    let attempt: PoliTransactionAttempt;
    try {
      attempt = await this.prisma.poliTransactionAttempt.create({
        data: { paymentId: payment.id, returnUrl },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        const winner = await this.findActiveAttempt(payment.id);
        if (winner) return this.toInitiationResponse(payment, winner);
      }
      throw error;
    }

    let providerResponse: PoliInitiateTransactionResponse;
    try {
      providerResponse = await this.api.initiateTransaction({
        Amount: Number(payment.amount),
        CurrencyCode: 'NZD',
        MerchantReference: payment.id,
        MerchantHomepageURL: publicBaseUrl,
        SuccessURL: `${publicBaseUrl}/payments/poli/return/success`,
        FailureURL: `${publicBaseUrl}/payments/poli/return/failure`,
        CancellationURL: `${publicBaseUrl}/payments/poli/return/cancel`,
        NotificationURL: `${publicBaseUrl}/payments/poli/nudge/${attempt.id}`,
      });
    } catch (error) {
      const definitive =
        error instanceof PoliApiRequestError && error.definitive;
      await this.prisma.poliTransactionAttempt.update({
        where: { id: attempt.id },
        data: {
          ...(definitive ? { status: PoliAttemptStatus.failed } : {}),
          errorMessage:
            error instanceof Error
              ? error.message.slice(0, 1000)
              : 'POLi initiation failed',
          ...(definitive ? { completedAt: new Date() } : {}),
        },
      });
      if (definitive) {
        await this.prisma.payment.updateMany({
          where: { id: payment.id, status: PaymentStatus.pending },
          data: { status: PaymentStatus.failed },
        });
      } else {
        await this.alerts.send(
          'poli_initiation_ambiguous',
          'POLi initiation result is unknown; the attempt remains pending',
          { attemptId: attempt.id, paymentId: payment.id },
        );
      }
      throw new ServiceUnavailableException(
        definitive
          ? 'POLi rejected the payment request'
          : 'POLi initiation result is unknown; do not retry yet',
      );
    }

    if (providerResponse.Success !== true) {
      await this.failInitiation(
        attempt.id,
        payment.id,
        providerResponse.ErrorCode,
        providerResponse.ErrorMessage,
      );
      throw new BadRequestException(
        providerResponse.ErrorCode === undefined
          ? 'POLi could not start the payment'
          : `POLi could not start the payment (code ${providerResponse.ErrorCode})`,
      );
    }

    const navigateUrl = providerResponse.NavigateURL;
    const providerReference = providerResponse.TransactionRefNo;
    const token = navigateUrl ? extractPoliToken(navigateUrl) : null;
    if (!navigateUrl || !providerReference || !token) {
      await this.alerts.send(
        'poli_initiation_invalid_response',
        'POLi reported success without all required transaction fields',
        { attemptId: attempt.id, paymentId: payment.id },
      );
      throw new ServiceUnavailableException(
        'POLi returned an incomplete initiation response; do not retry yet',
      );
    }

    const updatedAttempt = await this.prisma.poliTransactionAttempt.update({
      where: { id: attempt.id },
      data: { navigateUrl, providerReference, token, errorMessage: null },
    });
    return this.toInitiationResponse(payment, updatedAttempt);
  }

  async refresh(user: RequestingUser, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { booking: true },
    });
    if (!payment || payment.method !== PaymentMethod.poli) {
      throw new NotFoundException('POLi payment not found');
    }
    if (
      payment.booking.customerId !== user.userId &&
      (!user.businessId || payment.booking.businessId !== user.businessId)
    ) {
      throw new ForbiddenException('You do not have access to this payment');
    }

    const attempt = await this.prisma.poliTransactionAttempt.findFirst({
      where: { paymentId },
      orderBy: { createdAt: 'desc' },
    });
    if (!attempt) throw new NotFoundException('POLi transaction not found');
    if (ACTIVE_ATTEMPT_STATUSES.includes(attempt.status)) {
      await this.reconcileAttempt(attempt.id, false);
    }
    return this.safeStatus(paymentId, attempt.id);
  }

  async handleNudge(attemptId: string) {
    await this.reconcileAttempt(attemptId, true);
    return { received: true };
  }

  async buildReturnUrl(token: string) {
    const attempt = await this.prisma.poliTransactionAttempt.findUnique({
      where: { token },
    });
    if (!attempt?.returnUrl) {
      throw new NotFoundException('POLi return transaction not found');
    }

    try {
      await this.reconcileAttempt(attempt.id, false);
    } catch (error) {
      await this.alerts.send(
        'poli_return_reconciliation_failed',
        error instanceof Error ? error.message : 'POLi reconciliation failed',
        { attemptId: attempt.id, paymentId: attempt.paymentId },
      );
    }

    const payment = await this.prisma.payment.findUniqueOrThrow({
      where: { id: attempt.paymentId },
    });
    const returnUrl = new URL(attempt.returnUrl);
    returnUrl.searchParams.set('provider', 'poli');
    returnUrl.searchParams.set('payment_id', payment.id);
    returnUrl.searchParams.set(
      'status',
      payment.status === PaymentStatus.paid
        ? 'success'
        : payment.status === PaymentStatus.failed
          ? 'failed'
          : payment.status === PaymentStatus.cancelled
            ? 'cancel'
            : payment.status === PaymentStatus.pending_verification
              ? 'verification'
              : 'processing',
    );
    return returnUrl.toString();
  }

  private async findActiveAttempt(paymentId: string) {
    return this.prisma.poliTransactionAttempt.findFirst({
      where: { paymentId, status: { in: ACTIVE_ATTEMPT_STATUSES } },
      orderBy: { createdAt: 'desc' },
    });
  }

  private toInitiationResponse(
    payment: { id: string; amount: Prisma.Decimal },
    attempt: {
      navigateUrl: string | null;
      providerReference: string | null;
      token: string | null;
    },
  ) {
    if (!attempt.navigateUrl || !attempt.providerReference || !attempt.token) {
      throw new ServiceUnavailableException(
        'A POLi payment is already being prepared; do not retry yet',
      );
    }
    return {
      paymentId: payment.id,
      amount: Number(payment.amount),
      checkoutUrl: attempt.navigateUrl,
    };
  }

  private getPublicBaseUrl(required: boolean): string | null {
    const value = this.configService.get<string>('PUBLIC_WEB_URL')?.trim();
    if (!value) {
      if (required)
        throw new ServiceUnavailableException(
          'PUBLIC_WEB_URL is required for POLi callbacks',
        );
      return null;
    }
    try {
      const url = new URL(value);
      if (
        url.protocol !== 'https:' ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        (url.pathname !== '/' && url.pathname !== '')
      ) {
        throw new Error('invalid');
      }
      return url.origin;
    } catch {
      if (required)
        throw new ServiceUnavailableException(
          'PUBLIC_WEB_URL must be a public HTTPS origin for POLi callbacks',
        );
      return null;
    }
  }

  private async failInitiation(
    attemptId: string,
    paymentId: string,
    errorCode?: number,
    errorMessage?: string,
  ) {
    await this.prisma.poliTransactionAttempt.update({
      where: { id: attemptId },
      data: {
        status: PoliAttemptStatus.failed,
        errorCode,
        errorMessage: errorMessage?.slice(0, 1000),
        completedAt: new Date(),
      },
    });
    await this.prisma.payment.updateMany({
      where: { id: paymentId, status: PaymentStatus.pending },
      data: { status: PaymentStatus.failed },
    });
  }

  private async reconcileAttempt(attemptId: string, fromNudge: boolean) {
    const attempt = await this.prisma.poliTransactionAttempt.findUnique({
      where: { id: attemptId },
      include: { payment: { include: { booking: true } } },
    });
    if (!attempt) throw new NotFoundException('POLi transaction not found');
    if (!attempt.token) {
      throw new ServiceUnavailableException(
        'POLi transaction token is not available yet',
      );
    }

    const response = await this.api.getTransaction(attempt.token);
    const details = response.TransactionDetails;
    const providerStatus = details?.TransactionStatusCode;
    const providerReference = details?.TransactionRefNo;
    if (!details || !providerStatus || !providerReference) {
      throw new ServiceUnavailableException(
        'POLi returned incomplete transaction details',
      );
    }
    if (
      providerReference !== attempt.providerReference ||
      (response.MerchantDetails?.MerchantReference &&
        response.MerchantDetails.MerchantReference !== attempt.paymentId)
    ) {
      await this.alerts.send(
        'poli_transaction_identity_mismatch',
        'POLi transaction identifiers did not match the local payment',
        { attemptId, paymentId: attempt.paymentId },
      );
      throw new ServiceUnavailableException(
        'POLi transaction identity could not be verified',
      );
    }

    const expectedAmount = Number(attempt.payment.amount);
    const amountPaid =
      typeof details.AmountPaid === 'number' &&
      Number.isFinite(details.AmountPaid)
        ? details.AmountPaid
        : null;
    const paymentAmountMatches =
      details.PaymentAmount === undefined ||
      (Number.isFinite(details.PaymentAmount) &&
        Math.round(details.PaymentAmount * 100) ===
          Math.round(expectedAmount * 100));

    let nextStatus = mapPoliProviderStatus(providerStatus);
    if (
      nextStatus === PoliAttemptStatus.succeeded &&
      (!paymentAmountMatches ||
        amountPaid === null ||
        Math.round(amountPaid * 100) !== Math.round(expectedAmount * 100))
    ) {
      nextStatus = PoliAttemptStatus.receipt_unverified;
      await this.alerts.send(
        'poli_amount_mismatch',
        'A completed POLi transaction did not match the expected amount',
        { attemptId, paymentId: attempt.paymentId },
      );
    }

    const effectiveStatus =
      attempt.status === PoliAttemptStatus.payment_pending &&
      nextStatus === PoliAttemptStatus.pending
        ? PoliAttemptStatus.payment_pending
        : nextStatus;
    const completedAt = ACTIVE_ATTEMPT_STATUSES.includes(effectiveStatus)
      ? null
      : details.EndDateTime
        ? new Date(details.EndDateTime)
        : new Date();

    const transitioned = await this.prisma.poliTransactionAttempt.updateMany({
      where: { id: attemptId, status: { in: ACTIVE_ATTEMPT_STATUSES } },
      data: {
        status: effectiveStatus,
        providerStatus,
        amountPaid,
        lastCheckedAt: new Date(),
        ...(fromNudge ? { notificationAt: new Date() } : {}),
        ...(completedAt && !Number.isNaN(completedAt.getTime())
          ? { completedAt }
          : {}),
      },
    });

    if (transitioned.count === 0) {
      await this.prisma.poliTransactionAttempt.update({
        where: { id: attemptId },
        data: {
          providerStatus,
          amountPaid,
          lastCheckedAt: new Date(),
          ...(fromNudge ? { notificationAt: new Date() } : {}),
        },
      });
      return;
    }

    if (effectiveStatus === PoliAttemptStatus.succeeded) {
      await this.payments.confirmPoliPayment(attempt.paymentId);
      return;
    }

    if (effectiveStatus === PoliAttemptStatus.payment_pending) {
      await this.notifications.notify(
        attempt.payment.booking.customerId,
        'POLi Payment Pending / POLi 付款处理中',
        'Your bank payment is still settling. Your booking will only be marked paid after POLi confirms completion. / 银行付款仍在结算中，只有 POLi 确认完成后预约才会标记为已支付。',
      );
      return;
    }

    if (effectiveStatus === PoliAttemptStatus.receipt_unverified) {
      const changed = await this.prisma.payment.updateMany({
        where: { id: attempt.paymentId, status: PaymentStatus.pending },
        data: { status: PaymentStatus.pending_verification },
      });
      if (changed.count === 1) {
        await this.notifications.notify(
          attempt.payment.booking.customerId,
          'POLi Payment Needs Verification / POLi 付款待核实',
          'POLi could not confirm whether the bank transfer completed. The business will reconcile it before marking it paid. / POLi 无法确认银行转账是否完成，商家核对后才会标记为已支付。',
        );
        await this.notifications.notifyBusinessManagers(
          attempt.payment.booking.businessId,
          'POLi Receipt Unverified / POLi 收款待核实',
          `Reconcile POLi transaction ${providerReference} for booking ${attempt.payment.bookingId} before confirming payment. / 请先核对预约 ${attempt.payment.bookingId} 的 POLi 交易 ${providerReference}，再确认收款。`,
        );
      }
      return;
    }

    const paymentStatus =
      effectiveStatus === PoliAttemptStatus.cancelled
        ? PaymentStatus.cancelled
        : PaymentStatus.failed;
    const changed = await this.prisma.payment.updateMany({
      where: { id: attempt.paymentId, status: PaymentStatus.pending },
      data: { status: paymentStatus },
    });
    if (changed.count === 1) {
      await this.notifications.notify(
        attempt.payment.booking.customerId,
        paymentStatus === PaymentStatus.cancelled
          ? 'POLi Payment Cancelled / POLi 付款已取消'
          : 'POLi Payment Failed / POLi 付款失败',
        paymentStatus === PaymentStatus.cancelled
          ? 'Your POLi payment was cancelled. / 您的 POLi 付款已取消。'
          : 'Your POLi payment was not completed. Please try again. / 您的 POLi 付款未完成，请重试。',
      );
    }
  }

  private async safeStatus(paymentId: string, attemptId: string) {
    const [payment, attempt] = await Promise.all([
      this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId } }),
      this.prisma.poliTransactionAttempt.findUniqueOrThrow({
        where: { id: attemptId },
      }),
    ]);
    return {
      paymentId,
      status: payment.status,
      providerStatus: attempt.providerStatus,
    };
  }
}
