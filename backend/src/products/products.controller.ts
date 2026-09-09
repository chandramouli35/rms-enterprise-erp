import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission, RequireAnyPermission } from '../common/decorators/require-permission.decorator';

/** Modules that load product dropdowns / lists outside Product Management. */
const PRODUCT_LOOKUP_MODULES = [
  'Products',
  'Production',
  'Gate Pass',
  'Yield Mgmt',
  'Inventory',
  'Transfer',
];

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('units/list')
  @RequireAnyPermission(PRODUCT_LOOKUP_MODULES, 'canView')
  listUnits() {
    return this.productsService.listUnits();
  }

  @Post('units')
  @RequirePermission('Products', 'canAdd')
  createUnit(@Body() body: { code: string; label: string; description?: string }) {
    return this.productsService.createUnit(body);
  }

  @Get('for-selection')
  @RequireAnyPermission(PRODUCT_LOOKUP_MODULES, 'canView')
  findForSelection(@Query('plantId') plantId?: string) {
    return this.productsService.findForSelection(plantId);
  }

  @Post()
  @RequirePermission('Products', 'canAdd')
  create(@Body() body: any) {
    return this.productsService.create(body);
  }

  @Get()
  @RequireAnyPermission(PRODUCT_LOOKUP_MODULES, 'canView')
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.productsService.findAll(page, limit);
  }

  @Get(':id')
  @RequirePermission('Products', 'canView')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('Products', 'canEdit')
  update(@Param('id') id: string, @Body() body: any) {
    return this.productsService.update(id, body);
  }

  @Delete(':id')
  @RequirePermission('Products', 'canDelete')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
