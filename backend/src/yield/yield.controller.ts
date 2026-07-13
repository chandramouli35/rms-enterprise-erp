import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
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
    @Query('variety') variety?: string
  ) {
    return this.yieldService.getHistorical(plantId, dateFrom, dateTo, variety);
  }
}
