import { Module } from '@nestjs/common';
import { GatePassController } from './gate-pass.controller';
import { GatePassService } from './gate-pass.service';
import { GatePassCronService } from './gate-pass-cron.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [PrismaModule, InventoryModule, ProductsModule],
  controllers: [GatePassController],
  providers: [GatePassService, GatePassCronService],
})
export class GatePassModule {}