import { Controller, Post, Body, Get, Param, HttpException, HttpStatus, Put, UseGuards, Query } from '@nestjs/common';
import { ProcurementService } from './procurement.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/procurement')
export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  @Post('save-purchase')
  @RequirePermission('Procurement', 'canAdd')
  async savePurchase(@Body() data: any) {
    try {
      return await this.procurementService.savePurchase(data);
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
  @RequirePermission('Procurement', 'canView')
  getSuppliers() {
    return this.procurementService.getSuppliers();
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

  @Get('soda-pending/:plantId')
  @RequirePermission('Procurement', 'canView')
  getSodaPending(
    @Param('plantId') plantId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.procurementService.getSodaPending(plantId, dateFrom, dateTo, page, limit);
  }

  @Post('soda-pending')
  @RequirePermission('Procurement', 'canAdd')
  async createSodaPending(@Body() data: any) {
    try {
      return await this.procurementService.createSodaPending(data);
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Put('soda-pending/:id')
  @RequirePermission('Procurement', 'canEdit')
  async updateSodaPending(@Param('id') id: string, @Body() data: any) {
    try {
      return await this.procurementService.updateSodaPending(id, data);
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('settle-hisab')
  @RequirePermission('Procurement', 'canEdit')
  async settleHisab(@Body() data: any) {
    try {
      return await this.procurementService.settleHisab(data);
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('reports/paddy-stock')
  @RequirePermission('Procurement', 'canView')
  async getPaddyStockReport(@Query('plantId') plantId: string) {
    return this.procurementService.getPaddyStockReport(plantId);
  }
}