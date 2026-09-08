import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { GatePassService } from './gate-pass.service';
import { ProductsService } from '../products/products.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/gate-pass')
export class GatePassController {
  constructor(
    private readonly gatePassService: GatePassService,
    private readonly productsService: ProductsService,
  ) {}

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
    @Query('limit') limit?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.gatePassService.getRecentGatePasses(
      plantId,
      type || 'INWARD',
      status,
      page,
      limit,
      dateFrom,
      dateTo,
    );
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

  // ===========================
  // TRANSFER ENTRY MANAGEMENT
  // ===========================

  @Get('transfers/:plantId')
  @RequirePermission('Gate Pass', 'canView')
  getTransferTickets(
    @Param('plantId') plantId: string,
    @Query('status') status?: string
  ) {
    return this.gatePassService.getTransferTickets(plantId, status);
  }

  @Post('transfer/:ticketId/confirm')
  @RequirePermission('Gate Pass', 'canEdit')
  confirmTransferTicket(
    @Param('ticketId') ticketId: string,
    @Body() data: { supervisorName: string; recipientPlantId: string }
  ) {
    return this.gatePassService.confirmTransferTicket(ticketId, data);
  }

  @Get('consignment/:gatePassId/:plantId')
  @RequirePermission('Gate Pass', 'canView')
  getConsignmentSlipData(
    @Param('gatePassId') gatePassId: string,
    @Param('plantId') plantId: string
  ) {
    return this.gatePassService.getConsignmentSlipData(gatePassId, plantId);
  }

  @Get('product-options')
  @RequirePermission('Gate Pass', 'canView')
  getProductOptions(@Query('plantId') plantId?: string) {
    return this.productsService.findForSelection(plantId);
  }
}