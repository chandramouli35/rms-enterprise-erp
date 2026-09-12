import { Controller, Post, Body, Get, Param, HttpException, HttpStatus, Put, Patch, UseGuards, Query, BadRequestException, Req } from '@nestjs/common';
import { ProcurementService } from './procurement.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission, RequireAnyPermission } from '../common/decorators/require-permission.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/procurement')
export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  @Post('save-purchase')
  @RequirePermission('Procurement', 'canAdd')
  async savePurchase(@Body() data: any, @Req() req: any) {
    try {
      return await this.procurementService.savePurchase({
        ...data,
        userId: req.user?.id || data.userId,
        user: req.user,
      });
    } catch (error: any) {
      console.error(error);
      throw new HttpException(`Failed to save: ${error.message || error}`, HttpStatus.BAD_REQUEST);
    }
  }

  
  @Get('inward-details/:id')
  @RequirePermission('Procurement', 'canView')
  async getInwardDetails(@Param('id') id: string) {
    return this.procurementService.getInwardDetails(id);
  }

  @Get('drafts/:plantId')
  @RequirePermission('Procurement', 'canView')
  getDraftInwards(@Param('plantId') plantId: string) {
    return this.procurementService.getDraftInwards(plantId);
  }

  @Get('inwards/:plantId')
  @RequirePermission('Procurement', 'canView')
  getInwards(
    @Param('plantId') plantId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('mandi') mandi?: string,
    @Query('supplierId') supplierId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.procurementService.getInwards(plantId, dateFrom, dateTo, mandi, supplierId, page, limit);
  }

  @Get('recent/:plantId')
  @RequirePermission('Procurement', 'canView')
  getRecentPurchases(
    @Param('plantId') plantId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.procurementService.getRecentPurchases(plantId, dateFrom, dateTo, page, limit);
  }

  @Get('occupied-stacks/:plantId')
  @RequirePermission('Procurement', 'canView')
  getOccupiedStacks(@Param('plantId') plantId: string) {
    return this.procurementService.getOccupiedStacks(plantId);
  }

  @Get('batch/:batchId')
  @RequirePermission('Procurement', 'canView')
  getBatch(@Param('batchId') batchId: string) {
    return this.procurementService.getBatch(batchId);
  }

  @Post('quality/:batchId')
  @RequirePermission('Procurement', 'canEdit')
  updateQuality(@Param('batchId') batchId: string, @Body() data: any) {
    return this.procurementService.updateQuality(batchId, data);
  }

  @Get('suppliers')
  @RequireAnyPermission(['Procurement', 'Gate Pass'], 'canView')
  getSuppliers(@Query('plantId') plantId?: string) {
    return this.procurementService.getSuppliers(plantId);
  }

  @Post('suppliers')
  @RequirePermission('Procurement', 'canAdd')
  createSupplier(@Body() data: any) {
    return this.procurementService.createSupplier(data);
  }

  @Get('analytics/:plantId')
  @RequirePermission('Procurement', 'canView')
  getAnalytics(@Param('plantId') plantId: string) {
    return this.procurementService.getAnalytics(plantId);
  }

  @Post('register/:plantId')
  @RequirePermission('Procurement', 'canView')
  getPurchaseRegister(@Param('plantId') plantId: string, @Body() filters: any) {
    return this.procurementService.getPurchaseRegister(plantId, filters);
  }

  @Post('boli-rate/:batchId')
  @RequirePermission('Procurement', 'canEdit')
  async updateBoliRate(@Param('batchId') batchId: string, @Body() data: { newRate: number; arhtiaCorrection: number }) {
    try {
      return await this.procurementService.updateBoliRate(batchId, data.newRate, data.arhtiaCorrection);
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('soda-pending/detail/:id')
  @RequirePermission('Procurement', 'canView')
  getSodaPendingById(@Param('id') id: string) {
    return this.procurementService.getSodaPendingById(id);
  }

  @Get('soda-pending/:plantId')
  @RequireAnyPermission(['Procurement', 'Weighbridge'], 'canView')
  getSodaPending(
    @Param('plantId') plantId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('supplierId') supplierId?: string,
    @Query('mandi') mandi?: string,
  ) {
    return this.procurementService.getSodaPending(plantId, dateFrom, dateTo, page, limit, supplierId, mandi);
  }

  @Get('boli-records/:plantId')
  @RequirePermission('Procurement', 'canView')
  getBoliRecords(
    @Param('plantId') plantId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('supplierId') supplierId?: string,
    @Query('mandi') mandi?: string,
  ) {
    return this.procurementService.getBoliRecords(plantId, {
      dateFrom,
      dateTo,
      page,
      limit,
      supplierId,
      mandi,
    });
  }

  @Get('bolis/open-for-final/:plantId')
  @RequirePermission('Procurement', 'canView')
  getOpenBolisForFinal(@Param('plantId') plantId: string) {
    return this.procurementService.getOpenBolisForFinal(plantId);
  }

  @Get('supervisors/:plantId')
  @RequirePermission('Procurement', 'canView')
  getSupervisorsForPlant(@Param('plantId') plantId: string) {
    return this.procurementService.getSupervisorsForPlant(plantId);
  }

  @Post('soda-pending')
  @RequirePermission('Procurement', 'canAdd')
  async createSodaPending(@Body() data: any, @Req() req: any) {
    try {
      return await this.procurementService.createSodaPending(data, req.user);
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Put('soda-pending/:id')
  @RequirePermission('Procurement', 'canEdit')
  async updateSodaPending(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    try {
      return await this.procurementService.updateSodaPending(id, data, req.user);
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Put('bolis/:id/final')
  @RequirePermission('Procurement', 'canEdit')
  async submitFinalBoli(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    try {
      return await this.procurementService.submitFinalBoli(id, data, req.user);
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  /** Feedback 32 — Admin edit Payment / Note / Final Bags on Table 01 */
  @Put('bolis/:id/admin-table01')
  @RequirePermission('Procurement', 'canEdit')
  async adminUpdateBoliRecord(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    try {
      return await this.procurementService.adminUpdateBoliRecord(id, data, req.user);
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Put('bolis/:id/complete')
  @RequirePermission('Procurement', 'canEdit')
  async completeBoli(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    try {
      return await this.procurementService.completeBoli(id, data, req.user);
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('settle-hisab')
  @RequirePermission('Procurement', 'canEdit')
  async settleHisab(@Body() data: any, @Req() req: any) {
    try {
      return await this.procurementService.settleHisab({ ...data, user: req.user, userId: req.user?.id || data.userId });
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('reports/paddy-stock')
  @RequirePermission('Procurement', 'canView')
  async getPaddyStockReport(@Query('plantId') plantId: string) {
    return this.procurementService.getPaddyStockReport(plantId);
  }

  @Get('reports/shortage-summary')
  @RequireAnyPermission(['Procurement', 'Dashboard'], 'canView')
  async getShortageSummaryReport(
    @Query('plantId') plantId: string,
    @Query('mandiId') mandiId?: string,
    @Query('supplierId') supplierId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.procurementService.getShortageSummaryReport(plantId, mandiId, supplierId, dateFrom, dateTo);
  }

  /** Feedback 34 — daily consolidated multi-mill shortage */
  @Get('reports/shortage-daily')
  @RequireAnyPermission(['Procurement', 'Dashboard'], 'canView')
  async getDailyConsolidatedShortage(
    @Query('date') date?: string,
    @Query('live') live?: string,
  ) {
    return this.procurementService.getDailyConsolidatedShortage(date, live !== '1');
  }

  /** Feedback 34 — submit / freeze evening daily shortage report */
  @Post('reports/shortage-daily/submit')
  @RequireAnyPermission(['Procurement', 'Dashboard'], 'canEdit')
  async submitDailyShortageReport(@Body() body: any) {
    return this.procurementService.submitDailyShortageReport({
      date: body?.date,
      plantId: body?.plantId || 'global',
      submittedBy: body?.submittedBy || body?.supervisorName,
      source: body?.source || 'MANUAL',
    });
  }

  /** Feedback 34 — till-date artia balances */
  @Get('reports/shortage-artia-balances')
  @RequireAnyPermission(['Procurement', 'Dashboard'], 'canView')
  async getArtiaShortageBalances(@Query('asOf') asOf?: string) {
    return this.procurementService.getArtiaShortageBalances(asOf);
  }

  /** Feedback 34 — mill shortage trend for graph */
  @Get('reports/shortage-mill-trend')
  @RequireAnyPermission(['Procurement', 'Dashboard'], 'canView')
  async getMillShortageTrend(@Query('days') days?: string) {
    return this.procurementService.getMillShortageTrend(days ? parseInt(days, 10) : 14);
  }

  /** Feedback 35 — dual Govt/Mill inward list report */
  @Get('reports/inward-list')
  @RequirePermission('Procurement', 'canView')
  async getInwardListReport(
    @Query('plantId') plantId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('mandi') mandi?: string,
    @Query('supplierId') supplierId?: string,
    @Query('bagWt') bagWt?: string,
    @Query('date') date?: string,
    @Query('snapshot') snapshot?: string,
  ) {
    return this.procurementService.getInwardListReport({
      plantId: plantId || 'global',
      dateFrom,
      dateTo,
      mandi,
      supplierId,
      bagWt: bagWt ? parseFloat(bagWt) : 0.382,
      date,
      preferSnapshot: snapshot === '1',
    });
  }

  /** Feedback 35 — active GP count indicator */
  @Get('reports/active-gps')
  @RequirePermission('Procurement', 'canView')
  async getActiveGatePassCount(@Query('plantId') plantId?: string) {
    return this.procurementService.getActiveGatePassCount(plantId);
  }

  /** Feedback 35 — evening fingerprint submit of Govt + Mill inward lists */
  @Post('reports/inward-list/submit')
  @RequirePermission('Procurement', 'canEdit')
  async submitEveningInwardLists(@Body() body: any, @Req() req: any) {
    try {
      return await this.procurementService.submitEveningInwardLists({
        plantId: body?.plantId || 'global',
        date: body?.date,
        bagWt: body?.bagWt,
        supervisorName: body?.supervisorName || body?.submittedBy,
        biometricData: body?.biometricData,
        source: body?.source || 'EVENING_SUBMIT',
        user: req.user,
      });
    } catch (error: any) {
      throw new HttpException(error.message || 'Submit failed', HttpStatus.BAD_REQUEST);
    }
  }

  /** Feedback 35 — Daily Inward Summary (auto / from evening snapshot) */
  @Get('reports/daily-inward-summary')
  @RequirePermission('Procurement', 'canView')
  async getDailyInwardSummary(
    @Query('plantId') plantId?: string,
    @Query('date') date?: string,
  ) {
    return this.procurementService.getDailyInwardSummary(plantId || 'global', date);
  }

  /** Feedback 35 — multi-mill mandi balance dashboard (bags, auto) */
  @Get('reports/mandi-balance-dashboard')
  @RequirePermission('Procurement', 'canView')
  async getMandiBalanceDashboard(@Query('date') date?: string) {
    return this.procurementService.getMandiBalanceDashboard(date);
  }

  @Patch('inward-details/:id/shortage-recovery')
  @RequirePermission('Procurement', 'canEdit')
  async updateShortageRecovery(
    @Param('id') id: string,
    @Body('shortageRecoveryQtl') shortageRecoveryQtl: number,
  ) {
    return this.procurementService.updateShortageRecovery(id, shortageRecoveryQtl);
  }
  @Post('hoodi-transfer')
  @RequirePermission('Procurement', 'canAdd')
  async transferStackToHoodi(@Body() data: any) {
    try {
      return await this.procurementService.transferStackToHoodi(data.plantId, data);
    } catch (error: any) {
      throw new HttpException(`Failed to transfer: ${error.message || error}`, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('reports/hoodi-summary')
  @RequirePermission('Procurement', 'canView')
  async getHoodiReport(
    @Query('plantId') plantId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    try {
      return await this.procurementService.getHoodiReport(plantId, dateFrom, dateTo);
    } catch (error: any) {
      throw new HttpException(`Failed to get report: ${error.message || error}`, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('stack/layout')
  @RequirePermission('Procurement', 'canView')
  async getStackLayout(@Query('plantId') plantId: string) {
    if (!plantId) throw new BadRequestException('plantId is required');
    return await this.procurementService.getStackLayout(plantId);
  }

  @Get('stack/active-trucks')
  @RequirePermission('Procurement', 'canView')
  async getActiveUnloadingTrucks(@Query('plantId') plantId: string) {
    if (!plantId) throw new BadRequestException('plantId is required');
    return await this.procurementService.getActiveUnloadingTrucks(plantId);
  }

  @Get('stack/history')
  @RequirePermission('Procurement', 'canView')
  async getStackHistory(@Query('plantId') plantId: string, @Query('stackNo') stackNo: string) {
    if (!plantId || !stackNo) throw new BadRequestException('plantId and stackNo required');
    return await this.procurementService.getStackHistory(plantId, stackNo);
  }

  @Patch('stack/:stackNo/complete')
  @RequirePermission('Procurement', 'canEdit')
  async markStackComplete(@Param('stackNo') stackNo: string, @Body('plantId') plantId: string) {
    if (!plantId) throw new BadRequestException('plantId is required');
    return await this.procurementService.markStackComplete(plantId, stackNo);
  }

  @Post('stack/:stackNo/send-to-hoodi')
  @RequirePermission('Procurement', 'canEdit')
  async sendStackToHoodi(@Param('stackNo') stackNo: string, @Body('plantId') plantId: string) {
    if (!plantId) throw new BadRequestException('plantId is required');
    return await this.procurementService.sendStackToHoodi(plantId, stackNo, 'system');
  }
}
