import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { DieselService } from './diesel.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('diesel')
export class DieselController {
  constructor(private readonly dieselService: DieselService) {}

  /** Shared masters — any Trucks & Diesel view grant */
  @Get('trucks')
  @RequirePermission('Trucks & Diesel', 'canView')
  listTrucks() {
    return this.dieselService.listTrucks();
  }

  @Get('drivers')
  @RequirePermission('Trucks & Diesel', 'canView')
  listDrivers() {
    return this.dieselService.listDrivers();
  }

  @Get('parties')
  @RequirePermission('Trucks & Diesel', 'canView')
  listParties() {
    return this.dieselService.listParties();
  }

  @Get('trucks/:id/last')
  @RequirePermission('Trucks & Diesel', 'canView', 'Add Fuel')
  lastEntry(@Param('id') id: string) {
    return this.dieselService.lastEntryForTruck(id);
  }

  @Post('entries')
  @RequirePermission('Trucks & Diesel', 'canAdd', 'Add Fuel')
  create(@Body() body: any, @Req() req: any) {
    return this.dieselService.createEntry(body, req.user);
  }

  @Get('truck-average')
  @RequirePermission('Trucks & Diesel', 'canView', 'Truck Average')
  truckAverage(
    @Query('truckId') truckId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.dieselService.truckAverage({
      truckId,
      from,
      to,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('party-list')
  @RequirePermission('Trucks & Diesel', 'canView', 'Pump wise details')
  partyList() {
    return this.dieselService.partyList();
  }

  @Get('party-wise')
  @RequirePermission('Trucks & Diesel', 'canView', 'Pump wise details')
  partyWise(
    @Query('partyId') partyId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('slipFrom') slipFrom?: string,
    @Query('slipTo') slipTo?: string,
  ) {
    return this.dieselService.partyWise({
      partyId,
      from,
      to,
      slipFrom: slipFrom != null && slipFrom !== '' ? parseInt(slipFrom, 10) : undefined,
      slipTo: slipTo != null && slipTo !== '' ? parseInt(slipTo, 10) : undefined,
    });
  }
}
