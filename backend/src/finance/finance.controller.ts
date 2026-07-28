import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { CreateFinanceDto } from './dto/create-finance.dto';

@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post('transaction')
  createTransaction(@Body() createFinanceDto: CreateFinanceDto) {
    return this.financeService.createTransaction(createFinanceDto);
  }

  @Get('ledger')
  getLedger(@Query('plantId') plantId: string, @Query('type') type: string) {
    return this.financeService.getLedger(plantId || 'all', type);
  }

  @Get('expenses')
  getExpenseSummary(@Query('plantId') plantId: string) {
    return this.financeService.getExpenseSummary(plantId || 'all');
  }

  @Get('cashbook')
  getCashbook(@Query('plantId') plantId: string) {
    return this.financeService.getCashbook(plantId || 'all');
  }

  @Get('outstanding')
  getOutstanding(@Query('plantId') plantId: string) {
    return this.financeService.getOutstanding(plantId || 'all');
  }
}
