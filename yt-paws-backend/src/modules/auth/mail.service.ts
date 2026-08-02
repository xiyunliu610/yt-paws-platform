import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  constructor(private readonly config: ConfigService) {}

  async sendPasswordReset(email: string, resetUrl: string) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>('MAIL_FROM');
    if (!apiKey || !from) {
      if (this.config.get<string>('NODE_ENV') === 'production') {
        throw new ServiceUnavailableException('Password reset email is temporarily unavailable');
      }
      return;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [email],
        subject: 'Reset your Y&T Paws password',
        html: `<p>We received a request to reset your Y&amp;T Paws password.</p><p><a href="${resetUrl}">Reset password</a></p><p>This link expires in 30 minutes and can be used once. If you did not request it, ignore this email.</p>`,
      }),
    });
    if (!response.ok) throw new ServiceUnavailableException('Password reset email is temporarily unavailable');
  }
}
