import { Controller, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';

@Controller('businesses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BusinessesController {
  constructor(private businessesService: BusinessesService) {}

  @Patch('me')
  @Roles('owner', 'admin')
  updateMine(@Req() req: AuthenticatedRequest, @Body() body: { wechatQrCodeUrl?: string }) {
    return this.businessesService.updateMine(req.user, body);
  }
}
