import { Module } from '@nestjs/common';
import { TransfersService } from './transfers.service';
import { TransfersController } from './transfers.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [PrismaModule, InventoryModule],
  controllers: [TransfersController],
  providers: [TransfersService],
})
export class TransfersModule {}
