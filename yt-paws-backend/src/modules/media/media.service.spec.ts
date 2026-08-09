import { ForbiddenException } from '@nestjs/common';
import { MediaService } from './media.service';

describe('MediaService protected reads', () => {
  const key = 'pet/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.jpg';
  const encoded = Buffer.from(key).toString('base64url');
  const url = `https://api.example.com/media/files/${encoded}`;
  const config = { get: (name: string) => ({
    OBJECT_STORAGE_BUCKET: 'private-bucket', PUBLIC_WEB_URL: 'https://api.example.com',
    OBJECT_STORAGE_REGION: 'ap-southeast-2', OBJECT_STORAGE_ACCESS_KEY_ID: 'test',
    OBJECT_STORAGE_SECRET_ACCESS_KEY: 'test-secret',
  } as Record<string, string>)[name] };

  it('allows the pet owner and returns a short-lived signed object URL', async () => {
    const prisma = {
      pet: { findFirst: jest.fn().mockResolvedValue({ ownerId: 'owner', bookings: [] }) },
      dailyReport: { findFirst: jest.fn() }, business: { findFirst: jest.fn() },
    };
    const service = new MediaService(config as any, prisma as any);
    await expect(service.createReadUrl({ userId: 'owner', role: 'customer', businessId: null }, encoded))
      .resolves.toContain('private-bucket');
    expect(prisma.pet.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { photoUrl: url } }));
  });

  it('denies an unrelated customer', async () => {
    const prisma = {
      pet: { findFirst: jest.fn().mockResolvedValue({ ownerId: 'owner', bookings: [] }) },
      dailyReport: { findFirst: jest.fn() }, business: { findFirst: jest.fn() },
    };
    const service = new MediaService(config as any, prisma as any);
    await expect(service.createReadUrl({ userId: 'other', role: 'customer', businessId: null }, encoded))
      .rejects.toBeInstanceOf(ForbiddenException);
  });
});
