import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { PetsService } from './pets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';

@Controller('pets')
@UseGuards(JwtAuthGuard)
export class PetsController {
  constructor(private petsService: PetsService) {}

  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      name: string;
      species?: string;
      breed?: string;
      age?: number;
      weight?: number;
      personality?: string;
      dietNotes?: string;
      isNeutered?: boolean;
    },
  ) {
    return this.petsService.create(req.user.userId, body);
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.petsService.findAllForOwner(req.user.userId);
  }

  @Get(':id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.petsService.findOneForOwner(req.user.userId, id);
  }

  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      species?: string;
      breed?: string;
      age?: number;
      weight?: number;
      personality?: string;
      dietNotes?: string;
      isNeutered?: boolean;
    },
  ) {
    return this.petsService.update(req.user.userId, id, body);
  }

  @Post(':id/health-records')
  addHealthRecord(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { type: string; date: string; nextDate?: string; notes?: string },
  ) {
    return this.petsService.addHealthRecord(req.user.userId, id, body);
  }

  @Get(':id/health-records')
  listHealthRecords(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.petsService.listHealthRecords(req.user.userId, id);
  }
}
