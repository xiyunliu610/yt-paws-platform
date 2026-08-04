import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OperationalAlertsService {
  private readonly logger = new Logger(OperationalAlertsService.name);
  constructor(private readonly config: ConfigService) {}

  async send(type: string, message: string, metadata: Record<string, unknown> = {}) {
    const payload = { type, message, metadata, environment: this.config.get('NODE_ENV') ?? 'development', occurredAt: new Date().toISOString() };
    this.logger.error(JSON.stringify(payload));
    const url = this.config.get<string>('ALERT_WEBHOOK_URL');
    if (!url) return;
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) this.logger.error(`Alert webhook returned ${response.status}`);
    } catch (error) {
      this.logger.error('Alert webhook delivery failed', error instanceof Error ? error.stack : String(error));
    }
  }
}
