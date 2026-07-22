import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(
    @Body() body: { email: string; password: string; name: string; phone?: string },
  ) {
    return this.authService.register(body.email, body.password, body.name, body.phone);
  }

  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('register-business')
  registerBusiness(
    @Body()
    body: { businessName: string; email: string; password: string; name: string; phone?: string },
  ) {
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
  createStaff(
    @Req() req: AuthenticatedRequest,
    @Body() body: { email: string; name: string; phone?: string },
  ) {
    return this.authService.createStaff(req.user.businessId, body.email, body.name, body.phone);
  }
}
