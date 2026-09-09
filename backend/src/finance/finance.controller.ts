import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { FinanceSodaService } from './finance-soda.service';
import { FinanceSalePurchaseService } from './finance-sale-purchase.service';
import { CreateFinanceDto } from './dto/create-finance.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission, RequireAnyPermission } from '../common/decorators/require-permission.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance')
export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly financeSodaService: FinanceSodaService,
    private readonly salePurchaseService: FinanceSalePurchaseService,
  ) {}

  // ─── Legacy ledger (F31) ─────────────────────────────────────────────────
  @Post('transaction')
  @RequirePermission('Finance', 'canAdd')
  createTransaction(@Body() createFinanceDto: CreateFinanceDto) {
    return this.financeService.createTransaction(createFinanceDto);
  }

  @Get('ledger')
  @RequirePermission('Finance', 'canView')
  getLedger(@Query('plantId') plantId: string, @Query('type') type: string) {
    return this.financeService.getLedger(plantId || 'all', type);
  }

  @Get('expenses')
  @RequirePermission('Finance', 'canView')
  getExpenseSummary(@Query('plantId') plantId: string) {
    return this.financeService.getExpenseSummary(plantId || 'all');
  }

  @Get('cashbook')
  @RequirePermission('Finance', 'canView')
  getCashbook(@Query('plantId') plantId: string) {
    return this.financeService.getCashbook(plantId || 'all');
  }

  @Get('outstanding')
  @RequirePermission('Finance', 'canView')
  getOutstanding(@Query('plantId') plantId: string) {
    return this.financeService.getOutstanding(plantId || 'all');
  }

  // ─── Parties ─────────────────────────────────────────────────────────────
  @Get('parties')
  @RequirePermission('Finance', 'canView')
  listParties() {
    return this.financeSodaService.listParties();
  }

  @Get('party-options')
  @RequirePermission('Finance', 'canView')
  partyOptions(@Query('excludePlantIds') excludePlantIds?: string) {
    const ids = excludePlantIds ? excludePlantIds.split(',').filter(Boolean) : [];
    return this.financeSodaService.partyOptions(ids);
  }

  @Post('parties')
  @RequirePermission('Finance', 'canAdd')
  createParty(@Body() body: any) {
    return this.financeSodaService.createParty(body);
  }

  @Patch('parties/:id')
  @RequirePermission('Finance', 'canEdit')
  updateParty(@Param('id') id: string, @Body() body: any) {
    return this.financeSodaService.updateParty(id, body);
  }

  // ─── Sodas / Deals ───────────────────────────────────────────────────────
  @Get('sodas/next-number')
  @RequirePermission('Finance', 'canView')
  nextNumber(@Query('sodaType') sodaType: 'SALE' | 'PURCHASE') {
    return this.financeSodaService.nextSodaNumber(sodaType || 'SALE').then((n) => ({ next: n }));
  }

  @Get('sodas')
  @RequirePermission('Finance', 'canView')
  listSodas(@Query('sodaType') sodaType?: string) {
    return this.financeSodaService.listSodas(sodaType);
  }

  @Post('sodas')
  @RequirePermission('Finance', 'canAdd')
  createSoda(@Body() body: any, @Req() req: any) {
    return this.financeSodaService.createSoda(body, req.user);
  }

  @Patch('sodas/:id')
  @RequirePermission('Finance', 'canEdit')
  updateSoda(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.financeSodaService.updateSoda(id, body, req.user);
  }

  @Patch('sodas/:id/payment-status')
  @RequirePermission('Finance', 'canEdit')
  updatePaymentStatus(
    @Param('id') id: string,
    @Body('paymentStatus') paymentStatus: string,
    @Req() req: any,
  ) {
    return this.financeSodaService.updatePaymentStatus(id, paymentStatus, req.user);
  }

  /** Gate Pass dropdown — Purchase sodas for IN, Sale for OUT */
  @Get('sodas/available-for-gp')
  @RequireAnyPermission(['Gate Pass', 'Finance'], 'canView')
  availableForGp(@Query('plantId') plantId: string, @Query('passType') passType: string) {
    return this.financeSodaService.availableForGatePass(plantId, passType);
  }

  // ─── Feedback 29 Sale / Purchase Report ──────────────────────────────────
  @Get('sale-purchase-report')
  @RequirePermission('Finance', 'canView')
  listSalePurchase(
    @Query('reportType') reportType: 'SALE' | 'PURCHASE',
    @Query('plantId') plantId?: string,
  ) {
    return this.salePurchaseService.listReport(reportType || 'SALE', plantId || undefined);
  }

  @Patch('sale-purchase-report/:id')
  @RequirePermission('Finance', 'canEdit')
  updateSalePurchase(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.salePurchaseService.updateLine(id, body, req.user);
  }

  @Patch('sale-purchase-report/:id/payment-status')
  @RequirePermission('Finance', 'canEdit')
  updateSalePurchasePayment(
    @Param('id') id: string,
    @Body() body: { paymentStatus: string; plantId?: string },
    @Req() req: any,
  ) {
    return this.salePurchaseService.updatePaymentStatusFromReport(
      id,
      body.paymentStatus,
      req.user,
      body.plantId,
    );
  }

  @Get('payment-status-audits')
  @RequirePermission('Finance', 'canView')
  listPaymentAudits(
    @Query('financeSodaId') financeSodaId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.salePurchaseService.listPaymentAudits(
      financeSodaId,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Post('sale-purchase-report/backfill')
  @RequirePermission('Finance', 'canEdit')
  backfillSalePurchase() {
    return this.salePurchaseService.backfillMissingLines();
  }
}
