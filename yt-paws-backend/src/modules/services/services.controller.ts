import { Controller, Get, Post, Patch, Body, Param, ParseUUIDPipe, UseGuards, Req } from '@nestjs/common';
import { ServicesService } from './services.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';

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
  create(@Req() req: AuthenticatedRequest, @Body() body: CreateServiceDto) {
    return this.servicesService.create(req.user, body);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  update(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateServiceDto) {
    return this.servicesService.update(req.user, id, body);
  }
}
