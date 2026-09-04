import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { PoliApiService } from './poli-api.service';
import { PoliController } from './poli.controller';
import { PoliService } from './poli.service';

@Module({
  imports: [PaymentsModule, NotificationsModule],
  controllers: [PoliController],
  providers: [PoliApiService, PoliService],
  exports: [PoliService],
})
export class PoliModule {}
