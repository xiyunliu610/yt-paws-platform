import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { MailService } from './mail.service';

describe('MailService', () => {
  const alerts = { send: jest.fn().mockResolvedValue(undefined) };
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });

  it('posts a password-reset message to Resend', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as typeof fetch;
    const config = { get: (key: string) => ({ RESEND_API_KEY: 're_test', MAIL_FROM: 'Y&T Paws <support@example.com>' })[key] };
    const service = new MailService(config as ConfigService, alerts as any);

    await service.sendPasswordReset('customer@example.com', 'https://api.example.com/reset-password?token=safe');

    expect(fetchMock).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({ method: 'POST' }));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ to: ['customer@example.com'], subject: 'Reset your Y&T Paws password' });
    expect(body.html).toContain('https://api.example.com/reset-password?token=safe');
  });

  it('fails closed in production when mail is unconfigured or rejected', async () => {
    const missing = new MailService({ get: (key: string) => key === 'NODE_ENV' ? 'production' : undefined } as ConfigService, alerts as any);
    await expect(missing.sendPasswordReset('a@example.com', 'https://example.com')).rejects.toBeInstanceOf(ServiceUnavailableException);

    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as typeof fetch;
    const rejected = new MailService({ get: (key: string) => ({ RESEND_API_KEY: 're_test', MAIL_FROM: 'from@example.com', NODE_ENV: 'production' })[key] } as ConfigService, alerts as any);
    await expect(rejected.sendPasswordReset('a@example.com', 'https://example.com')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
