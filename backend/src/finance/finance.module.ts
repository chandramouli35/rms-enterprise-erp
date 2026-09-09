import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { FinanceSodaService } from './finance-soda.service';
import { FinanceSalePurchaseService } from './finance-sale-purchase.service';
import { FinanceController } from './finance.controller';

@Module({
  controllers: [FinanceController],
  providers: [FinanceService, FinanceSodaService, FinanceSalePurchaseService],
  exports: [FinanceSodaService, FinanceSalePurchaseService],
})
export class FinanceModule {}
