import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface RequestingUser {
  userId: string;
  role: string;
  businessId: string | null;
}

@Injectable()
export class BusinessesService {
  constructor(private prisma: PrismaService) {}

  async updateMine(user: RequestingUser, data: { wechatQrCodeUrl?: string }) {
    if (!user.businessId) {
      throw new BadRequestException('Your account is not associated with a business');
    }

    return this.prisma.business.update({
      where: { id: user.businessId },
      data: { wechatQrCodeUrl: data.wechatQrCodeUrl },
    });
  }
}
