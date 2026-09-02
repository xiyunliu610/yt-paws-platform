import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ServicesService } from './services.service';
import { Role, PricingUnit } from '@prisma/client';

function makePrisma(service: any = null) {
  return {
    service: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'service-1' }),
      update: jest.fn().mockResolvedValue({ id: 'service-1' }),
      findUnique: jest.fn().mockResolvedValue(service),
    },
  };
}

const existingService = { id: 'service-1', businessId: 'business-1', name: 'Boarding' };

describe('ServicesService', () => {
  describe('findAll', () => {
    it('shows a customer only active services, with no businessId filter', async () => {
      const prisma = makePrisma();
      await new ServicesService(prisma as any).findAll({ userId: 'customer-1', role: Role.customer, businessId: null });
      expect(prisma.service.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('scopes staff/owner/admin to their own business, including inactive listings', async () => {
      const prisma = makePrisma();
      await new ServicesService(prisma as any).findAll({ userId: 'staff-1', role: Role.staff, businessId: 'business-1' });
      expect(prisma.service.findMany).toHaveBeenCalledWith({
        where: { businessId: 'business-1' },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('returns an empty list for a staff/owner/admin user with no business', async () => {
      const prisma = makePrisma();
      const result = await new ServicesService(prisma as any).findAll({ userId: 'staff-1', role: Role.staff, businessId: null });
      expect(result).toEqual([]);
      expect(prisma.service.findMany).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('rejects a user with no business', async () => {
      const prisma = makePrisma();
      await expect(
        new ServicesService(prisma as any).create({ userId: 'u1', role: Role.owner, businessId: null }, { name: 'Grooming', price: 50 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects a blank name', async () => {
      const prisma = makePrisma();
      await expect(
        new ServicesService(prisma as any).create({ userId: 'u1', role: Role.owner, businessId: 'business-1' }, { name: '   ', price: 50 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a negative price', async () => {
      const prisma = makePrisma();
      await expect(
        new ServicesService(prisma as any).create({ userId: 'u1', role: Role.owner, businessId: 'business-1' }, { name: 'Grooming', price: -1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an invalid pricingUnit', async () => {
      const prisma = makePrisma();
      await expect(
        new ServicesService(prisma as any).create(
          { userId: 'u1', role: Role.owner, businessId: 'business-1' },
          { name: 'Grooming', price: 50, pricingUnit: 'weekly' as PricingUnit },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates the service under the caller business, ignoring any businessId in the payload', async () => {
      const prisma = makePrisma();
      await new ServicesService(prisma as any).create(
        { userId: 'u1', role: Role.owner, businessId: 'business-1' },
        { name: 'Grooming', price: 50, pricingUnit: PricingUnit.flat },
      );
      expect(prisma.service.create).toHaveBeenCalledWith({
        data: {
          businessId: 'business-1',
          name: 'Grooming',
          description: undefined,
          price: 50,
          pricingUnit: PricingUnit.flat,
          durationMinutes: undefined,
          maxConcurrentBookings: undefined,
        },
      });
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the service does not exist', async () => {
      const prisma = makePrisma(null);
      await expect(
        new ServicesService(prisma as any).update({ userId: 'u1', role: Role.owner, businessId: 'business-1' }, 'service-1', { price: 60 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('forbids an owner from a different business from updating the service', async () => {
      const prisma = makePrisma(existingService);
      await expect(
        new ServicesService(prisma as any).update({ userId: 'u1', role: Role.owner, businessId: 'business-2' }, 'service-1', { price: 60 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('forbids a user with no business at all', async () => {
      const prisma = makePrisma(existingService);
      await expect(
        new ServicesService(prisma as any).update({ userId: 'u1', role: Role.owner, businessId: null }, 'service-1', { price: 60 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects clearing the name to blank', async () => {
      const prisma = makePrisma(existingService);
      await expect(
        new ServicesService(prisma as any).update({ userId: 'u1', role: Role.owner, businessId: 'business-1' }, 'service-1', { name: '  ' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a negative price', async () => {
      const prisma = makePrisma(existingService);
      await expect(
        new ServicesService(prisma as any).update({ userId: 'u1', role: Role.owner, businessId: 'business-1' }, 'service-1', { price: -5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows the owning business to update its own service', async () => {
      const prisma = makePrisma(existingService);
      await new ServicesService(prisma as any).update(
        { userId: 'u1', role: Role.owner, businessId: 'business-1' },
        'service-1',
        { price: 60, isActive: false },
      );
      expect(prisma.service.update).toHaveBeenCalledWith({
        where: { id: 'service-1' },
        data: { price: 60, isActive: false },
      });
    });
  });
});
