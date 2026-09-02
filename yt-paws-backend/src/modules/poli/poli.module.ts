import { Module } from '@nestjs/common';
import { PoliController } from './poli.controller';
import { PoliService } from './poli.service';

@Module({
  controllers: [PoliController],
  providers: [PoliService],
  exports: [PoliService],
})
export class PoliModule {}
