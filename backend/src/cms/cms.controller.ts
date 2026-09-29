import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CmsService } from './cms.service';
import { CmsControlsService } from './cms-controls.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('cms')
export class CmsController {
  constructor(
    private readonly cms: CmsService,
    private readonly controls: CmsControlsService,
  ) {}

  @Get('overview')
  @RequirePermission('CMS', 'canView', 'Real-time Basis Tracking')
  overview() {
    return this.cms.getOverview();
  }

  @Get('basis-tracking')
  @RequirePermission('CMS', 'canView', 'Real-time Basis Tracking')
  basisTracking() {
    return this.cms.getOverview();
  }

  @Get('paddy-inward')
  @RequirePermission('CMS', 'canView', 'Real-time Paddy Inward (Notified)')
  paddyInward(@Query('plantId') plantId?: string) {
    return this.cms.getPaddyInward(plantId);
  }

  @Get('boli-records')
  @RequirePermission('CMS', 'canView', 'Boli Record with Pending Boli Also')
  boliRecords(@Query('plantId') plantId?: string) {
    return this.cms.getBoliRecords(plantId);
  }

  @Get('gate-pass')
  @RequirePermission('CMS', 'canView', 'Real-time GP Entry Tracking (Notified)')
  gatePass(@Query('plantId') plantId?: string) {
    return this.cms.getGatePassTracking(plantId);
  }

  @Get('paddy-stock')
  @RequirePermission('CMS', 'canView', 'Paddy Stock')
  paddyStock(@Query('plantId') plantId?: string) {
    return this.cms.getPaddyStock(plantId);
  }

  @Get('production')
  @RequirePermission('CMS', 'canView', 'Production Tracking')
  production(@Query('plantId') plantId?: string) {
    return this.cms.getProductionTracking(plantId);
  }

  @Get('stock-ledger')
  @RequirePermission('CMS', 'canView', 'Live Stock Ledger')
  stockLedger(
    @Query('plantId') plantId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.cms.getLiveStockLedger(
      plantId,
      limit ? parseInt(limit, 10) : 100,
    );
  }

  @Get('yield')
  @RequirePermission('CMS', 'canView', 'Yield Analysis')
  yieldAnalysis(@Query('plantId') plantId?: string) {
    return this.cms.getYieldAnalysis(plantId);
  }

  @Get('alerts')
  @RequirePermission('CMS', 'canView', 'Alerts on Abnormal Transactions')
  alerts(@Query('plantId') plantId?: string) {
    return this.cms.getAbnormalAlerts(plantId);
  }

  @Get('user-rights/roles')
  @RequirePermission('CMS', 'canView', 'CMS User Permission Controls')
  userRightsRoles() {
    return this.cms.listNormalRolesWithUsers();
  }

  @Get('user-rights/roles/:roleId/permissions')
  @RequirePermission('CMS', 'canView', 'CMS User Permission Controls')
  userRightsGet(@Param('roleId') roleId: string) {
    return this.cms.getRolePermissionsMirror(roleId);
  }

  @Post('user-rights/roles/:roleId/permissions')
  @RequirePermission('CMS', 'canEdit', 'CMS User Permission Controls')
  userRightsSave(
    @Param('roleId') roleId: string,
    @Body('permissions') permissions: any[],
  ) {
    return this.cms.saveRolePermissionsMirror(roleId, permissions);
  }

  // —— Final part: Key Requirements & System Controls + Financial ——

  @Get('traceability')
  @RequirePermission('CMS', 'canView', 'Full Traceability')
  traceability(@Query('plantId') plantId?: string) {
    return this.controls.getFullTraceability(plantId);
  }

  @Get('plant-comparison')
  @RequirePermission('CMS', 'canView', 'Plant-Wise Comparison')
  plantComparison() {
    return this.controls.getPlantWiseComparison();
  }

  @Get('manual-corrections')
  @RequirePermission('CMS', 'canView', 'Manual Correction Alerts')
  manualCorrections(@Query('plantId') plantId?: string) {
    return this.controls.getManualCorrectionAlerts(plantId);
  }

  @Get('overprice')
  @RequirePermission('CMS', 'canView', 'Overprice Detection')
  overprice(@Query('plantId') plantId?: string) {
    return this.controls.getOverpriceDetection(plantId);
  }

  @Get('weighment-patterns')
  @RequirePermission('CMS', 'canView', 'Weighment Pattern Monitoring')
  weighmentPatterns(@Query('plantId') plantId?: string) {
    return this.controls.getWeighmentPatterns(plantId);
  }

  @Get('correction-audit')
  @RequirePermission('CMS', 'canView', 'Correction Audit Control')
  correctionAudit(@Query('plantId') plantId?: string) {
    return this.controls.getCorrectionAuditControl(plantId);
  }

  @Get('audit-logs')
  @RequirePermission('CMS', 'canView', 'Audit Logs Tracking')
  auditLogs(@Query('plantId') plantId?: string) {
    return this.controls.getAuditLogsTracking(plantId);
  }

  @Get('severity')
  @RequirePermission('CMS', 'canView', 'Transaction Severity Categories')
  severity(@Query('plantId') plantId?: string) {
    return this.controls.getTransactionSeverity(plantId);
  }

  @Get('stock-dispatch')
  @RequirePermission('CMS', 'canView', 'Stock Available for Dispatch')
  stockDispatch(@Query('plantId') plantId?: string) {
    return this.controls.getStockAvailableForDispatch(plantId);
  }

  @Get('receivables')
  @RequirePermission('CMS', 'canView', 'Receivables Tracking')
  receivables() {
    return this.controls.getReceivablesTracking();
  }

  @Get('paddy-cost')
  @RequirePermission('CMS', 'canView', 'Paddy Cost Tracking')
  paddyCost(@Query('plantId') plantId?: string) {
    return this.controls.getPaddyCostTracking(plantId);
  }
}
