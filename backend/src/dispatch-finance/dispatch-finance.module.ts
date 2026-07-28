import { Module } from '@nestjs/common';
import { DispatchFinanceController } from './dispatch-finance.controller';
import { DispatchFinanceService } from './dispatch-finance.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DispatchFinanceController],
  providers: [DispatchFinanceService]
})
export class DispatchFinanceModule {}
