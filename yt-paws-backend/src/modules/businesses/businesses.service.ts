import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface RequestingUser {
  userId: string;
  role: string;
  businessId: string | null;
}

interface UpdateBusinessInput {
  name?: string;
  // null clears the field; undefined leaves it unchanged — Prisma's update
  // treats them differently (null -> SET column = NULL, undefined -> don't
  // touch the column), so this distinction has to survive from the DTO
  // through to here.
  region?: string | null;
  wechatQrCodeUrl?: string | null;
  maxConcurrentBookings?: number | null;
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
      data: { name: data.name, region: data.region, wechatQrCodeUrl: data.wechatQrCodeUrl, maxConcurrentBookings: data.maxConcurrentBookings },
    });
  }
}
