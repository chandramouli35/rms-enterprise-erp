import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
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

  @Get('campus-status/:plantId')
  @RequirePermission('Gate Pass', 'canView')
  getCampusStatus(@Param('plantId') plantId: string) {
    return this.gatePassService.getCampusStatus(plantId);
  }

  @Get('recent/:plantId')
  @RequirePermission('Gate Pass', 'canView')
  getRecentGatePasses(@Param('plantId') plantId: string, @Query('type') type: string) {
    return this.gatePassService.getRecentGatePasses(plantId, type || 'INWARD');
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

  @Post(':id/complete')
  @RequirePermission('Gate Pass', 'canEdit')
  completeGatePass(@Param('id') id: string) {
    return this.gatePassService.completeGatePass(id);
  }

  @Get('duplicate-logs/:plantId')
  @RequirePermission('Gate Pass', 'canView')
  getDuplicateLogs(@Param('plantId') plantId: string) {
    return this.gatePassService.getDuplicateLogs(plantId);
  }
}