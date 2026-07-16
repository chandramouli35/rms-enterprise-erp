import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { InventoryService } from './inventory.service';
import { GetInventoryFilterDto, GetStockReportDto } from './dto/inventory.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('byproducts')
  @RequirePermission('Inventory', 'canView')
  getByProductStock(@Req() req: any) {
    const plantId = req.user.plantId;
    return this.inventoryService.getByProductStock(plantId);
  }


  @Get('dashboard')
  @RequirePermission('Inventory', 'canView')
  getDashboardSummary(@Req() req: any, @Query('itemType') itemType?: string) {
    const plantId = req.user.plantId;
    return this.inventoryService.getDashboardSummary(plantId, itemType);
  }

  @Get()
  @RequirePermission('Inventory', 'canView')
  getInventoryList(@Req() req: any, @Query() filterDto: GetInventoryFilterDto) {
    const plantId = req.user.plantId;
    return this.inventoryService.getInventoryList(plantId, filterDto);
  }

  @Get('stock-report')
  @RequirePermission('Inventory', 'canView')
  getStockReport(@Req() req: any, @Query() filterDto: GetStockReportDto) {
    const plantId = req.user.plantId;
    return this.inventoryService.getStockReport(plantId, filterDto);
  }

  @Post('adjustment')
  @RequirePermission('Inventory', 'canEdit')
  adjustStock(@Req() req: any, @Body() body: any) {
    const plantId = req.user.plantId;
    return this.inventoryService.adjustStock({ ...body, plantId });
  }

  @Get('ledger')
  @RequirePermission('Inventory', 'canView')
  getLedger(@Req() req: any, @Query() filterDto: any) {
    const plantId = req.user.plantId;
    return this.inventoryService.getLedger(plantId, filterDto);
  }
}
