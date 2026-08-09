import { NotificationsService } from './notifications.service';

describe('NotificationsService push receipts', () => {
  afterEach(() => jest.restoreAllMocks());

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
