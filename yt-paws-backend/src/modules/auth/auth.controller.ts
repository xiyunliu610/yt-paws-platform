import { Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import type { Request } from 'express';
import {
  ChangePasswordDto,
  CreateStaffDto,
  DeleteAccountDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterBusinessDto,
  RegisterDto,
  ResetPasswordDto,
  RefreshSessionDto,
  UpdateStaffStatusDto,
  UpdateStaffCapacityDto,
  UpdateLocaleDto,
} from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.authService.register(body.email, body.password, body.name, body.phone, body.deviceName, body.locale);
  }

  @Post('login')
  login(@Body() body: LoginDto, @Req() req: Request) {
    return this.authService.login(body.email, body.password, this.clientIp(req), body.deviceName);
  }

  @Post('refresh')
  refresh(@Body() body: RefreshSessionDto) {
    return this.authService.refreshSession(body.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Req() req: AuthenticatedRequest) {
    return this.authService.logout(req.user.userId, req.user.sessionId);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  sessions(@Req() req: AuthenticatedRequest) {
    return this.authService.listSessions(req.user.userId, req.user.sessionId);
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  revokeSession(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.authService.revokeSession(req.user.userId, id);
  }

  @Patch('locale')
  @UseGuards(JwtAuthGuard)
  updateLocale(@Req() req: AuthenticatedRequest, @Body() body: UpdateLocaleDto) {
    return this.authService.updateLocale(req.user.userId, body.locale);
  }

  @Post('forgot-password')
  forgotPassword(@Body() body: ForgotPasswordDto, @Req() req: Request) {
    return this.authService.forgotPassword(body.email, this.clientIp(req));
  }

  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(@Req() req: AuthenticatedRequest, @Body() body: ChangePasswordDto) {
    return this.authService.changePassword(req.user.userId, body.currentPassword, body.newPassword);
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  deleteAccount(@Req() req: AuthenticatedRequest, @Body() body: DeleteAccountDto) {
    return this.authService.deleteAccount(req.user.userId, body.password);
  }

  @Post('register-business')
  registerBusiness(@Body() body: RegisterBusinessDto) {
    return this.authService.registerBusiness(
      body.businessName,
      body.email,
      body.password,
      body.name,
      body.phone,
    );
  }

  @Post('staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  createStaff(@Req() req: AuthenticatedRequest, @Body() body: CreateStaffDto) {
    return this.authService.createStaff(req.user.businessId, body.email, body.name, body.phone);
  }

  @Get('staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  listStaff(@Req() req: AuthenticatedRequest) {
    return this.authService.listStaff(req.user.businessId);
  }

  @Patch('staff/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  updateStaffStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateStaffStatusDto,
  ) {
    return this.authService.updateStaffStatus(req.user, id, body.isActive);
  }

  @Patch('staff/:id/capacity')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  updateStaffCapacity(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateStaffCapacityDto,
  ) {
    return this.authService.updateStaffCapacity(req.user, id, body.maxConcurrentBookings ?? null);
  }

  private clientIp(req: Request) {
    const forwarded = req.headers['x-forwarded-for'];
    return (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0])?.trim() || req.ip || 'unknown';
  }
}
