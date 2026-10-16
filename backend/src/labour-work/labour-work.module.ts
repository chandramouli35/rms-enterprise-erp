import { Module } from '@nestjs/common';
import { LabourWorkService } from './labour-work.service';
import { LabourWorkController } from './labour-work.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [PrismaModule, InventoryModule],
  controllers: [LabourWorkController],
  providers: [LabourWorkService],
  exports: [LabourWorkService],
})
export class LabourWorkModule {}
