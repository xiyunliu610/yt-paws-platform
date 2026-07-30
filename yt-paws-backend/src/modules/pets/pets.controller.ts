import { Controller, Get, Post, Patch, Body, Param, ParseUUIDPipe, UseGuards, Req } from '@nestjs/common';
import { PetsService } from './pets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { CreateHealthRecordDto, CreatePetDto, UpdatePetDto } from './dto/pet.dto';

@Controller('pets')
@UseGuards(JwtAuthGuard)
export class PetsController {
  constructor(private petsService: PetsService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: CreatePetDto) {
    return this.petsService.create(req.user.userId, body);
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.petsService.findAllForOwner(req.user.userId);
  }

  @Get(':id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.petsService.findOneForOwner(req.user.userId, id);
  }

  @Patch(':id')
  update(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() body: UpdatePetDto) {
    return this.petsService.update(req.user.userId, id, body);
  }

  @Post(':id/health-records')
  addHealthRecord(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreateHealthRecordDto,
  ) {
    return this.petsService.addHealthRecord(req.user.userId, id, body);
  }

  @Get(':id/health-records')
  listHealthRecords(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.petsService.listHealthRecords(req.user.userId, id);
  }
}
