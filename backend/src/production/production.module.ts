import { Module } from '@nestjs/common';
import { ProductionService } from './production.service';
import { ProductionController } from './production.controller';
import { WastageRecordService } from './wastage-record.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [PrismaModule, InventoryModule],
  providers: [ProductionService, WastageRecordService],
  controllers: [ProductionController],
  exports: [WastageRecordService],
})
export class ProductionModule {}
