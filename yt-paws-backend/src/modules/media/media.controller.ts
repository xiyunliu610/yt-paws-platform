import { Body, Controller, ForbiddenException, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { CreateUploadUrlDto } from './dto/media.dto';
import { MediaService } from './media.service';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('upload-url')
  createUploadUrl(@Req() req: AuthenticatedRequest, @Body() body: CreateUploadUrlDto) {
    const managers = ['owner', 'admin'];
    if (body.purpose === 'wechat-qr' && !managers.includes(req.user.role)) {
      throw new ForbiddenException('Only a business manager can upload a WeChat QR code');
    }
    if (body.purpose === 'report' && ![...managers, 'staff'].includes(req.user.role)) {
      throw new ForbiddenException('Only business staff can upload report media');
    }
    if (body.purpose === 'pet' && req.user.role !== 'customer') {
      throw new ForbiddenException('Only customers can upload pet photos');
    }
    return this.media.createUploadUrl(req.user.userId, body.purpose, body.contentType);
  }
}
