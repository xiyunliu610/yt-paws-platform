import { Controller, Post, Patch, Get, Param, ParseUUIDPipe, Body, Req, Headers, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { InitiateStripeDto, RefundPaymentDto } from './dto/payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  // Must be declared before 'stripe/:bookingId' — Nest/Express match routes
  // in registration order, so the parameterized route would otherwise treat
  // "webhook" as the bookingId and hit the guarded handler instead.
  //
  // Called directly by Stripe's servers, not the app, so there's no JWT to
  // check here — request authenticity comes from the signature instead.
  @Post('stripe/webhook')
  handleStripeWebhook(
    @Req() req: Request & { rawBody: Buffer },
    @Headers('stripe-signature') signature: string,
  ) {
    return this.paymentsService.handleStripeWebhook(req.rawBody, signature);
  }

  @Post('stripe/:bookingId')
  @UseGuards(JwtAuthGuard)
  initiateStripe(
    @Req() req: AuthenticatedRequest,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Body() body: InitiateStripeDto,
  ) {
    return this.paymentsService.initiateStripe(req.user, bookingId, body.returnUrl);
  }

  @Post('wechat/:bookingId')
  @UseGuards(JwtAuthGuard)
  initiateWechat(@Req() req: AuthenticatedRequest, @Param('bookingId', ParseUUIDPipe) bookingId: string) {
    return this.paymentsService.initiateWechat(req.user, bookingId);
  }

  @Patch(':id/mark-paid')
  @UseGuards(JwtAuthGuard)
  markWechatPaid(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.markWechatPaid(req.user, id);
  }

  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  verifyWechatPayment(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.verifyWechatPayment(req.user, id);
  }

  @Patch(':id/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  refundPayment(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RefundPaymentDto,
  ) {
    return this.paymentsService.refundPayment(req.user, id, body.reason);
  }

  @Post(':id/reconcile-refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  reconcileRefund(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.reconcileRefund(req.user, id);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  findMine(@Req() req: AuthenticatedRequest) {
    return this.paymentsService.findMine(req.user);
  }

  @Get('business')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  findForBusiness(@Req() req: AuthenticatedRequest) {
    return this.paymentsService.findForBusiness(req.user);
  }

  // Declared after 'mine'/'business' so those literal segments aren't
  // captured as :id by this route.
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.findOne(req.user, id);
  }
}
