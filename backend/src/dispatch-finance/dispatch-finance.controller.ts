import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { DispatchFinanceService } from './dispatch-finance.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('dispatch-finance')
@UseGuards(JwtAuthGuard)
export class DispatchFinanceController {
  constructor(private readonly dispatchFinanceService: DispatchFinanceService) {}

  @Get('metrics/:plantId')
  getDispatchMetrics(@Param('plantId') plantId: string) {
    return this.dispatchFinanceService.getDispatchMetrics(plantId);
  }

  @Get('list/:plantId')
  getAllDispatches(@Param('plantId') plantId: string) {
    return this.dispatchFinanceService.getAllDispatches(plantId);
  }

  @Post(':plantId')
  createDispatch(@Param('plantId') plantId: string, @Body() data: any) {
    return this.dispatchFinanceService.createDispatch(plantId, data);
  }

  @Post('gate-pass/:plantId')
  generateGatePass(@Param('plantId') plantId: string, @Body() data: any) {
    return this.dispatchFinanceService.generateGatePass(plantId, data);
  }

  @Get('vehicle-allocation/:plantId')
  getVehicleAllocationStats(@Param('plantId') plantId: string) {
    return this.dispatchFinanceService.getVehicleAllocationStats(plantId);
  }

  @Get('finance-overview/:plantId')
  getFinanceOverview(@Param('plantId') plantId: string) {
    return this.dispatchFinanceService.getFinanceOverview(plantId);
  }

  @Get('utilities/:plantId')
  getSystemUtilities(@Param('plantId') plantId: string) {
    return this.dispatchFinanceService.getSystemUtilities(plantId);
  }

  @Get('weight-verifications/:plantId')
  getWeightVerifications(@Param('plantId') plantId: string) {
    return this.dispatchFinanceService.getWeightVerifications(plantId);
  }

  @Get('inventory-deductions/:plantId')
  getInventoryDeductions(@Param('plantId') plantId: string) {
    return this.dispatchFinanceService.getInventoryDeductions(plantId);
  }

  @Get('read-weighbridge/:plantId')
  readWeighbridge(@Param('plantId') plantId: string) {
    return this.dispatchFinanceService.readWeighbridge(plantId);
  }

  @Post('weight-entry/:plantId')
  createWeightEntry(@Param('plantId') plantId: string, @Body() data: any) {
    return this.dispatchFinanceService.createWeightEntry(plantId, data);
  }
}
