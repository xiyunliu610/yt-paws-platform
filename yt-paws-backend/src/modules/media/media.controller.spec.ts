import { ForbiddenException } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

describe('MediaController upload authorization', () => {
  const media = {
    createUploadUrl: jest.fn().mockResolvedValue({ uploadUrl: 'signed', publicUrl: 'protected' }),
    createReadUrl: jest.fn().mockResolvedValue('signed-read'),
  };
  const controller = new MediaController(media as unknown as MediaService);
  const req = (role: string) => ({ user: { userId: 'user-id', role, businessId: null, email: 'x@example.com', mustChangePassword: false, sessionId: 'session' } }) as any;

  it('allows only the appropriate role for each media purpose', async () => {
    await expect(controller.createUploadUrl(req('customer'), { purpose: 'pet', contentType: 'image/jpeg', size: 100 })).resolves.toBeDefined();
    await expect(controller.createUploadUrl(req('staff'), { purpose: 'report', contentType: 'image/jpeg', size: 100 })).resolves.toBeDefined();
    await expect(controller.createUploadUrl(req('owner'), { purpose: 'wechat-qr', contentType: 'image/png', size: 100 })).resolves.toBeDefined();
  });

  it('redirects an authorized media read to a short-lived signed URL', async () => {
    await expect(controller.read(req('customer'), 'encoded-key')).resolves.toEqual({ url: 'signed-read' });
    expect(media.createReadUrl).toHaveBeenCalledWith(req('customer').user, 'encoded-key');
  });

  it('rejects cross-purpose uploads', () => {
    expect(() => controller.createUploadUrl(req('customer'), { purpose: 'report', contentType: 'image/jpeg', size: 100 })).toThrow(ForbiddenException);
    expect(() => controller.createUploadUrl(req('staff'), { purpose: 'pet', contentType: 'image/jpeg', size: 100 })).toThrow(ForbiddenException);
    expect(() => controller.createUploadUrl(req('customer'), { purpose: 'wechat-qr', contentType: 'image/png', size: 100 })).toThrow(ForbiddenException);
  });
});
