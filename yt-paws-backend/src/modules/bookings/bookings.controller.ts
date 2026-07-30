import { Controller, Get, Post, Patch, Param, ParseUUIDPipe, Body, UseGuards, Req } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { AssignStaffDto, CreateBookingDto, UpdateBookingStatusDto } from './dto/booking.dto';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Get('mine')
  findMine(@Req() req: AuthenticatedRequest) {
    return this.bookingsService.findMine(req.user);
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: CreateBookingDto) {
    return this.bookingsService.create(req.user, body);
  }

  @Patch(':id/cancel')
  cancel(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.bookingsService.cancel(req.user, id);
  }

  @Patch(':id/assign')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  assign(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() body: AssignStaffDto) {
    return this.bookingsService.assignStaff(req.user, id, body.staffId);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  updateStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateStatus(req.user, id, body.status);
  }
}
