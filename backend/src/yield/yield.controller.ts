import { Controller, Get, Post, Put, Body, Query, Param, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { YieldService } from './yield.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PlantContextGuard } from '../common/guards/plant-context.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

function assertSuperAdmin(req: any) {
  const role = req.user?.role?.name || req.user?.role;
  if (role !== 'SUPER_ADMIN') {
    throw new ForbiddenException('Export formats are restricted to SUPER_ADMIN.');
  }
}

@UseGuards(JwtAuthGuard, PlantContextGuard, PermissionsGuard)
@Controller('yield')
export class YieldController {
  constructor(private readonly yieldService: YieldService) {}

  @Post('calculator/save')
  @RequirePermission('Yield Mgmt', 'canAdd')
  saveCalculatorData(@Body() data: any, @Query('plantId') plantId: string) {
    return this.yieldService.saveCalculatorData(plantId, data);
  }

  @Get('analytics')
  @RequirePermission('Yield Mgmt', 'canView')
  getAnalytics(@Query('plantId') plantId: string) {
    return this.yieldService.getAnalytics(plantId);
  }

  @Get('historical')
  @RequirePermission('Yield Mgmt', 'canView')
  getHistorical(
    @Query('plantId') plantId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('variety') variety?: string,
  ) {
    return this.yieldService.getHistorical(plantId, dateFrom, dateTo, variety);
  }

  @Get('stock-health')
  @RequirePermission('Yield Mgmt', 'canView')
  getStockHealth(
    @Query('period') period?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('mill') mill?: string,
  ) {
    return this.yieldService.getStockHealthReport({ period, dateFrom, dateTo, mill });
  }

  @Put('stock-health/total-work')
  @RequirePermission('Yield Mgmt', 'canEdit')
  setTotalWork(
    @Body() body: { plantId: string; totalWork: number },
    @Req() req: any,
  ) {
    const setBy = req.user?.username || req.user?.email || req.user?.sub;
    const role = req.user?.role?.name || req.user?.role;
    return this.yieldService.setStockHealthTotalWork(body.plantId, body.totalWork, setBy, role);
  }

  // Feedback 19 — Consignment Dispatch
  @Get('consignment-dispatch')
  @RequirePermission('Yield Mgmt', 'canView')
  listConsignment(
    @Query('plantId') plantId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.yieldService.listConsignmentDispatches(plantId, dateFrom, dateTo);
  }

  @Get('consignment-dispatch/gate-passes')
  @RequirePermission('Yield Mgmt', 'canView')
  gatePassesForDate(@Query('plantId') plantId: string, @Query('date') date: string) {
    return this.yieldService.getGatePassesForConsignmentDate(plantId, date);
  }

  @Post('consignment-dispatch')
  @RequirePermission('Yield Mgmt', 'canAdd')
  submitConsignment(@Body() body: any, @Query('plantId') plantId: string) {
    return this.yieldService.submitConsignmentDispatch(plantId || body.plantId, body);
  }

  // Feedback 17 — Rice / Paddy yield compare
  @Get('mill-compare')
  @RequirePermission('Yield Mgmt', 'canView')
  millCompare(
    @Query('basis') basis: 'rice' | 'paddy' = 'rice',
    @Query('period') period?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('unit') unit?: 'bags' | 'weight',
    @Query('format') format?: 'page' | 'datesheet',
    @Query('granularity') granularity?: 'day' | 'week' | 'month',
    @Query('plantId') plantId?: string,
    @Query('millKey') millKey?: string,
    @Req() req?: any,
  ) {
    if (format === 'page') {
      assertSuperAdmin(req);
      return this.yieldService.getMillYieldCompareFormat1({
        basis,
        period,
        dateFrom,
        dateTo,
        unit,
        granularity,
      });
    }
    if (format === 'datesheet') {
      return this.yieldService.getMillYieldCompareFormat2({
        basis,
        plantId,
        millKey,
        dateFrom,
        dateTo,
        unit,
        granularity,
      });
    }
    return this.yieldService.getMillYieldCompare({ basis, period, dateFrom, dateTo, unit });
  }

  @Get('mill-compare/format1')
  @RequirePermission('Yield Mgmt', 'canView')
  millCompareFormat1(
    @Query('basis') basis: 'rice' | 'paddy' = 'rice',
    @Query('period') period?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('unit') unit?: 'bags' | 'weight',
    @Query('granularity') granularity?: 'day' | 'week' | 'month',
    @Req() req?: any,
  ) {
    assertSuperAdmin(req);
    return this.yieldService.getMillYieldCompareFormat1({
      basis,
      period,
      dateFrom,
      dateTo,
      unit,
      granularity,
    });
  }

  @Get('mill-compare/format2')
  @RequirePermission('Yield Mgmt', 'canView')
  millCompareFormat2(
    @Query('basis') basis: 'rice' | 'paddy' = 'rice',
    @Query('plantId') plantId?: string,
    @Query('millKey') millKey?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('unit') unit?: 'bags' | 'weight',
    @Query('granularity') granularity?: 'day' | 'week' | 'month',
    @Query('export') exportFlag?: string,
    @Req() req?: any,
  ) {
    // On-screen datesheet: any Yield viewer. File export: SUPER_ADMIN only.
    if (exportFlag === '1' || exportFlag === 'true') {
      assertSuperAdmin(req);
    }
    return this.yieldService.getMillYieldCompareFormat2({
      basis,
      plantId,
      millKey,
      dateFrom,
      dateTo,
      unit,
      granularity,
    });
  }

  @Get('paddy-usage/preview')
  @RequirePermission('Yield Mgmt', 'canView')
  paddyUsagePreview(@Query('plantId') plantId: string) {
    return this.yieldService.getPaddyUsagePreview(plantId);
  }

  @Post('paddy-usage')
  @RequirePermission('Yield Mgmt', 'canAdd')
  submitPaddyUsage(@Body() body: any, @Query('plantId') plantId: string) {
    return this.yieldService.submitPaddyUsage(plantId || body.plantId, body);
  }
}
