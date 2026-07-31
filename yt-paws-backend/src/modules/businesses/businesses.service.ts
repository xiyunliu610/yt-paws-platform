import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface RequestingUser {
  userId: string;
  role: string;
  businessId: string | null;
}

interface UpdateBusinessInput {
  name?: string;
  region?: string;
  wechatQrCodeUrl?: string;
}

@Injectable()
export class BusinessesService {
  constructor(private prisma: PrismaService) {}

  // Backs BusinessSettingsScreen: loads the current values so the owner
  // edits an actual form, not a blank one.
  async findMine(user: RequestingUser) {
    if (!user.businessId) {
      throw new BadRequestException('Your account is not associated with a business');
    }
    const business = await this.prisma.business.findUnique({ where: { id: user.businessId } });
    if (!business) {
      throw new NotFoundException('Business not found');
    }
    return business;
  }

  async updateMine(user: RequestingUser, data: UpdateBusinessInput) {
    if (!user.businessId) {
      throw new BadRequestException('Your account is not associated with a business');
    }
    if (data.name !== undefined && !data.name.trim()) {
      throw new BadRequestException('Business name cannot be empty');
    }

    return this.prisma.business.update({
      where: { id: user.businessId },
      data: { name: data.name, region: data.region, wechatQrCodeUrl: data.wechatQrCodeUrl },
    });
  }
}
