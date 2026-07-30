import { Controller, Get, Post, Param, ParseUUIDPipe, Body, UseGuards, Req } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { CreateReportDto } from './dto/report.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Post(':bookingId')
  create(
    @Req() req: AuthenticatedRequest,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Body() body: CreateReportDto,
  ) {
    return this.reportsService.create(req.user, bookingId, body);
  }

  @Get(':bookingId')
  findForBooking(@Req() req: AuthenticatedRequest, @Param('bookingId', ParseUUIDPipe) bookingId: string) {
    return this.reportsService.findForBooking(req.user, bookingId);
  }
}
