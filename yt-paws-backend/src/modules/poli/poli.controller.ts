import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InitiatePoliDto } from './dto/poli.dto';
import { PoliService } from './poli.service';

@Controller('payments/poli')
export class PoliController {
  constructor(private readonly poliService: PoliService) {}

  @Get('availability')
  @UseGuards(JwtAuthGuard)
  availability() {
    return this.poliService.isAvailable();
  }

  // No Nudge payload is trusted as payment proof. This route uses the local
  // attempt id to make an authenticated GetTransaction call back to POLi.
  @Post('nudge/:attemptId')
  @HttpCode(200)
  handleNudge(@Param('attemptId', ParseUUIDPipe) attemptId: string) {
    return this.poliService.handleNudge(attemptId);
  }

  @Get('return/:outcome')
  async handleReturn(
    @Query() query: Record<string, string | string[] | undefined>,
    @Res() response: Response,
  ) {
    const rawToken = query.token ?? query.Token;
    const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
    if (!token) throw new BadRequestException('Missing POLi transaction token');
    response.redirect(302, await this.poliService.buildReturnUrl(token));
  }

  @Post(':bookingId')
  @UseGuards(JwtAuthGuard)
  initiate(
    @Req() req: AuthenticatedRequest,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Body() body: InitiatePoliDto,
  ) {
    return this.poliService.initiate(req.user, bookingId, body.returnUrl);
  }

  @Get(':paymentId/status')
  @UseGuards(JwtAuthGuard)
  refresh(
    @Req() req: AuthenticatedRequest,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
  ) {
    return this.poliService.refresh(req.user, paymentId);
  }
}
