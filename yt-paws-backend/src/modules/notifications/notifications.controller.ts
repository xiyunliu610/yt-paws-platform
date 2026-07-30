import { Controller, Get, Patch, Param, ParseUUIDPipe, Body, UseGuards, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { RegisterDeviceDto } from './dto/notification.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get('mine')
  findMine(@Req() req: AuthenticatedRequest) {
    return this.notificationsService.findMine(req.user.userId);
  }

  @Patch(':id/read')
  markRead(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.markRead(req.user.userId, id);
  }

  @Patch('register-device')
  registerDevice(@Req() req: AuthenticatedRequest, @Body() body: RegisterDeviceDto) {
    return this.notificationsService.registerDevice(req.user.userId, body.pushToken);
  }

  @Patch('unregister-device')
  unregisterDevice(@Req() req: AuthenticatedRequest) {
    return this.notificationsService.unregisterDevice(req.user.userId);
  }
}
