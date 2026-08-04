import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OperationalAlertsService } from './operational-alerts.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RefundMonitorService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private alerted = new Set<string>();
  constructor(private readonly prisma: PrismaService, private readonly alerts: OperationalAlertsService, private readonly config: ConfigService) {}

  onModuleInit() {
    if (this.config.get('NODE_ENV') === 'test') return;
    this.timer = setInterval(() => void this.check(), 15 * 60 * 1000);
    this.timer.unref();
    void this.check();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  async check() {
    const stale = await this.prisma.payment.findMany({
      where: { status: 'refund_pending', updatedAt: { lt: new Date(Date.now() - 30 * 60 * 1000) } },
      select: { id: true, bookingId: true, updatedAt: true },
    });
    for (const payment of stale) {
      if (this.alerted.has(payment.id)) continue;
      this.alerted.add(payment.id);
      await this.alerts.send('refund_stuck', 'A refund has remained pending for more than 30 minutes', payment);
    }
    const active = new Set(stale.map((item) => item.id));
    this.alerted = new Set([...this.alerted].filter((id) => active.has(id)));
  }
}
