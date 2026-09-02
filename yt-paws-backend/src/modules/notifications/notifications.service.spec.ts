import { NotificationsService } from './notifications.service';

describe('NotificationsService push receipts', () => {
  afterEach(() => jest.restoreAllMocks());

  it('stores and sends only the recipient language', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ locale: 'zh' }) },
      notification: { create: jest.fn().mockResolvedValue({ id: 'notification-1' }) },
      pushDevice: { findMany: jest.fn().mockResolvedValue([]) },
    };
    await new NotificationsService(prisma as any).notify(
      'user-1', 'Payment Successful / 支付成功', 'Paid. / 已付款。',
    );
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', title: '支付成功', body: '已付款。' },
    });
  });

  it('removes a device when Expo reports DeviceNotRegistered', async () => {
    const ticket = { id: 'ticket-row', deviceId: 'device-1', expoTicketId: 'expo-1', attempts: 0 };
    const prisma = {
      pushTicket: {
        findMany: jest.fn().mockResolvedValue([ticket]),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      pushDevice: { delete: jest.fn().mockResolvedValue({}) },
    };
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({ data: { 'expo-1': { status: 'error', details: { error: 'DeviceNotRegistered' } } } }),
    } as Response);
    const service = new NotificationsService(prisma as any);
    await service.reconcilePushReceipts();
    expect(prisma.pushDevice.delete).toHaveBeenCalledWith({ where: { id: 'device-1' } });
  });

  it('backs off transient receipt failures and eventually marks them failed', async () => {
    const ticket = { id: 'ticket-row', deviceId: 'device-1', expoTicketId: 'expo-1', attempts: 3 };
    const prisma = {
      pushTicket: {
        findMany: jest.fn().mockResolvedValue([ticket]),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn(),
      },
      pushDevice: { delete: jest.fn() },
    };
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({ data: { 'expo-1': { status: 'error', details: { error: 'MessageTooBig' } } } }),
    } as Response);
    await new NotificationsService(prisma as any).reconcilePushReceipts();
    expect(prisma.pushTicket.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ attempts: 4, status: 'failed', error: 'MessageTooBig' }),
    }));
  });
});
