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
  ForbiddenException,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { FinanceSodaService } from './finance-soda.service';
import { FinanceSalePurchaseService } from './finance-sale-purchase.service';
import { FinanceLedgerService } from './finance-ledger.service';
import { CreateFinanceDto } from './dto/create-finance.dto';
import { PrismaService } from '../prisma/prisma.service';
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
    private readonly ledgerService: FinanceLedgerService,
    private readonly prisma: PrismaService,
  ) {}

  /** Enforce Finance submodule when decorator alone is not enough (dynamic Sale/Purchase). */
  private assertFinanceSub(user: any, subModuleName: string, action: string) {
    if (!user) throw new ForbiddenException('Unauthorized');
    if (user.role?.name === 'SUPER_ADMIN' || user.role === 'SUPER_ADMIN') return;
    const permissions = user.role?.modulePermissions || user.permissions || [];
    const sub = permissions.find(
      (p: any) => p.moduleName === 'Finance' && p.subModuleName === subModuleName,
    );
    if (sub && sub[action] === true) return;
    const parent = permissions.find(
      (p: any) => p.moduleName === 'Finance' && (!p.subModuleName || p.subModuleName === ''),
    );
    if (parent && parent[action] === true) return;
    throw new ForbiddenException(`Missing Finance / ${subModuleName} ${action}`);
  }

  // ─── Legacy ledger (pre-F31 generic) ─────────────────────────────────────
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

  private assertAdmin(user: any) {
    if (!user) throw new ForbiddenException('Unauthorized');
    const role = user.role?.name || user.role;
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') return;
    throw new ForbiddenException('Only Admin can manage Master parties');
  }

  // ─── Master Module (Party / Entity) — Admin only ─────────────────────────
  @Get('masters')
  @RequirePermission('Finance', 'canView')
  listMasters(
    @Req() req: any,
    @Query('type') type?: string,
    @Query('q') q?: string,
  ) {
    this.assertAdmin(req.user);
    return this.financeSodaService.listMasters({ type, q });
  }

  @Post('masters')
  @RequirePermission('Finance', 'canAdd')
  createMaster(@Req() req: any, @Body() body: any) {
    this.assertAdmin(req.user);
    return this.financeSodaService.createParty(body);
  }

  @Patch('masters/:id')
  @RequirePermission('Finance', 'canEdit')
  updateMaster(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    this.assertAdmin(req.user);
    return this.financeSodaService.updateParty(id, body);
  }

  // ─── Parties (Deals / Soda + dropdowns) ───────────────────────────────────
  @Get('parties')
  @RequirePermission('Finance', 'canView', 'Deals / Soda Record')
  listParties(@Query('role') role?: 'CUSTOMER' | 'SUPPLIER' | 'ALL') {
    return this.financeSodaService.listParties(role || 'ALL');
  }

  @Get('party-options')
  @RequirePermission('Finance', 'canView', 'Deals / Soda Record')
  partyOptions(
    @Query('excludePlantIds') excludePlantIds?: string,
    @Query('role') role?: 'CUSTOMER' | 'SUPPLIER' | 'ALL',
    @Query('sodaType') sodaType?: 'SALE' | 'PURCHASE',
  ) {
    const ids = excludePlantIds ? excludePlantIds.split(',').filter(Boolean) : [];
    // Sales → customers; Purchase → suppliers; Both appear in both
    let filter: 'CUSTOMER' | 'SUPPLIER' | 'ALL' = role || 'ALL';
    if (!role && sodaType === 'SALE') filter = 'CUSTOMER';
    if (!role && sodaType === 'PURCHASE') filter = 'SUPPLIER';
    return this.financeSodaService.partyOptions(ids, filter);
  }

  @Post('parties')
  @RequirePermission('Finance', 'canAdd')
  createParty(@Req() req: any, @Body() body: any) {
    this.assertAdmin(req.user);
    return this.financeSodaService.createParty(body);
  }

  @Patch('parties/:id')
  @RequirePermission('Finance', 'canEdit')
  updateParty(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    this.assertAdmin(req.user);
    return this.financeSodaService.updateParty(id, body);
  }

  // ─── Sodas / Deals ───────────────────────────────────────────────────────
  @Get('sodas/next-number')
  @RequirePermission('Finance', 'canView', 'Deals / Soda Record')
  nextNumber(@Query('sodaType') sodaType: 'SALE' | 'PURCHASE') {
    return this.financeSodaService.nextSodaNumber(sodaType || 'SALE').then((n) => ({ next: n }));
  }

  @Get('sodas')
  @RequirePermission('Finance', 'canView', 'Deals / Soda Record')
  listSodas(@Query('sodaType') sodaType?: string) {
    return this.financeSodaService.listSodas(sodaType);
  }

  @Post('sodas')
  @RequirePermission('Finance', 'canAdd', 'Deals / Soda Record')
  createSoda(@Body() body: any, @Req() req: any) {
    return this.financeSodaService.createSoda(body, req.user);
  }

  @Patch('sodas/:id')
  @RequirePermission('Finance', 'canEdit', 'Deals / Soda Record')
  updateSoda(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.financeSodaService.updateSoda(id, body, req.user);
  }

  @Patch('sodas/:id/payment-status')
  @RequirePermission('Finance', 'canEdit', 'Deals / Soda Record')
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
    @Req() req?: any,
  ) {
    const sub = reportType === 'PURCHASE' ? 'Purchase' : 'Sale';
    this.assertFinanceSub(req?.user, sub, 'canView');
    return this.salePurchaseService.listReport(reportType || 'SALE', plantId || undefined);
  }

  @Patch('sale-purchase-report/:id')
  @RequirePermission('Finance', 'canEdit')
  async updateSalePurchase(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const line = await this.prisma.financeSalePurchaseLine.findUnique({
      where: { id },
      select: { reportType: true },
    });
    const sub = line?.reportType === 'PURCHASE' ? 'Purchase' : 'Sale';
    this.assertFinanceSub(req.user, sub, 'canEdit');
    return this.salePurchaseService.updateLine(id, body, req.user);
  }

  @Patch('sale-purchase-report/:id/payment-status')
  @RequirePermission('Finance', 'canEdit')
  async updateSalePurchasePayment(
    @Param('id') id: string,
    @Body() body: { paymentStatus: string; plantId?: string },
    @Req() req: any,
  ) {
    const line = await this.prisma.financeSalePurchaseLine.findUnique({
      where: { id },
      select: { reportType: true },
    });
    const sub = line?.reportType === 'PURCHASE' ? 'Purchase' : 'Sale';
    this.assertFinanceSub(req.user, sub, 'canEdit');
    return this.salePurchaseService.updatePaymentStatusFromReport(
      id,
      body.paymentStatus,
      req.user,
      body.plantId,
    );
  }

  @Get('payment-status-audits')
  @RequirePermission('Finance', 'canView', 'Sale')
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
  @RequirePermission('Finance', 'canEdit', 'Sale')
  backfillSalePurchase() {
    return this.salePurchaseService.backfillMissingLines();
  }

  /** Feedback 30 — Junction Report */
  @Get('junction-report')
  @RequirePermission('Finance', 'canView', 'Junction Report')
  junctionReport(
    @Query('reportType') reportType: 'SALE' | 'PURCHASE',
    @Query('partyKey') partyKey?: string,
    @Query('financeSodaId') financeSodaId?: string,
  ) {
    return this.salePurchaseService.junctionReport(reportType || 'SALE', {
      partyKey,
      financeSodaId,
    });
  }

  // ─── Feedback 31 — Party Ledger / AR / AP / Payments ─────────────────────
  @Get('ledger/party-options')
  @RequirePermission('Finance', 'canView')
  ledgerPartyOptions(
    @Req() req: any,
    @Query('role') role?: 'CUSTOMER' | 'SUPPLIER' | 'ALL',
    @Query('entryType') entryType?: 'RECEIPT' | 'PAYMENT',
  ) {
    // Used by Payment Received/Paid and AR/AP — any of those modules
    const u = req.user;
    let filter: 'CUSTOMER' | 'SUPPLIER' | 'ALL' = role || 'ALL';
    if (!role && entryType === 'RECEIPT') filter = 'CUSTOMER';
    if (!role && entryType === 'PAYMENT') filter = 'SUPPLIER';
    if (u?.role?.name === 'SUPER_ADMIN' || u?.role === 'SUPER_ADMIN') {
      return this.ledgerService.listPartyOptions(filter);
    }
    const ok = ['Payment Received', 'Payment Paid', 'Receivables', 'Payables'].some((sub) => {
      try {
        this.assertFinanceSub(u, sub, 'canView');
        return true;
      } catch {
        return false;
      }
    });
    if (!ok) throw new ForbiddenException('Missing Finance payment/AR-AP view permission');
    return this.ledgerService.listPartyOptions(filter);
  }

  @Get('ledger/statement')
  @RequirePermission('Finance', 'canView')
  ledgerStatement(
    @Query('partyKey') partyKey: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('q') q?: string,
    @Req() req?: any,
  ) {
    const u = req?.user;
    const ok = ['Receivables', 'Payables'].some((sub) => {
      try {
        this.assertFinanceSub(u, sub, 'canView');
        return true;
      } catch {
        return false;
      }
    });
    if (!ok && u?.role?.name !== 'SUPER_ADMIN' && u?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Missing Receivables/Payables view permission');
    }
    return this.ledgerService.partyStatement(partyKey, { from, to, q });
  }

  @Get('ledger/outstanding')
  @RequirePermission('Finance', 'canView')
  ledgerOutstanding(
    @Query('kind') kind: 'RECEIVABLES' | 'PAYABLES',
    @Query('owingOnly') owingOnly?: string,
    @Req() req?: any,
  ) {
    const sub = kind === 'PAYABLES' ? 'Payables' : 'Receivables';
    this.assertFinanceSub(req?.user, sub, 'canView');
    return this.ledgerService.outstanding(kind === 'PAYABLES' ? 'PAYABLES' : 'RECEIVABLES', {
      owingOnly: owingOnly !== 'false' && owingOnly !== '0',
    });
  }

  @Get('ledger/sodas')
  @RequirePermission('Finance', 'canView')
  ledgerSodas(
    @Query('partyKey') partyKey: string,
    @Query('sodaType') sodaType?: 'SALE' | 'PURCHASE',
    @Req() req?: any,
  ) {
    const u = req?.user;
    const ok = ['Payment Received', 'Payment Paid', 'Receivables', 'Payables'].some((sub) => {
      try {
        this.assertFinanceSub(u, sub, 'canView');
        return true;
      } catch {
        return false;
      }
    });
    if (!ok && u?.role?.name !== 'SUPER_ADMIN' && u?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Missing Finance ledger view permission');
    }
    return this.ledgerService.sodasForParty(partyKey, sodaType);
  }

  @Get('ledger/payments')
  @RequirePermission('Finance', 'canView')
  listLedgerPayments(@Query('entryType') entryType: 'RECEIPT' | 'PAYMENT', @Req() req?: any) {
    const sub = entryType === 'PAYMENT' ? 'Payment Paid' : 'Payment Received';
    this.assertFinanceSub(req?.user, sub, 'canView');
    return this.ledgerService.listPayments(entryType === 'PAYMENT' ? 'PAYMENT' : 'RECEIPT');
  }

  @Post('ledger/payments')
  @RequirePermission('Finance', 'canAdd')
  createLedgerPayment(
    @Body()
    body: {
      entryType: 'RECEIPT' | 'PAYMENT';
      partyKey: string;
      date: string;
      narration?: string;
      amount: number;
      notes?: string;
      financeSodaId?: string;
    },
    @Req() req: any,
  ) {
    const sub = body.entryType === 'PAYMENT' ? 'Payment Paid' : 'Payment Received';
    this.assertFinanceSub(req.user, sub, 'canAdd');
    return this.ledgerService.createPayment(body, req.user?.id || req.user?.userId);
  }

  @Post('ledger/backfill')
  @RequirePermission('Finance', 'canEdit', 'Receivables')
  backfillLedger() {
    return this.ledgerService.backfillFromReportLines();
  }
}
