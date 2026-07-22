import { Controller, Get, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Get('mine')
  findMine(@Req() req: AuthenticatedRequest) {
    return this.bookingsService.findMine(req.user);
  }

  @Patch(':id/assign')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  assign(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { staffId: string },
  ) {
    return this.bookingsService.assignStaff(req.user, id, body.staffId);
  }
}
