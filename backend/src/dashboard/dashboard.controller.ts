import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('dashboard')
export class DashboardController {
  @Get('production-analysis')
  async getProductionAnalysisSummary(@Query('plantId') plantId?: string) {
    return this.dashboardService.getProductionAnalysisSummary(plantId);
  }

  constructor(private readonly dashboardService: DashboardService) {}

  // The legacy endpoint to keep compatibility with old frontend (optional)
  @Get('summary')
  @RequirePermission('Dashboard', 'canView')
  async getSummary() {
    // Assuming plant 1 for now if no param provided in old frontend
    const plants = await this.dashboardService['prisma'].plant.findFirst();
    if(plants) return this.dashboardService.getMetrics(plants.id);
    return { activeUsers: 0, procurementMT: 0, inventoryMT: 0, gatePasses: 0 };
  }

  @Get('metrics/:plantId')
  @RequirePermission('Dashboard', 'canView')
  getMetrics(@Param('plantId') plantId: string, @Query('filter') filter?: string) {
    return this.dashboardService.getMetrics(plantId, filter);
  }

  @Get('procurement-chart')
  @RequirePermission('Dashboard', 'canView')
  getProcurementChart(@Query('filter') filter?: string) {
    return this.dashboardService.getProcurementChart(filter);
  }

  @Get('yield-trend/:plantId')
  @RequirePermission('Dashboard', 'canView')
  getYieldTrend(@Param('plantId') plantId: string, @Query('filter') filter?: string) {
    return this.dashboardService.getYieldTrend(plantId, filter);
  }

  @Get('stock-donut/:plantId')
  @RequirePermission('Dashboard', 'canView')
  getStockDonut(@Param('plantId') plantId: string, @Query('filter') filter?: string) {
    return this.dashboardService.getStockDonut(plantId, filter);
  }

  @Get('recent-activities/:plantId')
  @RequirePermission('Dashboard', 'canView')
  getRecentActivities(@Param('plantId') plantId: string) {
    return this.dashboardService.getRecentActivities(plantId);
  }

  @Get('alerts/:plantId')
  @RequirePermission('Dashboard', 'canView')
  getAlerts(@Param('plantId') plantId: string) {
    return this.dashboardService.getAlerts(plantId);
  }

  @Get('today-summary/:plantId')
  @RequirePermission('Dashboard', 'canView')
  getTodaySummary(@Param('plantId') plantId: string) {
    return this.dashboardService.getTodaySummary(plantId);
  }
}
