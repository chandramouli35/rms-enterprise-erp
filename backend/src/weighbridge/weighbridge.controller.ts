import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { WeighbridgeService } from './weighbridge.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/weighbridge')
export class WeighbridgeController {
  constructor(private readonly weighbridgeService: WeighbridgeService) {}

  @Get('stream/:vehicleNo')
  @RequirePermission('Weighbridge', 'canView')
  streamWeight(@Param('vehicleNo') vehicleNo: string) {
    return this.weighbridgeService.streamWeight(vehicleNo);
  }

  @Post('save-transaction')
  @RequirePermission('Weighbridge', 'canAdd')
  saveTransaction(@Body() data: any) {
    return this.weighbridgeService.saveTransaction(data);
  }

  @Get('history/:plantId')
  @RequirePermission('Weighbridge', 'canView')
  getHistory(@Param('plantId') plantId: string) {
    return this.weighbridgeService.getHistory(plantId);
  }

  @Get('latest/:plantId/:vehicleNo')
  @RequirePermission('Weighbridge', 'canView')
  getLatestForVehicle(
    @Param('plantId') plantId: string,
    @Param('vehicleNo') vehicleNo: string,
  ) {
    return this.weighbridgeService.getLatestForVehicle(plantId, vehicleNo);
  }

  @Get('settings/:plantId')
  @RequirePermission('Weighbridge', 'canView')
  getSettings(@Param('plantId') plantId: string) {
    return this.weighbridgeService.getSettings(plantId);
  }

  @Put('settings/:plantId')
  @RequirePermission('Weighbridge', 'canEdit')
  updateSettings(@Param('plantId') plantId: string, @Body() data: any) {
    return this.weighbridgeService.updateSettings(plantId, data);
  }
}