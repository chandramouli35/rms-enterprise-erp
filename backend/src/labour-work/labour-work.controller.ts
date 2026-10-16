import { Body, Controller, Get, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { LabourWorkService } from './labour-work.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@Controller('api/labour-work')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LabourWorkController {
  constructor(private readonly labour: LabourWorkService) {}

  @Get('catalog')
  @RequirePermission('Labour Work Order', 'canView')
  catalog(@Query('plantId') plantId: string) {
    return this.labour.catalog(plantId);
  }

  @Get('rates')
  @RequirePermission('Labour Work Order', 'canView')
  rates(@Query('plantId') plantId: string, @Query('labourPartyId') labourPartyId?: string) {
    return this.labour.rates(plantId, labourPartyId);
  }

  @Put('rates')
  @RequirePermission('Labour Work Order', 'canEdit')
  saveRates(@Body() body: any, @Request() req: any) {
    return this.labour.saveRates(body.plantId, body.labourPartyId, body.updates || [], req.user);
  }

  @Post('items')
  @RequirePermission('Labour Work Order', 'canAdd')
  addItem(@Body() body: any, @Request() req: any) {
    return this.labour.addItem(body, req.user);
  }

  @Post('tasks')
  @RequirePermission('Labour Work Order', 'canAdd')
  addTask(@Body() body: any, @Request() req: any) {
    return this.labour.addTask(body, req.user);
  }

  @Get('parties')
  @RequirePermission('Labour Work Order', 'canView')
  parties(@Query('plantId') plantId: string) {
    return this.labour.parties(plantId);
  }

  @Get('gate-passes')
  @RequirePermission('Labour Work Order', 'canView')
  gatePasses(@Query('plantId') plantId: string) {
    return this.labour.gatePasses(plantId);
  }

  @Get('settings')
  @RequirePermission('Labour Work Order', 'canView')
  settings() {
    return this.labour.backdateSetting();
  }

  @Put('settings')
  @RequirePermission('Labour Work Order', 'canEdit')
  setSettings(@Body() body: any, @Request() req: any) {
    return this.labour.setBackdate(body.backdate, req.user);
  }

  @Post('orders')
  @RequirePermission('Labour Work Order', 'canAdd')
  create(@Body() body: any, @Request() req: any) {
    return this.labour.createManual(body, req.user);
  }

  @Get('orders')
  @RequirePermission('Labour Work Order', 'canView')
  list(
    @Query('plantId') plantId: string,
    @Query('date') date?: string,
    @Query('labourPartyId') labourPartyId?: string,
  ) {
    return this.labour.list(plantId, date, labourPartyId);
  }
}
