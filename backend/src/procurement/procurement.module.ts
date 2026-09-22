import { Module } from '@nestjs/common';
import { ProcurementController } from './procurement.controller';
import { ProcurementService } from './procurement.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, InventoryModule, AuthModule],
  controllers: [ProcurementController],
  providers: [ProcurementService],
  exports: [ProcurementService],
})
export class ProcurementModule {}
