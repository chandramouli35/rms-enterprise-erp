import { Module, forwardRef } from '@nestjs/common';
import { GatePassController } from './gate-pass.controller';
import { GatePassService } from './gate-pass.service';
import { GatePassCronService } from './gate-pass-cron.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ProductsModule } from '../products/products.module';
import { FinanceModule } from '../finance/finance.module';
import { ProcurementModule } from '../procurement/procurement.module';

@Module({
  imports: [
    PrismaModule,
    InventoryModule,
    ProductsModule,
    forwardRef(() => FinanceModule),
    ProcurementModule,
  ],
  controllers: [GatePassController],
  providers: [GatePassService, GatePassCronService],
})
export class GatePassModule {}
