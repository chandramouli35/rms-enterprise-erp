import { Controller, Get, Post, Put, Delete, Body, Query, UseGuards, Param, Req, ForbiddenException } from '@nestjs/common';
import { ProductionService } from './production.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PlantContextGuard } from '../common/guards/plant-context.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission, RequireAnyPermission } from '../common/decorators/require-permission.decorator';

@UseGuards(JwtAuthGuard, PlantContextGuard, PermissionsGuard)
@Controller('production')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  /** Mill Yield Benchmarks — Admin / Super Admin only */
  private assertAdmin(user: any) {
    if (!user) throw new ForbiddenException('Unauthorized');
    const role = user.role?.name || user.role;
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') return;
    throw new ForbiddenException('Only Admin can access Mill Yield Benchmarks');
  }

  @Get('metrics')
  @RequirePermission('Production', 'canView')
  getMetrics(@Query('plantId') plantId: string) {
    return this.productionService.getMetrics(plantId);
  }

  @Get('batches')
  @RequireAnyPermission(['Production', 'Yield Mgmt', 'Dashboard'], 'canView')
  getBatches(
    @Req() req: any,
    @Query('plantId') plantId: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.productionService.getBatches(plantId, status, dateFrom, dateTo, req.user?.role, page, limit);
  }

  @Get('batches/:id')
  @RequireAnyPermission(['Production', 'Yield Mgmt'], 'canView')
  getBatchDetails(@Param('id') id: string) {
    return this.productionService.getBatchDetails(id);
  }

  @Post('batches')
  @RequirePermission('Production', 'canAdd')
  createBatch(@Body() createBatchDto: CreateBatchDto) {
    return this.productionService.createBatch(createBatchDto);
  }

  @Post('batches/:id/complete')
  @RequirePermission('Production', 'canEdit')
  completeBatch(@Body() data: any, @Query('id') id: string) {
    return this.productionService.completeBatch(id, data);
  }

  @Get('daily-stock-report')
  @RequirePermission('Production', 'canView')
  getDailyStockReport(
    @Query('plantId') plantId: string,
    @Query('date') dateStr: string
  ) {
    return this.productionService.getDailyStockReport(plantId, dateStr);
  }

  @Get('shift-wise-stock-report')
  @RequirePermission('Production', 'canView')
  getShiftWiseStockReport(
    @Query('plantId') plantId: string,
    @Query('date') dateStr: string
  ) {
    return this.productionService.getShiftWiseStockReport(plantId, dateStr);
  }

  @Get('compare-batch-wise')
  @RequirePermission('Production', 'canView')
  getCompareBatchWise(@Query('date') dateStr: string) {
    return this.productionService.getCompareBatchWise(dateStr);
  }

  @Get('compare-date-range')
  @RequirePermission('Production', 'canView')
  getCompareDateRange(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string
  ) {
    return this.productionService.getCompareDateRange(dateFrom, dateTo);
  }

  @Get('mill-yield-benchmarks')
  @RequirePermission('Yield Mgmt', 'canView', 'Mill Yield Benchmarks')
  listMillYieldBenchmarks(@Req() req: any, @Query('plantId') plantId: string) {
    this.assertAdmin(req.user);
    return this.productionService.listMillYieldBenchmarks(plantId);
  }

  @Post('mill-yield-benchmarks')
  @RequirePermission('Yield Mgmt', 'canEdit', 'Mill Yield Benchmarks')
  createMillYieldBenchmark(@Req() req: any, @Body() body: any) {
    this.assertAdmin(req.user);
    return this.productionService.createMillYieldBenchmark(body);
  }

  @Put('mill-yield-benchmarks/:id')
  @RequirePermission('Yield Mgmt', 'canEdit', 'Mill Yield Benchmarks')
  updateMillYieldBenchmark(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    this.assertAdmin(req.user);
    return this.productionService.updateMillYieldBenchmark(id, body);
  }

  @Delete('mill-yield-benchmarks/:id')
  @RequirePermission('Yield Mgmt', 'canEdit', 'Mill Yield Benchmarks')
  softDeleteMillYieldBenchmark(@Req() req: any, @Param('id') id: string) {
    this.assertAdmin(req.user);
    return this.productionService.softDeleteMillYieldBenchmark(id);
  }

  @Post('batches/:id/analysis')
  @RequirePermission('Production', 'canEdit')
  saveBatchAnalysis(@Param('id') id: string, @Body() data: any) {
    return this.productionService.saveBatchAnalysis(id, data);
  }

  @Post('batches/:id/submit')
  @RequirePermission('Production', 'canEdit')
  submitBatch(@Param('id') id: string, @Body() data: { biometricData: any }) {
    return this.productionService.submitBatch(id, data.biometricData);
  }

  @Get('analysis-report')
  @RequirePermission('Production', 'canView')
  getAdminAnalysisReport(@Query('date') date: string) {
    return this.productionService.getAdminAnalysisReport(date);
  }
}

