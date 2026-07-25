import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { PetsModule } from './modules/pets/pets.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { ServicesModule } from './modules/services/services.module';
import { BusinessesModule } from './modules/businesses/businesses.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    PetsModule,
    BookingsModule,
    ServicesModule,
    BusinessesModule,
    PaymentsModule,
    ReportsModule,
  ],
})
export class AppModule {}