import { Controller, Post, Body, Get, Param, HttpException, HttpStatus, Put } from '@nestjs/common';
import { ProcurementService } from './procurement.service';

@Controller('api/procurement')
export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  @Post('save-purchase')
  async savePurchase(@Body() data: any) {
    try {
      return await this.procurementService.savePurchase(data);
    } catch (error: any) {
      console.error(error);
      throw new HttpException(`Failed to save: ${error.message || error}`, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('recent/:plantId')
  getRecentPurchases(@Param('plantId') plantId: string) {
    return this.procurementService.getRecentPurchases(plantId);
  }

  @Get('occupied-stacks/:plantId')
  getOccupiedStacks(@Param('plantId') plantId: string) {
    return this.procurementService.getOccupiedStacks(plantId);
  }

  @Get('batch/:batchId')
  getBatch(@Param('batchId') batchId: string) {
    return this.procurementService.getBatch(batchId);
  }

  @Post('quality/:batchId')
  updateQuality(@Param('batchId') batchId: string, @Body() data: any) {
    return this.procurementService.updateQuality(batchId, data);
  }

  @Get('suppliers')
  getSuppliers() {
    return this.procurementService.getSuppliers();
  }

  @Post('suppliers')
  createSupplier(@Body() data: any) {
    return this.procurementService.createSupplier(data);
  }

  @Get('analytics/:plantId')
  getAnalytics(@Param('plantId') plantId: string) {
    return this.procurementService.getAnalytics(plantId);
  }

  @Post('register/:plantId')
  getPurchaseRegister(@Param('plantId') plantId: string, @Body() filters: any) {
    return this.procurementService.getPurchaseRegister(plantId, filters);
  }

  @Post('boli-rate/:batchId')
  async updateBoliRate(@Param('batchId') batchId: string, @Body() data: { newRate: number; arhtiaCorrection: number }) {
    try {
      return await this.procurementService.updateBoliRate(batchId, data.newRate, data.arhtiaCorrection);
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('soda-pending/:plantId')
  getSodaPending(@Param('plantId') plantId: string) {
    return this.procurementService.getSodaPending(plantId);
  }

  @Post('soda-pending')
  async createSodaPending(@Body() data: any) {
    try {
      return await this.procurementService.createSodaPending(data);
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Put('soda-pending/:id')
  async updateSodaPending(@Param('id') id: string, @Body() data: any) {
    try {
      return await this.procurementService.updateSodaPending(id, data);
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('settle-hisab')
  async settleHisab(@Body() data: any) {
    try {
      return await this.procurementService.settleHisab(data);
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}