import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { ItemCategory } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('plants/:plantId')
  getInventoryMatrix(
    @Param('plantId') plantId: string,
    @Query('category') category?: ItemCategory
  ) {
    return this.inventoryService.getInventoryMatrix(plantId, category);
  }

  @Get('items/:itemId/ledger')
  getStockLedger(@Param('itemId') itemId: string) {
    return this.inventoryService.getStockLedger(itemId);
  }
}
