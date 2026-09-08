import { Controller, Get, Post, Put, Body, Query, UseGuards, Req } from '@nestjs/common';
import { YieldService } from './yield.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PlantContextGuard } from '../common/guards/plant-context.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@UseGuards(JwtAuthGuard, PlantContextGuard, PermissionsGuard)
@Controller('yield')
export class YieldController {
  constructor(private readonly yieldService: YieldService) {}

  @Post('calculator/save')
  @RequirePermission('Yield', 'canAdd')
  saveCalculatorData(@Body() data: any, @Query('plantId') plantId: string) {
    return this.yieldService.saveCalculatorData(plantId, data);
  }

  @Get('analytics')
  @RequirePermission('Yield', 'canView')
  getAnalytics(@Query('plantId') plantId: string) {
    return this.yieldService.getAnalytics(plantId);
  }

  @Get('historical')
  @RequirePermission('Yield', 'canView')
  getHistorical(
    @Query('plantId') plantId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('variety') variety?: string,
  ) {
    return this.yieldService.getHistorical(plantId, dateFrom, dateTo, variety);
  }

  @Get('stock-health')
  @RequirePermission('Yield', 'canView')
  getStockHealth(
    @Query('period') period?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('mill') mill?: string,
  ) {
    return this.yieldService.getStockHealthReport({ period, dateFrom, dateTo, mill });
  }

  @Put('stock-health/total-work')
  @RequirePermission('Yield', 'canEdit')
  setTotalWork(
    @Body() body: { plantId: string; totalWork: number },
    @Req() req: any,
  ) {
    const setBy = req.user?.username || req.user?.email || req.user?.sub;
    const role = req.user?.role?.name || req.user?.role;
    return this.yieldService.setStockHealthTotalWork(body.plantId, body.totalWork, setBy, role);
  }
}
