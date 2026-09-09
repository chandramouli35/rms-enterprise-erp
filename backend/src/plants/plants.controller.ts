import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { PlantsService } from './plants.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@Controller('plants')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PlantsController {
  constructor(private readonly plantsService: PlantsService) {}

  /** Shared plant dropdown — any authenticated user (no module lock). */
  @Get()
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.plantsService.findAll(page, limit);
  }

  @Post()
  @RequirePermission('Plants', 'canAdd')
  async create(@Body() data: any) {
    return this.plantsService.create(data);
  }

  @Put(':id')
  @RequirePermission('Plants', 'canEdit')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.plantsService.update(id, data);
  }

  @Delete(':id')
  @RequirePermission('Plants', 'canDelete')
  async remove(@Param('id') id: string) {
    return this.plantsService.remove(id);
  }
}
