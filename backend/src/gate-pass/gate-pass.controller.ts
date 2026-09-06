import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { GatePassService } from './gate-pass.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/gate-pass')
export class GatePassController {
  constructor(private readonly gatePassService: GatePassService) {}

  @Post('generate')
  @RequirePermission('Gate Pass', 'canAdd')
  generateGatePass(@Body() data: any) {
    return this.gatePassService.generateGatePass(data);
  }

  @Get('next-seq/:plantId/:passType')
  @RequirePermission('Gate Pass', 'canView')
  getNextSeq(@Param('plantId') plantId: string, @Param('passType') passType: string) {
    return this.gatePassService.getNextSeq(plantId, passType);
  }

  @Get('last-reading/:vehicleNo')
  @RequirePermission('Gate Pass', 'canView')
  getLastTruckReading(@Param('vehicleNo') vehicleNo: string) {
    return this.gatePassService.getLastTruckReading(vehicleNo);
  }

  @Get('campus-status/:plantId')
  @RequirePermission('Gate Pass', 'canView')
  getCampusStatus(@Param('plantId') plantId: string) {
    return this.gatePassService.getCampusStatus(plantId);
  }

  @Get('recent/:plantId')
  @RequirePermission('Gate Pass', 'canView')
  getRecentGatePasses(
    @Param('plantId') plantId: string, 
    @Query('type') type: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.gatePassService.getRecentGatePasses(plantId, type || 'INWARD', status, page, limit);
  }

  @Get('scan/:qrCode')
  @RequirePermission('Gate Pass', 'canView')
  getGatePassByQr(@Param('qrCode') qrCode: string) {
    return this.gatePassService.getGatePassByQr(qrCode);
  }

  @Get('analytics/:plantId')
  @RequirePermission('Gate Pass', 'canView')
  getAnalytics(@Param('plantId') plantId: string) {
    return this.gatePassService.getAnalytics(plantId);
  }

  @Patch(':id')
  @RequirePermission('Gate Pass', 'canEdit')
  updateGatePass(@Param('id') id: string, @Body() data: any) {
    return this.gatePassService.updateGatePass(id, data);
  }

  @Post(':id/complete')
  @RequirePermission('Gate Pass', 'canEdit')
  completeGatePass(@Param('id') id: string, @Body() data?: any) {
    return this.gatePassService.completeGatePass(id, data);
  }

  @Post('report/finalize/:plantId')
  @RequirePermission('Gate Pass', 'canEdit')
  finalizeDailyReport(@Param('plantId') plantId: string, @Body() data: any) {
    return this.gatePassService.finalizeDailyReport(plantId, data);
  }

  @Get('duplicate-logs/:plantId')
  @RequirePermission('Gate Pass', 'canView')
  getDuplicateLogs(@Param('plantId') plantId: string) {
    return this.gatePassService.getDuplicateLogs(plantId);
  }
}