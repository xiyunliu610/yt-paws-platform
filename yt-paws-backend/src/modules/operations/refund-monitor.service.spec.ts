import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { OperationalAlertsService } from './operational-alerts.service';
import { RefundMonitorService } from './refund-monitor.service';

describe('RefundMonitorService', () => {
  const payment = { id: 'payment-1', bookingId: 'booking-1', updatedAt: new Date('2026-08-01T00:00:00Z') };

  it('alerts once for a stale refund and can alert again after it resolves then becomes stale again', async () => {
    const findMany = jest.fn()
      .mockResolvedValueOnce([payment])
      .mockResolvedValueOnce([payment])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([payment]);
    const alerts = { send: jest.fn().mockResolvedValue(undefined) };
    const service = new RefundMonitorService(
      { payment: { findMany } } as unknown as PrismaService,
      alerts as unknown as OperationalAlertsService,
      { get: () => 'test' } as unknown as ConfigService,
    );

    await service.check();
    await service.check();
    expect(alerts.send).toHaveBeenCalledTimes(1);
    await service.check();
    await service.check();
    expect(alerts.send).toHaveBeenCalledTimes(2);
    expect(alerts.send).toHaveBeenLastCalledWith('refund_stuck', expect.any(String), payment);
  });

  it('does not start the interval in the test environment', () => {
    const intervalSpy = jest.spyOn(global, 'setInterval');
    const service = new RefundMonitorService(
      { payment: { findMany: jest.fn() } } as unknown as PrismaService,
      { send: jest.fn() } as unknown as OperationalAlertsService,
      { get: () => 'test' } as unknown as ConfigService,
    );
    service.onModuleInit();
    expect(intervalSpy).not.toHaveBeenCalled();
    intervalSpy.mockRestore();
  });
});
