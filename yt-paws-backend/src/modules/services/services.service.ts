import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

interface RequestingUser {
  userId: string;
  role: string;
  businessId: string | null;
}

interface CreateServiceInput {
  name: string;
  description?: string;
  price: number;
  durationMinutes?: number;
}

interface UpdateServiceInput extends Partial<CreateServiceInput> {
  isActive?: boolean;
}

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  // US-03.1: customers only browse published (active) services; an
  // owner/staff managing their own business's listing needs to see
  // delisted ones too, so they can re-publish them.
  async findAll(user: RequestingUser) {
    if (user.role === Role.customer) {
      return this.prisma.service.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });
    }

    if (!user.businessId) {
      return [];
    }
    return this.prisma.service.findMany({
      where: { businessId: user.businessId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(user: RequestingUser, data: CreateServiceInput) {
    if (!user.businessId) {
      throw new ForbiddenException('Only a business owner can create services');
    }
    if (!data.name?.trim()) {
      throw new BadRequestException('Service name is required');
    }
    if (data.price === undefined || data.price < 0) {
      throw new BadRequestException('Service price must be a non-negative number');
    }

    return this.prisma.service.create({
      data: {
        businessId: user.businessId,
        name: data.name,
        description: data.description,
        price: data.price,
        durationMinutes: data.durationMinutes,
      },
    });
  }

  async update(user: RequestingUser, serviceId: string, data: UpdateServiceInput) {
    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    if (!user.businessId || service.businessId !== user.businessId) {
      throw new ForbiddenException('You do not have access to this service');
    }
    if (data.name !== undefined && !data.name.trim()) {
      throw new BadRequestException('Service name cannot be empty');
    }
    if (data.price !== undefined && data.price < 0) {
      throw new BadRequestException('Service price must be a non-negative number');
    }

    return this.prisma.service.update({ where: { id: serviceId }, data });
  }
}
