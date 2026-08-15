import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BusinessesService } from './businesses.service';

function makePrisma(
  business: unknown = { id: 'business-1', name: 'Y&T Paws' },
) {
  return {
    business: {
      findUnique: jest.fn().mockResolvedValue(business),
      update: jest.fn().mockResolvedValue(business),
    },
  };
}

const owner = { userId: 'owner-1', role: 'owner', businessId: 'business-1' };

describe('BusinessesService', () => {
  describe('findMine', () => {
    it('rejects a user who is not associated with a business', async () => {
      const prisma = makePrisma();

      await expect(
        new BusinessesService(prisma as any).findMine({
          ...owner,
          businessId: null,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.business.findUnique).not.toHaveBeenCalled();
    });

    it('loads only the business associated with the caller', async () => {
      const prisma = makePrisma();

      await new BusinessesService(prisma as any).findMine(owner);

      expect(prisma.business.findUnique).toHaveBeenCalledWith({
        where: { id: 'business-1' },
      });
    });

    it('throws NotFoundException when the associated business no longer exists', async () => {
      const prisma = makePrisma(null);

      await expect(
        new BusinessesService(prisma as any).findMine(owner),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMine', () => {
    it('rejects a user who is not associated with a business', async () => {
      const prisma = makePrisma();

      await expect(
        new BusinessesService(prisma as any).updateMine(
          { ...owner, businessId: null },
          { name: 'New name' },
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.business.update).not.toHaveBeenCalled();
    });

    it('rejects a whitespace-only business name', async () => {
      const prisma = makePrisma();

      await expect(
        new BusinessesService(prisma as any).updateMine(owner, { name: '   ' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.business.update).not.toHaveBeenCalled();
    });

    it('updates the caller business and preserves null-versus-undefined fields', async () => {
      const prisma = makePrisma();

      await new BusinessesService(prisma as any).updateMine(owner, {
        name: 'Y&T Paws Auckland',
        region: null,
        wechatQrCodeUrl: undefined,
        maxConcurrentBookings: null,
      });

      expect(prisma.business.update).toHaveBeenCalledWith({
        where: { id: 'business-1' },
        data: {
          name: 'Y&T Paws Auckland',
          region: null,
          wechatQrCodeUrl: undefined,
          maxConcurrentBookings: null,
        },
      });
    });
  });
});
