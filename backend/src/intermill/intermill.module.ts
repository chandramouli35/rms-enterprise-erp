import { Module } from '@nestjs/common';
import { IntermillService } from './intermill.service';
import { IntermillController } from './intermill.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [PrismaModule, InventoryModule],
  controllers: [IntermillController],
  providers: [IntermillService],
})
export class IntermillModule {}
