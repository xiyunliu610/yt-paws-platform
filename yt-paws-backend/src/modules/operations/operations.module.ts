import { Global, Module } from '@nestjs/common';
import { OperationalAlertsService } from './operational-alerts.service';
import { RefundMonitorService } from './refund-monitor.service';

@Global()
@Module({ providers: [OperationalAlertsService, RefundMonitorService], exports: [OperationalAlertsService] })
export class OperationsModule {}
