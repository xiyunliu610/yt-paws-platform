import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ServicesService } from './services.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';

@Controller('services')
@UseGuards(JwtAuthGuard)
export class ServicesController {
  constructor(private servicesService: ServicesService) {}

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.servicesService.findAll(req.user);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  create(
    @Req() req: AuthenticatedRequest,
    @Body() body: { name: string; description?: string; price: number; durationMinutes?: number },
  ) {
    return this.servicesService.create(req.user, body);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      price?: number;
      durationMinutes?: number;
      isActive?: boolean;
    },
  ) {
    return this.servicesService.update(req.user, id, body);
  }
}
