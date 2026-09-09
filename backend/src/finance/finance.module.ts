import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { FinanceSodaService } from './finance-soda.service';
import { FinanceSalePurchaseService } from './finance-sale-purchase.service';
import { FinanceLedgerService } from './finance-ledger.service';
import { FinanceController } from './finance.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FinanceController],
  providers: [
    FinanceService,
    FinanceSodaService,
    FinanceSalePurchaseService,
    FinanceLedgerService,
  ],
  exports: [FinanceSodaService, FinanceSalePurchaseService, FinanceLedgerService],
})
export class FinanceModule {}
