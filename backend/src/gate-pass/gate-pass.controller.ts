import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { GatePassService } from './gate-pass.service';

@Controller('api/gate-pass')
export class GatePassController {
  constructor(private readonly gatePassService: GatePassService) {}

  @Post('generate')
  generateGatePass(@Body() data: any) {
    return this.gatePassService.generateGatePass(data);
  }

  @Get('campus-status/:plantId')
  getCampusStatus(@Param('plantId') plantId: string) {
    return this.gatePassService.getCampusStatus(plantId);
  }

  @Get('recent/:plantId')
  getRecentGatePasses(@Param('plantId') plantId: string, @Query('type') type: string) {
    return this.gatePassService.getRecentGatePasses(plantId, type || 'INWARD');
  }

  @Get('scan/:qrCode')
  getGatePassByQr(@Param('qrCode') qrCode: string) {
    return this.gatePassService.getGatePassByQr(qrCode);
  }

  @Get('analytics/:plantId')
  getAnalytics(@Param('plantId') plantId: string) {
    return this.gatePassService.getAnalytics(plantId);
  }

  @Get('duplicate-logs/:plantId')
  getDuplicateLogs(@Param('plantId') plantId: string) {
    return this.gatePassService.getDuplicateLogs(plantId);
  }
}