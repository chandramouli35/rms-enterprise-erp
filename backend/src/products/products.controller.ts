import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @RequirePermission('Products', 'canAdd')
  create(@Body() body: any) {
    return this.productsService.create(body);
  }

  @Get()
  @RequirePermission('Products', 'canView')
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

