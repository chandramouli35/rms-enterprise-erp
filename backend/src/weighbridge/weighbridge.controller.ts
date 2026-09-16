import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { WeighbridgeService } from './weighbridge.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { Public } from '../common/decorators/public.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/weighbridge')
export class WeighbridgeController {
  constructor(private readonly weighbridgeService: WeighbridgeService) {}

  /**
   * Browser Web Serial (logged-in user) posts live kg here.
   */
  @Post('live/:plantId')
  @RequirePermission('Weighbridge', 'canView')
  ingestLiveFromBrowser(
    @Param('plantId') plantId: string,
    @Body() body: any,
  ) {
    return this.weighbridgeService.ingestLiveWeight(plantId, body || {}, undefined);
  }

  /**
   * Optional Windows COM Bridge (IT fallback) — shared secret, no JWT.
   * Header: X-Bridge-Key when WEIGHBRIDGE_BRIDGE_SECRET is set.
   */
  @Public()
  @Post('bridge-ingest/:plantId')
  ingestLiveFromBridge(
    @Param('plantId') plantId: string,
    @Body() body: any,
    @Headers('x-bridge-key') bridgeKey?: string,
    @Headers('x-weighbridge-bridge-key') bridgeKeyAlt?: string,
  ) {
    return this.weighbridgeService.ingestLiveWeight(
      plantId,
      body || {},
      bridgeKey || bridgeKeyAlt,
      true,
    );
  }

  /** Browser Capture screen polls this for live indicator weight. */
  @Get('live/:plantId')
  @RequirePermission('Weighbridge', 'canView')
  getLive(@Param('plantId') plantId: string) {
    return this.weighbridgeService.getLiveWeight(plantId);
  }

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

  /** Physical indicator connection status (COM / serial bridge) */
  @Get('connection-status/:plantId')
  @RequirePermission('Weighbridge', 'canView')
  getConnectionStatus(@Param('plantId') plantId: string) {
    return this.weighbridgeService.getConnectionStatus(plantId);
  }

  @Put('settings/:plantId')
  @RequirePermission('Weighbridge', 'canEdit')
  updateSettings(@Param('plantId') plantId: string, @Body() data: any) {
    return this.weighbridgeService.updateSettings(plantId, data);
  }
}