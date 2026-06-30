import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { WeighbridgeService } from './weighbridge.service';

@Controller('api/weighbridge')
export class WeighbridgeController {
  constructor(private readonly weighbridgeService: WeighbridgeService) {}

  @Get('stream/:vehicleNo')
  streamWeight(@Param('vehicleNo') vehicleNo: string) {
    return this.weighbridgeService.streamWeight(vehicleNo);
  }

  @Post('save-transaction')
  saveTransaction(@Body() data: any) {
    return this.weighbridgeService.saveTransaction(data);
  }

  @Get('history/:plantId')
  getHistory(@Param('plantId') plantId: string) {
    return this.weighbridgeService.getHistory(plantId);
  }

  @Get('settings/:plantId')
  getSettings(@Param('plantId') plantId: string) {
    return this.weighbridgeService.getSettings(plantId);
  }

  @Put('settings/:plantId')
  updateSettings(@Param('plantId') plantId: string, @Body() data: any) {
    return this.weighbridgeService.updateSettings(plantId, data);
  }
}