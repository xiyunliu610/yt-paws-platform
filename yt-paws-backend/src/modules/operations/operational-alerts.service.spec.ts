import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OperationalAlertsService } from './operational-alerts.service';

describe('OperationalAlertsService', () => {
  const originalFetch = global.fetch;
  let loggerSpy: jest.SpyInstance;

  beforeEach(() => {
    loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    loggerSpy.mockRestore();
  });

  it('writes a structured log and posts the same safe payload to the configured webhook', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as typeof fetch;
    const config = {
      get: (key: string) => ({ NODE_ENV: 'production', ALERT_WEBHOOK_URL: 'https://alerts.example.com/hook' })[key],
    } as ConfigService;

    await new OperationalAlertsService(config).send('stripe_webhook_failed', 'Signature rejected', { eventId: 'evt_123' });

    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('stripe_webhook_failed'));
    expect(fetchMock).toHaveBeenCalledWith('https://alerts.example.com/hook', expect.objectContaining({ method: 'POST' }));
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload).toMatchObject({
      type: 'stripe_webhook_failed',
      message: 'Signature rejected',
      metadata: { eventId: 'evt_123' },
      environment: 'production',
    });
    expect(payload.occurredAt).toEqual(expect.any(String));
  });

  it('never throws when the external alert receiver is unavailable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as typeof fetch;
    const config = { get: (key: string) => key === 'ALERT_WEBHOOK_URL' ? 'https://alerts.example.com/hook' : 'production' } as ConfigService;

    await expect(new OperationalAlertsService(config).send('refund_stuck', 'Needs attention')).resolves.toBeUndefined();
    expect(loggerSpy).toHaveBeenCalledWith('Alert webhook delivery failed', expect.any(String));
  });
});
